# Rules — the server is the only copy that counts

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

## ⚠️ THE BIG ONE: programmes live on the SERVER now, not in files (2026-09-07)

`data/*.json` is **deleted, gitignored and 404 on the live site.** Every programme is a
row in `public.programs`, and `program.html`, `habits.html` and `coach.html` all read it
through `get_program()`, which checks identity server-side. The 46 files that used to be
served publicly are kept **only** as a local, gitignored copy in `data/` on Amir's PC,
as a rainy-day fallback. Never commit one; the `.gitignore` entry explains why.

**Athletes sign in with a username and password.** Every `?client=&key=` link is dead —
`public.athlete_keys` is empty and the RPCs fail closed. Accounts are created from
coach.html (Athletes → an athlete → Create login), keyed on an internal address
`athlete.<id>@amirardekani.com` that never receives mail. The password is generated, or typed
there (8-72 printable English characters, no spaces, not the username: `typedPassword()` in
coach.html and `checkTyped()` in each login function apply the same rule, so change both). **The stored
first password is cleared by the database as soon as the person signs in with it** (stage51, 2026-10-11, a
trigger on `auth.users.last_sign_in_at`; Mark sent clears it too): it exists only to be copied into the
WhatsApp message. Sign-in
folds Persian and Arabic-Indic digits to 0-9 (`foldDigits()` in program.html, habits.html and the two
tennis apps, the same fold as `typedPassword()`): the username always, the password only on a retry
after the typed one fails (2026-10-10; a Farsi keyboard failed every sign-in before). The
Course and Testing app logins (coach.html → Buyers) work the same way. `demo` is named explicitly as
public inside `get_program()` so the marketing link still opens.

**The coaching pipeline writes to the server.** It may still produce a local
`data/<id>.json` as a working artifact, but that file is never published as a file: a new cycle
goes up in ONE call to **`public.publish_cycle()`** (`supabase/stage38_publish_cycle.sql`, 2026-09-26:
archive, cycle advance, workouts, notes, roadmap patch and the coaching-log splice, all or nothing,
returning the fingerprint); a NEW athlete's first programme goes up the same way (`p_new_cycle => false`). The dashboard has no
upload button: **↑ Publish programme file** was removed with its function on 2026-10-11 (Amir: *"i never use it"*).
Execute is revoked from anon and authenticated. Day-to-day changes (sets, reps, RPE,
tempo, rest, the coach's note) are made in the dashboard's inline editor, which writes
straight to `programs` and keeps the previous version in `program_versions`.

**✅ Every programme write ends the same way** (Amir, 2026-09-24): `/program-assemble`, `/program-edit`
and `/workout` are not finished until (1) Spine upkeep has run (`/spine` → Upkeep: a full entry for
every exercise, `exId` on every card, links both ways, body parts and the count filled, and the
body-map `muscles` on any entry whose count is `{}` (stage42); CUE-4),
(2) every exercise carries qualities from the ten only (CUE-3), (3) the Quality check is reported
(PRC-24), (4) the Becauses are fresh (COM-4: 5–10 on a new cycle; on an edit, only the exercises it
changes), and (5) the handoff has one `SPINE …` / `QUALITY …` block (PRC-12). Never approve anything
without Amir's word, and never put athlete-specific detail on a Spine entry.

**⛔ Three rules for every programme run** (Amir, 2026-09-25, after a correction went wrong):
- **Never touch the app while writing, correcting or delivering a programme** (PRC-1): no edit to any
  `.html` page or `assets/js/*`; ideas and bugs go in the handoff. The one change outside the
  programme is the library.
- **A newly prescribed exercise goes into the library in full and stays in the programme** (NAM-9,
  CUE-5): every field the other entries carry, links both ways, qualities and a pattern from his lists,
  never a new pill. A variant that changes the exercise is its own entry.
- **A correction changes only what Amir named** (PRC-2); `program_versions` holds what it replaced.

**Coaching logs are on the server too.** `.claude/coaching-log/*.md` were tracked in this
PUBLIC repo — world-readable, despite each opening with "Never published". They now live
in `public.coaching_logs`, coach-only, with no athlete arm at all.

**⚠️ There are NO automatic backups.** The Supabase project is on the free plan. 378
session logs and every progress blob exist in exactly one place. coach.html → ⚙ Tools →
**⤓ Backup** downloads the whole database as one JSON file; do it weekly and keep a copy
off the machine. **Keep only the last 12 weekly files** (`aa-backup-<date>.json`), on this PC
and on the off-machine copy, and delete older ones (Amir, 2026-10-04: "rolling"). The privacy
notice (section 4, line 6 of its short version, and `privacy-fa.html`) promises that a deleted
record leaves the backups within about three months, so a backup kept longer makes it false.
`python scripts/prune_backups.py <folder>` lists what is older (add `--delete` to remove it).
A backup that could not read a table is saved as `aa-backup-INCOMPLETE-<date>.json` (and says `complete: false`
inside): it is NOT a restore point, it does not silence the weekly reminder, and the prune script never counts it
as the newest backup (`scripts/test_prune_backups.py`).
**A table added to the public schema goes into `BACKUP_TABLES` in coach.html the same day**
(`select tablename from pg_tables where schemaname = 'public'`; on 2026-10-05 13 of 35 were missing,
among them the course lessons and the exercise library, which exist nowhere else). A table the coach
cannot read must be fixed in the database first: with RLS and only a member policy it backs up as
silently EMPTY, with no SELECT grant it is listed under "Could NOT read". The testing app's `assess_players`,
`assess_notes` and `assess_results` were that case until stage50 (2026-10-11, Amir's yes): the coach now has a
READ-ONLY policy on each and they are in the backup (`hab_season_results` was fixed in stage46). `buyer_notes` (stage53, the private note
about each buyer) and `erasure_log` (stage54, the receipts of full erasures) are in it too. **Coaching logs keep every earlier text** in `coaching_log_versions` (stage47, 2026-10-10): a
splice or upload that goes wrong can be put back with SQL.
**There is a way back, and it is rehearsed** (audit TOOLS-4, Amir "yes, build and rehearse it", 2026-10-11): `scripts/restore/README.md` is the whole
procedure (a new project, `supabase/schema_snapshot.sql`, `restore_backup.py`, the logins re-created from the dashboard, then the rows that wait for a login).
Rules that keep it true: **(1) the snapshot is the live structure, made again in the same commit as any `supabase/stage*.sql` applied to the project**
(three commands in the README, *Keeping the snapshot current*; pre-commit guard 17 warns when a stage file is staged without it), and `scripts/restore/rehearse.mjs`
is run after (PGlite in a scratch folder: `npm install @electric-sql/pglite --prefix "$TEMP/pglite"`, never in the repo); **(2) a restore is always given the NEWEST
backup as `--receipts`**, or a person erased since comes back (`coach_erase_person()` leaves the receipt, `erasure_log`); **(3) a table that holds a person's data goes
into `BACKUP_TABLES`, the snapshot and the erase function's list the same day** (`scripts/test_restore_backup.py` fails when the first two disagree; a table that hangs
off a login must also be taught to `REMAP` in `restore_backup.py`, which refuses otherwise). Not yet done: one dry run on a real, throwaway Supabase project.
