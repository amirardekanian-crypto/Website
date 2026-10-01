#!/usr/bin/env python3
"""build_menu.py — builds the Motion Menu page from the catalogue and the rendered media.

    python3 Content/motion/tools/catalog.py        (first: check + number the catalogue)
    node    Content/motion/tools/clips.js          (renders menu/clips + menu/posters through the reel engine)
    python3 Content/motion/tools/sounds.py         (renders menu/sounds + menu/sounds.json)
    python3 Content/motion/tools/build_menu.py     (this: menu/index.html, ready to publish as an Artifact)

Outputs
    menu/index.html       the page as the Artifact tool wants it (no doctype / html / head / body tags)
    menu/_preview.html    the same page wrapped as a full document, for opening locally (git-ignored)
    menu/files.json       every media file the page needs, by published path (the list handed to the Artifact tool)

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
            m = manifest.get(it['id'])
            c = it['clip']
            if not m:
                problems.append(f'{it["id"]}: no rendered clip or poster yet'); continue
            files.append(f'posters/{it["id"]}.jpg')
            if c.get('t1') is not None:
                files.append(f'clips/{it["id"]}.mp4')
        if it['kind'] == 'sound':
            if it['id'] not in sounds:
                problems.append(f'{it["id"]}: no rendered sound yet'); continue
            files.append(f'sounds/{it["id"]}.m4a')
    for f in files:
        if not (MENU / f).exists():
            problems.append(f'missing file {f}')
    if problems:
        for p in problems: print('PROBLEM', p)
        print(f'{len(problems)} problem(s). Fix them, then build again.')
        return 1

    clips = {k: {'dur': v.get('dur', 0), 'bytes': v.get('bytes', 0)} for k, v in manifest.items() if k in {i['id'] for i in items}}
    snd = {}
    for k, v in sounds.items():
        s = {'dur': v['dur'], 'peaks': v['peaks'], 'file': f'sounds/{k}.m4a'}
        if v.get('note'):
            s['note'] = v['note']
        snd[k] = s
    data = {'title': cat['title'], 'version': cat['version'], 'groups': cat['groups'], 'items': items, 'clips': clips, 'sounds': snd}
    blob = json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

    page = (HERE / 'tools' / 'page.html').read_text(encoding='utf-8')
    if '/*__DATA__*/' not in page:
        print('page.html has lost its data marker'); return 1
    page = page.replace('/*__DATA__*/', blob)
    (MENU / 'index.html').write_text(page, encoding='utf-8')
    (MENU / '_preview.html').write_text(WRAP.replace('{body}', page), encoding='utf-8')

    files = sorted(set(files))
    total = sum((MENU / f).stat().st_size for f in files)
    (MENU / 'files.json').write_text(json.dumps(files, indent=0) + '\n', encoding='utf-8')
    print(f'menu/index.html  {len(page) / 1024:.0f} KB   {len(items)} items')
    print(f'{len(files)} media files, {total / 1e6:.1f} MB   (clips {sum(f.startswith("clips/") for f in files)}, '
          f'posters {sum(f.startswith("posters/") for f in files)}, sounds {sum(f.startswith("sounds/") for f in files)})')
    return 0


if __name__ == '__main__':
    sys.exit(main())
