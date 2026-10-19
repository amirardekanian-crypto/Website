## ❓ The guide in the sheet, and the jargon is the link (COACH-02, 2026-09-27)

The guide (`APP_GUIDE`, fifteen cards) sat at the bottom of the Coach tab, under the personal notes, and nothing
in a workout led to it. `openHelp(key)` now draws it in the one sheet (`#hist-overlay`), every card folded or the
one asked for open and scrolled to. Four doors:

- **Your initials → How the app works** (NAV-02), with ‹ Back to the account page (`openAccount` and `openHelp`
  are wrapped by `wrapSheetOpeners()`).
- **One row on the Coach tab**, *How the app works*: the tab is Amir's voice now (WhatsApp, his notes).
- **The jargon itself**: **How hard?** on a set's RPE strip (`.ex-set-rpe-q`, a button now) and **tempo** in an
  open card (`.nl-help`; the word shows only when the card is open, and `numLineText()` still drops it) open
  *RPE & Tempo*; each is marked by a dotted underline, nothing added to the card. Under 360 px the strip hides
  its label, as before.
- **? in Guided's top bar** (`.step-help`) opens *Guided mode*, a new card that names Guided's real buttons.

A card's `key` (`rpe`, `guided`) is what a door asks for; `tempo` shares `rpe`. The sheet sits above Guided,
and closing it leaves Guided where it was.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
