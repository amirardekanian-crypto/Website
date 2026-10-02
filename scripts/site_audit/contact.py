"""Tile contact sheet: python contact.py <dir with tile-*.png> <out.png> [cols] [thumb_width] [first] [last]"""
import sys, glob, os
from PIL import Image, ImageDraw

d, out = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 8
tw = int(sys.argv[4]) if len(sys.argv) > 4 else 190
first = int(sys.argv[5]) if len(sys.argv) > 5 else 0
last = int(sys.argv[6]) if len(sys.argv) > 6 else 10**6
files = sorted(glob.glob(os.path.join(d, 'tile-*.png')))
files = [f for i, f in enumerate(files) if first <= i <= last]
thumbs = []
for f in files:
    im = Image.open(f).convert('RGB')
    h = int(im.height * tw / im.width)
    thumbs.append((os.path.basename(f)[5:7], im.resize((tw, h), Image.LANCZOS)))
rows = [thumbs[i:i + cols] for i in range(0, len(thumbs), cols)]
gap, lab = 6, 16
rh = [max(t[1].height for t in r) + lab for r in rows]
sheet = Image.new('RGB', (cols * (tw + gap) + gap, sum(rh) + gap * (len(rows) + 1)), (40, 40, 40))
dr = ImageDraw.Draw(sheet)
y = gap
for r, h in zip(rows, rh):
    x = gap
    for name, th in r:
        dr.text((x + 2, y), name, fill=(255, 255, 255))
        sheet.paste(th, (x, y + lab))
        x += tw + gap
    y += h + gap
sheet.save(out)
print(out, sheet.size)
