# Fresh Eyes: the app audit, what is done, and how to continue

The UX and product audit of the two athlete apps (`program.html`, and AA Proof in `habits.html`),
made on 2026-09-24, and the work that followed it. **A new chat picking this work up reads this file
first.** Amir's two pages are private claude.ai artifacts; read them with the Artifact tool's `read`:

- **Fresh Eyes**: the audit and its 44-item backlog, each item marked done, partly done or open
  (updated 2026-09-27). https://claude.ai/artifact/4LwKCKqWd4DU2qVRxB7PEb
- **Five Forks**: his five follow-up decisions, all decided and live.
  https://claude.ai/artifact/8XWzfgpJzzkyXXWBmWG7Yd

Each item's full problem, evidence, root cause and dependencies are on the Fresh Eyes page (anchor
`#<ID>`). This file holds the status, the order, the open calls and the working recipe.

## How Amir wants it done

1. One item at a time: the next one in the order below, or the one he names.
2. Before any code: restate the problem, weigh two or three genuinely different directions with their
   trade-offs and what each changes in the architecture, and pick one (put them to him when the call is
   his, rule 4).
3. Check the chosen direction against the rest of the app before building: the things that exist
   twice (CLAUDE.md lists them), the two scorers, sync, and the tour and manual.
4. **Build only after his yes on a call that is his** (a design direction, a change he would see
   differently). Everything else, build and ship without stopping: *"keep going down the list and only
   pause if you want me to choose, but keep going"* (2026-09-26).
5. Keep what works. Never remove a feature without saying so. No duplicate systems. Make the
   smallest architectural change that solves it.
6. After each item, report WHAT CHANGED · WHY · WHAT PROBLEM IT SOLVES · FILES · PRESERVED · NEW
   INTERACTIONS · SIDE EFFECTS · WHAT TO TEST, briefly, then go on to the next item.
7. *"I do NOT want you to be agreeable."* Push back, with evidence.
8. Ship it live: one PR per item, merged to `main`, and the deploy confirmed (recipe below).

## Where it stands (2026-09-27)

**31 done · 5 partly done · 8 open**, of 44. Each was checked against the code on `main`.

