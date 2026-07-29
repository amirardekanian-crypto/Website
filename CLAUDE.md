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
  - **Farsi** site = broader **general-fitness** Tehran market. Voice: warm, colloquial.

## Reference docs (read these, don't re-derive)
- `MAP.md` — **start here.** The atlas: one linked index to every page, asset, skill, doc and design element.
- `CODEBASE.md` — technical map of the repo.
- `Content/PRODUCT.md` — what the product/business actually is (internal brief; pricing, voice, backend).
- `Content/HOW-IT-WORKS.md` — customer-facing explainer of the coaching process.
- `HABITS.md` — **the habit app (`habits.html`, "Proof") brief.** Start here for anything
  habit-tracker related: the three tabs, the eight habits, how progression works, the
  leaderboard, and how it links both ways with `program.html`.
- `XP_SYSTEM.md` — every tunable in the XP/level/rank system and what changes when you move it.
- `.claude/COACHING-PRINCIPLES.md` — Amir's codified coaching philosophy; `/program-*` skills read it.
- `.claude/skills/*` + `.claude/agents/athlete-brief.md` — the coaching pipeline (intake → roadmap → design → engage → assemble). `.claude/coaching-log/` is the coach-only per-athlete rationale log.

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
into it; it is replayable for ever from **Settings → How this works → Show me around**
and from the manual's **Start here** section, and `CFG.toured` defaults to false for
existing athletes so they get the offer once too. It lives in its own `<div id="tour">`
**outside `#app`** — `render()` morphs `#app` against the template and would delete it —
and its dimmer is four mask panes with a **real hole**, not a transparent lid, so a step
marked `act` can be completed by actually doing the thing. Full detail in `HABITS.md`.

**Navigation is four tabs: `TODAY · PROGRESS · CREW · LOCKER`** (Amir's own redesign,
2026-07-29, promoted the reward track from a row inside Progress to its own tab). Settings
is still **not** a tab — it lives behind the athlete's initials at the top-right of the
header, and that same button becomes the way out of Settings and the manual.
**CREW holds the entire social layer**: the roll-call composer, the wall, the leaderboard
and joining/renaming. It opens on Roll Call, with the leaderboard as the second view.
Today keeps a one-line *pointer* to Crew (not a second composer) that disappears once the
athlete has written. **LOCKER is the reward track** (`PASS_TRACK` — see *The long game*
below): the shareable rank card up top, titles and card skins as horizontal rails, then
**the road** — the rank ladder and the 14 rewards merged into one scroll (2026-07-30: the
standalone ladder screen is gone; tapping the rank *or the level ring* on Today's hero
opens Locker directly now — Progress dropped its own level/rank strip the same day, so
the rank lives in exactly one place outside the Locker itself).

**Ranks, titles and medals wear metal now** — `METALS` (bronze → silver → gold →
amethyst → prismatic) is a shared visual language: `rankCrest()` draws the tier-shaped,
metal-rimmed badge next to a rank name (ladder, hero, share card all call the same
function so a rank never looks different in two places); `titlePlate()` renders an owned
title as a metal nameplate, rarity tied to the level it unlocks at (bronze under 13,
silver 13+, gold 21+) with **event titles and PROOF ITSELF prismatic** regardless of
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
that way. Amir posts the day's coach line with
`select public.set_coach_note('…');` and moderates with
`select public.hide_note('<athlete_id>', '<date>');`.

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

**Supabase stages 9–20 are applied and live** (leaderboard, workout-days feed, seasons,
bonus XP for consistency tiers + milestones, weekly quests, roll call, contacts, titles,
per-day rosters, weighted day scores, milestone tiers + event titles).

**The day score is WEIGHTED, and it is two numbers.** `dayParts(day, mode)` in
`habits.html` sums `baseXp()` over `rosterOn(day)` rather than counting heads. `dayPct()`
is what the day was *worth* (whole roster — header, day strip, wall); `gatePct()` is what
the athlete could *do* (a **locked** habit they did not earn that day leaves the
denominator) and **day streaks read only that**. The gate is not a nicety: WORKOUT is
28.6% of the default day, so weighting it into the denominator makes it a *precondition* —
a rest day could never qualify and a free-tier athlete, whose WORKOUT is locked for life,
would never have a qualifying day again. `isPerfect()` stays unweighted and ungated, which
is what keeps `proof.html`'s promise true. `streakQualifyPct` moved 80 → **75** with it.
Full detail in `XP_SYSTEM.md` §6; server half in `supabase/stage19_weighted_days.sql`.

**Free tier.** `"tier": "free"` in `data/<id>.json` is the *only* switch — `isFree()` is
the only test, and anything not `"free"` is coached, so no existing file needs editing.
Free mode keeps WORKOUT locked (with a line saying coached athletes earn it) and points
every `program.html` route at `/form.html`. **Scoring is identical and the board is
shared** — that is deliberate, and it is what makes upgrading free: flip the field, the
pipeline writes the programme into the same file, and the athlete's whole history, level
and board place carry over on the same id, key and link.
⚠️ **`data/<id>.json` is a public static file** — anyone who guesses an id can fetch it.
**Never put an email address or phone number there.** Contact details live in
`public.hab_contacts` (stage16), coach-only behind RLS: `add_contact()` signs someone up
in one call, `contact_list()` shows who signed up **and how many days they have logged**
(the qualifying signal), `forget_contact()` erases them. Full walkthrough:
`.claude/skills/proof-signup/SKILL.md`.
**Signing someone up must never join them to the leaderboard** — they join themselves
from Crew. `privacy.html` promises that; `CFG.onBoard` is a client flag never read back
from the server, so an auto-joined athlete would appear on everyone else's board while
their own app said *"Not on the board"*; and every signup would sit on the board at 0 XP.
The name they typed on the form goes in `data/<id>.json` as `"boardName"`, which only
pre-fills the join box.

