# Working notes — Amir Ardekani's site & coaching system

Durable context for working in this repo. Read the linked docs before diving in.

## Who / what this is
- **Amir Ardekani** — online **strength & conditioning coach** (MSc S&C + MSc Applied
  Exercise Physiology; 1000+ tennis & padel players). Sells premium individualised
  programmes (USD tiers: $70/1mo · $180/3mo · $300/6mo — see `Content/PRODUCT.md`)
  delivered through a private web app (`program.html`, a PWA), backed by Supabase.
- **The free habit tracker is the top of the funnel.** `habits.html` (AA Proof) is offered
  free to non-clients via `proof.html` (Instagram bio link, deliberately not in the nav).
  They give a name, email and WhatsApp; Amir runs **`/proof-signup`** and they are live in
  under two minutes. Free and coached athletes share **one board** (`HABITS.md` → *Two kinds of user*).
- **Two audiences, deliberately different** (don't force them identical — match *facts &
  features*, not wording):
  - **English** site = competitive **tennis/padel** players. Voice: sharp, athletic, evidence-based.
  - **Farsi** site = **tennis & padel** players in Iran (Amir, 2026-09-13 — it was general
    fitness until then). Voice: warm, colloquial. See *Article pages & SEO* below.

## Reference docs (read these, don't re-derive)
- `MAP.md` — **start here.** The atlas: one linked index to every page, asset, skill, doc and design element.
- `CODEBASE.md` — technical map of the repo.
- `Content/PRODUCT.md` — what the product/business actually is (internal brief; pricing, voice, backend).
- `Content/HOW-IT-WORKS.md` — customer-facing explainer of the coaching process.
- `HABITS.md` — **the habit app (`habits.html`, AA Proof) brief.** Start here for anything
  habit-tracker related: the four tabs, the eight habits, how progression works, the
  leaderboard, and how it links both ways with `program.html`.
- `XP_SYSTEM.md` — every tunable in the XP/level/rank system and what changes when you move it.
- `FARSI-PRODUCTS.md` — the paid course app (`/tennis/app/`), the testing app's page and the Farsi
  product pages: how they are built, deployed and introduced.
- `PROGRAM-APP.md` — the athlete app's programme features in full (rx, week notes, the Spine, the Quality
  Map, Because, the set log, Personal Records, body weight): read it before changing `program.html`.
- `.claude/COACHING-PRINCIPLES.md` — Amir's codified coaching philosophy. **It opens with the RULE INDEX**
  (2026-09-26): one numbered line per rule (`VOL-8`, `SEL-4` …), the stage that applies it and whether
  the checker enforces it; the dated bullets below it are the stories. **The index line is the rule**:
  where this file, a skill or SCHEMA restates one, the index wins, and new text cites the ID instead of
  restating (PRC-23). `scripts/check_rule_index.py` (pre-commit) keeps the index, its stories, the
  checker and every cited ID in agreement. Design reads the whole file; engage and the reviewers read
  the index and their own sections.
