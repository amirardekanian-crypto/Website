# The XP system — Proof (`habits.html`)

Everything you can tune about levels, XP and achievements, and what changes when you do.
This is the document to read before touching progression.

> **The one rule that makes this safe:** XP and levels are **never stored**. They are
> recalculated from the athlete's logged history every time the app opens. So if you
> change a number in here, every athlete's XP and levels are **rescored automatically**
> against everything they have already done — no migration, no reset, nothing lost.
> The app notices the change, quietly re-baselines, and shows them
> "XP system updated — your levels were rescored." It will **not** fire a hundred
> level-up celebrations they didn't earn today.

---

## Where the settings live

One object, near the top of `habits.html`:

```js
const XP_RULES = {
  base: 300,              // XP for level 1 → 2
  growth: 0.55,           // cost(n) = base × n^growth
  completionBonus: 1.2,   // multiplier once a habit's target is met
  customXp: 25,           // per-completion value of an athlete-added habit
  streakQualifyPct: 80,   // a day counts toward the day-streak at this % done
  seasonStart: '2026-07-26',   // fallback only — the server is the authority
  seasonName: 'Pre-Season',    // see section 7
  weights: {              // per-completion value, by health impact
    strength: 100,
    steps:     60,
    sleep:     50,
    fuel:      40,
    water:     30,
    mobility:  30,
    breathe:   20,
    supps:     20
  }
};
```

Two supporting lists sit just below it: `RANKS` (the rank names) and
`CONSISTENCY_TIERS` (the consecutive-day ladders). Note `weights` is still keyed by
`strength` — that is the WORKOUT habit's internal id, kept so the rename didn't orphan
anyone's history.

---

## 1. What each habit is worth

`weights` is the XP for **completing** a habit once, ranked by how much the habit
actually moves someone's health. Training pays most, then daily steps.

| Habit | Target | XP | Why it sits here |
|---|---|---|---|
| WORKOUT | 1 session | **100** | The session is the point. **Locked** — cannot be ticked by hand; only a finished session in `program.html` earns it. |
| STEPS | 10,000 | **60** | Daily movement — the biggest lever outside training. |
| SLEEP | 7.5 h | **50** | The most underrated recovery input. |
| FUEL | 3 meals | **40** | Logged eating drives every other adaptation. |
| WATER | 8 glasses | **30** | Easy, daily, real. |
| MOBILITY | 10 min | **30** | Keeps them training. |
| BREATHE | 10 min | **20** | Stress and sleep quality. |
| SUPPS | 1 dose | **20** | Vitamin D · creatine · omega-3. Small but free. |
| *anything they add* | 1 | **25** | `customXp` |

**Partial credit.** Counter habits (steps, sleep, water, meals) pay pro-rata while
you're part way there, and get the `completionBonus` once you finish:

- 4 of 8 glasses → `30 × 4/8` = **15 XP**
- 6 of 8 glasses → `30 × 6/8` = **23 XP**
- 8 of 8 glasses → `30 × 1.2` = **36 XP**

So a near-miss day still pays, but finishing is clearly worth more. Check-off habits
are all-or-nothing and always get the bonus (a 100 XP workout pays 120).

**A perfect day is 420 XP** with the current numbers. That figure is the anchor for
everything below — if you change `weights`, recompute it.

---

## 2. The level curve

```
cost(level n → n+1) = base × n^growth
```

With `base: 300` and `growth: 0.55`, no two levels cost the same:

| Level | Cost of this level | Total XP to reach it | Days at 80% adherence |
|---|---|---|---|
| 2 | 300 | 300 | **~1 day** |
| 5 | 730 | 1,930 | ~6 |
| 10 | 1,060 | 6,270 | ~19 |
| 15 | 1,290 | 12,190 | ~36 |
| **20** | 1,520 | **19,270** | **~57 (≈2 months)** |
| 30 | 1,930 | 42,600 | ~127 |
| 50 | 2,590 | 116,000 | ~345 |

This was tuned to two deliberate anchors:

1. **One full day of habits gets you to level 2** — a perfect day is 420 XP, level 2 costs 300.
2. **About two months of solid work gets you to level 20** — 19,270 XP is 57 days at 80%
   adherence (46 days if perfect, 76 days at 60%).

### If you want to change the pace

- **Everything too slow / too fast overall** → change `base`. It scales the whole
  ladder linearly. `base: 400` makes every level 33% more expensive.
- **Early levels fine but the top end too easy** → raise `growth`. At `0.7` the climb
  steepens sharply later; at `0.4` it flattens out and high levels come quickly.
- Leave `growth` above `0` and below about `1.0`. At `1.0` the curve gets brutal
  (level 20 would take over six months); below `0.3` levels stop feeling earned.

**Per-habit ladders use the same curve**, with `base` set to that habit's own daily
value (`weight × completionBonus`). That's deliberate: it means every habit levels at
the same *rate*, so an athlete's level in a habit reflects **how often they actually do
it**, not how much it's worth. Someone who drinks water daily but trains twice a week
ends up GRINDER on water and ROOKIE on their workout — which is the honest picture.

