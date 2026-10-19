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
- `CODEBASE.md` — technical map of the repo (file by file; the headless suites and the guards are near its end).
- `Content/CLIENT-APP-MAP.md` — the athlete app as a first-time client sees it, screen by screen, with findings for Amir.
- `Content/COACH-AUDIT.md` — the coach dashboard audit (2026-10-10); its §12 is the list to continue from.
- `Content/PRODUCT.md` — what the product/business actually is (internal brief; pricing, voice, backend).
- `Content/HOW-IT-WORKS.md` — customer-facing explainer of the coaching process.
- `HABITS.md` — **the habit app (`habits.html`, AA Proof) brief.** Start here for anything
  habit-tracker related: the four tabs, the eight habits, how progression works, the
  leaderboard, and how it links both ways with `program.html`.
- `XP_SYSTEM.md` — every tunable in the XP/level/rank system and what changes when you move it.
- `career/CAREER_MODE.md` — **Career Mode, the gamification system for both apps** (Amir, 2026-10-17: designed, decisions
  taken with *"go with your picks"*). One fact ledger and one server scorer; XP and a career level that never
  resets; badges, achievements and titles that each mean consistency, commitment, progress or resilience; weekly missions,
  personal quests; recognition for the athlete, Amir and the crew. Rules GAME-1 to GAME-14 live there (cite the ID).
  Every function step by step: `career/PROCEDURES.md`. The numbers and the catalogue are `career/*.toml`, which Amir reads
  and edits; `python scripts/check_career.py` checks them (pre-commit guard 20). When it is built, it supersedes the parts of
  `XP_SYSTEM.md` and `QUESTS.md` it names. **Phase 1 is live, in shadow** (`supabase/stage66_career_mode.sql`, applied 2026-10-17 on Amir's yes;
  `PROCEDURES.md` → *Phase 1, as built*): triggers on `athlete_progress`, `session_history`, `library_sessions` and
  `programs` write `career_facts` (a trigger never stops a save), `scripts/career_seed.py` turns the `.toml` files into
  `career_rules` / `career_catalogue` (re-seed after any edit), `get_profile()` is the read, and `career_compare()` must stay
  `ok`: Career Mode's habit XP equals `hab_xp()` + `hab_bonus_xp()` for every athlete. ⚠️ **Until the catalogue switch (2026-10-18),
  Proof's habit numbers lived twice**, the `xp_rules` row and `career/*.toml`; the checker held them equal to
  `supabase/xp_rules_snapshot.json` and no longer does (its rule 14 stops at the switch), but the phone's preview and the `xp_rules` row (which `career_compare()` reads) are still copies, so a change to Proof's rules is a change to all of them, and under D20 it applies forward only. Rehearse a change to stage66 with
  `node scripts/career/rehearse.mjs` (PGlite, nothing live; `--data <dump>` for the real rows, kept outside the repo).
  ⚠️ A trigger's exception block cannot catch a statement timeout (8 s for a signed-in request), so the work a trigger does
  per save stays small (at most 0.3 s on 2026-10-17). `scripts/career/rollback_stage66.sql` takes phase 1 off, on Amir's word only.
  **Phase 2, the XP switch, is DONE: applied to the live project 2026-10-17 and switched on 2026-10-18** (`supabase/stage69_career_xp_switch.sql`; Amir 2026-10-17, three decisions in
  `CAREER_MODE.md` → *round 3*; `PROCEDURES.md` → *Phase 2, as built*). The one gate is two, `rulebook.toml` → `[switch]`: `xp`
  (phase 2) and `catalogue` (phase 3; the badge entries say `retire_at` / `starts_at = "catalogue"`), each `"off"` or the day a seed
  turned it on, never back off. With the XP switch on: training earns XP, the WORKOUT habit pays 0 a day, closed days settle, the
  level is the career level (never resets; the road's titles, the board's level and coach.html's follow it), the board ranks season
  points from the facts through a cache (`career_scores`, a cache holding no source: `coach_erase_person()` empties it, and it is in `BACKUP_TABLES` and the snapshot),
  and nobody's level goes down (`[fact.level_kept]`, written once by the seed that turns it on; `career_seed.py --dry-run` shows the
  list first). Both apps read `get_profile()` only once it is on; it went on at the real switch (2026-10-18, rulebook version 3: 31 athletes up, 7 the same, nobody down, no level kept). Phase 3, the catalogue switch, is below (on since 2026-10-18). The phones copy three of its
  rules (the career's curve, WORKOUT at 0, a session's full log and check-in): `scripts/check_twins.js` §9 holds them to
  `scripts/career/xp_cases.json`, the server's answers, which `node scripts/career/rehearse_switch.mjs --backup <file>` writes
  (`--write-cases`) and checks (49 checks on the real rows); `scripts/headless/career.js` drives both apps. The way back is
  `scripts/career/rollback_stage69.sql`, on Amir's word only.
  **Phase 3, rewards with meanings and the catalogue switch, is DONE and ON: applied to the live project and switched on 2026-10-18** (`supabase/stage70_career_rewards.sql` and the main-lift fix
  `supabase/stage73_career_main_lifts.sql`, both applied that day, stage73 before the switch; `[switch] catalogue = "2026-10-18"`, rulebook version 3; Amir's word in chat, "go live", then "yes, turn on the project and give everyone their awards"; `PROCEDURES.md` → *Phase 3, as built* → *The go-day, as run*).
  The go-day: 318 awards for 29 athletes, 34,200 XP back-paid, 13 athletes up a level, nobody down, `career_compare()` `ok`. D1 was Amir's (now, not with Season 2), D10 and D11 were waived by his "go live", D19 is in. `backup.career_catalogue_before` and the five `backup.golive_20261018_*` safety copies are dropped on 2026-11-01. Pointers only:
  `career_awards` and `career_recognition` are in `BACKUP_TABLES`, the snapshot and `coach_erase_person()` (rollout step 2, in the phase 3 commit);
  **no trigger runs `career_evaluate()` on a DELETE**; the evaluate budget is asserted by `rehearse_catalogue.mjs`; a badge's tiers are append-only
  (`career/tiers.lock.json`); the phones' reward copies are held to `scripts/career/reward_cases.json` by `check_twins.js` §10.
  **Stage 73 is live** (`supabase/stage73_career_main_lifts.sql`; its way back is `scripts/career/rollback_stage73.sql`, never `rollback_stage71.sql`, and before `rollback_stage72.sql` if that is ever run; The Upgrade and Double Up count main lifts only, D18, Amir's word: a main lift is a Spine entry on one of the seven main patterns with the strength tag, minus the four accessories he named (`patterns`, `qualities` and `exclude` in the toml; a face pull, a reverse fly, a back extension and a straight-arm pulldown are out; a lift in pounds or plates counts in its own measure), and the list fails closed on a missing id, so the four ids must keep a row in the Spine for as long as the rule stands: one deleted or given a new id, or a typo in the toml's list, switches both rewards off for everyone, with a warning in the database log, until it is put right, and one taken back to draft does not (check them after any edit of those entries, `PROCEDURES.md` → *Stage 73* → *To apply*, step 0);
  Century and Home's Sessions with Amir count paid sessions, D19, in; a no to D19 comes out alone, `PROCEDURES.md` → *Stage 73* → *If D19 is a no*).
  ⚠️ **A change of rules applies forward only: D20 (Amir, 2026-10-18), BUILT and live since 2026-10-19** (`supabase/stage76_career_forward_only.sql`; `PROCEDURES.md` → *Stage 76*). An award keeps the XP it was minted with (D12 reversed); a fact is priced by the rulebook version in force on its day; a change of XP, a cap or the catalogue is a NEW `rulebook.toml` version with `starts_on` = the seed day, and its new rewards are dated from that day; the same version seeded again may change only names and captions; the habits, the level curve, the season, the week and how a fact is worked out cannot change by seed at all (the seed refuses: that is a bug fix, and Amir decides backwards or forwards).
  **Step 1 of it, Courtside (coach.html → Today: the week's moments with the WhatsApp line written, the month's honours, the monthly goal and "From Amir"; no XP), is LIVE: `supabase/stage75_career_courtside.sql`, applied 2026-10-19** (its 5 tables are in `BACKUP_TABLES`; `PROCEDURES.md` → *Stage 75*; the later steps are stages 76 to 82).
  **The new achievements are LIVE (2026-10-19)**: `supabase/stage79_career_achievements.sql` with rulebook version 5 (`PROCEDURES.md` → *Stage 79*): 13 new
  achievements (35 in all; Smooth Operator and Showed Up Anyway left out, GAME-5), three tests the server decides (`total`, `best_run`, `month_held`; checker
  rule 18), back-paid quietly (51 awards, 7,050 XP, nobody down). `career_rewards_batch()` reads `backup.career_catalogue_before` only while it exists.
  A Library achievement mints at the app's next `get_profile()` (the Library trigger evaluates nothing). **Four Courts** (Achievements on Progress, a kind in the sheet,
  the finish-card nudge) is built in program.html (`PROGRAM-APP.md` → *Achievements, Four Courts*); its read `get_achievements()` is stage80, applied only on Amir's word.
  **Step 4, the cut, is LIVE (2026-10-19)**: `supabase/stage78_career_cut.sql` with rulebook version 4 (`PROCEDURES.md` → *Stage 78*). Only the four marks
  remain as badges, every achievement stays, no title, Grand Slam, skin or rank name is on the server (ranks stay only in `rulebook.toml` `[level]`, which
  D20 locks); each paying badge award that left is an `award_kept` fact with its XP on its day (`"proof": true` for AA Proof's, which `career_compare()` reads).
  The Upgrade left with it: Double Up alone carries the main-lift rule. A removed badge id never comes back (`tiers.lock.json` `"_removed"`, checker rule 21).
  **Step 3, the light screens, is LIVE (2026-10-19)**: the athlete's own read of Courtside is `supabase/stage77_career_my_moments.sql` (applied); program.html shows the level with no rank, Your numbers and Your moments on Progress, New from Amir and one Career row on Home (`PROGRAM-APP.md` → *Career, the lightest version*); AA Proof's career screens are off (`HABITS.md` → *Career screens off*). The four marks the app names are `careerMarks()`, held to `career/badges.toml` by `check_career.py` rule 23. Share cards get their own design pass later (Amir: *"the cards are very important part of this app, because we want to use it to advertise our brand"*).
  **The lightest version, decided 2026-10-20, steps 1 to 4 live (the cut 2026-10-19) and the 13 new achievements (stage79, rulebook version 5, 2026-10-19); Four Courts built (its read is stage80); next Crew with the Bell (stage81) and the Monthly Open (stage82)** (`career/CAREER_MODE.md` → *Round 5*, decisions L1 to L11): one app for coached athletes (AA Performance, tabs Home · Progress · Library · Crew · Coach); athletes see a level with no rank, the four numbers, moments (the four numbers' marks and the achievements), a simple monthly goal, the crew (the Monthly Open, honours, the Bell) and Amir (Courtside); badges, ranks, titles, the Grand Slam, the level road and card skins are removed, **from the server too** (Amir's word), once no app reads them. D20 comes first; until the cut ships, the live system is exactly as built above.
- `FARSI-PRODUCTS.md` — the paid course app (`/tennis/app/`), the testing app's page and the Farsi
  product pages: how they are built, deployed and introduced.
- `PROGRAM-APP.md` — the athlete app's programme features in full (rx, week notes, the Spine, the Quality
  Map, Because, the set log, Personal Records, body weight): read it before changing `program.html`.
- `Content/CONTENT-PARITY.md` — **one topic, every platform** (Amir, 2026-10-02): which topic lives on the TPS course
  (Farsi lessons in `tps_content`, English twins in `course_en`), the blog (`/fa` and `/en` articles) and the Playbook,
  what is missing where, the known science problems, and the rule for every port: **research and confirm the logic and
  science first** (an agent per topic, sources with PMID/DOI), adapt for the audience, Farsi read by Amir, publish to
  every surface, update the ledger. If a lesson exists on one platform it must exist on the others; a changed fact is
  changed everywhere. Read it before adding or changing any lesson or article.
- `Content/FRESH-EYES.md` — the app audit (2026-09-24): what has shipped, what is next and in what order,
  the open calls, and how to continue it. Read it before picking up an audit item (`REL-01`, `CARD-01` …).
- `Content/SITE-AUDIT.md` — the **website** audit (2026-10-02): 25 numbered packages (fix now / his call /
  foundations), the baseline scoreboard, the open questions and how to continue. **Read it before changing any
  public page's design or copy.** It is generated from `scripts/site_audit/backlog.py` (edit that, then run
  `python scripts/site_audit/build_report.py`); the measuring tools, `shot.js` for checking a defect in a real
  viewport and the lessons are in `scripts/site_audit/README.md`; the seven page reviews are in `Content/site-audit/`.
  **Public pages have a style guard** (2026-10-02): `scripts/check_site_style.py` (pre-commit guard 13) stops a commit that adds
  yellow, text under 12 px, a pale grey, letter-spaced Farsi, a Google font link or white text on the plain clay; it is a ratchet on
  `scripts/site_style_baseline.json` and `/* style-ok */` marks an exception. **`coach.html` is under it too since 2026-10-11** (no text under 12 px; its two coloured warning signs and its Google Fonts link are the baseline). The English fonts are our own files (`assets/css/fonts.css`,
  made by `scripts/site_audit/fetch_fonts.py`); the fill under white text is `--accent-2-fill` / `--clay-fill` (#C2512C), never #C7552F.
- `.claude/COACHING-PRINCIPLES.md` — Amir's codified coaching philosophy. **It opens with the RULE INDEX**
  (2026-09-26): one numbered line per rule (`VOL-8`, `SEL-4` …), the stage that applies it and whether
  the checker enforces it; the bullets below it are the stories. **The index line is the rule**:
  where this file, a skill or SCHEMA restates one, the index wins, and new text cites the ID instead of
  restating (PRC-23). `scripts/check_rule_index.py` (pre-commit) keeps the index, its stories, the
  checker and every cited ID in agreement. Every stage reads the whole index and only its own story
  sections (design's seven are listed in its STEP 0, since 2026-10-17). The dates, Amir's words and each rule's origin are in
  `COACHING-PRINCIPLES-HISTORY.md` (2026-09-27), which no stage reads.
- **`scripts/check_program.py`** — the house rules as a script (2026-09-25). `/program-assemble` runs it on every built programme before any review: the volume count (both log tables and the day loads, counted from each exercise's Spine credits since 2026-09-26), floors, set cap, the 8-rep rule for a new athlete and for a first cycle back after 3+ weeks off (VOL-11, `reentry:`), bans, RPE floors in every note, session length (with last cycle's real-to-model ratio), the Spine gate, every card's name against the Spine, retest flags, block order, the Quality Map, and the publish fingerprint. Every FAIL and WARN it prints names its rule ID. A new athlete then gets ONE reviewer; a returning athlete none unless Amir asks (PRC-4).
- **`.claude/skills/PIPELINE-RUN.md`** — HOW a programme run is carried out (PRC-29, 2026-10-17): the main conversation
  talks to Amir and writes the database, each heavy stage runs as a fresh helper at its own effort, and the Supabase
  connector's timeouts are read back, never resent blind. `python scripts/session_cost.py --latest` measures a run.
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
coach.html and `checkTyped()` in each login function apply the same rule, so change both). **The stored
first password is cleared by the database as soon as the person signs in with it** (stage51, 2026-10-11, a
trigger on `auth.users.last_sign_in_at`; Mark sent clears it too): it exists only to be copied into the
WhatsApp message. Sign-in
folds Persian and Arabic-Indic digits to 0-9 (`foldDigits()` in program.html, habits.html and the two
tennis apps, the same fold as `typedPassword()`): the username always, the password only on a retry
after the typed one fails (2026-10-10; a Farsi keyboard failed every sign-in before). The
Course and Testing app logins (coach.html → Buyers) work the same way. `demo` is named explicitly as
public inside `get_program()` so the marketing link still opens.

**The coaching pipeline writes to the server.** It may still produce a local
`data/<id>.json` as a working artifact, but that file is never published as a file: a new cycle
goes up in ONE call to **`public.publish_cycle()`** (`supabase/stage38_publish_cycle.sql`, 2026-09-26:
archive, cycle advance, workouts, notes, roadmap patch and the coaching-log splice, all or nothing,
returning the fingerprint); a NEW athlete's first programme goes up the same way (`p_new_cycle => false`). The dashboard has no
upload button: **↑ Publish programme file** was removed with its function on 2026-10-11 (Amir: *"i never use it"*).
Execute is revoked from anon and authenticated. Day-to-day changes (sets, reps, RPE,
tempo, rest, the coach's note) are made in the dashboard's inline editor, which writes
straight to `programs` and keeps the previous version in `program_versions`.

**✅ Every programme write ends the same way** (Amir, 2026-09-24): `/program-assemble`, `/program-edit`
and `/workout` are not finished until (1) Spine upkeep has run (`/spine` → Upkeep: a full entry for
every exercise, `exId` on every card, links both ways, body parts and the count filled, and the
body-map `muscles` on any entry whose count is `{}` (stage42); CUE-4),
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
session logs and every progress blob exist in exactly one place. coach.html → ⚙ Tools →
**⤓ Backup** downloads the whole database as one JSON file; do it weekly and keep a copy
off the machine. **Keep only the last 12 weekly files** (`aa-backup-<date>.json`), on this PC
and on the off-machine copy, and delete older ones (Amir, 2026-10-04: "rolling"). The privacy
notice (section 4, line 6 of its short version, and `privacy-fa.html`) promises that a deleted
record leaves the backups within about three months, so a backup kept longer makes it false.
`python scripts/prune_backups.py <folder>` lists what is older (add `--delete` to remove it).
A backup that could not read a table is saved as `aa-backup-INCOMPLETE-<date>.json` (and says `complete: false`
inside): it is NOT a restore point, it does not silence the weekly reminder, and the prune script never counts it
as the newest backup (`scripts/test_prune_backups.py`).
**A table added to the public schema goes into `BACKUP_TABLES` in coach.html the same day**
(`select tablename from pg_tables where schemaname = 'public'`; on 2026-10-05 13 of 35 were missing,
among them the course lessons and the exercise library, which exist nowhere else). A table the coach
cannot read must be fixed in the database first: with RLS and only a member policy it backs up as
silently EMPTY, with no SELECT grant it is listed under "Could NOT read". The testing app's `assess_players`,
`assess_notes` and `assess_results` were that case until stage50 (2026-10-11, Amir's yes): the coach now has a
READ-ONLY policy on each and they are in the backup (`hab_season_results` was fixed in stage46). `buyer_notes` (stage53, the private note
about each buyer) and `erasure_log` (stage54, the receipts of full erasures) are in it too. **Coaching logs keep every earlier text** in `coaching_log_versions` (stage47, 2026-10-10): a
splice or upload that goes wrong can be put back with SQL.
**There is a way back, and it is rehearsed** (audit TOOLS-4, Amir "yes, build and rehearse it", 2026-10-11): `scripts/restore/README.md` is the whole
procedure (a new project, `supabase/schema_snapshot.sql`, `restore_backup.py`, the logins re-created from the dashboard, then the rows that wait for a login).
Rules that keep it true: **(1) the snapshot is the live structure, made again in the same commit as any `supabase/stage*.sql` applied to the project**
(three commands in the README, *Keeping the snapshot current*; pre-commit guard 17 warns when a stage file is staged without it), and `scripts/restore/rehearse.mjs`
is run after (PGlite in a scratch folder: `npm install @electric-sql/pglite --prefix "$TEMP/pglite"`, never in the repo); **(2) a restore is always given the NEWEST
backup as `--receipts`**, or a person erased since comes back (`coach_erase_person()` leaves the receipt, `erasure_log`); **(3) a table that holds a person's data goes
into `BACKUP_TABLES`, the snapshot and the erase function's list the same day** (`scripts/test_restore_backup.py` fails when the first two disagree; a table that hangs
off a login must also be taught to `REMAP` in `restore_backup.py`, which refuses otherwise). Not yet done: one dry run on a real, throwaway Supabase project.

## The athlete app (`program.html`) — read `PROGRAM-APP.md` before changing it

The full account of the programme app's features (the `rx` prescription, week notes, The Card
Remembers, the Spine, the Quality Map, Because, the countersigned set log, Personal Records, body weight)
is in **`PROGRAM-APP.md`** (moved 2026-09-26 to keep this file small). The data shapes are in
`SCHEMA.md` and the coaching rules in the principles' rule index. What must never break:

- **Things that exist more than once: change every copy, or the coach and the athlete see different
  numbers and nothing errors** (`scripts/check_twins.js` runs the dashboard/app pairs it can; `check_rx.js`,
  `check_setlog.js` and `check_parity.py` cover the rest). `rxOf()`/`repCount()`/`tempoDisplay()` (program.html + `assets/js/chips.js`,
  guarded by `scripts/check_rx.js`) · the Quality mix and its minutes rule (`qualityMix()` / `qualityDayC()`, the weekly `qualityCheckC()`,
  `/program-design`, `check_program.py`; the 70% gate and 12% cut are one day card's) · the Spine resolver (`spineFor()` / `spineForC()`) · the exercise-name rule (`normExName()` / `exNameVariants()`,
  `normExNameC()`, and the checker's `norm_name()` and `NORM_SQL` / `LOOSE_SQL`: `scripts/name_cases.json` holds the shared cases;
  `check_twins.js` and `test_check_program.py` read it) · the body-part
  region and impact lists (four copies) · the muscle list of the Spine's volume credits (SIX copies since the
  muscle map: `spine_credits_ok()`, coach.html, `check_program.py`, `draft_sql.py`, program.html `MAP_MUSCLE` and
  the body drawing's groups; see PROGRAM-APP.md *The muscle map*) · a weight's unit, kg / lb / plates written in the weight's own text
  (`weightOf()` / `parseLoggedKg()`, `wUnitOf()` / `loadSummary()` in coach.html, `career_kg()` in the database, stage71; PROGRAM-APP.md
  *The unit button*; `scripts/check_setlog.js`, `node scripts/career/rehearse_units.mjs`) · the set-log line grammar (`buildSessionData()`, `parseSetLine()`,
  `parseSetText()`) · the records rename matcher (`matchRenamed()` / `ceilAliasMapC()`) · how a session's set ends (`carrySet()`, called at
  Done, by the midnight sweep, the cloud copy and a rename; Done keeps the day's own copy, `<id>_donelog_d<N>`, and a reader of a
  set log or a round rating passes its day, `loadSetLog(name, total, day)` / `rpeOn(day, key)`: PROGRAM-APP.md → *A session closes at Done*) · whether a session is over (`sessionIsStale()`, 6 h grace past
  midnight; DATA-02) · the live quest run and its last day (`runEndKey()` / `activeQuestRun()` in habits.html, `questRunEnd()` / `activeQuestRun()` in coach.html) and the date it is filed under (`sessionDateFor()`, the local day it was finished) · the Supabase client's retry on an expired token (`fetchRetryExpired()`, FOUR copies: program.html, habits.html and the two tennis apps; a phone with a wrong clock sends a token the server has expired and the app used to say "Plan not available"; `scripts/test_fetch_retry.js`, pre-commit guard 18; `PROGRAM-APP.md` → *No signal*).
