## Stage 131: Three Shapes, phases 2 and 3 (2026-11-24, APPLIED, rulebook version 16 seeded)

**Why.** #159 *Three Shapes, Everywhere* (Amir: *"go with your picks"*, *"i like your ladder"*): every family gets a single day, a month's total and
days in a row. Phase 1 was version 14 (no SQL); stage130 brought the month and run shapes; this stage adds the four tests phases 2 and 3 still
needed. Source of truth: the header of `supabase/stage131_three_shapes_more.sql`; way back: `scripts/career/rollback_stage131.sql`.

**The tests** (keys of `career_measure_more()`, read like `total`; stage130's lists in `career_entry_kinds()`, `career_entry_keys()`,
`career_achievement_eval()` and `get_achievements()` widened by a guarded replace, `career_measures()`'s key prefixes too):

| Test | Key | What it counts |
|---|---|---|
| `month_count` | `mcnt:<reads>` | facts of one kind in one calendar month |
| `month_all` | `mall:move_week` | calendar months, once over, whose plan weeks (a cycle's training weeks ending in the month, 4 or more) each hold a `move_week` on their first day |
| `weeks_checked_in` | `wchk:checkin_done` | plan weeks in a row with at least one finished session and every one of them checked in (`checkin_done` carries the session's ref) |
| `cycles_running` | `crun:<reads>` | cycles in a row (by `cycle_index`) each holding the fact inside its dates |

`scripts/check_career.py` knows them, and `streak:custom` joins its Proof measures (HOUSE RULES: `career_measures()` has answered `run:custom`, the
best run of any habit the athlete added, since stage70).

**Version 16, 24 achievements** (`added_in = 16`, `paid_from` the day after the seed). Phase 2: 100K · 200K · 300K MONTH (steps summed in a calendar
month as the Steps habit counts them, 250 · 500 · 1000), TWENTY NIGHTS, TWENTY DAYS HYDRATED, TWENTY DAYS FUELLED, TWENTY THAT COUNTED (20 in a
month, 250 each), FIFTEEN DAYS LOOSE (mobility 15, 250), TEN PERFECT DAYS (250), THREE · SEVEN PERFECT DAYS in a row (100 · 300), HOUSE RULES I-III
(3 · 7 · 21, 60 · 150 · 350), Full Moving Month (400). Phase 3: Library Regular (4 in a month, 250), 3 · 6 Weeks of Extras (175 · 300), First
Check-In (30), 50 · 100 Check-Ins (300 · 600), Every Session Told (4 weeks, 250), Three-Best Month (250), Always Improving (a best in 3 cycles
running, 400). Supplements are left out on purpose. Emblems (`emblems.js` ?v=5): month banners ("20/MONTH") on the habit coins, HOUSE RULES as a
star ladder, Full Moving Month as The Line's ring in Night, the training ones as trophies. Farsi: `scripts/i18n/fa/34-three-shapes-more.json`.

**Rehearsed** on the live project, in one statement that ends by raising its result (all rolled back), with the evaluation cache's stamp cleared
so every athlete is worked out (a catalogue row added by hand does not change the stamp; a real seed does): 77 awards, all at 0 XP, 0 athletes'
XP changed. First Check-In 37, Every Session Told 11, Three-Best Month 7, 100K MONTH 4, HOUSE RULES I 4, HOUSE RULES II 3, TWENTY NIGHTS 3, 50
Check-Ins 2, and one each of 200K MONTH, TWENTY DAYS HYDRATED, TWENTY DAYS FUELLED, FIFTEEN DAYS LOOSE, THREE PERFECT DAYS, Always Improving. The
counts agree with the live numbers on the pitch page.

**To apply** (on Amir's word): the stage file (apply_migration); seed version 16 (staged through `backup.seed_stage`); `career_rewards_batch(o, 5,
'silent')` from 0 until n = 0; `career_compare()` ok; every athlete's XP equal to the copy taken before.

**As run (2026-11-24, on Amir's "Yes, apply it").** Every athlete's XP, level and season points kept first in `backup.v16_before_20261124` (44 athletes; drop it after 2026-12-08). The stage applied (migration `stage131_three_shapes_more`), the widened lists and key prefixes read back in place and the measures equal to the rehearsal's. Version 16 seeded (223 catalogue rows, sha256 `1d2525f0…`, staged in `backup.seed_stage`, checked by md5, dropped after). One silent `career_rewards_batch()` pass to n = 0. Read back: 77 awards to 38 athletes, all at 0 XP, the same entries and counts as the rehearsal; 0 athletes with their XP, level or season points changed; `career_compare()` ok (39 matched, `rules_equal`).
