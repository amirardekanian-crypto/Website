## 🗓️ Your weeks (round 11, 2026-11-21): the cycle's weeks as a grid of days, on Progress and in coach.html, and Court Log

Amir, building a coach view of Library sessions: *"how would i find out if some one did this?"*, then *"my aim is to have a activity tracker
for people so they can see what kind of activity they had over the past month or 5 weeks"*, and to round 11's page
(https://claude.ai/artifact/7yRMTQJAmuJjkLmwZ7PQo2): *"Go with your picks"*. Built: **#122 Five Weeks** (this card) and **#124 The Mirror**
(the same grid in coach.html, and the Library tab's Done lately), then **#123 Court Log** the same day (Amir: *"Build Court Log"*, below).
Next: **#125 Load Read** (court hours into `/program-design` and `/cycle-report`). Ideas bank: `.claude/skills/ideas/BANK.md` → Round 11.

### What it does

- **On Progress, under the This cycle cover and the month's goal, above Your numbers**: the section title **Your weeks** (`#fw-title`) and
  one card (`#fw-wrap`, `fiveWeeksHTML()`, painted by `paintFiveWeeks()` from `paintNumbers()`). The title is *Your weeks*, not *Five weeks*:
  a cycle runs 4 to 6 weeks and the card draws all of them.
- **The grid is the cycle's weeks**, one row each (`W1`…), seven squares a row, the columns headed by the weekday the cycle's weeks start on
  (the weeks of `career_weeks()`, the same as the Player Page's Cycle Bars, so a held week is a full row and the two screens never disagree).
- **A held week is a tick** (Amir, 2026-11-21: *"A, the tick"*, of three looks: the tick, a frame, a band): the week's label becomes the
  app's done circle, solid green with a white tick (`.fw-wl.is-held`, said *Week N, held*), from the server's `week_held` fact, the same one
  the Player Page's bars read. The foot starts with *N weeks held*. coach.html draws the same circle.
- **A square per day**: a plan session `--fill` (`.is-p`), a Library session `--mint` (`.is-l`), both split corner to corner (`.is-pl`); an
  empty past day the ghost, a day to come an outline (`.is-fut`), today ringed (`.is-now`). Two or more sessions on a day show the count.
  Progress is single-accent, so the kinds are two greens and never clay.
- **The foot**: the plan sessions, the Library sessions and the minutes trained, each with its swatch; then *Tap a day to see what you did.*
- **A day with something in it is a button**: `openFiveWeeksDay(day)` lists it in the shared sheet (`#hist-overlay`, the Player Page's week
  sheet): the title, *Plan session · N min* or *<Shelf> · Library · N min*, and **Extra** on a plan day done again or outside the plan.
- **No card** in the demo, in the coach's preview, and from a server without stage115. With nothing done yet this cycle the card stays
  (since Court Log): an empty grid, *Your sessions show here as you train. Add your tennis, padel or anything else you do.* and the button.

### The data

`get_five_weeks(p_athlete_id)` (`supabase/stage115_five_weeks.sql`) returns `{ n, from, to, current, weeks: [{ w, from, to, plan, done,
held, now, days: [{ day, k: 'plan'|'library', title, mins?, shelf?, extra? }] }] }`. It reads `career_facts` (`session_finished`,
`session_finished_early`, `library_session`, not voided) exactly as `crew_page()` reads them for your own page, the plan day's title from the
programme and a Library session's title and shelf from `library_sessions`. Only the athlete (`current_athlete_id()`) and the coach
(`is_coach()`) can read it.

**Outside a cycle** (stage122, 2026-11-22; Amir: *"yes and even after / because people may not renew program, but want to use the
tracker"*): a cycle's weeks only while today is inside them (`career_weeks()` calls the programme's `currentCycleIndex` current for ever,
also a cycle that starts next week or ended months ago). Before it starts, between cycles and after the last one, the 5 weeks ending with
this one, on the weekday the athlete's weeks start on, so a week that is also a cycle's keeps its plan count and its held tick; `n` is null
(no *Cycle N* in the head) and a plan session there is never *Extra*. The answer also carries **`acts`**, every Court Log row of the last
70 days (from stage121's first day) whatever the weeks, `{ day, kind, mins, effort, id }`: the phone works the Steps credit from it
(`moveActs()` → `moveCreditMap()`) and *Played today?* its last activity (`actLast()`), so Steps on the phone is the server's number in or
out of a cycle. Before stage122 the credit came from the weeks' rows, and an activity outside the cycle's weeks counted on the server
and not on the phone.

The phone keeps the last answer as `<id>_fwcache` (never synced: `_snapshot()` skips it). `loadFiveWeeks()` runs at the start of every
`loadHistory()` and after a Library session is marked done (`markLibraryDone()`); `fwFromCache()` reads the copy when nothing better is in
hand, because an offline boot never reaches `loadHistory()`.

### Court Log (#123, stage116, 2026-11-21)

- **+ Add activity** at the foot of the card (`.fw-add`) opens a sheet in `#hist-overlay` (`openActivitySheet()`, `paintActivitySheet()`):
  **What** (Tennis, Padel, Match, Run, Other), **When** (Today, Yesterday and the two days before), **Minutes** (a box, 5 to 600, and 30 · 60 ·
  90 · 120), **How hard** (Easy, Normal, Hard). It opens on tennis, today, 60, normal. **Save** (`saveActivity()`) checks the minutes on the
  phone, calls `log_activity()` with a draft key (`crewNewKey()`, one per sheet, so a retry writes once), closes, says *Added to your weeks.*,
  draws the square at once and reads the grid again. A refusal is said in plain words in the sheet (a full day, a day too old, no signal).
  Like a Library Done it is not queued for later.
- **Two new kinds on the grid**: court time (tennis, padel, a match; `k: 'court'`) in **ink**, anything else (`k: 'other'`) in the warm
  grey. Never steel (it means an RPE under target) and never clay (Progress is single-accent). A day with two kinds is split by the first
  two in the order plan · Library · court · other (`.is-mix` with `.fa-*` / `.fb-*`; plan and Library keep `.is-pl`). The foot adds
  *Xh on court* and *Xm other*.
- **A logged activity's row** in a day's sheet says its minutes and effort and carries **Delete**, two taps (`armedTap()`, LOG-02), then
  `delete_activity()`.
- **The server** (`supabase/stage116_court_log.sql`): `activity_log` (id from the phone, athlete_id, day, kind, minutes, effort,
  created_at), coach-only by RLS; athletes write through `log_activity()` and `delete_activity()`, which check the athlete, a day from 3 days
  ago to tomorrow (a phone ahead of the server's UTC day), 5 to 600 minutes and at most 8 a day. `get_five_weeks()` returns the rows as
  `{ day, k, kind, title, mins, effort, id }`; they never count in a week's `done`. In `BACKUP_TABLES`, the snapshot and `coach_erase_person()`.
  **No XP** (Amir's pick: self-logged minutes are easy to inflate).

### Every activity to the crew (stage126, 2026-11-23)

Amir: *"every activity needs to be sent to crew, unless they turn it off in their settings. but after adding something, you can add images
to it or write with it. every activity, should have an icon. all the racket sports should have the same one but running and cycling and
swimming should have their own. remove gym from activity ... remove walking as well, its part of their walking steps"*.

- **Posted as it is saved.** `log_activity()` calls `activity_tell()`: an athlete saving their own activity, in the crew, allowed to post,
  with **Your activity** on in What the crew sees, gets a plain crew post carrying `{ act, mins }` (stage124's activity post), keyed by the
  activity's id (`crew_posts.client_key`). Never how hard it was. The answer says `told`; a post that cannot be written (10 a day) leaves the
  activity saved and `told: false`. `get_five_weeks()`'s `acts` say `told` too. Deleting the activity deletes its post.
- **The switch is on unless turned off** (`crew_me()`, `crew_page()`; `CREW_KINDS_OFF` is empty). stage118 had it off until chosen; an
  athlete who set it off keeps it off. The same switch shows the last 7 days on their Player Page.
- **The saved message**: *Added. The crew sees it.* with **Add a photo**; one not told keeps #131's *Tell the crew*. In a day's sheet the
  row's button is **Add a photo** once told, **Tell the crew** before. Tell the crew now posts with the activity's id as its key, so either
  way the post is the activity's own.
- **Add a photo** opens the crew composer on the activity in edit mode (`openCrewPost('activity', null, { act, key, edit })`): eyebrow *On
  the crew*, **Save** (off until there is a line or a photo), and `crewSendEdit()` calls `activity_post_edit(p_activity, p_body, p_photo,
  p_w, p_h)`: a new line takes the place of the old one (none sent keeps it), a photo is added or takes the place of the one there (one per
  post), within the 3 photos a day. An edit is not a new post, so the 10 a day never stops it.
- **The kinds**: Gym is off the list (a gym session is already a plan or Library session) and there is no Walking (it is in their Steps).
  The server still takes `gym` (`activity_kinds()`, `activity_met()`, `MOVE_MET`: old rows still score and `check_twins.js` still agrees),
  and `ACT_LABEL` still names an old gym row.
- **An icon per kind** (`actIcon()`): one racket (`court`, in clay) for every racket sport, the runner (`running`), the bike (`cycling`), the
  swimmer (`swim`), the pulse line for football and other, the dumbbell for an old gym row and a plan session.
- **Tests**: `scripts/headless/activity-crew.js` (16 checks); the stub answers `told` with `actTold` and `activity_post_edit`.

### In Farsi (2026-11-21, Amir: *"does everything works in farsi version?"*)

Checked on a Farsi phone (`aa_lang = fa`): every word on the card, the sheet and a day's list is Farsi (`scripts/i18n/fa/24-five-weeks.json`,
formal شما), the grid runs right to left, the weekday heads are one letter, the dates Shamsi. Three fixes that day: *2h 45m* reads
*۲ ساعت و ۴۵ دقیقه* (a pattern), the run chip says **Running** (in Farsi *Run* is the order بدو; Running is دویدن) and a logged
activity's row takes the app's own word for its kind (`fwTitle()`), and `get_five_weeks()` returns a plan day's `title_fa` when the
programme day has one (stage117). Today no programme day carries one: a day's name (its `focusTag`) stays English, like a cycle's name
and an exercise's, so *Legs* in a Farsi day sheet is by design. Since 2026-11-22 (Amir: *"the name of the training Days and the
name of the Cycles should be only in english like exercise names"*) `fwTitle()` no longer reads `title_fa` at all.

### coach.html (#124 The Mirror)

- **The work**: a **Five weeks** panel under the metric strip (`fiveWeeksPanelC()`), the same grid from the same reader (`fiveWeeksC()`,
  read once per athlete per store, beside `ensureSessionsFull()`), court time in ink and other in grey, the court hours in its head; hover a
  day for its sessions (a logged one says *logged* and its effort).
- **Library**: **Done lately**, every Library session marked done in the last 30 days (name links to the file, date, minutes), and on each
  workout row *done N times by M · last <date>*. From `library_sessions` (`selectAll()`, `S.libDone`); a failed read is the banner's
  *the Library sessions athletes marked done*, never an empty list.

### The traps

- **Private.** A Library title can hint at pain (First Light is a back session; `crew_page()` keeps titles off other people's pages for
  this reason). Nothing from this card goes to the crew, the Bell or a share card. The crew keeps seeing counts on the Player Page.
- **The weeks are the server's.** Never rebuild them on the phone from Monday-to-Sunday: a calendar week can split a held week.
- **No XP.** The card shows what was done; it pays nothing. Court Log (#123) will not pay either at first (Amir's pick).
- **Tests**: `scripts/headless/five-weeks.js` (38 checks; Court Log's sheet, save, split squares, the two refusals and Delete among them; the squares, the foot, the sheet, Extra, the copy, never synced, no card with nothing
  done, without stage115, the demo, 320 px in dark mode). The stub answers `get_five_weeks` from `fiveWeeks`.
