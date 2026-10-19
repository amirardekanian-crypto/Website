## 🔍 Readable in both themes (A11Y-01, 2026-09-26)

- **Text tokens.** `--green-ink` and `--clay-ink` carry every green or clay *text* colour (37 + 58 rules were
  swapped by pattern: `color: var(--yellow|--ice)`). Light mode: the brand colours, so nothing moved. Dark mode
  (`body[data-dark]`): #6DBE95 and #E06B43. `#screen-plan`'s single-accent remap covers `--clay-ink` too.
  **Since 2026-10-13 they belong to the app's ONE colour set** (see *Centre Court* → *Tokens*): small clay text is #B5461F
  in light mode everywhere (it was #C7552F outside the training day, 4.1:1), and clay text of 18.66 px bold or more reads
  `--clay-big`, which keeps #C7552F.
- **Dark mode fixes that were plain bugs:** the rest timer overlay stayed light while its digits went light
  ("2:00" at 1.08:1); the Home habits card coloured its arrows and streak count with `--grey-bg`, near-black in
  dark, on a card that is always dark green.
- **Tab bar:** inactive tabs grey at full strength (they were 55%-faded green), labels 11 px, 48 px tall.
- **Sizes:** no label under 11 px on Home, the day, the finish card, the rest timer, Coach and Game Plan
  (glyphs, the Level ring and the day letters excepted, at 9–10.5 px); DS-03 (below) made 11 px the floor everywhere. Session notes 16 px. The session rating
  is two rows of five at 44 px (ten in a row were ~24 px); the ⓘ is 26 px at the row's right end (20 px before the working card) with a 44 px hit area.
- **Pinch-zoom is on (2026-09-27).** The viewport said `maximum-scale=1, user-scalable=no`, so nobody could
  enlarge a cue or a number; it is `maximum-scale=5` now, as in AA Proof. `html { touch-action: manipulation }`
  keeps pinch and scroll and drops only the double-tap zoom, which on an iPhone could fire on two quick taps of
  +15s or an RPE button. Every field is 16 px (DS-03, below), so tapping one does not zoom the page either.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
