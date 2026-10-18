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

**Once Career Mode's XP switch is on** (phase 2, applied to the live project 2026-10-17 and switched on 2026-10-18: `HABITS.md` → *Career Mode (phase 2, the XP
switch)*) this still holds for the rules, with two changes. The overall level is the career level and never resets (§7), and the
career's numbers live in `career/rulebook.toml` as well as here (§8). The server also keeps a working copy of each athlete's numbers
(`career_scores`) so the board loads fast. It is worked out again from the facts whenever they change, and nothing in it is a
source.

**Once Career Mode's catalogue switch is on** (phase 3, `supabase/stage70_career_rewards.sql`, built and dormant on 2026-10-18:
`HABITS.md` → *Career Mode, phase 3*) the consistency tiers and the milestones stop being Proof's: every badge tier and milestone
is an **award** the server mints once in a career and pays through the facts, from `career/badges.toml` and
`career/achievements.toml`. §4, §4.5, §4.6, §5 and §8 below each say what changes then. Until it is on, nothing here changes.

---

## Where the settings live

One object, near the top of `habits.html`:

```js
const XP_RULES = {
  base: 300,              // XP for level 1 → 2
  growth: 0.55,           // cost(n) = base × n^growth
  completionBonus: 1.2,   // multiplier once a habit's target is met
  customXp: 25,           // per-completion value of an athlete-added habit
  streakQualifyPct: 80,   // a day counts toward the day-streak at this % of the day's WEIGHT
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
Once the XP switch is on levels no longer reset with a season, but rewards are recorded and only ever added all the same: a reward
you can lose is still a rental.

It is stored **on the server too** (`public.hab_titles`, stage 17), for the same reason:
a season reset drops every level to 1, so any check that recomputed a reward from the
current level would revoke it. `hab_mint_titles()` records instead, at the level the
athlete has *right now*, and never deletes.

Level used to move *within* a season as well — the two milestones scored off
`perday.ndone` counted only habits currently switched on, which cost 500xp and a level in
67 of 266 log lengths. Stage18 fixed that (see §4.5 and `HABITS.md` → *Days are settled
units*), so the season reset is now the only way a level falls. It is reason enough.
(Once the XP switch is on even that is gone: the level is the career's. Only a change to the rulebook moves it, and a re-seed
rescores everyone, §9.)

⚠️ If you retune anything in this document, you change what level a given log produces —
and therefore who qualifies for a title *from here on*. Everything already minted stays
minted, on both sides. That is the intended behaviour, not a rounding error to clean up.

**Free users score on exactly these rules.** The switch is `"tier": "free"` inside the
`athlete` object of their programme record (their row in `public.programs`, read through
`get_program()`; `isFree()` in the app). It changes what the athlete can *reach* — WORKOUT
stays locked and the programme links point at the apply form — and changes **nothing**
about scoring. There is no free-tier multiplier, no separate ladder and no separate board,
on the client or in Postgres; the server scores every athlete from the same `hab_log` with
the same `xp_rules` row and does not know the tier exists. That is deliberate on both
ends: the board is only worth topping if it is one board, and upgrading someone is then a
one-field edit on the same row — same id, same login, no history lost. See `HABITS.md` →
*Two kinds of user*.
Once Career Mode's XP switch is on the server scores from the facts and the rulebook instead, and still does not know the tier. A
free athlete simply has no training facts (GAME-12).

---

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

## 2. The level curve

```
cost(level n → n+1) = base × n^growth
```

With `base: 300` and `growth: 0.55`, no two levels cost the same:

⚠️ **These rows are computed from the shipped constants — do not hand-edit them.**
Regenerate after any change to `base`, `growth`, `completionBonus` or `weights`:

```
python -c "
base, growth = 300, 0.55
def cost(n): return max(10, round(base * n**growth / 10) * 10)
cum = 0
for lv in range(1, 51):
    if lv in (2,5,10,15,20,30,50): print(lv, cost(lv-1), cum, round(cum/336), round(cum/268.8))
    cum += cost(lv)"
