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

**One session at a time** (Amir, 2026-10-25: "in the middle of a session i can do another session which doesnt make sense"). The set
log is kept per exercise name, so ticks alone used to make every day that shares a lift look started: Home Resumed Day 1
("1 of 18 sets") while the athlete was on Day 2. Now ticks make a day under way only when that day was ticked today itself
(`_touched_d<N>`, `markTouched()`); a clock started today still counts. `activeDayId()` is the one day under way (two at once,
left from before: the one whose clock runs, else the one whose clock moved last); Home's card Resumes it and
`openDayView()` does not open any other unfinished day: a box (*One session at a time*) says which day is under way, how to
end it early (⋯ then Stop here) and offers **Back to Day N**. A finished day still opens. `scripts/headless/one-session.js`.

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

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
