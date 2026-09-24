# Set logging: design analysis and recommendation

*2026-09-24. Design analysis only. No code has been written for this. Scope: the `standard`
exercise card in `program.html`, its Guided Mode, and what the coach reads in `coach.html`.*

Scores in this document are **design-analysis estimates**, not measurements. Everything
labelled *live data* comes from read-only queries against `public.session_history`
(444 sessions, 27 athletes, 7,473 logged set lines), run on 2026-09-24.

---

## Phase 1: Audit of what exists

### 1.1 The card today

```
COLLAPSED (always visible)
┌──────────────────────────────────────────────┐
│ ○  3  BACK SQUAT                           ▾ │  check-box · number · name
│       Barbell, high bar                      │  setup (grey)
│       [Coach's Note] [Drive up] [3×8] [8/10] [⏱ 2m] │  pills
└──────────────────────────────────────────────┘

EXPANDED (tap the row)
  Coach's Note callout (clay)
  Video (▶)
  SETS 3 │ REPS 8 │ RPE 8/10 │ TEMPO 3-1-1-0 │ REST 2m     ← stats grid
  Coaching cues
  LOG SETS
   SET   WEIGHT      RPE                 
   1    [ 80    ]   6 7 8 9 10     ○     
   2    [ 80    ]   6 7 8 9 10     ○     
   3    [ 80    ]   6 7 8 9 10     ○     
  › Note  (durable, per exercise)
  The Ceiling: est. 1RM line
  [ Rest ⏱ 2m ]
```

- **Type:** Barlow Condensed for names and numbers, Barlow for body, Space Mono for labels.
  The done colour is `--yellow`, which is actually green `#0E4A36` (a legacy name). Clay is
  reserved for the coach's note and the tempo digit.
- **Row grid:** `26px | minmax(64px,1fr) | ≤142px | 28px`. On a 375px phone the five RPE
  buttons get **about 24px each**, roughly half the 44px minimum for a tap target.
  The CSS comment admits the strip only fits because it is allowed to shrink.
- **Before interaction** the athlete sees the name, setup and dose pills. Everything else,
  including the log, needs a tap to expand.
- **Guided Mode** (`openStepMode`) moves the real `.ex-detail` node into an overlay, dims
  all rows but the current set, and puts one big button at the bottom:
  *Done — Start Rest ✓*. That button clicks the row's own check, auto-starts the rest timer
  and auto-advances. It is the best interaction already in the app.
- The **check-box on the collapsed row** ticks every set at once (`setAllSetsDone`). That is
  how the athletes who log nothing but ticks get through a session.

### 1.2 How sets are stored

- One key per exercise: `<id>_setlog_<Exercise_Name>` → `[{ w, r, d }]` (weight text, RPE,
  done). **No reps field exists.**
- **The key is the display name only**, not the day, the date or the session.
- At the first boot after a finished day, `autoResetStaleDays()` clears `r` and `d` **and keeps
  `w`**, so last session's weight sits in the input as today's value.
- A session's permanent record is `session_history.summary`, a **plain-text** block
  (`Set 1: 80 @8 ✓`). `coach.html`'s `parseSessionLog()` / `parseSetLine()` parse it back into
  numbers. The athlete app **never reads any history back**.
- Circuits log one weight per item for the whole block, plus one RPE per round.
- The Ceiling (e1RM) takes its reps from the **prescription** (`data-reps`), not from what
  was done. A range takes its low end.
- The per-exercise note (`<id>_note_<Name>`) is **never cleared** and is written into every
  session summary.

### 1.3 What the live data says

| Measure | Value |
|---|---|
| Set lines logged | 7,473 (444 sessions, 27 athletes) |
| Set carries a weight | 66% |
| Set carries an RPE | 64% |
| Set carries both | 52% |
| Tick only, no numbers | 20% |
| Marked skipped | 1.7% |
| Reps typed into the weight box | **~0** (1 line) |
| Exercise notes delivered | 522, of which only **259 are distinct** |
| Deliveries that repeat an earlier note | **388** (one note re-sent 9 sessions running) |
| Notes that report reps or a shortfall | 66 of 523 (~13%), e.g. *"Last set rep: 9"*, *"Could only do 6"*, *"If I want to keep the RPE@7 I should only go with 10 reps"* |
| Library `standard` exercises by dose | 62 reps · 21 distance · 13 time |
| … done one side at a time | 38 of 97 |
| … by set count | 3 sets: 52 · 4: 17 · 2: 13 · 6: 12 · 5: 2 · 1: 1 |

### 1.4 Constraints the architecture imposes

