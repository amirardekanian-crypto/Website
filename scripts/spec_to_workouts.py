#!/usr/bin/env python3
"""Part A Step 2: build the workouts from the /program-design spec, so every dose lives in the spec only.

Why (2026-10-17): every run wrote its own build script by hand, so each dose lived twice. A 12-to-10 rep change had to
be made in the spec and in the script, and one card's tempo in a built file differed from its spec. This reads the
spec's DAY blocks (the format in .claude/skills/program-design/SKILL.md → OUTPUT FORMAT) and writes what Step 2
builds: days → blocks (the SECTION names and their icons) → cards with `type` and `rx` (CHP-7's rest on every working
card and circuit), the prep circuit with its rounds and rest, a working circuit with one RPE for the round (SES-13),
`intent`, `test`, and the week notes' numbers. No words (Part B, place_words.py) and no cues.

What stays yours lives in a small choices file, so a rebuild after a spec change keeps it (--choices):
  {"label": "Program 03 · Cycle Name",
   "days": {"1": {"focusTag": "Built From The Legs Up", "art": "lower", "prep": "Hinge & Hip Prep"}},
   "rename": {"name in the spec": "the Spine entry's name"}, "exId": {"card name": "entry-id"}}
That is 2c-2d's day name, day picture and prep and circuit names, the label (else made from --into's cycle name),
and Step 4's renames and the ids the Spine did not give by exact name. With --spine (design's match_<id>.json, or
Step 3's saved --spine-sql result: the same shape), every card whose name the Spine has exactly is stamped with that
id, and the rest are listed for Step 4. Never hand-edit the built workouts: the next build overwrites them.

  python scripts/spec_to_workouts.py <spec.md> <out.json> [--into <programme.json>] [--choices <choices.json>] [--spine <spine.json>]

Without --into, out.json is {"workouts", "weekNotes", "sport"}. With --into, it is that programme with `workouts`
replaced, the badge set and the week notes' numbers written on cycles[currentCycleIndex], words already there kept:
a returning athlete's currentCycleIndex is bumped BEFORE (the run stops when the spec's PROGRAM number is not that
cycle's). A gap in the spec (a working card with no rest, a rep range, a dose it cannot read, a field it does not
know) stops the run and names every one with its line: design fixes it, the build never fills a blank.
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import check_program as cp   # one copy of PREP, the bracket-aware split and the --spine reader

SIDE = re.compile(r'\s*\b(?:each|per)\s+(?:side|leg|arm|hand|way|direction)\b|\s*/\s*(?:side|leg|arm)\b', re.I)
TIME = re.compile(r'\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds?|min|mins|minutes?)', re.I)
DIST = re.compile(r'\d+(?:\.\d+)?\s*(?:m|km|metres?|meters?)', re.I)
RANGE = re.compile(r'\d\s*(?:-|–|—|/|to)\s*\d')
FIELDS = {'sets', 'reps', 'time', 'duration', 'hold', 'distance', 'tempo', 'rpe', 'rest', 'rounds', 'intent',
          'test_flag', 'role', 'logweight', 'detail'}
WEEK_KEYS = {'rpecap': 'rpeCap', 'rpedrop': 'rpeDrop', 'setsdrop': 'setsDrop'}
RX_ORDER = ('sets', 'rounds', 'reps', 'time', 'distance', 'side', 'tempo', 'rpe', 'rest')

class Gap(Exception): pass

def ignored(k):
    """Design's lines for engage and Step 4, not the dose: note_flag, why_flag, film_flag, fallback."""
    return (k.endswith('_flag') and k != 'test_flag') or k.startswith('fallback')

def kv(seg):
    """'RPE: 8' → ('rpe', '8'); a segment with no 'word:' in front → (None, the text)."""
    m = re.match(r'\s*([A-Za-z_][A-Za-z_ ]*?)\s*:\s*(.*)$', seg, re.S)
    return (m.group(1).lower().replace(' ', '_'), m.group(2).strip()) if m else (None, seg.strip())

def none(v): return cp.blank(v) or v.strip().lower() in ('none', '-')

def number(v, what):
    v = cp.outside_brackets(v).strip()
    if re.fullmatch(r'\d+', v): return int(v)
    if re.fullmatch(r'\d+\.\d+', v): return float(v)
    raise Gap(f"{what} '{v}' is not one number" + (": a range, design picks one end (PRG-6)" if RANGE.search(v) else ''))

