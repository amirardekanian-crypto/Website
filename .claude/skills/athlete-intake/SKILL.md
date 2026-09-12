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
+ hours**, **stress**, **nutrition**, **weekly life-load**, **current best lifts** (optional),
equipment, environment. Step 1's brief should already hold those, so **don't re-ask them** —
confirm, then only resolve what's left to coach judgement or what the athlete left blank.
Grouped into one round of questions, the genuine gaps to close:
- **Goal specificity + timeline** — turn the goal checkboxes into one concrete target
  (+ any competition / season date)
- **Athlete type**: general-fitness OR sport-performance (+ sport) — decides whether SFR or
  sport-transfer leads exercise selection in design
- **Baseline lifts** — the form asks them but they're *optional*; if blank, plan to gauge
  strength by watching them train (trust the bar over the résumé)
- **Red-flag triage** on any reported pain — if the injury description reads sharp /
  persistent / worsening / radiating, or numbness / suspected real injury, flag for
  referral to a physio/doctor before loading it
- **Frequency vs goal** — if the form's days/week + session ceiling can't support the goal,
  note it to renegotiate (ask for a bit more time *if the limit isn't real*; otherwise
  design honestly reframes the goal as maintenance, not failure)

## Step 3 — Emit the brief + register the athlete
- Output the **ATHLETE BRIEF** (same structure the subagent uses).
- **Register them: two server-side rows. No file, no key.**
  ⚠️ The old `athlete_keys` + `?client=&key=` mechanism is **retired** (2026-09-07). The
  table is empty, the keyed RPCs fail closed, and a key written now is dead weight that
  makes the next reader think links still work. See `CLAUDE.md` → *THE BIG ONE*.

  **1. The roster row — `public.programs`.** `loadPrograms()` in `coach.html` states
  *"The programs table IS the roster now"*, so this row is the thing that puts them on
  the Athletes list. The minimum viable row, as created for `mahla_banaei` on 2026-09-12:
  ```sql
  insert into public.programs (athlete_id, data, updated_by) values (
    '<id>',
    jsonb_build_object(
      'athlete', jsonb_build_object(
        'id','<id>', 'firstName','<First>', 'lastName','<Last>', 'boardName','<First Last>'),
      'sport',   jsonb_build_object('badge','🎾 Tennis Performance')   -- optional
    ),
    'intake')
  on conflict (athlete_id) do nothing;
  ```
  No `tier` key = a coaching client (free Proof signups carry `athlete.tier = "free"`,
  which is `/proof-signup`'s job, not this one). `boardName` only pre-fills the join box
  in Proof — it never joins anyone to the leaderboard. `/program-assemble` later fills
  this same row with the real programme, so **`do nothing`**: never clobber a programme.

  **2. The contact row — `public.hab_contacts`** (coach-only behind RLS). The only place
  email/WhatsApp may live — ⚠️ never in the programme record.
  ```sql
  insert into public.hab_contacts
    (athlete_id, display_name, email, whatsapp, source, tier, note)
  values ('<id>', '<First Last>', '<email>', '<whatsapp>',
          'intake', 'coached', '<one line: where they came from, the deal, paid or not>')
  on conflict (athlete_id) do nothing;
  ```
  ⚠️ **Do not call the `add_contact()` RPC to do this.** It still inserts an
  `athlete_keys` row as a side effect — the dead mechanism above — and it is guarded by
  `is_coach()`, which reads the caller's JWT email, so from a plain SQL connection it only
  raises `coach only`. Insert directly.

- **Do NOT create the login here.** Amir issues it from **coach.html → Athletes → the
  athlete → Create login** when he is ready to let them in (normally after payment). That
  calls the `athlete-login` Edge Function — it needs the service-role key, so it cannot be
  done in SQL — which creates the account on `athlete.<id>@amirardekani.com` and writes
  `public.athlete_identities`. The password then waits under *Logins to send* on the
  Athletes tab for him to send on WhatsApp. Never hand out a URL with a key in it.
- Keep the brief **in the conversation** — do not write athlete chat/health detail
  into the repo (public GitHub Pages).
- Hand off: run **/program-roadmap**, then **/program-design**.

## Don'ts
- Don't choose exercises, days, or splits here — that's /program-design.
- Don't invent missing intake answers — ask.
- Don't commit the brief or raw intake to git.
- Don't generate an athlete key, touch `athlete_keys`, or hand anyone a
  `?client=&key=` link — that whole mechanism is dead. The login is a username and
  password, created from coach.html when Amir says so.
- Don't create the login yourself, and don't promise the athlete access before it
  exists — a programme row is not a way in.
