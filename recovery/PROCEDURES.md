# Recovery after a session: the procedures

Every function the recovery ideas run on, step by step, in plain words. Each one says **when** it runs, what it **reads**, its
**steps** and what it **writes**. The plain account of why is in [`RECOVERY.md`](RECOVERY.md), and the numbers and words are in the
three `.toml` files beside this one. A procedure never hard-codes a number: it reads `window.AAREC`, which
`python scripts/build_recovery.py` builds from those files into `assets/js/recovery.js`.

**Status (2026-11-24): built and live in the code, round 14 'The Changeover'** (Amir: *"go with your picks and build all"*).
The server half is `supabase/stage128_history_minutes.sql`, applied live 2026-11-24: `get_my_history()` also returns `duration_min`
and `fin`.

| # | Procedure | Idea | Runs | Where |
|---|---|---|---|---|
| R1 | Read a finished session: `footprintOf()` | #139 Footprint | at Done, again the next morning, and in coach.html | program.html, coach.html |
| R2 | Tonight and tomorrow: `lastWordOf()`, `paintLastWord()` | #140 The Last Word | when a finished card is drawn | program.html |
| R3 | Choose the Library session: `fpPick()`, `recFirst()` | #143 Matched Pair | inside R2 and R4 | program.html |
| R4 | The morning after: `dayTwoWhat()`, `dayTwoHtml()` | #141 Day Two | when Home's suggestion is drawn | program.html |
| R5 | Two hard days running, and a match: `backToBackCall()` | #142 Back-to-Back | when an activity is saved | program.html |
| R6 | The big day pill: `footprintOfC()`, `bigDayMarkC()` | #139 in coach.html | when a session's card is drawn | coach.html |

---

## R1. Read a finished session: `footprintOf(s, ctx)`

**Runs** at Done (`paintLastWord()` calls `footprintOfDay(day)`), for any session the phone did not finish itself (`fpOnDate()` reads
the history), and in coach.html as `footprintOfC()`, the twin. **Reads** `footprint.toml` and a session `s` of `{ date, rpe, mins, fin,
log }`, plus `ctx` of `{ rules, earlier, spineOf, week, acts }`. It is a pure function: it changes nothing and never touches the save
path. It returns `null` without rules or a session, and **it is never shown to the athlete as a number** (rounds 5 and 12 cut that).

Steps, in the order the code applies them:

1. **Count the working sets.** Walk the session's log. A block whose title has a `[sets] prep_words` word (warm, mobility,
   activation, cool, prime, prep) is skipped, its sets never count. A circuit counts once per rated round, for each movement in it. Any
   other exercise counts the sets with a weight, an RPE or a done mark on them.
2. **Count the body areas.** Each working set is counted once for every Spine body area its exercise `loads` (`spineOf(name)`). A set
   with no Spine entry adds to no area. It also counts as one **lower-body** set if any of its areas is in `[lower] areas`, as an
   **impact** set if its `impact` is in `[big] impact_kinds`, and as a **hard** set if its logged RPE is `hard_set_rpe` or more.
3. **Is it a lower-body day.** Half or more (`[lower] share`) of the sets that have areas load a lower-body area.
4. **Find the athlete's usual.** From `earlier`, take the sessions in the `usual_days` days before this one that have an RPE and minutes,
   and take RPE x minutes of each. With `usual_min` or more of them, the usual is the **median**. With fewer there is no usual, and the
   load rule says nothing.
5. **Find the new exercises.** An exercise is new when no session in the `[new] days` days before has a logged set of it (names compared
   lower-case, prep blocks and circuits left out). `newEx` is how many different new exercises are in this session.
6. **Give the reasons.** In this order: `rpe` (session RPE at `session_rpe` or more), `load` (RPE x minutes at `load_over_usual` times
   the usual or more), `hardsets` (`hard_sets` or more hard sets), `impact` (`impact_sets` or more impact sets, and on a lower-body day
   when `impact_lower` is true). Any one reason makes the session **big**.
7. **Give the level.** Big if there is a reason. Otherwise **easy** if the session RPE is `[easy] session_rpe` or less, and **normal** if
   not. A session with no RPE is normal.
8. **Read the clock and the court.** `late` is a finish time (`fin`, HH:MM) at `[late] from` or later, `evening` at `[evening] from` or
   later. `courtBefore` and `courtToday` are a hard activity in `acts` (Court Log, logged Hard and `[court] hard_min` minutes or more) on
   the day before and on the same day. `week1` is week 1 of the cycle.

**It returns** `{ level, why[], rpe, mins, load, usual, sets, hard, impact, areas, lower, newEx, week1, fin, late, evening, courtBefore,
courtToday }`.

