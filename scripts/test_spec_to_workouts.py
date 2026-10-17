#!/usr/bin/env python3
"""Tests for scripts/spec_to_workouts.py, on a made-up athlete and a made-up spec.

Why (2026-10-17): the build script is what turns design's doses into the programme, so a parse slip would put a
wrong rest or a lost side on a card with no error. These run from .githooks/pre-commit with the checker's tests
(the script uses the checker's helpers), and the last group runs the checker on what the script built. Nothing here
touches the database or any real athlete's data.

  python scripts/test_spec_to_workouts.py        # exit 1 on any failure
"""
import json, os, shutil, subprocess, sys, tempfile

for _s in (sys.stdout, sys.stderr):
    _s.reconfigure(encoding='utf-8')

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(REPO, 'scripts', 'spec_to_workouts.py')
CHECK = os.path.join(REPO, 'scripts', 'check_program.py')
TMP = tempfile.mkdtemp(prefix='spec_to_workouts_tests_')

def write(name, data):
    p = os.path.join(TMP, name)
    if isinstance(data, str): open(p, 'w', encoding='utf-8', newline='').write(data)
    else: json.dump(data, open(p, 'w', encoding='utf-8'), ensure_ascii=False)
    return p

def build(spec, *flags, out='out.json'):
    """Run the script on spec text; (stdout + stderr, exit code, the written JSON or None)."""
    o = os.path.join(TMP, out)
    if os.path.exists(o): os.remove(o)
    r = subprocess.run([sys.executable, BUILD, write('spec.md', spec), o] + list(flags),
                       capture_output=True, text=True, encoding='utf-8', cwd=REPO)
    return r.stdout + r.stderr, r.returncode, (json.load(open(o, encoding='utf-8')) if os.path.exists(o) else None)

results = []
def expect(name, cond, out=''):
    results.append((name, bool(cond)))
    if not cond: print('--- FAILED:', name, '\n', out)

def card(data, day, title, name):
    d = next(d for d in data['workouts']['days'] if d['id'] == day)
    b = next(b for b in d['blocks'] if b['title'] == title)
    return next(e for e in b['exercises'] if e['name'] == name)

# ── the made-up spec, in /program-design's OUTPUT FORMAT ─────────────────────
SPEC = """```profile
aim: strength-muscle
proven: -
bans: -
cap: 70
```
ATHLETE_ID: test_athlete
SPORT_BADGE: 🎾 Tennis Performance
PROGRAM: 2 | 2 days | a made-up block
week: Sat:1, Tue:2
weeknotes:
- 1 | rpeCap 7 | find your weights first
- 5 | Back-off week | setsDrop 1 · rpeCap 6
bans: -
obligations:
- backoff
keep: Dead Bug (rehab, kept on purpose)

---
DAY 1 — Lower: squat, jumps | load identity: peak

SECTION: Activation & Prep   (logs nothing — no RPE)
  • Stationary Bike | 5 min | intent: easy pace
  PREP CIRCUIT | rounds: 2 | rest: 30s
    Glute Bridge — reps: 12
    Dead Bug — reps: 8 each side | RPE: 5
(a comment over
 two lines: with a colon | and a pipe)

SECTION: Power
Jump & Throw Pair | role: circuit (power pair) | rounds: 4 | rest: 75s (once per round, after both) | RPE: 7
  Box Jump — reps: 5 | why_flag: the next rung
  Medicine Ball Rotational Throw — reps: 4 each side | note_flag: a 4 kg ball

SECTION: Primary
Barbell Back Squat | role: primary
sets: 4 | reps: 8 | tempo: 3-1-1-0 | RPE: 8 | rest: 2 min | intent: none | test_flag: 5RM
note_flag: start near last cycle's top set, then let RPE decide
why_flag: cycle — up from 6 reps
fallback: Goblet Squat

SECTION: Accessory
Machine Seated Leg Curl + Machine Leg Extension | role: circuit (superset) | rounds: 3 | rest: 90s | RPE: 8
  Machine Seated Leg Curl — reps: 10
  Machine Leg Extension — reps: 12

SECTION: Core
Side Plank | role: core
sets: 3 | time: 30s each side | tempo: iso | RPE: 7 | rest: 45s

---
DAY 2 — Upper: pull and press | load identity: moderate

SECTION: Activation & Prep
  PREP CIRCUIT: Shoulder Prep | rounds: 2 | rest: 30s
    Band Pull-Apart — reps: 15
    Scapular Push-Up — reps: 8

SECTION: Primary
Lat Pulldown | role: primary
sets: 4 | reps: 8 | tempo: 3-0-1-0 | RPE: 8 | rest: 90s (2 min on the squat day)

SECTION: Accessory
Dumbbell Bench Press | role: accessory
sets: 3 | reps: 10 | tempo: 3-0-1-0 | RPE: 8 | rest: 90s | intent: neutral grip, max intent

SECTION: Conditioning
  • Assault Bike | time: 10 min | rest: 60s

---
new_exercise: Made Up Move | pattern: hinge | qualities: muscle
  steps: 1. Stand tall. 2. Hinge: then stand.
  cues: key point "x" · check "y" · avoid "z"
spine_cue: dead-bug | its On court line is empty
fallback per primary: Barbell Back Squat → Goblet Squat
"""

