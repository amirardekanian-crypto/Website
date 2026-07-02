---
name: reel
description: Build a ready-to-preview Instagram reel (1080×1920, animated HTML) from Amir's topic or script. Use whenever Amir asks for a reel, says "make a reel about…", or wants a moving/animated version of a carousel/story. Delivers an openable, self-playing HTML file — never an MP4 unless Amir explicitly asks to export.
---

# Instagram reel generator — AA Performance

Turn a topic into a self-contained, self-playing 1080×1920 HTML file: a looping sequence of
scenes with **continuous motion throughout**, not a slideshow of static cards with an entrance
fade. Content is **English** by default (content language directive, 2026-07-02 — see
`CLAUDE.md`); Farsi only if Amir explicitly asks. Newest reference: `Content/reel-6-system.html`.

## Step 0 — Required reading (every run)

1. **`Content/DESIGN-ATLAS.md`** — non-negotiables, current-vs-retired, asset shelf. Open this first.
2. **`Content/DESIGN_SYSTEM.md`** §7 — reel type scale, phone-mockup spec, canonical outro.
3. **`Content/reel-6-system.html`** — the structural + motion reference. Copy patterns from here,
   don't reinvent. **Base64 hot-spot:** the 3 cycle-thumbnail `<img src="data:image/jpeg;base64,…">`
   lines. Don't Read through them — Grep/read around them, and transplant new images the same
   mechanical way described in Step 5.
4. **`Content/reel-4-app.html`** — the "App-as-Product" persistent-phone pattern, for when the
   whole reel is about the app itself rather than a 5-step/numbered narrative.

## Step 1 — Analyze the topic

