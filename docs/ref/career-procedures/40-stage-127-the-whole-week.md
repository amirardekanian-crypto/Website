## Stage 127: the whole week, a full moving week pays (2026-11-24, APPLIED)

**Why.** Round 13 *The Whole Week* (ideas #134 to #138). Amir: *"go with your picks but movement should give people xp, because those who walk get
more xp compared to those who play tennis"*, then *"do i need to pick? can the app choose automatically?"*, then *"Yes, build it"*. The source of truth
is the header of `supabase/stage127_whole_week.sql`; the Move minutes table and its sources are [`docs/ref/move-credit.md`](../move-credit.md); the rules
are [`docs/rules/career.md`](../../rules/career.md) and [`docs/rules/habits-in-app.md`](../../rules/habits-in-app.md).

**The price.** Rulebook **version 13**, seeded live 2026-11-24 with `starts_on = 2026-11-24`: `[fact.move_week]`, 150 XP, `limit = 1` per week,
`source = "server"`. Its other numbers (`line` 300, `mark` 150, `per`, `met_floor`, the four walking numbers) are read by `move_rule()`, never typed in SQL
(GAME-10). The seed kept the live catalogue as it was (two rows differ from the repo: *Open* in [`docs/record/INDEX.md`](../../record/INDEX.md)).

**The procedure, `career_move_sync(athlete)`.**
1. **When.** After every save that can move the number: `career_observe_proof()` (Proof's log, a Court Log row, a new steps target; it runs last, after
   `career_derive_days()`), `career_observe_session()` and `career_observe_library()`. Each calls `career_move_safe()`, which catches any error and
   raises a warning: it never stops a save. In `career_observe_proof()`, `steps_auto_safe()` runs first, under the athlete's lock, so today is scored
   against this week's number.
2. **Nothing to do** when there is no rulebook, no athlete, or the rulebook in force has no `[fact.move_week]` (a version before 13).
3. **Which weeks.** `five_week_windows(athlete)`: the weeks Your weeks draws, as one function (stage115, stage122), so the fact uses exactly the weeks the
   athlete sees. In a cycle (today inside the current cycle's weeks) they are the current cycle's training weeks; outside one, the 5 weeks ending with
   this one, rolled on the weekday the athlete's weeks start on, each keeping a cycle's plan where it overlaps one. `get_five_weeks()` was patched (a
   guarded textual patch that raises if the function is not what it expects) to read the same windows. Only windows with `wfrom >= move_full_from()`
   (2026-11-24) and `wfrom <= today` are looked at.
4. **The number.** For each window, `move_week(athlete, wfrom, wto) ->> 'total'`: the sum of the five rounded sources from `move_parts()` (plan, Library,
   court, other, walk), the same number the athlete sees on The Week Line.
5. **What it wants.** One fact per window at or over the line: `kind = 'move_week'`, `ref = 'mw|<wfrom>'`, `day = wfrom` (the week's first day, so
   the week is priced by the rulebook in force that day, D20), `value = {total}`.
6. **Write.** `career_sync(athlete, ['move_week'], want, 'server', refs, career_settled_before(rules))`, where `refs` is every looked-at window's
   `mw|<wfrom>`, so a fact of an older week, outside the five, is never touched.
   - A window at the line that has no fact gets one. An existing fact is updated (its total) or brought back from a void.
   - **What voids:** a window in `refs` whose total has fallen under the line (a Court Log row deleted, a Library session undone, typed steps lowered)
     has its fact voided, and the XP goes with it.
   - **`settled_before`** (today − (`[habits] backfill_days` + 1), 4 days with the default 3): a fact dated before it is neither updated nor voided.
     Because the fact is dated the week's first day, a paid week stops moving about four days into it; a week that reaches the line later is still
     inserted (a new fact is never blocked), only never taken back.
7. **What it shows.** `move_week()` also returns `xp`: the XP the week's live `move_week` fact pays by `career_rules_on(its day)`, 0 if none. The price
   list the apps read (*How the XP works*) names the new kind (a guarded patch of the whitelist `'retest_done', 'day_on_target', 'perfect_day'`).

**Also in the stage (not Career Mode, pointers only).** The Court Log steps cap is `move_cap_on(day)`, 100% of the day's target from 2026-11-24; Your
Number sets itself (`steps_auto()`, `steps_targets.source`). No new table: `steps_targets` gained a column and is already in `BACKUP_TABLES`, the
snapshot and `coach_erase_person()`. Safe to re-run.
