# The XP system — AA Proof (`habits.html`)

Everything you can tune about levels, XP and achievements, and what changes when you do.
This is the document to read before touching progression.

> **The one rule that makes this safe:** XP and levels are **never stored**. They are
> recalculated from the athlete's logged history every time the app opens. So if you
> change a number in here, every athlete's XP and levels are **rescored automatically**
> against everything they have already done — no migration, no reset, nothing lost.
> The app notices the change, quietly re-baselines, and shows them
> "XP system updated — your levels were rescored." It will **not** fire a hundred
> level-up celebrations they didn't earn today.

---

## Where the settings live

One object, near the top of `habits.html`:

```js
const XP_RULES = {
  base: 300,              // XP for level 1 → 2
  growth: 0.55,           // cost(n) = base × n^growth
  completionBonus: 1.2,   // multiplier once a habit's target is met
  customXp: 25,           // per-completion value of an athlete-added habit
  streakQualifyPct: 80,   // a day counts toward the day-streak at this % done
  dailyCap: 3,            // most a counter takes in a day, × its target — section 1
  seasonStart: '2026-07-26',   // fallback only — the server is the authority
  seasonName: 'Pre-Season',    // see section 7
  weights: {              // per-completion value, by health impact
    strength: 100,
    steps:     60,
    sleep:     50,
    fuel:      40,
    water:     30,
    mobility:  30,
    breathe:   20,
    supps:     20
  }
};
```

Two supporting lists sit just below it: `RANKS` (the rank names) and
`CONSISTENCY_TIERS` (the consecutive-day ladders). Note `weights` is still keyed by
`strength` — that is the WORKOUT habit's internal id, kept so the rename didn't orphan
anyone's history.

Two more constants live outside `XP_RULES` because neither is a scoring number:

```js
const BACKFILL_DAYS = 3;   // today + this many days back are editable — section 6.5
const NOTE_MAX = 200;      // characters in a roll call sentence — section 11
```

**Rewards are the one exception to "nothing is stored".** `PASS_TRACK` hands out a title
or a card look at 14 points up the ladder, and what has been unlocked is *recorded* in
`CFG.pass.owned` rather than recomputed. That is deliberate and it must stay that way:
levels reset with the season, so a derived reward would be taken back every reset, and a
reward you can lose is a rental. `claimRewards()` only ever **adds**. Nothing in this
document changes what a reward is worth, because a reward is worth no XP — see
`HABITS.md` → *The long game*.

It is stored **on the server too** (`public.hab_titles`, stage 17), for the same reason:
a season reset drops every level to 1, so any check that recomputed a reward from the
current level would revoke it. `hab_mint_titles()` records instead, at the level the
athlete has *right now*, and never deletes.

Level used to move *within* a season as well — the two milestones scored off
`perday.ndone` counted only habits currently switched on, which cost 500xp and a level in
67 of 266 log lengths. Stage18 fixed that (see §4.5 and `HABITS.md` → *Days are settled
units*), so the season reset is now the only way a level falls. It is reason enough.

⚠️ If you retune anything in this document, you change what level a given log produces —
and therefore who qualifies for a title *from here on*. Everything already minted stays
minted, on both sides. That is the intended behaviour, not a rounding error to clean up.

**Free users score on exactly these rules.** `"tier": "free"` in `data/<id>.json`
(`isFree()` in the app) changes what the athlete can *reach* — WORKOUT stays locked and
the programme links point at the apply form — and changes **nothing** about scoring.
There is no free-tier multiplier, no separate ladder and no separate board, on the client
or in Postgres; the server scores every athlete from the same `hab_log` with the same
`xp_rules` row and does not know the tier exists. That is deliberate on both ends: the
board is only worth topping if it is one board, and upgrading someone is then a one-field
edit that costs them no history. See `HABITS.md` → *Two kinds of user*.

---

## 1. What each habit is worth

`weights` is the XP for **completing** a habit once, ranked by how much the habit
actually moves someone's health. Training pays most, then daily steps.

| Habit | Target | XP | Why it sits here |
|---|---|---|---|
| WORKOUT | 1 session | **100** | The session is the point. **Locked** — cannot be ticked by hand; only a finished session in `program.html` earns it. |
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
what keeps both scorers honest; there is no server-side check.

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

**A perfect day is 420 XP** with the current numbers. That figure is the anchor for
everything below — if you change `weights`, recompute it.

---

## 2. The level curve

```
cost(level n → n+1) = base × n^growth
```

With `base: 300` and `growth: 0.55`, no two levels cost the same:

