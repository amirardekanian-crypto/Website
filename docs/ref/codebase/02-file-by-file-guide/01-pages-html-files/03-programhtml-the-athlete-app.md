#### `program.html` — The athlete app
- **What it does:** The private training app. Four tabs (in the bar: Home · Progress · Library · Coach): **Home** (this week: the next session, the other days, the daily habits), **Progress** (the This cycle card, Personal Records and Body weight, then the Game Plan, the whole plan cycle by cycle; the tab was "Game Plan" until 2026-10-12 and "My Plan" until 2026-09-26), **Coach** (a *Message me on WhatsApp* button, the coach's notes and the guide; the in-app chat was removed 2026-09-26), **Library** (one screen with a switch, no doors page since 2026-10-13: **Sessions**, on-demand workouts; **Playbook**, coach-published articles; **Exercises**, the Spine as a library. Since LIB-01, 2026-09-27, Sessions is a list of shelves and the app offers a session at two moments: `PROGRAM-APP.md` → *The Library's Sessions*). Loads the signed-in athlete's programme row from the server through `get_program()` (the old `/data/` files are gone from the site since 2026-09-07). With no signal it opens the last plan this phone loaded, kept in localStorage as `plancache` (REL-01, 2026-09-26; `PROGRAM-APP.md` → *No signal*). Each article and workout has its own shareable deep-link URL (`?article=<id>` / `?workout=<id>`). Demo mode (`?client=demo`) shows a read-only preview without a key.
- **Guided Mode — a second way through a session, not a second copy of it.** A session's default is
  the list: every exercise a collapsible card, sets logged by hand, Rest tapped when wanted. **Guided**
  (next to Start on the session timer) instead walks the day's "standard" exercises one set at a time
  (and, since WK-01 part 2, 2026-09-27, a circuit that logs something one round at a time),
  with rest auto-starting and auto-advancing between them (`openStepMode()`/`STEP` state, near the end
  of the script). It relocates the REAL `.ex-detail` node — video, cues, the set-log table —
  out of the card and into the overlay while a step is showing (`renderStep()`), then puts it back on
  exit. **Nothing about logging, saving or estimating a set is reimplemented**: the weight input, RPE
  buttons and check circle are the exact nodes `attachSetLog()` already wired up (the card estimate, `attachCeiling()`, went with REC-01), so
  Guided Mode can never disagree with the list view about what happened — the same trap this doc warns
  about for `coach.html`'s `parseSessionLog()`. A circuit's last round ticks it (`finishRound()`).
  Warm-up lists (circuits that log nothing) and simple check-off items are **not** in the sequence — the
  athlete finishes those from the list, same as always; `getDayCompletion()`'s "unfinished" list already
  handles that gracefully. `openTimer()`'s rest overlay grew an auto-advance path (`openTimerAuto()`) and a
  `+15s` button for Guided Mode; since WK-02 (2026-09-27) every rest opens running, counts from a timestamp,
  sounds and buzzes at zero and keeps the screen awake (PROGRAM-APP.md → *The rest timer*).
  **Entering and leaving (WK-01, 2026-09-26):** `openGuided()` never pauses a running clock (it only
  toggles a session that has not started, a leftover from an earlier day, or a paused one, which
  resumes); `openStepMode()` starts at the first unticked set; and the last button, **Finish session ✓**,
  runs `stepFinish()`: close Guided, refresh the day's finish card (`refreshConfirmCard()`) and scroll to
  it. There the athlete rates and taps Done when every set is done, or gets **Finish early** when a
  circuit or warm-up is still open (WK-04). Guided never finishes a partial session on the athlete's behalf.
  Since 2026-10-13 the warm-up (and any other run of items with nothing to log) is one Guided step of its own
  (`renderGroupStep()`: tick each, Done ✓, or Skip), so a session done in Guided ends ready, not Partial.