# ── 1. the doses, as the spec wrote them ─────────────────────────────────────
out, code, data = build(SPEC)
expect('the made-up spec builds', code == 0 and data, out)
w = data['workouts']
expect('two days, in order', [d['id'] for d in w['days']] == [1, 2], w)
expect('block titles keep the spec, comments off', [b['title'] for b in w['days'][0]['blocks']] ==
       ['Activation & Prep', 'Power', 'Primary', 'Accessory', 'Core'], w['days'][0])
expect('icons from SCHEMA', [b.get('icon') for b in w['days'][0]['blocks']] == ['🔥', '⚡', '🎯', '💪', '🧱']
       and w['days'][1]['blocks'][-1].get('icon') == '🫀', w)
prep = w['days'][0]['blocks'][0]['exercises']
expect('a warm-up line: simple, time as written, its pill', prep[0] == {'name': 'Stationary Bike', 'type': 'simple',
       'rx': {'time': '5 min'}, 'intent': 'easy pace'}, prep[0])
expect('the prep circuit: rounds and rest, each item its reps, the side on its own',
       prep[1] == {'name': 'Prep Circuit', 'type': 'circuit', 'rx': {'rounds': 2, 'rest': 30},
                   'items': [{'name': 'Glute Bridge', 'rx': {'reps': 12}}, {'name': 'Dead Bug', 'rx': {'reps': 8, 'side': True}}]}, prep[1])
expect("a prep item's RPE is left out, and said", 'Dead Bug: left out its rpe' in out, out)
expect('a comment over two lines is skipped', 'with a colon' not in out and code == 0, out)
pair = card(data, 1, 'Power', 'Jump & Throw Pair')
expect('a working circuit: rounds, one RPE, the rest with its bracket off', pair['rx'] == {'rounds': 4, 'rpe': 7, 'rest': 75}
       and pair['type'] == 'circuit', pair)
expect('its items: reps and side only, flags ignored', pair['items'] == [{'name': 'Box Jump', 'rx': {'reps': 5}},
       {'name': 'Medicine Ball Rotational Throw', 'rx': {'reps': 4, 'side': True}}], pair['items'])
sq = card(data, 1, 'Primary', 'Barbell Back Squat')
expect('a primary: every dose, 2 min is 120 s, the retest flag, no pill for none',
       sq == {'name': 'Barbell Back Squat', 'type': 'standard', 'rx': {'sets': 4, 'reps': 8, 'tempo': '3-1-1-0', 'rpe': 8, 'rest': 120},
              'test': '5RM'}, sq)
expect('no words and no cues on any card', '"note"' not in json.dumps(data) and '"why"' not in json.dumps(data)
       and '"cues"' not in json.dumps(data))
sp = card(data, 1, 'Core', 'Side Plank')
expect('a hold: time each side, the iso tempo', sp['rx'] == {'sets': 3, 'time': '30s', 'side': True, 'tempo': 'iso', 'rpe': 7, 'rest': 45}, sp)
expect('a named prep circuit keeps its name', card(data, 2, 'Activation & Prep', 'Shoulder Prep')['rx'] == {'rounds': 2, 'rest': 30})
expect('two pill values join with the middle dot', card(data, 2, 'Accessory', 'Dumbbell Bench Press')['intent'] == 'neutral grip · max intent')
expect('rest with a bracket comment', card(data, 2, 'Primary', 'Lat Pulldown')['rx']['rest'] == 90)
bike = card(data, 2, 'Conditioning', 'Assault Bike')
expect('a simple line never takes a rest, and says so', bike['rx'] == {'time': '10 min'} and 'Assault Bike: left out its rest' in out, bike)
expect('the week notes: numbers, the title before them, no words', data['weekNotes'] ==
       {'1': {'rpeCap': 7}, '5': {'setsDrop': 1, 'rpeCap': 6, 'title': 'Back-off week'}}, data['weekNotes'])
expect('the badge', data.get('sport') == {'badge': '🎾 Tennis Performance'}, data.get('sport'))
expect('new_exercise, spine_cue and their lines are not cards', 'Made Up Move' not in json.dumps(data, ensure_ascii=False)
       and 'Hinge' not in json.dumps(data), out)
expect('still yours: the label, each day name and picture, the unnamed prep, the A + B circuit',
       'workouts.label' in out and "Day 1: focusTag, art, the prep circuit's name" in out and 'Day 2: focusTag, art' in out
       and "name the circuit 'Machine Seated Leg Curl + Machine Leg Extension'" in out, out)
