# S&C Program Platform — JSON Schema Guide

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

## JSON Structure

```
{
  athlete        → identity
  coach          → your details
  sport          → badge displayed on home screen
  currentProgram → the active training block
    └─ days[]
        └─ blocks[]        ← FLEXIBLE: any order, any type
            └─ exercises[]  ← simple | circuit | standard
  programHistory → archived completed programs
  notes          → expandable coaching notes
}
```

---

## Field Reference

### Top Level

| Field | Type | Description |
|-------|------|-------------|
| `athlete.id` | string | Unique ID, used for localStorage keys. Format: `firstname_lastname` |
| `athlete.firstName` | string | First name (displayed large on hero) |
| `athlete.lastName` | string | Last name (displayed in accent colour) |
| `coach.name` | string | Coach full name |
| `sport.badge` | string | Badge text on home screen, e.g. `"🏋️ Tennis Performance"` |

### `currentProgram`

| Field | Type | Description |
|-------|------|-------------|
| `number` | number | Program number (e.g. 2) |
| `eyebrow` | string | Small text above title, e.g. `"Program 02 · Month Two"` |
| `month` | string | Displayed in hero meta, e.g. `"Month 2"` |
| `focus` | string | Training focus, e.g. `"Strength / Power / Speed"` |
| `days` | array | Training days — can be any count (2, 3, 4, 5, 6...) |

### `days[n]`

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | Day number (1, 2, 3...) — used for tab labels |
| `focusTag` | string | Yellow badge at top of day, e.g. `"Squat & Glute Activation"` |
| `completionTitle` | string | Shown when day is finished |
| `completionMessage` | string | Motivational message on completion |
| `blocks` | array | **FLEXIBLE** list of training sections — any order |

### `blocks[n]` — Training Section

Each block is a section header + exercises. Blocks can appear in any order, and a day can have any number of blocks.

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Section label, e.g. `"Warm-Up"`, `"Plyometrics"`, `"Conditioning"` |
| `icon` | string | Emoji icon for the section |
| `exercises` | array | Exercises within this block |

### Exercise Types

#### `type: "simple"` — No rest timer, no weight log
Best for: warm-ups, cool-downs, single-item entries.

```json
{
  "type": "simple",
  "name": "Bike",
  "videoUrl": "https://www.youtube.com/watch?v=example",  // optional
  "chips": [{ "label": "5 minutes", "style": "dark" }],
  "cues": {
    "good": ["Steady pace"],
    "bad": ["Don't go all-out"]
  }
}
```

#### `type: "circuit"` — Multiple sub-exercises as one checklist item
Best for: mobility circuits, activation circuits, warm-up complexes.

```json
{
  "type": "circuit",
  "name": "Dynamic Mobility",
  "videoUrl": "https://www.youtube.com/watch?v=example",  // optional
  "rounds": "×3 Rounds",
  "items": [
    {
      "name": "90/90 Hip Rotations",
      "detail": "×12",
      "cues": { "good": ["..."], "bad": ["..."] }
    }
  ]
}
```

#### `type: "standard"` — Full exercise with rest timer, weight log, RPE
Best for: all loaded exercises (strength, plyos, power, accessories).

```json
{
  "type": "standard",
  "name": "Back Squat",
  "videoUrl": "https://www.youtube.com/watch?v=example",  // optional
  "hasRest": true,
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

### `videoUrl` — Optional Exercise Video

Any exercise (of any type) can include an optional `videoUrl` field containing a YouTube URL. When present, a play button renders next to the exercise name. When omitted, nothing appears.

```json
{
  "type": "standard",
  "name": "Back Squat",
  "videoUrl": "https://www.youtube.com/watch?v=example",
  "hasRest": true,
  "chips": [...]
}
```

Works the same way on all three exercise types:

```json
{ "type": "simple",   "name": "Bike",             "videoUrl": "https://www.youtube.com/watch?v=example", ... }
{ "type": "circuit",  "name": "Dynamic Mobility",  "videoUrl": "https://www.youtube.com/watch?v=example", ... }
{ "type": "standard", "name": "Back Squat",         "videoUrl": "https://www.youtube.com/watch?v=example", ... }
```

If `videoUrl` is absent or `null`, no button is rendered.

---

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

## Workflow: Adding a New Athlete

1. Copy any existing JSON file (e.g. `john_doe.json`)
2. Rename to `new_athlete.json`
3. Update all fields
4. Send the athlete: `yoursite.github.io/program.html?client=new_athlete`

No HTML editing required.

## Workflow: New Program Month

1. Move current program data into `programHistory` (simplified format)
2. Update `currentProgram` with new days/blocks/exercises
3. Increment `number`, update `eyebrow`, `month`, `focus`

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
