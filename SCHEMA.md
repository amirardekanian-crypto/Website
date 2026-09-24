# S&C Program Platform — JSON Schema Guide

## AI Generation Guide (for producing a new client JSON)

**Role:** You are generating a client JSON file for a fitness coaching web app.
**Output:** A single valid JSON file matching the template below. No comments, no prose, no trailing commas — just strict JSON.

### Hard Rules (do not break)

- Required keys: `athlete.id`, `athlete.firstName`, `athlete.lastName`, `currentCycleIndex`, `cycles`, `workouts`, `workouts.days`.
- `athlete.id` must be lowercase `firstname_lastname` (appears in the URL and localStorage).
- ⚠️ **`athlete.key` is RETIRED — do not generate one.** Athletes are authorised by a signed-in session now, not a secret in the file. See "How an athlete is authorised" below.
- `athlete.tier` is `"free"` for a free Proof user and absent (or `"coached"`) for a coaching client. It is the **only** switch — `isFree()` in `habits.html` reads exactly this field.
- `currentCycleIndex` is 0-based. `0` means the athlete is on the first cycle in `cycles`.
- Every `days[]` entry must have a **unique numeric** `id` (1, 2, 3…).
- Every day must contain at least one `block`; every block must contain at least one `exercise`.
- `type` on every exercise must be exactly one of: `"simple"`, `"standard"`, `"circuit"`.
- **A superset/complex (2+ exercises done back-to-back sharing one rest) is ALWAYS
  `type: "circuit"`, with every paired exercise as its own entry in `items[]`.** It is
  **never** two separate `"standard"` exercises each carrying a `"superset"` chip — that
  anti-pattern breaks the whole point of a superset (each exercise gets its own independent
  rest timer instead of alternating into one shared rest) and leaves no visual grouping to
  show which exercises are paired. It shipped once (see COACHING-PRINCIPLES.md → "Session
  structure & time," 2026-07-18) — see "Common mistake" under `type: "circuit"` below.
- Chip `style`, if used, must be exactly `"yellow"` or `"dark"` (or omitted).
- The `type` field decides what tools an exercise gets — no separate flags needed:
  - `"simple"` → just the row. No rest, no weight, no RPE, no note.
  - `"standard"` → always has rest timer + weight log + RPE selector + personal note.
  - `"circuit"` → rest timer at the end + personal note, and **the block decides whether it logs**: a circuit in a **prep/activation block logs nothing**; a circuit in any **working block** gets an inline **weight field per item** plus **one RPE per round** (supersets, complexes, conditioning). Override either way with `logWeight` / `logRPE`. See "Circuit logging" below.
- `"restSec"` (number, seconds) controls the rest timer duration. Defaults if omitted: **120s for `standard`**, **60s for `circuit`**. Override per exercise as needed.
- A `"circuit"` exercise must include `rounds` (string) and `items[]` (array).
- The legacy `"hasRest"` field is no longer used and can be removed. Old files that still contain it will keep working — the field is simply ignored.
- Output strict, valid JSON. No comments. No trailing commas.

### Template to fill

Replace each placeholder value. Keep an optional section only if it applies; otherwise remove that section entirely.

```json
{
  "athlete": {
    "id": "firstname_lastname",
    "key": "0123456789abcdef0123456789abcdef",
    "firstName": "First",
    "lastName": "Last",
    "avatar": "https://example.com/photo.jpg"
  },
  "sport": {
    "badge": "🏋️ Goal or purpose pill"
  },
  "currentCycleIndex": 0,
  "cycles": [
    {
      "num": 1,
      "name": "Cycle Name",
      "tagline": "Short italic line (optional)",
      "weeks": "Weeks 1–5",
      "startDate": "2024-04-28",
      "endDate": "2024-06-01",
      "focuses": [
        "Focus statement one.",
        "Focus statement two."
      ],
      "message": {
        "paragraphs": [
          "Paragraph explaining why this cycle matters.",
          "Another paragraph."
        ],
        "outcomes": [
          "Expected outcome one",
          "Expected outcome two"
        ]
      }
    },
    {
      "num": 2,
      "name": "Next Cycle Name",
      "weeks": "Weeks 6–10",
      "startDate": "2024-06-02",
      "endDate": "2024-07-06",
      "focuses": [
        "Focus statement for the next cycle."
      ],
      "teaser": {
        "paragraphs": [
          "Paragraph teasing the next cycle.",
          "Punchy one-line hook — auto-italicised as the final paragraph."
        ]
      }
    }
  ],
  "workouts": {
    "label": "Program 01 · Month One",
    "days": [
      {
        "id": 1,
        "focusTag": "Lower Body",
        "completionTitle": "Great Work",
        "completionMessage": "Day complete — recover well.",
        "blocks": [
          {
            "title": "Warm-Up",
            "icon": "🔥",
            "exercises": [
              {
                "type": "simple",
                "name": "Bike",
                "rx": { "time": "5 min" }
              },
              {
                "type": "circuit",
                "name": "Dynamic Mobility",
                "rounds": "×3 Rounds",
                "restSec": 60,
                "warmup": true,
                "items": [
                  {
                    "name": "90/90 Hip Rotations",
                    "detail": "×12",
                    "cues": {
                      "good": ["Keep hips grounded"],
                      "bad": ["Don't arch the back"]
                    }
                  }
                ]
              },
              {
                "type": "standard",
                "name": "Back Squat",
                "videoUrl": "https://www.youtube.com/watch?v=example",
                "rx": { "sets": 4, "reps": 6, "rpe": 7, "tempo": "3-1-1-0", "rest": 180 },
                "cues": {
                  "good": ["Push the floor away"],
                  "bad": ["Don't let the knees cave in"]
                }
              }
            ]
          }
        ]
      }
    ]
  },
  "notes": {
    "greeting": "For You, First",
    "cards": [
      {
        "icon": "⏱",
        "title": "Understanding Tempo",
        "body": "The numbers next to an exercise (e.g. 3-1-1) describe tempo in seconds: eccentric — pause — concentric."
      }
    ]
  }
}
```

### Placeholder guidance

- `athlete.id` → lowercase, underscore-separated (e.g. `john_doe`).
- `athlete.boardName` → the name they chose, used only to pre-fill the join box in Proof's Crew tab. It never joins anyone to the leaderboard.
- `athlete.tier` → `"free"` for a free Proof user; omit for a coaching client.
- `sport.badge` → short line shown above the name, e.g. `"🎾 Tennis Performance"`. Omit the whole `sport` object if not relevant.
- `focuses[]` → one-line training focus statements. Any number allowed.
- `message.paragraphs[]` → 1–3 short paragraphs on why the current cycle matters.
- `message.outcomes[]` → 3–6 concrete, measurable expected outcomes.
- `teaser` → hype section for the NEXT cycle only. Omit the whole `teaser` object if there is no next cycle planned.
- `rx` → the prescription as data: `sets` · one of `reps`/`time`/`distance`/`work` · `side` · `rpe` · `tempo` · `rest`. **Write what you prescribed and omit the rest** — an absent field draws no cell. Full table under "`rx` — the prescription". Beside it: `setup` (equipment/position), `intent` (one intention, the green pill), `note`, `cues`. Never write `chips[]`.
- `videoUrl` → full YouTube / Vimeo URL. Omit the field entirely if no video exists.
- `notes` → optional. Remove the whole object if there are no coaching notes to add.

---

## Architecture Overview

```
amirardekani.com/
├── program.html          ← Single template (never edit per athlete)
├── data/
│   ├── john_doe.json     ← Athlete 1
│   ├── sarah_chen.json   ← Athlete 2
│   └── ...               ← Unlimited athletes
```

**URL format:** `program.html?client=john_doe`

The template reads the `client` parameter, fetches `data/john_doe.json`, and renders everything dynamically. One HTML file serves every athlete.

---

## High-Level Shape

```
{
  athlete             → identity
  sport               → goal/purpose pill above the name
  currentCycleIndex   → which cycle the athlete is on right now (0-based)
  cycles[]            → all training cycles (any number)
    └─ message{}        only meaningful on the current cycle
    └─ teaser{}         only meaningful on the next cycle
  workouts            → the actual training days for the current cycle
    └─ days[]
        └─ blocks[]     FLEXIBLE: any order, any type
            └─ exercises[]  simple | circuit | standard
  programHistory[]    → archived completed programs (optional)
  notes               → expandable coaching notes (optional)
}
```

The current cycle, next cycle, and remaining phases are all **derived from `currentCycleIndex`** — there is no need to manually mark "active" / "next" / "locked" anywhere.

---

## How `currentCycleIndex` Drives the Home Screen

`currentCycleIndex` is a 0-based pointer into `cycles[]`.

Every cycle on the home screen is drawn with the **same card design** (one shared
template). What differs is whether a card appears and whether it carries a pill /
is tappable:

| Position | What the home screen shows |
|---|---|
| `i === currentCycleIndex - 1` | The **past program card** — same card design, with a "Done" pill, tappable to open the archive. **Only shown if `programHistory` is also present** (see below). |
| `i === currentCycleIndex` | The current cycle card (name + weeks + tagline + focuses + `message`). |
| `i > currentCycleIndex` | The "What's next" cards (one per future cycle), each with its `teaser` if present. |

Only the single cycle immediately before the current one is surfaced as a past
card; earlier cycles are not shown on the home screen (they remain reachable via
the Archive tab).

To advance the athlete to the next cycle, just **bump `currentCycleIndex` by 1**
— and move the finished cycle's `workouts` into `programHistory` so the new past
card has something to open (see "Advancing to the Next Cycle").

---

## Field Reference

### Top Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `athlete.id` | string | ✅ | Unique ID, used for localStorage. Format: `firstname_lastname` |
| `athlete.key` | string | ⚠️ **retired** | Dead field. Authorises nothing (`athlete_keys` is empty and every keyed path fails closed). Don't add it; drop it from old files. |
| `athlete.tier` | string | optional | `"free"` = free Proof user (locks WORKOUT, swaps programme links for coaching CTAs). Absent or anything else = coached. |
| `athlete.boardName` | string | optional | Name used to pre-fill Proof's Crew join box. Joins nobody to the board. |
| `athlete.firstName` | string | ✅ | First name (white in hero) |
| `athlete.lastName` | string | ✅ | Last name (yellow accent in hero) |
| `athlete.avatar` | string | optional | URL or path to athlete's photo. Falls back to initials when missing. |
| `sport.badge` | string | optional | Goal/purpose text under the name on the athlete card, e.g. `"🏋️ Tennis Performance"` |
| `currentCycleIndex` | number | ✅ | 0-based index into `cycles[]` |
| `cycles` | array | ✅ | All training cycles (can be 1, 5, 12 — any number) |
| `workouts` | object | ✅ | The training days for the current cycle |
| `programHistory` | array | optional | Archived past programs |
| `notes` | object | optional | Coaching notes (Notes tab) |

> **Note:** The coach line was removed from the home screen — Amir is always the coach.

#### How an athlete is authorised

⚠️ **The secret-key mechanism is retired (2026-09-07).** `public.athlete_keys` is empty,
every `?client=<id>&key=<key>` link is refused, and a key written today authorises nothing.
`athlete.key` in an old file is dead weight — drop it.

**Athletes sign in with a username and password.** The account is created from
coach.html → Athletes → the athlete → **Create login**, which calls the `athlete-login`
Edge Function (it needs the service-role key, so it cannot be done in SQL) and writes
`public.athlete_identities`. The username is the `athlete_id`; the account sits on an
internal address `athlete.<id>@amirardekani.com` that never receives mail.

Every server-side check now asks the same question — *is this the signed-in athlete?*

| Function | Allows |
|---|---|
| `get_program(id, key)` | `id = 'demo'` (the public showcase), `is_coach()`, or `id = current_athlete_id()`. Falls through to the key check, which always fails. |
| `save_progress(...)` | `is_coach()`, or `athlete_id = current_athlete_id()`. Same dead key fallback. |
| `save_session(...)`, `send_athlete_message(...)`, `mark_athlete_read(...)` | Same: `is_coach()`, or `athlete_id = current_athlete_id()`, then the dead key fallback. The client can pass `p_key: null`. (Checked against the live definitions 2026-09-13 — the migrations `athlete_functions_accept_session` / `_accept_coach` are on the server but not in `supabase/*.sql`.) |
| `current_athlete_id()` | `select athlete_id from athlete_identities where user_id = auth.uid()` |

So an athlete with **no login has no way in at all** — there is no link to fall back on,
and `data/<id>.json` is 404 on the live site. Creating the login is part of onboarding,
not an optional extra.

---

### `cycles[n]`

Each cycle describes one training phase.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `num` | number | ✅ | Cycle number (shown as the big faded number on the phase row) |
| `name` | string | ✅ | Phase name, e.g. `"Foundation Forge"` |
| `tagline` | string | optional | Short italic line under the name |
| `art` | string | recommended | Which picture the cycle card shows. One of: `bedrock` (foundation, first numbers) · `iron` (heavy strength) · `build` (muscle, volume) · `armour` (durability, tendons, rehab) · `voltage` (power, rotation) · `spring` (elastic, change of direction) · `brakes` (deceleration) · `engine` (conditioning, fat loss, running, repeat effort) · `reset` (deload, maintenance) · `peak` (taper, finish, physique). **Omitting it is safe** — the app guesses from the cycle name — but write it: the guess cannot know that one athlete's "Uncoil" is a mobility block and another's is a speed block. Ten pictures cover every cycle; see `IMAGES.md` section 0. |
| `weeks` | string | optional | e.g. `"Weeks 1–5"` |
| `startDate` | string | recommended | Cycle start date, ISO format `"YYYY-MM-DD"`. Shown on the athlete card for the current cycle. Omitting it hides the date range from the athlete card. |
| `endDate` | string | recommended | Cycle end date, ISO format `"YYYY-MM-DD"`. Drives the subscription/renewal banner (appears when ≤14 days remain). **Omitting this disables the renewal reminder entirely** — the client will see no expiry warning. |
| `focuses` | string[] | optional | Unlimited list of focus statements |
| `message` | object | optional | Only used when this is the current cycle (see below) |
| `teaser` | object | optional | Only used when this is the next cycle (see below) |

#### `message` (only rendered on the current cycle)

| Field | Type | Description |
|-------|------|-------------|
| `paragraphs` | string[] | Body text under "Why This Cycle Matters" |
| `outcomes` | string[] | Checklist under "Expected outcomes after this cycle:" |

#### `teaser` (only rendered on the next cycle)

| Field | Type | Description |
|-------|------|-------------|
| `paragraphs` | string[] | Body text on the "Up next!" card. The last paragraph is auto-italicised when there are 2+ — put the punchy one-line hook there. |
| `subtitle` | string | ⚠️ **Not currently rendered** by `program.html` (the future-card builder only passes `teaser.paragraphs`). For a one-liner under the cycle name use the cycle's `tagline`; for the closing hook use the final `paragraphs` entry. |

#### Example cycle

```json
{
  "num": 1,
  "name": "Foundation Forge",
  "tagline": "Build the Platform",
  "weeks": "Weeks 1–5",
  "focuses": [
    "Build foundational movement quality across all major patterns.",
    "Establish aerobic base and running consistency."
  ],
  "message": {
    "paragraphs": [
      "This is where everything starts.",
      "Your nervous system is learning to recruit muscle efficiently."
    ],
    "outcomes": [
      "Noticeably improved strength in squat and hinge",
      "Ability to run 30+ minutes without stopping"
    ]
  },
  "teaser": {
    "paragraphs": [
      "Cycle 2 is where the body begins to genuinely change.",
      "Earn it in these five weeks."
    ]
  }
}
```

---

### `workouts`

The actual training content for the current cycle.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `label` | string | optional | Header text on the program screen, e.g. `"Program 01 · Month One"` |
| `days` | array | ✅ | Training days (any count: 2, 3, 4, 5, 6...) |

### `workouts.days[n]`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | number | ✅ | Day number (1, 2, 3...) — used for tab labels |
| `focusTag` | string | optional | Day name + yellow badge. Also the fallback for picking the banner image — see below |
| `art` | string | recommended | Which of the eight day pictures this day shows: `lower` · `upper` · `power` · `conditioning` · `core` · `recovery` · `fullbody` · `default`. Write it and the guessing stops. Omitting it is safe (the app reads the title), but a day called *"Hinge Slow, Pull Hard"* is a hinge day and no keyword list knows that for certain. |
| `completionTitle` | string | optional | Heading shown when day is finished |
| `completionMessage` | string | optional | Body text on completion |
| `blocks` | array | ✅ | List of training sections — any order, any count |

#### How a day finds its picture

Eight pictures cover every day of every athlete (`assets/art/days/`, see `IMAGES.md` §0).
The day's own **`art`** word wins. When it is missing, the app scans the day's `title` +
`focusTag` + `subtitle` and takes the keyword that appears **EARLIEST IN THE TEXT** —
not the highest-priority rule. The order below only breaks a tie:

| Tie-break | Image category | Trigger keywords (case-insensitive) |
|---|---|---|
| 1 | `recovery` | recover, mobility, regen, deload, **rest** (whole word), stretch, flexib |
| 2 | `power` | power, plyo, explos, speed, jump, sprint, rotational, med ball, throw |
| 3 | `conditioning` | condition, cardio, engine, aerobic, hiit, metcon, interval, endur |
| 4 | `core` | core, **abs** (whole word), trunk, anti-rot, plank, brace |
| 5 | `upper` | upper, push, pull, press, shoulder, chest, back, **arm** / **row** (word start) |
| 6 | `lower` | lower, leg, squat, hinge, glute, deadlift, hamstring, quad, calf, lunge, knee |
| 7 | `fullbody` | full body, total body, whole body |
| — | `default` | (no keyword matched → green gradient) |

**Naming consequences (get these right):**
- **Whatever the name leads with is what the day is.** `"Hinge Slow, Pull Hard"` → **lower**
  (hinge comes first), `"Throw Hard, Hinge Harder"` → **power**. Under the old
  priority-order rule both of those went to the wrong picture.
- A name with **no** keyword falls to `default`. `"Nothing To Prove Today"` matches nothing,
  which is correct: there is a picture for exactly that.
- For a true full-body day use the literal phrase **`Full-Body`** / `Total Body`.
- ⚠️ The word boundaries on `rest`, `abs`, `arm` and `row` are load-bearing: without them
  *Restored*, *Absorb*, *Warm-up* and *Throw* match, and with earliest-wins a stray hit
  inside a longer word outranks the real keyword. `"The Hinge Restored"` was filing as
  a recovery day because of exactly this.

(Source of truth: `DAY_IMAGE_RULES` + `dayImageCategory()` in `program.html`. Keep this table in sync if those change.)

### `blocks[n]` — Training Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Section label — see standard names below |
| `icon` | string | optional | Emoji icon |
| `exercises` | array | ✅ | Exercises within this block |

**Standard section names (use these, in this order):**

| Order | Section | Holds | Icon |
|---|---|---|---|
| 1 | **Prime** *or* **Activation & Prep** | the whole warm-up (interchangeable, general) | 🔥 |
| 2 | *(free-named)* — **Power** / **Plyometrics** / **Speed** / **Med Ball** … | explosive / CNS work, while fresh — name by content, icon optional | ⚡ |
| 3 | **Primary** | the main lifts (the progression drivers) | 🎯 |
| 4 | **Accessory** | assistance / hypertrophy support | 💪 |
| 5 | **Core** | any core work — **including bracing / anti-movement & carries** | 🧱 |
| 6 | *(free-named)* — **Conditioning** / **Finisher** … | energy-systems work — name by content, **always last** | 🫀 |

Only the sections a given day needs appear. Power and conditioning sections are free-named by their content (no fixed name/icon required); the others use the fixed names so the app's section headers read consistently across athletes.

---

### Exercise Types

#### `type: "simple"` — Plain row, no extras
Best for: warm-ups, cool-downs, single-item entries that don't need rest, weight, RPE, or notes.

```json
{
  "type": "simple",
  "name": "Bike",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "rx": { "time": "5 min" },
  "cues": {
    "good": ["Steady pace"],
    "bad": ["Don't go all-out"]
  }
}
```

#### `type: "circuit"` — Multiple sub-exercises as one checklist item
Best for: mobility circuits, activation circuits, conditioning circuits, combination drills.

```json
{
  "type": "circuit",
  "name": "Conditioning Circuit",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "rounds": "×3 Rounds",
  "restSec": 90,
  "items": [
    {
      "name": "Kettlebell Swing",
      "detail": "×12 · RPE 7",
      "cues": { "good": ["..."], "bad": ["..."] }
    }
  ]
}
```

Every circuit gets, automatically:
- A **Rest** button at the bottom (rests once, after the whole round of sub-items is done — default **60s**, override with `restSec`).
- An **RPE** selector for the whole circuit (one per round).
- A free-form **Note** row where the client can log weights, equipment, and how it felt (e.g. *"KB 16, slam 6, box 50, third round felt heavy"*).

##### Circuit logging (`warmup`, and optional `logWeight` / `logRPE`)

**THE BLOCK DECIDES THE DEFAULT** (changed 2026-09-15).

- A circuit inside a **prep / activation block** logs **nothing** — no weight, no RPE. The pre-session readiness check already captures how the athlete feels.
- A circuit inside any **working block** (Primary, Accessory, Core, Power, Conditioning…) logs a small inline **weight field on each exercise** (one per item, folded into the round row) **plus one RPE per round**. This covers supersets, complexes *and* conditioning circuits.

A block counts as prep when its **title** contains `warm`, `mobility`, `activation`, `cool`, `prime` or `prep` — so `Prime`, `Activation & Prep`, `Warm-Up`, `Dynamic Mobility` and `Shoulder Prep` are all prep. Note `Primary` does **not** contain `prime`. This is `isPrepBlockTitle()` in `program.html`; it reads the **title only, with no positional fallback** — an unrecognised title is not prep, which fails safe toward logging.

| Flag | Default | Effect |
|---|---|---|
| `warmup` | `false` | `true` → logs **nothing**, from any block. Kept for back-compat; in a prep block it is now redundant. |
| `logWeight` | block-dependent | Override in **both** directions — `true` shows the weight field even in a prep block (a genuinely loaded primer), `false` hides it in a working block. |
| `logRPE` | block-dependent | Same, for the per-round RPE rows. |

- **Superset / conditioning / complex in a working block** → no flags needed. Syncs to the coach as two lines — `Incline Dumbbell Press 30 · Chest-Supported Dumbbell Row 25` then `RPE: R1 8 · R2 8 · R3 9`.
- **Warm-up / prep** → no flags needed either; the block already silences it.
- **A loaded primer in a prep block** (e.g. `Loaded Leg Primer` = Leg Press + Cable Pull Through at RPE 6) → `"logWeight": true`, so the athlete's working weight is remembered without asking for an RPE the prescription already fixes.

> ⚠️ **Why the default flipped.** It used to be "everything logs unless the JSON says `warmup: true`", so a prep circuit that simply forgot the flag asked athletes for kilograms and an RPE on a mobility drill — live on 13 circuits across 4 athletes, the demo file included. Opting out had to be remembered every single time; opting in only has to be remembered for the rare loaded primer, which is the case someone notices.
>
> ⚠️ **Do not implement prep-ness with `blockCategory()`.** That function falls back to cycling classes by block *index* for titles it doesn't know, so `Core` at index 3 returns `block-warmup` by arithmetic coincidence and every Core circuit silently stops logging. `scripts/check_circuit_logging.py` guards this and runs from `.githooks/pre-commit`.

##### Common mistake — a superset is NOT a chip

**Do not** author a superset as two `"standard"` exercises each carrying a `{"label":
"superset", "style": "dark"}` chip. That looks plausible (it *does* mark them as related)
but it's wrong: each `"standard"` exercise still gets its **own independent rest timer**, so
instead of alternating A→B→shared rest, the athlete does all of A's sets (resting between
each), THEN starts B — the opposite of a superset, and there's no card grouping to show the
pairing at all. The correct shape is ONE `"circuit"` entry per pair:

```json
{
  "type": "circuit",
  "name": "Push-Pull Superset",
  "rounds": "×4 Rounds",
  "restSec": 90,
  "items": [
    { "name": "Dumbbell Bench Press", "detail": "×10 · RPE 8", "cues": { "good": ["..."], "bad": ["..."] } },
    { "name": "Chest-Supported Dumbbell Row", "detail": "×12 · RPE 8", "cues": { "good": ["..."], "bad": ["..."] } }
  ]
}
```

Name the circuit descriptively so the name itself communicates the pairing (`"Push-Pull
Superset"`, `"Arm Superset"`, `"Delt Superset"` — see `amir_ardekani.json` /
`Mhrnz_khdm2.json` for live examples) — never a generic `"Superset A/B"`. Note there is no
per-item `tempo` field; circuit items carry reps + RPE only (`"×N · RPE N"`).

#### `type: "standard"` — Loaded exercise with rest, weight, RPE
Best for: all loaded exercises (strength, plyos, accessories) — and any single-exercise row that should be logged.

```json
{
  "type": "standard",
  "name": "Back Squat",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "rx": { "sets": 4, "reps": 6, "rpe": 7, "tempo": "3-1-1-0", "rest": 180 },
  "cues": {
    "good": ["Push the floor away"],
    "bad": ["Don't let knees cave"]
  }
}
```