- **`scripts/check_program.py`** — the house rules as a script (2026-09-25). `/program-assemble` runs it on every built programme before any review: the volume count (both log tables and the day loads, counted from each exercise's Spine credits since 2026-09-26), floors, set cap, the new-athlete 8-rep rule, bans, RPE floors in every note, session length, the Spine gate, the Quality Map, and the publish fingerprint. Every FAIL and WARN it prints names its rule ID. A new athlete then gets ONE reviewer; a returning athlete none unless Amir asks (PRC-4).
- `.claude/skills/*` + `.claude/agents/athlete-brief.md` (data prep only since 2026-09-26: the new athlete's intake form, and the Gmail session import /cycle-report runs first) — the coaching pipeline (intake → roadmap → design → assemble **Part A** (build + every programming check) → engage → assemble **Part B** (words, full check, publish) → **`/cycle-report`** at the end of every cycle: the athlete's WhatsApp report plus a coach-only `## Debrief` section in their coaching log, which `/program-design` reads before the next cycle). the coach-only per-athlete rationale log now lives in `public.coaching_logs`, read and
  written from coach.html (it used to be `.claude/coaching-log/*.md`, in this public repo).

## ⚠️ THE BIG ONE: programmes live on the SERVER now, not in files (2026-09-07)

`data/*.json` is **deleted, gitignored and 404 on the live site.** Every programme is a
row in `public.programs`, and `program.html`, `habits.html` and `coach.html` all read it
through `get_program()`, which checks identity server-side. The 46 files that used to be
served publicly are kept **only** as a local, gitignored copy in `data/` on Amir's PC,
as a rainy-day fallback. Never commit one; the `.gitignore` entry explains why.

**Athletes sign in with a username and password.** Every `?client=&key=` link is dead —
`public.athlete_keys` is empty and the RPCs fail closed. Accounts are created from
coach.html (Athletes → an athlete → Create login), keyed on an internal address
`athlete.<id>@amirardekani.com` that never receives mail. The password is generated, or typed
there (8-72 printable English characters, no spaces, not the username: `typedPassword()` in
coach.html and `checkTyped()` in each login function apply the same rule, so change both). The
Testing app and Course tabs work the same way. `demo` is named explicitly as
public inside `get_program()` so the marketing link still opens.

**The coaching pipeline writes to the server.** It may still produce a local
`data/<id>.json` as a working artifact, but that file is never published as a file: a new cycle
goes up in ONE call to **`public.publish_cycle()`** (`supabase/stage38_publish_cycle.sql`, 2026-09-26:
archive, cycle advance, workouts, notes, roadmap patch and the coaching-log splice, all or nothing,
returning the fingerprint), or by hand through coach.html → Athletes → **↑ Publish programme file**.
Execute is revoked from anon and authenticated. Day-to-day changes (sets, reps, RPE,
tempo, rest, the coach's note) are made in the dashboard's inline editor, which writes
straight to `programs` and keeps the previous version in `program_versions`.

**✅ Every programme write ends the same way** (Amir, 2026-09-24): `/program-assemble`, `/program-edit`
and `/workout` are not finished until (1) Spine upkeep has run (`/spine` → Upkeep: a full entry for
every exercise, `exId` on every card, links both ways, body parts and the count filled; CUE-4),
(2) every exercise carries qualities from the ten only (CUE-3), (3) the Quality check is reported
(PRC-24), (4) the Becauses are fresh (COM-4: 5–10 on a new cycle; on an edit, only the exercises it
changes), and (5) the handoff has one `SPINE …` / `QUALITY …` block (PRC-12). Never approve anything
without Amir's word, and never put athlete-specific detail on a Spine entry.

**⛔ Three rules for every programme run** (Amir, 2026-09-25, after a correction went wrong):
- **Never touch the app while writing, correcting or delivering a programme** (PRC-1): no edit to any
  `.html` page or `assets/js/*`; ideas and bugs go in the handoff. The one change outside the
  programme is the library.
- **A newly prescribed exercise goes into the library in full and stays in the programme** (NAM-9,
  CUE-5): every field the other entries carry, links both ways, qualities and a pattern from his lists,
  never a new pill. A variant that changes the exercise is its own entry.
- **A correction changes only what Amir named** (PRC-2); `program_versions` holds what it replaced.

**Coaching logs are on the server too.** `.claude/coaching-log/*.md` were tracked in this
PUBLIC repo — world-readable, despite each opening with "Never published". They now live
in `public.coaching_logs`, coach-only, with no athlete arm at all.

**⚠️ There are NO automatic backups.** The Supabase project is on the free plan. 378
session logs and every progress blob exist in exactly one place. coach.html → Athletes →
**⤓ Backup** downloads the whole database as one JSON file; do it weekly and keep a copy
off the machine.

## The athlete app (`program.html`) — read `PROGRAM-APP.md` before changing it

The full account of the programme app's features (the `rx` prescription, week notes, The Card
Remembers, the Spine, the Quality Map, Because, the countersigned set log, Personal Records, body weight)
is in **`PROGRAM-APP.md`** (moved 2026-09-26 to keep this file small). The data shapes are in
`SCHEMA.md` and the coaching rules in the principles' rule index. What must never break:

- **Things that exist more than once: change every copy, or the coach and the athlete see different
  numbers and nothing errors.** `rxOf()`/`repCount()`/`tempoDisplay()` (program.html + `assets/js/chips.js`,
  guarded by `scripts/check_rx.js`) · the Quality mix and its minutes rule (`qualityMix()`, `qualityCheckC()`,
  `/program-design`, `check_program.py`) · the Spine resolver (`spineFor()` / `spineForC()`) · the body-part
  region and impact lists (four copies) · the muscle list of the Spine's volume credits (four copies:
  `spine_credits_ok()`, coach.html, `check_program.py`, `draft_sql.py`) · the set-log line grammar (`buildSessionData()`, `parseSetLine()`,
  `parseSetText()`) · the records rename matcher (`matchRenamed()` / `ceilAliasMapC()`) and its hand-entry
  doors (`paintCeilingForm()` mirrors `paintFromFields()`) · how a session's set ends (`carrySet()`, called by
  the midnight sweep, the cloud copy and a rename).
