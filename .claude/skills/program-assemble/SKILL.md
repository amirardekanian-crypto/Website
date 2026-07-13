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
This stage owns ALL serialization the design spec deliberately left out — chips, section
titles/icons, the vivid `focusTag`, names. The spec gives you decisions; you render them.

**2a — Structure.** `workouts.label` = `Program 0N · <Cycle Name>`; `workouts.days[]` from
the spec. Each exercise → `type` + `chips[]` + `cues` {good:[ext,int], bad:[avoid]} +
`restSec`; circuits → `rounds` + `items[]`. Map cues: ext+int → `cues.good[]`, avoid →
`cues.bad[]`. `sport.badge` ← design's `SPORT_BADGE` line. `completionTitle`/
`completionMessage` per day from /program-engage PART 4; `cycles[currentCycleIndex].message`
= PART 1 message + outcomes; next cycle's `teaser` = PART 2. Leave `videoUrl: null`
(auto-resolved by name downstream).
- **Set `type` from the design category** (the spec never emits it): standard grinding lift
  / ballistic / loaded carry → `"standard"`; working or prep circuit → `"circuit"`; warm-up
  `simple` item (bike, mobility drill) → `"simple"`.
- **Copy the spec's exercise `note` verbatim** to that exercise's `note` field (any type) —
  the app renders it as the clay "Coach's Note" (per SCHEMA "Exercise coach's note"). Never
  move exercise-scoped guidance into the notes cards, and never invent a note the spec
  didn't give.

**2b — Render chips from the spec's plain dose fields** (per SCHEMA "Chip parsing"):
- set count → `{label:"N Sets", style:"yellow"}` (first; one per standard exercise)
- reps/duration/distance → ONE `×`-prefixed grey chip (`"×8"`, `"×10 Each Side"`,
  `"×30s Each Side"`, `"×40m"`) — embed side/leg info in that same chip, never a separate
  `"Each Side"` chip
- tempo → `"Tempo 3-0-1-0"`; RPE → `"RPE N"` (grey)
- `intent` → a green modifier chip `{style:"dark"}` (`3s eccentric`, `glute focus`,
  `superset`, `max intent`, `2s hold`); ≤4 words, lowercase; **never a rep/dose count here**
- Chip order: green modifier(s) → yellow set count → grey stats. Carve-outs: ballistic/carry
  omit tempo; warm-up/prep omit RPE (see 2e).
- **Working (non-warm-up) circuits:** build each item's `detail` from the spec's per-item
  reps (`"×12"`), and if the spec gives one overall circuit RPE append it (`"×12 · RPE 7"`).
  Do **not** set `warmup` — working circuits log a weight field per item + one RPE per round
  by default (per SCHEMA "Circuit logging"). Only prep circuits get `warmup: true` (2e).

**2c — Section titles + icons** (per SCHEMA "Standard section names", fixed order):
Activation & Prep 🔥 → [power/explosive: free-named by content] → **Primary** 🎯 →
**Accessory** 💪 → **Core** → [conditioning: free-named, last]. Use the role from the spec
(primary→Primary block, accessory→Accessory block). Never collapse Primary+Accessory into a
single "Strength" block.

**2d — Finalize the `focusTag`** (design only gave a plain working title). Make it VIVID —
sports-headline energy that makes the athlete want to train — AND embed the keyword that
lands the right banner image per SCHEMA "Day `focusTag` → banner image" (first-keyword-wins
priority: recovery → power → conditioning → core → upper → lower → fullbody). Don't let a
higher-priority word hijack the image (`"engine"`→conditioning, `"power"`→power). E.g.
"Lower — squat/quad" → `"Built From The Legs Up"`; "Upper push & pull" → `"Press, Pull,
Repeat"`. Never ship a dry label (`"Upper Body & Press"` ✗).

**2e — Warm-up / prep logs nothing.** Prep circuits get `"warmup": true` (no weight/RPE).
Warm-up `simple` items carry the dose chip only — **no RPE chip** (an RPE on a warm-up is
noise; readiness check covers feel). Per COACHING-PRINCIPLES "Session structure & time".

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
  warm-up/prep items carry NO RPE chip and prep circuits have `"warmup": true`;
  chip order = dark → yellow set count → grey; every exercise has exactly 3 cues
  (ext+int in good, avoid in bad); section titles use the standard names (Primary/Accessory
  /etc, never "Strength"); **no rep chip is a range** — grep for an en-dash/hyphen inside a
  `×`-prefixed or bare rep chip (`×8–10`, `8-10 Reps`) and collapse any hit to a single number
  (the top of the range) per COACHING-PRINCIPLES.md → "Progression (coach-driven)". The app has
  no rep-range field; this is a hard reject, not a style preference.
