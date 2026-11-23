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
- **No Last time box** (2026-10-12, *The working card*): the open card has none (it was under the Coach's Note from
  2026-09-27; the closed card's clay *Last* pill went before that). Each empty kg box shows last time's weight as LAST,
  and a circuit keeps its Last time strip. The ⓘ is there for any lift with history, entry or not (`paintAbout()`), and
  its **Your history** row opens the History sheet too, which is how the Library reaches it.
- **The Your history door, on the card** (Amir, 2026-11-23: *"Build B"*, direction B *History Door* of the board
  *History on the Card*, after *"people cannot see it"*). On an open card that logs sets and has history, a white row
  under How to do it, its twin (`.lt-door`, in `.lt-slot`, drawn by `paintLastTime()`): **YOUR HISTORY** over one line,
  *6 sessions · up from 65 to 75 kg* (*· best set up from 5 to 8 reps* for a lift never weighed, *· holding 70 kg*; with
  fewer than two sessions to compare, the About row's own *1 session. Last time 70 kg × 6.*), a small line of the
  sessions (hidden under 360 px) and a ›. It opens the History sheet and leaves the card open. The closed card still
  shows no history.
- **The History sheet: one sentence, two lanes** (same day). `histSeries()` is the ONE series the door and the sheet
  read: the last 12 sessions, oldest first, each session's **heaviest set** in the lift's newest measure (never the
  estimate, which stays in Personal Records; a lift never weighed counts the most reps in a set). The sheet opens with one
  plain sentence (`histSummary()`: *10 kg more than on 12 Oct, at about the same effort.*; the reps first when they moved
  by 3 or more a set), then `histChart()`: a dot per session with its number above and its date under (always *D Mon*,
  so each becomes its own Shamsi date in Farsi; past 7 sessions every other one, the newest always), the newest filled, a
  grey *no kg* mark where a session has no weight in this measure, a dashed dot and *low day* on a low day, the floor
  under the lowest dot; then **Effort, each set**: one bar per set, clay over the target, steel under it, the target a
  dashed line. `scripts/headless/history-door.js` is the guard.
- **Their own maxes on the sheet** (Amir, same day, asked whether a record they add themselves shows: *"Yes, add them"*).
  `histOwnMaxes()` reads `ceilingSeries()` (the Records' own read: a renamed lift joined, one entry a day, tombstones out) for
  this lift in the graph's measure, keeps the entries logged by hand or as a test (never `auto`, which came from sessions and are
  already dots), from the oldest session shown on. Each is a hollow diamond in its date's place, off the line (the line is the
  sessions, solid past it), *your max* under its date, no effort bars, and a row in the list (*Sat 8 Nov · Your max · Effort 9*
  over *85 kg × 3*, its effort never set against the card's target). The door and the sentence stay the sessions'. A date, a
  number and a small word show only where they fit, the newest and the maxes first (`fits()` in `histChart()`).
- **`<id>_histcache` is a cache and never syncs** (`_snapshot()` skips it; written with
  `_lsRawSet` so it never stamps `lastEditAt`). The source is `get_my_history()`, stage30; since stage60 it leaves out a session the coach hid, so the next
  online open drops it from Last time and the Records.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
