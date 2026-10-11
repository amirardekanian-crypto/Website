#!/usr/bin/env python3
"""Tests for scripts/check_program.py and scripts/check_rule_index.py, on a made-up athlete.

Why this exists (2026-09-26, the pipeline audit, item 16): the checker is what holds every
programme to the house rules before engage writes a word, and its tests lived in one session's
scratchpad, so the next change to it would have had nothing to prove it still works. They run
from .githooks/pre-commit whenever the checker, the rule index guard, assets/js/chips.js or the
principles change. Nothing here touches the database or any real athlete's data.

  python scripts/test_check_program.py        # exit 1 on any failure
"""
import contextlib, copy, importlib.util, io, json, os, shutil, subprocess, sys, tempfile

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHECK = os.path.join(REPO, 'scripts', 'check_program.py')
TMP = tempfile.mkdtemp(prefix='check_program_tests_')
HAVE_NODE = shutil.which('node') is not None

def run(data, *flags, spec=None, ctx=None):
    """Run the checker on `data`; spec is text, ctx a --spine-sql result. stdout + stderr."""
    p = os.path.join(TMP, 'prog.json'); json.dump(data, open(p, 'w', encoding='utf-8'))
    args = [sys.executable, CHECK, p]
    if spec is not None:
        f = os.path.join(TMP, 'spec.md'); open(f, 'w', encoding='utf-8').write(spec); args += ['--spec', f]
    if ctx is not None:
        f = os.path.join(TMP, 'ctx.json'); json.dump(ctx, open(f, 'w', encoding='utf-8')); args += ['--spine', f]
    r = subprocess.run(args + list(flags), capture_output=True, text=True, encoding='utf-8', cwd=REPO)
    return r.stdout + r.stderr

def has(out, level, frag): return any(l.startswith(level) and frag in l for l in out.splitlines())

results = []
def expect(name, cond, out=''):
    results.append((name, bool(cond)))
    if not cond: print('--- FAILED:', name, '\n', out)

# ── the made-up athlete ───────────────────────────────────────────────────────
# A lifting day's prep (SES-6): the movements are the items of ONE circuit, two rounds, with its own rest (CHP-7).
PREP_CIRCUIT = {"type": "circuit", "name": "Lower Primer", "rx": {"rounds": 2, "rest": 30},
                "items": [{"name": "Glute Bridge", "exId": "glute-bridge", "rx": {"reps": 12}},
                          {"name": "Dead Bug", "exId": "dead-bug", "rx": {"reps": 8}}]}
BASE = {
  "athlete": {"id": "test_athlete", "firstName": "Test", "lastName": "Athlete"},
  "currentCycleIndex": 1,
  "cycles": [
    {"num": 1, "name": "One", "art": "bedrock"},
    {"num": 2, "name": "Two", "art": "iron", "weeks": "Weeks 6-10",
     "weekNotes": {
       "first": {"rpeCap": 7, "text": "Start lighter than you think on the new exercises and keep every set at RPE 7 or under."},
       "last": {"setsDrop": 1, "rpeDrop": 1, "text": "One set fewer on every exercise, and take 1 off every RPE, never below 6."}}}
  ],
  "workouts": {"days": [
    {"id": 1, "blocks": [
      {"title": "Activation & Prep", "exercises": [{"type": "simple", "name": "Stationary Bike", "exId": "stationary-bike", "rx": {"time": "5 min"}}, PREP_CIRCUIT]},
      {"title": "Primary", "exercises": [{"type": "standard", "name": "Barbell Back Squat", "exId": "barbell-back-squat", "rx": {"sets": 4, "reps": 6, "rpe": 8, "tempo": "3-0-1-0", "rest": 150}}]},
      {"title": "Accessory", "exercises": [{"type": "standard", "name": "Machine Seated Leg Curl", "exId": "machine-seated-leg-curl", "rx": {"sets": 3, "reps": 10, "rpe": 8, "tempo": "3-0-1-0", "rest": 60}}]}]},
    {"id": 2, "blocks": [
      {"title": "Activation & Prep", "exercises": [PREP_CIRCUIT]},
      {"title": "Primary", "exercises": [{"type": "standard", "name": "Lat Pulldown", "exId": "lat-pulldown", "rx": {"sets": 4, "reps": 8, "rpe": 8, "tempo": "3-0-1-0", "rest": 90}}]}]}
  ]},
  "notes": {"cards": [{"title": "Hi", "body": "<p>Hello.</p>"}]}
}
# The made-up Spine the checker reads (the --spine-sql shape): id|status|cues|qualities|pattern|
# impact|equipment|name|aliases|credits|cost, and since 2026-10-11 |has-steps (section 11 adds it).
# The volume count comes from credits and cost.
SB = "\n".join([
  "stationary-bike|approved|true|engine|conditioning|none|bike|Stationary Bike||none|moderate",
  "barbell-back-squat|approved|true|strength,muscle|squat|none|barbell;rack|Barbell Back Squat|Back Squat|glutes:0.5,quads:1|heavy",
  "machine-seated-leg-curl|approved|true|muscle|isolation|none|leg curl machine|Machine Seated Leg Curl||hamstrings:1|isolation",
  "lat-pulldown|approved|true|muscle,strength|pull-vertical|none|cable;lat bar|Lat Pulldown||back:1,biceps:0.5|moderate",
  "kettlebell-swing|approved|true|power|hinge|none|kettlebell|Kettlebell Swing||glutes:1,hamstrings:0.5|moderate",
  "dead-bug|approved|true|armour|anti-extension|none|floor|Dead Bug||core:1|isolation",
  "glute-bridge|approved|true|muscle|hinge|none|floor|Glute Bridge||glutes:1,hamstrings:0.5|isolation",
  "goblet-squat|approved|true|muscle|squat|none|dumbbell|Goblet Squat||glutes:0.5,quads:1|moderate",
  "machine-leg-extension|approved|true|muscle|isolation|none|leg extension machine|Machine Leg Extension||quads:1|isolation",
  "chest-supported-dumbbell-row|approved|true|muscle|pull-horizontal|none|dumbbells|Chest-Supported Dumbbell Row||back:1,biceps:0.5|moderate",
  "dumbbell-bench-press|approved|true|muscle|push-horizontal|none|dumbbells;bench|Dumbbell Bench Press||chest:1,shoulder:0.5,triceps:0.5|moderate"])
CTX = [{"spine": SB, "prev": None, "ledger": None}]

# ── 1. weekNotes, the set cap, the floors, the headline ──────────────────────
out = run(BASE, ctx=CTX)
expect('valid weekNotes pass', not has(out, 'FAIL', 'weekNotes'), out)
d = copy.deepcopy(BASE); del d['cycles'][1]['weekNotes']
out = run(d, ctx=CTX)
expect('missing last week fails', has(out, 'FAIL', 'no week note on the final week'), out)
out = run(d, '--no-backoff', ctx=CTX)
expect('--no-backoff excuses it', not has(out, 'FAIL', 'weekNotes.last') and has(out, 'INFO', 'no back-off week'), out)
d = copy.deepcopy(BASE); d['cycles'][1]['weekNotes']['last'] = {"text": "An easier week."}
expect('back-off needs numbers', has(run(d, ctx=CTX), 'FAIL', 'name the back-off dose'))
d = copy.deepcopy(BASE); d['cycles'][1]['weekNotes']['last'] = {"rpeCap": 5, "rpeDrop": 1, "text": "Take 1 off every RPE this week."}
out = run(d, ctx=CTX)
expect('rpeCap under 6 fails', has(out, 'FAIL', 'rpeCap must be 6 to 9'), out)
expect('an RPE drop must name the floor', has(out, 'FAIL', 'lowers the RPE without naming the floor'), out)
d = copy.deepcopy(BASE); d['cycles'][1]['weekNotes']['last']['text'] = "Back-off week. One set fewer, never below 6."
expect('a text repeating its label warns', has(run(d, ctx=CTX), 'WARN', 'repeating its label'))
d = copy.deepcopy(BASE); d['currentCycleIndex'] = 0; d['cycles'][0]['weekNotes'] = {"last": {"setsDrop": 1, "text": "One set fewer on everything."}}
out = run(d, ctx=CTX)
expect('cci 0 turns on the new-athlete rules', has(out, 'INFO', 'new-athlete rules apply'), out)
expect('a new athlete needs the first week', has(out, 'FAIL', 'needs a week 1 note'), out)
expect('cci 0: a 6-rep weighted squat fails the 8-rep rule', has(out, 'FAIL', 'no weighted exercise under 8 reps'), out)
# A week note belongs to one week (2026-10-11): numeric keys, first / last as the older names.
def with_notes(notes, **cyc):
    d = copy.deepcopy(BASE); d['cycles'][1]['weekNotes'] = notes; d['cycles'][1].update(cyc); return d
