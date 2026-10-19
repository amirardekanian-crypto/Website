## 3. TODAY

### The layout (2026-10-12, round 1 of the coach UX pass)

Action first: what needs you is the first thing on the screen, and it is wide.

- **A slim strip** (about 70 px on a desktop, under 150 px on a phone) instead of the old banner and its headline: the date and the season pill, then the
  four counters on one line, each as number + label (*2/3 on court today*, *1 note to read*). Each counter is still a link to the panel that explains it
  (`scrollPanel`). On a phone the counters wrap 2 x 2.
- **Two columns from 900 px**, `minmax(0,2fr) minmax(0,1fr)` (`.tcols`): **Needs you** on the left (`#needPanel`); on the right **Courtside** (`#courtPanel`,
  stage75, 2026-10-19; see below) and then **Proof today** (`#proofToday`), one short panel (round 2, 2026-10-12; see below). Under 900 px it is one column in that same order, Needs you first: there is
  no reordering on a phone. The full wall, the full quest lever and the full pulse moved to **Proof** (section 7), so none of `#wallPanel`, `#questPanel` or
  `#pulsePanel` is on Today: one copy of an id in the page at a time.
- One white panel per section and **no card inside a card**: Needs you's rows are divided by hairlines.

### Proof today — the short Proof column

One panel (`proofTodayHtml()`), four parts with a hairline between them, in this order:

1. **Your line to the crew**: the composer (`coachLineComposerHtml()`, the same `#coachLineInput` as on Proof: the draft, the strip hint, Post / Update the
   line / Take it down; see *The wall* below).
2. **Today's wall lines** with Hide (lines filed under today, and any filed under tomorrow under *Tomorrow, their time*), then **Earlier lines on Proof →**.
3. **One quest line**, linking to Proof: the live run (*Quest week · day 3 of 7 · 3 quests · ends Fri*, from `activeQuestRun()` and `questRunEnd()`, so it is the
   app's run and its real last day) or *No quest week live · start one on Proof →*.
4. **One drifting line**, linking to Proof: the Proof athletes silent for `QUIET_HABIT_DAYS` (3) days or more, the pulse's own rule, most silent first (*Drifting:
   Kian 4 d, Omid 3 d*), four names at most and then *+ N more*. Nothing at all (no empty part) when nobody is.

Needs you and Also waiting are unchanged. The *on court today* counter opens Proof (the pulse is there); *wall lines today* scrolls to this panel.
`proof-home` drives it.

### Courtside — the week's good news (stage75, 2026-10-19)

Career Mode round 5, step 1 (Amir picked direction A of https://claude.ai/artifact/L3Tt3B6YPqMWcVgnN7nt9g: *"Go with your picks"*). The server side is
`supabase/stage75_career_courtside.sql` (`career/PROCEDURES.md` → *Stage 75: Courtside, as built*). **Good news is never a reason**: nothing here reads or
changes `reasonsOf()`, the *N people* count, a tab badge or the strip's counters, and a harness scenario holds that.

- **Where.** `#courtPanel`, the first panel of Today's right column, above *Proof today* (on a phone: after Needs you, then Proof today). It is drawn only
  while the server answers `get_courtside()`; before stage75 is applied there is no panel, no goal line and no load warning (`courtMissing()`).
- **This week's moments** (`loadCourt()` after the first paint and on ↻ Refresh; `get_courtside()` for Monday 00:00 to the next Monday on your clock): the
  four numbers' marks (weeks held, sessions, personal bests, comebacks) and every achievement, minted live (never the go-day's back-pay), from highlight up,
  clients only. One group per athlete per day, the biggest moment leading (*and First full week held* under it), at most **five** groups, biggest first,
  then newest; *+ N more this week* shows the rest. Each group: the name (a link to their file), the moment in plain words, the day, the WhatsApp line in
  your voice, then **WhatsApp ↗** (opens the chat with the line written; only with a number WhatsApp can open), **Copy** (for a chat already open) and
  **Saw it**. WhatsApp and Copy mark it sent and seen; Saw it marks it seen. A seen group folds under **Seen this week** with **Undo**. From step 3 the
  athlete sees *Amir saw this* on that moment.
