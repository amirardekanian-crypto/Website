"""Every Library card links to its Spine entry (Amir, 2026-10-09).

Runs from .githooks/pre-commit whenever a workout file is staged. A video, the cues and the About sheet
live on the exercise's Spine entry (public.exercises), and a card reaches its entry through `exId`
(program.html spineFor(): exId first, then the name). The 42 older sessions were written before the
Spine, so on 2026-10-09 only 10 of their 371 cards carried an exId and 180 matched no entry at all: a
video Amir added in coach.html never reached them. This stops a card without an exId coming back.

It is a RATCHET: scripts/library_spine_baseline.json lists the card names allowed to go without one.
  not_exercises  never linked on purpose (breathing drills have no pattern in the Spine and Amir kept
                 them out, 2026-10-09; warm-up sets are not an exercise)
  to_draft       still waiting for a Spine entry (/spine). It only shrinks: once a name is linked
                 everywhere, run --update and it cannot come back.
A new card (any session) must carry an exId. The id must be one the Spine has: --online checks the
approved entries through the public get_exercises() RPC (a draft is not served, so it is listed, not
failed).

    python scripts/check_library_spine.py            the check (the hook)
    python scripts/check_library_spine.py --list     every unlinked card, by name
    python scripts/check_library_spine.py --update   shrink to_draft to what is still unlinked
    python scripts/check_library_spine.py --online   also check every exId against the approved Spine
"""
import glob, json, os, re, sys, urllib.request

sys.stdout.reconfigure(encoding='utf-8')
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BASELINE = os.path.join(ROOT, 'scripts', 'library_spine_baseline.json')
SLUG = re.compile(r'[a-z0-9]+(-[a-z0-9]+)*')


def cards():
    """(session id, card) for every exercise and every circuit item in workouts/*/*.json."""
    for f in sorted(glob.glob(os.path.join(ROOT, 'workouts', '*', '*.json'))):
        if f.endswith('index.json'):
            continue
        d = json.load(open(f, encoding='utf-8'))
        for b in d.get('blocks', []):
            for e in b.get('exercises', []):
                for c in (e['items'] if isinstance(e.get('items'), list) else [e]):
                    yield d.get('id', os.path.basename(f)), c


def main():
    base = json.load(open(BASELINE, encoding='utf-8'))
    never, to_draft = set(base['not_exercises']), set(base['to_draft'])
    unlinked, bad_id, used = {}, [], {}
    for sid, c in cards():
        x = c.get('exId')
        if not x:
            unlinked.setdefault(c.get('name', '?'), []).append(sid)
        elif not SLUG.fullmatch(x):
            bad_id.append(f'{sid}: {c.get("name")} has exId {x!r}, not an entry id')
        else:
            used.setdefault(x, []).append(f'{sid}: {c.get("name")}')

    if '--list' in sys.argv:
        for n, s in sorted(unlinked.items()):
            tag = 'not an exercise' if n in never else 'to draft' if n in to_draft else 'NEW'
            print(f'{n} ({tag}): {", ".join(sorted(set(s)))}')
        print(f'{sum(len(s) for s in unlinked.values())} unlinked cards, {len(unlinked)} names')
        return 0

    if '--update' in sys.argv:
        keep = sorted(n for n in to_draft if n in unlinked)
        gone = sorted(to_draft - set(keep))
        base['to_draft'] = keep
        json.dump(base, open(BASELINE, 'w', encoding='utf-8', newline='\n'), ensure_ascii=False, indent=2)
        open(BASELINE, 'a', encoding='utf-8', newline='\n').write('\n')
        print(f'baseline: {len(keep)} names still to draft' + (f'; linked now, removed: {", ".join(gone)}' if gone else ''))
        return 0

    problems = list(bad_id)
    for n, s in sorted(unlinked.items()):
        if n not in never and n not in to_draft:
            problems.append(f'{n} ({", ".join(sorted(set(s)))}) has no exId. Link it to its Spine entry, '
                            'or draft one with /spine first')
    if '--online' in sys.argv:
        page = open(os.path.join(ROOT, 'program.html'), encoding='utf-8').read()
        url = re.search(r'https://[a-z0-9]+\.supabase\.co', page).group(0)
        key = re.search(r'sb_publishable_[A-Za-z0-9_-]+', page).group(0)
        req = urllib.request.Request(url + '/rest/v1/rpc/get_exercises', data=b'{}', method='POST',
                                     headers={'apikey': key, 'Content-Type': 'application/json'})
        approved = {e['id'] for e in json.load(urllib.request.urlopen(req, timeout=20))}
        waiting = {x: s for x, s in used.items() if x not in approved}
        for x, s in sorted(waiting.items()):
            print(f'not approved yet (a draft, or no such id): {x}  <- {"; ".join(s)}')
        print(f'online: {len(used) - len(waiting)} of {len(used)} linked ids are approved entries')

    stale = sorted(n for n in to_draft if n not in unlinked)
    if stale:
        print(f'note: linked now, run --update to lock it in: {", ".join(stale)}')
    if problems:
        print('\n'.join(problems))
        return 1
    print(f'library-spine: OK ({sum(len(s) for s in unlinked.values())} cards still unlinked, all on the baseline)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
