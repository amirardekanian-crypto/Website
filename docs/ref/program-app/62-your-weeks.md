## 🗓️ Your weeks (round 11, 2026-11-21): the cycle's weeks as a grid of days, on Progress and in coach.html

Amir, building a coach view of Library sessions: *"how would i find out if some one did this?"*, then *"my aim is to have a activity tracker
for people so they can see what kind of activity they had over the past month or 5 weeks"*, and to round 11's page
(https://claude.ai/artifact/7yRMTQJAmuJjkLmwZ7PQo2): *"Go with your picks"*. Built: **#122 Five Weeks** (this card) and **#124 The Mirror**
(the same grid in coach.html, and the Library tab's Done lately). Next: **#123 Court Log** (tennis, padel and other activity, a third kind
here, one new table) and **#125 Load Read** (court hours into `/program-design` and `/cycle-report`). Ideas bank: `.claude/skills/ideas/BANK.md`
→ Round 11.

### What it does

- **On Progress, under the This cycle cover and the month's goal, above Your numbers**: the section title **Your weeks** (`#fw-title`) and
  one card (`#fw-wrap`, `fiveWeeksHTML()`, painted by `paintFiveWeeks()` from `paintNumbers()`). The title is *Your weeks*, not *Five weeks*:
  a cycle runs 4 to 6 weeks and the card draws all of them.
- **The grid is the cycle's weeks**, one row each (`W1`…), seven squares a row, the columns headed by the weekday the cycle's weeks start on
  (the weeks of `career_weeks()`, the same as the Player Page's Cycle Bars, so a held week is a full row and the two screens never disagree).
- **A square per day**: a plan session `--fill` (`.is-p`), a Library session `--mint` (`.is-l`), both split corner to corner (`.is-pl`); an
  empty past day the ghost, a day to come an outline (`.is-fut`), today ringed (`.is-now`). Two or more sessions on a day show the count.
  Progress is single-accent, so the kinds are two greens and never clay.
- **The foot**: the plan sessions, the Library sessions and the minutes trained, each with its swatch; then *Tap a day to see what you did.*
- **A day with something in it is a button**: `openFiveWeeksDay(day)` lists it in the shared sheet (`#hist-overlay`, the Player Page's week
  sheet): the title, *Plan session · N min* or *<Shelf> · Library · N min*, and **Extra** on a plan day done again or outside the plan.
- **No card** when nothing is done yet this cycle (Day one and the plan say it better), in the demo, in the coach's preview, and from a
  server without stage115.

### The data

`get_five_weeks(p_athlete_id)` (`supabase/stage115_five_weeks.sql`) returns `{ n, from, to, current, weeks: [{ w, from, to, plan, done,
held, now, days: [{ day, k: 'plan'|'library', title, mins?, shelf?, extra? }] }] }`. It reads `career_facts` (`session_finished`,
`session_finished_early`, `library_session`, not voided) exactly as `crew_page()` reads them for your own page, the plan day's title from the
programme and a Library session's title and shelf from `library_sessions`. Between cycles it returns the last cycle. Only the athlete
(`current_athlete_id()`) and the coach (`is_coach()`) can read it.

The phone keeps the last answer as `<id>_fwcache` (never synced: `_snapshot()` skips it). `loadFiveWeeks()` runs at the start of every
`loadHistory()` and after a Library session is marked done (`markLibraryDone()`); `fwFromCache()` reads the copy when nothing better is in
hand, because an offline boot never reaches `loadHistory()`.

### coach.html (#124 The Mirror)

- **The work**: a **Five weeks** panel under the metric strip (`fiveWeeksPanelC()`), the same grid from the same reader (`fiveWeeksC()`,
  read once per athlete per store, beside `ensureSessionsFull()`); hover a day for its sessions.
- **Library**: **Done lately**, every Library session marked done in the last 30 days (name links to the file, date, minutes), and on each
  workout row *done N times by M · last <date>*. From `library_sessions` (`selectAll()`, `S.libDone`); a failed read is the banner's
  *the Library sessions athletes marked done*, never an empty list.

### The traps

- **Private.** A Library title can hint at pain (First Light is a back session; `crew_page()` keeps titles off other people's pages for
  this reason). Nothing from this card goes to the crew, the Bell or a share card. The crew keeps seeing counts on the Player Page.
- **The weeks are the server's.** Never rebuild them on the phone from Monday-to-Sunday: a calendar week can split a held week.
- **No XP.** The card shows what was done; it pays nothing. Court Log (#123) will not pay either at first (Amir's pick).
- **Tests**: `scripts/headless/five-weeks.js` (25 checks: the squares, the foot, the sheet, Extra, the copy, never synced, no card with nothing
  done, without stage115, the demo, 320 px in dark mode). The stub answers `get_five_weeks` from `fiveWeeks`.
