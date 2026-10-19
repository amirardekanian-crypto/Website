### The work — prescribed vs done, on one line

**One card per program day**, in program order, whether or not it has ever been trained. The header
carries the day, the focus name, when it was last done, sRPE · duration · AU · readiness, and a
verdict — *"1 not done · 2 off plan"* with *"5/8 exactly as prescribed"* under it. Only the most
recently trained day opens by itself; the rest are one tap.

Inside, every prescribed exercise is a row with three columns:

| | |
|---|---|
| **Prescribed** | what you wrote — `4 × 10`, `RPE 7`, tempo, any extra chips and the pill underneath (a pill off the list in clay) |
| **Done** | sets completed against sets asked for, the load they actually used (`10 → 12 kg` when it moved within the session), and their **average RPE** — with the per-set RPEs under it |
| **Flag** | the gap, named: `2 sets short` · `not done` · `2.5 over target RPE` · `not in the plan` |

A row is bordered clay when work was skipped, ochre when it was done at the wrong dose, and plain
when it landed on plan. Your exercise note and anything the athlete wrote against that exercise sit
under its name. Anything they logged that you never prescribed appears at the bottom under
*Logged, not prescribed*.

**The RPE flag is the point of the rebuild.** The old comparison table read the log but kept only
"was this set ticked", so a session logged three RPE above target showed as `✓ 4/4 sets` in green.
The bar is `RPE_OVER` / `RPE_UNDER` in `coach.html`, both **1.5** — a set logged at 8 against a
target of 7 is a good set and doesn't need a flag; a point and a half out does.

**Reps are compared from 2026-09-24 (The Card Remembers).** The set log gained a reps box that
shows the prescribed number in grey and stays empty unless the athlete did something else, so a
normal set costs no tap. The log line reads `Set 3: 80 ×4 @8 ✓`; `parseSetLine()` reads the `×`
back, the row lists `reps: 5 · 5 · 4`, and a set under the prescription raises **"1 set under 5
reps"**. Sessions saved before that date have no reps and are never given one — nothing here
invents a number you might train off. ⚠️ `parseSetText()` in `program.html` reads the same grammar
for the athlete's own history, so a change to the log line moves three places together
(`buildSessionData()`, `parseSetLine()`, `parseSetText()`).

**A weight carries its unit from 2026-10-18.** The athlete picks kg, lb or plates over the weight boxes, and the unit is written in
the weight: `Set 1: 45 lb ×8 @7 ✓`, `Set 2: 6 plates @7 ✓` (a bare number is kg). The dashboard shows it as typed (Amir: *"lb sessions
should be shown lb in coach.html"*): the load column reads `45 → 50 lb` or `6 → 7 plates` (`wUnitOf()`, `loadSummary()`), sets in
two units are listed as typed and never folded into one range, and a Personal Record set in pounds says `≈ N lb` beside its kg
estimate. Plates are a position on a machine's stack, never a load: nothing here adds them up or turns them into kilograms.

Other things on this tab: the **day's session picker** when a day has been trained more than once
(tap a date to compare against that run instead), the athlete's note with **Mark read** (a note is read here, never answered: you answer only on
WhatsApp, 2026-09-26, and the athlete app sends anything that needs an answer there),
the **raw log exactly as sent** behind a toggle on every day, **Earlier cycles**, and
a collapsed **live app snapshot** — what is on their phone right now, which is a different question
from what they finished. A started day is *in progress* by the app's own rule (2026-10-11): its check-in stamp is on today's
calendar day, or under six hours old; anything older and unfinished reads *a leftover, not live* (it used to count 30 hours).
The day is this computer's, as the app's is the phone's.

⚠ **Plan and log are matched by exercise name.** A session done before you rewrote the program won't
line up with the current plan — every prescribed row reads *not logged* and their real work shows
under *Logged, not prescribed*. When a whole day comes back that way the card says so in as many
words. That is the honest reading, not a bug: they really did train something else. Since
2026-10-10 the names come from the session's structured log (`session_history.log`) when it lines up
one to one with the text, so a lift renamed in the Spine (the one-name move of 2026-10-09) still
matches; the same exercise twice in a day keeps its own log on each row; and work touched but with
no set ticked is flagged *0 of N sets ticked* instead of counting as exactly as prescribed.

**Every note has Mark read.** A note written against one exercise counts as a note to read (it did
before), and since 2026-10-10 it also gets the note box and Mark read (8 of 12 waiting notes had no
way to be cleared). **A note the athlete edits after you marked it read comes back** to *needs you*
(stage46 for the note on the whole session; **stage58, 2026-10-11, for a note on one exercise too**: `save_session()` compares the exercise notes of
the new save with the old row's, taking a note away or editing a weight does not bring it back, and your own saves never do). A `Note:` line
with nothing after it is not a note to read. Mark read changes that one row in
the page's copy; it no longer re-downloads the whole session history.

**What the file needs from the server, and what it says when it cannot have it.** The page loads every session's numbers
at boot but not its text: an athlete's logged sets and the raw log are read when you open their file (one read, then they
stay in memory until the list is reloaded). If that read fails, the work tab opens with a red line, *Their session logs did
not load*, the reason and **↻ Try again**; the day cards keep the numbers that did arrive (date, sRPE, minutes) but show no
comparison and no verdict, because comparing against nothing would read as a week they skipped.

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
