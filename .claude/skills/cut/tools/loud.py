"""Two-pass loudness finish: measure, then match -14 LUFS / -1.5 dBTP, copy the picture, re-measure to prove it.

  python loud.py in.mp4 out.mp4
"""
import json
import re
import subprocess
import sys

src, dst = sys.argv[1], sys.argv[2]
FF = "ffmpeg"


def run(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def measure(path):
    p = run([FF, "-hide_banner", "-nostats", "-i", path, "-vn", "-af",
             "loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json", "-f", "null", "-"])
    m = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", p.stderr, re.S)
    return json.loads(m.group(0))


j = measure(src)
print("before: I=%s LUFS  TP=%s dBTP  LRA=%s LU" % (j["input_i"], j["input_tp"], j["input_lra"]))
af = ("loudnorm=I=-14:TP=-1.5:LRA=9:measured_I=%s:measured_LRA=%s:measured_TP=%s:measured_thresh=%s:offset=%s:linear=true"
      % (j["input_i"], j["input_lra"], j["input_tp"], j["input_thresh"], j["target_offset"]))
p = run([FF, "-y", "-hide_banner", "-nostats", "-i", src, "-map", "0:v", "-map", "0:a", "-c:v", "copy", "-af", af,
         "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", dst])
if p.returncode != 0:
    sys.exit(p.stderr[-800:])
k = measure(dst)
print("after:  I=%s LUFS  TP=%s dBTP  LRA=%s LU" % (k["input_i"], k["input_tp"], k["input_lra"]))
ok = abs(float(k["input_i"]) + 14) <= 0.8 and float(k["input_tp"]) <= -1.0
print("PASS" if ok else "CHECK: outside -14 +-0.8 LUFS or true peak above -1.0")
