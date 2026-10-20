# Rules — the habits, in the training app (`program.html`)

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

AA Proof is being retired into the training app (2026-10-19, Amir: "Aa proof will die", "No free users
any more"), and the habits came with it. The dying app's own rules are [`habits.md`](habits.md); its
reference is [`../../HABITS.md`](../../HABITS.md). These are the rules for the habits WHERE THEY LIVE NOW.

## The habits in `program.html`

- **The habits live in `program.html`** (2026-10-19, Amir: "Aa proof will die"). Home's **Today** card is the
  session and the habits as ONE list, because they are one day (direction B, picked from three), and since
  2026-10-20 it is **The Ring** (direction A of three, Amir: *"make it very nice. maybe we can show the level
  there in a ring"*): a ring whose segments are the day's habits, filling as each is ticked, with the **career
  level in the middle**; beside it the state at display size, the run under it, the four days you may still fill
  in, and a **›** to the habits page. ⚠️ **The headline and the ring count the same thing** — the habits left,
  not what the gate still wants (`dayToGo()` is weighted and a day counts with one missing), so a card showing
  two ticks of five can never say "1 to go" again; the gate's own moment is the headline turning green and
  saying **Today counts**.
  The card replaced AA Proof's Daily habits door row and the iframe of AA Proof under it. ⚠️ **The engine is `assets/js/habits-core.js`, and
  it is GENERATED** from habits.html by `scripts/build_habits_core.js` (pre-commit guard 26): the roster, the
  log, the verdict, the day streak and the backfill window are cut out of AA Proof function by function, never
  retyped, because a second copy of that arithmetic is how the athlete and the board come to disagree with
  nothing to show for it. The keys are AA Proof's own — `<id>_hab_cfg` and `<id>_hab_log` — so no athlete's
  history moves and every server scorer reads them unchanged. This app is their WRITER now: `_snapshot()`
  pushes them, and `mergeStoredValue()` merges the log as a **union by day, the larger number per habit**
  (the scalar rule would delete a day the other phone logged). A finished session ticks `strength` here
  (`habTickSession()`), where AA Proof used to read it back off the server.
- **Progress carries ONE habit door; the figures and the week are the page behind it** (2026-10-19, Amir:
  "i want the 7-day habit table / and days in a row and days this month / cut the per habit door / and create
  the door to the list", then THE SCOREBOARD the same day: "we want to go with scoreboard"). The door is the
  month's figure with the run under it (**Daily habits · 8 days · this month · 2 days in a row**), the third row of
  the **Your body** card since 2026-10-20; behind it,
  over the list of what you track, are the two figures and the last seven days as a table. **There is no
  per-habit page** — a habit's own level and its consistency ladder were AA Proof's, and the career already
  answers how it is going with numbers that count the training too. ⚠️ **Every cell of the table reads `rosterOn(ITS OWN DAY)`**, never today's
  list: a habit switched on midweek did not exist on Monday, and drawing it as three misses is the app
  inventing failures. The list (`#screen-habits`) is ONE list, not two — the five with no off switch, then
  whatever the athlete chose, then suggestions: Proof's three add-ons are suggestions among them, because the
  data said they were not special (breathing: 27 days across 7 athletes in six months). **Three of their own
  is the cap and it is a SERVER rule** (`hab_xp()` pays for at most `MAX_CUSTOM` unrecognised keys a day), the
  name is compared as it is displayed so one behaviour cannot score twice, **switching one ON is a two-tap
  confirm** (a toast is easy to have never read) and the armed state shows on the chip as well as the switch,
  and ✕ on a habit of their own takes its days with it while the switch keeps every point.
- **The habits SAY what they pay** (2026-10-20, Amir: *"I want the habits to give xp as well. Like before. It
  doesnt show xp so the people dont fill like their progressing"*). They always have paid; no screen said so.
  The habits page carries what they have earned (the SERVER's `career.habits.xp`, its share of the level and
  today's), every habit in the list says what it pays a day, and a tick makes a **`+36 XP` rise off the row**
  and go. ⚠️ **Never a toast** — a box with a button, five times a day, is a chore. ⚠️ **The arithmetic is the
  server's** (`hab_xp()`: the weight times the 1.2 completion bonus, a counter part way pays its share), read
  from the engine's own `XP_RULES.weights`, so the number on the phone is the number that lands; **the session's
  row pays nothing here** (`strength` is locked and the session pays it, so no habit is paid twice), and one
  door, *From your habits*, opens the same Achievements page Progress opens. Detail:
  [`PROGRAM-APP.md`](../../PROGRAM-APP.md) → *The Ring* → **What the habits pay**.
- **The row wears the habit's icon, and the meter is back under the name** (2026-10-20, Amir: *"i liked the icons and
  how the bar under was like that, apply the current design but bring these back, you can create new icons"*; direction
  B of three). The circle IS the tick: 42 px, the habit's colour on the rim and its tint inside, the icon drawn at
  21 px from the app's own set, the whole circle solid green with a tick once the day's target is met. ⚠️ **The habit's
  colour labels a row and is never an accent** — the app still paints with one, and it is clay. ⚠️ **Dark mode drops
  the tint and keeps the rim**, because a pale pastel disc on near-black is the brightest thing on the card. The meter
  is **one pip per step, never a straight bar** (`habBarHtml()`, cut from AA Proof's `segBar()`): eight glasses is
  eight pips, capped at 20, the leading part-pip dimmed, and only on a habit you count. The line under the name says
  what is **left**, never where you are, because the − and + already say the number. This reverses the 12 October
  decision that cut the per-row bar: that bar was a straight 54 px one that took the name's room and said nothing.
  Detail: [`PROGRAM-APP.md`](../../PROGRAM-APP.md) → *The ladders come back*.
- **One page explains the whole system, and nothing on it is typed twice** (2026-10-20, Amir: *"we used to have a what
  all this means ... put it where you think is a fit"*, then *"it shouldnt be specific to achievements from habits
  only, should be about those coming from training as well. its just a guide to the system"*). `#screen-system`, *How
  it works*, behind a door on the habits page and a second on Achievements, its ← going back to whichever opened it.
  ⚠️ **Every number on it is READ, never typed**: the habits' prices from the engine's `XP_RULES`, the training prices
  from `get_profile()`'s `rules.prices`, the counts from the achievements answer, the marks from `careerMarks()`. A
  section whose numbers have not loaded draws no price list rather than drawing zeros. Detail:
  [`PROGRAM-APP.md`](../../PROGRAM-APP.md) → *The ladders come back*.

---

*What is left before `habits.html` can be deleted: point proof.html, the WhatsApp links, the
push targets and coach.html's Proof tab at this app; turn `habits.html` into a redirect and leave it a
month, because athletes have it on their home screens; then delete it, its tests, the twins guard's
Proof half and the dormant `CAREER_LIGHT` code — and at that point `habits-core.js` stops being
generated and becomes the source of truth.*
