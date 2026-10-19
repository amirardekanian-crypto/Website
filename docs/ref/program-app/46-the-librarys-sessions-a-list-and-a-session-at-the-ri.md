## 📚 The Library's Sessions: a list, and a session at the right moment (LIB-01, 2026-09-27)

**Since 2026-10-13 the Library has no doors page and its look is Centre Court's: read *The Library* under *Every other screen in the
Centre Court look* above first.** The shelves, the ticks and the two moments below are unchanged.

Amir's picks A and C (*"Library Shelves"* page). Before: every card wore its shelf's one photo (the flour bowl on
all five strength sessions), two showed per shelf and the other 28 of 42 sat behind a sideways swipe, the ›
beside each shelf's name did nothing, and what a session was for was only on its own page. *Mark as done* had
been pressed once in 60 days, while 26 athletes logged 271 programme sessions.

**A · the shelves as a list** (`renderSessionsWorld()`, `shelfRowHtml()`, `toggleShelf()`):
- Each shelf's photo once, as a band holding its number and name. Under it, the first `SHELF_SHOWN` (3) sessions
  as rows: the name, what it is for (`focusTag`), `duration · equipment`, and **✓ the AA Proof habit it ticks**.
- A shelf with more than three wears **All N ›** on its band; the band is the button, and it shows the rest in
  place (**Show fewer ‹** folds it back, `aria-expanded` says which). A shelf of three has a plain band.
- The tick is `libTickLabel()`, the one rule the shelf rows, the suggestions and the session's own Done note all
  ask: Proof's words (Session, Mobility, Breathe), only when Proof will give one (an add-on only once switched on
  there, `_wsHabitOn()`), never in the demo or the coach's preview (no record to write to), never for a session
  whose `countsAs` is `none`.
- Nothing removed: *Mark as done*, the shelves and their order (the database's `sort_order`), every session page.

**C · a session at the right moment**: two moments the app actually knows, never a rest day (Home never names
one). `LIB_PICKS` holds the picks, **one line each** (the session's `id`, a kicker, the words after its name);
the minutes, "no kit" (equipment *Bodyweight*) and "ticks Mobility" are read off the session itself.
- **Sore** (`paintSoreSugg()`): the day's check-in answered soreness **1 or 2** (not a skipped check-in), so the
  finished card offers *The Morning After* under its message: *"The Morning After: keep moving, tonight or
  tomorrow. 17 min, no kit."* About one check-in in twelve (25 of 302 in the 90 days to 2026-09-27).
- **Week done** (`paintWeekSugg()`): every session of this week is done (`weekDoneOn()`, the same sources as
  `weekDoneDays()`, so it shows exactly when This Week says *All N sessions done*, or *All N done* in a week with a note), so Home offers *Green Light*
  in one row under the week's days. It goes when the week turns.
- **Each line goes once its session has been opened** after the moment began (the check-in's time; the day the
  week's last session was done). The phone keeps only when each pick was last opened, `<id>_libseen`
  (`{id: ms}`), written by `openWorkout()` through `markLibSeen()` for the picks only: never synced, never sent.
- A suggested session's **←** goes back to where it was offered, the finished card or Home (`_wsReturn`,
  `wsBack()`), not to a Library it was never opened from; the phone's Back does the same through NAV-01's
  `topLayer()` (it presses that ←). `goTo()` forgets the way back on any other route.
- Never in the coach's preview. The kicker is clay: it asks the athlete to look (DS-01, above).

`lib01-test.js` in the session's scratchpad (53 checks): the shelves, the ticks by Proof's switches, the demo,
320 px, soreness 1/2/3/5 and skipped, the week done here or in the history, last week's, a pick opened before
the week was done, ← and the phone's Back, and a reload. The harness answers `get_library` from `workouts/`
(`library()` in `scripts/headless/lib.js`).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
