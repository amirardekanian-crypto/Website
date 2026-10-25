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

## The five the audit left open, built the next day (2026-10-20)

Amir, on the board rebuilt as what-is-left: *"build all of them"*, with one correction — *"for the goal of the
month, i built something to give one person or the whole squad a goal they have to do. not their cycle outcome"*.
The tab is 2,534 px now, and carries five section titles, each naming a different subject: Your numbers ·
Getting stronger · Your body · What you've earned · Game Plan.

- **The verdict** (`paintCycleCard()`): the heading over the wins is a sentence that answers the question the tab
  is named after — **N lifts up this cycle** (singular at one) — instead of the label *Wins this cycle*. It counts
  what the rows under it prove, so nothing is said twice, and with no wins yet there is still nothing there.
- **The month's goal is a job, not a statistic** (`goalCardHTML()`, `#goal-wrap`): his line has its own card under
  the cover, above Your numbers, with the month and **from Amir** in clay (DS-01 — it asks for something), his
  words in ink and a ring that fills green when he ticks it off in Courtside. It sat inside the numbers card,
  between the four figures and the doors, where it read as one more number. It is one line per athlete per month
  (`career_goals`, `coach_set_goal()`), so a goal he sets for the whole squad is that line on each of them.
- **Getting stronger** (`trendCardHTML()`, `#trend-wrap`): the one thing on this tab that shows a change over
  time. The best lift's estimates, one point per reading, the gain beside its name and the period under it — the
  SAME lift the Records row headlines and the SAME series its sparkline draws (`ceilingBest()`, `ceilingSeries()`),
  so the two can never tell different stories, and a tap opens that lift's own page. Under three readings there is
  no card and no title: the sparkline says it better.
- **Your body** (`#body-card`): Personal records, Body weight and Daily habits are three rows of ONE card, divided
  by hairlines. They are one subject, and three separate doors for it was the audit's *three box grids on one
  screen*. The rows keep their own doors and their quiet empty states; the card carries the edge, the corners and
  the background, so dark mode moves once.
- **One Share door** (`openShareMoments()`): Your moments had a Share button on every row — in the quietest list in
  the app, the buttons were the loudest thing on it. One door above the list opens the share sheet with every card
  that can be drawn, and the sheet's own picker chooses between them. `shareMoment()` went with the buttons.
- **Day one** (`paintDayOne()`): before the first finished session (`hasFinishedASession()`) Your numbers, the
  trend, Personal records and both earned doors are every zero in the app at once, so they wait. The tab is the
  cover, one line — *Nothing here yet. Your numbers, your records and your moments fill in as you train.* — what
  can be filled in today (body weight, the habits) and the plan.

**Checked by** `scripts/headless/home-progress.js` §10 (the trend: its figures, one point per reading, the tap, and
no card under three readings) and §11 (day one, and that it is only day one), `career.js` (the goal's own card in
clay, its done state in green, the order down the tab, the one Share door and the sheet it opens) and
`highlight-reel.js` §1 (the verdict's singular).

## Every achievement comes up full screen, and can tell the crew (2026-10-20)

Amir: *"The suggestion was like in a computer games when you have got an achievement. Something big on screen would come up.
I want something like that. It can be shared as well … And at the same time i want a line in the crew so everyone else can see."*

- **An achievement is never a band now.** `rwIsFull()` used to read the SIZE (`milestone`, `legend`): a win-sized one, like
  FIRST BLOOD, was a line on the finished card and nothing more. An achievement now takes only the FRESHNESS half of the
  server's `full` (`rwFresh()`, the moments setting's `keep_days`, 14) and ignores the size, so every one of them opens the
  moment: the hero, the name at display size, its caption, the drawn card, Amir's signature and **Share it**. ⚠️ **A mark's
  tier keeps the size rule** — those repeat, and four numbers bursting every few weeks is noise.
