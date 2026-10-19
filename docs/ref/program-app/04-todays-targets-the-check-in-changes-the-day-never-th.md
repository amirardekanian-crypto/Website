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

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