Every `standard` exercise gets, automatically: rest timer + weight log + RPE selector + personal note.

⚠ **`rest` is no longer defaulted.** It used to fall back to 120s whenever it was
missing, which meant every card in the demo claimed "REST 2m" while every rest in it was
actually unset — a calf raise and a back squat shown as identical, and a Pallof press told
to sit for two minutes. Omit `rest` and the card shows no rest cell; the timer button is
still there, labelled *Rest timer*, opening at a neutral 2 minutes. Common values when you
do prescribe it: `60`, `90`, `120`, `180`, `240`.

(`restSec` at the top level of an exercise is the old spelling and is still read. New
programmes write `rx.rest`; saving from coach.html moves it across.)

### `test` — Mark a lift for a periodic rep-max retest (optional, `standard` only)

Flags an exercise as one of the athlete's **key lifts**: the Personal Records screen then
tracks how long it has been since a number was put on the record, and nudges for a retest in
the closing week of the cycle.

```json
{
  "type": "standard",
  "name": "Barbell Back Squat",
  "test": "5RM",
  "rx": { ... }
}
```

Accepted values: `"5RM"` (or any `"<n>RM"` up to 10 reps), or `true` for the 5RM default.
Anything else is ignored entirely and the lift is simply not flagged — this field decides
what nags an athlete, so an unrecognised value must stay silent rather than guess a protocol
nobody asked for.