1. **"Last time" does not exist as data.** The only memory is the weight left in the input.
   It is also *wrong across days*: 21 of 22 programmes reuse exercise names across days, so a
   squat done 5×5 heavy on Day 1 pre-fills the 3×10 squat on Day 3.
2. **The text summary is the database.** Any new field has to be added to the grammar in
   `buildSessionData()` **and** to `parseSetLine()` in `coach.html` in the same change.
   Otherwise `Set 1: 80 ×7 @8 ✓` is read as the weight `"80 ×7"`.
3. **Four functions rebuild set objects field by field** and would silently drop a new field:
   `setAllSetsDone()`, `resetDay()`, `autoResetStaleDays()` and the `_setlog_` branch of
   `mergeStoredValue()`. Each one maps to `{ w, r, d }` literally.
4. **Width.** The row is already full at 375px. A reps column cannot be added without
   rethinking the row.
5. **Coaching rules** (`.claude/COACHING-PRINCIPLES.md` → *Progression*): prescribe RPE, never
   load. No self-progression rules. The athlete is taught: *"hit prescribed reps at/under
   target RPE → small jump; RPE at ceiling or reps missed → hold and repeat."*
6. **The docs contradict each other on rep ranges.** COACHING-PRINCIPLES (2026-07-08) says
   *never prescribe a rep range*. SCHEMA.md and CLAUDE.md (2026-09-20) say *ranges ship as
   ranges*. What "hit the reps" means depends on which is true.

### 1.5 Preserve / reconsider

**Preserve:** the collapsed row and its pills. The `rx` stats grid (the tempo cell took four
rounds to settle). The single big button in Guided Mode. Auto rest. The row check-box that
ticks every set. The RPE 6–10 scale. The Ceiling. The rule that nothing invents a number the
coach didn't write (rest, load).

**Reconsider:** the weight field doing two jobs (last time and today). Twenty tiny RPE buttons
on screen before a single set is lifted. A note that is both a memo to self and a report to
the coach, and so gets re-sent for ever.

---

## Phase 2: What the problem actually is

"Add a reps input" describes a control, not the problem. There are three problems, and reps
are only one of them.

1. **The progression rule the athlete is taught depends on reps, and the app assumes the reps
   were hit.** `80 @8 ✓` is identical whether the athlete did 8 or 6. The coach cannot read
   "reps missed → hold". The Ceiling estimates off reps nobody confirmed. Athletes know this,
   which is why 13% of notes are rep reports.
2. **There is no "last time", only a leftover.** Last session's load and today's load are the
   same pixel. Once the athlete types, last time is gone. Last time's reps and RPE were never
   visible in the first place.
3. **The note box is doing the reps' job, badly, and re-sending it.** Half the notes Amir reads
   are re-runs. *"Last set rep: 9"* is still being re-sent weeks after it stopped being true.
   That actively corrupts the progression read.

### What the athlete needs, and when

| Kind | Examples | When it's needed | Default visibility |
|---|---|---|---|
| **Instruction** | video, cues, setup, tempo | before the first set; fades as the lift becomes familiar | behind one tap (unchanged) |
| **Target** | sets, reps, RPE, rest | before every set | always, on the row the athlete is about to do |
| **Previous performance** | last load × reps, RPE | **only before set 1**, to choose a load | one line, visible when the card is open |
| **Current performance** | today's load, reps, RPE per set | right after each set | the set rows |
| **Feedback** | "all sets at target", e1RM | after the exercise | The Ceiling line (exists); nothing else |
| **History** | trend across weeks | between sessions, or for the coach | never on the card; one tap away |

These must not share a control. Today **previous** and **current** share the weight input, and
**memory** and **report** share the note. Both of the app's existing logging bugs come from that.

### The fastest honest log

The athlete's most common answer is "it went as written". The data suggests deviations are the
minority: rep complaints appear in about 66 notes against 7,473 sets. So:

- **One tap says "as written".** The set arrives pre-filled with its target. The tick
  countersigns it.
- **A deviation costs one or two more taps**, never a keyboard.
- **The feel question (RPE) comes after the tick**, when the answer is true. Today it is on
  screen before the set, taking up space.
- **The keyboard is only for load**, and only when the load changes.

---

## Phase 3: Six directions

Each shows set 2 of 3, with set 1 done (80 × 8 @8), prescription 3 × 8 @ RPE 8.

### A. Set table

