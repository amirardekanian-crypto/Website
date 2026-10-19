### The restore path (`scripts/restore/`, 2026-10-11)

The way back from a lost database (audit TOOLS-4), written down in **`scripts/restore/README.md`** (read it first) and rehearsed. The backup file holds rows only; a
restore needs the structure (`supabase/schema_snapshot.sql`), the rows (`aa-backup-<date>.json`), and the step between them.
- `catalog.sql` + `make_schema_snapshot.py` — read the live project's `public` schema as one JSON document, write it as the snapshot. The writer refuses an object kind it has never seen (a view, a custom type) rather than leave it out.
- `restore_backup.py <backup> --receipts <newest backup> --out <folder>` — writes the SQL files (`10-*` one per table, parents first; `19-sequences`; `20-after-logins`; `90-check`) and `restore-report.txt`. It never connects to a database. Leaves out everyone a receipt in `erasure_log` names (and their login, rows, links and application forms), refuses an incomplete backup, an unknown table or an unknown column, and keeps the rows of a login waiting until the login is re-created (matched by username).
- `rehearse.mjs` + `seed_made_up.sql` + `stand_in_supabase.sql` + `lib.mjs` — the full rehearsal on PGlite (PostgreSQL in WebAssembly, installed in a scratch folder, never in the repo): 49 checks, the real `coach_erase_person()`, every table of the restored database compared with the original.
- `scripts/test_restore_backup.py` — the part that needs no database (52 checks). **Pre-commit guard 17** runs it when the snapshot, `scripts/restore/`, the test or coach.html is staged, and prints a WARNING when a `supabase/stage*.sql` is staged without the snapshot. It also fails when coach.html's `BACKUP_TABLES` and the snapshot's tables disagree.
- Both were mutation-tested on 2026-10-11: eight deliberate breakages of the generator (a fixed dollar-quote tag, counters not reset, receipts ignored, a login id not swapped, links not cleared …), each caught by both.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
