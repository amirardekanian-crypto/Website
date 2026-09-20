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

Two dials live in TWEAKS, per picture: "ratio" for the rare one that is not 16:9 (the sign-in hero is
taller), and "flip" to mirror it. program.html's art is composed with its subject on the RIGHT (English
text sits on the left), which is the opposite of this app, so a program.html still that fits a slot here
is flipped rather than regenerated. Only flip a still life: never one with text, a logo or a handed subject.

After regrading a file, raise ART_V in tennis/app/app.js (the site's root worker keeps /assets/ files
cache-first, by full URL) and run scripts/stamp_tps_app.py.

Every picture is made with its subject on the LEFT and the right and bottom left calm, because the app
is right-to-left and its titles sit there. Nothing in this script enforces that; the prompts do.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'tps'
WIDTH, QUALITY = 1080, 72

# The shared look, in 0-1 units: a green-teal lift in the shadows, a cream warm-up in the highlights.
SHADOW = np.array([0.018, 0.052, 0.040], np.float32)
HILITE = np.array([0.045, 0.030, -0.032], np.float32)
SAT = 0.92

# Per-picture dials, only for a picture that sits outside the family. gain below 1 darkens.
# Clay courts are genuinely more colourful than a dark gym, so these do not aim to match the indoor
# pictures — only to keep the four clay ones consistent with each other. Measured saturation across the
# set: indoor sits at 0.21-0.36, clay at 0.55-0.69, and these two were the top of that range.
FLIPPED = ('ice-and-clay', 'the-heavy-set', 'iron-pair', 'chalk-bowl', 'steam', 'five-signs', 'the-bag',
           'lights-out', 'from-the-chair')          # program.html stills, subject on the right
TWEAKS = {
    **{slug: {'flip': True} for slug in FLIPPED},
    'walk-on': {'ratio': (4, 3)},                   # the sign-in hero is nearly square on a phone
    'rally-map': {'sat': 0.72, 'gain': 0.88},   # the clay top-down, flat and full-frame: the loudest of all
    'last-ball': {'sat': 0.86, 'gain': 0.93},   # bright clay in low sun, right next to a white line
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


def fit_ratio(im, rw=16, rh=9):
    w, h = im.size
    if abs(w / h - rw / rh) > 0.01:
        nh = round(w * rh / rw)
        if nh <= h:                       # too tall: trim top and bottom evenly
            top = (h - nh) // 2
            im = im.crop((0, top, w, top + nh))
        else:                             # too wide: trim the sides evenly
            nw = round(h * rw / rh)
            left = (w - nw) // 2
            im = im.crop((left, 0, left + nw, h))
    return im.resize((WIDTH, round(WIDTH * rh / rw)), Image.LANCZOS)


def export(slug, src):
    t = TWEAKS.get(slug, {})
    im = Image.open(src)
    if t.get('flip'):
        im = ImageOps.mirror(im)
    out = fit_ratio(grade(im, sat=t.get('sat', SAT), gain=t.get('gain', 1.0)), *t.get('ratio', (16, 9)))
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
