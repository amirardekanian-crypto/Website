# Working notes — Amir Ardekani's site & coaching system

Durable context for working in this repo. Read the linked docs before diving in.

## Who / what this is
- **Amir Ardekani** — online **strength & conditioning coach** (MSc S&C + MSc Applied
  Exercise Physiology; 1000+ tennis & padel players). Sells premium individualised
  programmes (USD tiers: $70/1mo · $180/3mo · $300/6mo — see `Content/PRODUCT.md`)
  delivered through a private web app (`program.html`, a PWA), backed by Supabase.
- **The free habit tracker is the top of the funnel.** `habits.html` ("Proof") is offered
  free to non-clients via `proof.html` (Instagram bio link, deliberately not in the nav).
  They give a name, email and WhatsApp; Amir runs **`/proof-signup`** and they are live in
  under two minutes. Free and coached athletes share **one board**. See *Free tier* below.
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
- `HABITS.md` — **the habit app (`habits.html`, "Proof") brief.** Start here for anything
  habit-tracker related: the three tabs, the eight habits, how progression works, the
  leaderboard, and how it links both ways with `program.html`.
- `XP_SYSTEM.md` — every tunable in the XP/level/rank system and what changes when you move it.
- `FARSI-PRODUCTS.md` — the paid course app (`/tennis/app/`), the testing app's page and the Farsi
  product pages: how they are built, deployed and introduced.
- `PROGRAM-APP.md` — the athlete app's programme features in full (rx, week notes, the Spine, the Quality
  Map, Because, the set log, The Ceiling, body weight): read it before changing `program.html`.
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
Remembers, the Spine, the Quality Map, Because, the countersigned set log, The Ceiling, body weight)
is in **`PROGRAM-APP.md`** (moved 2026-09-26 to keep this file small). The data shapes are in
`SCHEMA.md` and the coaching rules in the principles' rule index. What must never break:

- **Things that exist more than once: change every copy, or the coach and the athlete see different
  numbers and nothing errors.** `rxOf()`/`repCount()`/`tempoDisplay()` (program.html + `assets/js/chips.js`,
  guarded by `scripts/check_rx.js`) · the Quality mix and its minutes rule (`qualityMix()`, `qualityCheckC()`,
  `/program-design`, `check_program.py`) · the Spine resolver (`spineFor()` / `spineForC()`) · the body-part
  region and impact lists (four copies) · the muscle list of the Spine's volume credits (four copies:
  `spine_credits_ok()`, coach.html, `check_program.py`, `draft_sql.py`) · the set-log line grammar (`buildSessionData()`, `parseSetLine()`,
  `parseSetText()`) · the Ceiling rename matcher (`matchRenamed()` / `ceilAliasMapC()`) and its two write
  doors (`paintCeilingForm()` mirrors `paintFromFields()`).
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
- **A delete is a tombstone** (The Ceiling `{del: true}`, body weight `kg: null` with a fresh `t`), and every
  Ceiling write rebuilds from `loadCeilingRaw()`, or a device that missed the delete brings it back.
- **Body weight lives in `program.html`** under the key `<id>_hab_wt`; AA Proof must never write it, and it
  is never scored.
- **Caches never sync**: `<id>_histcache`, `spinecache`, `qualcache`.
- **An RPE off its target is coloured** clay (over) or steel blue (under), the one exception to "clay is the
  only accent", through `rpeVs()`/`rpeMark()` on every screen.
- **There is no in-app chat (2026-09-26, Amir: *"whatsapp first"*).** The Coach tab opens WhatsApp
  (`COACH_WHATSAPP`, the number the site's buy buttons use) and coach.html answers a session note on
  WhatsApp. The `messages` table stays on the server and nothing reads it. Do not bring a chat back
  unasked: two channels means one goes unwatched. Details in `PROGRAM-APP.md`.
- **Home leads with the training** (This Week, then the day cards), then the Daily Habits card.
- **No yellow, gold, ochre or amber in either app**, AA Proof's metals included (its gold tier became
  emerald on 2026-09-26; Amir, asked whether Proof was an exception: *"fix"*).

