## ✍️ The set log is COUNTERSIGNED, and the note belongs to ONE session (2026-09-24)

Amir: *"do as you recommend"*, on top of The Card Remembers. Design and evidence in
`docs/record/SET-LOGGING-DESIGN.md`. **Written by the coach, countersigned by the athlete:** every
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
  blank and would hand a cleared note back. Last session's note shows in the History sheet (the ⓘ's
  Your history; a circuit's strip shows it always). coach.html reads `snote_` ahead of `note_`.
- **Leftover rep ranges are never guessed.** `cardReps()`/`plannedReps()` return null for one, so the
  box shows `8–10` and reps are recorded only when typed. `repCount()` still takes the low end,
  for Personal Records only.
- Weight and reps inputs normalise Persian/Arabic digits (`normDigits()`); live logs held `۲۵`.
- **A Persian note reads right to left** (Line Call, 2026-10-13; Second Serve D6; 24% of day notes are in Persian). The
  app had no `dir` anywhere, so a Persian note sat left-aligned with its full stop at the start and the "Your rating" line
  wrapped its quote and full stop to the wrong side. Both text boxes (the day note, an exercise's note) and the note's
  folded preview are `dir="auto"`, and every place a note is shown back puts it in a `<bdi>`: the rating line
  (`paintRateFold()`, the same text), a circuit's last time (`.lt-note`) and the History sheet (`.hs-n`). A new place that
  shows an athlete's own words does the same. `scripts/headless/persian-notes.js` (9 checks).
- **Weight boxes open EMPTY, with last time's weight as a hint (Fork 3B, 2026-09-26).** Amir picked
  *"Hint plus Same as last"*. They used to open holding last session's weights as real numbers, so a
  bare tick logged last week's load as today's and every number built on the log (records included)
  was quietly a repeat. Now:
  - A set carries `lw`, **last time's weight**, and `w` is only ever today's. ONE function,
    `carrySet()`, ends a session's set for every place that does it: Done (`closeSessionAtDone()`, below),
    `autoResetStaleDays()` on the phone (both through `carryExerciseKeys()`), `stripSetLogSession()` on the
    cloud's copy, and a rename carried by `adoptRenamedExercises()`. `mergeStoredValue()` merges `lw` like
    the other fields. A skipped weight keeps the last one ever typed (`s.w || s.lw`).
  - **A session closes at Done** (Line Call, 2026-10-13; Amir: *"yes to all recommended, start with closing
    the session at Done"*). The set log, an exercise's RPE and a circuit's round ratings are kept per exercise
    NAME, and 36 of 37 live programmes repeat a name across days. They used to keep a finished day's ticks
    until the midnight sweep, so right after Done Home called the next day that shares a name "In progress"
    with Resume, and a second day trained the same evening opened with the first day's sets and would have
    reported them as its own (found by the second audit, Second Serve). Now `finishDay()`, after the record
    and the report are built, calls `closeSessionAtDone()`: the day's own copy of its sets and round ratings
    goes into ONE per-day key, `<id>_donelog_d<N>` = `{ sess, sets: { name: [set…] }, rpe: { key: value } }`,
    tied by `sess` to the finish stamp it belongs to, and the per-name keys are carried as the sweep carries
    them (`carryExerciseKeys()`). Names a day still under way today shares are left alone. **A reader of a
    set log or a round rating passes its day**: `loadSetLog(name, total, day)`, `saveSetLogValue(name, log,
    day)`, `rpeOn(day, key)` / `setRpeOn()` read and write a finished day's copy, so its cards still look
    done, its counts hold and a rating or note changed later re-saves the record it had; any other day gets
    the per-name keys. The copy is a per-day key like the rating: the sweep removes it, `staleCloudPlan()`
    restores it only while its day is today's and never lets the cloud tick a finished day's per-name keys
    again (the cloud's stamp or this phone's), and `resetDay()` puts its sets back before the reset.
    `scripts/headless/close-at-done.js` (24 checks).
  - The empty box shows that number under a small **LAST** caption (`.ex-set-wlast`), smaller and
    paler than the prescribed reps beside it, because a tick records the reps and not this. A bare
    `last 80` placeholder was tried first: at 375px the box holds about 38px of text, so `last 22.5`
    was cut off. A ticked set shows no hint.
  - **No Same as last on the card** (removed 2026-09-27, Amir: *"its a duplicate of what can be seen
    in history"*). It sat above the table as `Same as last · 80 kg` and filled every empty set; each
    empty kg box already shows last time's weight, and one number typed in set 1 fills the sets below.
    `sameAsLastFills()` / `sameAsLastLabel()` went with it. **Guided's rest screen keeps its own**
    (`.tl-same`, in `paintTimerLog()`): that screen has no Last time box, and the button types last
    time's weight into that set's box, which then fills the sets below like any typed number.
  - **A number typed in a set fills the empty sets below it**, and keeps them in step while it is
    typed (`8` then `80` leaves 80). It stops at the first set holding a number the athlete put there
    and skips ticked sets. Which rows were filled this way is kept in memory only.
  - **A tick on an empty box records no weight.** The summary grammar did not change, so History,
    coach.html and the email read the log exactly as before.
  - **A weight far above the lift's own numbers asks once** (Line Call, 2026-10-13; Second Serve D5; Amir: *"yes to
    all recommended"*). "600" typed for 60 filled down, stayed on a ticked set after the fix, and became an automatic
    Personal Record of about 760 kg that blocked every real one (37 of 41 records are automatic). `kgLooksWrong()`:
    over 1.5 × the heaviest this lift has seen on the phone (`kgRefFor()`: last time's weights, its history, its
    records), or over 300 kg with no numbers yet. The tick's first tap arms it (`.kg-armed`, a clay ring) and the note
    box says *600 kg? That's far above your numbers for this lift. Tap ✓ again to keep it.*; a second within 4 s keeps
    it, and that weight never asks again on the card this session (`card._kgOk`, `kgKept()`). A big weight typed into a
    set already ticked (the list, or Guided's rest screen) says so once (`kgCheckTicked()`), and Guided's Done goes
    through the same tick, so an armed tick opens no rest. Nothing is ever changed for the athlete.
    **A build-up asks once** (2026-10-18; Amir: *"it asks this question but warns you twice, I thought it's a bug"*):
    the sets already ticked today are "your numbers" too (`kgRefFor()`, the set being checked never counts as its own
    reference), so 120 · 140 · 160 on a lift last done at 50 asks at 120 and at nothing after it. It used to ask again at
    every heavier set, because only last time's weights and the history counted. The two taps are not a second warning:
    the first tap asks, the second keeps it. `scripts/headless/kg-check.js` (17 checks).
  - **The unit button: kg, lb or plates** (Amir, 2026-10-18: *"give the client the choice, some equipment is on lb and some
    has no weight so I told them to count the stacks"*, then *"plates is better"*, *"lb sessions should be shown lb in
    coach.html"*). The unit is **written in the weight's text**: a bare number is kg (every weight logged before this
    day), `45 lb` is pounds, `6 plates` is the count on a machine's stack (`1 plate`). So it rides every pipe a weight
    already rode (the cloud merge, the carried LAST, the saved session and its email, coach.html) and no field is added
    that `mergeStoredValue()` could drop. `weightOf()`, `splitW()`, `composeW()`, `weightText()`, `unitWord()` sit above
    `parseLoggedKg()`. The weight box holds the **number only**; the unit is the set table's column header word with a chevron (`.ex-set-unit`,
    list; a plain word, no pill: **Name Tag**, Amir 2026-10-19, *"go with your picks"*, the board's direction B), the tag inside each box of a
    superset (`.circ-unit` in `.wt-field`, 108 × 48 px, the same unit in every box, no pill row over the boxes) or the label of the weight line
    (`.tl-unit`, Guided's rest screen). A set table's boxes are about 60 px wide and carry the LAST caption, so no tag fits in them. **A tap on a unit button opens a menu of the three and
    changes nothing** (2026-10-19, Amir: *"if someone miss clicks the weight measure it changes: first a soft warning or notification,
    second let the person choose between the 3"*; it used to cycle kg → lb → plates on the tap, so one stray thumb relabelled every
    weight on the card): `openUnitMenu(btn, current, onPick)` draws three rows (Kilograms, Pounds, Plates · count the stack; the
    current one marked) under the button, `.unit-menu` on `body`, z 220 over the sheets and the note box. A pick calls
    `pickCardUnit()`, which changes the unit and then says so in the note box (`aaToast()`: *Weights are now in lb. The numbers you
    typed did not change.*, or *… in lb for this exercise.* / *… for this circuit.* with nothing typed) with **Undo** and *Keep it*,
    8 s; the note lets taps through to the boxes under it (`aaToast(…, { pass: true })`, only its two buttons catch one), and opening the menu
    puts away a plain note but keeps one with a button (the once-a-day clock offer). The menu closes on a tap elsewhere, Escape, Tab, a scroll that
    moves its button, a second tap on the button and Back (`topLayer()` returns `closeUnitMenu`, NAV-01). The same menu is on the circuit's pill and on Log a max's (`chooseCeilingUnit()`: nothing
    logged is relabelled there, so no note). A pick **relabels what is already typed on that card** ("100" becomes "100 lb"; the numbers
    stay, this is *I chose the wrong unit*, never a conversion; `setCardUnit()`). **Which unit a card is in** is never
    stored: `cardUnit()` reads the pick made this visit (`card._unit`), else the unit already in today's sets, else last
    time's (`lw`, which carries its own unit), else the lift's last logged session, else kg. Pick pounds once and the
    next session of that lift opens in pounds on any phone. LAST shows the bare number when it is in today's unit and
    names its own unit when it is not (`lastText()`: "45 lb" under a kg box), so it is never read as the other unit.
    **The maths** (`parseLoggedKg()`): a weight in kilograms is the number, pounds are kilograms to two places (45 lb = 20.41 kg),
    plates are none (null). That reading is used for exactly two things now: "far above your numbers" and the ratio to body
    weight. **Everything else is kept in the weight's own measure** (below).
    **What is shown**: sets in the unit they were typed in (History, the done line, Last time, the ghost line:
    `histSetsText()`, `histWt()`; a list that mixes units names every unit; the History chart is drawn in the lift's
    last measure, a plates lift as *Top stack, plates*). In coach.html a set reads as typed in the athlete's own
    unit and the load column says `45 → 50 lb` or `6 → 7 plates` (`wUnitOf()`, `loadSummary()`); sets in two units are
    listed as typed, never folded into one range. Circuits show the unit as a tag inside each weight box (`.circ-unit`,
    `circuitUnit()`, `setCircuitUnit()`: one unit for the whole circuit, the unit written in each item's weight).
    **Twins**: `career_kg()` / `career_wn()` / `career_wu()` in the database (`supabase/stage71_weight_units.sql`,
    `stage72_weight_measures.sql`; `node scripts/career/rehearse_units.mjs` and `rehearse_measures.mjs` run them against
    `weightOf()` on thousands of weights) and `scripts/check_setlog.js` (the grammar both readers share).
    `scripts/headless/weight-units.js`.
  - **A record is kept per MEASURE** (Amir, 2026-10-18: *"personal records can be in all measures, and it's only an
    achievement if you go higher than your previous record in the same measure"*). Kilograms, pounds and plates are three
    scales that never meet: 225 lb is not "above" 100 kg and 9 plates is not a weight. So a Personal Records entry says its
    measure in `u` (`'lb'` or `'plates'`; absent = kg) and its `kg` (the estimate) and `w` (the set) are numbers **in that
    measure, never converted** (the field names are the old ones). `estimateOneRM(w, reps, rpe, unit)` rounds to the measure's
    own step (`ONE_RM_ROUND`: kg 2.5, lb 5, plates 0.5); `setsMeasure()` is the measure of a session's exercise (the first
    weighted set's unit; a set typed in another measure is left out of every best); `histBestSet()` returns `{ est, w, reps,
    rpe, u }`. `ceilingSeries()` is every (lift, measure) series; `ceilingLifts()` is one row per lift, the series of its newest
    entry (the other measure stays on the record, untouched, as its own series). `ceilingPrevBest(lift, day, u)`,
    `noteNewBest(lift, est, day, u)` and `fillRecords()` (a bar per lift AND measure) judge a best against the same measure
    only, so **the first record in a new measure beats nothing** and a higher estimate in pounds is a new best against the
    pounds records alone. One entry a day per lift AND measure (`saveCeilingEntry()`, the merge key lift|day|measure,
    `deleteCeilingEntry(lift, day, u)`: a tombstone carries `u`). Every Records screen says its unit (`uWord()`); Home's best
    lift and the body-weight ratio use `recKgEq()` (pounds converted, plates none, so a plates lift never leads that line);
    + Log a max opens in the lift's own measure with a unit button (`chooseCeilingUnit()`, `cf-unit`; it opens the same menu). **Wins are per measure
    too** (`cycleBestSet()`, `cycleWins()` keys name + measure, `winText()` words a win in its own unit: *+10 lb, same reps*,
    *+1 plate, same reps*), and a kg win against a lb one is no win. **Share cards say the measure** (`spec.u`;
    `assets/js/sharecard.js` `unitW()`; the Farsi words for lb and plates are drafts for Amir).
  - **Which movements earn a record by themselves** (Amir, 2026-10-18: *"those movements are mainly isolate or don't count as a
    strength exercise, but one handed cable machines are used to build strength and are not isolate exercises"*): a strength
    pattern only (`RECORD_PATTERNS`: squat, hinge, single-leg, the two pushes and the two pulls), no impact. **Isolation no
    longer files a record** (a curl, a lateral raise, an external rotation, a wrist extension, a leg curl), except a
    **one-handed cable exercise** (`oneHandedCable()`: a cable in the Spine entry's equipment and *single-arm* / *one-arm* /
    *one-hand* in its name), which counts wherever the Spine files it. The automatic records the isolation lifts had already
    filed are put away by `dropIneligibleRecords()` (tombstones, so every phone and coach.html drop them together; only
    automatic entries, only for a lift whose Spine entry is known and has a pattern; a tested or hand-entered record stays).
    On the server nothing mirrors the rule: `personal_best` facts come from the `auto` entries in the athlete's `_1rm`, so
    the tombstones void them on the next derive.
  - `migrateCarriedWeights()` converts, once per phone, the weights every sweep before this left in
    `w` (a set holding only a weight, on an exercise no live day holds). Its marker `aap_lw1_<id>`
    sits outside the athlete's key prefix so it never syncs.
- **An RPE off its target is coloured: clay OVER, steel blue `--rpe-under` UNDER, green on target**
  (Amir, 2026-09-24). The one exception to "clay is the only accent", and only for an RPE against
  its target: warm = harder, cool = easier, and orange-vs-blue survives colour blindness where
  red-vs-green does not. Every screen goes through `rpeVs()`/`rpeMark()` (row tag, the strip, Guided
  rest screen, Last time, History), which treats a target range like `7-8` as on target inside it —
  the old `parseInt` read `7-8` as 7 and called an 8 "over". In a session the target is
  `rpeTargetOf(card)`: the card's RPE, lowered by the week note on every day of its week and by a lower
  day (2026-10-12, *Today's targets* above). Last time and History judge a past set against the card as written.
  **coach.html matches it:** each set in *per set:* is coloured the same way, against the same target for the
  week the session fell in (`compareDay()`, COACH_DASHBOARD.md *Today's targets on a session*), and the average's
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

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
