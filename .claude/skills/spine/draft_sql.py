# Turn a batch of Spine drafts (a JSON file in the SCRATCHPAD, never in this repo) into SQL.
#
#   python3 .claude/skills/spine/draft_sql.py <batch.json> <existing_ids.txt> > <scratchpad>/batch.sql
#
# batch.json: a list of objects, one per exercise:
#   { "id": "goblet-squat", "name": "Goblet Squat", "aliases": [], "pattern": "squat",
#     "purpose": "...", "tennis": "...", "equipment": [...], "loads": [...regions], "impact": "none",
#     "easier": [...ids or names], "harder": [...ids or names], "alts": [...ids or names],
#     "sfr": 3, "flags": ["loaded-knee-flexion"],
#     "cues": {"good": [ext, int], "bad": [avoid]} }   (optional; written for anyone)
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
def yt(v):  # exercise_library.json holds a few non-video links (a Notion page) and bare 'youtube.com/...' ones
    if not isinstance(v, str) or not re.search(r'(youtube\.com|youtu\.be)/', v): return None
    return v if v.startswith('http') else 'https://' + v.lstrip('/')
libn = {re.sub(r'\s+', ' ', k.lower()).strip(): yt(v) for k, v in lib.items() if yt(v)}

PATTERNS = {'squat', 'hinge', 'single-leg', 'isolation', 'pull-vertical', 'pull-horizontal',
            'push-vertical', 'push-horizontal', 'anti-extension', 'anti-rotation',
            'anti-lateral-flexion', 'carry', 'rotation', 'throw', 'jump-land', 'conditioning',
            'mobility', 'sprint-cod'}  # must match SPINE_PATTERNS in coach.html
FLAGS = {'loaded-knee-flexion', 'axial-load', 'free-hinge', 'overhead', 'high-impact'}
# The Quality Map (stage32): must match QM_IDS in coach.html and public.qualities.
QUALITIES = ['strength', 'muscle', 'power', 'spring', 'speed', 'brakes', 'rotation', 'engine', 'armour', 'movement']
# Body parts involved (stage36): the course app's region and impact ids. Must match SPINE_REGION /
# SPINE_IMPACT in program.html, SPINE_REGIONS / SPINE_IMPACTS in coach.html and the stage36 checks.
REGIONS = {'ankle-foot', 'calf-achilles', 'knee', 'hip-groin', 'hamstring', 'low-back', 'trunk',
           'shoulder', 'elbow-forearm-wrist', 'neck'}
IMPACTS = {'none', 'running', 'plyometric', 'landing'}

ids = {e['id'] for e in batch}
known = ids | existing
problems = []
for e in batch:
    i = e['id']
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', i): problems.append(f'{i}: id is not a slug')
    if i in existing: problems.append(f'{i}: already in the Spine')
    c = e.get('cues')
    if c and (len(c.get('good', [])) != 2 or len(c.get('bad', [])) != 1): problems.append(f'{i}: cues must be 2 good + 1 bad')
    if c and '—' in json.dumps(c, ensure_ascii=False): problems.append(f'{i}: em-dash in cues')
    # A NEW entry carries no pattern (Amir, 2026-09-25): the ⓘ sheet draws the pattern as a pill beside
    # the ten qualities, and he wants only his ten there ("just use the 10 pills i have, this is a rule").
    if e.get('pattern') is not None: problems.append(f'{i}: pattern {e.get("pattern")!r} on a new entry: leave it out, the ⓘ would draw it as a pill beside the ten')
    for f in e.get('flags', []):
        if f not in FLAGS: problems.append(f'{i}: new flag {f!r} (add it to FLAGS here and to coach.html only if Amir agreed)')
    qs = e.get('qualities', [])
    if not qs: problems.append(f'{i}: no qualities (first = primary, up to 3)')
    if len(qs) > 3: problems.append(f'{i}: {len(qs)} qualities, keep it to 3 so a day does not build everything')
    if len(set(qs)) != len(qs): problems.append(f'{i}: a quality is listed twice')
    for x in qs:
        if x not in QUALITIES: problems.append(f'{i}: unknown quality {x!r}')
    if not e.get('loads'): problems.append(f'{i}: no loads (the body parts involved, 1 to 4 of REGIONS)')
    for r in e.get('loads', []):
        if r not in REGIONS: problems.append(f'{i}: unknown body part {r!r} (one of {sorted(REGIONS)})')
    if e.get('impact') not in IMPACTS: problems.append(f'{i}: impact must be one of {sorted(IMPACTS)}')
    for k in ('easier', 'harder', 'alts'):
        for x in e.get(k, []):
            # An id must exist; anything not shaped like an id is a plain NAME for an
            # exercise with no entry yet (2026-09-24), shown as a quiet pill until one exists.
            if re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', x) and x not in known: problems.append(f'{i}.{k} -> {x} (no such id)')
            if x == i: problems.append(f'{i}.{k} points at itself')
