#!/usr/bin/env python3
r"""Judge a generated picture the way the app will actually draw it.

WHY THIS EXISTS
---------------
Measuring the raw file is the wrong test and it over-rejects. Every place a picture
lands in this project draws something ON TOP of it -- a scrim, a caption, a title --
and that layer decides whether the picture is too bright, not the file. The course
app's banner scrim is 94% opaque at the right edge: it flattens every picture into a
luminance band of about 29-38 no matter how bright the master was. Measured raw, four
perfectly good pictures looked like failures (2026-09-20).

So: composite the destination's own overlay, measure the zone the TEXT lands in, and
compare against the pictures ALREADY SHIPPED to that slot rather than an invented bar.

    python gate.py tps-banner new1.png new2.png          # measure candidates
    python gate.py tps-banner --live                     # just print the live bar
    python gate.py app-day  --sheet out.png  *.png       # + contact sheet to look at

Exit code 1 if any candidate is over the bar. A pass is NOT permission to ship: the
numbers cannot see that a picture is five balls in a row when the test has a real
geometry. Always build the sheet and look.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[4]
W, H = 1080, 608
GREEN = np.array([8, 38, 27], np.float32)      # the scrim colour, rgba(8,38,27,...)

for _s in (sys.stdout, sys.stderr):            # "→" dies on the Windows cp1252 console
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def lum(a):
    return 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]


def _stops(t, stops):
    """Piecewise-linear alpha along a gradient axis t in [0,1]."""
    out = np.full_like(t, stops[-1][1])
    for (p0, a0), (p1, a1) in zip(stops, stops[1:]):
        m = (t >= p0) & (t <= p1)
        out = np.where(m, a0 + (a1 - a0) * ((t - p0) / max(p1 - p0, 1e-6)), out)
    return np.where(t < stops[0][0], stops[0][1], out)


def scrim_tps():
    """tennis/app/app.css -> .ph::after, the course app's banner scrim.

    linear-gradient(to left,  rgba(8,38,27,.94) 0%, .62 42%, .05 86%)
    linear-gradient(to top,   rgba(8,38,27,.70) 0%, 0 58%)
    Same colour in both layers, so combined alpha = 1-(1-a1)(1-a2); order is irrelevant.
    """
    x = np.linspace(0, 1, W, dtype=np.float32)[None, :]
    a1 = _stops(1.0 - x, [(0.0, .94), (0.42, .62), (0.86, .05), (1.0, .05)])
    y = np.linspace(0, 1, H, dtype=np.float32)[:, None]
    a2 = _stops(1.0 - y, [(0.0, .70), (0.58, 0.0), (1.0, 0.0)])
    return 1.0 - (1.0 - a1) * (1.0 - a2)


# preset -> (live folder, glob, text zone as fractions (x0,y0,x1,y1), scrim fn or None, note)
PRESETS = {
    # RTL app: the Farsi title sits bottom-RIGHT, under a heavy scrim.
    "tps-banner": ("assets/tps", "*.webp", (.55, .65, 1.0, 1.0), scrim_tps,
                   "course app lesson/test/block banner"),
    # program.html day cards: caption covers the LEFT ~60% at nearly full height,
    # so the subject sits right. No measured scrim here -- the caption is opaque UI.
    "app-day": ("assets/art/days", "*.webp", (.0, .1, .60, .95), None,
                "program.html day card"),
    # program.html cycle cards: name/weeks/tagline bottom-left, built-in scrim.
    "app-cycle": ("assets/art/cycles", "*.webp", (.0, .60, .62, 1.0), None,
                  "program.html cycle card"),
    "app-library": ("assets/art/library", "*.webp", (.0, .55, .70, 1.0), None,
                    "program.html library shelf"),
    "raw": (None, None, (.0, .0, 1.0, 1.0), None, "whole frame, nothing on top"),
}


def fit_169(im):
    w, h = im.size
    if abs(w / h - 16 / 9) > 0.01:
        nh = round(w * 9 / 16)
        if nh <= h:
            t = (h - nh) // 2
            im = im.crop((0, t, w, t + nh))
        else:
            nw = round(h * 16 / 9)
            l = (w - nw) // 2
            im = im.crop((l, 0, l + nw, h))
    return im.resize((W, H), Image.LANCZOS)


def measure(path, zone, scrim):
    im = fit_169(Image.open(path).convert("RGB"))
    a = np.asarray(im).astype(np.float32)
    hsv = np.asarray(im.convert("HSV")).astype(np.float32)
    hue, sat, val = hsv[..., 0] * 360 / 255, hsv[..., 1] / 255, hsv[..., 2] / 255
    # Yellow/gold is banned outright in this brand -- clay is the only accent.
    yellow = ((hue > 40) & (hue < 70) & (sat > .35) & (val > .35)).mean() * 100
    seen = a if scrim is None else a * (1 - scrim[..., None]) + GREEN * scrim[..., None]
    x0, y0, x1, y1 = zone
    box = lum(seen)[int(y0 * H):int(y1 * H), int(x0 * W):int(x1 * W)]
    return {"text": box.mean(), "raw": lum(a).mean(), "yellow": yellow,
            "sat": sat.mean(), "kb": path.stat().st_size / 1024}


def sheet(paths, out, cols=3, cw=600):
    ch = round(cw * 9 / 16)
    rows = (len(paths) + cols - 1) // cols
    s = Image.new("RGB", (cw * cols, ch * rows), (12, 20, 16))
    for i, p in enumerate(paths):
        s.paste(fit_169(Image.open(p).convert("RGB")).resize((cw, ch), Image.LANCZOS),
                ((i % cols) * cw, (i // cols) * ch))
    s.save(out)
    return s.size


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("preset", choices=sorted(PRESETS))
    ap.add_argument("files", nargs="*", type=Path)
    ap.add_argument("--live", action="store_true", help="print the live bar and stop")
    ap.add_argument("--sheet", type=Path, help="also write a contact sheet here")
    ap.add_argument("--bar", type=float, help="override the bar instead of using the live max")
    a = ap.parse_args()

    folder, glob, zone, scrimfn, note = PRESETS[a.preset]
    scrim = scrimfn() if scrimfn else None
    print(f"preset {a.preset}: {note}")
    print(f"  text zone x{zone[0]:.2f}-{zone[2]:.2f} y{zone[1]:.2f}-{zone[3]:.2f}"
          f"   scrim: {'yes' if scrim is not None else 'none'}")

    bar = a.bar
    if folder and bar is None:
        live = sorted((ROOT / folder).glob(glob))
        if live:
            vals = np.array([measure(p, zone, scrim)["text"] for p in live])
            bar = float(vals.max())
            print(f"\nLIVE SET ({len(live)} already shipped to {folder})")
            print(f"  text zone  min {vals.min():5.1f}   median {np.median(vals):5.1f}"
                  f"   max {vals.max():5.1f}")
            order = np.argsort(-vals)[:3]
            for i in order:
                print(f"    brightest shipped: {live[i].stem:24s} {vals[i]:5.1f}")
            print(f"\n  -> bar = {bar:.1f} (the brightest already shipped; nothing new "
                  f"should be brighter than what Amir already accepted)")
    if a.live or not a.files:
        return 0

    print("\nCANDIDATES")
    bad = 0
    for p in sorted(a.files):
        m = measure(p, zone, scrim)
        over = bar is not None and m["text"] > bar
        bad += over
        flags = []
        if over:
            flags.append(f"OVER BAR by {m['text']-bar:.1f}")
        if m["yellow"] > 0.30:
            flags.append(f"YELLOW {m['yellow']:.2f}%")
        print(f"  {'FAIL' if flags else 'ok  '}  {p.stem:22s} text {m['text']:5.1f}"
              f"   raw {m['raw']:5.1f}   yellow {m['yellow']:.2f}%   sat {m['sat']:.2f}"
              f"   {m['kb']:5.0f} KB" + ("   <- " + ", ".join(flags) if flags else ""))
    if a.sheet:
        print(f"\ncontact sheet {sheet(sorted(a.files), a.sheet)} -> {a.sheet}")
        print("  LOOK AT IT. The numbers cannot tell you the picture is wrong about the content.")
    if bad:
        print(f"\n{bad} over the bar. Re-prompt darker "
              f"('overall dark and moody', 'one narrow shaft of light, the rest in deep shadow') "
              f"or dial it down per-file in TWEAKS in scripts/grade_tps_art.py.")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
