# Career Mode: the gamification system

> **Start here.** What the system is, what each part is for, and the decisions behind it. How each part is worked
> out, step by step, is in **[`PROCEDURES.md`](PROCEDURES.md)**. Every number and every badge, title, mission and quest
> lives in the `.toml` files beside this one, and **[`README.md`](README.md)** says which file to open to change what.
>
> **Status (2026-10-17): phase 1 is live, in shadow** (applied on Amir's *"yes, apply it"*). The fact ledger
> (`supabase/stage66_career_mode.sql`) turns every save into facts on the server, the rulebook and the catalogue are rows
> made from these files (`python scripts/career_seed.py`), and on the live project Career Mode's habit XP equals Proof's
> for every athlete (34 of 34). Nothing an athlete sees reads it. The rest is the design the build follows, phase by phase (*Build order*, below). Change anything
> here first, then build; a changed file is re-seeded (`README.md`, *How to change something*).

---

## In one breath

Every meaningful action an athlete takes becomes a **fact**. Every fact earns **XP** and can unlock a **reward**, and
every reward stands for one of four words: **consistency, commitment, progress, resilience**. **Weekly missions** and
**personal quests** point at what to do next. The size of a moment decides **who hears about it**: the athlete, Amir,
the crew.

*Meaningful* means two things at once: Amir would want more of it, and the app can see it happen.

## Where it came from

- **Amir's brief, 2026-10-17:** *"first i want to create a system that celebrates achievements and progress and
  consistency. any meaningful action earns progress and get recognised by the client, the coach, and a community. it
  should have game mechanics like total xp and level, titles, badges, achievement. all of these mean something,
  consistency, commitment, progress, and resilience. i want to have weekly missions and personal quests. the details
  can be added or changed later."*
- **The pages:** the blueprint, https://claude.ai/artifact/42WHTUzoxmnr6axP64QNGN, and ideas round 3 (*Bragging
  Rights*), which it grew from, https://claude.ai/artifact/SV2d9r6SL7kq7RLBiAdewS.
- **The decisions, 2026-10-17:** Amir, *"go with your picks"*, on all eight (below). And: *"write down the functions and
  procedures into files i can then change, adjust or anything. i need to have this gamification system somewhere i can
  read and think about"*. This folder is that place.
- **The catalogue, 2026-10-17:** the four meanings worked out one by one on the page *Four Majors*,
  https://claude.ai/artifact/1wa7BQgeMAMipm24Fwzo1z. Amir: *"go with your picks, just remember that we need to show the
  client a visible progress and immediate feedback every time a meaningfull task is completed"* (GAME-13).

## The decisions (settled 2026-10-17)

| # | The question | What was chosen |
|---|---|---|
| 1 | Does the level ever reset? | **Never.** The level is the career. Seasons reset only the board's points. |
| 2 | Where does the game live? | **AA Proof is its home**: the profile (the Locker grows into it), Crew, missions and quests. The training app feeds it and shows one strip on Home: the level and this week's missions. |
| 3 | One scorer? | **Yes, on the server.** Proof's phone scorer becomes a preview that shows a tick's XP at once. |
| 4 | How big is the training? | **About half of a perfect week's XP.** Today it is 15–19%. |
| 5 | Which week? | **Missions run Monday to Sunday**, the same week for everyone, so a crew mission works. A held week keeps the plan's own training week. |
| 6 | What does the crew see? | **Only what the athlete agreed to show**, asked once at their first highlight, with a switch in Settings. Amir always sees everything. |
| 7 | Who sets the quests? | **The athlete picks one of three Amir approved, and Amir can assign one directly.** A cycle's outcomes can also become a quest. |
| 8 | The name | **Career Mode.** |

**The catalogue decisions (round 2, 2026-10-17, *Four Majors*):**