**Quests are a lever Amir pulls, not a standing feature.** There are **none** unless he
starts a run, and a run lasts **7 days from its start date** (not Mon→Sun). Start one with
`select public.set_quests('2026-07-29', array['w_water5','w_steps50k']);` and cancel with
`select public.clear_quests('2026-07-29');` in the Supabase SQL editor. Past runs are kept
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
- The Farsi site is the **aesthetic reference Amir likes**: green radial-gradient hero, white text +
  clay (`--accent-2` #C7552F) accent, logo mark (white rounded square w/ `assets/img/icon-192.png`),
  and gentle section banding (`#FAF7F2` ↔ `#F1ECE3`).

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
Standing role: Amir asks for carousels, reels, posts, result cards, web/app redesigns,
animations. **Always start at `Content/DESIGN-ATLAS.md`** — the designer's working file
(asset shelf, format recipes, current-vs-retired rulings, app-look cheat sheet, his taste),
with `Content/DESIGN_SYSTEM.md` as the brand bible. For reels specifically, use the
**`/reel` skill** (`.claude/skills/reel/SKILL.md`) — it has the full build process, the
continuous-motion technique library, known stillmode gotchas, and the MP4 export pipeline.
Newest-taste references:
`Content/carousel-warmup-tennis.html` (carousel), `Content/reel-6-system.html` (reel, EN),
`index-fa.html` (web — visual style only, see note below). Non-negotiables in one line: clay
`#C7552F` is the ONLY accent (clay-2 `#E06B43` on dark) — **no yellow/gold, ever**; green
`#0E4A36` / paper `#FAF7F2`; Barlow Condensed (display, uppercase) + Barlow (body/app-UI);
canvases 1080×1350 / 1080×1920; real assets over stock; outputs self-contained (base64);
html2canvas drops SVG `<use>` and CSS transforms — inline images, hard px. Instagram handle
in new designs = **@amirardekanian** (site: AMIRARDEKANI.COM); never retro-edit
already-shipped designs.

**Reel delivery process (Amir, 2026-07-02 — was too slow first time, fix this):** For a reel,
the deliverable is **the HTML file itself**, sent via SendUserFile so he can open/preview and
screen-record it himself. **Do NOT render an MP4 unless he explicitly asks for one** — skip
the whole Playwright/ffmpeg pipeline by default. **Do NOT send static per-beat screenshots**
as the review artifact — the interactive file *is* the review. Keep the iteration loop fast:
no multi-agent audit workflow, no video pipeline, for a routine draft/revision — save those
for when he asks to finalize/export. Design direction: he wants reels **"fully animational,
lots of moving things, being cool"** — not a slideshow of static cards with an entrance fade.
**This is a feeling, not a fixed effect list — don't lower creativity to a recipe.** He said
explicitly: keep inventing, don't reuse the same set of animations every reel. The `/reel`
skill has a toolbox (ambient drift, drawn lines, Ken Burns, typing dots, etc.) as inspiration
only — treat it as a floor to riff past, not a checklist to satisfy.

**2026-07-02 — content language directive (Amir, verbatim): "we changed everything to
english, im not creating content in farsi anymore."** Effective immediately: all NEW social
content (carousels, reels, posts, result cards) is **English**, sharp/uppercase Barlow
Condensed display per the EN site voice — not a translation of the Farsi template.
Farsi-specific rules (Vazirmatn, no letter-spacing, no uppercase, Persian numerals, RTL
mirroring) still apply only if Amir explicitly asks for Farsi again. Older Farsi social
files (`reel-1..3`, `reel-5-system`, the `carousel-*` Farsi decks) are left as shipped —
reference for mechanics only, not for language/voice.
**Scope confirmed (Amir, same day): social content only** — the live Farsi **website**
(`index-fa.html`, `form-fa.html`, `terms-fa.html`) is unaffected and stays exactly as-is
for the Tehran general-fitness audience. Don't touch those pages over this directive.

## Verifying the live site (important gotchas)
- This sandbox **cannot reach amirardekani.com** (proxy blocks the host). Confirm deploys via the
  GitHub Actions **"pages build and deployment"** run on `main` (it's `event: dynamic`), not a live fetch.
  Tell Amir to **hard-refresh** to bypass browser cache.
- For visual checks: serve with `python3 -m http.server` and screenshot with Chromium at
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. Two headless quirks: scroll-reveal hides
  below-fold content (inject `.reveal{opacity:1!important;transform:none!important}`) and the hero is
  `min-height:100vh` (shrink it, e.g. `.hero{min-height:520px!important}`, to capture lower sections).
- Stale **CSS cache** can render unsized elements huge (it once blew up the nav logo). Inline
  width/height on critical lockups as a safeguard.
