## P17. Instant feedback: every meaningful action answers at once (GAME-13)

Amir, 2026-10-17: *"we need to show the client a visible progress and immediate feedback every time a meaningful task is
completed."*

**When:** every tap that makes a fact (P1): a habit ticked, a session finished, the check-in answered, a mission or a
quest step closed. A set logged mid-session is part of its session: its row ticks as it does today, and the session's
feedback comes at the finish.

**Reads:** the phone's copy of the rulebook (`career_rules`, kept on the phone the way the plan is), the last profile
(`get_profile()`, P10), `recognition.toml` → `[feedback]` and its lines.

**Steps:**
1. In the same moment as the tap, before any network call, the app works out what the action is worth from the
   rulebook (the preview, P13).
2. It shows three things, on the thing tapped:
   - **what it earned:** +XP, rising from the row or the button;
   - **where it moved them:** the level bar fills, and the meaning's number ticks up (a held week, a session, a best);
   - **the nearest goal it touched**, with its new count: a badge's next tier (*Paper Trail 9 of 10*), this week's
     mission (*Lights Out 3 of 5*), the quest step.
3. If the action completes something the phone can decide (a habit tier, a mission, a quest step), its moment shows
   right then, at its size (P8). If only the server can decide it (a personal best, a held week, a cycle finished), the
   phone shows it at once, marked pending.
4. When the server answers, its numbers replace the preview (GAME-2). A pending moment is confirmed. If the server ever
   disagrees, the moment is quietly withdrawn and the copy that disagreed is a bug in a twin (P13).
5. **The finish card** of a session lists everything that session earned before Done closes it: the XP, the week
   (*2 of 3 · Hold Serve*), and every badge, mission and quest step it moved.
6. **Progress is always visible**, not only at the moment: the level bar and the four numbers sit where the athlete
   looks (AA Proof's Today card, the strip on the training app's Home), each with its *next* line.
7. Nothing changes silently. A number never moves on screen without the athlete seeing it move.

**Writes:** nothing (the server writes the facts, P1).

**Rules:** GAME-2, GAME-13. The preview copies server rules, so every rule it copies goes into `scripts/check_twins.js`
the same day.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
