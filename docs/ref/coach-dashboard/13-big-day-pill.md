# 13. The big day pill (2026-11-24, #139 Footprint)

Amir, round 14 'The Changeover': *"go with your picks and build all"*. The athlete's app reads each finished session as big, normal or easy
(`docs/ref/program-app/63-the-changeover.md`). Here the coach sees the same read as a small neutral pill.

| Where | What it shows | Source |
|---|---|---|
| The work: each session's day card (`workDayCard()`), right after its `sRPE` | **big day**, a neutral pill (`.zpill.fp-big`). Its title gives the reasons: *session RPE 8+*, *load 1.4x their usual*, *3 sets at RPE 9+*, *4 sets of jumps or landings on a leg day*. | `bigDayMarkC(D, s)` |
| Earlier cycles (`earlierCyclesHtml()`), the same place | the same pill | the same |

- **It is `footprintOfC()`**, the coach's copy of the phone's `footprintOf()`. It reads `recovery/footprint.toml` as `window.AAREC`
  (`assets/js/recovery.js`, which coach.html loads). The inputs are the session as `session_history` keeps it, the athlete's earlier sessions, the
  file's Spine and `get_five_weeks()`'s Court Log rows. No cycle week here.
- **A twin.** `scripts/check_twins.js` section 12 runs both copies on the same sessions and fails if they differ. Change one, change both.
- **Information only** (REC-7, REC-2). It moves nothing in the plan and is not a flag: nothing in Needs you reads it. Nothing draws while the
  file's logs did not load (a session with no log shows no pill). No pill on an easy or normal session.
- **Change what counts as big** in `recovery/footprint.toml`, then ship it (the changing-a-number part of `recovery/PROCEDURES.md`).
- **Test**: `node scripts/headless/coach/run.js`, scenario `footprint-big-day-pill`.