**Flag only the two or three lifts a cycle is actually about.** The nudge earns attention by
being rare: an athlete asked to retest six things at the end of a block retests none of them.
A flagged lift appears in the retest strip only when all three of these hold — the cycle is
in its closing week (or past its `endDate`), the lift has gone **28 days or more** without an
entry, and the exercise is in the current cycle. A cycle with no `endDate` cannot place the
window, so the 28-day floor decides on its own.

The flag changes nothing about how the lift is programmed or scored — it is purely which
lifts the Records screen chases. Athletes can log a max for **any** `standard` exercise with
a rep count, flagged or not, from Personal Records → **+ Log a max**.

### `videoUrl` — Optional Exercise Video

Any exercise (any type) can include a `videoUrl`. When present, a play button appears next to the name. When omitted, no button renders.

### `note` — Exercise coach's note (optional, any exercise type)

Exercise-scoped guidance the athlete must see, attached to that exercise:

```json
{
  "type": "standard",
  "name": "Machine Hack Squat",
  "note": "Work up from 35 kg in week one and let the RPE decide — wherever 12 clean reps lands at RPE 7–8 is your working weight.",
  "rx": { ... }
}
```

Renders as a clay **"Coach's Note"** pill on the collapsed row plus a highlighted callout at the top of the expanded card (works on `standard`, `simple`, and `circuit`). **Plain text — no HTML.** It's a short 1–3 sentence callout, not a notes card; `program.html` renders it escaped, not as innerHTML, so any markup would show as literal characters.

**Placement rule (per COACHING-PRINCIPLES → Communication):** anything about ONE exercise — an injury caveat ("start shallow, pain-free only"), a starting-weight suggestion drawn from the athlete's own past logs, how to load it — belongs here, so the athlete sees it exactly where it applies. Program-wide guidance belongs in the `notes` cards instead. This is also the only athlete-facing place a weight number may appear (as a suggestion based on their logs — chips never carry weights).

**Authorship split (pipeline convention):** /program-design only flags *which* exercise needs one and *why*, in one short coaching-domain line (a `note_flag`, not athlete-facing prose) — it doesn't draft the sentence. /program-engage writes the actual copy from that flag plus the full athlete picture. /program-assemble places the finished text on the exercise. This keeps wording/formatting decisions out of the programming pass, same as chips and `focusTag` — see COACHING-PRINCIPLES.md → "Athlete-first; naming & styling are downstream."

### `rx` — the prescription (2026-09-20)

**A prescription is DATA, not display strings.** Before this, sets/reps/RPE/tempo/rest
were free-text labels in `chips[]` that `program.html` pattern-matched back into numbers
at render time. That is why the notation drifted (277 distinct chip labels across 34
programmes for six real fields), why every exercise was forced into the same five-cell
grid, and why a 5-minute row on the bike showed its minutes in a cell labelled **REPS**.

```json
{ "type": "standard", "name": "Barbell Back Squat",
  "rx": { "sets": 4, "reps": 6, "rpe": 7, "tempo": "3-1-1-0", "rest": 120 } }
```

**The only rule: write what you prescribed, omit what you did not.** An absent field is
not a blank to fill — it is the statement *this was not prescribed*, and the app draws no
cell for it. There is no placeholder, no default, and nothing to remember about formatting.

| Key | Type | Notes |
|---|---|---|
| `sets` | number | Omit on a single-effort or prep item. Drives how many rows the set log renders. |
| `reps` | number | **One number, never a range** (Amir, 2026-09-24: *"I don't prescribe rep ranges"*). The set log pre-fills this number and a tick means "done as written", so a range would leave the app guessing what was done. A design that thinks in a zone ships the one number meant. `auditRx()` flags a range as `rep-range`. |
| `time` | `"30s"` · `"5 min"` · `"1:30"` | Holds, carries, bike/row/run durations. |
| `distance` | `"20m"` · `"400m"` | Sprints, carries, shuttles. |
| `work` | `"40s on / 20s off"` | Intervals, where the dose is a pattern rather than a count. |
| `side` | `true` | The dose is **per side**. The cell's label becomes `REPS / SIDE`. |
| `rpe` | number or `"6-7"` | **Omit on warm-up and prep** — an RPE on a mobility drill is noise. Floor is 6 (the selector runs 6–10). |
| `tempo` | `"3-1-1-0"` or `"iso"` | Eccentric–Pause–Concentric–Reset. Omit on ballistic work and carries. **The athlete never sees this notation** — see below. |
| `rest` | seconds | **Omit and nothing is invented.** The timer button still works; the card just stops claiming a number you did not pick. |
| `rounds` | number | Circuits only. |
| `label` | one word | Rare override for the dose cell, e.g. `"Hold"` instead of `TIME`. |