- **`rxOf()` returns a VIEW** (strings, the dose as `dose: {kind, value, side, label}`), not the `rx` object:
  test app code against real `rxOf()` output.
- **A prescription is `rx`**; legacy `chips[]` is read, never written; **rest is never invented**; reps are
  one number; a grip is the `intent` pill; no `setup` line. The tempo cell has had four shapes: do not
  re-litigate it.
- **Week 1 and the back-off week are `cycles[n].weekNotes`**; the app never invents a back-off.
- **The Spine**: only approved entries reach a phone; cues and **videos** live on the entry (a video is added
  in coach.html → Exercises; `exercise_library.json` and its Notion sync were retired 2026-09-26);
  two entries never share a name or alias; rungs are gone for good; Library has three doors (Sessions,
  Playbook, Exercises) and **no Qualities door**.
- **A delete is a tombstone** (Personal Records `{del: true}`, body weight `kg: null` with a fresh `t`), and every
  records write rebuilds from `loadCeilingRaw()`, or a device that missed the delete brings it back.
- **Personal Records fill themselves** (2026-09-26): a finished session's best set goes on when it beats every
  earlier number for the lift, marked `auto` and written with `t: 0` so anything the athlete does to that day wins.
  New bests only: every screen leads with the latest entry. "The Ceiling" is retired from the screens.
- **Weight boxes open empty** (2026-09-26): last time's weight is `lw` on the set, shown under a LAST caption,
  and `w` is only ever today's. A tick on an empty box records no weight; **Same as last** fills the boxes.
- **The check-in sets today's targets, never the programme** (REC-2, 2026-09-26): the level is worked out once
  at the check-in and stored with it (`level`, `sore`, `drop`, `asWritten`); `paintToday()` only paints. The
  target rule exists twice, `dayRpe()` here and `dayTargetC()` in coach.html: change both.
- **Body weight lives in `program.html`** under the key `<id>_hab_wt`; AA Proof must never write it, and it
  is never scored.
- **Caches never sync**: `<id>_histcache`, `spinecache`, `qualcache`.
- **An RPE off its target is coloured** clay (over) or steel blue (under), the one exception to "clay is the
  only accent", through `rpeVs()`/`rpeMark()` on every screen.
- **There is no in-app chat, and Amir answers ONLY on WhatsApp (2026-09-26: *"Im only gonna reply to
  them when they send me a message on whatsapp"*).** The app's job is to get athletes there fast, with
  context: the Coach tab, the end of every session (the note comes along) and every exercise's About
  sheet open WhatsApp pre-filled (`coachWhatsAppUrl(about)`, `COACH_WHATSAPP` = the site's buy-button
  number). coach.html only marks session notes read. The `messages` table stays on the server and
  nothing reads it. Do not bring a chat back unasked. Details in `PROGRAM-APP.md`.
- **Home leads with the training** (This Week, then the day cards), then the Daily Habits card.
- **No yellow, gold, ochre or amber in either app**, AA Proof's metals included (its gold tier became
  emerald on 2026-09-26; Amir, asked whether Proof was an exception: *"fix"*).
- **No new exercise-card features until most athletes are on the new format** (Amir, 2026-09-26, Five
  Forks fork 4 B). The demo was converted that day; everyone else changes over at their next cycle.
  The tab that holds the whole plan is **Game Plan** (it was My Plan).

## The habit app (`habits.html`, AA Proof) — read `HABITS.md` before changing it

The full account (the four tabs, the habits, progression, the leaderboard, roll call, the reward
track, seasons, quests, the free tier) is in **`HABITS.md`**; every XP tunable and the server copy of
the rules are in **`XP_SYSTEM.md`**; quest runs are in **`QUESTS.md`** (moved out of this file on
2026-09-26 and corrected against the code). What must never break:
- **Change behaviour, update all six in the same PR**: `HABITS.md`, `XP_SYSTEM.md`, `QUESTS.md`, the
  `renderManual()` prose (its numbers read the live constants, its prose does not), `privacy.html`
  (anything stored or shared) and `tourSteps()`. The tour points at real controls, so a moved button
  or a renamed tab makes it lie on a new athlete's first screen.
