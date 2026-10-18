# Idea bank

Every idea pitched through `/ideas`, with its status. Read before a run so nothing is pitched twice;
update the status when Amir reacts. Statuses: `pitched` · `picked` · `built` (commit) · `parked` · `rejected`.

## Round 1 · 2026-09-23 · "The Coaching Graph" (coaching system, all apps)

Full write-up (8 fields per idea, build order, dependency map):
https://claude.ai/artifact/Bu746VeRc4uh2RVbF4F6Mv

Brief: product strategy across assessment → … → adaptation; connected information, not features;
"this app actually understands my training".

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 1 | The Spine | Exercise catalogue with stable ids: purpose, pattern, qualities, easier/harder/alternative links, where used | — | **built** 2026-09-24 (stage31; ⓘ + About sheet, cues from the entry, coach.html → Exercises, 75 drafts seeded) · deep-dive https://claude.ai/artifact/WymDKxk58nkCy5eSgodSrU |
| 2 | The Quality Map | 10–12 tennis/padel physical qualities tagged on exercises → session and cycle quality mix | 1 | **built** 2026-09-24 · deep-dive https://claude.ai/artifact/US2RW8TaHZbFk8voADq6fu (on the Home day cards for every athlete, his call; the rest as recommended; stage32) |
| 3 | Court Map | Court moments (split step, wide forehand, serve…) → qualities → your exercises, and back | 1, 2 | pitched · suggested park |
| 4 | Because | One athlete-safe "why you have this" line per exercise, tagged with its source (goal/test/injury/sport/last cycle) | — | **built** 2026-09-24 ("go" on the picks) · deep-dive https://claude.ai/artifact/WtZ4xfq38dV7zZwRu926jw (built: B + C, dot on the ⓘ + a Why page per cycle; 5–10 per cycle; `ex.why {src,text}`) |
| 5 | The Card Remembers | Last time on every exercise card from `session_history`; add reps logging | — | **picked** 2026-09-24 · deep-dive https://claude.ai/artifact/NTtDNds5vcLoE6AfX21Zoj · **built** 2026-09-24 (direction B + ghost line + History sheet; reps as an override of the one prescribed number; stage30) |
| 6 | Green Light | Readiness applies the −1 RPE / minimum-dose rule to the session | — | pitched |
| 7 | The Ladder | In-session easier/harder/alternative switch with reason, logged | 1 | pitched |
| 8 | Body Check | Structured pain report: area, 0–10, timing, soreness vs pain → exercises that load it → coach | 1 | pitched |
| 9 | Radar | coach.html Needs-you fires on readiness drop, RPE creep, pain, missed sessions, retest due, handoff dates | — | pitched |
| 10 | Pinned | Messages attached to an exercise/session/outcome and shown on it | 1 | pitched · suggested park |
| 11 | Right Read, Right Time | Articles tagged to exercises/qualities/cycles/moments, offered in context | 1, 2 | pitched |
| 12 | The Debrief | Cycle outcomes scored against measures + what changes next cycle and why | — | **picked** 2026-09-24 for a real athlete's Cycle 1 · deep-dive: https://claude.ai/artifact/JY1eG1RNYHTLvYpFCwcHBx · **built** 2026-09-24 as the **`/cycle-report`** skill (a WhatsApp cycle report + a `## Debrief` section in `coaching_logs` that `/program-design` reads); first run: 2026-09-24. The in-app card and coach.html panel are not built |
| 13 | Patterns | Proof habits × readiness × RPE × Personal Records findings, above a minimum amount of data | — | pitched · suggested park |

Quick win noted in the same round: the TPS course app's `easier`/`harder` are free text; making them
real links to exercise ids is the course-app half of #1.

## Round 2 · 2026-09-27 · "Five Futures" (five product directions for the athlete app)

Full write-up (five concepts × 15 sections with wireframes, the comparison matrix, A to H, the ten below):
https://claude.ai/artifact/U8q6mrLHwJxK3YJeYQDCar

