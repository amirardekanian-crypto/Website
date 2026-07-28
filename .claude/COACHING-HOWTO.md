# Coaching pipeline — operating reference (for Claude)

Amir doesn't read this file — he talks in plain language and expects the pipeline to just
run. This is *your* reference: the end-to-end choreography across skills that no single
`SKILL.md` owns by itself, because each skill only documents its own inputs/outputs. When
a skill's own file conflicts with something here, the skill wins — this is sequencing
only, never a second copy of a coaching judgment call (those live in
`.claude/COACHING-PRINCIPLES.md` alone).

## New client
1. **`/athlete-intake`** — pulls their Web3Forms intake form, asks Amir for the gaps
   (injuries, equipment, days/week) → produces the Athlete Brief.
2. **`/program-roadmap`** — multi-cycle plan. **Locked once written** — design/engage read
   it, never rewrite it.
3. **`/program-design`** ("do prompt 1") — the cycle spec + coach-facing reports. Stop at
   its STEP 1 checkpoint for any genuine coaching fork; don't stop for cosmetic ones (see
   COACHING-PRINCIPLES.md → Process, "multi-lens panel").
4. **`/program-engage`** ("do prompt 2") — app message, outcomes, notes, completion text.
   Writes zero programming.
5. **`/program-assemble`** ("build the json" / "ship it") — writes `data/<id>.json`,
   advances the cycle, appends the coaching log entry.
6. **Commit + push** — Amir iterates on the *live* site; don't stop at "written" or
   "staged." See `CLAUDE.md` → "How Amir works."

## Returning client — next cycle
1. Use whatever check-in/logs Amir pastes; otherwise `/program-design` pulls
   `session_history` + reports itself via the athlete-brief agent.
2. `/program-design` re-reads the athlete's coaching log (`.claude/coaching-log/<id>.md`)
   first — why the last cycle looked the way it did — and **progresses that logic**, never
   starts from a blank slate (COACHING-PRINCIPLES.md → Process, "cycles continue").
3. Same design → engage → assemble → commit/push sequence as above.

## Conversational rhythm Amir expects
- Natural language works ("design Mehraneh's next cycle," "write her notes," "ship it") —
  slash-command names work too, neither is required over the other.
- Once he's said "go ahead" on a design, run the remaining steps without re-confirming each
  one — only pause again at a genuine fork.
- He gives blunt feedback; that's normal input, not friction to smooth over.

## Housekeeping
- This file is sequencing only. A coaching judgment call, a naming rule, a communication
  rule — anything Amir would call "how I coach" — belongs in `COACHING-PRINCIPLES.md`, not
  here; if you're about to restate one here, stop and go add/point to it there instead.
- To learn a new generalizable principle mid-conversation: offer to save it to
  `COACHING-PRINCIPLES.md` (the save mechanic and its rules live in that file's own header,
  not duplicated here).
