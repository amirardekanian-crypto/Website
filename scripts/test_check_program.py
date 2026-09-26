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
      {"title": "Activation & Prep", "exercises": [{"type": "simple", "name": "Stationary Bike", "exId": "stationary-bike", "rx": {"time": "5 min"}}]},
      {"title": "Primary", "exercises": [{"type": "standard", "name": "Barbell Back Squat", "exId": "barbell-back-squat", "rx": {"sets": 4, "reps": 6, "rpe": 8, "tempo": "3-0-1-0", "rest": 150}}]},
      {"title": "Accessory", "exercises": [{"type": "standard", "name": "Machine Seated Leg Curl", "exId": "machine-seated-leg-curl", "rx": {"sets": 3, "reps": 10, "rpe": 8, "tempo": "3-0-1-0", "rest": 60}}]}]},
    {"id": 2, "blocks": [
      {"title": "Primary", "exercises": [{"type": "standard", "name": "Lat Pulldown", "exId": "lat-pulldown", "rx": {"sets": 4, "reps": 8, "rpe": 8, "tempo": "3-0-1-0", "rest": 90}}]}]}
  ]},
  "notes": {"cards": [{"title": "Hi", "body": "<p>Hello.</p>"}]}
}
# The made-up Spine the checker reads (the --spine-sql shape): id|status|cues|qualities|pattern|
# impact|equipment|name|aliases|credits|cost. The volume count comes from the last two fields.
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
expect('missing last week fails', has(out, 'FAIL', 'no weekNotes.last'), out)
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
expect('a new athlete needs the first week', has(out, 'FAIL', 'needs weekNotes.first'), out)
expect('cci 0: a 6-rep weighted squat fails the 8-rep rule', has(out, 'FAIL', 'no weighted exercise under 8 reps'), out)
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
d = copy.deepcopy(BASE); d['workouts']['days'][1]['blocks'][0]['exercises'][0]['name'] = 'Goblet Squat'
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
- backoff → weekNotes.last
- week1 → weekNotes.first
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
expect('week1 needs weekNotes.first', has(run(d, spec=OBSPEC), 'FAIL', "obligation 'week1' is not met: weekNotes.first"))
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
d['workouts']['days'][1]['blocks'][0]['exercises'][0]['note'] = "Neutral grip only."
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
expect('volume: no --spine, no count', has(run(BASE), 'WARN', 'the volume count'))

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

print(f"{sum(1 for _, ok in results if ok)}/{len(results)} passed" + ('' if HAVE_NODE else ' (node not found: the node-backed checks were skipped)'))
for n, ok in results:
    if not ok: print('  failed:', n)
shutil.rmtree(TMP, ignore_errors=True)
sys.exit(0 if all(ok for _, ok in results) else 1)
