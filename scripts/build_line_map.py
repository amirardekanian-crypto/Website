#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Generate a line map for the three single-file apps and the service worker.

Why this exists (2026-10-19, after the doc restructure): program.html is 20,486 lines,
habits.html 12,831 and coach.html 9,613, all in one file each. The docs were just split
into a 8.7 KB door plus docs/rules, docs/ref and docs/record, so reading the docs is no
longer what costs a session its time — FINDING THE CODE is. Every edit used to start with
grep-and-guess through a 20,000-line file.

So this writes one map per file under docs/ref/line-map/: every top-level function with its
line number, grouped by the area of the app it belongs to, plus the named CSS blocks and the
top-level screen containers. It is reference, never rules: it points at code and restates
nothing. A map is worth having only if it is never wrong, so every line of it is derived
from the source file and the whole thing is regenerated rather than edited. Pre-commit
guard 26 fails a commit whose map is stale.

Each map file stays under the 30 KB ceiling that scripts/check_docs.py puts on a reference
section. When the rich form (a purpose beside each function, taken from the comment above
it) would cross that, the map is SPLIT BY AREA ("split, don't swell", docs/README.md): the
first file (program-app.md) keeps the screens, the style blocks and the first areas, with a
line at its top naming the continuation files (program-app-2.md, -3 ...) that hold the
rest. Every file is rich if it fits. Only a single area too big for one file falls back to
the terse form (name and line only, several to a row). Every choice is a function of the
input, so the output stays deterministic. The first file keeps its old name, so every link
to it still works. Pre-commit guard 26 runs --check, which compares every file this would
write and fails on a stale or missing one, or a leftover continuation file nothing writes.

Usage:
  python scripts/build_line_map.py            # write the maps
  python scripts/build_line_map.py --check     # fail if what is on disk is not what we would write