W1 = {"rpeCap": 7, "text": "Keep every set at RPE 7 or under while you find your weights."}
BACKOFF = {"setsDrop": 1, "rpeCap": 6, "text": "One set fewer on everything and every RPE at 6."}
TEST = {"title": "Testing week", "setsDrop": 1, "text": "Bench, leg press and hip thrust get one test set: as many good reps as you can."}
out = run(with_notes({"1": W1, "5": BACKOFF}), ctx=CTX)
expect('week-number keys pass', not has(out, 'FAIL', 'weekNotes') and not has(out, 'FAIL', 'week note'), out)
out = run(with_notes({"1": W1, "3": TEST, "5": BACKOFF}), ctx=CTX)
expect('a testing week on week 3 passes', not has(out, 'FAIL', 'week note') and not has(out, 'WARN', 'give week 3'), out)
untitled = {k: v for k, v in TEST.items() if k != 'title'}
expect('a note on a middle week without a title warns', has(run(with_notes({"3": untitled, "5": BACKOFF}), ctx=CTX), 'WARN', "give week 3's note a title"))
out = run(with_notes({"3": TEST}), ctx=CTX)
expect('only a middle week: the back-off is still missing', has(out, 'FAIL', 'no week note on the final week'), out)
out = run(with_notes({"5": BACKOFF}), ctx=CTX)
expect('the back-off can be written as "5" instead of last', not has(out, 'FAIL', 'week note'), out)
out = run(with_notes({"first": W1, "5": BACKOFF}), ctx=CTX)
expect('first plus "5" is fine (different weeks)', not has(out, 'FAIL', 'week note') and not has(out, 'FAIL', 'two notes'), out)
out = run(with_notes({"last": BACKOFF, "5": BACKOFF}), ctx=CTX)
expect('last and "5" are the same week: keep one', has(out, 'FAIL', 'week 5 has two notes'), out)
out = run(with_notes({"7": TEST, "5": BACKOFF}), ctx=CTX)
expect('a note past the cycle fails', has(out, 'FAIL', 'the cycle runs 5 weeks'), out)
out = run(with_notes({"second": TEST, "5": BACKOFF}), ctx=CTX)
expect('a key that is not a week fails', has(out, 'FAIL', "a week note's key is its week number"), out)
out = run(with_notes({"6": BACKOFF}, startDate="2026-10-12", endDate="2026-11-22"), ctx=CTX)
expect('a six-week cycle (from its dates) ends on week 6', not has(out, 'FAIL', 'week note'), out)
out = run(with_notes({"5": BACKOFF}, startDate="2026-10-12", endDate="2026-11-22"), ctx=CTX)
expect('...so a note on week 5 is not its back-off', has(out, 'FAIL', 'no week note on the final week (week 6)'), out)
d = with_notes({"3": dict(TEST, text="Take 1 off every RPE this week."), "5": BACKOFF})
expect('a middle week\'s words are read too (RPE drop without the floor)', has(run(d, ctx=CTX), 'FAIL', 'lowers the RPE without naming the floor'))

# Prep is a circuit and every working exercise and circuit has its own rest (2026-10-11).
def set_prep(d, day, exercises): d['workouts']['days'][day]['blocks'][0]['exercises'] = exercises; return d
out = run(BASE, ctx=CTX)
expect('the made-up athlete passes the prep and rest rules', not has(out, 'FAIL', '[SES-6]') and not has(out, 'FAIL', '[CHP-7]') and not has(out, 'WARN', '[CHP-7]') and not has(out, 'WARN', '[SES-6]'), out)
d = set_prep(copy.deepcopy(BASE), 0, [{"type": "simple", "name": "Stationary Bike", "exId": "stationary-bike", "rx": {"time": "5 min"}}])
expect('a lifting day with no prep circuit fails', has(run(d, ctx=CTX), 'FAIL', '[SES-6] Day 1: a lifting day'))
d = set_prep(copy.deepcopy(BASE), 0, [{"type": "simple", "name": "Stationary Bike", "exId": "stationary-bike", "rx": {"time": "5 min"}}, PREP_CIRCUIT,
    {"type": "simple", "name": "Glute Bridge", "exId": "glute-bridge", "rx": {"reps": 15, "sets": 2}}])
expect('a prep movement written as a card with sets fails', has(run(d, ctx=CTX), 'FAIL', 'a prep movement written as a card with sets'))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][0]['exercises'][1] = dict(PREP_CIRCUIT, rx={"rounds": 2})
out = run(d, ctx=CTX)
expect('a prep circuit with no rest fails', has(out, 'FAIL', '[CHP-7] Day 1 · Activation & Prep · Lower Primer: no rest'), out)
d['workouts']['days'][0]['blocks'][0]['exercises'][1] = dict(PREP_CIRCUIT, rx={"rounds": 2, "rest": 20})
expect('a rest under 30 s fails', has(run(d, ctx=CTX), 'FAIL', 'under 30 s'))
d['workouts']['days'][0]['blocks'][0]['exercises'][1] = dict(PREP_CIRCUIT, rx={"rounds": 3, "rest": 30})
expect('three rounds of prep warns', has(run(d, ctx=CTX), 'WARN', '3 rounds. A lifting day'))
d = copy.deepcopy(BASE); del d['workouts']['days'][0]['blocks'][1]['exercises'][0]['rx']['rest']
out = run(d, ctx=CTX)
expect('a main lift with no rest fails', has(out, 'FAIL', '[CHP-7] Day 1 · Primary · Barbell Back Squat: no rest'), out)
# Every working card of a day resting the same is a section's number copied down (2026-10-11).
d = copy.deepcopy(BASE)
d['workouts']['days'][0]['blocks'][2]['exercises'] += [dict(copy.deepcopy(d['workouts']['days'][0]['blocks'][2]['exercises'][0]), name=n, exId=i) for n, i in
    (('Machine Leg Extension', 'machine-leg-extension'), ('Goblet Squat', 'goblet-squat'))]
for b in d['workouts']['days'][0]['blocks'][1:]:
    for e in b['exercises']: e['rx']['rest'] = 90
out = run(d, ctx=CTX)
expect('a day with every working card at one rest warns', has(out, 'WARN', 'all 4 working cards rest 90 s'), out)
d['workouts']['days'][0]['blocks'][1]['exercises'][0]['rx']['rest'] = 150
expect('...and stops warning once the rests differ', not has(run(d, ctx=CTX), 'WARN', 'working cards rest'))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][2]['rest'] = 90
expect('a block rest next to card rests warns', has(run(d, ctx=CTX), 'WARN', 'the block carries a rest'))
d = copy.deepcopy(BASE); d['workouts']['days'].append({"id": 3, "blocks": [
    {"title": "Conditioning", "exercises": [{"type": "simple", "name": "Incline Treadmill Walk", "exId": "incline-treadmill-walk", "rx": {"time": "20 min"}}]}]})
out = run(d, ctx=CTX)
expect('a day with no Primary block needs no prep circuit, and a simple walk needs no rest', not has(out, 'FAIL', 'Day 3: a lifting day') and not has(out, 'FAIL', 'Incline Treadmill Walk: no rest'), out)
d['workouts']['days'][2]['blocks'][0]['exercises'][0]['type'] = 'standard'
expect('a continuous effort typed standard, with no sets, needs no rest either', not has(run(d, ctx=CTX), 'FAIL', 'Incline Treadmill Walk: no rest'))
d['workouts']['days'][2]['blocks'][0]['exercises'][0]['rx'] = {"sets": 4, "time": "5 min"}
expect('...but the same card in four sets does', has(run(d, ctx=CTX), 'FAIL', 'Incline Treadmill Walk: no rest'))

d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['rx']['sets'] = 5
expect('5 sets fail without --proven', has(run(d, ctx=CTX), 'FAIL', 'never more than 4'))
out = run(d, '--proven', ctx=CTX)
expect('5 sets pass with --proven', not has(out, 'FAIL', 'never more than 4') and has(out, 'INFO', 'proven'), out)
expect('no floor without --floor', not has(run(BASE, ctx=CTX), 'FAIL', 'under the floor'))
out = run(BASE, '--floor', ctx=CTX)
expect('--floor fails quads under 10', has(out, 'FAIL', 'quads 4 sets/week: under the floor'), out)
expect('--floor fails a missing chest', has(out, 'FAIL', 'chest: 0 sets/week'), out)
out = run(BASE, '--floor', ctx=CTX, spec='floor-except: chest (posture), shoulder\n')
expect('floor-except from the spec', not has(out, 'FAIL', 'chest: 0') and not has(out, 'FAIL', 'shoulder: 0'), out)
out = run(BASE, '--female', ctx=CTX)
expect('--female warns and floors nothing', has(out, 'WARN', '--female is retired') and not has(out, 'FAIL', 'under the floor'), out)
out = run(BASE, ctx=[{"spine": "\n".join([
    'stationary-bike|approved|true|engine', 'barbell-back-squat|approved|true|muscle,strength',
    'machine-seated-leg-curl|approved|true|armour', 'lat-pulldown|approved|true|engine']), "prev": None, "ledger": None}])
