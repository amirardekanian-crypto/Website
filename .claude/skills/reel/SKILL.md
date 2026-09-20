---
name: reel
description: Build a ready-to-preview Instagram reel (1080×1920, animated HTML) from Amir's topic or script, including AD reels that sell a product (reel-7, the tennis course). Use whenever Amir asks for a reel, an Instagram ad, or a moving version of a carousel/story. Delivers an openable, self-playing HTML file. Exports a frame-accurate MP4 and saves the sources only when Amir asks.
---

# Instagram reel generator — AA Performance

Turn a topic into a self-contained, self-playing 1080×1920 HTML file: a looping sequence of
scenes with **continuous motion throughout**, not a slideshow of static cards with an entrance
fade. Content is **English** by default (content language directive, 2026-07-02 — see
`CLAUDE.md`); **Farsi when Amir asks, or when the thing the reel sells is Farsi-only** (reel-7,
his explicit choice on 2026-09-20). Newest references: `Content/reel-7-course.html` (an **ad**:
Farsi, real product screens, one visual idea carried through) and `Content/reel-6-system.html`
(English scene-swap explainer).

## Step 0 — Required reading (every run)

1. **`Content/DESIGN-ATLAS.md`** — non-negotiables, current-vs-retired, asset shelf. Open this first.
2. **`Content/DESIGN_SYSTEM.md`** §7 — reel type scale, phone-mockup spec, canonical outro.
3. **`Content/reel-6-system.html`** — the structural + motion reference. Copy patterns from here,
   don't reinvent. **Base64 hot-spot:** the 3 cycle-thumbnail `<img src="data:image/jpeg;base64,…">`
   lines. Don't Read through them — Grep/read around them, and transplant new images the same
   mechanical way described in Step 5.
4. **`Content/reel-4-app.html`** — the "App-as-Product" persistent-phone pattern, for when the
   whole reel is about the app itself rather than a 5-step/numbered narrative.
5. **`Content/reel-7-course/README.md`** and its `src/reel7.template.html` — the ad reference
   (scene map, copy-to-source table, rebuild commands) — plus `.claude/skills/reel/tools/README.md`
   for the checking and export tools.
