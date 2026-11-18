## Stage 109: an optional day (2026-11-18, APPLIED)

**Why.** Amir wanted an easy zone 2 cardio day in one athlete's Cycle 2 that the athlete may do or skip. A week was held only when every id in
`workouts.days` had a session that week, so a day the athlete was free to skip had to go on a notes card instead of being a real day.

**The field.** A day may carry `"optional": true` (`SCHEMA.md` → `workouts.days[n]`). Only the JSON value `true` counts; absent, `false` or anything else is a
plan day. The checker fails any other value, and fails a programme whose every day is optional (no week could ever be held).

**What it does.** One function, `career_weeks(text)`: its `plan` leaves out every optional day, from all three sources it reads (the programme for the current
cycle, the newest `program_versions` row for a past one, then the `programHistory` entry by position). The return shape is unchanged, so every reader follows:
- `career_derive()`: `held` asks for every plan day only; `nsess`, `by_book` and the spare (stage106) read plan-day sessions; `cycle_finished` is done ÷
  (plan days × weeks), the optional day on neither side;
- `career_cycle_wins()` / `career_entry_sets()`: a cycle's effort wins compare plan-day sessions;
- `crew_page()`: an optional session is drawn as `extra`, the bonus the week view already had; `per_week` is the plan days;
- `career_facts_paid()`: an optional session still PAYS as a session. Its `plan_day_week` limit key finds no plan week and falls back to the ISO week and the
  day id, so it is still capped per day per week.
Session XP, the full log, the check-in, push reminders (days since the last session) and the session counts (Century) are untouched.

**The twins.** program.html `planDayIds()` (the week count, `holdState()`, `careerEarn()`'s week-closes and week-left, `careerWeekByBook()`, `weekDoneOn()`,
`suggestedDayId()`, `leastTrainedDay()`, `cycleProgress()`); coach.html `planDaysC()` / `optionalDayIdsC()` (Adherence: Planned = N/week leaves it out and its
sessions are "+N optional, a bonus"; Days a week "2 + 1 optional"; its day card wears an *optional* pill). `scripts/check_twins.js` holds the app and the
dashboard together and checks the snapshot's `career_weeks()` carries the four filters. The checker leaves an optional day out of every weekly number
(the volume floor, the day loads, the contacts). Home labels the day *Optional*, never makes it Next up, and opens and logs it like any day.

**D20.** It changes how a week is worked out, so it was checked first: on 2026-11-18 no day in `programs`, `program_versions` or any `programHistory`
carried an `optional` key. Before and after, all 329 rows of `career_weeks()` across every athlete had the same plan (fingerprint
`5013f5951027956ebb097f3853088e20`): no week, fact or award moved. A day marked optional LATER in a running cycle re-judges that cycle's weeks at the next
evaluate (a week broken only by that day becomes held); a closed cycle is read from its saved version and does not move.

**Check.** `node scripts/career/rehearse_optional.mjs` (PGlite, nothing live): before, a week with Days 1 and 2 and no optional Day 3 is broken; after, it
is held, a week with the optional day standing in for Day 2 is still broken, a control athlete moves not at all, an optional session pays a session's XP,
past cycles leave it out, and the rollback puts the function back exactly (19 of 19). App: `node scripts/headless/optional-day.js` (21). Dashboard:
`node scripts/headless/coach/run.js optional-day` (7). The way back: `scripts/career/rollback_stage109.sql`, on Amir's word only.

**Not done.** The weekly Quality mix (`qualityMix()` / `qualityCheckC()` / the checker) still reads every day, the optional one included. The dashboard's
inline editor has no switch for it: the pipeline writes the field.
