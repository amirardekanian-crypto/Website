---
name: program-assemble
description: Mechanically assemble a designed program + engagement text + roadmap into a valid data/<id>.json, then validate it. Use after /program-design and /program-engage, or when Amir says "build the json", "assemble", "write her file", "ship it". Handles cycle advancement (archive prior cycle, bump currentCycleIndex) for returning athletes and fresh-file creation for new ones. This is the mechanical step — it keeps formatting/JSON work out of the design pass.
---

# Assembler — write + validate (mechanical)

Turn the **program spec** (/program-design) and the **engagement text** (/program-engage)
into a valid `data/<id>.json` that matches `SCHEMA.md`. This stage is deterministic
plumbing — it makes no coaching decisions. Read `SCHEMA.md` first if unsure of a field.

## Step 1 — Detect new vs returning
- `data/<id>.json` exists with prior `workouts` → **RETURNING**.
- No file → **NEW**.

## Step 2 — Build the JSON
Map the spec into the schema shape:
- `workouts.label` = `Program 0N · <Cycle Name>`; `workouts.days[]` from the spec
  (each exercise → `type` + `chips[]` {label, style?} + `cues` {good:[ext,int], bad:[avoid]}
  + `restSec`; circuits → `rounds` + `items[]`).
- Apply the chip→field mapping: ext+int → `cues.good[]`, avoid → `cues.bad[]`.
- `completionTitle` / `completionMessage` per day from /program-engage PART 4.
- `cycles[currentCycleIndex].message` = PART 1 message + outcomes; next cycle's
  `teaser` = PART 2. Leave `videoUrl: null` (auto-resolved by name downstream).

**RETURNING — advance the cycle (per SCHEMA.md "Advancing to the Next Cycle"):**
1. Move the OLD `workouts` into `programHistory` in the simplified
   `{label, subtitle, days:[{label, focus, exercises:[{name, detail}]}]}` shape.
2. Replace `workouts.days` with the new cycle.
3. **Increment `currentCycleIndex` by 1.**
4. Keep `athlete.key` byte-for-byte unchanged.

**NEW — create the file:**
- Full skeleton, `currentCycleIndex: 0`, `cycles[]` from the locked roadmap, the key
  from /athlete-intake (and confirm the `athlete_keys` row exists).

## Step 3 — Validate (do not skip)
- `node -e "JSON.parse(require('fs').readFileSync('data/<id>.json','utf8')); console.log('valid')"`
- Confirm `athlete.id`, `athlete.key` (length 32, unchanged), `currentCycleIndex`,
  day count, and exercise count print as expected.
- **Format lint** against /program-design rules: every `standard` has sets·reps·tempo·
  RPE·restSec; ballistic/carry correctly OMIT tempo and carry a `max intent` chip;
  chip order = dark → yellow set count → grey; every exercise has exactly 3 cues
  (ext+int in good, avoid in bad).
- **Naming** (see COACHING-PRINCIPLES.md › Exercise naming): names are
  `[modification] [equipment] [movement]`, bodyweight bare; grip / intent / holds live
  in chips, never the name. Don't strip digits from established library names (45°, 90/90).
- **Name ↔ library check (catches dead video links):** every exercise name is the video
  join key — it must resolve in `exercise_library.json`. Run the snippet below: it matches
  exact, then normalized (case/punctuation/accents, mirroring the app resolver). For any
  **MISS**, rename to the suggested canonical key before ship. For a name that resolves but
  whose library URL is **empty (GAP)**, keep the name and flag it to Amir as a Notion
  content gap (the video gets added there, not here).
  ```
  node -e "const fs=require('fs');const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g,'').replace(/'/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();const lib=JSON.parse(fs.readFileSync('exercise_library.json','utf8'));const N={};for(const k of Object.keys(lib)){const n=norm(k);if(!(n in N))N[n]=k;}const d=JSON.parse(fs.readFileSync('data/<id>.json','utf8'));const seen=new Set();for(const day of d.workouts.days)for(const b of day.blocks)for(const e of b.exercises)for(const it of (e.items||[e])){const nm=it.name;if(!nm||seen.has(nm))continue;seen.add(nm);if(nm in lib){if(!lib[nm])console.log('GAP   '+nm+'  (in library, no video — add in Notion)');}else{const c=N[norm(nm)];console.log('MISS  '+nm+(c?'  -> rename to: '+c:'  -> no library match'));}}console.log('checked '+seen.size+' names');"
  ```
- Report any violation and fix before finishing.

## Step 4 — Ship
- Summarise the diff (cycle advanced N→N+1, days, swaps).
- Commit + push **only if Amir asks**. End commit messages with the project's
  Co-Authored-By line.

## Don'ts
- Don't change any prescription — you assemble, you don't design.
- Don't regenerate `athlete.key`; reuse across all of an athlete's cycles.
- Don't write athlete chat/health detail into the JSON or repo.