"""

import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join('docs', 'ref', 'line-map')

# (source file, map file, what it is)
SOURCES = [
    ('program.html', 'program-app.md', 'the athlete app (AA Performance)'),
    ('habits.html', 'habits.md', 'the habit app (AA Proof)'),
    ('coach.html', 'coach-dashboard.md', "the coach dashboard (Coach's Box)"),
    ('sw.js', 'service-worker.md', 'the service worker, in front of the whole origin'),
]

# The area a function belongs to, by what its name contains (lower-cased, first match wins).
# Order matters: 'sharecard' must be caught by the share row before the card row takes it.
AREAS = [
    ('Boot, sign-in and the saved plan', (
        'boot', 'signin', 'signout', 'showsign', 'auth', 'foldigits', 'typedpassword',
        'checktyped', '_sb', 'sbfor', 'fetchretry', 'plancache', 'planoffline', 'offline',
        'demo', 'preview', 'reallib')),
    ('Career Mode', (
        'career', 'xp', 'level', 'rank', 'achiev', 'hold', 'profile', 'earn', 'mark')),
    ('Share cards and wins', ('share', 'win', 'highlight', 'reel')),
    ('The check-in and RPE targets', (
        'rpe', 'checkin', 'readiness', 'sore', 'target', 'aswritten')),
    ('The set log, finishing and syncing', (
        'setlog', 'parseset', 'buildsession', 'carryset', 'session', 'queue', 'csq',
        'outbox', 'save', 'finish', 'done', 'sync', 'report', 'unfinished', 'stale',
        'countersign')),
    ('Personal records and body weight', (
        'ceiling', 'record', 'bodyweight', 'weight', 'renamed', 'alias')),
    ('Guided, the rest screen and the rest games', (
        'guid', 'rest', 'timer', 'clock', 'game', 'split', 'rally', 'between', 'pause')),
    ('The day screen and the exercise cards', (
        'card', 'fold', 'day', 'exercise', 'rx', 'chip', 'tempo', 'kg', 'tick', 'because',
        'note', 'circuit', 'superset', 'block', 'warm', 'checklist', 'sheetwrap')),
    ('Home', ('home', 'week', 'suggested', 'greet', 'nextup', 'cycleover', 'btpick')),
    ('Progress and the Game Plan', ('progress', 'plan', 'cycle', 'road', 'gameplan')),
    ('The Library', ('lib', 'playbook', 'workout', 'article', 'read')),
    ('Crew and the Bell', ('crew', 'bell', 'kudos', 'post', 'emoji')),
    ('The Spine and the Quality Map', (
        'spine', 'qual', 'pattern', 'muscle', 'bodypart', 'bodymap', 'impact', 'bmap')),
    ('Sheets, overlays and navigation', (
        'sheet', 'modal', 'overlay', 'toast', 'back', 'nav', 'layer', 'help', 'onb',
        'armed', 'screen', 'tab', 'goto', 'swipe', 'scroll')),
    ('The habits bridge and quests', ('hab', 'proof', 'quest', 'season', 'roster')),
    ('Video and pictures', ('yt', 'video', 'img', 'photo', 'poster', 'icon')),
    ('Reminders and push', ('push', 'remind', 'notif', 'subscri')),
    ('Talking to the server', (
        'supa', 'rpc', 'fetch', 'load', 'upload', 'cloud', 'token', 'selectall', 'write')),
    ('Formatting and small helpers', (
        'fmt', 'esc', 'jsq', 'num', 'pct', 'round', 'clamp', 'date', 'shamsi', 'pad',
        'cap', 'slug', 'norm', 'parse', 'sort', 'uniq', 'debounce', 'wait', 'sleep')),
]
OTHER = 'Everything else'

FUNC = re.compile(r'^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(')
ARROW = re.compile(r'^const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(')
COMMENT = re.compile(r'^\s*//\s?(.*)$')
SCREEN = re.compile(r'^<(?:div|section|main)\b[^>]*\bid="([a-z0-9][a-z0-9-]*)"')
SCREEN_CLASS = re.compile(r'\bclass="([^"]*)"')
DECOR = re.compile(r'[═─=_\-—•*]{2,}')
LETTERS = re.compile(r'[A-Za-z]{3}')

REF_CEILING = 30 * 1024
# A file is rich up to 1 KB under the ceiling. Past that the map is split by area into a second
# file (and a third ...), each rich if it fits (2026-10-25: program.html's map was 30,700 bytes
# terse). A file over the ceiling, even after splitting, is a hard error below.
RICH_BUDGET = REF_CEILING - 1024
PURPOSE_MAX = 78


def area_of(name):
    low = name.lower()
    for title, keys in AREAS:
        for k in keys:
            if k in low:
                return title
    return OTHER


# A comment that carries on from the line above it reads as a fragment beside a function
# name ("are untouched either way", "to window it"), which is worse than saying nothing.
CARRIES_ON = re.compile(
    r'^(and|or|but|so|that|which|who|whose|because|since|then|than|to|for|of|in|on|at|by|'
    r'with|as|is|are|was|were|be|been|has|have|had|it|its|this|these|those|near|plus)\b',
    re.I)


def clean_purpose(text):
    """a comment is only worth carrying if it is short, plain, whole and does not break a table"""
    t = text.strip()
    if not t or not LETTERS.search(t):
        return ''
    if DECOR.match(t):                       # a divider, not a sentence
        return ''
    if CARRIES_ON.match(t):                  # the tail of a sentence that started above
        return ''
    t = t.replace('|', '/').replace('`', "'").replace('—', '-')
    t = re.sub(r'\s+', ' ', t).strip(' -*')
    if len(t) > PURPOSE_MAX or t.endswith((',', 'and', 'or', 'the', 'a')):
        return ''
    return t


def parse(text):
    """functions, named style blocks and top-level screen containers, with line numbers"""
    lines = text.replace('\r\n', '\n').split('\n')
    funcs, blocks, screens = [], [], []
    in_style = False

    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        if stripped.startswith('<style'):
            in_style = True
        elif stripped.startswith('</style>'):
            in_style = False

        m = FUNC.match(line) or ARROW.match(line)
        if m:
            name = m.group(1)
            purpose = ''
            if i >= 2:
                above = COMMENT.match(lines[i - 2])
                # only a comment that stands alone: one sitting under another comment line is
                # the last line of a block, and its last line is rarely its point.
                alone = i < 3 or not COMMENT.match(lines[i - 3])
                if above and alone:
                    purpose = clean_purpose(above.group(1))
            funcs.append((name, i, purpose, area_of(name)))
            continue

        if in_style and ('═' in line or '─' in line) and '/*' in line:
            name = line.split('/*', 1)[1]
            name = name.split('*/')[0]
            name = DECOR.sub(' ', name)
            name = re.sub(r'\s+', ' ', name).strip()
            if name and LETTERS.search(name):
                blocks.append((name[:64], i))
            continue

        s = SCREEN.match(line)
        if s:
            cls = SCREEN_CLASS.search(line)
            screens.append((s.group(1), (cls.group(1) if cls else ''), i))

    return lines, funcs, blocks, screens


def grouped(funcs):
    order = [t for t, _ in AREAS] + [OTHER]
    out = []
    for title in order:
        rows = [f for f in funcs if f[3] == title]
        if rows:
            out.append((title, sorted(rows, key=lambda r: r[1])))
    return out


def part_name(out_name, k):
    """program-app.md, program-app-2.md, program-app-3.md ..."""
    if k == 1:
        return out_name
    stem, ext = os.path.splitext(out_name)
    return '%s-%d%s' % (stem, k, ext)


def render(src, what, lines, funcs, blocks, screens, rich, groups=None, part=1, names=None):
    up = '../../..'
    if groups is None:
        groups = grouped(funcs)
    names = names or [None]
    nparts = len(names)
    first = part == 1
    here = [f for _, rows in groups for f in rows]
    n = len(lines)
    head = [
        '# Line map — `%s`' % src,
        '',
        '> Generated by [`scripts/build_line_map.py`](%s/scripts/build_line_map.py). **Never hand-edit this file**'
        % up,
        '> — run the script. Pre-commit guard 26 blocks a commit whose map is stale.',
        '',
        '[`%s`](%s/%s) is %s, %s lines, and it is %s. This map names **%d top-level functions**'
        % (src, up, src, what, '{:,}'.format(n), 'one file', len(funcs)),
    ]
    tail = []
    if blocks and first:
        tail.append('**%d named style blocks**' % len(blocks))
    if screens and first:
        tail.append('**%d top-level screens**' % len(screens))
    if tail:
        head[-1] += ', ' + ' and '.join(tail)
    head[-1] += '. Jump by line number; a nested function is not listed, only the top level.'
    if nparts > 1:
        head[-1] = head[-1].replace('one file', 'one file, so its map is in %d parts' % nparts)
        others = ['[`%s`](%s)' % (names[k], names[k]) for k in range(nparts) if k != part - 1]
        head.append('')
        head.append('> **Part %d of %d.** The other part%s: %s. Each area is in exactly one part, in the order of the areas below.'
                    % (part, nparts, 's' if len(others) > 1 else '', ', '.join(others)))
        head.append('> This part holds %s%s. Its own count: %d functions.'
                    % ('the screens, the style blocks and ' if first else '', ', '.join(t for t, _ in groups), len(here)))
    if not rich:
        head += [
            '',
            '> Names and line numbers only. With each function\'s own comment beside it this file would be '
            '%d KB, over the %d KB a reference section may be ([`docs/README.md`](%s/docs/README.md)) — '
            'so open the function to see what it does.'
            % (len(render(src, what, lines, funcs, blocks, screens, True, groups, part, names).encode('utf-8')) // 1024,
               REF_CEILING // 1024, up),
        ]
    head.append('')

    body = []
    if screens and first:
        body += ['## The screens, in page order', '', '| `id` | class | line |', '|---|---|---|']
        for sid, cls, ln in screens:
            body.append('| `%s` | %s | %d |' % (sid, ('`%s`' % cls if cls else '—'), ln))
        body.append('')

    if blocks and first:
        body += ['## The named style blocks', '', '| block | line |', '|---|---|']
        for name, ln in blocks:
            body.append('| %s | %d |' % (name, ln))
        body.append('')

    body += ['## The functions, by area', '']
    for title, rows in groups:
        body.append('### %s' % title)
        body.append('')
        if rich:
            # the ones whose own comment says what they are, then the rest as a jump run:
            # 27% of program.html's functions carry a usable comment, and spelling out the
            # other 73% as empty bullets is what used to push this file over the ceiling.
            said = [r for r in rows if r[2]]
            bare = [r for r in rows if not r[2]]
            for name, ln, purpose, _ in said:
                body.append('- `%s()` **%d** — %s' % (name, ln, purpose))
            if bare:
                run = ['%s %d' % (name, ln) for name, ln, _, _ in bare]
                for k in range(0, len(run), 6):
                    body.append('- %s%s' % ('also: ' if k == 0 else '', ' · '.join(run[k:k + 6])))
        else:
            # a comma, not the middle dot of the rich form: it is 2 bytes a name, and 1,100 names are what brought this file to the ceiling (2026-10-24)
            run = ['%s %d' % (name, ln) for name, ln, _, _ in rows]
            for k in range(0, len(run), 6):
                body.append('- ' + ', '.join(run[k:k + 6]))
        body.append('')

    return '\n'.join(head + body).rstrip() + '\n'


def build_one(src, out_name, what):
    """one source file -> a list of (file name, page, mode); more than one when the rich form does not fit"""
    path = os.path.join(REPO, src)
    with open(path, encoding='utf-8', errors='replace') as fh:
        text = fh.read()
    lines, funcs, blocks, screens = parse(text)
    allgroups = grouped(funcs)

    def size(page):
        return len(page.encode('utf-8'))

    # the whole map in one file, if the rich form fits
    page = render(src, what, lines, funcs, blocks, screens, rich=True)
    if size(page) <= RICH_BUDGET:
        return [(out_name, page, 'rich')], len(funcs), len(blocks), len(screens)

    # otherwise pack whole areas, in order, into as few parts as the rich form allows. The part
    # count changes the header, so it is searched for: the smallest N where the greedy pack closes.
    for nparts in range(2, 9):
        names = [part_name(out_name, k) for k in range(1, nparts + 1)]
        parts, rest, ok = [], list(allgroups), True
        for k in range(1, nparts + 1):
            take = []
            while rest:
                trial = take + [rest[0]]
                if size(render(src, what, lines, funcs, blocks, screens, True, trial, k, names)) > RICH_BUDGET:
                    break
                take = trial
                rest = rest[1:]
            if not take:
                ok = False
                break
            parts.append(take)
        if ok and not rest:
            return ([(names[k], render(src, what, lines, funcs, blocks, screens, True, parts[k], k + 1, names), 'rich')
                     for k in range(nparts)], len(funcs), len(blocks), len(screens))

    # one single area is too big for a rich file: that is the only case left for the terse form
    page = render(src, what, lines, funcs, blocks, screens, rich=False)
    return [(out_name, page, 'terse')], len(funcs), len(blocks), len(screens)


def main():
    check = '--check' in sys.argv
    out_dir = os.path.join(REPO, OUT_DIR)
    if not check:
        os.makedirs(out_dir, exist_ok=True)

    stale, built, wanted = [], [], set()
    for src, out_name, what in SOURCES:
        files, nf, nb, ns = build_one(src, out_name, what)
        for name, page, mode in files:
            wanted.add(name)
            target = os.path.join(out_dir, name)
            size = len(page.encode('utf-8'))
            if size > REF_CEILING:
                print('  %s would be %d KB, over the %d KB reference ceiling'
                      % (name, size // 1024, REF_CEILING // 1024))
                return 1
            if check:
                have = ''
                if os.path.exists(target):
                    with open(target, encoding='utf-8') as fh:
                        have = fh.read()
                if have.replace('\r\n', '\n') != page:
                    stale.append(name)
            else:
                with open(target, 'w', encoding='utf-8', newline='\n') as fh:
                    fh.write(page)
            built.append('  %-22s %5d bytes  %s  (%s: %d functions, %d style blocks, %d screens)'
                         % (name, size, mode, src, nf, nb, ns))

    # a continuation file the generator no longer writes (the map shrank) must not linger
    if os.path.isdir(out_dir):
        for name in sorted(os.listdir(out_dir)):
            if name.endswith('.md') and name not in wanted:
                if check:
                    stale.append(name + ' (leftover)')
                else:
                    os.remove(os.path.join(out_dir, name))

    if check:
        if stale:
            print('line map STALE: ' + ', '.join(stale))
            print('Run: python scripts/build_line_map.py')
            return 1
        print('line map OK: %d files match their source files.' % len(wanted))
        return 0

    print('line map written to %s/' % OUT_DIR.replace('\\', '/'))
    for b in built:
        print(b)
    return 0


if __name__ == '__main__':
    sys.exit(main())
