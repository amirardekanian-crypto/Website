#!/usr/bin/env python3
"""Part B 2f: place engage's words into the built programme, by exId, without touching a prescription.

Why (2026-10-17): this was rewritten by hand in every run, and one version would have put a working card's Because on
the same exercise's warm-up card. The words file (engage's output) holds: message {paragraphs, outcomes}, teaser
{paragraphs}, notes {greeting, cards}, notes_by_exid {exId: text}, why_by_exid {exId: {src, text}}, weeknotes
{"1": text, ...}, completion {"<day id>": {title, message}}.
Every text in both languages (COM-1, 2026-11-20; SCHEMA.md → Programme texts in two languages): message / teaser / notes
carry their own `<key>_fa` twins and are copied whole; notes_by_exid_fa {exId: text}, why_by_exid_fa {exId: text} (into
why.text_fa), weeknotes_fa {"1": text}, weeknote_titles_fa {"3": title}, title_fa / message_fa in a completion entry,
focustags_fa {"<day id>": text}, and cycle_fa / next_cycle_fa {tagline, focuses} for the two cycles' tagline_fa / focuses_fa. Words go on WORKING cards only (a prep block's card never
gets them), an exId on two working cards stops the run, a Because never goes on a circuit, and the run stops if the
workouts differ from the build in anything but the words.

  python scripts/place_words.py <built.json> <words.json> <out.json>
"""
import copy, json, re, sys
from collections import Counter

PREP = re.compile(r'warm|mobility|activation|cool|prime|prep', re.I)   # = check_program.py PREP, isPrepBlockTitle()

def place(data, w):
    before = copy.deepcopy(data['workouts'])
    def cards():
        for d in data['workouts']['days']:
            for b in d['blocks']:
                if PREP.search(b.get('title') or ''): continue
                for ex in b['exercises']: yield d, b, ex
    dup = sorted(k for k, n in Counter(ex.get('exId') for _, _, ex in cards() if ex.get('exId')).items() if n > 1)
    if dup: raise SystemExit(f'an exId on two working cards: {dup}')
    notes, whys = w.get('notes_by_exid') or {}, w.get('why_by_exid') or {}
    notes_fa, whys_fa = w.get('notes_by_exid_fa') or {}, w.get('why_by_exid_fa') or {}
    for k in sorted(set(notes_fa) - set(notes)): raise SystemExit(f'a Farsi note with no English note: {k}')
    for k in sorted(set(whys_fa) - set(whys)): raise SystemExit(f'a Farsi Because with no English Because: {k}')
    placed = set()
    for d, b, ex in cards():
        eid = ex.get('exId')
        ex.pop('note', None); ex.pop('note_fa', None); ex.pop('why', None)   # fresh every cycle, never carried over
        if eid in notes:
            ex['note'] = notes[eid]; placed.add(('note', eid))
            if eid in notes_fa: ex['note_fa'] = notes_fa[eid]
        if eid in whys:
            if ex.get('type') == 'circuit': raise SystemExit(f'a Because on a circuit: {eid}')
            ex['why'] = dict(whys[eid]); placed.add(('why', eid))
            if eid in whys_fa: ex['why']['text_fa'] = whys_fa[eid]
    missing = sorted(({('note', k) for k in notes} | {('why', k) for k in whys}) - placed)
    if missing: raise SystemExit(f'words with no working card: {missing}')
    for d in data['workouts']['days']:
        c = (w.get('completion') or {}).get(str(d['id']))
        if c:
            d['completionTitle'], d['completionMessage'] = c['title'], c['message']
            for k in ('title', 'message'):
                key = 'completion' + k.capitalize() + '_fa'
                if c.get(k + '_fa'): d[key] = c[k + '_fa']
                else: d.pop(key, None)
        ft = (w.get('focustags_fa') or {}).get(str(d['id']))
        if ft:
            if not d.get('focusTag'): raise SystemExit(f"a Farsi focusTag for Day {d['id']}, which has none")
            d['focusTag_fa'] = ft
    cyc = data['cycles'][data.get('currentCycleIndex') or 0]
    if w.get('message'): cyc['message'] = w['message']
    for k, text in (w.get('weeknotes') or {}).items():
        cyc.setdefault('weekNotes', {}).setdefault(k, {})['text'] = text
    for k, text in (w.get('weeknotes_fa') or {}).items():
        if k not in (cyc.get('weekNotes') or {}): raise SystemExit(f'a Farsi week note with no week note: {k}')
        cyc['weekNotes'][k]['text_fa'] = text
    for k, title in (w.get('weeknote_titles_fa') or {}).items():
        if k not in (cyc.get('weekNotes') or {}): raise SystemExit(f'a Farsi week-note title with no week note: {k}')
        cyc['weekNotes'][k]['title_fa'] = title
    def cyc_fa(c, src, label):   # the roadmap's English tagline and aims stay; only their Farsi twins are added
        for k in ('tagline', 'focuses'):
            if src.get(k):
                if not c.get(k): raise SystemExit(f'a Farsi {k} for the {label} cycle, which has no {k}')
                if k == 'focuses' and len(src[k]) != len(c[k]): raise SystemExit(f'the {label} cycle has {len(c[k])} aims and {len(src[k])} Farsi ones')
                c[k + '_fa'] = src[k]
    cyc_fa(cyc, w.get('cycle_fa') or {}, 'current')
    nxt = (data.get('currentCycleIndex') or 0) + 1
    if w.get('teaser') and nxt < len(data['cycles']): data['cycles'][nxt]['teaser'] = w['teaser']
    if w.get('next_cycle_fa') and nxt < len(data['cycles']): cyc_fa(data['cycles'][nxt], w['next_cycle_fa'], 'next')
    if w.get('notes'): data['notes'] = w['notes']
    def strip(x):
        x = copy.deepcopy(x)
        for d in x['days']:
            for k in ('completionTitle', 'completionMessage', 'completionTitle_fa', 'completionMessage_fa', 'focusTag_fa'): d.pop(k, None)
            for b in d['blocks']:
                for ex in b['exercises']:
                    if not PREP.search(b.get('title') or ''): ex.pop('note', None); ex.pop('note_fa', None); ex.pop('why', None)
        return json.dumps(x, sort_keys=True)
    if strip(data['workouts']) != strip(before): raise SystemExit('the prescription changed while placing words')
    return data, len([p for p in placed if p[0] == 'note']), len([p for p in placed if p[0] == 'why'])

if __name__ == '__main__':
    if len(sys.argv) != 4: sys.exit(__doc__)
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    data, n, y = place(data, json.load(open(sys.argv[2], encoding='utf-8')))
    json.dump(data, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"placed {n} Coach's Notes and {y} Becauses into {sys.argv[3]}")