- **A cycle's `startDate` and `endDate` are CALENDAR days, read in whole days** (pile C, 2026-10-11): `cycleDayNo()` / `todayDayNo()` (never `new Date('2026-10-06')`,
  which is the evening of the 5th west of Greenwich: the app said "Cycle complete" a day early in the Americas). `cycleWeekInfo()`, `weekWindow()` and `inRetestWindow()` use them;
  `check_twins.js` runs the week twin in eight time zones, across clock changes, and `scripts/headless/cycle-tz.js` runs Home in nine. A new date comparison does the same.
- **`rxOf()` returns a VIEW** (strings, the dose as `dose: {kind, value, side, label}`), not the `rx` object:
  test app code against real `rxOf()` output.
- **A prescription is `rx`**; legacy `chips[]` is read, never written; **the app never invents a rest** (the pipeline writes one on every working exercise and circuit, CHP-7); reps are
  one number; a grip is the `intent` pill; no `setup` line. The tempo cell has had four shapes: do not
  re-litigate it.
- **A week note belongs to ONE week** (Amir, 2026-10-11): `cycles[n].weekNotes` is keyed by week number (week 1, a testing or lighter week, the back-off; `first` / `last` are the old names for week 1 and the final week) and the app shows a note only in its own week, never before the cycle starts or after it ends; the app never invents a back-off.
  **It shows on Home only, as the This Week section itself** (Front Page, Amir 2026-10-12; never at the top of a session): the
  athlete's first name, the text's first sentence as the headline with its numbers in clay, then Amir's signature and photo. So
  the pipeline writes the rule as the first sentence, under 100 characters, with no greeting, name or sign-off (COM-16).
  **In a session its numbers sit on the session bar** (`weekLimitsHTML()`, Amir 2026-10-12): a thin last row, *Max RPE 7 · 1 set
  fewer*, never the words, never on the clock's line, and the same row in Guided (under its top bar and on the rest screen); on a day with a test-flagged lift in the closing week it says *except the retest* (TST-4; not on a lower day). An untitled note
  on the cycle's final week is the *Back-off week* (`weekNoteLast()`).
  **Every RPE logged that week is coloured against them, every day** (Amir 2026-10-12: *"colour against the cap in those weeks"*;
  `rpeTargetOn()`, `paintWeekTargets()`), check-in or not, trained as written or not. The card keeps its printed RPE, *RPE 8 → 7 today*
  still means a lower day only, and that retest keeps its own card on a normal day. **A number in a week note covers every lift**: a limit on only
  some lifts is words with no `rpeCap` / `rpeDrop` (PRC-15; `check_program.py` warns).
