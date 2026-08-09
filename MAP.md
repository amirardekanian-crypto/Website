# 🗺️ The Map — everything in Amir's website, in one place

Open this, find anything in a second. Every box below links to the real file.
This is the **index**; the deep guides it points to (`CODEBASE.md`, `SCHEMA.md`,
`DESIGN_SYSTEM.md`, `COACHING-PRINCIPLES.md`) are where the detail lives.

> **One-line mental model:** a public **website** (English tennis/padel · Farsi
> general-fitness) feeds an apply **form**, which feeds a private **coaching
> system** (skills + principles) that produces each athlete's **program app**,
> backed by **Supabase**. A separate **social studio** (`Content/`) makes the
> Instagram carousels/reels. One **design system** ties the whole look together.

---

## 🔎 "Where do I find…?" — jump table

| I'm looking for… | Go to |
|---|---|
| **Anything design** — assets, format recipes, current rules, app look | [`Content/DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md) ← the designer's working file |
| The look/brand rules (colours, fonts, marks, reels) | [`Content/DESIGN_SYSTEM.md`](Content/DESIGN_SYSTEM.md) · [colour tokens](assets/css/tokens.css) |
| A specific image (logo, court photo, cutout, banner, headshot) | [Asset shelf](Content/DESIGN-ATLAS.md#asset-shelf--grab--go) in the atlas |
| How to build a carousel / reel / result card | [Recipes](Content/DESIGN-ATLAS.md#recipe-carousel-ig-45-10801350) in the atlas |
| What the business *is* (pricing, voice, backend) | [`Content/PRODUCT.md`](Content/PRODUCT.md) |
| How the coaching process works (customer-facing) | [`Content/HOW-IT-WORKS.md`](Content/HOW-IT-WORKS.md) |
| Amir's coaching philosophy (the *why* behind sets/reps) | [`.claude/COACHING-PRINCIPLES.md`](.claude/COACHING-PRINCIPLES.md) |
| File-by-file plain-English guide | [`CODEBASE.md`](CODEBASE.md) |
| What fields a program / article / workout JSON can have | [`SCHEMA.md`](SCHEMA.md) |
| **How XP, levels and ranks work** (and how to retune them) | [`XP_SYSTEM.md`](XP_SYSTEM.md) |
| How to run the coaching skills (intake → ship) | [`.claude/COACHING-HOWTO.md`](.claude/COACHING-HOWTO.md) |
| The home page / hero | [`index.html`](index.html) (EN) · [`index-fa.html`](index-fa.html) (FA) |
| The athlete training app | [`program.html`](program.html) |
| The coach dashboard ("The Coach's Box") | [`coach.html`](coach.html) · manual: [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) |
| Where one athlete's program lives | `data/<athlete-id>.json` → [`SCHEMA.md`](SCHEMA.md) |
| Brand images / icons / photos | [Assets ↓](#-assets--every-image-icon--photo) |

---

## 🌐 The website (public pages)

English is the default (`/`); Farsi is the broader Tehran-market mirror. Match
**facts**, not wording. Shared nav/footer are injected by `shared.js`.

| Page | EN | FA | What it is |
|---|---|---|---|
| Home | [`index.html`](index.html) | [`index-fa.html`](index-fa.html) | Front door: hero, proof, FAQ, CTAs → form |
| Apply form | [`form.html`](form.html) | [`form-fa.html`](form-fa.html) | Intake questionnaire → emails Amir (Web3Forms) |
| Terms | [`terms.html`](terms.html) | [`terms-fa.html`](terms-fa.html) | Legal / training disclaimers |
| Privacy | [`privacy.html`](privacy.html) | — | GDPR privacy notice |
| Proof signup | [`proof.html`](proof.html) | — | Public landing page for the **free habit tracker** — what it is, then name + email + WhatsApp → emails Amir (Web3Forms). **Not linked from nav** on purpose: it's the Instagram bio link. Sign people up with the [`/proof-signup`](.claude/skills/proof-signup/SKILL.md) skill |
| EN redirect | [`index-en.html`](index-en.html) | — | Permanent redirect to `/` |

**Plumbing:** [`CNAME`](CNAME) (domain) · [`sitemap.xml`](sitemap.xml) ·
[`robots.txt`](robots.txt) · [`manifest.json`](manifest.json) (PWA install) ·
[`sw.js`](sw.js) (service worker / offline) · [`favicon.ico`](favicon.ico).

---

## 🔒 Private apps (link-only, `noindex`)

| File | What it is | Manual |
|---|---|---|
| [`program.html`](program.html) | The athlete PWA — Home · My Plan · Coach · Library [Read \| Train] · Habits (→ `habits.html`). Loads `data/<id>.json`. Demo: `?client=demo` | [`SCHEMA.md`](SCHEMA.md) |
| [`habits.html`](habits.html) | **AA Proof** — habit tracker. Three tabs: Today · Progress · Crew (no chat; Settings sits behind the initials button in the header). **Per-habit levels + an overall level** on a 10-name × 5-sub rank ladder (ROOKIE→IMMORTAL, then prestige stars), **The long game** (a 14-reward track of titles + shareable-card looks, kept for good across season resets), full-screen level-up celebration, 5-tier consistency ladders, opt-in server-scored **leaderboard**, **Roll Call** (one sentence a day, shared), a **3-day backfill window** on the log, offline-durable saving. **Installs to the home screen** (own manifest, `start_url` carries the athlete's link; offered once after their first log, plus a permanent Settings row). Reached from `program.html` (Home card + Habits tab). Same `?client=<id>&key=<key>` link as the program. **Also runs standalone for free (non-coached) users** — `"tier": "free"` in `data/<id>.json` locks WORKOUT and swaps the programme links for coaching CTAs; they sign up at [`proof.html`](proof.html). Demo: `?client=demo` | [`HABITS.md`](HABITS.md) · [`XP_SYSTEM.md`](XP_SYSTEM.md) · [`QUESTS.md`](QUESTS.md) |
| [`coach.html`](coach.html) | **The Coach's Box** — mission control for coaching *and* Proof, four tabs: **Today** (on-court count, the roll-call wall with the coach-line composer + hide/show moderation, a needs-you queue, the quest-week lever, a 7-day Proof pulse) · **Athletes** (one roster across both systems, one file per person: links, Proof strip, ACWR/readiness/adherence charts, messages, call logs, prescribed program, session logs) · **Proof** (server-scored board, season, signup funnel with upgrade flags, titles minted) · **Links**. Google sign-in. Preview the layout with `?demo=1`. ⚠ Never scores Proof itself — presence facts + server RPCs only | [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) |
| [`call-log.html`](call-log.html) | Weekly check-in tool — 8-section script, scores, AI summary prompts | [`CALL_LOG.md`](CALL_LOG.md) |

---

## 🎨 Design system

Three layers, in the order a designer should read them:

- **Designer's atlas:** [`Content/DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md) — **open this
  when designing anything.** Grab-and-go asset shelf, carousel/reel/card recipes,
  current-vs-retired rulings, the app-look cheat sheet, Amir's taste, open flags.