| Level | Cost of this level | Total XP to reach it | Days at 80% adherence |
|---|---|---|---|
| 2 | 300 | 300 | **~1 day** |
| 5 | 730 | 1,930 | ~6 |
| 10 | 1,060 | 6,270 | ~19 |
| 15 | 1,290 | 12,190 | ~36 |
| **20** | 1,520 | **19,270** | **~57 (≈2 months)** |
| 30 | 1,930 | 42,600 | ~127 |
| 50 | 2,590 | 116,000 | ~345 |

This was tuned to two deliberate anchors:

1. **One full day of habits gets you to level 2** — a perfect day is 420 XP, level 2 costs 300.
2. **About two months of solid work gets you to level 20** — 19,270 XP is 57 days at 80%
   adherence (46 days if perfect, 76 days at 60%).

### If you want to change the pace

- **Everything too slow / too fast overall** → change `base`. It scales the whole
  ladder linearly. `base: 400` makes every level 33% more expensive.
- **Early levels fine but the top end too easy** → raise `growth`. At `0.7` the climb
  steepens sharply later; at `0.4` it flattens out and high levels come quickly.
- Leave `growth` above `0` and below about `1.0`. At `1.0` the curve gets brutal
  (level 20 would take over six months); below `0.3` levels stop feeling earned.

**Per-habit ladders use the same curve**, with `base` set to that habit's own daily
value (`weight × completionBonus`). That's deliberate: it means every habit levels at
the same *rate*, so an athlete's level in a habit reflects **how often they actually do
it**, not how much it's worth. Someone who drinks water daily but trains twice a week
ends up GRINDER on water and ROOKIE on their workout — which is the honest picture.

> **A consequence worth knowing.** Because a habit's XP *and* its level cost both scale
> from the same weight, changing a habit's weight does **not** move that habit's own
> level — the two cancel out, and the habit's level stays a pure count of how often it
> was done. It *does* move the **overall** level, which is scored against the fixed
> `base`. So tripling water from 30 to 90 XP makes water count for three times as much
> toward the overall ladder, while the athlete's water rank stays exactly where they
> earned it. That is the intended behaviour: reweighting changes what a habit is *worth
> to you*, not what they *achieved*.
>
> If you want a habit's own ladder to move too, change its **`target`** (how much counts
> as done) rather than its weight.

---

## 3. Ranks

Ten names, five sub-levels each — 50 levels per cycle.

```js
const RANKS = ['ROOKIE','CONTENDER','GRINDER','OPERATOR','ENFORCER',
               'PREDATOR','MACHINE','RELENTLESS','UNTOUCHABLE','IMMORTAL'];
```

| Levels | Rank |
|---|---|
| 1–5 | ROOKIE 1–5 |
| 6–10 | CONTENDER 1–5 |
| 11–15 | GRINDER 1–5 |
| 16–20 | OPERATOR 1–5 ← about two months in |
| 21–25 | ENFORCER 1–5 |
| 26–30 | PREDATOR 1–5 |
| 31–35 | MACHINE 1–5 |
| 36–40 | RELENTLESS 1–5 |
| 41–45 | UNTOUCHABLE 1–5 |
| 46–50 | IMMORTAL 1–5 |

**Past level 50 they prestige.** The ladder restarts carrying a star: level 51 is
`★1 ROOKIE 1`, level 101 is `★2 ROOKIE 1`, and so on forever. There is no cap.

To rename ranks, edit the `RANKS` array — any length works, and the maths adapts.
To change how many levels sit inside each rank, edit `SUBS_PER_RANK`.

---

## 4. Consistency ladders

Every habit has the same five-tier consecutive-day ladder:

```js
const CONSISTENCY_TIERS = [
  { days: 5,  name: 'KINDLED',     mult: 0.5 },
  { days: 10, name: 'STEADY',      mult: 1 },
  { days: 20, name: 'LOCKED IN',   mult: 2 },
  { days: 30, name: 'IRONCLAD',    mult: 3 },
  { days: 60, name: 'UNBREAKABLE', mult: 6 }
];
```

Tiers are judged on the athlete's **best run ever**, not their current streak — so
breaking a streak never takes a badge back. Add or remove tiers freely; the pip
display adapts to however many there are.

**`mult` is a multiplier on that habit's own daily completion value, not a flat
number.** This was changed in stage 12 and it matters: flat values inverted the
weighting the rest of the system rests on — sixty straight days of SUPPS (20 XP a
day) paid exactly the same 750 as sixty straight days of WORKOUT (100 a day), which
is not true and an athlete can feel it.

```
tierXp(habit, i) = max(10, round(weight × completionBonus × mult / 10) × 10)
```

