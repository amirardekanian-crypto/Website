## 🏅 Rewards on the finish card, the bands and the row (Career Mode phase 3, 2026-10-18)

> **Round 5 (2026-10-19):** the light screens changed parts of this; *Career, the lightest version* below wins where they disagree.

The training app's half of Career Mode's catalogue switch (`career/CAREER_MODE.md`, GAME-13 and GAME-14; the server's half and AA Proof's
are in `HABITS.md`). **Built behind `catalogueOnT()`, ON since 2026-10-18:** with the catalogue switch off the app is exactly phase 2's (the finish
card, the row and the finished card are byte for byte what they were; `scripts/headless/career.js` still passes). **No new screen**
(decision D13): Proof is the career's home (the shelf, the Grand Slam, the titles), this app adds four small things to places that exist.

- **The gate:** `catalogueOnT()` = `careerOnT()` and `p.switch.catalogue` and `p.ladder` and `p.owned`. It reads the profile of the
  server's `get_profile()` (spec §6): `ladder` (every live badge with `have`, `now` for a run, `next`, `next_tier`, `metal_next`,
  `size_next`, `phone`: `'session'` = this app moves it at Done, `'week'` = it moves when a week or cycle closes), `near`, `owned` (a
  **list** of award ids, sorted, no days: the dedupe key; read through `ownedIds(p)`, never `Object.keys(p.owned)` or `owned[id]`),
  `numbers.four` and `moments`. **The profile is split (stage70):** `get_profile()` is the core and carries no `recent`, `titles` or filled
  `badges` / `achievements` (those are `get_awards()`'s, the shelf, which only AA Proof reads when its shelf opens). Nothing is asked of the
  server that phase 2 did not ask: one `get_profile()` plus `mark_moments_told()`; this app never calls `get_awards()`. The one cost: a
  reward AA Proof has already told is no longer in `moments` and, with no `recent`, draws no band here (`collectRewardBands()` still reads
  `p.recent` if a profile ever carries it). A session's own reward is untold when the answer after Done arrives, so it is in `moments`.
- **The finish card, before Done** (`careerMoves()`, `careerMovesHTML()`; `.cf-moves` under the XP lines in the same `.confirm-earn` box):
  every ladder the session moves, **three lines at most**, then one grey *+N more in AA Proof*. A line is `Paper Trail 10 of 10 · bronze`
  (a tier crossed: bold ink, the metal in lower case), `Century 24 of 25`, or `Hold Serve 5 of 8 · when the week counts` (a week ladder:
  Hold Serve and The Long Count when the session closes the week, Love Hold when the week is by the book so far, Closer when it closes
  the cycle; always pending, because the server decides a week). Order: crossed first, then the nearest (`next − have`), then the sure
  before the pending. `careerMoves(e, ladder)` is PURE and a **twin** (`scripts/check_twins.js` §10, `scripts/career/reward_cases.json`):
  `e = { early, repeat?, fullLog, checkin, weekCloses, cycleCloses, byBook? }`; `byBook` is optional (without it the session alone is read);
  each line is exactly `{ id, name, have, next, crossed, pending }`, and the metal word is read from the ladder when it is drawn.
  **`repeat` is GAME-4, and D19 is Claude's pick, in since Amir went live with it** (stage73, applied 2026-10-18): `careerEarn()` passes the flag it already works out (the plan day was done earlier in this
  training week), and a repeated day moves **no count over `session_finished` / `session_finished_early`** (Century stays at 24 of 25),
  because `career_facts_paid()` pays one session per plan day per week and the badges count only what it pays. The full log and the
  check-in still move their ladders (they are paid per session, uncapped). **The lift badges are not previewed here:** The Upgrade and
  Double Up count `lift_gain` on main lifts only (D18: a Spine entry on a main pattern, tagged strength, minus four accessories; the entry's `patterns`, `qualities` and `exclude`, which fails closed on a missing id), so the server leaves `phone` off their ladder entry
  and this card never shows them; the server decides a lift's gain and the phone cannot know a lift's Spine pattern, tags or exclusion.
  A run badge (Hold Serve) counts from the ladder's `now`; if the ladder leaves it out, `careerLadderNow()` fills it from
  `numbers.four` (one source). **Clay never shows here** (DS-01); no new card, `--fs-` tokens only.
- **The finished card, after Done** (`rwCountingBands()`, `collectRewardBands()`, `paintWinBand()`; the Highlight Reel's slot
  `#hlwin-<day>`, `<id>_hlwin_d<N>.rewards`): at Done `careerEarnAtDone()` also keeps `snap` (every award id the phone knew) and `moves`
  in `<id>_earn_d<N>`. A tier the finish card showed as crossed (and is not full-screen) is a band at once with **Counting** in its mint
  label and no Share. When an answer asked after the session reached the server arrives, `owned` minus `snap` is mapped to specs through
  the answer's `moments` (and `recent`, if present): a Counting band whose award is owned becomes the real band (the label goes, Share is there), and
  one the server did not give is taken away. A full-screen reward is never a band (it gets its moment); a `tick` is XP only; an older
  reward this phone only just learned of is Proof's to tell. **Three bands at most across the Best/Retest specs and the rewards, the rest
  one grey line.** The reward's name and, for a badge, its metal go in `<b>` as plain text, never `<em>` (that is clay on the green). Share
  opens the sheet on the badge, achievement or title. **Only a reward drawn as a band is marked seen and told** (`mark_moments_told`, app
  `'training'`): the room for rewards is `3 − the day's Best/Retest specs`, in the stored order, and one behind the *+N more in AA Proof* line
  (or cut by the 8-reward cap) stays unseen and untold, so AA Proof's queue still announces it (GAME-14).
  A reload paints the same bands from the key, quietly (the reward bands wait for the profile, so `paintCareer()` draws them).
  **`paintWinBand()` with the catalogue off is phase 2's, exactly:** every paint that is not quiet re-draws the bands, runs their `is-new`
  burst and buzzes (`navigator.vibrate`). With the catalogue on a band bursts, and the phone buzzes, only for a band key not on screen yet.
- **Moments** (`maybeRewardMoment(reason)`, `rewardAfterAnswer()`, `openMoment()` with a new `onClose`): the queue of spec §7. **Only an
  answer received in this run opens one** (`CAREER_T.at` newer than the page's `performance.timeOrigin`), never the phone's copy at
  first paint. On every fresh answer the **cross-app catch-up** runs first: a waiting row this app has seen (`<id>_rw_seen`, which is
  **synced**, merged as a union) is told on the server, so AA Proof never replays it. Then **one** full-screen moment per open of ANY kind
  (`_rwOpened`: the cycle's own moment counts, `openMoment()` sets it): the first waiting `full` row, unless a moment already opened, a
  session is under way (`body.session-on`), or `.wel`, `.hl-moment` or `.finish-rate:focus-within` is on screen. The first answer after a
  session reached the server ('done') opens the biggest full-screen reward **that session earned** (not in `snap`), 0.7 s after the
  answer so the finished card has scrolled in, never over the rating, even if one opened at boot. A row that does not open stays unseen
  and untold: it comes at the next open. The seen list is written BEFORE the moment shows. A moment never blocks Done or the session
  queue (`scripts/headless/session-queue.js` still passes, and Done works with `mark_moments_told` refused). Content: eyebrow = the
  meaning (*Consistency*; *Grand Slam* for that title), title = *Hold Serve · Emerald*, sub = the server's caption, art = the current
  cycle's cover, words = milestone *That one took weeks. It's yours for good.*, legend *This is rare. Well done.*, Grand Slam *A title
  in all four. That's the whole game.*, go = `HL_TITLE[kind]`, specs = the award's share spec plus the title it minted. Not in the demo
  or the coach's preview.
- **Home's Career row** (`careerRowHTML()`): the level line is untouched. Two more small lines under it, each on its own line:
  `.career-four` from `numbers.four` only (*7 weeks held · 41 sessions · 12 bests · 2 comebacks*, a zero cell left out, nothing when
  all four are zero, singular at 1; **Sessions with Amir shows +1 from this phone** for a *paid* session finished here that no answer has
  counted yet, never lower than the profile's: **a plan day done again in its training week adds nothing** (GAME-4; D19, Claude's pick, waiting for Amir's
  word: the server counts one session per plan day per week, as Century does; if he says no, `careerMoves()`'s `repeat` rule and `careerRecPaid()` go back with stage73's),
  which `careerRecPaid()` reads from the `paid` count `careerEarnAtDone()` writes on the record (this finish's own session, none for a repeat, plus what the record it
  replaces still had waiting, `careerPaidAtDone()`, so a repeat never takes away a session of the same plan day that no answer has counted yet), else from its `repeat`
  flag, else, for a record written before them, from its parts, a record with no `session` / `early` part being a repeat) and `.career-next` (`near[0]` as *Paper Trail 9 of 10* when it is within two or at 80%).
  The tap opens AA Proof's **Progress** (`&go=progress`) instead of the Locker; the `aria-label` names the numbers. Checked at 320 and
  390 px, light and dark: the four wrap to two rows at most, the goal is one row, the rank line is never cut.
- **The guide:** `APP_GUIDE` *Getting around*, *Finishing a session*, `key: 'career'` and `key: 'share'` each gained a sentence phrased
  *Once Career Mode's rewards are on, …* until the go-day commit rewrites it to the plain present (Amir reads every new string first, D10). The guide says what the app does, no more: the goal line shows only *when you're close to a badge* (as `.career-next` does), the row opens **Progress** in AA Proof, a Counting band has no Share until my side has it, and a band can be a badge, a moment or a title.
  `scripts/headless/guide-truth.js` passes.
- **Keys:** `<id>_rw_seen` is new and **synced** (`_snapshot()` does not skip it; `mergeStoredValue()` unions it); `<id>_earn_d<N>` gains
  `snap`, `moves`, `repeat` (the plan day was done already this week: it adds no session to Home's count), `paid` (the sessions this record adds to Home's count until an answer counts them: this finish's own, none for a repeat, plus the +1 of the record it replaces if that was still waiting; `careerRecPaid()` reads it first) and `rm` (a moment was decided for this finish); `<id>_hlwin_d<N>` gains `rewards`. `program.html` still writes no
  `<id>_hab_*` key.
- **Boot-order lesson:** Home's first paint reaches `careerRowHTML()` before the script has evaluated its later `const` tables, so every
  lookup the first paint can reach is a function (`careerFourWord()`, `rwMetalWord()`, `hlBandWord()`), and the new top-level state is
  `var` with no initializer (`_momentQ`, `_rwOpened`).
- Checked by `scripts/headless/career.js` and the other suites (the training half, with a stub profile that follows spec §6): the off
  state is phase 2's, the row's lines (zero cells, far goal, aria-label, tap), the finish card's three lines and *+N more*, Counting
  bands then confirmed or withdrawn, the cap, Share on a reward band, a reload, a moment per fresh answer only (none from the copy), one per
  open, the catch-up, the Grand Slam's line, demo and preview silent, the Welcome blocking, the moment after Done, and a refused
  `mark_moments_told` not touching Done.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
