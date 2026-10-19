#### One word — `streak` — and two scopes
A **habit's streak** is consecutive days on *one* habit ("a 24-day streak on water"); it
sits on that habit's row and in its detail header. The **day streak** is consecutive days
that pass `dayQualifies()` (`streakQualifyPct` of the day's weight, or at most one thing
undone); it is the flame on **Today's hero card** (drawn only while a streak is running)
and the third tile of **Progress's stat grid**, and it is always captioned *DAY STREAK*.
There is no band any more — see *01 · TODAY*.

⚠️ **This reverses the old rule.** The per-habit one used to be called a **run**, precisely
so a 24-day water run could not be mistaken for a 2-day day-streak — the app had once used
five phrasings (*day streak*, *24 DAYS*, *Best streak*, *Best run so far*, *days in a row*)
and they read as one number arguing with itself. Amir asked for `streak` everywhere
(2026-07-29), so the disambiguation moved from the **noun** to the **scope**: a habit's
streak is only ever shown *on that habit*, and the whole-day one is only ever shown with
the word *day* attached. The manual's *Consistency* section and the day-one note on
Progress are the two places that teach it, and both were rewritten to do so.

**Do not reintroduce "run" in athlete-facing copy.** `bestHabitRun()` keeps its internal
name because nothing renders it — nothing calls it at all any more: the Progress tile it
used to feed shows the day streak's best (`bestDayStreak()`), and a habit's own best is
`habitBest(h)`, captioned *Longest streak* on its detail screen.


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
