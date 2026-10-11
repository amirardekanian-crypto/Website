# Turn a batch of Spine drafts (a JSON file in the SCRATCHPAD, never in this repo) into SQL.
#
#   python3 .claude/skills/spine/draft_sql.py <batch.json> <existing_ids.txt> > <scratchpad>/batch.sql
#
# batch.json: a list of objects, one per exercise:
#   { "id": "goblet-squat", "name": "Goblet Squat", "aliases": [], "pattern": "squat",
#     "purpose": "...", "tennis": "...", "equipment": [...], "loads": [...regions], "impact": "none",
#     "easier": [...ids or names], "harder": [...ids or names], "alts": [...ids or names],
#     "sfr": 3, "flags": ["loaded-knee-flexion"],
#     "credits": {"quads": 1, "glutes": 0.5}, "cost": "moderate",
#     "muscles": {"calves": 1, "shins": 0.5},   (only when credits is {}: see below)
#     "steps": ["Put one whole foot on a solid step about stair height.", ...],   (How to do it, CUE-6)
#     "cues": {"good": [key point, feel or check], "bad": [avoid]} }   (optional; written for anyone, CUE-1)
# steps (stage64, 2026-10-11): How to do it, for anyone, setup to a safe finish. REFUSED: more than 6, a step that is
# empty or over 140 characters (the database's own limits, spine_steps_ok), an em-dash, a semicolon or a curly apostrophe,
# and a number with a unit of dose (3s, 30 sec, 10 reps, 20 kg, 80%). WARNED (the SQL is still written): no steps at all,
# a count outside the pattern's range (mobility and conditioning 2 to 3, the rest 3 to 5, a 6th only for a rack lift's
# bail), a step over 90 characters, a word from PLAIN_WORDS (gym words and the words a second-language reader tripped on),
# home furniture, a side, an RPE, and a cue that repeats a step. The entry's own name and pattern are exempt from the
# word list ("Hip Hinge" may say hinge). The cues get the same refusals and word list.
# A batch with no steps at all writes no steps column, so it still runs on a database without stage64.
# credits: what one working set counts toward (VOL-10: 1 prime mover, 0.5 helper; {} = nothing, as
# for a stretch or a sprint). cost: heavy | moderate | isolation | none (VOL-2). Both required: the
# checker counts every programme's volume tables and day loads from them (stage39).
# muscles: what the athlete sees lit on the muscle map (stage42), same list and 1/0.5. REQUIRED when
# credits is {} (a stretch, a jump, a sprint still works something) and refused otherwise, because
# the map shows the credits whenever they name a muscle. Display only: no checker reads it.
# existing_ids.txt: one id per line, from `select id from public.exercises order by 1`.
#
# LINT ONLY (2026-10-11), for drafts on APPROVED entries (exercise_coach.suggested_changes), which this file does not write:
#   python .claude/skills/spine/draft_sql.py --lint <proposals.json>
# proposals.json: a list of {id, name, pattern, qualities?, steps?, cues?, purpose?, tennis?}, the entry as it will read
# with the drafts applied (the live value for a field you are not changing). It runs the text checks below and nothing
# else, prints them, and exits 1 on a refusal. CUE-7's seven pieces: the purpose says what it does (never how, never
# the court), the On court line the match moment (never the purpose again, never how), the steps how, the cues the
# focus and the one fault; each WARNED when it reads as another's or repeats one.
# The batch file carries the coach-only half (sfr, flags), which is why it stays in the scratchpad
# and only the SQL reaches the database. Every row lands as status 'draft'; nothing here approves.
# Cues are not written here: the UPDATE at the end copies Amir's own wording from the most
# recently updated live programme that uses each name, and only fills an entry with no cues yet.
import json, re, sys
from pathlib import Path

# Windows (Amir's PC, 2026-09-26): __file__ has backslashes there, so the old
# __file__.rsplit('/.claude/') never split and the library path broke. The files are read and
# the SQL written as UTF-8 explicitly, because the Windows default (cp1252) cannot hold every
# character a cue or purpose may carry, and a redirected stdout would crash on one.
ROOT = Path(__file__).resolve().parents[3]          # <repo>/.claude/skills/spine/draft_sql.py
for stream in (sys.stdout, sys.stderr):
    stream.reconfigure(encoding='utf-8')
