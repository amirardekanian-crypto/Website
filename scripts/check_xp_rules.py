#!/usr/bin/env python3
"""The XP rules, scored twice: habits.html's constants against the leaderboard's row.

Why this exists (2026-09-26, pipeline audit 5.2.2): the leaderboard scores on the server from
public.xp_rules (id 1) and each phone scores from constants in habits.html. When the two drift,
the board and the athlete's own screen disagree and nothing errors (XP_SYSTEM.md §8). Nothing
tested the pair until now.

The server row cannot be read from a commit hook, so a copy of it is committed as
supabase/xp_rules_snapshot.json, and this script holds habits.html to that copy, key by key
(the §8 table): base, growth, completionBonus, customXp, weights, streakQualifyPct (XP_RULES),
targets and unearnable (HABITS), gateV2 (the two-door rule in dayQualifies()), lapseDays,
comebackXp, comebackStick, maxCustom, tiers (CONSISTENCY_TIERS), milestones (ACHIEVEMENTS),
quests (QUEST_POOL) and passTrack (PASS_TRACK plus the EVENTS titles). questRuns is server-only
and not in the snapshot.

  FAIL  a number or id that scores differently (xp, need, measure, kind, level, a missing entry)
  NOTE  display text that differs (a quest's note, a milestone's server-side name): the board
        shows one wording, the phone another, but nobody's XP changes. Printed, never blocking.

Refreshing the snapshot (--live): after changing the row, or when the check says the row may be
newer than the snapshot, read it with the Supabase MCP (read only):

    select rules - 'questRuns' as rules, updated_at from public.xp_rules where id = 1;

save the JSON result to a file and run
    python scripts/check_xp_rules.py --live <that file>
which rewrites supabase/xp_rules_snapshot.json from it and then runs the check. Commit the two
together. Never edit the snapshot by hand to make this pass: it is a copy of the server, and a
hand edit hides exactly the drift it is here to catch.

Needs node (habits.html's constants are JavaScript; node evaluates them). Standard library only.
Runs from .githooks/pre-commit when habits.html or the snapshot is staged.

  python scripts/check_xp_rules.py            # exit 1 on any FAIL
"""
import json, os, re, subprocess, sys, datetime

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HABITS = os.path.join(REPO, 'habits.html')
SNAP = os.path.join(REPO, 'supabase', 'xp_rules_snapshot.json')
CONSTS = ['XP_RULES', 'HABITS', 'MAX_CUSTOM', 'QUEST_POOL', 'LAPSE_DAYS', 'COMEBACK_XP', 'COMEBACK_STICK',
          'CONSISTENCY_TIERS', 'ACHIEVEMENTS', 'EVENTS', 'PASS_TRACK']
KNOWN = {'base', 'growth', 'completionBonus', 'customXp', 'weights', 'targets', 'streakQualifyPct', 'unearnable',
         'gateV2', 'lapseDays', 'comebackXp', 'comebackStick', 'maxCustom', 'tiers', 'milestones', 'quests',
         'passTrack'}

fails, notes = [], []
def fail(m): fails.append(m)
def note(m): notes.append(m)

def literal_end(src, i):
    """Index just past the JS expression starting at src[i] (a literal, possibly nested), skipping
    strings and comments; stops at the first ';' or newline-terminated value at depth 0."""
    depth, n = 0, len(src)
    while i < n:
        c = src[i]
        if c in '\'"`':
            q = c; i += 1
            while i < n and src[i] != q:
                i += 2 if src[i] == '\\' else 1
            i += 1; continue
        if src.startswith('//', i):
            i = src.index('\n', i); continue
        if src.startswith('/*', i):
            i = src.index('*/', i) + 2; continue
        if c in '[{(': depth += 1
        elif c in ']})': depth -= 1
        elif depth == 0 and c in ';\n': return i
        i += 1
    return i

def extract(src, name):
    m = re.search(r'^const\s+' + name + r'\s*=\s*', src, re.M)
    if not m: fail(f"habits.html: const {name} not found"); return None
    return f"const {name} = " + src[m.end():literal_end(src, m.end())] + ';'

def function_body(src, name):
    m = re.search(r'^function\s+' + name + r'\s*\([^)]*\)\s*', src, re.M)
    if not m: return None
    end = literal_end(src, m.end())
    # literal_end stops at the first depth-0 newline, which for a function is just past its closing brace
    return src[m.end():end]

def app_values():
    src = open(HABITS, encoding='utf-8').read().replace('\r\n', '\n')
    decls = [d for d in (extract(src, c) for c in CONSTS) if d]
    js = '\n'.join(decls) + '\nprocess.stdout.write(JSON.stringify({' + ','.join(CONSTS) + '}));'
    try:
        r = subprocess.run(['node', '-e', js], capture_output=True, text=True, encoding='utf-8', cwd=REPO, timeout=60)
    except FileNotFoundError:
        print('check_xp_rules: node was not found, and habits.html\'s constants are JavaScript. Install node.')
        sys.exit(1)
    if r.returncode != 0:
        print('check_xp_rules: node could not evaluate the constants pulled from habits.html:\n' + r.stderr[:800])
        sys.exit(1)
    v = json.loads(r.stdout)
    body = function_body(src, 'dayQualifies') or ''
    v['_gateV2'] = bool(re.search(r'missing\s*<=\s*1', body))
    return v

def same(a, b):
    if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool): return float(a) == float(b)
    return a == b

def by(lst, key): return {x.get(key): x for x in lst or []}

