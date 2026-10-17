#!/usr/bin/env python3
"""Career Mode's rulebook and catalogue as database rows: python scripts/career_seed.py [--out FILE | --json] [--dry-run]

The numbers, badges, achievements, titles, missions, quests and WhatsApp lines live in career/*.toml so Amir can read
and change them (GAME-10). The server scores from two tables made from them (supabase/stage66_career_mode.sql):

  public.career_rules      one row per rulebook version: rulebook.toml, as data
  public.career_catalogue  one row per badge, achievement, title, skin, mission, quest, size, message, tool and setting

This script reads the seven files, refuses them if scripts/check_career.py finds an error, and prints ONE SQL statement:

  select public.career_seed(<version>, '<rulebook>'::jsonb, '<catalogue>'::jsonb, '<sha256 of the files>');

Run that statement on the project (the Supabase tool's execute_sql: it needs the service role, nobody signed in can
call it). career_seed() replaces the row for that version and the whole catalogue, then works every athlete's facts out
again with the new numbers (PROCEDURES.md → P16). An id is never renamed in the files, only its name, so history stays
filed under it. Bump `version` in rulebook.toml when the old rulebook should stay on the server beside the new one.

The switches (rulebook.toml → [switch], stage69): the seed that turns the XP switch on also writes the levels kept and
returns every athlete's line (Proof's level, the career level, the level kept). --dry-run makes the same statement with
p_dry_run => true: the server does all of it, undoes it, and answers the same, so the list can be read first. A seed
that changes nothing but a switch runs no backfill. The server refuses a switch turned back off and a day still to come.

  python scripts/career_seed.py                 # the SQL, to stdout
  python scripts/career_seed.py --out seed.sql  # the SQL, to a file
  python scripts/career_seed.py --json          # the payload as JSON (the rehearsal reads this)
  python scripts/career_seed.py --dry-run       # the same SQL with p_dry_run => true: worked out, then undone

Standard library only. Python 3.11+ (tomllib).
"""
import argparse
import hashlib
import json
import pathlib
import sys
import tomllib

HERE = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import check_career  # noqa: E402  (the checker lives beside this script)

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

# What each file's top-level tables become in career_catalogue.kind.
CATALOGUE = [
    ("badges", "badge", "badge"),
    ("achievements", "achievement", "achievement"),
    ("titles", "title", "title"),
    ("titles", "skin", "skin"),
    ("missions", "mission", "mission"),
    ("quests", "quest", "quest"),
    ("recognition", "size", "size"),
    ("recognition", "message", "message"),
    ("recognition", "tool", "tool"),
]
# recognition.toml's single tables, kept as one 'setting' row each.
SETTINGS = ["courtside", "bell", "feedback"]
DOLLAR = "$career_seed$"


def payload(folder):
    """(version, rules, catalogue, sha) from the folder, or raises SystemExit with the checker's errors."""
    rep, data = check_career.check_folder(folder)
    errors = rep.of("ERROR")
    if errors:
        for _, file, ident, msg in errors:
            print(f"  ERROR {file}" + (f" [{ident}]" if ident else "") + f"  {msg}", file=sys.stderr)
        raise SystemExit(f"career_seed: {len(errors)} error(s) in {folder}: fix them first "
                         f"(python scripts/check_career.py prints the whole report). Nothing was written.")
    digest = hashlib.sha256()
    for stem in check_career.FILES:
        raw = (folder / f"{stem}.toml").read_bytes().replace(b"\r\n", b"\n")
        digest.update(stem.encode() + b"\0" + raw + b"\0")
    rules = data["rulebook"]
    version = rules.get("version")
    if not check_career.is_int(version) or version < 1:
        raise SystemExit(f"career_seed: rulebook.toml needs version = a whole number from 1, found {version!r}")
    rows = []
    for stem, key, kind in CATALOGUE:
        for ident, body in sorted((data[stem].get(key) or {}).items()):
            rows.append({"kind": kind, "id": ident, "body": body})
    rec = data["recognition"]
    for name in SETTINGS:
        if isinstance(rec.get(name), dict):
            rows.append({"kind": "setting", "id": name, "body": rec[name]})
    rows.append({"kind": "setting", "id": "sizes", "body": {"list": rec["sizes"]}})
    for r in rows:
        if not check_career.SNAKE_CASE.match(r["id"]):
            raise SystemExit(f"career_seed: the id {r['kind']}.{r['id']} is not snake_case; the table refuses it")
    return version, rules, rows, digest.hexdigest()


def sql_for(version, rules, rows, sha, dry_run=False):
    rules_json = json.dumps(rules, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    rows_json = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    for text in (rules_json, rows_json):
        if DOLLAR in text:
            raise SystemExit(f"career_seed: the files contain {DOLLAR}, which would end the SQL string early")
    return (f"-- Career Mode seed, made by scripts/career_seed.py from career/*.toml (sha256 {sha}).\n"
            f"select public.career_seed({version},\n  {DOLLAR}{rules_json}{DOLLAR}::jsonb,\n"
            f"  {DOLLAR}{rows_json}{DOLLAR}::jsonb,\n  '{sha}'" + (",\n  p_dry_run => true" if dry_run else "") + ");\n")


def main(argv=None):
    ap = argparse.ArgumentParser(description="Career Mode's toml files as the SQL that seeds career_rules and "
                                             "career_catalogue.")
    ap.add_argument("folder", nargs="?", default=str(check_career.DEFAULT_FOLDER), help="default: career/")
    ap.add_argument("--out", help="write the SQL to this file instead of stdout")
    ap.add_argument("--json", action="store_true", help="print the payload as JSON instead of SQL")
    ap.add_argument("--dry-run", action="store_true", help="the SQL with p_dry_run => true: the server works it all "
                                                           "out (the levels kept at the XP switch included), then undoes it")
    args = ap.parse_args(argv)
    folder = pathlib.Path(args.folder)
    version, rules, rows, sha = payload(folder)
    if args.json:
        text = json.dumps({"version": version, "rules": rules, "catalogue": rows, "sha": sha}, ensure_ascii=False,
                          sort_keys=True, indent=1)
    else:
        text = sql_for(version, rules, rows, sha, dry_run=args.dry_run)
    if args.out:
        pathlib.Path(args.out).write_text(text, encoding="utf-8", newline="\n")
        print(f"career_seed: rulebook version {version}, {len(rows)} catalogue rows, sha256 {sha[:12]}"
              + (" (a dry run)" if args.dry_run else "") + f" -> {args.out}", file=sys.stderr)
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