**The phone's inputs** (`fpCtx()`): `earlier` is the history (`HIST`, from `get_my_history()`, whose rows carry the RPE, and the minutes
and finish time since stage128 through `histFromRows()`). The Spine is the one the phone has (`spineFor()`). Court days are Your weeks'
copy (`moveActs()`). **coach.html's inputs** (`footprintOfSessionC()`): the same, from `session_history`, the file's Spine and
`get_five_weeks()`'s `acts`, with no cycle week.

**It is kept.** At Done `fpKeep(date, day, fp)` writes the read to `<id>_fpdays` (`{ 'YYYY-MM-DD|day': footprint }`, the last 10), so the
next morning Day Two has it. That key is a view this phone worked out, never progress: `_snapshot()` skips it and it is never synced.
Never in the demo or the coach's preview.

**A twin.** `footprintOf()` and `footprintOfC()` are one function in two copies, held equal by `scripts/check_twins.js` section 12 (it
runs both on the same sessions, with the real rules and a stub Spine, and pins a few answers so they cannot drift together).

---

## R2. Tonight and tomorrow: `lastWordOf(fp, sore)` and `paintLastWord(day)`

**Runs** when a finished card is drawn (it replaced the sore-only call), and again when `recovery.js` arrives (`recReady()`, because the
file is deferred). **Reads** `last-word.toml`, `matched-pair.toml` and the day's Footprint.

Steps:

1. **Is it the day.** `lastWordDay(day)` is true only when there are rules, the athlete is signed in, the day is finished on this phone,
   and the session's date is today, or yesterday before 06:00. Outside the coach's preview. If it is false, or the Footprint is `null`,
   the card is drawn as before (`paintSoreSugg()`, LIB-01's sore row).
2. **Keep the read** (`fpKeep()`, R1).
3. **Turn the Footprint into facts** (`lwFacts()`): `big`, `normal`, `easy`, `late`, `new` (any new exercise), `week1`, `lower`, `hardsets`
   (`hard` is `hard_sets` or more), `court_before`, `court_today`.
4. **Pick one line per slot.** For each slot in the order **tonight, tomorrow, next**, take the **first** line in `last-word.toml` whose
   `slot` matches and whose `when` facts are **all** true. So the specific line sits above the general one in the file. A slot with no
   true line says nothing. The result is zero to three lines.
5. **Pick the one Library row.** The candidates, in this order, and the first that works wins:
   1. a **sore check-in** (`soreSuggWanted()`): The Morning After, in its own words (LIB-01);
   2. **big and late**: `matched-pair.toml [late]` (Lights Out, `pre-sleep`);
   3. **big or new exercises**: the Matched Pair's pick (R3), its `evening` list if the finish was at `[evening] from` or later, its
      `morning` list before that.

   For each candidate, `recFirst()` takes the first session in its list the Library has (a session not published yet is skipped), and a
   candidate with no `[[say]]` is dropped. The first one left is the row. **One offer per finished day**: once the athlete has opened any
   of the candidates since the moment began (`libSeen()`, `lwSince()`), the card shows no row at all, and no other session takes its place.
6. **Pick the one article.** The first `[[article.rule]]` whose `when` is all true. Its `articles` list is tried in order and the first
   one the Library has (`recArticle()`), that has an `[[article.say]]` and has not been opened since the moment began, is the article.
   An article not published yet is skipped, which is how What Actually Helps (#145) can be named before it exists.
7. **Draw it** in the finished card's suggestion slot (`#sugg-<day>`, class `has-lw`): the label, the lines, then the one row and the one
   article in `.lw-rows`. A row is drawn by `recSuggHtml()` in LIB-01's own grammar (the kicker in clay, the name, the words after it, then
   the minutes, the kit and the habit it ticks).

**Seen.** A row or an article goes once it is opened (`openLibSugg()`, `openLwArticle()` through `markLibSeen()`). `markLibSeen()` keeps
`<id>_libseen` for the three LIB-01 picks and, since this round, every session and article the recovery rules can offer (`recOffers()`).
An article is stored as `a:<slug>`.

**The way back.** A session opened from the card returns to the card (`_wsReturn`). An article opened from the card does too: its **←**
is `arBack()`, which hands the card's place to `wsBack()`. From anywhere else it still goes to the Library.

---

## R3. Choose the Library session: Matched Pair

**Runs** inside R2 (step 5) and R4. **Reads** `matched-pair.toml`.

`fpPick(fp)` for each `[[pick]]` in file order takes the number of working sets in the pick's **most-loaded** area (from `fp.areas`).
The pick with the **most** wins, and a **tie goes to the one higher in the file** (the test is strictly greater). If no pick's area was
loaded at all, the `fallback` pick wins (`legs`). The pick then offers its `evening` or its `morning` list, and `recFirst()` takes the
first session in the list the Library has.

| The most-loaded area is | Pick | Evening | Morning |
|---|---|---|---|
| knee, hamstring, calf and Achilles, ankle and foot | legs | Night Shift (`evening-release`), then The Morning After (`day-after`) | The Morning After |
| hip and groin | hips | Low and Wide (`hips-and-groin`) | Low and Wide |
| shoulder | shoulder | Open The Cage (`thoracic-and-shoulder`) | Open The Cage |
| elbow, forearm and wrist | arm | Racket Arm | Racket Arm |
| low back | back | First Light (`morning-back`) | First Light |

(The names above are the Library sessions' own. The ids are `evening-release`, `day-after`, `hips-and-groin`, `thoracic-and-shoulder`,
`racket-arm`, `morning-back`.) **Never a Care loading session.** The `never` list holds the five (`forearm-loading`,
`shoulder-endurance`, `back-under-load`, `knee-and-achilles-loading`, `lower-back`): they are training, not recovery, and
`check_recovery.py` refuses one anywhere in the three files.

---

## R4. The morning after: Day Two, `dayTwoWhat()` and `dayTwoHtml()`

**Runs** whenever Home's suggestion is drawn (`paintWeekSugg()`), and when `recovery.js` arrives. It sits **after First Serve and before
the week's own suggestion** (Green Light), and it takes that slot for the morning.

**When it applies** (`dayTwoWhat()` returns `null` for each of these):

- the app has no rules, or it is the coach's preview, or there is no programme;
- **today has begun for training**: a session was started, finished or checked in today (a sore check-in already lowers the day, REC-2).
  Then the plan of the day speaks, not yesterday;
- yesterday had nothing: no hard activity (Hard, an hour or more), no big session and no session with a new exercise.

**What it offers**, the first of these that is true (yesterday is `y`):

1. **Two hard days in a row**: yesterday was hard (a hard activity or a big session) and so was the day before (`recHardDay()`). Kicker
   *Two hard days in a row*, the `[day_two] two` list.
2. **A match yesterday**: kicker *Match yesterday*, the `match` list (The Morning After).
3. **A big gym day yesterday**: the Matched Pair's pick for that day's Footprint (R3), its `morning` list. Kicker *Big day yesterday*.
4. **A hard activity yesterday**: kicker *Hard day yesterday*, the `hard` list.
5. **New exercises yesterday**: the Matched Pair's pick for that day, its `morning` list. Kicker *New exercises yesterday*.

Yesterday's Footprints come from `fpOnDate(date)`: this phone's own reads (`fpDays()`) first, then the history for any session the phone
did not finish (`footprintOf()` on the history row). A day is hard (`recHardDay()`) when a Court Log activity that day is hard, or a
Footprint of that day is big.

**`dayTwoHtml()`** takes the offer's first Library session (`recFirst()`), needs its `[[say]]`, and draws it as a row (`recSuggHtml()`,
tag `daytwo`). **When it goes:** once the session has been opened today (`libSeen()`), once a session or a check-in starts the day, and at
midnight, because it is only ever about yesterday. Information, never a plan: nothing in the programme moves (REC-7, REC-2).

