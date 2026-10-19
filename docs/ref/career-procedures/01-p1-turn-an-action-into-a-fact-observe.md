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

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
