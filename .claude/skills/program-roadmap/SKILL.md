---
name: program-roadmap
description: Design an athlete's locked multi-cycle training roadmap (the cycles[] array). Run ONCE at onboarding, or when the long-term plan materially changes. Use when Amir says "build the roadmap", "plan her cycles", or right after /athlete-intake for a new client. After this, the roadmap is LOCKED — /program-design and /program-engage read it, never rewrite it.
---

# Roadmap Architect — Stage A (one-time, then locked)

You are an elite S&C coach and program architect. From the **ATHLETE BRIEF**, design
the full multi-cycle roadmap for the athlete's goal. This is the ONLY stage that
creates the roadmap — its existence is why /program-design and /program-engage can
never drift from the plan.

## Inputs
- The **ATHLETE BRIEF** (goal, athlete type, timeline, days/week, constraints). For a
  returning athlete who somehow has no roadmap yet, the `athlete-brief` subagent can
  generate the brief first.
- **PROGRAM_START_DATE** (`YYYY-MM-DD`). If unknown, ask once.

## Rules
- **Multi-lens panel is MANDATORY (Amir's standing order, 2026-07-24).** Read
  `.claude/COACHING-PRINCIPLES.md` → Process → "Every design pass runs a multi-lens
  panel" and run that shape via the Workflow tool: 3+ independent specialist proposals
  (lenses picked to fit the athlete) → a head-coach judge scoring against the brief +
  principles → Claude synthesizes the final roadmap from the winner + best grafts.
  Never skip it to save time; Amir asked for it on every program.
- **EVERY athlete gets 5 cycles of 5 weeks — 25 weeks. Hard business rule, no exceptions**
  (Amir, 2026-08-17: *"for each athlete i plan for 5 cycles of 5 weeks"*). Do not vary the
  cycle count or a cycle's length to suit the goal, and do not let a design panel talk you
  out of it — a panel may argue for 4 cycles or a 6-week block on the science, and it is
  overruled. Fit the arc to 5×5; the *content* of the cycles is where the goal and the
  science get expressed.
- **Each cycle is 4 loading weeks + 1 back-off week.** The back-off is the 5th week of every
  cycle, which is what satisfies "never program past a fatigue wall" without a mid-cycle
  deload. ⚠️ The back-off week is **NOT authored into the exercise cards** — see the rule
  below.
- ⚠️ **The cards carry the athlete's NORMAL prescription; temporary weeks live in the NOTES.**
  A week-1 calibration week, a week-5 back-off, a low-readiness stretch — none of these are
  ever written as a lower RPE/volume on the exercise itself. Amir does not change a program
  mid-cycle, so the card is a stable reference all cycle and the temporary instruction is a
  notes card written by /program-engage. Full rule: `.claude/COACHING-PRINCIPLES.md` →
  Progression → "The RPE printed on a card is the athlete's NORMAL working target". Write
  roadmap focus lines the same way — describe how he trains *normally*, not how week 1 runs.
- **Name each cycle to be COOL and evocative** — a punchy 1–2 word power-name that *sells*
  the phase, not a dry label ("Lower Body Block" ✗). Lean on build / material / machine /
  combat imagery, and still hint at the phase's job. House library to draw on or extend:
  *Foundation Forge · Strength Engine · Structural Build · Durability Build · Armour Build ·
  Load Build · Rebuild & Reset · Strength Reclaim · Power Transfer · Metabolic Override ·
  Bedrock · Volume Engine*. Pair each with a **2–5 word tagline**.
- One-line **primary** focus + one-line **secondary** focus per cycle.
- Compute calendar **start–end dates** for every cycle from PROGRAM_START_DATE,
  carried forward cycle to cycle (the runtime cannot call `Date.now()` — derive from
  the given start date).
- Concise. This is a roadmap, not a program — no exercises.

## Output (becomes `cycles[]` — names / taglines / weeks / dates / focuses only)
```
CYCLE 1 — [Name] · Weeks 1–[X] ([start] – [end])
Tagline: …
Primary: …
Secondary: …
[repeat for every cycle]
```

Close with: **"ROADMAP LOCKED — /program-design and /program-engage consume this,
never edit it."** /program-assemble writes it into `cycles[]`.
