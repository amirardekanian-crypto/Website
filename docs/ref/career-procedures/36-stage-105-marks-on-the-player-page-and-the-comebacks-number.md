## Stage 105: a mark's step is a trophy on the Player Page, and the comebacks number counts what HARD TO KILL counts (2026-10-26, APPLIED)

Amir, looking at Pooya Pasandideh's page (the app said 72 sessions, the 50 sessions trophy was missing) and at his own (5 comebacks, no comebacks trophy):
*"all of them should be the same, and should be shown, fix the other thing as well"*. Files: `supabase/stage105_marks_and_comebacks.sql` (applied 2026-10-26 as migration
`stage105_marks_and_comebacks`), `scripts/career/rollback_stage105.sql`, and the phone (`plTrophies()`, `openPlayerTrophy()`, `CS_LINE` in program.html, sw `aap-v237`).
No XP, award or fact moves (GAME-6); no table is added.

**What the live rows said.** Pooya had 74 finished sessions and the app said 72: two were a plan day done twice in one training week (Day 2, 25 Jun and 1 Jul; Day 1,
19 and 25 Aug), which `session_finished` counts once by its own rule, so 72 is right and was never a bug. His Century step 2 (the 50 sessions step, metal `silver`) was
won 2026-08-16 and sat in his own cabinet. It never reached another person's page: `crew_page()` built `achievements` from `kind = 'achievement'` awards only, and a mark's
step is `kind = 'badge'`. The comebacks number was worked from `comeback` facts (every day on target after 3+ days off) and `training_return`, while the HARD TO KILL mark counts
`comeback_stuck` (a comeback followed by 7 days on target in a row, `comeback_stick`) and `training_return`. Amir's card said 5 against marks at 3 and 5, and the mark said 0
(his best run after a comeback is 5 days; nobody has ever had a stuck comeback: 92 comebacks, 0 stuck).

**What changes.** Two guarded textual patches (each line found once or the stage refuses; safe to re-run):
- `crew_page()`: `achievements` also carries the four marks' steps (`held_weeks`, `century`, `bests`, `comebacks`, the list `get_bell()` and `get_courtside()` use). The id is the
  award id (`badge:century:2`: the badge and the step 1 to 5 are all the phone needs). The name is looked up under the award's own kind, and the list holds 60, not 40. It is
  behind the same switch as an achievement, so nothing new is turned off. An old phone ignores an id it does not know (`plTrophies()` filters it out).
- `career_rewards_profile()`: `numbers.four.resilience.value` counts `comeback_stuck` + `training_return`. So Your numbers, a Player Page's own comebacks row, the Highlight Reel
  and the mark's next step all read the number the mark reads. `get_profile()`'s `numbers.comebacks` (the shadow count `career_compare()` compares) is not touched.
  23 of 36 athletes had a number above 0 before (94 in all); 23 changed. `backup.stage105_before` holds the old numbers (drop it after 2026-11-09).

**On the phone.** A mark step on a Player Page is drawn and opened exactly as the cabinet does (`E.mark()`, `achDetailOf({k:'mark'})`: Won by, no Share, no Tell the crew), sorted
into the same sections. The comebacks line under the number says *Comebacks that held for a week*.

**Check.** `node scripts/headless/cabinet.js` (98 checks: the Player Page holds "50 sessions", it opens as a mark's step, 17 won with the level medals), `career.js` 235,
`love-all-words-c.js` 63, `scripts/check_twins.js`. `lounge.js` crashes the headless browser at a screenshot with or without this change on this PC (checked on a clean HEAD).
**The way back:** `scripts/career/rollback_stage105.sql`.
