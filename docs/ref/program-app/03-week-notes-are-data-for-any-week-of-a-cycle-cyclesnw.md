## 🗓️ Week notes are DATA, for any week of a cycle — `cycles[n].weekNotes` (2026-09-26; any week 2026-10-11)

Every cycle is 4 loading weeks + 1 back-off, and the cards never change mid-cycle, so the back-off
used to exist only if a notes card said so. The pipeline audit that day found 16 of 34 live
programmes with no back-off wording and no drop in week-5 session RPE across 12 finished cycles.
Amir: *"update the app in a way that it can show first week or last week"*. On 2026-10-11 he made it
any week: a note can sit on a test week or a lighter week, and shows only during its own week.
**Since 2026-10-19 the pipeline writes a final-week back-off only as a taper before a competition Amir
named** (REC-4: the next cycle's week 1 is already slow); a final week that holds the retests may be a
titled *Testing week* that cuts some lifts, in words. The app did not change: it still shows whatever
note a week has, and calls an untitled one on the final week the *Back-off week*.
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

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
