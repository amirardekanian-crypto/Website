# The Coach's Box — user manual

A plain-English guide to `coach.html`: Amir's private mission control. Every
threshold below is the real value from the code, so this doubles as the
reference for how the flagging actually works.

**Redesigned 2026-08-09.** The old dashboard was a triage list of coached
athletes and nothing else — built before Proof existed, so it could not see the
habit crew, the wall, the board or the funnel, which is most of what happens on
a given day. It went unused. This version opens on **what today needs**, and it
covers **both halves of the business** in one place.

**Audited 2026-10-10** (`Content/COACH-AUDIT.md`: what was wrong, what changed, what is still
open, and the harness that tests the write paths). The short version of what changed for you:
the inline editor can no longer overwrite a newer programme, every number that says "needs you"
comes from one rule, the tabs fit a phone, and a failed load or save says so instead of looking
like an empty list or a success.

---

## 1. Getting in

Open `coach.html` and **Sign in with Google** as `amirardekanian@gmail.com`.
Any other account is rejected. The page isn't indexed and has no nav link.

> The Google check is the convenience gate; the real security is Row Level
> Security in the database — every coach-only table policy and every coach RPC
> checks `auth.jwt() ->> 'email'`. Reaching the page without the account gets
> you nothing.

**Preview without signing in:** `coach.html?demo=1` renders the whole layout
against synthetic data. Nothing is fetched and every write is a no-op, so it's
safe to open anywhere — handy for screenshots or design work.

---

## 2. The nine tabs, in two groups

The first four are the daily coaching work. The other five (smaller, after a divider; on a phone
a second row that scrolls sideways) are opened now and then.

| Tab | What it's for |
|---|---|
| **Today** | The day's play: who's on court, who needs you (and why), the wall, the quest lever |
| **Athletes** | The whole roster — coached and Proof-only — and each person's file, opening on prescribed-vs-done (a habit-only athlete opens on Proof) |
| **Intake** | New coaching applications from the apply form (English & Farsi) — the whole questionnaire, per lead |
| **Exercises** | The Spine (2026-09-24): one entry per exercise you programme. Coverage of the names in live programmes, Claude's drafts waiting for you, a search, and an editor (purpose, cues, links, body parts and the muscle map, video, and the coach-only SFR rank, flags, counts and cost) showing who is doing each exercise now. A save sends only what you changed. **Approve** is what puts an entry on athletes' phones |
| **Proof** | The board, the season, the signup funnel, titles minted |
| **Library** | Publishes workouts and articles into the app's Library, and copies a link to each (the address is still `#links`; the tab was called Links until 2026-10-10) |
| **Affiliates** | The referral-code roster: who holds which discount code, how to reach them, which intakes used it. The apply forms accept exactly the live codes listed here |
| **Testing app** | Buyer logins for the tennis testing app (`/tennis-testing/app/`) |
| **Course** | Buyer logins for the paid course app (`/tennis/app/`) |

The URL carries the view (`#today`, `#athletes`, `#intake`, `#exercises`, `#proof`, `#links`,
`#affiliates`, `#assess`, `#course`, `#a/<athlete_id>`, `#a/<athlete_id>/<sub-tab>`), so any
screen can be bookmarked or reloaded in place. The browser tab's title names the screen.
**↻ Refresh** (top right) re-pulls everything.

**When something does not load or save.** A red line under the tabs names anything that failed
to load (programmes, logins, contacts, intake forms, codes, the library, coaching logs), and the
actions that depend on it are switched off until ↻ Refresh brings it back. Before 2026-10-10 a
failed read looked exactly like an empty table. A save that the server did not apply (a lapsed
sign-in, a record that moved) says so; it used to report success.

### Exercises — the Spine

