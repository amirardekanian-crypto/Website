## Stage 95: a season counts what was done in it, as built (2026-10-20)

Applied to the live project on 2026-10-20 on Amir's word. The file is `supabase/stage95_season_earned.sql`, safe to re-run. The way
back is `scripts/career/rollback_stage95.sql`, on Amir's word only. The scores as they were are in
`backup.career_scores_before_stage95`, and every award row in `backup.career_awards_before_stage95` (drop both on 2026-11-03).

**Why.** Two days into Season 1 the Crew board read Ehsan A. 3,507 and Elmira A. 3,280. Of Elmira's 3,280, 2,910 was 15
achievements and 370 was her habits; she had not trained a session in the season. Amir: **"every achievement from past season is
theirs, its not gotten back from them, and its xp is once given to them. why did you give the xp to them again this season? it
should be deducted, and the xp should only be counted from the activity in this season. if they finish an unfinished achievement
now, they should get xp."**

**What had happened.** A new rulebook version brings achievements (5, 9 and 10, on 19 and 20 October) and pays everyone who had
already earned one, at once and silently. D20 (stage76) dates such a reward *no earlier than that version's start day*, so a
60-day sleep run that ended in September sat on 20 October, which is inside Season 1. The XP was paid ONCE and is in the career,
where it belongs; the season sums every award dated inside it, so the same XP showed again as a season score for activity done
before the season began. 120 awards (16,000 XP) were in that case, for 26 athletes; one more silent award (40 XP) had been
earned on 19 October and still counts.

**What changed.**
1. `career_awards.earned_on` — the day the activity behind the award was done (the day the test crossed on, before D20's clamp).
   `career_mint()` writes it for every new award (`least(unclamped day, dated day)`).
2. `career_facts_paid()` — the award branch's last column, `career_only`, is now `earned_on < season_start_of(day)`. That is the
   flag the function already carried for "counts toward the career, never toward a window"; `career_compute()` (season and week)
   and `career_facts_xp()` (every windowed read) already honour it, so nothing else moved. An award dated inside a season whose
   activity was done before it began stays in the career (XP, level, Your moments, the awards list) and is left out of the season
   and the week. An achievement finished in the season has `earned_on` inside it and counts in full.
3. `season_start_of(date)` — the newest season that had started by that day (null before the first).
4. `career_earned_days(athlete)` — the evaluator of `career_evaluate()` with nothing owned and nothing minted, returning each
   crossed tier's day. The stage used it once to backfill the silent awards; baseline and live awards were never clamped, so for
   them `earned_on = day`. Execute is revoked from everyone but `service_role`.
5. Every cached score was emptied (`stamp = 'stage95'`) and worked out again inside the stage, so the board was right the moment
   it returned. `career_stamp()` does not see a change of function, so a stage that changes how a score is worked out has to do this.

**What did not change.** No award was removed and no career XP or level moved: across 40 athletes 0 levels down and 0 career XP
down (Elmira's career XP rose by 54 only because her cached score was a day stale — she had ticked habits since). Her season
number went 3,280 → 424 (her habits), Ehsan's 3,507 → 2,637 (the 900 of his three 18 October awards, the 1,000 for finishing
cycle 2 that day, one session with its log, and his habits), Soha's 2,204 → 1,544, Amir's 2,718 → 1,328. `career_compare()` stayed
`ok` (35 matched, `rules_equal`). Past windows are untouched: only an award dated inside a season and earned before it is
affected, and there were none before 19 October.

**Forward.** A rule change that reveals an achievement an athlete already earned pays the XP once, into the career, dated on the
seed day (D20), and adds nothing to the season. D20's other half is unchanged: a reward's `day` is where it sits in time.

⚠️ Rehearse a change to a score's rule on the real rows without touching them: the whole stage inside one `execute_sql`, ending in
a `do` block that `raise exception`s with the results (everything rolls back). Check that no career XP differs before comparing
season numbers, and read a difference as a stale cache first (run the OLD code fresh on one athlete and compare).
