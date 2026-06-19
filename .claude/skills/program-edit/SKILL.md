---
name: program-edit
description: Review and edit an athlete's program JSON — apply Amir's coaching principles before touching any sets/reps. Use when Amir asks to review, change, or fix a program, or after /program-design produces a draft.
---

# Program Edit — AA Performance

Review a program JSON against Amir's coaching principles, flag issues, then apply agreed changes.

## Step 0 — Read principles, then the file

1. Read **`.claude/COACHING-PRINCIPLES.md`** first — it is the single source of truth for naming, exercise selection, structure, dosing, etc. The rules below are the *editing audit checklist* (the lens for reviewing an existing program); where a rule here overlaps a principle, **the principles file wins** — never let this skill drift from it.
2. Read `data/<athlete_id>.json`. Identify which cycle is active (`currentCycleIndex`) and focus on that cycle's workouts.

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
- Box step-ups as a loaded, logged lift in the **Primary** (or **Accessory**) block

### Rule 1b — No FRC-style isolation drills; use movements

Joint-isolation mobility drills do **not** belong in the prep circuit. Replace them with actual movements that mobilise + activate + micro-dose the day's pattern:

**Remove:**
- CARs (shoulder CARs, hip CARs — any "controlled articular rotation")
- Standing hip circles, leg circles, joint circles
- Any drill cued as "isolate the joint" / "biggest circle you can"

**Replace with a movement that fits the day:**
- Hip mobility → Reverse Lunge, Lateral Lunge, Cossack Squat, World's Greatest Stretch
- Shoulder mobility → Band Shoulder Pass-Through, Band Pull-Apart, Cat-Cow

The replacement should prime the patterns trained later that session. (Name it per COACHING-PRINCIPLES → "Exercise naming" — bare movement for bodyweight, etc.; don't restate the rule here.)

### Rule 1c — Warm-ups use gym equipment when the client has gym access

If the athlete trains in a gym, the Warm-Up block uses a cardio machine — Bike, Treadmill, or Rower (easy pace). **Never** "Walk", "March in Place", "Arm Swings", or other equipment-free filler for a gym-based client. Equipment-free warm-ups are only for home/bodyweight programs.

### Rule 1d — No corrective/postural drills without an indication

Postural or scap-control correctives (scapular wall slides, postural-specific work) only belong in when the athlete has a **noted** posture issue or restriction. For a general client with none, remove them — prep is mobilisation + activation of the day's patterns, not corrective theatre. General shoulder mobility/activation before pressing (band pull-apart, pass-through, cat-cow) is fine; it preps the lift, it doesn't "fix posture."

### Rule 2 — Core exercises go at the end

Core isolation work (dead bug, bird dog, plank variations, ab work, Pallof press, hollow body) must appear in the **Core block, after Primary/Accessory** (before any conditioning), never in the warm-up or prep circuit.

The only exception: an exercise doubles as activation AND core (e.g. dead bug as a breathing drill before a heavy hinge session) — flag it for Amir's judgement, don't auto-move it.

### Rule 3 — Gym session block order

Correct structure for a gym-based session — standard section names + order per SCHEMA "Standard section names" (the single source):

1. **Activation & Prep** — Warm-Up + prep, must total **10–15 minutes** (cardio raise + mobilisation/activation circuit). Never a token 5-min bookend — this is programmed dose that primes the session's patterns. Block `title` is always exactly "Activation & Prep"; the circuit `name` inside can be descriptive ("Glute Activation", etc.). Logs nothing — no RPE chip.
2. **[Power]** — if present (explosive/CNS work); free-named by content
3. **Primary** — the main lifts (progression drivers), compound first
4. **Accessory** — assistance / isolation work
5. **Core** — if prescribed, after Primary/Accessory
6. **[Conditioning]** — if present, always last; free-named by content

Never collapse Primary + Accessory into one "Strength" block.

### Rule 4 — Set / muscle review AND per-day load before changing load

Two tallies, both before touching any numbers and both shown to Amir for sign-off.

**4a. Weekly sets per muscle** — tally and present. Targets for a foundation/beginner cycle (adjust upward in later cycles):
- Large muscles (glutes, quads, hamstrings, back, chest): 10–20 sets/week
- Small muscles (shoulders, biceps, triceps): 6–12 sets/week
- Core: count every set regardless of where it sits — activation circuit rounds count as sets just like Primary/Accessory block sets

Flag anything very low (chest at 3 sets) or disproportionately high.

**4b. Per-day load distribution** — raw set count lies, so weight each working set by systemic cost (**heavy compound ×1.5, moderate compound ×1.0, isolation ×0.5**) and tally the cost-weighted load per day. Then check:
- Does each day have a deliberate **load identity**, and does the week **undulate** (one peak / one–two moderate / one low day) — or is it four flat "RPE 6, everything matters" days?
- Do two high-load days for the **same pattern** sit back-to-back (e.g. heavy hinge on consecutive days)?
- Is any day a **grind** (≫6 working exercises) — a long session spikes cortisol even at low RPE, which matters most for poor-recovery clients.

For low-sleep / high-stress athletes, **distribution is the primary lever — not total volume.** Present the cost-weighted table and a recommended undulation before proposing changes. See COACHING-PRINCIPLES.md → "Volume & dosing".

## Step 2 — Present the audit

Before editing anything, show:

1. Structural violations found (Rule 1–3)
2. Weekly set tally per muscle (Rule 4a)
3. Per-day cost-weighted load + recommended undulation (Rule 4b)
4. Proposed changes — list each one and ask for confirmation

Format:

```
STRUCTURAL
- Day 1 Movement Drills block: remove (forward skip, lateral step-touch — gym session)
- Day 3 core exercises (dead bug, bird dog) in prep circuit: move to end

VOLUME (per muscle / week)
| Muscle    | Sets |
|-----------|------|
| Glutes    | 19   |
| Quads     | 12   |
| Chest     | 3 ← low |
...

PER-DAY LOAD (cost-weighted)
| Day | Identity      | Sets | Weighted load | Peak RPE |
|-----|---------------|------|---------------|----------|
| 1   | Lower squat   | 15   | 16.5          | 6        |
| 2   | Upper         | 21   | 16.5 (grind)  | 6        |
| 4   | Glute (peak)  | 13   | 13.5          | 7        |
→ Recommend: 4 = peak, 1 = mod-high, 2 = moderate (trim), 3 = low day

PROPOSED CHANGES
1. Trim Day 2 from 7 → 5–6 exercises (cut the grind)
2. Lighten Day 3 (drop one heavy lower compound → genuine low day)
3. ...
```

Wait for Amir's go-ahead before touching the file.

## Step 3 — Apply edits

Edit `data/<athlete_id>.json` using precise string matches. Work block by block — never rewrite the whole file.

After editing, re-tally the set counts to confirm the numbers match what was agreed.

## Step 4 — Confirm

Report what changed, the updated set tally, and flag anything left for a future session.
