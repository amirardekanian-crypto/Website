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
- **You CAN fetch the live site — do that, it is the real proof.** (This note used to say the
  proxy blocked the host; that was wrong as of 2026-08-09.) The apex 301s to `www`, so follow
  redirects, and diff what is served against your working copy:
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
- **Do not treat a missing Actions run as a failed deploy.** The "pages build and deployment" run
  (`event: dynamic`) sometimes never appears for a commit — on 2026-08-09 a merge deployed
  correctly with no run listed for its SHA, and runs for an *earlier* SHA appeared twice. The
  Actions list is a weak signal; the live fetch above is the strong one.
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
