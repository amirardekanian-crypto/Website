"""The gate: run `hyperframes check` on a reel's public/ folder with his caption band guarded, and print a short verdict.

  python check_gate.py <reel>/public [--band 230,470] [--every 0.5] [--bottom 1585] [--rail] [--strict] [--json-out gate.json]

What it does (everything local, no network, nothing uploaded):
  * reads the reel's length from the page, and asks `check` to look at his caption band (default y 230-470 of 1920) about every
    0.5 s. The caption-zone check only looks at the moments you list, so a few sample points miss a word that is there for a
    moment (measured 2026-10-01: 9 points saw nothing, 79 points caught two entrances on HCTV3230).
  * runs the layout audit at 18 moments (overlap, occlusion, overflow), the frame check (text outside the frame) and the contrast
    pass. `--deep` adds a sample at every tween start and end (`--at-transitions`): thorough, about 3x slower (152 s on HCTV3230).
  * `--bottom Y` runs a second, lighter pass that WARNS about anything below y = Y, and `--rail` one for the right-hand buttons. Measured on his phone (2026-10-01,
    section 14.9 of RESEARCH-2026-10-01.md): nothing is covered between y 200 and y 1165 anywhere across the width; the buttons cover x 919-992 from y 1169 to 1766; the
    profile row and caption cover everything below y 1587; the picture is cropped 54 px off each side. (Meta's figures for ADS, y 269 to 1248, are far more cautious.)
    `check` accepts ONE --caption-zone per run, so each extra guard is its own run.
  * prints one line per kind of problem, with the element, its text and when it is on screen.

A finding that is deliberate (a ghost numeral that must be faint, a word stacked on another for the final stamp, a word that dips
into the band for a moment) is marked on the element in the page, then run the gate again:
    data-layout-allow-overlap | data-layout-allow-occlusion | data-layout-allow-overflow | data-layout-allow-caption-zone
Exit code: 0 PASS or WARN, 1 FAIL (an error finding; with --strict a warning fails too), 2 the check itself could not run.
"""
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import time

H = 1920.0
RAIL = (915, 1160, 1780)  # x from, y from, y to: the like, comment, repost and share buttons and the audio thumbnail (a little wider than measured)


def duration_of(public):
    html = open(os.path.join(public, "index.html"), encoding="utf-8").read()
    m = re.search(r'data-composition-id="[^"]*"[^>]*?data-duration="([\d.]+)"', html, re.S) or re.search(r'data-duration="([\d.]+)"', html)
    if not m:
        sys.exit("could not read the reel's data-duration from index.html")
    return float(m.group(1))


def seek_list(total, every):
    n = max(2, int(total / every))
    return ",".join("%.4f" % (k / (n + 1)) for k in range(1, n + 1))


def run_check(public, zone, extra):
    exe = shutil.which("hyperframes")
    if not exe:
        sys.exit("hyperframes is not on PATH")
    cmd = [exe, "check", public, "--json", "--timeout", "20000", "--caption-zone", zone] + extra  # a generous page-load timeout: a busy PC must not fail a reel
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    out = p.stdout
    i = out.find("{")
    if i < 0:
        sys.stderr.write((p.stderr or out)[-1500:])
        sys.exit(2)
    try:
        return json.loads(out[i:])
    except Exception:
        sys.stderr.write(out[-1500:])
        sys.exit(2)


def findings(report):
    for part in ("lint", "runtime", "layout", "motion", "contrast"):
        for f in (report.get(part) or {}).get("findings", []):
            yield part, f


def when(f):
    a, b = f.get("firstSeen", f.get("time")), f.get("lastSeen", f.get("time"))
    if a is None:
        return ""
    return "t=%.1f s" % a if b is None or abs(b - a) < 0.05 else "t=%.1f-%.1f s" % (a, b)


# Two things `check` flags that no allow-mark can silence, and that the kit does on purpose. They are counted and printed, never hidden.
SET_ASIDE = [
    ("frame_out_of_frame", r"^#vid\d+|video", "a cut-in zooms the footage past the frame"),
    ("text_not_painted", r"k-rcol|k-chncol", "the odometer's digits are blurred while they roll"),
]


def set_aside(f):
    sel = "%s %s" % (f.get("selector") or "", f.get("text") or "")
    for code, rx, why in SET_ASIDE:
        if f.get("code") == code and re.search(rx, sel):
            return why
    return None


