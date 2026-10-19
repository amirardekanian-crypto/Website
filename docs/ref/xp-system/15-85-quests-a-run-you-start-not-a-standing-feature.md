## 8.5 Quests — a run you start, not a standing feature

Quests are a **lever**, not a background system. There are **none** unless you start a
run, and a run lasts **seven days from the day it starts** — not Monday to Sunday. The
run is drawn on **Progress** (it moved off Today) as the event-style quest card;
when it ends, that section falls back to one muted line until you start another.

That is deliberate: an athlete seeing quests means *something is on this week*. If they
were always there they would be wallpaper.

### 🎯 Starting a run

The everyday lever is **coach.html → Today → *Quest week***: tick one to four quests from
the pool and press *Start the week* — a dashboard run always starts **today** — and
*End this run today* while one is live (it keeps the XP already earned, see *Ending a run early* below). The SQL below does the same job and is the way to
back-date or future-date a run:

```sql
select public.set_quests('2026-07-29', array['w_water5','w_steps50k','w_perfect2']);
```

Runs 29 July → 4 August inclusive. Pass however many ids you like — one, three, five.
Re-running it with the same start date **replaces** that run.

**Ending one early, keeping what was earned** (stage55, 2026-10-11, Amir: *"yes, they keep it"*):

```sql
select public.end_quests('2026-07-29', '2026-07-31');   -- the run's last day is 31 July
```

**Taking a run's XP back on purpose** (the SQL editor only; the dashboard no longer offers it):

```sql
select public.clear_quests('2026-07-29');
```

**Seeing what is set:**

```sql
select rules -> 'questRuns' from public.xp_rules where id = 1;
```

Past runs are kept on purpose — the XP athletes earned in them keeps counting. Clearing
a *finished* run would retroactively take those points away.

**Overlapping runs are CLIPPED, in both scorers** (2026-08-02). `set_quests()` accepts any
start date and only replaces a run starting on the *same* one, so a mid-week start used to
leave two runs covering the same days — and since `questEvents()` walks every run
independently, as does `hab_bonus_xp()`, a quest id present in both **paid twice** off one
stretch of logging. Both scorers did it identically, so the board and the phone agreed and
were both wrong: the hardest kind of error to notice here.

**Ending a run early** (stage55). `end_quests(start, end)` does not remove the run: it gives it an `end` day (capped
at its seventh day; an end before the start drops a run that had not begun, since nothing was earned in it). The run's
window is then the earliest of three bounds: its seventh day, the day before the next run starts, and its own `end`. Both
scorers read it, in the same place: `hab_bonus_xp()`'s `qruns` CTE (`least(rstart + 6, next_start - 1, own_end)`) and
`runEndKey()` in `habits.html`. A quest completed on or before the end day keeps paying (it pays once, on the day it
completes, as always); one not completed by then never pays. The run stops being live the day after, so the quest block
leaves the athlete's Progress screen. A value that is not a `YYYY-MM-DD` date in `end` is ignored by both.
`scripts/test_quest_runs.js` (pre-commit guard 16) and `scripts/test_spine_sql.sh` section J run the same cases against the
two sides. `rulesSignature()` includes the `end`, so ending a run re-baselines quietly instead of celebrating.

A run's window now ends **the day before the next run starts** — a later run simply takes
over, which is the same rule `activeQuestRun()` already used for display (coach.html's `questRunEnd()` / `activeQuestRun()` are the twins since
2026-10-11, guarded by `scripts/check_twins.js`). `runEndKey()` on
the client and the `qruns` CTE's `least(rstart + 6, next_start - 1)` on the server. Proven
to agree on the live database: runs starting 27 July and 31 July clip the first to
**30 July** on both sides, against a natural end of 2 August.

You can now start a run whenever you like; the overlap simply hands over.
>
> `rulesSignature()` now includes the quest pool and the run list. It is the one scoring
> input the server can change while the app is running — `fetchQuests()` overwrites it at
> every launch, before `checkLevelUps()` reads a level — so retuning a quest's payout used
> to hand athletes a full **LEVEL UP** takeover for XP nobody earned that day, and lowering
> one dropped their level with no word of explanation. Both now re-baseline quietly.

Both commands are **coach-only**: they reject any signed-in user who is not Amir, and
are not callable by athletes at all. They deliberately *do* work from the Supabase SQL
editor, which carries no JWT — an earlier version guarded on the email alone and locked
the coach out of his own command.

> The log stores **days**, not timestamps, so a run starts at the beginning of its start
> date rather than at the hour you ran the command. "Live from Wednesday" means all of
> Wednesday.

### The quest pool

**[`QUESTS.md`](../../../QUESTS.md) is the catalogue** — the twelve built quests with their ids
and XP, ready-made themed weeks you can copy-paste, an idea bank for new ones, and
guidance on choosing. Look there when you want to *pick* quests; this section is the
mechanics.

Keeping the list in one place is deliberate: a pool table copied into two documents goes
stale the first time one is edited.

### The shape of a quest

```json
{ "id":"w_water5", "title":"THE WELL RUNS DEEP", "note":"Full water on 5 days",
  "kind":"daysHit:water", "need":5, "xp":150 }
```

| `kind` | Means |
|---|---|
| `daysHit:<habit>` | Completed that habit on N separate days of the run |
| `total:<habit>` | Accumulated N units across the run (target or not) |
| `qualify` | N days that pass `dayQualifies()` — `streakQualifyPct` of the day's weight **or** at most one thing left undone (the two-door gate, §6). The server's twin is the `qualday` CTE in `hab_bonus_xp()` |
| `perfect` | N days with every tracked habit done |

Everything is measured **from the log alone**, so nothing new is stored and both scorers
agree. Each quest pays **once**, on the day it completes, and is **season-bounded** — a
run straddling a season opening does not count the days before it.
Once Career Mode's XP switch is on that bound applies to the board's season points only: the career counts the whole run
(`QUESTS.md`).

Quests are **the same for everybody**, which is what keeps the leaderboard fair, and
they are distinct from milestones: a milestone is a permanent one-off achievement, a
quest is a limited-time target that expires.

### Editing the pool

```sql
update public.xp_rules
set rules = jsonb_set(rules, '{quests}', '[ … the whole array … ]'::jsonb)
where id = 1;
```

**`QUEST_POOL` in `habits.html` is the offline fallback and must be kept in step** — an
athlete with no signal scores off it. Same rule as everything else in §8. Quest names
follow the house rule: cool, not literal, with the plain description in `note`.

⚠️ **A quest's `note` never spells out a threshold number.** `w_qualify5` read *"5 days at
75% or better"* in **both** pools until 2026-08-02, the day the gate moved back to 80 — a
stale bar printed on every athlete's screen, and a wrong one, since the gate also has a
second door that no percentage describes. It now reads *"5 days on target"*, in
`QUEST_POOL` and on the row alike. Describe a target in words (*on target*, *full water*),
so retuning `streakQualifyPct` can never leave a note naming the old bar — and remember that
changing the threshold means both scorers **plus** any prose that states the number.

> **Careful with `xp`.** Three quests at 150–300 is 450–750 for the run, against ~2,900
> from a perfect week of habits — a 15–25% top-up, which is the intent. Push much past
> that and quests stop being a bonus and start being the game.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
