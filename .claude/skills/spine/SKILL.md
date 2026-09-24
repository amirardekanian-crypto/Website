---
name: spine
description: Draft the next batch of exercises for The Spine (public.exercises), the one-record-per-exercise catalogue behind the ⓘ, the About sheet, Rungs and Library → Exercises. Use when Amir says "add the next 80 exercises", "draft more exercises", "fill the Spine", "add <exercise> to the Spine", or when /program-assemble finds a name the Spine does not have. Drafts only: Amir approves in coach.html → Exercises.
---

# The Spine: drafting the next batch

What the Spine is and why: `CLAUDE.md` → *The Spine*, `SCHEMA.md` → *`exId` and the Spine*,
`supabase/stage31_spine.sql`. This file is only **how to add entries**.

## The four rules

1. **Claude drafts, Amir approves.** Every row goes in as `status 'draft'`. Never set `approved`,
   and never write a flow that does. Nothing reaches a phone until he taps Approve.
2. **The coach-only half never enters this repo.** `sfr` and `flags` (restriction flags) live in
   `public.exercise_coach`. The repo is PUBLIC. Write the batch file in the **scratchpad**; only the
   SQL goes to the database.
3. **An entry's cues are THE cues, for every athlete** (Amir, 2026-09-24: *"the aim is to use these
   cues for all the exercises that everyone has from now on"*). Programmes stop carrying cues, so
   the entry is what every card shows. Exactly **2 good + 1 bad** (external, internal, avoid), and
   written for ANYONE: no athlete, no side ("the right shoulder"), no home kit ("sofa", "worktop",
   "table edge"), no tempo ("stick 2 sec", "the pause"), no dose ("stop 2 reps short"), no
   em-dashes. The generated SQL copies Amir's wording from the most recent live programme; keep
   his words and strip only what is about one person. What you strip belongs in THAT athlete's
   Coach's Note (`note`), not lost: list it for Amir with the athlete id. If no programme has
   cues for a name, write three general ones and say so, since the entry is where cues live now.
4. **Names are never rewritten.** A variant spelling that is really the same exercise becomes an
   `alias` on the existing entry, not a new entry and not an edit to any programme.

## The run

**1. Look at what is missing, most-used first.**
```sql
with top as (
  select p.athlete_id a, e from public.programs p, jsonb_array_elements(p.data->'workouts'->'days') d,
       jsonb_array_elements(d->'blocks') b, jsonb_array_elements(b->'exercises') e
  where p.athlete_id <> 'demo'),
flat as (   -- a plain exercise, or each exercise INSIDE a circuit (most prep work lives there)
  select a, lower(trim(e->>'name')) n, false inc from top where e->'items' is null
  union all
  select a, lower(trim(i->>'name')), true from top, jsonb_array_elements(e->'items') i
  where jsonb_typeof(e->'items') = 'array'),
known as (
  select lower(name) n from public.exercises
  union select lower(a) from public.exercises, unnest(aliases) a)
select n, count(*) uses, count(distinct a) athletes, bool_and(inc) only_in_circuits
from flat where n is not null and n not in (select n from known)
group by n order by athletes desc, uses desc limit 150;
```
⚠ **Read inside circuits.** Batch 1 used a query that only saw top-level exercises, so the
circuit's *title* ("Movement Prep") showed up as a missing name and the exercises inside it did
not. That hid the most-used names in the whole list: Banded Lateral Walk (22 athletes), 90/90 Hip
Switch (19), Cat-Cow and Ankle Dorsiflexion Rocks (15 each). `draft_sql.py` copies cues from
circuit items too.
Also `select id, name, aliases, pattern from public.exercises order by pattern, id;`. You need
the existing ids for the links, and they show you which names are only variants.

**2. Sort the list into three piles** before writing anything:
- **Alias:** the same exercise under another name, e.g. `cable wood chop` →
  `half-kneeling-cable-wood-chop`, or `Single-Leg RDL (BW)`. Add it with
  `update public.exercises set aliases = array_append(aliases, '<Name>') where id = '<id>';`.
  Only if it really is the same movement. If the stance or implement differs, it is a new entry.
- **New entry:** its own movement, worth a record.
- **Skip:** one-off drill names, a whole circuit's title, anything that is not an exercise. List
  these for Amir rather than silently dropping them.

**3. Write the batch** to `<scratchpad>/spine_batchN.json`, as a list of objects with these fields:
`id` (kebab-case, the name slugged), `name` (as programmes spell it), `aliases`, `pattern`,
`purpose`, `tennis`, `equipment`, `loads`, `easier`, `harder`, `alts` (ids), `qualities`, `sfr`, `flags`.
- **pattern:** one of the tool's `PATTERNS` (the same list as `SPINE_PATTERNS` in coach.html;
  sprints are `sprint-cod`, not `sprint`). Keep a new exercise inside an existing pattern
  wherever it fits, because Rungs are drawn per pattern.
