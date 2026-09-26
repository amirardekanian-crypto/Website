#!/usr/bin/env python3
"""Check a built programme (data/<id>.json) against the house rules, BEFORE any review.

Why this exists (Amir, 2026-09-25, "yes, do all five"): a new athlete's first programme took
~2 h 40 min of work, and most of it was a three-agent review panel re-finding things a script can
find: a muscle under the 10-set floor, a banned hold hiding in a setup, a 6-set exercise, a note
that took RPE below 6. The panel caught 14 must-fixes; about a third were mechanical. So the
mechanical rules live here, the review keeps only the judgment, and a returning athlete's cycle
needs no reviewer at all unless Amir asks.

Plain Python 3, standard library only, because Node is not on Amir's PC. Nothing here touches
the database: the one lookup it needs is printed by --spine-sql for you to run and save.

  python3 scripts/check_program.py data/<id>.json [options]

  --log FILE      the coaching-log entry with the per-exercise volume table (| Day | Exercise |
                  Sets | Counts toward |). Needed for the floors and the back-to-back check.
  --female        the women's lower-body floor: quads, hamstrings, glutes each >= 10 sets/week
  --new           a new athlete's first cycle: no weighted exercise under 8 reps, and no
                  working circuits (supersets) at all
  --cap MIN       the session cap in minutes (default 60)
  --ban WORDS     comma list of words this athlete must not be given (goblet,hanging,...);
                  without it, the spec's "bans: ..." line is used
  --spec FILE     the design spec: its fallback lines are scanned for banned words too
  --week DAYS     the example week, e.g. "Sat:1,Sun:2,Mon:3,Wed:4" (back-to-back check)
  --spine FILE    the saved result of --spine-sql: the Spine gate and the Quality Map
  --spine-sql     print the one query whose result is the --spine file, then stop
  --fingerprint   print the content fingerprint and the SQL that computes the server's, then stop

Exit code 1 if anything FAILs. FAIL = a house rule is broken. WARN = look at it.
"""
import argparse, hashlib, json, re, sys

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
NEGATION = re.compile(r"\b(no|not|never|nothing|without|avoid|avoids|banned|ban|instead of|skip|don't|do not|"
                      r"are out|is out|ruled out|off the table)\b", re.I)

out = {'FAIL': [], 'WARN': [], 'INFO': []}
def fail(m): out['FAIL'].append(m)
def warn(m): out['WARN'].append(m)
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

# ── the rule checks ───────────────────────────────────────────────────────────
def check_structure(data, args):
    seen = {}
    for d, b, ex, it in exercises(data):
        o = it or ex
        where = f"Day {d.get('id')} · {b.get('title')} · {o.get('name')}"
        prep = bool(PREP.search(b.get('title') or ''))
        if not it and ex.get('type') not in ('standard', 'simple', 'circuit'):
            fail(f"{where}: type must be standard, simple or circuit (got {ex.get('type')!r})")
        if o.get('chips'): fail(f"{where}: carries chips[] (write rx, never chips)")
        if o.get('cues'): fail(f"{where}: carries cues (cues come from the Spine entry only)")
        if not it and ex.get('type') == 'circuit':
            if not prep and args.new:
                fail(f"{where}: a working circuit (superset) in a new athlete's first cycle: straight sets only")
            continue
        if not o.get('exId'): fail(f"{where}: no exId")
        # No floating text on a card (Amir, 2026-09-25: "i dont like floating text and remember this").
        # A grip is the athlete's CHIP ("grips should be a chip on the card not a free text"): the only
        # chip an rx card draws is `intent`, the pill his older cards use for "neutral grip". Any other
        # detail for this athlete (a hand position, a bench) is the Coach's Note.
        if re.search(r'\bgrip|\bpalms?\b|pronat|supinat|\boverhand\b|\bunderhand\b', o.get('setup') or '', re.I):
            fail(f"{where}: a grip written as free text ('{o['setup']}'): make it the chip, the exercise's intent (e.g. \"neutral grip\")")
        elif o.get('setup'):
            fail(f"{where}: floating text on the card ('{o['setup']}'): put it in the Coach's Note")
        rx = o.get('rx') or {}
        doses = [k for k in ('reps', 'time', 'distance', 'work') if rx.get(k) not in (None, '')]
        if len(doses) > 1: fail(f"{where}: two doses ({' + '.join(doses)})")
        if isinstance(rx.get('reps'), str) and re.search(r'\d\s*[-–]\s*\d', rx['reps']):
            fail(f"{where}: a rep range ({rx['reps']}): one number, never a range")
        sets = num(rx.get('sets'))
        if sets and sets > 4: fail(f"{where}: {int(sets)} sets (never more than 4 on one exercise: add an exercise)")
        rpe = num(str(rx.get('rpe', '')).split('-')[0]) if rx.get('rpe') not in (None, '') else None
        if rpe is not None and rpe < 6: fail(f"{where}: RPE {rx.get('rpe')} is under the floor of 6")
        if prep and rx.get('rpe') not in (None, ''): warn(f"{where}: RPE on a warm-up item")
        if rx.get('tempo') and not re.match(r'^(iso|\d+(\.\d+)?([-–]\d+(\.\d+)?){2,3})$', str(rx['tempo']).strip(), re.I):
            fail(f"{where}: tempo {rx['tempo']!r} should be iso or 3-4 numbers")
        if not prep and not it and ex.get('type') == 'standard':
            reps = num(rx.get('reps'))
            if args.new and reps is not None and reps < 8:
                if rx.get('tempo'):
                    fail(f"{where}: {int(reps)} reps. A new athlete's first cycle has no weighted exercise under 8 reps")
                else:
                    info(f"{where}: {int(reps)} reps, no tempo, so read as a jump, landing or sprint drill (exempt from the 8-rep rule)")
            key = (o.get('exId') or o.get('name', '')).lower()
            seen.setdefault(key, []).append(f"Day {d.get('id')}")
    for key, days in seen.items():
        if len(days) > 1: fail(f"{key}: in {len(days)} working blocks ({', '.join(days)}): each working exercise once per cycle")

