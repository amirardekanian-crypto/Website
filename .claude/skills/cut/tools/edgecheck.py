"""Composite frames of the full cut-out over flat backdrops and tile them, to judge edge quality (hair, ears, shoulders, the lower torso).

  python edgecheck.py <full_cut_t.webm> <out dir> <t1,t2,...> [backdrops] [--crop x0,y0,x1,y1] [--scale 0.3333]

Rows = backdrops (default clay 0xC7552F and dark 0x16161A: judge on BOTH, a pale rim only shows on the dark one and a hole in the body only on the clay one),
columns = times. Times are seconds into the cut-out file = source seconds. With --crop (card pixels) you see that region at --scale (1.0 = 1:1: use it on the hair,
an ear, the lower torso). Writes <out dir>/edge_sheet.png.

2026-10-02: the frame is decoded to RGBA and composited here. The old version overlaid it on an ffmpeg `color` source, and when the time asked for fell between
two frames (e.g. 48.57 s) the first frame came out as plain backdrop, which looks like an empty cut-out. Times that are whole frames (n/30) never showed it.
"""
import os
import subprocess
import sys

import numpy as np
from PIL import Image

FF = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
W0, H0 = 1080, 1920
args = sys.argv[1:]
crop, scale = None, 1.0 / 3.0
for flag in ("--crop", "--scale"):
    if flag in args:
        i = args.index(flag)
        val = args[i + 1]
        del args[i:i + 2]
        if flag == "--crop":
            crop = [int(v) for v in val.split(",")]
        else:
            scale = float(val)
CUT, OUT = args[0], args[1]
TIMES = [float(x) for x in args[2].split(",")]
BGS = args[3].split(",") if len(args) > 3 else ["0xC7552F", "0x16161A"]
os.makedirs(OUT, exist_ok=True)


def frame_rgba(t):
    r = subprocess.run([FF, "-v", "error", "-c:v", "libvpx-vp9", "-ss", "%.3f" % t, "-i", CUT, "-frames:v", "1", "-vf", "format=rgba", "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
                       capture_output=True)
    if len(r.stdout) != W0 * H0 * 4:
        sys.exit("could not read a 1080x1920 frame at %.2f s: %s" % (t, r.stderr[-300:].decode("utf-8", "replace")))
    return np.frombuffer(r.stdout, dtype=np.uint8).reshape(H0, W0, 4).astype(np.float32)


frames = {t: frame_rgba(t) for t in TIMES}
tiles = []
for bg in BGS:
    col = np.array([(int(bg, 16) >> s) & 255 for s in (16, 8, 0)], dtype=np.float32)
    row = []
    for t in TIMES:
        a = frames[t]
        al = a[..., 3:4] / 255.0
        im = Image.fromarray((a[..., :3] * al + col * (1 - al)).astype(np.uint8))
        if crop:
            im = im.crop(crop)
        row.append(im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS))
    tiles.append(row)
W, H = tiles[0][0].size
sheet = Image.new("RGB", (W * len(TIMES), H * len(BGS)))
for j, row in enumerate(tiles):
    for i, im in enumerate(row):
        sheet.paste(im, (i * W, j * H))
sheet.save(os.path.join(OUT, "edge_sheet.png"))
print("wrote", os.path.join(OUT, "edge_sheet.png"), sheet.size)