Cues written here fill **every card that has no cues of its own**, so a cue is written once and
not once per programme (every one of the 23 athletes with Lat Pulldown had their own wording).
An approved entry also gives athletes a small **ⓘ** after the name, opening its purpose, where it
shows up on court (tennis and padel athletes only), and three lists: **Regressions** (easier
versions of the same movement), **Progressions** (harder versions) and **Alternatives** (the same
movement on other equipment or a machine). Drafts are invisible to athletes until you tap
**Approve**; *Move back to draft…* takes one off the phones again, and asks first (it says how many
athletes have it in a programme). A link is an entry id, or the plain name of an exercise with no
entry yet; a typed name that is exactly an entry's name (or its db/bb/kb spelling) is stored as that
entry's id, an id-shaped typo is refused, and the editor lists the links that do not point back yet
(links go both ways, CUE-4: Claude's `/spine` Upkeep adds the way back). The editor also holds the
**body parts** and impact pill, the **muscles shown** on the body map (only when *Counts toward* is
empty), a live drawing of what the athlete will see, and the **video**. The coach-only half (SFR rank,
the flags `loaded-knee-flexion`, `axial-load`, `free-hinge`, `high-impact`, `overhead`, *Counts
toward* per working set, the *cost* of a set and notes) lives in a separate table no athlete query
reads; the phone gets only the muscles from *Counts toward* and whether each is main or helping.
`/program-design` filters on the flags and `check_program.py` counts volume and day load from the
counts and cost.

The tab opens on **Drafts** while there are any, else on **Approved**, and the search box finds an
entry across both by name, other name, pattern, equipment or id. *Coverage* and *Doing it now* count
every card in a programme with workouts, **circuit items included** (before 2026-10-10 they skipped
circuits, a third of all cards). *Not in the Spine yet* lists the names still without an entry,
most-used first.

**Saving is safe against Claude's work (2026-10-10).** Claude's `/spine` writes the same rows by SQL
while you review them. A save sends **only the fields you changed**, so a court line, a link, a count
or a cost Claude wrote after you opened the tab survives your edit to a video. If Claude (or another
tab) changed one of the *same* fields, nothing is saved and a box shows both values: Save again puts
yours over theirs, Close keeps theirs. Typed work survives a redraw (a search, a quality save, the
levels arriving), and opening another entry, switching the list, ↻ Refresh or leaving the tab with
unsaved changes asks first. A **rename** of an entry live cards use is refused with the cards it would
break: one name per exercise, and a rename has to move the cards and their logged history too, which
is `/spine`'s *One name in live programmes* job. A name or other name that is already another entry's
is refused (two entries with one name both stop matching). If the Spine does not load completely the
tab says so and offers nothing to save: a save from half a copy would blank what did not arrive.

**One save, one transaction (stage48, 2026-10-10).** The entry and its coach-only half used to be saved
in two steps from this page, so a failure on the second left the entry saved and the coach-only part
not, and the coach-only part had no lock between its read and its write. Now one call,
`coach_save_spine()`: the server locks both rows, refuses (and writes **nothing, to either half**) when
someone else changed a field you also changed, and otherwise writes exactly the fields you sent. A
`/spine` write that is in flight when you press Save is waited for and seen, not overwritten
(`scripts/test_spine_sql.sh` proves it with two real sessions). The box on a clash is the same as
before; it now ends "Nothing was saved, to either half". The ten qualities are one table, so they keep
their own guarded save.

**History: every earlier version of an entry (stage49, 2026-10-10).** Open an entry and unfold
**History**. Every change to it, from this page, from Claude's `/spine` SQL or from a hand-written
UPDATE, left the row as it was in `spine_versions` (a trigger; nothing is pruned). Each block says when,
who (*you*, or *Claude (SQL)* for a write with no signed-in user), whether it was the coach-only part,
and for each field the old value, then **the new one** (a long text is cut to a window that starts at
the first difference, so an edit near its end is visible). **Undo this change** puts the changed fields
back to their old values through `coach_save_spine()`, so the server's clash rule applies and the undo appears
in the list itself; it also meets Save's identity rules (`spineIdentityProblem()`): it will not bring back a
name that would take cards away from an entry or rename an entry live cards use, an alias another entry owns,
or a link to an entry that is gone. If a field was changed again since, the confirm shows what is there now
and what it goes back to, and a status change warns that it takes an entry off the phones (or puts it on).
History is read from the server when you open it and again after a change; a redraw (every keystroke in the
search box) repaints the rows it already has. A deleted entry is kept whole too (`op = 'delete'`): put it back
with SQL (the recipe, with its second insert for the coach-only row, is in `supabase/stage49_spine_versions.sql`).
The ten qualities are versioned by the same trigger but have no panel yet. The Spine rules keep athlete detail
off entries; if words about a person ever have to be erased for real, erase them from `spine_versions` too (SQL
only; the stage49 header has the statement).

**When the answer to a save or a delete never arrives** (a dropped connection: the error has no database code) the
page does not say "nothing was saved" or "nothing was removed", because the server may have committed before the
connection dropped. It says it cannot tell and to refresh and look. An error that carries a code (the server
answered) rolled the whole call back, and says so. If `spine_versions` is missing (a project before stage49) the panel says so and nothing else changes.

**The Quality Map (2026-09-24)** adds three things to this tab:
- **The ten qualities.** The words each athlete's Home day cards use (Strength, Brakes …): one
  line for everyone, a court line for tennis and padel players, and how each is measured.
  Nothing shows on a phone until you approve a quality.
- **Qualities on every entry.** Three selects, first = primary. Where Claude suggested tags for
  an entry you had already approved, they arrive pre-filled and marked, and are saved only when
  you save.
- **Quality check.** One row per athlete, in plain words: the cycle and what its picture word says
  it is meant to build (iron = Strength, voltage = Power …), what the current week trains most in
  working sets a week (an exercise's second quality counts half a set, warm-ups don't count), and a
  verdict: ✓ in the top two, or ⚠ *only #4 this week*. Foundation (bedrock), peaking and recovery
  blocks train a mix on purpose and are never flagged. *Every exercise tagged* / *N% tagged*
  says how much of the week the athlete's day cards can read. Below 70% they show nothing.

### Intake — where the apply form lands

`form.html` and `form-fa.html` used to depend entirely on **Web3Forms**: the form
turned into an email, and when that relay was unreachable the submission was lost —
the athlete saw an error and nobody found out. Now each form **also** writes straight
to Amir's own Supabase (`submit_intake` → the `hab_intake` table), and counts as sent
if *either* path succeeds. The email still fires as a notification; **this tab is the
durable record**, so a Web3Forms outage can no longer swallow a lead.

Each submission is a card: name, an **EN/FA** flag, the programme they picked, when it
arrived, their email and contact (with copy buttons; a WhatsApp number becomes a
`wa.me` link), and the whole questionnaire underneath. Three states drive the workflow
and the **badge on the tab counts the new ones**:

- **Mark handled** — you've replied or converted them (they move to *Handled*).
- **Archive** — spam or not a fit (collapsed at the bottom; **Reopen** brings it back).
- **Reopen** — send a handled/archived lead back to *New*.

Nothing here joins anyone to Proof or writes a programme — it's an inbox. When you take
a lead on, onboard them the usual way (`/athlete-intake`). Backend, and the coach-only
guard on every read/write: [`supabase/stage27_intake.sql`](supabase/stage27_intake.sql).

### Affiliates — the referral-code roster

Coaches who refer clients apply through `partner-fa.html` (Farsi only); the application
arrives as a Web3Forms email — search Gmail for `subject:(Affiliate)`, and check Trash
too, one has landed there. **This tab is the one list of codes.** `form.html` and
`form-fa.html` ask the database whether a typed code is live (`check_discount()`), so a
code added here works on **both** forms the moment you save it, and a retired one stops
just as fast. Until 2026-09-13 the codes were hand-copied into both form files and the
roster lived in a public markdown file; two accepted coaches' codes never reached either
form.

**The deal** (as `partner-fa.html` puts it to the coach): the client gets the code's % off
(10% on every code so far); the coach earns **10% of what the client actually pays**,
after the discount, on the first payment **and every renewal** while that client stays on
the code. No cap. Payout normally within 7 working days of the client's payment clearing.
It is a referral partnership, not employment — the coach handles their own tax. Either side
can end it with notice; commission on already-active clients is kept. Every applicant is
screened, and code misuse (fake codes, spam, promises that can't be kept) ends it.

**Adding a coach:** accept the application → **+ Add code**. The convention is `NAME10`
(uppercase letters and digits, no spaces); if they asked for something different, say so in
the notes. Fill in their name (English and Farsi), Instagram, WhatsApp, email and — if they
also train with you — their athlete id, which links the card to their file.

- **Retire code** — it stops working on both forms immediately. The row stays under
  *Retired*, so its history and the intakes that used it still add up. **Reactivate**
  brings it back.
- A code **can't be renamed** — it is the key. Retire it and add the new one.
- Each card counts the **applications that used the code** (typed, or approved on the form;
  archived ones left out; a code typed with spaces or Persian digits still matches) and names
  them, each marked new or handled. ⚠ These are applications, not payments: nothing in the
  dashboard knows who became a paying client, so check that before paying commission. (Until
  2026-10-10 this was called the "who do I owe commission" list.)
- **Unattributed** marks a live code with no owner on file: it discounts every sale it
  touches with nobody to pay. Settle who it belongs to, or retire it.

⚠️ **Never put payout or card details in this table.** They stay in the application email.
The table is coach-only, but every **⤓ Backup** file carries the whole of it, and that file
sits on your PC.

Backend: [`supabase/stage29_affiliates.sql`](supabase/stage29_affiliates.sql). Coach-only
RLS, and anon has no privileges on the table at all; the forms' only door is
`check_discount()`, which returns the percent for one exact live code — never the list,
never an owner. Probing that with guesses is possible, but strictly less than before, when
every code sat in the forms' page source.

---

## 3. TODAY

### The scoreboard

Four counters across the hero, each one a link to the panel that explains it:

| Counter | What it counts |
|---|---|
| **On court today** | Proof athletes with a log entry for today ÷ everyone on Proof |
| **Wall lines today** | Roll-call posts today, hidden ones excluded |
| **Sessions this week** | Finished training sessions in the last 7 days, whole roster |
| **Notes to read** | Session notes that arrived in the last 14 days and are not yet marked read (the same number as the badge on Athletes). It was called *Waiting on you* until 2026-10-10 |

Beside them: the current season and how many days into it you are.

### The wall — read it *and* write it

The roll call, straight from `hab_notes`, newest day first. Two days by default,
**Show the full week** for all seven.

- **Your line to the crew** is the composer at the top. It writes today's coach
  line via `set_coach_note()` — the same line the crew sees pinned in their app.
  Posting again updates it; **Take it down** deletes it. 200 characters, the
  server's own limit. It is filed under the day on your computer's clock (`p_day`): until
  2026-10-10 the server used its own UTC date, so a line posted between your midnight and UTC
  midnight replaced yesterday's. What you type survives a redraw until you post it.
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

| Reason | Trigger | Weight |
|---|---|---|
| **N notes to read** | A session carries a note (the day note, or a note on an exercise), `coach_status` is still `new`, and the note **arrived** in the last 14 days: the day it reached the server (`updated_at`), not the day the athlete trained. A phone that syncs a fortnight late delivers a note that is new to you; filed by its training day it used to land in *older notes* and never reach this list. The newest arrival comes first | 100+ |
| **Session not synced** | The phone sent a report for a day that has no `session_history` row (every number here is wrong for them until it is fixed) | 80 |
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

Above the people: a row for **new applications** in Intake, and a **weekly backup** row when
this computer has not taken one for 7 days. Tap a person to open them on the right screen (a note
opens the day the note is on; a Proof reason opens Proof). **Show all** lists everyone past the
first 12. (An *N unread messages* row sat here until 2026-09-26, when the in-app chat was removed
from both apps: athletes message you on WhatsApp now.)

**Clear** on the *older notes* row (notes that arrived more than 14 days ago and were never marked
read) marks exactly the notes it counted, by their key. It used to mark every unread session
older than 14 days on the server, including notes that arrived after the page loaded. A note you
imported yourself with *+ Add past session from email* arrives the moment you save it, so it shows
in Needs you until you mark it read (it is not marked read for you: the preview does not show the note).

**Today's targets on a session (2026-09-26).** When an athlete's check-in eased the day (REC-2), the
session line on The work says *lower day*, *short day* or *sore* (and *trained as written* if they
chose to), the prescribed column prints `RPE 7 → 6 that day`, and the sets are judged against that
number. Work the day left optional or skipped reads *optional today* / *skipped today: sore*, in grey,
and is not counted as *not done*. The athlete's app decided the day and stored it with the
check-in; nothing here recomputes it. `dayTargetC()` is the twin of `dayRpe()` in program.html.

### Quest week

The lever, not just the readout. If a run is live you see its quests, the XP each
pays and which day of seven it's on, with **End this run today**. If none is live
you get the pool as checkboxes — pick one to four, **Start the week**, and it
runs seven days from today via `set_quests()`.
**Ending a run keeps what was earned** (stage55, Amir 2026-10-11: *"yes, they keep it"*). The button calls
`end_quests(start, today)`, which keeps the run and gives it an `end` day: from the day after it is no
longer live (its quests are not offered), a quest completed on or before that day keeps paying, one not
completed by then never pays. Both scorers read the `end` (`hab_bonus_xp()`'s `qruns` CTE and `runEndKey()` in
`habits.html`; `scripts/test_quest_runs.js` and `scripts/test_spine_sql.sh` section J keep them in step). The
panel then says *ended early* and the picker returns the next day. The button never falls back to
`clear_quests()` when stage55 is not applied (it says so instead): `clear_quests()` is the call that takes the
XP back, now only from the SQL editor (`QUESTS.md`). Until 2026-10-11 the button was *Cancel this run* and did
take the XP back from everyone (the dialog had promised the opposite until 2026-10-10).

### Proof pulse

Every Proof athlete, **most silent first**, with seven presence dots (one per
day, today ringed in clay) and their server-scored level. This is the retention
screen — a row of grey dots is someone drifting before they churn.

---

## 4. ATHLETES

One row per person across **both** systems, split under three headings — **Needs you**,
**All quiet** and **Gone quiet** — so the line between "waiting on me" and "fine" is drawn rather
than implied. Filter chips across the top (Everyone · Needs you · Coached · Free · Proof only ·
Gone quiet) each carry their count. Search reads the name, the id, the board name, the contact's
name, email and WhatsApp digits (Persian ی/ک and extra spaces are normalised); the sort and the
search survive a redraw.

Each row carries a tier chip — **Coached**, **Free**, **Proof only** (they log
habits but have no programme row) or **No file** — their level, a **load** pill only for a real
spike (`load 1.6 · high load`, `· climbing`), their session count, their Proof week (`n/7`) and
seven presence dots.

**A flagged row says why, in words:** the reasons in §3's table, from the same function.

**Above the roster:** *Create N missing logins* (coached athletes who have trained and have no
login), then a folded **Coach tools** line: *↑ Publish programme file*, *↑ Add coaching logs* and
*⤓ Backup*, with when this computer last took a backup, then **Logins to send** (open while three
or fewer wait, folded above that: each unsent password with Copy message and Mark sent). **A stored
password clears by itself** (stage51, 2026-10-11): the database removes it the moment the person signs in
with it and stamps *sent* with that time, so they drop out of the list. *Signed in with it* can only show
for a moment, or on a password stored before stage51; the Course and Testing app lists behave the same.
If you sign in as the person yourself to test a login before sending it, that clears it too: reset the
login for a new password. (The secret-link tools are gone: the links were retired on 2026-09-07.)

- **↑ Publish programme file** checks that the file name matches its `athlete.id`, shows the live
  programme against the file (cycle, days, last saved, by whom) and warns in capitals when the live
  one is newer. New cycles normally go up through the pipeline (`publish_cycle()`).
- **↑ Add coaching logs** only adds a log for an athlete who has none on the server. It never
  replaces one: the server copy is the record (publish_cycle splices into it, `/cycle-report`
  appends its Debrief). Until 2026-10-10 it replaced them wholesale.
- **⤓ Backup** pages every table in key order, de-duplicates, blanks the unsent login passwords
  (`initial_password`) and says **INCOMPLETE** when a table could not be read. The file is the rows
  only (no schema, functions or policies: those are `supabase/*.sql`), and a restore is not a plain
  import, because the login tables point at sign-in accounts that must exist first. Keep the last 12
  weekly files and delete older ones: `python scripts/prune_backups.py <folder>` lists them, `--delete`
  removes them (the privacy notice promises a deleted record leaves the backups within about three months).

---

## 5. The athlete file (`#a/<id>`)

**Rebuilt 2026-08-22.** It used to be eight sections on one scroll, three of which drew the same
program days three different ways — *Prescribed program*, *Training logs by day* and *Live activity* —
hundreds of pixels apart. Answering "did she do what I asked?" meant reading the chips in one section,
scrolling to another, and holding the numbers in your head. Now it's **three sub-tabs** (five until
Chat went, 2026-09-26, and four until the call log was retired, 2026-10-11), and the first
one answers that question directly.

The sub-tab lives in the URL (`#a/<id>/work`, `/proof`, `/file`), so any screen
can be bookmarked. Plain `#a/<id>` (or an old `/chat` or `/calls` bookmark) opens **The work**, or **Proof** for
a habit-only athlete with no training days. Opening someone else while a file is still loading
never paints the first person's file under the second person's address (it could until 2026-10-10).
A save or a refresh keeps the days you had open, the session you were comparing and anything typed
into an open editor.

### The work — prescribed vs done, on one line

**One card per program day**, in program order, whether or not it has ever been trained. The header
carries the day, the focus name, when it was last done, sRPE · duration · AU · readiness, and a
verdict — *"1 not done · 2 off plan"* with *"5/8 exactly as prescribed"* under it. Only the most
recently trained day opens by itself; the rest are one tap.

Inside, every prescribed exercise is a row with three columns:

| | |
|---|---|
| **Prescribed** | what you wrote — `4 × 10`, `RPE 7`, tempo and any extra chips underneath |
| **Done** | sets completed against sets asked for, the load they actually used (`10 → 12 kg` when it moved within the session), and their **average RPE** — with the per-set RPEs under it |
| **Flag** | the gap, named: `2 sets short` · `not done` · `2.5 over target RPE` · `not in the plan` |

A row is bordered clay when work was skipped, ochre when it was done at the wrong dose, and plain
when it landed on plan. Your exercise note and anything the athlete wrote against that exercise sit
under its name. Anything they logged that you never prescribed appears at the bottom under
*Logged, not prescribed*.

**The RPE flag is the point of the rebuild.** The old comparison table read the log but kept only
"was this set ticked", so a session logged three RPE above target showed as `✓ 4/4 sets` in green.
The bar is `RPE_OVER` / `RPE_UNDER` in `coach.html`, both **1.5** — a set logged at 8 against a
target of 7 is a good set and doesn't need a flag; a point and a half out does.

**Reps are compared from 2026-09-24 (The Card Remembers).** The set log gained a reps box that
shows the prescribed number in grey and stays empty unless the athlete did something else, so a
normal set costs no tap. The log line reads `Set 3: 80 ×4 @8 ✓`; `parseSetLine()` reads the `×`
back, the row lists `reps: 5 · 5 · 4`, and a set under the prescription raises **"1 set under 5
reps"**. Sessions saved before that date have no reps and are never given one — nothing here
invents a number you might train off. ⚠️ `parseSetText()` in `program.html` reads the same grammar
for the athlete's own history, so a change to the log line moves three places together
(`buildSessionData()`, `parseSetLine()`, `parseSetText()`).

Other things on this tab: the **day's session picker** when a day has been trained more than once
(tap a date to compare against that run instead), the athlete's note with **Mark read** (a note is read here, never answered: you answer only on
WhatsApp, 2026-09-26, and the athlete app sends anything that needs an answer there),
the **raw log exactly as sent** behind a toggle on every day, **+ Add past session from email**, and
a collapsed **live app snapshot** — what is on their phone right now, which is a different question
from what they finished.

