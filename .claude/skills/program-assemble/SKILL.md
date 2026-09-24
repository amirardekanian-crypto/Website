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
This stage owns ALL serialization the design spec deliberately left out — section
titles/icons, the vivid `focusTag`, names. The spec gives you decisions; you render them.

⚠ **The prescription is no longer one of them.** Since 2026-09-20 the app stores a
prescription as DATA (`rx`), and design's dose fields already ARE that data — so this stage
copies them, it does not render them. There is no chip formatting left to get wrong.

**2a — Structure.** `workouts.label` = `Program 0N · <Cycle Name>`; `workouts.days[]` from
the spec. Each exercise → `type` + `rx` (+ `setup`/`intent`/`note` where the spec has them);
circuits → `rounds` + `items[]`. **Write NO `cues`, on any exercise or circuit item** (Amir,
2026-09-24: *"the aim is to use these cues for all the exercises that everyone has from now on"*).
The app draws every card's cues from its Spine entry, circuit items included (SCHEMA "`exId` and
the Spine"). Something only this athlete needs arrives as engage's Coach's Note (`note`), never
as a cue. **Stamp `exId`**
on every exercise whose name resolves to a `public.exercises` entry (approved or draft), so the
card follows the id even if the name is edited later. `sport.badge` ← design's `SPORT_BADGE` line. `completionTitle`/
`completionMessage` per day from /program-engage PART 4; `cycles[currentCycleIndex].message`
= PART 1 message + outcomes; next cycle's `teaser` = PART 2. Leave `videoUrl: null`
(auto-resolved by name downstream).
- **Set `type` from the design category** (the spec never emits it): standard grinding lift
  / ballistic / loaded carry → `"standard"`; working or prep circuit → `"circuit"`; warm-up
  `simple` item (bike, mobility drill) → `"simple"`.
  **A superset/complex is always `"circuit"`** — if the spec pairs two (or more) exercises as
  a superset, the whole pair becomes ONE circuit block: shared `name` + `rounds` + `restSec`,
  each paired exercise its own `items[]` entry (`detail: "×N · RPE N"` — no per-item tempo).
  **Never** render a superset pair as two separate `"standard"` exercises each carrying a
  `superset` chip — that shipped once (Pooya C3, all 4 days): it broke the shared rest (each
  exercise got its own independent rest timer instead of alternating) and left no visual
  grouping showing which exercises were paired. Name the circuit descriptively
  (`"Push-Pull Superset"`, `"Arm Superset"` — see `amir_ardekani.json` / `Mhrnz_khdm2.json`
  for precedent), never a generic `"Superset A/B"` — the name itself carries the pairing.
- **Carry `test_flag` straight through** to `"test": "<n>RM"` on that exercise (design emits
  `test_flag: 5RM`; see SCHEMA "test"). Verbatim, standard lifts only, and never invent one —
  which lifts get retested is a coaching decision the design pass already made. An exercise
  with no flag simply has no `test` field.
