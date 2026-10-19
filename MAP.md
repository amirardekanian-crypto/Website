# 🗺️ The Map — everything in Amir's website, in one place

Open this, find anything in a second. Every box below links to the real file.
This is the **index**; the deep guides it points to (`CODEBASE.md`, `SCHEMA.md`,
`DESIGN_SYSTEM.md`, `COACHING-PRINCIPLES.md`) are where the detail lives.

> **One-line mental model:** a public **website** (English and Farsi, both for
> tennis and padel players) feeds an apply **form**, which feeds a private **coaching
> system** (skills + principles) that produces each athlete's **program app**,
> backed by **Supabase**. A separate **social studio** (`Content/`) makes the
> Instagram carousels/reels. One **design system** ties the whole look together.

---

---

## 🚪 The four doc layers (read only what your job needs)

| Layer | Where | Read it… |
|---|---|---|
| **The door** | [`CLAUDE.md`](CLAUDE.md) | every session, automatically. Who/what this is, the non-negotiables, and the **READ-LIST**: per job, exactly which files to open. |
| **Rules** | [`docs/rules/`](docs/README.md) | when you change that area. One short file per area, the rule in current tense. Twelve files, 2–17 KB each. |
| **Reference** | [`PROGRAM-APP.md`](PROGRAM-APP.md) · [`HABITS.md`](HABITS.md) → one file per section in [`docs/ref/`](docs/README.md) | by name, from the index. Each of those two files is now a one-line-per-section index; the sections are their own files (49 and 19 of them). Never read whole. |
| **Record** | [`docs/record/`](docs/record/INDEX.md) | never, unless you ask. Dated audits, walkthroughs, histories. |

The layers, the rules-file list and the house rules for writing them are in [`docs/README.md`](docs/README.md).

| Rules file | Area |
|---|---|
| [`docs/rules/server-and-data.md`](docs/rules/server-and-data.md) | programmes live on the server; backups; coaching logs; erasure |
| [`docs/rules/program-app.md`](docs/rules/program-app.md) | the athlete app: data, sessions, saving |
| [`docs/rules/program-app-look.md`](docs/rules/program-app-look.md) | the athlete app: screens, cards, colour, navigation |
| [`docs/rules/habits.md`](docs/rules/habits.md) | AA Proof, the habit app (being retired) |
| [`docs/rules/habits-in-app.md`](docs/rules/habits-in-app.md) | the habits where they live now: Today's card, the habit half of Progress, the list |
| [`docs/rules/coach-dashboard.md`](docs/rules/coach-dashboard.md) | the coach dashboard |
| [`docs/rules/career.md`](docs/rules/career.md) | Career Mode |
| [`docs/rules/push.md`](docs/rules/push.md) | reminders on a phone |
| [`docs/rules/site.md`](docs/rules/site.md) | the public site, the Farsi products, the chatbot |
| [`docs/rules/seo.md`](docs/rules/seo.md) | article pages, SEO, content parity |
| [`docs/rules/design.md`](docs/rules/design.md) | design work |
| [`docs/rules/coaching.md`](docs/rules/coaching.md) | the coaching pipeline and the rule index |
| [`docs/rules/working-with-amir.md`](docs/rules/working-with-amir.md) | how Amir works; verifying the live site; the hooks setup |

## 🔎 "Where do I find…?" — jump table