- **Scored twice.** The leaderboard scores on the server from `public.xp_rules` (id 1), the phone
  from constants in `habits.html`, and when they drift nothing errors. Every key on the row mirrors
  a constant (18 keys on 2026-09-26; the table is in `XP_SYSTEM.md` §8), and `bonusEvents()` mirrors `hab_bonus_xp()`: change both
  sides. Update the row with `rules || jsonb_build_object(…)` or `jsonb_set`, never by rewriting the
  whole object.
- **`live()` is present tense only**: anything that takes a `dayKey` uses `rosterOn(dayKey)`, UI row
  lists included. Only `stampRoster()` writes `CFG.roster`, append-only: a habit added lands today, a
  habit removed lands tomorrow, and a closed day never moves.
- **Rewards are never revoked.** `CFG.pass.owned` and `public.hab_titles` only ever add; titles are
  minted, never recomputed (a season reset drops every level). `PASS_TRACK` and `passTrack` change
  together, and season titles never go in `passTrack`.
- **One word, `streak`, two scopes**: a habit's streak sits on that habit, the day streak is always
  captioned DAY STREAK, and "run" never comes back.
- **"On target" means `dayQualifies()`.** Changing `streakQualifyPct` means both scorers and any text
  that names the number; a quest note never spells it out.
- **Roll call pays no XP** and no scorer reads `hab_notes`. The client shows 7 days and the server
  keeps 9, on purpose.
