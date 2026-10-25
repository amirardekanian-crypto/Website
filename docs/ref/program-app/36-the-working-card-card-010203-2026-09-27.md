## 🧾 The working card (CARD-01/02/03, 2026-09-27)

Built from Amir's notes on two mockups (claude.ai/artifact/EzD59Z2yYA2pXWyqFxQ8rz). Opened, the card was
1,306 px and the first set sat 953 px down; now about 700 px with the first set about 400 px down.
**Closed** (`renderExercise()`):
- **One line of numbers** (`renderNumLine()`, `.ex-numline`): `4 × 6 · Effort 7/10 · Down 3 s · Rest 2 min 30 s`, only what was
  prescribed, the exercise's own rest only. The tempo is how long the lowering takes (`tempoPlain()`: *Down 3 s*,
  *Down 3 s · pause 1 s*; an X or 0 for the lowering leaves it out), and the whole tempo lives in its help sheet. It replaced the stats grid AND the grey number pills. The words
  *tempo* (`.nl-lab`) shows once the card is open; the rest says its own word, *Rest 2 min*. `numLineText()` reads it as text. Where it cannot
  fit (a narrow phone, an open card) a part starts the next line rather than running off the card (DS-03).
- **A pill that says something stays a pill** (Amir: *"we need to find a way for them"*): the green `intent`
  pill and a legacy card's chips (`renderExSummary()`), and the check-in's pills. On a lower day `rdTarget()`
  takes `Effort 7/10` out of the line and adds the clay **Effort 7 → 6 today** pill, so the number is said once;
  `paintToday()`'s undo puts it back.
- **What orange means, said once** (Plain Words, 2026-10-25): the first time an effort above the target, or more reps than asked,
  shows orange for an athlete, `orangeNote()` says *Orange means above my target. That's fine. I see it.* (a note that fades; the
  key `<id>_orange_told` keeps it from coming back).
- **The Coach's Note is a clay dot after the name** (`NOTE_DOT`, an empty span inside `.item-name`, so the
  name's text is unchanged); open, the note is cut to three lines with **More** (its chevron drawn by CSS since
  Centre Court; `fitNotes()` measures it when the card opens: `toggleExpand()`, Guided's `renderStep()`).
- **The ⓘ sits at the right end** (`.ex-side`, `paintSpine()`): a 22 px grey ring, 44 to hit, and a Because is the 28 px clay disc (Centre Court).
- **No history on a closed card** (Amir: *"no history on the exercise card when not opened"*): the *Last*
  pill is gone.
