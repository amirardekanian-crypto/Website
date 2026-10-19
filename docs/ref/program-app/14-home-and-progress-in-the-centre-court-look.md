## 📊 Home and Progress in the Centre Court look (2026-10-12)

Amir, after the UX audit *Quiet Frame* (claude.ai/artifact/BBWjsR99FqthXmzCkeyK49) and Centre Court: *"moving gameplan tab
and changing its name, then move the cycle card from home to progress tab … do #6, floating initials"*, then *"yes to both,
move records and weight too"* (and drop the empty wins line). The look is Centre Court's (*"the redesign of other sections
should look like this"*): calm paper, rows with hairlines, one strong green thing on a screen. All of it is ONE CSS block,
**HOME AND PROGRESS IN THE CENTRE COURT LOOK**, the last in the sheet (after CENTRE COURT, so it wins a tie). Its colours
and its gutter `--g` (20 px, 16 under 360) are the app's ONE colour set since 2026-10-13 (it kept a copy of Centre Court's
tokens for one day; the copy is gone).

- **The tab bar**: Home · **Progress** · Library · Coach. Progress is the old Game Plan button (`data-tab="plan"`,
  `goTo('plan')`, the screen `#screen-plan`: none renamed) with a rising-line icon. Records, Body weight and the archive
  light it (`goTo()`'s `litTab`).
- **Progress, top to bottom** (`renderPlan()`): the athlete's name as an eyebrow (`.prog-eyebrow`) over **Progress**
  (`h1.prog-title`, 44 px), the sport badge; the **This cycle** card (`#cycle-card-wrap`, `paintCycleCard()`: since
  2026-10-13 the screen's one green cover, with the cycle's dates and, in the last 14 days, the days left: the separate
  banner and the header's dates went, see *Every other screen*, below); **Your
  numbers** (`h2.prog-sec`, then `#ceiling-row-wrap` and `#weight-row-wrap`, painted by `paintNumbers()` at boot and on
  every `goTo('plan')`, so a max saved mid-session or a new weigh-in shows; the Records count-up runs only while Progress
  is on screen); then **Game Plan** (`h2.prog-sec`) over the road of cycles (since 2026-10-13 one row per cycle: see
  *Every other screen in the Centre Court look*, below). Records' ← (`ceilingBack()`, after its own steps and `_ceilReturn`) and
  Body weight's ← go to Progress.
- **The This cycle card** has no "Your wins show here" line any more: with no wins it ends after its two bars. With no
  dates, or before the cycle, nothing is painted (the old `.home-cyc` line is gone).
- **Home, top to bottom** (`renderHome()`): the greeting as one compact block (the time of day as the eyebrow, the name
  at 28 px); the offline line and the filed-day card; This Week (the week note in its week, else the heading and the
  count); **Next up**; the rest of the week; the week-done extra; **Career** (the level, once Career Mode's XP switch is on:
  *Career on Home, and what a session earns*, below); **Hold Serve** (Career Mode's weeks held in a row, since 2026-10-17:
  *Hold Serve on Home*, below); **Daily habits** and AA Proof's strip. Nothing else.
- **Next up** (`dayCardHTML(…, { hero: true })`): the suggested day (`suggestedDayId()`: a session under way first, else
  the day after the last one trained this cycle, the first from there not done this week (`lastTrainedDayId()`; Line Call,
  2026-10-13, Amir's decision 3 "rotate": the first day not done this week made two-session weeks repeat Days 1 and 2 for ever,
  `scripts/headless/next-up.js`), never between cycles; `markSuggestedDay()` asks the same function, so the marked day
  and the big card are always one day) as the day's own cover: the photo graded into green, *● NEXT UP · DAY 2* (or
  *IN PROGRESS · DAY 2*), the name in capitals, *N blocks · M movements*, the quality tiles, and one green button,
  `.dc-go`: **Open Day 2 ▶**, or, for a day under way, *N of M sets* with the ticking clock (`.dc-clock`) and **Resume ▶**.
  It is the only Home element with `data-dc`. It has no fixed height, so its title is never cut off (the old 5:2 card with a
  height cap cut "DAY 1" when the line under it wrapped). Resume is green now; it was the only clay-filled button.
- **The rest of the week** (`dayCardHTML()` with no options, inside `.dc-list`): one row on the paper per day, in day
  order, `.dc-row` with `data-dl` (never `data-dc`): the day's number as the P24 outlined numeral (`.dc-num`), solid green
  once done this week, the name, *N blocks · M movements* or *Done this week*, and a grey › or a green **Done**. Enter and
  Space open a row or the Next up card (a document keydown listener; there was none for the old cards).
- **The door rows** (`.hrow`, Centre Court's *Your history* recipe): white, rounded 12, a 22 px green line icon
  (`hrowIc()`), **the door's name** (below), the value in ink, the sparkline (`ncSpark()` draws
  in `currentColor` now), a grey ›. **One look with or without data** (`.quiet` changes only the words; the dark green
  fill and the dashed empty row are gone). The habits verdict *N to go* stays clay; *On target* and *Perfect* are green.
- **The door's name** (`.hrow-l`, Number First, Amir 2026-10-19: *"the mono door labels"*; the board is
  claude.ai/artifact/P8LrDcyxi6ExRbupUvt8sf, direction B). It was 11 px Space Mono 700, tracked and in capitals, on all 51
  doors: the name of the place you are going, set as the smallest and least readable thing in the row, wrapping to two lines
  at 320, and declared **six times** over. **The rule is now: the loudest thing in a door is whatever that door is for.**
  - **A door that carries a FIGURE** keeps the figure as the headline and its name is a quiet green label (Barlow 600,
    `--fs-small`, `--green-ink`). Exactly five rows: Personal records, Body weight, Daily habits, Hold Serve, Career.
  - **Every other door** makes the NAME the headline, in the cycle card's fold-row recipe (`.road-ul`: Barlow 600,
    `--fs-field`, ink, sentence case) — *Why your plan looks like this*, *Cycle 2 complete*, *How the app works*, *Tell the crew*.
  - **A prose second line belongs in `.hrow-q`** (15 px grey), never in `.hrow-v`, the figure's slot, which renders at 18 px
    bold and there outshouts the name above it. Two rows read that way until 2026-10-19 and were the odd ones out: *Tested a
    lift?* over a louder *+ Log a max* (a question titling the action) and *Using the app* over a louder *How the app works*
    (the same thing twice). Each is now named after what it opens, with the prompt on the quiet line — **Log a max** (*Tested
    one in the gym? Add it here.*) and **How the app works** (*Start here if anything is unclear.*), the second matching the
    Account page's row to that same sheet. The article reader's embedded session is the last prose row left in `.hrow-v`.
  - ⚠️ The test is **`.hrow-vv`**, the span holding the figure itself — never `.hrow-v`, which can also hold
    prose (a session's name). ⚠️ The polarity is deliberate: the **headline is the default** and
    the quiet label is the `:has()` branch, so a browser without `:has()` (iOS 15.0–15.3) shows every name loud instead of
    whispering the one row this was for. **It is ONE rule over all seven scopes** (`#home-overview`, `#screen-plan`,
    `#screen-ceiling`, `#screen-notes`, `#hist-overlay`, `#ar-body`, `#day-view .complete-crew`); the other blocks keep only
    their `.hrow-b`. Two rows keep a rule of their own: **New from Amir** (no figure, but a 16 px headline would triple the
    clay on Home, DS-01, so it stays small and clay) and the road's Because door, whose second line is 13 px to match the fold
    rows it sits under. The `@media (max-width: 359px)` sparkline cut is gone with the tracked caps that caused it.
    Guarded by `scripts/headless/home-progress.js` §5c, which also reads program.html and fails a seventh copy.
- **Between cycles** (`betweenCyclesHTML()`): one door row first, **Cycle 2 complete** (or **Roadmap complete**),
  *Finished Oct 8 · see it on Progress*, which opens Progress, where the card says Cycle complete. Everything after it is
  unchanged.
- **The account button** (`.global-account`) is `position: absolute`, not fixed: it sits at the top right of each screen
  and scrolls away with it, so it never covers content (it sat over the cycle card's ›, the week note's count, Library
  rows and Records text). `<body>` is not positioned, so the page is its containing block.
- **The guide**: *Getting around* lists Home · Progress · Library · Coach and says what each holds; *How your program is
  structured*, *What each day builds*, *Personal Records* and *The ⓘ* say Progress where they said Game Plan or Home.
- Checked by `scripts/headless/home-progress.js` (116 checks: the tab order, Progress's order, Home's single
  `data-dc`, the title never clipped at 320, 375 and 390, the green button, Enter and Space, the door rows equal with
  and without data, the account button over no text on 11 screens and off screen once scrolled, one left edge, no
  sideways scroll in both themes, Records' and Body weight's ← and Back, Records from an exercise still returning to it),
  with `smoke.js` and `cycle-end.js` updated.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
