## P13. Offline and the preview

1. The phone keeps the last `get_profile()` answer, the way it keeps the plan (`plancache`).
2. A tick shows its XP at once, from the rulebook's numbers for that one action, marked pending.
3. When the server answers, its number replaces the preview.
4. The preview is a copy of a server rule, so it goes into `scripts/check_twins.js` the same day.

As built in phase 2: AA Proof shows the profile's XP plus what its own scorer has moved since that answer (its scorer, in Career
Mode, is the server's habit half on the same log: the whole career, the WORKOUT habit at 0 a day), so a tick's XP is exact rather
than marked pending; the training app previews a session from the profile's prices and shows the held week as counting until the
server says so (P17). *Phase 2, as built*.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
