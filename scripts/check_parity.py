#!/usr/bin/env python3
"""One word list, many copies: the shared vocab of the Spine and the Quality Map, checked for agreement.

Why this exists (2026-09-26, the pipeline audit): the same lists are typed out in program.html,
coach.html, scripts/check_program.py, .claude/skills/spine/draft_sql.py, the supabase/stage*.sql
source and the live database's constraints. The muscle list alone is in four places, and when one
copy drifts nothing errors: coach.html offers a word the database refuses, or the checker counts a
muscle the dashboard cannot save. This prints every list's copies side by side and FAILs on any
disagreement.

  qualities    the ten, in sort order (check_program, draft_sql, coach QM_IDS, stage32, the db)
  muscles      the Spine's volume credits (check_program, draft_sql, coach, stage39, the db function)
  patterns     the Spine patterns (draft_sql, coach, program.html), plus the subsets that must sit
               inside them (check_program UNLOADED_PATTERNS, program.html RECORD_PATTERNS)
  flags        restriction flags (draft_sql, coach)
  regions      body parts (draft_sql, coach, program.html, stage36, the db; the course app's ids ⊆)
  impacts      (draft_sql, coach, program.html, stage36, the db, the course app)
  costs        the cost tiers and their weights (check_program, draft_sql, coach, stage39, the db)
  art words    cycle pictures (program.html APP_ART and CYCLE_ART_RULES, coach QM_ART + QM_PHASE,
               SCHEMA.md), and the art -> headline quality map (check_program, coach, the db's
               qualities.family, whose phase words bedrock/peak/reset carry no headline on purpose)
  quality mix  the numbers of the mix rule (coverage 0.7, the 1.5 floor, the 12% share, a second
               quality at half, one set per 600 s of a timed effort) in program.html, coach.html and
               check_program.py

The database half is a committed copy, supabase/word_lists_snapshot.json, because a commit hook
cannot reach the server. To refresh it (--live), run this read-only query with the Supabase MCP:

    select json_build_object(
      'qualities', (select json_agg(id order by sort) from public.qualities),
      'quality_family', (select json_object_agg(id, family) from public.qualities),
      'constraints', (select json_object_agg(conname, pg_get_constraintdef(oid)) from pg_constraint
                      where conname in ('exercises_impact_check', 'exercises_loads_check', 'exercise_coach_cost_ok')),
      'credits_fn', pg_get_functiondef('public.spine_credits_ok(jsonb)'::regprocedure)) as lists;

save the result to a file and run  python scripts/check_parity.py --live <file>

Needs node (the app lists are JavaScript). Runs from .githooks/pre-commit when any copy is staged.

  python scripts/check_parity.py         # exit 1 on any disagreement
"""
import ast, datetime, json, os, re, subprocess, sys

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(REPO, *a)
PROGRAM, COACH, CHECKER = P('program.html'), P('coach.html'), P('scripts', 'check_program.py')
DRAFT, SCHEMA, COURSE = P('.claude', 'skills', 'spine', 'draft_sql.py'), P('SCHEMA.md'), P('tennis', 'app', 'app.js')
SNAP = P('supabase', 'word_lists_snapshot.json')
PHASES = {'bedrock', 'peak', 'reset'}  # art words that name a phase, not a quality (coach QM_PHASE)

fails = []
def fail(m): fails.append(m)
def read(p): return open(p, encoding='utf-8').read().replace('\r\n', '\n')

# ── pulling the copies out ────────────────────────────────────────────────────
def literal_end(src, i):
    """Index just past the JS expression at src[i]: nested brackets, strings, comments and regex
    literals skipped; stops at a depth-0 ';' or newline."""
    depth, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in '\'"`':
            q = c; i += 1
            while i < n and src[i] != q: i += 2 if src[i] == '\\' else 1
            i += 1; continue
        if src.startswith('//', i): i = src.index('\n', i); continue
        if src.startswith('/*', i): i = src.index('*/', i) + 2; continue
        if c == '/' and re.search(r'[:(,=\[]\s*$', src[max(0, i - 20):i]):  # a regex literal
            i += 1; cls = False
            while i < n and (src[i] != '/' or cls):
                if src[i] == '\\': i += 1
                elif src[i] == '[': cls = True
                elif src[i] == ']': cls = False
                i += 1
            i += 1; continue
        if c in '[{(': depth += 1
        elif c in ']})': depth -= 1
        elif depth == 0 and c in ';\n': return i
        i += 1
    return i

