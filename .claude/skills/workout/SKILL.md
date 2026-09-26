---
name: workout
description: Turn Amir's workout content into a finished workout JSON file and add it to the app's Train library. Use when Amir pastes a workout or exercise list and asks to publish it, or says "add this workout to the app" / "make a library workout". Handles everything: exercise mapping, file creation, manifest registration, commit + push.
---

# Workout publisher — AA Performance Train library

Turn raw workout content into a published session in the Library → Train tab. The output is two file changes: a new `workouts/<category>/<slug>.json` and an updated entry in `workouts/index.json`, committed and pushed live.

## Step 0 — Required reading (every run)

1. **`SCHEMA.md` → "Library tab — Train section"** and **"`rx` — the prescription"** — exercise types (simple/standard/circuit), how a dose is written, manifest format.
2. **`Content/PRODUCT.md`** — what the product is and who it's for. Train workouts are shared across all athletes — they should be generally applicable to competitive tennis/padel players, not one athlete's specific programme.

## Step 1 — Understand what you've been given

Amir will either:
- **Paste a finished workout** — map it faithfully to the JSON structure. Don't rewrite the exercises or cues.
- **Give a topic or goal** — design the workout yourself. Grounded in S&C principles: appropriate exercise order (neural before metabolic, compound before isolation), sensible loading, useful cues.
- **Somewhere between** — treat his content as raw material.