- **Place engage's exercise Coach's Notes**, matched by exercise name, into that exercise's
  `note` field (any type) — the app renders it as the clay "Coach's Note" (per SCHEMA
  "Exercise coach's note"). The text comes from /program-engage (which wrote it from
  design's `note_flag`), not from design directly. Copy verbatim, plain text — never wrap it
  in HTML (that's the cycle notes cards' convention, not this field's). Never move
  exercise-scoped guidance into the notes cards, and never invent a note nothing flagged.
- **Place engage's Becauses** (PART 3b), matched by exercise name, as `"why": { "src", "part"?,
  "text" }` on that exercise (standard or simple, never a circuit). Verbatim, and never invent one.
  **Write `why` fresh every cycle: never carry a previous cycle's `why` over**, because a reason
  from Cycle 1 is stale by Cycle 3. Then run the audit (Step 3) and fix everything it flags.

**2b — Copy the dose into `rx`** (per SCHEMA → "`rx` — the prescription"). Design's dose
fields map one-to-one; there is nothing to convert:

| design spec | `rx` |
|---|---|
| sets | `"sets": 4` |
| reps (**one number, never a range**) | `"reps": 6` |
| duration | `"time": "30s"` |
| distance | `"distance": "20m"` |
| each side / each leg | `"side": true` — **its own field, never baked into the number** |
| RPE | `"rpe": 7` |
| tempo | `"tempo": "3-1-1-0"` |
| rest | `"rest": 120` |
| `intent` | `"intent": "max intent"` at exercise level — the one green pill |

**Rest belongs to the BLOCK when a section shares one.** Write `"rest": 120` on the block and
leave `rx.rest` off its exercises — the section header states it once and every timer in the
block uses it. Put `rx.rest` only on the exercises that genuinely differ; it overrides the
block and draws its own cell. Eight cards each repeating "REST 2m" is the same fact eight times.

**Circuits take `rx` too:** `{"rx": {"rounds": 3, "rest": 60}}` — `rounds` is a NUMBER, not
`"×3 Rounds"`. Each item takes its own `rx` when the dose is plain (`{"rx":{"reps":12}}`,
`{"rx":{"time":"20s"}}`, `{"rx":{"reps":10,"side":true}}`) and keeps free-text `detail` only
when the wording carries more than a number (`"15 sec, switch legs each round"`).

**OMIT ANYTHING THE SPEC DID NOT GIVE YOU.** An absent field means "not prescribed" and the
app draws no cell for it — that is the entire contract. Never write a placeholder, an empty
string, or a zero. In particular: **no `rpe` on warm-up/prep, no `tempo` on ballistic work
or carries, and no `rest` unless the spec named one** (the app stopped inventing 120s).

**Never restate the tempo in `intent`.** `"3s eccentric"` beside `"tempo": "3-1-1-0"` is the
same instruction twice; the card already shows the tempo with its key digits highlighted.

**Never write `chips[]`.** It is legacy-read-only. Equipment or position notes
(`neutral grip`, `45° bench`) go in `"setup"`, not a chip and not the name.

**Working (non-warm-up) circuits:** give each item its own `rx` from the spec's per-item reps
(`{"rx":{"reps":12}}`), and put one overall circuit RPE on the circuit's own `rx.rpe`.
Set **no logging flags** — since 2026-09-15 the BLOCK decides: a circuit in a working block
(Primary/Accessory/Core/Power/Conditioning) logs a weight per item + one RPE per round, and
a circuit in a prep block logs nothing. The only flag you ever write is `"logWeight": true`
on a genuinely **loaded** primer sitting in a prep block (e.g. a Leg Press primer). See
SCHEMA.md → "Circuit logging".

**2c — Section titles + icons** (per SCHEMA "Standard section names", fixed order):
Activation & Prep 🔥 → [power/explosive: free-named by content] → **Primary** 🎯 →
**Accessory** 💪 → **Core** → [conditioning: free-named, last]. Use the role from the spec
(primary→Primary block, accessory→Accessory block). Never collapse Primary+Accessory into a
single "Strength" block.

**2d — Finalize the `focusTag`** (design only gave a plain working title). Make it VIVID —
sports-headline energy that makes the athlete want to train. E.g. "Lower — squat/quad" →
`"Built From The Legs Up"`; "Upper push & pull" → `"Press, Pull, Repeat"`. Never ship a dry
label (`"Upper Body & Press"` ✗).

**Write the day's `art` word and the name is free.** The picture no longer depends on
smuggling a keyword into the title — you set `art` directly (see the block below). The
keyword scan is only the fallback, and it now takes whatever the name **leads with**, so a
vivid name and the right picture stopped being in tension: `"Hinge Slow, Pull Hard"` is a
hinge day either way.

**2e — Warm-up / prep logs nothing.** The prep BLOCK already silences its circuits, so
`"warmup": true` is no longer required (harmless if present). Name the block so it reads as
prep — `Activation & Prep`, `Prime`, `Warm-Up`, or a free name containing *mobility* /
*activation* / *prep*; a prep block named something unrecognised will log like a working one.
Warm-up `simple` items carry the dose only — **no `rpe`, no `tempo`, no `rest`** (an RPE on a
warm-up is noise; readiness check covers feel). With only a dose, the app drops the grid and
renders the item as a name and a number on one line, which is what a warm-up should look like. Per COACHING-PRINCIPLES "Session structure & time".

**RETURNING — advance the cycle (per SCHEMA.md "Advancing to the Next Cycle"):**
1. Move the OLD `workouts` into `programHistory` in the simplified
   `{label, subtitle, days:[{label, focus, exercises:[{name, detail}]}]}` shape.
2. Replace `workouts.days` with the new cycle.
3. **Increment `currentCycleIndex` by 1.**
4. Keep the whole `athlete` block unchanged — `id`, the names, `boardName` and `tier`
   are identity, not programme. ⚠️ There is no `key` any more: if an old file still
   carries `athlete.key`, drop it. It authorises nothing (`athlete_keys` is empty and
   `get_program()` fails closed on that path).

**Write the picture on every cycle AND every day — this is part of assembling, not an
extra.** Both use the same field name, `art`, and both are listed in `SCHEMA.md`:

- **`cycles[n].art`** — one of ten families: `bedrock` `iron` `build` `armour` `voltage`
  `spring` `brakes` `engine` `reset` `peak`. Take it from the roadmap's Art line; if the
  roadmap predates that line, pick from what the block actually trains and say which you
  chose.
- **`workouts.days[n].art`** — one of eight: `lower` `upper` `power` `conditioning` `core`
  `recovery` `fullbody` `default`. Pick what the day IS, not what its name rhymes with.

A missing `art` is never fatal — the app guesses from the name — but the guess is invisible
when it is wrong, and it cannot know that one athlete's *Uncoil* frees a stiff hip while
another's turns strength into speed, or that *"Hinge Slow, Pull Hard"* is a hinge day.
Ten pictures and eight pictures cover everyone; the full set is `IMAGES.md` §0.

**NEW — create the file:**
- Full skeleton, `currentCycleIndex: 0`, `cycles[]` from the locked roadmap, and the
  `athlete` block (`id`, `firstName`, `lastName`, `boardName`) exactly as /athlete-intake
  registered it. **No key** — that mechanism is retired; see /athlete-intake Step 3.
- Confirm instead that the athlete already has a `public.programs` row (intake creates
  it, and it is what puts them on the roster). Publishing then updates that row rather
  than inventing a second identity for the same person.

## Step 3 — Validate (do not skip)
- `node -e "JSON.parse(require('fs').readFileSync('data/<id>.json','utf8')); console.log('valid')"`
- Confirm `athlete.id`, the `athlete` names, `currentCycleIndex`, day count, and
  exercise count print as expected.
- **`node scripts/check_rx.js`** — the format lint is a script now. It audits every `rx`
  (two doses on one exercise, `chips` left beside `rx`, an empty `rx`, a malformed tempo, an
  RPE under the selector floor) and proves program.html and assets/js/chips.js still agree.
  It also runs in `.githooks/pre-commit`.
- **Coaching lint** (still yours): every `standard` has sets·reps·tempo·RPE·rest unless the
  movement says otherwise; ballistic/carry correctly OMIT tempo and carry an `intent`;
  warm-up/prep carry NO `rpe`; **no exercise or circuit item carries `cues`** (each shows its
  Spine entry's three); section titles use the standard names (Primary/Accessory/etc, never "Strength").
  **Reps are one number, never a range** (Amir, 2026-09-24). If the spec carries a range,
  stop and ask — do not pick an end yourself. `auditRx()` flags one as `rep-range`.
- **Because audit** (`why`): fix every line it prints. It flags a bad `src`, a missing `part`,
  text over 140 characters, coach-log words (a diagnosis, "stalled", "hated"), em-dashes or
  semicolons, a reason the Coach's Note repeats, and more than 10 in the cycle.
  ```
  node -e "require('./assets/js/chips.js');const C=globalThis.Chips;
  const d=JSON.parse(require('fs').readFileSync('data/<id>.json','utf8'));const out=[];
  (d.workouts.days||[]).forEach(dy=>(dy.blocks||[]).forEach(b=>(b.exercises||[]).forEach(e=>
    C.auditWhy(e).forEach(p=>out.push('Day '+dy.id+' '+e.name+': '+p.code+' '+p.label+' — '+p.msg)))));
  C.auditWhyProgram(d).forEach(p=>out.push(p.code+': '+p.msg));
  console.log(out.length?out.join('\n'):'ok — Because clean')"
  ```
- **⛔ No working circuit in a FIRST cycle — hard reject.** If `currentCycleIndex` is `0`,
  every `"circuit"` must sit in a prep block. A superset or complex in Primary/Accessory/Core
  on cycle 1 violates COACHING-PRINCIPLES.md → Session structure ("no supersets in an
  athlete's first cycle"), and the cost is concrete: a circuit records one weight per exercise
  for the whole block and one RPE per round, so the cycle whose entire job is to establish
  baselines produces none for those exercises. Rebuild them as separate `"standard"` entries
  with independent `restSec`.
  ```
  node -e "const d=JSON.parse(require('fs').readFileSync('data/<id>.json','utf8'));
  if(d.currentCycleIndex!==0){console.log('not a first cycle — check skipped');process.exit(0)}
  const prep=t=>/warm|mobility|activation|cool|prime|prep/i.test(t||'');
  const bad=[];(d.workouts.days||[]).forEach(dy=>(dy.blocks||[]).forEach(b=>
    (b.exercises||[]).forEach(e=>{if(e.type==='circuit'&&!prep(b.title)&&e.warmup!==true)
      bad.push('Day '+dy.id+' ['+b.title+'] '+e.name)})));
  console.log(bad.length?'REJECT — working circuits in cycle 1:\n  '+bad.join('\n  '):'ok — no working circuits in cycle 1')"
  ```
- **⚠️ Later cycles: every exercise inside a circuit needs a logged working weight already.**
  The same principle covers "any exercise new to that client, even in a later cycle." For each
  item in a working circuit, confirm the athlete has a prior per-set number for it (session
  history / The Ceiling / the coaching log's Exercise Ledger). Any item without one comes out
  of the circuit and runs as straight sets this cycle — pair it next cycle, once it has a
  baseline. Flag to Amir rather than silently rebuilding.
- **No superset shipped as a pill.** Grep every `"standard"` exercise's `intent`/`setup` for
  `"superset"` (or any structural-pairing wording) — if found, that pair was never
  converted to the required `"circuit"` block per 2a. Hard reject: rebuild it as one circuit
  entry (shared `name`/`rounds`/`restSec`, both exercises as `items[]`) before shipping — see
  SCHEMA.md → `"circuit"` type, "Common mistake." (Shipped once, Pooya C3 — this check exists
  because of it.)
- **RPE floor 6 — sweep EVERY athlete-facing string, not just `rx.rpe`.** Grep the whole
  JSON for `RPE [1-5]`, and separately for any note/card that tells the athlete to subtract
  from an RPE without naming the floor ("take 1 off every RPE", "drop the RPE by one") — that
  instruction lands on RPE 5 for every exercise authored at 6 and the app's selector cannot
  record it. Hard reject: rewrite to "…but never go below 6." An rx-only pass is what let
  this ship once (Ghazal C2). See COACHING-PRINCIPLES.md → "Chips & modifiers".
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

**Then check the Spine. This is a publishing gate now**, because the cards carry no cues of their
own. Every exercise AND every circuit item must resolve to an entry in `public.exercises`
(`select id, name, aliases, status, cues is not null as has_cues from public.exercises`), and
that entry must be **`approved` with cues**, or the athlete sees a card with no cues at all
(`get_exercises()` serves approved entries only). Before publishing, list for Amir:
- **Drafts it uses:** *"approve these N in coach.html → Exercises → Drafts before this goes live"*.
- **Names with no entry:** draft them with `/spine` (three cues written for anyone), then the same.
Never approve an entry yourself. If Amir says ship anyway, say which cards will show no cues.

**Then act on the output:**
- **Mechanical → FIX in-file now** (deterministic, no judgment): strip the `Bodyweight` prefix;
  remove `()` `:` `,` (if the qualifier carried meaning, move it to `setup`); snap spelling/
  casing to the library's canonical key whenever `MISS -> canonical:` shows one. Edit the JSON,
  then **re-run until clean** (every line `OK`/`GAP`, no `[FIX]`, no fixable `MISS`).
- **Judgment → SURFACE to Amir, never silently invent:** a true `MISS (not in library)` (new
  movement → add to Notion when the video is added), an exercise that looks like the *wrong*
  movement, or a corrective/postural drill with no noted indication (per COACHING-PRINCIPLES).

`GAP` = in library, no video yet (fine, ship it). Validate JSON again after any name edit.

## Step 5 — Archive the cycle rationale (coach-only, append-only) + update the Exercise Ledger
Persist the **COACHING LOG ENTRY** from /program-design — the coach-only record of WHY this
cycle looks the way it does (the read, decisions, volume, progression levers, e1RM).
⚠️ **The record is the `public.coaching_logs` row, not a file.** Coach-only, read from
coach.html → athlete → File; Step 7 (*The coaching log goes to the server too*) has the
splice. `.claude/coaching-log/<id>.md` is a **gitignored local working copy** — build the
entry there if it helps, then write it to the row. It used to be git-tracked in this PUBLIC
repo, world-readable, which is exactly why it moved; never re-add it to git. The athlete app
reads neither. See `.claude/coaching-log/README.md` for the convention + template.
- **File missing (new athlete):** create it with the README's header
  (`# Coaching Log — <First Last> (<id>)` + the coach-only note), an empty **Exercise Ledger**
  table (header row only — see README "Exercise Ledger"), then the entry.
- **File exists (returning):** **append** the new `## Cycle NN — …` section to the end.
  **Never edit, reorder, or delete any existing cycle section** — this archive is append-only, so
  a cycle's original reasoning survives even after the program is later changed. (It grows in
  lockstep with `programHistory` / `currentCycleIndex`.)
