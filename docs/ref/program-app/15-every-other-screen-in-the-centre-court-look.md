## 🧩 Every other screen in the Centre Court look (2026-10-13, continuing)

Amir: *"continue until everything has a consistent design"*. One screen at a time, each its own block in the sheet named
`… IN THE CENTRE COURT LOOK (2026-10-13)`, each with its own headless suite, and the parts are always Centre Court's (a tab
screen's header as Progress's; ONE green thing per screen; paper rows with hairlines; the door row; the P24 numeral; his
signature for his voice). The plan and its order are in the audit artifact *Quiet Frame* (v2/v3).

- **Coach** (`renderNotes()`, `coachContactHtml()`; `scripts/headless/coach-tab.js`, 102 checks): the header `● YOUR COACH` ·
  **Coach Amir** · *Strength & conditioning coach*; the WhatsApp panel is the screen's one green thing (`a.coach-panel`, ONE link,
  the same `coachWhatsAppUrl()` and pre-filled message, his photo graded into the green, the eyebrow *Questions, swaps, anything
  that hurts*, **Message me on WhatsApp**, *Form videos welcome. I answer there, not in the app.*, the light-ring **Open WhatsApp**
  as a span inside the link, his signature at the foot; his photo shows once, so no small avatar by the signature); the number
  as selectable mono text (`COACH_WHATSAPP_SHOWN`); **Notes from Amir** as fold rows (`button.cn-row`, `toggleCoachNote()`, one
  open at a time, `aria-expanded`); **How the app works** as one door row. The hero, the coloured icon tiles, *Tap to read* and
  the section labels are gone.