| I'm looking for… | Go to |
|---|---|
| **A function, a style block or a screen inside an app file** | [`docs/ref/line-map/`](docs/ref/line-map/program-app.md) — the generated line map for `program.html`, `habits.html`, `coach.html` and `sw.js`. Jump by line number instead of searching 20,809 lines. |
| **Anything design** — assets, format recipes, current rules, app look | [`Content/DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md) ← the designer's working file |
| The look/brand rules (colours, fonts, marks, reels) | [`Content/DESIGN_SYSTEM.md`](Content/DESIGN_SYSTEM.md) · [colour tokens](assets/css/tokens.css) |
| A specific image (logo, court photo, banner, headshot) | [Asset shelf](Content/DESIGN-ATLAS.md#asset-shelf--grab--go) in the atlas |
| How to build a carousel / reel / result card | [Recipes](Content/DESIGN-ATLAS.md#recipe-carousel-ig-45-10801350) in the atlas |
| What the business *is* (pricing, voice, backend) | [`Content/PRODUCT.md`](Content/PRODUCT.md) |
| How the coaching process works (customer-facing) | [`Content/HOW-IT-WORKS.md`](Content/HOW-IT-WORKS.md) |
| What the website chatbot knows (prices, products, FAQ; Amir edits it) | [`Content/CHATBOT-FACTS.md`](Content/CHATBOT-FACTS.md) |
| Amir's coaching philosophy (the *why* behind sets/reps) | [`.claude/COACHING-PRINCIPLES.md`](.claude/COACHING-PRINCIPLES.md) |
| File-by-file plain-English guide | [`CODEBASE.md`](CODEBASE.md) |
| What fields a program / article / workout JSON can have | [`SCHEMA.md`](SCHEMA.md) |
| **How XP, levels and ranks work** (and how to retune them) | [`XP_SYSTEM.md`](XP_SYSTEM.md) — the index; 19 sections in [`docs/ref/xp-system/`](docs/ref/xp-system/) |
| **Career Mode, the gamification system for both apps** (designed 2026-10-17; phase 1 live in shadow the same day; phase 2, the XP switch, applied on the server 2026-10-17 and switched on 2026-10-18; phase 3, rewards with meanings and the catalogue switch, built, applied and switched on 2026-10-18, with its main-lift fix, stage73, applied the same day; a change of rules applies forward only from now on, D20, decided and not built; its profile is two reads, `get_profile()` the core and `get_awards()` the shelf): XP, level, badges, achievements, titles, weekly missions, personal quests, recognition | [`career/CAREER_MODE.md`](career/CAREER_MODE.md) · how each part works: [`career/PROCEDURES.md`](career/PROCEDURES.md) · the editable numbers and catalogue: [`career/README.md`](career/README.md) · the server half: [`supabase/stage66_career_mode.sql`](supabase/stage66_career_mode.sql), seeded by [`scripts/career_seed.py`](scripts/career_seed.py), rehearsed by [`scripts/career/rehearse.mjs`](scripts/career/rehearse.mjs) (the three rehearsals share [`scripts/career/rehearse_lib.mjs`](scripts/career/rehearse_lib.mjs) and start from the schema snapshot), taken off by [`scripts/career/rollback_stage66.sql`](scripts/career/rollback_stage66.sql) · what athletes see so far: Hold Serve on the training app's Home ([`PROGRAM-APP.md`](PROGRAM-APP.md) → *Hold Serve on Home*; checked by [`scripts/headless/hold-serve.js`](scripts/headless/hold-serve.js), its twin cases [`scripts/career/hold_cases.json`](scripts/career/hold_cases.json)) · **phase 2, the XP switch** (applied 2026-10-17, switched on 2026-10-18): the server half [`supabase/stage69_career_xp_switch.sql`](supabase/stage69_career_xp_switch.sql) (with the cache table `career_scores`), rehearsed by [`scripts/career/rehearse_switch.mjs`](scripts/career/rehearse_switch.mjs), taken off by [`scripts/career/rollback_stage69.sql`](scripts/career/rollback_stage69.sql), the phones' twin cases [`scripts/career/xp_cases.json`](scripts/career/xp_cases.json), checked in both apps by [`scripts/headless/career.js`](scripts/headless/career.js) · what athletes see: the Career row on Home and what a session earns ([`PROGRAM-APP.md`](PROGRAM-APP.md) → *Career on Home, and what a session earns*), and in AA Proof the career level and its reveal ([`HABITS.md`](HABITS.md) → *Career Mode (phase 2, the XP switch)*) |
| How to run the coaching skills (intake → ship) | [`.claude/COACHING-HOWTO.md`](.claude/COACHING-HOWTO.md) |
| The home page / hero | [`index.html`](index.html) (EN) · [`index-fa.html`](index-fa.html) (FA) |
| The athlete training app | [`program.html`](program.html) · how its features work: [`PROGRAM-APP.md`](PROGRAM-APP.md) |
| **The athlete app, as a first-time client sees it** (screens, first session, words, situations; plus findings for Amir) | [`docs/record/CLIENT-APP-MAP.md`](docs/record/CLIENT-APP-MAP.md) |
| The Farsi products (the paid course app, the testing app's page) | [`FARSI-PRODUCTS.md`](FARSI-PRODUCTS.md) |
| The coach dashboard ("The Coach's Box") | [`coach.html`](coach.html) · manual: [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) |
| Where one athlete's program lives | a row in `public.programs` (Supabase; `data/<id>.json` is local scratch only) → [`SCHEMA.md`](SCHEMA.md) |
| Brand images / icons / photos | [Assets ↓](#-assets--every-image-icon--photo) |
| The checks (pre-commit guards, headless suites, restore, site audit) | [Scripts ↓](#-scripts--checks-and-tools) |
| The athlete-app redesign audit (Quiet Frame) | <https://claude.ai/artifact/BBWjsR99FqthXmzCkeyK49> · local working kit `.claude/audit-kit/` (gitignored, never committed) |
| Which doc owns a topic, and what to open for a given job | [`CLAUDE.md`](CLAUDE.md) → *THE READ-LIST* · the layers: [`docs/README.md`](docs/README.md) |

---

## 🌐 The website (public pages)

English is the default (`/`); Farsi (`index-fa.html`) is for tennis and padel players in Iran
(since 2026-09-13). Match **facts**, not wording. Shared nav/footer are injected by `shared.js`.

| Page | EN | FA | What it is |
|---|---|---|---|
| Home | [`index.html`](index.html) | [`index-fa.html`](index-fa.html) | Front door: hero, proof, FAQ, CTAs → form |
| Articles (web) | [`en/articles/`](en/articles/index.html) | [`fa/articles/`](fa/articles/index.html) | Every app article as a public page. **Generated** by [`scripts/build_article_pages.py`](scripts/build_article_pages.py) — never hand-edit |
| Tennis course (product page) | — | [`tennis/`](tennis/index.html) | **سیستم آمادگی جسمانی تنیس**: the product page for the paid self-guided course (the app itself is [`tennis/app/`](tennis/app/index.html); its **demo** is `tennis/app/?demo=1`: week 1, one test and three lessons open, the rest locked server-side by `tps_demo()` in [`supabase/tps_02_demo.sql`](supabase/tps_02_demo.sql)). Hero, the 3-level ladder (پایه · پیشرفته · حرفه‌ای), the **«تو کدوم سطحی؟» level test** ([`tennis/level-test.js`](tennis/level-test.js), rules in its header; stores nothing, sends only a Plausible `Level test 1/2/3` event), what's inside, 4 buy steps, the $17 one-time price, FAQ. Buy buttons open WhatsApp with the message typed. Every Farsi product page shares [`assets/css/fa-product.css`](assets/css/fa-product.css) and the self-hosted font in [`assets/fonts/`](assets/fonts/). Linked from `index-fa.html` (menu «دوره» + the «محصولات» strip). The demo is linked from this page (menu, hero, inside, price, FAQ), the course card on `index-fa.html` and `links.html`. **Tutorial:** a 15-step guided **tour** (a clay ring on real controls; it walks all five tabs and opens step-by-step mode for real) that runs once on a first open — `?tour=1` replays it — plus the **guide** it leaves behind at `#/guide`, a map of the app reached from the **؟** on every tab banner. Both in `app.js` under *The tour and the guide*, both in Farsi, both shown to buyers and demo visitors. **Pictures:** AI-made, in [`assets/tps/`](assets/tps/), shown to everyone since 2026-09-20 (the `?art=1` flag and the demo-only gate are both gone); [`scripts/grade_tps_art.py`](scripts/grade_tps_art.py) gives every one the same colour grade |
| Tennis testing app (product page) | — | [`tennis-testing/`](tennis-testing/index.html) | **آزمون آمادگی جسمانی تنیس** for coaches and academies: why test, the ready and coming tests, the three ways a result reads, one login for the whole academy, equipment, $17 once (WhatsApp buy), FAQ, and real app screens taken with made-up sample players. The app itself is [`tennis-testing/app/`](tennis-testing/app/index.html), a shell deployed from the private assess-content repo. Linked from `index-fa.html` (menu «برای مربی‌ها» + the third «محصولات» card) |
| Apply form | [`form.html`](form.html) | [`form-fa.html`](form-fa.html) | Intake questionnaire → **saved to Supabase** (`hab_intake`, read in `coach.html` → Intake) **and** emails Amir (Web3Forms) |
| Terms | [`terms.html`](terms.html) | [`terms-fa.html`](terms-fa.html) | Legal / training disclaimers |
| Privacy | [`privacy.html`](privacy.html) | — | GDPR privacy notice |
| Proof signup | [`proof.html`](proof.html) | — | Public landing page for the **free habit tracker** — what it is, then name + email + WhatsApp → emails Amir (Web3Forms). **Not linked from nav** on purpose: it's the Instagram bio link. Sign people up with the [`/proof-signup`](.claude/skills/proof-signup/SKILL.md) skill |
| Coach affiliate | — | [`partner-fa.html`](partner-fa.html) | Referral partnership pitch for other coaches — the 10%/10% deal, plain-language terms, and an application form → emails Amir (Web3Forms). Accepted coaches get a code in [`coach.html`](coach.html) → **Affiliates** (`public.affiliates`, coach-only), which both apply forms check live — no form edits |
| UTS padel course | [`uts-padel.html`](uts-padel.html) | — | Client-facing page + athlete form for the **6-Week Padel Performance Course at The UTS, Hoylake** (Amir's club course). UTS-branded (their logo + gym photo in [`assets/img/uts/`](assets/img/uts/)); the six weeks drawn as a Tube line; a 6-step form with a health screen, emergency contact, under-18 guardian consent. Saved to Supabase `hab_intake` (programme = `UTS Padel Performance Course`) **and** emails Amir. `noindex`, not linked from nav |
| Etminan academy | [`etminan-en.html`](etminan-en.html) | [`etminan.html`](etminan.html) | Partner page + sign-up form for Etminan Tennis Academy players (also [`etminan-dv.html`](etminan-dv.html), Dhivehi). Intakes tagged `Etminan Tennis Academy`. `noindex` |
| Mehraneh Zohourian's site | — | **separate project, not in this repo**: [`mehranehzohourian.com`](https://mehranehzohourian.com/) | A coach's Farsi site (tennis and padel, Mashhad) moved out on 2026-10-02 to its own repo [`amirardekanian-crypto/mehraneh-site`](https://github.com/amirardekanian-crypto/mehraneh-site) and its own local folder, `GitHub/mehraneh-site`, a sibling of `Website`. Its map is `MAP.md` there. **Edit it there, not here** |
| EN redirect | [`index-en.html`](index-en.html) | — | Permanent redirect to `/` |

**Plumbing:** [`CNAME`](CNAME) (domain) · [`sitemap.xml`](sitemap.xml) (generated) ·
[`robots.txt`](robots.txt) · [`manifest.json`](manifest.json) (PWA install) ·
[`sw.js`](sw.js) (service worker / offline) · [`favicon.ico`](favicon.ico).

---

## 🔒 Private apps (link-only, `noindex`)

| File | What it is | Manual |
|---|---|---|
| [`program.html`](program.html) | The athlete PWA. Four tabs: **Home** (greeting, This Week, Next up, the other days, **Today**: the session and the habits as one card) · **Progress** (the This cycle card, **Your numbers**: Personal Records and Body weight, then the Game Plan road of cycles) · **Library** (one screen: Sessions · Playbook · Exercises; no doors page since 2026-10-13) · **Coach** (WhatsApp). Every screen is drawn in the **Centre Court look** (the Quiet Frame redesign, 2026-10-12/13; one CSS block per screen, headed "… IN THE CENTRE COURT LOOK"). Sheets: the ⓘ **About sheet** (Changeover), How to do it (steps and cues from the Spine), History. The habits moved in on 2026-10-19 (AA Proof is being retired): Home's Today card logs them, on AA Proof's own keys, through `assets/js/habits-core.js`. Loads the athlete's row in `public.programs` after sign-in (`get_program()`). Offline: `sw.js` cache `aap-v137`. Demo: `?client=demo`. Features in full: [`PROGRAM-APP.md`](PROGRAM-APP.md); a first-timer's walk-through: [`docs/record/CLIENT-APP-MAP.md`](docs/record/CLIENT-APP-MAP.md); the redesign audit, **Quiet Frame**: <https://claude.ai/artifact/BBWjsR99FqthXmzCkeyK49> | [`PROGRAM-APP.md`](PROGRAM-APP.md) · [`SCHEMA.md`](SCHEMA.md) |
| [`habits.html`](habits.html) | **AA Proof** — habit tracker. Four tabs: Today · Progress · Crew · Locker (no chat; Settings sits behind the initials button in the header). **Per-habit levels + an overall level** on a 10-name × 5-sub rank ladder (ROOKIE→IMMORTAL, then prestige stars), **The long game** (a 14-reward track of titles + shareable-card looks, kept for good across season resets), full-screen level-up celebration, 5-tier consistency ladders, server-scored **leaderboard** (every athlete joins once, automatically, after a first finished workout; leaving sticks), **Roll Call** (one sentence a day, shared), a **3-day backfill window** on the log, offline-durable saving. **Installs to the home screen** (own manifest, `start_url` carries the athlete's link; offered once after their first log, plus a permanent Settings row). Reached from `program.html` (Home's Daily habits row, and a finished session's "open AA Proof" line), and **embedded on that app's Home** (`?embed=1`: today's rows only, ticked in place, `renderEmbed()`). Same login as the program — username and password (⚠️ the old `?client=<id>&key=<key>` links are retired and refused). **Also runs standalone for free (non-coached) users** — `"tier": "free"` in the `athlete` block of their `public.programs` row locks WORKOUT and swaps the programme links for coaching CTAs; they sign up at [`proof.html`](proof.html). Demo: `?client=demo` | [`HABITS.md`](HABITS.md) · [`XP_SYSTEM.md`](XP_SYSTEM.md) · [`QUESTS.md`](QUESTS.md) |
| [`coach.html`](coach.html) | **The Coach's Box**, mission control for coaching *and* Proof. Seven places in one bar: **Today** (Needs you first, Also waiting, a short Proof column) · **Athletes** (one roster; one file per person: The work · Proof · File, Danger zone folded) · **Exercises** (Entries · Qualities · Coverage: the Spine) · **Proof** (the crew's home: wall, quest lever, board) · **Leads** (Applications · Free signups · Referral codes) · **Library** · **Buyers** (Course · Testing app). **⚙ Tools** (Backup, logins) sits in the top bar. Old hashes (`#intake`, `#affiliates`, `#assess`, `#course`) are rewritten by `fixLegacyHash()`. Google sign-in. Layout preview: `?demo=1`. Tested by the harness in [`scripts/headless/coach/`](scripts/headless/coach/README.md). ⚠ Never scores Proof itself | [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) |
| [`jump.html`](jump.html) | **Jump test** — measures countermovement jump and squat jump height, drop-jump RSI and the 10-5 repeated hop test from a phone video. Entirely on-device: the video is read in the browser, nothing is uploaded, there is no account and no backend. Opens as coaching (what the test is for, how to film it, how to perform it) and only then asks for a clip. Refuses clips under 120 fps, because below that the camera's own error is too big for the change rule. **History is split by athlete, scores each session by its best good rep, and only calls a change real past a line built from published test-retest error** (sessions and baseline in [`progress.js`](assets/js/jump/progress.js), the lines in each test's `changeRule`, no verdict yet for drop jump and the 10-5). **All the knowledge lives outside the page**, one file per thing that might change: [`assets/js/jump/`](assets/js/jump/) holds the physics, the change rule, the camera guide, the athlete questions and one file per test. Companion dev page [`jump-selftest.html`](jump-selftest.html) runs synthetic jumps with a known answer against the engine. `noindex`, not in the nav | [`assets/js/jump/README.md`](assets/js/jump/README.md) |
| [`reach/`](reach/index.html) | **Reachability probe** (Farsi, Phase 0 of the Tennis Performance System plan). Athletes in Iran open it with the VPN off and then on. It times a same-site download (`reach/pad.bin`), Supabase sign-in/data/upload, YouTube, Aparat, jsDelivr and Google Fonts; records browser, storage and clock facts; and prints one line to screenshot and send Amir. Stores nothing and sends nothing else. **Fully self-contained** (no external CSS, JS or fonts, because any of those could be what is blocked). `sw.js` deliberately leaves `/reach/` alone, or it would answer from cache and fake a pass. `noindex`, not in the nav | — |
| [`assets/js/habits-core.js`](assets/js/habits-core.js) | **The habit engine**, and the ONE copy of it: the catalogue, the roster timeline, the log, what a day is worth, the verdict, the day streak and the 3-day backfill window. ⚠️ **Generated** — every line is cut out of `habits.html` by [`scripts/build_habits_core.js`](scripts/build_habits_core.js), and pre-commit guard 26 fails a commit where the two have drifted. `program.html` loads it and draws Home's **Today** card from it; AA Proof still has the same code inline until it is deleted, and then this file becomes the source of truth. | [`docs/rules/program-app.md`](docs/rules/program-app.md) |
| [`pushtest/`](pushtest/index.html) | **Push reachability test** (2026-10-19, temporary). Answers one question before notifications are built into the apps: does a web notification reach this phone? Asks for permission, subscribes, and shows the subscription code for the person to send Amir; it calls no server of ours at all. Ships its OWN worker (`pushtest/sw.js`, scope `/pushtest/`, caches nothing) which holds the subscription, shows what is pushed and keeps a log of what arrived and how late. The root `sw.js` leaves `/pushtest/` alone (v185), as it does `/reach/`. **One permission per origin and only one chance**: a “don’t allow” here blocks program.html and habits.html on that phone too, which is why the warning sits above the button. iPhone needs iOS 16.4+ and the page on the Home Screen. Self-contained, `noindex`, not in the nav. Sent with [`scripts/pushtest/send.mjs`](scripts/pushtest/send.mjs) (VAPID keys live outside the repo). **Delete it, and the root `sw.js` line, once the question is answered.** | — |
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
  The Farsi homepage and product pages keep their own nav; [`assets/js/fa-nav.js`](assets/js/fa-nav.js) opens and closes their phone menu (☰).
  The chat bubble on both homepages and the two Farsi product pages is [`assets/js/site-chat.js`](assets/js/site-chat.js); its answers come from the Edge Function `site-chat` and [`Content/CHATBOT-FACTS.md`](Content/CHATBOT-FACTS.md) (CLAUDE.md → *The website chatbot*).
  [`assets/js/track.js`](assets/js/track.js) counts Apply, WhatsApp and demo clicks and the apply form's steps in Plausible (funnel pages only).
  [`assets/js/sharecard.js`](assets/js/sharecard.js) is **Highlight Reel**, the training app's share cards (a win drawn as an Instagram Story or post,
  English or Farsi; every Farsi word in its `FA` table was approved by Amir on 2026-10-19): [`PROGRAM-APP.md`](PROGRAM-APP.md) → *Highlight Reel*.
- **Master marks:** [`icon-192.png`](assets/img/icon-192.png) (app tile; masters in
  [`assets/img/source/`](assets/img/source/)) ·
  [`og-image.jpg`](assets/img/og-image.jpg) (wordmark lockup / share image) ·
  court textures [`court-sessions.jpg`](court-sessions.jpg) /
  [`court-playbook.jpg`](court-playbook.jpg) (the signature backgrounds).

---

## 🏋️ The coaching system — what Amir does & his principles

The brain behind every program. Read the principles before touching sets/reps.

- **Philosophy:** [`.claude/COACHING-PRINCIPLES.md`](.claude/COACHING-PRINCIPLES.md) — Amir's codified S&C method («هیچی بی‌دلیل نیست» — nothing without a reason): the rule index, then what each rule means. Its history (dates, Amir's words, where each rule came from) is [`docs/record/COACHING-PRINCIPLES-HISTORY.md`](docs/record/COACHING-PRINCIPLES-HISTORY.md), which no stage reads.
- **How to run the pipeline:** [`.claude/COACHING-HOWTO.md`](.claude/COACHING-HOWTO.md)
- **The brief agent:** [`.claude/agents/athlete-brief.md`](.claude/agents/athlete-brief.md) — data prep only: a new athlete's intake form from Gmail, and the Gmail session-report import /cycle-report runs first.
- **Per-athlete rationale log:** coach-only *why* notes in `public.coaching_logs` on the server, read and written from coach.html → the athlete → File (it used to be `.claude/coaching-log/`, in this public repo).

**The skill pipeline** (`.claude/skills/` — run as `/name`):

| Step | Skill | Does |
|---|---|---|
| 1 | [`athlete-intake`](.claude/skills/athlete-intake/SKILL.md) | Onboard a new client → Athlete Brief |
| 2 | [`program-roadmap`](.claude/skills/program-roadmap/SKILL.md) | Lock the multi-cycle plan (run once) |
| 3 | [`program-design`](.claude/skills/program-design/SKILL.md) | Design one cycle (the core S&C pass). [Queries](.claude/skills/program-design/queries.sql) (the one context pull, the log slice) · [The athlete profile](.claude/skills/program-design/PROFILE.md) (its format, the academy tier) |
| 4 | [`program-assemble`](.claude/skills/program-assemble/SKILL.md) | **Part A:** build the programme and run every programming check (`scripts/check_program.py`), then straight on to step 5. **Part B**, after "ship it": place the words, full check, publish in one call (`publish_cycle()`) |
| 5 | [`program-engage`](.claude/skills/program-engage/SKILL.md) | Write the in-app messages, notes, week notes and WhatsApp |
| 6 | [`cycle-report`](.claude/skills/cycle-report/SKILL.md) | End of a cycle: the athlete's WhatsApp cycle report (wins, what they told you, what's next, what you need from them, 3 questions) + a coach-only **Debrief** section in their coaching log, which step 3 reads next time. [Queries](.claude/skills/cycle-report/queries.sql) · [Shamsi dates](.claude/skills/cycle-report/shamsi.py) |
| ✎ | [`program-edit`](.claude/skills/program-edit/SKILL.md) | Review / fix an existing program |
| 🔬 | [`sc-research`](.claude/skills/sc-research/SKILL.md) | Find & translate the S&C evidence |
| 🆓 | [`proof-signup`](.claude/skills/proof-signup/SKILL.md) | Turn a `proof.html` signup email into a live habit-tracker link (no programme) |
| 💬 | [`chat-facts`](.claude/skills/chat-facts/SKILL.md) | Teach the website chatbot a new fact: read its *Not answered yet* gaps, update `Content/CHATBOT-FACTS.md`, redeploy, test, mark handled |
| 🦴 | [`spine`](.claude/skills/spine/SKILL.md) | Draft the next batch of exercises for the Spine (drafts only; Amir approves in coach.html → Exercises) |