| # | The question | What was chosen |
|---|---|---|
| 1 | Tennis words in the names? | **Yes, each with a plain line under it**, so a runner gets it too: Hold Serve, Second Serve, Love Hold, All-Court, Grand Slam. |
| 2 | One behaviour, one badge? | **Yes.** Each habit keeps one badge, its Proof name, on five steps (at the switch). A streak no longer pays twice. |
| 3 | Retire HEAVY METAL, The Machinist and Day One? | **Yes.** HEAVY METAL paid for sessions on days in a row; the other two counted what Century and First Blood count. Anyone who has one keeps it. |
| 4 | A lower RPE alone earns nothing? | **Yes.** It still shows on the This cycle card; a Progress reward needs the weight or the reps to go up. |
| 5 | The Grand Slam as the capstone? | **Yes.** A title in each meaning makes a fifth title. A Calendar Slam (all four in one season) can come later. |
| 6 | Free athletes see the Progress shelf locked? | **Yes**, as the pitch for coaching, the way the locked WORKOUT habit works today. |
| 7 | The twelve new pieces? | **All twelve:** The Long Count, Pulse Check, Love Hold, Veteran, The Upgrade, Flawless, Full Stack, By the Book, All-Court, Double Up, All the Way Back, The Proving Ground. |

And with it, a rule: **every meaningful action answers at once, visibly** (GAME-13).

---

## The loop

```
  the athlete does something meaningful
                │
                │  saved once, as a FACT: who, which day, what, the numbers
                ▼
      ┌───────────────────┐
      │  the fact ledger  │──────► XP ─► level ─► rank            (rulebook.toml)
      └───────────────────┘──────► badges, achievements, titles  (badges/achievements/titles.toml)
                │        └───────► missions and quests move       (missions/quests.toml)
                ▼
      RECOGNITION, by the size of the moment                      (recognition.toml)
        the athlete · Amir · the crew · beyond
                │
                ▼
      being seen brings the next action
```

One record (the facts) feeds everything else. That is the whole design: an action is saved once, and every number,
reward and message is worked out from it.

## The four meanings

Amir's four words. Every XP source, badge, achievement and title belongs to one of them, and says in one sentence what
it proves (GAME-3). Each meaning has **one number** on the athlete's profile, so the profile reads as four plain facts.

| Meaning | What it says | Earned by | Its number |
|---|---|---|---|
| **Consistency** | You keep showing up. | Habits done, days on target, weeks held, missions done week after week | **Weeks held** in a row, and the best |
| **Commitment** | You do the whole thing, properly, for the long run. | Sessions finished as written, every set logged, the check-in, a retest done, a cycle finished, the roadmap finished | **Sessions with Amir** |
| **Progress** | You are getting better. | Personal bests, heavier at the same effort, a retest beaten, a habit levelling up, a quest step | **Personal bests** |
| **Resilience** | You come back, and you keep going when it's hard. | A comeback, a held week straight after a broken one, a cycle finished despite a broken week, a Return quest Amir signs off | **Comebacks** |

**A free athlete** (Proof only, no programme) reads the same four from habits: days on target, perfect days, habit
levels, comebacks.

Proof already holds some of this: its consistency tiers (KINDLED to UNBREAKABLE) are Consistency, and its comeback,
BACK IN THE FIGHT, HARD TO KILL and the UNBOWED title are Resilience. They carry over unchanged.

### Each meaning in full (decided 2026-10-17)

Every meaning is built the same way: its number, an arc (something to earn in the first week, month, season and year),
badges, moments, titles, what points at it, and what it never pays for. The exact tiers, XP and sizes are in the `.toml`
files; this is the shape.

**Consistency: you keep showing up.** Number: weeks held in a row (a free athlete: days on target in a row).
- Arc: *Held* (first week held) → *Hold Serve I* (4 in a row) → *Hold Serve III* (12) → **CLOCKWORK** (52).
- Badges: **Hold Serve** (weeks held in a row, 4 · 8 · 12 · 24 · 52) · **The Long Count** (weeks held in all, which a
  broken run never takes back) · **Day Streak** · one badge per habit under its Proof name (HUMAN SPRINKLER, BLACKOUT
  ARTIST, GROUND COVERED, FULLY FUELLED, ZEN MACHINE, RUBBER BAND, IRON MONK; custom habits: HOUSE RULES) on five steps
  named KINDLED to UNBREAKABLE · **Treble** (weeks in a row with all three missions).
- Moments: Held · First Treble · **Flawless** (every week of a cycle held) · **Full Stack** (steps, sleep, fuel and
  water each on a 7-day streak at once).
