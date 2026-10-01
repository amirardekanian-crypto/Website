"""The render gate: facts about a FINISHED reel (mp4) and the things that go wrong without any error.

  python qa_reel.py <final.mp4> [--reel <reel dir>] [--timemap out/timemap.json] [--tour] [--out <folder for sheets>]

Checks (all local; ffmpeg + numpy; nothing is uploaded):
  format     1080x1920, 30 fps, h264 yuv420p, AAC 48 kHz stereo; video and audio stream lengths agree (a mismatch is how a voice drifts)
  loudness   -14 LUFS (+-0.8) and true peak at or below -1 dBTP: the same pass mark as loud.py
  dead air   silence of 0.8 s or more in the finished mix (a cut that left too much, or a missing voice clip)
  freeze     a picture that does not move for 1 s or more (a card without its slow push-in reads as a slide)
  seams      a click at a cut: a step in the waveform right at a real cut (the planner puts a 20 ms fade on every cut, so this proves it works)
  pops       a one-frame jump in the picture that is not a cut: a layer flashing at the wrong frame (the "immediateRender" bug). The frames
             around the first few go into pop_sheet.png: look at them and decide if each is meant
  --tour     a contact sheet with a frame every second (qa_tour_N.png) to see the pace of the whole reel at a glance; --phone draws the parts Instagram covers on his phone on it

The seam times come from the reel's out/timemap.json (found next to the mp4 when it sits in <slug>/ with the work in <slug>/v1/, or pass --reel/--timemap).
Exit code: 0 PASS or WARN, 1 FAIL.
"""
import argparse
import json
import os
import re
import subprocess
import sys

import numpy as np

FF, FP = "ffmpeg", "ffprobe"
SR = 48000
results = []  # (level, topic, text)


def say(level, topic, text):
    results.append((level, topic, text))
    print("  %-5s %-9s %s" % (level, topic, text))


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def probe(path):
    p = run([FP, "-v", "error", "-print_format", "json", "-show_streams", "-show_format", path])
    return json.loads(p.stdout)