⚠ **Plan and log are matched by exercise name.** A session done before you rewrote the program won't
line up with the current plan — every prescribed row reads *not logged* and their real work shows
under *Logged, not prescribed*. When a whole day comes back that way the card says so in as many
words. That is the honest reading, not a bug: they really did train something else. Since
2026-10-10 the names come from the session's structured log (`session_history.log`) when it lines up
one to one with the text, so a lift renamed in the Spine (the one-name move of 2026-10-09) still
matches; the same exercise twice in a day keeps its own log on each row; and work touched but with
no set ticked is flagged *0 of N sets ticked* instead of counting as exactly as prescribed.

**Every note has Mark read.** A note written against one exercise counts as a note to read (it did
before), and since 2026-10-10 it also gets the note box and Mark read (8 of 12 waiting notes had no
way to be cleared). **A note the athlete edits after you marked it read comes back** to *needs you*
(stage46; the server used to keep it read whatever it now said). Mark read changes that one row in
the page's copy; it no longer re-downloads the whole session history.

### Editing a prescription (✎)

✎ sits at the end of the prescribed column (always visible on a touch screen). The editor names
the exercise it is editing and takes sets, the dose (one value plus its kind: reps, time, distance
or work), per side, RPE, tempo, rest and your note. **Save** then:

