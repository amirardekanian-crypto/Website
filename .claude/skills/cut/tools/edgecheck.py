"""Composite frames of the full cut-out over flat backdrops and tile them, to judge edge quality (hair, ears, shoulders)."""
import os
import subprocess
import sys

from PIL import Image

FF = r"C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
CUT = sys.argv[1]
OUT = sys.argv[2]
TIMES = [float(x) for x in sys.argv[3].split(",")]
BGS = sys.argv[4].split(",") if len(sys.argv) > 4 else ["0xC7552F", "0x16161A"]
os.makedirs(OUT, exist_ok=True)
tiles = []
for bg in BGS:
    row = []
    for t in TIMES:
        p = os.path.join(OUT, "f_%s_%s.png" % (bg, t))
        vf = "color=c=%s:s=1080x1920:d=1[bg];[0:v]format=yuva420p[fg];[bg][fg]overlay=shortest=1,format=rgb24" % bg
        r = subprocess.run([FF, "-y", "-hide_banner", "-loglevel", "error", "-c:v", "libvpx-vp9", "-ss", str(t), "-i", CUT,
                            "-filter_complex", vf, "-frames:v", "1", p], capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stderr[-400:])
        row.append(Image.open(p).convert("RGB"))
    tiles.append(row)
W, H = 360, 640
sheet = Image.new("RGB", (W * len(TIMES), H * len(BGS)))
for j, row in enumerate(tiles):
    for i, im in enumerate(row):
        sheet.paste(im.resize((W, H), Image.LANCZOS), (i * W, j * H))
sheet.save(os.path.join(OUT, "edge_sheet.png"))
print("wrote", os.path.join(OUT, "edge_sheet.png"))
