---
name: athlete-intake
description: Onboard a NEW coaching client — gather everything program design needs before any exercise is chosen. Use when Amir adds a new athlete, says "new client", "intake", "onboard <name>", or pastes a new athlete's info. Pulls their Web3Forms intake form from Gmail, fills the gaps by asking Amir, and produces a clean Athlete Brief that /program-roadmap and /program-design consume. For RETURNING athletes skip this — /program-design pulls their history automatically.
---

# New-athlete intake

Produce a complete **ATHLETE BRIEF** for a brand-new client so the roadmap and first
program can be designed from a full picture. This stage assembles the input only — it
designs nothing.

This brief is the front end of the **Design process → Phase 1 (ASSESS)** in
`.claude/COACHING-PRINCIPLES.md`. **Online-first (RULE 2): there is never an in-person
screen** — this brief plus Amir's notes (and later the in-app logs) are the *entire*
baseline the designer ever gets. So gather it completely and from evidence: capture what
the intake establishes, ask Amir for the rest, and **flag what's genuinely unknowable
without a clinician (e.g. an undiagnosed injury) as an OPEN QUESTION — never infer it.**

## Step 1 — Pull what already exists
- Establish the `athlete_id` (lowercase `firstname_lastname`). If Amir pasted athlete
  info, use it.
- Invoke the **`athlete-brief`** subagent in MODE=`new` to pull the Web3Forms intake
  submission from Gmail and list what's missing. (If there's no form, work from what
  Amir pasted.)

## Step 2 — Fill the gaps (ask Amir; never invent)
Confirm/collect, grouped into one round of questions:
- **Goal** (specific) + any competition / season timeline
- **Athlete type**: general-fitness  OR  sport-performance (+ sport) — this decides
  whether SFR or sport-transfer leads exercise selection in design
- **For sport-performance clients — the sport's demands** (design's needs analysis, step 1):
  level/position, in- vs off-season + key competition dates, dominant movement patterns, and
  the sport's common injuries — so design serves the demands of the sport, not just the
  stated goal
- **Training age** / experience
- **Injuries & restrictions** — each with current stage (active / resolving / resolved)
- **Equipment access** (full gym / home / which machines) — gates the SFR selections
- **Days/week** available + **session-length ceiling**
- **Sleep & stress baseline** — gates recovery capacity

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
