### 01 · TODAY — the daily loop
The screen they actually live on. **In this order, and the order is the point:**

> **A logbook, not a dashboard (2026-10-12, the UX audit's batch B; the audit is the private page
> https://claude.ai/artifact/NcodiruuPzbdiwZ13FQMsM).** Everything on Today must be logged or must say
> whether today counts. The card carries the game on **one line** (the level ring at 46 px with no
> LEVEL caption, the rank, XP to next, the day-streak flame as a small tile), the bar, the verdict and
> the week, then **one line that says what to do now: the nudge**, typed, with no button (its button
> opened the habit's history page, not a way to log it). That line is the one "what now" slot: clay
> with *Streak at risk · N to go before midnight* when the streak is at risk (the separate strip went),
> and the *Filling in* bar on an earlier day (the separate banner went, the card gets a clay ring). The
> card went from about 360 px to about 195, so five rows sit fully above the fold at 390 × 844 (it was
> about three). Under the list: the library offer, the board notice, **one quest line while a run is
> on** (`questLine()`, into Progress; Amir, "3 yes"), the tour prompt until it has run, and for a free
> athlete *Want the training too?*. **Gone from Today:** the dark nudge card, the roll call row (Crew
> keeps roll call; Amir, "2 demote", after 0 lines in 7 days), the week's heat map with "days on
> target" and XP (they are Progress's week table now) and a coached athlete's programme card.
> The numbered list below is the older account, kept for its reasons; where it disagrees, this note wins.

1. **The hero card** — a floating white card (Amir, 2026-08-01: *"i like the design of the
   hero that looks like a card"*) carrying, on one row: the **level ring**, the **rank**
   (a link into the Locker), **distance to the next level** and its bar, and the **streak
   tile** hard right.
   **Underneath, inside the same card, the verdict leads the week** (PRF-03, 2026-09-27):
   `verdictTile(AKEY())` answers the one question the day streak asks, *does this day count*:
   **"2 TO GO"** on the dark card, then **ON TARGET** or **PERFECT** with a tick in the accent
   (`--accent-fill` in dark, where white on the accent was 3.35:1). It replaced the day's
   **percentage**, which was `dayPct()`, what the day was *worth*: a rest day with everything
   else done read 68% and counted, and a free athlete could never pass about 64%. The ring
   round the initials in the header (`.hdmewrap`, `--avp`), which said the same percentage
   again, went with it. **Display only**: `dayQualifies()` decides, and neither
   scorer moved. The count is `dayToGo()`, exact: finishing a habit adds only what it still
   lacks (a half-done counter already counts half), either door counts (the gate's percentage,
   or one thing left undone), and the biggest lack goes first. The old count added each habit's whole
   weight on top of its partial credit, so at midday it said *1 to go* when 2 were needed. The
   at-risk bar (`shortOfQualifying()`), the nudge's *SAVE IT* habit (`lackOf()`), the strip's
   head on the training app's Home and that app's Daily habits row all read the same count and
   the same words (*2 to go*, *On target*, *Perfect*).
   **Beside it is the week, and the week is the day picker** (PRF-05, 2026-09-27) — `weekStrip()`:
   seven days, oldest on the left, **ticked when on target** (`dayQualifies()`, the verdict's own
   rule). A pale day was started but did not count, a grey one has nothing in it, a day before the
   athlete's first log is outlined and empty (not a miss), and today is outlined in the accent until
   it counts. **The last four, today and the `BACKFILL_DAYS` behind it, are buttons**: tap one and
   every tick lands on that day (`setDay()`), the day is ringed in ink and the screen turns clay. It
   replaced two drawings of the same week: bars shaded by `dayPct()` here, and four chips with a
   percentage each under the card (the day strip, item 3 until then). The first habit you can tick
   moved from 360 px to 261 px at 390 × 844 (it was 466 px at the audit, before PRF-01). Six days are captioned with a
   **narrow weekday letter** and the seventh reads **"Today"** in full (Amir, 2026-08-01): the one
   caption meant to be *read* rather than scanned, so it is bolder, at the letters' 11 px (it was
   10 px until A11Y-01), and may sit over its neighbours' spare room. A day you can pick reaches into the gaps and above and below, so its target
   is 36 × 58 px at 390 and 26 × 48 px at 320. **The card is a size smaller** with it: the level ring
   74 → 62 px, the streak tile tighter. **The rank's name is fitted** (`fitRankName()`): on a 320–360 px
   phone *CONTENDER* or *UNTOUCHABLE* ran under the streak tile; the name now steps down a pixel at a
   time, below 13 px the → goes and the crest drops a size (the name and the ring still open the Locker),
   11 px is the floor, and a name that still does not fit there loses the crest (only *UNTOUCHABLE* at 320 px).
   ⚠️ The block at the bottom of Today is no longer headed *"The last seven days"* — with
   the hero opening on a seven-day row, two headings naming the same span read as one
   section printed twice. It is **"Your week, habit by habit"**: the hero answers *did each
   day count*, that block answers *which habit is carrying me*. With the day picker on the
   card, the week is drawn twice on Today, not three times.
2. **The streak flame** — sits *on* the hero card, hard right of the rank block: a drawn flame
   (never an emoji — nothing here should change shape between an iPhone and a Pixel) and the
   day-streak number in clay, licking faster the longer the streak runs, on the same
   0/3/14/30-day heat scale the habit rows use (moved off 5/15/30 on 2026-08-02 so the
   flame steps up **on** a `DAY_STREAK_MARKS` day — the app was firing a full-screen
   takeover for the 3- and 7-day marks while the permanent indicator stayed at its
   coldest until day 5 and then did not move again until 15). Hidden until the first logged day —
   **and hidden on a zero** (Amir, 2026-07-30: *"if there is no streak its better not to
   show it, and only show it if there are streak days"*). It is the rule the habit rows
   have always followed: they draw an ember or nothing. An unlit flame over a `0` is not
   a fact worth the space, it is the hero opening on the one number the athlete has just
   lost, so it only ever appears `lit`. The count is not gone from the app — the stat
   grid on Progress still carries it with the best ever beside it.
   ⚠️ This briefly had a whole **band** to itself and Amir killed it (2026-07-30, *"i hate
   that … i asked you to show their streak … just bolder, flashier just something to catch
   the eye"*). The lesson is worth keeping: he asked for an existing number to be made
   **louder**, and a band is a *new field* — a whole strip of screen to state one integer,
   on the screen whose own layout note says anything added goes below the habit list. The
   flame costs no vertical space at all. Progress carries the same flame inside its stat
   grid, so the day streak is one of its four facts again.
3. ~~**The day strip**~~ — four chips (`THU · FRI · SAT · TODAY`) with a percentage each, until
   PRF-05 (2026-09-27) folded them into the week on the card (above). What they taught still holds
   there: **oldest on the left, today on the RIGHT** (Amir, 2026-08-01; it ran today-first, which put
   the day you are almost always logging at the far left), and `canLog()` owns the window
   (the chips' `editableDays()` was removed with the rest of the dead code on 2026-09-27).
4. **The habit list** — tap the **circle** to tick, tap the name for that habit's history, tap
   `+` on counter habits. A row's one badge slot, right of the name, shows its streak from 3 days
   (`BADGE_FROM`), or a new habit level for a moment.
   **On a counted habit the circle opens the log sheet** (Amir, 2026-10-12, the UX audit's 1A;
   `toggleHabit()`): with the target filled in when the day is short of it, otherwise at what is
   logged. A full day is still two taps (circle, Save) and any real number is three. Until then one
   tap wrote the full target and the next wrote **0**: 4,500 real steps became 10,000 (with the XP, and
   a level-up), then nothing, with no undo. **The sheet takes a typed number** (`#logval`, the phone's
   number pad; `foldDigits()` folds Persian and Arabic digits, as sign-in does), beside the stepper,
   *Hit the target*, a quick add on steps and water, and *Clear*, which takes two taps. In 30 days
   before this, not one of 45 step entries was off the 500 grid: nobody could enter a real count.
   The field is a live input, so the renderer never writes its value (`morphAttrs()`): a button that
   changes the number sets `UI._logSync` and `syncLogField()` writes it once after the render. The
   save is `saveSheetLog()` (⚠️ not `saveLog()`, which writes the log to the phone). In the strip on the
   training app's Home the same tap opens the strip's own number row under the habit (`embedEdit()`).
   **No level on the row at rest, and the help line only in the first week** (`dayNumber() <= 7`):
   a habit's level lives on Progress and its page; seven `LV n` chips and a "1-day streak" on most rows,
   in three different places, were noise beside the thing being ticked.
   **The circle is the tick** (PRF-01, 2026-09-27): the emoji sits in a 48 px circle ringed in the
   habit's colour, and a tap fills it with that colour and a white tick. It used to be a 22 px ring
   on the tile's corner while `+` was a 36 px solid grape button, so the main action was the quietest
   control on the row. `+` stays, 44 px, in the habit's own tint: athletes use both (since 15 Aug, 98
   of 109 logged sleep days were the full 7.5 h, a tick, while most water, protein and step days
   stopped part-way, the `+`). **The programme's session goes last**, as one slim line ("From your
   programme →"); it led the list, so the first habit you could tick started 466 px down.
   Only counter habits carry a meter; on a check-off habit it could only ever read 0% or
   100%, which was noise on half the list.
   **The meter is SEGMENTED, not a straight bar** (Amir, 2026-08-01: *"water and fuel
   which has numbers, should be looking like this. its not a straight bar"*). `segBar()`
   draws **one pip per `step`** — eight glasses is eight pips, three meals is three — so
   the meter counts the same unit the `+` button adds, which a continuous 0–100% bar
   could never say. Capped at 20 pips so 10,000 steps stays a meter rather than a comb
   (steps → 20, sleep → 15), with the leading partial pip dimmed so part-way progress is
   still visible at any cap. The status line gained the other half of the same fact: a
   counter habit you have not finished reads `5 of 8 glasses · 3 to go` — the position
   *and* the job.
5. **The nudge** — one dark card (clay when a streak is at risk) whose copy reacts to what is actually missing, drawn at
   random from a library of **88 lines across 15 situations** (`NUDGES`, counted 2026-09-27; its
   20-line `prompt` bucket is roll call's): one bucket per habit the athlete can tick (the session
   has none: it is `locked`, below), one shared `custom` bucket for habits the athlete added (their
   ids are made up when added, so they have no bucket of their own; until 2026-09-26 they fell
   through to nothing-logged-yet and a day with six things done opened with "Nothing logged yet"),
   plus nothing-logged-yet, one-habit-left, only-the-session-left (`sessionLeft`, `freeDone`),
   all-done, streak-at-risk and streak-rolling. The pick is seeded on the date, so it is **stable all day and rotates
   tomorrow** — over 21 days a bucket of 10 uses all 10 lines with no back-to-back
   repeats. Its button opens the habit in question. The "nudge" half of *nudge and recap*.
   **The session is never asked for by name** (PRF-04, 2026-09-26): it is `locked`, ticked only by
   a workout finished in the programme app, so `nudge()` reasons about the habits the athlete can
   tick (`open`). When the session is the only thing left, a coached athlete gets `sessionLeft`
   ("Your part is done… a rest day is part of it") with **OPEN YOUR PROGRAMME**, which really opens
   the programme app (`target: 'program'` → `goProgram()`; it used to open Progress), and a free
   athlete gets `freeDone`. **A rest day is not scored differently** (Amir, 2026-09-27: *"We dont know a rest
   day"*): athletes move their days, so the session habit counts on every day and the one-miss door is
   what a rest day uses. "Nothing logged yet" needs **nothing logged**: 3,000 steps is not done
   but it is logged, and used to be greeted with "You have logged nothing". Display only: no scorer
   moved, and a rest day still counts against the day exactly as before (see *Open calls* in
   `docs/record/FRESH-EYES.md`).
6. **Roll call pointer** — a single row into the CREW tab, shown only while today's
   sentence is unwritten. The composer itself lives in CREW with its feed.
7. **The recap** — a rolling seven-day block: days on target, XP earned, and the heat map
   (see *The seven-day heat map*). The "recap" half.
8. **The cross-link** back to the training programme.

> **Why the list sits above the commentary.** It used to be hero → nudge → quests →
> habits, which put the first tickable row about **1,400px down**: you opened the app to
> log and had to scroll before you could log. The nudge alone was over half a phone
> screen. Now **six of the seven habits you can tick are in view without scrolling at
> 390 × 844** (the first circle 252 px down), four at 375 × 667 and two on a 320 × 568 phone
> (measured 2026-09-27 with all eight on; the eighth row is the programme's session, ticked
> by finishing it), and the nudge keeps every word of its voice — it just reads as a reply to the
> list rather than a wall in front of it. If you add anything to this screen, it goes
> *below* the habit list unless it is something the athlete must act on first.

**Streak at risk** is said once, in the card's nudge line, in clay with the count (since 2026-10-12; it
was a clay strip above the list, and before that three things at once: card, day-bar and header flag).

**The wins card** (`winsCard()`, PRF-02) sits between the hero and the list while it holds
anything, until it is tapped, and stands down while a past day is being filled in. What lands
on it is under *Celebrations* in *How progression works*.

**One-line offers ride between the list and the nudge**, each drawn only when it has
something to say: the library offer (`renderLibOffer()`, see *Library workouts feed a
habit too*) and **the board notice** (`renderBoardNotice()`) — *"You are on the
leaderboard"*, shown once to an athlete the sweep has just put on the board. It names the
display name other athletes see and says they also see level and rank. Tapping it sets
`CFG.boardNoticed` and opens Settings, whose *Crew board* row leads to *Leave the
leaderboard*; nothing else clears it, and it stands down while a past day is being filled
in. See *The leaderboard*. (The tour prompt sits just under the nudge until the tour has
run once.)


## The parts

- [The day score is weighted — and it is two numbers](01-the-day-score-is-weighted-and-it-is-two-numbers.md)
- […and back to 80 (2026-08-02)](02-and-back-to-80.md)
- [Habit names are TASKS, not nouns](03-habit-names-are-tasks-not-nouns.md)
- [Quests wear the event card, on Progress](04-quests-wear-the-event-card-on-progress.md)
- ["A few weeks" — multi-goal milestones, no dates](05-a-few-weeks-multi-goal-milestones-no-dates.md)
- [Milestones come in three tiers](06-milestones-come-in-three-tiers.md)
- [One word — `streak` — and two scopes](07-one-word-streak-and-two-scopes.md)
- [Five core habits, and opt-in add-ons](08-five-core-habits-and-opt-in-add-ons.md)
- [The seven-day heat map](09-the-seven-day-heat-map.md)
- [The backfill window](10-the-backfill-window.md)
- [Roll call](11-roll-call.md)

---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
