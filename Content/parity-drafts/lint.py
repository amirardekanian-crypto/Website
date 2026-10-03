# -*- coding: utf-8 -*-
"""Mechanical checks for a parity draft:  python lint.py <slug>   (folder Content/parity-drafts/<slug>/)"""
import json, re, sys
from pathlib import Path

d = Path(__file__).resolve().parent / sys.argv[1]
slug = sys.argv[1]
bad = []
try:
    en = json.loads((d / f'{slug}.json').read_text(encoding='utf-8'))
    fa = json.loads((d / f'{slug}.fa.json').read_text(encoding='utf-8'))
except Exception as e:
    print('JSON problem:', e); sys.exit(1)
if not (d / 'verify.md').exists():
    bad.append('verify.md is missing')

def texts(doc):
    for b in doc['blocks']:
        if b['type'] in ('p', 'h'):
            yield b['text']
        elif b['type'] == 'list':
            yield from b['items']
        elif b['type'] == 'callout':
            yield b['label']; yield b['text']
        elif b['type'] == 'workout':
            yield b.get('label', ''); yield b.get('meta', '')

et, ft = '\n'.join(texts(en)), '\n'.join(texts(fa))
words = len(re.findall(r"[A-Za-z0-9']+", et))
if en.get('id') != slug: bad.append('en id must equal the slug')
if en.get('date') != 'October 2026': bad.append('en date must be "October 2026"')
if not 600 <= words <= 1250: bad.append(f'en length {words} words (want 700-1100)')
if abs(en.get('readMins', 0) - round(words / 200)) > 1: bad.append(f'readMins {en.get("readMins")} vs {round(words/200)}')
if '—' in et or '–' in et: bad.append('en has an em/en dash (COM-3)')
if ';' in et: bad.append(f'en has {et.count(";")} semicolons (COM-3)')
if en['blocks'][0]['type'] != 'p': bad.append('first block must be p')
if en['blocks'][-1]['type'] != 'p' or not en['blocks'][-1]['text'].startswith('Based on'): bad.append('last block must be the "Based on" p')
if 'id' in fa or 'category' in fa: bad.append('fa must have NO id/category')
if fa.get('translationOf') != slug or fa.get('lang') != 'fa': bad.append('fa translationOf/lang wrong')
if len(en['blocks']) != len(fa['blocks']): bad.append(f'block counts {len(en["blocks"])} vs {len(fa["blocks"])}')
else:
    for i, (a, b) in enumerate(zip(en['blocks'], fa['blocks'])):
        if a['type'] != b['type']: bad.append(f'block {i}: type {a["type"]} vs {b["type"]}')
        if a['type'] == 'list' and len(a['items']) != len(b['items']): bad.append(f'block {i}: list items differ')
if re.search('[يك]', ft + fa.get('title', '')): bad.append('Arabic ي/ك in fa')
if re.search(r'(?:^|[\s«(])ن?می \S', ft): bad.append('fa has "می " with a normal space instead of a half-space')
if re.search('[0-9]', ft): bad.append('fa has Latin digits in the text (use ۰-۹)')
if '"' in ft: bad.append('fa has straight quotes (use «»)')
if '—' in ft: bad.append('fa has an em-dash')
st = fa.get('seoTitle', '')
if len(st) > 70 or not st.endswith('امیر اردکانیان'): bad.append(f'seoTitle ({len(st)} chars) must be <= ~65 and end with | امیر اردکانیان')
if not 110 <= len(fa.get('description', '')) <= 170: bad.append(f'description {len(fa.get("description",""))} chars (want 120-160)')
for k in ('title', 'seoTitle', 'description'):
    if not fa.get(k): bad.append(f'fa {k} missing')
print(f'{slug}: {words} words, {len(en["blocks"])} blocks, readMins {en.get("readMins")}')
print('OK' if not bad else 'PROBLEMS:\n  - ' + '\n  - '.join(bad))
sys.exit(1 if bad else 0)
