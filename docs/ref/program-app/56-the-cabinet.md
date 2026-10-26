## 🏅 The cabinet: Achievements as emblems, a medal every ten levels, Trophies on a Player Page (the Emblem Cabinet, 2026-10-25)

**This section replaces *Achievements, Four Courts*** (the bullet in *Career, the lightest version*; its kind tiles and its kind sheet are gone). Amir picked
direction A of the board https://claude.ai/artifact/8eH6ZbquCeTMZd46BK3QwG and said *"go with your picks"* to round 2; on what happens to people who have done
an achievement already: *"remember if anyone has done the achievements before, it should be unlocked, their trophies should be already won, but no xp should
be given to them. only from now on, the achievements will give xp"* (D21, `career/CAREER_MODE.md`; the server's half is stage99, rulebook version 11). The
build contract is kept with the board (Amir's seven decisions of 2026-10-25 and the 33 new achievements of rulebook 11); the drawings are `assets/js/emblems.js` (`window.AAEmblem`, never redrawn here: a drawing that looks wrong
is reported, not fixed in place).

- **The page** (`#screen-achievements`, `renderAchievements()` → `cabHTML()`): the cover with *N won · M to win* under the title, **Next up** (as before, a tap
  opens its emblem), **Latest** (big cards on the step's own ground, `AAEmblem.ground(tier)`, with a New tag: the won ones not seen yet, newest first, ten at
  most; the three newest when nothing is new), **All achievements** with the chips *All · Won · To win · Consistency · Commitment · Progress · Resilience*, then
  **Level N** (the decade medals) and a section per family in `AAEmblem.SECTIONS` order (*Streaks* is weeks, then months, each with a small label), each a
  grid of three: the emblem at 80 px, a short name (`cabShort()`: *25 sessions*, *4 weeks in a row*, *A year in a row*, *15 personal bests*, else the
  catalogue's name), one grey line (won: its day, or *11 times*; not won: *12 of 16*, or *Not yet*) and a clay dot while it is unseen. Habits draw **one
  ladder per row**. The four kinds are the filter, not tiles; a kind hides the level medals (a medal is no kind). The filter is kept in `localStorage`
  `aa_cab_filter` (this phone's, never synced). An id the emblem map does not know goes into Trophies with the plain fallback drawing.
- **The items** (`cabItems()`): `achItems()` (`get_achievements()`, stage80) plus every tier of the four marks (`careerMarks()`; a tier is won when
  `get_awards()` has its day, else, only while that answer is missing, when the number says so), merged and ordered by the emblem map's `order`. **No
  `get_achievements()` answer, no cabinet** (offline with no copy, the demo, the coach's preview): no door and no page, as before. Counts (the page's line and
  the door's figure) are achievements, mark tiers and the eleven level medals together.
- **Everything the server adds is optional.** `done_on` (the day the work was done: shown instead of `day`, so a back-filled one says when it really
  happened), `xp_won` (what it was minted with: *+N XP* on a won sheet only above 0, the catalogue's `xp` when the server sends none), `times` (*Won 11 times*,
  display only, pays nothing) and the 33 new ids all arrive with stage99; before it the page is what the server sends today (`scripts/headless/cabinet.js`
  runs both).
- **A sheet per emblem** (`openEmblem()`, in the shared `#hist-overlay`, wrapped by `sheetWrap()`: Back and ✕ close it, Share it opens the share sheet
  *‹ Back* to it; a medal is `openLevelMedal()`): the emblem at 210 px, *Kind · Step* (*Consistency · Clay*), the name, the rule as one sentence. Not won:
  a bar and *12 of 16 weeks*, *+800 XP when you win it*, and **Open Next up: Day N** only for sessions, weeks and months and only while a plan day is next
  (`cabNextDay()`). Won: *Won 3 Aug* (+ *· +N XP*), *Won 11 times*, **Share it** (the achievement's card, with the emblem on it) and **Tell the crew** (only
  `crewCanTell()`, one plain line through `crewTellMoment()`).
- **Seen** (`<id>_cabseen`, **this phone's own, never synced**: `_snapshot()` leaves it out). Opening the cabinet marks everything won as seen (`cabMarkSeen()`),
  after it has been drawn with what was new (`_cabNew`, one visit's). The first time a phone reads it, everything already won is seen except the 33 of rulebook
  11 (`v11` in the emblem map): those are exactly what the athlete has not met, so a back-filled trophy shows up as New once. Not even a baseline is written until
  `get_awards()` has answered, or every mark would be new later. **The Progress tab carries a small clay dot** (`paintCabDot()`, the `.nav-dot` Crew uses) while
  anything won is unseen and the cabinet is not the screen; the door says *N of M* and **3 new** (`.hrow-new`, clay: Progress remaps `--clay-ink` to green, so it
  reads the fill clay in light and the big-text clay in dark). No number on the tab.
- **Level medals** (`AAEmblem.level(L)`): beside *Level N* in Your numbers (`.cs-lm`) and on the finished card's level line (`.earn-lm`). **Only a tenth level
  opens the full screen** (`maybeLevelMoment()`, from `rewardAfterAnswer()`, before any reward's moment: one moment per open, D7): *Level up · a new medal*,
  *Level 30*, *Terracotta, from 30 to 39. The next medal comes at 40.*, **Share it** (the existing level card), **Tell the crew** (*Just reached level 30.*).
  `<id>_lvseen = { "20": ms }` is this phone's too: the first fresh answer on a phone only notes the medal it is on (nobody is shown a medal they have worn for
  months), after that a fresh answer on a new decade opens the moment, once; never from the phone's copy, never in the demo or the preview, never over the Welcome
  or another moment, never mid-session. The levels between stay on the finished card.
- **The big moment** for an achievement or a mark tier (`openMoment()` with `emblem`): the emblem is the hero over the rays (the rays come out of the emblem's own
  middle), so a mark no longer shows its big number (it is in the emblem) and no small copy of the card sits on the page (it is one tap away, under Share it).
- **Someone else's page** (`playerHTML()`): their level medal on the corner of their face (the LV chip stays only until the emblem script has loaded), and
  **Trophies · N** instead of Achievements: their three newest emblems, newest first, then **All ›** (`openPlayerAchievements()`): their whole shelf, **won only, no ghosts**, level medals
  first, then the same sections. **Their own switches decide whether any of it shows, exactly as before** (`plMark()` / `plKindOff()` for `achievement` and
  `level`): on your own page a switched-off level or achievements still show, each marked **Only you** (the level's label is a line under the dates).
  `a.id` is the award id (*achievement:big_apple*); the emblem map is keyed without the prefix. **A mark's step is a trophy there too** (stage105, 2026-10-26: *"all of them should be the same, and should be shown"*): `crew_page()` sends it as `badge:century:2` (the badge, then the step 1 to 5), `plTrophies()` draws it with `E.mark()` and sorts it into the same section, and it opens as a mark's step (`achDetailOf({ k: 'mark' })`).
  **No cheers on a trophy** (Amir, 2026-10-25: *"when you click on someones profile, and you see their trophies, we dont need to see who cheered for their
  trophy"*): no face stack, no *Cheered by*, no one-time note on a like. Every trophy is a button to **what it is** (`openPlayerTrophy()`): the emblem, its kind
  and step, its rule and *Won by Sam · 22 Oct*, with no Share and no Tell the crew (those are the winner's own). Your own trophy opens your own cabinet's sheet.
- **Crew line and share card.** **A Bell line carries no emblem** (Amir, 2026-10-25: *"every achievement that any one gets in crew should be clickable. when
  they click, it shows the details of that achievement, we dont need the medal of it on the crew screen"*): the achievement or the mark in the line is a button
  (`.cr-ach`, `openCrewAch()`) that opens the same sheet as a trophy (`achDetailOf()`, `achDetailSheet()`): *Won by Mina · 3 Oct*; yours opens your own cabinet's
  sheet. `assets/js/sharecard.js` draws the emblem on the **achievement** card where the seal was (`spec.emblem`, `emblemUrl()`): the
  emblem is made whole (its gradients inside the file, Barlow Condensed 800 as a data URL, because a picture made from an `<svg>` cannot reach the page's fonts or
  gradients), drawn into the canvas, and with no emblem script, or anything failing, the seal stays. It works with no signal: both come from this site's own
  files, which the service worker keeps (`emblems.js?v=1` and `BarlowCondensed-800.woff2` are in `SHELL`).
- **Early Bird and Night Owl read the time a session was finished** (`p_session.fin`, "HH:MM", 24 h, local). `finishTimer()` stamps `fin` beside `sessionEnd` when
  Done is pressed; `finOf()` reads it back, so a later rating, note or replay says the same time and never "now"; `recordSessionToCloud()` adds it to
  `p_session` and, if the clock is gone, carries the one an earlier version of the same session still waiting in the queue had. **Left out when unknown**: a
  session with no clock running, or one filed unfinished (Done was never pressed), has none, and nobody is back-filled. An old server ignores the key, and the
  whole thing sits in a `try`: a save is never refused or lost because of it.
- **The words** are Amir's (COM-3): *APP_GUIDE*'s Career card, the player page's guide and the manual's Achievements card name the cabinet, the chips, the
  medals, Trophies and (only when the athlete has such a one, `xp_won === 0`) why a won achievement shows no XP.
- **The colour** set gained `--ghost` and `--ghost-dk` (light `#E6E0D6` · `#D2C9BB`, dark `#2C2C2C` · `#222222`), on `body` and `body[data-dark]` like every token.
  No yellow, gold, ochre or amber: the five steps are Ink, Grass, Clay, Night and Champion, never a metal.
- **Tests.** `node scripts/headless/cabinet.js [--out <dir>]` (84 checks: the server of today, the server of rulebook 11, seen and the dot, the filter, every
  sheet, the level moment, the emblem moment, a Player Page and its All ›, the Bell, the share card with and without signal, `fin`, 320 px and dark, and the pictures);
  `career.js` keeps the door, Next up, the nudge and the no-answer case (`fourCourts()`); `lounge.js` sections 4, 12 and 18 follow Trophies; `scripts/headless/sharecard.js`.
- **Open.** The calendar trophies' windows and the clock times live in `career/achievements.toml` (GAME-10), never here. A drawing Amir does not like is changed in
  `emblems.js` and the version in its `?v=` raised (and in `sw.js`'s `SHELL`).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
