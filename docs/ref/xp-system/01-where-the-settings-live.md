## Where the settings live

One object, near the top of `habits.html`:

```js
const XP_RULES = {
  base: 300,              // XP for level 1 → 2
  growth: 0.55,           // cost(n) = base × n^growth
  completionBonus: 1.2,   // multiplier once a habit's target is met
  customXp: 25,           // per-completion value of an athlete-added habit
  streakQualifyPct: 80,   // a day counts toward the day-streak at this % of the day's WEIGHT
  dailyCap: 3,            // most a counter takes in a day, × its target — section 1
  seasonStart: '2026-07-26',   // fallback only — the server is the authority
  seasonName: 'Pre-Season',    // see section 7
  weights: {              // per-completion value, by health impact
    strength: 100,
    steps:     60,
    sleep:     50,
    fuel:      40,
    water:     30,
    mobility:  30,
    breathe:   20,
    supps:     20
  }
};
```

Two supporting lists sit just below it: `RANKS` (the rank names) and
`CONSISTENCY_TIERS` (the consecutive-day ladders). Note `weights` is still keyed by
`strength` — that is the WORKOUT habit's internal id, kept so the rename didn't orphan
anyone's history.

Two more constants live outside `XP_RULES` because neither is a scoring number:

```js
const BACKFILL_DAYS = 3;   // today + this many days back are editable — section 6.5
const NOTE_MAX = 200;      // characters in a roll call sentence — section 11
```

**Rewards are the one exception to "nothing is stored".** `PASS_TRACK` hands out a title
or a card look at 14 points up the ladder, and what has been unlocked is *recorded* in
`CFG.pass.owned` rather than recomputed. That is deliberate and it must stay that way:
levels reset with the season, so a derived reward would be taken back every reset, and a
reward you can lose is a rental. `claimRewards()` only ever **adds**. Nothing in this
document changes what a reward is worth, because a reward is worth no XP — see
`HABITS.md` → *The long game*.
Once the XP switch is on levels no longer reset with a season, but rewards are recorded and only ever added all the same: a reward
you can lose is still a rental.

It is stored **on the server too** (`public.hab_titles`, stage 17), for the same reason:
a season reset drops every level to 1, so any check that recomputed a reward from the
current level would revoke it. `hab_mint_titles()` records instead, at the level the
athlete has *right now*, and never deletes.

Level used to move *within* a season as well — the two milestones scored off
`perday.ndone` counted only habits currently switched on, which cost 500xp and a level in
67 of 266 log lengths. Stage18 fixed that (see §4.5 and `HABITS.md` → *Days are settled
units*), so the season reset is now the only way a level falls. It is reason enough.
(Once the XP switch is on even that is gone: the level is the career's. Only a change to the rulebook moves it, and a re-seed
rescores everyone, §9.)

⚠️ If you retune anything in this document, you change what level a given log produces —
and therefore who qualifies for a title *from here on*. Everything already minted stays
minted, on both sides. That is the intended behaviour, not a rounding error to clean up.

**Free users score on exactly these rules.** The switch is `"tier": "free"` inside the
`athlete` object of their programme record (their row in `public.programs`, read through
`get_program()`; `isFree()` in the app). It changes what the athlete can *reach* — WORKOUT
stays locked and the programme links point at the apply form — and changes **nothing**
about scoring. There is no free-tier multiplier, no separate ladder and no separate board,
on the client or in Postgres; the server scores every athlete from the same `hab_log` with
the same `xp_rules` row and does not know the tier exists. That is deliberate on both
ends: the board is only worth topping if it is one board, and upgrading someone is then a
one-field edit on the same row — same id, same login, no history lost. See `HABITS.md` →
*Two kinds of user*.
Once Career Mode's XP switch is on the server scores from the facts and the rulebook instead, and still does not know the tier. A
free athlete simply has no training facts (GAME-12).

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
