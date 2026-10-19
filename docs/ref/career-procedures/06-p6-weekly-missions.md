## P6. Weekly missions

### P6a. Plan the week: `plan_missions(athlete, week)`

**When:** the athlete's first open or first save of a mission week (Monday to Sunday, the athlete's local time). Never
at a fixed hour, so no cron is needed.

**Reads:** last week's facts, the athlete's programme and tracked habits, `missions.toml`, Amir's pins, the crew
mission if one is set.

**Steps:**
1. If Amir paused missions for this athlete, stop.
2. **The plan slot** (coached athletes only), first match wins:
   1. a retest is due this week → *Test Day*;
   2. last week was broken (`week_broken`) → *Second Serve*, the same job paid as resilience;
   3. last week had sessions with sets left unlogged → *Every Set Counts*;
   4. last week had a check-in skipped → *Check In First*;
   5. otherwise → *Hold Your Week*.

   No mission asks for progress, on purpose: a personal best can't be ordered for a given week without pushing past the
   RPE the plan sets. Progress is paid by badges, achievements and quests.
3. **The recovery slot:** among the habits the athlete tracks, the one with the lowest share of target days last week
   (a tie goes to the heavier habit). Pick that habit's recovery mission. A habit that is off is never picked.
4. **The stretch slot:** a `slot = "stretch"` mission the athlete can do, preferring one not done in the last four
   weeks.
5. **A free athlete** gets two recovery slots (their two weakest habits) and the stretch.
6. The same mission is not picked twice running in the same slot, except *Hold Your Week*.
7. **Amir's pins** replace the picked mission in their slot.
8. **The crew mission**, if Amir set one this week, is added for everyone on the board.
9. **Freeze the XP:** each mission's XP is `share.mission` × the XP of the work its target asks for, at rulebook values
   (GAME-7). A mission on supplements is a small mission.
10. Save the missions with their targets and frozen XP.

### P6b. Progress and completion

1. Each new fact moves every open mission that `counts` it (by `measure`: a count of facts, the units logged, or the
   days done).
2. Reaching the target writes `mission_done` (dated today, paying the frozen XP).
3. The third `mission_done` of a week writes `mission_sweep` (paying `share.mission_sweep`).
4. Missions are never claimed. On Sunday night an unfinished mission simply ends.
5. A week with a sweep extends the athlete's Treble run (a badge, P5).

### P6c. The crew mission

1. Amir sets it from coach.html (it replaces the Quest week lever): a mission from `missions.toml` with
   `slot = "crew"`, and a crew target.
2. Its total is the sum over everyone on the board, returned by the server; the app never adds up anyone's numbers
   itself.
3. When the total reaches the target, every athlete who added at least one counted fact gets `mission_done`, paying
   `share.mission` × the XP of their own share of the work.

**Writes:** missions, facts.

**Rules:** GAME-4, GAME-7, GAME-9 (the crew total shows a sum, never one athlete's number), GAME-12.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