```
LAST   80×8  80×8  80×7  @8
 SET   KG      REPS   RPE          
  1    80      8      8        ✓   
  2   [80 ]   [ 8 ]  [  ▾ ]    ○   
  3   [80 ]   [ 8 ]  [  ▾ ]    ○   
```
- **Hierarchy:** flat. Every set weighs the same, so the eye doesn't know where it is.
- **Interaction:** type or confirm three fields per set, then tick. With pre-fill, 1 tap per
  set, 2–4 for a deviation. RPE as a dropdown costs 2 taps.
- **Space:** medium, and it grows linearly: 10 sets means 10 rows.
- **Before starting:** everything. **After a set:** a row tick.
- **Previous:** one "LAST" row, or a ghost column (Strong/Hevy style).
- **Errors:** typos are easy. Three small inputs per row.
- **Set counts:** 1–5 fine, 10 tall. **Rep schemes:** a range doesn't fit in one cell.
  **Unilateral:** needs a second reps column or an L/R toggle. **Time/distance:** the REPS
  header lies. **Bodyweight:** an empty KG column. **Changing loads:** per-row, good.
  **RPE:** a column, cramped. **Notes:** below the table.
- **Verdict:** the generic gym-app shape Amir wants to avoid. It fails on width at 375px.

### B. Last time vs today

```
        LAST TIME        TODAY
 1      80 × 8 @8        80 × 8 @8  ✓
 2      80 × 8 @8       [80] × [8]  ○
 3      80 × 7 @9       [80] × [8]  ○
```
- **Hierarchy:** comparison-first. The card becomes a scoreboard.
- **Interaction:** as A. **Space:** the largest of all.
- **Previous:** maximal, per set.
- **Other cases:** same failures as A, plus a changed prescription (4×6 against 3×8) makes the
  columns incomparable.
- **Verdict:** it invites "beat the left column" pressure. That fights the RPE-first rule: a
  bad-readiness day at a lighter load *is* the correct session, and this layout makes it look
  like a loss.

### C. Progressive focus (one set at a time)

```
 ✓ 1   80 kg × 8   @8
 ┌────────────────────────────┐
 │ SET 2 OF 3                 │
 │   80 kg     ×   8 reps     │  big, tappable numbers
 │        [ DONE ✓ ]          │
 └────────────────────────────┘
   3   80 kg × 8               (ghosted)
```
- **Hierarchy:** strongest. One thing is live.
- **Interaction:** 1 tap as written. Tap a number to change it (a stepper opens).
- **Space:** fixed, whatever the set count: done sets collapse to one line.
- **Before starting:** set 1 in focus, the rest ghosted. **After a set:** it collapses to a
  one-line receipt and the next set grows.
- **Errors:** big targets. The done line is tappable to edit.
- **Set counts:** 1–10 all fine. **Everything else:** handled per set.
- **Verdict:** the best readability. It is Guided Mode's model moved into the card.
  The risk is the overview: the athlete has to trust the ghosted rows.

### D. Set chips (minimal)

```
 3 × 8 @ RPE 8        LAST 80 × 8 8 7
 80 kg   ( 8 ✓ )  ( 8 )  ( 8 )
```
- **Hierarchy:** almost none. It's a sentence.
- **Interaction:** tap a chip for "done as written". Tap a done chip to edit (a sheet opens).
- **Space:** one line up to about 6 sets.
- **Errors:** worst. A chip tapped by accident becomes a fake data point, and nobody opens the
  sheet mid-set.
- **Other cases:** load changes per set don't fit. Unilateral and RPE are hidden in the sheet.
- **Verdict:** fastest, and most likely to produce confident but wrong data. Right for
  accessories, wrong for the lifts Amir tracks.

### E. Log during the rest (invented)

The tick starts the rest timer, and the **rest screen is the logging surface**:

```
 REST 1:42                          
 Set 2 done — how did it go?        
   Reps   [ − ]  8  [ + ]           (pre-filled with the target)
   RPE    6   7   8   9   10         (full width, ~60px targets)
 Next: set 3 · 80 kg × 8            
```
- **Hierarchy:** it splits the moments. The set is for lifting, the rest is for describing.
- **Interaction:** 1 tap for the tick, 1 for RPE, 0–2 to adjust reps. All of it happens while
  the athlete is seated and breathing, which is dead time today.
- **Space on the card:** almost nothing. The overlay does the work.
- **Errors:** big targets, calm moment. But if the athlete skips the timer, the questions are
  never asked.
- **Verdict:** the best timing of any option. It depends on the rest overlay, so on its own it
  covers Guided Mode and not the list.

### F. Countersign rows (invented; the hybrid of C + E, keeping A's overview)

