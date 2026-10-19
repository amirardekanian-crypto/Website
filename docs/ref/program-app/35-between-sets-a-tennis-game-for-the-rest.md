## 🎾 Between Sets: a tennis game for the rest (2026-10-18)

Amir asked for a better version of a tennis game he saw on a player's website: *"the aim is to add this game to my app, to use on their
phone while resting and sitting in the gym"*. He chose all the games behind the shelf, the name **Between Sets**, and the coach lines as
drafted. `assets/js/between-sets.js` (`window.BetweenSets`, the same API shape as Rally and SplitStep) draws and runs it; program.html owns
the layer (`#setsOverlay`, beside `#splitOverlay`), the shelf row (`data-game="sets"`, `openRestGame('sets')`; `openBetweenSets()` /
`closeBetweenSets()`) and passes the athlete's first name (`name`) for the scoreboard. It is the third game behind the same door.

- **What it is:** a court in real ITF dimensions drawn in perspective, clay, grass or hard, YOU vs AMIR. A Fast4 set, first to 4 games,
  a no-ad deciding point, and a tiebreak to 5 at 3-3. **Saved after every point**, so one set lasts a whole workout and Continue picks it
  up on the next rest. Also a rally drill. At the end a match report with coach-style movement numbers.
- **One thumb:** drag anywhere to run; the swing is automatic and getting there early makes a better shot; tap as the ring closes for a
  power shot; tap to toss, then tap again at the top to serve. Clay keeps ball marks, and a close call shows a mark check.
- **The rest is the boss.** `left()` is shown in the game's rest pill, `timeUp()` freezes play and shows *Time to lift*, and
  `closeTimer()` closes the game with the timer. ✕ and Back return to the running timer (`#setsOverlay` is in `topLayer()` and
  `initBackNav()`'s observer).
- **Serve Clock hands back gracefully:** when the app hands the rest back to the set (`handBack(done)`), a point in play may finish (up to 6 s;
  the score saves at the end of every point), a rally drill keeps its best, then the game freezes on *Time to lift* and calls `done()` once.
- **Sound** follows `rest_sound` on the timer's AudioContext (`audio()`), with no sound button of its own.
- **Its numbers stay on the phone:** stats and the saved match are `courtduel.*` keys in localStorage, never synced, never scored, never
  seen by the coach.
- **The coach lines** are `CD.LINES` in the file; a change ships with a CACHE bump (sw.js keeps it in SHELL).
- Test: `node scripts/headless/between-sets.js`.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