## Working on the habit app (`habits.html`) — keep four things in sync
Whenever you change how Proof behaves, update **all** of these in the same PR, or the
next chat will be working from a lie:
1. **`HABITS.md`** — the brief (what it is, what each tab does).
2. **`XP_SYSTEM.md`** — if you touched XP, levels, ranks, consistency or pacing.
3. **The in-app manual** — `renderManual()` in `habits.html`, which athletes open from
   the initials button (top-right) → *The manual*. Its **numbers** read from the live
   constants and update
   themselves; its **prose** does not — fix that by hand when behaviour changes.
4. **`privacy.html`** — if you changed what data is stored or shared.
5. **`tourSteps()`** — the 15-step guided tour points a clay box at real controls and
   says out loud what each one does. Move a button, rename a tab or change what a tap
   does and the tour is actively lying, on the first screen a new athlete sees.

**The tour is the first run.** *Start tracking* on the onboarding screen goes straight
into it; it is replayable for ever from **Settings → The tour**
and from the manual's **Start here** section, and `CFG.toured` defaults to false for
existing athletes so they get the offer once too. ⚠️ Two of its steps now open and close
a **Settings sub-screen** in their `before` hook (the habit roster moved behind *Habits &
targets*) — see the Settings section of `HABITS.md`. It lives in its own `<div id="tour">`
**outside `#app`** — `render()` morphs `#app` against the template and would delete it —
and its dimmer is four mask panes with a **real hole**, not a transparent lid, so a step
marked `act` can be completed by actually doing the thing. Full detail in `HABITS.md`.

**Navigation is four tabs: `TODAY · PROGRESS · CREW · LOCKER`** (Amir's own redesign,
2026-07-29, promoted the reward track from a row inside Progress to its own tab). Settings
is still **not** a tab — it lives behind the athlete's initials at the top-right of the
header, and that same button becomes the way out of Settings and the manual.
**Settings is a list of doors now** (Amir, 2026-08-01): a profile card and three grouped
cards, with the habit roster and the appearance switches behind their own sub-screens
(`UI.sub`). Every overlay screen carries a **back chevron on the left of the header** —
`overlayBack()` goes exactly one step, while the `✕` on the right still leaves the whole
overlay in one tap. Full account in `HABITS.md`.

**The five screens Amir picked out are PANELS** (2026-08-01, from reference screens he
sent): Today opens on a **hero card** that carries the level, the streak tile and a
seven-day report inside one card; the roll-call composer is an inverted dark card and
every line on the wall is its own card with **achievement chips** under it; the
leaderboard is a framed panel of row-cards with medals for the top three; and counted
habits (water, protein, steps, sleep) draw a **segmented meter — one pip per `step`** —
rather than a straight bar. The palette, type and tokens are unchanged (the MEADOW skin);
this is layout only. ⚠️ Two of those carry a real data limit: **your own** streak and
days-on-target are computed from the log on this device, and nobody else's are, because
neither `roll_call()` nor `leaderboard_top()` returns them. The client reads `r.streak`
first and falls back to the local calculation, so teaching either RPC to return one is
all it would take — see `HABITS.md`. Do not fill the gap by inventing a number.
**CREW holds the entire social layer**: the roll-call composer, the wall, the leaderboard
and joining/renaming. It opens on Roll Call, with the leaderboard as the second view.
Today keeps a one-line *pointer* to Crew (not a second composer) that disappears once the
athlete has written. **LOCKER is the reward track** (`PASS_TRACK` — see *The long game*
below): the shareable rank card up top, titles and card skins as horizontal rails, then
**the road** — the rank ladder and the 14 rewards merged into one scroll (2026-07-30: the
standalone ladder screen is gone; tapping the rank *or the level ring* on Today's hero
opens Locker directly now — Progress dropped its own level/rank strip the same day, so
the rank lives in exactly one place outside the Locker itself).

