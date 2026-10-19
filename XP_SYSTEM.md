# The XP system — AA Proof (`habits.html`)

Everything you can tune about levels, XP and achievements, and what changes when you do.
This is the document to read before touching progression.

> **The one rule that makes this safe:** XP and levels are **never stored**. They are
> recalculated from the athlete's logged history every time the app opens. So if you
> change a number in here, every athlete's XP and levels are **rescored automatically**
> against everything they have already done — no migration, no reset, nothing lost.
> The app notices the change, quietly re-baselines, and shows them
> "XP system updated — your levels were rescored." It will **not** fire a hundred
> level-up celebrations they didn't earn today.

**Once Career Mode's XP switch is on** (phase 2, applied to the live project 2026-10-17 and switched on 2026-10-18: `HABITS.md` → *Career Mode (phase 2, the XP
switch)*) this still holds for the rules, with two changes. The overall level is the career level and never resets (§7), and the
career's numbers live in `career/rulebook.toml` as well as here (§8). The server also keeps a working copy of each athlete's numbers
(`career_scores`) so the board loads fast. It is worked out again from the facts whenever they change, and nothing in it is a
source.

**Career screens off (2026-10-19, Career Mode round 5 step 3):** `habits.html` no longer DRAWS the career. There is no rank name, no Locker tab, no title, no
badge shelf, no four numbers, no first-open reveal and no level-up, reward or award takeover. This is display only. **No number in this file moved.** Habit
XP is earned, scored and synced exactly as before, `scoreDays()`, `paidXp()`, `bonusEvents()` and `levelInfo()` are untouched, and the twins still agree.
A level is a number and a bar in AA Proof, and AA Performance shows the rest (`HABITS.md` → *Career screens off*). Sections 3 and 5 below say what is no
longer drawn. The server keeps scoring and minting as before until "the cut" (round 5, step 4).

**Once Career Mode's catalogue switch is on** (phase 3, `supabase/stage70_career_rewards.sql`, built and dormant on 2026-10-18:
`HABITS.md` → *Career Mode, phase 3*) the consistency tiers and the milestones stop being Proof's: every badge tier and milestone
is an **award** the server mints once in a career and pays through the facts, from `career/badges.toml` and
`career/achievements.toml`. §4, §4.5, §4.6, §5 and §8 below each say what changes then. Until it is on, nothing here changes.

---


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [Where the settings live](docs/ref/xp-system/01-where-the-settings-live.md) | 4 KB |
| 02 | [1. What each habit is worth](docs/ref/xp-system/02-1-what-each-habit-is-worth.md) | 6 KB |
| 03 | [2. The level curve](docs/ref/xp-system/03-2-the-level-curve.md) | 5 KB |
| 04 | [3. Ranks](docs/ref/xp-system/04-3-ranks.md) | 2 KB |
| 05 | [4. Consistency ladders](docs/ref/xp-system/05-4-consistency-ladders.md) | 2 KB |
| 06 | [4.5 What the badges pay, and why it is safe](docs/ref/xp-system/06-45-what-the-badges-pay-and-why-it-is-safe.md) | 10 KB |
| 07 | [4.6 Milestones come in MARKS](docs/ref/xp-system/07-46-milestones-come-in-marks.md) | 3 KB |
| 08 | [5. Celebrations](docs/ref/xp-system/08-5-celebrations.md) | 11 KB |
| 09 | [6. The day score, and day streaks](docs/ref/xp-system/09-6-the-day-score-and-day-streaks.md) | 8 KB |
| 10 | [6.4 Body weight pays NOTHING — and that is the whole design](docs/ref/xp-system/10-64-body-weight-pays-nothing-and-that-is-the-whole-de.md) | 2 KB |
| 11 | [6.5 The backfill window](docs/ref/xp-system/11-65-the-backfill-window.md) | 1 KB |
| 12 | [6.6 The comeback — the one thing you cannot earn by never slipping](docs/ref/xp-system/12-66-the-comeback-the-one-thing-you-cannot-earn-by-nev.md) | 3 KB |
| 13 | [7. Seasons — how scoring resets](docs/ref/xp-system/13-7-seasons-how-scoring-resets.md) | 8 KB |
| 14 | [8. The leaderboard scores on the server — so XP lives in TWO places](docs/ref/xp-system/14-8-the-leaderboard-scores-on-the-server-so-xp-lives-i.md) | 15 KB |
| 15 | [8.5 Quests — a run you start, not a standing feature](docs/ref/xp-system/15-85-quests-a-run-you-start-not-a-standing-feature.md) | 7 KB |
| 16 | [9. What happens when you change any of this](docs/ref/xp-system/16-9-what-happens-when-you-change-any-of-this.md) | 1 KB |
| 17 | [10. Never losing progress](docs/ref/xp-system/17-10-never-losing-progress.md) | 1 KB |
| 18 | [11. Roll call — the one thing here that pays nothing](docs/ref/xp-system/18-11-roll-call-the-one-thing-here-that-pays-nothing.md) | 1 KB |
| 19 | [12. Open economy decisions](docs/ref/xp-system/19-12-open-economy-decisions.md) | 1 KB |

---

*19 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`XP_SYSTEM.md` → *Section*" is the row with that name.*
