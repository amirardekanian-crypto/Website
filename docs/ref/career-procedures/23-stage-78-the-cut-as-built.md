## Stage 78: the cut, as built (2026-10-19)

Amir, 2026-10-20 (L5, L6): *"Just remove names and titles and badges"*, *"removed means removed from the server too"*, *"Do not change people xp and
level"*. Applied 2026-10-19 on his word, *"yes, go live with the cut"*, after the before-and-after page (https://claude.ai/artifact/GQankmurwZmMNCi9mAaEWn).

- **What left the server:** every badge but the four marks (34 kinds, 240 awards from 23 athletes), every title (29 in the catalogue, 2 title awards,
  77 rows of `hab_titles`, 13 titles worn on the board), the Grand Slam, the 4 card skins, the rank NAME from every answer (`get_profile()`,
  `career_compute()`'s cached score, `leaderboard_top()`, `roll_call()`; the level stays). The marks (`held_weeks`, `century`, `bests`, `comebacks`)
  and every achievement stay; an achievement or a mark tier that gave a title keeps its row and lost the title.
- **Nobody's number moved:** each paying award that left became a nameless fact, kind `award_kept`, on its own day, its value `{"xp": n}` and
  `"proof": true` when it was one of AA Proof's own badges. `career_facts_paid()` pays it its own XP (never priced by a rulebook, never career-only,
  only with the catalogue switch on), so the career, the season and the week are exactly as they were. `career_compare()` counts the `proof` ones in
  its carried-over check (Proof's tiers and milestones up to the switch). The ref is `kept|<day>|<n>`: it names nothing.
- **Nothing mints a title again:** `hab_mint_titles()` does nothing, `claim_titles()` answers no rows, `set_title()` clears whatever it is given,
  `hab_close_season()` archives a season with no title, `career_mint()` has no title branch. `hab_titles` stays as an empty table (backup, erase and
  restore lists unchanged); `leaderboard_top()` and `roll_call()` keep their `title` and `rank_label` columns, answered null, so an old phone works.
- **The catalogue** is rulebook version 4 (`starts_on = "2026-10-19"`, D20), seeded in the same call: 4 badges, 22 achievements, 0 titles, 0 skins.
  `career/titles.toml` stays, empty of entries; `career/tiers.lock.json` moved the 34 badge ids to its `"_removed"` list, and `check_career.py` rule 21
  refuses one of them coming back (a new badge takes a new id). The ranks stay in `rulebook.toml` `[level]`: D20 refuses a change to the level's rules.
- **coach.html**: the board shows `LV n` and no rank or title; the Titles minted panel and the athlete file's "Wears" line are gone.
- **How it was proved:** `scripts/career/rehearse_cut.mjs` (PGlite, 61 checks: the stage twice, every number the same, what left and stayed, the
  answers, version 4, the way back, the stage again; it starts from the last committed snapshot without the stage and the catalogue at 2746b4d);
  a dry run on the live data inside a rolled-back transaction (35 of 35 the same; `career_compare()` false until the `proof` flag, then ok);
  after the apply, every athlete against `backup.cut78_scores_before` (35 of 35 the same, 338,964 XP), the payload's fingerprints, and one silent
  `career_rewards_batch()` pass over everyone (nothing minted, nothing moved).
- **Safety copies:** `backup.cut78_career_awards`, `_career_recognition`, `_hab_titles`, `_board_titles`, `_career_catalogue`, `_rules` and
  `_scores_before`. Drop them on 2026-11-03.
- **The way back**: `scripts/career/rollback_stage78.sql`, on Amir's word only (it restores the rows, the catalogue, the rulebook versions and the eleven
  functions as stage77 left them; then revert `career/*.toml` and the lock to 2746b4d and remake the snapshot).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
