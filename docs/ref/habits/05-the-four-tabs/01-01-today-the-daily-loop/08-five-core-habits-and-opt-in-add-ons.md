#### Five core habits, and opt-in add-ons
(Amir, 2026-07-30.) **`core: true`** on five — train · steps · sleep · protein · water.
Always tracked, **no off switch**: `live()` honours `core` whatever `CFG.on` says, so even
an athlete who switched one off before this existed gets it back, dated today, with nothing
behind them moving. The same five for everyone is what makes a day score mean the same
thing across the whole board.

Everything else — mobility, breathing, supplements, anything custom — is an **add-on**,
worth real points on top, and **once switched on it counts**.

**The two rules in `stampRoster()`, which are the answer to "why did Friday change
Wednesday":**

| | takes effect |
|---|---|
| Switching an add-on **on** | **today** — you opted in, and today is still yours to finish |
| Switching one **off** | **tomorrow** — or dropping it at 23:00 would delete a miss you already made |

Neither ever reaches a closed day; `rosterOn(day)` still reads the entry in force on that
day. `lockedOnToday()` is what lets a switched-off row still say *"still counts today"*.
Settings carries the whole rule as **permanent copy**, not a toast — someone who switched
something on three weeks ago should still be able to find out why it is counting.

**Switching one ON is a two-tap confirm, not a toast, because a toast is easy to have
never read** (Amir, 2026-07-30). A first tap on an add-on's switch only **arms** it — the
switch outlines in clay and the row's own meta line restates the rule in place ("Tap
again to turn it on — you cannot turn it back off until tomorrow"); nothing in `CFG.on`
changes yet. A second tap, within `_confirmOnTimer`'s 3.2s window, actually commits it,
clears `UI.confirmOnId`, and shows the existing toast. Missing the window — tapping
elsewhere, waiting it out — disarms with no side effect at all: `CFG.on` was never
touched by the first tap. Turning one **off** stays a single, immediate tap; there is
nothing to confirm on the direction that never takes effect before tomorrow anyway.

Proven against a nine-day log: adding supps today leaves Wednesday at 100% and takes today
to 93%; switching it straight back off leaves today at **93%** (the dodge fails) and dates
the removal to tomorrow. No SQL changed — the timeline format is the same, so
`hab_bonus_xp` reads it exactly as before.


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
