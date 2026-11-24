# 14. Stacked (2026-11-24, #144)

Amir, round 14 'The Changeover': *"go with your picks and build all"*. REC-5 already writes a double-day rule into a concurrent athlete's plan
(gym after sport, or 4 to 6 hours apart). Nothing showed whether their weeks looked like that: the gym log alone cannot show the court around it.

**Where.** The athlete's file, The work, under Five weeks: one panel, **Stacked** (`stackedPanelC(D)`), one line for the current cycle (from its
start to today, or to its end once it is over). Nothing is drawn without a dated cycle, without sessions in it, without the rules
(`window.AAREC`) or while the file's logs did not load.

**The line** (`stackedLineC()`), from `stackedOfC()` on every session's Footprint (`footprintOfSessionC()`, the "big day" pill's read) and the
Court Log rows `get_five_weeks()` hands the file (`fileActsC(D)`: `D.fw.data.acts`, the same rows the phone reads):

| Count | What it is |
|---|---|
| big gym days within a day of hard court | a big session on the same day as a hard activity (Hard, an hour or more: `recovery/footprint.toml [court]`) or the day next to it, either order |
| times two hard days in a row | two calendar days running, each a big session or a hard activity |
| leg days with 3+ sets at RPE 9-10, then another leg day within 2 days | a lower-body session with the hard sets, and a lower-body session one or two days after it |
| check-ins after big days N lower (or higher) | the check-in score (the app's own `score`, else the composite) of sessions within two days after a big day, against all the other check-ins this cycle; only with two or more of each |

Then the totals it read: big days of sessions, and hard court days logged (Court Log exists since 2026-11-21, so an empty count is not "no
tennis"). With nothing piled up it says so.

**Information only** (REC-7). It is not a Needs-you reason and moves nothing. **/cycle-report** reads the same numbers: its `queries.sql` Q8
returns a bundle, and `node scripts/recovery/stacked.js <file>` runs coach.html's own `footprintOfC()`, `stackedOfC()` and `stackedLineC()` on it
(cut out of the file by name, as `check_twins.js` does), so the report and this panel cannot disagree. **/program-design** reads it in the
Debrief as a fact and asks Amir, never changing load or days from it.

**Test**: `node scripts/headless/coach/run.js`, scenario `stacked-panel`.
