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

## 🗓️ Week notes are DATA, for any week of a cycle — `cycles[n].weekNotes` (2026-09-26; any week 2026-10-11)

Every cycle is 4 loading weeks + 1 back-off, and the cards never change mid-cycle, so the back-off
used to exist only if a notes card said so. The pipeline audit that day found 16 of 34 live
programmes with no back-off wording and no drop in week-5 session RPE across 12 finished cycles.
Amir: *"update the app in a way that it can show first week or last week"*. On 2026-10-11 he made it
any week: a note can sit on a test week or a lighter week, and shows only during its own week.
- **`cycles[n].weekNotes = { "1": note, "3": note, "5": note }`**: the keys are week numbers (strings),
  each note `{ text, title?, setsDrop?, rpeDrop?, rpeCap? }` (SCHEMA.md → `weekNotes`). **`first` and
  `last` still work** as aliases for week 1 and for the final week (about 35 live programmes were
  written with them; no migration), and a numeric key wins over the alias for the same week.
  ⚠️ **Not `weeks`**, which is the "Weeks 1–5" label string; the first build used that name and
  would have broken every cycle card.
- **program.html `weekNoteNow()` / `weekNoteHTML()`** show the note **on Home only, inside its own week**, from
  the same `cycleWeekInfo()` that draws "Week X of Y". Never at the top of a session (Amir, 2026-10-12: *"dont show
  this at the top of each day workout, just in the home tab"*). In a session every card still prints its own RPE, but
  the note's limit is the target every logged RPE is coloured against, on every day of that week (Amir, 2026-10-12:
  *"colour against the cap in those weeks"*; `paintWeekTargets()`, *Today's targets* below). **So the session bar carries
  the numbers** (Amir, 2026-10-12: *"add the cap reminder to the session bar"*): `weekLimitsHTML()` draws one row at the
  foot of the sticky bar, *This week · Max RPE 7*, *Back-off week · Max RPE 7 · 1 set fewer*, *Lighter week · RPE 1
  lower, not below 6* (an `rpeDrop` only without a cap, as `rpeTargetOn()` reads them, and with its floor, CHP-4), before
  Start and all through the slim bar, gone after Done (the timer's `finished` or the day's completion, `.day-done`).
  Never the note's words, and nothing when the note has no numbers. **On a day with a test-flagged lift in the
  closing week** (`exTestSpec()`, `inRetestWindow()`: the window, whether or not that retest is due; not on a lower
  check-in day, when the retest waits and is capped like every lift) the RPE line reads *Max RPE 7 except the
  retest* (TST-4: two lines never give opposite instructions for the same set). The label is the note's title, else
  *Back-off week* for the cycle's final week (`weekNoteLast()`: the legacy `last` or a numeric key on the last week;
  Home's kicker uses the same test), else *This week*. `renderTimer()` redraws the row from the cycle as it is now,
  and opening a day calls it, so an app left open across a week boundary shows the right week. It never shares the
  clock's line (`.has-week` lets the slim bar wrap onto it); with the usual labels it is one line at 320 px, and a
  long title or the retest words wrap it to two (about 100 px for the slim bar). A panel whose bar has the row gives
  its cards `scroll-margin-top: 175px`. **Guided shows the same row** (Amir, 2026-10-12: *"show the cap row in Guided
  too"*): `#step-week` under its top bar, redrawn by `renderStep()` on every step, and under the RPE buttons of the
  rest screen's log (`paintTimerLog()`, and a circuit round's, `paintRoundLog()`), where the RPE is chosen, so the cap is on screen wherever the colour is. The rest screen scrolls rather than squash its ring (`.timer-overlay.has-log > *` never shrinks), with a 104 px ring under 620 px of height.
  **The look is Front Page** (Amir chose A of three on the Week Note Lookbook, claude.ai/artifact/9Y4Rf1eBQ7DB1DJ9rKqBym,
  with his own changes: *"instead of from amir at the bottom add my sign and image but not the "your coach" text and
  use their name in the text"*). No box and no tint: in its week the note IS the This Week section. `renderHome()`
  draws `weekNoteHTML(cur) ||` the usual heading, so a week with no note is unchanged. From the top: a 2px rule and a
  Space Mono kicker (*This week*, or the week's name when it has one and the headline is a sentence) with the week's
  count on its right (`#home-week-sum` is the kicker's `.wn-count`, and `paintWeek()` writes its short form, *1 of 2
  done*); the athlete's first name (*Alex,*, from `DATA.athlete.firstName`, left out when there is none); the text's
  **first sentence as a sentence-case headline** (Barlow Condensed 900 at `--fs-head`, never louder than the day
  cards), with clay only on the words that ARE the note's numbers (`mark()`: *RPE 7* for `rpeCap`, *one set fewer*
  for `setsDrop`, an `rpeDrop` only when there is no cap, as `rpeTargetOn()` reads them); the rest of the text at full
  size; a number the words did not say on its own small line; then a hairline, his signature (`WN_SIG`, a drawn
  stand-in until he sends his own) in green ink and his photo (`assets/img/coach.jpg`, the Coach tab's). Three
  shapes so any note reads: `sentence` (the first sentence, 100 characters or fewer, is the headline), `name` (a
  longer one: the week's name is the headline and the whole text sits under it), `lead` (no title and no numbers:
  one calm paragraph). Amir's words are never changed, only set: `tie()` adds non-breaking spaces (*RPE 7*, *3 to 5*).
  The section keeps `week-note week-note-<key>`, `data-label` (the week's name) and `data-t` on the parts that are
  the note's own words, which the test reads. With today's week `wk` of `total`, a note shows only
  while the cycle has started and not ended (`!before && !after`): `notes[String(wk)]`, else
  `notes.first` when `wk` is 1, else `notes.last` when `wk` is the last of more than one. Before the
  start date nothing shows (until 2026-10-11 `cycleWeekInfo()` clamped to week 1 and the `first` note
  showed the day before the cycle began), nor after `endDate`, nor for a cycle without the field: the
  app never invents a back-off. The label is the note's `title`, else *Back-off week* for the legacy
  `last`, else *Week N*. The result carries the note's fields plus `key` (`first` / `last` for the
  aliases, `week` for a numeric key, the CSS class `week-note-<key>`; all look the same) and `wk`.
  The numbers never change what a card prints. In that week only, they are the target its logged RPEs are
  coloured against on every day (`rpeTargetOn()`, `paintWeekTargets()`, below), and a lower day takes the lower of
  the two. **A number covers every lift that week** (Amir chose it, 2026-10-12): a limit on only some lifts is
  written in the note's words with no `rpeCap` or `rpeDrop` (PRC-15). `scripts/headless/week-notes.js` (101 checks)
  covers every row above and the Front Page look (the name, the clay, the count in the kicker, the dose line,
  the signature and photo, no note in a session, the session bar's limits row, 320 px), and fails on the old `weekNoteNow()`.
- **The pipeline owns it:** /program-design decides both doses as numbers (`week1:` / `lastweek:`),
  /program-engage writes the words (PART 3c: the first sentence is the rule, under 100 characters, with no greeting,
  name or sign-off, COM-16; the checker warns on each), /program-assemble stores them, and
  `scripts/check_program.py` FAILs a cycle with no note on its final week (and a first cycle with no
  week 1 note). The 32 older programmes gain it with their next cycle, not by a bulk write.
  (What the pipeline writes and checks is in SCHEMA.md and the rule index; the app reads both shapes.)
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
  The emailed report carries the verdict as a `Today: …` line (`readinessPlanLine()`), and coach.html's
  email import and Claude's Gmail import read it back into `{ level, sore, drop, asWritten, score }`
  (`parseCheckinPlan()`); `scripts/check_twins.js` fails a commit that rewords one side only.
- **`paintToday(day)` paints it; nothing is written but the check-in.** A banner under the timer
  says what changed and offers **Train as written** (`setAsWritten()`, kept as `asWritten` and sent
  with the session). On a lower day every card with an RPE shows `RPE 8 → 7 today` (one clay pill: `rdTarget()`
  takes the RPE out of the line of numbers); `data-target-today` makes the set-log and Guided
  colours compare against today's number. The pill still means a lower day only: a week note's limit
  colours the sets with no pill (`paintWeekTargets()`, below).
  Red: `redDayCore()` keeps the warm-up (`isPrepBlockTitle()`), the first exercise of the first
  power block and of the first Primary/Strength block; the rest is tagged *Optional today*. A day
  with no Primary block keeps the warm-up and the whole first working block. Sore: exercises whose
  Spine entry has `impact` plyometric or landing (a name match when there is no entry) show
  *2 of 4 sets today* with the extra rows dimmed, or *Skip today · sore* at soreness 1; circuit items get
  *Every other round* / *Skip today*.
- **`rpeTargetOn(written, drop, note)`** is the one place a target moves (2026-10-12; until then it was
  `dayRpe()`, and the week note moved it only on a lower day). Two things move it: the week note's `rpeCap`
  (else its `rpeDrop`) on every day of its week (`weekNoteNow()`), and a lower day, 1 off each end. Never below
  6, never above the written number, and the two do not stack: the lower target wins. `drop` may be 0, null or
  missing, and then only the note moves it. The week note's own number is floored at 6 too (CHP-4; until
  2026-09-27 a written 6 in a week with `rpeDrop: 1` read *6 → 5 today* on a lower day, a target no RPE button
  can log). **`dayRpe()`** is now its lower-day wrapper: it returns a target only when the check-in dropped the
  day, and it alone draws the pill and `data-target-today` (`rdTarget()`).
  ⚠️ **coach.html's `dayTargetC()` is its twin** (week note included, drop optional, `check_twins.js` §4 runs
  `rpeTargetOn` against it): change both.
- **The week's target colours every day of a capped week** (Amir, 2026-10-12: *"colour against the cap in those
  weeks"*). `paintWeekTargets(day)` puts the week note's target on each card as `data-target-week`, with or
  without a check-in: a normal day, *Skip for today*, and **Train as written**, which undoes the check-in, never
  the week's limit. It skips circuits, and a test-flagged lift in the closing week (`exTestSpec()` and
  `inRetestWindow()`) keeps its own card's target, as the bar's *except the retest* says (TST-4); on a lower day
  `rdTarget()` caps it like every lift and the bar drops the exception (`paintToday()` redraws the bar). `paintToday()`
  calls it, and so does opening a day, so an app left open across a week boundary follows the week. Nothing is
  stored. **`rpeTargetOf(card)`** is the target the live set rows and Guided's rest screen colour against: the
  lower day's (`data-target-today`), else the week's (`data-target-week`), else the card's (`data-target`). A set
  under it is steel blue, the same rule as a lower day. Last time, the History rows and the ghost line keep judging
  a past set against the card's written RPE (`data-target`), or last week's on-target 8s would turn clay. The
  History sheet's caption, *today's target RPE N*, shows `rpeTargetOf()`.
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
- **The sport badge** (Amir, 2026-10-12: *"design nice sport badges for tennis and padel"*): on Game Plan's header a
  tennis or padel goal (`sport.badge`) is a green badge with a drawn ball, racket or both, the sport bold and the rest of
  the goal under it (`sportBadgeHtml()`, `SPORT_ICON`); any other goal keeps its mono line. `isRacketSport()` reads the
  same badge, so a tennis or padel player's badge must name the sport, or On court never shows.
- **Not on the card any more** (2026-10-12, *The working card*): the open card has no **Last time** box (it was under
  the Coach's Note from 2026-09-27; the closed card's clay *Last* pill went before that). The history is the ⓘ's
  **Your history** row, each empty kg box shows last time's weight as LAST, and a circuit keeps its Last time strip.
  The ⓘ is there for any lift with history, entry or not (`paintAbout()`), so History is always one tap behind it.
- **`<id>_histcache` is a cache and never syncs** (`_snapshot()` skips it; written with
  `_lsRawSet` so it never stamps `lastEditAt`). The source is `get_my_history()`, stage30; since stage60 it leaves out a session the coach hid, so the next
  online open drops it from Last time and the Records.

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
- ⚠ **The mix rule exists in four places, one of them twice**: `qualityMix()` (program.html), `qualityDayC()` and the weekly
  `qualityCheckC()` (coach.html), the quality check in `/program-design` and `mix()`/`top3()` in `scripts/check_program.py`
  (2026-09-25). Same weights, same prep test and same minutes rule everywhere (`qmSets()` / `qmSetsC()` / `qm_sets()`), or the coach's
  check, the pipeline's check and the athlete's card disagree. The **70% coverage and the 12% cut belong to one day's card**, so they
  are in `qualityMix()`, `qualityDayC()` and `top3()`; `qualityCheckC()` is the week's ranking for the headline check and does not apply
  them. Until 2026-10-11 this paragraph said the coach's check applied both, and the dashboard guessed the day cards from the week's
  coverage (audit TWIN-9): it now runs the app's own rule for every day, in the phone's view (approved entries and approved qualities only,
  `qualityLensC()`) and again once the drafts are approved. `scripts/check_twins.js` runs `qualityMix()` and `qualityDayC()` on generated days
  and `check_parity.py` reads the three numbers in every copy.
- **A cycle's headline quality is its `art` word** (`QM_ART` in coach.html). `bedrock`, `peak` and `reset` are
  phases, not qualities: they have no headline and are never flagged (bedrock→movement flagged almost
  every foundation block, 2026-09-24). coach.html → Exercises →
  *Quality check* flags every current programme whose headline is not in its week's top two, and says day by day what each
  day card will show (or why it will be blank).
- `qualcache` (localStorage, no prefix) caches `get_qualities()` and never syncs.
- **There is NO Library → Qualities door.** It shipped and was removed the same day (Amir,
  2026-09-24: *"remove the qualities from library, bad decision"*). The Library has three panes:
  Sessions, Playbook, Exercises. Do not bring a qualities pane back.

## 🎯 Because — why THIS athlete has this exercise (2026-09-24)

Idea #4 of `/ideas` round 1 (brief: claude.ai/artifact/WtZ4xfq38dV7zZwRu926jw; Amir: *"go"*, on the
recommended picks). `ex.why = { src, part?, text }`, spec in `SCHEMA.md` → *`why` — Because*.
- **The card gains only a clay ⓘ** (`.ex-about.has-why`; a clay dot on its corner until 2026-09-27, when the clay dot after the name became the Coach's Note). The sentence opens the About
  sheet under **Why am I doing this?**, signed (`axHero()`; *Why you* until 2026-10-12), and **Why your plan looks like this**, a button under the
  current cycle card (from one reason since 2026-10-13, Line Call: it needed three, and the guide sent athletes to a door
  that was not there; the guide now promises it only "when your plan has reasons like that"), groups them by source (`openWhyPlan()`). A card with a
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
    `scripts/headless/kg-check.js` (12 checks).
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
  title and whatever is typed in the note, at tap time). The About sheet had *Ask me about this exercise*
  until 2026-10-12, when Amir took it off (*"remove the whatsapp button"*). The session note's
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
been a 404 since 2026-09-07. Rejected then: opening from the phone on every launch (a stale plan first,
swapped under a running session) and letting `sw.js` keep the plan (it cannot cache a POST, and it
sits in front of the whole site).

**Opened FIRST on every launch since 2026-10-13** (Line Call, Second Serve N1; Amir: *"yes to all
recommended"*, decision 2, with both guards). Every open waited for the library and then `get_program`
(6 s cap) before Home, with the plan already on the phone: 9.8 s on a simulated slow evening line, and
a stalled one held the loading screen 6 s, then up to 4 s more for the dead `data/<id>.json` (now tried on
local hosts only). Now a phone holding this athlete's plan (`readPlanCopy(clientId)`; never the demo, the
coach preview or a fresh sign-in, which drops the copy) opens from it at once as `PLAN_OFFLINE.fast`, and
`_resumeSync()` runs straight after the first paint: the same plan → nothing shows and the held uploads go;
a changed plan → *Your plan was updated · Refresh*, the old one on screen until the tap (**guard 2: never
swapped under a running session**); no answer → the *Offline* line, only once the check has failed (a fast
open says nothing before); a "no" → **guard 1: the app closes** on *Plan not available* and the copy goes
(`showPlanRefused()`), unless a session is under way (`sessionUnderway()`), which keeps the screen with the
*Heads up* line as before. The progress pull runs in the same check, so a two-phone athlete sees the other
phone's sets from the next open. `scripts/headless/phone-first.js`.

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
- **An installed app asks the browser to keep its storage** (2026-10-13, Second Serve N3): `navigator.storage.persist()` after the
  first paint, standalone only, silent either way, because Safari clears a site's storage after about 7 days unused and a session still
  waiting to send lives only there. Still to check on a real iPhone: whether it is granted, and the safe areas (no `viewport-fit=cover`,
  so the 12 `env(safe-area-inset-*)` rules return 0).
