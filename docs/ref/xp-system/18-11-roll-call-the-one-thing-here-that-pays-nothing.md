## 11. Roll call — the one thing here that pays nothing

One sentence a day, visible to everyone else on the board, written and read in the **Crew** tab. Catalogued in
[`HABITS.md`](../../../HABITS.md); the schema and every guard are in
[`supabase/stage15_roll_call.sql`](../../../supabase/stage15_roll_call.sql). It appears in this
document only to say where it sits relative to scoring:

**It pays no XP, and nothing about it feeds a level, badge, quest or board position.**
That is a design decision, not an oversight — the moment a sentence earns points you get
one character of gibberish every night at 23:58. The reward is that the line sits next to
the writer's rank.

Two consequences worth keeping straight:

- **`NOTE_MAX = 200`** is enforced in *both* places, like everything else here: the input's
  `maxlength` and `hab_clean_note()` on the server. The server is the one that matters.
- **The percentage beside a line is self-reported.** The client sends the day's
  completion it has already computed. That is fine *because it buys nothing* — it is
  decoration on self-authored text. Mirroring `dayPct()` into plpgsql would add a third
  place the scoring rules have to agree, which is precisely the class of bug section 8
  exists to warn about. **Anything that pays stays server-scored. This does not pay.**

If you ever make roll call pay — don't — it would have to move to the server-scored side
of that line, and `hab_notes` would need the same treatment `hab_xp` gets.

### The one place it touches the log

`saveLog()` calls `refreshNotePct()`. If the athlete has already written today's line and
then keeps logging, the percentage beside it is quietly brought up to date (debounced 4s)
rather than leaving "38%" under a sentence written at lunchtime on a day they went on to
finish. It re-posts the same body with a new `pct`; it never changes their words.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
