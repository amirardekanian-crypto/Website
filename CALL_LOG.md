# Weekly Check-In Log — User Manual

A plain-English guide to `call-log.html`: your private tool for running and
recording the weekly athlete check-in call. Pairs with **`COACH_DASHBOARD.md`**
(progress tracking) — the dashboard is the *data*, this is the *conversation*.
Every value below is the real one from the code.

---

## 1. Getting in

Open `call-log.html` and **Sign in with Google** using `amirardekanian@gmail.com`.
Any other account is rejected. The page is `noindex` and has no menu — it's only
for you.

> Same gate as the dashboard: the Google sign-in is the convenience check; the
> real security is the database (Row Level Security), so only your account can
> read or write call logs.

You can also reach it **straight from the dashboard** — each athlete's panel has
a **"+ New call log"** button that opens this page with that athlete already
selected (`call-log.html?athlete=<id>`).

---

## 2. The top of the page — choosing who & when

A single row sets the context for the whole call:

| Field | What it does |
|---|---|
| **Athlete · Program** | Dropdown of your athletes. When someone has more than one program file (e.g. `mhrn_zhr1` *and* `mhrn_zhr2`), the option shows **— P1 / — P2** so you know which block you're logging against. A badge underneath spells out the exact file (`mhrn_zhr2.json`). |
| **Week** | Plain **1–6** picker — which week of the cycle this call is. |
| **Cycle** | Plain **1–6** picker — which cycle of the program. *(This is the tag the end-of-cycle report groups by — §7.)* |
| **Date** | Defaults to today. |
| **Duration** | Free text (e.g. "15 min"). |
| **Tier buttons** | Game / Set / Match — your service tier for this athlete (1 / 3 / 6-month programme). |

**Where the athlete list comes from:** every athlete you've issued a **secure
link** to (`athlete_keys`) plus anyone who has synced progress (`athlete_progress`).
The friendly name comes from their synced data; before they've synced you'll see
their id (e.g. `mhrn_zhr2`) instead of a name — that's expected.

---

## 3. The check-in form — eight sections

The body is a structured call script. Each section collapses; the first few are
open by default. Every **? button** opens a coach-tip popup (why the question
matters + sample answers).

| # | Section | ~Time | Captures |
|---|---|---|---|
| 01 | **Open & Wellbeing** | 5 min | Overall feeling, sleep, energy, soreness (each /10) + life context |
| 02 | **Last Week's Training** | 5 min | Sessions done/planned, best & hardest session, RPE trend |
| 03 | **Wins & Progress** | — | Proud-of, what's easier, PBs, vs-when-we-started + the **Win Vault** |
| 04 | **Physical Status & Injury** | 2 min | Pain/niggles, carry-overs, court load (matches + practice hrs) |
| 05 | **On-Court Performance** | 3 min | Movement /10, gym→game transfer, match results |
| 06 | **Next Week — Goals** | — | Programme adjustments, the ONE thing, extra goals, challenges |
| 07 | **Programme Fit & Feedback** | 2 min | Anything confusing, exercises that felt wrong, more/less |
| 08 | **Close the Call** | 1 min | A specific positive to close on, action items, **call-quality star rating**, private notes |

**Score buttons** are 1–10 and colour as you tap: **1–3 red · 4–6 amber · 7–10
green** (same logic across wellbeing, sleep, energy, soreness, RPE, on-court).

**Win Vault** (in §03) is for the single best line of the call — it's surfaced
later for content and testimonials.

---

## 4. Running the check-in over WhatsApp (Farsi)

You don't have to do it on a call. Every athlete-facing question has a small
**«فا»** button that copies that question **in Farsi**, ready to paste into
WhatsApp. The **📲 Copy full check-in (Farsi)** button at the bottom copies the
whole set as one numbered message that greets the athlete by first name.

Paste their replies into the matching fields as they come back — same log, either
way.

---

## 5. Saving & re-opening past logs

