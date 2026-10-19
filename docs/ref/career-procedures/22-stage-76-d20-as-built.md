## Stage 76: D20, as built (2026-10-19)

Round 5, step 2 (`CAREER_MODE.md` → the D20 row; built on Amir's *"Yes continue untill we are finished with our plan"*). `supabase/stage76_career_forward_only.sql`,
**APPLIED to the live project on 2026-10-19** (migration `stage76_career_forward_only`). Nothing moved: a dry run in a rolled-back transaction first, then the
real apply, both read back as 41 athletes with every paid fact and award the same and 278,395 paid XP before and after; `career_compare()` ok.

- **An award keeps the XP it was minted with** (`career_awards.xp`), which REVERSES D12. The five readers that priced an award again from the catalogue
  now read the minted XP: `career_facts_paid()` (the score, re-created) and `career_compare()`, `career_rewards_line()`, `career_rewards_profile()` and
  `get_awards()` (each patched in place: the one expression replaced, marked `/* stage76: minted XP */`). On 2026-10-19 all 322 awards' minted XP
  equalled their price, which is why nothing moved. `career_mint()` still prices a NEW award from the catalogue at the moment it is minted.
- **A fact is priced by the rulebook version in force on its day.** `career_rules.starts_on` (null for versions 1 to 3, which count from always);
  `career_rules_on(day)` is the newest version whose start day is null or on or before that day; `career_facts_paid()` takes each fact's XP,
  `career_only` and cap from its own day's version.
- **The seed's door, `career_d20_check()`** (called by `career_seed()` before it writes, patched in place). The same version seeded again may change
  only labels: names, captions, `from`, `rule`, a fact's `when`, `cap`, `source`, `pays_for`, `meaning`, a tier's `tier_name`, every message, size, tool and
  setting (`career_d20_prices()` and `career_d20_core()` compare the rest). A NEW version needs `starts_on` = today or yesterday (the catalogue is replaced at
  the seed, so a version starts the day it is seeded); it may change a fact's `xp`, `xp_from`, `career_only`, `limit`, `limit_per` and anything in the
  catalogue; it may not change `[habits]`, `[level]`, `[season]`, `[week]`, `[share]` or anything else in an existing fact (how it is worked out:
  `min_share`, `weeks_away`, `window_days`, `min_gain`). Each refusal says why and changes nothing.
- **A reward a rule change reveals for an earlier day is dated the start day** (`career_mint()`, one line): a tier lowered in version 4 mints, for
  someone who already passed it, on version 4's first day, never back-dated into a closed week or season. A session that syncs after a version starts
  but was trained before it is dated the start day too (accepted: the window is the day of a change).
- **How to change a rule now** (`career/README.md`): raise `version` in `rulebook.toml`, set `starts_on = "<today>"`, change the numbers or the catalogue,
  `python scripts/check_career.py`, `python scripts/career_seed.py --dry-run` (read its answer), then the seed on Amir's word. A rename: change it,
  check, seed at the same version. `scripts/check_career.py` accepts `starts_on` (YYYY-MM-DD) at the top of the rulebook.
- **Rehearsed** by `scripts/career/rehearse_d20.mjs` on PGlite: 45 of 45 (the snapshot, the files' rulebook and catalogue, made-up athletes through the real
  triggers): nothing moves on the day; an award keeps its minted 300 when the catalogue says 9999; every refusal and every pass of the door; version 4
  with a start day prices the five earlier sessions at 400 and today's at 450; Century's second tier lowered to 4 mints on the start day for an athlete
  whose fourth session was 5 days earlier; a rename of version 4 passes and keeps its start day, a price change at version 4 is refused; the way back
  refuses while a version has a start day, then puts all seven functions back exactly; stage76 again after it.
- **The way back**: `scripts/career/rollback_stage76.sql`, on Amir's word only, and only while no version has a start day.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
