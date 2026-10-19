## How progression works

Full detail and every tunable is in **[`XP_SYSTEM.md`](../../../XP_SYSTEM.md)**. The shape:

- **Nothing about XP is stored.** Levels are recomputed from the logged history every
  load, so retuning the numbers rescores everyone automatically.
  Once Career Mode's XP switch is on this still holds for the rules. The server keeps a working copy of each athlete's numbers
  (`career_scores`) so the board loads fast, and works it out again from the facts whenever what it rests on changes. Nothing in
  it is a source.
- **Points are weighted by health impact** — training most, then steps. Counter habits
  pay pro-rata as you go plus a bonus for finishing.
- **Each level costs more than the last** (`base × n^growth`). One full day reaches
  level 2; roughly two months of solid work reaches level 20.
  Once the XP switch is on the curve is the career's (base 400, growth 0.55). Level 2 costs 400 and a day of habits alone no
  longer reaches it, because WORKOUT pays 0 a day. A finished session pays 400. Level 20 is still about two months of solid work,
  habits and training together (the rulebook's note, measured 2026-10-17: training alone reaches level 13 to 15 in that time).
- **Ranks**: 10 names × 5 sub-levels — ROOKIE · CONTENDER · GRINDER · OPERATOR ·
  ENFORCER · PREDATOR · MACHINE · RELENTLESS · UNTOUCHABLE · IMMORTAL. Past 50 they
  prestige and start again carrying a star. No ceiling.
- **Every habit has its own level** on the same curve scaled to its own value — so a
  habit's level measures *how often they do it*, not how hard it is.
  Once the XP switch is on each ladder counts the whole career and does not reset with a season.
- **Consistency ladders**: five tiers per habit (5/10/20/30/60 consecutive days),
  earned on the best run ever so breaking a streak never revokes a badge.
- **Celebrations** (PRF-02, Amir's 1A, 2026-09-27): the whole screen only for a **new overall
  level** (its reward on the same screen), a **new rank**, a **day streak from 7 days**
  (`STREAK_TAKEOVER`), a quest completed during a run, a finished *A few weeks* event (its
  title) and, since 2026-10-17, **a season's title** the day the season closes; a reward that
  arrives with no level in the same pass (a rules change, a sync) gets its own too. A medal, a
  consistency tier, a habit's new rank, a perfect day, a comeback, the 3-day streak mark and a
  finished season with no title land on **the wins card** under
  Today's hero (`winsCard()`), with the XP the ledger paid, until it is tapped (*Got it*, or
  *Share it*). A made-up athlete's first 22 days: **30 takeovers → 9** (a free athlete 24 → 7),
  on 15 of the days before, up to 4 in one evening. `CFG.wins` holds only *which* win
  (`{k, id, …}`), never its XP (points are recomputed, never stored), and it syncs, so a card
  tapped on one phone is gone on the other. A habit's own level still flashes inline, and
  same-day tier clears across several habits coalesce into one. **Every moment's Share it opens a
  card of that exact win** (2026-10-17): the table is *Every reward, its moment and its card*, under
  *The share picker*. Full rules in [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §5.
  Once the XP switch is on there is one more, **the career reveal**, once per athlete (*Career Mode (phase 2, the XP switch)*).

- **The badges pay** (since stage 12). Clearing a consistency tier or unlocking a
  milestone is worth real XP, on the **overall** ladder only — never on a habit's own,
  which has to stay a pure count of how often it was done. Two rules make it safe:
  each bonus is paid **on the day it was crossed**, so windows filter it like any other
  amount and nothing has to be stored; and **runs are measured from the season start**,
  so every season everyone can earn them again. Tier values are a multiplier on *that
  habit's* daily value, so a workout streak outpays a supplements streak. Detail in
  [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §4.5.
  Once the XP switch is on the career counts each badge once, ever, on the day it was crossed (`bonusEvents()` walks the whole
  log, as the server's career score calls `hab_bonus_xp()` with no season). The board's season points still measure runs from
  the season start, so a badge pays again toward each season's points.

- **A season is archived now, not erased** (2026-08-02). When a season closes, every
  athlete's final level and XP are snapshotted into `hab_season_results` and the **Locker
  grows a Seasons shelf** — *"PRE-SEASON · ENFORCER 3 · level 23 · 21,400 XP"*, kept for
  good. Everyone who reached level 5 also gets a **title naming that season**, which can
  never be earned again because the season is over. That was the honest answer to a
  veteran opening day 1 of season 2 with nothing new to want: the reset used to delete the
  evidence that the season ever happened. The shelf renders **nothing at all** until a
  season has actually closed, like the streak flame on day one. **The day it closes, the season
  title takes the whole screen** (*Season over*, `checkSeasonMoments()`, 2026-10-17; it used to land
  in the Locker with no word), and a season finished without one lands on the wins card.
  ⚠️ `start_season()` is **coach-only now and was not before** — it had no auth guard at
  all while being executable by `anon`, so anyone with the public key in `habits.html`
  could have reset the board. Future-dated starts are refused, and `undo_season()` puts
  back the one-command undo the archive would otherwise have removed.
  [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §7.5.
  Once the XP switch is on the archive keeps the season's **points** (training included) and the **career level** at the
  season's last day, and the title goes to everyone with 2,000 points or more (`rulebook.toml` → `[season] title_points`) in
  place of level 5 inside the season.

- **Milestones come in MARKS** (2026-08-02, Amir: *"as ive seen in call of duty you can
  unlock achievements again but next levels of them"*). A family is one achievement earned
  again at a higher bar — `HUMAN SPRINKLER I` (5 days) → `II` (20) → `III` (60). The
  numeral is display-only; each rung is its own row with its own code, need and XP, so no
  scoring machinery changed. **32 milestones now, worth 9,585 XP**, up from 20 and 5,085 —
  and since milestone XP re-pays every season, that widens the runway a returning veteran
  has in a new one. `DAWN PATROL I` is the **free tier's way in**: the shelf's only day-one
  badge used to be `FIRST BLOOD`, which is WORKOUT-gated and therefore unreachable for the
  whole funnel. Five badges were renamed so families read as one thing — codes untouched,
  so no history moved. [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §4.6.
  Once the XP switch is on a milestone pays the career once, and still pays again toward each season's board points.

- **Custom habits have a server ceiling now** (`maxCustom`, 3). The client cap is a UI rule
  and the log is just JSON, so a tampered copy with fifty junk keys was paid fifty times.
  `hab_xp()` pays for at most three unrecognised keys per day. Honest athletes are
  unaffected — measured live, a 3-custom day scores identically before and after, while a
  10-custom day drops 336 → 126. [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §1.

- **Overlapping quest runs are clipped** in both scorers, so starting a run mid-week is
  safe now: the later run takes over from its start date instead of both scoring the same
  days and paying a shared quest twice. [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §8.5.

- **The day streak has TWO doors** (2026-08-02): clear `streakQualifyPct` of the day's
  weight, **or** leave at most one thing undone. The percentage alone was a lie on the
  roster most athletes actually have — add-ons ship OFF, so on the core five, missing steps
  alone was 67% and missing sleep alone 72%, both fatal, while a veteran with three add-ons
  on got the forgiving version the 75% was tuned for. Padding the denominator softened the
  gate, which made opting into cheap self-reported habits *streak insurance*. The gate also
  gives **partial credit on counters** now, so 9,500 of 10,000 steps is 98% rather than
  zero. `isPerfect()` is untouched. [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §6.
  ⚠️ **Superseded later the same day**: `dayPct()` went pro-rata too, see below — it no
  longer "stays binary."

- **`dayPct()` also went pro-rata** (2026-08-02, later the same day, Amir: *"for all the
  habits that have bars to fill... i want that to be added toward their day completion
  percentage"*). The score half — the roll call wall and the share cards (the header and the
  day strip too, until PRF-03 and PRF-05) — now gives
  the same partial credit on a counter that the gate already gave, so the two numbers agree
  on what a near-miss is worth. `isPerfect()` is the backstop for the reason it was binary
  in the first place: a day can read 91% on partial credit without being *perfect*, because
  perfect still means every box actually ticked. Client-only, no server migration — `dayPct()`
  is computed here and sent up pre-computed when posting a roll call, never recomputed
  server-side. [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §6.

- **Coming back pays** (2026-08-02, Amir: *"make the economy pays for comeback"*). Miss
  `LAPSE_DAYS` (3) or more in a row, then have a day that counts, and that is a comeback:
  **50 XP**, dated on the day, repeatable, on the wins card at the top of Today (a full-screen
  takeover until PRF-02). It cannot be
  farmed — three dark days forfeit ~750 XP to collect 50 (measured: four straight days pays
  1,400; lapsing three and logging two pays 432). The badges deliberately reward the **week
  after** rather than the reappearance: BACK IN THE FIGHT I (hold 7 days) and II (21), HARD
  TO KILL I (3 comebacks that stuck) and II (5), plus the **BACKBONE** event
  paying the **UNBOWED** title — the only thing in the app you cannot earn by never
  slipping. ⚠️ The walk reads the **calendar, not the log**, because a lapse is mostly days
  with nothing in them; and a comeback needs a *previous* qualifying day, since you cannot
  return somewhere you have never been. [`XP_SYSTEM.md`](../../../XP_SYSTEM.md) §6.6.

⚠️ Both of the above are scored twice. The server half is
`supabase/stage22_gate_and_comeback.sql`, which is a **no-op until its rules keys are
written** — apply it, deploy the client, *then* write the keys, or the board is forgiving
while the phone is not.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
