## 12. Open economy decisions

A game-design review (2026-08-02) found five tuning choices — not bugs — each of which
changes what a day is worth and so had to land in `habits.html` *and* Supabase together
(section 8).

**All five have shipped.** Nothing is open.

- ~~the streak gate is unfair on the default roster~~ → §6 (two-door gate, pro-rata
  counters) + `stage22`.
- ~~nothing pays for the comeback~~ → §6.6 + `stage22`.
- ~~FIRST BLOOD is unreachable for the free tier~~ → §4.6 (`DAWN PATROL I`) + `stage24`.
- ~~custom habits have no server-side ceiling~~ → §1 (`maxCustom`) + `stage24`. Amir's
  call was to limit rather than exclude: honest customs still score on the board, only
  the unbounded tail is gone.
- ~~season 2 is a reward dead zone for veterans~~ → §7.5 (the season record and its
  title) + `stage25`. Amir's own suggestion — milestone **marks** (§4.6) — took most of
  the sting out of this one independently, by nearly doubling the badge shelf that
  re-pays every season.

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
