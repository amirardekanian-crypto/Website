## Stage 75: Courtside, as built (2026-10-19)

**APPLIED to the live project on 2026-10-19** (Amir: *"Yes continue untill we are finished with our plan"*): read back as the stage file's header says;
the schema snapshot (53 tables), coach.html's `BACKUP_TABLES` and `scripts/test_restore_backup.py` (check 2g) were updated in one commit, and the restore
rehearsal passed (49 of 49). September 2026's honours, worked out live: most sessions 14 (one athlete), no main-lift gain, Full Month nobody, three
athletes one week short. coach.html freezes them on its first load (it is past the 8th).

Round 5, step 1 (`CAREER_MODE.md` → *Round 5*, L2, L10, L11). Amir picked direction A of the design page (https://claude.ai/artifact/L3Tt3B6YPqMWcVgnN7nt9g)
with "Go with your picks" on 2026-10-19, which also answered its two calls: athletes see the goal, his line and "Amir saw this" with the light
screens (step 3), not before; a tie shares an honour. **Nothing here pays XP, mints an award or touches the scorer** (L11), so it did not wait
for D20. The stage number: `stage74_publish_cycle_label.sql` took 74 on 2026-10-19, so Courtside is **stage75** and every later step of plan A
moves up one (D20 = stage76, the cut = stage77, Crew = stage78, the Monthly Open = stage79), and again with step 3's read (stage77,
`get_my_moments()`): the cut = stage78, Crew = stage79, the Monthly Open = stage80; and once more with the new achievements (stage79, 2026-10-19):
Crew = stage80, the Monthly Open = stage81.

**The file** `supabase/stage75_career_courtside.sql` (safe to re-run; a guard refuses without stages 66 to 73):
- **Five tables, coach-only** (select for the coach, so the backup reads them; no direct write for anyone, every write is a function below):
  `courtside_marks` (Saw it and sent, per award), `career_honour_months` (a month whose honours are frozen, and the Pick: `picked`, `nobody` or
  undecided), `career_honours` (one row per winner, a tie is several rows; honours `sessions`, `improved`, `full_month`, `near` (one week short)
  and `pick`), `career_goals` (one line per athlete per month, 1 to 140 characters, and the day it was ticked done) and `career_notes` ("From Amir":
  one line per athlete per day, 1 to 90 characters, optionally the award it answers, and `read_at`, which step 3's app will write).
- **`career_is_client(id, not_clients)`**: not `demo`, not a former athlete, not one of the ids coach.html passes (`p_not_clients`: its `SYSTEM_IDS` and `AMIR_ATHLETE_ID`, Amir's own login), so the server's set is coach.html's `inTotals()`. The page passes the list because a stage file cannot name that login (pre-commit guard 6 keeps athlete ids out of public files); `get_courtside()`, `coach_honours()`, `coach_honours_freeze()` and `coach_honours_pick()` take it, and without it only the demo and former athletes are left out.
- **`career_main_lift_names()`**: the names (`career_norm()`) of the lifts D18 counts, from **Double Up's** catalogue row (an achievement, so it
  outlives the cut) through `career_maxpct_key()`; a twin of stage73's `ks` and `sp` in `career_measures()`, so change both. It fails closed (no row, no
  patterns, or an exclude id missing from the Spine: no lift, so no Most improved that month).
- **`career_honours_live(month)`** works the month out from the facts, for the clients with a fact in the month.
  **Most sessions** = the plan sessions `career_facts_paid()` pays (D19); everyone on the top count (at least 1) shares it.
  **Most improved** = `career_cycle_wins()` over the month (each lift's first session in the month against its best since, at the same effort:
  the wins card's own rule, PROG-01), every win (the rulebook's limit of three is lifted for this), main lifts only; the biggest percent, rounded
  to 0.1, shares. **Full Month** = every training week that ENDS in the month (`career_weeks()`) has its `week_held` fact, and at least 4 such weeks;
  **one week short** = at least 4 and exactly one not held. **The Pick's shortlist**: three different people (most `week_held` facts dated in the
  month; the biggest main-lift gain; the most `training_return`, `bounce_back` and `comeback` facts, the longest time away breaking a tie).
