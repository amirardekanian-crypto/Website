### Career Mode, phase 1 (`supabase/stage66_career_mode.sql`, 2026-10-17)

The fact ledger, in shadow, live since 2026-10-17 (applied on Amir's yes, seeded, `career_compare()` 34 of 34; the numbers measured
there are in `career/PROCEDURES.md` → *Phase 1, as built*; `scripts/career/rollback_stage66.sql` takes it off, tested). Three tables: `career_facts` (athlete, kind, ref, day, value, source, void_at; unique on athlete +
kind + ref; voided, never deleted), `career_rules` (the rulebook, one row per version) and `career_catalogue` (every badge,
achievement, title, skin, mission, quest, size, message, tool and setting). `observe()` is four triggers (`career_on_progress`,
`career_on_session`, `career_on_library`, `career_on_programme`), each in its own exception block, so Career Mode can never stop a
save. `career_derive()` / `career_derive_days()` write the derived facts (held and broken weeks, bounce backs, returns, weeks by
the book, cycles and the roadmap finished, effort wins, lift gains, months with Amir, personal bests, retests, comebacks).
`career_score()` scores the habit half with Proof's own `hab_xp()` / `hab_bonus_xp()`, fed from the facts and from the rulebook
in `xp_rules`' shape (`career_habit_rules()`), and the rest from `[fact.*]` with its caps; `get_profile()` is the read;
`career_compare()` is the shadow check; `career_backfill()` re-works everyone; `career_seed()` loads a seed from
`scripts/career_seed.py`. Copies of the training app's maths live here (`career_entry_sets()`, `career_win_gain()`,
`career_weeks()`) and of Proof's day gate (`career_habit_days()`): change them with their originals. The other way round,
`program.html`'s `holdCount()` (Home's Hold Serve row, 2026-10-17) copies `get_profile()`'s weeks held in a row: `scripts/check_twins.js`
runs it on `scripts/career/hold_cases.json`, and the rehearsal holds the two equal on every athlete it builds.
`scripts/career/rehearse.mjs` builds the snapshot on PGlite and replays saves, hides, deletes, the row-level security, the
profile, a broken rulebook and an erasure (67 checks, 2026-10-18, the made-up pound and plate athletes of the weight-units stages among them; with a dump of the real rows it also proves every athlete
matches Proof). Since 2026-10-18 the three Career Mode rehearsals start from `schema_snapshot.sql` as it is and apply only the stages it does not hold, through
`scripts/career/rehearse_lib.mjs` (`ensureStages()`, `filesAt()` for the career files of an older commit); see *Phase 3* below. The restore puts `career_rules` back last (`restore_backup.py`, `RESTORE_LAST`) so no trigger works anything out
half-restored.

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
