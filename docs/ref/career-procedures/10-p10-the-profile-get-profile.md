## P10. The profile: `get_profile()`

**When:** an app opens, comes back to the front, or saves.

**Returns**, for the signed-in athlete (or any athlete, for Amir):
- career XP, level, rank, XP to the next level; season points and board place;
- the four numbers: weeks held (current and best), sessions with Amir (from stage73, the paid sessions Century counts), personal bests, comebacks (a free athlete's four
  come from habits);
- the title worn and the titles owned;
- once the catalogue switch is on, the **core** of the career: every award id owned, the ladder, the nearest goals, the moments to tell. The
  shelf (badges by meaning with tier, metal and the day of each tier, achievements, the full titles list, recent awards) is a second read,
  **`get_awards()`**, asked for only when a shelf opens (*Phase 3, as built*);
- this week's missions with progress; the active quest with its steps;
- moments waiting to be shown.

**Rules:** GAME-2 (both apps read the same answer).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