- Heading: use the cycle number + name from `cycles[currentCycleIndex]` and today's date.
- Verify after writing: one section per cycle designed so far, newest last, no prior section altered.
  A `## Debrief — Cycle NN …` section (the end-of-cycle review) may sit between two cycle sections:
  it is not a cycle section, never edit or move it, and append the new cycle after it.
- **⚖️ The Volume & Dose section must carry BOTH set-count tables** — the per-exercise
  contribution table (day · exercise · sets · what it counts toward, fractions shown) *and* the
  per-muscle total against its goal range. Standing order from Amir (2026-09-08): *"whenever you
  calculate the sets, add that table to the athlete coaching log so i can see."* If /program-design
  handed over only the summary table, build the per-exercise one here rather than shipping without
  it. Counting convention: COACHING-PRINCIPLES.md → "Volume & dosing".
- **Exercise Ledger — apply design's "Exercise Ledger Updates" deltas.** Unlike the cycle
  sections, this table (sitting right after the file header, before the first `## Cycle`
  section) is mutated in place every cycle — it's a current-state index, not a historical
  narrative, so there's nothing to preserve by appending. Add a row for any exercise seen for
  the first time; update `Status`/`Last cycle`/`Note` for every exercise design flagged as
  changed. If the file predates the ledger (an athlete whose log started before this existed),
  backfill it from this cycle's exercise list only — don't reconstruct earlier cycles from
  memory, just start the table clean from here. See `.claude/coaching-log/README.md` →
  "Exercise Ledger" for the exact format and status values.