> **A consequence worth knowing.** Because a habit's XP *and* its level cost both scale
> from the same weight, changing a habit's weight does **not** move that habit's own
> level — the two cancel out, and the habit's level stays a pure count of how often it
> was done. It *does* move the **overall** level, which is scored against the fixed
> `base`. So tripling water from 30 to 90 XP makes water count for three times as much
> toward the overall ladder, while the athlete's water rank stays exactly where they
> earned it. That is the intended behaviour: reweighting changes what a habit is *worth
> to you*, not what they *achieved*.
>
> If you want a habit's own ladder to move too, change its **`target`** (how much counts
> as done) rather than its weight.

---

## 3. Ranks

Ten names, five sub-levels each — 50 levels per cycle.

```js
const RANKS = ['ROOKIE','CONTENDER','GRINDER','OPERATOR','ENFORCER',
               'PREDATOR','MACHINE','RELENTLESS','UNTOUCHABLE','IMMORTAL'];
```

| Levels | Rank |
|---|---|
| 1–5 | ROOKIE 1–5 |
| 6–10 | CONTENDER 1–5 |
| 11–15 | GRINDER 1–5 |
| 16–20 | OPERATOR 1–5 ← about two months in |
| 21–25 | ENFORCER 1–5 |
| 26–30 | PREDATOR 1–5 |
| 31–35 | MACHINE 1–5 |
| 36–40 | RELENTLESS 1–5 |
| 41–45 | UNTOUCHABLE 1–5 |
| 46–50 | IMMORTAL 1–5 |

**Past level 50 they prestige.** The ladder restarts carrying a star: level 51 is
`★1 ROOKIE 1`, level 101 is `★2 ROOKIE 1`, and so on forever. There is no cap.

To rename ranks, edit the `RANKS` array — any length works, and the maths adapts.
To change how many levels sit inside each rank, edit `SUBS_PER_RANK`.

---

## 4. Consistency ladders

Every habit has the same five-tier consecutive-day ladder:

```js
const CONSISTENCY_TIERS = [
  { days: 5,  name: 'KINDLED',     xp: 50 },
  { days: 10, name: 'STEADY',      xp: 100 },
  { days: 20, name: 'LOCKED IN',   xp: 200 },
  { days: 30, name: 'IRONCLAD',    xp: 350 },
  { days: 60, name: 'UNBREAKABLE', xp: 750 }
];
```

Tiers are judged on the athlete's **best run ever**, not their current streak — so
breaking a streak never takes a badge back. Add or remove tiers freely; the pip
display adapts to however many there are.

---

## 5. Celebrations

A full-screen, game-style takeover fires for:

- **any overall level**, and
- **a rank promotion** on any habit (e.g. water crossing from GRINDER 5 to OPERATOR 1).

Routine habit levels flash a small chip in that habit's row instead. This split is
deliberate: an athlete completing eight habits on day one would otherwise get nine
full-screen takeovers back to back. If several big ones land together they queue and
show a "2 more to go" counter.

Two looks: near-black with clay rays for a level, full clay for a rank promotion.

**If it feels like too much,** the cheapest change is in `checkLevelUps()` — set
`big: overall` instead of `big: overall || rankChanged` and only the overall level
takes over the screen.

---

## 6. Day streaks

`streakQualifyPct: 80` — a day counts toward the day-streak if at least 80% of the
athlete's tracked habits are done. Set it to `100` to demand a perfect day, or `60`
to be kinder. This also drives the "days on target" figure in the weekly recap.

---

## 7. Seasons — how scoring resets

Scoring runs in **seasons**, like ranked play in a game. Only days on or after the
current season's start date earn XP — for the athlete's own level *and* for both
leaderboards. Days before it stay in their history (visible in the 35-day grid, still
counting toward streaks and consistency badges) but score nothing.

**Right now it is `Pre-Season`, opened 26 July 2026.** Athletes are trying the app and
building a score from that date.

### Starting a season — the command

One line in the Supabase SQL editor:

```sql
select public.start_season('Season 1');                -- starts today
select public.start_season('Season 1', '2026-08-01');  -- or a chosen date
```

That is the whole reset. It **deletes nothing** — it inserts a new row in
`public.seasons`, and from that date every score is computed from zero. Athletes see
their app pick it up on next open, with a toast: *"SEASON 1 has begun — scores start
from zero."*

To check what's live: `select * from public.current_season();`
To see the history: `select * from public.seasons order by starts_on;`

### What resets and what doesn't

| | Resets on a new season |
|---|---|
| Overall XP and level | **Yes** — back to zero / ROOKIE 1 |
| Each habit's XP and level | **Yes** |
| Both leaderboards | **Yes** |
| Logged history (the grid, the log) | No — nothing is deleted |
| Streaks and consistency badges | No — those measure behaviour, not score |

