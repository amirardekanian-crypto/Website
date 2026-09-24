---
name: spine
description: Draft the next batch of exercises for The Spine (public.exercises), the one-record-per-exercise catalogue behind the ⓘ, the About sheet (Regressions · Progressions · Alternatives) and Library → Exercises. Use when Amir says "add the next 80 exercises", "draft more exercises", "fill the Spine", "add <exercise> to the Spine", or when /program-assemble finds a name the Spine does not have. Drafts only: Amir approves in coach.html → Exercises. Also the Upkeep pass that ends every /program-assemble, /program-edit and /workout run: draft missing exercises, fill empty fields, propose updates.
---

# The Spine: drafting the next batch

What the Spine is and why: `CLAUDE.md` → *The Spine*, `SCHEMA.md` → *`exId` and the Spine*,
`supabase/stage31_spine.sql`. This file is only **how to add entries**.

## The four rules

1. **Claude drafts, Amir approves** (he can also tell Claude to approve, as he did on 2026-09-24:
   *"approve all when youre done"*, 212 entries). Every row goes in as `status 'draft'`. Never set `approved`,
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
  wherever it fits, so Library → Exercises groups it with its family.
- **purpose:** one sentence in Amir's voice (`COACHING-PRINCIPLES.md` → *Communication*). Say what
  it does for anyone, in plain words: short, no em-dashes, no textbook terms. It is general. The
  *why for this athlete* belongs to the programme, not to the entry.