Brief: Amir's pasted design brief (five radically different directions: premium coach, performance lab,
simplest app, fitness OS, next generation), with "the existing architecture is not a constraint". The five
concepts: 1 The Corner · 2 Readout · 3 Next · 4 The Loop · 5 Body Weather. Round-1 ideas that reappear as
parts of the concepts (#8 Body Check, #10 Pinned, #11 Right Read, #13 Patterns) were not pitched again. The
ten below are the prototype list, ranked by what a prototype would teach per hour.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 19 | The Brief | Home opens with 2–3 lines in Amir's words (week notes, Coach's Notes, Becauses, plus ~20 templates filled with facts: missed day, week 1/5, low check-in, first time, retest, match tomorrow) and one button | — | pitched |
| 20 | The Corner | The rest screen as the coach's moment: next set, one cue or the Coach's Note, last time, Ask. Guided's rest screen already logs the set just done. Its "next set, one cue" part exists since #39 Serve Clock (`cueForRest()`); the rest (Coach's Note, last time, Ask) is still pitched | — | pitched |
| 21 | Court Counts | Two-tap court/match log (minutes × how hard = the session load coach.html already computes), feeding load, REC-5, SES-14 and coach.html | — | pitched |
| 22 | The Follow-Up | A flag (pain, too hard, short on time) comes back as one question at the next check-in; the answer reaches coach.html | — | pitched |
| 23 | Same Effort, More Weight | Lift pages lead with effort-matched rows ("6 reps at RPE 7: Jul 60, Aug 67.5, now 72.5") and a scrubber that rewinds the season; extends PROG-01's This cycle card | — | pitched |
| 24 | Drag the Week | Sessions as blocks the athlete moves, with live consequences from REC-5, SES-14 and match days | 21 | pitched |
| 25 | Ask, Anywhere | Press and hold any element: answered first from Amir's written words (Because, note, cue, rule), else WhatsApp with the context written; every question logged | 1, 4 | pitched |
| 26 | The Sunday Five | The weekly check-in as five questions in the app, in the athlete's language, landing in call-log.html | — | pitched |
| 27 | The One Button | A whole session driven by one full-width button; drag up to change a set | — | pitched |
| 28 | Body Weather | The body lit by the week's load (Spine credits × sets × effort), cooling over 2–3 days; tap a region to see why or to report pain | 1 | pitched |

## Round 3 · 2026-10-17 · "Bragging Rights" (gamification: train more, be recognised, earn achievements)

Full write-up (8 fields per idea, mockups for five, the five rules, build order, dependency map, the cuts):
https://claude.ai/artifact/SV2d9r6SL7kq7RLBiAdewS

