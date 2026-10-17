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
| 20 | The Corner | The rest screen as the coach's moment: next set, one cue or the Coach's Note, last time, Ask. Guided's rest screen already logs the set just done | — | pitched |
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
| 31 | Signed Off | The training's first share card: Cycle complete → Story card with cycle art, sessions, weeks held, top 3 wins, retest, Amir's signature and photo, AMIRARDEKANI.COM; Farsi card later | — | pitched · top 3 |
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

Status: **pitched**, 8 decisions waiting (level never resets · Proof is the game's home · one server scorer · training
about half of a perfect week · missions Monday to Sunday · crew consent at the first highlight · quests from three
doors · the name, Career Mode or another).

Round 3's ideas are parts of it: #29 Hold Serve → Consistency's held weeks; #30 Courtside → the coach's column; #32
Ring the Bell → the crew's column; #33 Century Club → Commitment; #34 Amir's Pick → a coach tool; #35 The Ghost →
Progress; #36 Silverware → a later fact source; #37 The Win Ledger → the fact ledger; #31 Signed Off → phase 3.

## Grown out of deep-dives

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 5+ | The History Sheet | Every past session of a lift with an e1RM trend (from the #5 deep-dive) | 5 | **built** with #5 |
| 14 | Rungs | Each movement pattern as a staircase marked with the rungs this athlete has climbed | 1, 5 | **removed** 2026-09-24, the day it shipped: *"remove the rung, too much information, even im mixed up. doesnt help athlete."* Replaced by three plain lists: Regressions · Progressions · Alternatives |
| 15 | Who has this exercise | coach.html: exercise → every athlete doing it now (before changing a cue or video) | 1 | **built** 2026-09-24 in the Exercises editor |
| 16 | Not Yet | The ledgers' Paused exercises with their unlock gate in plain words (never a Banned one) | 1, 4 | **parked** 2026-09-24: its home was Rungs, now removed. Ask Amir before reviving |
| 17 | Still Warm | Qualities a cycle means to keep, flagged in coach.html when one goes cold (days since last logged working set) | 2, 5 | pitched (from the #2 deep-dive) |
| 18 | The Back-off Week Shows Itself | The closing week draws itself: a line on the Home day card, half the Primary set rows greyed (from the #12 deep-dive: the athlete did every set in his back-off week) | — | **built in part** 2026-09-26: the week note (`cycles[n].weekNotes`) shows on Home in its own week, as the This Week section itself (Front Page since 2026-10-12, no longer at the top of a session), written by the pipeline and required by `check_program.py`. The greyed set rows are not built |
