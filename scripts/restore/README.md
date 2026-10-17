# Restore: bringing the database back (TOOLS-4, 2026-10-11)

Until now the weekly backup (coach.html → Athletes → ⚙ Tools → Backup) was a file with no way back: it held rows, not the structure they sit in, and nobody had
ever put one back. This folder is the way back, and it has been **rehearsed**: `rehearse.mjs` builds the database from the snapshot on a throwaway PostgreSQL,
fills it with made-up people, erases three of them with the real `coach_erase_person()`, restores an older backup into a fresh database, and compares every
table with the original (49 checks, `node scripts/restore/rehearse.mjs`).

**Not yet proven:** the snapshot has not been run on a real, fresh Supabase project (the rehearsal's PostgreSQL stands in for Supabase's `auth` schema and
roles). The first time it meets the real thing should not be a disaster: see *A dry run on a real project* below.

## When you need this

The Supabase project is deleted, paused for good, corrupted, or a change broke it past repair, and you have a backup file. If only some rows are wrong, do
not restore: use the dashboard's History / Undo, `program_versions`, `coaching_log_versions` and `spine_versions` first.

## What is in a backup, and what is not

| In `aa-backup-<date>.json` | Not in it (and what you do about it) |
|---|---|
| The rows of the 40 tables in `BACKUP_TABLES` (coach.html): programmes, versions, logs, sessions, habits, Library, the Spine, the course and testing content, the testing app's players and results, the receipts of erasures | **Logins and passwords** (the `auth` schema): re-created from the dashboard, step 5 |
| | **The structure** (tables, rules, functions, who may do what): `supabase/schema_snapshot.sql` |
| | **Edge Functions**: `supabase/functions/`, deployed again, step 4 |
| | **Supabase settings** (sign-up off, and so on): step 3 |
| | `assess_publish_keys`, `tps_publish_keys` (hashes of revoked keys): not needed |
| | The `backup` schema (one-off rollback copies from 2026-10-09): not part of the product |
| | First passwords that were not yet sent (blanked on purpose): a new login makes a new one |

Two things the backup alone cannot tell you, which this procedure handles:

* **Someone you erased must stay erased.** An old backup still holds them. `coach_erase_person()` leaves a receipt in `erasure_log` (a hash, no personal data),
  and the generator leaves out everyone a receipt names. **Always give it your newest backup as `--receipts`**, even if you restore an older one: a receipt
  you did not give it is an erased person who comes back.
* **A login's rows follow the login.** The testing app's players, notes and results, and the private notes about buyers, are tied to a sign-in account,
  and a sign-in account cannot be restored. They wait (phase 2) until the login is re-created with the same username.

## The procedure (about an hour)

You need: the newest **complete** backup (`aa-backup-<date>.json`, not `INCOMPLETE`), the newest backup of any kind for the receipts, this repo, Python, and
either the Supabase SQL editor or `psql`.

1. **A new Supabase project** (or wipe the old one, if it still exists and is the same project). Note its URL, its publishable key and its service-role key
   (Project Settings → API).
2. **The structure.** Open `supabase/schema_snapshot.sql`, paste it into the SQL editor and run it. It creates everything and **fails on a project that
   already has these tables, on purpose**. It ends without an error. (Its header says which Postgres it was read from and when.)
   Then run `grant update (gap_handled_at) on public.chat_messages to authenticated;` (stage68): the snapshot reads only table grants,
   so this one column grant is not in it, and without it the website chatbot's "Added to facts" button in coach.html is refused.
