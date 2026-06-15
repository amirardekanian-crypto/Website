---
name: workout
description: Turn Amir's workout content into a finished workout JSON file and add it to the app's Train library. Use when Amir pastes a workout or exercise list and asks to publish it, or says "add this workout to the app" / "make a library workout". Handles everything: exercise mapping, file creation, manifest registration, commit + push.
---

# Workout publisher — AA Performance Train library

Turn raw workout content into a published session in the Library → Train tab. The output is two file changes: a new `workouts/<category>/<slug>.json` and an updated entry in `workouts/index.json`, committed and pushed live.

## Step 0 — Required reading (every run)

1. **`SCHEMA.md` → "Library tab — Train section"** — exercise types (simple/standard/circuit), chip rules, manifest format, chip parsing.
2. **`Content/PRODUCT.md`** — what the product is and who it's for. Train workouts are shared across all athletes — they should be generally applicable to competitive tennis/padel players, not one athlete's specific programme.

## Step 1 — Understand what you've been given

Amir will either:
- **Paste a finished workout** — map it faithfully to the JSON structure. Don't rewrite the exercises or cues.
- **Give a topic or goal** — design the workout yourself. Grounded in S&C principles: appropriate exercise order (neural before metabolic, compound before isolation), sensible loading, useful cues.
- **Somewhere between** — treat his content as raw material.

Identify:
- **Category** — one of: `strength`, `conditioning`, `on-court`, `mobility`, `recovery`. Ask if genuinely unclear.
- **Slug** — short, lowercase, hyphenated, descriptive (e.g. `first-step-speed`, `upper-body-power`).
- **Title** — clean, descriptive (e.g. "First-Step Speed", "Upper Body Power").
- **Duration** — total session time as a string: `"25 min"`, `"45 min"`, `"12 min"`.
- **Equipment** — primary piece only: `"Barbell"`, `"Dumbbells"`, `"Bodyweight"`, `"Court"`, `"Foam Roller"`, `"Bike"`, `"Bands"`.
- **focusTag** — short descriptor for the session focus, e.g. `"Acceleration & Footwork"`, `"Full-Body Strength"`. This is displayed on the workout header screen.

## Step 2 — Map exercises to blocks and types

A workout is an array of `blocks`. Each block is a named section (e.g. "Warm-Up", "Strength", "Power", "Cool-Down") with an `icon` emoji and an `exercises` array.

### Block structure

```json
{
  "title": "Strength",
  "icon": "🏋️",
  "exercises": [ … ]
}
```

Common block names and icons:
| Block | Icon |
|---|---|
| Warm-Up / Movement Prep | 🔥 |
| Strength | 🏋️ |
| Power / Plyometrics | ⚡ |
| Speed / Acceleration | 🎾 |
| Conditioning | ❤️ |
| Activation | 🔥 |
| Footwork | 👟 |
| Mobility / Cool-Down | 🧘 |
| Foam Rolling | 🌀 |

---

### Exercise type: `"simple"` — plain row, no logging
Best for: warm-up drills, mobility movements, cool-down, time/distance entries that don't need weight or RPE logging.

```json
{
  "type": "simple",
  "name": "Easy Jog",
  "videoUrl": null,
  "chips": [{ "label": "5 min" }],
  "cues": {
    "good": ["Keep effort conversational"],
    "bad": ["Don't go hard — this is warm-up"]
  }
}
```

Chip rules for `simple`: use `"×N Reps"` / `"×N Each Side"` for reps, or a bare duration/distance (`"5 min"`, `"30s"`, `"20m"`). Optionally add `"RPE N"`. No set count chip.

---

### Exercise type: `"standard"` — loaded exercise with rest timer + logging
Best for: all strength exercises, single-exercise loaded rows, any set/rep work that should be logged.

```json
{
  "type": "standard",
  "name": "Back Squat",
  "videoUrl": null,
  "restSec": 180,
  "chips": [
    { "label": "4 Sets", "style": "yellow" },
    { "label": "×5 Reps" },
    { "label": "Tempo 3-0-1-0" },
    { "label": "RPE 8" }
  ],
  "cues": {
    "good": ["Push the floor away", "Brace through the whole set"],
    "bad": ["Knees caving in", "Chest collapsing forward"]
  }
}
```

