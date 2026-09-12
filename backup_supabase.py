#!/usr/bin/env python3
"""
backup_supabase.py
==================
Takes a dated, offline copy of the whole coaching database and writes it to a
folder on this PC. Same idea as sync_notion.py, pointed the other way: that one
pulls Notion INTO the site, this one pulls the server OUT to somewhere safe.

WHY THIS EXISTS
---------------
The Supabase project is on the FREE plan, which takes NO automatic backups.
Session logs, athlete progress, messages, habit history, contacts and the
coaching logs exist in exactly one place. Programmes at least also sit in a
local data/ folder; the training record does not. If the project were deleted
tomorrow, whatever this script last wrote is what you would have.

WHAT YOU GET
------------
    <backup root>/2026-09-07/
        MANIFEST.txt              what was captured, row counts, when
        tables/<table>.json       every row of every table, raw
        programs/<athlete>.json   each programme, readable, same shape as the
                                  old data/<id>.json files
        coaching-logs/<athlete>.md  each coaching log, readable

The programmes and logs are written out as real files on purpose. A single blob
is fine for restoring a database; it is useless when you just want to read what
someone's programme said last March.

WHERE IT WRITES
---------------
Outside the repo by default -- ~/AA-Backups -- so it can never be committed by
accident. Override with --out. If you do point it inside the repo, .gitignore
already covers AA-Backups/, but outside is safer.

USAGE
-----
1.  One-time setup:
       a. Open https://supabase.com/dashboard/project/bvipfipbdcyqnbczjmaq/settings/api-keys
       b. Reveal the "service_role" key and copy it.
       c. Either set the env var SUPABASE_SERVICE_KEY, or create a file
          `.supabase_key` in this folder containing only the key text.

    That key bypasses every row-level policy -- it is exactly what a backup
    needs, and exactly what must never be shared or committed. `.supabase_key`
    is gitignored, the same way `.notion_token` is.

2.  Whenever you want a backup (weekly is a sensible habit):
       python backup_supabase.py

3.  Keep at least one copy somewhere that is not this computer.

OPTIONS
-------
    --out DIR     where to write (default: ~/AA-Backups)
    --check       connect, count rows, write nothing
"""

import argparse
import datetime
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

# ----------------------------------------------------------------------------
PROJECT_URL = "https://bvipfipbdcyqnbczjmaq.supabase.co"
KEY_FILE = Path(__file__).parent / ".supabase_key"
DEFAULT_OUT = Path.home() / "AA-Backups"
PAGE = 1000                      # PostgREST caps a plain select; page past it

# Every table in the public schema. If you add one, add it here -- a backup that
# silently misses a table is worse than no backup, because you only find out
# when you need it.
TABLES = [
    "programs", "program_versions", "coaching_logs", "athlete_identities",
    "athlete_progress", "session_history", "messages", "hab_notes",
    "hab_contacts", "hab_titles", "hab_intake", "leaderboard_optin",
    "seasons", "xp_rules", "call_logs", "cycle_reports", "hab_season_results",
    "athlete_keys", "library", "library_categories", "library_sessions",
]


def get_key():
    key = os.environ.get("SUPABASE_SERVICE_KEY", "").strip()
    if key:
        return key
    if KEY_FILE.exists():
        return KEY_FILE.read_text(encoding="utf-8").strip()
    # ASCII only, deliberately. This repo lives under a path with Cyrillic in it
    # ("Documents" in Russian), and a Windows console running cp1252 mangles both
    # the path and any smart punctuation - which turned the one message a stuck
    # user actually reads into line noise.
    sys.exit(
        "No Supabase key found - nothing was backed up.\n\n"
        "EASIEST FIX: you do not need this script at all. Open coach.html,\n"
        "go to the Athletes tab, and press the Backup button (down-arrow icon).\n"
        "It runs in your signed-in session, needs no key at all, and downloads\n"
        "the same data as one JSON file. Do that now; set this script up later\n"
        "only if you want the backup scripted.\n\n"
        "TO USE THIS SCRIPT: put the service_role key in a file named\n"
        "  .supabase_key\n"
        "(no extension, nothing else in it) in the same folder as this script -\n"
        "the one that also holds coach.html. Get the key from the Supabase\n"
        "dashboard: Project Settings -> API keys -> service_role -> Reveal.\n"
        "It is gitignored. It bypasses every row-level policy, so it must never\n"
        "leave this machine. Or set the SUPABASE_SERVICE_KEY env var instead.\n"
    )


