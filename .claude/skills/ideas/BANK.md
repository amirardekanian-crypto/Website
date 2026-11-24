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
| 41 | Chair Umpire | A receipt per rest (written, run, how it ended, +15s) in the session log, read by coach.html, `/cycle-report` and `/program-design`; a line in privacy.html | — | **rejected** 2026-10-18, mid-build: *"i dont want chair umpire / reverse it"*. Nothing shipped. |
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

## Career Mode design round · 2026-10-18 to 10-20 · "Where Career Lives"

Page (six versions, every direction kept): https://claude.ai/artifact/AriVWJQskSFE7na1Nn7i24 · record: `career/CAREER_MODE.md` → *Round 5*.

| Name | What | Status |
|---|---|---|
| One app (Home Court) | Coached athletes live in AA Performance only; AA Proof frozen as the free door | **picked** 2026-10-20 (L1) |
| Locker tab | A fifth tab for the career (later with Me and Crew) | **dropped** 2026-10-20: the lightest career fits in Progress |
| Academy | Library becomes an Academy of eight talent trees (Amir's list, his skill-tree picture) | **rejected** 2026-10-20 by Amir ("remove the academy tree") |
| Coach Everywhere | Coach tab off the bar, Amir's photo on every screen opens his sheet | picked 2026-10-20, then **superseded** the same day: the Coach tab stays (L7) |
| Moments instead of badges | The four numbers' marks and the achievements arrive as moments with a share card; no shelf | **picked** 2026-10-20 (L3, L4) |
| The Monthly Open | One challenge a month for the whole crew, one board, the honours on the 1st | **picked** 2026-10-20 (L9) |
| Monthly honours | Most sessions (plan sessions), Most improved (percent, a main lift), Full Month for all who did every plan session | **picked** 2026-10-20 |
| The Bell replaces roll call | Achievements list themselves for the crew, kudos only | **picked** 2026-10-20 |
| The simple monthly goal | One line Amir writes, one tick | **picked** 2026-10-20 (L10) |
| Habit chips | Today's habits as one row of chips on Home | **picked** 2026-10-20 |
| Courtside first | Amir's recognition before any athlete feature | **picked** 2026-10-20 (L11); direction A picked 2026-10-19, **built and live** (stage75, 2026-10-19) |
| Test week is challenge week | The plan's retest week opens the matching challenge | pitched |
| The lesson arrives when it matters | The 24 lessons matched to plan moments | pitched |
| The Road Remembers | Each finished cycle on Progress wears what it earned | **picked** 2026-11-21 (grown idea) |
| One Week Short | In a month's last week Courtside names whoever can still make Full Month by holding this week, the WhatsApp line written (nobody has a Full Month yet; three athletes were one week short in September) | pitched 2026-10-19 (grown idea, Courtside design page https://claude.ai/artifact/L3Tt3B6YPqMWcVgnN7nt9g) |
| Gym photos, weekly missions, the full quest system | — | **parked** 2026-10-20: "later, only if the numbers say so"; photos came back 2026-10-19 for Crew's short-lived messages (CAREER_MODE.md → round 5) |
| The Next Mark on the finish card | The finish card names the mark the session moves you closest to ("3 sessions to 50 with Amir") | grown idea on *Your Numbers*; **built** 2026-10-19 with step 3 (the finish card's lines are the four marks) |
| The nudge on the finish card | One line when a session ends one step short of an achievement ("Hold Thursday and you get Back to Back") | **picked** 2026-10-19 (grown idea, Achievements page https://claude.ai/artifact/WPHuuK2Y2z4jfEQUPVdqNt) |
| 15 new achievements, Four Courts | Back to Back, Full Month, Every Rep Counted, The Notebook, Extra Mile, Extra Innings, Straight Talk, Season Ticket, Half Year, Year One, Smooth Operator, Moving Up, Rematch Won, Bounce Back, Showed Up Anyway; a section by the four kinds | **built** 2026-10-19: 13 live (stage79, rulebook version 5); Smooth Operator and Showed Up Anyway left out (GAME-5, Amir's yes to the 13); Four Courts next |
| Tell the crew | One button on the finished card drafts the session's line for the Bell, a photo optional | **picked** 2026-10-19 (grown idea, The Bell page https://claude.ai/artifact/55fbdfUgJVxySL7EpihyWb; built with stage80) |
| Beat Your October | When a test comes back in a later Open, each card shows the athlete's own last result beside the board | pitched 2026-10-19 (grown idea, Crew and Open page https://claude.ai/artifact/7fCYGFL6mboE3igFLUkE5E) |

## Round 5 · 2026-10-24 · "Borrowed Plays" (patterns from other apps)

Full write-up (8 fields per idea, what each app gave, dependencies, the cuts):
https://claude.ai/artifact/LWN8Pn5Hdb7nszb6CxsRWA

Brief: Amir asked which apps to learn from, then *"Run /ideas using the apps from this research (Future, Ladder, Whoop,
Gentler Streak, Strava, Duolingo, Hevy) as the starting point"*. Live numbers that day: the 19 athletes active in 28 days
did 1.49 sessions a week against 3.47 asked (46%); 19 of 33 athletes 10+ days past their last session, 15 returns after
such a gap in 60 days by 10 athletes; every one of the 113 sessions since 24 Sep still `coach_status='new'`, 18 with a
day note; 6 push subscribers; crew 8 posts by 5 athletes, 43 kudos, 4 replies; 298 `habit_done` facts by 17 athletes in
14 days; 85% of sessions carry a check-in. Code facts: the WhatsApp buttons in coach.html log nothing (only Courtside
stamps `sent_at`); only Amir can pause (`athlete_status`); replies have no push; no welcome-back screen.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 48 | Owed a Word | coach.html logs every WhatsApp / Copy / Mark read tap and call; Needs you names "no word from you in N days" (from Ladder's coach tool) | — | **rejected** 2026-10-24 ("cut the rest") |
| 49 | Break Point | When sessions left ≥ days left in the plan week, Home's This Week line names the way out (REC-5, REC-6, Finish early counts); later one push before the week's last day (Duolingo's late save) | week state | **rejected** 2026-10-24 ("cut the rest") |
| 50 | Rain Delay | Athlete asks for a pause on the Coach tab (ill, injured, away); Amir confirms in Needs you; uses `athlete_status` (Gentler Streak) | week state | **picked** 2026-10-24 ("go deep on these 4") |
| 51 | The Return | First open after 10+ days: one card in Amir's words, start with the next day, the session counts for Bounce Back; grows the Quiet Frame audit's open comeback line | week state | **picked** 2026-10-24 ("go deep on these 4") |
| 52 | Seen by Amir | "Seen by Amir" under the athlete's session note once `coach_status` is read; never "not seen" (Future's coach presence) | 48 | **rejected** 2026-10-24 ("cut the rest") |
| 53 | Patterns, now with data | #13 revived: habit days vs the next check-in and session RPE, shown after 5 yes + 5 no, "goes with" not "causes"; coach-only first (WHOOP Journal) | — | **picked** 2026-10-24 ("go deep on these 4") |
| 54 | Reply Rings | A reply to your crew post rings you, like a cheer (`reply_you` in `crew_push_q`) (Strava) | — | **picked** 2026-10-24 ("go deep on these 4") |

Cut in the same round: Duolingo leagues (round 3), Hevy's send-to-AI (COM-3, no chatbot), copying a friend's routine,
Future's coach matching, an athlete-facing load path (ACWR stays coach-only), a "crew mate trained" push, Ladder's one
plan per team, a self-serve streak freeze (Rain Delay instead).

**Deep-dive, 2026-10-24, "Second Wind"** (Amir: *"go deep on these 4"*, and *"what does strava have in community that is a good
idea for me to have? what does doulingo has in its gaming and achievement that is good for us to have?"*):
https://claude.ai/artifact/8VP8Q1B44uuYjrb88ayHvb. Three looks for each of 50, 51, 53, 54 (A recommended every time), 20 calls.
Found: `athlete_status` has 0 rows (nobody ever paused); ending a pause deletes the row, so `career_derive` would turn the paused
weeks into broken weeks at the next scoring; `push_due` ignores the pause; a pause has no end date and hides the athlete from Needs
you for good. 11 of 12 returns after 10+ days trained again within 7 days (median gap 14). The Quiet Frame audit's comeback line
(14 days, words only, "needs your sentence") is #51. Patterns: no link between any habit and the next check-in (pooled about +0.1
of 5; within people sleep and protein go the wrong way) or training in the next two days (protein 80% vs 68% pooled, 3 of 5 within
people), so the advice is a quarterly report first and the panel when it finds something. #54 Reply Rings is already in the Lounge's
stage96 (branch `lounge-sql`, trigger `crew_push_reply`, words "<name> replied to your post", Farsi a draft); only the in-app marker
is left.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 50+ | Fair Count | Adherence, the cycle's 80% and the cycle report count only weeks not on a rain delay | 50 | pitched (grown, on The Coaching Graph) |
| 51+ | First Ball Back | Courtside names a return the day the first session back is done, WhatsApp line ready | 51 | pitched (grown, on The Coaching Graph) |
| 53+ | One Sleep Number | The check-in asks hours of sleep, ticks the sleep habit, turns hours into its 1-5 (REC-2; twins) | 53 | pitched (grown, on The Coaching Graph as 13+) |
| 71 | Hitting Partner | "with" on Tell the crew: a crew mate you trained beside, one Bell line, sessions together on both pages (Strava group activities) | Lounge | pitched |
| 72 | Year-End | A free recap per athlete as share cards: sessions, weeks held, longest run, bests, the crew's total; English in December, Farsi at Nowruz (Strava Year in Sport, Duolingo Year in Review) | — | pitched |
| 73 | The Draw | Amir writes six Monthly Opens in one sitting; the next opens itself on the 1st (the Open has never been set) (Duolingo monthly challenge) | — | pitched |
| 74 | Let | Once a year, anyone 30+ days away who finishes 3 sessions in 14 days gets their best run of held weeks back; marks never paid twice (Duolingo Streak Revival, June 2026) | 51 | pitched · test once |
| 75 | Career High | Best run of held weeks and most sessions in a month on the Player Page (Duolingo personal records) | 55 | pitched |

Cut on the page (so they are not re-pitched): Strava's messages, followers, clubs inside the crew, segments and Local Legends,
Flyby, Athlete Intelligence, friend group challenges, club events; Duolingo's leagues, gems/shop/hearts/energy, XP boosts and
Happy Hour, daily quests (missions parked), Legendary, Duolingo Score, nudging a friend, pushier notifications. Friend streaks and
Friends Quests stay cut as #61 Doubles, noted as the cut to revisit if the crew passes 20 (Duolingo: +22% daily completion).

## Round 6 · 2026-10-24 · "Players' Lounge" (grow the Crew: profiles, more interaction)

Full write-up (8 fields per idea, both screenshot sets mapped piece by piece, a phone sketch of the profile, the rules, dependencies, the cuts, six calls):
https://claude.ai/artifact/TQz3VhH61WvqPqXiG32K28

Brief: Amir sent 15 screens of the Ladder app in two sets (profile, badges sheet, edit profile, settings; the RELOAD challenge grid,
Get Started checklist, Share your Proof coin, Ladder Wall, faces on Home with double-tap cheer) and asked *"I want to grow the crew,
into a bigger thing, adding profile, letting people interact more"*. Live numbers that day: 7 in the crew of the 19 who trained in 28
days; 8 of 41 have ever answered the join question; 43 likes from 5 people and 4 replies from 2 since 19 Oct, all deleted after 7 days
(stage81's sweep); 200 achievements held by 30 athletes and nobody can open another person's; the Monthly Open never set; 26 of 41
programmes tennis/padel. Found: the sport badge can name an injury ("Build Muscle, Protect The Back"), so a page shows the plain sport;
plan weeks are anchored to the cycle, so a Monday-to-Sunday month calendar can split a held week (58 became a cycle grid). The
Affiliates tab already counts codes from the intake form and has an `athlete_id` column.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 55 | Player Page | Every name in Crew opens that person's page from existing data: cycle picture as cover, level ring, plain sport, with Amir since, the four numbers, achievements, honours, this week's posts; only what their switches allow | — | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 56 | Your Face | One photo per person, everywhere a name sits and in coach.html; reuses Highlight Reel's picker; ~20 KB on the server | — | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 57 | Plays | ATP-style chips (hand, backhand, padel side, club or city, an optional Instagram handle) + one "Working on" line; "Trains for" for fitness clients; handedness feeds /program-design | 55 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 58 | Cycle Grid | The cycle as W1-W5 rows, trained days filled, a held week a full row, "8 of 15" = the plan's own target (was "Season Calendar", a month view, changed after Ladder's RELOAD grid) | 55 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 59 | Well Played | A cheer to a person (not a post) with an optional 100-character word, rings their phone, 7 days on their page, cheers-this-season count; Amir can send one as Coach; no private messages | 55 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 60 | Signed Ball | Names of who liked an achievement's Bell line kept on the achievement past the 7-day sweep | 55 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 61 | Doubles | A monthly partner: both pages, "held the week together", "one to go"; STEP UP says expect little | 55 | **rejected** 2026-10-24 by Amir ("cut idea 61") |
| 62 | Your Page Is Ready | The join question and Home's one-time invitation show the athlete their own page first; coach.html lists who trains and is not in the crew | 55 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 63 | Player Card | The page as an Instagram share card, optional invite code | 55, 56 | **built** 2026-10-24 and LIVE (stage96, sw.js v223): a door to the existing player card |
| 64 | Call Out | @mentions in replies ring the person; one push change with #54 Reply Rings | 54 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 65 | The Lineup | Bigger crew faces in the week band, a ring only for a held week (nobody shown behind), double-tap = Well Played, tap = page | 56, 59 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 66 | Proof Stamp | A post's photo stamped from `crew_posts.session` (session name, minutes, week mark, date, AA mark); one image when shared out | — | **built** 2026-10-24 and LIVE (stage96, sw.js v223): the stamp on Bell photo posts; the session card existed |
| 67 | The Open Wall | The Monthly Open as a wall of confirmed entries (face + result); photos kept for the Open's month need Amir's yes | an Open | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 68 | First Serve | A new athlete's first two weeks as a short list with a ring (first session, check-in, photo, join the crew, reminders last) in the invitation's Home slot | 56, 62 | **built** 2026-10-24 and LIVE (stage96, sw.js v223) |
| 69 | Bring a Partner | An athlete gets an affiliate code (affiliates row with `athlete_id`) shown on their page; friend's intake form counts it; the athlete's reward is Amir's call | — | **built** 2026-10-24 and LIVE (stage97, sw.js v223): friend 10%, member 10% off one cycle per friend (two friends = the next two cycles, Amir) |

**Build plan, 2026-10-24** (Amir: *"get ready to build the rest / first for each step, we want to plan"*):
https://claude.ai/artifact/X5L2WMkayoxx8eioc85SJV. Eleven steps, three directions each, picks A A A B B A A B A A A (step 0 = a
`crew_key` on every crew name + the `crew_page()` reader + one shared counting function, before step 1). Sources, the server/client
reports and the mockup fragments: `C:\Users\Amir\AA-Lounge\`. Corrections found while planning: **63 Player Card already exists**
(`TPL.player` in sharecard.js, "Your card", since 19 Oct), so 63 is a door to it from the page; **66's session card with a photo
exists** (`TPL.session`), so 66 is the stamp drawn on Bell photo posts; **comebacks are on the Bell's never list**, so another
person's page shows three numbers + cheers. Grown idea: **70 New Balls**, **built and LIVE 2026-10-24** with step 3 ("i like new balls idea, you can add it") (a new member's face says NEW for 7 days, the page says "Joined
this week. Say hello."), ships with step 3, pitched.

Cut in the same round (listed so they are not re-pitched): private messages (SEND MESSAGE), calories and minutes rings, Favorites
(Library sessions on top of a dosed plan), medal art / a level medal / greyed badges on others' pages, holiday "limited edition" badges
(the Open is), followers, a photo grid on the page, Ask the crew, sport groups inside the crew, one-on-one challenges, "training now"
live, "also in Sara's plan" on an exercise, cohorts by start month, match day on the page (the tennis-days rule: ask Amir), the
spinning coin, a wall per workout, group chat (Chat, Teams), choosing a cover (a skin), Connected Apps / heart rate, widgets, an upgrade
banner, a shop, birthday and email on the page. Parked: a "your plan" membership page (its own round).

## Round 7 · 2026-10-25 · "Home Crowd" (the Crew tab as a community page: friendlier, more fun)

Full write-up (two parts, 8 fields per idea, today's tab measured with screenshots, three directions for each look question,
dependencies, the cuts, seven calls): https://claude.ai/artifact/VQ7VRR7CvqQ4raUVSvh5gD

Brief: Amir, *"analyse the crew tab, as a community or a social page, what do you think we can do to improve? make it more user
friendly, make it more fun?"*. Live numbers that day (`C:\Users\Amir\AA-Lounge\usage-report.md`, 6 days of Crew, 12 hours of the
Lounge): 10 members; 3 of them 93% of all 85 acts, Amir's own athlete account 48%; 54 of 57 likes from 3 people; 6 of 10 posts no
reply, 1 reply ever between two members who are not Amir; 73% of the feed automatic; 0 posts in the coach's pinned lane; 1 of 6 posts
since 21 Oct with a photo; 3 of 10 members with no phone; 7 of 18 recently active athletes never answered the join question; Amir
cheered 8 on 24 Oct and 1 cheered back. Measured tab (`crew-review/measures.md`, fixture of nine): 5,808 px today (7.4 screens), 6,022
from the 1st to the 14th (honours are sent only then); 39 of 98 controls are reaction chips; every crew push lands on the top of Crew;
the settings sheet has 5 doors and 2 names. 36 ideas from the lenses, 14 kept. Honest call on the page: build the fixes, then 83 and
84; the rest waits for the 8 Nov numbers.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 76 | Words First | The tab's order: a slim band, the composer, then the feed; honours as the Bell's first card (1st-14th) then on the winner's page; the board as one row "This season · you are 4th ›" (3 directions: A Feed First = pick, B Two Rooms, C Strip of Doors) | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 77 | Land on It | A crew push opens the thing: a reply/mention its post, a cheer your page's cheers; after Post the tab scrolls to your post | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 78 | One Door, One Name | The settings sheet as "What the crew sees", two doors (account sheet Profile, your page); "What rings for you" → "The crew sees it when you…"; the composer titled "Share with the crew"; the said-no line gets its own Join button | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 79 | Reactions in Our Colours | The four stored emoji drawn as Phosphor line icons (Fire, barbell = Strong, confetti = Well done, heart = Love it; never the clap, which is the Cheer's); server unchanged (3 directions: A Line Icons = pick, B Green Glyphs, C One Like, Four Behind). Fixes a broken "no yellow" rule | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 80 | Looks Like What It Does | Tap cues: the clay Pinned pill goes green, whole honours tiles and moment-line faces and folded-line names become doors, board rows get a chevron, Reply/Delete/band faces to 44 × 44 | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 81 | Reply Right There | A box-like "Reply to Leila" line under every post, typing in place (3 directions: A A Reply Line = pick, B Half Sheet, C Reply Chip) | — | picked 2026-10-25, direction A ("81 A"); **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |
| 82 | Ask Where They Finish | (a) a non-member's finished card offers the join question; (b) a member with no phone sees "Turn on notifications so the next cheer reaches you" under Cheers this week (a fourth ask moment: needs Amir's word, push.md) | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 83 | For You | A strip at the top of Crew only when something happened to you; its list has Cheer back / Reply / Say hello; MVP "Cheer back" on your page's cheers; advanced Worth a Cheer (3 directions: A The Strip = pick, B The Bell Icon, C Cards in the Feed) | 77 | folded into 90 2026-10-25 ("go with your picks": the Inbox only); its Cheer back is built with 90 and on your page's cheers |
| 84 | Match Report | Monday's Bell card: last week's sessions, held, bests, joins, faces of who held, one line from Amir drafted in Courtside (about 1 min a week, optional); honours ride in on the 1st (3 directions: A Green Card = pick, B Amir's Post, C The Band Turns Over) | — | **rejected** 2026-10-25 ("cut 84", no reason given) |
| 85 | The Toss | Amir's this-or-that question of the week, one tap, faces under each side, 7 days; a bank of 40 drafted, 12 ticked a quarter; two new tables (backup + erase same day) (3 directions: A Two Halves = pick, B A Line in the Feed, C Inside Match Report). Not "Ask the crew" (members never ask) | — | picked 2026-10-25, athlete card A Two Halves, run from coach.html (desk A, Proof becomes Crew); **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |
| 86 | Hello, Crew | A never-posted member's composer opens with a hello built from their page; "Say hello" on NEW faces and join lines = the cheer sheet with "Welcome to the crew" ready; never a second toast after joining | — | picked 2026-10-25 ("86 is good"); **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |
| 87 | Theme Week | One photo theme a week in the composer and the Bell heading, from The Toss's bank; no gallery | 85 | picked 2026-10-25, direction C On the Toss Card; **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |
| 88 | Mailbag | Athletes ask privately on the Coach tab, Amir answers one a week as his pinned post (about 10 min a week) | — | picked 2026-10-25, direction A On the Coach Tab, answered from coach.html (desk A); **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |
| 89 | Walk-Out Song | An optional "Trains to" song in Player facts | — | **rejected** 2026-10-25 ("cut 89") |
| 90 | The Pigeonhole | ONE Inbox for the whole app (Amir's own question, 2026-10-25: *"how about like a notification center? or an inbox? how people can find things quicker or in one place?"*): everything done to you or sent to you in 7 days, newest first, each row a door (cheers, replies, @names, likes on posts and achievements, joins; then Amir's new week note, note cards, a new cycle); unread tinted, a count on the door; a folded crew push opens it; no new table, one read function + "last opened" on the phone; not a chat (WhatsApp stays). Found: a folded push names who, never what, and nothing in the app lists the six things once it is swiped; the only unread marker is the Crew tab's dot for a pinned post never used; 3 of 10 members have no phone (3 directions: A The Tray beside the initials = pick, B Coach Becomes Inbox, C Since You Were Here on Home) | 77 | picked 2026-10-25, direction A ("90A"); **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |

**Picks plan, 2026-10-25** (Amir's answers, in TASTE.md): https://claude.ai/artifact/Ap56d6pvqEfExFYsFN7P1T. 83 vs 90 answered (same rows,
a second door; my advice: the Inbox only, Cheer back inside it and on your page); the month's honours stay (Crew 1st-14th, the
winner's page, the Bell line, Courtside with Amir's Pick; September had only Most sessions, no Pick on record); three directions each
for 76 (where "In the crew ›" moves: B Beside the Numbers = pick), 87 (C On the Toss Card = pick), 88 (A On the Coach Tab = pick) and
the coach.html desk (A Proof Becomes Crew = pick, honours drawn by the same honoursHtml()); samples T1-T16 (Toss), P1-P12 (themes),
M1-M5 (Mailbag answers in his voice, each tied to a rule ID); the build in four steps (the tab · the Inbox · the weekly crew · talk
back) with traps; nine calls. Grown idea, also on The Coaching Graph:

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 91 | The Answer Book | Every Mailbag answer kept after its week on the Bell, on a Library shelf "Asked by the crew" (question, answer, the rule behind it in plain words); the Inbox row opens it; with his yes it feeds /chat-facts; kept out of the Playbook (parity rules untouched) | 88 | picked 2026-10-25 ("go with your picks"), built with step 3 (on The Coaching Graph); **built, LIVE 2026-10-25 (sw aap-v235, stage101-103)** |
| 92 | The Pick card | Amir's own ask (25 Oct): Amir's Pick gets a card on Crew for 14 days from the pick (her picture and name, his reason in his words, one clay Cheer button), replacing the pick's plain Bell line; the reason (140 characters, "Why her? The crew reads this") is written in Courtside and kept on her page's Honours row for good; a pick outside the crew sees it on their own page only. First use: Elmira, October (pickable from 1 Nov). 3 directions: A The Pick Card = pick, B In the Band, C Her Page Leads | — | built 2026-10-25 (step 1, live with sw aap-v231) |
| 93 | The Open, redrawn | Amir saw the first live Open (Wall Sit, 25 Oct) and said *"i hate the look, for now, take the wallsit off"*: the Open card on Crew (round 6's #67 Open Wall: title, how, a wall of result tiles, "Send Amir your result") needs three new directions and his pick before any Open goes live again. Wall Sit closed 2026-10-25 12:58 with 0 results; the six challenges are in `C:\Users\Amir\AA-Lounge\monthly-opens.md` | — | asked 2026-10-25 · needs three directions |

**Build, 2026-10-25:** Amir, *"go with your picks"*. Brief for the build session: `C:\Users\Amir\AA-Lounge\HOME-CROWD-BUILD-BRIEF.md`
(step 1 the tab, live when it passes; steps 2-4 the Inbox, the weekly crew, talk back, live together). Statuses become `built` with
each commit.

Cut in the same round (listed on the page so they are not re-pitched): ready-made reply chips (COM-3), GIFs and stickers, voice
cheers, who viewed your page (a read receipt), online now / typing, a crew total to reach (crew missions parked), Crew Day (one
Library session for all), post of the week by likes, most cheered this month, reactions on replies, member polls (Ask the crew),
a ring for every like, keeping your best post, a stories rail, a posting streak, crew badges, a crew chat, close friends /
following, search in the crew, a live Q&A, a day recap video, choosing your own cover.

## Round 8 · 2026-10-26 · "Ball Kid" (a coach-only Claude assistant in coach.html)

Full write-up (8 fields per idea, the three rules, Claude Code vs Ball Kid, costs, traps, findings, cuts, five calls):
https://claude.ai/artifact/6ucJvjwJTePGSoyyJeqhCr

Brief: Amir, *"have a little bit of look at my app and coach.html / see if i can use ai bot, to help me. i have claude api which i can use.
maybe like an assistant, give me reports, do things for me that help my clients"*. Live numbers that day: 41 programmes, 18 trained in 28
days, 119 sessions in 28 days (35 in 7); 37 day notes in 60 days, 14 naming a body part or pain; 13 notes unread in 14 days; 50 coaching
applications in 60 days (47 Farsi), median 7 days to "handled" in Leads, 5 linked to an athlete; 8 cycles end in the next 14 days, 11 ended
in the last 14; the ANTHROPIC_API_KEY secret is already set (site-chat, 1 conversation, $0.0008). The frame: it drafts and Amir sends
(COM-3), it reads and never writes a programme (PRC-1), the key stays in one coach-only Edge Function with a cap. Programmes and cycle
reports stay in Claude Code; Ball Kid feeds them. Cost estimate ~$15 a month for all seven on Opus 5.5.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 94 | Ball Kid | One coach-only Edge Function (`coach-assist`, verify_jwt on, `is_coach()`), named jobs, monthly cap, a content-free cost log, a COM-3 voice check in code; ⚙ Tools shows the month's spend | — | pitched |
| 95 | Order of Play | Monday's one-page report on Today (beside Needs you): last week, who needs a word and why, unanswered notes, warning signs, cycles ending, wins, three jobs; MVP a button that sends what the page already worked out (`reasonsOf()`, Courtside, cycle dates), advanced 7:00 Monday + email | 94 | pitched · recommended first |
| 96 | Line Call | Every session/exercise note called on arrival (Body, Question, Life, Good news, Nothing to do), two-line summary, reply draft in their language; Body notes first in Needs you; never diagnoses. Advanced: The Swap (Spine Alternatives into the draft, one tap into the ✎ editor) | 94 | pitched |
| 97 | Scouting Report | Each application in Leads briefed in English (goal, injuries flagged, fit, three questions) + a first WhatsApp reply in their language, prices only from CHATBOT-FACTS.md; a column on `hab_intake`; advanced: /athlete-intake reads it instead of Gmail | 94 | pitched |
| 98 | The Notebook | Paste a WhatsApp chat into the athlete file; kept as dated lines (Body, Life, Asks, Your promises) for /cycle-report, /program-design, Line Call and Order of Play; new coach-only table (backup + erase same day) | 94 | pitched |
| 99 | Hawk-Eye | Ask your data in plain words (answers with links and sources) + "Brief me" on each athlete file; MVP Brief me only, advanced tool use over fixed read-only coach functions, never SQL | 94 | pitched |
| 100 | Ready Position | "✎ Draft" beside every WhatsApp button (Courtside, Needs you, logins, nudge, Mailbag, Pick reason): a personal line from the athlete's week in Amir's voice; nothing sent, nothing logged | 94 | pitched |

Cut on the page (so they are not re-pitched): an athlete-facing chatbot in program.html, AI writing or editing programmes in coach.html,
anything sent automatically, a cycle report inside coach.html (a second copy of /cycle-report), AI-written crew posts (84), a record of who
Amir messaged (48), voice notes to text, Instagram content from client data. Found: `cycle_reports` holds one row from 2026-06-28 with a
`model` column (an old AI-report try, never shown).

## Round 9 · 2026-11-03 · "Nazm teardown" (a competitor's coach admin app against coach.html)

Full write-up (what Nazm is, feature by feature, 8 fields per idea, ranking, traps, four calls):
https://claude.ai/artifact/KQjJiAfREV7T5HbL5jG4mb

Brief: Amir asked for the code of Nazm (nazmapp.com, نظم), a paid Farsi PWA for coaches and tutors (students, Jalali session calendar,
free slots, working hours, per-head class pricing, payments and balances, expenses, four WhatsApp reminder templates with {name}
{class} {amount} {trainerName} {card}; Next.js on Liara; no athlete app). The code is not public; he took a teardown instead. Live
numbers that day: 39 programmes not paused, 36 with a dated cycle, 17 cycles ended since 20 Oct or ending by 3 Dec, 16 on Cycle 2 or
later, 0 `referral_credits` rows ever. Finding: **no payment data exists anywhere** (no table, no column); the renew reasons read
`endDate` only, so a prepaid Set or Match plan is flagged like a renewal. All four ideas are coach-only (the athlete's end-of-cycle ask
stays one line, Amir 2026-10-10).

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 101 | Box Office | A payments card on the athlete file (date, amount, $ or toman, PayPal or card-to-card, cycles covered, discount used) → "paid through Cycle N" on the file and roster; new coach-only `coach_payments` (backup + erase same day); a missed row falls back to today's reasons | — | **parked** 2026-11-03: not his aim (he wants a product for other coaches, coach.html unchanged) |
| 102 | Paid Through | `reasonsOf()` splits the cycle reasons by the paid-through cycle: "Last paid cycle ends in N days: renewal" vs "Cycle N is paid: build it"; renew fires only when nothing covers the next cycle | 101 | **parked** 2026-11-03 (as 101) |
| 103 | Stock Shots | Amir's message lines written once in Farsi and English with fill-ins ({name} {cycle} {next} {days} {amount} {card}), pre-filled behind every Needs-you WhatsApp button (the `?text=` pattern Courtside and logins use); stored coach-only, never in the repo; logs nothing | — | **parked** 2026-11-03 (as 101) |
| 104 | Gate Receipts | ⚙ Tools: taken this month in $ and toman (never summed), owed now, credits to use, the last 20 payments; advanced renewal rate by cycle number | 101 | **parked** 2026-11-03 (as 101) |

**The real brief, the same day:** *"my aim was not to change my own coach.html, i liked how this idea works, and i wanted to create
apps like that for coaches that i work with as a way to introduce my own app and because i create some websites, this will help as
an addition"*, then *"create the file in farsi, and imagine we want to copy the app and create an app like that in farsi, with our own
design"*. So round 9 became a Farsi product blueprint for a new app of his own (Nazm's features, his design, a door to his training
app, sold with his websites), republished at the same link. It is a new product, not one of the apps in SYSTEM-MAP.md.

Cut on the page (so they are not re-pitched): a session calendar, free slots and working hours (no scheduling around tennis; UTS and
the academy book at the club), per-head class pricing (CHATBOT-FACTS.md is the one price source), expenses, phone-number signup and a
trial, sending WhatsApp automatically (paid Business API, his voice out), showing the athlete "paid through" (the one-ask rule), Jalali
dates in coach.html. Those cuts are for **coach.html only**: the new product below has a calendar, free slots and Jalali dates.

**The blueprint, 2026-11-03 (status: pitched, nothing built).** His answers first: a Farsi blueprint only; first users are tennis and
padel coaches (Mehraneh, the Etminan academy, coaches like them); the door is an upgrade for their athletes into his training app; its
own brand, "by AA Performance" small; a free pilot for 3 to 5 coaches, then monthly; websites kept separate for now; messages are a
pre-filled WhatsApp plus SMS through an Iranian panel; athletes get a private link page in v1, no login. Three directions were drawn
and scored (A «سرِ زمین» On Court 25/30, B «شمارش معکوس» Countdown 21, C «اون‌ورِ تور» Other Side of the Net 21). **Pick: A**, the app
opens on the coach's day with one tap «اومد» per session, and the sessions write the money ledger, the jobs list and the athlete page.
Grafted from B: the package dot meter, the jobs-list order, the rain button, the «پرداخت کردم» claim the coach confirms. From C: every
coach action says what the athlete page will show, a first run that ends on a sample athlete page, the upgrade card's manners.
**Working name «لاب» (Lob)**; the others on the page are والی، کوک، هم‌زمین (none checked on Cafe Bazaar, Myket, domains or trademark).
Seven decisions wait on him in section ۱۳ (name, where the pilot lives, who pays the SMS panel, the upgrade tier, default class rules,
money on the athlete page, the pilot's shape and price), plus six questions only he can answer. Page:
https://claude.ai/artifact/KQjJiAfREV7T5HbL5jG4mb (version 2, Farsi).

**Version 3, the same day (status: picks taken, nothing built).** He answered *"go with your picks / like my own app, i want it to be
able to be saved on the phone / and i want to have notifications for both the customer and the coach about many things"*. So the
seven decisions are marked «انتخاب شد» on the page: the name «لاب»; a new Supabase Pro project and GitHub Pages from a private repo,
with a sanctions lawyer before the first paid coach; one shared SMS panel that he pays for in the pilot; upgrade tier A (the Etminan
shape); default class rules A; money on the athlete page A; Mehraneh as coach 1, 3 free months, a founder price locked for 12 months.
That reverses "the page never asks for notifications": web push is in v1. New section ۹ «نصب روی گوشی و اعلان‌ها»: both apps install
to the Home Screen, and the athlete page moves to its own origin `p.<brand-domain>`, so a "Don't allow" on one never costs the other.
Three directions for the moment the app asks (A «سرِ وقتش» Right on Cue 30/35, B «روز اول» Day One 25, C «کنارِ خودش» Right Beside
It 24). **Pick A**: nothing on a first visit, and the first ask comes under the row the person just used (the coach's first «اومد» of
a day, the player's first visit with news), our line and button before the phone's box. Grafts: install before login for an iPhone
coach, the first Home Screen open as an ask moment, a test push with a receipt and a reach word per player («اعلان» / «پیامک» /
«هیچی»), the «پرداخت کردم» then «خبرت کنیم؟» moment, an install code that carries what the player asked for, no ask while offline.
The notification list: P0 to P18 for players, K0 to K9 for parents of children, C0 to C8 for the coach, A1 to A10 for Amir as the
seller. The lock screen shows a name and a kind only. Channel order: push first (free), SMS only for must-arrive news with no
receipt, a pre-filled WhatsApp last. **Push in Iran, his word:** *"notifications can go through if they have access to internet
without the need of vpn / just get the info about this from my own app"*. His app backs it: 7 athletes in Iran have push on (5
iPhone, 2 Android), 55 reminders since 2026-10-20, 0 failures. Only a national cut or a phone without Google services stops it. The
build grew from 45 to 50 days to about 60 to 70. Decisions ۸ to ۱۷ carry my pick («انتخاب من، اگه نه بگو»). Three questions only he
can answer are left: does WhatsApp reach Mehraneh's players without a VPN, and which app do they answer on; does he (or a partner in
Iran) have an Iranian national ID, mobile and bank card for the SMS panel; how many minutes per athlete per cycle the upgrade costs
him. Same link, version 3.

**Version 4, the same day (status: nothing built).** His answers: *"Whatsapp needs vpn but everyone has vpn / Some prefer sms for
reminders / Keep the sms panel idea i need to ask my fanily in iran / When building , make sure the easier jobs to eb done with
cheaper agents / At the same time if you come up with new ideas of doing something or improvements, suggest then"*. So question 1 is
answered: the pre-filled WhatsApp stays, for news that can wait (a VPN can drop in several cities at once, so must-arrive news never
goes by WhatsApp alone). Question 2 waits on his family in Iran, and the panel stays in the plan (decision 3). Question 3 (his
minutes per athlete per cycle) is still open. Two new decisions, my pick on each: **۱۸ «یادآوری با چی»**, the player picks
reminders by notification or by SMS on their own page, the coach can set it for someone who never opens the page, the player's
choice wins, must-arrive news still goes every way; **۱۹ «صف پیامک از روز اول»**, every SMS goes into one `sms_outbox`; until the
panel exists it opens in the coach's evening check (no extra ring) as one `sms:` tap per person, and the day the panel is ready
the same queue sends itself. The pilot also counts how many SMS the panel would have sent and what it would have cost before he
pays for one. Also pitched: ask the family everything in one call (ID, mobile and bank card for the panel and whether they agree
to it being in their name; half an hour on two phones for build steps ۱ب and ۱۷; the bank card for tomans only after the lawyer).
The build table has a new column «کی می‌سازه»: about 29 of 66 days cheap agents alone (Sonnet, Haiku for the very simple), 27 both
(the expensive model designs and reviews once), about 10 the expensive model alone (money rules, receipts, legal text, the
upgrade door). Row ۱۴ grew a day for the SMS choice and queue. During the build every finished step may end with a one-line idea
(what, why, how many days), never added mid-step and never built without his yes. Same link, version 4.

**Version 5, the same day.** Asked "go with my picks for decisions 18 and 19?", he said *"Yes"*. Both are marked
«انتخاب شد» on the page: the player picks reminders by notification or SMS, and one `sms_outbox` from day one. Decisions ۸ to ۱۷
still carry my pick, open to his no. Same link, version 5.

**The build, from 2026-11-03.** Lob lives in its own private repo (`GitHub\lob`, local only so far). Step ۲ (local part: the
guards) and step ۳ (schema, row rules, the ledger rules, `player_state()` = `link_view()`, 262 PGlite checks) are done; the paid
items (Supabase, domain, GitHub Pro) wait on his yes; 2026-11-04 he said "Not yet" to all three, then "Yes, start ۳ب". Step ۳ب
(the push machine: phones, the queue, folding, quiet hours, the sender, cron; 477 database checks) is done. Its one design change
from the Website's crew queue: the mark is on each queued row, not one watermark per person, because a send for one person could
otherwise step over a held row (a 23:00 night-time cancellation would have swallowed a row waiting for 08:00). He then said "Yes,
start ۳ج": step ۳ج (the catalogue as drafts, delivery receipts, the rungs to SMS and the coach's own SIM, caps, mourning days and
the money window, the coach's class policy; 654 database checks) is done, lob d7703dc. Ideas from the finished steps, one line
each, none built:

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 105 | Cover the Gap | Selling a package to a player with counted sessions no package covers: the sheet asks whether this package covers them too and starts it early enough. Why: those sessions otherwise stay unpaid and out of sight (the numbers already count them as `unpackaged`). About half a day, in step ۹ | step ۹ | pitched |
| 106 | Makeup Running Out | A line in the coach's jobs for today when a player's makeup expires within 3 days. Why: an expired makeup is a lost session the player paid for; the expiry is already worked out. Only matters for a coach who sets an expiry. About half a day, in step ۱۰ | step ۱۰ | pitched |
| 107 | Only What Changed | An `updated_at` on every table that changes, so the phone pulls only what changed since its last sync. Why: the app opens faster on slow mobile data and after an outage. About half to one day, best before step ۶ builds the offline queue | step ۶ | pitched |
| 108 | Held Till Eight | When the coach does something after 21:50 that a player would be told about, one quiet line under it says it reaches them at 08:00, with an `sms:` tap if it cannot wait. Why: the coach otherwise thinks a late cancellation went out tonight; the queue already knows it is held. About half a day, in step ۱۴ | step ۱۴ | pitched |
| 109 | What Goes Next | A page only Amir sees listing what the sender would send in the next hour (the dry run it already has: `push-send?dry=1`), by coach and kind, names only. Why: during the pilot he can check the machine without holding a phone, and catch a wrong rule before a coach does. About half a day, with step ۴ب | step ۴ب | pitched |
| 110 | The Year's Calendar | Ship the official holidays and mourning days for 1405 and 1406 in `holidays` now, checked against the official calendar, instead of an empty table Amir fills by hand. Why: the money window and the mourning-day rule read that table, and with it empty money news could go out on Ashura. About half a day | — | pitched |
| 111 | Lock-Screen Proof Sheet | One page that shows every draft notification and SMS line (about 60) as it would sit on an iPhone and an Android lock screen, with Persian digits and sample names, grouped by who gets it. Why: step ۱۶ asks Amir to read every Farsi line, and one page beats hunting through SQL; a wrong word is fixed before any coach sees it. About half a day, before step ۱۶ | — | pitched |

## Round 10 · 2026-11-20 · "Crew Feed Facelift" (the Crew tab, inspired by Instagram, TikTok, Strava)

Page: https://claude.ai/artifact/5gPzro3bCbP93CN4vysaGr. Brief: Amir, *"the crew tab in the app have neem busy, have look at it, the messages
and other things hapening. how we can respond to things ... can it be improved? clearer? better looking? more interesting? get inspired by
social medias like instagram and tiktok and others"*. Live numbers (19 Oct to 20 Nov): 17 members (10 on 25 Oct), 12 trained 32 sessions
this week; Amir sent 86 of 123 cheers (70%), 26 of 31 likes this week, 59 of 96 achievement likes; members' own cheers per week 3, 12, 14,
6, 2; 26 of 36 cheer pairs mutual; 2 of 123 cheers with a word; 0 member posts in their own words this week (all 3 used app drafts: a
moment line, two welcomes); 1 photo (Amir's); 0 replies live, 0 @names, 0 Mailbag questions, 0 Open results; the Toss 4-6 votes a week
(the members' most-used feature); 10 of 17 with no face. Today's tab rendered from program.html with a local stub (Playwright is not
installed on this machine; the browser pane served a throwaway copy with stub.js injected, deleted after): every automatic line is as
tall as a post, and session lines have no reaction at all.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 112 | Quiet Lines | Automatic lines as slim rows (face, words, time, a heart with its count at the right end); same-day lines in one block; double-tap to like; the four emoji behind a long-press (Instagram) | — | **built** 2026-11-20, direction B ("go with your picks"), with 113, 114 and 120 |
| 113 | Post, Reshaped | Posts in the Instagram shape: full-width 4:5 photo with its stamp, line icons (heart, reply), "Liked by Mina and 3 others", the Reply box replaced by an icon, replies folded into "View 2 replies" (Instagram) | — | **built** 2026-11-20 in the feed pass |
| 114 | Trained Today | Session lines become a row of faces with a ring; double-tap a face = the Cheer (as 65), the ring turns clay once cheered; tap = page; today 32 sessions a week cannot be answered at all (Strava kudos) | — | **built** 2026-11-20 in the feed pass (stage111 adds `people` to get_bell's `sess` items) |
| 115 | Trophy Lines | A new best and an achievement get their own small card: emblem, the number big ("125 kg +5"); MVP achievements only; the load needs get_bell to send it and Amir's word (Strava PR card) | — | **parked** 2026-11-20 (after two weeks of numbers). The load conflicts with a standing rule (program-app-look.md: "a best names the lift and never a weight"), so only the emblem card is pitchable |
| 116 | Vote to See | The Toss hides counts until you vote, then bars with % and faces; Monday's Bell line gives last week's result (Instagram poll sticker) | — | **built** 2026-11-20 (Amir: "build 116, 117 and 119"); last week's answer is a line on the Toss card all week (stage114), not a Monday Bell line |
| 117 | Caught Up | New since last visit gets a clay dot, "Today · 4 new", and a "You're all caught up" line; from crewSeenAt() (Instagram) | — | **built** 2026-11-20 (Amir: "build 116, 117 and 119") |
| 118 | Pass It On | A cheer's sheet shows two crew mates who trained today and have no cheer yet, one tap each, so the room stops depending on Amir | 114 | **built** 2026-11-21 (Amir: "lets build 118 i like it"): a card in the Inbox and under Cheers this week on your page, two people who trained today with no cheer from you; says only what is true (no claim that nobody cheered them) |
| 119 | Show Your Face | The first cheer you receive asks for your face, once ("so the crew sees who they are cheering") (Instagram profile prompt) | — | **built** 2026-11-20 (Amir: "build 116, 117 and 119") |

Ranking on the page: 112 + 113 + 114 as one visual pass (three directions owed before building, by his rule), then 116, 117, 119; 118 and
115 after two weeks of numbers. Left out on purpose (already cut): stories rail, reply chips, GIFs, reactions on replies, followers, crew
chat, post of the week, posting streak, Match Report; also a TikTok swipe feed (about 5 real posts a week, nothing to swipe).

**Picks, 2026-11-20:** Amir, *"Go with your picks"*. Deep-dive with three directions for the feed pass (A Day Card, B The Feed =
pick, C Player Rows), coach hat, build plan (stage111 adds `people` to get_bell's `sess` items), traps and four calls:
https://claude.ai/artifact/8kYKCuynCHXZFhhgBKoQkL. Grown idea, also on The Coaching Graph:

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 120 | Add Yours | Your own face leads Trained Today with a green +; a tap opens Tell the crew with that session filled in (a photo still required); a second door to sharing where people already look, for the rest of the day (Instagram's + on your own avatar) | 114 | **built** 2026-11-20 with the feed pass |

**Moment cards, 2026-11-20.** Mid-build Amir sent the #115 card from the round 10 page (*"design somethings that are anounced similar to this
image , i liked it / like for their level, in an interesting way, even their records in a more interesting way, or joining or other
achievements"*). Page with three directions (A Trophy Rows = pick, B Win Wall, C Big Moment), every kind worked out with the cabinet's own
emblems, the record card's three options and four calls: https://claude.ai/artifact/7bydrN3KFDsDhEtZuyGv4w

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 121 | Moment Cards | #115 Trophy Lines grown into a family: every Bell moment (level, best, held weeks, achievement, mark, cycle, joined) as a card with its badge (the level medal, the achievement's emblem, the mark's emblem, a NEW BEST or CYCLE disc, the new member's face), one big fact with a clay change, who and the detail, the heart (Say hello on a join). The record's number is Amir's call: the lift only, the gain as a percent (pick, a server change), or the weight (changes the never-a-weight rule) | 112, 115 | **built** 2026-11-20, direction A Trophy Rows ("go with your picks"): the gain as a percent (stage112), a card for every level, the face with NEW and Say hello on a join |

## Round 11 · 2026-11-21 · "Five Weeks" (an activity tracker in program.html)

Page: https://claude.ai/artifact/7yRMTQJAmuJjkLmwZ7PQo2

Brief: while building a coach view of Library sessions (First Light, the morning back snack, had just shipped), Amir asked for *"a activity
tracker for people so they can see what kind of activity they had over the past month or 5 weeks"*: where, what, how, part of the Crew?
Live numbers: 178 plan sessions from 22 athletes in 35 days; 5 Library sessions ever, from 2 athletes; no screen shows a Library session
to the athlete or to coach.html, although the Done note says "Your coach can see you did it"; court time is not logged anywhere. Found:
`crew_page()` already keeps Library titles off other people's pages ("a Library session or a rehab day's name can hint at pain"), so kinds
stay private; the Cycle Bars (#58) already show extras as dots. Answers: Progress (direction A of three), four kinds, fills itself plus one
Add activity, not the Crew (counts only; a court session told by choice).

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 122 | Five Weeks | A 5-week grid (the cycle's W1-W5) first on Progress: a square per day coloured by kind (plan, Library by shelf, court, other), minutes per kind, tap a day for its list; MVP from session_history + library_sessions, no new table | — | **built** 2026-11-21 (stage115, sw aap-v261; PROGRAM-APP.md → *Your weeks*) |
| 123 | Court Log | "+ Add activity": Tennis, Padel, Match, Run, Other, minutes, Easy/Normal/Hard, today or the last 3 days; one `activity_log` table (backup + erase lists the same day); no XP at first | 122 | **built** 2026-11-21 (stage116; Amir: "Build Court Log"; PROGRAM-APP.md → *Your weeks* → Court Log) |
| 124 | The Mirror | The same grid on each athlete page in coach.html, and Library → Done lately with a count per session (what made "Your coach can see you did it" true) | 122 | **built** 2026-11-21 (stage115, sw aap-v261; PROGRAM-APP.md → *Your weeks*) |
| 125 | Load Read | Court Log feeds /program-design (court hours as context) and /cycle-report ("14 hours this cycle"), later court minutes × effort in the load ratio | 123 | **built** 2026-11-21 as information only (REC-7; Amir: "dont let program designer change the load ... without me"): /cycle-report Q5 and the Debrief, /program-design asks |

Cut on the page (so they are not re-pitched): steps and phone health data, calories, a streak of active days, a public minutes leaderboard.

## Round 12 · 2026-11-22 · "On the Move" (Court Log, Your weeks and the steps credit)

Page: https://claude.ai/artifact/6JxP2kxQN4WNCNuwui6Z13

Brief: straight after the steps credit went live (stage121), Amir: *"for this activity tracker and our activity, do you have any new ideas?
does other fitness apps do anything fun with them that works better on people?"*. Live numbers: 2 Court Log entries ever (a day old); 9 of
94 steps days reached 10,000 in 28 days; 151 sessions by 22 athletes in 28 days; 19 in the crew, the Race (a 7-day board) being built in
another session. Research: the big apps credit other sport as minutes at an intensity (Heart Points, AZM, Garmin Intensity Minutes), not
steps; adaptive step goals beat a fixed 10,000 by about 1,030 steps a day at day 110 (Adams 2017); in STEP UP (Patel 2019) only competition
lasted after the game stopped; BE FIT (Patel 2017) a shared stake with lifelines, goal days 53% vs 32%.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 126 | Played Today? | An evening row on Home's Today card and a "Same as last time" chip on Add activity: the athlete's last activity saved again in one tap (Garmin/Apple ask after a workout; we ask at the right time) | 123 | **built** 2026-11-22 (Amir: "Build 126 first"; cache aap-v280; the chip became the sheet opening on the last activity) |
| 127 | Yesterday on Court | The pre-session check-in shows yesterday's logged activity in one line; coach.html shows it on the session beside its RPE; information only (REC-7) | 123, 126 | **built** 2026-11-22 (Amir: "build 127 and 128"; cache aap-v283; carried as readiness.yday, no server change) |
| 128 | Cool Down Call | After a hard activity of 60+ min the save message offers one Library recovery session for the next morning | 123 | **built** 2026-11-22 (with 127; the pick is LIB_PICKS.sore, The Morning After) |
| 129 | The 150 | One line on Your weeks: this week's active minutes the WHO way (hard minutes count double) from plan sessions, Library and Court Log; later a Move habit (Heart Points, AZM) | 122, 123 | pitched (top 3) |
| 130 | Your Number | A personal Steps target (recent usual +10%, 6,000-12,000, rises Mondays when met 5 of 7); MVP coach.html suggests, Amir sets; XP weight is a rulebook call (D20) (Adams 2017, Apple Move goal) | — | **built** 2026-11-23 (Amir: "App suggests, you approve", "Full XP at their number"; stage125, cache aap-v294) |
| 131 | Court Told | Court Log save offers Tell the crew with a stamp (kind, minutes, day; never effort), for those who share activity (stage118) (Strava upload and kudos) | 123, the Race | **built** 2026-11-23 (Amir: "build 130 and 131" + the court icon; stage124, cache aap-v289) |
| 132 | Crew Hours | One shared weekly crew total (plan sessions for all, Court Log from sharers) under the Race card, faces of who added (STEP UP collaboration arm) | 131, the Race | pitched |
| 133 | Your Usual | Your weeks' foot compares this week's court and other minutes with the athlete's own 4-week usual; silent until 3 weeks of logs (Strava weekly range) | 122, 123 | **built** 2026-11-23 (Amir: "build 133"; cache aap-v289) |

Cut on the page (so they are not re-pitched): reading Apple Health or Health Connect (impossible from the web; Google Fit's server route
closed 30 June 2026), an athlete-facing strain or load score (round 5), calories, an active-day streak and a minutes leaderboard (round 11),
badges or tiers for activity (Career Mode cuts), a BE FIT team stake with lifelines (= #61 Doubles, cut; revisit past 20 in the crew), and
readiness moving the steps target (Oura; against REC-7).

## Round 13 · 2026-11-24 · "The Whole Week" (one model of total activity: plan, Library, Court Log, steps)

Page: https://claude.ai/artifact/U3KBuQcFvqBR4ra7q6ZLKc

Brief: Amir wanted every kind of activity in one picture for two health goals: fewer sedentary hours (steps) and more energy spent.
Live numbers (28 days): middle typed steps day 3,000 (97 days, 9 athletes; 60 under 5,000, 9 at 10,000); 9 of 22 who trained typed any
steps; 0 personal Steps numbers set; plan sessions alone give the middle athlete-week 646 MET-min (162 Move minutes), 38 of 68 weeks
past 600; 0 Library sessions, 4 Court Log rows ever. Model: two numbers from one MET engine (steps daily, Move minutes weekly =
MET-min ÷ 4 for minutes at 3+ MET; plan by session RPE on the Gym row, Library by shelf, Court Log's table, walking above 5,000 typed
steps at 100 a minute, max 60 a day; credit never becomes minutes, runs come off typed steps, the plan wins a tie). Amir: "go with
your picks but movement should give people xp, because those who walk get more xp compared to those who play tennis", and asked
whether he must pick each Your Number.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 134 | The Week Line | Move minutes per plan week on Your weeks (grid colours by source, 150 mark, 300 line, a counting sheet), the steps average under it; server `move_week()` in `get_five_weeks()` (one copy, no phone arithmetic), Gym row by RPE and `move_shelf_met()`; same row in coach.html, a line in /cycle-report (direction B of three; supersedes #129's "double at RPE 7+") | 122, 123 | **built** 2026-11-24 (Amir: "Yes, build it"; stage127 + rulebook v13, applied live; cache aap-v295) |
| 135 | Full Moving Week | 300 Move minutes in a plan week pays 150 XP once a week, all four sources (new rulebook version, D20) | 134 | **built** 2026-11-24 (Amir: "Yes, build it"; stage127 + rulebook v13, applied live; cache aap-v295) |
| 136 | Sport Fills the Day | The Court Log credit cap 70% → 100% of the athlete's number, so one normal hour of tennis is a full Steps day (72 XP, like 10,000 walked); forward only, two copies (`hab_log_credited()`, `stepsScored()`) | 121 | **built** 2026-11-24 (Amir: "Yes, build it"; stage127 + rulebook v13, applied live; cache aap-v295) |
| 137 | The Number Sets Itself | Your Number set by the app each Monday (14-day usual +10%, to 500, 6,000-12,000, after 7 typed days; up when met 5 of 7, never down by itself); coach.html's box becomes an override; not /program-design (runs every 5 weeks) | 130 | **built** 2026-11-24 (Amir: "Yes, build it"; stage127 + rulebook v13, applied live; cache aap-v295) |
| 138 | The Mix | coach.html: each athlete's Move minutes split "from your plan" vs "from their life" over five weeks; /program-design reads it as a question for Amir (REC-7) | 134 | **built** 2026-11-24 (grown out of this round; decision 9) (Amir: "Yes, build it"; stage127 + rulebook v13, applied live; cache aap-v295) |

Cut on the page (so they are not re-pitched): one blended activity score (hides the sitting), calories on any athlete screen (a
coach-only kcal line stays optional), steps credit for plan or Library sessions, XP per Move minute (pays sessions and walking twice),
a "save your week" push (= Break Point, cut), a minutes leaderboard.

## Round 14 · 2026-11-24 · "The Changeover" (recovery suggestions after a session, with an evidence brief)

Page: https://claude.ai/artifact/DR5ZxXpXH1vqr21yAzsnpy

Brief: an athlete asked how the app could tell them how to recover after training. Amir asked what the science says, what we can do
with what we have (session RPE, the new activities, the Library's breathing, rolling and stretching sessions) and what to add. /sc-research
ran first (his answers: adults of all levels; tonight + the next 48 h; current evidence + what changed; all four angles: feel vs perform vs
adapt, dosing from RPE and load, sleep/food/spacing first, tennis/padel); 50 papers checked against their abstracts. Live numbers (28 days):
151 sessions by 22 athletes, 140 with session RPE (mean 7.0, 41 at 8+), 24 sessions with 3+ sets at RPE 9-10; 9 sore check-ins (the only
finish-card recovery offer); recovery sessions done 3 times ever (one athlete, September); Sleep ticked by 8 athletes, Fuel by 10, Mobility
by 3, Breathe by 1; 78% of next sessions came 2+ days later (56 days). Found: the Library's own copy says "Sleep and food do the repairing"
(The Morning After) and nothing at the finish says it. Evidence: sleep, food and spacing do the recovering; massage, rolling, cold water and
compression ease soreness; stretching and breathing don't speed recovery (Raidl 2026 RCT); cold water after lifting costs strength (Malta 2021).
Numbered 139-145 because another session's round 13 took 134-138 the same day.

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 139 | Footprint | One read of a finished session: big / normal / easy from session RPE × minutes and sets at RPE 9-10, later the Spine's `loads` and `impact`, new exercises, cycle week, finish time and Court Log the day before; thresholds in a data file; never shown to the athlete as a number; a "big day" mark beside the RPE in coach.html; sits beside #134's MET engine | — | **built** 2026-11-24 ("go with your picks and build all"): recovery/footprint.toml, footprintOf() / footprintOfC() held equal by check_twins.js §12, the "big day" pill in coach.html; stage128 (get_my_history() returns minutes and the finish time), cache aap-v295 |
| 140 | The Last Word | 2-3 lines on the finished card for tonight and the next 48 h in Amir's words (about 15 templates, English and Farsi, COM-1/COM-3): protein and bed, what tomorrow will feel like, when the next hard day fits; at most one Library row and one article | 139 | **built** 2026-11-24: 13 lines in recovery/last-word.toml (English and Farsi, drafts for Amir), right under the finished card's send status, one Library row and one article, one offer per finished day; cache aap-v295 |
| 141 | Day Two | The morning after a big day (or new exercises, or a hard 60+ min activity) Home offers The Morning After, the morning it was written for, instead of only the finished card the evening before | 139 | **built** 2026-11-24: Home's suggestion slot, after First Serve and before Green Light; goes once opened, once a session or check-in starts the day, at midnight; cache aap-v295 |
| 142 | Back-to-Back | Cool Down Call also notices the second hard day running ("Tomorrow easy if you can") and a match (Final Whistle); information only (REC-7) | 123, 128 | **built** 2026-11-24: backToBackCall() in coolDownCall(): the second hard day running (court or a big gym day) with The Morning After, a match with Final Whistle; cache aap-v295 |
| 143 | Matched Pair | The one Library session offered follows the Spine body areas the session loaded (legs → The Morning After or Night Shift, elbow-forearm-wrist → Racket Arm, low back → First Light); never a Care loading session | 139 | **built** 2026-11-24: recovery/matched-pair.toml (never a Care loading session), plus a new Recovery session, Talking Pace (day-after-match), for the morning after a match or two hard days; cache aap-v295 |
| 144 | Stacked | coach.html, one line per cycle: big gym days within 24 h of hard court, hard days in a row, failure sets followed within 48 h by another lower-body day, check-ins after big days; feeds the Debrief and design's questions (REC-5, REC-7) | 139, 123 | **built** 2026-11-24: coach.html → The work → Stacked (stackedOfC()), /cycle-report Q8 with scripts/recovery/stacked.js running coach.html's own functions, /program-design asks (REC-7) |
| 145 | The Toolbox | One Library article (English and Farsi, /article) sorting recovery tools by feel / perform / adapt; ice baths never after lifting; /chat-facts and a carousel from it | — | **built** 2026-11-24 as two articles, What Actually Helps and Match Again Tomorrow (873f79ea), older articles pointing to them and Keep Your Edge citing Thomas 2018 (84567184), and their TPS lessons (3cd166b0); the carousel and chatbot facts are not done |

Cut on the page (so they are not re-pitched): a recovery score or readiness ring (rounds 5 and 12), cold water after S&C sessions, a
stretch or breathing block at the end of every session, a muscle map with "recovered %" (#28 Body Weather stays where it is), a bedtime
push after big days, recovery XP or a recovery mission, heart-rate variability from watches (round 12), a "how recovered do you feel"
check-in question (validated, but the check-in already has five; only if he asks), product suggestions (massage guns, compression).

## Round 15 · 2026-11-24 · "Over the Line" (achievements, medals and cards for the weekly total and for each activity)

Page: https://claude.ai/artifact/3PxRLCNLFF8tDf3TudwBTx

Brief: Amir, *"create some achievements/medals/congratz Cards and other things other achievement get, for weekly activity and the activity
it self, give me some suggestions of what we can do"*, straight after The Whole Week (#134-#138) went live. Live numbers: `move_week()` run
for 28 athletes over the 8 calendar weeks 28 Sep to 22 Nov: 122 active weeks, middle 203 Move minutes, 79 at the 150 mark (21 athletes),
26 at the 300 line (15 athletes), 3 athletes at it 3 times, nobody 4, 5 weeks past 450, 1 past 600 (max 686); a week beating the
athlete's own earlier best 28 times. Court Log: 6 activities ever, 3 athletes, 315 minutes, longest 60, no match; 1 `move_week` paid so
far. 134 awards to 29 athletes in 28 days. Walking has five steps achievements (GROUND COVERED I-III, QUARTER OF A MILLION, THE
MILLION); court time has none. Court Log writes no career fact today. Pay rule on the page: a one-time achievement pays XP (its own
source, as Held on top of week_held; rulebook v14, `paid_from` per D21); anything that comes back is recognition only (GAME-6).
Three directions: A Into the Cabinet (146-149, two new emblem shapes, ring and court roundel, steps Ink to Champion, never a metal) =
pick, with 150 riding along; B The Week Ends Well (151-153); C Every Activity Answers (150, 151, 155).

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 146 | Full Week | Achievement family for weeks at the 300 line, counted in total, never a streak: Full Week (first, `repeats = "move_week"` for "Won N times"), 4, 12, 26 Full Weeks at 100 / 200 / 500 / 1000 XP; test `total` on `move_week`; a ring emblem | 135 | pitched · top 3 (with 148) |
| 147 | Whole Week | Once: plan, court and walking (or Library) each 30+ Move minutes in one plan week, 150 XP; new test `week_parts` | 146 | pitched (once court data exists) |
| 148 | Court Hours | 10 / 25 / 100 hours of Court Log activity, every kind together, 150 / 400 / 1000 XP (25 h is about 290,000 steps of work = QUARTER OF A MILLION's 400); a 0-XP `activity_done` fact from `log_activity()`, new test `sum`; a court roundel emblem | 123 | pitched · top 3 (with 146) |
| 149 | Match Day and Cross-Court | Firsts on 148's fact: the first Match logged (50 XP), three kinds in one cycle (100 XP); not results (#36 Silverware stays its own) | 148 | pitched |
| 150 | The Count-Up | The Court Log save toast shows the activity's Move minutes and the week's bar filling in clay ("+68 Move minutes. 212 of 300"), from `get_five_weeks()`, no phone arithmetic; GAME-13; recognition only | 134 | pitched · **recommended first** |
| 151 | Over the Line | A Bell moment card (#121 family) for the activity or session that takes a week past 300: ring emblem, "OVER THE LINE +24", once a week per person, sharers only; recognition only | 135, 121 | pitched · top 3 |
| 152 | Best Week Yet | A clay "Best week yet" tag on Your weeks when the closing week beats the athlete's best of the previous eight (after three weeks), one Inbox line; no push, never "almost"; recognition only | 134 | pitched |
| 153 | The Monday Card | A 9:16 share card for a week at the line: the Move minutes big, a plan / court / walking / Library split bar, AMIRARDEKANI.COM, English and Farsi; waits for the share-card design pass | 134 | pitched (after the card pass) |
| 154 | Courtside Move Lines | The new awards in coach.html's Courtside with the WhatsApp line in the athlete's language (templates in `recognition.toml`); a tap per line | 146, 148 | pitched (comes with 146 and 148) |
| 155 | Long Day | Grown along the way: a 120+ minute activity shows "Long day" on its crew post, beside the recovery offer (#128, #141); no achievement on purpose | 123 | pitched |

Cut on the page (so they are not re-pitched): weeks at the line in a row (a count instead), a 600-minute week (pays for too much), a medal
per sport (collection), gold / silver / bronze (metals and the colour rule), XP per activity (the Steps credit pays), a Move minutes board
(rounds 11 and 13), an "almost there" Sunday line (= Break Point), achievements for effort or one long day.

## Grown out of deep-dives

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 5+ | The History Sheet | Every past session of a lift with an e1RM trend (from the #5 deep-dive) | 5 | **built** with #5 |
| 14 | Rungs | Each movement pattern as a staircase marked with the rungs this athlete has climbed | 1, 5 | **removed** 2026-09-24, the day it shipped: *"remove the rung, too much information, even im mixed up. doesnt help athlete."* Replaced by three plain lists: Regressions · Progressions · Alternatives |
| 15 | Who has this exercise | coach.html: exercise → every athlete doing it now (before changing a cue or video) | 1 | **built** 2026-09-24 in the Exercises editor |
| 16 | Not Yet | The ledgers' Paused exercises with their unlock gate in plain words (never a Banned one) | 1, 4 | **parked** 2026-09-24: its home was Rungs, now removed. Ask Amir before reviving |
| 17 | Still Warm | Qualities a cycle means to keep, flagged in coach.html when one goes cold (days since last logged working set) | 2, 5 | pitched (from the #2 deep-dive) |
| 18 | The Back-off Week Shows Itself | The closing week draws itself: a line on the Home day card, half the Primary set rows greyed (from the #12 deep-dive: the athlete did every set in his back-off week) | — | **built in part** 2026-09-26: the week note (`cycles[n].weekNotes`) shows on Home in its own week, as the This Week section itself (Front Page since 2026-10-12, no longer at the top of a session), written by the pipeline and required by `check_program.py`. The greyed set rows are not built |
