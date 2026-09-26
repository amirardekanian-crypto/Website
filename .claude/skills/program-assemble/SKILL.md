---
name: program-assemble
description: Mechanically build a designed programme and publish it to public.programs (the server is the only copy that counts), in TWO parts. Part A, straight after /program-design and before /program-engage, builds the workouts and runs every programming check. Part B, after /program-engage, places the words, runs the full checks, writes the coaching log and publishes. Use when Amir says "build the json", "assemble", "write her file", "ship it", or when design hands over a spec. Handles cycle advancement (archive prior cycle, bump currentCycleIndex) for returning athletes and fresh-file creation for new ones. This is the mechanical step — it keeps formatting/JSON work out of the design pass.
---

# Assembler — build, check, publish (mechanical)

Turn the **program spec** (/program-design) and the **engagement text** (/program-engage)
into the athlete's programme in `public.programs`, matching `SCHEMA.md`. This stage is
deterministic plumbing — it makes no coaching decisions. Read `SCHEMA.md` first if unsure of a
field. A local `data/<id>.json` may be built as a scratch copy to lint and diff; it is never
the source of truth and never committed.

## The two parts (2026-09-26)
Until 2026-09-26 everything below ran after engage, so a FAIL that changed an exercise left the
notes, Becauses and WhatsApp text describing the old programme, and the Spine gate (Step 3) could
not pass until the drafting (Step 8) had run. Now:

