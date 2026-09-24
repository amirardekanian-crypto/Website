---
name: program-edit
description: Review and edit an athlete's program JSON — apply Amir's coaching principles before touching any sets/reps. Use when Amir asks to review, change, or fix a program, or after /program-design produces a draft.
---

> ## ⚠️ Programmes live on the SERVER, not in files
> `data/*.json` is deleted, gitignored and 404 on the live site. The authoritative
> copy of every programme is a row in `public.programs` on Supabase.
>
> **To read one:** query it through the Supabase MCP —
> `select data from programs where athlete_id = '<id>';`
> A `data/<id>.json` on this PC is a local scratch copy and may be stale the moment
> Amir edits anything in the dashboard. Never trust it over the table.
>
> **To write one:** ⚠️ **corrected 2026-09-19 — do not hand Amir a publish step.** He is the
> coach of record, not a deployment stage; asking him to click Publish for work he has already
> approved just adds a hop where the change sits unshipped. *(Amir, 2026-09-07, verbatim: "go
> live, we dont use json files anymore, upload to the servers.")* **Once he approves, write it
> to `public.programs` yourself through the Supabase MCP and report it live.** Amir's inline
> dashboard editor still exists and he may use it whenever he likes — that is why you verify
> the row against local scratch before editing (Step 0b.3), not a reason to wait for him.
> A **new cycle** ships via /program-assemble Step 7; a change **inside the live cycle** ships
> via **Step 0b** below. `data/<id>.json` stays local scratch you lint and diff against, never
> the deliverable, and never committed.
>
> **The coaching log is on the server too** — `public.coaching_logs`, coach-only.
> It is no longer `.claude/coaching-log/<id>.md`, which was tracked in a public repo.


# Program Edit — AA Performance

Review a program JSON against Amir's coaching principles, flag issues, then apply agreed changes.

## Step 0 — Read principles, then the file

1. Read **`.claude/COACHING-PRINCIPLES.md`** first — it is the single source of truth for naming, exercise selection, structure, dosing, etc. The rules below are the *editing audit checklist* (the lens for reviewing an existing program); where a rule here overlaps a principle, **the principles file wins** — never let this skill drift from it.
2. Read the programme from the server (`select data from programs where athlete_id = '<athlete_id>';`). Identify which cycle is active (`currentCycleIndex`) and focus on that cycle's workouts. Also skim the coaching log (`select body from coaching_logs where athlete_id = '<athlete_id>';`) for this cycle's rationale, so edits respect *why* each piece was chosen.

## Step 0b — Mid-cycle adjustment: the process

Use this whenever the change lands **inside the cycle the athlete is currently training** — a
session report, an injury, a scan result, a stall. It is a different operation from a cycle
build, and the differences are the part that bites. *(Written 2026-09-19 from a live mid-cycle edit driven by a new clinical finding. The athlete's
reasoning stays in her log on the server; only the transferable process is here.)*

1. **Pull the evidence before proposing anything.** `select ... from session_history where
   athlete_id = '<id>' and completed_on >= '<date of the last edit>'`. Mid-cycle changes are
   report-driven (COACHING-PRINCIPLES → Progression, 2026-07-12), and the sessions since the
   last edit routinely change the recommendation. They tell you whether the last edit actually
   worked, and they surface what nobody reported: an exercise quietly skipped twice, a capped
   RPE being overshot, a rep count she reduced herself. **Never design the adjustment off the
   conversation alone** — Amir is reporting what he has been told, not what the log holds.

2. **Check where you are in the cycle.** `cycles[currentCycleIndex].endDate` against today. If
   only a session or two remain, the value is in the NEXT design, not a live rewrite — keep the
   live edit surgical and put the reasoning into the log, where the next build reads it.

3. **Verify the live row against the local scratch BEFORE editing.** `data/<id>.json` is
   gitignored scratch and can drift from `public.programs` the moment Amir edits in the
   dashboard. Fingerprint first — per-exercise `md5(note)` + length walked days → blocks →
   exercises — and only then treat the local file as a safe base. Skip this and a later
   whole-object write silently reverts his dashboard edit.

4. **Patch PATHS, never the whole object.** Chain
   `jsonb_set(data, '{workouts,days,N,blocks,N,exercises,N,note}', $tag$…$tag$::jsonb)` — one
   path per thing you actually changed, so anything you did not author survives. **Do NOT derive
   `programHistory` and do NOT bump `currentCycleIndex`**: those belong to the new-cycle path in
   /program-assemble Step 7 and are wrong here, because the cycle is not advancing. Dollar-quote
   every payload — athlete-facing copy is full of apostrophes.

5. **Sweep the whole cycle for EXPIRED language.** This is the failure mode unique to mid-cycle
   work, and nothing else catches it. Any relative-time or dated phrase written into an exercise
   `note` or a notes card goes stale silently, because nobody ever re-reads it — *"no jump this
   week or next"*, *"book it by <a date that has now passed>"*, *"for the next two sessions"*. Both of
   those examples were live and wrong in a real athlete's file by the time the next edit came
   round, and the first had quietly turned into permission to add load. So: grep the active cycle for dates and
   relative-time phrases on **every** mid-cycle pass, not just the exercises you came to change.
   And prefer wording that expires into a coach decision (*"this holds until we build the next
   block"*) over wording that expires into silence.

6. **Verify with the content fingerprint**, not a row count — reuse the method in
   /program-assemble Step 7 ("Verify with a CONTENT FINGERPRINT"), and assert the `athlete`
   block is unchanged after every write. The version trigger snapshots the prior state into
   `program_versions` on its own; do not hand-roll a backup.

7. **Log it — and mind what append-only means for a recommendation that is now WRONG.** The
   Exercise Ledger is mutated in place; cycle sections are append-only. So when an existing
   section carries a forward plan the new information invalidates — it has happened: one athlete's
   C4 entry recommended a specific exercise for the C5 build in two separate places, and a later
   finding inverted it — you do **not** edit it out. Three moves instead: set that exercise's **ledger status** so the next
   design cannot pick it up, write an explicit **override** in the new entry naming what it
   overrides and where, and leave the original reasoning untouched on the record. A ban that
   lives only in prose gets missed; a ban that lives only in the ledger loses the why.
   **Heading convention:** follow whatever the athlete's log already uses — existing files carry
   both `## In-cycle edits — Cycle N` and
   `## Cycle NN — MID-CYCLE ADJUSTMENT · <date> · <reason>`.

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
- Small muscles (biceps, triceps): 6–12 sets/week. **Shoulder is ONE muscle group on the 10–20 range** — see COACHING-PRINCIPLES.md
- Core: count every set regardless of where it sits — activation circuit rounds count as sets just like Primary/Accessory block sets

**⚖️ COUNT EVERY EXERCISE THAT LOADS THE MUSCLE, NOT JUST THE ISOLATION WORK.** An RDL is
hamstring volume; a row is back volume and half a set of biceps. Scoring isolation-only makes a
well-trained muscle read under-dosed and then contorts the programme around a number that was
never true. **1.0** prime mover · **0.5** significant synergist or prime mover in a shortened /
partial range · **0** stabiliser. Warm-up and activation circuits don't count (except core).
Full convention + the worked example: COACHING-PRINCIPLES.md → "Volume & dosing".

Flag anything very low (chest at 3 sets) **or over the ceiling** — the fractional count surfaces
over-dosing that a direct-only count hides. A missing machine is never a reason to bend the
programme: clear the 10-set floor with what the gym has.

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

VOLUME — per-exercise contribution (the working)
| Day | Exercise            | Sets | Counts toward                    |
|-----|---------------------|------|----------------------------------|
| D2  | Barbell Hip Thrust  | 4    | Glutes 4, Hamstrings 2 (x0.5)    |
| D3  | DB Romanian Deadlift| 4    | Hamstrings 4, Glutes 2 (x0.5)    |
...

VOLUME — per muscle / week
| Muscle     | Sets | Goal  | Verdict |
|------------|------|-------|---------|
| Glutes     | 22   | 10-20 | OVER    |
| Hamstrings | 14.5 | 10-20 | in range|
| Chest      | 3    | 10-20 | under (deliberate — posture) |
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

**Cues are not edited on a card any more** (2026-09-24). Each exercise's cues are its Spine entry's
and every athlete sees the same three. A cue change that would help anyone is an edit to the entry
(coach.html → Exercises). A point about this athlete only is the exercise's `note` (Coach's Note),
one sentence. Never add or change `cues` on a programme card.

Edit the programme JSON using precise string matches, block by block — never rewrite the whole thing. Then either hand it to Amir to publish from coach.html, or apply it with an `update programs set data = ...` through the Supabase MCP.

After editing, re-tally the set counts to confirm the numbers match what was agreed.

## Step 4 — Confirm

Report what changed, the updated set tally, and flag anything left for a future session.

**Then log the change.** Append a dated in-cycle note under an `## In-cycle edits — Cycle N`
heading — what changed + why (e.g. *In-cycle edit (2026-06-28): Bulgarian Split Squat → Split
Squat — R-knee pain on BSS*). This keeps the coaching log the complete running record (design
rationale + in-cycle adaptations) that the next /program-design reads, so a swap-for-pain isn't
silently reversed next cycle. **Append-only** — never edit a prior cycle's section. The one
living exception is the **Exercise Ledger** at the top: an exercise you added or removed must
have its row updated (status, last cycle, and *why*), or the next cycle's design reads a roster
that no longer exists.

⚠️ **The log is `public.coaching_logs`, not a file** — see the banner at the top of this skill.
Update the local `.claude/coaching-log/<id>.md` scratch copy too, then push and verify with
`md5(body)`; both sides are plain text so a straight hash comparison IS valid here (normalise
CRLF → LF first — the local file has Windows line endings and the row does not).

**⚖️ If the edit changed ANY set count, the new tables go in the log** — both of them,
per-exercise and per-muscle, per Rule 4a. Amir asked for this explicitly (2026-09-08: *"i want
her set count table in her coaching log … whenever you calculate the sets, add that table to the
athlete coaching log so i can see"*). A tally that only ever appears in chat is gone by the next
session, and the next /program-design then re-derives it from scratch — which is exactly how a
wrong counting convention survived three cycles.