expect('a headline miss is a WARN', has(out, 'WARN', 'not in the week') and not has(out, 'FAIL', 'headline'), out)
expect('every FAIL and WARN names its rule', all(l.startswith(('FAIL  [', 'WARN  [')) or 'no --' in l or '--female' in l
       for l in run(d, ctx=CTX).splitlines() if l.startswith(('FAIL', 'WARN'))))

# ── 2. the athlete profile ────────────────────────────────────────────────────
PROFILE = """```profile
aim: strength-muscle          # sport | strength-muscle | general
sex: female
proven: -
bans: lat pulldown
floor-except: chest (posture), shoulder (posture)
cap: 75
injuries: elbow → no hanging, managed
```"""
def prof_ctx(profile): return [{"spine": SB, "prev": None, "ledger": None, "profile": profile}]
out = run(BASE, ctx=CTX, spec=PROFILE + "\n\nbans: goblet\n")
expect('profile: no traceback', 'Traceback' not in out, out)
expect('profile read from the spec', has(out, 'INFO', 'athlete profile from the spec'), out)
expect('aim strength-muscle turns on the floor', has(out, 'FAIL', 'quads 4 sets/week: under the floor'), out)
expect('floor-except from the profile', not has(out, 'FAIL', 'chest: 0') and not has(out, 'FAIL', 'shoulder: 0'), out)
expect('a profile ban is enforced', has(out, 'FAIL', "Lat Pulldown: banned for this athlete ('lat pulldown'"), out)
expect('cap 75 from the profile', has(out, 'INFO', '--cap 75') and not has(out, 'WARN', 'past the 60-min cap'), out)
expect('an arrow inside the profile is not a fallback', not has(out, 'FAIL', 'a fallback or swap gives a banned'), out)
d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'][1]['exercises'][0]['name'] = 'Goblet Squat'
expect("the spec's bans line merges with the profile's", has(run(d, ctx=CTX, spec=PROFILE + "\n\nbans: goblet\n"), 'FAIL', "Goblet Squat: banned for this athlete ('goblet'"))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['rx']['sets'] = 5
out = run(d, ctx=CTX, spec=PROFILE.replace('proven: -', 'proven: C2 logged 5x6 at RPE 8, every rep made'))
expect('proven in the profile allows 5 sets', not has(out, 'FAIL', 'never more than 4') and has(out, 'INFO', '--proven'), out)
expect("proven '-' keeps the cap", has(run(d, ctx=CTX, spec=PROFILE), 'FAIL', 'never more than 4'))
expect('aim sport: no floor', not has(run(BASE, ctx=CTX, spec=PROFILE.replace('aim: strength-muscle', 'aim: sport')), 'FAIL', 'under the floor'))
expect('the coaching log profile when the spec has none', has(run(BASE, spec="bans: goblet\n", ctx=prof_ctx(PROFILE)), 'INFO', 'athlete profile from the coaching log'))
expect('no profile anywhere warns', has(run(BASE, ctx=CTX, spec="bans: goblet\n"), 'WARN', 'no athlete profile'))
expect('a command-line --cap wins', not has(run(BASE, '--cap', '50', ctx=CTX, spec=PROFILE), 'INFO', '--cap 75'))
expect("bans '-' bans nothing", not has(run(BASE, ctx=CTX, spec=PROFILE.replace('bans: lat pulldown', 'bans: -')), 'FAIL', 'banned for this athlete'))

# ── 3. the notes obligations list ─────────────────────────────────────────────
OB = copy.deepcopy(BASE)
OB['notes'] = {"cards": [
  {"title": "Your knee", "body": "<p>Stop rules.</p>", "tags": ["pain-ladder"]},
  {"title": "Film week one", "body": "<p>Film your last set.</p>", "tags": ["film"]},
  {"title": "Rough days", "body": "<p>Take 1 off every RPE, never below 6.</p>", "tags": ["low-readiness"]}]}
OBSPEC = """obligations:
- backoff → the week note on the final week
- week1 → the week note on week 1
- pain-ladder: knee → card
- film: squat and RDL, week 1 → card
- low-readiness → card
"""
out = run(OB, spec=OBSPEC)
expect('obligations: no traceback', 'Traceback' not in out, out)
expect('every obligation met: no FAIL', not has(out, 'FAIL', 'obligation'), out)
d = copy.deepcopy(OB); d['notes']['cards'] = d['notes']['cards'][:2]
expect('a missing tagged card fails', has(run(d, spec=OBSPEC), 'FAIL', "obligation 'low-readiness' is not met"))
d = copy.deepcopy(OB); del d['cycles'][1]['weekNotes']['first']
expect('week1 needs a week 1 note', has(run(d, spec=OBSPEC), 'FAIL', "obligation 'week1' is not met: a week note on week 1"))
expect('an unknown key warns', has(run(OB, spec=OBSPEC + "- teleport → card\n"), 'WARN', "obligation 'teleport'"))
expect('no obligations block warns', has(run(OB, spec="bans: goblet\n"), 'WARN', 'no obligations: block'))
out = run(OB, '--stage', 'build', spec=OBSPEC)
expect('--stage build skips obligations', not has(out, 'FAIL', 'obligation') and not has(out, 'WARN', 'no obligations'), out)
expect('an unmet obligation names its rule', has(run(d, spec=OBSPEC), 'FAIL', '[PRG-5 · COM-9]'))

# ── 4. continuity against the cycle just trained ─────────────────────────────
def ex(name, exid, **rx): return {"type": "standard", "name": name, "exId": exid, "rx": rx}
NEW = {
  "athlete": {"id": "test_athlete"}, "currentCycleIndex": 1,
  "cycles": [{"num": 1, "name": "One", "art": "bedrock"},
             {"num": 2, "name": "Two", "art": "build",
              "weekNotes": {"last": {"setsDrop": 1, "rpeCap": 6, "text": "One set fewer on every exercise and every RPE at 6."}}}],
  "workouts": {"days": [
    {"id": 1, "blocks": [
      {"title": "Primary", "exercises": [ex("Barbell Back Squat", "barbell-back-squat", sets=4, reps=6, rpe=7, tempo="3-0-1-0")]},
      {"title": "Accessory", "exercises": [
        ex("Chest-Supported Dumbbell Row", "chest-supported-dumbbell-row", sets=3, reps=12, rpe=7, tempo="2-0-1-0"),
        ex("Cable Face Pull", "cable-face-pull", sets=3, reps=15, rpe=7, tempo="2-1-1-0"),
        ex("Dead Bug", "dead-bug", sets=3, reps=8, side=True, rpe=7, tempo="2-0-2-0")]}]},
    {"id": 2, "blocks": [
      {"title": "Accessory", "exercises": [ex("Lat Pulldown", "lat-pulldown", sets=3, reps=10, rpe=8, tempo="3-0-1-0")]},
      {"title": "Finisher", "exercises": [{"type": "circuit", "name": "Engine", "rx": {"rounds": 3, "rest": 60},
          "items": [{"name": "Kettlebell Swing", "exId": "kettlebell-swing", "rx": {"reps": 15}},
                    {"name": "Medicine Ball Rotational Throw", "exId": "medicine-ball-rotational-throw", "rx": {"reps": 5, "side": True}}]}]}]}
  ]},
  "notes": {"cards": [{"title": "Hi", "body": "<p>Hello.</p>"}]}
}
PREV = {"cci": 0, "days": [
  {"id": 1, "blocks": [
    {"t": "Primary", "x": [{"n": "Barbell Back Squat", "type": "standard", "chips": [{"label": "4 Sets"}, {"label": "×6"}, {"label": "RPE 7"}, {"label": "Tempo 3-0-1-0"}]}]},
    {"t": "Accessory", "x": [
      {"n": "Chest-Supported Dumbbell Row", "type": "standard", "chips": [{"label": "3 Sets"}, {"label": "×12"}, {"label": "RPE 7"}, {"label": "Tempo 2-0-1-0"}]},
      {"n": "Cable Face Pull", "type": "standard", "rx": {"sets": 3, "reps": 12, "rpe": 7}},
      {"n": "Dead Bug", "type": "standard", "chips": [{"label": "3 Sets"}, {"label": "×8 Each Side"}, {"label": "RPE 7"}, {"label": "Tempo 2-0-2-0"}]}]}]},
  {"id": 2, "blocks": [
    {"t": "Accessory", "x": [{"n": "Lat Pulldown", "type": "standard", "rx": {"sets": 3, "reps": 10, "rpe": 8, "tempo": "3-0-1-0"}}]},
    {"t": "Finisher", "x": [{"n": "Engine", "type": "circuit", "rx": {"rounds": 3, "rest": 60},
        "items": [{"n": "Kettlebell Swing", "rx": {"reps": 15}}, {"n": "Farmer's Carry", "rx": {"distance": "20m"}}]}]}]}]}
