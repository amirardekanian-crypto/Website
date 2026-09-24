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
3. **Cues are Amir's words, not mine.** The generated SQL copies them from the most recent live
   programme that uses the name. If no programme has cues for it, leave cues empty for him to
   write in coach.html. Do not invent cues.
4. **Names are never rewritten.** A variant spelling that is really the same exercise becomes an
   `alias` on the existing entry, not a new entry and not an edit to any programme.

## The run

**1. Look at what is missing, most-used first.**
```sql
with used as (
  select lower(trim(e->>'name')) n, count(*) uses, count(distinct p.athlete_id) athletes
  from public.programs p, jsonb_array_elements(p.data->'workouts'->'days') d,
       jsonb_array_elements(d->'blocks') b, jsonb_array_elements(b->'exercises') e
  where p.athlete_id <> 'demo' and e->>'name' is not null
  group by 1),
known as (
  select lower(name) n from public.exercises
  union select lower(a) from public.exercises, unnest(aliases) a)
select n, uses, athletes from used where n not in (select n from known)
order by athletes desc, uses desc limit 100;
```
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
`purpose`, `tennis`, `equipment`, `loads`, `easier`, `harder`, `alts` (ids), `sfr`, `flags`.
- **pattern:** one of the tool's `PATTERNS`. Keep a new exercise inside an existing pattern
  wherever it fits, because Rungs are drawn per pattern.
- **purpose:** one sentence in Amir's voice (`COACHING-PRINCIPLES.md` → *Communication*). Say what
  it does for anyone, in plain words: short, no em-dashes, no textbook terms. It is general. The
  *why for this athlete* belongs to the programme, not to the entry.
- **tennis:** the court moment it serves, or `""` when there honestly isn't one. Do not stretch.
- **easier / harder / alts:** these draw the Rungs, so link only to ids that exist (in the Spine
  or in this batch). A rung you would like to have but nobody programmes can wait.
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
already exists, a link to an id that doesn't exist, an unknown pattern or flag, or a
self-link. Fix the problems and run it again. It picks up the video from `exercise_library.json`
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
the rest of the list is a long tail (as of 2026-09-24, every missing name is used by at most two
athletes), so later batches cover fewer athletes per entry. Say so, and offer to stop at the names
that are used now.

## Learned the hard way

- *(2026-09-24, batch 1)* The seed script lived only in a scratchpad and was lost with the session,
  so the next batch had no instructions. The process is now this file, plus `draft_sql.py`, which
  holds no coach data.