- **Notes cards are HTML** — every `notes.cards[].body` must be real HTML (`<p>` paragraphs,
  `<ul><li>` for enumerable content, `<strong>` on the key phrase) per /program-engage PART 3
  and SCHEMA "notes". A body that is one plain-text paragraph is a hard reject: rewrite it
  before shipping.
- Report any structural violation and fix before finishing. (Exercise-name normalization is
  the next step — a required pass, not optional.)

## Step 4 — Normalize exercise names (required, blocking)
Names from /program-design are rough by design — **this is the correction pass.** It enforces
COACHING-PRINCIPLES "Exercise naming" + the `exercise_library.json` canonical spelling. Run
the scan, FIX every mechanical issue in the JSON, then surface only the judgment calls.

```
node -e "
const fs=require('fs');
const norm=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g,'').replace(/'/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const lib=JSON.parse(fs.readFileSync('exercise_library.json','utf8'));
const N={};for(const k of Object.keys(lib)){const n=norm(k);if(!(n in N))N[n]=k;}
const d=JSON.parse(fs.readFileSync('data/<id>.json','utf8'));
const seen=new Set();
for(const day of d.workouts.days)for(const b of day.blocks)for(const e of b.exercises)for(const it of (e.items||[e])){
  const nm=it.name;if(!nm||seen.has(nm))continue;seen.add(nm);
  const flags=[];
  if(/^bodyweight\s+/i.test(nm))flags.push('DROP \"Bodyweight\" prefix');
  if(/[(),:]/.test(nm))flags.push('REMOVE punctuation ()/:,');
  let lm;
  if(nm in lib){lm=lib[nm]?'OK':'GAP (in lib, no video yet)';}
  else{const c=N[norm(nm)]||N[norm(nm.replace(/^bodyweight\s+/i,''))];lm=c?('MISS -> canonical: '+c):'MISS (not in library)';}
  console.log((flags.length?'[FIX] '+flags.join('; ')+' | ':'')+lm+'  <- '+nm);
}
console.log('done');
"
```

**Then act on the output:**
- **Mechanical → FIX in-file now** (deterministic, no judgment): strip the `Bodyweight` prefix;
  remove `()` `:` `,` (if the qualifier carried meaning, move it to a chip); snap spelling/
  casing to the library's canonical key whenever `MISS -> canonical:` shows one. Edit the JSON,
  then **re-run until clean** (every line `OK`/`GAP`, no `[FIX]`, no fixable `MISS`).
- **Judgment → SURFACE to Amir, never silently invent:** a true `MISS (not in library)` (new
  movement → add to Notion when the video is added), an exercise that looks like the *wrong*
  movement, or a corrective/postural drill with no noted indication (per COACHING-PRINCIPLES).

`GAP` = in library, no video yet (fine, ship it). Validate JSON again after any name edit.

## Step 5 — Archive the cycle rationale (coach-only, append-only)
Persist the **COACHING LOG ENTRY** from /program-design to `.claude/coaching-log/<id>.md` — the
coach-only record of WHY this cycle looks the way it does (the read, decisions, volume,
progression levers, e1RM). This file is git-tracked but **unpublished** (inside `.claude/`, so
GitHub Pages never serves it) and the athlete app never reads it — it is the one place the design
reasoning is allowed to live. See `.claude/coaching-log/README.md` for the convention + template.
- **File missing (new athlete):** create it with the README's header
  (`# Coaching Log — <First Last> (<id>)` + the coach-only note), then add the entry.
- **File exists (returning):** **append** the new `## Cycle NN — …` section to the end.
  **Never edit, reorder, or delete any existing cycle section** — this archive is append-only, so
  a cycle's original reasoning survives even after the program is later changed. (It grows in
  lockstep with `programHistory` / `currentCycleIndex`.)
- Heading: use the cycle number + name from `cycles[currentCycleIndex]` and today's date.
- Verify after writing: one section per cycle designed so far, newest last, no prior section altered.

## Step 6 — Ship
- Summarise the diff (cycle advanced N→N+1, days, swaps) and confirm the coaching-log entry was appended.
- Commit + push **only if Amir asks** — include **both** `data/<id>.json` and
  `.claude/coaching-log/<id>.md` in the commit. End commit messages with the project's
  Co-Authored-By line.

## Don'ts
- Don't change any prescription — you assemble, you don't design.
- Don't regenerate `athlete.key`; reuse across all of an athlete's cycles.
- Don't write athlete chat/health detail or coach reasoning into `data/<id>.json` or any
  **published** path — the design rationale's only home is the coach-only, unpublished
  `.claude/coaching-log/<id>.md` (never the athlete JSON).
