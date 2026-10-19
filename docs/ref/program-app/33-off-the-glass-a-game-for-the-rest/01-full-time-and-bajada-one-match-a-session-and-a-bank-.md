### Full Time and Bajada: one match a session, and a bank shot off the glass counts 2 (2026-10-18)

Ideas #40 (Full Time) and #43 (Bajada) of the round-4 page (https://claude.ai/artifact/1qn7D8shTUmKrYDHo9UT9W), picked on Amir's *"Go with your
picks on all nine decisions"*. Tests: `node scripts/headless/full-time.js` (83 checks, the last eleven are The Lob beside a parked match), `rally.js` (29), `serve-clock.js` (92) and `node scripts/test_rally_sim.js`.

- **Full Time: the match belongs to the session, not the rest.** It is first to 15 (`WIN_AT`, was 5), one match for the whole workout, and it waits between
  rests. It lives in a variable of `rally.js` (`M`: `key`, `score`, `best`, `banked`, `played`, `over`, `form`; memory only, **a reload starts fresh**, nothing
  is stored or synced). `open()` takes `session`, a string; program.html passes `restGameSession()`: the day plus the local date from `ymdLocal(new Date())`
  (Guided's `STEP.day`, the list's rest card through `timerCtx.card.dataset.day`, else `x`), so the same workout's rests share one match and tomorrow's starts
  fresh. The same key with the match not over and a point played **resumes** it (a match closed at 0-0 opens like a new one, hint and all: review fix, 2026-10-18): the banner *Play resumes · You 6, Amir 4* (real numbers, mint, 1.5 s, `banner.dur`), the
  serve to the player after the 1.5 s, the first-open hint stays away, and his form, the best rally and the played seconds come back with it. A different key
  (or none) starts a fresh match and drops the old one. The same key with the match OVER shows the Full time box again: one match a session, no Play again.
  **Hand-back, time up and ✕ PARK the match, they never end it and never count it as played** (`rally_stats.played` and `wins` move at Full time only; the best
  rally is still saved at every stop, as before, and now also on close). `Rally.handBack` still calls `done()` within 6 s. **Done ends it:** `finishDayNow()`
  calls `Rally.endSession(day)` (guarded; nothing happens when `rally.js` never loaded). `endSession(day)` drops that day's parked match and one opened with no card (`x`), never another day's; with no day it drops any.
- **Play budget.** `PLAY_CAP_S` = 480: eight minutes of real play a session. It counts wall-clock seconds (`advance(dt, wall)`: `wall` is clamped to 0.25 s a
  frame, so a page that slept adds a quarter of a second, not the minutes) **only while a point is live**: not in the serve pause (a resume's pause is 1.5 s),
  not in the end box, not while the rest is paused (`left()` is null), not after the hand-back or time up. Once the budget is used up the match ends at the next
  point that leaves someone ahead (level at the cap, it plays on). A bot reaches Full time in about 1.5 minutes of play (median, longest 2.8 of 221 matches),
  so the budget is for a person who dawdles.
  **Over a whole 18-rest session** (the review's session sim, 35 s of play a rest, 1.5 s resume pauses, 150 sessions per bot) the average player's match ends in rest 3 (65% of them; by rest 4 about 95%) after a median 81 s of live play (97 s with the pauses; a tired lifter 90 s and rest 4, a sharp one 58 s and rest 3), so for the other 14 or 15 rests the row reads *Full time*
  and there is no Off the Glass. The 8-minute cap never bites (the longest live play in 750 simulated sessions was 150 s). Not changed: Amir's call whether a match should last longer.
  (That session sim ran before Bajada counted played banks only; with fewer 2-point goals a match is about 15% longer, 1.5 minutes of bot play against 1.3, so it ends about a rest later.)
- **The end box:** the title *Full time*, then one sentence a line: *You win 15–11.* or *Amir wins 15–12.*, *Longest rally: N hits.* and, when there were any,
  *Off the glass: N.* (your banks only). The one button reads **Back to the timer** and closes the game. The old *Wins on this phone* and *Your best is* lines are gone.
- **The shelf row's small line** is read from the game when the shelf opens (`toggleRestGames()` → `paintRestGameLines()`, again when the game closes, so a shelf left
  open is not stale): default *Air hockey against me · one match* (it was *… one match a session*, which wrapped to a second line at 320 px; the guide says the rest); parked *You 6, me 4 · play resumes* (never *You 0, me 0*: a 0-0 match shows the default); over *Full time · you won 15–11* or *Full time · I won
  15–12*. `Rally.matchState(session)` → `{you, amir, over}` or null; given a session it answers only for that one, so a match left from another day never says
  "play resumes". Before `rally.js` has loaded (nothing was played this page) the line is the default.
- **The first-open hint is two lines:** *Drag in your half. Hit it through Amir's gap.* and *First to 15. The match waits for your next rest.*, shrunk to a narrow court (never under 12 px).
  The guide's Off the Glass sentence gains *You get one match a session: first to 15. A bank shot off the glass counts 2.* (CNT-01; the first draft said *lasts your whole session*, which a match that ends in rest 3 or 4 does not do).
  **Two small things from the review (2026-10-18):** the last point's banner is not drawn behind the Full time box (`draw()` skips it once `S.m.over`; `Rally._draw()` is the test hook), and opening the shelf scrolls its last row into view
  (`toggleRestGames()`, `scrollIntoView({block: 'nearest'})`), so on a 320 x 568 or 375 x 667 phone The Lob is not left under the fold.
- **Bajada: a goal off the glass in play counts 2.** After a racket's last touch (`S.touch`, set by `hitRacket()` on a real contact) the ball hits the glass (a side wall or an
  end wall beside the gap, never a post) at more than `BANK_MIN` = 25% of its top speed **while it is still in the shooter's own half or the first half of the far half**
  (`BANK_REACH` = 0.75 of the court, measured up from the shooter's own end wall, `playedBank()`), and goes through the far gap with no other racket in between (the next racket's
  touch clears `S.glass`). **The last fast glass touch decides** (`S.glass`, set in `walls()`): a touch inside the reach lights its pane and is a *played bank*; a touch nearer the goal is a
  *clip* and takes any earlier bank back; a slower touch changes nothing and takes nothing back. The scorer is the player whose racket touched it last AND whose opponent's gap it went
  through: +2, **and Amir banks too**. A clip, an own goal off the glass (1 for the other side) and a ball nobody has touched since the serve are worth 1. The pane lights mint for 0.33 s
  (`LIT_S`; a side wall is three panes, each end wall one either side of the gap); the banner says *Off the glass +2* (mint) or *Amir off the glass +2* (clay), shrunk to fit a 320 px
  court. A bank from 14 makes 16 and wins, and the end box shows the real score. Banked goals are counted per match (`M.banked`).