| Tier | ×    | WORKOUT | STEPS | SLEEP | WATER | SUPPS |
|---|---|---|---|---|---|---|
| KINDLED     | 0.5 | 60  | 40  | 30  | 20  | 10  |
| STEADY      | 1   | 120 | 70  | 60  | 40  | 20  |
| LOCKED IN   | 2   | 240 | 140 | 120 | 70  | 50  |
| IRONCLAD    | 3   | 360 | 220 | 180 | 110 | 70  |
| UNBREAKABLE | 6   | 720 | 430 | 360 | 220 | 140 |
| **full ladder** | | **1,500** | **900** | **750** | **460** | **290** |

Across all eight habits the whole ladder is about **5,300 XP**. The flat values it
replaced totalled 11,600, which was +46% on top of sixty perfect days (25,200) and
made daily logging feel like the side dish.

---

## 4.5 What the badges pay, and why it is safe

Tiers and milestones were displayed with an XP value and awarded **nothing** until
stage 12: `overallXp()` summed `habitXp` and stopped. They pay now, under three
rules that keep the guarantee at the top of this file intact.

**1. A bonus is paid on the day it was crossed.** `bonusEvents()` walks the log once
and returns `{day, xp, kind, id}` for every tier and milestone crossing. Dating it is
the whole trick: a bonus is then just an ordinary amount inside a window, so the
season rule and both leaderboard windows filter it with no special cases — and
nothing new is stored, so retuning still rescores everyone automatically.

**2. Runs are measured from the season start.** `bonusEvents()` walks `seasonDays()`,
not `loggedDays()`. This is a **fairness rule, not an implementation detail**: a tier
crosses once, so scoring it against all-time runs would mean an athlete whose streak
began before the season could never earn tier points again, while someone who joined
yesterday could earn all 5,300. The season resets the run *for payment*; the badge
itself is still judged on the best run ever and is never taken back. So the pip on
the Progress tab can read "tier 5" while this season has only paid tier 2 — that is
the same rule as pre-season days not scoring, applied to streaks.

**3. Bonuses land on the overall ladder only**, never on a habit's own. A habit's
level has to stay a pure count of how often it was done (§2), and paying its ladder
for its own streak would quietly break that.

**4. Each day is counted against the habits it actually had.** The two milestones
measured per day — `daysWith3` (DP, 75xp) and `perfectDays` (CN, 500xp) — need a
denominator, and they take it from `rosterOn(day)`: a dated timeline of the tracked
set (`CFG.roster`), not `live()`. Until stage18 both used the current set for all of
history, which meant adding a habit **deleted** perfect days already earned and
switching one off **invented** perfect days that never happened — 500xp in either
direction, and enough to cost a level in 67 of 266 log lengths. `hab_bonus_xp` was
changed to match, so the board and the phone still agree. Tiers are unaffected: a run
is per habit, so it never needed a denominator. Full design in `HABITS.md` →
*Days are settled units*.

⚠️ **`live()` is the present tense only.** Any function that takes a `dayKey` must use
`rosterOn(dayKey)`, or it will quietly re-judge history again.

Milestones keep flat values — they are one-off and genuinely hard — totalling
**3,585 XP** across the sixteen, in three tiers (`tier` on each entry: `week`,
`long`, `rare`; grouping only, nothing scores off it). The 1,350 that sits in `rare`
needs 150 sessions or a 60-day water run, so it is a year of work rather than a
windfall; the 610 in `week` is the deliberate part, because an athlete's first
fortnight used to be worth almost nothing in one-offs and that is exactly the
fortnight where people quit. **Seasonal events (`EVENTS`) pay no XP at all** — they
pay a title, for the reasons in `HABITS.md`. The exception is **FIRST BLOOD** (`FB`, 50xp, one logged
session): every other milestone needs at least five days, so the whole section was
unreachable for an athlete's first working week and rendered as nine greyed rows on the
screen they open to see how they are doing. It pays the least of any of them precisely
because it is the easiest — the ladder only stays honest while the hardest work pays most.
Note it is WORKOUT-gated, so a free-tier athlete cannot earn it (the habit is locked and
only a finished session in `program.html` ticks it); the same was already true of
HEAVY METAL.

⚠️ **`measureAch()` and `bonusEvents()` are the display half and the paying half of the
same measures, and they must agree.** `daysWith3` read `live()` in the display half long
after stage18 fixed the paying half to `rosterOn(day)`, so switching a habit off dropped
days from the counter on Progress while the 75xp already paid correctly stayed put — a
progress figure falling while the XP behind it does not. Fixed; the rule is the same one
as everywhere else in this file: **any function that takes a `dayKey` uses
`rosterOn(dayKey)`.** The two halves still differ in one respect *by design* — the display
walks `loggedDays()` (a badge is judged on the best run ever) while the ledger walks
`seasonDays()` (it is only *paid* inside the season). See rule 2 above. **Weekly quests ride the same rail** (§8.5): dated on the
day they complete, so they need no special handling in any window.

