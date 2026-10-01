"""Proof that the kit's sound placement is right. Run it after ANY change to kit.py's sfx_html(), to kit/sfx/timing.json or to a sound file.

  python sfx_proof.py            # both checks
  python sfx_proof.py compat     # only: old builds must come out identical
  python sfx_proof.py render     # only: a test reel with a flash and a sound at known times, rendered with Hyperframes, measured in the MP4

compat  rebuilds the audio tags of every delivered showreel page (C:\\Users\\Amir\\Videos\\Reels\\kit-showreel*) with sfx_html(align=False) and compares them
        with the tags already in the page: the old builds cue the FILE start and must never change.
render  builds a 29 s black reel with a white flash at each of 9 times and a different sound aligned to the same times (sfx_html(align=True)), renders it
        (about 15 s) and measures, in the finished MP4, when each flash frame appears and when each sound's hit (onset), peak or end (roll) lands.
        PASS = every sound within 20 ms of its flash (one frame is 33 ms). The first proof (2026-10-01): all 9 at 0 ms; the same reel with align=False:
        click +120 ms, whoosh +265 ms, risers +1265 ms, roll +915 ms.
Exit code 0 PASS, 1 FAIL.
"""
import json
import os
import re
import shutil
import subprocess
import sys

import numpy as np

KITDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "kit")
sys.path.insert(0, KITDIR)
import kit  # noqa: E402

REELS = r"C:\Users\Amir\Videos\Reels"
ROOT = os.path.join(REELS, "_tests", "sfx_proof")
PUB = os.path.join(ROOT, "public")
OUT = os.path.join(ROOT, "out.mp4")
EVENTS = [(0.4, "riser"), (3.4, "click"), (6.6, "ball-hit"), (9.8, "whoosh"), (13.0, "riser"), (16.2, "stamp"), (19.4, "roll"),
          (22.6, "thud-drop"), (25.8, "snare-roll")]
TOTAL = 29.0
RATE = 48000
WIN = int(RATE * 0.005)
TAG = r'<audio id="sfx\d+" class="clip" src="sfx/([^"]+)" data-start="([\d.]+)" data-duration="([\d.]+)" data-track-index="(\d+)" data-volume="([\d.]+)"></audio>'


def compat():
    bad = 0
    pages = [n for n in sorted(os.listdir(REELS)) if n.startswith("kit-showreel") and os.path.exists(os.path.join(REELS, n, "public", "index.html"))]
    by_file = {}
    for name, c in kit.SFX.items():
        by_file.setdefault(c["file"], []).append(name)
    for n in pages:
        old = re.findall(TAG, open(os.path.join(REELS, n, "public", "index.html"), encoding="utf-8").read())
        events = [(float(start), by_file[f][0]) for f, start, _d, _t, _v in old]
        new = re.findall(TAG, kit.sfx_html(events, lambda t: t, align=False))
        same = old == new
        bad += not same
        print("compat %-16s %3d cues  identical: %s" % (n, len(old), same))
    print("compat: %s (%d pages)" % ("PASS" if not bad else "FAIL", len(pages)))
    return not bad


def build():
    os.makedirs(os.path.join(PUB, "sfx"), exist_ok=True)
    os.makedirs(os.path.join(PUB, "vendor"), exist_ok=True)
    shutil.copy2(os.path.join(kit.KIT, "assets", "vendor", "gsap.min.js"), os.path.join(PUB, "vendor", "gsap.min.js"))
    for n in set(n for _, n in EVENTS):
        shutil.copy2(os.path.join(kit.KIT, "sfx", kit.SFX[n]["file"]), os.path.join(PUB, "sfx", kit.SFX[n]["file"]))
    audio = kit.sfx_html(EVENTS, lambda t: t, align=True)
    flashes = "\n".join('tl.set("#fl", { opacity: 1 }, %.3f); tl.set("#fl", { opacity: 0 }, %.3f);' % (t, t + 0.12) for t, _ in EVENTS)
    html = """<!doctype html>
<html lang="en"><head><meta charset="utf-8" /><style>
html, body { margin: 0; background: #000; }
#stage { position: relative; width: 1080px; height: 1920px; background: #000; overflow: hidden; }
#fl { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; background: #fff; opacity: 0; }
</style></head><body>
<div id="stage" data-composition-id="sfxproof" data-start="0" data-duration="%s" data-fps="30" data-width="1080" data-height="1920">
  <div id="fl"></div>
  %s
  <script src="vendor/gsap.min.js"></script>
  <script>
    const tl = gsap.timeline({ paused: true });
    %s
    window.__timelines = window.__timelines || {};
    window.__timelines["sfxproof"] = tl;
  </script>
</div></body></html>
""" % (TOTAL, audio, flashes)
    open(os.path.join(PUB, "index.html"), "w", encoding="utf-8").write(html)


def pcm(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32)


def flash_frames(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vf", "fps=30,scale=4:4,format=gray", "-f", "rawvideo", "-"], capture_output=True)
    on = np.frombuffer(p.stdout, dtype=np.uint8).reshape(-1, 16).mean(axis=1) > 128
    return [i / 30.0 for i in range(1, len(on)) if on[i] and not on[i - 1]]


def render():
    build()
    r = subprocess.run([shutil.which("hyperframes"), "render", "public", "-o", "out.mp4", "--fps", "30", "-q", "draft"], cwd=ROOT, capture_output=True,
                       text=True, encoding="utf-8", errors="replace")
    if not os.path.exists(OUT):
        print("render failed:", (r.stderr or r.stdout)[-600:])
        return False
    timing = json.load(open(os.path.join(KITDIR, "sfx", "timing.json"), encoding="utf-8"))
    x = pcm(OUT)
    n = len(x) // WIN
    rms = np.sqrt((x[: n * WIN].reshape(n, WIN) ** 2).mean(axis=1))
    flashes = flash_frames(OUT)
    print("render: %d flash frames found (expected %d)" % (len(flashes), len(EVENTS)))
    worst = 0.0
    for k, (T, name) in enumerate(EVENTS):
        al = timing[kit.SFX[name]["file"]].get("align", "onset")
        lo, hi = max(0, int((T - 1.4) / 0.005)), min(n, int((T + 1.9) / 0.005))
        if k + 1 < len(EVENTS):
            hi = min(hi, int((EVENTS[k + 1][0] - 1.4) / 0.005))
        seg = rms[lo:hi]
        strong = np.nonzero(seg > seg.max() * 10 ** (-20 / 20))[0]
        at = {"onset": strong[0], "peak": int(np.argmax(seg)), "end": strong[-1]}[al]
        s = (lo + at) * 0.005
        fl = flashes[k] if k < len(flashes) else float("nan")
        d = (s - fl) * 1000
        worst = max(worst, abs(d)) if d == d else 999
        print("  t=%5.1f  %-10s %-6s flash %.3f  sound %.3f  difference %+4.0f ms" % (T, name, al, fl, s, d))
    ok = len(flashes) == len(EVENTS) and worst <= 20
    print("render: %s (worst %.0f ms; one frame is 33 ms)" % ("PASS" if ok else "FAIL", worst))
    return ok


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    ok = True
    if what in ("all", "compat"):
        ok = compat() and ok
    if what in ("all", "render"):
        ok = render() and ok
    sys.exit(0 if ok else 1)
