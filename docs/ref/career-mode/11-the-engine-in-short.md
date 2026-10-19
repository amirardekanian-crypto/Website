## The engine, in short

The full account is in [`PROCEDURES.md`](../../../career/PROCEDURES.md). The shape:

- **Facts** (one ledger on the server): every meaningful action, once. Written by `observe()` from what the apps already
  save: a session, the Proof log, a coach action. Derived facts (a held week, a best, a comeback, a cycle finished) are
  written by the same step.
- **The rulebook** (`rulebook.toml`): what each kind of fact is worth, the caps, the level curve, the shares.
- **The catalogue** (`badges.toml`, `achievements.toml`, `titles.toml`, `missions.toml`, `quests.toml`,
  `recognition.toml`): every reward and every mission and quest, each a block of plain settings.
- **One scorer** (`score()`, `evaluate()`): XP, level and season points are worked out from facts with the current
  rules; rewards are minted once and kept; missions and quests move; recognition is routed.
- **One profile, two reads** (`get_profile()` and, since the phase 3 fix round, `get_awards()`): both apps ask the server for the same
  **core** profile (the numbers, the level, the ladder, the ids of every award owned, the moments to tell). The **shelf** (every badge row with
  the day of each tier, the milestones, the full titles list, the recent awards) is `get_awards()`, read by AA Proof only when Progress opens.
  Courtside and the Bell have their own reads.
- **Offline:** the phone keeps the last profile, the way it keeps the plan, and shows a tick's XP at once, marked
  pending, until the server agrees.
- **Proof's entries kept Proof's exact rules until the catalogue switch** (phase 3, on since 2026-10-18). Phase 1 runs in shadow and must match Proof's
  own scorer, so a design change to an `origin = "proof"` entry is written as `retire_at = "catalogue"` on the old entry
  and a new entry with `starts_at = "catalogue"` (`superseded_by` links them). Nothing an athlete sees changes before the
  XP switch, and the catalogue entries changed at the catalogue switch (both have happened).

---
*One section of the reference. The index is [`career/CAREER_MODE.md`](../../../career/CAREER_MODE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
