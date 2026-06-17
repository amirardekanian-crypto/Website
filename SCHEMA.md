# S&C Program Platform — JSON Schema Guide

## AI Generation Guide (for producing a new client JSON)

**Role:** You are generating a client JSON file for a fitness coaching web app.
**Output:** A single valid JSON file matching the template below. No comments, no prose, no trailing commas — just strict JSON.

### Hard Rules (do not break)

- Required keys: `athlete.id`, `athlete.firstName`, `athlete.lastName`, `currentCycleIndex`, `cycles`, `workouts`, `workouts.days`.
- `athlete.id` must be lowercase `firstname_lastname` (appears in the URL and localStorage).
- `athlete.key` is a 32-char hex secret that authorises this athlete's cloud backup. Generate one per athlete and **also register it server-side** in the Supabase `athlete_keys` table (see "`athlete.key` & cloud backup"). Without it, progress still saves but is unprotected.
- `currentCycleIndex` is 0-based. `0` means the athlete is on the first cycle in `cycles`.
- Every `days[]` entry must have a **unique numeric** `id` (1, 2, 3…).
- Every day must contain at least one `block`; every block must contain at least one `exercise`.
- `type` on every exercise must be exactly one of: `"simple"`, `"standard"`, `"circuit"`.
- Chip `style`, if used, must be exactly `"yellow"` or `"dark"` (or omitted).
- The `type` field decides what tools an exercise gets — no separate flags needed:
  - `"simple"` → just the row. No rest, no weight, no RPE, no note.
  - `"standard"` → always has rest timer + weight log + RPE selector + personal note.
  - `"circuit"` → rest timer at the end + personal note, and **by default** an inline **weight field per item** plus **one RPE per round** (supersets, complexes, conditioning all log load this way). Add `"warmup": true` to make a circuit log nothing (prep/mobility). See "Circuit logging" below.
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
                "chips": [{ "label": "5 minutes", "style": "dark" }]
              },
              {
                "type": "circuit",
                "name": "Dynamic Mobility",
                "rounds": "×3 Rounds",
                "restSec": 60,
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
                "restSec": 180,
                "chips": [
                  { "label": "4 Sets", "style": "yellow" },
                  { "label": "×6 Reps" },
                  { "label": "Tempo 3-1-1" },
                  { "label": "RPE 7" }
                ],
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
- `athlete.key` → 32-char hex secret (generate with `crypto.randomUUID().replace(/-/g,'')`). Reused across all of an athlete's cycles. Must also be registered in the Supabase `athlete_keys` table — see "`athlete.key` & cloud backup".
- `sport.badge` → short line shown above the name, e.g. `"🎾 Tennis Performance"`. Omit the whole `sport` object if not relevant.
- `focuses[]` → one-line training focus statements. Any number allowed.
- `message.paragraphs[]` → 1–3 short paragraphs on why the current cycle matters.
- `message.outcomes[]` → 3–6 concrete, measurable expected outcomes.
- `teaser` → hype section for the NEXT cycle only. Omit the whole `teaser` object if there is no next cycle planned.
- `chips[]` → metadata pills (sets, reps, tempo, RPE). `style: "yellow"` for the primary set count, `"dark"` for duration / equipment, no style = default grey.
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
| `athlete.key` | string | recommended | 32-char hex secret for protected cloud backup. Must match the athlete's row in the Supabase `athlete_keys` table (see below). |
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

#### `athlete.key` & cloud backup

Every athlete gets a private 32-char hex `key` (a UUID with dashes stripped:
`crypto.randomUUID().replace(/-/g,'')`). It authorises that athlete's progress
writes to the cloud. **Two places must hold the same value:**

1. **The JSON** — `athlete.key` in `data/<id>.json`.
2. **The database** — a row in the Supabase `athlete_keys` table
   (`athlete_id`, `secret_key`).

The app sends the key on every cloud write; `save_progress` rejects the write
only when a row exists for that `athlete_id` and the key doesn't match:

| JSON key | DB row | Result |
|---|---|---|
| present | present & matching | writes succeed, **protected** ✅ (do this) |
| present | none | writes succeed but **unprotected** (anyone could write as that athlete) |
| missing/wrong | present | writes **rejected** — the coach never sees the data |

Register the key once when creating the athlete:

```sql
insert into public.athlete_keys (athlete_id, secret_key)
values ('firstname_lastname', '<32-char-hex>')
on conflict (athlete_id) do nothing;
```

Reuse the **same** key across all of an athlete's cycles/programs — don't
regenerate (e.g. `mhrn_zhr1` and `mhrn_zhr2` share one key).

---

### `cycles[n]`

Each cycle describes one training phase.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `num` | number | ✅ | Cycle number (shown as the big faded number on the phase row) |
| `name` | string | ✅ | Phase name, e.g. `"Foundation Forge"` |
| `tagline` | string | optional | Short italic line under the name |
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
| `focusTag` | string | optional | Day name + yellow badge. **Also picks the banner image** — see below |
| `completionTitle` | string | optional | Heading shown when day is finished |
| `completionMessage` | string | optional | Body text on completion |
| `blocks` | array | ✅ | List of training sections — any order, any count |

#### Day `focusTag` → banner image

A day has no per-day image. The app derives one from a small shared pool by scanning the
day's `title` + `focusTag` for the **first** matching keyword, in this fixed priority order
(first hit wins — earlier categories outrank later ones):

| Priority | Image category | Trigger keywords (case-insensitive) |
|---|---|---|
| 1 | `recovery` | recover, mobility, regen, deload, rest, stretch, flexib |
| 2 | `power` | power, plyo, explos, speed, jump, sprint, rotational, med ball, throw |
| 3 | `conditioning` | condition, cardio, engine, aerobic, hiit, metcon, interval, endur |
| 4 | `core` | core, abs, trunk, anti-rot, plank, brace |
| 5 | `upper` | upper, push, pull, press, shoulder, chest, back, arm, bench, row |
| 6 | `lower` | lower, leg, squat, hinge, glute, deadlift, hamstring, quad, calf, lunge, knee |
| 7 | `fullbody` | full body, total body, whole body |
| — | `default` | (no keyword matched → green gradient) |

**Naming consequences (get these right):**
- Lead the `focusTag` with the keyword for the image you want; a *higher-priority* keyword
  hijacks it. `"Lower + Brace"` → **core** image (brace, pri 4, beats lower, pri 6).
  `"Upper Body & Conditioning"` → **conditioning** (pri 3 beats upper, pri 5).
- A name with **no** keyword falls to the bare gradient. `"Total + Carry"` matches nothing
  ("carry" isn't a keyword; "total" only counts as `total body`) → `default`.
- For a true full-body day use the literal phrase **`Full-Body`** / `Total Body` so it hits
  `fullbody` rather than nothing.

(Source of truth: `DAY_IMAGE_RULES` in `program.html`. Keep this table in sync if those change.)

### `blocks[n]` — Training Section

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Section label, e.g. `"Warm-Up"`, `"Plyometrics"` |
| `icon` | string | optional | Emoji icon |
| `exercises` | array | ✅ | Exercises within this block |

---

### Exercise Types

#### `type: "simple"` — Plain row, no extras
Best for: warm-ups, cool-downs, single-item entries that don't need rest, weight, RPE, or notes.

```json
{
  "type": "simple",
  "name": "Bike",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "chips": [{ "label": "5 minutes", "style": "dark" }],
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

**By default every circuit logs** — a small inline **weight field on each exercise** (one weight per item, folded into the round row) **plus one RPE per round**. This covers supersets, complexes, *and* conditioning circuits (load can be added to any of them). A **warm-up** is the exception: it logs nothing.

| Flag | Default | Effect |
|---|---|---|
| `warmup` | `false` | `true` → the circuit logs **nothing** (no weight, no RPE) — for prep/mobility. The pre-session readiness check already captures how the athlete feels. |
| `logWeight` | `true` | Optional override — set `false` to hide the weight field on a non-warm-up circuit. |
| `logRPE` | `true` | Optional override — set `false` to hide the per-round RPE rows. |

- **Superset / conditioning / complex** → no flags needed: each item gets its own inline weight box + one RPE per round. Syncs to the coach as two lines — `Incline Dumbbell Press 30 · Chest-Supported Dumbbell Row 25` then `RPE: R1 8 · R2 8 · R3 9`.
- **Warm-up / prep** → `"warmup": true`: logs nothing.

#### `type: "standard"` — Loaded exercise with rest, weight, RPE
Best for: all loaded exercises (strength, plyos, accessories) — and any single-exercise row that should be logged.

```json
{
  "type": "standard",
  "name": "Back Squat",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "restSec": 180,
  "chips": [
    { "label": "4 Sets", "style": "yellow" },
    { "label": "×6 Reps" },
    { "label": "Tempo 3-1-1" },
    { "label": "RPE 7" }
  ],
  "cues": {
    "good": ["Push the floor away"],
    "bad": ["Don't let knees cave"]
  }
}
```

Every `standard` exercise gets, automatically: rest timer + weight log + RPE selector + personal note. `restSec` defaults to **120s** if omitted. Common values: `60`, `90`, `120` (= 2 min), `180` (= 3 min), `240` (= 4 min).

### `videoUrl` — Optional Exercise Video

Any exercise (any type) can include a `videoUrl`. When present, a play button appears next to the name. When omitted, no button renders.

### Chip Styles

Chips route to the stats grid by their **label pattern** (next section), not their style.
`style` only matters for the leftover **modifier** chips — the ones that match no stat:

| Style | Appearance | Use for |
|-------|-----------|---------|
| *(none)* | Grey stat cell / pill | Reps, RPE, tempo — the parsed stats |
| `"yellow"` | Yellow pill | The set count (`"N Sets"`), one per `standard` exercise |
| `"dark"` | **Green** modifier pill, anchored by the name | Technique cues only: `"3s eccentric"`, `"1s squeeze"`, `"glute focus"`, `"superset"`, `"max intent"` |

### Chip parsing — how every label becomes a stat or a modifier pill

`program.html` parses **every** chip label — on `standard` AND `simple` exercises — and routes it to one of five stat cells (SETS · REPS · RPE · TEMPO · REST). Whatever matches **no** stat pattern becomes a **green modifier pill** anchored next to the exercise name (visible collapsed *and* expanded). Circuits are the exception: they show only their `rounds` + rest.

| Chip label pattern | Routes to | Example |
|---|---|---|
| `"N Sets"` | SETS cell | `"3 Sets"` |
| Starts with `×` | REPS cell (strips `×` + trailing "Reps") | `"×8 Reps"`, `"×10 Each Side"`, `"×30s Each Side"`, `"×40m"` |
| Ends with "reps" / "rep" | REPS cell | `"8 Reps"` |
| `"N Each Side/Leg/Arm"` (no `×`) | REPS cell | `"4 Each Side"`, `"10-12 Each Leg"` |
| Bare number or range | REPS cell | `"8"`, `"10-12"` |
| Pure duration / distance | REPS cell (auto-promoted) | `"30s"`, `"40m"`, `"5 min"`, `"1:30"` |
| `"Tempo a-b-c-d"` | TEMPO cell | `"Tempo 3-0-1-0"` |
| `"RPE N"` | RPE cell | `"RPE 8"` |
| **Anything else** | **Green modifier pill** (by the name) | `"3s eccentric"`, `"max intent"`, `"superset"` |

**Authoring rules — so chips land where you intend:**
- **Reps → one `×`-prefixed chip:** `"×10 Reps"`, `"×10 Each Side"`, `"×30s Each Side"`, `"×40m"`. Embed side/leg/arm info in that *same* chip — never a separate `"Each Side"` chip. (Bare `"4 Each Side"` and bare numbers still route to REPS as a fallback, but `×` is the rule.)
- **Modifier (green) chips are technique cues ONLY** — `"3s eccentric"`, `"glute focus"`, `"max intent"`, a `"2s hold"` pause-emphasis. **Never put a rep count, dose, or duration in a bare modifier chip**, or it shows as a green pill with an empty REPS cell (the `"4 Each Side"`-as-green-pill bug).
- **One set count per `standard`** — `"N Sets"`, yellow.

### `simple` exercise chip convention

A `simple` exercise (warm-up / activation) takes **two chips**, parsed into the stats just like a `standard` one:

1. **Reps / duration** — a `×`-prefixed count (`"×6 Each Side"`, `"×8"`) or a bare duration/distance (`"5 min"`, `"30s"`) → REPS cell.
2. **RPE** — `"RPE 4"` (warm-ups are typically RPE 3–5) → RPE cell.

No sets, tempo, or rest chip. Don't add a separate chip for the rep count (it *is* the reps chip above), and only add a modifier chip if there's a genuine technique cue — it renders green.

```json
{ "type": "simple", "name": "Bird Dog",
  "chips": [{ "label": "×6 Each Side" }, { "label": "RPE 4" }] }

{ "type": "simple", "name": "Assault Bike",
  "chips": [{ "label": "5 min" }, { "label": "RPE 5" }] }
```

### Coaching Cues

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

```json
"notes": {
  "greeting": "For You, John",
  "cards": [
    {
      "icon": "⏱",
      "title": "Understanding Tempo",
      "body": "The numbers next to exercises..."
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
4. Generate a fresh `athlete.key` and register it in the Supabase `athlete_keys` table (see "`athlete.key` & cloud backup")
5. Send the athlete: `yoursite.github.io/program.html?client=new_athlete`

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

**Strength-only day:**
```json
"blocks": [
  { "title": "Warm-Up", "exercises": [...] },
  { "title": "Strength", "exercises": [...] }
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
to show as cards. The manifest is the source of truth for the **card** (name,
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
is opened). Supported per exercise: **sets, reps, times, cues, videos** — chips
for sets/reps/duration, `cues.good[]` / `cues.bad[]`, and `videoUrl` (or leave it
`null` to auto-resolve a video by exercise name from `exercise_library.json`).
RPE and tempo are intentionally omitted here; the renderer simply shows fewer
stat cells, so leaving them out breaks nothing.

```jsonc
{
  "id": "full-body-power", "title": "Full-Body Power",
  "category": "strength", "duration": "45 min", "equipment": "Barbell",
  "focusTag": "Full-Body Strength",
  "blocks": [
    { "title": "Strength", "icon": "🎯", "exercises": [
      { "type": "standard", "name": "Barbell Back Squat", "videoUrl": null,
        "restSec": 150,
        "chips": [ {"label":"5 Sets","style":"yellow"}, {"label":"×5 Reps"} ],
        "cues": { "good": ["Brace before each rep"], "bad": ["Chest collapsing forward"] } }
    ] }
  ]
}
```

### Opening a workout (the session view)

Tapping a card opens the workout in its own session screen, which reuses the
same exercise cards as the training screen (video, sets/reps, coaching cues,
rest timer). Check-off here is **local-only and resets daily**: ticks are stored
in the browser under `wkout_<id>` with the date they were made, survive a
same-day reload, and clear automatically on a new calendar day. Library workouts
are **not** tied to an athlete — they never write set-logs, RPE, or cloud backup,
and there is no finish/send-to-coach step.

### Adding a workout

1. Create the workout JSON in `workouts/<category>/<id>.json` (with `title`,
   `duration`, `equipment`, `focusTag`, `blocks`).
2. Add an entry to that category's `workouts` array in `index.json` with the
   **same** `title` / `duration` / `equipment` and the `file` path.
3. Commit + push. The Workouts tab picks it up on next load.

> **Keep them matching:** the name/duration/equipment exist in *both* the manifest
> (for the card) and the file (for the opened view). If you rename a workout, change
> it in both places or the card and the opened session will disagree.

---

---

## Library tab — Read section (articles / blog)

The **Library tab → Read** section is a coach-published article library. Articles are static JSON files — no backend, no CMS. Each article gets its own shareable URL: `program.html?article=<id>`.

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