LINT = len(sys.argv) > 1 and sys.argv[1] == '--lint'
batch = json.load(open(sys.argv[2 if LINT else 1], encoding='utf-8'))
existing = set() if LINT else {l.strip() for l in open(sys.argv[2], encoding='utf-8') if l.strip()}
# Videos live on the Spine entries now (coach.html -> Exercises). exercise_library.json, the
# Notion-synced list, was retired on 2026-09-26; the few videos it held under names no entry
# carries are kept in legacy_videos.json, so a new draft of one of those still gets its video.
lib = json.load(open(Path(__file__).with_name('legacy_videos.json'), encoding='utf-8')).get('videos', {})
def yt(v):
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
# Muscle credits and cost (stage39). Must match public.spine_credits_ok(), SPINE_MUSCLES in
# coach.html and MUSCLES in scripts/check_program.py.
MUSCLES = {'quads', 'hamstrings', 'glutes', 'adductors', 'calves', 'shins', 'peroneals', 'back', 'chest',
           'shoulder', 'biceps', 'triceps', 'forearm', 'core', 'neck'}
COSTS = {'heavy', 'moderate', 'isolation', 'none'}
# How to do it (stage64): the database's limits (public.spine_steps_ok) and the aim.
STEPS_MAX, STEP_CHARS, STEP_AIM = 6, 140, 90
# Plain words (CUE-6, 2026-10-11 pilot). The ONE list (PRC-23): the skill and the principles point here. Each word, and the
# plain version where the pilot or the blueprint wrote one (None: say it another way). JARGON: gym words a beginner does
# not know. ESL_TRAPS: words a second-language reader with no video read wrong ("plant" read as a tree, "straight arms"
# as locked elbows).
JARGON = {'hinge': 'push your hips back', 'brace': None, 'neutral spine': None, 'scapula': 'shoulder blade',
          'valgus': 'knee falling inward', 'lockout': None, 'packed': None, 'ribs stacked': None, 'flare': None,
          'lats': 'the muscles under your armpit', 'delts': None, 'traps': None, 'obliques': None}
ESL_TRAPS = {'plant': 'brake on one foot', 'stumble': None, 'freeze': None, 'slumped': None, 'drive': 'push',
             'shrug': 'shoulders lifting toward your ears', 'trunk': None, 'balls of your feet': 'the pad behind your toes',
             'hip bone': 'the bony front of your hip', 'tears': 'cuts', 'straight arms': 'elbows almost straight'}
PLAIN_WORDS = dict(JARGON, **ESL_TRAPS)
# Never on an entry, warned: a side for one athlete, home furniture, an effort score (CUE-6; the skill's own audit query).
ATHLETE_WORDS = re.compile(r'\b(?:right|left) (?:shoulder|knee|hip|side|leg|arm|foot|hand)\b|\b(?:sofa|couch|chair|worktop|table edge|cushion)\b|\brpe\b', re.I)
# Refused: an em-dash, a semicolon, a curly apostrophe or quote, and a number with a unit of dose.
VOICE = re.compile(r'[—;’‘]')
DOSE = re.compile(r'\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds|reps|kg|%)(?![a-z])', re.I)

def word_re(w):
    """A word from PLAIN_WORDS as written, or with an ending (hinges, hinging, planted, drives)."""
    alt = re.escape(w) + r'(?:s|es|d|ed|ing)?'
    if w.endswith('e') and ' ' not in w: alt += '|' + re.escape(w[:-1]) + 'ing'
    return re.compile(r'\b(?:' + alt + r')\b', re.I)
PLAIN_RE = {w: word_re(w) for w in PLAIN_WORDS}

