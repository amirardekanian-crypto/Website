# Rules — the athlete app (`program.html`): data, sessions, saving

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

The look and the screens: [`program-app-look.md`](program-app-look.md).
Reference, section by section: [`../ref/program-app/INDEX.md`](../ref/program-app/INDEX.md).
The data shapes: [`../../SCHEMA.md`](../../SCHEMA.md). The coaching rules: the rule index in [`../../.claude/COACHING-PRINCIPLES.md`](../../.claude/COACHING-PRINCIPLES.md).

## What must never break

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
- **A CACHE bump tells the athletes by itself** (Amir, 2026-10-19: *"every time there is a change in the app, and
  its updated, i want everyone to be notified to close their app from background and re open it. i dont know how
  to make this a rule or a memory"*; `PROGRAM-APP.md` → *A new version is ready*). **There is no rule to remember:
  the code is the rule.** An installed app left in the background keeps the OLD page until it reloads, so both
  apps watch `navigator.serviceWorker` for `controllerchange` (`initVersionWatch()`, `swTookOver()`) and say
  **"A new version of the app is ready"** with **Reload** and **Not now** — the note box in the middle of the
  screen, **in clay** (Amir picked it from three, 2026-10-19: *"lets go with C but in ckay"*). It never hides
  itself: program.html is `aaToast()` with the new `tone: 'clay'` and `ms: 0` (a note that stays until it is
  answered) from `paintNewVersion()`, AA Proof the same box in its own look (`UI.newver`). A **first install** says nothing
  (`_hadWorker`), nothing is said **mid-session** (the line waits and lands when the session is over), and the
  whole thing stands down in the **embed**, the demo and the coach's preview (`versionWatchOff()`): the embed's
  iframe is a client of the same worker, so a reload there would reload the wrong document. An app resumed from
  the background never navigates, so `swCheck()` asks for a fresh `sw.js` on the foreground and on `online`, at
  most once every 20 minutes. Five functions, one set per app: change both. `node scripts/headless/new-version.js`.
