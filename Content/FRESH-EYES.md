# Fresh Eyes: the app audit, what is done, and how to continue

The UX and product audit of the two athlete apps (`program.html`, and AA Proof in `habits.html`),
made on 2026-09-24, and the work that followed it. **A new chat picking this work up reads this file
first.** Amir's two pages are private claude.ai artifacts; read them with the Artifact tool's `read`:

- **Fresh Eyes**: the audit and its 44-item backlog, each item marked done, partly done or open
  (updated 2026-09-26). https://claude.ai/artifact/4LwKCKqWd4DU2qVRxB7PEb
- **Five Forks**: his five follow-up decisions, all decided and live.
  https://claude.ai/artifact/8XWzfgpJzzkyXXWBmWG7Yd

Each item's full problem, evidence, root cause and dependencies are on the Fresh Eyes page (anchor
`#<ID>`). This file holds the status, the order, the open calls and the working recipe.

## How Amir wants it done

1. One item at a time: the next one in the order below, or the one he names.
2. Before any code: restate the problem, give two or three genuinely different directions with their
   trade-offs, recommend one, and say what each changes in the architecture.
3. Check the chosen direction against the rest of the app before building: the things that exist
   twice (CLAUDE.md lists them), the two scorers, sync, and the tour and manual.
4. **Build only after his yes.** His "approve yourself" covered Five Forks 1 to 3 only.
5. Keep what works. Never remove a feature without saying so. No duplicate systems. Make the
   smallest architectural change that solves it.
6. After each item, report WHAT CHANGED · WHY · WHAT PROBLEM IT SOLVES · FILES · PRESERVED · NEW
   INTERACTIONS · SIDE EFFECTS · WHAT TO TEST, then ask: *"Do you want to continue to the next
   prioritized improvement, or review this one further?"*
7. *"I do NOT want you to be agreeable."* Push back, with evidence.
8. Ship it live: one PR per item, merged to `main`, and the deploy confirmed (recipe below).

## Where it stands (2026-09-26)

**16 done · 8 partly done · 20 open**, of 44. Each was checked against the code on `main`.

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

**Done:** COACH-01, DS-02, READY-01, LOG-01, REL-01, PRIV-01, CNT-01, LOG-02, HOME-03, HOME-01, BW-01, SHEET-01, PLAN-01, REC-01, DATA-02, HOME-02, WK-02, PRF-04 (Amir left rest days as they are, 2026-09-27).

**Partly done, and what is still open on each:**
- **WK-01.** The quick part is done. Still open: kg on the rest screen beside reps and RPE, the live row
  pinned above the footer (it sits under it at 390 px), and circuits as one step per round.
