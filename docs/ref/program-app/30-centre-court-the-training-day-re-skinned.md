## 🎾 Centre Court: the training day, re-skinned (2026-10-12)

Amir: *"lets go with E. exercise number inside the circle. but with P4, P5, P9, P50, P66."* E is the design
direction "Centre Court": the day reads like a calm programme on paper, and only one strong green thing is on
screen at a time (the cover before Start, the open lift's head mid-session, the finish band at the end). The
P-numbers are parts he picked from the other directions. All of it is ONE CSS block at the end of
`program.html`'s stylesheet (**CENTRE COURT**), scoped to the day view, Guided's moved card parts and Library
sessions (`:where(#day-view, .step-scroll, #ws-body)`); Home, Game Plan, Records, the About sheet and the
dashboard do not change.

- **Tokens: the app's ONE colour set** (since 2026-10-13; Amir, 2026-10-12: *"go ahead with the shared colours"*). Centre
  Court's paper and ink (`--paper`, `--sand`, `--row`, `--hair`, `--box`, `--ink`, `--grey`, …), the greens (`--hero`,
  `--foot`, `--bar`, `--tile`, `--tile-on-green`) and the clay rule were declared inside the day's scope until then; they are
  now the block **THE APP'S ONE COLOUR SET** at the top of the sheet, light on `body` and dark on `body[data-dark]` (never
  `:root`: a custom property holding `var()` resolves where it is declared, and dark mode is an attribute on `body`). The
  older names are aliases of it (`--grey-bg` → `--paper`, `--grey-card` → `--sand`, `--grey-mid` → `--box`, `--grey-text`
  → `--grey`, `--grey-dark` → `--ink`, `--white` → `--row`, `--yellow` → `--fill`, `--ice` → `--clay`, `--rpe-under` →
  `--steel`), so a new rule uses the new names and no screen keeps a copy. The clay rule: `--clay` is the brand fill
  (`#C7552F`, the note's dot, the fault cue's bar); small clay TEXT is `--clay-ink`, `#B5461F` in light (5.1:1; `#C7552F`
  is 4.1:1); clay text 18.66 px bold or more is `--clay-big`, `#C7552F` (the week note's headline numbers, Guided's
  off-plan number; the article's drop cap until 2026-10-13, green since); on the green it is `--clay-on-green`; in dark every clay TEXT is `#E06B43`. `--ink`
  and `--court` are defined at last (D7). The move was checked by a before/after diff of every element's computed colours on
  68 screens and states, light and dark: only small clay text outside the day, `--grey-card` fills (#EDE8E0 → #F1ECE3) and
  five dark greys moved. `--g` is the gutter: 20 px, 16 under 360. The panel is **full-bleed**: `.day-content` has no side padding (the rail's 32 px went with the rail).
- **The cover** (D's P4): the day's photo graded into the green, ← and the moon as 44 px glass buttons, the
  *● DAY 1* eyebrow (dot and words mint since round 2), the focus in 44 px capitals, and what the day builds as tiles with a › (each still opens its
  quality, `paintDayQualities()`; the first is white). About 270 px at 390. *N blocks · M movements* is hidden.
  `dayCardHTML()` draws Home's cards too, so the cover is CSS on `#day-view-card` only: its markup is unchanged.
  The focus keeps every word whole (no mid-word break) and is `clamp(32px, 11.3vw, 44px)`; its 900 face is also our own
  file under the name *AA Barlow Condensed* (`/assets/fonts/BarlowCondensed-900.woff2`, pre-cached in `sw.js`), so a phone
  offline or without Google Fonts still draws it condensed. The cover ends on ONE colour, `--hero-end` (its scrim's last
  row), and the bar before Start starts on it (its light sits at its bottom right, no border): no seam between them.
- **The session bar** (A's P5 before Start, P9 after it) and its progress line: *The session bar* below.
- **The first-session hint** (A's P66): *First-session hints* below.
- **Block titles**, quiet: 15 px condensed capitals in green with a hairline to the screen's edge and the block's
  rest at its end. A block whose only item has the block's name (*Dynamic Mobility* over *Dynamic Mobility*) and no
  written rest hides its title: `sameNameBlock()` adds `.same-name` in both block-header templates (the day and a
  Library session); the header node stays.
- **Scroll margins**: `foldWhenDone()` lands the next card under the slim bar with the row it just folded showing
  whole above it: 110 px, 142 with the week's limits row (156 under 360, where that row can wrap), plus 44 in the demo.
  That is the bar, 16 px for Chrome's smooth scroll stopping short of an instant one, and 38 px so the 54 px done row is
  never a cut-off sliver under the bar.
- **The cards** (section 7 of the block, Centre Court 2/3). No card is a box any more: a row on the paper, a
  hairline from the name column between rows, no white, no shadow, no stripe, no press scale.
  - **Closed: the number is the tick** (round 2, P24; Amir: *"i want to use p24 to number the exercises, so if the exercise
    is done, the number would turn green meaning its done"*). The left column holds the exercise's number as a big
    OUTLINED numeral, zero-padded (*01*, *06*, *10*: `renderExercise()` and `renderCircuit()` write
    `String(num).padStart(2, '0')`; nothing reads `.ex-num`'s text): Barlow Condensed 900, 32 px, no fill, a 1.5 px
    `--green-ink` stroke (mint in dark). `.ex-num` stays in `.item-name-row` in the DOM: that row is a baseline flex, so the
    numeral sits on the name's first line (dropped 4 px so its middle meets the middle of the name's capitals), pulled into
    the 44 px column by a -56 px margin, with `pointer-events: none`. Under it `.check-box` draws nothing any more (the ring
    and its white ✓ are gone): it is the invisible tap target, the whole height of the row's left column, and a tap ticks
    everything as before (`onCheckBoxTap()`; a first-timer's tap on a lift still opens it). It keeps its focus outline.
    Then the name (18 px), the line of numbers (15 px, the dose bold, the tempo's hot digits clay), the intent pill.
  - **The name carries the chevron** (2026-10-19; Amir: *"The button that shows the exercise cards are openable is in a bad
    place, everytime i want to click, i click on the i button instead"*; he picked the direction *Name carries it* from
    https://claude.ai/artifact/65NM4FGazLojSaA9Kuqo6J). Round 2 had drawn the chevron in the right column with the ⓘ 28 px
    under it, and the ⓘ's 44 px target began about 6 px below the chevron's centre, so a thumb landing low opened About
    instead of the card. Now the chevron **follows the exercise's name**, like a title that unfolds, and the right column
    belongs to the ⓘ alone, **centred on the row**: a whole column apart, nothing stacked (`smoke.js` measures the clear
    space on every closed row at 390, 390 dark and 320; it was 61 px or more). It is drawn on `.nm-tail`, the name's last
    word (`itemNameHTML()`), so the word, the Coach's Note dot and the chevron never break apart when the name wraps; a card
    drawn without that span keeps the chevron on the name itself. Still not a button: the whole row is the tap
    (`onExerciseRowTap()`). Open, it turns over in place. A done row shows no chevron and keeps its ⓘ (a tap still opens it).
    **The Coach's Note dot now stays when the card opens** (it used to be hidden): taking it away would shift the chevron.
  - **Done**: a receipt. The numeral turns SOLID green (its fill takes the stroke's colour), the name 15 px grey, what was
    done on one 13 px grey line, *4 · 4 · 4 · 4 · RPE 7 7 7 7* (a move with no weight drops the leading *×*).
  - **A warm-up is known by its title, `.is-prep`.** Both block templates (the day and a Library session) add `is-prep`
    when `isPrepBlockTitle()` says so, and every warm-up rule in the block keys on it. `block-warmup` is only
    `blockCategory()`'s colour class, and its index fallback hands it to any unknown title (*Core* at index 6), so it
    must never decide the look: a Core lift would lose its head and its Rest.
  - **Open, the head: THE ROW STAYS PUT** (2026-10-19; Amir: *"i dont like the animation or how the exercise cards openes,
    i think we need to change that in a way to make it smoother, i feel like everything moves"*; he picked the direction
    *Stay put*). The head keeps the closed row to the pixel — the same numeral in the same column, the name at the same
    size, the same line of numbers, the same pill — and **only turns green**. Nothing travels, nothing re-flows, nothing is
    re-typeset. Gone with the move: the **scoreboard** of four tracks, the *● 06* eyebrow and the 28 px capitals name. The
    line of numbers IS the scoreboard now, and **the tempo guide's door is the tempo digits themselves** (the hidden
    *tempo* button is stretched over them and they carry a dotted underline, so the line's text never changes; COACH-02).
    The difference between the two states is held in **one switch**, the `--head-*` tokens on `.checklist-item` (green,
    ink, mute, hot, numeral, ring, halo, pill), which every part of the row reads and each reading property transitions —
    so opening and closing are one fade, in step. A warm-up still stays on paper. **An open lift has no tick-all**: every
    set has its own circle, so `.check-box` is hidden and the numeral is only drawn (`.item-body` is pinned to the middle
    column by name, or it would auto-place into the numeral's).
  - **The card opens and closes on its own height** (`foldCard()`, 260 ms, `cubic-bezier(.4, 0, .2, 1)`): the body is drawn
    in and out behind a clip and the rows under it ride down and up instead of jumping. The clip is **vertical only**
    (`clip-path: polygon(...)`, not `overflow: hidden`): a circuit's head is full-bleed by negative side margins and would
    be cut in while it moves. While a card closes it carries **both** `.collapsed`, so the head is its closed self at once
    with its colours fading there, and `.closing`, which keeps the body laid out until the box has finished shrinking (the
    body's layout rules read `:is(:not(.collapsed), .closing)`). Every door into open and close goes through `foldCard()`:
    the tap (`toggleExpand()`), the fold after the last RPE (`foldWhenDone()`) and a simple item's tick
    (`toggleCheckOnly()`). **After the last RPE it is one settling, not three**: the card folds, the next one starts
    opening 110 ms in, and the page waits for the fold to land before it slides — the fold is what moves the next card's
    top, and a slide sent mid-fold lands short (the finish card's nudge waits for the same reason; `first-timer.js` caught
    it 75 px high). A phone asking for less motion gets the old instant change. Check: `scripts/headless/fold.js`.
  - **Open, the body** on the paper: the Coach's Note as a pull quote (the clay quote mark on the ring column, 16 px,
    **3 lines**, then *More* with a drawn chevron: `fitNotes()` still decides), **How to do it** as one white rounded row
    (the About sheet's Your history recipe: a green ▶ only with a video, else a list glyph; *HOW TO DO IT* over the count
    on its own line; *More* is 44 px tall itself; its text stays *How to do it · video · 5 steps · 4 cues*: `paintHowTo()` puts the leading dot in
    `.ex-how-lead`, which CSS hides), the *First time* line with no box, then the set table. **A circuit's Coach's Note sits
    under its green head** (Amir, 2026-10-19: *"the coach's note for this superset is on top of the card, should be under"*): an open
    circuit is one grid whose body is `display: contents`, so the note's `order: -2` (which leads a card's body) lifted it above the head;
    `.round-group:not(.collapsed) > .item-main { order: -3 }` keeps the head first (`scripts/headless/unit-menu.js` measures it at
    320 and 390 px, light and dark, for a superset, a warm-up circuit and a standard card).
  - **The set table**: white boxes edged `--field`, the set numbers grey and the live set the one green number (a
    disc), LAST inside an empty kg box, a done set 700 with no box, the RPE tag in its own column 40+ px clear of the
    tick, **How hard?** a sand band that hangs off its set with 48 px keys, and the ghost line in that row's RPE slot,
    *Last time 5 reps · 9/10* on two lines (`paintLastTime()`; a set with no reps number says its weight, *Last time 60 kg*). Columns are tokens on
    `.ex-set-log` (`--c-set`, `--c-tag`, `--c-tick`, `--c-gap`), narrower under 360 so the boxes hold *102.5*.
  - **The foot row** (A's P50): **Note** on the left (a 32 px outlined circle with its chevron, then *NOTE*) and **Rest ⏱
    2:30** on the right, the primary button with its time, the stopwatch drawn in mint (the button's text keeps the ⏱
    glyph in `.rest-ic`; the time is `.rest-t`). One row, not sticky. Both keep their nodes: `.ex-log` and the open
    card's body are `display: contents` / a grid, and the Note and `.ex-rest-bottom` share its last row; an open Note's box
    runs full width under them. A warm-up ends the same way with an outlined Rest.
  - **Circuits**: a warm-up stays on paper with plain letters, *5 / side* doses (`itemDose()` writes the card's
    spacing), a ▶ disc only with a video and the chevron for its steps and cues. A working circuit has the green head, its
    *Last time* line right under it (round 2, E's **t**: `renderCircuit()` gives a working circuit's body an `.lt-slot` as its
    first child, so `paintLastTime()` places the strip there, not before the rounds' RPE rows), its items as letter · name
    and dose · kg box, its cues open, the small *How to do it* line, and one How hard? row per round (the words take their
    own line under 375 px). **An item's ▶ is in its How to do it line** (round 2, E's **s**): no disc beside the kg box;
    the line reads *▶ HOW TO DO IT · video · 4 steps* (`.round-how-play` drawn in CSS, `.round-how-v`) and shows even with no
    steps yet (`.has-vid`, the URL in `data-vid`); its tap opens the card's player, Open in YouTube bar and all, above the
    steps (`toggleRoundSteps()` builds it on the first open, `.round-how-vid`, so a closed row holds no player). A warm-up
    item keeps its ▶ disc and the pop-up.
  - **Guided** borrows the same body (`.step-scroll`, gutter 16): its pinned set keeps its tint across the full width.
    Guided's own layout (the pinned current row, the rest screen, its header and footer) is unchanged: *Guided Mode's
    layout* below still holds.
- **The finish** (sections 8 and 9 of the block, Centre Court 3/3). The same three states `refreshConfirmCard()` always
  set (`partial`, `ready`, `early`); only their look changed. *One finish* below has the behaviour.
  - **In progress**: one quiet line under a hairline, *IN PROGRESS* over *6 of 26 sets*, and **Finish early** on the
    right, outlined grey (it ends the session; two taps, clay while armed). No bar: the slim bar's line is the progress.
  - **Ready**: the green moves here. A full-width band, *● 26 OF 26 SETS* in mint over *ALL DONE WITH DAY 1* in 44 px
    capitals; then, when lifts with an RPE written have a ticked set with none, one clay line on the paper, *No RPE on 2 lifts.
    Add them ›* (`.confirm-norpe`, `noRpeCards()`, `openNoRpe()` opens the first with its How hard? strip; Line Call, 2026-10-13,
    Second Serve D3: the ring on each closed card logs a whole day with no RPE, `scripts/headless/no-rpe.js`); then on the paper
    *How hard was this session?* as a 22 px green heading and two rows of five 52 px keys,
    *Notes for Coach* and its box, and **Done · send to coach ✓** full width, 56 px, then the WhatsApp row UNDER Done
    (`.finish-wa`, since 2026-10-13: it sat between the note and Done and competed with it; the Your history recipe: icon, a
    mono label over the line, a grey ›; `sessionWaUrl()` reads the note from the finish card too now, so a note typed before
    Done comes along, which it did not). Finishing early
    uses the same band (*FINISHING DAY 1 EARLY*) and lists what is not done on the green, each tag in light clay; **Keep
    going** sits under Done. **It asks why** (Line Call, 2026-10-13; Amir's decision 4): under *Not done*, *What stopped you?
    Optional* and four paper chips, **Out of time · Pain · Too tired · No kit** (`EARLY_WHY`, one tap, a second clears it,
    the green when chosen), saved as `<id>_whyearly_d<N>` (a per-day key: the sweep, a reset and `staleCloudPlan()` treat it
    like the note). The report's status line carries it, *Partial (8 of 19 sets/units done) · Pain* (`buildSessionData()`;
    coach.html shows *Partial · pain*, `partialLabel()`). **Pain** brings a *Tell me about it* WhatsApp row up under the
    question and hides the one at the foot; its message starts *I stopped early (pain).* (`sessionWaUrl()`).
    `scripts/headless/early-why.js` (12 checks).
  - **Finished**: the card is signed the way the About sheet signs its reason. A grid whose `::before` paints the green
    band, *DAY 1 DONE* first (as E draws it: the finish picture, `.complete-art`, is filled but not shown in the day view), the message with the clay
    quote mark, and Amir's signature and photo (`.complete-by`: `WN_SIG` and `.wn-av`, added to the template after
    `.complete-sub`, and, once Career Mode's XP switch is on, what the session earned at the left of the signature,
    `.complete-earn`: *Career on Home, and what a session earns*). The tick medallion is gone (the words say it). On the paper under the band: the send status (the
    card's one ✓), AA Proof as a row with an open-out glyph and its label *OPEN AA PROOF* over *Counts as your Session
    habit* (the template's `<b>` lost its "· "), its own WhatsApp row (`.complete-wa`, never folded), the day-after
    suggestion, then **Your rating** (since 2026-10-13): one door row, `.rate-fold`, *7 of 10 · No note* or *7 of 10 · Note:
    "…"* (40 characters), that folds the rating keys and the note box (`moveRatePanel()` still moves them into
    `#rate-slot-N`; `setRateFold()`, `paintRateFold()`; closed after Done, on a reload and after a reset), then **Send the
    update** (primary, only when changed, OUTSIDE the fold) and **Reset session** (outlined grey, 44 px). Rows are placed by
    class with grid rows, so the DOM order is unchanged. `scripts/headless/day-finish.js` (104 checks) covers all three.
- **The lower-day banner** (section 10): a white row under the bar, full width, with a 4 px stripe in the colour that asks
  (clay for a lower or short day, steel blue for a sore one, none while training as written), its label in that colour,
  the sentence in ink and **Train as written** as the one text link (green condensed capitals and the chevron). Its words
  are unchanged. The cards' pills (*Effort 7 → 6 today*, *2 of 4 sets today*) are section 7's clay pills.
- **Library sessions** (`#ws-body`) get every card rule above through the same `renderExercise()`; a block title's
  hairline runs to the screen's edge like the rows'. Their own top and Done (`#ws-finish`) are unchanged.
- **Dark mode** is the same page: the tokens flip (paper `#181818`, rows `#242424`, green text mint, clay text `#E06B43`),
  the greens stay brand, and a made tick, the live set's disc and a selected rating key lift to `#1B7254` (`--mark`) so
  they still read on the charcoal. Old `body[data-dark]` rules that hard-code colours on these parts are matched at their
  weight by `body[data-dark] :where(…)` rules in the block.
- **320 px**: the gutter is 16; the set table's columns narrow; the slim bar never drops a word; the finish's tap rows
  close their gap to 16. Measured on every state: no sideways scroll, no text under 11 px, every control 44 px to hit (the TEMPO caption reaches it through a ::after).
- **Taps and keys** (E's build notes n and o): an open card folds from its name row only. A thumb on the scoreboard
  (*4 × 6*, *2:30*) or the pill mid-set leaves it open (`onExerciseRowTap()`); a closed row still opens from anywhere.
  The tick-all target (`.check-box`, under the numeral) is `role="button"`, `tabindex="0"` with an `aria-label`, and Enter
  or Space ticks it like a tap (`onCheckBoxKey()`; a Library session wires its own listener, as it does for the tap).
- **A per-side move with no kg box says so in its reps box** (round 2, E's **p**): *4 / side*. `paintKgCol()` writes the
  placeholder (`cardReps()` or the range, plus *" / side"* when the box is hidden and `data-dose` ends in */ side*; with a kg
  box the column is too narrow, so it stays *4*). It is the placeholder only: a tick records the plan's reps
  (`setReps(s, plannedReps(ex))` in `buildSessionData()`, never this text), Guided's rest screen reads the number with
  `parseInt()` (`paintTimerLog()`, which also drops the words when it shows a range). `smoke.js` ticks such a set and checks
  the session records 4 and Guided reads 4.
- **Amir's answers on round 1's open calls** (2026-10-12, *"1 keep, 2 mint, 3 clay, 4 yes build them"*): (1) with ⋯ open,
  **Pause** stays on the second row beside Guided and Reset; (2) the cover's *● DAY 1* is mint, the words with the dot
  (`#day-view-card .cm-name`); (3) the fault cue's bar stays clay and is on the *Clay means look here* list; (4) E's p, s
  and t are built (above; u was already: `itemDose()` writes *5 / side*).
- **The old card CSS that Centre Court fully overrode is gone** (round 2): 118 pre-Centre-Court rules on the card shell, the
  set log, the Note row, the circuits and their `body[data-dark]` copies. Each was switched off in the browser, one at a time
  and then all together, in five day, Guided and Library states at 320, 390 and 600 px, light and dark, with transitions
  stopped: none changed a computed style (the element's, its `::before` / `::after`, its descendants' inherited ones). Full-page
  screenshots of the day view, Guided, a Library session, Home, Game Plan, Records and the About sheet matched before and after.
  Two that looked dead while a transition ran were kept (Guided's dimmed sets, a circuit's How to do it chevron turning). What is
  left above the block still sets something: a `:hover` or `:active`, a transition, or a state those runs never drew.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
