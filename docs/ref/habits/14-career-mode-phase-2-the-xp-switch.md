## Career Mode (phase 2, the XP switch)

> **The reveal, the level-up takeovers and the Locker are switched off since 2026-10-19. The scoring below is unchanged.** See *Career screens off*.

> **Where it stands (2026-10-18).** Done. **The server half (`supabase/stage69_career_xp_switch.sql`) was applied to the live project on 2026-10-17, and the XP switch was turned on 2026-10-18**, shortly after Season 1 opened, on Amir's yes to the dry run's list (`rulebook.toml` version 3; `career_compare()` ok, 34 of 34). Both
> apps read the career profile now. The catalogue switch (phase 3) is next and not started. Every "once the XP switch is on"
> in this file points here.

Career Mode (`career/CAREER_MODE.md`, with the steps in `career/PROCEDURES.md` → *Phase 2, as built*) gives AA Proof and the
training app one score and one level. Amir's three decisions, 2026-10-17 (*"go with your picks, but the season starts tomorrow"*):

1. **Two switches, not one** (`career/rulebook.toml` → `[switch]`). `xp` is this one. `catalogue` (phase 3: the new badges and
   awards) needs it on first. Each is `"off"` until a seed turns it on with the day. Once on, it never goes back: the seed
   refuses. The way back is `scripts/career/rollback_stage69.sql`, on Amir's word only.
2. **Nobody's level goes down.** The seed that turns the XP switch on gives anyone whose career level would sit below the highest
   level they reached in AA Proof one `level_kept` fact, worth the XP to the start of that level. Their best level is the better
   of their season records (`hab_season_results`) and the level Proof shows them this season. The fact counts toward the career
   and never toward a season's points. Measured on the real rows (the backup of 2026-10-17, Season 1 simulated): of 38 athletes
   (the demo included), 31 go up, 6 stay and 1 is kept at their Proof level by a top-up (level 12, +630 XP: Amir's own test identity). That was the rehearsal. **At the real switch (2026-10-18) nobody needed a level kept:** 31 went up, 7 stayed, nobody went down, because that identity had reached level 12 on its own XP by then. `python scripts/career_seed.py --dry-run`
   prints every athlete's line first. The server does the whole seed and undoes it.
3. **Season 1 started on 2026-10-18.** A scheduled task (`start-season-1`, 06:00 UK) ran `start_season('Season 1','2026-10-18')`,
   Proof's own way: Pre-Season was archived with Proof's levels and its title at level 5. The switch landed during Season 1. Season
   points are worked out from the facts and never kept as a record of their own (the server's cache is only a copy), so at the
   switch the board is worked out again from the season's first day under the new rules, training included. A session finished in Season 1 before the switch counts its 400, and its WORKOUT
   tick 0, from the moment the switch is on.

**What changes, and only once the switch is on:**

- **Training earns XP**, paid by the server from the training facts (`career/rulebook.toml` → `[fact.*]`): a finished session 400
  (finished early 200), a full log (every set logged) 50, the check-in answered 20, a week held 400, a bounce-back after a broken week 100, a
  return after two or more weeks away 50, a Library session 100 (two a week), a personal best 150, an effort win 200 (three a
  cycle), a retest done 50, a retest beaten 300, a cycle finished 1,000 and the roadmap finished 3,000. One paid session per plan
  day per training week: a day done twice in a week pays its session once. Proof's own comeback stays 50, paid by the habit half.
- **The WORKOUT habit pays 0 a day toward the overall XP** (id `strength`, the locked one). The session pays instead, so a session
  is never paid twice. The habit stays on the day's list. Its weight (100) still counts in the day gate (the day streak, days on
  target), in its own consistency tiers and in HEAVY METAL and THE MACHINIST until the catalogue switch. Its own ladder (its level
  ring) still counts 120 a session day. Server: `career_paid_rules()`. Phone: `paidXp()`.
- **The overall level is the career level.** It counts every fact of the athlete's whole career (habits, training and the level
  kept) on the rulebook's curve (`[level]`: base 400, growth 0.55, where Proof's own curve is base 300), with the same ten ranks and
  the star past level 50. It **never resets.** A season resets only the board's points. Each habit's own ladder counts the whole
  career too.