**Ranks, titles and medals wear metal now** — `METALS` (bronze → silver → emerald →
amethyst → prismatic) is a shared visual language (the third tier was **gold until
2026-09-26**; Amir: *"fix"*, when asked whether Proof was an exception to "no yellow or
gold, ever". It is not, and nothing in Proof may be yellow or gold again): `rankCrest()` draws the tier-shaped,
metal-rimmed badge next to a rank name (ladder, hero, share card all call the same
function so a rank never looks different in two places); `titlePlate()` renders an owned
title as a metal nameplate, rarity tied to the level it unlocks at (bronze under 13,
silver 13+, emerald 21+) with **event titles and PROOF ITSELF prismatic** regardless of
level; `achMedal()`/`evMedal()` render a badge/event's own emoji in a tinted disc behind
a metal rim (dashed and greyed while unearned). All of it is presentation over the same
underlying data — `RANKS`, `PASS_TRACK`, `ACHIEVEMENTS`, `EVENTS` — nothing here changes
what is earned or when, only how it is drawn.

**The app is called `AA Proof` everywhere on the site — not just once installed** (Amir,
2026-07-27: "all over my website this is called AA Proof"). Use "AA Proof" in page titles,
headings, body copy and docs; bare "Proof" is only correct as short-form inside a sentence
that has already named it in full ("...Proof tracks the part nobody watches" reads fine
right after an "AA Proof" heading). The name lives in three places that must move together
for the PWA install identity specifically: `manifest.name`, `manifest.short_name` and the
`apple-mobile-web-app-title` meta (iOS labels the home-screen icon from the meta and
ignores the manifest). The offer
is a sheet fired **once, after the athlete's first log** — never on arrival — with a
permanent Settings row as the way back. iOS gets instructions, not a button:
`beforeinstallprompt` is Chromium-only.

**The long game** is the reward track (`PASS_TRACK` in `habits.html`) — 14 titles and
card looks unlocked purely by levelling, reached from Progress. **Rewards are the one
thing in this app that is stored rather than derived** (`CFG.pass.owned`) and **nothing
may ever revoke one** — not a season reset, not a retune, not switching a habit off. That
is what lets levels keep resetting each season. Everything on the track must stay **free
to mint**: the moment a reward costs Amir an hour, forty consistent athletes become forty
hours he owes. **Titles now show on the leaderboard and the roll call wall** (stage17);
cards deliberately do not, because a card is drawn on the athlete's own phone and nobody
else reads it. The server keeps its own record of what was earned (`public.hab_titles`)
and **mints rather than recomputes** — a level can fall. Season resets drop everyone to 1
by design, so any check against the *current* level would revoke titles people already own.
(It could also fall mid-season, from the roster bug stage18 fixed; that half is gone, the
season half is permanent, and either one alone justifies minting.) The track is a third
thing scored twice: `PASS_TRACK` in `habits.html` and `passTrack` on the `xp_rules` row.

**One word — `streak` — and two SCOPES.** (Amir, 2026-07-29: *"instead of Run i want to
use word Streak everywhere in my App"*.) A **habit's streak** is consecutive days on *one*
habit ("24-day streak", on its row). The **day streak** is consecutive days where the
athlete cleared `streakQualifyPct` of the day's weight ("2-day streak", in the band at the
top of Today and Progress).

⚠️ This *reverses* the earlier rule, which called the per-habit one a **run** precisely so
those two numbers could never be confused — the app had used five phrasings and a 24-day
run beside a 2-day streak read as one number arguing with itself. Amir asked for one word,
so the job of keeping them apart moved from the noun to the **label**: every place that
shows a habit's streak sits *on that habit* (its row, its detail header), and the day one
is always captioned **DAY STREAK**. Keep it that way, and do not reintroduce "run" — the
manual and the day-one note on Progress are the only places that teach the difference, and
they now teach it by scope. `bestHabitRun()` keeps its internal name; nothing shows it.

**Roll Call** (one sentence a day, visible to everyone on the board) and the **3-day
backfill window** on the log are both live — see `HABITS.md`, `XP_SYSTEM.md` §6.5 and §11.
Roll call pays **no XP** on purpose and no scoring function reads `hab_notes`; keep it
that way. Amir posts the day's coach line and moderates the wall from **`coach.html` →
Today** (composer at the top of *The wall*; Hide/Show on any line) — or in SQL with
`select public.set_coach_note('…');` and
`select public.hide_note('<athlete_id>', '<date>');`. Same two functions either way.

### ⚠️ Everything in Proof that is scored TWICE — change both or they disagree

The leaderboard scores **server-side**, the athlete's own screens score **client-side**,
and they read from two different copies of the same rules. If you change one and not the
other, the board and the athlete's phone will quietly show different numbers — the worst
class of bug in this app, because nothing errors.

The Supabase copy is **one row**: `public.xp_rules where id = 1`. It has 13 keys, and
every one of them mirrors a constant in `habits.html`:

| `xp_rules` key | `habits.html` | What breaks if they drift |
|---|---|---|
| `base`, `growth` | `XP_RULES.base/.growth` | Levels differ between board and phone |
| `completionBonus`, `customXp` | `XP_RULES` | Daily XP differs |
| `streakQualifyPct` | `XP_RULES` | The `qualify` quest and day-streaks differ |
| `unearnable` | `HABITS[].locked` | The streak **gate** differs — a rest day counts on one side only (stage19) |
| `weights` | `XP_RULES.weights` | Every habit's value differs |
| `targets` | `HABITS[].target` | What counts as "done" differs |
| `tiers` | `CONSISTENCY_TIERS` | Badge XP differs |
| `milestones` | `ACHIEVEMENTS` | Milestone XP differs |
| `quests` | `QUEST_POOL` | A quest pays on one side only |
| `passTrack` | `PASS_TRACK` | **Server refuses a title the app already gave** |
| `questRuns` | — | Server-only; set by `set_quests()` / `clear_quests()` |
| `gateV2` | the two-door rule in `dayQualifies()` | Day streaks and the `qualify` quest differ (stage22) |
| `lapseDays`, `comebackXp`, `comebackStick` | `LAPSE_DAYS`/`COMEBACK_XP`/`COMEBACK_STICK` | **The comeback pays on one side only** (stage22) |
| `maxCustom` | `MAX_CUSTOM` | A tampered log outscores the board (stage24) |

Read the live row with:
`select jsonb_object_keys(rules) from public.xp_rules where id = 1;`

**Not** on the row, deliberately: `dailyCap` (a client write-time clamp in `setVal()`, no
server equivalent — see `XP_SYSTEM.md` §1) and `seasonStart`/`seasonName` (the authority is
`public.seasons`; the `XP_RULES` values are an offline fallback only).

The scoring **logic** is also written twice — `bonusEvents()` in `habits.html` against
`hab_bonus_xp()` in plpgsql (**stage18** owns the current version; stage14 owns its
6-arg signature and everything else in it). Those two walk the
log the same way on purpose. Changing how a badge or milestone is *counted* — not just
what it pays — means editing both.

Beyond scoring, three more things live in more than one place:
- **App name** — `manifest.name`, `manifest.short_name`, `apple-mobile-web-app-title`.
- **Docs** — `HABITS.md`, `XP_SYSTEM.md`, the manual prose in `renderManual()`,
  `privacy.html`. (The manual's *numbers* read from live constants; its *prose* does not.)
- **Rewards** — owned titles are recorded on the client (`CFG.pass.owned`) **and** the
  server (`public.hab_titles`). Both are append-only; neither may ever subtract.

### CORE vs ADD-ON — five habits everyone has, and the rest opt-in

(Amir, 2026-07-30: *"lets say for example 5 habits are mandatory for everyone … then someone
tries to turn on supplements or breathing only to get additional xp and achievements. this
should be a bonus."*)

**`core: true`** on five habits — train · steps · sleep · protein · water — means always
tracked, **no off switch** (`live()` honours `core` regardless of `CFG.on`). Same five for
every athlete, so a day score finally means the same thing across the board. Everything
else is an **add-on**: opted in for the extra XP and badges, and once on it *counts*.

**Two rules in `stampRoster()`, and they answer "why did Friday change Wednesday":**
- **Adding lands TODAY.** You opted in, today is still yours to finish, and Settings says so
  before you tap.
- **Removing lands TOMORROW.** Otherwise switching a habit off at 23:00 deletes a miss you
  already made, which would make the day score worthless. `lockedOnToday()` is what lets the
  UI say *"still counts today"*.

Neither ever reaches a closed day. Proven: adding supps today leaves Wednesday at 100% and
takes today to 93%; switching it straight back off leaves today at **93%** and dates the
removal to tomorrow.

### Days are settled units — the rule, and the thing that enforces it

**A day is scored against the habits that were switched on THAT day. A closed day never
moves again.** Changing what you track changes what happens next, never what already
happened.

What enforces it is `CFG.roster` — a **timeline** of the tracked set, one entry per change,
each naming the day it took effect. `rosterOn(day)` reads the entry in force; `dayPct()`,
`isPerfect()` and the `daysWith3`/`perfectDays` counters take their denominator from it
instead of `live()`. `hab_bonus_xp()` reads the same array out of the config and its
`daylive`/`perday` CTEs join per day (stage18). **Only `stampRoster()` writes it, it is
called from `saveCfg()` so every mutation path is covered, and it only ever appends.**

Before stage18 all of those read `live()` — "habits switched on right now" — and re-judged
history against a roster from the future. It cost 500xp (the CN milestone) in both
directions: adding a habit deleted perfect days already earned, switching one off handed
back perfect days that never happened. Both are proven fixed in the stage18 header.

⚠️ **`live()` is for the present tense only** — what to draw on Today, what to nudge, what
a perfect day is worth from here. **Any function that takes a `dayKey` must use
`rosterOn(dayKey)`.** That is the whole invariant; it is one line to get wrong.

**It got that one line wrong again, 2026-07-30 — in the UI, not the scoring.** Every
scoring function already read `rosterOn(dayKey)` correctly, but `renderToday()` built the
tappable row list itself from `live()` even while backfilling a past day. The header's
`dayPct()` was right; the rows the athlete could actually see and tick were missing
whatever add-on habit had since been switched off — so ticking every visible row could
still leave the day short of 100%, with nothing on screen explaining why. Fixed by
splitting `hs` (still `live()`, for "your week": the heat map and strongest/weakest
ranking, correctly about *now* regardless of which day is open) from `rows`
(`rosterOn(AKEY())`, what actually gets rendered and logged). See `HABITS.md`'s
*backfill window* section for the full account.

**Seasons.** Scoring runs in seasons; only days from the current season's start earn XP,
for personal levels *and* the boards. Currently **Pre-Season (opened 26 July 2026)** —
Amir launches the real one on command with `select public.start_season('Season 1');` in
the Supabase SQL editor. That resets every score to zero and deletes nothing; streaks and
consistency badges survive. The server (`public.seasons`) is the authority; the app
fetches and caches it, with `XP_RULES.seasonStart` only as an offline fallback.

**Habit names are TASKS** — `🚶 Walk 10,000 steps`, not `STEPS`. Display only; the
`id` never changes, so no history moves. **`EVENTS`** are **multi-goal milestones** — three goals each, rendered as **milestone
rows** (goals on the note line, title where XP goes; the `evcard` is quests-only) in an
`A few weeks` group *inside* the Milestones section, between the week badges and the long
ones. **No dates at all**: the few weeks is how long the WORK takes, not a window you can
miss (Amir, 2026-07-30, after two wrong shapes — calendar seasons, then rotating 28-day
windows). Measured over all history, like every other badge. They pay a **title, never
XP**, to avoid a third thing scored twice — but their title ids must exist in `passTrack`
on the `xp_rules` row or the server refuses them. **Milestones
carry a `tier`** (`week`/`long`/`rare`) for grouping on Progress; nothing scores off
it. Full detail in `HABITS.md`.

**`stage24_marks_quests_customcap.sql` — applied 2026-08-02** (as `stage24a/b/c`). Three
things that all had to hit both scorers at once: `hab_xp()` gained the `maxCustom` ceiling
on unrecognised keys; `hab_bonus_xp()`'s `qruns` CTE now clips a run at the next run's
start so overlapping runs cannot double-pay a shared quest; and the twelve new milestone
rungs plus THE CENTURION's 500 → 1,200 retune landed on the `milestones` array. It also
dropped the fossil map-object still sitting at `passTrack[0]` from the stage20 incident.

**`stage25_season_record.sql` — applied 2026-08-02.** Closes the last open economy
decision. A closing season now archives every athlete's final level and XP into
`public.hab_season_results` (the Locker's **Seasons shelf**) and mints a title naming that
season to everyone who reached level 5 — unrepeatable by definition, which is the one
thing the level track cannot offer. ⚠️ It also fixes a **pre-existing security hole**:
`start_season()` — the function that resets every score — had no coach guard while being
executable by `anon`, unlike `set_quests`/`clear_quests`/`set_coach_note`/`hide_note`. It
now carries the same `auth.jwt()` guard, refuses future-dated starts (which silently froze
the archive weeks early and could never be corrected), and ships `undo_season()`. Season
titles are deliberately **not** in `passTrack` — an `lv:0` entry there is self-awardable
since stage23 — so `set_title()` grew a third branch: an unrecognised title is allowed only
if the server already minted it. The first draft of this file was rewritten after an
adversarial review found 20 defects in it, 2 critical; the traps are documented in its
header.

**Supabase stages 9–23 are applied and live** (leaderboard, workout-days feed, seasons,
bonus XP for consistency tiers + milestones, weekly quests, roll call, contacts, titles,
per-day rosters, weighted day scores, milestone tiers + event titles, weighted-gate +
comeback economy, the roll-call retention prune, the title-mint fix).

**`stage21_roll_call_retention.sql` — applied 2026-08-02.** The wall's SAVED half now
matches its SHOWN half: a statement-level trigger on `hab_notes` sweeps anything older
than `current_date - 8` on every write, so the table self-maintains with no cron. The
client still shows exactly 7 days (`ROLL_DAYS`/`rollFloor()`, local clock); the server
keeps 9 days (UTC, with two days of timezone slack) so nobody's post vanishes from the
server side of the date line before the client's own week is up. **Do not match the two
floors** — that slack is why nothing inside any athlete's real 7-day window is ever
deleted early. `select public.purge_old_notes()` is available for an on-demand sweep;
the trigger already keeps it clean without it.

⚠️ **`stage23_title_mint_fix.sql` — applied 2026-08-02.** `hab_mint_titles()` and
`set_title()` were written against `passTrack` as a plain `{title_id: level}` object
(stage17's original shape); at some point before stage22, the live `xp_rules.passTrack`
drifted into a JSONB ARRAY of `{id, lv, kind, name}` objects (mirroring `PASS_TRACK` in
`habits.html`, plus the four EVENT titles at `lv:0`) and neither function was updated to
match. `jsonb_each_text()` on an array is a hard Postgres error, called with no exception
handling from both `claim_titles()` (every app boot) and `set_title()` (equipping a
title) — so **no title minted server-side for four days** before this was found and
fixed (`select max(earned_on) from hab_titles` was 2026-07-29; 11 athletes were owed a
title at the time of the fix, all backfilled). The fix reads the array correctly and
draws a real distinction the naive fix would have missed: entries with a genuine `lv > 0`
(the level track) are minted only when `hab_season_level() >= lv`; entries at `lv: 0`
(event titles — completion is computed client-side only, with no independent server
check, same trust boundary the rest of the app already runs on) are recorded directly
when equipped. Cards are still never auto-minted server-side, unchanged from stage17.
`supabase/stage23_title_mint_fix.sql` has the full account and is safe to re-run.

**The day score is WEIGHTED, and it is two numbers.** `dayParts(day, mode)` in
`habits.html` sums `baseXp()` over `rosterOn(day)` rather than counting heads. `dayPct()`
is what the day was *worth* (whole roster — header, day strip, wall); `gatePct()` is what
the athlete could *do* (a **locked** habit they did not earn that day leaves the
denominator) and **day streaks read only that**. The gate is not a nicety: WORKOUT is
28.6% of the default day, so weighting it into the denominator makes it a *precondition* —
a rest day could never qualify and a free-tier athlete, whose WORKOUT is locked for life,
would never have a qualifying day again. `isPerfect()` stays unweighted and ungated, which
is what keeps `proof.html`'s promise true. `streakQualifyPct` moved 80 → 75 with it, and
back to **80** on 2026-08-02 (Amir: *"I think 75% is very low"*) — safe now only because
the gate has a **second door**: `dayQualifies()` also passes a day that left **at most one
thing undone**, so missing one habit still counts at 80, and 80 only tightens the day that
missed *several* things by a little each. Nobody lost XP, a title or a level to the change
(all derived-but-never-revoked; verified across all 11 athletes) — only streak counters
moved. Full detail in `XP_SYSTEM.md` §6; server half in `supabase/stage19_weighted_days.sql`.

⚠️ Changing this threshold means **both scorers plus the prose**: `XP_RULES.streakQualifyPct`
in `habits.html`, `streakQualifyPct` on the `xp_rules` row, and any quest `note` that spells
the number out (`w_qualify5` said "5 days at 75% or better" in *both* pools — it now says
"5 days on target" so the text can never name a stale bar again).

**Free tier.** `"tier": "free"` inside the `athlete` object is the *only* switch —
`isFree()` is the only test, and anything not `"free"` is coached. Free mode keeps
WORKOUT locked (with a line saying coached athletes earn it) and points every
`program.html` route at `/form.html`. **Scoring is identical and the board is shared** —
that is deliberate, and it is what makes upgrading free: flip the field, the pipeline
writes the programme into the same row, and the athlete's whole history, level and board
place carry over on the same id and login.
⚠️ **Contact details still never belong in a programme record.** Contact details live in
`public.hab_contacts` (stage16), coach-only behind RLS: `add_contact()` signs someone up
in one call, `contact_list()` shows who signed up **and how many days they have logged**
(the qualifying signal), `forget_contact()` erases them. Full walkthrough:
`.claude/skills/proof-signup/SKILL.md`.
⚠️ **REVERSED 2026-09-12 — everyone is on the leaderboard now.** This used to read
*"signing someone up must never join them to the leaderboard"*. Amir decided the opposite,
with the consequences stated: the board is shared by coached clients **and** free signups,
so every athlete's display name (first name + last initial by default), level and rank are
visible to everyone on it. He also chose to include athletes who had **previously left** —
they are indistinguishable in the data from athletes who never decided, so the sweep puts
everyone on once.

`autoJoinBoard()` in `habits.html` runs on boot, and **is gated on having finished a
workout** (Amir revised the blanket sweep the same day): it returns early unless the
locked WORKOUT habit has been ticked at least once, which only the server can do. Two
consequences, both deliberate — **an athlete who has stopped using the app never qualifies
and is left off the board rather than dragged back onto it**, and nobody lands there at
0 XP with nothing to show.

**`CFG.boardSwept` makes it a ONE-TIME sweep — do not remove that.** Re-joining on every
boot would mean an athlete could tap *Leave the board*, watch it succeed, and be back on it
next launch with no way out. **If they leave, they left.** The flag is stamped only after a
join actually succeeds, so a first boot with no signal is retried rather than marked done.

Because it is automatic, it **cannot be consent**: `privacy.html` moved the board entry to
**legitimate interests (Art. 6(1)(f))** with leaving as the objection route — the same
reasoning body weight uses. Roll Call stays consent, because nothing appears unless the
athlete writes it. `renderBoardNotice()` is the standing banner that makes the athlete
*meet* this on the day screen rather than find it in a policy document; it names the
display name others see and links to the setting.

The name typed on the signup form still goes in the programme record as
`athlete.boardName`, and is now what the athlete is auto-joined under.

**Quests are a lever Amir pulls, not a standing feature.** There are **none** unless he
starts a run, and a run lasts **7 days from its start date** (not Mon→Sun). Pull the lever
from **`coach.html` → Today → Quest week** (tick 1–4 from the pool, *Start the week*;
*Cancel this run* while one is live) — or in SQL with
`select public.set_quests('2026-07-29', array['w_water5','w_steps50k']);` and
`select public.clear_quests('2026-07-29');`. The dashboard always starts a run **from
today**; SQL is the way to back-date or future-date one. Past runs are kept
so their XP keeps counting. The 12-quest pool lives on the `xp_rules` row **and** as
`QUEST_POOL` in `habits.html` (offline fallback) — change both together.
**`QUESTS.md` is the catalogue** — what's running, the built quests, ready-made themed
weeks to copy-paste, and an idea bank. Mechanics in `XP_SYSTEM.md` §8.5.

## Site layout (GitHub Pages → amirardekani.com)
- **English is the default**: `/` = `index.html`. **Farsi** = `/index-fa.html`. `index-en.html` is a
  permanent redirect to `/`. Language toggles + `hreflang`/canonical are set accordingly.
- Shared **nav/footer** are injected by `assets/js/shared.js` from `partials/nav.html` + `partials/footer.html`.
  CSS lives in `assets/css/` (`tokens.css` → `base.css` → `components.css`); page-specific styles are inline.
- Green hero + green nav are **homepage-only**, scoped via `body.is-home`. The nav logo mark is global.
- **`sw.js` (scope `/`) sits in front of the WHOLE origin, not just program.html** (since v7, 2026-09-13;
  the cache is `aap-v29` on 2026-09-26). It must keep leaving `/reach/` (the Iran reachability probe),
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