- **The number sits in the tick-all ring** since Centre Court (CSS only; `.ex-num` is still the name's sibling), so a
  long name wraps on its own.

**Open**, in this order: the green head with the scoreboard (Centre Court), the note, **How to do it**, the sets, then
Note and Rest on one row. There is no *Log Sets* label.
- **No Last time box** (Amir, 2026-10-12: *"the history ... should be removed from exercise cards. because their last
  time, is actually already in the reps, weight box"*). It was a box under the note (CARD-01, 2026-09-27: the last set,
  tapped open to every set and History ›). Now last time's weight is each empty kg box's LAST, a set that ran over its
  target keeps its faint ghost line, and the history is the ⓘ's **Your history** row, which opens the History sheet.
  `paintLastTime()` still draws a first meeting's **First time** line and a circuit's strip (always open: a circuit's kg
  boxes show nothing of last time). The phone's old `lt_open` setting is read by nothing.
- **How to do it** (`renderHowTo()`, a `<details class="ex-how">`; the steps since 2026-10-11): one folded row that
  holds, in this order, the video when there is one, **You need:**, the entry's numbered steps, then the cues (with
  steps above them the cues take back their *Coaching Cues* label). The row reads **How to do it** with a quiet count
  after it, *· video · 5 steps · 3 cues*, only the parts there (`paintHowTo()`, which also hides it while it holds
  nothing, since the Spine can arrive late). The green ▶ shows **only with a video**: it used to show on every row,
  so a card with no video read *▶ 3 cues* and promised one that was not there. It opens by itself the first time the
  athlete meets the exercise (`openHowFirstTime()`): a logged lift when it has **no history** (`paintLastTime()`),
  and since 2026-10-11 **a simple card too** (a warm-up ride, a stretch), which logs no sets and so never opened by
  itself (39 Stationary Bike cards): `openHowSimple()` opens it until any earlier session carries the exercise
  (`seenBefore()`; `buildSessionData()` records every exercise, sets or none, and the demo's history does the same).
  Nothing else about a simple card changes: no Last time, no set log. On a Library session it is always open; once
  tapped it stays as left. The closed card is the same height as before: everything here is inside the open part.
- **Open in YouTube** (Amir, 2026-10-05: *"C and red"*): under every player, one 44 px bar, a red YouTube mark and
  *Open in YouTube ↗*, attached to the video as one rounded unit (`renderVideoBlock()`: `.ex-vunit` holds `.ex-video` and
  `a.ex-yt`). Athletes in Iran can have the YouTube app or browser working while the embedded player in the app does not
  (a VPN that covers those and not the app's window), so the bar hands the clip to the phone: a plain
  `https://www.youtube.com/watch?v=` link from `ytWatchUrl()` (a Short keeps `/shorts/`), `target="_blank"`,
  `rel="noopener noreferrer"`, so the phone picks the YouTube app or the browser. It is a sibling of `.ex-video`, never
  inside it: the iframe fills that box (z-index 3) and would cover a bar there the moment the embed loads, which is when it
  fails. Only a YouTube address gets one. `renderVideoBlock()` draws every in-app player (the card's How to do it, the
  About sheet, Library → Exercises, Guided), so one function covers them; the pop-up a circuit item's ▶ opens has the same
  bar (`.video-modal-yt`, built in `shared.js`). **No mark on the circuit rows themselves**: beside the ▶ it pushed a
  superset's row 6 px past its card at 390 px and 36 px at 360 px, and squeezed a warm-up's names to two or three lines.
  Guide cards that name it: *Logging your sets* (the card, and the warm-up line) and *Built-in tools* (*How to do it*, which was *Exercise videos* until 2026-10-11) in
  `APP_GUIDE`. Check: `scripts/headless/youtube.js`.

**Done**: a finished exercise's closed row is small and says what was done, *72.5 kg × 6 · 6 · 6 · 6 ·
RPE 7 7 7 8* (a bodyweight move *4 · 4 · 4 · 4 · RPE 7 7 7 7*) (`paintDoneLines()` from `updateProgress()`, one line with an ellipsis; `.is-done`). After
the last set's RPE (or a tick-all on an open card) the card folds and the **next unfinished card opens in
view** (`foldWhenDone()`, 700 ms): a set still waiting for its RPE keeps it open, Guided never folds,
a tick-all on a closed card opens nothing. Library cards never become done rows.

**The kg box follows the work** (CARD-03, Amir: *"By the work"*; `kgWanted()` / `paintKgCol()`): shown
when the Spine entry's `equipment` is loaded (`KG_LOADED`: barbell, dumbbell, kettlebell, cable, a
machine that is not cardio, landmine, sled, medicine ball…), and kept when that is unknown (no approved
entry, no equipment) or when the athlete has **ever logged a weight** on it (this session or history),
so a weighted plank keeps its box. Hidden (`.ex-set-log.no-kg`), never removed, so Guided and the
carry-down never meet a missing node. A row with no box at all says its dose, `30 s / side`
(`.ex-set-dose`, from `data-dose`). **No box for the seconds a hold lasted** (Amir, 2026-09-27: *"Leave
the tick"*): the tick means the time as written, and a shorter hold goes in the Note. (It would have
needed a new field in the log line, which only writes `×n` for a reps dose.)

Guided copies the line of numbers and the pills under its name (`renderStep()`), because they live in the
header now. Circuits got the same header (line of numbers, note dot) and lost their Rounds/Rest grid.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
