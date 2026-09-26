---
name: image
description: Generate pictures for Amir's apps and brand with the connected Higgsfield MCP. FIRST look at what we already have and reuse it (mirror, re-crop, bench, unused candidates), and only then generate what is still missing. Covers prompt craft, the exact settings and real prices, judging a candidate through the destination's own scrim and crop, checking the whole set for near-twins, grading to the house look, and shipping. Use whenever Amir asks for app art, a cover, a banner, a still for a reel or carousel, or replacing a picture. Read it before writing a single prompt.
---

# Generating pictures — AA Performance

Claude generates, downloads, judges, grades and ships pictures itself (Higgsfield MCP, first used
2026-09-20). This file is the craft: what to check, what to write, what has already been tried and
failed. The per-destination **specs** live elsewhere and are not repeated here — follow the links.

What is in this folder, and when you reach for it:

| File | Use |
|---|---|
| `LEDGER.md` | **Step 0.** What every existing picture shows (searchable), where the newer ones came from, their Higgsfield job ids, and the exact prompts that won |
| `bench/` | Eleven ship-ready alternates nobody used. Free to reuse |
| `tools/shelf.py` | **Step 0.** Contact sheets of everything shipped; `find <word>`; `bench`; `--audit` (course app: missing / orphaned / duplicate pictures) |
| `tools/crop.py` | **Step 4.** What a 2.9:1 card really shows of a 16:9 picture, at several positions |
| `tools/gate.py` | **Step 4.** Brightness of the text zone, measured through the destination's own scrim |

## ⚠️ The standing rule: do not generate unless Amir asked for THIS run

Every generation spends real credits from a pot **shared with his own generations in the
Higgsfield app** (his balance dropped ~55 credits during one session from his own work).
He said it plainly on 2026-09-20: *"wait until I say to generate more."*

So: look at what exists (Step 0), plan, prompt, cost it, show him, then wait. Never fan out
speculatively, never generate "a few options to see", never top up a set on your own initiative.
`get_cost: true` preflights for free and submits nothing.

**Ask with numbers, and treat the answer as the budget.** "12 slots x 3 candidates, medium = 36
credits. OK?" got the answer *"3 each, medium"*, and that was the whole authorisation. A small
reroll inside the spirit of it (3 credits to redo one slot) is fine **if you report it**; anything
that would add more than about 10% or 5 credits, ask first.

## Step 0 — look at what we already have (reuse before you generate)

Amir, 2026-09-20: *"when you need an image, have a look at what we already have, so we can reuse and
we don't have to regenerate."* It is free, it takes two minutes, and on the day he said it, **10 of
the course app's 29 covers were reused** (nine program.html stills mirrored, one borrowed from a
parallel session) instead of generated.

1. **Look.** `python .claude/skills/image/tools/shelf.py` writes a contact sheet per house; open each
   PNG with Read (the course-app sheet labels every picture with the slot it fills). Then
   `shelf.py find <word> [word ...]` for the subject, and skim `LEDGER.md` sections 1-3. Picture names
   are poetic (`armour`, `the-row`), so search by **what it shows**, not by name.
2. **Walk the reuse ladder, cheapest rung first.**

   | Rung | When | How | Precedent |
   |---|---|---|---|
   | **As it is** | an existing picture already argues the slot | add an `ART` entry, or another slot key | `under-covers` on every locked page; block covers on the card and the banner |
   | **Mirror** | a program.html still (subject on the RIGHT) for the RTL course app; a still life with **no text, logo or handed subject** | add the slug to `FLIPPED` in `scripts/grade_tps_art.py`, run it on the program.html master | 9 of 29 covers |
   | **Re-crop / re-ratio** | a different card shape | `pos` in `ART`; `ratio` in `TWEAKS` | the 4:3 sign-in walk-on |
   | **Bench** | `bench/` alternates, unused Higgsfield candidates (job ids in `LEDGER.md` §4, still downloadable), Amir's `Downloads\hf_2026*.png`, another session's scratchpad | copy or regrade | `tennis-fitness` came from a parallel session's set |
   | **Generate** | only what is still missing | Steps 1-6 | |

3. **Say what you found before you spend anything:** "9 of these 12 already exist, so I would
   generate 3."
