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
> asks `public.is_coach()`, which compares `auth.jwt() ->> 'email'` with your address.
> Reaching the page without the account gets you nothing. Since stage57 (2026-10-11)
> the address is typed in exactly two places in the database, `is_coach()` and
> `coach_erase_person()`'s check that the login being erased is not yours, plus
> `COACH_EMAIL` in this page and once in each of the three login Edge Functions.
> A new policy or function calls `is_coach()`; it never types the address.
> Public sign-up is meant to be off (Supabase → Authentication → Sign In / Providers →
> User Signups): the check trusts the email in the sign-in alone, so nobody else should be
> able to register one. Read the setting back any time: `curl -s
> https://bvipfipbdcyqnbczjmaq.supabase.co/auth/v1/settings -H "apikey: <the publishable key>"`
> and look for `"disable_signup": true`.

**Preview without signing in:** `coach.html?demo=1` renders the whole layout
against synthetic data. Nothing is fetched and every write is a no-op, so it's
safe to open anywhere — handy for screenshots or design work.

---

## 2. The seven places, in one bar

**Back keeps your place** (audit BROWSER-4, 2026-10-11). A new screen opens at the top; going Back to a screen you left lands where you were on it,
so the roster no longer jumps to the first athlete after you open someone and come back. A tap on a tab or a link is a new screen and starts at
the top. (The page stamps each screen on its history entry and switches the browser's own scroll restore off: the browser's ran before the page
drew and was then overwritten.) Every label is at least 12 px: `scripts/check_site_style.py` guards `coach.html` too since 2026-10-11, so
text under 12 px cannot come back.

**Seven places, one row** (round 2 of the UX pass, 2026-10-12; Amir: *"D1 yes"*). It was nine tabs in two groups. Intake, Affiliates and the signup
funnel are now **Leads**; the Testing app and the Course are now **Buyers**; ⚙ Tools moved from the roster into the top bar. Today, Athletes and
Exercises are the daily work; Proof, Leads, Library and Buyers are opened now and then, but all seven sit in the same row, in this order, with no
divider and no "more".

**The bar.** From 900 px up it is **one sticky bar, 56 px** (it was a 58 px top bar over a 61 px tab rail, 119 px in all): the brand, the seven tabs
and, on the right, the signed-in address, **↻ Refresh**, **⚙ Tools** and **Sign out**. The tabs are sentence case, Barlow 600, 14.5 px; the one you are on
is white with an underline, and *Athletes* (notes to read) and *Leads* (new applications) carry a clay count. What gives way as the window narrows,
measured with the real address and the real fonts: the signed-in address below 1340 px, the brand's second half (*· THE BOX*) and the words *Refresh* and
*Tools* below 1180 px, then a little air in the tabs below 1020 px; at 900 px all seven still fit. **Under 900 px** it is the top bar (brand, ↻, ⚙, Sign out;
sticky, 54 px) and **one row of tabs under it that scrolls sideways inside itself** (the one you are on is scrolled into view; the row is not sticky,
so it does not eat a phone's screen). `--stick` is what stays on screen at the top (56 px, or 54 px under 900); the jump links, the comparison header
on The work, the Applications list and the failure bar all offset themselves from it, and the Exercises split measures its own top (`spineFit()`). The
page is `<header class="topbar">` holding `.tb-top` (the brand and the buttons) and `.rail` (the tabs): from 900 px `.tb-top` is `display: contents`
and the header is the flex row; under 900 px the header is `display: contents` and `.tb-top` is the sticky row. `nav-seven` measures all of it.

| Tab | What it's for |
|---|---|
| **Today** | The day's play: who needs you (and why), what else is waiting, and a short Proof column (your line to the crew, today's wall lines, the quest week and who is drifting) |
| **Athletes** | The whole roster — coached and Proof-only — and each person's file, opening on prescribed-vs-done (a habit-only athlete opens on Proof) |
| **Exercises** | The Spine (2026-09-24): one entry per exercise you programme. Coverage of the names in live programmes, Claude's drafts waiting for you, a search, and an editor (purpose, How to do it, cues, links, body parts and the muscle map, video, and the coach-only SFR rank, flags, counts and cost) showing who is doing each exercise now. Claude's draft steps, cues or purpose for an approved entry wait in the editor's boxes, and your Save approves them. A save sends only what you changed. **Approve** is what puts an entry on athletes' phones |
| **Proof** | The crew's home: the wall and your line, the quest lever, the pulse, the board, titles minted, the season. (The signup funnel is no longer here: it is Leads → Free signups) |
| **Leads** | Everyone who might become a client, in three sub-tabs: **Applications** (the coaching apply forms, English and Farsi, the whole questionnaire per lead; a clay count of the new ones), **Free signups** (the Proof funnel: everyone who signed up on `proof.html`, days logged, who is ready to upgrade) and **Referral codes** (who holds which discount code; the apply forms accept exactly the live codes listed here) |
| **Library** | Publishes workouts and articles into the app's Library, and copies a link to each (the address is still `#links`; the tab was called Links until 2026-10-10) |
| **Buyers** | Logins for the two apps people pay for, in two sub-tabs: the **Course** (the paid course app, `/tennis/app/`) and the **Testing app** (`/tennis-testing/app/`); each sub-tab shows its count of active logins |