def fetch_table(table, key):
    """Every row, paged. Returns (rows, error_or_None)."""
    rows, offset = [], 0
    while True:
        qs = urllib.parse.urlencode({"select": "*"})
        req = urllib.request.Request(f"{PROJECT_URL}/rest/v1/{table}?{qs}")
        req.add_header("apikey", key)
        req.add_header("Authorization", f"Bearer {key}")
        # PostgREST pages by Range, not by limit/offset, when you want a count back.
        req.add_header("Range", f"{offset}-{offset + PAGE - 1}")
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                batch = json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:200]
            return rows, f"HTTP {e.code}: {body}"
        except Exception as e:                                  # noqa: BLE001
            return rows, str(e)
        rows.extend(batch)
        if len(batch) < PAGE:
            return rows, None
        offset += PAGE


def safe_name(s):
    """Filename-safe athlete id. Ids are already [A-Za-z0-9_], this is a belt."""
    return "".join(c for c in str(s) if c.isalnum() or c in "._-") or "unnamed"


def main():
    ap = argparse.ArgumentParser(description="Back up the coaching database to this PC.")
    ap.add_argument("--out", default=str(DEFAULT_OUT), help="backup root (default: ~/AA-Backups)")
    ap.add_argument("--check", action="store_true", help="connect and count rows, write nothing")
    args = ap.parse_args()

    key = get_key()
    stamp = datetime.datetime.now().strftime("%Y-%m-%d")
    root = Path(args.out).expanduser() / stamp

    print(f"Backing up {PROJECT_URL}")
    print(f"  -> {root}\n" if not args.check else "  (check only, nothing will be written)\n")

    data, problems, total = {}, [], 0
    for t in TABLES:
        rows, err = fetch_table(t, key)
        if err:
            problems.append(f"{t}: {err}")
            print(f"  {t:22} FAILED  {err}")
            continue
        data[t] = rows
        total += len(rows)
        print(f"  {t:22} {len(rows):>6} rows")

    if problems and not data:
        sys.exit("\nNothing could be read. Is the key correct, and is it the service_role key?")

    if args.check:
        print(f"\n{total} rows across {len(data)} tables. Nothing written (--check).")
        if problems:
            print("Problems:\n  " + "\n  ".join(problems))
        return

    (root / "tables").mkdir(parents=True, exist_ok=True)
    for t, rows in data.items():
        (root / "tables" / f"{t}.json").write_text(
            json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

    # Readable copies of the two things you would actually want to open by hand.
    n_prog = 0
    if data.get("programs"):
        (root / "programs").mkdir(exist_ok=True)
        for row in data["programs"]:
            (root / "programs" / f"{safe_name(row.get('athlete_id'))}.json").write_text(
                json.dumps(row.get("data"), indent=2, ensure_ascii=False), encoding="utf-8")
            n_prog += 1

    n_logs = 0
    if data.get("coaching_logs"):
        (root / "coaching-logs").mkdir(exist_ok=True)
        for row in data["coaching_logs"]:
            (root / "coaching-logs" / f"{safe_name(row.get('athlete_id'))}.md").write_text(
                row.get("body") or "", encoding="utf-8")
            n_logs += 1

    lines = [
        "AA coaching database backup",
        f"taken     : {datetime.datetime.now().isoformat(timespec='seconds')}",
        f"project   : {PROJECT_URL}",
        f"rows      : {total} across {len(data)} tables",
        f"programmes: {n_prog} written to programs/",
        f"logs      : {n_logs} written to coaching-logs/",
        "",
        "Row counts",
        "----------",
    ]
    lines += [f"  {t:22} {len(r):>6}" for t, r in sorted(data.items())]
    if problems:
        lines += ["", "COULD NOT READ", "--------------"] + [f"  {p}" for p in problems]
    lines += [
        "",
        "To restore: import each tables/<name>.json back into the table of the same",
        "name. programs/ and coaching-logs/ are readable copies of the same data.",
        "",
    ]
    (root / "MANIFEST.txt").write_text("\n".join(lines), encoding="utf-8")

    print(f"\nDone. {total} rows, {n_prog} programmes, {n_logs} coaching logs.")
    print(f"  {root}")
    if problems:
        print("\n  WARNING - some tables could not be read:")
        for p in problems:
            print(f"    {p}")
    print("\n  Keep a copy somewhere that is not this computer.")


if __name__ == "__main__":
    main()