- **💾 Save Call Log** writes the call to the `call_logs` table. It's keyed by
  **athlete + date**, so re-saving the same athlete on the same day **updates**
  that log — it never makes a duplicate.
- Once an athlete is selected, their **previous logs** appear as a strip of chips
  (date · cycle · ★rating). **Click one to open it** into the form to read or
  edit; click **+ New log** to start a fresh one (athlete/cycle/date stay, the
  rest clears).
- **📋 Copy Wins** copies just this call's win-flagged answers + the Win Vault.

> Set the **Week/Cycle** pickers every time. They're stored on the log (as
> "Week 3 · Cycle 2") and are how the end-of-cycle report finds the right weeks
> (§7). A log with no cycle tag won't be picked up by a cycle report.

---

## 6. AI weekly summary (no paid API)

Turn the raw check-in into a clean weekly snapshot using **any free AI chat** —
Claude.ai, ChatGPT, Gemini. Nothing is bought or wired up.

1. Click **📋 Copy AI prompt** — it copies this week's check-in plus the coaching
   instructions to your clipboard and opens a panel.
2. Paste into your AI → you get a tidy summary (how the week went, wins, a content
   flag, goals, flags).
3. *(Optional)* paste the result back into the panel and **Save Call Log** to keep
   it with the log.

The summary is **this week's call only** — it makes no next-cycle decision (that's
the cycle report's job), and it never touches the athlete's workout logs.

---

## 7. End-of-cycle report (the part you build the next cycle from)

At the end of a cycle, one prompt reads **all of that cycle's weekly check-ins +
all the workout logs** for the cycle and gives you the trends and the
programming decisions for the next block, plus any content-worthy wins.

**Two ways to run it:**

- **Here** — pick the athlete, set the **Cycle** number, click **📊 Copy cycle
  prompt**.
- **From the dashboard** — each athlete's panel has a **cycle dropdown + 📋 Copy
  cycle prompt** in the *Weekly check-in calls* section, built from data already
  on screen.

Either way it gathers the cycle's weekly logs (matched by cycle number) and the
workout sessions in that window, builds the prompt, and copies it. Paste into any
AI for the report; *(optional)* paste it back and **Save report** to store it.

> The cycle report is only as good as its inputs: it needs **saved weekly logs
> tagged with that cycle number**, and workout logs that the athlete actually
> finished in the app. The workout window is inferred from the weekly call dates
> (about two weeks before the first to a few days after the last).

---

## 8. What each piece needs to work

| To get… | You need… |
|---|---|
| An athlete in the **dropdown** | A secure link issued to them (or they've synced) |
| Their **real name** (not the id) | Them to have opened/synced the app at least once |
| A **program number (P2)** shown | More than one `data/<id>.json` file for that athlete |
| The **AI weekly summary** | Just the form filled + any free AI chat |
| The **cycle report** | Saved weekly logs tagged with the cycle number + finished sessions logged in the app |

---

## 9. Where the data lives (for reference)

| Table | Holds | Used by |
|---|---|---|
| `call_logs` | One row per athlete per call (scores, notes, Win Vault, the readable summary, and an optional pasted AI summary) | This page; the dashboard's *Weekly check-in calls* section |
| `cycle_reports` | An optional saved end-of-cycle report per athlete + cycle | §7 (when you paste a report back to save) |
| `session_history` *(input)* | Finished workout sessions (RPE, duration, readiness…) | The cycle report's workout-log half |
| `athlete_keys` + `athlete_progress` *(input)* | Secure-link keys + synced names | Building the athlete dropdown |

---

*The AI summary and cycle report use a **copy-the-prompt** model — the page builds
the prompt and your data, you run it in whatever AI you like, no API key and no
per-use cost. Styling matches the rest of the site (the Roland-Garros palette —
green / clay / ochre on warm paper, Barlow + Space Mono) so it sits naturally
beside `coach.html`.*
