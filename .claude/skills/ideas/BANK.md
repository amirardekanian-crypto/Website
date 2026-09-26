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

## Grown out of deep-dives

| # | Name | What | Needs | Status |
|---|---|---|---|---|
| 5+ | The History Sheet | Every past session of a lift with an e1RM trend (from the #5 deep-dive) | 5 | **built** with #5 |
| 14 | Rungs | Each movement pattern as a staircase marked with the rungs this athlete has climbed | 1, 5 | **removed** 2026-09-24, the day it shipped: *"remove the rung, too much information, even im mixed up. doesnt help athlete."* Replaced by three plain lists: Regressions · Progressions · Alternatives |
| 15 | Who has this exercise | coach.html: exercise → every athlete doing it now (before changing a cue or video) | 1 | **built** 2026-09-24 in the Exercises editor |
| 16 | Not Yet | The ledgers' Paused exercises with their unlock gate in plain words (never a Banned one) | 1, 4 | **parked** 2026-09-24: its home was Rungs, now removed. Ask Amir before reviving |
| 17 | Still Warm | Qualities a cycle means to keep, flagged in coach.html when one goes cold (days since last logged working set) | 2, 5 | pitched (from the #2 deep-dive) |
| 18 | The Back-off Week Shows Itself | The closing week draws itself: a line on the Home day card, half the Primary set rows greyed (from the #12 deep-dive: the athlete did every set in his back-off week) | — | **built in part** 2026-09-26: the week note (`cycles[n].weekNotes`) shows under This Week on Home and at the top of every session in week 1 and the last week, written by the pipeline and required by `check_program.py`. The greyed set rows are not built |
