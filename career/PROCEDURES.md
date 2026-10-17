# Career Mode: the procedures

Every function the system needs, step by step, in plain words. Each one says **when** it runs, what it **reads**, its
**steps**, what it **writes**, and the rules it obeys (GAME-n, in [`CAREER_MODE.md`](CAREER_MODE.md) → *The rules*).

**Status (2026-10-17): phase 1 is live, in shadow** (P1, P2, P3, P4, P10, P12, P14, P15: *Phase 1, as built*, at the
end; applied to the live project on Amir's yes, seeded, 34 of 34 athletes matching Proof); the rest is a specification. When a phase is built, its SQL follows these steps; when a step here changes, the code
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
   **Entries gated on the switch.** An entry with `retire_at = "switch"` is earned exactly as Proof earns it until phase 3,
   minted at the baseline, and never earned after. An entry with `starts_at = "switch"` is not earned before phase 3; at
   the switch it is worked out over the whole history and minted in silence. `superseded_by` names the entry that takes
   an old one's place: the shelf shows the new one, and the old awards fold under it, never deleted. This is how a design
   change reaches a Proof entry without breaking the shadow (P14), which needs Proof's exact rules until the switch.
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

- **Shadow.** `rulebook.toml` → `[shadow] on = true`. Nothing an athlete sees reads Career Mode; AA Proof's scorers and board
  are untouched. While it is on, the habit numbers are Proof's own (strength 100, the gate, the targets) and the checker
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
  - **Step 4, settling,** is built (`career_sync()`'s `p_settled_before`) and waits for the switch: while the shadow is on a
    closed day still follows the log, as Proof does, or the two could not match.
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
  three effort wins a cycle). Nothing is stored. ⚠️ Until the switch the shadow's career XP counts a session twice, as the
  WORKOUT habit (Proof's 120) and as the session fact (400).
- **P4.** `career_level()`: the rulebook's curve and ranks, no ceiling, no reset. `base` was re-anchored to 400 on the
  shadow data with the switch's numbers (the measurement is beside it in `rulebook.toml`).
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