def amount(v, pattern, what):
    """'20s each side' → ('20s', True). Reps come back as a number, time and distance as written."""
    v = cp.outside_brackets(v)
    side = bool(SIDE.search(v))
    v = re.sub(r'\s+', ' ', SIDE.sub('', v)).strip()
    if what == 'reps': return number(re.sub(r'\s*reps?$', '', v, flags=re.I), 'reps'), side
    if pattern.fullmatch(v): return v, side
    raise Gap(f"{what} '{v}' is not one amount" + (": a range, design picks one end (PRG-6)" if RANGE.search(v) else ''))

def rest_secs(v):
    v = cp.outside_brackets(v).strip().lower()
    m = re.fullmatch(r'(\d+)\s*(?:s|sec|secs|seconds?)?', v)
    if m: return int(m.group(1))
    m = re.fullmatch(r'(\d+(?:\.\d+)?)\s*(?:min|mins|minutes?)', v)
    if m: return round(float(m.group(1)) * 60)
    m = re.fullmatch(r'(\d+):(\d\d)', v)
    if m: return int(m.group(1)) * 60 + int(m.group(2))
    raise Gap(f"rest '{v}' is not a number of seconds" + (": a range, design picks one (CHP-7)" if RANGE.search(v) else ''))

def bare(v):
    """A dose written with no key ('• March in Place | 4 min')."""
    if TIME.fullmatch(SIDE.sub('', v).strip()): return 'time'
    if DIST.fullmatch(SIDE.sub('', v).strip()): return 'distance'
    if re.fullmatch(r'\d+(\s*reps?)?', SIDE.sub('', v).strip(), re.I): return 'reps'
    raise Gap(f"'{v}' is not a field this build knows (a dose is 'reps: 8', 'time: 30s' or 'distance: 20m')")

def add_fields(card, segs, n):
    for seg in segs:
        if not seg.strip(): continue
        k, v = kv(seg)
        if k is None: k = bare(v)
        k = {'duration': 'time', 'hold': 'time'}.get(k, k)
        if ignored(k) or k in ('new_exercise', 'spine_cue'):
            if k == 'why_flag' and not none(v) and not v.startswith('['): card.setdefault('flags', {})[k] = n
            continue
        if k not in FIELDS: raise Gap(f"'{k}:' is not a field this build knows ({', '.join(sorted(FIELDS - {'duration', 'hold'}))})")
        old = card['f'].get(k)
        if old is not None and cp.outside_brackets(old).strip() != cp.outside_brackets(v).strip():
            raise Gap(f"two values for {k}: '{old}' and '{v}'")
        card['f'][k] = v; card['lines'].add(n)

