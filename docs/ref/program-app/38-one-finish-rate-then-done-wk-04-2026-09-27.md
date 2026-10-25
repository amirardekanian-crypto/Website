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
- **Still to log** (Amir, 2026-10-25: *"it doesnt say what is missing, if its an rpe, if its a weight or a set, it should tell them
  what is missing, and when its ticked, it should be removed"*). Once the card asks for the rating (every set ticked, or Stop here
  taken), `.confirm-norpe` lists one row per exercise with what is missing (`missingToLog()`): *Sets 3 and 4 not ticked*, *No weight
  on set 2* (only where the kg box is wanted, `kgWanted()`), *No effort on sets 1 and 2* (only where an effort is written), *Round 2
  not ticked*, *No effort on round 1*, *Not ticked*. Optional and skipped-today work is never listed. A tap opens the card at the
  first set that needs it (`goMissing()`). Every set, weight or rating saved repaints it (`missRefresh()`), so a row goes the moment
  it is logged. It replaced *No effort on 4 lifts* and the early card's *Not done* list; the green keeps only *What stopped you?*.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
