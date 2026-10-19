## Phase 1, as built (2026-10-17)

`supabase/stage66_career_mode.sql`, seeded by `scripts/career_seed.py`, rehearsed by `scripts/career/rehearse.mjs` (PGlite,
the schema snapshot, a dump of the real rows, then made-up athletes through the real doors). What the procedures above
became, and the choices the build had to make:

- **Shadow.** `rulebook.toml` → `[shadow] on = true` (rulebook version 1; version 2 replaced it with `[switch]`, both `"off"`:
  *Phase 2, as built*, below). Until the XP switch (2026-10-18) the one thing an athlete saw was Hold Serve's row on the training app's Home
  (2026-10-17): it reads the athlete's own `week_held` and `week_broken` facts, not `get_profile()`, and counts them as P10 does
  (`holdCount()`, a twin; `PROGRAM-APP.md` → *Hold Serve on Home*). No XP, level or score reached a screen; AA Proof's scorers and board
  were untouched. Then, and until the catalogue switch, the habit numbers are Proof's own (strength 100, the gate, the targets) and the checker
  holds them equal to `supabase/xp_rules_snapshot.json`.
- **P1, observe.** Four triggers: `athlete_progress` (the Proof log, its config, the Personal Records), `session_history`,
  `library_sessions`, `programs`. A trigger never stops a save: an error is a database WARNING and the save goes through,
  and the base facts and the derived ones are separate, so a failing `derive()` never takes the ledger with it.
  - The Proof log is read the way `hab_xp()` reads it: every (day, habit) value becomes a `habit_done` fact holding the
    value as it is (a 0 too: Proof's day gate counts a habit logged at 0 as one left undone), every day a `habit_day`
    fact with that day's list (`rosterOn()`) and the athlete's own habits, a locked habit done a `workout_tick`.
  - A session saved 'Complete' is `session_finished`, one saved 'Partial (n of m …)' `session_finished_early`.
    `full_log`: finished as written, every set ticked, every set rated where the card asks an RPE. The log does not carry
    the card's target, so an exercise rated on any set asks one on every set it ticked, and one rated on none asks none
    (the app asks only where the card sets a target: `noRpeCards()`). `checkin_done`: the check-in answered, not skipped.
  - **Step 4, settling,** is built (`career_sync()`'s `p_settled_before`) and is on since the XP switch (2026-10-18, phase 2). While the shadow was
    all there was, a closed day still followed the log, as Proof does, or the two could not match.
- **P2, derive.** On every training save, a programme change and a profile read (no cron, as P2 asks).
  - Training weeks are `cycleWeekInfo()`'s, for the published cycles (index ≤ `currentCycleIndex`) **that have dates**; a
    cycle with none has no training week, as in the app. A past cycle's plan days come from its newest saved version
    (`program_versions`), else its archive entry (`programHistory`). Weeks before the athlete's first session are not judged
    (you cannot break, or come back to, a week you never started). A week of a paused or former athlete is neither broken nor
    away; `athlete_status` keeps no history, so once a pause is lifted its weeks count again on a full backfill.
  - `bounce_back`: a held week whose previous training week was broken, at most 8 days before it. `training_return`: the
    first held week after `weeks_away` empty, closed weeks. `week_by_the_book`: a held week whose every session has
    `full_log` and `checkin_done`.
  - `cycle_finished`: the day after the end date (and `[week] close_after_days` more on the server's clock), sessions in the
    cycle's dates over plan days × weeks, as the This cycle card counts them. `roadmap_finished`: the last cycle finished.
  - `effort_win`: `cycleWins()` over the cycle's structured logs, kept only where the weight or the reps went up (GAME-5),
    the best three. `lift_gain`: each lift's best effort-adjusted index above its first session, weight or reps up.
  - `personal_best`: the training app's own verdict, the automatic entries in the Personal Records (`<id>_1rm`), each with an
    earlier number for the lift (a lift's first number has nothing to beat); a deleted day is no number.
  - `retest_done`: a test-flagged lift (the current programme's flags, a past cycle's from its saved version) logged in the
    cycle's last `window_days`, judged on its best estimate that week; `retest_beaten`: above the previous test, else above
    the best earlier record.
  - `comeback` is career-wide and keeps the day on target it came back from (`prev`); `comeback_stuck` when
    `comeback_stick` days on target follow it. `month_with_amir`: every whole month since the first session.
- **P3, score.** The habit half is scored by Proof's own server functions, `hab_xp()` and `hab_bonus_xp()`, fed from the
  facts (`career_log()`, `career_cfg()`) and from the rulebook and the catalogue in `xp_rules`' shape
  (`career_habit_rules()`), so there is one copy of the habit rules on the server, and Proof's season rule comes with it
  (runs and comebacks measured from the season's first day). The quest *runs* are read where Proof keeps them
  (`xp_rules.questRuns`) until the crew mission replaces the lever. Every other fact pays `[fact.<kind>] xp`, capped by
  `limit` and `limit_per` (one session per plan day per training week, the better one paying; two Library sessions a week;
  three effort wins a cycle). Nothing is stored. ⚠️ Before the XP switch (2026-10-18) the shadow's career XP counted a session twice, as the
  WORKOUT habit (Proof's 120) and as the session fact (400); since the switch the habit pays 0.
- **P4.** `career_level()`: the rulebook's curve and ranks, no ceiling, no reset. `base` was re-anchored to 400 on the
  shadow data with the XP switch's numbers (the measurement is beside it in `rulebook.toml`).
- **P10.** `get_profile(athlete)`: the athlete's own, the coach's anyone's (and the SQL editor's or the service role's, for a
  report). Career XP, level, rank, XP to the next level, this season's points, the numbers (weeks held now and best,
  sessions with Amir, personal bests, comebacks, days on target, perfect days) and the titles owned. The board place, the
  badges, missions and quests come with phases 2 to 7.
- **P12.** A hidden or deleted session voids its facts; un-hidden, they come back. `coach_erase_person()` empties
  `career_facts` last. A restore puts `career_rules` back last (`scripts/restore/restore_backup.py`), so nothing is worked
  out half-restored; after restoring a backup older than stage66, seed again.
- **P14.** `career_compare()`: for every athlete with a Proof log, Career Mode's habit XP against `hab_xp()` +
  `hab_bonus_xp()` this season, the rolling week and all time, the rules key by key, and three probes through Proof's own
  CTEs (the days on target, the perfect days and the comebacks of the season) against the facts. Rehearsed on the real
  rows on 2026-10-17, then run on the live project the same evening: **34 of 34 athletes equal, on every window**.
- **P15.** `career_facts`, `career_rules`, `career_catalogue`, with row-level security (an athlete reads their own facts, the
  coach every fact, anyone signed in the rules and the catalogue; nobody but the server writes), in the erasure, and in
  `BACKUP_TABLES` and the schema snapshot (in the commit that recorded the apply). The other six tables come with their
  phases.
- **On the live project (2026-10-17).** Applied on Amir's *"yes, apply it"*, after a backup of every row and a tested way back
  (`scripts/career/rollback_stage66.sql`), then seeded from the committed files (rulebook version 1, 144 catalogue rows; 4,512
  facts for 40 athletes) and checked there: every career function's body equals this file's, `career_compare()` is `ok` (this
  season 102,752 habit XP on both sides, the rolling week 6,311, all time 110,095), and a made-up athlete's save, hide and
  un-hide wrote and voided the right facts in a transaction that was rolled back. Measured there: Career Mode adds at most 0.3 s
  to a save (the Proof log 25 to 55 ms, the training derive 35 to 220 ms, one session 2 to 4 ms) and `get_profile()` takes 0.2
  to 1.5 s, most of it Proof's own `hab_bonus_xp()` over a whole career. `career_cfg()` writes a roster entry only on a day
  whose list changed: one entry for every day gave the same numbers but made `hab_bonus_xp()` eight times slower (the
  profile of the longest log took 15 s), so it was fixed and re-applied the same evening.
  ⚠️ **A trigger's exception block cannot catch a cancelled statement** (PL/pgSQL's `when others` skips `query_canceled`).
  A signed-in request is cut off at 8 s, and the save with it, so what a trigger does per save must stay small.
- **What it does not read yet.** Sessions saved before the structured log (only the text summary) give no best, win, gain
  or full log; a renamed lift starts a new line (the app's rename aliases are not copied).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