- **Brand bible:** [`Content/DESIGN_SYSTEM.md`](Content/DESIGN_SYSTEM.md) — palette
  (RG green `#0E4A36` + clay `#C7552F` on warm paper, **no yellow/gold**), marks &
  wordmark lockup, Persian sign-offs, the canonical **reel outro**, carousel/reel/web rules.
- **Coded tokens (load in order):**
  [`tokens.css`](assets/css/tokens.css) → [`base.css`](assets/css/base.css) →
  [`components.css`](assets/css/components.css).
- **Shared chrome:** [`partials/nav.html`](partials/nav.html) ·
  [`partials/footer.html`](partials/footer.html) — injected by
  [`assets/js/shared.js`](assets/js/shared.js) (nav, footer, video pop-ups, install prompt, scroll reveal).
- **Master marks:** [`icon-192.png`](assets/img/icon-192.png) (app tile; masters in
  [`assets/img/source/`](assets/img/source/)) ·
  [`og-image.jpg`](assets/img/og-image.jpg) (wordmark lockup / share image) ·
  court textures [`court-sessions.jpg`](court-sessions.jpg) /
  [`court-playbook.jpg`](court-playbook.jpg) (the signature backgrounds).

---

## 🏋️ The coaching system — what Amir does & his principles

The brain behind every program. Read the principles before touching sets/reps.

- **Philosophy:** [`.claude/COACHING-PRINCIPLES.md`](.claude/COACHING-PRINCIPLES.md) — Amir's codified S&C method («هیچی بی‌دلیل نیست» — nothing without a reason).
- **How to run the pipeline:** [`.claude/COACHING-HOWTO.md`](.claude/COACHING-HOWTO.md)
- **The brief agent:** [`.claude/agents/athlete-brief.md`](.claude/agents/athlete-brief.md) — distils one athlete's data into a clean one-page brief.
- **Per-athlete rationale log:** [`.claude/coaching-log/`](.claude/coaching-log/) — coach-only *why* notes.