# ── reading the spec ──────────────────────────────────────────────────────────
def parse(text):
    head, weeknotes, days, gaps = {}, [], [], []
    day = block = card = circuit = None
    fence = in_wn = skip = False
    paren = n = 0
    def gap(n, where, msg): gaps.append(f"line {n}: {where}{': ' if where else ''}{msg}")
    def new_card(name, kind):
        if block is None: raise Gap('a card before any SECTION')
        c = {'name': name, 'kind': kind, 'f': {}, 'items': [], 'lines': {n}, 'in_prep': bool(cp.PREP.search(block['title']))}
        block['cards'].append(c); return c
    for n, raw in enumerate(text.replace('\r\n', '\n').split('\n'), 1):
        s = raw.strip()
        if s.startswith('```profile'): fence = True; continue
        if fence:
            if s.startswith('```'): fence = False
            continue
        if paren > 0:                                       # a bracketed comment over several lines
            paren = max(0, paren + s.count('(') - s.count(')')); continue
        if not s: continue
        if re.fullmatch(r'-{3,}', s): day = block = card = circuit = None; skip = False; continue
        m = re.match(r'DAY\s+(\w+)\b\s*[—–-]?\s*(.*)$', s)
        if m:
            title = re.sub(r'\s*\|\s*load identity\s*:.*$', '', m.group(2), flags=re.I).strip()
            day = {'id': int(m.group(1)) if m.group(1).isdigit() else m.group(1), 'title': title, 'blocks': [], 'line': n}
            days.append(day); block = card = circuit = None; skip = False
            continue
        if day is None:                                     # the header: PROGRAM, SPORT_BADGE, ATHLETE_ID, weeknotes
            k, v = kv(s)
            if in_wn and s.startswith('-'): weeknotes.append((n, s)); continue
            in_wn = k == 'weeknotes'
            if k in ('program', 'sport_badge', 'athlete_id'): head[k] = v
            continue
        if s.startswith('('):
            paren = max(0, s.count('(') - s.count(')')); continue
        indented = raw[:1] in (' ', '\t')
        if indented and skip: continue
        skip = False
        if s.upper().startswith('SECTION:'):
            title = cp.outside_brackets(s.split(':', 1)[1]).strip()
            if not (block and block['title'] == title and day['blocks'] and day['blocks'][-1] is block):
                block = {'title': title, 'cards': []}; day['blocks'].append(block)
            card = circuit = None
            continue
        who = None
        try:
            segs = cp.split_top(s, '|')
            k, v = kv(segs[0])
            if k in ('new_exercise', 'spine_cue'): skip = True; continue
            if s.startswith('•'):
                who = segs[0].lstrip('•').strip()
                card, circuit = new_card(who, 'simple'), None
                add_fields(card, segs[1:], n)
            elif re.match(r'PREP\s+CIRCUIT\b', s, re.I):
                who = 'the prep circuit'
                name = re.sub(r'^PREP\s+CIRCUIT\b\s*[:—–-]?\s*', '', cp.outside_brackets(segs[0]).strip(), flags=re.I).strip()
                card = circuit = new_card(name, 'prep')
                add_fields(card, segs[1:], n)
            elif k is not None and (k in FIELDS or ignored(k) or k in ('duration', 'hold')):
                # a field line: the dose under a card, or a flag under a circuit item
                target = circuit['items'][-1] if indented and circuit and circuit['items'] else card
                if target is None: raise Gap(f"'{s[:50]}' belongs to no card")
                who = target['name']
                add_fields(target, segs, n)
            elif k is not None:
                raise Gap(f"cannot read '{s[:60]}': a name has no colon (NAM-4), and '{k}:' is not a field this build knows")
            elif indented:
                item_s = re.sub(r'^[-*]\s+', '', s)
                m = re.match(r'(.+?)\s+[—–]\s+(.*)$', item_s) or re.match(r'(.+?)\s+-\s+(.*)$', item_s)
                parts = cp.split_top(item_s, '|')
                name, rest = (m.group(1), m.group(2)) if m else (parts[0], '|'.join(parts[1:]))
                who = name.strip()
                if circuit is None: raise Gap('indented like a circuit item, but no circuit is open')
                it = {'name': who, 'kind': 'item', 'f': {}, 'lines': {n}, 'in_prep': circuit['in_prep']}
                circuit['items'].append(it); add_fields(it, cp.split_top(rest, '|'), n)
            else:
                who = segs[0].strip()
                card = new_card(who, 'standard')
                add_fields(card, segs[1:], n)
                is_circuit = 'circuit' in (card['f'].get('role') or '').lower() or 'rounds' in card['f']
                card['kind'] = 'circuit' if is_circuit else 'standard'
                circuit = card if is_circuit else None
        except Gap as e:
            gap(n, f"Day {day['id']}" + (f" · {who}" if who else ''), str(e))
    return head, weeknotes, days, gaps

def parse_weeknotes(lines, gaps, notes):
    """'- 1 | rpeCap 7 · setsDrop 1 | the words' and '- 5 | Back-off week | setsDrop 1 · rpeCap 7' → {"1": {...}}."""
    out = {}
    for n, s in lines:
        m = re.match(r'-\s*(\d+)\s*\|(.*)$', s)
        if not m: gaps.append(f"line {n}: weeknotes: '{s[:60]}' does not start with '- <week> |'"); continue
        segs = cp.split_top(m.group(2), '|')
        nums, title = {}, None
        for i, seg in enumerate(segs):
            found = re.findall(r'\b(rpecap|rpedrop|setsdrop)\b\s*:?\s*(\d+)', seg, re.I)
            for k, v in found: nums[WEEK_KEYS[k.lower()]] = int(v)
            k, v = kv(seg)
            if k == 'title': title = v
            elif not found and not nums and i == 0 and len(segs) > 1 and len(seg.split()) <= 5 and not re.search(r'\d', seg):
                title = seg.strip()                         # a short title before the numbers: 'Back-off week'
        if not nums and not title:
            notes.append(f"week {m.group(1)}: no numbers or title on its weeknotes line, so nothing written for it")
            continue
        out[m.group(1)] = dict(nums, **({'title': title} if title else {}))
    return out

