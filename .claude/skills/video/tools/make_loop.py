"""Turn a generated half-rep clip into a seamless full-rep loop, cut at the exact turnaround frames.

    python .claude/skills/video/tools/make_loop.py <clip.mp4> [--out loop.mp4] [--speed 1.0] [--crf 27]
                                                   [--far N] [--near N] [--hold N] [--strip strip.png]

Why (Amir, 2026-10-04): a model's clip rarely stops exactly at the end of the movement. It often goes past the end and
comes back a little, so a plain forward-then-reversed loop shows "full concentric, 1/4 eccentric, 1/4 concentric,
full eccentric": a tick at the turnaround. This finds the real turnaround instead of trusting the clip's last frame.

How: every frame is compared with every other (a small, blurred grey copy; the camera is locked, so only the
athlete and the equipment change), and the frames are linked into a path: each to the next one in time, and each
to the few frames that look most like it. The distance travelled from the first frame ALONG that path is the
position in the movement. It keeps growing on a big movement (a plain "how different from the first frame" stops
growing once the body has fully moved, and cut a single-leg RDL a third short), and it falls again when the
athlete comes back, because a returning frame links straight to its twin on the way out. The far end is the
furthest frame; the near end is the frame furthest from the far end, which also trims a wind-up at the start.
(A "late frame matches an early one" test was tried second and missed slow returns after a hold.)

The loop plays near..far, then far-1..near+1 backwards, so no frame repeats at either seam. --far / --near set the
frames by hand, --hold repeats the far frame (a held squeeze), --speed > 1 shortens it (a 3 s Kling half rep at
1.5 matches a 2 s Wan one), --width scales it (854 = the 480p the app serves; Kling comes back 1280 wide),
--strip saves the frames around both ends for checking by eye. Silent H.264, faststart.
Needs ffmpeg (through imageio_ffmpeg as for clip_check.py), Pillow and numpy.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys

import numpy as np

sys.stdout.reconfigure(encoding="utf-8")


def ffmpeg_exe():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    found = shutil.which("ffmpeg")
    if found:
        return found
    import imageio_ffmpeg
    return imageio_ffmpeg.get_ffmpeg_exe()


FF = ffmpeg_exe()
ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("clip")
ap.add_argument("--out")
ap.add_argument("--speed", type=float, default=1.0)
ap.add_argument("--crf", type=int, default=27)
ap.add_argument("--far", type=int)
ap.add_argument("--near", type=int)
ap.add_argument("--hold", type=int, default=0)
ap.add_argument("--strip")
ap.add_argument("--width", type=int, help="scale the loop to this width (854 = the 480p the app serves)")
a = ap.parse_args()
out = a.out or os.path.splitext(a.clip)[0] + "-loop.mp4"

info = subprocess.run([FF, "-hide_banner", "-i", a.clip], capture_output=True, text=True, errors="replace").stderr
m = re.search(r"Video:.*?(\d{2,5})x(\d{2,5})[^,]*,.*?([\d.]+) fps", info)
VW, VH, fps = int(m[1]), int(m[2]), float(m[3])

W, H = 214, 120
raw = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", a.clip,
                      "-vf", f"scale={W}:{H},gblur=sigma=1.2,format=gray", "-f", "rawvideo", "-"],
                     capture_output=True, check=True).stdout
g = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
n = len(g)
flat = g.reshape(n, -1)
M = np.stack([np.abs(flat - flat[i]).mean(axis=1) for i in range(n)])

# The path: each frame to its neighbours in time, and to the 4 frames that look most like it.
G = np.full((n, n), np.inf)
np.fill_diagonal(G, 0)
for i in range(n):
    for j in (i - 1, i + 1):
        if 0 <= j < n:
            G[i, j] = M[i, j]
    for j in np.argsort(M[i])[1:5]:
        G[i, j] = G[j, i] = M[i, j]
for m_ in range(n):                     # shortest paths (Floyd-Warshall; n is under 200)
    G = np.minimum(G, G[:, m_:m_ + 1] + G[m_:m_ + 1, :])

# A clip pinned to a finish picture often drifts away from it and then SNAPS onto it in the last frames (the
# 2026-10-04 pulldown: hips jumped back and the cable tower moved in frames 58-59). A step in the last fifth of the
# clip more than 2.5 times bigger than any of the five before it is a snap: the usable clip ends before it.
speed = np.array([M[t, t + 1] for t in range(n - 1)])
end = n - 1
for t in range(int(n * 0.8), n - 1):
    if speed[t] > 2.5 * speed[max(0, t - 5):t].max():
        end = t
        print(f"  snap at frame {t} -> {t + 1}: the clip is cut to frames 0-{t}")
        break
along = G[0][:end + 1]
k = a.far if a.far is not None else int(np.argmax(along))
s = a.near if a.near is not None else int(np.argmax(G[k, :k + 1]))

marks = " .:-=+*#%@"


def spark(x):
    top = max(x) or 1
    return "".join(marks[min(9, int(v / top * 9.999))] for v in x)


print(f"{a.clip}: {n} frames, {fps:g} fps, {VW}x{VH}")
print(f"  motion per frame        : |{spark([M[t, t + 1] for t in range(n - 1)])}|")
print(f"  position along the path : |{spark(list(along))}|")
print(f"  near end = frame {s} ({s / fps:.2f} s), far end = frame {k} ({k / fps:.2f} s); "
      f"dropped {s} frame(s) at the start and {n - 1 - k} at the end")

if a.strip:
    from PIL import Image, ImageDraw
    idx = [f for f in sorted({max(0, s - 2), s, min(n - 1, s + 2), max(0, k - 4), max(0, k - 2), k,
                              min(n - 1, k + 2), min(n - 1, k + 4), n - 1})]
    full = subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-i", a.clip, "-vf", "scale=427:-2",
                           "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    th = len(full) // n // (427 * 3)
    frames = np.frombuffer(full, np.uint8).reshape(n, th, 427, 3)
    sheet = Image.new("RGB", (427 * len(idx), th + 22), (250, 247, 242))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(idx):
        sheet.paste(Image.fromarray(frames[f]), (427 * i, 22))
        tag = "NEAR" if f == s else "FAR" if f == k else ""
        d.text((427 * i + 6, 4), f"frame {f} {tag}", fill=(14, 74, 54) if tag else (90, 90, 90))
    sheet.save(a.strip)
    print(f"  strip: {a.strip}")

fc = (f"[0:v]trim=start_frame={s}:end_frame={k + 1},setpts=PTS-STARTPTS,split=3[f][b][e];"
      f"[b]reverse,trim=start_frame=1:end_frame={k - s},setpts=PTS-STARTPTS[r];")
if a.hold:
    fc += (f"[e]trim=start_frame={k - s}:end_frame={k - s + 1},setpts=PTS-STARTPTS,"
           f"loop=loop={a.hold - 1}:size=1:start=0,setpts=N/FRAME_RATE/TB[h];[f][h][r]concat=n=3:v=1:a=0")
else:
    fc += "[e]nullsink;[f][r]concat=n=2:v=1:a=0"
fc += f",setpts=PTS/{a.speed}" + (f",scale={a.width}:-2" if a.width else "") + ",format=yuv420p[out]"
subprocess.run([FF, "-hide_banner", "-loglevel", "error", "-y", "-i", a.clip, "-filter_complex", fc,
                "-map", "[out]", "-an", "-c:v", "libx264", "-crf", str(a.crf), "-preset", "slow",
                "-movflags", "+faststart", out], check=True)
frames_out = (k - s + 1) + a.hold + (k - s - 1)
print(f"  loop: {frames_out} frames, {frames_out / fps / a.speed:.2f} s, {os.path.getsize(out) // 1024} KB -> {out}")
