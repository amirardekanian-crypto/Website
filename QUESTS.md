# 🎯 Quests — the working list

The browsable file for **Proof's weekly quests**: what's running, what's in the bank,
and ideas to pull from. Read this when you want to *choose* quests.

The mechanics — how they're scored, why they're safe, how the app and the server agree
— live in **[`XP_SYSTEM.md`](XP_SYSTEM.md) §8.5**. This file is the catalogue.

> **Quests are a lever, not a feature.** There are **none** unless a run is started, and
> a run lasts **7 days from its start date**. When it ends the block disappears from the
> athlete's Today screen until the next one. That's the point — seeing quests means
> *something is on this week*.

---

## Right now

| | |
|---|---|
| **Running** | `FIFTY THOUSAND` + `THREE HARD DAYS` + `THE WELL RUNS DEEP` |
| **Window** | Mon 3 Aug → Sun 9 Aug 2026 |
| **Worth** | 600 XP |

Started 2026-08-02 with:

```sql
select public.set_quests('2026-08-03', array['w_steps50k','w_train3','w_water5']);
```

**Why this set** (Amir picked it after the 27 Jul run was reviewed). The previous week
ran `NO NEGOTIATION` + `LIGHTS OUT` — supplements and sleep, the two cheapest,
purely self-reported habits in the pool (`supps` carries the *lowest* weight of all
eight, 20). Elmira cleared both and took the board on **+320 quest XP** while walking
**500 steps a day** and never once finishing her water; Pegooli, who led base XP by 447,
finished third. Nothing was miscalculated — both scorers agreed to the XP — but a 140 XP
quest sitting on a 24 XP/day box is a 7× multiplier on the easiest thing in the app,
against 2.5× on `w_train3`. **When picking a set, check the multiplier against the
habit's weight, not just the headline XP.**

This set deliberately puts the XP on the two things that week let people skip — volume
(steps) and water — plus real sessions. Where the board actually stood over the previous
seven days, for sizing:

| | steps | sessions | full-water days |
|---|---|---|---|
| Amir | 68,000 | 3 | 7 |
| Pegooli | 51,500 | 2 | 6 |
| Nillish | 40,500 | 4 | ~4 |
| Dela | 39,500 | 1 | 0 |
| Pooya | 22,000 | 2 | 1 |
| Mehraneh | 16,500 | 1 | 1 |
| Elmira | 2,500 | 5 | 0 |

⚠️ 50k, not 70k: **nobody** cleared 70,000 steps that week — Amir topped the board at
68,000 — so `THE LONG WAY ROUND` would have gone unclaimed by everyone. A quest no one
can win is a dead block on the Today screen for seven days.

### Previous runs (kept — their XP still counts)

| Window | Quests | Worth |
|---|---|---|
| Mon 27 Jul → Sun 2 Aug 2026 | `NO NEGOTIATION` + `LIGHTS OUT` | 320 XP |

Check any time:

```sql
select rules -> 'questRuns' from public.xp_rules where id = 1;
```

---

## The three commands

Run these in the **Supabase SQL editor**.

```sql
-- start a run (any day in the week works; it runs 7 days from that date)
select public.set_quests('2026-08-03', array['w_water5','w_train3']);

-- cancel a run
select public.clear_quests('2026-08-03');

-- see what's set
select rules -> 'questRuns' from public.xp_rules where id = 1;
```

Re-running `set_quests` with the same start date **replaces** that run. Past runs stay
in the list on purpose — the XP athletes earned in them keeps counting, so only clear a
run you actually want to un-award.

---

## In the app right now — the 12 built quests