- **tennis:** the court moment it serves, or `""` when there honestly isn't one. Do not stretch.
- **easier / harder / alts** are shown to athletes as **Regressions**, **Progressions** and
  **Alternatives** (Amir, 2026-09-24; the old Rungs ladder is gone for good: *"too much
  information, even im mixed up"*). Keep the three meanings strict:
  - `easier` = a REAL regression: the **same movement** made easier (less range, more support,
    bilateral, lighter implement). Split squat → supported split squat, not split squat → leg press.
  - `harder` = a REAL progression: the **same movement** made harder (more range, less support,
    single-leg, more load or speed). Split squat → front-foot-elevated → Bulgarian.
  - `alts` = **the same movement on other equipment or a machine**: DB bench ↔ barbell bench ↔
    machine chest press, lying ↔ seated leg curl. It is the swap when a gym lacks the kit, not
    "another exercise that also trains the legs".
  **Link by id when the exercise has an entry (in the Spine or in this batch); otherwise write its
  plain name** (Amir, 2026-09-24: *"if we already have it, link it, if not, just put the name"*),
  in Title Case as a coach would say it (`Nordic Hamstring Curl`, never `nordic-hamstring-curl`:
  an id-shaped item must exist or the tool refuses it). Check the name is not an existing entry's
  name or alias first. The athlete sees a name as a quiet pill with nothing to tap until an entry
  with that name is approved, and then it links on its own. Link ids both ways (a progression's
  entry lists this one as a regression); a name has no other side. Keep each list to about four,
  closest steps first, and leave a list empty rather than stretch it.
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

## Upkeep: the end of EVERY programme write (Amir, 2026-09-24)

Amir: *"when i write or update a program, and there are movements that are not there, or missing
some info, or can be updated, it should be updated there at the end … so everytime i write a
program for an athlete, this gets more complete."* So the last step of `/program-assemble`,
`/program-edit` and `/workout` is this pass, run on the exercises that programme just used.
The Spine grows as a side effect of coaching, not in big batches.

**1. List the gaps for this athlete's programme** (a standalone exercise or a circuit item alike):
```sql
with ex as (
  select distinct coalesce(i->>'name', e->>'name') nm, coalesce(i->>'exId', e->>'exId') exid,
         coalesce(i->>'videoUrl', e->>'videoUrl') vid
  from public.programs p, jsonb_array_elements(p.data->'workouts'->'days') d,
       jsonb_array_elements(d->'blocks') b, jsonb_array_elements(b->'exercises') e
       left join lateral jsonb_array_elements(case when jsonb_typeof(e->'items') = 'array'
                 then e->'items' else '[]' end) i on true
  where p.athlete_id = '<id>' and not (e ? 'items' and i is null)),
hit as (
  select ex.*, x.id, x.status, x.aliases, x.video, x.cues, x.purpose, x.tennis, x.equipment,
         x.loads, x.easier, x.harder, x.alts, x.qualities, c.sfr, c.flags, c.suggested_qualities
  from ex left join public.exercises x
    on x.id = ex.exid or lower(x.name) = lower(ex.nm)
       or lower(ex.nm) = any(select lower(a) from unnest(x.aliases) a)
  left join public.exercise_coach c on c.id = x.id)
select nm, id, status,
  case when id is null then 'NO ENTRY' end missing,
  array_remove(array[
    case when id is not null and lower(nm) <> lower((select name from public.exercises where id = hit.id))
          and not lower(nm) = any(select lower(a) from unnest(aliases) a) then 'alias' end,
    case when video is null and vid is not null then 'video (card has one)' end,
    case when video is null and vid is null then 'video' end,
    case when cues is null then 'cues' end,
    case when coalesce(tennis, '') = '' then 'tennis?' end,
    case when cardinality(equipment) = 0 then 'equipment' end,
    case when cardinality(loads) = 0 then 'loads' end,
    case when cardinality(easier) + cardinality(harder) + cardinality(alts) = 0 then 'links' end,
    case when id is not null and cardinality(qualities) = 0 and cardinality(coalesce(suggested_qualities, '{}')) = 0 then 'qualities' end,
    case when id is not null and exid is null then 'exId on the card' end,
    case when id is not null and sfr is null then 'sfr?' end], null) gaps
from hit order by (id is null) desc, status, nm;
```
`tennis?` and `sfr?` are questions, not errors: a warm-up drill honestly has no court moment and
no SFR. Answer them once and they stop mattering.

**2. Fix what you can, by what kind of entry it is:**
| | A **draft** entry | An **approved** entry (athletes see it) |
|---|---|---|
| **No entry at all** | Draft it now with `draft_sql.py` (the whole Run above, for one or a few names) | — |
| **Empty field** (video, alias, equipment, loads, a regression/progression/alternative, SFR, flags) | Fill it | Fill it. Adding what was missing changes nothing an athlete already reads |
| **No qualities** (the Quality Map) | Fill `qualities` (first = primary, max 3) | **Don't write them.** Put them in `exercise_coach.suggested_qualities`: coach.html pre-fills his editor with them, and they reach phones only when he saves |
| **A field that has content** (cues, purpose, tennis) | Improve it | **Don't change it. Propose it** to Amir in the handoff, with the old and the new wording |
- **Video:** the card's `videoUrl` wins when the entry has none (YouTube only, as `draft_sql.py`).
- **Alias:** the programme's spelling goes on the entry (rule 4). Never rename the card.
- **exId on the card:** a programme exercise that resolves to an entry but has no `exId` gets one
  (on the programme row, beside the name; never rename). It is what makes the link survive a rename.
- **Qualities:** tag what the exercise is mostly FOR, first = primary, stop at three. A new
  exercise without qualities makes its day card go blank (under 70% tagged shows nothing), so this
  is never optional.
- **Links:** an id when the entry exists, a plain name when it doesn't, by the strict meanings in
  the Run above. A new exercise that is a progression of an existing one gets linked from both
  sides (`harder` on the old, `easier` on the new); an alternative goes in `alts` on both. On an
  approved entry, adding a missing link is filling a gap; changing or removing one is a proposal.
- **A name that just got its own entry:** when you draft an exercise that other entries already
  list by NAME, swap the name for the new id on each of them (same list, same place) and mirror
  it. Find them with
  `select id from public.exercises, unnest(easier || harder || alts) l where lower(l) = lower('<Name>');`.
  The app would resolve the name anyway, but only an id gets the link on the other side.
- **What this programme taught us counts as "can be updated":** a better general cue Amir wrote
  or approved while designing (design's `spine_cue:` lines), a new restriction flag the athlete's
  picture showed was missing, an SFR order Amir overruled at the checkpoint. On a draft, apply
  it. On an approved entry, propose it.
- **Never approve, never move anything athlete-specific onto an entry.** Athlete detail is the
  Coach's Note.
- Every write sets `updated_by = 'claude-pipeline'` and `updated_at = now()`.

**3. Report it in one block at the end of the handoff** (`/program-assemble` Step 6):
`SPINE — added 2 drafts (names) · filled 5 gaps (what) · tagged qualities on 3 (2 as suggestions on
approved entries) · linked 2 (regressions/progressions/alternatives) · 3 proposals for you (entry: old → new) ·
N entries this programme uses are still drafts, approve them in coach.html → Exercises.`

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
- *(2026-09-24, batch 3)* The last 77 names (57 entries + 20 aliases) closed the list: every exercise
  name in every live programme resolves, 212 entries, and Amir had them all approved the same day.
  Copied cues were too dirty for this tail (heart rates, RPEs, "four full seconds", "on the mat"),
  so the batch carried its own: `draft_sql.py` now takes a `cues` field (checked for 2 + 1 and no
  em-dash) and only copies from a programme when the batch has none. One library video was plainly
  wrong (Half-Kneeling Cable Thoracic Rotation had Single-Leg Balance's link) and was left empty; 61
  entries still have no video. From here the Spine grows through **Upkeep**, not batches.
- *(2026-09-24, links by name, stage34/35)* Three traps, all caught before they reached a phone:
  1. **A name link must not resolve to its own entry.** The resolver drops the word "machine" and
     ignores word order, so "Machine Dip" on Dip's Alternatives read as "Dip" and vanished. Check
     every new name through the four tiers (the `pg_temp.vars()` query in stage34's session, or
     `exNameVariants()` in program.html), not just an exact `lower(name)` match.
  2. **Mirroring copies mistakes.** Before making id links two-sided, read the one-sided ones: four
     were wrong (Hollow Hold <- Dead Bug and the like) and mirroring would have put each on a
     second entry. Hold those back and propose them instead.
  3. **Check a programme before removing an alias.** "Single-Leg Bound" on Lateral Bound looked like
     a trap for a forward bound, but the one card using it was a lateral bound, so removing it would
     have cut that card off its cues. `select … where lower(e->>'name') = '<alias>'` first.
