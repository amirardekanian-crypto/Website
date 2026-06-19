---
name: program-edit
description: Review and edit an athlete's program JSON — apply Amir's coaching principles before touching any sets/reps. Use when Amir asks to review, change, or fix a program, or after /program-design produces a draft.
---

# Program Edit — AA Performance

Review a program JSON against Amir's coaching principles, flag issues, then apply agreed changes.

## Step 0 — Read the file

Read `data/<athlete_id>.json`. Identify which cycle is active (`currentCycleIndex`) and focus on that cycle's workouts.

## Step 1 — Apply the structural checklist

Go through every day's blocks in order and flag any violation of the rules below. Present a summary to Amir before changing anything.

### Rule 1 — No movement drills in gym sessions

Athletic movement patterns do **not** belong in a gym-based fitness or strength session. Remove them entirely:

**Always remove from gym sessions:**
- Skips (forward skip, high-knee skip, A-skip, B-skip)
- Shuffles (lateral shuffle, defensive shuffle)
- Agility patterns (cone drills, T-drill, 5-10-5)
- Acceleration / sprint runs
- Step-touch drills, ladder drills
- Box step-ups used as a *drill* (a cue like "Movement Prep" or "movement drill" context)

These belong in **on-court sessions** (speed, acceleration, footwork) only — not in gym training.

**Fine to keep in gym sessions:**
- Bodyweight squats, lunges, glute bridges in a prep circuit — these serve as mobilisation + activation + micro-dosing of the main patterns
- Box step-ups as a **strength** exercise (loaded, logged, in the strength block)

### Rule 2 — Core exercises go at the end

Core isolation work (dead bug, bird dog, plank variations, ab work, Pallof press, hollow body) must appear in the **last block** of the session, never in the warm-up or prep circuit.

The only exception: an exercise doubles as activation AND core (e.g. dead bug as a breathing drill before a heavy hinge session) — flag it for Amir's judgement, don't auto-move it.

### Rule 3 — Gym session block order

Correct structure for a gym-based session:

1. **Warm-Up** — cardio machine (bike, treadmill, rower), 5 min, low intensity
2. **Activation & Prep** — bodyweight circuit: mobilisation + activation of the day's target muscles. The block `title` is always exactly "Activation & Prep". The circuit `name` inside can be descriptive and specific to the day's content — "Glute Activation", "Shoulder & Upper Back Prep", "Hip & Core Activation", etc.
3. **Strength** — all loaded work, compound before isolation
4. **Core** — if prescribed, always last

### Rule 4 — Set / muscle review before changing load

Before adjusting any sets, reps, or exercise selection, tally weekly sets per muscle group and present the summary to Amir. Don't change numbers without his sign-off.

Standard volume targets for a foundation/beginner cycle (adjust upward in later cycles):
- Large muscles (glutes, quads, hamstrings, back, chest): 10–20 sets/week
- Small muscles (shoulders, biceps, triceps): 6–12 sets/week
- Core: count every set of core work regardless of where it sits in the session — activation circuit rounds count as sets just like strength block sets do

Flag anything that looks very low (chest at 3 sets) or disproportionately high.

## Step 2 — Present the audit

Before editing anything, show:

1. Structural violations found (Rule 1–3)
2. Weekly set tally per muscle (Rule 4)
3. Proposed changes — list each one and ask for confirmation

Format:

```
STRUCTURAL
- Day 1 Movement Drills block: remove (forward skip, lateral step-touch — gym session)
- Day 3 core exercises (dead bug, bird dog) in prep circuit: move to end

VOLUME
| Muscle    | Sets |
|-----------|------|
| Glutes    | 19   |
| Quads     | 12   |
| Chest     | 3 ← low |
...

PROPOSED CHANGES
1. Remove movement drills from Days 1, 3, 4
2. Move dead bug + bird dog to Core block at end of Day 3
3. Add DB Chest Fly 3×15 RPE 5 to Day 3 (raises chest to 6 sets)
```

Wait for Amir's go-ahead before touching the file.

## Step 3 — Apply edits

Edit `data/<athlete_id>.json` using precise string matches. Work block by block — never rewrite the whole file.

After editing, re-tally the set counts to confirm the numbers match what was agreed.

## Step 4 — Confirm

Report what changed, the updated set tally, and flag anything left for a future session.
