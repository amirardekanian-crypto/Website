## What exists today, and where it goes

Nothing built is thrown away. Proof's game becomes the habits half of the system, and everything already owned stays
owned. The rows below say *until* or *at the catalogue switch*: that switch has been on since 2026-10-18, so they describe what changed.

| Today | In Career Mode |
|---|---|
| Proof's XP weights and level curve (`XP_RULES`, the `xp_rules` row) | The rulebook. Habits keep their values, training joins, the curve is re-anchored |
| WORKOUT's 100 XP a day | Moves into the session fact (400) at the XP switch (phase 2). The habit stays on the day's list for the day streak, paying 0 a day; its weight still counts in the day gate and its tiers until the catalogue switch |
| Consistency tiers, KINDLED to UNBREAKABLE | Unchanged until the catalogue switch. Then each habit keeps one badge, its Proof name, on these five steps (one behaviour, one badge) |
| 32 milestones in marks, 5 events | Badges and achievements, each given its meaning (`badges.toml`, `achievements.toml`, `origin = "proof"`). At the catalogue switch HEAVY METAL (sessions on days in a row) and THE MACHINIST (Century's double) stop being earned; anyone who has one keeps it |
| The comeback, BACK IN THE FIGHT, HARD TO KILL, UNBOWED | Resilience, unchanged |
| The 14-reward road of titles and card skins | Stays: level titles and skins |
| Seasons and season titles | From the XP switch: seasons rank the board by season points; levels stop resetting. A season's title is earned by season points (`rulebook.toml` → `[season]`), and a season's record keeps its points and the career level at its end |
| `hab_titles` | Awards. Every title owned stays owned |
| Quest week and its 12 quests | Missions (`missions.toml`, `origin = "proof"`); the crew's run becomes the crew mission |
| The wins card and the full-screen moments | The athlete's column of recognition |
| Five share cards | Stay, in Proof's look. The training's five are built (Highlight Reel, 2026-10-17: New Best, Same Effort, Retest, Signed Off, The Distance), and every reward's card is drawn in the same family for phase 3 (GAME-14) |
| The board | Ranks season points, with titles beside names |
| Roll call | Stays, and still pays nothing |
| The training app's wins (`cycleWins()`) and automatic Personal Records | Progress facts |
| Round 3's ideas | Hold Serve is Consistency's held weeks. Courtside and the Bell are Amir's column and the crew's. Century Club is Commitment. Amir's Pick is his tool. The Win Ledger is the fact ledger |

---
*One section of the reference. The index is [`career/CAREER_MODE.md`](../../../career/CAREER_MODE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
