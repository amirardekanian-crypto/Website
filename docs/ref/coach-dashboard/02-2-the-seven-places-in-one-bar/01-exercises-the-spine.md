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

---
*One section of the reference. The index is [`COACH_DASHBOARD.md`](../../../../COACH_DASHBOARD.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
