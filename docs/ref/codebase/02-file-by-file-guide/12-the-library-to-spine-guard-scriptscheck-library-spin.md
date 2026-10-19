### The Library-to-Spine guard (`scripts/check_library_spine.py`, 2026-10-09)

Pre-commit guard 14, run whenever a file in `workouts/` is staged. Every card and circuit item in a Library
session carries the `exId` of its Spine entry, which is where its video, cues and About sheet live. A card
without one blocks the commit unless its name is on `scripts/library_spine_baseline.json`: `not_exercises`
(the breathing drills, the warm-up sets) or `to_draft` (names still waiting for a `/spine` entry, which only
shrinks: `--update`). It also fails a card whose name is not its entry's name exactly (one name, Amir 2026-10-09; this
part reads `get_exercises()` and is skipped, with a message, when the Spine cannot be reached). `--online` lists
the drafts still waiting for Amir; `--list` prints every unlinked card.

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
