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

Phase 3 (the catalogue switch, stage70):
  python scripts/career_seed.py --write-lock    # rewrite career/tiers.lock.json from badges.toml (after check_career passes)
  python scripts/career_seed.py --catalogue-steps [--day YYYY-MM-DD] [--out FILE]
                                                # the go-day statements, one per batch of 5 athletes (see below)

Tiers are append-only (check_career rule 21): a badge tier's place in its list is its award's id, so career/tiers.lock.json
holds the metal of every tier of every badge, and the checker refuses a commit that inserts, reorders or removes one. --write-lock
makes the lock again from the files; it runs the checker first, so a change the lock forbids is refused before it is written.
Run it after adding a badge or appending a tier, and commit the file.

--catalogue-steps prints the statements of the go-day (rollout step 4, supabase/stage70_career_rewards.sql), in order:
  1. career_catalogue_before(offset, 5), offsets 0 to 95: each athlete's score under the OLD rules (backup.career_catalogue_before)
  2. career_catalogue_preview(rules, offset, 5): the dry run, with the rulebook's [switch] catalogue set to --day (default today)
  3. (by hand) set [switch] catalogue = "<day>" in rulebook.toml at the SAME version, then run this script for the seed itself
  4. career_rewards_batch(offset, 5, 'baseline'): mints the history, silent, and prints each athlete's line
  5. career_compare(): every row ok
Run one statement per execute_sql call. An answer with no lines means the list ended: stop that step there.

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
SETTINGS = ["courtside", "bell", "feedback", "moments"]
DOLLAR = "$career_seed$"
BATCH = 5                          # athletes per statement: no save waits long on a lock (stage70 §5.4)
OFFSETS = range(0, 100, BATCH)     # 0 to 95: 100 athletes' worth; an empty answer means the list ended


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


def lock_for(folder):
    """The tiers lock as data: {badge id: [metal of tier 1, tier 2, ...]} for every badge, in the file's order."""
    with open(folder / "badges.toml", "rb") as fh:
        badges = tomllib.load(fh).get("badge") or {}
    return {ident: check_career.tier_metals(body) for ident, body in badges.items()}


def write_lock(folder):
    """Rewrite career/tiers.lock.json from the files, after the checker passes (so rule 21 has already refused a tier that
    was inserted, reordered or removed against the OLD lock). The lock only ever grows."""
    payload(folder)    # raises SystemExit with the checker's errors
    path = folder / check_career.LOCK_FILE
    lock = lock_for(folder)
    text = "{\n" + ",\n".join(f" {json.dumps(k)}: {json.dumps(v)}" for k, v in lock.items()) + "\n}\n"   # a line per badge
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"career_seed: wrote {path} ({len(json.loads(text))} badges)", file=sys.stderr)


def catalogue_steps(folder, day):
    """The go-day statements (stage70 §5.4), as text: before, preview, the seed's reminder, baseline, compare."""
    version, rules, rows, sha = payload(folder)
    preview_rules = json.loads(json.dumps(rules))
    preview_rules["switch"]["catalogue"] = day
    rules_json = json.dumps(preview_rules, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    if DOLLAR in rules_json:
        raise SystemExit(f"career_seed: the files contain {DOLLAR}, which would end the SQL string early")
    out = [f"-- Career Mode go-day statements (catalogue switch), rulebook version {version}, switch day {day}.",
           "-- One statement per call. A batch that answers with no lines means the list ended.", ""]
    out.append("-- 1. BEFORE the switch: each athlete's score under the old rules (run with the switch still off).")
    out += [f"select public.career_catalogue_before({o}, {BATCH});" for o in OFFSETS]
    out += ["", f"-- 2. The dry run: the same rulebook with [switch] catalogue = \"{day}\". Worked out, then undone.",
            "--    Read every line: ok must be true (level_after >= level_before); back_pay, proof_carried, proof_sum and season_before/after are there too."]
    out += [f"select public.career_catalogue_preview({DOLLAR}{rules_json}{DOLLAR}::jsonb, {o}, {BATCH});" for o in OFFSETS]
    out += ["", f"-- 3. By hand, on Amir's yes: set catalogue = \"{day}\" in career/rulebook.toml at the SAME version (nothing else changes),",
            "--    run python scripts/career_seed.py and execute its one statement. The seed only flips the switch.", "",
            "-- 4. Straight after the seed: mint the history, silent, and print each athlete's line.",]
    out += [f"select public.career_rewards_batch({o}, {BATCH}, 'baseline');" for o in OFFSETS]
    out += ["", "-- 5. Every row ok:", "select public.career_compare();", ""]
    return "\n".join(out)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Career Mode's toml files as the SQL that seeds career_rules and "
                                             "career_catalogue.")
    ap.add_argument("folder", nargs="?", default=str(check_career.DEFAULT_FOLDER), help="default: career/")
    ap.add_argument("--out", help="write the SQL to this file instead of stdout")
    ap.add_argument("--json", action="store_true", help="print the payload as JSON instead of SQL")
    ap.add_argument("--dry-run", action="store_true", help="the SQL with p_dry_run => true: the server works it all "
                                                           "out (the levels kept at the XP switch included), then undoes it")
    ap.add_argument("--write-lock", action="store_true", help="rewrite career/tiers.lock.json from badges.toml (append-only "
                                                              "tiers, check_career rule 21); runs the checker first")
    ap.add_argument("--catalogue-steps", action="store_true", help="print the go-day statements (batches of 5 athletes, "
                                                                   "offsets 0 to 95) instead of the seed")
    ap.add_argument("--day", help="with --catalogue-steps: the switch day for the dry run (YYYY-MM-DD, default today)")
    args = ap.parse_args(argv)
    folder = pathlib.Path(args.folder)
    if args.write_lock:
        write_lock(folder)
        return 0
    if args.catalogue_steps:
        import datetime
        day = args.day or datetime.date.today().isoformat()
        if check_career.switch_day(day) in (False, None):
            raise SystemExit(f"career_seed: --day must be a day written YYYY-MM-DD, found {day!r}")
        text = catalogue_steps(folder, day)
        if args.out:
            pathlib.Path(args.out).write_text(text, encoding="utf-8", newline="\n")
            print(f"career_seed: go-day statements for {day} -> {args.out}", file=sys.stderr)
        else:
            sys.stdout.write(text)
        return 0
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