- **One moment per open, still** (D7). Earn three at once and the biggest opens; the rest stay unseen and each gets its own
  moment on a later open. They are in **Your moments** the whole time, so nothing is lost, and nothing is told or marked seen
  that was not drawn (GAME-14).
- **The words fit what it cost**: *This one is rare. Well done.* (legend) · *That took weeks. It stays yours.* (milestone) ·
  *That one is on the board now. It stays yours.* (the rest). A small win never claims it took weeks.
- **Tell the crew**, under Share it: one tap puts ONE line on the Bell in the athlete's own voice — *"Just won First Blood.
  Your first session on the board."* — as a plain `crew_post` (`crewTellMoment()`), then the button says **The crew knows ✓**
  and stops being a button. ⚠️ **Nothing reaches the crew before the tap**, and the button is built hidden and shown by
  `paintCrewTell()` once the Bell answers, because the moment is usually on screen before the crew's answer lands. No Bell,
  no answer yet, read-only, the demo or the coach's preview: no button.
- **Tests**: `career.js` (a win-sized achievement opens the moment with its own words; the line it would post; nothing posted
  before the tap; the line on the Bell after it; no crew, no button; and the finished card's five rewards, where the
  achievement opens the moment and the two marks stay bands).

## An achievement says what to do, then how far along (2026-10-20)

Amir, on BEDROCK: *"what the fuck is bedrock 2of 3 goals done? what are my goals?"* — a fair question. The row showed the
rule only while nothing was done and swapped it for *2 of 3 goals done* the moment one goal was met: the score of a game
whose instructions had just been taken away.

- **`achSub()` is the rule first, the count second**, on every row that is not won yet: *3 protein meals, 7 days in a row ·
  6 of 7* · *24 days on target · 250,000 steps · Protein on 24 days · 2 of 3 done*. Nothing done yet shows the rule alone.
  The *From your habits* door names what is closest and says what it ASKS (the rule), not a bare count.
- **Ten plain achievements** (rulebook version 9, 2026-10-20, Amir: *"in proof i had achievement like finish your drinking
  habit 5 days in a row … you would understand what each means and what you need to do to get them"*). The habit
  achievements that survived the cut are all `goals` ones — three month-long conditions at once — so these are the other
  kind: ONE thing, ONE number, and the number in the name. Full Tank · Lights Out · Well Fed · On Your Feet (a week each of
  water, sleep, protein, steps) · A Complete Day · Ten Complete Days · Seven Days Running · Thirty Days Running · Quarter of
  a Million · A Million Steps. The last two are the habits' first entries in the **Progress** court, which had none.
- **Two of them needed a name for a number the server already kept** (`supabase/stage93_plain_achievements.sql`):
  `career_measures()` has always counted `daystreak` and `sum:<habit>`, but `career_proof_key()` could not name either, so no
  catalogue entry could ask for them. `dayStreak` names the first; `total:<habit>` already worked and only the catalogue
  checker refused it.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*

## Your numbers, one card (2026-10-25)

Amir: *"if you look at the progress tab, we have achievements and your moments, which is basically the same thing, remove your moments, and bring achievements higher in your number / make the share your card much smaller"*; he picked A of three (https://claude.ai/artifact/XQoYoaLQasw3hRLHeyZNoG): *"wow A is gorgeous"*. `careerCardHTML()` ends with `csAchRowHTML()` (the three newest won emblems, *N of M*, *N new* in clay, a tap opens the cabinet); the big *Share your card* button became `.cs-share-sm` *Share ↗* inside `#numbers-title`; `paintCareerCard()` draws neither door and *What you've earned* stays hidden. Your moments keeps its screen in the code but has no door: Amir's short lines (`MOM_T.my.notes`) are rows on the Coach tab under Notes from Amir (`renderNotes()`, `.cn-line`), and Home's *New from Amir* opens them there (`openNote()`). *From your habits* opens the cabinet on its Habits shelf (`openCabShelf('Habits')`). Open: the month's honours have no shareable home until Amir says whether they become trophies in the cabinet.
