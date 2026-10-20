# Rules — the athlete app: screens, cards, colour, navigation

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

How the data and a session behave: [`program-app.md`](program-app.md).
Reference, section by section: [`PROGRAM-APP.md`](../../PROGRAM-APP.md).

## What must never break

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
  something stays a pill (the green `intent` pill, the check-in's pills); the ⓘ has the right column to itself, centred,
  clay for a Because, a clay dot after the name is a Coach's Note, and the exercise's number is the tick (Centre Court,
  Amir 2026-10-12: the day's look is ONE CSS block, `PROGRAM-APP.md` → *Centre Court*).
  **The chevron that opens a card follows the NAME, and an open card is the same row turned green** (Amir, 2026-10-19:
  *"everytime i want to click, i click on the i button instead"* and *"i feel like everything moves"*; the directions he
  picked are *Name carries it* and *Stay put*). Nothing in the head moves or changes size when a card opens — the
  scoreboard, the *● 06* eyebrow and the 28 px capitals name are gone, the line of numbers is the scoreboard — and the
  body is carried in and out on the card's own height (`foldCard()`, the one door for every open and close;
  `scripts/headless/fold.js`). The green and the ink are ONE switch, the `--head-*` tokens on `.checklist-item`: a new
  colour in the row reads them, or it will not fade with the rest. **No Last time box on the open card either** (Amir,
  2026-10-12: *"their last time, is actually already in the reps, weight box"*): last time's weight is each empty kg
  box's LAST, a set that ran over keeps its faint line, the whole history is the ⓘ's **Your history**, and only a
  circuit keeps its strip. The kg box follows the Spine's equipment (`kgWanted()`): hidden, never removed.
- **The ⓘ's About sheet is Changeover** (Amir, 2026-10-12: *"lets go with A"*; `PROGRAM-APP.md` → *The About sheet*): a
  green top with Amir's reason signed as the week note signs (`WN_SIG` and his photo), then one question per band. Its look
  is `.ax-sheet`, which `sheetWrap()` takes off before any other page draws into the shared frame. **No WhatsApp door and
  no impact on it**: impact is drawn nowhere in the athlete app (the entry keeps it for the app's rules and the coach).
- **Home leads with the week** (Amir 2026-10-12, Quiet Frame #6; HOME-02 before it; `PROGRAM-APP.md` → *Home and Progress
  in the Centre Court look*): the greeting, This Week (the week note in its week), **Next up** (the suggested day,
  `suggestedDayId()`: since 2026-10-13 the day AFTER the last one trained, so short weeks rotate through every day; as the day's
  cover with one green button: Open Day N, or Resume and its clock), the other days as
  paper rows (`.dc-row`, `data-dl`, the P24 numeral, solid green when done), then **New from Amir** while his newest line is unread,
  then **today's habits as one card** (`PROGRAM-APP.md` → *The Ring*).
  **HOME CARRIES NO DOOR ROW OF ITS OWN** (2026-10-20, Amir: *"i think the career row is redundant, it just shows level when we can
  see level 10 times"*): the **Career row and Hold Serve's row are gone**, and what they said is where it can be acted on — the
  **level is the number inside the habit card's ring** (`habRingHtml()`, from `get_profile()` kept in `<id>_careercache`), the
  **weeks held in a row sit beside This Week's own count** (`holdRunText()` — the RUN only, because what is left this week is what
  the count beside it already says; still the athlete's own `career_facts`, never `get_profile()`; `holdCount()` is a twin of
  `get_profile()`'s loop and says nothing when it cannot be sure), and the **nearest mark is on Progress**, where the Achievements
  door names it. Without the career the ring's middle is the day's own count instead. The finish card still says what a session
  earns and the marks it moves, the finished card what it earned (`PROGRAM-APP.md` → *Career, the lightest version*). Only Next up
  carries `data-dc`. **The This cycle card, Personal records and Body weight live on Progress**, not Home. **Home never names a rest
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
- **Mid-session the tab bar hides** (WK-03, Amir 2026-09-27, option C; `PROGRAM-APP.md` → *The session bar*): from
  Start until Done the session bar is one slim line (← Home · clock · Pause · ⋯; under ⋯ Pause, Guided, Reset and, once a
  set is logged and the day is not ready, **Finish early**, two taps, `finishEarlyStep()` shared with the finish card's
  button, laid out 2 × 2 so nothing moves while a label is armed; 2026-10-13; under them one full-width **Ask Amir** row,
  `.session-timer-ask`) and
  `body.session-on` hides the tabs; ← Home or Back is the way out and the clock keeps running. A new session-bar
  control goes on that line or under ⋯, measured at 320–390 px: the clock is never cut. The week's limits are the bar's one
  extra row, under it.
- **The in-app guide (`APP_GUIDE`, *How the app works* in the sheet: `openHelp()` from your initials, the Coach tab's row,
  "How hard?", "tempo" and Guided's ?; COACH-02) and the first-session hints (`ONB_TEXT`,
  ONB-01) name real controls.** Rename a button, move a control or change when a card appears, and change its guide
  card and hint in the same PR (CNT-01, 2026-09-26: it had said "Send Data to Coach" and "tap the timer icon" for
  weeks). The Library's "ticks your habit" line reads AA Proof's config through `_wsHabitOn()`, read only.
- **Crew and the Bell** (stage81; `PROGRAM-APP.md` → *Crew and the Bell*): the tab is ADDED to the bar only once `get_bell()` answers (never in the demo or the
  coach's preview, so the static bar keeps four tabs); nothing of an athlete reaches the crew before their yes, a best names the lift and never a weight,
  posts, photos and kudos live 7 days and are left out of `BACKUP_TABLES` on purpose (`SHORT_LIVED` in `restore_backup.py`), a photo is a JPEG made on the
  phone (1080 px, about 200 KB: Amir, 2026-10-19, *"irans internet is very slow"*) and stored as a row (never Storage: a Storage file cannot be deleted from SQL), Tell the crew posts a session only with a photo,
  and an athlete Amir ticks under 13 reads only. A new crew table goes into `coach_erase_person()` and the snapshot the same day.
  **Kudos is a Like** (Amir, 2026-10-19), with **🔥 💪 👏 😍** beside it (stage82, live 2026-10-19) (`crew_emoji_list()`; the app draws them only
  while `get_bell()` hands over the list, so it degrades to the Like alone). One reaction per person: another emoji swaps it. On a **moment line** the
  Like stands alone and the four wait behind a **＋** (2026-10-20); a post keeps all five out.
  **The week comes first, and nothing on Crew is ranked by two ladders** (stage91, 2026-10-20, direction B of the audit *The Empty Room*): the top of
  the tab is the crew's own week (sessions and weeks held over the Bell's same 7 days) and it is never empty; **a finished session rings as ONE line a
  day for the whole crew**, naming only members whose switch is on, on by default and **with no notification** (Amir: *"unless if 20 ppl train, we wil
  have 20 bells"*); that line is folded on the session's **day**, never the row's write time, or a back-pay announces 39 sessions in an afternoon; the
  **board on Crew is `crew_board()`, crew members only** — `leaderboard_top()` is the whole board and is what coach.html and habits.html mean by it, so
  it is never changed for this — and it shows **one** number, this season's, with no lifetime LV chip beside it.
  **Nobody is moved off a screen they are reading, and the phone's copy is never deleted to save it** (2026-10-20): a missing-function answer hides the
  tab on the SECOND in a row, keeps `<id>_crewcache`, and leaves whoever is on Crew where they are until they move.
  **A post can be replied to; a moment cannot** (stage92, 2026-10-20, Amir: *"replies and likes like instagram"* and *"dont need the likes on
  replies"*): one level, text, 140 characters, dies with its post at 7 days, your own takes two taps to delete and Amir can remove any. There are no
  likes on a reply. **A crew post is written once however slow the line**: the phone makes one key per draft and sends it with every attempt, and the
  server hands back the post it already wrote rather than writing a second.
  **Home's one crew invitation is a PICKED LINE, not a door row** (2026-10-20): it uses the Library suggestion's slot and grammar, the week's own
  suggestion wins that slot when both want it, and it goes for good the first time Crew is opened (`<id>_crewinv`). Home still carries no door row of
  its own.
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
  Athletes still change to the new card format at their next cycle; the demo is already on it. The tab that holds the whole plan is **Progress**, second in the bar (Amir, 2026-10-12: Home · Progress · Library · Coach; it was Game Plan, and My Plan before that; `data-tab="plan"` and `goTo('plan')` are unchanged). On it, since **THE SCOREBOARD** (Amir, 2026-10-19: *"we want to go with scoreboard"*, direction A of the audit *The Long Rally*, and its last five parts on 2026-10-20: *"build all of them"*; `PROGRAM-APP.md` → *The Scoreboard*): the This cycle card, carrying the verdict over the wins (*N lifts up this cycle*), Amir's first sentence and **Read it**; **the month's goal** on its own card, in clay, because it is a job he set and not the cycle's outcome (Amir, 2026-10-20: *"a goal they have to do"*); **Your numbers** (one card — the four numbers, then *Level N* and its bar as its quiet foot, no XP figure); **Getting stronger**, the best lift's trend, which is the only thing on this tab that shows a change over time; **Your body**, one card of three rows (Personal records · Body weight · Daily habits); **What you've earned**, the Achievements and Your moments doors — every one of those rows a page whose ← comes back here; then the road of cycles, still titled **Game Plan** (since 2026-10-13 one paper row per cycle, Done / Now / Up next / Locked, under the This cycle cover; nothing on Progress jumps Home). **The tab carries no list**: anything that grows with the athlete — the moments, the four kinds of achievement, the habit week — is a page, not a block on the tab, and each of its five section titles names a different subject. **Before the first finished session it is day one** (`paintDayOne()`): the cover, one line, what can be filled in today and the plan, never a screen of zeros. Only the current cycle opens expanded;
  past and future cycles are folded (Amir, 2026-09-26, PLAN-01), and the welcome's button opens Day 1.
