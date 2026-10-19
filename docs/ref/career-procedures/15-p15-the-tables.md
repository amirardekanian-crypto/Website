## P15. The tables

Each one, the day it is created, gets row-level security (the athlete reads their own, Amir reads all, the crew only
through `get_bell()`), and goes into `BACKUP_TABLES`, the schema snapshot and `coach_erase_person()`.

| Table | One row per | Holds |
|---|---|---|
| `career_facts` | fact | athlete, day, kind, ref, value, source, void_at; unique on athlete + kind + ref |
| `career_rules` | rulebook version | `rulebook.toml`, as stored data |
| `career_catalogue` | badge, achievement, title, mission or quest | its block from the `.toml` files |
| `career_awards` | badge tier, achievement or title earned (**built, stage70, 2026-10-18**) | athlete, award id, kind, item, tier, subject, day earned, `pays`, xp at mint, size, meaning, evidence, how (`live`, `silent`, `baseline`), rulebook version. Never updated, never deleted (an erasure is the one exception) |
| `career_missions` | mission, per athlete per week | slot, mission, target, frozen XP, progress, day done, pinned by |
| `career_quests` | quest, per athlete | steps, status, door, set by, started, paused, finished |
| `career_recognition` | moment told (**built, stage70**) | athlete, award id, audience (`athlete` now; `coach`, `crew`, `beyond` are later phases), size, `due_at`, `told_at`, `told_by` (`proof` or `training`). Written only for an award earned live |
| `career_kudos` | kudos | who gave it, which line |
| `career_consent` | athlete | the Bell yes or no, when it was asked |

Also built in stage70: the column `career_scores.rewards` (the cache of `career_evaluate()`: what each ladder stands at, and the day the athlete was
baselined; no source), the index `career_facts_kind_idx`, and the one-off table `backup.career_catalogue_before` (each athlete's score under the old
rules, kept for the go-day report; **dropped 14 days after the go-day, on 2026-11-01, together with the five safety copies `backup.golive_20261018_career_scores`, `backup.golive_20261018_hab_titles`, `backup.golive_20261018_career_rules`, `backup.golive_20261018_career_catalogue` and `backup.golive_20261018_career_facts`**). `career_awards` and `career_recognition` are in `coach_erase_person()` and the
rollback; their lines in `BACKUP_TABLES` and `TABLE_KEYS`, `restore_backup.py`, `test_restore_backup.py` (46 tables become 48) and the schema snapshot are in the phase 3 commit (rollout step 2).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
