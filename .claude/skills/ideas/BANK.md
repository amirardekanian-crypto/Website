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
| The Road Remembers | Each finished cycle on Progress wears what it earned | pitched (grown idea) |
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
| 55 | Player Page | Every name in Crew opens that person's page from existing data: cycle picture as cover, level ring, plain sport, with Amir since, the four numbers, achievements, honours, this week's posts; only what their switches allow | — | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 56 | Your Face | One photo per person, everywhere a name sits and in coach.html; reuses Highlight Reel's picker; ~20 KB on the server | — | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 57 | Plays | ATP-style chips (hand, backhand, padel side, club or city, an optional Instagram handle) + one "Working on" line; "Trains for" for fitness clients; handedness feeds /program-design | 55 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 58 | Cycle Grid | The cycle as W1-W5 rows, trained days filled, a held week a full row, "8 of 15" = the plan's own target (was "Season Calendar", a month view, changed after Ladder's RELOAD grid) | 55 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 59 | Well Played | A cheer to a person (not a post) with an optional 100-character word, rings their phone, 7 days on their page, cheers-this-season count; Amir can send one as Coach; no private messages | 55 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 60 | Signed Ball | Names of who liked an achievement's Bell line kept on the achievement past the 7-day sweep | 55 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 61 | Doubles | A monthly partner: both pages, "held the week together", "one to go"; STEP UP says expect little | 55 | **rejected** 2026-10-24 by Amir ("cut idea 61") |
| 62 | Your Page Is Ready | The join question and Home's one-time invitation show the athlete their own page first; coach.html lists who trains and is not in the crew | 55 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 63 | Player Card | The page as an Instagram share card, optional invite code | 55, 56 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 64 | Call Out | @mentions in replies ring the person; one push change with #54 Reply Rings | 54 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 65 | The Lineup | Bigger crew faces in the week band, a ring only for a held week (nobody shown behind), double-tap = Well Played, tap = page | 56, 59 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 66 | Proof Stamp | A post's photo stamped from `crew_posts.session` (session name, minutes, week mark, date, AA mark); one image when shared out | — | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 67 | The Open Wall | The Monthly Open as a wall of confirmed entries (face + result); photos kept for the Open's month need Amir's yes | an Open | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 68 | First Serve | A new athlete's first two weeks as a short list with a ring (first session, check-in, photo, join the crew, reminders last) in the invitation's Home slot | 56, 62 | **picked** 2026-10-24 ("get ready to build the rest"), plan per step first |
| 69 | Bring a Partner | An athlete gets an affiliate code (affiliates row with `athlete_id`) shown on their page; friend's intake form counts it; the athlete's reward is Amir's call | — | **picked** 2026-10-24: the friend gets 10% and the member gets 10% (Amir), plan per step first |

**Build plan, 2026-10-24** (Amir: *"get ready to build the rest / first for each step, we want to plan"*):
https://claude.ai/artifact/X5L2WMkayoxx8eioc85SJV. Eleven steps, three directions each, picks A A A B B A A B A A A (step 0 = a
`crew_key` on every crew name + the `crew_page()` reader + one shared counting function, before step 1). Sources, the server/client
reports and the mockup fragments: `C:\Users\Amir\AA-Lounge\`. Corrections found while planning: **63 Player Card already exists**
(`TPL.player` in sharecard.js, "Your card", since 19 Oct), so 63 is a door to it from the page; **66's session card with a photo
exists** (`TPL.session`), so 66 is the stamp drawn on Bell photo posts; **comebacks are on the Bell's never list**, so another
person's page shows three numbers + cheers. Grown idea: **70 New Balls** (a new member's face says NEW for 7 days, the page says "Joined
this week. Say hello."), ships with step 3, pitched.

Cut in the same round (listed so they are not re-pitched): private messages (SEND MESSAGE), calories and minutes rings, Favorites
(Library sessions on top of a dosed plan), medal art / a level medal / greyed badges on others' pages, holiday "limited edition" badges
(the Open is), followers, a photo grid on the page, Ask the crew, sport groups inside the crew, one-on-one challenges, "training now"
live, "also in Sara's plan" on an exercise, cohorts by start month, match day on the page (the tennis-days rule: ask Amir), the
spinning coin, a wall per workout, group chat (Chat, Teams), choosing a cover (a skin), Connected Apps / heart rate, widgets, an upgrade
banner, a shop, birthday and email on the page. Parked: a "your plan" membership page (its own round).

## Grown out of deep-dives

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 5+ | The History Sheet | Every past session of a lift with an e1RM trend (from the #5 deep-dive) | 5 | **built** with #5 |
| 14 | Rungs | Each movement pattern as a staircase marked with the rungs this athlete has climbed | 1, 5 | **removed** 2026-09-24, the day it shipped: *"remove the rung, too much information, even im mixed up. doesnt help athlete."* Replaced by three plain lists: Regressions · Progressions · Alternatives |
| 15 | Who has this exercise | coach.html: exercise → every athlete doing it now (before changing a cue or video) | 1 | **built** 2026-09-24 in the Exercises editor |
| 16 | Not Yet | The ledgers' Paused exercises with their unlock gate in plain words (never a Banned one) | 1, 4 | **parked** 2026-09-24: its home was Rungs, now removed. Ask Amir before reviving |
| 17 | Still Warm | Qualities a cycle means to keep, flagged in coach.html when one goes cold (days since last logged working set) | 2, 5 | pitched (from the #2 deep-dive) |
| 18 | The Back-off Week Shows Itself | The closing week draws itself: a line on the Home day card, half the Primary set rows greyed (from the #12 deep-dive: the athlete did every set in his back-off week) | — | **built in part** 2026-09-26: the week note (`cycles[n].weekNotes`) shows on Home in its own week, as the This Week section itself (Front Page since 2026-10-12, no longer at the top of a session), written by the pipeline and required by `check_program.py`. The greyed set rows are not built |
