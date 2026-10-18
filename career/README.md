# Career Mode: the folder

The whole gamification system, in files you can read, change and think about. **Phase 1 is live (2026-10-17), in
shadow:** `scripts/career_seed.py` turns the `.toml` files
into the server's rows (`career_rules`, `career_catalogue`), so
changing a file and seeding it again is how a detail changes (GAME-10). In phase 1 no Career Mode XP, badge or level reached an athlete; the one thing
they saw was Hold Serve on the training app's Home (2026-10-17), the held weeks the server judges with `rulebook.toml` → `[week]`.
**Phase 2, the XP switch, is done: applied to the live project on 2026-10-17 and switched on 2026-10-18**: `rulebook.toml` → `[switch] xp` is the switch
(*Turning a switch on*, below). Since then the career level and its XP reach both apps; Career Mode's badges wait for phase 3.
**Phase 3, the catalogue switch, is built and rehearsed (2026-10-18) but not applied; its switch is off.** `badges.toml`, `achievements.toml`,
`titles.toml` and `recognition.toml` carry the keys it reads (below). Their names, tiers, XP and sizes are drafts until Amir signs them off before the go-day.

## What is here

| File | What it holds | Open it when you want to |
|---|---|---|
| [`CAREER_MODE.md`](CAREER_MODE.md) | The system: the loop, the four meanings, the pieces, recognition, missions, quests, the rules (GAME-1 to GAME-14), the decisions, the build order | Read and think about it |
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
| Add a tier to a badge | `badges.toml` → that badge → `tiers`: **add it at the END**, then `python scripts/career_seed.py --write-lock` and commit `career/tiers.lock.json` |
| Change how many full-screen moments an app opens, or for how long one waits | `recognition.toml` → `[moments]` |

Then run:

```bash
python scripts/check_career.py
```

It reads every file and refuses anything that breaks the rules: a reward with no meaning, a fact nobody defined, gold,
a mission with its own fixed XP (GAME-7), a title that doesn't exist, tiers out of order, a switch that is neither `"off"` nor a
day, and, until the catalogue switch, a habit number that is not Proof's own (`supabase/xp_rules_snapshot.json`). Or just ask
Claude to make the change.

