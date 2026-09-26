#!/usr/bin/env python3
"""Keep the coaching rulebook in one piece: the rule index, its stories, the checker, the skills.

Why this exists (2026-09-26, the pipeline audit): one rule ("reps are one number") was written
in about ten places and two of the copies said the opposite; a stale copy of another sent two
athletes to a screen that no longer existed. So each rule now has ONE owner, a numbered line in
the rule index at the top of .claude/COACHING-PRINCIPLES.md, and everything else cites its ID
(PRC-23). This script fails when the pieces stop agreeing:

  1. the index: IDs well formed and unique, every rule 25 words or fewer
  2. the stories: every index ID has at least one tagged story bullet, and every tag is a rule
  3. the Check column against scripts/check_program.py, which names a rule on every FAIL and
     WARN it prints: a ✓ rule must be cited by a fail(), a "warn" rule by a warn(), a "part"
     rule by either, an "oblig" rule through OBLIG_RULES with the keys the cell names, and a
     rule with a blank Check must not be cited at all (or the column is lying)
  4. every rule ID cited in the skills, the agents, CLAUDE.md, SCHEMA.md and the how-to exists

Standard library only. Runs from .githooks/pre-commit when any of those files is staged.

  python scripts/check_rule_index.py        # exit 1 on any problem
"""
import ast, glob, os, re, sys

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PRINCIPLES = os.path.join(REPO, '.claude', 'COACHING-PRINCIPLES.md')
CHECKER = os.path.join(REPO, 'scripts', 'check_program.py')
PREFIXES = ('INT', 'SEL', 'NAM', 'REC', 'SES', 'PRG', 'VOL', 'TST', 'COM', 'CUE', 'CHP', 'PRC')
ID = re.compile(r'\b(?:' + '|'.join(PREFIXES) + r')-\d+\b')
MAX_WORDS = 25
STORIES = '## The stories behind the rules'

problems = []
def bad(m): problems.append(m)

def read(p): return open(p, encoding='utf-8').read().replace('\r\n', '\n')

def parse_index(text):
    """{id: (rule, stage, check)} from the index tables above the stories."""
    head = text.split(STORIES)[0]
    rows = {}
    for line in head.splitlines():
        if not re.match(r'^\|\s*[A-Z]{3}-\d+\s*\|', line): continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) != 4:
            bad(f"index row has {len(cells)} cells, not 4 (a '|' inside a rule?): {line[:80]}"); continue
        rid, rule, stage, check = cells
        if not re.fullmatch(r'(?:' + '|'.join(PREFIXES) + r')-\d+', rid): bad(f"{rid}: not a known prefix")
        if rid in rows: bad(f"{rid}: two rows with the same ID")
        n = len(rule.split())
        if n > MAX_WORDS: bad(f"{rid}: {n} words, the index line is {MAX_WORDS} or fewer (detail goes in the story)")
        if not stage: bad(f"{rid}: no stage")
        rows[rid] = (rule, stage, check)
    if not rows: bad('no rule index found above "' + STORIES + '"')
    return rows

def story_tags(text):
    if STORIES not in text:
        bad('no "' + STORIES + '" heading'); return {}
    tags = {}
    for line in text.split(STORIES, 1)[1].splitlines():
        if not line.startswith('- '): continue
        m = re.match(r'- ((?:`[A-Z]{3}-\d+` )+)', line)
        if not m:
            bad(f"story bullet with no rule tag: {line[:80]}"); continue
        for rid in re.findall(r'`([A-Z]{3}-\d+)`', m.group(1)):
            tags[rid] = tags.get(rid, 0) + 1
    return tags

def checker_citations():
    """IDs cited by fail() and warn() calls, and OBLIG_RULES {key: id}, read with ast."""
    src = read(CHECKER)
    tree = ast.parse(src)
    cited = {'fail': set(), 'warn': set()}
    oblig = {}
    for n in ast.walk(tree):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in cited:
            for a in n.args[1:]:
                if isinstance(a, ast.Constant) and isinstance(a.value, str):
                    cited[n.func.id].add(a.value)
        if (isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == 'OBLIG_RULES' for t in n.targets)
                and isinstance(n.value, ast.Dict)):
            for k, v in zip(n.value.keys, n.value.values):
                oblig[k.value] = v.value
    # the obligations FAIL passes OBLIG_RULES[k], so every value there is a fail() citation too
    cited['fail'] |= set(oblig.values())
    return cited, oblig

def check_column(rows, cited, oblig):
    every = cited['fail'] | cited['warn']
    for rid in sorted(every - set(rows)):
        bad(f"check_program.py cites {rid}, which is not in the rule index")
    for rid, (rule, stage, check) in rows.items():
        plain = re.sub(r'\(.*?\)', '', check).strip()
        if not plain:
            if rid in every: bad(f"{rid}: the checker enforces it, but its Check column is blank")
            continue
        if '✓' in plain and rid not in cited['fail']:
            bad(f"{rid}: Check says ✓, but no fail() in check_program.py cites it")
        if plain.startswith('warn') and rid not in cited['warn']:
            bad(f"{rid}: Check says warn, but no warn() in check_program.py cites it")
        if plain.startswith('part') and rid not in every:
            bad(f"{rid}: Check says part, but check_program.py never cites it")
        if 'oblig' in plain:
            keys = re.findall(r'`([a-z0-9-]+)`', check)
            if not keys: bad(f"{rid}: Check says oblig but names no obligation key")
            for k in keys:
                if oblig.get(k) != rid:
                    bad(f"{rid}: obligation `{k}` maps to {oblig.get(k)!r} in OBLIG_RULES, not {rid}")
        if not any(w in plain for w in ('✓', 'warn', 'part', 'oblig')):
            bad(f"{rid}: Check column {check!r} is not ✓, warn, part, oblig or blank")
    for k, rid in oblig.items():
        c = rows.get(rid, ('', '', ''))[2]
        if rid in rows and 'oblig' not in c and '✓' not in c:
            bad(f"OBLIG_RULES['{k}'] -> {rid}, whose Check column says neither oblig nor ✓")

def cited_elsewhere(rows):
    files = (glob.glob(os.path.join(REPO, '.claude', 'skills', '**', '*.md'), recursive=True)
             + glob.glob(os.path.join(REPO, '.claude', 'agents', '*.md'))
             + [os.path.join(REPO, p) for p in ('CLAUDE.md', 'SCHEMA.md', os.path.join('.claude', 'COACHING-HOWTO.md'),
                                                 os.path.join('.claude', 'COACHING-PRINCIPLES.md'))])
    for f in files:
        if not os.path.exists(f): continue
        for i, line in enumerate(read(f).splitlines(), 1):
            for rid in ID.findall(line):
                if rid not in rows:
                    bad(f"{os.path.relpath(f, REPO)}:{i} cites {rid}, which is not in the rule index")

def main():
    text = read(PRINCIPLES)
    rows = parse_index(text)
    tags = story_tags(text)
    for rid in rows:
        if rid not in tags: bad(f"{rid}: no story bullet tagged `{rid}` below the index")
    for rid in tags:
        if rid not in rows: bad(f"a story is tagged `{rid}`, which is not in the rule index")
    cited, oblig = checker_citations()
    check_column(rows, cited, oblig)
    cited_elsewhere(rows)
    if problems:
        print(f"rule index: {len(problems)} problem(s)")
        for p in problems: print('  ' + p)
        return 1
    enforced = sum(1 for r in rows.values() if r[2])
    print(f"rule index OK: {len(rows)} rules, {enforced} backed by check_program.py, every one with a story")
    return 0

if __name__ == '__main__':
    sys.exit(main())
