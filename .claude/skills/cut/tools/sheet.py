"""Tile the snapshot frames into labelled contact sheets (5 across, 2 rows per sheet)."""
import glob
import os
import re
import sys

from PIL import Image, ImageDraw

d = sys.argv[1]
files = sorted(glob.glob(os.path.join(d, "frame-*.png")))
W, H, PER, ROWS = 324, 576, 5, 2
for n in range(0, len(files), PER * ROWS):
    chunk = files[n:n + PER * ROWS]
    rows = (len(chunk) + PER - 1) // PER
    sheet = Image.new("RGB", (W * PER, H * rows), (20, 20, 20))
    dr = ImageDraw.Draw(sheet)
    for k, f in enumerate(chunk):
        im = Image.open(f).convert("RGB").resize((W, H), Image.LANCZOS)
        x, y = (k % PER) * W, (k // PER) * H
        sheet.paste(im, (x, y))
        t = re.search(r"at-([0-9.]+)s", f).group(1)
        dr.rectangle([x, y, x + 74, y + 16], fill=(0, 0, 0))
        dr.text((x + 4, y + 2), "t=" + t, fill=(255, 255, 255))
    out = os.path.join(os.path.dirname(os.path.dirname(d)), "sheet_%d.png" % (n // (PER * ROWS) + 1))
    sheet.save(out)
    print("wrote", out)
