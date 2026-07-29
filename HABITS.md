# 🎯 Proof — the habit app brief

The "what this app actually is" context doc for **`habits.html`**, the daily habit
tracker that sits alongside the training programme. Pair it with
**[`XP_SYSTEM.md`](XP_SYSTEM.md)** (every tunable number and what changes when you
move it) and **[`CODEBASE.md`](CODEBASE.md)** (the technical file-by-file map).

Start here if you're picking this up in a fresh chat.

> **⚠️ Keeping this honest.** When you change how the app works, these must move
> together: **this file**, **`XP_SYSTEM.md`**, **`QUESTS.md`** (if you touched a quest),
> **`tourSteps()`** (the tour names controls out loud — move a button and it lies),
> and the **in-app manual**
> (`renderManual()` in `habits.html`, which athletes reach from the initials button
> top-right → *The manual*). The manual reads its numbers straight from the live constants, so
> retuning XP never breaks it — but if you change *behaviour*, its prose needs
> updating by hand. Same for `privacy.html` if you change what data is shared.

---

## The product in one breath

**AA Proof** is a gamified daily habit tracker for Amir's coaching clients. The training
programme (`program.html`) covers what happens in the gym; Proof covers the other
twenty-three hours — sleep, steps, water, food, mobility, breathing, supplements.

The hook is progression borrowed from competitive games: every habit earns points,
points build levels, levels carry rank names, and an opt-in leaderboard lets clients
race each other. The tone is dry and a bit rude — a coach who notices, not a wellness
app that congratulates you for existing.

It is **not** a messaging channel. There is no chat; coaching conversation stays in
`program.html`.

---

## How an athlete gets in

Same private link as their programme: `habits.html?client=<id>&key=<key>`.

The two apps are **linked both ways**:

