r"""Grade and export the course app's pictures (assets/tps/), so every one wears the same look.

The pictures come from two tools (GPT Image 2 and Higgsfield) over many sessions. Prompts alone drift
off the colour: the first "First Light" came back neutral grey-blue with no clay in it. So the look is
applied here, once, to every master: shadows lean deep green, highlights lean warm cream, saturation a
touch muted. The prompts then only have to describe the scene. Tested 2026-09-19 on the first four:
only First Light visibly moved, the other three were already close, which is what a shared grade
should do.

    python scripts/grade_tps_art.py first-light=C:/path/master.png rally-map=C:/path/other.png
    python scripts/grade_tps_art.py --list        # what is in assets/tps/, and its weight

Each slug=path writes assets/tps/<slug>.webp: 1080 px wide, 16:9 (centre-cropped when the master is
another ratio), WebP quality 72, about 40 KB. Masters are only read, never moved or copied into the repo.

After regrading a file, raise ART_V in tennis/app/app.js (the site's root worker keeps /assets/ files
cache-first, by full URL) and run scripts/stamp_tps_app.py.

Every picture is made with its subject on the LEFT and the right and bottom left calm, because the app
is right-to-left and its titles sit there. Nothing in this script enforces that; the prompts do.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'tps'
WIDTH, QUALITY = 1080, 72

# The shared look, in 0-1 units: a green-teal lift in the shadows, a cream warm-up in the highlights.
SHADOW = np.array([0.018, 0.052, 0.040], np.float32)
HILITE = np.array([0.045, 0.030, -0.032], np.float32)
SAT = 0.92

# Per-picture dials, only for a picture that sits outside the family. gain below 1 darkens.
TWEAKS = {
    'rally-map': {'sat': 0.80, 'gain': 0.90},   # the clay top-down: brighter and louder than the moody rest
}


def lum(a):
    return (0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2])[..., None]


def grade(im, sat=SAT, gain=1.0):
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255.0 * gain
    L = lum(a)
    a = a + ((1.0 - L) ** 2.2) * SHADOW + (L ** 2.0) * HILITE
    L2 = lum(a)
    a = L2 + (a - L2) * sat
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def fit_16x9(im):
    w, h = im.size
    if abs(w / h - 16 / 9) > 0.01:
        nh = round(w * 9 / 16)
        if nh <= h:                       # too tall: trim top and bottom evenly
            top = (h - nh) // 2
            im = im.crop((0, top, w, top + nh))
        else:                             # too wide: trim the sides evenly
            nw = round(h * 16 / 9)
            left = (w - nw) // 2
            im = im.crop((left, 0, left + nw, h))
    return im.resize((WIDTH, round(WIDTH * 9 / 16)), Image.LANCZOS)


def export(slug, src):
    t = TWEAKS.get(slug, {})
    out = fit_16x9(grade(Image.open(src), sat=t.get('sat', SAT), gain=t.get('gain', 1.0)))
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / (slug + '.webp')
    out.save(dest, 'WEBP', quality=QUALITY, method=6)
    print('%-16s %dx%d  %d KB' % (slug, out.size[0], out.size[1], dest.stat().st_size // 1024))


def main(argv):
    if not argv or argv[0] in ('-h', '--help'):
        print(__doc__)
        return 0
    if argv[0] == '--list':
        files = sorted(OUT.glob('*.webp'))
        for f in files:
            print('%-22s %4d KB' % (f.name, f.stat().st_size // 1024))
        print('%d pictures, %d KB' % (len(files), sum(f.stat().st_size for f in files) // 1024))
        return 0
    for arg in argv:
        slug, sep, src = arg.partition('=')
        if not sep or not Path(src).is_file():
            print('Expected slug=path to a master image, got: ' + arg)
            return 1
        export(slug, src)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