- **Progress's road and the archive** (`paintCycleCard()`, `paintRoad()`, `roadRowHTML()`, `roadAimsHTML()`, `roadUnitHTML()`, `firstSentence()`, `toggleRoad()`,
  `toggleRoadUnit()`, `roadDoorHTML()`, `paintArchiveCover()`; `scripts/headless/progress-road.js`, 186 checks):
  - **The This cycle card is the screen's one green cover**: the current cycle's art (`cycleArtUrl()`) graded into `--hero`, the
    eyebrow *● THIS CYCLE · 2 OF 3* (a mint tick and *CYCLE COMPLETE* past the end date, *ROADMAP COMPLETE* on the last), the name in
    capitals, one mono line with the dates (`cycDate()`) and, in the last 14 days, *· 9 DAYS LEFT* (`cycleDayNo()` / `todayDayNo()`),
    then the bars and the wins as before. The days-left banner (`#sub-banner-wrap`) and the header's dates are gone (the cover says
    both).
  - **The road** (`#road-wrap` under the Game Plan title) replaces the C1–Cn meter and the photo cards: one `.road-row` per cycle,
    `is-done` / `is-now` / `is-next` / `is-locked`, the P24 numeral (solid when done), the name, a mono line (*WEEKS 6–10 · NOW*). Now is
    a fold, open by default (PLAN-01), and **short: Doors** (Amir, 2026-10-19, *"i actually like the doors, being closed, and then can be
    opened to read"*; it was *"not easy on the eyes"*: three identical 11 px mono labels, a 54 px indent, ticks on things not done, a quote
    glyph that drew as two slabs; the board is claude.ai/artifact/D8m45y13GcDWgPB3e4gjVL, direction C, 645 px closed at 390 against 1150).
    It holds the tagline, **The aims** (`roadAimsHTML()`: a 22 px green condensed numeral and the aim at 18 px / 600 on the card's ONE text
    edge, `--road-edge`, 38 px from the gutter; Up next, Locked and Home between cycles draw the same block), **Amir's first sentence,
    signed** (`firstSentence()`, the week note's cut plus two guards, which Home's week note keeps without (COM-16 and `check_program.py` too): a sentence ends at . ! or ? before a capital, a
    digit or a quote, and e.g. / i.e. / vs. / approx. / Dr. / Mr. / Mrs. / No. or a lead under three words does not end it; over 100
    characters it is set quieter at 16 px; his photo, then `WN_SIG`, left under it, a 3 px clay stripe beside both, no quote glyph) and
    two fold rows (`roadUnitHTML()`, `toggleRoadUnit()`, `.road-unit`, the `.ceil-help` grammar, 64 px): **Why this cycle matters** (*The
    rest of my note*: what is left of paragraph one, then the others, verbatim; none when the note is one sentence) and **Expected
    outcomes** (*N things to hit*; a plain 6 px dot, never a tick, which means Done, and never a ring, which is the tap-to-log circle),
    then the *Why your plan looks like this* door (from one reason, since 2026-10-13). Every word of his is shown once. The two folds
    open on their own, keep their state across a repaint (`paintRoad()` reads `.road-unit.is-open`), and an open fold is
    `visibility: inherit`, never `visible`, so a folded Now row hides it from the eye, the keyboard and a screen reader. Past the end date
    the door sits under the current cycle's Done row. Up next and Locked are folds holding the tagline, the aims and the teaser (on the
    same text edge); a Locked cycle with none of them is a plain row with its lock. The cycle before the current one opens its archive
    (›); earlier done cycles are plain rows. Folds keep their state across visits; Enter and Space work. **The first sentence of
    `message.paragraphs[0]` is what an athlete reads without a tap**, so it should stand alone. `cycleCardHTML()` and
    `toggleCycleCard()` are gone, and nothing on Progress jumps Home any more (the Active card's banner did).
  - **Home between cycles** draws the next cycle as the same Up next row (`.bt-next`, its body ids `bt-road-body-N`).
  - **The archive** (`#screen-archive`): a cover with the archived cycle's art (`archiveCycleOf()`), ← as the 44 px glass button
    (Back to Progress), *● COMPLETED · CYCLE 1*, the name and its weeks; each day as a green section title and its exercises as
    read-only paper rows (outlined numeral, name, the line of numbers); the empty state as one sentence.

- **Guided and the rest timer** (`renderStep()`, `paintStepAbout()`, `paintTimerNext()`, the timer overlay; `scripts/headless/guided-rest.js`,
  156 checks):
  - **Guided's top bar is the slim bar's green**, safe-area aware: one eyebrow line *● EXERCISE 3 OF 7 · SET 2 OF 4*
    (`#step-eyebrow` and `#step-pill` keep their elements; under 390 px the set goes on a second line), the exercise's name in capitals,
    **the card's own ⓘ** at the right end of the name row (`#step-about` clicks the card's `.ex-about`, so it opens the same About sheet
    over Guided; a Because is the clay disc), and ? and ✕ as the cover's 44 px glass buttons. The week's limits row (`#step-week`) sits
    under it on a darker green, its numbers clay-on-green. The body's own name is hidden inside Guided only.
  - **The footer** is one row on the paper under a hairline: ‹ Prev (outlined, NOT drawn on step 1), the primary green Done · Start Rest ✓
    (Finish session ✓ on the last set), Next → outlined. Labels unchanged; `--fs-body` under 400 px.
  - **The rest timer is a green band, then the paper**: the sound as an icon toggle top left (`aria-pressed`, the same
    `toggleRestSound()` and `rest_sound`), ✕ top right (`closeTimer()`: it closes in the list and skips in Guided, as the old bottom button
    did; that button is gone, and Skip → stays on the band in Guided), *● REST · BARBELL BACK SQUAT*, the ring (mint progress, white
    digits), Pause/Start the biggest button, +15s and Reset outlined. In Guided the log of the set just done sits on the paper under the
    band in the day's set-table look (48 px RPE keys, over clay, under steel), the limits line under the keys, and **Next: Barbell Back
    Squat · set 3 of 4** under it (`paintTimerNext()` from `STEP.seq`; *last set* / *last round* on the final step). The ring shrinks at the
    same 720 / 620 px heights and the screen scrolls rather than squash. Timing, sound, the wake lock, the keys and Back are unchanged.
  - **The demo banner never covers a full-screen layer** (D9): `--demo-h` is the banner's measured height (a ResizeObserver), and the timer
    and Guided offset by it (the banner is 54 px at 320 px with fallback fonts, so a fixed 44 px covered the band).
  - program.html's fonts are this site's files since 2026-10-13 and AA Proof's strip's since 2026-10-17, so every check draws the
    real faces; `scripts/headless/lib.js`'s `context()` still takes `{ fonts: true }` (Google Fonts let through), which no app needs now.

