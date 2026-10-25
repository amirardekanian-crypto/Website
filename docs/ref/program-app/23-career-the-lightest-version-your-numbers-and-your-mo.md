## 🎯 Career, the lightest version: Your numbers and Your moments (Career Mode round 5, step 3, 2026-10-19)

**This section wins over the three above where they disagree** (Hold Serve on Home, Career on Home, Rewards on the finish card). Amir's
lightest version (`career/CAREER_MODE.md` → *Round 5*, L1 to L11, 2026-10-20): athletes see a level with **no rank name**, the four
numbers, their moments, the monthly goal, the crew and Amir. **No badge, rank, title, Grand Slam, level road, metal or card skin anywhere
in this app** (L2, L5). He picked the look on *Your Numbers* (Direction A, the Scorecard; 2026-10-19: *"go with your choices about your
numbers"*). AA Proof's career screens are off (HABITS.md → *Career screens off*), so **this app is the career's home now**. No number
changed: the server, the XP and the levels are exactly as before.

- **Home:** after the week's days, **New from Amir** (`#home-note-wrap`, `paintNote()`): his newest line from Courtside's *From Amir*
  that is not read, his photo with a clay dot and the label in clay, the one clay thing on Home until it is read (DS-01). A tap marks it
  read at once on this phone (`_noteReadQ`) and on the server (`mark_note_read()`, stage77, the athlete themself only), then opens
  Progress on that line. Then **Career** (`careerRowHTML()`): *Level 17*, this week's Hold Serve line (`holdLineText(holdState())`,
  *7 weeks in a row · 1 more session this week*) and the nearest mark (`careerNearMark()`, *4 sessions to 50 with Amir*, shown when
  within 3 or at 70% or more), the level bar along its foot. **The Hold Serve row folds into it**: `paintHomeCareer()` draws both and
  shows the Hold Serve row only while there is no Career row (offline with no copy). The icon is steps up (`hrowIc('career')`), never a
  rank's chevrons. A tap opens Your numbers (`goCareer()` → `goTo('plan')`, scrolled to `#numbers-title`), no longer AA Proof.
  Then the habits: **once AA Proof's strip is on screen it IS the habits** (its own head, *Today's habits*, and one row of chips that
  wrap, ticked in place; habits.html → `renderEmbed()`), and the Daily habits row goes (`paintHabitsCard()`, `_proofStrip.on`). Until
  then, and when the strip never comes, the row alone. This app still writes no habit key but body weight.