LEDGER = ("| Exercise | Status | Last cycle | Note |\n|---|---|---|---|\n"
          "| Lat Pulldown | Pain-flagged | C1 | shoulder pinch at the top |\n"
          "| Cable Face Pull | Available | C1 | Do not reintroduce without checking the rope attachment |\n")
SPINE = "\n".join([
  "barbell-back-squat|approved|true|strength,muscle|squat|none|barbell;rack|Barbell Back Squat|Back Squat|glutes:0.5,quads:1|heavy",
  "chest-supported-dumbbell-row|approved|true|muscle|pull-horizontal|none|dumbbells;incline bench|Chest-Supported Dumbbell Row||back:1,biceps:0.5|moderate",
  "cable-face-pull|approved|true|armour|pull-horizontal|none|cable;rope|Cable Face Pull|Face Pull|back:1,shoulder:0.5|isolation",
  "dead-bug|approved|true|armour|anti-extension|none|floor|Dead Bug||core:1|isolation",
  "lat-pulldown|approved|true|muscle|pull-vertical|none|cable;lat bar|Lat Pulldown||back:1,biceps:0.5|moderate",
  "kettlebell-swing|approved|true|power|hinge|none|kettlebell|Kettlebell Swing||glutes:1,hamstrings:0.5|moderate",
  "medicine-ball-rotational-throw|approved|true|rotation|throw|none|medicine ball;wall|Medicine Ball Rotational Throw||core:0.5|moderate"])
def cont(data, *flags, spec=None, prev=PREV, ledger=LEDGER):
    return run(data, *flags, spec=spec, ctx=[{"spine": SPINE, "prev": prev, "ledger": ledger}])
out = cont(NEW)
expect('continuity: no traceback', 'Traceback' not in out, out)
expect('70%+ kept fails', has(out, 'FAIL', 'carried over unchanged from last cycle'), out)
expect('each kept one warns without keep:', has(out, 'WARN', 'Cable Face Pull: kept from last cycle'), out)
if HAVE_NODE:
    expect('legacy chips vs rx: an identical dose fails', has(out, 'FAIL', 'Chest-Supported Dumbbell Row: kept with the same dose'), out)
    expect('a moved dose passes', not has(out, 'FAIL', 'Cable Face Pull: kept with the same dose'), out)
    expect('a primary on the same dose only warns', has(out, 'WARN', 'Barbell Back Squat: the same sets, reps and RPE'), out)
    expect('the same circuit item and rounds fails', has(out, 'FAIL', 'Kettlebell Swing (in Engine): kept with the same dose'), out)
expect('pain-flagged in the ledger fails', has(out, 'FAIL', 'Lat Pulldown: the Exercise Ledger says pain-flagged'), out)
expect('a "do not reintroduce" note warns', has(out, 'WARN', 'Cable Face Pull: its ledger note says not to reintroduce'), out)
out = cont(NEW, spec="keep: Chest-Supported Dumbbell Row (only row the gym has), Dead Bug (rehab)\nreintroduce: Lat Pulldown (pain gone for 6 weeks), Cable Face Pull (rope checked)\n")
expect('keep: silences the warning', not has(out, 'WARN', 'Dead Bug: kept from last cycle'), out)
expect('reintroduce: excuses the ledger', not has(out, 'FAIL', 'Exercise Ledger says pain-flagged') and not has(out, 'WARN', 'ledger note says'), out)
d = copy.deepcopy(NEW); d['currentCycleIndex'] = 0
expect('same cci: not compared', has(cont(d), 'INFO', 'the live cycle, not a new one'))
expect('no prev: skipped', has(cont(NEW, prev={"cci": 0, "days": []}), 'INFO', 'continuity checks skipped'))
d = copy.deepcopy(NEW); d['currentCycleIndex'] = 0; d['cycles'] = [d['cycles'][1]]
d['cycles'][0]['weekNotes']['first'] = {"rpeCap": 7, "text": "Start lighter than you think and keep every set at RPE 7 or under."}
d['workouts']['days'][0]['blocks'][0]['exercises'][0]['rx'].pop('tempo')
d['workouts']['days'][1]['blocks'][1]['exercises'] = [ex("Medicine Ball Rotational Throw", "medicine-ball-rotational-throw", sets=3, reps=5, side=True)]
out = cont(d, prev={"cci": 0, "days": []})
expect('"weighted" from the Spine with no tempo still fails', has(out, 'FAIL', 'Barbell Back Squat: 6 reps') and 'from its Spine entry' in out, out)
expect('a throw is exempt from the 8-rep rule', has(out, 'INFO', 'Medicine Ball Rotational Throw: 5 reps, not a weighted lift'), out)
d = copy.deepcopy(NEW)
d['workouts']['days'][0]['blocks'].append({"title": "Finisher", "exercises": [{"type": "circuit", "name": "Engine 2", "rx": {"rounds": 2},
    "items": [{"name": "Kettlebell Swing", "exId": "kettlebell-swing", "rx": {"reps": 12}}]}]})
d['workouts']['days'][0]['blocks'][1]['exercises'] += [ex("Leg Curl", "leg-curl", sets=3, reps=10, rpe=8, tempo="3-0-1-0"),
    ex("Leg Extension", "leg-extension", sets=3, reps=10, rpe=8, tempo="3-0-1-0"), ex("Calf Raise", "calf-raise", sets=3, reps=12, rpe=8, tempo="2-1-1-0")]
out = cont(d)
expect('a circuit item on two days fails', has(out, 'FAIL', 'kettlebell-swing: in 2 working blocks'), out)
expect('a grind day warns', has(out, 'WARN', 'Day 1: 8 working exercises'), out)
d = copy.deepcopy(NEW); d['cycles'][1]['weekNotes']['last'] = {"setsDrop": 1, "rpeCap": 6}; d['notes'] = {"cards": [{"title": "x", "body": "plain text"}]}
out = cont(d, '--stage', 'build')
expect('build: week-note numbers need no words yet', not has(out, 'FAIL', 'needs a text'), out)
expect('build: no card HTML check', not has(out, 'FAIL', 'not HTML'), out)
expect('final: week-note words are needed', has(cont(d), 'FAIL', 'needs a text'))

# ── 5. added 2026-09-26: Because via the app's own audit, empty rx, week:, roadmap_amend: ──
def with_why(why):
    d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['why'] = why; return d
expect('a clean Because passes', not has(run(with_why({"src": "goal", "text": "Your legs drive every serve, so this is your main lift."})), 'FAIL', 'why'))
expect('a Because over 140 characters fails', has(run(with_why({"src": "goal", "text": "x" * 141})), 'FAIL', 'why'))
expect('a Because with a semicolon fails', has(run(with_why({"src": "goal", "text": "Strong legs; better serve."})), 'FAIL', 'why'))
expect('src body needs a part', has(run(with_why({"src": "body", "text": "Kinder to your knee."})), 'FAIL', 'why'))
if HAVE_NODE:
    expect('a diagnosis word fails (the app audit)', has(run(with_why({"src": "body", "part": "knee", "text": "Your meniscus tear needs this."})), 'FAIL', 'Coach-log wording'))
    d = with_why({"src": "body", "part": "knee", "text": "Start shallow and let the knee settle."})
    d['workouts']['days'][0]['blocks'][1]['exercises'][0]['note'] = "Start shallow and let the knee settle. Go deeper from week 2."
    expect("a Because the Coach's Note repeats fails", has(run(d), 'FAIL', "Coach's Note says the same thing"))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['rx'] = {}
expect('an empty rx fails', has(run(d), 'FAIL', 'an empty rx'))
expect("the spec's week: line runs the back-to-back check", has(run(BASE, ctx=CTX, spec="week: Mon:1, Tue:1\n"), 'WARN', 'two hard lower-body days back to back'))
expect('no week: line, no back-to-back check', not has(run(BASE, ctx=CTX, spec="bans: -\n"), 'WARN', 'back to back'))
out = run(BASE, spec="bans: box jump\nroadmap_amend: cycle 3: art → voltage (box jump returns once the knee settles)\n")
expect('a roadmap_amend: line is not a fallback', not has(out, 'FAIL', 'a fallback or swap gives a banned'), out)
expect('a real fallback to a banned word still fails', has(run(BASE, spec="bans: box jump\nFallback: step-up → box jump\n"), 'FAIL', 'a fallback or swap gives a banned'))

