"""Tile frames into one labelled contact sheet.
usage: python sheet.py <out.png> <cols> <thumb_width> <frame1> <frame2> ...
Labels come from the file names (t_0520.png -> 5.20 s).
"""
import sys, os, re
from PIL import Image, ImageDraw, ImageFont

out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
th = int(tw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
pad = 8
sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + pad + 22) + pad), (24, 24, 24))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('arial.ttf', 16)
except Exception:
    font = ImageFont.load_default()
for i, (f, im) in enumerate(zip(files, ims)):
    r, c = divmod(i, cols)
    x, y = pad + c * (tw + pad), pad + r * (th + pad + 22)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y + 22))
    m = re.search(r't_(\d+)', os.path.basename(f))
    label = f'{int(m.group(1)) / 100:.2f}s' if m else os.path.basename(f)
    d.text((x + 2, y + 2), label, fill=(240, 240, 240), font=font)
sheet.save(out)
print(os.path.basename(out), sheet.size)
