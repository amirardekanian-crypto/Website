"""Stamp the course app's cache-busters after editing tennis/app/ in this repo.

The Tennis Performance System app is normally deployed from the private tps-content repo, whose
deploy script stamps these. The demo (2026-09-15) was built here instead, because that repo was not
reachable from Amir's PC, and any edit made here needs the same stamps:

  - index.html loads app.css?v=<hash> and app.js?v=<hash>, so a changed file gets a new URL and
    skips the browser's cache.
  - sw.js VERSION must change whenever the shell changes. The service worker answers from its cache
    first, so a phone that already has the app keeps the old one until sw.js itself changes. Skip
    this and buyers never see the change.

Hashes are taken over the files as git stores them (CRLF becomes LF), so a Windows checkout stamps
the same values the website serves. Line endings in the files themselves are left as they are.

    python scripts/stamp_tps_app.py          # stamp
    python scripts/stamp_tps_app.py --check  # exit 1 if a stamp is stale (the pre-commit hook runs this)

--check accepts any new VERSION when the shell changed, so a deploy from tps-content, which works
VERSION out its own way, passes too.
"""
import functools
import hashlib
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP = ROOT / 'tennis' / 'app'
# The files sw.js caches, less the icon that lives outside this folder.
SHELL = ['index.html', 'app.js', 'app.css', 'app.webmanifest', 'lib/supabase.js', 'fonts/Vazirmatn-Variable.woff2']


def read(name):
    with open(APP / name, encoding='utf-8', newline='') as f:
        return f.read()


def write(name, text):
    with open(APP / name, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def lf(name, data):
    return data if name.endswith('.woff2') else data.replace(b'\r\n', b'\n')


def stored(name, text=None):
    """A working-tree file as git stores it: LF line endings, except the binary font."""
    return lf(name, text.encode('utf-8') if text is not None else (APP / name).read_bytes())


@functools.lru_cache(maxsize=None)
def committed(name):
    """The same file as the last commit has it, or None."""
    r = subprocess.run(['git', 'show', 'HEAD:tennis/app/' + name], cwd=ROOT, capture_output=True)
    return lf(name, r.stdout) if r.returncode == 0 else None


def short(data, n):
    return hashlib.sha256(data).hexdigest()[:n]


def version(text):
    m = re.search(r"const VERSION = '([^']*)'", text)
    return m.group(1) if m else None


def shell_changed(index=None):
    """Shell files that differ from the last commit (index.html as given, when given)."""
    return [name for name in SHELL if committed(name) != stored(name, index if name == 'index.html' else None)]


def stamped():
    """index.html and sw.js as they should be, with every stamp current."""
    index = read('index.html')
    for name in ('app.css', 'app.js'):
        index = re.sub(r'(%s\?v=)[0-9a-f]+' % re.escape(name), lambda m: m.group(1) + short(stored(name), 8), index)
    sw = read('sw.js')
    if shell_changed(index):
        shell = b''.join(name.encode() + b'\0' + stored(name, index if name == 'index.html' else None) for name in SHELL)
        sw = re.sub(r"(const VERSION = ')[^']*(')", lambda m: m.group(1) + short(shell, 12) + m.group(2), sw)
    return {'index.html': index, 'sw.js': sw}


def problems():
    found = []
    index = read('index.html')
    for name in ('app.css', 'app.js'):
        m = re.search(r'%s\?v=([0-9a-f]+)' % re.escape(name), index)
        want = short(stored(name), 8)
        if not m or m.group(1) != want:
            found.append('index.html loads %s?v=%s but the file hashes to %s' % (name, m.group(1) if m else '(none)', want))
    changed, old_sw = shell_changed(), committed('sw.js')
    if changed and old_sw is not None and version(read('sw.js')) == version(old_sw.decode('utf-8')):
        found.append('sw.js VERSION is unchanged but %s changed' % ', '.join(changed))
    return found


def main():
    if '--check' in sys.argv[1:]:
        found = problems()
        for p in found:
            print('tennis/app: ' + p)
        if found:
            print('Run: python scripts/stamp_tps_app.py')
            return 1
        print('tennis/app: cache stamps current.')
        return 0
    stale = {name: text for name, text in stamped().items() if text != read(name)}
    for name, text in stale.items():
        write(name, text)
    print('tennis/app: ' + ('stamped ' + ', '.join(stale) if stale else 'stamps already current.'))
    return 0


if __name__ == '__main__':
    sys.exit(main())
