#### …and back to 80 (2026-08-02)

Amir, looking at a Friday that counted on 79%: *"I think 75% is very low. Make it 80."*

The paragraph above is the argument against 80, and it no longer holds — it predates the
gate's **second door**. `dayQualifies()` does not ask the percentage alone: `missing <= 1
&& done > 0` passes any day that left at most one thing undone. So the exact failure 75 was
chosen to prevent — miss steps alone on a rest day, lose the day — cannot happen at 80
either. What 80 tightens is the day that missed **three things by a little each**, which is
literally the day that prompted the change (Fri 31 Jul: steps 7,000/10,000, sleep 6/7.5,
protein 2/3 → 79%).

Measured across all eleven athletes on the board before shipping:

| | qualifying days 75 → 80 | streak 75 → 80 |
|---|---|---|
| Amir | 7 → 5 | **5 → 2** |
| Athlete A | 2 → 0 | 0 → 0 |
| Athlete B | 6 → 5 | 2 → 2 |
| Athlete C | 2 → 1 | 2 → 1 |
| Athlete D | 1 → 0 | 1 → 0 |
| The other six athletes | unchanged | unchanged |

⚠️ **Streaks are derived, so raising the bar shortens them retroactively** — Amir's own
went 5 → 2 the moment this shipped. That is the cost of the knob and it is worth stating
out loud before turning it. **XP, titles and levels did not move for anyone** (checked at
both thresholds across all 11): the bonus ledger only reads `qualify` for the day-streak
milestones and the `w_qualify5` quest, neither of which was in play. Rewards are still
append-only.


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
