### The wall is SEVEN DAYS, and nothing older is kept
Amir, 2026-08-01: *"only the messages from member for the last 7 days should be shown,
anything before that shouldnt be saved."* Today plus the six days behind it — the same
span the hero card draws. It is enforced in **three** places, each owning a different
copy, and any one alone leaves stale lines somewhere:

| # | Where | What it governs |
|---|---|---|
| 1 | `ROLL_DAYS` / `rollFloor()` in `fetchRollCall()` | What the client will **draw**, whatever the RPC returns |
| 2 | `setMyNote()` | The local mirror of your **own** lines (was 14 days) |
| 3 | `supabase/stage21_roll_call_retention.sql` | The **server's** copy — the only one that makes "shouldn't be saved" true |

**Stage 21 — applied 2026-08-02.** It adds a `purge_old_notes()` function and a
**statement-level AFTER trigger** on insert/update, so `hab_notes` sweeps itself on
ordinary traffic — no cron needed (`select public.purge_old_notes();` sweeps on demand, but
the trigger already keeps the table clean without it). Verified live: a row backdated 40
days was gone the moment the next row was written, leaving only what was actually inside
the window.

⚠️ **The client floor is 7 days and the server floor is 9, and they must not be
"tidied" to match.** `hab_notes.day` is the athlete's LOCAL day (that is why
`set_day_note()` accepts up to `current_date + 1`); Tehran rolls over eight and a half
hours before UTC and Los Angeles seven hours after. A server floor of `current_date - 6`
would delete a line still inside somebody's own week on the far side of the date line.
So: **the client is the display authority** (exactly 7, local clock) and **the server is
the retention authority** (9, with two days of timezone slack).

The client filters again after the RPC returns, and that is not redundant: `roll_call()`
computes `current_date - p_days`, which is today plus seven days back — **eight** days —
on the **server's** date.

⚠️ **`--ink-card` goes DARKER than `--card` in dark mode, not lighter.** At `#201B3D`
against a `#282250` card the two were eight points apart and the one card on the wall
meant to read as *not one of these* read as one of these. It is `#100C24`.

**What the chips can honestly say** (`rcChips()`), and this is a real limit worth knowing:

| Chip | As of | Where it comes from |
|---|---|---|
| `88% day` | **the day they wrote it** | `hab_notes.pct`, stored with the line |
| `🔥 N-day streak` | **the day they wrote it** | `dayStreakAt(day)` — walked back from that date, **your own lines only** |
| rank · title | **now** | `roll_call()` scores a rank live and keeps no history of it |

The streak is the athlete's own because it needs a *log* to compute and this device holds
exactly one. If `roll_call()` is ever taught to return a per-line streak, hand it through
as **`r.streak`** and every card gets one — the chip is already written for it, and the
client falls back to the local calculation only when the field is absent. That is the one
change that would make the wall show everybody's run.

⚠️ `dayStreakAt()` is now the single definition of a day streak — `currentDayStreak()`
delegates to it. **Today is not a settled day**, so an unfinished today must not break the
count; that rule (previously local to `currentDayStreak`) lives inside `dayStreakAt` so
the hero tile and the wall chip can never disagree about the same integer.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