# ── turning cards into the programme ──────────────────────────────────────────
def make_rx(c, notes, where):
    f, kind, rx = c['f'], c['kind'], {}
    # 2e: a warm-up line carries the dose only (the prep circuit keeps its rest, CHP-7); a simple line never has a rest.
    drop = {'rest'} if kind == 'simple' else set()
    if c.get('in_prep') and kind in ('simple', 'prep', 'item'): drop |= {'rpe', 'tempo'} | ({'rest'} if kind != 'prep' else set())
    if drop & set(f):
        notes.append(f"{where} · {c['name']}: left out its {', '.join(sorted(drop & set(f)))} (a warm-up or simple line "
                     "carries the dose only, 2e)")
        f = {k: v for k, v in f.items() if k not in drop}
    bad = {'rpe', 'tempo', 'rest', 'sets'} & set(f)
    if kind == 'item' and bad:
        raise Gap(f"{', '.join(sorted(bad))} on a circuit item: an item takes only its reps, time or distance, and the "
                  "round's one RPE and rest go on the circuit's line (SES-13, CHP-7)")
    if kind in ('circuit', 'prep') and {'sets', 'reps', 'time', 'distance', 'tempo'} & set(f):
        raise Gap(f"{', '.join(sorted({'sets', 'reps', 'time', 'distance', 'tempo'} & set(f)))} on a circuit's own line: "
                  "a circuit takes rounds, rest and one RPE; each item its own dose")
    side = False
    if 'sets' in f: rx['sets'] = number(f['sets'], 'sets')
    if 'rounds' in f: rx['rounds'] = number(f['rounds'], 'rounds')
    for k, pat in (('reps', None), ('time', TIME), ('distance', DIST)):
        if k in f: rx[k], s = amount(f[k], pat, k); side = side or s
    if side: rx['side'] = True
    if 'tempo' in f and not none(cp.outside_brackets(f['tempo'])): rx['tempo'] = cp.outside_brackets(f['tempo']).strip()
    if 'rpe' in f: rx['rpe'] = number(f['rpe'], 'RPE')
    if 'rest' in f: rx['rest'] = rest_secs(f['rest'])
    if kind in ('standard', 'circuit', 'prep') and 'rest' not in rx:
        raise Gap("no rest: every working card and every circuit, a prep circuit too, carries its own (CHP-7)")
    if kind in ('circuit', 'prep') and 'rounds' not in rx: raise Gap('no rounds on the circuit')
    if kind in ('standard', 'simple', 'item') and not ({'reps', 'time', 'distance'} & set(rx)) and not f.get('detail'):
        raise Gap('no dose (reps, time or distance)')
    return {k: rx[k] for k in RX_ORDER if k in rx}

def card_json(c, choices, stamp, notes, where):
    name = choices.get('rename', {}).get(c['name'], c['name'])
    o = {'name': name}
    if c['kind'] not in ('circuit', 'prep'): stamp(o, c['name'], where)
    if c['kind'] != 'item': o['type'] = {'prep': 'circuit'}.get(c['kind'], c['kind'])
    rx = make_rx(c, notes, where)
    if rx: o['rx'] = rx
    f = c['f']
    if f.get('intent') and not none(cp.outside_brackets(f['intent'])):
        o['intent'] = ' · '.join(p.strip() for p in re.split(r'[,·]', cp.outside_brackets(f['intent'])) if p.strip())
    if f.get('test_flag') and not none(f['test_flag']):
        t = cp.outside_brackets(f['test_flag']).strip()
        o['test'] = True if t.lower() in ('yes', 'true') else t
    if (f.get('logweight') or '').strip().lower() in ('yes', 'true'): o['logWeight'] = True
    if f.get('detail'): o['detail'] = f['detail']
    return o

