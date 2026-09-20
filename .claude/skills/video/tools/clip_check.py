"""Look at a generated clip without watching it: its facts, a contact sheet, the audio level, where the motion stops, and (optionally) a trimmed copy.

    python .claude/skills/video/tools/clip_check.py <clip.mp4> [--out sheet.png] [--trim SECONDS [--to trimmed.mp4]]

Prints duration, size, fps, audio mean/peak (dB), the motion per half second, and a suggested cut: the end of the last half second that
still moves at least 40% as much as the busiest one. That is an outer bound and a hint, not a verdict: open the sheet and look.
The sheet (one frame per half second, labelled with its time) goes to the temp folder unless --out is given. --trim writes a copy cut
to that length with a quarter-second audio fade-out (H.264 crf 16, AAC), next to the clip unless --to is given.
Needs ffmpeg on PATH, in $FFMPEG, or through imageio_ffmpeg (see .claude/skills/reel/tools/README.md), plus Pillow and numpy.
"""
import argparse
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8")


def ffmpeg_exe():
    if os.environ.get("FFMPEG"):
        return os.environ["FFMPEG"]
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("no ffmpeg found: python -m pip install --user imageio-ffmpeg")


FF = ffmpeg_exe()


def run(*args):
    r = subprocess.run([FF, "-hide_banner", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stderr


ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("clip")
ap.add_argument("--out", help="contact sheet path (default: temp folder)")
ap.add_argument("--trim", type=float, help="write a copy cut to this many seconds")
ap.add_argument("--to", help="path for the trimmed copy (default: next to the clip)")
a = ap.parse_args()
clip = pathlib.Path(a.clip)
if not clip.exists():
    sys.exit(f"not found: {clip}")

info = run("-i", str(clip))
dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info)
seconds = int(dur[1]) * 3600 + int(dur[2]) * 60 + float(dur[3])
vid = re.search(r"Video:.*? (\d{2,5})x(\d{2,5})[^,]*,.*?([\d.]+) fps", info)
has_audio = "Audio:" in info
line = f"{clip.name}  {seconds:.2f} s  {vid[1]}x{vid[2]}  {vid[3]} fps  {clip.stat().st_size / 1e6:.1f} MB"
if has_audio:
    vol = run("-i", str(clip), "-vn", "-af", "volumedetect", "-f", "null", "-")
    mean, peak = re.search(r"mean_volume: (-?[\d.]+)", vol), re.search(r"max_volume: (-?[\d.]+)", vol)
    line += f"   audio: mean {mean[1]} dB, peak {peak[1]} dB"
else:
    line += "   no audio"
print(line)

with tempfile.TemporaryDirectory() as tmp:
    tmp = pathlib.Path(tmp)
    # motion: a quarter-second step, small grey frames, mean absolute change from one to the next
    run("-y", "-i", str(clip), "-an", "-vf", "fps=4,scale=180:-1", str(tmp / "m%03d.png"))
    grey = [np.asarray(Image.open(p).convert("L"), dtype=np.float32) for p in sorted(tmp.glob("m*.png"))]
    step = [0.0] + [float(np.abs(grey[i] - grey[i - 1]).mean()) for i in range(1, len(grey))]
    half = [sum(step[i:i + 2]) for i in range(0, len(step), 2)]
    top = max(half) or 1.0
    print("motion per half second (bar is relative to the busiest one)")
    for j, v in enumerate(half):
        print(f"  {j * 0.5:3.1f}-{j * 0.5 + 0.5:3.1f}  {'#' * round(20 * v / top):<20} {v:5.1f}")
    last = max((j for j, v in enumerate(half) if v >= 0.4 * top), default=0)
    print(f"suggested cut: {min(seconds, (last + 1) * 0.5):.1f} s  (the end of the last half second that still moves)")

    # the sheet: one frame per half second, labelled
    run("-y", "-i", str(clip), "-an", "-vf", "fps=2,scale=270:-1", str(tmp / "s%03d.png"))
    shots = sorted(tmp.glob("s*.png"))
    if shots:
        w, h = Image.open(shots[0]).size
        cols = min(len(shots), 6)
        rows = -(-len(shots) // cols)
        sheet = Image.new("RGB", (cols * w, rows * (h + 18)), (17, 17, 17))
        d = ImageDraw.Draw(sheet)
        for i, p in enumerate(shots):
            x, y = (i % cols) * w, (i // cols) * (h + 18)
            d.text((x + 6, y + 3), f"{i * 0.5:.1f} s", fill=(230, 230, 230))
            sheet.paste(Image.open(p).convert("RGB"), (x, y + 18))
        out = pathlib.Path(a.out) if a.out else pathlib.Path(tempfile.gettempdir()) / f"{clip.stem}-sheet.png"
        sheet.save(out)
        print("sheet:", out)

if a.trim:
    T = min(a.trim, seconds)
    to = pathlib.Path(a.to) if a.to else clip.with_name(f"{clip.stem}-{T:g}s.mp4")
    audio = ["-af", f"afade=t=out:st={max(T - 0.25, 0):.2f}:d=0.25", "-c:a", "aac", "-b:a", "128k"] if has_audio else ["-an"]
    run("-y", "-i", str(clip), "-t", f"{T:g}", *audio, "-c:v", "libx264", "-preset", "slow", "-crf", "16",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(to))
    print("trimmed:", to, f"({to.stat().st_size / 1e6:.1f} MB)")
