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

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
