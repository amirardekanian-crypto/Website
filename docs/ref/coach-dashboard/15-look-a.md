# 15. Look A, the athlete page (2026-11-28)

Amir, on one athlete's page: *"i dont understand what you built for me / its just text, not cards, hard to read"*. He picked look A,
"Match stats", off a board of three (https://claude.ai/artifact/9aCZYM9qNmcqmmYC1Qtx3S), and said *"the dashboard doesnt have to follow
my colors"*.

**The idea.** Every number on The work is a duel on one split bar: theirs against their usual, their plan or their first estimate, with
its verdict in words and its chart in the same card. A fact is a chip, a line or a cell, never strung onto others with " · ".

**The look.** `#content.afa` (`renderNow()` sets it on an athlete's file only) carries look A's own palette: navy ink, hard-court blue for
the athlete's side of a bar, grey for the usual or the plan, green good, violet watch, red-orange miss. Still no yellow, gold, ochre or
amber. The face is Archivo (expanded for titles, verdicts and big figures). THE LOOK's five sizes and three radii are unchanged, so
`design-rules` holds. The shared parts are `aIco()` (stroke icons, never emoji), `aChip()`, `aSplit()` and `A_C` (the colours as hex for
SVG); the CSS is the block "THE ATHLETE PAGE, LOOK A" and its five parts.

| Card | What it shows | Where |
|---|---|---|
| Player card (the header, every sub-tab) | avatar, name, chips, the game line; up to three facts (sessions in all, habits logged in the last 7 days, last active); the cycle box (`Cycle i of n` and the name, a bar from start to end, the dates, a status chip, the focuses as bullets); the Needs you box (each `reasonsOf()` reason a row linking to its sub-tab, the first warning one blue; the goal line; "Add their WhatsApp" for a coached athlete with no number) | `renderDetail()`, `cycleLineHtml()`, `needsLineHtml()`, `waHeaderHtml()` |
| The read | one or two sentences: the cycle (over, ends today, week w of n), sessions done of planned, the biggest lift gains in kg, habits met on fewer than 3 of the last 7 days, notes to read | `readLineC()` |
| Training load · Readiness · Sessions done | three cards: the verdict word (Light week, Sweet spot, Climbing, Spike, Not enough data, Building a baseline · Normal, Lower day, Short day, No usual yet · On target, A bit under, Below target), the split bar, the zone strip, the 8 weekly bars with the usual week dashed, the last 16 check-ins, the sessions as slots by week (half for a partial), one plain sentence and a How to read it box. Every rule of §6 is unchanged | `scoreCardsC()` and its helpers |
| The cycle, day by day | the whole dated cycle as weeks of days (weeks start on the cycle's first day): sessions as D-number and minutes, a bolt on a big day, half-filled when partial; Court Log activity, darker when hard; a red bracket on two hard days in a row; the week's tally; then "What the calendar says" (days off mid-cycle, back to back, hard leg days close together, how many sessions were big, what big days did to the check-ins), counted by `stackedOfC()` so it always agrees with /cycle-report | `cycleCardC()`, `cyHardC()` (mirrors stackedOfC's hard day). An undated cycle keeps Five weeks and Stacked |
| Habits against their targets | a verdict, the two habits the cycle names (else the two weakest) as duels of the 7-day average against the target, the rest as rows with seven day dots, court and session chips, the steps target (it lived only on Proof), Show 14 days (the old grid, `#habGrid` unchanged), the week's wall lines | `habitsCardC()` and its helpers |
| Getting stronger | the lifts that went up (first estimate against now, the gain in green), the first estimates not retested yet (due a retest), body weight with its 90-day line and `#wtdet` holding the full chart | `strengthCardC()` and its helpers |
| Sessions this cycle | the day cards: a Day tile, the facts as chips (date, status, minutes, effort, big day, load, readiness, plan label), the score "N of M on plan", then Exercise · Asked · Did · Verdict, the verdict the same flag words as before as chips with icons and "On plan" for a clean row; the coach's note folds, the athlete's note stays in view | `workDayCard()`, `cmpRowHtml()`, `verdictChipsC()` |
| Their phone | a red card only when a day is in progress or finished or started on the phone with nothing on the server; otherwise one quiet line. The old snapshot is the fold `#livesnap` in both | `phoneCardC()`, `phoneStuckC()` |

**The Proof tab** is drawn only for someone with habits and no training: a training athlete's habits, steps target and wall lines are on
The work. The address `#a/<id>/proof` still opens its body for anyone.

**Kept as it was.** `reasonsOf()` is the one rule; the compare logic, every twin (readiness, the stale session, Footprint, `stackedOfC()`
and `stackedLineC()` that `scripts/recovery/stacked.js` cuts out by name), every write path and the steps-target handler are unchanged.
The cards read the same data the old panels read.

**Tests**: `node scripts/headless/coach/run.js look-a-` (`look-a-header-read`, `look-a-score-cards`, `look-a-cycle-calendar`,
`look-a-habits-strength`, `look-a-sessions`), with `design-rules`, `file-groups`, `stacked-panel`, `habgrid-file`, `proof-home`,
`readiness-chart`, `load-partial`, `optional-day`, `r3-library-charts-editor`, `footprint-big-day-pill`, `work-week-cap` and
`hints-once` reading the new cards.
