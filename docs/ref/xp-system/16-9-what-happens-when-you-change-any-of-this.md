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

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
