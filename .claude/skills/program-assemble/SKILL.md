---
name: program-assemble
description: Mechanically build a designed programme and publish it to public.programs (the server is the only copy that counts), in TWO parts. Part A, straight after /program-design and before /program-engage, builds the workouts, runs every programming check and goes straight on to /program-engage when the build passes. Part B, after /program-engage and Amir's "ship it", places the words, runs the full checks, writes the coaching log and publishes. Use when Amir says "build the json", "assemble", "write her file", "ship it", or when design hands over a spec. Handles cycle advancement (archive prior cycle, bump currentCycleIndex) for returning athletes and fresh-file creation for new ones. This is the mechanical step — it keeps formatting/JSON work out of the design pass.
---

# Assembler — build, check, publish (mechanical)

Turn the **program spec** (/program-design) and the **engagement text** (/program-engage)
into the athlete's programme in `public.programs`, matching `SCHEMA.md`. This stage is
deterministic plumbing — it makes no coaching decisions. Unsure of a field? Look it up in
`SCHEMA.md` by its heading; don't read the whole file (76 KB). A local `data/<id>.json` may be
built as a scratch copy to lint and diff; it is never the source of truth and never committed.
Run Python as `python` on Amir's PC (`python3` there is the Microsoft Store stub) and as `python3`
in a cloud session.

## The two parts (2026-09-26)
Until 2026-09-26 everything below ran after engage, so a FAIL that changed an exercise left the
notes, Becauses and WhatsApp text describing the old programme, and the Spine gate (Step 3) could
not pass until the drafting (Step 8) had run. Now:

**Part A — build and check. Straight after /program-design, BEFORE /program-engage.**
Step 1 · Step 2a–2e (the workouts, with `exId` stamped from the design pull; `weekNotes` carries
design's numbers, no words yet) · Step 3 with `--stage build` (it also resolves every card name) ·
Step 4 (act on the names: stamp, snap, rename to the entry's name, or draft a new exercise into the Spine, then re-run
Step 3) · Step 3b (a new athlete's one review). A FAIL here is a design decision to revise: change
the spec and the log entry together, rebuild, re-check. If a FAIL overturns something Amir settled
at the checkpoint, it goes in the handoff under MY CALLS.
**Then go straight on to /program-engage** (PRC-4, Amir 2026-09-27: no "do prompt 2" in between)
when the build passes with 0 FAIL and nothing overturned a checkpoint answer. If something did,
stop and show Amir first. Engage writes against the programme that passed.

**Part B — finish and publish. After /program-engage and Amir's "ship it".**
Step 2f (place the words) · Step 3 in full (`--stage final`) · Step 5 (the coaching log entry) ·
Step 6a (before publishing: OBLIGATIONS, MY CALLS and the new Spine entries' approval question) ·
Step 7 (publish) · Step 8 (Spine upkeep, on the published row) · Step 6b (the closing SPINE and
QUALITY lines, last). A programming FAIL in Part B means the programme changed after Part A: go
back to Part A, not to the text.

## Step 1 — New or returning: from design's context pull
`ctx.row.has_workouts` from /program-design's one pull (its `queries.sql` Q1) already says it, so
don't ask again (PRC-6): workouts → **RETURNING** (the cycle advances, Step 7); no row, or a row
with no workouts (intake's identity, and the roadmap once it locked) → **NEW** (Step 7, *A new
athlete*). A file test calls everyone NEW (`data/*.json` is deleted). Only when assemble runs
without design's pull in this chat, run Q1 itself rather than a separate lookup.

## Step 2 — Build the JSON
This stage owns ALL serialization the design spec deliberately left out — section
titles/icons, the vivid `focusTag`, names. The spec gives you decisions; you render them.

⚠ **The prescription is no longer one of them.** Since 2026-09-20 the app stores a
prescription as DATA (`rx`), and design's dose fields already ARE that data — so this stage
copies them, it does not render them. There is no chip formatting left to get wrong.

**2a — Structure.** `workouts.label` = `Program 0N · <Cycle Name>`; `workouts.days[]` from
the spec. Each exercise → `type` + `rx` (+ `intent`/`note` where the spec has them; never `setup`, CHP-1);
circuits → `rx.rounds` + `items[]`. **Write NO `cues`, on any exercise or circuit item** (Amir,
2026-09-24: *"the aim is to use these cues for all the exercises that everyone has from now on"*).
The app draws every card's cues from its Spine entry, circuit items included (SCHEMA "`exId` and
the Spine"). Something only this athlete needs arrives as engage's Coach's Note (`note`), never
as a cue. **Stamp `exId`**
on every exercise whose name resolves to a `public.exercises` entry (approved or draft), so the
card follows the id even if the name is edited later. `sport.badge` ← design's `SPORT_BADGE` line.
Leave `videoUrl` out: the app plays the card's Spine entry's video (found by `exId`, then by name). Set it only for a video that belongs to this card alone. The words come in Part B (2f).
- **Set `type` from the design category** (the spec never emits it): standard grinding lift
  / ballistic / loaded carry → `"standard"`; working or prep circuit → `"circuit"`; warm-up
  `simple` item (bike, mobility drill) → `"simple"`.
  **A superset/complex is always `"circuit"`** — if the spec pairs two (or more) exercises as
  a superset, the whole pair becomes ONE circuit block: one `name` and `rx: {rounds, rest, rpe}` (one RPE for
  the whole round, SES-13), each paired exercise its own `items[]` entry with its own `rx`
  (`{"reps": N}`), no per-item tempo or RPE.
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

**Rest belongs to the BLOCK when a section shares one (CHP-7).** Write `"rest": 120` on the block and
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

**Never restate the tempo in `intent` (CHP-6).** `"3s eccentric"` beside `"tempo": "3-1-1-0"` is the
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
single "Strength" block (SES-9).

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

**RETURNING — the cycle advances on the server.** `publish_cycle()` (Step 7) builds the finished
cycle's archive entry from the live row, puts it FIRST in `programHistory` with its `id`
(`prog<N>`), and bumps `currentCycleIndex`, so the archive is never built by hand (it was, and on
2026-09-24 five athletes' "Done" cards were wrong: three stored newest-last, two with no `id`). The
local file needs:
1. The new cycle's `workouts.days`.
2. **`currentCycleIndex` + 1**: the fingerprint covers it, and the checker's continuity checks and
   new-athlete switch read it. `programHistory` is not in the fingerprint: leave it as it was.
3. The roadmap's `cycles[]` as it is on the row (`ctx.row.cycles`), plus this cycle's patch.
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
- Full skeleton, `currentCycleIndex: 0`, `cycles[]` exactly as the row holds them (the roadmap
  was saved there when it locked, PRC-3), and the `athlete` block (`id`, `firstName`, `lastName`,
  `boardName`) exactly as /athlete-intake registered it. **No key** — that mechanism is retired;
  see /athlete-intake Step 3.
- Confirm instead that the athlete already has a `public.programs` row (intake creates
  it, and it is what puts them on the roster). Publishing then updates that row rather
  than inventing a second identity for the same person.

**2f — Part B: place engage's words** (after /program-engage), **matched by `exId`**: engage tags
every Coach's Note and Because with the card's id (Part A stamped one on every card); the name is
only the fallback for a card with none. The full check warns when the spec's `note_flag`/`why_flag`
count and what landed on the cards differ, which is how a dropped or invented one shows.
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
- **`scripts/check_program.py`: the house rules, as a script** (2026-09-25; Python, plus node for
  the app's own rx and Because rules, so it runs on Amir's PC too). It reads the built file, the
  spec and the Spine file, whose lines carry each exercise's muscle credits and cost, so it
  **counts the volume itself** (2026-09-26: the hand-typed table and `--log` are retired):
  ```
  python scripts/check_program.py data/<id>.json --spine-sql      # prints ONE query: run it
  # save the query's result EXACTLY as returned (the JSON the tool returns loads directly). It
  # carries checksums: a copy that differs from the server's answer stops the run. Then:
  python scripts/check_program.py data/<id>.json --stage build --spec <scratch>/spec.md \
      --spine <scratch>/spine_<id>.json --tables <scratch>/volume_<id>.md
  # Part B: the same command without --stage build (the default is the full run). Re-run
  # --spine-sql only when a card's name or exId changed or an exercise was added.
  ```
  The one query also resolves every card NAME on the server (exact name, else a loose
  match) for Step 4, and brings last cycle's modelled and logged minutes for the time check. Save
  only this result: never the design pull's 39,000-character catalogue (2026-09-27).
  `--tables` writes the log's Volume & Dose tables (per exercise, per muscle, per-day load); Step 5
  pastes the file from the LAST run. A count that looks wrong is its Spine entry's (fix it via /spine
  Upkeep, a proposal on an approved entry), never a hand edit of the table.
  **The spec sets the flags**: its athlete profile turns on `--floor` (aim: strength-muscle),
  `--proven`, the bans, `floor-except` and the cap; its `week:` line turns on the back-to-back
  check; a first cycle switches the new-athlete rules on by itself. Type a flag only to override
  one, and `--no-backoff` only on Amir's word. **Fix every FAIL and re-run until 0 FAIL; read every
  WARN.** Every message starts with the rule it enforces (`[VOL-8]`), and the rule index's Check
  column is the list of what the script covers, so it isn't repeated here. Two WARNs are soft by
  design: a Quality headline outside the week's top two (PRC-24: report it with your
  recommendation) and a day past the cap (SES-7). It prints what the handoff needs: minutes per
  day, sets per muscle and the **QUALITY** line. The JSON parse, the rx shape checks and the
  Because audit (`Chips.auditWhy`) run inside it, so there is no separate node step any more.
- **Coaching lint** (still yours: the script can't judge these): every `standard` has sets, a dose
  and an RPE unless the movement says otherwise; rest sits on the block when the section shares
  one, on the exercise only when it differs; a tempo only where the spec gave one; ballistic work
  and carries omit tempo and carry an `intent`; section titles use the standard names
  (Primary/Accessory/etc, never "Strength"). A rep range in the spec means stop and ask (PRG-6):
  never pick an end yourself.
- **⚠️ Later cycles: every exercise inside a working circuit needs a logged working weight
  already** (SES-11). A **variant** of a movement the athlete has logged counts as known (rotation
  by variant, 2026-09-26); a genuinely new pattern does not. Check the item against session
  history, The Ceiling and the Exercise Ledger; one without a number comes out of the circuit and
  runs as straight sets this cycle. Flag it to Amir rather than silently rebuilding.
- Report any structural violation and fix before finishing. (In Part A the first run also reports
  every card's name against the Spine for Step 4; re-run it after Step 4's stamps and drafts.)
- **Keep the output**: the rule IDs that failed (and were fixed) and the WARNs left standing go on
  the log entry's `Checks:` line (Step 5).

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

## Step 4 — Names and new Spine entries (Part A, from the check's output)
Names from /program-design are rough by design — **this is the correction pass** (NAM-1 to NAM-9;
the Spine is the name and video source since 2026-09-26). Stamp each card's `exId` while building
(the design pull's spine lines carry every id). Step 3's check then reads every card name against
the Spine on the server, so the catalogue is never copied into a file (until 2026-09-27 this was a
node scan over a 39,000-character copy). Act on what it prints:
- **Mechanical, fix in the file now:** a `NAM-2` or `NAM-4` FAIL (a "Bodyweight" prefix; brackets,
  colons or commas: a grip goes to the pill, a variant that changes the exercise is its own entry,
  anything else is the Coach's Note) · `no exId: the Spine has it as <id>` → stamp it ·
  `no exId: … the nearest is <Name> [<id>]` → use that name and id when it is the same movement.
- **Judgment, surface to Amir, never silently invent:** `no exId: not in the Spine by that name` is
  either a movement the Spine has under another name (stamp that id AND rename the card to the entry's name:
  one name, no alias, NAM-8) or a
  new movement: draft it into the Spine NOW with `/spine`, in full, so its card gets an `exId` before
  the check · a `NAM-8` WARN (the card's name is another entry's) · an exercise that looks like the
  *wrong* movement · a corrective or postural drill with no noted indication (SEL-14).
- A `NAM-8` WARN "the card is not named as its Spine entry" is a rename, done here before publishing (Amir,
  2026-10-09: one name, the Spine's; a different version is its own entry, via `/spine`).
Re-run `--spine-sql` and the check after stamping or drafting, until the names are clean.

**The Spine is a publishing gate**, because the cards carry no cues of their own. Every exercise
AND every circuit item must resolve to an entry that is **`approved` with cues**, or the athlete
sees a card with no cues at all (`get_exercises()` serves approved entries only). The check FAILs an
id with no entry, an entry with no cues, or a quality outside the ten, and lists the drafts. Don't
look entries up one by one.
**A new exercise goes INTO the library, in full, and stays in the programme** (NAM-9, CUE-5). Never
swap one out because it has no entry. Add it with `/spine`: three cues written for anyone, and every
field the existing entries carry (purpose, on-court line, equipment, body parts, links both ways,
SFR and flags), qualities from the ten and a pattern from the library's list, never a new pill of
either kind. Only an approved entry reaches the phone, so the new entries are one question for Amir
before publishing (Step 6a): *"approve these N so their cards show cues?"* Approve only on his word.

An exercise whose Spine line in the design pull says `novideo` is fine to ship: it goes on the
handoff's film list.

## Step 5 — Archive the cycle rationale (coach-only, append-only) + update the profile and the Exercise Ledger
Persist the **COACHING LOG ENTRY** from /program-design — the coach-only record of WHY this
cycle looks the way it does (the read, decisions, ledger changes, the volume tables, the special
weeks).
⚠️ **The record is the `public.coaching_logs` row, not a file.** Coach-only, read from
coach.html → athlete → File. Step 7's `publish_cycle()` writes it (the profile, the ledger and the
new entry, in the same call as the programme), so there is nothing to read back first: design's
pull already holds the head and the latest cycle. The old `.claude/coaching-log/` folder is gone:
it was git-tracked in this PUBLIC repo, which is exactly why the log moved; never re-create it in
git. The athlete app never reads the log. The entry template is /program-design's COACHING LOG ENTRY.
- **A new athlete's log exists since the roadmap locked** (PRC-3: the header, the profile draft, an
  empty Exercise Ledger and `## Roadmap — <date>` with the exit tests and rationale), so their first
  entry goes in exactly like a returning athlete's. Only a new athlete whose roadmap locked before
  2026-09-27 may have no row: then `p_log_new` carries the whole first log (Step 7).
- **Append** the new `## Cycle NN — …` section to the end. **Never edit, reorder, or delete any
  existing cycle section** — this archive is append-only, so a cycle's original reasoning survives
  even after the program is later changed (it grows in lockstep with `programHistory` /
  `currentCycleIndex`). A `## Debrief — Cycle NN …` section (the end-of-cycle review) may sit between
  two cycle sections: it is not a cycle section, never edit or move it, and the new cycle goes after it.
- Heading: use the cycle number + name from `cycles[currentCycleIndex]` and today's date.
- **`Checks:` — one line in the entry** (2026-09-26, from the audit): the rule IDs the check runs
  failed on and were fixed, and the WARNs left standing, e.g. `Checks: fixed VOL-8, SEL-7 · left
  PRC-24 (reported), SES-7 (72 min, soft cap)`. After eight cycles it shows which checks earn
  their place.
- **⚖️ The Volume & Dose section carries BOTH set-count tables and the day loads with their
  minutes** — standing order from Amir (2026-09-08): *"whenever you calculate the sets, add that
  table to the athlete coaching log so i can see."* They are the file Step 3's last run wrote with
  `--tables`: replace the design's `<the checker's tables>` line with it, as written, above the
  design's framing lines. Counting convention: VOL-10.
- **⚖️ The athlete profile — write this cycle's, in place (2026-09-26).** The spec opens with the
  current ```` ```profile ```` block; `publish_cycle(p_log_profile)` puts it in the log's
  `## Athlete profile` section, **replacing** the old one in place (or adding the first one before the
  ledger) and moving nothing else. The format, the academy tier and `status: partial` are in
  `program-design/PROFILE.md`. A log that has none yet gets one at that athlete's next cycle, never in
  a bulk write.
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
of the design write-up (PRC-12).

**It comes in two parts** (2026-09-27): **6a, before publishing** (Step 7): the OBLIGATIONS block
and its self-check, MEASURE, GATE, FILM, DATES, WATCH, the new Spine entries' approval question and
MY CALLS; and **6b, the very end, after Step 8**: the SPINE and QUALITY lines. The SPINE line comes
from the upkeep, which reads the published row, so it cannot be ready before publishing.

**6a opens with the OBLIGATIONS block, built from the spec's `obligations:` list, not written from
memory** (2026-09-26; COM-9). One line per key, **the same keys in the same order as the list**, each
saying what it asks of Amir and where the athlete reads it:
`<key> → <what Amir does, by when> · athlete reads: <card TITLE | Week 1 note | Back-off note>`.
What each key asks of him:

| key | Amir's line |
|---|---|
| `backoff`, `week1` | the week's dates and the week note exactly as the athlete reads it (this was WEEKS) |
| `film` | what to film, which weeks, when he reviews it, what stays blocked until he clears it |
| `weigh-in` | how often, what number moves what, where it shows in coach.html |
| `pain-ladder`, `modification-menu` | the step that makes him act (a stop, a swap, a referral) |
| `low-readiness`, `double-day` | the pattern that should make him check in (e.g. three low days in a week) |
| `period` | the dates it applies and what changes |
| `start-lower` | the number, and the test that moves it back to the card |
| `explainer`, `close-loop`, `win` | nothing to do: say so (`nothing to do, card "<title>"`), so the count still matches |

Then the self-check, one line, printed under the block:
`OBLIGATIONS CHECK — spec lists N · handoff lines N · same order ✓ · every key but backoff/week1 is a
tagged card ✓ · WhatsApp message 2 lines N ✓`. Any mismatch is fixed before Step 7, never explained.

**Then the rest, for what the obligations list does not already cover**, one line each with its
reason (an obligation is never repeated here):
- **MEASURE** — every number he or the athlete must collect, how often, and what it feeds.
- **GATE** — every progression gate, and *exactly* what clears it (never the athlete's word).
- **FILM** — every filmed set he must review, by when, and what is blocked until he clears it.
- **DATES** — every date-stamped escalation: referrals, appointments, checkpoints, expiries.
- **WATCH** — trigger conditions that fire a deload, a stop, or a referral.
- **WEEKS** — now the `backoff` and `week1` lines of the OBLIGATIONS block (the app shows each on
  its own in that week, so he should know what it says).
- **⚠️ MY CALLS** — every decision made on his behalf: anything that **overrides** something he
  said, **extends** it past what he actually approved, or **fills a gap** he never ruled on.
  State it plainly and offer to reverse it. This section is the whole point; put it last in 6a so
  it lands, and never let it be implied rather than written.

**New Spine entries are asked about in 6a, before Step 7** (2026-09-26): a draft entry's card shows
no cues until Amir approves it, so a returning athlete (who already has a login) would open blank
cards. Put *"approve these N so their cards show cues?"* at the top of 6a and publish once he
answers, or publish now only if he says the cards can wait.

**6b, the closing block (after Step 8), two lines:**
- **SPINE** — the Step 8 upkeep report: drafts added, gaps filled, and the entries this programme
  uses that still need his approval. **Proposals** on approved entries are read back from `/spine`'s
  pending list (`exercise_coach.suggested_changes`): this run's new ones and every older one still
  waiting, each `entry: field old → new`, with one question, yes or no on each? Never retype them
  from memory: the list is the record, and an unanswered one comes back next run.
- **QUALITY** — the day-card words, and if the headline is outside the week's top two, your
  recommendation (Amir, 2026-09-26: *"report it, but recommend what you think should happen"*).

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

**One call publishes the whole cycle: `public.publish_cycle()`** (`supabase/stage38_publish_cycle.sql`,
2026-09-26; Amir: yes to *"publish a cycle in one database call instead of several approval
prompts"*). It replaced a staged publish of about six calls, each an approval prompt. In one
transaction, all or nothing, it:
- builds the finished cycle's archive entry **from the live row** (never from your file), puts it FIRST
  in `programHistory` with `"id": "prog<N>"`, and advances `currentCycleIndex` (`p_new_cycle => true`);
- writes the new `workouts` and `notes`; merges `p_cycle_patch` into the cycles it names (this cycle's
  `message`/`focuses`/`weekNotes`, the next one's `teaser`, and exactly what `roadmap_amend:` names,
  PRC-17); takes a whole roadmap (`p_cycles`) only when the row has none; sets `sport` if given;
- refuses to change the `athlete` block, to replace a roadmap that exists, or to patch a cycle that
  isn't there, with a message saying which;
- splices the coaching log: `p_log_profile` replaces the ```` ```profile ```` block in place (or adds it
  under `## Athlete profile`, before the ledger), `p_log_ledger` replaces the Exercise Ledger table, and
  `p_log_section` is appended; a first log comes whole in `p_log_new`. Nothing else in the body moves;
- returns the programme's content fingerprint and the log's md5 and length. The version trigger keeps
  ONE snapshot of the old row (`program_versions` holds only the last 20 per athlete).

**Build the call with a script written by the Write tool, then run it verbatim** (never in a Bash
heredoc: Git Bash halves backslashes, and a `regexp_replace(…, '×\1 Rounds')` once arrived as a control
character). Take every payload from the finished local `data/<id>.json` and the log entry, dollar-quote
each with a tag it does not contain, and count control characters in the generated file first:
```sql
select public.publish_cycle(
  p_athlete_id  => '<id>',
  p_workouts    => $W$<data/<id>.json → workouts>$W$::jsonb,
  p_notes       => $N$<… → notes>$N$::jsonb,
  p_new_cycle   => true,
  p_cycle_patch => $P${"<N>": {"message": {…}, "focuses": […], "weekNotes": {…}}, "<N+1>": {"teaser": {…}}}$P$::jsonb,
  p_sport       => $S${"badge": "…"}$S$::jsonb,
  p_log_section => $C$## Cycle NN — …$C$,
  p_log_profile => $F$```profile … ```$F$,
  p_log_ledger  => $L$| Exercise | Status | Last cycle | Note |…$L$);
```
`<N>` is the NEW `currentCycleIndex` (the old one + 1). **A new athlete**: `p_new_cycle => false` and
`<N>` = 0. Their roadmap and first log are already on the server (saved when the roadmap locked,
PRC-3), so the call is the same shape as a returning athlete's: `p_log_profile`, `p_log_ledger` and
`p_log_section`, no `p_cycles`, no `p_log_new`. Only a roadmap locked before 2026-09-27 may have left
no `cycles[]` or no log: then send the whole roadmap as `p_cycles`, and the first log (header,
`## Athlete profile`, the Exercise Ledger, `## Roadmap — <date>` with the exit tests and rationale,
the entry) as `p_log_new` instead of the three log arguments.

**Verify from its answer, not with more calls.** Its `fingerprint` must equal
`python scripts/check_program.py data/<id>.json --fingerprint` (md5, leaves and characters: the same
walk over athlete, sport, currentCycleIndex, cycles, workouts and notes), and the log must say
`"section_at_end": true`. A mismatch means a payload was not what the file holds. Fix it and send the
**programme only** again: `p_workouts`, `p_notes`, `p_cycle_patch`, `p_sport` and `p_new_cycle =>
false` (the cycle has already advanced), and **none of the log arguments, `p_cycles` or `p_log_new`**.
The log landed with the first call: sending `p_log_section` again appends the cycle's entry a second
time, and `p_cycles` or `p_log_new` are refused once the first call has run.
`select public.programme_fingerprint('<id>')` re-reads the row any time.

**`get_program()` will fail for you with `invalid athlete key`. That is correct.** The RPC
fails closed and the MCP connection is neither an athlete session nor a signed-in coach.
It reads `public.programs`, so a verified row IS what the app serves. Confirm the row, not
the RPC.

- Summarise the diff (cycle advanced N→N+1, days, swaps) and confirm both the programme row
  and the coaching-log row verified.
- Node 24 is on Amir's PC, so the checker's own node calls (the app's `chips.js`) run as they are.
- Commit + push **only if Amir asks**. `data/` is gitignored; there is normally nothing to commit.

## Step 8 — Spine upkeep, what's left (every programme, the last thing you do)
Part A already drafted every new exercise (Step 4), so this is the rest: links, body parts,
qualities on approved entries as suggestions, better cues as proposals.
Amir, 2026-09-24: *"when i write or update a program, and there are movements that are not there,
or missing some info, or can be updated, it should be updated there at the end … so everytime i
write a program for an athlete, this gets more complete."* Run **`/spine` → Upkeep** on this
athlete's programme: draft every exercise with no entry, fill every empty field (video,
equipment, regressions/progressions/alternatives, SFR, flags, **qualities**, **body parts**: `loads` +
`impact`, which the athlete sees as *Body parts involved*), stamp `exId` on every card that resolves,
link a new exercise to its regressions, progressions and alternatives from both sides, apply design's `spine_cue:` lines to drafts
and propose them for approved entries **on the pending list** (`/spine` → *The pending list*, so a
proposal outlives this handoff). Upkeep reads the published row, which is why it runs after Step 7.
Never approve an entry, and never put anything about this athlete on one. Then print the closing
block (Step 6b): the SPINE line and the QUALITY line below.

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
  carried over from last cycle, and Step 3's check ran `Chips.auditWhy()` on every one (COM-4).

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
  `public.coaching_logs` row (never the athlete JSON), and there is no local copy of it.
