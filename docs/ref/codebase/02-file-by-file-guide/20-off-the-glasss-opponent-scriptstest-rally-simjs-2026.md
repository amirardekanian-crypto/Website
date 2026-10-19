### Off the Glass's opponent (`scripts/test_rally_sim.js`, 2026-10-18)

Pre-commit guard 22, run when `assets/js/rally.js` or the test is staged. Amir's racket in the rest game used to chase the ball's current spot at a
speed that rose and fell with the score, and a bot that only followed the ball beat him 58 points to 0. **The Read** (idea #38; Amir, 2026-10-18: *"go
with your picks"*) made him play like a person, and the dozen numbers that decide how well live in the `AMIR` block at the top of `rally.js`. They
lean on each other (his speed, where he waits and where he meets a shot, how late he sees the ball, how wide his aim and his read can be, how often a
point starts with a mistimed read, how far his form moves a step), so moving one quietly makes him unbeatable or a doormat and nothing errors.
- **How it runs.** The test reads the real `rally.js` as text, runs it as a function whose free names are stubs (window, document, a canvas context that
  does nothing, localStorage, matchMedia; `Math.random` replaced by a seeded generator; a bare vm context was 3.6x slower), opens a 390 x 804 court and
  drives it with `Rally._tick(1/60)` (one `advance()`: a `step()`, the play budget and `tickFx()`, nothing drawn). Full Time has no Play again, so the next match is
  `Rally._next()`, a test hook that starts a fresh match on the same court.
- **The bots** steer `S.target` the way a thumb would: each sees the ball as it was `r` seconds ago (and makes up a fifth of that by knowing which way
  it was going) and moves its target at most `v` court widths a second. While the ball is in its half it gets just below it and pushes it up toward the
  open side of Amir's gap (with a little aim noise); otherwise it guards in front of its own gap. **Sharp** (r 0.10, v 4.0), **average** (0.20, 2.5),
  **tired** (0.30, 1.5) and **the old perfect follower** (no delay, no speed limit). Every bot, the perfect one too, reads a point late now and then
  (30% of points, 0.3 s), as Amir does: a bot that never errs cannot lose, so "the follower wins under 90%" would say nothing (`--slip 0` gives it
  100%). A fifth, **the ace** (sharp's delay and speed, never late, shoots at the edges, reads ahead), is printed with a `*` and never asserted on: his
  form is capped at 1, so it wins about 98% and shows the ceiling.
- **Full Time and Bajada (2026-10-18)** changed the match to first to 15, and Bajada made a goal off the glass in play worth 2 (`BANK_REACH`: a glass touch within three quarters of the court from the
  shooter's own end, the last fast touch deciding; anything nearer the goal is a clip, worth 1). The shares are counted in **goals** (a ball through a gap: what The Read was tuned on) and in whole
  **matches** (first to 15 on the board, a played bank worth 2); the table also prints the board share, the banks as a share of ALL goals and of each side's, the median and longest minutes of
  real play a match took, and the test asserts: the board is goals plus banks, banks are 12 to 28% of all goals for every bot (and 5 to 50% of each side's), a match ends at 15 or 16 and never level, an
  average bot reaches Full time in 1 to 4 minutes (measured 1.5), a play budget cut to 20 s ends matches on it, only live seconds count, and Bajada's rule itself on a bare court (a bank inside the reach is 2, past it 1,
  the last touch decides, a slow touch changes nothing). **Measured 2026-10-18 over 8 seeds, before (every glass touch counted, `react` 0.24, 0.12) → after (a played bank, `react` 0.16, 0.07):**

  | bot | goals | board | matches won | banks, share of all goals |
  |---|---|---|---|---|
  | sharp | 69.2 → 68.6% | 69.1 → 70.2% | 97.8 → 99.3% | 34 → 23% |
  | average | 57.1 → 54.4% | 53.5 → 54.9% | 64.5 → 70.6% | 36 → 20% |
  | tired | 52.0 → 49.6% | 47.5 → 49.8% | 37.7 → 52.3% | 36 → 19% |
  | follower | 85.8 → 85.6% | 84.5 → 85.8% | 100 → 100% | 38 → 26% |

  Long run, 96 seeds from seed 1000: average 69.7% of the matches, tired 49.4%, sharp 98.5%, follower 100%; goals 54.2, 50.1, 67.8 and 85.3%; banks 21.2, 20.2, 23.7 and 26.8% of all goals. Over twelve more 8-seed blocks the average bot's matches ran 63 to 75% and the tired one's 44 to 53%, so one fresh block in twelve would miss a band: if the guard fails after a change that should not move him, run `--seed N` before retuning. The follower wins every match at
  85% of the goals (a bot that wins 85% of the points loses a first-to-15 match about once in 400,000), so "under 100%" is asked of its goals and its board (under 90% of each). `PROGRAM-APP.md` → *Full Time and Bajada*.
- **What it holds** (each bot plays eight 3,000 s games, 24,000 s of game time, pooled; about 14 s in all: a match share has a standard error of about 3 points over 8 seeds and 5 over 3, so the default
  went from 3 seeds to 8 when the match bands came in): every bot loses some points; the follower wins under 90% of the goals and of the board (measured about 85.6%); sharp > average > tired in goals (about 68,
  54 and 50%), on the board and in matches; an average bot wins 50 to 60% of the goals (aim 54%) and 60 to 75% of the first-to-15 matches (aim 70%); a tired one 45 to 57% of the goals and 45 to 65% of the matches (aim 50%);
  a sharp one at least 85% of the matches (measured 98%); he looks calm (his misjudgement is drawn once per shot and his aim once per strike: about 4 and 1.4 new
  draws a point, the test allows 10 and 5; a mutant that redraws either every frame measures 69 and 40); no NaN; the ball never leaves the court except through a gap; it never exceeds its top speed; your racket never
  moves faster than `YOU_SPEED` (read from `rally.js`) court widths a second; his form changes only between points and stays in 0 to 1 and **matters** (held at 0 an average bot wins 6
  points more than held at 1; measured about 16); his top speed is one number, reached whether you lead or trail; the same seed plays the same game.
- **To retune** change a number in the `AMIR` block and run `node scripts/test_rally_sim.js`. `--set speed=1.2 --set react=0.2,0.1` tries a number without
  editing the file, `--seed N` starts from another seed (check three or four: a change should hold on all), `--seeds N` pools more games, `--only average
  --trace 40` prints 40 s of one bot's play every 0.1 s. Measured 2026-10-18, after the retune, over twelve more 8-seed blocks at other starting seeds: goals sharp 66 to 69%, average 53 to 55%, tired 49 to 51%,
  follower 84 to 86% (matches: average 63 to 75%, tired 44 to 53%). The gap between average and tired is only about 4 points of goals (r 0.2 against 0.3 s and 2.5 against 1.5 widths a second matter little
  on a court this small), about 20 of matches, which is why each bot plays 24,000 s.
- **The bands are wide on purpose** (the goal shares wobble 1 to 3 points with the seeds and the court size, a match share 3 to 5). `react` is the number they guard; `speed` 0.6
  or 1.6 and `aim` 0 all still pass, so judge those two by playing. `react` 0.24, 0.12 with the played-bank rule alone fails the match bands (average 80%, tired 63%).
- **Not measured:** how it feels to a person. The bots are a ruler, not a player; Amir plays it before this ships.
- **`scripts/headless/rally.js`** still plays the real game in a browser. Its *Amir alone* check parks your racket in the corner (it used to leave it dead
  centre in front of his gap, and he now aims for the middle of the biggest hole beside your racket, two 14 px slivers for a racket parked in the middle) and
  plays on in `Rally._tick` steps if he has not scored in 20 s.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