Every set row is **pre-written by the coach and countersigned by the athlete**. Upcoming rows
read as quiet text. The current row is the only one with controls. A done row collapses to a
receipt. The feel question appears on the row the moment it's ticked, or on the rest screen
in Guided Mode.

```
 LAST TIME · 12 Sep    80 kg × 8 · 8 · 7   top RPE 9
 ───────────────────────────────────────────────
 1  80 kg × 8     @8                        ✓     ← receipt (tap to edit)
 2  [ 80 ] kg  ×  [−] 8 [+]                 ○     ← current: the only live row
 3  80 kg × 8                                     ← upcoming, quiet
 + Add a set
```
Detailed in Phases 7–8.

---

## Phase 4: Evaluation

Scores are 1–5 estimates. The reasoning is what matters.

| Criterion | A Table | B Last/Today | C Focus | D Chips | E Rest | F Countersign |
|---|---|---|---|---|---|---|
| 1 Speed | 3 | 3 | 4 | 5 | 4 | 4 |
| 2 Cognitive load | 2 | 1 | 5 | 4 | 4 | 4 |
| 3 Readable mid-set | 2 | 2 | 5 | 3 | 3 | 4 |
| 4 Hierarchy | 2 | 2 | 5 | 2 | 4 | 5 |
| 5 Previous visible | 4 | 5 | 3 | 4 | 2 | 4 |
| 6 Target visible | 3 | 3 | 5 | 4 | 3 | 5 |
| 7 Error resistance | 2 | 2 | 4 | 1 | 4 | 4 |
| 8 Mobile | 2 | 1 | 5 | 4 | 5 | 4 |
| 9 Thumb reach | 2 | 2 | 4 | 3 | 5 | 4 |
| 10 Space | 3 | 1 | 5 | 5 | 5 | 4 |
| 11 Scalability | 2 | 2 | 5 | 3 | 4 | 4 |
| 12 Fits this app | 2 | 2 | 4 | 3 | 5 | 5 |
| 13 Coaching value | 4 | 3 | 4 | 2 | 4 | 5 |
| 14 Premium feel | 2 | 2 | 4 | 4 | 4 | 4 |
| 15 Simplicity | 3 | 2 | 4 | 5 | 3 | 4 |
| 16 Long-term use | 3 | 2 | 3 | 3 | 4 | 5 |

**Why each criterion moved the way it did:**

1. **Speed.** D wins because one tap per set is the whole job. F, C and E tie at one tap
   "as written" plus RPE. A and B cost more because every set shows three editable fields
   whether or not anything changed.
2. **Cognitive load.** B makes every set a comparison. A shows 15 editable things at once.
   C and F show one live row, so the athlete never has to find their place.
3. **Readable during exercise.** Glancing at a propped-up phone from a bench needs one big
   target number. C has it. F's current row is second-best because the numbers are in-line.
   A and B are small text in a grid.
4. **Hierarchy.** C and F give the current set a different visual state from done and
   upcoming. A, B and D give every set equal weight.
5. **Previous visible.** B is maximal but per-set, which is noise. A one-line summary (A, D, F)
   answers the only question it serves: "what load for set 1?". C hides it in the header.
   E has none.
6. **Target visible.** In F and C the target lives *in* the row the athlete is about to do.
   In A and B it sits in a header the athlete has to cross-reference. In E it's on the overlay.
7. **Error resistance.** D is worst: one stray tap is a fake "8 reps done". A and B scatter
   small inputs. F, C and E use big steppers, and a receipt that is visibly different and
   tappable to fix.
8. **Mobile usability.** A and B need five columns at 375px, and today's four already don't
   fit. C and E use a full-width vertical layout.
9. **Thumb reach.** E's controls sit low on a full-screen overlay. A and B's controls live in
   narrow top-to-bottom columns.
10. **Space.** B doubles the log. F grows by one quiet line per set. C, D and E are near-fixed.
11. **Scalability.** At 10 sets, A and B scroll away from the cues. C stays fixed. F grows,
    but receipts are single lines.
12. **Fits this app.** Guided Mode and the rest overlay already exist. E and F extend them.
    A and B import a table the app has never used.
13. **Coaching value.** F records reps, load and RPE per set with the target stored beside
    them, which is exactly the "reps at target RPE → jump" read. D records "done" and hopes.
    B's pressure distorts the RPE signal Amir relies on.
14. **Premium feel.** Calm, one-live-thing layouts (C, F) read as designed. Tables read as
    spreadsheets.
15. **Simplicity.** D is simplest to understand. E adds a second place where logging happens.
16. **Long-term use.** Over a year, F's receipts plus "last time" become a diary the athlete
    reads. D's data can't be trusted, so it gets abandoned. B's pressure wears.