1. checks the fields against the rx contract — reps one whole number (a range or a time is refused
   with the reason), a time it can read, a distance with a unit, sets 1–99, RPE 6–10 or a 6–10 range,
   numbers stored as numbers; a save that changes nothing writes nothing;
2. reads the **live** programme row, and refuses if it changed after this page loaded (a new cycle
   from the pipeline, another tab, a restore) or if the exercise is no longer at that place: the page
   reloads the live programme and asks you to redo the change;
3. writes the edit into that live copy, only if nobody wrote in between, and checks the server
   really changed the row.

Until 2026-10-10 Save wrote the whole programme as it was when the page opened, which could put an
old cycle back over a newly published one, and after a publish or restore an edit could land on a
different exercise. **Version history** (File tab) lists the saves kept for that athlete in your own time zone
(the last 20 always, and every save since the previous cycle began, never more than 150: stage52, 2026-10-11);
each line is the programme just before that save, and Restore checks it belongs to this athlete.

### The three numbers, and the charts

Training load, readiness and adherence sit as a strip of three above the day cards; the full charts
are behind **Charts**. §6 explains all three. They used to be three full-width cards above
everything, which pushed the actual work below the fold on every athlete.

### Personal records — what they can lift, and what has gone stale

Under the three numbers, one line per lift: the latest estimated one-rep max, how much it has moved
since the athlete's first entry, whether it came from a working set or a deliberate test, and how
long ago. Absent entirely when there is nothing to show, like the body-weight panel — an empty card
on every athlete's page trains you to scroll past the one that has something in it.

