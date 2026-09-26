"""Stage 2: label every muscle shape in the two symmetric figures and draw numbered overlays.

Only shapes on the viewer's LEFT half (and the ones on the axis) get a readable number; each
right-half shape is paired with its mirror twin, so assigning the left one assigns both.
"""
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi

AX = json.load(open('bm_axis.json'))
PICK = {'front': 'L', 'back': 'R'}
try:
    FONT = ImageFont.truetype('arialbd.ttf', 22)
except OSError:
    FONT = ImageFont.load_default()

meta = {}
for name in ('front', 'back'):
    L = np.asarray(Image.open(f'sym_{name}_{PICK[name]}.png')).astype(np.float32)
    a = AX[name]['axis']
    bx0, by0, bx1, by1 = AX[name]['bbox']
    bright = ndi.binary_dilation(L >= 190, iterations=3)
    mus = (L > 100) & (L < 190) & ~bright
    lab, n = ndi.label(mus, structure=[[0, 1, 0], [1, 1, 1], [0, 1, 0]])
    areas = ndi.sum(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    cents = ndi.center_of_mass(np.ones_like(lab), lab, index=np.arange(1, n + 1))
    regs = []
    for i in range(n):
        if areas[i] < 120:
            continue
        cy, cx = cents[i]
        regs.append({'id': i + 1, 'area': int(areas[i]), 'cx': float(cx), 'cy': float(cy)})
    # pair twins
    for r in regs:
        r['side'] = 'C' if abs(r['cx'] - a) < 6 else ('L' if r['cx'] < a else 'R')
    lefts = [r for r in regs if r['side'] == 'L']
    for r in regs:
        if r['side'] != 'R':
            continue
        mx = 2 * a - r['cx']
        best = min(lefts, key=lambda q: (q['cx'] - mx) ** 2 + (q['cy'] - r['cy']) ** 2)
        d = ((best['cx'] - mx) ** 2 + (best['cy'] - r['cy']) ** 2) ** .5
        r['twin'] = best['id'] if d < 6 else None
    unpaired = [r['id'] for r in regs if r['side'] == 'R' and not r.get('twin')]
    print(name, 'regions', len(regs), 'left', len(lefts), 'centre', sum(r['side'] == 'C' for r in regs),
          'right', sum(r['side'] == 'R' for r in regs), 'unpaired right', unpaired)
    np.save(f'lab_{name}.npy', lab)
    meta[name] = {'axis': a, 'regions': regs}
    # overlay: random colour per region, numbers on the left and centre ones
    rng = np.random.default_rng(7)
    pal = rng.integers(60, 235, size=(n + 1, 3)).astype(np.uint8)
    pal[0] = (15, 15, 15)
    rgb = pal[lab]
    rgb[L >= 190] = (255, 255, 255)
    im = Image.fromarray(rgb).crop((bx0 - 10, by0 - 10, bx1 + 10, by1 + 10))
    im = im.resize((im.width * 2 // 2, im.height * 2 // 2))
    d = ImageDraw.Draw(im)
    for r in regs:
        if r['side'] == 'R':
            continue
        x, y = r['cx'] - (bx0 - 10), r['cy'] - (by0 - 10)
        t = str(r['id'])
        d.text((x - 12, y - 11), t, fill=(0, 0, 0), font=FONT, stroke_width=3, stroke_fill=(255, 255, 255))
    im.save(f'overlay_{name}.png')
    print(' overlay', im.size)
json.dump(meta, open('bm_regions.json', 'w'), indent=0)
