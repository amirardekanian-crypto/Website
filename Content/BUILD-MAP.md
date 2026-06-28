# 🗺️ Content Build Map — AA Performance

**Purpose.** The one place that ties the *real product* (the app, the coach dashboard, the
weekly check-in, the site) to *content production* (carousels & reels), so anything we
make mirrors the actual UI instead of approximating it. Read this **before building a
carousel or reel.**

**Canon / read order:**
1. `PRODUCT.md` — what the business & app are.
2. `DESIGN_SYSTEM.md` — palette, type, motion, voice (§10).
3. **this file** — the asset inventory + real tokens + card anatomy + build recipes.
4. `card-preview.html` — the visual catalog of every app card (exact classes/structure). Open it.
5. `Carousel-Kit.html` — the 23-template carousel library (latest design work).
6. The `/carousel` skill (`.claude/skills/carousel/SKILL.md`) for the carousel pipeline.

---

## 1. Where everything lives

| Thing | Path |
|---|---|
| **App (the PWA)** | `program.html` — "AA Performance", the product the reels sell |
| **Coach dashboard** | `coach.html` (private, Google-gated) |
| **Weekly check-in tool** | `call-log.html` (private) |
| **Marketing site** | `index.html` (+ `index-en/fa`), `form.html` (+ `-fa`), legal |
| **Site stylesheet (tokens)** | `assets/css/tokens.css` · `base.css` · `components.css` |
| **App-card catalog** | `Content/card-preview.html` ← the keystone reference |
| **Carousel kit (23 templates)** | `Content/Carousel-Kit.html` |
| **Finished carousels** | `Content/carousel-*.html` |
| **Finished reels** | `Content/reel-1-dashboard … reel-5-how-it-works.html` |
| **Cycle banner images** | `assets/cycles/*.jpg` (16:9) |
| **Day banner images** | `assets/days/*.webp` (≈5:2) |
| **Brand marks** | `assets/img/icon-192.png` (monogram) · `og-image.png` (wordmark lockup) · `coach.jpg` (Amir's photo) · `tennis-ball-clay.png` |
| **Court photos (carousel bg)** | `court-sessions.jpg` (green) · `court-playbook.jpg` (clay/terracotta) — repo root |

---

## 2. Colour canon (single source of truth)

NO yellow/gold — it's **retired**. One accent only: **clay**.

| Role | Hex | Notes |
|---|---|---|
| **Green (primary "ink"/brand)** | `#0E4A36` | app primary UI, dark slides, strength block |
| Green-2 | `#156A4D` | gradients/depth |
| **Clay (the one accent)** | `#C7552F` | highlights, eyebrows, header dot, CTAs, warm-up & power blocks |
| Clay-2 (lift on dark) | `#E06B43` | clay text/arc on dark surfaces |
| Ochre (tertiary) | `#A8741C` | notes, the coach "amber/watch" zone |
| Paper | `#FAF7F2` | light slides, app background |
| Paper-2 / soft | `#F1ECE3` / `#EDE8E0` | secondary warm surface / card fill |
| Card | `#FFFFFF` | raised card |
| Line | `#D8D1C5` (app) · `#E7E2D9` (site) | hairline |
| Ink / Muted | `#1A1A1A` / `#5C5C5C` | body / captions |
| Good / Bad | `#1F7A4D` / `#C0392B` | ✅ / ❌ semantic |

**✅ Token names are truthful (the old alias trap was fixed).** Everywhere now: **`--green`
`#0E4A36` · `--clay` `#C7552F` · `--ochre` `#A8741C`** (plus `--green-soft` / `--clay-soft` /
`--ochre-soft` for the soft coach-zone fills, and `--accent` = green). The old misleading aliases —
`--yellow`/`--ice`/`--purple`/`--blue`, and `--red`/`--amber` standing in for clay/ochre — were
renamed across `program.html`, `coach.html`, `call-log.html`, and the kit (incl. coach's JS `const C`
chart palette → `{green, clay, ochre, grey, ink}`). **Don't reintroduce them.** Genuine semantics keep
truthful names: `--red-soft` `#C0392B` (site error red) and `--amber` `#B8862F` (card-preview only).
*(Known pre-existing quirk: `program.html` references `var(--ink)` in ~12 spots without defining
`--ink` — it inherits today; unify it to `--ink` when convenient.)*

---

## 3. One type system (the app is the source of truth)

Fonts are now unified across **every** surface — site, app, coach tools, carousels, reels — to the
app's stack. (DM Sans + JetBrains Mono are retired; the marketing site `assets/css/tokens.css` + page
links were switched to match the app.)

