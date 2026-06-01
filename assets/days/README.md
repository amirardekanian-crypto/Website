# Day-card images

The home overview ("This Week") day cards pull their banner image from a small
**category pool** in this folder. Upload these 8 files once and every day of
every athlete is covered automatically — the app picks one per day by scanning
the day's title/focus for keywords (see `dayImageCategory()` in `program.html`).

## Files (exact names)

| File | Used when the day's name/focus mentions… |
|------|------|
| `lower.jpg`        | leg, squat, hinge, glute, deadlift, lunge, knee, hamstring, quad, calf |
| `upper.jpg`        | push, pull, press, shoulder, chest, back, arm, bench, row |
| `power.jpg`        | power, plyo, explosive, speed, jump, sprint, rotational, med-ball, throw |
| `conditioning.jpg` | cardio, engine, aerobic, hiit, metcon, interval, endurance |
| `core.jpg`         | core, abs, trunk, anti-rotation, plank, brace |
| `recovery.jpg`     | recovery, mobility, deload, rest, stretch, flexibility |
| `fullbody.jpg`     | full-body, total-body, whole-body |
| `default.jpg`      | fallback for anything else |

## Spec

- **Dimensions:** 1600 × 640 px (5:2)
- **Format:** `.jpg` preferred (`.webp` / `.png` / `.jpeg` also auto-detected)
- **Size:** ≤ ~250 KB each (decorative)
- **Legibility:** keep the **bottom ~40%** and **left ~55%** dark/uncluttered —
  white "Day N / name / blocks·movements" text overlays that zone.

## Per-day override (optional)

To give one specific day its own photo, drop a file named after the day's title,
slugified — e.g. "Squat & Glute Activation" → `squat-glute-activation.jpg`. It
wins over the category image. Missing files fall back to the green gradient.
