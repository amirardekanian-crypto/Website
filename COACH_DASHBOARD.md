# The Coach's Box — user manual

A plain-English guide to `coach.html`: Amir's private mission control. Every
threshold below is the real value from the code, so this doubles as the
reference for how the flagging actually works.

**Redesigned 2026-08-09.** The old dashboard was a triage list of coached
athletes and nothing else — built before Proof existed, so it could not see the
habit crew, the wall, the board or the funnel, which is most of what happens on
a given day. It went unused. This version opens on **what today needs**, and it
covers **both halves of the business** in one place.

---

## 1. Getting in

Open `coach.html` and **Sign in with Google** as `amirardekanian@gmail.com`.
Any other account is rejected. The page isn't indexed and has no nav link.

> The Google check is the convenience gate; the real security is Row Level
> Security in the database — every coach-only table policy and every coach RPC
> checks `auth.jwt() ->> 'email'`. Reaching the page without the account gets
> you nothing.

**Preview without signing in:** `coach.html?demo=1` renders the whole layout
against synthetic data. Nothing is fetched and every write is a no-op, so it's
safe to open anywhere — handy for screenshots or design work.

---

## 2. The five tabs

| Tab | What it's for |
|---|---|
| **Today** | The day's play: who's on court, what's on the wall, who needs you, the quest lever |
| **Intake** | New coaching applications from the apply form (English & Farsi) — the whole questionnaire, per lead |
| **Athletes** | The whole roster — coached and Proof-only — and each person's file, opening on prescribed-vs-done |
| **Proof** | The board, the season, the signup funnel, titles minted |
| **Links** | Copyable deep links to every published article and workout |

The URL carries the view (`#today`, `#intake`, `#athletes`, `#proof`, `#links`,
`#a/<athlete_id>`, `#a/<athlete_id>/<sub-tab>`), so any screen can be bookmarked or
reloaded in place.
**↻ Refresh** re-pulls everything.

### Intake — where the apply form lands

`form.html` and `form-fa.html` used to depend entirely on **Web3Forms**: the form
turned into an email, and when that relay was unreachable the submission was lost —
the athlete saw an error and nobody found out. Now each form **also** writes straight
to Amir's own Supabase (`submit_intake` → the `hab_intake` table), and counts as sent
if *either* path succeeds. The email still fires as a notification; **this tab is the
durable record**, so a Web3Forms outage can no longer swallow a lead.

Each submission is a card: name, an **EN/FA** flag, the programme they picked, when it
arrived, their email and contact (with copy buttons; a WhatsApp number becomes a
`wa.me` link), and the whole questionnaire underneath. Three states drive the workflow
and the **badge on the tab counts the new ones**:

- **Mark handled** — you've replied or converted them (they move to *Handled*).
- **Archive** — spam or not a fit (collapsed at the bottom; **Reopen** brings it back).
- **Reopen** — send a handled/archived lead back to *New*.

Nothing here joins anyone to Proof or writes a programme — it's an inbox. When you take
a lead on, onboard them the usual way (`/athlete-intake`). Backend, and the coach-only
guard on every read/write: [`supabase/stage27_intake.sql`](supabase/stage27_intake.sql).

---

## 3. TODAY

### The scoreboard

Four counters across the hero, each one a link to the panel that explains it:

| Counter | What it counts |
|---|---|
| **On court today** | Proof athletes with a log entry for today ÷ everyone on Proof |
| **Wall lines today** | Roll-call posts today, hidden ones excluded |
| **Sessions this week** | Finished training sessions in the last 7 days, whole roster |
| **Waiting on you** | Session notes needing a reply + unread chat messages |

Beside them: the current season and how many days into it you are.

### The wall — read it *and* write it

The roll call, straight from `hab_notes`, newest day first. Two days by default,
**Show the full week** for all seven.

- **Your line to the crew** is the composer at the top. It writes today's coach
  line via `set_coach_note()` — the same line the crew sees pinned in their app.
  Posting again updates it; **Take it down** deletes it. 200 characters, the
  server's own limit.
- **Hide / Show** on any athlete's line calls `hide_note()`. Hidden lines stay
  visible *to you*, greyed and tagged, so moderation is reversible and you can
  still see what you hid.
- Each line shows the athlete's **day score** for that day (the `pct` the app
  stored when they posted).

This replaces running `select public.set_coach_note('…')` in the SQL editor.
The SQL still works and is still documented — this is a second door to the same
function, not a new mechanism.

### Needs you

One list, most urgent first, everything that's actually waiting on a human:

| Row | Trigger |
|---|---|
| **Day N note: "…"** | A finished session carries an athlete note and `coach_status` is still `new` |
| **N unread messages** | Athlete messages with `read_by_coach = false` |
| **No session for N days** | A coached athlete with history and no session for > 7 days |
| **Silent on Proof — N days** | A Proof athlete with no log for ≥ 3 days |
| **New signup** | A contact created in the last 7 days |

