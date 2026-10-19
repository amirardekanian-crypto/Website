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

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
