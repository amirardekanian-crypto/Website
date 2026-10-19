#!/usr/bin/env python3
"""Keep the doc layers small and their cross-references alive.

Why this exists (2026-10-19, the doc restructure): `CLAUDE.md` had grown to 99 KB and
loads before every session's first message, and `PROGRAM-APP.md` to 292 KB, so changing
one exercise card meant reading 385 KB. The fix was four layers — the door, the rules,
the per-section reference, the record (`docs/README.md`) — and the fix only holds if
nothing swells back. This is the ratchet, the same idea as `scripts/check_site_style.py`:
a baseline file records what is there today, and a commit that grows a file past its
ceiling, or leaves a dead cross-reference, is blocked.

What it checks:

  1. the door, `CLAUDE.md`, stays at or under 12 KB
  2. every `docs/rules/*.md` stays at or under 20 KB
  3. every index (the files that became one line per section) stays at or under 12 KB
  4. every reference section stays at or under 30 KB, unless the baseline already
     records it bigger (one does: a single phase-3 build record with no sub-headings)
  5. every relative markdown link in a tracked `.md` resolves, unless the baseline
     already records it dead
  6. every prose cross-reference — "PROGRAM-APP.md -> *The working card*", chained or
     not — names something that exists in that doc: a heading, a row of its index, or a
     bold lead-in, which is how this repo marks a sub-section
  7. a coaching rule ID cited in the new layer exists in the rule index — the check
     `scripts/check_rule_index.py` used to do for `CLAUDE.md`, which no longer holds
     those citations
  8. every rules file is listed in `docs/README.md` and in `MAP.md`, so the atlas and
     the layer index cannot go stale

Growing an area means splitting it, not swelling it. If a ceiling is genuinely wrong,
move the number here and say why in the commit — do not add the file to the baseline.

  python scripts/check_docs.py                     # exit 1 on any problem
  python scripts/check_docs.py --update-baseline   # re-record sizes and known dead links
  python scripts/check_docs.py --selftest          # prove the guard still fails on each fault

Standard library only. Runs from .githooks/pre-commit when any doc or this guard is staged.
"""
import json, os, re, sys, glob

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASELINE = os.path.join(REPO, 'scripts', 'docs_baseline.json')

DOOR = 'CLAUDE.md'
DOOR_MAX = 12 * 1024
RULES_GLOB = 'docs/rules/*.md'
RULES_MAX = 20 * 1024
INDEX_MAX = 12 * 1024
REF_MAX = 30 * 1024
INDEXES = ('PROGRAM-APP.md', 'HABITS.md', 'COACH_DASHBOARD.md', 'CODEBASE.md',
           'XP_SYSTEM.md', 'career/PROCEDURES.md', 'career/CAREER_MODE.md',
           'docs/README.md', 'docs/record/INDEX.md')
# the new layer took over CLAUDE.md's job of citing coaching rules
CITING = ('docs/rules/*.md', 'docs/README.md', 'docs/record/INDEX.md')
PRINCIPLES = os.path.join('.claude', 'COACHING-PRINCIPLES.md')
PREFIXES = ('INT', 'SEL', 'NAM', 'REC', 'SES', 'PRG', 'VOL', 'TST', 'COM', 'CUE', 'CHP', 'PRC')
RULE_ID = re.compile(r'\b(?:' + '|'.join(PREFIXES) + r')-\d+\b')
LINK = re.compile(r'\]\((?!https?:|mailto:|#)([^)\s]+?)(#[^)]*)?\)')

# A prose cross-reference: `PROGRAM-APP.md` → *The working card*, optionally chained
# (`PROCEDURES.md` → *Stage 73* → *To apply*). Every named part must exist in that doc,
# as a heading, as a row of its index, or as a bold lead-in — which is how this repo
# marks a sub-section when a heading would be too heavy.
POINTER = re.compile(r'`?\b([A-Za-z0-9_.-]+\.md)`?\s*(?:→|->)\s*'
                     r'\*([^*\n]{2,90})\*(?:\s*(?:→|->)\s*\*([^*\n]{2,90})\*)?')
