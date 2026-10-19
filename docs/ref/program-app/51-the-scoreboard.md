## 🧮 The Scoreboard: Progress cut to one screen (2026-10-19)

Amir, looking at the Progress tab: *"the 2nd tab looks very bad, and needs new design · some information is
written twice · it doesnt look very premium · some is not understandable"*, then *"first fix the bugs / then we
want to go with scoreboard"*. The audit is **The Long Rally**
(https://claude.ai/artifact/6S6XXvB8bjU698AMpSTy7U): the tab measured **3,408 px** at 390 px wide — four phone
screens — and **46%** of it was the career layer (the card 463 px, Four Courts 386 px, Your moments 716 px),
against 12% for the cycle cover and the two number rows, with the Game Plan last at 2,617 px. Direction A of
three, **The Scoreboard**, is what shipped; B (*Three Chapters*) and C (*The Switch*, Cycle · You · Body panes)
stay on the board as the parts bin.

**The rule the tab is built on now: a block that grows with the athlete is a page, not a section.** The tab is
the state of play; anything that is a list is behind a door.

- **Progress, top to bottom** (`renderPlan()`, `paintNumbers()`): the header; the **This cycle** cover; **Your
  numbers** (`h2.prog-sec`) over the career's card and the month's goal; then **five door rows**, the
  training's own first — Personal records · Body weight · Daily habits · Achievements · Your moments; then
  **Game Plan** over the road. Two section titles, where there were six. **2,176 px** with the current cycle's
  row open as it always is (PLAN-01), against 3,408.
- **The cover carries Amir's first sentence** (`paintCycleCard()`, `.cyc-note`): his words in italic, clamped
  to two lines, with **Read it** under them in mint. `openCycleNote()` opens the road's Now row if the athlete
  folded it and scrolls there. Amir picked this (direction B of that card's three) over moving the whole note
  up: *"1.B"*. The teaser is the same sentence the road's Now row leads with, by design — it is a preview with
  a way to the rest, and the cycle's meaning was 2,600 px below the cover until now.
- **The card is the four numbers, and the level whispers** (`careerCardHTML()`): the 2 × 2 of figures, then
  `Level 11` and its bar as the card's foot (`.cs-foot`, `.cs-lw`). Gone from the athlete's view: the **XP
  figure** (*"1,310 XP to level 12"* — no athlete knows what an XP is, and it was the first thing the section
  said), each cell's **next mark and its own bar** (five bars in one card; the nearest mark is still on Home's
  Career row and on the finish card, where there is room to say what it means) and **best 7** on weeks held (a
  mark above the best run read as an error). **No number on the server moved**: this is display only, so the
  forward-only rule (GAME-D20) is untouched.
- **Three new pages, one grammar** (the `.ceil-head` cover, ← back to Progress, the Progress tab stays lit):
  - **Your moments** (`#screen-moments`, `renderMoments()` → `momentsHTML()`): every moment, newest first,
    **grouped by month** with the month's count at the right (`.mom-month`). On the tab they were a flat list
    of six with *Show all N*, where four honours of one month read as four near-identical cards in a row.
    `momShowAll()` and `_momAll` are gone with it; `shareMoment(i)` still takes the index into the flat list,
    so the rows carry it.
  - **Achievements** (`#screen-achievements`, `renderAchievements()` → `courtsHTML()`): Next up, then the four
    kinds as tiles, each opening its kind in the shared sheet (`openCourt()`, unchanged).
  - **Daily habits** (`#screen-habits`): the two figures and the last seven days moved here, above the list of
    what you track (`habFigsHtml()`, painted by `renderHabitList()`).
- **The doors** (`courtsDoorHTML()`, `momentsDoorHTML()`, `habDoorHtml()`): each is the figure-door recipe —
  the figure as the headline, the name as the quiet green label (*Home and Progress in the Centre Court look*
  → **The door's name**). Achievements says *3 of 8* with what is closest under it (*Straight Talk · 2 more
  check-ins before a session.*), so the one forward-looking thing stays on the tab; Your moments says the count
  with the newest moment, and a line from Amir shows **his words**, never the list's title *From Amir*; Daily
  habits says *8 days · this month · 2 days in a row*.
- **A line from Amir opens the page, not the tab** (`openNote()`): Home's *New from Amir* used to open Progress
  scrolled to the list. It opens `#screen-moments` on that line now, so the same sentence is never read twice
  on the way to itself.
- **Without the career** (offline with no copy, the demo, the coach's preview) there is no card and neither
  career door; Records, Body weight and the habits stand on their own under Your numbers. Without
  `get_achievements()` (a server without stage80) there is no Achievements door and no page.
- **The CSS moved by scope, not by copy**: the `.cs-*`, `.mo-*` and `.ac-*` rules are
  `:where(#screen-plan, #screen-moments, #screen-achievements)`, and the habit figures
  `:where(#screen-plan, #screen-habits)`, so every block wears exactly the face it wore on the tab. The two new
  screens join the `.ceil-head` and `.nav-back` selectors that Records, Body weight and the habits list share.
- **Tests**: `scripts/headless/career.js` (the card's new shape, the two doors, both pages, their ← and the lit
  tab), `home-progress.js` (two titles, the five doors in order), `habits-list.js` (the door on the tab, the
  figures and the table on the page), with `progress-road.js`, `records-weight.js`, `highlight-reel.js`,
  `first-timer.js`, `a11y-names.js` and `smoke.js` unchanged and green.

**The four bugs the audit found first** (shipped before this, sw `aap-v201`): the Why door said *1 reasons*;
the road's current row said NOW twice (the mono line and the green pill — the line keeps the weeks, the pill
keeps the word and is no longer `aria-hidden`); the Records row shouted *▲ 12 KG* with no period (it reads
*▲ 12 kg since you started* now, the words the Records page itself uses); and *Amir's Pick* drew as a name over
an empty card (*Amir picked you that month.*).

**Still open from the audit**: the one chart Progress does not have — a main lift's best set across the cycles —
and the first-two-weeks version of the screen, which is at its emptiest exactly when the athlete is newest.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
