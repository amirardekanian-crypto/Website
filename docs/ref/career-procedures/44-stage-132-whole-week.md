## Stage 132: Whole Week (2026-11-24, APPLIED, rulebook version 17 seeded)

**Why.** Round 15 *Over the Line*, #147 (step 6; Amir: *"Yes, start step 6"*). Once: a plan week in which the plan, Court Log (court and other
kinds) and walking or the Library each add 30 Move minutes or more. It says out loud what the Week Line already counts: the life outside the plan
counts with it. Source of truth: the header of `supabase/stage132_whole_week.sql`; way back: `scripts/career/rollback_stage132.sql`.

**The test.** `week_parts` (key `wpart:<each>`, `each` from the entry, 30): the plan weeks of `career_weeks()` from `move_full_from()` - 6 on, each
read through `move_week()` (stage127's own parts, the numbers the athlete sees), counted where `plan >= each`, `court + other >= each` and
`walk + lib >= each`; the day is the week's last day (or today). It wakes on anything `move_week()` adds up: a finished session, a Library session,
a Court Log row, a habit day. All four entry points that reach it (`get_profile()`, `get_achievements()`, the save triggers) run as the owner, so
`move_week()` (closed to signed-in users) answers.

**The entry.** Whole Week, `added_in = 17`, 150 XP, `paid_from` the day after the seed; The Line's ring with 3 KINDS. Farsi in
`scripts/i18n/fa/33-week-and-court.json`.

**Rehearsed, then run (2026-11-24, on Amir's "Yes, apply it").** The rehearsal (rolled back, the cache stamp cleared): the test runs for every athlete, nobody holds it (this week's best parts: plan 75, Court Log 39, walking 15), 0 athletes' XP changed. As run: every athlete's XP, level and season kept first in `backup.v17_before_20261124` (drop after 2026-12-08); the stage applied (migration `stage132_whole_week`), every patch read back; version 17 seeded (224 rows, sha256 `fff31aff…`, staged in `backup.seed_stage`, md5-checked, dropped); one silent batch pass; 0 Whole Week awards, 0 athletes' XP, level or season moved, `career_compare()` ok (39 matched, `rules_equal`).