These ids work today. Everything else on this page is an idea until it's added to the
pool (see [Adding a new one](#adding-a-new-one)).

| id | Title | What it takes | XP |
|---|---|---|---|
| `w_perfect2` | **TWICE PERFECT** | Two clean sweeps | 300 |
| `w_steps70k` | **THE LONG WAY ROUND** | 70,000 steps | 280 |
| `w_train3` | **THREE HARD DAYS** | Three sessions | 250 |
| `w_water7` | **SEVEN FOR SEVEN** | Full water every day | 220 |
| `w_qualify5` | **FIVE ON TARGET** | 5 days at 75%+ | 220 |
| `w_steps50k` | **FIFTY THOUSAND** | 50,000 steps | 200 |
| `w_sleep5` | **LIGHTS OUT** | Sleep target 5 nights | 180 |
| `w_water5` | **THE WELL RUNS DEEP** | Full water on 5 days | 150 |
| `w_fuel5` | **ON THE RECORD** | Log meals on 5 days | 140 |
| `w_supps7` | **NO NEGOTIATION** | Supplements every day | 140 |
| `w_mob4` | **OILED HINGES** | Mobility on 4 days | 120 |
| `w_breathe4` | **DEAD CALM** | Breathe on 4 days | 100 |

---

## Ready-made weeks

Copy, paste, done. Each is a themed set of three.

**Recovery week** — for a heavy training block, or a deload.
```sql
select public.set_quests('YYYY-MM-DD', array['w_sleep5','w_mob4','w_breathe4']);
```
`400 XP` · leans entirely on the unglamorous stuff.

**Engine week** — when the goal is work capacity.
```sql
select public.set_quests('YYYY-MM-DD', array['w_steps70k','w_train3','w_qualify5']);
```
`750 XP` · the hardest of these sets. Don't run it two weeks running.

**Discipline week** — the small daily things nobody wants to do.
```sql
select public.set_quests('YYYY-MM-DD', array['w_supps7','w_water7','w_fuel5']);
```
`500 XP` · all "every day" habits, no volume targets.

**Get-back-on-it week** — after a bad stretch, or for a new intake.
```sql
select public.set_quests('YYYY-MM-DD', array['w_water5','w_mob4','w_breathe4']);
```
`370 XP` · deliberately the easiest set. Winnable by someone who has been off it.

**The gauntlet** — once a season, when they've earned the right to be tested.
```sql
select public.set_quests('YYYY-MM-DD', array['w_perfect2','w_steps70k','w_water7']);
```
`800 XP` · most athletes won't clear all three. That's the point.

---

## Idea bank — not built yet

Written in the shape the code takes, so any of these can be added in minutes. Pick
some, cross out the rest, add your own.

### Water
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| SIX OF SEVEN | Full water on 6 days | `daysHit:water` · 6 | 180 |
| DRIP FEED | Full water on 3 days (soft entry) | `daysHit:water` · 3 | 90 |

### Steps
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| EASY MILES | 35,000 steps | `total:steps` · 35000 | 140 |
| THE HUNDRED | 100,000 steps | `total:steps` · 100000 | 420 |
| ON YOUR FEET | Hit 10k on 5 separate days | `daysHit:steps` · 5 | 220 |

### Sleep
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| SEVEN NIGHTS | Sleep target every night | `daysHit:sleep` · 7 | 280 |
| THREE GOOD NIGHTS | Sleep target 3 nights | `daysHit:sleep` · 3 | 100 |

### Training
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| TWICE IS ENOUGH | Two sessions | `daysHit:strength` · 2 | 160 |
| FOUR ON THE FLOOR | Four sessions | `daysHit:strength` · 4 | 340 |

### Mobility & breathing
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| LOOSE CHANGE | Mobility on 6 days | `daysHit:mobility` · 6 | 170 |
| HINGE AND FLOW | Mobility every day | `daysHit:mobility` · 7 | 200 |
| QUIET RIOT | Breathe on 6 days | `daysHit:breathe` · 6 | 140 |
| STILL WATER | Breathe every day | `daysHit:breathe` · 7 | 160 |

### Food
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| NOTHING UNLOGGED | Log meals every day | `daysHit:fuel` · 7 | 200 |
| SHOW YOUR WORKING | Log meals on 3 days | `daysHit:fuel` · 3 | 90 |

### Whole-day
| Title | What it takes | `kind` · `need` | XP |
|---|---|---|---|
| ONE CLEAN SWEEP | One perfect day | `perfect` · 1 | 160 |
| THREE PERFECT | Three perfect days | `perfect` · 3 | 500 |
| HALF DECENT | 3 days at 75%+ | `qualify` · 3 | 120 |
| SEVEN FROM SEVEN | Every day at 75%+ | `qualify` · 7 | 420 |

---

## Adding a new one

A quest is four things: an id, some words, a measure, and a price.

```json
{ "id":"w_sleep7", "title":"SEVEN NIGHTS", "note":"Sleep target every night",
  "kind":"daysHit:sleep", "need":7, "xp":280 }
```

Only four `kind`s exist, because these are the only things measurable from the log
alone — which is what lets the app and the leaderboard agree:

| `kind` | Means |
|---|---|
| `daysHit:<habit>` | Completed that habit on N separate days of the run |
| `total:<habit>` | Accumulated N units across the run (target or not) |
| `qualify` | N days at 75% of the day's weight or better |
| `perfect` | N days with every tracked habit done |

Habit ids: `strength` (WORKOUT), `steps`, `sleep`, `fuel`, `water`, `mobility`,
`breathe`, `supps`.

**To add one, the pool has to move in two places** — the `quests` array on the Supabase
`xp_rules` row *and* `QUEST_POOL` in `habits.html`. An athlete with no signal scores off
the second one, and if they disagree their screen and the board will too. The exact SQL
is in [`XP_SYSTEM.md`](XP_SYSTEM.md) §8.5.

Names follow the house rule: **cool, not literal**. "THE WELL RUNS DEEP", with the plain
description in `note`.

---

## Ideas that need new code

Honest list — none of these work today, and each needs a new `kind`.

| Idea | What's missing |
|---|---|
| "Beat last week's steps" | Nothing compares one window to another |
| "Log everything before 10am" | The log stores **days**, not timestamps |
| "Train three days in a row" | Streaks aren't a quest measure (only a badge one) |
| "No zero days" | Would need a per-quest `qualify` threshold, not the fixed 75% |
| A quest for one athlete only | Quests are global by design — it's what keeps the board fair |
| "Beat someone on the board" | Quests can't read the leaderboard |

If you want any of these, say so and I'll add the kind.

---

## Choosing well

- **Two or three per run.** One feels thin, four stops feeling special.
- **300–750 XP for the run.** A perfect week of habits is ~2,900, so that's a 10–25%
  top-up — a bonus, not the game. Much past 750 and quests start to *be* the game.
- **Mix one gimme with one stretch.** If all three are hard, the athletes who most need
  the push are the ones who'll clear none of them.
- **Don't repeat a set back to back.** The whole value is that it's an event.
- **Match it to what you're coaching.** A recovery week during a heavy block says more
  than a generic step target.

---

## Links

- **[`XP_SYSTEM.md`](XP_SYSTEM.md) §8.5** — the mechanics: how quests are scored, why
  the XP is additive, how the season rule applies, the SQL to edit the pool.
- **[`HABITS.md`](HABITS.md)** — what Proof is and how the rest of it fits together.
- **[`supabase/stage14_quest_runs.sql`](supabase/stage14_quest_runs.sql)** — the schema,
  the two commands, and the scoring function.
