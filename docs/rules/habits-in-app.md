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

---

*What is left before `habits.html` can be deleted: point proof.html, the WhatsApp links, the
push targets and coach.html's Proof tab at this app; turn `habits.html` into a redirect and leave it a
month, because athletes have it on their home screens; then delete it, its tests, the twins guard's
Proof half and the dormant `CAREER_LIGHT` code — and at that point `habits-core.js` stops being
generated and becomes the source of truth.*
