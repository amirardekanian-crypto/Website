## 🔥 Warm-ups are a list, and a circuit's rest is never invented (WK-05, 2026-09-27)

- **A circuit that logs nothing is a warm-up list** (`isPrep` in `renderCircuit()`: no `logWeight`, no
  `logRPE`, which is what a prep block gives by default). One line per movement: letter, name, dose and ▶ when
  it has a video, with its steps and cues folded under a chevron (`.round-row.prep`, `togglePrepCues()`; the steps
  first, since 2026-10-11). A tap on the row or the chevron opens them; ▶ plays and never toggles. The chevron
  shows only once the row has something to fold (`has-cues`: its cues, its steps or both, which `paintSpine()`
  fills in from the Spine). A real four-movement primer opened to 1001 px with twelve cue lines always open; it
  opens to 452 px now, on one screen.
- **A working circuit keeps its cues open, and folds its steps** (2026-10-11): under an item's cues, one small
  **How to do it · 5 steps ›** line (`.round-how-tog`, `toggleRoundSteps()`, 36 px to see and 44 to hit), shown only
  when the entry has steps (`has-steps`). A tap shows You need and the steps under it. So the circuit grows by that
  one line per item, about 38 px, and not by the steps (measured at 320, 360 and 390 px in `howto-steps.js`). The
  Spine's cues win on a circuit item too, its own only the fallback.
- **Rest is never invented, for a circuit either.** It fell back to 60 s, so 19 of the 135 live circuits
  (7 athletes, 18 of them warm-ups) showed "rest 1:00" that nobody wrote. Now: the circuit's own rest
  (`rx.rest`, or legacy `restSec`) → the block's → none. Only its own shows in the line of numbers. None
  written: a working circuit's button says **Rest timer ⏱** and opens at a minute; a warm-up has no rest
  button.
- A warm-up with no rest button is still a circuit: `initSetOrRPE()` and `initNotes()` used "has a rest
  button" to tell a circuit from a simple item, and now test the circuit itself, so it keeps its Note row.
- **Under 360 px a row with a kg box puts the dose under the name** (POL-01, 2026-09-27): a superset's row
  (letter, name, dose, kg) ran 34–42 px wide of a 320 px phone and cut the kg box off the card. A warm-up's
  rows have no box and stay one line.
  Guided still leaves warm-ups out (WK-01). Working circuits keep their cues open, as before.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
