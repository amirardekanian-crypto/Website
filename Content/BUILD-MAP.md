# 🗺️ Content Build Map — AA Performance (master reference)

**Purpose.** The single hub that ties the *whole system* — both websites, the app, the coach tools, the
brand marks, every image, the data, and the content kit — to *content production* (carousels, reels, any
design). Read this first; it links to the deep docs for everything else. **Goal: find anything in seconds.**

**Read order for content work:** this file → `PRODUCT.md` (the offer) → `DESIGN_SYSTEM.md` (look/type/motion)
→ `card-preview.html` (open it — every app card) → `Carousel-Kit.html` (the slide library).
Build with the **`/carousel`** or **`/reel`** skills (both read this map every run).

---

## 0. "Where do I find X?" quick index

| I want… | Look here |
|---|---|
| The offer / pricing / app overview | `Content/PRODUCT.md` |
| The coaching method (Discovery→…→weekly loop) | `Content/HOW-IT-WORKS.md` |
| Palette, type, motion, voice, Farsi rules | `Content/DESIGN_SYSTEM.md` |
| Every app **card** (exact classes) | `Content/card-preview.html` |
| The **carousel** slide library (court bg + orange ball) | `Content/Carousel-Kit.html` → build via `/carousel` |
| The **reel** engine + 5 existing reels | `Content/reel-*.html` → build via `/reel` |
| What every **image** is, sizes, where wired | **`IMAGES.md`** + §8 below |
| Plain-English **file-by-file** guide to the repo | **`CODEBASE.md`** |
| The athlete **program JSON** shape | **`SCHEMA.md`** + `data/*.json` |
| Coach **dashboard** manual / metrics | **`COACH_DASHBOARD.md`** + `coach.html` (§6) |
| Weekly **check-in** tool / questions | **`CALL_LOG.md`** + `call-log.html` (§6) |
| Exercise→video library / Notion sync | `exercise_library.json` + **`NOTION_SYNC.md`** |
| Brand marks (icon, OG, logo, ball, courts) | §2 below + `assets/img/` & repo root |
| Canonical strings (prices, handles, mantras) | §10 below |

---

## 1. The whole repo at a glance

**Pages (HTML):** `index.html` (EN home) · `index-fa.html` (FA home) · `index-en.html` (redirect stub) ·
`form.html` / `form-fa.html` (intake) · `program.html` (**the app/PWA**) · `coach.html` (dashboard, private)
· `call-log.html` (weekly check-in, private) · `privacy.html` / `terms.html` / `terms-fa.html` (legal).
Nav + footer are **injected** by `assets/js/shared.js` from `partials/nav.html` + `partials/footer.html`.

**Styles:** `assets/css/tokens.css` (palette/type/space — the foundation) · `base.css` · `components.css`.

**Data & content:** `data/*.json` (one program per athlete; `demo.json`/`john_doe.json` = templates) ·
`exercise_library.json` (exercise→demo video, Notion-generated) · `articles/` (Playbook: `index.json` +
category folders) · `workouts/` (Sessions: `index.json` + category folders) · `supabase/` (DB migrations:
progress, messages, `call_logs`, `cycle_reports`, `athlete_keys`) · `sync_notion.py` (rebuilds the library).

**Content/ (design + marketing):** `PRODUCT.md` · `HOW-IT-WORKS.md` · `DESIGN_SYSTEM.md` · **`BUILD-MAP.md`**
(this) · `card-preview.html` · `Carousel-Kit.html` · `carousel-*.html` · `reel-*.html` · `instagram-cards/`
· `for-coaches/` · `pre-competition/` · `recovery-run/` · `tennis-players/`.