| PR | What shipped | Items |
|---|---|---|
| [#228](https://github.com/amirardekanian-crypto/Website/pull/228) | WhatsApp first: no in-app chat in the app or coach.html; training leads Home; no gold anywhere, Proof included | COACH-01, HOME-02, DS-02, CNT-01 |
| [#229](https://github.com/amirardekanian-crypto/Website/pull/229) | Readiness rules decided: REC-2 rewritten from 40-plus papers and 348 real check-ins, REC-6 split out | READY-01 |
| [#230](https://github.com/amirardekanian-crypto/Website/pull/230) | WhatsApp from the end of every session and every exercise's ⓘ; session notes are read, not answered | COACH-01, CNT-01 |
| [#231](https://github.com/amirardekanian-crypto/Website/pull/231) | "My Plan" is "Game Plan", with a route icon | PLAN-01, CNT-01 |
| [#232](https://github.com/amirardekanian-crypto/Website/pull/232) | The demo is on the new card format; no new card features until most athletes are | DATA-01 |
| [#233](https://github.com/amirardekanian-crypto/Website/pull/233) | Weight boxes open empty with last time's weight under them; Same as last; Personal Records fill themselves | LOG-01, REC-01 |
| [#234](https://github.com/amirardekanian-crypto/Website/pull/234) | The check-in sets today's targets (amber, red, sore); coach.html shows the plan and a run of low days | READY-01, WK-03 |
| [#235](https://github.com/amirardekanian-crypto/Website/pull/235) | Today's habits ticked on Home: AA Proof's own page, embedded (`habits.html?embed=1`) | SEAM-01 |
| [#237](https://github.com/amirardekanian-crypto/Website/pull/237) | No signal: both apps open from the plan saved on the phone (`plancache`); uploads wait for a pull; the error screens name the cause | REL-01, CNT-01 |
| [#238](https://github.com/amirardekanian-crypto/Website/pull/238) | Proof tells a coached athlete, by name, that they go on the board after their first session, and offers **Keep me off the board** before it happens (`boardState()`, `keepOffBoard()`) | PRIV-01 |
| [#239](https://github.com/amirardekanian-crypto/Website/pull/239) | The guide's finish, report and rest-timer cards name the real buttons; the Library promises a habit tick only when that habit is on (`_wsHabitOn()`); the guide joins CLAUDE.md's keep-in-sync rules | CNT-01 |
| [#240](https://github.com/amirardekanian-crypto/Website/pull/240) | Guided never pauses a running clock, reopens at the first unfinished set, and its last button (Finish Session ✓) really finishes, or lands on "Wrap up early?" when a circuit is open | WK-01 |
| [#241](https://github.com/amirardekanian-crypto/Website/pull/241) | Anything that deletes takes two taps (`armedTap()`): Reset Session, a weight reading, a Personal Record; Reset moved away from Send | LOG-02 |
| [#242](https://github.com/amirardekanian-crypto/Website/pull/242) | Proof's nudge never asks for the session it cannot tick (`sessionLeft` / `freeDone`), OPEN YOUR PROGRAMME opens the programme, "logged nothing" means nothing | PRF-04 |
| [#243](https://github.com/amirardekanian-crypto/Website/pull/243) | The install ask waits for a finished session, says what works on that phone (no dead Install button), and Proof stops asking coached athletes for a second install | HOME-03 |
| [#244](https://github.com/amirardekanian-crypto/Website/pull/244) | The session bar never clips the clock or wraps its label (two rows under 480 px); a day started today shows "In progress · Resume" on Home | WK-03 |
| [#245](https://github.com/amirardekanian-crypto/Website/pull/245) | Dark mode readable (`--green-ink`/`--clay-ink` text tokens, a dark rest timer, the habits card), grey tab bar at 11 px, no label under 11 px, 44 px session rating and ⓘ | A11Y-01 |
| [#246](https://github.com/amirardekanian-crypto/Website/pull/246) | The phone's Back closes the top layer in the training app (one guard entry, `topLayer()` reads the page) instead of leaving the app | NAV-01 |
| [#248](https://github.com/amirardekanian-crypto/Website/pull/248) | This Week is built from the session history: Done pills that last the week, the right day suggested, "2 of 3 sessions done this week", updated without a reload | HOME-01 |
| [#249](https://github.com/amirardekanian-crypto/Website/pull/249) | The weigh-in box sits under the headline number, above the chart and every reading; the trend lines read in dark mode | BW-01 |
| [#250](https://github.com/amirardekanian-crypto/Website/pull/250) | A session is filed under the local day it was finished, one date for every save of it; a session past midnight keeps its clock, check-in, note and rating for 6 hours | DATA-02 |
| [#251](https://github.com/amirardekanian-crypto/Website/pull/251) | The info sheet keeps a trail: ‹ Back at the top, and the phone's Back steps back a page before it closes the sheet | SHEET-01 |
| [#252](https://github.com/amirardekanian-crypto/Website/pull/252) | Polish: the side rail only in a day view, under the overlays and labelled; every screen lights its tab; the demo banner clears the dark toggle and Guided's ✕; no AA Proof line in the coach preview; four dead functions gone | POL-01 |
| [#254](https://github.com/amirardekanian-crypto/Website/pull/254) | Game Plan folds past and future cycles to a slim row (the current one open); the welcome's button opens Day 1 (Amir: "Fold past and future") | PLAN-01 |
| [#255](https://github.com/amirardekanian-crypto/Website/pull/255) | The estimated max is off the working card; Personal Records fill themselves and keep "+ Log a max" (Amir: "Off the card, keep in Records") | REC-01 |
| [#258](https://github.com/amirardekanian-crypto/Website/pull/258) | Home led by the training: a small cycle line, done days as small rows, the in-progress card with Resume, habits / records / weight as one row each, quiet empty states, never a rest day (Amir's notes on the mockup) | HOME-02 |
| [#256](https://github.com/amirardekanian-crypto/Website/pull/256) | An unfinished day is asked about on a later open: "Tuesday's Day 2 was never sent", Send it (filed under Tuesday) or Clear it (Amir: "Ask the athlete next open") | DATA-02 |
| [#247](https://github.com/amirardekanian-crypto/Website/pull/247) | The same in AA Proof: Back closes a sheet, Settings a step at a time, a tab; never in the embedded strip | NAV-01 |
| [#260](https://github.com/amirardekanian-crypto/Website/pull/260) | The rest timer keeps time in a pocket: counts from a timestamp, opens running, beeps (Sound on/off) and buzzes at zero, keeps the screen awake; ticking a set offers **Rest 2:00** above the tab bar; the card's Rest button is 44 px | WK-02 |
| [#263](https://github.com/amirardekanian-crypto/Website/pull/263) | Guided's layout: the current set is pinned on screen above the footer on every step (it hid on 8 of 14 at 320×568); the rest screen asks the weight beside reps and RPE (Same as last); supersets and circuits come in round by round, the last round ticking the circuit; the rest screen scrolls on a short phone | WK-01 |
| [#262](https://github.com/amirardekanian-crypto/Website/pull/262) | The working card, from Amir's notes on two mockups: one line of numbers, his pills kept, a note dot, the ⓘ at the right end (clay for a Because), no history on a closed card; open, the note in two lines, Last time as a box (last set, tap for all), How to do it folded after the first time; a small done row, fold after the last RPE and the next card opens; the kg box follows the Spine's equipment | CARD-01, CARD-02, CARD-03 |
| [#264](https://github.com/amirardekanian-crypto/Website/pull/264) | One finish: the card shows progress (never "skipped") until the athlete taps Finish early twice; rate, then **Done · send to coach ✓** finishes, saves the record and sends ONE email, from an outbox on the phone that waits for signal; the finished card says where the report is (with your coach, waiting for signal, Try again); **Send the update** only after a change; **Reset** in the session bar once a day has started (Amir: "you cant cancle or reset") | WK-04 |
| [#265](https://github.com/amirardekanian-crypto/Website/pull/265) | The session bar's three buttons fit one row on a narrow phone (with Reset they ran 22 px past the bar at 360 px, 44 px at 320 px); the armed Reset reads "Reset?" | WK-04 |
| [#266](https://github.com/amirardekanian-crypto/Website/pull/266) | Three one-time hints in a new athlete's first session, one at a time and in the flow: Start or Guided under the session bar, "tap the circle" under the first set, "How hard?" under the strip that opens; each gone once the athlete does the thing (or Got it); never for anyone who has trained, synced per athlete | ONB-01 |
| [#267](https://github.com/amirardekanian-crypto/Website/pull/267) | A warm-up circuit is a list: one line per movement (letter, name, dose, ▶), its cues on a tap (a real four-movement primer opened to 1001 px, now 452 px); a circuit's rest is never invented (19 of 135 live circuits showed a 60 s nobody wrote) | WK-05 |
| [#268](https://github.com/amirardekanian-crypto/Website/pull/268) | An athlete can sign out: the initials button top right (where the floating dark toggle was) opens Theme, Install, How the app works, Privacy and Sign out; signing out sends the waiting report, the session queue and the progress first, then nothing more; AA Proof's Settings has Sign out too | NAV-02 |
| [#269](https://github.com/amirardekanian-crypto/Website/pull/269) | From Start until Done the session bar is one slim line (← Home, the clock, Pause, ⋯ for Guided and Reset) and the tab bar hides: mid-session chrome goes from 26% of an iPhone SE screen to 9% (Amir's option C of the mockup); the clock is never cut, past an hour included | WK-03 |
| [#270](https://github.com/amirardekanian-crypto/Website/pull/270) | The guide opens in the sheet, from your initials, one row on the Coach tab, and the jargon itself ("How hard?" on the RPE strip, "tempo" in an open card, a ? in Guided's top bar), each opening its own card; a Guided mode card; the Coach tab is Amir's voice | COACH-02 |
| [#271](https://github.com/amirardekanian-crypto/Website/pull/271) | The This cycle card at the top of Home (Amir's pick: it replaces the small cycle line and opens Game Plan): the week, sessions done against planned, and up to three effort-matched wins ("+2.5 kg, same reps, same RPE", "+3 reps at 16 kg", "felt easier: RPE 8 → 7"), for any reps, bodyweight moves and holds | PROG-01 |
| [#272](https://github.com/amirardekanian-crypto/Website/pull/272) | The working card's **Same as last** button is gone (Amir: *"its a duplicate of what can be seen in history"*): the open card's Last time box shows last time, and a weight typed in set 1 fills the sets below; Guided's rest screen keeps its own | CARD-01, LOG-01 |
| [#273](https://github.com/amirardekanian-crypto/Website/pull/273) | The headless harness joins the repo (`scripts/headless/`: the Supabase stub, a made-up athlete and programme, `smoke.js` for both apps), and this hand-off | — |
| [#274](https://github.com/amirardekanian-crypto/Website/pull/274) | One RPE control everywhere: a set, a circuit's rounds ("R2 · How hard?", on its own line), Guided, the session rating and Log a max (6–10 buttons, not a text box) are the same 44 px buttons, and a second tap clears a pick | CONS-01 |
| [#275](https://github.com/amirardekanian-crypto/Website/pull/275) | One type scale in the training app: seven sizes and a field size (`--fs-` tokens), nothing under 11 px, buttons in the app's font, only weights that load, every field 16 px, a pre-commit guard; the line of numbers is never cut (the rest time ran off the card at 360 px) | DS-03 (part) |
| [#276](https://github.com/amirardekanian-crypto/Website/pull/276) | One close grammar: ← top left for a screen, ✕ top right for a full-screen overlay (Guided's moved there), a sheet slides down (a handle, a swipe, a tap above it); the sheets' Close and Skip for today are 44 px targets | NAV-01 |

**Done:** COACH-01, DS-02, READY-01, LOG-01, REL-01, PRIV-01, CNT-01, LOG-02, HOME-03, HOME-01, BW-01, SHEET-01, PLAN-01, REC-01, DATA-02, HOME-02, WK-02, PRF-04 (Amir left rest days as they are, 2026-09-27), CARD-01, CARD-02, CARD-03 (no box for a hold's seconds: Amir, "Leave the tick"), WK-01 (#240 and #263), WK-04 (#264 and #265, with the session bar's Reset Amir asked for), ONB-01 (#266), WK-05 (#267), NAV-02 (#268), WK-03 (#234, #244 and #269), COACH-02 (#270), PROG-01 (#271), CONS-01 (#274), NAV-01 (#246, #247 and #276). #272 took the working card's Same as last off, a follow-up to LOG-01 and CARD-01.

**Partly done, and what is still open on each:**
- **A11Y-01.** The training app is done on the screens measured. Still open: AA Proof's small type and
  its accent buttons in dark mode (3.35:1), which go with PRF-02 / DS-03; and pinch-zoom in program.html
  (`user-scalable=no`). Following the phone's dark setting is not wanted: the athlete chooses (Amir, 2026-09-27).
- **POL-01.** Swept. Still open: the rest screen still lets the card show through faintly (97%), the
  Quality sheet's "How we measure it" names tests athletes never meet (Amir's words to change), and
  returning from a Library session resets the scroll.
- **SEAM-01.** Habits are ticked on Home. The full Proof app still has no way back to training,
  offers a second install, keeps its own dark-mode switch, and reads workout ticks only at launch.
- **DS-03.** The type scale is in (#275). Still open: one primary button (eleven styles today), which waits for
  DS-01's answer on what clay is for; AA Proof's type goes with SEAM-01.
- **DATA-01.** Each athlete changes format when their next cycle is written. Nothing to build.

**Open.** P2:
PRF-01, PRF-02, PRF-03, DS-01. P3: PRF-05, LIB-01, POL-02, DOC-01.

## Next, in order

**Waiting on Amir (2026-09-27), four calls, each on its own page:**
- **Proof's Today (PRF-01, PRF-03, PRF-05)**: https://claude.ai/artifact/TwHpG4EXEv4hj1FcPejG7y. A tighter card
  (recommended), the day leads, or the list leads; all three share the circle tick, the session last, the exact
  "N to go" and one week strip. The prototypes are CSS/JS laid over the real app in a headless page (the
  session's scratchpad `proto.js`), so the pick ports straight into `renderToday()`.
- **PRF-02's six calls**: https://claude.ai/artifact/6hB61EMUJPjCQ6hF7LH9Fe (celebrations 30 → 9 in 22 days,
  a five-step tour, Progress's next three, quests hidden when idle, the Locker's road to the next three rewards,
  Crew on the board). "Your picks" takes all six As.
- **DS-01, clay's jobs**: https://claude.ai/artifact/RkWgSFd4SR4NX1XyRdVZTN. A "look here" (recommended), B also
  the main button of each screen, C as now.
- **LIB-01, the Library's sessions**: https://claude.ai/artifact/PGrum2Hc4hy475QPxuDPNM. Two calls. The cards: A a
  list, one photo per shelf as a band with All N › (recommended), B text tiles on the rail, C a picture each
  (about 130 credits). When the app offers one: A a sore check-in (the finish card), B a finished week (Home),
  C both (recommended), D neither. The prototypes are in the scratchpad's `lib01-proto.js`. (Mark as done has one
  row ever; 25 of 302 check-ins in 90 days said sore.)

**The training app's list is done**: stop-the-bleeding, foundations, the whole session (#260–#269), Home and
progress (#258, #271), the account and the guide (#268, #270), each told in full in `PROGRAM-APP.md`. What
is left is mostly AA Proof, then design-system polish. Work it in this order:

1. **Proof's Today screen: PRF-01, PRF-03 and PRF-05.** One screen, so **one mockup for Amir first** (the
   current screen beside two or three directions, at 390 px, with real numbers), then one PR per item.
   - **PRF-01**, the main action is the quietest control: the tick is a 22 px pale ring on the emoji tile
     while "+" is a 36 px solid button, and the locked *Finish your session* row leads the list, so the
     first row you can tick starts 466 px down (the audit; about 440 px in the harness's `proof-390.png`).
     Directions: a large, obvious tick; the locked row at the end, or in the hero as a status; a shorter hero.
   - **PRF-03**, the headline disagrees with what counts: the big percentage is `dayPct`, what the day was
     worth, while the streak asks `dayQualifies()`. A rest day with everything else done shows 68% and
     counts; a free athlete can never pass about 64%. Lead with the verdict ("On target ✓", "1 to go").
     **Display only**: neither scorer changes (the phone's constants and the server's `xp_rules`). Settle
     *Proof shows twice on Home* (below) with it.
   - **PRF-05**, the week is drawn three times (the hero's 7 days, the day picker, the heat map): one strip
     that is also the day picker. It depends on PRF-01's layout.
   Proof's rules hold for all three (CLAUDE.md): update the six (HABITS.md, XP_SYSTEM.md, QUESTS.md,
   `renderManual()`, privacy.html, `tourSteps()`) in the same PR, and the tour points at real controls, so a
   moved button moves its tour step. The pre-commit guard runs on every habits.html commit.
2. **PRF-02, progressive disclosure in Proof**, with POL-02's sweep and A11Y-01's Proof leftovers (small
   type; the accent buttons in dark at 3.35:1). **Amir's calls first**: which celebrations stay full-screen
   (levels and ranks only?), a five-step tour, Progress folded to the next three milestones, Quests and
   Seasons hidden until they run, the far end of the Locker folded. Nothing is removed or revoked: rewards
   are never taken back (CLAUDE.md).
3. **DS-01, clay has three jobs**: the primary action, "needs you", and the tempo digit; status (done, past,
   block type) moves to green and neutrals. A design call, so a mockup first. Text reads `--clay-ink` /
   `--green-ink`, never the fill tokens (A11Y-01).
4. **P3 and the partly-done leftovers**, in this order: ~~CONS-01~~ (#274), DS-03 (the type scale is #275;
   one primary button waits for DS-01), LIB-01 (its two calls are Amir's, above), ~~NAV-01's close grammar~~
   (#276), POL-01's three leftovers (the
   Quality sheet's words are Amir's to give), A11Y-01's pinch-zoom (`user-scalable=no`; every field is 16 px
   since #275, so an iPhone will not zoom on a tap), and DOC-01 last.
5. **SEAM-01 waits for the count** around 2026-10-17 (below). If habit logging has not moved, fork 1 A
   (Proof in the training app's look, "← Training", one install, one theme) is next, and it takes DS-03's
   Proof half with it.

Left as it was on purpose: a working circuit's cues stay open (WK-05 was the warm-ups); fold them the way
the working card folds How to do it if Amir wants that too.

## Open calls and things to watch (put these to Amir)

- **Answered 2026-09-26:** Today block → mockup first, then built from his notes (#258) · Game Plan → fold (#254) ·
  estimate → off the card (#255) · unfinished day → ask the athlete (#256). **Answered 2026-09-27:** a rest day in Proof → leave it · dark mode → the athlete's choice · the working
  card → how-to folded (open the first time), fold after the last RPE, columns by the work; his layout notes
  come before the build.
- **The demo breaks two of his rules.** It has a "Week 4 — Deload" notes card instead of
  `weekNotes.last` (REC-4; the demo has no week notes at all), and "Use 2–3 kg" in a notes card
  rather than in that exercise's Coach's Note (PRG-2). The words were left as written when the demo
  was converted (#232). Fixing them is a programme write, so the programme-run rules in CLAUDE.md
  apply.
- **The card freeze is lifted** (Amir, 2026-09-27: "dont freeze anything").
- **Habit logging after the Home strip.** At the audit, 5 of 40 coached athletes had logged a habit
  in a week while 16 had trained in two. Count again around 2026-10-17. If it hasn't moved, fork 1 A
  (Proof in the training app's look, "← Training", one install, one theme) is the next step.
- **Proof shows twice on Home.** The card's hero says "Day complete" when the day is on target
  (`dayQualifies()`); the strip counts ticks ("1 of 5 done"). Settle it with PRF-03, which leads Proof
  with the same verdict.
- **Records start slowly** for athletes who only tick: an untouched box records no weight, so their
  records fill once they type a weight (or tap Same as last on Guided's rest screen; the card's
  button went on 2026-09-27). That is the intended cost of LOG-01.
- **One bar of signal (REL-01).** With a saved plan on the phone, a stalled connection still costs
  the 6 s `get_program` wait before the copy opens. Waiting less when a copy exists is a separate call
  (slow-but-working connections would then open on the copy more often). Raise it if athletes notice.
- **A rest day in AA Proof (PRF-04).** The session habit is locked and core, so on a rest day a coached
  athlete misses it and spends the day gate's one-miss door on it: every other habit must then be done
  for the day to count. Proof does not know the training week. Options: leave it (the door exists for
  exactly this); let the athlete mark a rest day (a new tap, and scoring on both sides: `dayQualifies()`
  and the server's copy); or read the programme's days per week and excuse that many non-training days.
  **Answered: leave it** (2026-09-27, "We dont know a rest day"). No scorer changes.
- **Follow the phone's dark setting (A11Y-01).** Both apps start light and switch only on a tap. Following the
  phone by default means athletes whose phones go dark at night see the app dark without choosing it; the
  dark theme reads properly since A11Y-01. **Answered: the athlete chooses** (2026-09-27); nothing follows the phone.
- **An unfinished day (DATA-02).** Sets ticked on a day that was never finished carry into next week and never
  reach Amir. Options: record it automatically as a partial session on the day it was logged (Amir sees
  it in coach.html like a Finish Anyway), ask the athlete on their next open ("You didn't finish Tuesday:
  send it?"), or leave it. **Answered: ask the athlete** (2026-09-26), and built.
- **The readiness thresholds** (amber at 2.5 or 0.75 under the athlete's last-10 average, red at 2.0
  or any answer at 1, sore at 2) are judgement calls. Review them at the eight-cycle review.

## How to work

- Once per clone: `git config core.hooksPath .githooks`.
- Use the branch the session names. After each merged PR, restart it from main:
  `git fetch origin main && git checkout -B <branch> origin/main`.
- Read `PROGRAM-APP.md` or `HABITS.md` before touching an app. Bump `CACHE` in `sw.js` (`aap-v73` on
  2026-09-27) whenever a cached app file changes, log the version in its comment list, and change the
  name in CLAUDE.md too.
- Test in a headless browser before every PR (below): the harness is in the repo, the checks you write
  for one item stay in the session's scratchpad.
- A font size in program.html is a `--fs-` token (`PROGRAM-APP.md` → *One type scale*); the pre-commit
  guard blocks any other. For screenshots that look like a phone, serve the harness only the font weights
  the page asks for: a route that serves every weight hides a missing face (DS-03 found four that way).
- Ship: commit, push, open the PR with the GitHub MCP, merge with `merge_pull_request` (it wants the
  full 40-character head SHA), then confirm the deploy with
  `https://api.github.com/repos/amirardekanian-crypto/Website/deployments?environment=github-pages&sha=<merge sha>`
  and that deployment's `/statuses` reading `success`. From these containers the live site and
  Supabase's REST API are proxy-blocked; the Supabase MCP works (project `bvipfipbdcyqnbczjmaq`).
- SQL goes in `supabase/stageNN_*.sql` and is applied with the MCP.
  `stage40_history_readiness.sql` was applied under the migration name `stage39_history_readiness`
  (a file-name clash, renamed afterwards).

### Render checks, headless

The apps cannot reach Supabase from a cloud container, so **`scripts/headless/`** (2026-09-27) stubs it:
`stub.js` stands in for supabase-js, `fixture.json` is a made-up athlete and programme (Alex Rivera,
`rel01_athlete`; nothing real, the repo is public), and `lib.js` opens either app signed in.

1. **Serve** the repo from its root, as a background task: `python3 -m http.server 8765 --bind 127.0.0.1`.
2. **Smoke test:** `node scripts/headless/smoke.js --out <scratchpad>/shots`. Both apps, light and dark,
   390 and 320 px: 27 checks and a screenshot per screen. Look at the screenshots, not just the count.
3. **A check for one item** is its own script in the scratchpad that requires `scripts/headless/lib.js`
   (`smoke.js` is the pattern):
   - `openProgram(browser, { w, h, dark, seed, stub, prog })` and `openProof(browser, { url, dark, cfg })`
     return `{ ctx, p }` past the loading screen; `p.errs` collects page errors.
   - `seed` writes athlete keys by suffix, e.g. `{ _setlog_Barbell_Back_Squat: [{ w: '', n: '', r: '',
     d: false, lw: '70' }] }`; `stub` switches the server's answer (`{ mode: 'offline' }`, `'5xx'`,
     `'refuse'`, `'empty'`, `stall: { get_program: true }`; the list is at the top of `stub.js`).
   - `fixture()` dates the cycles (week 2 of 5, as most live programmes are); `fixture({ dated: false })`
     is one of the undated few. `card(name)` finds an exercise card; `checker()` prints PASS / FAIL.
   - Drive the app through its own functions (`openDayView('1')`, `toggleExpand(card)`,
     `startTimerNow('1')`, `openGuided('1')`, Proof's `UI` and `render()`), then assert on the DOM and on
     `localStorage`.
4. **Real shapes** (a live programme, Spine entries, session history) come read-only from the Supabase MCP
   (project `bvipfipbdcyqnbczjmaq`) into the scratchpad. Never commit them, and never write to the database
   from a test.
5. **Headless quirks:** every request off the local server is aborted, so fonts fall back and Plausible is
   silent; Chromium's overlay scrollbar shows as a grey bar at the right edge; sheets slide in over about
   0.2 s, so wait before measuring one; a screenshot of a 100vh screen shows only the viewport (scroll, or
   set a taller viewport).

## Paste this to start the next chat

> Continue the Fresh Eyes work. Read `Content/FRESH-EYES.md` first, then the Fresh Eyes page
> (https://claude.ai/artifact/4LwKCKqWd4DU2qVRxB7PEb). The training app's list is done (#228–#272). Next is
> AA Proof's Today screen: PRF-01, PRF-03 and PRF-05. Show me one mockup of that screen first, then build
> one PR per item. After that, PRF-02 (bring me its calls), DS-01, then the P3 items in the file's order;
> SEAM-01 waits for the habit count around 17 October. Test every change headless with
> `scripts/headless/` before the PR, merge to main and confirm the deploy the same day, and keep going
> down the list. Pause only for a call that is mine: restate the problem, give two or three directions
> with trade-offs and your recommendation, then wait for my answer on that one.
