## 5. Celebrations

> **Since 2026-10-19 (Career Mode round 5) AA Proof opens no level-up, rank-up, reward, title, award or reveal takeover, and the wins card has no line for a
> tier, a milestone, a habit's rank, an award or a season.** What still opens is the day streak takeover (from `STREAK_TAKEOVER` days) and a finished
> quest, and what still lands on the wins card is a perfect day, a comeback and the shorter streak marks. The baselines in this section (`CFG.seen`,
> `seenTiers`, `seenAch`, `seenAwards`) keep moving in silence, so nothing replays later. The rows below that name a level, a rank, a tier, a milestone or
> an award describe the code as it is, behind `CAREER_LIGHT`.

**Since PRF-02 (2026-09-27, Amir's 1A) only a few things take the whole screen** (six since a
season's title joined them, 2026-10-17, and a seventh, once per athlete, for the career reveal below); the rest land on
**the wins card** at the top of Today (`winsCard()`), with the XP they paid, until it is tapped. A
made-up athlete's first 22 days went from 30 takeovers to 9 (a free athlete 24 → 7), nothing lost.
Nothing in this section scores: a celebration only reads what the ledger already paid.

| Trigger | Detected in | Where |
|---|---|---|
| **Any overall level** (a new overall rank is the clay ground) | `checkLevelUps()` | the whole screen, grape rays |
| **A reward** (title or card) the level unlocked | `claimRewards()` | **on that level's screen** (`ev.rewards`); its own takeover only with no level in the same pass |
| **A day streak crossing a mark** of `STREAK_TAKEOVER` (7) days or more | `checkUnlocks()` | the whole screen, ember ground, a drawn flame |
| **A weekly quest** completed (this week only) | `checkUnlocks()` | the whole screen, badge ground |
| **A finished *A few weeks* event** (its title, `claimEventTitles()`) | `checkLevelUps()` | the whole screen, as a reward: the biggest single thing that is not a level |
| **A season's title**, the day its season closes (level 5 that season, minted by the server, or 2,000 season points once the XP switch is on) | `checkSeasonMoments()` | the whole screen, *Season over* (2026-10-17; it arrived in silence) |
| **A finished season with no title** | `checkSeasonMoments()` | the wins card |
| **The career reveal** (once the XP switch is on: the first open of AA Proof on the career, once per athlete) | `checkLevelUps()` | the whole screen, the rank's own ground, kicker *Your career*. Its Share it opens the Rank card, eyebrow *MY CAREER* |
| **A rank promotion on one habit** (water crossing GRINDER 5 → OPERATOR 1) | `checkLevelUps()` | the wins card |
| **A consistency tier** cleared on any habit | `checkUnlocks()` | the wins card |
| **A milestone** unlocked | `checkUnlocks()` | the wins card |
| **A perfect day** — every tracked habit done | `checkUnlocks()` | the wins card |
| **A comeback** | `checkUnlocks()` | the wins card |
| **The 3-day streak mark** | `checkUnlocks()` | the wins card |

`CFG.wins` stores only *which* win (`{k, id, …}`), never its XP: `winLine()` asks the ledger
(`milestonePaid()`, `tierPaid()`, `dayXp()`) when it draws, the rule below. It syncs with the
config, so a card tapped on one phone is gone on the other.

**Ticked from the training app's Home** (the embedded strip, `?embed=1`, 2026-09-26): the XP
is identical, because the tap goes through the same `toggleHabit()`/`bump()`/`setVal()`, but
`checkLevelUps()` stands down there. `CFG.seen` does not move, so every takeover in this
table is still waiting when Proof itself next opens. Nothing is detected twice or skipped.

Routine habit levels flash a small chip in that habit's row instead. This split is
deliberate: an athlete completing eight habits on day one would otherwise get nine
full-screen takeovers back to back. If several big ones land together they queue and
show a "2 more to go" counter; the card lists three and counts the rest.

The ground is the point — an athlete can tell which *kind* of win landed before
reading a word of it. Grape is never a badge, and ember is only ever the day streak.
Confetti and a scatter of coins play once per takeover (`confettiHtml()`/`coinHtml()`
in `habits.html`), deterministic per event so a re-render never re-scrambles it
mid-fall. Every takeover but a habit-level chip, and the wins card, carries a **Share it** button
(`lvActions()`) straight into the share picker, **on a card of that exact win** (2026-10-17): the
milestone, tier, quest or comeback on the Milestone card, a title on the Title card, the streak's
mark, the perfect day's own date. The table of every reward, its moment and its card is in
`HABITS.md` → *The share picker*. A Share it from a takeover parks the rest of the queue
(`UI.celebrateLater`) and `closeShare()` puts it back: it used to drop it. A card that names an XP
figure quotes the ledger, the rule below.

**A season's moment** (`checkSeasonMoments()`, the first thing `checkLevelUps()` does) is the one
celebration on the boot that re-baselines for a new season: that pass is silent about points, and
this is the season's reward, not a point. `CFG.seenSeasons` holds the season starts already shown
and only grows (unioned across phones); missing, it is seeded silently, so a record that predates
the build is history.

**The career reveal** (`renderCareerReveal()` in `checkLevelUps()`, only once Career Mode's XP switch is on, `HABITS.md` → *Career
Mode (phase 2, the XP switch)*) is one takeover per athlete, at the first open of AA Proof on the career. `rulesSignature()` carries
the switch, the career's curve and the rulebook's version in place of the season, so that first open re-baselines in silence and
fires no level-ups: the reveal is the one moment. It reads *Your career*, the level and the rank, and *From everything you've logged
since <date>, your training included. Your level never resets now. A new season only starts the board's points again.* The date is
the first day the athlete logged anything (`get_profile()`'s `since`), and *your training included* appears only when they have
finished a session. When `claimRewards()` added the road's titles and card looks up to the career level, a line counts them: *N
rewards on the road are yours · in your Locker*. `CFG.careerSeen` holds the switch's day it was shown for and is kept through the
cloud merge, so a second phone stays quiet. Someone who started after the switch gets none. A later season changes no level, so it
fires no level-up either: a toast says *SEASON 2 has begun. The board starts from zero. Your level stays.* A re-seeded rulebook (a
new `rules_version`) re-baselines quietly too.

**Once the catalogue switch is on (phase 3)** a badge step or a milestone is an award, and its moment goes by its size (D7):
*milestone* and *legend* take the whole screen, *win* and *highlight* land on the wins card. **One full-screen moment per open,
of any kind**: when a level-up, a rank or a reveal had the screen this run, an award that arrives with the server's answer waits,
unseen, for the next open; one a tap earned opens right then. The server's waiting moments (`get_profile().moments`) are shown
only from an answer of this run, and each answer tells the server what Proof has shown (`mark_moments_told()`), so the training
app never replays one. `CFG.seenAwards` holds every award id that has had its moment (synced, unioned). **The catalogue reveal**
is the switch's one moment, once per athlete (`checkCatalogueReveal()`, `CFG.catalogueSeen`): *MY RECORD · Your record*, the
four counts, the Grand Slam row and the road's rewards. The flip re-baselines in silence and never toasts *XP system updated*.
The counts are read from the catalogue copy (or the shelf), never the core's placeholder lists, so the reveal waits, absorbing
levels in silence and opening nothing else, until one of them is on the phone.
The day streak keeps its takeover on every new streak (D17); its award, once a career, never opens a second one.

**The day streak celebration is new** (Amir: *"the app used to say nothing about the
one number the whole qualify rule exists to protect"*). `DAY_STREAK_MARKS` in
`habits.html` is the tuned list of days worth stopping the screen for — tight in the
first week, when people quit, and spreading out after so it stays an event rather
than a weekly chime. `CFG.seenStreak` tracks the highest mark already shown and
**resets to 0 the moment the streak breaks**, so every mark is back on the table for
the next run. It pays no XP of its own — the streak's value is already priced into
`gatePct()` and the qualify quest; this takeover is recognition, not a second payout.

### What `checkUnlocks()` guarantees

Tiers, milestones and perfect days were detected by nothing at all until this was
added: a pip quietly filled on a tab the athlete might not open that day. Three
rules keep it from becoming noise:

- **Tiers are coalesced by tier, not reported per habit.** An athlete solid since
  day one crosses the 20-day tier on all eight habits *on the same day*; eight
  identical takeovers is a punishment. One takeover names the tier and lists the
  habits ("20 days of workout, steps, sleep and 5 more in a row"), and past four
  it counts instead of listing. Crossing several tiers at once reports only the
  highest — the lower ones are implied.
- **A perfect day is judged on TODAY only**, never across history. That used to be
  load-bearing: before stage18, switching a habit off turned every thin day behind
  the athlete retroactively perfect, and judging history would have fired a burst of
  takeovers for days they never had. Days are settled now, so the rule is kept for
  the reason that still applies — a celebration is for something that happened just
  now, and replaying an old one is noise. It also can't be farmed: `CFG.seenPerfect`
  holds the date, so unticking and re-ticking pays once.
- **It baselines like levels do.** `CFG.seenTiers` / `CFG.seenAch` / `CFG.seenPerfect`
  are seeded silently on a first run, on a rules change, and on a cloud row that
  predates this build — so an athlete arriving with history already behind them
  gets it recorded, not replayed at them. `seedUnlocks()` is called from
  `seedSeenLevels()`, so the two baselines can never drift apart.

Since stage 12 the tier and milestone celebrations (on the wins card since PRF-02) **quote the XP they actually pay**,
because they actually pay it — a tier takeover sums the payout across every habit
that cleared it in the same pass. A perfect-day takeover quotes `dayXp(today)`, which
includes any bonus crossed that day, so the figure always matches what the athlete's
total just moved by. See §4.5.

> ⚠️ **Quote the ledger, never the table.** Those two takeovers read their figure
> off `bonusEvents()` — via `tierPaid()` and `milestonePaid()` — and *not* off
> `CONSISTENCY_TIERS` / `ACHIEVEMENTS`. They have to, because of §4.5 rule 2: a
> badge is judged on the best run ever but only **paid** when that run falls inside
> the season, so the two legitimately disagree. Reading the table instead is a bug
> that hides for months and then lies to the athlete's face — an athlete with 25
> pre-season step days who logs 5 in-season ones got a full-screen *"ROAD RUNNER ·
> +200 XP"* while their total moved by nothing. When the ledger paid nothing, both
> takeovers now say so plainly: the badge is still awarded, the points are named as
> pending. Anything added here that mentions an XP figure must do the same.

**If it feels like too much** (it did: PRF-02 set `big: overall` and moved the rest to the
card), the next lever is `STREAK_TAKEOVER`. To silence the card entirely, stop `checkUnlocks()`
calling `addWin()`; the seen-lists still move, so nothing is replayed later.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