The URL carries the view (`#today`, `#athletes`, `#exercises`, `#exercises/qualities`, `#exercises/coverage`, `#proof`, `#leads`, `#leads/signups`,
`#leads/codes`, `#links`, `#buyers`, `#buyers/testing`, `#a/<athlete_id>`, `#a/<athlete_id>/<sub-tab>`), so any screen can be bookmarked or reloaded in place.
Anything else after the slash of `leads`, `buyers` or `exercises` reads as the first sub-tab. **The nine-tab addresses still work and land in the new
place**, and the address bar is rewritten in place (`history.replaceState`, no extra history entry, so Back goes where it should): `#intake` → `#leads`,
`#affiliates` → `#leads/codes`, `#assess` → `#buyers/testing`, `#course` → `#buyers` (`LEGACY_ADDR`, `fixLegacyHash()`). The browser tab's title names the
screen and, in Leads and Buyers, the sub-tab (*Free signups · Leads · The Coach's Box*). **↻ Refresh** (top bar) re-pulls everything.

**When something does not load or save.** A red line under the tabs names anything that failed
to load (programmes, logins, contacts, intake forms, codes, the library, coaching logs), and the
actions that depend on it are switched off until ↻ Refresh brings it back. Before 2026-10-10 a
failed read looked exactly like an empty table. A save that the server did not apply (a lapsed
sign-in, a record that moved) says so; it used to report success.

**One way to say what happened** (2026-10-11, `fail()` and `toast()` in coach.html). *It worked*: a short toast at the bottom
that goes away by itself. *It did not*: a red line at the bottom that **stays until you dismiss it** with its ✕, in view wherever
you have scrolled to, with the words the pop-up used to carry; the same words twice become one line with a count (×2), at most
four lines stay, and *Dismiss all* clears them. *A question*: a confirm. A pop-up (alert) only when there is something to read or
copy once: a first password the server could not store, the backup summary, the result of adding coaching logs or logins in
bulk, an erasure receipt. Before this a failed save was a 2.6-second toast in some tabs (easy to miss: the affiliate and intake
ones) and a blocking pop-up in others, and a buyer login ended in a pop-up where an athlete's ended in a toast. A buyer login
(Buyers: the Course and the Testing app) now copies its message and says so in a toast, like an athlete's; the password waits in the list.

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

**The layout: three sub-tabs, and the editor beside the list (2026-10-12, round 2 of the coach UX pass).** The tab was six panels on one
page (an intro, Coverage, the ten qualities, the Quality check, the list, two warning folds) and the editor, 1,500 px tall, opened inside
a list of 370. It is three sub-tabs now, styled like the athlete file's (`.subrail` / `.stab`), each with its own address so it can be
bookmarked and reloaded: **Entries** (`#exercises`), **Qualities** (`#exercises/qualities`), **Coverage** (`#exercises/coverage`);
anything else after the slash reads as Entries (`routeOf()`, `EX_SUBS`). The Coverage label carries a clay count: the cards that show
something else on a phone plus the names not in the Spine.
- **Entries** is the daily work: one short line, the search box and the three filters (Drafts, Claude's drafts, Approved), and, when Coverage
  has something to fix, one clay line that links to it. **From 1000 px up the list (about 380 px wide) and the editor sit side by side**,
  each scrolling on its own inside the height the window leaves (`spineFit()` measures it from the top of the split to the bottom of the
  window, so the page does not scroll; the editor's Save bar is stuck to the bottom of its own pane). Nothing open: the right side says *Pick an
  exercise to edit it.* The open row is highlighted and says *Editing*; tapping it does nothing, **Close** closes. **Below 1000 px** the list is the
  page and an open entry takes its place, full width, with **← All exercises** above it (it is Close, guard included); the page jumps to the
  editor when it opens and back to where the list was when it closes. A redraw (a search, a save, the levels arriving) puts both scroll
  positions back; a new search or filter starts the list at the top and a different entry starts the editor at the top. The editor lives
  beside the list now, so **a filter or a search no longer closes it**: what is typed in it is carried across. The editor's content, field order,
  folds, History and buttons are unchanged; it gained a heading with the entry's name and its status, because it no longer sits under its row.
  The long explanation that used to be the page's first line is in a *How this works* fold at the bottom.
- **Qualities** is the ten qualities as a table (name, one line, on court, how it is measured, status and its buttons), stacked with labels on a
  phone, with the **Quality check** under it, open. Its long paragraphs are in *How this works* folds.
- **Coverage** is the bar, four counts (approved entries, drafts waiting, entries with Claude's draft to read, approved with no How to do it),
  then *Cards that show something else on a phone* and *Not in the Spine yet*, both open. The long sentence is in a fold.
- **Typed work is guarded across the three.** The editor is only on Entries, so moving to another sub-tab, to another tab, or ↻ Refresh with
  unsaved changes (an entry, or the quality texts) asks first (`spineMayLeave()`, in the `hashchange` listener); a No stays where you were
  with the typing. A sub-tab and the open entry are remembered: leave and come back and the same entry is open.

The tab opens on **Drafts** while there are any, else on **Approved**, and the search box finds an
entry across both by name, other name, pattern, equipment or id. *Coverage* and *Doing it now* count
every card in a programme with workouts, **circuit items included** (before 2026-10-10 they skipped
circuits, a third of all cards). *Not in the Spine yet* (Coverage) lists the names still without an entry,
most-used first, each with **Copy /spine add** (one tap puts `/spine add <name>` on the clipboard for Claude) and a **Copy /spine add for all N** at
the top (the command, then one `- name` per line; each becomes a draft for you to approve) (audit FLOW-13, 2026-10-11).
**The entry editor folds what you rarely touch** (audit SPINE-7): *Body parts and the body map* and *Coach only: SFR, flags, counts, cost* are closed
under a heading, and each opens by itself when something in it is missing (an entry with no count yet says so on its heading). What you open stays
open across a redraw, and a save sends whatever is in the folded parts exactly as before.

**This page counts drafts; a phone does not** (audit TWIN-1, 2026-10-11). A phone is served approved entries only, so what an athlete sees
is found among those. A card that names its entry (`exId`) shows that entry **or nothing** on the phone and on the dashboard alike: a
card on a draft has no cues and no video until you approve it (it used to fall back to the closest approved entry by name, so
"Machine Seated Leg Curl" showed "Seated Leg Curl"'s cues and video). A card with no `exId` is found by its name tiers, as before.
*Coverage* (the sub-tab; Entries has a clay line that links to it) says how many card names show something else on a phone, and the list under it, *Cards that show something else on a
phone*, gives each one: what you see here, and what the phone shows (nothing, or the closest approved entry). The video next to an
exercise in the compare view is the phone's too, so a draft's video does not appear until the draft is approved.

**A save that worked and a reload that did not.** After a write the page reloads the slice it touched. If that reload fails (the wall, the quest rules,
the Proof contacts, the intake forms, the affiliate codes, the session list, the athletes' progress, the leaderboard names) a red line says
*Saved, but the crew wall (<reason>) could not be reloaded, so what you see for it may be out of date. Tap ↻ Refresh* and names every slice that
failed. Until 2026-10-11 (audit TODAY-13) only the session list said so; the others kept the old numbers and said nothing.

**Saving is safe against Claude's work (2026-10-10).** Claude's `/spine` writes the same rows by SQL
while you review them. A save sends **only the fields you changed**, so a court line, a link, a count
or a cost Claude wrote after you opened the tab survives your edit to a video. If Claude (or another
tab) changed one of the *same* fields, nothing is saved and a box shows both values: Save again puts
yours over theirs, Close keeps theirs. Typed work survives a redraw (a search, a quality save, the
levels arriving, a filter), and opening another entry, switching sub-tab, ↻ Refresh or leaving the tab with
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

**How to do it (stage64, 2026-10-11; CUE-6).** Each entry has a **How to do it** box, before the cues: one step
per line, the plain steps that let someone who has never seen the exercise do it safely with no video (3 to 5; 2
or 3 for a stretch or the bike; up to 6 for a rack lift, so the bail fits). A number you type in front ("1.",
"2)") is dropped, because the app numbers them, and a blank line is no step. The line under the box counts them
and names a step over 90 characters (aim shorter) or over 140 (it will not save). Save refuses more than 6 steps
or a step over 140 characters before anything leaves the page: those are the database's own limits
(`spine_steps_ok()`), so nothing is refused twice. The steps reach phones with the entry, in `get_exercises()`.
They are in History as **Steps**, numbered, and Undo puts them back like any other field. The list marks an
entry with **no steps** in clay, and Coverage counts the approved entries with no How to do it. The
cue boxes now say what each line is for (CUE-1): **Cues** is the key point, then a feel or a check; **Don't** is
the one fault, then the fix.

**Claude's drafts (stage64).** Claude never writes steps, cues or the purpose on an **approved** entry. `/spine`
leaves a draft on the entry's coach-only half (`exercise_coach.suggested_changes`), and the editor shows it:
the box is pre-filled and outlined, and a clay line above it says **Claude's draft · saved when you press
Save**, with Claude's reason, **Discard draft**, and what the entry holds now. A cues draft fills both cue
boxes. Edit the draft freely; **your Save is the approval**. The same `coach_save_spine()` call writes the entry
and takes every draft you decided off the list (kept, edited or discarded), so a draft is never left behind
after you saved over it. **Discard draft** puts the entry's own value back in the box (Bring it back undoes
that until you save); the discarded draft leaves the list with the next Save. Closing without saving leaves the
drafts waiting and does not ask, because a draft is not your unsaved work; a discard is, so closing after one asks
first. A draft is shown only while its `old` still equals what the entry holds. One that no longer matches (you
edited the field since) is stale: it is not shown, a quiet line says so, and Claude's next `/spine` run drops
it. When two drafts wait for one field, the newest is shown and the line says so. Other proposals on the list (a
link, a count) are never touched by Save: they stay for Claude's `/spine` yes/no. Coverage
says how many entries have **Claude's draft to read** (a clay count), the list marks each one, and a **Claude's drafts** filter
(beside Drafts and Approved) lists them; the tab opens on it when there are no new drafts to approve. If Claude
adds a draft while you have the entry open, your Save is refused whole (the list changed under you), the box
shows the list as it is now, and Save again goes through.

**The Quality Map (2026-09-24)** adds three things to this tab:
- **The ten qualities.** The words each athlete's Home day cards use (Strength, Brakes …): one
  line for everyone, a court line for tennis and padel players, and how each is measured.
  Nothing shows on a phone until you approve a quality.
- **Qualities on every entry.** Three selects, first = primary. Where Claude suggested tags for
  an entry you had already approved, they arrive pre-filled and marked, and are saved only when
  you save.
- **Quality check** (the Qualities sub-tab, under the ten, open). One row per athlete, in plain words: the cycle and what its picture word says
  it is meant to build (iron = Strength, voltage = Power …), what the current week trains most in
  working sets a week (an exercise's second quality counts half a set, warm-ups don't count), and a
  verdict: ✓ in the top two, or ⚠ *only #4 this week*. Foundation (bedrock), peaking and recovery
  blocks train a mix on purpose and are never flagged. *Every exercise tagged* / *N% of the week's sets tagged* is a weekly number.
  **Under it, day by day, what each day card on their phone will say** (audit TWIN-9, 2026-10-11): the app's own rule run for every
  day, at most three words, or *blank* with the reason: under 70% of the day's working sets sit on approved, tagged exercises
  (*blank (58% tagged, 70% needed)*), or too few sets to name a quality (no quality reaches 12% of the day, and at least 1.5 sets).
  It is the phone's view: draft exercises and draft qualities do not count, because a phone is served approved ones only. A second
  line, *Once the drafts are approved*, appears when approving them would change a card, and with no quality approved the line says so.
  (The week's number used to be read as "below 70% the day cards show nothing", which is not the app's rule: each day is judged on its
  own sets, so a week at 77% can have four blank cards out of five.)

### Leads — Applications, Free signups and Referral codes

One place with three sub-tabs, styled like the athlete file's (`.subrail` / `.stab`): **Applications** (`#leads`, with a clay count of the new ones),
**Free signups** (`#leads/signups`) and **Referral codes** (`#leads/codes`). Each sub-tab is a view that returns its HTML and a function that wires it
(`intakeViewHtml()` + `wireIntake()`, `funnelPanelHtml()`, `affiliatesViewHtml()` + `wireAffiliates()`); `renderLeads()` draws the bar and the one on show.
The Leads tab's own badge counts the new applications too (`newApplications()`, the same number as Today's *N new applications* row, whose button is
**Open Leads**).

### Leads → Applications — where the apply form lands

`form.html` and `form-fa.html` used to depend entirely on **Web3Forms**: the form
turned into an email, and when that relay was unreachable the submission was lost —
the athlete saw an error and nobody found out. Now each form **also** writes straight
to Amir's own Supabase (`submit_intake` → the `hab_intake` table), and counts as sent
if *either* path succeeds. The email still fires as a notification; **this view is the
durable record**, so a Web3Forms outage can no longer swallow a lead.

**A list and the application on show** (round 2 of the UX pass, 2026-10-12). On a screen 1000 px wide or more the view is two panels: **the list**
on the left (about 320 px, its own scroll box, so a list of 64 does not push the page) and **the chosen application** on the right. The list has
**New · n**, **Handled · n** and a folded **Archived · n**; a row is initials, the name, an **EN/FA** pill, the programme in short (*Match*, *Set*,
*Game*; the full line is its tooltip), when it arrived and, once there is one, the outcome as a small pill. **The application on show is kept in the
page** (`_intakeSel`, not the address): it starts as the newest *new* one (or nothing, with "Pick an application to read it."), survives a redraw, a
reload of the data and a status change, and **stays on show when it leaves its group** (handled, archived; archiving it unfolds the Archived group so
its row is not hidden). Below 1000 px the list is the screen until one is chosen; the application then replaces it, with **← All applications** at the
top (it puts the list back where it was scrolled). `data-pane` on `#inView` says which of the two shows, so this is CSS and no second render.

The application: the name, an **EN/FA** pill, the programme, *Arrived today* (the date and time are its tooltip) and its state (*New* in clay);
a contact row (email as `mailto`, the contact as a `wa.me` link when `waLink()` says it is a number, a Copy beside each); then **Answers** as a
definition grid, each question and its answer side by side in one cell pair, **two pairs to a row while the application is 700 px wide or more**
(a container query on the pane: at a 1000 px screen the pane is 620, so it is one to a row) and one to a row below that. An answer in Persian script
is `dir="rtl"` and right-aligned inside its own cell, never at the far edge of the page; a long answer takes the whole row. `INTAKE_SKIP` and
`intakeVal()` still decide what is shown.

**One way to close** (Amir, 2026-10-12: the outcome is the main way; *Mark handled* stays as a quiet button). Under the answers is one row:
**What happened**, **Which athlete** (only when the outcome keeps one), **Save outcome** (the one primary button) and, at the right and quiet:
**Mark handled** (a *new* application only: it closes it with **no outcome**), **Archive** (spam or not a fit) and **Reopen** (a handled or archived
one goes back to *New*). The saved outcome and its athlete are written above the row. The **badge on the Leads tab and the count on this sub-tab are the new ones**.

**What became of it** (stage61, 2026-10-11; audit FLOW-17 and SPINE-11; Amir: "link an application to the athlete it became, and let Handled
record an outcome"). The closing row's **What happened** offers *Became a client*, *Joined the free tracker*, *Not a fit*, *No reply*,
*Said no* and *Something else*, and for the first two, **Which athlete** (a list of the roster by name; when one athlete has the application's
email, WhatsApp number or full name they are pre-selected, never saved for you). **Save outcome** calls `set_intake_outcome()`: a new application
becomes *Handled* by it, a client needs an athlete, only a client or a free-tracker joiner keeps one, and "No outcome (clear it)" removes both. The
list row wears the outcome as a pill, and **the athlete's File says where they came from** (*Came from · date application · programme · outcome · open the
application*, a link that makes that application the one on show, `openApplication()`, and goes to Leads). A linked application is also the surest way to find the right form when you erase the athlete (see *Erasing a person*). The view reads
`hab_intake` itself, paged, under the "coach manage intake" policy (`intake_list()` still exists and is no longer called). `intake-outcome`,
`intake-list-detail` and `erase-linked-form` drive it.

**In the code:** `intakeViewHtml()` returns the whole view (`#inView`) and `wireIntake(root)` wires whatever it is put inside; `renderLeads()` puts it under
the sub-tab bar. A change inside it goes through `intakeRedraw()`, which replaces
`#inView` only (it does nothing if the coach has already gone to another screen while a save was out), keeps the list's scroll and does not replay the
panels' entrance.

Nothing here joins anyone to Proof or writes a programme — it's an inbox. When you take
a lead on, onboard them the usual way (`/athlete-intake`). Backend, and the coach-only
guard on every read/write: [`supabase/stage27_intake.sql`](supabase/stage27_intake.sql).

### Leads → Free signups — the funnel

Everyone who signed up through `proof.html`, newest first (`funnelPanelHtml()`; it was the last panel on Proof until 2026-10-12, and is described under
*The funnel* in §7). Days logged is the qualifying signal; a free athlete past 14 logged days is flagged *ready to upgrade?*. A row keeps **WhatsApp**,
**copy email** and **open**. `leads/signups` is the only place the funnel is drawn; `proof-home` checks it is not on Proof, `whatsapp-number` and `file-groups`
read it here.

### Leads → Referral codes — the referral-code roster

Coaches who refer clients apply through `partner-fa.html` (Farsi only); the application
arrives as a Web3Forms email — search Gmail for `subject:(Affiliate)`, and check Trash
too, one has landed there. **This view is the one list of codes.** `form.html` and
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

**In the code:** `affiliatesViewHtml()` returns the view (`#affView`), `wireAffiliates(root)` wires it, and `renderAffiliates()` is the thin wrapper
that redraws `#affView` in place (Add, Edit, Cancel, and a demo-mode save); it does nothing if the coach has gone to another screen. The `affiliates`
scenario drives it through the old `#affiliates` address, `nav-seven` through `#leads/codes`.

Backend: [`supabase/stage29_affiliates.sql`](supabase/stage29_affiliates.sql). Coach-only
RLS, and anon has no privileges on the table at all; the forms' only door is
`check_discount()`, which returns the percent for one exact live code — never the list,
never an owner. Probing that with guesses is possible, but strictly less than before, when
every code sat in the forms' page source.

---

## 3. TODAY

### The layout (2026-10-12, round 1 of the coach UX pass)

Action first: what needs you is the first thing on the screen, and it is wide.

- **A slim strip** (about 70 px on a desktop, under 150 px on a phone) instead of the old banner and its headline: the date and the season pill, then the
  four counters on one line, each as number + label (*2/3 on court today*, *1 note to read*). Each counter is still a link to the panel that explains it
  (`scrollPanel`). On a phone the counters wrap 2 x 2.
- **Two columns from 900 px**, `minmax(0,2fr) minmax(0,1fr)` (`.tcols`): **Needs you** on the left (`#needPanel`); on the right **Proof today** (`#proofToday`),
  one short panel (round 2, 2026-10-12; see below). Under 900 px it is one column in that same order, Needs you first: there is
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
**Ending a run keeps what was earned** (stage55, Amir 2026-10-11: *"yes, they keep it"*). The button calls
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

## 4. ATHLETES

One row per person across **both** systems, split under three headings — **Needs you**,
**All quiet** and **Gone quiet** — so the line between "waiting on me" and "fine" is drawn rather
than implied. Filter chips across the top (Everyone · Needs you · Coached · Free · Proof only · No file ·
Gone quiet, and Paused and Former when someone has that status) each carry their count, and **the tier chips add up to Everyone** (the public demo and your own record are in no count and not on the list; the footer says so and links the demo, `roster-demo-out`; a former athlete is in none of them) (a person with no programme and no habits is under *No file*; a chip
with nobody in it is not drawn, except Everyone, Needs you and the one you are on). Search reads the name, the id, the board name, the contact's
name, email and WhatsApp digits (Persian ی/ک and extra spaces are normalised); the sort and the
search survive a redraw.

**The list is one dense white surface** (redesign round 1, 2026-10-12; `roster-dense`): the groups are quiet label bands inside it, and each
person is one row, a single `<button class="ath">` that opens their file. On a PC (900 px and up) the rows are aligned columns under a
head row, about 52 px each (it was about 100 px a card, 4,000 px for 38 athletes): **Athlete** (a 28 px initials disc, court green, an
outline for the free tier because plum means a warning; the name; the tier as small grey text: coached, free, Proof only, no file; the
Paused or Former chip), **Cycle** (`C2 · wk 3/5 · ends 22 Oct`, from `rosterCycleHtml()`: the number is the programme's current cycle
index + 1, the week is `cycleWeekOnC()`; in the last 7 days it says `ends in 3 d` / `ends today` and after the end `ended 5 d ago`, in clay
for an active coached athlete; an undated cycle shows its name and length, then `no cycle`, or `no programme` for someone with no
programme row), **Last session** (how long ago and how many; `no sessions yet` for a coached athlete with none, a dash for anyone
else), **Proof** (seven presence dots, `n/7`, and the level as plain text, filled in place by `paintLevels()` when the levels arrive;
empty for a person with no habits) and **Why** (the reasons from §3's one rule, clay when it is a warning and grey when it is only worth knowing,
a pause or former status in words, and a load spike in plum: `load 1.6 · high load`, `· climbing`). A note waiting keeps a clay mark on
the left edge. On a phone (under 900 px) there are no column heads and a row is two lines: the name, tier and Why, then the cycle, the last
session and Proof (the dots wrap to a third line when there is no room); nothing is ever clipped.

**A flagged row says why, in words:** the reasons in §3's table, from the same function.

**Behind the ⚙ Tools button, in the top bar on every screen** (stage63 round, 2026-10-11; audit ROSTER-12; Amir: "a ⚙ Tools button"; **moved from the roster's controls into
the bar on 2026-10-12, round 2 of the UX pass, on Amir's word**, so the roster starts right under the filter chips and the tools are one tap away from any screen). The
roster keeps the search, the sort and the filter chips. The button keeps `id="toolsBtn"`, `toggleTools()`, `aria-expanded` and its badge, and opens `#toolsPanel`, a panel hanging under the bar
at the right (520 px wide at most; the full width under the bar on a phone), above the page. It holds *Create N missing logins* (coached athletes who have trained and have no
login), the **Coach tools** line: *↑ Add coaching logs* and
*⤓ Backup*, with when this computer last took a backup, then **Logins to send** (open while three
or fewer wait, folded above that: each unsent password with Copy message and Mark sent). The button's badge counts the logins waiting to be sent; the panel is folded when
you arrive and **closes on a second tap, on Esc and on a click outside it**; it **stays open through a redraw** (it is not part of `#content`; `paintTools()`, called from `renderRail()`
and after a backup, rewrites its contents only when they changed, and never takes the focus off a box being typed in) (`tools-button`, `nav-seven`). **A stored
password clears by itself** (stage51, 2026-10-11): the database removes it the moment the person signs in
with it and stamps *sent* with that time, so they drop out of the list. *Signed in with it* can only show
for a moment, or on a password stored before stage51; the Buyers lists (Course and Testing app) behave the same.
If you sign in as the person yourself to test a login before sending it, that clears it too: reset the
login for a new password. (The secret-link tools are gone: the links were retired on 2026-09-07.)

- **There is no programme upload button** (removed 2026-10-11, Amir: *"i never use it"*, with its function). A NEW athlete's first
  programme and every new cycle go up through the pipeline (`publish_cycle()`, `p_new_cycle => false` for a new athlete); a
  day-to-day change is the ✎ editor; an old version comes back from Version history.
- **↑ Add coaching logs** only adds a log for an athlete who has none on the server. It never
  replaces one: the server copy is the record (publish_cycle splices into it, `/cycle-report`
  appends its Debrief). Until 2026-10-10 it replaced them wholesale.
- **⤓ Backup** pages every table in key order, de-duplicates, blanks the unsent login passwords
  (`initial_password`) and says **INCOMPLETE** when a table could not be read or came back short. The file is the rows
  only (no schema, functions or policies: those are `supabase/*.sql`, and the structure as a whole is `supabase/schema_snapshot.sql`),
  and a restore is not a plain import, because the login tables point at sign-in accounts that must exist first.
  **The way back is written and rehearsed (2026-10-11, audit TOOLS-4): `scripts/restore/README.md`.** `restore_backup.py` turns a
  backup into SQL files and leaves out everyone a receipt in `erasure_log` names, so give it the NEWEST backup as `--receipts`
  even when you restore an older one; the logins are re-created from this dashboard (Create missing logins; Buyers → Course and Testing app with the
  same usernames), then `20-after-logins.sql` puts back what belongs to a login. A table added to the schema goes in `BACKUP_TABLES` the
  same day (`scripts/test_restore_backup.py`, pre-commit guard 17, fails when the list and the snapshot disagree). Keep the last 12
  weekly files and delete older ones: `python scripts/prune_backups.py <folder>` lists them, `--delete`
  removes them (the privacy notice promises a deleted record leaves the backups within about three months).
  **An incomplete backup is a different file** (2026-10-11): `aa-backup-INCOMPLETE-<date>.json`, with `complete: false` and
  `could_not_read` inside. It is not a restore point: it does not count as the weekly backup (Today keeps asking, and says the
  last try was incomplete; the Coach tools line says so too), and the prune script lists it apart, never treats it as the
  newest backup and deletes it on the same 12-week rule as the others. Fix what the alert lists, back up again, and delete it.

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
into an open editor, and (since 2026-10-11) what you typed or opened in the tab itself: the password box with the cursor in it,
Version history, the Coaching log, a day's raw log, Earlier cycles and the live snapshot. That holds for the same athlete's same
screen only; another athlete or screen starts clean.

**The header** (2026-10-12, round 1 of the UX redesign; the same on every sub-tab): `← Roster`, a 44 px avatar, the name, one line
(tier, status and level chips, then *N sessions · Proof n/7 · last active …*), then a **cycle line** and a **Needs you line**, and on the
right (below the name on a phone) the **WhatsApp** button and **View their app** (or **View their Proof** for someone with habits and no
training days). The cycle line (`cycleLineHtml()`) is the old dark green block on The work, moved up and made one line:
*Cycle 3 — Foundations · week 2 of 4 · 12 Oct – 9 Nov · 28 days left*, then the focuses in grey. The week is the app's own
(`cycleWeekOnC()`); a cycle with no dates has no week text (its roadmap label, *Weeks 1–5*, stands in), and the wording *ends today* and
*ended N days ago* is as it was. The Needs you line (`needsLineHtml()`) says why this person is in front of you: each of their reasons from
`reasonsOf()` (`a.reasons`, plus the quiet flag a gone-quiet athlete keeps, never computed here) as a link to the sub-tab that has it, joined by
" · ", the ones that need you in clay. `file-groups` drives both.

### The work — prescribed vs done, on one line

**One card per program day**, in program order, whether or not it has ever been trained. The header
carries the day, the focus name, when it was last done, sRPE · duration · AU · readiness, and a
verdict — *"1 not done · 2 off plan"* with *"5/8 exactly as prescribed"* under it. Only the most
recently trained day opens by itself; the rest are one tap.

Inside, every prescribed exercise is a row with three columns:

| | |
|---|---|
| **Prescribed** | what you wrote — `4 × 10`, `RPE 7`, tempo, any extra chips and the pill underneath (a pill off the list in clay) |
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
the **raw log exactly as sent** behind a toggle on every day, **Earlier cycles**, and
a collapsed **live app snapshot** — what is on their phone right now, which is a different question
from what they finished. A started day is *in progress* by the app's own rule (2026-10-11): its check-in stamp is on today's
calendar day, or under six hours old; anything older and unfinished reads *a leftover, not live* (it used to count 30 hours).
The day is this computer's, as the app's is the phone's.

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
(stage46 for the note on the whole session; **stage58, 2026-10-11, for a note on one exercise too**: `save_session()` compares the exercise notes of
the new save with the old row's, taking a note away or editing a weight does not bring it back, and your own saves never do). A `Note:` line
with nothing after it is not a note to read. Mark read changes that one row in
the page's copy; it no longer re-downloads the whole session history.

**What the file needs from the server, and what it says when it cannot have it.** The page loads every session's numbers
at boot but not its text: an athlete's logged sets and the raw log are read when you open their file (one read, then they
stay in memory until the list is reloaded). If that read fails, the work tab opens with a red line, *Their session logs did
not load*, the reason and **↻ Try again**; the day cards keep the numbers that did arrive (date, sRPE, minutes) but show no
comparison and no verdict, because comparing against nothing would read as a week they skipped.

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
each line is the programme just before that save, and Restore checks it belongs to this athlete. **Who saved it** is the signed-in email;
an edit made in the SQL editor or by Claude's database tool has no signed-in user and used to carry the previous person's name, as if they had made it.
Since stage59 (2026-10-11, audit SERVER-12) that edit says `sql`, and a label a writer sets itself (`publish_cycle`, `claude`) stays.

**Undo is a one-tap button and a sentence** (audit FLOW-11 and WORK-10, 2026-10-11). After a ✎ save a bar above the toast says what the save
changed, in the athlete's words (*Ava Example: Day 1 · Goblet Squat: sets 4 → 5*), with **Undo** (it stays for half a minute). Undo puts the
programme back as it was just before the save, **only if** the row still carries the stamp the save left: if the pipeline, another tab or a
restore has written it since, Undo refuses, says so and changes nothing (Version history still has every save). A **restore** gets the same bar
(*Ava Example restored: …*), and a restore is itself written only if the programme has not moved since it was read. Every line in Version
history has **What this save changed**: this stored version against the next one (the newest against the programme now), as a short list: a number
that moved (*sets 3 → 4, RPE 7 → 8, rest 90 s → 120 s*), a card added or removed (*Face Pull added (3 × 12)*), a note, a day, an order, a cycle or
the athlete block. Cards are matched by day, block and name, so a rename reads as one removed and one added. The wording is `programDiff()`;
`test_coach_compare.js` section 15 has its 27 cases.

**The pill (CHP-2, 2026-10-11).** The editor has a **Pill** picker: the closed list from `assets/js/chips.js`
(`Chips.PILLS`, the same object as `check_program.py` and SCHEMA.md), grouped as Hands, Lead side, Intent, Hold,
Brakes and Pace. A tap puts a value on, a second tap takes it off, and a value from a group already on takes that
one's place: at most two, one per group. A third is refused with a toast. There is no box to type a new value: one
joins the list only on your word. A hold value is warned unless Tempo is `iso`, and *easy pace* unless RPE is empty.
An old spelling on a card ("right leg first") shows as its list value ("right side first") and is saved that way.
A value on the card that is not on the list ("glute focus", "3s eccentric") is shown in clay with **Move to the
note** (it goes to the end of your note as a sentence) or **Drop it**; left alone it is kept, so nothing is lost, and
`check_program.py` flags it. Save writes the pill as one `intent` string joined by " · ", and a save that changes
nothing still writes nothing. The note box now says what a note is for (COM-14): about this athlete, one to three
short sentences, the point first. On The work, the row shows the pill under the dose, and a pill problem counts in
its chip issues.

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
flags it with `"test": "5RM"` (`true`, or `"<n>RM"` with n from 1 to 10: anything else is no flag, here and in the athlete's app,
and the programme checker refuses it; see `SCHEMA.md` → `test`, and `/program-design` → The Ceiling for how
to set one). A flagged lift with nothing on the record at all is listed too, with a dash — it is the
one most worth chasing. **You see this whatever week the cycle is in**; the athlete's own retest
nudge waits for the closing week so it does not nag them, but you are the one deciding when to ask.

Read-only. The athlete owns the record: they log a max from **Personal Records → + Log a max** in
their app, and they can delete any entry. A lift they have renamed between cycles reads as one lift
here and one lift there — both sides run the same name matcher, on purpose.

### Body weight — on The work, folded

Under the Personal records (and above the day cards) sits **one compact panel** with the body weight the athlete logs in their training app: its header line reads
*Body weight · 64.7 kg · today · −1.3 kg over 30 days · −2.5 over 90* (the latest reading and how long ago, then the change of the 7-day average over 30 and
over 90 days, the same average the app draws), and the chart is folded under it in `<details id="wtdet">`, **shut until you open it** and kept open through
a redraw (`snapTabBody()` collects every `details[id]`). It is **absent, not empty, when there is no reading**. It moved here on 2026-10-12 (round 2): the
weight comes from the training app, not from Proof, and a coached athlete who never ticks a habit has no Proof tab to find it on. Read-only, never scored
(`weightPanel()`; `proof-home` drives it).

### Proof · File (and the retired Calls)

- **Proof** (only for people who log habits) — server-scored level, 14 presence dots, their week,
  board name and worn title, WhatsApp and email, and their wall lines with hide/show on each. (Body weight is not here any more: it is on The work, above.)
- ~~**Chat**~~ — **removed 2026-09-26** (Amir: *"whatsapp first, remove in app chat from app and
  coach.html"*). The `messages` table and its three functions stay on the server untouched, so no
  past thread is lost; nothing reads or writes them now.
- ~~**Calls**~~ — **retired 2026-10-11** (Amir: *"Retired, fold it into File"*; one call log in the table, from
  12 July, and `/cycle-report` does the end-of-cycle review). The tab, **+ New call log** and **Copy cycle
  prompt** are gone. The old logs stay readable, and deletable one by one, in the File tab under **Old call
  logs** (the section is absent when there are none). An old `#a/<id>/calls` link opens the athlete on The
  work. `call-log.html` and `CALL_LOG.md` still exist but nothing in the dashboard links to them.
- **File** — four groups in this order (2026-10-12), each one white panel of label / value / action rows between hairlines, with the longer
  explanations folded at the end of their group under **How this works** (nothing was removed: each short hint on a row has its full text there):
  1. **Contact and access:** **WhatsApp** (the number box, *Save number*, *Remove*), **Login** (create, change password, remove; an unsent
     password shows here with Copy message, WhatsApp when the number is known, and Mark sent; *No login yet* stays in clay), **Status**,
     **Their app** (*View their app* / *View their Proof*: read-only previews of the programme; what they have logged is not in them, it is
     under The work and Proof here; audit TOOLS-11) and **Came from** (the applications linked to them under Leads; each has an *open the application* link).
  2. **Programme:** the facts (athlete id, tier, days a week, cycle, roadmap n of m, when it was last saved and by whom; *Stored in: no
     programme row* only when there is none), then the **Coaching log** and **Version history** folds.
  3. **Records** (absent when there is nothing to show): **Hidden sessions** and **Old call logs**.
  4. **Danger zone**, a fold shut by default, open while **Erase completely…** is open for this person, and kept open across a redraw once
     you have opened it (`#dangerzone`, through `snapTabBody()`). Inside: **Delete training history**: every finished session (the hidden ones too) plus what the app keeps for them on the server (habit log, body
     weight, personal records). Their programme, login, coaching log, calls and wall lines stay, and so
     do they on the roster. (It was called *Delete all data* until 2026-10-10, which it never was.) It is
     one call, `coach_delete_training_history()` (stage48): the sessions and the progress snapshot go
     together or not at all, and the counts come back. It used to be two deletes from this page, and a
     failure between them left one gone and one standing. Next, **Erase completely…**, which removes the whole
     person (see *Erasing a person* below), and **Forget their Proof data…** for a free signup (see *Proof*, section 7).
- **A WhatsApp number on every File** (stage62, 2026-10-11; audit FLOW-8; Amir: "a WhatsApp number field on each coached athlete's File, shown in
  the header with a WhatsApp button"). Most coached athletes had no contact record (9 of 49, all made from an intake form), so a new login's
  *Copy message* had no WhatsApp button for them. The File has a **WhatsApp number** box (*Save number*, *Remove*); the header (right of the name, 2026-10-12)
  shows a **WhatsApp ↗** button and the number, or *add a WhatsApp number* for a coached athlete with none. The page checks that `waLink()` can open the
  number (the country code, or an Iranian 09…; Persian digits are folded) before it sends it; `coach_set_whatsapp()` stores it as typed on the athlete's
  `hab_contacts` record, making one only when there is a number to keep (`source 'coach'`, tier from the programme). **A contact the coach made is
  not a signup** (`isSignup()`): it is not in the Proof signup funnel, is not a *new signup* reason, does not count as the athlete being seen and gives
  them no Proof tab. The typed number survives a redraw (`KEEP_TYPED`). `whatsapp-number` drives it.
- **Hidden sessions** (stage60, 2026-10-11; audit FILE-11 and ROSTER-9; Amir: "hide it, keep it recoverable"). The Raw log's button is **Hide this
  log**, no longer Delete. A deleted session left the report's mark in the athlete's progress, so the roster warned *session not synced* for ever,
  and their phone could send the session again and bring it back. A hidden session stays in the database (`session_history.hidden_at`, `hidden_by`)
  and leaves every number, list and warning: the dashboard (`S.hist` holds the visible ones, `S.histHidden` the hidden ones, and `syncGapsOf()`
  counts a hidden session as present), the app's history (`get_my_history()`), the WORKOUT tick (`get_workout_days()`) and the pipeline's queries
  (`and hidden_at is null`). The athlete's phone can re-send it as often as it likes and it stays hidden; only a coach's save brings it back. A bar
  with **Undo** follows the hide for 30 seconds. The athlete's File lists every hidden session under **Hidden sessions** with **Restore** and, for a
  real erasure request about one session, **Delete for good** (only a hidden row can be deleted from there, and it asks first). One coach-only
  function does both directions, `coach_hide_session()` (it never touches `updated_at`: hiding is not athlete activity). `session-hide-undo` and
  `session-hide-no-false-warning` drive it.
- **This cycle on the day cards, earlier cycles folded** (2026-10-12; Amir, a day into Elmira's new cycle: *"all im seeing is his
  past cycle"*). When the current cycle has a start date, a day card holds only the sessions trained on or after it, and its picker
  lists only those; a day not trained yet this cycle says *nothing logged on this day this cycle yet*. Last cycle's sessions are
  under **Earlier cycles** (folded, newest first, each with its log exactly as sent and **Hide this log**): they used to sit on the
  new cycle's cards, compared with a plan they never trained. A cycle with no start date keeps every session on the cards.
  `work-this-cycle` drives it.
- **No Add past session from email** (removed 2026-10-12; Amir: *"i will never do that manually"*). Nothing is meant to need it:
  since the same day the athlete app keeps every finished session in its queue until the server has it, and files a day left
  unfinished by itself (`PROGRAM-APP.md` → *No signal*, *An unfinished day is filed by itself*). If one is ever lost while the
  emailed reports still exist, Claude puts it back with `scripts/restore/sessions_from_email.js`, which reads each report with
  `parseSessionEmail()` (kept in coach.html as the one reader of the report's format, with `parseCheckinPlan()`; not called by the
  page; `scripts/check_twins.js` round-trips the app's `readinessPlanLine()` through it).
- **"Session not synced" without the email** (2026-10-12). `syncGapsOf()` also reads the phone's own list of the sessions it
  finished, `<id>_finished` in their progress, for the last 14 days: a session on it with no row (hidden counts as a row) is the
  same warning the report marks give. It keeps working when the reports are switched off. `sync-finished-list` drives it.

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

The athlete's check-in, scored out of 5 **the way their app scores it** (REC-2), **higher = fresher**. The score is the mean of
sleep, energy, stress and how ready they feel (soreness is asked, but it only moves impact work, so it is left out), and
**their usual is the mean of their last ten earlier scores, once they have five**. A 2/5 therefore reads as *"down from their
usual 4.1"* rather than against a generic cutoff. The app stores both with the check-in (`score`, `base`; `base` is null while
they had fewer than five) and the dashboard shows what was stored. A check-in from before 2026-09-26, or one imported from an
email, has neither, so the score is worked out from the four answers and the usual from the check-ins before it, by the same
rule (`readinessSC()` and `usualC()` are the twins of `readinessS()` and `readinessBase()` in `program.html`; `scripts/check_twins.js`
runs both on the same check-ins).

Three places show it and they say the same thing (audit TWIN-3 and TODAY-11, fixed 2026-10-11): the **pill** (the app's verdict for
the latest check-in: normal, lower or short day, the score and the usual), the **chart** behind the Charts button (the score of every
check-in, a dashed line at their usual now) and the **day card** (the score beside the verdict that it made). Until then the chart
plotted the old composite, which counts soreness and leaves out how ready they feel, against an all-time mean, so it could call a
day normal that the app had made lower. With fewer than five earlier check-ins there is no usual: the card says so, draws no dashed
line and colours nothing, and the pill never shows a made-up difference. Two check-ins on one day are told apart by the moment they
were answered, so the pill, the chart and the card name the same one as the latest.

### Adherence

Planned = their program's day count per week, pro-rated to the days in the window; completed comes
from `session_history` with a partial counting as half. Measured over the last 28 days, or the days
since their first session if that is shorter, so nobody is charged for days before they began (it
used to charge a whole week for a week that had just started, so a perfectly adherent new athlete
read 33%). Shown up to 100%, with "N more than planned" when they did extra. Green ≥ 85%, amber
60–84%, red < 60%.

---

## 7. PROOF

**Proof is the community's home** (round 2, 2026-10-12): everything about the crew is on this one screen, in two columns from 900 px (the left, about 1.3 to 1, is
the wider; one column below that, the left first). **Left:** **The wall**, then **The board**. **Right:** **Quest week**, **Proof pulse**, **Titles minted** and
**Season**, last. (**The funnel** was the last panel here until 2026-10-12; it is Leads → Free signups now, because the people who signed up are leads to follow, not part of running the crew.) The wall, the quest lever and the pulse used to be on Today; Today keeps a short Proof column that links here
(section 3, *Proof today*). One copy of each id is in the page at a time (`#wallPanel`, `#questPanel`, `#pulsePanel`, `#coachLineInput`: Today draws its own, `#proofToday`).
A redraw (a line posted, a line hidden, a quest week started) is drawn at once from what the page holds: the board is read once and kept, and only a real first
read (or a **Reload**) waits, inside the board's own panel as *Fetching the board…*, so the wall and the lever never blank out under your hands.

**The wall** — the full wall (`wallPanelHtml()`): the composer, every day's lines newest first, Hide / Show on the crew's, **Show the full week**. Everything in
section 3, *The wall*, applies unchanged.

**Quest week** — the full lever (`questPanelHtml()`): the live run with **End this run today**, or the picker with **Start the week**. Section 3, *Quest week*,
has the rules (ending keeps the XP already earned; never `clear_quests()` from the page).

**Proof pulse** — every Proof athlete, most silent first, seven presence dots each (section 3, *Proof pulse*).

**The board** — `leaderboard_top()`, the server's own scorer, season or week.
These are the exact rows and the exact order the crew sees in their app. It is read once and kept (so a long Proof visit does not re-score the
board on every redraw), and it says **when it was read** (*As of 14:32*) with a **Reload** button; starting or ending a quest week reads it again,
because the XP moved (audit MKT-3, 2026-10-11). When the read fails the page says why (*Couldn't fetch the board: <reason>*) and has **Try again**
(MKT-8).

**Titles minted** — the last 30 rows of `hab_titles`, newest first. A quiet
health check: if this stops moving, minting has broken (it did once, silently,
for four days — see stage23).

**Season** — which season is live and how far in. Starting or closing one stays
in the SQL editor deliberately: it resets every score, and that shouldn't be a
button on a dashboard.

**The funnel** (Leads → Free signups; `funnelPanelHtml()`, one self-contained function that returns the whole section) — everyone from `contact_list()`, newest first, with **days
logged** as the qualifying signal. A free athlete past **14 logged days** is
flagged *ready to upgrade?* — they've proven the habit, so the coaching pitch is
earned rather than cold. The headline counts **free** signups; someone who became a coached
client is listed as *coached · converted* (the tier comes from their programme). WhatsApp opens a
chat (one link builder for the whole page: Persian digits and Iranian 09… numbers handled).

**Forget** (free and Proof-only people only; since 2026-10-12 it is **not a button on the funnel row** (a permanent delete one click from WhatsApp and
copy email) but **File → Danger zone → Forget their Proof data…**, offered to the people the funnel would have offered it to: a signup who is not a
coached athlete) calls `forget_contact()`, which PERMANENTLY deletes their
contact details, their whole progress row (habit log, body weight, records), their board place and
their roll-call lines. Their programme, login, session history, titles and season results stay.
It is not offered for coached clients: on them the progress row is their training app's cloud
copy. (Until 2026-10-10 it was offered for everyone and this manual said their logs were untouched.
`supabase/stage45_forget_contact_guard.sql`, applied 2026-10-11, makes the server refuse a coached athlete too.) It is
not a full erasure: their login still works, so a phone they still use can upload again.

**The Library tab** (`#links`) lists every workout and article, published or hidden, with *Copy App*
(the in-app link) and, for articles, *Copy Web · FA* and *Copy Web · EN* (the public pages). **Hide**
takes an item off every athlete's app at once (the file and its web page stay); **Publish** puts it
back. The list is read in pages (audit SERVER-10), so a server with a row cap still shows every item. **Publishing a file asks properly**
(audit TOOLS-6, 2026-10-11): the confirm says per item whether it is *new*, *replaces the live one* or *replaces a hidden one, which STAYS hidden*
(publish it from its row when you want it live); a file whose id is already on **another shelf** is refused, naming the shelf (hide that one first,
then publish again), so an item moved to another category is no longer published twice; a Farsi translation or a workout picked as an article is
refused as before. **Buyers** (the **Course** and the **Testing app**, two sub-tabs) list buyer logins; a failed load says so with *↻ Try again*
instead of "No logins yet", and *Mark sent* asks first (it clears the only stored copy of the password).
The **private note** typed when a login is made lives in `buyer_notes`, which only the coach can read (stage53, Amir
2026-10-11): it used to be the account row's `label`, which the buyer could read through their own account. A trigger
moves any label the Edge Functions still write into `buyer_notes` and leaves the row's label empty, so the Edge
Functions did not change; the lists read the note from `buyer_notes` (applied 2026-10-11) and still fall back to the old
column on a project that has not run stage53. **A buyer row keeps what is done every day in view and the rest behind one button**
(redesign round 1, 2026-10-12): the name, then the stored password or the state (*sent*, *created*, *revoked*), then **Copy message**
(the primary button) and **Mark sent** while a password waits, or **Restore** on a revoked row, and always **Manage**. Manage opens one line
under the row with **Change password**, **Revoke** (not on a revoked row) and **Erase…**. Which row's Manage is open lives in the tab's
state (`st.manage`, one at a time), so it survives a redraw; it is also open while that row's password form or Erase panel is open, so the
button that led there stays in view; a second tap on Manage folds it and closes what it opened (the password form, an Erase panel that has not
started); a finished action (a new password, a revoke, a restore) folds it by itself; and the *Revoked* section opens for a row whose Manage is open.
**The two buyer lists are one block** (`buyerLogins()`, audit MKT-6, 2026-10-11), built twice with their own table, Edge Function, address and
Farsi message; before that they were two copied blocks that had drifted. Since round 2 of the UX pass (2026-10-12) each draws into the container it is given
(`#buyersBody`, which says which list it is for, so a redraw that comes back after a call does nothing when you have gone to the other sub-tab), under the **Course · Testing app**
bar (`renderBuyers()`); each sub-tab's count of active logins is read in the background so both show, and follows a create, a revoke and a restore.
`#buyers` is the Course, `#buyers/testing` the Testing app. A login call runs one at a time on a buyer tab and on an athlete's
File tab (a double tap on *Save password* used to make two passwords and leave the message with the first), and after a create, reset or restore
the page keeps saying what it did (*Login created for …*) instead of "Copied" a moment later. `buyer-logins-course` and `buyer-logins-assess`
drive create, copy, mark sent, Manage, change password, revoke, restore and a failing function through both.

### Erasing a person

One panel, three kinds of person (stage54, Amir 2026-10-11: *"both athletes and buyers"*): an athlete (File →
Danger zone, which is folded until you open it → **Erase completely…**; it is open while the panel is), a course buyer or a testing-app buyer (**Erase…** on the row). It opens by
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
  email, their WhatsApp number (last 9 digits, Persian digits folded) or their full name, and **first the ones you linked to them in Leads** (stage61: *linked to them*; ticked for you, because you did the linking). **A linked form and a same-email form
  start ticked**, and not when another athlete's contact carries the same email (a parent's, for two children: flagged
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
  2026-10-11): an athlete who is also a partner keeps the record under Leads, in Referral codes; only its link to the athlete
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
- **A revoked buyer** has the same Erase… button (behind Manage); the *Revoked* section opens for the person whose panel is open
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
| `session_history` | Sessions, ACWR, readiness, adherence, notes to read. **Read light** (2026-10-11): at boot every session's numbers (everything but `summary` and `log`, 78% of the bytes) and the text of the unread sessions that contain "Note:" (an exercise-only note is inside the text and is what puts someone in Needs you); an athlete's `summary` and `log` are read when their file opens (`ensureSessionsFull()`), and again only after the list was reloaded. If that read fails the work tab says *Their session logs did not load* with **↻ Try again**, and shows no verdicts |
| `athlete_progress` | Last active, live snapshot, and the habit log behind every presence dot |
| `programs` | **The roster** — every athlete, their name, tier and prescribed plan |
| `athlete_identities` | Who has a username/password login, and the passwords still to send |
| ~~`athlete_keys`~~ | ⚠️ Empty since the secret links were retired — reads nothing useful |
| ~~`messages`~~ | ⚠️ Nothing reads it since the in-app chat was removed (2026-09-26). Kept, not dropped |
| `hab_notes` | The wall, the coach line, moderation |
| `athlete_status` (read as a table, paged: stage63) | Paused and former marks: the roster, Needs you, the totals |
| `hab_contacts` via `contact_list()` | The funnel (signups only: not a `source 'coach'` record), contact buttons, the header's WhatsApp button, days logged |
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
| `hab_intake` (read as a table, paged: stage61) | Leads → Applications, the athlete's *Came from* line and the erase panel's forms |
| `affiliates` | Leads → Referral codes |
| `assess_accounts`, `tps_accounts` | Buyers (the Testing app and the Course; read when Buyers is opened, both, so each sub-tab can show its count) |
| `buyer_notes` | The private note beside each buyer in Buyers (stage53); coach-only |
| `erasure_log` | Receipts of full erasures (stage54); only the backup reads it |

`data/<id>.json` is no longer read at all (2026-10-10): it has not been served since 2026-09-07, and
the dashboard used to fall back to it for any id without a programme row. Growing tables are read
in pages (`selectAll()`), so none is cut off at the API's 1,000-row limit.

The **prescribed-vs-done** comparison joins the plan in `programs` with what happened, parsed from
the plain-text `summary` that `program.html` wrote into `session_history` (with the names taken
from the structured `log` when it lines up). Both readers live in `coach.html` (`rxOf()` from
`assets/js/chips.js`, `parseSessionLog()`) and both mirror code in `program.html` — change the
grammar there and they have to follow. `node scripts/test_coach_compare.js` runs 123 assertions
over real logs and the email import, and catches it if they don't. The write paths (saves, deletes, logins, backups) are
covered by the real-mode harness in `scripts/headless/coach/`.

**Logic that exists in both apps is guarded** (`scripts/check_twins.js`, pre-commit guard 15, 2026-10-10).
It cuts each twin out of both files and runs the same vectors through both: the exercise-name
tiers (`exNameVariants` / `exNameVariantsC`; the programme checker's `norm_name()` and SQL are held to the same cases, `scripts/name_cases.json`), a renamed lift (`ceilAliasMap` / `ceilAliasMapC`), the
Spine lookup (`spineFor` / `spineForC`), the RPE target a set is judged against, from the week note on every day and a lower day (`rpeTargetOn` / `dayTargetC`), the week a day
falls in and its note (`cycleWeekInfo`, `weekNoteNow` / `cycleWeekOnC`, `weekNoteOnC`: about 40,000 checks, run with the athlete's clock in eight time zones), what
the Quality check counts (`qmSets`, `isPrepBlockTitle` / `qmSetsC`, `QM_PREP`), and the check-in line's
writer and reader (`readinessPlanLine` / `parseCheckinPlan`). It also fails a change to `assets/js/chips.js`
that keeps coach.html's hand-typed `?v=` (the service worker serves `/assets/` cache-first): bump the
token, then `node scripts/check_twins.js --stamp`. `scripts/test_check_twins.js` breaks a copy on purpose
to prove each kind of drift is caught. Also guarded: whether a started session is over (`sessionIsStale` / `sessionIsStaleC`), which values of a lift's `test`
are a retest flag (`exTestSpec` / `exTestSpecC`), the check-in score and the athlete's usual (`readinessS`, `readinessBase` / `readinessSC`, `usualC`)
and one day card's quality chips with the 70% gate and the 12% cut, in the phone's view and the coach's (`qualityMix` / `qualityLensC`, `qualityDayC`). Not covered, on purpose: the dashboard resolving cards against drafts too
(TWIN-1), a known difference listed in the script's header. A new copy of an app rule in coach.html goes into the script the same day.

Some coach writes go through RPCs that check the coach themselves (`set_coach_note`, `hide_note`,
`set_quests`, `end_quests` (stage55), `clear_quests`, `forget_contact`, `save_session`, `coach_season_levels`, and since stage48
`coach_delete_training_history` and `coach_save_spine`, and since stage54 `coach_erase_person`, each one transaction); the rest are
direct table writes that only the coach's RLS policies let through. Every one of them asks for its
rows back, so a write RLS silently refused (a lapsed sign-in) says so instead of reporting success.
