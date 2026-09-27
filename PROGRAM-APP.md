# The athlete app (`program.html`) — how its programme features work

Moved out of `CLAUDE.md` on 2026-09-26: that file loads into every session, and this part is only
needed when changing the programme app or the pipeline. `CLAUDE.md` keeps a one-line tripwire for
each thing here that must never break; this file keeps the full account of what was built, why,
and the traps found on the way. Data shapes are in `SCHEMA.md`; the coaching rules are the rule
index at the top of `.claude/COACHING-PRINCIPLES.md`. The text is as it stood in `CLAUDE.md`, with
athlete ids replaced by plain descriptions (the repo is public).

## ⚖️ Body weight lives in `program.html` now — and is still NOT scored

⚠️ **MOVED OUT OF PROOF, 2026-09-12** (Amir: *"move the bodyweight tracker page from proof to
program.html and remove it from proof"*). The whole feature — card, history screen, chart,
logging, delete — is in `program.html`; `habits.html` has no weight UI at all, and its manual
section now just says where it went. **Free-tier athletes lose it**, which Amir chose knowingly:
they have no programme app.

**The data did NOT move.** The key is still `<id>_hab_wt`, so no athlete's history had to be
migrated and `coach.html`'s `weightPanel()` needed no change. What moved is *ownership*:
`program.html`'s `_snapshot()` carries one precise exception to its skip-all-`hab_`-keys rule,
and `habits.html` no longer pushes, merges or writes it. **Both apps share this origin's
localStorage, so Proof writing that key again would silently overwrite readings taken in the
programme app** — that is why `saveWt()` is a stub and the pull-side merge is gone.
`mergeStoredValue()` in `program.html` gained the union-by-date branch that used to live in Proof.

Everything below still holds — it is simply enforced in the other file now.

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
it and keeps its place in the line of numbers. **Circuits carry `rx` too**: `rounds` is a NUMBER now (it was the display
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
readiness and the weight boxes instead. The demo has no cycle dates, so week-based features (the
week notes, the retest nudge, "Week 3 of 5") cannot show in it.

**Writing a programme got shorter, which was the point.** `/program-design` already emitted plain
dose fields; `/program-assemble` step 2b used to convert them into chips under a page of rules
(`×`-prefix, style colours, chip order, "never put a dose in a modifier"). That step is now a copy.
**Reps are ONE number, never a range** (Amir, 2026-09-24: *"I don't prescribe rep ranges"* —
this reverses a 2026-09-20 note that said ranges ship as ranges). The set log pre-fills the
prescribed number and a tick means "done as written", so a range leaves the app guessing.
`auditRx()` flags one as `rep-range`. Thirteen legacy `chips[]` ranges still sit in three athletes'
live programmes; the app shows them as a range and records
reps only when the athlete types them, rather than inventing the low end.

## 🗓️ Week 1 and the back-off week are DATA — `cycles[n].weekNotes` (2026-09-26)

Every cycle is 4 loading weeks + 1 back-off, and the cards never change mid-cycle, so the back-off
used to exist only if a notes card said so. The pipeline audit that day found 16 of 34 live
programmes with no back-off wording and no drop in week-5 session RPE across 12 finished cycles.
Amir: *"update the app in a way that it can show first week or last week"*.
- **`cycles[n].weekNotes = { first?, last }`**, each `{ text, title?, setsDrop?, rpeDrop?, rpeCap? }`
  (SCHEMA.md → `weekNotes`). ⚠️ **Not `weeks`**, which is the "Weeks 1–5" label string; the first
  build used that name and would have broken every cycle card.
- **program.html `weekNoteHTML()`** shows the text (in the Coach's Note look) under **This Week** on
  Home and at the top of every session, only in week 1 and in the last week, from the same
  `cycleWeekInfo()` that draws "Week X of Y". Nothing after `endDate`, and nothing for a cycle
  without the field: the app never invents a back-off. The numbers never change a card on their
  own: only a lower day's target reads them, and the lower of the two wins (`dayRpe()`, below).
- **The pipeline owns it:** /program-design decides both doses as numbers (`week1:` / `lastweek:`),
  /program-engage writes the words (PART 3c), /program-assemble stores them, and
  `scripts/check_program.py` FAILs a cycle with no `weekNotes.last` (and a first cycle with no
  `weekNotes.first`). The 32 older programmes gain it with their next cycle, not by a bulk write.
- **The athlete profile** (same day): a `profile` block at the top of each coaching log (aim,
  goals, bottleneck, minutes/cap, kit, bans, injuries, proven…), kept current like the Exercise
  Ledger. Design copies it into the spec and the checker sets its flags from it. Older athletes get
  theirs at their next cycle. Format: `.claude/skills/program-design/PROFILE.md`.
- The same day `check_program.py` took Amir's answers from the audit: the 10-set floor is `--floor`
  (strength-and-muscle aims only, every major muscle, any sex; `floor-except:` names an excused
  muscle), more than 4 sets needs `--proven`, a first cycle switches the new-athlete rules on by
  itself (`--female` is retired), and the Quality headline is a WARN reported with a recommendation.
  All of it is in COACHING-PRINCIPLES.md, with the dates.

## 🌡️ Today's targets — the check-in changes the DAY, never the programme (2026-09-26)

Fork 2A. Amir asked which readiness should change what; the answer is REC-2 (the rule index), and
the app applies it. The readiness sheet used to say *"This doesn't change your plan"* while the
sales pages promised a session that adapts, and 12 of 36 programmes already told athletes to ease
off in their notes.
- **The level is worked out ONCE, at the check-in** (`beginSession()` → `readinessPlan()`), and
  stored in the same `<id>_readiness_<day>` object: `{ level: green|amber|red, sore: ''|half|skip,
  drop, score, base, asWritten }`. The session record carries it to the server, so coach.html, the
  email and a reload all read what the athlete was shown; nothing recomputes it later.
  `score` (S) is the mean of sleep, energy, stress and overall; `base` (B) is the athlete's own mean
  S over their last 10 answered check-ins, once there are 5, from `get_my_history()`'s `ready`
  (**`supabase/stage40_history_readiness.sql`**). The old `composite` is untouched.
- **`paintToday(day)` paints it; nothing is written but the check-in.** A banner under the timer
  says what changed and offers **Train as written** (`setAsWritten()`, kept as `asWritten` and sent
  with the session). Every card with an RPE shows `RPE 8 → 7 today` (one clay pill: `rdTarget()`
  takes the RPE out of the line of numbers); `data-target-today` makes the set-log and Guided
  colours compare against today's number.
  Red: `redDayCore()` keeps the warm-up (`isPrepBlockTitle()`), the first exercise of the first
  power block and of the first Primary/Strength block; the rest is tagged *Optional today*. A day
  with no Primary block keeps the warm-up and the whole first working block. Sore: exercises whose
  Spine entry has `impact` plyometric or landing (a name match when there is no entry) show
  *2 of 4 sets today* with the extra rows dimmed, or *Skip today · sore* at soreness 1; circuit items get
  *Every other round* / *Skip today*.
- **`dayRpe()`** is the one place a target moves: 1 off each end, never below 6, never above the
  written number, and it does not stack with the week note (`weekNoteNow()`): the lower target wins.
  The week note's own number is floored at 6 too (CHP-4; until 2026-09-27 a written 6 in a week with
  `rpeDrop: 1` read *6 → 5 today* on a lower day, a target no RPE button can log).
  ⚠️ **coach.html's `dayTargetC()` is its twin** (without the week note): change both.
- **Completion follows the day.** `getDayCompletion()` does not count optional or skipped work as
  missing, and a halved exercise asks for its halved sets, so a red day with its core done is
  *Complete*, not *Partial*. The report tags that work `(optional today)` / `(skipped today: sore)`
  instead of `(✓)`, and adds a `Today:` line after the check-in answers (after them on purpose:
  coach.html's email import reads the first "sore…: n" it meets).
- A flagged retest waits for a green day: the Records screen's retest strip says *Not today* while
  today's check-in came back lower (and the athlete did not choose to train as written).
- **coach.html** shows *lower day* / *short day* / *sore* on the session, prints the prescribed RPE as
  `RPE 7 → 6 that day`, judges the sets against that, leaves excused work out of *not done*, and
  lists **a run of low days** under Needs you: 3 of the last 5 check-ins (within 3 weeks) on a
  lower or short day, or stress 2 or lower on 3 of 5. That run is Amir's call, never the app's.
- Found while testing: a running session's **Guided** button was clay text on a clay fill, a blank
  block, for the whole session. Fixed in the same change.

## 🕘 The Card Remembers — last time on every exercise (2026-09-24)

Idea #5 of `/ideas` round 1, built from the brief Amir approved ("go with your suggestions"). Every
standard exercise card shows what the athlete did **the last time they did that exercise** (any
day, across cycles via `matchRenamed()`), and **History ›** opens the History sheet. Four rules:
- **History, never a prescription.** It never suggests a load — Amir's rule is RPE, never load.
- **Reps are an override.** The reps box shows the prescribed number as a placeholder; `n` is
  stored only when the athlete did something else. Amir prescribes **one number, never a range**.
- **The log-line grammar exists three times** — `buildSessionData()` writes `Set 1: 80 ×5 @8 ✓`,
  `parseSetLine()` (coach.html) and `parseSetText()` (program.html) read it. Change all three;
  `scripts/check_setlog.js` (pre-commit) runs the real writer through both readers.
  **The reps are the last word and stand alone** (`×8` after a space, at the end once the RPE and the
  tick are off), so a weight typed with a times sign survives: `Set 2: 2×20 ×8 @7 ✓` reads back as
  weight `2×20`, 8 reps. Until 2026-09-26 both readers took the first `×` and read it as 20 reps.
  The weight text is always kept exactly as typed.
- **A pair of implements as a number** (2026-09-26): where a load has to be a number,
  `parseLoggedKg()` (records, estimates, History) reads `2×20`, `2x20`, `2 x 20kg` as **20**, one
  implement, so a dumbbell lift logged as `20` one day and `2×20` the next is the same lift. Only a
  count of 1 to 4 before the sign counts as a pair (`20x2` stays 20). coach.html's `loadSummary()`
  does no maths on any weight that is not a plain number (`24` or `24kg`): it prints `2×20` as typed.
- **Only in the open card** (2026-09-27, *The working card*): the **Last time** box under the Coach's Note. The closed
  card's clay *Last* pill is gone (Amir: *"no history on the exercise card when not opened"*).
- **`<id>_histcache` is a cache and never syncs** (`_snapshot()` skips it; written with
  `_lsRawSet` so it never stamps `lastEditAt`). The source is `get_my_history()`, stage30.

## 🦴 The Spine — one record per exercise (2026-09-24)

Idea #1 of `/ideas` round 1 (brief: claude.ai/artifact/WymDKxk58nkCy5eSgodSrU). Amir: *"I love
the exercise database … I just dont want to make my exercise cards busier … the cues should be
there so we dont write the cues for each exercise everytime."* Server: `supabase/stage31_spine.sql`.
- **Two tables.** `exercises` (athlete-readable when approved: purpose, pattern, cues, regressions/
  progressions/alternatives as ids, loads, video) and `exercise_coach` (coach-only: SFR rank, restriction flags, and since
  stage39 the muscle `credits` and `cost` tier that `scripts/check_program.py` counts volume from). A separate
  TABLE so no athlete query can ever touch the flags. `get_exercises()` serves **approved rows only**.
- **Nothing reaches a phone until Amir approves it** in coach.html → **Exercises**. Claude drafts
  (`status 'draft'`) and never approves. The first 75 drafts (2026-09-24) cover the most-used names;
  their cues are Amir's own wording, copied from the most recent live programme using each one. Batch 2 (80 more, the same day) took the exercises inside circuits, which
  batch 1's query could not see. Batch 3 (57 + aliases) closed the list the same day: **212 entries,
  every exercise name in every live programme resolves, and all approved on Amir's word** (*"approve
  all when youre done"*). 61 still had no video then. **Since 2026-09-26 the entry's `video` replaces the old
  catalogue** (`getVideoUrl()`: a card's own `videoUrl` first, else the entry's; `exercise_library.json`
  and its Notion sync were retired), and 64 of 220 entries have none yet. New names come in through Upkeep, below.
  **The next batch is the `/spine` skill** (`.claude/skills/spine/`): the what's-missing query, the
  alias/new/skip sort, and `draft_sql.py`, which checks every link. The batch file with SFR and
  flags stays in the scratchpad, never in this public repo.
- **The card gains ONE thing:** a small ⓘ, only for an approved entry, at the right end of the row (after the name until 2026-09-27, *The working card*). Everything
  else is in the About sheet (`openExerciseSheet()`), which reuses the History sheet's frame.
  ⚠ **Opened from a CARD** (Amir, 2026-09-24): Why you, what it does, pattern and quality chips,
  On court, the three lists, History. *In your programme* shows **only when it is opened from
  Library → Exercises** (`fromLib`); the lists stay in both (Amir: *"i liked how regression
  progresion and alternatives lives in i"*). The three plain lists: **Regressions** (`easier`: the same movement made easier),
  **Progressions** (`harder`: the same movement made harder) and **Alternatives** (`alts`: the
  same movement on other equipment or a machine). ⚠ **Rungs are GONE** (Amir, 2026-09-24:
  *"remove the rung, too much information, even im mixed up. doesnt help athlete"*): no ladder, no
  "next rung", no "climbed" marks, and never bring one back. Use those three names everywhere, and
  keep the definitions strict: a regression or progression is a REAL one of the same movement, an
  alternative is the same movement on different kit. **On court** shows to tennis and padel
  athletes only (`isRacketSport()`). All 212 entries' links were rewritten to this rule that day;
  the old links are in `exercise_coach.links_before` (stage33).
  ⚠ **A link is an id OR A PLAIN NAME** (Amir, 2026-09-24: *"if we already have it, link it, if
  not, just put the name"*). An item shaped like an id (`goblet-squat`) must be an entry; anything
  else (`Nordic Hamstring Curl`) is the name of an exercise with no entry yet, drawn as a quiet
  dashed pill with nothing to tap. The name resolves at READ time like a card does (`spineFor()`),
  so it becomes a real link on its own once an approved entry carries that name or alias. Only id
  links are mirrored both ways. The same day's link pass (stage34) took the Spine from 255
  links to 387 (103 of them names); then stage35 (Amir: *"apply the fixes"*) corrected the
  approved links that broke the strict meanings and **merged three duplicates into aliases**
  (Cable Single-Leg Hip Extension → Cable Glute Kickback, Rotational Wall Slam → Medicine Ball
  Rotational Throw, Thoracic Windmill → Open Book), leaving **209 entries, 365 links (104 names),
  17 with no link** (warm-up drills and stretches). Every entry's links before each pass, and each
  merged entry's whole row, are in `exercise_coach.links_history`. ⚠ **Two entries may never
  share a name or alias**: the resolver wants ONE entry per tier, so a shared name resolves to
  nothing and both cards lose their cues. A duplicate becomes an alias and its entry is deleted.
- **Body parts involved** (Amir, 2026-09-24, from the course app's «بخش‌هایی از بدن که درگیر است»;
  `supabase/stage36_body_parts.sql`). `loads` = the course's region ids (`ankle-foot · calf-achilles ·
  knee · hip-groin · hamstring · low-back · trunk · shoulder · elbow-forearm-wrist`, plus `neck`),
  `impact` = `none · running · plyometric · landing` (shown as No impact, Running, Jumping, Landing).
  The About sheet draws them as *Body parts involved* (`bodyPartsHtml()`), regions as soft pills, only
  for an entry with no muscles (one with muscles gets the muscle map, below); the impact pill is clay
  under either (*No impact* quiet). coach.html edits them as tick boxes and a menu; the database refuses any other
  word. **All 209 entries were set by hand** (stage36 the 100 most-used, stage37 the other 109, on
  Amir's *"do all 109 now"*), 56 of them copied exactly from the course where it has the same
  exercise. ⚠ **`impact` null means never checked**, and **every programme write fills both** for a
  new or touched exercise through `/spine` → Upkeep, which flags a missing one.
  The region and impact lists exist FOUR times (program.html `SPINE_REGION`/`SPINE_IMPACT`,
  coach.html `SPINE_REGIONS`/`SPINE_IMPACTS`, `draft_sql.py`, the stage36 checks): change all four.
- **The muscle map** (Amir, 2026-09-26: *"this is amazing, lets build"*; `supabase/stage42_muscle_map.sql`).
  The About sheet's body section is a **front-and-back body with the worked muscles lit**: main (`1`)
  in full clay, helpers (`0.5`) in soft clay, listed under it as *Main* and *Helping*, then the impact
  pill (*No impact* is quiet now; Jumping, Landing, Running stay clay). The body sits on the sheet
  itself, warm greys on paper and dark greys in dark mode (Amir: *"the body should be on a light
  background, whatever it is in that page"*). `bodyPartsHtml()` draws it; `BODYMAP_SVG` is the drawing.
  - **What lights:** `get_exercises()` sends `muscles` = the entry's volume **credits** when they name a
    muscle, else its display-only **`exercises.muscles`** (the 60 stretches, jumps, sprints and rides
    whose credits are `{}` still work something). Only muscle names and 1/0.5 reach a phone, never cost,
    SFR or flags. An entry with neither falls back to *Body parts involved* on the same drawing: the
    zones light their muscles, and the knee and the ankle get a clay ring, since they are joints.
    `core` also lights the low back.
  - **Every new entry needs it:** `credits: {}` means `muscles` is required (`draft_sql.py` refuses the
    batch without it, `/spine` → Upkeep lists it as a gap, coach.html marks the entry *no muscles on
    the map* and edits it under the body parts, where it also DRAWS the same body, redrawn as Amir types
    the counts, muscles or body parts: `spineMapHtml()` copies `bodyPartsHtml()`'s logic, so change both). ⚠ Changing an entry's credits now also changes what
    every athlete sees lit.
  - **The drawing is generated, never hand-edited.** A Higgsfield GPT Image 2.5 chart (round 1,
    candidate C, job `f37ea7da-2673-43d7-9b4c-30d1b3633927`), mirrored so both sides match, traced
    into one path per muscle group. The master, the three tracing scripts, the traced
    `bodymap.json` and `inject.py` (writes `BODYMAP_SVG` into program.html AND coach.html, between the `BODYMAP:BEGIN/END` markers;
    `--check` says whether it is stale) are in `.claude/skills/image/bodymap/`. ⚠ The muscle ids now
    exist SIX times: stage39's `spine_credits_ok()`, coach.html `SPINE_MUSCLES`, check_program.py
    and draft_sql.py `MUSCLES`, program.html `MAP_MUSCLE`, and the drawing's `data-g` groups.
- **Cues are written once, on the entry, and they are THE cues for everyone** (Amir, 2026-09-24:
  *"the aim is to use these cues for all the exercises that everyone has from now on … if there is
  a cue for someone specific, it should be in coach's notes. thats why its there"*). The pipeline
  writes **no `cues`** on a programme card. Anything about one athlete is that exercise's `note`
  (Coach's Note). `paintSpine()` fills `.ex-cues-slot` on a card and `.round-cues-slot` on a
  circuit item. Legacy cards still carry their own `cues` and show those until their next cycle.
  So **an entry must be approved before a programme using it goes live** (`/program-assemble`
  checks), or the card shows no cues. Entry cues are 2 good + 1 bad, written for anyone: no side,
  no home kit, no tempo, no dose.
- **Every programme write ends with Spine upkeep** (Amir, 2026-09-24: *"when i write or update a
  program, and there are movements that are not there, or missing some info, or can be updated, it
  should be updated there at the end … so everytime i write a program for an athlete, this gets more
  complete"*). `/program-assemble` Step 8, `/program-edit` Step 4 and `/workout` all run `/spine` →
  **Upkeep**: draft what's missing, fill empty fields on any entry, change the text of a draft freely
  but only *propose* changes to an approved one, and report a one-line **SPINE** block in the
  handoff. The same day, the athlete-specific cues on two athletes' cards moved
  into their Coach's Notes (previous versions in `program_versions`).
- **Names are never rewritten.** Card → entry resolves by `exId`, then name/aliases through
  `exNameVariants()`. ⚠ **The resolver exists twice** — `spineFor()` (program.html) and
  `spineForC()` (coach.html). Same rule: `exId` first, then the tightest tier with ONE entry.
- `spinecache` (localStorage, no athlete prefix) is a cache of `get_exercises()` and never syncs.
- **Library → Exercises is the third door** (Amir, 2026-09-24: *"something like the one i have in tps
  course"*): search, pattern chips, *In your plan* first. Every row opens the same About sheet
  (`renderExerciseLibrary()` → `openExerciseSheet(id, card, true)`); opened from the library, or with
  no card on screen, the sheet also carries the video and cues. One design, not two.

## 🗺️ The Quality Map — what each day builds (2026-09-24)

Idea #2 of `/ideas` round 1 (brief: claude.ai/artifact/US2RW8TaHZbFk8voADq6fu). Amir: *"it should be
on the day cards, in their home. both for tennis players, and other clients. the rest can be where
you recommend."* Server: `supabase/stage32_qualities.sql`.
- **Ten qualities** in `public.qualities`, plain word + the cycle-picture family it matches:
  Strength (iron) · Muscle (build) · Power (voltage) · Spring · Speed · Brakes · Rotation · Engine ·
  Armour · Movement (bedrock). Each has one line for everyone, a court line shown **only** when
  `sport.badge` says tennis or padel (`isRacketSport()`), and its tests. `get_qualities()` serves
  **approved rows only**; Amir approves them in coach.html → Exercises → *The ten qualities*.
- **Tagged once, on the Spine entry** (`exercises.qualities`, first = primary, max three). Never on
  a programme. Claude drafts tags on drafts only; for an entry Amir already approved the suggestion
  sits in `exercise_coach.suggested_qualities` and pre-fills his editor.
- **The day card on Home shows up to three chips** (`paintDayQualities()` → `qualityMix(day)`):
  working sets × (primary 1, secondary ½), **prep blocks skipped** (`isPrepBlockTitle()`), and
  **nothing at all below 70% tagged coverage**, rather than a wrong mix. **An exercise dosed by time
  with no sets counts one set per 10 minutes, never less than 1** (`qmSets()`, 2026-09-26): counted
  as 1 set, a 30-min easy ride scored under the 1.5 floor and an aerobic day's card showed no chip at
  all, and a run day with core work read "Armour" instead of "Engine". Tapping a chip opens the
  quality page (`openQualitySheet()`: the line and the court line; since 2026-09-27 no *How we measure it*, which
  named tests an athlete never meets, POL-01, Amir's A: the words stay in `qualities.tests` for coach.html); the About
  sheet's quality chips open it too. ⚠ **The explanation is the page** (Amir, 2026-09-24: *"the
  explanation is enough"*): the list of exercises that train it (*In your plan*) shows only when the
  page is reached from Library → Exercises (`openQualitySheet(q, fromLib)`), never from a day card or
  a card's ⓘ. **Words only: athletes never see set counts.**
- ⚠ **The mix rule exists four times**: `qualityMix()` (program.html), `qualityCheckC()` (coach.html),
  the quality check in `/program-design` and `mix()`/`top3()` in `scripts/check_program.py` (2026-09-25).
  Same weights, same prep test, same minutes rule (`qmSets()` / `qmSetsC()` / `qm_sets()`), same 70%
  coverage and 12% cut, or the coach's check, the pipeline's check and the athlete's card disagree.
- **A cycle's headline quality is its `art` word** (`QM_ART` in coach.html). `bedrock`, `peak` and `reset` are
  phases, not qualities: they have no headline and are never flagged (bedrock→movement flagged almost
  every foundation block, 2026-09-24). coach.html → Exercises →
  *Quality check* flags every current programme whose headline is not in its week's top two.
- `qualcache` (localStorage, no prefix) caches `get_qualities()` and never syncs.
- **There is NO Library → Qualities door.** It shipped and was removed the same day (Amir,
  2026-09-24: *"remove the qualities from library, bad decision"*). Library has three doors:
  Sessions, Playbook, Exercises. Do not bring a qualities door back.

## 🎯 Because — why THIS athlete has this exercise (2026-09-24)

Idea #4 of `/ideas` round 1 (brief: claude.ai/artifact/WtZ4xfq38dV7zZwRu926jw; Amir: *"go"*, on the
recommended picks). `ex.why = { src, part?, text }`, spec in `SCHEMA.md` → *`why` — Because*.
- **The card gains only a clay ⓘ** (`.ex-about.has-why`; a clay dot on its corner until 2026-09-27, when the clay dot after the name became the Coach's Note). The sentence opens the About
  sheet under **Why you** (`whyBlock()`), and **Why your plan looks like this**, a button under the
  current cycle card (three or more reasons), groups them by source (`openWhyPlan()`). A card with a
  `why` gets the ⓘ even before its Spine entry is approved.
- **Personal or nothing, 5–10 per cycle, written fresh each cycle**:
  `why_flag` (/program-design) → PART 3b (/program-engage) → /program-assemble, audited by
  `Chips.auditWhy()`/`auditWhyProgram()` (bad source, over 140 characters, diagnosis words, a
  failure quoted back, em-dashes, repeating the Coach's Note, more than 10).
- **The coaching log's Exercise Ledger stays coach-only.** `why` is rewritten for the athlete:
  the body part, never the diagnosis, and what we do next, never the failure.
- **No backfill** (Amir's pick): live programmes gain reasons with each athlete's next cycle.
  coach.html's ✎ editor keeps `why` through a save (`toRx`/`applyRx` copy the whole exercise);
  editing it there is the next step, not built yet.

## ✍️ The set log is COUNTERSIGNED, and the note belongs to ONE session (2026-09-24)

Amir: *"do as you recommend"*, on top of The Card Remembers. Design and evidence in
`Content/SET-LOGGING-DESIGN.md`. **Written by the coach, countersigned by the athlete:** every
set arrives pre-written, the tick means "done as written", and only a set that went differently
costs more than one tap.
- **The row is SET · KG · REPS · RPE tag · tick.** RPE is no longer five ~20px buttons on every
  row before a rep is lifted: **How hard?** opens full width under a row the moment it is ticked,
  then folds into an `RPE 8` tag that reopens it. `.live` tints the next set to do. All row state
  is drawn by one painter, `card._paintSets()`; "tick all" and Reset call it too.
- **Guided Mode asks on the REST screen** (`paintTimerLog()`): the weight (since 2026-09-27, the set's
  own kg box, so typing saves and fills the empty sets below; last time as its hint and **Same as last**;
  none for work with no kg box), a reps − / + and the RPE strip for the set just done. It holds no
  state — every tap goes through the row's own input and buttons.
- **The note is per SESSION**: `<id>_snote_<Name>` = `{ d: local date, v }`, shown and sent only on
  day `d`. The old `<id>_note_` was never cleared, so half the notes Amir received were re-runs
  (522 sent, 259 distinct). A date stamp, not a clear, because the cloud merge prefers text over a
  blank and would hand a cleared note back. Last session's note shows in the Last time box once it
  is tapped open (a circuit's strip shows it always). coach.html reads `snote_` ahead of `note_`.
- **Leftover rep ranges are never guessed.** `cardReps()`/`plannedReps()` return null for one, so the
  box shows `8–10` and reps are recorded only when typed. `repCount()` still takes the low end,
  for Personal Records only.
- Weight and reps inputs normalise Persian/Arabic digits (`normDigits()`); live logs held `۲۵`.
- **Weight boxes open EMPTY, with last time's weight as a hint (Fork 3B, 2026-09-26).** Amir picked
  *"Hint plus Same as last"*. They used to open holding last session's weights as real numbers, so a
  bare tick logged last week's load as today's and every number built on the log (records included)
  was quietly a repeat. Now:
  - A set carries `lw`, **last time's weight**, and `w` is only ever today's. ONE function,
    `carrySet()`, ends a session's set for all three places that do it: `autoResetStaleDays()` on the
    phone, `stripSetLogSession()` on the cloud's copy, and a rename carried by
    `adoptRenamedExercises()`. `mergeStoredValue()` merges `lw` like the other fields. A skipped
    weight keeps the last one ever typed (`s.w || s.lw`).
  - The empty box shows that number under a small **LAST** caption (`.ex-set-wlast`), smaller and
    paler than the prescribed reps beside it, because a tick records the reps and not this. A bare
    `last 80` placeholder was tried first: at 375px the box holds about 38px of text, so `last 22.5`
    was cut off. A ticked set shows no hint.
  - **No Same as last on the card** (removed 2026-09-27, Amir: *"its a duplicate of what can be seen
    in history"*). It sat above the table as `Same as last · 80 kg` and filled every empty set; the open
    card's Last time box already shows last time, and one number typed in set 1 fills the sets below.
    `sameAsLastFills()` / `sameAsLastLabel()` went with it. **Guided's rest screen keeps its own**
    (`.tl-same`, in `paintTimerLog()`): that screen has no Last time box, and the button types last
    time's weight into that set's box, which then fills the sets below like any typed number.
  - **A number typed in a set fills the empty sets below it**, and keeps them in step while it is
    typed (`8` then `80` leaves 80). It stops at the first set holding a number the athlete put there
    and skips ticked sets. Which rows were filled this way is kept in memory only.
  - **A tick on an empty box records no weight.** The summary grammar did not change, so History,
    coach.html and the email read the log exactly as before.
  - `migrateCarriedWeights()` converts, once per phone, the weights every sweep before this left in
    `w` (a set holding only a weight, on an exercise no live day holds). Its marker `aap_lw1_<id>`
    sits outside the athlete's key prefix so it never syncs.
- **An RPE off its target is coloured: clay OVER, steel blue `--rpe-under` UNDER, green on target**
  (Amir, 2026-09-24). The one exception to "clay is the only accent", and only for an RPE against
  its target: warm = harder, cool = easier, and orange-vs-blue survives colour blindness where
  red-vs-green does not. Every screen goes through `rpeVs()`/`rpeMark()` (row tag, the strip, Guided
  rest screen, Last time, History), which treats a target range like `7-8` as on target inside it —
  the old `parseInt` read `7-8` as 7 and called an 8 "over".
  **coach.html matches it:** each set in *per set:* is coloured the same way, and the average's
  *under target RPE* pill is steel blue (it was ochre, the colour of "extra set"). The average still
  flags only past `RPE_OVER`/`RPE_UNDER` (1.5); the per-set colours are exact, like the athlete's.
- **One RPE control everywhere (CONS-01, 2026-09-27).** A set's strip, a circuit's rounds, Guided's
  rest screen, the session rating and Personal Records' **Log a max** are the same buttons: 44 px
  tall, the number in Barlow Condensed 18 px, 10 px corners, green when picked, and **a second tap on
  the picked number clears it**. Before, a circuit's round buttons were 30 px and could not be
  cleared (`selectRPE()`), the set strip was 40 px, the session rating 14 px type, and Log a max took
  any number in a free text box.
  - **A circuit asks once a round**: `R2 · How hard?` sits on its own line above the five numbers
    (inline it left them 11 px wide at 320 px), and like a set's **How hard?** it opens RPE & Tempo.
    A cleared round is a `removeItem`, which the hook sends up as a drop, so the cloud does not hand
    the rating back. Circuits still colour no RPE against a target: they carry none.
  - **Log a max** asks **How hard?** with 6–10 under the kg and reps boxes; the chosen number sits in
    a hidden `#cf-rpe`, so `paintCeilingForm()` and `saveCeilingForm()` read it as before. Half points
    (9.5) are gone with the text box, the same scale as a set.
  - The session rating keeps its own scale, 1–10 (Foster's session RPE), in the same buttons.
  - The readiness check is not RPE and keeps its large labelled 1–5 answers (they work: 90%).

## 💬 No in-app chat: Amir answers only on WhatsApp (2026-09-26)

Amir: *"whatsapp first, remove in app chat from app and coach.html"*, then the same day: *"Im only
gonna reply to them when they send me a message on whatsapp. They all have my numbers. So instead
of chatting in the app, put sth there so they can whatsapp me quicker"*. The chat was a second inbox
he had to remember to open (one athlete's three messages of 9 Sep sat unread for 17 days), and every
athlete already has his number. **The app never promises an answer inside the app**; it sends the
athlete to WhatsApp from wherever the question comes up, with the context already typed.

- **The Coach tab opens on *Message me on WhatsApp*** (`coachContactHtml()`): a `wa.me` link to
  `COACH_WHATSAPP`, pre-filled with the athlete's first name, cycle and week so Amir knows who is
  writing and where they are; the demo says it is the demo. The number is printed under the button
  for a phone that will not open the link. **`COACH_WHATSAPP` must stay the number the site's own
  buy buttons use.**
- **Two more doors, each saying what the message is about** (`waInlineHtml()`, `coachWhatsAppUrl(about)`):
  *Ask me on WhatsApp* under the note at the end of every session (`sessionWaUrl()` adds the day, its
  title and whatever is typed in the note, at tap time), and *Ask me about this exercise* in every
  exercise's About sheet (the exercise, plus the day when opened from a card). The session note's
  placeholder no longer invites swap requests: a note is read, never answered, so anything that needs
  an answer goes through the door.
- **Gone:** the thread, the composer, the unread dot on the Coach tab, the boot-time fetch of messages
  and the hero's *"Online · usually replies in a few hours"*, which was hard-coded and never true or
  false on purpose. The welcome sheet and the guide now point at WhatsApp.
- **coach.html** has no Chat sub-tab (an old `#a/<id>/chat` bookmark opens The work), no unread
  counts in *Waiting on you* or the roster reasons, and no `messages` query. A session note is
  **read**, not answered: *Mark read* is its only action and the counts say "note to read". (A *Reply
  on WhatsApp* button lived here for an hour on 2026-09-26 and went with Amir's rule above.)
- **The server is untouched**: `messages`, `get_messages()`, `send_athlete_message()` and
  `mark_athlete_read()` stay, so no past thread is lost. The shell is stale-while-revalidate, so a
  phone may run the old copy for a launch or two and could still post into the table; check it once.
- **Do not bring a chat back** without Amir asking for it.

**Today's habits on Home (Fork 1B, B2, same day).** Under the Daily Habits card the athlete ticks
today's habits in place: AA Proof itself, embedded (`habits.html?embed=1` in a frame,
`mountProofStrip()`). Proof draws the rows and does every write; this app holds no habit state.
Loaded only near the screen, shown only when Proof reports `ready`, and never in the coach's
preview. Details: `HABITS.md` → *Embedded on the training app's Home*.

**Home order (same day).** This Week and the day cards come first; the Daily Habits card follows.
It sat above them from 2026-09-12, and in the fortnight after, 5 of 40 athletes logged a habit in a
week while 16 trained. The training is why the app is opened, so it leads.

## 📶 No signal — the plan saved on the phone (REL-01, 2026-09-26)

Fresh Eyes REL-01; Amir picked *"A with Proof"*. Since 2026-09-07 the plan came only from
`get_program`, and nothing kept a copy on the phone. iOS closes a backgrounded PWA freely, so an
athlete who checked WhatsApp between sets in a no-signal gym reopened on *"Program Not Found … ask
Amir for a fresh one"*, their logged sets safe on the phone and no way to see or finish them. The
service worker keeps the app's own files; its old offline path for the plan, `data/<id>.json`, has
been a 404 since 2026-09-07. Rejected: opening from the phone on every launch (a stale plan first,
swapped under a running session) and letting `sw.js` keep the plan (it cannot cache a POST, and it
sits in front of the whole site).

- **`plancache`** (localStorage, no athlete prefix, so it never syncs): ONE slot, `{ id, at, data }`
  = the athlete id it was asked for, when, and the plan exactly as the server sent it. A shared phone
  never holds two athletes' plans.
- **Written** (`savePlanCopy()`) only from a real `get_program` answer, before anything touches `DATA`;
  never in the demo (the marketing demo opened on an athlete's own phone would replace their plan), the
  coach preview or Proof's strip on Home. AA Proof's full app writes it too.
- **Opened** only when the server could not be reached: no library, the 6 s timeout, a failed fetch
  (status 0) or a 5xx (`_noAnswer()`, `planAnswerOf()`). **Never when it answered no**: a 4xx
  (`get_program` raises `invalid athlete key`) or an empty answer deletes the copy (`dropPlanCopy()`)
  and shows *Plan not available* with *Sign in again* and a WhatsApp button.
- **Deleted** too by `signOutAthlete()` (the error screen's *Sign in again*, and **Sign out** under your
  initials through `signOutSafely()`, NAV-02) and by every successful sign-in in either app, so a new
  athlete whose signal drops before the first load can never open the previous one's plan. The reload saves theirs at once.
- **What the athlete sees:** the app opens from the copy with one quiet line under the greeting,
  *Offline · your plan as saved on this phone, Tue 18:40* (`paintPlanOffline()`, `#home-offline`).
  With no copy: *No connection*, with *Try again*. The error screen's ⚠️ emoji (yellow) is now an
  icon in clay.
- **The library** (`supabase-js` from jsDelivr, which the worker does not keep) marks a failed download
  (`onerror` → `window.SB_FAILED`), so `_sbReady()` stops at once instead of polling ~3 s before
  every call; `_sbLoad()` fetches it again once the connection is back.
- **Uploads wait for a pull (`_sbHold`).** A run opened from the copy, or whose boot pull ran out of
  its new 6 s cap, has not merged the cloud's progress, so `_pushSnapshot()` sends nothing; every edit
  is still saved and stamped (`lastEditAt`), which is what lets this device's offline session win the
  merge later. `_resumeSync()` runs on `online`, on return to the foreground and once a minute: the
  library, then the plan (unchanged: the line goes; changed: *Your plan was updated · Refresh*, never
  swapped under a running session; refused: *The server didn't confirm your plan*, and it stops), then
  the pull, then the held push and the unsent sessions (`_replayQueue()`).
- **`syncFromCloud()` reports** `'pulled'`, `'rejected'` (answered with an error: uploads go ahead,
  as they always did), `'unreachable'` or `'late'`; a pull that outlives its cap is thrown away when it
  lands, and it merges with `_lsRawSet`, because a merge is not an edit.
- **Not awaited on the copy path:** the identity check (it cannot answer offline; the copy only opens
  for the remembered id it was saved under, and the server checks again on reconnect). Elsewhere it is
  capped at 6 s. The legacy `data/<id>.json` fetch stays, capped at 4 s, because the headless render
  checks serve one.
- ⚠️ **Exists twice**, in this file and `habits.html`: `_noAnswer()`, `_sbLoad()`, `readPlanCopy()` /
  `savePlanCopy()` / `dropPlanCopy()` / `planAnswerOf()` and the `plancache` shape. Change both. Proof's
  side: `HABITS.md` → *No signal*.
- **Left as is:** one bar of signal still costs up to the 6 s `get_program` wait before the copy opens.
  Waiting less when a copy exists would open slow-but-working connections on the copy more often; it is
  a separate call.

## 🌙 Midnight is not the end of a session (DATA-02, 2026-09-26)

- **A session's date is the local day it was finished** (`sessionDateFor()`: the finish stamp, else today),
  and every save of it (finish, a later RPE or note, Send) names that same day. It was `toISOString()`, a UTC
  date worked out again on each save: in Iran a session after midnight was filed under the day before (and
  ticked AA Proof's WORKOUT on the wrong day), and one finished before 00:00 UTC but saved again after it got
  a second `session_history` row. Rows saved before this carry a UTC date.
- **A session stays live for 6 hours** after it started, or after it finished (`SESSION_GRACE_MS`,
  `sessionIsStale()`, the one test, used by the boot sweep, Start/Pause, `openGuided()` and
  `liveExerciseKeys()`). A session started at 23:30 used to lose its clock and check-in on a reopen after
  midnight, and a Start/Pause tap reset it; one finished at 23:50 lost its unsent note and rating.
- **An unfinished day is asked about** (Amir, 2026-09-26: "Ask the athlete next open"). A real tick
  (`toggleCheckOnly()`, `syncExerciseCheck()`, via `markTouched()`) records the day it happened in
  `<id>_touched_d<N>`; the redraws that also run `updateProgress()` never write it. On a later open, a day with
  logged work, no finish stamp and no session running (6 h grace) whose ticks are from an earlier date gets one
  card above This Week: "Tuesday's Day 2 was never sent · 2 of 9 sets logged", **Send it** (a partial session
  filed under the day it was trained: the finish stamp carries that date) or **Clear it** (two taps). Both then
  let the sweep close the day as it would at midnight. Ticks from before 2026-09-26 carry no date and are not
  asked about. The sweep still runs at launch only, not when the app returns to the foreground.

## 🏠 Home, led by the training (HOME-02, 2026-09-26)

Built from Amir's notes on the mockup: "I like how small the other cards like habits, records and weight
are · I like the in progress day card · I like the small cycle details · If the days are done, make the day
card into that small one, if not, still big". And one refusal: **no rest-day design**, "because we don't know
their rest days, athlete can move the days". So:

- The cycle was one line under the greeting (`.home-cyc`, → Game Plan). Since PROG-01 it is the **This cycle**
  card (below); the line stays only for a cycle with no dates, or before or after its dates.
- `dayCardHTML()`: a day done this week (`weekDoneDays()`) is a `.dc-row` (✓, name, DONE); a day not done is the
  big photo card; a day in progress (`dayInProgress()`) gets `.dc-live` under its banner (sets done of total, the
  clock ticking via `paintLiveClocks()`, **Resume**). `paintWeek()` redraws the cards, so a card changes shape
  the moment a day is finished. The suggested day is found by `data-dc`, since rows and cards now mix.
- Habits, Personal Records and Body weight are one `.hrow` each (label, the number, one small line, a spark
  where there is a trend). Where there is nothing yet, a quiet dashed row with one line replaces the old giant
  clay "NO RECORDS YET" / "NOT TRACKED YET". The habits row is still followed by AA Proof's strip, so habits
  are ticked on Home (fork 1B), and it shows Proof's count once instead of a hero card and a strip.
- **The habits row says AA Proof's verdict** (PRF-03, 2026-09-27): *Daily habits · 2 to go · 4 days in a row*,
  then *On target*, then *Perfect*, the words Proof's Today tile and the strip's head use. It read "Daily
  habits · day complete" beside the strip's "1 of 5 done", two answers to one question. `habitCardHtml()` reads
  `verdict` and `togo` from Proof's snapshot and never works them out (`HABITS.md` → *card snapshot*). A
  snapshot from an earlier day shows the level until the strip writes today's.
- A week where every day is done says "All 3 sessions done this week", with every day a row. Nothing more.

## 🏆 This cycle: where it is, and the wins (PROG-01, 2026-09-27)

"Is this working?" had no answer in the paid app: progress was one exercise at a time. Amir's calls on the
mockup (https://claude.ai/artifact/JhzKhBvP54ERS3AMiwTcrW): *"a card on home, but remove the card (line) on the
top of the home page, and replace it with this, when you click, it goes to gameplan"*, and for the lifts, *"not
every one do under 10 reps, so we need to find a way to celebrate wins for every one, when they lift heavier
with same rpe"*.

- **The card** (`paintCycleCard()`, `#home-cycle-wrap`, a tap → Game Plan): *Cycle 2 of 3 · Load & Build*, **Week
  3 of 5** with a bar, **6 of 10 sessions** with a bar (finished sessions since the cycle's `startDate`, from the
  history plus today's finishes on this phone, against days × weeks), and up to three **wins**. Painted at boot and
  again by `paintWeek()` whenever the history arrives. A cycle with no dates (5 of 35 live programmes), or before or
  after its dates, keeps the small line. No wins yet: one quiet line says where they will show.
- **Wins are effort-matched** (`cycleWins()`, `winText()`): for each lift, its first session of the cycle against
  its best one since (so a back-off week never takes a win away), each session's best set by an effort-adjusted
  index (`cycleSetOf()`: Epley on reps to failure, `w × (1 + (reps + 10 − RPE) / 30)`; bodyweight: reps to failure).
  The words are the plainest that are true: *+2.5 kg, same reps, same RPE* · *+3 reps at 16 kg, same RPE* · *80 kg
  × 6 felt easier: RPE 8 → 7* · *+4 reps, same RPE* (bodyweight). Only when two things moved at once is it *heavier
  and harder: about 7% stronger* (the index as a percentage only, so the formula's bias at high reps cancels out).
  A hold logs a tick and an RPE, no seconds, so its win is *felt easier: RPE 8 → 7*. Under 2% is no win; a lift
  that went down, a lift trained once, or a loaded set against an unloaded one says nothing. The top three by gain.
- Checked on crafted history for every kind of win and non-win, and on the demo's (`prog01` suite).

## 📅 This Week is built from the session history (HOME-01, 2026-09-26)

Home's week used to know only today: a Done pill lasted until midnight (the `<id>_completed_d<N>` stamp) and
every morning the suggestion went back to Day 1. Now `weekDoneDays()` counts a day as done this week when a
session of it is in `HIST` (`get_my_history()` or its phone copy) inside `weekWindow()`, or was finished on this
phone today. The window is the **cycle's own training week** (`cycleWeekInfo()`: seven days from `startDate +
(wk − 1) × 7`), or Monday–Sunday for a cycle with no dates. `paintWeek()` redraws the day cards (a day
done this week is a `.dc-row` since HOME-02), the suggested day (a session in progress first, then the
first day not done this week, none when all are done) and the line under **This Week**, "2 of 3 sessions
done this week"; it runs at boot, when the history arrives, and whenever the day view closes, so a
finished session shows on Home without a reload. `completed_on` is the local day the session was
finished since DATA-02 (rows before it carry a UTC date).

## ↩️ Back closes the top layer (NAV-01, 2026-09-26)

Screens, sheets and overlays are shown and hidden in place, so until now the phone's Back button (or an Android
swipe) **left the app** from any of them. Now, while anything is open over Home's overview, there is exactly
**one guard entry** in history (`history.pushState`, same URL, so `?workout=` and other deep links are
untouched). Back pops it; `topLayer()` names what is visibly on top and it is closed; if something is still
open the guard is re-armed. Top first: the video pop-up, the rest timer (in Guided this ends the rest, as Skip
does), the readiness check (cancelled, nothing starts), the sheet (History, About, Why, Quality), Guided (the
clock keeps running), then a non-Home screen, which presses **its own ←** (Records → the exercise it was opened
from, a session → its Library pane → the doors, the archive → Game Plan) or goes Home for a tab, then the day
view. When the last layer closes through its own button, `navSync()` takes the guard back off quietly, so Back
on Home still leaves the app, with no dead press. Nothing is tracked in a parallel stack: the page is the state,
so it cannot drift. `initBackNav()` watches the overlays' `visible` class, the day view's `hidden` and each
`.screen`'s class; `shared.js`'s video pop-up calls `navSync()` itself. Not in the coach preview.
**One sheet, several pages (SHEET-01):** History, About, Why and Quality share `#hist-overlay`. Opening a page
while the sheet is up remembers the page before it (`sheetWrap()` around each opener; an opener that draws
nothing adds no step), a **‹ Back** sits at the top, and the phone's Back steps back a page before it closes
the sheet. Closing forgets the trail. A new sheet opener gets wrapped in `wrapSheetOpeners()`.
**AA Proof does the same** (HABITS.md → *The phone's Back button*), and never from the embedded strip on Home.
**One close grammar (2026-09-27).** A **screen** goes back with **←** at the top left (the day view, Records,
body weight, the Library's panes and sessions, an article, the archive). An **overlay** that fills the screen
closes with **✕** at the top right: the video pop-up, and Guided, whose ✕ moved there from the top left (its ?
sits beside it). A **sheet** (`.readiness-modal`: History, About, Why, Quality, the guide, your account, the
readiness check) has a **handle** and slides down: `initSheetSwipe()` closes it on a swipe down from the handle,
or from anywhere while it is scrolled to its top (past 90 px, or a flick; a short drag springs back; a move up
or one that starts mid-scroll is a scroll). A tap above it still closes it, and its **Close** (and the check-in's
*Skip for today*) is a 44 px target now (it was 15 px). From 560 px wide the sheet is a centred dialog with no
handle and no drag. The rest timer keeps the button in its row: it is **Close** on its own and **Skip →** in
Guided, where it ends the rest. The guide's first card says all this in one paragraph.
**Back keeps your place (POL-01, 2026-09-27).** `history.scrollRestoration` is `manual`: the browser used to
put back the scroll it remembered for the guard entry *after* our handler, so the phone's Back from a sheet,
the rest timer or Guided threw a day scrolled to its fifth exercise back to the top, and a session opened from
the Library came back to the top of the shelves. Now the layer's own button places the page, as its ← does:
the day stays where it was, and **the Library returns to where it was scrolled** when a session or an article
opened from it (`_libScrollY` in `goTo()`; the Library tab, or any other way in, starts at the top).

## 🔍 Readable in both themes (A11Y-01, 2026-09-26)

- **Text tokens.** `--green-ink` and `--clay-ink` carry every green or clay *text* colour (37 + 58 rules were
  swapped by pattern: `color: var(--yellow|--ice)`). Light mode: the brand colours, so nothing moved. Dark mode
  (`body[data-dark]`): #6DBE95 and #E06B43. `#screen-plan`'s single-accent remap covers `--clay-ink` too.
- **Dark mode fixes that were plain bugs:** the rest timer overlay stayed light while its digits went light
  ("2:00" at 1.08:1); the Home habits card coloured its arrows and streak count with `--grey-bg`, near-black in
  dark, on a card that is always dark green.
- **Tab bar:** inactive tabs grey at full strength (they were 55%-faded green), labels 11 px, 48 px tall.
- **Sizes:** no label under 11 px on Home, the day, the finish card, the rest timer, Coach and Game Plan
  (glyphs, the Level ring and the day letters excepted, at 9–10.5 px); DS-03 (below) made 11 px the floor everywhere. Session notes 16 px. The session rating
  is two rows of five at 44 px (ten in a row were ~24 px); the ⓘ is 26 px at the row's right end (20 px before the working card) with a 44 px hit area.
- **Pinch-zoom is on (2026-09-27).** The viewport said `maximum-scale=1, user-scalable=no`, so nobody could
  enlarge a cue or a number; it is `maximum-scale=5` now, as in AA Proof. `html { touch-action: manipulation }`
  keeps pinch and scroll and drops only the double-tap zoom, which on an iPhone could fire on two quick taps of
  +15s or an RPE button. Every field is 16 px (DS-03, below), so tapping one does not zoom the page either.

## 🎨 Clay means "look here" (DS-01, 2026-09-27)

Amir's pick A (*"Clay's Jobs"* page): the brand's one accent marked almost everything, block headers, done
tints, the running bar, labels, and so it marked nothing. Now:

- **Clay stays on what asks the athlete to look**: the Coach's note (the box, its label, *More*, and the dot
  after the name), a Because (the solid clay ⓘ), an RPE over its target (the set's RPE tag, the selected
  button, the Last time box and the ghost line under a set that ran over), the tempo digit, a banner that asks
  for something (a day never sent, a report waiting), a suggestion's kicker (LIB-01: *Sore today*, *Week done*),
  and the one number on a dark Home card (*Week 2*, the habits row's *2 to go*). The Library's Playbook door keeps its clay: it is a brand tile, not a signal.
- **Green or grey for everything else**: every block's title, stripe and done tint are the same green (warm-up
  and power were clay and strength green, and a block the app did not recognise took its colour from its
  position, so *Core* was clay because it was third; `blockClass()` still names the type for the code); the
  rule under a block title is grey; the running session bar, its clock and Pause; Guided; *Good afternoon*
  (grey); Game Plan's labels, aim numbers and *Up next!*; *+ Log a max* and *How this works* on Records; and the
  Log a max form (2026-09-27, found by DOC-01): its estimate green like Records' own number, its unit and a *good*
  grade grey, the picker's chevrons grey, its inputs' borders neutral in dark mode, and Save the primary button.
- **Buttons stay green**, as the design bible says (B, clay buttons, was not picked).
- Every clay colour code touched became its token (`--ice` / `--clay-ink`): 87 written out on main, 78 now.

⚠️ **Before you colour something clay, ask whether it asks the athlete to look.** A header, a label, a
state or a button is green or grey. `ds01-test.js` in the session's scratchpad renders the day, a session,
Home, Game Plan and Records in both themes and fails on any clay outside the list above.

## 🔠 One type scale (DS-03, 2026-09-27)

Before: 46 font sizes, 22 of them between 6 and 20 px, 34 pairs within a pixel, text down to 7.5 px (the
records, weight, Log a max, readiness, sign-in and Library screens, which A11Y-01 had not measured). Now every
size is a token in `:root`, picked by its job:

| Token | px | For |
|---|---|---|
| `--fs-label` | 11 | Space Mono labels, eyebrows, pills, the tab bar, meta lines, the line of numbers. **The floor.** |
| `--fs-small` | 13 | a secondary line, a helper sentence, a small button |
| `--fs-body` | 15 | notes, cues, sheet text, rows, buttons |
| `--fs-field` | 16 | what the athlete types (an iPhone zooms the page on a tap under 16) |
| `--fs-lead` | 18 | a card's or sheet's title, a closed card's name, the digits on a control (RPE buttons) |
| `--fs-title` | 22 | a section title, the open card's name, a number in a row |
| `--fs-head` | 28 | a heading inside a screen, a day's number |
| `--fs-display` | 44 | the title at the top of a screen |

- **Display pieces keep their own size**: 32 px and up (the rest timer's 96, record numbers, the clamp()
  heroes), and a smaller numeral whose line says `/* display: … */` (the session clock, Guided's steppers).
- **`scripts/check_type_scale.py`** (pre-commit guard 12) blocks any other px size, anything under 11 px, and a
  token that stops being the scale. A new rule picks the step by its job; it does not invent a size.
- **Buttons and fields take the app's font** (`button, input, select, textarea { font: inherit }`): the Sign in
  button, the ← backs, ⋯ and ▶ were in Arial at 13.3 px. Every box kept its size (measured on 11 screens).
- **Only weights that load**: the font request is Barlow 300–700, Barlow Condensed 400/600/700/900 and Space
  Mono 400/700. Barlow Condensed 800 (33 rules) was never loaded and drew as 900, so the rules say 900; Space
  Mono 500/600 said 400/700; Barlow's bold (`<strong>`, 600 labels) had been a faked bold of 500.
- **The line of numbers is never cut** (found while measuring): its parts sat in one unbreakable run, so on a
  360 px Android the closed card's `… · 2:30` ran past the card, and the open card's (with *tempo* and *rest*
  written out) at 360 and 375 too. It is a wrapping flex row now: tighter dots under 381 px, it runs under the
  ⓘ (which sits beside the name), and a part that still does not fit starts the next line. The dot ends a
  part (`span:not(:last-child)::after`), so a new line starts clean. On a 390 px iPhone the open squat card's
  four parts take two lines; before, they fitted only by running into the card's padding.
- **One primary button** (part 2, 2026-09-27, after DS-01 settled that buttons are green): every filled action
  (Sign in, the welcome's Open Day 1, Begin session, Start/Pause, Rest, the rest timer's Pause, Guided's Done,
  Send it, Done · send to coach, + Log a max, Log a max's Save to Personal Records, Weigh in) wears one look, set once at the end of the stylesheet:
  green, white Barlow Condensed 700 in capitals, 1 px tracking, an 8 px corner, 44 px at the least. There were
  eleven (corners from 4 to 13 px, two fonts, tracking from 0.02 em to 1.5 px, weights 700 and 900, and Sign in
  and Open Day 1 in clay). Each rule keeps only its place and size: full-width actions at `--fs-body` (the
  welcome and Done at `--fs-lead`), compact ones in a card or the session bar smaller, where WK-02 and WK-03
  measured their widths (the slim bar's Pause keeps its 0.5 px tracking under 480 px). **A new primary action
  joins that list; a secondary one is outlined** (Guided, Reset, Clear it).
- AA Proof's type (Outfit, its own sizes) goes with SEAM-01; its labels are 11 px at the least since #286.

## ⏱️ The session bar and "In progress" (WK-03, 2026-09-26 and 2026-09-27)

**Before Start** the session bar (`.session-timer`) is the full bar: under 480 px two rows (label and clock on
one line, Start and Guided full width under it), and at any width the buttons wrap before the clock shrinks. The
label is one line ("Ready when you are", "In progress", "Paused", "Session duration"). A Home day card
started today and not finished (`dayInProgress()`) shows *In progress* on its banner and **Resume ▶** under
it (`.dc-live`); a day done this week is a small `.dc-row` (HOME-02). `paintWeek()` redraws them whenever
the day view closes (`paintDayCardPills()` is no longer called).

**From Start until Done it is the slim bar** (Amir, 2026-09-27, option C of the mockup at
https://claude.ai/artifact/CiUjm5sF3cz4YhGzJCR1WY). `renderTimer()` sets `.slim` when the day's clock has
started, is not finished and is inside the 6 h grace. One line, 54 px: **← Home** · the clock · **Pause** (or
Resume) · **⋯**. The label goes (the clay clock and Pause / Resume say it). **⋯** (`toggleBarMore()`) opens
Pause, Guided and Reset on a second row; `foldBarMore()` folds it (and resets `aria-expanded`) when Guided opens,
the day closes or the bar stops being slim. **The tab bar hides** while a slim day is open (`body.session-on`,
`paintSessionChrome()`, called from `renderTimer()`, `switchDay()` and `closeDayView()`): ← Home or the
phone's Back closes the day, the clock keeps running and Home shows In progress · Resume. On an iPhone SE the
two bars covered 26% of the screen mid-session; now 9%.

- **It never cuts the clock.** Past an hour the clock is seven characters (`.long`, set by `renderTimer()` and
  the 1 s tick): under 420 px "Home" becomes the arrow alone and the clock steps to 22 px. Under 360 px the
  arrow is always alone and Pause / Resume shows its symbol only, drawn in CSS (`data-sym`; the ⏸ glyph alone
  renders as a square, which reads as stop), with the word as its aria-label. Measured in every state (before,
  running, past an hour, paused, ⋯ open) at 320, 360, 375 and 390 px in both themes: nothing overlaps, every
  button is 44 px.
- A control added to the session bar goes on the slim line or under ⋯, and is measured the same way.

## ⏲️ The rest timer keeps time in a pocket (WK-02, 2026-09-27)

- **It counts from a timestamp** (`timerEndsAt`): `timerTick()` reads the clock every 250 ms and paints only
  when the whole second changes, so a phone that sleeps or throttles the page still ends the rest on time, and
  `visibilitychange` catches it up on return. Back more than 30 s after the end: it closes with no alarm.
- **Every door opens it running** (`openRest()`); Pause, +15s, Reset and Close are unchanged. Guided's rest
  (`openTimerAuto()`) is the same engine.
- **At zero:** two short Web Audio tones (`restBeep()`, nothing downloaded; the audio context is started in the
  tap that opened the rest, and a phone on silent stays quiet) plus a buzz where the phone has one (not iPhone).
  **Sound on/off** on the overlay is `rest_sound` (`'0'` = off) on this phone only.
- **The screen stays awake** while a rest runs (`restWake()`, the Screen Wake Lock API), released on pause
  and close and asked for again on return.
- **The rest offer** (`offerRest()`): ticking a set in list mode, with sets still to go on that exercise,
  brings up one 48 px **Rest 2:00** button at the foot of the screen (above the tab bar when the tabs
  show). It never starts by itself, because athletes also tick sets after the fact; it goes on ×, an
  untick, leaving the day or 90 s. Guided never shows it. Circuits keep their Rest button only. The
  card's **Rest ⏱** button is 44 px tall (it was 28).
- The overlay's dark palette came with A11Y-01 (#245). It is solid since 2026-09-27 (POL-01): at 97% the day's
  cards showed through behind the clock.

## 🧾 The working card (CARD-01/02/03, 2026-09-27)

Built from Amir's notes on two mockups (claude.ai/artifact/EzD59Z2yYA2pXWyqFxQ8rz). Opened, the card was
1,306 px and the first set sat 953 px down; now about 700 px with the first set about 400 px down.
**Closed** (`renderExercise()`):
- **One line of numbers** (`renderNumLine()`, `.ex-numline`): `4 × 6 · RPE 7 · 3-1-1 · 2:30`, only what was
  prescribed, the exercise's own rest only. It replaced the stats grid AND the grey number pills. The words
  *tempo* and *rest* (`.nl-lab`) show once the card is open. `numLineText()` reads it as text. Where it cannot
  fit (a narrow phone, an open card) a part starts the next line rather than running off the card (DS-03).
- **A pill that says something stays a pill** (Amir: *"we need to find a way for them"*): the green `intent`
  pill and a legacy card's chips (`renderExSummary()`), and the check-in's pills. On a lower day `rdTarget()`
  takes `RPE 7` out of the line and adds the clay **RPE 7 → 6 today** pill, so the number is said once;
  `paintToday()`'s undo puts it back.
- **The Coach's Note is a clay dot after the name** (`NOTE_DOT`, an empty span inside `.item-name`, so the
  name's text is unchanged); open, the note is cut to two lines with **More ›** (`fitNotes()` measures it
  when the card opens: `toggleExpand()`, Guided's `renderStep()`).
- **The ⓘ sits at the right end** (`.ex-side`, `paintSpine()`), 26 px, and a Because fills it clay.
- **No history on a closed card** (Amir: *"no history on the exercise card when not opened"*): the *Last*
  pill is gone.
- **A long name wraps beside its number** (`.item-name-row` no longer wraps), never under it.

**Open**, in this order: the note, **Last time**, **How to do it**, the sets, Rest. There is no *Log Sets* label.
- **Last time is a box** (`paintLastTime()` into `.lt-slot`): closed it shows last session's **last set**,
  `70 kg × 5 @ 8` (the RPE clay over target, steel blue under; `ltLastSetHtml()`); tapped, every set, the
  RPEs against the target, the note and **History ›**. Open or closed is ONE setting for the phone,
  `lt_open` (`ltToggle()`: every box follows the one tapped; unprefixed, so it never syncs). A first
  meeting shows the **First time** box. A circuit keeps its old strip, always open.
- **How to do it** (`renderHowTo()`, a `<details class="ex-how">`): the video and the cues in one row that
  names what it holds, *Video & 4 cues* (`paintHowTo()`, which also hides it while it holds nothing, since the
  Spine's cues arrive late). It opens by itself only when the athlete has **no history** for the lift
  (`openHowFirstTime()`, run by `paintLastTime()`), and on a Library session; once tapped it stays as left.

**Done**: a finished exercise's closed row is small and says what was done, *72.5 kg × 6 · 6 · 6 · 6 ·
RPE 7 7 7 8* (`paintDoneLines()` from `updateProgress()`, one line with an ellipsis; `.is-done`). After
the last set's RPE (or a tick-all on an open card) the card folds and the **next unfinished card opens in
view** (`foldWhenDone()`, 700 ms): a set still waiting for its RPE keeps it open, Guided never folds,
a tick-all on a closed card opens nothing. Library cards never become done rows.

**The kg box follows the work** (CARD-03, Amir: *"By the work"*; `kgWanted()` / `paintKgCol()`): shown
when the Spine entry's `equipment` is loaded (`KG_LOADED`: barbell, dumbbell, kettlebell, cable, a
machine that is not cardio, landmine, sled, medicine ball…), and kept when that is unknown (no approved
entry, no equipment) or when the athlete has **ever logged a weight** on it (this session or history),
so a weighted plank keeps its box. Hidden (`.ex-set-log.no-kg`), never removed, so Guided and the
carry-down never meet a missing node. A row with no box at all says its dose, `30 s / side`
(`.ex-set-dose`, from `data-dose`). **No box for the seconds a hold lasted** (Amir, 2026-09-27: *"Leave
the tick"*): the tick means the time as written, and a shorter hold goes in the Note. (It would have
needed a new field in the log line, which only writes `×n` for a reps dose.)

Guided copies the line of numbers and the pills under its name (`renderStep()`), because they live in the
header now. Circuits got the same header (line of numbers, note dot) and lost their Rounds/Rest grid.

## 🧭 Guided Mode's layout (WK-01, second part, 2026-09-27)

- **The current row is pinned** (CSS `position: sticky` on `.step-current` inside `.step-scroll`, whose
  `.ex-log` lets it out with `overflow: visible`): in place when it is on screen, held just above the footer
  (or under the top bar) otherwise, with a solid tint because it passes over the rows above. Sticky cannot
  lift a row above its own table, so `renderStep()` also scrolls just far enough when the whole table starts
  below the fold (a first-time lift, its video and cues open). Measured before: the row was under the
  footer on 4 of 14 steps at 375×667 and 8 of 14 at 320×568; after: on screen on every step at all three sizes.
- **Kg on the rest screen**, beside reps and RPE (`paintTimerLog()`, above).
- **Circuits join Guided, one step per round** (`buildStepSeq()`): a circuit that logs something (a superset,
  a complex, conditioning); a prep circuit logs nothing and stays out, like the warm-up items. A round has
  no tick of its own, so `stepDone()` reads its RPE (the same `<id>_rpe_<Name>[_rN]` key the list writes),
  this Guided session's finished rounds, or the circuit's tick; the last round ticks the circuit
  (`finishRound()` → `toggleCheckOnly()`), the one unit the day counts it as. The round's rest screen asks
  its RPE through the row's own buttons (`paintRoundLog()`). The pill reads *Round 2 of 3*.
- **The rest screen scrolls** on a short phone instead of cutting the panel off (`.timer-overlay.has-log`),
  and its ring shrinks under 720 px tall.

## ✅ One finish: rate, then Done (WK-04, 2026-09-27)

Before, finishing was two steps on two buttons: **Finish Session ✓** (or **Finish Anyway**) stamped the day,
then the athlete rated it and had to tap **Send Session Info to Coach**. With no signal that said "Something
went wrong" and kept nothing, and every extra tap sent another email. Now:

- **The finish card** (`refreshConfirmCard()`) shows from the first logged set, in three states: *In progress ·
  4 of 11 sets* with a bar and **Finish early**; *All done with Day N* once every set is done; and *Finishing
  Day N early* after two taps on Finish early (`finishTap()` → `armedTap()`), which lists what is not done and
  offers **Keep going** (`keepGoing()`). Nothing says "skipped" until the athlete chooses to stop.
- **Ready or early, the rating and the note sit in that card** (`.finish-rate`, moved between the finish card
  and the finished card by `moveRatePanel()`) and the button is **Done · send to coach ✓** (`finishDay()`).
  Done needs the rating (session RPE × minutes is the load coach.html reads): without one it shows a hint and
  a nudge and finishes nothing. Done locks the clock, stamps `<id>_completed_d<N>`, saves the record
  (`recordSessionToCloud()`) and sends ONE report (`sendReport()`).
- **The report waits in an outbox on the phone** (`<id>_outbox`, written raw and skipped by `_snapshot()`, so
  it never syncs: another phone must never send it again). One entry per session, the day and its finish
  stamp (`sessOf()`, `isSess()`): an update replaces the session's own entry, and next week's Day 1 never
  replaces last week's report if it is still waiting. `flushOutbox()` sends it at once, on the `online` event
  and 2.5 s after boot; a success writes `<id>_sent_d<N>` (when), `<id>_sentsig_d<N>` (the rating and note it
  carried) and `<id>_senton_d<N>` (the date the session is filed under, which coach.html's `syncGapsOf()`
  matches against `session_history`: a report can now go days after its session). A rating or note changed while it still waits goes into the waiting report
  (`refreshPendingReport()`), not a second email.
- **The finished card says where it is** (`paintSendStatus()`): *Sending to your coach…*; *Saved on your
  phone. It goes to your coach when you have signal.*; *…It didn't reach your coach yet.* with **Try again**
  when the service refused it; *✓ With your coach · 10:12 AM*. **Send the update to your coach** shows only
  when the rating or note changed after the report went (`reportSig()` against `_sentsig_d`). The demo and
  the coach preview send nothing and say so.
- **Guided's Finish Session ✓** closes Guided on this card (`stepFinish()`); it never finishes for the athlete.
- **Reset in the session bar** (Amir, 2026-09-27: *"when you start, its locked in and you cant cancle or
  reset"*): `.session-timer-reset`, two taps (`armedTap()`, armed label *Reset?*), shown once the day has started
  (its clock inside the 6 h grace, or a logged set) and until it is finished (`paintResetBtn()`); the finished card
  keeps its own **Reset Session**. Under 480 px the bar's three buttons tighten while Reset shows (`.has-reset` on
  the bar), so every state, armed included, fits one row down to 320 px; the row wraps rather than clips. Both run `resetDay()`: the clock, the check-in, the ticks, reps and RPEs go; the typed
  weights, `lw` and the note stay. A report still waiting for the reset session is dropped (an earlier week's
  still goes), and so is the Rest offer. Done hides the Rest offer too.
- `confirmSession()` stays for older callers: it finishes when the card is ready, and otherwise asks to finish
  early, as the button does.

## 💡 First-session hints (ONB-01, 2026-09-27)

AA Proof runs a tour; the training app, the paid product, had nothing, and the rules that make logging fast
lived only in the guide, two tabs away. Now three hints, `paintHints(day)` in `program.html`:

| Hint | Shows | Says | Gone when |
|---|---|---|---|
| `bar` | under the session bar, while the day is not started | *Tap **Start** as you begin, so I know how long the session took. Or **Guided**: one set at a time, with your rest timed.* | the clock starts, or Guided opens |
| `set` | under the first set to do, on an open card | *Weight in, set done: tap the **circle**. One tap means done as written. Different reps? Type them first.* (no weight on a bodyweight move, no reps on a hold) | a set is ticked (a warm-up tick does not count) |
| `rpe` | under a set's How hard? strip when it opens | *How hard was that set? **10**: not one more rep. **8**: two left. I set your weights from it.* | an RPE is picked |

- **One at a time, in the flow**, never over the work: the one that applies where the athlete is, the most
  immediate first (`rpe`, then `set`, then `bar`). **Got it** retires one too. A tap on a hint never folds the
  card under it. None inside Guided, none on Home.
- **Once per athlete, not per phone**: `<id>_onb` (`{bar, set, rpe}`) syncs with the progress.
- **Never for someone who has trained**: a later cycle (`currentCycleIndex > 0`), a finished session
  (`hasFinishedASession()`), or last time's weights on the phone mark all three done at once. Never in the coach
  preview; always in the demo, where everyone is new.
- The words name real controls, like the guide (CNT-01): rename Start, Guided or the circle and change
  `ONB_TEXT` in the same PR.

## 🔥 Warm-ups are a list, and a circuit's rest is never invented (WK-05, 2026-09-27)

- **A circuit that logs nothing is a warm-up list** (`isPrep` in `renderCircuit()`: no `logWeight`, no
  `logRPE`, which is what a prep block gives by default). One line per movement: letter, name, dose and ▶ when
  it has a video, with its cues folded under a chevron (`.round-row.prep`, `togglePrepCues()`). A tap on the
  row or the chevron opens that movement's cues; ▶ plays and never toggles. The chevron shows only once the row
  has cues (`has-cues`: its own, or its Spine entry's, which `paintSpine()` fills in). A real four-movement
  primer opened to 1001 px with twelve cue lines always open; it opens to 452 px now, on one screen.
- **Rest is never invented, for a circuit either.** It fell back to 60 s, so 19 of the 135 live circuits
  (7 athletes, 18 of them warm-ups) showed "rest 1:00" that nobody wrote. Now: the circuit's own rest
  (`rx.rest`, or legacy `restSec`) → the block's → none. Only its own shows in the line of numbers. None
  written: a working circuit's button says **Rest timer ⏱** and opens at a minute; a warm-up has no rest
  button.
- A warm-up with no rest button is still a circuit: `initSetOrRPE()` and `initNotes()` used "has a rest
  button" to tell a circuit from a simple item, and now test the circuit itself, so it keeps its Note row.
- **Under 360 px a row with a kg box puts the dose under the name** (POL-01, 2026-09-27): a superset's row
  (letter, name, dose, kg) ran 34–42 px wide of a 320 px phone and cut the kg box off the card. A warm-up's
  rows have no box and stay one line.
  Guided still leaves warm-ups out (WK-01). Working circuits keep their cues open, as before.

## 👤 Your account, and Sign out (NAV-02, 2026-09-27)

`signOutAthlete()` existed in both apps and nothing called it: a shared family phone, a lent phone or a
second account meant clearing the browser. Now the **initials button** sits top right on Home, Coach,
Library and Game Plan, where the floating dark-mode toggle was (`#global-account`, a solid green disc with the
athlete's initials; hidden in a day view, whose banner keeps its own moon for mid-session). It opens
`openAccount()` in the one sheet (`#hist-overlay`, so Back closes it):

- **Theme** — Light / Dark, the athlete's choice as before (`toggleDark()`, `dark_mode`).
- **Install the app** — only when not already installed; it clears an earlier dismissal first, because
  here it was asked for (`A2HS.show()`).
- **How the app works** — the guide in the same sheet (`openHelp()`), with ‹ Back to this page (COACH-02, below).
- **Privacy** — `/privacy.html`.
- **Sign out** — two taps (`armedTap()`), then `signOutSafely()`: the waiting report (`flushOutbox()`), the
  session queue (`_replayQueue()`) and the progress (`_pushSnapshot(true)`, now awaitable) go up, in that order
  and each capped, then `_signingOut` stops every later push (the page's own pagehide push would otherwise run
  after the sign-out), then `signOutAthlete()`. The athlete's data stays on the phone under their id; a report
  still waiting is said on the sheet. Never offered in the demo or the coach preview (it would sign the coach out).

AA Proof has the same in Settings (HABITS.md → *Sign out*); the two apps share the sign-in, so either signs
out of both.

## ❓ The guide in the sheet, and the jargon is the link (COACH-02, 2026-09-27)

The guide (`APP_GUIDE`, fifteen cards) sat at the bottom of the Coach tab, under the personal notes, and nothing
in a workout led to it. `openHelp(key)` now draws it in the one sheet (`#hist-overlay`), every card folded or the
one asked for open and scrolled to. Four doors:

- **Your initials → How the app works** (NAV-02), with ‹ Back to the account page (`openAccount` and `openHelp`
  are wrapped by `wrapSheetOpeners()`).
- **One row on the Coach tab**, *How the app works*: the tab is Amir's voice now (WhatsApp, his notes).
- **The jargon itself**: **How hard?** on a set's RPE strip (`.ex-set-rpe-q`, a button now) and **tempo** in an
  open card (`.nl-help`; the word shows only when the card is open, and `numLineText()` still drops it) open
  *RPE & Tempo*; each is marked by a dotted underline, nothing added to the card. Under 360 px the strip hides
  its label, as before.
- **? in Guided's top bar** (`.step-help`) opens *Guided mode*, a new card that names Guided's real buttons.

A card's `key` (`rpe`, `guided`) is what a door asks for; `tempo` shares `rpe`. The sheet sits above Guided,
and closing it leaves Guided where it was.

## 📲 The install ask waits for a finished session (HOME-03, 2026-09-26)

The "Install app" toast (`A2HS` in `assets/js/shared.js`) used to fire 2.5 s after the first sign-in, on
top of the welcome and over Day 1. `maybeOfferInstall()` in `program.html` now asks only once the athlete
has finished a session (`hasFinishedASession()`: the history cache, or a finish or send on this phone): on
a later open, or 1.8 s after the session report reaches the coach (`flushOutbox()`, WK-04). A dismissal is remembered
(`a2hs_dismissed_v1`), and the toast shows once per page. Its words match the phone: **Install** only when
the browser offered an install (`beforeinstallprompt`), the menu route when it did not, Share → Add to Home
Screen on iOS, and "open in Safari/browser" inside WhatsApp, Instagram and the like. AA Proof no longer asks
a coached athlete to install a second app (HABITS.md → the install offer).

## 🗑️ Anything that deletes takes two taps (LOG-02, 2026-09-26)

`armedTap(btn, armedLabel, run)` in `program.html`: the first tap arms the button (its label becomes what the
next tap does, class `armed`, a short vibration), a second tap within 4 s runs the delete, and it disarms by
itself. **Reset Session** (on the finished card, under the send status line), a **body-weight reading** and a
**Personal Record** go through it, and since WK-04 so do **Finish early** and the session bar's **Reset**.
"Delete all my weight history" already asked twice with its own code. A delete is still a tombstone underneath
(`deleteCeilingEntry()`, `saveWeight(d, null)`); only the door changed.

## 📖 The in-app guide names real controls (CNT-01, 2026-09-26)

The **How the app works** cards (on the Coach tab until COACH-02, above) are `APP_GUIDE` in `program.html`. Nothing checks them against
the app, so they drifted: for weeks they said "Finish Workout → Send Data to Coach", that the finish card
appears "when every exercise is checked off", and "tap the timer icon". What is true on 2026-09-27:

- The finish card appears at the **first logged set**: *In progress* with the count and **Finish early** (two
  taps), or *All done with Day N* (`refreshConfirmCard()`).
- The session RPE (1–10), an optional note, and **Done · send to coach ✓**, which finishes and sends (WK-04,
  above). **Reset** sits in the session bar once a day has started.
- The rest timer opens from the **Rest** offer after a tick, or the **Rest ⏱** button under an exercise's sets (WK-02, above).

**Rule:** a PR that renames a button, moves a control or changes when a card appears updates its guide card
too (CLAUDE.md says the same). The Library's *Mark as done* note promises a habit tick only when AA Proof
will give one: `_wsHabitOn()` reads `<id>_hab_cfg` (never writes it); WORKOUT is core and always counts,
Mobility and Breathe are add-ons that count only when switched on, and no config on the phone reads as off.

## 📚 The Library's Sessions: a list, and a session at the right moment (LIB-01, 2026-09-27)

Amir's picks A and C (*"Library Shelves"* page). Before: every card wore its shelf's one photo (the flour bowl on
all five strength sessions), two showed per shelf and the other 28 of 42 sat behind a sideways swipe, the ›
beside each shelf's name did nothing, and what a session was for was only on its own page. *Mark as done* had
been pressed once in 60 days, while 26 athletes logged 271 programme sessions.

**A · the shelves as a list** (`renderSessionsWorld()`, `shelfRowHtml()`, `toggleShelf()`):
- Each shelf's photo once, as a band holding its number and name. Under it, the first `SHELF_SHOWN` (3) sessions
  as rows: the name, what it is for (`focusTag`), `duration · equipment`, and **✓ the AA Proof habit it ticks**.
- A shelf with more than three wears **All N ›** on its band; the band is the button, and it shows the rest in
  place (**Show fewer ‹** folds it back, `aria-expanded` says which). A shelf of three has a plain band.
- The tick is `libTickLabel()`, the one rule the shelf rows, the suggestions and the session's own Done note all
  ask: Proof's words (Session, Mobility, Breathe), only when Proof will give one (an add-on only once switched on
  there, `_wsHabitOn()`), never in the demo or the coach's preview (no record to write to), never for a session
  whose `countsAs` is `none`.
- Nothing removed: *Mark as done*, the shelves and their order (the database's `sort_order`), every session page.

**C · a session at the right moment**: two moments the app actually knows, never a rest day (Home never names
one). `LIB_PICKS` holds the picks, **one line each** (the session's `id`, a kicker, the words after its name);
the minutes, "no kit" (equipment *Bodyweight*) and "ticks Mobility" are read off the session itself.
- **Sore** (`paintSoreSugg()`): the day's check-in answered soreness **1 or 2** (not a skipped check-in), so the
  finished card offers *The Morning After* under its message: *"The Morning After: keep moving, tonight or
  tomorrow. 17 min, no kit."* About one check-in in twelve (25 of 302 in the 90 days to 2026-09-27).
- **Week done** (`paintWeekSugg()`): every session of this week is done (`weekDoneOn()`, the same sources as
  `weekDoneDays()`, so it shows exactly when This Week says *All N sessions done*), so Home offers *Green Light*
  in one row under the week's days. It goes when the week turns.
- **Each line goes once its session has been opened** after the moment began (the check-in's time; the day the
  week's last session was done). The phone keeps only when each pick was last opened, `<id>_libseen`
  (`{id: ms}`), written by `openWorkout()` through `markLibSeen()` for the picks only: never synced, never sent.
- A suggested session's **←** goes back to where it was offered, the finished card or Home (`_wsReturn`,
  `wsBack()`), not to a Library it was never opened from; the phone's Back does the same through NAV-01's
  `topLayer()` (it presses that ←). `goTo()` forgets the way back on any other route.
- Never in the coach's preview. The kicker is clay: it asks the athlete to look (DS-01, above).

`lib01-test.js` in the session's scratchpad (53 checks): the shelves, the ticks by Proof's switches, the demo,
320 px, soreness 1/2/3/5 and skipped, the week done here or in the history, last week's, a pick opened before
the week was done, ← and the phone's Back, and a reload. The harness answers `get_library` from `workouts/`
(`library()` in `scripts/headless/lib.js`).

## 🏋️ Personal Records — two write doors (a finished session, + Log a max), and what to keep in step

One name on every screen since 2026-09-26 (it was also called **The Ceiling**; the code keeps
`ceiling*` names and the `<id>_1rm` key). Full account in `CODEBASE.md` → *Personal Records*.

**Records fill themselves (Fork 3B, 2026-09-26).** Before, a record existed only if the athlete
tapped Save, and 2 of about 33 coached athletes ever had one. `fillRecordsFrom()` now writes one
when a session's best set (`histBestSet()`, the History sheet's own maths) **beats every earlier
number for that lift**, marked `auto: true`:
- **New bests only**, because every screen leads with a lift's latest entry: an entry for every
  session would put a deload week's lower estimate on top as *▼ 12.5 kg*. History keeps every session.
- Runs on every save of a finished session (`recordSessionToCloud()`, with the New best band) and
  whenever history loads (without it, or the first open after this shipped would celebrate a
  session from weeks ago). Only `ceilingCandidates()` lifts; renames join through `HIST_ALIAS`.
- Filed under the session's `completed_on`, the date History shows, so the session just finished
  and the same session read back from the server are one entry.
- **The athlete's own entries lead.** A max by hand or a test is always kept and raises the bar for
  later days; a deleted day (tombstone) holds no record and sets no bar. ⚠️ Automatic entries carry
  `t: 0`, the oldest write there can be, so any write the athlete makes to that day wins every merge
  on either phone. coach.html reads them unchanged (*from a set*).
- The card has no estimate panel since REC-01 (below). *Save to Personal Records* is on + Log a
  max's form only, shown once its numbers give an estimate (`paintCeilingForm()`).
  (`.ex-1rm-save[hidden]` was also fixed: `display: block` had been overriding every
  `save.hidden = true`.)

What to keep in step:

- **One estimator for every door.** Automatic new bests, and **+ Log a max** on the Records screen
  (pick a lift from the current cycle, enter kg/reps/RPE, optionally backdated), both through
  `estimateOneRM()`. The exercise card's own estimate and *Save to Personal Records* panel
  (`attachCeiling()` / `paintFromFields()`) were removed on 2026-09-26 (REC-01, Amir: "Off the card,
  keep in Records"): nothing on the working card suggests a weight mid-set.
- **The rename matcher is in `program.html` AND `coach.html`** (`matchRenamed()` /
  `ceilAliasMapC()`). It decides whether a lift renamed between cycles reads as one row or
  two; if the copies drift, the coach and the athlete are looking at different records for
  the same body. ⚠️ It resolves names at READ time and never rewrites stored ones — rewriting
  loses the race across devices and brings the split back doubled.
- **A DELETE IS A TOMBSTONE** (`{ del: true }`), never a dropped row, for exactly the reason
  body weight's is — and every write must rebuild from `loadCeilingRaw()`, not `loadCeiling()`,
  or the next save silently drops them all.

The `"test": "5RM"` retest flag is written by `/program-design` (`test_flag`) → `/program-assemble`
→ `SCHEMA.md`; the athlete's nudge is anchored to the **cycle's closing week** with a 28-day floor,
the coach's is the floor alone. Two or three flagged lifts a cycle — the nudge works by being rare.

## Body weight — the 2026-09-03 design, built in AA Proof

> The screens below (`renderWtRow()`, `renderWeight()`, `renderSettingsWeight()`, `renderWtNotice()`)
> lived in `habits.html` until the move of 2026-09-12 (see *Body weight lives in `program.html`* above).
> The data rules still hold where the feature lives now: the `<id>_hab_wt` key, union by date with the
> newest `t` winning, a delete as a tombstone, never scored. The on/off switch and the disclosure
> banner did not come across: nothing is recorded until a reading is entered, and every reading
> deletes in one action (`privacy.html` §2.3 rests on that).

Added 2026-09-03 (Amir: *"add a weight tracker, with history … push my clients to open the
habit tracker"*). Kilograms, **on by default for everyone, toggled off** in
Settings → Body weight (`CFG.wt.on`; flipped from off-by-default 2026-09-05, Amir:
*"should be on for everyone automatically ... they can turn it off"*), and **deliberately
outside the whole scoring system**: no XP on either side, no `xp_rules` key, not in
`HABITS`/`live()`/`rosterOn()`, never written to `LOG`. It is the one feature that is *not*
on the scored-twice table above, and the reason it was cheap and safe to ship. Full account
in `HABITS.md`; the "don't make it pay" argument in `XP_SYSTEM.md` §6.4.

⚠️ **The on-by-default flip is a one-shot migration, not just a new `defaultCfg()` value —
`defaultCfg()` alone only reaches a genuinely brand-new install.** `migrateOld()` carries a
second, independent one-shot flag (`CFG.wtOnMigrated`) that forces `CFG.wt.on = true` for
every athlete who has not decided for themselves — which the app tells apart from "just
inherited whatever default happened to be in force" via `CFG.wt.touched`, set the instant
the Settings switch is tapped, in **either** direction. That is what lets this safely
retro-flip athletes who already had an explicit `on:false` stored from the few hours this
shipped with the opposite default, while never overwriting a real choice. It only forces
the **loud** `saveCfg()` (the one that stamps `updatedAt` and propagates to the cloud) when
the value actually moves — a brand-new device already starts at `on:true` and must stay a
quiet `saveCfgQuiet()`, or it would race ahead of its first cloud pull exactly the way the
`saveCfg()`-vs-`saveCfgQuiet()` warning a few hundred lines below (`migrateOld()`'s own
comment) already guards against.

⚠️ **It has its own payload key — `<id>_hab_wt` — and three real bugs are why.** In
`LOG[day]` the server's `hab_xp()` would pay `customXp` for it as an unrecognised numeric
key (scoring on the **board** and nowhere else), and the log merge's `max()` would make a
loss unrecordable and let a stale phone overwrite a correction for ever. On `CFG` the
wholesale config adoption would delete it exactly as it once deleted earned rewards. Its
merge is its own: **union by date, newest `t` wins** — and a **delete is a tombstone**
(`kg: null` with a fresh `t`), never a `delete` of the key: the union only ever walks the
keys the *cloud* has, so dropping a key outright left the other phone holding the reading
and re-uploading it, and the deletion undid itself with nothing the athlete could do. **Zero SQL** — `save_progress`
merges payload keys at the top level and whitelists nothing, `get_progress` returns the
whole blob, and `coach.html` already selects `data` entire.

UI: `renderWtRow()` is a **white rounded card below the habit list and below its hint**
(Amir, 2026-09-04 — an earlier build put a square full-bleed band *above* the list and he
rejected it as inconsistent: this app is white rounded cards on lavender, and the hint
must stay attached to the rows it explains). The card carries the number, the month delta
and an inline sparkline, so it is the only thing on Today that shows a trend without being
tapped. Its **body opens the history and its button logs** — the habit row's own law (name
vs box); one button doing both by turns left the history unreachable before weighing.
`renderWtProgressRow()` puts the same fact on **PROGRESS**, after the habits and before
the quests, because that is the tab an athlete opens to check progress. `renderWeight()` is an overlay screen built on `renderDetail()`'s own furniture —
76px figure, `.block` sections, the three-up `.statnum` triptych — with **`.chip`/`.chip-on`
pills** for the **7 day / 1 month / 3 month** ranges, the same control Crew uses to swap
Roll call for the Leaderboard. **Invent no new component here**: every earlier attempt to
(a tinted band, a segmented tab box, a bespoke input) was the thing that read as foreign. `renderSettingsWeight()` holds the switch and **never deletes readings
when switched off**; `weightPanel()` in `coach.html` → Proof shows Amir the trend. The
chart is the app's **first and only chart** — line is a 7-day rolling average, dots are the
raw readings, every quoted change compares average to average, because daily weight swings
a kilo on water alone. Never put it on the board, the wall, or the programme record.
`privacy.html` §2.3 names it and, since it went on-by-default, rests on **legitimate
interests (GDPR Art. 6(1)(f))** rather than explicit consent — a default-on feature cannot
honestly claim consent as its basis, and the one-tap toggle to object is what makes
legitimate interests defensible instead. Full reasoning in `HABITS.md`.

⚠️ **The disclosure has to be SEEN, not just true in a policy doc — `renderWtNotice()`,
added 2026-09-05 (Amir has no lawyer or compliance person of his own to catch a mistake
here).** A **standing banner** — `.rcprompt`, unchanged, the same component the tour prompt
and roll-call pointer already use — sits above the weigh-in card until `CFG.wt.seenNotice`
flips, which happens the moment the athlete taps it (straight to Settings → Body weight, the
switch itself, not just the read-only history), opens the history any other way, or logs a
reading. The OLD copy (`wtCardLine()`'s empty-state sentence) technically disclosed this too,
but lived inside the card and vanished the instant there was a first reading — an athlete
who tapped *Weigh in* fast enough could act before ever reading it. That was not real
disclosure. **Also added the same pass: self-service erasure** — *Delete all my weight
history* in Settings → Body weight, next to the on/off switch, same double-tap-confirm as
*Reset today's log*. `clearAllWeight()` tombstones every day in one pass, never a raw
`WT = {}` — a bare wipe is invisible to the union merge and a device that has not pulled it
would resurrect every reading on its next push, the identical failure mode the single-day
tombstone fix (above) already exists to prevent. Proven across a simulated second device
that still holds real readings: it ends up with every reading tombstoned too.
