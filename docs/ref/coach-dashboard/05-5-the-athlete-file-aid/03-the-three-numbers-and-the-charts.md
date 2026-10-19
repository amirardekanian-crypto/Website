### The three numbers, and the charts

Training load, readiness and adherence sit as a strip of three above the day cards; the full charts
are behind **Charts**. §6 explains all three. They used to be three full-width cards above
everything, which pushed the actual work below the fold on every athlete.

**The charts have axes** (round 3, 2026-10-12). Each card is the title and the number on one line, one line of what it means, the plot, and the legend at its
foot (about 240 px at 1440, 280 before; from 900 px the readiness card is the wide one and adherence the narrow one). Every plot says what it is measured against,
in muted 12 px text from the same scale the marks use: **readiness** 5 and 1 at the height of its two rules, with its dashed *usual* line and a point per check-in, and
the dates of the first and last check-in under it; **training load** 0 and the tallest week (AU) beside its eight weekly bars, and *w/c* the Monday of the first and of the last
week under them; **adherence** 0 % and 100 % under its bar, and the window's two dates in its legend. **Body weight** (folded on The work) gets the same: the highest and lowest
kg of its line (labels pushed apart when the line is nearly flat) and its first and last day. The labels are HTML beside and under the SVG (`plotAxes()`), not text drawn
in it, because the SVG shrinks with its card and drawn text fell under 12 px on a phone. The numbers and rules are unchanged (§6).

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