Extract: the hook (must land in the first 2s), 5–8 beats, and whether it's a **numbered-steps**
story (discovery → analysis → plan → training → monitoring, like reel-6) or a **product-demo**
story (better served by reel-4's persistent-phone pattern). Pull factual claims from
`Content/HOW-IT-WORKS.md` / `Content/PRODUCT.md` — don't invent numbers, results, or claims;
check phrasing against the source doc word-for-word before using it (a copy audit on reel-6
caught "health before records" drifting from the source's actual "health before performance").

## Step 2 — Pick the scene pattern

| Pattern | When | Reference |
|---|---|---|
| **Scene-swap** — full-screen `.scene`s cross-fade via a `data-dur`-driven JS timer, looping forever | Numbered narrative, multi-topic explainer | `reel-6-system.html` |
| **Persistent-subject** ("App-as-Product") — one phone stays on screen, only its inner screens swap | The reel *is* a tour of the app | `reel-4-app.html` |

This skill documents the scene-swap build in full; for persistent-subject, read `reel-4-app.html`
directly and follow its `BEATS` array + `.phonewrap` structure.

## Step 3 — Write the copy

English, sharp/uppercase Barlow Condensed per the EN site voice — not a translation of an old
Farsi deck. One idea per scene. The **canonical outro** (always the last scene): mid line "A map
to your goal." → big line "A **coach** in your pocket." (coach in clay/clay-2) → brand row
(white circle "A" + "Amir Ardekani") → CTA "Send a DM to start →". If Amir asks for Farsi:
switch to Vazirmatn, `dir="rtl"`, no letter-spacing, no uppercase, Persian numerals, and use the
Farsi canonical outro from `DESIGN_SYSTEM.md` §0 instead — see `reel-5-system.html`.

## Step 4 — Make it move (this is what separates a reel from a slideshow)

**The principle, not a recipe:** Amir's standing direction is **"fully animational, lots of
moving things, being cool"** — but he's explicit that this is a *feeling* to hit, not a fixed
list of effects to reuse reel after reel. **Don't treat the toolbox below as a checklist to tick
off.** Nothing on screen should ever sit completely still for no reason — that's the bar. How you
clear it should change every time: invent motion that fits *this* topic's mood and content,
even if that means techniques that aren't in the list below at all. A reel that mechanically
reapplies the same ten effects every time is its own kind of dead, just dressed up.

**Toolbox from `reel-6-system.html`** (starting inspiration, pick and remix, don't copy wholesale):
ambient background drift (a blurred drifting glow orb), a drawn/marching dashed line (the brand's
rally-arc motif, animated via `stroke-dashoffset`), a pulsing live-dot, pop-in-and-settle list
items, Ken Burns zoom on photos, bouncing directional cues, typing dots before a message lands,
a blinking clock colon, staggered internal card reveals (rows cascading in, not fading as one
block), a breathing headline, a bouncing CTA pointer. The exact CSS for each is in that file —
read it for mechanics, not as the definitive list of what's allowed.

**Push past it when the content calls for something else:** a parallax layer, a number that
visibly counts/ticks, a shape that morphs, a path that draws itself into an icon, a card that
tilts on a fake 3D axis, elements that enter from different directions instead of always the
same slide-up, a background that shifts hue over the scene's duration, text that types itself
out letter by letter. If a technique would sell *this* topic better than anything already
shipped, build it — that's the point of asking for a designer instead of a template.

One mechanical constraint that isn't optional: whatever you build must survive the two gotchas
in Step 6 (works in `?beat=N` stillmode, doesn't rely on tag-position selectors) and be captured
correctly by `?capture=1` — new motion ideas are welcome, breaking the export pipeline isn't.

## Step 5 — Build the file

Create **`Content/reel-<slug>.html`**. Copy the full boilerplate from `reel-6-system.html`:
`:root` palette tokens, `.viewport`/`.fitwrap`/`.reel` scaffold, `.topbar` (handle + pulsing dot +
beat counter), `.progress`, the `setScene`/`play`/`clear` JS driver, and the **three URL modes**
(all load-bearing — keep all three in every new reel):

- **default** — autoplays and loops forever, scaled to fit the browser window (`fit()`).
- **`?beat=N`** — jumps to and freezes scene N, all transitions/animations disabled
  (`.stillmode *{transition:none!important;animation:none!important;}`), canvas at native scale.
  Used for quick still checks.
- **`?capture=1`** — hides `.controls`/`.progress`, forces `.fitwrap{transform:none}` so the
  canvas fills the viewport exactly with zero letterboxing/chrome. **This is the mode the video
  export pipeline (Step 9) drives** — never record the default mode, its window-fit scaling
  exposes the controls/progress in the recorded frame.

**Images**: base64 data URIs, extracted mechanically (Python: `open(path,'rb')` → `base64.b64encode`),
never retyped. Downscale first if the source is large — a 1200×675 cycle banner only needs
~480×270 for a reel-sized thumbnail (`PIL.Image.thumbnail` + re-save as JPEG q78 keeps each
image ~15–20KB of base64).

## Step 6 — Known gotchas (both bit reel-6 in production — check for them every time)

| Bug | Cause | Fix |
|---|---|---|
| A staggered-reveal element (e.g. the 2nd row of a list) never appears | Used `.some-class:nth-of-type(N)` to target the Nth item — `:nth-of-type` counts by **tag name** among ALL siblings (including differently-classed ones), not by position among same-classed elements | Give each item its own explicit class (`.row-1`, `.row-2`) and select on that directly |
| An element never appears in `?beat=N` preview, even though it plays fine on autoplay | Its reveal was driven **purely by a `@keyframes animation`** (e.g. `animation: bubblein .6s both`) — `.stillmode *{animation:none!important}` disables it, and there's no static fallback | Reveal state-changes through `.scene.on .thing{opacity:1}` (a plain transitioned rule, not an animation) wherever the element needs to *persist* once shown. Reserve pure `@keyframes` for genuinely transient effects (typing dots, blinks, bounces) that are fine being invisible in a frozen still. |

## Step 7 — Verify (fast, minimal — don't over-do this for a routine draft)

One or two headless screenshots of the most complex/most-edited beats, for **your own** sanity
check only — catches gross breakage (missing content, broken layout) before Amir sees it. Do
**not** screenshot every beat, and do not send screenshots to Amir as the review artifact — see
Step 8. Full multi-lens adversarial audits (copy/brand/technical) are for when Amir asks to
finalize, not for a routine draft or revision.

## Step 8 — Deliver

**The deliverable is the HTML file itself**, sent via `SendUserFile` with `display: "render"` so
it can preview inline. It autoplays and loops — Amir opens it, watches it, tells you what to
change. **Do not**:
- Render an MP4 by default (see Step 9 — only on explicit request).
- Send a wall of static per-beat screenshots as "the review."
- Run a heavy audit workflow for a first draft or a quick revision.

Keep the loop fast: topic → build → one quick self-check → send the file. Minutes, not an
infrastructure project.

## Step 9 — MP4 export (only when Amir explicitly asks)

1. Serve the file: `python3 -m http.server 8000` from the repo root.
2. Record with Playwright (global npm package, not a local dependency — resolve via
   `NODE_PATH=$(npm root -g) node script.js`) against the **`?capture=1`** URL, using
   `context.recordVideo` at the exact 1080×1920 viewport. Detect true loop boundaries with a
   `MutationObserver` on the first `.scene`'s `class` attribute (scene 0 only ever gains `.on` at
   the start of a loop) exposed back to Node via `page.exposeFunction` — this measures the *real*
   wall-clock loop duration (including whatever font/image load latency happened) rather than
   trusting the theoretical sum of `data-dur` values.
3. Convert the recorded `.webm` to `.mp4`: `ffmpeg -ss <loop-start-offset> -i raw.webm -t <loop-duration>
   -vf "scale=1080:1920,fps=30" -c:v libx264 -pix_fmt yuv420p -crf 17 -movflags +faststart -an out.mp4`.
   Playwright's own bundled ffmpeg (webm/vp8-only) can't do this — install a real one:
   `sudo apt-get install -y --no-install-recommends ffmpeg` gets libx264/h264.
   Pass Chromium the environment's `HTTPS_PROXY` explicitly via `chromium.launch({proxy:{server:...}})`
   if Google Fonts fails to load (retry storms in the launch log are the tell).
4. Extract a few sample frames (`ffmpeg -ss T -i out.mp4 -frames:v 1 frame.png`) spanning the
   timeline and eyeball them before sending — confirms no letterboxing, no chrome, real content.
5. Deliver the `.mp4` via `SendUserFile`.

## Don'ts

- No gold/yellow — clay `#C7552F` is the only accent (clay-2 `#E06B43` on dark surfaces).
- No monogram/seal chips as in-scene chrome — the brand row (white circle "A" + name) on the
  outro is the only logo carrier.
- Don't build a video pipeline or run an audit workflow for a routine draft — that's Step 9/a
  finalize request, not the default loop.
- Don't invent claims, numbers, or results — check every line against `HOW-IT-WORKS.md`/`PRODUCT.md`.
- Don't ship a scene with only an entrance fade and nothing else moving — see Step 4.
- Never retro-edit an already-shipped/posted reel; start a new numbered file instead.