def lint_text(i, where, text, own, problems, warnings):
    """The refusals and warnings shared by a step and a cue. `own` is the entry's name and pattern, exempt from the list."""
    if VOICE.search(text): problems.append(f'{i}: {where}: an em-dash, a semicolon or a curly apostrophe ({VOICE.search(text).group(0)!r}): not how Amir writes')
    if DOSE.search(text): problems.append(f'{i}: {where}: a dose ({DOSE.search(text).group(0)!r}). Sets, reps, time and kilos are the card\'s, never the entry\'s')
    for w, rx in PLAIN_RE.items():
        if rx.search(text) and not rx.search(own):
            warnings.append(f'{i}: {where}: "{w}" is on the plain-words list' + (f': say "{PLAIN_WORDS[w]}"' if PLAIN_WORDS[w] else ''))
    for m in dict.fromkeys(x.group(0) for x in ATHLETE_WORDS.finditer(text)):
        warnings.append(f'{i}: {where}: "{m}" reads as one athlete\'s side, kit or effort. The entry is for anyone')

# CUE-7: one piece never says another's job. The same wording test as scripts/check_program.py repeats(): the whole
# line (three words or more) inside the other, or a run of five words shared.
def _words(t): return re.sub(r'[^a-z0-9 ]', ' ', str(t or '').lower()).split()
def repeats(text, line, run=5):
    wt, wl = _words(text), _words(line)
    if not wt or not wl: return False
    if len(wl) >= 3 and (' ' + ' '.join(wl) + ' ') in (' ' + ' '.join(wt) + ' '): return True
    grams = {tuple(wl[k:k + run]) for k in range(len(wl) - run + 1)}
    return any(tuple(wt[k:k + run]) in grams for k in range(len(wt) - run + 1))
# A purpose or an On court line that opens with an order reads as how-to (2026-10-11: "Lift the ball overhead and throw
# it into the floor as hard as you can" was a purpose). "Builds…", "Teaches…", "Trains…" say what it does.
IMPERATIVE = re.compile(r"^\W*(?:keep|push|pull|drive|hold|lift|lower|stand|sit|lie|squeeze|brace|step|press|row|stay|don't|do|"
                        r"never|put|set|grip|swing|jump|land|throw|raise|reach|bend|place|start|walk|run|kneel|rest|slide|rotate|"
                        r"turn|tap|bring|hinge|sink|snap|hop|bounce|roll|open|use|make|loop|face|point|curl|kick|go|get|let|try|aim)\b", re.I)
COURT = re.compile(r'\b(?:court|match|matches|rally|rallies|serve|serves|serving|forehand|backhand|volley|smash|split step|'
                   r'padel|tennis|racket|baseline)\b', re.I)

