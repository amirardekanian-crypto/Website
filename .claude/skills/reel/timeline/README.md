# The timeline kit — a premium animated ad, built the reel-9 way (2026-10-02)

Made for **Mehraneh Zohourian's website ad** (`Content/reel-9-mehraneh/`), which Amir called "amazing". This is the playbook for doing it again,
for him or for a client. Read it before you start; the engine is small, the rules are what matter.

## When to use this kit (and when not)
| The reel is… | Use |
|---|---|
| **Mostly motion graphics + real UI captures + stills** (a site / app / product intro, an ad that needs no footage of him) | **this kit** |
| Mostly **his talking head** | `/cut` |
| A quick HTML scene-swap draft he just wants to open (no export) | the old engine, `reel-6-system.html` |
| **Generated video clips** (Higgsfield) as plates | reel-8 + the `__videoAt` protocol (`../tools/README.md`); or, for his own filmed clip, a plate here (below) |
| Sells one of his products through the 17-stage pipeline | `/ad` first; its **Route C** points here |

## The idea in six lines
1. The page is a **pure function of time**: `window.__render(t)` paints the frame for `t` seconds. Nothing runs on timers or CSS animations.
2. So **one page does three jobs**: a still at any instant (`?t=5.2`), a real-time preview (default; space = pause), and the render.
3. The render (`tools/render_timeline.js`) takes **20 sub-frames per frame** across a 180° shutter and ffmpeg averages them: **real motion blur**. Then film grain.
4. **One hero object carries the story** from the first frame to the last (reel 9: a ball; the whole reel is one rally), and every hit is a beat.
5. **Every time lives in one table** (`T` in scenes.js). The scenes, the ball and the **sound plan** read it, so picture and sound cannot drift.
6. **Audits gate the render**: safe zones, **readability** and copy-to-source. They are scripts, not opinions.

## Start (5 commands)
```
python .claude/skills/reel/tools/setup_tools.py                       # once per PC: node, ffmpeg, Edge, playwright-core (installs what is missing)
python .claude/skills/reel/timeline/new_reel.py <slug> --title "..."  # -> Content/reel-<N>-<slug>/ with a working 9 s starter in Amir's brand
node .claude/skills/reel/tools/still.js Content/reel-<N>-<slug>/src/reel<N>.template.html OUT 0.5 3.5 6.5     # frozen frames
python .claude/skills/reel/tools/sheet.py OUT/sheet.png 4 300 OUT/t_*.png                                   # contact sheet: LOOK at it, then at single frames
node .claude/skills/reel/tools/render_timeline.js <html> OUT/draft.mp4 --draft                              # half size, 4 sub-frames: the motion in about a minute
```
Edit `src/scenes.js` (the starter: hook · one number · the link) and `src/reel<N>.template.html` (DOM + CSS). Build the one-file preview with
`PYTHONIOENCODING=utf-8 python src/build_reel.py`. Run long jobs (a final render, 4–6 min) with `run_in_background` **on the node command itself**.

## The pacing rule (Amir, 2026-10-02: "the changes are too fast, there is no time to be able to read")
Reel 9's first cut was 17 s and **14 of its 33 text blocks were on screen for less than a viewer needs** (the national-team title for 0.5 s, the shortest for 0.2 s).
He felt it in one watch. The cure is a rule and a gate, not taste:

> **A block of text needs `0.8 s + 0.25 s per word` fully visible** (max 2.4 s): three big Farsi words 1.5 s, five words 2 s, a block of several lines 2.4 s.
> "Fully visible" = opacity ≥ 0.9, not still rising through its mask, inside the frame and any clip, and its text not changing (a count-up counts once it stops).

* `node .claude/skills/reel/tools/read_audit.js <reel.html> 0.1 --all` measures every block. **Zero "TOO FAST" before any render.** Reel 9 v2: 25 blocks, 0 too fast, shortest clean hold 1.5 s.
* **The hero is an obstacle too.** The audit also asks `ballState(t)` where the ball is and treats a word it hides 12% of as unread (`ball: -x s` on the line; one quick flash per hold is forgiven, a second one or a longer cover breaks the hold). Reel 9's first slower render passed on text timing alone
  and still failed this: the ball dribbled on the badge right under «سال تنیس» and its lobs between the phones crossed the title (clean hold 0.3 s of the 1.55 s it needs). No contact sheet showed it; the audit did.
  `ball_audit.js` lists each crossing. Fix it with geometry: let the ball rest or hop where there is no text (the end of a pill, a margin, a floor line below the words), and keep arcs that pass a title **under** it, not through it.
