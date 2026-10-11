# The athlete app — a map for someone opening it for the first time

**Status: DRAFT 1 · 2026-10-11 · English only** (Farsi follows once Amir has approved this text).
**Who it is for:** a new client who is comfortable with phones but new to this system, and, further down, the returning athlete starting cycle 2, 3 or 4.
**What it covers (Amir, 2026-10-11):** core training (sign-in → Home → a session → finishing it), the Library (Sessions, Playbook, Exercises), and Personal Records + Body Weight. AA Proof (the habit tracker) appears only as the row and strip on Home, with a pointer. The full AA Proof app, the coach dashboard, the Farsi course app and the testing app are not here.

**How this was made:** all 14,927 lines of `program.html` were read in eight slices on 2026-10-11, plus `PROGRAM-APP.md`, `MAP.md`, `Content/HOW-IT-WORKS.md`, `Content/PRODUCT.md` and the Proof sections of `HABITS.md`. Every label below is quoted from the code. It was **read, not run**: no screen was opened in a browser (see Part 2, F).

**Two parts.** Part 1 is the map itself, written to the client, and can be lifted as it is into a page, a guide or a WhatsApp message later. Part 2 is **for Amir only**: where the app disagrees with its own guide, what will trip a first-timer, and what is missing.

**Keeping it true:** this doc quotes the app's words. When a button is renamed, a control moves or a screen changes, change it here in the same commit (the same rule `CLAUDE.md` gives for `APP_GUIDE` and `ONB_TEXT`). Function names and line numbers in `[brackets]` are `program.html` as of 2026-10-11.

---

# PART 1 — THE MAP

## 1. The app in one minute

A private app on your phone that holds the programme Amir wrote for you. You open it at `amirardekani.com/program.html` and add it to your home screen. You sign in with a **username and password**; there is nothing to download from a store.

**Four tabs along the bottom, in this order: Home · Coach · Library · Game Plan.**

| Tab | What it is, in one line |
|---|---|
| **Home** | Your training: this cycle so far, this week's days, then your habits, records and body weight. You will live here. |
| **Coach** | The button to message Amir on WhatsApp, the notes he has written you, and "How the app works". |
| **Library** | Extra things that are not your programme: **Sessions** to train, the **Playbook** to read, **Exercises** to look up. |
| **Game Plan** | The whole plan: every cycle, what each is for, what comes next. |

**Three ideas hold the whole app together.**

1. **Your plan is layers.** A **cycle** (about 5 weeks, one clear goal) is made of **days** (Day 1, Day 2…), each day of **blocks** (warm-up, strength, power…), each block of **exercises**. The plan *will* change every few weeks. That is by design.
2. **You log, you rate, you tap Done.** You record each set (weight, reps, how hard it felt). At the end you give the whole session one rating from 1 to 10 and tap **Done · send to coach ✓**. That tap finishes the day and sends it to Amir.
3. **Amir answers only on WhatsApp.** There is no chat inside the app. Anywhere you might want to ask something (the Coach tab, the end of a session, every exercise's ⓘ), a button opens WhatsApp with the message already started, saying who you are and which day or exercise it is about.

The app never tells you which weight to lift mid-set. Your programme is set by **RPE** (how hard a set felt), and the app uses what you log to set your next weights.

---

## 2. The map

```
SIGN IN  (username + password)
   └─ Welcome  (once, on a fresh sign-in on this phone)

HOME ────────────────────────────────────────────────────────────────
   Greeting · (Offline note, only when relevant)
   This cycle card ─────────────────────────► GAME PLAN
   "Not finished" card  (only if a day was left open)
   This Week ── day cards ─────────────────► a DAY (the session)
   Week-done extra  (once the week is done) ► a Library session
   Daily habits row + today's strip ────────► AA Proof (its own app)
   Personal records row ────────────────────► PERSONAL RECORDS
   Body weight row ─────────────────────────► BODY WEIGHT

COACH
   Message me on WhatsApp ──► WhatsApp, pre-filled
   Personal notes  (cards Amir wrote for you)
   How the app works ───────► the Help sheet (15 cards)

LIBRARY
   Sessions ─► a shelf ─► a session ─► "Mark as done"
   Playbook ─► a category ─► an article
   Exercises ─► an exercise  (the About sheet)

GAME PLAN
   Header · "N days left in cycle" · cycle meter C1…Cn
   Done card ──► Archive (last cycle's plan, read-only)
   Active card · "Why your plan looks like this ›"
   Up next! · Locked

ON EVERY MAIN SCREEN
   Your initials (top right) ─► Account: Theme · Install the app ·
                                How the app works · Privacy · Sign out
```

**Inside a day (the session):**

```
DAY  (opened from a day card; the tab bar hides until you finish)
   Top: the day's card, ← back, 🌙 dark toggle
   Week note  (only in week 1 and the back-off week)
   SESSION BAR:  ← Home · clock · Start ▶ / Pause ⏸ · Guided ▶ · ⋯ (Reset)
        Start ▶ ─► READINESS CHECK ─► clock starts
        Guided ▶ ─► one set at a time, rest timed
   TODAY'S TARGETS banner  (only on a lower, short or sore day)
   BLOCKS ─► EXERCISE CARDS
        closed: ○ number name ●  numbers line  pill  ⓘ
        open:   Coach's note · Last time · How to do it · sets · Rest
        ⓘ ─► About this exercise ─► Your history
        Rest ─► Rest Timer
   FINISH CARD ─► rate 1–10 ─► Done · send to coach ✓
   FINISHED CARD  (✓, a message from Amir, send status)
```

**Layers that slide over a screen** (all closed the same way, see §9): the Readiness check, the Rest Timer, Guided, and the shared bottom **sheet** that carries History, About this exercise, "What you're building", "Why your plan looks like this", Account and Help.

---

## 3. Before the app: getting in

**What you are sent.** After you have paid and Amir has built your plan, he sends you a WhatsApp message with the link, your **username** and your **password**. It says to save the password when your phone offers (so next time it opens straight into your programme) and to add the app to your home screen.

**Add it to your home screen.**
- **iPhone:** open the link in **Safari**, tap Share, then **Add to Home Screen**.
- **Android:** open it in **Chrome**, tap the menu (⋮), then **Install app** or **Add to Home screen**.
- If you tapped the link inside WhatsApp, it opens in WhatsApp's own little browser, which **cannot install** the app. Open it in Safari or Chrome first (the app's install prompt says the same).

