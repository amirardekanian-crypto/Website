# What already exists — the coaching system, app by app

Mapped 2026-09-23 from the code. **Update this file when you find it wrong**; a stale map is how an
idea gets pitched for a feature that already shipped. Line numbers drift, so search by function name.

## The data, and what it is keyed on

- **An exercise has no identity.** In `program.html` an exercise is its `name` string; renames are
  guessed by `matchRenamed()` / `ceilAliasMapC()`. `exercise_library.json` (319 entries) maps name →
  video URL and nothing else. No Supabase exercise table. **No purpose, movement pattern, physical
  quality, or regression/progression field on a programme exercise.**
- **Programme record** (`public.programs`, via `get_program()`): `athlete{}`, `cycles[]` (name,
  tagline, `art`, weeks, dates, `focuses[]`, `message{paragraphs,outcomes}`, `teaser`),
  `workouts.days[]` → `blocks[]` (`title`, `rest`) → exercises (`rx`, `setup`, `intent`, `note`,
  `cues{good,bad}`, `test`, `videoUrl`, circuits with `items[]`), `programHistory[]`, `notes.cards[]`.
  **No week level:** the days repeat every week of a cycle.
- **What the athlete logs:** per set weight + reps (`n`, only when not the prescribed number; since
  2026-09-24) + RPE + done; per-exercise note;
  readiness (sleep, energy, soreness, stress, overall → composite); session RPE + duration; a day
  note. **No structured pain field** (pain is free text). Goes to `session_history` via
  `save_session`, and `athlete_progress` via `save_progress`. The midnight reset wipes RPE and ticks.
- **Coach-only:** `coaching_logs` (per-exercise rationale, volume tables, progression rules, the
  Exercise Ledger of kept/replaced/removed), `call_logs`, `cycle_reports` (saved, never shown).

## program.html (coached athletes)

Home (cycle card, this week, day cards, Ceiling/Weight/Habits cards) · Game Plan (cycle meter, current
cycle message + outcomes, future teasers) · session view (blocks, exercise cards with rx grid, tempo,
video, cues, set log, rest timer, Guided mode, readiness modal, finish + completion card) · The
Ceiling (e1RM per lift, retest window for `test` lifts, + Log a max) · Body weight · Coach tab (chat
with Day N tags, notes cards, app guide) · Library (Train sessions, Read articles) · Archive.

**Built since the map:** #5 The Card Remembers (last time on every card, the History sheet,
`get_my_history()`, `session_history.log`, reps logged). **Gaps still open:**
readiness changes nothing (the autoregulation in PRODUCT.md is not built); cycle outcomes are never
checked; the "why" of each exercise stays coach-side; Library and programme do not link each other.

## coach.html

Tabs: Today (counters, wall, Needs-you, quests, Proof pulse) · Intake (`hab_intake`) · Athletes
(roster, publish, backup, logins) · Proof · Links · Affiliates · Testing app · Course. Athlete file:
The work (ACWR, readiness vs baseline, adherence, Personal records, planned-vs-done per day by
exercise name, inline editor) · Proof · Chat · Calls · File (versions, coaching log).

**Gaps found:** Needs-you does not fire on ACWR spikes, readiness drops, RPE drift, pain words or due
retests; intake brief is pulled from Gmail though `hab_intake` has it; handoff-brief gates are not
tracked; testing-app results never meet coached athletes.

## The pipeline (`.claude/skills/program-*`)

Intake → roadmap (5 cycles × 5 weeks, locked) → design (SFR, carryover, injury rules, PROGRESS /
REPLACE / ADD against the ledger) → engage (messages, outcomes, notes, completion text) → assemble
(`rx`, publish by SQL) → edit. Principles in `.claude/COACHING-PRINCIPLES.md`: **RPE never load**
(a weight only in the Coach's Note), RPE ≥ 6, −1 RPE on low-readiness days, a defined minimum dose,
tempo said once, fixed block order, 10–20 sets per muscle per week.

## TPS course app (`tennis/app/app.js`, Farsi, content in `tps_content`)

Exercises: `purpose`, `tennis`, `cues`, `avoid`, `mistakes`, **`easier`/`harder` as free text, not
links**, `equipment`, `tags[]` (regions), `impact`, `u16`, `slot`. **"Used in" is computed at
runtime** in `viewExercise` by walking the programme. The only id-to-id link is a programme item's
`{ex, alt}`. Also: 16 weeks × 4 blocks, step mode, 22 lessons, 7 tests, 1RM calculator, Yo-Yo
player, results sheet (not saved), guide, tour. No "quality" field.

## AA Proof (`habits.html`)

Daily habits (train, steps, sleep, protein, water core; add-ons), XP, levels, ranks, seasons, Roll
Call, leaderboard, Locker rewards. WORKOUT is ticked from `session_history`. Sleep hours are logged
here **and** asked again in program.html's readiness modal; the two are never compared.
