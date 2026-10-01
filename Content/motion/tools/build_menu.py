#!/usr/bin/env python3
"""build_menu.py — makes a LOCAL PREVIEW of the lab's catalogue (183 pieces) and checks that every clip, poster and sound it names has been rendered.

    python3 Content/motion/tools/catalog.py        (first: check + number the catalogue)
    node    Content/motion/tools/clips.js          (renders menu/clips + menu/posters through the reel engine)
    python3 Content/motion/tools/sounds.py         (renders menu/sounds + menu/sounds.json)
    python3 Content/motion/tools/build_menu.py     (this: menu/_preview.html, for looking at the lab's pieces)

THIS IS NOT THE LIVE PAGE (retired as a publisher on 2026-10-01, Amir: "one source"). The live Motion Menu is built from ONE place, the /cut skill's
.claude/skills/cut/kit/menu/menu.json, by .claude/skills/cut/tools/menu_patch.py (see .claude/skills/cut/kit/MENU.md and the note at the top of Content/motion/README.md).
It used to write menu/index.html and menu/files.json for the Artifact tool; it no longer does, so there is nothing here to publish over the live page.

Output
    menu/_preview.html    the preview page wrapped as a full document, for opening locally (git-ignored)

The page is data driven: the catalogue is embedded as JSON and the page draws every card from it.
"""
import json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent.parent            # Content/motion
MENU = HERE / 'menu'
sys.path.insert(0, str(Path(__file__).resolve().parent))
import catalog as cat_mod                                  # noqa: E402

WRAP = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>html{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>'
        '</head><body>{body}</body></html>')


def main():
    cat = cat_mod.load()
    errs, _ = cat_mod.problems(cat)
    if errs:
        print('catalogue has problems, run catalog.py first'); [print(' ', e) for e in errs]; return 1
    nums, new = cat_mod.number(cat, write=False)
    if new:
        print('catalogue has un-numbered items, run catalog.py first'); return 1

    manifest = json.loads((MENU / 'clips.manifest.json').read_text()) if (MENU / 'clips.manifest.json').exists() else {}
    sounds = json.loads((MENU / 'sounds.json').read_text()) if (MENU / 'sounds.json').exists() else {}

    problems, files = [], []
    items = []
    for it in cat['items']:
        o = dict(it); o['no'] = nums[it['id']]
        items.append(o)
        if it['kind'] in ('visual', 'look'):
            c = it['clip']
            for key in [it['id']] + ([it['id'] + '.fa'] if c.get('fa') else []):
                if not manifest.get(key):
                    problems.append(f'{key}: no rendered clip or poster yet'); continue
                files.append(f'posters/{key}.jpg')
                if c.get('t1') is not None:
                    files.append(f'clips/{key}.mp4')
        if it['kind'] == 'sound':
            if it['id'] not in sounds:
                problems.append(f'{it["id"]}: no rendered sound yet'); continue
            files.append(f'sounds/{it["id"]}.mp3')
    for f in files:
        if not (MENU / f).exists():
            problems.append(f'missing file {f}')
    if problems:
        for p in problems: print('PROBLEM', p)
        print(f'{len(problems)} problem(s). Fix them, then build again.')
        return 1

    ids = {i['id'] for i in items}
    clips = {k: {'dur': v.get('dur', 0), 'bytes': v.get('bytes', 0)} for k, v in manifest.items() if k.split('.')[0] in ids}
    snd = {}
    for k, v in sounds.items():
        s = {'dur': v['dur'], 'peaks': v['peaks'], 'file': f'sounds/{k}.mp3'}
        if v.get('note'):
            s['note'] = v['note']
        snd[k] = s
    data = {'title': cat['title'], 'version': cat['version'], 'groups': cat['groups'], 'items': items, 'clips': clips, 'sounds': snd}
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

    page = (HERE / 'tools' / 'page.html').read_text(encoding='utf-8')
    if '/*__DATA__*/' not in page:
        print('page.html has lost its data marker'); return 1
    page = page.replace('/*__DATA__*/', blob)
    (MENU / '_preview.html').write_text(WRAP.replace('{body}', page), encoding='utf-8')

    files = sorted(set(files))
    total = sum((MENU / f).stat().st_size for f in files)
    print(f'menu/_preview.html  {len(page) / 1024:.0f} KB   {len(items)} items')
    print(f'{len(files)} media files, {total / 1e6:.1f} MB   (clips {sum(f.startswith("clips/") for f in files)}, '
          f'posters {sum(f.startswith("posters/") for f in files)}, sounds {sum(f.startswith("sounds/") for f in files)})')
    print('A LOCAL PREVIEW of the lab catalogue. NOT the live Motion Menu: that is built from .claude/skills/cut/kit/menu/menu.json. Do not publish this.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
