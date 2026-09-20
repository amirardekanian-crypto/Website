#!/usr/bin/env python3
r"""Look at what we already have BEFORE generating anything.

Amir (2026-09-20): "when you need an image, have a look at what we already have,
so we can reuse and we don't have to regenerate." On the same day 10 of the course
app's 29 covers were reused (9 program.html stills mirrored, 1 borrowed from a
parallel session's set), and two near-twins were only caught by looking at the whole
set on one sheet. This tool is that look.

    python shelf.py                    # a contact sheet per house -> open each PNG with Read
    python shelf.py tps                # just one house: tps | cycles | days | library | moments | workouts
    python shelf.py find bench towel   # pictures whose name / slot / ledger line has ALL the words
    python shelf.py bench              # the parked alternates (ship-ready, mirrored/graded, unused)
    python shelf.py tps --add A_05.png=the-split-second   # the whole set WITH a candidate on it, before it ships
    python shelf.py --audit            # course app: assets/tps vs the ART table in tennis/app/app.js

Sheets go to the system temp folder (or --out DIR); the paths are printed. The
course-app sheet is in the order the app lists things and labels each picture with the
slot it fills, so a near-twin two rows apart is easy to see. LOOK AT IT: a duplicate is
a fact about the picture, not about its filename.

The ledger (LEDGER.md, next to SKILL.md) records where the newer pictures came from and
the exact prompts that produced them, so `find` searches that too.
"""
import argparse
import re
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[4]
SKILL = Path(__file__).resolve().parents[1]
APP_JS = ROOT / "tennis" / "app" / "app.js"

HOUSES = {
    "tps": ("assets/tps", "Course app (/tennis/app/), subject LEFT, faces away allowed"),
    "cycles": ("assets/art/cycles", "program.html cycle cards (10 FAMILY images, never one per cycle name)"),
    "days": ("assets/art/days", "program.html day cards (8 categories)"),
    "library": ("assets/art/library", "program.html Library shelves"),
    "moments": ("assets/art/moments", "program.html moments: session complete, new best, welcome"),
    "workouts": ("assets/img/workouts", "older workout category banners (retired for the app)"),
    "bench": (".claude/skills/image/bench", "parked alternates: unused, already graded, ready to ship"),
}
EXT = {".webp", ".jpg", ".jpeg", ".png"}

for _s in (sys.stdout, sys.stderr):            # Windows cp1252 console cannot print arrows
    try:
        _s.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


