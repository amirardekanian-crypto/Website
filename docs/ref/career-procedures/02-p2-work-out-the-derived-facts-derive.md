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

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