# doc as written -> (its path, the folder its sections live in)
POINTED = {
    'PROGRAM-APP.md': ('PROGRAM-APP.md', 'docs/ref/program-app'),
    'HABITS.md': ('HABITS.md', 'docs/ref/habits'),
    'COACH_DASHBOARD.md': ('COACH_DASHBOARD.md', 'docs/ref/coach-dashboard'),
    'CODEBASE.md': ('CODEBASE.md', 'docs/ref/codebase'),
    'XP_SYSTEM.md': ('XP_SYSTEM.md', 'docs/ref/xp-system'),
    'PROCEDURES.md': ('career/PROCEDURES.md', 'docs/ref/career-procedures'),
    'CAREER_MODE.md': ('career/CAREER_MODE.md', 'docs/ref/career-mode'),
    'SCHEMA.md': ('SCHEMA.md', None),
    'QUESTS.md': ('QUESTS.md', None),
    'FARSI-PRODUCTS.md': ('FARSI-PRODUCTS.md', None),
    'COACHING-PRINCIPLES.md': ('.claude/COACHING-PRINCIPLES.md', None),
    'IMAGES.md': ('IMAGES.md', None),
    'CONTENT-PARITY.md': ('Content/CONTENT-PARITY.md', None),
    'DESIGN-ATLAS.md': ('Content/DESIGN-ATLAS.md', None),
    'DESIGN_SYSTEM.md': ('Content/DESIGN_SYSTEM.md', None),
    'SEO-SOP.md': ('.claude/SEO-SOP.md', None),
}

problems = []


def bad(m):
    problems.append(m)


def read(p):
    with open(os.path.join(REPO, p), encoding='utf-8', errors='replace') as f:
        return f.read()


def rel(p):
    return p.replace('\\', '/')


def md_files(root=None):
    """every tracked-looking .md, without the worktrees and node_modules"""
    out = []
    base = root or REPO
    for dirpath, dirnames, names in os.walk(base):
        dirnames[:] = [d for d in dirnames
                       if d not in ('node_modules', '.git', 'worktrees', 'audit-kit')]
        for n in names:
            if n.endswith('.md'):
                out.append(rel(os.path.relpath(os.path.join(dirpath, n), base)))
    return sorted(out)


def size(p):
    return os.path.getsize(os.path.join(REPO, p))


def rules_files():
    return sorted(rel(os.path.relpath(x, REPO))
                  for x in glob.glob(os.path.join(REPO, RULES_GLOB)))


def rule_ids():
    """the IDs in the rule index at the top of COACHING-PRINCIPLES.md"""
    head = read(PRINCIPLES).replace('\r\n', '\n').split('## The stories behind the rules')[0]
    out = set()
    for line in head.splitlines():
        m = re.match(r'^\|\s*([A-Z]{3}-\d+)\s*\|', line)
        if m:
            out.add(m.group(1))
    return out


def norm_head(s):
    """a heading, index row or bold lead-in, flattened for comparison"""
    s = s.lower()
    s = re.sub(r'\(\d{4}-\d{2}-\d{2}[^)]*\)', ' ', s)
    s = ''.join(c for c in s if c.isalnum() or c in ' -')
    return ' '.join(s.split())


def doc_parts(name):
    """every section name a pointer may legitimately use for this doc"""
    path, folder = POINTED[name]
    out = set()
    files = ([os.path.join(REPO, path)] if os.path.exists(os.path.join(REPO, path)) else [])
    if folder:
        files += glob.glob(os.path.join(REPO, folder, '**', '*.md'), recursive=True)
    for f in files:
        for line in open(f, encoding='utf-8', errors='replace'):
            if line.startswith('#'):
                out.add(norm_head(line.lstrip('#')))
            m = re.match(r'^\|\s*\d+\s*\|\s*\[([^\]]+)\]', line)      # an index row
            if m:
                out.add(norm_head(m.group(1)))
            m = re.match(r'^- \[([^\]]+)\]\(', line)                  # a sub-index row
            if m:
                out.add(norm_head(m.group(1)))
            for m in re.finditer(r'\*\*([^*]{2,110}?)\*\*', line):    # a bold lead-in
                out.add(norm_head(m.group(1)))
    return {h for h in out if h}


