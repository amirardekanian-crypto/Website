# Coaching Principles — Amir Ardekanian

This is Amir's codified coaching philosophy. `/program-design` and `/program-engage`
**read this file first, every run**, and apply it — so settled questions are never
re-asked. It grows as we design together: when Amir makes a **generalizable** call
during design, the skill offers to append it here (he approves; one-off athlete-specific
calls are NOT saved). Amir can open and edit this file anytime.

Tracked in git (synced + versioned) but inside `.claude/`, so GitHub Pages does not
publish it. No athlete health/chat detail goes here — principles only.

> How to add: append a dated bullet under the right section. Keep each principle one or
> two lines, general (applies across athletes), and actionable.

---

## Exercise selection
- **SFR leads for general-fitness clients.** Pick the highest stimulus-to-fatigue option
  per pattern: Machine Shoulder Press > DB OHP · Leg Press > Back Squat · 45° Back
  Extension > Barbell RDL · Chest-Supported Row > Barbell Row. *(2026-06-15)*
- **Sport-performance athletes: transfer can override SFR** — state the trade-off
  explicitly (e.g. Back Squat over Leg Press for a tennis player: lower SFR, higher
  athletic transfer). *(2026-06-15)*
- **Accessories rotate every cycle** for variety — always to a *safe* alternative. *(2026-06-15)*
- **Rehab/corrective:** keep the best-in-class pieces; rotate the rest for freshness.
  (Coach may elect to rotate the whole block — done for Mehraneh C3.) *(2026-06-15)*
- **Knee-history clients:** reverse lunge over forward lunge; reintroduce plyometrics
  with stick-landings / step-downs; lateral bounds are the highest-risk item — ramp last. *(2026-06-15)*
- **Chronic-back clients:** lead the hinge with trunk-supported options (45° Back
  Extension + Hip Thrust) and defer the loaded *free* hinge (barbell RDL/deadlift) one
  cycle — build the brace first, then load the free pattern (the brace is its permission
  slip). Also high-SFR, so little stimulus is lost. *(2026-06-15)*
- **Posture / tennis clients:** horizontal-press volume deliberately low or omitted;
  bias posterior chain + scapular health. *(2026-06-15)*

## Exercise naming
- **Name = `[modification] [equipment] [movement]`** (e.g. Standing Dumbbell Shoulder
  Press); bodyweight moves take the bare movement, no "Bodyweight" prefix (e.g. Reverse
  Lunge). *(2026-06-15)*
- **Grip / intent / execution tweak is a chip, never the name** (e.g. Lat Pulldown +
  `wide grip`; Chin-Up). Keeps card titles clean and stable. *(2026-06-15)*
- **`exercise_library.json` (generated from Notion) is the source of truth for names —
  it is the video join key.** Author each exercise to the library's canonical spelling
  exactly; `/program-assemble` validates and flags misses. Established names keep their
  digits (45° Back Extension, 90/90, B-Stance) — don't mangle them. *(2026-06-15)*
