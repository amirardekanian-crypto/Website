---
name: carousel
description: Build a ready-to-post Instagram carousel (1080×1350, Farsi/RTL) from Amir's script, story, or topic. Use whenever Amir provides content for an Instagram post or asks for a carousel — a personal story, a coaching tip, a myth-bust, something about his app/method/programming, proof/results, pricing, or a Q&A. Also use when he says "make a carousel about…" or pastes a script.
---

# Instagram carousel generator — AA Performance

Turn Amir's raw script/topic into a finished, self-contained carousel HTML file with per-slide PNG download buttons, plus an Instagram caption. He posts on Instagram for the **Farsi general-fitness market**; the goal of content is to **justify the premium price and retain clients** (show depth) — never cheap lead-gen.

## Step 0 — Required reading (EVERY run, before designing anything)

1. **`Content/PRODUCT.md`** — what the business and app are: the offer, the cycle system, the app's four tabs, readiness/ACWR/auto-regulation, the coach dashboard, pricing, and the **"Content angles that work"** list.
2. **`Content/DESIGN_SYSTEM.md`** — palette, type, layout, photo treatment, and **§10 voice & canonical Farsi word choices** (these are hard rules).
3. **`Content/Carousel-Kit.html`** — the 23-template visual library (`tpl-cover, tpl-myth, tpl-big, tpl-heatmap, tpl-rules, tpl-stat, tpl-quote, tpl-compare, tpl-list, tpl-cta, tpl-feature, tpl-journey, tpl-result, tpl-checklist, tpl-index, tpl-step, tpl-split, tpl-define, tpl-qa, tpl-diagram, tpl-formula, tpl-schedule, tpl-bio`). Copy CSS/markup from here — don't reinvent. **Base64 hot-spots — do not Read straight through them:** the `:root` image vars (`--seal`/`--og`/`--coach`, ~lines 46–49), the pagination ball PNGs (in the `.progress-bar` rules), and the `#tennis-ball` symbol near `<body>`. Read around them with offsets/Grep, and transplant them into the output **mechanically** (python/PowerShell string extraction) — never retype base64 through generation; silent corruption only fails visually.
4. **`Content/carousel-recovery-run.html`** — reference for the OUTPUT shell **only**: the `.topbar`, the `.deck` of `.shot`s with `.dl` buttons, and the html2canvas export script (gated on `document.fonts.ready`). **Its slide chrome is stale — do not copy it:** it predates the current kit (visible «۰۱/۰۹» counters → retired; thin segmented progress bars → replaced by tennis balls; no rally arc/court/ball symbol; images via relative paths → must be base64 now).

**Precedence rule:** `Carousel-Kit.html`'s *current CSS* is the source of truth for slide chrome. Where DESIGN_SYSTEM §4 (which still describes a page counter + segmented bar) or recovery-run's chrome disagree with the kit, **the kit wins**: the page counter is retired (`.post-header .num{display:none}`) and pagination is tennis balls.

## Step 1 — Analyze the script

Classify the content: **story** · **coaching tip / how-to** · **myth-bust** · **app / method / programming** · **proof / results** · **pricing / objection** · **Q&A**. Then extract: the hook (first-2-seconds line), the single thesis, 3–6 beats, any numbers or claims.

**Accuracy gate (non-negotiable):** Amir holds an exercise-physiology ارشد and fact-checks. Every physiological number must be right. Prefer a simple round figure with no on-slide math (e.g. «ضربانِ قلب، زیرِ ۱۴۰»). Never publish an unverified percentage. Zone 2 is a metabolic threshold (LT1/VT1), **not** a fixed % of max HR. ACWR threshold used in content: ۱.۵. If a claim in the script can't be verified, soften it to a defensible round figure or flag it to Amir.

## Step 2 — Choose the recipe (template sequence)

4–8 slides. Slide 1 is always a hook (`tpl-cover` or full-bleed `tpl-feature`); the last slide is always `tpl-cta`. Default recipes (adapt freely):