`bonusEvents()` is cached and dropped by `invalidateBonus()`, which `saveLog()` and
`saveCfg()` call — and which also drops the roster lookup cache, since the two are read
together. **Anything that mutates `LOG` or `CFG` without going through those two must
invalidate by hand** — `syncFromCloud()` and `importWorkoutDays()` do. `saveCfg()` also
calls `stampRoster()`, which is why every path that changes the tracked set records
itself without anyone having to remember. The cold walk is ~7ms over 400 days of full
logs.

---

## 5. Celebrations

A full-screen, game-style takeover fires for five things:

| Trigger | Detected in | Ground |
|---|---|---|
| **Any overall level** | `checkLevelUps()` | near-black, clay rays |
| **A rank promotion** on any habit (water crossing GRINDER 5 → OPERATOR 1) | `checkLevelUps()` | full clay |
| **A consistency tier** cleared on any habit | `checkUnlocks()` | deep green, clay-2 rays |
| **A milestone** unlocked | `checkUnlocks()` | deep green, clay-2 rays |
| **A perfect day** — every tracked habit done | `checkUnlocks()` | deep green, clay-2 rays |
| **A weekly quest** completed (this week only) | `checkUnlocks()` | deep green, clay-2 rays |

Routine habit levels flash a small chip in that habit's row instead. This split is
deliberate: an athlete completing eight habits on day one would otherwise get nine
full-screen takeovers back to back. If several big ones land together they queue and
show a "2 more to go" counter.

The three grounds are the point — an athlete can tell which *kind* of win landed
before reading a word of it. Green is never a level and never a rank.

### What `checkUnlocks()` guarantees

Tiers, milestones and perfect days were detected by nothing at all until this was
added: a pip quietly filled on a tab the athlete might not open that day. Three
rules keep it from becoming noise:

- **Tiers are coalesced by tier, not reported per habit.** An athlete solid since
  day one crosses the 20-day tier on all eight habits *on the same day*; eight
  identical takeovers is a punishment. One takeover names the tier and lists the
  habits ("20 days of workout, steps, sleep and 5 more in a row"), and past four
  it counts instead of listing. Crossing several tiers at once reports only the
  highest — the lower ones are implied.
- **A perfect day is judged on TODAY only**, never across history. That used to be
  load-bearing: before stage18, switching a habit off turned every thin day behind
  the athlete retroactively perfect, and judging history would have fired a burst of
  takeovers for days they never had. Days are settled now, so the rule is kept for
  the reason that still applies — a celebration is for something that happened just
  now, and replaying an old one is noise. It also can't be farmed: `CFG.seenPerfect`
  holds the date, so unticking and re-ticking pays once.
- **It baselines like levels do.** `CFG.seenTiers` / `CFG.seenAch` / `CFG.seenPerfect`
  are seeded silently on a first run, on a rules change, and on a cloud row that
  predates this build — so an athlete arriving with history already behind them
  gets it recorded, not replayed at them. `seedUnlocks()` is called from
  `seedSeenLevels()`, so the two baselines can never drift apart.

Since stage 12 the tier and milestone takeovers **quote the XP they actually pay**,
because they actually pay it — a tier takeover sums the payout across every habit
that cleared it in the same pass. A perfect-day takeover quotes `dayXp(today)`, which
includes any bonus crossed that day, so the figure always matches what the athlete's
total just moved by. See §4.5.

> ⚠️ **Quote the ledger, never the table.** Those two takeovers read their figure
> off `bonusEvents()` — via `tierPaid()` and `milestonePaid()` — and *not* off
> `CONSISTENCY_TIERS` / `ACHIEVEMENTS`. They have to, because of §4.5 rule 2: a
> badge is judged on the best run ever but only **paid** when that run falls inside
> the season, so the two legitimately disagree. Reading the table instead is a bug
> that hides for months and then lies to the athlete's face — an athlete with 25
> pre-season step days who logs 5 in-season ones got a full-screen *"ROAD RUNNER ·
> +200 XP"* while their total moved by nothing. When the ledger paid nothing, both
> takeovers now say so plainly: the badge is still awarded, the points are named as
> pending. Anything added here that mentions an XP figure must do the same.

**If it feels like too much,** the cheapest change is in `checkLevelUps()` — set
`big: overall` instead of `big: overall || rankChanged` and only the overall level
takes over the screen. To silence the new ones, return early from `checkUnlocks()`
after its baseline block.

---

## 6. The day score, and day streaks

