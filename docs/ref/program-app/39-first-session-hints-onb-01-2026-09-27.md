## 💡 First-session hints (ONB-01, 2026-09-27)

AA Proof runs a tour; the training app, the paid product, had nothing, and the rules that make logging fast
lived only in the guide, two tabs away. Now three hints, `paintHints(day)` in `program.html`:

| Hint | Shows | Says | Gone when |
|---|---|---|---|
| `bar` | under the session bar, while the day is not started | *Tap **Start** as you begin, so I know how long the session took. Or **Guided**: one set at a time, with your rest timed.* | the clock starts, or Guided opens |
| `set` | under the first set to do, on an open card | *Weight in, set done: tap the **circle**. One tap means done as written. Different reps? Type them first.* (no weight on a bodyweight move, no reps on a hold) | a set is ticked (a warm-up tick does not count) |
| `rpe` | under a set's How hard? strip when it opens | *How hard was that set? **10**: not one more rep. **8**: two left. I set your weights from it.* | an RPE is picked |

- **One at a time, in the flow**, never over the work: the one that applies where the athlete is, the most
  immediate first (`rpe`, then `set`, then `bar`). **Got it** retires one too. A tap on a hint never folds the
  card under it. None inside Guided, none on Home.
- **Once per athlete, not per phone**: `<id>_onb` (`{bar, set, rpe}`) syncs with the progress.
- **Never for someone who has trained**: a later cycle (`currentCycleIndex > 0`), a finished session
  (`hasFinishedASession()`), or last time's weights on the phone mark all three done at once. Never in the coach
  preview; always in the demo, where everyone is new.
- The words name real controls, like the guide (CNT-01): rename Start, Guided or the circle and change
  `ONB_TEXT` in the same PR.
- **The look** (Centre Court, A's P66, 2026-10-12): a green tile with Amir's photo (the week note's `.wn-av`, so the
  hint is his voice), his words in white with the named controls bold, **GOT IT** in mint, and a notch pointing at
  what it explains: under Start's middle for `bar` (the hint sits under the green bar, on the paper), at the set's
  circle for `set`, at the 6 to 10 keys for `rpe`. Move the circle or the keys and re-aim the notch in the Centre
  Court block.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