**Content skills:** [`article`](.claude/skills/article/SKILL.md) (publish a blog) ·
[`workout`](.claude/skills/workout/SKILL.md) (publish a Train session) ·
[`carousel`](.claude/skills/carousel/SKILL.md) (build an Instagram carousel) ·
[`reel`](.claude/skills/reel/SKILL.md) (build an animated Instagram reel) · [`cut`](.claude/skills/cut/SKILL.md) (edit a talking-head reel from his own footage: silence cuts, pace, cut-ins and a motion-graphics kit shown as showreels; start at [`HANDOFF.md`](.claude/skills/cut/kit/HANDOFF.md); the 2026-10-01 research on what to adopt, the fixes it led to and the phone safe-zone test: [`RESEARCH-2026-10-01.md`](.claude/skills/cut/RESEARCH-2026-10-01.md)) ·
[`image`](.claude/skills/image/SKILL.md) (generate app art and covers — prompt craft, the
[gate tool](.claude/skills/image/tools/gate.py), grading and shipping) ·
[`video`](.claude/skills/video/SKILL.md) (generate video clips for ads — start picture first, the
3-second rule, the price list, the [clip check tool](.claude/skills/video/tools/clip_check.py) and a
ledger of what already exists in the Higgsfield account) ·
**[`ad`](.claude/skills/ad/SKILL.md) (build an ad that sells — start here for anything selling, not
at `/video`)**: the [brand and audience brief](.claude/skills/ad/BRAND.md) from Amir's own
interview, the [angle bank](.claude/skills/ad/STRATEGY.md) (seven angles, hook shapes, CTA ladder),
then Amir's own **17-stage pipeline** — objective → audience → problem → objection → message → CTA →
idea → emotion → storyboard → script → [shot list](.claude/skills/ad/SHOTS.md) → look lock →
[image prompts](.claude/skills/ad/PROMPTS.md) → selection → video prompts → edit plan → review.
One [brief per ad](Content/tps-ads/) from [`BRIEF-TEMPLATE.md`](.claude/skills/ad/BRIEF-TEMPLATE.md);
[`WHATSAPP.md`](.claude/skills/ad/WHATSAPP.md) is what he sends when someone replies;
[`LEDGER.md`](.claude/skills/ad/LEDGER.md) records what each ad cost and did.

