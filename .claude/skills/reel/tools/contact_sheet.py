"""Tile images into one labelled sheet, so a whole reel can be looked at in one go.

    python contact_sheet.py <out.png> [--cols 6] [--w 270] [--h 480] [--crop x0,y0,x1,y1] <image> <image> ...

Labels are the file names. --crop cuts every image first (e.g. 0,900,1080,1920 = the lower half, to inspect a bounce).
Use it for the overview, then open single frames at full size: overlaps and clipped text only show there.
"""
import sys

from PIL import Image, ImageDraw

args = sys.argv[1:]
out = args.pop(0)


def take(name, default):
    if name in args:
        i = args.index(name)
        v = args[i + 1]
        del args[i:i + 2]
        return v
    return default


cols, W, H = int(take("--cols", 6)), int(take("--w", 270)), int(take("--h", 480))
crop = take("--crop", None)
files = args
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * (W + 8) + 8, rows * (H + 26) + 8), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, f in enumerate(files):
    im = Image.open(f).convert("RGB")
    if crop:
        im = im.crop(tuple(int(v) for v in crop.split(",")))
    im.thumbnail((W, H))
    x, y = 8 + (i % cols) * (W + 8), 8 + (i // cols) * (H + 26)
    sheet.paste(im, (x, y + 18))
    d.text((x, y + 2), f.replace("\\", "/").split("/")[-1][:36], fill=(240, 236, 227))
sheet.save(out)
print(out, sheet.size, len(files), "images")