def text_checks(e, problems, warnings):
    """Steps, cues, purpose and On court for one entry: the refusals, the warnings, and CUE-7 between them."""
    i = e['id']
    own = ' '.join([e.get('name') or ''] + list(e.get('aliases') or []) + [str(e.get('pattern') or '').replace('-', ' ')])
    c = e.get('cues')
    if c and (len(c.get('good', [])) != 2 or len(c.get('bad', [])) != 1): problems.append(f'{i}: cues must be 2 good + 1 bad')
    for n, line in enumerate((c or {}).get('good', []) + (c or {}).get('bad', [])):
        lint_text(i, 'cue ' + ('key point', 'feel or check', 'avoid')[min(n, 2)], str(line), own, problems, warnings)
    # How to do it (CUE-6, stage64)
    st = e.get('steps')
    if st is None or st == []:
        warnings.append(f'{i}: no steps (How to do it, CUE-6): every entry gets them')
    elif not isinstance(st, list) or not all(isinstance(x, str) for x in st):
        problems.append(f'{i}: steps must be a list of text, one step each')
    else:
        if len(st) > STEPS_MAX: problems.append(f'{i}: {len(st)} steps: {STEPS_MAX} at most (the database refuses more)')
        lo, hi = (2, 3) if e.get('pattern') in ('mobility', 'conditioning') else (3, 5)
        if len(st) < lo or (len(st) > hi and not (hi == 5 and len(st) == 6)):
            warnings.append(f'{i}: {len(st)} steps: a {e.get("pattern")} entry takes {lo} to {hi}')
        elif len(st) == 6:
            warnings.append(f'{i}: 6 steps: only for a lift that comes off a rack or is kicked into place, so the bail fits')
        for n, x in enumerate(st, 1):
            if not x.strip(): problems.append(f'{i}: step {n} is empty'); continue
            if len(x) > STEP_CHARS: problems.append(f'{i}: step {n} is {len(x)} characters: {STEP_CHARS} at most (the database refuses more)')
            elif len(x) > STEP_AIM: warnings.append(f'{i}: step {n} is {len(x)} characters: aim under {STEP_AIM}')
            lint_text(i, f'step {n}', x, own, problems, warnings)
        # CUE-7: a cue completes the steps and never repeats one. Whole words, three or more, either way round.
        norm = lambda t: ' ' + ' '.join(re.sub(r'[^a-z0-9 ]', ' ', t.lower()).split()) + ' '
        for line in (c or {}).get('good', []) + (c or {}).get('bad', []):
            cl = norm(str(line))
            if any((len(cl.split()) >= 3 and cl in norm(x)) or (len(norm(x).split()) >= 3 and norm(x) in cl) for x in st):
                warnings.append(f'{i}: the cue "{line}" repeats a step. A cue says what the steps do not')
    # What it does and On court (the ⓘ): each its own job, never how to do it, never each other (CUE-7).
    lines = [('a step', x) for x in (st if isinstance(st, list) else [])] + [('a cue', x) for x in (c or {}).get('good', []) + (c or {}).get('bad', [])]
    p, t = str(e.get('purpose') or '').strip(), str(e.get('tennis') or '').strip()
    for label, txt in (('purpose', p), ('On court', t)):
        if not txt: continue
        if VOICE.search(txt): problems.append(f'{i}: {label}: an em-dash, a semicolon or a curly apostrophe ({VOICE.search(txt).group(0)!r}): not how Amir writes')
        if IMPERATIVE.search(txt): warnings.append(f'{i}: {label} reads as an instruction ("{txt[:60]}"). How to do it is the steps; '
                                                  + ('say what it does for anyone: Builds…, Teaches…, Trains…' if label == 'purpose' else 'say the match moment it serves'))
        hit = next((w for w, x in lines if repeats(txt, x) or repeats(x, txt)), None)
        if hit: warnings.append(f'{i}: {label} repeats {hit}. Each piece says its own thing (CUE-7)')
    if p and t and (repeats(p, t) or repeats(t, p)):
        warnings.append(f'{i}: purpose and On court say the same thing. What it does is for anyone; On court is the match moment (CUE-7)')
    if p and t and COURT.search(p):
        warnings.append(f'{i}: purpose names the court ("{COURT.search(p).group(0)}"). That is the On court line\'s job (CUE-7)')

if LINT:
    problems, warnings = [], []
    for e in batch:
        if not e.get('id'): problems.append('an entry with no id'); continue
        if e.get('cues') or e.get('steps') or e.get('purpose') or e.get('tennis'): text_checks(e, problems, warnings)
    for w in warnings: print('WARN ' + w)
    for p_ in problems: print('REFUSED ' + p_)
    print(f'lint: {len(batch)} entries, {len(problems)} refused, {len(warnings)} warnings')
    sys.exit(1 if problems else 0)

