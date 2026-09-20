---
name: image
description: Generate pictures for Amir's apps and brand with the connected Higgsfield MCP — prompt craft, the exact settings that work, judging a candidate through the destination's own scrim, grading to the house look, and shipping it. Use whenever Amir asks for app art, a cover, a banner, a still for a reel or carousel, or replacing a picture. Read it before writing a single prompt.
---

# Generating pictures — AA Performance

Claude generates, downloads, judges, grades and ships pictures itself now (Higgsfield MCP,
first used 2026-09-20). This file is the craft: what to write, what to check, what has already
been tried and failed. The per-destination **specs** live elsewhere and are not repeated here —
follow the links.

## ⚠️ The standing rule: do not generate unless Amir asked for THIS run

Every generation spends real credits from a pot **shared with his own generations in the
Higgsfield app** (his balance dropped ~55 credits during one session from his own work).
He said it plainly on 2026-09-20: *"wait until I say to generate more."*

So: plan, prompt, cost it, show him — then wait. Never fan out speculatively, never generate
"a few options to see", never top up a set on your own initiative. `get_cost: true` preflights
for free and submits nothing; use it to quote him a number before asking.

## The three houses — they do NOT share a look

| House | Folder | Spec to read first | The look |
|---|---|---|---|
| **program.html** (athlete app) | `assets/art/` | `IMAGES.md` §0 | Green-black shadows, cream highlights, clay the only saturated colour. **No people at all** (hands and feet at most). Subject on the **RIGHT** — English UI text sits left. |
| **Course app** (`/tennis/app/`) | `assets/tps/` | `[[tps-art-direction]]` memory + `CLAUDE.md` | Same grade. Faces **turned away** allowed. Subject on the **LEFT** — the app is RTL, so Farsi titles sit right and bottom. No generated children. |
| **AA Proof** (`habits.html`) | Proof's own art | `[[proof-image-generation]]` memory | **Lavender/violet, NOT green/clay.** Do not apply the brand grade here. |

Rules that hold in all three: **no text, no numbers, no logos, no yellow, no gold.** Tennis balls
are dusted red with clay, never yellow. Never depict exercise form. Clay `#C7552F` is the only
accent (`Content/DESIGN_SYSTEM.md`).

## Step 1 — before you touch the tools

1. **`git status --short`.** Look for untracked files in the target asset folder. On 2026-09-20
   two sessions generated the **same 12 covers into the same folder in the same minute**. Check
   before generating, not just before staging. See `[[parallel-sessions-share-worktree]]`.
2. **Read the destination's own content.** This is where a set is won or lost. A test has real
   geometry (the spider drill is five points on the court lines, not five balls in a row); the
   broad jump is on a firm floor, never clay. Query Supabase or read the JSON and check.
3. **Check what is already there.** A new picture must not duplicate a shipped one. Two sets have
   nearly collided this way (`the-long-point` vs the live `from-the-chair`: both a towel on clay).
4. **`balance`**, and quote him the cost.

## Step 2 — write the prompt

The grade is applied in post, so **the prompt does not argue for colour** (asking for green
shadows was ignored outright in round 1). Keep it to roughly 500-600 characters — a ~1,500
character prompt measurably slowed generation with no gain.

The formula, in order:

1. **The scene**, concrete and singular.
2. **The light** — this is the brightness dial. See step 4.
3. **ONE deliberate clay-orange prop.** One. The grade cannot recolour a wrong-coloured object.
4. **The composition line**, matching the house: *"Subject in the left third; the right half and
   the bottom dark and empty"* (course app) or right/left flipped for program.html.
5. **The palette guard**: *"Photograph, muted natural colour, clay orange the only saturated colour."*
6. **The avoid list**: *"No text, no numbers, no logos, no people, no yellow, no gold."*

**What fails, proven:**

- **Mechanical assemblies.** A rowing-machine handle could not be generated at all. Amir:
  *"the handle is very hard to generate, cant do it."* **Change the subject, not the prompt** —
  stadium steps replaced it and worked first try.
- **Objects that force a second saturated colour.** A blue ice bag breaks a clay-only frame.
- **Objects that carry numbers** — tape measures, stopwatches, clocks — against a no-numbers rule.
- **Auto aspect ratio.** It returns portrait. Always set `aspect_ratio` explicitly.
- **A handed subject or any text**, if the slot may be **mirrored** (program.html flips the second
  of two same-family cards in a row; `FLIPPED` in `scripts/grade_tps_art.py` mirrors reused stills).

## Step 3 — generate

```
ToolSearch "select:mcp__<higgsfield>__generate_image_batch,...__jobs_wait,...__balance,...__models_explore"
```

Settings that work, `gpt_image_2_5`:

