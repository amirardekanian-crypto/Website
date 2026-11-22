## Stage 120: the Race on Crew (2026-11-22, APPLIED)

**Why.** Amir: *"the aim of having leaderboard was for people in the community to be able to challenge themselves against other people and see how
consistent they are, how much point they got, in the past 7 days, in the past month and in the whole season / but the leaderbord is too far down"*.
He picked direction A, the race card, and said *"lets build all"*. Applied the same day.

**The score.** `career_compute()` appends `career_board_periods()` by a guarded textual patch on its `'week'` line (one anchor, raises otherwise):
`month` = the last 30 days clamped to the season's start the way the week is (`from`, `points`, `days`), and `active` = `wk` (the last 7 days as
`'0110101'`, today last) and the counts of active days in the week, month and season. An active day has a habit value above zero, or a paid fact that
counts in the season (not `career_only`). Same pieces, same formula: week, season and career did not move, and `career_compare()` stayed `ok`. Every
cached score was worked out again (`stamp = 'stage120'`).

**The board.** `crew_board(p_limit, p_scope)`: `week` | `month` | `season` (the default, so a phone that sends no period gets what it always got);
still the crew only, never `leaderboard_top()`; adds `days` and `wk`; always sends the row just above you, so the card can name who to catch.

**The phone.** `crewRaceHTML()` under `crewWeekHTML()`: tabs, the top three and you, seven dots, the clay ring on first place, ▲/▼ against the last day
this phone saw the board (`<id>_crewboard_rank`), the line of who to catch (`crewChaseHTML()`). The tab is `aa_crew_scope`, never synced; every board copy
is `<id>_crewboard*` and stays out of the progress push. A server without the period answers an error, and the phone falls back to the season alone with
no tabs (`_raceOff`). Nothing pays (GAME-6).

**Proof.** On the live rows: week ≤ month ≤ season for all 19 crew members, and three different leaders (7 days, 30 days, season).
`scripts/headless/race.js`. **The way back:** `scripts/career/rollback_stage120.sql`, on Amir's word only.