**The sign-in screen.** A green photo, "A *coach* in your pocket.", then two boxes, **Username** and **Password** (the eye shows what you typed), and **Sign in**.
- Your username is not an email. Type it as Amir sent it. A Farsi keyboard works: Persian digits are converted.
- If it fails: *"That username or password is not right. Check the message Amir sent you."* or *"Could not sign in just now. Check your connection and try again."*
- *"Lost your details? Message Amir and he'll send new ones."* is plain text, not a button. Message him on WhatsApp.
- If your password manager fills both boxes, the app signs you in by itself within a few seconds. Type, or tap the eye, to stop it.

**First open needs signal.** The first time, the app has to reach the server. Once it has opened with signal, it opens without signal too, from the plan saved on your phone (a quiet line says *"Offline · your plan as saved on this phone"*).

**The Welcome.** After your first sign-in on a phone, a full screen appears once: **"You're in"**, **"Welcome, {first name}."**, *"Your plan is ready. First up is {cycle name}, {weeks}."* and *"Any questions, message me on WhatsApp. The button is in the Coach tab."*
- **Open Day 1** goes Home and opens Day 1.
- **Look around first** just closes it.
- It has no ✕ and the phone's Back button does not close it. It will not come back on this phone.

---

## 4. Your first session, step by step

This is the order of a real first session, as the app behaves.

1. **Home → pick a day.** Under **This Week** each day is a big card: a photo, **Day 1**, its name, *"N blocks · M movements"* and up to three words such as *Strength · Brakes · Spring* (what the day builds). A faint green ring marks the day to do next. Tap the card.
2. **The day opens.** The card repeats at the top with a **←**. Under it is the **session bar**: *"Ready when you are"*, **00:00**, **Start ▶** and **Guided ▶**. A green note appears: *"Tap **Start** as you begin, so I know how long the session took. Or **Guided**: one set at a time, with your rest timed."* (tap **Got it**). Below are the blocks with their exercises, all folded.
3. **Tap Start ▶.** The **Readiness check** slides up (§5.2). Answer five questions, 1–5 each.
4. **Tap Begin session ▶.** The clock starts and the bar shrinks to one slim line (**← Home · clock · Pause ⏸ · ⋯**). The tab bar disappears so the workout has the screen.
5. **Open an exercise** by tapping its row. Read the Coach's note if there is one, watch **How to do it** if you want the video and cues.
6. **Log set 1.** Type the weight in the **kg** box (the reps box already shows the prescribed number in grey), then tap the **circle** on the right. A note says: *"Weight in, set done: tap the **circle**. One tap means done as written. Different reps? Type them first."*
7. **Say how hard it was.** A strip opens: **How hard?** and **6 7 8 9 10**. A note says: *"How hard was that set? **10**: not one more rep. **8**: two left. I set your weights from it."* Tap a number.
8. **Rest.** A pill, **Rest 2:00 ×**, slides up at the bottom of the screen. Tap it for the Rest Timer; tap **×** to dismiss it. It never starts on its own.
9. **Repeat for each set.** After the last set's number, the card folds into one summary line and the next exercise opens by itself.
10. **A card appears at the bottom of the session:** **In progress · 4 of 11 sets**, with **Finish early**. It is at the very end of the page, so scroll down to find it.
11. **When every set is done** it reads **All done with Day 1**. Rate the whole session **1 to 10** (*1 = very easy · 10 = maximum effort*), add a note if you want (**Notes for Coach**), then tap **Done · send to coach ✓**. If you have not rated: *"Rate the session first: 1 to 10."*
12. **Finished.** A ✓ card shows a message Amir wrote for that day, and the send status: *"Sending to your coach…"* then **"✓ With your coach · 2:14 PM"**. No signal? *"Saved on your phone. It goes to your coach when you have signal."* It sends itself later. The tab bar comes back.
13. **Install nudge.** About two seconds after your first sent report, the app may ask you to put it on your home screen (once).
14. **Back to Home** with **←**. Day 1 is now a small row, **✓ Day 1 … Done**, and the next day is ringed.

---

## 5. Room by room

### 5.1 Home

Top to bottom:

| Piece | What it says / does |
|---|---|
| **Greeting** | "Good morning / afternoon / evening" and your first name. |
| **Offline note** | One quiet line only when the app opened from the saved copy: *"Offline · your plan as saved on this phone, {when}"*. Or *"Your plan was updated"* with **Refresh**. Or *"The server didn't confirm your plan. Your sets are saved on this phone."* |
| **This cycle** card | **Cycle 3 of 6 · NAME ›**, **Week 2 of 5** with a bar, **4 of 15 sessions** with a bar, and **Wins this cycle** (up to three). Tap it for Game Plan. A new athlete sees *"Your wins show here: heavier, more reps or easier than your first session of the cycle."* See "wins" below. |
| **Not finished** card | Only if you left a day open: *"{Weekday}'s Day 2 was never sent"*, *"4 of 11 sets logged. Send it to me as it is, or clear it."* **Send it** / **Clear it** (two taps). |
| **This Week** | A count: *"2 of 3 sessions done this week"* or *"All 3 sessions done this week"*. In week 1 and the back-off week, a note from Amir sits here too. |
| **Day cards** | **Not done:** a big card. **In progress:** an *In progress* pill, *"4 of 11 sets"*, a live clock and **Resume ▶**. **Done this week:** a one-line row, ✓ *Day 1 … Done* (still tappable). |
| **Week-done extra** | When every session of the week is done: *"Week done ✓ · something extra"* with a short Library session. It goes once you have opened it. |
| **Daily habits** | A row: *"Daily habits"* and your verdict (*"2 to go"*, *"On target"*, *"Perfect"*) plus *"4 days in a row"*. Before you ever open AA Proof it says *"Sleep, steps, water, protein: tick them in AA Proof."* Tapping it leaves this app for AA Proof. Under it, **today's habits can be ticked in place** (a small AA Proof window) once you have set Proof up. |
| **Personal records** | *"Fill in by themselves as you train."* until you have one, then your heaviest lift's estimate with a small sparkline. Tap for the Records screen. |
| **Body weight** | *"Tap to add your first reading."* until you have one, then the latest weight and a trend. Tap for the Body Weight screen. |

**Wins.** The card compares each lift's first session of the cycle with your best since, and names the plainest true win: *"+2.5 kg, same reps, same RPE"*, *"+2 reps at 80 kg"*, *"40 kg × 8 felt easier: RPE 9 → 8"*. Only when two things moved at once does it say *"about 5% stronger"*. A lift needs at least two sessions in the cycle before a win can show, so the first week is normally empty.

**Home never names a rest day.** You move your days around; the green ring only points at the next one you have not done.

### 5.2 The session (the day view)

**The session bar.**
- Before you start: *"Ready when you are"*, **00:00**, **Start ▶**, **Guided ▶** (Guided only appears if the day has lifts to log).
- From Start until Done it is one slim line: **← Home** · clock · **Pause ⏸** · **⋯**. Under **⋯**: **Guided ▶** and **Reset** (Reset takes two taps: **Reset?**).
- **← Home** leaves the day but **the clock keeps running**. Use **Pause** if you stop.
- The clock keeps counting with the app closed or the phone locked. A session that began the evening before survives midnight; after about six hours past midnight it is treated as an old, unfinished day.

**The Readiness check.** *"Before you start · Readiness check. Ten seconds, and honest answers. On a lower day the app eases today's targets for you, and you can still train as written."*

| # | Question | Scale (5 = best, even for soreness and stress) |
|---|---|---|
| 1 | How well did you sleep last night? | Very poor · Poor · OK · Good · Excellent |
| 2 | How are your energy levels right now? | Exhausted · Tired · OK · Good · Very fresh |
| 3 | How sore are your muscles today? | Very sore · Sore · Mild · Slight · None |
| 4 | How's your stress / mood today? | Very stressed · Stressed · Neutral · Good · Great |
| 5 | Overall, how ready do you feel? | Not ready · Bit off · OK · Good · Fully ready |

- **Begin session ▶** stays grey until all five are answered.
- **Skip for today** starts the clock without the questions (no adjustments, no readiness sent).
- To cancel: tap the dark area outside, swipe the sheet down, or press Back. Nothing is saved.

**Today's targets (only on a lower day).** If your answers come out low, a banner under the session bar says **Lower day**, **Short day** or **Sore today**, and what changed:
- *"Every RPE is 1 lower today, never below 6. Same sets and reps."*
- On a really rough day: the session becomes the warm-up, your first power move and your first main lift; the rest is marked **Optional today**, drop it from the end.
- When sore: jumps and landings at half the sets (or none).
- Your programme itself never changes, only today's targets. **Train as written** reverses it all (the banner then offers **Use today's targets**). Amir sees which one you chose.

**The exercise card — closed.** One row per exercise, in order:
- **A circle on the left.** ⚠ On a closed card this ticks **every set at once, as written**, with no weight and no RPE, and folds the card. For normal logging, open the card and use the per-set circles.
- A number, the **name**, and a small **clay dot** if Amir left you a **Coach's note**.
- **The line of numbers:** `4 × 6 · RPE 7 · 3-1-1 · 2:30` = sets × reps · target RPE · tempo · rest. Only what was prescribed shows. A rest for a whole block sits on the block's header instead (*Rest 2m*).
- A **green pill** when there is a grip or one intention (for example *neutral grip*).
- **ⓘ** at the right end. Plain = what the exercise is for. **Clay** = Amir wrote a personal reason you have it ("Why you").
- A closed card shows **no history**. Open it to see last time.

**The exercise card — open** (tap the row; tap it again to close), in this order:
1. **Coach's note** (clay box; **More ›** / **Less** if long).
2. **Last time** (§ below), or **First time — "Today sets your baseline."**
3. **How to do it** — the video (tap ▶) and the **Coaching Cues** (green lines to do, red to avoid). Under the video, **Open in YouTube** opens the YouTube app or browser if the player will not play. It opens by itself the first time you meet an exercise.
4. **The sets** — see "Logging a set".
5. **Note** — a private note for today's sets ("Anything about today's sets? Your coach sees it with this session."). It then shows up under *Last time* next session.
6. **Rest ⏱ 2m** (or **Rest timer ⏱** if Amir set no rest) — opens the Rest Timer.