- **The lines** are `COURT_LINES`, a copy of `career/recognition.toml` `[message.*]` (drafts; you change the words before you send). Change a line in both;
  `scripts/check_career.py` rule 22 fails a commit where they differ. No line ever quotes a weight (a best's number is an estimate, PROG-01).
- **The month's honours.** In a month's first seven days the month just gone's honours sit at the top of the panel (*October honours*, then *This week*):
  **Most sessions** (plan sessions, D19), **Most improved** (the biggest effort-matched gain on a main lift that month, D18), **Full Month** (every plan
  session that month) or *Nobody this month. X and Y were one week short.*, and **Amir's Pick**: a shortlist of three (most weeks held, biggest gain, best
  comeback), each with **Pick <name>**, and *Nobody this month*; two taps each (the first says what the second does), because a pick stays picked. A tie
  shares an honour (one row each). Each winner has WhatsApp ↗ and Copy with its line; your pick's row asks about the story. The winners are worked out live
  until you send one or pick (`coach_honours_freeze()` first), and the page freezes them by itself on its first load from the 8th; from then the honours fold
  under the moments as *October honours* until November's arrive. A send that finds its winner changed at the freeze (a late session) says so.
- **The monthly goal and "From Amir"**, under the athlete's name (`goalLineHtml()`, `#goalLine`; clients with a programme): *No October goal yet ·
  Write one*, or the goal with **✓ Mark done** (then *✓ Done 24 Oct* and Undo) and Edit. Enter saves, Escape cancels, an empty Save clears a goal that is
  not ticked. **From Amir…** opens one line (90 characters) kept for their app, one a day; *Take back* while unread. Athletes see the goal and the line
  from step 3 (the light screens), not before: until then they reach them on WhatsApp.
- **Your time** (GAME-11): about five messages a week at 20 seconds each, two minutes on the 1st, a minute per goal.

| Counter | What it counts |
|---|---|
| **On court today** | Proof athletes with a log entry for today ÷ everyone on Proof |
| **Wall lines today** | Roll-call posts today, hidden ones excluded |
| **Sessions, last 7 days** | Finished training sessions in the last 7 days, whole roster |
| **Notes to read** | Session notes that arrived in the last 14 days and are not yet marked read (the same number as the badge on Athletes). It was called *Waiting on you* until 2026-10-10 |

### The wall — read it *and* write it

*(Round 2, 2026-10-12: the full wall is on **Proof**; Today keeps the composer and today's lines in its Proof column, above.)*

The roll call, straight from `hab_notes`, newest day first. Two days by default,
**Show the full week** for all seven.

- **Your line to the crew** is the composer at the top. It writes today's coach
  line via `set_coach_note()` — the same line the crew sees pinned in their app.
  Posting again updates it; **Take it down** deletes it. 200 characters, the
  server's own limit. It is filed under the day on your computer's clock (`p_day`): until
  2026-10-10 the server used its own UTC date, so a line posted between your midnight and UTC
  midnight replaced yesterday's. What you type survives a redraw until you post it. The box says what the server strips
  (`hab_clean_note()`): quotes, `<`, `>` and backslashes are removed and line breaks become spaces. A line filed under tomorrow's date (an athlete
  east of you, in the last hours of your day) is headed *Tomorrow, their time* instead of a bare date; the wall otherwise keeps your day.
- **Hide / Show** on any athlete's line calls `hide_note()`. Hidden lines stay
  visible *to you*, greyed and tagged, so moderation is reversible and you can
  still see what you hid.
- Each line shows the athlete's **day score** for that day (the `pct` the app
  stored when they posted).

This replaces running `select public.set_coach_note('…')` in the SQL editor.
The SQL still works and is still documented — this is a second door to the same
function, not a new mechanism.

### Needs you — one rule, everywhere

**One row per person**, most urgent first, from `reasonsOf()` in coach.html. The roster's reason
chips, its *Needs you* group and filter, and its default sort use the same function, so the two
screens always agree. (Until 2026-10-10 four places counted "needs you" four different ways:
sync gaps and upgrade leads never reached Today, signups never reached the roster, and Today cut
off at 10 rows of notes.) The header counts **people**; the counter above counts **notes**.
**A note that needs no action is cleared from here** (audit FLOW-7, 2026-10-11): its row has **Mark read**, which marks the one session
quoted in the row and then shows the next one, or the row goes. The athlete does not have to be opened.

**Each row says what you will do** (2026-10-12). A row is the dot, the name, the top reason (clay when its tone is *warn*, ink otherwise), the other reasons in
grey underneath, and **one button on the right named for what happens**. The name and reasons are a button too and open the athlete, exactly as the whole row used to
(a note opens the day it is on). The button comes from the top reason's `key` (`NEED_ACT` and `NEED_WA_KEYS` in `needPanelHtml()`):

| Top reason | Button | What it does |
|---|---|---|
| `note` | **Mark read** and **Open day** | marks the one session quoted read / opens the day the note is on |
| `sync` | **Open sessions** | opens their work |
| `lowrun`, `idle` | **Open** | opens their work |
| `cycle` | **Open cycle** | opens their work |
| `renew` | **Open file** | opens their File |
| `login` | **Set up login** | opens their File and puts the cursor in the password box (`openAthleteLogin()`) |
| `signup`, `silent`, `upgrade` | **WhatsApp ↗** | their number as a `wa.me` link in a new tab (`waLink()`); a plain **Open** (their Proof) when there is no number it can open |