- **WK-03.** Done: the Guided label colour (#234), the clock never clipped and the label on one line at
  any width, and "In progress · Resume" on the day card (#244). Still open, with the session project:
  a slim session bar, and hiding the tab bar mid-session with a clear "Leave session" (needs NAV-01).
- **A11Y-01.** The training app is done on the screens measured. Still open: AA Proof's small type and
  its accent buttons in dark mode (3.35:1), which go with PRF-02 / DS-03; and pinch-zoom in program.html
  (`user-scalable=no`). Following the phone's dark setting is not wanted: the athlete chooses (Amir, 2026-09-27).
- **NAV-01.** Back closes the top layer in both apps. Still open: one close grammar for the buttons
  (← for screens, ✕ top-right for overlays, drag or tap outside for sheets).
- **POL-01.** Swept. Still open: the rest screen still lets the card show through faintly (97%), the
  Quality sheet's "How we measure it" names tests athletes never meet (Amir's words to change), and
  returning from a Library session resets the scroll.
- **SEAM-01.** Habits are ticked on Home. The full Proof app still has no way back to training,
  offers a second install, keeps its own dark-mode switch, and reads workout ticks only at launch.
- **DATA-01.** Each athlete changes format when their next cycle is written. Nothing to build.

**Open.** P1: CARD-01. P2: PROG-01,
PRF-01, PRF-02, PRF-03, COACH-02, NAV-02, WK-04, ONB-01, DS-01, CARD-02, CARD-03. P3: DS-03, CONS-01, PRF-05, WK-05, LIB-01, POL-02, DOC-01.

## Next, in order

**REL-01 is done** (#237, 2026-09-26): both apps open with no signal from `plancache`; the full
account is `PROGRAM-APP.md` → *No signal*.

**PRIV-01 is done** (#238, 2026-09-26, Amir's call B): every line about the board reads `boardState()`
(`'on' | 'coming' | 'off'`); a coached athlete who has not trained yet is told the name they will appear
under, can change it, and can keep off in advance. Full account: `HABITS.md` → *Who is on it*.

1. **"Stop the bleeding" is done** (2026-09-26): REL-01, PRIV-01, CNT-01, WK-01's quick part, LOG-02, PRF-04,
   HOME-03, WK-03's quick parts, A11Y-01 in the training app. So are NAV-01 (both apps), HOME-01, BW-01,
   DATA-02's safe part, SHEET-01 and POL-01 (#239–#252, Amir: "keep going, only pause if you want me to choose").
   **Amir answered four of the six calls** (2026-09-26, each his recommended option): the Today block →
   a mockup first; Game Plan → fold past and future (#254); the estimate → off the card (#255); the
   unfinished day → ask the athlete on their next open. The last two on 2026-09-27: a rest day in Proof →
   leave it; the phone's dark setting → the athlete chooses.
2. **Foundations:** done. HOME-02 shipped from Amir's notes on the mockup (#258): no separate Today card, no
   rest-day design ("we don't know their rest days"); done days small, undone days big, the in-progress card.
3. **The session** (the card freeze is lifted): WK-02 is done (#260). CARD-01, CARD-02 and CARD-03 are one
   mockup (https://claude.ai/artifact/EzD59Z2yYA2pXWyqFxQ8rz, 2026-09-27). Amir answered its three calls, each
   the recommended option: **how to do it** (video and cues) is one folded row that opens by itself only when
   the athlete has no history for the lift; **a finished card folds** after the last set's RPE and the next
   one opens in view; **the log columns follow the work** (kg for loaded, reps only for bodyweight, seconds
   for a timed hold; an athlete who has logged a weight on that exercise keeps the kg box). On the rest of
   the layout he has notes first: get them, adjust the mockup, then build. After it: WK-01's layout part,
   WK-04, ONB-01, WK-05.
4. **Home and progress:** PROG-01.
5. **Coach and Proof:** COACH-02, NAV-02, SEAM-01 (after the habit count below), PRF-01, PRF-02,
   PRF-03.
6. **System and polish:** DS-01, DS-03, CONS-01, PRF-05, LIB-01, POL-01, POL-02, DOC-01.

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
  (`dayQualifies()`); the strip counts ticks ("1 of 5 done"). Settle it in the Today block.
- **Records start slowly** for athletes who only tick: an untouched box records no weight, so their
  records fill once they type a weight or tap Same as last. That is the intended cost of LOG-01.
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
- Read `PROGRAM-APP.md` or `HABITS.md` before touching an app. Bump `CACHE` in `sw.js` (`aap-v37`
  now) whenever a cached app file changes.
- Ship: commit, push, open the PR with the GitHub MCP, merge with `merge_pull_request` (it wants the
  full 40-character head SHA), then confirm the deploy with
  `https://api.github.com/repos/amirardekanian-crypto/Website/deployments?environment=github-pages&sha=<merge sha>`
  and that deployment's `/statuses` reading `success`. From these containers the live site and
  Supabase's REST API are proxy-blocked; the Supabase MCP works (project `bvipfipbdcyqnbczjmaq`).
- SQL goes in `supabase/stageNN_*.sql` and is applied with the MCP.
  `stage40_history_readiness.sql` was applied under the migration name `stage39_history_readiness`
  (a file-name clash, renamed afterwards).

### Render checks, headless

The app cannot reach Supabase from here, so stub it and feed it a local programme.

1. **Fixture.** Run `select data from programs where athlete_id='demo'` with the Supabase MCP and
   save the result as `data/demo.json`. Everything in `data/` is gitignored: never commit it. For a
   signed-in look, copy it to `data/audit_athlete.json` with `athlete.id` set to `audit_athlete`,
   cycle `startDate`/`endDate` that put today inside cycle 2, and a few made-up Coach's Notes. With
   the server stubbed, `boot()` falls back to `data/<id>.json`.
2. **Serve** the repo: `python3 -m http.server 8765 --bind 127.0.0.1`.
3. **Browser.** Playwright is installed globally (`require('/opt/node22/lib/node_modules/playwright')`)
   and Chromium is at `/opt/pw-browsers/chromium-*/chrome-linux/chrome`; launch it with
   `--no-proxy-server`. Use a 390×844 context with `isMobile`, `hasTouch` and
   `serviceWorkers: 'block'`, and abort every request that isn't to localhost. Fonts then fall back;
   for exact screenshots, curl the Google Fonts CSS and its woff2 files into a folder and fulfil the
   font requests from it.
4. **Stub the SDK** before any app script runs (`addInitScript`), so every call fails fast, as if
   offline:
   ```js
   const mk = () => {
     const res = { data: null, error: { message: 'offline (stub)' } };
     const fn = function () { return p; };
     const p = new Proxy(fn, {
       get(t, k) {
         if (k === 'then') return (ok, bad) => Promise.resolve(res).then(ok, bad);
         if (k === 'data') return { session: null, subscription: { unsubscribe() {} } };
         return p;
       },
       apply() { return p; }
     });
     return p;
   };
   window.supabase = { createClient: () => mk() };
   Object.defineProperty(window, 'supabase', { value: window.supabase, writable: false });
   ```
5. **Seed and open** `program.html?client=audit_athlete`. For an engaged athlete, set
   `<id>_welcomed`, `a2hs_dismissed_v1`, `<id>_histcache` (the app's own `demoHistory()` returns one
   in the real format), `<id>_hab_wt`, `<id>_1rm` and `<id>_hab_card`. Take `spinecache` and
   `qualcache` from `public.get_exercises()` (221 entries on 2026-09-26; keep only the fixture's
   `exId`s) and `public.get_qualities()` (10).
6. **Check** for `pageerror`, then screenshot at 390 px in light and dark. CLAUDE.md covers the
   headless quirks (scroll-reveal, the 100vh hero).

## Paste this to start the next chat

> Continue the Fresh Eyes work. Read `Content/FRESH-EYES.md` first, then the Fresh Eyes page
> (https://claude.ai/artifact/4LwKCKqWd4DU2qVRxB7PEb). Stages one and two are done. Ask me to confirm the card
> freeze, then start the session project (CARD-01 first) with the same loop as before: restate the problem,
> give two or three directions with trade-offs and your recommendation, name the architectural
> consequences, and wait for my yes before building.
