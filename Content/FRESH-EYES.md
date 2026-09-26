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

**9 done · 8 partly done · 27 open**, of 44. Each was checked against the code on `main`.

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

**Done:** COACH-01, DS-02, READY-01, LOG-01, REL-01, PRIV-01, CNT-01, LOG-02, HOME-03.

**Partly done, and what is still open on each:**
- **WK-01.** The quick part is done. Still open: kg on the rest screen beside reps and RPE, the live row
  pinned above the footer (it sits under it at 390 px), and circuits as one step per round.
- **PRF-04.** The three misfires are fixed (display only). Still open: a rest day that *credits* the
  other habits, which changes scoring (see *Open calls*).
- **WK-03.** Done: the Guided label colour (#234), the clock never clipped and the label on one line at
  any width, and "In progress · Resume" on the day card (#244). Still open, with the session project:
  a slim session bar, and hiding the tab bar mid-session with a clear "Leave session" (needs NAV-01).
- **HOME-02.** Training leads Home. Still open: the Today block (next session with Start or Resume),
  compact rows for habits, records and weight, and quiet empty states.
- **SEAM-01.** Habits are ticked on Home. The full Proof app still has no way back to training,
  offers a second install, keeps its own dark-mode switch, and reads workout ticks only at launch.
- **DATA-01.** Each athlete changes format when their next cycle is written. Nothing to build.
- **REC-01.** The estimated max still sits on the working card during the set.
- **PLAN-01.** Game Plan still opens on the finished cycle with every card expanded, and the welcome
  still sends a new athlete to the plan instead of Day 1.

**Open.** P1: WK-02, CARD-01, HOME-01, NAV-01, A11Y-01. P2: PROG-01,
PRF-01, PRF-02, PRF-03, COACH-02, NAV-02, WK-04, ONB-01, DS-01, CARD-02, CARD-03, BW-01,
DATA-02. P3: DS-03, CONS-01, SHEET-01, PRF-05, WK-05, LIB-01, POL-01, POL-02, DOC-01.

## Next, in order

**REL-01 is done** (#237, 2026-09-26): both apps open with no signal from `plancache`; the full
account is `PROGRAM-APP.md` → *No signal*.

**PRIV-01 is done** (#238, 2026-09-26, Amir's call B): every line about the board reads `boardState()`
(`'on' | 'coming' | 'off'`); a coached athlete who has not trained yet is told the name they will appear
under, can change it, and can keep off in advance. Full account: `HABITS.md` → *Who is on it*.

1. **The rest of "stop the bleeding":** A11Y-01.
2. **Foundations:** NAV-01 (Back closes the top layer), then HOME-01 (the week built from session
   history) with HOME-02's Today block.
3. **The session:** CARD-01, WK-02, WK-01's layout part, CARD-02, CARD-03, WK-04, ONB-01, WK-05.
   Confirm the card freeze with Amir first (below).
4. **Home and progress:** REC-01 (the estimate off the card), PROG-01, PLAN-01, BW-01, DATA-02.
5. **Coach and Proof:** COACH-02, NAV-02, SEAM-01 (after the habit count below), PRF-01, PRF-02,
   PRF-03.
6. **System and polish:** DS-01, DS-03, CONS-01, SHEET-01, PRF-05, LIB-01, POL-01, POL-02, DOC-01.

## Open calls and things to watch (put these to Amir)

- **The demo breaks two of his rules.** It has a "Week 4 — Deload" notes card instead of
  `weekNotes.last` (REC-4; the demo has no week notes at all), and "Use 2–3 kg" in a notes card
  rather than in that exercise's Coach's Note (PRG-2). The words were left as written when the demo
  was converted (#232). Fixing them is a programme write, so the programme-run rules in CLAUDE.md
  apply.
- **The card freeze** (fork 4 B): no new exercise-card features until most athletes are on the new
  format. CARD-01 to CARD-03 re-lay the card rather than add to it; confirm that before designing.
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
  Nudge copy already treats it kindly. Amir's call; it changes both scorers.
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

> Continue the Fresh Eyes work. Read `Content/FRESH-EYES.md` first, then CNT-01's entry on the Fresh
> Eyes page (https://claude.ai/artifact/4LwKCKqWd4DU2qVRxB7PEb). Start with CNT-01 (the copy that still
> describes an older app) using the same loop as before: restate the problem, give two or three
> directions with trade-offs and your recommendation, name the architectural consequences, and wait for
> my yes before building. WK-01's quick part comes after it.