- **The Spine**: only approved entries reach a phone, and **a card that names its entry (`exId`) shows that entry or nothing** (a draft's card has
  no cues or video until approved: `spineFor()` / `spineForC()`, TWIN-1); cues and **videos** live on the entry (a video is added
  in coach.html → Exercises; `exercise_library.json` and its Notion sync were retired 2026-09-26);
  **one name per exercise, the Spine's** (Amir, 2026-10-09): every card in the Library and in programmes carries
  its entry's exact name, Claude adds NO aliases (coach.html keeps the field for Amir's own use), a different version
  (equipment, setup) is its own entry and a name with no equipment word means bodyweight;
  a rename in a live programme must move the athlete's logged history with it (`/spine` → *One name in live
  programmes*); rungs are gone for good; the Library is one screen with a three-way switch (Sessions,
  Playbook, Exercises; no doors page since 2026-10-13) and **no Qualities door**.
- **Seven pieces, seven jobs** (CUE-7; the Exercise Card Blueprint, Amir 2026-10-11: *"all recommended, go ahead"*; CUE-6, CUE-7,
  `Content/exercise-card/`): the entry's **steps** (`exercises.steps`, stage64: How to do it, for anyone, enough with no
  video) and its **three cues** (key point, feel or check, the one fault written fault-then-fix), the card's **pill**
  (`intent`, a closed list: SCHEMA.md → *`intent`: the pill list*, three copies kept equal by `check_parity.py`) and the
  card's **Coach's Note** (this athlete only, COM-14); in the ⓘ, the entry's purpose and On court line and the card's Because, each its own job. **An entry's steps and cues, once written, are never rewritten**. **The Spine's cues win on every card**: a legacy card's own cues
  show only when no approved entry with cues resolves. Claude never writes steps, cues or purpose on an APPROVED entry:
  they wait in `exercise_coach.suggested_changes`, coach.html pre-fills the editor and **Amir's Save is the approval**.
