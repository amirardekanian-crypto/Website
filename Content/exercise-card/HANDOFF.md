# Exercise card: four layers — handoff (2026-10-11)

Amir approved every recommended answer in the Exercise Card Blueprint
(`Content/exercise-card/blueprint.html`, also claude.ai/artifact/HR2fYTMcn4bp5q8NbqjtmP):
"all recommended, go ahead".

## The decision in one paragraph
Each exercise gets four layers, each with one job, nothing said twice.
1. **Steps** (new Spine column `exercises.steps text[]`): 3–5 plain one-phase steps for anyone, enough with no video
   (2–3 for mobility/conditioning, up to 6 for rack lifts).
2. **3 cues** (Spine): key point · feel (muscle/armour/movement entries) or position check (power/speed/strength…) ·
   one avoid written fault-then-fix ("Knee falling inward. Keep it over your second toe.").
3. **Pill** (card `intent`): from a closed list (hands, lead, intent, hold, brakes, pace), at most two, one per group.
4. **Coach's Note** (card): 1–3 sentences about this athlete only. No how-to, no "add weight when" (PRG-3).
App: steps inside How to do it; ▶ only with a video; the Spine's cues win over a card's own cues (old programmes and
Library sessions too). The full spec, the 13 answers, the draft rule lines and the 12 tested pilot entries are in the blueprint.

## State of this branch
The last commit is **WORK IN PROGRESS, NOT REVIEWED, NOT TESTED as a whole**. A build run was stopped part way
(Amir moved to his PC). It touched:
- Rules and skills: `.claude/COACHING-PRINCIPLES*.md`, the six pipeline skills, `SCHEMA.md`, `scripts/check_program.py`
  (+ tests), `scripts/check_parity.py`.
- Server and coach: `supabase/stage52_spine_steps.sql` (NOT applied to the database), tests, `coach.html`,
  `assets/js/chips.js`, `.claude/skills/spine/draft_sql.py`, the coach harness.
- App: `program.html`, `sw.js`, `scripts/headless/howto-steps.js`, `PROGRAM-APP.md`.
- Library: `workouts/**` had their own cues removed (the database copy `public.library` was NOT changed).

Nothing was written to Supabase. Nothing reached `main` or the live site.

## To finish
1. Review the WIP diff (`git diff main...`) and run every check: `python scripts/check_rule_index.py`,
   `python scripts/test_check_program.py`, `python scripts/check_parity.py`, `sh scripts/test_spine_sql.sh`,
   `node scripts/headless/coach/run.js`, `node scripts/check_twins.js`, `node scripts/check_rx.js`,
   `node scripts/headless/howto-steps.js` and the other headless checks, then the pre-commit hook.
2. Before the app change goes live: move the ~32 old card cue lines that are about one athlete (a side, home kit,
   a pain stop) into those cards' Coach's Notes, because "Spine cues win" hides old card cues.
3. Apply `stage52` to Supabase, sync `public.library` with the edited `workouts/**`, then ship to `main`.
4. Content: load the 12 pilot entries (final text in the blueprint, section 4; the squat gets a 6th bail step) as
   pending drafts in `exercise_coach.suggested_changes`, then the next 20 most-used no-video entries, for Amir to
   approve in coach.html.
