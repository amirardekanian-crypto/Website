"""List every picture in the repo that is taller than wide and big enough to be a video start frame.

    python .claude/skills/video/tools/find_vertical.py [--min 500] [--ratio 1.3]

This is the "reuse before you generate" check for /video: a vertical picture that already exists goes straight in as
a start_image, with no generation and no cost. --min is the shortest side in pixels, --ratio how much taller than wide.
Rows are tagged: PEOPLE means a photograph of a real person (Amir, a client, a player), never animate it; SCREEN means an
app screenshot or a poster, not footage material; DERIVED is a graded copy of a master, so animate the master. The rows
tagged "candidate" are the ones to use. (2026-09-20: two candidates in the
whole repo, Content/reel-7-course/masters/day-one.webp and week-sixteen.webp.) It does not see Higgsfield itself: the
ledger in SKILL.md lists the pictures already generated there.
"""
import argparse
import pathlib
import subprocess
import sys

from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
ap.add_argument("--min", type=int, default=500)
ap.add_argument("--ratio", type=float, default=1.3)
a = ap.parse_args()

ROOT = pathlib.Path(__file__).resolve().parents[4]  # tools -> video -> skills -> .claude -> repo
files = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8").stdout.splitlines()
PEOPLE = ("athletes/", "recovery-run/", "coach-site/")
SCREEN = ("screens/", "tennis-testing/", "app-session", "uts-padel", "baseline-check", "library-playbook")
DERIVED = ("bg-",)  # graded, grained copies of a master: animate the master instead

rows = []
for f in files:
    if not f.lower().endswith((".webp", ".jpg", ".jpeg", ".png")):
        continue
    try:
        w, h = Image.open(ROOT / f).size
    except Exception:
        continue
    if h >= w * a.ratio and min(w, h) >= a.min:
        tag = ("PEOPLE" if any(p in f for p in PEOPLE) else "SCREEN" if any(s in f for s in SCREEN)
               else "DERIVED" if any(d in f for d in DERIVED) else "")
        rows.append((tag, f, w, h))

print(len(rows), f"vertical pictures, shortest side {a.min} px or more")
for tag, f, w, h in sorted(rows, key=lambda r: (r[0] != "", r[1])):
    print(f"{tag or 'candidate':<10}{w}x{h:<6}{f}")