def compare_list(label, server, app, key, score_fields, text_fields=(), app_text=None):
    s, a = by(server, key), by(app, key)
    for k in sorted(set(s) - set(a)): fail(f"{label}: '{k}' is on the server row but not in habits.html")
    for k in sorted(set(a) - set(s)): fail(f"{label}: '{k}' is in habits.html but not on the server row")
    for k in sorted(set(s) & set(a)):
        for f in score_fields:
            if not same(s[k].get(f), a[k].get(f)):
                fail(f"{label} '{k}': {f} is {s[k].get(f)!r} on the server, {a[k].get(f)!r} in habits.html")
        for f in text_fields:
            av = app_text(a[k], f) if app_text else a[k].get(f)
            if f in s[k] and s[k].get(f) != av:
                note(f"{label} '{k}': {f} reads {s[k].get(f)!r} on the server, {av!r} in habits.html")

def check(rules, app):
    X = app['XP_RULES']
    for k in sorted(set(rules) - KNOWN): fail(f"the row has a key '{k}' this check does not know: add its habits.html mirror here and to XP_SYSTEM.md §8")
    for k in sorted(KNOWN - set(rules)): fail(f"the row has no '{k}': the server falls back to a default the app may not share")
    for k in ('base', 'growth', 'completionBonus', 'customXp', 'streakQualifyPct'):
        if k in rules and not same(rules[k], X.get(k)): fail(f"{k}: {rules[k]!r} on the server, XP_RULES.{k} = {X.get(k)!r}")
    if 'weights' in rules:
        w = X.get('weights') or {}
        for h in sorted(set(rules['weights']) | set(w)):
            if not same(rules['weights'].get(h), w.get(h)): fail(f"weights.{h}: {rules['weights'].get(h)!r} on the server, {w.get(h)!r} in XP_RULES.weights")
    habits = app['HABITS']
    targets = {h['id']: h.get('target') for h in habits}
    if 'targets' in rules:
        for h in sorted(set(rules['targets']) | set(targets)):
            if not same(rules['targets'].get(h), targets.get(h)): fail(f"targets.{h}: {rules['targets'].get(h)!r} on the server, HABITS target {targets.get(h)!r}")
    locked = sorted(h['id'] for h in habits if h.get('locked'))
    if 'unearnable' in rules and sorted(rules['unearnable']) != locked:
        fail(f"unearnable: {sorted(rules['unearnable'])} on the server, HABITS locked {locked}")
    if 'gateV2' in rules and bool(rules['gateV2']) != app['_gateV2']:
        fail(f"gateV2: {rules['gateV2']!r} on the server, but dayQualifies() {'has' if app['_gateV2'] else 'has no'} second door (missing <= 1)")
    for k, c in (('lapseDays', 'LAPSE_DAYS'), ('comebackXp', 'COMEBACK_XP'), ('comebackStick', 'COMEBACK_STICK'), ('maxCustom', 'MAX_CUSTOM')):
        if k in rules and not same(rules[k], app[c]): fail(f"{k}: {rules[k]!r} on the server, {c} = {app[c]!r}")
    if 'tiers' in rules:
        compare_list('tiers', rules['tiers'], app['CONSISTENCY_TIERS'], 'days', ('mult',))
    if 'milestones' in rules:
        # The server's name (on the newer rungs) is the badge name plus its mark: "CLEAN SWEEP II".
        full = lambda a, f: (a.get('name', '') + (' ' + a['mark'] if a.get('mark') else '')).strip()
        compare_list('milestones', rules['milestones'], app['ACHIEVEMENTS'], 'code', ('xp', 'need', 'measure'), ('name',), full)
    if 'quests' in rules:
        compare_list('quests', rules['quests'], app['QUEST_POOL'], 'id', ('kind', 'need', 'xp'), ('title', 'note'))
    if 'passTrack' in rules:
        track = [dict(t) for t in app['PASS_TRACK']]
        track += [{'id': e['title']['id'], 'lv': 0, 'kind': 'title', 'name': e['title']['name']} for e in app['EVENTS'] if e.get('title')]
        compare_list('passTrack', rules['passTrack'], track, 'id', ('lv', 'kind'), ('name',))

def refresh(path):
    raw = json.load(open(path, encoding='utf-8'))
    row = raw[0] if isinstance(raw, list) else raw
    rules = row.get('rules', row)
    if isinstance(rules, str): rules = json.loads(rules)
    rules.pop('questRuns', None)
    old = json.load(open(SNAP, encoding='utf-8')) if os.path.exists(SNAP) else {}
    snap = {'_about': old.get('_about', 'A copy of public.xp_rules (id 1).rules, minus questRuns. See scripts/check_xp_rules.py.'),
            'read_at': datetime.date.today().isoformat(),
            'row_updated_at': row.get('updated_at', old.get('row_updated_at')),
            'keys_on_row': len(rules) + 1,
            'rules': {k: rules[k] for k in sorted(rules)}}
    with open(SNAP, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(snap, f, ensure_ascii=False, indent=1); f.write('\n')
    print(f"snapshot refreshed from {path}: {len(rules)} keys (questRuns left out)")

def main():
    if len(sys.argv) >= 3 and sys.argv[1] == '--live': refresh(sys.argv[2])
    elif len(sys.argv) > 1:
        print(__doc__); return 2
    snap = json.load(open(SNAP, encoding='utf-8'))
    check(snap['rules'], app_values())
    for m in fails: print('FAIL  ' + m)
    for m in notes: print('NOTE  ' + m)
    print(f"\nxp_rules (snapshot read {snap.get('read_at')}) vs habits.html: {len(fails)} FAIL · {len(notes)} NOTE"
          + ('' if not fails else '\nChange BOTH sides (XP_SYSTEM.md §8: merge into the row, never rewrite it), then refresh the snapshot with --live.'))
    return 1 if fails else 0

if __name__ == '__main__':
    sys.exit(main())
