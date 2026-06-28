---
name: athlete-intake
description: Onboard a NEW coaching client — gather everything program design needs before any exercise is chosen. Use when Amir adds a new athlete, says "new client", "intake", "onboard <name>", or pastes a new athlete's info. Pulls their Web3Forms intake form from Gmail, fills the gaps by asking Amir, and produces a clean Athlete Brief that /program-roadmap and /program-design consume. For RETURNING athletes skip this — /program-design pulls their history automatically.
---

# New-athlete intake

Produce a complete **ATHLETE BRIEF** for a brand-new client so the roadmap and first
program can be designed from a full picture. This stage assembles the input only — it
designs nothing.

## Step 1 — Pull what already exists
- Establish the `athlete_id` (lowercase `firstname_lastname`). If Amir pasted athlete
  info, use it.
- Invoke the **`athlete-brief`** subagent in MODE=`new` to pull the Web3Forms intake
  submission from Gmail and list what's missing. (If there's no form, work from what
  Amir pasted.)

## Step 2 — Fill the gaps (ask Amir; never invent)
The **Web3Forms intake form already captures most of this** — age, sex, body weight,
gym experience (training age), goals, current pain/injury + description (stage & severity),
**past injuries/surgeries**, movements-to-avoid, days/week, session length, **sleep quality
+ hours**, **stress**, equipment, environment. Step 1's brief should already hold those, so
**don't re-ask them** — confirm, then only collect what the form omits or the athlete left
blank. Grouped into one round of questions, the genuine gaps to close:
- **Goal specificity + timeline** — turn the goal checkboxes into one concrete target
  (+ any competition / season date)
- **Athlete type**: general-fitness OR sport-performance (+ sport) — decides whether SFR or
  sport-transfer leads exercise selection in design
- **Known baseline lifts** (if any) — so design can sanity-check claims vs reality when
  watching them train (trust the bar over the résumé)
- **Nutrition** and **weekly life-load** (work hours / caregiving / travel) — the recovery
  inputs the form does *not* collect; they finish the volume-ceiling picture alongside the
  form's sleep + stress
- **Red-flag triage** on any reported pain — if the injury description reads sharp /
  persistent / worsening / radiating, or numbness / suspected real injury, flag for
  referral to a physio/doctor before loading it
- **Frequency vs goal** — if the form's days/week + session ceiling can't support the goal,
  note it to renegotiate (ask for a bit more time *if the limit isn't real*; otherwise
  design honestly reframes the goal as maintenance, not failure)

## Step 3 — Emit the brief + register the athlete
- Output the **ATHLETE BRIEF** (same structure the subagent uses).
- Generate a 32-char hex key: `node -e "console.log(require('crypto').randomUUID().replace(/-/g,''))"`,
  then register it:
  ```sql
  INSERT INTO athlete_keys (athlete_id, secret_key) VALUES ('<id>','<key>')
  ON CONFLICT (athlete_id) DO NOTHING;
  ```
- Keep the brief **in the conversation** — do not write athlete chat/health detail
  into the repo (public GitHub Pages).
- Hand off: run **/program-roadmap**, then **/program-design**.

## Don'ts
- Don't choose exercises, days, or splits here — that's /program-design.
- Don't invent missing intake answers — ask.
- Don't commit the brief or raw intake to git.
