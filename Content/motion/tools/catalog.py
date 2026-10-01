#!/usr/bin/env python3
"""catalog.py — checks the Motion Menu catalogue and keeps its numbers.

    python3 Content/motion/tools/catalog.py            check, give every new item its number, print a summary
    python3 Content/motion/tools/catalog.py --list     print every item: number, name, group
    python3 Content/motion/tools/catalog.py --check    check only, change nothing (what a hook would run)
    python3 Content/motion/tools/catalog.py --format   rewrite catalog.json in its tidy one-line-per-item layout

Why numbers live in their own file: catalog.json is edited by hand, one line per item, and names can change
whenever Amir likes. `numbers.json` is the ledger: id -> number, written once and never changed or reused,
so "keep 7" means the same item for ever. A new item gets the next free number. Removing an item leaves its
number retired (never handed to a different item).
"""
import json, re, sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent
CATALOG, LEDGER = HERE / 'catalog.json', HERE / 'numbers.json'

KINDS = {'visual', 'look', 'pair', 'feel', 'rule', 'sound'}
FARSI = {'none', 'yes', 'words'}            # none = no text, yes = text works as it is, words = the words change, the move stays
TABS = {'visual', 'reels', 'design', 'sound'}
NEEDS_CLIP = {'visual', 'look'}
ID_RE = re.compile(r'^[a-z0-9]+(-[a-z0-9]+)*$')
BAD_CHARS = ('—', '–')            # em and en dashes: Amir's house style is short sentences and plain stops


def load():
    return json.loads(CATALOG.read_text(encoding='utf-8'))


def dump(cat):
    """The tidy layout: header, one line per group, one line per item, a blank line between groups."""
    j = lambda o: json.dumps(o, ensure_ascii=False)
    out = ['{', f' "title": {j(cat["title"])},', f' "version": {j(cat["version"])},', f' "note": {j(cat["note"])},', ' "groups": [']
    out += [f'  {j(g)}' + (',' if i < len(cat['groups']) - 1 else '') for i, g in enumerate(cat['groups'])]
    out += [' ],', ' "items": [']
    lines, last = [], None
    for it in cat['items']:
        if last is not None and it['group'] != last:
            lines.append('')
        lines.append(f'  {j(it)},')
        last = it['group']
    for k in range(len(lines) - 1, -1, -1):                 # no comma after the last item
        if lines[k]:
            lines[k] = lines[k].rstrip(',')
            break
    out += lines + [' ]', '}', '']
    return '\n'.join(out)


def problems(cat):
    errs, warns = [], []
    gids = [g['id'] for g in cat['groups']]
    for d in [k for k, v in Counter(gids).items() if v > 1]:
        errs.append(f'group id used twice: {d}')
    for g in cat['groups']:
        if g.get('tab') not in TABS:
            errs.append(f'group {g["id"]}: tab must be one of {sorted(TABS)}')
    ids = [i['id'] for i in cat['items']]
    for d in [k for k, v in Counter(ids).items() if v > 1]:
        errs.append(f'item id used twice: {d}')
    names = Counter(i['name'].lower() for i in cat['items'])
    for n, k in names.items():
        if k > 1:
            errs.append(f'two items are both called "{n}"')
    sound_ids = {i['id'] for i in cat['items'] if i['kind'] == 'sound'}
    tab_of = {g['id']: g.get('tab') for g in cat['groups']}
    for it in cat['items']:
        w = it['id']
        if not ID_RE.match(w):
            errs.append(f'{w}: id must be lower-case words joined by hyphens')
        if it['group'] not in gids:
            errs.append(f'{w}: unknown group {it["group"]}')
        if it['kind'] not in KINDS:
            errs.append(f'{w}: kind must be one of {sorted(KINDS)}')
        if (it['kind'] == 'sound') != str(it['group']).startswith('snd-'):
            errs.append(f'{w}: sounds live in the snd- groups, and only sounds do')
        if it['kind'] == 'sound' and tab_of.get(it['group']) != 'sound':
            errs.append(f'{w}: a sound sits in a group on the sound tab')
        if it.get('farsi', 'none') not in FARSI:
            errs.append(f'{w}: farsi must be one of {sorted(FARSI)}')
        for key in ('name', 'label'):
            if not str(it.get(key, '')).strip():
                errs.append(f'{w}: {key} is empty')
            if any(c in str(it.get(key, '')) for c in BAD_CHARS):
                errs.append(f'{w}: no dashes in {key}, use a full stop')
        if len(it['name']) > 22:
            warns.append(f'{w}: name is long ({len(it["name"])} letters)')
        if len(it['label']) > 130:
            warns.append(f'{w}: label is long ({len(it["label"])} letters)')
        for p in it.get('pairs', []):
            if p not in sound_ids:
                errs.append(f'{w}: pairs with "{p}", which is not a sound id')
        c = it.get('clip')
        if it['kind'] in NEEDS_CLIP and not c:
            errs.append(f'{w}: a {it["kind"]} item needs a clip window')
        if c:
            t0, t1 = c.get('t0'), c.get('t1')
            if t0 is None or not (0 <= t0 <= 15):
                errs.append(f'{w}: clip t0 must be inside 0-15 s')
            if t1 is not None and not (t0 < t1 <= 15):
                errs.append(f'{w}: clip t1 must be after t0 and inside 15 s')
            if 'crop' in c and not (len(c['crop']) == 3 and c['crop'][2] >= 120):
                errs.append(f'{w}: crop is [centreX, centreY, width], width at least 120')
        if it['kind'] == 'look' and not it.get('swatches'):
            errs.append(f'{w}: a look needs swatches')
        if it['kind'] == 'pair' and not it.get('faces'):
            errs.append(f'{w}: a type pair needs faces')
        if it['kind'] == 'feel' and not it.get('ease'):
            errs.append(f'{w}: a feel needs an ease')
    return errs, warns


def number(cat, write=True):
    ledger = json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else {'next': 1, 'numbers': {}}
    nums, nxt, new = ledger['numbers'], ledger['next'], []
    for it in cat['items']:
        if it['id'] not in nums:
            nums[it['id']] = nxt
            new.append((nxt, it['id']))
            nxt += 1
    ledger['next'] = nxt
    if write and new:
        LEDGER.write_text(json.dumps({'note': 'id -> number. Written once, never changed, never reused.', 'next': nxt, 'numbers': nums}, indent=1) + '\n', encoding='utf-8')
    return nums, new


def main():
    cat = load()
    if '--format' in sys.argv:
        CATALOG.write_text(dump(cat), encoding='utf-8')
        print('catalog.json rewritten in the tidy layout')
    errs, warns = problems(cat)
    for w in warns:
        print('warn ', w)
    for e in errs:
        print('FAIL ', e)
    if errs:
        print(f'{len(errs)} problem(s). Nothing numbered.')
        return 1
    nums, new = number(cat, write='--check' not in sys.argv)
    if '--check' in sys.argv:
        missing = [i['id'] for i in cat['items'] if i['id'] not in nums]
        if missing:
            print('FAIL  not numbered yet:', ', '.join(missing))
            return 1
    if '--list' in sys.argv:
        gname = {g['id']: g['name'] for g in cat['groups']}
        for it in cat['items']:
            print(f'{nums[it["id"]]:>4}  {it["name"]:<20} {gname[it["group"]]}')
    kinds = Counter(i['kind'] for i in cat['items'])
    print(f'ok: {len(cat["items"])} items in {len(cat["groups"])} groups ({", ".join(f"{k} {v}" for k, v in sorted(kinds.items()))}); {len(new)} newly numbered')
    return 0


if __name__ == '__main__':
    sys.exit(main())
