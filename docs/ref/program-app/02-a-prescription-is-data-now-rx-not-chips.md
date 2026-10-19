## 📋 A PRESCRIPTION IS DATA NOW — `rx`, not `chips[]` (2026-09-20)

Amir: *"sometimes we have to write the time, in the reps chart … and sometimes the pills get
mixed up."* Both were symptoms of one thing: sets/reps/RPE/tempo/rest were stored as **display
strings** in `chips[]` and `parseChips()` pattern-matched them back into numbers at render time.

**The prescription is now `ex.rx`** — `sets` · one of `reps`/`time`/`distance`/`work` · `side` ·
`rpe` · `tempo` · `rest` · `rounds`. **An absent field means NOT PRESCRIBED**, and the card draws
no cell for it. Full spec: `SCHEMA.md` → "`rx` — the prescription". What that fixed, measured
before the change: **1,151 em-dashes** in the 42 free library sessions (237 of 352 exercises drew
a five-cell grid with four cells empty), **139 of 163** warm-up items across the live programmes
doing the same, and a duration filed under a cell labelled **REPS**.

**Four fields beside it, four meanings, four looks** — this is the fix for "pills get mixed up",
where one green pill stood for 121 different labels (a tempo said in words, equipment, an intent
cue, and occasionally a real dose):
`rx` → the line of numbers (the grid until 2026-09-27, *The working card*) · `setup` → quiet grey line (kit/position) · `intent` → **the** green pill (a grip
or ONE intention) · `note` → clay callout · `cues` → the cues list.
⚠ **A GRIP IS THE PILL, never the grey line** (Amir, 2026-09-25: *"grips should be a chip on the card
not a free text"*): `"intent": "neutral grip"`, the same pill his older cards draw for a grip chip.
The chip is the athlete's: never put a grip on a library entry. ⚠ **NO FLOATING TEXT** (Amir,
2026-09-25: *"i dont like floating text and remember this"*): no `setup` line on a programme card at
all; a detail for this athlete is the Coach's Note. `scripts/check_program.py` fails both.
**The ✎ editor keeps old chips** (fixed 2026-09-25, on Amir's *"if its a bug, fix it"*): `toRx()` used
to move an old card's leftover chips ("neutral grip") into Setup, and the editor's empty Setup box
then deleted them on the first save. Now every leftover chip stays in the pill. **The editor has no
Setup box** (removed the same day, *"yes remove the setup box"*): an old grey line opens at the start
of "Your note to them" and moves there on save. The library files' 54 grey lines became notes too.
⚠ **THE TEMPO IS ONE PART of the line of numbers, with the digit that carries the instruction in CLAY.**
`3-1-1-0`, notation intact (the word *tempo* shows only on an open card, and opens the guide), and
`tempoDisplay()` colours **the slowest phase when it is 2s or more, plus any non-zero pause** — so
`3-0-1-0` colours the 3, `2-1-1-0` the 2 and the 1, and `1-0-1-0` nothing at all. `iso` reads `Hold`.
**Four shapes were tried; do not re-litigate:** a plain cell (undecoded notation — hence 153
hand-written `3s eccentric` pills), a grey line under the grid (a footnote — *"it doesnt capture
the eye and it doesnt look professional"*), phase cells on a second row (*"i dont like the new
tempo"*), and now the notation back with its point coloured (Amir: *"if a number is important in
tempo highlight it with other color"*). **The rule that survived all four: SAY IT ONCE — never
restate the tempo in `intent`, `setup` or a cue** (a cue spelling the count out burns one of only
three; still true of 39 of 506 live exercises with a tempo).

**`block.rest` states a section's rest ONCE** — on the section header (`PRIMARY ——— Rest 2m`),
feeding every timer in the block, drawing no per-card cell. An exercise's own `rx.rest` overrides
it and keeps its place in the line of numbers. A Library session reads it the same way since
2026-10-01 (`openWorkout()` draws the same header; the training day's header is the other copy, so
change both). Before that the Library ignored it, which would have left a card with no rest cell and a
timer with no time. **Circuits carry `rx` too**: `rounds` is a NUMBER now (it was the display
string `"×2 Rounds"`, which is why the cell read *Rounds: ×2 Rounds*), and an item takes its own
`rx` when its dose is plain, keeping free-text `detail` when the wording carries more than a
number (*"15 sec, switch legs each round"*).

⚠ **REST IS NEVER INVENTED.** It used to fall back to 120s for any `standard` exercise, so all 26
cards in the demo claimed "REST 2m" while every `restSec` in it was `null` — a calf raise and a
back squat shown as identical, and a Pallof press told to sit for two minutes. Omit `rest` and
there is no rest cell; the timer button stays, labelled *Rest timer*.

⚠ **`rxOf()` / `repCount()` / `tempoDisplay()` EXIST TWICE** — inline in `program.html` (the offline
PWA, deliberately self-contained) and in `assets/js/chips.js` (which `coach.html` loads). Drift
means the coach's dashboard and the athlete's phone show different prescriptions for the same
exercise and **nothing errors**. `scripts/check_rx.js` runs fixtures through both copies and is in
`.githooks/pre-commit`. `chips.js` also owns the write side: `applyRx()`, `toRx()`, `auditRx()`.
⚠ **`rxOf()` returns a normalised VIEW, not the `rx` object**: `sets`, `rpe`, `tempo`, `rounds` as
strings, `rest` as seconds (a number, or null), and the dose as `dose: { kind, value, side, label }`. So `rxOf(ex).time` is
always undefined; read a duration from `dose.value` when `dose.kind === 'time'`. The Quality Map
minutes rule first shipped reading `.time`, passed a unit test fed raw `rx` objects, and was
caught only in the real page (2026-09-26). Test app code against real `rxOf()` output.

**Legacy `chips[]` is still READ, never written.** `rxOf()` parses it on the fly and recovers what
each number really was, so **the ~34 live programmes were deliberately NOT bulk-migrated** — they
already render correctly and better (the Supabase project has no automatic backups, and a
dual-read costs nothing). They convert one at a time, for free, whenever an exercise is saved from
**coach.html → ✎** or a new cycle is written by `/program-assemble`. The Train library WAS
converted in bulk (`scripts/migrate_rx.js`, git is the undo). Never author `chips[]` again, and
never leave `chips` sitting beside an `rx`.

**The public demo was converted on 2026-09-26** (Amir, Five Forks, fork 4 B: it is the one programme
every prospect sees): `rx` through the same `toRx()`/`circuitToRx()` the ✎ editor uses, `exId` on every
card, card cues and videos dropped wherever the approved Spine entry has its own, seven `why`s, a
`test` flag on the squat and the RDL, and the REC-2 *Rough Days* card; no set, rep, RPE or exercise
changed, and `program_versions` holds the old row. The two medicine-ball slams keep their own cues
until their draft Spine entries are approved. Every athlete still changes over at their next cycle,
and **until most have, no new exercise-card features** (same fork): the work goes to the Proof seam,
readiness and the weight boxes instead. The demo has no cycle dates in its row, so week-based features
could not show in it. **Since 2026-10-13 the app dates it when it opens** (Line Call, Second Serve X1; Amir's decision 7;
`dateDemoCycles()`, in memory only, never saved): the current cycle is in week 2 of 5, so Progress shows the This cycle card
and a week-2 note in the demo's row would lead Home (the note's words are Amir's to write). `?pane=sessions` and
`?pane=playbook` open that Library pane (the site's two "Step inside" doors use them), and the account sheet says *The demo
keeps your taps on this phone only. Nothing reaches me.* `scripts/headless/demo-coaching.js`.

**Writing a programme got shorter, which was the point.** `/program-design` already emitted plain
dose fields; `/program-assemble` step 2b used to convert them into chips under a page of rules
(`×`-prefix, style colours, chip order, "never put a dose in a modifier"). That step is now a copy.
**Reps are ONE number, never a range** (Amir, 2026-09-24: *"I don't prescribe rep ranges"* —
this reverses a 2026-09-20 note that said ranges ship as ranges). The set log pre-fills the
prescribed number and a tick means "done as written", so a range leaves the app guessing.
`auditRx()` flags one as `rep-range`. Thirteen legacy `chips[]` ranges still sit in three athletes'
live programmes; the app shows them as a range and records
reps only when the athlete types them, rather than inventing the low end.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
