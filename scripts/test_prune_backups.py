"""Tests for scripts/prune_backups.py: python scripts/test_prune_backups.py

The weekly backup (coach.html > Athletes > Backup) is named aa-backup-<date>.json when every table was read and
aa-backup-INCOMPLETE-<date>.json when one was not (audit TOOLS-3, pile B2). An INCOMPLETE file must never count as the
restore point the script protects, must be listed apart, and must leave on the same age rule as the others.
"""
import datetime
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.environ.get('PRUNE_SCRIPT') or os.path.join(HERE, 'prune_backups.py')   # PRUNE_SCRIPT: prove the tests fail on an older copy
TODAY = datetime.date.today()
fails = []


def day(n):
    return (TODAY - datetime.timedelta(days=n)).isoformat()


def check(name, ok, detail=''):
    print(('ok   ' if ok else 'FAIL ') + name + ('' if ok else '   ' + str(detail)[:300]))
    if not ok:
        fails.append(name)


def run(folder, *extra):
    p = subprocess.run([sys.executable, SCRIPT, folder, *extra], capture_output=True, text=True, encoding='utf-8')
    return p.returncode, p.stdout + p.stderr


def make(folder, names):
    for n in names:
        with open(os.path.join(folder, n), 'w') as f:
            f.write('{}')


def left(folder):
    return sorted(os.listdir(folder))


# 1. A mixed folder: recent and old files of both kinds, and files that are not backups at all.
with tempfile.TemporaryDirectory() as d:
    recent, mid, old_ok = 'aa-backup-%s.json' % day(3), 'aa-backup-%s.json' % day(20), 'aa-backup-%s.json' % day(100)
    bad_recent, bad_old = 'aa-backup-INCOMPLETE-%s.json' % day(1), 'aa-backup-INCOMPLETE-%s.json' % day(120)
    others = ['notes.txt', 'aa-backup-draft.json', 'backup-%s.json' % day(200)]
    make(d, [recent, mid, old_ok, bad_recent, bad_old] + others)
    code, out = run(d)
    check('1a: a dry run exits 0 and deletes nothing', code == 0 and len(left(d)) == 8, (code, left(d)))
    check('1b: it counts the complete files apart from the INCOMPLETE ones', '3 complete backup file(s)' in out and '2 INCOMPLETE file(s)' in out, out)
    check('1c: the newest COMPLETE backup is the restore point (3 days), not the newer INCOMPLETE one', 'newest %s (3 days old)' % day(3) in out, out)
    check('1d: it lists both old files, the complete one and the INCOMPLETE one', old_ok in out and bad_old in out, out)
    check('1e: it never lists a recent file or a file that is not a backup', recent not in out.split('older than')[-1] and bad_recent not in out.split('older than')[-1] and 'notes.txt' not in out, out)
    code, out = run(d, '--delete')
    gone = sorted({recent, mid, old_ok, bad_recent, bad_old, *others} - set(left(d)))
    check('1f: --delete removes exactly the two old files', gone == sorted([old_ok, bad_old]), gone)
    check('1g: the INCOMPLETE file from yesterday and everything that is not a backup stay', set(left(d)) == {recent, mid, bad_recent, *others}, left(d))

# 2. The newest file is INCOMPLETE and the only complete one is past the limit: that one must NOT be deleted.
with tempfile.TemporaryDirectory() as d:
    only_ok, bad_new = 'aa-backup-%s.json' % day(100), 'aa-backup-INCOMPLETE-%s.json' % day(1)
    make(d, [only_ok, bad_new])
    code, out = run(d, '--delete')
    check('2a: the only complete backup is kept although it is past the limit (a restore point must remain)', only_ok in left(d), left(d))
    check('2b: it warns that the newest complete backup is old', 'WARNING' in out and 'newest complete backup is older than 84 days' in out, out)
    check('2c: the recent INCOMPLETE file is not what protected it, and is kept', bad_new in left(d), left(d))

# 3. No complete backup at all: say so, and an old INCOMPLETE file still leaves on the age rule.
with tempfile.TemporaryDirectory() as d:
    only_bad_old, only_bad_new = 'aa-backup-INCOMPLETE-%s.json' % day(95), 'aa-backup-INCOMPLETE-%s.json' % day(2)
    make(d, [only_bad_old, only_bad_new])
    code, out = run(d, '--delete')
    check('3a: it warns there is no complete backup', 'WARNING: there is no complete backup' in out, out)
    check('3b: the old INCOMPLETE file is deleted, the recent one kept', left(d) == [only_bad_new], left(d))

# 4. The original behaviour is unchanged for plain files: a newer complete backup replaces an old one, the newest is never deleted.
with tempfile.TemporaryDirectory() as d:
    a, b = 'aa-backup-%s.json' % day(2), 'aa-backup-%s.json' % day(90)
    make(d, [a, b])
    run(d, '--delete')
    check('4a: a plain old backup goes when a newer complete one exists', left(d) == [a], left(d))
with tempfile.TemporaryDirectory() as d:
    c = 'aa-backup-%s.json' % day(300)
    make(d, [c])
    run(d, '--delete')
    check('4b: the newest backup is kept even when it is very old', left(d) == [c], left(d))

print('\n%s' % ('all passed' if not fails else '%d FAILED: %s' % (len(fails), ', '.join(fails))))
sys.exit(1 if fails else 0)