- **The library is our own file since 2026-10-13** (Line Call, Second Serve N1/N2; Amir: *"yes to all recommended"*):
  `/assets/js/supabase-2.117.3.js`, the same bytes jsDelivr and unpkg serve for 2.117.3 (sha256 `d6a5c441…`), precached
  by `sw.js` (`SHELL`), so a repeat open reads it from the phone instead of fetching `@2` from jsDelivr every time (the
  worker never keeps another host's files, and jsDelivr was unverified from Iran). program.html and habits.html load it;
  coach.html the same version from jsDelivr. A version bump is a NEW file name and all three together. `_sbLoad()` finds
  the tag by `script[src*="/supabase"]` (it was `supabase-js`, which the local name does not contain: the retry below
  would never have started, caught by `signin.js`). The headless harness aborts the file (`lib.js`) so the stub stays the
  library.
- **The fonts are our own files too** (2026-10-13, aap-v158): `/assets/css/app-fonts.css` (the Barlow and Barlow Condensed
  weights the app uses, the same files as the site's `fonts.css`, and Space Mono, added to `/assets/fonts/` with its licence
  line), loaded without blocking paint as the Google stylesheet was. The worker precaches the stylesheet and keeps each font
  file the first time it is used. AA Proof's strip on Home (`habits.html?embed=1`) loads the same sheet since 2026-10-17
  (aap-v159; it added the Barlow Condensed 800 face, which only the strip uses), so nothing on Home asks Google Fonts.
- **The library** marks a failed download
  (`onerror` → `window.SB_FAILED`), so `_sbReady()` stops at once instead of polling ~3 s before
  every call; `_sbLoad()` fetches it again once the connection is back. **Sign-in uses `_sbForSignIn()`** (2026-10-11): it waits, fetches the library again when the first download failed or is only slow, takes whichever copy arrives first (12 s ceiling) and, if there is still nothing, says "The sign-in could not load…" instead of "check your connection". Before this a failed first download answered every tap with the connection message until the app was force-closed.
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
- ⚠️ **Exists twice**, in this file and `habits.html`: `_noAnswer()`, `_sbLoad()`, `_sbForSignIn()`, `readPlanCopy()` /
  `savePlanCopy()` / `dropPlanCopy()` / `planAnswerOf()` and the `plancache` shape. Change both. Proof's
  side: `HABITS.md` → *No signal*.
- **A finished session waits on the phone until the server has it** (2026-10-12, after 10 sessions of 4 athletes reached
  Amir by email and never reached the dashboard). `recordSessionToCloud()` puts the record in the session queue
  (`<id>_csq`) BEFORE it calls `save_session`, and only the server's answer takes it out; a call that never answers
  (capped at `SESSION_SAVE_MS`, 20 s) leaves it there. One entry per session (day and date). The queue drains at every
  open, back in the foreground, on `online` and after a report goes, and it never syncs. Every finished session is also
  noted in `<id>_finished` (synced), which coach.html reads to name one the server is missing. CODEBASE.md has the story;
  `node scripts/headless/session-queue.js` holds it (a hanging server, a cloud copy of the queue, two Day 1s from
  different weeks, an unfinished day filed online and offline).
- **Left as is:** one bar of signal still costs up to the 6 s `get_program` wait before the copy opens.
  Waiting less when a copy exists would open slow-but-working connections on the copy more often; it is
  a separate call.
- **A wrong phone clock no longer reads as a refusal** (SITE-AUDIT 25b, 2026-10-12; the 2026-10-04 reach reports: an Irancell iPhone 89 minutes behind).
  supabase-js decides by the phone's clock whether a token has expired, so a clock that runs behind keeps sending an hour-old token and the server
  answers `401 "JWT expired"` (PostgREST `PGRST301`) for about an hour and a half of every cycle. That used to be a 4xx, so `planAnswerOf()` said
  *no*: *Plan not available*, the saved plan deleted (`dropPlanCopy()`), the athlete told to sign in again, and the identity lookup that finds who is
  signed in failed the same way. **`fetchRetryExpired()`** is the fix: `_sb()` hands `createClient` a `global.fetch` that, on a 401 whose body says
  `JWT expired` or `PGRST301`, calls `auth.refreshSession()` once (concurrent calls share one refresh; the library dedupes it) and repeats the call with
  the new token. A sign-in or refresh call, any other status and any other 401 pass through, a call is repeated at most once, and a refresh that fails
  leaves the original 401 (so a signed-out athlete still sees *Sign in again*). A clock running *ahead* is a different case (the library refreshes on
  every call; nothing breaks) and is not touched.
  ⚠️ **Exists four times**: `program.html`, `habits.html`, `tennis/app/app.js` and `tennis-testing/app/app.js`, the same text.
  `node scripts/test_fetch_retry.js` (pre-commit guard 18) cuts it out of all four, requires one text, requires every `createClient(SB_URL, SB_KEY …)` to
  be given it, and runs the real library (the bundled 2.116; `SUPABASE_LIB=<a UMD build>` for another version, 2.117.3 passes) through 27 vectors.
  `node scripts/headless/clock-skew.js` runs the real page: the same page without the fix shows *Plan not available* (the field report), with it Home
  opens after one refresh and the saved plan stays.

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
- **An unfinished day is filed by itself** (Amir, 2026-10-12: *"i dont want any info or log to be lost"*; from
  2026-09-26 it was asked about instead). A real tick (`toggleCheckOnly()`, `syncExerciseCheck()`, via
  `markTouched()`) records the day it happened in `<id>_touched_d<N>`; the redraws that also run `updateProgress()`
  never write it. On a later open, a day with logged work, no finish stamp and no session running (6 h grace) whose
  ticks are from an earlier date is filed at once, before anything can be tapped (`fileUnfinished()`, from boot once
  the days are drawn): a session as it was left, under the day it was trained (the finish stamp carries that date),
  with that day's check-in and clock and no rating, into the session queue (*No signal* below). The page then opens once
  more so the sweep closes the day, and one card above This Week says what was filed: "Saturday's Day 3 wasn't finished
  · I still got it, as you left it: 1 of 25 sets", with OK (`paintUnfinished()`, the note `<id>_autofiled`, this phone
  only). There is no Clear: Send it / Clear it threw the work away on Clear, and an athlete who did neither and trained
  that day again mixed two sessions. Until a day is filed the sweep keeps its check-in, clock and the exercises it shares
  with a finished day (`_awaitingFile()`). Ticks from before 2026-09-26 carry no date and are not filed. The sweep still
  runs at launch only, not when the app returns to the foreground.

## 📊 Home and Progress in the Centre Court look (2026-10-12)

Amir, after the UX audit *Quiet Frame* (claude.ai/artifact/BBWjsR99FqthXmzCkeyK49) and Centre Court: *"moving gameplan tab
and changing its name, then move the cycle card from home to progress tab … do #6, floating initials"*, then *"yes to both,
move records and weight too"* (and drop the empty wins line). The look is Centre Court's (*"the redesign of other sections
should look like this"*): calm paper, rows with hairlines, one strong green thing on a screen. All of it is ONE CSS block,
**HOME AND PROGRESS IN THE CENTRE COURT LOOK**, the last in the sheet (after CENTRE COURT, so it wins a tie). Its colours
and its gutter `--g` (20 px, 16 under 360) are the app's ONE colour set since 2026-10-13 (it kept a copy of Centre Court's
tokens for one day; the copy is gone).

- **The tab bar**: Home · **Progress** · Library · Coach. Progress is the old Game Plan button (`data-tab="plan"`,
  `goTo('plan')`, the screen `#screen-plan`: none renamed) with a rising-line icon. Records, Body weight and the archive
  light it (`goTo()`'s `litTab`).
- **Progress, top to bottom** (`renderPlan()`): the athlete's name as an eyebrow (`.prog-eyebrow`) over **Progress**
  (`h1.prog-title`, 44 px), the sport badge; the **This cycle** card (`#cycle-card-wrap`, `paintCycleCard()`: since
  2026-10-13 the screen's one green cover, with the cycle's dates and, in the last 14 days, the days left: the separate
  banner and the header's dates went, see *Every other screen*, below); **Your
  numbers** (`h2.prog-sec`, then `#ceiling-row-wrap` and `#weight-row-wrap`, painted by `paintNumbers()` at boot and on
  every `goTo('plan')`, so a max saved mid-session or a new weigh-in shows; the Records count-up runs only while Progress
  is on screen); then **Game Plan** (`h2.prog-sec`) over the road of cycles (since 2026-10-13 one row per cycle: see
  *Every other screen in the Centre Court look*, below). Records' ← (`ceilingBack()`, after its own steps and `_ceilReturn`) and
  Body weight's ← go to Progress.
- **The This cycle card** has no "Your wins show here" line any more: with no wins it ends after its two bars. With no
  dates, or before the cycle, nothing is painted (the old `.home-cyc` line is gone).
- **Home, top to bottom** (`renderHome()`): the greeting as one compact block (the time of day as the eyebrow, the name
  at 28 px); the offline line and the filed-day card; This Week (the week note in its week, else the heading and the
  count); **Next up**; the rest of the week; the week-done extra; **Career** (the level, once Career Mode's XP switch is on:
  *Career on Home, and what a session earns*, below); **Hold Serve** (Career Mode's weeks held in a row, since 2026-10-17:
  *Hold Serve on Home*, below); **Daily habits** and AA Proof's strip. Nothing else.
- **Next up** (`dayCardHTML(…, { hero: true })`): the suggested day (`suggestedDayId()`: a session under way first, else
  the day after the last one trained this cycle, the first from there not done this week (`lastTrainedDayId()`; Line Call,
  2026-10-13, Amir's decision 3 "rotate": the first day not done this week made two-session weeks repeat Days 1 and 2 for ever,
  `scripts/headless/next-up.js`), never between cycles; `markSuggestedDay()` asks the same function, so the marked day
  and the big card are always one day) as the day's own cover: the photo graded into green, *● NEXT UP · DAY 2* (or
  *IN PROGRESS · DAY 2*), the name in capitals, *N blocks · M movements*, the quality tiles, and one green button,
  `.dc-go`: **Open Day 2 ▶**, or, for a day under way, *N of M sets* with the ticking clock (`.dc-clock`) and **Resume ▶**.
  It is the only Home element with `data-dc`. It has no fixed height, so its title is never cut off (the old 5:2 card with a
  height cap cut "DAY 1" when the line under it wrapped). Resume is green now; it was the only clay-filled button.
- **The rest of the week** (`dayCardHTML()` with no options, inside `.dc-list`): one row on the paper per day, in day
  order, `.dc-row` with `data-dl` (never `data-dc`): the day's number as the P24 outlined numeral (`.dc-num`), solid green
  once done this week, the name, *N blocks · M movements* or *Done this week*, and a grey › or a green **Done**. Enter and
  Space open a row or the Next up card (a document keydown listener; there was none for the old cards).
- **The door rows** (`.hrow`, Centre Court's *Your history* recipe): white, rounded 12, a 22 px green line icon
  (`hrowIc()`), the Space Mono label in green capitals over one line, the value in ink, the sparkline (`ncSpark()` draws
  in `currentColor` now), a grey ›. **One look with or without data** (`.quiet` changes only the words; the dark green
  fill and the dashed empty row are gone). The habits verdict *N to go* stays clay; *On target* and *Perfect* are green.
- **Between cycles** (`betweenCyclesHTML()`): one door row first, **Cycle 2 complete** (or **Roadmap complete**),
  *Finished Oct 8 · see it on Progress*, which opens Progress, where the card says Cycle complete. Everything after it is
  unchanged.
- **The account button** (`.global-account`) is `position: absolute`, not fixed: it sits at the top right of each screen
  and scrolls away with it, so it never covers content (it sat over the cycle card's ›, the week note's count, Library
  rows and Records text). `<body>` is not positioned, so the page is its containing block.
- **The guide**: *Getting around* lists Home · Progress · Library · Coach and says what each holds; *How your program is
  structured*, *What each day builds*, *Personal Records* and *The ⓘ* say Progress where they said Game Plan or Home.
- Checked by `scripts/headless/home-progress.js` (116 checks: the tab order, Progress's order, Home's single
  `data-dc`, the title never clipped at 320, 375 and 390, the green button, Enter and Space, the door rows equal with
  and without data, the account button over no text on 11 screens and off screen once scrolled, one left edge, no
  sideways scroll in both themes, Records' and Body weight's ← and Back, Records from an exercise still returning to it),
  with `smoke.js` and `cycle-end.js` updated.

## 🧩 Every other screen in the Centre Court look (2026-10-13, continuing)

Amir: *"continue until everything has a consistent design"*. One screen at a time, each its own block in the sheet named
`… IN THE CENTRE COURT LOOK (2026-10-13)`, each with its own headless suite, and the parts are always Centre Court's (a tab
screen's header as Progress's; ONE green thing per screen; paper rows with hairlines; the door row; the P24 numeral; his
signature for his voice). The plan and its order are in the audit artifact *Quiet Frame* (v2/v3).

- **Coach** (`renderNotes()`, `coachContactHtml()`; `scripts/headless/coach-tab.js`, 102 checks): the header `● YOUR COACH` ·
  **Coach Amir** · *Strength & conditioning coach*; the WhatsApp panel is the screen's one green thing (`a.coach-panel`, ONE link,
  the same `coachWhatsAppUrl()` and pre-filled message, his photo graded into the green, the eyebrow *Questions, swaps, anything
  that hurts*, **Message me on WhatsApp**, *Form videos welcome. I answer there, not in the app.*, the light-ring **Open WhatsApp**
  as a span inside the link, his signature at the foot; his photo shows once, so no small avatar by the signature); the number
  as selectable mono text (`COACH_WHATSAPP_SHOWN`); **Notes from Amir** as fold rows (`button.cn-row`, `toggleCoachNote()`, one
  open at a time, `aria-expanded`); **How the app works** as one door row. The hero, the coloured icon tiles, *Tap to read* and
  the section labels are gone.

- **Progress's road and the archive** (`paintCycleCard()`, `paintRoad()`, `roadRowHTML()`, `toggleRoad()`, `roadDoorHTML()`,
  `paintArchiveCover()`; `scripts/headless/progress-road.js`, 161 checks):
  - **The This cycle card is the screen's one green cover**: the current cycle's art (`cycleArtUrl()`) graded into `--hero`, the
    eyebrow *● THIS CYCLE · 2 OF 3* (a mint tick and *CYCLE COMPLETE* past the end date, *ROADMAP COMPLETE* on the last), the name in
    capitals, one mono line with the dates (`cycDate()`) and, in the last 14 days, *· 9 DAYS LEFT* (`cycleDayNo()` / `todayDayNo()`),
    then the bars and the wins as before. The days-left banner (`#sub-banner-wrap`) and the header's dates are gone (the cover says
    both).
  - **The road** (`#road-wrap` under the Game Plan title) replaces the C1–Cn meter and the photo cards: one `.road-row` per cycle,
    `is-done` / `is-now` / `is-next` / `is-locked`, the P24 numeral (solid when done), the name, a mono line (*WEEKS 6–10 · NOW*). Now is
    a fold, open by default (PLAN-01), holding the tagline, **The aims** (01, 02), **Why this cycle matters** behind the clay quote
    mark and **signed** (`WN_SIG` and his photo, as the week note signs), **Expected outcomes** (green ✓) and the *Why your plan looks
    like this* door (≥ 3 reasons). Past the end date that door sits under the current cycle's Done row. Up next and Locked are folds
    holding the tagline, the aims and the teaser; a Locked cycle with none of them is a plain row with its lock. The cycle before the
    current one opens its archive (›); earlier done cycles are plain rows. Folds keep their state across visits; Enter and Space work.
    `cycleCardHTML()` and `toggleCycleCard()` are gone, and nothing on Progress jumps Home any more (the Active card's banner did).
  - **Home between cycles** draws the next cycle as the same Up next row (`.bt-next`, its body ids `bt-road-body-N`).
  - **The archive** (`#screen-archive`): a cover with the archived cycle's art (`archiveCycleOf()`), ← as the 44 px glass button
    (Back to Progress), *● COMPLETED · CYCLE 1*, the name and its weeks; each day as a green section title and its exercises as
    read-only paper rows (outlined numeral, name, the line of numbers); the empty state as one sentence.

- **Guided and the rest timer** (`renderStep()`, `paintStepAbout()`, `paintTimerNext()`, the timer overlay; `scripts/headless/guided-rest.js`,
  156 checks):
  - **Guided's top bar is the slim bar's green**, safe-area aware: one eyebrow line *● EXERCISE 3 OF 7 · SET 2 OF 4*
    (`#step-eyebrow` and `#step-pill` keep their elements; under 390 px the set goes on a second line), the exercise's name in capitals,
    **the card's own ⓘ** at the right end of the name row (`#step-about` clicks the card's `.ex-about`, so it opens the same About sheet
    over Guided; a Because is the clay disc), and ? and ✕ as the cover's 44 px glass buttons. The week's limits row (`#step-week`) sits
    under it on a darker green, its numbers clay-on-green. The body's own name is hidden inside Guided only.
  - **The footer** is one row on the paper under a hairline: ‹ Prev (outlined, NOT drawn on step 1), the primary green Done · Start Rest ✓
    (Finish session ✓ on the last set), Next → outlined. Labels unchanged; `--fs-body` under 400 px.
  - **The rest timer is a green band, then the paper**: the sound as an icon toggle top left (`aria-pressed`, the same
    `toggleRestSound()` and `rest_sound`), ✕ top right (`closeTimer()`: it closes in the list and skips in Guided, as the old bottom button
    did; that button is gone, and Skip → stays on the band in Guided), *● REST · BARBELL BACK SQUAT*, the ring (mint progress, white
    digits), Pause/Start the biggest button, +15s and Reset outlined. In Guided the log of the set just done sits on the paper under the
    band in the day's set-table look (48 px RPE keys, over clay, under steel), the limits line under the keys, and **Next: Barbell Back
    Squat · set 3 of 4** under it (`paintTimerNext()` from `STEP.seq`; *last set* / *last round* on the final step). The ring shrinks at the
    same 720 / 620 px heights and the screen scrolls rather than squash. Timing, sound, the wake lock, the keys and Back are unchanged.
  - **The demo banner never covers a full-screen layer** (D9): `--demo-h` is the banner's measured height (a ResizeObserver), and the timer
    and Guided offset by it (the banner is 54 px at 320 px with fallback fonts, so a fixed 44 px covered the band).
  - program.html's fonts are this site's files since 2026-10-13 and AA Proof's strip's since 2026-10-17, so every check draws the
    real faces; `scripts/headless/lib.js`'s `context()` still takes `{ fonts: true }` (Google Fonts let through), which no app needs now.

