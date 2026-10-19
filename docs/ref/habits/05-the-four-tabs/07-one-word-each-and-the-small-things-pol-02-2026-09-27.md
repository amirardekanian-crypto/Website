### One word each, and the small things (POL-02, 2026-09-27)

Swept with PRF-02 (the *built with it* list on its page):
- **One word for one thing.** *Milestones* (never badge, medal or challenge; a habit's five squares
  are its *consistency tiers*) and *Locker* (never the long game, the pass or loadout; inside it, *What
  you have* and *The road*). The Progress tile counts milestones (`milestonesEarned()`, one-offs plus
  the *A few weeks* events), the same number as the section, and so does the rank share card.
- **The tab bar lights where you are.** Settings and the manual light no tab (the slab sat
  under TODAY), and a habit's page lights the tab it was opened from (`UI.from`; it lit PROGRESS from
  Today too).
- **"Day N" is your day with AA Proof** (Today, Settings). Progress names the season only (it said
  *Pre-Season · day 22*, which read as the season's day), and Crew says *SEASON DAY 64*.
- **An add-on never switched on says Off** on Progress, not *Paused · 0 XP banked*.
- **The onboarding lock notice is grey**, not error red: a padlock is not a mistake.
- **A toast fired while a sheet is open shows above it** (`.toast.over`, at the top); it rendered under
  the sheet's scrim.
- **Dark mode's filled buttons read** (A11Y-01, Proof's half): white text on the dark accent was 3.35:1,
  so every fill that carries white text (the primary button, the nudge's button, the chips, the tab slab,
  the initials, the verdict tile, the wins card) takes `--accent-fill`, #6857E3, 5.17:1. Bars, pips and
  cells keep the bright accent.
- **No label under 11 px** (A11Y-01, Proof's half; the training app's floor since #275). Measured on
  every screen and state (Today with a card and on an earlier day, a log sheet, a habit, Progress folded
  and open, Crew, the Locker folded and open, Settings, the manual, the tour, five takeovers, the share
  picker, a quest run, onboarding, the embedded strip, a free athlete): **904 labels in 60 styles, from
  7 to 10.5 px, now 0**. One CSS block at the end of the panels raises each to 11 px (letter-spacing
  down where a word would crowd its box), and seven inline sizes in the markup moved with it. Two
  layouts made room: the 35-day grid's key puts its legend on a line of its own under 380 px, and the
  Locker's thumbnail of the share card is the skin and the crest only (its 7.5 px rank name could not
  fit 66 px at 11; the hero above names the rank). Checked at 320, 360 and 390: no text spills its box.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