---

## 📚 Content libraries (what's inside the app)

| Library | Manifest | Files | Tab |
|---|---|---|---|
| **Read** (articles) | [`articles/index.json`](articles/index.json) | `articles/<category>/*.json` (+ `*.fa.json` website translations) | Library → Playbook · and `/en/articles/`, `/fa/articles/` on the site |
| **Train** (workouts) | [`workouts/index.json`](workouts/index.json) | `workouts/<category>/*.json` | Library → Sessions |
| **Athlete programs** | — | a row in `public.programs` per athlete (`data/<id>.json` is local scratch only) | the whole app |
| **Exercise → video** | the Spine (`public.exercises.video`) | coach.html → Exercises | video pop-ups |

The app reads both libraries from the database (`get_library()`); the `index.json` manifests are only its fallback.
Each article/workout is shareable: `program.html?article=<id>` / `?workout=<id>`.
Field reference for all three lives in [`SCHEMA.md`](SCHEMA.md).

---

## 🗄️ Backend, data & sync

- **Database (Supabase):** [`supabase/`](supabase/) — staged SQL, applied in order:
  [`stage1_schema`](supabase/stage1_schema.sql) (progress) ·
  [`stage2_keys`](supabase/stage2_keys.sql) (per-athlete keys) ·
  [`stage3_messages`](supabase/stage3_messages.sql) (messaging; unused since 2026-09-26, table kept) ·
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
  habits that were on **that** day — the current `hab_bonus_xp`) ·
  [`stage27_intake`](supabase/stage27_intake.sql) (the apply form lands in the DB —
  anon `submit_intake`, coach-only `intake_list` (no longer called) / `set_intake_status` / `set_intake_outcome` / `delete_intake`) ·
  [`stage28_library_sessions`](supabase/stage28_library_sessions.sql) (a Library workout
  can be marked done — `log_library_session` writes it, `get_library_days` ticks the
  habit it actually is in Proof, coach-only `library_sessions_for` is the report).