**Existing docs to lean on (don't duplicate — link):** `CODEBASE.md` · `IMAGES.md` · `SCHEMA.md` ·
`COACH_DASHBOARD.md` · `CALL_LOG.md` · `NOTION_SYNC.md` · `IMPORTING_SESSION_REPORTS.md`.

---

## 2. Brand marks & identity

Roland-Garros: deep green + clay on warm paper. **Files (reuse these, don't recreate):**

- **Monogram / app icon** — interlocking green "A"s with a clay parallelogram on cream. Master:
  `assets/img/source/aa-mark.png`. Rasters: `assets/img/icon-192.png` · `icon-512.png` ·
  `apple-touch-icon.png` (180) · `favicon-32.png` · `favicon.svg` · root `favicon.ico`. Regenerate with
  `assets/img/generate_icons.py`. Also the nav brand mark (`.nav-logo-mark`).
- **Wordmark lockup** — `assets/img/source/aa-logo.png` (stacked AA + PERFORMANCE). **"AA" clay + "PERFORMANCE"
  green**, Barlow Condensed heavy **italic**; eyebrow **"STRENGTH & CONDITIONING"** (green, tracked); tagline
  **"Move Better. Hit Harder. *Last Longer.*"** with a clay dash; sport motif = green court panel + white
  court lines + dashed clay ball-arc.
- **OG / social card** — `assets/img/og-image.png` (1200×630; master `source/og-source.png`). It *is* the
  wordmark lockup. Wired via `og:image`/`twitter:image` on public pages.
- **Coach photo** — `assets/img/coach.jpg` (Amir, black "COACH" quarter-zip, moody studio). Used in the app
  Coach tab (`.coach-avatar`, falls back to "AA" initials) and the `tpl-bio` carousel slide.
- **The orange tennis ball** — `assets/img/tennis-ball-clay.png` (clay-orange felt ball, transparent). This
  is the brand object: it's the **rally-arc endpoint + the pagination ball** in the Carousel-Kit (§7).
- **Court backgrounds (repo root)** — `court-sessions.jpg` (deep **green** court) and `court-playbook.jpg`
  (**clay/terracotta** court). These are the carousel slide backgrounds (§7).
- **App screenshots (root)** — `app-warmup-preview.jpg`, `library-doors*.jpg`, `library-playbook*.jpg`,
  `library-sessions*.jpg` (the library UI, incl. `-mobile`/`-2` variants).

**Type system (one stack everywhere — the app is the source of truth):** Barlow (body) · Barlow Condensed
(display / big numbers) · Space Mono (small mono labels/eyebrows/counters) · Vazirmatn (Farsi). *DM Sans +
JetBrains Mono are retired.*

**theme-color** (browser/PWA) = paper `#FAF7F2` on every page.

---

## 3. Colour canon & tokens (truthful names everywhere)

One accent: **clay**. **No gold/yellow.**

| Role | Hex | Notes |
|---|---|---|
| **Green** (primary/brand) | `#0E4A36` | app primary, dark slides, strength block |
| Green-2 | `#156A4D` | gradients/depth |
| **Clay** (the one accent) | `#C7552F` | highlights, eyebrows, header dot, CTAs, warm-up & power blocks, the rally arc/ball |
| Clay-2 (lift on dark) | `#E06B43` | clay text/arc on dark surfaces |
| Ochre (tertiary) | `#A8741C` | notes, coach "watch/amber" zone |
| Paper / Paper-2 / soft | `#FAF7F2` / `#F1ECE3` / `#EDE8E0` | light surfaces / card fills |
| Card | `#FFFFFF` | raised card |
| Line | `#D8D1C5` (app) · `#E7E2D9` (site) | hairline |
| Ink / Muted | `#1A1A1A` / `#5C5C5C` | body / captions |
| Good / Bad | `#1F7A4D` / `#C0392B` | ✅ / ❌ semantic |

Tokens are now **truthful** (`--green` / `--clay` / `--ochre`, + `-soft` for coach zones; `--accent` = green).
The old misleading aliases (`--yellow`/`--ice`/`--purple`/`--blue`, `--red`/`--amber`-as-clay/ochre) were
removed app-wide; don't reintroduce them. *(Pre-existing quirk: `program.html` uses `var(--ink)` undefined
in ~12 spots — inherits today; unify to `--ink` when convenient.)*

---

## 4. The two websites — "two audiences, one product"

| | **English** `index.html` | **Farsi/RTL** `index-fa.html` |
|---|---|---|
| Audience | competitive **tennis & padel** | general-fitness **Tehrani** |
| Title | "Amir Ardekani — Tennis Strength & Conditioning Coach" | «امیر اردکانی — مربیِ بدنسازیِ حرفه‌ای \| یه مربی، تو جیبت» |
| Hero | **Move Better. Hit Harder. *Last Longer.*** + "used by 500+ competitive tennis & padel players…" | **«یه ‹مربی›، تو جیبت.»** («مربی» in clay) |
| Pricing | **Foundation £149/3mo · Performance £349/6mo · Elite £599/6mo** (+ "Every programme includes" strip) | **«معادلِ ۲۵ دلار در ماه»** (~$25, paid in Toman at day rate); abroad → DM |
| CTA | "Apply Now →" `form.html` · "Try the Live Demo →" `program.html?client=demo` | «شروع کن» `form-fa.html` · «اپ رو از نزدیک ببین» (demo) |
| Voice | sharp, athletic, evidence-based | warm, colloquial Tehrani, no-fluff |

**EN sections in order:** nav (Results/Programmes/Process/Platform/Library/Background/FAQ/فارسی/Apply) → hero
→ stats strip (**2×MSc · 500+ · 7+ · 🎾**) → "Fit Check" (built for / not for) → "Athlete Voices" (auto-scroll
testimonials, photos from `assets/img/athletes/`) → Programmes (3 tiers) → 84-Day Promise → "How it works"
(**01 Assess · 02 Build · 03 Evolve**) → "Not a PDF. An experience." (feature list + phone mock) → Sessions &
the Tennis Playbook → Background (2×MSc / 7+ yrs / 500+; Education/Experience/Approach/The Difference) → FAQ →
Contact → final CTA "Ready to train with intent?". The **7 named testimonials**: Mehraneh Zohourian, Mahdi
Behboodi, Sarina Akhavan, Hamed Navakhti, Mehdi Rahmani, Helen Taheri, Dr. Shahin Nazarpour (real proof —
reuse their photos/quotes for results content).

**FA sections in order:** nav → hero → trust bar (۵۰۰+ ورزشکار / two ارشد degrees) → WHY «یه برنامه، یه مربی
نیست» (compare) → METHOD «پشتِ هر حرکت، یه دلیل هست» (3 pillars + flow chips برنامه→سیکل→روز→حرکت) → APP
6-card feature grid → LIBRARY (free sessions + playbook) → PROOF (green, 5 testimonials) → ABOUT → PRICING
($25) → FAQ → contact (IG **@amirardekanian**, WhatsApp **+44 7435 363461**) → final CTA «آماده‌ای یه مربیِ
‹واقعی› داشته باشی؟». Language toggle EN⇄FA in the nav.

**Intake forms** (`form.html` / `form-fa.html`) — the **Discovery** step; ~8 sections, progress bar, submits
to email via **Web3Forms**: `00` programme choice (the 3 tiers + durations) · `01` about you · `02` activity
(sport & level) · `03` training history (+ current best lifts) · `04` goals (pick ≤3) · `05` injury & health
· `06` recovery & availability (sleep/stress/nutrition) · `07` equipment & environment.

---

## 5. The app (`program.html`) — screen by screen

Single-file PWA, name **"AA Performance"**. Four bottom tabs (`goTo()`, `data-tab`): **Home** (`home`) ·
**Coach** (`notes`) · **Library** (`workouts`) · **My Plan** (`plan`). Full **dark mode** (`body[data-dark]`).
**Open `card-preview.html` to see every card rendered** — it reproduces the real classes.

- **Home / My Plan** — greeting "Hi {name}", current **cycle card** (16:9 banner, status pill, "Week x of y"),
  **cycle meter** (`C1…C5`: done=green-faded, current=clay+glow), **day cards** (≈5:2 banner, "Day n", focus,
  "3 blocks · 6 movements · ~55 min", ✓ Done), session timer.
- **Exercise card** (`.checklist-item`) — 3px **left bar** by block (warm-up=clay, strength=green, power=clay);
  collapsed row (big `ex-num`, name, summary pills) → expands to video, **5-cell stats grid** SETS·REPS·RPE·
  TEMPO·REST, coaching cues (green bar; `.bad`=red), **per-set log** (weight + RPE 6–10 + tick), Rest timer
  (big ring). **Readiness check** before a session (5 Qs, 1–5; sleep/energy/soreness/stress/overall).
- **Coach tab** — `.coach-hero` ("Coach Amir", avatar `coach.jpg`→"AA", "Online · usually replies in a few
  hours"); **chat** (`.cmsg.coach` green-left / `.cmsg.mine` grey-right, optional `.cmsg-tag` clay "Day 2"
  pill; composer "Send Amir a note…"); **Personal notes** (`.note-card`, tone green/clay/ochre, "Tap to read");
  **in-app guide** (`APP_GUIDE`, 10 cards incl. iPhone/Android install). Unread = clay `nav-dot` on the tab.
- **Library — two doors** (`.lib-door`, radius 22): **Sessions** (green, "— Train", *"Workouts, drills &
  resets — ready to run on your own."*) · **Playbook** (clay, "— Learn", *"Everything you need to know to play
  better tennis — in one place."*).
  - **Playbook** = coach articles (`articles/index.json`): list (`.pb-*`) → **article reader** `#screen-article`
    (green `.ar-hero`, drop-cap `.ar-lead`, `.ar-callout`, tennis-ball-bullet lists, `.ar-workout-card`).
    Deep-link **`?article=<id>`**.
  - **Sessions** = on-demand workouts (`workouts/index.json`): category rails of `.vcard` → **workout player**
    `#screen-workout` (reuses exercise cards; local-only ticks in `localStorage`, reset daily; no RPE/cloud).
    Deep-link **`?workout=<id>`**.
- **Archive** (`#screen-archive`) — not a tab; opens from My Plan's "Done" card → read-only past cycles.
- **Install / states** — dynamic per-client manifest (keeps `?client&key`); no install nag (guide card only);
  splash = "Loading Program"; error = "Program Not Found"; **demo banner** on `?client=demo` ("Live demo ·
  sample athlete…", Apply / Exit). Try-the-app: `program.html?client=demo`.

---

## 6. Coach side — "the coach actually watches you"

For proof / "before you get hurt, I message you" content (full manuals: `COACH_DASHBOARD.md`, `CALL_LOG.md`).

- **Dashboard `coach.html`** — per-athlete card: name · last active · sessions · load sparkline · pills
  **ACWR · Readiness · Adherence** · up to 3 triage flags (left border amber/red). Charts: big number colour-
  coded by zone + trend bars. **ACWR zones:** `>1.5` high (red→**clay**) · `>1.3` climbing (amber→**ochre**) ·
  `≥0.8` optimal (green) · `<0.8` detraining. **Adherence:** ≥85 green · ≥60 amber · <60 red. **Idle:** >14d
  silent (red) · >7d quiet (amber). Exact flag strings: `Silent — N days, no training`, `Load spike — ACWR
  x.x`, `Readiness ↓ a vs b usual`, `Low adherence — n% of plan`, etc.
- **Weekly check-in `call-log.html`** — 8 sections (Open & Wellbeing · Last Week's Training · **Wins &
  Progress** [🏆 Win Vault, 📸 content hooks] · Physical/Injury · On-Court · Next Week Goals · Programme Fit ·
  Close). Each question has a Farsi `data-fa` (WhatsApp send). Wins captured here are the source of results
  content. Cycle-end → AI cycle review sets the next cycle.

---

## 7. The content engine — the part that makes posts

### Carousel-Kit — `Content/Carousel-Kit.html` (the latest design, the one Amir likes ⭐)
Canvas **1080×1350** (4:5). **23 templates** (`tpl-*`) + Farsi/RTL variants. Build with the **`/carousel`** skill.
The signature look (rendered in the kit):
- **Background = a real tennis court.** Dark slides use `court-sessions.jpg` (green) behind a green scrim
  `linear-gradient(to bottom, rgba(14,74,54,.42), rgba(14,74,54,.72))`; the clay variant uses
  `court-playbook.jpg`. Light slides = flat paper. Faint film-grain on every canvas.
- **The orange tennis ball + rally arc.** One dashed **clay rally-arc** (`stroke-dasharray:2 26`, clay-2 on
  dark) curving through negative space, ending in the **orange ball** (from `tennis-ball-clay.png`). And the
  footer **tennis-ball pagination** — one ball per slide, **current = orange**, row forced `direction:ltr`.
- **Type:** Barlow Condensed heavy headlines (clay accent word, or a clay **`.hl`** highlight block — white
  text); **chip-B eyebrow** = clay text + a clay leading dash ("— REAL TALK FOR LIFTERS"). Handle header
  "● AMIRARDEKANI.COM" (clay dot). Slide 1 footer shows **SWIPE →**. Inset frame border on every slide.
- **Templates:** cover · myth · big · stat · quote · compare · list · rules(light) · checklist(light) · cta ·
  feature · journey · result · index · step · split · define(light) · qa · diagram · formula · schedule · bio ·
  heatmap. Recipes per content-type live in the `/carousel` skill.
- **Hard Farsi rules:** no letter-spacing, no UPPERCASE, Persian numerals, counters `direction:ltr`.
  **html2canvas traps:** no SVG `<use>`/`<symbol>` (extract PNG → `<image href>`), no `transform:` (hard px).

### Reels — `Content/reel-*.html` (build with the `/reel` skill)
Self-contained **1080×1920**, auto-scale + auto-loop, **screen-record** the frame. Clay-only accent (clay-2 on
dark; old reel-1 gold is retired). Type @reel: big 92–104 · mid 62–66 · sub 42–46 · eyebrow 34–36 · pad 88.
**Existing reels (don't duplicate the angle):** 1 = coach dashboard · 2 = 6-month roadmap · 3 = "a coach in
your pocket" · 4 = the app (phone, App-as-Product) · 5 = the full 5-step "how it works" (EN). Verify each scene
with headless Chromium (`/opt/pw-browsers/chromium`), no overflow/collisions; fonts need internet.

---

## 8. Image library (use the real product imagery, never stock)

Full spec in **`IMAGES.md`** (aspect ratios, sizes, the cycle-banner generation prompt, where each is wired).

- **Cycle banners** `assets/cycles/*.jpg` — **16:9**, neutral-graded gym photos. 9 files: `foundation-forge`,
  `strength-engine`, `structural-build`, `structural-strength`, `durability-build`, `armour-build`,
  `load-build`, `rebuild-reset`, `strength-reclaim`. Filename = slugified cycle name (loader falls back to a
  green gradient). Canonical chain: **Foundation Forge → Strength Engine → Structural Build → Durability Build
  → Armour Build**.
- **Day banners** `assets/days/*.webp` — **≈5:2**, warmer clay-graded. 8 files: `lower upper power conditioning
  core fullbody recovery default` (keyword-matched per day focus).
- **Athlete photos** `assets/img/athletes/*.jpg` — **~4:5 portrait**, *real clients* for results/proof:
  `Hamed Helen Mahdi Mehraneh Sarina Shahin mehdi-rahmani`.
- **Session banners** `assets/img/workouts/*.webp` — **2:1**, moody: `strength conditioning mobility recovery
  on-court`.
- **Court bgs (root):** `court-sessions.jpg` (green) · `court-playbook.jpg` (clay). **Ball:**
  `assets/img/tennis-ball-clay.png`.

In carousels/reels, **embed images as base64** for portability (DESIGN_SYSTEM §9). Display the app way (full
image + green scrim + caption).

---

## 9. Data & content sources

- **`data/*.json`** — one **athlete program** each (cycles → days → blocks → exercises with sets/reps/RPE/
  tempo/rest/video/cues). `demo.json` + `john_doe.json` are safe templates. **Shape documented in `SCHEMA.md`.**
  Athlete chip `style:"yellow"` is a *data* token meaning "high-priority" (renders green) — leave it as-is.
- **`exercise_library.json`** — exercise name → demo video + cues. Generated from Notion by `sync_notion.py`
  (see **`NOTION_SYNC.md`**); don't hand-edit.
- **`articles/`** — the **Playbook** (`index.json` + category folders e.g. `pre-competition/`, `for-coaches/`).
  Each article has `?article=<id>`. (Content/ mirrors some as design drafts.)
- **`workouts/`** — the **Sessions** library (`index.json` + categories), banners in `assets/img/workouts/`.
- **`supabase/`** — DB migrations: progress sync, two-way messages, `call_logs`, `cycle_reports`,
  per-athlete `athlete_keys`. **`partials/`** = `nav.html` + `footer.html` (injected by `assets/js/shared.js`).

---

## 10. Canonical strings & facts (don't reinvent)

- **Person / product:** Amir Ardekani · **AA Performance** (the app). Farsi title «مربیِ بدنسازیِ حرفه‌ای».
- **Handles:** Instagram **@amirardekanian** · site **amirardekani.com** · WhatsApp **+44 7435 363461**.
  *(Note the one-letter difference: domain `amirardekani`, IG `amirardekanian`. The Carousel-Kit header prints
  `AMIRARDEKANI.COM`.)*
- **Credentials:** **2×MSc** — Strength & Conditioning + Applied Exercise Physiology · **7+ years** · **500+
  tennis & padel players**. *(Farsi: «ارشد», never "MSc".)*
- **Tagline (EN):** *Move Better. Hit Harder. Last Longer.* (last clause italic).
- **Signatures (FA):** «هیچی بی‌دلیل نیست» (nothing without a reason) · «یه مربی تو جیبت» (a coach in your
  pocket). Canonical outro: setup «یه نقشه تا هدفت» → payoff «یه مربی تو جیبت» (مربی clay) + brand row.
- **The contrast to sell:** *not «یه برنامه/فایل/PDF» — «یه تجربه‌ی کاملِ مربی‌گری»*.
- **Pricing:** **EN** Foundation £149 (3mo) / Performance £349 (6mo) / Elite £599 (6mo); "Every programme
  includes: dashboard & app · intake call ≤30 min · fully personalised programme · 6–7 monthly performance
  notes · WhatsApp & email support · 15% loyalty renewal discount." **FA** «معادلِ ۲۵ دلار در ماه» (Toman,
  day rate); abroad → DM. CTA verb «شروع کن» (not «درخواست»).
- **Voice / content goal:** justify the premium & retain (show depth), not cheap lead-gen. Hook in first 2s,
  burned-in captions. **Accuracy gate:** every physiology number must be right (Amir holds an exercise-phys
  ارشد) — round figures over unverified math. ACWR danger threshold in content = **1.5**.

---

## 11. Build recipes & gotchas

- **Carousel** → `/carousel` skill: script/topic in → `Content/carousel-<slug>.html` + IG caption. Farsi/RTL
  default (Vazirmatn); English on request. Court bg + orange ball + tennis-ball pagination + clay `.hl`.
- **Reel** → `/reel` skill: script/topic in → `Content/reel-N-<slug>.html` + caption; 1080×1920, screen-record.
- **Mirror the real app** when showing UI: copy the real classes from `card-preview.html`; embed cycle/day
  banners base64. **Use real athlete photos** for proof, never stock.

**Gotchas checklist:**
- [ ] Clay is the only accent. **No gold/yellow.** Background = the tennis court; the ball is the orange one.
- [ ] One type system: **Barlow / Barlow Condensed / Space Mono** (+ Vazirmatn FA). Soft app radii (14–22).
- [ ] Color vars are truthful (`--green`/`--clay`/`--ochre`); never reintroduce `--yellow`/`--ice`/`--purple`/`--blue`/`--red`(as clay)/`--amber`(as ochre).
- [ ] Cycle 16:9 (neutral grade) · Day ≈5:2 (clay grade) · Athlete ~4:5 · Session 2:1 — real files, base64-embedded.
- [ ] Farsi: no letter-spacing, no UPPERCASE, Persian numerals, counters `direction:ltr`.
- [ ] html2canvas: no SVG `<use>`/`<symbol>`, no `transform:` — use `<image href>` + hard pixels.
- [ ] Two audiences/prices: EN tennis/£ tiers, FA general/$25 — pick the right one for the post.