**The day score is weighted, and it is two numbers.** Both come from `dayParts(day, mode)`
in `habits.html`, which walks `rosterOn(day)` and sums `baseXp()` rather than counting
heads. A headcount said a supplement and a training session were the same day's work; the
percentage was the last number in the app that still believed that.

It is **binary, not pro-rata** — `xpFor()` already pays pro-rata *with* a completion
bonus, so a linear percentage would be the one number here that does not reward finishing.
You could otherwise sit at 80% having completed nothing at all.

| | Denominator | Used by |
|---|---|---|
| **`dayPct()`** — what the day was *worth* | every habit on that day's roster, session included | the header, the day strip, the roll call wall |
| **`gatePct()`** — what the athlete could *do* | same, minus any **locked** habit they did not earn that day | day streaks, and nothing else |

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

### `streakQualifyPct: 75`

A day counts toward the day-streak at **75% of the weight it could have earned**. The five
points from the old 80 are load-bearing: the gate's denominator on a rest day is the seven
daily habits (250), so the worst single miss is **steps at 190/250 = 76%**. At 80 that
fails and steps quietly becomes a *second* precondition alongside the session; at 75 the
old promise — *miss any one thing and the day still counts* — survives on every roster on
the board.

| rest day, missing… | of 250 | % | counts at 75 |
|---|---|---|---|
| nothing | 250 | 100 | ✅ |
| supps *or* breathe | 230 | 92 | ✅ |
| fuel | 210 | 84 | ✅ |
| sleep | 200 | 80 | ✅ |
| **steps** (worst single miss) | 190 | **76** | ✅ |
| sleep + supps | 180 | 72 | ❌ |
| steps + supps | 170 | 68 | ❌ |

**Nobody's streak got shorter when this shipped.** Verified over a 61-day log: 0 days
stopped qualifying, 6 started. Set it to `100` to demand a perfect day, or lower to be
kinder. This also drives the "days on target" figure in the weekly recap.

**Both halves are scored twice**, as ever. The server mirror is
`supabase/stage19_weighted_days.sql` — the `perday` CTE gains `wdone`/`glive`, and the `qd`
CTE (the `qualify` quest kind, the **only** path from a day fraction to XP) reads them. The
gate's exclusion list arrives as a new `xp_rules` key, `unearnable`, because the server has
no `locked` flag: `p_rules` carries `targets` and `weights` only.

```sql
update public.xp_rules
set rules = rules || '{"unearnable":["strength"],"streakQualifyPct":75}'::jsonb,
    updated_at = now()
where id = 1;
```

With the key **absent** the server behaves exactly as it did before, which is what lets the
SQL be deployed ahead of the client. `with3` (DP, 75xp) and `perfect` (CN, 500xp) still
read the *head counts* `ndone`/`nlive` — moving them onto the weighted columns would
silently redefine two paying milestones.

---

## 6.5 The backfill window

`BACKFILL_DAYS = 3` — **today plus the three days before it are editable.** The day strip
at the top of TODAY picks which day the taps land on; `setVal()` refuses anything outside
the window, so nothing can be written to a closed day even if the UI is confused.

Move the number and the strip grows or shrinks with it — but check the CSS: the strip is
`repeat(4, minmax(0, 1fr))` and is sized for four cells at 320px. Past five it needs to
scroll or wrap.

**What backfilling recomputes.** Everything derived from the log: habit and overall XP,
streaks, consistency tiers, milestones, quest progress, and both leaderboard windows once
the log syncs. That is the point of allowing it — someone who forgot to log Saturday
should not lose Saturday's XP. Two things it deliberately does **not** do:

| | Why |
|---|---|
| Fire the **perfect-day** celebration for a backfilled day | It is scoped to today. You do not get a fanfare for paperwork — badges and tiers still pop, because those are about the run, not the day. |
| Reopen that day's **roll call** sentence | Section 11. Fixing Saturday's steps is admin; rewriting what you said about Saturday is not. |

**It is an affordance, not a lock.** The app pushes its whole log blob to `save_progress`,
so devtools could always write further back — that was true before the strip existed.
Enforcing the window server-side means diffing the previous snapshot against the incoming
one on every save, and rejecting or reverting changes to closed days. Buildable; judged
not worth the complexity for a board among one coach's own clients. If the board ever
opens up beyond that, revisit it.

---

## 7. Seasons — how scoring resets

Scoring runs in **seasons**, like ranked play in a game. Only days on or after the
current season's start date earn XP — for the athlete's own level *and* for both
leaderboards. Days before it stay in their history (visible in the 35-day grid, still
counting toward streaks and consistency badges) but score nothing.

**Right now it is `Pre-Season`, opened 26 July 2026.** Athletes are trying the app and
building a score from that date.