- Titles: CLOCKWORK · THE CONSTANT (100 weeks held in all) · BEDROCK · STILL HERE.
- Never pays for: a session on a rest day.

**Commitment: you do the whole thing, properly, for the long run.** Number: sessions with Amir (free: perfect days).
- Arc: *First Blood* (first session) → *Paper Trail I* (10 sessions fully logged) → *Closer I* (first cycle finished) →
  **CENTURY** (100 sessions).
- Badges: **Century** · **Closer** (cycles finished) · **Paper Trail** (every set logged) · **Pulse Check** (the check-in
  done first) · **Love Hold** (weeks held by the book: every session, every set, every check-in) · **Veteran** (months
  with Amir) · CLEAN SWEEP · DAWN PATROL.
- Moments: First Blood · First Cycle · **By the Book** (a whole cycle by the book) · The Distance · The Centurion.
- Titles: CENTURY · THE DISTANCE · LIFER (two years with Amir) · MATCH FIT · SUN-FORGED · COLD-FORGED.
- Never pays for: a session past the plan, more volume, or the RPE number itself.

**Progress: you are getting better.** Number: personal bests. A free athlete sees this shelf locked: *Coached athletes
earn these from their programme.*
- Arc: *First Best* → *Record Breaker I* (5 bests) → *Beat the Test I* (first retest beaten) → **CLIMBER** (25 bests).
- Badges: **Record Breaker** (personal bests) · **Free Kilos** (heavier at the same effort) · **Beat the Test** (retests
  beaten) · **The Upgrade** (your most improved lift against its first session, +10 · +20 · +30 · +50 · +75%).
- Moments: First Best · **All-Court** (a best in every main movement pattern in one cycle) · **Double Up** (a lift twice
  its first number) · **The Proving Ground** (an event: three bests, a retest beaten, every week of the cycle held).
- Titles: CLIMBER · PROVEN (The Proving Ground) · NEW ENGINE (Double Up).
- No mission asks for progress, on purpose. Never pays for: a lower RPE alone, or body weight.

**Resilience: you come back, and you keep going when it's hard.** Number: comebacks (the same for a free athlete).
- Arc (it starts at a setback): *Second Serve I* (the week after a miss, held) → *Back on Court* (a full week after two
  or more away) → *Played Through* (a cycle finished despite a broken week) → *All the Way Back* (the old best run,
  rebuilt).
- Badges: **Second Serve** (a week held straight after a broken one) · **Hard to Kill** (comebacks that stuck, from
  habits and, after the switch, from training) · Back in the Fight.
- Moments: Back on Court · Played Through · **All the Way Back** · Backbone.
- Titles: UNBOWED · RETURNED · SECOND WIND (five bounce backs).
- Never pays for: a setback itself. *The one shelf you can't fill by never slipping.*

### The Grand Slam

One title from each of the four meanings, any one, makes a fifth title: **GRAND SLAM** (prismatic, the biggest moment in
the system). The road's level titles don't count: they celebrate the career level, the sum of all four. The profile shows
the four slots, filled with the title won in each.

### Left out on purpose