That split is deliberate and matches how games work: ranked resets each season,
account-level unlocks persist. It also means a season change never punishes someone for
a 30-day streak they legitimately built.

**No celebrations fire on a season change.** Levels drop, which would otherwise be
noise; `rulesSignature()` includes the season start, so the app re-baselines silently.

### It also gates the workout backfill

The WORKOUT habit is ticked from finished sessions on the server. Without a season it
would import *every* past session — one athlete had 41 days of history that would have
landed as an instant head start. The app only ever asks for dates from the season start.

### Two places again

Like the XP rules, the season lives server-side (`public.seasons`, the authority) with a
fallback baked into `XP_RULES.seasonStart` / `seasonName` in `habits.html` for offline and
first load. The app fetches the real one on every open and caches it. **You only need to
run the SQL command** — the fallback matters only if someone opens the app offline having
never synced.

---

## 8. The leaderboard scores on the server — so XP lives in TWO places

> **⚠️ The one thing that can get out of sync.** The leaderboard recalculates XP
> **in the database** rather than trusting the number a phone sends, so nobody can
> reach the top by editing their own storage. The price is that the scoring rules
> exist twice:
>
> | Where | What | When to change it |
> |---|---|---|
> | `XP_RULES` in `habits.html` | What each athlete sees in their own app | Always |
> | the `xp_rules` table row in Supabase | What the leaderboard ranks people by | Always, at the same time |
>
> If you change one and not the other, athletes' own screens and the leaderboard
> will quietly disagree.

To update the database copy, run this in the Supabase SQL editor (adjust the
numbers to match whatever you just put in `XP_RULES`):

```sql
update public.xp_rules set rules = jsonb_build_object(
  'base', 300,
  'growth', 0.55,
  'completionBonus', 1.2,
  'customXp', 25,
  'weights', '{"strength":100,"steps":60,"sleep":50,"fuel":40,
               "water":30,"mobility":30,"breathe":20,"supps":20}'::jsonb,
  'targets', '{"strength":1,"steps":10000,"sleep":7.5,"fuel":3,
               "water":8,"mobility":1,"breathe":1,"supps":1}'::jsonb
), updated_at = now() where id = 1;
```

Note `targets` as well as `weights` — the server needs targets to score partial
progress on counter habits the same way the app does. Custom habits an athlete
invents are scored at `customXp`, since the server has no target for them.

### How the board works

- **Opt-in only.** No row in `leaderboard_optin` means invisible. Athletes join
  from the Leaderboard tab and pick their own display name (defaults to first
  name + last initial). They can rename or leave at any time.
- **Two boards.** *This week* (Monday to today) is the default so a new client can
  win in week one; *all time* is the second tab.
- **Reading it is key-checked**, so client display names are not exposed to the
  open internet — only real athletes see the board.
- **No athlete IDs are ever returned.** An ID alone is enough to fetch
  `/data/<id>.json`, which is someone's whole programme. The function returns
  display names, points, level and rank only, plus an `is_me` flag.
- Rank names and the level curve are mirrored in SQL too (`hab_rank_label`,
  `hab_level`), so renaming a rank means updating `RANKS` in `habits.html` **and**
  the `names` array in that function.

The SQL lives in `supabase/stage9_leaderboard.sql`.

---

## 9. What happens when you change any of this

1. Edit `XP_RULES` (or `CONSISTENCY_TIERS`, or a habit's `target`) and ship.
2. Next time each athlete opens the app, every day they have ever logged is rescored
   with the new numbers. Their XP and every level move to match.
3. The app detects the change through a signature over all the scoring inputs
   (`rulesSignature()`), re-baselines quietly, and toasts
   *"XP system updated — your levels were rescored."*
4. No celebrations fire for the change itself. Their next genuine level-up celebrates
   normally.

Levels can go **down** if you make XP more expensive. That is working as intended —
but it's the one change worth thinking twice about, because an athlete who was
OPERATOR 2 yesterday will notice being GRINDER 4 today. Prefer raising the value of
new work over devaluing old work.

---

## 10. Never losing progress

Worth knowing, since it underpins all of the above.

- Every tick is written to the phone's local storage **first**, then queued for the server.
- The "unsent" flag is itself saved, so an app killed while offline still knows there
  is work to send next time it opens.
- Retries run on their own with backing-off delays (5s → 15s → 45s → 2m → 5m), and
  fire again the moment the phone reconnects, when the app comes back to the
  foreground, and at every launch.
- Each push sends the **complete current snapshot**, so a newer push simply supersedes
  an older one — nothing can arrive out of order or overwrite good data with stale data.
- When two devices disagree about a day, the **larger logged value wins**, so a stale
  phone can never erase a number recorded elsewhere.
- Settings has a live sync line ("SYNCED 2 MIN AGO" / "OFFLINE — SAVED ON THIS PHONE")
  and a **Sync now** button.

The athlete's phone is the record. The server is the mirror.