4. **The near-twin test.** A new subject must not look like a shipped one. The shelf is small (78
   pictures across two apps), so subjects repeat fast, and **the eye catches it, the numbers never
   do**: on 2026-09-20 `the-long-point` (a bench and towel on clay) was a twin of the live
   `from-the-chair`, and `ice-and-tape` sits right next to `armour` in the Learn list (both orange tape on a bench).
   Both were only seen on a whole-set sheet.
5. **Check for a parallel session.** `git status --short` and `ls assets/<folder>`, then ask what
   other sessions are doing (`ListAgents`, or `list_sessions`). On 2026-09-20 Amir sent the same
   "generate the 12 covers" request to two sessions and **both generated them**, in the same folder,
   in the same minute. That doubled the credits. See `[[parallel-sessions-share-worktree]]`.

## The three houses — they do NOT share a look

| House | Folder | Spec to read first | The look |
|---|---|---|---|
| **program.html** (athlete app) | `assets/art/` | `IMAGES.md` §0 | Green-black shadows, cream highlights, clay the only saturated colour. **No people at all** (hands and feet at most). Subject on the **RIGHT** — English UI text sits left. |
| **Course app** (`/tennis/app/`) | `assets/tps/` | `[[tps-art-direction]]` memory + `FARSI-PRODUCTS.md` | Same grade. Faces **turned away** allowed. Subject on the **LEFT** — the app is RTL, so Farsi titles sit right and bottom. No generated children. |
| **AA Proof** (`habits.html`) | Proof's own art | `[[proof-image-generation]]` memory | **Lavender/violet, NOT green/clay.** Do not apply the brand grade here. |

Rules that hold in all three: **no text, no numbers, no logos, no yellow, no gold.** Tennis balls
are dusted red with clay, never yellow. Never depict exercise form. Clay `#C7552F` is the only
accent (`Content/DESIGN_SYSTEM.md`).

## Step 1 — before you touch the tools

1. **Read the destination's own content.** This is where a set is won or lost. A test has real
   geometry (the spider drill is five points on the court lines, not five balls in a row); the broad
   jump is on a firm floor, never clay. For the course app the lesson and test **ids** are in
   Supabase, not in the repo, so check them there rather than trusting memory:
   ```sql
   select 'lesson', l->>'id', l->>'title' from tps_content c, jsonb_array_elements(c.body->'lessons') l where c.key like 'learn%'
   union all
   select 'test', t->>'id', t->>'title' from tps_content c, jsonb_array_elements(c.body->'tests') t where c.key = 'tests';
   ```
   ⚠️ **Never `select *` from `tps_accounts`**: it holds each student's initial password in clear text.
2. **`balance`**, and quote him the cost.

## Step 2 — write the prompt

The grade is applied in post, so **the prompt does not argue for colour** (asking for green
shadows was ignored outright in round 1). Keep it to roughly 500-600 characters — a ~1,500
character prompt measurably slowed generation with no gain. `LEDGER.md` §5 has the eleven prompts that
shipped, verbatim: copy the shape.

The formula, in order:

1. **The scene**, concrete and singular.
2. **The light** — this is the brightness dial. See step 4.
3. **ONE deliberate clay-orange prop.** One. The grade cannot recolour a wrong-coloured object.
4. **The composition line**, matching the house: *"Subject in the left third; the right half and
   the bottom dark and empty"* (course app) or right/left flipped for program.html.
   **Also keep the subject inside the middle band of the frame.** The course list cards show the
   middle ~62% of the height (2.9:1 crop), so a tall subject gets sliced: a bottle cap and a ball in
   mid-air both were.
5. **The palette guard**: *"Photograph, muted natural colour, clay orange the only saturated colour."*
6. **The avoid list**, specific to THIS subject: *"No readable numbers on the stopwatch"*, *"no text
   or logos on the strap or bottle"*, then *"no people, no yellow, no gold."*

**What fails, proven:**

- **Mechanical assemblies.** A rowing-machine handle could not be generated at all. Amir:
  *"the handle is very hard to generate, cant do it."* **Change the subject, not the prompt** —
  stadium steps replaced it and worked first try.
- **Yellow things you did not think of as yellow.** A banana sat in two food prompts and had to
  become a pomegranate. Lemons, corn, butter and tennis balls (dust them red) are the same trap.