## Step 6 — COACH HANDOFF BRIEF (mandatory, never skip, never bury)
**Amir's standing order (2026-08-08).** Before shipping, print a clearly-headed section in chat
telling him everything the program now requires of *him*. This is a to-do list he can act on, not
a recap of the programming — he must never have to reverse-engineer his own responsibilities out
of the design write-up. See COACHING-PRINCIPLES.md → Process → "EVERY program build ENDS with a
COACH HANDOFF BRIEF". Cover, one line each, each with its reason:
- **MEASURE** — every number he or the athlete must collect, how often, and what it feeds.
- **GATE** — every progression gate, and *exactly* what clears it (never the athlete's word).
- **FILM** — every filmed set he must review, by when, and what is blocked until he clears it.
- **DATES** — every date-stamped escalation: referrals, appointments, checkpoints, expiries.
- **WATCH** — trigger conditions that fire a deload, a stop, or a referral.
- **SPINE** — the Step 8 upkeep report: drafts added, gaps filled, proposals for him, and the
  entries this programme uses that still need his approval.
- **⚠️ MY CALLS** — every decision made on his behalf: anything that **overrides** something he
  said, **extends** it past what he actually approved, or **fills a gap** he never ruled on.
  State it plainly and offer to reverse it. This section is the whole point; put it last so it
  lands, and never let it be implied rather than written.

Cross-check before writing it: anything the athlete must do *repeatedly* to keep a gate alive
(filming, weekly measures, booking an appointment) must ALSO appear in the plan he can see — a
`cycles[].focuses` line and/or a `message.outcomes` entry — not only in a notes card. If it is
missing there, fix the JSON before shipping, don't just mention it in the brief.

## Step 7 — Ship: PUBLISH TO THE SERVER YOURSELF

> **⚠️ Scope: this step is the NEW-CYCLE path.** Deriving `programHistory`, bumping
> `currentCycleIndex` and replacing `workouts` wholesale are all correct when a cycle
> advances and all three are WRONG for a mid-cycle edit to a live block. For a targeted
> change inside the cycle the athlete is currently training, use
> **/program-edit → "Mid-cycle adjustment"** instead. *(2026-09-19)*

**Amir, 2026-09-07, verbatim: *"go live, we dont use json files anymore, upload to the
servers."*** Do not build a file and hand it to him. Write it to `public.programs` through
the Supabase MCP (`execute_sql`) and tell him it is live. `data/<id>.json` stays a local,
gitignored scratch artifact — useful to lint and diff against, never the deliverable, and
never committed.

**The payload is ~30 KB of JSON. One giant `update … set data = '<whole thing>'` is the
wrong shape** — it is a wall of text to get exactly right in one shot and there is no way to
localise a mistake. Publish in stages, one top-level key per statement, verifying between:

1. **`programHistory` + `currentCycleIndex` — derive the archive SERVER-SIDE.** Do NOT emit
   it. The live row still holds the OLD `workouts`, so build the history entry from it with
   `jsonb_agg` over `days → blocks → exercises` (`detail` = the dose read off `rx`, e.g.
   `4 × 6 · RPE 7` — or the old chip labels joined with ` · ` on a row not yet migrated,
   or `rounds` for a circuit), append it to `programHistory`, and bump `currentCycleIndex`
   in the same statement. This is strictly better than sending your local copy: the archive
   is then provably what the athlete actually had, not what your file says they had.
2. **`jsonb_set(data,'{workouts}', $W$…$W$::jsonb)`** — the new cycle's days.
3. **`jsonb_set(data,'{notes}', …)`**, plus `{cycles,N}` for the current cycle's
   `message`/`focuses` and `{cycles,N+1,teaser}`. These three fit comfortably in one call.

**Dollar-quote everything** (`$W$ … $W$`) and check the payload does not contain your tag.
Apostrophes are everywhere in athlete-facing copy and single-quoting will shred it.

**Never touch the `athlete` block.** Assert `athlete.id` and the names are unchanged after
every statement — a `jsonb_set` on the wrong path rewrites identity silently. (An old file
may still carry a dead `athlete.key`; it authorises nothing and can simply go.)

**The version trigger does the backup for you.** `programs_version_trg` snapshots the row
into `program_versions` on every update, so the pre-publish state is preserved automatically
and a staged publish simply leaves a few extra versions behind. Harmless — do not try to
avoid it, and do not hand-roll a backup.

### Verify with a CONTENT FINGERPRINT, not `md5(data::text)`
`jsonb` reorders keys (by length, then bytewise), so the server's text hash can never match
your local file's. Instead compute the same canonical string on both sides and compare —
walk days → blocks → exercises in array order and join `type · name · rx fields (or chip
labels, on a row not yet migrated) · setup · intent · rounds · note · test · cues.good ·
cues.bad · circuit items`; do the same for `notes.cards` and the
cycle `focuses`/`paragraphs`/`outcomes`. `jsonb_array_elements(...) with ordinality`
preserves array order, so the SQL and the Python agree. Compare md5 AND length. Anything
less than this is not verification — a `jsonb_set` that silently wrote a string where an
object belonged still looks fine to a row-count check.

**`get_program()` will fail for you with `invalid athlete key`. That is correct.** The RPC
fails closed and the MCP connection is neither an athlete session nor a signed-in coach.
It reads `public.programs`, so a verified row IS what the app serves. Confirm the row, not
the RPC.

### The coaching log goes to the server too
`public.coaching_logs` (`athlete_id, body, updated_at`), coach-only, read from coach.html →
athlete → File. Same problem, same trick: **splice, don't retype.** Replace the ledger block
between the header rule and the first `\n---\n` with `substring(body from 1 for <pos>) || …
|| substring(body from <pos>)`, then append the new `## Cycle NN` section with `body || $C2$…$C2$`.
The C1 prose is never re-emitted, so it cannot be corrupted. Here the local file and the DB
are both plain text, so a straight `md5(body)` comparison IS valid — use it.

- Summarise the diff (cycle advanced N→N+1, days, swaps) and confirm both the programme row
  and the coaching-log row verified.
- ⚠️ **Node is NOT on this machine** — corrected 2026-09-19, verified in both bash and
  PowerShell (`node`, `npm` and `gh` are all "command not found"). This line previously
  claimed "Node **is** on this machine (v24)", which was wrong. **Use Python** (3.14 is
  installed) — it is what the rest of this skill uses for fingerprints anyway. The three
  `node -e` snippets above (Steps 3 and 4) are still written in JavaScript and will fail
  as-is; translate them to Python before running. See also: no `gh`, so ship by local merge.
- Commit + push **only if Amir asks**. `data/` and `.claude/coaching-log/` are both
  gitignored; there is normally nothing to commit at all.

## Step 8 — Spine upkeep (every programme, the last thing you do)
Amir, 2026-09-24: *"when i write or update a program, and there are movements that are not there,
or missing some info, or can be updated, it should be updated there at the end … so everytime i
write a program for an athlete, this gets more complete."* Run **`/spine` → Upkeep** on this
athlete's programme: draft every exercise with no entry, fill every empty field (video, alias,
equipment, loads, regressions/progressions/alternatives, SFR, flags, **qualities**), stamp `exId` on every card that resolves,
link a new exercise to its regressions, progressions and alternatives from both sides, apply design's `spine_cue:` lines to drafts
and propose them for approved entries, and put the one-line **SPINE** report in the handoff brief.
Never approve an entry, and never put anything about this athlete on one.

