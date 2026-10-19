## P4. Level, rank and the season

**When:** inside P3.

**Steps:**
1. **Level** from career XP on Proof's curve: the cost of level n to n+1 is `base × n^growth`, rounded to 10, never under
   10. Levels never reset (decision 1).
2. **Rank:** `ranks[(level − 1) ÷ levels_per_rank]`, sub-level `(level − 1) mod levels_per_rank + 1`. Past
   `prestige_after` (50) the ladder starts again with a star: level 51 is ★1 ROOKIE 1. No ceiling.
3. **Re-anchoring (once, in phase 1):** set `base` so two months of solid work, training included, still reaches level
   20, measured on the shadow data (P14).
4. **Season points:** XP dated inside the current season (`public.seasons`). The board ranks season points.
5. **A new season** starts only on Amir's word (`start_season()`). Season points go back to zero; levels don't move.
6. **The season's title:** when a season closes, everyone with at least `title_points` season points gets its title,
   minted (P5). This replaces Proof's "level 5 inside the season".

**Rules:** GAME-1, GAME-10.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