**Logging a set.** Each row: **SET · KG · REPS**, an **RPE** tag and a **circle**.

- **KG:** type the weight you used. A grey figure with a tiny **LAST** under it is last time's weight, as a reminder only: it is **not saved unless you type it**. A tick on an empty weight box records no weight. A weight typed in one set fills the empty sets below it.
- **REPS:** the grey number is the prescription. It looks filled but holds nothing. Type only if your reps differed. Typing the prescribed number stores nothing.
- **Circle:** tick = "done as written".
- **After a tick,** a **How hard?** strip opens: **6 7 8 9 10**. Tap one (tap it again to clear). An RPE over the target shows in **clay**, under it in **steel blue**. **How hard?** itself opens the short guide.
- Not rated yet? The tag reads a dashed **RPE**; tap it to reopen the strip.
- After the last set is rated, the card folds into one line (like `70 · 72.5 kg × 6 · 6 · 6 · 5 · RPE 6 7 7 8`) and the next card opens.

| Kind of exercise | What you see and do |
|---|---|
| **Weighted** (barbell, dumbbell, cable, machine) | SET · KG · REPS. Type the weight, change reps only if different, tick, rate. |
| **Bodyweight** | The KG box is hidden unless the exercise lists loaded kit or you have logged a weight on it before. |
| **Hold, time or distance** | No reps box. The dose (for example *30 s / side*) shows where reps would be. Tick, then rate. |
| **Superset / circuit** | A **Rounds** list (A, B, C…, each with its dose, a kg box if it takes weight, and a ▶ video) and a **Log** with one **How hard?** row per round. The big circle is the only "done" mark; rating the rounds alone does not tick it. |
| **Warm-up** | A list. Open a row for its cues. One circle ticks the whole warm-up. No weights, no RPE. |

**Last time and History.** In an open card: **Last time · Tue** and the last set (*70 kg × 5 @ 8*). A tap shows every set, your RPEs against the target, your note and **History ›** (a chart and the last sessions). A faint *"last · 80 × 4 @ 9"* under a set means that set ran over target last time. It never tells you what to lift. A different version of an exercise (a progression) counts as new: *"First time"* again.

**The Rest Timer.** Full-screen. Opens already running. **Pause**, **+15s**, **Reset**, **Close** and **Sound on/off** (a beep and a buzz at zero; iPhones do not buzz). The screen stays awake. At zero it shows **GO!** and closes. The pill's *"Rest 2:00"* is a default when Amir wrote no rest for that exercise; it is not a prescription.

**Guided mode** (the ▶ next to Start, or under ⋯). One exercise and one set at a time, the current set pinned.
- Footer: **Done — Start Rest ✓** (ticks the set as written, then rests), **‹ Prev**, then **Next →**, and **Finish Session ✓** on the last set.
- While you rest it asks the **Kg** (with **Same as last**), the **Reps** (− / +) and the **RPE** (6–10). On the last set there is no rest screen, so type the weight and RPE in the pinned row.
- Warm-ups and circuits that log nothing are skipped; they stay in the list.
- **✕** top right leaves Guided; everything logged stays. **?** opens the Guided guide. **Skip →** on a rest moves on without logging weight or RPE.
- **Finish Session ✓** does not finish the day: it takes you to the finish card, where you still rate and tap **Done**.

**Finishing.** See steps 10–12 in §4. Details worth knowing:
- **Finish early** needs two taps (**Tap again to finish early**), then lists what is **Not done**, with **Keep going** to return.
- Rating can be changed after Done. **Send the update to your coach** appears only when you change the rating or note after the first send.
- **Reset Session** (on the finished card) takes two taps. It clears ticks, reps, RPEs, the clock and the check-in on the day; typed weights and notes stay. It does **not** unsend a report that already went; finishing again sends a second one.
- After a sore check-in (1 or 2), the finished card offers a short Library session, *The Morning After*.
- A green line shows the session ticked your **Session** habit in AA Proof.

### 5.3 Coach

- **Coach Amir** — *Strength & conditioning coach*, with his photo.
- **Message me on WhatsApp** — *"Questions, swaps, anything that hurts, form videos."* Number **+44 7435 363461**. It opens WhatsApp with *"Hi Amir, it's {first name} ({cycle name}, week {n}). "* ready for you to finish.
- **Personal notes** — cards Amir wrote for you; tap one to read it (opening one closes the others).
- **Using the app → How the app works ›** — the Help sheet.

There is no chat in the app. Notes you type at the end of a session reach Amir and he reads them, but **he answers on WhatsApp**.

### 5.4 Library — "Train it, learn it, know it."

Separate from your programme. Three doors (counts as of 2026-10-11; they change as Amir adds things):

**Sessions — "— Train" (42).** Ready-made workouts to run on your own. Seven shelves, three rows each; **All N ›** on a shelf's picture shows the rest:
- Strength (5) · Conditioning (7) · On-Court (8) · Mobility (7) · Recovery (6) · Breath (3) · Care (6).
- Each row: name, what it is for, minutes and kit (*"50 min · Barbell"*), and **✓ Session / ✓ Mobility / ✓ Breathe** if finishing it ticks that AA Proof habit.
- Open one: **Before you start** (a safety note, always visible), **Why this session** (fold/unfold), then the exercises like your programme cards but with **no set logging**. Ticks stay on your phone and reset the next day.
- At the end, **Mark as done** tells Amir you did it and ticks the matching habit in AA Proof. It needs signal, and if it fails you tap again. Tapping the ticks inside a session changes nothing in your week's plan.