**Takeaway:** C has the best in-the-moment scores, E the best timing, and F the best data.
The recommendation below is F, with C's focus state and E's rest-screen logging.

---

## Phase 5: Things you are not seeing

These are ordered by how much they would hurt if ignored.

1. **Your notes are already broken, and adding reps without fixing them keeps them broken.**
   388 of 522 note deliveries were repeats. Amir cannot tell today's *"only got 6"* from one
   written a month ago. **Fix:** notes become per-session, and last session's note is shown
   next to "last time" so memory survives without being re-sent.
2. **Pre-filling reps with the target will cause some over-reporting.** A tired athlete taps ✓
   on a set of 7. That is the price of one-tap logging. It is still strictly better than today,
   where 100% of sets are assumed to be on target. Mitigations: the stepper sits *in the row*,
   in reach of the tick, and a RPE 10 on a set logged at the target is worth flagging on
   the coach's side, not the athlete's.
3. **"Last time" must mean the same slot, not the same name.** Pulling Day 1's 5×5 into Day 3's
   3×10 is the bug the weight field already has. Last time should be keyed by *day + exercise*
   and carry the prescription it was done under. When the prescription changed, it says so:
   `Last time (was 3×10): 60 kg × 10 10 9`.
4. **Progress indicators would fight the coaching model.** Green arrows reward "more than last
   time". With RPE-first autoregulation, a lighter load at target RPE on a poor-readiness day is
   the *right* session. The card should state last time plainly and never judge it. The one
   celebration stays where it already is: a new best on The Ceiling.
5. **Don't let the previous load become a prescribed load.** Pre-filling set 1 with last time's
   load is memory, not an instruction. The card must never show "+2.5 kg" or "try 82.5", because
   *no self-progression rules* is an explicit principle.
6. **Rep ranges are unresolved in the docs, and the UI depends on the answer.** With a fixed 8,
   ✓ means 8. With 8–10, a ✓ has no single honest value. **Proposed:** a range renders as rep
   chips (`8 9 10`) and *tapping a chip is the tick*. Still one tap, and never a guess. This
   needs Amir to settle the doc conflict first.
7. **The text grammar is a hidden migration.** Old summaries lack reps. The coach view must
   render them as *reps not recorded*, never as "hit". Otherwise nine months of history
   silently turns green.
8. **Unilateral: one number, split only on exception.** The prescription is `8 / side`, so one
   number means each side. The edit state offers *Split L/R* (`L 8 · R 6`). A split is itself a
   coaching signal. Always showing two fields would double the work for 38% of exercises to
   capture something that's usually symmetric.
9. **"Load" is ambiguous for dumbbells.** Live notes say *"14kg dumbbell"*, *"10kg dumbbells in
   each hand"*, *"15kg plate in each hand"*. Pick one convention: **the number written on one
   dumbbell**. Say so once in the week-1 explainer, not on the card.
10. **Numbers arrive in Persian digits.** Live data contains `۲۵` and `٫20`. The load field
    must normalise Persian/Arabic digits and decimal marks, or e1RM and "last time" read
    garbage.
11. **Bodyweight and assisted.** 20% of sets are tick-only. For bodyweight, the load slot says
    `BW`, and typing adds load (`BW + 10`). For assisted, a load prefixed with `−` (band or
    machine assistance) should be stored as text, not treated as a negative weight by e1RM.
    The Ceiling should ignore it.
12. **Timed, distance and interval doses.** The value slot switches unit: `30 s`, `20 m`. An
    interval (`40s on / 20s off`) has no quantity to countersign, so it is tick + RPE only.
13. **AMRAP, drop sets, clusters and warm-up sets can't be prescribed today.** The schema has
    none of them. Designing logging UI for prescriptions that can't be written is decoration.
    If Amir wants AMRAP later, it's one `rx` flag, and the reps slot opens *empty* rather than
    pre-filled (an AMRAP has no target to confirm). Warm-up/ramp sets stay unlogged: they're
    how the athlete finds the load, not training data.
14. **Forgotten sets.** The row check-box that ticks all sets stays, and it means "all as
    written". At Finish, unticked sets are listed once, with one button: *Mark as done as
    written*. Nothing nags mid-session.
15. **Changing the number of sets.** *+ Add a set* at the foot copies the last row and marks it
    extra, so the coach sees `4/3`. Doing fewer is just leaving rows unticked, which already
    reads as skipped.
16. **Four functions will eat the new field.** `setAllSetsDone`, `resetDay`,
    `autoResetStaleDays` and the setlog merge all rebuild `{w, r, d}` literally. They must be
    changed together.
