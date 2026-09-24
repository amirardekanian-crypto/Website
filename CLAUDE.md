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
- `.claude/COACHING-PRINCIPLES.md` — Amir's codified coaching philosophy; `/program-*` skills read it.
- `.claude/skills/*` + `.claude/agents/athlete-brief.md` — the coaching pipeline (intake → roadmap → design → engage → assemble). the coach-only per-athlete rationale log now lives in `public.coaching_logs`, read and
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
`data/<id>.json` as a working artifact, but that file is never published — it goes up via
coach.html → Athletes → **↑ Publish programme file**. Day-to-day changes (sets, reps, RPE,
tempo, rest, the coach's note) are made in the dashboard's inline editor, which writes
straight to `programs` and keeps the previous version in `program_versions`.

**Coaching logs are on the server too.** `.claude/coaching-log/*.md` were tracked in this
PUBLIC repo — world-readable, despite each opening with "Never published". They now live
in `public.coaching_logs`, coach-only, with no athlete arm at all.

**⚠️ There are NO automatic backups.** The Supabase project is on the free plan. 378
session logs and every progress blob exist in exactly one place. coach.html → Athletes →
**⤓ Backup** downloads the whole database as one JSON file; do it weekly and keep a copy
off the machine.

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

### ⚖️ Body weight lives in `program.html` now — and is still NOT scored

⚠️ **MOVED OUT OF PROOF, 2026-09-12** (Amir: *"move the bodyweight tracker page from proof to
program.html and remove it from proof"*). The whole feature — card, history screen, chart,
logging, delete — is in `program.html`; `habits.html` has no weight UI at all, and its manual
section now just says where it went. **Free-tier athletes lose it**, which Amir chose knowingly:
they have no programme app.

**The data did NOT move.** The key is still `<id>_hab_wt`, so no athlete's history had to be
migrated and `coach.html`'s `weightPanel()` needed no change. What moved is *ownership*:
`program.html`'s `_snapshot()` carries one precise exception to its skip-all-`hab_`-keys rule,
and `habits.html` no longer pushes, merges or writes it. **Both apps share this origin's
localStorage, so Proof writing that key again would silently overwrite readings taken in the
programme app** — that is why `saveWt()` is a stub and the pull-side merge is gone.
`mergeStoredValue()` in `program.html` gained the union-by-date branch that used to live in Proof.

Everything below still holds — it is simply enforced in the other file now.

### 📋 A PRESCRIPTION IS DATA NOW — `rx`, not `chips[]` (2026-09-20)

Amir: *"sometimes we have to write the time, in the reps chart … and sometimes the pills get
mixed up."* Both were symptoms of one thing: sets/reps/RPE/tempo/rest were stored as **display
strings** in `chips[]` and `parseChips()` pattern-matched them back into numbers at render time.

**The prescription is now `ex.rx`** — `sets` · one of `reps`/`time`/`distance`/`work` · `side` ·
`rpe` · `tempo` · `rest` · `rounds`. **An absent field means NOT PRESCRIBED**, and the card draws
no cell for it. Full spec: `SCHEMA.md` → "`rx` — the prescription". What that fixed, measured
before the change: **1,151 em-dashes** in the 42 free library sessions (237 of 352 exercises drew
a five-cell grid with four cells empty), **139 of 163** warm-up items across the live programmes
doing the same, and a duration filed under a cell labelled **REPS**.

**Four fields beside it, four meanings, four looks** — this is the fix for "pills get mixed up",
where one green pill stood for 121 different labels (a tempo said in words, equipment, an intent
cue, and occasionally a real dose):
`rx` → the grid · `setup` → quiet grey line (kit/position) · `intent` → **the** green pill (ONE
intention) · `note` → clay callout · `cues` → the cues list.
⚠ **THE TEMPO IS ONE CELL, with the digit that carries the instruction in CLAY.**
`TEMPO 3-1-1-0`, notation intact, and `tempoDisplay()` colours **the slowest phase when it is 2s
or more, plus any non-zero pause** — so `3-0-1-0` colours the 3, `2-1-1-0` the 2 and the 1, and
`1-0-1-0` nothing at all. `iso` reads `Hold`.
**Four shapes were tried; do not re-litigate:** a plain cell (undecoded notation — hence 153
hand-written `3s eccentric` pills), a grey line under the grid (a footnote — *"it doesnt capture
the eye and it doesnt look professional"*), phase cells on a second row (*"i dont like the new
tempo"*), and now the notation back with its point coloured (Amir: *"if a number is important in
tempo highlight it with other color"*). **The rule that survived all four: SAY IT ONCE — never
restate the tempo in `intent`, `setup` or a cue** (a cue spelling the count out burns one of only
three; still true of 39 of 506 live exercises with a tempo).

**`block.rest` states a section's rest ONCE** — on the section header (`PRIMARY ——— Rest 2m`),
feeding every timer in the block, drawing no per-card cell. An exercise's own `rx.rest` overrides
it and keeps its cell. **Circuits carry `rx` too**: `rounds` is a NUMBER now (it was the display
string `"×2 Rounds"`, which is why the cell read *Rounds: ×2 Rounds*), and an item takes its own
`rx` when its dose is plain, keeping free-text `detail` when the wording carries more than a
number (*"15 sec, switch legs each round"*).

⚠ **REST IS NEVER INVENTED.** It used to fall back to 120s for any `standard` exercise, so all 26
cards in the demo claimed "REST 2m" while every `restSec` in it was `null` — a calf raise and a
back squat shown as identical, and a Pallof press told to sit for two minutes. Omit `rest` and
there is no rest cell; the timer button stays, labelled *Rest timer*.

⚠ **`rxOf()` / `repCount()` / `tempoWords()` EXIST TWICE** — inline in `program.html` (the offline
PWA, deliberately self-contained) and in `assets/js/chips.js` (which `coach.html` loads). Drift
means the coach's dashboard and the athlete's phone show different prescriptions for the same
exercise and **nothing errors**. `scripts/check_rx.js` runs fixtures through both copies and is in
`.githooks/pre-commit`. `chips.js` also owns the write side: `applyRx()`, `toRx()`, `auditRx()`.

**Legacy `chips[]` is still READ, never written.** `rxOf()` parses it on the fly and recovers what
each number really was, so **the ~34 live programmes were deliberately NOT bulk-migrated** — they
already render correctly and better (the Supabase project has no automatic backups, and a
dual-read costs nothing). They convert one at a time, for free, whenever an exercise is saved from
**coach.html → ✎** or a new cycle is written by `/program-assemble`. The Train library WAS
converted in bulk (`scripts/migrate_rx.js`, git is the undo). Never author `chips[]` again, and
never leave `chips` sitting beside an `rx`.

**Writing a programme got shorter, which was the point.** `/program-design` already emitted plain
dose fields; `/program-assemble` step 2b used to convert them into chips under a page of rules
(`×`-prefix, style colours, chip order, "never put a dose in a modifier"). That step is now a copy.
**Reps are ONE number, never a range** (Amir, 2026-09-24: *"I don't prescribe rep ranges"* —
this reverses a 2026-09-20 note that said ranges ship as ranges). The set log pre-fills the
prescribed number and a tick means "done as written", so a range leaves the app guessing.
`auditRx()` flags one as `rep-range`. Thirteen legacy `chips[]` ranges still sit in three live
programmes (amirabbas_esh1, bardia_ahmadi, lem_cass1); the app shows them as a range and records
reps only when the athlete types them, rather than inventing the low end.

### 🕘 The Card Remembers — last time on every exercise (2026-09-24)

Idea #5 of `/ideas` round 1, built from the brief Amir approved ("go with your suggestions"). Every
standard exercise card shows what the athlete did **the last time they did that exercise** (any
day, across cycles via `matchRenamed()`), and **History ›** opens the History sheet. Four rules:
- **History, never a prescription.** It never suggests a load — Amir's rule is RPE, never load.
- **Reps are an override.** The reps box shows the prescribed number as a placeholder; `n` is
  stored only when the athlete did something else. Amir prescribes **one number, never a range**.
- **The log-line grammar exists three times** — `buildSessionData()` writes `Set 1: 80 ×5 @8 ✓`,
  `parseSetLine()` (coach.html) and `parseSetText()` (program.html) read it. Change all three.
- **`<id>_histcache` is a cache and never syncs** (`_snapshot()` skips it; written with
  `_lsRawSet` so it never stamps `lastEditAt`). The source is `get_my_history()`, stage30.

### ✍️ The set log is COUNTERSIGNED, and the note belongs to ONE session (2026-09-24)

Amir: *"do as you recommend"*, on top of The Card Remembers. Design and evidence in
`Content/SET-LOGGING-DESIGN.md`. **Written by the coach, countersigned by the athlete:** every
set arrives pre-written, the tick means "done as written", and only a set that went differently
costs more than one tap.
- **The row is SET · KG · REPS · RPE tag · tick.** RPE is no longer five ~20px buttons on every
  row before a rep is lifted: **How hard?** opens full width under a row the moment it is ticked,
  then folds into an `RPE 8` tag that reopens it. `.live` tints the next set to do. All row state
  is drawn by one painter, `card._paintSets()`; "tick all" and Reset call it too.
- **Guided Mode asks on the REST screen** (`paintTimerLog()`): a reps − / + and the RPE strip for
  the set just done. It holds no state — every tap goes through the row's own input and buttons.
- **The note is per SESSION**: `<id>_snote_<Name>` = `{ d: local date, v }`, shown and sent only on
  day `d`. The old `<id>_note_` was never cleared, so half the notes Amir received were re-runs
  (522 sent, 259 distinct). A date stamp, not a clear, because the cloud merge prefers text over a
  blank and would hand a cleared note back. Last session's note shows in the Last time strip.
  coach.html reads `snote_` ahead of `note_`.
- **Leftover rep ranges are never guessed.** `cardReps()`/`plannedReps()` return null for one, so the
  box shows `8–10` and reps are recorded only when typed. `repCount()` still takes the low end,
  for The Ceiling only.
- Weight and reps inputs normalise Persian/Arabic digits (`normDigits()`); live logs held `۲۵`.
- **An RPE off its target is coloured: clay OVER, steel blue `--rpe-under` UNDER, green on target**
  (Amir, 2026-09-24). The one exception to "clay is the only accent", and only for an RPE against
  its target: warm = harder, cool = easier, and orange-vs-blue survives colour blindness where
  red-vs-green does not. Every screen goes through `rpeVs()`/`rpeMark()` (row tag, the strip, Guided
  rest screen, Last time, History), which treats a target range like `7-8` as on target inside it —
  the old `parseInt` read `7-8` as 7 and called an 8 "over".
  **coach.html matches it:** each set in *per set:* is coloured the same way, and the average's
  *under target RPE* pill is steel blue (it was ochre, the colour of "extra set"). The average still
  flags only past `RPE_OVER`/`RPE_UNDER` (1.5); the per-set colours are exact, like the athlete's.

### 🏋️ Personal Records (The Ceiling) — two write doors, and three things written twice

Full account in `CODEBASE.md` → *The Ceiling*. The three duplications to keep in step:

- **Two ways in, one estimator.** *Save to The Ceiling* on an exercise card, and **+ Log a max**
  on the Records screen (pick a lift from the current cycle, enter kg/reps/RPE, optionally
  backdated). `paintCeilingForm()` mirrors `paintFromFields()` deliberately — a second copy of
  the maths is how the two screens start disagreeing. Change one, change both.
- **The rename matcher is in `program.html` AND `coach.html`** (`matchRenamed()` /
  `ceilAliasMapC()`). It decides whether a lift renamed between cycles reads as one row or
  two; if the copies drift, the coach and the athlete are looking at different records for
  the same body. ⚠️ It resolves names at READ time and never rewrites stored ones — rewriting
  loses the race across devices and brings the split back doubled.
- **A DELETE IS A TOMBSTONE** (`{ del: true }`), never a dropped row, for exactly the reason
  body weight's is — and every write must rebuild from `loadCeilingRaw()`, not `loadCeiling()`,
  or the next save silently drops them all.

The `"test": "5RM"` retest flag is written by `/program-design` (`test_flag`) → `/program-assemble`
→ `SCHEMA.md`; the athlete's nudge is anchored to the **cycle's closing week** with a 28-day floor,
the coach's is the floor alone. Two or three flagged lifts a cycle — the nudge works by being rare.

Added 2026-09-03 (Amir: *"add a weight tracker, with history … push my clients to open the
habit tracker"*). Kilograms, **on by default for everyone, toggled off** in
Settings → Body weight (`CFG.wt.on`; flipped from off-by-default 2026-09-05, Amir:
*"should be on for everyone automatically ... they can turn it off"*), and **deliberately
outside the whole scoring system**: no XP on either side, no `xp_rules` key, not in
`HABITS`/`live()`/`rosterOn()`, never written to `LOG`. It is the one feature that is *not*
on the scored-twice table above, and the reason it was cheap and safe to ship. Full account
in `HABITS.md`; the "don't make it pay" argument in `XP_SYSTEM.md` §6.4.

⚠️ **The on-by-default flip is a one-shot migration, not just a new `defaultCfg()` value —
`defaultCfg()` alone only reaches a genuinely brand-new install.** `migrateOld()` carries a
second, independent one-shot flag (`CFG.wtOnMigrated`) that forces `CFG.wt.on = true` for
every athlete who has not decided for themselves — which the app tells apart from "just
inherited whatever default happened to be in force" via `CFG.wt.touched`, set the instant
the Settings switch is tapped, in **either** direction. That is what lets this safely
retro-flip athletes who already had an explicit `on:false` stored from the few hours this
shipped with the opposite default, while never overwriting a real choice. It only forces
the **loud** `saveCfg()` (the one that stamps `updatedAt` and propagates to the cloud) when
the value actually moves — a brand-new device already starts at `on:true` and must stay a
quiet `saveCfgQuiet()`, or it would race ahead of its first cloud pull exactly the way the
`saveCfg()`-vs-`saveCfgQuiet()` warning a few hundred lines below (`migrateOld()`'s own
comment) already guards against.

⚠️ **It has its own payload key — `<id>_hab_wt` — and three real bugs are why.** In
`LOG[day]` the server's `hab_xp()` would pay `customXp` for it as an unrecognised numeric
key (scoring on the **board** and nowhere else), and the log merge's `max()` would make a
loss unrecordable and let a stale phone overwrite a correction for ever. On `CFG` the
wholesale config adoption would delete it exactly as it once deleted earned rewards. Its
merge is its own: **union by date, newest `t` wins** — and a **delete is a tombstone**
(`kg: null` with a fresh `t`), never a `delete` of the key: the union only ever walks the
keys the *cloud* has, so dropping a key outright left the other phone holding the reading
and re-uploading it, and the deletion undid itself with nothing the athlete could do. **Zero SQL** — `save_progress`
merges payload keys at the top level and whitelists nothing, `get_progress` returns the
whole blob, and `coach.html` already selects `data` entire.

UI: `renderWtRow()` is a **white rounded card below the habit list and below its hint**
(Amir, 2026-09-04 — an earlier build put a square full-bleed band *above* the list and he
rejected it as inconsistent: this app is white rounded cards on lavender, and the hint
must stay attached to the rows it explains). The card carries the number, the month delta
and an inline sparkline, so it is the only thing on Today that shows a trend without being
tapped. Its **body opens the history and its button logs** — the habit row's own law (name
vs box); one button doing both by turns left the history unreachable before weighing.
`renderWtProgressRow()` puts the same fact on **PROGRESS**, after the habits and before
the quests, because that is the tab an athlete opens to check progress. `renderWeight()` is an overlay screen built on `renderDetail()`'s own furniture —
76px figure, `.block` sections, the three-up `.statnum` triptych — with **`.chip`/`.chip-on`
pills** for the **7 day / 1 month / 3 month** ranges, the same control Crew uses to swap
Roll call for the Leaderboard. **Invent no new component here**: every earlier attempt to
(a tinted band, a segmented tab box, a bespoke input) was the thing that read as foreign. `renderSettingsWeight()` holds the switch and **never deletes readings
when switched off**; `weightPanel()` in `coach.html` → Proof shows Amir the trend. The
chart is the app's **first and only chart** — line is a 7-day rolling average, dots are the
raw readings, every quoted change compares average to average, because daily weight swings
a kilo on water alone. Never put it on the board, the wall, or the programme record.
`privacy.html` §2.3 names it and, since it went on-by-default, rests on **legitimate
interests (GDPR Art. 6(1)(f))** rather than explicit consent — a default-on feature cannot
honestly claim consent as its basis, and the one-tap toggle to object is what makes
legitimate interests defensible instead. Full reasoning in `HABITS.md`.

⚠️ **The disclosure has to be SEEN, not just true in a policy doc — `renderWtNotice()`,
added 2026-09-05 (Amir has no lawyer or compliance person of his own to catch a mistake
here).** A **standing banner** — `.rcprompt`, unchanged, the same component the tour prompt
and roll-call pointer already use — sits above the weigh-in card until `CFG.wt.seenNotice`
flips, which happens the moment the athlete taps it (straight to Settings → Body weight, the
switch itself, not just the read-only history), opens the history any other way, or logs a
reading. The OLD copy (`wtCardLine()`'s empty-state sentence) technically disclosed this too,
but lived inside the card and vanished the instant there was a first reading — an athlete
who tapped *Weigh in* fast enough could act before ever reading it. That was not real
disclosure. **Also added the same pass: self-service erasure** — *Delete all my weight
history* in Settings → Body weight, next to the on/off switch, same double-tap-confirm as
*Reset today's log*. `clearAllWeight()` tombstones every day in one pass, never a raw
`WT = {}` — a bare wipe is invisible to the union merge and a device that has not pulled it
would resurrect every reading on its next push, the identical failure mode the single-day
tombstone fix (above) already exists to prevent. Proven across a simulated second device
that still holds real readings: it ends up with every reading tombstoned too.

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
- **`sw.js` (scope `/`) sits in front of the WHOLE origin, not just program.html** (v7, 2026-09-13).
  It must keep leaving `/reach/` (the Iran reachability probe) and `/tennis/` (the paid course,
  whose app at `/tennis/app/` ships its own worker and `tps-shell-*` caches) untouched. Otherwise the probe reports a cached pass
  and the course gets stale files pinned. Its `activate` deletes **only `aap-*` caches**: Cache
  Storage is shared by the origin, and the old `k !== CACHE` filter would have wiped any other
  app's offline copy on every bump.
- **`/tennis/app/` is the paid course app** (Tennis Performance System, Level 2; Farsi). Its source
  and content live in the private `tps-content` repo: only the shell (index.html, app.js, app.css,
  sw.js, the self-hosted font and Supabase library) is copied here by
  `tps-content/app/_dev/deploy_to_website.py`, so **never edit those files here**. The handbook itself
  is in Supabase (`tps_content`, readable only by an active buyer); logins come from coach.html →
  **Course**. Backend: `supabase/tps_01_accounts_content.sql` + `supabase/functions/tps-login`.
  ⚠️ **One exception, 2026-09-15: the demo was built directly in this folder**, because `tps-content`
  was not reachable from Amir's PC (not in its folders, and his stored GitHub login sees neither it
  nor `assess-content`, which another session deployed from that same day). **So the next deploy from
  `tps-content` erases the demo** unless `app.js`, `app.css`, `index.html` and `sw.js` are first
  copied from here into it. Whenever this folder is edited here, run `python scripts/stamp_tps_app.py`
  (the pre-commit hook blocks a stale stamp): the app's worker answers from its cache first, so a change
  shipped under an unchanged `sw.js` VERSION never reaches a phone that already has the app.
  **The demo is `/tennis/app/?demo=1`** (Amir, 2026-09-15): no sign-in; week 1, the broad jump test and
  three lessons open, everything else locked behind a WhatsApp buy button. The lock is server-side:
  `tps_demo()` (`supabase/tps_02_demo.sql`, where the picks live) sends each locked item as its card
  only, so nothing locked ever reaches the phone. Never "lock" something in app.js alone. It is the one
  mode that loads Plausible (goals `Demo opened`, `Demo failed`, `Demo locked`, `Demo buy`). It is linked
  publicly (Amir, 2026-09-15, before his Iran test): from `/tennis/` (menu, hero link, the phone
  screenshot, the inside section, the price card, an FAQ), the course card on `index-fa.html`, and
  `links.html`. If it will not open in Iran without a VPN, move the free parts to static files on the website.
- **The course app has a TOUR and a GUIDE** (2026-09-21, Amir: *"i want the TPS course, and the demo,
  to have a tutorial made for it, showing the different sections and where to find where, in farsi"*).
  Both are in `tennis/app/app.js` under *The tour and the guide*, and they run for a **buyer and a demo
  visitor alike** — the demo's copy names what is locked and its last card carries the buy button.
  - **The tour** is habits.html's, ported: a clay ring around a real control, a card beside it, four
    mask panes with a **real hole** so a step marked `act` is finished by doing the thing. 15 steps
    across all five tabs, and it **opens step-by-step mode for real** (three steps: the warm-up card
    and its timer, a real set, the ✕) because the green button at the foot of a session is the part
    nobody finds alone. It runs **once** on a first open — not on a deep link, which is somebody who
    came for a page — and `?tour=1` always replays it. Whether it has run is `localStorage` key
    **`tps.toured`**, deliberately NOT inside `tps.prefs`: a prefs object existing before a version is
    chosen reads as "already chosen" in every `!prefs` test in that file.
  - **The guide** is `#/guide`, reached from the **؟** beside the gear on all five tab banners. It is
    a map, not an essay: the five sections and the controls that hide (version gear, step mode, the
    warm-up timer, exercise search, the one-rep-max calculator, the Yo-Yo beeps, printing the results
    sheet), **every row a real link** — and in the demo it links at `#/tests` rather than into a
    locked test. It also replays the tour.
  - ⚠️ **Move a control, rename a tab, or change what a tap does and the tour is actively lying**, on
    the first screen a new buyer or a demo visitor sees. The same rule habits.html's `tourSteps()`
    carries. Its targets are resolved out of the live DOM per step, so a renamed class silently rings
    nothing rather than erroring: `.block-card .weeks`, `.session-card`, `.ex`, `.cta-bar .btn.primary`,
    `.step-body .rest`, `.step-foot .btn.primary`, `.step-top`, `.search`, `.card.tap`, `#tabs`,
    `.bhelp` and `[data-tour="version"]`.
  - ⚠️ **`sel` is lazy; `when` is EAGER — never let a `when` test the DOM.** A step's `sel` runs each
    time that step opens, so it sees the right screen. A step's `when` runs when the list is *built*,
    which is wherever the tour was started from — the guide screen, on a replay. The safety step's
    `when` read `#safety` at first and so dropped itself on every replay (14 steps, not 15), losing
    the one step that names the red flags, on the one path somebody chose deliberately. A `when` asks
    the **content** (`C.start.safety`) whether the view will draw the thing.
  - Two new Plausible goals to create, demo only: **`Tour opened`** and **`Tour finished`** (plus
    `Tour skipped`).
- **Videos play from `www.youtube.com/embed` in BOTH apps, never `youtube-nocookie.com`** (2026-09-23; Iranian
  athletes could not watch the course videos). The nocookie player hits YouTube's sign-in wall in Iran, and many VPN apps
  there route only the `youtube.com` names. Both apps read watch, `youtu.be`, `shorts/`, `embed/` and `live/` links, give a
  Shorts link a tall 9:16 box, and play every video inside the app. An "open in the YouTube app" link was tried and
  removed the same day (Amir): do not add it back.
  The three parsers must agree: `ytId()` in `tennis/app/app.js`, `ytVideoId()` in `program.html`, the modal in
  `assets/js/shared.js`. ⚠️ This was edited here, so copy `app.js` and `app.css` into `tps-content` before its next deploy.
- **The course app's pictures (Amir, 2026-09-19).** AI-made (GPT Image 2 and Higgsfield), one look: shadows lean deep green,
  highlights lean warm cream, clay orange the only loud colour. They live in `assets/tps/` as WebP, made from masters by
  **`scripts/grade_tps_art.py`**, which applies ONE shared colour grade (prompts drift off-colour, the grade does not) and
  exports 1080 px, 16:9, about 40 KB each. They show in the **demo** (`/tennis/app/?demo=1`) and to every paying buyer alike: `ART` and
  `ART_V` in `app.js` decide where each goes (block covers by block number, lessons and tests by id, one tarp picture for
  every locked page, one room per session card, one for the session-complete screen). ⚠️ **Everyone sees everything (2026-09-20).** The gate that kept lessons, tests and the locked pages demo-only (`ART_KINDS`) is gone, because all 22 lessons and all 7 tests now have a cover. **A new lesson or test needs its cover added to `ART` by its id, or its card stays a plain green banner** (the ids are in `public.tps_content`: `learn`…`learn-5` and `tests`), so never ship half a list of pictures. `tennis/app/sw.js` keeps each picture for offline use, in its own `tps-art` cache, the first time it is shown. Rules every picture follows: no text or logos in
  the image, subject on the LEFT and the right and bottom calm (the app is right-to-left, so titles sit there), no yellow
  or gold, no faces, never teach exercise form. After regrading a file raise `ART_V`: the root `sw.js` keeps `/assets/`
  files cache-first by full URL. **All 40 pictures exist** (2026-09-20: 4 block covers, 3 session rooms, the test-day card, the session-complete picture, the locked-page tarp, the sign-in walk-on, and 22 lesson and 7 test covers). The last 12 covers were generated on 2026-09-20 with the Higgsfield connector (`/image` skill; `gpt_image_2_5`, medium, 1 credit each, 3 candidates per slot, best of three) and graded through the same script, except `tennis-fitness`, which came from the program.html session's set. ⚠️ **Before generating anything, run `git status --short` and look at `assets/tps/` and the other sessions' scratchpads**: on 2026-09-20 two sessions were asked for the same 12 covers and both generated them, which cost credits twice. The sign-in walk-on is not gated at all: it replaces `court-sessions.jpg` for everyone, because it swaps a picture rather than adding one. Nine of the covers are program.html stills (its art is composed with the subject on the RIGHT, the opposite of this RTL app), reused by mirroring them: `FLIPPED` in `scripts/grade_tps_art.py`. Like the rest of the demo it was built in this
  folder, so the next deploy from `tps-content` erases the `app.js`, `app.css` and `index.html` changes unless they are
  copied there first.
- **`/tennis/` is the course's product page** (Farsi, indexable; 2026-09-15). Amir: every product gets
  its own page, on one shared layout (hero → who → inside → how → price → FAQ → buy):
  `assets/css/fa-product.css`, with Vazirmatn self-hosted in `assets/fonts/`. **Bump the `?v=` on that
  link after any change**, because `sw.js` serves `/assets/` cache-first to anyone who has opened
  program.html. The **«تو کدوم سطحی؟» level test** is `tennis/level-test.js`. Amir's rules (aiming at
  ~70% Level 2, 15% Level 1, 15% Level 3) are in its header: change them there, and nowhere else. It stores
  nothing and sends only a Plausible custom event `Level test 1|2|3` (each needs a goal in Plausible).
  The page reaches `sitemap.xml` through `FOLDER_PAGES` in `scripts/build_article_pages.py`.
  `index-fa.html` links it from the menu («دوره») and the «محصولات» strip.
- **`/tennis-testing/` is the testing app's product page** (Farsi, indexable, for coaches and academies;
  full sale at $17 once, 2026-09-15) on the same `fa-product.css` layout. **The app itself moved to
  `/tennis-testing/app/`** that day, while no login existed. Its shell is copied there by
  `assess-content/app/_dev/deploy_to_website.py`, so never edit `tennis-testing/app/` by hand; logins come
  from coach.html → **Testing app** (`ASSESS_URL`). The page's phone screens are real, taken with made-up
  sample players (`?sample=1`). Like the course app, it self-hosts Vazirmatn and supabase-js 2.116.0
  (`fonts/`, `lib/`), so nothing waits on Google Fonts or jsDelivr. `index-fa.html` links it from the menu («برای مربی‌ها») and the third
  «محصولات» card.
- **Where the Farsi products are introduced (Amir, 2026-09-15):**
  - `index-fa.html` has a clay top banner («تازه: دوره‌ی تنیس و اپِ آزمون ←», not sticky) that jumps to the «محصولات» strip.
  - That strip sits right under the hero and the stats bars.
  - The menu keeps only links that go to another page: «دوره», «برای مربی‌ها», «مقاله‌ها» (Amir,
    2026-09-15: the seven links that jumped down the page are gone). On phones they drop down from a ☰
    panel under the bar, with English as its last row. `/tennis/` and `/tennis-testing/` have the same
    phone menu but keep their section links. One script opens and closes all three:
    `assets/js/fa-nav.js`; the look is in `index-fa.html`'s CSS and `fa-product.css`, so change both.
  - `links.html` has a button for each product, plus the course demo («هفته‌ی ۱ رو رایگان امتحان کن»).
  - **The English site deliberately does not mention them** (Amir's choice): it stays about coaching for international players.
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

**The athlete app's pictures (2026-09-19).** Every image inside `program.html` is
generated art in `assets/art/`, made in Higgsfield (GPT Image 2.5 Flare) from a shot
list, all graded through one pass so separate runs read as one set. Rules every picture
follows: **no people, no logos, no text or numbers, no yellow or gold**; green-black
shadows, warm cream highlights, clay the only saturated colour. **Cycle cards use 10
FAMILY images, never one per cycle name** — 161 live cycles share ten pictures and the
pipeline invents new names every block. The family comes from the `art` word on the
cycle, with keyword rules on the NAME as fallback (`cycleArt()`); when two cards in a
row share a family the second is mirrored with a clay scrim, so no image may carry text
or a handed subject. Moments: session complete (3, rotating), new best on The Ceiling
(3), welcome (1, once per athlete). ⚠️ **A replacement ships as `-v2`, never over the
same path** — `sw.js` serves `/assets/` cache-first by URL. Full specs `IMAGES.md` §0;
asset shelf row in `Content/DESIGN-ATLAS.md`.

**Generating pictures is the `/image` skill** (`.claude/skills/image/SKILL.md`) — Higgsfield is
connected, so Claude writes the prompt, generates, downloads, judges, grades and ships without
Amir touching the tool. Read it before writing a prompt. **Its Step 0 is "look at what we already
have"** (Amir, 2026-09-20: *"have a look at what we already have, so we can reuse and we don't have
to regenerate"*): run `tools/shelf.py` for a contact sheet of every shipped picture, search
`LEDGER.md` for what each one shows, and walk the reuse ladder (as it is, mirror, re-crop, `bench/`,
unused candidates) before generating anything. The skill also carries the settings that work
(medium/1k, **1 credit per image**, a shared rate limit that rejects part of a big batch, so submit
6 at a time), the prompt formula, the subjects that have failed, `tools/crop.py` (what the 2.9:1
course card really shows) and `tools/gate.py`, which judges a candidate through the destination's
**own scrim** rather than on the raw file. ⚠️ **It spends
real credits from a pot shared with Amir's own generations, so never generate unless he asked for
that run** (Amir, 2026-09-20: *"wait untill i say to generate more"*). Its *Learned the hard way*
log is where each round's lessons go.

**Generating video clips is the `/video` skill** (`.claude/skills/video/SKILL.md`), which starts from
a picture, so read `/image` first. It opens with **Amir's spend protocol** (2026-09-20, after the first
two test clips cost 23.5 credits and the same tests done lean cost 9.5: *"the credit is expensive, but
you did some things without letting me know, or asking for me"*): **show a plan block and wait for his
yes before ANY generation, even a test; reuse a picture that exists before making one; sound OFF (the
default is ON, so always pass `sound: "off"`); 3-second clips, never 5; the cheapest settings that show
the thing; report the cost in numbers after.** The same rules hold for pictures. It also has the price
list, the prompt craft for a locked camera, `tools/clip_check.py` and a ledger of every picture and clip
already in the Higgsfield account.

**Selling something is the `/ad` skill** (`.claude/skills/ad/SKILL.md`), built 2026-09-21 from a
five-round interview with Amir — so it is the first design doc here that records *his* answers
rather than a reading of his past work. It runs **Amir's own 17-stage pipeline** (his structure, 2026-09-21, with three moves and one
addition he approved): objective → audience → problem in their words → **the objection it kills** →
core message → **CTA** → creative idea → emotional direction → *his yes* → storyboard → script →
shot list → look lock → image prompts → selection → video prompts → edit plan → final review.
⚠️ **The CTA sits at stage 6, not 14** — the ask decides the film's length, hook and last ten
seconds, so deciding it late means discovering the ad leads nowhere after it is cut. Reference files:
`BRAND.md` (who the audience is, the refusals), `STRATEGY.md` (ten angles, thirteen hooks, five
visual concepts, three CTAs), `SHOTS.md`, `PROMPTS.md`, `WHATSAPP.md` (the reply set, anchored on
Iran prices — $100 for the same 16 weeks against $17), `LEDGER.md`. **Every ad gets its own brief
file** in `Content/tps-ads/`, from `BRIEF-TEMPLATE.md`. `/image` and `/video` stay as the craft files it
calls; `/reel` builds a fully-generated ad.
⚠️ **Four things it settled that contradict older notes here.** (1) **Amir goes on camera** — face
and voice, filming himself; every reel before this was animation with no human in it. (2) **Editing
is his bottleneck**, and he edits in Instagram's own editor, so the deliverable is a **finished
MP4**, never parts to assemble — he films one take, Claude cuts it. (3) **Parents are not in his
audience**, so a parent-facing ad can only travel second-hand. (4) The refusal list is now hard:
**attack the method never the person** (the coaches watching are also who share his work),
**promise the retest never the result**, **teach soreness-vs-pain never fear**, and no hype editing.

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

⚠️ **REVERSED 2026-09-21 — Farsi for everything now.** Amir, asked directly while building the
`/ad` skill: all new social content is **Farsi** again. The business is Iran-only where it sells
(the course is priced in Toman and bought over WhatsApp), so English social reached people who
could not buy. **Farsi typography is back in force everywhere:** Vazirmatn, `dir="rtl"`, **no
uppercase, no letter-spacing**, Persian numerals, mirrored layouts, wipes running right to left.
Reel 7 (2026-09-20) already broke the English rule for the course with his say-so; this generalises
it. The superseded directive is kept below because the shipped English work was built to it.

~~**2026-07-02 — content language directive (Amir, verbatim): "we changed everything to
english, im not creating content in farsi anymore."**~~ *(superseded 2026-09-21.)* It made all NEW
social content (carousels, reels, posts, result cards) **English**, sharp/uppercase Barlow
Condensed per the EN site voice. English work shipped under it (`reel-6-system`,
`carousel-warmup-tennis`, the EN carousels) stays as built — **never retro-edit a shipped design**. Older Farsi social
files (`reel-1..3`, `reel-5-system`, the `carousel-*` Farsi decks) are left as shipped —
reference for mechanics only, not for language/voice.
**Scope confirmed (Amir, same day): social content only** — the live Farsi **website**
(`index-fa.html`, `form-fa.html`, `terms-fa.html`) is unaffected and stays exactly as-is
for the Tehran general-fitness audience. Don't touch those pages over this directive.
⚠️ **Superseded for `index-fa.html` on 2026-09-13:** Amir moved the Farsi homepage to **tennis &
padel** and had its body rewritten (see *Article pages & SEO*). `form-fa.html` and
`terms-fa.html` are unchanged.

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