def stale_pointers(root=None):
    base = root or REPO
    cache, out = {}, []
    for f in md_files(root):
        for i, line in enumerate(open(os.path.join(base, f), encoding='utf-8',
                                      errors='replace'), 1):
            for m in POINTER.finditer(line):
                doc = m.group(1)
                if doc not in POINTED:
                    continue
                parts = cache.setdefault(doc, doc_parts(doc))
                for sec in (m.group(2), m.group(3)):
                    if not sec:
                        continue
                    n = norm_head(sec)
                    if not n or n == 'section':   # the illustration in each index's footer
                        continue
                    if not any(n == h or n in h or h in n for h in parts):
                        out.append([f, doc, sec])
    return out


def dead_links(root=None):
    base = root or REPO
    out = []
    for f in md_files(root):
        text = open(os.path.join(base, f), encoding='utf-8', errors='replace').read()
        for m in LINK.finditer(text):
            tgt = m.group(1)
            here = os.path.normpath(os.path.join(base, os.path.dirname(f), tgt))
            if not os.path.exists(here):
                out.append([f, tgt])
    return out


def check(root=None, baseline=None):
    """root is the repo unless the self-test passes a decoy tree"""
    global REPO
    was = REPO
    if root:
        REPO = root
    bl = baseline if baseline is not None else (
        json.load(open(BASELINE, encoding='utf-8')) if os.path.exists(BASELINE)
        else {'sizes': {}, 'dead_links': []})
    allow_big = bl.get('sizes', {})
    allow_dead = {tuple(x) for x in bl.get('dead_links', [])}

    # 1 the door
    if os.path.exists(os.path.join(REPO, DOOR)) and size(DOOR) > DOOR_MAX:
        bad(f'{DOOR} is {size(DOOR) // 1024} KB; the door is {DOOR_MAX // 1024} KB or less. '
            'It loads before every session\'s first message — move the detail into '
            'docs/rules/ and leave a READ-LIST row.')

    # 2 the rules files
    for p in rules_files():
        if size(p) > max(RULES_MAX, allow_big.get(p, 0)):
            bad(f'{p} is {size(p) // 1024} KB; a rules file is {RULES_MAX // 1024} KB or less. '
                'Split the area, do not swell the file.')

    # 3 the indexes
    for p in INDEXES:
        if os.path.exists(os.path.join(REPO, p)) and size(p) > max(INDEX_MAX, allow_big.get(p, 0)):
            bad(f'{p} is {size(p) // 1024} KB; an index is {INDEX_MAX // 1024} KB or less. '
                'It is one line per section — the prose belongs in the section.')

    # 4 the reference sections
    for p in sorted(md_files()):
        if not p.startswith('docs/ref/'):
            continue
        if size(p) > max(REF_MAX, allow_big.get(p, 0)):
            bad(f'{p} is {size(p) // 1024} KB; a reference section is {REF_MAX // 1024} KB or '
                'less. Split it at its own sub-headings into a folder with an INDEX.md.')

    # 5 the links
    for f, tgt in dead_links():
        if (f, tgt) not in allow_dead:
            bad(f'{f} links to {tgt}, which does not exist. Fix the link or the path.')

    # 6 prose cross-references name a section that exists
    allow_ptr = {tuple(x) for x in bl.get('stale_pointers', [])}
    for f, doc, sec in stale_pointers():
        if (f, doc, sec) not in allow_ptr:
            bad(f'{f} points at {doc} → *{sec}*, which is no heading, index row or bold '
                'lead-in in that doc. Name the section as it reads, or fix the doc.')

    # 7 cited coaching rule IDs
    if os.path.exists(os.path.join(REPO, PRINCIPLES)):
        known = rule_ids()
        for pat in CITING:
            for p in sorted(glob.glob(os.path.join(REPO, pat))):
                p = rel(os.path.relpath(p, REPO))
                for i, line in enumerate(read(p).replace('\r\n', '\n').splitlines(), 1):
                    for rid in RULE_ID.findall(line):
                        if rid not in known:
                            bad(f'{p}:{i} cites {rid}, which is not in the rule index '
                                f'({PRINCIPLES}).')

    # 8 the atlas and the layer index name every rules file
    rules = rules_files()
    for listing in ('docs/README.md', 'MAP.md'):
        if not os.path.exists(os.path.join(REPO, listing)):
            continue
        text = read(listing)
        for p in sorted(rules):
            if os.path.basename(p) not in text:
                bad(f'{listing} does not name {p}. Every rules file is listed in '
                    'docs/README.md and in MAP.md, or the atlas goes stale.')
    REPO = was
    return problems