- **purpose:** one sentence in Amir's voice (`COACHING-PRINCIPLES.md` → *Communication*). Say what
  it does for anyone, in plain words: short, no em-dashes, no textbook terms. It is general. The
  *why for this athlete* belongs to the programme, not to the entry.
- **tennis:** the court moment it serves, or `""` when there honestly isn't one. Do not stretch.
- **easier / harder / alts:** these draw the Rungs, so link only to ids that exist (in the Spine
  or in this batch). A rung you would like to have but nobody programmes can wait.
- **qualities:** the Quality Map (stage32). One to three of `strength · muscle · power · spring ·
  speed · brakes · rotation · engine · armour · movement`, **first = primary**: what the exercise is
  mostly FOR. A day card on Home counts working sets × (primary 1, secondary ½), so tag what it
  really trains and stop at three. A curl is `muscle`, not `muscle strength armour`. Warm-up drills
  still get tagged (`movement`), because prep blocks are skipped when a day is counted.
  For an entry Amir has already **approved**, never write `qualities` on it: put the suggestion in
  `exercise_coach.suggested_qualities`, and coach.html pre-fills his editor with it.
- **sfr:** 1 = best stimulus-to-fatigue in its pattern. Use `null` for prep, drills and plyos.
- **flags:** only from `FLAGS` in the tool (`loaded-knee-flexion`, `axial-load`, `free-hinge`,
  `overhead`, `high-impact`). If you need a new one, that is Amir's decision. Ask him first.

**4. Generate and check.**
Save the ids from `select id from public.exercises order by 1` to
`<scratchpad>/existing_ids.txt`, one per line. Then:
```
python3 .claude/skills/spine/draft_sql.py <scratchpad>/spine_batchN.json <scratchpad>/existing_ids.txt > <scratchpad>/spine_batchN.sql
```
The tool refuses the batch (exit 1, one line per problem) if it finds any of these: an id that
already exists, a link to an id that doesn't exist, an unknown pattern, flag or quality, a
self-link, or an entry with no qualities or more than three. Fix the problems and run it again. It picks up the video from `exercise_library.json`
by exact name.

**5. Run the SQL** with the Supabase MCP `execute_sql` (project `bvipfipbdcyqnbczjmaq`). It is
`on conflict do nothing`, so running it again is safe. Then check it:
```sql
select status, count(*), count(*) filter (where cues is null) no_cues,
       count(*) filter (where video is null) no_video from public.exercises group by 1;
```

**6. Tell Amir, in numbers:**
- how many drafts were added, how many aliases, and what you skipped and why;
- how many have no cues (he writes those) and how many have no video;
- that he approves them in **coach.html → Exercises → Drafts**, and that the list shows which
  athletes use each one.

## Batch size and order

About 80 is a good batch: two to three hours of his review. Go most-used first. After the first 75,
batch 2 (another 80, 2026-09-24) took the circuit exercises and every name used by two or more
athletes. What is left is a long tail used by one athlete each, plus walks, runs and circuit titles.
Say so, and offer to stop at the names that are used now.

## Learned the hard way

- *(2026-09-24, batch 1)* The seed script lived only in a scratchpad and was lost with the session,
  so the next batch had no instructions. The process is now this file, plus `draft_sql.py`, which
  holds no coach data.
- *(2026-09-24, batch 2)* Four fixes in `draft_sql.py`. It accepted `sprint`, which the apps do not
  know (`sprint-cod`). Its cue copy skipped circuit items. It counted an empty library link as a
  video. And it took any link, so a Notion page and a bare `youtube.com/...` with no scheme would
  have gone in as videos. It now takes YouTube links only, adds `https://`, and also looks a video
  up by the entry's aliases.
- *(2026-09-24, batch 2)* Copying the most recent programme's cues brings that ATHLETE's words with
  it: "Letting the **right** shoulder roll forward", "shoulders on a **sofa** edge", "grip the
  **table** edge", a tempo ("stick 2 sec", "loads in the pause") or a dose ("stop 2 reps short").
  38 entries were rewritten for anyone the same day (Amir's call). After every run, check:
  ```sql
  select id, cues from public.exercises
  where jsonb_array_length(cues->'good') <> 2 or jsonb_array_length(cues->'bad') <> 1
     or cues::text ~* '—|right (shoulder|knee|hip|side|leg)|left (shoulder|knee|hip|side|leg)|sofa|chair|worktop|table edge|cushion|\d+ ?sec|\mpause\M|reps short';
  ```
- *(2026-09-24, batch 2)* Check what the cues say before calling a name an alias. `Single-Leg RDL
  (BW)` has cues that say "a dumbbell in each hand", so it is an alias of the dumbbell entry. `Cable
  Wood Chop` says "turn through the hips", so it is a standing chop and needs its own entry, not an
  alias of the half-kneeling one (where the hips stay still).