- **If deleted:** All athletes lose access to their programme.
- **Depends on:** **Supabase**: `get_program()` (the plan; `plancache` opens first since 2026-10-13, the server checked behind it), `get_library()` (the Library; `articles/index.json`, `workouts/index.json` and their files are the offline fallback), `get_exercises()` (the Spine: cues, videos), `get_qualities()` (the Quality Map), `get_my_history()`, and the progress and session saves. Also `assets/js/shared.js` (for the video pop-up and "install app" prompt), `manifest.json` and icon files.
- **Almost every picture in the app comes from `assets/art/`** (2026-09-19); the exceptions are the root `court-sessions.jpg` / `court-playbook.jpg` (the sign-in hero, the Sessions and Playbook doors and their headers) and `assets/img/coach.jpg` (the Coach tab). That includes the 13 Library shelf pictures (7 Sessions + 6 Playbook), whose paths live in `public.library_categories.banner`, with the index JSONs as the offline fallback. Only the Sessions ones are drawn: once per shelf, as its band (LIB-01, 2026-09-27; every session card used to wear it), and as the header of each workout's own screen (`libBannerFor()`). Ten cycle-card
  images keyed by FAMILY, not by cycle name (`APP_ART` + `cycleArt()`), plus seven
  moment images: three for the session-complete card, three for a new best on Personal
  Records, one welcome screen. A cycle's family comes from the `art` word on the cycle
  (`SCHEMA.md`), falling back to keyword rules on the cycle NAME only — widening that
  to the tagline or the focus list was tried and is wrong, because a focus list names
  every quality a block touches. Two cards in a row from the same family: the second is
  mirrored with a clay scrim, which is why no image may carry text. New local keys, all
  plain values that ride the normal snapshot: `<id>_art_finish` (which finish picture is
  next), `<id>_ceil_best` (the pending new-best record, shown for 7 days), `<id>_welcomed`,
  and the global `aa_fresh_signin`. Specs and prompts: `IMAGES.md` §0.
- **Today's habits on Home — AA Proof, embedded (2026-09-26).** Under the Daily Habits card, `mountProofStrip()` loads `habits.html?client=<id>&embed=1` in a frame once the card nears the screen, and shows it when Proof posts `ready` with its height (`setup`/`error` keep the card alone). Proof draws the rows (`renderEmbed()`) and makes every write; this app redraws its card from the snapshot Proof republishes, passes its dark mode across, and never embeds in the coach's preview. `HABITS.md` → *Embedded on the training app's Home*.
- **Links to the habit tracker — and nothing more.** A **Daily Habits** card on Home, under the week's day cards (and a shortcut on the session-complete card), opens [`habits.html`](../../../../../habits.html), handing over the client id and resolved key. Same origin and PWA scope, so from an installed app this stays inside the app shell instead of bouncing to the browser. The card is deliberately plain: **this app holds no habit state, no XP maths and no level formula** — duplicating those would be a third copy to keep in sync and weight it doesn't need.
- **The two apps stay out of each other's *writes*.** `_snapshot()` skips `<id>_hab_*` (Proof owns and syncs those), so this app can never push habit data back. The one exception is `<id>_hab_wt`, body weight, which this app has owned since 2026-09-12: the Body Weight screen (opened from its card on Home) writes it, `_snapshot()` pushes it, and `mergeStoredValue()` merges it by date, with tombstones. Personal Records takes the latest reading out of it to show relative strength (see the bullet below). It only **reads** two Proof keys, both degrading gracefully when absent: `<id>_hab_cfg`, which `_wsHabitOn()` checks for the Library's "ticks your habit" line (`libTickLabel()`), and `<id>_hab_card`, which the **Daily Habits card reads** — a snapshot habits.html *publishes* at the end of every render (`publishCardSnapshot()` there) holding the level, rank, day streak, today's done/total, the week's seven qualifying flags and, since PRF-03 (2026-09-27), the verdict Today leads with (`verdict`, `togo`), which the row prints as *2 to go*, *On target* or *Perfect*. ⚠️ **That key exists precisely so this app never re-derives any of it.** The XP curve, rank ladder and weighted day gate already live in two places (habits.html and the `xp_rules` row); computing them here would be a third copy, the exact failure this repo warns about where two screens disagree and nothing errors. Proof exports its *answers*, not its rules. The key is deliberately device-local — habits.html builds its sync payload explicitly from cfg/log only, so this never travels — and a phone that has never opened Proof simply gets a card with no numbers. Finishing a session writes nothing into Proof; it records to `session_history` as it always has, and Proof reads the dates back through the read-only `get_workout_days` RPC ([`supabase/stage10_workout_days.sql`](../../../../../supabase/stage10_workout_days.sql)) to tick its WORKOUT habit. The completion card just says so and offers a shortcut across.
- **The set log is countersigned (2026-09-24).** `attachSetLog()` draws SET · KG · REPS · RPE tag · tick;
  the RPE strip opens under a row once it is ticked, and `card._paintSets()` is the one painter for
  row state (`.live`, `.done`, `.rpe-open`). Guided Mode's rest screen logs reps and RPE through the
  same row nodes (`paintTimerLog()`). The exercise note is per session: `<id>_snote_<Name>` =
  `{ d, v }`, valid only on day `d` (`loadSessionNote()`); `<id>_note_` is no longer read. Design:
  `docs/record/SET-LOGGING-DESIGN.md`. **Since 2026-09-26 a set is `{ w, n, r, d, lw? }`**: `lw` is last
  time's weight, shown under a LAST caption in an empty box, and `w` is only ever today's. A
  session's set is ended by ONE function, `carrySet()` (Done, the midnight sweep, the cloud copy and a
  rename all call it; since 2026-10-13 Done keeps the day's own copy in `<id>_donelog_d<N>` and a reader
  passes its day: `loadSetLog(name, total, day)`, PROGRAM-APP.md → *A session closes at Done*), the setlog merge carries `lw`, and typing a weight fills the empty sets
  below (the card's **Same as last** button went on 2026-09-27; Guided's rest screen keeps one).
  A tick on an empty box records no weight. **One RPE control everywhere (CONS-01, 2026-09-27)**:
  the set strip, a circuit's rounds (`selectRPE()`), Guided, the session rating and Log a max
  (a hidden `#cf-rpe` behind five buttons) share one 44 px look, and a second tap clears a pick.
  Details: `PROGRAM-APP.md`.
