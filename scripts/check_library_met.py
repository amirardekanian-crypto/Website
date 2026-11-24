#!/usr/bin/env python
"""Every Library session carries its MET: python scripts/check_library_met.py

Amir, 2026-11-24: "add to the rule, that every session in the library needs to calculate this when uploading and add it". A session's
Move minutes (supabase/stage127 + stage129: minutes x MET / 4, minutes at 3 MET or more) come from its own `met`, read by the server's
move_lib_met() from its public.library row. A session without one falls back to its shelf's default, which may be wrong for it.

Each workouts/<shelf>/<slug>.json must carry
    "met": { "value": <0.9 to 23>, "code": "<5-digit 2024 Adult Compendium code>", "entry": "<the entry, verbatim>", "source": "2024 Adult Compendium" }
chosen from what the session IS, averaged over its rests (docs/ref/move-credit.md has the table and how to choose). Pre-commit guard 14b.
"""
import glob, json, re, sys

bad = []
files = sorted(glob.glob('workouts/*/*.json'))
for f in files:
    try:
        d = json.load(open(f, encoding='utf-8'))
    except Exception as e:
        bad.append(f'{f}: not valid JSON ({e})')
        continue
    m = d.get('met')
    if not isinstance(m, dict):
        bad.append(f'{f}: no "met". Look the session up in the 2024 Adult Compendium (pacompendium.com) and add '
                   '"met": {{ "value", "code", "entry", "source" }} after "countsAs" (docs/ref/move-credit.md).')
        continue
    v = m.get('value')
    if not isinstance(v, (int, float)) or isinstance(v, bool) or not (0.9 <= v <= 23):
        bad.append(f'{f}: met.value must be a number from 0.9 to 23, found {v!r}')
    if not isinstance(m.get('code'), str) or not re.fullmatch(r'\d{5}', m['code']):
        bad.append(f'{f}: met.code must be the 5-digit Compendium code, found {m.get("code")!r}')
    if not isinstance(m.get('entry'), str) or len(m['entry'].strip()) < 4:
        bad.append(f'{f}: met.entry must quote the Compendium entry')
    if m.get('source') != '2024 Adult Compendium':
        bad.append(f'{f}: met.source must be "2024 Adult Compendium", found {m.get("source")!r}')

if bad:
    print('check_library_met: %d problem(s):' % len(bad))
    for b in bad:
        print('  ' + b)
    sys.exit(1)
print('check_library_met: all %d Library sessions carry their MET.' % len(files))
