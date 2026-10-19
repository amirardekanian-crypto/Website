## The four tabs

<!-- Split by sub-heading: one file each. Open the part you need. -->


> **Three tabs since 2026-10-19: Today, Progress, Crew.** See *Career screens off*.

`TODAY · PROGRESS · CREW · LOCKER` — `TAB_ORDER` is `['today', 'progress', 'crew',
'pass']`, `pass` being the Locker's screen id. Amir's own redesign (2026-07-29) promoted
the reward track from a row inside Progress to the fourth tab. **Settings is not a tab** —
it lives behind the athlete's initials at the top-right of the header, and the same button
becomes the `✕` out of the two overlay screens, **Settings and the manual** (neither is a
tab, so neither has a tab to press to leave; a habit's detail screen is not an overlay and
lights the tab it was opened from). The standalone rank-ladder screen that used to share that exit is
gone — the ladder is the Locker's road now. The tab bar used to give Settings a quarter of
the primary navigation for a screen an athlete opens three or four times ever, while the
social layer — the thing that brings people back daily — was a chip inside a tab named
after only half of what it held.

**The five screens Amir picked out are PANELS, and that was a layout change only**
(2026-08-01, from reference screens he sent): Today's **hero card** carrying the week,
**Settings as grouped cards** with their own sub-screens, **roll call as one card per
voice** under an inverted composer, **the board as a standings panel**, and counted habits
as a **segmented meter**. It is the `MEADOW · panels` layer in the CSS: the same MEADOW
skin, tokens and type (see *Voice*), with no new palette — its only additions are
`--ink-card` (the inverted surface), `--danger` and `--accent-fill` (the fill under white
text, darker in dark mode; 2026-09-27).

**Sign out** (NAV-02, 2026-09-27) is the last row in Settings: `signOutAthlete()` existed in
both apps and nothing called it, so a shared or lent phone meant clearing the browser. Two taps
(*Sure?*, like Reset), then the log is pushed (`pushNow()`, capped at 6 s so no signal never
traps anyone) and the athlete is signed out of both apps (they share the sign-in). The log stays
on the phone either way. Never in the demo or a coach preview; the embed has no Settings.


## The parts

- [01 · TODAY — the daily loop](01-01-today-the-daily-loop.md)
- [The wall is SEVEN DAYS, and nothing older is kept](02-the-wall-is-seven-days-and-nothing-older-is-kept.md)
- [02 · PROGRESS — where do I stand](03-02-progress-where-do-i-stand.md)
- [03 · CREW — everyone else](04-03-crew-everyone-else.md)
- [04 · LOCKER — the long game](05-04-locker-the-long-game.md)
- [The type scale (2026-10-12, the UX audit's last pass)](06-the-type-scale.md)
- [One word each, and the small things (POL-02, 2026-09-27)](07-one-word-each-and-the-small-things-pol-02-2026-09-27.md)
- [The phone's Back button (NAV-01, 2026-09-26)](08-the-phones-back-button-nav-01-2026-09-26.md)

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
