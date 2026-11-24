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

- **Court Log counts toward Steps** (stage121, 2026-11-22, Amir: *"lets do option 1"*). Each logged activity is worth
  `round(minutes × MET ÷ 3.5) × 100` steps, a day's credit is capped at 70% of the target, and Steps for the day is the typed
  number plus the credit. **From 2026-11-24 the cap is 100% of the day's target** (stage127, #136, Amir: *"movement should give
  people xp, because those who walk get more xp compared to those who play tennis"*): `move_cap_on(day)`, so days before keep 70%
  (D20), in both copies (`move_steps_credit()` / `hab_log_credited()` and `moveCreditOf()` / `stepsScored()`, check_twins). ⚠️ **The typed number is never changed**: the server adds the credit as it reads the log
  (`hab_log_credited()`, inside `career_observe_proof()`), and the phone reads the log through `HAB_VIEW`, never saving it; the −,
  + and typing box edit the typed number. ⚠️ **The number on the row is the number that counts** (2026-11-23, Amir picked
  *"A Total first"* after Tara read her typed 2,000 while 9,000 was scored): the big number is the total and the line under it
  says *"2,000 walked + 7,000 from Tennis"*. `scripts/headless/move-credit.js` holds every counted row's number equal to
  `valOf()`, and the headless stub answers `get_five_weeks()` with the live `acts` (check_twins holds its copies). ⚠️ **The MET table exists twice** (`activity_met()` and `MOVE_MET`):
  `scripts/check_twins.js` holds them equal. Forward only from 2026-11-22 (D20). It pays through Steps only, so Court Log itself
  still pays nothing. The table and its sources: [`../ref/move-credit.md`](../ref/move-credit.md).