Tap any row to open that person's file. Opening a file marks their chat read.

### Quest week

The lever, not just the readout. If a run is live you see its quests, the XP each
pays and which day of seven it's on, with **Cancel this run**. If none is live
you get the pool as checkboxes — pick one to four, **Start the week**, and it
runs seven days from today via `set_quests()`. Cancelling calls `clear_quests()`;
quests already paid keep their XP.

### Proof pulse

Every Proof athlete, **most silent first**, with seven presence dots (one per
day, today ringed in clay) and their server-scored level. This is the retention
screen — a row of grey dots is someone drifting before they churn.

---

## 4. ATHLETES

One row per person across **both** systems, split under two headings — **Needs you** and
**All quiet** — so the line between "waiting on me" and "fine" is drawn rather than implied.
Filter chips across the top (Everyone · Needs you · Coached · Free · Proof only) each carry
their count. Search by name or id; re-sort by recent activity or name.

Each row carries a tier chip — **Coached**, **Free**, **Proof only** (they log
habits but have no program file) or **No file** — their level, an ACWR pill *only when it's amber
or red*, their session count, their Proof week (`n/7`) and seven presence dots.

**A flagged row says why, in words:** *1 note to reply* · *2 unread messages* · *no session for 9
days* · *silent on Proof — 4 days* · *ready to upgrade?*. The reasons are the same triggers as the
Needs-you list on Today; before, they were folded into one dot-separated line and a row that needed
a reply looked like a row that didn't.

**+ New secure link** mints a per-athlete key and copies the program link.

---

## 5. The athlete file (`#a/<id>`)

**Rebuilt 2026-08-22.** It used to be eight sections on one scroll, three of which drew the same
program days three different ways — *Prescribed program*, *Training logs by day* and *Live activity* —
hundreds of pixels apart. Answering "did she do what I asked?" meant reading the chips in one section,
scrolling to another, and holding the numbers in your head. Now it's **five sub-tabs**, and the first
one answers that question directly.

The sub-tab lives in the URL (`#a/<id>/work`, `/proof`, `/chat`, `/calls`, `/file`), so any screen
can be bookmarked. Plain `#a/<id>` opens **The work**.

### The work — prescribed vs done, on one line

**One card per program day**, in program order, whether or not it has ever been trained. The header
carries the day, the focus name, when it was last done, sRPE · duration · AU · readiness, and a
verdict — *"1 not done · 2 off plan"* with *"5/8 exactly as prescribed"* under it. Only the most
recently trained day opens by itself; the rest are one tap.

Inside, every prescribed exercise is a row with three columns:

| | |
|---|---|
| **Prescribed** | what you wrote — `4 × 10`, `RPE 7`, tempo and any extra chips underneath |
| **Done** | sets completed against sets asked for, the load they actually used (`10 → 12 kg` when it moved within the session), and their **average RPE** — with the per-set RPEs under it |
| **Flag** | the gap, named: `2 sets short` · `not done` · `2.5 over target RPE` · `not in the plan` |

A row is bordered clay when work was skipped, ochre when it was done at the wrong dose, and plain
when it landed on plan. Your exercise note and anything the athlete wrote against that exercise sit
under its name. Anything they logged that you never prescribed appears at the bottom under
*Logged, not prescribed*.

**The RPE flag is the point of the rebuild.** The old comparison table read the log but kept only
"was this set ticked", so a session logged three RPE above target showed as `✓ 4/4 sets` in green.
The bar is `RPE_OVER` / `RPE_UNDER` in `coach.html`, both **1.5** — a set logged at 8 against a
target of 7 is a good set and doesn't need a flag; a point and a half out does.

**Reps are not compared, deliberately.** The athlete's app records weight, RPE and a tick per set —
it never asks for reps. So the dashboard compares sets, load and RPE, and says nothing about reps
rather than inventing a number you might train off.

Other things on this tab: the **day's session picker** when a day has been trained more than once
(tap a date to compare against that run instead), the athlete's note with **Reply** / **Mark read**,
the **raw log exactly as sent** behind a toggle on every day, **+ Add past session from email**, and
a collapsed **live app snapshot** — what is on their phone right now, which is a different question
from what they finished.

⚠ **Plan and log are matched by exercise name.** A session done before you rewrote the program won't
line up with the current plan — every prescribed row reads *not logged* and their real work shows
under *Logged, not prescribed*. When a whole day comes back that way the card says so in as many
words. That is the honest reading, not a bug: they really did train something else.

### The three numbers, and the charts

Training load, readiness and adherence sit as a strip of three above the day cards; the full charts
are behind **Charts**. §6 explains all three. They used to be three full-width cards above
everything, which pushed the actual work below the fold on every athlete.

### Proof · Chat · Calls · File