def check_format(path):
    j = probe(path)
    v = next((s for s in j["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in j["streams"] if s["codec_type"] == "audio"), None)
    if not v:
        say("FAIL", "format", "no video stream")
        return None, None, 0.0
    size = "%dx%d" % (v["width"], v["height"])
    num, _, den = v.get("avg_frame_rate", "0/1").partition("/")
    fps = float(num) / float(den or 1) if float(den or 1) else 0.0
    say("PASS" if size == "1080x1920" else "FAIL", "format", "picture %s, %.2f fps, %s %s, range %s, matrix %s" % (
        size, fps, v.get("codec_name"), v.get("pix_fmt"), v.get("color_range", "?"), v.get("color_space", "?")))
    if abs(fps - 30) > 0.05:
        say("WARN", "format", "frame rate is %.2f, not 30" % fps)
    if v.get("pix_fmt") != "yuv420p":
        say("WARN", "format", "pixel format is %s, Instagram wants yuv420p" % v.get("pix_fmt"))
    dv = float(v.get("duration") or j["format"]["duration"])
    if a:
        da = float(a.get("duration") or j["format"]["duration"])
        ok = a.get("codec_name") == "aac" and int(a.get("sample_rate", 0)) == 48000 and int(a.get("channels", 0)) == 2
        say("PASS" if ok else "WARN", "format", "sound %s %s Hz %s ch %.0f kbps" % (a.get("codec_name"), a.get("sample_rate"), a.get("channels"),
                                                                                   float(a.get("bit_rate", 0)) / 1000))
        gap = abs(dv - da)
        say("PASS" if gap <= 0.1 else "WARN" if gap <= 0.25 else "FAIL", "format",
            "length: picture %.2f s, sound %.2f s (difference %.0f ms)" % (dv, da, gap * 1000))
    else:
        say("NOTE", "format", "no sound stream (a silent reel): the sound checks are skipped")
    return v, a, dv


def check_loudness(path):
    p = run([FF, "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "ebur128=peak=true", "-f", "null", "-"])
    s = p.stderr[p.stderr.rfind("Summary:"):]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", s)
    lra = re.search(r"LRA:\s+([\d.]+) LU", s)
    pk = re.search(r"Peak:\s+(-?[\d.]+) dBFS", s[s.find("True peak"):]) if "True peak" in s else None
    if not i or not pk:
        say("WARN", "loudness", "could not read the loudness summary")
        return
    I, TP = float(i.group(1)), float(pk.group(1))
    ok = abs(I + 14) <= 0.8 and TP <= -1.0
    say("PASS" if ok else "FAIL", "loudness", "%.1f LUFS, true peak %.1f dBTP, range %s LU (aim -14 +-0.8, peak -1.0 or lower)" % (I, TP, lra.group(1) if lra else "?"))


def check_deadair(path):
    p = run([FF, "-hide_banner", "-nostats", "-i", path, "-vn", "-af", "silencedetect=noise=-45dB:d=0.8", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"silence_start: (-?[\d.]+)", p.stderr)]
    durs = [float(x) for x in re.findall(r"silence_duration: ([\d.]+)", p.stderr)]
    if not starts:
        say("PASS", "dead air", "no silence of 0.8 s or more")
        return
    for t, d in list(zip(starts, durs))[:10]:
        say("WARN", "dead air", "%.1f s of silence at t=%.1f s: a long pause on purpose, or a gap?" % (d, max(t, 0)))


def check_freeze(path):
    p = run([FF, "-hide_banner", "-nostats", "-i", path, "-an", "-vf", "freezedetect=n=-60dB:d=1.0", "-f", "null", "-"])
    starts = [float(x) for x in re.findall(r"freeze_start: ([\d.]+)", p.stderr)]
    durs = [float(x) for x in re.findall(r"freeze_duration: ([\d.]+)", p.stderr)]
    if not starts:
        say("PASS", "freeze", "the picture never stands still for 1 s")
        return
    for t, d in list(zip(starts, durs))[:10]:
        say("WARN", "freeze", "the picture does not move for %.1f s at t=%.1f s (a card needs its slow push-in)" % (d, t))


def seam_times(timemap):
    segs = json.load(open(timemap, encoding="utf-8"))["segments"]
    out = []
    for a, b in zip(segs, segs[1:]):
        if abs(a["out"] - b["in"]) > 1e-3:  # a real cut (not two touching stretches)
            out.append(b["start"])
    return out


def check_seams(path, seams):
    p = subprocess.run([FF, "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    x = np.frombuffer(p.stdout, dtype=np.float32)
    if not len(x) or not seams:
        return
    d = np.abs(np.diff(x))
    w, ref = int(SR * 0.005), int(SR * 0.2)
    worst, bad = 0.0, []
    for t in seams:
        i = int(t * SR)
        if i < ref or i + ref >= len(x):
            continue
        near = d[i - w: i + w].max()
        around = np.concatenate([d[i - ref: i - w], d[i + w: i + ref]])
        ratio = near / (np.percentile(around, 95) + 1e-9)
        step = near
        worst = max(worst, ratio if step > 0.01 else 0)
        if ratio > 4 and step > 0.01:  # a step above -40 dBFS that is 4x the neighbourhood's loudest 5 percent
            bad.append((t, ratio, step))
    if bad:
        for t, r, s in bad[:8]:
            say("WARN", "seams", "a click at the cut at t=%.2f s (step %.3f, %.1fx its surroundings)" % (t, s, r))
    else:
        say("PASS", "seams", "%d cuts, no click (largest step ratio %.1f; the planner's 20 ms fades work)" % (len(seams), worst))


def frames_gray(path, w=96, h=170):
    p = subprocess.run([FF, "-v", "error", "-i", path, "-an", "-vf", "scale=%d:%d,format=gray" % (w, h), "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                       capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.uint8).reshape(-1, w * h)


def tween_boundaries(page):
    """Start and end time of every tween on the reel's page (tools/tween_times.js, local headless Chrome), or None."""
    js = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tween_times.js")
    try:
        p = subprocess.run(["node", js, page], capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120)
        return json.loads(p.stdout)["times"] if p.returncode == 0 else None
    except Exception:
        return None


def check_pops(path, seams, fps, outdir, tweens=None, all_pops=False):
    """Jumps in the picture. A wipe sweeping across, a slam or his own hand moving all make big frame-to-frame changes, so a jump on its own proves
    nothing (measured on HCTV3230: 39 jumps, every one of them meant). What a stray layer looks like is a BLIP: the picture jumps away and is back
    within 4 frames. Those are the WARN; a blip that sits on a cut or a tween (a K.flash, say) is planned. --all-pops also sheets the other jumps."""
    fr = frames_gray(path).astype(np.int16)
    if len(fr) < 20:
        return
    d = np.abs(np.diff(fr, axis=0)).mean(axis=1)  # d[n] = change from frame n to n+1
    n = len(d)

    def jump(k):  # is the step from frame k to k+1 a jump (against its quiet surroundings)?
        lo, hi = max(0, k - 8), min(n, k + 9)
        ring = np.concatenate([d[lo:max(lo, k - 1)], d[min(hi, k + 2):hi]])
        base = np.median(ring) if len(ring) else 0.0
        return d[k] > 3 * base + 2.5 and d[k] > 4.0, base

    jumps, blips, k = [], [], 0
    while k < n - 6:
        is_jump, base = jump(k)
        if not is_jump:
            k += 1
            continue
        frame = k + 1  # the first frame that looks different
        blip = None
        for L in range(1, 5):  # the picture is back after L frames?
            if k + L < n and d[k + L] > 0.6 * d[k] and np.abs(fr[k] - fr[k + L + 1]).mean() < 0.4 * d[k]:
                blip = L
                break
        (blips if blip else jumps).append((frame, d[k], d[k] / (base + 0.5), blip))
        k += (blip or 0) + 2
    tw = np.array(tweens) if tweens else np.array([])

    def planned(frame):
        t = frame / fps
        return any(abs(t - s) <= 3 / fps for s in seams) or (len(tw) > 0 and bool((np.abs(tw - t) <= 2 / fps).any()))

    stray = [b for b in blips if not planned(b[0])]
    known = [b for b in blips if planned(b[0])]
    say("NOTE", "pops", "%d jumps in the picture (wipes, graphics landing and his own movement: expected) and %d blips (back within 4 frames), %d of them at a cut or a tween%s" % (
        len(jumps) + len(blips), len(blips), len(known), "" if tweens else " (no page found, so tweens are not known)"))
    for f, mag, ratio, L in stray[:10]:
        say("WARN", "pops", "a blip at t=%.2f s: the picture jumps and is back after %d frame(s), and no cut or tween is there: a stray layer?" % (f / fps, L))
    pick = [f for f, _, _, _ in stray[:8]]
    if all_pops:
        pick += [f for f, _, _, _ in sorted(jumps, key=lambda j: -j[2])[:6]]
    if pick:
        sheet = os.path.join(outdir, "pop_sheet.png")
        make_pop_sheet(path, [f / fps for f in pick], fps, sheet)
        say("NOTE", "pops", "frames around %d moment(s) (before, on, after) are in %s: look at them" % (len(pick), sheet))


PHONE = False  # --phone: draw the parts of the picture Instagram's interface covers (phone_zones.py) on the sheets


def zones(im):
    if not PHONE:
        return im
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import phone_zones
    return phone_zones.overlay(im)


def make_pop_sheet(path, times, fps, out):
    from PIL import Image, ImageDraw
    W, H = 216, 384
    sheet = Image.new("RGB", (W * 3, H * len(times)), (20, 20, 20))
    dr = ImageDraw.Draw(sheet)
    for r, t in enumerate(times):
        for c, dt in enumerate((-1, 0, 1)):
            tt = max(0, t + dt / fps)
            p = subprocess.run([FF, "-v", "error", "-ss", "%.4f" % tt, "-i", path, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
            if p.stdout:
                import io
                im = zones(Image.open(io.BytesIO(p.stdout)).convert("RGB").resize((W, H), Image.LANCZOS))
                sheet.paste(im, (c * W, r * H))
            dr.rectangle([c * W, r * H, c * W + 92, r * H + 14], fill=(0, 0, 0))
            dr.text((c * W + 3, r * H + 2), "t=%.2f (%+d)" % (tt, dt), fill=(255, 255, 255))
    sheet.save(out)


def make_tour(path, dur, outdir, every):
    from PIL import Image, ImageDraw
    import io
    W, H, COLS, ROWS = 216, 384, 8, 5
    times = [round(k * every, 3) for k in range(int(dur / every) + 1)]
    for part in range(0, len(times), COLS * ROWS):
        chunk = times[part: part + COLS * ROWS]
        rows = (len(chunk) + COLS - 1) // COLS
        sheet = Image.new("RGB", (W * COLS, H * rows), (20, 20, 20))
        dr = ImageDraw.Draw(sheet)
        for i, t in enumerate(chunk):
            p = subprocess.run([FF, "-v", "error", "-ss", "%.3f" % t, "-i", path, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"], capture_output=True)
            x, y = (i % COLS) * W, (i // COLS) * H
            if p.stdout:
                sheet.paste(zones(Image.open(io.BytesIO(p.stdout)).convert("RGB").resize((W, H), Image.LANCZOS)), (x, y))
            dr.rectangle([x, y, x + 52, y + 14], fill=(0, 0, 0))
            dr.text((x + 3, y + 2), "%.0f s" % t, fill=(255, 255, 255))
        out = os.path.join(outdir, "qa_tour_%d.png" % (part // (COLS * ROWS) + 1))
        sheet.save(out)
        say("NOTE", "tour", "wrote " + out)


def find_timemap(mp4, reel, timemap):
    if timemap:
        return timemap
    cands = []
    if reel:
        cands.append(os.path.join(reel, "out", "timemap.json"))
    base = os.path.dirname(os.path.abspath(mp4))
    cands += [os.path.join(base, "out", "timemap.json"), os.path.join(base, "v1", "out", "timemap.json")]
    return next((c for c in cands if os.path.exists(c)), None)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mp4")
    ap.add_argument("--reel")
    ap.add_argument("--timemap")
    ap.add_argument("--out", help="folder for the sheets (default: next to the mp4)")
    ap.add_argument("--all-pops", action="store_true", help="also put the biggest ordinary jumps in pop_sheet.png")
    ap.add_argument("--tour", action="store_true", help="also write a contact sheet with a frame every --every seconds")
    ap.add_argument("--phone", action="store_true", help="draw the parts of the picture Instagram's interface covers on his phone (tools/phone_zones.py) on the sheets")
    ap.add_argument("--tour-only", action="store_true", help="make the tour sheet and nothing else (no checks)")
    ap.add_argument("--every", type=float, default=1.0)
    a = ap.parse_args()
    global PHONE
    PHONE = a.phone
    outdir = a.out or os.path.dirname(os.path.abspath(a.mp4))
    os.makedirs(outdir, exist_ok=True)
    if a.tour_only:
        make_tour(a.mp4, float(probe(a.mp4)["format"]["duration"]), outdir, a.every)
        return
    print("QA %s" % a.mp4)
    v, au, dur = check_format(a.mp4)
    if v is None:
        sys.exit(1)
    fps = 30.0
    if au:
        check_loudness(a.mp4)
        check_deadair(a.mp4)
    check_freeze(a.mp4)
    tm = find_timemap(a.mp4, a.reel, a.timemap)
    seams = seam_times(tm) if tm else []
    if tm and au:
        check_seams(a.mp4, seams)
    elif au:
        say("NOTE", "seams", "no out/timemap.json found: pass --reel or --timemap to check the cuts for clicks")
    page = None
    for base in ([a.reel] if a.reel else []) + ([os.path.dirname(os.path.dirname(tm))] if tm else []):
        if os.path.exists(os.path.join(base, "public", "index.html")):
            page = os.path.join(base, "public", "index.html")
            break
    check_pops(a.mp4, seams, fps, outdir, tween_boundaries(page) if page else None, a.all_pops)
    if a.tour:
        make_tour(a.mp4, dur, outdir, a.every)
    fails = [r for r in results if r[0] == "FAIL"]
    warns = [r for r in results if r[0] == "WARN"]
    print("RESULT: %s (%d fail, %d warn)" % ("FAIL" if fails else "WARN" if warns else "PASS", len(fails), len(warns)))
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
