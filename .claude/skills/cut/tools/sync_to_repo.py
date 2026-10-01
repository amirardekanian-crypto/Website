"""Mirror the user-level /cut skill into the website repo (.claude/skills/cut/), so it is versioned on GitHub and available to cloud
sessions and other machines. THIS folder (C:\\Users\\Amir\\.claude\\skills\\cut) stays the one you edit: every path in the docs and scripts
points here. Run after any change:

  python sync_to_repo.py            copy, remove files the source no longer has, show what git sees
  python sync_to_repo.py --dry      only list what would change

It leaves out __pycache__ and the contact-sheet PNGs in kit/showreel (10 MB: they stay on the PC and in the backup zip). It NEVER commits or
pushes: that happens only when Amir says "go live" (his word for pushing to main), one push at a time, `main` by itself.
"""
import filecmp
import os
import shutil
import subprocess
import sys

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # .../skills/cut
REPO = r"C:\Users\Amir\OneDrive\Документы\GitHub\Website"
DST = os.path.join(REPO, ".claude", "skills", "cut")
DRY = "--dry" in sys.argv


def skip(rel):
    parts = rel.replace("\\", "/").split("/")
    if "__pycache__" in parts:
        return True
    if rel.replace("\\", "/").startswith("kit/showreel/") and rel.lower().endswith(".png"):
        return True
    return False


want = {}
for root, dirs, files in os.walk(SRC):
    dirs[:] = [d for d in dirs if d != "__pycache__"]
    for f in files:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, SRC)
        if not skip(rel):
            want[rel] = full

have = {}
if os.path.isdir(DST):
    for root, dirs, files in os.walk(DST):
        for f in files:
            full = os.path.join(root, f)
            have[os.path.relpath(full, DST)] = full

TEXT = (".md", ".py", ".js", ".css", ".html", ".sh", ".ps1", ".txt", ".json")


def same(a, b):
    """Equal bytes, or equal text once line endings are ignored (git on Windows turns the repo copy into CRLF; the source is LF)."""
    if filecmp.cmp(a, b, shallow=False):
        return True
    if a.lower().endswith(TEXT):
        crlf, lf = b"\r\n", b"\n"
        return open(a, "rb").read().replace(crlf, lf) == open(b, "rb").read().replace(crlf, lf)
    return False


new = [r for r in want if r not in have]
changed = [r for r in want if r in have and not same(want[r], have[r])]
gone = [r for r in have if r not in want]
print("to add: %d, to update: %d, to remove: %d, unchanged: %d" % (len(new), len(changed), len(gone), len(want) - len(new) - len(changed)))
if DRY:
    for lab, lst in (("add", new), ("update", changed), ("remove", gone)):
        for r in lst:
            print(" ", lab, r)
    sys.exit(0)
for r in new + changed:
    os.makedirs(os.path.dirname(os.path.join(DST, r)), exist_ok=True)
    shutil.copy2(want[r], os.path.join(DST, r))
for r in gone:
    os.remove(have[r])
total = sum(os.path.getsize(os.path.join(DST, r)) for r in want)
print("mirror: %s (%.1f MB, %d files)" % (DST, total / 1048576, len(want)))
print(subprocess.run(["git", "-C", REPO, "status", "--short", ".claude/skills/cut"], capture_output=True, text=True, encoding="utf-8").stdout[:1500] or "(git sees no change)")
