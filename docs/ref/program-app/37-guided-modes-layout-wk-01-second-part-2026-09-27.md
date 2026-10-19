## 🧭 Guided Mode's layout (WK-01, second part, 2026-09-27)

**Since 2026-10-13 its top bar is the slim bar's green with the card's ⓘ, and ‹ Prev is not drawn on step 1** (*Every other screen in
the Centre Court look*, above). The pinned row and the round-by-round circuits below are unchanged.

- **The current row is pinned** (CSS `position: sticky` on `.step-current` inside `.step-scroll`, whose
  `.ex-log` lets it out with `overflow: visible`): in place when it is on screen, held just above the footer
  (or under the top bar) otherwise, with a solid tint because it passes over the rows above. Sticky cannot
  lift a row above its own table, so `renderStep()` also scrolls just far enough when the whole table starts
  below the fold (a first-time lift, its video and cues open). Measured before: the row was under the
  footer on 4 of 14 steps at 375×667 and 8 of 14 at 320×568; after: on screen on every step at all three sizes.
- **Kg on the rest screen**, beside reps and RPE (`paintTimerLog()`, above).
- **The warm-up is a step** (Line Call, 2026-10-13, Second Serve G1; Amir: *"yes to all recommended"*). Guided
  used to leave out everything with nothing to log, so it ended on "Every set logged" and the finish card then
  said *In progress · 18 of 19 · Finish early*: a full session filed Partial. Now `buildStepSeq()` keeps every
  run of such items (the warm-up, a prep circuit, a cool-down) as ONE step in its place, `{ group: true, cards,
  name }` named by its block; `renderGroupStep()` lists them, a row ticks one (the card's own `toggleCheckOnly()`),
  **Done ✓** ticks the rest and moves on with no rest, **Skip** moves on and leaves them unticked (the report says
  so). Its eyebrow says where it sits (*Before exercise 1*, *After the last exercise*); exercises are still counted
  without it (*Exercise 1 of 6*). The end says *Everything logged.* only when the whole day is ticked, else names
  what was skipped. A day with no set or round to log still has no Guided.
- **Circuits join Guided, one step per round** (`buildStepSeq()`): a circuit that logs something (a superset,
  a complex, conditioning); a prep circuit logs nothing and is part of a warm-up step (above). A round has
  no tick of its own, so `stepDone()` reads its RPE (the same `<id>_rpe_<Name>[_rN]` key the list writes),
  this Guided session's finished rounds, or the circuit's tick; the last round ticks the circuit
  (`finishRound()` → `toggleCheckOnly()`), the one unit the day counts it as. The round's rest screen asks
  its RPE through the row's own buttons (`paintRoundLog()`). The pill reads *Round 2 of 3*.
- **The rest screen scrolls** on a short phone instead of cutting the panel off (`.timer-overlay.has-log`),
  and its ring shrinks under 720 px tall.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
