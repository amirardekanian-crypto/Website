# Coach Dashboard — User Manual

A plain-English guide to `coach.html`: your private dashboard for tracking
athlete progress. Every threshold below is the real value from the code, so
this doubles as the reference for how flagging actually works.

---

## 1. Getting in

Open `coach.html` (your private dashboard URL) and **Sign in with Google** using
`amirardekanian@gmail.com`. Any other account is rejected. The page has no menu
and isn't indexed by Google — it's only for you.

> The Google check is the convenience gate; the real security is in the database
> (Row Level Security), so even if someone reached the page, they can't read
> athlete data without your account.

---

## 2. The front page — the triage queue

Instead of a flat list, athletes are sorted by **who needs you most**, in three groups:

| Group | Colour | Meaning |
|---|---|---|
| 🔴 **Needs attention** | red | At least one serious flag — look today |
| 🟡 **Watch** | amber | A mild flag — keep an eye on |
| 🟢 **On track** | green | No flags. **Collapsed by default** — click "tap to show" to expand |

**Controls at the top:**

- **Search box** — filter by name (type "tom" → only Tom).
- **Sort dropdown:**
  - *Needs attention* (default) — the grouped triage view above
  - *Recently active* — most recent first, flat list
  - *Name* — alphabetical, flat list
- **+ New secure link** — create a new athlete's private link (unchanged from before).

---

## 3. What's on each athlete card

| Element | What it means | What it needs to appear |
|---|---|---|
| **Coloured left border** | Red = needs attention, amber = watch, none = on track | A flag (see §5) |
| **Name** | Athlete's name | From their data file / sessions |
| **"last active … · N sessions"** | When they last synced, and how many finished sessions exist | Any activity |
| **Sparkline** (blue line) | Their training-load trend, session by session | **≥ 2 sessions with both RPE *and* duration logged** |
| **ACWR pill** | Workload safety zone (see §4) | ≥ 2 weeks of sessions with duration; otherwise shows **"ACWR · building"** |
| **Readiness pill** | Their latest readiness score /5 | At least one completed readiness check |
| **Adherence pill** | % of planned sessions completed (see §4) | A program file (`data/<id>.json`) + at least one finished session |
| **🔒 / ⚠ badge** | 🔒 = secure link, ⚠ = old "legacy" link anyone could write to | Whether you've generated a secure link for them |
| **Flag chips** | Plain-English reasons they're flagged (up to 3) | A triggered flag |

---

## 4. The two key metrics explained

### ACWR — Acute:Chronic Workload Ratio

**The headline injury-risk number.** It compares how hard they've trained *this
week* against their *recent month's average*.

- **How it's calculated:** Every session's load = **session RPE × duration in
  minutes** (sports-science "Foster method", measured in AU = arbitrary units).
  - *Acute* = total load in the **last 7 days**
  - *Chronic* = average weekly load over the **last 28 days**
  - **ACWR = acute ÷ chronic**
- **Zones:**

| ACWR | Label | Colour | Meaning |
|---|---|---|---|
| **0.8 – 1.3** | Optimal | green | Training matches their fitness — the sweet spot |
| **1.3 – 1.5** | Climbing | amber | Ramping up faster than ideal |
| **> 1.5** | High load | red | Spike — elevated injury risk |
| **< 0.8** | Low load | amber | Detraining / under-loading |

- **"Building baseline":** Shown until there's **~2 weeks of data**. ACWR is
  meaningless on a few sessions, so it deliberately won't show a number yet.

### Readiness

**A daily self-report of how fresh they feel** (sleep, energy, soreness, stress,
overall), averaged into a composite score out of 5 (**higher = fresher**).

- The dashboard tracks each athlete's **personal baseline** (their own average),
  so "2/5" is read as *"down from their usual 4.1"* — not a generic number.
- A drop against *their own baseline* is what flags them, which catches problems
  an absolute cutoff would miss.

### Adherence

**Did they actually do the sessions you planned?**

- **How it's calculated:** Planned sessions = their program's day count
  (`workouts.days`) × the number of weeks. Completed sessions come from
  `session_history` (a partial counts as half).
  **Adherence % = completed ÷ planned.**
- Measured over the **last 4 weeks** — but the window shrinks for athletes who
  started less than 4 weeks ago, so a new athlete isn't unfairly penalised.
