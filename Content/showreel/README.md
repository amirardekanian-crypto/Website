# Motion reel ’26 — a 15-second showreel, built in code

A self-made motion-design reel: **1920×1080, 30 fps, exactly 15.000 s, with a synthesized soundtrack.**
Eight disciplines, one per bar, joined by seven designed transitions: point · type · form · depth · flow ·
interface · rhythm · lockup. Everything is procedural: no stock, no generated footage, no samples, **no
generation credits spent**. It is Claude's own piece (the lockup says so), so it deliberately does *not* use
Amir's brand rules (Farsi, clay-only accent, phone mock-ups); it is not one of his ads and not site content
(`Content/` is excluded from the Pages build, so nothing here is served).

[`claude-motion-reel.mp4`](claude-motion-reel.mp4) is the finished video (≈19 MB) · [`poster.jpg`](poster.jpg) is its title card.
The repo ignores `Content/*/export/`, so scratch output such as `export/cues.json` stays local and the finished files sit beside this README.

## The eight bars

128 BPM, 4/4. One beat = 0.46875 s, one bar = 1.875 s, **8 bars = exactly 15.000 s**. Every hit sits on that grid.

| Bar | Time | Shot | What it shows | How |
|---|---|---|---|---|
| 1 | 0.0 | **POINT** | a dot arcs, lands, a ruler shoots out; M-O-T-I-O-N drops in a 32nd-note roll; the dot hops over and becomes the full stop | squash & stretch, ball physics, rebound, dust |
| 2 | 1.875 | **TYPE** | *EVERY FRAME IS a DECISION*, one word per 8th, each with its own move; a live cubic-bezier **graph editor** and a **spring** card re-tune on every word | mask rise, staggered drop + overshoot, elastic pop, **weight sweep 200→900**, 3D extrusion |
| 3 | 3.75 | **FORM** | 144 cells morph target → quarter-tiles → pill bars → one disc | one rounded-rect per cell, corner radii/rotation/colour interpolated, radial / sweep / outside-in staggers |
| 4 | 5.625 | **DEPTH** | trefoil knot draws itself, takes a spin kick, a scan line flips it to X-ray, camera dives through it | 8,320-quad software 3D: rotate, project, cull, painter's sort, Fresnel + specular + iridescent shader |
| 5 | 7.5 | **FLOW** | 5,200 particles burst, ride a curl-noise field, then lock onto the glyphs of *FLOW* on the beat and detonate | pre-simulated at 1/120 s, additive light trails, targets sampled from real outlines, spectrum sorted left→right |
| 6 | 9.375 | **INTERFACE** | bento dashboard: chart draws, donut counts, a cursor flips a toggle, drags a slider, ticks a checklist | springs (`L.spring`), cursor path with press + ripple, count-ups, ECG strip |
| 7 | 11.25 | **RHYTHM** | DOT · LINE · RING · SQUARE · TRIANGLE · CROSS · ARC · POINT, eight plates on eight-notes | seven cuts, each a different technique: whip, iris, blinds, glitch, zoom, pixelate, flip |
| 8 | 13.125 | **CLAUDE.** | the dot lands as the full stop, hairline, credits, tagline, fade to ink | the bookend of bar 1; the fade lines up with frame 0 so it loops |

Transitions (all land on a bar line): dot flood · skewed ink slab carrying the next section number · cobalt-disc
portal · glitch cut on a flash · split-open · whip pan · flash cut.

## How it works

- **`src/engine.js`** — `renderFrame(f)` is a *pure function of the frame number*; nothing is kept between frames, so any
  frame can be rendered alone, in any order, on any worker. Time is **supersampled** (6–26 samples per frame, 0.6-frame
  shutter) for real motion blur. Shots draw to a canvas; a transition receives the outgoing and incoming shot as
  canvases and composites them. Every `R.hit()` shakes the camera and spikes chromatic aberration.
- **`src/post.js`** — finishing pass once per output frame: luminance-masked bloom (keeps colour, so flat coral never
  turns yellow), radial chromatic aberration, vignette, film grain (also dithers the 8-bit gradients).
- **`src/hud.js`** — crop marks, SMPTE timecode, section label, 8-segment progress; drawn after post so it stays sharp.
- **`src/lib.js`** — easing, `bezier()`, `spring()`, seeded noise/PRNG, palette, text helpers.
- **`src/shotN-*.js`, `src/transitions.js`** — the choreography. Each shot registers its own **cues**
  (`R.hit`, `R.cue`) next to the animation that causes them.
- **`tools/audio.py`** — reads the cue sheet the picture exports and synthesizes the track with numpy/scipy (D minor,
  F-major pentatonic over Dm / B♭ / F / C): kick, sidechained bass and pads, claps, hats, plucks, bells, risers, whooshes,
  UI clicks, a rising stab per plate, a final Dm chord with the 9th. Picture and sound share one source of timing.
- **`tools/render.js` + `tools/encode.py`** — Playwright drives `reel.html` frame by frame (4 pages in parallel,
  ~2.5 min for all 450 frames), `encode.py` loudness-normalises (two-pass, −14 LUFS / −1.5 dBTP) and writes H.264 + AAC.

## Rebuild

```
# once: node + Playwright with a Chromium, and  pip install numpy scipy imageio-ffmpeg pillow matplotlib
cd Content/showreel
python3 -m http.server 8000                     # live, lighter-blur preview at http://localhost:8000/reel.html
                                                # (Space pause · ←/→ frame · Shift+←/→ beat · R restart · ?t=7.5 freeze)
node tools/render.js --cues export/cues.json                                   # 1  the cue sheet the picture makes
python3 tools/audio.py export/cues.json $TMP/soundtrack.wav --diag --plot $TMP/audio.png   # 2  the soundtrack (+ band report)
node tools/render.js --out $TMP/frames --workers 4                             # 3  450 PNG frames
python3 tools/encode.py $TMP/frames $TMP/soundtrack.wav claude-motion-reel.mp4 --crf 19   # 4  the MP4, verified
```

Quick looks: `node tools/render.js --out $TMP/s --at 2.2,7.5,13.9 --w 960` (stills at those seconds) ·
`--range 100-113 --samples 1` (a few frames, no blur) · `python3 tools/contact.py sheet.png $TMP/s --cols 4` (contact sheet).
`render.js` finds Playwright globally or locally; `CHROMIUM=/path/to/chrome` overrides the browser.

## Changing it

- **Timing is in seconds from the shot's start** and every shot is one bar (`R.BAR` = 1.875). Cue times are **absolute**
  (`T0 = R.BAR * shotIndex` + local time): shots 2–8 each define `T0` for this. A wrong offset moves the sound, not the picture.
- After any change to a shot's timing, re-run step 1 so `export/cues.json` (and so the soundtrack) follows.
- Colours live in `L.PAL` (`lib.js`): ink, bone, coral `#FF5530`, cobalt `#2A45FF`, mint, lilac. Yellow/gold stay out.
- A transition's `pre`/`post` set its window around the bar line; `fx(p)` adds chromatic aberration or flash;
  `fxMix` decides when the post settings cross over (light scenes switch early, or the bloom washes them out).
- Fonts: Unbounded (display), Instrument Serif (italic accent), JetBrains Mono (HUD), Inter Tight (UI); all SIL OFL 1.1, licences in `fonts/LICENSES.txt`.
- The MP4 is ~19 MB. Re-encode with a higher `--crf` for smaller, and don't commit a second copy each time you tweak: it stays in history.