### Starting a season — the command

One line in the Supabase SQL editor:

```sql
select public.start_season('Season 1');                -- starts today
select public.start_season('Season 1', '2026-08-01');  -- or a chosen date
```

That is the whole reset. It **deletes nothing** — it inserts a new row in
`public.seasons`, and from that date every score is computed from zero. Athletes see
their app pick it up on next open, with a toast: *"SEASON 1 has begun — scores start
from zero."*

To check what's live: `select * from public.current_season();`
To see the history: `select * from public.seasons order by starts_on;`

### What resets and what doesn't

| | Resets on a new season |
|---|---|
| Overall XP and level | **Yes** — back to zero / ROOKIE 1 |
| Each habit's XP and level | **Yes** |
| Both leaderboards | **Yes** |
| Logged history (the grid, the log) | No — nothing is deleted |
| Streaks and consistency badges | No — those measure behaviour, not score |

That split is deliberate and matches how games work: ranked resets each season,
account-level unlocks persist. It also means a season change never punishes someone for
a 30-day streak they legitimately built.

**No celebrations fire on a season change.** Levels drop, which would otherwise be
noise; `rulesSignature()` includes the season start, so the app re-baselines silently.

### It also gates the workout backfill

The WORKOUT habit is ticked from finished sessions on the server. Without a season it
would import *every* past session — one athlete had 41 days of history that would have
landed as an instant head start. The app only ever asks for dates from the season start.

### Two places again

Like the XP rules, the season lives server-side (`public.seasons`, the authority) with a
fallback baked into `XP_RULES.seasonStart` / `seasonName` in `habits.html` for offline and
first load. The app fetches the real one on every open and caches it. **You only need to
run the SQL command** — the fallback matters only if someone opens the app offline having
never synced.

---

## 8. The leaderboard scores on the server — so XP lives in TWO places

> **⚠️ The one thing that can get out of sync.** The leaderboard recalculates XP
> **in the database** rather than trusting the number a phone sends, so nobody can
> reach the top by editing their own storage. The price is that the scoring rules
> exist twice:
>
> | Where | What | When to change it |
> |---|---|---|
> | `XP_RULES`, `CONSISTENCY_TIERS`, `ACHIEVEMENTS`, `QUEST_POOL` in `habits.html` | What each athlete sees in their own app | Always |
> | the `xp_rules` table row in Supabase | What the leaderboard ranks people by | Always, at the same time |
>
> If you change one and not the other, athletes' own screens and the leaderboard
> will quietly disagree.

To update the database copy, run this in the Supabase SQL editor (adjust the
numbers to match whatever you just put in the app):

```sql
update public.xp_rules set rules = jsonb_build_object(
  'base', 300,
  'growth', 0.55,
  'completionBonus', 1.2,
  'customXp', 25,
  'weights', '{"strength":100,"steps":60,"sleep":50,"fuel":40,
               "water":30,"mobility":30,"breathe":20,"supps":20}'::jsonb,
  'targets', '{"strength":1,"steps":10000,"sleep":7.5,"fuel":3,
               "water":8,"mobility":1,"breathe":1,"supps":1}'::jsonb,
  -- mirrors CONSISTENCY_TIERS
  'tiers', '[{"days":5,"mult":0.5},{"days":10,"mult":1},{"days":20,"mult":2},
             {"days":30,"mult":3},{"days":60,"mult":6}]'::jsonb,
  -- mirrors ACHIEVEMENTS; `measure` strings are read exactly as the app reads them
  'milestones', '[{"code":"FB","need":1,"xp":50,"measure":"daysHit:strength"},
                  {"code":"RR","need":30,"xp":200,"measure":"daysHit:steps"},
                  {"code":"IM","need":16,"xp":150,"measure":"streak:supps"},
                  {"code":"HM","need":12,"xp":150,"measure":"streak:strength"},
                  {"code":"HS","need":5,"xp":100,"measure":"streak:water"},
                  {"code":"DP","need":10,"xp":75,"measure":"daysWith3"},
                  {"code":"ZM","need":10,"xp":100,"measure":"streak:breathe"},
                  {"code":"BA","need":10,"xp":150,"measure":"streak:sleep"},
                  {"code":"RB","need":14,"xp":150,"measure":"streak:mobility"},
                  {"code":"CN","need":100,"xp":500,"measure":"perfectDays"}]'::jsonb
), updated_at = now() where id = 1;
```

Note `targets` as well as `weights` — the server needs targets to score partial
progress on counter habits the same way the app does. Custom habits an athlete
invents are scored at `customXp`, since the server has no target for them.

