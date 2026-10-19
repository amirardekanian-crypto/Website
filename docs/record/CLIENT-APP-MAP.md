# The athlete app — a map for someone opening it for the first time

> ⚠ **Written 2026-10-11, before Centre Court (2026-10-12/13).** The screens, screenshots and tab names below are out of date: the bar is now **Home · Progress · Library · Coach** (Game Plan became the road on Progress), the Library has no doors page (one switch: Sessions · Playbook · Exercises), the This cycle card moved from Home to Progress, and every screen has the new look ([`APP-UI-KIT.md`](../../Content/APP-UI-KIT.md)). Re-check each section against `PROGRAM-APP.md` and re-capture the shots before this goes to a client.

**Status: DRAFT 5 · 2026-10-11 · English only** (Farsi follows once Amir has approved this text).
**Who it is for:** a new client who is comfortable with phones but new to this system, and, further down, the returning athlete starting cycle 2, 3 or 4.
**What it covers (Amir, 2026-10-11):** core training (sign-in → Home → a session → finishing it), the Library (Sessions, Playbook, Exercises), and Personal Records + Body Weight. AA Proof (the habit tracker) appears only as the row and strip on Home, with a pointer. The full AA Proof app, the coach dashboard, the Farsi course app and the testing app are not here.

**Voice (Amir, 2026-10-11): Part 1 is written in Amir's own voice** ("message me", "I answer on WhatsApp"), because the app itself speaks as him and so does his WhatsApp handoff. Part 2 is neutral and is for Amir only.

**Colours, as the athlete is told them:** the app's accent (the `--clay` token) is called **orange** in everything an athlete reads, and RPE under target is **blue**. Part 1 keeps to those words. Do not write "clay" in athlete-facing text.

**How this was made:** all 14,927 lines of `program.html` were read in eight slices on 2026-10-11, plus `PROGRAM-APP.md`, `MAP.md`, `Content/HOW-IT-WORKS.md`, `Content/PRODUCT.md` and the Proof sections of `HABITS.md`. Every label below is quoted from the code. Then the labels and flows were walked in a headless phone-width browser (Part 2, F), and the 50 screenshots are in `Content/client-app-map/` (index: §12).

**Two parts.** Part 1 is the map itself and can be lifted as it is into a page, a guide or a WhatsApp message later. Part 2 is **for Amir only**: findings, first-timer traps, gaps.

**Keeping it true:** this doc quotes the app's words. When a button is renamed, a control moves or a screen changes, change it here in the same commit (the same rule `CLAUDE.md` gives for `APP_GUIDE` and `ONB_TEXT`). Function names and line numbers in `[brackets]` are `program.html` as of 2026-10-11.

---

# PART 1 — THE MAP

## 0. Your first ten minutes

You do not need to read the rest of this to start. Do these in order.