d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['note'] = "Start shallow and let the first set tell you."
SPEC2 = ("Barbell Back Squat | role: primary\nnote_flag: staged knee return, shallow first\n"
         "Lat Pulldown | role: primary\nnote_flag: neutral grip only, elbow history\n")
expect("a flagged Coach's Note that never landed warns", has(run(d, spec=SPEC2), 'WARN', "flags 2 Coach's Notes and the programme carries 1"))
d['workouts']['days'][1]['blocks'][1]['exercises'][0]['note'] = "Neutral grip only."
expect('every flagged note placed: no warning', not has(run(d, spec=SPEC2), 'WARN', "Coach's Notes and the programme"))
expect('template placeholders are not flags', not has(run(BASE, spec="note_flag: [optional]\nnote_flag: -\n"), 'WARN', "Coach's Notes and the programme"))
expect('a Because with no why_flag warns', has(run(with_why({"src": "goal", "text": "Your legs drive every serve."}), spec="bans: -\n"), 'WARN', 'flags 0 Becauses and the programme carries 1'))

d = copy.deepcopy(BASE); d['notes'] = {"cards": [{"title": f"Card {i}", "body": "<p>One idea.</p>"} for i in range(9)]}
expect('nine notes cards warn (soft cap 8)', has(run(d), 'WARN', 'over the soft cap of 8'))
d['notes']['cards'] = d['notes']['cards'][:8]
expect('eight notes cards pass', not has(run(d), 'WARN', 'soft cap'))
# ── 7. the volume count from the Spine's credits (stage39, 2026-09-26) ──────
TAB = os.path.join(TMP, 'volume.md')
def tables(data, *flags, spec=None, ctx=CTX):
    if os.path.exists(TAB): os.remove(TAB)
    out = run(data, '--tables', TAB, *flags, spec=spec, ctx=ctx)
    return out, (open(TAB, encoding='utf-8').read() if os.path.exists(TAB) else '')
out, tab = tables(BASE)
expect('volume: no traceback', 'Traceback' not in out, out)
expect('volume: the squat row, fractions shown', '| D1 | Barbell Back Squat | 4 | Quads 4 · Glutes 2 (×0.5) |' in tab, tab)
expect('volume: the pulldown row', '| D2 | Lat Pulldown | 4 | Back 4 · Biceps 2 (×0.5) |' in tab, tab)
expect('volume: a ride in the warm-up counts toward nothing', 'Stationary Bike' not in tab, tab)
expect('volume: the muscle total and its verdict', '| Quads | 4 | 10–20 | under 10 |' in tab, tab)
expect('volume: a major muscle with nothing on it is listed', '| Chest | 0 | 10–20 | under 10 |' in tab, tab)
expect('volume: day load = working sets x cost', '| D1 | 7 | 7.5 |' in tab and '| D2 | 4 | 4 |' in tab, tab)
d = copy.deepcopy(BASE)
d['workouts']['days'][0]['blocks'][0]['exercises'] += [ex("Dead Bug", "dead-bug", sets=2, reps=8, side=True),
                                                       ex("Glute Bridge", "glute-bridge", sets=2, reps=10)]
out, tab = tables(d)
expect('volume: core in the warm-up counts', '| D1 prep | Dead Bug | 2 | Core 2 |' in tab, tab)
expect('volume: anything else in the warm-up does not', 'Glute Bridge' not in tab and '| D1 | 7 | 7.5 |' in tab, tab)
d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'].append({"title": "Conditioning", "exercises": [
    {"type": "circuit", "name": "Old Engine", "rounds": "×3 Rounds", "items": [{"name": "Kettlebell Swing", "exId": "kettlebell-swing", "detail": "×12"}]}]})
out, tab = tables(d)
expect('volume: a legacy "×3 Rounds" circuit counts three rounds', '| D2 | Kettlebell Swing | 3 | Glutes 3 · Hamstrings 1.5 (×0.5) |' in tab, tab)
nocred = [{"spine": SB.replace('|back:1,biceps:0.5|moderate', '||'), "prev": None, "ledger": None}]
out = run(BASE, ctx=nocred)
expect('volume: an entry with no credits fails', has(out, 'FAIL', '[VOL-10] no muscle credits on the Spine entry lat-pulldown'), out)
expect('volume: an entry with no cost warns', has(out, 'WARN', '[VOL-2] no cost tier on lat-pulldown'), out)
expect('volume: a Spine file from before credits fails too', has(run(BASE, ctx=[{"spine": "\n".join(
    l.rsplit('|', 2)[0] for l in SB.splitlines()), "prev": None, "ledger": None}]), 'FAIL', 'no muscle credits'))
d = copy.deepcopy(BASE)
d['workouts']['days'][0]['blocks'][2]['exercises'] = [ex("Goblet Squat", "goblet-squat", sets=4, reps=10, rpe=8),
                                                      ex("Machine Leg Extension", "machine-leg-extension", sets=3, reps=12, rpe=8)]
expect('volume: over 10 direct sets on one muscle in a session warns', has(run(d, ctx=CTX), 'WARN', 'Day 1: 11 direct sets on quads'))
FLAT = copy.deepcopy(BASE); FLAT['workouts']['days'] = [
    {"id": 1, "blocks": [{"title": "Primary", "exercises": [ex("Lat Pulldown", "lat-pulldown", sets=4, reps=8, rpe=8)]}]},
    {"id": 2, "blocks": [{"title": "Primary", "exercises": [ex("Chest-Supported Dumbbell Row", "chest-supported-dumbbell-row", sets=4, reps=8, rpe=8)]}]},
    {"id": 3, "blocks": [{"title": "Primary", "exercises": [ex("Dumbbell Bench Press", "dumbbell-bench-press", sets=4, reps=8, rpe=8)]}]}]
expect('volume: a flat week warns', has(run(FLAT, ctx=CTX), 'WARN', '[VOL-2] a flat week'))
FLAT['workouts']['days'][2]['blocks'][0]['exercises'][0]['rx']['sets'] = 2
expect('volume: an undulating week does not', not has(run(FLAT, ctx=CTX), 'WARN', 'a flat week'))
expect('volume: --log is retired, and says so', has(run(BASE, '--log', 'x.md', ctx=CTX), 'WARN', '--log is retired'))

# ── 8. added 2026-09-26: legacy rounds in the session length, the fingerprint's number text ──
def day2_minutes(circuit):
    d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'].append({"title": "Conditioning", "exercises": [circuit]})
    return next((l for l in run(d, ctx=CTX).splitlines() if 'Day 2 ≈' in l), '')
legacy = day2_minutes({"type": "circuit", "name": "E", "rounds": "×3 Rounds", "items": [{"name": "Kettlebell Swing", "exId": "kettlebell-swing", "rx": {"reps": 12}}]})
modern = day2_minutes({"type": "circuit", "name": "E", "rx": {"rounds": 3}, "items": [{"name": "Kettlebell Swing", "exId": "kettlebell-swing", "rx": {"reps": 12}}]})
expect('session length: a legacy "×3 Rounds" circuit times like rx.rounds 3', legacy and legacy.split('min')[0] == modern.split('min')[0], legacy + ' | ' + modern)
p = os.path.join(TMP, 'fp.json')
open(p, 'w', encoding='utf-8').write('{"athlete": {"id": "t"}, "currentCycleIndex": 1, "cycles": [{"rpe": 7.0, "load": 7.50}]}')
fp = subprocess.run([sys.executable, CHECK, p, '--fingerprint'], capture_output=True, text=True, encoding='utf-8', cwd=REPO).stdout
# leaves: "t", "1", "7.50", "7.0" = 9 characters (printed as "7.5" and "7" it was 6, a false mismatch)
expect('fingerprint keeps "7.0" and "7.50" as written, like the server', '4 leaves  9 chars' in fp, fp)
expect('volume: no --spine, no count', has(run(BASE), 'WARN', 'the volume count'))

# ── 9. COM-13: weighing in is Home → Body Weight, never Proof (2026-09-26) ──
def with_card(title, body, **extra):
    d = copy.deepcopy(BASE); d['notes'] = {"cards": [{"title": title, "body": body}]}
    for k, v in extra.items(): d['cycles'][1][k] = v
    return d
def weigh_fail(d): return has(run(d), 'FAIL', '[COM-13]')
expect('COM-13: the old walk-through to Proof fails',
       weigh_fail(with_card("Your weight", "<p>Open Proof → Today → the weight card → Weigh in, every Monday.</p>")))