- **A delete is a tombstone** (Personal Records `{del: true}`, body weight `kg: null` with a fresh `t`), and every
  records write rebuilds from `loadCeilingRaw()`, or a device that missed the delete brings it back.
- **No estimate on the working card** (Fresh Eyes, Amir 2026-09-26: "Off the card, keep in Records"): nothing on
  the card suggests a weight mid-set. Records → "+ Log a max" (`paintCeilingForm()`) is the one hand-entry door.
- **The working card** (Fresh Eyes, Amir 2026-09-27; `PROGRAM-APP.md` → *The working card*): a closed card shows
  **no history** (*"no history on the exercise card when not opened"*); its numbers are one line and a pill that says
  something stays a pill (the green `intent` pill, the check-in's pills); the ⓘ sits at the right end, clay for a
  Because, a clay dot after the name is a Coach's Note, and the exercise's number sits inside the tick-all ring (Centre Court,
  Amir 2026-10-12: the day's look is ONE CSS block, `PROGRAM-APP.md` → *Centre Court*). **No Last time box on the open card either** (Amir,
  2026-10-12: *"their last time, is actually already in the reps, weight box"*): last time's weight is each empty kg
  box's LAST, a set that ran over keeps its faint line, the whole history is the ⓘ's **Your history**, and only a
  circuit keeps its strip. The kg box follows the Spine's equipment (`kgWanted()`): hidden, never removed.
- **The ⓘ's About sheet is Changeover** (Amir, 2026-10-12: *"lets go with A"*; `PROGRAM-APP.md` → *The About sheet*): a
  green top with Amir's reason signed as the week note signs (`WN_SIG` and his photo), then one question per band. Its look
  is `.ax-sheet`, which `sheetWrap()` takes off before any other page draws into the shared frame. **No WhatsApp door and
  no impact on it**: impact is drawn nowhere in the athlete app (the entry keeps it for the app's rules and the coach).
- **Personal Records fill themselves** (2026-09-26): a finished session's best set goes on when it beats every
  earlier number for the lift, marked `auto` and written with `t: 0` so anything the athlete does to that day wins.
  New bests only: every screen leads with the latest entry. "The Ceiling" is retired from the screens.
  **A record is kept per measure** (kg, lb or plates; 2026-10-18, Amir): an entry says `u`, its `kg` and `w` are numbers in that
  measure, never converted, and a new best is only a higher estimate in the SAME measure (the first record in a measure beats
  nothing; `ceilingSeries()`, `ceilingPrevBest()`, `fillRecords()`; wins, share cards and the server's facts follow:
  PROGRAM-APP.md *The unit button*). **Isolation lifts file no automatic record** except one-handed cable exercises
  (`recordsItself()`, `oneHandedCable()`).
- **Weight boxes open empty** (2026-09-26): last time's weight is `lw` on the set, shown under a LAST caption,
  and `w` is only ever today's. A tick on an empty box records no weight; a weight typed in a set fills the
  empty sets below. **No Same as last on the card** (Amir, 2026-09-27: *"its a duplicate of what can be seen in
  history"*); Guided's rest screen keeps its own.
- **The check-in sets today's targets, never the programme** (REC-2, 2026-09-26): the level is worked out once
  at the check-in and stored with it (`level`, `sore`, `drop`, `asWritten`); `paintToday()` only paints. The
  target rule exists twice, `rpeTargetOn()` here (`dayRpe()` is its lower-day wrapper, which draws the pill) and
  `dayTargetC()` in coach.html, both with the week note and the drop optional: change both (`check_twins.js` §4).
- **Body weight lives in `program.html`** under the key `<id>_hab_wt`; AA Proof must never write it, and it
  is never scored.
- **Caches never sync**: `<id>_histcache`, `spinecache`, `qualcache`, `<id>_holdcache` (Hold Serve), `<id>_careercache` and `<id>_earn_d<N>`
  (Career Mode's profile and what a finished day earned), and **`plancache`**, the one saved plan
  that opens both apps with no signal (REL-01, 2026-09-26): written only from a real server answer (never the
  demo, the coach preview or Proof's strip), deleted when it answers no. **Since 2026-10-13 program.html opens
  from it FIRST on every launch** (Line Call decision 2, `PLAN_OFFLINE.fast`) and checks the server behind the first
  paint: a changed plan is *Your plan was updated · Refresh* (never swapped mid-session), a "no" closes the app unless
  a session is under way. habits.html still opens it only when the server cannot be reached. `habits.html` keeps
  the same key, so change both. Boot reaches deeper code with no network wait now: anything it reads must exist
  before the main script finishes (`await null` on the fast path). Details: `PROGRAM-APP.md` → *No signal*.
- **An RPE off its target is coloured** clay (over) or steel blue (under), the one exception to "clay is the
  only accent", through `rpeVs()`/`rpeMark()` on every screen. A live set's target is `rpeTargetOf(card)`: a lower
  day's, else the week note's (every day of its week), else the card's. Last time, History and the ghost line judge a
  past set against the card as written. coach.html judges each session against its own week (`compareDay()`).
- **There is no in-app chat, and Amir answers ONLY on WhatsApp (2026-09-26: *"Im only gonna reply to
  them when they send me a message on whatsapp"*).** The app's job is to get athletes there fast, with
  context: the Coach tab, the end of every session (the note comes along) and, mid-session, **Ask Amir** under ⋯ (the open exercise
  named, `askAmirUrl()`, 2026-10-13, Amir's decision 5) open WhatsApp pre-filled
  (the About sheet's door went on 2026-10-12, Amir's call) (`coachWhatsAppUrl(about)`, `COACH_WHATSAPP` = the site's buy-button
  number). coach.html only marks session notes read. The `messages` table stays on the server and
  nothing reads it. Do not bring a chat back unasked. Details in `PROGRAM-APP.md`.
- **Home leads with the week** (Amir 2026-10-12, Quiet Frame #6; HOME-02 before it; `PROGRAM-APP.md` → *Home and Progress
  in the Centre Court look*): the greeting, This Week (the week note in its week), **Next up** (the suggested day,
  `suggestedDayId()`: since 2026-10-13 the day AFTER the last one trained, so short weeks rotate through every day; as the day's
  cover with one green button: Open Day N, or Resume and its clock), the other days as
  paper rows (`.dc-row`, `data-dl`, the P24 numeral, solid green when done), then **Hold Serve** (Career Mode's training weeks held
  in a row, 2026-10-17: display only, read from the athlete's own `career_facts`, never `get_profile()`; `holdCount()` is a twin of
  `get_profile()`'s loop; it says nothing when it cannot be sure; `PROGRAM-APP.md` → *Hold Serve on Home*), then the habits row. Once
  Career Mode's XP switch is on, a **Career** row takes Hold Serve's place and carries its line (round 5, 2026-10-19: the career level
  with **no rank name**, this week's Hold Serve line, the nearest mark, the bar to the next level), from `get_profile()` (kept in
  `<id>_careercache`), a tap to **Your numbers on Progress**; above it **New from Amir** while his newest line is unread; once AA Proof's
  strip is on screen it is the habits (chips) and the habits row goes. The finish card says what a session earns and the marks it moves,
  the finished card what it earned (`PROGRAM-APP.md` → *Career, the lightest version*); the habits row then never shows a level. Only Next up carries
  `data-dc`. **The This cycle card, Personal records and Body weight live on Progress**, not Home. **Home never names a rest
  day**: athletes move their days. **The day after the cycle's end date Home is between cycles** (PROG-02, Amir 2026-10-10,
  option B): a **Cycle N complete** door row first (it opens Progress, where the card says Cycle complete), Up next shows
  the next cycle, the one ask is **"Ready for Cycle N? Message Amir to start it."** in all situations (never "Amir is
  building it"; its WhatsApp says *(finished <cycle> on Oct 3)*, never the week, since 2026-10-13), one row offers the day trained
  least this cycle (`btPickHTML()`, refilled by `paintWeek()` when the history arrives), the day rows fold under Repeat a session, and the Game Plan marks the cycle Done (`cycleOver()`,
  `PROGRAM-APP.md` → *When the cycle is over*).
  Under the habits row, **today's habits, ticked in place**: AA Proof itself, embedded (`habits.html?embed=1`, `mountProofStrip()`).
  program.html still holds no habit state and writes no `<id>_hab_*` key but body weight; Proof does every write.
- **Back closes the top layer** (NAV-01, 2026-09-26): one guard history entry while anything is open over
  Home's overview, and `topLayer()` decides what Back closes by reading the page, top of the z-order first.
  A new overlay, sheet or screen goes into `topLayer()` (and `initBackNav()`'s observer if a class shows it),
  or Back closes whatever sits under it. **One close grammar** (2026-09-27): ← top left for a screen, ✕ top right
  for a full-screen overlay, a sheet slides down (`initSheetSwipe()`, its handle, a tap above it) and has ONE sticky top row
  (‹ Back left when a page is behind, Close right: `paintSheetBack()`, 2026-10-13); `aaToast()`'s box sits above the sheets (z 215).
  `history.scrollRestoration` is `manual`: the layer's own button places the page, never the browser.
- **The app has ONE colour set, declared once, on `body` and `body[data-dark]`, never on `:root`** (Amir, 2026-10-12:
  "go ahead with the shared colours"; the block *THE APP'S ONE COLOUR SET* at the top of the sheet). It is Centre Court's
  (`--paper`, `--sand`, `--row`, `--hair`, `--box`, `--ink`, `--grey`, `--fill`, `--clay`, `--hero`…); the older names
  (`--grey-bg`, `--grey-card`, `--white`, `--yellow`, `--ice`…) are aliases of it. A custom property holding `var()` resolves
  where it is declared and dark mode is an attribute on `body`, so a token on `:root` would never turn dark. A new colour
  joins that block, light and dark, and nowhere else: no screen keeps its own copy.
- **Green or clay TEXT reads `--green-ink` / `--clay-ink`, never the fill tokens** (A11Y-01, 2026-09-26). Small clay text is
  `--clay-ink` (#B5461F in light, 5.1:1; the brand #C7552F is only 4.1:1), clay text 18.66 px bold or larger is
  `--clay-big` (#C7552F), clay on the green is `--clay-on-green`; in dark mode clay text is #E06B43 and green text #6DBE95.
  `--fill` / `--yellow` (green) and `--clay` / `--ice` stay for fills and borders.
- **Anything that deletes takes two taps** (LOG-02, 2026-09-26): `armedTap(btn, label, run)` arms on the first
  tap (the label says what the next tap does) and acts on a second within 4 s. Reset session, the session bar's Reset,
  Finish early, a weight reading and a Personal Record go through it. A new delete button uses it.
- **A win is effort-matched, and never claimed beyond what the sets show** (PROG-01, Amir 2026-09-27: "celebrate wins
  for every one, when they lift heavier with same rpe"; `PROGRAM-APP.md` → *This cycle*). The Home card compares each
  lift's first session of the cycle with its best since and names the plainest true win (heavier at the same reps and
  RPE, more reps at the same weight, the same set at a lower RPE); only when two things moved at once is it "about X%
  stronger", from the effort-adjusted index, as a percentage only. Holds log no seconds, so a hold's win is an easier RPE.
- **Highlight Reel: a share card for each win** (Amir, 2026-10-17: *"go with your picks"* on https://claude.ai/artifact/SuyYRPeX9n2SdbiUvoHhkF;
  `PROGRAM-APP.md` → *Highlight Reel*). `assets/js/sharecard.js` draws the cards on the phone (the training's five, and Career Mode's five reward
  cards for Career Mode phase 3, GAME-14); program.html decides which win and which numbers from the app's own rules (`winText()`'s `shape` and `share`, the
  records, the retest comparison). A card never claims beyond the sets (PROG-01: the set as lifted, never the estimate, no RPE-only win), never
  shows body weight, a check-in answer or pain, and nothing leaves the phone until Share or Save image. **Every Farsi word on a card is in
  sharecard.js's `FA` table, a draft for Amir.** sharecard.js is in sw.js's SHELL, served cache-first by its plain URL: a change to what it draws
  ships with a CACHE bump (a comment alone does not need one), and `node scripts/headless/sharecard.js` runs after it (every card, both sizes,
  both languages, text inside its box). Farsi cards: Shamsi dates, the athlete's name in English letters, "Career Mode" in English (Amir, 2026-10-17).
- **Mid-session the tab bar hides** (WK-03, Amir 2026-09-27, option C; `PROGRAM-APP.md` → *The session bar*): from
  Start until Done the session bar is one slim line (← Home · clock · Pause · ⋯; under ⋯ Pause, Guided, Reset and, once a
  set is logged and the day is not ready, **Finish early**, two taps, `finishEarlyStep()` shared with the finish card's
  button, laid out 2 × 2 so nothing moves while a label is armed; 2026-10-13; under them one full-width **Ask Amir** row,
  `.session-timer-ask`) and
  `body.session-on` hides the tabs; ← Home or Back is the way out and the clock keeps running. A new session-bar
  control goes on that line or under ⋯, measured at 320–390 px: the clock is never cut. The week's limits are the bar's one
  extra row, under it.
- **Signing out never loses training** (NAV-02, 2026-09-27; `PROGRAM-APP.md` → *Your account*): the initials
  button (top right of every tab screen, in the page: it scrolls away with the screen since 2026-10-12, so it never sits
  over content) → Sign out runs `signOutSafely()`: the waiting report, the
  session queue and the progress go up first, then nothing more is pushed, then `signOutAthlete()`. The athlete's
  keys stay on the phone. Never offered in the demo or the coach preview. AA Proof's Settings has the same.
- **The signed-out login screen is the one screen Amir never sees, so test it** (2026-10-11: for hours every button on it did
  nothing and an athlete could not sign in). With no session `boot()` reaches `showSignIn()` synchronously, while the script is still
  being evaluated, so anything `showSignIn()` reads must be a function, a `window.*` value set in the head, or a `const` declared
  ABOVE `boot()` (`COACH_WHATSAPP` was below it and sat in its temporal dead zone). The form is painted by an inline script, so a
  throw looks like a working screen. Run `node scripts/headless/signin.js` after any change near sign-in; it taps every button on program.html and habits.html, with the Supabase library loading, never loading, failing once and arriving late (`_sbForSignIn()` is the sign-in's door to it; the copy in each app moves together).
  Sign-in also signs out EVERY device of that athlete (supabase-js `signOut()` is global), and the first sign-in clears the stored
  first password: never test a login as an athlete unless you mean both.
- **One finish, one email** (WK-04, 2026-09-27; `PROGRAM-APP.md` → *One finish*): rate, then **Done** finishes the
  day, saves the record and sends the report once. The report waits in `<id>_outbox` (one entry per session: the day
  and its finish stamp) until it goes, and **never syncs**, or another phone sends it again. A second email only when
  the rating or note changed after the first went. Done needs the rating.
- **⚠️ No finished session is ever lost on the way to the server** (2026-10-12; Amir: *"i dont want any info or log to be lost"*;
  10 sessions of 4 athletes reached his inbox and never reached the dashboard, put back from the emails that day). The record goes
  into the session queue `<id>_csq` BEFORE `save_session` is called and leaves it only on the server's answer (`recordSessionToCloud()`,
  one entry per session: day and date); the queue drains at every open, foreground, `online` and after a report, and **never syncs**.
  **A day left unfinished is filed by itself** at the next open (`fileUnfinished()`: no Send it, no Clear it). The phone's synced
  `<id>_finished` list lets coach.html's `syncGapsOf()` name a missing session without the email. Never go back to "queue on error";
  a new way a session ends goes through `recordSessionToCloud()`. `node scripts/headless/session-queue.js` (21 checks); CODEBASE.md has the story.
  Amir wants the email reports gone in the future: `syncGapsOf()` already works without them; switch them off only on his word.
- **The in-app guide (`APP_GUIDE`, *How the app works* in the sheet: `openHelp()` from your initials, the Coach tab's row,
  "How hard?", "tempo" and Guided's ?; COACH-02) and the first-session hints (`ONB_TEXT`,
  ONB-01) name real controls.** Rename a button, move a control or change when a card appears, and change its guide
  card and hint in the same PR (CNT-01, 2026-09-26: it had said "Send Data to Coach" and "tap the timer icon" for
  weeks). The Library's "ticks your habit" line reads AA Proof's config through `_wsHabitOn()`, read only.
- **Dark mode is the athlete's choice** (Amir, 2026-09-27: *"Let the client choose dark mode"*): both apps start
  light and switch only on the athlete's tap; neither follows the phone's setting.
- **Clay means "look here"** (DS-01, Amir 2026-09-27; `PROGRAM-APP.md` → *Clay means look here*): the Coach's note,
  a Because, an RPE over target, the tempo digit, a banner that asks for something, the one number on a dark Home card, the numbers in a week note's headline and on the session bar's limits row, the fault cue's bar in How to do it.
  Block titles, stripes and done tints, the running bar, labels and buttons are green or grey.
- **The Library offers a session at two moments only** (LIB-01, Amir 2026-09-27; `PROGRAM-APP.md` → *The Library's
  Sessions*): a sore check-in (soreness 1 or 2, on the finished card) and a finished week (Home, under This Week), never
  a rest day. The picks are `LIB_PICKS`, one line each; a line goes once its session has been opened (`<id>_libseen`,
  never synced). Every ✓ in the Library asks `libTickLabel()`. The Sessions shelves are a list: a photo band, three
  rows, **All N ›** for the rest.
- **No yellow, gold, ochre or amber in either app**, AA Proof's metals included (its gold tier became
  emerald on 2026-09-26; Amir, asked whether Proof was an exception: *"fix"*).
- **The exercise card is not frozen** (Amir, 2026-09-27: *"dont freeze anything"*, lifting Five Forks fork 4 B).
  Athletes still change to the new card format at their next cycle; the demo is already on it. The tab that holds the whole plan is **Progress**, second in the bar (Amir, 2026-10-12: Home · Progress · Library · Coach; it was Game Plan, and My Plan before that; `data-tab="plan"` and `goTo('plan')` are unchanged). On it: the This cycle card, **Your numbers** (Personal records and Body weight, whose ← comes back here), then the road of cycles, still titled **Game Plan** (since 2026-10-13 one paper row per cycle, Done / Now / Up next / Locked, under the This cycle cover; nothing on Progress jumps Home). Only the current cycle opens expanded;
  past and future cycles are folded (Amir, 2026-09-26, PLAN-01), and the welcome's button opens Day 1.

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
- **Career Mode (once the server's XP switch is on; `HABITS.md` → *Career Mode*):** the overall level, rank and XP are
  `get_profile()`'s (`careerOn()`, kept in `<id>_hab_career`, never in CFG), the phone's scorer counts the whole career with the
  WORKOUT habit at 0 a day (`scoreDays()`, `paidXp()`) and is only the preview of a tick (P13), the first open shows ONE reveal
  (`CFG.careerSeen`, kept through the cloud merge) and never a flood of level-ups, and a new season resets only the board's points.
  Before the XP switch (on since 2026-10-18) none of this changed a number. `?go=pass` opens Progress (the career screens are off since 2026-10-19: `HABITS.md` → *Career screens off*).
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
- **Ending a quest run keeps the XP already earned** (Amir, 2026-10-11): the dashboard's button is `end_quests(start, today)`, which keeps
  the run with an `end` day; both scorers read it (`hab_bonus_xp()`'s `qruns` CTE and `runEndKey()` in `habits.html`; pre-commit guard
  16 and `scripts/test_spine_sql.sh` run the same cases). `clear_quests()` removes a run and takes its XP back, so it is the SQL editor
  only, on purpose; the page never falls back to it.
- **Roll call pays no XP** and no scorer reads `hab_notes`. The client shows 7 days and the server
  keeps 9, on purpose.
- **Back closes the top layer here too** (NAV-01): `topLayer()` reads `UI`, `render()` ends with `navSync()`.
  **Never in the embed**: the iframe's history is the training app's, so it would steal that app's Back.
- **Embedded (`?embed=1`, on the training app's Home) Proof only logs today** through its own doors;
  `checkLevelUps()`, the reward baseline, the tour, the install offer and the board sweep all stand down there,
  so every level-up and reward still gets its takeover in the full app (`HABITS.md` → *Embedded…*).
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

## The coach dashboard (`coach.html`) — read `COACH_DASHBOARD.md` before changing it

Audited 2026-10-10 (`Content/COACH-AUDIT.md`: findings, what changed, what is open; **its §12 is the list to continue from**). What must never break:
- **A programme write from coach.html is never the page's copy written whole.** The ✎ editor reads the live
  row, refuses when `updated_at` moved since the page loaded or the exercise is not at that place any more
  (checked by name), applies the edit to the live copy and writes it `.eq('updated_at', <read>)`. **So does a restore, and so does Undo**
  (FLOW-11, 2026-10-11: the one-tap bar after a save writes the pre-save copy back only against the stamp that save left). Anything
  that replaces `S.programs` goes through `reloadPrograms()` (it re-assembles, so the athlete file redraws).
- **A Spine or Quality save sends only the columns the coach changed.** An exercise entry is one call,
  `coach_save_spine()` (stage48): both tables in one transaction, the rows locked, nothing written to either
  half when someone else changed one of THOSE columns since the page read it (Claude's `/spine` writes the
  same rows by SQL). The ten qualities are one table: `saveChangedCols()`, `.eq('updated_at', <read>)`. Never
  `upsert` a whole entry from the page's copy. A rename of an entry live cards use is refused in coach.html:
  it is `/spine`'s one-name move. Every change to the three Spine tables is kept in `spine_versions`
  (stage49, a trigger); an entry's History panel undoes a change through the same guarded save AND the same identity
  rules Save applies (`spineIdentityProblem()`: a name or alias another entry owns, a rename of an entry live cards use,
  a link to an entry that is gone are refused).
  `sh scripts/test_spine_sql.sh` tests both stage files on a throwaway local Postgres, before they go near the project.
- **"Needs you" is one rule, `reasonsOf()`**: Today, the roster's reasons, its group, filter and sort all
  read it. A new reason goes there, nowhere else, and into COACH_DASHBOARD.md §3's table.
- **A value inside an inline handler goes through `jsq()`**, never `'${esc(x)}'` (esc is HTML escaping; the
  browser decodes it back before the JS runs, so a quote in a signup email ran as code).
- **A growing table is read with `selectAll()`** (paged in key order past PostgREST's 1000 rows), and a read
  that may fail records it in `LOAD_ERR`, so the banner names it instead of showing an empty table.
- **A write that must change a row asks for it back** (`.select()`) and treats zero rows as failure
  (`writeFailed()`): a lapsed session sends writes as anonymous and RLS turns them into silent no-ops.
- **Auth events rebuild the page only when the signed-in user changes** (token refreshes and tab refocus
  used to reload everything and throw away typed work).
- **A person is erased by one call, `coach_erase_person()`** (stage54, 2026-10-11; Amir: "both athletes and buyers"), never table by
  table from the page: the inline Erase panel asks for a dry run first (the function does the whole erasure and undoes it, so the
  list shown is what a real run deletes), a real run needs the athlete id or the buyer's username typed, and after the deletes it
  checks every table in the public and backup schemas with an `athlete_id` column, and every public `uuid` column called `user_id` or
  `account_id`, and undoes everything if one still holds a row. **A table you add that holds a person's data goes into its table list
  the day you create it** (`supabase/stage54_erase_person.sql`), and into `BACKUP_TABLES`; the one-off rollback copies the pipeline
  makes live in the `backup` schema and are emptied for the person automatically. Intake forms are the coach's pick (matches by email,
  WhatsApp number or name are offered, and one you linked to the athlete under Leads → Applications (stage61) comes first; a linked or same-email one is ticked for you; a finder lists any other, at most 10; a linked form left unticked keeps its answers and loses only the link). An affiliate partner record stays when its athlete
  is erased (only the link is cleared). The private note about a buyer lives in `buyer_notes`, coach-only; the account rows' `label`
  stays empty (a trigger moves anything written there). Tables are emptied in `publish_cycle()`'s lock order (programme first).
- **A finished session is hidden, never deleted, from the dashboard** (stage60, 2026-10-11; Amir: "hide it, keep it recoverable"): `session_history.hidden_at`,
  one coach-only `coach_hide_session()` for both directions, an Undo bar, and **Hidden sessions** (Restore, Delete for good) in the athlete's File. The phone's
  `save_session()` never un-hides one, the coach's does. `get_my_history()`, `get_workout_days()`, the dashboard (`S.hist` leaves them out, `S.histHidden` keeps
  them for the File, `syncGapsOf()` counts them as present) and every pipeline query that reads sessions (`and hidden_at is null`) leave them out: **a new reader
  of `session_history` filters on `hidden_at`**, or a hidden session comes back in its numbers.
- **The work tab is the current cycle's** (2026-10-12): with a dated cycle a day card holds only sessions on or after its `startDate`;
  older ones are under **Earlier cycles** (`workTabHtml()`, `earlierCyclesHtml()`). **There is no "Add past session from email"** (Amir:
  "i will never do that manually"); `parseSessionEmail()` stays only as the tested reader that `scripts/restore/sessions_from_email.js` uses.
- **A paused or former athlete is nobody's chase** (stage63, 2026-10-11; Amir: "active, paused, former"): `athlete_status` (coach only, in the backup, emptied by an erasure) holds only
  those two; `reasonsOf()` returns only a note they sent and a session that did not sync for them; a former athlete and the demo and your own identity are in no roster
  total (`inTotals()`). The tools (Backup, Add coaching logs, Create missing logins, Logins to send) sit behind one ⚙ Tools button in the top bar (moved from the roster, Amir 2026-10-12). A new table with an `athlete_id` column goes into `coach_erase_person()`'s list the day you create it (stage63 did it by patching the live function).
- **A contact record with `source 'coach'` is a WhatsApp number the coach typed, not a signup** (stage62, 2026-10-11): `isSignup()` keeps it out of the Proof signup
  funnel, the "new signup" reason, `lastSeen` and the Proof tab. A new place that reads `S.contacts` or `a.contact` as "this person signed up" must use it.
- **The weekly call log is retired** (Amir, 2026-10-11): no Calls tab, no new call logs, no Copy cycle prompt; old logs are read and
  deleted in the athlete's File. **A session with no duration or RPE is left out of the load ratio and the ratio is not shown while any
  exist in the last 4 weeks** ("not enough data"), never counted as zero.
- **Run the harness after any change to a data or write path:** `node scripts/headless/coach/run.js`
  (121 scenarios, made-up data, stubbed Supabase; README there). The compare tests stay in pre-commit.
- **The UX pass (2026-10-12; Amir's answers in memory `coach-redesign-2026-10-12`)**, round 1 shipped: Today puts Needs you first and wide,
  each row's button names what it does, and **"Also waiting"** (applications, logins to send, backup, older notes) is NOT a reason, so it never
  touches `reasonsOf()` or the people count. The roster is one aligned table (Athlete · Cycle · Last session · Proof · Why); the athlete header
  carries the cycle line and the reasons as links; the File is four groups with the **Danger zone folded**, and **Forget lives there** (not on the
  Proof funnel). A shortened explanation keeps its full text in that group's "How this works" fold. **Round 2 shipped:** seven places in
  one bar (Today · Athletes · Exercises · Proof · **Leads** · Library · **Buyers**; `#intake`, `#affiliates`, `#assess`, `#course` are rewritten to
  their new homes by `fixLegacyHash()`, keep them working); Leads = Applications (`intakeViewHtml()`, a list and the chosen one) · Free signups
  (`funnelPanelHtml()`) · Referral codes; Buyers = Course · Testing app; Exercises = Entries (the editor beside the list) · Qualities · Coverage;
  Proof is the crew's home (wall, quest lever, pulse, board) and Today keeps a short Proof column; body weight is on The work. **Round 3:** destroying
  something asks in an inline panel under its button (`dangerAsk()`: Delete training history, Forget, End the quest run, the two record deletes),
  and anything to read or copy once is a `notice()` line beside `fail()`'s (there is **no `alert()`** in coach.html; keep it that way); Library
  rows with one Copy link; chart axes; a folded pill picker; a phone bottom bar below 600 px only; one hint line per panel with the rest in
  How this works. **The look** (shipped last): five font sizes (12/14/17/22/30), three radii (8/12/999), Barlow Condensed only for the brand
  and an athlete's name, Space Mono only for numbers that line up, plum only for the middle warning, one fold, two pick-one controls; the
  `design-rules` scenario fails a change that breaks them (COACH_DASHBOARD.md §2, "The look").
- **A rule the dashboard copies from the athlete app goes into `scripts/check_twins.js` the same day**
  (2026-10-10, pre-commit guard 15): it runs both copies on the same vectors and fails a commit that changes one.
  After editing `assets/js/chips.js`, bump its `?v=` in coach.html, then `node scripts/check_twins.js --stamp`.
- supabase-js is pinned (2.117.3): program.html and habits.html load our own copy, `/assets/js/supabase-2.117.3.js` (precached by sw.js;
  a floating `@2` from jsDelivr until 2026-10-13), coach.html the same version from jsDelivr. Bump all three together, a NEW file name,
  only with the harness's `reallib.js` and `scripts/headless/signin.js` run.
- **The coach's address is typed once per layer** (stage57, 2026-10-11): `public.is_coach()` in the database (every policy and
  function asks it; a new one never types the address; `coach_erase_person()` also names it, to protect the coach's own login),
  `COACH_EMAIL` in coach.html, once in each of the three login Edge Functions. **Public sign-up must stay off** (Supabase →
  Authentication → Sign In / Providers → User Signups): the coach check trusts the email in the sign-in alone. Read it back with
  `curl -s https://bvipfipbdcyqnbczjmaq.supabase.co/auth/v1/settings -H "apikey: <the publishable key>"` → `"disable_signup": true`.
  Every live database function has its `CREATE FUNCTION` in `supabase/` (the eight that did not are in `stage56_functions_record.sql`).

## Site layout (GitHub Pages → amirardekani.com)
- **English is the default**: `/` = `index.html`. **Farsi** = `/index-fa.html`. `index-en.html` is a
  permanent redirect to `/`. Language toggles + `hreflang`/canonical are set accordingly.
- **Mehraneh Zohourian's coach site is NOT in this repo or folder** (2026-10-02): it is a separate project, repo
  `amirardekanian-crypto/mehraneh-site`, local folder `GitHub/mehraneh-site` (a sibling of `Website`), live at
  `mehranehzohourian.com`. Its own `MAP.md` and `CLAUDE.md` are there. Nothing of hers lives here any more; the old
  `/coach-site/` address no longer exists.
- Shared **nav/footer** are injected by `assets/js/shared.js` from `partials/nav.html` + `partials/footer.html`.
  CSS lives in `assets/css/` (`tokens.css` → `base.css` → `components.css`); page-specific styles are inline.
- Green hero + green nav are **homepage-only**, scoped via `body.is-home`. The nav logo mark is global.
- **`sw.js` (scope `/`) sits in front of the WHOLE origin, not just program.html** (since v7, 2026-09-13;
  the cache is `aap-v158` on 2026-10-13). It must keep leaving `/reach/` (the Iran reachability probe),
  `/tennis/` (the paid course, whose app at `/tennis/app/` ships its own worker and `tps-shell-*`
  caches) and `/tennis-testing/` untouched. Otherwise the probe reports a cached pass
  and the course gets stale files pinned. Its `activate` deletes **only `aap-*` caches**: Cache
  Storage is shared by the origin, and the old `k !== CACHE` filter would have wiped any other
  app's offline copy on every bump.
- **The Farsi products are in `FARSI-PRODUCTS.md`** (moved 2026-09-26): the paid course app
  `/tennis/app/`, its product page `/tennis/`, the testing app's page `/tennis-testing/`, and where they
  are introduced on the Farsi site. What must never break:
  - **This repo is the permanent home of the course app** (Amir, 2026-10-02): edit `tennis/app/` here, and after any
    edit run `python scripts/stamp_tps_app.py` (pre-commit blocks a stale stamp; the app's worker answers from its cache
    first). The private `tps-content` repo is retired: it is unreachable and out of date, so **never deploy or publish
    from it**; its deploy script would erase the demo and its lesson scripts would overwrite the corrected lessons.
    The lessons live ONLY in Supabase (`tps_content`, `course_en`: edit with SQL and re-hash `version`;
    `Content/CONTENT-PARITY.md` → *How to publish each surface*), readable only by an active buyer. The testing app is the same
    (Amir, 2026-10-02): `tennis-testing/app/` is edited here, its content lives only in `assess_content`, and the private
    `assess-content` repo is retired. **Both publish secrets were revoked on 2026-10-02**
    (`supabase/tps_03_revoke_publish_keys.sql`): `tps_publish()` and `assess_publish()` can no longer be called by anyone
    without the service role, so content changes are SQL through the Supabase MCP.
  - The demo's lock is server-side (`tps_demo()`): never "lock" anything in `app.js` alone.
  - **The course's exercises are fed from the Spine** (stage65, 2026-10-12; Amir: "fed from spine", one live source). Each course exercise in `tps_content` names its entry (`spine`); the entry's `steps_fa`, `cues_fa`, `purpose_fa` and `tennis_fa`, and its video, reach the course live through `get_exercises_fa()` (kept on the phone as `tps.spinefa` for offline) and replace the course's own copies; the Spine's one fault replaces the old list of common mistakes (CUE-7). **A change to an entry's English steps, cues, purpose or On court line changes its Farsi in the same run.** The course's own `easier`, `harder`, `equipment`, `noEquipment` and `u16` stay in the course. A new course exercise needs a Spine entry with its Farsi before it ships.
  - The course app's tour finds real controls by CSS selector: move a control or rename a class and it
    lies, silently, on a new buyer's first screen.
  - A new lesson or test needs its cover in `ART` by id, and a regraded picture needs `ART_V` raised.
  - The product pages share `assets/css/fa-product.css` (bump its `?v=` after any change) and
    `assets/js/fa-nav.js`. The English site deliberately does not mention the Farsi products.
- **Videos play from `www.youtube.com/embed` in BOTH apps, never `youtube-nocookie.com`** (2026-09-23; Iranian
  athletes could not watch the course videos). The nocookie player hits YouTube's sign-in wall in Iran, and many VPN apps
  there route only the `youtube.com` names. Both apps read watch, `youtu.be`, `shorts/`, `embed/` and `live/` links, give a
  Shorts link a tall 9:16 box, and play every video inside the app.
  **Every player also has an "Open in YouTube" bar under it** (Amir, 2026-10-05: *"C and red"*, after athletes in Iran said
  the embed would not play in the app while their YouTube app or browser did): a plain `https://www.youtube.com/watch?v=`
  link (a Short keeps `/shorts/`), `target="_blank"`, so the phone picks the YouTube app or the browser. In the course app it
  reads «باز کردن در یوتیوب». It is drawn only for a YouTube address, and it sits OUTSIDE the box the iframe fills (`.ex-vunit`
  + `.ex-yt`, `.vunit` + `.vyt`, `.video-modal-yt`): the iframe covers anything inside that box the moment the embed loads,
  which is exactly when it fails. The mark is YouTube's own red so it never reads as the green ▶. There is **no mark on the
  circuit rows** (beside the ▶ it pushed a superset's row 6 to 36 px past its card at 360 to 390 px); a warm-up item's pop-up
  carries the bar instead, and a working circuit's item plays in its own How to do it line (Centre Court round 2), the card's player with the bar under it. The earlier "open in the YouTube app" link (2026-09-23) was tried and removed the same day; this one
  is Amir's later call. `privacy.html` §2.7 stays true (nothing leaves until the athlete taps). Guards: `scripts/headless/youtube.js`
  (program.html, shared.js) and `youtube-course.js` (the course app).
  The three parsers must agree: `ytId()` in `tennis/app/app.js`, `ytVideoId()` in `program.html`, the modal in
  `assets/js/shared.js`. (Since 2026-09-26 the site modal in `shared.js` matches: the same link shapes, a tall
  9:16 box for a Short, and only a YouTube address embeds; any other link opens as a link.) The watch address is built from the same
  id in each: `ytWatchUrl()`, `ytWatch()` and the modal's `open()`: change all three. The course app's copy: `FARSI-PRODUCTS.md`.
- **The website chatbot** (2026-10-17; Amir: both sites, WhatsApp + Apply handoff, chats kept 90 days, Haiku): the bubble is `assets/js/site-chat.js` (`data-site="en"` on `index.html`, `"fa"` on `index-fa.html`, `/tennis/`, `/tennis-testing/`; bump its `?v=` on every page after a change), the brain is the Edge Function `site-chat`, and **what it knows is ONLY `Content/CHATBOT-FACTS.md`** (sections `[both]`, `[en]`, `[fa]`; the Iran products are `[both]` since Amir's 2026-10-17 call, *"some iranians may ask things in english"*, but the English bot raises them only when asked or when the visitor says they live in Iran). A price, tier or product fact that changes on a page changes in that file the same day, then `python scripts/build_chat_facts.py` and a redeploy of `site-chat` (pre-commit guard 21 checks the first two agree). How it behaves (no diagnosis, no programmes, no invented price, the handoff tags) is `RULES` in its `index.ts`. Chats are anonymous (`visitor` is a daily-rotating hash, no IP) and deleted after 90 days; Amir reads them in coach.html → Leads → Chats, where questions the facts could not answer are listed first under **Not answered yet** (stage68, the bot's `[[gap]]` tag). **Teaching it anything new is `/chat-facts`** (`.claude/skills/chat-facts/SKILL.md`: the gaps query, where a fact goes, rebuild, redeploy both files, test with `scripts/chat_ask.py`, delete the `/test` chats, mark handled). Privacy: `privacy.html#chat` (2.11) and `privacy-fa.html#chat`.
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
  the app for every athlete. The build refuses such a file, and since 2026-10-10 so does coach.html
  (a `.fa.json` name, `lang: "fa"`, `sourceHash` or `translationOf`), which also matches an article's
  category by its title ("Pre-Competition") as well as its id.
- **Every article passes the SEO gate** (Amir, 2026-10-02: *"whenever you write a blog on the website, consider
  the SOP, so every time someone searches something my website shows better on Google"*): `/article` Step 0.5 =
  `.claude/SEO-SOP.md` → *The SEO gate*. One Farsi search phrase per article, chosen first and checked against the
  **phrase log** (SOP §10, add a row with every article), the phrase in title/seoTitle/description/first paragraph/a
  heading, nothing named in the title that the body does not cover, and the Instagram caption written to SOP §5.
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
- **Ship it live, straight to `main`** (Amir, 2026-09-26). He iterates on the live site: commit and
  push `main` by itself, one push at a time (Pages deploys it; see *Verifying the live site*). A
  session that has to work on a branch (a cloud session) merges its PR the same day. Don't stop at
  "pushed to a branch".
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
pictures with `/image`, clips with `/video`, his own talking-head footage with `/cut` (start at `.claude/skills/cut/kit/HANDOFF.md`; no captions, he adds them), and read the skill before starting. The full notes that
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
- **A polished animated ad with no footage of him is built on the timeline kit** (2026-10-02, reel 9, Mehraneh's website ad, which he called "amazing";
  `.claude/skills/reel/timeline/README.md`, `/reel` Step 2d, `/ad` Route C). **The reading rule** (Amir on its first 17 s cut: *"the changes are too fast, there is no time to be able to read"*):
  a block of text is fully visible for `0.8 s + 0.25 s per word` and not under the ball; `read_audit.js` must say 0 too fast before any render, and a long reel is fixed by
  making it longer, never by speeding up or cutting content (*"do not remove the content, just make it longer"*). A **client's** reel wears the client's brand, not Amir's.
- Handle in new work: **@amirardekanian** · site AMIRARDEKANI.COM.

## Verifying the live site (important gotchas)
- **Python on Amir's PC is `python`**: `python3` there is the Microsoft Store stub and runs nothing
  (2026-09-27). A cloud session has `python3`; the `python3` commands below are for one.
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
