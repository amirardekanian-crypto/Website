## 3. Ranks

> **Since the cut (stage78, 2026-10-19) no rank name reaches any screen and none is sent by the server** (the level number stays). The names below
> stay in `career/rulebook.toml` `[level]` only because D20 locks the level's rules; they are shown to nobody. No title is minted either.

> **Rank names are not drawn since 2026-10-19** (Career Mode round 5, L5). AA Proof shows the level as a number and a bar, on Today and in the habit rings.
> The names, the crests and the road below still exist in the code, and `rankFor()` still reads them, but no screen shows them until the cut removes them.
> Nothing about the level curve (§2) changed.

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

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