A lift marked **due a retest** has gone 28 days or more without a number, and the current cycle
flags it with `"test": "5RM"` (see `SCHEMA.md` → `test`, and `/program-design` → The Ceiling for how
to set one). A flagged lift with nothing on the record at all is listed too, with a dash — it is the
one most worth chasing. **You see this whatever week the cycle is in**; the athlete's own retest
nudge waits for the closing week so it does not nag them, but you are the one deciding when to ask.

Read-only. The athlete owns the record: they log a max from **Personal Records → + Log a max** in
their app, and they can delete any entry. A lift they have renamed between cycles reads as one lift
here and one lift there — both sides run the same name matcher, on purpose.

### Proof · File (and the retired Calls)

- **Proof** (only for people who log habits) — server-scored level, 14 presence dots, their week,
  board name and worn title, WhatsApp and email, and their wall lines with hide/show on each.
- ~~**Chat**~~ — **removed 2026-09-26** (Amir: *"whatsapp first, remove in app chat from app and
  coach.html"*). The `messages` table and its three functions stay on the server untouched, so no
  past thread is lost; nothing reads or writes them now.
- ~~**Calls**~~ — **retired 2026-10-11** (Amir: *"Retired, fold it into File"*; one call log in the table, from
  12 July, and `/cycle-report` does the end-of-cycle review). The tab, **+ New call log** and **Copy cycle
  prompt** are gone. The old logs stay readable, and deletable one by one, in the File tab under **Old call
  logs** (the section is absent when there are none). An old `#a/<id>/calls` link opens the athlete on The
  work. `call-log.html` and `CALL_LOG.md` still exist but nothing in the dashboard links to them.
- **File** — *View their app* / *View their Proof* (read-only previews), the **login** (create,
  change password, remove; an unsent password shows here with Copy message, WhatsApp when the
  number is known, and Mark sent), the programme row (tier, days/week, which cycle of the roadmap,
  when it was last saved and by whom, Version history), the coaching log, **Old call logs** and the
  **Danger zone**, which has **Delete training history**: every finished session plus what the app keeps for them on the server (habit log, body
  weight, personal records). Their programme, login, coaching log, calls and wall lines stay, and so
  do they on the roster. (It was called *Delete all data* until 2026-10-10, which it never was.) It is
  one call, `coach_delete_training_history()` (stage48): the sessions and the progress snapshot go
  together or not at all, and the counts come back. It used to be two deletes from this page, and a
  failure between them left one gone and one standing. Under it, **Erase completely…** removes the whole
  person (see *Erasing a person* below).
- **Backfill** (The work, bottom): *+ Add past session from email* now checks the email's Athlete
  line against this athlete, starts with no date (it used to default to today), and warns before it
  replaces a session logged on the same date (the email's session replaces it, set-by-set log
  included: since stage46 that is true, before it the old log stayed under the new text) or
  adds a second one within a week. It reads the whole athlete note, not just its first line.
  It also reads the **check-in line** (2026-10-10): the "Today: lower day (…) · sore: jumps and landings
  halved — trained as written by choice" that the app writes on the Readiness field and in the full
  summary, stored as `{ level, sore, drop, asWritten, score }` exactly as the app stores it, so the
  session is judged on the day's real targets and counts toward *run of low days*. An email with no
  such line stores no verdict: it is either a normal day or older than 2026-09-26, and the two cannot
  be told apart, so nothing is guessed. `parseCheckinPlan()` reads it and `scripts/check_twins.js`
  round-trips the app's own `readinessPlanLine()` through it. Claude's Gmail import
  (`IMPORTING_SESSION_REPORTS.md`) stores the same keys.

## 6. The three metrics

### ACWR — acute:chronic workload ratio

Every session's load = **session RPE × duration in minutes** (Foster's method,
AU = arbitrary units). *Acute* = last 7 days; *chronic* = the 28-day weekly
average; **ACWR = acute ÷ chronic**.

