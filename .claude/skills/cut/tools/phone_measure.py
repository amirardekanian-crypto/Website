"""Measure what Instagram's interface covers on a phone, from a screenshot of the safe-zone test card (tools/safezone_card.py).

  python phone_measure.py screenshot.png [--card C:\\Users\\Amir\\Videos\\Reels\\_tests\\safezone-test-card.png] [--out overlay.png]

1. finds how the 1080 x 1920 card was scaled and cropped on that screen (scale, crop from the left, offset) by correlation on an area with no interface
2. predicts the screenshot without any interface, blurs both, diffs them and lists every overlay region in CARD pixels
3. prints the zones (what to put in tools/phone_zones.py) and writes a picture with the changed pixels in magenta

Amir's iPhone, 2026-10-01 (RESEARCH-2026-10-01.md section 14.9): scale 0.608, 54.3 card px cropped off each side; nothing covered from y 200 to y 1165; the buttons cover
x 919-992 from y 1169 to 1766; the profile row and caption everything below y 1587; the status bar, back arrow and camera everything above y 195.
Needs numpy, scipy and Pillow. One phone, one view (the reel opened from his profile): another phone or the Reels tab needs its own screenshot.
"""
import argparse
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("shot")
ap.add_argument("--card", default=r"C:\Users\Amir\Videos\Reels\_tests\safezone-test-card.png")
ap.add_argument("--out", default=None, help="where to write the overlay picture (default: next to the screenshot)")
a = ap.parse_args()

S = Image.open(a.shot).convert("RGB")
C = Image.open(a.card).convert("RGB")
W, H = S.size
sg = np.asarray(S.convert("L"), dtype=np.float32)


def predicted(s, cx, ty):
    r = C.resize((round(1080 * s), round(1920 * s)), Image.BILINEAR)
    out = Image.new("RGB", (W, H), (0, 0, 0))
    out.paste(r, (-int(round(cx)), int(round(ty))))
    return out


def score(s, cx, ty):
    p = np.asarray(predicted(s, cx, ty).convert("L"), dtype=np.float32)
    x0, x1, y0, y1 = int(W * 0.1), int(W * 0.91), int(H * 0.105), int(H * 0.33)  # the ruler numbers and the shaded band: no interface here
    u, v = sg[y0:y1, x0:x1], p[y0:y1, x0:x1]
    u, v = u - u.mean(), v - v.mean()
    return float((u * v).sum() / (np.linalg.norm(u) * np.linalg.norm(v) + 1e-9))


# the card is scaled to FILL the screen (cover), so the crop is symmetric: cx = (1080 s - W) / 2. Search the scale (and a few px of slack), then refine.
best = (-1, None)
for s in np.arange(W / 1080.0, W / 1080.0 * 1.4, 0.002):
    for dcx in (-1.5, 0, 1.5):
        cx0 = (1080 * s - W) / 2 + dcx
        for ty in (-2, 0, 2):
            sc = score(s, cx0, ty)
            if sc > best[0]:
                best = (sc, (s, cx0, ty))
s, cx, ty = best[1]
for ds in np.arange(-0.002, 0.0021, 0.0005):
    for dcx in np.arange(-1.5, 1.6, 0.5):
        for dty in np.arange(-2, 2.1, 1.0):
            sc = score(s + ds, cx + dcx, ty + dty)
            if sc > best[0]:
                best = (sc, (s + ds, cx + dcx, ty + dty))
s, cx, ty = best[1]
print("alignment: correlation %.4f, scale %.4f, %.1f px cropped from the left of the screen, offset %.1f px" % (best[0], s, cx, ty))
print("on this phone the 1920 px card is shown %.0f px tall and %.0f px wide on a %d px wide screen: %.1f card px are cropped off EACH side" % (1920 * s, 1080 * s, W, cx / s))
if best[0] < 0.9:
    print("WARNING: the alignment is poor (under 0.9): is this a screenshot of the card?")

to_x = lambda sx: (sx + cx) / s
to_y = lambda sy: (sy - ty) / s
P = np.asarray(predicted(s, cx, ty), dtype=np.float32)
A = np.asarray(S, dtype=np.float32)
video_h = int(round(1920 * s + ty))
diff = np.abs(ndimage.gaussian_filter(A, sigma=(2.5, 2.5, 0)) - ndimage.gaussian_filter(P, sigma=(2.5, 2.5, 0))).max(axis=2)
diff[min(video_h, H):, :] = 0  # below the picture is the comment bar
mask = ndimage.binary_opening(diff > 22, structure=np.ones((5, 5)))
lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=6))
print("\noverlay regions, in CARD px:")
boxes = []
for i in range(1, n + 1):
    ys, xs = np.nonzero((lab == i) & mask)
    if len(ys) >= 100:
        boxes.append((to_x(xs.min()), to_y(ys.min()), to_x(xs.max()), to_y(ys.max())))
for x0, y0, x1, y1 in sorted(boxes, key=lambda b: (b[1], b[0])):
    print("  x %4.0f-%4.0f   y %4.0f-%4.0f" % (x0, x1, y0, y1))
bx = sorted(boxes, key=lambda b: (b[1], b[0]))
top = [b for b in bx if b[3] < 260]
rail = [b for b in bx if b[0] > 880 and b[1] > 1100 and b[2] - b[0] > 30 and b[3] < 1800]  # the buttons (a thin strip at the screen edge is the border of the owner bar)
prof = [b for b in bx if b[0] < 700 and b[1] > 1400]
print("\nZONES on this phone (card px; put these in tools/phone_zones.py):")
if top:
    print("  top      status bar, back arrow, camera: y 0-%.0f  (nothing covered from there down to y %.0f)" % (max(b[3] for b in top), min([b[1] for b in rail] + [b[1] for b in prof] or [1920])))
if rail:
    print("  rail     the buttons and the audio thumbnail: x %.0f-%.0f, y %.0f-%.0f" % (min(b[0] for b in rail), max(b[2] for b in rail), min(b[1] for b in rail), max(b[3] for b in rail)))
if prof:
    print("  bottom   profile picture, name, caption: everything below y %.0f on the left" % min(b[1] for b in prof))
print("  sides    %.1f px cropped off each side" % (cx / s))
vis = np.asarray(S).copy()
vis[mask] = (255, 0, 255)
out = a.out or a.shot.rsplit(".", 1)[0] + "_overlay.png"
Image.fromarray(vis).save(out)
print("wrote", out)