- **Personal Records and Body weight** (`paintCover()`, `ceilBoardHtml()`, `renderCeiling()`, `renderCeilingLift()`, `paintCeilingForm()`,
  `renderWeightScreen()`; `scripts/headless/records-weight.js`, 122 checks):
  - **A cover on every screen** (← as the 44 px glass button, a mint-dot eyebrow, the title in capitals) with a **scoreboard**: Records
    shows the best lift (*104 · KG BACK SQUAT*), the ratio (*1.30× · YOUR OWN BODY WEIGHT*, only with a body weight) and the lift count,
    with the old hero's sentence under it; a lift's page its latest estimate, the change since the first and the entries; Body weight
    the last reading, the change over the range (*−0.8 kg · DOWN OVER THE RANGE*) and the readings, with the average-to-average sentence.
    The green hero cards are gone. A **New best** is the cover's green foot (`--foot`), so the screen keeps one green thing.
  - **Paper rows** for lifts, entries, readings and Log a max's picker; **Log a max** (*Tested one in the gym? Add it here.*) and *Add your body weight* as
    door rows; **Due for a retest** as the day's banner (a 4 px clay stripe, *Test 5RM* as the green text link); **How this works** one
    fold, closed on every screen (it was open on the empty one); the empty state's four steps numbered 01–04.
  - **Log a max**: the picker is three sections of paper rows (2026-10-20, Amir: *"6 month later i may want to have a look, add my own
    records and check them"*) — **This cycle**, **Lifts you've done before** and **Any other lift**, the last a search over the Spine in the
    Exercises pane's own box (`.xl-search`), offering only approved entries that `recordsItself()` accepts. Every row carries its index
    into ONE array (`ceilingPicks()`), so a row can never open the wrong lift. Then the form: the set table's boxes (white, `--field`),
    the day's 48 px RPE keys, the estimate and its grade as a two-track scoreboard, Save as the primary green.
  - **Charts green**: the line and every dot (the dots were clay; clay is "look here" only), grey axes; a sparkline is clay only for a
    real fall. **The range chips** have their own class, `.wt-chip` with `aria-pressed` (defect D6: a second global `.chip` rule had
    restyled them). Every ✕ is a 44 px target (it was 26). *Delete all my weight history* is quiet clay text, two taps as before.
  - Every write is the same (`<id>_1rm`, the tombstones, `<id>_hab_wt`, one reading a day), checked field by field.

- **The Library** (`goLibrary()`, `setLibPane()`, `renderSessionsWorld()`, `renderBefore()` / `toggleBefore()`, `renderExerciseLibrary()`;
  `scripts/headless/library.js`, 140 checks; Amir, 2026-10-13: *"Remove the doors"*, *"Fold after first view"*):
  - **No doors page.** The tab opens straight to a pane under the header (*● TRAIN IT, LEARN IT, KNOW IT* · **LIBRARY**): one switch,
    Sessions · Playbook · Exercises (`#lib-switch`, `role=tablist`, each tab with its count in mono under the word; arrow keys, Home and
    End move along it). The counts are bare numbers, blank (never 0) after a failed load. **The last pane used opens next time**
    (`lib_pane` in localStorage: no athlete prefix, never synced, a value that is not a pane is ignored), else Sessions.
    `enterWorld()` / `exitWorld()` and the doors are gone: a pane is a tab root, so it has no ← and Back goes Home.
  - **A session or article returns to its pane at the same scroll** (`_libScrollY`) by its ← or the phone's Back. A suggested
    session's ← still goes back to where it was offered (LIB-01).
  - **Sessions**: each shelf band is a short cover (its picture graded into green, *● 01 · TRAIN*, the shelf in capitals, **All N ›** as
    the light-ring pill; the band is still the button). Sessions are paper rows with a mono line (*50 MIN · BARBELL · ✓ SESSION*).
  - **Playbook**: the latest read is the cover (*● LATEST · TRAINING*, *5 MIN READ*); each category with reads is a green section title
    with its count, then paper rows; an empty category is not drawn. No clay.
  - **Exercises**: the search box in the set table's input look, one pill style for the chips (the chosen one green), paper rows with a
    green mono *IN YOUR PLAN*.
  - **A Library session**: a cover with its shelf's picture and the 44 px glass ←, the focus tag as the eyebrow, the name, *50 MIN ·
    BARBELL*. **Before you start** is the day's banner (white row, 4 px clay stripe) in its own section, never inside the Why fold:
    **open the first time each session is opened, folded after that**, a tap opens it (`ws_before_seen` = `{"<id>": 1}`: no athlete
    prefix, never synced; with storage blocked it is open every time, the safe way round). The words are unchanged. **Why this session**
    is a fold row; **Mark as done** the one primary green button, behaviour unchanged.
  - **An article**: the same cover; a callout takes the Coach's-note pull-quote look; an embedded session is a door row. The reading
    layout's heading bar, drop cap, ball bullets and caption mark are green since 2026-10-13 (they were clay; clay is "look here").

- **Sign in, the Welcome, Loading and the error screen** (`showSignIn()`, `maybeWelcome()`, `#loading`, `showError()`;
  `scripts/headless/entry-screens.js`, 121 checks; one block at the very end of the sheet):
  - **Sign in** keeps Amir's "Baseline" (2026-09-12): the court photo over a hero that paints as `--hero` before the photo, the scrim a
    mask of `--hero-end`, the eyebrow *● AA PERFORMANCE* in the mint-dot recipe, *COACH* clay on green (`--clay-on-green`, the brand line).
    The sheet is `--paper` with the app sheet's 16 px top corners; the labels Space Mono in `--grey`; the fields the set table's boxes (white
    `--row`, `--field` edge, 16 px text, 48 px, 10 px corners, green focus); a failed sign-in is the day's banner (4 px clay stripe, ink text).
    Every colour is a token now (`--court`, which only this screen read, is gone).
  - **The Welcome** is a cover (the picture graded into `--hero` as the archive's is, *● YOU'RE IN*, *WELCOME, ALEX.*, ✕ as the 44 px glass
    button), its two lines on the paper **signed** (`WN_SIG` and his photo), **Open Day 1** the primary button and *Look around first* quiet
    green-ink text; both on screen at 320 × 568. On a wide window it sits in the app's 520 px column.
  - **Loading** is the mark (52 px), a 32 px ring and *LOADING YOUR PLAN* (it read "Loading Program"); with reduced motion the ring turns
    slowly and never stops.
  - **The error screen** keeps its clay icon (an error is "look here"), the title and message in ink, `.error-btn` in the one primary list and
    `.error-btn.ghost` outlined, both 48 px. No `--yellow` left in it.

- **The sheets and the notices** (`sheetWrap()`, `paintSheetBack()`, `openAccount()`, `openHelp()`, `openHistorySheet()`, `openWhyPlan()`,
  `openQualitySheet()`, `openReadiness()`, `paintPlanOffline()`, `aaToast()`, `showInstallOffer()`; `scripts/headless/sheets-notices.js`,
  508 checks; one block before CENTRE COURT):
  - **One sticky top row on every sheet** (`.sheet-bar`, 56 px): the handle, **‹ Back** on the left only when a page is behind, **Close** on
    the right (44 px, green ink; white on the About sheet's green, where the row turns solid green once the page scrolls under it). It is
    drawn once, by `paintSheetBack()` for the sheet and in the markup for the readiness check (whose Close cancels it). The six grey Close
    buttons at the foot are gone; *Skip for today* stays (it is an answer). A fresh open starts at the top. The dim covers the whole
    window at every width; from 560 px the sheet is a centred dialog with the same row and no handle.
  - **The pages in Centre Court's parts**: Account (the name as the title, Theme as the Library's switch, Install, How the app works and
    Privacy as door rows, Sign out quiet clay text, still two taps); Help (fold rows with a 22 px green line icon, the asked card open
    under the row); History (the eyebrow, the chart green on the paper, the sessions as paper rows, *Open in Personal Records* as a door
    row); Why and a Quality (green section titles, paper rows with ›); the readiness check (green section titles, the day's keys, *N of 5
    answered* in grey until Begin turns primary).
  - **The banner** is the day's lower-day recipe for every state that lasts on Home: the offline line (grey stripe, *OFFLINE*), *Your plan
    was updated* (clay stripe, *UPDATE*, Refresh as the link), the filed-day card (clay stripe, *SAVED FOR YOU*, OK as the link).
  - **The note box** (`aaToast()`) is a green cover box (`--hero`, white words, the light-ring button, 16 px corners) in the middle of the
    screen, **above the sheets** (z 215; it was 71, under them: D9), still under the video pop-up. `opts.kicker` adds a mint-dot eyebrow:
    *How to log*, *No weight*, *Session clock* on its three notes (2026-10-13). Its place, one-at-a-time rule and timings are unchanged.
  - **The install offer** is a white bottom card styled in program.html only (shared.js serves the public site): the app icon, the words as
    before, **Install** primary green, *Not now* quiet text (`showInstallOffer()` relabels shared.js's Dismiss).

- **The sweep** (2026-10-13, after every screen above): the athlete-facing copy in program.html is COM-3 clean (no em dash and no
  semicolon in the guide, Records, Body weight or the demo banner; Guided's button reads **Done · Start Rest ✓**, and its tests and the
  guide moved with it). An em dash is left only where the athlete never reads it as prose: the report email and `readinessPlanLine()`
  (coach.html parses that line), the coach preview bar, the page title, and `—` as an empty value in a scoreboard. 42 lines of style
  for classes nothing draws went (Night Court's card parts, the old Coach header, the old card's chips, rest and action rows, the timer
  presets, the old weight input, `--court`). After it (aap-v137): the one primary button wears `--btn` (lighter in dark mode), the
  article reader is green, the note box's three notes carry labels, and the Your numbers rows' sparkline ends on a green dot (it was clay).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
