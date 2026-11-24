## Stage 130: Over the Line, the week and the court (2026-11-24, APPLIED, rulebook version 15 seeded)

**Why.** Round 15 *Over the Line* (ideas #146, #148, #149, #151, #154, #157, #158). Amir: *"go with your picks"* (direction A, Court Hours pays
like walking, the names Full Week and Court Hours), then the three shapes of an achievement (TASTE.md). Walkers had five steps achievements and
players none; this gives Court Log and the week's Move minutes their own. The source of truth is the header of
`supabase/stage130_over_the_line.sql`; the way back is `scripts/career/rollback_stage130.sql`.

**1. A Court Log row is a fact.** `career_observe_activity(athlete)` syncs one `activity_done` fact per `activity_log` row (ref `act|<id>`, the row's
day, value `{ kind, mins, effort }`), source `server`, no settle date (a deleted row voids its fact at once; an award it won stays, GAME-1).
`career_on_activity()` (the `activity_log` trigger) calls it right after `career_observe_proof()`, so the partial evaluate that follows sees it.
`[fact.activity_done]` pays 0: the Steps credit (stage119) and `move_week` (stage127) already pay for the activity.

**2. Seven tests**, each a key of `career_measures()` answered by `career_measure_more()` and read by `career_achievement_eval()` the way `total` is
(the first step that reaches `at`); `career_more_key()` names the key and `career_more_kinds()` what wakes it. Steps are new highs, so a win's day
is the day it was first reached.

| Test | Reads | Key | Used by |
|---|---|---|---|
| `sum` | a fact's `value.<field>` added from the first day | `fsum:<reads>:<field>` | Court Hours 10 · 25 · 100 (600 · 1500 · 6000 mins) |
| `kind_first` | facts whose `value.kind` is in `kinds` | `kind:<reads>:<kinds>` | Match Day |
| `kinds_in_cycle` | different `value.kind` inside one cycle (`career_weeks()`) | `kcyc:<reads>` | Cross-Court (3) |
| `weeks_running` | plan weeks in a row holding the fact (a cycle's plan week, else the calendar week; `move_week`'s own day is its week) | `wrun:<reads>` | Full Weeks in a row 2 · 4 · 8, Weeks on Court 4 · 8 · 12 |
| `days_running` | days in a row holding the fact | `drun:<reads>` | (phase 2: perfect days 3 · 7) |
| `month_sum` | in one calendar month, a fact's field added, or a habit's numbers (`habit`) | `msum:` / `msumh:` | Ten-Hour Month (600 mins); phase 2: steps 100k · 200k · 300k |
| `month_days` | in one calendar month, days a habit was done (`habit`) or days holding a fact | `mdays:` | phase 2: 20 nights, 20 days that count, 10 perfect days |

`get_achievements()` gives `have` / `need` for them (a run's best, a month's best). `scripts/check_career.py` knows them (rule 18, `check_more_test()`).

**3. Over the Line on the Bell (#151).** `get_bell()` adds a part `{ k: 'line', total, over, by }` to the day's line from a `move_week` fact written
in the last 7 days, under the crew kind `week` (the switch held weeks use, so only a person who shares their weeks shows). `by` is what crossed it:
the newest Court Log row of that week saved by the time the fact was written (`{ kind, mins }`), or `{ session: true }` when a plan or Library
session was saved later. program.html draws it (`crewMcFace()` case `line`, `CREW_MC_RANK` after `achievement`): The Line's ring, "Over the line
+24" with the change in clay, and "Padel, 75 min · this took their week to 324". Recognition only (GAME-6).

**4. The catalogue, version 15** (`added_in = 15`, `paid_from` the day after the seed, `free = false`): Full Week (first, `repeats = "move_week"`,
100), 4 · 12 · 26 Full Weeks (total, 200 · 500 · 1000), 2 · 4 · 8 Full Weeks in a Row (150 · 200 · 400), 10 · 25 · 100 Hours (150 · 400 · 1000;
25 hours is about 290,000 steps of work, so it pays QUARTER OF A MILLION's 400), Match Day 50, Cross-Court 100, 4 · 8 · 12 Weeks on Court (200 ·
400 · 600), Ten-Hour Month 250. Emblems (`assets/js/emblems.js` ?v=4): a ring for The Line and a court roundel, colour by step, never a metal, in a
new cabinet section, Moving. Courtside (#154): `[message.full_week]`, `full_weeks`, `court_hours`, `court_weeks`, `match_day` in
`career/recognition.toml` and `COURT_LINES` / `COURT_ROUND15` in coach.html (check_career rule 22 holds the two equal). Farsi:
`scripts/i18n/fa/33-week-and-court.json`.

**Rehearsed** on the live project inside one statement that ends by raising its result (so all of it rolled back): the stage, version 15's fact and
16 rows patched in, every athlete's activity facts and a silent pass. 22 activity facts (6 real), no real athlete holds any of the 16 yet, 0
athletes' XP changed; an athlete given made-up activities won 10 Hours, Match Day, Cross-Court, 4 · 8 · 12 Weeks on Court and Ten-Hour Month on
the right days, all at 0 XP, and 25 Hours showed 1480 of 1500. The Bell, with a made-up `move_week`: `{ k: line, total: 324, over: 24, by: padel 75 }`.
Tests: `scripts/headless/over-the-line.js` (9), cabinet (98), coach Courtside and Today (13), check_twins (all agree).

**To apply** (on Amir's word): the stage file (apply_migration); seed version 15 with `starts_on` and every new `paid_from` set (the day after);
`select public.career_observe_activity(athlete_id) from (select distinct athlete_id from public.activity_log) x`; `career_rewards_batch(o, 5,
'silent')` from 0 until n = 0; `career_compare()` ok; every athlete's XP equal to the copy taken before.

**As run (2026-11-24, on Amir's "Yes, apply it").** Every athlete's XP, level and season points kept first in `backup.v15_before_20261124` (44 athletes; drop it after 2026-12-08). The stage applied (migration `stage130_over_the_line`), all seven patches read back in place. Version 15 seeded (199 catalogue rows, sha256 `abfa7621…`, staged in `backup.seed_stage` and checked by md5, the table dropped after). `career_observe_activity()` for the three athletes with Court Log rows: 6 `activity_done` facts. One silent `career_rewards_batch()` pass to n = 0. Read back: 0 awards of version 15 (nobody had reached one), 0 athletes with their XP, level or season points changed, `career_compare()` ok (39 matched, `rules_equal`).

**AA Proof, the same commit.** `phoneAwardsFrom()` in habits.html priced a phone-decided win at the entry's full XP even before its `paid_from`, so a version 14 habit achievement won on the seed day would show its XP for a moment and then fall back to the server's 0. It now prices a win before `paid_from` at 0, as `career_mint()` does (D21). `scripts/headless/career.js` block 5 owns the two new water achievements so the phone has nothing of its own to decide there.
