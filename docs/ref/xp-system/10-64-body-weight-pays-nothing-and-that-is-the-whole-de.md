## 6.4 Body weight pays NOTHING — and that is the whole design

Added 2026-09-03. **The body-weight tracker is outside this document's subject matter on
purpose**, and this section exists so nobody goes looking for the tunable that is not there.

- **No XP, on either side.** Not per reading, not per streak of readings, not as a
  milestone or a badge or a quest. There is **no `xp_rules` key** for it, because there is
  no rule to mirror — it is the one feature that cannot appear on the "scored twice"
  table in §8.
- **It cannot move a day score.** It is not in `HABITS`, not in `live()`, not in
  `rosterOn()`, and never written to `LOG` — so `dayParts()`, `dayPct()`, `gatePct()` and
  `isPerfect()` cannot see it. Proven in the browser: writing a weight leaves
  `overallXp()`, `dayPct()`, `overallLevel().lv`, `LOG[today]` and `rosterOn(today)` all
  byte-identical.
- **It cannot be gamed.** Nothing to farm, because nothing pays.
- **Switching it on or off costs nothing.** Unlike an add-on habit — where adding lands
  today and removing lands tomorrow precisely because the day score is at stake — the
  weight toggle has no scoring consequence in either direction and no roster entry.

⚠️ **It is not in `habits.html` any more.** Since 2026-09-12 body weight lives in
`program.html` (Home → Body Weight), which owns `<id>_hab_wt` outright — it writes, pushes
and merges it, and `habits.html` must never write that key (both apps share the origin's
localStorage). See `HABITS.md` → *Body weight — MOVED OUT*.

The only numbers it has are presentational, and the live ones are `program.html`'s: a
7-day rolling-average window (`WT_AVG_WINDOW`) and range chips of 7 / 30 / 90 days.
`habits.html` still declares `WT_STEP`, `WT_MIN`/`WT_MAX`, `WT_RANGES` and `WT_AVG_WINDOW`,
but only for a few leftover readers that draw nothing. Changing any of them changes a
picture, never a score, so none of them needs a server counterpart and none can put the
board and the phone into disagreement.

⚠️ **If a future change ever makes weight pay XP, it stops being free.** It would need a
key on the `xp_rules` row, a branch in `hab_xp()` or `hab_bonus_xp()`, and a row in the
§8 table — and it would hand every athlete a scoring lever that a bathroom
scale, rather than any behaviour, controls. Don't.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
