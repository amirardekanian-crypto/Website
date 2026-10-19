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

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