expect('COM-13: a card title pairing the two fails', weigh_fail(with_card("Weigh in on AA Proof", "<p>Every Monday morning.</p>")))
expect('COM-13: a focus line fails', weigh_fail(with_card("Hi", "<p>Hello.</p>", focuses=["Log your body weight in Proof every week"])))
expect('COM-13: an outcome line fails', weigh_fail(with_card("Hi", "<p>Hello.</p>", message={"paragraphs": [], "outcomes": ["A weekly weigh-in tracked in Proof"]})))
expect('COM-13: sleep and protein in Proof pass',
       not weigh_fail(with_card("Recovery", "<p>Tick sleep and protein in Proof every day. It is how I see your week.</p>")))
expect('COM-13: a bodyweight squat beside Proof passes',
       not weigh_fail(with_card("Rest days", "<p>Do 20 bodyweight squats and tick Movement in Proof.</p>")))
expect('COM-13: the right place passes, with Proof in the next sentence',
       not weigh_fail(with_card("Your weight", "<p>Weigh in on Home → Body Weight every Monday. Keep ticking sleep in Proof.</p>")))
expect('COM-13: "not in Proof" passes',
       not weigh_fail(with_card("Your weight", "<p>Weigh in on Home → Body Weight, not in Proof.</p>")))
# Lines from the live programmes (2026-09-26): judged by clause, not by the two words sharing a text.
for line in ["Weekly weigh-in on the Body Weight card, habits logged in Proof",
             "Weigh yourself once a week, same day, same time, before breakfast. Log it on the Body Weight card on your Home screen, not in Proof.",
             "Log it in Proof every day so we can put your sleep next to your training and your weight",
             "Track the protein habit in AA Proof. Once I can see a few weeks of it next to your weight, we adjust."]:
    expect(f'COM-13 passes: {line[:50]}', not weigh_fail(with_card("Hi", "<p>Hello.</p>", focuses=[line])))
for line in ["Weigh In On Proof", "log your weight in AA Proof",
             "Open AA Proof, go to Today, find the weight card and tap Weigh in",
             "Weight logged in Proof every two weeks"]:
    expect(f'COM-13 fails: {line[:50]}', weigh_fail(with_card("Hi", "<p>Hello.</p>", focuses=[line])))
out = run(with_card("Weigh in on Proof", "<p>Monday.</p>"), '--stage', 'build')
expect('COM-13: --stage build skips it (no words yet)', not has(out, 'FAIL', '[COM-13]'), out)

# ── 10. added 2026-09-27 (the second audit): retest flags, block order, the RPE floor, names ──
def flag(d, day, block, i, test='5RM'): d['workouts']['days'][day]['blocks'][block]['exercises'][i]['test'] = test; return d
d = flag(copy.deepcopy(BASE), 0, 1, 0)
expect('TST-5: one retest flag in a returning cycle passes', not has(run(d, ctx=CTX), 'FAIL', '[TST-5]'))
d['currentCycleIndex'] = 0; d['cycles'][0]['weekNotes'] = {"first": {"rpeCap": 7, "text": "Start lighter and keep every set at RPE 7 or under."},
                                                           "last": {"setsDrop": 1, "text": "One set fewer on everything."}}
expect('TST-5: a retest flag in a first cycle fails', has(run(d, ctx=CTX), 'FAIL', 'retest flag in a first cycle'))
d = copy.deepcopy(BASE)
d['workouts']['days'][0]['blocks'][2]['exercises'] += [ex("Goblet Squat", "goblet-squat", sets=3, reps=10, rpe=8),
                                                       ex("Dumbbell Bench Press", "dumbbell-bench-press", sets=3, reps=10, rpe=8)]
for i in range(3): flag(d, 0, 2, i)
flag(d, 0, 1, 0)
expect('TST-5: four retest flags fail', has(run(d, ctx=CTX), 'FAIL', '4 retest flags'))
for v, ok in [(True, True), ('3RM', True), ('10RM', True), ('5 rm', True), ('11RM', False), ('0RM', False), ('heavy', False), (5, False), ('5RMx', False), ('5RM\n', False)]:
    d = flag(copy.deepcopy(BASE), 0, 1, 0, v)
    expect(f'TST-5: test {v!r} is {"a flag the app reads" if ok else "refused (the app ignores it)"}', ok != has(run(d, ctx=CTX), 'FAIL', 'the app ignores it'))
d = copy.deepcopy(BASE); flag(d, 0, 0, 0)
expect('TST-5: a flag on a timed warm-up warns', has(run(d, ctx=CTX), 'WARN', 'a retest flag belongs on a grinding standard lift'))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][1]['title'] = 'Strength'
expect('SES-9: a block called Strength fails', has(run(d, ctx=CTX), 'FAIL', "a block called 'Strength'"))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'].insert(1, {"title": "Core", "exercises": [ex("Dead Bug", "dead-bug", sets=2, reps=8, side=True)]})
expect('SES-9: Core before Primary warns', has(run(d, ctx=CTX), 'WARN', "'Primary' comes after 'Core'"))
expect('SES-9: the standard order is quiet', not has(run(BASE, ctx=CTX), 'WARN', '[SES-9]'))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'].append({"title": "Mobility Flow", "exercises": [{"type": "simple", "name": "Couch Stretch", "exId": "couch-stretch", "rx": {"time": "60s"}}]})
expect('SES-9: a mobility block at the end is fine', not has(run(d), 'WARN', '[SES-9]'))
for text, ok in [("Drop 1 RPE on Day 6.", False), ("Knock 1 off every RPE: 6 is the floor.", True),
                 ("Anything already at 6 stays at 6 when you take 1 off every RPE.", True),
                 ("Take 1 off every RPE, never below 6.", True), ("Take 1 off every RPE and never go under your target.", False)]:
    out = run(with_card("Rough days", f"<p>{text}</p>"))
    expect(f"CHP-4 {'passes' if ok else 'fails'}: {text[:45]}", has(out, 'FAIL', 'without naming the floor') != ok, out)
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][2]['exercises'][0]['name'] = 'Bodyweight Reverse Lunge'
expect('NAM-2: a "Bodyweight" prefix fails', has(run(d, ctx=CTX), 'FAIL', "drop the 'Bodyweight' prefix"))
d = copy.deepcopy(BASE); d['workouts']['days'][0]['blocks'][2]['exercises'][0]['name'] = 'Machine Seated Leg Curl (slow)'
expect('NAM-4: brackets in a name fail', has(run(d, ctx=CTX), 'FAIL', 'brackets, colons or commas'))
NAMES = "\n".join(["Back Squat|barbell-back-squat||Barbell Back Squat", "DB Goblet Squat||goblet-squat|Goblet Squat",
                   "Sled Push|||", "Lat Pulldown|lat-pulldown||Lat Pulldown"])
d = copy.deepcopy(BASE)
d['workouts']['days'][0]['blocks'][1]['exercises'][0].pop('exId'); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['name'] = 'Back Squat'
d['workouts']['days'][0]['blocks'][2]['exercises'].append({"type": "standard", "name": "DB Goblet Squat", "rx": {"sets": 3, "reps": 10, "rpe": 8}})
d['workouts']['days'][1]['blocks'][1]['exercises'].append({"type": "standard", "name": "Sled Push", "rx": {"sets": 3, "distance": "20m", "rpe": 8}})
out = run(d, ctx=[{"spine": SB, "prev": None, "ledger": None, "names": NAMES}])
expect('names: an alias hit says which exId to stamp', has(out, 'FAIL', 'no exId: the Spine has it as barbell-back-squat'), out)
expect('names: a near miss names the entry', has(out, 'FAIL', 'the nearest is Goblet Squat [goblet-squat]'), out)
expect('names: an unknown name says alias or draft', has(out, 'FAIL', 'not in the Spine by that name') and 'draft it with /spine' in out, out)
d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'][1]['exercises'][0]['exId'] = 'chest-supported-dumbbell-row'
expect('NAM-8: a name that is another entry warns', has(run(d, ctx=[{"spine": SB, "prev": None, "ledger": None, "names": NAMES}]),
       'WARN', 'its name is the Spine entry lat-pulldown, but its exId is chest-supported-dumbbell-row'))
import hashlib
good = {"spine": SB, "spine_md5": hashlib.md5(SB.encode('utf-8')).hexdigest(), "prev": None, "ledger": None}
out = run(BASE, ctx=[good])
expect('checksum: a faithful copy runs', 'STOP' not in out and 'FAIL' not in out.split('\n')[0], out)
bad_copy = dict(good, spine=SB.replace('quads:1', 'quads:0.5'))
out = run(BASE, ctx=[bad_copy])
expect('checksum: a mistyped copy stops the run', 'STOP' in out and "the saved 'spine' is not what the server sent" in out, out)
PREV_T = {"cci": 0, "days": [{"id": 1, "blocks": [{"t": "Primary", "r": 120, "x": [{"n": "Barbell Back Squat", "type": "standard", "rx": {"sets": 4, "reps": 6, "rpe": 7}}]}]},
                             {"id": 2, "blocks": [{"t": "Primary", "r": 90, "x": [{"n": "Lat Pulldown", "type": "standard", "rx": {"sets": 4, "reps": 8, "rpe": 8}}]}]}]}
