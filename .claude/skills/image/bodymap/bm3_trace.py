"""Stage 3: trace every labelled muscle shape and the pale line art into SVG paths.

Output: bodymap.svg (standalone) and bodymap.json ({viewBox, groups: {view: {group: d}}, line: {view: d}}).
Group ids are the Spine's muscle-credit ids (check_program.py MUSCLES) plus three extras used only by
the body-part fallback: 'lowback' (lit with core), 'ankle' and the knee/ankle rings.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage import measure

AX = json.load(open('bm_axis.json'))
META = json.load(open('bm_regions.json'))
PICK = {'front': 'L', 'back': 'R'}

GROUP = {
 'front': {3: 'neck', 1: 'neck', 5: 'back', 7: 'neck', 9: 'neck', 11: 'shoulder', 13: 'chest', 17: 'triceps',
           27: 'core', 15: 'biceps', 21: 'back', 25: 'core', 39: 'core', 41: 'core', 55: 'forearm', 45: 'core',
           51: 'forearm', 61: 'core', 47: 'forearm', 52: 'forearm', 59: 'core', 57: 'forearm', 64: 'core',
           69: 'forearm', 65: 'hip', 75: 'adductors', 79: 'adductors', 71: 'quads', 81: 'quads', 83: 'quads',
           87: 'quads', 89: 'calves', 85: 'shins', 93: 'calves', 91: 'peroneals', 95: 'shins', 97: 'peroneals',
           105: 'peroneals', 107: 'ankle', 108: 'ankle'},
 'back': {1: 'neck', 3: 'back', 5: 'shoulder', 9: 'shoulder', 11: 'shoulder', 17: 'triceps', 13: 'back',
          23: 'triceps', 15: 'triceps', 25: 'lowback', 27: 'forearm', 29: 'forearm', 31: 'glutes', 37: 'quads',
          45: 'adductors', 49: 'hamstrings', 47: 'hamstrings', 51: 'hamstrings', 57: 'hamstrings', 61: 'calves',
          63: 'calves', 73: 'calves', 69: 'calves', 67: 'peroneals', 75: 'calves'},
}
PAD, GAP = 14, 60

def path_of(poly, ox, oy):
    pts = np.round(poly[:, ::-1] + (ox, oy)).astype(int)          # (row, col) -> (x, y)
    keep = [0] + [i for i in range(1, len(pts)) if (pts[i] != pts[i - 1]).any()]
    pts = pts[keep]
    if len(pts) > 2 and (pts[0] == pts[-1]).all():
        pts = pts[:-1]
    if len(pts) < 3:
        return ''
    d = [f'M{pts[0][0]} {pts[0][1]}']
    prev = pts[0]
    rel = []
    for p in pts[1:]:
        rel.append(f'{p[0] - prev[0]} {p[1] - prev[1]}')
        prev = p
    return d[0] + 'l' + ' '.join(rel).replace(' -', '-') + 'z'

out = {'groups': {}, 'line': {}, 'place': {}}
xoff = 0
height = 0
for view in ('front', 'back'):
    L = np.asarray(Image.open(f'sym_{view}_{PICK[view]}.png')).astype(np.float32)
    lab = np.load(f'lab_{view}.npy')
    bx0, by0, bx1, by1 = AX[view]['bbox']
    cx0, cy0 = bx0 - PAD, by0 - PAD
    ox, oy = xoff - cx0, -cy0                    # source px -> svg units
    regs = {r['id']: r for r in META[view]['regions']}
    gmap = dict(GROUP[view])
    for r in regs.values():
        if r['side'] == 'R' and r.get('twin') in gmap:
            gmap[r['id']] = gmap[r['twin']]
    missing = [i for i in regs if i not in gmap]
    if missing:
        print(view, 'regions with no group (skipped):', missing)
    _, idx = ndi.distance_transform_edt(lab == 0, return_indices=True)
    nearest = lab[idx[0], idx[1]]
    groups = {}
    for rid, g in gmap.items():
        if rid not in regs:
            continue
        ys, xs = np.where(lab == rid)
        y0, y1, x0, x1 = max(ys.min() - 8, 0), ys.max() + 9, max(xs.min() - 8, 0), xs.max() + 9
        F = np.where((nearest[y0:y1, x0:x1] == rid) & (L[y0:y1, x0:x1] < 190), L[y0:y1, x0:x1], 0)
        F = np.pad(F, 1)
        cs = measure.find_contours(F, 79)
        if not cs:
            print(view, rid, 'no contour'); continue
        c = max(cs, key=len)
        c = measure.approximate_polygon(c, tolerance=0.8)
        d = path_of(c, ox + x0 - 1, oy + y0 - 1)
        if d:
            groups.setdefault(g, []).append(d)
    out['groups'][view] = {g: ''.join(v) for g, v in groups.items()}
    # line art: the pale outline, head, hands and feet
    B = np.clip((L - 120) / 80.0, 0, 1)
    B = ndi.gaussian_filter(B, 0.5)
    B = np.pad(B[by0 - PAD:by1 + PAD, bx0 - PAD:bx1 + PAD], 1)
    loops = []
    for c in measure.find_contours(B, 0.5):
        if len(c) < 12:
            continue
        c = measure.approximate_polygon(c, tolerance=0.6)
        d = path_of(c, xoff - 1, -1)
        if d:
            loops.append(d)
    out['line'][view] = ''.join(loops)
    # one continuous outline around the whole body: close the small breaks, fill, trace the edge
    yy, xx = np.mgrid[-4:5, -4:5]
    disk = (xx ** 2 + yy ** 2) <= 16
    sil = ndi.binary_fill_holes(ndi.binary_closing(L > 60, structure=disk))
    sil = ndi.binary_erosion(sil, iterations=1)
    S = ndi.gaussian_filter(sil.astype(np.float32), 1.0)
    S = np.pad(S[by0 - PAD:by1 + PAD, bx0 - PAD:bx1 + PAD], 1)
    edge = max(measure.find_contours(S, 0.5), key=len)
    out.setdefault('sil', {})[view] = path_of(measure.approximate_polygon(edge, tolerance=0.6), xoff - 1, -1)
    w, h = bx1 - bx0 + 2 * PAD, by1 - by0 + 2 * PAD
    out['place'][view] = {'x': xoff, 'w': w, 'h': h, 'src': [cx0, cy0]}
    xoff += w + GAP
    height = max(height, h)
out['viewBox'] = [0, 0, xoff - GAP, height]
json.dump(out, open('bodymap.json', 'w'))

COL = {'bg': '#0B3A2B', 'mus': '#34584C', 'line': 'rgba(250,247,242,.78)'}
svg = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {xoff - GAP} {height}">',
       f'<rect width="100%" height="100%" fill="{COL["bg"]}"/>']
for view in ('front', 'back'):
    for g, d in out['groups'][view].items():
        svg.append(f'<path data-g="{g}" fill="{COL["mus"]}" d="{d}"/>')
    svg.append(f'<path fill="{COL["line"]}" stroke="{COL["line"]}" stroke-width="1.2" stroke-linejoin="round" fill-rule="evenodd" d="{out["line"][view]}"/>')
    svg.append(f'<path fill="none" stroke="{COL["line"]}" stroke-width="3" stroke-linejoin="round" d="{out["sil"][view]}"/>')
svg.append('</svg>')
open('bodymap.svg', 'w').write('\n'.join(svg))
size = sum(len(d) for v in out['groups'].values() for d in v.values()) + sum(len(d) for d in out['line'].values())
print('viewBox', out['viewBox'], 'path chars', size)
