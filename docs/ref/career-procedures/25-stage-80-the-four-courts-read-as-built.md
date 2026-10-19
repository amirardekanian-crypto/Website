## Stage 80: the Four Courts read, as built (2026-10-19)

**APPLIED to the live project 2026-10-19** on Amir's word, *"yes, go live with Four Courts"* (migration `stage80_career_achievements_read`): the body
read back equal to the file's, anon cannot run it and authenticated can, it answers; the schema snapshot was remade (198 functions).

`supabase/stage80_career_achievements_read.sql` adds `get_achievements(p_athlete_id)`, the one read the Four Courts section in AA Performance draws
from (`PROGRAM-APP.md` → *Achievements, Four Courts*). get_awards()'s identity rule (the athlete's own; the coach's preview names one; the SQL editor
or the service role, a report). It returns every achievement the athlete can see (one with nothing left to earn it by, a retired one, a mission's,
a commendation's, is left out unless held; a free athlete sees the free ones), each with its kind, name, caption, rule, size, XP, the day it was
earned, and, when not earned, `have` and `need` from the same measures `career_evaluate()` reads (one `career_measures()` pass): a count of `at`
(a capped kind as paid), the CURRENT run of held weeks of `at`, Proof's measure, the best lift gain, goals met, this month's held weeks of the weeks
ending in it (0 and `spoilt` once one has ended unheld), else 0 of 1. `next` leads the section: the furthest along among those with progress,
then the nearest to done; with no progress anywhere, never a resilience one (nobody aims to miss a week), then consistency first, the smallest
size, the least XP. It writes nothing and pays nothing.

- **Measured on the live data** (a rolled-back dry run, 2026-10-19): about 0.3 s an athlete; Next up came out as Straight Talk 24/25, Half Year 5/6,
  Back to Back 1/2, Double Up 84/100, Season Ticket 2/3, and Held for an athlete with nothing yet.
- **Rehearsed** in `scripts/career/rehearse_achievements.mjs` section 8 (52 checks in all).
- **The app goes first and is safe without it:** program.html asks for it beside the moments; until stage80 is applied the call fails and the section
  is simply not drawn.
- **Applied** as above; the one thing no test can do is open Progress on a real login (signing in as an athlete signs out their phones),
  so the first real look is Amir's own phone.
- **The way back**: `scripts/career/rollback_stage80.sql` (drops the function; the section disappears).

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
