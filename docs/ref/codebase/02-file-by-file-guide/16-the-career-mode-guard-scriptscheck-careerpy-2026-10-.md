### The Career Mode guard (`scripts/check_career.py`, 2026-10-17)

Pre-commit guard 20, run when a `career/*.toml` file, the checker, `supabase/xp_rules_snapshot.json` or (since stage73, 2026-10-18) `coach.html` is staged. `career/` is
the design of the gamification system (`career/CAREER_MODE.md`; phase 1 live in shadow since 2026-10-17 and phase 2, the XP switch, on since 2026-10-18, below), kept as seven `.toml` files
Amir edits by hand: the rulebook, badges,
achievements, titles, missions, quests and recognition. The checker (standard library only, `tomllib`) blocks a reward with
no meaning, a fact nobody defined, a mission with a fixed XP of its own (GAME-7), a title or tier that points at nothing,
tiers out of order, metals out of order and the banned colour words; coverage gaps (a meaning with no badge, a habit with no
recovery mission) are warnings. `scripts/test_check_career.py` (114 tests on temp copies, 2026-10-18) runs when the checker or its test is
staged; each of 24 rules was disabled once on a throwaway copy (phase 1), and its test failed every time. Since phase 1 it also checks
the fields that carry Proof's counting (`proof_measure`, `proof_kind`, `proof_need`) and, until `[switch] catalogue` is turned on (rule 14), that
every habit number, tier, milestone and quest equals Proof's own in `supabase/xp_rules_snapshot.json`. Since phase 2 it checks the two switches
(`[switch]` `xp` and `catalogue`, each `"off"` or a day, the catalogue one never before the XP one: rule 16), the catalogue's gates
(`retire_at` and `starts_at` say `"catalogue"`: rule 15) and a fact paid from its own value (the level kept: `career_only`, meaning `"carried"`).
Since phase 3 it also checks a `best_run` badge's `run` (rule 17), an achievement's `test` and exactly that test's keys (18), a title's `size` and the
`[moments]` table (19), the gates agreeing (20, a warning) and **tiers append-only** against `career/tiers.lock.json` (21: an inserted, reordered or
removed tier is an error, a badge missing from the lock a warning). `python scripts/career_seed.py --write-lock` rewrites the lock after the checker
passes, and `--catalogue-steps` prints the go-day statements. Since stage73 (GAME-10) it accepts the optional `patterns` key only on a best_value entry that reads `lift_gain` (a badge with `kind = "best_value"` counting `lift_gain`, an achievement with `test = "best_value"` and `reads = "lift_gain"`), because the server reads it nowhere else, and holds every name in it to `SPINE_PATTERNS` in `coach.html` (its companions `qualities` and `exclude` sit only beside `patterns`; `qualities` is held to `QM_IDS` there, read when the checker runs, and `exclude` to a non-empty list of kebab-case Spine ids, each once; the checker has no database, so the rehearsal checks the ids are approved entries), which is why a staged `coach.html` runs this guard too.

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
