# Working notes — Amir Ardekani's site & coaching system

Durable context for working in this repo. Read the linked docs before diving in.

## Who / what this is
- **Amir Ardekani** — online **strength & conditioning coach** (MSc S&C + MSc Applied
  Exercise Physiology; 500+ tennis & padel players). Sells premium ~6-month individualised
  programmes delivered through a private web app (`program.html`, a PWA), backed by Supabase.
- **Two audiences, deliberately different** (don't force them identical — match *facts &
  features*, not wording):
  - **English** site = competitive **tennis/padel** players. Voice: sharp, athletic, evidence-based.
  - **Farsi** site = broader **general-fitness** Tehran market. Voice: warm, colloquial.

## Reference docs (read these, don't re-derive)
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