Only one reason's button per row, and none is the green primary button: a list of rows has no single "main" action.

| Reason | Trigger | Weight |
|---|---|---|
| **N notes to read** | A session carries a note (the day note, or a note on an exercise), `coach_status` is still `new`, and the note **arrived** in the last 14 days: the day it reached the server (`updated_at`), not the day the athlete trained. A phone that syncs a fortnight late delivers a note that is new to you; filed by its training day it used to land in *older notes* and never reach this list. The newest arrival comes first | 100+ |
| **Session not synced** | The phone sent a report for a day that has no `session_history` row, hidden or not (every number here is wrong for them until it is fixed) | 80 |
| **Run of low days** | A coached athlete's last 5 check-ins (within 3 weeks) hold 3 lower or short days, or stress 2 or lower on 3 of them (REC-2: the run is your call, never the app's) | 70 |
| **Cycle ended N days ago — renew?** | The current cycle's `endDate` passed in the last 14 days | 60 |
| **No login — cannot open the app** | They have a programme row but no username and password (the old links died on 2026-09-07) | 50 |
| **Cycle ends in N days** | The current cycle's `endDate` is within 7 days: time for `/cycle-report` and the next cycle | 45 |
| **New signup** | A Proof contact created in the last 7 days | 35 |
| **No session for N days** | A coached athlete with history, no session for > 7 days, inside a cycle that has not ended | 30 |
| **Ready to upgrade?** | A free athlete with 14+ logged days | 25 |
| **Silent on Proof — N days** | A habit-only athlete (free or Proof) with no log for ≥ 3 days. Coached athletes are not flagged for this: they tick habits on the training app's Home now and then, and their training is the signal | 20+ |

**Gone quiet.** Someone with nothing at all (no session, no habit, no app activity) for 30+ days,
or a coached athlete whose cycle ended more than 14 days ago and who has not trained since, is
not "needs you" any more: they sit in a folded **Gone quiet** group at the bottom of the roster
(and its filter). A coached athlete inside a dated cycle that has not ended is never folded away.
The marketing `demo` row and your own record are never flagged.

**Paused and former** (stage63, 2026-10-11; audit ROSTER-7; Amir: "a status: active, paused, former, and the demo out of the totals"). An athlete is
**active** unless the File's **Status** panel says otherwise (three buttons and an optional note: *back in January*, *moved abroad*). **Paused** takes them
out of Needs you and Gone quiet while they are away (no "cycle ends", "renew?", "no session for N days", "silent on Proof", "run of low days", no login
nudge): they still count in Everyone and their tier chip, and sit under a **Paused** group on the roster. **Former** also takes them out of the totals and
the main list; they stay under the **Former** chip and everything they logged stays. A **note they send** and a **session that did not sync** still reach
Needs you for both, because those are messages and data problems, not chasing. The mark lives in `athlete_status` (only a paused or former athlete has a row,
coach-only, in the backup, emptied by an erasure); `coach_set_status()` sets it and *Active* removes the row. `status-paused-former` drives it.
Tap a person's words to open them on the right screen (a note opens the day the note is on; a Proof
reason opens Proof). **Show all** lists everyone past the first 12. (An *N unread messages* row sat here
until 2026-09-26, when the in-app chat was removed from both apps: athletes message you on WhatsApp now.)

**Also waiting** (2026-10-12). Under the people, after a hairline and a small label, four kinds of row that are **not a person and not a reason**: `reasonsOf()` does not
know them, they are not in the header's *N people*, and they are not in the Athletes badge. Each has its own button:

| Row | Shown when | Button |
|---|---|---|
| **N new applications** | a coaching apply form in Leads is still `new` | **Open Leads** |
| **Login to send · <name>** (new, Amir's yes) | an athlete login still holds its first password (`S.logins`, `initial_password`: the same rule as the Tools panel's *Logins to send*, `pendingCredsHtml()`); nothing is shown while the list of logins failed to load (`LOAD_ERR.logins`), because it would be a list of nobody. A password the athlete has already signed in with says so (the database clears it by itself soon after, stage51) | **Copy message** (`copyLoginFor()`) and **Mark sent** (`markLoginSent()`, which asks first: the very write the Tools panel makes) |
| **Weekly backup** | this computer has not taken a complete backup for 7 days (never in the demo); it says when the last try was INCOMPLETE and does not count | **⤓ Back up now** |
| **N older notes** | notes that arrived more than 14 days ago and were never marked read | **Clear** |

