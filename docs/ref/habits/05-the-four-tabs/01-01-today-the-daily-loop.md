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

#### The day score is weighted — and it is two numbers
Full detail in [`XP_SYSTEM.md`](../../../../XP_SYSTEM.md) §6; the shape of it matters here because it
is what the roll call wall and the share cards show (Today leads with the verdict since PRF-03).
Both come from `dayParts(day, mode)`, which
sums `baseXp()` over `rosterOn(day)` instead of counting heads — a headcount said a
supplement and a training session were the same day's work, and the percentage was the
last number in the app that still believed that.

**Both halves give partial credit on a counter now** (Amir, 2026-08-02: *"for all the
habits that have bars to fill... i want that to be added toward their day completion
percentage"*). Two of three protein servings is 2/3 of the job, not zero. This was
gate-only until today — the day streak forgave a near-miss the header still read as zero
for — so `dayPct()` and `gatePct()` finally agree on what a partial counter is worth.
`isPerfect()` is untouched and does the job the old binary rule was protecting: a day can
read 91% without being *perfect*, because perfect still means every box actually ticked,
and only that unlocks the perfect-day card (a full-screen takeover until PRF-02).

- **`dayPct()`** — what the day was *worth*, over the whole roster. The roll call wall and
  the share cards (Today dropped it: the header's ring and the week's shading went with PRF-03 and
  PRF-05, the day strip with PRF-05). On a rest day it reads ~71%, and that is the honest number.
- **`gatePct()`** — what the athlete could *do*. A **locked** habit they did not earn that
  day leaves the denominator. Day streaks read this and nothing else.

⚠️ **"On target" has exactly ONE definition: `dayQualifies()`.** Never
`dayPct(k) >= streakQualifyPct` — that is a third rule, and it is wrong twice over: it
uses the whole-roster denominator (so an unearned locked session counts *against* the
athlete) and it skips the gate's second door (*at most one thing undone*). Anything that
labels a day on-target/missed, counts on-target days, or colours a cell by it must call
`dayQualifies()`. Its percentage door goes through `gatePasses()`, which **rounds** the day's
percentage before comparing, exactly like the server's `qualday` (a day at 79.5% counts; since
2026-09-26, when the two were found to disagree on 79.5–79.9%).

It was written the wrong way in the month share card — both the ON TARGET cell shading and
the "DAYS ON TARGET" figure — until 2026-08-02. Replayed across the eleven athletes on the
board it mislabelled **13 day-cells over 6 of them**; on Amir's own log it disagreed with
his real streak on **4 of 8 days**. Friday 31 July is the clean example: **53% by worth,
79% by the gate**, the streak counted it, and the card drew it as missed. That two-number
gap is not a bug — it is this whole section — but only one of the two decides anything, and
a share card is the worst place to state the other one.

The same confusion had reached the **manual prose**, which described the gate as *"75% of
what the whole day was worth"* — i.e. `dayPct`, the number that does **not** decide. Fixed
to say *what you could actually do that day*, with the rest-day gap named outright.
⚠️ `dayPct()` is **client-only** — it is computed here and sent up as a pre-computed
number when posting a roll call (`p_pct`), never recomputed server-side, so this needed no
Supabase migration. The server keeps its own score-half twin, `wdone`, for one narrow
legacy purpose (see §6) — it stays binary on purpose and is never shown to anyone as a
percentage.

⚠️ **The gate is what makes weighting safe.** WORKOUT is 100 of 350 — 28.6% of the default
day — against a threshold allowing 25% of slack, so weighted into the denominator it stops
being a weight and becomes a *precondition*: a rest day could never qualify, and a
free-tier athlete (whose WORKOUT is locked for life) would never have a qualifying day
again — while `proof.html` promises them only the *perfect* day is out of reach.
`isPerfect()` is deliberately untouched, which is what keeps that promise true.

`streakQualifyPct` moved 80 → **75** with it: the worst single miss on a rest day is steps
at 190/250 = 76%, so at 80 steps quietly became a second precondition. Verified over a
61-day log: **0 days stopped qualifying, 6 started.**

#### …and back to 80 (2026-08-02)

Amir, looking at a Friday that counted on 79%: *"I think 75% is very low. Make it 80."*

