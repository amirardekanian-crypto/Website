#!/usr/bin/env python3
"""contact.py — tile frames into one labelled contact sheet for review.

  python3 tools/contact.py OUT.png DIR [--cols 3] [--w 640] [--glob 'at_*.png']

Each tile is labelled with its file name (the time for at_*.png stills, the frame number for f_*.png).
"""
import sys, glob, os, argparse
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument("out"); ap.add_argument("dir")
ap.add_argument("--cols", type=int, default=3); ap.add_argument("--w", type=int, default=640)
ap.add_argument("--glob", default="at_*.png")
ap.add_argument("--first", type=int, default=0); ap.add_argument("--count", type=int, default=0); ap.add_argument("--step", type=int, default=1)
a = ap.parse_args()

files = sorted(glob.glob(os.path.join(a.dir, a.glob)), key=lambda p: (len(os.path.basename(p)), p))
files = files[a.first::a.step]
if a.count: files = files[:a.count]
if not files: sys.exit("no frames match")
w = a.w; h = round(w * 9 / 16); rows = -(-len(files) // a.cols); gap = 6
sheet = Image.new("RGB", (a.cols * w + (a.cols + 1) * gap, rows * h + (rows + 1) * gap), (24, 24, 28))
try: font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 15)
except Exception: font = ImageFont.load_default()
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB").resize((w, h), Image.LANCZOS)
    x = gap + (i % a.cols) * (w + gap); y = gap + (i // a.cols) * (h + gap)
    sheet.paste(im, (x, y))
    label = os.path.basename(f).replace("at_", "t=").replace("f_", "frame ").replace(".png", "")
    d.rectangle([x, y, x + 9 * len(label) + 12, y + 22], fill=(0, 0, 0))
    d.text((x + 6, y + 3), label, fill=(255, 255, 255), font=font)
sheet.save(a.out)
print(a.out, sheet.size)
