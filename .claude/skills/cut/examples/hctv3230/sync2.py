"""Does the finished file's voice line up with the ORIGINAL take, at every speed used?

For a few stretches (rate 1.0, 1.08, 0.92): take the original audio, apply the same speed, and cross-correlate its
loudness envelope with the finished file at the matching edited time. Lag near 0 and a high correlation mean the
cut and the speed changes landed on the right words.
"""
import json
import subprocess
import sys

import numpy as np

RAW, OUT, TM = sys.argv[1], sys.argv[2], sys.argv[3]
SR = 8000
segs = json.load(open(TM, encoding="utf-8"))["segments"]


def edited(t):
    for s in segs:
        if s["in"] <= t <= s["out"]:
            return s["start"] + (t - s["in"]) / s["rate"]
    raise ValueError(t)


def pcm(path, start, dur, atempo=None):
    af = "atempo=%g" % atempo if atempo and abs(atempo - 1) > 1e-6 else "anull"
    p = subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.3f" % start, "-t", "%.3f" % dur, "-i", path, "-vn", "-ac", "1",
                        "-ar", str(SR), "-af", af, "-f", "s16le", "-"], capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.int16).astype(np.float64)


def env(x, ms=20):
    n = int(SR * ms / 1000)
    return np.convolve(np.abs(x), np.ones(n) / n, mode="same")[::n // 2]


# (label, source start, source end, rate)  -- each lies inside one segment
tests = [("rate 1.00 (opening question)", 0.5, 5.0, 1.0),
         ("rate 1.08 (rules, faster)", 29.0, 33.0, 1.08),
         ("rate 0.94 (the slow question)", 40.6, 44.0, 0.94),
         ("rate 0.92 (the key line, slower)", 58.0, 61.2, 0.92),
         ("rate 1.00 (the close)", 71.0, 74.5, 1.0)]
for name, a, b, rate in tests:
    t0 = edited(a)
    dur = (b - a) / rate
    ref = env(pcm(RAW, a, b - a, rate))
    got = env(pcm(OUT, t0, dur))
    n = min(len(ref), len(got))
    x, y = ref[:n] - ref[:n].mean(), got[:n] - got[:n].mean()
    best = max(range(-30, 31), key=lambda L: np.dot(x[max(0, L):n + min(0, L)], y[max(0, -L):n - max(0, L)]))
    xx, yy = x[max(0, best):n + min(0, best)], y[max(0, -best):n - max(0, best)]
    r = float(np.dot(xx, yy) / (np.linalg.norm(xx) * np.linalg.norm(yy)))
    print("%-34s lag %+4d ms | correlation %.3f" % (name, best * 10, r))
