## P14. Shadow, then the switch

1. Seed the rulebook from `rulebook.toml` (Proof's habit numbers as they are today, plus the training facts).
2. Run P1 and P2 over all history: sessions since 21 April 2026 and every Proof log.
3. For every athlete, compare the habit XP Career Mode works out for the current season with Proof's own
   (`hab_xp()` plus `hab_bonus_xp()`). It must match exactly. A difference is fixed in P1 to P3, never hidden.
4. Re-anchor `base` (P4).
5. Switch Proof's level, rank and board to `get_profile()`. The first open shows one moment: *Your career: level N,
   from everything you've logged since <date>*.
6. Proof's phone scorer stays only as the preview (P13).

The switch, as it is done (phase 2; Amir 2026-10-17, *The decisions, round 3*): the switch is `rulebook.toml` → `[switch] xp`,
turned on by a seed.
1. Before it: Season 1 has started (2026-10-18), so Pre-Season's records hold each athlete's highest Proof level. Take a backup
   (coach.html → ⚙ Tools → ⤓ Backup).
2. In `rulebook.toml`, bump `version` and set `[switch] xp` to today's date (never a day still to come: the seed refuses it).
3. `python scripts/career_seed.py --dry-run --out <file>` and run it on the project: the server works everything out (the levels
   kept included), undoes it, and returns every athlete's line: Proof's level now and its best season record, the career level,
   the XP kept and the level after. That is the list Amir reads before he says yes.
4. On Amir's yes: the same without `--dry-run`. It runs no backfill (only a switch changed), writes each `level_kept` fact
   (`career_keep_levels()`), and returns the same list. `select public.career_compare()` must still say `ok` (both sides pay
   the WORKOUT habit 0 now; a row that differs only because a closed day settled says `settled`).
5. Commit the `.toml` with the date the same day, so the next seed keeps the switch on (a seed that turns it back off is refused).
   The same commit changes `privacy.html` §2.3 and its *Last updated* date (Proof's six-file rule): the level is a career level that
   counts finished sessions too and no longer resets, the board's points count finished sessions (a number only), and the server
   keeps a working copy of the numbers, worked out again from the history and erased with the rest. Not before: until the switch it
   would not be true. `privacy-fa.html`'s short version ("name, points and rank") stays true as it is.

The catalogue switch (phase 3) went on the same way on 2026-10-18, alone and at the same rulebook version, with a dry run read first (*Phase 3, as built* → *The go-day, as run*).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