out, tab = tables(BASE, ctx=[{"spine": SB, "prev": PREV_T, "ledger": None, "minutes": {"1": 15, "2": 12}, "prev_n": 2}])
expect('minutes: last cycle modelled vs logged gives a ratio', has(out, 'INFO', 'modelled → logged minutes') and 'real ≈ ×' in out, out)
expect('minutes: this cycle gets an expected real length', has(out, 'INFO', "real at last cycle's ×") or has(out, 'WARN', "real at last cycle's ×"), out)
expect('minutes: the day table carries them', '| Minutes (model) |' in tab and 'real)' in tab, tab)
out = run(BASE, ctx=[{"spine": SB, "prev": PREV_T, "ledger": None, "minutes": {"1": 90, "2": 80}, "prev_n": 2}])
expect('minutes: a ratio past 2.5 (a timer left running) is not used', has(out, 'INFO', 'too far off to use') and "real at last cycle's" not in out, out)
out = run(BASE, ctx=[{"spine": SB, "prev": PREV_T, "ledger": None, "prev_n": 5}])
expect('checksum: a prev with missing exercises stops the run', "the saved 'prev' holds 2 exercises" in out, out)
d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'][1]['exercises'].append(
    {"type": "circuit", "name": "Carry Pair", "items": [{"name": "Farmer's Carry", "rx": {"distance": "20m"}}]})
p = os.path.join(TMP, 'sql.json'); json.dump(d, open(p, 'w', encoding='utf-8'))
sql = subprocess.run([sys.executable, CHECK, p, '--spine-sql'], capture_output=True, text=True, encoding='utf-8', cwd=REPO).stdout
expect("--spine-sql: a card name's apostrophe is doubled", "'Farmer''s Carry'" in sql and 'cards(n)' in sql, sql[:400])
expect("--spine-sql: a circuit's own name is not a card", "'Carry Pair'" not in sql, sql[:400])
expect('--spine-sql: checksums and minutes are asked for', 'spine_md5' in sql and 'prev_n' in sql and 'as minutes' in sql, sql[-600:])

# ── 11. added 2026-10-11 (the exercise card blueprint): the pill list, the Coach's Note, steps ──
def with_pill(intent, **rx):
    d = copy.deepcopy(BASE); e = d['workouts']['days'][0]['blocks'][1]['exercises'][0]
    e['intent'] = intent; e['rx'].update(rx); return d
def pill_fails(d): return [l for l in run(d, ctx=CTX).splitlines() if l.startswith('FAIL') and '[CHP-2]' in l]
expect('CHP-2: two values from two groups pass', not pill_fails(with_pill('neutral grip · max intent')))
expect('CHP-2: case and spaces do not matter', not pill_fails(with_pill('  Neutral Grip  ·Max Intent ')))
out = '\n'.join(pill_fails(with_pill('right leg first')))
expect('CHP-2: an old spelling fails and names its value', "the pill 'right leg first' is not on the list (write 'right side first')" in out, out)
out = '\n'.join(pill_fails(with_pill('3s eccentric')))
expect('CHP-2: tempo words in the pill point at rx.tempo', 'the tempo is said once, in rx.tempo' in out, out)
expect('CHP-2: a muscle or category fails', pill_fails(with_pill('glute focus')))
out = '\n'.join(pill_fails(with_pill('neutral grip · wide grip')))
expect('CHP-2: two from one group fail', 'two pills from the hands group' in out, out)
out = '\n'.join(pill_fails(with_pill('neutral grip · left side first · max intent')))
expect('CHP-2: three values fail', '3 pills' in out, out)
expect('CHP-2: a hold pill without iso fails', any('needs rx.tempo "iso"' in l for l in pill_fails(with_pill('mid-range hold'))))
expect('CHP-2: a hold pill with iso passes', not pill_fails(with_pill('mid-range hold', tempo='iso', time='30s', reps=None)))
expect('CHP-2: a pace pill beside an RPE fails', any('only on an item with no RPE' in l for l in pill_fails(with_pill('easy pace'))))
d = with_pill('easy pace'); d['workouts']['days'][0]['blocks'][1]['exercises'][0]['rx'].pop('rpe')
expect('CHP-2: a pace pill with no RPE passes', not pill_fails(d))
out = run(with_pill('superset'), ctx=CTX)
expect('CHP-2: a pairing fails once, as a pairing', sum(1 for l in out.splitlines() if l.startswith('FAIL') and 'superset' in l) == 1
       and has(out, 'FAIL', 'a pairing written as a pill'), out)
d = copy.deepcopy(BASE); e = d['workouts']['days'][0]['blocks'][1]['exercises'][0]
e['intent'] = 'right leg first'; e['chips'] = [{'label': '4 Sets'}]
expect('CHP-2: a legacy chips card fails CHP-5, not the list', not pill_fails(d) and has(run(d, ctx=CTX), 'FAIL', 'carries chips[]'))
d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'][0]['exercises'].append({"type": "circuit", "name": "Pair",
    "rx": {"rounds": 3}, "items": [{"name": "Dead Bug", "exId": "dead-bug", "intent": "slow", "rx": {"reps": 8}}]})
expect('CHP-2: a circuit item is checked too', any("'slow'" in l for l in pill_fails(d)))

def with_note(note, intent=None):
    d = copy.deepcopy(BASE); e = d['workouts']['days'][0]['blocks'][1]['exercises'][0]
    e['note'] = note
    if intent: e['intent'] = intent
    return d
expect('COM-14: a two-sentence note passes', not has(run(with_note("Last cycle 60 kg for 6 at RPE 8. Try 62.5 kg and let the first set decide.")), 'WARN', '[COM-14]'))
expect('COM-14: four sentences warn', has(run(with_note("One. Two. Three. Four.")), 'WARN', "[COM-14] Day 1 · Barbell Back Squat: the Coach's Note is 4 sentences"))
expect('COM-14: over 300 characters warns', has(run(with_note("Start light " + "and keep going " * 25 + "today.")), 'WARN', '[COM-14]'))
expect('COM-14: --stage build skips the note checks', not has(run(with_note("One. Two. Three. Four."), '--stage', 'build'), 'WARN', '[COM-14]'))
expect('CUE-7: a note repeating its pill warns', has(run(with_note("Left side first, then switch.", intent='left side first')), 'WARN', "[CUE-7]"))
expect('CUE-7: a note that only shares a word passes', not has(run(with_note("Stop at the box, not the floor.", intent='max intent')), 'WARN', '[CUE-7]'))
expect('NAM-5: a grip in the note with no grip pill warns', has(run(with_note("Use a neutral grip, it suits your wrists.")), 'WARN', '[NAM-5 · COM-14]'))
expect('NAM-5: a grip pill plus a grip in the note is CUE-7, not NAM-5',
       not has(run(with_note("Neutral grip only.", intent='neutral grip')), 'WARN', '[NAM-5'))

SB_STEPS = "\n".join(l + ('|false' if l.startswith(('barbell-back-squat', 'lat-pulldown')) else '|true') for l in SB.splitlines())
out = run(BASE, ctx=[{"spine": SB_STEPS, "prev": None, "ledger": None}])
expect('CUE-6: approved entries with no steps warn, in one line', has(out, 'WARN', '[CUE-6] 2 approved entries') and 'barbell-back-squat, lat-pulldown' in out, out)
out = run(BASE, ctx=[{"spine": SB_STEPS.replace('lat-pulldown|approved', 'lat-pulldown|draft'), "prev": None, "ledger": None}])
expect('CUE-6: a draft is CUE-5, not CUE-6', has(out, 'WARN', '[CUE-6] 1 approved entry') and has(out, 'WARN', '[CUE-5]'), out)
out = run(BASE, ctx=CTX)
expect('CUE-6: an 11-field Spine file says to run --spine-sql again', has(out, 'INFO', 'no steps field') and not has(out, 'WARN', '[CUE-6]'), out)
expect('CUE-6: every entry with steps is quiet', not has(run(BASE, ctx=[{"spine": SB_STEPS.replace('|false', '|true'), "prev": None, "ledger": None}]), 'WARN', '[CUE-6]'))
PURP = "barbell-back-squat|The heaviest whole-body leg lift we use, for building maximum strength."
good_p ={"spine": SB, "prev": None, "ledger": None, "purposes": PURP, "purposes_md5": hashlib.md5(PURP.encode('utf-8')).hexdigest()}
if HAVE_NODE:
    d = with_why({"src": "goal", "text": "The heaviest whole-body leg lift we use, for building maximum strength."})
    expect("Because: a why that repeats the entry's purpose fails (why-generic)", has(run(d, ctx=[good_p]), 'FAIL', 'repeats the Spine purpose'))
    expect('Because: a personal why beside the purpose passes', not has(run(with_why({"src": "goal", "text": "Your legs drive every serve, so this is your main lift."}), ctx=[good_p]), 'FAIL', 'why'))
