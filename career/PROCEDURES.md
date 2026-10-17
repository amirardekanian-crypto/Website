# Career Mode: the procedures

Every function the system needs, step by step, in plain words. Each one says **when** it runs, what it **reads**, its
**steps**, what it **writes**, and the rules it obeys (GAME-n, in [`CAREER_MODE.md`](CAREER_MODE.md) → *The rules*).

**Status (2026-10-17): a specification.** Nothing here is code yet. When a phase is built, its SQL follows these steps;
when a step here changes, the code changes with it. The numbers they use live in `rulebook.toml`, and the rewards,
missions and quests in the other `.toml` files: a procedure never hard-codes a number (GAME-10).

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
| `effort_win` | The day after a cycle's end date: each of its top three effort-matched wins (`cycleWins()`: a lift's first session of the cycle against its best since, 2% or more) | cycle and lift |
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
   For each tier whose `at` the measure has reached and that is not yet an award, mint it: athlete, badge, tier, the day
   the measure crossed `at`, the facts that crossed it (the evidence).
2. **Achievements.** For each achievement not yet earned, check its rule once. When it holds, mint it.
3. **Titles.** Mint a title when what earns it is minted: a badge tier or achievement with `title = "…"`, a level on
   the road (Proof's 14 rewards), a season's close (P4), a finished quest with a title (P7), Amir's Pick (P9).
4. **Recognition.** Each new award gets a recognition row with its catalogue `size` (P8).
5. **Never delete an award.** A void fact (P12) only stops future awards.
6. **The baseline.** The first run for an athlete (phase 3) mints everything they already earned in silence: one moment
   at most, never thirty (the way Proof baselines its rewards on first boot).

**Writes:** awards, recognition rows.

**Rules:** GAME-1, GAME-3, GAME-8.

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
   2. last week was broken (`week_broken`) → *Bounce Back*, the same job paid as resilience;
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
5. A week with a sweep extends the athlete's Clean Sweeps run (a badge, P5).

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
1. **The athlete**, always:
   - `tick`: the XP counter moves.
   - `win`, `highlight`: the wins card, until tapped.
   - `milestone`, `legend`: a full-screen moment at the next open, one per open, the rest queued; a share card
     offered.
2. **Amir**, from `highlight` up: a Courtside row with the WhatsApp message from `recognition.toml` → `[message.*]`
   filled in.
3. **The crew**, from `highlight` up, only if the athlete said yes: a line on the Bell, kept `keep_days` (7).
4. **Beyond**, from `milestone` up: the share card, the athlete's to post. A `legend` may go in Amir's story only after
   the athlete says yes to a pre-written WhatsApp.
5. **Consent** is asked once, at the athlete's first highlight: *Ring the bell for the crew when you set a best?* Yes,
   or Keep it to me. The switch lives in Settings. Amir always sees everything.
6. Record who was told and when, so nothing is told twice.

**Writes:** recognition rows.

**Rules:** GAME-6, GAME-9, GAME-11.

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
- badges by meaning, with tier, metal and date; recent achievements;
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

## P14. Shadow, then the switch

1. Seed the rulebook from `rulebook.toml` (Proof's habit numbers as they are today, plus the training facts).
2. Run P1 and P2 over all history: sessions since 21 April 2026 and every Proof log.
3. For every athlete, compare the habit XP Career Mode works out for the current season with Proof's own
   (`hab_xp()` plus `hab_bonus_xp()`). It must match exactly. A difference is fixed in P1 to P3, never hidden.
4. Re-anchor `base` (P4).
5. Switch Proof's level, rank and board to `get_profile()`. The first open shows one moment: *Your career: level N,
   from everything you've logged since <date>*.
6. Proof's phone scorer stays only as the preview (P13).

## P15. The tables

Each one, the day it is created, gets row-level security (the athlete reads their own, Amir reads all, the crew only
through `get_bell()`), and goes into `BACKUP_TABLES`, the schema snapshot and `coach_erase_person()`.

| Table | One row per | Holds |
|---|---|---|
| `career_facts` | fact | athlete, day, kind, ref, value, source, void_at; unique on athlete + kind + ref |
| `career_rules` | rulebook version | `rulebook.toml`, as stored data |
| `career_catalogue` | badge, achievement, title, mission or quest | its block from the `.toml` files |
| `career_awards` | badge tier, achievement or title earned | athlete, item, tier, day earned, evidence, season |
| `career_missions` | mission, per athlete per week | slot, mission, target, frozen XP, progress, day done, pinned by |
| `career_quests` | quest, per athlete | steps, status, door, set by, started, paused, finished |
| `career_recognition` | moment told | size, when the athlete, Amir, the crew and beyond were told; consent at the time |
| `career_kudos` | kudos | who gave it, which line |
| `career_consent` | athlete | the Bell yes or no, when it was asked |

## P16. Changing a detail

1. Edit the `.toml` file (or ask Claude to). [`README.md`](README.md) says which file holds what.
2. Run `python scripts/check_career.py`. It refuses a missing meaning, an unknown fact, gold, a mission with a fixed
   XP, a title that doesn't exist, and more.
3. Once built: re-seed the rules and the catalogue. Every athlete's XP and level are worked out again from their facts
   (GAME-1).
4. Nothing already minted is taken back. A new badge or tier is minted for everyone who already qualifies, in silence
   (P5, step 6).
