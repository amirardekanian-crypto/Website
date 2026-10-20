## ⭕ The Ring: Home's habit card, and the Career row's end (2026-10-20)

Amir, after the Progress work: *"we have a daily habits bar in progress, what about bringing it in, and use some stuff, or
link it?"*, then *"i think the career row is redundant, it just shows level when we can see level 10 times"* and *"i want to
work on the design of that habit window. make it very nice. maybe we can show the level there in a ring?"*. Three directions
were drawn at phone size (claude.ai/artifact/NVVUKaxZfnKHP1FjTWPTCU: **A The Ring**, B The Band, C The Week); he picked **A**
and the recommendations under it. B and C stay on that board as the parts bin.

**What was wrong with the card** (423 px, measured): it said the day twice and the two disagreed — *3 to go* in the head and
*Steps, sleep and 2 more to go* in the foot; the name was the first thing squeezed, so **Walk 10,000 steps** folded onto three
lines to make room for a bar nobody read; five rows each carried a mark, a name, a value, a bar and a button, so nothing on
the card was louder than anything else; the four backfill chips read as a date picker and took a whole row; and the run — the
one number that brings anyone back — was 13 px grey in the corner.

- **The head is one object and one sentence** (`todayCardHtml()`, `habRingHtml()`): an 84 px ring whose segments are the day's
  habits, one each, filled green as each is ticked, with the **career level in the middle**; beside it the state at display
  size, the run under it, the four days you may still fill in, and a **›** that opens the habits page — which Home could not
  reach at all before. The card is 374 px now.
- ⚠️ **THE HEADLINE AND THE RING COUNT THE SAME THING.** They did not at first: the headline said what the *gate* still wanted
  (`dayToGo()`, which is weighted and lets a day count with one habit missing), so a card showing two ticks of five said
  *1 to go* while three open segments sat beside it. The headline is **the habits left** now, which is what the ring draws,
  and the gate gets its own, better moment: when the day passes it, the headline turns green and says **Today counts**
  (**Perfect** when every one is done). The sub-line is the run, or — when one habit is left and the day does not count yet —
  that one named: *One thing left: water.*
- **The rows give the name the row**: a mark, a name, and for a counted habit a stepper. The per-row bars are
  gone; the ring is the progress. The session's row is still the ledger line that only a finished session ticks.
- **The stepper: − number +** (2026-10-20, Amir: *"i need to have proper buttons to add to sleep and reduce it. better
  function"*). There used to be a **+** and nothing else, so the only way down was to tap the row, type the number and save:
  four taps to undo one. Both buttons step by the habit's OWN step (sleep 0.5 h, steps 500, the rest 1), the − stops at 0 and
  the + at the daily cap (3 × the target), and each says so by going quiet. **Holding either one repeats**, starting at 420 ms
  and accelerating to 70 ms, so 7.5 hours of sleep is one hold, not fifteen taps (`habStepOnce()`, `habStepDown()`).
  ⚠️ **The hold runs off the habit's id and the release is heard on the document**, because every step repaints the card and
  replaces the button under the finger. The click that follows a tap is the pointer's own echo and is ignored; a click with no
  pointer before it is the keyboard, and it gets one step. The number lives between the buttons (`.hb-now`), so the row reads
  as one control and the value is not said twice; *of 10,000* is not said either, because the name already is *Walk 10,000
  steps*. The typed field is still there, on the name.
- **The XP pop adds up**: a held + would otherwise flash a new number every step, so the running total is kept outside the DOM
  (`_habPop`) and the pop reads **+72 XP** for the whole hold. Taking a number back pops the same way in grey (**−36 XP**):
  XP that left in silence would be the app lying by omission.
- **The level's middle has a fallback**: without the career (offline with no copy, the demo, the coach's preview, the switch
  off) the ring's middle is the day's own count, `2/5` over *Done*. ⚠️ `paintHomeCareer()` repaints the card, because the
  profile answers after Home is already on screen and the ring would otherwise keep showing the count where the level belongs.
- **Home has no door row left.** The **Career row** and **Hold Serve's row** are gone (`careerRowHTML()`, `holdRowHTML()`,
  `holdDots()`, `holdLineText()` and `careerNearMark()` with them), and what they said is where it can be used: the level in
  the ring, the **weeks held in a row beside This Week's own count** (`holdRunText()`, `paintWeekRun()` — the RUN only, since
  what is left this week is what the count beside it already says), and the nearest mark on Progress, where the Achievements
  door names what is closest. Home reads: the greeting · This Week (with the run) · Next up · the rest of the week · a line
  from Amir when there is one · the habit card. **1,099 px, from 1,263.**
- **Home and Progress now answer different questions about the habits** (Amir: *"bringing it in, and use some stuff, or link
  it?"*): Home's card owns the **day and the run** and opens the page; Progress's **Daily habits** row owns the **month**
  (`8 days · this month`) and opens the same page. Neither prints the other's number.
- **The guide follows** (CNT-01): *Getting around* says Home is the week, a line from Amir and today's habits as one card with
  the level in its ring, and the **Hold Serve** card says the count shows beside This Week instead of on a row.
- **Tests**: `home-progress.js` §5b (the ring's segments, the state's three words, the sub-line, the › and no per-row bars, and the
  stepper: the step per habit, both ways, the floor, the cap, and a hold that repeats),
  `career.js` (no door row on Home, the level in the ring, the run beside the week, the ring not a button, 320 px and dark),
  `hold-serve.js` (every case of the run, now read off the week's line), `habits-list.js` (Progress keeps the month alone).

## What the habits pay (2026-10-20)

Amir: *"I want the habits to give xp as well. Like before. It doesnt show xp so the people dont fill like their progressing."*
They always have paid — `public.hab_xp()` pays a habit's weight times the completion bonus (1.2), and for the athletes who
track them it is most of their level (Elmira 15,338 of 47,573; Amir 8,190 of 13,495). No screen in this app said so.

- **The habits page says what they have earned**: one card under the two figures, the SERVER's own number
  (`get_profile` → `career.habits.xp`, never worked out here), with its share of the level and what today has paid
  (`habXpHtml()`, `habDayXp()`). It shows nothing until the career is on and the number is above zero.
- **Every habit says what it pays a day**, beside its name in the list (`+72 XP a day`, `habXpFull()`). The session's row says
  **Session pays it** instead: `strength` is locked, the server zeroes its weight (`career_paid_rules()`), and the session
  itself pays — no habit is ever paid twice.
- **A tick says what it just earned**: a `+36 XP` rises off the row and goes (`habXpPop()`, `.hb-pop`). ⚠️ **Not a toast** —
  the toast is a box with a button, and five of those a day is a chore. Only a tick that EARNED something says anything, so
  taking a habit back is silent, and a counter part way pays its share (half of eight glasses is `+15 XP`, the rest `+21`).
- **The arithmetic is the server's**, from the engine's own `XP_RULES.weights` (the same table as `career_rules.habits`), so
  the number on the phone is the number that lands. A habit the athlete added pays `customXp` (25 × 1.2).
- **One door into the one cabinet**: *From your habits · 1 of 4* opens the same **Achievements** page Progress opens
  (`habAchList()`, `habAchDoorHtml()`). It is not a second cabinet — it counts the habit-driven ones and names the closest.
- **Tests**: `career.js` → `habitXp()` (the card, the price on all five rows, the door, the pop, part credit, silence on undo).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