A streak of training days (rest days are part of the plan) · a medal for training on a low check-in (it pays for
reporting a low day) · a badge for a lower RPE at the same weight (it pays for typing a smaller number) · body weight or
lifts as a share of it (body weight is never scored) · a weekly "set a best" mission (it pushes past the plan's RPE) · a
level for each meaning (one level and four numbers say it) · badges for kudos or posts (GAME-6).

### For Amir: the shape of an athlete

coach.html shows each athlete's four numbers side by side (phase 4). Consistency high and Progress flat: the plan may be
too easy, or the effort low. Progress high and Consistency low: talent and an irregular week. Resilience climbing: life is
getting in the way, and a WhatsApp may matter more than the plan. Commitment low: thin data for the next cycle.

## The pieces: nine mechanics, one job each

| Mechanic | What it is | Its job | It never |
|---|---|---|---|
| **XP** | Points for every meaningful action | Shows effort adding up | Gets stored, or pays for a typed value |
| **Level and rank** | Worked out from career XP: ROOKIE to IMMORTAL, five levels each, a star past 50 | The long arc | Resets |
| **Season points** | XP earned inside the current season | A fair race on the board, for new and old athletes | Outlives its season; the season's title stays |
| **Badges** | A quality built over time, in five metals: bronze, silver, emerald, amethyst, prismatic | Depth in one meaning | Is taken back; it is judged on the best ever |
| **Achievements** | A moment reached once | The story of a career | Repeats |
| **Titles** | A name worn beside your name | Identity and status | Comes cheap: rare, one worn at a time, never taken back |
| **Weekly missions** | Three jobs for this week, picked for the athlete | Direction for seven days | Needs a claim button, or pays more than its share |
| **Personal quests** | One long goal in steps, set with Amir | Direction for 2 to 12 weeks | Fails: it pauses instead |
| **Recognition** | Who is told, by the size of the moment | Being seen | Goes past Amir without the athlete's yes |

**The rule of thumb:** if it has tiers, it is a badge. If it happens once, it is an achievement. If you wear it, it is
a title.

## Recognition: who hears about it

Five sizes of moment. Each badge tier, achievement, mission sweep and quest carries its size in the catalogue, and the
size decides the audience. The athlete always sees their own.

| Size | For example | The athlete | Amir | The crew | Beyond |
|---|---|---|---|---|---|
| **Tick** | Any action | XP moves | nothing | nothing | nothing |
| **Win** | A habit tier, a mission done | The wins card | nothing | nothing | nothing |
| **Highlight** | A best, a badge tier, 3 of 3 missions, 4 weeks held | The wins card | Courtside, the message written | The Bell, with their yes | nothing |
| **Milestone** | A new rank, a quest done, a cycle finished, session 100, a title | A full-screen moment | Courtside, with a heads-up when it can be seen coming | The Bell | A share card, theirs to post |
| **Legend** | The roadmap finished, Amir's Pick, a season title | A full-screen moment | Often his to give | The Bell | Amir's story, with their yes |

- **Courtside** is a short list on coach.html → Today: at most five moments a week, biggest first, each with a WhatsApp
  message already written in Amir's voice. Sending one is a tap. It is not a reason in `reasonsOf()`: good news never
  counts as "needs you".
- **The Bell** is a feed on AA Proof's Crew: a line per highlight, kept 7 days, only for athletes who said yes. One
  kudos per person per line. Kudos pays nothing (GAME-6).
- **Amir's own tools.** A **reaction** (one tap; the athlete sees *Amir saw this* on that moment; a mark, not a chat).
  A **commendation** (a badge only Amir gives, in any meaning, with one line of why). **Amir's Pick** (once a month,
  one athlete, a title nobody else will ever hold; the data shortlists three, Amir decides).
- **No chat comes back.** Every word from Amir still goes by WhatsApp.
- **Instant feedback, every time (GAME-13).** Amir, 2026-10-17: *"we need to show the client a visible progress and
  immediate feedback every time a meaningfull task is completed."* Every fact answers at once, on the thing tapped, before
  the server does: **what it earned** (+XP rising), **where it moved them** (the level bar fills, the meaning's number
  ticks up) and **the nearest goal it touched** with its new count (*Paper Trail 9 of 10*, *Lights Out 3 of 5*). A tier
  or mission it completes gets its moment right then; one only the server can decide shows at once, marked pending. A
  session's finish card lists everything the session earned before Done. The level bar and the four numbers are always
  on screen, each with its *next* line. The lines are `recognition.toml` → `[feedback]`; the steps are
  `PROCEDURES.md` → P17.

## Weekly missions

- **Three slots, picked for each athlete every Monday:**
  - **The plan:** the part of the programme they slipped on last week (a missed session, sets left unlogged, a skipped
    check-in, a retest due). Example: *Hold Your Week*. After a broken week it is *Second Serve*, the same job paid as
    resilience.
  - **The recovery:** their weakest habit last week. Example: *Sleep 7 hours on 5 nights*.
  - **The stretch:** something meaningful they rarely do. Example: *One recovery session from the Library*.
- **A crew mission** when Amir sets one: one goal for everyone with a shared total (*the crew holds 15 weeks*). It
  replaces Proof's Quest week lever. In Amir's words, weekly ones are **missions** and personal ones are **quests**.
- **Pays half of what the work inside it pays**, the same share for every mission (GAME-7). 3 of 3 adds a sweep bonus,
  and sweeps week after week build a Consistency badge (Treble).
