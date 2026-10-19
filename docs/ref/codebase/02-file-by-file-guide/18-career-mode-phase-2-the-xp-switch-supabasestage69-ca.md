### Career Mode, phase 2: the XP switch (`supabase/stage69_career_xp_switch.sql`, 2026-10-17)

Built and rehearsed, **applied to the live project late on 2026-10-17 (on Amir's yes, with the seed of `rulebook.toml` version 2), and the switch was off**: both apps behaved exactly as before until it went on. Every level, both boards and `career_compare()` were identical before and after (34 of 34). **The XP switch went on 2026-10-18**, shortly after Season 1 opened at 06:00 UK, on Amir's yes to the dry run's list (`rulebook.toml` version 3; 31 of 38 athletes up, 7 the same, nobody down, no level kept; `career_compare()` ok, 34 of 34). See `CLAUDE.md` and `career/PROCEDURES.md` → *Phase 2, as built*. What is in it, and the files
around it:

- **`supabase/stage69_career_xp_switch.sql`** (safe to re-run). The two switches (`career_switch_day()`, `career_xp_on()`, read from the newest
  rulebook's `[switch]`), `career_settled_before()` (a closed habit day settles), `career_paid_rules()` (the locked WORKOUT habit pays 0 a day),
  `career_facts_paid()` and `career_facts_xp()` (every fact outside the habit half, priced within its caps, where a `career_only` fact counts toward
  the career alone), `career_score()`, `career_level_floor()`, `career_keep_levels()` (the level kept, written once at the switch),
  `career_seed()` (it refuses a switch turned back off, a day still to come and the catalogue switch without the XP switch. It returns every athlete's
  line when it turns the XP switch on, and `p_dry_run` does it all and undoes it), `get_profile()` (read from the cache, with the switches, the week,
  `since`, `kept` and `rules`) and `career_compare()` (a closed day that settled is `settled`, not a failure). It redefines `hab_season_level()`,
  `coach_season_levels()`, `leaderboard_top()` and `hab_close_season()` to answer the career once the switch is on (before it they are Proof's own scorer, and
  `hab_proof_level()` keeps Proof's season level), and patches `coach_erase_person()` in place to know the new table.
- **The cache table `career_scores`** (`athlete_id`, `stamp`, `score`, `updated_at`): each athlete's career XP and level, season points and rolling
  week, worked out again by `career_scored()` and `career_scores_for()` whenever `career_stamp()` changes (the rulebook, Amir's quest runs, the
  season, the day, the athlete's facts and programme). Row-level security: the coach reads it. Nothing in it is a source: a deleted row comes
  back. It is in `BACKUP_TABLES` in coach.html and in `supabase/schema_snapshot.sql` (pre-commit guard 17 fails when the
  two disagree), and `coach_erase_person()` empties it.
- **`scripts/career/rehearse_switch.mjs`**: `PGLITE=<scratch>/node_modules/@electric-sql/pglite node scripts/career/rehearse_switch.mjs --backup
  <aa-backup-…json> [--report <file>] [--write-cases]`. PGlite in a scratch folder (`scripts/restore/lib.mjs`), nothing live: the schema snapshot, a
  full backup of the real rows, phase 1 as it stands on the live project (`--phase1 <rev>` names the commit it was seeded from), then the file,
  Season 1, the dry run, the switch, the refusals, settling, a season closing, an erasure, the cache's cost and the way back. 42 of 42 on 2026-10-17; **49 of 49
  on 2026-10-18** after the repair (the snapshot now holds stage69 and stage70, so it first takes both off with their own way-back files, then seeds phase 1 and
  phase 2 from the commits the live project was seeded from: `--phase1`, `--phase2`, `--no-stage70`).
- **`scripts/career/rollback_stage69.sql`**: the way back. Every function the file redefined goes back to what it was, the new functions and the
  table go, and `coach_erase_person()` forgets `career_scores`. Tested by the rehearsal. On Amir's word only. A level kept at the switch is
  voided, not deleted.
- **`scripts/career/xp_cases.json`**: the server's own answers on fixed inputs (the career's curve over XP values that cross levels and ranks, one
  value of one habit through `hab_xp()` with the switch on, the facts of 15 sessions as the app saves them). The rehearsal writes it
  (`--write-cases`) and checks it on every run. `scripts/check_twins.js` §9 holds `habits.html` (`levelInfo()` on the career's curve, `paidXp()`)
  and `program.html` (`careerLevelOf()`, `careerFullLog()`, `careerCheckin()`, `careerEarly()`) to it.
- **`scripts/headless/career.js`**: 55 checks in a browser, both apps (see *Headless checks*).
- **In the apps:** `habits.html` (`fetchCareer()`, `careerOn()`, `paidXp()`, `scoreDays()`, the reveal, and the profile copy `<id>_hab_career`),
  `program.html` (the Career row, the finish card's line and the finished card's, and the keys `<id>_careercache` and `<id>_earn_d<N>`) and
  `coach.html` (`loadLevels()` reads `career_rules`, which sets the Proof level's caption). `HABITS.md` → *Career Mode (phase 2, the XP switch)*,
  `PROGRAM-APP.md` → *Career on Home, and what a session earns*, `XP_SYSTEM.md` §2, §5, §7 and §8, `COACH_DASHBOARD.md`.

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
