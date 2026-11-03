## Stage 106: the spare, and every finished session counts (2026-10-26, APPLIED; brought to the repo 2026-11-03)

⚠️ **Applied from a session whose files never reached main.** The migration `stage106_spare_session` went live on 2026-10-26 at 13:28:57 UTC, and
rulebook **version 12** was seeded two minutes later (13:30:21, `starts_on = 2026-10-26`). Neither was in the repo until 2026-11-03. The snapshot of
2026-11-02 found the stage, and the rest alert after it had to be filed as stage107 (`docs/record/PUSH-REST-AND-FINISH.md`). No branch held a copy, so
the SQL was taken from `supabase_migrations.schema_migrations.statements`, character for character. Files: `supabase/stage106_spare_session.sql` (its header is new, written from the live rows), `scripts/career/rollback_stage106.sql`
(new, never run), and `career/rulebook.toml` at version 12 (the rules it seeds equal the live row). Amir's own words for the decision are not on record. No
table is added, and no app file changed with it.

**What it does, in two halves.**
- **Version 12 (the XP):** `session_finished` and `session_finished_early` go from `limit = 1` to `limit = 2` per plan day per training week. A plan day done a
  second time in the same week pays again, and a third time pays nothing. Under D20 it prices facts from 2026-10-26 on, and nothing before that day is repriced.
- **Stage 106 (how the server works it out):**
  - **The spare** (`career_derive()`, `held`): a plan day missed in a training week still counts as done when the same plan day was trained twice or more in
    the week before, in the same cycle. It applies only to weeks that start on or after 2026-10-18 (Season 1). A spare covers one day in the next week only.
    A week held by spares alone has no session, so its `held_on` is the week's first day.
  - **Every session counts** (`career_measures()`): a `count:` reward over the two session kinds (Century, `sessions_N`) counts every finished session again,
    not only the paid ones. That takes those two kinds out of D19's paid-only count (stage73, *Stage 73*); `library_session` and `effort_win` keep it. This is
    the count Pooya's page met in *Stage 105* (74 sessions, 72 counted).

**What moved on the live rows.** The version 12 seed's quiet pass minted 6 awards for 6 athletes, all `via count:session_finished,session_finished_early`
(Century step 2, and sessions_7, 15, 30 and 40). Five were at 0 XP (done before their `paid_from`, D21). One was sessions_15, done 2026-10-25, at 200 XP.
As of 2026-11-03 no week has been held by a spare.

**Not part of it.** The 2026-11-02 snapshot also shows `coach_erase_person()` and eight other functions as changed. The difference is line ends only: their
live bodies carry CRs from an old version applied from Windows, kept by later textual patches (stages 96, 97). The snapshot of 2026-10-26 had dropped them.
Ignoring whitespace, they are identical.

**Check (2026-11-03, PGlite, nothing live).** Starting from the two functions as the 2026-10-26 snapshot has them: the stage file turns them into the live text
of the 2026-11-02 snapshot, a second run changes nothing, the rollback puts both back exactly, and a second rollback changes nothing (9 of 9).
`python scripts/check_career.py` is clean at version 12.
**The phone, brought in step 2026-11-03** (sw `aap-v243`). Until then program.html still worked out a session's XP with one paid session per plan day per week and
moved neither Century nor Sessions with Amir for a repeat, so a second session of a plan day showed less than the server paid. Now `careerEarn()` pays the session while
the plan day was done fewer than `CAREER_SESSION_LIMIT` (2) times this week and holds the week with a spare (`careerWeekOf()`, `CAREER_SPARE_FROM`), `careerMoves()` moves
the session counts for every session, and `careerRecPaid()` / `careerPaidAtDone()` add 1 for every finish. `scripts/check_twins.js` holds the two constants to
`career/rulebook.toml` and `career_derive()`; `reward_cases.json`'s six repeat moves were worked out again from `movesRef()` in `rehearse_catalogue.mjs`, which says the same.
The phone reads an earlier session of the plan day as a full finish (the history it has does not say early), so after an early finish the card can say less than the server
pays; the server's answer puts it right. `scripts/headless/career.js` checks the second, the third and the spare on the finish card.
**The way back:** `scripts/career/rollback_stage106.sql`, on Amir's word only. It does not undo version 12's limit 2; that would be a new rulebook version (D20).
