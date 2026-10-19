### Body weight — on The work, folded

Under the Personal records (and above the day cards) sits **one compact panel** with the body weight the athlete logs in their training app: its header line reads
*Body weight · 64.7 kg · today · −1.3 kg over 30 days · −2.5 over 90* (the latest reading and how long ago, then the change of the 7-day average over 30 and
over 90 days, the same average the app draws), and the chart (with its axes: the highest and lowest kg of the line, its first and last day) is folded under it in `<details id="wtdet">`, **shut until you open it** and kept open through
a redraw (`snapTabBody()` collects every `details[id]`). It is **absent, not empty, when there is no reading**. It moved here on 2026-10-12 (round 2): the
weight comes from the training app, not from Proof, and a coached athlete who never ticks a habit has no Proof tab to find it on. Read-only, never scored
(`weightPanel()`; `proof-home` drives it).

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