| ACWR | Label | Meaning |
|---|---|---|
| **0.8 – 1.3** | Optimal | Training matches their fitness |
| **1.3 – 1.5** | Climbing | Ramping faster than ideal |
| **> 1.5** | High load | Spike — elevated injury risk |
| **< 0.8** | Low load | Detraining / under-loading |

Shows **"Building baseline"** until there are ~2 weeks of data, because the
ratio is meaningless before that. Between 2 and 4 weeks of history, the weekly average is taken over
the weeks that actually have history (it was always divided by 4, which made every new athlete read
a false *High load* of about 1.7 for a week). **A session in the last 4 weeks with no duration or no session
RPE is left out, and while any exist the ratio is not shown at all** (Amir, 2026-10-11: *"skip and grey out"*;
it used to count them as zero, which made the ratio wrong in a direction nobody could tell). The pill says
*not enough data*, the card says how many sessions are missing, and the weekly bars still use the sessions that do have a
load. It comes back when those are filled in or are more than 4 weeks old. On the roster a
**load** pill appears only for a spike (above 1.3), in words.

### Readiness

The athlete's self-report (sleep, energy, soreness, stress, overall) as a
composite out of 5, **higher = fresher**. The dashboard tracks each athlete's
own baseline, so a 2/5 reads as *"down from their usual 4.1"* rather than
against a generic cutoff.

### Adherence

Planned = their program's day count per week, pro-rated to the days in the window; completed comes
from `session_history` with a partial counting as half. Measured over the last 28 days, or the days
since their first session if that is shorter, so nobody is charged for days before they began (it
used to charge a whole week for a week that had just started, so a perfectly adherent new athlete
read 33%). Shown up to 100%, with "N more than planned" when they did extra. Green ≥ 85%, amber
60–84%, red < 60%.

---

## 7. PROOF

**The board** — `leaderboard_top()`, the server's own scorer, season or week.
These are the exact rows and the exact order the crew sees in their app.

**Titles minted** — the last 30 rows of `hab_titles`, newest first. A quiet
health check: if this stops moving, minting has broken (it did once, silently,
for four days — see stage23).

**Season** — which season is live and how far in. Starting or closing one stays
in the SQL editor deliberately: it resets every score, and that shouldn't be a
button on a dashboard.

**The funnel** — everyone from `contact_list()`, newest first, with **days
logged** as the qualifying signal. A free athlete past **14 logged days** is
flagged *ready to upgrade?* — they've proven the habit, so the coaching pitch is
earned rather than cold. The headline counts **free** signups; someone who became a coached
client is listed as *coached · converted* (the tier comes from their programme). WhatsApp opens a
chat (one link builder for the whole page: Persian digits and Iranian 09… numbers handled).

**forget** (free and Proof-only people only) calls `forget_contact()`, which PERMANENTLY deletes their
contact details, their whole progress row (habit log, body weight, records), their board place and
their roll-call lines. Their programme, login, session history, titles and season results stay.
It is not offered for coached clients: on them the progress row is their training app's cloud
copy. (Until 2026-10-10 it was offered for everyone and this manual said their logs were untouched.
`supabase/stage45_forget_contact_guard.sql`, applied 2026-10-11, makes the server refuse a coached athlete too.) It is
not a full erasure: their login still works, so a phone they still use can upload again.

**The Library tab** (`#links`) lists every workout and article, published or hidden, with *Copy App*
(the in-app link) and, for articles, *Copy Web · FA* and *Copy Web · EN* (the public pages). **Hide**
takes an item off every athlete's app at once (the file and its web page stay); **Publish** puts it
back. **Testing app** and **Course** list buyer logins; a failed load says so with *↻ Try again*
instead of "No logins yet", and *Mark sent* asks first (it clears the only stored copy of the password).
The **private note** typed when a login is made lives in `buyer_notes`, which only the coach can read (stage53, Amir
2026-10-11): it used to be the account row's `label`, which the buyer could read through their own account. A trigger
moves any label the Edge Functions still write into `buyer_notes` and leaves the row's label empty, so the Edge
Functions did not change; the lists read the note from `buyer_notes` (applied 2026-10-11) and still fall back to the old
column on a project that has not run stage53. Each buyer row has **Erase…**.