- **Personal Records and Body weight** (`paintCover()`, `ceilBoardHtml()`, `renderCeiling()`, `renderCeilingLift()`, `paintCeilingForm()`,
  `renderWeightScreen()`; `scripts/headless/records-weight.js`, 122 checks):
  - **A cover on every screen** (← as the 44 px glass button, a mint-dot eyebrow, the title in capitals) with a **scoreboard**: Records
    shows the best lift (*104 · KG BACK SQUAT*), the ratio (*1.30× · YOUR OWN BODY WEIGHT*, only with a body weight) and the lift count,
    with the old hero's sentence under it; a lift's page its latest estimate, the change since the first and the entries; Body weight
    the last reading, the change over the range (*−0.8 kg · DOWN OVER THE RANGE*) and the readings, with the average-to-average sentence.
    The green hero cards are gone. A **New best** is the cover's green foot (`--foot`), so the screen keeps one green thing.
  - **Paper rows** for lifts, entries, readings and Log a max's picker; **+ Log a max** (*Tested a lift?*) and *Add your body weight* as
    door rows; **Due for a retest** as the day's banner (a 4 px clay stripe, *Test 5RM* as the green text link); **How this works** one
    fold, closed on every screen (it was open on the empty one); the empty state's four steps numbered 01–04.
  - **Log a max**: the set table's boxes (white, `--field`), the day's 48 px RPE keys, the estimate and its grade as a two-track
    scoreboard, Save as the primary green.
  - **Charts green**: the line and every dot (the dots were clay; clay is "look here" only), grey axes; a sparkline is clay only for a
    real fall. **The range chips** have their own class, `.wt-chip` with `aria-pressed` (defect D6: a second global `.chip` rule had
    restyled them). Every ✕ is a 44 px target (it was 26). *Delete all my weight history* is quiet clay text, two taps as before.
  - Every write is the same (`<id>_1rm`, the tombstones, `<id>_hab_wt`, one reading a day), checked field by field.

- **The Library** (`goLibrary()`, `setLibPane()`, `renderSessionsWorld()`, `renderBefore()` / `toggleBefore()`, `renderExerciseLibrary()`;
  `scripts/headless/library.js`, 140 checks; Amir, 2026-10-13: *"Remove the doors"*, *"Fold after first view"*):
  - **No doors page.** The tab opens straight to a pane under the header (*● TRAIN IT, LEARN IT, KNOW IT* · **LIBRARY**): one switch,
    Sessions · Playbook · Exercises (`#lib-switch`, `role=tablist`, each tab with its count in mono under the word; arrow keys, Home and
    End move along it). The counts are bare numbers, blank (never 0) after a failed load. **The last pane used opens next time**
    (`lib_pane` in localStorage: no athlete prefix, never synced, a value that is not a pane is ignored), else Sessions.
    `enterWorld()` / `exitWorld()` and the doors are gone: a pane is a tab root, so it has no ← and Back goes Home.
  - **A session or article returns to its pane at the same scroll** (`_libScrollY`) by its ← or the phone's Back. A suggested
    session's ← still goes back to where it was offered (LIB-01).
  - **Sessions**: each shelf band is a short cover (its picture graded into green, *● 01 · TRAIN*, the shelf in capitals, **All N ›** as
    the light-ring pill; the band is still the button). Sessions are paper rows with a mono line (*50 MIN · BARBELL · ✓ SESSION*).
  - **Playbook**: the latest read is the cover (*● LATEST · TRAINING*, *5 MIN READ*); each category with reads is a green section title
    with its count, then paper rows; an empty category is not drawn. No clay.
  - **Exercises**: the search box in the set table's input look, one pill style for the chips (the chosen one green), paper rows with a
    green mono *IN YOUR PLAN*.
  - **A Library session**: a cover with its shelf's picture and the 44 px glass ←, the focus tag as the eyebrow, the name, *50 MIN ·
    BARBELL*. **Before you start** is the day's banner (white row, 4 px clay stripe) in its own section, never inside the Why fold:
    **open the first time each session is opened, folded after that**, a tap opens it (`ws_before_seen` = `{"<id>": 1}`: no athlete
    prefix, never synced; with storage blocked it is open every time, the safe way round). The words are unchanged. **Why this session**
    is a fold row; **Mark as done** the one primary green button, behaviour unchanged.
  - **An article**: the same cover; a callout takes the Coach's-note pull-quote look; an embedded session is a door row. The reading
    layout's heading bar, drop cap, ball bullets and caption mark are green since 2026-10-13 (they were clay; clay is "look here").

- **Sign in, the Welcome, Loading and the error screen** (`showSignIn()`, `maybeWelcome()`, `#loading`, `showError()`;
  `scripts/headless/entry-screens.js`, 121 checks; one block at the very end of the sheet):
  - **Sign in** keeps Amir's "Baseline" (2026-09-12): the court photo over a hero that paints as `--hero` before the photo, the scrim a
    mask of `--hero-end`, the eyebrow *● AA PERFORMANCE* in the mint-dot recipe, *COACH* clay on green (`--clay-on-green`, the brand line).
    The sheet is `--paper` with the app sheet's 16 px top corners; the labels Space Mono in `--grey`; the fields the set table's boxes (white
    `--row`, `--field` edge, 16 px text, 48 px, 10 px corners, green focus); a failed sign-in is the day's banner (4 px clay stripe, ink text).
    Every colour is a token now (`--court`, which only this screen read, is gone).
  - **The Welcome** is a cover (the picture graded into `--hero` as the archive's is, *● YOU'RE IN*, *WELCOME, ALEX.*, ✕ as the 44 px glass
    button), its two lines on the paper **signed** (`WN_SIG` and his photo), **Open Day 1** the primary button and *Look around first* quiet
    green-ink text; both on screen at 320 × 568. On a wide window it sits in the app's 520 px column.
  - **Loading** is the mark (52 px), a 32 px ring and *LOADING YOUR PLAN* (it read "Loading Program"); with reduced motion the ring turns
    slowly and never stops.
  - **The error screen** keeps its clay icon (an error is "look here"), the title and message in ink, `.error-btn` in the one primary list and
    `.error-btn.ghost` outlined, both 48 px. No `--yellow` left in it.

