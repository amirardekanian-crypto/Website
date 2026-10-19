### Serve Clock: the rest hands back to the set (2026-10-18)

Idea #39 of the round-4 page (https://claude.ai/artifact/1qn7D8shTUmKrYDHo9UT9W), built on Amir's *"Go with your picks on all nine decisions, and
build The Read and Serve Clock first"*. The last 20 to 30 s of a rest are when getting ready for the next set helps (Hammoudi-Nassib 2014; Tod 2005;
Cusimano 2026), and every rest game used to play to 0:00. Live data: median written rest 60 s, 83% of rests 90 s or less. So with 25 s left the rest
takes the screen back from the games and says what is next.

- **The numbers are one block** beside the timer in program.html: `SERVE_CLOCK = { at: 25, atLong: 30, longFrom: 100, noDoorUnder: 45, doorGone: 10 }`.
  Coaching judgment, not measurements. The hand-back point is `at`, or `atLong` when the WRITTEN rest is `longFrom` s or more. The written rest is
  `timerWritten`, set in `showTimer()`; +15s raises `timerDuration`, never it.
- **The hand-back, once per rest** (`serveHandBack()`, a latch `serveHandedBack`). `timerTick()` calls it when the running rest reaches the point
  (so does the catch-up tick when the page comes back to the front). It folds the shelf, takes the door away, drops a game still loading for a tap
  (`_restGameWant`), asks every open game (a game with `handBack(done)` is closed when it calls `done()`, any other is closed at once) and paints the
  get-set line. A rest written at or under the point is handed back from the start: the line shows at once and the door is never offered. The
  latch clears in `showTimer()` and in `resetTimer()` (Reset restarts the rest, so the door comes back and the point comes round again);
  **+15s never un-latches it**, and `openRestGame()` refuses once it is set. `timerDone()` and the GO! close are untouched: the `timeUp()` loop
  over the open games is still the safety net (a rest that ends in the middle of a hand-back closes everything).
- **The door** (`restDoorOn()` / `syncRestDoor()`, every tick) is hidden when the written rest is under 45 s, when the rest belongs to a circuit
  round (`data-circuit="1"` on a circuit's Rest button; Guided's `item.circuit`), when it belongs to a flagged retest lift in its window
  (`data-test="1"`, stamped by `restTestAttr(ex)` in `renderExercise()` from `exTestSpec()` and read with `inRetestWindow()` at the tap; a test set is
  the one hard set of the week), once the rest is handed back, and once `timerLeft() <= hb + doorGone` (nobody opens a game with 35 s left).
  Until the hand-back it follows the clock, so +15s can bring it back. **Unknown fails open**: the rest's context is `timerCtx = { card, circuit,
  test }`, passed from `openTimer(e)` through `openRest(secs, name, ctx)` and `showTimer()`, and from `stepAfterDone()` for Guided; a rest opened with no
  card (a script calling `openRest(120, name)`) shows the door as it always did.
- **The get-set line** (`paintGetSet()`). The list has no paper, so the band shows a small block where the door was (`#timerGetSet`): the eyebrow
  *Get set*, *Next: <exercise> · set N of M* (`restNextOfCard()`: the Rest button's own card and its first unticked set from `loadSetLog()`, else the
  next unticked exercise in the day and its first unticked set; a circuit is named with no count because the list does not track its rounds; when
  nothing follows there is no block) and the cue. **It keeps the day's own rules** (review fixes, 2026-10-18): a card the check-in struck out
  (`rd-skip`) is passed over, a halved exercise (`data-rd-sets`) counts only the sets asked today (*set 2 of 2*), a Library session (a card outside
  `#day-view`) names nothing because it keeps no set log, and since Rest means a set is over, a card with none ticked yet is named alone, with no
  count (an athlete who ticks late or all at the end would otherwise read "set 1"), and a one-set card in that state is taken as done. Guided keeps its Next line (`paintTimerNext()`, `STEP.seq[STEP.pos + 1]`) and gets the cue under it
  (`#timerCue`, on the paper). The cue sits behind the 3 px clay bar that means look here (the Coach's words), 15 px (`--fs-body`), white on the band,
  ink on the paper. On a 568 px phone the list's ring shrinks to 140 px so the block fits (`.has-getset`); Guided's cue can sit below the first
  screen there and the overlay scrolls (it never squashes, and nothing scrolls by itself: the clock must stay in view).
- **`cueForRest(name, exId, setNo)`** is the one function that picks the line (The Corner, idea #20, will share it): the Spine entry through
  `spineFor()` (approved entries only: the phone is served nothing else, and a card that names an entry that is not there gets none), rotated by the
  next set's number through `[cues.good[0], cues.good[1], cues.bad[0]]`, missing ones skipped, so eighteen rests do not repeat one line. `''` when
  the entry has none (the Next line shows alone). A circuit gets no cue.
- **`Rally.handBack(done)`** (assets/js/rally.js): no game, `done()` at once; otherwise the held mint banner *Last point.*, the end box's button hidden, and
  a point in play is let finish (`lastPointIn()`: nothing is served after it, the point's own banner shows 0.8 s, then `done()`); with no point in
  play (the serve pause, a ball that died, a finished match) `done()` after 0.6 s; never later than 6 s. After it the court is `over` (no serve, no
  auto-serve, no button) and the best rally is kept as `timeUp()` keeps it. **The match is parked, not ended** (Full Time, above). It does not touch `amirMove()`, `youMove()` or `step()`.
- **Every game gets `handBackAt: serveHb`** in `open()`, and every game has its own `handBack(done)`. Split Step uses `handBackAt` to start no round it
  would cut and stops at once; Off the Glass finishes its point (above); Between Sets finishes a point in play for up to 6 s, parks on *Time to lift* and
  calls `done()` about a second later (a76016d). Off the Glass and Between Sets ignore the option.
- The guide's *Built-in tools* card says it in one sentence (CNT-01). No new data is stored.
- Test: `node scripts/headless/serve-clock.js` (92 checks: the hand-back by the clock at 60, 100 and 150 s, the door rules, the line and the cue in
  the list and in Guided, a struck-out card, a halved exercise, a one-set card and a Library session, focus after a game closes itself, the latch, +15s, Reset, the catch-up, `Rally.handBack` on a live, dead, endless and winning ball, 320 x 568 and 375 x 667
  light and dark). The other games' suites switch the hand-back off (`SERVE_CLOCK.at = 0; SERVE_CLOCK.atLong = 0`) in the one check that is the rest
  running out on an open game (`rally.js`, `splitstep.js`, `between-sets.js`).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
