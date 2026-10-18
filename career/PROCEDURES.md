# Career Mode: the procedures

Every function the system needs, step by step, in plain words. Each one says **when** it runs, what it **reads**, its
**steps**, what it **writes**, and the rules it obeys (GAME-n, in [`CAREER_MODE.md`](CAREER_MODE.md) → *The rules*).

**Status (2026-10-17): phase 1 is live, in shadow** (P1, P2, P3, P4, P10, P12, P14, P15: *Phase 1, as built*, at the
end; applied to the live project on Amir's yes, seeded, 34 of 34 athletes matching Proof). **Phase 2, the XP switch, is built,
rehearsed and switched on (2026-10-18)** (P1 step 4, P3, P4, P10, P13, P14 steps 4 to 6, P17: *Phase 2, as built*, at the end); the
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
   - `kind = "best_value"`: the largest value its fact has reached (The Upgrade reads `lift_gain`'s percent).
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

**As built (phase 3, 2026-10-18, catalogue switch off):** `career_evaluate()` does steps 1 to 6 in one pass of measures, and step 4 only for an
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
- the four numbers: weeks held (current and best), sessions with Amir, personal bests, comebacks (a free athlete's four
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
  then newest, plus heads-ups (`recognition.toml` → `[courtside] heads_up`). Each row: athlete, the moment in plain
  words, the WhatsApp link with the message filled in, Seen, a reaction.
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
rules, kept for the go-day report; **dropped 14 days after the go-day**). `career_awards` and `career_recognition` are in `coach_erase_person()` and the
rollback; their lines in `BACKUP_TABLES` and the schema snapshot land with the snapshot commit (rollout step 2).

## P16. Changing a detail

1. Edit the `.toml` file (or ask Claude to). [`README.md`](README.md) says which file holds what.
2. Run `python scripts/check_career.py`. It refuses a missing meaning, an unknown fact, gold, a mission with a fixed
   XP, a title that doesn't exist, and more.
3. Once built: re-seed the rules and the catalogue. Every athlete's XP and level are worked out again from their facts
   (GAME-1).
4. Nothing already minted is taken back. A new badge or tier is minted for everyone who already qualifies, in silence
   (P5, step 6).

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

`supabase/stage70_career_rewards.sql` (safe to re-run; the build is **not applied** to the live project, and the catalogue switch is off), rehearsed by
`scripts/career/rehearse_catalogue.mjs` (PGlite, the schema snapshot, a full backup of the real rows, phases 1 and 2 as they stand on the live project,
then stage70, the go-day, live mints on made-up athletes, partial calls, the stamp, voids, the queue, timing, a re-seed, an erasure and the way back:
**163 of 163 on 2026-10-18**, 196 s here), with the way back in `scripts/career/rollback_stage70.sql` (tested there: dry run first). The apps ship ready and behave
exactly as phase 2 until the switch is on: `catalogueOn()` in `habits.html` and `catalogueOnT()` in `program.html` are the profile's `switch.catalogue`
and an `owned` (a list of award ids) and a `ladder` that the server only fills once it is on. Decisions D1 to D17 are not answered; the recommendation of each is what is built
(*The decisions, round 4*, in `CAREER_MODE.md`).

**Words.** The **switch day** `S` is the day `[switch] catalogue` was turned on. **History** is a crossing day `d <= S` (the switch day counts as history on
both sides: the server's `hist := d <= S`, the phone's `live := d > S`). The **award id** is the one key for a reward everywhere:
`badge:<item>:<tier>`, `badge:<item>:<tier>:<habit>` (only `habit_tiers`), `achievement:<item>`, `title:<item>`; built only by `career_award_id()` and
`awardId()` (both phones; a twin). A tier is its 1-based place in the entry's `tiers`, so **tiers are append-only** (*P16*, `tiers.lock.json`).

**The functions** (every one is service-only; `get_profile()`, `get_awards()` and `mark_moments_told()` are the only doors for a signed-in athlete):
- `career_catalogue_on()`: the switch is a day. With it off, every function below does nothing and `get_profile()` answers exactly as in phase 2.
- `career_measures(athlete, ctx, keys)`: **one pass**. Each key (`run:<habit>`, `hits`, `sum`, `with3`, `perfect`, `qualify`, `daystreak`, `cbrun`,
  `stuck`, `count:<kind>`, `weeks`, `iso:<kind>`, `maxpct`) is one set-based statement over `career_facts` and answers `{have, now, steps}`: `steps` are the
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
- **Sizes**, compact JSON, on the real rows of 2026-10-17: the core of the largest real career (elmira_askari, 58 awards) 7.6 KB (the ladder 3.5 KB, `owned` 1.4 KB);
  a simulated 208-award career 8.7 KB; the shelf of the same two 6.7 KB and 18.5 KB. The 14 KB budget is the core's.
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
through `career_seed.py --json`; in the hook (index mode) the toml, the seed script, the checker and the snapshot are cut out of the **index**, like `habits.html`, so a
file edited and not staged is never held against a staged one. **The guard now runs when `habits.html`, a `career/*.toml`, `scripts/career_seed.py` or one of the
three `*_cases.json` files is staged**, not only for `program.html`, `coach.html` and `chips.js` (pre-commit guard 15); each of these used to pass it unrun.
`scripts/test_check_twins.js` breaks the files on purpose (94 mutations) and requires the guard to name the entry that drifted. All 65,307 checks agree. `scripts/headless/career.js`, `sharecard.js`,
`highlight-reel.js` and `proof-cards.js` drive both apps.

**Measured on PGlite** (slower than the live project), on the longest real log (elmira_askari, 673 facts in the backup of 2026-10-05, 796 in the backup of
2026-10-17). Backup of 2026-10-05: a Proof save costs 45 ms more, a session save 3 ms more (budget 300); the first full evaluate 68 ms (budget 500); the skip
path 0.5 ms (budget 10); the baseline for all 51 athletes 3 s. Backup of 2026-10-17, the last run (the three rehearsals ran at once, so it is the slow side): a Proof save 75 ms more, a session save 12 ms more; the first
full evaluate 123 ms; the skip path 0.6 ms; the baseline for 43 athletes 5 s; the slowest first full evaluate of any athlete 143 ms. **`get_profile()` on the skip path is
a growth budget**, not an absolute: it may cost at most 100 ms more than phase 2's `get_profile()` on the same log, measured in the same run (it cost between 7 ms
less and 0.1 ms more in two runs; the call itself takes 56 to 115 ms here because it reads the whole season). `get_awards()` takes about 2 ms.

**The rehearsals start from the snapshot now** (2026-10-18). `supabase/schema_snapshot.sql` is the live structure and already holds stage66 and stage69 (and holds
stage70 once it is live), and a rehearsal that applied stage66 on top of it broke on `coach_erase_person()`. `scripts/career/rehearse_lib.mjs` (shared, not a
rehearsal) holds what the three need: `ensureStages()` applies, each twice, only the stages the database does not hold, in order, and says what the snapshot
already holds; `filesAt()` cuts the career files of a commit out of git, with that commit's own checker and seed script (`PHASE1_REV` 94cdc89, the rulebook the
live project was seeded from; `PHASE2_REV` a219d5a), so phase 1 and 2 stay the rehearsals of phase 1 and 2 whatever the working files say now. `rehearse.mjs`
(50 of 50) takes `--phase1 <rev>` and `--no-stage70`; `rehearse_switch.mjs` (49 of 49) first takes the snapshot's stage70 and stage69 off with their own
way-back files (so the way back is tested by what follows), then seeds phase 1 and phase 2 from their commits, and takes `--phase1`, `--phase2` and `--no-stage70`
too; `rehearse_catalogue.mjs` (163 of 163) takes `--cases-file <path>` with `--write-cases`, to look at a change to the cases before replacing them. Stage70 goes on
the project as it will stand when phase 3 ships (XP switch on), and the way back is run twice.

**The go-day** (rollout step 4, after D1, D10 and D11 are answered): backup, `--catalogue-steps` batches 1 and 2, Amir reads the lines, the seed that only
flips the switch, the baseline batches, `career_compare()`, then one commit with the toml dated, `privacy.html` §2.3 and its *Last updated* (the text is
drafted outside the repo and held), the `APP_GUIDE` phrasing "Once Career Mode's rewards are on, ..." rewritten to the plain present, and the docs. 14 days
later: `drop table backup.career_catalogue_before`. **The way back** (Amir's word only): `scripts/career/rollback_stage70.sql`, dry first, then real, then
commit the toml with `catalogue = "off"`. It restores every function stage70 replaced, drops the two tables and the cache column, un-patches the erase
function, and writes one `level_kept` fact (`catalogue-rollback`) for any athlete whose XP would fall, so nobody's level goes down. The apps fall back by
themselves.

**What it does not do yet:** no coach rows, reactions or commendations (phase 4); no weekly missions (phase 5); no Bell lines or kudos (phase 6); no quest
titles (phase 7); no Farsi name or caption for a reward (Amir writes them; the share card falls back to English); no training-app moment for a plain level-up.
