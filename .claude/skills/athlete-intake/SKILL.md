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
Confirm/collect, grouped into one round of questions. This mirrors
`COACHING-PRINCIPLES.md → Intake & assessment` — gather the recovery and injury picture
now, because design can't set the volume ceiling or the contraindications without it.
- **Goal** (specific) + any competition / season timeline
- **Athlete type**: general-fitness  OR  sport-performance (+ sport) — this decides
  whether SFR or sport-transfer leads exercise selection in design
- **Training age** / experience + **any known baseline lifts** — note so design can
  sanity-check claims vs reality when watching them train (trust the bar over the résumé)
- **Injury history** — *past* injuries, surgeries and recurring pain, **plus** any current
  restriction with its stage (active / resolving / resolved). Prior injury is the best
  predictor of the next and pre-loads the contraindications. **Red flag** (sharp /
  persistent / worsening / radiating pain, numbness, suspected real injury) → flag for
  referral to a physio/doctor before loading it.
- **Equipment access** (full gym / home / which machines) — gates the SFR selections
- **Days/week** available + **session-length ceiling** — if this can't support the goal,
  note it to renegotiate (ask for a bit more time *if the limit isn't real*; otherwise
  design honestly reframes the goal as maintenance, not failure)
- **Recovery & lifestyle baseline** — **sleep, stress, nutrition, age, weekly life-load** —
  gates recovery capacity / the volume ceiling

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