6. **Only if the reel uses generated footage:** `.claude/skills/video/SKILL.md` (making the clips;
   its Step 8 is the plan for playing a `<video>` inside this engine and mixing the clips' sound).

## Step 0b — Briefing an AD reel (something that sells)

Amir is the coach and the buyer, not the art director. This order worked on reel-7 (he watched it and
said "incredible"):

1. **Read first**, so your questions are about his choices and not facts you can look up: the product
   page, the app itself (open the demo), the art notes, `DESIGN-ATLAS.md`.
2. **Ask only concrete questions** (`AskUserQuestion`): the language, what a viewer should do next
   (the CTA), voice or silent. He answers those instantly. **Never make him choose between abstract
   concepts** — he answered a four-way concept picker with "i dont understand this question". Choose
   the concept yourself and explain it in plain words.
3. **Make a visual plan he can open** (an Artifact board, like `Content/reel-7-course/plan-board.html`):
   a storyboard, the named animations (small live CSS demos), the pictures he has to generate as cards
   with copy-ready prompts, and two or three quick picks he can answer in a few words ("A, yes, images
   done"). Keep his picture list minimal: reel-7 needed two.
4. He says "go". Then either he generates the pictures by hand (Higgsfield or GPT Image) into Downloads
   and you fill the board's cards with what he made (how reel-7 went), or you generate them yourself
   through the Higgsfield MCP with `/image` (pictures) and `/video` (footage), quoting the credits
   first: the pot is shared with his own generations, so never spend before that "go".
5. Build, run the **full check** (Step 7), send the HTML, then the MP4 (Step 9) if he asks, then save
   it (Step 10).

Talk to him in plain words: short sentences, no jargon, no em-dashes.

## Step 1 — Analyze the topic

Extract: the hook (must land in the first 2s), 5–8 beats, and whether it's a **numbered-steps**
story (discovery → analysis → plan → training → monitoring, like reel-6), a **product-demo**
story (better served by reel-4's persistent-phone pattern) or an **ad** (Step 2b). Pull factual claims from
`Content/HOW-IT-WORKS.md` / `Content/PRODUCT.md` (for a product: its page and its app) — don't invent
numbers, results, or claims; check phrasing against the source word-for-word before using it (a copy
audit on reel-6 caught "health before records" drifting from the source's actual "health before
performance"). Keep a **copy-to-source table** in the reel's README (reel-7 has one).

## Step 2 — Pick the scene pattern

| Pattern | When | Reference |
|---|---|---|
| **Scene-swap** — full-screen `.scene`s cross-fade via a `data-dur`-driven JS timer, looping forever | Numbered narrative, multi-topic explainer | `reel-6-system.html` |
| **Persistent-subject** ("App-as-Product") — one phone stays on screen, only its inner screens swap | The reel *is* a tour of the app | `reel-4-app.html` |
| **World layer** — two graded photos crossfade behind everything, a line measured in the photo carries registered marks and a hero object, scenes on top, a phone with real screens, ends on the button | An **ad** for a product with a real app and a real page | `reel-7-course.html` |

This skill documents the scene-swap build in full; for persistent-subject, read `reel-4-app.html`
directly and follow its `BEATS` array + `.phonewrap` structure; for the world layer see 2b.

### Step 2b — The world-layer recipe (reel-7)

1. **Two pictures, one court.** Ask Amir for a matched pair: same camera and framing, a start state and
   an end state (the second is an *edit* of the first), 9:16, no people, ball, text, logos or yellow.
   Grade with `grade()` from `scripts/grade_tps_art.py` (saturation ≈ .84 for full-frame clay), LANCZOS
   up to 1080×1920, a light unsharp mask, grain σ ≈ 2.4 to hide the 1.4× upscale (`reel-7-course/src/prep_bg.py`).
   They crossfade under everything as the story runs from the start state to the end state.
2. **State lives on the reel root.** `st-0…st-N` classes (plus a neutral `pre` before the loop starts) set
   each scene's background opacity, brightness, blur and the hero object's place. **Transitions go on the
   state rule, never on the base rule**, so a loop reset snaps instead of playing backwards.
3. **Measure the line, register everything on it.** Find a strong line in the picture (a court baseline),
   fit it with numpy, and put marks, arcs and the hero object on it with perspective spacing
   `f(u) = u + c·u·(1−u)` and scale `s(u) = (1+c(1−2u)) / (1+c)` (c ≈ .29). Prove the fit with a dotted
   overlay before building. **If a picture changes, measure again** or everything floats off the line.
4. **A second layer and one camera.** The marks, arcs and hero sit in a second `.cam` layer *above* the
   scenes (so the ball can fly in front of a picture window). Both `.cam` layers get the same Web
   Animations push-in (`el.animate`, scale 1 → 1.08 → 1.11 → 1.03 over the whole reel), so the overlay
   never drifts from the photo. Stills set the camera per beat from a table.
5. **A hero object that means something.** reel-7's ball is progress: one hop per block, higher each time.
   x moves linearly (a transition on the ground point), the vertical hop is a parabola (`hopA`/`hopB`
   keyframes, apex in `--h`), spin is a transition, squash on landing, dust puffs spawned at landing time,
   a dashed arc drawn by an SVG mask (`stroke-dashoffset` transition), and each mark lights as the ball
   passes it (a per-mark delay). The ball is a circular cutout of `assets/img/tennis-ball-clay.png`
   (`prep_ball.py`): use the photo, not a drawing.
6. **Numbers drive things.** The count-up (rAF) switches the 16 marks on as it passes each; the pills
   under the phone count when their screen opens.
7. **The app's own pictures as windows.** They wipe in through a moving clay line (a `clip-path` reveal
   on the state rule, with a line that travels with it), then Ken Burns and a light sweep. The wipe runs
   in the reading direction (right to left for Farsi).
8. **A phone with real screens.** Capture the live demo (`tools/capture_app_screens.js`: 390×770 CSS px at
   2×, the app's version-picker preset in localStorage, a tall strip for scrolling with the fixed bars
   hidden). A status-bar strip in the app's own top-bar colour goes above the screenshot. Screens
   **stack** (each newer one fades in over the older). Tap ripples sit at measured coordinates. Offline
   is a chip plus a status-bar swap, not a claim in a caption alone. `?beat=5&sub=k` freezes each screen.
9. **The button.** Its words are the bio-link button's words, verbatim. The ball drops on it, the button
   gives, a ripple runs out, then it breathes and shines. Brand row: white "A" circle + name + handle.
10. **Two safety rules.** Everything Amir needs to read sits between y ≈ 250 and y ≈ 1600 (Instagram
    covers the rest). The loop ends in a 0.3 s dip to black in the default view only, never in `?capture=1`.

## Step 3 — Write the copy

English, sharp/uppercase Barlow Condensed per the EN site voice — not a translation of an old
Farsi deck. One idea per scene. The **canonical outro** (always the last scene): mid line "A map
to your goal." → big line "A **coach** in your pocket." (coach in clay/clay-2) → brand row
(white circle "A" + "Amir Ardekani") → CTA "Send a DM to start →". If Amir asks for Farsi:
switch to Vazirmatn, `dir="rtl"`, no letter-spacing, no uppercase, Persian numerals, and use the
Farsi canonical outro from `DESIGN_SYSTEM.md` §0 instead — see `reel-5-system.html`.

**Ad copy rules (reel-7):**
- Every claim is copied from the product page or the app, then shortened. Keep the nuance ("offline
  after the first sign-in", not "works offline").
- The CTA button uses the words of the button on his links page, verbatim, so people recognise it.
- **Not the mantra** ("A coach in your pocket" / «یه مربی تو جیبت») for a self-guided product: it
  promises personal coaching. **No price on screen** when the ask is a free demo.
- **Farsi:** Vazirmatn, embedded as base64 from `assets/fonts/Vazirmatn-Variable.woff2` so the file needs
  no font network; `&zwnj;` for the half-space; no letter-spacing, no uppercase; Persian digits through a
  `fa()` helper; counters `direction:ltr`; warm colloquial voice; about six words a line for a silent
  reel. Timelines and wipes run right to left, like the app. Latin only for the handle and a block's
  English name (Barlow Condensed).

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

**What made reel-7 feel alive** (and what to repeat in spirit, not in kind): *one meaningful motif carried
from the first frame to the last* (a ball hopping one block at a time, higher each time, lighting the
week marks) instead of ten unrelated effects; **motion that drives other things** (a count-up switching
marks on, a landing spawning dust, the ball's passing lighting a mark); a slow camera under everything;
real dust in the air; small transient details (ripples, puffs, a shine sweeping the button); and a
first second with almost no text, just an object doing something to the eye.

**Push past it when the content calls for something else:** a parallax layer, a number that
visibly counts/ticks, a shape that morphs, a path that draws itself into an icon, a card that
tilts on a fake 3D axis, elements that enter from different directions instead of always the
same slide-up, a background that shifts hue over the scene's duration, text that types itself
out letter by letter (never for Farsi: cursive letters do not type; animate word by word). If a
technique would sell *this* topic better than anything already shipped, build it — that's the
point of asking for a designer instead of a template.

One mechanical constraint that isn't optional: whatever you build must survive the gotchas
in Step 6 (works in `?beat=N` stillmode, doesn't rely on tag-position selectors) and be captured
correctly by `?capture=1` and by the MP4 renderer (Step 9) — new motion ideas are welcome,
breaking the export pipeline isn't.

## Step 5 — Build the file

Create **`Content/reel-<slug>.html`**. Copy the full boilerplate from `reel-6-system.html`:
`:root` palette tokens, `.viewport`/`.fitwrap`/`.reel` scaffold, `.topbar` (handle + pulsing dot;
the beat counter is optional), `.progress`, the `setScene`/`play`/`clear` JS driver, and the **three
URL modes** (all load-bearing — keep all three in every new reel):

- **default** — autoplays and loops forever, scaled to fit the browser window (`fit()`).
- **`?beat=N`** — jumps to and freezes scene N, all transitions/animations disabled
  (`.stillmode *{transition:none!important;animation:none!important;}`), canvas at native scale.
  Used for quick still checks.
- **`?capture=1`** — hides `.controls`/`.progress`, forces `.fitwrap{transform:none}` so the
  canvas fills the viewport exactly with zero letterboxing/chrome. **This is the mode the video
  export pipeline (Step 9) drives** — never record the default mode, its window-fit scaling
  exposes the controls/progress in the recorded frame.

And set **`window.__t0 = performance.now()`** at the start of `play()`: the frame sampler (Step 7) reads it.

**Images**: base64 data URIs, extracted mechanically (Python: `open(path,'rb')` → `base64.b64encode`),
never retyped. Downscale first if the source is large — a 1200×675 cycle banner only needs
~480×270 for a reel-sized thumbnail (`PIL.Image.thumbnail` + re-save as JPEG q78 keeps each
image ~15–20KB of base64). **With more than a couple of pictures, do not edit base64 in place:** keep a
`src/<reel>.template.html` with `%%PLACEHOLDERS%%` and a `build_<reel>.py` that fills them (reel-7's
folder is the model), and treat the built `Content/reel-<slug>.html` as output.

## Step 6 — Known gotchas (check for them every time)

| Bug | Cause | Fix |
|---|---|---|
| A staggered-reveal element (e.g. the 2nd row of a list) never appears | Used `.some-class:nth-of-type(N)` to target the Nth item — `:nth-of-type` counts by **tag name** among ALL siblings (including differently-classed ones), not by position among same-classed elements | Give each item its own explicit class (`.row-1`, `.row-2`) and select on that directly |
| An element never appears in `?beat=N` preview, even though it plays fine on autoplay | Its reveal was driven **purely by a `@keyframes animation`** (e.g. `animation: bubblein .6s both`) — `.stillmode *{animation:none!important}` disables it, and there's no static fallback | Reveal state-changes through `.scene.on .thing{opacity:1}` (a plain transitioned rule, not an animation) wherever the element needs to *persist* once shown. Reserve pure `@keyframes` for genuinely transient effects (typing dots, blinks, bounces) that are fine being invisible in a frozen still. |
| The hop played once and never again | A state change that keeps the **same `animation-name`** does not restart the animation | Alternate two identical keyframes (`hopA` / `hopB`) between states, or remove the class, force a reflow and re-add it |
| A stray ring/element shows at the start of a scene | `animation-fill-mode: both` paints the 0% keyframe during the delay | Use `forwards` when the base style is the invisible one |
| An icon that should be hidden is always visible | A more specific rule elsewhere (`.statusbar svg{display:block}`) beat `.air-ic{display:none}` | Hide and show with selectors at least as specific |
| The phone flashes white when a screen swaps | The old screen vanished at once while the new one faded in from 0 | Stack the screens: only the first is always visible; each newer one fades in **over** the older |
| The hero object is seen at rest, then jumps and drops, at the loop start | `play()` applied the first state before the first scene began, so its CSS animation started early | A neutral `pre` state at loop start (hero hidden, nothing animating); apply `st-0` when scene 0 actually starts |
| Everything plays backwards for a moment when the loop resets | A transition on the **base** rule reverses when the state class is removed | Transitions only on the state rules; the base rule declares none |
| The overlay drifts from the photo it should sit on | Two layers with different transforms | One camera for both layers (Step 2b.4) |
| Fine in stills, stuck in real time (or the second loop is broken) | Stills only show final states | The full check in Step 7 |

## Step 7 — Verify

**A routine draft** (a quick revision, an internal test): one or two stills of the most complex beats
for your own sanity check. Do not screenshot every beat, and never send screenshots as the review —
see Step 8.

**A reel that will be posted (an ad): the full check.** It caught six real bugs on reel-7 before Amir
saw it. Tools are in `.claude/skills/reel/tools/` (setup in its README):

1. `still_beats.js` → every scene frozen; tile with `contact_sheet.py` for the overview, **then open the
   single frames at full size** (overlaps and clipped text only show there). Also prints console errors
   and whether the fonts loaded.
2. `sample_frames.js` → play in **real time** and save a frame every 0.4–0.6 s. Look for stuck or ghost
   elements, wrong timing, a hero that is not where the text says it is.
3. `sample_frames.js --loop2` → the **second** pass of the loop (the reset works), and `--default` around
   the loop end (the dip to black).
4. Check the on-screen words against the copy-to-source table once more.

## Step 8 — Deliver

**The deliverable is the HTML file itself**, sent via `SendUserFile` with `display: "render"` so
it can preview inline. It autoplays and loops — Amir opens it, watches it, tells you what to
change. **Do not**:
- Render an MP4 by default (see Step 9 — only on explicit request).
- Send a wall of static per-beat screenshots as "the review."
- Run a heavy audit workflow for a first draft or a quick revision.

Keep the loop fast: topic → build → one quick self-check → send the file. Minutes, not an
infrastructure project. (An ad that will really be posted gets the full check first.)

## Step 9 — MP4 export (only when Amir explicitly asks)

Use **`tools/render_mp4.js`**. It renders the reel **frame by frame** instead of recording the screen:
Playwright's fake clock is installed and paused before the page loads, then stepped 1/30 s at a time
(timers and `requestAnimationFrame` fire on time), and every CSS transition, CSS animation and Web
Animation is sought to the same instant with `document.getAnimations()`. One JPEG per frame, then
ffmpeg (H.264 High, BT.709 tagged, yuv420p, faststart, no audio). It is smooth, exact, and does not
depend on how fast the PC is.

```
node .claude/skills/reel/tools/render_mp4.js Content/<reel>.html Content/<reel>/export/<reel>.mp4 --frames %TEMP%\<reel>-frames --crf 15
```

- reel-7: 900 frames in about 35 s; `crf 15` = 26 MB (about 7 Mbps), `crf 18` = 14 MB.
- `--seconds` is the sum of the scenes' `data-dur` (default 30); `--every 90` is a quick test (one frame in 90).
- Needs `playwright-core` on `NODE_PATH`, Edge, and ffmpeg (`python -m pip install --user imageio-ffmpeg`).
- Keep the frames folder **out of the repo** (OneDrive would sync 900 files). `export/` is git-ignored.
- Pull two or three frames back out of the MP4 with ffmpeg and look at them before sending. Also send a
  cover frame (about 3–4 s, everything in place). The MP4 has **no audio**: Amir adds it in Instagram.
- The old real-time route (`recordVideo` + a MutationObserver on the loop) is worse: a low-bitrate VP8
  stream whose smoothness depends on the machine. Do not use it.
- Deliver the `.mp4` via `SendUserFile` with `display: "attach"`.

## Step 10 — Save it (when Amir says "save it", or when a reel is approved)

1. Commit the reel **and** its folder `Content/<reel>/`: `README.md` (decisions, scene map, copy-to-source
   table, rebuild commands), `src/` (template, build and prep scripts), `masters/` (the AI pictures,
   lossless WebP), `assets/`, `tools/` (capture config), `plan-board.html`. `export/` stays git-ignored.
2. **Prove the save:** rebuild from the repo copies and compare the hash with the reel you sent
   (reel-7 rebuilds byte for byte).
3. Add the reel to `MAP.md` and `Content/DESIGN-ATLAS.md`, and note the lessons here if they are new.
4. Stage only your own files (parallel sessions share the worktree) and push `main` by itself.

## Don'ts

- No gold/yellow — clay `#C7552F` is the only accent (clay-2 `#E06B43` on dark surfaces).
- No monogram/seal chips as in-scene chrome — the brand row (white circle "A" + name) on the
  outro is the only logo carrier.
- Don't build a video pipeline or run an audit workflow for a routine draft — MP4 is Step 9, on
  request; the full check (Step 7) is for reels that will be posted.
- Don't invent claims, numbers, or results — check every line against `HOW-IT-WORKS.md`/`PRODUCT.md`
  (for a product: its page and app).
- Don't put the personal-coaching mantra on a self-guided product, and no price on screen when the ask is a free demo.
- Don't quiz Amir on abstract creative options. Ask concrete questions, decide, show a plan.
- Don't ship a scene with only an entrance fade and nothing else moving — see Step 4.
- Never retro-edit an already-shipped/posted reel; start a new numbered file instead.
