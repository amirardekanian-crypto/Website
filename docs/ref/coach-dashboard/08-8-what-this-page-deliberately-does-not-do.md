## 8. ⚠ What this page deliberately does NOT do

**It never scores Proof.** XP, levels, day scores and streaks are already
computed twice — the client in `habits.html` and plpgsql in Supabase — and those
two must agree (see `CLAUDE.md`, *Everything in Proof that is scored TWICE*). A
third scorer here would be a third thing to keep in sync and the first to drift.

So every Proof number on this page is one of exactly two things:

1. **A presence fact** — "this day has a non-empty log entry", the same test
   `contact_list()` uses server-side. That's what the dots, `n/7`, "on court
   today" and the silence counters are.
2. **A number the server returned** — `hab_season_level()` (through `coach_season_levels()`: the career level once Career Mode's XP
   switch is on), `leaderboard_top()`,
   `contact_list()`.

If you want a new Proof number here, get the server to return it. Don't compute
it in this file.

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
