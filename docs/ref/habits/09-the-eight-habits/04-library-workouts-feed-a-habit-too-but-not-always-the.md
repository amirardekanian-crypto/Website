### Library workouts feed a habit too — but not always the same one

The Library in `program.html` (Sessions → the numbered photo shelves) has a
**Mark as done** button at the foot of each workout. It works exactly like the block
above — the training app writes a fact to the server, Proof reads it back and ticks —
with one difference: a library workout can land on **either of two habits**, so the RPC
(`get_library_days`) returns the habit alongside the date instead of a bare date.

| What it is | Ticks |
|---|---|
| A real session — strength, conditioning, on-court speed (25–45 min) | **WORKOUT** |
| A mobility flow or a physical recovery session (12–15 min) | **MOBILITY** |
| Anything in the **Breath** section — breath work with easy movement | **BREATHE** |
| A **warm-up** (15 min) | **nothing** |

**A warm-up ticks nothing because a warm-up is part of a session, not a session.** It is
still recorded on the server for the coach's report; Proof simply never hears about it.

The rejected alternative is the reason the split exists at all. If every library workout
ticked WORKOUT, a 12-minute foam roll would be worth the same as a 45-minute session —
and WORKOUT is 28.6% of the default day, so that hands every athlete a daily route to the
biggest habit on the list without training. It would also make the academy report
(below) say *trained* when they stretched.

**Nothing new is scored.** Both target habits already existed and already score
identically on the client and the server, so this added **no row to the scored-twice
table** (`XP_SYSTEM.md` §8) — no `xp_rules` key, no branch in `hab_bonus_xp()`, no new
`XP_RULES` constant. That was the point of choosing this shape over a bespoke "library
bonus XP", which would have been one more thing to keep in step.

Two things worth knowing:

- **The mapping lives on the server, in the workout's own `countsAs` field** — the
  client only reads it to decide what to *say* on the button. `log_library_session()`
  resolves it again from its own copy at write time and ignores the caller, so a
  tampered page cannot claim a foam roll was a session. An unrecognised or missing
  value counts for **nothing**: fail closed, so a workout published tomorrow can never
  inflate a score by accident.
- **MOBILITY is an add-on habit, so it only ticks if the athlete tracks it that day.**
  `importLibraryDays()` checks `rosterOn(day)` first. Writing a key the day's roster
  does not contain would add XP the day's *denominator* never counted — the day could
  read over 100%, and the server would score the stray key while the phone disagreed.
  WORKOUT is `core:true` and always in the roster, so it never trips this. Either way
  the session is still recorded for the coach.

SQL: `supabase/stage28_library_sessions.sql` — **applied and live**. `countsAs` on every
new workout is the `/workout` skill's job; it is required, and the skill says why.

#### ⚠️ Two of those three habits are add-ons, and add-ons start OFF

MOBILITY and BREATHE are opt-in. On 2026-09-12, **not one of 39 athletes had either
switched on** — so every mobility flow, recovery session and breath session on the shelf
would have paid exactly nothing, and said nothing about why. A feature that silently does
nothing is worse than one that is absent.

`renderLibOffer()` is the fix, and it is an **offer, not a correction**. When a library
session earns a habit the athlete is not tracking, `importLibraryDays()` drops the tick
(it must — see the denominator argument above) and records the habit in `LIB_OFFER`.
Today then shows one `.rcprompt` line: *"You did breath work — a workout you finished
counts towards this habit, but you are not tracking it yet."* Tapping it switches the
habit on, which lands **today**, exactly as the Settings switch does.

Nobody is opted into a scored habit behind their back — that is the whole reason
`defaultCfg()` starts add-ons off, and an athlete who is marked down for missing a habit
they never chose is the failure it exists to prevent. **There is no dismiss button and
none is needed**: the offer only appears within `LIB_OFFER_DAYS` (3) of a session that
earned it, so ignoring it is the dismissal, and doing another one brings it back.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