17. **The Ceiling gets better for free.** It should read actual reps instead of the
    prescription. That's a quiet accuracy fix for every athlete who logs.
18. **Supersets/circuits should wait.** COACHING-PRINCIPLES already bars pairing uncalibrated
    lifts because round-level logging loses resolution. Circuits are accessories and
    conditioning; the library has 5. v1 covers `standard` only, and circuits keep one weight
    per item plus RPE per round. Revisit only if Amir finds himself unable to read a pair.
19. **How much history is too much.** On the card: one line, the last same-slot session. Never
    a list or chart. The trend is the coach's job and The Ceiling's.

---

## Phase 6: The principle

> **Written by the coach, countersigned by the athlete.**
>
> Every set arrives already written: the target load, reps and effort. The athlete's job is to
> countersign it with one tap, or correct it with two. Before the first set the card answers
> *"what should I lift?"*. After each set it asks only *"did it go as written, and how hard was
> it?"*. The typing is for exceptions.

Its corollaries:

- **Today is scratch; last time is record.** They never share a field.
- **Ask about a set after it happens**, not before.
- **One live thing at a time.** Only the current set has controls.
- **State, don't judge.** The card shows what happened. It never grades it.

---

## Phase 7: Recommendation — F, the countersign card

**Why it fits this product.** Amir's model is prescription → athlete executes → coach reads the
log and adjusts. A card pre-written by the coach and countersigned by the athlete *is* that
model, drawn. It adds the one number the progression rule was missing (reps) without asking
athletes who hit their targets to do more than they do today (tick).

**Why it fits "nothing without a reason".** Each element on the card maps to one of the five
questions. *What am I doing?* is the name, prescription and instruction. *Last time?* is one
line. *Today?* is the pre-written rows. *How did I do?* is the receipts. *Remember?* is the note,
which now belongs to the session. Nothing is shown for decoration, including progress arrows.

**Why it suits mobile training.** Only one row has controls, and they are full size. The feel
question comes after the tick, one tap at 60px wide. The keyboard only opens when the load
actually changes.

**Priorities.** The current set's target, then last time (before set 1 only), then receipts.
**Hidden:** video and cues (one tap away, as today), history beyond one session, the stats
grid's SETS/REPS when the log is open (the rows already say it).

**Primary action:** the tick on the current row, or the big button in Guided Mode.

**After a set:** the row becomes a one-line receipt (`1  80 kg × 8  @8`). The RPE strip appears
on that row (list mode) or on the rest screen (Guided Mode). The load carries forward into
the next row. The next row becomes live.

**After the exercise:** the card shows a single summary line (`80 kg × 8 · 8 · 7  top @9`).
In list mode it collapses, and the collapsed row keeps that summary in place of the target
pills. No celebration. The Ceiling line updates if a set qualifies, which it already does.

**Taken from the rejected concepts:**
- **From C:** the current row gets a distinct live state, with big numbers and ghosted
  upcoming rows.
- **From E:** in Guided Mode, reps confirmation and RPE move to the rest screen.
- **From A:** the full set list stays visible, so the athlete can see the whole exercise.
- **From D:** the chip idea survives in rep ranges, where the chip you tap is the tick.
- **From B:** nothing. The comparison layout is the one thing not taken.

---

## Phase 8: The final card

```
COLLAPSED — before starting
┌──────────────────────────────────────────────┐
│ ○  3  BACK SQUAT                           ▾ │
│       Barbell, high bar                      │
│       [Coach's Note]  [3×8]  [8/10]  [⏱ 2m]  │
└──────────────────────────────────────────────┘

EXPANDED — set 1 done, set 2 live
┌──────────────────────────────────────────────┐
│ Coach's Note (clay)                          │
│ ▶ video                                      │
│ RPE 8/10 │ TEMPO 3-1-1-0 │ REST 2m           │  ← SETS/REPS drop once the log shows
│ Coaching cues                                │
│                                              │
│ LAST TIME · 12 Sep                           │
│ 80 kg × 8 · 8 · 7    top @9                  │
│ "right knee a bit tight"                     │  ← last session's note, read-only
│ ──────────────────────────────────────────── │
│ 1   80 kg × 8                 @8        ✓    │  receipt: tap to edit
│ ┌──────────────────────────────────────────┐ │
│ │ 2   [ 80  ] kg   ×   [−]  8  [+]     ○   │ │  live row: 44px controls
│ └──────────────────────────────────────────┘ │
│ 3   80 kg × 8                                │  upcoming: quiet
│ + Add a set                                  │
│ ──────────────────────────────────────────── │
│ › Note for this session                      │
│ The Ceiling: est. 1RM 101 kg · Good          │
│ [ Rest ⏱ 2m ]                                │
└──────────────────────────────────────────────┘

JUST TICKED (list mode): the RPE strip opens on that row
│ 2   80 kg × 8                           ✓    │
│     How hard?   6    7    8    9    10       │  full width, one tap, optional

GUIDED MODE: the rest screen does the asking
 REST 1:42                       +15s   Skip
 Set 2 · 80 kg × 8   ✓
 Reps      [ − ]   8   [ + ]
 How hard?  6    7    8    9    10
 Next: set 3 · 80 kg × 8
```

