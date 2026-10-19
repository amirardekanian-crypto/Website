# 🎯 AA Proof — the habit app brief

The "what this app actually is" context doc for **`habits.html`**, the daily habit
tracker that sits alongside the training programme. Pair it with
**[`XP_SYSTEM.md`](XP_SYSTEM.md)** (every tunable number and what changes when you
move it) and **[`CODEBASE.md`](CODEBASE.md)** (the technical file-by-file map).

Start here if you're picking this up in a fresh chat.

> **⚠️ Keeping this honest.** When you change how the app works, these move together, in
> the same PR, or the next chat is working from a lie:
>
> 1. **this file** — what the app is and what each tab does;
> 2. **`XP_SYSTEM.md`** — if you touched XP, levels, ranks, consistency, pacing or anything
>    scored (its §8 is the table of everything scored twice, in `habits.html` *and* on the
>    `xp_rules` row);
> 3. **`QUESTS.md`** — if you touched a quest;
> 4. **the in-app manual's prose** — `renderManual()` in `habits.html`, which athletes reach
>    from the initials button top-right → *The manual*. Its **numbers** read the live
>    constants, so retuning XP never breaks them; its **prose** does not, so a change of
>    *behaviour* means rewriting it by hand;
> 5. **`privacy.html`** — if you changed what data is stored or shared;
> 6. **`tourSteps()`** — the five-step tour points a box at real controls and says out
>    loud what each one does. Move a button, rename a tab or change what a tap does and it
>    is actively lying, on the first screen a new athlete sees.

---


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [Career screens off (2026-10-19, Career Mode round 5 step 3)](docs/ref/habits/01-career-screens-off.md) | 5 KB |
| 02 | [The product in one breath](docs/ref/habits/02-the-product-in-one-breath.md) | 0 KB |
| 03 | [How an athlete gets in](docs/ref/habits/03-how-an-athlete-gets-in.md) | 8 KB |
| 04 | [Two kinds of user — coached, and free](docs/ref/habits/04-two-kinds-of-user-coached-and-free.md) | 5 KB |
| 05 | [The four tabs](docs/ref/habits/05-the-four-tabs/INDEX.md) | 67 KB · 8 parts |
| 06 | [Body weight — MOVED OUT, 2026-09-12](docs/ref/habits/06-body-weight-moved-out-2026-09-12/INDEX.md) | 25 KB · 2 parts |
| 07 | [The tour — the game-style first run](docs/ref/habits/07-the-tour-the-game-style-first-run.md) | 4 KB |
| 08 | [The long game — rewards a season cannot take](docs/ref/habits/08-the-long-game-rewards-a-season-cannot-take/INDEX.md) | 26 KB · 3 parts |
| 09 | [The eight habits](docs/ref/habits/09-the-eight-habits/INDEX.md) | 22 KB · 4 parts |
| 10 | [How progression works](docs/ref/habits/10-how-progression-works.md) | 10 KB |
| 11 | [Days are settled units](docs/ref/habits/11-days-are-settled-units.md) | 4 KB |
| 12 | [How it feels — the motion layer](docs/ref/habits/12-how-it-feels-the-motion-layer.md) | 5 KB |
| 13 | [Seasons — scoring resets on command](docs/ref/habits/13-seasons-scoring-resets-on-command.md) | 1 KB |
| 14 | [Career Mode (phase 2, the XP switch)](docs/ref/habits/14-career-mode-phase-2-the-xp-switch.md) | 12 KB |
| 15 | [Career Mode, phase 3 (the catalogue switch)](docs/ref/habits/15-career-mode-phase-3-the-catalogue-switch.md) | 11 KB |
| 16 | [The leaderboard](docs/ref/habits/16-the-leaderboard.md) | 10 KB |
| 17 | [Never losing progress](docs/ref/habits/17-never-losing-progress.md) | 5 KB |
| 18 | [Voice](docs/ref/habits/18-voice.md) | 2 KB |
| 19 | [Open question — automatic steps](docs/ref/habits/19-open-question-automatic-steps.md) | 1 KB |

---

*19 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`HABITS.md` → *Section*" is the row with that name.*