Identify:
- **Category** — one of: `strength`, `conditioning`, `on-court`, `mobility`, `recovery`. Ask if genuinely unclear.
- **Slug** — short, lowercase, hyphenated, descriptive (e.g. `first-step-speed`, `upper-body-power`). The slug is permanent (it's the shareable URL), so it can stay literal even when the title is punchy.
- **Title** — make it **cool, punchy, and evocative** — this is marketing copy on the card, not a file label. It should still telegraph the focus (body part, vibe, or setting). **Amir hates flat, literal names** like "Bodyweight & Band Strength" or "Lower Body Workout" — never ship those. Aim for 2–3 words with energy: "Banded Lower Burner", "First-Step Speed", "Engine Builder", "Living Room Legs". The literal description belongs in the `focusTag`, not the title. **When in doubt, offer Amir 3–4 name options and let him pick** rather than guessing.
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
  "exId": "easy-jog",
  "rx": { "time": "5 min" }
}
```

No `cues` on a new session's exercises: each shows its Spine entry's three (CUE-1, CUE-2).

**`rx` is the prescription, and the only rule is: write what you prescribed, omit what you
did not.** An absent field means *not prescribed*, and the app draws no cell for it. (Before
2026-09-20 this was `chips[]` — free-text labels the app pattern-matched back into numbers —
and the library alone rendered **1,151 em-dashes**, with 237 of 352 exercises showing a
five-cell grid that was four-fifths empty. See SCHEMA.md → "`rx` — the prescription".)

For a `simple` item: a dose and nothing else. `{ "reps": 6, "side": true }`,
`{ "time": "5 min" }`, `{ "distance": "20m" }`. **No `rpe`, no `tempo`, no `rest`** on a
warm-up — with only a dose the app drops the grid entirely and renders the item as a name and
a number on one line, which is what a warm-up should look like.

| Instead of the old… | write |
|---|---|
| `{ "label": "×6 Each Side" }` | `"rx": { "reps": 6, "side": true }` |
| `{ "label": "45 sec / side" }` | `"rx": { "time": "45s", "side": true }` |
| `{ "label": "×20 m" }` | `"rx": { "distance": "20m" }` |
| `{ "label": "5 min" }` | `"rx": { "time": "5 min" }` |

Side/leg/arm is **its own field** now (`"side": true`), never baked into the number — that
trap (a separate `"Each Side"` chip becoming a green pill with an empty REPS cell) cannot
happen any more. Nor can a distance be read as minutes: `20m` is a `distance`, `20 min` is a
`time`, and they are different keys rather than the same string parsed two ways.

---

### Exercise type: `"standard"` — loaded exercise with rest timer + logging
Best for: all strength exercises, single-exercise loaded rows, any set/rep work that should be logged.

```json
{
  "type": "standard",
  "name": "Barbell Back Squat",
  "exId": "barbell-back-squat",
  "rx": { "sets": 4, "reps": 5, "rpe": 8, "tempo": "3-0-1-0", "rest": 180 }
}
```

`rx` keys for `standard`: `sets` · one of `reps`/`time`/`distance`/`work` · `side` · `rpe`
(6–10) · `tempo` (`"3-0-1-0"` or `"iso"`) · `rest` (seconds). Reps are **one number, never a
range** (Amir, 2026-09-24).

⚠ **`rest` is not defaulted any more.** Omit it and the card shows no rest cell; the timer
button is still there, labelled *Rest timer*. It used to fall back to 120s, which is how the
demo ended up claiming "REST 2m" on all 26 cards while every rest in it was actually unset.

**When a whole block shares one rest, put it on the block** — `{"title":"Strength","rest":120}`.
It renders once on the section header and feeds every timer in it; `rx.rest` on an exercise
overrides it. **The tempo is one cell** — `TEMPO 3-1-1-0`, with the digits that carry the
instruction drawn in clay (the slowest phase when it is 2s or more, plus any non-zero pause).
`"iso"` reads `Hold`. Nothing to author beyond `rx.tempo` itself.

**Three fields beside `rx`, three different jobs — this is what stopped the pill row being a
junk drawer of 121 labels:**

| Field | What it is | How it draws |
|---|---|---|
| `setup` | **Don't use it** (Amir, 2026-09-25: *"i dont like floating text"*). A detail like `"In 4, out 8"` or `"alternate sides"` goes in the `note`; a grip is the `intent` pill | quiet grey line under the name |
| `intent` | a **grip** (`"neutral grip"`) or **ONE** intention (`"max intent"`, `"max speed"`); both join in the one pill: `"neutral grip · max intent"` | the green pill (the only pill) |
| `cues` | **don't write them**: the exercise's Spine entry supplies its three (the 42 older sessions keep theirs) | the cues list |

**Never restate the tempo in `intent` — or in a cue.** The card already shows `rx.tempo` with
its key digits in clay, so `"3s eccentric"` as a pill, or "three seconds down, one second
pause" as a cue, is the same instruction a second and third time. Spend the cue on what the
numbers cannot say.

**Potentiate / power blocks** (CMJ, pogos, sprints, med-ball) use `type: "standard"` — not `"simple"` — so they get a rest timer. Use `intent` to communicate the movement intention:

| Movement type | `intent` |
|---|---|
| Ankle pogos, fast hops | `"fast turnover"` |
| CMJ, box jumps, bounding | `"max intent"` |
| Short sprints, accelerations | `"max speed"` |
| Med-ball throws | `"max power"` |

**How the card draws it:** the grid is as wide as the prescription — two facts, two cells —
and stat pills collapse into it when the card is expanded. The `intent` pill stays visible
either way, so only put something there worth seeing every single time.

---

### Exercise type: `"circuit"` — multiple sub-exercises as one checklist
Best for: conditioning circuits, activation circuits, mobility flows, combination drills.

```json
{
  "type": "circuit",
  "name": "Activation Circuit",
  "rx": { "rounds": 3, "rest": 60 },
  "items": [
    { "name": "Glute Bridge", "exId": "glute-bridge", "rx": { "reps": 12 } },
    { "name": "Band Pull-Apart", "exId": "band-pull-apart", "rx": { "reps": 15 } }
  ]
}
```

`rx.rounds` is a **number** (the old `"rounds": "3 Rounds"` string is still read, never written) and
`rx.rest` the rest after the full round (60s when you give none). Each item carries `name`, `exId`
and its own `rx`, or a free-text `detail` when the wording says more than a number (*"15 sec,
switch legs each round"*). No `cues` on items either.

---

### `videoUrl`
Leave it out: the app plays the exercise's Spine entry's video (by `exId`, then name; videos are added in coach.html → Exercises). A `"videoUrl": "https://..."` on the exercise overrides that.

---

### Coaching cues
⚠️ **Since 2026-09-24 the cues come from the Spine** (Amir: *"the aim is to use these cues for
all the exercises that everyone has from now on"*). A new library workout writes **no `cues`**:
every card and circuit item shows its exercise's approved Spine entry (`public.exercises`). Before
publishing, check every name resolves to an **approved** entry with cues; a name with no entry gets
one drafted with `/spine`, and Amir approves it in coach.html → Exercises. When Amir pastes a
workout with his own cues, compare them with the entry's: a better general cue is a change to the
entry (tell him), a point about this one session goes in `note`. Workouts already in the library
keep the cues they carry.

The shape, for reference (it is what a Spine entry holds): `cues.good[]` and `cues.bad[]`.

**At the end, run `/spine` → Upkeep** on the workout's exercises, the same as after a programme:
draft what is missing, fill empty fields (qualities included, or the day's quality chips go blank, and body parts: `loads` + `impact`), propose changes to approved entries.

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
  "countsAs": "strength | mobility | breathe | none",
  "duration": "<N min>",
  "equipment": "<Primary equipment>",
  "focusTag": "<Short focus descriptor>",
  "intro": ["<why this session exists>", "<how it runs, kit, timing>"],
  "before": [
    { "label": "Not today", "text": "<who should not do it today>" },
    { "label": "Stop now", "text": "<the red flag that ends the session>" }
  ],
  "blocks": [ … ]
}
```