- **Later stages (29 to 65):** one line each in [`CODEBASE.md`](CODEBASE.md) → *`supabase/*.sql`*. Also: [`schema_snapshot.sql`](supabase/schema_snapshot.sql), [`tests/`](supabase/tests/) (run by `scripts/test_spine_sql.sh`), the course and testing app files (`tps_*`, `assess_*`), and [`functions/`](supabase/functions/README.md) (Edge Function source; deploy with the Supabase MCP).
- **Exercise videos:** on the Spine entries, edited in coach.html → Exercises (the Notion sync
  was retired 2026-09-26).
- **The way back from a lost database** (2026-10-11, rehearsed): [`scripts/restore/README.md`](scripts/restore/README.md): the structure is
  [`supabase/schema_snapshot.sql`](supabase/schema_snapshot.sql) (generated; made again after any stage file is applied), the rows are the weekly backup, and
  [`restore_backup.py`](scripts/restore/restore_backup.py) is the step between (it leaves out everyone you erased). Proved by
  [`rehearse.mjs`](scripts/restore/rehearse.mjs) on a throwaway PostgreSQL; pre-commit guard 17 runs [`test_restore_backup.py`](scripts/test_restore_backup.py).
- **Importing reports:** [`IMPORTING_SESSION_REPORTS.md`](IMPORTING_SESSION_REPORTS.md).

