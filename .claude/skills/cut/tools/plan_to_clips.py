#!/usr/bin/env python
"""Plan a talking-head edit and turn it into native Hyperframes clips.

Plain files in and out (UTF-8, no network). Needs ffmpeg on PATH for `propose`.

  python plan_to_clips.py propose VIDEO TRANSCRIPT.json --out plan.json [--noise -35] [--min 0.40] [--keep 0.18]
  python plan_to_clips.py build   plan.json TRANSCRIPT.json OUTDIR

propose  finds the silences worth cutting (ffmpeg silencedetect, checked against the transcript so no word is
         cut) and writes a first plan.json: one segment per stretch of speech, cut-ins alternating 1.0 / 1.12.
         Claude then edits the plan by hand: restore a pause before a punchline, speed up a ramble, slow a key line.
build    turns plan.json into OUTDIR/clips.html (muted <video> + matching <audio> per segment, edge to edge),
         OUTDIR/zoom.js (GSAP lines for the cut-ins), OUTDIR/timemap.json and OUTDIR/transcript.edited.json
         (every word re-timed to the EDITED timeline, so graphics are placed on the new clock).

plan.json
  {"video": "input-video.mp4", "audio": "voice.m4a", "fps": 30, "origin": "50% 38%",
   "segments": [{"in": 0.20, "out": 6.10, "rate": 1.0, "zoom": 1.0, "drift": 0.0, "punch": false}, ...]}
  in/out are SOURCE seconds. rate is 0.1-10 and the voice keeps its pitch (Hyperframes uses ffmpeg atempo).
  zoom is the scale held for the segment (1.0 wide, 1.12-1.25 cut-in). drift adds a slow push-in over the
  segment. punch is a quick settle on the cut. Use drift OR punch on a segment, not both.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys

FADE = 0.02  # seconds of audio fade at a real cut, so a cut never clicks


def load_words(path):
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data["words"] if isinstance(data, dict) else data


def media_duration(video):
    p = subprocess.run([shutil.which("ffmpeg") or "ffmpeg", "-hide_banner", "-i", video],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"Duration: (\d+):(\d+):([\d.]+)", p.stderr)
    if not m:
        sys.exit("could not read the duration of " + video)
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def silences(video, noise, min_len, total):
    p = subprocess.run([shutil.which("ffmpeg") or "ffmpeg", "-hide_banner", "-nostats", "-i", video, "-vn",
                        "-af", "silencedetect=noise=%sdB:d=%s" % (noise, min_len), "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    found, start = [], None
    for line in p.stderr.splitlines():
        m = re.search(r"silence_start: (-?[\d.]+)", line)
        if m:
            start = max(0.0, float(m.group(1)))
            continue
        m = re.search(r"silence_end: ([\d.]+)", line)
        if m and start is not None:
            found.append((start, float(m.group(1))))
            start = None
    if start is not None:
        found.append((start, total))
    return found


def propose(a):
    words = load_words(a.transcript)
    total = media_duration(a.video)
    words = [w for w in words if w["start"] < total]
    lo = max(0.0, words[0]["start"] - 0.15)
    hi = min(total, words[-1]["end"] + 0.35)
    cuts = []
    for s, e in silences(a.video, a.noise, a.min, total):
        x, y = s + a.keep / 2, e - a.keep / 2
        if x < lo or y > hi or y - x < 0.08:
            continue
        if any(x < (w["start"] + w["end"]) / 2 < y for w in words):  # never cut across a word
            continue
        cuts.append((x, y))
    segs, cur = [], lo
    for x, y in cuts:
        segs.append((cur, x))
        cur = y
    segs.append((cur, hi))
    plan = {"video": a.video_name, "audio": a.audio_name, "fps": 30, "origin": "50% 38%", "segments": [
        {"in": round(s, 3), "out": round(e, 3), "rate": 1.0, "zoom": 1.0 if i % 2 == 0 else 1.12}
        for i, (s, e) in enumerate(segs) if e - s >= 0.2]}
    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(plan, f, indent=1)
    removed = sum(y - x for x, y in cuts)
    print("source %.1f s | %d pauses cut (%.1f s) | %d segments | wrote %s" %
          (total, len(cuts), removed, len(plan["segments"]), a.out), file=sys.stderr)


def build(a):
    with open(a.plan, encoding="utf-8") as f:
        plan = json.load(f)
    words = load_words(a.transcript)
    fps = plan.get("fps", 30)
    origin = plan.get("origin", "50% 38%")
    q = lambda t: round(t * fps) / fps

    segs, t = [], 0.0
    for i, s in enumerate(plan["segments"]):
        rate = float(s.get("rate", 1.0))
        dur = q((s["out"] - s["in"]) / rate)
        segs.append(dict(s, i=i, rate=rate, start=q(t), dur=dur))
        t = q(t) + dur
    total = t

    html = ['<style>.inner{position:absolute;left:0;top:0;width:1080px;height:1920px}'
            '.inner video{width:100%;height:100%;object-fit:cover}</style>']
    for g in segs:
        rate = ' data-playback-rate="%g"' % g["rate"] if abs(g["rate"] - 1) > 1e-6 else ""
        # optional extra layers that must share this segment's zoom (a cut-out behind-text layer, say);
        # @START@ @DUR@ @IN@ @RATE@ are filled in with this segment's numbers
        extra = (g.get("inner_html", "").replace("@START@", "%.4f" % g["start"]).replace("@DUR@", "%.4f" % g["dur"])
                 .replace("@IN@", "%.3f" % g["in"]).replace("@RATE@", "%g" % g["rate"]))
        html.append('<div class="inner" id="v%d"><video id="vid%d" class="clip" src="%s" data-start="%.4f" '
                    'data-duration="%.4f" data-media-start="%.3f"%s data-track-index="0" muted playsinline>'
                    '</video>%s</div>' % (g["i"], g["i"], plan["video"], g["start"], g["dur"], g["in"], rate, extra))
    for n, g in (enumerate(segs) if plan.get("audio") else []):  # "audio": null = a silent reel (the showreel)
        prev_cut = n == 0 or abs(plan["segments"][n - 1]["out"] - g["in"]) > 1e-3
        next_cut = n == len(segs) - 1 or abs(g["out"] - plan["segments"][n + 1]["in"]) > 1e-3
        pts = []
        if prev_cut:
            pts += [{"t": 0, "v": 0}, {"t": FADE, "v": 1}]
        else:
            pts += [{"t": 0, "v": 1}]
        if next_cut:
            pts += [{"t": round(g["dur"] - FADE, 4), "v": 1}, {"t": g["dur"], "v": 0}]
        auto = json.dumps({"version": 1, "lanes": [{"target": "volume", "points": pts}]}, separators=(",", ":"))
        rate = ' data-playback-rate="%g"' % g["rate"] if abs(g["rate"] - 1) > 1e-6 else ""
        html.append("<audio id=\"aud%d\" class=\"clip\" src=\"%s\" data-start=\"%.4f\" data-duration=\"%.4f\" "
                    "data-media-start=\"%.3f\"%s data-track-index=\"10\" data-volume=\"1\" "
                    "data-automation='%s'></audio>" % (g["i"], plan["audio"], g["start"], g["dur"] - 0.0002,
                                                       g["in"], rate, auto))  # 0.2 ms shorter: float rounding must not make touching clips overlap

    js = []
    for g in segs:
        z, d = float(g.get("zoom", 1.0)), float(g.get("drift", 0.0))
        js.append('gsap.set("#v%d", { scale: %g, transformOrigin: "%s" });' % (g["i"], z, origin))
        if g.get("punch"):
            js.append('tl.fromTo("#v%d", { scale: %g }, { scale: %g, duration: 0.16, ease: "power3.out" }, %.4f);'
                      % (g["i"], round(z * 0.96, 4), z, g["start"]))
        elif d:
            js.append('tl.fromTo("#v%d", { scale: %g }, { scale: %g, duration: %.4f, ease: "none" }, %.4f);'
                      % (g["i"], z, round(z + d, 4), g["dur"], g["start"]))

    kept = []
    for w in words:
        mid = (w["start"] + w["end"]) / 2
        for g in segs:
            if g["in"] <= mid < g["out"]:
                ns = g["start"] + (max(w["start"], g["in"]) - g["in"]) / g["rate"]
                ne = g["start"] + (min(w["end"], g["out"]) - g["in"]) / g["rate"]
                kept.append(dict(w, start=round(ns, 3), end=round(ne, 3), src_start=w["start"], src_end=w["end"]))
                break

    os.makedirs(a.outdir, exist_ok=True)
    write = lambda name, text: open(os.path.join(a.outdir, name), "w", encoding="utf-8").write(text)
    write("clips.html", "\n".join(html) + "\n")
    write("zoom.js", "\n".join(js) + "\n")
    write("timemap.json", json.dumps({"fps": fps, "total": total, "segments": [
        {k: g[k] for k in ("i", "in", "out", "rate", "start", "dur")} | {"zoom": g.get("zoom", 1.0)} for g in segs]},
        indent=1))
    write("transcript.edited.json", json.dumps(kept, ensure_ascii=False, indent=1))

    used = sum(s["out"] - s["in"] for s in plan["segments"])
    print("edited length %.2f s (%d segments) | source used %.2f s | words kept %d of %d | wrote %s" %
          (total, len(segs), used, len(kept), len(words), a.outdir), file=sys.stderr)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p1 = sub.add_parser("propose")
    p1.add_argument("video")
    p1.add_argument("transcript")
    p1.add_argument("--out", default="plan.json")
    p1.add_argument("--noise", default="-35")
    p1.add_argument("--min", default="0.40", help="shortest silence to consider, seconds")
    p1.add_argument("--keep", type=float, default=0.18, help="pause left in place of a cut one, seconds")
    p1.add_argument("--video-name", default="input-video.mp4")
    p1.add_argument("--audio-name", default="voice.m4a")
    p2 = sub.add_parser("build")
    p2.add_argument("plan")
    p2.add_argument("transcript")
    p2.add_argument("outdir")
    args = ap.parse_args()
    args.min = float(args.min) if hasattr(args, "min") else None
    propose(args) if args.cmd == "propose" else build(args)
