"""Whole-clip cut-out of the speaker, for the depth family (K.behind, K.stack, K.outline, K.drift, K.halo, K.backdrop, K.focus ...).

  python cutout.py <input.mp4> <out dir> [--seconds N]

Run it DETACHED (Start-Process on Windows): it takes about 7 s per source second on this PC's CPU (85 s of footage = about 12 min), longer
than one tool call may run. Poll <out dir>/cutout.log.

Steps
  1. full_src.mp4   a clean 1080x1920 copy, CRF 12 (the model reads this; the stage file at 1440x2560 is not needed for a mask)
  2. full_cut.webm  hyperframes remove-background --quality best (u2net_human_seg, cached model, ~4 fps; VP9 with an alpha channel)
  3. full_cut_t.webm  the alpha TRIM: two passes of erosion (about 2 px) and a light feather. Without it a thin light rim of the wall
                    shows around hair and shoulders on DARK backdrops; on clay it is hardly visible. USE THIS ONE.
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

p = argparse.ArgumentParser()
p.add_argument("src")
p.add_argument("out")
p.add_argument("--seconds", type=float, default=0, help="only the first N seconds (a smoke test)")
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


src = os.path.join(a.out, "full_src.mp4")
cut = os.path.join(a.out, "full_cut.webm")
trim = os.path.join(a.out, "full_cut_t.webm")

print("1/3 clean 1080x1920 copy", flush=True)
run([FF, "-y", "-hide_banner", "-loglevel", "error", "-i", a.src] + T + [
    "-vf", "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-an", src])

print("2/3 remove background (about 7 s per source second)", flush=True)
run([HF, "remove-background", "full_src.mp4", "-o", "full_cut.webm", "--quality", "best"], cwd=a.out)

print("3/3 alpha trim", flush=True)
vf = ("format=yuva420p,split[a][b];[a]alphaextract,erosion,erosion,gblur=sigma=1.0[m];"
      "[b]format=yuv420p[c];[c][m]alphamerge")
run([FF, "-y", "-hide_banner", "-loglevel", "error", "-c:v", "libvpx-vp9", "-i", cut, "-vf", vf, "-c:v", "libvpx-vp9",
     "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "16", "-row-mt", "1", "-cpu-used", "3", "-auto-alt-ref", "0",
     "-metadata:s:v:0", "alpha_mode=1", trim])
print("done:", trim, flush=True)
