## Career Mode, phase 3 (the catalogue switch)

> **The shelf, the four numbers on Today, the reveals and the award moments are switched off since 2026-10-19. The scoring below is unchanged.** See *Career screens off*.

> **Where it stands (2026-10-18).** Built in `habits.html`, dormant. Every branch below sits behind **`catalogueOn()`**: the
> server's catalogue switch is on (`get_profile().switch.catalogue` is a day) AND the profile carries the awards (`owned`).
> With it off, or with no profile ever (a new install offline, the demo, a preview with nothing to read), the app is
> exactly what the rest of this file says, screen for screen (the lane's headless check compares the rendered Today, Progress and
> Locker with the previous build's). The server half is `supabase/stage70_career_rewards.sql`; the rules are
> `career/CAREER_MODE.md` and `career/PROCEDURES.md` → *Phase 3, as built*. It went on on 2026-10-18 (Amir: "go live"); before that it waited for Amir's sign-off of the catalogue
> (D11) and of every new line an athlete reads (D10), and the go-day he picks (D1: recommended, the day Season 2 starts).

**What the switch is.** From its day every badge tier, milestone and catalogue title is an **award**: the server mints it once in a
career (`career_awards`, never taken back), pays its XP through the facts, and tells the athlete once (`career_recognition`, read as
`get_profile().moments`). Proof stops paying tiers and milestones itself: `bonusEvents()` emits neither (quests and comebacks are
unchanged), exactly as the server strips them from `hab_bonus_xp()`. History is minted in silence at the switch; Proof's own ladders
(`habit_tiers`, the seven habit families, HEAVY METAL, HARD TO KILL, THE MACHINIST) retire into the catalogue's: **one badge per
habit** (`habit_water` … `habit_custom`, five steps KINDLED to UNBREAKABLE), Hold Serve, Century, the widened HARD TO KILL. Nothing
already earned is ever taken away (below, *Earned before*).

**Two reads: the core and the shelf (stage70's split, 2026-10-18).** `get_profile()` is the **core**, read by `fetchCareer()` as
before: `owned` (every award id, a **list** in byte order with no days: read it with `ownedIds()` / `ownedSet()`, never
`Object.keys()` or `owned[id]`), `ladder`, `near`, `slam`, `title_worn`, `titles_owned`, `numbers.four`, `catalogue_version` and the
`moments` waiting to be told. Its `badges` and `achievements` are always `[]`: placeholders, never "none earned". Today, the Locker,
the reveal and the moment dedupe read the core only. **`get_awards()`** is the **shelf**: every badge row with `days` (the day of each
tier, `null` for a tier skipped), the milestones, the `titles` and `recent` (last 7 days, at most 10, each with its `spec`). Proof
asks for it only when **Progress opens** (`go('progress')` → `fetchShelf(true)`, at most once in 15 s), and again when the shelf is
drawn stale (`shelfStale()`: no copy, a catalogue version it was not read under, or a different number of awards owned; asked after
the paint, once per state in a run, so no signal never loops). The answer is kept in **`<id>_hab_shelf`** (`{ v, n, at, a }`: a
cache, never in `CFG`, never synced, never written in the preview or the demo, never read in the embed), so Progress shows the last
shelf with no signal. `careerView()` is the core with the shelf's four lists laid over it (`badges`, `achievements`, `titles`,
`recent`), exactly the server's own merge; every reader of those lists goes through it (`awardView()`, `awardMeaningOf()`,
`earnedBeforeLines()`, `catalogueShelf()`, `catalogueTotal()`, `latestMedal()`, `catTitleByHabId()`). Until the shelf comes the
rows are the core's ladder and owned list. The catalogue's titles reach the Locker from the core's `titles_owned` (hab_titles, which
every award and event title is written to; only an event's or a catalogue title counts: `serverCatalogueTitleIds()`), with the
shelf's titles adding the same ids once read. With the catalogue off `get_awards()` answers `catalogue: null` and nothing is kept.

**The two gates.** `catalogueOn()` draws the four numbers and the server's moments from the core, and the shelf from the core plus
the shelf read. `catalogueReady()` is that AND this phone holding the **catalogue copy** (`<id>_hab_catalogue`, fetched by
`fetchCatalogue()` from `career_catalogue` whenever `get_profile().catalogue_version` moves; never in `CFG`, never synced, never
written in the preview or the demo, never read in the embed). Everything that reads the copy asks `catalogueReady()`: a first open
offline has a profile and no copy, and then the phone simply does not score awards itself until the copy arrives.

**Scored on the phone too (P13, GAME-13).** `awardMeasures(inp, cat)` is the phone's twin of the server's measures for the entries a
phone can decide from its own log: the eight `habit_*` badges, `day_streak`, `dawn_patrol`, `proof_clean_sweep`, `back_in_the_fight`,
`first_blood`, `the_centurion`, `full_stack` and the five events. It is PURE (its input, `awardInput()`, is built from the functions
every badge here already read: `loggedDays()`, `isDone()`, `dayQualifies()`, `isPerfect()`, `comebackRuns()`), memoized beside the
bonus cache. `phoneAwards()` keeps the crossings on a day AFTER the switch (the switch day is history on both sides), inside the open
window (today and the 3 days before it, plus one), not owned, not withdrawn, priced as the server prices them. Their XP shows at the
tap (`pendingAwardXp()`, added to `careerXp()` and the week) until the server's answer owns them. `scripts/check_twins.js` §10 holds
the twin to the server's own answers (`scripts/career/reward_cases.json`). **No lift badge and no server session count is scored here**
(D18, Amir 2026-10-18; D19, Claude's pick, waiting for his word): The Upgrade and Double Up (main lifts only: a lift on one of the seven main Spine patterns with the strength tag, minus four accessories Amir named, the entry's `patterns`, `qualities` and `exclude`; the list fails closed on a missing id, `career/PROCEDURES.md` → *Stage 73*) and Century (the sessions
`career_facts_paid()` pays) have no measure in `awardMeasures()` and are server-decided, so they reach this app as ordinary server
moments and the phone never previews them. Do not add a measure for one without each lift's Spine pattern, its Spine strength tag and the `exclude` list (or the phone would count Amir's four accessories again), and for Century without the paid-session cap.
**What Proof does score is its own log:** THE FOUNDRY's *16 sessions* is days the WORKOUT habit (id `strength`) was hit (`daysHit:strength`, `achievements.toml`), so a plan day done again
on another date still moves it, though with D19 it no longer moves Century. That is what the event reads today; Amir may want to know when he answers D19.