### Erasing a person

One panel, three kinds of person (stage54, Amir 2026-10-11: *"both athletes and buyers"*): an athlete (File →
Danger zone → **Erase completely…**), a course buyer or a testing-app buyer (**Erase…** on the row). It opens by
asking the server for a **dry run** of `coach_erase_person(kind, key, confirm, intake_ids, dry_run)`: the function
does exactly the work of a real erasure and then undoes it, so the list shown (rows per table, the sign-in
account) is what a real run would delete. Nothing is erased until the id (athlete) or username (buyer) is typed;
the button stays disabled until it matches, in any case. It is an inline panel, not a native dialog, because the
list is long and a phone clips a dialog.

- **What goes, one transaction:** every table that holds the athlete's id (sessions, app data, roll-call lines,
  titles, season results, board place, library sessions, old messages, call logs, cycle reports, coaching log and
  its earlier texts, the programme and its saved versions, old keys, the Proof contact, the login), **the rollback
  copies in the `backup` schema** (`backup.onename_2026_10_09` holds 17 athletes' old progress and session logs from the
  rename of 9 Oct: any table there with an `athlete_id` column is emptied too), and the sign-in account itself,
  whose sessions and tokens go with it, so their phone cannot upload again. For a testing-app buyer: the login, the
  note, every player, note and result including the ones they had removed.
- **Intake forms are the coach's pick** (Amir, 2026-10-11: *"pick any form in the Erase panel"*). Most forms cannot
  be tied to an athlete by data (the Farsi forms are in Persian script, the programmes in Latin letters, and 30 of 52
  athletes have no email or number stored), so the panel does two things. It **offers** the forms that carry their
  email, their WhatsApp number (last 9 digits, Persian digits folded) or their full name. **Only a same-email form
  starts ticked**, and not when another athlete's contact carries the same email (a parent's, for two children: flagged
  *also another athlete's*); a number match (it can be a foreign number with the same last digits, or a handle that holds
  digits) and a name match (two people can share a name) are offered, never ticked for you. And a
  **finder** under it searches every other form by name, email, contact, programme or date, shows 8 at a time, and
  ticks go into a list *"N intake forms will be erased with them"* by name, each with *remove*. At most 10 per
  erasure; the server accepts any form that exists and refuses a missing one. The final alert names the forms that went,
  or says that none did.
- **What stays, and the panel says so:** your weekly backup files (the privacy notice promises a deleted record
  leaves them within about three months), emails in your inbox (Web3Forms), WhatsApp, anything on their own phone,
  any copy on your own computer (a `data/<id>.json`, a saved Backup), and, for an athlete, **their board name in
  other athletes' last-seen standings** (`lbSeen` inside each athlete's app data; every phone rewrites it from the
  current board at its next board view, so it clears itself), and **an affiliate partner record** (Amir,
  2026-10-11): an athlete who is also a partner keeps the record on the Affiliates tab; only its link to the athlete
  is cleared. Not removable by this: free-text mentions in *other* athletes' coaching logs, and ids named in the
  migration history.
- **Never erased:** the public demo, the identity the dashboard reads the board through (`amir_ardekani`), a login
  that is the coach's own, a login shared by two accounts (an athlete who is also a buyer). Each raises, and the
  Erase button is not even drawn for the first two. A key typed in another case finds nothing (ids are
  case-sensitive) and says which id exists; it never takes the login and leaves the data. `p_dry_run` must be
  `true` or `false` (a NULL once skipped every check and still deleted).
- **Fail-closed:** after the deletes the function checks every table in the public and backup schemas that has an
  `athlete_id` column, and (for every kind) every public table with a `uuid` column called `user_id` or `account_id`;
  one that still holds a row undoes the whole erasure and names the table. Add the table to the function's list the
  day you create it. The tables are emptied in the order `publish_cycle()` locks them (programme, its versions,
  coaching log, its versions), so an erasure and a publish never deadlock and a publish's new rows are committed
  before they are deleted.
