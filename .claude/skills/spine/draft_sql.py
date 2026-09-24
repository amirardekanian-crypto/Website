# Turn a batch of Spine drafts (a JSON file in the SCRATCHPAD, never in this repo) into SQL.
#
#   python3 .claude/skills/spine/draft_sql.py <batch.json> <existing_ids.txt> > <scratchpad>/batch.sql
#
# batch.json: a list of objects, one per exercise:
#   { "id": "goblet-squat", "name": "Goblet Squat", "aliases": [], "pattern": "squat",
#     "purpose": "...", "tennis": "...", "equipment": [...], "loads": [...],
#     "easier": [...ids], "harder": [...ids], "alts": [...ids],
#     "sfr": 3, "flags": ["loaded-knee-flexion"] }
# existing_ids.txt: one id per line, from `select id from public.exercises order by 1`.
#
# The batch file carries the coach-only half (sfr, flags), which is why it stays in the scratchpad
# and only the SQL reaches the database. Every row lands as status 'draft'; nothing here approves.
# Cues are not written here: the UPDATE at the end copies Amir's own wording from the most
# recently updated live programme that uses each name, and only fills an entry with no cues yet.
import json, re, sys

ROOT = __file__.rsplit('/.claude/', 1)[0]
batch = json.load(open(sys.argv[1]))
existing = {l.strip() for l in open(sys.argv[2]) if l.strip()}
lib = json.load(open(ROOT + '/exercise_library.json'))
libn = {re.sub(r'\s+', ' ', k.lower()).strip(): v for k, v in lib.items()}

PATTERNS = {'squat', 'hinge', 'single-leg', 'isolation', 'pull-vertical', 'pull-horizontal',
            'push-vertical', 'push-horizontal', 'anti-extension', 'anti-rotation',
            'anti-lateral-flexion', 'carry', 'rotation', 'throw', 'jump-land', 'conditioning',
            'mobility', 'sprint'}
FLAGS = {'loaded-knee-flexion', 'axial-load', 'free-hinge', 'overhead', 'high-impact'}

ids = {e['id'] for e in batch}
known = ids | existing
problems = []
for e in batch:
    i = e['id']
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', i): problems.append(f'{i}: id is not a slug')
    if i in existing: problems.append(f'{i}: already in the Spine')
    if e.get('pattern') not in PATTERNS: problems.append(f'{i}: unknown pattern {e.get("pattern")!r}')
    for f in e.get('flags', []):
        if f not in FLAGS: problems.append(f'{i}: new flag {f!r} (add it to FLAGS here and to coach.html only if Amir agreed)')
    for k in ('easier', 'harder', 'alts'):
        for x in e.get(k, []):
            if x not in known: problems.append(f'{i}.{k} -> {x} (no such id)')
            if x == i: problems.append(f'{i}.{k} points at itself')
if problems:
    sys.exit('\n'.join(problems))

def q(s): return 'null' if s is None or s == '' else "'" + str(s).replace("'", "''") + "'"
def arr(a): return "'{}'" if not a else 'array[' + ','.join(q(x) for x in a) + ']::text[]'

rows, crow = [], []
for e in batch:
    vid = libn.get(re.sub(r'\s+', ' ', e['name'].lower()).strip())
    rows.append('(' + ','.join([q(e['id']), q(e['name']), arr(e.get('aliases')), q(e['pattern']),
        q(e.get('purpose')), q(e.get('tennis')), arr(e.get('equipment')), arr(e.get('loads')),
        arr(e.get('easier')), arr(e.get('harder')), arr(e.get('alts')), q(vid), "'draft'", "'claude-draft'"]) + ')')
    crow.append(f"({q(e['id'])},{'null' if e.get('sfr') is None else int(e['sfr'])},{arr(e.get('flags'))})")

print('insert into public.exercises (id,name,aliases,pattern,purpose,tennis,equipment,loads,easier,harder,alts,video,status,updated_by) values')
print(',\n'.join(rows) + '\non conflict (id) do nothing;')
print('insert into public.exercise_coach (id,sfr,flags) values')
print(',\n'.join(crow) + '\non conflict (id) do nothing;')
print("""
-- Cues: Amir's own wording, from the most recently updated programme that uses each name or alias.
update public.exercises x set cues = c.cues
from (
  select name, cues from (
    select lower(e->>'name') as name, e->'cues' as cues,
           row_number() over (partition by lower(e->>'name') order by p.updated_at desc) rk
    from public.programs p, jsonb_array_elements(p.data->'workouts'->'days') d,
         jsonb_array_elements(d->'blocks') b, jsonb_array_elements(b->'exercises') e
    where p.athlete_id <> 'demo' and jsonb_typeof(e->'cues') = 'object'
  ) z where rk = 1
) c
where x.cues is null and x.status = 'draft'
  and (c.name = lower(x.name) or c.name = any(select lower(a) from unnest(x.aliases) a));""")
print(f'-- {len(batch)} drafts, {sum(1 for e in batch if libn.get(re.sub(chr(92)+"s+"," ",e["name"].lower()).strip()))} with a video', file=sys.stderr)
