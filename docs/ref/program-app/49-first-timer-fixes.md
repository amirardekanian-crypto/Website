## 🧭 First-timer fixes (2026-10-11, found by walking the app: `docs/record/CLIENT-APP-MAP.md`)

Seven small changes, all found while mapping the app as a first-time client and each checked in a phone-width browser
(`scripts/headless/first-timer.js`, which fails on the unfixed code):

- **The Library's counts retry.** `loadLibCounts()` used to mark itself loaded after a failed first load (offline), so the doors read
  "0 Sessions / 0 Reads" for the rest of the visit. A failed load now leaves the counts blank and the next visit asks again.
- **Game Plan's dates are the cycle's own local days.** `fmtDate()` and `daysUntil()` read `YYYY-MM-DD` as UTC midnight, so west of UTC the
  header and the "N days left" banner showed the day before (`isoDay()` now reads it as a local day, as `cycDate()` always did).
- **Reset clears a circuit's round ratings too** (`resetDay()`); a circuit's kg boxes stay, like a set's weights. The guide already said RPEs clear.
- **The sore-only line reads "Your check-in said you were sore today."** (it said "suggested a sore today"). Lower and short days are unchanged.
- **Sign-in's "Message Amir" is a link** (`#si-help-wa`, set in `showSignIn()` from `COACH_WHATSAPP`) opening WhatsApp with "Hi Amir, I've lost my login details for the app."
- **The grey Begin button counts the answers** ("0 of 5 answered", then "Begin session ▶") so a first-timer sees why it is grey.
- **After the last card closes the page scrolls to the finish card** (`nudgeFinishCard()`: a standard card's fold, a circuit's last round, a
  warm-up/simple tick), as a fold already scrolled to the next card. Never in Guided, which has its own way there.
  Both it and Guided's last button go through `scrollFinishCard()`: plain centring, except when the card carries Career Mode's "what the session moves" lines
  (`.cf-moves`, catalogue switch on). Those make it taller than a short phone, so it slides to put its top on screen if Done stays on screen, and Done wins when both cannot
  (first-timer.js §7; at 320 × 640 the card is ~810 px, so only Done fits). Catalogue off, it is the plain centring it always was.

The in-app guide's "Getting around" now lists the tabs in the bar's order (Home · Coach · Library · Game Plan) and "How your program is
structured" puts the "Why This Cycle Matters" note on Game Plan, where it is.

### The first-timer pass, part two (Amir's calls, 2026-10-11)

Amir picked these after the map showed them (`docs/record/CLIENT-APP-MAP.md`, Part 2). They share one new piece, **`aaToast()`**: **a note in a box in the
middle of the screen** (Amir: "all the notes should appear in a box in the middle of the screen"), one at a time, a **Got it** button (or **Start** /
**Not now** for the clock offer), gone by itself after six seconds (twenty for the clock offer). It never dims or blocks the page, so logging can go on
under it. Since 2026-10-13 it is a green cover box above the sheets (z 215; *The sheets and the notices*, above). Checked in `scripts/headless/first-timer.js`.

- **A first-timer's tap on a closed card's number opens it** (`toggleCheckOnly()`; the number has been the tick-all since Centre Court
  round 2): ticking every set at once logs no weight and no RPE, so nothing to
  remember. Until `onbVeteran()` (cycle 2 or later, a finished session, or a stored last-time weight) it opens the card and says "Log each set in the open
  card: the weight, the circle, then how hard it was." (the circle there is the set's own). After that the number is the as-written shortcut it always was.
- **A set ticked with an empty kg box nudges** (`kgNudge()`): the box pulses and a note says "No weight saved on that set. Type it in the
  kg box." The 2026-09-26 rule stands (a tick on an empty box still records no weight; nothing is invented). A first-timer is told every time,
  a returning athlete once a session (per day, in memory). Never in Guided, whose rest screen asks for the weight; no nudge where the kg box is hidden.
- **The clock is offered once a day** (`offerClock()`, key `<id>_clockasked_d<day>`, cleared by Reset): a set, warm-up or circuit ticked with
  the clock not running says "The session clock isn't running." with **Start**, which goes through the readiness check as it always does.
  It waits for a tick with no weight nudge. ⚠ A late start under-reports the session's duration and load; the offer comes at the first tick so it is late by seconds.
- **The Welcome has a ✕** and the phone's Back closes it (`topLayer()` first, `navSync()` on open and close).
- **Game Plan's Active card: only its banner goes Home** (`cycleCardHTML(…, { bannerOnly })`); reading its text no longer throws you out.
  The Done card (Archive) and Up next (Game Plan) still take a tap anywhere. **Superseded 2026-10-13**: the cards became Progress's
  road (`cycleCardHTML()` is gone) and nothing on Progress jumps Home; the current cycle's row folds and unfolds in place.
- **The rest pill is removed** (see *The rest offer is gone*, above).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