def build(head, wn_lines, days, gaps, choices, spine_names):
    notes, left, counts = [], [], {'spine': 0, 'choices': 0}
    ex_map = choices.get('exId') or {}
    def stamp(o, spec_name, where):
        eid, src = ex_map.get(o['name']) or ex_map.get(spec_name), 'choices'
        sn = spine_names or {}
        key = o['name'] if o['name'] in sn else spec_name if spec_name in sn else None
        if not eid and key and sn[key].get('hit'): eid, src = sn[key]['hit'], 'spine'
        if eid: o['exId'] = eid; counts[src] += 1; return
        if spine_names is None: left.append(f"{where} · {o['name']}"); return
        left.append(f"{where} · {o['name']}" + (cp.name_hint(key, sn) if key else
                    ": not in the saved --spine file (renamed since it was saved?): run --spine-sql again"))
    out_days, yours = [], []
    for d in days:
        nd = (choices.get('days') or {}).get(str(d['id'])) or {}
        od = {'id': d['id']}
        for k in ('art', 'focusTag'):
            if nd.get(k): od[k] = nd[k]
        missing = [k for k in ('focusTag', 'art') if not nd.get(k)]
        blocks = []
        for b in d['blocks']:
            ob = {'title': b['title']}
            ic = icon(b['title'])
            if ic: ob['icon'] = ic
            ob['exercises'] = []
            for c in b['cards']:
                where = f"Day {d['id']} · {c['name']}"
                if c['kind'] == 'prep' and not c['name']:
                    c['name'] = nd.get('prep') or 'Prep Circuit'
                    if not nd.get('prep'): missing.append('the prep circuit\'s name')
                try:
                    if c['kind'] == 'standard' and c['items']: raise Gap('items under a card that is not a circuit (give it role: circuit and rounds)')
                    o = card_json(c, choices, stamp, notes, f"Day {d['id']}")
                    if c['kind'] in ('circuit', 'prep'):
                        if not c['items']: raise Gap('a circuit with no items')
                        if ' + ' in o['name']: yours.append(f"Day {d['id']}: name the circuit '{o['name']}' by its pairing (\"Push-Pull Superset\", 2a), in rename")
                        o['items'] = []
                        for it in c['items']:
                            try: o['items'].append(card_json(it, choices, stamp, notes, f"Day {d['id']}"))
                            except Gap as e: gaps.append(f"line {min(it['lines'])}: Day {d['id']} · {it['name']}: {e}")
                    ob['exercises'].append(o)
                except Gap as e:
                    gaps.append(f"line {min(c['lines'])}: {where}: {e}")
            blocks.append(ob)
        od['blocks'] = blocks
        if not d['blocks']: gaps.append(f"line {d['line']}: Day {d['id']}: no SECTION")
        if missing: yours.append(f"Day {d['id']}: " + ', '.join(missing) + f" (the spec's working title: '{d['title']}')")
        out_days.append(od)
    weeknotes = parse_weeknotes(wn_lines, gaps, notes)
    return out_days, weeknotes, notes, left, counts, yours

def item_whys(days):
    """(line, where) for every why_flag the spec puts on a circuit item. program.html reads a Because only on a card of
    its own, never on an item, so a flag there is lost: six of one cycle's twelve on 2026-10-17. check_program.py's
    --stage build reads the spec through this too."""
    return [(it['flags']['why_flag'], f"Day {d['id']} · {it['name']} (in {c['name'] or 'the prep circuit'})")
            for d in days for b in d['blocks'] for c in b['cards'] for it in c['items'] if 'why_flag' in (it.get('flags') or {})]

ITEM_WHY = ("a why_flag on a circuit item never shows (the app draws no Because on an item): design moves it to a "
            "standalone exercise or drops it")

def icon(title):
    """SCHEMA.md → Standard section names: prep 🔥, Primary 🎯, Accessory 💪, Core 🧱, power ⚡, conditioning 🫀."""
    t = title.lower()
    if cp.PREP.search(t): return '🔥'
    for word, ic in (('primary', '🎯'), ('accessory', '💪'), ('core', '🧱')):
        if t.startswith(word): return ic
    if re.search(r'power|plyo|speed|jump|throw|med ball|explosive|spring', t): return '⚡'
    if re.search(r'condition|finisher|engine|cardio|interval', t): return '🫀'
    return None