expect('without --spine every id waits, and it says how', 'no --spine' in out and '"exId"' not in json.dumps(data), out)
out2, code2, data2 = build(SPEC.replace('\n', '\r\n'))
expect('a CRLF spec builds the same', code2 == 0 and data2 == data, out2)

# ── 2. a gap in the spec stops the run, with its line ────────────────────────
GAPS = """PROGRAM: 2 | 1 day | gaps
weeknotes:
- one | rpeCap 7
---
DAY 1 — gaps
Orphan Card | role: primary
SECTION: Primary
Barbell Back Squat | role: primary
sets: 4 | reps: 8-10 | RPE: 8 | rest: 120s
Lat Pulldown | role: accessory
sets: 3 | reps: 10 | RPE: 8
Cable Row | role: accessory
sets: 3 | reps: 10 | rest: 60s | load: 20 kg
SECTION: Accessory
Arm Pair | role: circuit | rounds: 3 | rest: 60s
  Dumbbell Curl — reps: 10 | RPE: 8
  Stray Item
"""
out, code, data = build(GAPS)
expect('gaps: exit 1 and nothing written', code == 1 and data is None, out)
expect('gaps: a card before any SECTION', 'line 6: Day 1 · Orphan Card: a card before any SECTION' in out, out)
expect('gaps: a rep range names PRG-6', "line 8: Day 1 · Barbell Back Squat: reps '8-10' is not one number: a range" in out and 'PRG-6' in out, out)
expect('gaps: a working card with no rest names CHP-7', 'line 10: Day 1 · Lat Pulldown: no rest' in out and 'CHP-7' in out, out)
expect('gaps: a field it does not know', "line 13: Day 1 · Cable Row: 'load:' is not a field" in out, out)
expect("gaps: an item's RPE belongs on the circuit (SES-13)", 'line 16: Day 1 · Dumbbell Curl: rpe on a circuit item' in out and 'SES-13' in out, out)
expect('gaps: an item with no dose', 'line 17: Day 1 · Stray Item: no dose' in out, out)
expect('gaps: a weeknotes line with no week number', "line 3: weeknotes: '- one | rpeCap 7'" in out, out)
expect('gaps: every one reported at once', out.count('\n  line ') == 7, out)

# ── 3. the choices file and the Spine's names ────────────────────────────────
CHOICES = write('choices.json', {
    'label': 'Program 02 · Made Up',
    'days': {'1': {'focusTag': 'Built From The Legs Up', 'art': 'lower', 'prep': 'Hinge & Hip Prep'},
             '2': {'focusTag': 'Press, Pull, Repeat', 'art': 'upper'}, '9': {}},
    'rename': {'Machine Seated Leg Curl + Machine Leg Extension': 'Hamstring & Quad Superset'},
    'exId': {'Side Plank': 'side-plank'}})
MATCH = write('match.json', [{'names': '\n'.join([
    'Barbell Back Squat|barbell-back-squat||Barbell Back Squat',
    'Box Jump||box-jump-to-stick|Box Jump To Stick',
    'Glute Bridge|||'])}])
out, code, data = build(SPEC, '--choices', CHOICES, '--spine', MATCH)
expect('choices: builds', code == 0 and data, out)
w = data['workouts']
expect('choices: the label, each day name and picture', w.get('label') == 'Program 02 · Made Up' and
       [(d.get('focusTag'), d.get('art')) for d in w['days']] == [('Built From The Legs Up', 'lower'), ('Press, Pull, Repeat', 'upper')], w)
expect('choices: renames a circuit and the unnamed prep', card(data, 1, 'Accessory', 'Hamstring & Quad Superset')
       and card(data, 1, 'Activation & Prep', 'Hinge & Hip Prep'), out)
expect('choices: nothing left to name', 'STILL YOURS' not in out, out)
expect('choices: a day the spec does not have is said', 'the choices file has Day 9' in out, out)
expect("spine: an exact name is stamped", card(data, 1, 'Primary', 'Barbell Back Squat').get('exId') == 'barbell-back-squat')
expect('choices: an id from the file', card(data, 1, 'Core', 'Side Plank').get('exId') == 'side-plank')
expect('spine: a near match is left for Step 4 with its nearest', 'Day 1 · Box Jump: no entry by that name' in out
       and 'Box Jump To Stick [box-jump-to-stick]' in out and 'exId' not in card(data, 1, 'Power', 'Jump & Throw Pair')['items'][0], out)
expect('spine: no match at all says so', 'Day 1 · Glute Bridge: not in the Spine by that name' in out, out)
expect('spine: a name the saved file never saw says to run it again', 'Day 2 · Lat Pulldown: not in the saved --spine file' in out, out)
expect('a circuit gets no exId of its own', 'exId' not in card(data, 1, 'Power', 'Jump & Throw Pair'))