Brief: Amir asked "if you had a fitness app, and you wanted to gamify it so people will do more, to be recognised
more or get achievements, what would you do?". AA Proof's game (XP, ranks, milestones, events, road, seasons, titles,
board, quests, comebacks, share cards) was not pitched again. The round gives the TRAINING its own game, paying for
doing the plan, never for more. Live numbers that day: 19 of 38 programmes trained in the last 28 days at 1.4 sessions a
week (22 plans ask for 3); 31 of 38 plans are 2-4 days a week, so Proof's session streak (`habitStreak()`, days in a
row) can't pass a rest day; roll call 0 lines in 7 days with 22 on the board; program.html has no share card; coach.html
has no copy of `cycleWins()`. Research cited: STEP UP (Patel 2019, only competition outlasted the game), Deci, Koestner
and Ryan 1999 (expected rewards undermine, positive feedback helps), Mazeas 2022 (JMIR meta-analysis).

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 29 | Hold Serve | A streak of held weeks (every session of the plan's week, any days; rest days never break it, pauses between cycles); later Proof's session ladder counts held weeks (settles the Proof audit's open decision 4), optionally STEP UP's metal standing that moves up and down | — | pitched · **recommended first** |
| 30 | Courtside | coach.html → Today "Worth a word": the week's wins (new best, effort-matched win, held-weeks mark, session mark, comeback) with a pre-filled WhatsApp in the athlete's language; not a reason | (37) | pitched · top 3 |
| 31 | Signed Off | The training's first share card: Cycle complete → Story card with cycle art, sessions, weeks held, top 3 wins, retest, Amir's signature and photo, AMIRARDEKANI.COM; Farsi card later | — | **built** 2026-10-17 as **Highlight Reel** (design page https://claude.ai/artifact/SuyYRPeX9n2SdbiUvoHhkF, "go with your picks"): Signed Off with four more training cards (New Best, Same Effort, Retest, The Distance), Story or post, English or Farsi from the start, a one-time Cycle complete moment, and Career Mode's five reward cards drawn for phase 3 (`assets/js/sharecard.js`, PROGRAM-APP.md → Highlight Reel). Weeks held waits for Hold Serve (#29) |
| 32 | Ring the Bell | Crew → Board \| Bell: automatic 7-day lines for a new best, a held-weeks mark or a session mark, 👏 once; consent asked at the first win | (37) | pitched |
| 33 | Century Club | Career session count with marks (10, 25, 50, 100 …), a Home moment with Amir's line, a server-minted Proof title at 100, a voice note from Amir at 100 (first one ~end of 2026: top athlete at 74) | (37) | pitched |
| 34 | Amir's Pick | Monthly: data shortlists 3 (weeks held, effort-matched gain, comeback), Amir picks one, a one-of-a-kind minted title, the Bell, an Instagram story with the athlete's yes | 29, 37 | pitched |
| 35 | The Ghost | One line on the This cycle card: this cycle against the last at the same day, as a share of the plan ("2 ahead of your last cycle") | — | pitched · ships with 29 |
| 36 | Silverware | Tournament and match results (a race or a test day for non-players) logged in two taps → Progress shelf, the Bell, Courtside | 21 | pitched |
| 37 | The Win Ledger | Foundation: a server table of wins written beside `save_session` (through the session queue), read by 30, 32, 33, 34, 31; in the backup and the erase list the same day | — | pitched · foundation |

Cut in the same round (listed on the page so they are not re-pitched): an RPE-on-target badge and a low-readiness medal
(both pay for a typed number; RPE is the prescription), progression "moved up" moments (too close to Rungs), a public
most-improved board, Duolingo leagues (22 on the board), a Library Local Legend crown, booking days ahead (no
scheduling around tennis), tonnage/minutes/sets counters, more training XP in Proof's day score, collecting exercises.

## System · 2026-10-17 · "Career Mode" (the progression and recognition system)

Amir's brief, straight after round 3 (his words are in TASTE.md): one system where any meaningful action earns progress
and is recognised by the client, the coach and a community; total XP and level, titles, badges and achievements, each
meaning consistency, commitment, progress or resilience; weekly missions and personal quests; details later.

Blueprint: https://claude.ai/artifact/42WHTUzoxmnr6axP64QNGN. The loop (action → fact → points and rewards →
recognition); the four meanings, one number each (weeks held · sessions with Amir · personal bests · comebacks); nine
mechanics with one job each; five sizes of moment routed to the athlete, the coach, the crew and beyond; missions (three
slots, plan · recovery · stretch, plus a crew mission that replaces Quest week) and quests (three doors, never failed);
the engine (fact ledger, rulebook, catalogue, awards, missions, quests, recognition; `observe()`, `evaluate()`,
`get_profile()`; ONE scorer on the server); first numbers (training 46% of a perfect week, 15–19% today); where each
piece of Proof's game goes; rules GAME-1 to GAME-12; 8 decisions; 7 build phases (phase 1 runs in shadow until it
matches `hab_xp()` for every athlete).

Status: **picked** 2026-10-17. Amir, *"go with your picks"*, on all eight decisions (level never resets · Proof is the
game's home · one server scorer · training about half of a perfect week · missions Monday to Sunday · crew consent at the
first highlight · quests from three doors · the name, Career Mode). Written into the repo the same day as **`career/`**:
`CAREER_MODE.md` (the system), `PROCEDURES.md` (every function, step by step), seven `.toml` files Amir edits (rulebook,
badges, achievements, titles, missions, quests, recognition, with Proof's existing catalogue carried over) and
`scripts/check_career.py`. Nothing built; phase 1 (facts in shadow) is next.

Round 3's ideas are parts of it: #29 Hold Serve → Consistency's held weeks; #30 Courtside → the coach's column; #32
Ring the Bell → the crew's column; #33 Century Club → Commitment; #34 Amir's Pick → a coach tool; #35 The Ghost →
Progress; #36 Silverware → a later fact source; #37 The Win Ledger → the fact ledger; #31 Signed Off → phase 3 (built
ahead of it on 2026-10-17 as Highlight Reel: the training's five cards, with the reward cards drawn for phase 3 to feed).

## Career Mode · 2026-10-17 · "Four Majors" (the catalogue, meaning by meaning)

Amir: *"if we want to think in these 4 words, about the achievements and titles and everything. lets think what
achievements and progress things we want in each field, consistency, commitment, progress, resilience"*.
Page: https://claude.ai/artifact/1wa7BQgeMAMipm24Fwzo1z. Each meaning built the same way: its number, an arc (first week →
first month → first season → first year), badges, moments, titles, quests and missions, what it never pays for, what Amir
sees. The capstone: **GRAND SLAM**, a title in each of the four meanings (level titles don't count).
Proposed changes to `career/`: one behaviour, one badge (each habit keeps its Proof name on five steps); HEAVY METAL, The
Machinist and Day One retired for new earning; Clean Sweeps → Treble; a lower RPE alone earns nothing (GAME-5 sharper);
an event per meaning (new: The Proving Ground for Progress); tennis names with a plain line (Hold Serve, Second Serve,
Love Hold, All-Court, Paper Trail, Free Kilos, Beat the Test, Closer, Record Breaker); twelve new pieces (The Long Count,
Pulse Check, Love Hold, Veteran, The Upgrade, Flawless, Full Stack, By the Book, All-Court, Double Up, All the Way Back,
The Proving Ground); free athletes see the Progress shelf locked, as the pitch; coach.html shows each athlete's four
numbers ("the shape").
Status: **picked** 2026-10-17. Amir: *"go with your picks, just remember that we need to show the client a visible
progress and immediate feedback every time a meaningfull task is completed"*, which became rule GAME-13 (instant
feedback, `PROCEDURES.md` → P17). In the repo: d2757b1 (the decisions, each meaning in full, GAME-13, P17, the
`[feedback]` lines) and the catalogue commit after it (38 badges, 22 achievements, 29 titles; The Upgrade tops at +75%
and Double Up earns NEW ENGINE; custom habits get HOUSE RULES; every change to a Proof entry waits for the switch,
`retire_at` / `starts_at = "switch"`, so phase 1's shadow still matches `hab_xp()`).

## Round 4 · 2026-10-18 · "Rest in Play" (Off the Glass, the rest-time game)

Full write-up (8 fields per idea, three phone mockups, the evidence with PMIDs, the seven rules, a second-by-second rest, build order, dependency map, the cuts, nine decisions):
https://claude.ai/artifact/1qn7D8shTUmKrYDHo9UT9W

Brief: Amir, *"do you want to have a research and think and generate some ideas about how to improve this game if we can"*. Off the
Glass (`assets/js/rally.js`) shipped 2026-10-17 on his own request, not from `/ideas`; Split Step, a second rest game, shares its door
since 295c659. Two research passes (sports science, every PMID checked; game design). Live numbers on 17 Oct: median written rest 60 s,
83% of 727 rests 90 s or less, 18 rests and about 24 min of rest a session, 27% of 1,584 logged sets with no RPE. Bots: a
ball-following bot won 58 of 58 points (a point about 4 s, a match about 25 s); a bot also found a trapped-ball bug (fixed 2040aa9).
Made with ten lens agents (54 ideas), one merge (30), three checks each (rules, evidence, build). The seven rules the round keeps: the
rest is the boss; the last 25 s are for the set; only inside a rest and optional; a calm option beside the game; the game pays nothing
(GAME-3, GAME-6); scores stay on the phone; no claim that it trains tennis.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 38 | The Read | Amir defends like a person: aims where the ball will cross, reacts a beat late, small aim error, form set between points; the score-based speed dial goes; a sim test with three human-like bots. Advanced: a visible head start ("Amir gives you a point") | — | **picked** 2026-10-18 ('go with your picks') · **built** 2026-10-18 (sw.js v170) |
| 39 | Serve Clock | At 25 s left (30 on rests of 100 s+) "Last point", then the next set and one Spine cue; no game door on rests under 45 s, circuit rounds or retest lifts; one `cueForRest()` shared with #20 | — | **picked** 2026-10-18 ('go with your picks') · **built** 2026-10-18 (sw.js v170) |
| 40 | Full Time | One match a session: the score waits between rests, first to 15, an 8-minute play cap, Done ends it | 39 | picked (first to 15, 8-min cap) · **built** 2026-10-18 (sw.js v171) |
| 41 | Chair Umpire | A receipt per rest (written, run, how it ended, +15s) in the session log, read by coach.html, `/cycle-report` and `/program-design`; a line in privacy.html | — | picked (with a privacy line) |
| 42 | Clean Strike | Hit-stop up to 60 ms, a pitch ladder per rally hit, a white rim on Amir's racket, the thumb lift fading near the back glass | — | pitched |
| 43 | Bajada | A real bank off the glass through the gap counts 2 | 38 | picked (after The Read) · **built** 2026-10-18 (sw.js v171) |
| 44 | The Lob | A calm breathing door on the shelf (in 4, out 6), handing back at 25 s; a mode of rally.js | 39 | picked · **built** 2026-10-18 (sw.js v171) |
| 45 | Call the Score | Guided: the door reads "Rate the set, then play" while the set just done has no RPE; nothing locks | — | picked, conditional: check whose sets are blank first |
| 46 | Walk-On | Amir's own recorded lines at the bell, English and Farsi | — | pitched · waits for Amir's recordings |
| 47 | Passing Shot | A Story card for beating Amir, in the Highlight Reel family | 38, 40 | parked; The Read (#38) and Full Time (#40) are built, so it can be picked |

Grown for #20 The Corner (slices, not new numbers; they share Serve Clock's cue function): Ball Change (the next exercise's Because
at a changeover), Towel Break (why this rest is long or short, three sightings), Order of Play (why the block order, in the guide
first), Down the Line ("7 sets to go" from halfway), Eight Means Two (a one-line RPE legend under Guided's keys), The Nod (the set beat
the same set last time, in words only; needs a call on Career Mode's P17).

Parked: Pared (a solo wall mode) and Call Your Glass (trick-shot puzzles), until usage of the shelf is visible; a weekly dial for how
hard Amir plays (speed alone did not make him harder in the bot tests).

Cut in the same round (listed so they are not re-pitched): Say the Number (the list already asks "How hard?" at the tick); In or Out
(athletes rating their own technique, against PRC-7 and PRC-9); Sponsor Board (cues during play; the cue moved to Serve Clock); Davis
Cup (a crew-against-Amir tally: game numbers off the phone, a league by another name, GAME-6); New Balls, Please (a new court each
cycle, cosmetic); XP, badges or a board for the game; anything that lengthens a rest; any claim that the game trains tennis.

## Grown out of deep-dives

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 5+ | The History Sheet | Every past session of a lift with an e1RM trend (from the #5 deep-dive) | 5 | **built** with #5 |
| 14 | Rungs | Each movement pattern as a staircase marked with the rungs this athlete has climbed | 1, 5 | **removed** 2026-09-24, the day it shipped: *"remove the rung, too much information, even im mixed up. doesnt help athlete."* Replaced by three plain lists: Regressions · Progressions · Alternatives |
| 15 | Who has this exercise | coach.html: exercise → every athlete doing it now (before changing a cue or video) | 1 | **built** 2026-09-24 in the Exercises editor |
| 16 | Not Yet | The ledgers' Paused exercises with their unlock gate in plain words (never a Banned one) | 1, 4 | **parked** 2026-09-24: its home was Rungs, now removed. Ask Amir before reviving |
| 17 | Still Warm | Qualities a cycle means to keep, flagged in coach.html when one goes cold (days since last logged working set) | 2, 5 | pitched (from the #2 deep-dive) |
| 18 | The Back-off Week Shows Itself | The closing week draws itself: a line on the Home day card, half the Primary set rows greyed (from the #12 deep-dive: the athlete did every set in his back-off week) | — | **built in part** 2026-09-26: the week note (`cycles[n].weekNotes`) shows on Home in its own week, as the This Week section itself (Front Page since 2026-10-12, no longer at the top of a session), written by the pipeline and required by `check_program.py`. The greyed set rows are not built |