`tiers` and `milestones` feed `public.hab_bonus_xp`, which mirrors `bonusEvents()`
in the app: it walks the log from the season start, dates every crossing, and pays
the ones inside the window. It reads the athlete's **config** as well as their log
(via `hab_cfg_of`), because which habits were switched on decides what counts as a
perfect day and as a three-habit day.

**Past tense, deliberately.** It reads `cfg.roster` — a dated timeline of the tracked
set — and scores each day against the roster *that day* had, not the one the athlete has
now (stage18; `rosterOn()` is the client half). Before that, both scorers used the current
set for all of history, so adding a habit deleted perfect days already earned and switching
one off invented perfect days that never happened — 500xp either way, since `CN` needs 100
of them. An athlete with no timeline yet falls back to `cfg.on`, which is exactly the old
behaviour, so nothing was rescored when this shipped. See `HABITS.md` → *Days are settled
units*.

> **Verify parity after any change to these.** The two scorers are only worth having
> if they agree. Build a log arithmetically so both sides can generate it identically
> (`generate_series` + modulo in SQL, the same modulo in JS), then compare
> `hab_bonus_xp` against `bonusEvents()` over several windows — all-time, a season
> starting mid-log, a season starting today, and a rolling week. They must match
> exactly, including the awkward cases: days missing from the log entirely, partial
> counter values, and runs broken by a gap.

### How the board works

- **Opt-in only.** No row in `leaderboard_optin` means invisible. Athletes join
  from the Leaderboard tab and pick their own display name (defaults to first
  name + last initial). They can rename or leave at any time.
- **Two boards.** *This season* is the default; *past week* is a **rolling seven
  days** — today and the six before it, never reaching earlier than the season start.
  (Stage 12 fixed a mismatch here: the app was changed to say "rolling seven days"
  while the server still scored `date_trunc('week')`, i.e. Monday-to-today. The two
  agreed only on a Sunday.)
- **Badges score on the board too**, on the same day-of-crossing rule — so a tier
  cleared inside those seven days pays on the weekly board. See §4.5.
- **Reading it is key-checked**, so client display names are not exposed to the
  open internet — only real athletes see the board.
- **No athlete IDs are ever returned.** An ID alone is enough to fetch
  `/data/<id>.json`, which is someone's whole programme. The function returns
  display names, points, level and rank only, plus an `is_me` flag.
- Rank names and the level curve are mirrored in SQL too (`hab_rank_label`,
  `hab_level`), so renaming a rank means updating `RANKS` in `habits.html` **and**
  the `names` array in that function.

The SQL lives in `supabase/stage9_leaderboard.sql`, with seasons in
`stage11_seasons.sql`, bonus XP in `stage12_bonus_xp.sql` and quest runs in
`stage14_quest_runs.sql` (which holds the current `hab_bonus_xp`) — **all applied
and live**.

---

## 8.5 Quests — a run you start, not a standing feature

Quests are a **lever**, not a background system. There are **none** unless you start a
run, and a run lasts **seven days from the day it starts** — not Monday to Sunday. When
it ends the block disappears from Today until you start another.

That is deliberate: an athlete seeing quests means *something is on this week*. If they
were always there they would be wallpaper.

### 🎯 Starting a run

```sql
select public.set_quests('2026-07-29', array['w_water5','w_steps50k','w_perfect2']);
```

Runs 29 July → 4 August inclusive. Pass however many ids you like — one, three, five.
Re-running it with the same start date **replaces** that run.

**Cancelling one:**

```sql
select public.clear_quests('2026-07-29');
```

**Seeing what is set:**

```sql
select rules -> 'questRuns' from public.xp_rules where id = 1;
```

Past runs are kept on purpose — the XP athletes earned in them keeps counting. Clearing
a *finished* run would retroactively take those points away.

Both commands are **coach-only**: they reject any signed-in user who is not Amir, and
are not callable by athletes at all. They deliberately *do* work from the Supabase SQL
editor, which carries no JWT — an earlier version guarded on the email alone and locked
the coach out of his own command.

> The log stores **days**, not timestamps, so a run starts at the beginning of its start
> date rather than at the hour you ran the command. "Live from Wednesday" means all of
> Wednesday.

### The quest pool

**[`QUESTS.md`](QUESTS.md) is the catalogue** — the twelve built quests with their ids
and XP, ready-made themed weeks you can copy-paste, an idea bank for new ones, and
guidance on choosing. Look there when you want to *pick* quests; this section is the
mechanics.

Keeping the list in one place is deliberate: a pool table copied into two documents goes
stale the first time one is edited.

### The shape of a quest

```json
{ "id":"w_water5", "title":"THE WELL RUNS DEEP", "note":"Full water on 5 days",
  "kind":"daysHit:water", "need":5, "xp":150 }
```