The paragraph above is the argument against 80, and it no longer holds — it predates the
gate's **second door**. `dayQualifies()` does not ask the percentage alone: `missing <= 1
&& done > 0` passes any day that left at most one thing undone. So the exact failure 75 was
chosen to prevent — miss steps alone on a rest day, lose the day — cannot happen at 80
either. What 80 tightens is the day that missed **three things by a little each**, which is
literally the day that prompted the change (Fri 31 Jul: steps 7,000/10,000, sleep 6/7.5,
protein 2/3 → 79%).

Measured across all eleven athletes on the board before shipping:

| | qualifying days 75 → 80 | streak 75 → 80 |
|---|---|---|
| Amir | 7 → 5 | **5 → 2** |
| Athlete A | 2 → 0 | 0 → 0 |
| Athlete B | 6 → 5 | 2 → 2 |
| Athlete C | 2 → 1 | 2 → 1 |
| Athlete D | 1 → 0 | 1 → 0 |
| The other six athletes | unchanged | unchanged |

⚠️ **Streaks are derived, so raising the bar shortens them retroactively** — Amir's own
went 5 → 2 the moment this shipped. That is the cost of the knob and it is worth stating
out loud before turning it. **XP, titles and levels did not move for anyone** (checked at
both thresholds across all 11): the bonus ledger only reads `qualify` for the day-streak
milestones and the `w_qualify5` quest, neither of which was in play. Rewards are still
append-only.

#### Habit names are TASKS, not nouns
They were labels — WORKOUT, STEPS, WATER — which is what the thing *is*, not what
the athlete has to do about it. A list of nouns reads as a filing system; a list of
instructions reads as a day's work. Each name now carries its own target
(*🚶 Walk 10,000 steps*, *💧 Drink 8 glasses*), so the row states the job before
anything is tapped, and `goal` — the second line — carries the coaching detail the
name has no room for rather than restating it.

**The `id` never changes.** Every log entry, level and leaderboard row is keyed on
it, so renaming is display-only and costs nobody a point. `weights` on the
`xp_rules` row is still keyed `strength`, not `session`, for the same reason.

Two of Amir's examples were deliberately *not* taken literally, because both would
have changed what is measured rather than what is displayed:
- **"3L of water"** — the log stores *glasses* (target 8). Switching the unit to
  litres would silently reinterpret every historical entry: a logged `8` becomes 8
  litres. Doing it properly needs a one-off conversion of every athlete's log.
- **"protein target"** — the log stores *meals* (target 3), not grams. The name
  points at protein (*🍗 3 protein meals*) without claiming to measure it. A real
  protein habit is a new tracked thing, not a rename.

Emoji were the one place the app broke its own rule (they have since spread to the
medals, the Settings rows, the board's top three and a habit's 🔥),
and glyph coverage genuinely varies by platform (🌬 rendered as a mangled box and
was swapped for 💨). They stay because a list of eight tasks scans faster with them.
Removing them is one edit to `HABITS[].name`.

#### Quests wear the event card, on Progress
Amir picked the event card out by name and asked for quests to use it — which is right
beyond the aesthetics: **a quest run and an event are the same object at two lengths** (a
set of goals, a clock, a reward), and they were drawn as two unrelated things. One card,
two spans: seven days and twenty-eight (events have since moved to the milestone row, so the
card is quests-only: see *"A few weeks"* below). Quests sit *above* events, because the one with
less time left is the one to act on, and a live card is ringed in the accent while a finished
one is teal.

**They are no longer on Today.** Today is for logging; a block of week-long targets there
was commentary sitting above the list and pushed the habits down for something nobody acts
on mid-tap. **Between runs the section is not drawn** (PRF-02, Amir's 4A, 2026-09-27). It
used to stay visible with one muted line, so that an athlete who joined between runs learned
quests existed; after 17 August that line was all anyone had seen of them. A run arrives with
its card and its takeover, and the manual's *Quests* section explains them in between.

Quest rows carry a name **and** a description, so each goal splits across two lines
(`.g-lbl` / `.g-sub`) rather than wrapping under the bar.

#### "A few weeks" — multi-goal milestones, no dates
`EVENTS` in `habits.html`, rendered as the middle group **inside** the Milestones section.
Amir, 2026-07-30: *"the seasons should be other kinds of milestones, they just take few
weeks to complete but are not long term."*

They went through two wrong shapes first, and the reasons are worth keeping:
1. **Calendar seasons** (Jul–Aug, Nov–Dec) — wrong, he never meant real seasons.
2. **28-day rotating windows, one live at a time** — still wrong, because a *window* is a
   slot you can miss. The "few weeks" is **how long the work takes**, not when it runs.

So there are **no dates anywhere**. Nothing expires, everything is workable from any day,
and each is measured over the athlete's whole history — an athlete who arrives with
history behind them simply has some of it done, exactly like every other badge here.

**They are a different KIND of milestone, not a different section.** A badge is one
measure; these are three — but they wear the **same row** as every other milestone
(Amir, 2026-07-29: the card form read as a quest; the `evcard` is quests-only now).
The three goals share the row's note line, ticking off as they fall, the bar is the
average of the three, and the right column carries the title the event pays where the
other rows carry XP. The tier order is by how long the work takes:

`A good week` → **`A few weeks`** → `The long haul` → `Rare`

**They pay a TITLE, never XP.** XP is scored twice, so a new paying rail means new plpgsql
that has to agree with the app for ever. A title is stored, append-only and free to mint —
the same rule the reward track runs on — and it is worth more here anyway, because titles
show on the leaderboard and the wall.

⚠️ There are **five** events now — the four four-week ones plus BACKBONE (*However long it
takes*, the comeback event, paying UNBOWED) — and all five `title.id` values are registered
in `passTrack` on the `xp_rules` row at `lv: 0`. Names, goals and blurbs are free to
rewrite — the server only validates the **id** — but changing an id needs a SQL round trip.

`eventProgress()` is **cached** (`_evCache`, dropped by `invalidateBonus()`): five events ×
three goals over a long log is thousands of `isDone`/`dayQualifies` calls, and it renders
on every Progress draw.

#### Milestones come in three tiers
`tier` on each entry in `ACHIEVEMENTS`, grouped on Progress by `ACH_TIERS` (32 in all
since the marks — see *How progression works*):

| tier | promise | count |
|---|---|---|
| `week` | a good week gets you this | 7 |
| `long` | weeks to months | 20 |
| `rare` | most people never will | 5 |

One flat list gave a new athlete a single reachable row above nine walls, and gave a
two-year athlete nothing left to want. Nothing that scores reads `tier`
— it is presentation only (Progress's groups, a medal's metal), which is why adding six milestones needed no new
machinery on either side, just more rows in `ACHIEVEMENTS` **and** in the
`milestones` array on the `xp_rules` row. ⚠️ Both, or the board pays a different
number to the phone.

**Progress shows the next three** (PRF-02, Amir's 3A, 2026-09-27): day one was 4,595 px
of Progress with 37 milestone rows open and none earned. Folded, the section is the three
you are closest to (furthest along; at zero, the fewest to go), with their bars; what you
have earned on **one row of medals**; and one row, **All 37 milestones**, that opens the
four groups below as they were (*Show the next three only* folds them again). The choice is
`CFG.msOpen.all`, remembered like the groups'. Measured: 4,523 → 1,538 px three weeks in.

**Every tier group — including "A few weeks" — collapses from its own header**
(`msTierHeader()`: the label, the count and a chevron, always shown). Groups are
**open by nature** — closing one is the athlete's choice, not the default — and the
choice is stored in **`CFG.msOpen`**, keyed by tier, so it survives a reload and a new
device; a key missing from it reads as open. Collapsed (under *All 37 milestones*), the whole
section is four one-line headers plus one line explaining what they're for — **"Each one pays
XP, and some a title, yours for good once you cross the line"** (POL-02; it said *challenges*
and *medals*) — sitting right under the section's own count. (An earlier version started
closed and kept the state in `UI.msOpen`, forgotten every visit; this file described that
version until 2026-09-26.)

#### One word — `streak` — and two scopes
A **habit's streak** is consecutive days on *one* habit ("a 24-day streak on water"); it
sits on that habit's row and in its detail header. The **day streak** is consecutive days
that pass `dayQualifies()` (`streakQualifyPct` of the day's weight, or at most one thing
undone); it is the flame on **Today's hero card** (drawn only while a streak is running)
and the third tile of **Progress's stat grid**, and it is always captioned *DAY STREAK*.
There is no band any more — see *01 · TODAY*.

⚠️ **This reverses the old rule.** The per-habit one used to be called a **run**, precisely
so a 24-day water run could not be mistaken for a 2-day day-streak — the app had once used
five phrasings (*day streak*, *24 DAYS*, *Best streak*, *Best run so far*, *days in a row*)
and they read as one number arguing with itself. Amir asked for `streak` everywhere
(2026-07-29), so the disambiguation moved from the **noun** to the **scope**: a habit's
streak is only ever shown *on that habit*, and the whole-day one is only ever shown with
the word *day* attached. The manual's *Consistency* section and the day-one note on
Progress are the two places that teach it, and both were rewritten to do so.

**Do not reintroduce "run" in athlete-facing copy.** `bestHabitRun()` keeps its internal
name because nothing renders it — nothing calls it at all any more: the Progress tile it
used to feed shows the day streak's best (`bestDayStreak()`), and a habit's own best is
`habitBest(h)`, captioned *Longest streak* on its detail screen.

#### Five core habits, and opt-in add-ons
(Amir, 2026-07-30.) **`core: true`** on five — train · steps · sleep · protein · water.
Always tracked, **no off switch**: `live()` honours `core` whatever `CFG.on` says, so even
an athlete who switched one off before this existed gets it back, dated today, with nothing
behind them moving. The same five for everyone is what makes a day score mean the same
thing across the whole board.

Everything else — mobility, breathing, supplements, anything custom — is an **add-on**,
worth real points on top, and **once switched on it counts**.

**The two rules in `stampRoster()`, which are the answer to "why did Friday change
Wednesday":**

| | takes effect |
|---|---|
| Switching an add-on **on** | **today** — you opted in, and today is still yours to finish |
| Switching one **off** | **tomorrow** — or dropping it at 23:00 would delete a miss you already made |

Neither ever reaches a closed day; `rosterOn(day)` still reads the entry in force on that
day. `lockedOnToday()` is what lets a switched-off row still say *"still counts today"*.
Settings carries the whole rule as **permanent copy**, not a toast — someone who switched
something on three weeks ago should still be able to find out why it is counting.

**Switching one ON is a two-tap confirm, not a toast, because a toast is easy to have
never read** (Amir, 2026-07-30). A first tap on an add-on's switch only **arms** it — the
switch outlines in clay and the row's own meta line restates the rule in place ("Tap
again to turn it on — you cannot turn it back off until tomorrow"); nothing in `CFG.on`
changes yet. A second tap, within `_confirmOnTimer`'s 3.2s window, actually commits it,
clears `UI.confirmOnId`, and shows the existing toast. Missing the window — tapping
elsewhere, waiting it out — disarms with no side effect at all: `CFG.on` was never
touched by the first tap. Turning one **off** stays a single, immediate tap; there is
nothing to confirm on the direction that never takes effect before tomorrow anyway.

Proven against a nine-day log: adding supps today leaves Wednesday at 100% and takes today
to 93%; switching it straight back off leaves today at **93%** (the dodge fails) and dates
the removal to tomorrow. No SQL changed — the timeline format is the same, so
`hab_bonus_xp` reads it exactly as before.

#### The seven-day heat map
Bottom of Today, inside *Your week, habit by habit*. One row per tracked habit, one column per
day, oldest on the left. The point is the **shape**: a solid band on one row above a
gap-toothed one says more about where the week went than any percentage, and it replaced a
"strongest / weakest" sentence that named two habits out of eight and said nothing about
the other six.

Rows are ordered strongest-first so the eye lands on what is working before what is not.
Cells reuse the 35-day grid's vocabulary — `hit` / `part` / `pre` — so the athlete learns
it once. ⚠️ It reads `rosterOn(k)`, not `live()`: a habit switched on midweek did not exist
on Monday, and drawing it as three misses is the app inventing failures. Those cells render
`pre`, exactly like days before the athlete joined. Labels use `HABITS[].short` (*Steps*,
*Protein*, *Supps*) because the task-style names do not fit a 66px column.

#### The backfill window
Nobody logs perfectly on the day, every day, so **the last `BACKFILL_DAYS` (3) days plus
today are editable**. Tapping one of those days on the week (the card at the top of Today) switches
which day the taps land on; past that the
log is closed. The limit is the feature — a record you can rewrite whenever you like is
a diary, not evidence.

While an earlier day is selected the screen says so unmistakably (clay banner, the header
title becomes the weekday, `· FILLING IN` in the eyebrow), and **the nudge and the roll
call pointer stand down** — both are statements about *now*, and "drink three more glasses"
is nonsense advice about last Saturday. Streaks, at-risk warnings and the perfect-day
celebration stay anchored to the real today for the same reason. `AKEY()` self-heals: if
the app is left open past midnight the window slides and it falls back to today rather
than writing to a day that has since closed.

Backfilling **does** recompute XP, streaks, badges and quest progress — that is the point
of allowing it. It does **not** reopen that day's roll call sentence.

⚠️ **The row list you fill in must be that day's own roster, never the current one**
(fixed 2026-07-30, after Amir asked why a day he'd ticked every visible row on still
read 86%, not 100%). `renderToday()` used to build the tappable list from `live()` —
today's tracked set — for every day, including a backfilled one. If an add-on has been
switched off since, the row simply stopped existing: `live()` doesn't know it was ever
tracked. The header's own `dayPct()` was never wrong — it already read `rosterOn(AKEY())`,
per the roster invariant above — so an athlete could tick every row the screen showed
them and still watch the day sit at 86%, with no way to see why or fix it. `rows` is now
`rosterOn(AKEY())`, always the day's actual scored set; `hs` (`live()`) stays reserved for
"your week" — the heat map and the strongest/weakest ranking, which are about what you
track *now* regardless of which day you happen to be viewing. A row pulled in only
because history asked for it, not the current toggle, carries **"paused now, but counted
this day"** on its meta line so an unfamiliar habit reappearing mid-backfill explains
itself; it is otherwise a completely normal, tappable row — `toggleHabit()`/`bump()`/
`openHabit()` never gate on `CFG.on`, so logging it retroactively works exactly like any
other habit.

> The window is a **UI affordance, not a lock**. The app pushes its whole log blob to the
> server, so devtools could always reach further back — true before this existed too.
> Enforcing it server-side would mean diffing snapshots on every save; judged not worth
> it for a board among one coach's own clients.

#### Roll call
**One sentence a day, visible to everyone else on the board.** Deliberately not a chat:
the server's primary key is `(athlete, day)`, so the shape of the data *is* the rate
limit — nothing to moderate into a thread, and a quiet day reads as "nobody has answered
yet" rather than "this is dead".

- **Posting requires being on the leaderboard**, under the same display name — there is
  no second one. Being on the board is no longer an opt-in (see *The leaderboard*), so the
  consent for the wall is the act of writing a line: `privacy.html` rests the board entry
  on legitimate interests and Roll Call on consent. Not on the board → the box becomes an
  invitation, **with the join form itself rendered underneath it**. It used to be an
  invitation over a button reading *"Take a look at the crew"* whose handler was
  `go('crew')` — from the
  crew screen, the only place that box renders. It scrolled to the top and did nothing
  else, and the actual join form was on the *other* view of the tab, at the bottom, past
  a board of strangers. That was the single dead end a brand-new athlete hit first.
- **Today only**, even though the log itself is editable for three days. Fixing
  Saturday's steps is admin; rewriting what you *said* about Saturday is not.
- **It pays no XP.** The moment a sentence earns points you get one character of
  gibberish every night at 23:58. The reward is that your line sits next to your rank.
- **The box asks a question** rather than showing a blank field — 20 prompts in the
  `prompt` bucket of `NUDGES`, rotating daily on the same seed as every other line.
- **Leaving the board hides your lines** immediately, without deleting them. Re-joining
  brings them back.

Written and read in the **CREW** tab, under *Roll call* (Crew opens on the board since PRF-02).

**The composer is the dark card; every line is its own card** (Amir, 2026-08-01: *"each
comment has its own card … and i like how your message has a card like the dark blue
card"*). Writing and reading are the two halves of this screen and they used to be drawn
the same way, so the box you type in was the first of nine identical rows. `.rccomp` is
inverted (`--ink-card`) with a translucent field and a **`62% day rides along · 58/200`**
meter beside *Post it →* — your day travels with the line, and that is the one thing an
athlete was never told before posting. Each line is an `.rccard`: the name, the sentence,
and **achievement chips underneath**.

⚠️ **No avatars in CREW** (Amir, same day: *"in crew remove the circle with peoples
initials"*). Both the wall and the board briefly carried a tinted initial disc per
athlete; both are name-first now, and `avatar()`/`personHue()` are deleted rather than
left unused. The only initials still in the app are the athlete's **own** — the header
button and the Settings profile card — and those identify a door, not a person on a list.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
