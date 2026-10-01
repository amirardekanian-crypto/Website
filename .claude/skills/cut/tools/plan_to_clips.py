#!/usr/bin/env python
"""Plan a talking-head edit and turn it into native Hyperframes clips.

Plain files in and out (UTF-8, no network). Needs ffmpeg on PATH for `propose`.

  python plan_to_clips.py propose VIDEO TRANSCRIPT.json --out plan.json [--noise -35|auto] [--min 0.40] [--keep 0.18] [--graded]
  python plan_to_clips.py retakes TRANSCRIPT.json [--out retakes.json] [--n 3] [--within 45]
  python plan_to_clips.py build   plan.json TRANSCRIPT.json OUTDIR

propose  finds the silences worth cutting (ffmpeg silencedetect, checked against the transcript so no word is
         cut) and writes a first plan.json: one segment per stretch of speech, cut-ins alternating 1.0 / 1.12.
         Claude then edits the plan by hand: restore a pause before a punchline, speed up a ramble, slow a key line.
         --noise auto sets the silence threshold from the room itself (the recording's quiet floor plus 6 dB) instead of a fixed -35 dB;
         if it finds no clear floor (speech under 12 dB above it) it says so and uses -35. --graded keeps more of a long pause than of a short one
         (up to 1 s: --keep, 1-3 s: 0.30 s, over 3 s: 0.50 s) instead of the same --keep every time. It prints the stats of the proposal.
retakes  looks for a line he said twice: the same opening words again within --within seconds (spelling variants of Farsi letters, half-spaces and
         digits are normalised first). It lists each as a restart (the first try is shorter: cut it, keep the LAST take) or a repeat (maybe on
         purpose). It never cuts anything: Claude shows the list to Amir and edits plan.json.
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


def auto_noise(video):
    """The silence threshold from the room itself: the recording's noise floor plus 6 dB, instead of a fixed -35 dB. ffmpeg's silencedetect compares
    single samples, so each 50 ms window is measured by its loudest sample. The floor is the LOWEST DENSE CLUSTER of those levels (the room between his
    words; on HCTV3230 it sits at -42 dB, a gap, then speech from -36 dB up). A percentile would land in the valleys between words when he talks fast.
    Returns (threshold in dB as a string, floor, typical speech level); the threshold is -35 when there is no clear floor (speech under 12 dB above it)."""
    import numpy as np
    p = subprocess.run([shutil.which("ffmpeg") or "ffmpeg", "-v", "error", "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
                       capture_output=True)
    x = np.frombuffer(p.stdout, dtype=np.float32)
    n = len(x) // 800
    if n < 40:
        return "-35", None, None
    db = 20 * np.log10(np.abs(x[: n * 800]).reshape(n, 800).max(axis=1) + 1e-6)
    hist, edges = np.histogram(db, bins=np.arange(-100, 2, 2))
    sm = np.convolve(hist, np.ones(3) / 3, mode="same")
    need = max(6.0, 0.015 * n)
    floor = next(((edges[i] + edges[i + 1]) / 2 for i in range(1, len(sm) - 1) if sm[i] >= need and sm[i] >= sm[i - 1] and sm[i] >= sm[i + 1]), None)
    speech = float(np.percentile(db, 50))
    if floor is None or speech - floor < 12:
        return "-35", floor, speech
    return "%.1f" % min(-25.0, max(-60.0, floor + 6.0)), floor, speech


def keep_for(length, a):
    """How much of a pause of this length stays after its cut: --keep, or with --graded more of a long one (a long pause is usually a breath he meant)."""
    if not getattr(a, "graded", False):
        return a.keep
    return a.keep if length < 1.0 else 0.30 if length < 3.0 else 0.50


def propose(a):
    words = load_words(a.transcript)
    total = media_duration(a.video)
    words = [w for w in words if w["start"] < total]
    lo = max(0.0, words[0]["start"] - 0.15)
    hi = min(total, words[-1]["end"] + 0.35)
    noise = a.noise
    if str(noise) == "auto":
        noise, floor, speech = auto_noise(a.video)
        if floor is None or speech is None or speech - floor < 12:
            print("noise auto: no clear room floor to measure (%s): using -35 dB" %
                  ("too little audio" if speech is None else "no dense quiet cluster" if floor is None else "floor %.1f dB, speech %.1f dB" % (floor, speech)), file=sys.stderr)
        else:
            print("noise auto: room floor %.1f dB, typical speech %.1f dB: silence threshold %s dB" % (floor, speech, noise), file=sys.stderr)
    cuts = []
    for s, e in silences(a.video, noise, a.min, total):
        keep = keep_for(e - s, a)
        x, y = s + keep / 2, e - keep / 2
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
    lens = sorted(y - x for x, y in cuts)
    removed = sum(lens)
    edited = max(0.1, (hi - lo) - removed)
    print("source %.1f s | %d pauses cut (%.1f s) | %d segments | wrote %s" %
          (total, len(cuts), removed, len(plan["segments"]), a.out), file=sys.stderr)
    if lens:
        print("stats: median cut %.2f s, longest %.2f s | %.0f%% of the speech stretch removed | %.1f cuts a minute of the edited reel" %
              (lens[len(lens) // 2], lens[-1], 100.0 * removed / max(0.1, hi - lo), len(lens) / (edited / 60.0)), file=sys.stderr)


def norm_word(t):
    """A word for comparing: Arabic yeh and kaf as Persian, no diacritics, tatweel or half-space, Latin lower case, digits as 0-9, no punctuation."""
    import unicodedata
    t = unicodedata.normalize("NFKC", t)
    t = t.replace("ي", "ی").replace("ك", "ک").replace("ة", "ه").replace("ۀ", "ه")
    t = re.sub("[ً-ٰٟـ‌‍]", "", t)
    t = t.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
                                  "01234567890123456789"))
    return re.sub(r"[^\w]", "", t).lower()


def retakes(a):
    """Find a line said twice. A retake leaves the same opening words twice a few seconds apart, the first try cut short: whisper often collapses it,
    so this works from the words it did give. It lists candidates; Claude and Amir decide, nothing is cut here."""
    from difflib import SequenceMatcher
    words = load_words(a.transcript)
    toks = [norm_word(w["text"]) for w in words]
    n = a.n

    def same(i, j):
        return all(toks[i + k] and toks[j + k] and SequenceMatcher(None, toks[i + k], toks[j + k]).ratio() >= a.ratio for k in range(n))

    def phrase_end(j):
        k = j
        while k + 1 < len(words) and words[k + 1]["start"] - words[k]["end"] < a.gap:
            k += 1
        return k

    text = lambda i, j: " ".join(w["text"] for w in words[i:j + 1])
    found, i = [], 0
    while i < len(words) - n:
        hit = None
        for j in range(i + n, len(words) - n + 1):  # the second take cannot start inside the opening words themselves
            if words[j]["start"] - words[i]["start"] > a.within:
                break
            if same(i, j):
                hit = j
                break
        if hit is None:
            i += 1
            continue
        e1, e2 = hit - 1, phrase_end(hit)
        pause = words[hit]["start"] - words[e1]["end"]
        first_len = words[e1]["end"] - words[i]["start"]
        # a restart: the first try is SHORT (a stumble, a few seconds at most) and the second runs on; anything else is a repeat, often on purpose
        restart = e1 - i < e2 - hit and first_len <= a.max_first
        found.append({"kind": "restart" if restart else "repeat",
                      "first": {"from": words[i]["start"], "to": words[e1]["end"], "text": text(i, e1)},
                      "second": {"from": words[hit]["start"], "to": words[e2]["end"], "text": text(hit, min(e2, hit + 11))},
                      "pause_before_second": round(pause, 2),
                      "cut": [round(words[i]["start"], 2), round(words[hit]["start"], 2)] if restart else None})
        i = hit
    for f in found:
        tail = ("-> to keep the last take cut %.2f-%.2f s" % tuple(f["cut"])) if f["cut"] else "-> maybe on purpose, no cut suggested"
        print("%-7s t=%.1f-%.1f s  first try: %s  ->  second: %s  (pause %.2f s)  %s" % (
            f["kind"], f["first"]["from"], f["first"]["to"], f["first"]["text"][:60], f["second"]["text"][:60], f["pause_before_second"], tail))
    if not found:
        print("no line said twice (opening %d words repeated within %.0f s)" % (n, a.within))
    if a.out:
        json.dump({"candidates": found}, open(a.out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("%d candidate(s): %d restart(s), %d repeat(s)" % (len(found), sum(f["kind"] == "restart" for f in found), sum(f["kind"] == "repeat" for f in found)),
          file=sys.stderr)


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
        # data-layout-allow-overflow: a cut-in zooms the footage past the frame on purpose (hyperframes check would flag it)
        html.append('<div class="inner" id="v%d" data-layout-allow-overflow><video id="vid%d" class="clip" src="%s" data-start="%.4f" '
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
    p1.add_argument("--noise", default="-35", help="silence floor in dB (-35), or 'auto' to read it from the room")
    p1.add_argument("--min", default="0.40", help="shortest silence to consider, seconds")
    p1.add_argument("--keep", type=float, default=0.18, help="pause left in place of a cut one, seconds")
    p1.add_argument("--graded", action="store_true", help="keep more of a long pause: 1-3 s keep 0.30 s, over 3 s keep 0.50 s")
    p1.add_argument("--video-name", default="input-video.mp4")
    p1.add_argument("--audio-name", default="voice.m4a")
    p3 = sub.add_parser("retakes")
    p3.add_argument("transcript")
    p3.add_argument("--out")
    p3.add_argument("--n", type=int, default=3, help="how many opening words must repeat (default 3)")
    p3.add_argument("--within", type=float, default=45.0, help="the second take starts within this many seconds of the first (default 45)")
    p3.add_argument("--ratio", type=float, default=0.75, help="how alike two words must be, 0-1 (default 0.75: a misheard letter passes)")
    p3.add_argument("--gap", type=float, default=0.35, help="a pause this long ends a phrase, seconds (default 0.35)")
    p3.add_argument("--max-first", type=float, default=12.0, help="a first try longer than this is a repeat, not a restart, seconds (default 12)")
    p2 = sub.add_parser("build")
    p2.add_argument("plan")
    p2.add_argument("transcript")
    p2.add_argument("outdir")
    args = ap.parse_args()
    if hasattr(args, "min"):
        args.min = float(args.min)
    {"propose": propose, "retakes": retakes, "build": build}[args.cmd](args)