- **⚠️ Personal Records (estimated 1RM; "The Ceiling" on screen until 2026-09-26) — one storage
  key with a hand-written merge rule.** Nothing about the max shows on the exercise card (REC-01,
  2026-09-26). Writes come from two doors, both landing in
  **`<id>_1rm`**: **automatic new bests** (`fillRecordsFrom()`, from a finished session and from
  history, written only when a session's best set beats every earlier number for the lift),
  and **+ Log a max** on the Records screen itself. The Records card
  sits on **Home**. The value is an array of `{ lift, kg, w, r, rpe, d, t, test?, auto? }`, one
  entry per lift per day, where `test: true` marks a deliberate rep-max test and `auto: true` a
  new best the app wrote by itself. ⚠️ **Automatic entries carry `t: 0`** so any write the athlete
  makes to that day, a hand entry or a delete, wins the merge on every phone.
  - **That key has its own branch in `mergeStoredValue()` — union by `lift|date`, newest `t`
    wins.** Do not remove it. Without it the key falls through to the scalar rule, which takes
    one side of the merge wholesale, and a phone that had not synced would silently delete every
    estimate saved on the other. Same class of bug as the body-weight tombstone (now in this app's
    `mergeStoredValue()`).
  - **⚠️ A DELETE IS A TOMBSTONE** — `{ lift, d, del: true, t }` with a fresh `t`, never a row
    dropped from the array. The union only walks the entries it can see on both sides, so a row
    simply removed is handed straight back by the other phone on its next push and the deletion
    undoes itself. Exactly the failure body weight carries the same fix for. Which is also why
    **every write rebuilds from `loadCeilingRaw()`, never `loadCeiling()`** — the display loader
    hides tombstones, so rebuilding from it would silently drop them on the next save.
    `loadCeiling()` is what keeps them off every screen; nothing above that layer sees one.
  - **The maths lives in `estimateOneRM()`** — Epley run on *effective* reps (`reps + (10 − RPE)`),
    so an honest RPE is what makes the number good. A true single at RPE 10 returns itself rather
    than Epley's +3%. Refuses above `ONE_RM_MAX_EFFECTIVE` (10) and rounds to 2.5 kg.
    Both constants are tunable at the top of that block; the *why* behind each is in
    `.claude/skills/program-design/SKILL.md` → **The Ceiling**, which is also where the
    coach-side rules live (no %1RM prescription; closing-week 5RM retests on two or three flagged lifts).
    **Both doors run the same estimator** — the automatic bests (`histBestSet()`, read by
    `fillRecordsFrom()`) and `paintCeilingForm()` on the Records screen both call `estimateOneRM()`;
    the card's `paintFromFields()` went with REC-01. A second copy of
    the maths is how the two screens would start disagreeing.
  - **The Records screen's list is `ceilingCandidates()`:** every `standard` exercise in the
    current cycle whose reps chip is a rep count (no holds, carries or intervals). What was
    *prescribed* stops mattering once the athlete enters what they actually lifted, and
    `estimateOneRM()` still refuses anything past the ceiling on save.
  - **Never free text.** An entry is filed under its display name, so a typed "Squat" beside a
    prescribed "Barbell Back Squat" splits the athlete's history in two with no way back. The
    picker is the whole defence.
  - **Renames are resolved at READ time, not rewritten** (`ceilAliasMap()`). The name lives
    *inside* the shared array, so `adoptRenamedExercises()`'s copy-the-key trick cannot help —
    there is only a value to overwrite, and overwriting it loses the race across devices (a
    phone that renamed its rows pushes them next to the old-named rows still held by a phone
    that has not booted since, and the split comes back doubled). Aliasing on read converges
    instantly on every device and destroys nothing if a match is wrong. Entries keep their
    stored `lift`, so deleting one still addresses the row that is really there. Both sides use
    the same matcher — `matchRenamed()`, shared with `adoptRenamedExercises()`, ported into
    `coach.html` as `ceilAliasMapC()` so the coach and the athlete never see one lift as two.
  - **The retest nudge is anchored to the CYCLE, not the calendar.** A lift the programme marks
    `"test": "5RM"` (see `SCHEMA.md` → `test`) appears in the Records screen's *Due for a
    retest* strip when all three hold: the cycle is in its closing week or past its `endDate`,
    the lift has gone `RETEST_MIN_DAYS` (28) without an entry, and it is in the current cycle.
    Cycles run ~5 weeks and each chases one quality, so a test in the closing week measures the
    block that is ending; a rolling "every 30 days" drifts into a deload sooner or later. A
    cycle with no `endDate` cannot place the window, so the floor decides alone.
  - **The coach sees it on `coach.html` → The work → Personal records** (`maxesPanel()`), read
    from the same progress blob. It flags a stale lift at the same 28 days but **ignores the
    closing-week window** — the athlete's strip waits so it does not nag, and Amir is the one
    deciding when to ask.
  - Athlete-facing explanation is the **"Personal Records: the most you could lift once"** card
    in `APP_GUIDE` plus `CEILING_HELP` (the same prose, shown in place on the Records screen); the
    data handling is `privacy.html` §2.2. Keep all of them in step.
- **Off the Glass, the rest game (2026-10-17).** `assets/js/rally.js` (`window.Rally`, precached by `sw.js`, loaded by `restGameLib('rally')` on the
  first tap of its row on the shelf behind the rest band's door): a one-thumb air hockey on a padel court that stops when the rest does. program.html owns `#rallyOverlay`
  (in `topLayer()`), `openRally()` (= `openRestGame('rally')`) and the two hooks in `timerDone()` / `closeTimer()`. `PROGRAM-APP.md` → *Off the Glass*. **Serve Clock (2026-10-18)** adds `SERVE_CLOCK`, the latch, `restDoorOn()`, `paintGetSet()` and `cueForRest()` beside the timer and `Rally.handBack(done)`: with 25 s left (30 s from a 100 s rest) the games stop and the band shows the next set and one cue (`PROGRAM-APP.md` → *Serve Clock*).
  Amir's racket plays like a person since 2026-10-18 (The Read: the `AMIR` block, `amirMove()`, a form that moves between points), held by `scripts/test_rally_sim.js` (guard 22). **Full Time and Bajada (2026-10-18)**: one match a session, first to 15, kept in `rally.js`'s `M` (memory only) and picked up again by the `session` option program.html passes (`restGameSession()`: the day plus `ymdLocal(new Date())`); hand-back, time up and close park it, `finishDayNow()` calls `Rally.endSession(day)` (that day's match only), the shelf row's small line is `rallyRowLine()` / `paintRestGameLines()` reading `Rally.matchState(session)`; a goal off the glass IN PLAY counts 2 (`S.touch`, `S.glass`, `BANK_MIN`, and `BANK_REACH`: a glass touch nearer the goal than three quarters of the court from the shooter's own end is a clip, worth 1; the last fast touch decides). `PROGRAM-APP.md` → *Full Time and Bajada*; `scripts/headless/full-time.js`.
  **The Lob (2026-10-18)** is a mode of the same file, `Rally.open({ mode: 'lob' })`, behind the shelf's fourth row (`REST_GAMES.lob`): a slow ball to breathe with (in 4 s, out 6 s), no match, no score. `PROGRAM-APP.md` → *The Lob*.
- **Split Step, the second rest game (2026-10-18).** `assets/js/splitstep.js` (`window.SplitStep`, precached by `sw.js`, loaded by
  `restGameLib('splitstep')` from the shelf): four drills with the rest clock on the court, bests in `splitstep_stats`. The door
  is now one button, "Play while you rest" (`toggleRestGames()`), that opens the shelf `#timerGames`; program.html owns `#splitOverlay`
  (in `topLayer()` and `initBackNav()`), `REST_GAMES`, `openRestGame()`, `closeRestGames()` and the same two hooks, which now act on every
  open game. `PROGRAM-APP.md` → *Split Step*.
- **Between Sets, the third rest game (2026-10-18).** `assets/js/between-sets.js` (`window.BetweenSets`, precached by `sw.js`, loaded by
  `restGameLib('sets')` from the shelf): tennis against Amir on a perspective court, a Fast4 set saved after every point (`courtduel.*`, this phone only).
  program.html owns `#setsOverlay` (in `topLayer()` and `initBackNav()`), `openBetweenSets()` and passes the athlete's first name. `PROGRAM-APP.md` → *Between Sets*.
- **Highlight Reel, share cards for a win (2026-10-17).** `assets/js/sharecard.js` (`window.ShareCard`, precached by `sw.js`, loaded by
  `hlLib()` the first time a card is drawn) paints a 1080 × 1920 Story or 1080 × 1350 post on a canvas, in English or Farsi (every Farsi
  word in its one `FA` table, drafts for Amir). program.html decides which wins and which numbers (the HIGHLIGHT REEL block at the end of
  the main script, and its CSS block just above the sign-in block, which stays the last in the sheet): the finish card's New best and Retest beaten bands (`collectWins()`,
  `<id>_hlwin_d<N>`, raw and never synced), This cycle's *Share a win ›* and *Share your cycle*, the one-time Cycle complete / Roadmap
  complete moment (`maybeHighlightMoment()`, `<id>_hl_seen`, synced), Share in Personal Records, and the share sheet
  (`openShareSheet()`, a page of the one sheet; the choices in `aa_hl_prefs`, never synced). Nothing leaves the phone until the athlete taps
  Share or Save image. `PROGRAM-APP.md` → *Highlight Reel*.
- **The "Done" pill and the suggested-day highlight — the rules, in one place.** Both read
  `weekDoneDays()` (HOME-01, 2026-09-26): a day is done when `session_history` (HIST, via
  `get_my_history()` or its phone copy) has it inside the cycle's training week (`weekWindow()`), or
  its localStorage stamp, `<id>_completed_d<N>` holding **`"<toDateString()>|c<currentCycleIndex>"`**,
  says it was finished on this phone today.
  - **Done** (`dayCardPill()`, brown pill) counts a stamp only when its cycle matches the cycle on
    screen (`completedHere()`). **Suggested** (`markSuggestedDay()`) highlights the day under way
    today, else the *first day in `days[]` order* not done this week — which is why day order in
    `workouts.days[]` is load-bearing, not cosmetic.
  - **The cycle half exists because day ids restart at 1-2-3 every cycle** and nothing clears these
    on a cycle advance. Publishing a new cycle on a day the athlete had already trained used to
    leave the new cycle's day wearing a Done pill it never earned (an athlete's report, 2026-09-05). Only
    *display* keys off the cycle; the midnight sweep in `autoResetStaleDays()` still keys off the
    **date alone** (`completedDate`), so a mismatch never destroys data that has not aged out.
  - **Legacy bare-date stamps are adopted into the current cycle on boot**, not treated as foreign
    — otherwise a session finished today but not yet sent loses its Send panel (`restoreState`).
  - ⚠️ **The stamp is today-scoped; the week is not.** A stamp is swept after midnight (six hours'
    grace for a late finish, `sessionIsStale()`, DATA-02). What was done this week comes from
    `session_history` through `get_my_history()`, so the suggestion no longer goes back to Day 1
    every morning (`PROGRAM-APP.md` → *This Week is built from the session history*).
- **A finished session is recorded TWICE, over two independent calls** — `save_session` (the
  `session_history` row the coach dashboard is built from) and a Web3Forms email. Either can fail
  alone. A failed `save_session` queues in `<id>_csq` and retries on a later app open, which may
  never come before the next cycle — so the coach's inbox can hold a session the dashboard has no
  row for, silently (the same athlete's report, 2026-09-05). Two guards now: `flushOutbox()` **drains the
  queue** (`_replayQueue()`) right after an email succeeds (proof the network is up), and
  `coach.html`'s `syncGapsOf()` flags any athlete whose `<id>_sent_d<N>` has no matching
  `session_history` row, as a *needs you* reason on the roster. Since WK-04 (2026-09-27) the email waits in an
  outbox on the phone (`<id>_outbox`, never synced) and can go days after the session, so each send also writes
  `<id>_senton_d<N>`, the date the session is filed under, and `syncGapsOf()` matches on that.
  ⚠️ **Until 2026-09-13 `_replayQueue()` also demanded a secret key**, so for every athlete who
  signs in with a password — none of them has one — neither drain ever ran and a failed save
  stayed queued for good. It runs on the signed-in session now (`save_session` accepts
  `current_athlete_id()`), and it re-reads the queue before writing it back, so a save that
  fails while a replay is still waiting on the network is not erased.
  ⚠️ **Until 2026-10-12 a session went into the queue only when `save_session` came back with an error.** A call
  that never came back (no signal in the gym, a connection that hangs, Iran's filtering, the app put away or closed
  mid-save) left no trace on the phone, while the email waited in its outbox and arrived: 10 sessions of 4 athletes
  between 16 Sep and 10 Oct (4, 4, 1 and 1 each), found from Amir's inbox and trash and put back
  from the emails the same day (`scripts/restore/sessions_from_email.js`, coach.html's own email reader). Now:
  - **The queue first.** `recordSessionToCloud()` puts the record in `<id>_csq` BEFORE the call and takes it out only
    when the server answers (`_enqueueSession()`, `_sendSession()`, `_dequeueSession()`). One entry per SESSION (day and
    date), a newer save of the same session replaces the waiting one, every call is capped at `SESSION_SAVE_MS`.
  - **It drains** at every open, back in the foreground, when the connection comes back and after a report goes.
  - **It never syncs**, like the outbox: another phone would send it again, and a cloud copy pulled back over it (every
    progress row still holds an old `[]`) would wipe a session still waiting. `_snapshot()` and `syncFromCloud()` skip it.
  - **A day left unfinished is filed by itself** at the next open (`fileUnfinished()`; the Send it / Clear it card is gone):
    under the day it was trained, with that day's check-in and clock (`buildSessionData()` judges both by the session's own
    date now, so a rating changed after midnight no longer drops the check-in), then the page opens once more so the sweep
    clears the day. The sweep keeps a waiting day's check-in, clock and shared exercises until it is filed (`_awaitingFile()`).
  - **The phone's finished list** `<id>_finished` ("day|date", the last 60, synced as a union) lets `syncGapsOf()` name a
    session the phone finished and the server does not have WITHOUT the email (the last 14 days), so the warning survives
    the day the email reports are switched off. `scripts/headless/session-queue.js` and the coach harness's
    `sync-finished-list` hold all of it.
  To find lost sessions again while emails still exist: every Web3Forms "Session Report" since a date (inbox and trash),
  against `session_history` by athlete name, day and a window of three days before to one day after the email.
- **Coach preview (`?preview=1`) must never write.** It runs under Amir's own sign-in, and every
  athlete RPC accepts `is_coach()` — so a write that is not gated on `IS_PREVIEW` lands in that
  athlete's real record. Boot skips the backup mirror, the pull and the queue replay;
  `recordSessionToCloud()`, `sendReport()` / `flushOutbox()` (the email) and `_replayQueue()` each
  return early too. Until 2026-09-13 they did not, and tapping
  Finish, an RPE or Send while previewing wrote a `session_history` row for the athlete.
  `markLibraryDone()` already checked `IS_PREVIEW` from the start.
- **Coach preview must trust the URL, not the remembered athlete** (fixed 2026-09-20). `boot()` starts
  from `aa_athlete_id`, the athlete who last signed in on this browser, whenever a session exists — and
  Amir's coach sign-in counts as one. A stale value (his own test of a new athlete's login leaves one,
  and `coach.html` never clears it) replaced `?client=`, so every *View their app* opened the same wrong
  athlete: one athlete's button opened another's app. In preview the URL now wins and the identity lookup is skipped.
  `habits.html` never had this — it asks the server who the session is on every load, and for the coach
  that answer is empty.
- **`habits.html` had the same hole, in six places** (fixed 2026-09-13, same review pass). Their
  "Their app" tile on `coach.html` opens `habits.html?client=<id>&preview=1` the same way, on the
  same sign-in. `joinBoard()` (Crew's Join/Rename/Leave), `postNote()` (the roll-call composer),
  `pushTitle()` (equipping a title in the Locker — reachable directly, and via `joinBoard()`),
  `syncTitles()` and `autoJoinBoard()` (both unconditional on every boot) and `refreshNotePct()`
  (fired from `saveLog()` on every single habit tick — the most ordinary tap in the app) had no
  `IS_PREVIEW` check of their own, only `IS_DEMO`. All six now return early — `joinBoard()` and
  `postNote()`, the ones a tap would otherwise leave looking like nothing happened, toast **"Coach
  preview — nothing is saved."**; the rest (boot-time or already visually complete before the
  write) stay silent, matching how `IS_DEMO` already behaved everywhere. `pushNow()` itself also
  gained the check — it is not reachable from a tap, but `loadLocal()` restores `SYNC.dirty`
  straight from `<id>_hab_meta` in this browser's own storage, and boot/pagehide/visibilitychange
  call `pushNow()` directly whenever that flag is true, with no `markDirty()` (already gated)
  involved. On a machine that had ever loaded that athlete outside preview, a stale `dirty:true`
  would have uploaded whatever CFG/LOG this browser held under their key over their real cloud
  row — the same class of bug, just triggered by leftover local state instead of a tap.
- **Edit this when:** You want to change how the training app looks or behaves, add new features to the training screens, or tweak the styling.
- **Don't touch:** This file is large and self-contained. Most day-to-day changes happen on the server (programmes through coach.html and `/program-assemble`; the Library through `articles/`, `workouts/` and coach.html → Library), not here. Ask an AI assistant to guide you before structural edits.


---
*One section of the reference. The index is [`CODEBASE.md`](../../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../../docs/README.md).*