| Role | Font | Notes |
|---|---|---|
| **Body / UI** | **Barlow** (300–900) | what the real app renders in |
| **Display / wordmark / big numbers** | **Barlow Condensed** (700–900) | uppercase headlines, large stat numerals |
| **Small mono labels, eyebrows, pills, counters** | **Space Mono** (400/700) | the app's tiny tracked-uppercase labels |
| **Farsi (carousels/reels)** | **Vazirmatn** | everything Persian |

**Two radius feels still differ by surface** (this is layout, not type): the marketing site is tight
(3 / 6 / 12 / 100px, editorial); the app + cards are softer (cards 14–22, stats/log 8, buttons 4–5,
friendly product UI). Content that mirrors the *app* uses the soft radii.

**Carousels & reels** use this system (Barlow / Barlow Condensed / Space Mono + Vazirmatn for Farsi).
*Nuance:* the **Carousel-Kit** maps `--mono` to Barlow Condensed (its larger eyebrow/label role); the
app uses Space Mono for the *tiny* labels and Barlow Condensed for *large* ones — both are app-family,
so the kit stays as-is unless you specifically want tiny carousel labels in Space Mono.

---

## 4. The real app, card by card

Open `card-preview.html` to see these rendered. Key structures (classes are the app's real ones):

- **App shell** — 4 bottom-nav tabs: **Home · Coach · Library · My Plan** (`.global-tabs .nav-item`; active label turns green). Full **dark mode** (`body[data-dark]`, bg `#181818`, card `#252525`). PWA name everywhere: **"AA Performance."**
- **Cycle card** (`.cyc`) — **16:9** banner from `assets/cycles/`, scrim `linear-gradient(to top,rgba(8,33,24,.92),rgba(8,33,24,.05) 64%)`, status pill top-right, eyebrow `CYCLE 2 OF 5 · STRENGTH ENGINE`, `Week 2 of 5` in Barlow Condensed 900/34. Radius 18.
- **Day card** (`.day`) — **≈5/2.3** banner from `assets/days/`, scrim to-top `rgba(8,33,24,.93)→0`, `✓ Done` badge (brown `#7A4A2B`), `DAY 1` in `#E6B493`, name 900/26, meta `3 blocks · 6 movements · ~55 min`. Radius 18.
- **Cycle meter** (`.cycle-meter`) — thin segments: **done** = green faded, **current** = clay + glow, locked = grey; `C1…C5` labels in Space Mono.
- **Exercise card** (`.checklist-item`) — colour-coded **3px left bar** by block (`block-warmup`=clay, `block-strength`=green, `block-power`=clay). Collapsed row = big `ex-num` (Barlow Condensed 900) + name + summary pills (`4×6`, `8/10`, `⏱2m`). Expands to: dark **video** box (green play btn), green **ex-extra-chip** label, **5-cell stats grid** `SETS · REPS · RPE · TEMPO · REST`, **coaching cues** (green left bar; `.bad` = red `#E74C3C`), **per-set log** (set #, weight input on soft bg, **RPE buttons 6–10** green-when-selected, check-circle green-when-done), green **Rest ⏱** button.
- **Section header** (`.section-header-prog`) — block name (Barlow Condensed 900, uppercase, tracked) + a 3px rule, coloured by block.
- **Readiness check** (`.readiness-*`) — clay top-border card, eyebrow **"Before you start"**, title **"Readiness check"**. **Five** questions, 1–5 scale (5 = best), selected = green. Exact set:
  1. *How well did you sleep last night?* — Very poor · Poor · OK · Good · Excellent
  2. *How are your energy levels right now?* — Exhausted · Tired · OK · Good · Very fresh
  3. *How sore are your muscles today?* — Very sore · Sore · Mild · Slight · None
  4. *How's your stress / mood today?* — Very stressed · Stressed · Neutral · Good · Great
  5. *Overall, how ready do you feel?* — Not ready · Bit off · OK · Good · Fully ready
- **Session complete** (`.complete-card`) — green medal ✓, "Session complete", session-RPE 5–10 (selected clay), **"Send data to coach ↗"** (green).
- **Timers** — **session timer** (mini card, "Start ▶", clay border+glow when running) and **rest timer** (big ring, grey track + green progress arc, time in Barlow Condensed 900/96).
- **Coach tab** (`.coach-hero`) — Amir avatar (`assets/img/coach.jpg`), "Coach Amir", "Online · usually replies in a few hours".
- **Chat** (`.bub`) — coach bubble green (left), yours soft (right).
- **Personal note** (`.note`) — clay gradient tile + "TAP TO READ ›".
- **Library — two doors** (`.lib-door`, radius 22): **Sessions** (green, `— Train`, *"Workouts, drills & resets — ready to run on your own."*) · **Playbook** (clay, `— Learn`, *"Everything you need to know to play better tennis — in one place."*).

---

## 5. The coach side — "the coach actually watches you"

For any "before you get hurt, I message you" / proof content, these are the real metrics & thresholds (`coach.html`). Charts: big number (Barlow Condensed 900/56) colour-coded by zone + trend bars.

**Per-athlete card:** name · `last active … · N sessions` · load sparkline · pills `ACWR · Readiness · Adherence` · up to 3 triage flags. Left border: amber/red by tier.

**Zones & thresholds:**
- **ACWR** (acute 7d ÷ chronic 28d): `>1.5` High load → **red(clay)** · `>1.3` Climbing → **amber(ochre)** · `≥0.8` Optimal → **green** · `<0.8` Low/Detraining → amber.
- **Adherence** (done/expected, 4 wks): `≥85%` green · `≥60%` amber · `<60%` red.
- **Readiness** (composite /5 vs baseline): delta `≤-1` red · `≤-0.5` amber.
- **Idle:** `>14d` Silent (red) · `>7d` Quiet (amber).

**Exact triage flag strings** (use verbatim if depicting the dashboard):
`Silent — N days, no training` · `Quiet — N days idle` · `Load spike — ACWR x.x` ·
`Load climbing — ACWR x.x` · `Detraining — ACWR x.x` · `Readiness ↓ a vs b usual` ·
`Readiness dipping` · `Low adherence — n% of plan` · `Adherence slipping — n%` ·
`Last session left partial`.

**Weekly check-in (`call-log.html`)** — a real call/WhatsApp every week, 8 sections:
*01 Open & Wellbeing · 02 Last Week's Training · 03 Wins & Progress (🏆 Win Vault) · 04 Physical
Status & Injury · 05 On-Court Performance · 06 Next Week — Goals & Adjustments · 07 Programme Fit
· 08 Close the Call.* Each question carries a Farsi `data-fa` (sent to the athlete) and some carry a
**📸 Content potential** flag — the wins captured here are the source for "results/proof" content.
End-of-cycle: all the week's logs + workout data → an AI cycle review that sets the next cycle.

---

## 6. Cycle & day image inventory (use these, never stock — they *are* the product)

**Cycles** `assets/cycles/*.jpg` (16:9): `foundation-forge` · `strength-engine` · `structural-build`
· `structural-strength` · `durability-build` · `armour-build` · `load-build` · `rebuild-reset` ·
`strength-reclaim`. Canonical chain: **Foundation Forge → Strength Engine → Structural Build →
Durability Build → Armour Build** (others are alternates).

**Days** `assets/days/*.webp` (≈5:2): `lower` · `upper` · `power` · `conditioning` · `core` ·
`fullbody` · `recovery` · `default`.

Display them the app way: full image + green scrim + caption overlay (see §4). In carousels/reels,
**embed as base64** so the file is portable (DESIGN_SYSTEM §9).

---

## 7. Carousels — how they're built

**Pipeline:** the `/carousel` skill turns a script/topic into `Content/carousel-<slug>.html`
(per-slide PNG buttons) + an IG caption. It reads `PRODUCT.md` + `DESIGN_SYSTEM.md` +
`Carousel-Kit.html` every run. **Default language Farsi/RTL** (Vazirmatn); English on request
(Barlow + Barlow Condensed, LTR).

**Canvas** 1080×1350 (4:5). **Kit tokens:** accent clay `#C7552F`, `--display`/`--mono` = Barlow
Condensed, `--latin` = Barlow, `--fa` = Vazirmatn. Type scale: display 72–152, body 36, edge pad 64.

**Backgrounds:** *dark* = `court-sessions.jpg` + green scrim `linear-gradient(to bottom,
rgba(14,74,54,.42),rgba(14,74,54,.72))`; *light* = flat paper; *clay variant* = `court-playbook.jpg`;
**film grain** (fractal-noise SVG, opacity ~.05, no blend-mode) on every canvas.

**RALLY graphics:** one dashed **clay rally arc** (`stroke-dasharray:2 26`, clay-2 on dark) ending in a
**tennis ball** in negative space; faint **court lines** on open type-led slides only; **tennis-ball
pagination** (one ball/slide, current = clay, row forced `direction:ltr`). Page counters retired.

**23 templates** (in the kit): `tpl-cover` (hook, slide 1) · `tpl-myth` (strike) · `tpl-big` (one
sentence) · `tpl-stat` (one number) · `tpl-quote` · `tpl-compare` (don't/do) · `tpl-list` · `tpl-rules`
(numbered, light) · `tpl-checklist` (light) · `tpl-cta` (canonical outro, last slide) · `tpl-feature`
(full-bleed app image) · `tpl-journey` (cycle timeline) · `tpl-result` (proof + face) · `tpl-index`
(retention) · `tpl-step` · `tpl-split` (before/after) · `tpl-define` (light) · `tpl-qa` · `tpl-diagram`
(annotated screenshot) · `tpl-formula` · `tpl-schedule` (week shape) · `tpl-bio` (coach intro) ·
`tpl-heatmap`. Recipes & per-type sequences live in the `/carousel` skill.

**Hard Farsi rules:** never `letter-spacing`, no UPPERCASE, Persian numerals (۰۱/۰۵), counters get
`direction:ltr`. **html2canvas traps:** SVG `<use>`/`<symbol>` render nothing → extract the PNG and
use `<image href>`; `transform:` is ignored → use hard pixel coords.

---

## 8. Reels — how they're built

**Format:** self-contained **1080×1920 (9:16)** HTML; auto-scales to the viewport (`scale(min(w/1080,
h/1920))` on a `.fitwrap`), auto-loops, and you **screen-record** the frame (controls/progress sit
outside it). Pure CSS animation — no library.

**Scene engine** (copy from `reel-1-dashboard.html` or `reel-5-how-it-works.html`): a JS driver gives
each `.scene[data-dur]` an `.on` class in sequence, runs a progress bar, loops; `.rise` children
stagger in via `transition-delay`; numbers count up. House ease `cubic-bezier(.16,1,.3,1)`.

**Two scene models:** *scene-swap* (reels 1–3, 5 — full-screen scenes) and *persistent-subject* (reel 4
— a phone stays on screen while UI swaps inside; the cinematic "App-as-Product" option, see DESIGN_SYSTEM §7).

**Type scale @1080×1920:** big 92–104 · mid 62–66 · sub 42–46 · eyebrow 34–36 · edge pad 88.
**Language:** Farsi default (Vazirmatn); English → Barlow Condensed (display/headlines) + Barlow (body),
`<html lang="en" dir="ltr">`. **Accent = clay only** (clay-2 `#E06B43` on dark) — the old reel-1 gold is
retired; don't reuse it. Inset frame per scene (`inset:28px` border, white .18 on dark / black .14 on light).

**Existing reels (don't duplicate the angle):** 1 = the coach dashboard / "what your coach sees" · 2 =
the 6-month roadmap · 3 = "a coach in your pocket" · 4 = the app (phone, App-as-Product) · 5 = the full
5-step "how it works" journey (EN).

**Verify** before delivering: render each scene with headless Chromium at 1080×1920 (Playwright via
`/opt/pw-browsers/chromium`), check no overflow / no collisions, then eyeball. Fonts load from Google
Fonts (needs internet) — sandbox previews fall back to a default sans; the real browser shows Barlow.

**Build via the `/reel` skill** (`.claude/skills/reel/SKILL.md`) — give it a script/topic, get a
finished `Content/reel-N-<slug>.html` + IG caption. It reads this map every run (counterpart to
`/carousel`).

---

## 9. Canonical strings & facts (don't reinvent)

- **Person / product:** Amir Ardekani · **AA Performance** (the app).
- **Handle:** Instagram **@amirardekanian** · site **amirardekani.com**.
- **Credentials:** MSc Strength & Conditioning · MSc Applied Exercise Physiology · **500+ tennis & padel
  players coached**. *(Farsi: «ارشد», never "MSc".)* Farsi title: «مربیِ بدنسازیِ حرفه‌ای».
- **Tagline (EN wordmark voice):** *Move Better. Hit Harder. Last Longer.* (last clause italic).
- **Signature lines:** «هیچی بی‌دلیل نیست» (nothing without a reason) · «یه مربی تو جیبت» (a coach in your
  pocket). Canonical outro: setup «یه نقشه تا هدفت» → payoff «یه مربی تو جیبت» (مربی in clay) + brand row.
- **The contrast to sell:** *not «یه برنامه/فایل/PDF» — «یه تجربه‌ی کاملِ مربی‌گری»* (not a program/file —
  a full coaching experience).
- **Pricing:** Iran «معادلِ ۲۵ دلار در ماه — به تومان، با نرخِ روز»; abroad → DM. CTA verb «شروع کن» (not «درخواست»).
- **Voice:** Farsi = warm, direct, colloquial Tehrani, no fluff; audience = general-fitness Tehrani market
  (not only athletes). Goal of content: **justify the premium & retain** (show depth), not cheap lead-gen.
  Hook in first 2s; **captions burned in** (watched muted). **Accuracy gate:** every physiology number must
  be right — prefer a simple round figure over unverified math (Amir holds an exercise-physiology ارشد).

---

## 10. Gotchas checklist

- [ ] Clay is the only accent. **No gold/yellow**, anywhere.
- [ ] App-mirroring content → **Barlow / Barlow Condensed / Space Mono**, soft radii (14–22).
- [ ] Color vars are truthful now — `--green` / `--clay` / `--ochre` (+ `-soft`). Never reintroduce `--yellow`/`--ice`/`--purple`/`--blue`, or `--red`/`--amber` standing in for clay/ochre.
- [ ] Cycle 16:9, Day ≈5:2; use the **real** `assets/cycles` / `assets/days` images, base64-embedded.
- [ ] Farsi: no letter-spacing, no UPPERCASE, Persian numerals, counters `direction:ltr`.
- [ ] html2canvas: no SVG `<use>`/`<symbol>`, no `transform:` — use `<image href>` + hard pixels.
- [ ] Reels: clay-only, screen-record the 1080×1920 frame, fonts need internet.
