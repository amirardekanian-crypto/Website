## Seasons — scoring resets on command

Scoring runs in **seasons**, like ranked play. Only days on or after the current
season's start earn XP — for the athlete's own level *and* for the boards. Earlier days
stay in their history and still count toward streaks and consistency badges; they just
don't score.

**Once Career Mode's XP switch is on, that is true of the boards only.** The athlete's level, rank and each habit's ladder count
the whole career and never reset. A season still starts the boards from zero, and it archives the season's points and the career
level. The paragraphs below describe the reset as it works until then. `XP_SYSTEM.md` §7 has the table of what resets, with both
columns, and *Career Mode (phase 2, the XP switch)*, next, has the rest.

**Currently `Season 1`, opened 2026-10-18.** It opened at 06:00 UK (Amir's scheduled task
`start-season-1`, `start_season('Season 1','2026-10-18')`); `Pre-Season` (opened 26 July 2026) was archived Proof's way, 30 athlete records and 18 Pre-Season titles at level 5. `select * from public.current_season();` says which is live.
Amir launches the real thing with one
SQL command:

```sql
select public.start_season('Season 1');                -- starts today
select public.start_season('Season 1', '2026-08-01');  -- or a chosen date
```

Nothing is deleted — it inserts a row in `public.seasons` and every score is recomputed
from that date. Athletes' apps pick it up on next open with a toast. XP, levels and both
boards reset (once the XP switch is on, only the boards' points); logged history, streaks and consistency badges do not.

This also gates the workout backfill: without it, one athlete's 41 days of past sessions
would have landed as an instant head start. Full detail in
[`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §7. SQL: `supabase/stage11_seasons.sql`.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
