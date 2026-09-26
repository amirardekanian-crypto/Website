"""Stage 1: split the chosen drawing (round 1, C) into its two figures, find each figure's
mirror axis, and write both symmetric versions (left half mirrored, right half mirrored)."""
import json
import numpy as np
from PIL import Image

L = np.asarray(Image.open('master.png').convert('L')).astype(np.float32)
H, W = L.shape
content = (L > 60)
cols = content.sum(axis=0)
mid = W // 2
gap = [x for x in range(mid - 400, mid + 400) if cols[x] == 0]
split = gap[len(gap) // 2]
print('image', W, H, 'split at', split, 'gap', gap[0], gap[-1])

out = {}
for name, x0, x1 in (('front', 0, split), ('back', split, W)):
    sub = L[:, x0:x1]
    c = sub > 60
    ys, xs = np.where(c)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    guess = (bx0 + bx1) / 2
    best = None
    # candidate axes on half-pixel steps; score = mean abs diff between the image and its mirror
    for a2 in range(int(2 * guess) - 40, int(2 * guess) + 41):
        a = a2 / 2
        xs_ = np.arange(bx0, bx1 + 1)
        xm = np.round(2 * a - xs_).astype(int)
        ok = (xm >= 0) & (xm < sub.shape[1])
        diff = np.abs(sub[by0:by1 + 1, xs_[ok]] - sub[by0:by1 + 1, xm[ok]]).mean()
        if best is None or diff < best[0]:
            best = (diff, a)
    diff, a = best
    print(name, 'bbox', (bx0, by0, bx1, by1), 'axis', a, 'mirror diff', round(float(diff), 2))
    out[name] = {'x0': int(x0), 'x1': int(x1), 'axis': a, 'bbox': [int(bx0), int(by0), int(bx1), int(by1)]}
    # symmetric versions
    for side in ('L', 'R'):
        sym = sub.copy()
        xs_ = np.arange(sub.shape[1])
        xm = np.round(2 * a - xs_).astype(int)
        valid = (xm >= 0) & (xm < sub.shape[1])
        if side == 'L':   # keep the left half, mirror it onto the right
            tgt = xs_ > a
        else:
            tgt = xs_ < a
        m = tgt & valid
        sym[:, xs_[m]] = sub[:, xm[m]]
        sym[:, xs_[tgt & ~valid]] = sub[0, 0]
        Image.fromarray(sym.astype(np.uint8)).save(f'sym_{name}_{side}.png')

json.dump(out, open('bm_axis.json', 'w'), indent=1)
# side-by-side comparison sheet, cropped to the figures
tiles = []
for name in ('front', 'back'):
    bx0, by0, bx1, by1 = out[name]['bbox']
    for side in ('L', 'R'):
        im = Image.open(f'sym_{name}_{side}.png').crop((bx0 - 10, by0 - 10, bx1 + 10, by1 + 10))
        tiles.append(im)
w = sum(t.width for t in tiles) + 30
h = max(t.height for t in tiles)
sheet = Image.new('L', (w, h), 90)
x = 0
for t in tiles:
    sheet.paste(t, (x, 0)); x += t.width + 10
sheet.save('sym_compare.png'); print('sheet', sheet.size)
