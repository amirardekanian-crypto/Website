#### The day score is weighted — and it is two numbers
Full detail in [`XP_SYSTEM.md`](../../../../../XP_SYSTEM.md) §6; the shape of it matters here because it
is what the roll call wall and the share cards show (Today leads with the verdict since PRF-03).
Both come from `dayParts(day, mode)`, which
sums `baseXp()` over `rosterOn(day)` instead of counting heads — a headcount said a
supplement and a training session were the same day's work, and the percentage was the
last number in the app that still believed that.

**Both halves give partial credit on a counter now** (Amir, 2026-08-02: *"for all the
habits that have bars to fill... i want that to be added toward their day completion
percentage"*). Two of three protein servings is 2/3 of the job, not zero. This was
gate-only until today — the day streak forgave a near-miss the header still read as zero
for — so `dayPct()` and `gatePct()` finally agree on what a partial counter is worth.
`isPerfect()` is untouched and does the job the old binary rule was protecting: a day can
read 91% without being *perfect*, because perfect still means every box actually ticked,
and only that unlocks the perfect-day card (a full-screen takeover until PRF-02).

- **`dayPct()`** — what the day was *worth*, over the whole roster. The roll call wall and
  the share cards (Today dropped it: the header's ring and the week's shading went with PRF-03 and
  PRF-05, the day strip with PRF-05). On a rest day it reads ~71%, and that is the honest number.
- **`gatePct()`** — what the athlete could *do*. A **locked** habit they did not earn that
  day leaves the denominator. Day streaks read this and nothing else.

⚠️ **"On target" has exactly ONE definition: `dayQualifies()`.** Never
`dayPct(k) >= streakQualifyPct` — that is a third rule, and it is wrong twice over: it
uses the whole-roster denominator (so an unearned locked session counts *against* the
athlete) and it skips the gate's second door (*at most one thing undone*). Anything that
labels a day on-target/missed, counts on-target days, or colours a cell by it must call
`dayQualifies()`. Its percentage door goes through `gatePasses()`, which **rounds** the day's
percentage before comparing, exactly like the server's `qualday` (a day at 79.5% counts; since
2026-09-26, when the two were found to disagree on 79.5–79.9%).

It was written the wrong way in the month share card — both the ON TARGET cell shading and
the "DAYS ON TARGET" figure — until 2026-08-02. Replayed across the eleven athletes on the
board it mislabelled **13 day-cells over 6 of them**; on Amir's own log it disagreed with
his real streak on **4 of 8 days**. Friday 31 July is the clean example: **53% by worth,
79% by the gate**, the streak counted it, and the card drew it as missed. That two-number
gap is not a bug — it is this whole section — but only one of the two decides anything, and
a share card is the worst place to state the other one.

The same confusion had reached the **manual prose**, which described the gate as *"75% of
what the whole day was worth"* — i.e. `dayPct`, the number that does **not** decide. Fixed
to say *what you could actually do that day*, with the rest-day gap named outright.
⚠️ `dayPct()` is **client-only** — it is computed here and sent up as a pre-computed
number when posting a roll call (`p_pct`), never recomputed server-side, so this needed no
Supabase migration. The server keeps its own score-half twin, `wdone`, for one narrow
legacy purpose (see §6) — it stays binary on purpose and is never shown to anyone as a
percentage.

⚠️ **The gate is what makes weighting safe.** WORKOUT is 100 of 350 — 28.6% of the default
day — against a threshold allowing 25% of slack, so weighted into the denominator it stops
being a weight and becomes a *precondition*: a rest day could never qualify, and a
free-tier athlete (whose WORKOUT is locked for life) would never have a qualifying day
again — while `proof.html` promises them only the *perfect* day is out of reach.
`isPerfect()` is deliberately untouched, which is what keeps that promise true.

`streakQualifyPct` moved 80 → **75** with it: the worst single miss on a rest day is steps
at 190/250 = 76%, so at 80 steps quietly became a second precondition. Verified over a
61-day log: **0 days stopped qualifying, 6 started.**


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