def update_baseline():
    bl = {'sizes': {}, 'dead_links': sorted(dead_links()),
           'stale_pointers': sorted(stale_pointers())}
    for p in sorted(md_files()):
        over = ((p == DOOR and size(p) > DOOR_MAX)
                or (p.startswith('docs/rules/') and size(p) > RULES_MAX)
                or (p in INDEXES and size(p) > INDEX_MAX)
                or (p.startswith('docs/ref/') and size(p) > REF_MAX))
        if over:
            bl['sizes'][p] = size(p)
    json.dump(bl, open(BASELINE, 'w', encoding='utf-8', newline='\n'),
              indent=1, sort_keys=True)
    print(f'baseline written: {len(bl["sizes"])} oversize file(s), '
          f'{len(bl["dead_links"])} known dead link(s)')


def selftest():
    """Build a decoy tree and prove each fault is caught. No git, no network."""
    import tempfile, shutil
    global problems
    ok = True
    for name, build in FAULTS.items():
        d = tempfile.mkdtemp(prefix='checkdocs-')
        try:
            os.makedirs(os.path.join(d, 'docs', 'rules'))
            os.makedirs(os.path.join(d, 'docs', 'ref'))
            os.makedirs(os.path.join(d, 'docs', 'record'))
            os.makedirs(os.path.join(d, '.claude'))
            w = lambda p, t: open(os.path.join(d, p), 'w', encoding='utf-8').write(t)
            w('CLAUDE.md', 'door\n')
            w('docs/rules/one.md', 'a rule (PRC-1)\n')
            w('docs/README.md', 'one.md\n')
            w('MAP.md', 'one.md\n')
            w('docs/record/INDEX.md', 'record\n')
            w('SCHEMA.md', '# Schema\n\n## A real one\n\nbody\n')
            w('.claude/COACHING-PRINCIPLES.md',
              '| PRC-1 | a rule | design | |\n## The stories behind the rules\n')
            build(d, w)
            problems = []
            found = check(root=d, baseline={'sizes': {}, 'dead_links': []})
            if found:
                print(f'  ok   {name}: caught ({found[0][:70]}…)')
            else:
                print(f'  FAIL {name}: not caught')
                ok = False
        finally:
            shutil.rmtree(d, ignore_errors=True)
    problems = []
    return 0 if ok else 1


FAULTS = {
    'a swollen door': lambda d, w: w('CLAUDE.md', 'x' * (DOOR_MAX + 1)),
    'a swollen rules file': lambda d, w: w('docs/rules/one.md', 'x' * (RULES_MAX + 1)),
    'a swollen index': lambda d, w: w('docs/README.md', 'one.md\n' + 'x' * INDEX_MAX),
    'a swollen reference section': lambda d, w: w('docs/ref/big.md', 'x' * (REF_MAX + 1)),
    'a dead link': lambda d, w: w('docs/rules/one.md', 'see [gone](../nowhere.md)\n'),
    'an invented rule ID': lambda d, w: w('docs/rules/one.md', 'cites PRC-999\n'),
    'a rules file missing from MAP.md': lambda d, w: w('MAP.md', 'nothing here\n'),
    'a pointer at a section that is not there':
        lambda d, w: w('docs/rules/one.md', 'see `SCHEMA.md` -> *no such section here*\n'),
    'a pointer whose second level is not there':
        lambda d, w: w('docs/rules/one.md',
                       'see `SCHEMA.md` -> *a real one* -> *no such second level*\n'),
}


def main():
    if '--update-baseline' in sys.argv:
        update_baseline()
        return 0
    if '--selftest' in sys.argv:
        print('check_docs self-test:')
        return selftest()
    found = check()
    if found:
        print(f'docs: {len(found)} problem(s)')
        for p in found:
            print('  ' + p)
        print('\nThe layers are docs/README.md. A ceiling is a ratchet: split, do not swell.')
        return 1
    print('docs OK: the door, the rules files, the indexes, the reference, every link '
          'and every section pointer.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
