## 📅 This Week is built from the session history (HOME-01, 2026-09-26)

Home's week used to know only today: a Done pill lasted until midnight (the `<id>_completed_d<N>` stamp) and
every morning the suggestion went back to Day 1. Now `weekDoneDays()` counts a day as done this week when a
session of it is in `HIST` (`get_my_history()` or its phone copy) inside `weekWindow()`, or was finished on this
phone today. The window is the **cycle's own training week** (`cycleWeekInfo()`: seven days from `startDate +
(wk − 1) × 7`; a cycle's dates are calendar days read in whole days by `cycleDayNo()` / `todayDayNo()`, the same in every time zone and across a clock change; until 2026-10-11 an athlete west of Greenwich was told "Cycle complete" a day early, `scripts/headless/cycle-tz.js`), or Monday–Sunday for a cycle with no dates or one that is over. **Before the cycle starts**
(published a day or two early) the window is the cycle's first week, not Monday–Sunday: the old cycle's last
sessions share the day numbers 1–4, and a Day 4 trained on 6 Oct ticked the new cycle's Day 4 as done (one athlete,
2026-10-11; `scripts/headless/cycle-end.js` covers it). `paintWeek()` redraws the day cards (a day
done this week is a `.dc-row` since HOME-02), the suggested day (a session in progress first, then the
first day not done this week, none when all are done) and the line under **This Week**, "2 of 3 sessions
done this week"; it runs at boot, when the history arrives, and whenever the day view closes, so a
finished session shows on Home without a reload. `completed_on` is the local day the session was
finished since DATA-02 (rows before it carry a UTC date).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
