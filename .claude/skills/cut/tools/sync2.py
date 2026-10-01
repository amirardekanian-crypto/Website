"""Does the finished file's voice line up with the ORIGINAL take at every speed used?

  python sync2.py <original.mp4> <finished.mp4> <out/timemap.json>

Picks a window inside the longest segment of each distinct rate, applies the same speed to the original audio and
cross-correlates the loudness envelopes with the finished file at the matching edited time. Lag near 0 ms and a high
correlation (0.85+) mean the cuts and speed changes landed on the right words.
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


by_rate = {}
for s in segs:
    by_rate.setdefault(round(s["rate"], 3), []).append(s)
tests = []
for rate, lst in sorted(by_rate.items()):
    s = max(lst, key=lambda x: x["out"] - x["in"])
    length = s["out"] - s["in"]
    w = min(3.5, length - 0.4)
    if w >= 1.0:
        a = s["in"] + (length - w) / 2
        tests.append(("rate %.2f" % rate, a, a + w, rate))
for name, a, b, rate in tests:
    t0, dur = edited(a), (b - a) / rate
    ref, got = env(pcm(RAW, a, b - a, rate)), env(pcm(OUT, t0, dur))
    n = min(len(ref), len(got))
    x, y = ref[:n] - ref[:n].mean(), got[:n] - got[:n].mean()
    best = max(range(-30, 31), key=lambda L: np.dot(x[max(0, L):n + min(0, L)], y[max(0, -L):n - max(0, L)]))
    xx, yy = x[max(0, best):n + min(0, best)], y[max(0, -best):n - max(0, best)]
    r = float(np.dot(xx, yy) / (np.linalg.norm(xx) * np.linalg.norm(yy)))
    print("%-12s source %6.1f-%6.1f s | lag %+4d ms | correlation %.3f" % (name, a, b, best * 10, r))
