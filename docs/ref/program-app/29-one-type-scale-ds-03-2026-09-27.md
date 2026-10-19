## 🔠 One type scale (DS-03, 2026-09-27)

Before: 46 font sizes, 22 of them between 6 and 20 px, 34 pairs within a pixel, text down to 7.5 px (the
records, weight, Log a max, readiness, sign-in and Library screens, which A11Y-01 had not measured). Now every
size is a token in `:root`, picked by its job:

| Token | px | For |
|---|---|---|
| `--fs-label` | 11 | Space Mono labels, eyebrows, pills, the tab bar, meta lines, the line of numbers. **The floor.** |
| `--fs-small` | 13 | a secondary line, a helper sentence, a small button |
| `--fs-body` | 15 | notes, cues, sheet text, rows, buttons |
| `--fs-field` | 16 | what the athlete types (an iPhone zooms the page on a tap under 16) |
| `--fs-lead` | 18 | a card's or sheet's title, a closed card's name, the digits on a control (RPE buttons) |
| `--fs-title` | 22 | a section title, the open card's name, a number in a row |
| `--fs-head` | 28 | a heading inside a screen, a day's number |
| `--fs-display` | 44 | the title at the top of a screen |

- **Display pieces keep their own size**: 32 px and up (the rest timer's 96, record numbers, the clamp()
  heroes), and a smaller numeral whose line says `/* display: … */` (the session clock, Guided's steppers).
- **`scripts/check_type_scale.py`** (pre-commit guard 12) blocks any other px size, anything under 11 px, and a
  token that stops being the scale. A new rule picks the step by its job; it does not invent a size.
- **Buttons and fields take the app's font** (`button, input, select, textarea { font: inherit }`): the Sign in
  button, the ← backs, ⋯ and ▶ were in Arial at 13.3 px. Every box kept its size (measured on 11 screens).
- **Only weights that load**: the font request is Barlow 300–700, Barlow Condensed 400/600/700/900 and Space
  Mono 400/700. Barlow Condensed 800 (33 rules) was never loaded and drew as 900, so the rules say 900; Space
  Mono 500/600 said 400/700; Barlow's bold (`<strong>`, 600 labels) had been a faked bold of 500.
- **The line of numbers is never cut** (found while measuring): its parts sat in one unbreakable run, so on a
  360 px Android the closed card's `… · 2:30` ran past the card, and the open card's (with *tempo* and *rest*
  written out) at 360 and 375 too. It is a wrapping flex row now: tighter dots under 381 px, it runs under the
  ⓘ (which sits beside the name), and a part that still does not fit starts the next line. The dot ends a
  part (`span:not(:last-child)::after`), so a new line starts clean. On a 390 px iPhone the open squat card's
  four parts take two lines; before, they fitted only by running into the card's padding.
- **One primary button** (part 2, 2026-09-27, after DS-01 settled that buttons are green): every filled action
  (Sign in, the welcome's Open Day 1, the error screen's buttons, Begin session, Start/Pause, Rest, the rest timer's Pause, Guided's Done,
  the filed day's OK, Done · send to coach, + Log a max, Log a max's Save to Personal Records, Weigh in) wears one look, set once at the end of the stylesheet:
  green (`--btn`, the same gradient as Centre Court's buttons since 2026-10-13; in dark mode it is lighter, so it stands off the
  dark paper at 3:1), white Barlow Condensed 700 in capitals, 1 px tracking, an 8 px corner, 44 px at the least. There were
  eleven (corners from 4 to 13 px, two fonts, tracking from 0.02 em to 1.5 px, weights 700 and 900, and Sign in
  and Open Day 1 in clay). Each rule keeps only its place and size: full-width actions at `--fs-body` (the
  welcome and Done at `--fs-lead`), compact ones in a card or the session bar smaller, where WK-02 and WK-03
  measured their widths (the slim bar's Pause keeps its 0.5 px tracking under 480 px). **A new primary action
  joins that list; a secondary one is outlined** (Guided, Reset).
- AA Proof's type (Outfit, its own sizes) goes with SEAM-01; its labels are 11 px at the least since #286.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