**Then the two checks that read the finished programme** (both 2026-09-24):
- **Quality Map.** Per day, the top three qualities (working sets × primary 1 / secondary ½, prep
  blocks skipped): that is what each day card on Home will say. And the cycle's headline (`art`
  word) must be in the week's top two unless it is `bedrock`, `peak` or `reset`. Report both as one
  **QUALITY** line: `Day 1 Strength · Brakes · Spring | Day 2 … | headline iron ✓`. A day under
  70% tagged shows nothing on the phone, so it is a gap to fix in the upkeep above.
- **Because.** The cycle carries 5–10 `why`s, each on an exercise that is in this programme, none
  carried over from last cycle. `Chips.auditWhy()` / `auditWhyProgram()` clean (Step 3).

## Don'ts
- Don't change any prescription — you assemble, you don't design.
- Don't add, reuse or regenerate an `athlete.key`, and don't hand out a `?client=&key=`
  link — that whole mechanism is retired and a key written today authorises nothing.
  Athletes sign in with a username and password Amir creates from coach.html.
- Don't write athlete chat/health detail or coach reasoning into `data/<id>.json` or any
  **published** path — the design rationale's only home is the coach-only
  `public.coaching_logs` row (never the athlete JSON). The local
  `.claude/coaching-log/<id>.md` is a gitignored working copy of that row, nothing more.
