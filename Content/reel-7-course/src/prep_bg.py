"""Grade + upscale the two masters into the reel's full-bleed backgrounds, and measure the white baseline.

    python Content/reel-7-course/src/prep_bg.py

masters/day-one.webp and masters/week-sixteen.webp are lossless copies of the two Higgsfield PNGs (752x1344).
They become assets/bg-day.webp and assets/bg-night.webp (1080x1920) plus assets/baseline.json.

The look is grade() from scripts/grade_tps_art.py at saturation .84, so the pictures sit with the app art.
Then: LANCZOS up to 1080 wide, centre-crop to 1920 tall, a light unsharp mask, and fine grain (sigma 2.4) that hides
the 1.43x upscale. The baseline is the white court line, measured per column and fitted: y = m*x + b in 1080x1920
canvas coordinates. The reel's week ticks, arcs and ball are registered on that line, so if a master is ever swapped,
run this, read the printed line, and copy m and b into G (X0, X16, m, b, c) in src/reel7.template.html.
"""
import json
import pathlib
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
PROJ = HERE.parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from grade_tps_art import grade  # noqa: E402  the shared TPS look

MASTERS = {"day": PROJ / "masters" / "day-one.webp", "night": PROJ / "masters" / "week-sixteen.webp"}
OUT = PROJ / "assets"
OUT.mkdir(exist_ok=True)
rng = np.random.default_rng(7)


def prep(name, sat, gain):
    im = grade(Image.open(MASTERS[name]).convert("RGB"), sat=sat, gain=gain)
    w, h = im.size
    nh = round(h * 1080 / w)
    im = im.resize((1080, nh), Image.LANCZOS)
    top = (nh - 1920) // 2
    im = im.crop((0, top, 1080, top + 1920))
    im = im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=70, threshold=2))
    a = np.asarray(im).astype(np.float32)
    a = np.clip(a + rng.normal(0, 2.4, (1920, 1080, 1)).astype(np.float32), 0, 255).astype(np.uint8)
    Image.fromarray(a).save(OUT / f"bg-{name}.webp", "WEBP", quality=80, method=6)
    return im  # the clean (no grain) version, for measuring


def fit_line(im):
    a = np.asarray(im).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    white = (G > 105) & (B > 80) & ((R - B) < 120) & (R > 150)
    xs, ys = [], []
    for x in range(0, 1080, 10):
        col = np.where(white[1100:1750, x])[0]
        if len(col) > 4:
            xs.append(x)
            ys.append(1100 + col.mean())
    xs, ys = np.array(xs, float), np.array(ys, float)
    m, b = np.polyfit(xs, ys, 1)
    return m, b, float(np.abs(ys - (m * xs + b)).max())


day, night = prep("day", 0.84, 1.0), prep("night", 0.84, 1.0)
md, bd, rd = fit_line(day)
mn, bn, rn = fit_line(night)
print("day   y = %.4f x + %.1f   (max residual %.0f px)" % (md, bd, rd))
print("night y = %.4f x + %.1f   (max residual %.0f px)" % (mn, bn, rn))
json.dump({"day": [md, bd], "night": [mn, bn]}, open(OUT / "baseline.json", "w"))

# a proof picture: the fitted line as red dots over the day picture (the dots must sit on the white line)
prev = day.copy().convert("RGB")
d = ImageDraw.Draw(prev)
for x in range(0, 1081, 30):
    y = md * x + bd
    d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 40, 40))
prev.resize((540, 960)).save(OUT / "baseline-check.png")
print("wrote", OUT / "bg-day.webp", OUT / "bg-night.webp", OUT / "baseline-check.png")