**A pending award the server does not hold is withdrawn, quietly.** Judged only on an answer that started after a push landed with
nothing left to send: the id goes into `<id>_hab_awwd` (phone-local), its wins line goes, its XP goes, and the console says
`[career] twin disagrees`. If the server owns it later it arrives as an ordinary server moment.

**Moments (D7).** One full-screen moment per open, and that covers everything full-screen: a level-up, a rank, the reveal or an
award. A milestone or legend award takes the screen; a win or highlight is a line on the wins card. A full-screen award earned by a
tap opens right then; one that arrives with the server's answer opens only when nothing full-screen has opened this run, and
otherwise waits, unseen, for the next open. Only what is shown goes into `CFG.seenAwards` (synced, unioned across phones). Each
fresh answer tells the server, in one `mark_moments_told(…, 'proof')` call, what Proof has shown, including any waiting moment it
had already celebrated itself, so the training app never replays it. A moment never opens from the cached profile at first paint.
**The day streak keeps its takeover on every new streak (D17)**: its award (once a career) is recorded as seen whenever that
takeover fires and never opens one of its own. An **event** finished is one takeover, the award's; its title reaches the Locker only
from the server (`syncCatalogueTitles()`), because `CFG.pass.owned` can never give a pending one back (`claimEventTitles()` stands
down).

**The catalogue reveal, once per athlete.** The first open after the switch re-baselines in silence (levels, every award recorded as
seen, the road's rewards it reaches) and shows ONE screen: *MY RECORD · Your record · Everything you've earned, counted once and kept
for good.*, the four counts, the Grand Slam row and the road's rewards. `CFG.catalogueSeen` survives the cloud merge, so a second
phone stays quiet, and the flip alone never toasts *XP system updated*. When the XP reveal had this open, it waits for the next.
The four counts come from the catalogue copy (or the shelf, once read), never from the core, whose `badges` and `achievements`
are placeholders: on an open that holds neither (the copy still on its way, or a first open offline) the reveal waits, the levels
are absorbed in silence and nothing else takes the screen, and it opens the moment the copy or the shelf lands (`fetchCatalogue()`
and `fetchShelf()` run `checkLevelUps()` again while `catalogueRevealDue()`). It never shows four zeros over earned awards.
Share it opens the Rank card, eyebrow *MY RECORD*.

**What the athlete sees.**

- **Today:** under the level bar, **four numbers**, one per kind of win (`hero4()`): coached *Weeks held* (with its best) ·
  *Sessions with Amir* · *Personal bests* · *Comebacks*; free *Day streak* · *Perfect days* · *Habit steps* · *Comebacks* (D4),
  the free athlete's first three this phone's own, so they move at the tap. *Sessions with Amir* is the server's `numbers.four.commitment.value` and nothing is added to it here: from stage73
  (built, not yet applied; D19, Claude's pick, waiting for Amir's word) it is the paid sessions Century counts, a plan day done again in its training week counting once (GAME-4). A tap opens Progress at that kind of win. Two by two
  under 360 px.
- **Progress:** the statgrid is unchanged (D15; *Milestones* now counts the awards held over every live tier and milestone). The
  milestone block is the catalogue's, in four groups (*Consistency*, *Commitment*, *Progress*, *Resilience*), with the same folds,
  next three and Earned strip. A badge row shows its held tier's metal and its count to the next step. A retired badge is never a
  row of its own: it is a line under its successor, **Earned before: HUMAN SPRINKLER II**, from the server's record (the shelf
  read, `get_awards()`) or from `CFG.heldBefore` (what Proof's own shelf held at the switch, read once, synced). A free athlete's Progress group is locked:
  *Coached athletes earn these from their programme.*
- **Locker:** the **Grand Slam row** first under *What you have* (a title per kind of win, *Not yet* in grey, the GRAND SLAM plate
  once all four are held), and the catalogue's titles on the title rail (`passItem()` resolves them through `catTitleByHabId()`).
- **Share cards:** a badge or milestone opens the Milestone card on `{k: 'award', id}` (its tier's metal, its kind of win's emoji:
  🔁 consistency, 📅 commitment, 📈 progress, 🛡️ resilience), a catalogue title the Title card (the Grand Slam's eyebrow is *GRAND
  SLAM*). Proof's own painter; never `assets/js/sharecard.js`.
- **The tour** gains a step on the four numbers; **the manual** gains *Four kinds of win* and says *one badge per habit*.
- **`?go=progress`** opens Progress (the training app's Career row, once the switch is on).

**Never in the embed** (`checkLevelUps()` returns at the top, no profile, no catalogue, no RPC) **and nothing written in the coach's
preview.** The lane's checks (65, made-up profiles) and the repo's `scripts/headless/career.js` cover both.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
