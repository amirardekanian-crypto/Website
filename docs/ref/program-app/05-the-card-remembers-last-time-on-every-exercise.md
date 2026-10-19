## 🕘 The Card Remembers — last time on every exercise (2026-09-24)

Idea #5 of `/ideas` round 1, built from the brief Amir approved ("go with your suggestions"). Every
standard exercise card shows what the athlete did **the last time they did that exercise** (any
day, across cycles via `matchRenamed()`), and **History ›** opens the History sheet. Four rules:
- **History, never a prescription.** It never suggests a load — Amir's rule is RPE, never load.
- **Reps are an override.** The reps box shows the prescribed number as a placeholder; `n` is
  stored only when the athlete did something else. Amir prescribes **one number, never a range**.
- **The log-line grammar exists three times** — `buildSessionData()` writes `Set 1: 80 ×5 @8 ✓`,
  `parseSetLine()` (coach.html) and `parseSetText()` (program.html) read it. Change all three;
  `scripts/check_setlog.js` (pre-commit) runs the real writer through both readers.
  **The reps are the last word and stand alone** (`×8` after a space, at the end once the RPE and the
  tick are off), so a weight typed with a times sign survives: `Set 2: 2×20 ×8 @7 ✓` reads back as
  weight `2×20`, 8 reps. Until 2026-09-26 both readers took the first `×` and read it as 20 reps.
  The weight text is always kept exactly as typed.
- **A pair of implements as a number** (2026-09-26): where a load has to be a number,
  `parseLoggedKg()` (records, estimates, History) reads `2×20`, `2x20`, `2 x 20kg` as **20**, one
  implement, so a dumbbell lift logged as `20` one day and `2×20` the next is the same lift. Only a
  count of 1 to 4 before the sign counts as a pair (`20x2` stays 20). coach.html's `loadSummary()`
  does no maths on any weight that is not a plain number (`24` or `24kg`): it prints `2×20` as typed.
- **The sport badge** (Amir, 2026-10-12: *"design nice sport badges for tennis and padel"*): on Game Plan's header a
  tennis or padel goal (`sport.badge`) is a green badge with a drawn ball, racket or both, the sport bold and the rest of
  the goal under it (`sportBadgeHtml()`, `SPORT_ICON`); any other goal keeps its mono line. `isRacketSport()` reads the
  same badge, so a tennis or padel player's badge must name the sport, or On court never shows.
- **Not on the card any more** (2026-10-12, *The working card*): the open card has no **Last time** box (it was under
  the Coach's Note from 2026-09-27; the closed card's clay *Last* pill went before that). The history is the ⓘ's
  **Your history** row, each empty kg box shows last time's weight as LAST, and a circuit keeps its Last time strip.
  The ⓘ is there for any lift with history, entry or not (`paintAbout()`), so History is always one tap behind it.
- **`<id>_histcache` is a cache and never syncs** (`_snapshot()` skips it; written with
  `_lsRawSet` so it never stamps `lastEditAt`). The source is `get_my_history()`, stage30; since stage60 it leaves out a session the coach hid, so the next
  online open drops it from Last time and the Records.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