```

| Level | Cost of this level | Total XP to reach it | Days @80%, full roster | Days @80%, core only |
|---|---|---|---|---|
| 2 | 300 | 300 | **~1 day** | **~1 day** |
| 5 | 640 | 1,930 | ~6 | ~7 |
| 10 | 1,000 | 6,270 | ~19 | ~23 |
| 15 | 1,280 | 12,140 | ~36 | ~45 |
| **20** | 1,520 | **19,270** | **~57 (≈2 months)** | ~72 |
| 30 | 1,910 | 36,660 | ~109 | ~136 |
| 50 | 2,550 | 81,830 | ~244 | ~304 |

**Two columns, because the shipped default is not the full roster.** `defaultCfg()`
starts every add-on OFF, so a new athlete's perfect day is the five core habits —
280 × 1.2 = **336 XP**, against **420** for all eight. At 80% adherence that is 268.8
vs 336 a day, and the same ladder therefore takes about 25% longer for the athlete
who never opts into anything. Quote the column that matches who you are talking about.

This was tuned to two deliberate anchors:

1. **One full day of habits gets you to level 2** — a perfect day is 420 XP, level 2 costs 300.
2. **About two months of solid work gets you to level 20** — 19,270 XP is 57 days at 80%
   adherence (46 days if perfect, 76 days at 60%).

Anchor 2 still holds exactly. The rows either side of it did not: this table was
hand-written and drifted from the code, overstating level 30 by 16% and level 50 by
42% (it claimed 116,000 XP and ~345 days for PROOF ITSELF, against a real 81,830 and
~244). Tuning "the long game" means tuning against these numbers, so they have to be
the ones the app actually produces.

**Once Career Mode's XP switch is on, the overall curve is the career's, not this one** (`career/rulebook.toml` → `[level]`:
`base = 400`, `growth = 0.55`). Proof's own `base: 300` stays in `XP_RULES` for everything before the switch, and the table above is
computed from it and is not regenerated. The phones read the career's curve from `get_profile()` (`rules.level`): `overallBase()`
and `overallGrowth()` in `habits.html`, `careerLevelOf()` in `program.html`. The server's `career_level()` decides. It is the
`base: 400` that *If you want to change the pace* describes, so every level costs about a third more: level 2 costs 400 and level 3
costs 590.

The two anchors move. **A day of habits no longer reaches level 2**, because WORKOUT pays 0 a day (§1), but a finished session pays
400, which is level 2's cost. **Level 20 still takes about two months of solid work, habits and training together.** The
rulebook's note records why `base` is 400: on 2026-10-17 the one athlete solid in both apps made 27,367 XP in their best 60 days,
which is level 24 at 300 and level 20 at 400, and a training-only athlete's best two months reach level 13 to 15. To retune the
curve, change
`[level]` in the rulebook, run `python scripts/check_career.py` and seed it again (`career/README.md`). A habit's own ladder keeps
its own `base` (the habit's `weight × completionBonus`) and, once the switch is on, counts the whole career.

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

Once Career Mode's XP switch is on, the same ten names are in the rulebook too (`[level]` `ranks`, `levels_per_rank = 5`,
`prestige_after = 50`), and the server's `career_level()` builds the rank label from them. The board's rank beside a name is that
label. So a rename is made in three places: `RANKS`, the `names` array of `hab_rank_label()` and the rulebook's `ranks`.
`scripts/check_twins.js` §9 holds `RANKS` equal to the rulebook's ranks, and `levelInfo()` and `careerLevelOf()` equal to
`career_level()` on `scripts/career/xp_cases.json`.

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

**Once the catalogue switch is on (phase 3): one badge per habit.** These ladders retire (`habit_tiers` in `badges.toml`, with
the seven habit families of §4.6) into ONE badge per habit, `habit_water` … `habit_custom` (HOUSE RULES, the best custom habit,
D6), on the same five steps and names. Each step's xp is the table above, rounded the same way, and it is the catalogue's number
from then on (`badges.toml`, tunable; a tier's place in the list is its identity, so a step is only ever added at the end:
`check_career.py` rule 21). A step pays **once in a career**, on the day the habit's best run reaches it. The phone no longer
counts tiers in `bonusEvents()`; it decides the step itself with `awardMeasures()` so the tap still shows it (§5), and the server
pays it as an award. Crossed before the switch: minted in silence with Proof's price (history), never paid twice.

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
**Once Career Mode's XP switch is on this changes for the career, not for the board.** The phone's ledger walks the whole log
(`scoreDays()`) and the server's career score calls `hab_bonus_xp()` with no season, so a tier, a milestone or a quest pays the
career once, ever. The board's season points are still measured from the season start, so the same badge pays again toward each
season's points.

**3. Bonuses land on the overall ladder only**, never on a habit's own. A habit's
level has to stay a pure count of how often it was done (§2), and paying its ladder
for its own streak would quietly break that.

**Once the catalogue switch is on (phase 3), tiers and milestones leave this ledger.** `bonusEvents()` emits no `tier` and no
`milestone` events (quests and comebacks are unchanged until phase 5), exactly as the server strips them from `hab_bonus_xp()`
(`career_bonus_rules()`). They are **awards** instead (`career_awards`): one row per badge tier or milestone, minted once in a
career on the day its measure crossed, priced from the CURRENT catalogue whenever the score is worked out (D12), and counted in
the career, the season and the week like any fact (§8). Three things keep this safe:

1. **Nothing drops at the switch.** Everything Proof had already paid is minted in silence with Proof's own price on its own
   crossing day, so career XP after the switch is the XP before plus any back-pay of the new badges (D2). The phone drops the XP
   of a push made before the flip (`_pushedXp`), so the number on screen does not move.
2. **The phone still shows a step at the tap** (P13, GAME-13). `awardMeasures()` / `phoneAwards()` decide the awards a phone can
   decide from its log (the habit badges, the day streak, DAWN PATROL, CLEAN SWEEP, BACK IN THE FIGHT, FIRST BLOOD, THE CENTURION,
   FULL STACK and the five events) and `pendingAwardXp()` adds their XP to the career XP shown until the server owns them. A
   crossing on the switch day or earlier is history and never pending (the switch day is history on both sides).
3. **A disagreement is withdrawn, never kept.** A pending award the server still does not hold after a push of the same log is
   withdrawn on that phone (`<id>_hab_awwd`), its XP and its line go, and the console names it (`[career] twin disagrees`).

"Owned" is the core's: `get_profile().owned` is a **list** of award ids (byte order, no days, stage70's split), read through
`ownedIds()`. The shelf's rows with their days are `get_awards()`'s, read only when Progress opens (`HABITS.md` → *Two reads: the
core and the shelf*); no XP number reads them.

**Retired, never removed.** HEAVY METAL (it paid sessions on days in a row, which means skipping a rest day: Hold Serve replaces
it), THE MACHINIST (Century counts the same sessions), HARD TO KILL (widened to training returns as *comebacks*), the seven habit
families and the per-habit tiers are earned as Proof earned them up to the switch and never after. Anyone who has one keeps it:
on Progress it is a line under the badge that replaced it, *Earned before: HEAVY METAL II*.

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

⚠️ **Onboarding is exempt from the removals-land-tomorrow rule.** `stampRoster()` dates a
removal to tomorrow so a habit cannot be switched off at 23:00 to erase a miss — but the
roster is first stamped before onboarding is ever seen (`migrateOld()` ends in
`saveCfg()`), so declining one of the suggestions on that screen used to leave it on
**today's** roster and score day one against a habit the athlete had just said no to. It
now collapses to a single entry dated today while `!CFG.onboarded` **and** `LOG` is empty;
an empty log is the proof that there is no closed day to re-judge, which is the only thing
the tomorrow rule protects. Full account in `HABITS.md` → *The eight habits*.

Milestones keep flat values — they are one-off and genuinely hard — totalling
**9,585 XP** across the 32 (§4.6), in three tiers (`tier` on each entry: `week`,
`long`, `rare`; grouping only, nothing scores off it). The 3,650 that sits in `rare`
needs 150 sessions, 100 perfect days, 100 step days, a 60-day water run or five comebacks
that stuck, so it is a year of work rather than a windfall; the 650 in `week` (seven
badges) is the deliberate part, because an athlete's first fortnight used to be worth
almost nothing in one-offs and that is exactly the fortnight where people quit.
**Seasonal events (`EVENTS`) pay no XP at all** — they pay a title, for the reasons in
`HABITS.md`. The exception is **FIRST BLOOD** (`FB`, 50xp, one logged
session): every other milestone needs at least five days, so the whole section was
unreachable for an athlete's first working week and rendered as nine greyed rows on the
screen they open to see how they are doing. It pays the least of any of them precisely
because it is the easiest — the ladder only stays honest while the hardest work pays most.
Note it is WORKOUT-gated, so a free-tier athlete cannot earn it (the habit is locked and
only a finished session in `program.html` ticks it); the same was already true of
HEAVY METAL. (This paragraph predates the marks: `DAWN PATROL I`, 40 XP, and
`CLEAN SWEEP I`, one perfect day, are day-one badges too now — §4.6.)

⚠️ **`measureAch()` and `bonusEvents()` are the display half and the paying half of the
same measures, and they must agree.** `daysWith3` read `live()` in the display half long
after stage18 fixed the paying half to `rosterOn(day)`, so switching a habit off dropped
days from the counter on Progress while the 75xp already paid correctly stayed put — a
progress figure falling while the XP behind it does not. Fixed; the rule is the same one
as everywhere else in this file: **any function that takes a `dayKey` uses
`rosterOn(dayKey)`.** The two halves still differ in one respect *by design* — the display
walks `loggedDays()` (a badge is judged on the best run ever) while the ledger walks
`seasonDays()` (it is only *paid* inside the season). See rule 2 above.
Once the XP switch is on the ledger walks the whole log too (`scoreDays()`), so the two halves stop differing.

**The same rule was broken a second way, on the `streak:` measures, and fixed 2026-08-02.**
`measureAch()` returned `habitStreak(h)` — the run ending *today* — for all eight
streak-measured milestones (HS · TS · ZM · BA · HM · RB · IM · UB), while the tiers beside
them correctly used `habitBest(h)`. So a badge the athlete had earned and been shown a
takeover for greyed back to `0/5` the day their streak broke, the earned-milestone count on
Progress dropped, and the XP it had paid stayed exactly where it was — the identical
"progress figure falling while the XP behind it does not" fault as `daysWith3`. Worse,
`currentAch()` feeds `CFG.seenAch`, so the code fell out of the seen list and rebuilding the
streak fired the full **"Medal unlocked · +N XP banked"** takeover again, for XP that had
landed weeks earlier and could not land twice (`bonusEvents()` pays each milestone once per
season). It now reads `habitBest(h)`, which folds in the live run, so an unearned badge
still shows real progress. `CFG.seenAch` and `CFG.seenQuests` are also **unioned** rather
than replaced now: they record what has already had its moment, so they may only ever grow. **Weekly quests ride the same rail** (§8.5): dated on the
day they complete, so they need no special handling in any window.

`bonusEvents()` is cached and dropped by `invalidateBonus()`, which `saveLog()` and
`saveCfg()` call — and which also drops the roster lookup cache, since the two are read
together. **Anything that mutates `LOG` or `CFG` without going through those two must
invalidate by hand** — `syncFromCloud()` and `importWorkoutDays()` do. `saveCfg()` also
calls `stampRoster()`, which is why every path that changes the tracked set records
itself without anyone having to remember. The cold walk is ~7ms over 400 days of full
logs.

---

## 4.6 Milestones come in MARKS

*(Amir, 2026-08-02: "as ive seen in call of duty you can unlock achievements again but next
levels of them. so like some milestones can have different levels.")*

A **family** is one achievement you can earn again at a higher bar: same name, a roman
numeral after it. `HUMAN SPRINKLER I` (5 days) → `II` (20) → `III` (60).

**Once the catalogue switch is on (phase 3)** the families that track one habit (HUMAN SPRINKLER, GROUND COVERED, FULLY FUELLED,
ZEN MACHINE, BLACKOUT ARTIST, RUBBER BAND, IRON MONK) retire into that habit's one badge (§4), HEAVY METAL into Hold Serve, HARD TO
KILL into *comebacks*, and THE MACHINIST into Century. DAWN PATROL, CLEAN SWEEP, BACK IN THE FIGHT, FIRST BLOOD and THE CENTURION
stay, as catalogue awards paying Proof's numbers, once in a career. The five events become milestones that pay their title.

`mark` is **display only**. Each rung is an ordinary independent row on the existing rail —
its own `code`, `need` and `xp` — which is why adding twelve of them needed no new scoring
machinery on either side. ⚠️ But every rung still has to exist in the `milestones` array on
the `xp_rules` row too, or the board underpays. Verified programmatically after the change:
32 rows client-side, 32 server-side, zero mismatches on code/need/xp/measure.

Two rules the ladder keeps, both machine-checked:

1. **Inside a family, a higher mark always pays more than the one below.** A test walks
   every family in `need` order and asserts `xp` strictly increases.
2. **Every habit gets at least a II**, so whichever habits an athlete favours, there is
   always a next rung in something they actually do.

Three names carry **no mark** on purpose — `FIRST BLOOD`, `THE MACHINIST`, `THE CENTURION`.
They are the entry and the two trophies, not rungs, and a numeral would make them look like
waypoints to something else.

**`DAWN PATROL I` is the free tier's way in** (this also closes what was §12.1). The badge
shelf's only day-one row was `FIRST BLOOD`, which is WORKOUT-gated — and a free athlete's
WORKOUT is locked for life, so the entire funnel landed on a screen whose entry badge they
could never earn. `DAWN PATROL I` needs three habits logged once, reachable on their first
evening, and pays 40 against FIRST BLOOD's 50 because it is the easier of the two.

⚠️ **Five badges were renamed** so their families read as one thing: `THE TONE SETTER` →
`HEAVY METAL I`, `ROAD RUNNER` → `GROUND COVERED II`, `UNBREAKABLE` → `HUMAN SPRINKLER III`,
`THE LONG ROAD BACK` → `BACK IN THE FIGHT II`, `UNSINKABLE` → `HARD TO KILL II`. Display
only — every `code` is untouched, so no history, XP or medal moved. (`UNBREAKABLE` had to go
regardless: it was also the 60-day `CONSISTENCY_TIERS` name, and two different things
wearing one name on the same screen is exactly the confusion this app keeps fixing.)

`THE CENTURION` went **500 → 1,200**. `CLEAN SWEEP III` pays 600 for thirty perfect days, so
a hundred of them had to outpay it by a distance or the last rung of the hardest ladder in
the app was worth less per day than the rung below it.

The shelf is now **32 milestones worth 9,585 XP** in total, up from 20 and 5,085. Since
milestone XP re-pays every season (§4.5), that also widens the runway a returning veteran
has to climb in a new season — which is part of what §12.2 was about.
(Once the XP switch is on a milestone pays the career once, and still pays again toward each season's board points.)

---

## 5. Celebrations

**Since PRF-02 (2026-09-27, Amir's 1A) only a few things take the whole screen** (six since a
season's title joined them, 2026-10-17, and a seventh, once per athlete, for the career reveal below); the rest land on
**the wins card** at the top of Today (`winsCard()`), with the XP they paid, until it is tapped. A
made-up athlete's first 22 days went from 30 takeovers to 9 (a free athlete 24 → 7), nothing lost.
Nothing in this section scores: a celebration only reads what the ledger already paid.

| Trigger | Detected in | Where |
|---|---|---|
| **Any overall level** (a new overall rank is the clay ground) | `checkLevelUps()` | the whole screen, grape rays |
| **A reward** (title or card) the level unlocked | `claimRewards()` | **on that level's screen** (`ev.rewards`); its own takeover only with no level in the same pass |
| **A day streak crossing a mark** of `STREAK_TAKEOVER` (7) days or more | `checkUnlocks()` | the whole screen, ember ground, a drawn flame |
| **A weekly quest** completed (this week only) | `checkUnlocks()` | the whole screen, badge ground |
| **A finished *A few weeks* event** (its title, `claimEventTitles()`) | `checkLevelUps()` | the whole screen, as a reward: the biggest single thing that is not a level |
| **A season's title**, the day its season closes (level 5 that season, minted by the server, or 2,000 season points once the XP switch is on) | `checkSeasonMoments()` | the whole screen, *Season over* (2026-10-17; it arrived in silence) |
| **A finished season with no title** | `checkSeasonMoments()` | the wins card |
| **The career reveal** (once the XP switch is on: the first open of AA Proof on the career, once per athlete) | `checkLevelUps()` | the whole screen, the rank's own ground, kicker *Your career*. Its Share it opens the Rank card, eyebrow *MY CAREER* |
| **A rank promotion on one habit** (water crossing GRINDER 5 → OPERATOR 1) | `checkLevelUps()` | the wins card |
| **A consistency tier** cleared on any habit | `checkUnlocks()` | the wins card |
| **A milestone** unlocked | `checkUnlocks()` | the wins card |
| **A perfect day** — every tracked habit done | `checkUnlocks()` | the wins card |
| **A comeback** | `checkUnlocks()` | the wins card |
| **The 3-day streak mark** | `checkUnlocks()` | the wins card |

`CFG.wins` stores only *which* win (`{k, id, …}`), never its XP: `winLine()` asks the ledger
(`milestonePaid()`, `tierPaid()`, `dayXp()`) when it draws, the rule below. It syncs with the
config, so a card tapped on one phone is gone on the other.

**Ticked from the training app's Home** (the embedded strip, `?embed=1`, 2026-09-26): the XP
is identical, because the tap goes through the same `toggleHabit()`/`bump()`/`setVal()`, but
`checkLevelUps()` stands down there. `CFG.seen` does not move, so every takeover in this
table is still waiting when Proof itself next opens. Nothing is detected twice or skipped.

Routine habit levels flash a small chip in that habit's row instead. This split is
deliberate: an athlete completing eight habits on day one would otherwise get nine
full-screen takeovers back to back. If several big ones land together they queue and
show a "2 more to go" counter; the card lists three and counts the rest.

The ground is the point — an athlete can tell which *kind* of win landed before
reading a word of it. Grape is never a badge, and ember is only ever the day streak.
Confetti and a scatter of coins play once per takeover (`confettiHtml()`/`coinHtml()`
in `habits.html`), deterministic per event so a re-render never re-scrambles it
mid-fall. Every takeover but a habit-level chip, and the wins card, carries a **Share it** button
(`lvActions()`) straight into the share picker, **on a card of that exact win** (2026-10-17): the
milestone, tier, quest or comeback on the Milestone card, a title on the Title card, the streak's
mark, the perfect day's own date. The table of every reward, its moment and its card is in
`HABITS.md` → *The share picker*. A Share it from a takeover parks the rest of the queue
(`UI.celebrateLater`) and `closeShare()` puts it back: it used to drop it. A card that names an XP
figure quotes the ledger, the rule below.

**A season's moment** (`checkSeasonMoments()`, the first thing `checkLevelUps()` does) is the one
celebration on the boot that re-baselines for a new season: that pass is silent about points, and
this is the season's reward, not a point. `CFG.seenSeasons` holds the season starts already shown
and only grows (unioned across phones); missing, it is seeded silently, so a record that predates
the build is history.

**The career reveal** (`renderCareerReveal()` in `checkLevelUps()`, only once Career Mode's XP switch is on, `HABITS.md` → *Career
Mode (phase 2, the XP switch)*) is one takeover per athlete, at the first open of AA Proof on the career. `rulesSignature()` carries
the switch, the career's curve and the rulebook's version in place of the season, so that first open re-baselines in silence and
fires no level-ups: the reveal is the one moment. It reads *Your career*, the level and the rank, and *From everything you've logged
since <date>, your training included. Your level never resets now. A new season only starts the board's points again.* The date is
the first day the athlete logged anything (`get_profile()`'s `since`), and *your training included* appears only when they have
finished a session. When `claimRewards()` added the road's titles and card looks up to the career level, a line counts them: *N
rewards on the road are yours · in your Locker*. `CFG.careerSeen` holds the switch's day it was shown for and is kept through the
cloud merge, so a second phone stays quiet. Someone who started after the switch gets none. A later season changes no level, so it
fires no level-up either: a toast says *SEASON 2 has begun. The board starts from zero. Your level stays.* A re-seeded rulebook (a
new `rules_version`) re-baselines quietly too.

**Once the catalogue switch is on (phase 3)** a badge step or a milestone is an award, and its moment goes by its size (D7):
*milestone* and *legend* take the whole screen, *win* and *highlight* land on the wins card. **One full-screen moment per open,
of any kind**: when a level-up, a rank or a reveal had the screen this run, an award that arrives with the server's answer waits,
unseen, for the next open; one a tap earned opens right then. The server's waiting moments (`get_profile().moments`) are shown
only from an answer of this run, and each answer tells the server what Proof has shown (`mark_moments_told()`), so the training
app never replays one. `CFG.seenAwards` holds every award id that has had its moment (synced, unioned). **The catalogue reveal**
is the switch's one moment, once per athlete (`checkCatalogueReveal()`, `CFG.catalogueSeen`): *MY RECORD · Your record*, the
four counts, the Grand Slam row and the road's rewards. The flip re-baselines in silence and never toasts *XP system updated*.
The counts are read from the catalogue copy (or the shelf), never the core's placeholder lists, so the reveal waits, absorbing
levels in silence and opening nothing else, until one of them is on the phone.
The day streak keeps its takeover on every new streak (D17); its award, once a career, never opens a second one.

**The day streak celebration is new** (Amir: *"the app used to say nothing about the
one number the whole qualify rule exists to protect"*). `DAY_STREAK_MARKS` in
`habits.html` is the tuned list of days worth stopping the screen for — tight in the
first week, when people quit, and spreading out after so it stays an event rather
than a weekly chime. `CFG.seenStreak` tracks the highest mark already shown and
**resets to 0 the moment the streak breaks**, so every mark is back on the table for
the next run. It pays no XP of its own — the streak's value is already priced into
`gatePct()` and the qualify quest; this takeover is recognition, not a second payout.

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

Since stage 12 the tier and milestone celebrations (on the wins card since PRF-02) **quote the XP they actually pay**,
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

**If it feels like too much** (it did: PRF-02 set `big: overall` and moved the rest to the
card), the next lever is `STREAK_TAKEOVER`. To silence the card entirely, stop `checkUnlocks()`
calling `addWin()`; the seen-lists still move, so nothing is replayed later.

---

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

## 6.4 Body weight pays NOTHING — and that is the whole design

Added 2026-09-03. **The body-weight tracker is outside this document's subject matter on
purpose**, and this section exists so nobody goes looking for the tunable that is not there.

- **No XP, on either side.** Not per reading, not per streak of readings, not as a
  milestone or a badge or a quest. There is **no `xp_rules` key** for it, because there is
  no rule to mirror — it is the one feature that cannot appear on the "scored twice"
  table in §8.
- **It cannot move a day score.** It is not in `HABITS`, not in `live()`, not in
  `rosterOn()`, and never written to `LOG` — so `dayParts()`, `dayPct()`, `gatePct()` and
  `isPerfect()` cannot see it. Proven in the browser: writing a weight leaves
  `overallXp()`, `dayPct()`, `overallLevel().lv`, `LOG[today]` and `rosterOn(today)` all
  byte-identical.
- **It cannot be gamed.** Nothing to farm, because nothing pays.
- **Switching it on or off costs nothing.** Unlike an add-on habit — where adding lands
  today and removing lands tomorrow precisely because the day score is at stake — the
  weight toggle has no scoring consequence in either direction and no roster entry.

⚠️ **It is not in `habits.html` any more.** Since 2026-09-12 body weight lives in
`program.html` (Home → Body Weight), which owns `<id>_hab_wt` outright — it writes, pushes
and merges it, and `habits.html` must never write that key (both apps share the origin's
localStorage). See `HABITS.md` → *Body weight — MOVED OUT*.

The only numbers it has are presentational, and the live ones are `program.html`'s: a
7-day rolling-average window (`WT_AVG_WINDOW`) and range chips of 7 / 30 / 90 days.
`habits.html` still declares `WT_STEP`, `WT_MIN`/`WT_MAX`, `WT_RANGES` and `WT_AVG_WINDOW`,
but only for a few leftover readers that draw nothing. Changing any of them changes a
picture, never a score, so none of them needs a server counterpart and none can put the
board and the phone into disagreement.

⚠️ **If a future change ever makes weight pay XP, it stops being free.** It would need a
key on the `xp_rules` row, a branch in `hab_xp()` or `hab_bonus_xp()`, and a row in the
§8 table — and it would hand every athlete a scoring lever that a bathroom
scale, rather than any behaviour, controls. Don't.

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

## 7. Seasons — how scoring resets

Scoring runs in **seasons**, like ranked play in a game. Only days on or after the
current season's start date earn XP — for the athlete's own level *and* for both
leaderboards. Days before it stay in their history (visible in the 35-day grid, still
counting toward streaks and consistency badges) but score nothing.

**Once Career Mode's XP switch is on, that is true of the boards only.** The athlete's level, rank and each habit's ladder count the
whole career and never reset (`HABITS.md` → *Career Mode (phase 2, the XP switch)*). A season still starts both boards from zero,
and it archives the season's points and the career level. The table under *What resets and what doesn't* has both columns.

**Right now it is `Season 1`, opened 2026-10-18.** `Pre-Season` ran from 26 July 2026, with athletes trying the app and
building a score from that date. Season 1 opened on 2026-10-18 at 06:00 UK (Amir's scheduled task `start-season-1`, `start_season('Season 1','2026-10-18')`,
Proof's own way: Pre-Season was archived with Proof's levels, 30 athlete records and 18 Pre-Season titles at level 5).

### Starting a season — the command

One line in the Supabase SQL editor:

```sql
select public.start_season('Season 1');                -- starts today
select public.start_season('Season 1', '2026-07-30');  -- or backdated
```

⚠️ **A future date is now refused** (stage25). It used to be advertised here, and it was
quietly destructive: `current_season()` filters `starts_on <= current_date`, so a row dated
next month is invisible to it — the archive would freeze at *today's* numbers with an
`ended_on` weeks away, the command would hand back the OLD season's name (reading as a
failure and inviting a re-run that inserted a duplicate), and the remaining weeks of play
would never be archived at all. Start a season on the day it begins.

⚠️ **`start_season()` is coach-only now, and was not before.** `set_quests()`,
`clear_quests()`, `set_coach_note()` and `hide_note()` have always carried an
`auth.jwt()` email guard; the one function that **resets every athlete's score** carried
none, while being executable by `anon`. The anon key ships inside `habits.html` and is
meant to be public, so any reader could have POSTed `/rest/v1/rpc/start_season` and wiped
the board. Fixed in stage25 with the identical guard (a null JWT is the SQL editor, which
is what keeps the command above working for Amir).

**Made a mistake? Undo it:**

```sql
select public.undo_season('2026-08-01');   -- the date the new season started
```

That removes the season row *and* the archive rows written when it closed the previous
one. It deliberately does **not** un-mint titles — nothing in this app may ever revoke a
reward, so an athlete who briefly held a season title keeps it.

That is the whole reset. It **deletes nothing** — it inserts a new row in
`public.seasons`, and from that date every score is computed from zero. Athletes see
their app pick it up on next open, with a toast: *"SEASON 1 has begun — scores start
from zero."*

To check what's live: `select * from public.current_season();`
To see the history: `select * from public.seasons order by starts_on;`

### 7.5 The season record — a reset stops being an erasure

*(stage25, closing what was §12.1.)*

A reset dropped every level to 1 and **deleted the fact that the season happened**.
Nineteen thousand XP and an OPERATOR rank, gone, with no record anywhere. That, more than
the missing reward, was why season 2 felt empty for a veteran.

When a season closes, `hab_close_season()` archives every athlete who scored anything into
`public.hab_season_results` — final level and final XP — and the Locker grows a **Seasons
shelf** showing where they finished. Append-only, free to mint, never revoked.
Once Career Mode's XP switch is on the row holds the season's **points** (training included) as `xp` and the **career level** at the
season's last day as `level`, for everyone with a fact and points above 0.

Everyone who reached **level 5** in that season also gets a title naming it. It can never
be earned again, because the season is over — the one thing the level track cannot offer,
and the reason to finish a season rather than coast the last fortnight.
Once the XP switch is on the title goes to everyone with **2,000 season points** or more (`rulebook.toml` → `[season]
title_points`), in place of level 5 inside the season (1,930 XP on Proof's curve).

**Run the dry run before you ever start a season.** It is at the bottom of
`supabase/stage25_season_record.sql` and prints the exact numbers that are about to be
frozen, using the same expression the archive uses.

The file was rewritten before it shipped, after an adversarial review of its first draft
found 20 defects, 2 of them critical; its header documents all five traps. Three are worth
knowing here:

- ⚠️ **The archived `level` is derived from the archived `xp`**, not from
  `hab_season_level()`. That function is hard-wired to `current_season()` and
  `current_date`, so using it made the level count a day the XP did not — the two columns
  described different windows and the boundary day was counted in *both* seasons.
  Once the XP switch is on that is by design no longer so: the level is the career level at the season's last day and `xp` is the
  season's points, two columns that describe different things.
- ⚠️ **Season titles are NOT registered in `passTrack`.** An entry there with `lv: 0` is
  self-awardable — stage23 made `set_title()` record those directly on trust, which is
  right for event titles and catastrophic here, since it would make the level-5 threshold
  decorative and the result unrevokable. `set_title()` instead grew a third branch: a
  title it does not recognise is allowed **only if the server already minted it**. Owning
  it is the permission.
- ⚠️ **`public.seasons` now has a unique index on `starts_on`.** Without it two rows could
  share a start date, collapsing two archives onto one primary key and colliding their
  title ids.

Two RPCs feed the client: `season_record(athlete, key)` for the athlete's own shelf, and
`season_list()` — every season's name — so that **any** `t_sn_…` title resolves on the
leaderboard and the roll-call wall. Without the second one a season title renders blank
for everybody except the person wearing it.

### What resets and what doesn't

| | Resets on a new season (until the XP switch) | Career Mode (once the XP switch is on) |
|---|---|---|
| Overall XP and level | **Yes** — back to zero / ROOKIE 1 | **No** — the career level never resets |
| Each habit's XP and level | **Yes** | **No** — each ladder counts the whole career |
| Both leaderboards | **Yes** | **Yes** — the board's points start from zero |
| Tier and milestone XP | Paid again each season (runs are measured from its start) | Paid to the career once, ever. Each season's board points count them again |
| Logged history (the grid, the log) | No — nothing is deleted | No — nothing is deleted |
| Streaks and consistency badges | No — those measure behaviour, not score | No |
| Rewards (titles, card looks) | No — kept for good | No — kept for good |

That split is deliberate and matches how games work: ranked resets each season,
account-level unlocks persist. It also means a season change never punishes someone for
a 30-day streak they legitimately built.
Once the XP switch is on, the level itself joins the account-level side of that split.

**No celebrations fire on a season change**, but one. Levels drop, which would otherwise be
noise; `rulesSignature()` includes the season start, so the app re-baselines silently. (Once the XP switch is on no level drops and
`rulesSignature()` leaves the season out. A toast says it instead: *SEASON 2 has begun. The board starts from zero. Your level
stays.*) The
exception is the season that just closed (2026-10-17): its title, for anyone who reached level 5 (2,000 season points once the XP
switch is on),
takes the whole screen (*Season over*), and a finish without one lands on the wins card
(`checkSeasonMoments()`, §5). It is a reward, not a point, so nothing is rescored for it.

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
> | `XP_RULES` and its sibling constants (`HABITS`, `CONSISTENCY_TIERS`, `ACHIEVEMENTS`, `QUEST_POOL`, `PASS_TRACK`, …) in `habits.html` | What each athlete sees in their own app | Always |
> | the `xp_rules` table row in Supabase, and a few SQL function bodies | What the leaderboard ranks people by | Always, at the same time |
>
> If you change one and not the other, athletes' own screens and the leaderboard
> will quietly disagree — the worst class of bug in this app, because nothing errors.

### Everything scored twice — change both, or they disagree

The Supabase copy is **one row**, `public.xp_rules where id = 1`, holding one `rules`
object. **It has 18 keys** (read from the live row, 2026-09-26), and every one but
`questRuns` mirrors something in `habits.html`:

| `xp_rules` key | `habits.html` | What breaks if they drift |
|---|---|---|
| `base`, `growth` | `XP_RULES.base` / `.growth` | Levels differ between board and phone |
| `completionBonus`, `customXp` | `XP_RULES.completionBonus` / `.customXp` | Daily XP differs |
| `weights` | `XP_RULES.weights` | Every habit's value differs |
| `targets` | `HABITS[].target` | What counts as "done" differs |
| `streakQualifyPct` | `XP_RULES.streakQualifyPct` | Which days count differs — the `qualify` quest and the comeback pay on one side only |
| `unearnable` | `HABITS[].locked` | The streak **gate** differs — a rest day counts on one side only (stage19) |
| `gateV2` | the two-door rule in `dayQualifies()` | Which days count differs — same fallout as `streakQualifyPct` (stage22) |
| `lapseDays`, `comebackXp`, `comebackStick` | `LAPSE_DAYS`, `COMEBACK_XP`, `COMEBACK_STICK` | **The comeback pays on one side only** (stage22) |
| `maxCustom` | `MAX_CUSTOM` | A tampered log outscores the board (stage24) |
| `tiers` | `CONSISTENCY_TIERS` | Badge XP differs |
| `milestones` | `ACHIEVEMENTS` (32 rungs) | Milestone XP differs |
| `quests` | `QUEST_POOL` | A quest pays on one side only |
| `passTrack` | `PASS_TRACK`, plus the event titles in `EVENTS` | **The server refuses a title the app already gave** |
| `questRuns` | — (cached on the phone as `CFG.questRuns`) | Server-only; written by `set_quests()` / `end_quests()` / `clear_quests()` |

⚠️ **And a third copy, until the catalogue switch** (phase 1, `supabase/stage66_career_mode.sql`, 2026-10-17):
`career/rulebook.toml` → `[habits]` (the weights, targets, gate, lapse and custom numbers), `badges.toml` (the tiers and the
milestone families, with `proof_measure`), `achievements.toml` (FIRST BLOOD, THE MACHINIST, THE CENTURION) and `missions.toml`
(the quest pool, `proof_kind`, `proof_need`, `proof_xp`). Career Mode scores habits with them through these same SQL functions,
and `scripts/check_career.py` (pre-commit, also when `supabase/xp_rules_snapshot.json` is staged) refuses any of them that is
not equal to the row. Change the row, `habits.html` and `career/*.toml` together, re-seed Career Mode, and
`select public.career_compare()` must still say `"ok": true`. The quest runs are read from this row by both.
The check is rule 14 of `check_career.py`. It holds until `[switch] catalogue` is turned on (phase 3), not only while Career Mode was
in shadow. Once the XP switch is on, AA Proof's phone previews a tick with these numbers (P13) and Career Mode's score still runs
Proof's functions on them, so a drift between the `.toml` files and the row is a drift between the phone and the board. The one
deliberate difference is `[level]`, base 400 against Proof's 300 (§2), which rule 14 does not compare. After the XP switch
`career_compare()` also lets a row differ where a closed day settled, and calls it `settled`, not a failure.

Three more mirrors live in **SQL function bodies**, not on the row:

| SQL | `habits.html` | What breaks if they drift |
|---|---|---|
| `hab_rank_label()` — its `names` array, 5 subs a rank, 50 levels a cycle | `RANKS`, `SUBS_PER_RANK` | The board prints a different rank name from the athlete's own screen |
| `hab_level()` — the level curve, reading `base`/`growth` off the row | `levelCost()` / `levelInfo()` | Levels differ |
| `hab_clean_note()` — its default `p_max` of 200, which `set_day_note()` uses | `NOTE_MAX` | A roll-call line is cut at a different length; the server's cut is the one that stands |

The scoring **logic** is written twice too: `bonusEvents()` / `questEvents()` /
`comebackRuns()` against `hab_bonus_xp()`, `xpFor()` / `habitXp()` against `hab_xp()`, and
`dayQualifies()` against the `qualday` CTE. **Both round the day's percentage to a whole number
before comparing it with `streakQualifyPct`** (`gatePasses()` on the phone, `round(… * 100)` on
the server), so a day at 79.5% counts on both. Until 2026-09-26 the phone compared the raw number
and a day at 79.5–79.9% counted on the board only. The latest definition of `hab_bonus_xp()` and
`hab_xp()` is currently `supabase/stage24_marks_quests_customcap.sql` (see the foot of this
section). Changing how a badge or milestone is *counted* — not just what it pays — means
editing both.

**Career Mode's copies of the server's rules** (once the XP switch is on). The phones preview what the server will pay, so each copy
is held to the server's own answers in `scripts/career/xp_cases.json` by `scripts/check_twins.js` §9:

| SQL | App | What breaks if they drift |
|---|---|---|
| `career_level()`: the curve and the rank label from `[level]` | `levelInfo()` in `habits.html` (on the profile's base and growth, `overallBase()`), `careerLevelOf()` in `program.html` | A phone shows a level the board does not |
| `hab_xp()` over `career_paid_rules()`: the locked habit pays 0 | `paidXp()` in `habits.html` | A tick previews XP the server will not pay |
| `career_session_want()`: a session's full log, check-in and early finish | `careerFullLog()`, `careerCheckin()`, `careerEarly()` in `program.html` | The finish card promises XP the session does not earn |

Change a rule on both sides, then in the cases file (`node scripts/career/rehearse_switch.mjs --write-cases` writes it from the
server's answers).

**Once the catalogue switch is on (phase 3)** rule 14 stops comparing: from then the catalogue's tier and milestone numbers are
Amir's to tune in `career/*.toml` (re-seed; the server re-prices every award, D12), and `CONSISTENCY_TIERS` and `ACHIEVEMENTS` in
`habits.html` stay only for the display that still reads them (a habit's page, the manual before the switch). One more twin then
matters, held by `scripts/check_twins.js` §10 to `scripts/career/reward_cases.json` (the server's own answers, written by
`scripts/career/rehearse_catalogue.mjs --write-cases`):

| SQL | App | What breaks if they drift |
|---|---|---|
| `career_measures()` / `career_badge_eval()` / `career_achievement_eval()` for the phone-decidable entries | `awardMeasures()` (pure) in `habits.html` | A tap celebrates a step the server does not mint (withdrawn, quietly) or misses one it does |
| the open window, the switch day as history, the price (§3.6 of the build spec) | `phoneAwardsFrom()` (pure), wrapped by `phoneAwards()`; `owned` is the core's list of ids (the older `{ id: day }` map reads the same) | The XP shown at the tap is not what the server pays |
| `career_award_id()` | `awardId()` in both apps | One award gets two ids: shown twice, or never told |
| the events' `goals` in `achievements.toml` | `EVENTS` in `habits.html` | An event finishes on the phone and not on the server |

**Not on the row, deliberately:** `dailyCap` (a client write-time clamp in `setVal()`, with
no server equivalent — §1) and `seasonStart` / `seasonName` (the authority is
`public.seasons`; the `XP_RULES` values are an offline fallback only — §7).

Read the live row with:
`select jsonb_object_keys(rules) from public.xp_rules where id = 1;`

**A check holds the pair together** (2026-09-26): `scripts/check_xp_rules.py` compares every
key in the table above with its `habits.html` constant, against a committed copy of the row,
`supabase/xp_rules_snapshot.json` (the pre-commit hook runs it whenever either is staged). It
fails on anything that scores differently and prints display-text differences as notes. After
changing the row, refresh the copy with `--live` (the script's header has the query) and commit
both. The SQL function bodies in the second table are not covered.

### Changing the database copy — merge, never rewrite

Merge the keys you changed into the row, in the Supabase SQL editor:

```sql
-- one key
update public.xp_rules
set rules = rules || jsonb_build_object('customXp', 25), updated_at = now()
where id = 1;

-- several keys at once
update public.xp_rules
set rules = rules || '{"base":300,"growth":0.55,"completionBonus":1.2}'::jsonb,
    updated_at = now()
where id = 1;

-- one value inside an object (a single habit's weight)
update public.xp_rules
set rules = jsonb_set(rules, '{weights,water}', '30'::jsonb), updated_at = now()
where id = 1;
```

⚠️ **Never rewrite the whole object** — no `set rules = jsonb_build_object(…)`, no
`set rules = '{…}'::jsonb`. Either one replaces all 18 keys with only the ones you typed and
silently deletes the rest — `streakQualifyPct`, `unearnable`, `quests`, `questRuns` (every
run ever started, and the XP athletes earned in them), `passTrack` (nothing new could mint,
and an unminted title is refused), `gateV2`, the comeback keys, `maxCustom` and the
32-rung `milestones` array — and the server quietly falls back to defaults for each. This
section used to print exactly such a snippet, with ten milestones and THE CENTURION at 500.
To change a whole array (`milestones`, `quests`, `tiers`, `passTrack`), set that one key
with `jsonb_set(rules, '{milestones}', '[ … the complete array … ]'::jsonb)`. Count the keys
before and after.

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

- **Everyone is on it** (since 2026-09-12; it was opt-in until then). The app joins an
  athlete itself, once, the first time it opens after their first finished workout
  (`autoJoinBoard()`), and anyone can join by hand from Crew; no row in
  `leaderboard_optin` still means invisible. The display name is `athlete.boardName`
  if the programme record has one, else first name + last initial. Athletes can rename
  or leave at any time, and leaving sticks. The full rule, including why a free
  athlete in practice only ever joins by hand, is `HABITS.md` → *The leaderboard*.
- **Two boards.** *This season* is the default; *past week* is a **rolling seven
  days** — today and the six before it, never reaching earlier than the season start.
  (Stage 12 fixed a mismatch here: the app was changed to say "rolling seven days"
  while the server still scored `date_trunc('week')`, i.e. Monday-to-today. The two
  agreed only on a Sunday.)
- **Badges score on the board too**, on the same day-of-crossing rule — so a tier
  cleared inside those seven days pays on the weekly board. See §4.5.
- **Reading it needs a signed-in athlete** — since 2026-09-07 the RPCs check identity
  server-side (`current_athlete_id()`), so display names are not exposed to the open
  internet; only real athletes see the board.
- **No athlete IDs are ever returned.** An id is the athlete's sign-in username (and it
  used to be enough to fetch `/data/<id>.json`, which is 404 since 2026-09-07).
  `leaderboard_top()` returns display name, title, points, level and rank only, plus
  `is_me` and `joined` flags.
- Rank names and the level curve are mirrored in SQL too (`hab_rank_label`,
  `hab_level`), so renaming a rank means updating `RANKS` in `habits.html` **and**
  the `names` array in that function (see the table above).
- **Once Career Mode's XP switch is on**, `leaderboard_top()` ranks the season's points (or the rolling week's) from the facts,
  training included, through the `career_scores` copy, with each athlete's career level and rank beside the name. Same columns, same
  identity check. A board read works out the stale rows it has time for (a 2.5 s budget, `career_scores_for()`) and serves the rest
  from the copy as they were, so a read never waits on everyone. Renaming a rank then also means the rulebook's `ranks` (§3). Until
  the switch it is Proof's own scorer, as the rest of this section says.

The SQL began in `supabase/stage9_leaderboard.sql`, with seasons in
`stage11_seasons.sql`, bonus XP in `stage12_bonus_xp.sql` and quest runs in
`stage14_quest_runs.sql` — **all applied and live**, like every Proof stage through 25
(listed in `HABITS.md` → *The leaderboard*). The folder is a changelog, not a schema: the
live `hab_bonus_xp()` and `hab_xp()` are **the latest definition, currently
`stage24_marks_quests_customcap.sql`**; `leaderboard_top()` was last redefined in
`stage17_titles.sql` (and again in `stage69_career_xp_switch.sql`, applied 2026-10-17, which answers Career Mode's scorer once
the XP switch is on, as it is since 2026-10-18, and Proof's own before it); and since 2026-09-07 the live board RPCs also carry a sign-in
identity check that no file holds. Read `pg_get_functiondef()` before trusting or
re-running any of them.

---

## 8.5 Quests — a run you start, not a standing feature

Quests are a **lever**, not a background system. There are **none** unless you start a
run, and a run lasts **seven days from the day it starts** — not Monday to Sunday. The
run is drawn on **Progress** (it moved off Today) as the event-style quest card;
when it ends, that section falls back to one muted line until you start another.

That is deliberate: an athlete seeing quests means *something is on this week*. If they
were always there they would be wallpaper.

### 🎯 Starting a run

The everyday lever is **coach.html → Today → *Quest week***: tick one to four quests from
the pool and press *Start the week* — a dashboard run always starts **today** — and
*End this run today* while one is live (it keeps the XP already earned, see *Ending a run early* below). The SQL below does the same job and is the way to
back-date or future-date a run:

```sql
select public.set_quests('2026-07-29', array['w_water5','w_steps50k','w_perfect2']);
```

Runs 29 July → 4 August inclusive. Pass however many ids you like — one, three, five.
Re-running it with the same start date **replaces** that run.

**Ending one early, keeping what was earned** (stage55, 2026-10-11, Amir: *"yes, they keep it"*):

```sql
select public.end_quests('2026-07-29', '2026-07-31');   -- the run's last day is 31 July
```

**Taking a run's XP back on purpose** (the SQL editor only; the dashboard no longer offers it):

```sql
select public.clear_quests('2026-07-29');
```

**Seeing what is set:**

```sql
select rules -> 'questRuns' from public.xp_rules where id = 1;
```

Past runs are kept on purpose — the XP athletes earned in them keeps counting. Clearing
a *finished* run would retroactively take those points away.

**Overlapping runs are CLIPPED, in both scorers** (2026-08-02). `set_quests()` accepts any
start date and only replaces a run starting on the *same* one, so a mid-week start used to
leave two runs covering the same days — and since `questEvents()` walks every run
independently, as does `hab_bonus_xp()`, a quest id present in both **paid twice** off one
stretch of logging. Both scorers did it identically, so the board and the phone agreed and
were both wrong: the hardest kind of error to notice here.

**Ending a run early** (stage55). `end_quests(start, end)` does not remove the run: it gives it an `end` day (capped
at its seventh day; an end before the start drops a run that had not begun, since nothing was earned in it). The run's
window is then the earliest of three bounds: its seventh day, the day before the next run starts, and its own `end`. Both
scorers read it, in the same place: `hab_bonus_xp()`'s `qruns` CTE (`least(rstart + 6, next_start - 1, own_end)`) and
`runEndKey()` in `habits.html`. A quest completed on or before the end day keeps paying (it pays once, on the day it
completes, as always); one not completed by then never pays. The run stops being live the day after, so the quest block
leaves the athlete's Progress screen. A value that is not a `YYYY-MM-DD` date in `end` is ignored by both.
`scripts/test_quest_runs.js` (pre-commit guard 16) and `scripts/test_spine_sql.sh` section J run the same cases against the
two sides. `rulesSignature()` includes the `end`, so ending a run re-baselines quietly instead of celebrating.

A run's window now ends **the day before the next run starts** — a later run simply takes
over, which is the same rule `activeQuestRun()` already used for display (coach.html's `questRunEnd()` / `activeQuestRun()` are the twins since
2026-10-11, guarded by `scripts/check_twins.js`). `runEndKey()` on
the client and the `qruns` CTE's `least(rstart + 6, next_start - 1)` on the server. Proven
to agree on the live database: runs starting 27 July and 31 July clip the first to
**30 July** on both sides, against a natural end of 2 August.

You can now start a run whenever you like; the overlap simply hands over.
>
> `rulesSignature()` now includes the quest pool and the run list. It is the one scoring
> input the server can change while the app is running — `fetchQuests()` overwrites it at
> every launch, before `checkLevelUps()` reads a level — so retuning a quest's payout used
> to hand athletes a full **LEVEL UP** takeover for XP nobody earned that day, and lowering
> one dropped their level with no word of explanation. Both now re-baseline quietly.

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
| `qualify` | N days that pass `dayQualifies()` — `streakQualifyPct` of the day's weight **or** at most one thing left undone (the two-door gate, §6). The server's twin is the `qualday` CTE in `hab_bonus_xp()` |
| `perfect` | N days with every tracked habit done |

Everything is measured **from the log alone**, so nothing new is stored and both scorers
agree. Each quest pays **once**, on the day it completes, and is **season-bounded** — a
run straddling a season opening does not count the days before it.
Once Career Mode's XP switch is on that bound applies to the board's season points only: the career counts the whole run
(`QUESTS.md`).

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

⚠️ **A quest's `note` never spells out a threshold number.** `w_qualify5` read *"5 days at
75% or better"* in **both** pools until 2026-08-02, the day the gate moved back to 80 — a
stale bar printed on every athlete's screen, and a wrong one, since the gate also has a
second door that no percentage describes. It now reads *"5 days on target"*, in
`QUEST_POOL` and on the row alike. Describe a target in words (*on target*, *full water*),
so retuning `streakQualifyPct` can never leave a note naming the old bar — and remember that
changing the threshold means both scorers **plus** any prose that states the number.

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

**Once Career Mode's XP switch is on**, the numbers that matter are in `career/rulebook.toml` (and the other `career/*.toml` files)
as well. A change there is checked (`python scripts/check_career.py`), given a new `version` and seeded again
(`python scripts/career_seed.py`), and every athlete's career is worked out again from their facts: the scores copy goes stale and
is worked out as it is read. The one number that is stored and never worked out again is the level kept at the switch (GAME-1).

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

---

## 12. Open economy decisions

A game-design review (2026-08-02) found five tuning choices — not bugs — each of which
changes what a day is worth and so had to land in `habits.html` *and* Supabase together
(section 8).

**All five have shipped.** Nothing is open.

- ~~the streak gate is unfair on the default roster~~ → §6 (two-door gate, pro-rata
  counters) + `stage22`.
- ~~nothing pays for the comeback~~ → §6.6 + `stage22`.
- ~~FIRST BLOOD is unreachable for the free tier~~ → §4.6 (`DAWN PATROL I`) + `stage24`.
- ~~custom habits have no server-side ceiling~~ → §1 (`maxCustom`) + `stage24`. Amir's
  call was to limit rather than exclude: honest customs still score on the board, only
  the unbounded tail is gone.
- ~~season 2 is a reward dead zone for veterans~~ → §7.5 (the season record and its
  title) + `stage25`. Amir's own suggestion — milestone **marks** (§4.6) — took most of
  the sting out of this one independently, by nearly doubling the badge shelf that
  re-pays every season.
