# Your Website — Plain-English Guide

A human-friendly map of every file in this project. Written for the owner of the site, not a developer. Share this whole file with any AI assistant and they'll know how to help you safely.

---

## Quick Summary

This is a small, hand-built website. It has:

- Public pages anyone can visit: **home**, **apply form**, **privacy**, **terms**
- Private pages reached only by a direct link: the **athlete programme** and the **coach dashboard**
- A shared "look and feel" system so every page matches
- A tiny bit of JavaScript that adds the menu, footer, video pop-ups, and the "install app" prompt
- A **Supabase** database (added after this site first launched) that backs up athlete progress to the cloud and powers the coach dashboard and two-way messaging
- A small **Notion sync** that keeps the exercise-video list up to date
- Some support files for Google, hosting, and icons

No build step. When you edit a page, it's live the moment it's pushed to GitHub. The only "backend" is Supabase — a hosted database the pages talk to directly; there is no server of your own to run.

---

## File-by-File Guide

### Pages (HTML files)

#### `index.html` — Home page
- **What it does:** The front door. Hero headline, benefits, credentials, FAQ, and calls-to-action that send visitors to the apply form.
- **If deleted:** The site has no home page. Visitors landing on `amirardekani.com` see a "not found" error.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, `assets/img/og-image.jpg`, `manifest.json`.
- **Edit this when:** Changing headline copy, rewording sections, updating your credentials, changing the FAQ, swapping the hero image.
- **Don't touch:** The `<script type="application/ld+json">` block near the top (Google reads this) unless you know what it does. The `<meta>` tags at the top (these are SEO).

#### `form.html` — Application form
- **What it does:** The intake questionnaire new athletes fill in. Seven sections, a progress bar, and a success screen. Submissions go to your email via Web3Forms.
- **If deleted:** No one can apply. Every "Apply Now" button on the site breaks.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, `partials/nav.html`, `partials/footer.html`, Web3Forms (external service).
- **Edit this when:** Adding, removing, or rewording form questions. Changing which options appear in dropdowns.
- **Don't touch:** The Web3Forms `access_key` value (breaks submissions). The `<script>` at the bottom that runs the progress bar, unless you're ready to test it carefully.