| # | Element | Why it exists | Why it's here | Visible | Weight |
|---|---|---|---|---|---|
| 1 | **Header** (check-box, number, name, pills) | The session's map. The check-box is the fastest path: all sets as written | Unchanged. Proven, and needed for scanning the day | Always | Primary for navigation |
| 2 | **Name** | Identity | Unchanged | Always | Primary |
| 3 | **Coaching cue / note / video** | Instruction | Above the log, because it comes before the lift. Collapsed by default, because by week 2 it's known | On expand | Secondary |
| 4 | **Last time** | Answers "what load for set 1?" | Directly above the rows it informs, so the eye reads memory → today | On expand, one line. Absent on a first session; replaced by *"First time on this — start conservative, let set 1's RPE tell you."* (Amir's own calibration rule) | Secondary |
| 5 | **Today's prescription** | The target | *Inside* each row, as the pre-filled values. The grid keeps only what rows can't show (RPE target, tempo, rest) | Always in the rows | Primary |
| 6 | **Set logging** | Countersign the target | The rows. Only the live row has controls | Always on expand | **Primary action** |
| 7 | **RPE** | Effort per set: feeds Amir's read and The Ceiling | Appears on the row *after* its tick, or on the rest screen | After each tick. Optional | Secondary |
| 8 | **Notes** | Anything the numbers can't say | Below the log, per session. Last session's note is shown read-only in *Last time* | Collapsed `›` | Tertiary |
| 9 | **Completion** | Closure | The last tick collapses the card to a one-line actual summary | On completion | Quiet |
| 10 | **History** | Longer trend | Tapping *Last time* opens that exercise's past sessions (dates + receipts), using the same overlay furniture as The Ceiling lift view | One tap | Tertiary |

---

## Phase 9: Edge cases

| Case | Behaviour | Holds? |
|---|---|---|
| 1 set | One live row, no "upcoming" | ✓ |
| 3 sets | As drawn | ✓ |
| 5 sets | Two quiet rows at the foot | ✓ |
| 10 sets | Receipts are single lines, so ~10 short lines. The live row scrolls into view on each tick | ✓ (checked: the grid collapses, so no worse than today's 10 rows) |
| Reps 5 / 8 / 10 | Pre-filled, stepper ±1 | ✓ |
| Range 8–12 | Chips `8 9 10 11 12`. Tapping one is the tick. No pre-fill | ✓ *if* Amir confirms ranges are allowed |
| AMRAP | Not prescribable today. Later: an `rx` flag opens the reps slot empty | Deferred on purpose |
| Bodyweight | Load slot reads `BW`, and typing adds load | ✓ |
| Dumbbells | "Number on one dumbbell" convention, taught in the week-1 note | ✓ |
| Unilateral | One number = each side. *Split L/R* in the edit state | ✓ |
| L/R differ | `L 8 · R 6` receipt and grammar | ✓ |
| Timed | Value slot `30 s`, stepper ±5 s | ✓ |
| Distance | `20 m`, stepper ±5 m | ✓ |
| Interval (`work`) | Tick + RPE only | ✓ |
| Supersets/circuits | Unchanged in v1 | Deferred on purpose |
| Drop sets | Not prescribable. The athlete adds a set and a note | Acceptable |
| Warm-up sets | Not logged | ✓ by principle |
| Failed reps | Stepper down. RPE 10 is available. The receipt shows the actual | ✓ |
| Skipped set | Left unticked. Finish offers one bulk "done as written", or leave it skipped | ✓ |
| Changed load mid-exercise | Edit the live row's load. Later rows inherit it | ✓ |
| Changed prescription since last time | *Last time (was 3×10)* label | ✓ |
| No history / first ever | Calibration line instead of *Last time* | ✓ |
| Incomplete workout | Unchanged partial flow. Receipts so far are sent | ✓ |
| Accidental tick | Tap the receipt: it reopens as the live row. A tick is a toggle, as today | ✓ |
| Editing a completed set | Same as above. Guided Mode's ‹ Prev reaches it too | ✓ |
| Same exercise twice in one day | Keys collide as they do today (name-keyed session log) | ⚠ Existing limitation, rare. Noted, not fixed in v1 |
| Two devices mid-session | Field-by-field merge extended to the new fields | ✓ if all four rebuild sites are updated |

One redesign came out of this pass. The first draft pre-filled a range with its top value.
The *Range* row showed that as a silent guess, so it became chip-as-tick.

---

## Phase 10: Implementation plan (not started)

### A. Data model
- Set entry: `{ w, r, d }` → `{ w, n, r, d, lr?, x? }`. `n` is the actual reps/seconds/metres.
  **Written explicitly at tick time**, so a record never depends on a prescription that may
  change later. `lr` is the optional `{ l, r }` split. `x` marks an added set.
- A new key, `<id>_setlast`: `{ "<dayId>|<exercise>": { date, rx: {sets, dose, rpe}, sets: [...], note } }`,
  written when the session is recorded. It rides the existing progress snapshot. **No SQL.**
- The per-exercise note key becomes per session and is cleared by the stale-day sweep. Its
  last value moves into `setlast.note`.

### B. State
- The four `{w, r, d}` rebuild sites keep unknown fields.
- `autoResetStaleDays` clears `w` too, since set 1's load now comes from `setlast`. **One-time
  fallback:** if there is no `setlast` for a slot yet, use the leftover `w`, so nobody's first
  session after the release comes up blank.
- `mergeStoredValue`: add `n`, `lr` and `x` to the setlog branch. Add a `setlast` branch where
  the newest `date` wins per slot.
- `adoptRenamedExercises`: carry `setlast` entries across a rename.

### C. UI
- Rewrite `attachSetLog()` for three row states (upcoming / live / receipt) plus the post-tick
  RPE strip. New CSS, 44px minimum targets, tested at 320 and 375 px, light and dark.
- A *Last time* block above the rows. A history overlay built from The Ceiling lift-view
  furniture.
- `renderStatsGrid`: drop SETS/REPS when a log is rendered.
- The collapsed row shows the actual summary once every set is done.

### D. Interaction
- Guided Mode: `openTimerAuto()`'s overlay gains the reps stepper and RPE strip for the set just
  done. They write through the same row nodes, so Guided and list can't disagree (the rule
  `CODEBASE.md` already sets).
- Chip-as-tick for ranges. Persian digits normalised on input.
- Finish: one *mark remaining sets done as written* prompt.

### E. History
- Grammar: `Set 1: 80 ×8 @8 ✓`, `Set 2: 80 ×L8/R6 @9 ✓`, `Set 4: 80 ×7 @9 ✓ +` (added set).
- `coach.html` `parseSetLine()` reads `×` in the same commit. The prescribed-vs-done table shows
  reps. A line with no `×` renders as *reps not recorded*.
- The Ceiling reads `n` when present, and falls back to the prescription.

### F. Migration / compatibility
- Old entries without `n` are "not recorded" everywhere, never "hit".
- Old summaries still parse. No backfill.
- `buildAppGuideCards()` and the week-1 explainer (`/program-engage`) gain one line each: tick
  means "as written", tap the number if it wasn't, and the dumbbell convention.

### G. Testing
- A fixture test in the style of `scripts/check_rx.js`: summary grammar round-trip,
  `buildSessionData` → `parseSessionLog`, covering every dose kind, splits, added sets and
  legacy lines. Added to `.githooks/pre-commit`.
- A merge test across two simulated devices (new fields survive a blank on the other side).
- Headless screenshots at 320/375/430 px, light and dark: list mode, Guided Mode rest screen,
  10 sets, a range, unilateral, timed, first session.
- The demo programme walked end to end in the browser.

### Docs to update in the same PR
`CODEBASE.md` (set log and `setlast`), `SCHEMA.md` (the reps convention), COACHING-PRINCIPLES
(resolve the range conflict and update the explainer line), `COACH_DASHBOARD.md` (the new
grammar).

---

## Decisions only Amir can make

1. **Rep ranges: allowed or not?** COACHING-PRINCIPLES says never; SCHEMA says yes. The chip
   design works either way, but the docs need one answer.
2. **Notes:** per session, with last session's note shown on the card (recommended). Or keep a
   durable "pinned" memo as a second field?
3. **RPE per set, optional** (recommended, as today), or once per exercise?
4. **Circuits** stay as they are in v1 (recommended)?