---

## R5. Two hard days running, and a match: Back-to-Back, `backToBackCall(act, day)`

**Runs** first inside `coolDownCall()` (#128 Cool Down Call), after Court Log's Save. **Reads** the saved activity and
`last-word.toml [back_to_back]` and `[after_match]`.

Steps:

1. **Only today.** If the activity is not for today, do nothing: "tonight" and "tomorrow" mean nothing for last Friday.
2. **Is it a second hard day.** The activity is hard (Hard, `[court] hard_min` minutes or more) **and** yesterday was a hard day
   (`recHardDay(yesterday)`, leaving out the activity just saved). Then the message is `[back_to_back]`: *"Second hard day in a row.
   Tomorrow easy if you can. Tonight: food and sleep."* with its session (The Morning After).
3. **Is it a match.** If not a second hard day and the kind is `match`, the message is `[after_match]` with Final Whistle
   (`post-competition`), for the hour after it.
4. **Say it** in the toast (`aaToast`) with the session's name as its action, opening the session with the way back to Your weeks.
   Return `true`, so Cool Down Call says nothing more.
5. **Neither**: return `false`, and Cool Down Call carries on as it did (a hard activity of an hour or more offers The Morning After).

Information only (REC-7): nothing in the plan changes.

---

## R6. The big day pill in coach.html: `footprintOfC()`, `bigDayMarkC(D, s)`

**Runs** when a session's day card is drawn in the athlete's file (`workDayCard()`) and in the earlier cycles (`earlierCyclesHtml()`).

1. `footprintOfSessionC(D, s)` builds the session and its context from what the file has (R1, coach inputs) and calls `footprintOfC()`.
2. If the level is not `big`, or the file's logs did not load, draw nothing.
3. If big, draw a neutral pill, `big day`, right after the session's `sRPE`. Its title says why, from `fpWhyC()`: *session RPE 8+*, *load
   1.4x their usual*, *3 sets at RPE 9+*, *4 sets of jumps or landings on a leg day*.

Information for Amir only. Never clay, never a score.

---

## How to change something

Change the file, never the function. Then ship it (below).

### A number: `footprint.toml`

Open [`footprint.toml`](footprint.toml). Each number has a comment saying what it means. `check_recovery.py` refuses a number outside
its range (`session_rpe` 5 to 10, `load_over_usual` 1.05 to 3, `hard_set_rpe` 7 to 10, `usual_days` 7 to 90, and so on), an `easy`
that is not below `big`, an area the Spine does not have, and **`[sets] prep_words` that differ from the Quality check's words** (coach.html
`QM_PREP`, program.html `isPrepBlockTitle()`): change those three together. A number moves what counts as a big day on the phone and in
coach.html at once, because both copies read it. A change to a rule's *shape* (a fifth reason a session is big) is a code change in both
twins, and `check_twins.js` section 12 must change with it.