def check_text(data):
    for where, s in text_fields(data):
        for m in re.finditer(r'RPE\s*(?:of\s*)?(\d+(?:\.\d+)?)', s):
            if float(m.group(1)) < 6: fail(f"{where}: says RPE {m.group(1)}, under the floor of 6")
        for sen in sentences(s):
            if re.search(r'\b(take|drop|minus|subtract|lower|knock)\b.{0,40}\bRPE', sen, re.I) and '6' not in sen:
                fail(f"{where}: lowers the RPE without naming the floor of 6 in the same sentence: \"{sen[:90]}\"")
        if '—' in s: warn(f"{where}: an em-dash (not how Amir writes)")
        m = re.search(r'\b(\d+)\s*[-–]\s*(\d+)\s*reps?\b', s, re.I)
        if m: warn(f"{where}: a rep range in the text ({m.group(0)})")

def check_cards(data):
    for c in (data.get('notes') or {}).get('cards') or []:
        body, t = c.get('body', ''), c.get('title')
        if not re.search(r'<(p|ul)\b', body): fail(f"card '{t}': the body is not HTML (<p>, <ul><li>)")
        stack = []
        for m in re.finditer(r'<(/?)([a-z]+)[^>]*?(/?)>', body):
            close, tag, selfclose = m.group(1), m.group(2), m.group(3)
            if tag in ('br', 'hr', 'img') or selfclose: continue
            if close:
                if not stack or stack.pop() != tag: fail(f"card '{t}': unbalanced </{tag}>"); break
            else: stack.append(tag)
        else:
            if stack: fail(f"card '{t}': unclosed <{'>, <'.join(stack)}>")
        if '<ol' in body: warn(f"card '{t}': <ol> has no styling in .note-body, use <ul>")

def check_whys(data):
    whys = [(d, ex) for d, b, ex, it in exercises(data) if not it and ex.get('why') is not None]
    n = len(whys)
    if n > 10: fail(f"{n} Becauses: keep the 5-10 real personal decisions")
    elif n < 5: warn(f"{n} Becauses: a cycle carries 5-10 (fewer than 3 hides the Why-your-plan button)")
    for d, ex in whys:
        w, where = ex['why'], f"Day {d.get('id')} {ex.get('name')} why"
        if not isinstance(w, dict): fail(f"{where}: must be {{src, text}}"); continue
        if w.get('src') not in ('goal', 'body', 'test', 'cycle', 'you', 'court'): fail(f"{where}: src {w.get('src')!r}")
        if w.get('src') == 'body' and not w.get('part'): fail(f"{where}: src body needs a part")
        if w.get('part') and w.get('src') != 'body': fail(f"{where}: part only goes with src body")
        text = (w.get('text') or '').strip()
        if len(text) > 140: fail(f"{where}: {len(text)} characters (140 max)")
        if re.search(r'[—;]', text): fail(f"{where}: an em-dash or semicolon")

def ban_hit(word, s):
    return re.search(r'(?<![a-z])' + re.escape(word.lower()) + r'(e?s)?(?![a-z])', s.lower())