| From | To | Where |
|---|---|---|
| `program.html` | Proof | **Daily Habits card** on Home *and* at the end of My Plan (a plain shortcut — it shows no level or XP, because that is Proof's job) |
| Proof | `program.html` | **Your training programme** card at the bottom of Today, and a row in Settings (behind the initials button) |

Both are the same origin with the same PWA scope, so tapping through from an installed
app stays inside the app shell — no browser bounce, no second install. Each handover
passes the client id and the resolved key, because an installed PWA often opens
without `&key=` in the URL.

### Putting it on the home screen

Proof carries its own manifest, built at load so `start_url` bakes in the athlete's
`?client=…&key=…`. The installed icon is therefore **their** app, not a login screen.
The app is called **AA Proof** everywhere on the site, and that name has to stay in
step in three places specifically for the install identity: `manifest.name`,
`manifest.short_name`, and the `apple-mobile-web-app-title` meta — iOS labels a
home-screen icon from that meta and ignores the manifest, so without it the icon would
read `AA Proof — AA Performance` truncated to nothing.

The offer is a sheet, and **it is not shown on arrival**. It fires once, ~1.5s after the
athlete logs their **first** habit — `setVal()` is the one door into the log, so that is
where it hooks. Before anything has happened it is a pop-up from a stranger; straight
after the first tick it is *keep this*. It stands down for a celebration, the log sheet,
any screen other than Today, demo mode, and an app already running standalone. Saying
*Not now* sets `CFG.installAsked` and it never asks again — **Settings keeps a permanent
row**, which is also the only route for someone on a new phone. The row disappears once
the app is installed, where it would do nothing.

`beforeinstallprompt` is Chromium-only: there the sheet has a real **Add to home screen**
button wired to the deferred prompt. iOS Safari has no such event and no way to open the
OS sheet from script, so there it shows the instruction — *Share → Add to Home Screen* —
and no button that could not work.

**The third case is the common one.** Amir sends the link over WhatsApp, so the first
screen most athletes ever see is inside **WhatsApp's own browser** — and an in-app
browser cannot add anything to a home screen. Some have no share sheet; the ones that do
leave *Add to Home Screen* out of it. `inAppBrowser()` catches the apps that identify
themselves (Instagram, Facebook, WhatsApp on Android, WeChat, Line, LinkedIn) and the
sheet says *"open this in Safari first"* instead, with the install button suppressed
because it could not work either. Detection is best-effort — a WKWebView can look exactly
like Safari — so the plain-iOS copy carries the same escape hatch as a second line. An
instruction naming a button the athlete does not have reads as *"this app is broken"*, on
the first screen they ever see.

---

## Two kinds of user — coached, and free

Proof is also **the way in for people who are not clients yet**. They land on
[`proof.html`](proof.html) (the Instagram bio link — deliberately not in the site nav),
read what it is, and leave a **display name, email and WhatsApp number**. Amir gets the
form by email and runs the **`/proof-signup`** skill, which does the whole job in one
pass: pick an id, mint the key, record the contact, write the data file, ship it, and
hand back a WhatsApp message with the link already in it.

The difference between the two users is **one field** in `data/<id>.json`:

```json
{ "athlete": { "id": "sara_karimi", "firstName": "Sara",
               "boardName": "Sara K.", "tier": "free" } }
```

…plus an optional `"boardName"` holding the name they typed on the form.

**Signing someone up does not put them on the leaderboard.** They join themselves,
from Crew, if and when they want to — which is what `privacy.html` promises and the
only honest reading of a form field. `boardName` exists so that when they do, the box
is already filled in with the name they chose. Two reasons this matters beyond the
promise: `CFG.onBoard` is a **client** flag that is never read back from the server, so
an auto-joined athlete would be listed on everyone else's board while their own screen
said *"Not on the board"* and roll call refused them; and every signup would land on the
board at 0 XP, including the ones who never open the link. A short board of people who
are actually logging is worth more than a long one padded with zeros.

`isFree()` is the only test in the app, and anything that is not `"free"` counts as
coached — so no existing athlete file needs touching. In free mode:

- **WORKOUT stays locked**, and says why: *"Coached athletes earn this from their
  programme. It is the biggest habit on the list."* It is the one habit they can see
  and cannot have, which is the honest version of the pitch.
- Every route that would open `program.html` goes to **`/form.html`** instead — the
  Today card, the Settings row, the habit detail button.
- The Today card reads *"Want the training too?"* rather than *"Your training
  programme"*.

**Scoring is identical.** A free user earns the same XP, levels, runs, badges and board
position as a paying athlete, and shares **one board** with them — that is the point.
It also makes the upgrade free of migration: flip `"tier"` to `"coached"`, let the
coaching pipeline write the programme into the same file, and their whole history,
level and board place carry straight over. Same id, same key, same link.

**Contact details never go in `data/*.json`** — that file is served statically by GitHub
Pages and anyone who guesses an id can read it. Email and WhatsApp live in
`public.hab_contacts` behind coach-only RLS (`supabase/stage16_contacts.sql`).
`select * from public.contact_list();` shows who signed up **and how many days they have
actually logged** — adherence is the qualifying signal, and a better one than an email
address. `select public.forget_contact('<id>');` erases someone completely.

---

## The three tabs

`TODAY · PROGRESS · CREW`. **Settings is not a tab** — it lives behind the athlete's
initials at the top-right of the header, and the same button becomes the way out of
Settings, the manual and the ladder (none of which is a tab, so none has a tab to press
to leave). The tab bar used to give Settings a quarter of the primary navigation for a
screen an athlete opens three or four times ever, while the social layer — the thing that
brings people back daily — was a chip inside a tab named after only half of what it held.

### 01 · TODAY — the daily loop
The screen they actually live on. **In this order, and the order is the point:**

1. **Level hero** — overall level, rank label, XP, and one bar: progress to the next
   level. Today's own completion is *not* repeated here; the header and the day strip
   both already carry it, and a second green bar of the same shape directly beneath the
   first read as one broken double-bar.
2. **The streak flame** — sits *on* the level hero, left of the rank block: a drawn flame
   (never an emoji — nothing here should change shape between an iPhone and a Pixel) and the
   day-streak number in clay, licking faster the longer the streak runs, on the same
   0/5/15/30-day heat scale the habit rows use. Hidden until the first logged day.
   ⚠️ This briefly had a whole **band** to itself and Amir killed it (2026-07-30, *"i hate
   that … i asked you to show their streak … just bolder, flashier just something to catch
   the eye"*). The lesson is worth keeping: he asked for an existing number to be made
   **louder**, and a band is a *new field* — a whole strip of screen to state one integer,
   on the screen whose own layout note says anything added goes below the habit list. The
   flame costs no vertical space at all. Progress carries the same flame inside its stat
   grid, so the day streak is one of its four facts again.
3. **The day strip** — four chips (`TODAY · SAT · FRI · THU`), each showing that day's
   completion, that choose **which day you are logging**. See *The backfill window* below.
4. **The habit list** — tap the box to tick, tap the name for that habit's history, tap
   `+` on counter habits. Each row shows that habit's own level and current streak.
   Only counter habits carry a progress track; on a check-off habit it could only ever
   read 0% or 100%, which was noise on half the list.
5. **The nudge** — one clay card whose copy reacts to what is actually missing, drawn at
   random from a library of **83 lines across 13 situations** (`NUDGES`): one bucket per
   habit, plus nothing-logged-yet, one-habit-left, all-done, streak-at-risk and
   streak-rolling. The pick is seeded on the date, so it is **stable all day and rotates
   tomorrow** — over 21 days a bucket of 10 uses all 10 lines with no back-to-back
   repeats. Its button opens the habit in question. The "nudge" half of *nudge and recap*.
6. **Roll call pointer** — a single row into the CREW tab, shown only while today's
   sentence is unwritten. The composer itself lives in CREW with its feed.
7. **The recap** — a rolling seven-day block: days on target, XP earned, strongest and
   weakest habit. The "recap" half.
8. **The cross-link** back to the training programme.

> **Why the list sits above the commentary.** It used to be hero → nudge → quests →
> habits, which put the first tickable row about **1,400px down**: you opened the app to
> log and had to scroll before you could log. The nudge alone was over half a phone
> screen. Now **six of the eight habits are tickable without scrolling at 390px, five at
> 320px**, and the nudge keeps every word of its voice — it just reads as a reply to the
> list rather than a wall in front of it. If you add anything to this screen, it goes
> *below* the habit list unless it is something the athlete must act on first.

**Streak at risk** gets one clay strip immediately above the list, rather than being
said three ways at once (card, day-bar and header flag) as it was before.

#### The day score is weighted — and it is two numbers
Full detail in [`XP_SYSTEM.md`](XP_SYSTEM.md) §6; the shape of it matters here because it
is what the day strip and the header show. Both come from `dayParts(day, mode)`, which
sums `baseXp()` over `rosterOn(day)` instead of counting heads — a headcount said a
supplement and a training session were the same day's work, and the percentage was the
last number in the app that still believed that. It is **binary, not pro-rata**: `xpFor()`
already pays pro-rata *with* a completion bonus, so a linear percentage would be the one
number here that does not reward finishing.

- **`dayPct()`** — what the day was *worth*, over the whole roster. The header, the day
  strip, the roll call wall. On a rest day it reads ~71%, and that is the honest number.
- **`gatePct()`** — what the athlete could *do*. A **locked** habit they did not earn that
  day leaves the denominator. Day streaks read this and nothing else.

⚠️ **The gate is what makes weighting safe.** WORKOUT is 100 of 350 — 28.6% of the default
day — against a threshold allowing 25% of slack, so weighted into the denominator it stops
being a weight and becomes a *precondition*: a rest day could never qualify, and a
free-tier athlete (whose WORKOUT is locked for life) would never have a qualifying day
again — while `proof.html` promises them only the *perfect* day is out of reach.
`isPerfect()` is deliberately untouched, which is what keeps that promise true.

`streakQualifyPct` moved 80 → **75** with it: the worst single miss on a rest day is steps
at 190/250 = 76%, so at 80 steps quietly became a second precondition. Verified over a
61-day log: **0 days stopped qualifying, 6 started.**

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

Emoji are the one place the app breaks its own rule — there are none anywhere else,
and glyph coverage genuinely varies by platform (🌬 rendered as a mangled box and
was swapped for 💨). They stay because a list of eight tasks scans faster with them.
Removing them is one edit to `HABITS[].name`.

#### Quests wear the event card, on Progress
Amir picked the event card out by name and asked for quests to use it — which is right
beyond the aesthetics: **a quest run and an event are the same object at two lengths** (a
set of goals, a clock, a reward), and they were drawn as two unrelated things. One card,
two spans: seven days and twenty-eight. Quests sit *above* events, because the one with
less time left is the one to act on, and a live card is clay while a finished one is green.

**They are no longer on Today.** Today is for logging; a block of week-long targets there
was commentary sitting above the list and pushed the habits down for something nobody acts
on mid-tap. Between runs the section stays visible with one muted line — the block
vanishing entirely kept *"seeing quests means something is on"* true but made the whole
feature invisible, so an athlete who joined between runs never learned quests existed.

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

⚠️ The four `title.id` values are registered in `passTrack` on the `xp_rules` row. Names,
goals and blurbs are free to rewrite — the server only validates the **id** — but changing
an id needs a SQL round trip.

`eventProgress()` is **cached** (`_evCache`, dropped by `invalidateBonus()`): four cards ×
three goals over a long log is thousands of `isDone`/`dayQualifies` calls, and it renders
on every Progress draw.

#### Milestones come in three tiers
`tier` on each entry in `ACHIEVEMENTS`, grouped on Progress by `ACH_TIERS`:

| tier | promise | count |
|---|---|---|
| `week` | a good week gets you this | 6 |
| `long` | weeks to months | 7 |
| `rare` | most people never will | 3 |

One flat list gave a new athlete a single reachable row above nine walls, and gave a
two-year athlete nothing left to want. Nothing but the Progress screen reads `tier`
— it is presentation only, which is why adding six milestones needed no new
machinery on either side, just more rows in `ACHIEVEMENTS` **and** in the
`milestones` array on the `xp_rules` row. ⚠️ Both, or the board pays a different
number to the phone.

#### One word — `streak` — and two scopes
A **habit's streak** is consecutive days on *one* habit ("a 24-day streak on water"); it
sits on that habit's row and in its detail header. The **day streak** is consecutive days
where the athlete cleared `streakQualifyPct` of the day's weight; it is the band at the top
of Today and Progress, and it is always captioned *DAY STREAK*.

⚠️ **This reverses the old rule.** The per-habit one used to be called a **run**, precisely
so a 24-day water run could not be mistaken for a 2-day day-streak — the app had once used
five phrasings (*day streak*, *24 DAYS*, *Best streak*, *Best run so far*, *days in a row*)
and they read as one number arguing with itself. Amir asked for `streak` everywhere
(2026-07-29), so the disambiguation moved from the **noun** to the **scope**: a habit's
streak is only ever shown *on that habit*, and the whole-day one is only ever shown with
the word *day* attached. The manual's *Consistency* section and the day-one note on
Progress are the two places that teach it, and both were rewritten to do so.

**Do not reintroduce "run" in athlete-facing copy.** `bestHabitRun()` keeps its internal
name because nothing renders it; the Progress tile it feeds reads *Longest streak*.

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

Proven against a nine-day log: adding supps today leaves Wednesday at 100% and takes today
to 93%; switching it straight back off leaves today at **93%** (the dodge fails) and dates
the removal to tomorrow. No SQL changed — the timeline format is the same, so
`hab_bonus_xp` reads it exactly as before.

#### The seven-day heat map
Bottom of Today, inside *The last seven days*. One row per tracked habit, one column per
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
today are editable**. The day strip switches which day the taps land on; past that the
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

> The window is a **UI affordance, not a lock**. The app pushes its whole log blob to the
> server, so devtools could always reach further back — true before this existed too.
> Enforcing it server-side would mean diffing snapshots on every save; judged not worth
> it for a board among one coach's own clients.

#### Roll call
**One sentence a day, visible to everyone else on the board.** Deliberately not a chat:
the server's primary key is `(athlete, day)`, so the shape of the data *is* the rate
limit — nothing to moderate into a thread, and a quiet day reads as "nobody has answered
yet" rather than "this is dead".

- **Posting requires being on the leaderboard.** That opt-in already means "I agree to
  other athletes seeing me, under this handle", so there is no second consent to reason
  about and no second display name. Not joined → the box becomes an invitation, **with
  the join form itself rendered underneath it**. It used to be an invitation over a
  button reading *"Take a look at the crew"* whose handler was `go('crew')` — from the
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

Written and read in the **CREW** tab, which opens on it.

### 02 · PROGRESS — where do I stand
Habits and achievements merged, because they were two views of one question.

**A slim level strip** (not a repeat of Today's hero — two tabs used to open
with the identical 76px level block) → **four season stats**: days logged, badges,
**day streak** (as the flame) and perfect days → a one-line
**key explaining the consistency pips**, which had no
legend anywhere in the app and are empty for the first five days → **one row per habit**
(its level, rank, XP, progress bar and five pips, tapping through to full history) →
paused habits with their banked XP → **seasonal events** → the sixteen one-off
**milestones**, in three tiers.

Days-logged leads the stat grid deliberately. Perfect days and runs are both zero for
anyone rebuilding after a bad week, and opening your own progress on a pair of zeros
punishes exactly the athlete who most needs to keep going. Showing up is the stat that is
almost always positive, and it is the one that earns the others.

**The day streak is not in the grid** — it is the band above it, so the two screens an
athlete checks their standing from open with the identical object. It was a bare figure
in a tile with no way to tell a streak climbing from one that had just broken, and
repeating it in both places would be the duplication this tab was reorganised to remove.
Its old slot now holds **longest run** — the best single-habit run ever, which is genuinely
different information and quietly teaches the run/streak split the app depends on.

A habit row's meta line is **rank · XP** only. It used to append today's status too,
which wrapped every row to two lines and restated what Today already says — Progress is
about standing, not about today.

**Nothing-logged-yet is taught, not reported.** On a log with no days in it the stat grid
carries one line defining *badge*, *run*, *streak* and *perfect day* — words that were used
nowhere else an athlete had been — and it disappears at the first logged
day. It teaches *run* and *streak* side by side on purpose: the band above holds the
streak, the grid holds the run, and those are the two words the app must never blur. Today's seven-day recap no longer names a "strongest" and "weakest" habit out of an
eight-way tie at 0/7. The foot of Progress carries a second door to the manual.

**Habit detail** (reached from here or from Today) shows that habit's rank and level
progress, a log button, its consistency ladder, this-week / best-streak / 35-day-rate
stats, a 35-day grid, and the last five days with the XP each earned.

**Missed and not-yet-started are different, everywhere a day is drawn.** Days before
`firstLoggedDay()` render as `.c.pre` in the 35-day grid (dotted, with its own key entry),
are dropped from the last-five list, and read `—` rather than `0%` on Today's day strip.
A day-one athlete was being shown three failed days on the day strip and five weeks of
MISS on every habit, for a period during which they did not have the app. Note
`firstLoggedDay() || TKEY()` at both call sites — it returns `null` until something is
logged, which is precisely the case this exists for.

Its header eyebrow is the habit's **goal**, not `h.source` — most habits are sourced
`Manual`, so the screen used to announce itself as "MANUAL", which reads as *the manual*
in Settings. The header's right slot carries the **current run**, not the level, because
the hero directly beneath it is a 76px level. The **35-day grid marks today** and carries
a key; without either it was 35 identical squares with no anchor, and the empty leading
row read as broken rather than as "before you started".

**A note on the habit-row badge.** A row shows the **run** when there is one and the
level only when there isn't. `LV 10` sat on five of eight rows at once and told you
nothing at a glance, while the run is the number nobody wants to lose. Levels still
announce themselves the moment they change, through the flash chip — which is when they
actually matter — and both Progress and the detail screen carry the level permanently.

### 03 · CREW — everyone else
Opt-in only, and it holds the **whole** social layer. Two views, switched at the top:
**Roll call** (the default) and **Leaderboard**.

**Roll call** is the composer *and* the wall, in that order — you write at the top of the
feed you are posting to. Behind it: the last seven days of one-sentence entries grouped
by day, newest first, each line carrying the writer's display name, season rank and that
day's completion. **Amir's own line leads its day** (clay left border, `YOUR COACH`).

Roll call is the default because conversation rewards coming back and a ranking is a
once-a-day glance. Today carries a **one-line pointer** into this tab that disappears
once the athlete has written — a doorway, not a second composer.

**Leaderboard** has two scopes: **this season** (the default) and **past week** (a rolling
seven days, not a calendar week). Joining and renaming live with it.

### Settings — behind the initials button
Profile · **Show me around** (the tour) · **The ladder** · **The manual** · link to the
programme · sync status and a *Sync now* button · leaderboard status · dark mode ·
which habits are tracked (plus adding custom ones) · reset today's log.

Deliberately *not* here: coach volume, motivation display. The app has one mode — XP and
levels, nudge and recap — and doesn't ask athletes to configure it.

> **This used to say "replay onboarding" was deliberately absent too.** That ruling was
> about the habit *picker*, which decides nothing and is fully editable in the list
> further down this same screen. It is not about **the tour**, which is the only
> explanation of what the app's controls do — and an explanation you can see exactly once
> is worth very little. *Show me around* is the first row in *How this works*.

### The rank ladder
Reachable by **tapping your rank** on Today or Progress, and from a Settings row.
Shows all 10 ranks with their own insignia, what each one costs in XP, which are
cleared, which one you are standing in (and how far through it), and what the star
means past level 50. Games always show you the road ahead; before this, Proof's road
existed only inside a paragraph of the manual.

**Share your rank** builds a 1080×1080 card on a canvas and hands it to the OS share
sheet (or downloads it where there isn't one). The insignia is drawn from the *same*
`RANK_ART` path data through `Path2D`, so a rank can never look different on the card
than it does in the app. Green ground, paper type, clay-2 accent, Barlow Condensed —
and it waits on `document.fonts.load()` for each face first, because canvas silently
falls back to a system sans if the font has not downloaded yet, which is exactly how a
brand card stops looking like the brand.

Insignia are **drawn, not imported** — straight lines, hard corners, square caps,
one inherited colour, in `RANK_ART`. They escalate on purpose so the ladder reads at
a glance: blocks being laid, then force, then machinery, then a burst. Anything with
a curve or a rounded cap belongs to a different app.

#### Inside the Crew tab

Rows show **movement, not just standing**: a ▲/▼ chip against each name, and a green
banner when the athlete has overtaken someone — *"You passed Bo and Cy since you last
looked."* The server returns no history, so the last standing is remembered per scope
on the device (`CFG.lbSeen`) and the next fetch is diffed against it.

Set the coach line with `select public.set_coach_note('…');`. A day reads top-down as
*here is the brief, here is who answered*.

**Moderation** is coach-only, in the Supabase SQL editor:

```sql
select public.set_coach_note('Everyone in. No excuses today.');  -- your line for today
select public.hide_note('<athlete_id>', '2026-07-27');           -- take a line down
select public.hide_note('<athlete_id>', '2026-07-27', false);    -- put it back
select day, athlete_id, hidden, pct, body from public.hab_notes
  order by day desc, updated_at desc limit 50;                   -- read everything
```

Hiding rather than deleting keeps the evidence, which is what you want if you ever have
to explain the decision to the athlete.

---

## The tour — the game-style first run

**One screen of onboarding said what to track and not one word about how any of it
works.** The athlete was then handed a scoring system, three tabs, a header button
labelled with their own initials, and a habit row with **three different tap targets and
no signal that there was more than one** — and left to guess. The only real explanation,
`renderManual()`, is excellent and sat three taps deep behind an unlabelled monogram with
nothing anywhere pointing at it.

The tour is a clay box drawn around the thing being named, a card beside it saying what
that thing does, and everything else dimmed. **15 steps**, about a minute, across Today,
Progress, Crew and Settings. It runs straight off *Start tracking*, and it is replayable
for ever from **Settings → How this works → Show me around** and from the manual's new
**Start here** section.

`TOUR`, `tourSteps()`, `startTour()`, `tourShow()`, `tourTap()` and `paintTour()` in
`habits.html`. Three things about it are load-bearing:

- **It lives OUTSIDE `#app`,** in its own `<div id="tour">`. `render()` morphs `#app`
  against the template and deletes anything the template does not know about, so a layer
  inside it would be destroyed on the next tick. `paintTour()` owns that node
  imperatively; `render()` calls it when `TOUR.on` so the ring re-measures after a tick,
  a screen change or a celebration.
- **The dimmer is four mask panes with a real hole, not one lid with a transparent
  window.** A lid still swallows the tap. The hole is what lets a step marked `act` be
  finished by *actually doing the thing* — tapping the real checkbox, opening real
  Settings. A step you only read gets `.tourblock` dropped into the hole to seal it.
- **Targets are resolved live and measured with `getBoundingClientRect()`,** never
  hard-coded, so the ring cannot drift out of step with a retuned screen. Steps that
  cannot apply (the `+` step when nothing counter-ish is tracked) are dropped when the
  list is built rather than discovered missing halfway through.

**Placement is solved for the ring and the card together**, because the card is up to
56vh and a 320×568 phone has no arrangement where a naive "draw ring, then fit card"
does not cover the thing being pointed at. `paintTour()` measures the card first, then
either trims the ring's height to leave room below it, or puts the card above, or — for a
tall block low on a short screen, like the join box at the foot of Crew — pins the card
to an edge and trims the ring from the far side. Verified with no overlap and no
off-viewport card across coached / free / dark / reduced-motion / 320px.

⚠️ **The tour names controls, so it is now a fifth thing that goes out of date.** If you
move a control, rename a tab, or change what a tap does, fix `tourSteps()` in the same
pass — see the sync list at the top of this file.

`CFG.toured` records that it has been offered. It defaults to **false for existing
athletes too**, so everyone who has been using Proof since before this shipped gets the
offer once — a one-line pointer below the habit list on Today, which deletes itself the
moment the tour has run.

---

## The long game — rewards a season cannot take

A reward track up the level ladder: **14 rewards**, reached by levelling and nothing
else. There is nothing to buy, nothing to claim, and no second currency. It exists
because the app could tell you your level *after* you earned it and never once told you
what was coming — and "what is coming" is what carries someone through the week where the
numbers barely move.

Two kinds, both free to mint, which is the constraint that shapes the whole feature. A
coach cannot owe forty people a phone call because forty people were consistent, so
nothing on this track costs Amir anything to hand over:

- **Titles** — a name the athlete wears. It sits under their rank on Progress and is
  printed on the rank card they share.
- **Cards** — the look of that shareable card. Five grounds (`HOUSE`, `EMBER`,
  `BLUEPRINT`, `NIGHTFALL`, `FLARE`), all painted on the canvas, all inside the palette:
  a treatment changes *structure*, never colour.

A cosmetic is worth nothing without an audience — which is why most habit trackers cannot
make rewards work. This one has two: the board, and a card built to be exported.

**They are kept, and that is the one exception in the whole app.** Every other number here
is derived, so retuning a rule rescores all of history. Rewards are *recorded* in
`CFG.pass.owned` the moment the level is reached, and never taken back — not by a new
season, not by a retune, not by switching a habit off. A reward you can lose is a rental.

That also settles the season question without a second XP ladder: levels reset exactly as
they do now, and what you already unlocked does not. *"A new season resets your points,
not your rewards."*

`claimRewards()` records anything the current level has reached and returns only what is
**new**, so the caller can celebrate it — pushed onto the queue *behind* the level-up that
earned it, so the takeovers read as cause then effect. It runs silently once at boot,
which baselines an athlete arriving with history instead of firing fourteen takeovers at
them. The highest title they own is equipped for them; earning a name and then having to
go and switch it on is a step nobody asks for.

Reached from its own tab, **LOCKER** — the fourth on the main bar (Amir's own redesign,
2026-07-29, promoted it out from a row inside Progress). It opens on the shareable rank
card, then a horizontal rail of titles, a rail of card skins, and **the road**: every
reward in level order, the next one framed with a progress bar and its distance in XP —
the only forward-looking screen in the app; everywhere else reports the past.

Ranks, titles and medals all wear the same metal language (`METALS` in `habits.html`:
bronze → silver → gold → amethyst → prismatic). `rankCrest()` draws a tier-shaped,
metal-rimmed badge for a rank — the ladder, the Today hero and the share card all call
it, so a rank never looks different in two places. `titlePlate()` renders an owned title
as a metal nameplate; rarity follows the level it unlocks at (bronze under 13, silver from
13, gold from 21), except **event titles and PROOF ITSELF, which are always prismatic**
regardless of level. None of this changes what is earned or when — it is presentation
over the same `PASS_TRACK`/`ACHIEVEMENTS`/`EVENTS` data.

### The share picker — five cards, one painter

"Share it" (the Locker's card preview, and the button on every celebration takeover)
opens a **sheet**, not a single fixed image. `SHARE_CARDS` in `habits.html` lists five:
**Rank** (crest, level, title, season stats), **The day** (today's habits ticked — "the
one that explains itself"), **Streak** (the day streak, poster-loud), **Medal**
(`latestMedal()` — the newest thing worth showing off: a milestone if one exists,
otherwise the habit carrying the longest run), and **Month** (the calendar as a grid,
Wrapped-style). Each renders in three formats — Post 4:5, Story 9:16, Square 1:1
(`SHARE_SIZES`) — and **the preview IS the export**: `paintSharePreview()` calls the
exact same `buildShareCard()` the Save/Share buttons use, so there is no separate
low-fidelity thumbnail to fall out of sync with the real thing.

Every painter is a `{ ground, body }` pair in `SHARE_PAINT`, sharing a small canvas kit
(`scRR`, `scFit`, `scEyebrow`, `scStats`, `scConfetti`, …) so the five stay one family
rather than five one-off drawings. `scFooter()` always signs the card the same way —
the brand mark (or an "AA" fallback if the image hasn't loaded), "AA PROOF", and the
site handle.

⚠️ The **Month** card's calendar grid must fit inside a fixed body area that also holds
its stat boxes and the footer. A 5-row month (most months, depending on which weekday
the 1st falls on) is taller than a 4-row one, and in the shorter formats (Post, Square)
that extra row used to push the "most consistent habit" strip straight through the
footer text. The fix: row height (not column width) shrinks to whatever the month
actually needs — cells go a little short of square only when a 5th (or 6th) row would
otherwise overflow. Story, with 570px more room, never needs to shrink at all.

### Titles on the board (stage 17)

A title now appears **beside the athlete's name on the leaderboard and on the roll-call
wall** — the audience that makes a cosmetic worth having. Cards deliberately do not: a
card is drawn on the athlete's own phone, so nobody else reads it and nobody needs to
trust it.

That difference is the whole design. `CFG.pass.owned` is localStorage, and devtools would
hand anyone PROOF ITSELF, so the server keeps **its own record of what has been earned**
(`public.hab_titles`) and refuses to publish anything else.

**The record is minted, not recomputed** — and that is the part worth remembering, because
checking the title against the athlete's *current* level is the obvious design and it is
wrong twice over:

1. **Levels reset every season.** The day Amir opens Season 1 every athlete drops to level
   1, and a recomputing check would strip every title off the board at once while every
   Progress screen still showed them. The track exists precisely so levels *can* reset.
2. **Level used to move mid-season too.** Before stage18, `hab_bonus_xp` scored
   `daysWith3` and `perfectDays` off habits currently switched **on**, so adding a habit
   deleted perfect days already earned — dropping the level in **67 of 266** log lengths
   between 100 and 365 days (first at 105 days, level 21 → 20, which is IRONCLAD).
   *Days are settled units* fixed that, so this half no longer applies. Reason 1 alone is
   permanent and sufficient, and it was this measurement that made the case for minting.

So `hab_mint_titles()` records what the level has earned *at the moment it is called*, and
that row is permanent. Minting runs on boot, which is what captures the peak on the day it
happens; `set_title()` then only checks the record. **The threshold mirrors the client
exactly — season-scoped, because that is what `overallLevel()` measures.** Scoring career
XP server-side instead would mint titles the athlete's own app never awarded.

Three rules follow on the client, all in `pushTitle()`:

- equipping is **local and instant** — it is their screen, and it must not wait on a round
  trip to feel like it worked;
- the push only happens once they are **on the board**, the only place a title is
  published. Off the board they can still wear one; it shows on their card;
- a refusal takes the title **off**, never out of `owned`. Wearing is revocable, owning is
  not.

`syncTitles()` reconciles the server's record back into `owned` on boot and **only ever
adds**: the server's copy survives a cleared browser, the client's survives being offline,
and the union is the truth.

⚠️ The track lives in **two places** — `PASS_TRACK` in `habits.html` and `passTrack` on the
`xp_rules` row. Same rule as `QUEST_POOL`: change both together, or the server will refuse
a title the app has already handed out. The server stores only `id → level`; names and
notes are presentation and stay in the app.

---

## The eight habits

| Habit | Target | XP | Notes |
|---|---|---|---|
| **WORKOUT** | 1 session | 100 | **Locked** — only a finished session earns it. See below |
| STEPS | 10,000 | 60 | Entered as a number |
| SLEEP | 7.5 h | 50 | Entered as a number |
| FUEL | 3 meals | 40 | Counter |
| WATER | 8 glasses | 30 | Counter |
| MOBILITY | 10 min | 30 | Tick |
| BREATHE | 10 min | 20 | Tick |
| SUPPS | 1 dose | 20 | Vitamin D · creatine · omega-3 |

Athletes can switch any of them off and add their own (worth `customXp`, 25).

**Onboarding** is one screen that *suggests* this set with every item as a toggle —
it decides nothing for them, and everything stays editable in Settings afterwards.
**The locked habit says so on that screen**, in clay, under its name: it used to be sold
there as the highest-value habit on the list with its switch on and no mention of the
padlock waiting on the very next screen. The free wording states the lock and stops —
it does **not** suggest switching it off to reach 100%, because `proof.html` promises the
opposite in public and in Amir's own first person.

Pressing **Start tracking** goes straight into **the tour** (below).

**A counter takes at most `dailyCap` × its target in a day** (3×, so 30,000 steps).
Daily XP never needed a ceiling — `xpFor()` stops at the target — but a `total:`
quest counts raw units, and the server scores whatever the log holds. See
[`XP_SYSTEM.md`](XP_SYSTEM.md) §1.

**Off and removed are different things, deliberately.** The toggle beside a habit
*pauses* it: it leaves the daily list, keeps every point it has banked, and can come
back. The ✕ beside a custom habit *removes* it — and takes its logged values out of
the log with it. That second half is not tidiness. The app stops counting a habit
the moment it leaves `CFG.custom`, but the server's `hab_xp()` walks every key in a
day and pays `customXp` for anything it does not recognise, so a left-behind key
went on scoring on the leaderboard and nowhere else, and the two could never
reconcile. `removeCustom()` in `habits.html` owns this; anything else that drops a
habit has to do the same.

> **STEPS and SLEEP are entered by hand**, not synced from a phone's health app. A
> website cannot read Apple Health or Health Connect — there is no browser API for it,
> and Google shut its Fit REST API down on 30 June 2026. Reading steps automatically
> needs one of: a native/Capacitor wrapper app, a per-athlete Apple Shortcut that POSTs
> the number daily, or a paid aggregator (Terra/Vital) — see the open question at the
> foot of this file. Until then, they are manual and unlocked.

### The WORKOUT habit is LOCKED and fed by the training programme — through the server

**Athletes cannot tick it by hand.** The row shows a padlock and the line *"Complete any
day of your Workout in your Program to gain XP for this."*, with an arrow across to the
programme; tapping the box explains rather than doing nothing. The habit-detail screen
replaces its log button with *Open your programme*. Once earned, the padlock becomes a
normal tick.

**These are two separate apps.** Neither reaches into the other's storage, and
neither carries the other's logic. The only thing they share is a fact that lives
on the server.

When an athlete hits **Finish Session** in `program.html` — full session or partial,
because they showed up either way — that app records the session to `session_history`
exactly as it always has. Proof then reads the *dates* back through a small read-only
RPC, `get_workout_days`, and ticks its WORKOUT habit for those days. The completion
card in the programme app says *"Counts as your Workout habit"* with a shortcut across.

Why it's built this way:

- **`program.html` writes nothing into Proof.** It has no habit log, no XP maths, no
  level formula. Its entire habit footprint is two shortcut cards and a link.
- **Proof reads nothing from `program.html`'s storage.** It asks the server.
- **`program.html` never syncs `<id>_hab_*`.** Those keys share an origin but belong to
  Proof, which merges them conflict-safely; a stale programme app would otherwise
  overwrite habit progress logged on another device.
- **The server is simply the truth.** Because the habit is locked, the import is
  idempotent — no once-only bookkeeping is needed, since the athlete cannot untick it
  and disagree.

**For a free user there is no programme to open**, so the row's line changes to
*"Coached athletes earn this from their programme. It is the biggest habit on the list."*
and the arrow points at `/form.html`. The habit stays visible rather than being hidden —
it is the one thing on the list they can see and cannot have, and that is a fairer pitch
than a paywall banner.

The habit's id is still `strength` internally so that renaming it to WORKOUT didn't
orphan anyone's history or XP.

Only sessions from the current season's start are ever imported — see Seasons below.

SQL: `supabase/stage10_workout_days.sql` — **applied and live**.

---

## How progression works

Full detail and every tunable is in **[`XP_SYSTEM.md`](XP_SYSTEM.md)**. The shape:

- **Nothing about XP is stored.** Levels are recomputed from the logged history every
  load, so retuning the numbers rescores everyone automatically.
- **Points are weighted by health impact** — training most, then steps. Counter habits
  pay pro-rata as you go plus a bonus for finishing.
- **Each level costs more than the last** (`base × n^growth`). One full day reaches
  level 2; roughly two months of solid work reaches level 20.
- **Ranks**: 10 names × 5 sub-levels — ROOKIE · CONTENDER · GRINDER · OPERATOR ·
  ENFORCER · PREDATOR · MACHINE · RELENTLESS · UNTOUCHABLE · IMMORTAL. Past 50 they
  prestige and start again carrying a star. No ceiling.
- **Every habit has its own level** on the same curve scaled to its own value — so a
  habit's level measures *how often they do it*, not how hard it is.
- **Consistency ladders**: five tiers per habit (5/10/20/30/60 consecutive days),
  earned on the best run ever so breaking a streak never revokes a badge.
- **Celebrations**: full-screen takeover for an overall level, a rank promotion, a
  consistency tier, a milestone, or a perfect day. Three grounds — near-black for a
  level, clay for a rank, deep green for the rest — so the *kind* of win is legible
  before the words are. Routine habit levels flash inline instead, so day one isn't
  nine takeovers, and same-day tier clears across several habits coalesce into one.
  Full rules in [`XP_SYSTEM.md`](XP_SYSTEM.md) §5.

- **The badges pay** (since stage 12). Clearing a consistency tier or unlocking a
  milestone is worth real XP, on the **overall** ladder only — never on a habit's own,
  which has to stay a pure count of how often it was done. Two rules make it safe:
  each bonus is paid **on the day it was crossed**, so windows filter it like any other
  amount and nothing has to be stored; and **runs are measured from the season start**,
  so every season everyone can earn them again. Tier values are a multiplier on *that
  habit's* daily value, so a workout streak outpays a supplements streak. Detail in
  [`XP_SYSTEM.md`](XP_SYSTEM.md) §4.5.

---

## Days are settled units

**A day is scored against the habits that were switched on that day, and once a day is
closed it never moves again.** Changing what you track changes what happens next, never
what already happened.

This is the athlete's mental model and it is the only defensible one. Someone who tracked
five habits and cleared all five for five days had five perfect days. That is a fact about
those days. Adding a sixth habit on day six is a decision about day six.

### What enforces it

The tracked set is a **timeline**, not a snapshot — `CFG.roster`, one entry per change,
each naming the day it took effect:

```js
CFG.roster = [ { from:'2026-07-26', ids:['strength','steps','sleep','fuel','water'] },
               { from:'2026-08-01', ids:['strength','steps','sleep','fuel','water','mobility'] } ]
```

A handful of entries a year, not one per day, so XP stays a pure function of what is
stored. `rosterOn(dayKey)` returns the entry in force, and the three measures that need a
denominator read it instead of `live()`: `dayPct()`, `isPerfect()`, and the
`daysWith3`/`perfectDays` counters in `bonusEvents()`. The day-streak follows for free,
because `dayQualifies()` is built on `dayPct()`.

⚠️ **`live()` is the present tense only** — what to draw on Today, what to nudge, what a
perfect day is worth from here. **Anything that takes a `dayKey` must use
`rosterOn(dayKey)`.** That is the entire invariant and it is one line to get wrong.

Only **`stampRoster()`** writes the timeline, and it only ever appends. It is called from
`saveCfg()`, so every path that can change the tracked set is covered — both toggles,
adding a custom habit, removing one, and anything added later — rather than four call
sites somebody has to remember. Two rules keep it tidy: a change on a day that already has
an entry overwrites it, and a change that lands back where it started collapses instead of
stacking.

**Changes take effect from today, not retroactively and not tomorrow.** Today is still an
open day — inside the 3-day backfill window and still actionable — so a habit added this
morning counts this evening. Yesterday is closed.

**Existing athletes were seeded, not rescored.** The first stamp is dated at the athlete's
first logged day with the roster they already had, so their history scores exactly as it
did before this shipped. `anchorRoster()` pulls that first entry back if history arrives
after it was stamped — on a new phone `loadLocal()` finds nothing and `syncFromCloud()`
has not run yet. A day older than the whole timeline reads the *first* entry, so nothing
mis-scores even if the anchor never runs.

### What it fixed

All three measures used to call `live()` — the roster the athlete had *right now* — and
re-judged every day in history against it. `hab_bonus_xp()` did the same server-side.
Proven on both scorers, 120 days of history, identical numbers client and server:

| | perfect days | bonus XP |
|---|---|---|
| five habits, 120 clean days | 120 | 4,345 |
| …then a sixth added, **old** | 0 | **3,845** — 500 XP deleted |
| …then a sixth added, **fixed** | 100 | **4,345** — kept |
| six habits, one never done | 0 | 3,625 |
| …then that one switched off, **old** | 120 | **4,125** — 500 XP invented |
| …then that one switched off, **fixed** | 20 | **3,625** — honest |

The 500 is `CN` (perfectDays ≥ 100). The second direction is the worse one: nobody would
ever report free XP. Base XP was never affected — `habitXp()` pays per habit per day, so a
new habit adds nothing and a paused one keeps its points. It was only ever a denominator
problem.

`hab_bonus_xp()` carries the same timeline server-side (`supabase/stage18_day_rosters.sql`):
`daylive` replaces `livehab` with one row per day-and-habit, and `nlive` became a column on
`perday` rather than a scalar for all time. It reads `roster` straight off the config —
`hab_cfg_of()` returns the whole blob, so it rides along with `on` and `custom`. Verified
45/45 identical to the old function on configs with no timeline, which is the path every
athlete is on until they open the new build.

---

## How it feels — the motion layer

Proof is meant to read as a game, not a form. The mechanics of that live in a few
places, and one of them is load-bearing:

**The renderer morphs; it does not replace.** `render()` builds the same HTML string
it always did, then patches it into the live DOM node by node. **Do not reintroduce
`app.innerHTML = …`** — it silently breaks three things at once: scroll jumps to the
top on every tick, every `transition: width` becomes dead code (the bar it animates is
a new node born at its final width), and each screen's entrance fade replays on every
tap. Two attributes steer the patch:

| Attribute | Means |
|---|---|
| `data-k` | Identity. A different key in the same slot is replaced outright, not patched — that's how a screen change still fades while a check-off doesn't. Screens, habit rows, overlays and each queued celebration all carry one. |
| `data-static` | "This subtree is mine, not the template's." The `#fx` layer where XP chips are mid-flight, and any figure the counter engine owns. |

**The tick.** Figures marked `data-num` are animated by `syncNumbers()` rather than
printed (the template only says where the number should *end up*, via `data-to`);
bars marked `data-fill` grow from zero on first paint and tween on every change
after; ticking a habit sends a clay `+XP` chip arcing from the row to the level hero
via `flyXp()`, which then takes the hit; the checkmark is a stroked SVG that draws
rather than a glyph that appears; and `haptic()` fires on tick, completion, level and
rank — a no-op on iPhone, since Safari still exposes no vibration at all.

**Navigation has a direction.** `navDir()` compares the two screens against
`TAB_ORDER` and `screenAnim()` slides the new screen in from that side; a detail or
the manual always pushes in from the right and pops back out to the left. The active
tab is one `.tabslab` that *slides* between cells with the labels inverting under it,
rather than a background that teleports between buttons.

**The screen is never quite still.**

| Thing | What it does |
|---|---|
| **Streak ember** | `emberLevel()` — a clay square that breathes from 5 days, faster from 15, and genuinely flickers past 30. The streak stops being a fact and starts being something you don't want to lose. |
| **Idle attention** | `armIdle()` — 20s after the last tap, the box of the most valuable *unlocked* habit still undone starts breathing. Only on Today, never over a sheet or a celebration. |
| **Streak at risk** | `atRisk()` — after 20:00, if the day doesn't qualify **and there is a real streak on the line**, the day bar goes clay and the nudge changes tone and copy. Gated on `currentDayStreak() > 0` so it threatens something real instead of nagging. |
| **Typing nudge** | `typeLines()` — the clay card types itself out. |
| **Grid cascade** | The 35-day grid arrives row by row on an 11ms stagger. |
| **Board race** | Leaderboard rows stagger in, each with a bar drawn against the leader's score, so the gap is visible rather than arithmetic. |

> ⚠️ **The typing nudge is a layout trap.** It keeps the untyped remainder in the DOM
> (invisible) and uses a **zero-width caret**, so the card occupies its final height
> from the first frame. Typing into an emptied element grows the card as it goes,
> which shoves everything below it and drags the scroll position with it — that
> regression cost 25px of scroll drift per tick before it was caught. The element is
> `data-static` (the renderer must not fight the typer for its text) and keyed by the
> *line*, so a new nudge replaces the node and retypes while an unchanged one is left
> alone.

**Phone manners.** `bindGestures()` binds once per node (the renderer keeps nodes
alive, so binding per render would stack listeners): the log sheet **drags away under
your thumb** — past 30% of its height or 120px it dismisses — and a stepper button
**repeats when held**, 420ms before it starts and ~9/sec after, so logging 10,000 steps
is not forty taps. Dragging is ignored when the gesture starts on a control inside the
sheet.

> ⚠️ **The repeat must have an exit that does not depend on the button.** It is held
> in `_repHold` / `_repTimer` at module level, not in a closure, and it is killed by
> a `pointerup`/`pointercancel`/`blur` **on the window** as well as on the button —
> plus an `isConnected` check inside the tick. As a per-button closure whose only
> exits were events on that button, missing all three (sheet dismissed under the
> thumb, pointer captured elsewhere, app backgrounded) left the interval running
> forever, clicking a control nobody was touching: the number drained 500 at a time
> while the athlete watched it.

**Sound** is off unless the athlete turns it on (Settings → Sound). It is *synthesised*,
not loaded — a short square blip through WebAudio, so it costs no bytes and cannot fail
to download. It rides inside `haptic()`, so every existing call site gets it for free.
This is also the only feedback an iPhone actually gets, since Safari exposes no
vibration API at all.

All of it is off under `prefers-reduced-motion`, which `reduced()` checks live.

---

## Seasons — scoring resets on command

Scoring runs in **seasons**, like ranked play. Only days on or after the current
season's start earn XP — for the athlete's own level *and* for the boards. Earlier days
stay in their history and still count toward streaks and consistency badges; they just
don't score.

**Currently `Pre-Season`, opened 26 July 2026.** Amir launches the real thing with one
SQL command:

```sql
select public.start_season('Season 1');                -- starts today
select public.start_season('Season 1', '2026-08-01');  -- or a chosen date
```

Nothing is deleted — it inserts a row in `public.seasons` and every score is recomputed
from that date. Athletes' apps pick it up on next open with a toast. XP, levels and both
boards reset; logged history, streaks and consistency badges do not.

This also gates the workout backfill: without it, one athlete's 41 days of past sessions
would have landed as an instant head start. Full detail in
[`XP_SYSTEM.md`](XP_SYSTEM.md) §7. SQL: `supabase/stage11_seasons.sql`.

---

## The leaderboard

- **Opt-in.** No row in `leaderboard_optin` means invisible.
- Athletes pick their **own display name** (defaults to first name + last initial) and
  can rename or leave at any time.
- Others see **that name, their points, level and rank** — nothing else.
- **Two boards**: *this season* (the default — every point since the season opened) and
  *past week* (a **rolling** seven days: today and the six before it, so a strong week
  always shows instead of emptying every Monday). Neither ever counts a day from before
  the season started.
- **Scored in Postgres** from the log already stored server-side. The app submits no
  number, so editing local storage cannot buy a place.
- **No athlete ids are ever returned** — an id alone would let one client fetch
  `/data/<id>.json` and read another athlete's whole programme.
- **Reading the board is key-checked**, so client names never reach the open internet.

SQL: `supabase/stage9_leaderboard.sql`. **Applied and live** (26 July 2026), along with
`stage10_workout_days.sql`, `stage11_seasons.sql`, `stage12_bonus_xp.sql`,
`stage14_quest_runs.sql` and `stage15_roll_call.sql`.

> Because scoring happens on the server, the XP rules exist in **two places**:
> `XP_RULES` in `habits.html` and the `xp_rules` row in Supabase. Change both together.

> ⛔ **The `supabase/` folder is a changelog, not a schema.** Later stages redefine
> functions from earlier ones and the earlier file keeps its stale copy, so a
> "safe to re-run" banner is only true if nothing after it touched the same
> function. `stage12_bonus_xp.sql` is the live example: its `leaderboard_top` calls
> a `hab_bonus_xp` overload that no longer exists, and re-running it would point
> the board at rules the athletes' own screens do not use — silently, with no
> error. The current `hab_bonus_xp` **and** `leaderboard_top` both live at the foot
> of `stage14_quest_runs.sql`. Before running or trusting any of these files, read
> the live definition first:
> `select pg_get_functiondef(oid) from pg_proc where proname = '…' and pronamespace = 'public'::regnamespace;`

---

## Never losing progress

The athlete's phone is the record; the server is the mirror.

- Every change is written to localStorage **first**, then flagged unsent — and the flag
  is itself persisted, so an app killed while offline still knows there's work to send.
- Retries back off (5s → 15s → 45s → 2m → 5m) and re-fire on reconnect, on foreground,
  on `pagehide` and at every launch.
- Each push sends the **complete snapshot**, so a newer push supersedes an older one.
- The cloud merge keeps the **larger** logged value per habit, so a stale device can
  never erase a real number.
- Settings shows live sync state and a *Sync now* button.

Storage keys, all owned solely by Proof: `<id>_hab_cfg` (settings), `<id>_hab_log`
(the daily log), `<id>_hab_meta` (sync state). They ride the existing `save_progress` /
`get_progress` functions into the same `athlete_progress` row the programme app uses —
**no tables of its own** except the leaderboard's two. `program.html` explicitly skips
these keys when it syncs.

---

## Voice

Dry, blunt, a little rude — the same coach who says *"your hamstrings have filed a
complaint with HR"*. The whole nudge library (`NUDGES`, 83 lines) is written in it, and
anything added to it has to be: never chirpy, never therapeutic, funny because it is
true. Tokens available in a line are `{n}` (how many are left), `{name}`, `{unit}` and
`{st}` (streak days). Never chirpy, never therapeutic. It notices what you skipped and
says so. Uppercase Barlow Condensed for anything structural; sentence case for the
lines that talk to you.

Design language is the PROOF modernist system on AA's palette: zero border radius,
2px section rules, 1px row rules, flush-left, typographic (no icon set), green as the
accent with clay for the nudge card and mono meta.


---

## Open question — automatic steps

Amir wants STEPS locked and filled from the athlete's health app, the way WORKOUT is
locked and filled from the programme. **This cannot be done from a website.** There is
no browser API for Apple Health or Android Health Connect, and Google's Fit REST API
(the one route that used to work server-to-server) was shut down on **30 June 2026**.

Three routes that would actually work, cheapest first:

1. **Apple Shortcuts automation (iOS, free).** The athlete builds a Shortcut —
   *Get Health Sample → Steps → Today → Get Contents of URL (POST)* — and a Personal
   Automation that runs it daily. It posts to a Supabase edge function that writes the
   number, and Proof reads it exactly like it reads workout days. No app store, no
   native build. Costs: iOS only, ~2 minutes of one-time setup per athlete, and Apple
   sometimes requires confirming the automation.
2. **An aggregator (Terra, Vital, Rook).** One API covering Apple Health, Health
   Connect, Fitbit, Garmin, Oura, Whoop. Real money monthly, and for Apple Health the
   athlete still installs the aggregator's companion app or we embed their SDK in a
   native app — so it does not remove the native requirement, it just outsources it.
3. **Wrap Proof in Capacitor and ship a real app.** Reads HealthKit and Health Connect
   natively and properly. Costs: Apple and Google developer accounts, review, builds,
   and ongoing maintenance — and it contradicts the standing "don't make my apps heavy"
   rule.

**Recommendation: option 1** for the athletes who want it, keeping manual entry as the
default for everyone else. It is free, needs no native app, and slots into the existing
server-fed pattern. Do not lock STEPS until a source exists, or athletes simply cannot
earn it.
