"""Measure, for every sound in the kit, when it really starts, hits, peaks and ends (ffmpeg decode, 5 ms windows).

  first-40 = first window within 40 dB of the loudest window (the first thing you could hear)
  onset-20 = first window within 20 dB of the loudest window (the sound has started: where a sharp hit lands)
  peak     = the loudest window (where a swell or a build-up lands)
  end-20   = last window within 20 dB of the loudest window (where an odometer roll finishes)
  dur      = length of the file

The kit's sfx_html() with align=True starts each sound EARLY by its lead, so the moment that matters lands on the picture event:
`align` says which moment that is ("onset" for a sharp hit, "peak" for a swell or build-up, "end" for the roll). The numbers live in
kit/sfx/timing.json. Why: the menu's mp3 sounds start 0.12 s in (the lab's sounds.py has LEAD = 0.10), the swells peak 155-275 ms in and the
build-ups 1.0-1.3 s in, so a file placed on its event lands late (RESEARCH-2026-10-01.md section 2.1).

  python tools\\sfx_lead.py            # the table
  python tools\\sfx_lead.py --json     # the same as JSON
  python tools\\sfx_lead.py --write    # (re)write kit/sfx/timing.json: new files get measured, an `align` you set by hand is kept
"""
import glob
import json
import os
import subprocess
import sys

import numpy as np

KIT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "kit")
SFX = os.path.join(KIT, "sfx")
TIMING = os.path.join(SFX, "timing.json")
RATE = 48000
WIN = int(RATE * 0.005)

# Which moment of the sound should land on the event. Everything not listed is a sharp hit ("onset").
ALIGN = {"whoosh": "peak", "rise": "peak", "riser": "peak", "drop": "peak", "snare-roll": "peak", "swish": "peak", "inhale": "peak",
         "roll": "end"}


def load(path):
    p = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(RATE), "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(p.stdout, dtype=np.float32)


def measure(path):
    x = load(path)
    if len(x) < WIN:
        return None
    n = len(x) // WIN
    rms = np.sqrt((x[: n * WIN].reshape(n, WIN) ** 2).mean(axis=1))
    top = rms.max()
    if top <= 0:
        return None
    strong = np.nonzero(rms > top * 10 ** (-20 / 20))[0]
    return dict(
        dur_ms=round(len(x) / RATE * 1000),
        first40_ms=int(np.argmax(rms > top * 10 ** (-40 / 20))) * 5,
        onset_ms=int(strong[0]) * 5,
        peak_ms=int(np.argmax(rms)) * 5,
        end_ms=int(strong[-1]) * 5,
    )


def measure_all():
    rows = {}
    for path in sorted(glob.glob(os.path.join(SFX, "*.mp3")) + glob.glob(os.path.join(SFX, "*.wav"))):
        m = measure(path)
        if m:
            rows[os.path.basename(path)] = m
    return rows


def write(rows):
    old = {}
    if os.path.exists(TIMING):
        old = json.load(open(TIMING, encoding="utf-8"))
    out = {"_note": "Measured by tools/sfx_lead.py (ms from the start of each file). kit.sfx_html(..., align=True) starts a sound early by the number "
                    "named in `align` (onset | peak | end) so that moment lands on its event. Edit `align` by hand if a sound needs another sync point; "
                    "a re-run keeps it."}
    for name, m in rows.items():
        stem = os.path.splitext(name)[0]
        m = dict(m)
        m["align"] = (old.get(name) or {}).get("align") or ALIGN.get(stem, "onset")
        out[name] = m
    json.dump(out, open(TIMING, "w", encoding="utf-8"), indent=1)
    print("wrote", TIMING, "(%d sounds)" % len(rows))


def main():
    rows = measure_all()
    if "--json" in sys.argv:
        print(json.dumps(rows, indent=1))
        return
    if "--write" in sys.argv:
        write(rows)
        return
    print("%-18s %7s %9s %9s %8s %8s  %s" % ("file", "dur ms", "first-40", "onset-20", "peak ms", "end-20", "align"))
    late = 0
    for name, m in rows.items():
        stem = os.path.splitext(name)[0]
        al = ALIGN.get(stem, "onset")
        lead = m[al + "_ms"]
        if lead >= 60:
            late += 1
        print("%-18s %7d %9d %9d %8d %8d  %-6s lead %d ms" % (name, m["dur_ms"], m["first40_ms"], m["onset_ms"], m["peak_ms"], m["end_ms"], al, lead))
    print()
    print("files measured:", len(rows), "| sounds that land 2+ frames (60 ms) late when placed on their event:", late)


if __name__ == "__main__":
    main()