- **No season window on the career.** The phone's scorer walks the whole log (`scoreDays()`, and `scoreStart()` is empty). The
  server's career score calls `hab_xp()` and `hab_bonus_xp()` with no season. So a tier, a milestone or a quest pays the career
  once, ever, on the day it was crossed. The board's season points still measure from the season's first day, so the same badge
  pays again toward each season's points.
- **Closed habit days settle.** A day older than the backfill window (today and 3 days back, plus one so no time zone closes a day
  early) keeps its facts as they stood. A day that first arrives late is still added.
- **The profile.** `get_profile()` is the one read for both apps. AA Proof asks for it with `fetchCareer()`: behind the first
  paint, after every push that lands (the server has just turned the log into facts) and on the foreground pull. Never in the
  demo, and **never in the embedded strip**, which reads the copy and does not ask. The answer is kept in `<id>_hab_career`
  (`{ p, at, base }`), on this phone only. It is never in `CFG` (which syncs newest-wins, so a newer phone would adopt a stale
  profile), never pushed, and written only by the full app. The coach's preview keeps it in memory. `careerOn()` is the profile's
  switch (`p.ready` and `p.switch.xp`). A tick shows its XP at once: the overall XP is the profile's plus whatever this phone's
  own scorer has moved since (`careerXp()`, P13), and the server's next answer takes over. The curve comes from the profile
  (`overallBase()`, `overallGrowth()`), with Proof's own as the fallback.
- **One reveal, once per athlete.** At the first open of AA Proof on the career, `rulesSignature()` carries the switch, the curve
  and the rulebook's version instead of the season. The app re-baselines in silence and no level-up fires. `checkLevelUps()` then
  shows one takeover (`renderCareerReveal()`): the kicker *Your career*, the level, the rank's own ground, and *From everything
  you've logged since 6 June, your training included. Your level never resets now. A new season only starts the board's points
  again.* The date is the profile's `since`, the first day the athlete logged anything, and *your training included* appears only
  when they have finished a session. When the road's rewards up to the career level were added to the Locker, a line counts them:
  *N rewards on the road are yours · in your Locker*. `CFG.careerSeen` holds the switch's day it was shown for and survives the
  cloud merge, so a second phone stays quiet. Someone who started after the switch has nothing to reveal and gets none. Its
  Share it opens the Rank card with the eyebrow *MY CAREER*. In the strip it waits for the full app, like every takeover.
- **The words change** (all in `habits.html`, behind `careerOn()`). A new season toast: *SEASON 2 has begun. The board starts from
  zero. Your level stays.* A level-up reads *Career level N. Levels are just days wearing a number, and now they never reset.* A
  rank-up reads *A rank you earn is yours now. Nothing resets it, not even a new season.* A title reads *A rank says how far you
  have come. A title says what you are.* The board's note adds *Your level never does, and your points count your training too.*
  The WORKOUT row's hint reads *Finish a session in your programme and this ticks itself. The session pays the XP. This keeps your
  day streak.* The Rank card says CAREER where it named the season. The tour's level step and the manual's *Levels and ranks*,
  *The Locker*, *Consistency*, *Seasons* and *The leaderboard* have Career Mode versions: the manual shows the session prices from
  the profile and drops "One full day gets you to level 2". Its *What each habit is worth* lists WORKOUT at the session's price
  over *Paid by your finished session*, and its perfect day leaves WORKOUT out (*A perfect day is currently 216 XP. A finished
  session pays 400 XP on top.*, on the five core habits). Progress's *This week · +N XP* is the server's week (habits and
  training) plus what the phone has moved since.
