"""Start a new timeline reel from the kit: a working 9-second starter in Amir's brand, in its own folder, ready to edit.

    python .claude/skills/reel/timeline/new_reel.py <slug> [--title "..."] [--number N] [--out Content]

Creates Content/reel-<N>-<slug>/ :
    src/     engine.js, driver.js, scenes.js (the starter: edit this), reel<N>.template.html (DOM + CSS), build_reel.py
    assets/  fonts/Vazirmatn-Variable.woff2  (put pictures, captures, plates here)
    export/  (git-ignored: MP4s)       README.md (decisions, scene map, copy-to-source: fill it in as you go)
The kit is COPIED, not linked, so a shipped reel keeps working when the kit moves on ("never retro-edit a shipped reel").
The tools stay shared in .claude/skills/reel/tools/ . N defaults to the next free number.
"""
import os, re, shutil, sys

KIT = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.normpath(os.path.join(KIT, '..', '..', '..', '..'))


def arg(name, default=None):
    a = sys.argv
    return a[a.index(name) + 1] if name in a else default


def main():
    pos = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and not sys.argv[i - 1].startswith('--')]
    if not pos:
        print(__doc__); sys.exit(2)
    slug = re.sub(r'[^a-z0-9-]+', '-', pos[0].lower()).strip('-')
    out_root = os.path.normpath(os.path.join(REPO, arg('--out', 'Content'))) if not os.path.isabs(arg('--out', 'Content')) else arg('--out')
    nums = [int(m.group(1)) for d in os.listdir(out_root) for m in [re.match(r'reel-(\d+)-', d)] if m] if os.path.isdir(out_root) else []
    n = int(arg('--number', (max(nums) + 1) if nums else 1))
    title = arg('--title', f'ریل {n} — {slug}')
    folder = os.path.join(out_root, f'reel-{n}-{slug}')
    if os.path.exists(folder):
        sys.exit(f'{folder} already exists (never overwrite a reel: pick another slug or --number)')
    for d in ('src', 'assets/fonts', 'export'):
        os.makedirs(os.path.join(folder, d))
    for f in ('engine.js', 'driver.js', 'build_reel.py'):
        shutil.copy(os.path.join(KIT, f), os.path.join(folder, 'src', f))
    shutil.copy(os.path.join(KIT, 'starter.scenes.js'), os.path.join(folder, 'src', 'scenes.js'))
    t = open(os.path.join(KIT, 'starter.template.html'), encoding='utf-8').read().replace('%%TITLE%%', title)
    open(os.path.join(folder, 'src', f'reel{n}.template.html'), 'w', encoding='utf-8', newline='\n').write(t)
    font = os.path.join(REPO, 'assets', 'fonts', 'Vazirmatn-Variable.woff2')
    if os.path.exists(font):
        shutil.copy(font, os.path.join(folder, 'assets', 'fonts', 'Vazirmatn-Variable.woff2'))
    else:
        print('NOTE: assets/fonts/Vazirmatn-Variable.woff2 not found in the repo: put the font in the new reel\'s assets/fonts/')
    r = open(os.path.join(KIT, 'README.template.md'), encoding='utf-8').read().replace('%%N%%', str(n)).replace('%%SLUG%%', slug).replace('%%TITLE%%', title)
    open(os.path.join(folder, 'README.md'), 'w', encoding='utf-8', newline='\n').write(r)
    rel = os.path.relpath(folder, REPO).replace('\\', '/')
    tools = '.claude/skills/reel/tools'
    print(f'created {rel}/  (reel number {n})\n')
    print('next:')
    print(f'  python {tools}/setup_tools.py                                   # once per PC: node, ffmpeg, Edge, playwright-core')
    print(f'  node {tools}/still.js {rel}/src/reel{n}.template.html OUT 0.5 3.5 6.5     # frozen frames; python {tools}/sheet.py sheet.png 3 360 OUT/t_*.png')
    print(f'  node {tools}/render_timeline.js {rel}/src/reel{n}.template.html OUT/draft.mp4 --draft')
    print(f'  node {tools}/safe_audit.js {rel}/src/reel{n}.template.html')
    print(f'  PYTHONIOENCODING=utf-8 python {rel}/src/build_reel.py          # -> {os.path.dirname(rel) or "."}/reel-{n}-{slug}.html')
    print('  then read .claude/skills/reel/timeline/README.md (the playbook) and replace the starter scenes.')


if __name__ == '__main__':
    main()
