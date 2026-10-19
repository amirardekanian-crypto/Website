## 6.6 The comeback — the one thing you cannot earn by never slipping

*(Amir, 2026-08-02: "make the economy pays for comeback".)*

Every **continuation** moment in this app was priced — the 20:00 at-risk nudge, day-streak
marks at 3/7/14/21/30/50/75/100 — and the **return after a lapse**, the highest-leverage
moment in habit formation and the one every tracker handles worst, paid nothing at all. A
lapsed athlete's day one again scored exactly like any other day. Amir's own coaching
principles already say *"a hard week survived"* is a genuine win worth its own card; this
is the app finally agreeing.

```js
const LAPSE_DAYS = 3;      // consecutive non-qualifying days that make it a lapse
const COMEBACK_XP = 50;    // flat, every time
const COMEBACK_STICK = 7;  // qualifying days after a return before it counts as STUCK
```

**`LAPSE_DAYS: 3` matches `BACKFILL_DAYS`.** Once you are three days gone you can no longer
repair those days, so the absence is permanent rather than a wobble — that is the honest
definition of a lapse in this app, and it means the two windows move together if either is
retuned.

**It cannot be farmed, and that is arithmetic rather than a rule.** Three non-qualifying
days forfeit roughly 750 XP of ordinary habit XP to collect 50. Proven in the browser: the
same athlete logging four straight days scores **1,400 XP**; lapsing three days and logging
two scores **432**. So the bonus stays **repeatable**, which it must be — the fourth return
matters as much as the first — and no anti-abuse machinery is needed.

### What it pays

| | | |
|---|---|---|
| **The return** | dated bonus, `comeback` kind | 50 XP, every time |
| **BACK IN THE FIGHT I** | `comebackRun` ≥ 7 | 200 XP |
| **BACK IN THE FIGHT II** (it was *THE LONG ROAD BACK*) | `comebackRun` ≥ 21 | 400 XP |
| **HARD TO KILL I** | `comebacksStuck` ≥ 3 | 300 XP |
| **HARD TO KILL II** (it was *UNSINKABLE*) | `comebacksStuck` ≥ 5 | 600 XP |
| **BACKBONE** (event) | 2 stuck · 14-day run · 30 days on target | the **UNBOWED** title |

The badges deliberately reward the **week after**, not the reappearance: returning is easy,
staying is the job. `comebackRun` is the longest stretch of qualifying days held after any
single comeback; `comebacksStuck` counts comebacks held for `COMEBACK_STICK` days or more.

### Two things that are easy to get wrong

⚠️ **`comebackRuns()` walks the CALENDAR, not `loggedDays()`.** A lapse is mostly days with
nothing in them at all, and a day with nothing in it never appears in the log — so walking
logged days would skip every real disappearance, which is the only thing the function
exists to notice. Every day it can *emit* on is a qualifying day, and a qualifying day
always has entries, so the milestone ledger can still find each one in `seasonDays()`.

⚠️ **A comeback needs a previous qualifying day.** You cannot return somewhere you have
never been, so an athlete's first-ever qualifying day is a *start*. The client tracks this
with an `everQualified` flag; the server gets it for free, because `lag()` over qualifying
days is null on the first one. The two must agree exactly or the board and the phone pay
different XP.

Scopes follow the split in §4.5 exactly: `comebackRuns(true)` walks all history for the
**display** half (`measureAch()`, the event goals), `comebackRuns(false)` walks the season
for the **ledger**, because bonus XP is only ever paid inside the season.
Once the XP switch is on the ledger's walk is the career's (`scoreDays()`), and the server's career score calls `hab_bonus_xp()`
with no season, like every badge.

**Server half: `supabase/stage22_gate_and_comeback.sql`** — and it is a **no-op until its
rules keys are written**, deliberately, so the file can be applied before the client ships.
See the four-step rollout in its header.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
