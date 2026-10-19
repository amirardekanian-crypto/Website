## 🏆 This cycle: where it is, and the wins (PROG-01, 2026-09-27)

**Since 2026-10-12 the card is on Progress, under its header, not a tap and with no empty wins line** (*Home and
Progress in the Centre Court look*, above). The wins below are unchanged.

"Is this working?" had no answer in the paid app: progress was one exercise at a time. Amir's calls on the
mockup (https://claude.ai/artifact/JhzKhBvP54ERS3AMiwTcrW): *"a card on home, but remove the card (line) on the
top of the home page, and replace it with this, when you click, it goes to gameplan"*, and for the lifts, *"not
every one do under 10 reps, so we need to find a way to celebrate wins for every one, when they lift heavier
with same rpe"*.

- **The card** (`paintCycleCard()`, `#home-cycle-wrap`, a tap → Game Plan): *Cycle 2 of 3 · Load & Build*, **Week
  3 of 5** with a bar, **6 of 10 sessions** with a bar (finished sessions since the cycle's `startDate`, from the
  history plus today's finishes on this phone, against days × weeks), and up to three **wins**. Painted at boot and
  again by `paintWeek()` whenever the history arrives. A cycle with no dates (5 of 35 live programmes), or before or
  after its dates, keeps the small line. No wins yet: one quiet line says where they will show.
- **Wins are effort-matched** (`cycleWins()`, `winText()`): for each lift, its first session of the cycle against
  its best one since (so a back-off week never takes a win away), each session's best set by an effort-adjusted
  index (`cycleSetOf()`: Epley on reps to failure, `w × (1 + (reps + 10 − RPE) / 30)`; bodyweight: reps to failure).
  The words are the plainest that are true: *+2.5 kg, same reps, same RPE* · *+3 reps at 16 kg, same RPE* · *80 kg
  × 6 felt easier: RPE 8 → 7* · *+4 reps, same RPE* (bodyweight). Only when two things moved at once is it *heavier
  and harder: about 7% stronger* (the index as a percentage only, so the formula's bias at high reps cancels out).
  A hold logs a tick and an RPE, no seconds, so its win is *felt easier: RPE 8 → 7*. Under 2% is no win; a lift
  that went down, a lift trained once, or a loaded set against an unloaded one says nothing. The top three by gain.
- Checked on crafted history for every kind of win and non-win, and on the demo's (`prog01` suite).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
