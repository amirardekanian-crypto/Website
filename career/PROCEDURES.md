# Career Mode: the procedures

Every function the system needs, step by step, in plain words. Each one says **when** it runs, what it **reads**, its
**steps**, what it **writes**, and the rules it obeys (GAME-n, in [`CAREER_MODE.md`](CAREER_MODE.md) → *The rules*).

**Status (2026-10-18): phase 1 is live, in shadow** (P1, P2, P3, P4, P10, P12, P14, P15: *Phase 1, as built*, at the
end; applied to the live project on Amir's yes, seeded, 34 of 34 athletes matching Proof). **Phase 2, the XP switch, is built,
rehearsed and switched on (2026-10-18)** (P1 step 4, P3, P4, P10, P13, P14 steps 4 to 6, P17: *Phase 2, as built*, at the end). **Phase 3, rewards with meanings and the catalogue switch, is built, applied and switched on (2026-10-18)** (P5, P8 in part, P10, P14, P15, P17: *Phase 3, as built*, at the end). The
rest is a specification. When a phase is built, its SQL follows these steps; when a step here changes, the code
changes with it. The numbers they use live in `rulebook.toml`, and the rewards, missions and quests in the other `.toml`
files: a procedure never hard-codes a number (GAME-10).

| # | Procedure | Runs | Phase |
|---|---|---|---|
| P1 | Turn an action into a fact (`observe()`) | on every save | 1 |
| P2 | Work out the derived facts (`derive()`) | inside P1 | 1 |
| P3 | Score: XP from facts (`score()`) | on read, cached | 1 |
| P4 | Level, rank and the season | inside P3 | 1–2 |
| P5 | Mint rewards (`evaluate()`) | after P1 | 3 |
| P6 | Weekly missions (`plan_missions()`, progress) | Monday, and after P1 | 5 |
| P7 | Personal quests | when set, and after P1 | 7 |
| P8 | Route recognition (`route()`) | after P5, P6, P7 | 3–6 |
| P9 | Amir's tools: reaction, commendation, Amir's Pick | from coach.html | 4 |
| P10 | The profile (`get_profile()`) | when an app opens | 1–2 |
| P11 | Courtside and the Bell (`get_courtside()`, `get_bell()`) | when opened | 4, 6 |
| P12 | Voids and erasure | on hide, on erase | 1 |
| P13 | Offline and the preview | on a tick | 2 |
| P14 | Shadow, then the switch | once | 1–2 |
| P15 | The tables | built with each phase | 1–7 |
| P16 | Changing a detail | whenever Amir wants | any |
| P17 | Instant feedback: every meaningful action answers at once (GAME-13) | on every tap that makes a fact | 2–3 |

---

## P1. Turn an action into a fact: `observe()`

**When:** every time an app saves something the system cares about: a session (`save_session`), the Proof log
(`save_progress`), a coach action. Runs on the server, as a trigger, so no app sends a fact of its own.

**Reads:** the saved row; `rulebook.toml` → `[fact.*]` for which kinds exist.

**Steps:**
1. Work out which fact kinds this save makes (the table below).
2. For each, build the fact:
   - **athlete**, **day** (the athlete's own local day, the same one the app files it under: `completed_on` for a
     session, the log's day key for a habit),
   - **kind**, **ref** (what makes it unique: the session, the habit and day, the cycle and week),
   - **value** (only the numbers that matter: minutes, sets logged of sets asked, units logged of the target),
   - **source** (`training`, `proof`, `coach`, `server`).
3. If a fact with the same athlete, kind and ref exists, update its value when the thing it records changed (a
   counter going from 4 to 8 glasses on an open day, a session the coach corrected). Never insert a second one. This
   is what stops anything paying twice.
4. A habit day closes when it leaves the backfill window (today and the 3 days before). After that its facts are
   settled and only a void (P12) can touch them.
5. Run P2 for this athlete and this day, then P5, P6 and P7.

**Writes:** facts.

**The base facts:**

| Kind | Made when | Ref | Source |
|---|---|---|---|
| `session_finished` | A plan session is finished with Done | the session | training |
| `session_finished_early` | A plan session is finished with Finish early | the session | training |
| `full_log` | A finished session has every working set logged as the card asks | the session | training |
| `checkin_done` | The check-in was answered before that session (the answers are never read for XP) | the session | training |
| `retest_done` | A test-flagged lift is logged in its test week | lift and cycle | training |
| `library_session` | A Library session is marked done | the session | training |
| `habit_done` | A habit is done, or part done on a counter, on a day | habit and day | proof |
| `day_on_target` | A day passes Proof's two-door gate (`dayQualifies()`) | day | proof |
| `perfect_day` | Every habit on the day's list is done (`isPerfect()`) | day | proof |
| `workout_tick` | Proof's WORKOUT habit is ticked by a finished session | day | proof |
| `commendation` | Amir gives a commendation (P9) | the commendation | coach |
| `quest_step_ticked` | Amir ticks a quest step (P7) | quest and step | coach |
| `kudos`, `roll_call`, `share` | Social actions, recorded so they can be shown; they pay nothing (GAME-6) | the action | proof |

**Rules:** GAME-1, GAME-5 (a fact records the act, never pays for a typed value), GAME-6.

## P2. Work out the derived facts: `derive()`

**When:** inside P1, after the base facts of a save are written. Also once at the start of each day for the athlete's
last closed week, so a week that ended with no save is still marked broken.

**Reads:** the athlete's facts, their programme (`public.programs`: the cycle's dates, the plan's days, test flags),
their session history (for the History sheet's maths), `rulebook.toml`.

**Steps, one per derived kind:**

| Kind | The rule | Ref |
|---|---|---|
| `week_held` | Every plan day of a training week has a `session_finished` or `session_finished_early`, in any order. The week is the cycle's own training week (`cycleWeekInfo()`), so it matches the This Week line. Library sessions don't count toward it | cycle and week number |
| `week_broken` | A training week ended short of the plan. Never raised between cycles (the day after a cycle's end date until the next is published), nor while Amir has paused the athlete | cycle and week number |
| `bounce_back` | A `week_held` straight after a `week_broken` | cycle and week number |
| `training_return` | The first `week_held` after two or more weeks with no session, between-cycle and paused weeks not counted | that week |
| `personal_best` | A finished session's best set for a lift beats every earlier number for that lift, by the History sheet's maths (the same rule that fills Personal Records today). The first time a lift is ever done is not a best: there is nothing to beat | lift and session |
| `effort_win` | The day after a cycle's end date: each of its top three effort-matched wins (`cycleWins()`: a lift's first session of the cycle against its best since, 2% or more) **in which the weight or the reps went up**. A lower RPE alone still shows on the This cycle card and earns nothing (GAME-5) | cycle and lift |
| `lift_gain` | A lift's best effort-adjusted index (the History sheet's maths) reaches a new high above its first session; the value is the percent above it. One fact per lift, its value rising | lift |
| `week_by_the_book` | A `week_held` in which every session has `full_log` and `checkin_done` | cycle and week number |
| `month_with_amir` | Each whole month since the athlete's first session; none while they are a former athlete | the month's number |
| `comeback_stuck` | A `comeback` followed by `comeback_stick` days on target in a row | the comeback's day |
| `retest_beaten` | A `retest_done` whose result beats the lift's previous test, or its record when there was no test | lift and cycle |
| `cycle_finished` | The day after a cycle's end date, if at least `min_share` of its planned sessions were finished | cycle |
| `roadmap_finished` | The roadmap's last cycle gets `cycle_finished` | roadmap |
| `comeback` | Proof's rule: a day on target after `lapse_days` (3) or more days that weren't, with an earlier day on target before them | day |
| `mission_done`, `mission_sweep` | Written by P6 | mission, week |
| `quest_done` | Written by P7 | quest |

**Writes:** facts, `source = "server"`.

**Rules:** GAME-1, GAME-4 (a held week counts plan days, never extra sessions), GAME-5.

## P3. Score: XP from facts: `score()`

**When:** whenever a profile is read (P10). The result can be cached and is thrown away whenever a fact or the
rulebook changes.

**Reads:** the athlete's facts and awards, `rulebook.toml`, the frozen XP of their missions and quests.

**Steps:**
1. Skip every void fact (P12).
2. For each fact, look up its kind in `rulebook.toml`:
   - `xp = n`: it pays n.
   - `xp_from = "habits"`: it pays the habit's weight, times `completion_bonus` once the target is met, or its share of
     the target while part done (Proof's rule, unchanged). `strength` (the WORKOUT habit) pays 0: the session fact pays
     instead.
   - `xp_from = "mission"` or `"quest"`: it pays the XP frozen when the mission was planned (P6) or the quest finished (P7).
   - `xp_from = "share.mission_sweep"`: it pays the sweep bonus.
3. Apply the caps written on each fact (`cap`): one `session_finished` per plan day per training week, two
   `library_session` a week, one `personal_best` per lift per session, three `effort_win` per cycle, at most
   `max_custom` custom habits a day, a counter at most `daily_cap` times its target.
4. Add the XP of every award (P5) on the day it was earned.
5. **Career XP** is the sum of everything. **Season points** are the same sum over what is dated inside the current
   season.
6. Nothing is stored as a total. Change a number in the rulebook and every athlete's XP is worked out again; awards
   already minted stay (GAME-1).

**Writes:** nothing (the cache only).

**Rules:** GAME-1, GAME-2, GAME-4, GAME-5, GAME-6, GAME-7.

## P4. Level, rank and the season

**When:** inside P3.

**Steps:**
1. **Level** from career XP on Proof's curve: the cost of level n to n+1 is `base × n^growth`, rounded to 10, never under
   10. Levels never reset (decision 1).
2. **Rank:** `ranks[(level − 1) ÷ levels_per_rank]`, sub-level `(level − 1) mod levels_per_rank + 1`. Past
   `prestige_after` (50) the ladder starts again with a star: level 51 is ★1 ROOKIE 1. No ceiling.
3. **Re-anchoring (once, in phase 1):** set `base` so two months of solid work, training included, still reaches level
   20, measured on the shadow data (P14).
4. **Season points:** XP dated inside the current season (`public.seasons`). The board ranks season points.
5. **A new season** starts only on Amir's word (`start_season()`). Season points go back to zero; levels don't move.
6. **The season's title:** when a season closes, everyone with at least `title_points` season points gets its title,
   minted (P5). This replaces Proof's "level 5 inside the season".

**Rules:** GAME-1, GAME-10.

## P5. Mint rewards: `evaluate()`

**When:** after P1 and P2 for an athlete; after P6 and P7 finish something; at a season's close; on Amir's pick.

**Reads:** the athlete's non-void facts, their awards, `badges.toml`, `achievements.toml`, `titles.toml`.

**Steps:**
1. **Badges.** For each badge, work out its measure for this athlete:
   - `kind = "best_run"`: the longest run of its fact, best ever (a broken run never lowers it).
   - `kind = "total"`: how many of its fact, over the whole career.
   - `kind = "per_habit_best_run"`: Proof's consistency tiers, one ladder per habit.
   - `kind = "best_value"`: the largest value its fact has reached (The Upgrade reads `lift_gain`'s percent, over main lifts only: the entry's `patterns`, `qualities` and `exclude`, D18, *Phase 3, as built* → *Stage 73*).
   - A badge with `habit = "…"` reads only that habit's facts.
   For each tier whose `at` the measure has reached and that is not yet an award, mint it: athlete, badge, tier, the day
   the measure crossed `at`, the facts that crossed it (the evidence).
   **Entries gated on the catalogue switch** (`[switch] catalogue`, phase 3). An entry with `retire_at = "catalogue"` is earned
   exactly as Proof earns it until phase 3, minted at the baseline, and never earned after. An entry with `starts_at = "catalogue"`
   is not earned before phase 3; at the catalogue switch it is worked out over the whole history and minted in silence.
   `superseded_by` names the entry that takes an old one's place: the shelf shows the new one, and the old awards fold under it,
   never deleted. This is how a design change reaches a Proof entry without changing Proof's numbers, which AA Proof's phone keeps
   previewing ticks with until the catalogue switch (P13, P14).
2. **Achievements.** For each achievement not yet earned, check its rule once. When it holds, mint it.
3. **Titles.** Mint a title when what earns it is minted: a badge tier or achievement with `title = "…"`, a level on
   the road (Proof's 14 rewards), a season's close (P4), a finished quest with a title (P7), Amir's Pick (P9).
   **The Grand Slam:** after any title is minted, if the athlete now holds at least one title in each of the four
   meanings (a title whose `meaning` is one of the four; level, season and chosen titles don't count), mint GRAND SLAM,
   size `legend`.
4. **Recognition.** Each new award gets a recognition row with its catalogue `size` (P8).
5. **Never delete an award.** A void fact (P12) only stops future awards.
6. **The baseline.** The first run for an athlete (phase 3) mints everything they already earned in silence: one moment
   at most, never thirty (the way Proof baselines its rewards on first boot).

**Writes:** awards, recognition rows.

**Rules:** GAME-1, GAME-3, GAME-8.

**As built (phase 3, 2026-10-18, catalogue switch on since that evening):** `career_evaluate()` does steps 1 to 6 in one pass of measures, and step 4 only for an
award earned live. Every function, the seams, the switch and the queue are in *Phase 3, as built*, at the end of this file.

## P6. Weekly missions

### P6a. Plan the week: `plan_missions(athlete, week)`

**When:** the athlete's first open or first save of a mission week (Monday to Sunday, the athlete's local time). Never
at a fixed hour, so no cron is needed.

**Reads:** last week's facts, the athlete's programme and tracked habits, `missions.toml`, Amir's pins, the crew
mission if one is set.

**Steps:**
1. If Amir paused missions for this athlete, stop.
2. **The plan slot** (coached athletes only), first match wins:
   1. a retest is due this week → *Test Day*;
   2. last week was broken (`week_broken`) → *Second Serve*, the same job paid as resilience;
   3. last week had sessions with sets left unlogged → *Every Set Counts*;
   4. last week had a check-in skipped → *Check In First*;
   5. otherwise → *Hold Your Week*.

   No mission asks for progress, on purpose: a personal best can't be ordered for a given week without pushing past the
   RPE the plan sets. Progress is paid by badges, achievements and quests.
3. **The recovery slot:** among the habits the athlete tracks, the one with the lowest share of target days last week
   (a tie goes to the heavier habit). Pick that habit's recovery mission. A habit that is off is never picked.
4. **The stretch slot:** a `slot = "stretch"` mission the athlete can do, preferring one not done in the last four
   weeks.
5. **A free athlete** gets two recovery slots (their two weakest habits) and the stretch.
6. The same mission is not picked twice running in the same slot, except *Hold Your Week*.
7. **Amir's pins** replace the picked mission in their slot.
8. **The crew mission**, if Amir set one this week, is added for everyone on the board.
9. **Freeze the XP:** each mission's XP is `share.mission` × the XP of the work its target asks for, at rulebook values
   (GAME-7). A mission on supplements is a small mission.
10. Save the missions with their targets and frozen XP.

### P6b. Progress and completion

1. Each new fact moves every open mission that `counts` it (by `measure`: a count of facts, the units logged, or the
   days done).
2. Reaching the target writes `mission_done` (dated today, paying the frozen XP).
3. The third `mission_done` of a week writes `mission_sweep` (paying `share.mission_sweep`).
4. Missions are never claimed. On Sunday night an unfinished mission simply ends.
5. A week with a sweep extends the athlete's Treble run (a badge, P5).

### P6c. The crew mission

1. Amir sets it from coach.html (it replaces the Quest week lever): a mission from `missions.toml` with
   `slot = "crew"`, and a crew target.
2. Its total is the sum over everyone on the board, returned by the server; the app never adds up anyone's numbers
   itself.
3. When the total reaches the target, every athlete who added at least one counted fact gets `mission_done`, paying
   `share.mission` × the XP of their own share of the work.

**Writes:** missions, facts.

**Rules:** GAME-4, GAME-7, GAME-9 (the crew total shows a sum, never one athlete's number), GAME-12.

## P7. Personal quests

### P7a. Start

1. **Three doors:**
   - **Amir assigns** one from coach.html → the athlete: a template from `quests.toml`, or his own steps.
   - **The cycle:** at a cycle's start Amir may tick one of its outcomes as a quest; its steps are his ticks.
   - **The athlete picks** one of three templates Amir approved for them (`doors` includes `athlete`).
2. One active quest at a time, two at most.
3. Save the quest with its steps, the door, who set it and the start day.

### P7b. Steps

1. Steps close in order.
2. A `closes_on = "fact"` step closes when its `counts` reaches `target` (optionally `within` a window, or as a `run`
   in a row).
3. A `closes_on = "coach_tick"` step closes when Amir ticks it (writes `quest_step_ticked`). Use it only where only he
   can judge: a skill on video, a pain-free return.
4. Each closed step is a small moment for the athlete (size `win`).

### P7c. Pause, extend, drop

1. Amir or the athlete can pause a quest; pausing missions for an injury pauses the quest too.
2. A quest past its `weeks` is extended, never failed.
3. A dropped quest leaves no mark (GAME-8).

### P7d. Finish

1. The last step writes `quest_done`, paying `share.quest` × the XP of the facts its steps counted.
2. P5 mints its badge, and its title if it has one.
3. Recognition at the quest's `size` (usually `milestone`): it always reaches Amir, and the crew with the athlete's
   yes.

**Writes:** quests, facts, awards.

**Rules:** GAME-3, GAME-7, GAME-8.

## P8. Route recognition: `route()`

**When:** after a new award, a mission sweep or a finished quest.

**Reads:** the item's `size`, `recognition.toml`, the athlete's consent.

**Steps:**
1. **The athlete**, always (every reward is celebrated, GAME-14):
   - `tick`: the XP counter moves.
   - `win`: the wins card, until tapped.
   - `highlight`: the wins card, until tapped, and a share card offered.
   - `milestone`, `legend`: a full-screen moment right away, because the athlete has just acted (GAME-13), or at the
     next open when it was earned with the app closed (a server-worked fact such as a cycle finished overnight); one at a
     time, the rest queued; a share card offered.
   - In the training app the moment is `openMoment()` and the card is `openShareSheet()` (program.html, Highlight Reel),
     drawn by `assets/js/sharecard.js` with its badge, achievement, title, level and quest templates (their data shapes are
     written above each one). Proof's are its own.
2. **Amir**, from `highlight` up: a Courtside row with the WhatsApp message from `recognition.toml` → `[message.*]`
   filled in.
3. **The crew**, from `highlight` up, only if the athlete said yes: a line on the Bell, kept `keep_days` (7).
4. **Beyond**, from `highlight` up: the share card, the athlete's to post (GAME-14), in its app's card family. It is drawn
   on the phone and leaves only when the athlete taps Share or Save; a share pays nothing (GAME-6). A `legend` may go in
   Amir's story only after the athlete says yes to a pre-written WhatsApp.
5. **Consent** is asked once, at the athlete's first highlight: *Ring the bell for the crew when you set a best?* Yes,
   or Keep it to me. The switch lives in Settings. Amir always sees everything.
6. Record who was told and when, so nothing is told twice.

**Writes:** recognition rows.

**Rules:** GAME-6, GAME-9, GAME-11, GAME-14.

## P9. Amir's tools

- **Reaction:** one tap on a Courtside row. The athlete sees *Amir saw this* on that moment. No text, no XP, not a chat.
- **Commendation:** Amir picks a meaning and writes one line of why. Writes a `commendation` fact; P5 mints the
  Commendation badge in that meaning; size `milestone`.
- **Amir's Pick**, on the 1st of each month:
  1. The shortlist: the athlete with the most weeks held last month, the one with the biggest effort-matched gain, and
     the one with the best resilience moment (a comeback or a bounce back). A tie goes to someone never picked.
  2. Amir picks one, or nobody.
  3. The title `AMIR'S PICK · <MON YYYY>` is minted for that athlete only, size `legend`.
  4. A pre-written WhatsApp asks whether Amir may feature them in his story.

**Rules:** GAME-9, GAME-11.

## P10. The profile: `get_profile()`

**When:** an app opens, comes back to the front, or saves.

**Returns**, for the signed-in athlete (or any athlete, for Amir):
- career XP, level, rank, XP to the next level; season points and board place;
- the four numbers: weeks held (current and best), sessions with Amir (from stage73, the paid sessions Century counts), personal bests, comebacks (a free athlete's four
  come from habits);
- the title worn and the titles owned;
- once the catalogue switch is on, the **core** of the career: every award id owned, the ladder, the nearest goals, the moments to tell. The
  shelf (badges by meaning with tier, metal and the day of each tier, achievements, the full titles list, recent awards) is a second read,
  **`get_awards()`**, asked for only when a shelf opens (*Phase 3, as built*);
- this week's missions with progress; the active quest with its steps;
- moments waiting to be shown.

**Rules:** GAME-2 (both apps read the same answer).

## P11. Courtside and the Bell

- `get_courtside()`, coach only: this week's rows from `highlight` up, at most `max_rows_per_week` (5), biggest first,
  then newest. Each row: athlete, the moment in plain words, the WhatsApp line written, WhatsApp, Copy and Saw it.
  **As built in stage75 (2026-10-19): "Stage 75: Courtside, as built", at the end of this file.** The heads-ups were not built.
- `get_bell()`, for signed-in athletes on the board: consented lines of the last 7 days with their kudos counts. It
  returns board names, never athlete ids.

## P12. Voids and erasure

1. **A hidden session** (`session_history.hidden_at`, stage60) voids its facts; un-hiding unvoids them. A void fact pays
   nothing and counts toward nothing new. Awards it already minted stay (GAME-8).
2. **A deleted session** voids its facts the same way.
3. **An erased person** (`coach_erase_person()`) loses every row in every Career Mode table: facts, awards, missions,
   quests, recognition, kudos given and received, consent. Erasure is the one exception to "never taken back": it is
   the law, not a retune.

## P13. Offline and the preview

1. The phone keeps the last `get_profile()` answer, the way it keeps the plan (`plancache`).
2. A tick shows its XP at once, from the rulebook's numbers for that one action, marked pending.
3. When the server answers, its number replaces the preview.
4. The preview is a copy of a server rule, so it goes into `scripts/check_twins.js` the same day.

As built in phase 2: AA Proof shows the profile's XP plus what its own scorer has moved since that answer (its scorer, in Career
Mode, is the server's habit half on the same log: the whole career, the WORKOUT habit at 0 a day), so a tick's XP is exact rather
than marked pending; the training app previews a session from the profile's prices and shows the held week as counting until the
server says so (P17). *Phase 2, as built*.

## P14. Shadow, then the switch

1. Seed the rulebook from `rulebook.toml` (Proof's habit numbers as they are today, plus the training facts).
2. Run P1 and P2 over all history: sessions since 21 April 2026 and every Proof log.
3. For every athlete, compare the habit XP Career Mode works out for the current season with Proof's own
   (`hab_xp()` plus `hab_bonus_xp()`). It must match exactly. A difference is fixed in P1 to P3, never hidden.
4. Re-anchor `base` (P4).
5. Switch Proof's level, rank and board to `get_profile()`. The first open shows one moment: *Your career: level N,
   from everything you've logged since <date>*.
6. Proof's phone scorer stays only as the preview (P13).

The switch, as it is done (phase 2; Amir 2026-10-17, *The decisions, round 3*): the switch is `rulebook.toml` → `[switch] xp`,
turned on by a seed.
1. Before it: Season 1 has started (2026-10-18), so Pre-Season's records hold each athlete's highest Proof level. Take a backup
   (coach.html → ⚙ Tools → ⤓ Backup).
2. In `rulebook.toml`, bump `version` and set `[switch] xp` to today's date (never a day still to come: the seed refuses it).
3. `python scripts/career_seed.py --dry-run --out <file>` and run it on the project: the server works everything out (the levels
   kept included), undoes it, and returns every athlete's line: Proof's level now and its best season record, the career level,
   the XP kept and the level after. That is the list Amir reads before he says yes.
4. On Amir's yes: the same without `--dry-run`. It runs no backfill (only a switch changed), writes each `level_kept` fact
   (`career_keep_levels()`), and returns the same list. `select public.career_compare()` must still say `ok` (both sides pay
   the WORKOUT habit 0 now; a row that differs only because a closed day settled says `settled`).
5. Commit the `.toml` with the date the same day, so the next seed keeps the switch on (a seed that turns it back off is refused).
   The same commit changes `privacy.html` §2.3 and its *Last updated* date (Proof's six-file rule): the level is a career level that
   counts finished sessions too and no longer resets, the board's points count finished sessions (a number only), and the server
   keeps a working copy of the numbers, worked out again from the history and erased with the rest. Not before: until the switch it
   would not be true. `privacy-fa.html`'s short version ("name, points and rank") stays true as it is.

The catalogue switch (phase 3) went on the same way on 2026-10-18, alone and at the same rulebook version, with a dry run read first (*Phase 3, as built* → *The go-day, as run*).

## P15. The tables

Each one, the day it is created, gets row-level security (the athlete reads their own, Amir reads all, the crew only
through `get_bell()`), and goes into `BACKUP_TABLES`, the schema snapshot and `coach_erase_person()`.

| Table | One row per | Holds |
|---|---|---|
| `career_facts` | fact | athlete, day, kind, ref, value, source, void_at; unique on athlete + kind + ref |
| `career_rules` | rulebook version | `rulebook.toml`, as stored data |
| `career_catalogue` | badge, achievement, title, mission or quest | its block from the `.toml` files |
| `career_awards` | badge tier, achievement or title earned (**built, stage70, 2026-10-18**) | athlete, award id, kind, item, tier, subject, day earned, `pays`, xp at mint, size, meaning, evidence, how (`live`, `silent`, `baseline`), rulebook version. Never updated, never deleted (an erasure is the one exception) |
| `career_missions` | mission, per athlete per week | slot, mission, target, frozen XP, progress, day done, pinned by |
| `career_quests` | quest, per athlete | steps, status, door, set by, started, paused, finished |
| `career_recognition` | moment told (**built, stage70**) | athlete, award id, audience (`athlete` now; `coach`, `crew`, `beyond` are later phases), size, `due_at`, `told_at`, `told_by` (`proof` or `training`). Written only for an award earned live |
| `career_kudos` | kudos | who gave it, which line |
| `career_consent` | athlete | the Bell yes or no, when it was asked |

Also built in stage70: the column `career_scores.rewards` (the cache of `career_evaluate()`: what each ladder stands at, and the day the athlete was
baselined; no source), the index `career_facts_kind_idx`, and the one-off table `backup.career_catalogue_before` (each athlete's score under the old
rules, kept for the go-day report; **dropped 14 days after the go-day, on 2026-11-01, together with the five safety copies `backup.golive_20261018_career_scores`, `backup.golive_20261018_hab_titles`, `backup.golive_20261018_career_rules`, `backup.golive_20261018_career_catalogue` and `backup.golive_20261018_career_facts`**). `career_awards` and `career_recognition` are in `coach_erase_person()` and the
rollback; their lines in `BACKUP_TABLES` and `TABLE_KEYS`, `restore_backup.py`, `test_restore_backup.py` (46 tables become 48) and the schema snapshot are in the phase 3 commit (rollout step 2).

## P16. Changing a detail

1. Edit the `.toml` file (or ask Claude to). [`README.md`](README.md) says which file holds what.
2. Run `python scripts/check_career.py`. It refuses a missing meaning, an unknown fact, gold, a mission with a fixed
   XP, a title that doesn't exist, and more.
3. Once built: re-seed the rules and the catalogue. Before D20 (stage76, 2026-10-19) every athlete's XP and level were worked out again from their facts
   with the new numbers. Since D20 a re-seed changes no past price: see step 5.
4. Nothing already minted is taken back. A new badge or tier is minted for everyone who already qualifies, in silence
   (P5, step 6).
5. **After go-live (the catalogue switch, 2026-10-18) a change applies forward only: D20, BUILT 2026-10-19 (stage76).** A change to an XP value, a cap or what earns an achievement is a new rulebook version with `starts_on` = the seed day. Facts before it keep their prices (each fact is priced by the version in force on its day), and an award keeps the XP it was minted with (D12 reversed). A reward the new rule reveals for an earlier day is dated the start day. A rename changes only the label (the same version, re-seeded). The habits, the level curve, the season, the week and how a fact is worked out cannot change by seed (the seed refuses): a bug fix is asked of Amir, backwards or forwards, never decided. *Stage 76: D20, as built*, at the end of this file.

## P17. Instant feedback: every meaningful action answers at once (GAME-13)

Amir, 2026-10-17: *"we need to show the client a visible progress and immediate feedback every time a meaningful task is
completed."*

**When:** every tap that makes a fact (P1): a habit ticked, a session finished, the check-in answered, a mission or a
quest step closed. A set logged mid-session is part of its session: its row ticks as it does today, and the session's
feedback comes at the finish.

**Reads:** the phone's copy of the rulebook (`career_rules`, kept on the phone the way the plan is), the last profile
(`get_profile()`, P10), `recognition.toml` → `[feedback]` and its lines.

**Steps:**
1. In the same moment as the tap, before any network call, the app works out what the action is worth from the
   rulebook (the preview, P13).
2. It shows three things, on the thing tapped:
   - **what it earned:** +XP, rising from the row or the button;
   - **where it moved them:** the level bar fills, and the meaning's number ticks up (a held week, a session, a best);
   - **the nearest goal it touched**, with its new count: a badge's next tier (*Paper Trail 9 of 10*), this week's
     mission (*Lights Out 3 of 5*), the quest step.
3. If the action completes something the phone can decide (a habit tier, a mission, a quest step), its moment shows
   right then, at its size (P8). If only the server can decide it (a personal best, a held week, a cycle finished), the
   phone shows it at once, marked pending.
4. When the server answers, its numbers replace the preview (GAME-2). A pending moment is confirmed. If the server ever
   disagrees, the moment is quietly withdrawn and the copy that disagreed is a bug in a twin (P13).
5. **The finish card** of a session lists everything that session earned before Done closes it: the XP, the week
   (*2 of 3 · Hold Serve*), and every badge, mission and quest step it moved.
6. **Progress is always visible**, not only at the moment: the level bar and the four numbers sit where the athlete
   looks (AA Proof's Today card, the strip on the training app's Home), each with its *next* line.
7. Nothing changes silently. A number never moves on screen without the athlete seeing it move.

**Writes:** nothing (the server writes the facts, P1).

**Rules:** GAME-2, GAME-13. The preview copies server rules, so every rule it copies goes into `scripts/check_twins.js`
the same day.

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

## Phase 3, as built (2026-10-18): rewards with meanings, and the catalogue switch

`supabase/stage70_career_rewards.sql` (safe to re-run; the build was **applied to the live project on 2026-10-18** (six parts, every function body checked against this file), and the catalogue switch went **on** the same evening: *The go-day, as run*, below), rehearsed by
`scripts/career/rehearse_catalogue.mjs` (PGlite, the schema snapshot, a full backup of the real rows, phases 1 and 2 as they stand on the live project,
then stage70, the go-day, live mints on made-up athletes, partial calls, the stamp, voids, the queue, timing, a re-seed, an erasure and the way back:
**163 of 163 on 2026-10-18**, 196 s here; the script has grown since, **181 of 181** for stage70 alone today), with the way back in `scripts/career/rollback_stage70.sql` (tested there: dry run first). The apps ship ready and behave
exactly as phase 2 until the switch went on (2026-10-18): `catalogueOn()` in `habits.html` and `catalogueOnT()` in `program.html` are the profile's `switch.catalogue`
and an `owned` (a list of award ids) and a `ladder` that the server only fills once it is on. D1 was answered by Amir on the go-day (now, not with Season 2), D10 and D11 were waived by his "go live", D18 is his, D19 is in and D20 is new (forward-only changes, decided and not built). D2 to D9 and D12 to D17 were never answered one by one, and the recommendation of each is what is built and live
(*The decisions, round 4*, in `CAREER_MODE.md`).

**Words.** The **switch day** `S` is the day `[switch] catalogue` was turned on. **History** is a crossing day `d <= S` (the switch day counts as history on
both sides: the server's `hist := d <= S`, the phone's `live := d > S`). The **award id** is the one key for a reward everywhere:
`badge:<item>:<tier>`, `badge:<item>:<tier>:<habit>` (only `habit_tiers`), `achievement:<item>`, `title:<item>`; built only by `career_award_id()` and
`awardId()` (both phones; a twin). A tier is its 1-based place in the entry's `tiers`, so **tiers are append-only** (*P16*, `tiers.lock.json`).

**The functions** (every one is service-only; `get_profile()`, `get_awards()` and `mark_moments_told()` are the only doors for a signed-in athlete):
- `career_catalogue_on()`: the switch is a day. With it off, every function below does nothing and `get_profile()` answers exactly as in phase 2.
- `career_measures(athlete, ctx, keys)`: **one pass**. Each key (`run:<habit>`, `hits`, `sum`, `with3`, `perfect`, `qualify`, `daystreak`, `cbrun`,
  `stuck`, `count:<kind>`, `weeks`, `iso:<kind>`, `maxpct`, and from stage73 `maxpct:<patterns>` with its `|q:` and `|x:` filters) is one set-based statement over `career_facts` and answers `{have, now, steps}`: `steps` are the
  days on which the running best rose, so the crossing day of any `at` is the first step at or past it. Copies of `hab_bonus_xp()`'s CTEs, proved by
  conservation (below).
- `career_badge_eval()` and `career_achievement_eval()`: from the measures, the tiers crossed (with day and evidence) and, for a ladder, `have`, `now` and
  `next`. A badge reads `run` (`plan_weeks`, `days`, `iso_weeks`) and an achievement reads `test` (eleven: `first`, `proof`, `goals`, `cycle_all_held`,
  `cycle_by_the_book`, `cycle_with_broken`, `runs_together`, `best_value`, `patterns_in_cycle`, `cycle_proving`, `run_regained`), each with only its own
  keys (rules 17 and 18 of the checker). The readings of the five prose rules are decision D9.
- `career_entry_kinds()` / `career_entry_keys()`: which fact kinds wake an entry and which measures it needs, so a save of one kind runs only the
  entries that read it.
- `career_award_pays()`, `career_award_xp()`: a crossing after `S` always pays. History of an **ungated new entry** (Hold Serve, Century, Record Breaker,
  Closer, The Upgrade and the rest) pays its tier xp, dated the day it was earned (D2). History of an entry with `starts_at` pays **0**, because the
  Proof entry it takes the place of already paid it, except `comebacks` (D14: it pays unless the habit comebacks alone, `history_twin_counts`, had reached
  that tier). `pays` is decided once and stored. The price of an award is **always the current catalogue's** (D12), like a fact; the price at mint is kept
  for display and as the fallback when a tier is gone; a crossing that pays 0 stays 0.
- `career_mint()`: inserts the award (`on conflict do nothing`), a `career_recognition` row for an award of size `win` or more that was earned `live`
  (never for `baseline` or `silent`; a title rides on its award's moment, except the Grand Slam, which has its own), and the `hab_titles` row for a
  title. A retired entry is never minted for a day after `S`.
- `career_slam()`: the Grand Slam row, one earliest title per meaning (level, season and chosen titles never count).
- `career_rewards_stamp()`: `career_stamp()` plus the awards, the titles and the Spine's approved entries (All-Court reads `pattern`). Equal to the stored
  stamp means nothing can have changed: `career_evaluate()` answers from `career_scores.rewards` in about half a millisecond.
- **`career_evaluate(athlete, kinds, how)`**: takes the athlete's lock; **the first call after the switch is always a full one**; a call with `kinds`
  wakes only the entries that read them; runs the badges, the achievements, the titles of every owned award whose entry names a `title`, then the Grand
  Slam; stores `{have, now, at, base, stamp}` in `career_scores.rewards` (a partial call merges and never moves the stamp). Returns what it minted.
  **Order inside a save:** facts first (`observe`, `derive`), then evaluate. It is called by the three save triggers with the kinds that changed, by
  `get_profile()` with all, and before an athlete is scored for the first time after the switch. **It is never called on a DELETE** (an erasure must not
  mint). A failure is a warning, never a failed save.

**The seams (how an award's XP reaches the score).** `career_bonus_rules()` hands `hab_bonus_xp()` empty `tiers` and `milestones` once the switch is on, in
`career_compute()`, `career_score()` and both sides of `career_compare()`; quests and comebacks stay with `hab_bonus_xp()`. `career_facts_paid()` gains a
branch: every award is a fact of kind `award` priced as above (no cap: the id is unique), counted in the career, the season by its day and the rolling
week like any fact. `career_stamp()` includes the awards. `career_scored()` and `career_scores_for()` evaluate an athlete who is not baselined before
scoring them, so the instant the switch seed commits, a board read can never score tiers stripped and awards missing: no one sees a drop.

**The switch.** `career_seed()` turns the catalogue switch on **only alone**: no other change in the same seed (the catalogue data first, then the
switch), never with the XP switch, and the day is today or yesterday. It mints nothing. The rest is batches of five athletes a call, so no save waits
more than about 1.5 s on a lock (`python scripts/career_seed.py --catalogue-steps` prints them):
1. `career_catalogue_before(o, 5)`: each athlete's score under the old rules, into `backup.career_catalogue_before` (refuses once the switch is on).
2. `career_catalogue_preview(rules, o, 5)`: **the dry run**. The rulebook differing only by the switch, everything evaluated, a line per athlete, all undone.
   The line: awards, by meaning, titles, Grand Slam, XP and level before and after, season points before and after, `proof_carried`, `proof_sum`,
   `back_pay` and `ok` (`level_after >= level_before`). Amir reads these.
3. The seed for real, on his yes (only `[switch] catalogue` changes).
4. `career_rewards_batch(o, 5, 'baseline')`: mints every athlete's history in silence and prints the lines again. (`'silent'` does the same after a
   re-seed.)
5. `select public.career_compare()`: every row ok. After the switch it also compares, per athlete, what Proof's own tiers and milestones came to
   (`proof_sum`) with what the awards carried (`proof_carried`).

**Conservation.** At the switch, for every athlete, the XP of the Proof-origin awards dated up to `S` equals what `hab_bonus_xp()` paid for tiers and
milestones up to `S`, because each award copies one crossing (same day, same price). So **career XP after = career XP before + the back-pay** (D2, D14), and
no level goes down. Season points do move (D1); the dry run lists them. Rehearsed through the real scorer on every athlete, including the longest.

**The profile, in two reads** (the fix round of 2026-10-18; before it `get_profile()` carried everything and the longest real career came to 19.5 KB against a
14 KB budget).
- **The core, `get_profile()`**, adds without changing a phase 2 key: `catalogue_version`, `numbers.four` (and `numbers.free`), **`owned`** (every award id, a
  list sorted byte by byte, **no days**: the phones' dedupe key and the shelf's held mark), `title_worn`, `slam`, `ladder` (every live badge: `have`, `now`,
  `next`, `next_tier`, `metal_next`, `size_next`, `phone`), `near` (the nearest goals) and `moments`. Its `badges` and `achievements` are still the empty
  lists phase 2 had, placeholders and never "none earned"; it carries no `titles` list and no `recent`. Its size grows with a career by one id an award and
  nothing else. Absent keys read as null in both apps. On a failed evaluate it answers from the stored cache with `rewards_stale`.
  Switch off: `{badges: [], achievements: [], moments: []}` and nothing else new.
- **The shelf, `get_awards(p_athlete_id default null)`**, security definer, stable, writes nothing and works nothing out (`get_profile()` evaluates): `athlete_id`,
  `catalogue` (the switch day), `catalogue_version`, `badges` (one row per badge, per habit for a `habit_tiers` ladder, newest first, each with `days`: the day of
  each tier, tier 1 first, null for a tier skipped; a retired row is the line "Earned before: HUMAN SPRINKLER II"), `achievements`, `titles` (the full list, with
  Proof's `hab_titles` rows) and `recent` (the last 7 days, at most 10, each with its share `spec`). The access rule is `get_profile()`'s: the athlete their own,
  the coach anyone's, the SQL editor and the service role anyone's; a signed-in other athlete is refused. Switch off: the same keys, empty, `catalogue` null.
  Execute is granted to `authenticated` and the service role, not to `anon`; the way back drops it.
- **Sizes**, compact JSON, on the real rows of 2026-10-17 (stage70 alone, the run of 2026-10-18): the core of the largest real career (the longest log, 58 awards) 7.6 KB (7,626 bytes; the ladder 3.5 KB, `owned` 1.4 KB);
  a simulated 207-award career 9.0 KB (8,995 bytes); the shelf of the same two 6.7 KB and 18.3 KB. The 14 KB budget is the core's. With stage73 on top the largest real career has one award fewer and the core is 7,603 bytes (*Stage 73*, below).
- **The phone's shelf cache (AA Proof).** `fetchShelf()` asks for `get_awards()` when Progress opens (once in 15 s) and when the shelf is drawn stale
  (`shelfStale()`: none yet, another `catalogue_version`, or a different number of awards owned; once per state in a run, so no signal never loops). The last
  answer is kept under `<id>_hab_shelf` as `{ v, n, at, a }`. `careerView()` is the core with the shelf's four lists laid over it, and every reader of those lists
  goes through it. Until the shelf comes, the rows are the core's ladder and owned list. The catalogue reveal waits for the catalogue copy or the shelf to
  say what each award is, so it never counts four zeros over earned awards. The training app does not read the shelf: it uses `moments` and `owned` only,
  and a reward AA Proof has already told is no band there (`PROGRAM-APP.md`).

**The queue (D7).** `mark_moments_told(athlete, award_ids, app)` (the athlete's own, `proof` or `training`) stamps `told_at`. In both apps: a moment opens
only from a server answer received in this run, never the cached profile at first paint; the award id is marked seen locally **before** the moment shows
(`CFG.seenAwards` in Proof; `<id>_rw_seen` in the training app, synced as a union), then told on the server; on every fresh answer each app first tells
the server about what it has already seen, so the other app never replays it; at most one full-screen moment per open **of any kind**; an award earned by
acting in this visit (a tick, Done) opens right then; a full-screen award not shown in `keep_days` (14) arrives with `full: false` and becomes a wins line.

**The apps.** AA Proof: `catalogueOn()`, `catalogueReady()`, `awardMeasures()` + `phoneAwardsFrom()` (the phone's scoring of the phone-decidable entries,
for the instant answer to a tick), `awardId()`, `phoneAwards()`, `checkCatalogueReveal()` (the one reveal), the shelf on Progress in four kinds of win,
the four numbers on Today's card, the Grand Slam row in the Locker, award moments and wins-card lines, Proof-look share cards (`HABITS.md` → *Career
Mode, phase 3 (the catalogue switch)*). Training app: `catalogueOnT()`, `careerMoves()` (the finish card's lines, at most three and "+N more"), the finished card's reward
bands (`rwCountingBands()`, `collectRewardBands()`, `paintWinBand()`), `maybeRewardMoment()` / `rewardAfterAnswer()` through `openMoment()`, the four
numbers and the nearest goal on Home's Career row, and `APP_GUIDE` (`PROGRAM-APP.md` → *Rewards on the finish card, the bands and the row*). **No new screen** (D13).

**The twins** (P13): `awardId()` (both phones), `awardMeasures()` + `phoneAwardsFrom()` (`habits.html`), `careerMoves()` (`program.html`) and the five events'
goals (`habits.html` `EVENTS`, equal to `achievements.toml`). `scripts/check_twins.js` §10 holds them to `scripts/career/reward_cases.json`, the server's
own answers, which `rehearse_catalogue.mjs` writes (`--write-cases`) and checks on every run, **and** to a measure grown by hand, one a day, for every entry the
phone decides and every tier (91 checks: the cases never cross `habit_custom`, `the_centurion`, `cold_blood`, `backbone` or any top tier, and a drift in one phone
function now names the entry). `phoneAwardsFrom()` takes `owned` as the core's list of ids (the older map `{id: day}` reads the same). Section 10 reads the toml
through `career_seed.py --json`; in the hook (index mode) the toml, the seed script, the checker, the snapshot and `coach.html` (the checker reads `SPINE_PATTERNS` from it) are cut out of the **index**, like `habits.html`, so a
file edited and not staged is never held against a staged one. **The guard now runs when `habits.html`, a `career/*.toml`, `scripts/career_seed.py` or one of the
three `*_cases.json` files is staged**, not only for `program.html`, `coach.html` and `chips.js` (pre-commit guard 15); each of these used to pass it unrun.
`scripts/test_check_twins.js` breaks the files on purpose (131 cases on 2026-10-18) and requires the guard to name the entry that drifted. All 65,472 checks agree (2026-10-18; section 11 is the weight units' lift-in-its-own-measure twin, 104 checks). `scripts/headless/career.js`, `sharecard.js`,
`highlight-reel.js` and `proof-cards.js` drive both apps.

**Measured on PGlite** (slower than the live project), on the longest real log (673 facts in the backup of 2026-10-05, 796 in the backup of
2026-10-17). Backup of 2026-10-05: a Proof save costs 45 ms more, a session save 3 ms more (budget 300); the first full evaluate 68 ms (budget 500); the skip
path 0.5 ms (budget 10); the baseline for all 51 athletes 3 s. Backup of 2026-10-17, stage70 alone, the run of 2026-10-18 on the current base (`--no-stage73`):
a Proof save 42 ms more (126.6 ms against 85), a session save 2 ms more (61.7 against 59.5); the first full evaluate 100.6 ms; the skip path 0.6 ms; the
baseline for 60 athletes (the made-up ones included) 5 s; the slowest first full evaluate of any athlete 100.8 ms. **`get_profile()` on the skip path is
a growth budget**, not an absolute: it may cost at most 100 ms more than phase 2's `get_profile()` on the same log, measured in the same run (it cost 3 ms more
in the last run, and between 7 ms less and 0.1 ms more in two earlier ones; the call itself takes 50 to 125 ms here because it reads the whole season).
`get_awards()` takes about 2 ms. Stage73 on top of it: *Stage 73*, below.

**The rehearsals start from the snapshot now** (2026-10-18). `supabase/schema_snapshot.sql` is the live structure, made again from the live project on 2026-10-18
(PostgreSQL 17.6, 48 tables, 179 functions), made again after stage73 went on; it holds stages 66, 69, 70, 71, 72 and 73 whole (`career_maxpct_key()` is in it), and the function bodies of the last four equal the repo's files. A rehearsal that
applied stage66 on top of it broke on `coach_erase_person()`. `scripts/career/rehearse_lib.mjs` (shared, not a rehearsal) holds what the three need: `ensureStages()`
applies, each twice, only the stages the database does not hold, in order, and says what the snapshot already holds; `filesAt()` cuts the career files of a commit
out of git, with that commit's own checker and seed script (`PHASE1_REV` 94cdc89, the rulebook the live project was seeded from; `PHASE2_REV` a219d5a), so phase 1 and 2
stay the rehearsals of phase 1 and 2 whatever the working files say now. `rehearse.mjs` (67 of 67, with the made-up pound and plate athletes of the weight-units
stages) takes `--phase1 <rev>` and `--no-stage70`; `rehearse_switch.mjs` (49 of 49) first takes the snapshot's stage70 and stage69 off with their own way-back files
(stage73 first, if the snapshot holds it; the weight units, stages 71 and 72, stay on and a check asserts they are untouched), so the way back is tested by what
follows, then seeds phase 1 and phase 2 from their commits, and takes `--phase1`, `--phase2` and `--no-stage70` too; `rehearse_catalogue.mjs` (181 of 181 for stage70
alone, 249 of 249 with stage73 on top, 251 of 251 with `--vs-awards`) takes `--cases-file <path>` with `--write-cases`, to look at a change to the cases before
replacing them, and `--no-stage73` (`--no-stage71` is refused: stage71 is the weight units), `--dump-awards`, `--vs-awards` and `--snapshot-rev` (*Stage 73*, below).
`STAGES` lists 66, 69, 70, 71, 72 and 73. The weight-units stages have rehearsals of their own beside these (`rehearse_measures.mjs` 27 checks, `rehearse_units.mjs` 7).
Stage70 goes on the project as it will stand when phase 3 ships (XP switch on), and the way back is run twice.

**The go-day, as run (2026-10-18, in the evening).** Amir's word in chat: "go live", then "yes, turn on the project and give everyone their awards". Before the switch: **stage73 was applied** (8 parts; the five function bodies, `career_maxpct_key()` and the four it replaced, equal to the file by md5; `career_maxpct_key()` closed to anon and authenticated), the catalogue was **re-seeded at rulebook version 3 with the switch still off** (the catalogue's md5 equal to the files, `career_compare()` `ok`), the safety copies were taken (`backup.golive_20261018_career_scores`, `backup.golive_20261018_hab_titles`, `backup.golive_20261018_career_rules`, `backup.golive_20261018_career_catalogue` and `backup.golive_20261018_career_facts`), each athlete's score under the old rules was kept (**39 athletes**, `backup.career_catalogue_before`) and the **dry run was read first**. Then the seed that only flips the switch (`catalogue = "2026-10-18"`, the same version 3), the baseline batches (every line `ok`) and `career_compare()` (`ok`). **The result:** 318 awards minted for 29 athletes (2 of them titles), 34,200 XP back-paid, 13 athletes up a level (at most 4 levels) and nobody down. The season board's points of two athletes went down a little and one athlete's went up: the old Proof badge pay that was dated inside Season 1 is replaced by awards dated on the days they were earned, which fall before the season (D1's cost). The Upgrade paid 15,800 XP, every tier on a main strength lift, and Double Up paid none. The repo side: `rulebook.toml` with its date, `privacy.html` §2.3, the `APP_GUIDE` wording, `sw.js` and the schema snapshot made again after stage73 (48 tables, 179 functions). **Left to do:** on 2026-11-01, `drop table backup.career_catalogue_before` and the five `backup.golive_20261018_*` tables.

**The go-day, as planned** (rollout step 4, after D1, D10 and D11 are answered **and stage73 is applied**; it has run, see above): **first check that stage73 is on the project**, `select to_regprocedure('public.career_maxpct_key(jsonb)') is not null`, which must say `true`. If it says `false`, stop and apply stage73 first (*To apply*, below). Stage70 does not refuse the switch without it: with the switch on under stage70's text alone, The Upgrade and Double Up ignore `patterns`, `qualities` and `exclude`, so the baseline batches would mint tiers on isolation lifts and on the four accessories Amir left out (on the backup of 2026-10-17 the back-pay is 43,900 XP in all against 33,900 with stage73), and a mint is never taken back (GAME-1). Then backup, `--catalogue-steps` batches 1 and 2, Amir reads the lines, the seed that only
flips the switch, the baseline batches, `career_compare()`, then one commit with the toml dated, `privacy.html` §2.3 and its *Last updated* (the text is
drafted outside the repo and held), the `APP_GUIDE` phrasing "Once Career Mode's rewards are on, ..." rewritten to the plain present, and the docs. 14 days
later: `drop table backup.career_catalogue_before`. **The way back** (Amir's word only): `scripts/career/rollback_stage70.sql`, dry first, then real, then
commit the toml with `catalogue = "off"`. **If stage73 is applied, run `scripts/career/rollback_stage73.sql` first and this file after it** (*Stage 73*, below; never `rollback_stage71.sql`, which is the weight units' way back; and if `rollback_stage72.sql` is ever run too, stage73's goes before that one as well): this file does not know `career_maxpct_key()` and would leave it behind. It restores every function stage70 replaced, drops the two tables and the cache column, un-patches the erase
function, and writes one `level_kept` fact (`catalogue-rollback`) for any athlete whose XP would fall, so nobody's level goes down. The apps fall back by
themselves.

**Stage 73: main lifts only, and paid sessions only** (`supabase/stage73_career_main_lifts.sql`, 2026-10-18). D18 is Amir's, relayed from the other phase 3 chat: "Have the session that owns the live phase 3 build make The Upgrade and Double Up count main lifts only, before the catalogue switch goes on". Asked then whether the accessories the Spine files under a main pattern (Cable Face Pull, Machine Reverse Fly, 45° Back Extension, Cable Straight-Arm Pulldown) should count, he answered: "Yes i want those to be exluded / You set up the rule for that". The rule Claude set up is built, in the first bullets below: a lift counts when its approved Spine entry is on one of the seven main patterns, carries the strength tag and is not one of four ids, a list that fails closed on a missing id (the `career_measures()` bullet, below). D19 (paid sessions, so Century and Home agree) was Claude's pick, and Amir chose to go live with it built, so it is in (*The decisions, round 4*, in `CAREER_MODE.md`). **Built, rehearsed and applied to the live project on 2026-10-18, before the catalogue switch** (8 parts, the five function bodies equal to this file by md5, `career_maxpct_key()` closed to anon and authenticated). Safe to re-run. **The number and the order.** It was built as "stage71" on an older base and renumbered when main's stage71 (`stage71_weight_units.sql`, the weight units) and stage72 (`stage72_weight_measures.sql`, a lift kept in its own measure) went live from another chat; if an old log or message says "stage71" for this fix, it means this file. It applies **after stage70, stage71 and stage72**, and opens with a guard (`do $stage73_order$`) that refuses, before it changes anything, when `public.career_awards` (stage70) or `public.career_lift_base(text)` (stage72) is missing. It replaces none of what stage71 and stage72 changed, so stage70's text is still the live text of the four functions below. While the catalogue switch was off nothing read it (`career_evaluate()` returns null at once, and `career_rewards_profile()` its empty answer), so applying it moved nothing an athlete sees. The switch went on after it. It replaces **four** stage70 functions whole, changing only these hunks, and adds one helper:
- **`career_maxpct_key(body)`** (new, immutable): the measure key of a best_value entry, read from its `patterns`, `qualities` and `exclude` (D18 as amended; `badges.toml` the_upgrade, `achievements.toml` double_up; the lists are rows, GAME-10). It is `maxpct` for an entry with none of the three, exactly as before; otherwise `maxpct:<patterns>`, with `|q:<qualities>` and `|x:<ids>` added for each of the other two keys the entry carries. Every list is sorted, de-duplicated and comma-joined, a string counts as one item, an empty item is dropped, an empty list stays (`|q:` with nothing matches no lift, `|x:` with nothing leaves nothing out) and a JSON null is no key. The catalogue's two entries read `maxpct:hinge,pull-horizontal,pull-vertical,push-horizontal,push-vertical,single-leg,squat|q:strength|x:back-extension-45,cable-face-pull,cable-straight-arm-pulldown,machine-reverse-fly`, which is also the `via` of their awards' evidence. An entry with only `patterns` reads the key the first build of this stage gave it (its old CASE sits inside this function byte for byte). `qualities` or `exclude` without `patterns` has a defined key (any pattern, a placed lift only), though the checker refuses such an entry in the catalogue.
- **`career_entry_keys()`** and **`career_achievement_eval()`** ask `career_maxpct_key()` for a best_value entry's key instead of the plain `'maxpct'`.
- **`career_measures()`**: (1) the `maxpct:<patterns>` family of keys (`maxpct:` or `maxpct|`, `career_maxpct_key()`'s) is the best `lift_gain` over the facts whose lift an approved Spine entry places and passes **three conditions**, in one set-based statement that reads `public.exercises`: the entry's `pattern` is one of the key's patterns (a key with no patterns takes any pattern, a placed lift only); when the key has `|q:`, the entry's `qualities` share at least one of the key's; when it has `|x:`, the entry's `id` is not one of the key's ids. The placing is the All-Court test's (`patterns_in_cycle`): an **approved** entry whose name or alias the lift is, compared with `career_norm()`; an excluded entry is out by every alias too, because the id decides. **A lift is matched with its measure taken off:** under stage72 a `lift_gain`'s `value.lift` is the exercise name as logged and its `ref` the series key (the plain name for kilograms, `name|lb` or `name|plates`: `career_lift_key()`), and the match asks `career_lift_base(career_norm(value.lift))`, so a main lift logged in pounds or plates counts in its own measure, an excluded one in plates stays out, and a `value.lift` that is itself a series key is placed too. Every real lift is in kilograms today, so no real number moves for it. A lift the Spine cannot place, files under a pattern off the list (isolation, carry, rotation, mobility), whose entry lacks the strength tag or is on the exclude list, counts for nothing. **The exclude list fails closed, on a missing id:** while any id in the key's `|x:` list has no row in `public.exercises` (a typo, an entry deleted, or an entry given a new id so that the old one is gone), the key counts no lift at all (the statement's `ks` is empty), so the list can never silently exclude nothing; The Upgrade and Double Up then read `have` 0 for every athlete and mint nothing, and every evaluate that reads the key writes one WARNING in the database log, `Career Mode: <key> counts no lift while <ids> in its exclude list is not in the Spine (no row in public.exercises; fail closed). Put the list (career/*.toml, then a re-seed) or the Spine right.`, naming the key and the missing ids, sorted (the save itself goes through). What it held back is minted, dated the day it was earned, at the first full evaluate after the list or the Spine is put right (GAME-1: a mint is never taken back, which is why excluding nothing would have been the worse way to fail). **A draft is no stop:** a drafted entry is placed nowhere, so it counts for nothing while it is one, and its id is still on the list when it is approved again. **One edge, pinned by a check:** an approved copy of one of the four under a NEW id, with the old row left beside it as a draft, is a new exercise to the rule and counts if it qualifies until its id is added to `exclude`; the stop fires only for an id with no row at all, so it cannot tell a copy from a new exercise. The cached rewards are looked at again when the stamp moves (an athlete's next fact, or an edit of an approved Spine entry, *The stamp*, below). For The Upgrade and Double Up that is *the seven main patterns, the strength tag, minus the four accessories Amir named* (D18 as amended, 2026-10-18; *To apply*, step 0, below). An empty list of patterns or qualities places no lift; an empty exclude list leaves nothing out. (2) `count:<kinds>` over a kind the rulebook caps (`limit_per`) counts only the facts `career_facts_paid()` pays (GAME-4): a plan day repeated in its week never moves Century. A finished and an early session share one cap, which pays the higher XP, so a count names both kinds, as Century does (the early kind counted alone would lose a session that a full finish of the same plan day in the same week replaces). A kind with no cap is counted as before. A count over a capped kind now costs about 53 ms instead of 1 ms on the longest log, because it calls `career_facts_paid()`, and **two counts do:** Century's (the two session kinds) and Same Effort's (`effort_win`, `limit_per = "cycle"`, three wins a cycle). **That is not only inside a full evaluate:** a full evaluate wakes both, so it pays the call twice, about 2 x 53 ms on the longest log. The `session_history` trigger (`career_on_session()`) runs a partial evaluate for the kinds the save changed, and a session fact wakes Century, so the call runs on every session save that changes a session fact and on every hide (a hide is an UPDATE; a DELETE is never evaluated); a save that also writes an `effort_win` fact wakes Same Effort as well, so the call runs twice (about 2 x 53 ms). Measured on the longest real log (the run of 2026-10-18 on the current base, against the same saves without Career Mode), a session save costs 51 ms more (97.8 ms against 47.2; stage70 alone, in the run beside it, 2 ms more) and a Proof save 58 ms more (125.7 against 67.8), both against the budget of 300, the worst single save stays inside its budget of 400, and the first full evaluate takes 218.7 ms on that log (134.2 and 152.4 ms on the next two longest, 224.4 ms at worst over all 60 athletes, made-up ones included) against 500. `career_facts_paid()` also prices every award row, which a count then throws away; a count-only variant would save that, and is not built because both budgets hold with room.
- **`career_rewards_profile()`** (D19, the Home row): the coached athlete's `numbers.four.commitment.value` is Century's own count, the sessions `career_facts_paid()` pays, so the row's *N sessions* and Century's caption (*N sessions with Amir*) never disagree. It is read from evaluate's cache, `p_rw.have[<badge id>]`, with no second pass over the paid facts. The badge is found, not named: the live `total` badge (not retired, not chosen) whose `career_entry_keys()` is exactly `count:session_finished,session_finished_early`; a cheap `kind = 'total'` test first keeps that function off the other badges. Fallbacks, in order: a stale cache gives the ladder's own number; no such badge holding a number (none in the catalogue, or a cache without it) works the count out with `career_measures()` (about 60 ms on the longest log, on this path only); that raising too is a warning and every session fact is counted, the phase 2 number, so `get_profile()` never fails over this. A free athlete's `perfect_days` does not move, and `get_profile()`'s older `numbers.sessions_with_amir` stays every session fact (the rehearsal asserts it). On the real rows 13 athletes move, always down to the paid count (three of them: 50 to 46, 74 to 72, 26 to 24).
- **The stamp.** A Spine pattern or tag change (any edit of an entry) reaches an athlete through `max(updated_at)` of the approved entries, which `career_rewards_stamp()` already holds, so the next full evaluate looks again. The rehearsal proves it with `updated_at` moved by hand. Stage73 also takes the stamp off the cached rewards, so the first evaluate after it is a full one.
- **The phones.** `program.html` `careerMoves()` adds nothing to a session ladder for a repeated plan day (the mirror of the `count:` change; the full log and the check-in still move). Home's Career row follows the same rule: `careerPendingSessions()` adds its +1 for a session finished on the phone and not yet counted by an answer only when the waiting record is a **paid** session, through `careerRecPaid()`, which reads, in this order, the record's `paid` (a number `careerEarnAtDone()` writes once the catalogue switch is on: this finish's own session, none for a repeat, plus the +1 the record it replaces still had waiting, because a plan day has one record and a repeat finished before an answer has counted the first session would otherwise take that +1 away), then its `repeat` flag, then, for an older record, its parts (a record with no `session` or `early` part is a repeat, exactly as `careerEarn()` has built it since phase 2); a record with none of these counts 1, as before. It returns 0 while the catalogue switch is off, and the record is written as before, so nothing changes until the switch. Without it Home would say 25 after a repeated day while Century says 24. The main-lift rule is the server's alone: the phones read the ladder the server hands them and neither previews The Upgrade or Double Up (`HABITS.md`, `PROGRAM-APP.md`). Both phone rules are twins held by `scripts/check_twins.js` §10.
- **`scripts/career/rollback_stage73.sql`**: the way back, on Amir's word only, after a backup. **With stage73 applied it runs FIRST, then `rollback_stage70.sql` if phase 3 itself goes** (the rehearsal's way back is rollback73 then rollback70): `rollback_stage70.sql` does not know stage73's helper `career_maxpct_key()` and run alone would leave it behind, and the next schema snapshot would carry it (its header says so too). **Never `rollback_stage71.sql` for this:** that is the way back of the weight units (`stage71_weight_units.sql`), which neither stage73 nor `rollback_stage70.sql` touches. Stages 71 and 72 stay whichever way back is taken, and a rehearsal check asserts they are untouched. **It also runs before `rollback_stage72.sql`, if the weight measures themselves are ever taken off:** stage73's `career_measures()` calls stage72's `career_lift_base()`, and `rollback_stage72.sql` drops it (its header says nothing is stored by stage72, so nothing else needs undoing, which is true of the data and not of stage73's function). The review of 2026-10-18 ran it in the wrong order on PGlite: `rollback_stage72.sql` finished with no error, and after it every `career_measures()` call that took The Upgrade's or Double Up's key raised *function public.career_lift_base(text) does not exist* (a count key alone still worked). `career_evaluate()` works all its keys out in one call, so with the catalogue switch on every full evaluate would fail: saves still go through, behind the triggers' exception blocks, but no reward moves until `rollback_stage73.sql` has been run. No file refuses the wrong order, so this sentence is the order. The file puts stage70's `career_entry_keys()`, `career_measures()`, `career_achievement_eval()` and `career_rewards_profile()` back byte for byte (stage71 and stage72 replace none of the four, so that is also their live text before stage73), drops `career_maxpct_key()` and takes the stamp off the cached rewards. An award minted while stage73 stood is kept (GAME-1). `patterns`, `qualities` and `exclude` can stay in the catalogue: stage70 reads none of them, so with its text back The Upgrade and Double Up count every lift again. Rehearsed: the four functions are stage70's text again, byte for byte as the database prints them, the helper is gone and all 178 functions compared are the same as before stage73; it is safe to run twice, and stage73 goes back on afterwards.
- **The checker** (`scripts/check_career.py`) accepts `patterns` only on a best_value entry that reads `lift_gain` (a badge with `kind = "best_value"` counting `lift_gain`, an achievement with `test = "best_value"` and `reads = "lift_gain"`), because the server reads it nowhere else (`career_maxpct_key()` is reached from the best_value branches alone) and a `patterns` key anywhere else would be silently ignored; it refuses it there, and holds every name to the Spine's pattern list (`SPINE_PATTERNS`, read from `coach.html`, so a pattern that does not exist is refused). Its two companions, `qualities` and `exclude`, are accepted only beside `patterns` on the same entry (GAME-10): `qualities` is a non-empty list of the Spine's ten (`QM_IDS`, read from `coach.html` when the checker runs, never copied), `exclude` a non-empty list of Spine ids in kebab-case, each once; the checker has no database, so it cannot tell whether an id is an approved entry (the rehearsal asserts that on the real Spine, and *To apply*, step 0, does it again on the live one; the server fails closed on an id it cannot find, the `career_measures()` bullet, above). Because it reads `coach.html` (`SPINE_PATTERNS`, and `QM_IDS` for a `qualities` list beside `patterns`), pre-commit guard 20 now also runs when `coach.html` is staged (before, only a `career/*.toml`, the checker or `supabase/xp_rules_snapshot.json` ran it); `scripts/test_check_career.py` has 114 tests. `scripts/check_twins.js` holds the `repeat` cases of the phone's mirror and the pending-session rule; its §10 also pins The Upgrade and Double Up to carry a non-empty `patterns`, `qualities` and `exclude`, equal in `badges.toml` and `achievements.toml` (one decision, two files: without the pin, dropping `qualities` from one file would let accessories count again for that one reward), and `scripts/test_check_twins.js` breaks each of these on purpose.
- **Rehearsed** by `scripts/career/rehearse_catalogue.mjs --backup aa-backup-2026-10-17.json`: the stack in the order the live project has it (stage70; then the weight units, stages 71 and 72, each twice, which the snapshot already holds, so the files must put back exactly what it holds: 178 functions compared, none moved), stage73's guard refusing without stage72 and without stage70 (each tried by renaming the thing away for one try, nothing changed), stage73 twice, and the way back (`rollback_stage73.sql` then `rollback_stage70.sql`) twice. **249 of 249** (197 s). Adding `--vs-awards <file>` makes it **251 of 251** (264 s): the two extra are *the file holds every real athlete* and *everything else as before*, below. The count grew in rounds: 215 for the first build and its repair round, 231 with Amir's answer on the accessories, 236 with the fail-closed round and its warning, 249 with the port onto main. Of the 215, ten came with `career_rewards_profile()`; they hold the commitment of every athlete, through `get_profile()`, equal to the paid session count and to Century's `have`, the cache and both fallbacks each in an undone transaction, a free athlete's number unchanged and the stale profile still answering the four numbers. Four came with the repair round: the made-up athletes zz_cap_e, zz_cap_ef and zz_cap_fe (one plan day in one week: an early finish only, early then in full, in full then early), what a count of each pays (both kinds together and the finished kind alone never go down as sessions are added; the early kind alone does, so a count names both), every count in the catalogue held to that, and the lift behind every real The Upgrade tier and Double Up being an approved Spine entry that passes the rule. **Sixteen more checks came with Amir's answer on the accessories (D18 as amended):** `career_maxpct_key()` over the keys and lists it can meet (nine cases beside the five of the first build: patterns with qualities, with exclude, the rule as the catalogue writes it, lists and keys in another order, strings, duplicates and an empty item, empty lists, qualities with no patterns, a JSON null); `career_measures()` called with each of five keys (`maxpct`, the patterns, plus strength, plus exclude, the rule) on made-up athletes (45° Back Extension at +150% counts by the patterns and by the strength tag and is 0 once its id is excluded; Cable Chest Press at +150% counts by the patterns and by the exclude list and is 0 once strength is asked; Barbell Back Squat counts every way; the excluded lift beside a main lift at +25%: the rule reads the squat alone; the first build's cases unchanged; an empty `qualities` list matches no lift, an empty `exclude` list leaves nothing out, an excluded entry is out by its alias too, a key with no patterns takes any placed lift, a draft is placed nowhere); the catalogue rows of The Upgrade and Double Up carrying equal `qualities` and `exclude` and no other entry carrying either; **every exclude id being an approved entry of the real Spine**; an independent re-derivation of every The Upgrade tier, Double Up and NEW ENGINE under the full rule, tier by tier and day by day, equal to the server's (22 athletes with a lift gain, 16 with a tier); each real award's evidence naming a lift that passes all three conditions, with the catalogue's key as its `via`; the made-up athletes zz_ml_bext (45° Back Extension at +150%: no tier, no Double Up, no NEW ENGINE), zz_ml_cchest (Cable Chest Press at +150%: nothing), zz_ml_bbs (Barbell Back Squat at +150%: all five tiers, Double Up and NEW ENGINE) and zz_ml_mix2 (the excluded lift at +150% beside a squat at +25%: tiers 1 and 2 only, both on the squat); and the live door (a leg curl the Spine moves onto hinge with no strength tag mints nothing; tagged strength as well it mints The Upgrade, Double Up and NEW ENGINE at the next `get_profile()`; moved back, nothing is taken away). **Five more came with the fail-closed round (231 to 236), and the port round put them to the rule as built, a stop on an id with no row only:** a key naming an id the Spine does not have counts no lift, alone or beside a real id; `back-extension-45` made a draft is no stop (Barbell Back Squat at +150% still reads 150%, the back extension 0 with the list and without it, because a draft places nothing); with the entry given a new id the strength rule alone would count the back extension again (150%) and the rule counts nothing (the squat reads 0%), and deleted, nothing either; put back, the rule reads the squat (150%) and not the back extension (0%); an approved copy of the back extension under a new id, beside the old row made a draft, is a new exercise to the rule and counts (150%) until its id is on the list as well (then 0%); one WARNING in the database log names the key and every id with no row, sorted, where the rule's key with its four ids in the Spine (one of them a draft), a key without `|x:` and plain `maxpct` raise none; and three through the live door (the back extension's entry re-keyed: a session with it +150% and Barbell Back Squat +25%, saved through the door, mints no tier of The Upgrade, no Double Up and no NEW ENGINE, and once the id is moved back the next `get_profile()` mints The Upgrade tiers 1 and 2 on the squat, dated the session's day; the entry made a draft: nothing stops, the same sessions mint tiers 1 and 2 on the squat at once, and approved again nothing more is minted; the transactions undone, the Spine as it was). **Thirteen came with the port onto main (236 to 249):** the weight units' two stages put on top of stage70 twice, the guard's refusals and the things put back, and the pounds and plates cases: the measure of a lift kept per series, Barbell Back Squat in pounds (+150%, the series `barbell back squat|lb`) counting under the rule, the excluded 45° Back Extension and Machine Reverse Fly in plates counting for nothing where the strength rule alone would read 150%, a `value.lift` that is itself a series key placed too, and three made-up athletes through the live door: zz_ml_lb (Barbell Back Squat 100 to 250 lb: all five tiers, Double Up and NEW ENGINE, every evidence ref the `|lb` series), zz_ml_plates (the two excluded lifts in plates at +150%: nothing) and zz_ml_plmain (Machine Leg Press 8 to 13 plates, +62.5%: tiers 1 to 4). `--no-stage73` gives phase 3 as applied (the "before" numbers; its check 3b proves the old behaviour followed all lifts and the commitment was the raw count; **181 of 181** in full, 180 s). `--vs-awards <file>` compares this run's awards with another run's (`--dump-awards`, with the lift behind each The Upgrade tier and Double Up): *everything else as before* passes, and it lists the awards that changed and the ones that kept their day and XP but rest on another lift now. On the last round's run of record (the old base) the other run was the first build of this stage (the patterns alone): 24 awards differ (badge:the_upgrade 18, achievement:double_up 3, title:new_engine 3), five of them real (Athlete A's tiers 2 to 4 withheld; Athlete B's tiers 1 and 2 dated 2026-10-14, not 2026-10-12; the letters are *What it changes on the real tiers* in `CAREER_MODE.md`) and 19 the made-up athletes' (the new test cases), none added; The Upgrade's real back-pay 18,500 to **15,800 XP** and **36,600 to 33,900 XP** in all; the port changed no real number. **Against stage70 alone** (a `--no-stage73 --dump-awards` run, then `--vs-awards` on the full run: the two extra checks): of the 659 awards stage70 alone gives in the rehearsal (real and made-up athletes), **77 differ** (68 withheld, 9 dated later; badge:the_upgrade 47, badge:century 10, achievement:double_up 10, title:new_engine 10), none added; 21 are real athletes' (14 withheld, 7 dated later), and seven of the others are the made-up zz_ml_plates' (the two excluded lifts in plates earned all five tiers, Double Up and NEW ENGINE under stage70 alone). Real athletes: The Upgrade's back-pay **23,900 to 15,800 XP** (32 awards to 24, nine holders to eight; one athlete drops out, Athlete A loses tiers 2 to 4, 2,700 XP), Double Up and NEW ENGINE: two athletes lose both (1,000 XP; the title pays 0), Century **3,900 to 3,000** (one athlete loses a bronze, one a silver, three more bronzes are dated later); **43,900 to 33,900 XP** in all. With the switch off every athlete's score and profile are identical after stage73. The two older rehearsals stop at stage70 and never apply stage73: `rehearse.mjs` **67 of 67** and `rehearse_switch.mjs` **49 of 49**, and the weight units' own `rehearse_measures.mjs` (27) and `rehearse_units.mjs` (7) pass beside them. The snapshot the rehearsal starts from already holds stage70 in the working tree, so the script starts from the last committed snapshot without `career_awards` (e6530ae on the last run) and says so (`--snapshot-rev` overrides).
- **Measured** on PGlite, the run of 2026-10-18 on the current base (the longest real log, medians; the numbers for saves and the first full evaluate are in the `career_measures()` bullet, above): `get_profile()` on the skip path costs **3 ms more** than phase 2's on the same log (50.8 ms against 47.6 on a clone of the log, 125.1 against 121.8 on the real athlete's own), against the growth budget of +100 ms; a full call is about 345 ms. The skip path calls no measure (a rehearsal check makes `career_measures()` raise and the commitment still comes from the cache), so the spread between runs is the PC's load, not the rule. D19's commitment hunk costs 1.3 ms on the skip path and nothing on a full call (6 ms less). The cost that grew is a session save, not the profile read. `career_rewards_profile()` alone takes about 2.6 ms from the cache and about 62 ms worked out. The core is 7,603 bytes on the largest real career (57 awards; 58 awards and 7,626 bytes under stage70 alone, one fewer being the Century silver that 46 paid sessions no longer reach) and 8,995 bytes on the simulated 207-award one, against the 14 KB budget (14,336). The skip path itself takes 0.5 to 0.6 ms (budget 10).
- **Fixed since the first write-up.** (a) `scripts/career/rehearse_lib.mjs`: `STAGES` lists 66, 69, 70, 71, 72 and 73; the three after 70 make no table, so each has a function marker (`fn: true`, asked with `to_regprocedure()` by `holdsStage()`): stage71 `public.career_kg(jsonb)` whose definition must hold the word `plates` (the way `rehearse.mjs` tells it from stage66's), stage72 `public.career_wn(jsonb)`, stage73 `public.career_maxpct_key(jsonb)`; `holdsStage()` learned that `body` reading; `filesAt()` copies `coach.html` into the scratch folder (the rev's own, else the working tree: the checker reads `SPINE_PATTERNS` from it); and `py()` skips only the Windows Store stub's own message (`STORE_STUB`), so a checker error that says "was not found" comes back as the checker's error and no longer as "No python found". `rehearse.mjs` (67 of 67) and `rehearse_switch.mjs` (49 of 49) are green with it. (b) `scripts/check_twins.js` `catalogueSeed()`, the index-mode copy that §10 seeds from, now copies `coach.html` too (from the index, else the working tree). The first write-up named the wrong cause: staging `program.html` and `check_twins.js` together did **not** clear the five misses of `scripts/test_check_twins.js` in index mode (exit 2); the missing `coach.html` did, because without it `check_career.py` cannot read `SPINE_PATTERNS` and `career_seed.py --json` refuses. Proved by taking `coach.html` out of the copy list for one run (the index-mode case came back "NOT caught") and putting it back. `test_check_twins.js` now passes in full (121 cases when this was found, 131 on 2026-10-18 with the weight units' twins).
- **Open.** (c) The run needs `PYTHON=C:/Python314/python.exe` on this PC (node's plain `python` hits the Store stub). (d) That `coach_save_spine()` bumps `updated_at` on a pattern or tag edit: read in the code, not run on a live save. It ends in a plain `update public.exercises` (stage65), and the `BEFORE UPDATE` trigger `exercises_touch_updated_at` (stage46, `touch_updated_at()`) sets `updated_at := now()` on every update, which is what `career_rewards_stamp()` reads. The first Spine pattern or tag edit after the apply is the live check. (e) Only the database log tells anyone when the exclude list stops the rule: one warning at every evaluate that reads the key, naming the key and the missing ids. There is no error, nothing on coach.html's Today, and an athlete just sees two rewards that stop moving. The check is the four-row query in *To apply*, step 0, run after any edit of those four entries or of the two `exclude` lists. A line on Today when an exclude id has no Spine row is not built; whether it is worth one is Amir's call.
- **If D19 is ever a no.** Stage73 is applied now, so only *After the apply* below is open. D18 stands whatever Amir says about D19; the two were built apart so one can come out. D19 is two hunks of stage73 and the phone's mirror of them. *Before the apply:* in `supabase/stage73_career_main_lifts.sql` put stage70's text back for the `count:<kinds>` branch of `career_measures()` (the capped count; the `maxpct` branch, with its `|q:` and `|x:` filters, stays) and for the whole of `career_rewards_profile()`, drop the header lines that name them, and keep `career_maxpct_key()`, `career_entry_keys()` and `career_achievement_eval()`; `scripts/career/rollback_stage73.sql` then has no `career_rewards_profile()` to restore. (A build of the file with D19's hunks left out was made once and rehearsed on PGlite: it applies, replaces three functions and adds the helper, its way back restores every function, and the full file then applies on top of it.) *After the apply:* an applied stage file records what ran, so it is not edited; a new stage file (the next free number) puts `career_measures()` and `career_rewards_profile()` back to stage73's text without D19's hunks. Nothing is minted before the catalogue switch, so there is nothing to take back (GAME-1). *In the repo, either way:* `program.html` loses the `repeat` rule in `careerMoves()` (the `&& !e.repeat` on the two session lines, and the flag `careerEarn()` passes) and the paid-session read of Home's waiting records (`careerRecPaid()` and what calls it, and the `repeat` and `paid` fields `careerEarnAtDone()` writes), back to adding 1 for every record; the cases for them come out of `scripts/check_twins.js` §10 and `scripts/test_check_twins.js`, the six `repeat` vectors out of `scripts/career/reward_cases.json` (`moves` 18 back to 12; write it again with the rehearsal's `--write-cases`), the repeat checks out of `scripts/headless/career.js`, and the sentences that name D19 out of the docs (`grep -n "D19" career/*.md *.md`); `sw.js` gets its cache bump with the `program.html` change as always. The rehearsal's Century and commitment checks are rewritten to stage70's behaviour. The phone's half sits behind `catalogueOnT()`, so while the switch is off it does nothing whichever way Amir answers; if it ships to `main` before he answers it is inert, and taking it out is an ordinary commit, not an emergency.
- **To apply** (done on 2026-10-18, all before the catalogue switch went on; the steps below are the record of what was run and checked, and step 0 is still the check to repeat after any edit of the four entries or the two `exclude` lists): (0) **The main-lift rule is answered, so it does not block the apply, but its edges are still his to see:** he answered on 2026-10-18 ("Yes i want those to be exluded / You set up the rule for that"), left the rule to Claude, and it is built (`CAREER_MODE.md`, round 4, as amended: *What counts as a main lift*). Three things to do. **Say in the apply message what the strength tag leaves out**, because he has never seen the list and the rule is Claude's: the loaded entries not tagged strength (Single-Leg Romanian Deadlift, Cossack Squat, Lateral Lunge, Lateral Step-Down, Kettlebell Swing, Single-Arm Landmine Push Press, Half-Kneeling Bottoms-Up Kettlebell Press, Cable Chest Press, Machine Incline Chest Press, Single-Arm Cable Row, Half-Kneeling Single-Arm Lat Pulldown) and Half-Kneeling Single-Arm Cable Row, which is the one with a real gain behind it (Athlete B, 21.9%; that athlete's tiers 1 and 2 are dated 2026-10-14 under the rule, not 2026-10-12). Add that a strength tag put on any of them in coach.html → Exercises brings it in with no code change. **Say too that the exclude list fails closed on a missing id:** an id with no row in the Spine (a typo, or one of the four entries deleted or given a new id) switches The Upgrade and Double Up off for everyone until it is put right, with a warning in the database log and nothing else; taking one of the four back to draft does not. **Make the report again on a fresh backup just before the apply** (`rehearse_catalogue.mjs --backup <the fresh backup> --report <a file outside the repo>`; add `--vs-awards <file>` against a `--dump-awards` file for the diff): the numbers in the docs (The Upgrade 15,800 XP, 24 tiers to 8 athletes, 33,900 XP in all, 39 of 105 entries left out) are of the backup of 2026-10-17, and a newer backup, or a Spine edit since, moves them (a strength tag added or taken off brings an entry in or out); read the report's `left_out` list once more. **Check that every `exclude` id still has a row in the Spine**, on the live project: `select id, name, status, pattern, qualities from public.exercises where id in ('back-extension-45', 'cable-face-pull', 'machine-reverse-fly', 'cable-straight-arm-pulldown')` must return four rows, all `approved` today (the rehearsal asserts it on the backup's Spine). **This is the check that matters, because the rule fails closed:** an id that was renamed or deleted does not leave the list excluding nothing, it makes the key count no lift at all, so The Upgrade and Double Up mint nothing for anyone until the Spine or the list is fixed; a row made a draft does not (a draft counts for nothing and keeps its place on the list). Run it again after any edit of those four entries or of the two `exclude` lists (the checker passes a typo that is valid kebab-case). (1) a backup (coach.html → ⚙ Tools → ⤓ Backup). (2) Stages 70, 71 and 72 are live (the file's guard refuses otherwise and changes nothing); then `supabase/stage73_career_main_lifts.sql` through the Supabase tool, as one batch or in parts with the guard as the first part (the file has no `begin` and `commit`, like stages 66 to 72, so a psql run without `ON_ERROR_STOP` would carry on past the guard), every function body checked against the file afterwards and `career_maxpct_key()` closed to anon and authenticated. (3) Re-seed the catalogue with the switch still off: `python scripts/career_seed.py --out "$TEMP/career-seed.sql"` (the toml now carries `patterns`, `qualities` and `exclude`; re-seed after any `.toml` edit; a catalogue seeded before it did has none, and then the two entries read every lift), run its one statement, then `select public.career_compare()` must say `"ok": true`, and the two rows (kind `badge`, id `the_upgrade`; kind `achievement`, id `double_up`, in `public.career_catalogue`) must carry the same `patterns`, `qualities` and `exclude` in their `body`. A bump of `rulebook.toml` `version` is optional here (the seed accepts the same version; a bump only keeps the old rulebook row beside the new one, `career_seed.py`'s header), and the catalogue switch's own seed later is at the same version as the one loaded. (4) A new schema snapshot in the same commit (CLAUDE.md, the restore rules: the three commands in `scripts/restore/README.md`, then `scripts/restore/rehearse.mjs`). The snapshot in the repo was made from the live project on 2026-10-18 and holds stages 66 to 72 but not `career_maxpct_key()`; after the apply it is made again, and `career_maxpct_key` must appear in it, with the bodies of `career_entry_keys`, `career_measures`, `career_achievement_eval` and `career_rewards_profile` equal to this file's. **Done on 2026-10-18 (48 tables, 179 functions, the five bodies equal to this file's with whitespace folded).** (5) Read back that it is on, with the check that opens the catalogue switch's go-day (*The go-day*, above): `select to_regprocedure('public.career_maxpct_key(jsonb)') is not null` says `true`. Without it, a switch turned on early mints tiers on accessories. The phone's half (`program.html`) goes out in a commit with the usual `sw.js` cache bump.
- **D20, forward-only rule changes: BUILT on 2026-10-19 (stage76; *Stage 76: D20, as built*, at the end of this file). What follows is the reading it was built from.** Amir, 2026-10-18 (his words are in the D20 row of `CAREER_MODE.md`): after go-live a change of rules applies from a start day on, and nobody's XP, level or awards are worked out again for it. What has to change before the first rule change (Claude's reading, to be designed with Amir): (1) the rulebook gets a start day per version, and a fact is priced by the version in force on its day (today `career_rules_now()` is one current row and every athlete's score is worked out again from the facts at the next evaluate); (2) `career_award_xp()` reads the XP an award was minted with (kept at mint today only for display and as the fallback) and not the current catalogue, which reverses D12; (3) a rename changes the label only, which is already true; (4) a bug fix is asked of Amir, backwards or forwards, never decided; (5) P16 step 3 stops saying every athlete is worked out again; (6) the rehearsal and `career_compare()` get a case for a rule changed on a later day. **Until it is built, change no XP value, cap, tier's `at` or `xp`, or what earns an achievement** (a rename is safe). It is a stage of its own, numbered when it is planned.

**What it does not do yet:** no coach rows, reactions or commendations (phase 4); no weekly missions (phase 5); no Bell lines or kudos (phase 6); no quest
titles (phase 7); no Farsi name or caption for a reward (Amir writes them; the share card falls back to English); no training-app moment for a plain level-up.

## Stage 75: Courtside, as built (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"Yes continue untill we are finished with our plan"*): read back as the stage file's header says;
the schema snapshot (53 tables), coach.html's `BACKUP_TABLES` and `scripts/test_restore_backup.py` (check 2g) were updated in one commit, and the restore
rehearsal passed (49 of 49). September 2026's honours, worked out live: most sessions 14 (one athlete), no main-lift gain, Full Month nobody, three
athletes one week short. coach.html freezes them on its first load (it is past the 8th).

Round 5, step 1 (`CAREER_MODE.md` → *Round 5*, L2, L10, L11). Amir picked direction A of the design page (https://claude.ai/artifact/L3Tt3B6YPqMWcVgnN7nt9g)
with "Go with your picks" on 2026-10-19, which also answered its two calls: athletes see the goal, his line and "Amir saw this" with the light
screens (step 3), not before; a tie shares an honour. **Nothing here pays XP, mints an award or touches the scorer** (L11), so it did not wait
for D20. The stage number: `stage74_publish_cycle_label.sql` took 74 on 2026-10-19, so Courtside is **stage75** and every later step of plan A
moves up one (D20 = stage76, the cut = stage77, Crew = stage78, the Monthly Open = stage79), and again with step 3's read (stage77,
`get_my_moments()`): the cut = stage78, Crew = stage79, the Monthly Open = stage80; and once more with the new achievements (stage79, 2026-10-19):
Crew = stage80, the Monthly Open = stage81.

**The file** `supabase/stage75_career_courtside.sql` (safe to re-run; a guard refuses without stages 66 to 73):
- **Five tables, coach-only** (select for the coach, so the backup reads them; no direct write for anyone, every write is a function below):
  `courtside_marks` (Saw it and sent, per award), `career_honour_months` (a month whose honours are frozen, and the Pick: `picked`, `nobody` or
  undecided), `career_honours` (one row per winner, a tie is several rows; honours `sessions`, `improved`, `full_month`, `near` (one week short)
  and `pick`), `career_goals` (one line per athlete per month, 1 to 140 characters, and the day it was ticked done) and `career_notes` ("From Amir":
  one line per athlete per day, 1 to 90 characters, optionally the award it answers, and `read_at`, which step 3's app will write).
- **`career_is_client(id, not_clients)`**: not `demo`, not a former athlete, not one of the ids coach.html passes (`p_not_clients`: its `SYSTEM_IDS` and `AMIR_ATHLETE_ID`, Amir's own login), so the server's set is coach.html's `inTotals()`. The page passes the list because a stage file cannot name that login (pre-commit guard 6 keeps athlete ids out of public files); `get_courtside()`, `coach_honours()`, `coach_honours_freeze()` and `coach_honours_pick()` take it, and without it only the demo and former athletes are left out.
- **`career_main_lift_names()`**: the names (`career_norm()`) of the lifts D18 counts, from **Double Up's** catalogue row (an achievement, so it
  outlives the cut) through `career_maxpct_key()`; a twin of stage73's `ks` and `sp` in `career_measures()`, so change both. It fails closed (no row, no
  patterns, or an exclude id missing from the Spine: no lift, so no Most improved that month).
- **`career_honours_live(month)`** works the month out from the facts, for the clients with a fact in the month.
  **Most sessions** = the plan sessions `career_facts_paid()` pays (D19); everyone on the top count (at least 1) shares it.
  **Most improved** = `career_cycle_wins()` over the month (each lift's first session in the month against its best since, at the same effort:
  the wins card's own rule, PROG-01), every win (the rulebook's limit of three is lifted for this), main lifts only; the biggest percent, rounded
  to 0.1, shares. **Full Month** = every training week that ENDS in the month (`career_weeks()`) has its `week_held` fact, and at least 4 such weeks;
  **one week short** = at least 4 and exactly one not held. **The Pick's shortlist**: three different people (most `week_held` facts dated in the
  month; the biggest main-lift gain; the most `training_return`, `bounce_back` and `comeback` facts, the longest time away breaking a tie).
- **`get_courtside(from, to)`** (coach only, a window of at most 35 days): the awards minted LIVE in the window (never the go-day's baseline
  back-pay), size `highlight` up, kinds that stay after the cut (badges `held_weeks`, `century`, `bests`, `comebacks`, and every achievement),
  clients only, each with its share spec, its evidence facts and Amir's marks. It reads `career_awards` and writes no coach row anywhere, so
  `career_mint()` and `career_recognition` are untouched (the old phase 4 spec's route through them was not needed).
- **`coach_courtside_mark(id, award_ids, 'saw' | 'sent' | 'undo')`**: sent is seen too; Undo deletes the mark. Returns how many of the ids are that
  athlete's awards (0: none, and the page says so).
- **`coach_honours(month)`** (a month that has ended): the frozen rows once frozen, else the live work, plus the Pick (decided, or its shortlist)
  and `pick_open` (until the end of the month after). **`coach_honours_freeze(month)`** writes the winners once (re-running changes nothing);
  coach.html calls it before the first honour is sent or the Pick is made, and on its first load from the 8th. **`coach_honours_sent()`** marks a winner
  sent (0 when that person is not a winner, e.g. a late session moved the result at the freeze). **`coach_honours_pick(month, id | null)`**: one
  client, or nobody; freezes first; once decided it stays decided (a mistake is fixed in the SQL editor). No title and no award (titles are removed, L5).
- **`coach_set_goal(id, month, line)`** (last, this or next month; an empty line clears a goal that is not ticked) and **`coach_goal_done(id, month, bool)`**.
- **`coach_from_amir(id, day, line, award_id)`** (the coach's day, within a day of the server's; one a day; an empty line takes back an unread one; a
  former athlete, the demo and Amir's own login get none).
- `coach_erase_person()` learns `courtside_marks`, `career_honours`, `career_goals` and `career_notes` (the month table holds no person).

**The page** (coach.html, `COACH_DASHBOARD.md` → *Courtside*): `loadCourt()` after the first paint; Today's right column opens with the panel;
the goal line and "From Amir…" sit under the athlete's name. `COURT_LINES` holds the WhatsApp lines, a copy of `recognition.toml`'s
`[message.*]`; `scripts/check_career.py` **rule 22** fails a commit where the two differ. The new lines reach `career_catalogue` with the next seed
(D20's); nothing on the server reads them. The page hides everything while `get_courtside()` is missing (`courtMissing()`).

**Rehearsed** by `scripts/career/rehearse_courtside.mjs --backup <aa-backup>` on PGlite: the schema snapshot (every stage through 74), the
backup's real rows, stage75 twice, then 86 checks: grants and refusals; the ids coach.html passes as not clients left out of Courtside and the honours; the main-lift names equal to a re-derivation from the Spine (66 names
on the 2026-10-18 backup) and failing closed; every honour of August, September and October re-derived in the script (Most sessions 16, 14 and 7
so far; Most improved +0, +0 and +27.1% on a main lift, with off-list lifts at +15% and +150% left out; Full Month 0; one week short 0, 3 and 0;
each month in about 0.4 s); freezing twice, sending, the Pick (nobody, a client, a second pick refused, the demo refused, a closed month refused,
no title or award minted); Courtside's filter on made-up awards (live only, highlight up, the kinds that stay, clients only, this week only); the
marks, the goal and the line with every refusal; an erasure that empties the four tables; no fact, score, rulebook or catalogue moved; the way back
(`scripts/career/rollback_stage75.sql`, twice: the erase list back exactly as before, the frozen honours copied to the backup schema first); and
stage75 again after it. A backup taken before the go-day's seed holds Double Up without D18's rule; the rehearsal then takes that row from
`career/achievements.toml`, as the live project has it.

**To apply** (Amir's yes first): no backup is needed for the apply itself (it adds tables and functions and changes no row; the one existing object it
touches, `coach_erase_person()`'s table list, is put back exactly by the way back); `stage75_career_courtside.sql` through the Supabase tool (`apply_migration`); read back the five
tables, the functions and their grants (anon executes none; the helpers are the service role's only); `coach_honours()` for the month just gone as
the coach; then, in ONE commit: `supabase/schema_snapshot.sql` remade (`scripts/restore/README.md`), coach.html's `BACKUP_TABLES` with the five
tables, `scripts/test_restore_backup.py` counting them, and `scripts/restore/rehearse.mjs` run. The way back: `rollback_stage75.sql`, on his word only.

## Stage 76: D20, as built (2026-10-19)

Round 5, step 2 (`CAREER_MODE.md` → the D20 row; built on Amir's *"Yes continue untill we are finished with our plan"*). `supabase/stage76_career_forward_only.sql`,
**APPLIED to the live project on 2026-10-19** (migration `stage76_career_forward_only`). Nothing moved: a dry run in a rolled-back transaction first, then the
real apply, both read back as 41 athletes with every paid fact and award the same and 278,395 paid XP before and after; `career_compare()` ok.

- **An award keeps the XP it was minted with** (`career_awards.xp`), which REVERSES D12. The five readers that priced an award again from the catalogue
  now read the minted XP: `career_facts_paid()` (the score, re-created) and `career_compare()`, `career_rewards_line()`, `career_rewards_profile()` and
  `get_awards()` (each patched in place: the one expression replaced, marked `/* stage76: minted XP */`). On 2026-10-19 all 322 awards' minted XP
  equalled their price, which is why nothing moved. `career_mint()` still prices a NEW award from the catalogue at the moment it is minted.
- **A fact is priced by the rulebook version in force on its day.** `career_rules.starts_on` (null for versions 1 to 3, which count from always);
  `career_rules_on(day)` is the newest version whose start day is null or on or before that day; `career_facts_paid()` takes each fact's XP,
  `career_only` and cap from its own day's version.
- **The seed's door, `career_d20_check()`** (called by `career_seed()` before it writes, patched in place). The same version seeded again may change
  only labels: names, captions, `from`, `rule`, a fact's `when`, `cap`, `source`, `pays_for`, `meaning`, a tier's `tier_name`, every message, size, tool and
  setting (`career_d20_prices()` and `career_d20_core()` compare the rest). A NEW version needs `starts_on` = today or yesterday (the catalogue is replaced at
  the seed, so a version starts the day it is seeded); it may change a fact's `xp`, `xp_from`, `career_only`, `limit`, `limit_per` and anything in the
  catalogue; it may not change `[habits]`, `[level]`, `[season]`, `[week]`, `[share]` or anything else in an existing fact (how it is worked out:
  `min_share`, `weeks_away`, `window_days`, `min_gain`). Each refusal says why and changes nothing.
- **A reward a rule change reveals for an earlier day is dated the start day** (`career_mint()`, one line): a tier lowered in version 4 mints, for
  someone who already passed it, on version 4's first day, never back-dated into a closed week or season. A session that syncs after a version starts
  but was trained before it is dated the start day too (accepted: the window is the day of a change).
- **How to change a rule now** (`career/README.md`): raise `version` in `rulebook.toml`, set `starts_on = "<today>"`, change the numbers or the catalogue,
  `python scripts/check_career.py`, `python scripts/career_seed.py --dry-run` (read its answer), then the seed on Amir's word. A rename: change it,
  check, seed at the same version. `scripts/check_career.py` accepts `starts_on` (YYYY-MM-DD) at the top of the rulebook.
- **Rehearsed** by `scripts/career/rehearse_d20.mjs` on PGlite: 45 of 45 (the snapshot, the files' rulebook and catalogue, made-up athletes through the real
  triggers): nothing moves on the day; an award keeps its minted 300 when the catalogue says 9999; every refusal and every pass of the door; version 4
  with a start day prices the five earlier sessions at 400 and today's at 450; Century's second tier lowered to 4 mints on the start day for an athlete
  whose fourth session was 5 days earlier; a rename of version 4 passes and keeps its start day, a price change at version 4 is refused; the way back
  refuses while a version has a start day, then puts all seven functions back exactly; stage76 again after it.
- **The way back**: `scripts/career/rollback_stage76.sql`, on Amir's word only, and only while no version has a start day.

## Stage 78: the cut, as built (2026-10-19)

Amir, 2026-10-20 (L5, L6): *"Just remove names and titles and badges"*, *"removed means removed from the server too"*, *"Do not change people xp and
level"*. Applied 2026-10-19 on his word, *"yes, go live with the cut"*, after the before-and-after page (https://claude.ai/artifact/GQankmurwZmMNCi9mAaEWn).

- **What left the server:** every badge but the four marks (34 kinds, 240 awards from 23 athletes), every title (29 in the catalogue, 2 title awards,
  77 rows of `hab_titles`, 13 titles worn on the board), the Grand Slam, the 4 card skins, the rank NAME from every answer (`get_profile()`,
  `career_compute()`'s cached score, `leaderboard_top()`, `roll_call()`; the level stays). The marks (`held_weeks`, `century`, `bests`, `comebacks`)
  and every achievement stay; an achievement or a mark tier that gave a title keeps its row and lost the title.
- **Nobody's number moved:** each paying award that left became a nameless fact, kind `award_kept`, on its own day, its value `{"xp": n}` and
  `"proof": true` when it was one of AA Proof's own badges. `career_facts_paid()` pays it its own XP (never priced by a rulebook, never career-only,
  only with the catalogue switch on), so the career, the season and the week are exactly as they were. `career_compare()` counts the `proof` ones in
  its carried-over check (Proof's tiers and milestones up to the switch). The ref is `kept|<day>|<n>`: it names nothing.
- **Nothing mints a title again:** `hab_mint_titles()` does nothing, `claim_titles()` answers no rows, `set_title()` clears whatever it is given,
  `hab_close_season()` archives a season with no title, `career_mint()` has no title branch. `hab_titles` stays as an empty table (backup, erase and
  restore lists unchanged); `leaderboard_top()` and `roll_call()` keep their `title` and `rank_label` columns, answered null, so an old phone works.
- **The catalogue** is rulebook version 4 (`starts_on = "2026-10-19"`, D20), seeded in the same call: 4 badges, 22 achievements, 0 titles, 0 skins.
  `career/titles.toml` stays, empty of entries; `career/tiers.lock.json` moved the 34 badge ids to its `"_removed"` list, and `check_career.py` rule 21
  refuses one of them coming back (a new badge takes a new id). The ranks stay in `rulebook.toml` `[level]`: D20 refuses a change to the level's rules.
- **coach.html**: the board shows `LV n` and no rank or title; the Titles minted panel and the athlete file's "Wears" line are gone.
- **How it was proved:** `scripts/career/rehearse_cut.mjs` (PGlite, 61 checks: the stage twice, every number the same, what left and stayed, the
  answers, version 4, the way back, the stage again; it starts from the last committed snapshot without the stage and the catalogue at 2746b4d);
  a dry run on the live data inside a rolled-back transaction (35 of 35 the same; `career_compare()` false until the `proof` flag, then ok);
  after the apply, every athlete against `backup.cut78_scores_before` (35 of 35 the same, 338,964 XP), the payload's fingerprints, and one silent
  `career_rewards_batch()` pass over everyone (nothing minted, nothing moved).
- **Safety copies:** `backup.cut78_career_awards`, `_career_recognition`, `_hab_titles`, `_board_titles`, `_career_catalogue`, `_rules` and
  `_scores_before`. Drop them on 2026-11-03.
- **The way back**: `scripts/career/rollback_stage78.sql`, on Amir's word only (it restores the rows, the catalogue, the rulebook versions and the eleven
  functions as stage77 left them; then revert `career/*.toml` and the lock to 2746b4d and remake the snapshot).

## Stage 79: the new achievements, as built (2026-10-19)

Round 5 (`CAREER_MODE.md` → *Achievements get a big section*). Amir picked all 15 on the page *Achievements*
(https://claude.ai/artifact/WPHuuK2Y2z4jfEQUPVdqNt), then said *"yes, go live with the 13 new achievements"* after the dry run, with two left out:
**Smooth Operator** (the same set at an easier RPE) and **Showed Up Anyway** (a session after a check-in that said tired or sore) each pay for an RPE
or a check-in answer, which GAME-5 rules out; the act version of Showed Up Anyway (the first session finished early) would have gone to 20 athletes,
mostly for a day filed unfinished (`fileUnfinished()` files it as a partial session). So there is no new fact.

- **The 13, as rulebook version 5** (`starts_on = "2026-10-19"`, D20): Back to Back, Full Month (consistency); Every Rep Counted, The Notebook, Extra
  Mile, Extra Innings, Straight Talk, Season Ticket, Half Year, Year One (commitment); Moving Up, Rematch Won (progress); Bounce Back (resilience; its id
  is `rebound`, because `bounce_back` was a badge the cut removed and the lock keeps that id). 35 achievements in all.
- **Three new tests** (`supabase/stage79_career_achievements.sql`; `check_career.py` rule 18 knows fourteen): `total` (`at`: the at-th fact of the kind
  `reads` names, counted as a badge of kind total counts it, so a capped kind counts only what `career_facts_paid()` pays: Library sessions two a week),
  `best_run` (`at`: training weeks held in a row, the measure `weeks`, `reads = "week_held"`) and `month_held` (`weeks`: a calendar month whose
  training weeks, those ENDING in it, were all held and there were at least `weeks` of them; Courtside's Full Month rule, stage75; decided only once the
  month is over, so a cycle published later never changes it; dated the month's last day). The other six are test `first` on facts the server
  already writes. Moving Up reads `effort_win` as it is: any lift up at the same effort at a cycle's end, not only main lifts.
- **A fix the back-pay needed:** `career_rewards_batch()` read `backup.career_catalogue_before` (the go-day's report copy, dropped on 2026-11-01)
  statically, inside each athlete's exception block, so after the drop every athlete's evaluate would have failed and been undone: a silent pass would
  mint nothing and say only `ok: false`. It now reads the copy only while it exists.
- **Quiet back-pay:** one silent `career_rewards_batch()` pass in the same call minted what athletes had already done, dated version 5's start day
  (D20), with no moment (a silent award has none): a line in Your moments and its XP. 51 awards to 22 athletes (Every Rep Counted 15, Season Ticket 11,
  Bounce Back 11, Back to Back 4, Straight Talk 4, Moving Up 3, Extra Mile 2, The Notebook 1; nobody yet for Full Month, Extra Innings, Half Year, Year One
  or Rematch Won), 7,050 XP; three levels up (two clients and Amir's own login), none down; `career_compare()` ok.
- **A Library achievement mints at the next read of the profile**, not on the tick: the Library trigger writes the fact only (it never evaluated awards),
  and `get_profile()`, which the app reads on every open, evaluates in full, live (with its moment).
- **How it was proved:** `scripts/career/rehearse_achievements.mjs` (PGlite, 37 checks: made-up athletes through the real triggers, the stage twice,
  version 5, the quiet back-pay and exactly who gets what, the live path, Full Month's edges, the cost, the way back); a dry run on the live data in a
  rolled-back transaction (the list Amir said yes to); after the apply, every athlete against `backup.ach79_scores_before`, the payload's two
  fingerprints and the four bodies against the file.
- **Safety copy:** `backup.ach79_scores_before`. Drop it on 2026-11-03.
- **The way back**: `scripts/career/rollback_stage79.sql`, on Amir's word only (the four functions as stage78 left them; the 13 then mint nothing more
  and every award already minted keeps its XP; to take them off the screens too, seed a version 6 without them).
- **Next (not built):** the Four Courts section on Progress (Amir's pick A: a Next up line, the four kinds as four tiles, a tap opens a kind) and the
  nudge on the finish card ("Hold Thursday and you get Back to Back").

## Stage 80: the Four Courts read, as built (2026-10-19)

**APPLIED to the live project 2026-10-19** on Amir's word, *"yes, go live with Four Courts"* (migration `stage80_career_achievements_read`): the body
read back equal to the file's, anon cannot run it and authenticated can, it answers; the schema snapshot was remade (198 functions).

`supabase/stage80_career_achievements_read.sql` adds `get_achievements(p_athlete_id)`, the one read the Four Courts section in AA Performance draws
from (`PROGRAM-APP.md` → *Achievements, Four Courts*). get_awards()'s identity rule (the athlete's own; the coach's preview names one; the SQL editor
or the service role, a report). It returns every achievement the athlete can see (one with nothing left to earn it by, a retired one, a mission's,
a commendation's, is left out unless held; a free athlete sees the free ones), each with its kind, name, caption, rule, size, XP, the day it was
earned, and, when not earned, `have` and `need` from the same measures `career_evaluate()` reads (one `career_measures()` pass): a count of `at`
(a capped kind as paid), the CURRENT run of held weeks of `at`, Proof's measure, the best lift gain, goals met, this month's held weeks of the weeks
ending in it (0 and `spoilt` once one has ended unheld), else 0 of 1. `next` leads the section: the furthest along among those with progress,
then the nearest to done; with no progress anywhere, never a resilience one (nobody aims to miss a week), then consistency first, the smallest
size, the least XP. It writes nothing and pays nothing.

- **Measured on the live data** (a rolled-back dry run, 2026-10-19): about 0.3 s an athlete; Next up came out as Straight Talk 24/25, Half Year 5/6,
  Back to Back 1/2, Double Up 84/100, Season Ticket 2/3, and Held for an athlete with nothing yet.
- **Rehearsed** in `scripts/career/rehearse_achievements.mjs` section 8 (52 checks in all).
- **The app goes first and is safe without it:** program.html asks for it beside the moments; until stage80 is applied the call fails and the section
  is simply not drawn.
- **Applied** as above; the one thing no test can do is open Progress on a real login (signing in as an athlete signs out their phones),
  so the first real look is Amir's own phone.
- **The way back**: `scripts/career/rollback_stage80.sql` (drops the function; the section disappears).

## Stage 81: Crew and the Bell, as built (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"yes, go live with Crew and the Bell"*), as the migration `stage81_career_crew`.
Read back: the five tables with row-level security on, 21 functions, **anon can run none of them**, the eleven an athlete or the coach calls
are `authenticated`'s and the ten helpers the service role's only, the `crew_level_ring` trigger on `career_scores`, the hourly `crew-sweep`
job in `cron.job`, the one policy on `crew_consent`, and `coach_erase_person()` listing the five tables with exactly one `to_athlete`
statement. **All 21 function bodies read back md5-equal to this file.** `get_bell()` answered for an athlete (0 items: nobody had answered
yet). One fix a minute later, the migration `stage81_crew_clean_tab_fix`: `replace()` takes a LITERAL string, so `E'\\t'` was a backslash
and a `t`, not a tab, and a tab survived untouched; it is `chr(9)` now, checked on the live project (the Farsi joiner kept, an emoji whole,
a tab to a space, two line breaks at most, invisibles and control characters gone).
Supabase's own security advisors afterwards say exactly what this design means: the four short-lived tables have row-level security
on with NO policy (nobody reads or writes them directly; every door is a `security definer` function), as the two publish-key tables
already did; none of the 21 functions has a mutable search path; anon can run none of them; and the eleven an athlete or the coach
calls are listed as `authenticated`-executable `security definer` functions, which is what they are, each checking identity itself.

Round 5, step 5 (`CAREER_MODE.md` → *Round 5*: one feed, the Clubhouse, what rings). The app half is in
program.html (`PROGRAM-APP.md` → *Crew and the Bell*) and shows nothing until this stage answers; coach.html's panel (`COACH_DASHBOARD.md` → *The Bell*)
hides the same way. **Nothing here pays XP, mints an award or touches the scorer** (GAME-6); its one trigger only writes `crew_rings`.

`supabase/stage81_career_crew.sql` (safe to re-run; a guard refuses without stages 66 to 75):
- **Five tables.** `crew_consent` (each athlete's yes or no, a switch per kind, the crew name used off the board, Amir's under-13 tick, the opaque
  `crew_key` that names their lines, `first_yes_at`, `yes_since`): kept, in `BACKUP_TABLES`. `crew_posts` (up to 280 characters and/or a photo;
  `kind` post or session), `crew_photos` (the JPEG, at most 450 KB, a row deleted with its post), `crew_kudos` (giver `athlete_id`; a post, or a
  line as `to_athlete` and `line_day`), `crew_rings` (a level reached; stage82's Open result): all four **short-lived and left out of
  `BACKUP_TABLES` on purpose** (`SHORT_LIVED` in `scripts/restore/restore_backup.py`): a backup kept 12 weeks would break the 7-day promise.
  Every write is a function; only the coach can read `crew_consent` directly (the backup), nobody the rest.
- **Photos are rows, not Storage files.** Supabase Storage blocks a delete from SQL (`storage.protect_delete`), so the 7-day sweep and an erasure
  would each need an Edge Function and the erasure would stop being one transaction. A row goes in the same delete as its post.
- **`get_bell(id)`**: the athlete's own (the coach and the SQL editor anyone's). Sweeps first. Who is seen (`crew_members()`): a yes, not under 13,
  not former, not the demo; named by the board's name, else the crew name. The feed: Amir's post of the last 24 hours pinned, then posts and lines
  by time, posts of the last 7 days (80 at most). **A line is one athlete's day** (the UTC date the server learned of each part), each kind once:
  the newest level (`crew_rings`), the marks (`held_weeks`, `century`, `bests`, `comebacks` awards minted `live`), every achievement minted `live`
  (its catalogue name), the honours once frozen (never `near`), joining (the first yes), the bests as one part naming the lifts (never a weight),
  the longest run of held weeks (**a twin of `get_profile()`'s loop**: only a broken week ends a run; not shown when its own Hold Serve mark rang
  the same day), the latest cycle finished. A part rings only from the athlete's latest yes (`yes_since`), only while its `created_at` is in the
  last 7 days, and only for a kind they left on. A quiet back-pay (`silent`, `baseline`) never rings. Kudos: how many, up to three crew names
  (newest first, never the viewer) and whether the viewer gave it; a giver no longer in the crew is not counted. Last month's honours ride along
  from the 1st to the 14th, crew members only. No athlete id leaves: a line's key is `crew_key:YYYY-MM-DD`.
- **The athlete's writes** (`crew_who()`: signed in, never the demo): `crew_answer(yes|no, name)` (a no deletes their posts, photos, given kudos and
  rings at once; the row stays), `crew_kinds({kind: bool})` (only the eight kinds), `crew_post(body, photo base64, w, h, kind, session)` (a crew
  member only; `crew_clean()` strips control characters, bidi overrides and zero-width marks; the photo must start FF D8 FF; 3 photos and 10 posts a
  server day, behind an advisory lock; a session needs its photo), `crew_delete_post(id)` (the author's own), `crew_kudos(target, on)` (a crew
  member, never their own, only what the crew can see).
- **The coach's**: `coach_crew()` (every post with its author id, every answer), `coach_crew_post()` (as `coach_note_id()`, pinned for a day, no daily
  cap), `coach_crew_remove(id)`, `coach_crew_under13(id, bool)` (a row for someone never asked; on, their posts, kudos and rings go at once).
- **`crew_sweep()`**: a post older than 7 days (its photo and kudos with it), a line's kudos 7 days after its day, a ring after 8 days. Every read and
  post runs it, and **pg_cron runs it every hour** (`crew-sweep`, `7 * * * *`; the stage creates the extension where it exists: the live project
  yes, PGlite no), so the promise holds in a week nobody opens Crew.
- **The level ring**: an AFTER UPDATE OF score trigger on `career_scores` writes one `crew_rings` row when `career.level` went UP, for a yes only;
  an insert (a new or rebuilt cache row) never rings; `set_config('crew.quiet', 'on', true)` silences it for a quiet back-pay; anything that goes
  wrong is a warning, never a failed save.
- **`coach_erase_person()`** learns the five tables (the kudos they gave first, then the photos, posts, rings and the answer) and one statement
  after the loop deletes the kudos others gave to their lines (`to_athlete`, which the loop cannot see), counted as `crew_kudos (to them)`.
- **Stage 82's hook**: the Monthly Open writes its result as a `crew_rings` row of kind `open` (its `value` carries the words, `text`); get_bell()
  already reads it as an `open` part and the app already has the switch.

**Rehearsed** by `scripts/career/rehearse_crew.mjs` on PGlite: **265 of 265** (made-up athletes; the stage twice, the grants, the question and its
refusals, every post limit, what rings and what never does, kudos, photos, the coach's tools, the erasure, nothing in the scorer moved, the way back
twice and the stage again, the cost with 30 crew members: `get_bell()` 21 ms, 80 posts and 121 lines). It also runs against 68 one-line breaks of
the two files and catches 67 (the 68th cannot change an answer); `--stage` and `--rollback` point it at a changed copy.

**Three things it found, all fixed before any of this was applied:**
1. **The erase patch's text may not come from the file's own newlines.** The piece it adds to `coach_erase_person()` spans lines and is typed in
   BOTH files; a Windows checkout ends lines with CRLF, so a stage applied from one ending and a way back run from the other left
   `delete from public.crew_kudos` behind in a function whose table had just been dropped, and **every erasure after it would have failed**. Both
   files now build that text with `concat_ws(chr(10), …)`, so the ending of the file they are run from cannot matter. Section 13 of the rehearsal
   runs all three mixes.
2. **The pin is chosen before the limit**: `post_items` orders pinned first, then newest, so Amir's post cannot fall out of a day with 80 newer posts.
3. **`crew_clean()` keeps the zero-width non-joiner and joiner**: Persian spells words with U+200C (می‌رم) and an emoji holds its parts together
   with U+200D, so stripping them mangled Farsi and split emoji. Only U+200B, U+FEFF, the bidi overrides and isolates go; a tab becomes a space.

**Two things left as they are, on purpose:** anyone signed in can READ the Bell, a no and an under-13 included (the design page's *UNDER 13: sees
the Bell, never posts and never rings*; nothing of theirs is in it); and the server does not check a photo for EXIF data, because the phone's
re-encode drops it and SQL cannot read it — a crafted client could upload one, and Amir can remove any post.

**A dry run on the live data, rolled back (2026-10-19):** the tables, `get_bell()`, the trigger, pg_cron and the erase patch applied on the live
structure, with all 40 athletes with a programme made yes for the run: `get_bell()` answered in 0.36 s cold and 0.17 s warm, 52 lines and 12.5 KB,
no athlete id and no `"kg"` in it; a level raised by one rang once; the `crew-sweep` job was scheduled; the erase function took both patches. Read
back after: no crew table, no `get_bell()`, no pg_cron extension, the erase function untouched.

**To apply** (Amir's yes first): no backup is needed for the apply itself (it adds tables, functions and one trigger and changes no row; the one
existing object it touches, `coach_erase_person()`'s list, is put back exactly by the way back). Apply `stage81_career_crew.sql` (`apply_migration`);
read back the five tables with row-level security on, anon executes none of the functions, the helpers are the service role's only, the trigger,
the `crew-sweep` job in `cron.job`, the erase function's list and its one extra statement; `get_bell()` for one athlete as the service role. Then,
in ONE commit: `supabase/schema_snapshot.sql` remade (`scripts/restore/README.md`), `crew_consent` into coach.html's `BACKUP_TABLES`,
`scripts/test_restore_backup.py` (check 1d's count and 2h), `scripts/restore/rehearse.mjs` run. The way back: `scripts/career/rollback_stage81.sql`,
on his word only (it keeps the answers in `backup.crew_consent_<date>`).

## Stage 82: the emoji beside the Like, as built (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"yes, apply stage82 and turn the emoji on"*), as the migration `stage82_crew_emoji`.
Read back: the column, the set `🔥 💪 👏 😍`, the two-argument `crew_kudos()` gone and the three-argument one there, anon unable to send one,
`authenticated` able to, `crew_emoji_list()` and `crew_kudos_of()` the service role's, and `get_bell()` carrying the list. **All three
function bodies read back md5-equal to this file.** The six reactions already on the server stayed plain Likes (`by` empty, counted under
`like`), and `get_bell()` for a real athlete came back with the list and six items. Amir, 2026-10-19, on the page
https://claude.ai/artifact/KkF7qE5yomcLdxKYF1mjo8:
*"instead of racket go with hearty eyes. but lets go with all five out style"*. So direction **A** (the Like and the four emoji all on the
card, one tap each) and the set **🔥 💪 👏 😍**, with the Like itself the fifth and the default. ⚠️ **The Monthly Open moves to stage83.**

`supabase/stage82_crew_emoji.sql` (safe to re-run; a guard refuses without stage81):
- **One nullable column**, `crew_kudos.emoji`. **Null is the plain Like**, so every row stage81 wrote stays a Like and no athlete's reaction
  moves. The table's check is loose (1 to 16 characters); the LIST is `crew_emoji_list()`, so changing the set later is a function, not a
  migration that rewrites a constraint.
- **`crew_kudos(p_target, p_on, p_emoji)`**: a third argument, and the two-argument form is DROPPED so nothing can reach the old body. One
  reaction per person per target still (the unique indexes are untouched): a different emoji **swaps in place** and is re-dated, so the names
  read newest first; `p_on => false` takes it back, whatever it was; an emoji that is not on the list is refused (`crew:emoji`).
- **`crew_kudos_of()`** gains `emoji` (the viewer's own, null when theirs is the plain Like), `like` (how many plain Likes) and `by` (how many
  of each emoji, only the ones sent). `n`, `mine` and `names` keep their meanings, so a phone that has not updated keeps working.
- **`get_bell()` returns `emoji`, the list.** That is how the app knows: with no `emoji` key program.html draws the Like alone, which is why
  the app could ship before this stage.

**Rehearsed** in `scripts/career/rehearse_crew.mjs` section 14 (the whole file is **292 of 292**): the stage twice, the grants, the list, a
Like written before the stage still counted as one, the swap, the take-back, the refusals, two people on one emoji, the names, a Bell line,
the feed's shape, and the way back followed by the stage again.

**To apply** (Amir's yes first): no backup needed (one `add column`, no backfill, no row touched). Apply the file, read back the column, the
list, that the two-argument function is gone and the three-argument one is `authenticated`'s while `crew_emoji_list()` is the service role's,
and that `get_bell()` carries the list. **The schema snapshot is remade in the same commit** (`scripts/restore/README.md`). `BACKUP_TABLES`
does not change: `crew_kudos` is one of the four short-lived tables and is not in a backup. The way back:
`scripts/career/rollback_stage82.sql`, on his word only — every reaction stays, as a plain Like.

## Stage 83: the Bell's feed only when it has changed (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"yes, apply stage83"*), as the migration `stage83_crew_if_new`. Read back: anon cannot
run it and a signed-in athlete can, the body is md5-equal to the file, and on the live feed it answered **2,318 bytes the first time and 100
bytes the second**, with a wrong hash still sending the feed.

Amir, 2026-10-19: *"irans internet is very slow, and cant download everything everytime they open the app. can we do this in a way that the
images and messages arent downloaded again? and then new images arent downloaded unless some one opens the crew?"*.
⚠️ **The Monthly Open moves to stage85.**

Three things answer him, and only the first is a stage:
1. **`supabase/stage83_crew_if_new.sql`**: `get_bell_if_new(p_athlete_id, p_etag)` **calls** `get_bell()` (so there is one copy of the rules),
   drops `at` (the clock, which would change every time), hashes what is left and answers **`{"same": true}`** when the hash matches the
   phone's. It is an ETag over the whole payload, so it is exact: a post Amir removed, a like taken back or a line that aged out all change
   the hash. `get_bell()` itself is untouched, which keeps stage82's way back matching it word for word.
2. **The app asks for nothing at an app open** (`PROGRAM-APP.md` → *Crew and the Bell*): `crewFirstLook()` asks once in a phone's life while
   it has no copy; after that the tab, the dot and *Tell the crew* come from `<id>_crewcache`, and only opening Crew asks, at most every ten
   minutes.
3. **A photo is downloaded once, ever**, into Cache Storage (`crew-photos-v1`, deliberately not an `aap-*` name, which `sw.js`'s activate
   would delete), swept after each fresh feed to whatever the feed still names. The phone also makes a photo smaller than it did:
   **1080 px, under 200 KB** — the ones already posted were landing at **312 kB** while `privacy.html` and the posting sheet both promised
   about 200 KB.

**What it cost before, measured on the live project:** the feed was 2,274 bytes for six items and was fetched 1.5 s after EVERY app open,
whether or not the athlete went to Crew; a photo averaged 312 kB stored, 415 kB on the wire as base64, and was downloaded again after every
app restart because it was only held in memory.

**Rehearsed** in `scripts/career/rehearse_crew.mjs` section 15 (the file is **309 of 309**): the stage twice, the grants, the feed with no
hash, `same` with it, the clock not moving the hash, a new post, a reaction and a REMOVED post each moving it, the answer equal to
`get_bell()`'s own, the same refusals, the coach's read, and the way back followed by the stage again. The app's side is
`scripts/headless/crew.js` (74 checks).

**The way back**: `scripts/career/rollback_stage83.sql` — the app falls back to `get_bell()` by itself, so nothing else has to change.

## Stage 84: the Monthly Open, as built (2026-10-19, not yet applied)

The last build step of plan A (`CAREER_MODE.md` → Round 5, L9 and the Crew and Open bullets). Amir decided its shape with *"for crew and the open go
with your picks"* and changed L9 himself the same day, so nothing here waited on a new question.

- **What it is:** one challenge at a time, any kind he designs, open in every week (the back-off week included). A result counts only when **he**
  confirms it from the clip on WhatsApp; nothing of the clip is stored and **the app has no write at all**. The board is ranked by the result,
  `better` (high or low) saying which way wins.
- **Two tables** (`supabase/stage85_crew_open.sql`): `crew_open` (title, how, unit, better, opened_on, closed_at — it names nobody) and
  `crew_open_results` (open, athlete, value, day; one row per athlete per challenge, typing a better one replaces it). Coach-readable so the backup is
  complete, nobody writing directly. **Both are IN `BACKUP_TABLES`**, unlike Crew's posts: a result is a record worth months, a handful of rows, and
  the one thing here that could not be rebuilt from anything else. `crew_open_results` is in `coach_erase_person()`'s list and the schema snapshot.
- **The athlete's read is inside `get_bell()`**, one new key `open` from `crew_open_now(viewer)`, patched in place (stage76's idiom) so a 140-line
  read is never copied. Crew still costs ONE call on a slow connection, and `get_bell_if_new()`'s etag covers the Open too, so a changed board reaches
  a phone that is holding the old feed. ⚠️ **The patch's anchor is the last key alone** (`, 'at', now());`), because stage82 already added `emoji`
  between `days` and `at`: a stage that adds another key must do the same.
- **Amir's five:** `coach_open()` (his panel), `coach_open_set()` (no id starts a new one and closes the old; an id corrects the words and keeps the
  results), `coach_open_close()`, `coach_open_result()` and `coach_open_remove()`. Each asks `is_coach()` itself.
- **It rings the Bell once** per athlete per challenge: a `crew_rings` row of kind `open` whose `value.text` is the words the app already draws
  (stage81 left that hook), *"posted 95 seconds in Wall Sit"*. A better result keeps the first line's day and updates its words. It never rings for
  someone who has not joined, who turned the `open` kind off, or whom Amir ticked under 13 (GAME-9) — though the last of those still counts on the
  board, because the switch is about the Bell, not the result.
- **Two calls that were Claude's**, both as decided: **(1) the Open pays no XP** (GAME-6 is the nearest rule, and paying would mean a new rulebook
  version under D20; nothing here touches the scorer, no fact and no award); **(2) a result outlives the feed** (a post dies at 7 days, a result does
  not), which is why the two tables are backed up and only the Bell *line* fades.
- **Who is on the board:** crew members who said yes. A result Amir records for someone who never joined stays with him, marked in his panel, and is
  shown to nobody (GAME-9).
- **Rehearsed** by `scripts/career/rehearse_crew.mjs` section 16 on PGlite (**376 of 376** with the rest of Crew): the stage twice, the grants, every
  refusal, the board and its order both ways, the Bell's words (a whole number has no trailing point), who is left off, closing and starting another,
  that the scorer never moved, the erasure (dry run then real), the three fixes above, and the way back then the stage again. Both in-place patches were counted against the
  LIVE definitions first (each anchor found exactly once).
- **Amir's panel** is coach.html → Proof, under *Who said yes* and above the board (`COACH_DASHBOARD.md`): the live challenge or an empty state, the
  form to set or correct it, a picker to record a result, the board as the athletes see it, the results that are not in the crew marked, and the
  last five closed challenges. Starting a new challenge, taking a result off and closing all ask first (`dangerAsk()`), because each takes something
  off Crew. The panel hides itself only when `coach_open()` is missing or answers null; any other failure shows the reason and Try again, so a
  network blip never makes it vanish. Its scenario is `open-panel` in `scripts/headless/coach/run.js`.
- **Four things the panel's own review turned up, three fixed in the stage before it was ever applied:** `coach_open_set(p_id)` now takes only the
  LIVE challenge (`and closed_at is null`, else *no such challenge is open*), so a tab left open cannot quietly correct a closed one;
  `coach_open_result()` refuses an id with no `programs` row; and the ring reads `crew_members()` rather than `crew_consent`, so a former athlete,
  the demo or Amir's own posting id leaves no ring behind even with an old `yes`. The fourth was the panel's own: its picker offers the whole
  roster, not only the crew, because a result for someone who has not joined is allowed (it stays off the board, and that athlete still sees it in
  their own app through `mine`).
- **The app**: `PROGRAM-APP.md` → *The Monthly Open, on Crew*; `scripts/headless/crew.js` covers it. The card is simply not drawn until the stage is
  applied, so the app side shipped first and safely.
- **To apply**, on Amir's word, in this order: (1) the file through the Supabase tool (a migration); (2) **add `crew_open` and `crew_open_results`
  to `BACKUP_TABLES` in coach.html** and remake the schema snapshot, both in the same commit — the list and the snapshot must agree
  (`scripts/test_restore_backup.py` check 1h fails otherwise, which is why the list could not be changed before the apply); (3) set the first
  challenge in coach.html → Proof → The Monthly Open.
- **The way back**: `scripts/career/rollback_stage85.sql` — it undoes both patches, drops the five and the read, and drops the two tables LAST,
  which is the one step that loses what Amir confirmed.
