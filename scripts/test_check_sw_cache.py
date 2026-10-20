"""The sw.js cache guard still fails on each fault (scripts/check_sw_cache.py).

The guard exists because a broken sw.js passed every other check and shipped, so this test is what keeps it honest.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_sw_cache import check, shell_misses, PAGES   # noqa: E402

GOOD = "// v185: a note\n// v186: another note\nconst CACHE = 'aap-v186';\ncaches.open(CACHE);\n"
CASES = [
    ('the real file', Path(__file__).resolve().parent.parent.joinpath('sw.js').read_text(encoding='utf-8'), True),
    ('a good little file', GOOD, True),
    ('no CACHE line at all', GOOD.replace("const CACHE = 'aap-v186';\n", ''), False),
    ('the line commented out', GOOD.replace("const CACHE =", "// const CACHE ="), False),
    ('a note newer than the cache', GOOD + '// v187: nobody bumped for this\n', False),
    ('the cache ahead of every note', GOOD.replace("aap-v186';", "aap-v190';"), False),
    ('no notes at all (a file that keeps none)', "const CACHE = 'aap-v7';\n", True),
]

def main():
    bad = 0
    for name, text, want in CASES:
        ok, msg = check(text)
        if ok == want:
            print('ok    %s → %s' % (name, 'passes' if ok else 'blocked'))
        else:
            bad += 1
            print('FAIL  %s → wanted %s, got %s (%s)' % (name, 'pass' if want else 'block', 'pass' if ok else 'block', msg))
    # The SHELL's scripts are precached under the URL the pages ask for (2026-10-20).
    root = Path(__file__).resolve().parent.parent
    real = [root.joinpath(p).read_text(encoding='utf-8') for p in PAGES]
    sw = "const SHELL = [\n  '/program.html',\n  '/assets/js/push.js?v=1',\n];\n"
    page = '<script defer src="/assets/js/push.js?v=1"></script>'
    for name, got, want in [
        ('the real SHELL against the real pages', shell_misses(root.joinpath('sw.js').read_text(encoding='utf-8'), real), []),
        ('a script precached by the URL the page asks for', shell_misses(sw, [page]), []),
        ('the plain name for a page that asks ?v=1', shell_misses(sw.replace('push.js?v=1', 'push.js'), [page]), ['/assets/js/push.js']),
        ('a script no page loads at all', shell_misses(sw, ['<p>nothing</p>']), ['/assets/js/push.js?v=1']),
    ]:
        if got == want:
            print('ok    %s' % name)
        else:
            bad += 1
            print('FAIL  %s → wanted %s, got %s' % (name, want, got))
    print('check_sw_cache: %s' % ('OK' if not bad else '%d case(s) wrong' % bad))
    return 1 if bad else 0

if __name__ == '__main__':
    sys.exit(main())
