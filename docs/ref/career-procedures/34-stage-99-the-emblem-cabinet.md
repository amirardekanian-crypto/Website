## Stage 99: the Emblem Cabinet, server side (2026-10-25, WRITTEN AND REHEARSED, NOT APPLIED)

Amir picked direction A of the Emblem Cabinet board and said *"go with your picks"*, then: *"remember if anyone has done the achievements before, it should be
unlocked, their trophies should be already won, but no xp should be given to them. only from now on, the achievements will give xp"* (D21,
`CAREER_MODE.md` → *The decisions* → D21). This is the server half: `supabase/stage99_emblem_cabinet.sql` and rulebook version 11 (33 new achievements). The
contract with the app is `C:\Users\Amir\AA-Career\emblems\CONTRACT.md`. **Nothing here is on the live project.** Amir says "go live"; *To apply* is the order.

- **D21, one guarded change in `career_mint()`** (marked `/* stage99: D21 */`). An achievement whose catalogue body carries `paid_from` is minted with
  **xp = 0 when the day the work was done is before it**: `v_earned < career_day(p_body ->> 'paid_from')`, where `v_earned` is the unclamped day stage95 keeps
  (`career_awards.earned_on`). It is still won: on the shelf, unlocked, dated as D20 dates it (no earlier than the version's start day), `earned_on` the real
  day. On or after `paid_from` it pays the catalogue XP, live or in a back-fill. An entry with no `paid_from` is untouched (old achievements pay as ever).
  `paid_from` is inclusive: **a win done on the seed day, before the seed ran, pays at the back-fill.** If a go-live must move nobody at all, set every
  `paid_from` to the day AFTER the seed (the checker lets it be later than `starts_on`, never earlier).
- **Rulebook version 11** (`starts_on` is a placeholder until go-live): the 33, each `added_in = 11` and `paid_from`. `check_career.py` rule 22: `paid_from` is a
  real day, and an entry added in the version being checked MUST carry one, not before the rulebook's `starts_on` (the seed's back-fill would pay it);
  `added_in` cannot be a future version; `repeats` is a rulebook fact. `career_d20_core()` keeps `paid_from` out of "labels", so a seed of the same version
  that changes one is refused (D20).
- **Three new tests and one wider one** (rule 18 now knows seventeen): `on_dates` (`windows`: month-days, inclusive, every year; Down Under, Red Clay, The Lawns,
  Big Apple, Nowruz, Yalda), `slam_year` (`of`: the ids of on_dates entries; a session in each of their windows in one calendar year; the four dates live once, in the
  toml), `clock` (`finish_before` or `finish_from`, "HH:MM"; Early Bird, Night Owl), and `total` may read a LIST (`reads = ["session_finished", "session_finished_early"]`),
  counted together under the same key as Century (`count:session_finished,session_finished_early`) so the capped kind counts only what `career_facts_paid()` pays (D19):
  a plan day repeated in its week counts once. A session counts by `completed_on` and only as a fact `session_finished` / `session_finished_early`, not voided.
  Checker: `total` may now be `at = 1` (Month One); `best_run` stays 2 or more.