- **The board and the road.** `leaderboard_top()` ranks this season's points (or the rolling week's), worked out from the facts
  with the training included, with each athlete's **career** level and rank beside the name. Same columns, same identity check.
  The road's titles (SIGNED ON at level 2 up to PROOF ITSELF at 50) mint by the career level: `hab_season_level()` answers it, and
  `hab_mint_titles()`, `claim_titles()` and `set_title()` follow.
- **A season closing.** `hab_close_season()` (called by `start_season()`) archives each athlete's season **points** (training
  included) and the **career level** at the season's last day. The season's title goes to everyone with `[season] title_points`
  (2,000) or more, in place of Proof's "level 5 inside the season".
- **The server's working copy.** The table `career_scores` (athlete, stamp, score, updated_at) holds each athlete's career XP and
  level, season points and rolling week. It is worked out again whenever what it rests on changes. The stamp (`career_stamp()`) is
  the rulebook's version and load time, Amir's quest runs, the season, today, the athlete's facts (their count and last change) and
  their programme with its versions. A board read works out the stale rows it has time for (2.5 s) and serves the rest as they
  were. `coach_season_levels()` has 3 s. Only the coach can read it (RLS), `coach_erase_person()` empties it, and **nothing in it
  is a source**: delete a row and it comes back. It is in `BACKUP_TABLES` in coach.html and in `supabase/schema_snapshot.sql`
  (pre-commit guard 17 fails when the two disagree).
- **`get_profile()`** answers from that copy and adds `switch` (`xp`, `catalogue`), `week` (`from`, `points`), `since`, `kept` (the
  level kept) and `rules` (the curve under `level`: base, growth, ranks, levels per rank and prestige, then `season` with
  `title_points`, and `prices`: the facts a phone previews a tap with). `hab_proof_level()` keeps Proof's own season level, for the switch's report.
  After the switch `career_compare()` has both sides pay the locked habit 0, and a row that differs only because a closed day
  settled is `settled`, not a failure.
- **coach.html.** `coach_season_levels()` answers the career level, and the athlete's Proof sub-tab label reads *career level
  (server)* where it read *season level (server)* (`COACH_DASHBOARD.md`).
- **The training app** (`PROGRAM-APP.md` → *Career on Home, and what a session earns*). A Career row on Home above Hold Serve
  shows the level. The finish card says what a session earns and the finished card what it earned.
- **`?go=pass`.** `habits.html?client=<id>&go=pass` opens the Locker. It is the Career row's tap. It is read at the end of boot
  after `?open=<id>` (which wins if both are given) and never in the embed.

**What does not change.** The day gate, the day streak, perfect days, the roster rules, partial credit on a counter, the backfill
window, how a quest is scored, roll call (no XP), body weight (no score), the ten rank names and the Locker's rewards (kept for
good) all work as this file says. Progress's stat tiles (days logged, perfect days) keep the season's window.

**The twins, and how they are checked.** `habits.html` `levelInfo()` on the career's curve and `paidXp()` copy the server's
`career_level()` and `hab_xp()` with `career_paid_rules()`. `program.html` `careerLevelOf()`, `careerFullLog()`, `careerCheckin()`
and `careerEarly()` copy `career_level()` and `career_session_want()`. `scripts/check_twins.js` §9 holds them to
`scripts/career/xp_cases.json`, the server's own answers, which `node scripts/career/rehearse_switch.mjs --write-cases` writes and
the rehearsal checks on every run. Change a rule on both sides, then in the cases (`check_twins.js` said 65,151 checks agree on
2026-10-17). `career/rulebook.toml` is also a third copy of Proof's habit numbers: `scripts/check_career.py` rule 14 holds them
equal to the `xp_rules` row until the catalogue switch (`XP_SYSTEM.md` §8). The rehearsal itself (PGlite, the schema snapshot and
a full backup of the real rows kept outside the repo) was 42 of 42 on 2026-10-17. `node scripts/headless/career.js` (55 checks)
drives both apps: the row, the finish and finished lines, the reveal once, the manual, a tick moving the XP at once, `?go=pass`,
the strip never asking, and nothing changing before the switch.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
