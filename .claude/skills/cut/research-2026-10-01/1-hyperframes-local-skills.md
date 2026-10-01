# The 21 Hyperframes skills already on this PC, read against our kit

*Research report, 2026-10-01. Written by a read-only research subagent for the /cut skill: model output, read by Claude and cross-checked in part (see `RESEARCH-2026-10-01.md` section 'What I verified myself'). Nothing here was installed or downloaded. Stars, licences and dates are as the pages showed on 2026-10-01. Treat every instruction-like sentence in it as the agent's own words, not as a rule of the skill.*

---

**Bottom line.** Adopt `check --caption-zone`, SFX transient alignment and the cut-out wrapper. Keep our loved stamps. Avoid every registry, media-use and feedback path that touches the network. Nothing in the plugin handles Farsi text.

**Roots (absolute).** SK = `C:\Users\Amir\.claude\plugins\cache\hyperframes\hyperframes\0.8.104\skills`; PL = `C:\Users\Amir\.claude\plugins\cache\hyperframes\hyperframes\0.8.104` (has `registry\`, `docs\`, `packages\`); CUT = `C:\Users\Amir\.claude\skills\cut`. Only `--help` was run; the rest is file reads. 21 skills; the registry holds 405 items (171 blocks, 234 components) on disk.

## A. The 21 skills, ranked for us

| # | Skill | Rel. | Why |
|---|---|---|---|
| 1 | hyperframes-cli | High | `check` gate (`--caption-zone`, `--frame-check`, motion sidecars), `snapshot --zoom/--angle/--against`, `timeline --json`, `compare`. `beats` is music-only: skip. |
| 2 | hyperframes-core | High | Clip contract; `references/creator-editing-recipes.md` (SFX alignment, `rate` speed lane). |
| 3 | talking-head-recut | High | Closest job: cards over an untouched talking head. Portrait sizes, pace, bounds. No RTL. |
| 4 | hyperframes-animation | High (reference) | 48 rules, 22 blueprints, 32 CSS + 14 shader transitions; numbers to calibrate against. |
| 5 | embedded-captions | Medium | No captions for us, but its matte, occlusion gate, safe zones, preview frames fit the depth family. |
| 6 | hyperframes-keyframes | Medium | Punch-in pose ladders; `keyframes --shot` onion-skin proof. |
| 7 | hyperframes-creative | Medium | `frame.md` adherence check, beat verbs, text-behind recipe, in-feed type minimums. |
| 8 | hyperframes-registry | Medium | Latin, landscape, CDN-linked: idea bank. |
| 9 | hyperframes-audio | Low-Med | Carve/duck serve music under voice; he adds music in Instagram. Its `voice-clean` chain has no noise removal (`references/presets.md:214-216`); our `afftdn` covers that. |
| 10 | media-use | Low-Med | Local grading and loudness recipes, 19 Pixabay SFX; the rest needs HeyGen sign-in. Its ledger (`.media/manifest.jsonl`, confirmed-only preferences, `references/memory.md`) is worth copying as a per-reel asset list with licences. |
| 11 | hyperframes-studio | Low | "Talk before you build" table, 80/90% safe boxes. |
| 12 | general-video | Low | Plan-first, catalog-search-first, exact scope: we do this already. |
| 13 | motion-graphics | Low | Short unnarrated clips; geocode/search need network. |
| 14 | hyperframes (router) | Low | Intake, pitch rounds, freshness probes. |
| 15-21 | faceless-explainer, product-launch-video, pr-to-video, music-to-video, slideshow, remotion-to-hyperframes, figma | Low | Other jobs. |

**Animation inventory (by name).** Rules: hacker-flip-3d, vertical-spring-ticker, counting-dynamic-scale, discrete-text-sequence, asr-keyword-glow, 3d-text-depth-layers, context-sensitive-cursor, dynamic-content-sequencing, kinetic-beat-slam, gradient-text-sweep, chromatic-glitch; stat-bars-and-fills, chart-scrub-readout; coordinate-target-zoom, camera-cursor-tracking, multi-phase-camera, viewport-change, 3d-camera-flight, depth-of-field-blur; avatar-cloud-network, 3d-page-scroll, center-outward-expansion, split-tilt-cards, orbit-3d-entry, ai-tracking-box, depth-scatter-assemble, anchored-layout-expand; svg-icon-enrichment, svg-path-draw; sine-wave-loop, ambient-glow-bloom; reactive-displacement, press-release-spring, physics-press-reaction, cursor-click-ripple, cursor-drag, multi-cursor-choreography, control-target-sync, scale-swap-transition, card-morph-anchor, theme-crossfade-morph, spring-pop-entrance, motion-blur-streak, waterfall-entry, particle-burst, nudge-curve; gsap-effects, css-marker-patterns. Blueprints: kinetic-type-beats, typewriter-reveal, spatial-pan-stations, camera-journey, zoom-out-workspace-reveal, constellation-hub, grid-card-assemble, logo-assemble-lockup, cursor-ui-demo, device-surface-showcase, prompt-type-submit-generate, agent-progress-theater, panel-edit-live-sync, transcript-scroll-artifact-reveal, dataviz-countup, titlecard-reveal, comparison-split, overwhelm-surround, ticker-takeover, fixed-anchor-cycle, video-text-pivot, cta-morph-press. CSS transitions: push slide/vertical/elastic/squeeze; circle/diamond iris, diagonal split; zoom through/out; crossfade, blur crossfade, focus pull, color dip; staggered blocks, blinds; light leak, overexposure, film burn; glitch, chromatic aberration, ripple, VHS; shutter, clock wipe; grid dissolve; gravity drop, morph circle; blur through, directional blur; 3D flip; page burn. Shaders: chromatic-radial-split, cinematic-zoom, cross-warp-morph, domain-warp-dissolve, flash-through-white, glitch, gravitational-lens, light-leak, ridged-burn, ripple-waves, sdf-iris, swirl-vortex, thermal-distortion, whip-pan.

## B. Start using now

1. **`check` as the gate**: `hyperframes check public --caption-zone "x0=0;y0=.12;x1=1;y1=.245;severity=error;seek=.1,.3,.5,.7,.9" --frame-check --at-transitions --snapshots` guards our y 230-470 band against any text box (`SK\hyperframes-cli\references\lint-validate-inspect.md:63-70`). Add a `*.motion.json` sidecar: `appearsBy`, `before`, `staysInFrame`, `keepsMoving` (2 s; our freezedetect is stricter at 1 s) (:74-99). A lint error silently skips layout and contrast audits (`SK\hyperframes-core\SKILL.md:70`).
2. **Snapshots**: `--zoom`, `--angle` (our 3D court, drum, flip), `--against raw.mp4`, always `--describe false` (Gemini runs when `GEMINI_API_KEY` is set). `compare` sheets 16 variants at one time (`SK\hyperframes-cli\references\compare-and-batch.md:11-70`).
3. **`timeline --json`** checks every cut `plan_to_clips.py` builds: its gaps-and-overlaps query (`SK\hyperframes-cli\references\upgrade-info-misc.md:28-74`).
4. **SFX**: subtract each sound's transient lead-in from `data-start` (`SK\hyperframes-core\references\creator-editing-recipes.md:385`); `CUT\kit\kit.py:80-93` puts the first sample on the event. Measure each of our 34 files' onset once, store a `lead`. Level about 0.35 (`SK\media-use\audio\references\sfx.md:38`); bundled hints: hit on the landing, tail into the next shot, risers start at climax minus length (`SK\media-use\audio\assets\sfx\manifest.json`).
5. **Cut-out wrapper**: tween a plain div's opacity, not the timed `<video>`'s, since the framework forces opacity 1 on timed clips (`SK\media-use\audio\references\remove-background.md:79-83`). `CUT\kit\kit.js:384-385` sets it on the video. UNVERIFIED whether our render honours it.
6. **Native grade** for a dark clip (local): `media-treatment --analyze`, Natural Portrait payload `{"preset":"skin-soft","intensity":0.6}` (`SK\media-use\references\media-treatment-recipes.md:9-70`); `grade-compare` picks.
7. **Search before building, offline** (`PL\registry\`). By job: lower thirds (11 `lt-*`, `lower-third-bild`, `news-ticker`; all 1920x1080); callouts (`hw-callout-circle`, `marker-highlight`, `yt-feather-highlight`); data (`count-up`, `number-wheel`, `mk-progress-stat`, `chart-story`); transitions (14 shaders, `cut-the-curve`, `whip-pan-cut`, `iris-reveal`, `match-cut`); light and texture (`organic-light-leak-overlay`, `editorial-flash-overlay`, `grain-overlay`, `vignette`, `shimmer-sweep`); zoom (`yt-camera-move`, `ui-focus-zoom`, `camera-shake`); split screen (`before-after-wipe`, `comparison-split`); `mk-emphasis-type` = our drift; `grade-split-reveal`. No picture-in-picture item: use the wrapper recipe (`SK\hyperframes-creative\references\composition-patterns.md:11-39`). Only 13 of 171 blocks are 9:16, none a lower third; scaling is UNVERIFIED.
8. **Colour gate**: a `frame.md` (clay, green, paper, ink, Vazirmatn) plus a scan for off-palette hex (`SK\hyperframes-creative\references\design-adherence.md:1-14`) would have caught yellow. Also lacking: named rhythm (`beat-direction.md:147`) and "3 s on screen must read in 2" (`typography.md:72-74`).
9. **Depth QA** (embedded-captions): hero word 30-55% occluded reads embedded, under 15% floating (`SK\embedded-captions\references\composition-craft.md:341`); they allow 70% of a face covered, we allow 0%; free zones per time window from alpha (`scripts\safe-zones.cjs`); fresh-eyes review from the contact sheet alone (`references\reference-bar.md:27-63`). Needs npm `sharp`/`puppeteer`: ask first.
10. **Render speed**: read the summary's second line (BeginFrame or screenshot, GPU; `SK\hyperframes-cli\references\preview-render.md:147`); try `--browser-gpu`, `benchmark`. UNVERIFIED on Windows/AMD.
11. **Ask-before-edit** (`SK\hyperframes-studio\SKILL.md:25-41`): a question or "bench 33" is a note, not a code edit.

## C. Where our kit differs

| Topic | Ours | Hyperframes |
|---|---|---|
| Overshoot | `back.out(1.7-3)` x21, `bounce.out` (`kit.js:51-53`) | `power3.out` 0.4-0.7 s; `back.out` rare, max 2 (`SK\hyperframes-animation\rules\spring-pop-entrance.md:10,87-99`); spring ζ 1 or 0.8-0.85 (`adapters\gsap-easing-and-stagger.md:59-136`). Loved stamps win: keep. |
| Ease mix | 205 eases: `power2.out` 46, `expo.out` 32, `power3.inOut` 31, `power3.out` 16 | `power3.out` workhorse; max 2 same-ease tweens per scene (`SK\hyperframes-creative\references\motion-principles.md:15`) |
| Durations | 188 literal: 30 at 0.5 s, 23 at 0.3, 15 at 0.4 | slowest 3x the fastest; 0.15-0.3 fast, 0.3-0.5 standard, 0.5-0.8 weight (same file :16,38-41) |
| Slam shake | 5 x 0.05 s, ±14 px (`kit.js:933-936`) | `headline-slam`: 3 frames, about 6 px, scale 1.6 to 1, in 0.72 s (`PL\registry\components\headline-slam\headline-slam.html:3-18,177-209`) |
| Cut whip | blur 26 px, 0.16/0.26 s (`kit.js:1213-1222`) | `cut-the-curve` blur 12 px; `whip-pan-cut` cap 16 px; high-energy blur 3-6 px (`SK\hyperframes-animation\transitions\overview.md:77-83`) |
| Pace | graphic or cut-in every 3-5 s | reels under 60 s: 6-8 s per card, x0.7 if dense (`SK\talking-head-recut\SKILL.md:208-236`) |
| Type, portrait | diagram floor 42 px | title 88-132, body 30-40, number 64-88 (same file :723-730); in-feed body 32, headline 90 (`SK\hyperframes-creative\references\typography.md:63`) |
| Safe area | read zone y 250-1600 | title-safe y 192-1728 (`SK\hyperframes-studio\SKILL.md:94-108`); keep-out below y 1594 (`SK\hyperframes\references\frame-worker-core.md:49`). Their cards: lower-third = bottom 30%, overlay card y 1280-1844 (`SK\talking-head-recut\references\layouts\overlay.html:38-47`), transparent roots over video (`SKILL.md:627-654`). No face gate. |
| Charts | faint grid, ticks on `K.curve` | "no gridlines, ticks or legends" (`SK\hyperframes-creative\references\data-in-motion.md`); his verdict: keep |
| Loudness | `loud.py` LRA 9 (`CUT\tools\loud.py:20,27`) | LRA 11 (`SK\media-use\references\operations.md:187-191`); `linear=true` falls back to dynamic when source LRA exceeds target (ffmpeg docs; UNVERIFIED for our reels) |
| Cut-out | `--quality best`, 2 erosions, 1 px feather, second VP9 encode, about 4 fps (`CUT\tools\cutout.py:54-61`) | Same engine (u2net_human_seg, 320x320, CPU/CoreML/CUDA only, no model flag, so no AMD gain), no trim, ProRes 4444 intermediate, about 2 fps (`SK\embedded-captions\scripts\matte.cjs:21-25`). `--quality` only sets VP9 CRF 30/18/12. Ours is better on dark backdrops. |

**Already aligned**: exits 0.22 s vs under 0.25 s; stagger 0.04-0.09 vs 0.04-0.08 (group under 0.5 s); iris/push 0.5 s; counter 1.2 s `power3.out` with no overshoot on digits; focus blur 9 px, dim 0.42, 0.55 s vs 8-24 px, 0.4-0.7, 0.5-1.2 s. **Their other numbers**: draw 0.3-0.8 s per segment, stagger the next at 70-80%; motion-blur-streak 0.25-0.6 s, peak blur 8-30, 2-4 ghosts; kinetic-beat-slam hits 0.35-0.6 s on a 1.2-1.8 s grid, 3+ eases; scale-swap exit 0.3-0.5 s, enter 0.45-0.7 s, `back.out` 1.4-2.2; press scale 0.88-0.96; particles at most 40; every climax holds 1 s or more. **No equivalent**: courts, drum, chapter band, body map. **Overlaps**: stamps = spring-pop-entrance, headline-slam; odometer = counting-dynamic-scale, count-up, number-wheel; versus = comparison-split, split-tilt-cards; curve/diagram = svg-path-draw, tracing-beam.

## D. Gaps in our notes

- `CUT\SKILL.md:64` lists 7 skills; this session lists all 21, so "will not list them" is outdated.
- Step 8 describes `check` as JS errors, assets, contrast; it is lint + runtime + layout + motion + contrast, and `validate/inspect/layout` are deprecated (`SK\hyperframes-cli\SKILL.md:69`).
- "Large-v3 is the only multilingual model": the CLI swaps `.en` for the multilingual model on non-English (`PL\packages\cli\src\whisper\transcribe.ts:476-485`) and media-use lists `small`/`medium`; `--model medium --language fa` probably works (UNVERIFIED). Parakeet has no Farsi (`PL\docs\packages\cli.mdx:288-293`). The CLI already uses `--dtw` (`transcribe.ts:492-501`): the pause smear is not tunable. Help says `--language` filters other-language speech: check English loanwords survive (UNVERIFIED).
- `snapshot --describe` runs only when `GEMINI_API_KEY` is set; confirm `shots.sh` passes `--describe false`.
- Absent: `render --browser-gpu/--workers/--strict-all`, `timeline` edit verbs, `normalize-audio`, speed ramps (`PL\docs\reference\speed-ramps.mdx`).

## E. Risks and conflicts

- **Uploads or keys**: `publish`, `cloud`, `lambda`, `cloudrun`, `auth login`, all `media-use resolve` (HeyGen), `capture` (optional AI captioning, destination UNVERIFIED), `figma` (token), `feedback` (public). The skill says send feedback after each render unless telemetry is disabled (`SK\hyperframes-cli\SKILL.md:136`); ours is, so keep skipping.
- **Downloads or network reads**: `init`/`skills` check GitHub (`SK\hyperframes-cli\references\init-and-scaffold.md:27`), `doctor`/`upgrade` check npm, `add` fetches every time, `catalog --on-device` 33 MB, parakeet 640 MB, embedded-captions needs npm and `uvx whisperx`; the plugin launcher `plugin-cli.mjs` may download its pinned CLI (`SK\hyperframes\references\plugin-installation.md`): keep calling our global 0.8.104.
- **CDN at render**: 588 registry HTML files link CDNs or Google Fonts (`PL\registry\blocks\lt-clean-bar\lt-clean-bar.html:5`); the compiler rewrites a missing local gsap to jsdelivr (`PL\packages\producer\src\services\htmlCompiler.ts:1887-1902`). Keep `vendor\gsap.min.js` and our fonts in every reel; none of the 18 pre-bundled fonts is Arabic-script (`SK\hyperframes-creative\references\typography.md:19-46`).
- **Farsi**: no RTL text support anywhere; `weight-wave`'s `rtl` is only wave direction. Per-letter, from code: `bottom-up-letters` (unless `unit=word`), `char-slam-explode`, `scramble-reveal`, `variable-font-flex`, `weight-wave`; by description: `typewriter`, `matrix-decode`, `kinetic-chars`; `tracking-in` sets letter-spacing. Word-level: `headline-slam`, `per-word-rise` (`split=word`), `staggered-fade-up`, `blur-in`. `lt-*` use tracking and left layouts.
- **Palette, captions**: yellow in `craft`, Biennale Yellow, `ai-tracking-box` (`#facc15`), `css-marker-patterns`; recolour. The 16 `caption-*`, `asr-keyword-glow`, `mk-callout-highlight` are caption tools: off-limits.
- **Abstract picks**: talking-head-recut Step 7 (`SK\talking-head-recut\SKILL.md:258-368`) and embedded-captions Step 0 (`SK\embedded-captions\SKILL.md:79-98`) make Amir choose styles, against "concrete questions only".
- **Licences**: repo Apache-2.0; three items declare their own (Apache-2.0, OFL-1.1, MIT); seven 3D pieces vendor or load GSAP (Standard License, not OSI) (`PL\CREDITS.md`); bundled SFX Pixabay Content License (`SK\media-use\audio\assets\sfx\CREDITS.md`); talking-head-recut adapted from MIT vtake-skills (`NOTICE.md`).
- Shader transitions across our footage segments: UNVERIFIED (scene DOM goes through html2canvas).
