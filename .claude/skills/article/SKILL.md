---
name: article
description: Turn Amir's raw article text into a finished blog JSON file and add it to the app's Read library. Use when Amir pastes article copy and asks to publish it, or says "write a blog about…" / "add this to the app". Handles everything: block mapping, file creation, manifest registration, commit + push.
---

# Article publisher — AA Performance Read library

Turn raw text into a published article in the Library → Read tab. The output is two file changes: a new `articles/<category>/<slug>.json` and an updated entry in `articles/index.json`, committed and pushed live.

## Step 0 — Required reading (every run)

1. **`SCHEMA.md` → "Library tab — Read section"** — block types, manifest format, icon keys, category list.
2. **`Content/PRODUCT.md`** — what the product is, who the audience is, what the voice sounds like. Articles are in English, sharp and evidence-based (same voice as the English website, not the Farsi IG content).

## Step 1 — Understand what you've been given

Amir will either:
- **Paste finished copy** — your job is to map it faithfully to blocks, not rewrite it. Clean up formatting only.
- **Give a topic or outline** — write the article yourself. Use his coaching voice: direct, no fluff, grounded in physiology. Short paragraphs. No hedging. Make claims and back them up.
- **Somewhere between** — treat his text as raw material, tighten where needed, keep his meaning and any specific numbers/names.

Identify:
- **Category** — one of: `for-coaches`, `pre-competition`, `recovery`, `mental`, `nutrition`, `supplements`. Ask if genuinely unclear.
- **Slug** — short, lowercase, hyphenated, descriptive (e.g. `pre-session-warm-up`, `zone-2-for-tennis`).
- **Title** — clean, confident, no clickbait. The **last word gets a clay highlight** in the hero — pick a title where the last word lands well visually (a strong noun or verb, not "a" or "the").
- **Read time** — roughly 200 words per minute. Round to nearest minute.

## Step 2 — Map the text to blocks

Every article is an array of `blocks`. Map the text in order:

### `p` — paragraph
Plain prose. The **first `p` block** gets a large clay drop-cap on its first letter automatically — open with a punchy sentence whose first letter reads well large (M, T, W, H, A all look strong; avoid I, a, or punctuation).

```json
{ "type": "p", "text": "Most players jog a lap and call it a warm-up." }
```

### `h` — section heading
Used for major topic shifts. **Do not number them** — the app auto-adds §01, §02… Keep headings short and active. Every `h` gets a leading clay dash automatically.

```json
{ "type": "h", "text": "Why warming up matters" }
```

### `list` — bullet list
For 3+ parallel items. Each item gets a clay tennis-ball bullet. Keep items parallel in structure. Not for steps — use callouts for steps.

```json
{ "type": "list", "items": ["Point one", "Point two", "Point three"] }
```

### `callout` — labelled box
Clay-tinted box with a short label badge at the top. Use for:
- **Rules / key principles** — label: `"Rule"`, `"Key"`, `"Remember"`
- **Steps in a sequence** — label: `"Step 1 — Raise"`, `"Step 2 — Mobilise"` etc.
- **Named protocols** — label: the protocol name
- **Warnings / watch-outs** — label: `"Watch Out"`, `"Avoid"`

Keep `label` short (1–4 words). The `text` can be a full paragraph.

```json
{ "type": "callout", "label": "Rule", "text": "Move, don't hold. Everything in your warm-up should be moving." }
```

### `img` — image
Only use if Amir provides an image path or asks for one. Caption is optional.

```json
{ "type": "img", "src": "assets/img/example.webp", "caption": "Optional caption text." }
```

### `workout` — embedded workout card
Links to an existing workout in the Train library. Only use if a matching workout exists in `workouts/index.json`. Tapping opens the full workout session.

```json
{ "type": "workout", "file": "workouts/on-court/tennis-warm-up-routine.json", "label": "Tennis Warm-Up Routine", "meta": "12–15 min · Bodyweight · On-Court" }
```

## Step 3 — Write the article JSON

Create **`articles/<category-id>/<slug>.json`**:

```json
{
  "id": "<slug>",
  "title": "<Title>",
  "category": "<Category display name>",
  "readMins": <number>,
  "date": "<Month YYYY>",
  "blocks": [ … ]
}
```

`category` is the display name (e.g. `"For Coaches"`), not the ID (e.g. `"for-coaches"`).

## Step 4 — Register in the manifest

Read `articles/index.json`, find the right category by `id`, and add to its `articles` array:

```json
{
  "id": "<slug>",
  "title": "<Title>",
  "category": "<Category display name>",
  "readMins": <number>,
  "file": "articles/<category-id>/<slug>.json"
}
```

If the category doesn't exist yet, add it with the right `icon` key (see SCHEMA.md → current category table) and an empty `articles` array, then add the entry.

## Step 5 — Verify the JSON is valid

Before committing:
- Valid JSON (no trailing commas, no comments)
- `id` in the article file matches the slug used in the manifest `file` path
- `file` path in the manifest exactly matches the file you created
- `category` display name is consistent between article file and manifest entry

## Step 6 — Commit and push

Stage both files and commit:

```
git add articles/<category>/<slug>.json articles/index.json
git commit -m "Add article: <Title> (<Category>)"
git push
```

Then tell Amir:
- The article URL: `program.html?article=<slug>` (shareable, works without login)
- Which category it appears in
- The read time

## Block sequencing rules

Good articles follow this rhythm — adapt freely, but don't over-structure:

| Opening | 2–3 `p` blocks. Hook → tension → what this article solves. First `p` = drop-cap. |
|---|---|
| Body sections | `h` → supporting `p` → `list` or `callout` as needed. One idea per section. |
| Callout placement | At the end of a section to crystallise the point, or as a step sequence. |
| Closing | One final `h` + a `callout` with label `"Rule"` or `"Key"` works well as a payoff beat. |

## Writing standards (when writing the article yourself)

- **Direct.** State the claim, then back it up. Not: "It might be worth considering…" — Yes: "Stop holding stretches before training."
- **Short paragraphs.** 2–4 sentences max. One idea per paragraph.
- **Evidence-based.** Any percentage, study result, or physiological claim must be accurate. If unsure, soften to a defensible round figure or flag it.
- **No hedging.** No "arguably", "some might say", "in some cases". Be a coach, not a committee.
- **English only.** The Read library is for the English-language app experience.

## Category guide

| ID | Display name | What belongs here |
|---|---|---|
| `for-coaches` | For Coaches | Session structure, group warm-up protocols, periodisation, coaching communication |
| `pre-competition` | Pre-Competition | Match-day prep, warm-up science, tapering, mental readiness |
| `recovery` | Recovery | Sleep, nutrition timing post-session, active recovery, HRV |
| `mental` | Mental | Focus, pressure, motivation, mindset tools |
| `nutrition` | Nutrition | Fuelling for performance, hydration, match-day eating |
| `supplements` | Supplements | Evidence-based supplement use, what works and what doesn't |
