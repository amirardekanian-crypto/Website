## 🏋️ Personal Records — two write doors (a finished session, + Log a max), and what to keep in step

One name on every screen since 2026-09-26 (it was also called **The Ceiling**; the code keeps
`ceiling*` names and the `<id>_1rm` key). Full account in `CODEBASE.md` → *Personal Records*.

**Records fill themselves (Fork 3B, 2026-09-26).** Before, a record existed only if the athlete
tapped Save, and 2 of about 33 coached athletes ever had one. `fillRecordsFrom()` now writes one
when a session's best set (`histBestSet()`, the History sheet's own maths) **beats every earlier
number for that lift**, marked `auto: true`:
- **New bests only**, because every screen leads with a lift's latest entry: an entry for every
  session would put a deload week's lower estimate on top as *▼ 12.5 kg*. History keeps every session.
- Runs on every save of a finished session (`recordSessionToCloud()`, with the New best band) and
  whenever history loads (without it, or the first open after this shipped would celebrate a
  session from weeks ago). Only `ceilingCandidates()` lifts; renames join through `HIST_ALIAS`.
- Filed under the session's `completed_on`, the date History shows, so the session just finished
  and the same session read back from the server are one entry.
- **The athlete's own entries lead.** A max by hand or a test is always kept and raises the bar for
  later days; a deleted day (tombstone) holds no record and sets no bar. ⚠️ Automatic entries carry
  `t: 0`, the oldest write there can be, so any write the athlete makes to that day wins every merge
  on either phone. coach.html reads them unchanged (*from a set*).
- The card has no estimate panel since REC-01 (below). *Save to Personal Records* is on + Log a
  max's form only, shown once its numbers give an estimate (`paintCeilingForm()`).
  (`.ex-1rm-save[hidden]` was also fixed: `display: block` had been overriding every
  `save.hidden = true`.)

What to keep in step:

- **One estimator for every door.** Automatic new bests, and **+ Log a max** on the Records screen
  (pick a lift from the current cycle, enter kg/reps/RPE, optionally backdated), both through
  `estimateOneRM()`. The exercise card's own estimate and *Save to Personal Records* panel
  (`attachCeiling()` / `paintFromFields()`) were removed on 2026-09-26 (REC-01, Amir: "Off the card,
  keep in Records"): nothing on the working card suggests a weight mid-set.
- **The rename matcher is in `program.html` AND `coach.html`** (`matchRenamed()` /
  `ceilAliasMapC()`). It decides whether a lift renamed between cycles reads as one row or
  two; if the copies drift, the coach and the athlete are looking at different records for
  the same body. ⚠️ It resolves names at READ time and never rewrites stored ones — rewriting
  loses the race across devices and brings the split back doubled.
- **A DELETE IS A TOMBSTONE** (`{ del: true }`), never a dropped row, for exactly the reason
  body weight's is — and every write must rebuild from `loadCeilingRaw()`, not `loadCeiling()`,
  or the next save silently drops them all.

The `"test": "5RM"` retest flag is written by `/program-design` (`test_flag`) → `/program-assemble`
→ `SCHEMA.md`; the athlete's nudge is anchored to the **cycle's closing week** with a 28-day floor,
the coach's is the floor alone. Two or three flagged lifts a cycle — the nudge works by being rare.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
