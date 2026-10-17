# Career Mode: the folder

The whole gamification system, in files you can read, change and think about. **Nothing in the apps reads these files
yet (2026-10-17):** they are the design the build will follow. When a phase is built, a script turns the `.toml` files
into database rows, so changing a file and re-running it is how a detail changes later (GAME-10).

## What is here

| File | What it holds | Open it when you want to |
|---|---|---|
| [`CAREER_MODE.md`](CAREER_MODE.md) | The system: the loop, the four meanings, the pieces, recognition, missions, quests, the rules (GAME-1 to GAME-12), the decisions, the build order | Read and think about it |
| [`PROCEDURES.md`](PROCEDURES.md) | Every function, step by step: how a fact is made, how XP and levels are worked out, how rewards are minted, how missions are picked, how recognition is routed | See exactly how something is worked out, or change how it works |
| [`rulebook.toml`](rulebook.toml) | Every number: XP for each fact, the caps, the level curve, the shares, the season, Proof's habit values | Change what something is worth |
| [`badges.toml`](badges.toml) | Badges: qualities built over time, in tiers | Add a badge, change its tiers |
| [`achievements.toml`](achievements.toml) | Achievements: moments reached once | Add or change a moment |
| [`titles.toml`](titles.toml) | Titles and what earns each, plus Proof's card skins | Add a title, rename one |
| [`missions.toml`](missions.toml) | The weekly mission pool: plan, recovery, stretch and crew | Add a mission, change when one is picked |
| [`quests.toml`](quests.toml) | Personal quest templates and their steps | Add a quest |
| [`recognition.toml`](recognition.toml) | Who hears about what, Courtside, the Bell, Amir's tools, the WhatsApp lines | Change who is told, or the words |

## How to change something

| You want to | Edit |
|---|---|
| Make something worth more or less XP | `rulebook.toml` → that `[fact.…]` block → `xp` |
| Change how fast levels come | `rulebook.toml` → `[level]` → `base` (everything) or `growth` (the top end) |
| Rename a badge, title, mission or quest | its `name` in its file (the id in `[…]` never changes) |
| Change a badge's tiers | `badges.toml` → that badge → `tiers` |
| Change who hears about a moment | its `size` in its file, or what a size means in `recognition.toml` → `[size.…]` |
| Change a WhatsApp line | `recognition.toml` → `[message.…]` → `en` or `fa` |
| Add a mission or a quest | copy a block in `missions.toml` or `quests.toml` and change it |

Then run:

```bash
python scripts/check_career.py
```

It reads every file and refuses anything that breaks the rules: a reward with no meaning, a fact nobody defined, gold,
a mission with its own fixed XP (GAME-7), a title that doesn't exist, tiers out of order. Or just ask Claude to make the
change.

**An id never changes.** `[badge.held_weeks]`: `held_weeks` is the id that history is filed under. Change the `name`,
never the id.

## TOML in thirty seconds

```toml
# a line starting with # is a note: the scorer ignores it
[badge.held_weeks]          # starts the entry with the id held_weeks
name = "Held Weeks"         # text goes in quotes
free = false                # true or false
tiers = [                   # a list goes in square brackets
  { at = 4, metal = "bronze", xp = 200, size = "highlight" },
]
```

## The fields, file by file

The allowed words: **meanings** `consistency` · `commitment` · `progress` · `resilience`. **Sizes** `tick` · `win` ·
`highlight` · `milestone` · `legend`. **Metals**, low to high, `bronze` · `silver` · `emerald` · `amethyst` ·
`prismatic` (no gold, ever). **Slots** `plan` · `recovery` · `stretch` · `crew`. **Doors** `coach` · `cycle` ·
`athlete`. **Origin** `new`, or `proof` for something carried over from AA Proof as it is today.

**`rulebook.toml`**
- `version`, `meanings` (the four).
- `[level]` `base`, `growth`, `ranks`, `levels_per_rank`, `prestige_after`, `resets`.
- `[season]` `title_points`, … · `[week]` · `[share]` `mission`, `quest`, `mission_sweep`.
- `[habits]` `completion_bonus`, `daily_cap`, `max_custom`, `lapse_days`, `comeback_stick`, and `[habits.weights]`.
- `[fact.<id>]` `meaning` (one of the four, or `chosen` for a commendation, `quest` for a quest step, `none` for a
  social action), `xp` (a number) **or** `xp_from` (`habits` · `mission` · `quest` · `share.mission_sweep`), `source`
  (`training` · `proof` · `coach` · `server`), `pays_for` (`act` · `progress` · `nothing`), `when`, and `cap` if it has
  one.

**`badges.toml`** `[badge.<id>]`: `name`, `meaning`, `kind` (`best_run` · `total` · `per_habit_best_run` · `proof`),
`counts` (the fact or facts it reads; for `origin = "proof"`, `proof_codes` instead), `caption` (`{n}` is the number),
`free`, `origin`, `tiers`: a list of `{ at, metal, xp, size }` in rising order, each with an optional `title`. A
`per_habit_best_run` tier has `mult` instead of `xp`.

**`achievements.toml`** `[achievement.<id>]`: `name`, `meaning`, `reads` (a fact, or `proof`), `rule`, `xp`, `size`,
`caption`, `free`, `origin`, optional `title`, `proof_code` when carried over.

**`titles.toml`** `[title.<id>]`: `name`, `meaning` (one of the four, `chosen` or `season`), `from` (what earns it),
`metal`, `origin`, optional `template = true` when the name has a blank like `<MON YYYY>`. `[skin.<id>]`: `name`,
`from`, `origin`.

**`missions.toml`** `[mission.<id>]`: `name`, `slot`, `meaning`, `asks`, `counts` (a fact), optional `habit`, `measure`
(`count` · `units` · `days`), `target` (a number, or `plan_days`), `picked_when`, `free`, `origin`, `proof_xp` (what
Proof paid, kept for history). **Never an `xp` field:** a mission pays `share.mission` of the work inside it (GAME-7).

**`quests.toml`** `[quest.<id>]`: `name`, `meaning`, `weeks` (2 to 12), `doors`, `free`, `size`, `caption`,
`reward_badge`, optional `title`, `origin`, and `steps`, 2 to 5 of `{ name, closes_on, … }`: `closes_on = "fact"` with
`counts`, `target` and optional `habit`, `measure`, `within`, `run`; or `closes_on = "coach_tick"`.

**`recognition.toml`** `sizes` (the five), `[size.<size>]` with `athlete`, `coach`, `crew`, `beyond`; `[courtside]`;
`[bell]`; `[tool.reaction]`, `[tool.commendation]`, `[tool.amirs_pick]`; `[message.<id>]` with `en`, `fa`, `used_for`.
