# 🎨 Design Atlas — the designer's working file

Open this before designing **anything** for Amir — carousel, reel, post, result card,
web or app redesign, animation. It answers three questions in a second: **where is every
asset**, **what's the current rule** (vs retired), and **how each format is built**.
The brand *why* lives in [`DESIGN_SYSTEM.md`](DESIGN_SYSTEM.md) — read the two together.

**Precedence when docs clash:** Amir-confirmed values in `.claude/skills/*/SKILL.md`
→ then [`Carousel-Kit.html`](Carousel-Kit.html) CSS → then `DESIGN_SYSTEM.md` prose.
(Known clashes are listed in [Open flags](#open-flags--for-amir) below.)

**Newest-taste references** (imitate these, not older files):
[`carousel-warmup-tennis.html`](carousel-warmup-tennis.html) for carousels ·
[`reel-5-system.html`](reel-5-system.html) (scene-swap) + [`reel-4-app.html`](reel-4-app.html)
(App-as-Product phone) for reels · [`../index-fa.html`](../index-fa.html) for web.

---

## Non-negotiables

| Rule | Value |
|---|---|
| Palette | green `#0E4A36` · green-2 `#156A4D` · **clay `#C7552F` = THE one accent** · clay-2 `#E06B43` (accent text on dark) · paper `#FAF7F2` · paper-2 `#F1ECE3` · ink `#1A1A1A` · ink-2 `#5C5C5C` · hairline `#E7E2D9` · good `#1F7A4D` / bad `#C0392B` (✅/❌ semantic only) · stage/room `#0c0f0b→#16161A` radial |
| Banned | **Yellow/gold — retired, never returns** (not even on green). No second accent. |
| Fonts | Farsi = **Vazirmatn** 400–900 · Latin display & numerals = **Barlow Condensed** 700–900 (*italic* only for the wordmark) · app/phone UI = **Barlow** · EN-site body = DM Sans · app mono = Space Mono · EN-site labels = JetBrains Mono. All Google Fonts (needs internet; base64-embed woff2 for true offline). |
| Farsi hard rules | never `letter-spacing` (breaks cursive joining) · no UPPERCASE · Persian numerals «۰۱۲» · `direction:ltr` on counters, KPIs, handles, phone mock-ups |
| Motion | house ease `cubic-bezier(.16,1,.3,1)` everywhere |
| Canvases | carousel **1080×1350** (edge pad 64px) · reel **1080×1920** (pad 88px) · result card 1080×1080 |
| Contrast | solid clay block → always `#fff` text · accent text on dark → clay-2 `#E06B43` |
| Assets | real product art & real photos, never stock — the cycle/day banners *are* the product |
| Names | cool, not literal ("Banded Lower Burner", never "Bodyweight & Band Strength") — offer 3–4 options; the literal description goes in a tag/subtitle |
| Sign-offs | mantra «یه نقشه تا هدفت» → «یه مربی تو جیبت» (**no «کامل», no comma**) · «هیچی بی‌دلیل نیست» · EN: *Move Better. Hit Harder. Last Longer.* |
| **EN mantra (2026-07-06)** | **"A path to your target." → "A coach in your pocket."** — the English setup→payoff pair, same shape as the Farsi mantra ("coach" in clay = «مربی» in clay). A CTA needing just one line uses "A coach in your pocket." alone. |
| Canonical reel/CTA outro | `یه نقشه تا هدفت.` → `یه مربی تو جیبت.` (big, **مربی** in clay) → `Ⓐ امیر اردکانی · دایرکت بده 📩` · CTA verb «شروع کن», never «درخواست» |
| Farsi word choices (client-decided) | «مربیِ بدنسازیِ حرفه‌ای» (title) · «ارشد» never "MSc" · «یه برنامه» never «فایل/PDF» · «شدت» not «سختی» · «تجربه» not «پشتوانه» |
| Handles | Instagram **@amirardekanian** (confirmed by Amir) · site **AMIRARDEKANI.COM** — use in all NEW work; never retro-edit shipped designs that carry the old @amirardekani |

---

## Current vs retired

Never reuse anything in the right column, even though old files still contain it.

| ✅ Current | ❌ Retired |
|---|---|
| Tennis-ball pagination (grey balls, clay/orange active + glow, row always LTR) | Thin segmented progress bar · page counter «۰۱ / ۰۵» |
| Header = clay dot + handle only | Any header page number |
| Real court photos under brand scrims (`court-sessions.jpg` green / `court-playbook.jpg` clay) | Drawn SVG court-lines (`.court` is `display:none` in the kit) |
| Frame border **.30** opacity dark / .18 light (`margin:28px; radius:14px`) | `.16` opacity (still in kit CSS — override it; the bible now says .30) |
| Flat green/paper canvases + film grain ~.05 (no blend-mode) | Clay "stadium-lamp" glow background (tried, rejected; dead `--lx/--ly` tokens remain in kit) |
| Logo only via Bio-slide photo + AA PERFORMANCE card | AA monogram/seal chips in slide chrome ("messy") |
| Clay-2 `#E06B43` accents on dark | Gold `#E9B949` (reels 1–3 predate the rule) |
| Mantra without «کامل»/comma | «یه نقشه‌ی کامل…», «یه مربی، تو جیبت» (still in kit line ~1612 + reels 2–4) |
| Library "Two Doors" (Sessions green / Playbook clay) | Read\|Train segmented control (dead CSS in program.html) |
| Cycle-name system ("Cycle 2 of 5 · Strength Engine") | "Program 02 · Month Two" |
| Kit's `.avatars` real photos or none | Gradient avatar placeholders (off-palette) |
| **Huge translucent background page-number per slide** (`ghost-num`, ~460–640px, one per slide, low-opacity) — the number itself signals position | Tennis-ball pagination dots (row of grey/orange balls) — retired once the ghost number does that job. Header/footer chrome otherwise unchanged (clay dot + handle; swipe hint stays, slide 1 only). |
| **Plain tennis-ball marker**, no path — one real ball image placed once per slide in clear negative space | The dashed clay rally-arc (curved path + ball) |
| **Eyebrow = solid "stamp-tag" box** (hard corners; white/paper bg + black text by default on dark/photo canvases; dark-green bg + paper text on light/paper canvases) | Thin chip-B dash-line eyebrow |
| **Darker, black-blend court-photo overlay** (`rgba(10,10,10,.30→.88)` over the photo) on every slide that would otherwise be a flat green/clay canvas — green or clay canvases now **always** show the real court photo underneath, never a flat color | Flat solid green/clay canvases with no photo; the earlier green-tinted (`rgba(14,74,54,…)`) wash |
| **Highlight/`.hl` key-word boxes default to clay** (occasionally green) | All-black highlight boxes as the default — tried once during a redesign pass, corrected same day: black is an occasional accent (e.g. one slide in a deck), not the new default |

---

## Asset shelf — grab & go

| I need… | Grab | Notes |
|---|---|---|
| **App icon / logo mark** | [`../assets/img/icon-192.png`](../assets/img/icon-192.png) (+ `icon-512`, `apple-touch-icon`, `favicon-32/.svg`) | On a paper surface: round corners ≈ **24% of size** + soft shadow so it reads as a tile. Masters: [`../assets/img/source/aa-mark.png`](../assets/img/source/aa-mark.png) (1254², monogram) · [`aa-logo.png`](../assets/img/source/aa-logo.png) (monogram + PERFORMANCE). Regenerate via [`generate_icons.py`](../assets/img/generate_icons.py). |
| **Wordmark / share banner** | [`../assets/img/og-image.jpg`](../assets/img/og-image.jpg) (1200×630, JPEG q85 ~52KB) | Master: [`og-source.png`](../assets/img/source/og-source.png) (1731×909); regenerated by `generate_icons.py`. (The old 548KB PNG is retired.) |
| **Court textures** (the signature backgrounds) | [`../court-sessions.jpg`](../court-sessions.jpg) (green, 1536×1024) · [`../court-playbook.jpg`](../court-playbook.jpg) (clay) | Used across the app + dark carousel slides. Standard photo scrim: `linear-gradient(to top, rgba(8,38,27,.94), rgba(8,38,27,.18) 56%, rgba(8,38,27,.58))`. |
| **App screenshot** | [`../app-warmup-preview.jpg`](../app-warmup-preview.jpg) (729×1280, workout-session screen) · live app at `program.html?client=demo` | Screenshot gotchas in [App look](#the-apps-look--for-mockups--reels). |
| **Cycle banners** (16:9) | [`../assets/cycles/`](../assets/cycles/) — 9 JPGs, 1200×675 | ⚠ 29 of 38 slugs in use have **no banner** (see [`README`](../assets/cycles/README.md)); missing → green-gradient fallback. Gen prompt in [`IMAGES.md`](../IMAGES.md). |
| **Day banners** (5:2) | [`../assets/days/`](../assets/days/) — 8 WebPs, 1600×640: lower/upper/power/conditioning/core/recovery/fullbody/default | Picked by keyword (`DAY_IMAGE_RULES` in program.html). Keep bottom 40% + left 55% dark for white text. |
| **Workout-category banners** (2:1) | [`../assets/img/workouts/`](../assets/img/workouts/) — 5 WebPs, 1600×800: strength/conditioning/on-court/mobility/recovery | Dark moody gym series — the grade to match. |
| **Coach photo** | [`../assets/img/coach.jpg`](../assets/img/coach.jpg) (800², studio headshot) | Used on the Coach tab + Bio slides. |
| **Athlete headshots** | [`../assets/img/athletes/`](../assets/img/athletes/) — Mehraneh, Mahdi (landscape ⚠), Sarina, Hamed, mehdi-rahmani, Helen, Shahin | Testimonials on both sites (FA uses only 5 — no Helen/Shahin). |
| **Player cutouts** (transparent, B&W athletes) | [`tennis-players/`](tennis-players/) — 1122×1402: serve-jump, forehand, backhand-jump, celebrate, scream (`cutout-02_14_52`), exhausted, running, walking, female-ready, female-stretch | ChatGPT-generated masters alongside. ⚠ `tennis-player.png` shows **Nike logos** — never publish. ~1.5MB each: compress before shipping. |
| **Recovery-run photo set** | [`recovery-run/`](recovery-run/) — couch/shoes/watch/dock/liver-building/log per its [`README.txt`](recovery-run/README.txt) | Only slide 1 has a graded export (`1-couch-graded.jpg`); grade recipe = `_grade-preview-couch.jpg`. |
| **Finished result cards** | [`instagram-cards/`](instagram-cards/) — 7 PNGs 1080² | ⚠ legacy black/neon-yellow style — **off-palette**; redesign against the current system before making more. |
| **Ball photo** | [`../assets/img/tennis-ball-clay.png`](../assets/img/tennis-ball-clay.png) (1024², 1.8MB) | Unwired master; glow baked in. Kit pagination/arc use their own embedded ball PNGs — don't swap in this file raw. |
| **Marketing/library screenshots** | root `library-*.jpg` | Orphaned archive of an older Library UI — reference only, stale vs live app. |

---

## Recipe: carousel (IG 4:5, 1080×1350)

- **Build with** the [`/carousel` skill](../.claude/skills/carousel/SKILL.md); templates + chrome = [`Carousel-Kit.html`](Carousel-Kit.html) (23 `tpl-*` classes: cover, myth, big, heatmap, rules, stat, quote, compare, list, cta, feature, journey, result, checklist, index, step, split, define, qa, diagram, formula, schedule, bio). **Current best output / newest chrome reference: [`carousel-period-training.html`](carousel-period-training.html)** (EN, base64) — supersedes `carousel-warmup-tennis.html` for chrome mechanics (see the pagination/ball/eyebrow bullet below); warmup-tennis is still fine as a template-variety reference (list, stat, rules-with-player-photo).
- **Chrome (current, 2026-07-06):** header = clay dot + handle (unchanged) · **footer pagination is gone — a huge translucent background page-number (`ghost-num`, one per slide, ~460–640px) tells you which slide you're on instead** · swipe hint «Swipe →» slide 1 only, no dots · inset frame `.30`/dark · grain `.06` dark / `.045` light · **eyebrow is a solid hard-corner "stamp-tag" box** (white/paper bg + black text on dark/photo slides; dark-green bg + paper text on light/paper slides) — replaces the old thin chip-B dash-line eyebrow.
- **Backgrounds:** dark slide = **black-blend** gradient (`rgba(10,10,10,.30→.88)`, moodier than the old green-tinted wash) over base64 court photo; light slide = flat paper. **Every green- or clay-toned slide keeps the real court photo behind it — never a flat color.** One **plain tennis-ball image** (no path/arc) per slide, placed once in clear negative space — the dashed rally-arc is retired.
- **Ball placement is deliberately scattered, not formulaic (2026-07-06, Amir: "completely random... maybe even funny places").** Don't default to "float it beside the highlighted word" on every slide — that reads as a template. Vary corner/edge per slide across the deck: peeking half-cropped off the top edge or a corner (the canvas's own `overflow:hidden` crops it — a nice "flying in" effect), resting on a rule/border line, tucked top-left on one slide and bottom-right on another, etc. A few degrees of rotation (`transform:rotate(Ndeg)` on the plain `<img>`, confirmed html2canvas-safe when it's not standing in for position/centering) adds a tumbled, un-arranged feel. The one hard constraint: never over text.
- **Slide 1** = `tpl-cover` (stamp-tag eyebrow, h1 with ONE `.hl` word, sub). **Last slide** = `tpl-cta` with the canonical outro. `.hl` highlight boxes default to **clay** (occasionally green) — black is an occasional accent for one deliberate slide (e.g. a manifesto/protocol layout), never the default across a whole deck.
- **Manifesto/protocol layout** (a `tpl-manifesto`-style slide, first built for the period-training deck): no rounded cards — a stacked list on paper, huge numerals bleeding off the left margin behind each row, thick horizontal rules, one row visually de-emphasised (muted/smaller, no bleed color) if it's an exclusion rather than an instruction, optionally with a small rotated stamp badge (e.g. "Skip"). Use this instead of rule-cards when a protocol has 2–4 steps that deserve to look like a manifesto, not a checklist.
- **Export:** html2canvas 1.4.1, per-slide PNG buttons. **Pitfalls (silent failures) — full table + how to actually test the real export in this sandbox: [`/carousel` skill § html2canvas known pitfalls](../.claude/skills/carousel/SKILL.md).** Headline: SVG `<use>` renders nothing → inline `<image href="data:...">`; CSS transforms ignored → hard px positions; `.hl` needs `line-height ≥ 1.0`; **a `.hl` highlight must wrap only a single word** — a two-word phrase that line-wraps renders correctly in the browser but scrambles in the actual PNG (confirmed 2026-07-06). Everything base64 so the file opens/export anywhere; EN builds via a `build_<slug>_en.py` script that transplants blobs by regex.
- Farsi type sizes run ~25% smaller than Latin equivalents (Vazirmatn sits large); headlines lh 1.22–1.32.
- **Legibility floor for supporting copy (2026-07-06, Amir: "very hard to read on Instagram").**
  Sub-copy under a cover/statement headline (`.tpl-cover .sub`, `.tpl-big .footnote`) needs a real
  size + contrast floor, not eyebrow-caption treatment — **~44–56px, ~.75–.80 opacity**, not the
  kit's default 34–46px / .55–.60. On a **compare** slide the `col-tag` labels ("— Backs off" /
  "→ Stays full") function as **column headers** — size them like one (~34px, bold, .9+ opacity /
  full white on the clay card), not a small eyebrow tag. On a **rules** card stack, the `.sub` line
  is the actual coaching cue an athlete has to act on (not a caption) — give it real weight
  (~27–32px, ~.9+ opacity/bold) even when the card itself is deliberately de-emphasised (muted
  "avoid" cards can stay smaller/quieter than "do" cards, but never illegible). Whenever a template's
  default text size is bumped like this, re-screenshot — taller cards/footnotes can collide with
  the headline above them (bottom-anchored `.cards`/`.footnote` blocks eat into the header's last
  line first).
- **Coaching-cue / instruction lines get clay, not muted grey (2026-07-06, Amir on the manifesto
  slide's cue text).** When a line of copy is the literal instruction an athlete has to follow
  (e.g. `.m-cue` under a manifesto row's title: "Full sets — don't cut it short"), it's not a
  caption — treat it like a second, smaller headline: **~32–34px, weight 800, `color:var(--clay)`**,
  not the muted `rgba(ink,.4–.6)` a caption/eyebrow would use. This applies even on a
  de-emphasised/muted row (the row's *title* can still recede; the actionable cue line itself
  should still pop clay so it's never missed at a glance).

## Recipe: reel (9:16, 1080×1920)

**Build with the [`/reel` skill](../.claude/skills/reel/SKILL.md)** — the full how-to (motion
techniques, the three URL modes, known gotchas, the MP4 export pipeline) lives there now; this
is just the quick-reference.

- **Newest reference = [`reel-6-system.html`](reel-6-system.html)** (English, current rules,
  **continuously animated** — not a slideshow): drifting ambient orb + a drawn/marching dashed
  clay arc behind every scene, pulsing live topbar dot, Ken Burns on photos, bouncing directional
  cues, staggered card-row reveals, typing dots before a message lands, blinking timer colon,
  breathing headline, bouncing CTA arrow. Amir's direction: **"fully animational, lots of moving
  things, being cool"** — every scene needs 2–3+ concurrent motion techniques, not just an
  entrance fade. Ships with three URL modes: default (autoplay+loop), `?beat=N` (frozen still),
  `?capture=1` (chrome-free, exact-viewport — what the MP4 pipeline records).
- **Signature pattern = "App-as-Product"** ([`reel-4-app.html`](reel-4-app.html)): one persistent phone in a dark radial room, screens swap inside it, burned-in Farsi captions below, endcard takeover. Use this pattern when the whole reel is a tour of the app; use reel-6's scene-swap pattern for a numbered-steps narrative.
- **Phone spec:** device 556×1136, radius 62, pad 14, dark gradient body, shadow + **clay halo** `0 0 140px rgba(199,85,47,.16)`, 6.5s idle float. Screen radius 48, paper bg, **`dir=ltr` + Barlow** (the real English app), dynamic island 128×34, status bar 58px. Screen transition: `opacity 0 / translateY(22px) scale(.985)` → on.
- **Rhythm:** hook in first 2s · 2–6s per beat · ~30–40s total · text cascades `.rise` (translateY ~44px, delays in .12s steps) · count-ups ease-out.
- **Canonical app beats:** lock screen → splash → today's program → exercise video → log weight+RPE → readiness check → coach chat → coach dashboard → canonical outro endcard.
- **Delivery — the deliverable is the HTML file itself**, sent directly so Amir can open/preview/screen-record it himself. **No MP4 unless explicitly asked**; no per-beat screenshot walls; no audit workflow for a routine draft. The `/reel` skill's Step 9 covers the Playwright+ffmpeg export pipeline for when an MP4 *is* requested.
- ⚠ Reels 1–3 (and reel-5, Farsi) predate the current rules or the language directive — copy mechanics only, not styling/language, from those files. Never retro-edit shipped reels; start a new numbered file.

## Recipe: result cards & app mockups

- [`card-preview.html`](card-preview.html) = the **app-card library**: every program.html/coach.html card rebuilt with real class names (cycle card, day card, cycle meter, exercise checklist, readiness, session complete, chat, coach triage, charts). Use it when a design must mirror the product.
- The 7 shipped cards in [`instagram-cards/`](instagram-cards/) are pre-brand (black/neon-yellow) — treat as content reference only.

---

## The app's look — for mockups & reels

- **Default is light warm-paper**; dark mode is opt-in `body[data-dark]` (bg `#181818`, cards `#202020`). There is **no `theme-light` class** in program.html — that's stale terminology.
- ⚠ Token names lie: in program.html `--yellow` = **green #0E4A36**, `--ice` = **clay #C7552F**, `--purple` = **ochre #A8741C** (legacy names, re-pointed values).
- Fonts: Barlow Condensed (all display, uppercase) · Barlow (body) · Space Mono (eyebrows/meta/timers).
- Chrome: no top nav; bottom tab bar (Home / Coach / Library / My Plan), green icons, active gets glow.
- Signature elements: greeting eyebrow (Space Mono clay) over giant Barlow Condensed 900 first name · cycle cards = white card, 16:9 photo banner + green scrim + "CYCLE n OF N" + pills · day cards = 5:2 banner + "DAY n" · cycle meter = 5px segments (done green, current glowing) · exercise rows = white cards w/ 3px block-coloured left stripe (warm-up/power clay, strength green) · RPE squares fill green · rest timer = full-screen ring, 96px mono · Library = Two Doors (Sessions green photo / Playbook clay photo) · article reader "Center Court" = clay drop-cap, tennis-ball bullets, clay callouts.
- **Screenshots:** serve over HTTP (`python3 -m http.server`) — file:// fails; wait out `.loading-screen` (~1s) and entrance anims (or inject `*{animation-duration:0s!important}`); Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`; demo data = `?client=demo` (athlete "Alex Rivera").

## The websites' look

| | EN (`/index.html`) | FA (`/index-fa.html`) — **Amir's favourite aesthetic** |
|---|---|---|
| Type | Barlow Condensed display + DM Sans body + JetBrains Mono labels, uppercase-heavy | Vazirmatn everywhere (body 17–21px), Barlow Condensed for numerals only |
| Shape | sharp: 3–6px radii, rectangular buttons | soft: 20–28px cards, **pill buttons** |
| CTA colour | green buttons (clay only in hero) | **clay buttons throughout** + clay glow shadow |
| Nav | fixed translucent paper; green only on homepage (`body.is-home`) | sticky solid green always, white links |
| Footer | light paper | dark green `#0a3527` |
| Shared DNA | same green/clay/paper hexes · same hero radial `#155b43 → #0E4A36 55% → #0a3527` · banding `#FAF7F2` ↔ `#F1ECE3` · same ease · same 40–44px white rounded logo mark (`icon-192.png`) · day-caption accent `#E6B493` | |

Site CSS: [`tokens.css`](../assets/css/tokens.css) → [`base.css`](../assets/css/base.css) → [`components.css`](../assets/css/components.css); page styles inline. FA page is fully self-contained (loads none of them). Scroll-reveal hides below-fold content in headless shots — inject `.reveal{opacity:1!important;transform:none!important}`; shrink `.hero{min-height:520px!important}` to reach lower sections.

---

## Amir's taste — how to design *for him*

- **Premium, clinical-but-warm, breathing room.** Content must justify a premium price — never cheap lead-gen energy.
- **Real over synthetic**, every time it's come up: real court photos beat drawn lines, real screenshots beat fake UI, real cycle art beats stock.
- **Cool names, never literal.** When naming anything, bring 3–4 evocative options and let him pick.
- **Cinematic photo grade:** moody, green-leaning shadows, warm cream highlights, muted saturation — except in-frame clay/terracotta accents, which may pop. Grade all frames off one base.
- **Accuracy gate:** he holds two MSc's and fact-checks physiology. Simple round figures, no on-slide math, no invented numbers/results/names. Zone 2 ≠ fixed %HRmax.
- **Farsi-first social** (warm Tehrani, general-fitness audience); English site voice sharp/athletic (tennis/padel). Match facts across languages, never wording.
- He gives **blunt feedback** — normal, not a problem. Push back when something's off; fix at the source.
- **Ship it live:** commit → push → PR → merge; verify with headless renders before merging.

## Open flags — for Amir

1. **29 cycle slugs have no banner art** (green fallback shows); existing 9 banners are bright-studio style vs the documented moody grade.
2. **Reels 1–3 + kit outro wording** still carry gold accents / old mantra («کامل», comma). Amir's ruling: **don't retro-edit shipped designs** — apply current rules to new work only.
3. **instagram-cards** are pre-brand neon-yellow — next results card should be redesigned on the current system.

**Resolved rulings** (2026-07-02, by Amir): Instagram handle = **@amirardekanian** (shipped designs stay as built) · og-image recompressed to JPEG q85 ~52KB · DESIGN_SYSTEM frame fixed to `.30` at source.
