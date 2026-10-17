# The athlete profile

One current record of who the athlete is today (PRC-16). It is the `## Athlete profile` section of
their coaching log, right after the header and before the Exercise Ledger, and it is **replaced in
place**, never appended: each cycle's log entry says what changed and why (its *Profile changes*
line). `scripts/check_program.py` reads `aim`, `proven`, `bans`, `floor-except` and `cap` from it
and sets its own flags, so no run has to remember them.

**Who writes it:** /athlete-intake drafts it · /program-roadmap adds the goal order and the bottleneck
and saves it with the roadmap when it locks (PRC-3) · /program-design updates it every cycle (the spec
opens with the current block) · /program-edit updates it when an edit changes who the athlete is ·
`publish_cycle(p_log_profile)` writes it at publish. (Moved here from /program-assemble Step 5 on
2026-09-27, so intake, design and edit read these lines instead of the assemble skill.)

## The format

One `key: value` per line (made-up values). No athlete name or id inside it beyond the log's own
header: it lives in the coach-only row.

````
## Athlete profile
```profile
aim: sport                 # sport | strength-muscle | general: see "Choosing the aim" below
tier: -                    # - for a coached athlete; academy (Etminan): see below
sport: padel
sex: male · age: 34
training-age: 5 years in a gym; demonstrated: strong on machines, new to free weights
goals: 1 a faster first step · 2 a knee that lasts three matches a week · 3 lose 4 kg
bottleneck: single-leg strength on the bad side
days: 3 gym
minutes: form 60 · logs 70 · hard stop: no
cap: 70                    # what design aims at: the real minutes, or form + 15 for a new athlete
equipment: commercial gym
proven: -                  # the evidence that lets an exercise go past 4 sets, or -
bans: jump, depth, deep squat   # words the checker looks for in names and fallbacks
floor-except: -            # a major muscle excused from the floor, with the reason
injuries: right knee, managed (patellar tendon) · low back, resolved
dislikes: burpees
recovery: sleep 6 h, poor · stress moderate · life load high
language: English
updated: 2026-09-26 · /program-design, Cycle 3
```
````

## Choosing the aim (2026-10-17)

`aim` is the one line that switches the 10-set floor (VOL-4) on or off, so it is decided again every
cycle, at design's STEP 0, from the goals and THIS cycle's `art`, and the checkpoint names the line
below that decided it. In this order:
- **`sport`**: a tennis or padel player training for their game. Their volume is a report (VOL-1),
  and the floor stays off (VOL-4).
- **`strength-muscle`**: building muscle or getting stronger is goal 1 or goal 2, **or** this cycle's
  `art` is `build` or `iron`. The checker turns the floor on; a muscle excused goes on `floor-except:`
  with its reason.
- **`general`**: only when neither line above holds. It switches the floor off, so it is never the
  aim of a muscle or strength cycle (on 2026-10-17 a muscle cycle written as `general` shipped one
  major muscle at 4.5 sets a week, and nothing flagged it).

A change from last cycle goes on the log entry's *Profile changes* line with the reason.

## tier: academy (Etminan)

A player who came through Etminan Tennis Academy has `tier: academy (Etminan)` (their intake row's
`programme` is the academy's). Their deal decides the design (Amir, 2026-09-12):
- **2 sessions a week, up to 60 minutes each, and 60 is a hard stop**: `days: 2`,
  `minutes: … hard stop: yes`, `cap: 60`.
- **At home or on court, with minimum kit.** Not a gym programme.
- **Speed, agility, quickness and conditioning** (`aim: sport`).
- **The brief is the 3 priorities Amir sets** from 5 minutes of the player's match video. Don't go
  looking for more.
- **No mid-cycle changes.** The cycle is designed once and runs, so write it to survive unattended:
  nothing that needs a week-3 check-in to adjust.
- AA Proof and the Library's warm-up and recovery sessions are part of the deal, so the notes can
  point at them.

A gym or fat-loss programme on top is outside the deal (an upgrade to the full tier), not something
to fold in.

## status: partial

A block with a `status: partial …` line holds only some of the lines: the academy players' blocks
were written that way on 2026-09-27, before their next design. While it says partial, design's
context pull returns the WHOLE log, and design completes the block this cycle from it, the latest
Debrief, the roadmap and the intake form, keeping every line already there, then drops the
`status` line.