3. **Supabase settings.** Authentication → Sign In / Providers → **User Signups: off** (the coach check trusts the email of the sign-in alone; CLAUDE.md,
   *The coach's address is typed once per layer*). Authentication → Users → **Add user**: your own coach address, a password, *Auto Confirm User* ticked.
4. **Edge Functions.** Deploy `athlete-login`, `assess-login` and `tps-login` from `supabase/functions/`, each with `verify_jwt` **false**
   (`supabase/functions/README.md`). They need no secrets of their own. Also `site-chat` (the website chatbot, both of its files), which needs the
   secret `ANTHROPIC_API_KEY`.
5. **The rows.** Make the files from the backup:

   ```bash
   python scripts/restore/restore_backup.py "<newest complete backup>.json" --receipts "<newest backup>.json" --out restore-out
   ```

   Read `restore-out/restore-report.txt`. It names who was left out and why, which logins to re-create, and refuses a backup that is incomplete or
   does not fit the snapshot. Then run, in name order, `10-*.sql` and `19-sequences.sql` (every file is safe to run twice):

   ```bash
   cat restore-out/10-*.sql restore-out/19-sequences.sql | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
   ```

   (`DATABASE_URL` is the *Session pooler* string under Connect → Direct, with the database password from Project Settings → Database. Without `psql`, paste
   the files into the SQL editor one at a time; a few dozen files, none over about 400 KB.)

6. **Point the site and the apps at the new project**, if it is a new one: the old project's address and publishable key are typed into these files
   (`git grep -l bvipfipbdcyqnbczjmaq`): `coach.html`, `program.html`, `habits.html`, `call-log.html`, `form.html`, `form-fa.html`, `etminan*.html`,
   `uts-padel.html`, `reach/index.html`, `tennis/app/app.js`, `tennis-testing/app/app.js`, and the test helpers in `scripts/headless/`. Change them together, raise
   `sw.js`'s cache name (it serves the whole site from cache), `python scripts/stamp_tps_app.py` for the course app, commit, push, hard-refresh.
7. **Check.** Run `restore-out/90-check.sql`. Every table reads `ok`, except the login tables (re-made by hand) and the four tables that wait for logins.
8. **Re-create the logins**, from the dashboard of the new project:
   * Athletes: ⚙ Tools → **Create missing logins** (or an athlete's File → Create login). New passwords appear under *Logins to send*.
   * Course and Testing app tabs: **New login** with **the same username** as before (the report lists them; a revoked one is listed apart, restore it only if
     you want it back).
9. **Run `restore-out/20-after-logins.sql`.** It matches each old login to the new one by username and puts the players, notes, results and private notes back.
   It prints which logins have no new one yet; create them and run it again. Then `90-check.sql` again: every table reads `ok`.
10. **Send the new passwords** (WhatsApp, from *Logins to send*). Everyone signs in again; their programmes, history and records are already there.
11. **Back up again at once** from the new project, and keep the old file for the 12 weeks the privacy notice promises (CLAUDE.md, *There are NO automatic backups*).

Flags of `restore_backup.py`: `--keep <id or username>` restores someone a receipt matches (an id used again by a new person); `--allow-incomplete` accepts a
backup marked INCOMPLETE (a database with holes); `--drop-unknown-columns` restores a backup that has columns the snapshot does not; `--chunk-bytes` cuts the
files smaller or larger.

## Keeping the snapshot current

The snapshot is the live project's structure on the day it was made (the header says which). **After a stage file is applied to the live project, make the
snapshot again, in the same commit.** Pre-commit warns (guard 17) when a `supabase/stage*.sql` is staged without it. Three commands, all from a Claude session
with the Supabase tool:

1. Run `scripts/restore/catalog.sql` on the project (`execute_sql`). The answer is saved to a file; its path is in the tool's reply.
2. `python scripts/restore/make_schema_snapshot.py "<that file>"` writes `supabase/schema_snapshot.sql`. It refuses a kind of object it has never seen (a view,
   a custom type) instead of leaving it out.
3. `PGLITE=... node scripts/restore/rehearse.mjs` (below). It also checks that the snapshot reproduces itself.

A **new table** goes into coach.html's `BACKUP_TABLES` the same day; `scripts/test_restore_backup.py` (pre-commit) fails when the list and the snapshot disagree.
**Career Mode** (stage66): `restore_backup.py` puts `career_rules` back after every other table, so its triggers do nothing until every row is back and the
facts come back exactly as they were backed up. After restoring a backup older than stage66, seed it (`python scripts/career_seed.py`, `career/README.md`).
If a backup holds a table or column the snapshot does not have, `restore_backup.py` stops and says the snapshot is older than the backup: apply the later
`supabase/stage*.sql` files to the new database, or regenerate the snapshot from a project that still has the change.

## The rehearsal

```bash
npm install @electric-sql/pglite --prefix "$TEMP/pglite"
PGLITE="$TEMP/pglite/node_modules/@electric-sql/pglite" node scripts/restore/rehearse.mjs
```

PGlite is PostgreSQL compiled to WebAssembly (about 25 MB). It is **not** a dependency of the repo: install it in a scratch folder, delete the folder after. Nothing
is written outside the system's temp folder, no real project is touched, and every row is made up (`seed_made_up.sql`). What it checks, in order:

1. the snapshot builds 46 tables, reproduces itself when read back, and `BACKUP_TABLES` is exactly its tables;
2. a backup taken the dashboard's way (same table list, first passwords blanked);
3. three erasures with the real `coach_erase_person()` (an athlete, a testing buyer, a course buyer), then a newer backup holding their receipts;
4. the old backup restored with those receipts into a fresh database: nobody erased comes back, in any of the 21 tables with an `athlete_id`; a link to them is
   cleared and the row stays; their application form is left out; a note older than the table keeps is pruned by the table itself;
5. every file run twice changes nothing; every id counter ends past the biggest id;
6. the logins come back in two steps and the rows that wait for them follow;
7. **every table of the restored database equals the same table of the original, row by row** (logins compared by name), also when the restore is cut into
   many small pieces;
8. an id that was erased and used again is left out unless `--keep` says otherwise; without `--receipts` the report warns loudly;
9. files that must be refused (incomplete, unknown table, unknown column, a "newer" backup with no receipts).

`scripts/test_restore_backup.py` is the part of this that needs no database; pre-commit runs it. A change to `restore_backup.py` that the tests do not catch
should get a test: both were mutation-tested (eight deliberate breakages, each caught) on 2026-10-11.

## A dry run on a real project (not done yet)

The one thing the rehearsal cannot show is Supabase itself. A free second project is enough: run step 2, step 5 with a recent backup, `90-check.sql`, then
delete the project. It touches nothing live. The things to watch are the ones PGlite stands in for: the `auth` schema (`stand_in_supabase.sql`), the roles
`anon`, `authenticated` and `service_role`, `alter default privileges`, the trigger on `auth.users`, and the extensions (`pgcrypto`, `uuid-ossp`, `supabase_vault`
exist on every project).

## Files

| File | What it is |
|---|---|
| `catalog.sql` | One read-only query: the whole `public` schema as a JSON document (tables, columns, constraints, indexes, policies, triggers, functions, grants). Run on the live project. |
| `make_schema_snapshot.py` | That document → `supabase/schema_snapshot.sql`. |
| `restore_backup.py` | A backup → the SQL files of step 5, the report and the check query. Never connects to a database. |
| `rehearse.mjs`, `seed_made_up.sql`, `stand_in_supabase.sql`, `lib.mjs` | The rehearsal on PGlite, its made-up rows, a stand-in for Supabase's `auth` schema and roles, and the plumbing. |
| `../test_restore_backup.py` | The database-free tests (pre-commit guard 17). |
