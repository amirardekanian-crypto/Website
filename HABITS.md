# 🎯 Proof — the habit app brief

The "what this app actually is" context doc for **`habits.html`**, the daily habit
tracker that sits alongside the training programme. Pair it with
**[`XP_SYSTEM.md`](XP_SYSTEM.md)** (every tunable number and what changes when you
move it) and **[`CODEBASE.md`](CODEBASE.md)** (the technical file-by-file map).

Start here if you're picking this up in a fresh chat.

> **⚠️ Keeping this honest.** When you change how the app works, these must move
> together: **this file**, **`XP_SYSTEM.md`**, **`QUESTS.md`** (if you touched a quest),
> and the **in-app manual**
> (`renderManual()` in `habits.html`, which athletes read from Settings → *Read the
> manual*). The manual reads its numbers straight from the live constants, so
> retuning XP never breaks it — but if you change *behaviour*, its prose needs
> updating by hand. Same for `privacy.html` if you change what data is shared.

---

## The product in one breath

**Proof** is a gamified daily habit tracker for Amir's coaching clients. The training
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
| Proof | `program.html` | **Your training programme** card at the bottom of Today, and a row in Settings |

Both are the same origin with the same PWA scope, so tapping through from an installed
app stays inside the app shell — no browser bounce, no second install. Each handover
passes the client id and the resolved key, because an installed PWA often opens
without `&key=` in the URL.

---

## The four tabs

### 01 · TODAY — the daily loop
The screen they actually live on. **In this order, and the order is the point:**

1. **Level hero** — overall level, rank label, XP, and one bar: progress to the next
   level. Today's own completion is *not* repeated here; the header and the day strip
   both already carry it, and a second green bar of the same shape directly beneath the
   first read as one broken double-bar.
2. **The day strip** — four chips (`TODAY · SAT · FRI · THU`), each showing that day's
   completion, that choose **which day you are logging**. See *The backfill window* below.
3. **The habit list** — tap the box to tick, tap the name for that habit's history, tap
   `+` on counter habits. Each row shows that habit's own level and current streak.
   Only counter habits carry a progress track; on a check-off habit it could only ever
   read 0% or 100%, which was noise on half the list.
4. **The nudge** — one clay card whose copy reacts to what is actually missing, drawn at
   random from a library of **83 lines across 13 situations** (`NUDGES`): one bucket per
   habit, plus nothing-logged-yet, one-habit-left, all-done, streak-at-risk and
   streak-rolling. The pick is seeded on the date, so it is **stable all day and rotates
   tomorrow** — over 21 days a bucket of 10 uses all 10 lines with no back-to-back
   repeats. Its button opens the habit in question. The "nudge" half of *nudge and recap*.
5. **Quests, when a run is on** *(catalogue: [`QUESTS.md`](QUESTS.md))* — targets for the *week* rather than the day, worth real
   XP, with live progress and a countdown. **There are usually none**: quests only exist
   while Amir has a run going, and a run lasts 7 days from the day he starts it. That is
   the point — seeing them means something is on.
6. **Roll call** — the compose box for the day's one sentence. See *Roll call* below.
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

#### The backfill window
Nobody logs perfectly on the day, every day, so **the last `BACKFILL_DAYS` (3) days plus
today are editable**. The day strip switches which day the taps land on; past that the
log is closed. The limit is the feature — a record you can rewrite whenever you like is
a diary, not evidence.

While an earlier day is selected the screen says so unmistakably (clay banner, the header
title becomes the weekday, `· FILLING IN` in the eyebrow), and **the nudge and the roll
call box stand down** — both are statements about *now*, and "drink three more glasses"
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
  about and no second display name. Not joined → the box becomes an invitation.
- **Today only**, even though the log itself is editable for three days. Fixing
  Saturday's steps is admin; rewriting what you *said* about Saturday is not.
- **It pays no XP.** The moment a sentence earns points you get one character of
  gibberish every night at 23:58. The reward is that your line sits next to your rank.
- **The box asks a question** rather than showing a blank field — 20 prompts in the
  `prompt` bucket of `NUDGES`, rotating daily on the same seed as every other line.
- **Leaving the board hides your lines** immediately, without deleting them. Re-joining
  brings them back.

Read it on the **BOARD** tab, second view.

### 02 · PROGRESS — where do I stand
Habits and achievements merged, because they were two views of one question.

**A slim level strip** (not a repeat of Today's hero — two of the four tabs used to open
with the identical 76px level block) → **four season stats**: days logged, badges, day
streak, perfect days → a one-line **key explaining the consistency pips**, which had no
legend anywhere in the app and are empty for the first five days → **one row per habit**
(its level, rank, XP, progress bar and five pips, tapping through to full history) →
paused habits with their banked XP → the nine one-off **milestones**.

Days-logged leads the stat grid deliberately. Streak and perfect-days are both zero for
anyone rebuilding after a bad week, and opening your own progress on a pair of zeros
punishes exactly the athlete who most needs to keep going. Showing up is the stat that is
almost always positive, and it is the one that earns the others.

A habit row's meta line is **rank · XP** only. It used to append today's status too,
which wrapped every row to two lines and restated what Today already says — Progress is
about standing, not about today.

**Habit detail** (reached from here or from Today) shows that habit's rank and level
progress, a log button, its consistency ladder, this-week / best-streak / 35-day-rate
stats, a 35-day grid, and the last five days with the XP each earned.

### 03 · SETTINGS
Profile · **The ranks** (the ladder, below) · **Read the manual** · link to the
programme · sync status and a *Sync now* button · leaderboard status · dark mode ·
which habits are tracked (plus adding custom ones) · reset today's log.

Deliberately *not* here: coach volume, motivation display, replay onboarding. The app
has one mode — XP and levels, nudge and recap — and doesn't ask athletes to configure it.

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

### 04 · BOARD
Opt-in only. Two views, switched at the top: **Leaderboard** and **Roll call**.

**Leaderboard** has two scopes: **this season** (the default) and **past week** (a rolling
seven days, not a calendar week). See below.

Rows show **movement, not just standing**: a ▲/▼ chip against each name, and a green
banner when the athlete has overtaken someone — *"You passed Bo and Cy since you last
looked."* The server returns no history, so the last standing is remembered per scope
on the device (`CFG.lbSeen`) and the next fetch is diffed against it.

**Roll call** is the wall: the last seven days of one-sentence entries, grouped by day,
newest first, each line carrying the writer's display name, season rank and that day's
completion percentage. **Amir's own line leads its day** (clay left border, `YOUR COACH`)
— set it with `select public.set_coach_note('…');`. A day reads top-down as *here is the
brief, here is who answered*. Written on the TODAY tab; see *Roll call* above for the
rules and the reasoning.

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
