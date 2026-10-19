### Data

#### `data/*.json` — local working copies only (since 2026-09-07)
- **What it is now:** Each athlete's programme is a **row in `public.programs`**, read by `program.html` through `get_program()` after the athlete signs in. `data/*.json` is gitignored, 404 on the live site, and never read by the app: the pipeline may write one as scratch before publishing, and Amir keeps a local copy as a fallback.
- **Edit this when:** never on the site. Day-to-day changes go through coach.html's inline editor; a new cycle goes through `/program-assemble`.
- **See also:** `SCHEMA.md` — the fields a programme can contain; `PROGRAM-APP.md` — how the app's programme features work.

#### `articles/index.json` — Playbook manifest (fallback)
- **What it does:** Lists categories (For Coaches, Pre-Competition, Recovery, Mental, Nutrition, Supplements) and which articles belong to each. The live Playbook comes from the `library` table (`get_library()`, published from coach.html → Library → + Publish article); this file is the offline fallback. A `?article=<id>` link resolves through `get_library()` first (`openArticleDeepLink()`, 2026-09-27, as workout links have since 2026-09-20), so an edit on the server reaches a link shared earlier and an unpublished article's link opens nothing; the file is read only when the server cannot answer.
- **If deleted:** an offline Playbook, and a `?article=<id>` link opened with no signal, show nothing.
- **Depends on:** `program.html` reads it; individual article files in `articles/<category>/` are fetched lazily.
- **Edit this when:** You add a new article or create a new category. Always add an entry here alongside the article JSON.
- **See also:** `SCHEMA.md → "Library tab — Read section"` for the exact format.

#### `articles/<category>/*.json` — Article files
- **What it does:** One file per article. Contains the title, read time, and an array of `blocks` (paragraphs, headings, lists, callout boxes, images, and embedded workout cards). Each article is reachable at `program.html?article=<id>` — a shareable public URL.
- **If deleted:** Its `?article=<id>` link and its offline copy break, and the next `scripts/build_article_pages.py` run deletes its web pages; the Playbook keeps showing the article until its `library` row is unpublished (`published = false`; coach.html's `toggleLibraryItem()` does it, but no button calls it).
- **Edit this when:** You're writing a new article or updating an existing one.
- **See also:** `SCHEMA.md → "Article block types"` for all supported block formats.

#### `workouts/index.json` + `workouts/<category>/*.json` — Train library
- **What it does:** The manifest and individual session files behind Library → Sessions (the offline fallback for the `library` table). Works exactly like the Playbook's article files but for on-demand workout sessions. Each workout is reachable at `program.html?workout=<id>`.
- **⚠️ These files are the FALLBACK now, not the source.** The live library is the `library` table, published from coach.html; `ensureLibManifests()` only reads these if that call fails. Keep them in step, but publish through the dashboard.
- **A session's safety wording lives in its `before` field** (rows of `{label, text}`), drawn by `renderBefore()` in `program.html` as an always-visible **Before you start** card above the collapsible *Why this session* intro. `ws_why_off` (that toggle's memory) is shared by every workout and is three-state since 2026-09-20: a long intro starts closed **only if the session has a `before` card**. `?workout=<id>` links resolve through the database first (`openWorkoutDeepLink()`), so a shared link gets the shelf picture and shows the published copy. Rollout order matters: see `SCHEMA.md` → *Adding a workout*, step 6.
- **⚠️ Every workout needs a `countsAs`** — `"strength"`, `"mobility"` or `"none"`. It decides which habit **Mark as done** ticks in AA Proof: a real session ticks WORKOUT, a mobility flow or recovery session ticks MOBILITY, a warm-up ticks nothing. Omit it and the workout counts for nothing — safe, but silent. The `/workout` skill covers how to choose; the reasoning is in `supabase/stage28_library_sessions.sql` and `HABITS.md`.
- **Edit this when:** Adding a new shared workout session. Always create the JSON file and add the entry to the manifest together.
- **See also:** `SCHEMA.md → "Library tab — Train section"` for the exact format.

#### `SCHEMA.md` — The JSON field guide
- **What it does:** Documents every field you can use in an athlete JSON file, a workout file, and an article file — plus how to add new content to the Library tab.
- **If deleted:** You lose the reference guide. The site keeps working.
- **Edit this when:** You add a new optional field to your JSON files and want to document it.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
