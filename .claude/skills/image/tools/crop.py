#!/usr/bin/env python3
r"""See what a lesson or test card will actually show of a picture.

WHY THIS EXISTS
---------------
The course app shows a cover on its list cards at about 2.9:1 (338 x 118 on a 375 px
phone, measured 2026-09-20; test cards 341 x 118), but every picture is made 16:9. The
card uses `object-fit: cover`, so only the middle ~62% of the height survives and
`object-position` (the `pos` in the ART table in tennis/app/app.js) picks WHICH 62%.
A tall subject gets its top or bottom sliced off: the bottle cap on `tennis-fitness` and
the ball on `the-split-second` were both clipped at the default 45-50% and needed 18% and
25%. The scrim gate cannot see that, and neither can a look at the 16:9 file.

    python crop.py tennis-fitness                 # at the pos already wired in app.js
    python crop.py tennis-fitness 10 18 30        # compare several vertical positions
    python crop.py new-candidate.png 30 45 60     # a file that is not in assets/tps yet
    python crop.py the-lane --ratio 2.2           # another card shape

Writes one labelled sheet and prints its path: open it with Read. The pos that keeps the
whole subject and leaves the right and bottom calm is the one to put in ART. If NO pos
keeps the subject whole, the subject is too tall for the card: regenerate with it sitting in the
middle band (see Step 2 of SKILL.md), do not fight the crop.
"""
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[4]
APP_JS = ROOT / "tennis" / "app" / "app.js"
CARD_RATIO = 338 / 118

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def wired_pos(slug):
    """The y position already set for this picture in ART, if any."""
    if not APP_JS.is_file():
        return None
    m = re.search("f: '" + re.escape(slug) + r"', pos: '(\d+)% (\d+)%'", APP_JS.read_text(encoding="utf-8"))
    return int(m.group(2)) if m else None


def crop(im, ratio, y_pct, width):
    """object-fit: cover at the given ratio, object-position 50% y_pct."""
    h = round(width / ratio)
    w0, h0 = im.size
    scale = max(width / w0, h / h0)
    nw, nh = round(w0 * scale), round(h0 * scale)
    im = im.resize((nw, nh), Image.LANCZOS)
    left = round((width - nw) * 0.5)
    top = round((h - nh) * y_pct / 100)
    out = Image.new("RGB", (width, h))
    out.paste(im, (left, top))
    return out


def main(argv):
    if not argv or argv[0] in ("-h", "--help"):
        print(__doc__)
        return 0
    ratio = CARD_RATIO
    if "--ratio" in argv:
        i = argv.index("--ratio")
        ratio = float(argv[i + 1])
        del argv[i:i + 2]
    target, positions = argv[0], [int(x) for x in argv[1:]]
    p = Path(target)
    if not p.is_file():
        p = ROOT / "assets" / "tps" / (target + ".webp")
    if not p.is_file():
        print("no such picture: %s" % target)
        return 1
    if not positions:
        positions = [wired_pos(p.stem) or 50]
        labels = ["wired in app.js" if wired_pos(p.stem) else "default"]
    else:
        labels = [""] * len(positions)
    im = Image.open(p).convert("RGB")
    W, PAD, LBL = 520, 8, 20
    H = round(W / ratio)
    cols = 2 if len(positions) > 1 else 1
    rows = (len(positions) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * (W + PAD) + PAD, rows * (H + LBL + PAD) + PAD), (18, 22, 19))
    d = ImageDraw.Draw(sheet)
    try:
        f = ImageFont.truetype("arialbd.ttf", 13)
    except Exception:
        f = ImageFont.load_default()
    for i, (y, lab) in enumerate(zip(positions, labels)):
        r, c = divmod(i, cols)
        x0, y0 = PAD + c * (W + PAD), PAD + r * (H + LBL + PAD)
        sheet.paste(crop(im, ratio, y, W), (x0, y0))
        d.text((x0 + 2, y0 + H + 3), "%s @ 50%% %d%%  %s  (ratio %.2f)" % (p.stem, y, lab, ratio),
               fill=(236, 231, 222), font=f)
    out = Path(tempfile.gettempdir()) / "aa-shelf"
    out.mkdir(parents=True, exist_ok=True)
    out = out / ("crop-%s.png" % p.stem)
    sheet.save(out)
    print("%s -> %s   (%dx%d)" % (p.stem, out, *sheet.size))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
