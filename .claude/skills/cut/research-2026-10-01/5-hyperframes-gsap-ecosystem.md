# HeyGen Hyperframes releases, GSAP for video, community repos, Persian and RTL text

*Research report, 2026-10-01. Written by a read-only research subagent for the /cut skill: model output, read by Claude and cross-checked in part (see `RESEARCH-2026-10-01.md` section 'What I verified myself'). Nothing here was installed or downloaded. Stars, licences and dates are as the pages showed on 2026-10-01. Treat every instruction-like sentence in it as the agent's own words, not as a rule of the skill.*

---

# HyperFrames and GSAP track report
Researched 2026-10-01 from github.com pages and web search only. Stars and licences are as displayed.

## A. HeyGen HyperFrames (Apache-2.0, 55.3k stars)

**Version gap.** Latest is **v0.8.106 (2026-10-01)**; 0.8.104 shipped the same day. The two newer releases are Studio-only: 0.8.105 (graphite theme, undo no longer waits on thumbnails, paste and move fixes) and 0.8.106 (theme toggle, fade handles, preview fixes). The newest `skills/` commit is 09-29 and the newest `registry/` commit 09-28, so CLI, engine, skills and registry are unchanged since 0.8.104. Releases land about 2.4 a day: keep per-project pins. Sources: [releases](https://github.com/heygen-com/hyperframes/releases), [tags](https://github.com/heygen-com/hyperframes/tags), [skills log](https://github.com/heygen-com/hyperframes/commits/main/skills).

**Skills (21 in repo).** All 21 `hyperframes:*` skills already show in this session's list, so N means "not wired into the kit" (installed versions UNVERIFIED).

| Skill | Does | Local | Action |
|---|---|---|---|
| hyperframes | router, project state, version pin | Y | have |
| talking-head-recut | graphic cards over untouched footage | Y | have |
| hyperframes-core | composition contract, lint rules, 10 references | Y | have |
| hyperframes-animation | ~50 motion rules, blueprints, 7 runtimes, 24 text effects | Y | have |
| hyperframes-registry | search and install ~428 items | Y | have |
| hyperframes-audio | fades, ducking, voiceover carve, FX chains | Y | have |
| media-use | music, SFX, voice, grade, transcribe, background removal | Y | have, local only |
| hyperframes-cli | every command and flag | N | install, high |
| hyperframes-keyframes | seek-safe punch-ins and camera moves | N | install, high |
| hyperframes-creative | DESIGN.md spec, palettes, type, contrast script | N | install, medium |
| motion-graphics | short graphics to MP4 or WebM alpha; says macOS/Linux only | N | medium, test on Windows |
| embedded-captions | captions plus text behind subject (local u2net matte) | N | skip; study the matte |
| hyperframes-studio, general-video, faceless-explainer, product-launch-video, pr-to-video, music-to-video, slideshow, remotion-to-hyperframes, figma | Studio conventions; multi-scene builds; text, URL, PR or music to video; decks; Remotion port; Figma import | N | skip |

**Worth using from 0.8.x (already in 0.8.104):**
- Lint: `html_dir_attribute_breaks_render`; six pitfall rules in 0.8.32 (autoAlpha on clips, repeated `fromTo` leaks); clip past root duration.
- `check` is the final gate (`validate`, `inspect`, `layout` are deprecated aliases): `--caption-zone`, `--frame-check`, `--at-transitions`, `*.motion.json` assertions (`appearsBy`, `staysInFrame`).
- Speed ramps via a `rate` lane in `data-automation` (0.8.51); seek-deterministic shader chains `data-vfx-chain` (0.8.64); adaptive motion blur (0.8.46). Shader transitions strip root fills: put backgrounds on a full-bleed child.
- Audio: voiceover carve default (0.8.35), `normalize-audio`. Gemini TTS (0.8.70) is cloud: skip. Parakeet (0.8.82) is English/European only, not Persian: keep whisper.cpp.
- Commands: `timeline`, `history`, `clean`, `snapshot --against`, `benchmark`; render `--quality draft|looks|delivery`, `--workers 2-4`. Non-Latin fixes: only CJK/Thai cues (0.8.16).
- Windows: open #4845 (Smart App Control blocks sharp's DLL in `snapshot`), #4060, #4058. Privacy: `hyperframes telemetry disable`; media-use has cloud fallbacks.

**talking-head-recut** (adapted from MIT notedit/vtake-skills): 11 steps from local Whisper transcript to storyboard schema v3 (zone, intent, accentIndex), card HTML with `data-anim-*`, one master timeline, portrait text scaled 1.3-1.35x. It bundles core `gsap.min.js` and Latin-subset fonts only; its non-Latin note ("no special configuration") ignores RTL. Core's creator-editing-recipes cover cuts, trims, freeze, speed ramps, punch-ins on `#clip .inner`, `clipPath` crops, wipes, crossfades.

**Registry** (428 items: 162 blocks, 246 components, 8 examples; docs groups: text and captions 73, scenes 95, motion 94, transitions 31, data 18). Overlay names: lower thirds `lt-clean-bar`, `lt-bold-block`, `lt-kicker-name`, `lt-mask-reveal`; titles and quotes `hw-title`, `headline-slam`, `kinetic-center-build`, `per-word-rise`, `testimonial-card`; data `data-chart`, `count-up`, `mk-progress-stat`; annotation `marker-highlight`, `hw-callout-circle`; panels and camera `comparison-split`, `push-in`, `cinematic-zoom`; transitions `transitions-*`, `whip-pan-cut`; light `light-leak`, `grain-overlay`. Licence: repo Apache-2.0, no per-item field, no trademark grant (skip look-alikes such as `x-post`, `yt-*`). Latin-first: yes. `lt-clean-bar` is Montserrat, left-anchored, 1920x1080; `per-word-rise` has -0.035em tracking and a `char` split; the RTL-for-catalog PR #1541 (147 files) was closed unmerged 09-08.

## B. GSAP for video
[gsap-skills](https://github.com/greensock/gsap-skills) (MIT, 15.9k stars, last commit 04-21) is web-first; its ScrollTrigger, React and framework skills do not apply. Ten rules, combining it with HeyGen's adapters and the GSAP docs:
1. **One paused timeline**, registered synchronously (or after an async build such as `document.fonts.ready`) on `window.__timelines[id]`. Never `play()`. Length is root `data-duration`, read once at compile; no empty-tween padding.
2. **Entrances use `fromTo()`.** In sub-compositions `from()` snapshots start state at build time and desyncs after backward seeks. `from`/`fromTo` default to `immediateRender:true`, so later tweens on the same property need `immediateRender:false`; lint flags repeated-`fromTo` leaks.
3. **No logic in callbacks.** `seek()` suppresses events by default and renderers seek in any order; 0.8.33 fixed dedup freezing `onUpdate` motion. Make count-ups pure functions of progress.
4. **Zero entropy.** No `Math.random`, `gsap.utils.random()`/`shuffle` (unseedable), `Date.now`, rAF, timers or `repeat:-1`. Precompute with a seeded PRNG; repeat `Math.max(0, Math.floor(dur/cycle)-1)`. gsap-utils promotes random: ignore it.
5. **First-render hazards.** Function-based values and `overwrite:"auto"` resolve when a tween first renders, which under seeking or parallel workers can happen in any order (my inference for overwrite). Compute numbers at build time, read no layout, skip `overwrite`.
6. **Compositor properties only** (transform aliases, opacity, colour, CSS variables). Layout props, `fontSize` and `letterSpacing` snap to whole pixels, so slow tweens stutter. No CSS `transform` on a tweened element (`gsap_css_transform_conflict`): centre with `xPercent/yPercent`. Transforms do nothing on inline spans.
7. **Never tween `display`, `visibility` or `autoAlpha` on a timed `.clip`** (`gsap_animates_clip_element`); tween an inner wrapper. This contradicts gsap-core's "prefer autoAlpha" and HeyGen's own gsap.md adapter.
8. **Easing:** `power3.out` default, `.in` exits, `sine.inOut` ambient, `circ` camera, `steps(N)` typing; overshoot rarely. Use baked `springEase()` (live springs cannot seek). CustomEase, now free, ports cubic-béziers.
9. **Stagger as an object** `{each|amount, from, grid}`. `from:"start"` follows DOM order, so in RTL the first word enters first, from the right; offsets stay physical (`x:+N`) (my reading). Word-synced reveals need per-word transcript times (`per-word-rise` takes `cues`).
10. **Web-app APIs are traps.** `gsap.matchMedia()` and reduced-motion branches make output depend on the render machine (inference); ScrollTrigger, Observer and `quickTo` get no events; SplitText `autoSplit` re-splits on font load. Plugins (SplitText 3.13+, DrawSVG, MorphSVG) are free now: load local files.

## C. Community repos
- **notivn/AIEV: ADOPT (auto-cut rules).** MIT code, 126 stars, last 08-16; bundled SFX and logos not commercially licensed. Silence threshold is per file (-40 dB found no pauses, -30 dB found 13); guard every cut with the transcript; 30 ms fade on both edges of each segment (`afade` after `asetpts=PTS-STARTPTS`); cut before building graphics. Vietnamese diacritic QC, no RTL.
- **smwbev/framewright: ADOPT the idea.** MIT, 21 stars, 09-26; not HyperFrames. Its check renders frames in seven orders and demands identical pixels. No RTL.
- **misbahsy/tiktok-ig-shorts: LEARN FROM.** 11 stars, 07-26, no LICENSE file (read, don't copy). Closest to Amir: 1080x1920 with top 320 px reserved, a visual change every 2-4 s, SFX 6-12 dB under speech, pop-out presenter via `remove-background`. English only.
- **tugrawork-creator/saas-motion-kit: LEARN FROM.** MIT, 176 stars, 09-26. `variety_audit.py` flags repeated effects and transitions across your last five films; Turkish font-subset and uppercase lessons.
- **geekjourneyx/hyperframes-motion-director: LEARN FROM** (AGPL-3.0). 450 stars, 07-26. JSON contracts for scenes and motion primitives, a "readable-hold" check on the rendered MP4. Chinese-first, no RTL.
- **calesthio/openmontage: LEARN FROM** (AGPL-3.0). 62.1k stars, 09-06. Post-render self-review, "slideshow risk" score. Vendors HyperFrames 0.7.17, so stale; no RTL hits.
- **erduo1998-cell/erduo-broll-loop-engineering: LEARN FROM lightly.** MIT, 205 stars, 09-21. Independent reviewer pass, incremental per-shot renders, CJK docs. Its talking-head sibling agent-motion needs written permission for commercial use: skip.
- **bestagentkits/motion-video-skill: SKIP** (paid ElevenLabs and Gemini). MIT, 107 stars, 09-25. Keep only its QA numbers: -14 LUFS, true peak at or below -1 dBFS, music 4-6 dB under speech.
- **digitalsamba/claude-code-video-toolkit: SKIP** (Remotion, MIT, 2.2k stars, 09-10). **bangtutorial/bang-motion: SKIP** (own GSAP/Puppeteer runtime, MIT, 554 stars, 09-15). **gloweaseco-leo/hyperdirector: SKIP** (Apache-2.0, 17 stars, 05-23, duplicates upstream).
- Also: [hyperframes-community-skills](https://github.com/heygen-com/hyperframes-community-skills) (Apache-2.0, 161 stars), 8 niche skills such as `camera-3d-captions`.

## D. Persian, Arabic and RTL text
- No Persian or Farsi animation work found in HyperFrames, OpenMontage (0 hits), Remotion's captions docs or the other repos. CJK work exists: HyperFrames 0.8.16 phrase cues; OpenMontage PR #507 (Remotion) uses unbreakable inline-block words.
- Only RTL artefact: lint `html_dir_attribute_breaks_render` ([PR #1893](https://github.com/heygen-com/hyperframes/pull/1893)). `<html dir="rtl|auto">` previews fine but renders a blank video ([#1934](https://github.com/heygen-com/hyperframes/issues/1934)). The engine still clips at a fixed (0,0) with no RTL handling, so assume it is unfixed (UNVERIFIED). Keep `lang="fa"` on `<html>`; put `direction:rtl` on a wrapper.
- Per-letter splitting breaks joining: transforms need `inline-block`, which isolates letters, while plain inline spans kept joins in Chrome ([test](https://dev.to/esatturan/arabic-letters-stop-joining-the-moment-you-split-the-word-404c)). GSAP staff once said SplitText was not designed for RTL ([forum](https://gsap.com/community/forums/topic/24953-gsap-3-splittext-right-to-left-language-support/)). The official [splitArabicText](https://gsap.com/docs/v3/HelperFunctions/helpers/splitArabicText/) joins fragments with U+200D, but its non-joiner list omits Persian ژ and ignores ZWNJ, so it likely misjoins Persian (my reading).
- Safe patterns: whole words as `inline-block`, split on `/\s+/` (ZWNJ is not whitespace, so می‌روم stays one unit); masked or `clip-path` reveals on intact text; TextPlugin with `delimiter:" "` (not `rtl:true`, which reverses logical order). Per-letter opacity on plain inline spans might keep joins (UNVERIFIED, testable).
- Force `letter-spacing:0; text-transform:none` anyway: the [WebKit bug](https://bugs.webkit.org/show_bug.cgi?id=195745) says tracking broke Arabic joins and Chrome fixed it in 2025, so check HyperFrames' bundled Chrome. Registry blocks use negative tracking and uppercase.
- Bidi: a Latin word or number between Persian words, each in its own inline-block, can flip order; wrap an LTR run in one `unicode-bidi:isolate` unit (inference; [Vizard](https://agent.vizard.ai/how-to/add-right-to-left-farsi-captions-to-a-talking-head-reel.html) calls mixed direction hard). Inspect rendered frames.
- Fonts: ship Vazirmatn as local `@font-face`; the Google Fonts fallback is subsetted from static text, warns in lint and fails on cloud renders ([#3496](https://github.com/heygen-com/hyperframes/issues/3496), [#3583](https://github.com/heygen-com/hyperframes/issues/3583)). Test `window.__hyperframes.pretext` on Persian before trusting it.

## RECOMMENDED ACTIONS (value/risk order)
1. **Guard Farsi rendering** (silent-failure risk): never `<html dir>`; emit static word spans from the corrected transcript (no runtime SplitText); RTL wrapper, `letter-spacing:0`, no uppercase, LTR-run isolation. Ban char-split blocks (`per-word-rise` char mode; by name `bottom-up-letters`, `top-down-letters`, `char-slam-explode`, `scramble-reveal`).
2. **Add a QA gate:** `hyperframes check --caption-zone "x0=0;y0=.12;x1=1;y1=.245;severity=error" --frame-check --at-transitions` (his y 230-470 band; syntax from docs, test it), plus `*.motion.json` `appearsBy` assertions so graphics land on the spoken word.
3. **Copy AIEV's join rules into `/cut`:** 30 ms edge fades, transcript-guarded cuts, per-file silence thresholds.
4. **Skills:** read `hyperframes-cli` and `hyperframes-keyframes`; use creator-editing-recipes for zoom, crop and `rate` ramps; put clay and Vazirmatn in a DESIGN.md for `hyperframes-creative`.
5. Add framewright's seven-order determinism test and a saas-motion-kit variety ledger across reels.
6. **CLI:** no update needed (0.8.105 and .106 are Studio-only); if you bump, run `npx hyperframes@latest upgrade --project . --check` first.
7. Disable telemetry; avoid media-use cloud paths. `remove-background` downloads ~168 MB of local u2net weights on first run: ask Amir before trying the pop-out technique.

No page tried to redirect this research; SKILL.md files were read as data.