- **Why only a played bank (changed 2026-10-18, after the review; not yet played by Amir).** The first Bajada counted ANY glass touch after the last racket touch. Measured over whole
  sessions (150 per bot, 18 rests of 35 s) banks were then about 36% of all goals (yours 23 to 37% of your goals, his 36 to 50%), nearly all of them wide shots that clip the SIDE glass on the way
  in, not played banks; they were about half of Amir's goals and 62 to 66% of his board points against an average or a tired player, so a tired player won only about 39% of the first-to-15
  matches. A skill shot to learn was meant; the evidence asked for an easy, non-frustrating dose in a rest. Now the glass touch counts only inside `BANK_REACH`, and the last one decides.
  Banks are 19 to 27% of all goals for every bot, whoever plays, the board follows the goals within two points, and `react` came down from 0.24, 0.12 to 0.16, 0.07 because the same rule alone had
  made Amir easy to beat (an average player 80% of the matches, a tired one 63%).
- **What the bots say** (`test_rally_sim.js`; 8 seeds, 3,000 s each): the shares are counted in GOALS and in whole MATCHES (first to 15 on the board).
  Before (every glass touch counted, `react` 0.24, 0.12) → after (a played bank, `react` 0.16, 0.07):

  | bot | goals | board | matches won | banks, share of all goals |
  |---|---|---|---|---|
  | sharp | 69.2 → 68.6% | 69.1 → 70.2% | 97.8 → 99.3% | 34 → 23% |
  | average | 57.1 → 54.4% | 53.5 → 54.9% | 64.5 → 70.6% | 36 → 20% |
  | tired | 52.0 → 49.6% | 47.5 → 49.8% | 37.7 → 52.3% | 36 → 19% |
  | follower | 85.8 → 85.6% | 84.5 → 85.8% | 100 → 100% | 38 → 26% |

  (Long run, 96 seeds from seed 1000: average 69.7% of the matches, tired 49.4%, sharp 98.5%, follower 100%; goals 54.2, 50.1, 67.8 and 85.3%; banks 21.2, 20.2, 23.7 and 26.8% of all goals. Over twelve more 8-seed blocks the average bot's matches ran 63 to 75% and the tired one's 44 to 53%, so one fresh block in twelve would miss a band: if the guard fails after a change that should not move him, run `--seed N` before retuning.) The follower wins every match at 85% of the
  goals (a bot that wins 85% of the points loses a first-to-15 match about once in 400,000), so "under 100%" is asked of its goals and its board, which stay under 90%. The sim asserts: an average
  player wins 60 to 75% of the matches, a tired one 45 to 65%, a sharp one at least 85%; banks are 12 to 28% of all goals for every bot; the goal order sharp > average > tired holds on the board and in matches; and
  Bajada's rule itself on a bare court (a bank inside the reach is 2, past it 1, the last touch decides, a slow touch changes nothing).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
