"""Pull frames out of a finished mp4 at given seconds and tile them (5 across) with labels: the check that the RENDER matches the snapshots."""
import os
import subprocess
import sys

from PIL import Image, ImageDraw

FF = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
src, out = sys.argv[1], sys.argv[2]
times = [float(x) for x in sys.argv[3].split(",")]
W, H, PER = 324, 576, 5
tmp = os.path.join(os.path.dirname(out), "_fs")
os.makedirs(tmp, exist_ok=True)
tiles = []
for t in times:
    p = os.path.join(tmp, "f_%s.png" % t)
    subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", "-ss", str(t), "-i", src, "-frames:v", "1", p], check=True)
    tiles.append((t, Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS)))
rows = (len(tiles) + PER - 1) // PER
sheet = Image.new("RGB", (W * PER, H * rows), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, (t, im) in enumerate(tiles):
    x, y = (i % PER) * W, (i // PER) * H
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + 62, y + 14], fill=(0, 0, 0))
    d.text((x + 3, y + 1), "t=%s" % t, fill=(255, 255, 255))
sheet.save(out)
print("wrote", out)
