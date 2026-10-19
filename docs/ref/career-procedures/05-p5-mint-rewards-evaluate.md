## P5. Mint rewards: `evaluate()`

**When:** after P1 and P2 for an athlete; after P6 and P7 finish something; at a season's close; on Amir's pick.

**Reads:** the athlete's non-void facts, their awards, `badges.toml`, `achievements.toml`, `titles.toml`.

**Steps:**
1. **Badges.** For each badge, work out its measure for this athlete:
   - `kind = "best_run"`: the longest run of its fact, best ever (a broken run never lowers it).
   - `kind = "total"`: how many of its fact, over the whole career.
   - `kind = "per_habit_best_run"`: Proof's consistency tiers, one ladder per habit.
   - `kind = "best_value"`: the largest value its fact has reached (The Upgrade reads `lift_gain`'s percent, over main lifts only: the entry's `patterns`, `qualities` and `exclude`, D18, *Phase 3, as built* → *Stage 73*).
   - A badge with `habit = "…"` reads only that habit's facts.
   For each tier whose `at` the measure has reached and that is not yet an award, mint it: athlete, badge, tier, the day
   the measure crossed `at`, the facts that crossed it (the evidence).
   **Entries gated on the catalogue switch** (`[switch] catalogue`, phase 3). An entry with `retire_at = "catalogue"` is earned
   exactly as Proof earns it until phase 3, minted at the baseline, and never earned after. An entry with `starts_at = "catalogue"`
   is not earned before phase 3; at the catalogue switch it is worked out over the whole history and minted in silence.
   `superseded_by` names the entry that takes an old one's place: the shelf shows the new one, and the old awards fold under it,
   never deleted. This is how a design change reaches a Proof entry without changing Proof's numbers, which AA Proof's phone keeps
   previewing ticks with until the catalogue switch (P13, P14).
2. **Achievements.** For each achievement not yet earned, check its rule once. When it holds, mint it.
3. **Titles.** Mint a title when what earns it is minted: a badge tier or achievement with `title = "…"`, a level on
   the road (Proof's 14 rewards), a season's close (P4), a finished quest with a title (P7), Amir's Pick (P9).
   **The Grand Slam:** after any title is minted, if the athlete now holds at least one title in each of the four
   meanings (a title whose `meaning` is one of the four; level, season and chosen titles don't count), mint GRAND SLAM,
   size `legend`.
4. **Recognition.** Each new award gets a recognition row with its catalogue `size` (P8).
5. **Never delete an award.** A void fact (P12) only stops future awards.
6. **The baseline.** The first run for an athlete (phase 3) mints everything they already earned in silence: one moment
   at most, never thirty (the way Proof baselines its rewards on first boot).

**Writes:** awards, recognition rows.

**Rules:** GAME-1, GAME-3, GAME-8.

**As built (phase 3, 2026-10-18, catalogue switch on since that evening):** `career_evaluate()` does steps 1 to 6 in one pass of measures, and step 4 only for an
award earned live. Every function, the seams, the switch and the queue are in *Phase 3, as built*, at the end of this file.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