- **The app resolver normalizes case/punctuation/accents** as a safety net, so minor
  drift still finds the video and Notion renames don't break old programs — but
  word/digit/possessive differences (Leg Press vs Machine Leg Press, Farmer vs Farmer's)
  still need the exact canonical name. *(2026-06-15)*

## Recovery & autoregulation
- **Recovery capacity gates everything** — set the weekly volume ceiling *before*
  choosing session count. *(2026-06-15)*
- **High-/chronic-stress clients:** embed an autoregulation rule (drop every RPE by 1 on
  low-readiness days) + a minimum effective dose (first power move + first primary lift)
  + flexible session order. *(2026-06-15)*
- **Separate training fatigue from life load** in every review — a readiness dip from
  poor sleep/stress is not the same as training fatigue (Mehraneh's end-cycle dip was
  life, not load). *(2026-06-15)*
- **Never program past a fatigue wall** — build a deload/back-off after dense weeks
  (Mehraneh ran 4 sessions in 5 days in C2 and hit a wall). *(2026-06-15)*

## Session structure & time
- **Time-limited clients (esp. tennis): cap sessions ~45–50 min.** Power work (low volume,
  long rest, few reps) is naturally shorter and fits the constraint. *(2026-06-15)*
- **Sequencing:** power/CNS → primary strength → accessories → corrective/core. *(2026-06-15)*
- **Standard section (block) names, in order:** **Prime** *or* **Activation & Prep**
  (the whole warm-up — interchangeable, general) → **[power/explosive]** (free-name by
  content — Power / Plyometrics / Speed / Med Ball — no fixed icon needed) → **Primary**
  (the main lifts) → **Accessory** (assistance work) → **Core** (any core work, *including
  bracing/anti-movement & carries*) → **[conditioning]** (free-named by content, always
  **last**, after everything). Use these names so the app's section headers stay
  consistent across athletes. *(2026-06-17)*
- **Superset non-competing pairs** to save time. *(2026-06-15)*
- **Round-format circuits log load by default** — any superset / complex / conditioning
  circuit gets an inline weight field *per exercise* + one RPE *per round* (each exercise
  its own weight; the RPE rates the whole round). Only **warm-up / prep** circuits opt out
  with `"warmup": true` (they log nothing — the pre-session readiness check covers feel).
  Authored in the JSON; see SCHEMA.md "Circuit logging". *(2026-06-17)*

## Progression (coach-driven)
- **Progression is coach-driven from the weekly logs** — the app shows one prescription
  per exercise, so the program is a starting point Amir adjusts each week. *(2026-06-15)*
- **Set increments from logged data** (RPE/RIR, bar speed), not guesswork. *(2026-06-15)*

## Volume & dosing
- **Volume is a report, not a rule.** Show programmed sets/muscle vs the goal range vs a
  verdict; frame an under-dose as "maintenance" for time-limited clients (not failure),
  and say where to invest if/when time allows. *(2026-06-15)*

## Testing
- **Light testing only:** derive an estimated 1RM from the heaviest logged set each cycle
  and track it cycle-over-cycle. No separate test day. *(2026-06-15)*

## Communication & in-app text
- **In-app athlete text (message, outcomes, notes, completion) is ENGLISH.** Farsi briefs
  for WhatsApp/IG are separate, on request. *(2026-06-15)*
- **Coach-facing reports** (volume, progression sheet, e1RM) print in chat for Amir —
  never in the athlete app or the athlete JSON. *(2026-06-15)*

## Coaching cues
- **Exactly 3 cues per exercise — never more, never fewer:** one **external** cue (an
  action/focus *outside* the body — where to push, what to move toward), one **internal**
  cue (what to *feel* — the target muscle/sensation), and one **avoid** cue (the single
  mistake that most risks injury). Calibrate the wording to training age. In the JSON the
  external + internal go in `cues.good[]`, the avoid cue in `cues.bad[]`. *(2026-06-17)*

## Naming
- **Cycle names are cool & evocative** — punchy 1–2 word power-names (Foundation Forge,
  Volume Engine, Bedrock), never dry labels. Set in /program-roadmap. *(2026-06-15)*
- **Day names (`focusTag`) have sports-headline energy** — vivid, write them like a sports
  writer trying to make the athlete *want* to train ("Built From The Legs Up", "Press, Pull,
  Repeat", "Whole-Body Workhorse"), never spreadsheet labels ("Upper Body & Press" ✗). The
  catch: the name must still embed the keyword that lands the right banner image, and avoid
  cool words that hijack it ("engine"→conditioning, "power"→power). Map in SCHEMA.md. *(2026-06-15)*

## Process
- **Roadmap is created once and locked** — design/engage read it, never rewrite it. *(2026-06-15)*
- **Menstrual-cycle phasing is NOT used** in programming (coach's decision). *(2026-06-15)*
- **Athlete-first; naming & styling are downstream.** The aim is always *what's good for
  the athlete* — get the format, exercise selection and dose right first. Categorizing,
  section names, chips and styling are a mechanical layer applied *after* that, and must
  **never bend the programming logic or burn design energy**. Right training first; correct
  labels and styling fall out afterward. *(2026-06-17)*
- **Design pass = programming first; polish later.** During /program-design put ALL the
  reasoning into the coaching decisions + analysis (athlete read, SFR/transfer selection,
  volume, sequencing, progression). Exercise **names, chips, day names, and formatting are a
  polish pass AFTER the program exists** — nail the right movement + dose first; wording is
  tidied later (/program-assemble format-lints, names finalize in Notion when videos are
  added). Don't burn design budget perfecting names/chips mid-analysis; if a name/chip is
  rough, flag it and move on. *(2026-06-15)*
