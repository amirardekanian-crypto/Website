## P3. Score: XP from facts: `score()`

**When:** whenever a profile is read (P10). The result can be cached and is thrown away whenever a fact or the
rulebook changes.

**Reads:** the athlete's facts and awards, `rulebook.toml`, the frozen XP of their missions and quests.

**Steps:**
1. Skip every void fact (P12).
2. For each fact, look up its kind in `rulebook.toml`:
   - `xp = n`: it pays n.
   - `xp_from = "habits"`: it pays the habit's weight, times `completion_bonus` once the target is met, or its share of
     the target while part done (Proof's rule, unchanged). `strength` (the WORKOUT habit) pays 0: the session fact pays
     instead.
   - `xp_from = "mission"` or `"quest"`: it pays the XP frozen when the mission was planned (P6) or the quest finished (P7).
   - `xp_from = "share.mission_sweep"`: it pays the sweep bonus.
3. Apply the caps written on each fact (`cap`): one `session_finished` per plan day per training week, two
   `library_session` a week, one `personal_best` per lift per session, three `effort_win` per cycle, at most
   `max_custom` custom habits a day, a counter at most `daily_cap` times its target.
4. Add the XP of every award (P5) on the day it was earned.
5. **Career XP** is the sum of everything. **Season points** are the same sum over what is dated inside the current
   season.
6. Nothing is stored as a total. Change a number in the rulebook and every athlete's XP is worked out again; awards
   already minted stay (GAME-1).

**Writes:** nothing (the cache only).

**Rules:** GAME-1, GAME-2, GAME-4, GAME-5, GAME-6, GAME-7.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
