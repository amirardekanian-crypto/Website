"""Loudness finish: tame the hits, bring the mix to -14 LUFS, keep the true peak under -1 dBTP, copy the picture, re-measure to prove it.

  python loud.py in.mp4 out.mp4

How (changed 2026-10-02, SGUW4377): the old two-pass `loudnorm` ended a reel with sound effects at -0.2 dBTP, because the hits peak far above the voice and AAC adds about 1 dB of
overshoot. Now: a short pre-limiter catches the hits (-8 dBFS: the loudness barely moves, the peak falls 5 dB), the gain to -14 LUFS is set from the measured loudness, and a final
limiter at -2.5 dBFS leaves room for the AAC overshoot.
"""
import json
import re
import subprocess
import sys

src, dst = sys.argv[1], sys.argv[2]
FF = "ffmpeg"
PRE = "alimiter=limit=0.4:level=disabled:attack=2:release=40"
POST = "alimiter=limit=0.66:level=disabled:attack=1:release=30"
TARGET = -14.0


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def measure(path, pre=""):
    af = (pre + "," if pre else "") + "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json"
    p = run([FF, "-hide_banner", "-nostats", "-i", path, "-vn", "-af", af, "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    return json.loads(m.group(0))


j = measure(src)
print("before: I=%s LUFS  TP=%s dBTP  LRA=%s LU" % (j["input_i"], j["input_tp"], j["input_lra"]))
k0 = measure(src, PRE)
gain = TARGET + 1.1 - float(k0["input_i"])  # +1.1: the final limiter takes about 1.4 LU back
af = "%s,volume=%.2fdB,%s" % (PRE, gain, POST)
p = run([FF, "-y", "-hide_banner", "-nostats", "-i", src, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", af,
         "-ar", "48000", "-c:a", "aac", "-b:a", "256k", "-movflags", "+faststart", dst])
if p.returncode != 0:
    sys.exit(p.stderr[-800:])
k = measure(dst)
print("after:  I=%s LUFS  TP=%s dBTP  LRA=%s LU   (gain %+.2f dB)" % (k["input_i"], k["input_tp"], k["input_lra"], gain))
ok = abs(float(k["input_i"]) + 14) <= 0.8 and float(k["input_tp"]) <= -1.0
print("PASS" if ok else "CHECK: outside -14 +-0.8 LUFS or true peak above -1.0")
