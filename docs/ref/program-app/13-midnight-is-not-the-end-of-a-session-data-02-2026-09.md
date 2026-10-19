## 🌙 Midnight is not the end of a session (DATA-02, 2026-09-26)

- **A session's date is the local day it was finished** (`sessionDateFor()`: the finish stamp, else today),
  and every save of it (finish, a later RPE or note, Send) names that same day. It was `toISOString()`, a UTC
  date worked out again on each save: in Iran a session after midnight was filed under the day before (and
  ticked AA Proof's WORKOUT on the wrong day), and one finished before 00:00 UTC but saved again after it got
  a second `session_history` row. Rows saved before this carry a UTC date.
- **A session stays live for 6 hours** after it started, or after it finished (`SESSION_GRACE_MS`,
  `sessionIsStale()`, the one test, used by the boot sweep, Start/Pause, `openGuided()` and
  `liveExerciseKeys()`). A session started at 23:30 used to lose its clock and check-in on a reopen after
  midnight, and a Start/Pause tap reset it; one finished at 23:50 lost its unsent note and rating.
- **An unfinished day is filed by itself** (Amir, 2026-10-12: *"i dont want any info or log to be lost"*; from
  2026-09-26 it was asked about instead). A real tick (`toggleCheckOnly()`, `syncExerciseCheck()`, via
  `markTouched()`) records the day it happened in `<id>_touched_d<N>`; the redraws that also run `updateProgress()`
  never write it. On a later open, a day with logged work, no finish stamp and no session running (6 h grace) whose
  ticks are from an earlier date is filed at once, before anything can be tapped (`fileUnfinished()`, from boot once
  the days are drawn): a session as it was left, under the day it was trained (the finish stamp carries that date),
  with that day's check-in and clock and no rating, into the session queue (*No signal* below). The page then opens once
  more so the sweep closes the day, and one card above This Week says what was filed: "Saturday's Day 3 wasn't finished
  · I still got it, as you left it: 1 of 25 sets", with OK (`paintUnfinished()`, the note `<id>_autofiled`, this phone
  only). There is no Clear: Send it / Clear it threw the work away on Clear, and an athlete who did neither and trained
  that day again mixed two sessions. Until a day is filed the sweep keeps its check-in, clock and the exercises it shares
  with a finished day (`_awaitingFile()`). Ticks from before 2026-09-26 carry no date and are not filed. The sweep still
  runs at launch only, not when the app returns to the foreground.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