| Field | Value | Why |
|---|---|---|
| `variant` | `flare` | the default; the set is built on it |
| `quality` / `resolution` | `medium` / `1k` | **1 credit per 2 images.** `high`/`2k` is 3 credits each and buys nothing at 1080px wide |
| `aspect_ratio` | `"16:9"` (or the slot's) | never `auto` |
| `use_unlim` | `false` | unlim is **not** available on this account through MCP, despite what a review claimed; omitting it just adds a round-trip |

⚠️ **The rate limit is about 4 concurrent.** A 12-wide `generate_image_batch` came back
`429 rate_limit_reached` on **all 12 and submitted nothing** (so nothing was charged); a 5-wide
got 1 through. **Submit in groups of 3-4, then `jobs_wait`** (15s is plenty — a group of 4
finished well inside it). Never blind-resubmit after a transport timeout; reuse the job id.

Then download and **actually look**:

```bash
curl -sS -o shot.png "<result_url>"     # plain CloudFront, no auth needed
```
and open it with Read. A generated picture you have not looked at is not a candidate.

## Step 4 — judge

```bash
python .claude/skills/image/tools/gate.py tps-banner --sheet sheet.png candidates/*.png
```

It composites the destination's **own** overlay, measures the zone the text lands in, and sets the
bar from the pictures already shipped to that slot. Presets: `tps-banner`, `app-day`, `app-cycle`,
`app-library`, `raw`.

⚠️ **Never measure the raw file.** The course app's banner scrim is 94% opaque at the right edge
and flattens everything into a 29-38 band regardless of the master's brightness. Raw luminance
failed four good pictures. Bright raw + heavy scrim is fine; the gate knows the difference.

**Too bright? Re-prompt, do not post-darken first.** The reliable lever is light, not exposure:
add *"overall dark and moody"* plus *"one narrow shaft of light across <subject>, the rest of the
room in deep shadow."* That fixed 4 of 4 retries in a single pass (raw 133 → 17, 139 → 13).
Post-darkening via `TWEAKS` in `scripts/grade_tps_art.py` (`gain`, `sat`) is for an outlier you
want to keep, not the first response.

**Then look at the sheet.** The numbers cannot see that a picture is wrong about the content, or
that two pictures in the set are the same idea. Both of those have shipped past a clean gate.

## Step 5 — grade and export

```bash
python scripts/grade_tps_art.py <slug>=<master.png> ...      # course app
```
One shared grade is what makes pictures from separate runs read as one set — that is the whole
point, so never hand-grade a single file differently. It writes `assets/tps/<slug>.webp`, 1080px,
16:9, ~40 KB. Per-file `gain`/`sat`/`flip`/`ratio` live in `TWEAKS` in that file.

⚠️ **program.html art has no saved grade script** — it was graded in a scratchpad on 2026-09-19.
Write one before the next round there rather than re-deriving the numbers; the constants are in
`grade_tps_art.py` (`SHADOW`, `HILITE`, `SAT`).

## Step 6 — ship

- ⚠️ **Never overwrite a shipped path.** The root `sw.js` serves `/assets/` **cache-first by full
  URL**, so a replacement at the same path never reaches a phone that already has the app. Ship as
  `-v2` and update the map (`APP_ART` in `program.html`), or bump `ART_V` (course app).
- ⚠️ **A Library shelf banner's path is in the DATABASE** (`public.library_categories.banner`),
  with `workouts/index.json` / `articles/index.json` as the offline fallback only. Change **both**.
- Course app art lives in `assets/tps/`, **outside** `tennis/app/`, because the `tps-content`
  deploy overwrites that folder. Changes to `app.js`/`app.css`/`index.html` there must be copied
  into `tps-content` or the next deploy erases them. Run `python scripts/stamp_tps_app.py`.
- Verify the deploy per `CLAUDE.md` → *Verifying the live site*.

---

## Learned the hard way — append here

Add a dated line whenever a round teaches something. This section is the reason the skill exists.

- **2026-09-19** — Prompts stopped arguing for colour once the grade moved into a script. Rounds 1-2
  prompts in chat history are the old, longer style; do not copy them.
- **2026-09-19** — Nano Banana Pro cost double and was the one image of 18 that needed repair.
  No reason to reach for it.
- **2026-09-19** — A good picture with its subject on the wrong side is **mirrored, not
  regenerated** — but only a still life with no text, logo or handed subject.
- **2026-09-20** — First self-generated round: 12 covers, prompt → ship-ready, ~10 minutes, ~8
  credits. The hand-off rounds it replaced took 31 candidates to fill 9 slots.
- **2026-09-20** — Measuring raw brightness over-rejects; measure through the destination's scrim.
- **2026-09-20** — "Overall dark and moody" + one shaft of light fixed every over-bright retry.
- **2026-09-20** — Dark frames are tiny: the 12 exported at 229 KB total, against a 40 KB budget each.
- **2026-09-20** — A parallel session generated the same 12 slots in the same minute. Its set beat
  mine on **content accuracy** (real spider-drill geometry, legible food) while mine was stricter on
  palette. Lesson: the content check in step 1 is worth more than the palette discipline.
