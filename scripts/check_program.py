#!/usr/bin/env python3
"""Check a built programme (data/<id>.json) against the house rules, BEFORE any review.

Why this exists (Amir, 2026-09-25, "yes, do all five"): a new athlete's first programme took
~2 h 40 min of work, and most of it was a three-agent review panel re-finding things a script can
find: a muscle under the 10-set floor, a banned hold hiding in a setup, a 6-set exercise, a note
that took RPE below 6. The panel caught 14 must-fixes; about a third were mechanical. So the
mechanical rules live here, the review keeps only the judgment, and a returning athlete's cycle
needs no reviewer at all unless Amir asks.

Plain Python 3, standard library only, so it runs wherever the pipeline does. Nothing here touches
the database: the one lookup it needs is printed by --spine-sql for you to run and save.

  python3 scripts/check_program.py data/<id>.json [options]

  --log FILE      the coaching-log entry with the per-exercise volume table (| Day | Exercise |
                  Sets | Counts toward |). Needed for the floors and the back-to-back check.
  --floor         the programme's aim is to get strong and build muscle (Amir, 2026-09-26:
                  "that rule is based on science of hypertrophy, for athletes, do what is best
                  for them"): every major muscle (quads, hamstrings, glutes, back, chest,
                  shoulder) >= 10 sets/week. Not for a sport-performance athlete. Replaces
                  --female, which only floored women's lower body.
  --floor-except  comma list of major muscles excused from the floor, each for a reason the
                  spec states (chest, posture). Without it, the spec's "floor-except: ..." line
  --proven        the athlete has PROVEN the volume in our own logs, so an exercise may carry
                  more than 4 sets (Amir, 2026-09-26: a self-described "pro" is not proof)
  --no-backoff    this cycle has no back-off week, ONLY because Amir said so for this athlete
  --new           a new athlete's first cycle: no weighted exercise under 8 reps, no working
                  circuits (supersets) at all, and a first-week note. Also switched on by
                  itself when currentCycleIndex is 0
  --cap MIN       the session cap in minutes (default 60). SOFT: a day past it is a WARN, never a
                  FAIL (Amir, 2026-09-26: the form's session length is a guess). Pass the
                  athlete's real logged minutes when you have them.
  --ban WORDS     comma list of words this athlete must not be given (goblet,hanging,...);
                  without it, the spec's "bans: ..." line is used
  --spec FILE     the design spec: its fallback lines are scanned for banned words too
  --week DAYS     the example week, e.g. "Sat:1,Sun:2,Mon:3,Wed:4" (back-to-back check); without it,
                  the spec's "week: ..." line is used
  --spine FILE    the saved result of --spine-sql: the Spine gate, the Quality Map, "weighted"
                  for the 8-rep rule, and (from last cycle and the Exercise Ledger in the same
                  result) the continuity checks: kept accessories, a kept dose that didn't move,
                  a Disliked / Pain-flagged / Banned exercise back. The spec's "keep:" and
                  "reintroduce:" lines name the ones kept or brought back on purpose, with reasons
  --spine-sql     print the one query whose result is the --spine file, then stop
  --stage S       build = straight after design, before engage writes any text: every
                  programming check, none of the text ones. final (default) = everything
  --fingerprint   print the content fingerprint and the SQL that computes the server's, then stop

In the full run it also reads the spec's "obligations:" block (the notes this cycle must carry)
and fails any key that no notes card's `tags` (or, for backoff/week1, the weekNotes) carries.

The athlete profile (a ```profile block at the top of the spec, else the one stored at the top of
the coaching log, which --spine-sql returns) sets --floor (aim: strength-muscle), --proven, the
bans, floor-except and --cap, so no run has to remember them. A flag typed here overrides it.

Exit code 1 if anything FAILs. FAIL = a house rule is broken. WARN = look at it.
"""
import argparse, hashlib, json, os, re, subprocess, sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Windows prints through cp1252, which has no ≈ or → (both in this script's report) and
# crashed the run on Amir's PC; the report is UTF-8 everywhere (2026-09-26).
for _stream in (sys.stdout, sys.stderr):
    _stream.reconfigure(encoding='utf-8')

# The ten qualities, in the app's sort order (tie-break), and each cycle art word's headline.
QUALITIES = ['strength', 'muscle', 'power', 'spring', 'speed', 'brakes', 'rotation', 'engine', 'armour', 'movement']
ART_HEADLINE = {'iron': 'strength', 'build': 'muscle', 'voltage': 'power', 'spring': 'spring',
                'brakes': 'brakes', 'engine': 'engine', 'armour': 'armour'}  # bedrock/peak/reset: none
PREP = re.compile(r'warm|mobility|activation|cool|prime|prep', re.I)  # = isPrepBlockTitle()
QM_COVERAGE = 0.7
WEEKDAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri']
MUSCLE_ALIAS = {'quad': 'quads', 'quadriceps': 'quads', 'hams': 'hamstrings', 'hamstring': 'hamstrings',
                'glute': 'glutes', 'shoulders': 'shoulder', 'calf': 'calves', 'adductor': 'adductors',
                'forearms': 'forearm', 'bicep': 'biceps', 'tricep': 'triceps', 'lats': 'back'}
LOWER = ('quads', 'hamstrings', 'glutes')
# The major muscles a strength-and-muscle programme floors at 10 sets a week (--floor).
MAJOR = ('quads', 'hamstrings', 'glutes', 'back', 'chest', 'shoulder')
NEGATION = re.compile(r"\b(no|not|never|nothing|without|avoid|avoids|banned|ban|instead of|skip|don't|do not|"
                      r"are out|is out|ruled out|off the table)\b", re.I)

out = {'FAIL': [], 'WARN': [], 'INFO': []}
# Every FAIL and WARN names the rule it enforces, from the rule index at the top of
# .claude/COACHING-PRINCIPLES.md (2026-09-26: one owner per rule; skills and this script cite it).
# scripts/check_rule_index.py holds the index's Check column to the ids cited here.
def tagged(m, rules): return (f"[{' · '.join(rules)}] " if rules else '') + m
def fail(m, *rules): out['FAIL'].append(tagged(m, rules))
def warn(m, *rules): out['WARN'].append(tagged(m, rules))
def info(m): out['INFO'].append(m)

def num(v):
    try: return float(v)
    except (TypeError, ValueError): return None

def secs(v):
    """'30s' -> 30, '5 min' -> 300, '1:30' -> 90, 20 -> 20."""
    if v is None: return None
    if isinstance(v, (int, float)): return float(v)
    s = str(v).strip().lower()
    m = re.match(r'^(\d+):(\d{2})$', s)
    if m: return int(m.group(1)) * 60 + int(m.group(2))
    m = re.match(r'^(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes)?$', s)
    if not m: return None
    n = float(m.group(1))
    return n * 60 if (m.group(2) or 's').startswith('m') else n

def metres(v):
    m = re.match(r'^\s*(\d+(?:\.\d+)?)\s*m\b', str(v or ''))
    return float(m.group(1)) if m else None

def dose_of(rx):
    return next((k for k in ('reps', 'time', 'distance', 'work') if rx.get(k) not in (None, '')), None)

# ── walking the programme ──────────────────────────────────────────────────────
def exercises(data):
    """(day, block, exercise, item-or-None) for every exercise and circuit item."""
    for d in (data.get('workouts') or {}).get('days') or []:
        for b in d.get('blocks') or []:
            for ex in b.get('exercises') or []:
                yield d, b, ex, None
                for it in ex.get('items') or []:
                    yield d, b, ex, it

def text_fields(data):
    """Every athlete-facing string, labelled."""
    for c in data.get('cycles') or []:
        for k in ('name', 'tagline'):
            if c.get(k): yield f"cycle {c.get('num')} {k}", c[k]
        for f in c.get('focuses') or []: yield f"cycle {c.get('num')} focus", f
        for part in ('message', 'teaser'):
            for p in (c.get(part) or {}).get('paragraphs') or []: yield f"cycle {c.get('num')} {part}", p
            for o in (c.get(part) or {}).get('outcomes') or []: yield f"cycle {c.get('num')} outcome", o
        wn = c.get('weekNotes')
        for k in ('first', 'last'):
            n = wn.get(k) if isinstance(wn, dict) else None
            if isinstance(n, dict):
                for f in ('title', 'text'):
                    if n.get(f): yield f"cycle {c.get('num')} weekNotes.{k} {f}", n[f]
    for d in (data.get('workouts') or {}).get('days') or []:
        for k in ('focusTag', 'completionTitle', 'completionMessage'):
            if d.get(k): yield f"Day {d.get('id')} {k}", d[k]
    for d, b, ex, it in exercises(data):
        o = it or ex
        for k in ('setup', 'intent', 'note', 'detail'):
            if o.get(k): yield f"Day {d.get('id')} {o.get('name')} {k}", o[k]
        if not it and isinstance(ex.get('why'), dict) and ex['why'].get('text'):
            yield f"Day {d.get('id')} {ex.get('name')} why", ex['why']['text']
    for c in (data.get('notes') or {}).get('cards') or []:
        yield f"card '{c.get('title')}'", c.get('title', '')
        yield f"card '{c.get('title')}'", re.sub(r'<[^>]+>', ' ', c.get('body', ''))

def sentences(s):
    return [x.strip() for x in re.split(r'(?<=[.!?])\s+|\n', s) if x.strip()]

# What makes an exercise "weighted" for the new-athlete 8-rep rule, read off its Spine entry.
LOAD_KIT = re.compile(r'barbell|dumbbell|kettlebell|cable|machine|trap bar|landmine|ez bar|'
                      r'leg press|hack squat|sled|plate|weighted', re.I)
UNLOADED_PATTERNS = {'jump-land', 'throw', 'sprint-cod', 'conditioning', 'mobility', 'carry'}

def is_weighted(o, spine):
    """True/False from the Spine entry, or None when the Spine doesn't know the exercise."""
    e = (spine or {}).get(o.get('exId') or '')
    if not e or e.get('pattern') is None: return None
    if e['pattern'] in UNLOADED_PATTERNS or (e.get('impact') or 'none') != 'none': return False
    kit = ' '.join(k for k in e.get('equipment') or [] if not k.lower().startswith('optional'))
    return bool(LOAD_KIT.search(kit))

def norm_name(s):
    return re.sub(r'\s+', ' ', re.sub(r"[^a-z0-9]+", ' ', str(s or '').lower().replace("'", ''))).strip()

# ── the rule checks ───────────────────────────────────────────────────────────
def check_structure(data, args, spine=None):
    seen = {}
    for d, b, ex, it in exercises(data):
        o = it or ex
        where = f"Day {d.get('id')} · {b.get('title')} · {o.get('name')}"
        prep = bool(PREP.search(b.get('title') or ''))
        if not it and ex.get('type') not in ('standard', 'simple', 'circuit'):
            fail(f"{where}: type must be standard, simple or circuit (got {ex.get('type')!r})", 'CHP-5')
        if o.get('chips'): fail(f"{where}: carries chips[] (write rx, never chips)", 'CHP-5')
        if o.get('cues'): fail(f"{where}: carries cues (cues come from the Spine entry only)", 'CUE-2')
        if not it and ex.get('type') == 'circuit':
            if not prep and args.new:
                fail(f"{where}: a working circuit (superset) in a new athlete's first cycle: straight sets only", 'SES-11')
            continue
        if not o.get('exId'): fail(f"{where}: no exId", 'CUE-4')
        # No floating text on a card (Amir, 2026-09-25: "i dont like floating text and remember this").
        # A grip is the athlete's CHIP ("grips should be a chip on the card not a free text"): the only
        # chip an rx card draws is `intent`, the pill his older cards use for "neutral grip". Any other
        # detail for this athlete (a hand position, a bench) is the Coach's Note.
        if re.search(r'\bgrip|\bpalms?\b|pronat|supinat|\boverhand\b|\bunderhand\b', o.get('setup') or '', re.I):
            fail(f"{where}: a grip written as free text ('{o['setup']}'): make it the chip, the exercise's intent (e.g. \"neutral grip\")", 'NAM-5')
        elif o.get('setup'):
            fail(f"{where}: floating text on the card ('{o['setup']}'): put it in the Coach's Note", 'CHP-1')
        # A superset is a circuit, never a pill on two standard cards (it shipped once: each card got
        # its own rest timer and nothing showed they were paired). Was a manual grep in assemble.
        if not it and re.search(r'super-?set|paired with|pair with|complex with', o.get('intent') or '', re.I):
            fail(f"{where}: a pairing written as a pill ('{o['intent']}'): make the pair ONE circuit (SCHEMA → circuit)", 'SES-12', 'CHP-2')
        if isinstance(o.get('rx'), dict) and not o['rx']:
            fail(f"{where}: an empty rx (leave rx out when nothing is prescribed)", 'CHP-5')
        rx = o.get('rx') or {}
        doses = [k for k in ('reps', 'time', 'distance', 'work') if rx.get(k) not in (None, '')]
        if len(doses) > 1: fail(f"{where}: two doses ({' + '.join(doses)})", 'CHP-5')
        if isinstance(rx.get('reps'), str) and re.search(r'\d\s*[-–]\s*\d', rx['reps']):
            fail(f"{where}: a rep range ({rx['reps']}): one number, never a range", 'PRG-6')
        sets = num(rx.get('sets'))
        # 4 is the cap for everyone who hasn't proven more in OUR logs (Amir, 2026-09-26: people
        # who call themselves pro can be very weak in practice, "but if we have an athlete who
        # proved himself, in the logs, and in our cycles, why not go over").
        if sets and sets > 4:
            if args.proven: info(f"{where}: {int(sets)} sets, over the usual 4, allowed because the athlete has proven the volume in our logs (--proven)")
            else: fail(f"{where}: {int(sets)} sets (never more than 4 on one exercise until the athlete has proven more in our logs: add an exercise, or pass --proven and name the evidence)", 'VOL-8')
        rpe = num(str(rx.get('rpe', '')).split('-')[0]) if rx.get('rpe') not in (None, '') else None
        if rpe is not None and rpe < 6: fail(f"{where}: RPE {rx.get('rpe')} is under the floor of 6", 'CHP-4')
        if prep and rx.get('rpe') not in (None, ''): warn(f"{where}: RPE on a warm-up item", 'SES-5')
        if rx.get('tempo') and not re.match(r'^(iso|\d+(\.\d+)?([-–]\d+(\.\d+)?){2,3})$', str(rx['tempo']).strip(), re.I):
            fail(f"{where}: tempo {rx['tempo']!r} should be iso or 3-4 numbers", 'CHP-3')
        if not prep and not it and ex.get('type') == 'standard':
            reps = num(rx.get('reps'))
            if args.new and reps is not None and reps < 8:
                # "Weighted" comes from the Spine entry when there is one (2026-09-26): a loaded
                # implement, no impact, and not a jump, throw, sprint, carry or conditioning
                # pattern. Only an exercise the Spine doesn't know falls back to the old proxy
                # (a tempo = a grinding lift), which a spec without a tempo used to slip past.
                w = is_weighted(o, spine)
                if w is None: w, why = bool(rx.get('tempo')), 'no Spine entry, so read from the tempo'
                else: why = 'from its Spine entry'
                if w:
                    fail(f"{where}: {int(reps)} reps. A new athlete's first cycle has no weighted exercise under 8 reps ({why})", 'VOL-11')
                else:
                    info(f"{where}: {int(reps)} reps, not a weighted lift ({why}), so exempt from the 8-rep rule")
        # Each working exercise once per cycle, circuit items included (a conditioning finisher
        # repeated across days reads as the programme repeating itself). Prep may repeat.
        if not prep and (it or ex.get('type') == 'standard'):
            key = (o.get('exId') or o.get('name', '')).lower()
            seen.setdefault(key, []).append(f"Day {d.get('id')}")
    for key, days in seen.items():
        if len(days) > 1: fail(f"{key}: in {len(days)} working blocks ({', '.join(days)}): each working exercise once per cycle", 'SEL-15')
    # A grind: a day with 7 or more working exercises spikes fatigue even at low RPE
    # (COACHING-PRINCIPLES → Volume & dosing → manage load per DAY).
    for d in (data.get('workouts') or {}).get('days') or []:
        n = 0
        for b in d.get('blocks') or []:
            if PREP.search(b.get('title') or ''): continue
            for ex in b.get('exercises') or []:
                n += len(ex.get('items') or []) if ex.get('type') == 'circuit' else 1
        if n >= 7: warn(f"Day {d.get('id')}: {n} working exercises, a grind (7 or more): check the day's load identity", 'VOL-2')

def check_text(data):
    for where, s in text_fields(data):
        for m in re.finditer(r'RPE\s*(?:of\s*)?(\d+(?:\.\d+)?)', s):
            if float(m.group(1)) < 6: fail(f"{where}: says RPE {m.group(1)}, under the floor of 6", 'CHP-4')
        for sen in sentences(s):
            if re.search(r'\b(take|drop|minus|subtract|lower|knock)\b.{0,40}\bRPE', sen, re.I) and '6' not in sen:
                fail(f"{where}: lowers the RPE without naming the floor of 6 in the same sentence: \"{sen[:90]}\"", 'CHP-4')
        if '—' in s: warn(f"{where}: an em-dash (not how Amir writes)", 'COM-3')
        m = re.search(r'\b(\d+)\s*[-–]\s*(\d+)\s*reps?\b', s, re.I)
        if m: warn(f"{where}: a rep range in the text ({m.group(0)})", 'PRG-6')

def check_cards(data):
    cards = (data.get('notes') or {}).get('cards') or []
    # Soft cap (Amir, 2026-09-26): past 8 the required cards get buried among the rest.
    if len(cards) > 8: warn(f"{len(cards)} notes cards: over the soft cap of 8. Merge or cut, or say in the handoff why this cycle needs more", 'COM-10')
    for c in cards:
        body, t = c.get('body', ''), c.get('title')
        if not re.search(r'<(p|ul)\b', body): fail(f"card '{t}': the body is not HTML (<p>, <ul><li>)", 'COM-8')
        stack = []
        for m in re.finditer(r'<(/?)([a-z]+)[^>]*?(/?)>', body):
            close, tag, selfclose = m.group(1), m.group(2), m.group(3)
            if tag in ('br', 'hr', 'img') or selfclose: continue
            if close:
                if not stack or stack.pop() != tag: fail(f"card '{t}': unbalanced </{tag}>", 'COM-8'); break
            else: stack.append(tag)
        else:
            if stack: fail(f"card '{t}': unclosed <{'>, <'.join(stack)}>", 'COM-8')
        if '<ol' in body: warn(f"card '{t}': <ol> has no styling in .note-body, use <ul>", 'COM-8')

def run_chips(expr, payload):
    """Evaluate `expr` in node, with C = the app's Chips module (assets/js/chips.js) and a = the
    payload, so the checker uses the app's own copy of a rule instead of keeping a third one.
    None when node can't run (it is installed on Amir's PC; a WARN says what was skipped)."""
    js = ("require('./assets/js/chips.js');const C=globalThis.Chips;let s='';"
          "process.stdin.on('data',d=>s+=d).on('end',()=>{const a=JSON.parse(s);"
          "process.stdout.write(JSON.stringify(" + expr + "))})")
    try:
        r = subprocess.run(['node', '-e', js], input=json.dumps(payload), capture_output=True, text=True,
                           encoding='utf-8', cwd=REPO, timeout=60)
        return json.loads(r.stdout) if r.returncode == 0 else None
    except Exception:
        return None

def check_whys(data):
    whys = [(d, ex) for d, b, ex, it in exercises(data) if not it and ex.get('why') is not None]
    n = len(whys)
    if n > 10: fail(f"{n} Becauses: keep the 5-10 real personal decisions", 'COM-4')
    elif n < 5: warn(f"{n} Becauses: a cycle carries 5-10 (fewer than 3 hides the Why-your-plan button)", 'COM-4')
    if not whys: return
    # The app's own audit, Chips.auditWhy(): shape, source, part, length, the voice, diagnosis
    # words and a reason the Coach's Note repeats. It was a separate node snippet in
    # /program-assemble until 2026-09-26, beside a partial Python copy of it here.
    probs = run_chips("a.map(e=>{try{return C.auditWhy(e)}catch(x){return null}})", [ex for _, ex in whys])
    if probs is None:
        warn("node could not run assets/js/chips.js, so only the basic Because checks ran "
             "(not the diagnosis words or a repeat of the Coach's Note)", 'COM-4')
        for d, ex in whys: why_basics(d, ex)
        return
    for (d, ex), ps in zip(whys, probs):
        where = f"Day {d.get('id')} {ex.get('name')} why"
        if ps is None: why_basics(d, ex); continue
        for p in ps:
            fail(f"{where}: {p.get('msg')}" + (f" ({p['label']})" if p.get('label') else ''), 'COM-4')

def why_basics(d, ex):
    """The fallback when node is missing: the shape, source, part, length and voice checks."""
    w, where = ex['why'], f"Day {d.get('id')} {ex.get('name')} why"
    if not isinstance(w, dict): fail(f"{where}: must be {{src, text}}", 'COM-4'); return
    if w.get('src') not in ('goal', 'body', 'test', 'cycle', 'you', 'court'): fail(f"{where}: src {w.get('src')!r}", 'COM-4')
    if w.get('src') == 'body' and not w.get('part'): fail(f"{where}: src body needs a part", 'COM-4')
    if w.get('part') and w.get('src') != 'body': fail(f"{where}: part only goes with src body", 'COM-4')
    text = (w.get('text') or '').strip()
    if len(text) > 140: fail(f"{where}: {len(text)} characters (140 max)", 'COM-4')
    if re.search(r'[—;]', text): fail(f"{where}: an em-dash or semicolon", 'COM-4')

def check_placed(data, args):
    """Every note_flag and why_flag in the spec should land on the programme (2026-09-26): engage
    writes the words and Part B places them by exId. A count that differs means one was dropped on
    the way (a name that changed between the spec and the card) or invented without a flag."""
    if not args.spec: return
    text = open(args.spec, encoding='utf-8').read()
    real = lambda key: sum(1 for v in re.findall(rf'{key}\s*:\s*([^|\n]*)', text)
                           if v.strip() and not v.strip().startswith('[') and not blank(v))
    flags, wflags = real('note_flag'), real('why_flag')
    notes = sum(1 for d, b, ex, it in exercises(data) if (it or ex).get('note'))
    whys = sum(1 for d, b, ex, it in exercises(data) if not it and ex.get('why') is not None)
    if flags != notes:
        warn(f"the spec flags {flags} Coach's Notes and the programme carries {notes}: one was dropped or "
             "invented on the way (engage tags each by exId, Part B places it by exId)", 'COM-6')
    if wflags != whys:
        warn(f"the spec flags {wflags} Becauses and the programme carries {whys}: one was dropped or "
             "invented on the way", 'COM-4')

def check_week_notes(data, args):
    """The first and last week of the cycle being built (cycles[currentCycleIndex].weekNotes).
    Every cycle is 4 loading weeks + 1 back-off week, and the card never changes mid-cycle, so
    the back-off only happens if something tells the athlete. Before 2026-09-26 that was a
    notes card nobody was required to write: 16 of 34 live programmes had none. The app now
    shows weekNotes.first in week 1 and weekNotes.last in the last week (program.html
    weekNoteHTML), so both are data, and required."""
    cycles = data.get('cycles') or []
    i = data.get('currentCycleIndex') or 0
    cyc = cycles[i] if 0 <= i < len(cycles) else {}
    wn = cyc.get('weekNotes')
    if wn is not None and not isinstance(wn, dict):
        fail(f"cycle {cyc.get('num')}: weekNotes must be an object {{first, last}}", 'PRC-15'); return
    wn = wn or {}
    for key in ('first', 'last'):
        n = wn.get(key)
        if n is None: continue
        where = f"cycle {cyc.get('num')} weekNotes.{key}"
        if not isinstance(n, dict):
            fail(f"{where}: must be an object {{text, setsDrop?, rpeDrop?, rpeCap?}}", 'PRC-15'); continue
        text = str(n.get('text') or '').strip()
        # At --stage build only design's numbers exist; engage writes the words after the checks.
        if not text and args.stage == 'final':
            fail(f"{where}: needs a text, the words the athlete reads", 'PRC-15')
        for f in ('setsDrop', 'rpeDrop'):
            if f in n and not (isinstance(n[f], int) and 1 <= n[f] <= 3):
                fail(f"{where}: {f} is how many fewer (a whole number, 1 to 3), got {n[f]!r}", 'PRC-15')
        if 'rpeCap' in n and not (isinstance(n['rpeCap'], (int, float)) and 6 <= n['rpeCap'] <= 9):
            fail(f"{where}: rpeCap must be 6 to 9 (the app's floor is 6), got {n['rpeCap']!r}", 'PRC-15', 'CHP-4')
        if len(text) > 260: warn(f"{where}: {len(text)} characters; it's a note, keep it under ~260", 'PRC-15')
        label = (n.get('title') or ('Back-off week' if key == 'last' else 'Week 1')).lower()
        if text and text.lower().startswith(label):
            warn(f"{where}: the text starts by repeating its label ('{label}'); start with the instruction", 'PRC-15')
    last = wn.get('last')
    if args.no_backoff:
        info('no back-off week this cycle (--no-backoff: only on Amir\'s word)')
    elif not isinstance(last, dict):
        fail(f"cycle {cyc.get('num')}: no weekNotes.last. Every cycle ends with a back-off week: "
             "design sets the dose (setsDrop / rpeDrop / rpeCap) and engage writes the text", 'REC-4', 'PRC-15')
    elif not any(k in last for k in ('setsDrop', 'rpeDrop', 'rpeCap')):
        fail(f"cycle {cyc.get('num')} weekNotes.last: name the back-off dose as numbers (setsDrop, rpeDrop or rpeCap), not only words", 'PRC-15')
    if args.new and not isinstance(wn.get('first'), dict):
        fail(f"cycle {cyc.get('num')}: a new athlete's first cycle needs weekNotes.first (how week 1 finds their weights, with the number)", 'PRG-5', 'PRC-15')
    elif not isinstance(wn.get('first'), dict):
        info(f"cycle {cyc.get('num')}: no weekNotes.first (fine when nothing in week 1 is different)")

# ── the notes obligations list (2026-09-26) ───────────────────────────────────
# Rules that exist only as "engage should write a card about X" were missed: engage's own list
# of required notes left out the back-off, "start lower with the number", the film gate and the
# weigh-in. Now design names every required note in the spec's "obligations:" block, engage tags
# the card that carries each one (notes.cards[].tags, which the app never shows), and this
# checks that each is there. backoff and week1 are carried by the cycle's weekNotes.
OBLIG_RULES = {'backoff': 'PRC-15', 'week1': 'PRG-5', 'explainer': 'PRG-8', 'pain-ladder': 'INT-6',
               'modification-menu': 'INT-10', 'film': 'PRC-8', 'weigh-in': 'COM-13', 'double-day': 'REC-5',
               'low-readiness': 'REC-2', 'period': 'PRC-21', 'start-lower': 'PRG-5', 'close-loop': 'INT-8',
               'win': 'COM-11'}  # key -> the rule in the index that requires the note
OBLIGATIONS = tuple(OBLIG_RULES)

def spec_obligations(args):
    if not args.spec: return []
    text = open(args.spec, encoding='utf-8').read()
    m = re.search(r'^\s*obligations\s*:[^\n]*\n((?:[ \t]*-[^\n]*\n?)+)', text, re.I | re.M)
    keys = []
    for line in (m.group(1).splitlines() if m else []):
        k = re.match(r'\s*-\s*([a-z0-9-]+)', line.strip().lower())
        if k: keys.append(k.group(1))
    return keys

def check_obligations(data, args):
    keys = spec_obligations(args)
    if not keys:
        if args.spec: warn("no obligations: block in the spec, so the required notes were not checked", 'COM-9')
        return
    cycles = data.get('cycles') or []
    i = data.get('currentCycleIndex') or 0
    wn = (cycles[i] if 0 <= i < len(cycles) else {}).get('weekNotes') or {}
    tags = {str(t).lower() for c in (data.get('notes') or {}).get('cards') or [] for t in (c.get('tags') or [])}
    for k in keys:
        if k not in OBLIGATIONS:
            warn(f"obligation '{k}' is not one of the known ones ({', '.join(OBLIGATIONS)})", 'COM-9'); continue
        if k in ('backoff', 'week1'):
            n = wn.get('last' if k == 'backoff' else 'first')
            ok = isinstance(n, dict) and str(n.get('text') or '').strip()
            where = 'weekNotes.' + ('last' if k == 'backoff' else 'first')
        else:
            ok, where = k in tags, f"a notes card tagged '{k}'"
        if not ok: fail(f"obligation '{k}' is not met: {where} must carry it", OBLIG_RULES[k], 'COM-9')
    extra = sorted(tags - set(keys))
    if extra: info(f"cards tagged {', '.join(extra)} though the spec didn't list them (fine if they're real)")

def ban_hit(word, s):
    return re.search(r'(?<![a-z])' + re.escape(word.lower()) + r'(e?s)?(?![a-z])', s.lower())

def spec_lines(args, key):
    """Every 'key: value' line in the spec (the profile block's and the spec's own), comments off."""
    if not args.spec: return []
    found = re.findall(rf'^\s*{key}\s*:\s*(.+)$', open(args.spec, encoding='utf-8').read(), re.I | re.M)
    return [re.sub(r'\s+#.*$', '', f).strip() for f in found]

def check_bans(data, args):
    # --ban, the profile's standing bans and the spec's "bans:" line(s) for this cycle, together.
    ban = ', '.join([x for x in [args.ban] if x] + spec_lines(args, r'bans?'))
    words = sorted({w.strip() for w in ban.split(',') if w.strip() and not blank(w)})
    if not words: return
    for d, b, ex, it in exercises(data):
        o = it or ex
        for k in ('name', 'setup', 'intent'):
            for w in words:
                if ban_hit(w, o.get(k) or ''):
                    fail(f"Day {d.get('id')} {o.get('name')}: banned for this athlete ('{w}' in {k})", 'SEL-11')
    for where, s in text_fields(data):
        if ' setup' in where or ' intent' in where: continue
        for sen in sentences(s):
            for w in words:
                if ban_hit(w, sen) and not NEGATION.search(sen):  # a ban sentence names what it bans
                    warn(f"{where}: mentions '{w}' outside a ban: \"{sen[:100]}\"", 'SEL-11')
    if args.spec:
        fence = False
        for i, line in enumerate(open(args.spec, encoding='utf-8'), 1):
            if line.lstrip().startswith('```'): fence = line.strip().startswith('```profile'); continue
            if fence: continue  # the profile block describes the athlete; it prescribes nothing
            # A roadmap amendment ("cycle 3: art → iron") changes a later cycle, not this one's kit.
            if re.match(r'\s*roadmap_amend\s*:', line, re.I): continue
            if not re.search(r'fallback|->|→|instead|swap', line, re.I): continue
            for w in words:
                m = ban_hit(w, line)
                if m and not NEGATION.search(line[:m.start()]):
                    fail(f"spec line {i}: a fallback or swap gives a banned '{w}': {line.strip()[:110]}", 'SEL-12')

# ── session length ────────────────────────────────────────────────────────────
def work_secs(rx, simple=False):
    """Seconds of work in ONE set/round of an exercise (both sides included)."""
    side = 2 if rx.get('side') else 1
    t = secs(rx.get('time'))
    if t is not None: return t * side
    d = metres(rx.get('distance'))
    if d is not None: return (d / 2 + 10 if simple else d / 5 + 3) * side  # drill pace vs sprint + stop
    reps = num(rx.get('reps'))
    if reps is not None:
        tempo = str(rx.get('tempo') or '')
        per = sum(float(x) for x in re.findall(r'\d+(?:\.\d+)?', tempo)) if re.match(r'^\d', tempo) else (4 if simple else 2)
        return reps * per * side
    w = rx.get('work')
    if w:
        parts = [secs(x) for x in re.findall(r'\d+\s*(?:s|sec|min)', str(w))]
        return sum(p for p in parts if p) or 60
    return 30

def day_minutes(day):
    total, assumed = 0.0, False
    for b in day.get('blocks') or []:
        brest = secs(b.get('rest'))
        primary = b.get('title', '').lower().startswith('primary')
        for ex in b.get('exercises') or []:
            rx = ex.get('rx') or {}
            if ex.get('type') == 'circuit':
                rounds = int(num(rx.get('rounds') or ex.get('rounds') or 1) or 1)
                per = sum(work_secs(it.get('rx') or {}, simple=True) + 10 for it in ex.get('items') or [])
                rest = secs(rx.get('rest')) or 30
                total += rounds * per + (rounds - 1) * rest
            elif ex.get('type') == 'simple' and not rx.get('sets'):
                total += work_secs(rx, simple=True) + 10
            elif ex.get('type') == 'simple':  # a warm-up drill done in sets: walk back, go again
                total += int(num(rx.get('sets')) or 1) * (work_secs(rx, simple=True) + 15) + 10
            else:
                sets = int(num(rx.get('sets')) or 1)
                rest = secs(rx.get('rest')) or brest
                if rest is None: rest, assumed = 60, True
                reps_each = 2 if (rx.get('side') and metres(rx.get('distance')) is not None) else 1
                one = work_secs(dict(rx, side=False) if reps_each == 2 else rx)
                total += sets * reps_each * (one + rest) + 60
                if primary and rx.get('tempo'): total += 120  # ramp-up sets before a main lift
    return total / 60, assumed

def check_time(data, args):
    for d in (data.get('workouts') or {}).get('days') or []:
        mins, assumed = day_minutes(d)
        note = ' (some rests not prescribed, 60 s assumed)' if assumed else ''
        line = f"Day {d.get('id')} ≈ {mins:.0f} min{note}"
        # The cap is SOFT (Amir, 2026-09-26: athletes who write "60 minutes" train 75 and never
        # complain, "so days time cap, is usually not very important"). Never a FAIL: the design
        # says the expected real length at the checkpoint instead of cutting work to fit.
        cap = args.cap if args.cap is not None else 60
        if mins > cap: warn(f"{line}: past the {cap:g}-min cap (soft: tell Amir the expected real length)", 'SES-7')
        else: info(line)

# ── volume, from the coaching log's per-exercise table ────────────────────────
def parse_volume(path):
    rows, cur, lines = [], None, open(path, encoding='utf-8').read().splitlines()
    for line in lines:
        if line.startswith('|') and re.search(r'counts toward', line, re.I):
            cur = []; rows = cur  # keep only the LAST such table (the newest cycle)
            continue
        if cur is None: continue
        if not line.startswith('|'):
            if cur: cur = None
            continue
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 4 or set(cells[0]) <= set('-: '): continue
        sets = num(cells[2])
        if sets is None: continue
        parts = []
        for p in re.split(r'[·;,]', cells[3]):
            m = re.match(r'^\s*([A-Za-z][A-Za-z /-]*?)\s+(\d+(?:\.\d+)?)\s*(?:\(\s*[x×]\s*(\d+(?:\.\d+)?)\s*\))?', p)
            if m: parts.append((m.group(1).strip(), float(m.group(2)), float(m.group(3) or 1)))
        cur.append({'day': cells[0], 'name': re.sub(r'\s*\(.*?\)\s*$', '', cells[1]).strip(), 'sets': sets, 'parts': parts})
    return rows

def norm_muscle(m):
    m = m.lower().strip()
    return MUSCLE_ALIAS.get(m, m)

def check_volume(data, args):
    rows = parse_volume(args.log)
    if not rows:
        fail(f"{args.log}: no per-exercise volume table (| Day | Exercise | Sets | Counts toward |)", 'VOL-10'); return {}
    prog, loaded = {}, {}
    for d, b, ex, it in exercises(data):
        o = it or ex
        if not it and ex.get('type') == 'circuit': continue
        rx = o.get('rx') or {}
        sets = round_count(ex) if it else (num(rx.get('sets')) or 1)
        prog.setdefault(o.get('name', '').lower(), []).append((d.get('id'), sets, bool(PREP.search(b.get('title') or ''))))
        if (not it and ex.get('type') == 'standard' and not PREP.search(b.get('title') or '')
                and rx.get('tempo') and dose_of(rx) in ('reps', 'time')):
            loaded[o.get('name', '').lower()] = (d.get('id'), o.get('name'))
    total, per_day, listed = {}, {}, set()
    for r in rows:
        key = r['name'].lower(); listed.add(key)
        if key not in prog:
            fail(f"volume table lists '{r['name']}', which the programme does not have", 'VOL-10'); continue
        if not any(abs(s - r['sets']) < 0.01 for _, s, _ in prog[key]):
            fail(f"volume table: '{r['name']}' at {r['sets']:g} sets, the programme has {', '.join(f'{s:g}' for _, s, _ in prog[key])}", 'VOL-10')
        dm = re.match(r'D(?:ay)?\s*(\d+)', r['day'], re.I)
        if dm and all(str(day) != dm.group(1) for day, _, _ in prog[key]):
            warn(f"volume table: '{r['name']}' filed under {r['day']}, the programme has it on Day {prog[key][0][0]}", 'VOL-10')
        for m, n, w in r['parts']:
            if abs(n - r['sets'] * w) > 0.01:
                fail(f"volume table: '{r['name']}' {m} {n:g} should be {r['sets'] * w:g} ({r['sets']:g} sets x {w:g})", 'VOL-10')
            mm = norm_muscle(m)
            total[mm] = total.get(mm, 0) + n
            if dm: per_day.setdefault(dm.group(1), {}).setdefault(mm, 0); per_day[dm.group(1)][mm] += n
    for key, (day, name) in loaded.items():
        if key not in listed: fail(f"Day {day} {name}: a loaded exercise missing from the volume table (count every exercise that loads a muscle)", 'VOL-10')
    # The 10-set floor is hypertrophy science, so it binds a programme whose aim is strength and
    # muscle, man or woman; a sport-performance athlete gets what is best for them (Amir,
    # 2026-09-26). --floor switches it on; floor-except names a muscle excused for a stated reason.
    excused = floor_excused(args)
    for mm in sorted(total, key=lambda k: -total[k]):
        v = total[mm]
        if args.floor and mm in MAJOR and v < 10:
            if mm in excused: info(f"{mm} {v:g} sets/week: under 10, excused (floor-except)")
            else: fail(f"{mm} {v:g} sets/week: under the floor of 10 for a strength-and-muscle programme (or floor-except it, with the reason in the spec)", 'VOL-4')
        elif v > 20: warn(f"{mm} {v:g} sets/week: over 20", 'VOL-3')
        elif mm == 'shoulder' and v < 10: warn(f"shoulder {v:g} sets/week: under the usual 10-20", 'VOL-7')
        else: info(f"{mm} {v:g} sets/week")
    for mm in MAJOR:
        if args.floor and mm not in total and mm not in excused: fail(f"{mm}: 0 sets/week (not in the volume table)", 'VOL-4')
    return per_day

def floor_excused(args):
    """Major muscles excused from --floor: --floor-except plus every 'floor-except:' line."""
    s = ', '.join([x for x in [args.floor_except] if x] + spec_lines(args, r'floor[- ]except'))
    return {norm_muscle(re.sub(r'\(.*?\)', '', w)) for w in s.split(',') if w.strip() and not blank(w)}

def check_week(data, args, per_day):
    if not args.week: return
    plan = {}
    for part in args.week.split(','):
        if ':' not in part: continue
        wd, day = part.split(':', 1)
        wd = wd.strip().lower()[:3]
        if wd in WEEKDAYS: plan[WEEKDAYS.index(wd)] = day.strip()
    days = {str(d.get('id')): d for d in (data.get('workouts') or {}).get('days') or []}
    def kind(did):
        d = days.get(did)
        if not d: return None
        lower = sum(v for k, v in (per_day.get(did) or {}).items() if k in LOWER)
        sprints = sum(1 for b in d.get('blocks') or [] if not PREP.search(b.get('title') or '')
                      for ex in b.get('exercises') or [] if metres((ex.get('rx') or {}).get('distance')) is not None)
        if lower >= 6: return 'legs'
        if sprints >= 3: return 'speed'
        return None
    for i in range(7):
        a, b = plan.get(i), plan.get((i + 1) % 7)
        if a and b and kind(a) and kind(b):
            warn(f"example week: Day {a} ({kind(a)}) on {WEEKDAYS[i].title()} is right before Day {b} ({kind(b)}): two hard lower-body days back to back", 'VOL-2')
    info('example week: ' + ', '.join(f"{WEEKDAYS[i].title()} Day {plan[i]}" for i in sorted(plan)))

# ── the saved --spine-sql result: the Spine, last cycle, the ledger ───────────
def load_context(path):
    """The saved result of --spine-sql. Since 2026-09-26 the one query returns three things: the
    Spine lines for this programme's exercises (with pattern, impact, equipment, name, aliases),
    the athlete's live programme BEFORE this build (`prev`: the cycle just trained), and the
    Exercise Ledger table from their coaching log. So continuity costs no extra lookup."""
    raw = open(path, encoding='utf-8').read().strip()
    lines, prev, ledger, profile = [], None, None, None
    if raw[:1] in '[{':
        rows = json.loads(raw)
        for o in (rows if isinstance(rows, list) else [rows]):
            if not isinstance(o, dict): continue
            if 'spine' in o: lines += str(o['spine'] or '').splitlines()
            elif 'id' in o:
                lines.append('|'.join([o['id'], o.get('status', ''), str(o.get('has_cues', '')).lower(),
                                       ','.join(o.get('qualities') or [])]))
            if o.get('prev') is not None: prev = o['prev'] if isinstance(o['prev'], dict) else json.loads(o['prev'])
            if o.get('ledger'): ledger = str(o['ledger'])
            if o.get('profile'): profile = str(o['profile'])
    else:
        lines = raw.splitlines()
    spine = {}
    for l in lines:
        p = l.strip().split('|')
        if len(p) < 3: continue
        e = {'status': p[1], 'cues': p[2].lower() in ('true', 't'), 'q': [x for x in (p[3] if len(p) > 3 else '').split(',') if x]}
        if len(p) >= 9:
            e.update(pattern=p[4] or None, impact=p[5] or None, equipment=[x for x in p[6].split(';') if x],
                     name=p[7], aliases=[x for x in p[8].split(';') if x])
        spine[p[0]] = e
    return {'spine': spine, 'prev': prev, 'ledger': ledger, 'profile': profile}

def load_spine(path):
    return load_context(path)['spine']

# ── the athlete profile (2026-09-26) ──────────────────────────────────────────
# The checker used to be told what to check by the model it was checking: --floor, --proven,
# the bans and the minutes all came from the run's own memory, and a forgotten flag skipped a
# rule without a word. The athlete profile is a small ```profile block at the top of the
# coaching log, kept current like the Exercise Ledger; design copies the current one into the
# spec. Its keys set the flags; a flag typed on the command line still wins.
def parse_profile(text):
    m = re.search(r'```profile[^\n]*\n(.*?)\n\s*```', text or '', re.S)
    if not m: return None
    prof = {}
    for line in m.group(1).splitlines():
        line = re.sub(r'\s+#.*$', '', line).strip()
        if ':' in line:
            k, v = line.split(':', 1)
            prof[k.strip().lower()] = v.strip()
    return prof

def blank(v): return not v or v.strip().lower() in ('-', 'none', 'no', 'n/a')

def apply_profile(args, prof, source):
    if not prof:
        warn("no athlete profile (```profile block) in the spec or the coaching log: the flags come from the command line only", 'PRC-16')
        return
    did = []
    aim = (prof.get('aim') or '').lower()
    if ('strength' in aim or 'muscle' in aim) and not args.floor:
        args.floor = True; did.append('--floor (aim is strength and muscle)')
    if not blank(prof.get('proven')) and not args.proven:
        args.proven = True; did.append('--proven (' + prof['proven'][:60] + ')')
    for key, attr in (('bans', 'ban'), ('floor-except', 'floor_except')):
        if not blank(prof.get(key)):
            setattr(args, attr, ', '.join(x for x in [getattr(args, attr), prof[key]] if x)); did.append(key)
    m = re.search(r'\d+', prof.get('cap') or '')
    if m and args.cap is None:
        args.cap = float(m.group()); did.append(f'--cap {m.group()}')
    info(f"athlete profile from the {source}: " + (', '.join(did) or 'no flags to set'))

# ── continuity: this cycle against the one just trained (2026-09-26) ──────────
# A returning athlete gets no reviewer, and every rotation and re-ship failure on record was a
# returning cycle (the 2026-09-26 audit). The previous cycle is `prev` from --spine-sql, so these
# checks are deterministic: kept accessories, a kept dose that didn't move, the Exercise Ledger.
BLOCKED = ('disliked', 'pain-flagged', 'banned')
RETIRED = ('retired-equipment', 'retired-space')

def prev_programme(prev):
    """--spine-sql's compact `prev` back into days → blocks → exercises (+ circuit items)."""
    days = []
    for d in (prev or {}).get('days') or []:
        blocks = []
        for b in d.get('blocks') or []:
            exs = []
            for x in b.get('x') or []:
                e = {'name': x.get('n'), 'exId': x.get('id'), 'type': x.get('type'), 'rx': x.get('rx'),
                     'chips': x.get('chips'), 'rounds': x.get('rounds'),
                     'items': [{k: v for k, v in {'name': i.get('n'), 'exId': i.get('id'), 'rx': i.get('rx'),
                                                  'detail': i.get('detail')}.items() if v is not None}
                               for i in (x.get('items') or [])]}
                exs.append({k: v for k, v in e.items() if v not in (None, [])})
            blocks.append({'title': b.get('t') or '', 'exercises': exs})
        days.append({'id': d.get('id'), 'blocks': blocks})
    return {'workouts': {'days': days}}

def working(data):
    """(exercise-or-item, is_primary, is_item, parent) for every working exercise; prep skipped."""
    for d, b, ex, it in exercises(data):
        t = b.get('title') or ''
        if PREP.search(t) or (not it and ex.get('type') == 'circuit'): continue
        yield (it or ex), t.lower().startswith('primary'), bool(it), ex

def rx_views(exs):
    """rxOf() views from assets/js/chips.js, the ONE parser of rx and legacy chips, so a legacy
    chips cycle compares with an rx one without a third copy of the parsing rules."""
    return run_chips("a.map(e=>{try{return C.rxOf(e)}catch(x){return null}})", exs)

def dose_sig(v):
    if not v: return None
    d = v.get('dose') or {}
    rounds = re.sub(r'\D', '', str(v.get('rounds') or ''))
    return '|'.join(str(x) for x in (v.get('sets'), d.get('kind'), d.get('value'), d.get('side'), v.get('rpe'),
                                      v.get('tempo'), rounds))

def spec_list(args, key):
    """Names on a spec line like 'keep: Face Pull (only cable row the gym has), Dead Bug (...)'."""
    if not args.spec: return set()
    m = re.search(rf'^\s*{key}\s*:\s*(.+)$', open(args.spec, encoding='utf-8').read(), re.I | re.M)
    return {norm_name(re.sub(r'\(.*?\)', '', w)) for w in (m.group(1) if m else '').split(',') if w.strip()}

def names_of(o, spine):
    e = (spine or {}).get(o.get('exId') or '') or {}
    return {n for n in [norm_name(o.get('name')), norm_name(e.get('name'))] + [norm_name(a) for a in e.get('aliases') or []] if n}

def check_continuity(data, args, ctx):
    spine, prev = ctx.get('spine') or {}, ctx.get('prev')
    old = prev_programme(prev) if prev and (prev.get('days') or []) else None
    if old and (data.get('currentCycleIndex') or 0) > (prev.get('cci') or 0):
        before = {}
        for o, prim, is_item, parent in working(old):
            for n in [norm_name(o.get('name'))] + ([o['exId']] if o.get('exId') else []):
                before.setdefault(n, (o, parent if is_item else None))
        keep = spec_list(args, 'keep')
        kept, total, pairs = [], 0, []
        for o, prim, is_item, parent in working(data):
            hit = next((before[k] for k in [o.get('exId')] + sorted(names_of(o, spine)) if k and k in before), None)
            if not prim: total += 1
            if not hit: continue
            if not prim: kept.append(o)
            pairs.append((o, prim, parent if is_item else None, hit))
        if total:
            share = len(kept) / total
            names = ', '.join(o.get('name', '') for o in kept)
            msg = f"{len(kept)} of {total} non-primary working exercises carried over unchanged from last cycle ({share:.0%})"
            if share >= 0.7: fail(f"{msg}: rotate by variant; 70% or more is the old 83% failure ({names})", 'SEL-4', 'SEL-5')
            else: info(msg + (f": {names}" if kept else ''))
        for o in kept:
            if not (names_of(o, spine) & keep):
                warn(f"{o.get('name')}: kept from last cycle. Rotate it by variant, or name it on the spec's keep: line with the reason", 'SEL-4')
        # A kept exercise must still move: sets, reps or time, RPE, tempo, rounds, or a harder variant.
        # Compared only where BOTH sides' doses can be read (a legacy circuit item's free text often
        # can't), so an unreadable dose is never called identical.
        flat = []
        for o, prim, parent, (po, pparent) in pairs: flat += [o, po]
        views = rx_views(flat) if flat else []
        rounds_of = lambda c: re.sub(r'\D', '', str(((c or {}).get('rx') or {}).get('rounds') or (c or {}).get('rounds') or ''))
        if views is None:
            warn('node could not run assets/js/chips.js, so kept doses were not compared with last cycle', 'SEL-7')
        else:
            for k, (o, prim, parent, (po, pparent)) in enumerate(pairs):
                va, vb = views[2 * k], views[2 * k + 1]
                if not va or not vb or not (va.get('dose') and vb.get('dose')): continue
                a, b = dose_sig(va), dose_sig(vb)
                if parent: a, b = a + '|r' + rounds_of(parent), b + '|r' + rounds_of(pparent)
                if a != b: continue
                what = f"{o.get('name')}" + (f" (in {parent.get('name')})" if parent else '')
                if prim: warn(f"{what}: the same sets, reps and RPE as last cycle. Say how it progresses (load at the same RPE counts)", 'SEL-7')
                else: fail(f"{what}: kept with the same dose as last cycle. Move it (sets, reps, RPE, tempo, rounds or a harder variant) or rotate it by variant", 'SEL-7')
    elif old:
        info("currentCycleIndex is the live programme's own, so this is the live cycle, not a new one: continuity not compared "
             "(a new cycle's build must advance currentCycleIndex)")
    else:
        info('no previous cycle on the server: continuity checks skipped (a new athlete)')
    # The Exercise Ledger: an exercise marked Disliked, Pain-flagged or Banned never comes back
    # without a stated reason (spec line 'reintroduce: X (reason)').
    rows = []
    for line in (ctx.get('ledger') or '').splitlines():
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if len(cells) < 2 or cells[0].lower() in ('exercise', '') or set(cells[0]) <= set('-: '): continue
        rows.append((norm_name(re.sub(r'\*', '', cells[0])), cells[1].lower(), cells[3] if len(cells) > 3 else ''))
    back = spec_list(args, 'reintroduce')
    if rows:
        for d, b, ex, it in exercises(data):
            o = it or ex
            if not it and ex.get('type') == 'circuit': continue
            mine = names_of(o, spine)
            for name, status, note in rows:
                if name not in mine: continue
                where = f"Day {d.get('id')} {o.get('name')}"
                if any(s in status for s in BLOCKED) and name not in back:
                    fail(f"{where}: the Exercise Ledger says {status}. It comes back only with a reason on the spec's reintroduce: line", 'SEL-17')
                elif any(s in status for s in RETIRED):
                    warn(f"{where}: the Exercise Ledger says {status}: check the kit or space is there now", 'SEL-17')
                elif re.search(r"(do not|don't|never) re-?introduce", note, re.I) and name not in back:
                    warn(f"{where}: its ledger note says not to reintroduce it without a check: \"{note[:90]}\"", 'SEL-17')

def qm_sets(rx):
    """How many sets one working exercise counts for in the Quality Map. An exercise dosed by
    TIME with no sets is one continuous effort (a 30-min ride): one set per 10 minutes, never
    less than 1. Same rule as program.html qmSets() and coach.html qmSetsC() (2026-09-26)."""
    n = num(rx.get('sets'))
    if n: return int(n)
    t = secs(rx.get('time'))
    return max(1.0, t / 600) if t else 1

def round_count(ex):
    """A circuit's rounds: rx.rounds (a number) or a legacy "×3 Rounds" string, min 1. The same
    reading as program.html's parseRoundCount() and coach.html's Quality check (2026-09-26)."""
    m = re.search(r'\d+', str(((ex.get('rx') or {}).get('rounds')) or ex.get('rounds') or ''))
    return int(m.group()) if m and int(m.group()) > 0 else 1

def mix(day, spine, drafts):
    score, total, covered = {}, 0.0, 0.0
    def add(exid, sets):
        nonlocal total, covered
        total += sets
        e = spine.get(exid)
        if not e or (e['status'] != 'approved' and not drafts) or not e['q']: return
        covered += sets
        for i, q in enumerate(e['q']): score[q] = score.get(q, 0) + sets * (1 if i == 0 else 0.5)
    for b in day.get('blocks') or []:
        if PREP.search(b.get('title') or ''): continue
        for ex in b.get('exercises') or []:
            rx = ex.get('rx') or {}
            if ex.get('type') == 'circuit':
                for it in ex.get('items') or []: add(it.get('exId'), round_count(ex))
            else: add(ex.get('exId'), qm_sets(rx))
    return score, (covered / total if total else 0)

def top3(score, coverage):
    if coverage < QM_COVERAGE: return []
    s = sum(score.values())
    keep = [q for q in score if score[q] >= max(1.5, s * 0.12)]
    return sorted(keep, key=lambda q: (-score[q], QUALITIES.index(q) if q in QUALITIES else 99))[:3]

def check_spine(data, args, spine):
    ids = {(it or ex).get('exId') for d, b, ex, it in exercises(data)
           if not (not it and ex.get('type') == 'circuit') and (it or ex).get('exId')}
    drafts = sorted(i for i in ids if i in spine and spine[i]['status'] != 'approved')
    # Any movement may be prescribed, but a new one goes INTO the library, in full, like the entries
    # already there (Amir, 2026-09-25: "if there is any exercise that is outside of the exercise
    # library, after its prescribed for any athlete, it should be added to our library, with all the
    # cues and other details like the ones already there"). A card shows cues only from an APPROVED
    # entry, so a draft is listed for Amir's yes before the login is made.
    for i in sorted(ids):
        if i not in spine:
            fail(f"{i}: not in the library yet. Add it with /spine (cues and every detail, linked like the others)", 'NAM-9')
            continue
        if not spine[i]['cues']: fail(f"{i}: the library entry has no cues, so the card shows none", 'NAM-9')
        # Only Amir's ten quality pills (2026-09-25: "just use the 10 pills i have, this is a rule").
        bad = [q for q in spine[i]['q'] if q not in QUALITIES]
        if bad: fail(f"{i}: tagged {', '.join(bad)}, not one of the ten qualities ({', '.join(QUALITIES)})", 'CUE-3')
    if drafts: warn(f"{len(drafts)} library entries are drafts, so their cards show no cues until Amir approves them. Ask him in the handoff: {', '.join(drafts)}", 'CUE-5')
    days = (data.get('workouts') or {}).get('days') or []
    now, later = [], []
    week = {}
    for d in days:
        s1, c1 = mix(d, spine, drafts=False); s2, c2 = mix(d, spine, drafts=True)
        a, b = top3(s1, c1), top3(s2, c2)
        now.append(f"Day {d.get('id')} " + (' · '.join(x.title() for x in a) or f'blank ({c1:.0%} tagged)'))
        later.append(f"Day {d.get('id')} " + (' · '.join(x.title() for x in b) or f'blank ({c2:.0%} tagged)'))
        for q, v in s2.items(): week[q] = week.get(q, 0) + v
    info('QUALITY on phones now: ' + ' | '.join(now))
    if later != now: info('QUALITY once the drafts are approved: ' + ' | '.join(later))
    cyc = (data.get('cycles') or [{}])[data.get('currentCycleIndex') or 0] if data.get('cycles') else {}
    art = (args.art or cyc.get('art') or '').lower()
    head = ART_HEADLINE.get(art)
    ranked = sorted(week, key=lambda q: -week[q])
    top = ', '.join(f"{q} {week[q]:g}" for q in ranked[:3])
    if not art: warn('no cycle art word, so no headline check', 'PRC-24')
    elif not head: info(f"headline: '{art}' is a phase (bedrock, peak or reset), no headline check. Week: {top}")
    elif head in ranked[:2]: info(f"headline {art} → {head}: in the week's top two ✓ ({top})")
    else:
        # Reported, never failed (Amir, 2026-09-26: "report it, but recommend what you think should
        # happen"). Counting sets under-weights qualities trained in few sets, so a real power block
        # can put Power third; adding volume only to move this line would bend the programme to a label.
        hint = ("normal for a quality trained in few, fast sets: keep the week if that work comes first "
                "in the day, otherwise add one exercise for it or change the art word"
                if head in ('power', 'speed', 'spring') else
                "add work for it, or change the art word if the block really trains something else")
        warn(f"headline {art} → {head} is not in the week's top two ({top}). Tell Amir in the handoff with "
             f"your recommendation (suggested: {hint}). Never add volume only to satisfy this line", 'PRC-24')

# ── the two printouts ─────────────────────────────────────────────────────────
def spine_sql(data):
    ids = sorted({(it or ex).get('exId') for d, b, ex, it in exercises(data) if (it or ex).get('exId')})
    aid = re.sub(r"[^A-Za-z0-9_.-]", '', (data.get('athlete') or {}).get('id') or '')
    idlist = ', '.join(f"'{i}'" for i in ids) or "''"
    print(f"""-- Run once, save the raw result to the scratchpad, pass it as --spine. Missing ids = no entry.
-- It also returns the athlete's live programme BEFORE this build (prev: the cycle just trained),
-- their Exercise Ledger and their stored athlete profile (2026-09-26). Read-only, one call.
select
 (select string_agg(e.id || '|' || e.status || '|' || (e.cues is not null)::text || '|' || array_to_string(e.qualities, ',')
     || '|' || coalesce(e.pattern, '') || '|' || coalesce(e.impact, '') || '|' || array_to_string(e.equipment, ';')
     || '|' || e.name || '|' || array_to_string(e.aliases, ';'), E'\\n' order by e.id)
  from public.exercises e where e.id in ({idlist})) as spine,
 (select jsonb_build_object('cci', coalesce((p.data->>'currentCycleIndex')::int, 0), 'days',
    (select jsonb_agg(jsonb_build_object('id', d->'id', 'blocks',
       (select jsonb_agg(jsonb_build_object('t', b->>'title', 'x',
          (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('n', e->>'name', 'id', e->>'exId', 'type', e->>'type',
               'rx', e->'rx', 'chips', e->'chips', 'rounds', e->'rounds',
               'items', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('n', i->>'name', 'id', i->>'exId',
                                                                               'rx', i->'rx', 'detail', i->'detail')))
                         from jsonb_array_elements(case when jsonb_typeof(e->'items') = 'array' then e->'items' else '[]'::jsonb end) i))))
           from jsonb_array_elements(b->'exercises') e)))
        from jsonb_array_elements(d->'blocks') b)))
     from jsonb_array_elements(case when jsonb_typeof(p.data->'workouts'->'days') = 'array'
                                    then p.data->'workouts'->'days' else '[]'::jsonb end) d))
  from public.programs p where p.athlete_id = '{aid}') as prev,
 (select substring(body from '(\\| *Exercise *\\| *Status[^\\n]*\\n(?:\\|[^\\n]*\\n?)*)')
  from public.coaching_logs where athlete_id = '{aid}') as ledger,
 (select substring(body from '(```profile.*?\\n *```)')
  from public.coaching_logs where athlete_id = '{aid}') as profile;""")

KEYS = ['athlete', 'sport', 'currentCycleIndex', 'cycles', 'workouts', 'notes']
def fingerprint(data, athlete_id):
    leaves = []
    def walk(path, v):
        if isinstance(v, dict):
            for k, x in v.items(): walk(path + '/' + k, x)
        elif isinstance(v, list):
            for i, x in enumerate(v): walk(path + '/' + str(i), x)
        elif v is not None:
            leaves.append((path, ('true' if v else 'false') if isinstance(v, bool) else
                           (str(int(v)) if isinstance(v, float) and v.is_integer() else str(v))))
    for k in KEYS:
        if k in data: walk(k, data[k])
    leaves.sort(key=lambda p: p[0].encode('utf-8'))
    s = '\n'.join(p + '=' + t for p, t in leaves)
    print(f"local: {hashlib.md5(s.encode('utf-8')).hexdigest()}  {len(leaves)} leaves  {sum(len(t) for _, t in leaves)} chars")
    keys = ','.join(f"'{k}'" for k in KEYS if k in data)
    print(f"""-- The server's, computed the same way. The two lines must match exactly.
with recursive walk(path, val) as (
  select k, p.data->k from public.programs p, unnest(array[{keys}]) k where p.athlete_id = '{athlete_id}'
  union all
  select w.path || '/' || c.k, c.v from walk w cross join lateral (
    select e.key as k, e.value as v from jsonb_each(case when jsonb_typeof(w.val) = 'object' then w.val else '{{}}'::jsonb end) e
    union all
    select (a.idx - 1)::text, a.value from jsonb_array_elements(case when jsonb_typeof(w.val) = 'array' then w.val else '[]'::jsonb end) with ordinality a(value, idx)) c)
select md5(string_agg(path || '=' || (val #>> '{{}}'), E'\\n' order by path collate "C")) as fp, count(*) as leaves,
       sum(length(val #>> '{{}}')) as chars
from walk where jsonb_typeof(val) not in ('object', 'array');""")

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('program')
    ap.add_argument('--log'); ap.add_argument('--new', action='store_true')
    ap.add_argument('--floor', action='store_true'); ap.add_argument('--floor-except')
    ap.add_argument('--proven', action='store_true'); ap.add_argument('--no-backoff', action='store_true')
    ap.add_argument('--female', action='store_true', help=argparse.SUPPRESS)  # retired 2026-09-26
    ap.add_argument('--cap', type=float, default=None); ap.add_argument('--ban'); ap.add_argument('--spec')
    ap.add_argument('--week'); ap.add_argument('--spine'); ap.add_argument('--art')
    ap.add_argument('--spine-sql', action='store_true'); ap.add_argument('--fingerprint', action='store_true')
    ap.add_argument('--stage', choices=['build', 'final'], default='final')
    args = ap.parse_args()
    data = json.load(open(args.program, encoding='utf-8'))
    athlete_id = (data.get('athlete') or {}).get('id', '<id>')
    if args.spine_sql: spine_sql(data); return 0
    if args.fingerprint: fingerprint(data, athlete_id); return 0
    if args.female:
        warn('--female is retired and did nothing: pass --floor only when the aim is strength and muscle (any athlete, any sex)')
    # A first cycle is a new athlete's, whatever the command line remembered (2026-09-26: a
    # forgotten flag used to skip the new-athlete rules without a word).
    if not args.new and (data.get('currentCycleIndex') or 0) == 0:
        args.new = True
        info('currentCycleIndex is 0, so the new-athlete rules apply (no weighted lift under 8 reps, no working circuits, a first-week note)')
    ctx = load_context(args.spine) if args.spine else {'spine': {}, 'prev': None, 'ledger': None, 'profile': None}
    # The athlete profile sets the flags: this cycle's copy in the spec first, else the stored one.
    prof = parse_profile(open(args.spec, encoding='utf-8').read()) if args.spec else None
    if prof: apply_profile(args, prof, 'spec')
    else: apply_profile(args, parse_profile(ctx.get('profile')), 'coaching log')
    if not args.week and spec_lines(args, 'week'):
        args.week = spec_lines(args, 'week')[0]  # the spec's example week (2026-09-26)
    check_structure(data, args, ctx['spine'])
    # --stage build runs straight after design, BEFORE engage writes a word (2026-09-26): a FAIL
    # there changes the programme while no note, Because or message has been written around it.
    if args.stage == 'final':
        check_text(data); check_cards(data); check_whys(data); check_obligations(data, args); check_placed(data, args)
    else:
        info('--stage build: the text checks (notes, Becauses, week-note words, RPE in text) run in the final pass')
    check_week_notes(data, args)
    check_bans(data, args); check_time(data, args)
    per_day = check_volume(data, args) if args.log else {}
    if not args.log: warn('no --log: the volume floors and back-to-back days were not checked')
    check_week(data, args, per_day)
    if args.spine:
        check_spine(data, args, ctx['spine']); check_continuity(data, args, ctx)
    else: warn('no --spine: the Spine gate, the Quality Map and the continuity checks were not run (run --spine-sql)')
    for level in ('FAIL', 'WARN', 'INFO'):
        for m in out[level]: print(f"{level:4}  {m}")
    print(f"\n{athlete_id}: {len(out['FAIL'])} FAIL · {len(out['WARN'])} WARN")
    return 1 if out['FAIL'] else 0

if __name__ == '__main__':
    sys.exit(main())