if problems:
    sys.exit('\n'.join(problems))

def q(s): return 'null' if s is None or s == '' else "'" + str(s).replace("'", "''") + "'"
def arr(a): return "'{}'" if not a else 'array[' + ','.join(q(x) for x in a) + ']::text[]'

rows, crow, nvid = [], [], 0
for e in batch:
    vid = next((libn[k] for k in (re.sub(r'\s+', ' ', x.lower()).strip() for x in [e['name']] + e.get('aliases', [])) if k in libn), None)
    nvid += vid is not None
    rows.append('(' + ','.join([q(e['id']), q(e['name']), arr(e.get('aliases')), q(e.get('pattern')),
        q(e.get('purpose')), q(e.get('tennis')), arr(e.get('equipment')), arr(e.get('loads')), q(e.get('impact')),
        arr(e.get('easier')), arr(e.get('harder')), arr(e.get('alts')), arr(e.get('qualities')), q(vid),
        # cues written in the batch (for anyone: 2 good + 1 bad) win; otherwise the UPDATE below copies them
        (q(json.dumps(e['cues'])) + '::jsonb') if e.get('cues') else 'null', "'draft'", "'claude-draft'"]) + ')')
    crow.append(f"({q(e['id'])},{'null' if e.get('sfr') is None else int(e['sfr'])},{arr(e.get('flags'))})")

print('insert into public.exercises (id,name,aliases,pattern,purpose,tennis,equipment,loads,impact,easier,harder,alts,qualities,video,cues,status,updated_by) values')
print(',\n'.join(rows) + '\non conflict (id) do nothing;')
print('insert into public.exercise_coach (id,sfr,flags) values')
print(',\n'.join(crow) + '\non conflict (id) do nothing;')
print("""
-- Cues: Amir's own wording, from the most recently updated programme that uses each name or alias.
update public.exercises x set cues = c.cues
from (
  select name, cues from (
    select lower(x->>'name') as name, x->'cues' as cues,
           row_number() over (partition by lower(x->>'name') order by p.updated_at desc) rk
    from public.programs p, jsonb_array_elements(p.data->'workouts'->'days') d,
         jsonb_array_elements(d->'blocks') b, jsonb_array_elements(b->'exercises') e,
         -- the exercise itself, or each exercise inside a circuit
         lateral (select e as x where e->'items' is null
                  union all select i from jsonb_array_elements(case when jsonb_typeof(e->'items') = 'array' then e->'items' else '[]' end) i) f
    where p.athlete_id <> 'demo' and jsonb_typeof(x->'cues') = 'object'
  ) z where rk = 1
) c
where x.cues is null and x.status = 'draft'
  and (c.name = lower(x.name) or c.name = any(select lower(a) from unnest(x.aliases) a));""")
print(f'-- {len(batch)} drafts, {nvid} with a video', file=sys.stderr)
