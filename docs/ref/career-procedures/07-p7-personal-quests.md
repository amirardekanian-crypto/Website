## P7. Personal quests

### P7a. Start

1. **Three doors:**
   - **Amir assigns** one from coach.html → the athlete: a template from `quests.toml`, or his own steps.
   - **The cycle:** at a cycle's start Amir may tick one of its outcomes as a quest; its steps are his ticks.
   - **The athlete picks** one of three templates Amir approved for them (`doors` includes `athlete`).
2. One active quest at a time, two at most.
3. Save the quest with its steps, the door, who set it and the start day.

### P7b. Steps

1. Steps close in order.
2. A `closes_on = "fact"` step closes when its `counts` reaches `target` (optionally `within` a window, or as a `run`
   in a row).
3. A `closes_on = "coach_tick"` step closes when Amir ticks it (writes `quest_step_ticked`). Use it only where only he
   can judge: a skill on video, a pain-free return.
4. Each closed step is a small moment for the athlete (size `win`).

### P7c. Pause, extend, drop

1. Amir or the athlete can pause a quest; pausing missions for an injury pauses the quest too.
2. A quest past its `weeks` is extended, never failed.
3. A dropped quest leaves no mark (GAME-8).

### P7d. Finish

1. The last step writes `quest_done`, paying `share.quest` × the XP of the facts its steps counted.
2. P5 mints its badge, and its title if it has one.
3. Recognition at the quest's `size` (usually `milestone`): it always reaches Amir, and the crew with the athlete's
   yes.

**Writes:** quests, facts, awards.

**Rules:** GAME-3, GAME-7, GAME-8.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