**Exactly one of `reps` / `time` / `distance` / `work`.** Setting a second is a lint error
(`two-doses`), and only the first in that order would render.

#### The other four fields — four meanings, four looks

The green pill used to stand for 121 different kinds of thing: a tempo said in words, a
piece of equipment, an intent cue, and occasionally a real dose. Each now has its own home.

| Field | What it is | How it draws |
|---|---|---|
| `rx` | the numbers | the stats grid |
| `setup` | equipment / position / conditions — `"neutral grip"`, `"45° bench"`, `"In 4 · out 8"` | quiet grey line under the name |
| `intent` | **ONE** coaching intention — `"max intent"`, `"max speed"`, `"stick the landing"` | the green pill (the only pill) |
| `note` | the coach's note to this athlete. **Anything about THIS athlete that used to be a custom cue goes here** (2026-09-24) | clay "Coach's Note" callout |
| `cues` | **Do not write (2026-09-24).** Every card, circuit items included, shows its approved Spine entry's cues. Legacy cards still carry `cues`, which the app shows instead of the entry's until the next cycle drops them | the cues list |
| `exId` | the exercise's id in the Spine (`public.exercises`), e.g. `"trap-bar-deadlift"` | nothing directly: it ties the card to its entry |
| `why` | **Because:** why THIS athlete has this exercise — `{ "src", "part"?, "text" }` | a clay dot on the ⓘ; the reason opens the About sheet, and the cycle's Why page lists them all |

#### `why` — Because (2026-09-24)

```json
"why": { "src": "body", "part": "knee", "text": "Stepping back is kinder to your knee than a forward lunge." }
```