### A line: `last-word.toml`

Open [`last-word.toml`](last-word.toml). Each `[[line]]` has an `id`, a `slot` (tonight, tomorrow or next), a `when` list of facts and the
words, `en` and `fa`. Remember the rules of the file:

- **Order is the rule.** The first line in the file whose `when` is all true wins its slot, so put the specific above the general.
- **`when` uses only the ten facts** the file's header lists, and never two of big, normal and easy (it could never show).
- **Both languages, always** (COM-1). The Farsi is formal (شما) and a draft until Amir has read it.
- **Plain words and short sentences** (COM-3). The checker refuses an em-dash, an en-dash, a semicolon (in either language) and stray
  spaces.
- **Never** a rest day (*rest day*, *day off*), cold water or *ice*, *flush*, *lactic*, *toxin* or *detox*. The checker refuses these words
  in the English. Recovery is sleep, food and spacing, and breathing is only for switching off.
- A new article needs an `[[article.say]]` and goes in an `[[article.rule]]`. An article not in `articles/` yet is a warning, not an error:
  the app skips it until the Library has it.

### The map: `matched-pair.toml`

Open [`matched-pair.toml`](matched-pair.toml). To change which session a body area gets, change that `[[pick]]`'s `evening` or `morning`
list. The checker refuses:

- **a Care loading session anywhere** (the `never` list), because those are training, not recovery;
- a session id that is not a Library session (`workouts/<shelf>/<id>.json`);
- a session with no `[[say]]` (the words after its name on its row), so a new session needs its `[[say]]` too;
- a pick whose `areas` are not Spine body areas, a missing `fallback`, and a line with no Farsi.

Order matters in one place: a tie between two picks goes to the one higher in the file.

---

## Shipping a change

In this order, from the repo root:

1. `python scripts/build_recovery.py` writes `assets/js/recovery.js` and the Farsi of every line, `scripts/i18n/fa/29-recovery.json`.
   Never edit either by hand.
2. `python scripts/check_recovery.py` runs the checker (it also runs `build_recovery.py --check`, so a built file older than the toml
   fails). The pre-commit hook runs it (guard 32).
3. `node scripts/build_i18n_fa.js` when the Farsi changed (a `29-recovery.json` or a hand-written `30-changeover.json` word), which
   rebuilds `assets/js/i18n-fa.js`.
4. **Bump `?v=`** on `/assets/js/recovery.js` in program.html, coach.html **and** `sw.js`'s `SHELL`, and the **`i18n-fa.js ?v=`** in program.html
   (the `data-fa` of the i18n.js script) **and** `SHELL` when the Farsi changed. A phone keeps the old file until the `?v=` changes.
5. **Bump `sw.js`'s `CACHE`** (`aap-vNNN`), with its comment line, so an installed app asks for the reload.
6. `node scripts/check_twins.js` (section 12 holds the two Footprints equal).
7. The tests: `node scripts/headless/last-word.js` (the finished card, Day Two and Back-to-Back) and `node scripts/headless/coach/run.js` (the
   pill). Headless tests on this PC: see the notes in `headless-tests-on-this-pc` (Playwright in `%TEMP%\pw`, never port 8765).
8. **An `assets/news.json` entry** when athletes would notice (a new line, a new session offered), in English and Farsi, or `[no news]` in the
   commit message. A change to a number that moves only the coach's pill needs none.
9. Commit and push `main` by itself (`docs/rules/working-with-amir.md`).

A change to the **server** (`get_my_history()` and the like) is a database stage: a new `supabase/stageNNN_*.sql`, the snapshot rule in
`scripts/restore/README.md`, and a phone from before it simply has no load (`footprintOf()` treats a missing minute as no load).