- **Played today? asks, it never pushes** (#126, 2026-11-22, Amir: *"Build 126 first"*). After 5 pm, on a day with no activity
  logged, Home's Today card carries one row under Steps: the athlete's last activity (`actLast()`, from Your weeks' copy) saved
  again in one tap through `log_activity()`; *Something else* opens Add activity, which opens on the last activity; *Not today*
  hides it until tomorrow (`<id>_played_no`, never synced). Never a push, never in the demo or the coach's preview.
- **The check-in says what was played yesterday, and it moves nothing** (#127, 2026-11-22, Amir: *"build 127 and 128"*). Yesterday's
  Court Log rows show above the questions (`ydayActs()`), ride on the stored check-in as `readiness.yday` and show on coach.html's
  session card as "the day before: Padel 90 min, hard" (`ydayWordC()`). ⚠️ Information only (REC-7): `readinessPlan()` never reads it.
- **A hard hour offers the day-after session** (#128, same day). A hard activity of 60 minutes or more says so in its saved message
  and offers `LIB_PICKS.sore` (The Morning After, the session a sore check-in offers), whose ← comes back to Home (`coolDownCall()`).
- **An activity told to the crew carries its kind, never its effort** (#131, 2026-11-23, Amir: *"build 130 and 131"*). Tell the crew
  (the saved message, or the day's sheet) opens the composer on the activity; words and a photo are optional; the post is a plain post
  with `p_session = { act, mins }` (stage124), drawn with its card. ⚠️ **Court time wears the racket** (`ICON.court`, `actIcon()`):
  the day's sheet, the Player Page and the feed, in clay; a plan or session post wears the dumbbell, so court and gym read apart.
- **Your weeks says this week against the athlete's own usual** (#133, same day): court and other minutes against the average of the
  four 7-day blocks before this week (`fwUsualHtml()`), silent until three weeks of logs. No score and no verdict.
- **Each athlete can have their own Steps number, and Amir sets it** (#130, 2026-11-23, Amir: *"App suggests, you approve"*, *"Full
  XP at their number"*). coach.html → an athlete → the Proof tab → **Steps target**: their 14-day usual and a suggestion (+10%, to
  the nearest 500, 6,000 to 12,000); `coach_set_steps_target()` (stage125) writes a row from today. ⚠️ **Scoring is one formula in two
  copies**: Steps = (typed + credit capped at 70% of the day's target, 100% from 2026-11-24) x global / the day's target, in `hab_log_credited()` and the
  phone's `stepsScored()` (HAB_VIEW), held equal by `scripts/check_twins.js`. Hitting their own number is a full Steps day for the ring,
  the day gate and the XP. Forward only (D20): a number starts the day it is set. ⚠️ Step totals (the 250,000 / 1,000,000 achievements,
  the crew's million-steps mission) count a met day at the scaled value, so a lower number counts a little more toward them.
- **Your Number sets itself; Amir's number is an override** (stage127, #137, 2026-11-24, Amir: *"do i need to pick? can the app
  choose automatically?"*, then *"Yes, build it"*). `steps_targets.source` is `'coach'` or `'auto'`. Once a week (the first save from
  Monday on), for an athlete with a programme whose latest number is not Amir's, `steps_auto()` sets it from that day: the first number
  is their usual (the median typed steps of the last 14 days, 7 days or more needed) +10% to the nearest 500, 6,000 to 12,000 (the
  coach.html suggestion's rule); after that it goes up by at least 500 when it was met on 5 of the last 7 days, and **never goes down
  by itself**. A number Amir sets is left alone until he hands it back: `coach_set_steps_target(id, null)`. Forward only, like every number.
- **Steps shows all of it; only up to the target counts** (2026-11-24, Amir: *"if i play 4 hours of tennis, why doesnt it go over the
  10,000? ... it should go up, doesnt need to give xp if its more than enough"*). The Steps row and coach.html's grid show the typed steps
  plus the activity's whole worth (`mvAll`, `habValC()`); the tick, the meter, the XP, the day gate and every step total still read the
  scored number, the credit capped at the day's target (`stepsScored()`, `hab_log_credited()`), so a long court day pays and counts
  nothing past it. `scripts/headless/move-credit.js` allows the drawn number to be MORE than the scored one on a met Steps day only.
- **Add your other activity too, once a day until the first one** (2026-11-24, Amir: *"just a one time reminder, when people adding to
  the steps, to add their other activity as well"*, then *"this shoule be notified once every day, untill they log in their first
  time"*). The first change to Steps each day (`habSetVal()` → `actHintArm()`) opens a small box under the row (`actHintHtml()`: Add
  activity, Got it), marked seen for that day the moment it opens (`<id>_act_hint` holds the day, never synced); from the day they log
  their first activity it never shows again. Not a toast. `scripts/headless/act-hint.js` (11 checks).
- **Move minutes are worked out once, on the server, and the phone never copies the arithmetic** (stage127, #134 and #135,
  2026-11-24, Amir: *"go with your picks but movement should give people xp"*). One weekly number from plan sessions, Library,
  Court Log and walking (minutes × MET ÷ 4, minutes at 3 MET or more; the numbers are `career/rulebook.toml` → `[fact.move_week]`),
  by `move_parts()` / `move_week()`, returned per week by `get_five_weeks()` (`weeks[].move`, and `move` for the line and the number).
  program.html's Your weeks draws it as **The Week Line**; coach.html's Five weeks adds **The Mix** (plan against life). ⚠️ It is
  information, plus one price: 300 in a plan week pays 150 XP once a week (rulebook version 13, `move_week`, dated the week's first day, D20; [`../ref/career-procedures/40-stage-127-the-whole-week.md`](../ref/career-procedures/40-stage-127-the-whole-week.md)). It never
  moves load, days or `readinessPlan()` (REC-7). The table and its sources: [`../ref/move-credit.md`](../ref/move-credit.md).

---

*What is left before `habits.html` can be deleted: point proof.html, the WhatsApp links, the
push targets and coach.html's Proof tab at this app; turn `habits.html` into a redirect and leave it a
month, because athletes have it on their home screens; then delete it, its tests, the twins guard's
Proof half and the dormant `CAREER_LIGHT` code — and at that point `habits-core.js` stops being
generated and becomes the source of truth.*
