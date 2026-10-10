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
| **Notes to read** | Session notes from the last 14 days not yet marked read (the same number as the badge on Athletes). It was called *Waiting on you* until 2026-10-10 |

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
| **N notes to read** | A session in the last 14 days carries a note (the day note, or a note on an exercise) and `coach_status` is still `new` | 100+ |
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

**Clear** on the *older notes* row marks exactly the notes it counted, by their key. It used to
mark every unread session older than 14 days on the server, including notes that arrived after
the page loaded.

**Today's targets on a session (2026-09-26).** When an athlete's check-in eased the day (REC-2), the
session line on The work says *lower day*, *short day* or *sore* (and *trained as written* if they
chose to), the prescribed column prints `RPE 7 → 6 that day`, and the sets are judged against that
number. Work the day left optional or skipped reads *optional today* / *skipped today: sore*, in grey,
and is not counted as *not done*. The athlete's app decided the day and stored it with the
check-in; nothing here recomputes it. `dayTargetC()` is the twin of `dayRpe()` in program.html.

### Quest week

The lever, not just the readout. If a run is live you see its quests, the XP each
pays and which day of seven it's on, with **Cancel this run**. If none is live
you get the pool as checkboxes — pick one to four, **Start the week**, and it
runs seven days from today via `set_quests()`. Cancelling calls `clear_quests()`.
⚠ **Cancelling takes back the XP** everyone already earned from that run: both scorers work quest
XP out from the run each time (`hab_bonus_xp()` and `habits.html`), so a removed run pays nothing.
Starting the same run again (same start day, same quests) brings it back. (Until 2026-10-10 the
dialog promised the opposite. An "end the run but keep the XP" option would change both scorers:
Amir's call.)

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
or fewer wait, folded above that: each unsent password with Copy message and Mark sent; *signed in
with it* marks one the person has already used, which is safe to mark sent; the Course and Testing
app lists show the same mark). (The secret-link tools are gone: the links were retired on 2026-09-07.)

- **↑ Publish programme file** checks that the file name matches its `athlete.id`, shows the live
  programme against the file (cycle, days, last saved, by whom) and warns in capitals when the live
  one is newer. New cycles normally go up through the pipeline (`publish_cycle()`).
- **↑ Add coaching logs** only adds a log for an athlete who has none on the server. It never
  replaces one: the server copy is the record (publish_cycle splices into it, `/cycle-report`
  appends its Debrief). Until 2026-10-10 it replaced them wholesale.
- **⤓ Backup** pages every table in key order, de-duplicates, blanks the unsent login passwords
  (`initial_password`) and says **INCOMPLETE** when a table could not be read.

---

## 5. The athlete file (`#a/<id>`)

**Rebuilt 2026-08-22.** It used to be eight sections on one scroll, three of which drew the same
program days three different ways — *Prescribed program*, *Training logs by day* and *Live activity* —
hundreds of pixels apart. Answering "did she do what I asked?" meant reading the chips in one section,
scrolling to another, and holding the numbers in your head. Now it's **four sub-tabs** (five until
Chat went, 2026-09-26), and the first
one answers that question directly.

The sub-tab lives in the URL (`#a/<id>/work`, `/proof`, `/calls`, `/file`), so any screen
can be bookmarked. Plain `#a/<id>` (or an old `/chat` bookmark) opens **The work**, or **Proof** for
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
different exercise. **Version history** (File tab) lists the last 20 saves in your own time zone;
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

### Proof · Calls · File

- **Proof** (only for people who log habits) — server-scored level, 14 presence dots, their week,
  board name and worn title, WhatsApp and email, and their wall lines with hide/show on each.
- ~~**Chat**~~ — **removed 2026-09-26** (Amir: *"whatsapp first, remove in app chat from app and
  coach.html"*). The `messages` table and its three functions stay on the server untouched, so no
  past thread is lost; nothing reads or writes them now.
- **Calls** — every `call_logs` row, **+ New call log**, and **Copy cycle prompt** (bundles a cycle's
  check-ins and sessions into a ready-to-paste report prompt).
- **File** — *View their app* / *View their Proof* (read-only previews), the **login** (create,
  change password, remove; an unsent password shows here with Copy message, WhatsApp when the
  number is known, and Mark sent), the programme row (tier, days/week, which cycle of the roadmap,
  when it was last saved and by whom, Version history), the coaching log, and **Delete training
  history**: every finished session plus what the app keeps for them on the server (habit log, body
  weight, personal records). Their programme, login, coaching log, calls and wall lines stay, and so
  do they on the roster. (It was called *Delete all data* until 2026-10-10, which it never was.)
- **Backfill** (The work, bottom): *+ Add past session from email* now checks the email's Athlete
  line against this athlete, starts with no date (it used to default to today), and warns before it
  replaces a session logged on the same date (the email's session replaces it, set-by-set log
  included: since stage46 that is true, before it the old log stayed under the new text) or
  adds a second one within a week. It reads the whole athlete note, not just its first line.

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
a false *High load* of about 1.7 for a week). A session with no duration or no session RPE counts as
zero; the load card says how many of the last 4 weeks' sessions are like that. On the roster a
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
`supabase/stage45_forget_contact_guard.sql` makes the server refuse a coached athlete too.) It is
not a full erasure: their login still works, so a phone they still use can upload again.

**The Library tab** (`#links`) lists every workout and article, published or hidden, with *Copy App*
(the in-app link) and, for articles, *Copy Web · FA* and *Copy Web · EN* (the public pages). **Hide**
takes an item off every athlete's app at once (the file and its web page stay); **Publish** puts it
back. **Testing app** and **Course** list buyer logins; a failed load says so with *↻ Try again*
instead of "No logins yet", and *Mark sent* asks first (it clears the only stored copy of the password).

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
| `program_versions` | Version history: the programme as it was before each save (the `programs` trigger keeps 20) |
| `coaching_logs` | The coach-only log on the File tab (loaded on open) |
| `library`, `library_categories` | The Library tab |
| `exercises`, `exercise_coach`, `qualities` | The Exercises tab (the Spine) |
| `hab_intake` via `intake_list()` | The Intake tab |
| `affiliates` | The Affiliates tab |
| `assess_accounts`, `tps_accounts` | The Testing app and Course tabs (loaded when opened) |

`data/<id>.json` is no longer read at all (2026-10-10): it has not been served since 2026-09-07, and
the dashboard used to fall back to it for any id without a programme row. Growing tables are read
in pages (`selectAll()`), so none is cut off at the API's 1,000-row limit.

The **prescribed-vs-done** comparison joins the plan in `programs` with what happened, parsed from
the plain-text `summary` that `program.html` wrote into `session_history` (with the names taken
from the structured `log` when it lines up). Both readers live in `coach.html` (`rxOf()` from
`assets/js/chips.js`, `parseSessionLog()`) and both mirror code in `program.html` — change the
grammar there and they have to follow. `node scripts/test_coach_compare.js` runs 72 assertions
over real logs and catches it if they don't. The write paths (saves, deletes, logins, backups) are
covered by the real-mode harness in `scripts/headless/coach/`.

Some coach writes go through RPCs that check the coach themselves (`set_coach_note`, `hide_note`,
`set_quests`, `clear_quests`, `forget_contact`, `save_session`, `coach_season_levels`); the rest are
direct table writes that only the coach's RLS policies let through. Every one of them asks for its
rows back, so a write RLS silently refused (a lapsed sign-in) says so instead of reporting success.
