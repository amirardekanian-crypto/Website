"""Whole-clip cut-out of the speaker, for the depth family (K.behind, K.stack, K.outline, K.drift, K.halo, K.backdrop, K.focus ...).

  python cutout.py <input.mp4> <out dir> [--seconds N] [--engine rvm|u2net]

Run it DETACHED (Start-Process on Windows): longer than one tool call may run. Poll <out dir>/cutout.log (or the log you redirect to).

Two engines, the same files at the end:
  rvm    (the default since 2026-10-02) RobustVideoMatting through onnxruntime, in tools/rvm_cutout.py: about 3 s of work per source second (85 s of footage =
         about 4 min), a steadier edge, and it keeps the shirt where u2net let the lower hem fade out. It needs onnxruntime and the model file
         C:\\Users\\Amir\\tools\\rvm\\rvm_mobilenetv3_fp32.onnx; without them this script says so and falls back to u2net.
  u2net  the old route: `hyperframes remove-background --quality best` (u2net_human_seg, about 7 s per source second = 12 min for 85 s), then the alpha trim below.
         Use it only when RVM is unavailable or for a clip RVM gets wrong.

Steps
  1. full_src.mp4     a clean 1080x1920 copy, CRF 12 (the model reads this; the stage file at 1440x2560 is not needed for a mask)
  2. rvm:   full_cut_t.webm  made in ONE pass: the model writes the alpha, ffmpeg erodes it twice (about 2 px), feathers it, merges it with the clip's own
                     pixels and encodes VP9 once
     u2net: full_cut.webm  then 3. full_cut_t.webm  the same trim as a second pass
  Without the trim a thin light rim of the wall shows around hair and shoulders on DARK backdrops (seen at 1:1 on both engines); on clay it is hardly visible.
  USE full_cut_t.webm.
Time zero of the cut-out is time zero of the input, so a footage segment that starts at source second S uses media_start = S
(kit.behind_video("full_cut_t.webm", S, id="cutN")). Hyperframes extracts an alpha video as PNG frames, so give the cut-out only
to the segments that need it (split the footage so a depth moment is its own segment).
Known limit: where the cut-out meets the table at the bottom of his frame the mask ends on a slanted line (his desk edge). The
backdrop block hides it with a fade in front of him; nothing else shows it.
"""
import argparse
import os
import shutil
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
RVM_MODEL = r"C:\Users\Amir\tools\rvm\rvm_mobilenetv3_fp32.onnx"

p = argparse.ArgumentParser()
p.add_argument("src")
p.add_argument("out")
p.add_argument("--seconds", type=float, default=0, help="only the first N seconds (a smoke test)")
p.add_argument("--engine", choices=["rvm", "u2net"], default="rvm")
a = p.parse_args()
os.makedirs(a.out, exist_ok=True)
FF = shutil.which("ffmpeg") or "ffmpeg"
HF = shutil.which("hyperframes") or "hyperframes"
T = ["-t", str(a.seconds)] if a.seconds else []


def run(args, cwd=None):
    t = time.time()
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        sys.exit("FAILED (%s):\n%s" % (" ".join(args[:3]), (r.stderr or r.stdout)[-1500:]))
    print("  %.0f s" % (time.time() - t), flush=True)


engine = a.engine
if engine == "rvm":
    try:
        import onnxruntime  # noqa: F401
        ok = os.path.exists(RVM_MODEL)
        why = "the model file %s is missing" % RVM_MODEL
    except ImportError:
        ok, why = False, "onnxruntime is not installed (pip install onnxruntime)"
    if not ok:
        print("RVM is not available: %s. Falling back to u2net (about 7 s per source second)." % why, flush=True)
        engine = "u2net"

src = os.path.join(a.out, "full_src.mp4")
cut = os.path.join(a.out, "full_cut.webm")
trim = os.path.join(a.out, "full_cut_t.webm")
steps = 2 if engine == "rvm" else 3

print("1/%d clean 1080x1920 copy" % steps, flush=True)
run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", a.src] + T + [
    "-vf", "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-an", src])

if engine == "rvm":
    print("2/2 RVM cut-out, trimmed and encoded in one pass (about 3 s per source second)", flush=True)
    r = subprocess.run([sys.executable, os.path.join(HERE, "rvm_cutout.py"), src, a.out, "--trim", "2"])
    if r.returncode:
        sys.exit("FAILED: rvm_cutout.py exited %d" % r.returncode)
    print("done:", trim, flush=True)
    sys.exit(0)

print("2/3 remove background (about 7 s per source second)", flush=True)
run([HF, "remove-background", "full_src.mp4", "-o", "full_cut.webm", "--quality", "best"], cwd=a.out)

print("3/3 alpha trim", flush=True)
vf = ("format=yuva420p,split[a][b];[a]alphaextract,erosion,erosion,gblur=sigma=1.0[m];"
      "[b]format=yuv420p[c];[c][m]alphamerge")
run([FF, "-y", "-hide_banner", "-loglevel", "error", "-c:v", "libvpx-vp9", "-i", cut, "-vf", vf, "-c:v", "libvpx-vp9",
     "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "16", "-row-mt", "1", "-cpu-used", "3", "-auto-alt-ref", "0",
     "-metadata:s:v:0", "alpha_mode=1", trim])
print("done:", trim, flush=True)
