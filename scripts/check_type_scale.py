#!/usr/bin/env python3
"""Guard program.html's type scale (Fresh Eyes DS-03, 2026-09-27).

WHY THIS EXISTS
---------------
The training app had 46 font sizes: 22 of them between 6 and 20 px, 34 pairs
within a pixel of each other, text as small as 7.5 px. Nobody chose that; each
new screen picked the pixel that looked right on the day. DS-03 moved every size
onto seven steps and a field size, named in program.html's :root:

    --fs-label 11 · --fs-small 13 · --fs-body 15 · --fs-field 16
    --fs-lead 18 · --fs-title 22 · --fs-head 28 · --fs-display 44

This check keeps it that way. A font size under 32 px must be one of those
tokens (or inherit / a clamp()); 32 px and up is a display piece (a clock, a
record number, a hero) and may set its own, and so may a smaller numeral whose
line says why with a `/* display: ... */` comment (the session clock, Guided's
steppers). The tokens themselves must still be the scale, and nothing may drop
under 11 px (A11Y-01: the smallest text an athlete reads mid-session).

    python scripts/check_type_scale.py [path/to/program.html]
"""
import re
import sys

PATH = sys.argv[1] if len(sys.argv) > 1 else 'program.html'
SCALE = {'--fs-label': 11, '--fs-small': 13, '--fs-body': 15, '--fs-field': 16,
         '--fs-lead': 18, '--fs-title': 22, '--fs-head': 28, '--fs-display': 44}
DISPLAY_FROM = 32

src = open(PATH, encoding='utf8').read()
errors = []

# 1. the tokens are the scale
for name, px in SCALE.items():
    m = re.search(re.escape(name) + r':\s*([0-9.]+)px', src)
    if not m:
        errors.append(f'{name} is not defined in :root')
    elif float(m.group(1)) != px:
        errors.append(f'{name} is {m.group(1)}px; the scale says {px}px (change the scale on purpose, here and in PROGRAM-APP.md)')

# 2. every px size under the display threshold is a token instead
line_of = lambda i: src.count('\n', 0, i) + 1
pat = re.compile(r'font-size:\s*([0-9.]+)px|font:\s*(?:italic\s+)?(?:(?:[0-9]{3}|bold|normal)\s+)?([0-9.]+)px')
for m in pat.finditer(src):
    px = float(m.group(1) or m.group(2))
    line = src[src.rfind('\n', 0, m.start()) + 1:src.find('\n', m.end())]
    if px < 11:
        errors.append(f'line {line_of(m.start())}: {px:g}px is under the 11 px floor (A11Y-01)')
    elif px < DISPLAY_FROM and '/* display' not in line:
        ctx = src[max(0, src.rfind('\n', 0, m.start()) + 1):src.find('\n', m.end())].strip()
        errors.append(f'line {line_of(m.start())}: {px:g}px is off the scale; use a --fs- token ({ctx[:90]})')

# 3. a size written in em/rem/% under the scale would dodge the check: none are used, keep it so
for m in re.finditer(r'font-size:\s*([0-9.]+)(em|rem|%)', src):
    errors.append(f'line {line_of(m.start())}: font-size in {m.group(2)}; use a --fs- token')

if errors:
    print('check_type_scale: FAIL')
    for e in errors:
        print('  ' + e)
    sys.exit(1)
on_scale = src.count('var(--fs-')
print(f'check_type_scale: OK ({on_scale} sizes on the scale)')