# ── 4. --into: the programme it goes into ─────────────────────────────────────
BASE = {'athlete': {'id': 'test_athlete', 'firstName': 'Test'}, 'sport': {'badge': 'old'}, 'currentCycleIndex': 1,
        'cycles': [{'num': 1, 'name': 'One', 'art': 'bedrock'},
                   {'num': 2, 'name': 'Two', 'art': 'iron', 'weeks': 'Weeks 6-10',
                    'weekNotes': {'5': {'setsDrop': 2, 'text': 'Old words kept.'}, 'last': {'setsDrop': 1}, '3': {'title': 'Testing week'}}},
                   {'num': 3, 'name': 'Three', 'art': 'build'}],
        'workouts': {'label': 'Program 01 · One', 'days': [{'id': 1, 'blocks': []}]},
        'notes': {'cards': [{'title': 'Hi', 'body': '<p>Hello.</p>'}]}}
base = write('base.json', BASE)
out, code, data = build(SPEC, '--into', base)
expect('into: builds', code == 0 and data, out)
expect('into: the label from the cycle name', data['workouts'].get('label') == 'Program 02 · Two', data['workouts'].get('label'))
expect("into: exactly the spec's weeks, the words kept, the old key gone", data['cycles'][1]['weekNotes'] ==
       {'1': {'rpeCap': 7}, '5': {'setsDrop': 1, 'rpeCap': 6, 'title': 'Back-off week', 'text': 'Old words kept.'}}, data['cycles'][1])
expect('into: the other cycles, the athlete and the notes untouched', data['cycles'][0] == BASE['cycles'][0]
       and data['cycles'][2] == BASE['cycles'][2] and data['athlete'] == BASE['athlete'] and data['notes'] == BASE['notes'])
expect('into: the badge', data['sport'] == {'badge': '🎾 Tennis Performance'})
expect('into: the base file itself is not written', json.load(open(base, encoding='utf-8')) == BASE)
out, code, data = build(SPEC, '--into', write('base0.json', dict(BASE, currentCycleIndex=0)))
expect('into: currentCycleIndex not bumped stops the run', code == 1 and data is None and 'goes up by one BEFORE the build' in out, out)
out, code, data = build(SPEC, '--into', write('base_other.json', dict(BASE, athlete={'id': 'someone_else'})))
expect("into: another athlete's file stops the run", code == 1 and "the spec is test_athlete's" in out, out)

# ── 5. what it builds passes the checker's build stage ───────────────────────
NAMES = ['Stationary Bike', 'Glute Bridge', 'Dead Bug', 'Box Jump', 'Medicine Ball Rotational Throw', 'Barbell Back Squat',
         'Machine Seated Leg Curl', 'Machine Leg Extension', 'Side Plank', 'Band Pull-Apart', 'Scapular Push-Up',
         'Lat Pulldown', 'Dumbbell Bench Press', 'Assault Bike']
slug = lambda n: n.lower().replace(' ', '-')
ALL = write('match_all.json', [{'names': '\n'.join(f"{n}|{slug(n)}||{n}" for n in NAMES)}])
out, code, data = build(SPEC, '--into', base, '--choices', CHOICES, '--spine', ALL)
expect('every exact name stamped', code == 0 and 'exId: 13 from the Spine' in out and '1 from the choices file, 0 left' in out, out)
r = subprocess.run([sys.executable, CHECK, os.path.join(TMP, 'out.json'), '--stage', 'build', '--spec', os.path.join(TMP, 'spec.md')],
                   capture_output=True, text=True, encoding='utf-8', cwd=REPO)
fails = [l for l in r.stdout.splitlines() if l.startswith('FAIL')]
expect('the build passes check_program.py --stage build with 0 FAIL', code == 0 and not fails and 'Traceback' not in r.stdout + r.stderr,
       r.stdout[-3000:] + r.stderr[-2000:])
# The spec's Box Jump is a circuit item with a why_flag: the app draws no Because on an item (2026-10-17).
expect("why_flag on a circuit item: the build warns, with the spec's line", 'WARN  [COM-4] line 32: Day 1 · Box Jump (in Jump & Throw Pair)' in out
       and out.count('why_flag on a circuit item') == 1, out)
expect('why_flag on a circuit item: the build check warns too', any(l.startswith('WARN') and 'spec line 32: Day 1 · Box Jump' in l
       for l in r.stdout.splitlines()), r.stdout[-3000:])

print(f"{sum(1 for _, ok in results if ok)}/{len(results)} passed")
for n, ok in results:
    if not ok: print('  failed:', n)
shutil.rmtree(TMP, ignore_errors=True)
sys.exit(0 if all(ok for _, ok in results) else 1)
