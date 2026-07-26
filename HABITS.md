# 🎯 Proof — the habit app brief

The "what this app actually is" context doc for **`habits.html`**, the daily habit
tracker that sits alongside the training programme. Pair it with
**[`XP_SYSTEM.md`](XP_SYSTEM.md)** (every tunable number and what changes when you
move it) and **[`CODEBASE.md`](CODEBASE.md)** (the technical file-by-file map).

Start here if you're picking this up in a fresh chat.

> **⚠️ Keeping this honest.** When you change how the app works, three things must
> move together: **this file**, **`XP_SYSTEM.md`**, and the **in-app manual**
> (`renderManual()` in `habits.html`, which athletes read from Settings → *Read the
> manual*). The manual reads its numbers straight from the live constants, so
> retuning XP never breaks it — but if you change *behaviour*, its prose needs
> updating by hand. Same for `privacy.html` if you change what data is shared.

---

## The product in one breath

**Proof** is a gamified daily habit tracker for Amir's coaching clients. The training
programme (`program.html`) covers what happens in the gym; Proof covers the other
twenty-three hours — sleep, steps, water, food, mobility, breathing, supplements.

The hook is progression borrowed from competitive games: every habit earns points,
points build levels, levels carry rank names, and an opt-in leaderboard lets clients
race each other. The tone is dry and a bit rude — a coach who notices, not a wellness
app that congratulates you for existing.

It is **not** a messaging channel. There is no chat; coaching conversation stays in
`program.html`.

---

## How an athlete gets in

Same private link as their programme: `habits.html?client=<id>&key=<key>`.

The two apps are **linked both ways**:

| From | To | Where |
|---|---|---|
| `program.html` | Proof | **Daily Habits card** on Home *and* at the end of My Plan (a plain shortcut — it shows no level or XP, because that is Proof's job) |
| Proof | `program.html` | **Your training programme** card at the bottom of Today, and a row in Settings |

Both are the same origin with the same PWA scope, so tapping through from an installed
app stays inside the app shell — no browser bounce, no second install. Each handover
passes the client id and the resolved key, because an installed PWA often opens
without `&key=` in the URL.

---

## The four tabs

### 01 · TODAY — the daily loop
The screen they actually live on.

- **Level hero** — overall level, rank label, XP, and progress to the next level.
- **Today's progress bar** — how many of their tracked habits are done.
- **The nudge** — one clay card whose copy reacts to what is actually missing (water
  first, then whichever habit they're avoiding, then a "nothing to nag about" line).
  Its button opens the habit in question. This is the "nudge" half of *nudge and recap*.
- **The habit list** — tap the box to tick, tap the name for that habit's history, tap
  `+` on counter habits. Each row shows that habit's own level and current streak.
- **The recap** — a rolling seven-day block: days on target, XP earned, strongest and
  weakest habit. The "recap" half.
- **The cross-link** back to the training programme.

### 02 · PROGRESS — where do I stand
Habits and achievements merged, because they were two views of one question.

Overall level → day streak and achievements unlocked → **one row per habit** (its level,
rank, XP, progress bar and five consistency pips, tapping through to full history) →
paused habits with their banked XP → the nine one-off **milestones**.

**Habit detail** (reached from here or from Today) shows that habit's rank and level
progress, a log button, its consistency ladder, this-week / best-streak / 35-day-rate
stats, a 35-day grid, and the last five days with the XP each earned.

### 03 · SETTINGS
Profile · **Read the manual** · link to the programme · sync status and a *Sync now*
button · leaderboard status · dark mode · which habits are tracked (plus adding custom
ones) · reset today's log.

Deliberately *not* here: coach volume, motivation display, replay onboarding. The app
has one mode — XP and levels, nudge and recap — and doesn't ask athletes to configure it.

### 04 · LEADERBOARD
Opt-in only. Two boards (this week / all time). See below.

---

## The eight habits

| Habit | Target | XP | Notes |
|---|---|---|---|
| **WORKOUT** | 1 session | 100 | **Ticked automatically** — see below |
| STEPS | 10,000 | 60 | Entered as a number |
| SLEEP | 7.5 h | 50 | Entered as a number |
| FUEL | 3 meals | 40 | Counter |
| WATER | 8 glasses | 30 | Counter |
| MOBILITY | 10 min | 30 | Tick |
| BREATHE | 10 min | 20 | Tick |
| SUPPS | 1 dose | 20 | Vitamin D · creatine · omega-3 |

Athletes can switch any of them off and add their own (worth `customXp`, 25).

**Onboarding** is one screen that *suggests* this set with every item as a toggle —
it decides nothing for them, and everything stays editable in Settings afterwards.

> **STEPS and SLEEP are entered by hand**, not synced from HealthKit. A web app cannot
> read phone health data. This is the one place Proof departs from the original design
> handoff, and it would need a native app to change.

### The WORKOUT habit is fed by the training programme — through the server

**These are two separate apps.** Neither reaches into the other's storage, and
neither carries the other's logic. The only thing they share is a fact that lives
on the server.

When an athlete hits **Finish Session** in `program.html` — full session or partial,
because they showed up either way — that app records the session to `session_history`
exactly as it always has. Proof then reads the *dates* back through a small read-only
RPC, `get_workout_days`, and ticks its WORKOUT habit for those days. The completion
card in the programme app says *"Counts as your Workout habit"* with a shortcut across.

Why it's built this way:

- **`program.html` writes nothing into Proof.** It has no habit log, no XP maths, no
  level formula. Its entire habit footprint is two shortcut cards and a link.
- **Proof reads nothing from `program.html`'s storage.** It asks the server.
- **`program.html` never syncs `<id>_hab_*`.** Those keys share an origin but belong to
  Proof, which merges them conflict-safely; a stale programme app would otherwise
  overwrite habit progress logged on another device.
- **Each date imports once.** After that the athlete is in charge — unticking a day
  makes it stay unticked instead of reappearing on the next load.

The habit's id is still `strength` internally so that renaming it to WORKOUT didn't
orphan anyone's history or XP.

SQL: `supabase/stage10_workout_days.sql` — **must be run once**. Until it is, the
WORKOUT habit simply stays manual, which is a fine fallback.

---

## How progression works

Full detail and every tunable is in **[`XP_SYSTEM.md`](XP_SYSTEM.md)**. The shape:

- **Nothing about XP is stored.** Levels are recomputed from the logged history every
  load, so retuning the numbers rescores everyone automatically.
- **Points are weighted by health impact** — training most, then steps. Counter habits
  pay pro-rata as you go plus a bonus for finishing.
- **Each level costs more than the last** (`base × n^growth`). One full day reaches
  level 2; roughly two months of solid work reaches level 20.
- **Ranks**: 10 names × 5 sub-levels — ROOKIE · CONTENDER · GRINDER · OPERATOR ·
  ENFORCER · PREDATOR · MACHINE · RELENTLESS · UNTOUCHABLE · IMMORTAL. Past 50 they
  prestige and start again carrying a star. No ceiling.
- **Every habit has its own level** on the same curve scaled to its own value — so a
  habit's level measures *how often they do it*, not how hard it is.
- **Consistency ladders**: five tiers per habit (5/10/20/30/60 consecutive days),
  earned on the best run ever so breaking a streak never revokes a badge.
- **Celebrations**: full-screen takeover for an overall level or a rank promotion;
  routine habit levels flash inline, so day one isn't nine takeovers.

---

## The leaderboard

- **Opt-in.** No row in `leaderboard_optin` means invisible.
- Athletes pick their **own display name** (defaults to first name + last initial) and
  can rename or leave at any time.
- Others see **that name, their points, level and rank** — nothing else.
- **Two boards**: *this week* (resets Monday, so a new client can win in week one) and
  *all time*.
- **Scored in Postgres** from the log already stored server-side. The app submits no
  number, so editing local storage cannot buy a place.
- **No athlete ids are ever returned** — an id alone would let one client fetch
  `/data/<id>.json` and read another athlete's whole programme.
- **Reading the board is key-checked**, so client names never reach the open internet.

SQL: `supabase/stage9_leaderboard.sql`. **It must be run once** — until then the tab
explains itself rather than erroring.

> Because scoring happens on the server, the XP rules exist in **two places**:
> `XP_RULES` in `habits.html` and the `xp_rules` row in Supabase. Change both together.

---

## Never losing progress

The athlete's phone is the record; the server is the mirror.

- Every change is written to localStorage **first**, then flagged unsent — and the flag
  is itself persisted, so an app killed while offline still knows there's work to send.
- Retries back off (5s → 15s → 45s → 2m → 5m) and re-fire on reconnect, on foreground,
  on `pagehide` and at every launch.
- Each push sends the **complete snapshot**, so a newer push supersedes an older one.
- The cloud merge keeps the **larger** logged value per habit, so a stale device can
  never erase a real number.
- Settings shows live sync state and a *Sync now* button.

Storage keys, all owned solely by Proof: `<id>_hab_cfg` (settings), `<id>_hab_log`
(the daily log), `<id>_hab_meta` (sync state). They ride the existing `save_progress` /
`get_progress` functions into the same `athlete_progress` row the programme app uses —
**no tables of its own** except the leaderboard's two. `program.html` explicitly skips
these keys when it syncs.

---

## Voice

Dry, blunt, a little rude — the same coach who says *"your hamstrings have filed a
complaint with HR"*. Never chirpy, never therapeutic. It notices what you skipped and
says so. Uppercase Barlow Condensed for anything structural; sentence case for the
lines that talk to you.

Design language is the PROOF modernist system on AA's palette: zero border radius,
2px section rules, 1px row rules, flush-left, typographic (no icon set), green as the
accent with clay for the nudge card and mono meta.