- **A subject that forces a second saturated colour.** A blue ice bag broke a clay-only frame; it
  shipped anyway, as a knowing trade-off (the lesson is about injury), and is the one non-clay accent
  in the set. Prefer the palette-pure version when the subject allows it.
- **Objects that carry numbers** — tape measures, stopwatches, clocks. Ask for a plain silver-grey
  blade and "nothing readable".
- **Physically odd wording.** A "floating" book gave a nonsense picture; say where it rests.
- **A bright, plain, well-lit room.** A white wall in soft window light came back flat and bright
  (mean luminance 0.68) and darkening it only made it dull. Describe the LIGHT instead (step 4).
- **A test with real geometry described loosely.** "Five balls" gave a row of balls; the spider drill is
  five points on the court lines with slide arcs between them.
- **Auto aspect ratio.** It returns portrait. Always set `aspect_ratio` explicitly.
- **A handed subject or any text**, if the slot may be **mirrored** (program.html flips the second
  of two same-family cards in a row; `FLIPPED` in `scripts/grade_tps_art.py` mirrors reused stills).

**Three candidates from ONE prompt** (A, B, C) is the pattern that worked: the variance is in
composition and light, so three is enough to find a keeper. **When all three miss the same way, the
prompt is the problem** (all three slot-6 pictures were the same bench and towel): change the
subject, do not roll a fourth.

## Step 3 — generate

```
ToolSearch "select:mcp__<higgsfield>__generate_image_batch,...__jobs_wait,...__balance,...__models_explore"
```

Settings that work, `gpt_image_2_5`:

| Field | Value | Why |
|---|---|---|
| `variant` | `flare` | the default; the set is built on it |
| `quality` / `resolution` | `medium` / `1k` | **1 credit per image**, verified in `transactions` (every such spend is -1) and in `get_cost`. `high` is 2, `high` + `2k` is 3 each and buys nothing at 1080 px wide. |
| `count` | `1` | one image per job |
| `aspect_ratio` | `"16:9"` (or the slot's) | never `auto` |
| `use_unlim` | `false` | unlim is **not** available on this account through MCP, despite what a review claimed |

⚠️ *Two older notes said "1 credit per 2 images" and "about 4 at a time". The ledger disagrees on
the price; `get_cost` and `transactions` are the source of truth, so check them rather than a note.*

⚠️ **The rate limit is shared and moves.** A 12-wide `generate_image_batch` came back with 10
accepted; the next batches took 7 of 10, 6 of 6, 6 of 7. A parallel session saw about 4. Any other
session, and Amir's own Higgsfield tab, counts against the same limit. **Submit at most 6 at a
time, then `jobs_wait`** (15 s is plenty; a batch finished in 20-40 s). A rejected item comes back
`submission_failed` / `429 rate_limit_reached` with **no job id and no charge**: resubmit only those
indexes. Never blind-resubmit after a transport timeout — the outcome may be unknown; reuse the job id.

**Give every request an `index` that encodes what it is** (slot + 100 x round: `205` = slot 5, third
candidate). The results come back keyed by it, so nothing needs retyping and the files map straight
back to their slot. **Keep the job ids**: they go in `LEDGER.md`, and they are how an unused candidate
gets re-fetched instead of regenerated.

Then download and **actually look**:

```bash
curl -sS -o A_05.png "<result_url>"     # plain CloudFront, no auth needed; still works an hour later
```
and open it with Read. A generated picture you have not looked at is not a candidate.

## Step 4 — judge

Put the three candidates of a slot on one sheet and zoom into the details (numbers, logos, a second
saturated colour). Then, in this order:

1. **Brightness through the destination's scrim.**
   ```bash
   python .claude/skills/image/tools/gate.py tps-banner --sheet sheet.png candidates/*.png
   ```
   It composites the destination's **own** overlay, measures the zone the text lands in, and sets the
   bar from the pictures already shipped to that slot. Presets: `tps-banner`, `app-day`, `app-cycle`,
   `app-library`, `raw`. ⚠️ **Never measure the raw file.** The course banner scrim is 94% opaque at the
   right edge and flattens everything into a 29-38 band; raw luminance failed four good pictures.

   **Too bright? Re-prompt, do not post-darken first.** The reliable lever is light, not exposure: add
   *"overall dark and moody"* plus *"one narrow shaft of light across <subject>, the rest of the room in
   deep shadow."* That fixed 4 of 4 retries (raw 133 -> 17, 139 -> 13) and rescued the height slot
   (a deep green-grey painted wall lit by one low window). Post-darkening via `TWEAKS` (`gain`, `sat`) is
   for an outlier you want to keep: bright top-down clay is the loudest (`five-points` sat 0.80 gain 0.94,
   `braking-mark` 0.85 / 0.95, `door-frame`, a bright room, gain 0.66).

2. **The crop the card really shows.**
   ```bash
   python .claude/skills/image/tools/crop.py <slug or file> 10 25 40
   ```
   Lesson and test list cards are 2.9:1, so only the middle ~62% of a 16:9 picture shows, and `pos` in
   `ART` picks which 62%. Tall subjects get their top or bottom cut. If no position keeps the subject
   whole, regenerate with it lower in the middle band; do not fight the crop.

3. **Does it say the right thing?** A stopwatch on a towel is `clock-and-chalk`, so it cannot also be the
   test-day card. The numbers cannot see that a picture is wrong about the content.

4. **The whole set, on one sheet, in app order**, with the candidate added before you ship it
   (`python .claude/skills/image/tools/shelf.py tps --add A_05.png=the-split-second`): near-twins (step 0.4), **colour rhythm** (six bright clay frames in 29 was the
   comfortable limit; more reads as one orange wall), an off-palette accent, and repeated props (tape,
   towels, benches). Both near-twins that were caught in this round were caught here and nowhere else.

**Judging a second set of candidates for the same slots** (a parallel session's): compare slot by slot,
**content accuracy first, palette second**. On 2026-09-20 the other set was right on content (real
spider-drill geometry, legible food) where ours was stricter on palette, and one slot went to each.

## Step 5 — grade and export

```bash
python scripts/grade_tps_art.py <slug>=<master.png> ...      # course app
```
One shared grade is what makes pictures from separate runs read as one set — that is the whole
point, so never hand-grade a single file differently. It writes `assets/tps/<slug>.webp`, 1080 px,
16:9, ~40 KB on average (dark frames 12-30 KB; the bright top-down clay ones run 70-80 KB, `five-points` and
`braking-mark` are the heaviest). Per-file
`gain`/`sat`/`flip`/`ratio` live in `TWEAKS`. The script is deterministic: re-exporting the other session's master
reproduced its graded file byte for byte, so a borrowed, already-graded file is safe to use as it is.

⚠️ **program.html art has no saved grade script** — it was graded in a scratchpad on 2026-09-19.
Write one before the next round there rather than re-deriving the numbers; the constants are in
`grade_tps_art.py` (`SHADOW`, `HILITE`, `SAT`).

## Step 6 — ship

- ⚠️ **Never overwrite a shipped path.** The root `sw.js` serves `/assets/` **cache-first by full
  URL**, so a replacement at the same path never reaches a phone that already has the app. Ship as
  `-v2` and update the map (`APP_ART` in `program.html`), or bump `ART_V` (course app).
- ⚠️ **A Library shelf banner's path is in the DATABASE** (`public.library_categories.banner`),
  with `workouts/index.json` / `articles/index.json` as the offline fallback only. Change **both**.
- **Course app wiring:** add the lesson or test **id** to `ART` in `tennis/app/app.js` (a lesson or test
  without an entry keeps a plain green banner), then
  `python scripts/stamp_tps_app.py` (+ `--check`), `node --check tennis/app/app.js`, and
  `python .claude/skills/image/tools/shelf.py --audit` (missing files, **orphans that would ship**,
  one picture on two lessons, duplicate keys). Delete any file you did not wire.
  These pictures live in `assets/tps/`, **outside** `tennis/app/`, because the `tps-content` deploy
  overwrites that folder; changes to `app.js`/`app.css`/`index.html` must be copied into `tps-content`
  or the next deploy erases them.
- **Commit only your own files.** `git add <paths>`, never `-A`: parallel sessions' edits (MAP.md, other
  skills) sit in the same tree, and a push of `main` also carries any other session's *local commits*.
  Push `main` **by itself**.
- **Verify locally with a clean worker.** The course app's service worker serves its cached shell first, so
  on localhost unregister it and clear `caches` before testing. `navigate` to the same URL is NOT a reload
  (a hash-only or identical navigation keeps the document): use `location.reload()`. If the preview server
  was stopped by the app, restart it.
- **Verify live** by polling a served file for a marker only the new build has (`curl -sL .../app.js | grep -c
  '<slug>'`, and a new asset returning 200), not the rate-limited GitHub API. Then count the covers that load
  (`.ph img` with `naturalWidth > 0`: 22 lessons, 7 tests), check the console, and take one screenshot. ⚠️ A
  phone that already has the app gets the new build on its **second** open: the new worker installs in the
  background first. That is the design, not a failed deploy.
- **Update the record:** the pictures section of `FARSI-PRODUCTS.md` (course app) or `IMAGES.md` §0 (program.html), `LEDGER.md` (what the new pictures show, their job
  ids, their prompts), the board artifact, and the memory notes.

---

## Learned the hard way — append here

Add a dated line whenever a round teaches something. This section is the reason the skill exists.

- **2026-09-19** — Prompts stopped arguing for colour once the grade moved into a script. Rounds 1-2
  prompts in chat history are the old, longer style; do not copy them.
- **2026-09-19** — Nano Banana Pro cost double and was the one image of 18 that needed repair.
  No reason to reach for it.
- **2026-09-19** — A good picture with its subject on the wrong side is **mirrored, not
  regenerated** — but only a still life with no text, logo or handed subject.
- **2026-09-20** — First self-generated round: 12 covers, prompt -> ship-ready, ~10 minutes, ~8
  credits. The hand-off rounds it replaced took 31 candidates to fill 9 slots.
- **2026-09-20** — Measuring raw brightness over-rejects; measure through the destination's scrim.
- **2026-09-20** — "Overall dark and moody" + one shaft of light fixed every over-bright retry.
- **2026-09-20** — Dark frames are tiny (12-30 KB); the bright clay top-down ones are the heavy ones (70-80 KB).
  The last twelve came to 397 KB in all.
- **2026-09-20** — A parallel session generated the same 12 slots in the same minute. Its set beat
  mine on **content accuracy** (real spider-drill geometry, legible food) while mine was stricter on
  palette. Lesson: the content check in step 1 is worth more than the palette discipline.
- **2026-09-20 (the last 12 course covers)** — 36 candidates (3 per slot, one prompt each, medium) plus a
  3-image reroll = **39 credits**, and 11 of 12 slots had a keeper among the three. Amir's budget line was
  *"3 each, medium"*. Best-of-three is the right size; a fourth roll is a sign the prompt is wrong.
- **2026-09-20** — **The price is 1 credit per medium image**, not 1 per 2 (checked against
  `transactions`: every spend is -1; the -3 records are `high` + `2k`). An earlier note had it wrong.
- **2026-09-20** — **Reuse came first, and it was worth more than the generating:** 9 of 29 covers were
  mirrored program.html stills and 1 was borrowed, at no credits. Amir then asked for it as a standing habit
  (Step 0). The parallel session's 11 unused alternates are now in `bench/`.
- **2026-09-20** — **Both near-twins were caught only on a whole-set sheet**, never on a single picture and
  never by the gate. Build that sheet every time.
- **2026-09-20** — **A 2.9:1 card crop slices tall subjects** (the bottle cap on `tennis-fitness`, the ball on
  `the-split-second`). Fixed with `pos` 18% and 25% after the fact; `crop.py` now shows it before shipping, and
  it also shows `tennis-fitness` would keep its whole cap at about 8%. Prompt the subject into the middle band.
- **2026-09-20** — Yellow hides in food: a banana in two prompts had to become a pomegranate.
- **2026-09-20** — A bright plain wall cannot be rescued in post. Darkening made it dull; **re-prompting the
  light** (a deep green-grey painted wall, one low window, "moody low-key") made the keeper. Cost 3 credits.
- **2026-09-20** — A borrowed, already-graded file matched the script's output byte for byte, so borrowing a
  graded picture from another session is safe.
- **2026-09-20** — The lesson and test ids came from Supabase, and all 29 matched. `tps_accounts` holds initial
  passwords in clear text: query `tps_content` only.
- **2026-09-20** — Shell notes for this PC: long heredocs fail (write the script with the Write tool, then run
  it); on localhost the course worker serves its old cached shell, so clear it before testing; the preview
  server can be stopped by the app between turns.