def js_consts(path, names):
    src = read(path)
    decls = []
    for nm in names:
        m = re.search(r'^\s*const\s+' + nm + r'\s*=\s*', src, re.M)
        if not m: fail(f"{os.path.relpath(path, REPO)}: const {nm} not found (renamed? update scripts/check_parity.py)"); continue
        decls.append(f"const {nm} = " + src[m.end():literal_end(src, m.end())] + ';')
    found = [n for n in names if re.search(r'^\s*const\s+' + n + r'\s*=', src, re.M)]
    js = '\n'.join(decls) + '\nprocess.stdout.write(JSON.stringify({' + ','.join(found) + '}));'
    try:
        r = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8', cwd=REPO, timeout=60)
    except FileNotFoundError:
        print('check_parity: node was not found; the app lists are JavaScript. Install node.'); sys.exit(1)
    if r.returncode != 0:
        print(f"check_parity: node could not read the lists in {os.path.relpath(path, REPO)}:\n{r.stderr[:800]}"); sys.exit(1)
    return json.loads(r.stdout)

def py_consts(path, names):
    tree = ast.parse(read(path))
    out = {}
    for n in tree.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name) and n.targets[0].id in names:
            out[n.targets[0].id] = ast.literal_eval(n.value)
    for nm in names:
        if nm not in out: fail(f"{os.path.relpath(path, REPO)}: {nm} not found (renamed? update scripts/check_parity.py)")
    return out

def sql_words(text, anchor, stop=r'\)'):
    """The quoted words in the SQL after `anchor`, up to the first `stop`."""
    m = re.search(anchor + r'(.*?)' + stop, text, re.S)
    return re.findall(r"'([a-z-]+)'", m.group(1)) if m else None

def one_number(path, pattern, label):
    m = re.search(pattern, read(path))
    if not m: fail(f"{os.path.relpath(path, REPO)}: could not find {label} (the rule's code changed shape? update scripts/check_parity.py)"); return None
    return float(m.group(1))

# ── comparing ─────────────────────────────────────────────────────────────────
def show(label, copies, ordered=False):
    """copies: {where: list or None}. Prints each copy; FAILs when any two disagree."""
    have = {k: v for k, v in copies.items() if v is not None}
    for k, v in copies.items():
        if v is None: fail(f"{label}: could not read the copy in {k}")
    norm = lambda v: tuple(v) if ordered else tuple(sorted(set(v)))
    ref_key = next(iter(have), None)
    agree = all(norm(v) == norm(have[ref_key]) for v in have.values())
    print(f"{'OK  ' if agree else 'DIFF'} {label} ({len(have)} copies{', in order' if ordered else ''})")
    if agree:
        print(f"       {', '.join(have[ref_key]) if ref_key else '-'}")
        return
    union = set().union(*map(set, have.values()))
    for k, v in have.items():
        miss, extra = sorted(union - set(v)), []
        line = f"       {k}: {len(v)}"
        if miss: line += f"  missing {', '.join(miss)}"
        if ordered and not miss and list(v) != list(have[ref_key]): line += f"  order {', '.join(v)}"
        print(line)
    fail(f"{label}: the copies disagree (see the list above)")

def subset(label, part, whole, where):
    extra = sorted(set(part) - set(whole))
    if extra: fail(f"{label}: {where} has {', '.join(extra)}, which is not in the list")
    else: print(f"OK   {label} ⊆ the list ({where})")

def same_map(label, maps):
    have = {k: v for k, v in maps.items() if v is not None}
    first = next(iter(have.values()))
    if all(v == first for v in have.values()):
        print(f"OK   {label} ({len(have)} copies)\n       " + ', '.join(f"{a}→{b}" for a, b in sorted(first.items())))
    else:
        print(f"DIFF {label}")
        for k, v in have.items(): print(f"       {k}: " + ', '.join(f"{a}→{b}" for a, b in sorted(v.items())))
        fail(f"{label}: the copies disagree")

def same_num(label, nums):
    have = {k: v for k, v in nums.items() if v is not None}
    vals = set(have.values())
    print(f"{'OK  ' if len(vals) <= 1 else 'DIFF'} {label}: " + ' · '.join(f"{k} {v:g}" for k, v in have.items()))
    if len(vals) > 1: fail(f"{label}: the copies disagree")