- **One thing it cannot close:** a phone that saves at the very moment of the erasure can write one last row after it
  (the function cannot see an uncommitted write, and the app's own functions do not lock the athlete). The person
  then shows in the roster again with tier *unknown*; erase them a second time and it is gone. The final alert says
  so. Buyers are not affected (their tables have foreign keys to the account).
- **The receipt** (`erasure_log`, in the backup): the date, the kind, the counts and a SHA-256 of
  `kind:id` (athlete id or username, lower case). No name, id or email is stored. To ask "did I erase X?", hash
  `athlete:x` and look it up. After restoring an old backup, hash every restored id the same way to find the people to
  erase again.
- **Failure words:** an error PostgreSQL raised (our own refusals, a missing right, a deadlock) or a request PostgREST
  turned away means the transaction never committed (*Nothing was erased*, and the panel stays open with everything
  typed). No code at all, PostgREST's own connection errors (`PGRST000`-`003`) and the connection, shutdown and system
  classes (`08`, `57`, `58`, `XX`) cannot prove that: the panel says it cannot tell and how to find out (tap
  ↻ Refresh: **gone from the roster or list = it went through**; still there = nothing was erased). After 30 seconds
  with no answer a **Stop waiting** button appears; a success that arrives afterwards still finishes the job
  (refresh, receipt), without dragging you off a panel you opened meanwhile. A preview answer that arrives late (you cancelled
  while it loaded and reopened) is dropped, so it can never overwrite a newer panel or flip a running erasure back to
  *ready*. The Erase boxes keep focus across a redraw of the page, without scrolling it. When the intake forms did not load
  the finder says so and is switched off (it never says "0 other forms").
- **A revoked buyer** has the same Erase… button; the *Revoked* section opens for the person whose panel is open
  (it used to draw the panel inside the closed section, invisible).

---

## 8. ⚠ What this page deliberately does NOT do

**It never scores Proof.** XP, levels, day scores and streaks are already
computed twice — the client in `habits.html` and plpgsql in Supabase — and those
two must agree (see `CLAUDE.md`, *Everything in Proof that is scored TWICE*). A
third scorer here would be a third thing to keep in sync and the first to drift.

So every Proof number on this page is one of exactly two things:

1. **A presence fact** — "this day has a non-empty log entry", the same test
   `contact_list()` uses server-side. That's what the dots, `n/7`, "on court
   today" and the silence counters are.
2. **A number the server returned** — `hab_season_level()`, `leaderboard_top()`,
   `contact_list()`.

If you want a new Proof number here, get the server to return it. Don't compute
it in this file.

---

## 9. Where the data comes from

| Source | Feeds |
|---|---|
| `session_history` | Sessions, ACWR, readiness, adherence, notes to read |
| `athlete_progress` | Last active, live snapshot, and the habit log behind every presence dot |
| `programs` | **The roster** — every athlete, their name, tier and prescribed plan |
| `athlete_identities` | Who has a username/password login, and the passwords still to send |
| ~~`athlete_keys`~~ | ⚠️ Empty since the secret links were retired — reads nothing useful |
| ~~`messages`~~ | ⚠️ Nothing reads it since the in-app chat was removed (2026-09-26). Kept, not dropped |
| `hab_notes` | The wall, the coach line, moderation |
| `hab_contacts` via `contact_list()` | The funnel, contact buttons, days logged |
| `leaderboard_optin` | Who's on the board, their display name and worn title |
| `hab_titles` | Titles-minted feed |
| `xp_rules` | The quest pool and the live runs |
| `seasons` | Which season, and what day of it |
| `call_logs` | Weekly check-ins (loaded per athlete, on open) |
| `program_versions` | Version history: the programme as it was before each save (the `programs` trigger keeps the last 20 and every save since the previous cycle began, at most 150) |
| `coaching_logs` | The coach-only log on the File tab (loaded on open) |
| `coaching_log_versions` | Every earlier text of a coaching log, kept by a trigger (stage47); only the backup reads it |
| `library`, `library_categories` | The Library tab |
| `exercises`, `exercise_coach`, `qualities` | The Exercises tab (the Spine) |
| `spine_versions` | An entry's History: every row of those three as it was before a change, kept by a trigger (stage49); the weekly backup reads it |
| `hab_intake` via `intake_list()` | The Intake tab |
| `affiliates` | The Affiliates tab |
| `assess_accounts`, `tps_accounts` | The Testing app and Course tabs (loaded when opened) |
| `buyer_notes` | The private note beside each buyer in those two tabs (stage53); coach-only |
| `erasure_log` | Receipts of full erasures (stage54); only the backup reads it |

`data/<id>.json` is no longer read at all (2026-10-10): it has not been served since 2026-09-07, and
the dashboard used to fall back to it for any id without a programme row. Growing tables are read
in pages (`selectAll()`), so none is cut off at the API's 1,000-row limit.

The **prescribed-vs-done** comparison joins the plan in `programs` with what happened, parsed from
the plain-text `summary` that `program.html` wrote into `session_history` (with the names taken
from the structured `log` when it lines up). Both readers live in `coach.html` (`rxOf()` from
`assets/js/chips.js`, `parseSessionLog()`) and both mirror code in `program.html` — change the
grammar there and they have to follow. `node scripts/test_coach_compare.js` runs 96 assertions
over real logs and the email import, and catches it if they don't. The write paths (saves, deletes, logins, backups) are
covered by the real-mode harness in `scripts/headless/coach/`.

**Logic that exists in both apps is guarded** (`scripts/check_twins.js`, pre-commit guard 15, 2026-10-10).
It cuts each twin out of both files and runs the same vectors through both: the exercise-name
tiers (`exNameVariants` / `exNameVariantsC`), a renamed lift (`ceilAliasMap` / `ceilAliasMapC`), the
Spine lookup (`spineFor` / `spineForC`), today's RPE target on a lower day (`dayRpe` / `dayTargetC`), what
the Quality check counts (`qmSets`, `isPrepBlockTitle` / `qmSetsC`, `QM_PREP`), and the check-in line's
writer and reader (`readinessPlanLine` / `parseCheckinPlan`). It also fails a change to `assets/js/chips.js`
that keeps coach.html's hand-typed `?v=` (the service worker serves `/assets/` cache-first): bump the
token, then `node scripts/check_twins.js --stamp`. `scripts/test_check_twins.js` breaks a copy on purpose
to prove each kind of drift is caught. Not covered, on purpose: the week-note input to the lower-day
target (WORK-11), the dashboard resolving cards against drafts too (TWIN-1), the 30-hour "leftover
session" window (TWIN-6) and the loose retest flag (TWIN-7) are known differences, listed in the script's
header. A new copy of an app rule in coach.html goes into the script the same day.

Some coach writes go through RPCs that check the coach themselves (`set_coach_note`, `hide_note`,
`set_quests`, `end_quests` (stage55), `clear_quests`, `forget_contact`, `save_session`, `coach_season_levels`, and since stage48
`coach_delete_training_history` and `coach_save_spine`, and since stage54 `coach_erase_person`, each one transaction); the rest are
direct table writes that only the coach's RLS policies let through. Every one of them asks for its
rows back, so a write RLS silently refused (a lapsed sign-in) says so instead of reporting success.