**The skill pipeline** (`.claude/skills/` — run as `/name`):

| Step | Skill | Does |
|---|---|---|
| 1 | [`athlete-intake`](.claude/skills/athlete-intake/SKILL.md) | Onboard a new client → Athlete Brief |
| 2 | [`program-roadmap`](.claude/skills/program-roadmap/SKILL.md) | Lock the multi-cycle plan (run once) |
| 3 | [`program-design`](.claude/skills/program-design/SKILL.md) | Design one cycle (the core S&C pass) |
| 4 | [`program-engage`](.claude/skills/program-engage/SKILL.md) | Write the in-app messages/notes |
| 5 | [`program-assemble`](.claude/skills/program-assemble/SKILL.md) | Build & validate `data/<id>.json` |
| ✎ | [`program-edit`](.claude/skills/program-edit/SKILL.md) | Review / fix an existing program |
| 🔬 | [`sc-research`](.claude/skills/sc-research/SKILL.md) | Find & translate the S&C evidence |
| 🆓 | [`proof-signup`](.claude/skills/proof-signup/SKILL.md) | Turn a `proof.html` signup email into a live habit-tracker link (no programme) |

**Content skills:** [`article`](.claude/skills/article/SKILL.md) (publish a blog) ·
[`workout`](.claude/skills/workout/SKILL.md) (publish a Train session) ·
[`carousel`](.claude/skills/carousel/SKILL.md) (build an Instagram carousel) ·
[`reel`](.claude/skills/reel/SKILL.md) (build an animated Instagram reel).

---

## 📚 Content libraries (what's inside the app)

| Library | Manifest | Files | Tab |
|---|---|---|---|
| **Read** (articles) | [`articles/index.json`](articles/index.json) | `articles/<category>/*.json` | Library → Read |
| **Train** (workouts) | [`workouts/index.json`](workouts/index.json) | `workouts/<category>/*.json` | Library → Train |
| **Athlete programs** | — | `data/<athlete-id>.json` (one per athlete) | the whole app |
| **Exercise → video** | [`exercise_library.json`](exercise_library.json) | *generated from Notion* | video pop-ups |

Each article/workout is shareable: `program.html?article=<id>` / `?workout=<id>`.
Field reference for all three lives in [`SCHEMA.md`](SCHEMA.md).

---

## 🗄️ Backend, data & sync

- **Database (Supabase):** [`supabase/`](supabase/) — staged SQL, applied in order:
  [`stage1_schema`](supabase/stage1_schema.sql) (progress) ·
  [`stage2_keys`](supabase/stage2_keys.sql) (per-athlete keys) ·
  [`stage3_messages`](supabase/stage3_messages.sql) (messaging) ·
  [`stage4_restore`](supabase/stage4_restore.sql) ·
  [`stage5_call_logs`](supabase/stage5_call_logs.sql) ·
  [`stage7_call_log_ai`](supabase/stage7_call_log_ai.sql) ·
  [`stage8_cycle_reports`](supabase/stage8_cycle_reports.sql) ·
  [`stage9_leaderboard`](supabase/stage9_leaderboard.sql) (opt-in board + `xp_rules`) ·
  [`stage10_workout_days`](supabase/stage10_workout_days.sql) (feeds the WORKOUT habit) ·
  [`stage11_seasons`](supabase/stage11_seasons.sql) ·
  [`stage12_bonus_xp`](supabase/stage12_bonus_xp.sql) (badge XP; **partly superseded**) ·
  [`stage14_quest_runs`](supabase/stage14_quest_runs.sql) (quests + the current `hab_bonus_xp`) ·
  [`stage15_roll_call`](supabase/stage15_roll_call.sql) (one sentence a day) ·
  [`stage16_contacts`](supabase/stage16_contacts.sql) (coach-only contact book for free
  signups — `add_contact` / `contact_list` / `forget_contact`) ·
  [`stage17_titles`](supabase/stage17_titles.sql) (titles on the board — the minted
  `hab_titles` record, `claim_titles` / `set_title`, and `passTrack` on `xp_rules`) ·
  [`stage18_day_rosters`](supabase/stage18_day_rosters.sql) (a day is scored against the
  habits that were on **that** day — the current `hab_bonus_xp`).
- **Notion sync (exercise videos):** [`sync_notion.py`](sync_notion.py) +
  [`NOTION_SYNC.md`](NOTION_SYNC.md) → regenerates `exercise_library.json`.