- **Progress → Your numbers:** the career's card (`careerCardHTML()`, `.cs-card`): **LEVEL**, the level in display size and *740 XP to
  level 18*, its bar, then the four numbers 2 × 2 (`careerMarkCells()`): the number, its name, **NEXT 8** (the next mark not reached;
  *Every mark* on the top one; weeks held adds *best 9* when the run now is below the best) and a small bar toward it. Weeks held is the
  run now and its marks are a run's length, so its next mark is above the best run. Sessions with Amir adds a finished session no answer
  has counted (`careerPendingSessions()`). Under it the month's goal (`.cs-goal`, from `get_my_moments().goal`): a ring, *October goal
  · from Amir* and his line; done, the ring fills green and says *done*. Then **Your moments** (`momentsHTML()`, `#moments-title` with
  the count): newest first, six shown and *Show all N*: each mark reached (`get_awards()` badges' `days`, one row per tier: *8 weeks
  held in a row*), each achievement with its line (a name in capitals reads as a name), each of Amir's lines (*From Amir*, his words in
  clay, *Reply on WhatsApp* under it: `coachWhatsAppUrl()` with the line quoted; WhatsApp only, no reply box), and each honour (*Most
  sessions in September*, *Most improved*, *Full month*, *Amir's Pick*; a near miss is never sent here). **Amir saw this** (a green pill)
  sits under a moment whose award id Amir marked Saw it in Courtside. Then **Records and body** (`#records-title`) and the two rows.
  Without the career (offline with no copy, the demo, the coach's preview) only the two rows show, under Your numbers.
- **The four marks** (`careerMarks()`, L3): the tiers of four badges in `career/badges.toml`: weeks held 4 · 8 · 12 · 24 · 52 (`held_weeks`),
  sessions 25 · 50 · 100 · 200 · 500 (`century`), bests 5 · 10 · 25 · 50 · 100 (`bests`), comebacks 3 · 5 · 10 (`comebacks`). They stay on
  the server after the cut. **`scripts/check_career.py` rule 23 holds the list to the file** (a tier appended to the file only is a
  warning, anything else an error): change both. Words: `careerMarkWords()`.
- **The data:** `refreshMoments()` asks `get_my_moments()` (stage77: the athlete's own goal, Amir's lines, the award ids he saw, their
  honours) and `get_awards()` (every award with its day) together, after a fresh `get_profile()` answer and when Progress opens, at most
  every 2 minutes (`refreshMomentsIfOld()`), and keeps them in `<id>_momentscache` (**never synced**, `_snapshot()`). A line read here
  that the server still has unread is told again. Never in the demo or the coach's preview.
- **The finish card** moves only the four marks: `careerEarn()` hands `careerMoves()` (the twin, unchanged) the smaller ladder
  `careerLadderLight()`, and `careerMovesHTML()` writes *24 of 25 sessions with Amir*, *5 of 8 weeks held · when the week counts*, *· a
  new mark* when one is reached. No badge name, no metal, no *+N more in AA Proof*.
- **The finished card's bands and the moments:** only achievements and the four marks' tiers (`rwLight()`); a mark becomes
  `careerMarkSpec()` (*A new mark* on its band). Every other badge, a title, the Grand Slam, a level or a quest card is neither a band nor
  a moment (they leave the server with the cut). The overflow line says *+N more in Your moments, on Progress*. **A mark's moment**
  (`rwMomentFor()` → `openMoment()` with `num` and `next`): *A NEW MARK*, the number at 120 px, *weeks held in a row*, *Next mark · 12
  weeks*, a line signed by Amir (*Every session, 8 weeks running. Keep it boring.*), **Share the card**. An achievement's keeps its name
  and line.
- **The share card is a stand-in until its own design pass** (Amir, 2026-10-19: *"the cards are very important part of this app, because
  we want to use it to advertise our brand. we need to design them carefull and with details later"*): a mark shares as Highlight
  Reel's achievement card (the seal, *8 weeks HELD*, a line, the date), so no metal shows. `assets/js/sharecard.js` was not changed;
  its badge, title and level cards stay drawable but nothing opens them. The Farsi card shows the mark's name in English until the pass.
- **Tests:** `scripts/headless/career.js` (both apps), `scripts/headless/hold-serve.js`, `node scripts/check_twins.js` (`careerMoves()` is
  unchanged), `python scripts/check_career.py` (rule 23), `scripts/headless/signin.js`.
- **Achievements, Four Courts** (**replaced on 2026-10-25 by the cabinet: `PROGRAM-APP.md` → *The cabinet*. The kind tiles and the kind sheet are gone; Next up, the door, the data and the nudge stay. The rest of this bullet is the page as built on 2026-10-19.** Amir's pick A on the page *Achievements*, https://claude.ai/artifact/WPHuuK2Y2z4jfEQUPVdqNt; 2026-10-19), in
  `#career-courts-wrap` between Your numbers and Your moments (`courtsHTML()`, painted by `paintCareerCard()`): the title **Achievements**
  with *earned of all*; **Next up**, one card (the server's `next`: the furthest along, else the easiest first step, never a resilience one),
  its name, the line of what is left (`achLine()`: *Hold this week too. 1 week to go.*, *2 more check-ins before a session.*, *1 more month with
  Amir.*, *Your best lift is up 84%. 100% gets it.*, or the rule for a first one) and its bar; then the four kinds as four tiles 2 × 2
  (Consistency, Commitment, Progress, Resilience: *earned of all*, the newest earned with its day, or *None yet*). A tile, or Next up, opens the
  kind in the shared sheet (`openCourt()`, wrapped by `sheetWrap()`, so Back closes it): earned ones newest first with their caption and day,
  then the rest, furthest along first, with what earns them (a started one: its line and a bar), the kind's nearest marked **Next**. Green and
  grey only (DS-01). A capitals name reads as a name (`momName()`: *First Blood*). The data is `get_achievements()` (stage80), asked with
  get_my_moments() and get_awards() in `refreshMoments()` and kept in the same `<id>_momentscache` (`MOM_T.ach`); no answer (the server without
  stage80, offline with no copy, the demo, the coach's preview): no section, nothing else changes.
- **The nudge on the finish card** (`achNudgeHTML()`, under the marks' lines): one green line when the session leaves the athlete one step short
  of an achievement, from the same numbers: one plan session left this training week after this one, and holding the week gives Held or Back
  to Back (*One more session this week and you get Back to Back.*), or the next check-in gives Straight Talk. Never a weekday (athletes move
  their days). `careerEarn()` carries `weekLeft` and `checkin` for it.
- **The Monthly Open, on Crew** (stage85; Amir's pick A on the Crew and Open page, 2026-10-19: *"for crew and the open go with your picks"*),
  `crewOpenHTML()` in `renderCrew()`, under the honours and above the composer: **THE OPEN**, the challenge's name, Amir's words for what counts,
  then the board ranked by the result (the first five, the athlete's own row carried in beneath them wherever it ranks, **Show all N** for the
  rest), *Your result: 95 seconds* when they have one, and one clay door to WhatsApp (**Send Amir your result**, or **Send a better one**). The app
  **never writes a result**: Amir confirms every one from the clip, so there is no form here at all. It comes inside `get_bell()` as `open`
  (so Crew still costs one call, and stage83's etag covers it); null or missing, and no card is drawn. Checked by `scripts/headless/crew.js`
  (the card, the order, your own row, the door, an empty board, a long one, no stage, 320 px and dark).
- **Four Courts' tests** (rewritten 2026-10-25: `fourCourts()` keeps the door, Next up, the nudge and the no-answer case; the page is `scripts/headless/cabinet.js`): `scripts/headless/career.js` → `fourCourts()` (14 checks: the section, its order, Next up, the tiles, no clay, a
  kind opened, Back, Next up's tap, both nudges and none, 320 px, no answer); the stub answers `get_achievements` from its `achievements`.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
