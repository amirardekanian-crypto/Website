"""List, and with --delete remove, weekly database backups older than 12 weeks.

coach.html -> Athletes -> Backup downloads aa-backup-YYYY-MM-DD.json. The privacy notice promises that a deleted
record leaves the backups within about three months, so keep only the backups from the last 12 weeks
(Amir, 2026-10-04: "rolling") and delete the rest, on this PC AND on the off-machine copy.

  python scripts/prune_backups.py <folder>             show what is older than 12 weeks (touches nothing)
  python scripts/prune_backups.py <folder> --delete    delete those files
  python scripts/prune_backups.py <folder> --days 56   use a different number of days (default 84)

Only files named aa-backup-YYYY-MM-DD*.json directly inside <folder> are looked at; nothing else is ever touched.
The newest backup is never deleted, so a restore point always remains: if it is older than the limit, the script
says so and you should take a new backup.
"""
import argparse
import datetime
import os
import re
import sys

PATTERN = re.compile(r'^aa-backup-(\d{4}-\d{2}-\d{2}).*\.json$', re.IGNORECASE)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('folder', help='the folder the backups are saved in (run it again on the off-machine copy)')
    ap.add_argument('--days', type=int, default=84, help='keep backups from the last this-many days (default 84 = 12 weeks)')
    ap.add_argument('--delete', action='store_true', help='really delete; without it nothing is touched')
    args = ap.parse_args()

    if args.days < 7:
        sys.exit('--days must be at least 7')
    if not os.path.isdir(args.folder):
        sys.exit('not a folder: ' + args.folder)

    rows = []
    for name in sorted(os.listdir(args.folder)):
        m = PATTERN.match(name)
        if not m or not os.path.isfile(os.path.join(args.folder, name)):
            continue
        try:
            rows.append((datetime.date.fromisoformat(m.group(1)), name))
        except ValueError:
            continue
    if not rows:
        print('no aa-backup-*.json files in ' + args.folder)
        return

    rows.sort(reverse=True)
    today = datetime.date.today()
    cutoff = today - datetime.timedelta(days=args.days)
    newest = rows[0][0]
    protected = {n for d, n in rows if d == newest}
    old = [(d, n) for d, n in rows if d < cutoff]
    drop = [(d, n) for d, n in old if n not in protected]

    print('%d backup file(s) in %s, newest %s (%d days old)' % (len(rows), args.folder, newest, (today - newest).days))
    if newest < cutoff:
        print('WARNING: even the newest backup is older than %d days. It is kept so you still have a restore point.' % args.days)
        print('         Take a new backup now (coach.html > Athletes > Backup), then run this again.')
    if not drop:
        print('nothing is older than %d days (%s)' % (args.days, cutoff))
        return
    print('older than %d days (%s), %d file(s):' % (args.days, cutoff, len(drop)))
    for d, n in drop:
        print('  %s  (%d days old)' % (n, (today - d).days))
    if not args.delete:
        print('\nNothing was deleted. Run again with --delete to remove these.')
        return
    for d, n in drop:
        os.remove(os.path.join(args.folder, n))
    print('\nDeleted %d file(s). Run this on the off-machine copy too.' % len(drop))


if __name__ == '__main__':
    main()