def check_bans(data, args):
    ban = args.ban
    if not ban and args.spec:  # the spec names them once: "bans: goblet, hanging, ..."
        m = re.search(r'^\s*bans?\s*:\s*(.+)$', open(args.spec, encoding='utf-8').read(), re.I | re.M)
        ban = m.group(1) if m else ''
    words = [w.strip() for w in (ban or '').split(',') if w.strip()]
    if not words: return
    for d, b, ex, it in exercises(data):
        o = it or ex
        for k in ('name', 'setup', 'intent'):
            for w in words:
                if ban_hit(w, o.get(k) or ''):
                    fail(f"Day {d.get('id')} {o.get('name')}: banned for this athlete ('{w}' in {k})")
    for where, s in text_fields(data):
        if ' setup' in where or ' intent' in where: continue
        for sen in sentences(s):
            for w in words:
                if ban_hit(w, sen) and not NEGATION.search(sen):  # a ban sentence names what it bans
                    warn(f"{where}: mentions '{w}' outside a ban: \"{sen[:100]}\"")
    if args.spec:
        for i, line in enumerate(open(args.spec, encoding='utf-8'), 1):
            if not re.search(r'fallback|->|→|instead|swap', line, re.I): continue
            for w in words:
                m = ban_hit(w, line)
                if m and not NEGATION.search(line[:m.start()]):
                    fail(f"spec line {i}: a fallback or swap gives a banned '{w}': {line.strip()[:110]}")

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
        if mins > args.cap * 1.10: fail(f"{line}: over the {args.cap:g}-min cap by more than 10%")
        elif mins > args.cap: warn(f"{line}: a little over the {args.cap:g}-min cap")
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
        fail(f"{args.log}: no per-exercise volume table (| Day | Exercise | Sets | Counts toward |)"); return {}
    prog, loaded = {}, {}
    for d, b, ex, it in exercises(data):
        o = it or ex
        if not it and ex.get('type') == 'circuit': continue
        rx = o.get('rx') or {}
        sets = num(((ex.get('rx') or {}).get('rounds')) if it else rx.get('sets')) or 1
        prog.setdefault(o.get('name', '').lower(), []).append((d.get('id'), sets, bool(PREP.search(b.get('title') or ''))))
        if (not it and ex.get('type') == 'standard' and not PREP.search(b.get('title') or '')
                and rx.get('tempo') and dose_of(rx) in ('reps', 'time')):
            loaded[o.get('name', '').lower()] = (d.get('id'), o.get('name'))
    total, per_day, listed = {}, {}, set()
    for r in rows:
        key = r['name'].lower(); listed.add(key)
        if key not in prog:
            fail(f"volume table lists '{r['name']}', which the programme does not have"); continue
        if not any(abs(s - r['sets']) < 0.01 for _, s, _ in prog[key]):
            fail(f"volume table: '{r['name']}' at {r['sets']:g} sets, the programme has {', '.join(f'{s:g}' for _, s, _ in prog[key])}")
        dm = re.match(r'D(?:ay)?\s*(\d+)', r['day'], re.I)
        if dm and all(str(day) != dm.group(1) for day, _, _ in prog[key]):
            warn(f"volume table: '{r['name']}' filed under {r['day']}, the programme has it on Day {prog[key][0][0]}")
        for m, n, w in r['parts']:
            if abs(n - r['sets'] * w) > 0.01:
                fail(f"volume table: '{r['name']}' {m} {n:g} should be {r['sets'] * w:g} ({r['sets']:g} sets x {w:g})")
            mm = norm_muscle(m)
            total[mm] = total.get(mm, 0) + n
            if dm: per_day.setdefault(dm.group(1), {}).setdefault(mm, 0); per_day[dm.group(1)][mm] += n
    for key, (day, name) in loaded.items():
        if key not in listed: fail(f"Day {day} {name}: a loaded exercise missing from the volume table (count every exercise that loads a muscle)")
    for mm in sorted(total, key=lambda k: -total[k]):
        v = total[mm]
        if args.female and mm in LOWER and v < 10: fail(f"{mm} {v:g} sets/week: under the women's floor of 10")
        elif mm == 'shoulder' and not (10 <= v <= 20): warn(f"shoulder {v:g} sets/week: the range is 10-20")
        elif v > 20: warn(f"{mm} {v:g} sets/week: over 20")
        else: info(f"{mm} {v:g} sets/week")
    for mm in LOWER:
        if args.female and mm not in total: fail(f"{mm}: 0 sets/week (not in the volume table)")
    return per_day

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
            warn(f"example week: Day {a} ({kind(a)}) on {WEEKDAYS[i].title()} is right before Day {b} ({kind(b)}): two hard lower-body days back to back")
    info('example week: ' + ', '.join(f"{WEEKDAYS[i].title()} Day {plan[i]}" for i in sorted(plan)))