- **The sheets and the notices** (`sheetWrap()`, `paintSheetBack()`, `openAccount()`, `openHelp()`, `openHistorySheet()`, `openWhyPlan()`,
  `openQualitySheet()`, `openReadiness()`, `paintPlanOffline()`, `aaToast()`, `showInstallOffer()`; `scripts/headless/sheets-notices.js`,
  508 checks; one block before CENTRE COURT):
  - **One sticky top row on every sheet** (`.sheet-bar`, 56 px): the handle, **‹ Back** on the left only when a page is behind, **Close** on
    the right (44 px, green ink; white on the About sheet's green, where the row turns solid green once the page scrolls under it). It is
    drawn once, by `paintSheetBack()` for the sheet and in the markup for the readiness check (whose Close cancels it). The six grey Close
    buttons at the foot are gone; *Skip for today* stays (it is an answer). A fresh open starts at the top. The dim covers the whole
    window at every width; from 560 px the sheet is a centred dialog with the same row and no handle.
  - **The pages in Centre Court's parts**: Account (the name as the title, Theme as the Library's switch, Install, How the app works and
    Privacy as door rows, Sign out quiet clay text, still two taps); Help (fold rows with a 22 px green line icon, the asked card open
    under the row); History (the eyebrow, the chart green on the paper, the sessions as paper rows, *Open in Personal Records* as a door
    row); Why and a Quality (green section titles, paper rows with ›); the readiness check (green section titles, the day's keys, *N of 5
    answered* in grey until Begin turns primary).
  - **The banner** is the day's lower-day recipe for every state that lasts on Home: the offline line (grey stripe, *OFFLINE*), *Your plan
    was updated* (clay stripe, *UPDATE*, Refresh as the link), the filed-day card (clay stripe, *SAVED FOR YOU*, OK as the link).
  - **The note box** (`aaToast()`) is a green cover box (`--hero`, white words, the light-ring button, 16 px corners) in the middle of the
    screen, **above the sheets** (z 215; it was 71, under them: D9), still under the video pop-up. `opts.kicker` adds a mint-dot eyebrow:
    *How to log*, *No weight*, *Session clock* on its three notes (2026-10-13). Its place, one-at-a-time rule and timings are unchanged.
  - **The install offer** is a white bottom card styled in program.html only (shared.js serves the public site): the app icon, the words as
    before, **Install** primary green, *Not now* quiet text (`showInstallOffer()` relabels shared.js's Dismiss).

- **The sweep** (2026-10-13, after every screen above): the athlete-facing copy in program.html is COM-3 clean (no em dash and no
  semicolon in the guide, Records, Body weight or the demo banner; Guided's button reads **Done · Start Rest ✓**, and its tests and the
  guide moved with it). An em dash is left only where the athlete never reads it as prose: the report email and `readinessPlanLine()`
  (coach.html parses that line), the coach preview bar, the page title, and `—` as an empty value in a scoreboard. 42 lines of style
  for classes nothing draws went (Night Court's card parts, the old Coach header, the old card's chips, rest and action rows, the timer
  presets, the old weight input, `--court`). After it (aap-v137): the one primary button wears `--btn` (lighter in dark mode), the
  article reader is green, the note box's three notes carry labels, and the Your numbers rows' sparkline ends on a green dot (it was clay).

## 🏠 Home, led by the training (HOME-02, 2026-09-26)

**Since 2026-10-12 Home leads with the week and its pieces moved: read *Home and Progress in the Centre Court look*
above first.** What follows is how Home got here; the habits verdict and the all-done week still hold.

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
  snapshot from an earlier day shows the level until the strip writes today's (once Career Mode's XP switch is on it says *Ready for
  today* instead: the level is the Career row's).
- A week where every day is done says "All 3 sessions done this week" (in a week with a note, "All 3 done" on the
  note's top line), with every day a row. Nothing more.

## 🏆 This cycle: where it is, and the wins (PROG-01, 2026-09-27)

**Since 2026-10-12 the card is on Progress, under its header, not a tap and with no empty wins line** (*Home and
Progress in the Centre Court look*, above). The wins below are unchanged.

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

## 🏁 When the cycle is over: Home between cycles (PROG-02, 2026-10-10)

**Since 2026-10-12 the Cycle complete card is on Progress; Home opens with a *Cycle N complete* door row to it**, then
Up next and the rest as below (*Home and Progress in the Centre Court look*, above).

Athletes kept training after their cycle ended, taking the cycle for a week. The day after the end date the This cycle
card shrank to the small line, whose "Weeks 6–10" is the *roadmap's* count, the "days left" banner went (it shows from
14 days down to 0), and This Week started again at "0 of 3 sessions done this week" under the big day cards: the app
told them to train. Amir picked direction B of three mockups (https://claude.ai/artifact/Cb6wBcfLhJ48rbz5HtuYDF):

- **The card says so** (`paintCycleCard()`, `p.over`): the day after the current cycle's `endDate` (the end date itself
  is still the cycle), the same card reads **Cycle complete**, *Finished Oct 6 · 5 of 5 weeks*, the week bar full, the
  sessions done against planned (up to the end date only: a session repeated since never counts) and the wins. On the
  roadmap's last cycle it is **Roadmap complete**, *3 cycles · 15 weeks* (the weeks only when every cycle is dated) and
  one filled segment per cycle. No wins: nothing, not the "your wins show here" line.
- **Up next** (`betweenCyclesHTML()`, where This Week was): Game Plan's own card for the next cycle, folded, its Read
  more in place and a tap to Game Plan, then the one ask, a WhatsApp door: **Ready for Cycle 3?** *Message Amir to start
  it.* On the last cycle: **What's next**, *You've trained the whole plan.* and the same door, **Ready for Cycle 4?**
- **One ask, in all situations** (Amir, 2026-10-10: *"dont say amir is making the other one, just say 'Ready for
  NextCycle ? Message Amir to start it' in all situations"*). The first version said "Amir is building it now" for 14
  days, then this; it went the same day. Nothing on Home says the next cycle is being made.
- **Game Plan marks it Done**: past the end date the cycle's row on Progress's road reads **Done** (`is-done`, its
  numeral solid; it was the card's Active pill and the meter's segment until 2026-10-13), and the Why door stays under it.
- **Between cycles**: *No new week until Cycle 3 starts. Want to keep moving? Any session from Load & Build still works.*
  and one **Repeat a session** row (`#bt-rep`) that unfolds the day cards (`paintBetweenFold()`, `.bt-folded`). They stay
  folded unless it is open or a session is under way: that card carries Resume, so it never hides. No week count, no
  suggested day (`markSuggestedDay()` marks only a session under way) and no week-done Library extra (LIB-01's two
  moments stay two).
- It ends when the next cycle is published (`currentCycleIndex` moves on). A cycle with no dates cannot end and never
  shows any of this; the demo has none. `cycleOver()` is the one test.
- The guide's *How your program is structured* card says it in Amir's voice. Checked by
  `scripts/headless/cycle-end.js` (running, the end date, 4 and 40 days past, the last cycle light, dark and at 320 px,
  undated, the fold, Read more, Resume, and Game Plan's Active or Done).

## 🎬 Highlight Reel: a share card for each win, and a moment for each (2026-10-17)

Amir asked to celebrate athletes' wins and let them share them on Instagram, approved the design page
(https://claude.ai/artifact/SuyYRPeX9n2SdbiUvoHhkF) with *"go with your picks"* on all five decisions (all five cards at once; the
athlete picks English or Farsi; the weights shown, with a switch to hide them; his photo and signature on every card; the name
Highlight Reel), and added *"the achievements, badges and other things need to have a celebration as well"* (Career Mode's GAME-14).

- **One painter, `assets/js/sharecard.js`** (`window.ShareCard`): a canvas, 1080 × 1920 (Story, the default) or 1080 × 1350 (post), the
  court's lines on every card, Centre Court's green and clay, Amir's photo (`assets/img/coach.jpg`), his signature (`WN_SIG`'s two paths,
  drawn with Path2D), the mark, @amirardekanian and AMIRARDEKANI.COM. In a Story the top 250 px and the bottom 340 px stay clear (Instagram's
  bars). Ten templates: the training's **best** (New Best), **effort** (Same Effort), **retest** (Retest), **cycle** (Signed Off, with the
  cycle's own cover, `cycleArtUrl()`) and **roadmap** (The Distance, each cycle's cover small), and Career Mode's **badge**, **achievement**,
  **title**, **level** and **quest**, drawn with sample data until phase 3 feeds them. Barlow and Barlow Condensed from
  `/assets/css/app-fonts.css`; Vazirmatn (`assets/fonts/Vazirmatn-Variable.woff2`) loaded only for a Farsi card: right to left, Persian
  digits, no letter-spacing, a lift's and a cycle's name in English. **Decided** (Amir, 2026-10-17: *"Keep all three Farsi choices"*):
  Iranian (Shamsi) dates on a Farsi card (the design page had shown Gregorian), the athlete's name in English letters, and "Career Mode"
  in English on the level card. Arrows, ticks and stars are drawn (the font files carry Latin only). **Every Farsi word is in ONE table,
  `FA`, and every one is still a draft for Amir to read.** program.html loads the painter the first time a card is drawn (`hlLib()`);
  sw.js precaches it.
- **The rules (the design page's):** a card says what the app says, from the same rules (PROG-01): the set as lifted (`w × r` from the
  record), never the 1RM estimate; a kilo gain only at the same reps (or a reps gain at the same weight). Never body weight, a check-in
  answer, pain or an RPE-only claim (`winText()` now says each win's `shape` and `share`: *felt easier* wins and *stronger* only because it
  felt easier are not offered). Nothing leaves the phone until the athlete taps **Share** or **Save image**; nothing is ever posted for them.
  Never in the coach's preview.
- **The five places** (each where the win already shows):
  1. **The finish card** after Done: a **New best** band (`noteNewBest()` collects every new best while Done files the records:
     `_hlCollect`, `collectWins()`) and a **Retest beaten** band (new: a test-flagged lift in the retest window, against the previous test
     of the same lift, else the best before the cycle; beaten = more weight for at least the reps, or more reps for at least the weight).
     Three at most, the retest first. In the card's green (grid row 5), a burst the first time. Kept as `<id>_hlwin_d<N>` (`{ sess, specs }`,
     a raw write that `_snapshot()` skips, tied to the finish stamp like the day's set copy), so a reload shows it again, quietly.
  2. **The This cycle card** (Progress): **Share a win ›** under the wins (`cycleWins()` keeps each win's two sets `a` / `b` with their
     dates; `hlEffortSpec()` names their cycle weeks). Past the end date the card has **Share your cycle** (**Share the whole road** on the
     roadmap's last cycle) and its sheet offers the cycle, then each win.
  3. **Cycle complete / Roadmap complete**: a one-time full-screen moment (`maybeHighlightMoment()`, `openMoment()`, the Welcome's recipe)
     at the first open in the 14 days after the end date: the cycle's cover with a burst of court lines, the card itself, his words and
     signature, **Share your cycle** and **Not now**. `<id>_hl_seen` (synced) marks it, so it shows once across phones. Never over the
     Welcome, never in the demo or the preview. Back closes it (`topLayer()`). **Its Share button hands the moment's one guard history
     entry to the share sheet** (`dropMoment(true)` then `openShareSheet()` then `navSync()`): popping the entry with `history.back()` and pushing the
     sheet's own in the same tick let the late pop remove the sheet's entry, and closing the sheet (✕ or Back) then left the app (found 2026-10-18;
     a reward's moment goes through the same `openMoment()`). Any new "close this layer, open that one" hand-off does the same, never `closeX(); openY()`.
  4. **Personal Records**: **Share** on a lift's New best band, on a **Retest beaten** band (a test logged there in the last 7 days that beat
     the one before), and on every row that set a record (it beat every entry before it). A lift's first record beats nothing: no card.
  5. **The share sheet** (`openShareSheet(specs, i)`, a page of the one sheet, wrapped by `sheetWrap()`): a picker when there is more than
     one card, the preview (the exported picture itself), **Story | Post**, **English | فارسی**, **Show the weights** (hidden: the change
     only; not shown for a card with no kilos), **Show my name**, **Share** (the phone's share sheet with the PNG and the caption:
     `navigator.canShare` / `share`; a phone that cannot share a picture saves it instead and says so), **Save image**, **Copy caption** and
     the tip *Mention @amirardekanian in your Story so Amir can share it too.* The choices are `aa_hl_prefs` (no athlete prefix, never
     synced). Share waits for the picture so the phone's sheet opens inside the tap (Safari refuses it after a wait).
- **Career Mode** (phase 3) opens a reward's card with the same `openShareSheet([spec])` and its moment with `openMoment({ eyebrow, title,
  sub, art, words, go, specs })` (career/CAREER_MODE.md, GAME-14). The data shapes are written above each template in sharecard.js.
- **The guide** has a *Share a win* card (`key: 'share'`); the privacy notice says how a card is made and where it goes (§2.2, `#share-cards`).
- Checked by `scripts/headless/sharecard.js` (every template at both sizes, in both languages, with weights and names on and off and with
  long names: no text past its box, nothing in Instagram's bars, nothing overlapping, Persian digits in Farsi, the EN and FA tables
  key for key) and `scripts/headless/highlight-reel.js` (the real app: the bands, the row, the moment, the sheet, Personal Records, 320 px,
  reduced motion).

## 🎾 Hold Serve on Home: the weeks held in a row (Career Mode, 2026-10-17)

The one piece of Career Mode an athlete sees in phase 1 (`career/CAREER_MODE.md` → Consistency and the Build order's row 1). Amir
picked the place and the words on the page *Hold Serve on Home* (https://claude.ai/artifact/T6MTq7KGa78t7XvtjaPRAp), option B of
three: *"B, show it at zero, words ok"*. **Display only: nothing is written and nothing pays XP.**

- **Where:** its own door row (`#home-hold-wrap`, `paintHold()`), after the week's days and the week-done extra, right above **Daily
  habits**: the two rows are a pair. The `.hrow` recipe with a tennis ball (`hrowIc('ball')`), **HOLD SERVE**, the count as the big line,
  the next step as the small one, and the run as dots in the sparkline's place (this week a dashed ring while it is open). A tap opens
  the guide at its card (`openHelp('hold')`, `APP_GUIDE` key `hold`).
- **The words** (`holdRowHTML()`): *4 weeks in a row* · *1 more this week to make it 5* (*Do all 3 this week to make it 5* before any);
  this week held: the count in green, *This week is held*; one week: *1 week held*; at zero (nothing held yet, or the last week missed):
  *Hold this week* · *2 more sessions this week to hold it*, no dots; every day done on this phone before the server has judged the week:
  the server's count and *All 3 done this week*; between cycles or before the next starts: *5 weeks in a row* · *It carries into Cycle 3*
  (at zero then, nothing). "This week" is the plan's own training week, the same one This Week counts (`weekDoneDays()`).
- **The data:** the athlete's own `week_held` and `week_broken` facts (`career_facts`, row-level security: their own only), read with
  `sb.from()` in `refreshHold()`, and one row of `career_rules` (a rulebook exists, and its `switch`: the Career row below asks for the
  profile only when it says the XP switch is on). Hold Serve itself never calls `get_profile()`: it works out the whole career
  (0.2 to 1.5 s) and writes as it goes. `holdCount()` counts them as `get_profile()` does, a **twin** of its loop:
  `scripts/check_twins.js` runs `scripts/career/hold_cases.json`, and `scripts/career/rehearse.mjs` holds the two equal on every athlete
  it builds (and they were equal for all 28 live athletes on 2026-10-17). Change one, change the other.
- **Not sure yet, so nothing** (`holdState()`): the server judges a week only when something makes it look (a session saved, a
  programme change, a profile read). A week that ended unheld with nothing saved since has no fact yet, so when the training week after
  the newest held one has ended (`holdWeeks()`, `career_weeks()`'s weeks), the row hides until a save brings the facts up to date. A
  week Amir paused has no fact either; the phone cannot tell the two apart and never guesses.
- **Nothing** offline (no answer this visit), in the demo, in the coach's preview, with no rulebook (Career Mode switched off: the copy
  is dropped too), after a refusal, or for a current cycle with no dates (the server has no training week for it).
- **When it reads:** at boot behind the first paint (after `loadHistory()`), after a session reaches the server (`recordSessionToCloud()`
  and `_replayQueue()`: its trigger has judged the week by the time `save_session` answers), and back in the foreground or online after
  ten minutes. `paintWeek()` repaints it, so the next step follows the week's count.
- **The copy:** `<id>_holdcache` (`{ t, facts }`), written only from a real answer, never synced (`_snapshot()` skips it), painted at
  once on the next open unless the app already knows it has no signal; the read that follows confirms it or takes it away.
- Checked by `scripts/headless/hold-serve.js` (40 checks: every state of the words, the not-sure rule, offline, no rulebook, a refusal,
  the demo, the preview, an undated cycle, the copy kept or dropped and never synced, the tap, a re-read after a session reaches the
  server, 320 px and dark). The stub answers table reads from its `tables` (and `tableErr`).

## 🪜 Career on Home, and what a session earns (Career Mode phase 2, 2026-10-17)

The training app's half of Career Mode's XP switch (`career/CAREER_MODE.md` → *The switch decisions*, and GAME-13: every meaningful
action answers at once, visibly). The server's half and AA Proof's are in `HABITS.md` → *Career Mode (phase 2, the XP switch)*.
**Built, rehearsed and applied on the server (2026-10-17), and switched on 2026-10-18: nothing here showed, and the app asked the server for nothing new, until the server's XP switch
went on.** Now that it is on, the athlete's
level is the career's (every session, every habit, never reset by a season) and this app shows it in three places.

- **The row** (`#home-career-wrap`, `paintCareer()`, `careerRowHTML()`): one door row on Home, **above Hold Serve**. Home now reads: the
  week's days and the week-done extra, then **Career**, **Hold Serve**, **Daily habits**. The `.hrow` recipe with a rank's chevrons
  (`hrowIc('career')`), the label **CAREER**, the level as the big line (*Level 11*) and the rank with what the next level needs as
  the small one (*GRINDER 1 · 1,310 XP to level 12*). A thin green bar runs along the row's foot (`.career-bar`): the way to the next
  level. The level is worked out here from the profile's XP with `careerLevelOf()`, so the row and the finish card agree to the XP.
- **The tap** (`goCareer()`): AA Proof's Locker, `habits.html?client=<id>&go=pass` (AA Proof reads `go=pass` at the end of its boot).
  The row leaves the app. It does not open the guide the way Hold Serve's row does.
- **When it shows:** the switch is on (`careerOnT()`: a real profile with `ready` and `switch.xp`), `DATA` has loaded and the profile
  carries a level. **When it does not:** before the switch, in the demo, in the coach's preview, and on a first launch with no signal
  (no profile yet and no copy). With no signal and a copy, the copy shows.
- **The data:** `get_profile()` (`refreshCareer()`, 10 s), kept as `<id>_careercache` (`{ p, at }`) and painted at once on the next
  open (`loadCareerCache()`). Before the switch the app never asks. **Hold Serve's own read of `career_rules`** (`refreshHold()`
  selects `version` and `rules->switch`) tells it (`careerSwitchSeen()`): a day in `xp` means ask, anything else drops the copy and
  the row. It asks again after a session reaches the server (`careerSessionSaved()`), 3 s after a habit ticked in the Proof strip
  changes the card snapshot (that tick pays XP), and whenever Hold Serve reads again (at boot, and in the foreground or back online
  after ten minutes).
- **The habits row** (Daily habits) never says a level in Career Mode. Where an earlier day's snapshot would have said *Level N* it
  says *Ready for today*, because the level is the Career row's.
- **The finish card's line, before Done** (`.confirm-earn` in `#confirm-<day>`, `paintConfirmEarn()`): once the session can be
  finished, *This session earns* **+450 XP**, with what makes it up in grey underneath: *Session 400 · Every set logged 50*, and
  *Check-in 20* when it was answered. A day already done this week says *Day 1 is done this week already, so the session itself pays
  once* (the full log and the check-in still pay). A session that completes the week adds *Your week held +400 · Back after a broken
  week +100 when it counts*. The server judges a week (`career_derive()`), so the phone marks those two as pending and keeps them out
  of the sum. `careerEarn()` prices from the profile's `rules.prices`, so a re-seeded rulebook changes it with no release, and it uses
  the cap of `career_facts_paid()` (one paid session per plan day per training week). A session finished early reads *Session,
  finished early* at the early price. The box is empty, and hidden, outside Career Mode and until the card is ready.
- **The finished card's line, after Done** (`#earn-<day>`, `.complete-earn`, at the left of Amir's signature on the green): **+470 XP**
  over **Level 11 · 840 to 12**. At Done, `careerEarnAtDone()` keeps what the session earned and the career XP of that moment in
  `<id>_earn_d<N>` (`{ t, xp, parts, before, saved }`). Until the server has the session, the line shows this phone's number and says
  **counting** where *840 to 12* would be. `careerSessionSaved()` stamps `saved` the moment `save_session` answers and asks for the
  profile again. An answer asked after that stamp turns the line into the server's: its career XP since Done (a held week, a best or
  anything else that landed with the session is in it) and the level that gives. A reload paints the same line again from the key.
- **Twins** (`scripts/check_twins.js` §9, held to `scripts/career/xp_cases.json`, the server's own answers): `careerLevelOf()` is the
  server's `career_level()` and AA Proof's `levelInfo()` on the career's curve. `careerFullLog()`, `careerCheckin()` and `careerEarly()`
  are `career_session_want()`'s full-log, check-in and early rules. `careerEarn()` is not a twin of one function: it prices those facts
  with the profile's prices and the cap of `career_facts_paid()`. A held week stays the server's to decide. Change a rule on both
  sides, then in the cases.
- **The guide:** `APP_GUIDE` has a card `key: 'career'`, *Career: your level* (your initials → How the app works). The row leaves the
  app, so nothing opens the card by key. *Getting around* says where the row sits (next session, the other days, Career, Hold Serve,
  daily habits) and *Finishing a session* says what the finish card shows (CNT-01: a control that moves changes its card in the same
  pass).
- **Keys.** `program.html` still writes **no `<id>_hab_*` key**. Those are AA Proof's, and its profile copy, `<id>_hab_career`, is a key
  this app neither reads nor writes. This app's two Career keys are `<id>_careercache` and `<id>_earn_d<N>`. `_snapshot()` skips both
  (a cache of the server's answer, and this phone's view of a finished day), so neither ever syncs. Neither is written in the demo or
  the coach's preview.
- Checked by `scripts/headless/career.js` (55 checks across both apps, and this is the training half): the row, its place above Hold Serve and the
  10 px between the two, no row and no `get_profile` before the switch (the switch off, and the phase 1 rulebook that has none), the
  phone's copy shown at once and dropped when the switch goes off, nothing in the demo or the preview, the habits row's wording, the
  finish card's line (plain, a repeat, a held week after a broken one), the finished card (*counting*, then the server's number), the
  keys never synced, the tap into the Locker and 320 px. The stub answers `get_profile` from `__STUB.profile` and `career_rules` from
  its `tables`.

## 🏅 Rewards on the finish card, the bands and the row (Career Mode phase 3, 2026-10-18)

The training app's half of Career Mode's catalogue switch (`career/CAREER_MODE.md`, GAME-13 and GAME-14; the server's half and AA Proof's
are in `HABITS.md`). **Built behind `catalogueOnT()` and dormant:** with the catalogue switch off the app is exactly phase 2's (the finish
card, the row and the finished card are byte for byte what they were; `scripts/headless/career.js` still passes). **No new screen**
(decision D13): Proof is the career's home (the shelf, the Grand Slam, the titles), this app adds four small things to places that exist.

