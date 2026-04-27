# S&C Program Platform — JSON Schema Guide

## AI Generation Guide (for producing a new client JSON)

**Role:** You are generating a client JSON file for a fitness coaching web app.
**Output:** A single valid JSON file matching the template below. No comments, no prose, no trailing commas — just strict JSON.

### Hard Rules (do not break)

- Required keys: `athlete.id`, `athlete.firstName`, `athlete.lastName`, `currentCycleIndex`, `cycles`, `workouts`, `workouts.days`.
- `athlete.id` must be lowercase `firstname_lastname` (appears in the URL and localStorage).
- `currentCycleIndex` is 0-based. `0` means the athlete is on the first cycle in `cycles`.
- Every `days[]` entry must have a **unique numeric** `id` (1, 2, 3…).
- Every day must contain at least one `block`; every block must contain at least one `exercise`.
- `type` on every exercise must be exactly one of: `"simple"`, `"standard"`, `"circuit"`.
- Chip `style`, if used, must be exactly `"yellow"` or `"dark"` (or omitted).
- The `type` field decides what tools an exercise gets — no separate flags needed:
  - `"simple"` → just the row. No rest, no weight, no RPE, no note.
  - `"standard"` → always has rest timer + weight log + RPE selector + personal note.
  - `"circuit"` → always has rest timer at the end + one overall RPE + personal note. (No weight input — weights are written into the note, e.g. "KB 16, slam 6, box 50".)
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
    "firstName": "First",
    "lastName": "Last"
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
      "focuses": [
        "Focus statement for the next cycle."
      ],
      "teaser": {
        "subtitle": "One-line hook",
        "paragraphs": [
          "Paragraph teasing the next cycle.",
          "Final paragraph (auto-italicised when there is more than one)."
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

| Position | What the home screen shows |
|---|---|
| `i < currentCycleIndex` | A completed phase in the bottom "Remaining Phases" list (with ✓ DONE badge) |
| `i === currentCycleIndex` | The big blue "CURRENT CYCLE · NOW" card |
| `i === currentCycleIndex + 1` | The purple "COMING NEXT" teaser card |
| `i > currentCycleIndex + 1` | A locked phase in the bottom "Remaining Phases" list |

To advance the athlete to the next cycle, just **bump `currentCycleIndex` by 1**. Nothing else needs to change.

---

## Field Reference

### Top Level

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `athlete.id` | string | ✅ | Unique ID, used for localStorage. Format: `firstname_lastname` |
| `athlete.firstName` | string | ✅ | First name (white in hero) |
| `athlete.lastName` | string | ✅ | Last name (yellow accent in hero) |
| `sport.badge` | string | optional | Goal/purpose pill above name, e.g. `"🏋️ Tennis Performance"` |
| `currentCycleIndex` | number | ✅ | 0-based index into `cycles[]` |
| `cycles` | array | ✅ | All training cycles (can be 1, 5, 12 — any number) |
| `workouts` | object | ✅ | The training days for the current cycle |
| `programHistory` | array | optional | Archived past programs |
| `notes` | object | optional | Coaching notes (Notes tab) |

> **Note:** The coach line on the home screen ("Coach: Amir Ardekani") is hardcoded in `program.html` — it is no longer in JSON.

---

### `cycles[n]`

Each cycle describes one training phase.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `num` | number | ✅ | Cycle number (shown as the big faded number on the phase row) |
| `name` | string | ✅ | Phase name, e.g. `"Foundation Forge"` |
| `tagline` | string | optional | Short italic line under the name |
| `weeks` | string | optional | e.g. `"Weeks 1–5"` |
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
| `subtitle` | string | One-line hook |
| `paragraphs` | string[] | Body text. The last paragraph is auto-italicised when there is more than one. |

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
    "subtitle": "You've built the foundation. Now we load it.",
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
| `focusTag` | string | optional | Yellow badge at top of day |
| `completionTitle` | string | optional | Heading shown when day is finished |
| `completionMessage` | string | optional | Body text on completion |
| `blocks` | array | ✅ | List of training sections — any order, any count |

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
- An **RPE** selector for the whole circuit.
- A free-form **Note** row where the client can log weights, equipment, and how it felt (e.g. *"KB 16, slam 6, box 50, third round felt heavy"*).

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

| Style | Appearance | Use For |
|-------|-----------|---------|
| *(none)* | Grey pill | Default — sets, reps, tempo |
| `"yellow"` | Yellow pill | Priority items, primary sets |
| `"dark"` | Dark pill | Duration, equipment notes |

### Coaching Cues

Every exercise (including circuit sub-items) can have optional cues:

```json
"cues": {
  "good": ["What to do (shown with ✅)"],
  "bad":  ["What to avoid (shown with ❌)"]
}
```

Both arrays are optional. If omitted or empty, no cues section appears.

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
4. Send the athlete: `yoursite.github.io/program.html?client=new_athlete`

No HTML editing required.

### Advancing to the Next Cycle

1. **Move the previous `workouts` content into `programHistory`** (in the simplified `{label, focus, exercises[{name, detail}]}` shape).
2. **Replace `workouts.days`** with the new cycle's training days.
3. **Increment `currentCycleIndex` by 1.**
4. (Optional) Update `workouts.label`.

The home screen automatically re-derives current / next / completed / locked.

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
