## 🎾 Split Step: a reaction game for the rest (2026-10-18)

Amir, 2026-10-17: *"can you create a game like this for my app? https://play.harmansharma.in/reaction ... i want my tennis and padel
players to use this during their rest time"*. 2026-10-18: *"Go with your picks: Split Step, one door with a shelf for both games,
scores stay on the phone."* The prototype: https://claude.ai/artifact/DFZd4XE2MgVtQhPpkSeCGL. `assets/js/splitstep.js`
(`window.SplitStep`, the same API shape as Rally) draws and runs it; program.html owns the layer (`#splitOverlay`, beside
`#rallyOverlay`), `REST_GAMES`, `openRestGame()` and the two hooks. It sits behind the same door as Off the Glass (see above).

- **Four drills, each a tennis question:** *First Step* (tap the moment Amir hits), *Fore or Back* (tap the side the ball goes to),
  *In or Out* (tap only what lands in; **on the line is in**, so a leave counts as much as a tap) and *Sweet Spot* (tap as the ball
  reaches your racket; after the bounce it slows by a different amount each time, so the timing cannot be learned).
- **The rest is the boss.** The rest clock is on the court the whole time. A round starts only when `left()` is at least its drill's
  need (First Step 19 s, Fore or Back 23, In or Out 24, Sweet Spot 17: the 99th percentile of a clean round plus 1 s). `timerDone()`
  calls `SplitStep.timeUp()`, `closeTimer()` closes it, and ✕ and Back return to the running timer (`#splitOverlay` is in
  `topLayer()` and `initBackNav()`'s observer). It never runs past a rest.
- **It hands the screen back before the Serve Clock takes it** (2026-10-18). With 25 s of rest left (30 s on rests of 100 s or more) the rest
  timer takes the screen from any rest game: a game with `handBack(done)` is told and closes in `done()`, one without is closed at once.
  The host opens Split Step with `handBackAt` (that 25 or 30, a number or a function). `canGo()` then starts a round only when
  `left() - handBackAt` is at least the drill's need, so no round is cut. The clock pill still shows the real rest; its warning and the
  3-2-1 count down to the hand-back. `SplitStep.handBack(done)` stops at once like `timeUp()` (the round dropped and never saved, *Time.
  Next set.*), then calls `done()` on the next tick; a second call, or one while the game is closed, only calls `done`.
- **Fair starts:** the wait before each hit is a floor plus an exponential tail, so "now" can never be guessed. A tap before the hit,
  or too soon after it to be a real reaction (`GUESS` per drill), is a foot fault and the ball is replayed.
- **Seen, not heard:** the cue is movement, never a colour change alone, and sound comes only after a tap, so a phone on silent scores
  the same. The 3-2-1 stays quiet during a wait or a live ball.
- **Scoring:** a round's number is the median, so one missed tap does not ruin it. A best needs every ball right and no foot faults.
- **Its numbers stay on the phone:** `splitstep_stats` (bests and the last rounds per drill), no athlete prefix, never synced, no XP,
  no leaderboard, never seen by the coach. Phones differ in touch delay, so nobody is ranked against anyone.
- No yellow: the ball is white, the court the brand green, Amir's racket clay. **Never call it reaction training** in copy; it is a
  game for the rest. The guide's *Built-in tools* card names the door and the games on the shelf (CNT-01).
- Test: `node scripts/headless/splitstep.js`.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