---

## 🧪 Scripts — checks and tools

`scripts/` is never served (excluded in `_config.yml`). Pre-commit guards are wired in `.githooks/pre-commit` (run `git config core.hooksPath .githooks` once per clone). Detail for each: [`CODEBASE.md`](CODEBASE.md) → *Headless checks* and the guard sections after it.

| What | Where |
|---|---|
| Programme checker (the house rules; `/program-assemble` runs it) | [`scripts/check_program.py`](scripts/check_program.py) · tests `test_check_program.py` |
| Programme build (the spec's DAY blocks to the workouts JSON, Part A Step 2) and words (Part B 2f) | [`scripts/spec_to_workouts.py`](scripts/spec_to_workouts.py) · tests `test_spec_to_workouts.py` · [`scripts/place_words.py`](scripts/place_words.py) |
| Rule index guard (principles, checker and skills agree) | [`scripts/check_rule_index.py`](scripts/check_rule_index.py) |
| Twin guard (dashboard/app pairs of one rule) | [`scripts/check_twins.js`](scripts/check_twins.js) · `check_rx.js` · `check_setlog.js` · `check_parity.py` |
| App guards: type scale, JS syntax, habits boots, XP rules, Library/Spine, circuit logging, fetch retry, Off the Glass's opponent | `check_type_scale.py` · `check_js_syntax.py` · `check_habits_boots.py` · `check_xp_rules.py` · `check_library_spine.py` · `check_circuit_logging.py` · `test_fetch_retry.js` · `test_rally_sim.js` |
| Career Mode tools: the catalogue guard, the seed (`--dry-run` shows the switch's list first), the rehearsals on PGlite, the way back and the phones' twin cases | [`scripts/check_career.py`](scripts/check_career.py) · [`scripts/career_seed.py`](scripts/career_seed.py) · [`scripts/career/`](scripts/career/) (`rehearse.mjs`, `rehearse_switch.mjs`, `rehearse_catalogue.mjs`, `rehearse_lib.mjs`, `rehearse_measures.mjs`, `rehearse_units.mjs`, `rollback_stage66.sql`, `rollback_stage69.sql`, `rollback_stage70.sql`, `rollback_stage71.sql` (weight units), `rollback_stage72.sql` (measures), `rollback_stage73.sql`, `rehearse_crew.mjs` and `rollback_stage81.sql` (Crew and the Bell), `hold_cases.json`, `xp_cases.json`, `reward_cases.json`) · phase 3's server half [`supabase/stage70_career_rewards.sql`](supabase/stage70_career_rewards.sql) (`get_profile()` core, `get_awards()` shelf) with its fix [`supabase/stage73_career_main_lifts.sql`](supabase/stage73_career_main_lifts.sql) (main lifts only, paid sessions) and the tiers lock [`career/tiers.lock.json`](career/tiers.lock.json) · Crew and the Bell's server half [`supabase/stage81_career_crew.sql`](supabase/stage81_career_crew.sql) (live 2026-10-19) with the emoji beside the Like [`supabase/stage82_crew_emoji.sql`](supabase/stage82_crew_emoji.sql) (live 2026-10-19) and the feed sent only when it changed [`supabase/stage83_crew_if_new.sql`](supabase/stage83_crew_if_new.sql) (live 2026-10-19), their rehearsal [`scripts/career/rehearse_crew.mjs`](scripts/career/rehearse_crew.mjs) and the app check [`scripts/headless/crew.js`](scripts/headless/crew.js) |
| Public-page style guard (ratchet on `site_style_baseline.json`) | [`scripts/check_site_style.py`](scripts/check_site_style.py) |
| **Doc-layer guard** (pre-commit 24) — a ceiling per door, rules file, index and reference section; every cross-reference resolves; every prose pointer (`DOC.md` → *Section*) names a real heading, index row or bold lead-in; a cited coaching rule ID exists; ratchet on `docs_baseline.json`, `--selftest` proves it still fails on each fault | [`scripts/check_docs.py`](scripts/check_docs.py) · the layers: [`docs/README.md`](docs/README.md) |
| Article pages + sitemap builder | [`scripts/build_article_pages.py`](scripts/build_article_pages.py) |
| Course app stamp (after any edit in `tennis/app/`) | [`scripts/stamp_tps_app.py`](scripts/stamp_tps_app.py) |
| Headless suites for `program.html` (24: one per Centre Court screen, plus sign-in, session queue, clock skew, cycle dates, YouTube, and Highlight Reel's two: `sharecard.js` paints every share card, `highlight-reel.js` runs its doors in the app) | [`scripts/headless/`](scripts/headless/) (`smoke.js`, `home-progress.js`, `library.js`, `about-sheet.js`, `sheets-notices.js`, `career.js` (Career Mode's XP switch, in both apps) …; `lib.js`, `stub.js`, `fixture.json` are the harness) |
| Headless harness for `coach.html` (121 scenarios) | [`scripts/headless/coach/`](scripts/headless/coach/README.md) |
| Restore from a lost database (rehearsed) | [`scripts/restore/README.md`](scripts/restore/README.md) |
| Website audit tools (screenshots, scoreboard, link check) | [`scripts/site_audit/README.md`](scripts/site_audit/README.md) |
| Backups: prune the weekly files · the local backup script | `scripts/prune_backups.py` · [`backup_supabase.py`](backup_supabase.py) |
| Course art grade · Spine SQL tests | `scripts/grade_tps_art.py` · `scripts/test_spine_sql.sh` |

---

## 🖼️ Assets — every image, icon & photo

| Folder | What's in it |
|---|---|
| [`assets/img/`](assets/img/) | Brand marks, favicons, app icons, `coach.jpg`, sport motif. `source/` = master logo art; `generate_icons.py` rebuilds all sizes |
| [`assets/img/athletes/`](assets/img/athletes/) | Athlete headshots (testimonials / cards) |
| [`assets/art/`](assets/art/) | The training app's pictures, each a versioned `-v1.webp`: `cycles/` (one per cycle family), `days/` (one per day type) and `moments/` (finish, new best, welcome), named in `APP_ART` in `program.html`; `library/` (the Library's category banners, set by each category's `banner`) |
| [`assets/cycles/`](assets/cycles/) | The old name-matched cycle covers (Foundation Forge, Strength Engine, …), retired for the app (it uses `assets/art/cycles/`); kept for studio reuse → see [`README`](assets/cycles/README.md) |
| [`assets/days/`](assets/days/) | Per-day-type thumbnails (upper, lower, power, core, recovery…), retired for the app (it uses `assets/art/days/`); the homepages and the studio still load `lower.webp` → [`README`](assets/days/README.md) |
| [`assets/img/workouts/`](assets/img/workouts/) | The five older Library category banners, retired for the app (it uses `assets/art/library/`); kept as the design atlas's grade reference → [`IMAGES.md`](IMAGES.md) §2 |
| root `court-sessions.jpg`, `court-playbook.jpg` | The two court textures the app uses. (The old root preview screenshots were deleted 2026-10-13.) See [`IMAGES.md`](IMAGES.md) |

---

## 📱 Social / marketing studio — `Content/`

Standalone tools, **not** linked from the live site — open them directly to design social
posts. Build rules + asset shelf live in [`DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md).

- **Content parity ledger** (2026-10-02): [`CONTENT-PARITY.md`](Content/CONTENT-PARITY.md): which lesson or article exists on the
  TPS course, the blog and the Playbook, what is missing, the known science problems, and the rule for every port.
- **Carousels** (1080×1350): kit = [`Carousel-Kit.html`](Content/Carousel-Kit.html)
  (23 slide templates) · **newest reference** =
  [`carousel-period-training.html`](Content/carousel-period-training.html) (new decks are Farsi) · older decks:
  [`method`](Content/carousel-method.html), [`recovery-run`](Content/carousel-recovery-run.html),
  [`file-vs-coach`](Content/carousel-1-file-vs-coach.html) (stale chrome — see atlas) ·
  (`carousel-warmup-tennis.html` and `instagram-carousels.html` were deleted 2026-07-31).
  **Match-Day Fuel** (2026-10-02, **Farsi**, 8 slides): [`carousel-match-day-fuel.html`](Content/carousel-match-day-fuel.html)
  (rebuild: [`build_match_day_fuel.py`](Content/build_match_day_fuel.py)) + its two-frame Instagram story
  [`story-match-day-fuel.html`](Content/story-match-day-fuel.html) ([`build_story_match_day_fuel.py`](Content/build_story_match_day_fuel.py);
  one frame per link sticker: the Farsi lesson on the site, the lesson in the app; the app screenshot is in
  [`match-day-fuel/`](Content/match-day-fuel/)). The numbers come from the article `articles/nutrition/match-day-nutrition.json`.
- **Reels** (1080×1920): build with the [`/reel` skill](.claude/skills/reel/SKILL.md) ·
  **newest + the polished-ad route** = [`reel-9-mehraneh`](Content/reel-9-mehraneh.html) (**Farsi**, 2026-10-02 · a **client's** website ad in her brand · ~30 s, every beat · one ball carries it, real motion blur, synthesized sound,
  three audits incl. a readability rule · built on the **timeline kit** [`.claude/skills/reel/timeline/`](.claude/skills/reel/timeline/README.md) (`new_reel.py <slug>` scaffolds a new one) · sources, scene map and rebuild steps in
  [`reel-9-mehraneh/`](Content/reel-9-mehraneh/README.md)) · previous = [`reel-8-course`](Content/reel-8-course.html) (**Farsi**, 2026-09-20 · silent, 20 s · four generated
  video clips, a 16-week rail, the real demo in a phone · two hooks, `?hook=b` · sources, clips and the video-plate
  protocol in [`reel-8-course/`](Content/reel-8-course/README.md)) · earlier ad reel =
  [`reel-7-course`](Content/reel-7-course.html) (**Farsi**, Amir's choice on 2026-09-20
  because the course it sells is Farsi-only · silent, ~30 s · ends on the free demo · the ticks, ball
  and camera all sit on one court line · real demo screens in a phone · sources, both pictures and the
  rebuild steps in [`reel-7-course/`](Content/reel-7-course/README.md) · reel tools in
  [`.claude/skills/reel/tools/`](.claude/skills/reel/tools/README.md), incl. the MP4 renderer) ·
  English scene-swap reference = [`reel-6-system`](Content/reel-6-system.html) (continuously animated —
  ambient motion, Ken Burns, typing dots, etc. — `?beat=N` still mode, `?capture=1` export mode) ·
  **signature product pattern** = [`reel-4-app`](Content/reel-4-app.html) ("App-as-Product") ·
  earlier/retired-language generation: [`reel-5-system`](Content/reel-5-system.html) (Farsi) ·
  [`reel-1-dashboard`](Content/reel-1-dashboard.html) ·
  [`reel-2-roadmap`](Content/reel-2-roadmap.html) ·
  [`reel-3-pocket`](Content/reel-3-pocket.html) (pre-date the no-gold rule).
- **Motion showreel** (1920×1080, 15 s, **English**, with sound; 2026-10-01) — [`showreel/`](Content/showreel/README.md):
  Claude's own procedural motion-design reel, **not an Amir brand piece and not site content**. Eight shots on a 128 BPM bar
  grid (point · type · form · depth · flow · interface · rhythm · lockup), seven designed transitions, a soundtrack synthesized
  from the picture's own cue sheet. Canvas engine + Playwright renderer + numpy audio, **no generation credits**.
  Every shot and scene change is built from named kit pieces, and a tool proves it renders the same 450 frames (see Motion Menu below).
  Live page [`reel.html`](Content/showreel/reel.html) (serve `Content/`, not this folder) · the file [`claude-motion-reel.mp4`](Content/showreel/claude-motion-reel.mp4) (+ `poster.jpg`) · rebuild steps in its README.
- **Motion Menu** (2026-10-01): Claude's own list of moves, looks and sounds for reels. It has **one source**, the `/cut` skill's
  [`menu.json`](.claude/skills/cut/kit/menu/menu.json) (how: [`MENU.md`](.claude/skills/cut/kit/MENU.md)), published as a private page where Amir marks Keep / Maybe / Drop:
  <https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA>. Menu numbers have one ledger, [`numbers.json`](.claude/skills/cut/kit/menu/numbers.json) (never changed, never reused; it left `Content/motion/` on 2026-10-13, and that folder is gone). The kit that builds the showreel from named pieces lives under `.claude/skills/cut/kit/`; start at [`HANDOFF.md`](.claude/skills/cut/kit/HANDOFF.md).
- **Result cards / app mockups:** [`card-preview.html`](Content/card-preview.html)
  (rebuilds every app card with real class names) → exports in
  [`instagram-cards/`](Content/instagram-cards/) (legacy style, off-palette).
- **Club print — The UTS:** [`flyer-uts-padel.html`](Content/flyer-uts-padel.html) — **the one flyer** for the
  6-Week Padel Performance Course (2026-10-02: the club asked for one). A4 portrait, the same shape as A3, so a
  print shop can run it as a poster. In **the UTS brand, not ours**: the price is a Tube roundel (£120,
  introductory, 12 sessions), then "Only 8 spots", the four benefits, "The Padel Line" (Assess, Train, Monitor,
  Retest) and "Book at The UTS". Print the file for the A4 PDF; exports in [`uts-padel/`](Content/uts-padel/). The Instagram story
  version of the same design (1080×1920, text kept clear of Instagram's top and bottom bars) is
  [`story-uts-padel.html`](Content/story-uts-padel.html), exported as `uts-padel-flyer-story.png`.
  No QR on purpose: people book and pay at the club, the form is only for booked athletes. **Superseded:**
  [`poster-uts-padel.html`](Content/poster-uts-padel.html) (the first A3 poster and two stories) say 5 places and
  carry no price, so do not send them.
- **Image kits:** [`recovery-run/`](Content/recovery-run/) (graded photo-story frames).

---

## 🛠️ Reference docs (the manuals)

**SEO:** [`.claude/SEO-SOP.md`](.claude/SEO-SOP.md) — getting found on Google in Iran: Search Console, the monthly routine, how article titles are chosen.


| Doc | Covers |
|---|---|
| [`Content/DESIGN-ATLAS.md`](Content/DESIGN-ATLAS.md) | Designer's working file — assets, recipes, rulings |
| [`CODEBASE.md`](CODEBASE.md) | **The index** to the plain-English file-by-file guide — 6 sections in [`docs/ref/codebase/`](docs/ref/codebase/) |
| [`SCHEMA.md`](SCHEMA.md) | Every JSON field (program / article / workout). One file on purpose (`check_parity.py` parses it); a jump table at the top |
| [`Content/PRODUCT.md`](Content/PRODUCT.md) | The business/product brief |
| [`Content/HOW-IT-WORKS.md`](Content/HOW-IT-WORKS.md) | Customer-facing process explainer |
| [`Content/exercise-card/blueprint.html`](Content/exercise-card/blueprint.html) | **The Exercise Card Blueprint** (2026-10-11): four layers, four jobs (steps, cues, pill, Coach's Note), the 13 answers Amir approved, the 12 pilot entries and the evidence; `HANDOFF.md` beside it says what shipped and what is open |
| [`docs/record/FRESH-EYES.md`](docs/record/FRESH-EYES.md) | **The app audit** (2026-09-24) — what has shipped, what is next in order, the open calls, and how to continue |
| [`Content/SITE-AUDIT.md`](Content/SITE-AUDIT.md) | **The website audit** (2026-10-02) — 25 packages, the baseline scoreboard, the open questions, how to continue. Reviews in [`Content/site-audit/`](Content/site-audit/), measuring tools in [`scripts/site_audit/`](scripts/site_audit/README.md) |
| [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) | **The index** to the `coach.html` manual — 9 sections in [`docs/ref/coach-dashboard/`](docs/ref/coach-dashboard/) |
| [`docs/record/COACH-AUDIT.md`](docs/record/COACH-AUDIT.md) | The coach dashboard audit (2026-10-10); §12 is the list to continue from |
| [`PROGRAM-APP.md`](PROGRAM-APP.md) | **The index** to the athlete app's features — 49 sections, one file each in [`docs/ref/program-app/`](docs/ref/program-app/); open the row you need, never the whole reference |
| [`HABITS.md`](HABITS.md) | **The index** to AA Proof — 19 sections, one file each in [`docs/ref/habits/`](docs/ref/habits/) |
| [`FARSI-PRODUCTS.md`](FARSI-PRODUCTS.md) | The paid course app, the testing app and the Farsi product pages |
| [`docs/record/SET-LOGGING-DESIGN.md`](docs/record/SET-LOGGING-DESIGN.md) | How set logging was designed |
| [`Content/parity-drafts/`](Content/parity-drafts/) | Drafts for [`CONTENT-PARITY.md`](Content/CONTENT-PARITY.md): one folder per topic (lesson, article, verification notes) |
| [`Content/exercise-demos/README.md`](Content/exercise-demos/README.md) | Plan for short exercise demo loops |
| [`CALL_LOG.md`](CALL_LOG.md) | `call-log.html` manual |
| [`supabase/stage29_affiliates.sql`](supabase/stage29_affiliates.sql) | **Affiliate coaches** — the referral-code roster moved out of the public `AFFILIATES.md` into the coach-only `public.affiliates` table (2026-09-13). Manage it in `coach.html` → Affiliates; the deal and how-to are in [`COACH_DASHBOARD.md`](COACH_DASHBOARD.md) §2 |
| [`IMAGES.md`](IMAGES.md) | What every marketing image is + how to make more |
| [`IMPORTING_SESSION_REPORTS.md`](IMPORTING_SESSION_REPORTS.md) | Import how-to |
| [`QUESTS.md`](QUESTS.md) | **The quest catalogue** — what's running, the built quests, ready-made weeks, idea bank |
| [`career/`](career/README.md) | **Career Mode** (2026-10-17, designed; phase 1 live in shadow, stage66; phase 2, the XP switch, applied 2026-10-17 and on since 2026-10-18, stage69; phase 3, rewards and the catalogue switch, built, applied and switched on 2026-10-18, stage70; its main-lift fix, stage73, applied the same day before the switch, after the weight units' stages 71 and 72): the gamification system for both apps. `CAREER_MODE.md` (the system, rules GAME-1 to GAME-14, decisions, build order), `PROCEDURES.md` (every function step by step), and the `.toml` files Amir edits (rulebook, badges, achievements, titles, missions, quests, recognition); `python scripts/check_career.py` checks them |
| [`CLAUDE.md`](CLAUDE.md) | **The door** — read by every session: who/what this is, the non-negotiables, and the READ-LIST of what to open per job |
| [`docs/README.md`](docs/README.md) | **The doc layers** — the rules files, the per-section reference, the record, and the house rules for writing them |

---

*No build step — edit, push, it's live (GitHub Pages → amirardekani.com).
When you add a page, asset, or skill, drop a line in this map so it stays the
one place that knows where everything is.*