Chip rules for `standard`:
- Set count: `"N Sets"` with `"style": "yellow"` — always first, always one per exercise
- Reps: `"×N Reps"`, `"×N Each Side"` — start with `×`
- Tempo: `"Tempo 3-0-1-0"` format
- RPE: `"RPE N"`
- Modifier (green pill, technique cue only): `"3s eccentric"`, `"max intent"`, `"pause at bottom"` — no rep counts in modifiers
- `restSec`: seconds of rest. Common values: 60, 90, 120, 150, 180, 240. Default is 120s if omitted.

---

### Exercise type: `"circuit"` — multiple sub-exercises as one checklist
Best for: conditioning circuits, activation circuits, mobility flows, combination drills.

```json
{
  "type": "circuit",
  "name": "Activation Circuit",
  "rounds": "3 Rounds",
  "restSec": 60,
  "items": [
    {
      "name": "Glute Bridge",
      "detail": "×12",
      "cues": {
        "good": ["Drive the hips up and squeeze at the top"],
        "bad": ["Arching the lower back"]
      }
    },
    {
      "name": "Band Pull-Apart",
      "detail": "×15",
      "cues": {
        "good": ["Pull to chest height, squeeze the shoulder blades"],
        "bad": ["Letting the arms drop below shoulder height"]
      }
    }
  ]
}
```

`rounds` is a display string: `"3 Rounds"`, `"4 Rounds"`. `restSec` is the rest after the full round (default 60s). Sub-items have `name`, `detail` (reps/duration as a string), and optional `cues`.

---

### `videoUrl`
Any exercise can have `"videoUrl": "https://..."` for a demo video. Set to `null` if no video — the app auto-resolves from `exercise_library.json` by exercise name.

---

### Coaching cues
Every exercise (and circuit sub-item) supports `cues.good[]` and `cues.bad[]`. Both are optional. Write them as short, specific, actionable coaching points — not generic advice.

- `good` → what to do / what to feel (shown with ✅)
- `bad` → what to avoid (shown with ❌)

2 good + 1 bad is a good default. Don't write more than 3 per array.

---

## Step 3 — Write the workout JSON

Create **`workouts/<category-id>/<slug>.json`**:

```json
{
  "id": "<slug>",
  "title": "<Title>",
  "category": "<category-id>",
  "duration": "<N min>",
  "equipment": "<Primary equipment>",
  "focusTag": "<Short focus descriptor>",
  "blocks": [ … ]
}
```

## Step 4 — Register in the manifest

Read `workouts/index.json`, find the right category by `id`, and add to its `workouts` array:

```json
{
  "id": "<slug>",
  "title": "<Title>",
  "duration": "<N min>",
  "equipment": "<Primary equipment>",
  "file": "workouts/<category-id>/<slug>.json"
}
```

The `title`, `duration`, and `equipment` in the manifest must **exactly match** the workout file — these are what show on the list card before the file is opened.

If the category doesn't exist in the manifest, add it with the right `banner` image and an empty `workouts` array. Banner images follow the pattern `assets/img/workouts/<category>.webp`.

## Step 5 — Verify the JSON is valid

Before committing:
- Valid JSON (no trailing commas, no comments in the output)
- `id` in the workout file matches the slug in the manifest `file` path
- `file` path in the manifest exactly matches the file you created
- Every `standard` exercise has exactly one `"N Sets"` chip with `"style": "yellow"`
- No rep counts in modifier (green) chips — those are technique cues only
- Circuit `items` have `name` and `detail`, not `chips`

## Step 6 — Commit and push

```
git add workouts/<category>/<slug>.json workouts/index.json
git commit -m "Add workout: <Title> (<Category>)"
git push
```

Then tell Amir:
- The workout URL: `program.html?workout=<slug>` (shareable, works without login)
- Which category it appears in the Train list
- Duration and equipment

## Category guide

| ID | Display name | What belongs here |
|---|---|---|
| `strength` | Strength | Barbell/dumbbell strength sessions, hypertrophy, loaded movements |
| `conditioning` | Conditioning | Aerobic engine work, HIIT, intervals, metabolic conditioning |
| `on-court` | On-Court | Tennis/padel-specific — footwork, speed, agility, warm-ups, on-court drills |
| `mobility` | Mobility | Mobility flows, flexibility, joint prep, movement quality |
| `recovery` | Recovery | Foam rolling, light active recovery, breathing, parasympathetic work |

## Exercise ordering within a block

Standard S&C order — don't deviate without a reason:
1. Neural / explosive (jumps, medicine ball, sprints) — when nervous system is fresh
2. Compound strength (squat, hinge, press, row)
3. Accessory / isolation
4. Conditioning / metabolic (if in same session)
5. Cool-down / mobility

Within a block, more demanding exercises come first.
