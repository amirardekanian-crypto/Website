## P16. Changing a detail

1. Edit the `.toml` file (or ask Claude to). [`README.md`](../../../career/README.md) says which file holds what.
2. Run `python scripts/check_career.py`. It refuses a missing meaning, an unknown fact, gold, a mission with a fixed
   XP, a title that doesn't exist, and more.
3. Once built: re-seed the rules and the catalogue. Before D20 (stage76, 2026-10-19) every athlete's XP and level were worked out again from their facts
   with the new numbers. Since D20 a re-seed changes no past price: see step 5.
4. Nothing already minted is taken back. A new badge or tier is minted for everyone who already qualifies, in silence
   (P5, step 6).
5. **After go-live (the catalogue switch, 2026-10-18) a change applies forward only: D20, BUILT 2026-10-19 (stage76).** A change to an XP value, a cap or what earns an achievement is a new rulebook version with `starts_on` = the seed day. Facts before it keep their prices (each fact is priced by the version in force on its day), and an award keeps the XP it was minted with (D12 reversed). A reward the new rule reveals for an earlier day is dated the start day. A rename changes only the label (the same version, re-seeded). The habits, the level curve, the season, the week and how a fact is worked out cannot change by seed (the seed refuses): a bug fix is asked of Amir, backwards or forwards, never decided. *Stage 76: D20, as built*, at the end of this file.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
