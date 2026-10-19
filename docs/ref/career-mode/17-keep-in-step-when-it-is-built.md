## Keep in step when it is built

- Anything in `habits.html` keeps Proof's six-file rule (`HABITS.md`, `XP_SYSTEM.md`, `QUESTS.md`, `renderManual()`,
  `privacy.html`, `tourSteps()`), in the same PR.
- A new table goes into `BACKUP_TABLES`, the schema snapshot and `coach_erase_person()` the same day.
- A rule a phone previews goes into `scripts/check_twins.js` the same day.
- `privacy.html` changes with the Bell, the share card and Amir's Pick (what is shown, to whom, on what basis).
- The in-app guides name real controls: `tourSteps()` in Proof, `APP_GUIDE` and `ONB_TEXT` in the training app.
- `python scripts/check_career.py` passes after any edit to this folder, and a changed file is re-seeded on the server
  (`python scripts/career_seed.py`, then its one statement through the Supabase tool).
- **Until the catalogue switch, Proof's habit numbers lived twice:** the `xp_rules` row and `career/*.toml` (`[habits]`,
  the tiers, the `origin = "proof"` milestones and quests). `check_career.py` held them equal to
  `supabase/xp_rules_snapshot.json`, in pre-commit (rule 14). **Since the switch (2026-10-18) that rule no longer holds them equal**, but the copies are still there:
  AA Proof's phone previews a tick with its own constants (P13) and the `xp_rules` row is what `career_compare()` still reads, so a change to a habit number is a change to `rulebook.toml`, `habits.html` and the row together, and under D20 it applies forward only.
- **The training app's maths copied into SQL** (stage66): `career_entry_sets()` is `cycleBestSet()`, `histBestSet()`,
  `estimateOneRM()` and `parseLoggedKg()`; `career_win_gain()` is `winText()`'s verdict; `career_weeks()` is
  `cycleWeekInfo()`'s weeks; `career_habit_days()` is `hab_bonus_xp()`'s day gate. A change to the original changes the copy
  the same day (`career_compare()` proves the day gate on every real log).
- **And the other way round:** Home's Hold Serve row counts the weeks held in a row with `holdCount()`, program.html's copy of
  `get_profile()`'s loop. `scripts/check_twins.js` holds it to `scripts/career/hold_cases.json` and `scripts/career/rehearse.mjs` holds
  `get_profile()` to it on every athlete it builds: a change to one is a change to both.
- **The phones' copies of phase 2's rules** (the career's curve, the WORKOUT habit at 0 a day, a session's full log and check-in)
  are held to the server's own answers in `scripts/career/xp_cases.json` by `scripts/check_twins.js` §9, and the answers to the
  server by `scripts/career/rehearse_switch.mjs` (rewrite them with `--write-cases` after a deliberate change, on both sides).
- **Phase 3 (the catalogue switch):** `career_awards` and `career_recognition` are in `coach_erase_person()` (stage70's patch), `BACKUP_TABLES` and
  the schema snapshot (the coach.html lines, the restore script and the snapshot are in the phase 3 commit, rollout step 2); **no trigger evaluates on a DELETE** (an erasure must not mint);
  `career_evaluate()` stays inside its budget (on the longest log a Proof save costs 42 to 58 ms more, the spread being the PC's load, and a session save about 2 ms more under stage70 alone and 51 ms more with stage73 on top, because the capped counts of Century and Same Effort call `career_facts_paid()`; rehearsed on 2026-10-18, against a budget of 300); a badge's tiers are
  **append-only** (the award id is the tier's place in the list: `career/tiers.lock.json`, rule 21 of the checker, `career_seed.py --write-lock`).
- **The phones' copies of phase 3's rules** (the award id, the phone's scoring of the phone-decidable entries, the finish card's moves, Home's pending session (`careerRecPaid()`: a plan day done again in its week adds none, GAME-4), the five events'
  goals) are held to the server's own answers in `scripts/career/reward_cases.json` by `scripts/check_twins.js` §10, and the answers to the server by
  `scripts/career/rehearse_catalogue.mjs` (`--write-cases` after a deliberate change, on both sides).
- **The profile is two reads, and the two must agree** (phase 3 fix round, 2026-10-18). `get_profile()` is the core: `owned` (a **list** of award ids, sorted byte
  by byte, no days; it grows by about 25 bytes an award and is the only part that does), `title_worn`, `slam`, `ladder`, `near`, `moments`,
  `numbers.four` and `numbers.free`, `catalogue_version`; its `badges`, `achievements` and `recent` stay empty placeholders and it carries no `titles`
  list (`titles_owned` is phase 2's). `get_awards(p_athlete_id)` is the shelf (`athlete_id`, `catalogue`, `catalogue_version`, `badges` with `days`,
  `achievements`, `titles`, `recent`); catalogue off: the same keys, empty, `catalogue` null. It works nothing out and writes nothing, and has
  `get_profile()`'s access rule. A reader of `owned` uses a list, never `Object.keys()` or `owned[id]`. `rehearse_catalogue.mjs` proves every owned
  award is on the shelf with the day `career_awards` has, and that the core stays under 14 KB on the longest real career and on a simulated 200-award one.
- **AA Proof keeps the last shelf on the phone** (`<id>_hab_shelf`, `{ v, n, at, a }`: a cache, never synced, never in `CFG`, never written in the preview or
  the demo, never read in the embed). Progress shows it with no signal; it is read again when the catalogue version or the number of awards owned
  differs from what it was read under (`HABITS.md` → *Two reads: the core and the shelf*). The training app never calls `get_awards()`.
- **The score cache, `career_scores`,** is in `coach_erase_person()` (stage69's patch) and is in `BACKUP_TABLES` and the schema snapshot
  (`test_restore_backup.py` needs both at once). It holds no
  source: a stale or missing row is worked out again from the facts (`career_stamp()` says when).

---
*One section of the reference. The index is [`career/CAREER_MODE.md`](../../../career/CAREER_MODE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
