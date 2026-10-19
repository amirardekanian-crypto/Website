## Days are settled units

**A day is scored against the habits that were switched on that day, and once a day is
closed it never moves again.** Changing what you track changes what happens next, never
what already happened.

This is the athlete's mental model and it is the only defensible one. Someone who tracked
five habits and cleared all five for five days had five perfect days. That is a fact about
those days. Adding a sixth habit on day six is a decision about day six.

### What enforces it

The tracked set is a **timeline**, not a snapshot — `CFG.roster`, one entry per change,
each naming the day it took effect:

```js
CFG.roster = [ { from:'2026-07-26', ids:['strength','steps','sleep','fuel','water'] },
               { from:'2026-08-01', ids:['strength','steps','sleep','fuel','water','mobility'] } ]
```

A handful of entries a year, not one per day, so XP stays a pure function of what is
stored. `rosterOn(dayKey)` returns the entry in force, and the three measures that need a
denominator read it instead of `live()`: `dayPct()`, `isPerfect()`, and the
`daysWith3`/`perfectDays` counters in `bonusEvents()`. The day-streak follows for free,
because `dayQualifies()` is built on the same `dayParts()` walk (in its `gate` mode).

⚠️ **`live()` is the present tense only** — what to draw on Today, what to nudge, what a
perfect day is worth from here. **Anything that takes a `dayKey` must use
`rosterOn(dayKey)`.** That is the entire invariant and it is one line to get wrong.

Only **`stampRoster()`** writes the timeline, and it only ever appends. It is called from
`saveCfg()`, so every path that can change the tracked set is covered — both toggles,
adding a custom habit, removing one, and anything added later — rather than four call
sites somebody has to remember. Two rules keep it tidy: a change on a day that already has
an entry overwrites it, and a change that lands back where it started collapses instead of
stacking.

**Adding lands today; removing lands tomorrow** — never retroactively. Today is still an
open day — inside the 3-day backfill window and still actionable — so a habit added this
morning counts this evening. A removal waits until tomorrow's entry, so switching a habit
off at 23:00 cannot delete a miss already made (`lockedOnToday()` is what lets the row say
*still counts today*); switching it back on before midnight deletes that pending entry
again. Yesterday is closed either way. The one exemption is onboarding: while
`!CFG.onboarded` and the log is empty, the timeline collapses to a single entry dated
today, so declining a suggestion is not a *removal* (see *The eight habits*). The full
two-rule account is *Five core habits, and opt-in add-ons*, above.

**Existing athletes were seeded, not rescored.** The first stamp is dated at the athlete's
first logged day with the roster they already had, so their history scores exactly as it
did before this shipped. `anchorRoster()` pulls that first entry back if history arrives
after it was stamped — on a new phone `loadLocal()` finds nothing and `syncFromCloud()`
has not run yet. A day older than the whole timeline reads the *first* entry, so nothing
mis-scores even if the anchor never runs.

### What it fixed

All three measures used to call `live()` — the roster the athlete had *right now* — and
re-judged every day in history against it. `hab_bonus_xp()` did the same server-side.
Proven on both scorers, 120 days of history, identical numbers client and server:

| | perfect days | bonus XP |
|---|---|---|
| five habits, 120 clean days | 120 | 4,345 |
| …then a sixth added, **old** | 0 | **3,845** — 500 XP deleted |
| …then a sixth added, **fixed** | 100 | **4,345** — kept |
| six habits, one never done | 0 | 3,625 |
| …then that one switched off, **old** | 120 | **4,125** — 500 XP invented |
| …then that one switched off, **fixed** | 20 | **3,625** — honest |

The 500 is `CN` (perfectDays ≥ 100). The second direction is the worse one: nobody would
ever report free XP. Base XP was never affected — `habitXp()` pays per habit per day, so a
new habit adds nothing and a paused one keeps its points. It was only ever a denominator
problem.

`hab_bonus_xp()` carries the same timeline server-side (`supabase/stage18_day_rosters.sql`):
`daylive` replaces `livehab` with one row per day-and-habit, and `nlive` became a column on
`perday` rather than a scalar for all time. It reads `roster` straight off the config —
`hab_cfg_of()` returns the whole blob, so it rides along with `on` and `custom`. Verified
45/45 identical to the old function on configs with no timeline, which is the path every
athlete is on until they open the new build.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