- **`get_courtside(from, to)`** (coach only, a window of at most 35 days): the awards minted LIVE in the window (never the go-day's baseline
  back-pay), size `highlight` up, kinds that stay after the cut (badges `held_weeks`, `century`, `bests`, `comebacks`, and every achievement),
  clients only, each with its share spec, its evidence facts and Amir's marks. It reads `career_awards` and writes no coach row anywhere, so
  `career_mint()` and `career_recognition` are untouched (the old phase 4 spec's route through them was not needed).
- **`coach_courtside_mark(id, award_ids, 'saw' | 'sent' | 'undo')`**: sent is seen too; Undo deletes the mark. Returns how many of the ids are that
  athlete's awards (0: none, and the page says so).
- **`coach_honours(month)`** (a month that has ended): the frozen rows once frozen, else the live work, plus the Pick (decided, or its shortlist)
  and `pick_open` (until the end of the month after). **`coach_honours_freeze(month)`** writes the winners once (re-running changes nothing);
  coach.html calls it before the first honour is sent or the Pick is made, and on its first load from the 8th. **`coach_honours_sent()`** marks a winner
  sent (0 when that person is not a winner, e.g. a late session moved the result at the freeze). **`coach_honours_pick(month, id | null)`**: one
  client, or nobody; freezes first; once decided it stays decided (a mistake is fixed in the SQL editor). No title and no award (titles are removed, L5).
- **`coach_set_goal(id, month, line)`** (last, this or next month; an empty line clears a goal that is not ticked) and **`coach_goal_done(id, month, bool)`**.
- **`coach_from_amir(id, day, line, award_id)`** (the coach's day, within a day of the server's; one a day; an empty line takes back an unread one; a
  former athlete, the demo and Amir's own login get none).
- `coach_erase_person()` learns `courtside_marks`, `career_honours`, `career_goals` and `career_notes` (the month table holds no person).

**The page** (coach.html, `COACH_DASHBOARD.md` → *Courtside*): `loadCourt()` after the first paint; Today's right column opens with the panel;
the goal line and "From Amir…" sit under the athlete's name. `COURT_LINES` holds the WhatsApp lines, a copy of `recognition.toml`'s
`[message.*]`; `scripts/check_career.py` **rule 22** fails a commit where the two differ. The new lines reach `career_catalogue` with the next seed
(D20's); nothing on the server reads them. The page hides everything while `get_courtside()` is missing (`courtMissing()`).

**Rehearsed** by `scripts/career/rehearse_courtside.mjs --backup <aa-backup>` on PGlite: the schema snapshot (every stage through 74), the
backup's real rows, stage75 twice, then 86 checks: grants and refusals; the ids coach.html passes as not clients left out of Courtside and the honours; the main-lift names equal to a re-derivation from the Spine (66 names
on the 2026-10-18 backup) and failing closed; every honour of August, September and October re-derived in the script (Most sessions 16, 14 and 7
so far; Most improved +0, +0 and +27.1% on a main lift, with off-list lifts at +15% and +150% left out; Full Month 0; one week short 0, 3 and 0;
each month in about 0.4 s); freezing twice, sending, the Pick (nobody, a client, a second pick refused, the demo refused, a closed month refused,
no title or award minted); Courtside's filter on made-up awards (live only, highlight up, the kinds that stay, clients only, this week only); the
marks, the goal and the line with every refusal; an erasure that empties the four tables; no fact, score, rulebook or catalogue moved; the way back
(`scripts/career/rollback_stage75.sql`, twice: the erase list back exactly as before, the frozen honours copied to the backup schema first); and
stage75 again after it. A backup taken before the go-day's seed holds Double Up without D18's rule; the rehearsal then takes that row from
`career/achievements.toml`, as the live project has it.

**To apply** (Amir's yes first): no backup is needed for the apply itself (it adds tables and functions and changes no row; the one existing object it
touches, `coach_erase_person()`'s table list, is put back exactly by the way back); `stage75_career_courtside.sql` through the Supabase tool (`apply_migration`); read back the five
tables, the functions and their grants (anon executes none; the helpers are the service role's only); `coach_honours()` for the month just gone as
the coach; then, in ONE commit: `supabase/schema_snapshot.sql` remade (`scripts/restore/README.md`), coach.html's `BACKUP_TABLES` with the five
tables, `scripts/test_restore_backup.py` counting them, and `scripts/restore/rehearse.mjs` run. The way back: `rollback_stage75.sql`, on his word only.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