1. **Open the link I sent you** and sign in with the username and password from my message. When your phone offers to save the password, say yes.
2. **Put the app on your home screen.** iPhone: open the link in **Safari**, tap Share, then **Add to Home Screen**. Android: open it in **Chrome**, tap ⋮, then **Install app**. (A link opened inside WhatsApp can't install: open it in Safari or Chrome first.)
3. **A welcome screen appears once.** Tap **Open Day 1**, or **Look around first**.
4. **Four tabs along the bottom:** **Home** is your training. **Coach** is the button to message me. **Library** is extras. **Game Plan** is the whole plan.
5. **To train:** Home → the day card with the green ring → **Start ▶** → answer five quick questions → **Begin session ▶**.
6. **Open an exercise** (tap its row). Type the weight. Tap the **circle** when the set is done. Tap how hard it was, **6 to 10**.
7. **After your last exercise the page scrolls you down to the finish card.** Rate the whole session **1 to 10**, then tap **Done · send to coach ✓**. That sends it to me.
8. **Any question, any niggle:** Coach tab → **Message me on WhatsApp**. I answer there, not in the app.

**Four things nobody tells you:**
- On a *closed* exercise, open the card first and tick each set there. (Once you've finished a session, the circle on a closed card ticks every set as written.)
- The grey number in an empty kg box is last time's weight, as a reminder. It is **not saved**. Type your weight. (If you tick a set with no weight, a small note tells you.)
- Week 1 is for finding your weights. If it feels light, that's the point.
- No signal? Keep training. Everything saves on your phone and sends itself later.

---

## 1. The app in one minute

A private app on your phone with the programme I wrote for you. You open it at `amirardekani.com/program.html` and add it to your home screen. You sign in with a **username and password**; there is nothing to download from a store.

**Four tabs along the bottom, in this order: Home · Coach · Library · Game Plan.**

| Tab | What it is, in one line |
|---|---|
| **Home** | Your training: this cycle so far, this week's days, then your habits, records and body weight. You will live here. |
| **Coach** | The button to message me on WhatsApp, the notes I've written you, and "How the app works". |
| **Library** | Extras that are not your programme: **Sessions** to train, the **Playbook** to read, **Exercises** to look up. |
| **Game Plan** | The whole plan: every cycle, what each is for, what comes next. |

**Three ideas hold the whole app together.**

1. **Your plan is layers.** A **cycle** (about 5 weeks, one clear goal) is made of **days** (Day 1, Day 2…), each day of **blocks** (warm-up, strength, power…), each block of **exercises**. The plan *will* change every few weeks. That's by design.
2. **You log, you rate, you tap Done.** You record each set (weight, reps, how hard it felt). At the end you give the whole session one rating from 1 to 10 and tap **Done · send to coach ✓**. That tap finishes the day and sends it to me.
3. **I answer only on WhatsApp.** There is no chat inside the app. Anywhere you might want to ask me something (the Coach tab, the end of a session), a button opens WhatsApp with the message already started, saying who you are and which day it's about.

The app never tells you which weight to lift mid-set. Your programme is set by **RPE** (how hard a set felt), and I use what you log to set your next weights.

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
   Personal notes  (cards I wrote for you)
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
DAY  (opened from a day card; the tab bar hides once you tap Begin or Skip)
   Top: the day's card, ← back, 🌙 dark toggle
   SESSION BAR:  ← Home · clock · Start ▶ / Pause ⏸ · Guided ▶ · ⋯ (Reset)
        + a thin row under it in a week where the note sets a limit ("Back-off week · Max RPE 7 · 1 set fewer")
        Start ▶ ─► READINESS CHECK ─► clock starts
        Guided ▶ ─► one set at a time, rest timed
   TODAY'S TARGETS banner  (only on a lower, short or sore day)
   BLOCKS ─► EXERCISE CARDS
        closed: ○ number name ●  numbers line  pill  ⓘ
        open:   Coach's note · How to do it · sets · Rest
        ⓘ ─► About this exercise ─► Your history
        Rest ─► Rest Timer
   FINISH CARD ─► rate 1–10 ─► Done · send to coach ✓
   FINISHED CARD  (✓, a message from me, send status)
```

**Layers that slide over a screen** (all closed the same way, see §9): the Readiness check, the Rest Timer, Guided, and the shared bottom **sheet** that carries History, About this exercise, "What you're building", "Why your plan looks like this", Account and Help.

---

## 3. Before the app: getting in

*Screens: [01-sign-in](../../Content/client-app-map/01-sign-in.jpg) · [02-welcome](../../Content/client-app-map/02-welcome.jpg)*

**What I send you.** After you've paid and I've built your plan, I send you a WhatsApp message with the link, your **username** and your **password**. Save the password when your phone offers (so next time it opens straight into your programme) and add the app to your home screen.

**Add it to your home screen.**
- **iPhone:** open the link in **Safari**, tap Share, then **Add to Home Screen**.
- **Android:** open it in **Chrome**, tap the menu (⋮), then **Install app** or **Add to Home screen**.
- If you tapped the link inside WhatsApp, it opens in WhatsApp's own little browser, which **can't install** the app. Open it in Safari or Chrome first (the app's install prompt says the same).

**The sign-in screen.** A green photo, the small heading *AA Performance*, "A *coach* in your pocket.", the line *A path to your target.*, then two boxes, **Username** and **Password** (the eye shows what you typed), and **Sign in**.
- Your username is not an email. Type it as I sent it. A Farsi keyboard works: Persian digits are converted.
- If it fails: *"That username or password is not right. Check the message Amir sent you."* or *"Could not sign in just now. Check your connection and try again."* (the server did not answer), or *"The sign-in could not load on this connection. Check your connection, or switch between wifi and mobile data, then tap Sign in again."* (the app's own sign-in library did not download; Sign in fetches it again by itself, so one tap is enough once the signal is back).
- *"Lost your details? **Message Amir** and he'll send new ones."* — **Message Amir** opens WhatsApp with the reason already written.
- If your password manager fills both boxes, the app signs you in by itself within a few seconds. Type, or tap the eye, to stop it.

**First open needs signal.** The first time, the app has to reach the server. Once it has opened with signal, it opens without signal too, from the plan saved on your phone (a quiet line says *"Offline · your plan as saved on this phone"*).

**The Welcome.** After your first sign-in on a phone, a full screen appears once: **"You're in"**, **"Welcome, {first name}."**, *"Your plan is ready. First up is {cycle name}, {weeks}."* and *"Any questions, message me on WhatsApp. The button is in the Coach tab."*
- **Open Day 1** goes Home and opens Day 1.
- **Look around first** just closes it.
- The **✕** top right closes it too, and so does the phone's Back button. It won't come back on this phone.

---

## 4. Your first session, step by step

*Screens: [05-day-opened](../../Content/client-app-map/05-day-opened.jpg) · [06-readiness-empty](../../Content/client-app-map/06-readiness-empty.jpg) · [07-session-slim-bar](../../Content/client-app-map/07-session-slim-bar.jpg) · [11-card-open](../../Content/client-app-map/11-card-open.jpg) · [14-rpe-strip](../../Content/client-app-map/14-rpe-strip.jpg) · [17-card-folds-next-opens](../../Content/client-app-map/17-card-folds-next-opens.jpg) · [22-finish-card-in-progress](../../Content/client-app-map/22-finish-card-in-progress.jpg) · [23-finish-card-all-done](../../Content/client-app-map/23-finish-card-all-done.jpg) · [24-done-without-rating](../../Content/client-app-map/24-done-without-rating.jpg) · [25-finished-card](../../Content/client-app-map/25-finished-card.jpg) · [26-install-nudge](../../Content/client-app-map/26-install-nudge.jpg) · [27-home-after-session](../../Content/client-app-map/27-home-after-session.jpg)*

This is the order of a real first session, as the app behaves.

1. **Home → pick a day.** Under **This Week** each day is a big card: a photo, **Day 1**, its name, *"N blocks · M movements"* and up to three words such as *Strength · Brakes · Spring* (what the day builds). A faint green ring marks the day to do next. Tap the card.
2. **The day opens.** The card repeats at the top with a **←**. Under it is the **session bar**: *"Ready when you are"*, **00:00**, **Start ▶** and **Guided ▶**. A green note appears: *"Tap **Start** as you begin, so I know how long the session took. Or **Guided**: one set at a time, with your rest timed."* (tap **Got it**). Below are the blocks with their exercises, all folded.
3. **Tap Start ▶.** The **Readiness check** slides up (§5.2). Answer five questions, 1–5 each.
4. **Tap Begin session ▶.** (If you tick a set before pressing Start, a note box offers it once: *"The session clock isn't running."* with **Start** and **Not now**.) The clock starts and the bar shrinks to one slim line (**← Home · clock · Pause ⏸ · ⋯**), with a thin line under it in a week where my note sets a limit (*Max RPE 7 · 1 set fewer*). The tab bar disappears so the workout has the screen.
5. **Open an exercise** by tapping its row. Read my note if there is one. Open the **Video & cues** row if you want the video and the cues.
6. **Log set 1.** Type the weight in the **kg** box (the reps box already shows the prescribed number in grey), then tap the **circle** on the right. Tick with no weight and a note appears in the middle of the screen: *"No weight saved on that set. Type it in the kg box."* (tap **Got it**) A note says: *"Weight in, set done: tap the **circle**. One tap means done as written. Different reps? Type them first."*
7. **Say how hard it was.** A strip opens: **How hard?** and **6 7 8 9 10**. A note says: *"How hard was that set? **10**: not one more rep. **8**: two left. I set your weights from it."* Tap a number.
8. **Rest.** When you want the timer, tap the card's **Rest ⏱** button (under the sets). It never starts on its own, and Guided starts it for you after every set.
9. **Repeat for each set.** After the last set's number, the card folds into one summary line and the next exercise opens by itself.
10. **A card appears at the bottom of the session:** **In progress · 4 of 11 sets**, with **Finish early**. It's at the very end of the page. When you finish the last exercise the page scrolls to it for you; until then, scroll down to find it.
11. **When every set is done** it reads **All done with Day 1**. Rate the whole session **1 to 10** (*1 = very easy · 10 = maximum effort*), add a note if you want (**Notes for Coach**), then tap **Done · send to coach ✓**. If you haven't rated: *"Rate the session first: 1 to 10."*
12. **Finished.** A ✓ card shows a message I wrote for that day, and the send status: *"Sending to your coach…"* then **"✓ With your coach · 2:14 PM"**. No signal? *"Saved on your phone. It goes to your coach when you have signal."* It sends itself later. The tab bar comes back.
13. **Install nudge.** About two seconds after your first sent report, the app may ask you to put it on your home screen (once).
14. **Back to Home** with **←**. Day 1 is now a small row, **✓ Day 1 … Done**, and the next day is ringed.

---

## 5. Room by room

### 5.1 Home

*Screens: [03-home-top](../../Content/client-app-map/03-home-top.jpg) · [04-home-lower](../../Content/client-app-map/04-home-lower.jpg) · [08-home-session-in-progress](../../Content/client-app-map/08-home-session-in-progress.jpg) · [28-home-returning](../../Content/client-app-map/28-home-returning.jpg) · [29-home-habits-strip](../../Content/client-app-map/29-home-habits-strip.jpg) · [47-home-not-finished](../../Content/client-app-map/47-home-not-finished.jpg) · [48-home-offline](../../Content/client-app-map/48-home-offline.jpg)*

Top to bottom:

| Piece | What it says / does |
|---|---|
| **Greeting** | "Good morning / afternoon / evening" and your first name. |
| **Offline note** | One quiet line only when the app opened from the saved copy: *"Offline · your plan as saved on this phone, {when}"*. Or *"Your plan was updated"* with **Refresh**. Or *"The server didn't confirm your plan. Your sets are saved on this phone."* |
| **This cycle** card | **Cycle 3 of 6 · NAME ›**, **Week 2 of 5** with a bar, **4 of 15 sessions** with a bar, and **Wins this cycle** (up to three). Tap it for Game Plan. A new athlete sees *"Your wins show here: heavier, more reps or easier than your first session of the cycle."* See "wins" below. |
| **Not finished** card | Only if you left a day open: *"{Weekday}'s Day 2 was never sent"*, *"4 of 11 sets logged. Send it to me as it is, or clear it."* **Send it** / **Clear it** (two taps). |
| **This Week** | A count: *"2 of 3 sessions done this week"* or *"All 3 sessions done this week"*. In a week with a note from me (week 1, a test week, the back-off) the note IS this section: your first name, my rule for the week in big type, the rest of my words, my signature and photo, with the count on its top line (*"2 of 3 done"*). |
| **Day cards** | **Not done:** a big card. **In progress:** an *In progress* pill, *"4 of 11 sets"*, a live clock and **Resume ▶**. **Done this week:** a one-line row, ✓ *Day 1 … Done* (still tappable). |
| **Week-done extra** | When every session of the week is done: *"Week done ✓ · something extra"* with a short Library session. It goes once you've opened it. |
| **Daily habits** | A row: *"Daily habits"* and your verdict (*"2 to go"*, *"On target"*, *"Perfect"*) plus *"4 days in a row"*. Before you ever open AA Proof it says *"Sleep, steps, water, protein: tick them in AA Proof."* Tapping it leaves this app for AA Proof. Under it, **today's habits can be ticked in place** (a small AA Proof window) once you've set Proof up. |
| **Personal records** | *"Fill in by themselves as you train."* until you have one, then your heaviest lift's estimate with a small sparkline. Tap for the Records screen. |
| **Body weight** | *"Tap to add your first reading."* until you have one, then the latest weight and a trend. Tap for the Body Weight screen. |

**Wins.** The card compares each lift's first session of the cycle with your best since, and names the plainest true win: *"+2.5 kg, same reps, same RPE"*, *"+2 reps at 80 kg"*, *"40 kg × 8 felt easier: RPE 9 → 8"*. Only when two things moved at once does it say *"about 5% stronger"*. A lift needs at least two sessions in the cycle before a win can show, so the first week is normally empty.

**Home never names a rest day.** You move your days around; the green ring only points at the next one you haven't done.

### 5.2 The session (the day view)

*Screens: [05-day-opened](../../Content/client-app-map/05-day-opened.jpg) · [06-readiness-empty](../../Content/client-app-map/06-readiness-empty.jpg) · [07-session-slim-bar](../../Content/client-app-map/07-session-slim-bar.jpg) · [09-lower-day-banner](../../Content/client-app-map/09-lower-day-banner.jpg) · [10-cards-closed](../../Content/client-app-map/10-cards-closed.jpg) · [11-card-open](../../Content/client-app-map/11-card-open.jpg) · [12-card-open-last-time](../../Content/client-app-map/12-card-open-last-time.jpg) · [13-history-sheet](../../Content/client-app-map/13-history-sheet.jpg) · [14-rpe-strip](../../Content/client-app-map/14-rpe-strip.jpg) · [16-rest-timer](../../Content/client-app-map/16-rest-timer.jpg) · [18-circuit-card](../../Content/client-app-map/18-circuit-card.jpg) · [19-guided-set](../../Content/client-app-map/19-guided-set.jpg) · [20-guided-rest](../../Content/client-app-map/20-guided-rest.jpg) · [21-guided-complete](../../Content/client-app-map/21-guided-complete.jpg)*

**The session bar.**
- Before you start: *"Ready when you are"*, **00:00**, **Start ▶**, **Guided ▶** (Guided only appears if the day has lifts to log).
- From Start until Done it's one slim line: **← Home** · clock · **Pause ⏸** · **⋯**. Under **⋯**: **Guided ▶** and **Reset** (Reset takes two taps: **Reset?**).
- In a week where my note sets a limit, a thin line sits at the bottom of the bar, before Start and all session: *"This week · Max RPE 7"*, *"Back-off week · Max RPE 7 · 1 set fewer"*, or *"… except the retest"* on a day with a retest. It goes when the day is done. That week no target is above my limit. A lift written above it counts at the limit, one written below keeps its own number. Over shows in orange, under in blue. A lift you retest in the last week keeps its own number, except on a lower day.
- **← Home** leaves the day but **the clock keeps running**. Use **Pause** if you stop.
- The slim bar stays pinned to the top as you scroll. A thin rail down the right edge of the screen shows the sets you've done.
- The clock keeps counting with the app closed or the phone locked. A session that began the evening before survives midnight; after about six hours past midnight it's treated as an old, unfinished day.

**The Readiness check.** *"Before you start · Readiness check. Ten seconds, and honest answers. On a lower day the app eases today's targets for you, and you can still train as written."*

| # | Question | Scale (5 = best, even for soreness and stress) |
|---|---|---|
| 1 | How well did you sleep last night? | Very poor · Poor · OK · Good · Excellent |
| 2 | How are your energy levels right now? | Exhausted · Tired · OK · Good · Very fresh |
| 3 | How sore are your muscles today? | Very sore · Sore · Mild · Slight · None |
| 4 | How's your stress / mood today? | Very stressed · Stressed · Neutral · Good · Great |
| 5 | Overall, how ready do you feel? | Not ready · Bit off · OK · Good · Fully ready |

- The button is grey and counts your answers (**3 of 5 answered**), then becomes **Begin session ▶** at five.
- **Skip for today** starts the clock without the questions (no banner and no adjustments; I just see that you skipped). A limit from my week note still counts.
- To cancel: tap the dark area outside, swipe the sheet down, or press Back. Nothing is saved.

**Today's targets (only on a lower day).** If your answers come out low, a banner under the session bar says **Lower day**, **Short day** or **Sore today**, and what changed:
- *"Every RPE is 1 lower today, never below 6. Same sets and reps."*
- On a really rough day: the session becomes the warm-up, your first power move and your first main lift; the rest is marked **Optional today**, drop it from the end.
- When sore: jumps and landings at half the sets (or none).
- Your programme itself never changes, only today's targets. **Train as written** reverses it all (the banner then offers **Use today's targets**). I see which one you chose. A limit from my week note still counts either way. On a lower day the lower number wins.

**The exercise card — closed.** One row per exercise, in order:
- **A circle on the left.** Until you've finished your first session it **opens the card** (with a note on how to log). After that it ticks **every set at once, as written**, with no weight and no RPE, and folds the card (the name is struck through and the line shows only the reps): a shortcut for when you did exactly what was written. For normal logging, open the card and use the per-set circles.
- A number, the **name**, and a small **orange dot** if I left you a **Coach's note**.
- **The line of numbers:** `4 × 6 · RPE 7 · 3-1-1 · 2:30` = sets × reps · target RPE · tempo · rest. Only what's prescribed shows. A rest for a whole block sits on the block's header instead (*Rest 2m*).
- A **green pill** when there's a grip or one intention (for example *neutral grip*).
- **ⓘ** at the right end. Plain = what the exercise is for. **Orange** = I wrote you a personal reason for having it ("Why am I doing this?").
- A closed card shows **no history**. Open it to see last time.

**The exercise card — open** (tap the row; tap it again to close), in this order:
1. **Coach's note** (orange box; **More ›** / **Less** if long).
2. **First time — "Today sets your baseline."** on an exercise you have never logged. There is no Last time box (since 2026-10-12): the grey **LAST** weight in each empty box is last time.
3. **Video & cues** — the row reads *Video & 4 cues*, *Video* or *3 cues*. Open it for the video (tap ▶) and the cues (green lines to do, red lines to avoid; the heading **Coaching Cues** appears only in the exercise's ⓘ sheet). Under the video, **Open in YouTube** opens the YouTube app or browser if the player won't play. It opens by itself the first time you meet an exercise.
4. **The sets** — see "Logging a set".
5. **Note** — a private note for today's sets ("Anything about today's sets? Your coach sees it with this session."). It then shows up in **Your history** (the ⓘ).
6. **Rest ⏱ 2m** (or **Rest timer ⏱** if I set no rest) — opens the Rest Timer.

**Logging a set.** Each row: **SET · KG · REPS**, an **RPE** tag and a **circle**.

- **KG:** type the weight you used. A grey figure with a tiny **LAST** under it is last time's weight, as a reminder only: it is **not saved unless you type it**. A tick on an empty weight box records no weight, and the app tells you (the box pulses and a note says *"No weight saved on that set. Type it in the kg box."*; once a session after your first). A weight typed in one set fills the empty sets below it.
- **REPS:** the grey number is the prescription. It looks filled but holds nothing. Type only if your reps differed. Typing the prescribed number stores nothing.
- **Circle:** tick = "done as written".
- **After a tick,** a **How hard?** strip opens: **6 7 8 9 10**. Tap one (tap it again to clear). An RPE over the target shows in **orange**, under it in **blue**. In a week where my note sets a limit, no target is above it. The card still shows its own number. **How hard?** itself opens the short guide.
- Not rated yet? The tag reads a dashed **RPE**; tap it to reopen the strip.
- After the last set is rated, the card folds into one line (like `70 · 72.5 kg × 6 · 6 · 6 · 5 · RPE 6 7 7 8`, cut short on a small phone) and the next card opens.

| Kind of exercise | What you see and do |
|---|---|
| **Weighted** (barbell, dumbbell, cable, machine) | SET · KG · REPS. Type the weight, change reps only if different, tick, rate. |
| **Bodyweight** | The KG box is hidden unless the exercise lists loaded kit or you've logged a weight on it before. |
| **Hold, time or distance** | No reps box. The dose (for example *30 s / side*) shows where reps would be. Tick, then rate. |
| **Superset / circuit** | A **Rounds** list (A, B, C…, each with its dose, a kg box on every item of a working circuit, and a ▶ video) and a **Log** with one **How hard?** row per round. The big circle is the only "done" mark; rating the rounds alone doesn't tick it. |
| **Warm-up** | A list. Open a row for its cues. One circle ticks the whole warm-up. No weights, no RPE. |

**Last time and History.** In an open card, last time is the grey **LAST** weight in each empty box. The whole story is the ⓘ's **Your history** row (*6 sessions. Last time 70 kg × 6 · 6 · 5.*): a tap opens **History** (a chart and the last sessions, your RPEs against the card's own RPE and your notes, under a line with today's target). A superset or circuit keeps its **Last time** strip. A faint *"last · 80 × 4 @ 9"* under a set means that set ran over target last time. It never tells you what to lift. A different version of an exercise (a progression) counts as new: *"First time"* again.

**The Rest Timer.** Full-screen. Opens already running. **Pause**, **+15s**, **Reset**, **Close** and **Sound on/off** (a beep and a buzz at zero; iPhones don't buzz). The screen stays awake. At zero it shows **GO!** and closes. The card's button shows my rest for that exercise (for example *Rest ⏱ 2:30*); when I wrote none it says *Rest timer* and opens a neutral 2:00.

**Guided mode** (the ▶ next to Start, or under ⋯). One exercise and one set at a time, the current set pinned.
- Footer: **Done — Start Rest ✓** (ticks the set as written, then rests), **‹ Prev**, then **Next →**, and **Finish Session ✓** on the last set.
- While you rest it asks the **Kg** (with **Same as last**), the **Reps** (− / +) and the **RPE** (6–10). On the last set there's no rest screen, so type the weight and RPE in the pinned row.
- In a week where my note sets a limit, the same thin line as the session bar (*Max RPE 7 · 1 set fewer*) sits under Guided's top bar and under the RPE buttons while you rest.
- Warm-ups and circuits that log nothing are skipped; they stay in the list.
- **✕** top right leaves Guided; everything logged stays. **?** opens the Guided guide. **Skip →** on a rest moves on without logging weight or RPE.
- **Finish Session ✓** doesn't finish the day: it takes you to the finish card, where you still rate and tap **Done**.

**Finishing.** See steps 10–12 in §4. Details worth knowing:
- **Finish early** needs two taps (**Tap again to finish early**), then lists what's **Not done**, with **Keep going** to return.
- You can change the rating after Done. **Send the update to your coach** appears only when you change the rating or note after the first send.
- **Reset Session** (on the finished card) takes two taps. It clears ticks, reps, RPEs, the clock and the check-in on the day; typed weights and notes stay. It does **not** unsend a report that already went; finishing again sends a second one.
- After a sore check-in (1 or 2), the finished card offers a short Library session, *The Morning After*.
- A green line shows the session ticked your **Session** habit in AA Proof.

### 5.3 Coach

*Screens: [30-coach-tab](../../Content/client-app-map/30-coach-tab.jpg)*

- **Coach Amir** — *Strength & conditioning coach*, with my photo.
- **Message me on WhatsApp** — *"Questions, swaps, anything that hurts, form videos."* Number **+44 7435 363461**. It opens WhatsApp with *"Hi Amir, it's {first name} ({cycle name}, week {n}). "* ready for you to finish.
- **Personal notes** — cards I wrote for you; tap one to read it (opening one closes the others).
- **How the app works → Start here if anything is unclear. ›** — the Help sheet.

There's no chat in the app. Notes you type at the end of a session reach me and I read them, but **I answer on WhatsApp**.

### 5.4 Library — "Train it, learn it, know it."

*Screens: [31-library-doors](../../Content/client-app-map/31-library-doors.jpg) · [32-sessions-world](../../Content/client-app-map/32-sessions-world.jpg) · [33-library-session](../../Content/client-app-map/33-library-session.jpg) · [34-playbook](../../Content/client-app-map/34-playbook.jpg) · [35-exercises-list](../../Content/client-app-map/35-exercises-list.jpg)*

Separate from your programme. Three doors (counts as of 2026-10-11; they change as I add things):

**Sessions — "— Train" (42).** Ready-made workouts to run on your own. Seven shelves, three rows each; **All N ›** on a shelf's picture shows the rest:
- Strength (5) · Conditioning (7) · On-Court (8) · Mobility (7) · Recovery (6) · Breath (3) · Care (6).
- Each row: name, what it's for, minutes and kit (*"50 min · Barbell"*), and **✓ Session** (strength-type sessions) or **✓ Mobility / ✓ Breathe**, which show only once you've switched that habit on in AA Proof.
- Open one: **Before you start** (a safety note, always visible), **Why this session** (fold/unfold), then the exercises like your programme cards but with **no set logging**. Ticks stay on your phone and reset the next day.
- At the end, **Mark as done** tells me you did it and ticks the matching habit in AA Proof. It needs signal, and if it fails you tap again. Ticking inside a session changes nothing in your week's plan.

**Playbook — "— Learn" (21 reads).** Articles by category: For Coaches (coming soon) · Training (9) · Pre-Competition (2) · Recovery (7) · Mental (coming soon) · Nutrition (3) · Supplements (coming soon). Tap a title; **←** goes back to the Library where you left off.

**Exercises — "— Know" (320).** Every exercise in the library. Search ("Search exercises"), filter by **All**, **In your plan** or a movement pattern. A row opens the **About this exercise** sheet (§5.8).

Library sessions are **not** your programme's "sessions". A programme session is a day of your plan; a Library session is an extra.

### 5.5 Game Plan

*Screens: [37-game-plan](../../Content/client-app-map/37-game-plan.jpg)*

The whole route, top to bottom:
- Your name, your goal, and the current cycle's dates.
- *"**5 days** left in cycle · ends OCT 24"* — only in the last 14 days (it isn't a billing message; it has no button).
- **Cycle meter:** one segment per cycle, labelled **C1 C2 … Cn**. Finished ones are faded green, the current one is solid dark green with a glow and a bold label, the rest grey. Not tappable. (The pills are **Done** in orange and **Active** in green.)
- **Done** — the cycle just finished. Tap it to open the **Archive** (that cycle's plan as I wrote it, read-only, without your numbers).
- **Active** — this cycle, the only one open by default, and short: its tagline, **The aims**, then Amir's first sentence signed. Two rows open on a tap: **Why this cycle matters** (*The rest of my note*) and **Expected outcomes** (*6 things to hit*, a dotted list, not ticks: they have not happened yet). Nothing on it jumps Home.
- **Why your plan looks like this · N reasons ›** — appears when I've given at least three personal reasons (§5.8).
- **Up next!** and **Locked** — later cycles, folded; **Read more** shows their teaser. They can't be opened further.

### 5.6 Personal Records

*Screens: [38-records-empty](../../Content/client-app-map/38-records-empty.jpg) · [39-records-with-lift](../../Content/client-app-map/39-records-with-lift.jpg) · [40-log-a-max-form](../../Content/client-app-map/40-log-a-max-form.jpg) · [41-records-lift-trend](../../Content/client-app-map/41-records-lift-trend.jpg)*

From the **Personal records** row on Home (or **Open in Personal Records ›** in an exercise's History). **← steps back one screen at a time.**

- *"The most you could lift for one rep, on each exercise. Worked out from your normal sets, so you never have to test it."* This is an **estimate** (a "1RM"), not a weight to lift.
- **They fill themselves.** When you finish a session, your best set on a main strength lift becomes a record if it beats everything before it. It needs a **weight, reps and an RPE**. Jumps, throws, carries and holds don't record. The numbers appear on Records or the Home row; there's no pop-up at Done. A new best shows a **New best** band on that lift's page for a week.
- **Empty at first:** *"Nothing here yet."* with four steps (open an exercise, type the weight, tick the set and tap your RPE, finish the session).
- **The top card** shows how strong you are for your size once you've logged a body weight (*"1.25×"*, *"Your own body weight"*). Without one it asks you to **Add your weight →** (it opens Body Weight).
- **Your lifts:** one row each, with a trend (*"▲ 5 kg since you started"*), when it was last logged and a sparkline. Tap one for its page: a chart and every entry (*"5 Oct · 70 kg × 5 @ RPE 8 · from your sets"*), each with a ✕ (two taps: **Delete?**; no undo).
- **+ Log a max** (when you tested a lift, or lifted away from the app): pick the lift from this cycle, then the heaviest set, reps, RPE and the date (past dates are fine). The result and a grade show as you type: *"Sharp · how much to trust it"* (or Good / Rough) with a hint, for example *"Heavy, and you stopped close to your limit. This is as good as it gets."* / *"Want it sharper? Fewer reps with a heavier weight."* / *"Long sets are hard to judge. Fewer reps and more weight give a better number."* The **How this works** panel at the bottom of the Records screen spells the three words out:
  - **Sharp** — heavy and close to your limit, trust it.
  - **Good** — close enough, trust the direction.
  - **Rough** — a long set, a rough guide only.
  - A long, easy set (about ten reps once you count the ones you had left) is refused, because the estimate would be a guess: *"Try a heavier set of 5 or fewer."*
- **Due for a retest** (end of a cycle, a lift I flagged **5RM**, nothing logged for four weeks): **Test 5RM →** opens the form ready for a test. On a lower day: *"Not today: your check-in says a lower day."*

### 5.7 Body Weight

*Screens: [42-weight-empty](../../Content/client-app-map/42-weight-empty.jpg) · [43-weight-readings](../../Content/client-app-map/43-weight-readings.jpg)*

From the **Body weight** row on Home. **←** goes Home.

- Empty: *"Your weight over time. Weigh yourself at the same time of day, ideally first thing, and the line means something."* One box, **Today's weight** (the box says kg), and **Weigh in**. Commas and Persian digits are accepted.
- **One reading per day.** Weighing in again the same day replaces it. You can't back-date.
- With readings: the latest weight, **Up/Down N kg** or **Level** over the range, **7 days · 1 month · 3 months** chips, and a chart (green line = 7-day average, dots = real readings, shown from two readings).
- **Every reading** lists each one with a ✕ (two taps: **Delete?**).
- **Delete all my weight history** — two taps, **permanent**. Body weight is never scored and AA Proof doesn't use it.

### 5.8 About this exercise (the ⓘ sheet)

*Screens: [36-about-sheet](../../Content/client-app-map/36-about-sheet.jpg)*

Tap the **ⓘ** on a card, a row in Library → Exercises, or a linked name. A sheet slides up (since 2026-10-12, "Changeover"), each part a question:
- **The green top**: the movement pattern as a small word and the name. When I wrote a reason: **Why am I doing this?**, my sentence, its tag (*Your goal · Your body · Your test · Last cycle · You said · Your game*; a body reason names the part, like *Your knee*) and my signature and photo.
- From the Library only: **In my plan?** at the foot of the green, then **How do I do it?** (the video with **Open in YouTube**, *You need*, the steps, two shown and **All N steps**), **What should I think about?** and **What do people get wrong?**
- **What does it do?** and **Builds**: green tiles for the qualities, each with its mark (tap one for **What you're building**).
- **How does it help on court?** (tennis and padel players), over a faint court.
- **Where will I feel it?** a front and back body drawing; **Main** muscles in full green, **Helping** in soft green; under it *Mostly your ● quads. Your ● glutes help.*
- **Too hard?** (Regressions), **Too easy?** (Progressions), **Other kit?** (Alternatives). Tap a name to read it; *Not in the app yet* means it has no page yet.
- **Your history** (from a card, once you have logged it): how many sessions and last time; a tap opens History. Then **Close**.
- No WhatsApp button and no impact on this sheet (my call, 2026-10-12). Ask me from the Coach tab or the end of a session.

**Why your plan looks like this** (under Game Plan's Active card): every exercise with a personal reason, grouped by the six tags above; tap one to open its sheet.

**What the three words on a day card mean.** *Strength · Brakes · Spring* are what the day trains most, strongest first, worked out from its exercises (warm-ups don't count). Tap a word to open **What you're building**.

### 5.9 Account and Help

*Screens: [44-account-sheet](../../Content/client-app-map/44-account-sheet.jpg) · [45-help-sheet](../../Content/client-app-map/45-help-sheet.jpg) · [49-home-dark](../../Content/client-app-map/49-home-dark.jpg)*

Your **initials**, top right of every main screen (inside a day it becomes a 🌙):
- **Theme: Light | Dark.** Your choice, per phone. It never follows the phone's setting.
- **Install the app ›** (only if not installed).
- **How the app works ›** — 15 cards: Getting around · How your program is structured · RPE & Tempo · The readiness check · Logging your sets · Guided mode · The ⓘ — what an exercise is for · What each day builds · Your history on every exercise · Personal Records — the most you could lift once · Finishing a session · What to report & how often · Install the app on your home screen · Built-in tools · Questions or problems. The dotted words **How hard?** and **tempo** open the right card.
- **Privacy ›** (opens in the browser).
- **Sign out** — two taps (**Tap again to sign out**). It first sends anything waiting, which can take several seconds on a weak signal; your training stays saved. If a report is still waiting for signal, it says so and goes when you sign in again.

### 5.10 AA Proof on Home (a pointer)

AA Proof is a separate habit app (sleep, steps, protein, water, your session…). Its row and a small live strip sit on Home; the full app opens when you tap the row. This map doesn't cover it. It ticks **Finish your session** for you when you finish a day.

---

## 6. Your cycle, week by week

*Screens: [46-home-between-cycles](../../Content/client-app-map/46-home-between-cycles.jpg) · [28-home-returning](../../Content/client-app-map/28-home-returning.jpg)*

**The rhythm.** A cycle is about five weeks: four loading weeks and a lighter last week.
- **Week 1** is for finding your weights. A note from me says what to do.
- **Weeks 2–4** build on week 1.
- **The last week is the "back-off" week,** lighter on purpose, with its own note.
- The week number follows the calendar from your cycle's start date, not what you trained. A "week" is seven days from that date (a Wednesday start gives Wednesday-to-Tuesday weeks).

**When the last day passes.** From the day after the cycle's end date, Home goes quiet on purpose:
- The card says **Cycle complete** (*"Finished Oct 6 · 5 of 5 weeks"*), or **Roadmap complete** on the last one.
- **Up next** shows the next cycle's teaser.
- The one thing to do is the button **Ready for Cycle N? — Message Amir to start it.** It opens WhatsApp.
- *"No new week until Cycle N starts. Want to keep moving? Any session from {cycle} still works."* — **Repeat a session** unfolds the days.
- The new cycle appears when I publish it. There's nothing to press in the app to start it.

**What changes when you're not new.**
- No Welcome and no first-session notes after your first cycle or first finished session.
- The grey **LAST** weights fill every empty box; a progression or a new exercise says *"First time"*.
- **Wins** and **Personal records** have data. New plans carry fresh **Why am I doing this?** reasons.
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
| **Week 1 / last week** | A note from me on Home: in that week it is the This Week section. In the session, the bar at the top keeps its numbers in view (*Max RPE 7 · 1 set fewer*), and your RPE colours follow them every day of that week. |
| **Last 14 days of a cycle** | *"N days left in cycle"* on Game Plan. |
| **The cycle is over** | See §6. |
| **Cycle has no dates** | Only a small line, *"Cycle 1 of 6 · NAME · Weeks 1–5"*, and no week features. |
| **You're sore (1 or 2)** | The finished card offers *The Morning After*. |
| **You finished every session this week** | Home offers *Green Light*, once. |
| **A lift is due for a retest** | A strip on Personal Records. |
| **Another phone / a cleared browser** | You sign in again; the Welcome shows again on that phone. |
| **The demo** (`?client=demo`) | A banner, sample data, nothing is sent. |

---

## 8. Words you'll meet

| Word | Plain meaning |
|---|---|
| **Cycle** | About five weeks with one clear goal. The next builds on it. |
| **Game Plan** | The tab that shows all your cycles, past and future. |
| **Day / Block** | A day is one workout (Day 1, Day 2). A block is a section of it (warm-up, strength, power). |
| **This Week** | The seven days counted from your cycle's start date. |
| **Back-off week** | The lighter last week of a cycle. |
| **RPE** | How hard a set felt, 1–10. **10** = not one more rep. **8** = two reps left. **7** = about three left. The app asks 6–10 per set. |
| **Session rating** | One number, 1–10, for the whole day, asked at the end. |
| **Tempo** | Speed of each rep as four numbers, `3-1-1-0` = 3 s down, 1 s pause, 1 s up, 0 s pause at the top. The **orange digit** is the one that matters. *Hold* means a hold with no movement. |
| **Rest 2m / 2:30** | Minutes (2m) or minutes:seconds (2:30). |
| **Readiness check** | The 10-second questionnaire before a session. |
| **Lower day** | The label when the check-in comes out low. |
| **Optional today** | An exercise my plan lets you drop on a short day. |
| **Coach's note** | A message about this exercise for you (the orange dot). |
| **Because / "Why am I doing this?"** | The reason I picked an exercise for you (the orange ⓘ). |
| **Your history** | What you did on this exercise before: the last row of its ⓘ sheet. |
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

**Anything that deletes takes two taps:** the button says what the second tap does (**Delete?**, **Tap again to reset**, **Tap again to finish early**, **Tap again to sign out**, **Tap again to clear**) and goes back after four seconds. **Can't be undone:** Delete all my weight history, deleting a record or a reading, and a report once it has been sent.

---

## 10. What to tell me, and how

- **Every session:** rate it 1–10 and tap **Done · send to coach ✓**. That is the report.
- **Every Sunday:** a short WhatsApp on how the week felt: sleep, stress, niggles, tennis load.
- **Any time:** pain that lasts more than 48 hours, missed sessions, anything that feels off, an equipment swap, form-check videos. Use the buttons in the Coach tab and at the end of a session: the message already says which day.
- Notes you type in the app I read, but I **don't answer them there**.

---

## 11. "I want to…" — where to go

| I want to… | Go to… |
|---|---|
| Do today's workout | Home → the ringed day card → Start ▶ |
| See which day is next | Home → This Week (the green ring) |
| Train one set at a time | In a day: Guided ▶ (or ⋯ → Guided) |
| Rest between sets | The card's **Rest ⏱** button (Guided rests for you) |
| See what I lifted last time | The grey LAST weight in the box, or the exercise's ⓘ → **Your history** |
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

## 12. The screens (phone width, light mode)

50 screenshots in `Content/client-app-map/`, taken on 2026-10-11 from the test fixture (an invented athlete, so names, dates and numbers are not real). **Small monospace labels use a stand-in font** (JetBrains Mono for Space Mono, which is not in the repo), so the little grey labels look slightly different from the real app. Everything else is the app's own code and fonts.

| File | Shows | § |
|---|---|---|
| [01-sign-in](../../Content/client-app-map/01-sign-in.jpg) | Username, Password, eye, Sign in, "Lost your details?" | 3 |
| [02-welcome](../../Content/client-app-map/02-welcome.jpg) | The Welcome overlay, with its ✕ | 3 |
| [03-home-top](../../Content/client-app-map/03-home-top.jpg) | Home top for a new athlete, week-1 note, day cards | 5.1 |
| [04-home-lower](../../Content/client-app-map/04-home-lower.jpg) | The ringed next day; habits, records and weight rows (empty) | 5.1 |
| [05-day-opened](../../Content/client-app-map/05-day-opened.jpg) | A day opened: session bar and the first note | 4 |
| [06-readiness-empty](../../Content/client-app-map/06-readiness-empty.jpg) | Readiness check, Begin grey, Skip for today | 5.2 |
| [07-session-slim-bar](../../Content/client-app-map/07-session-slim-bar.jpg) | The slim session bar; no tab bar | 5.2 |
| [08-home-session-in-progress](../../Content/client-app-map/08-home-session-in-progress.jpg) | Home with "In progress" and Resume | 5.1 |
| [09-lower-day-banner](../../Content/client-app-map/09-lower-day-banner.jpg) | The Short day banner | 5.2 |
| [10-cards-closed](../../Content/client-app-map/10-cards-closed.jpg) | Closed cards: dot, pill, orange ⓘ, tempo digit | 5.2 |
| [11-card-open](../../Content/client-app-map/11-card-open.jpg) | An open card, first time | 5.2 |
| [12-card-open-last-time](../../Content/client-app-map/12-card-open-last-time.jpg) | LAST weights (taken before 2026-10-12: the Last time box in it is gone) | 5.2 |
| [13-history-sheet](../../Content/client-app-map/13-history-sheet.jpg) | The History sheet | 5.2 |
| [14-rpe-strip](../../Content/client-app-map/14-rpe-strip.jpg) | The RPE strip after a tick | 5.2 |
| [16-rest-timer](../../Content/client-app-map/16-rest-timer.jpg) | The Rest Timer | 5.2 |
| [17-card-folds-next-opens](../../Content/client-app-map/17-card-folds-next-opens.jpg) | A finished card folded; the next opens | 4 |
| [18-circuit-card](../../Content/client-app-map/18-circuit-card.jpg) | A circuit: Rounds and Log | 5.2 |
| [19-guided-set](../../Content/client-app-map/19-guided-set.jpg) | Guided, a set step | 5.2 |
| [20-guided-rest](../../Content/client-app-map/20-guided-rest.jpg) | Guided rest: Kg, Reps, RPE | 5.2 |
| [21-guided-complete](../../Content/client-app-map/21-guided-complete.jpg) | Guided: "Every set logged." | 5.2 |
| [22-finish-card-in-progress](../../Content/client-app-map/22-finish-card-in-progress.jpg) | Finish card, In progress | 4 |
| [23-finish-card-all-done](../../Content/client-app-map/23-finish-card-all-done.jpg) | All done: rating and Done | 4 |
| [24-done-without-rating](../../Content/client-app-map/24-done-without-rating.jpg) | "Rate the session first" | 4 |
| [25-finished-card](../../Content/client-app-map/25-finished-card.jpg) | The finished card | 4 |
| [26-install-nudge](../../Content/client-app-map/26-install-nudge.jpg) | The install toast | 4 |
| [27-home-after-session](../../Content/client-app-map/27-home-after-session.jpg) | Day 1 as a ✓ row | 4 |
| [28-home-returning](../../Content/client-app-map/28-home-returning.jpg) | Home for a returning athlete: Wins this cycle | 5.1 / 6 |
| [29-home-habits-strip](../../Content/client-app-map/29-home-habits-strip.jpg) | The AA Proof strip on Home | 5.1 / 5.10 |
| [30-coach-tab](../../Content/client-app-map/30-coach-tab.jpg) | The Coach tab | 5.3 |
| [31-library-doors](../../Content/client-app-map/31-library-doors.jpg) | The three Library doors | 5.4 |
| [32-sessions-world](../../Content/client-app-map/32-sessions-world.jpg) | Sessions shelves | 5.4 |
| [33-library-session](../../Content/client-app-map/33-library-session.jpg) | A Library session, Before you start | 5.4 |
| [34-playbook](../../Content/client-app-map/34-playbook.jpg) | The Playbook | 5.4 |
| [35-exercises-list](../../Content/client-app-map/35-exercises-list.jpg) | Exercises: search, chips, list | 5.4 |
| [36-about-sheet](../../Content/client-app-map/36-about-sheet.jpg) | The About sheet (Changeover, 2026-10-12): the green top with the reason, What does it do? and its tiles | 5.8 |
| [37-game-plan](../../Content/client-app-map/37-game-plan.jpg) | Game Plan: banner, meter, Done, Active | 5.5 |
| [38-records-empty](../../Content/client-app-map/38-records-empty.jpg) | Personal Records, empty | 5.6 |
| [39-records-with-lift](../../Content/client-app-map/39-records-with-lift.jpg) | Personal Records with a lift | 5.6 |
| [40-log-a-max-form](../../Content/client-app-map/40-log-a-max-form.jpg) | The Log a max form | 5.6 |
| [41-records-lift-trend](../../Content/client-app-map/41-records-lift-trend.jpg) | One lift's page | 5.6 |
| [42-weight-empty](../../Content/client-app-map/42-weight-empty.jpg) | Body Weight, empty | 5.7 |
| [43-weight-readings](../../Content/client-app-map/43-weight-readings.jpg) | Body Weight with seven readings | 5.7 |
| [44-account-sheet](../../Content/client-app-map/44-account-sheet.jpg) | The account sheet | 5.9 |
| [45-help-sheet](../../Content/client-app-map/45-help-sheet.jpg) | The 15 help cards | 5.9 |
| [46-home-between-cycles](../../Content/client-app-map/46-home-between-cycles.jpg) | Cycle complete, Ready for Cycle 3? | 6 |
| [47-home-not-finished](../../Content/client-app-map/47-home-not-finished.jpg) | The Not finished card | 5.1 / 7 |
| [48-home-offline](../../Content/client-app-map/48-home-offline.jpg) | The offline note | 7 |
| [49-home-dark](../../Content/client-app-map/49-home-dark.jpg) | Home in dark mode | 5.9 |
| [50-closed-circle-note](../../Content/client-app-map/50-closed-circle-note.jpg) | A first-timer taps the circle on a closed card: it opens, and a note box says how to log | 5.2 |
| [51-clock-offer](../../Content/client-app-map/51-clock-offer.jpg) | A set ticked with the clock not running: the one offer, Start or Not now | 4 |

---
---

# PART 2 — NOTES FOR AMIR (not for clients)

## A. Where the app disagreed with itself

1. **FIXED on this branch (commit `585a2b5`, sw `aap-v99`, not live until merged): "Getting around" listed the tabs in the wrong order.** It said Home, Game Plan, Coach, Library; the bar is **Home · Coach · Library · Game Plan** [`APP_GUIDE` 8435 vs 4671]. The card now lists them in the bar's order.
2. **FIXED on this branch: "How your program is structured" sent people to the wrong place.** It ended *"The 'Why this cycle matters' note on Home…"*. That note is on **Game Plan** (the Active card) [8437 vs `renderPlan` 7291]. It now says Game Plan and uses the app's own label, "Why This Cycle Matters".
3. **Not a bug, walked back:** the guide says **orange** where the code and `CLAUDE.md` say **clay**. The guide says "orange" every time (the dot, an RPE over target, the ⓘ), and that is the plain word an athlete understands; "clay" is the internal token. I left it, and Part 1 uses "orange" too.
4. **FIXED on this branch: Reset leaves circuit round ratings in place.** The guide says Reset clears the RPEs. `resetDay` [11363] clears the sets of standard exercises and hides the round-rating rows; the browser walk confirmed that circuit round ratings survived a Reset. `resetDay` now clears them; circuit kg boxes are deliberately kept.
5. **FIXED on this branch: copy slip.** After **Train as written** on a sore-only day the line reads *"Your check-in suggested a sore today."* (the title "Sore today" lower-cased into a sentence). It now reads *"Your check-in said you were sore today."*

## B. What a first-timer is not told (onboarding gaps)

- **There is no written "first 10 minutes" anywhere** (no page, PDF or doc for athletes). Part 1 §0 is the first one. The nearest pieces so far were the Welcome, three one-time notes, the 15-card guide and Amir's pasted WhatsApp.
- **The two WhatsApp messages** (the login, then the handoff, `coach.html` 1195 and `program-engage` SKILL 207-286) are the real onboarding. The handoff's tour of the app names Home, the check-in, Coach, the clay dot and ⓘ, Game Plan and the guide, but **not Library, and not Daily habits / AA Proof**.
- **The login message's install line** says only *Share → Add to Home Screen* (iPhone). It has no Android route and no warning that a link opened inside WhatsApp cannot install. (§0 and §3 now say both.)
- **The app's own install nudge waits** until the first finished session, so the first session usually runs from the browser.
- **The Welcome is one-shot.** *(Its ✕ and Back are FIXED on this branch, Amir's call.)* **The three first-session notes are permanent once dismissed** (**Got it**) and never appear for anyone past cycle 1, anyone with a finished session, or anyone with a LAST weight. The guide is the only way back to them.
- **AA Proof is first explained by a one-line quiet row** on Home. Its own onboarding appears only after a tap.
- **"Lost your details? Message Amir…"** on the sign-in screen was not a link and had no number. *(FIXED on this branch: Message Amir is now a WhatsApp link.)*

## C. What will most likely trip a first-timer (ranked)

1. **Finishing is hidden at the bottom of a long page.** Rating and **Done** appear only when every set is ticked or after **Finish early** (two taps). *(FIXED on this branch: after the last card closes the page scrolls to the finish card.)* Guided's **Finish Session ✓** only takes you there. Nothing is sent until rated and Done.
2. **The big circle on a closed card ticks every set at once, as written,** with no weight and no RPE, and folds the card. *(CHANGED on this branch, Amir's call: until a first-timer's first finished session the circle opens the card instead, with a note.)*
3. **A tick on an empty weight box saves no weight.** The grey LAST figure looks like a value. No weight means no Last time, no History line and no Personal Record. *(CHANGED on this branch, Amir's call: a nudge, every time for a first-timer and once a session after that. Nothing is invented; the rule stands.)*
4. **No RPE, no Personal Record.** And RPE is asked in two scales (6–10 per set, 1–10 per session).
5. **Readiness.** *(FIXED on this branch: the grey button now counts the answers, "3 of 5 answered".)* A low answer silently lowers targets and may mark cards **Optional today**, which can alarm a first-timer. **Skip for today** starts the clock anyway.
6. **No Start, no duration.** *(CHANGED on this branch, Amir's call: a set or warm-up ticked with the clock not running gets one offer a day, "The session clock isn't running. Start". A late start under-reports the duration, so it is offered at the first tick.)* Sets can still be logged without pressing Start, so the report may have no time, load or readiness. The slim bar hides its "In progress / Paused" label, so forgetting **Pause** inflates the session.
7. **Records look dead for the first sessions:** nothing at Done, only strength lifts with weight + RPE qualify, and the first value is never celebrated.
8. **Tapping the Active card (even the text) on Game Plan jumped to Home.** *(FIXED on this branch, Amir's call: only the picture banner goes Home.)*
9. **Tapping the Daily habits row leaves this page** for AA Proof, and the finished-card line does the same.
10. **Between cycles the only action is a WhatsApp message,** and on the very last cycle it still says "Ready for Cycle N+1?" for a cycle that does not exist. *(Confirmed: the last cycle offered "Ready for Cycle 4?".)*
11. The **same exercise name on two days shares one set log** until the midnight sweep, so a card can look pre-ticked on the other day. *(Confirmed: a Rowing warm-up on both days made Day 2 show "In progress · 1 of 10 sets" and Resume before Day 2 was started.)*
12. **Mid-session the tab bar is gone.** The exits are ← Home, the day's ←, or Back.

## C2. Odd-looking things a first-timer will see (found in the browser walk)

None of these are errors, but none is explained on screen.
- A **dark rail down the right edge** inside a day (the sets-done meter).
- After the **closed-card circle** ticks everything, the card shows a **struck-through name** and a bare "× 10 · 10 · 10" line, which looks like a mistake.
- An open card's numbers line adds the words "tempo" and "rest" (*tempo 3-1-1 · rest 2:30*) that the closed card leaves out.
- **Library sessions** open with a long **Before you start** safety block before any exercise.
- The **Exercises chip row scrolls sideways** and a chip is cut at the edge.
- The **install toast covers** the bottom of the finished card.
- The Help sheet opened from the account sheet shows **‹ Back**, which is not the same as **Close**.
- Once AA Proof is set up, the **Daily habits row becomes a large dark card** with a tall strip under it.

## D. Small things reported in the code (not all re-checked)

- **Library counts could stick at "0 Sessions / 0 Reads"** if the first visit was offline: `loadLibCounts` set `_libCountsLoaded = true` after a failed load and never retried. *(FIXED on this branch, reproduced first.)*
- **Dates showed a day early west of UTC** in Game Plan's header and banner ("SEP 30 — NOV 3" for a cycle of Oct 1 — Nov 4, in Los Angeles): `fmtDate` parsed `YYYY-MM-DD` as UTC. *(FIXED on this branch, reproduced first.)*
- **The "Rest 2:00" pill** (it showed a default 2:00 even when the card showed no rest). *(REMOVED on this branch, Amir's call: "remove the rest pill, I don't like it". The card's Rest ⏱ button and Guided remain.)*
- **Guided has no ⓘ** (only History ›; the code shows none, not run). **Circuit cards have no ⓘ** *(confirmed on screen)*.
- **Quality words and ⓘ** are absent until the exercise library has loaded once (a new phone offline shows neither).
- **`shortLift`** cuts names over 13 characters, so a record can read "Romanian Dea…".
- **"How hard?" link is hidden on phones ≤ 360 px.** *(Confirmed on screen.)*
- **The "Day N" on a card is its list position;** "Not finished" says the day's id. They agree unless ids skip.
- **Welcome "Open Day 1"** always opens the first day in the list, even for a returning athlete on a new phone.

## E. Docs that are stale (found while reading)

- `HABITS.md` line 61 says the Daily Habits card is also "at the end of Game Plan"; the code comment says it moved to Home.
- `Content/HOW-IT-WORKS.md` line 104 still says "a private link that installs AA Performance".
- `Content/PRODUCT.md` line 52 lists a different tab order; line 104 still mentions Notion sync (retired).
- `MAP.md` line 71 says AA Proof is "reached from" Home's row; Home now also embeds its strip.
- `Content/FRESH-EYES.md` line 90 (#298) still says "Amir is building it now" (superseded by PROG-02).

## F. How this was verified, and what it does not cover

- **Read:** all of `program.html` in eight slices, plus the docs listed at the top.
- **Run:** on 2026-10-11 a headless phone-width browser (390 × 844, the repo's own harness with a stubbed server) walked every screen in Part 1: about 250 programmatic checks, 49 screenshots, **no page errors and no sideways scroll**. It confirmed the tab order, the sign-in and Welcome text, the Readiness check (all five questions and all 25 scale labels, Begin grey until the fifth answer), logging rules (a tick on an empty kg box stores no weight, the closed circle ticks every set, the finish card's three states), Guided, the Rest Timer, Library, Game Plan, Records, Body Weight, the account and Help sheets, between-cycles Home, the Not finished card and the offline notes. The 13 places where this doc's first draft differed from the app are now corrected.
- **Not reached:** a real sign-in followed by a reload (the Welcome was triggered with its flag); the transient "Sending to your coach…" line; anything needing a real phone (WhatsApp opening, haptics, sound, wake lock, iOS Share → Add to Home Screen, the missing iPhone Back button, password-manager prompts); real video playback; the live 320-exercise library (the fixture has 8; the 42 sessions and 21 articles come from the repo files, which match the database); the midnight sweep and six-hour rule; **Send it** on the Not finished card (it writes to the server); the "Not today: lower day" retest line; Farsi.
- **It does not cover** the full AA Proof app, the Farsi course app, the testing app or the coach dashboard.
- **Live counts** (42 sessions, 21 articles, 320 exercises) are from the database on 2026-10-11 and will drift.
- **Not documented anywhere:** whether the login and handoff WhatsApps go separately or merged; whether the Proof strip shows in the demo.