**Playbook — "— Learn" (21 reads).** Articles by category: For Coaches (coming soon) · Training (9) · Pre-Competition (2) · Recovery (7) · Mental (coming soon) · Nutrition (3) · Supplements (coming soon). Tap a title; **←** goes back to the Library where you left off.

**Exercises — "— Know" (320).** Every exercise in the library. Search ("Search exercises"), filter by **All**, **In your plan** or a movement pattern. A row opens the **About this exercise** sheet (§ below).

Library sessions are **not** your programme's "sessions". A programme session is a day of your plan; a Library session is an extra.

### 5.5 Game Plan

The whole route, top to bottom:
- Your name, your goal, and the current cycle's dates.
- *"**5 days** left in cycle · ends OCT 24"* — only in the last 14 days (not a billing message; it has no button).
- **Cycle meter:** one segment per cycle, labelled **C1 C2 … Cn**. Finished ones are faded green, the current one is clay, the rest grey. Not tappable.
- **Done** — the cycle just finished. Tap it to open the **Archive** (that cycle's plan as written, read-only, without your numbers).
- **Active** — this cycle, the only one open by default: **The Aims**, **Why This Cycle Matters**, **Expected outcomes after this cycle** (✓ list). Tapping the card jumps you to Home (only **Read less** stays on this screen).
- **Why your plan looks like this · N reasons ›** — appears when Amir has given at least three personal reasons (§ About sheet).
- **Up next!** and **Locked** — later cycles, folded; **Read more** shows their teaser. They cannot be opened further.

### 5.6 Personal Records

From the **Personal records** row on Home (or **Open in Personal Records ›** in an exercise's History). **← steps back one screen at a time.**

- *"The most you could lift for one rep, on each exercise. Worked out from your normal sets, so you never have to test it."* This is an **estimate** (a "1RM"), not a weight to lift.
- **They fill themselves.** When you finish a session, your best set on a main strength lift becomes a record if it beats everything before it. It needs a **weight, reps and an RPE**. Jumps, throws, carries and holds do not record. The numbers appear on Records or the Home row; there is no pop-up at Done. A new best shows a **New best** band on that lift's page for a week.
- **Empty at first:** *"Nothing here yet."* with four steps (open an exercise, type the weight, tick the set and tap your RPE, finish the session).
- **The top card** shows how strong you are for your size once you have logged a body weight (*"1.25×"*, *"Your own body weight"*). Without one it asks you to **Add your weight →** (it opens Body Weight).
- **Your lifts:** one row each, with a trend (*"▲ 5 kg since you started"*), when it was last logged and a sparkline. Tap one for its page: a chart and every entry (*"5 Oct · 70 kg × 5 @ RPE 8 · from your sets"*), each with a ✕ (two taps: **Delete?**; no undo).
- **+ Log a max** (when you tested a lift, or lifted away from the app): pick the lift from this cycle, then the heaviest set, reps, RPE and the date (past dates are fine). The result and a grade show as you type:
  - **Sharp** — heavy and close to your limit, trust it.
  - **Good** — close enough, trust the direction.
  - **Rough** — a long set, a rough guide only.
  - A long, easy set (about ten reps once you count the ones you had left) is refused, because the estimate would be a guess: *"Try a heavier set of 5 or fewer."*
- **Due for a retest** (end of a cycle, a lift Amir flagged **5RM**, nothing logged for four weeks): **Test 5RM →** opens the form ready for a test. On a lower day: *"Not today: your check-in says a lower day."*

### 5.7 Body Weight

From the **Body weight** row on Home. **←** goes Home.

- Empty: *"Your weight over time. Weigh yourself at the same time of day, ideally first thing, and the line means something."* One box, **Today's weight (kg)**, and **Weigh in**. Commas and Persian digits are accepted.
- **One reading per day.** Weighing in again the same day replaces it. You cannot back-date.
- With readings: the latest weight, **Up/Down N kg** or **Level** over the range, **7 days · 1 month · 3 months** chips, and a chart (green line = 7-day average, dots = real readings, shown from two readings).
- **Every reading** lists each one with a ✕ (two taps: **Delete?**).
- **Delete all my weight history** — two taps, **permanent**. Body weight is never scored and AA Proof does not use it.

### 5.8 About this exercise (the ⓘ sheet)

Tap the **ⓘ** on a card, a row in Library → Exercises, or a linked name. A sheet slides up with:
- **Why you** — only when Amir wrote a reason: a tag (*Your goal · Your body · Your test · Last cycle · You said · Your game*) and a sentence about you. Then **What it does**.
- Chips for the **movement pattern** (Squat, Hinge, Single leg, Pull, Anti-rotation, Jump & land…) and **qualities** (tap one for **What you're building**).
- **On court** (tennis and padel players): where it shows up in your game.
- **Muscles worked** — a front and back body drawing; **Main** muscles in full clay, **Helping** in soft clay; and whether it is **Jumping, Landing, Running** or **No impact**.
- **Regressions** (easier), **Progressions** (harder), **Alternatives** (same movement, other kit). Tap a name to read it; a dashed-outline name has no page yet.
- **Ask me about this exercise** — a WhatsApp button, pre-filled with the exercise and day.
- **Your history · N sessions ›** and **Close**.

**Why your plan looks like this** (under Game Plan's Active card): every exercise with a personal reason, grouped by the six tags above; tap one to open its sheet.

**What the three words on a day card mean.** *Strength · Brakes · Spring* are what the day trains most, strongest first, worked out from its exercises (warm-ups do not count). Tap a word to open **What you're building**.

### 5.9 Account and Help

Your **initials**, top right of every main screen (inside a day it becomes a 🌙):
- **Theme: Light | Dark.** Your choice, per phone. It never follows the phone's setting.
- **Install the app ›** (only if not installed).
- **How the app works ›** — 15 cards: Getting around · How your program is structured · RPE & Tempo · The readiness check · Logging your sets · Guided mode · The ⓘ — what an exercise is for · What each day builds · Last time — your history on every exercise · Personal Records — the most you could lift once · Finishing a session · What to report & how often · Install the app on your home screen · Built-in tools · Questions or problems. The dotted words **How hard?** and **tempo** open the right card.
- **Privacy ›** (opens in the browser).
- **Sign out** — two taps (**Tap again to sign out**). It first sends anything waiting, which can take several seconds on a weak signal; your training stays saved. If a report is still waiting for signal, it says so and goes when you sign in again.

### 5.10 AA Proof on Home (a pointer)

AA Proof is a separate habit app (sleep, steps, protein, water, your session…). Its row and a small live strip sit on Home; the full app opens when you tap the row. This map does not cover it. It ticks **Finish your session** for you when you finish a day.

---

## 6. Your cycle, week by week

**The rhythm.** A cycle is about five weeks: four loading weeks and a lighter last week.
- **Week 1** is for finding your weights. A green-edged note says what to do.
- **Weeks 2–4** build on week 1.
- **The last week is the "back-off" week,** lighter on purpose, with its own note.
- The week number follows the calendar from your cycle's start date, not what you trained. A "week" is seven days from that date (a Wednesday start gives Wednesday-to-Tuesday weeks).

**When the last day passes.** From the day after the cycle's end date, Home goes quiet on purpose:
- The card says **Cycle complete** (*"Finished Oct 6 · 5 of 5 weeks"*), or **Roadmap complete** on the last one.
- **Up next** shows the next cycle's teaser.
- The one thing to do is the button **Ready for Cycle N? — Message Amir to start it.** It opens WhatsApp.
- *"No new week until Cycle N starts. Want to keep moving? Any session from {cycle} still works."* — **Repeat a session** unfolds the days.
- The new cycle appears when Amir publishes it. There is nothing to press in the app to start it.

**What changes when you are not new.**
- No Welcome and no first-session notes after your first cycle or first finished session.
- **Last time** now fills every card; a progression or a new exercise says *"First time"*.
- **Wins** and **Personal records** have data. New plans carry fresh **Why you** reasons.
- A day you finished earlier shows as a small ✓ row; the green ring moves on.
- Game Plan shows only the previous cycle as a **Done** card (older ones are just segments on the meter).

---

## 7. Different situations, what you will see

| If… | …you will see |
|---|---|
| **No signal** | The app opens from the saved plan with *"Offline · your plan as saved on this phone"*. Sets are saved on the phone. The finished report waits and sends by itself. Never signed in on this phone before: *"No connection"* and **Try again**. |
| **The server turns you away** | *"Plan not available"*, **Sign in again**, **Message Amir on WhatsApp**. |
| **You left a day open** | The next morning (after a six-hour grace past midnight) a **Not finished** card: **Send it** files and sends it under the day you trained; **Clear it** (two taps) throws the ticks away. |
| **Lower / short / sore day** | A banner under the session bar and a *"RPE 7 → 6 today"* pill on cards. **Train as written** reverses it. |
| **Week 1 / last week** | A note from Amir on Home and at the top of each session. |
| **Last 14 days of a cycle** | *"N days left in cycle"* on Game Plan. |
| **The cycle is over** | See §6. |
| **Cycle has no dates** | Only a small line, *"Cycle 1 of 6 · NAME · Weeks 1–5"*, and no week features. |
| **You are sore (1 or 2)** | The finished card offers *The Morning After*. |
| **You finished every session this week** | Home offers *Green Light*, once. |
| **A lift is due for a retest** | A strip on Personal Records. |
| **Another phone / a cleared browser** | You sign in again; the Welcome shows again on that phone. |
| **The demo** (`?client=demo`) | A banner, sample data, nothing is sent. |

---

## 8. Words you will meet

| Word | Plain meaning |
|---|---|
| **Cycle** | About five weeks with one clear goal. The next builds on it. |
| **Game Plan** | The tab that shows all your cycles, past and future. |
| **Day / Block** | A day is one workout (Day 1, Day 2). A block is a section of it (warm-up, strength, power). |
| **This Week** | The seven days counted from your cycle's start date. |
| **Back-off week** | The lighter last week of a cycle. |
| **RPE** | How hard a set felt, 1–10. **10** = not one more rep. **8** = two reps left. **7** = about three left. The app asks 6–10 per set. |
| **Session rating** | One number, 1–10, for the whole day, asked at the end. |
| **Tempo** | Speed of each rep as four numbers, `3-1-1-0` = 3 s down, 1 s pause, 1 s up, 0 s pause at the top. The **clay digit** is the one that matters. *Hold* means a hold with no movement. |
| **Rest 2m / 2:30** | Minutes (2m) or minutes:seconds (2:30). |
| **Readiness check** | The 10-second questionnaire before a session. |
| **Lower day** | The label when the check-in comes out low. |
| **Optional today** | An exercise Amir's plan lets you drop on a short day. |
| **Coach's note** | A message about this exercise for you (the clay dot). |
| **Because / "Why you"** | The reason Amir picked an exercise for you (the clay ⓘ). |
| **Last time** | What you did on this exercise last time. |
| **LAST** | The grey weight in an empty box. A reminder only. |
| **Guided** | One set at a time, with rest timed for you. |
| **Round** | One pass through a superset or circuit. |
| **Personal record / 1RM** | The most you could lift once. An estimate worked out from your sets. |
| **5RM** | A hard set of five reps, used as a test. |
| **Sharp / Good / Rough** | How much to trust a record. |
| **Qualities** | Strength, Brakes, Spring and the others: what an exercise builds. |
| **Regression / Progression / Alternative** | Easier version / harder version / same movement on other kit. |
| **Library session** | An extra workout in the Library. Not your programme. |
| **Playbook** | The Library's articles. |
| **Sheet** | A panel that slides up from the bottom. |
| **AA Proof** | The separate habit tracker. |

---

## 9. One grammar for closing and undoing things

| To… | Do this |
|---|---|
| Go back one screen | **←** top left. |
| Close Guided or a video | **✕** top right. |
| Close a sheet | Swipe down, tap above it, tap **Close**, or press Back. |
| Close the Rest Timer | **Close** (or **Skip →** in Guided). |
| Close the Readiness check | Tap outside it, swipe down, or Back. |
| Leave a session without ending it | **← Home** (the clock keeps running). |
| Phone Back button | Closes whatever is on top, in order: video, timer, readiness, sheet, Guided, screen, day. On Home it leaves the app. **An iPhone app has no Back button**, so use the on-screen **←** and **✕**. |

**Anything that deletes takes two taps:** the button says what the second tap does (**Delete?**, **Tap again to reset**, **Tap again to finish early**, **Tap again to sign out**, **Tap again to clear**) and goes back after four seconds. **Cannot be undone:** Delete all my weight history, deleting a record or a reading, and a report once it has been sent.

---

## 10. What to tell Amir, and how

- **Every session:** rate it 1–10 and tap **Done · send to coach ✓**. That is the report.
- **Every Sunday:** a short WhatsApp on how the week felt: sleep, stress, niggles, tennis load.
- **Any time:** pain that lasts more than 48 hours, missed sessions, anything that feels off, an equipment swap, form-check videos. Use the buttons in the Coach tab, at the end of a session, and in every exercise's ⓘ: the message already says which day or exercise.
- Notes you type in the app are read but **not answered there**.

---

## 11. "I want to…" — where to go

| I want to… | Go to… |
|---|---|
| Do today's workout | Home → the ringed day card → Start ▶ |
| See which day is next | Home → This Week (the green ring) |
| Train one set at a time | In a day: Guided ▶ (or ⋯ → Guided) |
| Rest between sets | Tick a set → **Rest 2:00**; or the card's **Rest ⏱** |
| See what I lifted last time | Open the exercise → **Last time** → **History ›** |
| Know why this exercise is here | The ⓘ at the right end of the card |
| Watch how to do it | Open the card → **How to do it**; or Library → Exercises |
| Find an easier or harder version | ⓘ → **Regressions** / **Progressions** |
| Finish and send my session | Last card in the day → rate → **Done · send to coach ✓** |
| Fix a day I left open | Home → **Not finished** → **Send it** / **Clear it** |
| See my records | Home → **Personal records** |
| Put in a test result | Personal Records → **+ Log a max** |
| Log my weight | Home → **Body weight** → **Weigh in** |
| See the whole plan / what's next | **Game Plan** tab |
| See last cycle's plan | Game Plan → **Done** card |
| Ask Amir something | **Coach** tab → **Message me on WhatsApp** |
| Do an extra workout | **Library** → Sessions |
| Read something | **Library** → Playbook |
| Look up an exercise | **Library** → Exercises → Search |
| Switch to dark mode | Your initials → Theme |
| Put the app on my home screen | Your initials → **Install the app** |
| Learn how it all works | Your initials → **How the app works** |
| Sign out | Your initials → **Sign out** (two taps) |
| Get new login details | Message Amir on WhatsApp |

---
---

# PART 2 — NOTES FOR AMIR (not for clients)

## A. Where the app disagrees with itself (verified in the code)

1. **"Getting around" lists the tabs in the wrong order.** The guide says Home, Game Plan, Coach, Library. The bar is **Home · Coach · Library · Game Plan** [`APP_GUIDE` 8435 vs 4671].
2. **"How your program is structured" sends people to the wrong place.** It ends *"The 'Why this cycle matters' note on Home explains what we're chasing right now."* That note is on **Game Plan** (the Active card). Home's cycle card does not carry it [8437 vs `renderPlan` 7291].
3. **"orange" vs clay.** Three guide cards call the Coach's-note dot and the RPE over target **orange**; the app's own rule (`CLAUDE.md`, DS-01) and its colour are **clay** [8443, 8447, 8451].
4. **Reset and circuit ratings (to confirm in a browser).** The guide says Reset clears the RPEs. `resetDay` [11363] clears the sets of standard exercises and hides the round-rating rows, but I found no line that clears circuit round ratings, and circuit kg boxes are deliberately not cleared. A reader reported circuits keep their ratings after Reset.
5. **Copy slip:** after **Train as written** on a sore-only day, the line reads *"Your check-in suggested a sore today."* (the title is "Sore today", lower-cased into a sentence) [`readinessBannerHtml` 10954].

## B. What a first-timer is not told (onboarding gaps)

- **There is no written "first 10 minutes" anywhere** (no page, PDF or doc for athletes). The nearest pieces are the Welcome, three one-time notes, the 15-card guide and Amir's pasted WhatsApp.
- **The two WhatsApp messages** (the login, then the handoff, `coach.html` 1195 and `program-engage` SKILL 207-286) are the real onboarding. The handoff's tour of the app names Home, the check-in, Coach, the clay dot and ⓘ, Game Plan and the guide, but **not Library, and not Daily habits / AA Proof**.
- **The login message's install line** says only *Share → Add to Home Screen* (iPhone). It has no Android route and no warning that a link opened inside WhatsApp cannot install.
- **The app's own install nudge waits** until the first finished session, so the first session usually runs from the browser.
- **The Welcome is one-shot,** has no ✕ and ignores Back. **The three first-session notes are permanent once dismissed** (**Got it**) and never appear for anyone past cycle 1, anyone with a finished session, or anyone with a LAST weight. The guide is the only way back to them.
- **AA Proof is first explained by a one-line quiet row** on Home. Its own onboarding appears only after a tap.
- **"Lost your details? Message Amir…"** on the sign-in screen is not a link and has no number.

## C. What will most likely trip a first-timer (ranked)

1. **Finishing is hidden at the bottom of a long page.** Rating and **Done** appear only when every set is ticked or after **Finish early** (two taps), and the page does not scroll there. Guided's **Finish Session ✓** only takes you there. Nothing is sent until rated and Done.
2. **The big circle on a closed card ticks every set at once, as written,** with no weight and no RPE, and folds the card. The notes say "tap the circle", which means the per-set circle inside.
3. **A tick on an empty weight box saves no weight.** The grey LAST figure looks like a value. No weight means no Last time, no History line and no Personal Record.
4. **No RPE, no Personal Record.** And RPE is asked in two scales (6–10 per set, 1–10 per session).
5. **Readiness.** **Begin session ▶** stays grey with no reason given. A low answer silently lowers targets and may mark cards **Optional today**, which can alarm a first-timer. **Skip for today** starts the clock anyway.
6. **No Start, no duration.** Sets can be logged without pressing Start, so the report has no time, load or readiness. The slim bar hides its "In progress / Paused" label, so forgetting **Pause** inflates the session.
7. **Records look dead for the first sessions:** nothing at Done, only strength lifts with weight + RPE qualify, and the first value is never celebrated.
8. **Tapping the Active card (even the text) on Game Plan jumps to Home.** Only **Read less** stays.
9. **Tapping the Daily habits row leaves this page** for AA Proof, and the finished-card line does the same.
10. **Between cycles the only action is a WhatsApp message,** and on the very last cycle it still says "Ready for Cycle N+1?" for a cycle that does not exist.
11. The **same exercise name on two days shares one set log** until the midnight sweep, so a card can look pre-ticked on the other day.
12. **Mid-session the tab bar is gone.** The exits are ← Home, the day's ←, or Back.

## D. Small things reported in the code (not all re-checked)

- **Library counts can stick at "0 Sessions / 0 Reads"** if the first visit is offline: `loadLibCounts` sets `_libCountsLoaded = true` after a failed load and never retries [9546–9557]. *(I re-read this; it holds.)*
- **Dates can show a day early west of UTC** in Game Plan's header and banner: `fmtDate` parses `YYYY-MM-DD` as UTC then reads local parts [7166]. *(I re-read this; it holds.)* Home's week maths parses correctly, so the two screens could disagree.
- **"Rest 2:00" pill** appears with a default 2:00 even when the card shows no rest.
- **Guided has no ⓘ** (only History ›). Circuit cards have no ⓘ.
- **Quality words and ⓘ** are absent until the exercise library has loaded once (a new phone offline shows neither).
- **`shortLift`** cuts names over 13 characters, so a record can read "Romanian Dea…".
- **"How hard?" link is hidden on phones ≤ 360 px.**
- **The "Day N" on a card is its list position;** "Not finished" says the day's id. They agree unless ids skip.
- **Welcome "Open Day 1"** always opens the first day in the list, even for a returning athlete on a new phone.

## E. Docs that are stale (found while reading)

- `HABITS.md` line 61 says the Daily Habits card is also "at the end of Game Plan"; the code comment says it moved to Home.
- `Content/HOW-IT-WORKS.md` line 104 still says "a private link that installs AA Performance".
- `Content/PRODUCT.md` line 52 lists a different tab order; line 104 still mentions Notion sync (retired).
- `MAP.md` line 71 says AA Proof is "reached from" Home's row; Home now also embeds its strip.
- `Content/FRESH-EYES.md` line 90 (#298) still says "Amir is building it now" (superseded by PROG-02).

## F. What this map does not yet have

- **It was read, not run.** No screen was opened in a browser. A pass with the demo (`?client=demo`) at 390 px would confirm every label and give real screenshots for a client page.
- **It does not cover** the full AA Proof app, the Farsi course app, the testing app or the coach dashboard.
- **Live counts** (42 sessions, 21 articles, 320 exercises) are from the database on 2026-10-11 and will drift.
- **Not documented anywhere:** whether the login and handoff WhatsApps go separately or merged; whether the Proof strip shows in the demo.
