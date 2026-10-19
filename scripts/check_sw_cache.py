"""sw.js still names its cache.

`const CACHE = 'aap-vN'` is the one line every part of the service worker reads: install, activate and each of the three
fetch paths. On 2026-10-19 a conflict resolution kept both sides' version notes and dropped the line between them. sw.js
still PARSED, every check passed and the build shipped — and the live worker threw ReferenceError on install, so no
athlete's app shell could update and a fresh install got no offline copy. Nothing caught it until the served file was read
by hand.

Two things, then: the line exists, and its version is the highest `// vN:` note in the file, so a new note written without
a bump is caught as well. Run it on a file, or give it nothing and it reads sw.js beside this script's repo root.

    python scripts/check_sw_cache.py [sw.js]
"""
import re
import sys
from pathlib import Path

CACHE_LINE = re.compile(r"^const CACHE = 'aap-v(\d+)';", re.M)
NOTE = re.compile(r"^// v(\d+):", re.M)


def check(text):
    """Returns (ok, message)."""
    found = CACHE_LINE.search(text)
    if not found:
        return False, ("no `const CACHE = 'aap-vN';` line: every caches.open(CACHE) in this file throws at runtime, "
                       "and the worker never installs")
    cache = int(found.group(1))
    notes = [int(n) for n in NOTE.findall(text)]
    if notes and cache != max(notes):
        return False, ("CACHE is aap-v%d but the newest note is v%d: bump whichever is behind, so the comments and the "
                       "cache name cannot drift apart" % (cache, max(notes)))
    return True, 'cache is aap-v%d' % cache


def main(argv):
    path = Path(argv[1]) if len(argv) > 1 else Path(__file__).resolve().parent.parent / 'sw.js'
    ok, msg = check(path.read_text(encoding='utf-8'))
    print('%s: %s' % (path.name, msg))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv))