**Clear** on the *older notes* row (notes that arrived more than 14 days ago and were never marked
read) marks exactly the notes it counted, by their key. It used to mark every unread session
older than 14 days on the server, including notes that arrived after the page loaded. `today-also-waiting` drives the
layout, the buttons and the login rows; `today-mark-read`, `backlog-clear` and `backup-incomplete` keep the older ones.

**Today's targets on a session (2026-09-26).** When an athlete's check-in eased the day (REC-2), the
session line on The work says *lower day*, *short day* or *sore* (and *trained as written* if they
chose to), the prescribed column prints `RPE 7 → 6 that day`, and the sets are judged against that
number. Work the day left optional or skipped reads *optional today* / *skipped today: sore*, in grey,
and is not counted as *not done*. The athlete's app decided the day and stored it with the
check-in; nothing here recomputes it. `dayTargetC()` is the twin of `rpeTargetOn()` in program.html, week note included (2026-10-11),
drop optional (2026-10-12; `check_twins.js` §4). **Every session in a week whose note sets `rpeCap` (else `rpeDrop`) is judged against the
note's target, on every day** (Amir, 2026-10-12: *"colour against the cap in those weeks"*), with or without a check-in, skipped or trained as
written (`dayDropC()` gives those a drop of 0, and the note still counts), exactly as the app colours it. A lower day takes the lower of the
two targets, never under 6. The week is the one the SESSION fell in (`weekNoteOnC(cycle, completed_on)`), and a session from before the
cycle began or after it ended has no note. The prescribed column says what lowered it (the row's `tgtBy`, `'day'` or `'week'`):
`RPE 8 → 7 that week` when only the week note did, `RPE 8 → 6 that day` when a lower check-in did. A flagged retest (`exTestSpecC()`) on a
session inside the retest window (`retestWindowOnC(cycle, completed_on)`, the app's `inRetestWindow()` on the session's date) keeps its
card's target on a normal day (on a lower day it is capped like every lift, as in the app), as the athlete's bar says *Max RPE 7 except the retest* (TST-4). The per-set colours, the *over / under target RPE* flags and
the *off plan* verdict all follow that target (`compareDay()`). Nothing is stored, so sessions already logged this cycle are judged again
on render.

### Quest week

*(Round 2, 2026-10-12: the lever is on **Proof**; Today shows one line about it.)*

The lever, not just the readout. If a run is live you see its quests, the XP each
pays and which day of seven it's on, with **End this run today**. If none is live
you get the pool as checkboxes — pick one to four, **Start the week**, and it
runs seven days from today via `set_quests()`.
**End this run today asks in a panel under the button** (round 3, 2026-10-12; it was a long confirm): *what goes* (the quests stop being offered
from tomorrow, a quest nobody has completed by tonight never pays), *what stays* (everyone keeps the XP they already earned, on the board and in the
app), the SQL-editor way to take the XP back instead, and a final button **End the run today** beside Cancel. Nothing is called until that button.
**Ending a run keeps what was earned** (stage55, Amir 2026-10-11: *"yes, they keep it"*). The final button calls
`end_quests(start, today)`, which keeps the run and gives it an `end` day: from the day after it is no
longer live (its quests are not offered), a quest completed on or before that day keeps paying, one not
completed by then never pays. Both scorers read the `end` (`hab_bonus_xp()`'s `qruns` CTE and `runEndKey()` in
`habits.html`; `scripts/test_quest_runs.js` and `scripts/test_spine_sql.sh` section J keep them in step). The
panel then says *ended early* and the picker returns the next day. **The live run is the app's** (audit TODAY-14, 2026-10-11): the
latest-starting run that covers today, and its last day is its seventh, clipped the day before the next run starts (a run scheduled ahead, or one
starting mid-week, hands over: the panel says *the run from <date> takes over*) or the day you ended it. `questRunEnd()` / `activeQuestRun()` are
the twins of `runEndKey()` / `activeQuestRun()` in `habits.html`, and `scripts/check_twins.js` runs both on 12 run lists and 9 days. The button never falls back to
`clear_quests()` when stage55 is not applied (it says so instead): `clear_quests()` is the call that takes the
XP back, now only from the SQL editor (`QUESTS.md`). Until 2026-10-11 the button was *Cancel this run* and did
take the XP back from everyone (the dialog had promised the opposite until 2026-10-10).

### Proof pulse

*(Round 2, 2026-10-12: the full pulse is on **Proof**; Today's *Drifting* line is its short form.)*

Every Proof athlete, **most silent first**, with seven presence dots (one per
day, today ringed in clay) and their server-scored level. This is the retention
screen — a row of grey dots is someone drifting before they churn.

---

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