- **Proof** (only for people who log habits) — server-scored level, 14 presence dots, their week,
  board name and worn title, WhatsApp and email, and their wall lines with hide/show on each.
- **Chat** — the full message thread and a composer. Opening the file marks their chat read.
- **Calls** — every `call_logs` row, **+ New call log**, and **Copy cycle prompt** (bundles a cycle's
  check-ins and sessions into a ready-to-paste report prompt).
- **File** — the program and Proof links with **Rotate key**, what the data file says (id, tier,
  days/week, which cycle of the roadmap), and the delete-everything button.

## 6. The three metrics

### ACWR — acute:chronic workload ratio

Every session's load = **session RPE × duration in minutes** (Foster's method,
AU = arbitrary units). *Acute* = last 7 days; *chronic* = the 28-day weekly
average; **ACWR = acute ÷ chronic**.

| ACWR | Label | Meaning |
|---|---|---|
| **0.8 – 1.3** | Optimal | Training matches their fitness |
| **1.3 – 1.5** | Climbing | Ramping faster than ideal |
| **> 1.5** | High load | Spike — elevated injury risk |
| **< 0.8** | Low load | Detraining / under-loading |

Shows **"Building baseline"** until there are ~2 weeks of data, because the
ratio is meaningless before that.

### Readiness

The athlete's self-report (sleep, energy, soreness, stress, overall) as a
composite out of 5, **higher = fresher**. The dashboard tracks each athlete's
own baseline, so a 2/5 reads as *"down from their usual 4.1"* rather than
against a generic cutoff.

### Adherence

Planned = their program's day count × weeks; completed comes from
`session_history` with a partial counting as half. Measured over 4 weeks, and
the window shrinks for athletes who started more recently so nobody is punished
for weeks before they began. Green ≥ 85%, amber 60–84%, red < 60%.

---

## 7. PROOF

**The board** — `leaderboard_top()`, the server's own scorer, season or week.
These are the exact rows and the exact order the crew sees in their app.

**Titles minted** — the last 30 rows of `hab_titles`, newest first. A quiet
health check: if this stops moving, minting has broken (it did once, silently,
for four days — see stage23).

**Season** — which season is live and how far in. Starting or closing one stays
in the SQL editor deliberately: it resets every score, and that shouldn't be a
button on a dashboard.

**The funnel** — everyone from `contact_list()`, newest first, with **days
logged** as the qualifying signal. A free athlete past **14 logged days** is
flagged *ready to upgrade?* — they've proven the habit, so the coaching pitch is
earned rather than cold. WhatsApp opens a chat; **forget** erases their contact
details via `forget_contact()` (their logs and board place are untouched).

---

## 8. ⚠ What this page deliberately does NOT do

**It never scores Proof.** XP, levels, day scores and streaks are already
computed twice — the client in `habits.html` and plpgsql in Supabase — and those
two must agree (see `CLAUDE.md`, *Everything in Proof that is scored TWICE*). A
third scorer here would be a third thing to keep in sync and the first to drift.

So every Proof number on this page is one of exactly two things:

1. **A presence fact** — "this day has a non-empty log entry", the same test
   `contact_list()` uses server-side. That's what the dots, `n/7`, "on court
   today" and the silence counters are.
2. **A number the server returned** — `hab_season_level()`, `leaderboard_top()`,
   `contact_list()`.

If you want a new Proof number here, get the server to return it. Don't compute
it in this file.

---

## 9. Where the data comes from

| Source | Feeds |
|---|---|
| `session_history` | Sessions, ACWR, readiness, adherence, notes to reply |
| `athlete_progress` | Last active, live snapshot, and the habit log behind every presence dot |
| `athlete_keys` | Secure links, and the key `leaderboard_top()` is called with |
| `messages` | Chat threads and unread counts |
| `hab_notes` | The wall, the coach line, moderation |
| `hab_contacts` via `contact_list()` | The funnel, contact buttons, days logged |
| `leaderboard_optin` | Who's on the board, their display name and worn title |
| `hab_titles` | Titles-minted feed |
| `xp_rules` | The quest pool and the live runs |
| `seasons` | Which season, and what day of it |
| `call_logs` | Weekly check-ins (loaded per athlete, on open) |
| `data/<id>.json` | Names, tier, prescribed program, sessions/week |

The **prescribed-vs-done** comparison joins the last two: the plan comes from
`data/<id>.json`'s chips, what happened comes from parsing the plain-text `summary`
that `program.html` wrote into `session_history`. Both readers live in `coach.html`
(`parseChips()` / `parseSessionLog()`) and both mirror code in `program.html` —
change the grammar there and they have to follow. `node scripts/test_coach_compare.js`
runs 44 assertions over real logs and catches it if they don't.

Coach writes go through the guarded RPCs — `set_coach_note`, `hide_note`,
`set_quests`, `clear_quests`, `forget_contact`, `save_session` — each of which
enforces the coach email itself.
