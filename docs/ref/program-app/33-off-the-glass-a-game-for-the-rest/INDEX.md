## 🏓 Off the Glass: a game for the rest (2026-10-17)

<!-- Split by sub-heading: one file each. Open the part you need. -->


Amir: *"can you create a game like this for my app? the aim is to use it during rest time for my athletes"* (after Matt Cannon's air
hockey pen, *"improve it in any way you think is good"*). Air hockey on a padel court seen from above: your racket at the bottom,
Amir's (clay) at the top, a point is the ball through the gap in the other end's glass. `assets/js/rally.js` (`window.Rally`) draws
and runs it; program.html owns the door and the layer.

- **The door is shared with Split Step, Between Sets and The Lob** (2026-10-18; The Lob is a calm mode of this file, below). The rest band's last line reads **Play while you rest** (`#timerPlayBtn`,
  `toggleRestGames()`, in the list's rest and Guided's) and opens a small shelf inline in the green band (`#timerGames`), one row
  per game, the game played last on this phone first (`rest_game_last`, this phone only, never synced; Split Step first when there is
  no history). **Off the Glass's row** (`openRestGame('rally')`, `openRally()` kept) loads `rally.js` on the first tap (`restGameLib()`;
  sw.js keeps it in SHELL, so it plays with no signal and a change to it ships with a CACHE bump), opens the audio context in that tap
  (`restAudioPrime()`; iPhone needs it) and starts a paused rest. The shelf folds when a new rest starts (`foldRestGames()`).
  **Loading is first-come by tap, not by arrival** (`_restGameWant`): the last row tapped wins, so a slow load of the game tapped first never
  takes the screen, and a load that finishes after its rest ended (`closeTimer()` / `showTimer()` clear the token) or during the 1.2 s GO!
  opens nothing. A script that loads but defines no global (a gym wifi's login page) is a failure and the next tap tries the network again.
  `closeTimer()` hides the timer before it closes a game, so the game's `onClose` does not pull focus to the door as the rest ends.
- **The rest is the boss.** The court shows the rest clock the whole time (`left()` = `timerLeft()`), clay and pulsing in the last
  10 s, a tick and a buzz at 3, 2, 1. `timerDone()` calls `Rally.timeUp()` (the court freezes, *Time. Next set.*) and `closeTimer()`
  closes the game with the timer. ✕ and Back (`#rallyOverlay` is in `topLayer()` above the timer and in `initBackNav()`'s observer)
  return to the timer, still running. It never runs past a rest, and Serve Clock hands the screen back 25 s early (below).
- **Short and fair, and Amir plays like a person (The Read, 2026-10-18; idea #38 of the Rest in Play round, *"go with your picks"*).**
  First to 5 (first to 15 since Full Time, below). The first Amir chased the ball's current spot at a speed that rose to 1.45x while the athlete led and fell to 0.65x while
  they trailed, which players saw and resented, and a bot that only followed the ball beat him 58 points to 0. Now (`amirMove()`):
  his top speed is **one fixed number** (`AMIR.speed`, nothing reads the score); he **sees the ball `react` seconds late** (a short
  ring buffer of the ball's last 0.6 s, `S.hist`, with a part of that delay made up by knowing which way it was going, `AMIR.lead`), so a
  hit or a bounce off the glass is news to him a moment late; a ball **coming at his end**: he works out where it will cross his line
  (off the side glass too), **misjudges it a little** (`AMIR.read`, drawn once per shot) and walks there; a ball in his half that is
  slow or leaving: he **strikes it toward the biggest hole beside your racket** in your gap, as he last saw it (`holeX()`), from an
  aim point that **lands a little off** (`AMIR.aim`, drawn once per strike, never every frame); and **now and then a point starts with a
  mistimed read** (`AMIR.late`, `lateBy` s more). While your half has the ball he waits at `AMIR.home`, and steps up to `AMIR.guard` to meet a shot.
  **His form** (`S.form`, 0 to 1, `AMIR.start` 0.5 at the start of a match) sets the reaction (0.16 s at 0 to 0.07 s at 1), the aim and
  read errors and the chance of a mistimed read, and **moves one step (`AMIR.step`) only in `point()`**: sharper after you score, softer
  after he does. Nothing changes mid-rally and **nothing about form is shown**. Held at 0 an average player wins about 62% of the
  goals, held at 1 about 46%.
- **Your racket has a top speed too** (`YOU_SPEED`, 6 court widths a second): a normal drag still feels instant, but a tap on the far
  side is a sprint, not a jump across the court in one frame.
- **The numbers are set against bots with a person's limits** (`scripts/test_rally_sim.js`, pre-commit guard 22; `CODEBASE.md` → *Off the
  Glass's opponent*): a sharp bot (sees the ball 0.10 s late, thumb 4 court widths a second) wins about 68% of the goals and 98% of the
  first-to-15 matches, an average one (0.20 s, 2.5) about 54% of the goals and 70% of the matches, a tired one (0.30 s, 1.5) about 50% and 50%, and a bot with no delay and
  no speed limit (that still misreads three points in ten, as he does) about 85% of the goals and every match. A change to the `AMIR` block runs it; it prints the table, with
  the *ace* (a sharp bot that never misreads and shoots at the edges) as an extra row it does not assert on: it wins about 98%, the ceiling of his
  rubber band. Known, and left: his look-ahead keeps the old `vx` when it folds off the side glass (comment in `rally.js`; since the 2026-10-18 retune, fixing it moves the shares by less than the noise).
- **A ball that goes nowhere for 3 s is served to the other half**, whether it died or is trapped and shaking between the rackets at
  the net or against the glass (2026-10-18: a bot found a trapped ball that buzzed every frame and ran the rally into the thousands).
  A jammed ball counts no hit and makes no sound; otherwise a hit counts 0.12 s after the last and rings 0.09 s apart per racket.
- **One thumb:** drag anywhere in your half; a touch puts the racket 1.4 rackets above the finger so the thumb never hides it. A hit
  buzzes; the sounds follow the timer's speaker (`rest_sound`); reduced motion drops the shake.
- **Its numbers stay on the phone:** `rally_stats` (`best` rally, `wins`, `played`), no athlete prefix, never synced, never scored,
  never seen by the coach. No yellow: the ball is white, the court the brand green, Amir's racket clay.
- The guide's *Built-in tools* card names the door (CNT-01). Tests: `node scripts/headless/rally.js` (29 checks; in *Amir alone* your racket is
  parked in the corner, since 2026-10-18: nobody defends, and he finishes the point) and `node scripts/test_rally_sim.js` (no browser, about 14 s: eight seeds, because a match share needs about 300 matches to hold still).


## The parts

- [Full Time and Bajada: one match a session, and a bank shot off the glass counts 2 (2026-10-18)](01-full-time-and-bajada-one-match-a-session-and-a-bank-.md)
- [Serve Clock: the rest hands back to the set (2026-10-18)](02-serve-clock-the-rest-hands-back-to-the-set.md)
- [The Lob: a calm option on the shelf (2026-10-18)](03-the-lob-a-calm-option-on-the-shelf.md)

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