- **Done by the facts.** No claim button. An unfinished mission ends on Sunday night, and nothing is lost.
- **Amir can pin, swap or pause** an athlete's missions for an injury, travel or exams.
- **A free athlete** has no plan slot: two recovery slots and the stretch.
- **No mission asks for progress, on purpose.** A personal best can't be ordered for a given week without pushing past
  the RPE the plan sets. Progress is paid by badges, achievements and quests.

## Personal quests

- **One at a time, two at most.** 2 to 12 weeks, 2 to 5 steps.
- **Three doors:** Amir assigns one from coach.html; a cycle's outcome becomes one; or the athlete picks one of three
  Amir approved for them (their choice, from his list).
- **A step closes on facts**, or on Amir's tick when only he can judge it: a first strict pull-up on video, a pain-free
  return.
- **Pays its share of the work**, plus a quest badge and sometimes a title. A finished quest always reaches Amir, and
  the crew with the athlete's yes.
- **Never failed.** A quest is paused or extended. A dropped quest leaves no mark.

## The engine, in short

The full account is in [`PROCEDURES.md`](PROCEDURES.md). The shape:

- **Facts** (one ledger on the server): every meaningful action, once. Written by `observe()` from what the apps already
  save: a session, the Proof log, a coach action. Derived facts (a held week, a best, a comeback, a cycle finished) are
  written by the same step.
- **The rulebook** (`rulebook.toml`): what each kind of fact is worth, the caps, the level curve, the shares.
- **The catalogue** (`badges.toml`, `achievements.toml`, `titles.toml`, `missions.toml`, `quests.toml`,
  `recognition.toml`): every reward and every mission and quest, each a block of plain settings.
- **One scorer** (`score()`, `evaluate()`): XP, level and season points are worked out from facts with the current
  rules; rewards are minted once and kept; missions and quests move; recognition is routed.
- **One read** (`get_profile()`): both apps ask the server for the same profile. Courtside and the Bell have their own
  reads.
- **Offline:** the phone keeps the last profile, the way it keeps the plan, and shows a tick's XP at once, marked
  pending, until the server agrees.
- **Proof's entries keep Proof's exact rules until the switch** (phase 3). Phase 1 runs in shadow and must match Proof's
  own scorer, so a design change to an `origin = "proof"` entry is written as `retire_at = "switch"` on the old entry
  and a new entry with `starts_at = "switch"` (`superseded_by` links them). Nothing an athlete sees changes before the
  switch.

## The rules

The index line is the rule. A later doc cites the ID instead of restating it, the way `COACHING-PRINCIPLES.md` works.

