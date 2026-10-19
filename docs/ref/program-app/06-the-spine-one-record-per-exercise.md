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
- **The About sheet is Changeover** (Amir, 2026-10-12: *"lets go with A"*, from three directions on the About Sheet board,
  claude.ai/artifact/JhXuZuWHAVTzqg6NaEDHK9, with his changes). The questions an athlete asks between sets, one per band,
  paper and sand in turn, and a question with nothing to say is not asked:
  - **The green top** (`axHero()`): the pattern as a small word, the name (28 px past 32 characters), and when Amir picked it
    for this athlete, **Why am I doing this?** with his reason, its clay tag (*Your game*, *Your knee* …) and his sign-off as
    the week note signs (`WN_SIG` in white and his photo; Amir: *"Get how i sign my name from the new design i did for week
    notes"*). Opened from the Library, **In my plan?** sits at its foot, one row per day.
  - **What does it do?** the purpose, then **Builds**: the qualities as green tiles, each with its mark (`QUAL_ICON`, one per
    quality) and a ›, each opening its Quality page (Amir picked the tiles from the board).
  - **How does it help on court?** the On court line over a faint court (a padel court for a padel badge), racket players only.
  - **Where will I feel it?** the front-and-back body at its old size, lit green, and under it one line per kind whose dots
    are the colours on the body (*Mostly your ● quads. Your ● glutes help.*; Amir: *"remove the text and arrows in middle,
    and use texts like this, under the image"*). See *The muscle map*, below.
  - **Too hard? / Too easy? / Other kit?** over **Regressions / Progressions / Alternatives**: a two-column table, a linked
    name with a round ›, a name with no entry marked *Not in the app yet*.
  - **Your history** (opened from a card that has history): one row, *N sessions. Last time 70 kg × 6 · 6 · 5.*, opening the
    History sheet. It is the card's history now: the open card has no Last time box (*The working card*).
  - Opened **whole** (Library → Exercises, or no card on screen), **How do I do it?** comes first: the player, You need and the
    steps (folded after two when there are four or more), then **What should I think about?** (the two good cues) and **What
    do people get wrong?** (the fault, the one clay bar besides the reason).
  - **No WhatsApp door and no impact** (Amir: *"remove the whatsapp button ... not on the card i sent you, not in library"*,
    *"remove the impact data from everywhere"*). Its look is `.ax-sheet` on the frame: `sheetWrap()` takes it off before any
    other page (History, a quality, Why, Account, Help) draws, and puts it back when an opener drew nothing; ‹ Back sits white
    on the green. `scripts/headless/about-sheet.js` checks all of it at 390, 390 dark and 320.
  ⚠ **Opened from a CARD** (Amir, 2026-09-24): no How do I do it? (the card under it has its own). *In my plan?* shows
  **only when it is opened from Library → Exercises** (`fromLib`); the lists stay in both (Amir: *"i liked how regression
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
  else (`Nordic Hamstring Curl`) is the name of an exercise with no entry yet, drawn as a plain
  name marked *Not in the app yet*, nothing to tap. The name resolves at READ time like a card does (`spineFor()`),
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
  **Since 2026-10-09 there are no aliases** (Amir: one name, the Spine's): every card carries its entry's
  exact name, a different version (equipment, setup) has its own entry, and all 107 aliases were removed.
  A duplicate is now merged by renaming its cards to the kept entry's name.
- **Body parts involved** (Amir, 2026-09-24, from the course app's «بخش‌هایی از بدن که درگیر است»;
  `supabase/stage36_body_parts.sql`). `loads` = the course's region ids (`ankle-foot · calf-achilles ·
  knee · hip-groin · hamstring · low-back · trunk · shoulder · elbow-forearm-wrist`, plus `neck`),
  `impact` = `none · running · plyometric · landing`. The About sheet lights the regions on the body only
  for an entry with no muscles (one with muscles gets the muscle map, below), and names them under it
  (*It loads your knee and hip & groin.*). **Impact is drawn nowhere in the athlete app since 2026-10-12**
  (Amir: *"remove the impact data from everywhere"*): the entry keeps it for the app's own rules (a jump or a
  landing on a sore day, which lifts file a record) and for the coach. coach.html edits them as tick boxes and a
  menu; the database refuses any other word. **All 209 entries were set by hand** (stage36 the 100 most-used, stage37 the other 109, on
  Amir's *"do all 109 now"*), 56 of them copied exactly from the course where it has the same
  exercise. ⚠ **`impact` null means never checked**, and **every programme write fills both** for a
  new or touched exercise through `/spine` → Upkeep, which flags a missing one.
  The region and impact lists exist FOUR times (program.html `SPINE_REGION`/`SPINE_IMPACT`,
  coach.html `SPINE_REGIONS`/`SPINE_IMPACTS`, `draft_sql.py`, the stage36 checks): change all four.
- **The muscle map** (Amir, 2026-09-26: *"this is amazing, lets build"*; `supabase/stage42_muscle_map.sql`).
  The About sheet's body section (*Where will I feel it?*) is a **front-and-back body with the worked muscles lit**,
  at 300 px as it always was: main (`1`) in full green, helpers (`0.5`) in soft green since 2026-10-12 (Amir: *"you can
  turn them to green instead of clay"*; clay on that sheet is his voice), named under it in one line per kind whose
  dots are the colours (*Mostly your ● quads and ● glutes. Your ● core helps.*; a helper alone reads *No one muscle
  does the main work here.*; `MAP_ONE` holds the singular names). Nothing is drawn between the figures (Amir: *"too
  busy"*). The body sits on the sheet itself, warm greys on paper and dark greys in dark mode (Amir: *"the body should be on a light
  background, whatever it is in that page"*). `bodyPartsHtml()` draws it; `BODYMAP_SVG` is the drawing. coach.html's
  map keeps its own (clay) colours.
  - **What lights:** `get_exercises()` sends `muscles` = the entry's volume **credits** when they name a
    muscle, else its display-only **`exercises.muscles`** (the 60 stretches, jumps, sprints and rides
    whose credits are `{}` still work something). Only muscle names and 1/0.5 reach a phone, never cost,
    SFR or flags. An entry with neither falls back to *Body parts involved* on the same drawing: the
    zones light their muscles, and the knee and the ankle get a ring, since they are joints.
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
  circuit item. So **an entry must be approved before a programme using it goes live** (`/program-assemble`
  checks), or the card shows no cues. Entry cues are three, written for anyone (CUE-1, reworded 2026-10-11):
  the key point, a feel or a quick position check, and one avoid that names the fault, then the fix. No side,
  no kit, no tempo, no dose.
  ⚠ **The Spine wins** (Q9 A, Amir 2026-10-11: *"all recommended, go ahead"*). Until then a card that carried
  its own `cues` (1,094 cards in 29 older programmes, 962 of them different from the Spine, and 371 of the 376
  Library cards) showed those first, so a Spine improvement reached about one card in five. Now an approved entry
  with cues replaces the card's own on every card, circuit item and Library session. The card's own cues stay in the
  programme (nothing is deleted, so it is undone in one line) and show only when no approved entry with cues
  resolves: `spineCuesInto()` keeps them on the slot (`data-own`) the first time it paints, so a Spine that arrives
  late, or drops an entry, can swap either way. **Q9 A's first step went first** (2026-10-11, before the app change
  shipped): the old card lines that were about one athlete (a side, home kit, a pain stop, a depth or load limit) were
  moved into that card's Coach's Note, on a circuit item into the circuit's note with the item's name in front (an
  item's own note is not drawn). 30 notes in 15 programmes; 5 more lines were already said in the note and were left.
- **How to do it: the steps** (2026-10-11, the Exercise Card Blueprint; CUE-6, CUE-7; server
  `supabase/stage64_spine_steps.sql`). 141 of 320 approved entries had no video, and those athletes got three
  short cues and nothing else. An entry now carries `steps` (`text[]`, sent by `get_exercises()` for approved rows,
  `[]` when none): 3 to 5 plain lines for anyone (2 to 3 for a stretch or conditioning, up to 6 for a rack lift so
  the bail fits), one phase each, from setup to a safe finish, enough to do it safely from the words alone. Never a
  dose, a side, a tempo or a reason. Each part of the card says one thing (CUE-7): **the steps** the how, **the
  cues** the focus and the one fault, **the pill** this athlete's change (CHP-2's closed list), **the Coach's Note**
  this athlete. On the phone: `renderSteps(entry)` draws **You need:** (the entry's `equipment`, the floor and
  "none" left out: `kitLine()`) and the numbered steps (`.ex-steps`, the numbers green, never clay: DS-01).
  `stepsOf()` reads them, so an old `spinecache` without `steps` is the same as none. Where they show: the card's
  How to do it (*The working card*), a circuit item (*Warm-ups are a list*), the About sheet opened whole, Guided
  (it moves the card's own node). Check: `scripts/headless/howto-steps.js`.
- **Every programme write ends with Spine upkeep** (Amir, 2026-09-24: *"when i write or update a
  program, and there are movements that are not there, or missing some info, or can be updated, it
  should be updated there at the end … so everytime i write a program for an athlete, this gets more
  complete"*). `/program-assemble` Step 8, `/program-edit` Step 4 and `/workout` all run `/spine` →
  **Upkeep**: draft what's missing, fill empty fields on any entry, change the text of a draft freely
  but only *propose* changes to an approved one, and report a one-line **SPINE** block in the
  handoff. The same day, the athlete-specific cues on two athletes' cards moved
  into their Coach's Notes (previous versions in `program_versions`).
- **One name** (Amir, 2026-10-09). Card → entry resolves by `exId`, then name through
  `exNameVariants()`; the Spine has no aliases, and a card is named exactly as its entry. A rename in a
  LIVE programme loses the athlete's history for that lift unless it moves too: logged sets, `setlog_`
  keys and Records are joined by name, through `matchRenamed()`'s spelling tiers only. ⚠ **The resolver exists twice** — `spineFor()` (program.html) and
  `spineForC()` (coach.html). Same rule: **a card with an `exId` is that entry or nothing** (since 2026-10-11, audit TWIN-1: the phone is served
  approved entries only, so a card on a DRAFT shows no cues or video until it is approved; it used to guess an approved entry from the name, and the loose
  tiers found a different exercise's), and with no `exId` the tightest tier with ONE entry. `scripts/headless/spine-link.js` covers it in the app.
- `spinecache` (localStorage, no athlete prefix) is a cache of `get_exercises()` and never syncs.
- **Library → Exercises is the switch's third pane** (a door until 2026-10-13; Amir, 2026-09-24: *"something like the one i have in tps
  course"*): search, pattern chips, *In your plan* first. Every row opens the same About sheet
  (`renderExerciseLibrary()` → `openExerciseSheet(id, card, true)`); opened from the library, or with
  no card on screen, the sheet also carries **How to do it** (2026-10-11): the video, then You need and the
  steps, then the cues, all ABOVE the body map. Opened from a card it shows none of them: the card has its own.
  One design, not two.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
