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
`rx` → the grid · `setup` → quiet grey line (kit/position) · `intent` → **the** green pill (a grip
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
⚠ **THE TEMPO IS ONE CELL, with the digit that carries the instruction in CLAY.**
`TEMPO 3-1-1-0`, notation intact, and `tempoDisplay()` colours **the slowest phase when it is 2s
or more, plus any non-zero pause** — so `3-0-1-0` colours the 3, `2-1-1-0` the 2 and the 1, and
`1-0-1-0` nothing at all. `iso` reads `Hold`.
**Four shapes were tried; do not re-litigate:** a plain cell (undecoded notation — hence 153
hand-written `3s eccentric` pills), a grey line under the grid (a footnote — *"it doesnt capture
the eye and it doesnt look professional"*), phase cells on a second row (*"i dont like the new
tempo"*), and now the notation back with its point coloured (Amir: *"if a number is important in
tempo highlight it with other color"*). **The rule that survived all four: SAY IT ONCE — never
restate the tempo in `intent`, `setup` or a cue** (a cue spelling the count out burns one of only
three; still true of 39 of 506 live exercises with a tempo).

**`block.rest` states a section's rest ONCE** — on the section header (`PRIMARY ——— Rest 2m`),
feeding every timer in the block, drawing no per-card cell. An exercise's own `rx.rest` overrides
it and keeps its cell. **Circuits carry `rx` too**: `rounds` is a NUMBER now (it was the display
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
⚠ **`rxOf()` returns a normalised VIEW, not the `rx` object**: `sets`, `rpe`, `tempo`, `rest`,
`rounds` as strings, and the dose as `dose: { kind, value, side, label }`. So `rxOf(ex).time` is
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
  without the field: the app never invents a back-off. The numbers never change a card.
- **The pipeline owns it:** /program-design decides both doses as numbers (`week1:` / `lastweek:`),
  /program-engage writes the words (PART 3c), /program-assemble stores them, and
  `scripts/check_program.py` FAILs a cycle with no `weekNotes.last` (and a first cycle with no
  `weekNotes.first`). The 32 older programmes gain it with their next cycle, not by a bulk write.
- **The athlete profile** (same day): a `profile` block at the top of each coaching log (aim,
  goals, bottleneck, minutes/cap, kit, bans, injuries, proven…), kept current like the Exercise
  Ledger. Design copies it into the spec and the checker sets its flags from it. Older athletes get
  theirs at their next cycle. Format: /program-assemble Step 5.
- The same day `check_program.py` took Amir's answers from the audit: the 10-set floor is `--floor`
  (strength-and-muscle aims only, every major muscle, any sex; `floor-except:` names an excused
  muscle), more than 4 sets needs `--proven`, a first cycle switches the new-athlete rules on by
  itself (`--female` is retired), and the Quality headline is a WARN reported with a recommendation.
  All of it is in COACHING-PRINCIPLES.md, with the dates.

## 🕘 The Card Remembers — last time on every exercise (2026-09-24)

Idea #5 of `/ideas` round 1, built from the brief Amir approved ("go with your suggestions"). Every
standard exercise card shows what the athlete did **the last time they did that exercise** (any
day, across cycles via `matchRenamed()`), and **History ›** opens the History sheet. Four rules:
- **History, never a prescription.** It never suggests a load — Amir's rule is RPE, never load.
- **Reps are an override.** The reps box shows the prescribed number as a placeholder; `n` is
  stored only when the athlete did something else. Amir prescribes **one number, never a range**.
- **The log-line grammar exists three times** — `buildSessionData()` writes `Set 1: 80 ×5 @8 ✓`,
  `parseSetLine()` (coach.html) and `parseSetText()` (program.html) read it. Change all three.
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
  all when youre done"*). 61 still had no video then. **Since 2026-09-26 the entry's `video` is the only
  video source** (the app's `getVideoUrl()` reads it; `exercise_library.json` and its Notion sync were
  retired), and 64 of 220 entries have none yet. New names come in through Upkeep, below.
  **The next batch is the `/spine` skill** (`.claude/skills/spine/`): the what's-missing query, the
  alias/new/skip sort, and `draft_sql.py`, which checks every link. The batch file with SFR and
  flags stays in the scratchpad, never in this public repo.
- **The card gains ONE thing:** a small ⓘ after the name, only for an approved entry. Everything
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
  The About sheet draws them as *Body parts involved* (`bodyPartsHtml()`), regions as soft pills and
  impact in clay; coach.html edits them as tick boxes and a menu; the database refuses any other
  word. **All 209 entries were set by hand** (stage36 the 100 most-used, stage37 the other 109, on
  Amir's *"do all 109 now"*), 56 of them copied exactly from the course where it has the same
  exercise. ⚠ **`impact` null means never checked**, and **every programme write fills both** for a
  new or touched exercise through `/spine` → Upkeep, which flags a missing one.
  The region and impact lists exist FOUR times (program.html `SPINE_REGION`/`SPINE_IMPACT`,
  coach.html `SPINE_REGIONS`/`SPINE_IMPACTS`, `draft_sql.py`, the stage36 checks): change all four.
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
  quality page (`openQualitySheet()`: line, court line, how we measure it); the About
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
- **The card gains only a clay dot on the ⓘ** (`.ex-about.has-why`). The sentence opens the About
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
- **Guided Mode asks on the REST screen** (`paintTimerLog()`): a reps − / + and the RPE strip for
  the set just done. It holds no state — every tap goes through the row's own input and buttons.
- **The note is per SESSION**: `<id>_snote_<Name>` = `{ d: local date, v }`, shown and sent only on
  day `d`. The old `<id>_note_` was never cleared, so half the notes Amir received were re-runs
  (522 sent, 259 distinct). A date stamp, not a clear, because the cloud merge prefers text over a
  blank and would hand a cleared note back. Last session's note shows in the Last time strip.
  coach.html reads `snote_` ahead of `note_`.
- **Leftover rep ranges are never guessed.** `cardReps()`/`plannedReps()` return null for one, so the
  box shows `8–10` and reps are recorded only when typed. `repCount()` still takes the low end,
  for The Ceiling only.
- Weight and reps inputs normalise Persian/Arabic digits (`normDigits()`); live logs held `۲۵`.
- **An RPE off its target is coloured: clay OVER, steel blue `--rpe-under` UNDER, green on target**
  (Amir, 2026-09-24). The one exception to "clay is the only accent", and only for an RPE against
  its target: warm = harder, cool = easier, and orange-vs-blue survives colour blindness where
  red-vs-green does not. Every screen goes through `rpeVs()`/`rpeMark()` (row tag, the strip, Guided
  rest screen, Last time, History), which treats a target range like `7-8` as on target inside it —
  the old `parseInt` read `7-8` as 7 and called an 8 "over".
  **coach.html matches it:** each set in *per set:* is coloured the same way, and the average's
  *under target RPE* pill is steel blue (it was ochre, the colour of "extra set"). The average still
  flags only past `RPE_OVER`/`RPE_UNDER` (1.5); the per-set colours are exact, like the athlete's.

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

**Home order (same day).** This Week and the day cards come first; the Daily Habits card follows.
It sat above them from 2026-09-12, and in the fortnight after, 5 of 40 athletes logged a habit in a
week while 16 trained. The training is why the app is opened, so it leads.

## 🏋️ Personal Records (The Ceiling) — two write doors, and three things written twice

Full account in `CODEBASE.md` → *The Ceiling*. The three duplications to keep in step:

- **Two ways in, one estimator.** *Save to The Ceiling* on an exercise card, and **+ Log a max**
  on the Records screen (pick a lift from the current cycle, enter kg/reps/RPE, optionally
  backdated). `paintCeilingForm()` mirrors `paintFromFields()` deliberately — a second copy of
  the maths is how the two screens start disagreeing. Change one, change both.
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
> newest `t` winning, a delete as a tombstone, never scored, and the disclosure an athlete must see.

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
