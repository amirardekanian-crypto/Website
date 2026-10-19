## Career screens off (2026-10-19, Career Mode round 5 step 3)

**And then the cut, the same day (stage78, `career/PROCEDURES.md` → *Stage 78*):** the server holds no title any more. `hab_titles` is empty,
`claim_titles()` answers nothing, `set_title()` clears the worn title, `hab_close_season()` mints no season title, and the board and roll call answer
no title and no rank name. Every badge but the four marks left the server too (their XP stays, as nameless facts). The dormant title, Locker and
shelf code in habits.html now has nothing to read; it is removed in a later tidy.

Amir cut Career Mode down to its lightest version (`career/CAREER_MODE.md` → *Round 5*, decisions L1 to L11). A coached athlete meets their
level, their four numbers, their moments and Amir's notes in **AA Performance** (`program.html`, on Progress). **AA Proof keeps its habits,
the week table, Today and the Crew board.** The career screens in this file are switched off for everyone, with ONE constant,
`const CAREER_LIGHT = true;` at the top of the script in `habits.html`.

**Display only.** Habit XP is earned, scored and synced exactly as before. `scoreDays()`, `paidXp()`, `bonusEvents()`, `levelInfo()` and every
twin are untouched, and `scripts/check_twins.js` still passes. The profile and the baselines keep moving in silence (`CFG.seen`, `careerSeen`,
`catalogueSeen`, `seenAwards`, `seenTiers`, `seenAch`, `CFG.pass.owned`), so nothing replays when the screens come back or when the cut removes them.

**What left**
- **The Locker tab.** The bar is Today, Progress, Crew. `go('pass')` opens Progress, so `?go=pass` (the training app's old Career row) and `?go=progress`
  both land there. `fetchShelf()` is not asked on Progress any more, so `get_awards()` is not called from here.
- **Today:** the rank name, the crest, the link to the Locker and the four numbers under the bar. The level stays as a ring with its number, the bar
  and *N XP to level N+1*. Nothing opens from it.
- **Progress:** the Milestones tile and the whole shelf (badges, achievements, the Earned strip, the Grand Slam row). What stays is three season facts
  (Days logged, Day streak, Perfect days), the week table and the quests while a run is on.
- **Settings:** the profile card is not a link and shows no rank. **Habit detail:** its level line has no rank name.
- **Crew:** no rank name and no title on a board row or a wall line, and no gold, silver or bronze emoji. A place is a plain number. The order, the
  points and the *moved since you last looked* marker stay. The leaderboard RPC still sends `rank_label` and `title`. The phone does not draw them.
- **Moments:** no first-open career reveal, no catalogue reveal, no level-up or rank-up takeover, no reward, title or award takeover, no season title
  screen, no waiting server moment. No wins line for a tier, a milestone, a habit's rank, an award or a season (`LIGHT_NO_WINS`).
- **The share picker** offers The day, Streak and Month, plus Quest or Comeback when it is opened for one. A door that still names Rank or Title opens The
  day. A milestone has no card.
- **The manual and the tour.** *Levels and ranks* became *Your level*, and *The Locker* and *Four kinds of win* are gone. The tour is five steps, and *Your level*
  says where the rest went.

**What stays:** the habits, the week table, Today, the day streak and its takeover from `STREAK_TAKEOVER` days, quests, a perfect day and a comeback on the
wins card, roll call, the board (points and order), each habit's own level ring and its consistency steps on its page (they still pay XP).

**Waiting moments are never told from here.** `serverMoments()` returns false while the switch is on. Telling the server a moment was shown would mark it
shown, and the athlete would never meet it in AA Performance. The training app owns `mark_moments_told` now.

**The door card.** On Progress, where the shelf was, a coached athlete (not `isFree()`) sees ONE card (`doorCard()`): *Your level, your four numbers, your
moments and Amir's notes are in AA Performance now, on Progress. Your habits stay right here.* and a button, *Open AA Performance*. The button opens
`programUrl()` plus `&go=numbers`: `program.html` reads `?go=numbers` and opens its Progress at *Your numbers*. A free athlete sees no card: Progress shows their habits and day streak, and nothing empty about a career.

**Where it went:** AA Performance → Progress (round 5, L7). Another build, in `program.html`.

**The code stays until the cut.** The drawing code (the Locker, the shelf, the reveals, the takeovers, the Rank and Title painters) stays in the file, unreachable,
until step 4, "the cut", removes it together with the server data (L6). To see the old screens again, set `CAREER_LIGHT` to `false`.
`scripts/headless/proof-light.js` tests the light version. `scripts/headless/proof-cards.js` runs its Rank, Title and Locker routing on the page with the
switch set to false, so that code stays under test. `scripts/headless/career.js` still drives the old Locker and shelf, so its AA Proof checks describe screens
that are off until it is updated.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
