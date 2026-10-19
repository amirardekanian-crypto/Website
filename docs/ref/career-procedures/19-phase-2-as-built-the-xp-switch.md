## Phase 2, as built (2026-10-17): the XP switch

`supabase/stage69_career_xp_switch.sql` (with the seed of `rulebook.toml` version 2: both switches `"off"`), rehearsed by
`scripts/career/rehearse_switch.mjs` (PGlite, the schema snapshot, a full backup of the real rows, phase 1 as it stands on the live
project, then stage69, Season 1, the dry run, the switch, the refusals, settling, a season closing under the switch, an erasure, the
cache's cost and the way back: 42 of 42 on 2026-10-17, 49 of 49 on 2026-10-18 after the repair below), then applied to the live project late that day with the switches still off (every level, both boards and `career_compare()` identical before and after, 34 of 34); the way back is `scripts/career/rollback_stage69.sql`, tested there. **Switched on 2026-10-18** (`rulebook.toml` version 3, `[switch] xp = "2026-10-18"`, the dry run first, on Amir's yes to its list: 31 up, 7 the same, nobody down, 0 levels kept). What the
procedures above became, and the choices the build made:

- **The two switches.** `rulebook.toml` → `[switch]`: `xp` (phase 2) and `catalogue` (phase 3), each `"off"` or the day it was turned on.
  `career_switch_day()` reads them (a rulebook from before them, version 1, has both off). The seed refuses a switch turned back off, a
  day still to come, and the catalogue switch without the XP switch (rule 16 of `check_career.py` checks the file; the server checks
  the order).
- **P1 step 4, settling,** is on with the XP switch (`career_settled_before()`): a day older than `[habits] backfill_days` (plus one, so
  no time zone closes a day early) keeps its facts as they stood; a day that first arrives late is still added.
- **P3, the daily XP.** `career_paid_rules()`: with the XP switch on, every habit in `[habits] locked` (WORKOUT) pays 0 a day in
  `hab_xp()`: the session fact pays instead. `hab_bonus_xp()` is still given Proof's weights, so the habit's weight still counts in the
  day gate (the day streak, days on target, comebacks) and in its own tiers, HEAVY METAL and THE MACHINIST until the catalogue switch.
  The facts outside the habit half are priced by `career_facts_paid()`, one row each within the caps: a fact whose `[fact.<kind>]` says
  `xp_from = "value"` pays its own `value.xp` (`level_kept`), and a `career_only` one counts toward the career only, never a season or
  a week.
- **P3, cached.** `career_scores` holds each athlete's score (`career_compute()`: the career with its level, this season's points, the
  rolling week; the log rebuilt from the facts once for all three). `career_stamp()` says what it rests on: the newest rulebook (its
  version and load time), Amir's quest runs, the season, today, the athlete's facts (their count and last change) and programme. A
  different stamp is stale, worked out again on the next read (`career_scored()`). The board reads many at once with a time budget
  (`career_scores_for()`: 2.5 s, then a stale row is served as it was), because the career's habit half walks a whole career (up to a
  second for the longest log on 2026-10-17). Coach-only read; `coach_erase_person()` empties it; it is in `BACKUP_TABLES` and the schema snapshot.
  Measured on PGlite (slower than the live project): the longest athlete's profile 0.39 s cold and 0.11 s warm, the board 0.84 s cold
  and 0.003 s warm.
- **P4.** With the XP switch on: the level is `career_level()` of the career XP (never resets); `hab_season_level()` answers it, so the
  road's titles (`hab_mint_titles()`, `set_title()`) and `coach_season_levels()` follow it; `leaderboard_top()` ranks this season's
  points (or the rolling week's) from the cache, with the career level and rank beside each name; `hab_close_season()` archives a
  season's points and the career level at its last day, and gives the season's title to `[season] title_points` (2,000) or more.
  Before it, all four are Proof's own, unchanged (`hab_proof_level()` keeps Proof's season level for the switch's list).
- **Nobody's level goes down** (`career_keep_levels()`, run by the seed that turns the XP switch on): for each athlete with a Proof log,
  a season record or a fact, the highest Proof level (the best `hab_season_results.level`, or `hab_proof_level()` now) against the career
  level; where the career is lower, one `level_kept` fact (ref `xp-switch`, dated the switch day) worth `career_level_floor(level)` minus
  the career XP. Written once; a later re-seed never works it out again (GAME-1).
- **P10.** `get_profile()` reads the cache and adds `switch`, `week`, `since` (the first day the athlete logged anything: the reveal's
  date), `kept` and `rules` (the curve, `[season] title_points` and the prices an app previews with).
- **AA Proof** (`habits.html`, `HABITS.md` → *Career Mode*): `fetchCareer()` reads the profile behind the first paint, after every push
  and on the foreground pull, and keeps it in `<id>_hab_career` (never synced; the coach's preview keeps it in memory). `careerOn()` is
  the profile's switch. In Career Mode the scorer's window is the whole career (`scoreDays()`), `paidXp()` pays the locked habit 0,
  `overallXp()` is the profile's XP plus what the phone counted since (`careerXp()`), and the curve is the profile's (`overallBase()`).
  `rulesSignature()` carries the switch instead of the season, so the first open after it re-baselines in silence and shows the one
  reveal (`renderCareerReveal()`), once per athlete (`CFG.careerSeen`, kept through the cloud merge). The embedded strip reads the copy
  and never asks the server.
- **The training app** (`program.html`, `PROGRAM-APP.md` → *Career on Home*): Hold Serve's read of `career_rules` also reads the switch
  (`careerSwitchSeen()`); with it on, `refreshCareer()` reads the profile into `<id>_careercache`. The Career row on Home above Hold Serve
  (`careerRowHTML()`), and P17's finish card (`careerEarn()`, `paintConfirmEarn()`) and finished card (`paintCareerEarn()`, kept in
  `<id>_earn_d<N>`). Neither key syncs.
- **The twins** (P13): `habits.html` `levelInfo()` on the career's curve and `paidXp()`; `program.html` `careerLevelOf()`,
  `careerFullLog()`, `careerCheckin()`, `careerEarly()`. `scripts/check_twins.js` §9 holds them to `scripts/career/xp_cases.json`, the
  server's own answers (`career_level()`, `hab_xp()` with `career_paid_rules()`, `career_session_want()`), which
  `scripts/career/rehearse_switch.mjs` writes (`--write-cases`) and checks on every run. `scripts/headless/career.js` drives both apps.
- **`career_compare()` after the switch:** both sides pay the locked habits 0, and a row whose numbers differ only because a closed day
  settled is `settled` (with how many closed days differ), not a failure.
- **What it does not do yet:** no badge, achievement or title of the catalogue is minted (phase 3); the training app has no moment of its
  own for a level reached (AA Proof celebrates it at its next open); the board's level beside a name can lag an athlete who has not
  opened an app since a change, by at most the time it takes a board read to work out a stale row.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