### ⚠️ Four places to coach, and they must not repeat each other

Amir's correction, 2026-09-12, after every AI-written session in the library got
this wrong: *"you are coaching in the Coach's Note and on the cues, that's too
much."*

| | Job | Length |
|---|---|---|
| **`before`** | What to stop for: who it is not for today, the red flags, spacing, the first-time dose | rows of `{label, text}`, **50–210 words** in all |
| **`intro`** | Why this session exists, how it runs, kit and timing | **1–2 paragraphs, about 100–150 words** |
| **`note`** | One thing about *this exercise* the cues cannot carry | **ONE SENTENCE** |
| **`cues`** | How to do the rep. **Comes from the Spine now, not written here** | **EXACTLY 3**, on the entry |

**Cues: exactly three. One external, one internal, one avoid.** External +
internal go in `cues.good[]`, the avoid cue in `cues.bad[]` — so `good` has 2
entries and `bad` has 1, on every exercise, **including every item inside a
circuit**. This is CUE-1, not a library-only rule: never more, never fewer.

**Do not write a `note` on most exercises.** Neither workout Amir authored
himself uses one at all. A note is for a caveat the cues cannot hold — a
regression ("start on your knees"), a timing rule ("leave this one for an hour
after you wake up"), a safety line. It is **not** where you explain why the
session is built the way it is. That is `intro`, and giving the reasoning its own
home is exactly what lets a note stay to one sentence.

**`before` is the safety card and `intro` is not.** The app draws `before` as a white "Before you start" card
that no toggle can hide, while *Why this session* is one preference shared by every workout and starts closed
once it passes 100 words. Measured 2026-09-20 on a phone: a 300-word intro put the first exercise about 1,200 px
down, and one athlete closing the toggle once hid every session's "stop if…" for good. So: anything that keeps
someone safe (not today, red flags, "get it checked", spacing from a match or another hard session, the
first-time dose) goes in `before`, once, and the intro never repeats it. All 42 library sessions have the card
(the 22 older ones got theirs on 2026-09-20, written from what each session asks of the body, since their intros
said almost nothing about safety). Any session with real load or speed in it needs the card; a plain mobility flow
needs only the rows that apply, and even a breathing session earns one row (Lights Out has a single one).
One to eight rows, 30 to 210 words, plain English, no em-dashes.

**Standard rows: copy these word for word, so one warning reads the same on every session.** All but the last are the
wording the coaches' panel reviewed on the 20 new sessions. *Lightheaded* was written for the breath sessions on
2026-09-20 and has not been through a panel. Write new wording only for what a session has that these do not
(a rack, a band, breath holds).

| Label | Wording | Use on |
|---|---|---|
| Not today | A sore ankle, knee, calf, hamstring, groin or Achilles, or an injury in the last month? Get it looked at first. | court, jumps, sprints, lower-body work (swap the joints to fit: hip, lower back, shoulder, wrist) |
| Stop and get it checked | A sharp pain, pain that spreads, numbness, swelling, a joint that gives way, or a sudden pull or pop. | anything loaded or fast |
| Stop now | Chest pain, dizziness, a heartbeat that races or skips, or breathing that doesn't feel right. Get it looked at before you train again. Told to be careful with hard exercise? Check with your doctor first. | anything that raises the heart rate |
| A day or two later | Far more sore than normal, or your pee goes dark? Get it checked the same day. | heavy, eccentric or new work |
| Keep clear | 48 hours away from another hard session, and not the day before a match. | hard sessions (tissue cost, not a weekly count) |
| Back red flags | Pain down a leg, numbness, weakness in a leg or foot, or numbness between your legs. If your bladder or bowel control changes, get seen the same day. | anything that loads or turns the spine |
| While you train | A bit of ache is fine. Sharp pain isn't, and neither is pain that builds through a set or feels worse the next morning. If it builds, stop that exercise. If it's sharp, stop the session. | Care sessions |
| Never roll | Your lower back, the front or side of your neck, the back of your knee, the inside of your elbow, your armpit or right into the groin crease. Nothing that's swollen, hot, bruised or freshly hurt. | any foam roller or ball session |
| Swollen calf | If one calf is swollen, warm or tender and you didn't strain it playing, see a doctor the same day. | any session that stretches or rolls the calf |
| Lightheaded | Dizzy, or pins and needles in your hands or face? Stop counting and breathe normally. Never do breath holds in water or while driving. | box breathing and any breath hold |

**Check before publishing:** every exercise resolves to an approved Spine entry with cues (a new
session writes no `cues`), every note one sentence, `intro` present and about 100–150 words, `before` present with no warning also repeated in the intro.

### ⚠️ `countsAs` is required — decide it, don't omit it

An athlete can press **Mark as done** at the foot of a library workout, and this
field is the only thing that decides which habit that ticks in AA Proof:

| `countsAs` | Ticks | Use it for |
|---|---|---|
| `"strength"` | the **WORKOUT** habit | a real session — strength, conditioning, on-court speed. Roughly 25 min and up |
| `"mobility"` | the **MOBILITY** habit | a mobility flow or a physical recovery session. Roughly 10–20 min |
| `"breathe"` | the **BREATHE** habit | anything in the **Breath** category — breath work with easy movement around it |
| `"none"` | nothing | a **warm-up**. It is part of a session, not a session |

⚠️ MOBILITY and BREATHE are **add-on** habits and add-ons start OFF, so for most
athletes these tick nothing until they opt in. That is handled — `renderLibOffer()`
in `habits.html` offers to switch the habit on for three days after a session that
earned it. Nothing for you to do here, but do not "fix" it by marking a breath
session `"strength"` to make it pay.

**Leave it out and the workout counts for nothing.** The server whitelists this
value and falls through to "counts for nothing" on anything it does not
recognise — deliberately, so a new workout can never inflate a score by
accident. Safe, but silent: the athlete presses Done, is told it does not tick a
habit, and nobody finds out it was an oversight rather than a decision.

**Do not pick it from the category.** The split is not the categories:
`on-court` holds both a 25-minute speed session (`strength`) and a 15-minute
warm-up (`none`), and `conditioning` holds both an engine session (`strength`)
and a run warm-up (`none`). Ask what the thing *is*.

And be strict about `"strength"`. The WORKOUT habit is **28.6% of the day
score** in Proof, so marking a 12-minute foam roll as `strength` hands every
athlete a daily route to the biggest habit on the list without training. When
you are torn between `strength` and `mobility`, pick `mobility`.

Full reasoning: `supabase/stage28_library_sessions.sql`.

## Step 4 — ⚠️ The database is the library, not the files

**`program.html` reads the library from Supabase — `get_library()` — and the JSON
files are only an offline fallback.** The row lives in `public.library`, one per
session, and its `slug` is **`workouts/<category-id>/<slug>`**.

This is the step that makes a session exist. Writing the file and pushing it does
**not** put the workout in the app. Two consequences:

- **A session only appears once Amir publishes it** (Step 7). Never tell him a
  workout is live off a `git push` alone — it isn't.
- **Moving a session between categories is a database write**, because the category
  is baked into the slug. The file move and the manifest edit are the easy half.
  Check `public.library_sessions` first: if an athlete has logged that session, the
  old slug is what the log holds. (It was empty when Racket Arm moved to Care on
  2026-09-19, so nothing was orphaned — don't assume that stays true.)

The category must already exist in `public.library_categories`. The seven that do:
`strength` · `conditioning` · `on-court` · `mobility` · `recovery` · `breath` ·
`care`. Their banners are `assets/art/library/sessions-<id>-v1.webp`.

## Step 5 — Keep the fallback manifest in step

Read `workouts/index.json`, find the right category by `id`, and add to its
`workouts` array:

```json
{
  "id": "<slug>",
  "title": "<Title>",
  "duration": "<N min>",
  "equipment": "<Primary equipment>",
  "file": "workouts/<category-id>/<slug>.json"
}
```

The `title`, `duration`, and `equipment` here must **exactly match** the workout
file. This copy is what serves an athlete whose Supabase call fails, so a stale
entry is a session that reads wrong offline and right online.

## Step 6 — Verify the JSON is valid

Before committing:
- Valid JSON (no trailing commas, no comments in the output)
- `id` in the workout file matches the slug in the manifest `file` path
- If you rename a live card, grep `workouts/` for the old title first. Sessions point at each other by title
  (currently Steady Spine, Racket Arm, Cut & Recover, Engine Builder, Daily Mobility Flow), and a stale title
  sends an athlete to a card that no longer exists
- `category` in the workout file matches the folder it sits in — **the publish
  picker reads the shelf off this field, not off the path**
- `file` path in the manifest exactly matches the file you created
- Every `standard` exercise has `rx.sets` and exactly one dose
  (`reps` / `time` / `distance` / `work`)
- No dose hiding in `intent`, and no `setup` at all — `intent` is a grip or ONE intention, any other
  detail is the `note` (Amir, 2026-09-25: a grip is a chip, never free text; no floating text)
- No `chips[]` anywhere, and no `chips` left beside an `rx`
- Circuits use `rx.rounds` (a NUMBER) and `rx.rest`; items take their own `rx` when the dose is
  plain and keep free-text `detail` only when the wording says more than a number
- **`node scripts/check_rx.js` passes** — it audits every `rx` in the library and is in the
  pre-commit hook anyway
- Every exercise resolves to an approved Spine entry (no `cues` on a new session), every `note` one
  sentence, `intro` present (about 100–150 words)
- `before` present on anything with load or speed, and no warning repeated between it and the intro
- `countsAs` is set deliberately

Then commit:

```
git add workouts/<category>/<slug>.json workouts/index.json
git commit -m "Add workout: <Title> (<Category>)"
git push
```

## Step 7 — Hand it to Amir to publish

The publish step is **his**, in the browser, and it is not optional:

> **coach.html → Library → `+ Publish workout`**, pick the JSON file(s).

The picker is **multi-select**, so a batch of sessions publishes in one pass —
write them all, then send him one instruction. It validates `id` and `category`,
refuses a category that doesn't exist, shows him the titles, and upserts on `slug`,
so re-publishing an edited file updates the existing row rather than duplicating it.

⚠️ It does **not** set `sort_order`. The column defaults to NULL, and `get_library()` orders a shelf by
`coalesce(sort_order, 2147483647), slug` — so a new session sorts **after everything already on the
shelf, alphabetically by slug**, not in the order you wrote them. If the order matters, set it in SQL
afterwards: `update public.library set sort_order = N where slug = 'workouts/<cat>/<slug>';`
(Existing rows hold 0, 1, 2… so the next free number is one past the shelf's last.)

**When Amir says "ship it", Claude can publish the rows itself** instead of handing him the picker. Through the Supabase
MCP, one shelf per call:

```sql
insert into public.library (slug, kind, category_id, data, published, sort_order) values
  ('workouts/<cat>/<id>','workout','<cat>',$wk${…minified file…}$wk$::jsonb,true,<n>), …
on conflict (slug) do update set data = excluded.data, category_id = excluded.category_id,
  published = true, sort_order = excluded.sort_order
returning slug, sort_order, md5(data::text) as md5;
```

Set `sort_order` in the same statement (existing rows hold 0, 1, 2… so use one past the shelf's last). Then **prove every row
landed intact**, because the payload is pasted by hand: `md5(data::text)` is the md5 of the jsonb *text form*, which Python can
reproduce exactly (object keys ordered by byte length then bytes, `", "` and `": "` separators, strings from
`json.dumps(ensure_ascii=False)`). Compute the expected md5 for each file locally, send them back as a `values` list and compare
in SQL in one query. A mismatch means the paste drifted from the file. Done on 2026-09-20 for 20 new rows; the same function
reproduced four live rows first, which is what makes the check trustworthy.

Then tell Amir:
- **That he needs to publish it**, and where
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