**Part A — build and check. Straight after /program-design, BEFORE /program-engage.**
Step 1 · Step 2a–2e (the workouts; `weekNotes` carries design's numbers, no words yet) · Step 4
(names, and new exercises drafted into the Spine now, so every card has an `exId`) · Step 3 with
`--stage build` · Step 3b (a new athlete's one review). A FAIL here is a design decision to
revise: change the spec and the log entry together, rebuild, re-check. If a FAIL overturns
something Amir settled at the checkpoint, it goes in the handoff under MY CALLS.
Then engage writes against the programme that passed.

**Part B — finish and publish. After /program-engage.**
Step 2f (place the words) · Step 3 in full (`--stage final`) · Step 5 (the coaching log) · Step 6
(the handoff, where the new Spine entries are an approval question BEFORE publishing) · Step 7
(publish) · Step 8 (what's left of the Spine upkeep). A programming FAIL in Part B means the
programme changed after Part A: go back to Part A, not to the text.

## Step 1 — Detect new vs returning — FROM THE SERVER
`data/*.json` is deleted and gitignored, so a file test calls every athlete NEW in a cloud
session. Ask the row:
```sql
select jsonb_typeof(data->'workouts'->'days') = 'array' as has_workouts,
       coalesce((data->>'currentCycleIndex')::int, 0) as cci,
       jsonb_array_length(coalesce(data->'programHistory', '[]')) as archived
from public.programs where athlete_id = '<id>';
```
- `has_workouts` true → **RETURNING** (advance the cycle, Step 7.1).
- No row, or a row holding only `athlete`/`sport` from intake → **NEW** (Step 7, *New athlete*).

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
card follows the id even if the name is edited later. `sport.badge` ← design's `SPORT_BADGE` line.
Leave `videoUrl: null` (auto-resolved by name downstream). The words come in Part B (2f).
- **Set `type` from the design category** (the spec never emits it): standard grinding lift
  / ballistic / loaded carry → `"standard"`; working or prep circuit → `"circuit"`; warm-up
  `simple` item (bike, mobility drill) → `"simple"`.
  **A superset/complex is always `"circuit"`** — if the spec pairs two (or more) exercises as
  a superset, the whole pair becomes ONE circuit block: shared `name` + `rounds` + `restSec`,
  each paired exercise its own `items[]` entry (`detail: "×N · RPE N"` — no per-item tempo).
  **Never** render a superset pair as two separate `"standard"` exercises each carrying a
  `superset` chip — that shipped once (all 4 days of one cycle): it broke the shared rest (each
  exercise got its own independent rest timer instead of alternating) and left no visual
  grouping showing which exercises were paired. Name the circuit descriptively
  (`"Push-Pull Superset"`, `"Arm Superset"`), never a generic `"Superset A/B"` — the name
  itself carries the pairing.
- **Carry `test_flag` straight through** to `"test": "<n>RM"` on that exercise (design emits
  `test_flag: 5RM`; see SCHEMA "test"). Verbatim, standard lifts only, and never invent one —
  which lifts get retested is a coaching decision the design pass already made. An exercise
  with no flag simply has no `test` field.
- **Write the two special weeks' NUMBERS on the cycle** (2026-09-26): `cycles[currentCycleIndex]
  .weekNotes = { "first": {…}, "last": {…} }` with design's `setsDrop` / `rpeDrop` / `rpeCap` from its
  `week1:` / `lastweek:` lines; engage's words join them in 2f. Leave `first` out only when design
  wrote "same as the card". ⚠️ The field is `weekNotes`, never `weeks` (that is the "Weeks 1–5"
  label). The app shows each in its week; see SCHEMA.md → `weekNotes`.

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
| `intent` | `"intent": "max intent"` or a grip, `"intent": "neutral grip"`, at exercise level — the one green pill |

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

**Never write `chips[]`.** It is legacy-read-only.

**A GRIP IS THE PILL, never free text** (Amir, 2026-09-25: *"grips should be a chip on the card not
a free text … you changed how my file look like"*). `"intent": "neutral grip"` draws the same
deep-green pill his older cards draw for a grip chip; a card that also has an intention joins them in
the one pill (`"neutral grip · max intent"`). The grip is the athlete's: never on the library entry.
**No `setup` on a programme card at all** (Amir, 2026-09-25: *"i dont like floating text"*): any other
detail for this athlete is the Coach's Note (`note`; on a circuit item, the circuit's note).
`check_program.py` fails any `setup`.

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
renders the item as a name and a number on one line, which is what a warm-up should look like (SES-5).

**RETURNING — advance the cycle (per SCHEMA.md "Advancing to the Next Cycle"):**
1. Put the OLD `workouts` FIRST in `programHistory`, in the simplified
   `{id, label, subtitle, days:[{label, focus, exercises:[{name, detail}]}]}` shape, with
   `id: "prog<N>"` (N = the finished cycle's number). **Newest FIRST, and every entry has an `id`.**
   The past card opens `programHistory[0].id` and `renderArchive()` finds the entry by `id`, so an
   entry added at the END opens the athlete's first cycle, and an entry without an `id` opens
   nothing. Both shipped: on 2026-09-24 five athletes' "Done" cards were wrong (three stored
   newest-last, two with no `id`) and were repaired in place.
2. Replace `workouts.days` with the new cycle.
3. **Increment `currentCycleIndex` by 1.**
4. Keep the whole `athlete` block unchanged — `id`, the names, `boardName` and `tier`
   are identity, not programme. ⚠️ There is no `key` any more: if an old file still
   carries `athlete.key`, drop it. It authorises nothing (`athlete_keys` is empty and
   `get_program()` fails closed on that path).
5. **Set the new cycle's `startDate` to the day the athlete really starts** (design asks it at
   the checkpoint) and `endDate` to start + 34 days. The roadmap's dates are nominal Mondays, but
   Home's *Week X of Y*, the days-left banner and the retest nudge (the last 7 days before
   `endDate`) all read these two fields. A Saturday start left on a Monday date shows last week's
   number on every weekend session and misses a Saturday test day, which cost a republish and a
   rewritten WhatsApp on 2026-09-26.

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

**2f — Part B: place engage's words** (after /program-engage; matched by exercise name, or better
by `exId`, since Part A stamped one on every card).
- `completionTitle` / `completionMessage` per day from engage PART 4;
  `cycles[currentCycleIndex].message` = PART 1 message + outcomes; next cycle's `teaser` = PART 2;
  `notes.cards` from PART 3, each card's `TAGS:` as `"tags": ["film"]` (pipeline-only, the app
  never shows it; SCHEMA → notes). The full check fails any obligation on the spec's list that
  no card (or week note) carries.
- **Coach's Notes** into that exercise's `note` field (any type) — the app renders it as the clay
  "Coach's Note" (per SCHEMA "Exercise coach's note"). The text comes from /program-engage (which
  wrote it from design's `note_flag`), not from design directly. Copy verbatim, plain text — never
  wrap it in HTML (that's the cycle notes cards' convention, not this field's). Never move
  exercise-scoped guidance into the notes cards, and never invent a note nothing flagged.
- **The week notes' words:** engage's PART 3c `WEEK 1:` / `LAST WEEK:` text into `weekNotes.first.text`
  and `weekNotes.last.text`, beside the numbers Part A wrote.
- **Becauses** (PART 3b) as `"why": { "src", "part"?, "text" }` on that exercise (standard or
  simple, never a circuit). Verbatim, and never invent one. **Write `why` fresh every cycle:
  never carry a previous cycle's `why` over**, because a reason from Cycle 1 is stale by Cycle 3.
  Then run the full check (Step 3) and fix everything it flags.

## Step 3 — Check: `--stage build` in Part A, the full run in Part B (do not skip)
- **`scripts/check_program.py` first: the house rules, as a script** (2026-09-25; plain Python,
  so it runs on Amir's PC too). It reads the built file, the design's volume table and the spec:
  ```
  python3 scripts/check_program.py data/<id>.json --spine-sql      # prints ONE query: run it
  # save the query's raw result as-is (the JSON the tool returns loads directly), then:
  python3 scripts/check_program.py data/<id>.json --stage build --log <scratch>/log_entry.md --spec <scratch>/spec.md \
      --spine <scratch>/spine_<id>.json [--floor] [--proven] [--cap <real minutes>] [--week "Sat:1,Sun:2,Mon:3,Wed:4"]
  # Part B: the same command without --stage build (the default is the full run). Re-run
  # --spine-sql only if Part B added an exercise; the saved result is still good otherwise.
  ```
  **The athlete profile at the top of the spec sets the flags** (2026-09-26): `aim: strength-muscle`
  turns on `--floor` (the 10-set floor on every major muscle; a sport-performance athlete gets what
  is best for them, Amir 2026-09-26), `proven:` turns on `--proven`, and its `bans`,
  `floor-except` and `cap` join the spec's own lines. Type a flag only to override it. The
  new-athlete rules switch on by themselves in a first cycle. `--no-backoff` only on Amir's word.
  A run with no profile anywhere gets a WARN, and the flags come from the command line only. **Fix every FAIL and re-run
  until 0 FAIL; read every WARN.** It fails a muscle under its floor, a volume table that
  disagrees with the programme, more than 4 sets, a weighted lift under 8 reps (new athlete), a
  superset in a first cycle, a banned movement in any exercise, setup or fallback, an RPE under
  6 anywhere in the text, a note that lowers the RPE without naming the floor, chips or cues on
  a card, a missing `exId`, a Because over 140 characters or more
  than 10 of them, a notes card that isn't HTML, any `setup` (floating text: a grip is the pill,
  anything else the Coach's Note),
  an exercise with no library entry or no cues, a quality outside the ten, and a cycle with no
  back-off `weekNotes.last` (or a new athlete with no `weekNotes.first`). Since 2026-09-26 the saved
  `--spine` result also carries the cycle just trained and the Exercise Ledger, so it also fails
  70%+ of the accessories carried over, a kept exercise whose dose didn't move, a ledger
  Disliked / Pain-flagged / Banned exercise brought back without a `reintroduce:` reason, and a
  circuit item used on two days; it warns on each kept accessory not on `keep:`, a kept primary
  on the same numbers, and a day of 7+ working exercises. "Weighted" for the 8-rep rule comes from
  the Spine entry (loaded kit, no impact, not a jump, throw, sprint, carry or conditioning). Two things are only
  WARNs: a Quality headline outside the week's top two (report it with your recommendation), and a
  day past `--cap` (Amir,
  2026-09-26: the form's session length is a guess, athletes who write 60 train 75 and never
  complain), so pass the athlete's real minutes when the logs have them. It prints what the handoff needs: minutes
  per day, sets per muscle and the **QUALITY** line. The first programme it was run on (a new
  athlete's live Cycle 1) passes it with 0 FAIL; a copy with twelve faults planted in it fails on
  all twelve.
- `node -e "JSON.parse(require('fs').readFileSync('data/<id>.json','utf8')); console.log('valid')"`
- Confirm `athlete.id`, the `athlete` names, `currentCycleIndex`, day count, and
  exercise count print as expected.
- **`node scripts/check_rx.js`** — the format lint is a script now. It audits every `rx`
  (two doses on one exercise, `chips` left beside `rx`, an empty `rx`, a malformed tempo, an
  RPE under the selector floor) and proves program.html and assets/js/chips.js still agree.
  It also runs in `.githooks/pre-commit`.
- **Coaching lint** (still yours): every `standard` has sets, one dose and an RPE unless the
  movement says otherwise; rest sits on the block when the section shares one, on the exercise
  only when it differs; a tempo only where the spec gave one; ballistic/carry correctly OMIT tempo and carry an `intent`;
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
- **Already in the script, so no manual pass** (these were separate greps and node snippets until
  2026-09-26): a working circuit in a first cycle, a superset written as a pill, an RPE under 6
  or an RPE drop that doesn't name the floor anywhere in the text, a notes card that isn't HTML.
- **⚠️ Later cycles: every exercise inside a working circuit needs a logged working weight
  already** ("any exercise new to that client, even in a later cycle"). A **variant** of a
  movement the athlete has logged counts as known (rotation by variant, 2026-09-26); a genuinely
  new pattern does not. Check the item against session history, The Ceiling and the Exercise
  Ledger; one without a number comes out of the circuit and runs as straight sets this cycle.
  Flag it to Amir rather than silently rebuilding.
- Report any structural violation and fix before finishing. (In Part A, Step 4's names and Spine
  drafts run BEFORE this check, so every card already has its `exId`.)

## Step 3b — ONE review, new athletes only (Part A; 2026-09-25, moved before engage 2026-09-26)
Once the build checks pass, a **NEW athlete's** programme gets ONE reviewer: one agent (the Agent
tool), working from files only. Give it the paths to the brief, the spec, the built
`data/<id>.json`, the check output and `.claude/COACHING-PRINCIPLES.md` (tell it to read the
rule index, then the Intake & assessment and Exercise selection stories in full, and to cite
every must-fix by rule ID), and say in so many words: *do not call the database or
any MCP tool* (PRC-5). Its job
is only what a script cannot judge: the injury logic against the brief, exercise choice and
transfer, whether a fallback is safe for THIS athlete, whether week 1, the back-off and the
outside days are dosed sensibly, and what the notes must cover (the period card, an arm or knee
menu), as keys added to the spec's `obligations:` list, which engage then writes to. Apply every must-fix, re-run the build check, then hand
to engage.
**A RETURNING athlete gets no reviewer** unless Amir asks for one. The coaching log, the
checks and his checkpoint already cover a cycle that continues a known logic.

## Step 4 — Normalize exercise names and draft new Spine entries (Part A, before the check)
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
own. Every exercise AND every circuit item must resolve to an entry in `public.exercises`, and
that entry must be **`approved` with cues**, or the athlete sees a card with no cues at all
(`get_exercises()` serves approved entries only). Step 3's `--spine` run already checked this
with ONE query (`--spine-sql`): it FAILs an id with no entry, an entry with no cues, or a quality
outside the ten, and lists the drafts. Don't look entries up one by one.
**A new exercise goes INTO the library, in full, and stays in the programme** (Amir, 2026-09-25:
*"if there is any exercise that is outside of the exercise library, after its prescribed for any
athlete, it should be added to our library, with all the cues and other details like the ones
already there"*). Never swap one out because it has no entry. Add it with `/spine`: three cues
written for anyone, and every field the existing entries carry (purpose, on-court line, equipment,
body parts, links both ways, SFR and flags), qualities from the ten and a pattern from the library's
list, never a new pill of either kind. Only an approved
entry reaches the phone, so the new entries are one question in the handoff: *"approve these N so
their cards show cues?"* Approve only on his word (he said *"Approve them"* for the first seven).

**Then act on the output:**
- **Mechanical → FIX in-file now** (deterministic, no judgment): strip the `Bodyweight` prefix;
  remove `()` `:` `,` (if the qualifier carried meaning: a grip goes to the pill; a variant that
  changes the exercise, like "(short lever)", is its own exercise with its own entry; anything else
  is the Coach's Note); snap spelling/
  casing to the library's canonical key whenever `MISS -> canonical:` shows one. Edit the JSON,
  then **re-run until clean** (every line `OK`/`GAP`, no `[FIX]`, no fixable `MISS`).
- **Judgment → SURFACE to Amir, never silently invent:** a true `MISS (not in library)` is a new
  movement: draft it into the Spine NOW with `/spine` (in full, so its card gets an `exId` before
  the check; its video comes when Amir films it), an exercise that looks like the *wrong*
  movement, or a corrective/postural drill with no noted indication (per COACHING-PRINCIPLES).

`GAP` = in library, no video yet (fine, ship it). Validate JSON again after any name edit.

## Step 5 — Archive the cycle rationale (coach-only, append-only) + update the profile and the Exercise Ledger
Persist the **COACHING LOG ENTRY** from /program-design — the coach-only record of WHY this
cycle looks the way it does (the read, decisions, ledger changes, the volume tables, the special
weeks).
⚠️ **The record is the `public.coaching_logs` row, not a file.** Coach-only, read from
coach.html → athlete → File; Step 7 (*The coaching log goes to the server too*) has the
splice. Read it with `select body from coaching_logs where athlete_id = '<id>'`. The old
`.claude/coaching-log/` folder (and the README it named) is gone: it was git-tracked in this
PUBLIC repo, world-readable, which is exactly why the log moved; never re-create it in git.
The athlete app never reads the log. The entry template is /program-design's COACHING LOG ENTRY.
- **No row (new athlete):** insert one with the header (`# Coaching Log — <First Last> (<id>)`
  + the coach-only note), the `## Athlete profile` section (below), an empty **Exercise Ledger** table (header row only:
  `| Exercise | Status | Last cycle | Note |`), then `## Roadmap — <date>` with /program-roadmap's
  exit tests and ROADMAP RATIONALE, then the entry.
- **Row exists (returning):** **append** the new `## Cycle NN — …` section to the end.
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
  it. Counting convention: VOL-10.
- **⚖️ The athlete profile — write this cycle's, in place (2026-09-26).** The spec opens with
  the current ```` ```profile ```` block; it goes into the log as the `## Athlete profile` section,
  right after the header and before the Exercise Ledger, **replacing** the old one (like the
  ledger, it is current state, not history; each cycle's entry says what changed and why). A log
  that has none yet (every athlete before 2026-09-26) gets it inserted there, at that athlete's
  next cycle, never in a bulk write. Splice, don't retype: replace the text between
  `## Athlete profile` and the next section heading or the ledger's `| Exercise` header row with
  `substring()`, then check the
  rest of the body's md5 is unchanged. The format, one `key: value` per line (made-up values):
  ````
  ## Athlete profile
  ```profile
  aim: sport                 # sport | strength-muscle | general (strength-muscle = the 10-set floor)
  sport: padel
  sex: male · age: 34
  training-age: 5 years in a gym; demonstrated: strong on machines, new to free weights
  goals: 1 a faster first step · 2 a knee that lasts three matches a week · 3 lose 4 kg
  bottleneck: single-leg strength on the bad side
  days: 3 gym
  minutes: form 60 · logs 70 · hard stop: no
  cap: 70                    # what design aims at: the real minutes, or form + 15 for a new athlete
  equipment: commercial gym
  proven: -                  # the evidence that lets an exercise go past 4 sets, or -
  bans: jump, depth, deep squat   # words the checker looks for in names and fallbacks
  floor-except: -            # a major muscle excused from the floor, with the reason
  injuries: right knee, managed (patellar tendon) · low back, resolved
  dislikes: burpees
  recovery: sleep 6 h, poor · stress moderate · life load high
  language: English
  updated: 2026-09-26 · /program-design, Cycle 3
  ```
  ````
  `scripts/check_program.py` reads `aim`, `proven`, `bans`, `floor-except` and `cap` from it and
  sets its own flags, so no run has to remember them. No athlete names or ids inside it beyond
  the log's own header; it lives in the coach-only row.
- **Exercise Ledger — apply design's "Exercise Ledger Updates" deltas.** Unlike the cycle
  sections, this table (sitting right after the file header, before the first `## Cycle`
  section) is mutated in place every cycle — it's a current-state index, not a historical
  narrative, so there's nothing to preserve by appending. Add a row for any exercise seen for
  the first time; update `Status`/`Last cycle`/`Note` for every exercise design flagged as
  changed. If the file predates the ledger (an athlete whose log started before this existed),
  backfill it from this cycle's exercise list only — don't reconstruct earlier cycles from
  memory, just start the table clean from here. Format: `| Exercise | Status | Last cycle | Note |`;
  Status in use across the live logs: Active · Available · Paused · Disliked · Pain-flagged ·
  Banned · Retired-equipment · Retired-space (the README that used to
  hold this was deleted with the old `.claude/coaching-log/` folder).

## Step 6 — COACH HANDOFF BRIEF (mandatory, never skip, never bury)
**Amir's standing order (2026-08-08).** Before shipping, print a clearly-headed section in chat
telling him everything the program now requires of *him*. This is a to-do list he can act on, not
a recap of the programming — he must never have to reverse-engineer his own responsibilities out
of the design write-up (PRC-12). Cover, one line each, each with its reason:
*Build these lines from the spec's `obligations:` list (2026-09-26): every film, weigh-in,
pain-ladder, double-day and period obligation is a line below, so nothing the athlete was told to
do is missing from what Amir is told to watch.*
- **MEASURE** — every number he or the athlete must collect, how often, and what it feeds.
- **GATE** — every progression gate, and *exactly* what clears it (never the athlete's word).
- **FILM** — every filmed set he must review, by when, and what is blocked until he clears it.
- **DATES** — every date-stamped escalation: referrals, appointments, checkpoints, expiries.
- **WATCH** — trigger conditions that fire a deload, a stop, or a referral.
- **WEEKS** — the week-1 and back-off notes exactly as the athlete will read them, with their
  dates. The app shows them on their own in that week, so he should know what they say.
- **QUALITY** — the day-card words, and if the headline is outside the week's top two, your
  recommendation (Amir, 2026-09-26: *"report it, but recommend what you think should happen"*).
- **SPINE** — the Step 8 upkeep report: drafts added, gaps filled, proposals for him, and the
  entries this programme uses that still need his approval.
- **⚠️ MY CALLS** — every decision made on his behalf: anything that **overrides** something he
  said, **extends** it past what he actually approved, or **fills a gap** he never ruled on.
  State it plainly and offer to reverse it. This section is the whole point; put it last so it
  lands, and never let it be implied rather than written.

**New Spine entries are asked about HERE, before Step 7** (2026-09-26): a draft entry's card shows
no cues until Amir approves it, so a returning athlete (who already has a login) would open blank
cards. Put *"approve these N so their cards show cues?"* at the top of the handoff and publish once
he answers, or publish now only if he says the cards can wait.

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
   or `rounds` for a circuit), give it `"id": "prog<N>"` (N = the finished cycle's number),
   put it FIRST (`jsonb_build_array(entry) || coalesce(data->'programHistory', '[]')`, never
   append), and bump `currentCycleIndex` in the same statement. This is strictly better than sending your local copy: the archive
   is then provably what the athlete actually had, not what your file says they had.
2. **`jsonb_set(data,'{workouts}', $W$…$W$::jsonb)`** — the new cycle's days.
3. **`jsonb_set(data,'{notes}', …)`**, plus `{cycles,N}` for the current cycle's
   `message`/`focuses`/`weekNotes` and `{cycles,N+1,teaser}`. These fit comfortably in one call.

**New athlete (no `workouts` on the row yet).** Skip 7.1: there is nothing to archive and the
index stays 0. The row may hold only `athlete` and `sport` from intake, or not exist at all, and
`jsonb_set(data, '{cycles,N}', …)` does NOTHING on a path that is not there. So write the
missing keys by merging, not by path: `update programs set data = data || jsonb_build_object(
'currentCycleIndex', 0, 'cycles', $C$…$C$::jsonb, 'workouts', $W$…$W$::jsonb, 'notes', $N$…$N$::jsonb)`
(or `insert` the whole object when there is no row), then verify every key is present.

**Dollar-quote everything** (`$W$ … $W$`) and check the payload does not contain your tag.
Apostrophes are everywhere in athlete-facing copy and single-quoting will shred it.

**Generate each statement with a script written by the Write tool, then read it back and run
it verbatim.** Never build SQL inside a Bash heredoc: Git Bash halves backslashes there, and a
`regexp_replace(…, '×\1 Rounds')` arrived as a control character (caught before it ran,
2026-09-26). Count control characters in the generated file before running it.

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
**Don't hand-write it: `python3 scripts/check_program.py data/<id>.json --fingerprint`** prints
the local fingerprint (md5, leaves, characters) AND the exact SQL that computes the server's the
same way (every leaf with its path, sorted bytewise). Run that SQL once; the two lines must
match. Proven 2026-09-25 on a live programme: the same md5, 509 leaves and 19,004 characters on
both sides.

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
- **Node 24 and npm ARE on this machine** (`C:\Program Files\nodejs`, on the Bash PATH;
  `node --version` gave v24.14.1 on 2026-09-26). They arrived around 2026-09-20 with the reel
  tools, after a 2026-09-19 check had rightly found neither. So the `node -e` snippets above
  (Steps 3 and 4) run as they are, and so does the pre-commit hook's `node scripts/check_rx.js`.
  Python 3.14 is here too. `gh` is still NOT installed, so ship by local merge.
- Commit + push **only if Amir asks**. `data/` and `.claude/coaching-log/` are both
  gitignored; there is normally nothing to commit at all.

## Step 8 — Spine upkeep, what's left (every programme, the last thing you do)
Part A already drafted every new exercise (Step 4), so this is the rest: links, body parts,
qualities on approved entries as suggestions, better cues as proposals.
Amir, 2026-09-24: *"when i write or update a program, and there are movements that are not there,
or missing some info, or can be updated, it should be updated there at the end … so everytime i
write a program for an athlete, this gets more complete."* Run **`/spine` → Upkeep** on this
athlete's programme: draft every exercise with no entry, fill every empty field (video, alias,
equipment, regressions/progressions/alternatives, SFR, flags, **qualities**, **body parts**: `loads` +
`impact`, which the athlete sees as *Body parts involved*), stamp `exId` on every card that resolves,
link a new exercise to its regressions, progressions and alternatives from both sides, apply design's `spine_cue:` lines to drafts
and propose them for approved entries, and put the one-line **SPINE** report in the handoff brief.
Never approve an entry, and never put anything about this athlete on one.

**Then the two checks that read the finished programme** (both 2026-09-24):
- **Quality Map.** Per day, the top three qualities (working sets × primary 1 / secondary ½, prep
  blocks skipped): that is what each day card on Home will say. And the cycle's headline (`art`
  word) should be in the week's top two unless it is `bedrock`, `peak` or `reset`; when it isn't,
  it is a WARN, reported with your recommendation, and never a reason to add volume. Report both as one
  **QUALITY** line: `Day 1 Strength · Brakes · Spring | Day 2 … | headline iron ✓`. A day under
  70% tagged shows nothing on the phone, so it is a gap to fix in the upkeep above.
  Step 3's `check_program.py --spine` run already printed both, on phones now and once the
  drafts are approved: copy its lines rather than counting by hand.
- **Because.** The cycle carries 5–10 `why`s, each on an exercise that is in this programme, none
  carried over from last cycle. `Chips.auditWhy()` / `auditWhyProgram()` clean (Step 3).

## Don'ts
- Don't change any prescription — you assemble, you don't design.
- **Don't touch the app.** No edit to any `.html` page or `assets/js/*` while assembling, correcting
  or delivering a programme; an idea or a bug seen on the way goes in the handoff for Amir to decide
  (Amir, 2026-09-25: *"when you write a program and you deliver, dont touch the html file"*). The
  library is the one thing outside the programme a run may change: a new exercise added in full.
- **A correction changes only what Amir named.** Fixing grips does not rebuild a day, rename a
  section or rewrite a note (2026-09-25: *"why did you changed her program and removed some of the
  exercises?"*).
- Don't add, reuse or regenerate an `athlete.key`, and don't hand out a `?client=&key=`
  link — that whole mechanism is retired and a key written today authorises nothing.
  Athletes sign in with a username and password Amir creates from coach.html.
- Don't write athlete chat/health detail or coach reasoning into `data/<id>.json` or any
  **published** path — the design rationale's only home is the coach-only
  `public.coaching_logs` row (never the athlete JSON). The local
  `.claude/coaching-log/<id>.md` is a gitignored working copy of that row, nothing more.
