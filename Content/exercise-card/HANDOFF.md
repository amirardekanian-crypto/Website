# Exercise card: four layers — handoff (2026-10-11)

Amir approved every recommended answer in the Exercise Card Blueprint
(`Content/exercise-card/blueprint.html`, also claude.ai/artifact/HR2fYTMcn4bp5q8NbqjtmP):
"all recommended, go ahead".

## The decision in one paragraph
Each exercise gets four layers, each with one job, nothing said twice.
1. **Steps** (Spine column `exercises.steps text[]`, stage64): 3–5 plain one-phase steps for anyone, enough with no video
   (2–3 for mobility/conditioning, up to 6 for rack lifts).
2. **3 cues** (Spine): key point · feel (muscle/armour/movement entries) or position check (power/speed/strength…) ·
   one avoid written fault-then-fix ("Knee falling inward. Keep it over your second toe.").
3. **Pill** (card `intent`): from a closed list (hands, lead, intent, hold, brakes, pace), at most two, one per group.
4. **Coach's Note** (card): 1–3 sentences about this athlete only. No how-to, no "add weight when" (PRG-3).
App: steps inside How to do it; ▶ only with a video; the Spine's cues win over a card's own cues (old programmes and
Library sessions too). The full spec, the 13 answers, the rule lines and the 12 tested pilot entries are in the blueprint.

## What shipped (2026-10-11)
- **Rules and skills**: CUE-6 and CUE-7 added, CUE-1, CHP-2, NAM-5, NAM-7, COM-14 and SEL-11 reworded (with history);
  the six pipeline skills, `SCHEMA.md` (the pill list's one home), `check_program.py` (a pill off the list FAILs, the
  note and steps checks WARN), `check_parity.py` (the three pill-list copies), `draft_sql.py` (steps, plain words).
- **Server**: `supabase/stage64_spine_steps.sql` (stage52 on the WIP branch; main already had a stage52), applied after
  a rolled-back rehearsal on the live database (18 checks), because this PC has no local Postgres for
  `scripts/test_spine_sql.sh`. `get_exercises()` sends `steps`; `coach_save_spine()` writes `steps` and Claude's drafts
  list in one guarded call.
- **coach.html**: a How to do it box on each entry; Claude's drafts pre-filled and outlined (Save is the approval,
  Discard puts the entry's value back); a Claude's drafts filter; a pill picker in the ✎ editor.
- **program.html** (`sw.js` aap-v107): How to do it holds the video, You need, the steps and the cues; ▶ only with a
  video; the Spine's cues win on every card; a working circuit folds each item's steps; the About sheet opened whole
  shows How to do it above the body map; the in-app guide says so.
- **Q9 A's first step, done before the app change**: the old card cue lines about one athlete (a side, home kit, a pain
  stop, a depth or load limit) moved into Coach's Notes: 30 notes in 15 programmes. A circuit item's line went into its
  circuit's note with the item's name in front, since an item's own note is not drawn. 5 more lines were already said in
  the note and were left. Each programme was written once, so `program_versions` holds one restore point per programme.
- **Library**: the 42 sessions' own cues dropped in `workouts/**` and in `public.library` (every card with a Spine id;
  the 12 with none, breathing drills and warm-up sets, keep theirs). 42 of 42 rows equal their files by md5. Five rows
  still said "Bodyweight Squat" after the 10-10 rename to "Squat" (commit 2455515 changed only the files); fixed too.
- **The 12 pilot entries** wait as Claude's drafts (steps, cues, and the purpose where the blueprint wrote one) in
  coach.html → Exercises → Claude's drafts. Changes from the blueprint's text, each named in the draft's note: Lateral
  Step-Down and Dumbbell Single-Leg RDL get a position check as the second cue (their first quality is brakes and
  strength, CUE-1); Band Pull-Apart, Dead Bug and Glute Bridge get "Feel" in front of theirs; the squat has the 6th bail
  step; the Y-T Raise's step 3 says "elbows almost straight" (the plain-words list).

## Still open
- Amir reads and saves the 12 pilot drafts. Then the next 20 most-used no-video entries (Q11 A), then batches of ~40.
- Before the rest is written, a few athletes do the first batch with no video, and what they get wrong feeds the rule.
- `check_program.py`'s steps check is a WARN; it becomes a FAIL once the no-video entries are done (CUE-6).
- The course's Farsi steps (Q13 A), each read by Amir.
- Public copy still promises more video than exists: `etminan-en.html` ("Video for every exercise") and the carousel
  skill's claim table. Left for Amir (a public page, SITE-AUDIT rules). `Content/PRODUCT.md` and `HOW-IT-WORKS.md` were
  corrected.
