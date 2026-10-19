#### The backfill window
Nobody logs perfectly on the day, every day, so **the last `BACKFILL_DAYS` (3) days plus
today are editable**. Tapping one of those days on the week (the card at the top of Today) switches
which day the taps land on; past that the
log is closed. The limit is the feature — a record you can rewrite whenever you like is
a diary, not evidence.

While an earlier day is selected the screen says so unmistakably (clay banner, the header
title becomes the weekday, `· FILLING IN` in the eyebrow), and **the nudge and the roll
call pointer stand down** — both are statements about *now*, and "drink three more glasses"
is nonsense advice about last Saturday. Streaks, at-risk warnings and the perfect-day
celebration stay anchored to the real today for the same reason. `AKEY()` self-heals: if
the app is left open past midnight the window slides and it falls back to today rather
than writing to a day that has since closed.

Backfilling **does** recompute XP, streaks, badges and quest progress — that is the point
of allowing it. It does **not** reopen that day's roll call sentence.

⚠️ **The row list you fill in must be that day's own roster, never the current one**
(fixed 2026-07-30, after Amir asked why a day he'd ticked every visible row on still
read 86%, not 100%). `renderToday()` used to build the tappable list from `live()` —
today's tracked set — for every day, including a backfilled one. If an add-on has been
switched off since, the row simply stopped existing: `live()` doesn't know it was ever
tracked. The header's own `dayPct()` was never wrong — it already read `rosterOn(AKEY())`,
per the roster invariant above — so an athlete could tick every row the screen showed
them and still watch the day sit at 86%, with no way to see why or fix it. `rows` is now
`rosterOn(AKEY())`, always the day's actual scored set; `hs` (`live()`) stays reserved for
"your week" — the heat map and the strongest/weakest ranking, which are about what you
track *now* regardless of which day you happen to be viewing. A row pulled in only
because history asked for it, not the current toggle, carries **"paused now, but counted
this day"** on its meta line so an unfamiliar habit reappearing mid-backfill explains
itself; it is otherwise a completely normal, tappable row — `toggleHabit()`/`bump()`/
`openHabit()` never gate on `CFG.on`, so logging it retroactively works exactly like any
other habit.

> The window is a **UI affordance, not a lock**. The app pushes its whole log blob to the
> server, so devtools could always reach further back — true before this existed too.
> Enforcing it server-side would mean diffing snapshots on every save; judged not worth
> it for a board among one coach's own clients.


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