- **`src`** is where the decision came from: `goal` (intake, roadmap) · `body` (injury history,
  needs `part`: knee, back, shoulder…) · `test` (an assessment, a film, a Personal Record) ·
  `cycle` (kept, harder or replaced, with what moved) · `you` (their own feedback: a dislike, the
  gym's kit, a time limit) · `court` (their own game: a lefty, a serve-volleyer, padel at the net).
  The tags read *Your goal · Your knee · Your test · Last cycle · You said · Your game*.
- **`text`**: one sentence of up to 140 characters in Amir's voice. Name the body part, never the
  diagnosis. Say what happens next, never the failure. It is **personal or absent**: a reason
  that would be true for anyone is the Spine's `purpose`, not a `why`.
- **5–10 per cycle**, written fresh each cycle by `/program-design` (`why_flag`) →
  `/program-engage` (PART 3b) → `/program-assemble`. Never carried over from the last cycle.
  `Chips.auditWhy()` / `auditWhyProgram()` in `assets/js/chips.js` check all of this.
- Absent means no personal reason, and nothing shows. The ⓘ appears for a `why` even before
  the exercise's Spine entry is approved. The **Why your plan looks like this** button under
  the current cycle card appears when the programme has three or more.
- The coach-only Exercise Ledger in `coaching_logs` stays coach-only; `why` is written fresh
  for the athlete and is never a copy of a ledger row.

#### `exId` and the Spine (2026-09-24)

The Spine is one record per exercise Amir programmes (`supabase/stage31_spine.sql`): purpose,
pattern, the cues, the ladder (`easier`/`harder`/`alts` as ids), what it loads, the video. A
card resolves to its entry by **`exId` first, then its name** (the entry's `name` and `aliases`,
through the same four matching tiers Personal Records uses). Names in stored programmes are
**never rewritten**; `exId` is added beside the name by `/program-assemble` from 2026-09-24 on.

- **Cues are written once, on the entry, for everyone** (Amir, 2026-09-24). A programme writes no
  `cues`; each card and each circuit item shows its entry's. A card that still carries `cues`
  (every programme written before that date) shows its own instead; they drop at the next cycle,
  and anything in them that was about that athlete moves to the exercise's `note`. So the entry
  must be **approved** before a programme that uses it goes live, or the card shows no cues.
- The card gains one small **ⓘ** after the name when the entry is **approved**. It opens the
  About sheet: purpose, on court, the ladder (Rungs), where it sits in the programme, History.
- Drafts are invisible to athletes: `get_exercises()` serves approved entries only, and never
  the coach half (`exercise_coach`: SFR rank, restriction flags).

#### The TEMPO cell, and the digit that carries the instruction

The tempo keeps the notation coaches write — one cell, `TEMPO 3-1-1-0` — but the digits
that are actually the point are drawn in **clay**, bold, while the rest stay dark:

```
SETS 4  |  REPS 6  |  RPE 7/10  |  TEMPO 3-1-1-0
                                         ^ ^
                                         clay
```

`tempoDisplay()` decides which: **the slowest phase when it is 2s or more, plus any
non-zero pause** (a pause is never accidental — nobody writes one by default). So
`3-0-1-0` colours the 3, `2-1-1-0` colours the 2 and the 1, `2-0-2-0` colours both 2s, and
`1-0-1-0` — a tempo asking for nothing in particular — colours nothing. `"iso"` renders as
`Hold`. A tempo that will not parse prints escaped and uncoloured.

Four shapes were tried before this one, so **do not re-litigate it**: a plain cell (the
notation went undecoded, which is why 153 cards carried a hand-written `3s eccentric` pill
beside it), a grey line under the grid spelling it out (read as a footnote — Amir: *"it
doesnt capture the eye and it doesnt look professional"*), phase cells on a second row
(*"i dont like the new tempo"*), and now the notation back with its point coloured.

**The rule that survived all four: say it ONCE. Never restate the tempo in `intent`,
`setup` or a CUE.**
`"3s eccentric"` as a pill was the old duplicate on 153 cards; "three seconds down, one
second pause, drive up" as a cue is the same instruction again and costs one of only three
cues (39 of 506 live exercises with a tempo still do this). Spend the cue on what the
numbers cannot say.

### `block.rest` — one rest for a whole section

A block can prescribe rest once for everything in it:

```json
{ "title": "Primary", "rest": 120, "exercises": [ ... ] }
```

It renders on the section header (`PRIMARY ——— Rest 2m`) and feeds every rest timer in the
block. An exercise's own `rx.rest` **overrides** it and draws its own REST cell; the block
rest deliberately draws **no** per-card cell, because eight cards each repeating "REST 2m"
is the same fact eight times. Use it whenever a section shares one rest, and put `rx.rest`
only on the exercises that genuinely differ.

### Circuits carry `rx` too

```json
{ "type": "circuit", "name": "Line Drill", "rx": { "rounds": 3, "rest": 60 },
  "items": [ { "name": "Lateral Line Hops", "rx": { "time": "15s" } },
             { "name": "Split Squat", "detail": "15 sec, switch legs each round" } ] }
```

`rx.rounds` is a **number** — it used to be the display string `"×2 Rounds"`, which is why the
cell read *Rounds: ×2 Rounds*. An item takes its own `rx` when the dose is a plain one, and
keeps free-text `detail` when the coach's wording carries more than a number (*"15 sec,
switch legs each round"*). Both render; `detail` is never rewritten into a tidier shape it
does not mean.

#### What the card does with it

Only prescribed facts get a cell, so the grid is 2–5 cells wide, never padded with dashes.
A **dose-only item** — no sets, no RPE, no tempo, no rest — skips the grid entirely and
renders as a name and a dose on one line. That is what a warm-up should look like.

```json
{ "type": "simple", "name": "Rowing", "rx": { "time": "5 min" } }
{ "type": "simple", "name": "Bird Dog", "rx": { "reps": 6, "side": true } }
{ "type": "standard", "name": "Suitcase Carry",
  "rx": { "sets": 3, "distance": "20m", "side": true, "rest": 90 } }
{ "type": "standard", "name": "Box Jump", "intent": "max intent",
  "rx": { "sets": 4, "reps": 4, "rest": 120 } }
{ "type": "standard", "name": "Copenhagen Plank",
  "rx": { "sets": 3, "time": "20s", "side": true, "label": "Hold" } }
```

An exercise with **no countable dose at all** ("Start the Run", "Empty Bar Warm-Up Sets")
carries **no `rx` key** — its instruction lives in `setup` and `cues`. An empty `rx: {}` is
a lint error.

#### Legacy `chips[]` — still read, never written

Every programme written before 2026-09-20 still carries `chips[]`. `rxOf()` parses those
on the fly and recovers what each number really was, so an unmigrated exercise renders
correctly and *better* than it used to (a duration finally reads as TIME, not REPS).
Nothing needs migrating by hand:

- the Train library (`workouts/*.json`) was converted in bulk by `scripts/migrate_rx.js`
- a live programme converts itself the next time it is saved from **coach.html → ✎** or
  written by `/program-assemble`

**Never author `chips[]` again, and never leave `chips` beside `rx`** (lint error
`chips-and-rx`) — two sources of truth is the bug this replaced.

#### Where the code lives

`rxOf()` / `repCount()` / `tempoWords()` exist **twice**: inline in `program.html` (the
offline PWA, deliberately self-contained) and in `assets/js/chips.js` (loaded by
`coach.html`). ⚠ **Change both.** `scripts/check_rx.js` runs fixtures through both copies
and fails on any difference; it is in `.githooks/pre-commit`. `assets/js/chips.js` also
owns the write side — `applyRx()`, `toRx()`, `auditRx()`.

### Coaching Cues

> **Since 2026-09-24 a programme writes no cues.** They come from the exercise's Spine entry (see
> "`exId` and the Spine"), and anything about one athlete goes in `note`. This section describes
> the shape, which the Spine entry, library workouts and legacy cards all use.

Every exercise (including circuit sub-items) can have optional cues:

```json
"cues": {
  "good": ["What to do (shown with ✅)"],
  "bad":  ["What to avoid (shown with ❌)"]
}
```

Both arrays are optional. If omitted or empty, no cues section appears.

**Mapping External / Internal / Avoid cues:** when a program specifies an external (what to do), internal (what to feel), and avoid cue per exercise, put the external + internal cues together in `good[]` and the avoid cue in `bad[]`:

```json
"cues": {
  "good": ["Press in a smooth arc to just short of lockout", "Feel the delts drive the weight, not the chest"],
  "bad":  ["Letting the lower back arch off the pad"]
}
```

---

### `programHistory` — Archived Programs

```json
"programHistory": [
  {
    "id": "prog1",
    "label": "Program 1",
    "subtitle": "Month One",
    "days": [
      {
        "label": "Day 1",
        "focus": "Lower Body Power",
        "exercises": [
          { "name": "Back Squat", "detail": "3×10" }
        ]
      }
    ]
  }
]
```

Archives are read-only summaries. Add a new object for each completed program block.

#### How `programHistory` powers the home "past program" card

The home screen shows a tappable **past program card** for the cycle immediately
before the current one. Two independent pieces of the file feed it — both must be
present for the card to appear:

1. **The card's visible content** (badge, name, weeks, tagline, focuses) comes
   from **`cycles[currentCycleIndex - 1]`** — the previous cycle's summary. So the
   athlete must be past cycle 1 (`currentCycleIndex ≥ 1`).
2. **What opens when tapped** comes from **`programHistory[0]`** — the day-by-day
   exercise archive. So `programHistory` must have at least one entry.

If `currentCycleIndex ≥ 1` but `programHistory` is empty (or vice-versa), the past
card silently does **not** render. No fields beyond the normal `cycles[]` entry are
needed — the past card reuses the same fields every cycle card uses.

> **Keep them in sync:** the card's label comes from `cycles[idx-1].name` while the
> opened archive's title comes from `programHistory[0].subtitle`. These are separate
> values in the file — name them consistently (e.g. both "Foundation Forge") so the
> card and the archive it opens describe the same program.

---

### `notes` — Coaching Notes

`card.body` renders as **HTML, not escaped plain text** — write it as 2–4 short `<p>`
paragraphs, and use a `<ul><li>` list for anything enumerable (rules, steps, a keep/cut/skip
breakdown). Use `<strong>` to bold the one phrase per paragraph that matters most; `<em>` for
light emphasis. This matches the "Using the app" guide cards' convention — don't write a
single unbroken paragraph, it renders as one dense block with no visual structure.

```json
"notes": {
  "greeting": "For You, John",
  "cards": [
    {
      "icon": "⏱",
      "title": "Understanding Tempo",
      "body": "<p>The numbers next to exercises...</p><p><strong>Example:</strong> 3-1-1-0 means 3s down, 1s pause, 1s up, 0s pause.</p>"
    }
  ]
}
```

---

## Common Workflows

### Adding a New Athlete

1. Copy any existing JSON file (e.g. `john_doe.json`)
2. Rename to `new_athlete.json`
3. Update `athlete`, `sport`, `cycles`, and `workouts`
4. Publish it into `public.programs` — coach.html → Athletes → **↑ Publish programme file**.
   `data/*.json` is gitignored and 404 on the live site; the row is what the app serves.
5. Give them a login — coach.html → Athletes → the athlete → **Create login**, then send the
   username and password. ⚠️ **Not** a `?client=` link: those are retired and refused.

No HTML editing required.

### Advancing to the Next Cycle

1. **Move the previous `workouts` content into `programHistory`** (in the simplified `{label, focus, exercises[{name, detail}]}` shape). This is what the new past program card opens — don't skip it, or the card won't appear.
2. **Replace `workouts.days`** with the new cycle's training days.
3. **Increment `currentCycleIndex` by 1.**
4. (Optional) Update `workouts.label`.

The home screen automatically re-derives the past / current / next cards from
`currentCycleIndex` and `programHistory`. Steps 1 and 3 together are exactly what
makes the past program card show up (see "How `programHistory` powers the home
'past program' card").

### Adding More Focuses to a Cycle

`focuses` is an array — add as many as you want:

```json
"focuses": [
  "Build foundational movement quality.",
  "Establish aerobic base.",
  "Improve sleep and recovery quality.",
  "Reinforce nutrition habits."
]
```

---

## Flexible Day Structure Examples

**Lifting-only day:**
```json
"blocks": [
  { "title": "Activation & Prep", "exercises": [...] },
  { "title": "Primary",   "exercises": [...] },
  { "title": "Accessory",  "exercises": [...] }
]
```

**Speed & conditioning day:**
```json
"blocks": [
  { "title": "Dynamic Warm-Up", "exercises": [...] },
  { "title": "Sprint Drills", "exercises": [...] },
  { "title": "Conditioning", "exercises": [...] },
  { "title": "Cool-Down", "exercises": [...] }
]
```

**Recovery session:**
```json
"blocks": [
  { "title": "Foam Rolling", "exercises": [...] },
  { "title": "Mobility Flow", "exercises": [...] },
  { "title": "Breathing", "exercises": [...] }
]
```

The system adapts to your programming — not the other way around.

---

## Library tab — Train section (on-demand workouts)

Separate from athlete programmes (`data/*.json`), the **Library tab → Train** section shows a
shared library of extra, on-demand sessions available to **every** user. These
live in their own `workouts/` folder so they never mix with athlete data.

### Folder layout

```
workouts/
  index.json                          ← the manifest (drives the Workouts tab)
  strength/full-body-power.json
  conditioning/engine-builder.json
  mobility/daily-flow.json
  …one JSON per workout, in its category folder
```

### `workouts/index.json` — the manifest

Lists the categories (with their banner image) and, per category, the workouts
to show as cards. (Since 2026-09 the live source of truth is the database — see *Adding a workout* below — and this
manifest is the offline fallback.) The manifest was the source of truth for the **card** (name,
duration, equipment) so the Train list renders instantly without opening every file.

```jsonc
{
  "categories": [
    {
      "id": "strength",
      "title": "Strength",                              // banner heading
      "banner": "assets/img/workouts/strength.webp",    // 2:1 image (≈1600x800)
      "workouts": [
        { "id": "full-body-power", "title": "Full-Body Power",
          "duration": "45 min", "equipment": "Barbell",
          "file": "workouts/strength/full-body-power.json" }
      ]
    }
  ]
}
```

- **Every category always renders** its banner (with a workout count). A category
  whose `workouts` array is **empty** shows a "your coach is adding…" note instead
  of cards — it is not hidden.
- Banner images are 2:1 (the banner box uses `aspect-ratio: 2/1`, so the whole
  photo shows on phones). Keep filenames lowercase (GitHub Pages is case-sensitive).

### A workout file

Same shape as an athlete training **day** (so the app can render it with the
existing exercise cards): `focusTag` + `blocks[].exercises[]`. Each file also
repeats its own `id` / `title` / `duration` / `equipment` (used when the workout
is opened). Supported per exercise: `rx` (the prescription — see "`rx` — the
prescription"), `cues.good[]` / `cues.bad[]`, and `videoUrl` (or leave it `null` to
auto-resolve a video by exercise name from `exercise_library.json`).
RPE and tempo are usually omitted in the library, which costs nothing: the card
simply draws fewer cells. All 42 sessions were converted from `chips[]` to `rx` on
2026-09-20 by `scripts/migrate_rx.js`.

```jsonc
{
  "id": "full-body-power", "title": "Full-Body Power",
  "category": "strength", "duration": "45 min", "equipment": "Barbell",
  // Which habit "Mark as done" ticks in AA Proof. REQUIRED — see below.
  "countsAs": "strength",
  // 1-2 short paragraphs, about 100-150 words in all: why this session exists,
  // how it runs, what kit and timing it needs. Renders in the green header under
  // the duration line. REQUIRED — see "Where the coaching goes" below.
  "intro": ["…", "…"],
  // What to STOP for, as rows of { label, text }. Renders as an always-visible white
  // "Before you start" card above the intro. All 42 library sessions have one
  // (2026-09-20), so a new session should too. Absent or empty, the card stays hidden.
  "before": [ { "label": "Not today", "text": "…" }, { "label": "Stop now", "text": "…" } ],
  "focusTag": "Full-Body Strength",
  "blocks": [
    { "title": "Strength", "icon": "🎯", "exercises": [
      { "type": "standard", "name": "Barbell Back Squat", "videoUrl": null,
        "rx": { "sets": 5, "reps": 5, "rest": 150 },
        "cues": { "good": ["Brace before each rep"], "bad": ["Chest collapsing forward"] } }
    ] }
  ]
}
```

### Opening a workout (the session view)

Tapping a card opens the workout in its own session screen, which reuses the
same exercise cards as the training screen (video, sets/reps, coaching cues,
rest timer). Per-exercise check-off is **local-only and resets daily**: ticks are
stored in the browser under `wkout_<id>` with the date they were made, survive a
same-day reload, and clear automatically on a new calendar day. A library workout
never writes set-logs, RPE or a cloud backup of its exercise ticks.

**The one thing that does reach the server is `Mark as done`** at the foot of the
screen. It writes a single row to `public.library_sessions` — athlete, workout,
date, and nothing else — which feeds the athlete's habits and the coach's report.
The button is hidden for a signed-out visitor, in demo mode, and in coach preview.
Its own done-state is stored under `wkdone_<id>` and resets daily the same way.

**The header, top to bottom:** shelf picture, title, `duration · equipment`, the **Before you start** card
(`renderBefore()`, hidden when `before` is absent or empty), then the collapsible **Why this session**
(`renderWhy()`). The toggle is remembered once for every workout in `localStorage.ws_why_off`, in three
states: `'1'` closed, `'0'` open, nothing stored = the default. The default is *open* when the intro is
100 words or fewer (`WS_WHY_LONG`) and *closed* when it is longer, **but only on a workout that has a `before`
card**: on an older session the red flags may still be written into the intro, so it keeps opening as it always did.

**A shared link (`?workout=<id>`) resolves through the database first**, exactly like the shelf's own
card (`openWorkoutDeepLink()`): `<id>`, `<category>/<id>` and the old `workouts/<category>/<id>.json` all
work, the header gets its shelf picture, and an edit made in the database shows on a link shared earlier.
The `workouts/*.json` files are read only if the database could not be reached at all, and an id the
database does not have does **not** fall back to a file, so unpublishing a session really unpublishes it.

#### Where the coaching goes — four places, four jobs

Amir's rule, 2026-09-12, after every AI-written session in the library broke it.
The three carry different weight and **must not repeat each other** — the failure
he named was "you are coaching in the Coach's Note *and* in the cues, that's too
much."

| | What it is | Length |
|---|---|---|
| **`before`** | What to stop for: who should not do it today, red flags, spacing, first-time dose | rows of `{label, text}`, **about 50–210 words** in all |
| **`intro`** | Why this session exists, how it runs, what kit and timing | **1–2 paragraphs, about 100–150 words** |
| **`note`** | One thing about *this exercise* the cues cannot carry | **one sentence**, and only where it earns its place |
| **`cues`** | How to do the rep | **exactly 3** — see below |

**`before` is the safety card, and it is why `intro` can stay short.** It is drawn as a white card
above the intro and **is never behind a toggle**. Measured 2026-09-20: the intro's *Why this session*
toggle is one preference shared by every workout, so an athlete who closed it once had every session's
"stop if…" wording hidden for good, and a 300-word intro put the first exercise about 1,200 px down a
phone. So anything that keeps someone safe goes in `before` (labels in use across the library:
*Not today · Stop and get it checked/looked at · Stop now · A day or two later · Past injury · Keep clear ·
First time · Who it's for · Check the space/setup/kit · While you train · Never roll · Lightheaded · Heat*),
and `intro` carries only the why and the how. Never put the same warning in both. The wording of the rows
every session shares is in the `/workout` skill, **Standard rows**: copy it, so one warning reads the same everywhere.

**Cues are exactly three, never more, never fewer** — one **external** (where to
push, what to move toward), one **internal** (what to feel), one **avoid** (the
single mistake that most risks injury). External + internal go in `cues.good[]`,
the avoid cue in `cues.bad[]`, so every exercise is `good: [2], bad: [1]`. This
is not a library rule, it is `COACHING-PRINCIPLES.md` → **Coaching cues**, and it
applies to programmes too. Amir's own Front-Rack Rescue holds it on every
exercise; it is the reference.

**Most exercises need no `note` at all.** Neither workout Amir wrote himself uses
one. Reach for it when there is a genuine caveat the cues cannot hold — a
regression ("start on your knees"), a timing rule ("leave this one for an hour
after you wake up"), a safety line — and never to explain *why the session is
built this way*. That is what `intro` is for now.

#### `countsAs` — which habit a library workout ticks

| Value | Ticks in AA Proof | For |
|---|---|---|
| `"strength"` | the **WORKOUT** habit | a real session: strength, conditioning, on-court speed (~25 min and up) |
| `"mobility"` | the **MOBILITY** habit | a mobility flow or a physical recovery session (~10–20 min) |
| `"breathe"` | the **BREATHE** habit | anything in the **Breath** category — breath work with easy movement |
| `"none"` | nothing | a **warm-up** — part of a session, not a session |

Every value here must exist in three places at once: this table, the whitelist in
`log_library_session()`, and `LIB_TICKABLE` in `habits.html`. Add one to fewer than
all three and the server records a habit the client silently drops.

**Required.** The server whitelists the value and falls through to "counts for
nothing" on anything it does not recognise, so omitting it is safe but silent.
**Do not derive it from the category** — `on-court` holds both a speed session and
a warm-up, and `conditioning` holds both an engine session and a run warm-up.
When torn between `strength` and `mobility`, pick `mobility`: WORKOUT is 28.6% of
the day score. Full reasoning: `supabase/stage28_library_sessions.sql`, `HABITS.md`.

### Adding a workout

1. Create the workout JSON in `workouts/<category>/<id>.json` (with `title`,
   `duration`, `equipment`, `countsAs`, `focusTag`, `blocks`).
2. Add an entry to that category's `workouts` array in `index.json` with the
   **same** `title` / `duration` / `equipment` and the `file` path.
3. Commit + push. **That alone does not put it in the app.** The Library is served from Supabase
   (`public.library`, read through `get_library()`), and the JSON files and `index.json` are only the
   offline fallback plus what `?workout=<id>` deep links resolve through.
4. Publish it: **coach.html → Library → + Publish workout** (multi-select, upserts on `slug`), or an
   `insert … on conflict (slug)` into `public.library`. The row's slug is
   `workouts/<category>/<id>`, so a category move is a database write too.
5. Set `sort_order` if the shelf position matters — the picker leaves it NULL, which sorts last, then
   alphabetically by slug.
6. **Moving safety wording out of an intro and into `before` on a live session is a three-step rollout**, because an
   installed phone keeps the app shell it already has (`sw.js` is stale-while-revalidate, so every athlete's *first*
   open after a deploy still runs the old shell, and `CACHE` v10 is the first one that draws the card):
   (1) ship the app change; (2) **add** `before` to the rows and leave the intro alone: an old shell ignores
   `before` and shows the long intro exactly as it did, so this step is safe at once; (3) about a day later, **trim**
   the intro. Trim it early and a phone on the old shell shows neither the card nor the stop rules.

> **Keep them matching:** the name/duration/equipment exist in *both* the manifest
> (for the card) and the file (for the opened view). If you rename a workout, change
> it in both places or the card and the opened session will disagree.

---

---

## Library tab — Read section (articles / blog)

The **Library tab → Read** section is a coach-published article library. Articles are static JSON files — no backend, no CMS. Each article gets its own shareable URL: `program.html?article=<id>`.

**Website copies (2026-09-13):** every article is also a public page — `/en/articles/<id>.html`, and, from a reviewed translation `articles/<category>/<id>.fa.json`, `/fa/articles/<id>.html` — generated by `scripts/build_article_pages.py`. A `.fa.json` has `translationOf`, `lang`, `sourceHash`, `title`, `seoTitle`, `description` and block-for-block `blocks`, and **never** `id` or `category` (coach.html would publish it over the English). `date` in the English file must stay `"<Month> <YYYY>"`. Workflow: `.claude/skills/article/SKILL.md`.

### Folder layout

```
content/
  index.json                               ← the manifest (drives the Read tab)
  for-coaches/pre-session-warm-up.json
  pre-competition/tennis-warm-up.json
  recovery/<slug>.json
  mental/<slug>.json
  …one JSON per article, in its category folder
```

### `content/index.json` — the manifest

Lists the categories (with their icon and banner image) and, per category, the articles to show as cards. The manifest is the source of truth for the **card** (title, read time) so the list renders instantly without fetching every article file.

```jsonc
{
  "categories": [
    {
      "id": "for-coaches",
      "title": "For Coaches",
      "icon": "book",                              // key from window.__ICONS
      "banner": "assets/img/workouts/strength.webp",
      "articles": [
        {
          "id": "pre-session-warm-up",
          "title": "The Pre-Session Warm-Up",
          "category": "For Coaches",
          "readMins": 7,
          "file": "content/for-coaches/pre-session-warm-up.json"
        }
      ]
    }
  ]
}
```

**Icon keys** (from `window.__ICONS` in `program.html`): `book`, `mindset`, `sleep`, `nutrition`, `bodycomp`, `tennis`, `strength`, `clipboard`, `note`, `schedule`, `progress`, `cardio`, `mobility`, `running` — and every other key in `__ICONS`. A category whose `articles` array is **empty** shows a "coach is adding…" note instead of cards.

**Current categories and their icons:**

| id | Title | Icon |
|---|---|---|
| `for-coaches` | For Coaches | `book` |
| `pre-competition` | Pre-Competition | `tennis` |
| `recovery` | Recovery | `sleep` |
| `mental` | Mental | `mindset` |
| `nutrition` | Nutrition | `nutrition` |
| `supplements` | Supplements | `bodycomp` |

### An article file

```jsonc
{
  "id": "pre-session-warm-up",
  "title": "The Pre-Session Warm-Up",
  "category": "For Coaches",
  "readMins": 7,
  "date": "June 2026",
  "blocks": [
    { "type": "p", "text": "Opening paragraph..." },
    { "type": "h", "text": "Section heading" },
    { "type": "list", "items": ["Point one", "Point two"] },
    { "type": "callout", "label": "Rule", "text": "Callout body text." },
    { "type": "img", "src": "assets/img/example.webp", "caption": "Optional caption." },
    { "type": "workout", "file": "workouts/on-court/tennis-warm-up-routine.json",
      "label": "Tennis Warm-Up Routine", "meta": "12–15 min · Bodyweight · On-Court" }
  ]
}
```

### Article block types

| Type | Required fields | What it renders |
|---|---|---|
| `p` | `text` | Paragraph. The **first** `p` block in an article gets a large clay drop-cap on its first letter. |
| `h` | `text` | Section heading. Auto-numbered §01, §02… with a clay leading dash. |
| `list` | `items[]` | Bullet list with clay tennis-ball bullets. |
| `callout` | `label`, `text` | Tinted box with a small label badge at the top. Use for rules, key points, or step labels ("Step 1 — Raise"). |
| `img` | `src` | Full-width image. Optional `caption` (string) adds a captionline below. |
| `workout` | `file`, `label` | Tappable card that opens a workout from the Train library. Optional `meta` (string) shows duration/equipment under the label. |

### Article hero design

The first block never appears in the hero — the hero is built from the article's top-level fields:
- **Kicker** — `category` value (e.g. "For Coaches"), shown above the title in clay
- **Title** — `title` value; the **last word** is automatically wrapped in a clay highlight
- **Meta line** — `readMins` + `date`

### Adding an article

1. Create the article JSON in `content/<category-id>/<slug>.json` (with `id`, `title`, `category`, `readMins`, `date`, `blocks`).
2. Add an entry to that category's `articles` array in `content/index.json` (with `id`, `title`, `category`, `readMins`, `file`).
3. Commit + push. The Read tab picks it up on next load.

**Deep-link:** `program.html?article=pre-session-warm-up` opens the article directly — usable as a shareable public URL.

### Embedding a workout inside an article

Use a `workout` block with the path to the workout JSON:

```json
{
  "type": "workout",
  "file": "workouts/on-court/tennis-warm-up-routine.json",
  "label": "Tennis Warm-Up Routine",
  "meta": "12–15 min · Bodyweight · On-Court"
}
```

Tapping the card opens the full workout in the Train session view. The workout must already exist in `workouts/` and be registered in `workouts/index.json` (see the Train section above).

---

## Migration Notes (from the old schema)

The old `currentProgram` + `journey` structure has been replaced. The migration is automatic if you used the migration script; otherwise, the mapping is:

| Old field | New location |
|---|---|
| `coach.name` | Removed — coach is hardcoded in HTML |
| `currentProgram.cycleNumber` / `cycleName` / `cycleTagline` / `cycleWeeks` | `cycles[currentCycleIndex].num` / `name` / `tagline` / `weeks` |
| `currentProgram.primaryFocus` + `secondaryFocus` | `cycles[currentCycleIndex].focuses[]` |
| `currentProgram.whyThisMatters` + `whyThisMattersPart2` | `cycles[currentCycleIndex].message.paragraphs[]` |
| `currentProgram.outcomes` | `cycles[currentCycleIndex].message.outcomes[]` |
| `currentProgram.mentalCue` | Removed (no longer rendered) |
| `currentProgram.month` / `focus` | Removed (no longer rendered) |
| `currentProgram.nextCycleTeaser` | `cycles[currentCycleIndex + 1].teaser` |
| `currentProgram.eyebrow` | `workouts.label` |
| `currentProgram.days` | `workouts.days` |
| `journey.cycles[]` | `cycles[]` (statuses are now derived from `currentCycleIndex`) |
| `journey.totalCycles` | Removed (use `cycles.length`) |