| `kind` | Means |
|---|---|
| `daysHit:<habit>` | Completed that habit on N separate days of the run |
| `total:<habit>` | Accumulated N units across the run (target or not) |
| `qualify` | N days at `streakQualifyPct` or better |
| `perfect` | N days with every tracked habit done |

Everything is measured **from the log alone**, so nothing new is stored and both scorers
agree. Each quest pays **once**, on the day it completes, and is **season-bounded** — a
run straddling a season opening does not count the days before it.

Quests are **the same for everybody**, which is what keeps the leaderboard fair, and
they are distinct from milestones: a milestone is a permanent one-off achievement, a
quest is a limited-time target that expires.

### Editing the pool

```sql
update public.xp_rules
set rules = jsonb_set(rules, '{quests}', '[ … the whole array … ]'::jsonb)
where id = 1;
```

**`QUEST_POOL` in `habits.html` is the offline fallback and must be kept in step** — an
athlete with no signal scores off it. Same rule as everything else in §8. Quest names
follow the house rule: cool, not literal, with the plain description in `note`.

> **Careful with `xp`.** Three quests at 150–300 is 450–750 for the run, against ~2,900
> from a perfect week of habits — a 15–25% top-up, which is the intent. Push much past
> that and quests stop being a bonus and start being the game.

---

## 9. What happens when you change any of this

1. Edit `XP_RULES` (or `CONSISTENCY_TIERS`, or a habit's `target`) and ship.
2. Next time each athlete opens the app, every day they have ever logged is rescored
   with the new numbers. Their XP and every level move to match.
3. The app detects the change through a signature over all the scoring inputs
   (`rulesSignature()`), re-baselines quietly, and toasts
   *"XP system updated — your levels were rescored."*
4. No celebrations fire for the change itself. Their next genuine level-up celebrates
   normally.

Levels can go **down** if you make XP more expensive. That is working as intended —
but it's the one change worth thinking twice about, because an athlete who was
OPERATOR 2 yesterday will notice being GRINDER 4 today. Prefer raising the value of
new work over devaluing old work.

---

## 10. Never losing progress

Worth knowing, since it underpins all of the above.

- Every tick is written to the phone's local storage **first**, then queued for the server.
- The "unsent" flag is itself saved, so an app killed while offline still knows there
  is work to send next time it opens.
- Retries run on their own with backing-off delays (5s → 15s → 45s → 2m → 5m), and
  fire again the moment the phone reconnects, when the app comes back to the
  foreground, and at every launch.
- Each push sends the **complete current snapshot**, so a newer push simply supersedes
  an older one — nothing can arrive out of order or overwrite good data with stale data.
- When two devices disagree about a day, the **larger logged value wins**, so a stale
  phone can never erase a number recorded elsewhere.
- Settings has a live sync line ("SYNCED 2 MIN AGO" / "OFFLINE — SAVED ON THIS PHONE")
  and a **Sync now** button.

The athlete's phone is the record. The server is the mirror.

---

## 11. Roll call — the one thing here that pays nothing

One sentence a day, visible to everyone else on the board, written and read in the **Crew** tab. Catalogued in
[`HABITS.md`](HABITS.md); the schema and every guard are in
[`supabase/stage15_roll_call.sql`](supabase/stage15_roll_call.sql). It appears in this
document only to say where it sits relative to scoring:

**It pays no XP, and nothing about it feeds a level, badge, quest or board position.**
That is a design decision, not an oversight — the moment a sentence earns points you get
one character of gibberish every night at 23:58. The reward is that the line sits next to
the writer's rank.

Two consequences worth keeping straight:

- **`NOTE_MAX = 200`** is enforced in *both* places, like everything else here: the input's
  `maxlength` and `hab_clean_note()` on the server. The server is the one that matters.
- **The percentage beside a line is self-reported.** The client sends the day's
  completion it has already computed. That is fine *because it buys nothing* — it is
  decoration on self-authored text. Mirroring `dayPct()` into plpgsql would add a third
  place the scoring rules have to agree, which is precisely the class of bug section 8
  exists to warn about. **Anything that pays stays server-scored. This does not pay.**

If you ever make roll call pay — don't — it would have to move to the server-scored side
of that line, and `hab_notes` would need the same treatment `hab_xp` gets.

### The one place it touches the log

`saveLog()` calls `refreshNotePct()`. If the athlete has already written today's line and
then keeps logging, the percentage beside it is quietly brought up to date (debounced 4s)
rather than leaving "38%" under a sentence written at lunchtime on a day they went on to
finish. It re-posts the same body with a new `pct`; it never changes their words.