* **Choose the length from the reading budget, not from the brief.** Rough budget: hook 3–4 s, one fact per beat at 2.5–3 s each, the link 4 s. Eight facts is a 28 s reel.
  If it is too long, **cut facts, never speed up**. Say the length and the trade out loud to Amir (reel 9 went 17 s → 26 s; "10–20 s" was the first brief, readable was the real one).
* **Beat grid: 100 BPM (0.6 s)** for a readable ad; 120 BPM (0.5 s) felt frantic. Hold the hero still or hop it slowly while the viewer reads; never dribble it over a word being read.
* Fewer words beat more time: reel 9 v2 dropped its tagline from the name scene (it is still on both phones' hero) and merged two beats instead of cutting the holds.
* **Reveals build, they do not flash**: words rise one by one (`wordify` + `riseTo`), the last word solid → the hold starts there.

## What made it feel premium (carry these into the next ad)
* **A concept taken from the client's own thing.** Her site opens on a gate (tennis | padel), so the reel is built on that split, in her colours. Read the live site first; the idea is in it.
* **One carried motif, with physics**: the ball's arcs are *solved* from "apex height + arrival time" (`prepLegs`), it squashes, leaves dust, a ring, sparks and a comet tail, shakes the camera on hard hits,
  swings a medal, presses a button, and takes the colour of the court under it. Secondary motion is what separates this from a template.
* **Transitions are events, never fades**: gate doors, a wipe line with speed streaks, a medal that drops on ribbons, a seam that turns a quarter, phones that fly in on a spring.
* **Real product, not mock-ups**: the phones show captures of the live pages (`tools/capture_tiles.js`), scrolling with a velocity swish; the section label under them names what passes.
* **Real motion blur + grain** (20 sub-frames) and a 1:1 check for banding. **Sound from the same cue list** (`export_sound.js` → `make_sfx.py` → `mux_sfx.py`).
* **Honest copy**: every on-screen line traced to the source or flagged **new** for Amir (`copy_audit.py`). Facts stay as nuanced as the source (her padel side claims no padel results).
* **A cover frame and a storyboard sheet** delivered with the MP4; the fast cut kept when a slower one replaces it.

## Brand: whose is it?
* **For Amir's own ad:** `Content/DESIGN-ATLAS.md` — green `#0E4A36` / `#156A4D` / `#0a3527`, clay `#C7552F` (clay-2 `#E06B43` on dark) as the ONLY accent, paper `#FAF7F2`; **no yellow or gold, ever**;
  Vazirmatn (Farsi), RTL, no letter-spacing, Persian numerals; handle **@amirardekanian**; the canonical outro and mantra live in DESIGN-ATLAS / `ad/BRAND.md` (not for a self-guided product).
  The starter is already in these tokens. The ball: `TINTS.clay` (procedural felt ball) or his real ball photo through `loadSprite()` (`Content/reel-7-course/assets/ball.webp`).
  `/ad`'s refusal list and Iran-only prices still apply.
* **For a client:** their brand from their own live site, not Amir's. Replace the `:root` colours, `TINTS`, fonts. (Reel 9: spruce/pink + blue/lime, Lalezar.)
* **Language:** Farsi by default for social. Farsi ships only after Amir has read it: list the **new** lines at the end.

## What is in the kit
| File | What |
|---|---|
| `engine.js` | maths, easing (`E.house` = the house ease), `spring`, `bump`, `put` / `show` / `setStyle`; **the ball** (`prepLegs`, `ballState`, `drawBall` with a real 3-D seam, sprite option), `drawBursts`, `drawTrail`, `drawStreaksH/Up`, `drawConfetti`; `wordify` / `riseTo`; `addLine` / `addRect` / `drawOn`; `keyScroll`, `pressAt`, `shakeAt`, `paintSplit`; `loadSprite`, **footage plates** (`plateLoad` / `plateDraw`) |
| `driver.js` | the three modes, the preview bar, `__ready` / `__render` / `__sound`; the contract with scenes.js is in its header |
| `starter.scenes.js` + `starter.template.html` | a working 9 s reel in Amir's brand: the hook, one count-up number, the link, wipes, confetti, a sound plan |
| `build_reel.py` | inlines scripts + `../assets/*` into one self-contained HTML (`PYTHONIOENCODING=utf-8`) |
| `new_reel.py` | scaffolds a reel folder from the starter (copies the kit: a shipped reel never changes when the kit does) |

Tools (all in `../tools/`, shared): `setup_tools.py` · `still.js` · `sheet.py` · `render_timeline.js` · `safe_audit.js` · **`read_audit.js`** · `ball_audit.js` · `copy_audit.py` · `capture_tiles.js` · `extract_plate.py` ·
`export_sound.js` · `make_sfx.py` · `mux_sfx.py` · `spectro.py` · `preview_check.js`. Their headers are the manual.

## The loop that worked
1. Read the source (live site, brief, app). **Decide the concept yourself**; ask Amir only concrete things (language, the ask, voice or silent). He said "get creative": build, don't quiz.
2. Write the **T table first** (times from the reading budget), then the ball plan, then the scenes. Stills at every beat → a **sheet** → single frames at full size for anything dense.
3. Audits: `safe_audit.js`, `read_audit.js` (text timing **and** the ball), `copy_audit.py`. Fix the layout until all are clean (they found the real problems every time, and a contact sheet missed the ball covering words).
4. `--draft` render, then **frames every 0.5 s** from the MP4 around each transition (contact sheets) — ghosting only shows in real frames. A 1:1 crop for grain and banding.
5. Final render (`--sub 20 --crf 18 --grain 4`, about 4–6 min), tag BT.709 (done in the encode), `mux_sfx.py` for the sound version (PASS), cover frame (`still.js ... --query noball=1`), storyboard sheet.
6. Deliver with `SendUserFile`: the MP4, the sound version (say it was never auditioned by ear), the cover, the storyboard; list the new Farsi lines and anything the post depends on (a bio link, a photo credit).
7. Save (Step 10 in `../SKILL.md`): commit the folder, add it to `MAP.md` / `DESIGN-ATLAS.md`, update this README if you learned something.

## Gotchas met on reel 9 (each cost time once)
* **Sub-frames**: 5 left ghost copies on a 6,700 px/s door move; 10 still layered a digit roll (15,000 px/s); **20 is smooth**. Slow a fast roll too (an out-cubic over 0.5 s, not out-quart over 0.45).
* **Persian "۱" is a plain vertical bar**: as a hero number it is weak. Put it in a medal / badge. Lalezar's content box is 1.6 em tall, its ink 0.75 em: audits measure the ink.
* **A comment that looks like an asset path** (`'../assets/x.webp'`) breaks the single-file build: the builder now says which file and path.
* **CDP screenshots ignore a device scale factor < 1** (downscale in ffmpeg); `-vsync` is gone in ffmpeg 9 (`-fps_mode passthrough`).
* **Bash tool**: ~8 KB per command (write long scripts with the Write tool); a `( … ) &` inside one call is not tracked (use `run_in_background` on the command); `python3` is the Store stub, use `python`.
* **Lazy images and scroll-reveals** make page captures blank: `capture_tiles.js` forces images eager, walks the page once, and takes `--css` to force `.reveal` visible.
* **file:// canvases are tainted**: compare screenshots, not `getImageData`, when testing plates.
* **Never let the ball cross a face or a word being read** (`read_audit.js` / `ball_audit.js` measure it); keep text clear of the right-hand button rail (x 920–993 below y 1171) — the safe audit knows the zones.
* **A name that shadows a helper**: in the audits' page code a local `hidden` hid the helper of the same name ("hidden is not a function"). Name page-side helpers so a loop variable cannot shadow them.
* **The mask `padding`/`margin`** on `.wm` must be larger than the glyph box or ascenders/dots are clipped as words rise.
* **A footage plate is not a `<video>`** (neither clock controls it): `extract_plate.py` → `plateLoad` → `plateDraw(ctx, 'take', t - AT + IN, ...)`; his voice goes back on with `mux_audio.py` using the same IN / AT numbers.
