#### Habit names are TASKS, not nouns
They were labels — WORKOUT, STEPS, WATER — which is what the thing *is*, not what
the athlete has to do about it. A list of nouns reads as a filing system; a list of
instructions reads as a day's work. Each name now carries its own target
(*🚶 Walk 10,000 steps*, *💧 Drink 8 glasses*), so the row states the job before
anything is tapped, and `goal` — the second line — carries the coaching detail the
name has no room for rather than restating it.

**The `id` never changes.** Every log entry, level and leaderboard row is keyed on
it, so renaming is display-only and costs nobody a point. `weights` on the
`xp_rules` row is still keyed `strength`, not `session`, for the same reason.

Two of Amir's examples were deliberately *not* taken literally, because both would
have changed what is measured rather than what is displayed:
- **"3L of water"** — the log stores *glasses* (target 8). Switching the unit to
  litres would silently reinterpret every historical entry: a logged `8` becomes 8
  litres. Doing it properly needs a one-off conversion of every athlete's log.
- **"protein target"** — the log stores *meals* (target 3), not grams. The name
  points at protein (*🍗 3 protein meals*) without claiming to measure it. A real
  protein habit is a new tracked thing, not a rename.

Emoji were the one place the app broke its own rule (they have since spread to the
medals, the Settings rows, the board's top three and a habit's 🔥),
and glyph coverage genuinely varies by platform (🌬 rendered as a mangled box and
was swapped for 💨). They stay because a list of eight tasks scans faster with them.
Removing them is one edit to `HABITS[].name`.


---
*One section of the reference. The index is [`HABITS.md`](../../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