# ── the Spine gate and the Quality Map ────────────────────────────────────────
def load_spine(path):
    raw = open(path, encoding='utf-8').read().strip()
    lines = []
    if raw.startswith('['):
        for o in json.loads(raw):
            if isinstance(o, dict) and 'spine' in o: lines += str(o['spine']).splitlines()
            elif isinstance(o, dict) and 'id' in o:
                lines.append('|'.join([o['id'], o.get('status', ''), str(o.get('has_cues', '')).lower(),
                                       ','.join(o.get('qualities') or [])]))
    else:
        lines = raw.splitlines()
    spine = {}
    for l in lines:
        p = l.strip().split('|')
        if len(p) >= 3:
            spine[p[0]] = {'status': p[1], 'cues': p[2].lower() in ('true', 't'), 'q': [x for x in (p[3] if len(p) > 3 else '').split(',') if x]}
    return spine

def qm_sets(rx):
    """How many sets one working exercise counts for in the Quality Map. An exercise dosed by
    TIME with no sets is one continuous effort (a 30-min ride): one set per 10 minutes, never
    less than 1. Same rule as program.html qmSets() and coach.html qmSetsC() (2026-09-26)."""
    n = num(rx.get('sets'))
    if n: return int(n)
    t = secs(rx.get('time'))
    return max(1.0, t / 600) if t else 1

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
                for it in ex.get('items') or []: add(it.get('exId'), int(num(rx.get('rounds')) or 1))
            else: add(ex.get('exId'), qm_sets(rx))
    return score, (covered / total if total else 0)

def top3(score, coverage):
    if coverage < QM_COVERAGE: return []
    s = sum(score.values())
    keep = [q for q in score if score[q] >= max(1.5, s * 0.12)]
    return sorted(keep, key=lambda q: (-score[q], QUALITIES.index(q) if q in QUALITIES else 99))[:3]

def check_spine(data, args):
    spine = load_spine(args.spine)
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
            fail(f"{i}: not in the library yet. Add it with /spine (cues and every detail, linked like the others)")
            continue
        if not spine[i]['cues']: fail(f"{i}: the library entry has no cues, so the card shows none")
        # Only Amir's ten quality pills (2026-09-25: "just use the 10 pills i have, this is a rule").
        bad = [q for q in spine[i]['q'] if q not in QUALITIES]
        if bad: fail(f"{i}: tagged {', '.join(bad)}, not one of the ten qualities ({', '.join(QUALITIES)})")
    if drafts: warn(f"{len(drafts)} library entries are drafts, so their cards show no cues until Amir approves them. Ask him in the handoff: {', '.join(drafts)}")
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
    if not art: warn('no cycle art word, so no headline check')
    elif not head: info(f"headline: '{art}' is a phase (bedrock, peak or reset), no headline check. Week: {top}")
    elif head in ranked[:2]: info(f"headline {art} → {head}: in the week's top two ✓ ({top})")
    else: fail(f"headline {art} → {head} is not in the week's top two ({top}): fix the week or the art word")

# ── the two printouts ─────────────────────────────────────────────────────────
def spine_sql(data):
    ids = sorted({(it or ex).get('exId') for d, b, ex, it in exercises(data) if (it or ex).get('exId')})
    print("-- Run once, save the result to the scratchpad, pass it as --spine. Missing ids = no entry.")
    print("select string_agg(e.id || '|' || e.status || '|' || (e.cues is not null)::text || '|' || "
          "array_to_string(e.qualities, ','), E'\\n' order by e.id) as spine")
    print("from public.exercises e where e.id in (" + ', '.join(f"'{i}'" for i in ids) + ");")

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
    ap.add_argument('--log'); ap.add_argument('--female', action='store_true'); ap.add_argument('--new', action='store_true')
    ap.add_argument('--cap', type=float, default=60); ap.add_argument('--ban'); ap.add_argument('--spec')
    ap.add_argument('--week'); ap.add_argument('--spine'); ap.add_argument('--art')
    ap.add_argument('--spine-sql', action='store_true'); ap.add_argument('--fingerprint', action='store_true')
    args = ap.parse_args()
    data = json.load(open(args.program, encoding='utf-8'))
    athlete_id = (data.get('athlete') or {}).get('id', '<id>')
    if args.spine_sql: spine_sql(data); return 0
    if args.fingerprint: fingerprint(data, athlete_id); return 0
    check_structure(data, args); check_text(data); check_cards(data); check_whys(data)
    check_bans(data, args); check_time(data, args)
    per_day = check_volume(data, args) if args.log else {}
    if not args.log: warn('no --log: the volume floors and back-to-back days were not checked')
    check_week(data, args, per_day)
    if args.spine: check_spine(data, args)
    else: warn('no --spine: the Spine gate and the Quality Map were not checked (run --spine-sql)')
    for level in ('FAIL', 'WARN', 'INFO'):
        for m in out[level]: print(f"{level:4}  {m}")
    print(f"\n{athlete_id}: {len(out['FAIL'])} FAIL · {len(out['WARN'])} WARN")
    return 1 if out['FAIL'] else 0

if __name__ == '__main__':
    sys.exit(main())