def main():
    if len(sys.argv) >= 3 and sys.argv[1] == '--live': refresh(sys.argv[2])
    elif len(sys.argv) > 1: print(__doc__); return 2
    snap = json.load(open(SNAP, encoding='utf-8'))
    db = f"the db (snapshot {snap.get('read_at')})"
    cp = py_consts(CHECKER, ['QUALITIES', 'ART_HEADLINE', 'MUSCLES', 'MUSCLE_ALIAS', 'COST', 'UNLOADED_PATTERNS'])
    ds = py_consts(DRAFT, ['PATTERNS', 'FLAGS', 'QUALITIES', 'REGIONS', 'IMPACTS', 'MUSCLES', 'COSTS'])
    co = js_consts(COACH, ['SPINE_PATTERNS', 'SPINE_FLAGS', 'SPINE_REGIONS', 'SPINE_IMPACTS', 'SPINE_MUSCLES',
                           'SPINE_MUSCLE_ALIAS', 'SPINE_COSTS', 'QM_IDS', 'QM_ART', 'QM_PHASE'])
    pr = js_consts(PROGRAM, ['SPINE_PATTERN', 'SPINE_REGION', 'SPINE_IMPACT', 'RECORD_PATTERNS', 'APP_ART', 'CYCLE_ART_RULES'])
    tn = js_consts(COURSE, ['REGION_FA', 'IMPACT_FA'])
    s32, s36, s39 = (read(P('supabase', f)) for f in ('stage32_qualities.sql', 'stage36_body_parts.sql', 'stage39_spine_credits.sql'))
    g = lambda d, k, f=lambda x: x: f(d[k]) if k in d else None

    show('qualities', {'check_program': cp.get('QUALITIES'), 'draft_sql': ds.get('QUALITIES'), 'coach QM_IDS': co.get('QM_IDS'),
                       'stage32 sql': re.findall(r"^ \('([a-z]+)','", s32, re.M) or None, db: snap.get('qualities')}, ordered=True)
    muscles = cp.get('MUSCLES') or []
    show('muscles (Spine credits)', {'check_program': g(cp, 'MUSCLES', list), 'draft_sql': g(ds, 'MUSCLES', list),
                                     'coach SPINE_MUSCLES': co.get('SPINE_MUSCLES'),
                                     'stage39 sql': sql_words(s39, r'where e\.k not in \('), db: snap.get('muscles')})
    subset('muscle aliases', list(cp.get('MUSCLE_ALIAS', {}).values()), muscles, 'check_program MUSCLE_ALIAS')
    subset('muscle aliases', list(co.get('SPINE_MUSCLE_ALIAS', {}).values()), muscles, 'coach SPINE_MUSCLE_ALIAS')
    patterns = co.get('SPINE_PATTERNS') or []
    show('patterns', {'draft_sql': g(ds, 'PATTERNS', list), 'coach SPINE_PATTERNS': co.get('SPINE_PATTERNS'),
                      'program SPINE_PATTERN': g(pr, 'SPINE_PATTERN', list)})
    subset('patterns', list(cp.get('UNLOADED_PATTERNS', [])), patterns, 'check_program UNLOADED_PATTERNS')
    subset('patterns', list(pr.get('RECORD_PATTERNS', {})), patterns, 'program RECORD_PATTERNS')
    show('restriction flags', {'draft_sql': g(ds, 'FLAGS', list), 'coach SPINE_FLAGS': co.get('SPINE_FLAGS')})
    regions = snap.get('regions') or []
    show('body-part regions', {'draft_sql': g(ds, 'REGIONS', list), 'coach SPINE_REGIONS': g(co, 'SPINE_REGIONS', lambda v: [r[0] for r in v]),
                               'program SPINE_REGION': g(pr, 'SPINE_REGION', list),
                               'stage36 sql': sql_words(s36, r'exercises_loads_check\s+check \(loads <@ array\[', r'\]'), db: regions})
    subset('body-part regions', list(tn.get('REGION_FA', {})), regions, 'the course app REGION_FA')
    show('impacts', {'draft_sql': g(ds, 'IMPACTS', list), 'coach SPINE_IMPACTS': g(co, 'SPINE_IMPACTS', lambda v: [r[0] for r in v]),
                     'program SPINE_IMPACT': g(pr, 'SPINE_IMPACT', list), 'stage36 sql': sql_words(s36, r'impact is null or impact in \('),
                     'course IMPACT_FA': g(tn, 'IMPACT_FA', list), db: snap.get('impacts')})
    show('cost tiers', {'check_program COST': g(cp, 'COST', list), 'draft_sql': g(ds, 'COSTS', list),
                        'coach SPINE_COSTS': g(co, 'SPINE_COSTS', lambda v: [r[0] for r in v]),
                        'stage39 sql': sql_words(s39, r'cost is null or cost in \('), db: snap.get('costs')})
    if 'SPINE_COSTS' in co and 'COST' in cp:
        labels = {k: float(re.search(r'×\s*([\d.]+)', lab).group(1)) for k, lab in co['SPINE_COSTS'] if re.search(r'×\s*([\d.]+)', lab)}
        same_map('cost weights', {'check_program COST': {k: float(v) for k, v in cp['COST'].items()}, 'coach SPINE_COSTS labels': labels})
    schema_art = None
    m = re.search(r'^\| `art` \|.*$', read(SCHEMA), re.M)
    if m: schema_art = re.findall(r'`([a-z]+)` \(', m.group(0))
    show('art words (cycle pictures)', {'program APP_ART.cycles': g(pr, 'APP_ART', lambda v: list(v['cycles'])),
                                        'program CYCLE_ART_RULES': g(pr, 'CYCLE_ART_RULES', lambda v: [r['family'] for r in v]),
                                        'coach QM_ART + QM_PHASE': (list(co['QM_ART']) + list(co['QM_PHASE'])) if 'QM_ART' in co and 'QM_PHASE' in co else None,
                                        'SCHEMA.md art': schema_art})
    fam = {f: q for q, f in (snap.get('quality_family') or {}).items() if f and f not in PHASES}
    same_map('art word → headline quality', {'check_program ART_HEADLINE': cp.get('ART_HEADLINE'), 'coach QM_ART': co.get('QM_ART'),
                                              db + ' qualities.family, phases left out': fam})
    if 'QM_PHASE' in co and set(co['QM_PHASE']) != PHASES:
        fail(f"coach QM_PHASE is {sorted(co['QM_PHASE'])}, but this check (and check_program's comment) says {sorted(PHASES)}")

    # The Quality mix rule's numbers (qualityMix(), qualityCheckC(), check_program mix()/top3()).
    same_num('quality mix: coverage', {'program': one_number(PROGRAM, r'const QM_COVERAGE = ([\d.]+)', 'QM_COVERAGE'),
                                       'check_program': one_number(CHECKER, r'QM_COVERAGE = ([\d.]+)', 'QM_COVERAGE')})
    same_num('quality mix: floor', {'program': one_number(PROGRAM, r'score\[q\] >= Math\.max\(([\d.]+), sum \* [\d.]+\)', 'the 1.5 floor'),
                                    'check_program': one_number(CHECKER, r'score\[q\] >= max\(([\d.]+), s \* [\d.]+\)', 'the 1.5 floor')})
    same_num('quality mix: share', {'program': one_number(PROGRAM, r'score\[q\] >= Math\.max\([\d.]+, sum \* ([\d.]+)\)', 'the 12% share'),
                                    'check_program': one_number(CHECKER, r'score\[q\] >= max\([\d.]+, s \* ([\d.]+)\)', 'the 12% share')})
    same_num('quality mix: second quality', {
        'program': one_number(PROGRAM, r'sets \* \(i === 0 \? 1 : ([\d.]+)\)', 'the half weight'),
        'coach': one_number(COACH, r'sets \* \(i === 0 \? 1 : ([\d.]+)\)', 'the half weight'),
        'check_program': one_number(CHECKER, r'sets \* \(1 if i == 0 else ([\d.]+)\)', 'the half weight')})
    same_num('quality mix: seconds per set of a timed effort', {
        'program qmSets': one_number(PROGRAM, r'function qmSets\(rx\)[\s\S]*?sec / (\d+)', 'qmSets'),
        'coach qmSetsC': one_number(COACH, r'function qmSetsC\(rx\)[\s\S]*?sec / (\d+)', 'qmSetsC'),
        'check_program qm_sets': one_number(CHECKER, r'def qm_sets\(rx\)[\s\S]*?t / (\d+)', 'qm_sets')})

    print()
    for m in fails: print('FAIL  ' + m)
    print(f"word-list parity: {len(fails)} FAIL")
    return 1 if fails else 0

def refresh(path):
    raw = json.load(open(path, encoding='utf-8'))
    row = raw[0] if isinstance(raw, list) else raw
    lists = row.get('lists', row)
    if isinstance(lists, str): lists = json.loads(lists)
    words = lambda s: re.findall(r"'([a-z-]+)'::text", s or '') or re.findall(r"'([a-z-]+)'", s or '')
    c = lists.get('constraints') or {}
    fn = lists.get('credits_fn') or ''
    m = re.search(r'not in \((.*?)\)', fn, re.S)
    snap = json.load(open(SNAP, encoding='utf-8')) if os.path.exists(SNAP) else {}
    snap.update({'read_at': datetime.date.today().isoformat(), 'qualities': lists.get('qualities'),
                 'quality_family': lists.get('quality_family'), 'muscles': re.findall(r"'([a-z-]+)'", m.group(1)) if m else None,
                 'regions': words(c.get('exercises_loads_check')), 'impacts': words(c.get('exercises_impact_check')),
                 'costs': words(c.get('exercise_coach_cost_ok'))})
    with open(SNAP, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(snap, f, ensure_ascii=False, indent=1); f.write('\n')
    print(f"snapshot refreshed from {path}")

if __name__ == '__main__':
    sys.exit(main())