Then seed it, so the server scores with it (Claude does this with the Supabase tool; it re-works every athlete's facts):

```bash
python scripts/career_seed.py --out "$TEMP/career-seed.sql"
```

The file holds one `select public.career_seed(…)` statement. Run it on the project, then `select public.career_compare()`
must still say `"ok": true`. `select version, source, loaded_at from career_rules` says which files
the server was last seeded from (`source` is the sha256 the seed prints). `node scripts/career/rehearse.mjs` (PGlite, nothing live) proves a
change to `supabase/stage66_career_mode.sql` before it is applied, and `node scripts/career/rehearse_switch.mjs --backup <file>` one to
`supabase/stage69_career_xp_switch.sql` (on a backup of the real rows, kept outside the repo), and `node scripts/career/rehearse_catalogue.mjs --backup <file>`
one to `supabase/stage70_career_rewards.sql` and `scripts/career/rollback_stage70.sql` (PGlite in a scratch folder, `PGLITE=<scratch>/node_modules/@electric-sql/pglite`;
`--write-cases` rewrites `scripts/career/reward_cases.json`, the answers the phones' copies are held to; `--report <file outside the repo>` writes the go-day list).

### Turning a switch on

`rulebook.toml` → `[switch]` holds the two switches: `xp` (phase 2: training earns XP, the WORKOUT habit pays 0 a day, closed days
settle, the level is the career level and never resets) and `catalogue` (phase 3: the entries with `retire_at` / `starts_at =
"catalogue"`). Each is `"off"` until it is turned on, on Amir's yes only:

1. Bump `version`, set the switch to today's date (the XP switch went on this way with `xp = "2026-10-18"`), and run `python scripts/check_career.py`.
2. `python scripts/career_seed.py --dry-run --out "$TEMP/career-switch-dry.sql"`, run it on the project: everything is worked out,
   then undone. For the XP switch it answers every athlete's line (Proof's level, the career level, the level kept), the list Amir
   reads first. Nobody's level goes down: an athlete below their best Proof level is kept at it (`[fact.level_kept]`).
3. On his yes, the same without `--dry-run`, then `select public.career_compare()`, and commit the file the same day, with
   `privacy.html` §2.3 brought up to date in that commit for the XP switch (`PROCEDURES.md` → P14, step 5).

A switch once on never goes back off: the seed refuses it (the way back is `scripts/career/rollback_stage69.sql`, on Amir's word only).

**The catalogue switch is different** (phase 3, stage70). It changes no number: Proof's habit tiers and milestones stop being paid by the daily score and
are paid once in a career as awards, the same crossing day at the same XP, so no level drops. It is turned on in its own seed, with **nothing else
changed**, at the **same rulebook version** (a bump would tell every athlete the XP system was updated), on today's day (or yesterday's), and after the XP
switch. The server refuses anything else. The order, with a statement per line from `python scripts/career_seed.py --catalogue-steps [--day YYYY-MM-DD]`:

1. Amir has answered D1, D10 and D11 (`CAREER_MODE.md` → *round 4*), and `python scripts/check_career.py` passes.
2. Backup (coach.html → ⚙ Tools → ⤓ Backup).
3. `career_catalogue_before(offset, 5)`, offsets 0 to 95: each athlete's score under the old rules. An answer with no lines means the list ended.
4. `career_catalogue_preview(rules, offset, 5)`: the dry run. One line per athlete (XP and level before and after, season points before and after, the
   back-pay, what Proof's tiers came to against what the awards carry, `ok`). Everything is undone. Amir reads every line.
5. On his yes: set `catalogue = "<today>"` in `rulebook.toml` (the same `version`), run `python scripts/career_seed.py`, execute its one statement.
6. Straight after: `career_rewards_batch(offset, 5, 'baseline')`, offsets 0 to 95, until a batch answers with no lines. Every line `ok`.
7. `select public.career_compare()` must say `"ok": true`.
8. Commit the toml with its date, `privacy.html` §2.3 with its *Last updated*, the rewritten `APP_GUIDE` phrasing and the docs. 14 days later,
   `drop table backup.career_catalogue_before`.

Do one statement per call. The way back is `scripts/career/rollback_stage70.sql`, on Amir's word only (dry first), then commit the toml with `catalogue = "off"`.

**An id never changes.** `[badge.held_weeks]`: `held_weeks` is the id that history is filed under. Change the `name`,
never the id.

## TOML in thirty seconds

```toml
# a line starting with # is a note: the scorer ignores it
[badge.held_weeks]          # starts the entry with the id held_weeks
name = "Hold Serve"         # text goes in quotes
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
  social action, `carried` for the level kept at the XP switch), `xp` (a number) **or** `xp_from` (`habits` · `mission` ·
  `quest` · `share.mission_sweep` · `value`: the fact's own number, with `career_only = true` so it never counts toward a
  season), `source` (`training` · `proof` · `coach` · `server`), `pays_for` (`act` · `progress` · `nothing`), `when`, and
  `cap` if it has one.
- `[switch]` `xp` and `catalogue`: `"off"`, or the day the switch was turned on (*Turning a switch on*, above).

**`badges.toml`** `[badge.<id>]`: `name`, `meaning`, `kind` (`best_run` · `total` · `per_habit_best_run` · `best_value` ·
`proof`; `best_value` is the largest value its fact has reached, such as a percent), `counts` (the fact or facts it
reads; for `origin = "proof"`, `proof_codes` instead), optional `habit` (reads only that habit's facts: one of
`[habits.weights]`), `caption` (`{n}` is the number), `free`, `origin`, `tiers`: a list of `{ at, metal, xp, size }` in
rising order, each with an optional `title` (a habit's ladder also has `tier_name`). A `per_habit_best_run` tier has
`mult` instead of `xp`. For a change that takes effect at the catalogue switch (phase 3), optional:
- `retire_at = "catalogue"`: earned as Proof earns it until phase 3, never after. Anyone who has it keeps it.
- `starts_at = "catalogue"`: not earned before phase 3. Its history is minted at the switch and **pays 0** (the entry it replaces already paid it).
- `superseded_by`: the id, or list of ids, of the entry that takes its place.

Phase 3's keys on a badge:
- `run` (a `best_run` badge, required): what a run is. `plan_weeks` = held weeks in a row on the plan's own weeks (counts `week_held`); `days` = days in a
  row a habit is done (counts `habit_done`, and needs `habit`); `iso_weeks` = calendar weeks (Monday to Sunday) in a row holding the fact.
- `history_twin_counts` (on a `starts_at` badge): the fact kind of the Proof badge it widens (`comebacks` uses `comeback_stuck`). A history crossing pays
  only when that kind alone had not reached the tier (decision D14).
- **`tiers` are APPEND-ONLY once the catalogue switch is on** (rule 21): a tier's place in the list is its award's id (`badge:held_weeks:2`), so add a new
  tier at the END. Never insert, reorder or remove one. A tier's `at`, `xp` and `size` may still change (a retune re-prices every athlete like any fact,
  D12; `metal` is part of the lock). `career/tiers.lock.json` holds the first metals of every badge; after adding a badge or a tier run
  `python scripts/career_seed.py --write-lock` (it runs the checker first) and commit the file.

That is how a design change reaches an `origin = "proof"` entry before the catalogue switch: the old entry only gains
`retire_at` and `superseded_by`, and its numbers stay Proof's (`check_career.py` still compares them).

**`achievements.toml`** `[achievement.<id>]`: `name`, `meaning`, `reads` (a fact, or `proof`), `rule`, `xp`, `size`,
`caption`, `free`, `origin`, optional `title`, `proof_code` when carried over, and the catalogue switch's keys `retire_at`,
`starts_at` and `superseded_by` as on badges (an achievement may be superseded by a badge: THE MACHINIST by CENTURY).
Phase 3 adds **`test`** (required; one of `first`, `proof`, `goals`, `cycle_all_held`, `cycle_by_the_book`, `cycle_with_broken`, `runs_together`,
`best_value`, `patterns_in_cycle`, `cycle_proving`, `run_regained`) with exactly that test's own keys and no others (rule 18): `proof` needs
`proof_measure` and `proof_need`; `goals` needs `goals` = a list of `{ kind, need }` (`kind` is `daysHit:<habit>`, `total:<habit>`, `qualify`, `perfect`,
`comebacksStuck` or `comebackRun`; this is how the five events are written); `runs_together` needs `habits` and `run`; `best_value` needs `at`;
`patterns_in_cycle` needs `groups`; `cycle_proving` needs `bests` and `retests`; `run_regained` needs `away_weeks`. `rule` stays as the words for a human.

**`titles.toml`** `[title.<id>]`: `name`, `meaning` (one of the four, `chosen`, `season`, `level` for the road's titles,
or `all` for the Grand Slam, which the engine mints when an athlete holds a title in each of the four), `from` (what
earns it), `metal`, `origin`, optional `template = true` when the name has a blank like `<MON YYYY>`, and `retire_at` /
`superseded_by` as on badges. Phase 3 adds `size` (only on the Grand Slam, `legend`: how big its own moment is; the other titles ride on the
moment of the award that minted them, rule 19). `[skin.<id>]`: `name`, `from`, `origin`.

**`missions.toml`** `[mission.<id>]`: `name`, `slot`, `meaning`, `asks`, `counts` (a fact), optional `habit`, `measure`
(`count` · `units` · `days`), `target` (a number, or `plan_days`), `picked_when`, `free`, `origin`, `proof_xp` (what
Proof paid, kept for history), and `retire_at` / `superseded_by` as on badges. **Never an `xp` field:** a mission
pays `share.mission` of the work inside it (GAME-7).

**`quests.toml`** `[quest.<id>]`: `name`, `meaning`, `weeks` (2 to 12), `doors`, `free`, `size`, `caption`,
`reward_badge`, optional `title`, `origin`, and `steps`, 2 to 5 of `{ name, closes_on, … }`: `closes_on = "fact"` with
`counts`, `target` and optional `habit`, `measure`, `within`, `run`; or `closes_on = "coach_tick"`.

**`recognition.toml`** `sizes` (the five), `[size.<size>]` with `athlete`, `coach`, `crew`, `beyond`; `[courtside]`;
`[bell]`; `[tool.reaction]`, `[tool.commendation]`, `[tool.amirs_pick]`; `[message.<id>]` with `en`, `fa`, `used_for`. Phase 3 adds `[moments]`:
`per_open` (the most full-screen moments of ANY kind an app opens in one visit, 1), `keep_days` (a full-screen award not shown in this many days
becomes a wins-card line, 14), `max` (the most moments one answer carries, 8) and `full_screen` (the sizes that open full-screen, `milestone` and `legend`).
