# Working notes — Amir Ardekani's site & coaching system

Durable context for working in this repo. Read the linked docs before diving in.

## Who / what this is
- **Amir Ardekani** — online **strength & conditioning coach** (MSc S&C + MSc Applied
  Exercise Physiology; 1000+ tennis & padel players). Sells premium individualised
  programmes (USD tiers: $70/1mo · $180/3mo · $300/6mo — see `Content/PRODUCT.md`)
  delivered through a private web app (`program.html`, a PWA), backed by Supabase.
- **Two audiences, deliberately different** (don't force them identical — match *facts &
  features*, not wording):
  - **English** site = competitive **tennis/padel** players. Voice: sharp, athletic, evidence-based.
  - **Farsi** site = broader **general-fitness** Tehran market. Voice: warm, colloquial.

## Reference docs (read these, don't re-derive)
- `MAP.md` — **start here.** The atlas: one linked index to every page, asset, skill, doc and design element.
- `CODEBASE.md` — technical map of the repo.
- `Content/PRODUCT.md` — what the product/business actually is (internal brief; pricing, voice, backend).
- `Content/HOW-IT-WORKS.md` — customer-facing explainer of the coaching process.
- `.claude/COACHING-PRINCIPLES.md` — Amir's codified coaching philosophy; `/program-*` skills read it.
- `.claude/skills/*` + `.claude/agents/athlete-brief.md` — the coaching pipeline (intake → roadmap → design → engage → assemble). `.claude/coaching-log/` is the coach-only per-athlete rationale log.

## Site layout (GitHub Pages → amirardekani.com)
- **English is the default**: `/` = `index.html`. **Farsi** = `/index-fa.html`. `index-en.html` is a
  permanent redirect to `/`. Language toggles + `hreflang`/canonical are set accordingly.
- Shared **nav/footer** are injected by `assets/js/shared.js` from `partials/nav.html` + `partials/footer.html`.
  CSS lives in `assets/css/` (`tokens.css` → `base.css` → `components.css`); page-specific styles are inline.
- Green hero + green nav are **homepage-only**, scoped via `body.is-home`. The nav logo mark is global.
- The Farsi site is the **aesthetic reference Amir likes**: green radial-gradient hero, white text +
  clay (`--accent-2` #C7552F) accent, logo mark (white rounded square w/ `assets/img/icon-192.png`),
  and gentle section banding (`#FAF7F2` ↔ `#F1ECE3`).

## How Amir works (preferences)
- **Ship it live.** He expects work committed, pushed, AND merged so it's live — he iterates on the
  live site. Dev on branch `claude/website-write-access-o2o0kj`; ship via PR → merge to `main`
  (Pages auto-deploys). Don't stop at "pushed to branch."
- **Push back** when something's wrong or stale; fix at the **source** and keep the two language
  sites consistent on facts. He gives blunt feedback — that's normal, not a problem.
- **Verify before merging.** Render changes headless and check them.
- **Names should be cool, not literal.** Workout titles, article headlines, post hooks — Amir wants
  evocative, punchy names (e.g. "Banded Lower Burner"), not flat descriptions ("Bodyweight & Band
  Strength"). Put the literal description in a tag/subtitle. When unsure, offer 3–4 options and let him pick.

## Design work (Claude is Amir's visual designer)
Standing role: Amir asks for carousels, reels, posts, result cards, web/app redesigns,
animations. **Always start at `Content/DESIGN-ATLAS.md`** — the designer's working file
(asset shelf, format recipes, current-vs-retired rulings, app-look cheat sheet, his taste),
with `Content/DESIGN_SYSTEM.md` as the brand bible. For reels specifically, use the
**`/reel` skill** (`.claude/skills/reel/SKILL.md`) — it has the full build process, the
continuous-motion technique library, known stillmode gotchas, and the MP4 export pipeline.
Newest-taste references:
`Content/carousel-warmup-tennis.html` (carousel), `Content/reel-6-system.html` (reel, EN),
`index-fa.html` (web — visual style only, see note below). Non-negotiables in one line: clay
`#C7552F` is the ONLY accent (clay-2 `#E06B43` on dark) — **no yellow/gold, ever**; green
`#0E4A36` / paper `#FAF7F2`; Barlow Condensed (display, uppercase) + Barlow (body/app-UI);
canvases 1080×1350 / 1080×1920; real assets over stock; outputs self-contained (base64);
html2canvas drops SVG `<use>` and CSS transforms — inline images, hard px. Instagram handle
in new designs = **@amirardekanian** (site: AMIRARDEKANI.COM); never retro-edit
already-shipped designs.

**Reel delivery process (Amir, 2026-07-02 — was too slow first time, fix this):** For a reel,
the deliverable is **the HTML file itself**, sent via SendUserFile so he can open/preview and
screen-record it himself. **Do NOT render an MP4 unless he explicitly asks for one** — skip
the whole Playwright/ffmpeg pipeline by default. **Do NOT send static per-beat screenshots**
as the review artifact — the interactive file *is* the review. Keep the iteration loop fast:
no multi-agent audit workflow, no video pipeline, for a routine draft/revision — save those
for when he asks to finalize/export. Design direction: he wants reels **"fully animational,
lots of moving things, being cool"** — not a slideshow of static cards with an entrance fade.
**This is a feeling, not a fixed effect list — don't lower creativity to a recipe.** He said
explicitly: keep inventing, don't reuse the same set of animations every reel. The `/reel`
skill has a toolbox (ambient drift, drawn lines, Ken Burns, typing dots, etc.) as inspiration
only — treat it as a floor to riff past, not a checklist to satisfy.

**2026-07-02 — content language directive (Amir, verbatim): "we changed everything to
english, im not creating content in farsi anymore."** Effective immediately: all NEW social
content (carousels, reels, posts, result cards) is **English**, sharp/uppercase Barlow
Condensed display per the EN site voice — not a translation of the Farsi template.
Farsi-specific rules (Vazirmatn, no letter-spacing, no uppercase, Persian numerals, RTL
mirroring) still apply only if Amir explicitly asks for Farsi again. Older Farsi social
files (`reel-1..3`, `reel-5-system`, the `carousel-*` Farsi decks) are left as shipped —
reference for mechanics only, not for language/voice.
**Scope confirmed (Amir, same day): social content only** — the live Farsi **website**
(`index-fa.html`, `form-fa.html`, `terms-fa.html`) is unaffected and stays exactly as-is
for the Tehran general-fitness audience. Don't touch those pages over this directive.

## Verifying the live site (important gotchas)
- This sandbox **cannot reach amirardekani.com** (proxy blocks the host). Confirm deploys via the
  GitHub Actions **"pages build and deployment"** run on `main` (it's `event: dynamic`), not a live fetch.
  Tell Amir to **hard-refresh** to bypass browser cache.
- For visual checks: serve with `python3 -m http.server` and screenshot with Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Two headless quirks: scroll-reveal hides
  below-fold content (inject `.reveal{opacity:1!important;transform:none!important}`) and the hero is
  `min-height:100vh` (shrink it, e.g. `.hero{min-height:520px!important}`, to capture lower sections).
- Stale **CSS cache** can render unsized elements huge (it once blew up the nav logo). Inline
  width/height on critical lockups as a safeguard.
