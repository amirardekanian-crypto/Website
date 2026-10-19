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

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