- **Colours:** green ≥ 85%, amber 60–84%, red < 60%.
- If no program file exists for them, adherence simply isn't shown.

---

## 5. How flagging works (exact triggers)

An athlete's group = the **most severe** flag they have. Here's every rule:

| Flag chip | Trigger | Severity |
|---|---|---|
| **Silent — X days, no training** | No activity for **> 14 days** | 🔴 red |
| **Quiet — X days idle** | No activity for **8–14 days** | 🟡 amber |
| **Load spike — ACWR X** | ACWR **> 1.5** | 🔴 red |
| **Load climbing — ACWR X** | ACWR **1.3–1.5** | 🟡 amber |
| **Detraining — ACWR X** | ACWR **< 0.8** | 🟡 amber |
| **Readiness ↓ X vs Y usual** | Latest readiness is **≥ 1.0 below** their baseline | 🔴 red |
| **Readiness dipping** | Latest readiness is **0.5–1.0 below** baseline | 🟡 amber |
| **Low adherence — X% of plan** | Adherence **< 50%** | 🔴 red |
| **Adherence slipping — X%** | Adherence **50–69%** | 🟡 amber |
| **Last session left partial** | Their most recent session was finished as "Partial" | 🟡 amber |

*(ACWR and readiness flags only fire once there's enough data — see §4.)*

**Tunable values** live near the top of the `<script>` in `coach.html`:
`QUIET_DAYS = 7` (idle threshold) and the ACWR/readiness cut-offs inside the
`acwrZone` and `triage` functions.

---

## 6. The athlete detail page

Click any card to open it. Below the secure-link panel you get **two charts**,
then the existing finished-session records and live activity.

**Training load card:**

- Big number = **current ACWR** + its zone, colour-coded
- "X AU this week vs Y AU weekly average" — the raw figures behind the ratio
- **8-week bar chart** of weekly load — see if they're ramping, steady, or dropping off

**Readiness card:**

- Big number = **latest score /5** vs "usual" (baseline)
- The +/- vs their session average
- **Line chart** of readiness per session, with the baseline drawn as a
  **dashed line** — so a dip is obvious at a glance

**Adherence card:**

- Big number = **adherence %** over the measured window
- "X of Y planned sessions completed"
- A **progress bar** coloured green / amber / red

---

## 7. What feeds the dashboard — what athletes must do

Everything comes from the athlete's app (`program.html`) when they tap
**Finish / Send to Coach**. For each metric to work:

| Metric | Athlete must… |
|---|---|
| Appears at all | Complete (or partially complete) a session and finish it |
| **Session RPE** | Rate the session 1–10 (required to send) |
| **Training load + ACWR + sparkline** | Have a **duration** logged for the session — without it there's no load number |
| **Readiness** | Complete the readiness check at the **start** of a session (not tap "skip") |
| **Adherence** | Have a `data/<id>.json` program file (defines sessions/week) + finish sessions |
| **Last active** | Any sync — happens automatically as they use the app |

So if an athlete never logs duration, you'll see RPE and readiness but ACWR will
stay blank. If they always skip the readiness check, the readiness chart stays empty.

---

## 8. Why is everything saying "building baseline" right now?

Because the `session_history` table is essentially empty so far. **This is
expected, not a bug.** The dashboard lights up automatically as athletes start
finishing sessions — you don't need to do anything. Give it ~2 weeks of real
session data and the ACWR/readiness intelligence fills in on its own.

---

## 9. Where the data lives (for reference)

Three Supabase tables feed the dashboard:

| Table | Holds | Drives |
|---|---|---|
| `session_history` | One row per finished session (RPE, duration, readiness, status, date, summary) | ACWR, readiness, flags, charts, finished-session records |
| `athlete_progress` | Live rolling snapshot of an athlete's in-app progress | "Last active", live-activity view |
| `athlete_keys` | Each athlete's secret link key | 🔒 / ⚠ badge, secure links |

---

*Features added: triage front page + workload / readiness / adherence charts.
Charts are hand-rolled inline SVG (no external library), so the dashboard stays
self-contained and works offline like the rest of the site. The styling matches
`program.html` — the Roland-Garros palette (green / clay / ochre on warm paper),
the same fonts, and a sticky brand nav.*