out = run(BASE, ctx=[dict(good_p, purposes=PURP + " Extra.")])
expect("checksum: a mistyped purposes copy stops the run", "the saved 'purposes' is not what the server sent" in out, out)
p = os.path.join(TMP, 'sql2.json'); json.dump(BASE, open(p, 'w', encoding='utf-8'))
sql = subprocess.run([sys.executable, CHECK, p, '--spine-sql'], capture_output=True, text=True, encoding='utf-8', cwd=REPO).stdout
expect("--spine-sql: each line ends with has-steps, read safely before stage64", "to_jsonb(e)->'steps'" in sql, sql[-1600:])
expect('--spine-sql: the purposes and their checksum are asked for', 'as purposes' in sql and 'purposes_md5' in sql, sql[-600:])

# ── 6. the rule index guard (scripts/check_rule_index.py) ────────────────────
spec_ri = importlib.util.spec_from_file_location('cri', os.path.join(REPO, 'scripts', 'check_rule_index.py'))
P = os.path.join(REPO, '.claude', 'COACHING-PRINCIPLES.md')
C = CHECK
def guard(mutate=None):
    mod = importlib.util.module_from_spec(spec_ri); spec_ri.loader.exec_module(mod)
    real = mod.read
    if mutate: mod.read = lambda p: mutate(p, real(p))
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf): code = mod.main()
    return code, buf.getvalue()
def on(path, old, new):
    def m(p, t):
        if os.path.normcase(os.path.abspath(p)) == os.path.normcase(os.path.abspath(path)):
            return t.replace(old, new, 1) if old in t else t + '\n<<MISSING ' + old[:30] + '>>'
        return t
    return m
def guard_fails(name, mutate, frag):
    code, out = guard(mutate)
    expect(name, code == 1 and frag in out, out)
code, out = guard()
expect('the rule index is clean', code == 0, out)
guard_fails('a ✓ rule the checker never cites', on(P, '| SEL-1 | General fitness: the highest stimulus-to-fatigue (SFR) option in each pattern leads. | design | |',
            '| SEL-1 | General fitness: the highest stimulus-to-fatigue (SFR) option in each pattern leads. | design | ✓ |'), 'SEL-1: Check says ✓')
guard_fails('a blank Check on a cited rule', on(P, 'on every exercise and circuit item. | design | ✓ (warn in text) |', 'on every exercise and circuit item. | design | |'),
            'PRG-6: the checker enforces it, but its Check column is blank')
guard_fails('the checker citing an unknown id', on(C, "'VOL-8')", "'VOL-99')"), 'cites VOL-99, which is not in the rule index')
guard_fails('a story with no tag', on(P, '- `TST-1` **Light testing only', '- **Light testing only'), 'story bullet with no rule tag')
guard_fails('a rule with no story', on(P, '- `TST-1` **Light testing only', '- `TST-2` **Light testing only'), 'TST-1: no story bullet')
guard_fails('an obligation mapped to the wrong rule', on(C, "'film': 'PRC-8'", "'film': 'PRC-7'"), 'obligation `film` maps to')
guard_fails('a duplicate id', on(P, '| NAM-2 | Equipment', '| NAM-1 | Equipment'), 'NAM-1: two rows')
guard_fails('a skill citing a rule that does not exist',
            on(os.path.join(REPO, '.claude', 'skills', 'program-engage', 'SKILL.md'), '**Change no', '**Change (VOL-42) no'), 'cites VOL-42')

# ── 7. the checker's name matching against the shared cases (audit TWIN-8, 2026-10-11) ────────────────────────────
# scripts/name_cases.json holds the four tiers the athlete app gives each name (check_twins.js keeps them current) and what the checker's SQL
# gave on the live database (scripts/name_cases_sql.py records it). norm_name() must give the app's tier 0; NORM_SQL tier 0 and LOOSE_SQL tier 2;
# and the record must be of THESE two strings. Before this the Python turned a curly apostrophe into a space ("farmer s carry") and dropped
# an accented letter ("caf"), so the checker and the phone disagreed about which card is which.
spec_cp = importlib.util.spec_from_file_location('check_program_mod', CHECK)
cp_mod = importlib.util.module_from_spec(spec_cp); spec_cp.loader.exec_module(cp_mod)
spec_ncs = importlib.util.spec_from_file_location('name_cases_sql_mod', os.path.join(REPO, 'scripts', 'name_cases_sql.py'))
ncs_mod = importlib.util.module_from_spec(spec_ncs); spec_ncs.loader.exec_module(ncs_mod)
cases = json.load(open(os.path.join(REPO, 'scripts', 'name_cases.json'), encoding='utf-8'))
def python_problems(norm, cases):
    return [f"norm_name({n!r}) = {norm(n)!r}, the app's tier 0 is {v[0]!r}" for n, v in cases['variants'].items() if norm(n) != v[0]]
def sql_problems(cases, sha):
    s = cases.get('sql')
    if not s: return ['no SQL record: run python scripts/name_cases_sql.py and record the answer']
    bad = []
    if s.get('sha') != sha:
        bad.append(f"NORM_SQL or LOOSE_SQL changed since the record was made (record {s.get('sha')}, strings {sha}): redo it with python scripts/name_cases_sql.py")
    for n, v in cases['variants'].items():
        row = (s.get('rows') or {}).get(n)
        if row != [v[0], v[2]]: bad.append(f"the SQL gave {row!r} for {n!r}; the app's tiers 0 and 2 are {[v[0], v[2]]!r}")
    return bad
sha_now = ncs_mod.sql_sha(cp_mod)
expect('the shared name cases are a real corpus (a hundred names, the curly apostrophe among them)',
       len(cases['variants']) >= 100 and cases['variants'].get('Farmer\u2019s Carry', [None])[0] == 'farmers carry', len(cases['variants']))
expect("norm_name() gives the app's tier 0 for every shared name", not python_problems(cp_mod.norm_name, cases), '\n'.join(python_problems(cp_mod.norm_name, cases)[:6]))
expect("the recorded SQL answers equal the app's tiers 0 and 2, and are of the current NORM_SQL and LOOSE_SQL", not sql_problems(cases, sha_now), '\n'.join(sql_problems(cases, sha_now)[:6]))
# and the test fails when they drift
import re as _re, unicodedata as _ud
def old_norm_name(s): return _re.sub(r'\s+', ' ', _re.sub(r"[^a-z0-9]+", ' ', str(s or '').lower().replace("'", ''))).strip()
expect('the old norm_name (no accent fold, a curly apostrophe becomes a space) is caught', any('Farmer' in p for p in python_problems(old_norm_name, cases)), '')
expect('a norm_name that keeps dashes as spaces is caught', any('Half' in p for p in python_problems(lambda s: _re.sub(r'\s+', ' ', _re.sub(r"[^a-z0-9]+", ' ', _ud.normalize('NFKD', str(s or '').lower()).encode('ascii', 'replace').decode('ascii').replace('?', ' ').replace("'", ''))).strip(), cases)), '')
expect('a changed NORM_SQL or LOOSE_SQL with the old record is caught', any('changed since the record' in p for p in sql_problems(cases, 'deadbeefdeadbeef')), '')
expect('a name added with no SQL row is caught', any('Brand New Name' in p for p in sql_problems({'variants': dict(cases['variants'], **{'Brand New Name': ['brand new name'] * 4}), 'sql': cases['sql']}, sha_now)), '')
bad_rows = dict(cases['sql']['rows']); bad_rows['Goblet Squat'] = ['goblet squats', 'goblet squat']
expect('a recorded answer that differs from the app is caught', any('Goblet Squat' in p for p in sql_problems({'variants': cases['variants'], 'sql': dict(cases['sql'], rows=bad_rows)}, sha_now)), '')

print(f"{sum(1 for _, ok in results if ok)}/{len(results)} passed" + ('' if HAVE_NODE else ' (node not found: the node-backed checks were skipped)'))
for n, ok in results:
    if not ok: print('  failed:', n)
shutil.rmtree(TMP, ignore_errors=True)
sys.exit(0 if all(ok for _, ok in results) else 1)