#### `program.html` — The athlete app
- **What it does:** The private training app. Four tabs: **Home** (current cycle + progress), **My Plan** (daily workouts, videos, timers, weight logs, RPE scoring), **Coach** (messaging + notes), **Library** (a [Read | Train] split — Read shows coach-published articles; Train shows on-demand workout sessions). Loads an athlete's programme from `/data/`. Each article and workout has its own shareable deep-link URL (`?article=<id>` / `?workout=<id>`). Demo mode (`?client=demo`) shows a read-only preview without a key.
- **If deleted:** All athletes lose access to their programme.
- **Depends on:** `data/*.json` (one per athlete), `content/index.json` + `content/**/*.json` (Read article library), `workouts/index.json` + `workouts/**/*.json` (Train workout library), `exercise_library.json` (maps exercise names to videos), `assets/js/shared.js` (for the video pop-up and "install app" prompt), `manifest.json`, icon files, and **Supabase** (it backs up each athlete's progress to the cloud and reads/sends messages).
- **Links to the habit tracker — and nothing more.** A **Daily Habits** shortcut card on Home and at the end of My Plan opens [`habits.html`](habits.html), handing over the client id and resolved key. Same origin and PWA scope, so from an installed app this stays inside the app shell instead of bouncing to the browser. The card is deliberately plain: **this app holds no habit state, no XP maths and no level formula** — duplicating those would be a third copy to keep in sync and weight it doesn't need.
- **The two apps stay out of each other's storage.** `_snapshot()` skips `<id>_hab_*` (Proof owns and syncs those). Finishing a session writes nothing into Proof; it records to `session_history` as it always has, and Proof reads the dates back through the read-only `get_workout_days` RPC ([`supabase/stage10_workout_days.sql`](supabase/stage10_workout_days.sql)) to tick its WORKOUT habit. The completion card just says so and offers a shortcut across.
- **Edit this when:** You want to change how the training app looks or behaves, add new features to the training screens, or tweak the styling.
- **Don't touch:** This file is large and self-contained. Most day-to-day changes happen in `data/*.json`, `content/`, and `workouts/`, not here. Ask an AI assistant to guide you before structural edits.

#### `habits.html` — AA Proof, the habit tracker (private)
- **What it does:** A standalone gamified habit tracker for coaching clients. A one-screen onboarding suggests a habit set (the athlete switches off whatever they want), then three tabs: **Today** (level hero, day strip, habit list, the daily nudge, quests, seven-day recap), **Progress** (overall level, four season stats, every habit's own rank and consistency → tap for full history, milestones) and **Crew** (the whole social layer). **Settings is not a tab** — it sits behind the athlete's initials in the header, and that button doubles as the way out of Settings, the manual and the ladder. Eight suggested habits — STRENGTH, STEPS, SLEEP, FUEL, WATER, MOBILITY, BREATHE, SUPPS (vitamin D · creatine · omega-3) — plus custom habits. Check-off habits toggle; counter habits (steps, sleep, water, meals) take a number via `+` or the log sheet. Athletes open it with the **same link pattern as the program**: `habits.html?client=<id>&key=<key>`. Demo mode: `?client=demo` (local-only, no cloud).
- **There is no chat.** The app never messages the coach — it runs in a fixed "nudge and recap" mode: one reactive nudge card on Today whose button opens whichever habit is being avoided, plus a rolling seven-day recap. Athlete↔coach messaging lives in `program.html` only.
- **Progression (League-of-Legends style).** *Every habit has its own level* plus one overall level, so an athlete can be GRINDER 2 on water and ROOKIE 5 on strength at once. Ranks are 10 names × 5 sub-levels (`RANKS`): ROOKIE · CONTENDER · GRINDER · OPERATOR · ENFORCER · PREDATOR · MACHINE · RELENTLESS · UNTOUCHABLE · IMMORTAL. Level 6 is CONTENDER 1, level 20 is OPERATOR 5. Past level 50 the athlete **prestiges** — the ladder restarts carrying a star (`★1 ROOKIE 1`), so there is no cap.
- **The badges pay, and it stays a pure function of the log.** Consistency tiers and milestones award real XP on the **overall** ladder (never a habit's own, which must stay a pure count of how often it was done). Each bonus is attributed to **the day it was crossed**, so the season rule and both leaderboard windows filter it like any other amount and nothing new is stored; and **runs are measured from the season start**, so a veteran whose streak predates the season can still earn tiers instead of being locked out of ~5,300 XP a newcomer can reach. Tier values are a multiplier on that habit's own daily value, so a workout streak outpays a supplements streak. `bonusEvents()` in the app, `public.hab_bonus_xp` in Postgres — the two must agree, and [`XP_SYSTEM.md`](XP_SYSTEM.md) §8 says how to verify parity. SQL: [`supabase/stage12_bonus_xp.sql`](supabase/stage12_bonus_xp.sql).
- **Everything is computed from real logs and nothing about XP is stored.** Streaks, per-habit rates, XP, every level and every achievement derive from the athlete's own history. Retune `XP_RULES` and every athlete is rescored against everything they have already done — see **[`XP_SYSTEM.md`](XP_SYSTEM.md)**, which is the document to read before touching progression.
- **The XP curve.** `levelCost(base, n) = base × n^0.55`, so every level costs more than the last. Tuned to two anchors: **one full day of habits reaches level 2** (a perfect day is 420 XP, level 2 costs 300) and **~2 months at 80% adherence reaches level 20** (19,270 XP ≈ 57 days). Habit ladders reuse the curve with `base` scaled to that habit's own daily value, so a habit's level tracks how often it is actually done.
- **Celebrations.** A full-screen game-style takeover (masked ray burst, scale-punched badge, shockwave, flying shards, animating XP bar) fires for an overall level, a genuine **rank promotion**, a **consistency tier**, a **milestone**, or a **perfect day**; routine habit levels get an inline `.lvchip` flash instead, so day one isn't nine consecutive takeovers. Three grounds: near-black with clay rays for a level, full clay for a rank-up, deep green with clay-2 rays for the other three. Queued and dismissed one at a time. Levels are diffed in `checkLevelUps()`, the rest in `checkUnlocks()` — which coalesces same-day tier clears across habits into one takeover and baselines silently for athletes who arrive with history. See **[`XP_SYSTEM.md`](XP_SYSTEM.md)** §5.
- **The renderer morphs, it does not replace.** `render()` builds an HTML string and patches it into the live DOM node by node; `app.innerHTML = …` must **not** be reintroduced, because it breaks scroll retention, kills every `transition: width` (the bar animated is a new node born at its final width) and replays each screen's entrance fade on every tap. `data-k` marks identity (a different key in a slot is replaced outright, which is how a screen change still fades while a check-off doesn't); `data-static` marks subtrees the template doesn't own (the `#fx` flight layer, counter-owned figures). Clicks and input are handled by one delegated listener, since surviving nodes would otherwise accumulate one listener per render. Figures marked `data-num` are counted up by `syncNumbers()`; bars marked `data-fill` grow from zero on first paint; `flyXp()` arcs a clay `+XP` chip from the tapped row to the level hero; `haptic()` fires on tick/completion/level/rank (a no-op on iPhone — Safari exposes no vibration). All of it yields to `prefers-reduced-motion` via `reduced()`. Full notes in **[`HABITS.md`](HABITS.md)** → *How it feels*.
- **Quests are a run the coach starts, not a standing feature.** There are none unless Amir starts one, and a run lasts **7 days from its start date** (not Mon→Sun); when it ends the block disappears from Today. Four kinds, all measured from the log alone (`daysHit:<habit>`, `total:<habit>`, `qualify`, `perfect`), each paying once on the day it completes, so they ride the same dated-bonus rail as tiers and milestones. Runs are stored as `[{start, ids}]` on the `xp_rules` row; past runs are kept so their XP keeps counting. **Start:** `select public.set_quests('2026-07-29', array['w_water5', …]);` **Cancel:** `select public.clear_quests('2026-07-29');` Pool lives on `xp_rules` **and** as `QUEST_POOL` in habits.html (offline fallback) — keep them in step. SQL: [`supabase/stage14_quest_runs.sql`](supabase/stage14_quest_runs.sql), which holds the current `hab_bonus_xp`. See [`XP_SYSTEM.md`](XP_SYSTEM.md) §8.5.
- **Leaderboard movement.** Rows carry a ▲/▼ delta and a banner naming whoever the athlete overtook. The server returns no history, so the last standing per scope is cached in `CFG.lbSeen` and diffed on the next fetch (`applyBoardDeltas()`).
- **The shareable rank card.** `buildRankCard()` draws a 1080×1080 PNG on a canvas — insignia via `Path2D` from the same `RANK_ART`, so it can never diverge from the app — and `shareRankCard()` hands it to the OS share sheet, falling back to a download. It awaits `document.fonts.load()` per face first; canvas otherwise falls back to a system sans without warning.
- **Phone manners.** `bindGestures()` (bound once per node) gives the log sheet drag-to-dismiss and the stepper hold-to-repeat. Optional synthesised sound rides inside `haptic()`, off by default — and it is the only feedback iOS gets, since Safari has no vibration API.
- **The rank ladder and the insignia.** All 10 ranks are visible on their own screen (`renderRanks()`), reachable by tapping the rank on Today or Progress and from a Settings row: each rank's glyph, level range, XP cost, whether it is cleared, and how far through the current one the athlete is, plus what the star means past level 50. Insignia live in `RANK_ART` and are **drawn, not imported** — straight lines, hard corners, square caps, one inherited colour — and they escalate deliberately (blocks, force, machinery, burst). They also appear on the level heroes, on a rank-up takeover, and beside every leaderboard row (`rankNameOf()` recovers the rank from the server's rendered label).
- **The nudge is a library, not a sentence.** `NUDGES` holds 83 lines across 13 situations — one bucket per habit plus nothing-logged, one-left, all-done, at-risk and rolling. `pickLine()` seeds the choice on the date, so a line is stable all day and rotates tomorrow (21 days exhausts a 10-line bucket with no back-to-back repeats). Lines take `{n}`/`{name}`/`{unit}`/`{st}` tokens. Each nudge carries a `key` naming the *situation*, and the typing card keys off that — so logging another glass of water retargets the counter in place rather than retyping the line.
- **The screen is never quite still.** Navigation has a direction (`navDir()` + `screenAnim()` slide screens along `TAB_ORDER`; detail and the manual push in from the right and pop back to the left), and the active tab is one `.tabslab` that slides between cells rather than a background that teleports. Ambient layer: a streak **ember** that breathes from 5 days and flickers past 30 (`emberLevel()`); **idle attention** that breathes the most valuable *unlocked* habit still undone 20s after the last tap (`armIdle()`); a **streak-at-risk** state after 20:00 that turns the day bar clay and rewrites the nudge, gated on there being a real streak to lose (`atRisk()`); the nudge **typing itself** (`typeLines()`); the 35-day grid cascading in; and leaderboard rows staggering in with bars drawn against the leader's score. ⚠️ The typer keeps the untyped remainder in the DOM invisibly and uses a zero-width caret — typing into an emptied element grows the card as it goes and drags the scroll position with it.
- **Nothing is ever lost.** Every change is written to localStorage first and flagged dirty; the flag is itself persisted, so an app killed while offline still knows there is unsent work. Retries back off (5s → 15s → 45s → 2m → 5m) and fire again on reconnect, on foreground, on `pagehide` and at every launch. Each push sends the complete snapshot so a newer push supersedes an older one, and the cloud merge keeps the **larger** logged value per habit so a stale device can never erase real data. Settings shows a live sync line and a **Sync now** button.
- **If deleted:** Athletes lose the habit tracker. The program app and dashboard are unaffected.
- **Depends on:** `data/<id>.json` (athlete name + key fallback) and **Supabase** — only the *existing* `save_progress` / `get_progress` functions, under localStorage keys `<id>_hab_cfg`, `<id>_hab_log` and `<id>_hab_meta`, merging into the same `athlete_progress` row the program app uses. **No new tables or functions.**
- **Leaderboard (opt-in, server-scored).** Fourth tab. Two boards: *this week* (Monday to today, the default, so a new client can win in week one) and *all time*. An athlete appears **only after joining** and picks their own display name (defaults to first name + last initial); they can rename or leave any time. XP is recomputed **in Postgres** from the log already in `athlete_progress`, so editing localStorage cannot buy a place. The RPC deliberately returns **no athlete ids** — an id alone would let one client fetch `/data/<id>.json` and read another athlete's whole programme — and reading the board is key-checked so names are never exposed to the open internet. SQL: [`supabase/stage9_leaderboard.sql`](supabase/stage9_leaderboard.sql) (**must be run once** — until then the tab explains itself instead of erroring).
- **Roll call — one sentence a day, on the same opt-in.** Lives entirely in the **Crew** tab: the composer sits above the feed it posts to, and Crew opens on it. Today carries a one-line pointer that vanishes once the athlete has written — a doorway, not a second composer. Posting requires a `leaderboard_optin` row, which already means "other athletes may see me under this handle" — so there is no second consent and no second display name, and **leaving the board hides every line** without deleting it. Not a chat by construction: the primary key is `(athlete_id, day)`, so the schema *is* the rate limit. **Today only**, even though the log is editable for `BACKFILL_DAYS` — fixing Saturday's steps is admin, rewriting what you said about Saturday is not. **It pays no XP**, deliberately, and no scoring function reads `hab_notes`. The day percentage beside a line is client-computed and self-reported, which is safe precisely *because* it buys nothing; mirroring `dayPct()` into plpgsql would add a third place the scoring rules must agree. Coach-only `set_coach_note()` pins a line at the top of its day and `hide_note()` takes one down (hide, not delete, so the evidence survives the decision). SQL: [`supabase/stage15_roll_call.sql`](supabase/stage15_roll_call.sql). See [`XP_SYSTEM.md`](XP_SYSTEM.md) §11.
- **The log is editable for three days (`BACKFILL_DAYS`).** A day strip at the top of Today picks which day taps land on; `setVal()` refuses anything outside the window and `AKEY()` self-heals when the app is left open past midnight. Nudges, streak-at-risk, the perfect-day celebration and the roll call box all stay anchored to the real today and stand down while an earlier day is selected — they are statements about *now*. Backfilling does recompute XP, streaks, badges and quests. ⚠️ It is a **UI affordance, not a lock**: the app pushes its whole log blob, so devtools could always write further back. See [`XP_SYSTEM.md`](XP_SYSTEM.md) §6.5.
- **Today leads with the habit list, not with commentary.** The order is hero → day strip → habits → nudge → quests → roll call → recap. It used to be hero → nudge → quests → habits, which put the first tickable row ~1,400px down: you opened the app to log and had to scroll to log. Six of eight habits are now tickable without scrolling at 390px, five at 320px. Anything added to this screen belongs *below* the list unless the athlete must act on it first. Related cleanups in the same pass: one bar in the hero instead of two identical green ones; a progress track only on counter habits (on a check-off habit it could only read 0% or 100%); no `border-left` on `.pluscell`, which had made the right-hand rule appear on counter rows and vanish on the others; streaks read `3 DAYS` rather than `3D`.
- **Progress answers a different question from Today.** A slim `.lvstrip` replaces the duplicated 76px level hero, followed by a four-stat season grid (days logged, badges, day streak, perfect days — days-logged first so a rebuilding athlete does not open on a pair of zeros) and a one-line key for the consistency pips, which previously had no legend anywhere in the app. Habit meta is rank · XP only; appending today's status wrapped every row and restated Today.
- **Detail, manual and celebration.** Detail's eyebrow is the habit's `goal` (using `h.source` made most habits announce themselves as "MANUAL", i.e. the document in Settings) and its header right slot is the current run, not the level the hero already shows; the consistency block is one column rather than pips opposite a right-aligned block that stranded "best run 3d" against the margin; stat units sit inside the figure (`3` + small `days`, not `3D` at 24px); and the 35-day grid marks today and carries a hit/part/none key. The manual opens with a **contents list that scrolls to each section** — a dozen sections of prose with no way in is a wall, not a reference — and its body copy is ink rather than muted, which is right for a caption and wrong for four hundred words. The celebration's queue counter moved from `position:absolute; bottom` (stranded ~340px under the button) to sitting with the button it describes.
- **House rules the screens now share.** One `sectionLabel()` for the whole app (Progress and Settings each had a private copy that had drifted to different padding). Every list row sits on the **20px left edge** — `.selrow` was `15px 14px`, so Settings rows sat six pixels inside their own section headings and the tab had no single left edge. `.selrow` owns its `1px var(--rule)` border rather than declaring `2px var(--divider)` and being overridden inline at all six call sites. A switch's **off** state is `--muted-soft`, not `--ink`, so Settings stops drawing the eye to whatever is turned off. A row that navigates shows an **arrow** — the leaderboard row used a clay `ON`/`OFF`, which made one screen express the same yes/no idea three ways. **Screen titles are canonical**: the Settings rows read "The ladder" and "The manual" because that is what the destinations are called.
- **Only the longest run animates** (`.ember.lead`). Every streak used to pulse, so a consistent athlete opened Today to six clay dots moving at once — the effect was built for one. `leadStreak()` finds the best current run and Today and Progress each mark that single row; the others keep the colour and the weight and hold still.
- **Text on clay uses `--on-clay`, never a hard-coded white.** Clay inverts between themes — `--clay-deep` is a dark brown in light mode and a light salmon in dark — so text on it has to invert too. Hard-coded `#fff` gave **2.4:1** in dark mode on the three surfaces whose whole job is to warn: the streak-at-risk strip, the backfill "you are editing an earlier day" banner, and the at-risk nudge card. Now 7.9:1. The celebration takeover is the exception and is deliberately pinned to the light-mode clay, because it is a full-bleed moment that should look identical in both themes and its type is white throughout.
- **Two words for two ideas: `run` and `streak`.** A run is consecutive days on one habit; a streak is consecutive days at `streakQualifyPct` across everything tracked. The app previously used five phrasings — *day streak*, *24 DAYS*, *Best streak*, *Best run so far*, *days in a row* — so an athlete saw `24 DAYS` on water and `2` for DAY STREAK on Progress and could not reconcile them. Habit rows and the detail header read `24-DAY RUN`; the detail stat is `Longest run`; the pip key and the tier line both say *run*. Never introduce a third word for either.
- **Quests say so when there is no run.** `renderQuestsIdle()` prints one muted line rather than nothing. Between runs the block used to vanish entirely, which kept "seeing quests means something is on" true but made the feature invisible — an athlete who joined between runs never learned quests existed, so the next run read as random instead of as an event. The idle line is a fraction of a live block's height on purpose.
- **The error screen is branded.** Unbranded, a stale link reads as "this app is broken"; with the wordmark and the expected link shape it reads as "the app is fine, my link is wrong", which is both true and the thing that gets the athlete to ask for a new one.
- **The long game — the only thing in the app that is kept rather than derived.** A 14-reward track up the level ladder (`PASS_TRACK`), reached by levelling and nothing else. Two kinds, both free to mint: **titles** (a name worn under your rank and printed on the shared card) and **cards** (five canvas-painted grounds for that shared card). `claimRewards()` records what the level has reached into `CFG.pass.owned` and returns only what is new, so it can be celebrated behind the level-up that earned it; it runs silently once at boot to baseline an athlete who arrives with history. **Nothing ever revokes a reward** — not a new season, not a retune, not switching a habit off — which is what lets levels keep resetting with the season without the athlete losing anything: *"a new season resets your points, not your rewards."* Free to mint is the load-bearing constraint: a coach cannot owe forty people a call because forty people were consistent. Reached from **Progress → The long game**, the one line on that screen that points forward. Titles are **not on the leaderboard yet** — that needs the server to validate the unlock, or devtools could award anyone anything.
- **It also runs for people with no programme (`"tier": "free"`).** One field in `data/<id>.json` switches the app into free mode; `isFree()` is the only test, and everything not-`"free"` is treated as coached, so existing athlete files need no edit. In free mode WORKOUT stays locked and explains *why* ("Coached athletes earn this from their programme"), every route that would have opened `program.html` goes to `/form.html` instead, and the cross-link reads *"Want the training too?"* rather than *"Your training programme"*. **Nothing about scoring changes** — a free user earns XP, levels, runs and board position on exactly the same rules, which is what makes the upgrade path free: flip the field, the pipeline writes the programme, and their whole history survives. Free users sign up at [`proof.html`](proof.html) and are set up with the [`/proof-signup`](.claude/skills/proof-signup/SKILL.md) skill.
- **It installs as its own app, called AA Proof.** The manifest is built at load so `start_url` carries the athlete's `?client=…&key=…` — the installed icon is *their* app, not a login screen. The name lives in three places that must move together: `manifest.name`, `manifest.short_name` and the `apple-mobile-web-app-title` meta (iOS labels a home-screen icon from the meta and ignores the manifest). The offer is a sheet fired **once, ~1.5s after the first habit is logged** — hooked into `setVal()`, the one door into the log — never on arrival, never over a celebration or the log sheet, never in demo or when already standalone. *Not now* sets `CFG.installAsked` and it never asks again; a permanent Settings row is the way back, and the only route for someone on a new phone. `beforeinstallprompt` is Chromium-only, so iOS gets the *Share → Add to Home Screen* instruction instead of a button that could not work — and because the link arrives by WhatsApp, `inAppBrowser()` catches the very common case of the app being opened inside another app's browser, where nothing can be installed at all, and says *"open this in Safari first"*.
- **One departure from the original design handoff:** STEPS and SLEEP are entered manually rather than synced from HealthKit, which a web app cannot read.
- **Edit this when:** Changing the suggested habits or their XP weights, rank names, pacing, consistency tiers, milestones, or the nudge copy — all covered in [`XP_SYSTEM.md`](XP_SYSTEM.md).
- **Don't touch:** The Supabase URL/key and the key-resolution block. The `migrateOld()` fold-forward (it rescues data from earlier shipped versions). The sync/dirty-flag logic. `noindex` on purpose.

#### `coach.html` — The Coach's Box (private)
- **What it does:** Your private mission control, covering **both** the coached athletes (`program.html` / `session_history`) and the free Proof crew (`habits.html`). Sign in with Google (locked to your coach email). Four tabs, routed on the URL hash so any screen can be bookmarked: **Today** (`#today`) — on-court count, the roll-call wall with the coach-line composer and hide/show moderation, a needs-you queue, the quest-week lever, and a 7-day Proof pulse; **Athletes** (`#athletes`, `#a/<id>`) — one roster across both systems plus a full per-athlete file (secure links, Proof strip, ACWR/readiness/adherence charts, messages, call logs, prescribed program, session logs, email import); **Proof** (`#proof`) — the server-scored board, the season, the signup funnel with upgrade flags, and titles minted; **Links** (`#links`) — copyable article/workout deep links.
- **⚠ It never scores Proof itself.** XP/levels/streaks/day scores are already computed twice (the client in `habits.html` and plpgsql in Supabase) and those two must agree — a third scorer here would be the first to drift. Every Proof number on this page is either a **presence fact** (a day's `hab_log` entry is a non-empty object — the same test `contact_list()` uses) or a value the server returned (`hab_season_level`, `leaderboard_top`, `contact_list`). To show a new Proof number, teach the server to return it.
- **Preview mode:** `coach.html?demo=1` renders the whole layout against synthetic fixtures — no network, every write a no-op. Use it for design work and screenshots.
- **If deleted:** You lose the dashboard. Athletes are unaffected — their apps keep working — but you can no longer view progress, mint links, message anyone, post the day's coach line, moderate the wall, or start a quest week from a UI (the SQL editor still does all of the last three).
- **Depends on:** Supabase (`supabase-js` from a CDN, plus the tables/RPCs in the `supabase/` folder), Google sign-in, `data/<id>.json`, `exercise_library.json`, `articles/index.json`, `workouts/index.json`, `favicon.ico`. It does **not** use the shared CSS/JS partials — it's self-contained.
- **Edit this when:** You want to change what the dashboard shows, add a panel, or change a coach workflow.
- **Don't touch:** The Supabase URL/key and the sign-in email check unless you know what they do. `AMIR_ATHLETE_ID` — the board is fetched through Amir's own athlete identity, so `leaderboard_top()` gets a valid key. This page is `noindex` on purpose — keep it that way.
- **Watch for:** CSS class collisions. The topbar's `.who` (white, nowrap) once painted the wall's athlete names white-on-white; grid children need `min-width: 0` or one nowrap label scrolls the page sideways on a phone.
- **See also:** `COACH_DASHBOARD.md` — the full user manual for this page.

#### `call-log.html` — Weekly check-in log (private)
- **What it does:** Your tool for running and recording the **weekly athlete check-in call** — a structured 8-section script with /10 scores, wins, goals and flags. Same Google sign-in as the dashboard. Also builds **copy-and-paste AI prompts** (run in any free AI chat) for a weekly summary and an end-of-cycle report, and per-question **Farsi** prompts for running the check-in over WhatsApp.
- **If deleted:** You lose the check-in tool. Athletes and the dashboard are unaffected; saved logs stay in the database.
- **Depends on:** Supabase (`supabase-js` from a CDN, the `call_logs` / `cycle_reports` tables, plus `athlete_keys` / `athlete_progress` / `session_history` as inputs), Google sign-in. Self-contained — no shared partials.
- **Edit this when:** You want to change the check-in questions, the score fields, or the wording of the AI prompts (the `WEEKLY_PROMPT` / `CYCLE_PROMPT` constants in the page).
- **Don't touch:** The Supabase URL/key and the coach-email check. `noindex` on purpose.
- **See also:** `CALL_LOG.md` — the full user manual for this page.

#### `proof.html` — The free habit-tracker landing page (public)
- **What it does:** The page you send people who are not clients. It explains what Proof is, what they'd track, that they'd be on one board with real coaching athletes, and then asks for three things — **display name, email, WhatsApp** — which arrive in your inbox via Web3Forms, same as the apply form. It ends on a soft coaching CTA rather than a hard sell: the tracker *is* the pitch.
- **It is deliberately not in the nav.** It's the Instagram bio link and the thing you paste in DMs. Adding it to the site menu would put a free product next to the paid one on the front door.
- **Signing someone up is a skill, not a chore:** paste the signup email at Claude and run [`/proof-signup`](.claude/skills/proof-signup/SKILL.md) — it picks an id, mints the key, records the contact, writes `data/<id>.json` with `"tier": "free"`, ships it, and hands you back a WhatsApp message with the link in it.
- **If deleted:** No one new can sign up for the free tracker; existing free users are unaffected (their links keep working).
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, partials, Web3Forms (external), and — after signup — `supabase/stage16_contacts.sql`.
- **Edit this when:** You want to change the pitch, the habits shown, or which fields you ask for. If you change the fields, change the `/proof-signup` skill and `privacy.html` §2.4 with them.
- **Don't touch:** The Web3Forms `access_key` (breaks submissions). Never add a field that collects anything you would not want sitting in an email inbox.

#### `privacy.html` — Privacy Notice
- **What it does:** Your GDPR-compliant privacy statement covering the form, the two apps, the habit tracker and its board, free-tracker signups, analytics, and embedded YouTube.
- **If deleted:** You break UK/EU law and the link in the footer 404s.
- **Depends on:** `assets/css/*.css`, `assets/js/shared.js`, partials.
- **Edit this when:** You change what services you use, change retention periods, or update your contact details. **Any new collection of personal data needs a section here with a lawful basis** — that is what §2.4 is for the `proof.html` signups.
- **Don't touch:** The structure — the numbered sections are there for legal reasons. If you insert a section, renumber the ones after it (a duplicate `2.5` once shipped this way).

#### `terms.html` — Terms of Use
- **What it does:** Legal disclaimers around training, liability, intellectual property.
- **If deleted:** You lose legal cover and the footer link breaks.
- **Depends on:** Same as privacy.html.
- **Edit this when:** You change how you run the business, pricing model, or jurisdiction.
- **Don't touch:** The health/training disclaimer and liability sections without professional review.

---

### Shared "Look and Feel" (CSS)

#### `assets/css/tokens.css` — The brand palette
- **What it does:** The single place where colours, fonts, spacing, and sizes are defined. Change a colour here and it updates across every page.
- **If deleted:** Every page loses its colours, fonts, and spacing. Everything looks broken.
- **Depends on:** Nothing. It's the foundation.
- **Edit this when:** You want to change a brand colour (like the yellow accent), swap fonts, or adjust the site's base spacing.
- **Don't touch:** The variable names (the part before the colon). Only change the values after the colon.

#### `assets/css/base.css` — Basic styling rules
- **What it does:** Sets up typography, headings, buttons, containers, and the subtle film grain effect. Every page uses these styles.
- **If deleted:** Headings, buttons, and body text lose their styling.
- **Depends on:** `tokens.css`.
- **Edit this when:** You want to change how headings, buttons, or body text look everywhere.
- **Don't touch:** Unless you're deliberately restyling the whole site.

#### `assets/css/components.css` — Reusable pieces
- **What it does:** Styles for the navigation bar, footer, cards, form fields, video pop-up, and the "install app" prompt.
- **If deleted:** The menu, footer, cards, and form inputs lose their styling.
- **Depends on:** `tokens.css` and `base.css`.
- **Edit this when:** You want to restyle the nav, footer, cards, or form inputs.

---

### Shared Behaviour (JavaScript)

#### `assets/js/shared.js` — The glue script
- **What it does:** Runs on every marketing page. It (a) injects the nav and footer from the partial files, (b) highlights the active menu link, (c) wires up the mobile menu, (d) fades things in as you scroll, (e) handles the video pop-up, (f) shows the "install app" prompt on the training app.
- **If deleted:** No menu. No footer. No video pop-ups. No mobile nav. The site looks unfinished and bare.
- **Depends on:** `partials/nav.html`, `partials/footer.html`.
- **Edit this when:** You want to change how the video pop-up or "install app" prompt behaves.
- **Don't touch:** Unless you're comfortable with JavaScript. This is the most fragile file to edit by hand.

---

### Reusable HTML Pieces (Partials)

#### `partials/nav.html` — The menu bar
- **What it does:** The top navigation bar shown on every page. Edit it once, every page updates.
- **If deleted:** No menu appears on any page.
- **Depends on:** Loaded by `shared.js`.
- **Edit this when:** You want to add, remove, or rename a menu link.

#### `partials/footer.html` — The site footer
- **What it does:** The footer shown at the bottom of every page (copyright, Privacy, Terms, etc.).
- **If deleted:** No footer anywhere.
- **Depends on:** Loaded by `shared.js`.
- **Edit this when:** You want to add a social link, change the copyright text, or add a footer link.

---

### Data

#### `data/*.json` — Athlete programmes
- **What it does:** Each file is one athlete's full training programme. `program.html` reads the right file based on the `?client=...` part of the URL.
- **If deleted:** That athlete loses access to their programme.
- **Depends on:** `program.html` reads them.
- **Edit this when:** You're updating an athlete's weekly workouts, adding video links, changing their focus, or creating a new client.
- **See also:** `SCHEMA.md` — the cheat-sheet for what fields each JSON can contain.

#### `content/index.json` — Read library manifest
- **What it does:** The table of contents for the Library → Read tab. Lists categories (For Coaches, Pre-Competition, Recovery, Mental, Nutrition, Supplements) and which articles belong to each. The app reads this file to build the Read list instantly, then fetches individual articles on demand.
- **If deleted:** The Read tab shows nothing.
- **Depends on:** `program.html` reads it; individual article files in `content/<category>/` are fetched lazily.
- **Edit this when:** You add a new article or create a new category. Always add an entry here alongside the article JSON.
- **See also:** `SCHEMA.md → "Library tab — Read section"` for the exact format.

#### `content/<category>/*.json` — Article files
- **What it does:** One file per article. Contains the title, read time, and an array of `blocks` (paragraphs, headings, lists, callout boxes, images, and embedded workout cards). Each article is reachable at `program.html?article=<id>` — a shareable public URL.
- **If deleted:** That article 404s when opened; the card still shows in the list until you also remove it from `content/index.json`.
- **Edit this when:** You're writing a new article or updating an existing one.
- **See also:** `SCHEMA.md → "Article block types"` for all supported block formats.

#### `workouts/index.json` + `workouts/<category>/*.json` — Train library
- **What it does:** The manifest and individual session files for the Library → Train tab. Works exactly like the Read library but for on-demand workout sessions. Each workout is reachable at `program.html?workout=<id>`.
- **Edit this when:** Adding a new shared workout session. Always create the JSON file and add the entry to the manifest together.
- **See also:** `SCHEMA.md → "Library tab — Train section"` for the exact format.

#### `SCHEMA.md` — The JSON field guide
- **What it does:** Documents every field you can use in an athlete JSON file, a workout file, and an article file — plus how to add new content to the Library tab.
- **If deleted:** You lose the reference guide. The site keeps working.
- **Edit this when:** You add a new optional field to your JSON files and want to document it.

---

### The Database (Supabase)

The site started with no backend. It now uses **Supabase** (a hosted Postgres database) so athlete progress survives a phone wipe, the coach dashboard has something to read, and coach↔athlete messaging works. The pages talk to Supabase directly over the internet — there is no server of yours to run or maintain.

#### `supabase/*.sql` — Database setup scripts
- **What they are:** The exact SQL that built the live database, kept in the repo as a record and so it can be rebuilt. They're applied in order and each one is safe to re-run.
  - `stage1_schema.sql` — the core: a table that stores each athlete's progress as one JSON blob, plus the coach dashboard's read access.
  - `stage2_keys.sql` — per-athlete secret keys, so an athlete's link (`program.html?client=<id>&key=<key>`) can write only their own data.
  - `stage3_messages.sql` — the two-way messaging table used by the coach dashboard.
  - `stage16_contacts.sql` — the **contact book** for free habit-tracker signups: email and WhatsApp, who they are, where they came from, and how many days they have actually logged (`contact_list()`). Coach-only, behind RLS. It exists because `data/<id>.json` is a static file anyone can fetch if they guess an id — **contact details must never go in the repo**. `add_contact()` does a whole signup in one call — key, contact row, name they asked for — but **deliberately does not put them on the leaderboard**: they join themselves from Crew, which is what `privacy.html` promises, and it keeps the board free of names sitting at zero because someone signed up and never opened the link. `forget_contact()` erases someone completely.
  - `stage17_titles.sql` — **titles on the leaderboard and the roll call wall.** A title is the one reward other people *read*, and `CFG.pass.owned` is localStorage, so the server keeps its own record and refuses to publish anything else. The record is **minted, not recomputed**, and that is the whole point of the file: a level can *fall*. It falls to 1 at every season reset, and it falls mid-season too, because `hab_bonus_xp` scores `daysWith3`/`perfectDays` off habits that are currently switched **on** — adding a habit you are not yet doing deletes perfect days you already earned (67 of 266 log lengths tested; first at 105 days, level 21 → 20, which is IRONCLAD). So `hab_mint_titles()` records what the athlete's level has earned *now*, permanently, and `set_title()` only checks that record. The threshold is season-scoped, mirroring `overallLevel()` exactly — career XP would be a superset and would mint titles the app never awarded. Cards are absent on purpose: they are drawn on the athlete's own phone. SQL: [`supabase/stage17_titles.sql`](supabase/stage17_titles.sql). See [`HABITS.md`](HABITS.md) → *The long game*.
  - `stage18_day_rosters.sql` — **a day is scored against the habits that were on that day.** `hab_bonus_xp` used to pick the live habit set once (`livehab` / `nlive`) and apply it to every day in history, so the roster an athlete had *today* re-judged days they finished months ago. It moved both ways and cost 500xp (the `CN` milestone) each time: adding a habit deleted perfect days already earned, switching one off invented perfect days that never happened. The tracked set is now a dated timeline on the athlete's own config (`CFG.roster`, `rosterOn()` in the app), so `daylive` resolves per day and `nlive` is a column on `perday` instead of a scalar for all time. No athlete was rescored: a config with no timeline falls through to the old `on` map, verified 45/45 identical across synthetic histories of 30–365 days. SQL: [`supabase/stage18_day_rosters.sql`](supabase/stage18_day_rosters.sql). See [`HABITS.md`](HABITS.md) → *Days are settled units* and [`XP_SYSTEM.md`](XP_SYSTEM.md) §4.5.
- **If deleted:** No effect on the live database (it's already built) — you'd just lose the written record of how it was set up.
- **Edit this when:** You change the database structure. Edit the SQL here *and* apply the same change in the Supabase dashboard so the two stay in sync.
- **Don't touch:** Don't run these blind against the live database without understanding them — ask an AI assistant to walk you through any change first.

---

### Keeping Exercise Videos in Sync (Notion)

#### `exercise_library.json` — Exercise-name → video-link list
- **What it does:** `program.html` reads this at load to turn an exercise name into its demo video. It is **generated**, not hand-edited — the source of truth is a Notion database.
- **If deleted:** Exercises lose their "watch video" links until you regenerate it.

#### `sync_notion.py` + `NOTION_SYNC.md` — The regenerator
- **What they do:** `sync_notion.py` pulls every exercise + video URL from the Notion "Exercise Library" database and rewrites `exercise_library.json`. `NOTION_SYNC.md` is the step-by-step guide for running it (setup, the token, troubleshooting).
- **If deleted:** You lose the ability to refresh videos from Notion (and the guide). The site keeps working with whatever `exercise_library.json` it already has.
- **Edit this when:** Almost never. You add/change videos *in Notion*, then run `python sync_notion.py` and commit the new `exercise_library.json`.
- **Don't touch:** `.notion_token` is your private Notion secret — it's gitignored and must never be committed.

---

### Marketing Cards (a side tool, not part of the live site)

#### `Content/card-preview.html` + `Content/instagram-cards/`
- **What they are:** `Content/card-preview.html` is a standalone designer page for making athlete "results" cards; `Content/instagram-cards/` holds the finished PNGs you've exported. Nothing on the live site links to either — it's a personal tool you open directly when you want to make a card. (Lives in the `Content/` folder alongside the Instagram reels and the design system.)
- **If deleted:** The public site is completely unaffected. You'd only lose the card-making tool and the saved images.

---

### Assets (Images and Icons)

#### `assets/img/og-image.jpg` — Social share image
- **What it does:** The image that shows up when someone shares your link on WhatsApp, Twitter, LinkedIn, etc.
- **If deleted:** Shared links show no preview image.
- **Edit this when:** You refresh your branding.

#### `assets/img/favicon.svg`, `favicon-32.png`, `favicon.ico`
- **What it does:** The tiny icon in the browser tab.
- **If deleted:** Browser tab shows a generic icon.

#### `assets/img/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
- **What it does:** The app icons used when someone installs the training app to their phone home screen.
- **If deleted:** Installed app shows a blank white icon.

#### `assets/img/generate_icons.py`
- **What it does:** A helper script that regenerates all the icons above from one source. You don't need to run it unless you're changing the logo.
- **If deleted:** No effect on the live site. You just lose the helper.

---

### Support Files (Hosting & Search Engines)

#### `CNAME`
- **What it does:** One line. Tells GitHub your custom domain is `www.amirardekani.com`.
- **If deleted:** Your site reverts to a `github.io` URL. Custom domain stops working.
- **Don't touch** unless you're moving to a different domain.

#### `manifest.json` — App install information
- **What it does:** When someone adds the training app to their phone home screen, this tells the phone the app's name, icon, and colours.
- **If deleted:** "Install app" feature stops working. Normal pages still work.
- **Edit this when:** You change the app's name or brand colour.

#### `robots.txt` — Search engine instructions
- **What it does:** Tells Google "crawl my public pages, but don't index the private training app or athlete data".
- **If deleted:** Search engines may accidentally index private athlete programmes.
- **Edit this when:** You add a new section that should or shouldn't be indexed.

#### `sitemap.xml` — Map for Google
- **What it does:** Lists the public pages so Google can find them all quickly.
- **If deleted:** Google still finds your site, just a bit slower.
- **Edit this when:** You add a new public page.

#### `favicon.ico` (root copy)
- **What it does:** A backup copy of the browser tab icon at the top of the site, for older browsers that only look here.

---

## How It All Works Together (Architecture)

Think of it like a house:

- **`tokens.css`** is the paint palette and furniture style guide.
- **`base.css`** decides how walls, floors, and ceilings are built.
- **`components.css`** is the pre-made furniture (sofas, tables, lamps) you place in every room.
- **`shared.js`** is the handyman that, on every page, hangs the nav on the hallway wall, drops the footer into the basement, and makes sure the video pop-up works.
- **`partials/nav.html`** and **`partials/footer.html`** are the single "master" copies of the menu and footer — change them once, every page shows the change.
- The five **pages** are the rooms. Each room reuses the same paint, furniture, and handyman — but has its own purpose (welcome, apply, train, legal).
- The **data folder** is a filing cabinet of athlete programmes.
- **Support files** (CNAME, manifest, robots, sitemap) are the street sign, doorbell plaque, and post-office forwarding instructions.

---

## What Happens When a Visitor Opens Your Site

1. Visitor types `amirardekani.com` in the browser.
2. GitHub Pages looks at `CNAME`, matches the domain, and serves `index.html`.
3. `index.html` loads the three CSS files (paint, walls, furniture) and the `shared.js` script.
4. `shared.js` quietly fetches `partials/nav.html` and drops it into the top of the page, then does the same for the footer.
5. `shared.js` also wires up the mobile menu, scroll animations, and the year in the footer.
6. The visitor reads the page. Anything that says "Apply" links to `/form.html`.
7. On the apply page, they fill in the form. The progress bar updates as they go. On submit, the form posts to Web3Forms, which emails you.
8. Later, you give an accepted athlete a link like `/program.html?client=their_id`.
9. `program.html` reads the `client=` bit, fetches `data/their_id.json`, and builds their whole training app from that file.
10. When they press play on an exercise video, `shared.js` opens a YouTube pop-up inside the page.
11. After a few seconds, the app offers them an "Install to home screen" prompt so it feels like a real app on their phone.
12. Anonymous visitor stats are reported to Plausible (no cookies, no personal data).

---

## The 20% of Files You'll Edit 80% of the Time

In rough order of how often you'll touch them:

1. **`data/*.json`** — Every time you write, update, or rotate an athlete's programme. This is your daily work.
2. **`content/<category>/*.json` + `content/index.json`** — Every time you publish a new article. Create the file, register it in the manifest.
3. **`workouts/<category>/*.json` + `workouts/index.json`** — Every time you add a shared workout session. Create the file, register it in the manifest.
4. **`index.html`** — When you reword your pitch, update the FAQ, swap a testimonial, or change a CTA.
5. **`form.html`** — When you want to add or tweak an application question.
6. **`partials/nav.html`** and **`partials/footer.html`** — When you add a new page, rename a menu item, or add a social link.
7. **`assets/css/tokens.css`** — If you ever rebrand (new accent colour, new font).

Everything else you can usually leave alone. If an AI assistant tells you to edit something outside this list, ask it to explain why first.

---

## Rules of Thumb

- **Before deleting anything**, search the rest of the project for its name. If other files mention it, don't delete.
- **After editing the menu or footer**, check every page — they all share those partials.
- **After editing `tokens.css`**, check every page — the change shows up everywhere.
- **Never commit** a file named `.env`, anything with passwords, or athlete data you don't want public if your repo is public.
- **When in doubt**, ask an AI assistant to show you a preview of the change before you push it live.