def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('spec'); ap.add_argument('out')
    ap.add_argument('--into'); ap.add_argument('--choices'); ap.add_argument('--spine')
    a = ap.parse_args()
    head, wn_lines, days, gaps = parse(open(a.spec, encoding='utf-8').read())
    choices = json.load(open(a.choices, encoding='utf-8')) if a.choices else {}
    spine_names = cp.load_context(a.spine)['names'] if a.spine else None
    if not days: gaps.append("no DAY blocks: the spec's days start with 'DAY 1 — <working title>'")
    out_days, weeknotes, notes, left, counts, yours = build(head, wn_lines, days, gaps, choices, spine_names)
    for n, where in item_whys(days): print(f"WARN  [COM-4] line {n}: {where}: {ITEM_WHY}")
    for k in (choices.get('days') or {}):
        if k not in {str(d['id']) for d in days}: notes.append(f"the choices file has Day {k}, which the spec does not")
    prog = json.load(open(a.into, encoding='utf-8')) if a.into else None
    num = re.match(r'\s*(\d+)', head.get('program') or '')
    cycles, cci = (prog or {}).get('cycles') or [], (prog or {}).get('currentCycleIndex') or 0
    cyc = cycles[cci] if cci < len(cycles) else None
    if prog is not None:
        aid = (prog.get('athlete') or {}).get('id')
        if head.get('athlete_id') and aid and head['athlete_id'] != aid:
            gaps.append(f"the spec is {head['athlete_id']}'s and {a.into} is {aid}'s")
        if cyc is None: gaps.append(f"{a.into} has no cycle at currentCycleIndex {cci}")
        elif num and cyc.get('num') is not None and int(num.group(1)) != int(cyc['num']):
            gaps.append(f"the spec is Program {int(num.group(1)):02d} but currentCycleIndex {cci} is cycle {cyc['num']}: "
                        "a returning athlete's currentCycleIndex goes up by one BEFORE the build (Step 2, RETURNING)")
    if gaps:
        print(f"STOP  {len(gaps)} gap{'s' if len(gaps) > 1 else ''} in the spec: design fixes them, then build again.")
        for g in gaps: print('  ' + g)
        return 1
    label = choices.get('label') or (num and cyc and cyc.get('name') and f"Program {int(num.group(1)):02d} · {cyc['name']}")
    workouts = dict({'label': label} if label else {}, days=out_days)
    if not label: yours.insert(0, 'workouts.label (Program 0N · <Cycle Name>)')
    badge = (head.get('sport_badge') or '').strip()
    if prog is None:
        result = {'workouts': workouts, 'weekNotes': weeknotes}
        if badge: result['sport'] = {'badge': badge}
    else:
        result = prog
        result['workouts'] = workouts
        if badge: result.setdefault('sport', {})['badge'] = badge
        # Exactly the spec's weeks; a week's words (Part B) stay when its numbers are rewritten.
        old = cyc.get('weekNotes') or {}
        cyc['weekNotes'] = {k: dict(v, **({'text': old[k]['text']} if isinstance(old.get(k), dict) and old[k].get('text') else {}))
                            for k, v in weeknotes.items()}
        if not weeknotes: cyc.pop('weekNotes', None)
    json.dump(result, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    n_cards = sum(len(b['exercises']) for d in out_days for b in d['blocks'])
    n_items = sum(len(e.get('items') or []) for d in out_days for b in d['blocks'] for e in b['exercises'])
    print(f"built {len(out_days)} days, {n_cards} cards and {n_items} circuit items from {a.spec} into {a.out}")
    where = f" on cycles[{cci}] ({cyc.get('name') or 'cycle ' + str(cyc.get('num'))})" if prog is not None else ''
    print('week notes' + where + ': ' + (' · '.join(f"week {k} {json.dumps(v, ensure_ascii=False)}" for k, v in weeknotes.items()) or 'none'))
    print(f"exId: {counts['spine']} from the Spine's exact names, {counts['choices']} from the choices file, {len(left)} left for Step 4"
          + ('' if spine_names is not None or not left else ' (no --spine: run --spine-sql on this file, save it, build again with --spine)'))
    if spine_names is not None:
        for l in left: print('  ' + l)
    for m in notes: print('NOTE  ' + m)
    if yours:
        print('STILL YOURS (2a-2d; put them in the choices file so the next build keeps them):')
        for y in yours: print('  ' + y)
    return 0

if __name__ == '__main__':
    sys.exit(main())
