"""Write the traced body (bodymap.json) into program.html as BODYMAP_SVG, between the
// BODYMAP:BEGIN and // BODYMAP:END markers. Run from anywhere:

    python .claude/skills/image/bodymap/inject.py          # write
    python .claude/skills/image/bodymap/inject.py --check  # exit 1 if program.html is stale

Colours are NOT in the markup: program.html's .bmap CSS paints the classes (sf = the body's skin,
data-g = a muscle group, ln = line art, sil = the outline, ring = the knee and ankle rings).
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
APP = ROOT / 'program.html'
BM = json.loads((HERE / 'bodymap.json').read_text(encoding='utf-8'))
CAP = 70                                    # room under the figures for FRONT / BACK
W, H = BM['viewBox'][2], BM['viewBox'][3] + CAP
fx, bx = BM['place']['front']['x'], BM['place']['back']['x']
# knee and ankle rings: the two joints the body-part fallback cannot show as muscle
RINGS = [('knee', fx + 282, 1099, 40, 50), ('knee', fx + 521, 1099, 40, 50),
         ('ankle', fx + 250, 1494, 40, 34), ('ankle', fx + 553, 1494, 40, 34),
         ('ankle', bx + 284, 1494, 40, 34), ('ankle', bx + 529, 1494, 40, 34)]

parts = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-label="Muscle map, front and back">']
for view in ('front', 'back'):
    parts.append(f'<path class="sf" d="{BM["sil"][view]}"/>')
    for g, d in BM['groups'][view].items():
        parts.append(f'<path data-g="{g}" d="{d}"/>')
    parts.append(f'<path class="ln" fill-rule="evenodd" d="{BM["line"][view]}"/>')
    parts.append(f'<path class="sil" d="{BM["sil"][view]}"/>')
    p = BM['place'][view]
    parts.append(f'<text x="{p["x"] + p["w"] / 2:.0f}" y="{H - 14}">{view.upper()}</text>')
for r, cx, cy, rx, ry in RINGS:
    parts.append(f'<ellipse class="ring" data-r="{r}" cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}"/>')
parts.append('</svg>')
svg = ''.join(parts)
assert "'" not in svg and '\\' not in svg
line = f"const BODYMAP_SVG = '{svg}';"

src = open(APP, encoding='utf-8', newline='').read()      # keep the file's own line endings
pat = re.compile(r'(// BODYMAP:BEGIN[^\n]*\n)(.*?)(\n// BODYMAP:END)', re.S)
m = pat.search(src)
if not m:
    sys.exit('program.html has no BODYMAP:BEGIN / BODYMAP:END markers')
eol = '\r' if m.group(1).endswith('\r\n') else ''     # a CRLF file: the new line keeps its CR
new = src[:m.start(2)] + line + eol + src[m.end(2):]
if '--check' in sys.argv:
    sys.exit(0 if new == src else 'program.html BODYMAP_SVG is stale: run .claude/skills/image/bodymap/inject.py')
if new != src:
    open(APP, 'w', encoding='utf-8', newline='').write(new)
print(f'BODYMAP_SVG: {len(svg):,} characters, {sum(len(v) for v in BM["groups"].values())} muscle groups')
