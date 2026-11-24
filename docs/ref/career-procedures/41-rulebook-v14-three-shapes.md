## Rulebook version 14: Three Shapes, Everywhere, phase 1 (2026-11-24, SEEDED)

**Why.** Round 15 *Over the Line* (ideas #146 to #159). Amir: *"go with your picks"*, then the three shapes of an achievement (a single day, a
month's total, days in a row; `.claude/skills/ideas/TASTE.md`), then *"i like your ladder"* (1 · 3 · 7 · 21 · 60, no 10), then *"Yes, seed v14"*.
Phase 1 is catalogue only: every entry is on a test that already existed (`proof` with `daysHit:<habit>`, `streak:<habit>` and `dayStreak`), so no SQL.

**What it added** (`career/achievements.toml` → *Version 14*, all `added_in = 14`, `paid_from = "2026-11-25"`):

| Shape | Entries | XP |
|---|---|---|
| The first day | FIRST STEPS (steps), FIRST REAL NIGHT (sleep), EIGHT GLASSES (water), FIRST FULL PLATE (protein), FIRST STRETCH (mobility), FIRST BREATH (breathing) | 30 each |
| 3 in a row | THREE ON YOUR FEET, THREE GOOD NIGHTS, THREE DAYS HYDRATED, THREE DAYS FUELLED, THREE DAYS LOOSE, THREE CALM DAYS, THREE THAT COUNTED (UNBROKEN's 3) | 60 each |
| Longer runs | OILED UP I · II (mobility 7 · 21), SLOW EXHALE (breathing 7) | 150 · 350 · 150 |

Supplements are left out on purpose (a coach celebrates what you do, not a product you take; the daily tick already pays).

**GROUND COVERED counts "your steps number"**, and its rule text says so since this version (a wording change only). Checked on the live
project before the change: `career_observe_proof()` writes each `habit_done` from `hab_log_credited()`, which scales the day's steps (typed plus
the Court Log credit) by the global target over the athlete's own target for that day (`steps_target_on()`), and `career_measures()` → `run:steps`
counts days whose value is at or over `[habits.targets] steps` (10,000). So a day at the athlete's own number is a day of the run, and an athlete
with no number of their own is measured against 10,000. `daysHit:steps` (FIRST STEPS) reads the same values.

**The emblems** (`assets/js/emblems.js` ?v=3): two new rung glyphs, `stretch` (mobility) and `breath`, as the OILED UP and SLOW EXHALE ladders. The
first day and 3 in a row sit in front of each ladder's rung I, the same coin in Ink with a **1 DAY** or **3 DAYS** banner; UNBROKEN's 3 sits in
front of its own I. Farsi: `scripts/i18n/fa/32-three-shapes.json` (drafts until Amir has read them).

**The seed, as run (2026-11-24, on Amir's "Yes, seed v14").**
1. `python scripts/check_career.py` OK; `scripts/test_check_career.py` 126 tests OK (two counts raised to the new totals).
2. The payload (`career_seed.py`, sha256 `bd860588…`) is 72 KB, too big for one `execute_sql`: it was staged in `backup.seed_stage` in seven
   pieces, checked by md5 against the local text (rulebook `8d4e3d9d…`, catalogue `7222a27f…`), and the table was dropped after the seed.
3. The dry run (`p_dry_run => true`): 178 catalogue rows, 46 athletes, the 98 voids that were already there, nothing new.
4. Every athlete's career XP, level and season points kept first: `backup.v14_before_20261124` (44 athletes, from `career_scored(id, true)`).
   Drop it after 2026-12-08.
5. `career_seed(14, …)`, then `career_rewards_batch(o, 5, 'silent')` from 0 until n = 0 (offset 45).
6. Read back: **130 awards to 26 athletes, all at 0 XP**; 0 athletes with their XP, level or season points changed; `career_compare()` ok
   (39 matched, `rules_equal`). By entry: FIRST REAL NIGHT 21, FIRST FULL PLATE 16, FIRST STEPS 15, THREE THAT COUNTED 15, EIGHT GLASSES 12,
   THREE GOOD NIGHTS 11, FIRST STRETCH 9, THREE DAYS HYDRATED 8, THREE DAYS FUELLED 7, FIRST BREATH 5, THREE ON YOUR FEET 4, THREE DAYS LOOSE 4,
   THREE CALM DAYS 2, OILED UP I 1; OILED UP II and SLOW EXHALE nobody yet.

**Next phases** (BANK.md #159): the month shape needs two new tests (days done in a calendar month, steps summed in a month), then training
(Library, check-ins, bests). Full Week, Court Hours and the court family (#146, #148, #149, #157, #158) need the `activity_done` fact and a stage.