def font(size=13):
    for name in ("arialbd.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            pass
    return ImageFont.load_default()


def pictures(house):
    folder = ROOT / HOUSES[house][0]
    if not folder.is_dir():
        return []
    return sorted(p for p in folder.iterdir() if p.suffix.lower() in EXT)


def art_slots():
    """file stem -> ['lesson:read-your-card', 'block:1', ...] from the ART table in app.js."""
    slots = {}
    if not APP_JS.is_file():
        return slots
    src = APP_JS.read_text(encoding="utf-8")
    m = re.search(r"const ART = \{(.*?)\n  \};", src, re.S)
    if not m:
        return slots
    kind = None
    for line in m.group(1).splitlines():
        km = re.match(r"\s{4}(\w+): \{", line)
        if km:
            kind = km.group(1)
        for em in re.finditer(r"(?:'([\w*-]+)'|(\w+)): \{ f: '([\w-]+)'", line):
            slots.setdefault(em.group(3), []).append("%s:%s" % (kind, em.group(1) or em.group(2)))
    for fname in ("index.html", "app.css", "sw.js"):          # pictures wired outside ART (the sign-in walk-on)
        p = ROOT / "tennis" / "app" / fname
        if p.is_file():
            for stem in set(re.findall(r"assets/tps/([\w-]+)\.\w+", p.read_text(encoding="utf-8"))):
                slots.setdefault(stem, []).append("page:" + fname)
    return slots


def label_for(house, p, slots):
    if house == "tps":
        s = slots.get(p.stem)
        return "%s  [%s]" % (p.stem, ", ".join(s)) if s else "%s  [NOT IN ART]" % p.stem
    return p.stem


def sheet(items, out, cols=5, cw=300, ch=169, title=None):
    """items: [(label, path)]. Pictures are fitted (not cropped) into 16:9 cells."""
    f = font(12)
    lab_h = 30
    rows = (len(items) + cols - 1) // cols
    top = 28 if title else 0
    s = Image.new("RGB", (cols * (cw + 6) + 6, top + rows * (ch + lab_h + 6) + 6), (18, 22, 19))
    d = ImageDraw.Draw(s)
    if title:
        d.text((8, 6), title, fill=(224, 107, 67), font=font(14))
    for i, (label, path) in enumerate(items):
        im = Image.open(path).convert("RGB")
        im.thumbnail((cw, ch), Image.LANCZOS)
        r, c = divmod(i, cols)
        x, y = 6 + c * (cw + 6), top + 6 + r * (ch + lab_h + 6)
        s.paste(im, (x + (cw - im.size[0]) // 2, y + (ch - im.size[1]) // 2))
        words, line, lines = label.split(" "), "", []
        for w in words:
            if d.textlength(line + " " + w, font=f) > cw - 4 and line:
                lines.append(line)
                line = w
            else:
                line = (line + " " + w).strip()
        lines.append(line)
        for j, ln in enumerate(lines[:2]):
            d.text((x + 2, y + ch + 3 + j * 13), ln, fill=(236, 231, 222), font=f)
    s.save(out)
    return s.size


def cmd_sheets(houses, outdir, add=()):
    outdir.mkdir(parents=True, exist_ok=True)
    slots = art_slots()
    for h in houses:
        pics = pictures(h)
        if not pics:
            print("%-9s (empty or missing: %s)" % (h, HOUSES[h][0]))
            continue
        kb = sum(p.stat().st_size for p in pics) // 1024
        # the course app reads best in the order the app lists it; the rest by name
        items = [(label_for(h, p, slots), p) for p in pics]
        if h == "tps":                                  # candidates that have not shipped yet, marked NEW
            for spec in add:
                path, _, name = spec.partition("=")
                if not Path(path).is_file():
                    print("--add: no such file %s" % path)
                    return 1
                items.append(("NEW: %s" % (name or Path(path).stem), Path(path)))
        out = outdir / ("shelf-%s.png" % h)
        size = sheet(items, out, title="%s: %d pictures, %d KB. %s" % (h, len(pics), kb, HOUSES[h][1]))
        print("%-9s %2d pictures %5d KB  -> %s  %s" % (h, len(pics), kb, out, size))
    print("\nOpen each PNG with Read. Ask of every subject you are about to generate: is it already here,"
          "\nis a near-twin here, or would a mirrored / re-cropped / re-graded existing picture do?")


def ledger_lines():
    p = SKILL / "LEDGER.md"
    return p.read_text(encoding="utf-8").splitlines() if p.is_file() else []


def ledger_key(house, p):
    """How this picture is written in LEDGER.md: `stem` for the course app, house/name for program.html art."""
    if house in ("cycles", "days", "moments", "library"):
        return "%s/%s" % (house, p.stem[:-3] if p.stem.endswith("-v1") else p.stem)
    return "`%s`" % p.stem


def cmd_find(words, outdir):
    words = [w.lower() for w in words]
    slots = art_slots()
    ledger = ledger_lines()
    hits = []
    for h in HOUSES:
        for p in pictures(h):
            text = (h + " " + label_for(h, p, slots)).lower()
            key = ledger_key(h, p).lower()
            hit_ledger = [ln for ln in ledger if key in ln.lower()]
            blob = text + " " + " ".join(hit_ledger).lower()
            if all(w in blob for w in words):
                hits.append((h, p, hit_ledger))
    if not hits:
        print("Nothing on the shelf matches %s. Also check LEDGER.md by hand, then the Higgsfield history "
              "(show_generations) and Amir's Downloads (hf_2026*.png) before generating." % words)
        return 0
    print("%d match(es) for %s\n" % (len(hits), words))
    for h, p, lg in hits:
        print("  %-9s %s   %s" % (h, p.relative_to(ROOT).as_posix(), label_for(h, p, slots)))
        for ln in lg[:2]:
            print("            ledger: %s" % ln.strip()[:150])
    outdir.mkdir(parents=True, exist_ok=True)
    out = outdir / "shelf-find.png"
    size = sheet([(label_for(h, p, slots), p) for h, p, _ in hits], out, cols=min(4, len(hits)), cw=380, ch=214)
    print("\nsheet %s -> %s" % (size, out))
    return 0


def cmd_audit():
    """Every picture the course app needs is there, and every picture there is needed."""
    if not APP_JS.is_file():
        print("no tennis/app/app.js")
        return 1
    src = APP_JS.read_text(encoding="utf-8")
    slots = art_slots()
    used = set(slots)
    for f in ("index.html", "app.css", "sw.js"):
        p = ROOT / "tennis" / "app" / f
        if p.is_file():
            used |= set(re.findall(r"assets/tps/([\w-]+)\.\w+", p.read_text(encoding="utf-8")))
    have = {p.stem for p in pictures("tps")}
    missing, orphans = sorted(used - have), sorted(have - used)
    print("assets/tps: %d files; ART + index/css/sw reference %d" % (len(have), len(used)))
    print("  referenced but missing : %s" % (missing or "none"))
    print("  present but unreferenced: %s" % (orphans or "none (nothing orphaned would ship)"))
    # the same picture on two lessons/tests reads as a set with a hole in it
    dups = {f: s for f, s in slots.items()
            if len([x for x in s if x.split(":")[0] in ("lesson", "test")]) > 1}
    print("  one picture on 2+ lessons/tests: %s" % (dups or "none"))
    # duplicate keys inside one kind are silently the LAST one wins
    body = re.search(r"const ART = \{(.*?)\n  \};", src, re.S)
    bad = []
    if body:
        kind, seen = None, {}
        for line in body.group(1).splitlines():
            km = re.match(r"\s{4}(\w+): \{", line)
            if km:
                kind = km.group(1)
            for em in re.finditer(r"'([\w*-]+)': \{ f:", line):
                key = (kind, em.group(1))
                if key in seen:
                    bad.append(key)
                seen[key] = 1
    print("  duplicate keys in ART  : %s" % (bad or "none"))
    n_l = sum(1 for s in slots.values() for x in s if x.startswith("lesson:"))
    n_t = sum(1 for s in slots.values() for x in s if x.startswith("test:"))
    print("  covers wired           : %d lessons, %d tests" % (n_l, n_t))
    print("\nThe lesson/test ids themselves live in public.tps_content (keys learn, learn-2..5, tests). Check with:"
          "\n  select 'lesson', l->>'id' from tps_content c, jsonb_array_elements(c.body->'lessons') l where c.key like 'learn%'"
          "\n  union all select 'test', t->>'id' from tps_content c, jsonb_array_elements(c.body->'tests') t where c.key='tests';"
          "\nNEVER select * from tps_accounts: it holds initial passwords in clear text.")
    return 1 if (missing or orphans or bad) else 0


def main():
    ap = argparse.ArgumentParser(add_help=False)
    ap.add_argument("what", nargs="*")
    ap.add_argument("--audit", action="store_true")
    ap.add_argument("--add", action="append", default=[], help="candidate.png[=name], repeatable; joins the tps sheet")
    ap.add_argument("--out", type=Path, default=Path(tempfile.gettempdir()) / "aa-shelf")
    ap.add_argument("-h", "--help", action="store_true")
    a = ap.parse_args()
    if a.help:
        print(__doc__)
        return 0
    if a.audit:
        return cmd_audit()
    if a.what and a.what[0] == "find":
        if len(a.what) < 2:
            print("usage: shelf.py find <word> [word ...]")
            return 2
        return cmd_find(a.what[1:], a.out)
    houses = [h for h in a.what if h in HOUSES] or [h for h in HOUSES if h != "bench"]
    if a.what and not [h for h in a.what if h in HOUSES]:
        print("unknown house %s. One of: %s" % (a.what, ", ".join(HOUSES)))
        return 2
    return cmd_sheets(houses, a.out, a.add) or 0


if __name__ == "__main__":
    sys.exit(main())
