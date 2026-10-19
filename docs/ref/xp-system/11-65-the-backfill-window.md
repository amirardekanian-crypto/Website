## 6.5 The backfill window

`BACKFILL_DAYS = 3` — **today plus the three days before it are editable.** The day strip
at the top of TODAY picks which day the taps land on; `setVal()` refuses anything outside
the window, so nothing can be written to a closed day even if the UI is confused.

Move the number and the strip grows or shrinks with it — but check the CSS: the strip is
`repeat(4, minmax(0, 1fr))` and is sized for four cells at 320px. Past five it needs to
scroll or wrap.

**What backfilling recomputes.** Everything derived from the log: habit and overall XP,
streaks, consistency tiers, milestones, quest progress, and both leaderboard windows once
the log syncs. That is the point of allowing it — someone who forgot to log Saturday
should not lose Saturday's XP. Two things it deliberately does **not** do:

| | Why |
|---|---|
| Fire the **perfect-day** celebration for a backfilled day | It is scoped to today. You do not get a fanfare for paperwork — badges and tiers still pop, because those are about the run, not the day. |
| Reopen that day's **roll call** sentence | Section 11. Fixing Saturday's steps is admin; rewriting what you said about Saturday is not. |

**It is an affordance, not a lock.** The app pushes its whole log blob to `save_progress`,
so devtools could always write further back — that was true before the strip existed.
Enforcing the window server-side means diffing the previous snapshot against the incoming
one on every save, and rejecting or reverting changes to closed days. Buildable; judged
not worth the complexity for a board among one coach's own clients. If the board ever
opens up beyond that, revisit it.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