| Content type | Sequence |
|---|---|
| Story (personal narrative) | cover → feature/photo beats (2–4) → statement (the lesson) → cta |
| Coaching tip / how-to | cover → statement (why) → list or step×2 → compare (do/don't) → rules (recap) → cta |
| Myth-bust | cover → myth → stat/define (the evidence) → statement (the truth) → cta |
| App / method / programming | cover → feature (real cycle image) → journey (the map) → checklist (what you get) → cta |
| Proof / results | cover → stat or result → split (before/after) or quote (their words) → cta |
| Pricing / objection | cover → qa (the objection) → compare (file vs coach) → checklist (value stack) → cta |
| Q&A | cover → qa → statement → schedule/feature (the receipts) → cta |

**Coach/Bio slide policy (Amir delegated this):** include `tpl-bio` (it already carries his real photo + the AA PERFORMANCE card) right before the CTA on **trust-sensitive** topics — method, pricing, results, "who is this guy" first-touch content. Skip it on quick tips, stories, and series where he posts daily.

**Photo-led decks:** if Amir's script references real photos, follow the photo-story pattern in DESIGN_SYSTEM §5 (full-bleed 4:5, green scrim, per-photo `object-position`, cinematic grade). Ask him for the photo files if they're not in the repo.

## Step 3 — Write the copy (Farsi default; English on request)

- Output is **Farsi/RTL** (Vazirmatn) by default — colloquial Tehrani, warm, direct, confident, no fluff. **If Amir explicitly asks for English**, switch to English/LTR with Barlow Condensed + Barlow (not Vazirmatn), `<html lang="en" dir="ltr">`, no Persian numerals, standard punctuation. For English builds use a **Python build script** (`Content/build_<slug>_en.py`) that mechanically extracts base64 assets from the kit (grey/orange ball PNGs, tennis-ball `<symbol>`, court photo) via regex and outputs a self-contained HTML — never retype base64 through generation; silent corruption only shows up visually.
- Treat his script as **raw material**: tighten the hook, split into slide-sized beats (headline ≤ 9 words; one idea per slide), rewrite lines in brand voice. Keep his meaning and any specific numbers/names.
- **Two hard Farsi rules:** never apply `letter-spacing` (breaks cursive joining), and no UPPERCASE; use Persian numerals (۰۱/۰۶). Mixed/numeric counters and KPI values get `direction:ltr`.
- **Canonical word choices (DESIGN_SYSTEM §10):** «مربیِ بدنسازیِ حرفه‌ای» (his title) · «ارشد» never "MSc" · «یه برنامه / یه برنامه‌ی آماده» never «فایل/PDF» · «شدت» not «سختی» · «شروع کن» not «درخواست» · «تجربه» not «پشتوانه».
- Highlight ONE key word per headline with `.hl` (clay block) or `.acc` (clay text). Strike myth-words with `.strike`.

## Step 4 — Derive the CTA (app-aware, content-related)

The CTA slide must connect **this post's theme** to **a real app capability** (from PRODUCT.md), then close on the mantra. Mapping:

| Post theme | App feature to invoke | CTA angle |
|---|---|---|
| Injury / overtraining / load | ACWR + dashboard alerts | «قبل از آسیب، حواسم بهت هست» |
| Tiredness / bad days / motivation | Readiness check + auto-regulation | «برنامه با حالِ امروزت تنظیم می‌شه» |
| Technique / exercise how-to | Demo video + cues on every move | «برای هر حرکت، ویدئو و نکته داری» |
| Programming / "why this exercise" | The cycle system / «هیچی بی‌دلیل نیست» | «هر چیزی توی برنامه‌ت یه دلیل داره» |
| Results / consistency | 6-month journey + logging | «مسیرت ثبت می‌شه، پیشرفتت معلومه» |
| Price / value doubt | Full coaching experience vs a file | «فقط یه برنامه نیست — یه تجربه‌ی کاملِ مربی‌گریه» |

CTA slide structure (top → bottom): eyebrow `chip-B` → setup line `.cta-setup` «یه نقشه تا هدفت.» → payoff `h1` «یه **مربی** تو جیبت.» (مربی in `.hl`) → the content-derived line from the table above as **`.cta-prompt`** (between the h1 and `.actions`; style it like recovery-run's: mono-var 30px, `rgba(244,244,240,.7)`, `margin-top:40px`) → buttons («ذخیره‌ش کن» primary + «بفرست» or «فالو کن» ghost). Action verb is always «شروع کن»-family, never «درخواست». Land the rally-arc tennis ball in the cleared band above `.actions` (the FA CTA's `margin-top:96px` exists exactly for this).

## Step 5 — Build the file

Create **`Content/carousel-<slug>.html`** (kebab-case English slug). Self-contained: `<html lang="fa" dir="rtl">`, Google Fonts **Vazirmatn only** (the Latin header handle intentionally renders in Vazirmatn's Latin glyphs — see recovery-run; add Barlow Condensed only for an element you explicitly exempt from the `.fa` font override, e.g. a big LTR KPI numeral), **html2canvas CDN** in the head. A `.topbar` (deck title + posting notes for Amir), then a `.deck` of stacked `.shot`s: `<div class="shot"><button class="dl">⬇ PNG</button><div class="post-canvas tpl-X fa" id="sN">…</div></div>` — fixed `width:1080px; height:1350px` canvases, `max-width:100%` on `.shot`.

**Copy list from `Carousel-Kit.html` (current state):**
- `:root` tokens — **EXCEPT** `--seal` (retired monogram, unused) and the dead lamp tokens (`--lx/--ly/--lx-sign/--accent-glow`; nothing consumes them — also skip the `.fa` rule's `--lx` re-set and the opt-in `data-bg="glow"` variant). Take `--coach`/`--og` (large base64) **only when the deck uses `tpl-bio`**.
- **Canvas backgrounds (critical — Amir confirmed twice):**
  - **Dark slides**: `background-color:var(--ink); background-image:linear-gradient(to bottom,rgba(14,74,54,0.42),rgba(14,74,54,0.72)),url("{court_base64}"); background-size:cover; background-position:center` — the court photo (`court-sessions.jpg`, 33KB in repo root) embedded as base64 IS the court. **Do NOT emit any `<div class="court">` SVG** — the kit's `.court{display:none}` hides that element for a reason.
  - **Light slides**: `background:var(--paper); color:var(--body-ink)` — flat cream, no photo.
  - **Clay/warm variant**: `court-playbook.jpg` (repo root) is a terracotta-toned court surface — good for variety or Playbook-style slides. Embed the same way.
- Canvas base — flat `var(--ink)` / `var(--paper)` backgrounds + the grain `::after`.
- **The frame, inlined** (do NOT copy the kit's `[data-bg]` machinery or its GLOBAL CONFIG script): `.post-canvas::before{content:"";position:absolute;inset:0;pointer-events:none;border:2px solid rgba(255,255,255,.30);margin:28px;border-radius:14px;z-index:5}` — `z-index:5` keeps it above full-bleed photos. On `.light` canvases the border is `rgba(0,0,0,.18)`. Note: `.30` opacity (not `.16`) — confirmed by Amir as the right visibility level.
- Header chrome — clay dot + handle. **Take slide markup from the kit's FA showcase section** (handle hardcoded correctly as `AMIRARDEKANI.COM`); if copying EN template examples, fix the stale `AMIR ARDEKANI` handle and **delete the `.num` counter div** (counter is retired).
- **The FARSI/RTL base block** (kit section `====== FARSI / RTL ======`) — the `.fa` font/letter-spacing/text-transform `!important` enforcement, `direction:rtl`, the Persian line-height fixes, and the swipe-arrow mirror — **plus** the per-template `.fa.tpl-X` size overrides for your chosen templates. Without this block, Farsi renders in the wrong font with Latin tracking.
- **The CLAY-CONTRAST FIXES block** (kit section `====== CLAY-CONTRAST FIXES ======`) — the kit's base `chip-A`/`cta-btn.primary`/`col-card.good`/`rule-card`/`eq-token`/`tl-dot` rules ship `var(--ink)` text; this later block corrects them to `#fff`. If you skip it, clay blocks get dark-green text. Also: if copying the FA CTA markup, change the bookmark icon's `stroke="#0A0A0A"` to `#fff`.
- **Tennis-ball pagination** — the `.progress-bar span` / `span.on` rules with their ball data-URIs (transplant mechanically), **and ADD `direction:ltr` to `.progress-bar` yourself** — the kit's rule lacks it, and under RTL the row lays out backwards (the active ball mirrors). N spans per slide, `.on` on the k-th span = slide k, filling left→right.
- `.court` + `.ballarc` CSS, the chosen `tpl-*` CSS blocks, the `#tennis-ball` `<symbol>` (mechanical transplant) and the **dot-swap script** (the only kit script that ships; the kit's `__TWEAK_DEFAULTS`, GLOBAL CONFIG, and post-card scale scripts are authoring-page machinery — ignore them).
- The html2canvas export script from `carousel-recovery-run.html`.

**Graphics:** one rally arc per slide max, in negative space; court lines only on open type-led slides — never on dense card/grid slides. **Author arcs by starting from the kit's example arc for the same template** and moving only the landing point into your slide's clear space. Under `.fa` the arc group is mirrored (`scaleX(-1)`), so an authored dot at `cx` **displays** at `1080−cx` — do the math when aiming at a word. **Swipe hint:** footer of slide 1 only — «بکش» + the `.swipe .arrow` (the `.fa` rule mirrors it); omit on other slides; never Latin "SWIPE" on a Farsi deck.

**Chip-B decorative line:** `.chip-B::before` defaults to clay. On dark slides override to white: `.post-canvas:not(.light) .chip-B::before{background:rgba(255,255,255,.60)}` — clay disappears against the dark court photo.

**App-preview slides:** when a "see it in the app" slide needs to show the real UI (e.g. a workout session screen Amir provides), embed the screenshot as base64 and use this pattern:
```css
.app-screen{position:absolute;left:50%;transform:translateX(-50%);top:360px;
  width:370px;border-radius:28px;overflow:hidden;
  box-shadow:0 28px 72px rgba(0,0,0,.60),0 0 0 1px rgba(255,255,255,.10);}
.app-screen img{width:100%;display:block;}
#sN .body-wrap{top:120px;}  /* pull headline up to make room */
#sN h1{font-size:108px;}    /* scale headline down slightly */
```
Place `<div class="app-screen"><img src="{base64}" alt=""></div>` as a sibling of body-wrap. Move the arc to the top of the slide (e.g. `M-40 200 Q 480 80 1015 220`) so the ball lands in the clear band above the headline, not overlapping the screenshot. App screenshot files live in the repo root (e.g. `app-warmup-preview.jpg`).

**Stat slide body-wrap:** use a fixed `top` value (e.g. `top:240px`) instead of `top:50%;transform:translateY(-55%)` — the latter can cause the stat-label to overlap the stat-source at the bottom when the label wraps to multiple lines.

**Images** (cycle/day banners from `../assets/`, athlete photos): embed as **base64 data URIs** (smallest source that covers the display size). Don't reuse the kit's `.avatars`/attribution gradient placeholders (off-palette) — real photos or drop the avatar.

## Step 6 — Verify (before delivering)

Serve via the project's static server (`.claude/launch.json` → python http.server 8000) and check with preview tools:
1. Wait for fonts: gate ALL layout measurement on `document.fonts.ready` — measuring before Vazirmatn loads gives false collision results.
2. No console errors; all base64 images decode (load each data URI into an `Image` and check naturalWidth).
3. Geometry scan via `preview_eval`: every arc ball inside its canvas and not on top of a text block (`elementFromPoint` on headline centers must return the text, not a graphic).
4. Pagination count = slide count on every slide; correct `.on` index; the bar fills left→right (computed `direction` on `.progress-bar` must be `ltr`).
5. Farsi enforcement: computed `font-family` on a headline starts with Vazirmatn, computed `letter-spacing` is `0` (or `normal`).
6. Note: the screenshot preview tool is broken in this environment — verify by geometry/computed styles, and tell Amir to eyeball the file.

## Step 7 — Deliver

1. The file path, with a one-line-per-slide summary (template + headline) so Amir can review fast.
2. **The Instagram caption** (Farsi): hook line ≈ the cover headline, 2–4 short value lines, a question to drive comments, CTA line + «@amirardekanian», then 5–10 hashtags (mix Farsi fitness/coaching tags + a couple of English). Also embed it at the top of the HTML as `<!-- IG CAPTION … -->` so it travels with the file.
3. Remind him: open the file → each slide has a «⬇ PNG» button (images are base64, so direct file-open works).

## Don'ts

- No gold/yellow — clay `#C7552F` is the only accent (clay-2 `#E06B43` on dark). Solid clay blocks always use white text.
- No monogram/seal chips in headers or sign-offs (Amir removed them as "messy"). The Bio template's photo + brand card are the only logo carriers.
- No page counters («۰۱ / ۰۸») anywhere — pagination is the tennis balls.
- No letter-spacing on Farsi, ever. No UPPERCASE Farsi. No Latin digits in Farsi lines.
- Don't invent results, client names, or numbers. Real proof only, or clearly generic phrasing.
- Don't exceed ~9 words in a headline or stack more than one idea per slide.