- **Importing reports:** [`IMPORTING_SESSION_REPORTS.md`](IMPORTING_SESSION_REPORTS.md).

---

## 🖼️ Assets — every image, icon & photo

| Folder | What's in it |
|---|---|
| [`assets/img/`](assets/img/) | Brand marks, favicons, app icons, `coach.jpg`, sport motif. `source/` = master logo art; `generate_icons.py` rebuilds all sizes |
| [`assets/img/athletes/`](assets/img/athletes/) | Athlete headshots (testimonials / cards) |
| [`assets/cycles/`](assets/cycles/) | Cycle cover images (Foundation Forge, Strength Engine, …) → see [`README`](assets/cycles/README.md) |
| [`assets/days/`](assets/days/) | Per-day-type thumbnails (upper, lower, power, core, recovery…) → [`README`](assets/days/README.md) |
| [`assets/img/workouts/`](assets/img/workouts/) | Train-library thumbnails (conditioning, mobility, on-court) |
| root `*.jpg` | Marketing/preview shots (court-sessions, library-doors, app-warmup-preview…) — see [`IMAGES.md`](IMAGES.md) |

---

## 📱 Social / marketing studio — `Content/`

Standalone tools, **not** linked from the live site — open them directly to design social
posts. Build rules + asset shelf live in [`DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md).

- **Carousels** (1080×1350): kit = [`Carousel-Kit.html`](Content/Carousel-Kit.html)
  (23 slide templates) · **newest reference** =
  [`carousel-warmup-tennis.html`](Content/carousel-warmup-tennis.html) · older decks:
  [`method`](Content/carousel-method.html), [`recovery-run`](Content/carousel-recovery-run.html),
  [`file-vs-coach`](Content/carousel-1-file-vs-coach.html) (stale chrome — see atlas) ·
  oldest: [`instagram-carousels.html`](Content/instagram-carousels.html).
- **Reels** (1080×1920): build with the [`/reel` skill](.claude/skills/reel/SKILL.md) ·
  **newest** = [`reel-6-system`](Content/reel-6-system.html) (English, continuously animated —
  ambient motion, Ken Burns, typing dots, etc. — `?beat=N` still mode, `?capture=1` export mode) ·
  **signature product pattern** = [`reel-4-app`](Content/reel-4-app.html) ("App-as-Product") ·
  earlier/retired-language generation: [`reel-5-system`](Content/reel-5-system.html) (Farsi) ·
  [`reel-1-dashboard`](Content/reel-1-dashboard.html) ·
  [`reel-2-roadmap`](Content/reel-2-roadmap.html) ·
  [`reel-3-pocket`](Content/reel-3-pocket.html) (pre-date the no-gold rule).
- **Result cards / app mockups:** [`card-preview.html`](Content/card-preview.html)
  (rebuilds every app card with real class names) → exports in
  [`instagram-cards/`](Content/instagram-cards/) (legacy style, off-palette).
- **Image kits:** [`tennis-players/`](Content/tennis-players/) (transparent player cutouts) ·
  [`recovery-run/`](Content/recovery-run/) (graded photo-story frames).

---

## 🛠️ Reference docs (the manuals)

| Doc | Covers |
|---|---|
| [`Content/DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md) | Designer's working file — assets, recipes, rulings |
| [`CODEBASE.md`](CODEBASE.md) | Plain-English file-by-file guide |
| [`SCHEMA.md`](SCHEMA.md) | Every JSON field (program / article / workout) |
| [`Content/PRODUCT.md`](Content/PRODUCT.md) | The business/product brief |
| [`Content/HOW-IT-WORKS.md`](Content/HOW-IT-WORKS.md) | Customer-facing process explainer |
| [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) | `coach.html` manual |
| [`CALL_LOG.md`](CALL_LOG.md) | `call-log.html` manual |
| [`IMAGES.md`](IMAGES.md) | What every marketing image is + how to make more |
| [`NOTION_SYNC.md`](NOTION_SYNC.md) · [`IMPORTING_SESSION_REPORTS.md`](IMPORTING_SESSION_REPORTS.md) | Sync / import how-tos |
| [`QUESTS.md`](QUESTS.md) | **The quest catalogue** — what's running, the built quests, ready-made weeks, idea bank |
| [`CLAUDE.md`](CLAUDE.md) | Working notes / preferences for AI assistants |

---

*No build step — edit, push, it's live (GitHub Pages → amirardekani.com).
When you add a page, asset, or skill, drop a line in this map so it stays the
one place that knows where everything is.*