def show(report, label, band_px=None):
    counts = {"error": 0, "warning": 0, "info": 0}
    rows = []
    aside = {}
    for part, f in findings(report):
        why = set_aside(f)
        if why:
            aside[why] = aside.get(why, 0) + 1
            continue
        sev = f.get("severity", "info")
        counts[sev] = counts.get(sev, 0) + 1
        rows.append((sev, part, f))
    order = {"error": 0, "warning": 1, "info": 2}
    rows.sort(key=lambda r: (order.get(r[0], 3), r[1], r[2].get("time", 0) or 0))
    print("%s: %d error(s), %d warning(s), %d note(s)" % (label, counts["error"], counts["warning"], counts["info"]))
    shown = 0
    for sev, part, f in rows:
        if sev == "info":
            continue
        text = (f.get("text") or "").strip().replace("\n", " ")[:28]
        sel = f.get("selector") or f.get("file") or ""
        rect = f.get("rect") or {}
        where = ""
        if f.get("code") == "caption_zone_collision" and rect:
            where = "  box y %d-%d" % (rect.get("top", 0), rect.get("bottom", 0))
        msg = f.get("code") or f.get("message", "")[:60]
        print("  %-7s %-9s %-24s %s %s %s%s" % (sev.upper(), part, msg, sel, ('"%s"' % text) if text else "", when(f), where))
        shown += 1
        if shown >= 25:
            print("  ... and more (use --json-out for all)")
            break
    notes = [r for r in rows if r[0] == "info"]
    if notes:
        codes = {}
        for _, part, f in notes:
            codes[f.get("code", part)] = codes.get(f.get("code", part), 0) + 1
        print("  notes: " + ", ".join("%s x%d" % (k, v) for k, v in sorted(codes.items(), key=lambda kv: -kv[1])))
    if aside:
        print("  set aside (kit mechanics that cannot be marked): " + "; ".join("%d x %s" % (n, w) for w, n in aside.items()))
    return counts


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("public")
    ap.add_argument("--band", default="230,470", help="caption band in px of a 1920 high frame (default 230,470)")
    ap.add_argument("--every", type=float, default=0.5, help="seconds between caption-band samples (default 0.5)")
    ap.add_argument("--bottom", type=float, default=0, help="also warn about anything below this y in px (1585 is where the profile row starts on his phone; Meta's ad figure is 1248)")
    ap.add_argument("--rail", action="store_true", help="also warn about anything under Instagram's right-hand buttons (x 915-1080, y 1160-1780, measured on his phone)")
    ap.add_argument("--samples", type=int, default=18, help="evenly spaced moments for the layout audit (default 18)")
    ap.add_argument("--deep", action="store_true", help="also sample at every tween start and end (thorough, about 3x slower)")
    ap.add_argument("--no-contrast", action="store_true", help="skip the contrast pass")
    ap.add_argument("--strict", action="store_true", help="a warning fails too")
    ap.add_argument("--json-out", help="save the full report of the main run as JSON")
    a = ap.parse_args()

    total = duration_of(a.public)
    y0, y1 = [float(x) / H for x in a.band.split(",")]
    seeks = seek_list(total, a.every)
    n = seeks.count(",") + 1
    t0 = time.time()
    extra = ["--frame-check", "severity=warning;seek=%s" % seek_list(total, max(a.every * 4, 2.0)), "--samples", str(a.samples)]
    if a.deep:
        extra.append("--at-transitions")  # a sample at every tween start and end: thorough, but about 3x slower
    if a.no_contrast:
        extra.append("--no-contrast")
    rep = run_check(a.public, "x0=0;y0=%.4f;x1=1;y1=%.4f;severity=error;seek=%s" % (y0, y1, seeks), extra)
    print("GATE %s | %.1f s | caption band y %s guarded at %d moments | %.0f s to run" % (a.public, total, a.band.replace(",", "-"), n, time.time() - t0))
    if a.json_out:
        json.dump(rep, open(a.json_out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    c = show(rep, "main")

    cb = {"error": 0, "warning": 0}

    def zone_pass(label, zone, what):
        """A second, lighter `check` for one more zone (it takes ONE per run). Only its caption_zone findings matter: the rest repeat the main run."""
        t1 = time.time()
        r = run_check(a.public, "%s;severity=warning;seek=%s" % (zone, seeks), ["--no-contrast", "--samples", "1"])
        hits = [f for _, f in findings(r) if f.get("code") == "caption_zone_collision"]
        print("%s (%.0f s): %d element(s) %s" % (label, time.time() - t1, len(hits), what))
        for f in hits[:12]:
            rc = f.get("rect", {})
            print("  WARNING  %s \"%s\" %s  box x %d-%d, y %d-%d" % (f.get("selector"), (f.get("text") or "")[:28], when(f), rc.get("left", 0), rc.get("right", 0),
                                                                 rc.get("top", 0), rc.get("bottom", 0)))
        cb["warning"] += len(hits)

    if a.bottom:
        zone_pass("bottom guard y >= %d" % a.bottom, "x0=0;y0=%.4f;x1=1;y1=1" % (a.bottom / H), "below the line")
    if a.rail:
        # measured 2026-10-01 on his iPhone (RESEARCH-2026-10-01.md 14.9): the buttons run x 919-992, y 1169-1766; the picture is cropped 54 px a side
        zone_pass("right-hand buttons x %d-1080, y %d-%d" % (RAIL[0], RAIL[1], RAIL[2]), "x0=%.4f;y0=%.4f;x1=1;y1=%.4f" % (RAIL[0] / 1080.0, RAIL[1] / H, RAIL[2] / H),
                  "under them (BOXES: a wide box over-reports, judge by eye with `qa_reel.py --tour --phone`)")

    fail = c["error"] > 0 or (a.strict and (c["warning"] > 0 or cb["warning"] > 0))
    warn = c["warning"] > 0 or cb["warning"] > 0
    print("RESULT: " + ("FAIL" if fail else "WARN" if warn else "PASS") +
          ("  (a deliberate finding: mark the element data-layout-allow-overlap / -occlusion / -overflow / -caption-zone and run again)" if fail or warn else ""))
    sys.exit(1 if fail else 0)


if __name__ == "__main__":
    main()
