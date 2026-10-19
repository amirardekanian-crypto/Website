## 6. The day score, and day streaks

**The day score is weighted, and it is two numbers.** Both come from `dayParts(day, mode)`
in `habits.html`, which walks `rosterOn(day)` and sums `baseXp()` rather than counting
heads. A headcount said a supplement and a training session were the same day's work; the
percentage was the last number in the app that still believed that.

⚠️ **Once Career Mode's XP switch is on, nothing in this section changes.** WORKOUT still weighs 100 in `dayParts()`, the gate,
`dayPct()`, `isPerfect()` and the day streak. Only its *daily XP* is 0 (§1). The weight and the pay are two things, and the gate
reads the weight.

⚠️ **Both halves are pro-rata now** (2026-08-02, Amir: *"for all the habits that have bars
to fill, like sleep, water, steps, food or anything else, i want that to be added toward
their day completion percentage"*). An incomplete counter contributes `min(v / target, 1)
× weight` in either mode — 9,500 of 10,000 steps is 95% of the job, not zero, whether the
question is *did this day count* (gate) or *what was this day worth* (score). That one
change takes a 9,500-step day from 67% to 98% under either half.

This was gate-only from earlier the same day until this change. The original reasoning for
keeping the score half binary was real: `xpFor()` already pays pro-rata *with* a completion
bonus, so a linear percentage risked being the one number that did not reward finishing —
you could sit at 80% having completed nothing at all. That worry is `isPerfect()`'s job,
not `dayPct()`'s: `isPerfect()` stays `every(isDone)`, untouched, so a day reading high on
partial credit still cannot trigger the perfect-day takeover or badge unless every habit
actually hit its target. With that backstop in place, quietly rounding a near-finished
counter down to nothing was the less honest of the two numbers.

| | Denominator | Used by |
|---|---|---|
| **`dayPct()`** — what the day was *worth* | every habit on that day's roster, session included | the roll call wall and the share cards (not Today since PRF-03 and PRF-05) |
| **`gatePct()`** — what the athlete could *do* | same, minus any **locked** habit they did not earn that day | day streaks, and nothing else |

**Today leads with the verdict, not a percentage** (PRF-03, 2026-09-27; display only). The tile
beside the week says *2 to go*, *On target* or *Perfect* from `dayQualifies()` and `dayToGo()`,
the fewest habits that would make the day count (each adds only what it still lacks; either
door). No constant and no server rule moved: `xp_rules` is untouched, and `dayToGo()` reads
only `dayParts()`, `gatePasses()` and `baseXp()`, so it follows any change to them.

⚠️ **`dayPct()` needed no server migration.** It is computed client-side and sent up as a
pre-computed number (`p_pct`) when posting a roll call — nothing recomputes it
server-side, so there is no second copy to drift out of sync. The server's own score-half
column, `wdone` (`stage22_gate_and_comeback.sql`), is a *different* thing: an internal
fallback inside the `qualday` CTE, used only for the `qualify` quest kind when `gateV2` is
off, never surfaced to anyone as a percentage. It is left exactly as shipped — still
binary, and its "stays binary on purpose" comment there now describes only that narrow
fallback, not the score half in general.

⚠️ **The gate is what makes weighting safe, not a nicety.** WORKOUT is 100 of 350 — 28.6%
of the default day — against a threshold that allows 25% of slack. Weighted straight into
the denominator it stops being a weight and becomes a **precondition**: a rest day tops out
at 250/350 = 71% and can never qualify, so a 4×/week athlete's streak dies every rest day.
Worse, a **free-tier athlete's WORKOUT is locked for life** — their ceiling would be 71%
for ever and they would never have a qualifying day again, while `proof.html` promises them
in Amir's own voice that only the *perfect* day is out of reach. Dropping an unearned lock
from **both halves** of the fraction fixes all of it: a rest day with everything else done
is 250/250 = 100%. Finishing a session can then only ever help — it re-enters the
denominator already complete.

`isPerfect()` is deliberately **not** weighted and not gated: still `every(isDone)` over
the whole roster, padlock included. It is what keeps `proof.html` true, and it is the
client twin of the server's `ndone >= nlive`.

### `streakQualifyPct: 80`

A day counts toward the day-streak at **80% of the weight it could have earned, OR with at
most one thing left undone.** Either door opens it.

⚠️ **The second door is the promise, and it exists because the percentage alone was a lie
on the roster most athletes have** (2026-08-02). Everything below this paragraph was worked
out on the *eight-habit* roster — denominator 250, worst single miss steps at 190/250 = 76%,
just clear. But `defaultCfg()` starts every add-on **OFF**, so the shipped default is the
five core habits and the gate denominator is **180**:

| core-only roster, missing… | of 180 | % | old rule | now |
|---|---|---|---|---|
| steps | 120 | 67 | ❌ | ✅ |
| sleep | 130 | 72 | ❌ | ✅ |
| fuel | 140 | 78 | ✅ | ✅ |
| water | 150 | 83 | ✅ | ✅ |
| steps **and** water | 90 | 50 | ❌ | ❌ |

So a brand-new athlete had to fully hit **both steps and sleep every single day** to hold
any streak, while a veteran with three add-ons switched on got the forgiving version the
tuning was written for. It was backwards twice over: the people the 75% gate exists to
protect were the only ones it did not cover, and because padding the denominator softens
the gate, **opting into the cheapest self-reported add-ons was literally streak insurance**.
`done > 0` is also required, so a one-habit roster cannot qualify on an empty day.

The eight-habit reasoning still holds and is kept below for the record.

| rest day, missing… | of 250 | % | counts at 75 |
|---|---|---|---|
| nothing | 250 | 100 | ✅ |
| supps *or* breathe | 230 | 92 | ✅ |
| fuel | 210 | 84 | ✅ |
| sleep | 200 | 80 | ✅ |
| **steps** (worst single miss) | 190 | **76** | ✅ |
| sleep + supps | 180 | 72 | ❌ |
| steps + supps | 170 | 68 | ❌ |

**Nobody's streak got shorter when the weighted gate shipped at 75** — verified over a
61-day log: 0 days stopped qualifying, 6 started. **The move back to 80 (2026-08-02) was
different, and it is the cost of this knob:** streaks are derived, so raising the bar
shortens them retroactively. Measured across the eleven athletes then on the board, five
lost qualifying days and three had a shorter current day streak — the largest was Amir's
own, 5 → 2 (the per-athlete table, anonymised, is in `HABITS.md` → *…and back to 80*).
**Nobody lost XP, a title or a level** (checked at both thresholds): only derived streak
counters moved, and rewards are append-only anyway. Set it to `100` to demand a perfect
day, or lower to be kinder. This also drives the "days on target" figure in the weekly
recap.

**Both halves are scored twice**, as ever. The server mirror is
`supabase/stage19_weighted_days.sql` — the `perday` CTE gains `wdone`/`glive`, and the `qd`
CTE (the `qualify` quest kind, the **only** path from a day fraction to XP) reads them. The
gate's exclusion list arrives as a new `xp_rules` key, `unearnable`, because the server has
no `locked` flag: `p_rules` carries `targets` and `weights` only.

```sql
update public.xp_rules
set rules = rules || '{"unearnable":["strength"],"streakQualifyPct":80}'::jsonb,
    updated_at = now()
where id = 1;
```

**Superseded by `stage22_gate_and_comeback.sql`** (2026-08-02), which rewrites the same
function: `perday` gains `gpart` (the pro-rata gate numerator) and `gmiss` (how many gate
habits are incomplete), a shared `qualday` CTE becomes the single definition of "this day
counted" for both the `qualify` quest and the comeback walk, and four new keys arrive —
`gateV2`, `lapseDays`, `comebackXp`, `comebackStick`. Every one defaults to the old
behaviour, so stage22 is a no-op until they are written. Apply the file, deploy the client,
*then* write the keys — in that order, or the board is forgiving while the phone is not.

With the key **absent** the server behaves exactly as it did before, which is what lets the
SQL be deployed ahead of the client. `with3` (DP, 75xp) and `perfect` (CN, 500xp) still
read the *head counts* `ndone`/`nlive` — moving them onto the weighted columns would
silently redefine two paying milestones.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