| ID | Rule |
|---|---|
| **GAME-1** | **Facts are stored, points are derived, rewards are kept.** A fact changes only when the thing it records changes (an open day's habit count, a corrected session) and is voided, never deleted. XP and level are worked out from facts with the current rules. A badge, achievement or title, once minted, is never taken back. |
| **GAME-2** | **One scorer, on the server.** The apps write facts and show the profile. A phone may preview a tick's XP from the rulebook, marked pending; the server's number is the number. |
| **GAME-3** | **Every reward means something.** Each belongs to one of the four meanings and says in one sentence what it proves. |
| **GAME-4** | **The plan is the biggest earner.** A held training week is worth about half of a perfect week. Past the plan, XP shrinks (caps), so more never beats as written. |
| **GAME-5** | **Pay for the act, never for the value.** Logging an RPE pays; the RPE number never does. Answering the check-in pays; the answers never do. Progress is judged against the athlete's own history at the same effort, and a Progress reward needs the weight or the reps to go up: a lower RPE alone shows on the This cycle card and earns nothing. |
| **GAME-6** | **Social actions pay nothing.** Kudos, roll call lines and shares are the recognition, not the work. |
| **GAME-7** | **Missions and quests pay the same share of the work inside them.** A mission on a cheap habit is a cheap mission. Amir's lesson from the 27 July 2026 quest run: NO NEGOTIATION paid 7 times a supplement's value and THREE HARD DAYS 2.5 times a session's, and supplements took the board. |
| **GAME-8** | **Nothing is lost.** A hidden or deleted session stops paying from then on, and what it minted stays. A quest pauses; it never fails. |
| **GAME-9** | **The bigger the audience, the clearer the yes.** The athlete sees everything about themselves and Amir sees every athlete. The crew sees only what the athlete agreed to show, the public only what the athlete shares or approves. |
| **GAME-10** | **Every number is a row.** XP values, badges, achievements, missions, quests and thresholds live in the `.toml` files and, once built, in their tables. Changing a detail never needs new code. |
| **GAME-11** | **Amir's time is budgeted.** The system finds the moment and writes the message. He spends seconds each, about 10 minutes a week in all. |
| **GAME-12** | **One system for everyone.** Free and coached athletes share the rules and the board. A free athlete simply has no training facts. |
| **GAME-13** | **Every meaningful action answers at once, visibly.** In the same moment as the tap, never waiting for the network: what it earned, where it moved the athlete, and the nearest goal it touched. Nothing changes on screen without the athlete seeing it move. (Amir, 2026-10-17; `PROCEDURES.md` → P17.) |

## What exists today, and where it goes

Nothing built is thrown away. Proof's game becomes the habits half of the system, and everything already owned stays
owned.

| Today | In Career Mode |
|---|---|
| Proof's XP weights and level curve (`XP_RULES`, the `xp_rules` row) | The rulebook. Habits keep their values, training joins, the curve is re-anchored |
| WORKOUT's 100 XP a day | Moves into the session fact (400). The habit stays on the day's list for the day streak, paying 0 |
| Consistency tiers, KINDLED to UNBREAKABLE | Unchanged until the switch. Then each habit keeps one badge, its Proof name, on these five steps (one behaviour, one badge) |
| 32 milestones in marks, 5 events | Badges and achievements, each given its meaning (`badges.toml`, `achievements.toml`, `origin = "proof"`). At the switch HEAVY METAL (sessions on days in a row) and THE MACHINIST (Century's double) stop being earned; anyone who has one keeps it |
| The comeback, BACK IN THE FIGHT, HARD TO KILL, UNBOWED | Resilience, unchanged |
| The 14-reward road of titles and card skins | Stays: level titles and skins |
| Seasons and season titles | Seasons rank the board by season points; levels stop resetting. A season's title is earned by season points (`rulebook.toml` → `[season]`) |
| `hab_titles` | Awards. Every title owned stays owned |
| Quest week and its 12 quests | Missions (`missions.toml`, `origin = "proof"`); the crew's run becomes the crew mission |
| The wins card and the full-screen moments | The athlete's column of recognition |
| Five share cards | Stay, joined by the training's first, Signed Off (round 3, #31) |
| The board | Ranks season points, with titles beside names |
| Roll call | Stays, and still pays nothing |
| The training app's wins (`cycleWins()`) and automatic Personal Records | Progress facts |
| Round 3's ideas | Hold Serve is Consistency's held weeks. Courtside and the Bell are Amir's column and the crew's. Century Club is Commitment. Amir's Pick is his tool. The Win Ledger is the fact ledger |

## Build order

Each phase ships something Amir or an athlete can see, except the new scorer, which runs in shadow until it matches
Proof's to the point.

| Phase | What | Visible | Status |
|---|---|---|---|
| 1 | **Facts, in shadow.** The fact ledger, `observe()` on sessions and the Proof log, the rulebook seeded from `rulebook.toml`, `get_profile()`. It runs beside Proof's scorers and must match `hab_xp()` for every athlete before anything switches | Hold Serve's line in the training app (not yet: its own follow-up) | **live 2026-10-17, in shadow** (stage66, applied on Amir's yes and seeded; PROCEDURES.md → *Phase 1, as built*). On the live project 34 of 34 athletes' habit XP equals Proof's, this season, the rolling week and all time (`career_compare()`) |
| 2 | **One profile.** Proof's level, rank and board read `get_profile()`. The phone scorer becomes the preview, and instant feedback (P17) reads it | The career level, revealed once; every tick answers with its XP, the bar and the nearest goal | not started |
| 3 | **Rewards with meanings, and the switch.** The catalogue tables, `evaluate()`, awards. Proof's milestones, tiers and titles carried over; the training badges join; the entries gated on the switch take effect (one badge per habit, HEAVY METAL and THE MACHINIST retire) | The four numbers and the Grand Slam row; the finish card listing what a session earned; Signed Off | not started |
| 4 | **Amir's column.** Courtside, reactions, commendations, Amir's Pick | coach.html → Today | not started |
| 5 | **Weekly missions.** The planner, the three slots, the crew mission in place of Quest week | Missions in both apps | not started |
| 6 | **The crew.** The Bell, kudos, the consent question at the first highlight, titles on every line | AA Proof → Crew | not started |
| 7 | **Personal quests.** Templates, the three doors, Amir's tick | Quests in both apps | not started |

## What could go wrong

- **The reveal.** Career levels jump when they stop resetting. The first open sets a baseline in silence and shows one
  moment, *Your career: level 31*, never thirty.
- **Two kinds of week.** Missions run Monday to Sunday while a held week follows the plan's week. The words on screen
  name which week, every time.
- **Gaming the numbers.** Habits are self-reported and a weight can be typed. Caps per day and week, no pay for values
  (GAME-5), and Amir sees every highlight.
- **Amir's time creeping up.** Courtside shows the five biggest moments of the week, not every one.
- **Privacy.** The Bell, a story and a public title rest on consent: `privacy.html` changes in the same PR as the Bell.
- **Scored twice, again.** Any rule a phone previews is a twin, so it goes into `scripts/check_twins.js` the same day.

## Open questions (details for later)

None of these blocks phase 1.

- **Names.** Every badge, title, mission and quest name is a draft. Amir renames freely (names should be cool, not
  literal).
- **The numbers.** Every XP value in `rulebook.toml` is a first draft. The level curve's `base` was re-anchored in phase 1
  from the shadow data (2026-10-17: 300 → 400, the measurement is beside it), so two months of solid work still reaches
  level 20.
- **The season title.** Proof gives a season's title at level 5 inside the season. With career levels it needs a season
  points threshold instead (`rulebook.toml` → `[season] title_points`, drafted at 2,000).
- **Proof's milestones.** Which families become badges and which one-offs become achievements, and the meaning of each
  (`origin = "proof"` entries, first pass by Claude; Amir checks).
- **Farsi.** Every Farsi word (messages, badge and title names) is Amir's to write or approve.
- **Message lines.** The WhatsApp lines in `recognition.toml` are drafts in Amir's voice.
- **Library sessions and held weeks.** Drafted as: a Library session never counts toward a held week (only plan days
  do); a session finished early does.
- **Courtside heads-ups.** Which coming milestones Amir hears about before they happen (drafted: session 100 within two
  sessions, the roadmap's last week, a retest week).

## Keep in step when it is built

- Anything in `habits.html` keeps Proof's six-file rule (`HABITS.md`, `XP_SYSTEM.md`, `QUESTS.md`, `renderManual()`,
  `privacy.html`, `tourSteps()`), in the same PR.
- A new table goes into `BACKUP_TABLES`, the schema snapshot and `coach_erase_person()` the same day.
- A rule a phone previews goes into `scripts/check_twins.js` the same day.
- `privacy.html` changes with the Bell, the share card and Amir's Pick (what is shown, to whom, on what basis).
- The in-app guides name real controls: `tourSteps()` in Proof, `APP_GUIDE` and `ONB_TEXT` in the training app.
- `python scripts/check_career.py` passes after any edit to this folder, and a changed file is re-seeded on the server
  (`python scripts/career_seed.py`, then its one statement through the Supabase tool).
- **While `[shadow] on = true`, Proof's habit numbers live twice:** the `xp_rules` row and `career/*.toml` (`[habits]`,
  the tiers, the `origin = "proof"` milestones and quests). `check_career.py` holds them equal to
  `supabase/xp_rules_snapshot.json`, in pre-commit. A change to one is a change to both, until the switch.
- **The training app's maths copied into SQL** (stage66): `career_entry_sets()` is `cycleBestSet()`, `histBestSet()`,
  `estimateOneRM()` and `parseLoggedKg()`; `career_win_gain()` is `winText()`'s verdict; `career_weeks()` is
  `cycleWeekInfo()`'s weeks; `career_habit_days()` is `hab_bonus_xp()`'s day gate. A change to the original changes the copy
  the same day (`career_compare()` proves the day gate on every real log).