- **The leaderboard sweep runs once.** `autoJoinBoard()` puts a coached athlete on the board after their
  first finished workout (a free athlete's WORKOUT is locked, so they join from Crew themselves).
  `CFG.boardSwept`, stamped by the sweep and by any join or leave the athlete makes, means leaving
  sticks. Never re-join on boot.
- **Never invent another athlete's number** that an RPC does not return.
- **It is called AA Proof** in titles, headings and copy. `manifest.name`, `manifest.short_name` and
  the `apple-mobile-web-app-title` meta move together.
- **Free tier:** `"tier": "free"` in the athlete block is the only switch (`isFree()` the only test).
  Contact details live in `public.hab_contacts` (`/proof-signup`), never in a programme record.
- Quest weeks are a lever Amir pulls from coach.html → Today (`QUESTS.md`); a new season starts only on
  his word, with `start_season()` (`HABITS.md` → Seasons). Body weight lives in `program.html` (above);
  the backtick guard is at the end of this file.

## Site layout (GitHub Pages → amirardekani.com)
- **English is the default**: `/` = `index.html`. **Farsi** = `/index-fa.html`. `index-en.html` is a
  permanent redirect to `/`. Language toggles + `hreflang`/canonical are set accordingly.
- Shared **nav/footer** are injected by `assets/js/shared.js` from `partials/nav.html` + `partials/footer.html`.
  CSS lives in `assets/css/` (`tokens.css` → `base.css` → `components.css`); page-specific styles are inline.
- Green hero + green nav are **homepage-only**, scoped via `body.is-home`. The nav logo mark is global.
- **`sw.js` (scope `/`) sits in front of the WHOLE origin, not just program.html** (since v7, 2026-09-13;
  the cache is `aap-v32` on 2026-09-26). It must keep leaving `/reach/` (the Iran reachability probe),
  `/tennis/` (the paid course, whose app at `/tennis/app/` ships its own worker and `tps-shell-*`
  caches) and `/tennis-testing/` untouched. Otherwise the probe reports a cached pass
  and the course gets stale files pinned. Its `activate` deletes **only `aap-*` caches**: Cache
  Storage is shared by the origin, and the old `k !== CACHE` filter would have wiped any other
  app's offline copy on every bump.
- **The Farsi products are in `FARSI-PRODUCTS.md`** (moved 2026-09-26): the paid course app
  `/tennis/app/`, its product page `/tennis/`, the testing app's page `/tennis-testing/`, and where they
  are introduced on the Farsi site. What must never break:
  - The two app shells are copied from private repos (`tps-content`, `assess-content`): never edit
    `tennis/app/` or `tennis-testing/app/` here, **except the course demo**, which was built in this
    folder (2026-09-15). Copy its `app.js`, `app.css`, `index.html` and `sw.js` into `tps-content` before
    that repo's next deploy, and after any edit here run `python scripts/stamp_tps_app.py` (pre-commit
    blocks a stale stamp; the app's worker answers from its cache first).
  - The demo's lock is server-side (`tps_demo()`): never "lock" anything in `app.js` alone.
  - The course app's tour finds real controls by CSS selector: move a control or rename a class and it
    lies, silently, on a new buyer's first screen.
  - A new lesson or test needs its cover in `ART` by id, and a regraded picture needs `ART_V` raised.
  - The product pages share `assets/css/fa-product.css` (bump its `?v=` after any change) and
    `assets/js/fa-nav.js`. The English site deliberately does not mention the Farsi products.
- **Videos play from `www.youtube.com/embed` in BOTH apps, never `youtube-nocookie.com`** (2026-09-23; Iranian
  athletes could not watch the course videos). The nocookie player hits YouTube's sign-in wall in Iran, and many VPN apps
  there route only the `youtube.com` names. Both apps read watch, `youtu.be`, `shorts/`, `embed/` and `live/` links, give a
  Shorts link a tall 9:16 box, and play every video inside the app. An "open in the YouTube app" link was tried and
  removed the same day (Amir): do not add it back.
  The three parsers must agree: `ytId()` in `tennis/app/app.js`, `ytVideoId()` in `program.html`, the modal in
  `assets/js/shared.js`. (The site modal in `shared.js` reads fewer link shapes and draws no tall Shorts box: flagged
  2026-09-26.) The course app's copy: `FARSI-PRODUCTS.md`.
- **Edge Function source is in `supabase/functions/`** (since 2026-09-13; before that it existed
  only as deployments). Edit there, deploy with the Supabase MCP, never in the dashboard. See its README.
- The Farsi site is the **aesthetic reference Amir likes**: green radial-gradient hero, white text +
  clay (`--accent-2` #C7552F) accent, logo mark (white rounded square w/ `assets/img/icon-192.png`),
  and gentle section banding (`#FAF7F2` ↔ `#F1ECE3`).

## Article pages & SEO — every article is also a public web page (2026-09-13)

Amir: *"every time I add an article it updates the website as well."* The goal is that people in
Iran who search his name or a tennis/padel S&C topic find amirardekani.com (Google is ~99.6% of
search in Iran). The routine (Search Console, the monthly checklist, how titles are chosen) is
**`.claude/SEO-SOP.md`**.

- **`scripts/build_article_pages.py`** turns `articles/<cat>/<slug>.json` (the English app
  article) plus `articles/<cat>/<slug>.fa.json` (a reviewed Farsi translation) into
  **`/fa/articles/<slug>.html`**, **`/en/articles/<slug>.html`**, an index page per language, and
  **`sitemap.xml`**. Static HTML on purpose: Google reads it best, and it does not depend on
  Supabase answering from inside Iran. Everything under `en/articles/`, `fa/articles/` and
  `sitemap.xml` is **generated** — never hand-edit it; rebuild.
- **`.githooks/pre-commit` runs `--check`** whenever articles, those folders, `sitemap.xml`,
  `robots.txt` or any root `*.html` is staged. It blocks a stale page, a missing Farsi
  translation, and a Farsi file whose English changed after it was stamped (`sourceHash`;
  re-stamp with `--stamp <slug>` once the Farsi is brought back in line).
- ⚠️ **A `.fa.json` must never carry `id` or `category`.** coach.html's *+ Publish article* upserts
  any file that has both, by slug — a Farsi file with them would overwrite the English article in
  the app for every athlete. The build refuses such a file.
- **The `/article` skill does the whole chain** (Steps 6–9): Farsi draft → **Amir's OK** →
  `--stamp` → build → commit → coach.html publish. Nothing Farsi ships unread.
- **The sitemap lists a root page only when it has a canonical link and no `noindex`.** A new
  public page needs a canonical, then a rebuild.
- **The name:** the visible brand stays "Amir Ardekani / امیر اردکانی", but page titles, article
  bylines and the JSON-LD `Person` lead with **Ardekanian / اردکانیان**, the name people search
  (Amir, 2026-09-13). Both homepages define that `Person` under one `@id`
  (`https://www.amirardekani.com/#person`) with every spelling in `alternateName` — keep them in step.
- ⚠️ **`index.html` carries the Google Search Console verification tag** (`<meta name="google-site-verification" ...>`, added 2026-09-13 for the URL-prefix property
  `https://www.amirardekani.com/`, `sitemap.xml` submitted there). Removing or changing it un-verifies the
  property and hides the search data. Keep it whenever the `<head>` is edited. Routine: `.claude/SEO-SOP.md` section 3.
- ⚠️ **Unverified from Iran:** the Farsi pages load Vazirmatn from Google Fonts and the Plausible
  script, same as `index-fa.html`. `/reach/` measures Google Fonts; if it is blocked, self-host the font.

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
Carousels, reels, posts, result cards, ads, web and app redesigns. **Start at
`Content/DESIGN-ATLAS.md`** (non-negotiables, current vs retired, the asset shelf, each format's
recipe) with `Content/DESIGN_SYSTEM.md` as the brand bible; build with `/carousel`, `/reel` or `/ad`,
pictures with `/image`, clips with `/video`, and read the skill before starting. The full notes that
sat here until 2026-09-26 live in those files and in `IMAGES.md` §0. What must never slip:
- **All new social content is Farsi** (Amir, 2026-09-21): Vazirmatn, RTL, no uppercase or
  letter-spacing, Persian numerals. English only when he asks. Barlow is for app screens and Latin numerals.
- **Clay `#C7552F` is the only accent. No yellow or gold, ever**: not in UI, prompts, props or wardrobe.
- **Never generate a picture or a clip before Amir says yes to a plan with the credit numbers in it**:
  the credits come from a pot shared with his own work. Reuse first (`/image` Step 0). Clips: `sound:
  "off"` (the default is ON), 3 seconds, the cheapest settings, and report the cost after (`/video`).
- **A replacement image ships as `-v2`** (or with `ART_V` raised in the course app), never over the
  same path: the root `sw.js` serves `/assets/` cache-first by URL.
- **Never retro-edit a shipped design**: start a new numbered file.
- **A reel draft is the HTML file** (an MP4 only when he asks); **an ad is one finished MP4**: Amir
  films himself and edits in Instagram, so Claude cuts the whole thing (`/ad`).
- Handle in new work: **@amirardekanian** · site AMIRARDEKANI.COM.

## Verifying the live site (important gotchas)
- **Try the live fetch first — when it works it is the real proof — but it DEPENDS ON THE
  SESSION'S NETWORK POLICY, so a failure is not a failed deploy.** Some environments allow the
  host and some deny it: on 2026-09-13 `curl` to `amirardekani.com`, `www.` and the
  `github.io` origin all returned HTTP 000, and
  `curl -sS "$HTTPS_PROXY/__agentproxy/status"` named the reason — `connect_rejected`,
  "gateway answered 403 to CONNECT (policy denial)". Check that endpoint before spending any
  time on it, and **never poll a blocked host in a loop waiting for a deploy that already
  happened.** When it is blocked, the fallbacks are `git ls-remote origin main` (the commit is
  on the branch Pages serves) plus the **"pages build and deployment" run for that exact SHA
  reporting `conclusion: success`** — which, unlike a *missing* run, is a real signal.
  The apex 301s to `www`, so follow redirects, and diff what is served against your working copy:
  ```
  curl -sL -o /tmp/live.html https://amirardekani.com/coach.html   # -L matters: apex -> www
  python -c "import hashlib;a=open('/tmp/live.html','rb').read().replace(b'\r\n',b'\n');b=open('coach.html','rb').read().replace(b'\r\n',b'\n');print(hashlib.sha256(a).hexdigest()==hashlib.sha256(b).hexdigest())"
  ```
  A deleted file should 404 and a kept one should 200 — that check caught nothing but proves the
  whole commit shipped, not just the page you edited.
  ⚠ **Pick a served file as your marker.** `_config.yml` excludes the `.md` docs, so
  `amirardekani.com/CLAUDE.md` is a permanent 404 — polling one to confirm a docs-only commit
  waits for ever. A docs-only change has nothing to verify live; check `git ls-remote origin main`
  instead.
  ⚠ **That exclude list is explicit, not a glob — a new root doc or script is LIVE until you add
  it.** On 2026-09-13 `AFFILIATES.md`, `HABITS.md`, `QUESTS.md`, `XP_SYSTEM.md`, two root `.py`
  files, `scripts/` and three folder READMEs were all found serving HTTP 200, the docs as both
  `.md` and rendered `.html`. Adding a `.md`, `.py` or tooling folder means adding a line there.
- **Do not treat a missing Actions run as a failed deploy — but do not treat it as a successful one
  either. Ask the deployments API, which answers the question directly:**
  ```
  curl -sS "https://api.github.com/repos/amirardekanian-crypto/Website/deployments?environment=github-pages&per_page=5" \
    | python3 -c "import sys,json;[print(x['sha'][:8], x['created_at']) for x in json.load(sys.stdin)]"
  ```
  Unauthenticated and not proxy-blocked. **Your SHA in that list = it deployed. Absent = it did
  not.** Add `&sha=<full-sha>` to ask about one commit; an empty array is a real negative.
  The Actions list is a *weak* signal in both directions: the "pages build and deployment" run
  (`event: dynamic`) sometimes never appears for a commit that deployed fine (2026-08-09), and
  runs for an *earlier* SHA can appear twice.
  ⚠ **A merge can also be genuinely dropped, which is what the old wording would have missed.**
  On 2026-09-13 the merge API returned **502** while still merging `df3d601`; GitHub then created
  no Pages run *and* no deployment for it, so a change that was on `main` was never served. It was
  caught only because Amir asked "is this live?" and the deployments list said no. Two lessons:
  treat a 502 on merge as "verify everything downstream", and when the live fetch is blocked,
  **the deployments list is the strong signal, not the Actions list.**
  **You cannot force a rebuild from here** — `POST /pages/builds` returns
  `403 Access to this GitHub API path is not permitted through this proxy`. The fix is to land any
  real commit on `main`; the build deploys the whole tree, so the stranded change rides along. A
  docs-only commit works even though `_config.yml` excludes the `.md` files — `exclude` controls
  what is *served*, not whether a build runs.
  ⚠ **That API allows 60 calls an hour without a token** (`curl https://api.github.com/rate_limit`), and a
  rate-limit answer is a JSON *object*, so a poll loop that tests `len(...) != 0` reads it as "deployed". Seen
  2026-09-20, after a few minutes of polling. To wait for a deploy, poll the SERVED file for something only the
  new version has (`curl -sL https://amirardekani.com/<file> | grep -c '<new marker>'`), which has no quota.
  ⚠ **Push `main` BY ITSELF.** On 2026-09-20 three pushes in a row made with `git push origin main <other-branch>`
  (two refs at once, both at the same commit) got no "pages build and deployment" run at all, and the next push
  of `main` alone built within seconds. Not proven to be the cause, but it costs nothing to avoid. To see whether a
  run exists without spending the API quota, read the HTML page `https://github.com/<owner>/Website/actions`.
  Tell Amir to **hard-refresh** to bypass browser cache.
- For visual checks: serve with `python3 -m http.server` and screenshot with Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Two headless quirks: scroll-reveal hides
  below-fold content (inject `.reveal{opacity:1!important;transform:none!important}`) and the hero is
  `min-height:100vh` (shrink it, e.g. `.hero{min-height:520px!important}`, to capture lower sections).
- Stale **CSS cache** can render unsized elements huge (it once blew up the nav logo). Inline
  width/height on critical lockups as a safeguard.

## habits.html has a pre-commit guard — set it up once per clone
A stray backtick inside an HTML comment that sits inside a JS template literal has broken
the live app **twice in one afternoon** (2026-08-01): it silently terminates the template
literal, the parser can resync into something that still "parses" but never reaches the
app's own boot call, and the site sits on its loading screen forever with **nothing in the
console**. It even reached production once, via a commit nobody ran on purpose — an
external process on this machine (auto-commit tool, unclear which) picked up habits.html
mid-edit while it was deliberately broken for a test and pushed it straight to `main`,
which is what GitHub Pages serves from. Live for about 15 minutes before caught and
reverted (`e85969c`).

`scripts/check_js_syntax.py` and `scripts/check_habits_boots.py` now guard against this —
the first catches the exact backtick-in-comment pattern deterministically (a real parse
check alone is **not** reliable here, since the resync doesn't always throw), the second
proves the app actually renders content into `#app`, not just that it parses. Both are
wired into `.githooks/pre-commit`, which blocks a commit that touches habits.html unless
it passes both.

**This only runs if `core.hooksPath` points at the tracked `.githooks/` directory** — that
is a per-clone git config, not something `git clone` sets up on its own. Run once per
clone:
```
git config core.hooksPath .githooks
```
Skip a check only in a genuine emergency with `git commit --no-verify` — that is exactly
what let the incident above through, so read the errors first.