ids = {e['id'] for e in batch}
known = ids | existing
problems, warnings = [], []
for e in batch:
    i = e['id']
    if not re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', i): problems.append(f'{i}: id is not a slug')
    if i in existing: problems.append(f'{i}: already in the Spine')
    text_checks(e, problems, warnings)
    # Only the library's own patterns: never a new pill (Amir, 2026-09-25: "remember to never create new pills").
    if e.get('pattern') not in PATTERNS: problems.append(f'{i}: unknown pattern {e.get("pattern")!r}: use one from the list, never a new one')
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
    cr = e.get('credits')
    if not isinstance(cr, dict): problems.append(f'{i}: no credits (what a working set counts toward, e.g. {{"quads": 1, "glutes": 0.5}}; {{}} for nothing)')
    else:
        for m, w in cr.items():
            if m not in MUSCLES: problems.append(f'{i}: unknown muscle {m!r} in credits (one of {sorted(MUSCLES)})')
            if w not in (0.5, 1): problems.append(f'{i}: credit {m} {w!r} must be 1 or 0.5')
    mu = e.get('muscles')
    if isinstance(cr, dict) and not cr:
        if not isinstance(mu, dict) or not mu: problems.append(f'{i}: credits are {{}}, so give muscles (what the body map lights, e.g. {{"calves": 1, "shins": 0.5}})')
    elif mu: problems.append(f'{i}: muscles is only for an entry whose credits are {{}}; the map already shows the credits')
    for m, w in (mu or {}).items():
        if m not in MUSCLES: problems.append(f'{i}: unknown muscle {m!r} in muscles (one of {sorted(MUSCLES)})')
        if w not in (0.5, 1): problems.append(f'{i}: muscles {m} {w!r} must be 1 or 0.5')
    if e.get('cost') not in COSTS: problems.append(f'{i}: cost must be one of {sorted(COSTS)}')
    for k in ('easier', 'harder', 'alts'):
        for x in e.get(k, []):
            # An id must exist; anything not shaped like an id is a plain NAME for an
            # exercise with no entry yet (2026-09-24), shown as a quiet pill until one exists.
            if re.fullmatch(r'[a-z0-9]+(-[a-z0-9]+)*', x) and x not in known: problems.append(f'{i}.{k} -> {x} (no such id)')
            if x == i: problems.append(f'{i}.{k} points at itself')
for w in warnings: print('WARN ' + w, file=sys.stderr)
if problems:
    sys.exit('\n'.join(problems))

def q(s): return 'null' if s is None or s == '' else "'" + str(s).replace("'", "''") + "'"
def arr(a): return "'{}'" if not a else 'array[' + ','.join(q(x) for x in a) + ']::text[]'

# The steps column only when the batch has steps, so a batch without them still runs before stage64 is applied.
with_steps = any(e.get('steps') for e in batch)
rows, crow, nvid = [], [], 0
for e in batch:
    vid = next((libn[k] for k in (re.sub(r'\s+', ' ', x.lower()).strip() for x in [e['name']] + e.get('aliases', [])) if k in libn), None)
    nvid += vid is not None
    rows.append('(' + ','.join([q(e['id']), q(e['name']), arr(e.get('aliases')), q(e.get('pattern')),
        q(e.get('purpose')), q(e.get('tennis')), arr(e.get('equipment')), arr(e.get('loads')), q(e.get('impact')),
        arr(e.get('easier')), arr(e.get('harder')), arr(e.get('alts')), arr(e.get('qualities')), q(vid),
        # cues written in the batch (for anyone: 2 good + 1 bad) win; otherwise the UPDATE below copies them
        (q(json.dumps(e['cues'])) + '::jsonb') if e.get('cues') else 'null',
        (q(json.dumps(e['muscles'])) + '::jsonb') if e.get('muscles') else 'null', "'draft'", "'claude-draft'"]
        + ([arr([x.strip() for x in e.get('steps') or []])] if with_steps else [])) + ')')
    crow.append(f"({q(e['id'])},{'null' if e.get('sfr') is None else int(e['sfr'])},{arr(e.get('flags'))},"
                f"{q(json.dumps(e['credits']))}::jsonb,{q(e['cost'])})")

print('insert into public.exercises (id,name,aliases,pattern,purpose,tennis,equipment,loads,impact,easier,harder,alts,qualities,video,cues,muscles,status,updated_by'
      + (',steps' if with_steps else '') + ') values')
print(',\n'.join(rows) + '\non conflict (id) do nothing;')
print('insert into public.exercise_coach (id,sfr,flags,credits,cost) values')
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
print(f'-- {len(batch)} drafts, {nvid} with a video, {sum(1 for e in batch if e.get("steps"))} with steps, {len(warnings)} warnings', file=sys.stderr)
