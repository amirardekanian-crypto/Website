## 1. What each habit is worth

`weights` is the XP for **completing** a habit once, ranked by how much the habit
actually moves someone's health. Training pays most, then daily steps.

| Habit | Target | XP | Why it sits here |
|---|---|---|---|
| WORKOUT | 1 session | **100** | The session is the point. **Locked** — cannot be ticked by hand; only a finished session in `program.html` earns it. Once Career Mode's XP switch is on it pays **0** a day toward the overall XP (the session pays 400 instead, so a session is never paid twice) and still counts 120 on its own ladder. Its 100 stays in the day gate and its tiers. |
| STEPS | 10,000 | **60** | Daily movement — the biggest lever outside training. |
| SLEEP | 7.5 h | **50** | The most underrated recovery input. |
| FUEL | 3 meals | **40** | Logged eating drives every other adaptation. |
| WATER | 8 glasses | **30** | Easy, daily, real. |
| MOBILITY | 10 min | **30** | Keeps them training. |
| BREATHE | 10 min | **20** | Stress and sleep quality. |
| SUPPS | 1 dose | **20** | Vitamin D · creatine · omega-3. Small but free. |
| *anything they add* | 1 | **25** | `customXp` |

**Partial credit.** Counter habits (steps, sleep, water, meals) pay pro-rata while
you're part way there, and get the `completionBonus` once you finish:

- 4 of 8 glasses → `30 × 4/8` = **15 XP**
- 6 of 8 glasses → `30 × 6/8` = **23 XP**
- 8 of 8 glasses → `30 × 1.2` = **36 XP**

So a near-miss day still pays, but finishing is clearly worth more. Check-off habits
are all-or-nothing and always get the bonus (a 100 XP workout pays 120).

**The daily ceiling.** `dailyCap: 3` — a counter habit accepts at most **3× its
target** in one day (steps 30,000 · water 24 · sleep 22.5h · meals 9), clamped in
`setVal()`, which is the only door into the log. Daily XP never needed it, because
`xpFor()` stops at the target — but a `total:` quest counts **raw units**, so
without a ceiling one tap-and-hold on the stepper logged 9,999,999 steps and
cleared *"50,000 steps across the run"* on the spot, on the leaderboard as well as
on the phone. The server scores whatever the log holds, so capping at write time is
what keeps both scorers honest. (`dailyCap` itself still has no server mirror — but see
`maxCustom` below, which closed the one hole where that mattered.)

> Raising this is a quest-balance decision, not a logging one. At 3× the two steps
> quests (50k and 70k) need two and three days respectively; at 5× or above they are
> one-day work again.

**`bump()` clamps to the daily ceiling, not to the target — and this was a bug worth
knowing about.** Today's `+` used to be `Math.min(h.target, cur + step)`, which *lowers*
anything already logged above the target: the log sheet accepts up to `dailyCap × target`,
so a real 12,000-step day plus one tap of `+` became 10,000 — **2,000 steps deleted**, and
the toast reported it as `+0 XP · STEPS complete`. A control labelled `+` must never
subtract. Daily XP is unchanged either way, because `xpFor()` still stops at the target;
what changes is that a `total:` quest now counts the units the athlete actually walked
past their target from Today as well as from the sheet, which is the behaviour the sheet
already had. Past the target the toast says there is no more XP in it today rather than
printing `+0 XP` under the word *complete*.

> **The same subtraction came back through the other operand, fixed 2026-08-02.**
> `capFor()` reads the habit's *current* target, but every stored value was clamped
> against the target in force when it was written — so **lowering a target** strands real
> numbers above the new ceiling, and `Math.min(cap, …)` then lowers them exactly the way
> `Math.min(target, …)` used to. Opening yesterday's sheet and pressing **Save without
> editing anything** was enough: `setVal()` re-clamped a genuine 30,000-step day down to
> 24,000. Invisible in XP, visible only as lost units in a `total:` quest — on the board
> too. `setVal()`, `bump()` and the sheet's `+` now take their ceiling as
> `max(capFor(h), what is already logged)`: **the cap clamps new input, never history.**

**How many habits an athlete may add: `MAX_CUSTOM = 3`.** A custom habit is a one-tap
check worth `customXp × completionBonus` = **30 XP a day**, it earns its own consistency
tiers on top, and the server pays for it too — `hab_xp()` pays `customXp` for every key in
a day it does not recognise. Uncapped that was a faucet, not a feature: twenty junk habits
are twenty taps and roughly **600 XP a day**, about double a coached athlete's genuinely
perfect one, on a board shared with people doing the real work — and nothing could take it
back, since only the athlete's own ✕ removes a custom habit. `addCustomHabit()` now
enforces the count and rejects a duplicate name (the id carries a timestamp, so "Reading"
twice used to make two habits that both scored), and both composers hide at the cap.

**And since 2026-08-02 the server has its own ceiling: `maxCustom` (3).** The client cap is
a UI rule, and the log is just JSON in a row — a tampered copy with fifty junk keys was
paid fifty times, about 1,500 XP a day, straight onto the shared board. `hab_xp()` now pays
`customXp` for at most `maxCustom` unrecognised keys **per day**. Measured on the live
database: a day holding water plus ten junk customs scored **336 → 126**, while an honest
day with three customs stayed at **126, unchanged**. Zero athletes had more than three
custom keys on any day when it was switched on, so nobody real was affected.

⚠️ It is a **ceiling, not a rejection** — a day that happens to hold a stale key from a
removed habit degrades by one payment rather than erroring, and an athlete legitimately at
the cap does not lose a day's score if the coach retunes something. This is deliberately
*not* the same as excluding customs from the board (§12): honest custom habits still score
exactly as they always did, and only the unbounded tail is gone.

**A perfect day is 420 XP** with the current numbers. That figure is the anchor for
everything below — if you change `weights`, recompute it.
Once the XP switch is on the same day pays 300 in daily XP on all eight habits (216 on the five core ones), because WORKOUT pays 0:
the other seven at `completionBonus` are 72 + 60 + 48 + 36 + 36 + 24 + 24. The session pays 400 on top when it is trained.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