- **The gate:** `catalogueOnT()` = `careerOnT()` and `p.switch.catalogue` and `p.ladder` and `p.owned`. It reads the profile of the
  server's `get_profile()` (spec §6): `ladder` (every live badge with `have`, `now` for a run, `next`, `next_tier`, `metal_next`,
  `size_next`, `phone`: `'session'` = this app moves it at Done, `'week'` = it moves when a week or cycle closes), `near`, `owned` (a
  **list** of award ids, sorted, no days: the dedupe key; read through `ownedIds(p)`, never `Object.keys(p.owned)` or `owned[id]`),
  `numbers.four` and `moments`. **The profile is split (stage70):** `get_profile()` is the core and carries no `recent`, `titles` or filled
  `badges` / `achievements` (those are `get_awards()`'s, the shelf, which only AA Proof reads when its shelf opens). Nothing is asked of the
  server that phase 2 did not ask: one `get_profile()` plus `mark_moments_told()`; this app never calls `get_awards()`. The one cost: a
  reward AA Proof has already told is no longer in `moments` and, with no `recent`, draws no band here (`collectRewardBands()` still reads
  `p.recent` if a profile ever carries it). A session's own reward is untold when the answer after Done arrives, so it is in `moments`.
- **The finish card, before Done** (`careerMoves()`, `careerMovesHTML()`; `.cf-moves` under the XP lines in the same `.confirm-earn` box):
  every ladder the session moves, **three lines at most**, then one grey *+N more in AA Proof*. A line is `Paper Trail 10 of 10 · bronze`
  (a tier crossed: bold ink, the metal in lower case), `Century 24 of 25`, or `Hold Serve 5 of 8 · when the week counts` (a week ladder:
  Hold Serve and The Long Count when the session closes the week, Love Hold when the week is by the book so far, Closer when it closes
  the cycle; always pending, because the server decides a week). Order: crossed first, then the nearest (`next − have`), then the sure
  before the pending. `careerMoves(e, ladder)` is PURE and a **twin** (`scripts/check_twins.js` §10, `scripts/career/reward_cases.json`):
  `e = { early, fullLog, checkin, weekCloses, cycleCloses, byBook? }`; `byBook` is optional (without it the session alone is read);
  each line is exactly `{ id, name, have, next, crossed, pending }`, and the metal word is read from the ladder when it is drawn.
  A run badge (Hold Serve) counts from the ladder's `now`; if the ladder leaves it out, `careerLadderNow()` fills it from
  `numbers.four` (one source). **Clay never shows here** (DS-01); no new card, `--fs-` tokens only.
- **The finished card, after Done** (`rwCountingBands()`, `collectRewardBands()`, `paintWinBand()`; the Highlight Reel's slot
  `#hlwin-<day>`, `<id>_hlwin_d<N>.rewards`): at Done `careerEarnAtDone()` also keeps `snap` (every award id the phone knew) and `moves`
  in `<id>_earn_d<N>`. A tier the finish card showed as crossed (and is not full-screen) is a band at once with **Counting** in its mint
  label and no Share. When an answer asked after the session reached the server arrives, `owned` minus `snap` is mapped to specs through
  the answer's `moments` (and `recent`, if present): a Counting band whose award is owned becomes the real band (the label goes, Share is there), and
  one the server did not give is taken away. A full-screen reward is never a band (it gets its moment); a `tick` is XP only; an older
  reward this phone only just learned of is Proof's to tell. **Three bands at most across the Best/Retest specs and the rewards, the rest
  one grey line.** The reward's name and, for a badge, its metal go in `<b>` as plain text, never `<em>` (that is clay on the green). Share
  opens the sheet on the badge, achievement or title. **Only a reward drawn as a band is marked seen and told** (`mark_moments_told`, app
  `'training'`): the room for rewards is `3 − the day's Best/Retest specs`, in the stored order, and one behind the *+N more in AA Proof* line
  (or cut by the 8-reward cap) stays unseen and untold, so AA Proof's queue still announces it (GAME-14).
  A reload paints the same bands from the key, quietly (the reward bands wait for the profile, so `paintCareer()` draws them).
  **`paintWinBand()` with the catalogue off is phase 2's, exactly:** every paint that is not quiet re-draws the bands, runs their `is-new`
  burst and buzzes (`navigator.vibrate`). With the catalogue on a band bursts, and the phone buzzes, only for a band key not on screen yet.
- **Moments** (`maybeRewardMoment(reason)`, `rewardAfterAnswer()`, `openMoment()` with a new `onClose`): the queue of spec §7. **Only an
  answer received in this run opens one** (`CAREER_T.at` newer than the page's `performance.timeOrigin`), never the phone's copy at
  first paint. On every fresh answer the **cross-app catch-up** runs first: a waiting row this app has seen (`<id>_rw_seen`, which is
  **synced**, merged as a union) is told on the server, so AA Proof never replays it. Then **one** full-screen moment per open of ANY kind
  (`_rwOpened`: the cycle's own moment counts, `openMoment()` sets it): the first waiting `full` row, unless a moment already opened, a
  session is under way (`body.session-on`), or `.wel`, `.hl-moment` or `.finish-rate:focus-within` is on screen. The first answer after a
  session reached the server ('done') opens the biggest full-screen reward **that session earned** (not in `snap`), 0.7 s after the
  answer so the finished card has scrolled in, never over the rating, even if one opened at boot. A row that does not open stays unseen
  and untold: it comes at the next open. The seen list is written BEFORE the moment shows. A moment never blocks Done or the session
  queue (`scripts/headless/session-queue.js` still passes, and Done works with `mark_moments_told` refused). Content: eyebrow = the
  meaning (*Consistency*; *Grand Slam* for that title), title = *Hold Serve · Emerald*, sub = the server's caption, art = the current
  cycle's cover, words = milestone *That one took weeks. It's yours for good.*, legend *This is rare. Well done.*, Grand Slam *A title
  in all four. That's the whole game.*, go = `HL_TITLE[kind]`, specs = the award's share spec plus the title it minted. Not in the demo
  or the coach's preview.
- **Home's Career row** (`careerRowHTML()`): the level line is untouched. Two more small lines under it, each on its own line:
  `.career-four` from `numbers.four` only (*7 weeks held · 41 sessions · 12 bests · 2 comebacks*, a zero cell left out, nothing when
  all four are zero, singular at 1; **Sessions with Amir shows +1 from this phone** for a session finished here that no answer has
  counted yet, never lower than the profile's) and `.career-next` (`near[0]` as *Paper Trail 9 of 10* when it is within two or at 80%).
  The tap opens AA Proof's **Progress** (`&go=progress`) instead of the Locker; the `aria-label` names the numbers. Checked at 320 and
  390 px, light and dark: the four wrap to two rows at most, the goal is one row, the rank line is never cut.
- **The guide:** `APP_GUIDE` *Getting around*, *Finishing a session*, `key: 'career'` and `key: 'share'` each gained a sentence phrased
  *Once Career Mode's rewards are on, …* until the go-day commit rewrites it to the plain present (Amir reads every new string first, D10). The guide says what the app does, no more: the goal line shows only *when you're close to a badge* (as `.career-next` does), the row opens **Progress** in AA Proof, a Counting band has no Share until my side has it, and a band can be a badge, a moment or a title.
  `scripts/headless/guide-truth.js` passes.
- **Keys:** `<id>_rw_seen` is new and **synced** (`_snapshot()` does not skip it; `mergeStoredValue()` unions it); `<id>_earn_d<N>` gains
  `snap`, `moves` and `rm` (a moment was decided for this finish); `<id>_hlwin_d<N>` gains `rewards`. `program.html` still writes no
  `<id>_hab_*` key.
- **Boot-order lesson:** Home's first paint reaches `careerRowHTML()` before the script has evaluated its later `const` tables, so every
  lookup the first paint can reach is a function (`careerFourWord()`, `rwMetalWord()`, `hlBandWord()`), and the new top-level state is
  `var` with no initializer (`_momentQ`, `_rwOpened`).
- Checked by `scripts/headless/career.js` and the other suites (the training half, with a stub profile that follows spec §6): the off
  state is phase 2's, the row's lines (zero cells, far goal, aria-label, tap), the finish card's three lines and *+N more*, Counting
  bands then confirmed or withdrawn, the cap, Share on a reward band, a reload, a moment per fresh answer only (none from the copy), one per
  open, the catch-up, the Grand Slam's line, demo and preview silent, the Welcome blocking, the moment after Done, and a refused
  `mark_moments_told` not touching Done.

## 📅 This Week is built from the session history (HOME-01, 2026-09-26)

Home's week used to know only today: a Done pill lasted until midnight (the `<id>_completed_d<N>` stamp) and
every morning the suggestion went back to Day 1. Now `weekDoneDays()` counts a day as done this week when a
session of it is in `HIST` (`get_my_history()` or its phone copy) inside `weekWindow()`, or was finished on this
phone today. The window is the **cycle's own training week** (`cycleWeekInfo()`: seven days from `startDate +
(wk − 1) × 7`; a cycle's dates are calendar days read in whole days by `cycleDayNo()` / `todayDayNo()`, the same in every time zone and across a clock change; until 2026-10-11 an athlete west of Greenwich was told "Cycle complete" a day early, `scripts/headless/cycle-tz.js`), or Monday–Sunday for a cycle with no dates or one that is over. **Before the cycle starts**
(published a day or two early) the window is the cycle's first week, not Monday–Sunday: the old cycle's last
sessions share the day numbers 1–4, and a Day 4 trained on 6 Oct ticked the new cycle's Day 4 as done (Pooya,
2026-10-11; `scripts/headless/cycle-end.js` covers it). `paintWeek()` redraws the day cards (a day
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
from, a session → its Library pane at the same scroll, the archive → Progress; a Library pane is a tab root since 2026-10-13) or goes Home for a tab, then the day
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
*Skip for today*) is a 44 px target now (it was 15 px); since 2026-10-13 Close sits top right in the sheet's one sticky
row, beside ‹ Back (*The sheets and the notices*, above). From 560 px wide the sheet is a centred dialog with no
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
  **Since 2026-10-13 they belong to the app's ONE colour set** (see *Centre Court* → *Tokens*): small clay text is #B5461F
  in light mode everywhere (it was #C7552F outside the training day, 4.1:1), and clay text of 18.66 px bold or more reads
  `--clay-big`, which keeps #C7552F.
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

- **Clay stays on what asks the athlete to look**: the Coach's note (since Centre Court its quote mark and the
  dot after the name; *More* is green), a Because (the solid clay ⓘ), an RPE over its target (the set's RPE tag, the selected
  button, a circuit's Last time strip and the ghost line under a set that ran over), the tempo digit, a banner that asks
  for something (a day filed unfinished, a report waiting, the lower-day banner's stripe and label), a suggestion's kicker (LIB-01: *Sore today*, *Week done*),
  the finished card's quote mark (Amir's voice, as on the Coach's note), what is not done when finishing early (only the tags),
  the numbers in a week note's headline (Front Page, 2026-10-12: *RPE 7*, *One set fewer*), and the same numbers on
  the session bar's limits row (*Max RPE 7 · 1 set fewer*; only the numbers, light clay `#E06B43` on the green bar
  since Centre Court, the words white and the label a paler white),
  the one number on a dark Home card (*Week 2*, the habits row's *2 to go*), and the fault cue's bar in How to do it (the one fault, written
  fault-then-fix, CUE-7: Amir, 2026-10-12, Centre Court round 2: *"3 clay"*; it was red `#E74C3C`). The Library's clay Playbook door went with the doors page, and the article reader's heading bar, drop cap and bullets turned green (2026-10-13).
- **Green or grey for everything else**: every block's title, stripe and done tint are the same green (warm-up
  and power were clay and strength green, and a block the app did not recognise took its colour from its
  position, so *Core* was clay because it was third; `blockClass()` still names the type for the code); the
  rule under a block title is grey; the session bar (green since Centre Court), its clock and Pause; Guided; *Good afternoon*
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
  (Sign in, the welcome's Open Day 1, the error screen's buttons, Begin session, Start/Pause, Rest, the rest timer's Pause, Guided's Done,
  the filed day's OK, Done · send to coach, + Log a max, Log a max's Save to Personal Records, Weigh in) wears one look, set once at the end of the stylesheet:
  green (`--btn`, the same gradient as Centre Court's buttons since 2026-10-13; in dark mode it is lighter, so it stands off the
  dark paper at 3:1), white Barlow Condensed 700 in capitals, 1 px tracking, an 8 px corner, 44 px at the least. There were
  eleven (corners from 4 to 13 px, two fonts, tracking from 0.02 em to 1.5 px, weights 700 and 900, and Sign in
  and Open Day 1 in clay). Each rule keeps only its place and size: full-width actions at `--fs-body` (the
  welcome and Done at `--fs-lead`), compact ones in a card or the session bar smaller, where WK-02 and WK-03
  measured their widths (the slim bar's Pause keeps its 0.5 px tracking under 480 px). **A new primary action
  joins that list; a secondary one is outlined** (Guided, Reset).
- AA Proof's type (Outfit, its own sizes) goes with SEAM-01; its labels are 11 px at the least since #286.

## 🎾 Centre Court: the training day, re-skinned (2026-10-12)

Amir: *"lets go with E. exercise number inside the circle. but with P4, P5, P9, P50, P66."* E is the design
direction "Centre Court": the day reads like a calm programme on paper, and only one strong green thing is on
screen at a time (the cover before Start, the open lift's head mid-session, the finish band at the end). The
P-numbers are parts he picked from the other directions. All of it is ONE CSS block at the end of
`program.html`'s stylesheet (**CENTRE COURT**), scoped to the day view, Guided's moved card parts and Library
sessions (`:where(#day-view, .step-scroll, #ws-body)`); Home, Game Plan, Records, the About sheet and the
dashboard do not change.

- **Tokens: the app's ONE colour set** (since 2026-10-13; Amir, 2026-10-12: *"go ahead with the shared colours"*). Centre
  Court's paper and ink (`--paper`, `--sand`, `--row`, `--hair`, `--box`, `--ink`, `--grey`, …), the greens (`--hero`,
  `--foot`, `--bar`, `--tile`, `--tile-on-green`) and the clay rule were declared inside the day's scope until then; they are
  now the block **THE APP'S ONE COLOUR SET** at the top of the sheet, light on `body` and dark on `body[data-dark]` (never
  `:root`: a custom property holding `var()` resolves where it is declared, and dark mode is an attribute on `body`). The
  older names are aliases of it (`--grey-bg` → `--paper`, `--grey-card` → `--sand`, `--grey-mid` → `--box`, `--grey-text`
  → `--grey`, `--grey-dark` → `--ink`, `--white` → `--row`, `--yellow` → `--fill`, `--ice` → `--clay`, `--rpe-under` →
  `--steel`), so a new rule uses the new names and no screen keeps a copy. The clay rule: `--clay` is the brand fill
  (`#C7552F`, the note's dot, the fault cue's bar); small clay TEXT is `--clay-ink`, `#B5461F` in light (5.1:1; `#C7552F`
  is 4.1:1); clay text 18.66 px bold or more is `--clay-big`, `#C7552F` (the week note's headline numbers, Guided's
  off-plan number; the article's drop cap until 2026-10-13, green since); on the green it is `--clay-on-green`; in dark every clay TEXT is `#E06B43`. `--ink`
  and `--court` are defined at last (D7). The move was checked by a before/after diff of every element's computed colours on
  68 screens and states, light and dark: only small clay text outside the day, `--grey-card` fills (#EDE8E0 → #F1ECE3) and
  five dark greys moved. `--g` is the gutter: 20 px, 16 under 360. The panel is **full-bleed**: `.day-content` has no side padding (the rail's 32 px went with the rail).
- **The cover** (D's P4): the day's photo graded into the green, ← and the moon as 44 px glass buttons, the
  *● DAY 1* eyebrow (dot and words mint since round 2), the focus in 44 px capitals, and what the day builds as tiles with a › (each still opens its
  quality, `paintDayQualities()`; the first is white). About 270 px at 390. *N blocks · M movements* is hidden.
  `dayCardHTML()` draws Home's cards too, so the cover is CSS on `#day-view-card` only: its markup is unchanged.
  The focus keeps every word whole (no mid-word break) and is `clamp(32px, 11.3vw, 44px)`; its 900 face is also our own
  file under the name *AA Barlow Condensed* (`/assets/fonts/BarlowCondensed-900.woff2`, pre-cached in `sw.js`), so a phone
  offline or without Google Fonts still draws it condensed. The cover ends on ONE colour, `--hero-end` (its scrim's last
  row), and the bar before Start starts on it (its light sits at its bottom right, no border): no seam between them.
- **The session bar** (A's P5 before Start, P9 after it) and its progress line: *The session bar* below.
- **The first-session hint** (A's P66): *First-session hints* below.
- **Block titles**, quiet: 15 px condensed capitals in green with a hairline to the screen's edge and the block's
  rest at its end. A block whose only item has the block's name (*Dynamic Mobility* over *Dynamic Mobility*) and no
  written rest hides its title: `sameNameBlock()` adds `.same-name` in both block-header templates (the day and a
  Library session); the header node stays.
- **Scroll margins**: `foldWhenDone()` lands the next card under the slim bar with the row it just folded showing
  whole above it: 110 px, 142 with the week's limits row (156 under 360, where that row can wrap), plus 44 in the demo.
  That is the bar, 16 px for Chrome's smooth scroll stopping short of an instant one, and 38 px so the 54 px done row is
  never a cut-off sliver under the bar.
- **The cards** (section 7 of the block, Centre Court 2/3). No card is a box any more: a row on the paper, a
  hairline from the name column between rows, no white, no shadow, no stripe, no press scale.
  - **Closed: the number is the tick** (round 2, P24; Amir: *"i want to use p24 to number the exercises, so if the exercise
    is done, the number would turn green meaning its done"*). The left column holds the exercise's number as a big
    OUTLINED numeral, zero-padded (*01*, *06*, *10*: `renderExercise()` and `renderCircuit()` write
    `String(num).padStart(2, '0')`; nothing reads `.ex-num`'s text): Barlow Condensed 900, 32 px, no fill, a 1.5 px
    `--green-ink` stroke (mint in dark). `.ex-num` stays in `.item-name-row` in the DOM: that row is a baseline flex, so the
    numeral sits on the name's first line (dropped 4 px so its middle meets the middle of the name's capitals), pulled into
    the 44 px column by a -56 px margin, with `pointer-events: none`. Under it `.check-box` draws nothing any more (the ring
    and its white ✓ are gone): it is the invisible tap target, the whole height of the row's left column, and a tap ticks
    everything as before (`onCheckBoxTap()`; a first-timer's tap on a lift still opens it). It keeps its focus outline.
    Then the name (18 px), the line of numbers (15 px, the dose bold, the tempo's hot digits clay), the intent pill.
  - **A row shows that it opens and closes** (round 2; Amir: *"how can we show in a way that these exercises are clickable?
    and then can be clicked back to make it small?"*): a drawn chevron (CSS mask, 18 px, `--chev-down`) in the right column
    on the NAME line, grey ⌄ on a closed row. The ⓘ moves under it to the numbers line, its centre 28 px below the
    chevron's (a plain ⓘ is a 22 px grey ring, a Because the 28 px clay disc, both 44 px to hit); a row with no ⓘ has just
    the chevron. The chevron is `.item-main::after`, not a button: the whole row is the tap (`onExerciseRowTap()`), and it
    lets taps through to the ⓘ. Open, it turns up: a white ⌃ top right of the green head (on a lift's eyebrow line, the ⓘ
    on the name line under it; on a circuit's or a Library exercise's name line), a grey ⌃ on a warm-up's paper. A done
    row shows no chevron and keeps its ⓘ centred (a tap still opens it). The closed line of numbers no longer runs under
    the ⓘ (the old -40 px). `smoke.js` measures every closed row at 390, 390 dark and 320.
  - **Done**: a receipt. The numeral turns SOLID green (its fill takes the stroke's colour), the name 15 px grey, what was
    done on one 13 px grey line, *4 · 4 · 4 · 4 · RPE 7 7 7 7* (a move with no weight drops the leading *×*).
  - **A warm-up is known by its title, `.is-prep`.** Both block templates (the day and a Library session) add `is-prep`
    when `isPrepBlockTitle()` says so, and every warm-up rule in the block keys on it. `block-warmup` is only
    `blockCategory()`'s colour class, and its index fallback hands it to any unknown title (*Core* at index 6), so it
    must never decide the look: a Core lift would lose its head and its Rest.
  - **Open, the head** (a lift, and a circuit that logs; a warm-up stays on paper): the cover's green, *● 06* as its
    eyebrow (mint, no stroke), the name in 28 px capitals, a hairline, then the **scoreboard**: one grid of four equal tracks, each a value
    over its caption (*4 × 6* SETS×REPS, *7* RPE, *3-1-1* TEMPO, *2:30* REST), then the pill. The captions are in the
    markup: `renderNumLine()` writes the dose's as `.nl-lab.nl-cap` (so `numLineText()` leaves it out) and RPE's word as
    `.nl-k`; a circuit's *×2* and *Rounds* are split the same way. The text of the line is unchanged. A caption keeps 12 px
    clear of the next cell. **An open lift has no tick-all numeral** when it has its own set circles (`:has(.ex-set-log
    .ex-set-row)`): its number is the eyebrow. A working circuit keeps its numeral on the left of the head, its one *done*
    (outlined in mint on the green, solid mint once done, no eyebrow), and so does an open Library exercise (no set table).
  - **Open, the body** on the paper: the Coach's Note as a pull quote (the clay quote mark on the ring column, 16 px,
    **3 lines**, then *More* with a drawn chevron: `fitNotes()` still decides), **How to do it** as one white rounded row
    (the About sheet's Your history recipe: a green ▶ only with a video, else a list glyph; *HOW TO DO IT* over the count
    on its own line; *More* is 44 px tall itself; its text stays *How to do it · video · 5 steps · 4 cues*: `paintHowTo()` puts the leading dot in
    `.ex-how-lead`, which CSS hides), the *First time* line with no box, then the set table.
  - **The set table**: white boxes edged `--field`, the set numbers grey and the live set the one green number (a
    disc), LAST inside an empty kg box, a done set 700 with no box, the RPE tag in its own column 40+ px clear of the
    tick, **How hard?** a sand band that hangs off its set with 48 px keys, and the ghost line in that row's RPE slot,
    *LAST 5 @ 9* (`paintLastTime()` writes `last 5 @ <b>9</b>`: the weight is in the box already). Columns are tokens on
    `.ex-set-log` (`--c-set`, `--c-tag`, `--c-tick`, `--c-gap`), narrower under 360 so the boxes hold *102.5*.
  - **The foot row** (A's P50): **Note** on the left (a 32 px outlined circle with its chevron, then *NOTE*) and **Rest ⏱
    2:30** on the right, the primary button with its time, the stopwatch drawn in mint (the button's text keeps the ⏱
    glyph in `.rest-ic`; the time is `.rest-t`). One row, not sticky. Both keep their nodes: `.ex-log` and the open
    card's body are `display: contents` / a grid, and the Note and `.ex-rest-bottom` share its last row; an open Note's box
    runs full width under them. A warm-up ends the same way with an outlined Rest.
  - **Circuits**: a warm-up stays on paper with plain letters, *5 / side* doses (`itemDose()` writes the card's
    spacing), a ▶ disc only with a video and the chevron for its steps and cues. A working circuit has the green head, its
    *Last time* line right under it (round 2, E's **t**: `renderCircuit()` gives a working circuit's body an `.lt-slot` as its
    first child, so `paintLastTime()` places the strip there, not before the rounds' RPE rows), its items as letter · name
    and dose · kg box, its cues open, the small *How to do it* line, and one How hard? row per round (the words take their
    own line under 375 px). **An item's ▶ is in its How to do it line** (round 2, E's **s**): no disc beside the kg box;
    the line reads *▶ HOW TO DO IT · video · 4 steps* (`.round-how-play` drawn in CSS, `.round-how-v`) and shows even with no
    steps yet (`.has-vid`, the URL in `data-vid`); its tap opens the card's player, Open in YouTube bar and all, above the
    steps (`toggleRoundSteps()` builds it on the first open, `.round-how-vid`, so a closed row holds no player). A warm-up
    item keeps its ▶ disc and the pop-up.
  - **Guided** borrows the same body (`.step-scroll`, gutter 16): its pinned set keeps its tint across the full width.
    Guided's own layout (the pinned current row, the rest screen, its header and footer) is unchanged: *Guided Mode's
    layout* below still holds.
- **The finish** (sections 8 and 9 of the block, Centre Court 3/3). The same three states `refreshConfirmCard()` always
  set (`partial`, `ready`, `early`); only their look changed. *One finish* below has the behaviour.
  - **In progress**: one quiet line under a hairline, *IN PROGRESS* over *6 of 26 sets*, and **Finish early** on the
    right, outlined grey (it ends the session; two taps, clay while armed). No bar: the slim bar's line is the progress.
  - **Ready**: the green moves here. A full-width band, *● 26 OF 26 SETS* in mint over *ALL DONE WITH DAY 1* in 44 px
    capitals; then, when lifts with an RPE written have a ticked set with none, one clay line on the paper, *No RPE on 2 lifts.
    Add them ›* (`.confirm-norpe`, `noRpeCards()`, `openNoRpe()` opens the first with its How hard? strip; Line Call, 2026-10-13,
    Second Serve D3: the ring on each closed card logs a whole day with no RPE, `scripts/headless/no-rpe.js`); then on the paper
    *How hard was this session?* as a 22 px green heading and two rows of five 52 px keys,
    *Notes for Coach* and its box, and **Done · send to coach ✓** full width, 56 px, then the WhatsApp row UNDER Done
    (`.finish-wa`, since 2026-10-13: it sat between the note and Done and competed with it; the Your history recipe: icon, a
    mono label over the line, a grey ›; `sessionWaUrl()` reads the note from the finish card too now, so a note typed before
    Done comes along, which it did not). Finishing early
    uses the same band (*FINISHING DAY 1 EARLY*) and lists what is not done on the green, each tag in light clay; **Keep
    going** sits under Done. **It asks why** (Line Call, 2026-10-13; Amir's decision 4): under *Not done*, *What stopped you?
    Optional* and four paper chips, **Out of time · Pain · Too tired · No kit** (`EARLY_WHY`, one tap, a second clears it,
    the green when chosen), saved as `<id>_whyearly_d<N>` (a per-day key: the sweep, a reset and `staleCloudPlan()` treat it
    like the note). The report's status line carries it, *Partial (8 of 19 sets/units done) · Pain* (`buildSessionData()`;
    coach.html shows *Partial · pain*, `partialLabel()`). **Pain** brings a *Tell me about it* WhatsApp row up under the
    question and hides the one at the foot; its message starts *I stopped early (pain).* (`sessionWaUrl()`).
    `scripts/headless/early-why.js` (12 checks).
  - **Finished**: the card is signed the way the About sheet signs its reason. A grid whose `::before` paints the green
    band, *DAY 1 DONE* first (as E draws it: the finish picture, `.complete-art`, is filled but not shown in the day view), the message with the clay
    quote mark, and Amir's signature and photo (`.complete-by`: `WN_SIG` and `.wn-av`, added to the template after
    `.complete-sub`, and, once Career Mode's XP switch is on, what the session earned at the left of the signature,
    `.complete-earn`: *Career on Home, and what a session earns*). The tick medallion is gone (the words say it). On the paper under the band: the send status (the
    card's one ✓), AA Proof as a row with an open-out glyph and its label *OPEN AA PROOF* over *Counts as your Session
    habit* (the template's `<b>` lost its "· "), its own WhatsApp row (`.complete-wa`, never folded), the day-after
    suggestion, then **Your rating** (since 2026-10-13): one door row, `.rate-fold`, *7 of 10 · No note* or *7 of 10 · Note:
    "…"* (40 characters), that folds the rating keys and the note box (`moveRatePanel()` still moves them into
    `#rate-slot-N`; `setRateFold()`, `paintRateFold()`; closed after Done, on a reload and after a reset), then **Send the
    update** (primary, only when changed, OUTSIDE the fold) and **Reset session** (outlined grey, 44 px). Rows are placed by
    class with grid rows, so the DOM order is unchanged. `scripts/headless/day-finish.js` (104 checks) covers all three.
- **The lower-day banner** (section 10): a white row under the bar, full width, with a 4 px stripe in the colour that asks
  (clay for a lower or short day, steel blue for a sore one, none while training as written), its label in that colour,
  the sentence in ink and **Train as written** as the one text link (green condensed capitals and the chevron). Its words
  are unchanged. The cards' pills (*RPE 7 → 6 today*, *2 of 4 sets today*) are section 7's clay pills.
- **Library sessions** (`#ws-body`) get every card rule above through the same `renderExercise()`; a block title's
  hairline runs to the screen's edge like the rows'. Their own top and Done (`#ws-finish`) are unchanged.
- **Dark mode** is the same page: the tokens flip (paper `#181818`, rows `#242424`, green text mint, clay text `#E06B43`),
  the greens stay brand, and a made tick, the live set's disc and a selected rating key lift to `#1B7254` (`--mark`) so
  they still read on the charcoal. Old `body[data-dark]` rules that hard-code colours on these parts are matched at their
  weight by `body[data-dark] :where(…)` rules in the block.
- **320 px**: the gutter is 16; the set table's columns narrow; the slim bar never drops a word; the finish's tap rows
  close their gap to 16. Measured on every state: no sideways scroll, no text under 11 px, every control 44 px to hit (the TEMPO caption reaches it through a ::after).
- **Taps and keys** (E's build notes n and o): an open card folds from its name row only. A thumb on the scoreboard
  (*4 × 6*, *2:30*) or the pill mid-set leaves it open (`onExerciseRowTap()`); a closed row still opens from anywhere.
  The tick-all target (`.check-box`, under the numeral) is `role="button"`, `tabindex="0"` with an `aria-label`, and Enter
  or Space ticks it like a tap (`onCheckBoxKey()`; a Library session wires its own listener, as it does for the tap).
- **A per-side move with no kg box says so in its reps box** (round 2, E's **p**): *4 / side*. `paintKgCol()` writes the
  placeholder (`cardReps()` or the range, plus *" / side"* when the box is hidden and `data-dose` ends in */ side*; with a kg
  box the column is too narrow, so it stays *4*). It is the placeholder only: a tick records the plan's reps
  (`setReps(s, plannedReps(ex))` in `buildSessionData()`, never this text), Guided's rest screen reads the number with
  `parseInt()` (`paintTimerLog()`, which also drops the words when it shows a range). `smoke.js` ticks such a set and checks
  the session records 4 and Guided reads 4.
- **Amir's answers on round 1's open calls** (2026-10-12, *"1 keep, 2 mint, 3 clay, 4 yes build them"*): (1) with ⋯ open,
  **Pause** stays on the second row beside Guided and Reset; (2) the cover's *● DAY 1* is mint, the words with the dot
  (`#day-view-card .cm-name`); (3) the fault cue's bar stays clay and is on the *Clay means look here* list; (4) E's p, s
  and t are built (above; u was already: `itemDose()` writes *5 / side*).
- **The old card CSS that Centre Court fully overrode is gone** (round 2): 118 pre-Centre-Court rules on the card shell, the
  set log, the Note row, the circuits and their `body[data-dark]` copies. Each was switched off in the browser, one at a time
  and then all together, in five day, Guided and Library states at 320, 390 and 600 px, light and dark, with transitions
  stopped: none changed a computed style (the element's, its `::before` / `::after`, its descendants' inherited ones). Full-page
  screenshots of the day view, Guided, a Library session, Home, Game Plan, Records and the About sheet matched before and after.
  Two that looked dead while a transition ran were kept (Guided's dimmed sets, a circuit's How to do it chevron turning). What is
  left above the block still sets something: a `:hover` or `:active`, a transition, or a state those runs never drew.

## ⏱️ The session bar and "In progress" (WK-03, 2026-09-26 and 2026-09-27)

**Before Start** the session bar (`.session-timer`) is the full bar, and since Centre Court (2026-10-12, A's P5) it is
the day's cover's foot, inside the green and in the flow (not sticky): the label and the 32 px white clock on one
line, **Start** (the lighter green, a light ring) and **Guided** (outlined white) under it, then a hairline and the
week's limits row. **Reset** joins that row when sets were logged without the clock. After Done it is the label
(*Session duration*) and the clock. The label is one line ("Ready when you are", "In progress", "Paused",
"Session duration"). A Home day card
started today and not finished (`dayInProgress()`) shows *In progress* on its banner and **Resume ▶** under
it (`.dc-live`); a day done this week is a small `.dc-row` (HOME-02). `paintWeek()` redraws them whenever
the day view closes (`paintDayCardPills()` is no longer called).

**From Start until Done it is the slim bar** (Amir, 2026-09-27, option C of the mockup at
https://claude.ai/artifact/CiUjm5sF3cz4YhGzJCR1WY). `renderTimer()` sets `.slim` when the day's clock has
started, is not finished and is inside the 6 h grace. Since Centre Court (A's P9) it is a green strip, 56 px, sticky
at the top (under the demo banner in the demo): **← Home** · the white clock, centred between ← Home and Pause ·
**Pause** (or Resume) outlined white with the mint pause mark · **⋯**, and a **3 px mint line along the strip's foot** (53 px down, above the limits row)
that fills as sets are done. That line replaced the grey rail at the screen's right edge (`#v-progress`, hidden;
`updateProgress()` writes the same width to `#v-fill` and to the bar's `.stb-prog`, which carries the progressbar
role). The label goes (the clock and Pause / Resume say it). In a week whose note sets a limit the bar
also has a last row on a darker green, the week's limits (`weekLimitsHTML()`, *Week notes* above): 87 px then. **⋯** (`toggleBarMore()`) opens
Pause, Guided and Reset on a row under the first line (the limits row stays last), and since 2026-10-13 **Finish early**
(`.session-timer-finish`, `paintFinishBtn()`: shown once a set is logged while the day is neither ready nor finishing early;
two taps; `finishEarlyFromBar()` runs the same `finishEarlyStep()` as the finish card's button, folds ⋯ and lands the
finish card under the bar). With Finish early the row is a fixed 2 × 2 grid (Pause, Guided / Reset, Finish early): four
never fit one row at 390 px, and an armed label must not move its neighbours between the two taps. `foldBarMore()` folds it (and resets `aria-expanded`) when Guided opens,
the day closes or the bar stops being slim. **The tab bar hides** while a slim day is open (`body.session-on`,
`paintSessionChrome()`, called from `renderTimer()`, `switchDay()` and `closeDayView()`): ← Home or the
phone's Back closes the day, the clock keeps running and Home shows In progress · Resume. On an iPhone SE the
two bars covered 26% of the screen mid-session; now 9% (about 12% in a week with the limits row).

- **It never cuts the clock, and since Centre Court it never drops a word.** ▶ and the pause mark are drawn in CSS
  in mint on every button (`data-sym`; the glyphs render as colour emoji or a square on some phones), and the word
  stays text. At 320 px ← HOME, the 22 px clock, PAUSE and ⋯ fit with room to spare; past an hour (`.long`, seven
  characters, set by `renderTimer()` and the 1 s tick) the clock steps to 18 px under 360 px so every word stays.
  Measured before Start, running and with ⋯ open at 320 and 390 px, light and dark: nothing overlaps, every
  button is 44 px (52 before Start), no sideways scroll. (Before Centre Court the narrow bar dropped "Home" and
  showed Pause as its symbol alone.)
- A control added to the session bar goes on the slim line or under ⋯, and is measured the same way.

## ⏲️ The rest timer keeps time in a pocket (WK-02, 2026-09-27)

**Its look since 2026-10-13: a green band with ✕ and a sound icon, the log on the paper below in Guided** (*Every other screen in the
Centre Court look*, above). The timing below is unchanged.

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
- **The rest offer is gone** (Amir, 2026-10-11: "remove the rest pill, I don't like it"). Ticking a set no longer brings up a
  **Rest 2:00** button above the tab bar (`offerRest()`, WK-02, 2026-09-27; it never started by itself). Nothing replaced it: the
  card's own **Rest ⏱** button (44 px) opens the Rest Timer, and Guided rests itself after every set. The guide's *Built-in tools* card says so.
- The overlay's dark palette came with A11Y-01 (#245). It is solid since 2026-09-27 (POL-01): at 97% the day's
  cards showed through behind the clock.

## 🏓 Off the Glass: a game for the rest (2026-10-17)

Amir: *"can you create a game like this for my app? the aim is to use it during rest time for my athletes"* (after Matt Cannon's air
hockey pen, *"improve it in any way you think is good"*). Air hockey on a padel court seen from above: your racket at the bottom,
Amir's (clay) at the top, a point is the ball through the gap in the other end's glass. `assets/js/rally.js` (`window.Rally`) draws
and runs it; program.html owns the door and the layer.

- **The door is shared with Split Step and Between Sets** (2026-10-18). The rest band's last line reads **Play while you rest** (`#timerPlayBtn`,
  `toggleRestGames()`, in the list's rest and Guided's) and opens a small shelf inline in the green band (`#timerGames`), one row
  per game, the game played last on this phone first (`rest_game_last`, this phone only, never synced; Split Step first when there is
  no history). **Off the Glass's row** (`openRestGame('rally')`, `openRally()` kept) loads `rally.js` on the first tap (`restGameLib()`;
  sw.js keeps it in SHELL, so it plays with no signal and a change to it ships with a CACHE bump), opens the audio context in that tap
  (`restAudioPrime()`; iPhone needs it) and starts a paused rest. The shelf folds when a new rest starts (`foldRestGames()`).
  **Loading is first-come by tap, not by arrival** (`_restGameWant`): the last row tapped wins, so a slow load of the game tapped first never
  takes the screen, and a load that finishes after its rest ended (`closeTimer()` / `showTimer()` clear the token) or during the 1.2 s GO!
  opens nothing. A script that loads but defines no global (a gym wifi's login page) is a failure and the next tap tries the network again.
  `closeTimer()` hides the timer before it closes a game, so the game's `onClose` does not pull focus to the door as the rest ends.
- **The rest is the boss.** The court shows the rest clock the whole time (`left()` = `timerLeft()`), clay and pulsing in the last
  10 s, a tick and a buzz at 3, 2, 1. `timerDone()` calls `Rally.timeUp()` (the court freezes, *Time. Next set.*) and `closeTimer()`
  closes the game with the timer. ✕ and Back (`#rallyOverlay` is in `topLayer()` above the timer and in `initBackNav()`'s observer)
  return to the timer, still running. It never runs past a rest, and Serve Clock hands the screen back 25 s early (below).
- **Short and fair, and Amir plays like a person (The Read, 2026-10-18; idea #38 of the Rest in Play round, *"go with your picks"*).**
  First to 5. The first Amir chased the ball's current spot at a speed that rose to 1.45x while the athlete led and fell to 0.65x while
  they trailed, which players saw and resented, and a bot that only followed the ball beat him 58 points to 0. Now (`amirMove()`):
  his top speed is **one fixed number** (`AMIR.speed`, nothing reads the score); he **sees the ball `react` seconds late** (a short
  ring buffer of the ball's last 0.6 s, `S.hist`, with a part of that delay made up by knowing which way it was going, `AMIR.lead`), so a
  hit or a bounce off the glass is news to him a moment late; a ball **coming at his end**: he works out where it will cross his line
  (off the side glass too), **misjudges it a little** (`AMIR.read`, drawn once per shot) and walks there; a ball in his half that is
  slow or leaving: he **strikes it toward the biggest hole beside your racket** in your gap, as he last saw it (`holeX()`), from an
  aim point that **lands a little off** (`AMIR.aim`, drawn once per strike, never every frame); and **now and then a point starts with a
  mistimed read** (`AMIR.late`, `lateBy` s more). While your half has the ball he waits at `AMIR.home`, and steps up to `AMIR.guard` to meet a shot.
  **His form** (`S.form`, 0 to 1, `AMIR.start` 0.5 at the start of a match) sets the reaction (0.24 s at 0 to 0.12 s at 1), the aim and
  read errors and the chance of a mistimed read, and **moves one step (`AMIR.step`) only in `point()`**: sharper after you score, softer
  after he does. Nothing changes mid-rally and **nothing about form is shown**. Held at 0 an average player wins about 64% of the
  points, held at 1 about 51%.
- **Your racket has a top speed too** (`YOU_SPEED`, 6 court widths a second): a normal drag still feels instant, but a tap on the far
  side is a sprint, not a jump across the court in one frame.
- **The numbers are set against bots with a person's limits** (`scripts/test_rally_sim.js`, pre-commit guard 22; `CODEBASE.md` → *Off the
  Glass's opponent*): a sharp bot (sees the ball 0.10 s late, thumb 4 court widths a second) wins about 70% of the points, an average one
  (0.20 s, 2.5) about 57%, which is about two matches in three at first to 5, a tired one (0.30 s, 1.5) about 51%, and a bot with no delay and
  no speed limit (that still misreads three points in ten, as he does) about 86%. A change to the `AMIR` block runs it; it prints the table, with
  the *ace* (a sharp bot that never misreads and shoots at the edges) as an extra row it does not assert on: it wins about 98%, the ceiling of his
  rubber band. Known: his look-ahead keeps the old `vx` when it folds off the side glass (comment in `rally.js`; fixing it needs a retune).
- **A ball that goes nowhere for 3 s is served to the other half**, whether it died or is trapped and shaking between the rackets at
  the net or against the glass (2026-10-18: a bot found a trapped ball that buzzed every frame and ran the rally into the thousands).
  A jammed ball counts no hit and makes no sound; otherwise a hit counts 0.12 s after the last and rings 0.09 s apart per racket.
- **One thumb:** drag anywhere in your half; a touch puts the racket 1.4 rackets above the finger so the thumb never hides it. A hit
  buzzes; the sounds follow the timer's speaker (`rest_sound`); reduced motion drops the shake.
- **Its numbers stay on the phone:** `rally_stats` (`best` rally, `wins`, `played`), no athlete prefix, never synced, never scored,
  never seen by the coach. No yellow: the ball is white, the court the brand green, Amir's racket clay.
- The guide's *Built-in tools* card names the door (CNT-01). Tests: `node scripts/headless/rally.js` (26 checks; in *Amir alone* your racket is
  parked in the corner, since 2026-10-18: nobody defends, and he finishes the point) and `node scripts/test_rally_sim.js` (no browser, about 4 s).

### Serve Clock: the rest hands back to the set (2026-10-18)

Idea #39 of the round-4 page (https://claude.ai/artifact/1qn7D8shTUmKrYDHo9UT9W), built on Amir's *"Go with your picks on all nine decisions, and
build The Read and Serve Clock first"*. The last 20 to 30 s of a rest are when getting ready for the next set helps (Hammoudi-Nassib 2014; Tod 2005;
Cusimano 2026), and every rest game used to play to 0:00. Live data: median written rest 60 s, 83% of rests 90 s or less. So with 25 s left the rest
takes the screen back from the games and says what is next.

- **The numbers are one block** beside the timer in program.html: `SERVE_CLOCK = { at: 25, atLong: 30, longFrom: 100, noDoorUnder: 45, doorGone: 10 }`.
  Coaching judgment, not measurements. The hand-back point is `at`, or `atLong` when the WRITTEN rest is `longFrom` s or more. The written rest is
  `timerWritten`, set in `showTimer()`; +15s raises `timerDuration`, never it.
- **The hand-back, once per rest** (`serveHandBack()`, a latch `serveHandedBack`). `timerTick()` calls it when the running rest reaches the point
  (so does the catch-up tick when the page comes back to the front). It folds the shelf, takes the door away, drops a game still loading for a tap
  (`_restGameWant`), asks every open game (a game with `handBack(done)` is closed when it calls `done()`, any other is closed at once) and paints the
  get-set line. A rest written at or under the point is handed back from the start: the line shows at once and the door is never offered. The
  latch clears in `showTimer()` and in `resetTimer()` (Reset restarts the rest, so the door comes back and the point comes round again);
  **+15s never un-latches it**, and `openRestGame()` refuses once it is set. `timerDone()` and the GO! close are untouched: the `timeUp()` loop
  over the open games is still the safety net (a rest that ends in the middle of a hand-back closes everything).
- **The door** (`restDoorOn()` / `syncRestDoor()`, every tick) is hidden when the written rest is under 45 s, when the rest belongs to a circuit
  round (`data-circuit="1"` on a circuit's Rest button; Guided's `item.circuit`), when it belongs to a flagged retest lift in its window
  (`data-test="1"`, stamped by `restTestAttr(ex)` in `renderExercise()` from `exTestSpec()` and read with `inRetestWindow()` at the tap; a test set is
  the one hard set of the week), once the rest is handed back, and once `timerLeft() <= hb + doorGone` (nobody opens a game with 35 s left).
  Until the hand-back it follows the clock, so +15s can bring it back. **Unknown fails open**: the rest's context is `timerCtx = { card, circuit,
  test }`, passed from `openTimer(e)` through `openRest(secs, name, ctx)` and `showTimer()`, and from `stepAfterDone()` for Guided; a rest opened with no
  card (a script calling `openRest(120, name)`) shows the door as it always did.
- **The get-set line** (`paintGetSet()`). The list has no paper, so the band shows a small block where the door was (`#timerGetSet`): the eyebrow
  *Get set*, *Next: <exercise> · set N of M* (`restNextOfCard()`: the Rest button's own card and its first unticked set from `loadSetLog()`, else the
  next unticked exercise in the day and its first unticked set; a circuit is named with no count because the list does not track its rounds; when
  nothing follows there is no block) and the cue. **It keeps the day's own rules** (review fixes, 2026-10-18): a card the check-in struck out
  (`rd-skip`) is passed over, a halved exercise (`data-rd-sets`) counts only the sets asked today (*set 2 of 2*), a Library session (a card outside
  `#day-view`) names nothing because it keeps no set log, and since Rest means a set is over, a card with none ticked yet is named alone, with no
  count (an athlete who ticks late or all at the end would otherwise read "set 1"), and a one-set card in that state is taken as done. Guided keeps its Next line (`paintTimerNext()`, `STEP.seq[STEP.pos + 1]`) and gets the cue under it
  (`#timerCue`, on the paper). The cue sits behind the 3 px clay bar that means look here (the Coach's words), 15 px (`--fs-body`), white on the band,
  ink on the paper. On a 568 px phone the list's ring shrinks to 140 px so the block fits (`.has-getset`); Guided's cue can sit below the first
  screen there and the overlay scrolls (it never squashes, and nothing scrolls by itself: the clock must stay in view).
- **`cueForRest(name, exId, setNo)`** is the one function that picks the line (The Corner, idea #20, will share it): the Spine entry through
  `spineFor()` (approved entries only: the phone is served nothing else, and a card that names an entry that is not there gets none), rotated by the
  next set's number through `[cues.good[0], cues.good[1], cues.bad[0]]`, missing ones skipped, so eighteen rests do not repeat one line. `''` when
  the entry has none (the Next line shows alone). A circuit gets no cue.
- **`Rally.handBack(done)`** (assets/js/rally.js): no game, `done()` at once; otherwise the held mint banner *Last point.*, Play again hidden, and
  a point in play is let finish (`lastPointIn()`: nothing is served after it, the point's own banner shows 0.8 s, then `done()`); with no point in
  play (the serve pause, a ball that died, a finished match) `done()` after 0.6 s; never later than 6 s. After it the court is `over` (no serve, no
  auto-serve, no Play again) and the best rally is kept as `timeUp()` keeps it. It does not touch `amirMove()`, `youMove()` or `step()`.
- **Every game gets `handBackAt: serveHb`** in `open()`, and every game has its own `handBack(done)`. Split Step uses `handBackAt` to start no round it
  would cut and stops at once; Off the Glass finishes its point (above); Between Sets finishes a point in play for up to 6 s, parks on *Time to lift* and
  calls `done()` about a second later (a76016d). Off the Glass and Between Sets ignore the option.
- The guide's *Built-in tools* card says it in one sentence (CNT-01). No new data is stored.
- Test: `node scripts/headless/serve-clock.js` (92 checks: the hand-back by the clock at 60, 100 and 150 s, the door rules, the line and the cue in
  the list and in Guided, a struck-out card, a halved exercise, a one-set card and a Library session, focus after a game closes itself, the latch, +15s, Reset, the catch-up, `Rally.handBack` on a live, dead, endless and winning ball, 320 x 568 and 375 x 667
  light and dark). The other games' suites switch the hand-back off (`SERVE_CLOCK.at = 0; SERVE_CLOCK.atLong = 0`) in the one check that is the rest
  running out on an open game (`rally.js`, `splitstep.js`, `between-sets.js`).

## 🎾 Split Step: a reaction game for the rest (2026-10-18)

Amir, 2026-10-17: *"can you create a game like this for my app? https://play.harmansharma.in/reaction ... i want my tennis and padel
players to use this during their rest time"*. 2026-10-18: *"Go with your picks: Split Step, one door with a shelf for both games,
scores stay on the phone."* The prototype: https://claude.ai/artifact/DFZd4XE2MgVtQhPpkSeCGL. `assets/js/splitstep.js`
(`window.SplitStep`, the same API shape as Rally) draws and runs it; program.html owns the layer (`#splitOverlay`, beside
`#rallyOverlay`), `REST_GAMES`, `openRestGame()` and the two hooks. It sits behind the same door as Off the Glass (see above).

- **Four drills, each a tennis question:** *First Step* (tap the moment Amir hits), *Fore or Back* (tap the side the ball goes to),
  *In or Out* (tap only what lands in; **on the line is in**, so a leave counts as much as a tap) and *Sweet Spot* (tap as the ball
  reaches your racket; after the bounce it slows by a different amount each time, so the timing cannot be learned).
- **The rest is the boss.** The rest clock is on the court the whole time. A round starts only when `left()` is at least its drill's
  need (First Step 19 s, Fore or Back 23, In or Out 24, Sweet Spot 17: the 99th percentile of a clean round plus 1 s). `timerDone()`
  calls `SplitStep.timeUp()`, `closeTimer()` closes it, and ✕ and Back return to the running timer (`#splitOverlay` is in
  `topLayer()` and `initBackNav()`'s observer). It never runs past a rest.
- **It hands the screen back before the Serve Clock takes it** (2026-10-18). With 25 s of rest left (30 s on rests of 100 s or more) the rest
  timer takes the screen from any rest game: a game with `handBack(done)` is told and closes in `done()`, one without is closed at once.
  The host opens Split Step with `handBackAt` (that 25 or 30, a number or a function). `canGo()` then starts a round only when
  `left() - handBackAt` is at least the drill's need, so no round is cut. The clock pill still shows the real rest; its warning and the
  3-2-1 count down to the hand-back. `SplitStep.handBack(done)` stops at once like `timeUp()` (the round dropped and never saved, *Time.
  Next set.*), then calls `done()` on the next tick; a second call, or one while the game is closed, only calls `done`.
- **Fair starts:** the wait before each hit is a floor plus an exponential tail, so "now" can never be guessed. A tap before the hit,
  or too soon after it to be a real reaction (`GUESS` per drill), is a foot fault and the ball is replayed.
- **Seen, not heard:** the cue is movement, never a colour change alone, and sound comes only after a tap, so a phone on silent scores
  the same. The 3-2-1 stays quiet during a wait or a live ball.
- **Scoring:** a round's number is the median, so one missed tap does not ruin it. A best needs every ball right and no foot faults.
- **Its numbers stay on the phone:** `splitstep_stats` (bests and the last rounds per drill), no athlete prefix, never synced, no XP,
  no leaderboard, never seen by the coach. Phones differ in touch delay, so nobody is ranked against anyone.
- No yellow: the ball is white, the court the brand green, Amir's racket clay. **Never call it reaction training** in copy; it is a
  game for the rest. The guide's *Built-in tools* card names the door and the games on the shelf (CNT-01).
- Test: `node scripts/headless/splitstep.js`.

## 🎾 Between Sets: a tennis game for the rest (2026-10-18)

Amir asked for a better version of a tennis game he saw on a player's website: *"the aim is to add this game to my app, to use on their
phone while resting and sitting in the gym"*. He chose all the games behind the shelf, the name **Between Sets**, and the coach lines as
drafted. `assets/js/between-sets.js` (`window.BetweenSets`, the same API shape as Rally and SplitStep) draws and runs it; program.html owns
the layer (`#setsOverlay`, beside `#splitOverlay`), the shelf row (`data-game="sets"`, `openRestGame('sets')`; `openBetweenSets()` /
`closeBetweenSets()`) and passes the athlete's first name (`name`) for the scoreboard. It is the third game behind the same door.

- **What it is:** a court in real ITF dimensions drawn in perspective, clay, grass or hard, YOU vs AMIR. A Fast4 set, first to 4 games,
  a no-ad deciding point, and a tiebreak to 5 at 3-3. **Saved after every point**, so one set lasts a whole workout and Continue picks it
  up on the next rest. Also a rally drill. At the end a match report with coach-style movement numbers.
- **One thumb:** drag anywhere to run; the swing is automatic and getting there early makes a better shot; tap as the ring closes for a
  power shot; tap to toss, then tap again at the top to serve. Clay keeps ball marks, and a close call shows a mark check.
- **The rest is the boss.** `left()` is shown in the game's rest pill, `timeUp()` freezes play and shows *Time to lift*, and
  `closeTimer()` closes the game with the timer. ✕ and Back return to the running timer (`#setsOverlay` is in `topLayer()` and
  `initBackNav()`'s observer).
- **Serve Clock hands back gracefully:** when the app hands the rest back to the set (`handBack(done)`), a point in play may finish (up to 6 s;
  the score saves at the end of every point), a rally drill keeps its best, then the game freezes on *Time to lift* and calls `done()` once.
- **Sound** follows `rest_sound` on the timer's AudioContext (`audio()`), with no sound button of its own.
- **Its numbers stay on the phone:** stats and the saved match are `courtduel.*` keys in localStorage, never synced, never scored, never
  seen by the coach.
- **The coach lines** are `CD.LINES` in the file; a change ships with a CACHE bump (sw.js keeps it in SHELL).
- Test: `node scripts/headless/between-sets.js`.

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
  name's text is unchanged); open, the note is cut to three lines with **More** (its chevron drawn by CSS since
  Centre Court; `fitNotes()` measures it when the card opens: `toggleExpand()`, Guided's `renderStep()`).
- **The ⓘ sits at the right end** (`.ex-side`, `paintSpine()`): a 22 px grey ring, 44 to hit, and a Because is the 28 px clay disc (Centre Court).
- **No history on a closed card** (Amir: *"no history on the exercise card when not opened"*): the *Last*
  pill is gone.
- **The number sits in the tick-all ring** since Centre Court (CSS only; `.ex-num` is still the name's sibling), so a
  long name wraps on its own.

**Open**, in this order: the green head with the scoreboard (Centre Court), the note, **How to do it**, the sets, then
Note and Rest on one row. There is no *Log Sets* label.
- **No Last time box** (Amir, 2026-10-12: *"the history ... should be removed from exercise cards. because their last
  time, is actually already in the reps, weight box"*). It was a box under the note (CARD-01, 2026-09-27: the last set,
  tapped open to every set and History ›). Now last time's weight is each empty kg box's LAST, a set that ran over its
  target keeps its faint ghost line, and the history is the ⓘ's **Your history** row, which opens the History sheet.
  `paintLastTime()` still draws a first meeting's **First time** line and a circuit's strip (always open: a circuit's kg
  boxes show nothing of last time). The phone's old `lt_open` setting is read by nothing.
- **How to do it** (`renderHowTo()`, a `<details class="ex-how">`; the steps since 2026-10-11): one folded row that
  holds, in this order, the video when there is one, **You need:**, the entry's numbered steps, then the cues (with
  steps above them the cues take back their *Coaching Cues* label). The row reads **How to do it** with a quiet count
  after it, *· video · 5 steps · 3 cues*, only the parts there (`paintHowTo()`, which also hides it while it holds
  nothing, since the Spine can arrive late). The green ▶ shows **only with a video**: it used to show on every row,
  so a card with no video read *▶ 3 cues* and promised one that was not there. It opens by itself the first time the
  athlete meets the exercise (`openHowFirstTime()`): a logged lift when it has **no history** (`paintLastTime()`),
  and since 2026-10-11 **a simple card too** (a warm-up ride, a stretch), which logs no sets and so never opened by
  itself (39 Stationary Bike cards): `openHowSimple()` opens it until any earlier session carries the exercise
  (`seenBefore()`; `buildSessionData()` records every exercise, sets or none, and the demo's history does the same).
  Nothing else about a simple card changes: no Last time, no set log. On a Library session it is always open; once
  tapped it stays as left. The closed card is the same height as before: everything here is inside the open part.
- **Open in YouTube** (Amir, 2026-10-05: *"C and red"*): under every player, one 44 px bar, a red YouTube mark and
  *Open in YouTube ↗*, attached to the video as one rounded unit (`renderVideoBlock()`: `.ex-vunit` holds `.ex-video` and
  `a.ex-yt`). Athletes in Iran can have the YouTube app or browser working while the embedded player in the app does not
  (a VPN that covers those and not the app's window), so the bar hands the clip to the phone: a plain
  `https://www.youtube.com/watch?v=` link from `ytWatchUrl()` (a Short keeps `/shorts/`), `target="_blank"`,
  `rel="noopener noreferrer"`, so the phone picks the YouTube app or the browser. It is a sibling of `.ex-video`, never
  inside it: the iframe fills that box (z-index 3) and would cover a bar there the moment the embed loads, which is when it
  fails. Only a YouTube address gets one. `renderVideoBlock()` draws every in-app player (the card's How to do it, the
  About sheet, Library → Exercises, Guided), so one function covers them; the pop-up a circuit item's ▶ opens has the same
  bar (`.video-modal-yt`, built in `shared.js`). **No mark on the circuit rows themselves**: beside the ▶ it pushed a
  superset's row 6 px past its card at 390 px and 36 px at 360 px, and squeezed a warm-up's names to two or three lines.
  Guide cards that name it: *Logging your sets* (the card, and the warm-up line) and *Built-in tools* (*How to do it*, which was *Exercise videos* until 2026-10-11) in
  `APP_GUIDE`. Check: `scripts/headless/youtube.js`.

**Done**: a finished exercise's closed row is small and says what was done, *72.5 kg × 6 · 6 · 6 · 6 ·
RPE 7 7 7 8* (a bodyweight move *4 · 4 · 4 · 4 · RPE 7 7 7 7*) (`paintDoneLines()` from `updateProgress()`, one line with an ellipsis; `.is-done`). After
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

**Since 2026-10-13 its top bar is the slim bar's green with the card's ⓘ, and ‹ Prev is not drawn on step 1** (*Every other screen in
the Centre Court look*, above). The pinned row and the round-by-round circuits below are unchanged.

- **The current row is pinned** (CSS `position: sticky` on `.step-current` inside `.step-scroll`, whose
  `.ex-log` lets it out with `overflow: visible`): in place when it is on screen, held just above the footer
  (or under the top bar) otherwise, with a solid tint because it passes over the rows above. Sticky cannot
  lift a row above its own table, so `renderStep()` also scrolls just far enough when the whole table starts
  below the fold (a first-time lift, its video and cues open). Measured before: the row was under the
  footer on 4 of 14 steps at 375×667 and 8 of 14 at 320×568; after: on screen on every step at all three sizes.
- **Kg on the rest screen**, beside reps and RPE (`paintTimerLog()`, above).
- **The warm-up is a step** (Line Call, 2026-10-13, Second Serve G1; Amir: *"yes to all recommended"*). Guided
  used to leave out everything with nothing to log, so it ended on "Every set logged" and the finish card then
  said *In progress · 18 of 19 · Finish early*: a full session filed Partial. Now `buildStepSeq()` keeps every
  run of such items (the warm-up, a prep circuit, a cool-down) as ONE step in its place, `{ group: true, cards,
  name }` named by its block; `renderGroupStep()` lists them, a row ticks one (the card's own `toggleCheckOnly()`),
  **Done ✓** ticks the rest and moves on with no rest, **Skip** moves on and leaves them unticked (the report says
  so). Its eyebrow says where it sits (*Before exercise 1*, *After the last exercise*); exercises are still counted
  without it (*Exercise 1 of 6*). The end says *Everything logged.* only when the whole day is ticked, else names
  what was skipped. A day with no set or round to log still has no Guided.
- **Circuits join Guided, one step per round** (`buildStepSeq()`): a circuit that logs something (a superset,
  a complex, conditioning); a prep circuit logs nothing and is part of a warm-up step (above). A round has
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
  4 of 11 sets* and **Finish early** (its bar is hidden since Centre Court: the slim bar's line is the progress); *All done with Day N* once every set is done; and *Finishing
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
  **It follows the session's record too** (Line Call, 2026-10-13; Amir: *"yes to all recommended"*): it said
  *With your coach* when the EMAIL went, even with the record (`save_session`) still in the queue, the way 10
  sessions reached the inbox and not the dashboard before 2026-10-12. Now *Saved on your phone…* shows while
  either waits (`recordWaiting(day)`: the queue's own session key), *✓ With your coach* only once both have gone,
  or once the record has with no email waiting (as when the reports are switched off), and the line repaints the
  moment the queue sends the session (`_paintSent()`). **Done on a full phone** used to throw and do nothing:
  `finishDay()` now runs `finishDayNow()` in a try, and on a failure takes back its finish stamp, shows the card
  again and says *Your phone is full. Free some space, then tap Done again.* (any other failure: *That didn't
  save. Tap Done again.*). `scripts/headless/send-status.js` (7 checks, the full phone filled for real).
- **Guided's Finish session ✓** closes Guided on this card (`stepFinish()`); it never finishes for the athlete.
- **Reset in the session bar** (Amir, 2026-09-27: *"when you start, its locked in and you cant cancle or
  reset"*): `.session-timer-reset`, two taps (`armedTap()`, armed label *Reset?*), shown once the day has started
  (its clock inside the 6 h grace, or a logged set) and until it is finished (`paintResetBtn()`); the finished card
  keeps its own **Reset session**. Under 480 px the bar's three buttons tighten while Reset shows (`.has-reset` on
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
- **The look** (Centre Court, A's P66, 2026-10-12): a green tile with Amir's photo (the week note's `.wn-av`, so the
  hint is his voice), his words in white with the named controls bold, **GOT IT** in mint, and a notch pointing at
  what it explains: under Start's middle for `bar` (the hint sits under the green bar, on the paper), at the set's
  circle for `set`, at the 6 to 10 keys for `rpe`. Move the circle or the keys and re-aim the notch in the Centre
  Court block.

## 🔥 Warm-ups are a list, and a circuit's rest is never invented (WK-05, 2026-09-27)

- **A circuit that logs nothing is a warm-up list** (`isPrep` in `renderCircuit()`: no `logWeight`, no
  `logRPE`, which is what a prep block gives by default). One line per movement: letter, name, dose and ▶ when
  it has a video, with its steps and cues folded under a chevron (`.round-row.prep`, `togglePrepCues()`; the steps
  first, since 2026-10-11). A tap on the row or the chevron opens them; ▶ plays and never toggles. The chevron
  shows only once the row has something to fold (`has-cues`: its cues, its steps or both, which `paintSpine()`
  fills in from the Spine). A real four-movement primer opened to 1001 px with twelve cue lines always open; it
  opens to 452 px now, on one screen.
- **A working circuit keeps its cues open, and folds its steps** (2026-10-11): under an item's cues, one small
  **How to do it · 5 steps ›** line (`.round-how-tog`, `toggleRoundSteps()`, 36 px to see and 44 to hit), shown only
  when the entry has steps (`has-steps`). A tap shows You need and the steps under it. So the circuit grows by that
  one line per item, about 38 px, and not by the steps (measured at 320, 360 and 390 px in `howto-steps.js`). The
  Spine's cues win on a circuit item too, its own only the fallback.
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
second account meant clearing the browser. Now the **initials button** sits top right on Home, Progress,
Library and Coach, where the floating dark-mode toggle was (`#global-account`, a solid green disc with the
athlete's initials; hidden in a day view, whose banner keeps its own moon for mid-session). Since 2026-10-12 it is
`position: absolute`, in the page: it scrolls away with the screen instead of floating over its content. It opens
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
itself. **Reset session** (on the finished card, under the send status line), a **body-weight reading** and a
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
- **How to do it** (2026-10-11) holds the steps, the cues and the video when there is one, and its ▶ means a video. Five
  texts said otherwise and changed with it: *How your program is structured* (each exercise "carries a demo video and
  coaching cues"), *Logging your sets* (How to do it was "the video and the cues"; the warm-up line, and a line for a
  working circuit's How to do it), *The ⓘ* (Library → Exercises "with its video and cues") and *Built-in tools*
  ("most exercises have a video": 141 of 320 entries had none). `ONB_TEXT` names none of these and did not change.

**Rule:** a PR that renames a button, moves a control or changes when a card appears updates its guide card
too (CLAUDE.md says the same). The Library's *Mark as done* note promises a habit tick only when AA Proof
will give one: `_wsHabitOn()` reads `<id>_hab_cfg` (never writes it); WORKOUT is core and always counts,
Mobility and Breathe are add-ons that count only when switched on, and no config on the phone reads as off.

## 📚 The Library's Sessions: a list, and a session at the right moment (LIB-01, 2026-09-27)

**Since 2026-10-13 the Library has no doors page and its look is Centre Court's: read *The Library* under *Every other screen in the
Centre Court look* above first.** The shelves, the ticks and the two moments below are unchanged.

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
  `weekDoneDays()`, so it shows exactly when This Week says *All N sessions done*, or *All N done* in a week with a note), so Home offers *Green Light*
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
when switched off**; `weightPanel()` in `coach.html` → an athlete → The work shows Amir the trend (it moved from their Proof screen on 2026-10-12). The
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

## 🧭 First-timer fixes (2026-10-11, found by walking the app: `Content/CLIENT-APP-MAP.md`)

Seven small changes, all found while mapping the app as a first-time client and each checked in a phone-width browser
(`scripts/headless/first-timer.js`, which fails on the unfixed code):

- **The Library's counts retry.** `loadLibCounts()` used to mark itself loaded after a failed first load (offline), so the doors read
  "0 Sessions / 0 Reads" for the rest of the visit. A failed load now leaves the counts blank and the next visit asks again.
- **Game Plan's dates are the cycle's own local days.** `fmtDate()` and `daysUntil()` read `YYYY-MM-DD` as UTC midnight, so west of UTC the
  header and the "N days left" banner showed the day before (`isoDay()` now reads it as a local day, as `cycDate()` always did).
- **Reset clears a circuit's round ratings too** (`resetDay()`); a circuit's kg boxes stay, like a set's weights. The guide already said RPEs clear.
- **The sore-only line reads "Your check-in said you were sore today."** (it said "suggested a sore today"). Lower and short days are unchanged.
- **Sign-in's "Message Amir" is a link** (`#si-help-wa`, set in `showSignIn()` from `COACH_WHATSAPP`) opening WhatsApp with "Hi Amir, I've lost my login details for the app."
- **The grey Begin button counts the answers** ("0 of 5 answered", then "Begin session ▶") so a first-timer sees why it is grey.
- **After the last card closes the page scrolls to the finish card** (`nudgeFinishCard()`: a standard card's fold, a circuit's last round, a
  warm-up/simple tick), as a fold already scrolled to the next card. Never in Guided, which has its own way there.
  Both it and Guided's last button go through `scrollFinishCard()`: plain centring, except when the card carries Career Mode's "what the session moves" lines
  (`.cf-moves`, catalogue switch on). Those make it taller than a short phone, so it slides to put its top on screen if Done stays on screen, and Done wins when both cannot
  (first-timer.js §7; at 320 × 640 the card is ~810 px, so only Done fits). Catalogue off, it is the plain centring it always was.

The in-app guide's "Getting around" now lists the tabs in the bar's order (Home · Coach · Library · Game Plan) and "How your program is
structured" puts the "Why This Cycle Matters" note on Game Plan, where it is.

### The first-timer pass, part two (Amir's calls, 2026-10-11)

Amir picked these after the map showed them (`Content/CLIENT-APP-MAP.md`, Part 2). They share one new piece, **`aaToast()`**: **a note in a box in the
middle of the screen** (Amir: "all the notes should appear in a box in the middle of the screen"), one at a time, a **Got it** button (or **Start** /
**Not now** for the clock offer), gone by itself after six seconds (twenty for the clock offer). It never dims or blocks the page, so logging can go on
under it. Since 2026-10-13 it is a green cover box above the sheets (z 215; *The sheets and the notices*, above). Checked in `scripts/headless/first-timer.js`.

- **A first-timer's tap on a closed card's number opens it** (`toggleCheckOnly()`; the number has been the tick-all since Centre Court
  round 2): ticking every set at once logs no weight and no RPE, so nothing to
  remember. Until `onbVeteran()` (cycle 2 or later, a finished session, or a stored last-time weight) it opens the card and says "Log each set in the open
  card: the weight, the circle, then how hard it was." (the circle there is the set's own). After that the number is the as-written shortcut it always was.
- **A set ticked with an empty kg box nudges** (`kgNudge()`): the box pulses and a note says "No weight saved on that set. Type it in the
  kg box." The 2026-09-26 rule stands (a tick on an empty box still records no weight; nothing is invented). A first-timer is told every time,
  a returning athlete once a session (per day, in memory). Never in Guided, whose rest screen asks for the weight; no nudge where the kg box is hidden.
- **The clock is offered once a day** (`offerClock()`, key `<id>_clockasked_d<day>`, cleared by Reset): a set, warm-up or circuit ticked with
  the clock not running says "The session clock isn't running." with **Start**, which goes through the readiness check as it always does.
  It waits for a tick with no weight nudge. ⚠ A late start under-reports the session's duration and load; the offer comes at the first tick so it is late by seconds.
- **The Welcome has a ✕** and the phone's Back closes it (`topLayer()` first, `navSync()` on open and close).
- **Game Plan's Active card: only its banner goes Home** (`cycleCardHTML(…, { bannerOnly })`); reading its text no longer throws you out.
  The Done card (Archive) and Up next (Game Plan) still take a tap anywhere. **Superseded 2026-10-13**: the cards became Progress's
  road (`cycleCardHTML()` is gone) and nothing on Progress jumps Home; the current cycle's row folds and unfolds in place.
- **The rest pill is removed** (see *The rest offer is gone*, above).
