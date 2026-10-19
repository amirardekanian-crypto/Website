### Embedded on the training app's Home — `?embed=1` (Fork 1B, 2026-09-26)

Amir: Proof should be *"part of the training app"*, and of the ways to build it he took
**B2**: the athlete ticks today's habits on `program.html`'s Home, and **Proof draws that
strip itself**. Home loads `habits.html?client=<id>&embed=1` in a frame under the Daily
Habits card (`mountProofStrip()` there), only once the card is near the screen, and shows
it only when this app says it is ready. The card stays either way.
- **`renderEmbed()`** draws today's roster (`rosterOn(TKEY())`) as **one row of chips** (since 2026-10-19, Career Mode round 5) in the
  training app's clothes: paper, green, clay, Barlow (the `html.embed` styles, scoped so the
  full app never meets them). There is no card: the head and the chips sit on that app's paper. The head is
  *Today's habits* (Space Mono), the verdict Proof already computes (*2 to go* in clay, *On target* or *Perfect* in green) and
  *Open AA Proof ›*. A chip (`embedChip()`) is a 36 px pill with a ring, the habit's short name (`embedLabel()`: the name the week
  table uses, and a custom habit's own name in sentence case cut at a word at 12 characters) and, on a counted habit, its count small
  (*Protein 2/3*, *Steps 6.2k/10k*). A done chip is solid green with a white ring and a green tick.
  **A tap does what the habit's + or circle did:** `bump()` on a small counted habit (Water, Protein: one step of it), `toggleHabit()` on a checked one, and,
  on a counted habit whose full day takes more than ten taps of its + (`embedBigCount()`: Steps 20, Sleep 15), **the number row** (`openEmbedEdit()`,
  `embedEdit()`), prefilled with the target (or what is logged, when that is over it), as the old circle did. The row opens under the chips with the same
  field, buttons and Save as the full app's sheet, the open chip says so (`aria-expanded`, a green outline), a second tap on the chip or the cancel button
  closes it, and the frame's height message follows it both ways. The locked session is a chip that is not a button, on when the programme says the session
  is done. The name no longer opens the full app on that habit (`?open=<id>` is still handled at the end of boot, and the head's link opens the full app).
  Only today: earlier days are filled in here.
- **Every write is this app's own**: `setVal()`, the log, the sync. Nothing is scored, stored
  or synced twice, and `program.html` still writes no `<id>_hab_*` key (body weight, which
  it owns, aside). It redraws its card from the snapshot `publishCardSnapshot()` republishes.
- **What waits for the full app:** `checkLevelUps()` stands down in the strip, so `CFG.seen`
  does not move and every level-up, reward, quest and season title is still waiting for its
  takeover, and a medal or a perfect day for the wins card, the next time Proof opens. So are the tour, the install offer, the XP flights,
  the board sweep (`autoJoinBoard()`), the silent reward baseline, title minting, and
  Progress and Crew. The toast shows inline under the chips.
  **Career Mode** (once the XP switch is on): the strip never asks the server for the profile (`fetchCareer()` stands down when
  `IS_EMBED`). It reads the copy in `<id>_hab_career`, which only the full app writes. The career reveal waits for the full app,
  like every takeover.
- The strip follows the training app's dark mode (`dark_mode`, then a message on each
  toggle), and reports `ready` with its height, `setup` (never onboarded: no strip) or
  `error` (sign-in or load failure: no strip) through `postMessage`, same origin only.
- Never in the coach's preview, and never for a free athlete (they have no training app).

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