- **The finish time.** The phone sends `p_session.fin`, "HH:MM" local. `session_history.fin` (a nullable text column) keeps the FIRST value (`coalesce(old, new)`);
  anything that is not a time is dropped (the save never fails, an old phone sends none, an old server ignores the key); "7:05" is written "07:05".
  `career_session_want()` puts it in the VALUE of the session fact, so a time that arrives on a later save changes the fact, and a changed fact wakes the achievements
  through the usual partial evaluate. Sessions saved before have none, so nobody is back-filled for Early Bird or Night Owl. A session finished between 00:00 and 03:59
  is "before 07:00" and counts for Early Bird (the contract's wording; no lower bound). Column, not a key in a blob, because nothing else writes it: the log, the
  summary and the check-in are rewritten by every re-save. `coach_erase_person()` and `BACKUP_TABLES` already cover the table; **the schema snapshot is remade after the apply**
  (guard 17 only warns until then).
- **`get_achievements()` gives the cabinet** (all optional, an old app still works): `done_on` (the day the work was done), `xp_won` (what the award was minted with,
  0 for a back-fill), `times` (only 2 or more, for the entries that name a fact in `repeats`: Held `week_held`, Bounce Back `bounce_back`, Rematch Won `retest_beaten`,
  Clean Sweep I `perfect_day`; display only, pays nothing), have/need for `slam_year` (the most windows in one year, of all of them), `reads` as the toml has it (a
  list for the session rungs), and **Next up never offers `on_dates`, `slam_year` or `clock`** (nobody can work on Yalda today).
- **Patched, not retyped** (stages 76 and 94's way): seven functions by single-line guarded textual patches, each found once or the stage refuses and changes nothing; three
  new helpers (`career_reads_kinds`, `career_in_windows`, `career_slam_year`, the service role's only). Safe to run twice.
- **How it was proved:** `scripts/career/rehearse_emblems.mjs` (PGlite; run line in its header): made-up athletes through the real triggers and the real `save_session()`; the
  stage twice under version 10 (nothing moves); the seed (a rename passes, a changed `paid_from` is refused); one silent pass mints EXACTLY what an independent oracle says
  (read from the toml's own numbers), all at 0 XP, silent, dated the seed day, `earned_on` the real day, with no moment, and every athlete's XP, level, season, week and
  paid-fact fingerprint are the same before and after, `career_compare()` ok; the live path (a win on the seed day pays, a win done yesterday and synced today is 0, the clock
  at 06:59 / 07:00 / 20:59 / 21:00, first `fin` wins, a `fin` arriving later wakes Early Bird, an old achievement untouched); later back-fills; `times`, `done_on`,
  `xp_won`; the cost; the way back puts all seven functions back byte for byte and drops the column; the stage again after it.
- **The way back:** `scripts/career/rollback_stage99.sql` (made from the stage's own table of lines, read backwards), on Amir's word only. Awards already minted keep what they
  were minted with. ⚠️ Its last statement drops `session_history.fin` (the time of day of the sessions saved since is lost); delete that statement to keep it.

### To apply (Amir's "go live"; never an agent)

1. `python scripts/check_career.py` and `node scripts/career/rehearse_emblems.mjs` (header) both clean on the commit that goes live.
2. A before-copy: `backup.emb99_scores_before` (every `career_scores` row) and `backup.emb99_awards_before` (every `career_awards` row). Drop both 14 days later.
3. A dry run in one rolled-back `execute_sql`: this file, the seed, one silent `career_rewards_batch()` pass, then a `do` block that compares every athlete's
   `career_compute()` with the before-copy and `raise exception`s with the report (stage95's recipe). Read it: who gets which of the 33 (all at 0 XP), nobody's XP moves
   (unless someone finished a session on the seed day: then their same-day wins pay; decide whether `paid_from` is the seed day or the day after).
4. Apply `supabase/stage99_emblem_cabinet.sql` (migration `stage99_emblem_cabinet`).
5. Set the day: `starts_on = "<seed day>"` in `career/rulebook.toml` and every `paid_from` in `career/achievements.toml`
   (`sed -i 's/paid_from = "2026-10-25"/paid_from = "<day>"/' career/achievements.toml`); `python scripts/check_career.py`; `python scripts/career_seed.py --dry-run`, then the seed.
6. `select public.career_rewards_batch(o, 5, 'silent')` from offset 0 until it answers `n = 0` (what the seed's `next` says). It is quiet: no moment, no Bell.
7. Read back: every athlete's career XP, level, season and week against the before-copy; `career_compare()` ok; `select count(*), sum(xp) from career_awards where rules_version = 11`
   (xp 0 unless seed-day wins); no `career_recognition` row for the 33 ids; the seven bodies equal the file (md5); `get_achievements()` answers with `done_on` and `xp_won`.
8. Remake `supabase/schema_snapshot.sql` (`scripts/restore/README.md` → *Keeping the snapshot current*) in the same commit; tell the app track the stage is live.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
