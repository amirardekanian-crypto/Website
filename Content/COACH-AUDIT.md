# The Coach's Box audit (coach.html), 2026-10-10

What was checked, what was wrong, what changed, and what is still open. Written for Amir; the
technical detail behind each line is in the commits named, the harness in
`scripts/headless/coach/`, and `COACH_DASHBOARD.md` (the manual, brought back in line with the code).

**How it was done.** 191 findings from 13 independent passes over the dashboard and everything it
talks to (the athlete app, AA Proof, the database, the three login functions, the course and testing
apps), each one checked again by a separate reviewer told to disprove it: 186 held, 4 were plausible
but not provable from here, 1 was wrong. The write paths were then driven for real in a browser
against a stand-in database (38 scenarios, made-up athletes), before and after the fixes.

## 1. In one paragraph

The dashboard looked right and mostly was, but it trusted the copy of the data it loaded when the
page opened. Claude's pipeline writes the same records while the page sits open (a new cycle, a
Spine entry, a coaching-log Debrief), and several saves wrote the old page copy back over that work
without a word. Separately, a failed read or a refused write usually looked exactly like an empty
list or a success. Those two habits caused every critical and most high findings. Both are fixed
at the root: every save that can collide now reads the live record first, sends only what changed,
and refuses with both values shown when someone else changed the same thing; every read that can
fail says so in a banner, and every write asks for its rows back.

**Where it stands** (fourth session, 2026-10-11): <!--T1-->of 191 findings, 187 are fixed, 2 partly fixed (the harm is gone, something named in the finding is left), 2 open and 0 was not a bug. Of the 45 critical and high findings, 44 are fixed; not yet: TOOLS-4 (open).<!--/T1--> Nothing waits on a decision from you any more: you answered the twelve
questions in §7 and the eleven in §12 (pile A), and the one thing left for you is to switch off public sign-up in the Supabase
dashboard (SERVER-14). The SQL pack and the removal script ran on 2026-10-11 and §11 records what was checked afterwards.
**What is left, and how to continue in a new chat, is §12.**

## 2. The system, as it is now

**Nine tabs in two groups.** Daily: Today · Athletes · Intake · Exercises. Now and then: Proof ·
Library · Affiliates · Testing app · Course. An athlete opens as a file with four screens:
The work · Proof · Calls · File.

| Feature | Reads | Writes | Shares logic with |
|---|---|---|---|
| Today: Needs you, wall, coach line, quest week, notes to read | everything in memory; `hab_notes`, `xp_rules` | `set_coach_note`, `hide_note`, `set_quests`, `clear_quests`, `session_history.coach_status` | the roster (`reasonsOf()`, one rule) |
| Athletes: roster, logins, backup, add coaching logs | `programs`, `athlete_progress`, `session_history`, `athlete_identities`, `coaching_logs` | `coaching_logs` (create only), athlete-login function | `athletesNeedingLogin()` |
| The work: plan vs logged, ✎ prescription editor, readiness, load, adherence | `programs`, `session_history`, check-ins in `athlete_progress` | `programs` (guarded), `session_history` (import, delete) | program.html (`rxOf`, set-log grammar, the REC-2 target rule `dayTargetC()`) |
| File: login, version history, raw logs, delete history | `program_versions`, `call_logs` | `programs` (restore), `session_history`, `athlete_progress` | |
| Exercises: the Spine, the ten qualities, coverage | `exercises`, `exercise_coach`, `qualities` | the same three (guarded, changed columns only) | program.html `spineFor()`, `check_program.py` |
| Proof: board, funnel, titles, season | `leaderboard_top`, `contact_list`, `coach_season_levels` | `forget_contact` | habits.html scoring (server copy in `xp_rules`) |
| Library | `library`, `library_categories` | `library` (publish, hide) | build_article_pages (the `.fa.json` rule) |
| Intake, Affiliates | `intake_list`, `affiliates` | `set_intake_status`, `affiliates` | |
| Testing app, Course | `assess_accounts`, `tps_accounts` | assess-login, tps-login functions | |

**Logic that exists twice (change both):** the REC-2 day target (`dayRpe()` in program.html,
`dayTargetC()` here), the Spine resolver (`spineFor()` / `spineForC()`), the name matcher
(`ceilAliasMap()` / `ceilAliasMapC()`), the set-log grammar, the muscle list (six copies), the
WhatsApp link builder (now one: `waLink()`), and the "needs you" rule (now one: `reasonsOf()`; it
was four). These are guarded by `scripts/test_coach_compare.js` (96 assertions since the second session) and `scripts/check_twins.js` (TWIN-10), and the word-list
checks in pre-commit.

**Where data lives:** only on the server. Nothing in coach.html reads `data/<id>.json` any more (the
old fallback could show a stale local file as an athlete's live programme). The weekly ⤓ Backup is the
only copy outside the database.

## 3. Findings by root cause

By severity: 12 critical, 33 high, 88 medium, 58 low, with heavy overlap: the worst defects were
found by two to four passes from different sides, so the IDs below come in clusters. The status of
every one is in the appendix (§9).

**A. A save wrote the page's old copy over newer work** (the worst class: silent data loss).
The ✎ editor wrote the whole programme as it was at page load, so a cycle published by the pipeline
after the page opened was reverted by the next one-exercise edit (WORK-1, FLOW-2, HARNESS-1), and
after a publish or restore the open file kept showing the old programme while ✎ edited the new one
by position, so an edit could land on a different exercise (WORK-2, FILE-1, LIFE-3, ROSTER-1). The Spine editor
did the same to every field Claude's `/spine` had filled (SPINE-1, critical). ↑ Coaching logs
replaced the server logs with local files, wiping every Debrief (TOOLS-1, ROSTER-4). Publishing a
programme file had no check that the file was that athlete's or that the live one was not newer
(TOOLS-7). **Now:** the editor reads the live row and writes `.eq('updated_at', <read>)`; the Spine
sends only changed fields and refuses a real clash with both values shown; coaching logs are
create-only; a file must be named for the athlete and warns when the live programme is newer.

**B. A failure looked like success, or like an empty table.** With a lapsed sign-in the database
answers a write with "OK, 0 rows changed", and the page said Saved (WORK-3, LIFE-5, SERVER-9). A
failed read of logins, programmes or contacts showed as "nobody has a login", "no programme" (LIFE-4,
TOOLS-9, ROSTER-2). Any table past 1000 rows would be cut short silently (TODAY-12, TOOLS-2, FILE-14). The backup could not tell an empty table from
one it was not allowed to read, and said INCOMPLETE every week for a table it could never read
(TOOLS-3, HARNESS-5, SERVER-2). **Now:** `writeFailed()` on every write, the load banner (`LOAD_ERR`), paged
reads (`selectAll()`), the backup reports what it could not read, and the season-results grant is
fixed.

**C. The page rebuilt itself under the coach.** Every token refresh and every return to the tab
reloaded everything and threw away whatever was being typed: three full loads per page open with
the real library (LIFE-1, FLOW-4, HARNESS-3). Any save redrew the athlete file, Today or the Spine and
lost open days, typed text and place (WORK-8, FILE-9, TODAY-9, BROWSER-3, SPINE-6). **Now:** the page rebuilds
only when the signed-in person changes; typed work survives redraws, and leaving with unsaved Spine
changes asks first.

**D. One question, several answers.** "Needs you" was counted four ways (badge, Today, roster
groups, filter) from drifting lists, and lapsed or ended clients sat in it for ever (ROSTER-6,
FLOW-5, TODAY-8, ROSTER-7, FLOW-6). The readiness pill used a different score and baseline from the
one the athlete's app used to set the day (TWIN-3, TODAY-11). The load ratio divided two or three
weeks as if they were four, so every new athlete showed high load (TODAY-5), and adherence rounded
partial weeks against them (TODAY-7). A sore day's halved sets and skipped optional work were scored
as misses, and exercises renamed on 2026-10-09 read "not logged" (WORK-5, WORK-4). **Now:** one rule (`reasonsOf()`) feeds all four, with *Gone quiet*
for 30+ days; readiness (the pill, the chart and the day card) reads the app's own score and the athlete's own usual; load and adherence are pro-rated; the
compare reads the app's own day plan.

**E. Text that could run as code.** A quote in a signup's name or email, put inside an inline button
handler with HTML escaping only, ran as JavaScript in the dashboard (LIFE-2, FILE-13). **Now:** `jsq()` for
every value in a handler.

**F. The wrong day.** The coach line was filed under the server's UTC date, so between midnight and
03:30 in Tehran it overwrote yesterday's line (TODAY-4, HARNESS-4). "Days since" counted 24-hour
blocks, so before noon yesterday read as "today" (TODAY-10, ROSTER-8, BROWSER-9). **Now:** the page sends its own local day; days are calendar days.

**G. The wrong person or the wrong exercise.** A programme reload could shift the ✎ editor onto a
different exercise at the same position (WORK-2). An email import could file a session on the wrong
athlete, on today's date, twice (FILE-8). After a failed read of the logins, "create missing logins"
would have reset every existing athlete's password (FILE-5). WhatsApp links were built from any digits, so "@sara_1990" opened a stranger's
chat (SPINE-9). **Now:** the editor checks the exercise by name before saving, the import checks the
email's athlete line, a create never resets (athlete-login v5), and links are made only from real
numbers.

**H. Privacy and erasure.** Forget on a coached client deleted their training app's cloud copy
(records, body weight, check-ins) while the box said their history stays (MKT-1). Every backup file
carried unsent plaintext passwords (TOOLS-12, HARNESS-6, FILE-6). The public demo used real athlete
ids and first names (BROWSER-11). Forget is not an erasure and the privacy notice
promises more than any button does (MKT-2, SERVER-5). Any signed-in account could read any athlete's
level through the level helpers (SERVER-8). **Now:** Forget is refused for coached clients, in the
dashboard and on the server (stage45, applied 2026-10-11), backups blank stored passwords, the level
helpers are coach-only, and a full erasure exists for athletes and buyers (stage54, live, §11).

**I. Layout, contrast and phone use.** The rail took four rows on a phone and hid tabs, sub-tabs
and the Exercises editor clipped at 320 px, several greys were below 4.5:1, focus was invisible on
the dark bar, and the editor's ✎ was hover-only (useless on a phone) (FLOW-9, FLOW-10, BROWSER-5,
BROWSER-7, BROWSER-8, BROWSER-12, BROWSER-15, ROSTER-12). **Now:** two
groups on one line plus a scrolling second line, the athlete file's sub-tabs fit, contrast tokens
raised, a visible focus ring, ✎ always visible on touch, 16 px inputs (no zoom on iPhone), the
Spine's Save bar stays on screen.

**J. The manual and the screen disagreed.** COACH_DASHBOARD.md described retired buttons, a
`data/<id>.json` fallback, "guarded RPCs" that were direct writes, and a Forget that kept logs
(LIFE-12, FILE-12, TOOLS-14, ROSTER-14, FLOW-21, TODAY-15, WORK-14).
**Now:** rewritten section by section against the code.

## 4. What changed

| Commit | What |
|---|---|
| a6846a6 | The root fixes: guarded ✎ editor, `selectAll()`, `writeFailed()`, load banner, auth events, `jsq()`, coaching logs create-only, file publish checks, backup paging and password blanking, coach-line day, the one Needs-you rule |
| 6d1a5e2 | Phone layout, contrast and focus, an honest demo (invented people only), login hand-off in place |
| c46df52 | athlete-login v5: a create never resets an existing login; bulk create skips them |
| e7cbc29 | The manual and the harness match the dashboard again |
| c82b104 | The work: a sore day's halved sets and partly done optional work are not misses |
| 2c5475a | The work: readiness follows the day the app set; cycle dates; an honest live snapshot |
| 106c214 | Sign-in with a Farsi keyboard: digits folded to 0-9 in all four apps |
| a6a7d3d | No-login stays visible; long login lists fold; previous-cycle sessions say so |
| 8ffae84 | Forget refreshes the roster; sub-tabs and the editor on phones; quieter work flags |
| 7690d18 | Proof, Library, Affiliates, buyer logins: Forget spares coached clients, the Library can hide |
| c437a44 | Exercises: a save sends only what changed and never undoes Claude's `/spine` work |
| 8a2bf87 | Server half: edited notes re-open, imports really replace, buyer logins report failures |
| 1e975bb | Logins to send marks a stored password the person has already used to sign in |
| 6512744 | Small fixes from the re-check: focus ring, Calls and Library failures say so, labelled fields; athlete-login v6 |
| 83dec62 | Coaching logs keep every earlier text (stage47); Forget is off while programmes have not loaded |
| 5c57288, 7c10d71 ([#302](https://github.com/amirardekanian-crypto/Website/pull/302), merged) | Second session, 1 of 2: notes counted from when they arrived; the email import reads the check-in line (anchored, so an athlete's own note cannot set a verdict); `scripts/check_twins.js` (pre-commit guard 15); fixes from an independent review of the first commit |
| second session, 2 of 2 ([#303](https://github.com/amirardekanian-crypto/Website/pull/303)) | One transaction each for Delete training history and the Spine save (stage48), version history for the Spine (stage49), `scripts/test_spine_sql.sh`. Both stage files were applied to the live project and checked before this merged (§10) |

**Files changed and why:** `coach.html` (all of the above), `program.html`, `habits.html`,
`tennis/app/app.js`, `tennis-testing/app/app.js` (Farsi-keyboard sign-in only), `sw.js` (cache bump
for that), `supabase/functions/*` (login functions), `supabase/stage44-47*.sql` (record of the
programme tables; Forget guard; server half; coaching-log history), `scripts/test_coach_compare.js` and
`scripts/headless/coach/` (tests), `COACH_DASHBOARD.md`, `CLAUDE.md`, `CODEBASE.md`, `SCHEMA.md`,
`supabase/functions/README.md` (docs).

**Database (applied 2026-10-10):** `save_session()` re-opens a note the athlete edits after it was
read, and lets the coach's import really replace a session; `hab_season_results` readable by the
backup; `coach_season_levels()` (coach only), the level helpers revoked from signed-in accounts (the season one
after this version went live, 14:05 UTC);
`exercises` and `qualities` stamp `updated_at` on every update; `coach_login_use()` says which stored
passwords have already been used; `coaching_log_versions` (stage47) keeps every earlier text of a
coaching log; in the second session `coach_delete_training_history()` and `coach_save_spine()` (stage48, coach
only, one transaction each) and `spine_versions` with its three triggers (stage49). **Deployed:** athlete-login v6,
assess-login v3, tps-login v3.

## 5. The structure, and what to do with it next

What was done, without adding features: the nine tabs split into a daily group and an occasional
group; one Needs-you rule with reasons you can read and three roster groups (Needs you · All quiet ·
Gone quiet); Coach tools folded under the roster instead of above it; the athlete file opens on the
screen that matters for that athlete (Proof for a habit-only athlete), and a note opens its day; the
Spine opens on Approved when there are no drafts and has a search; one close grammar for editors.

Proposed, in order, still within "no new features":
1. **Fold Calls into File** once you confirm the weekly call log is retired (FLOW-16): it is a second
   end-of-cycle workflow next to `/cycle-report`.
2. **One hand-off place for a new athlete:** login, message and WhatsApp on the athlete's file only,
   with the Athletes tab listing who is waiting (FLOW-8).
3. **Intake → athlete link** so an application shows on the file it became (FLOW-17, SPINE-11).
4. **Undo as a diff:** version history that says what changed between two versions, not just when
   (FLOW-11).

## 6. Tests

- (Second session: the harness is now 47 scenarios, `test_coach_compare.js` 96 assertions, plus
  `node scripts/check_twins.js` (923 checks) and `sh scripts/test_spine_sql.sh` (82 assertions and two
  two-session tests of the row lock, on a throwaway local Postgres). The 38-scenario list below is the first session's.)
- `node scripts/headless/coach/run.js`: 38 scenarios in a real browser against a stand-in database
  (made-up athletes): every save, delete, login, backup and import path, the auth events, the Spine
  editor (Claude's work survives, a clash is refused, a failed load offers nothing to save, renames,
  unsaved work), WhatsApp links. Before the fixes: 32 failing checks. Now: 0.
- `node scripts/test_coach_compare.js`: 72 assertions (96 after the second session, which added the email import) over the plan-vs-logged compare (renames,
  repeats, unticked sets, sore halving, optional work). All pass.
- `reallib.js`: the real supabase-js 2.117.3: 1 load at page open, 0 when the tab comes back (was 3).
- The athlete app after the merge with main: smoke 27/27, cycle-end 22/22, YouTube 68/68, AA Proof
  boots; every pre-commit guard.
- Demo mode at 1280 and 390 px across all nine tabs and the four athlete screens: no sideways scroll,
  no page errors.
- The database changes were each run inside a test block that rolls back (an athlete's edited note
  re-opens, a same-note re-save does not, the coach's import replaces the log, titles still mint for
  an athlete, a non-coach is refused the levels).

**Not tested:** the live dashboard against the real database (this machine cannot reach it from a
browser); the login functions end to end (deployed, not invoked); iOS Safari and a real phone; the
dashboard with a screen reader beyond the roles and focus order.

## 7. Decisions for you

Where a safe default existed, it was taken and is listed so you can overrule it. The rest wait.

**Taken (say if you want them otherwise):**
- Renaming a Spine entry that live cards use is **refused** in the dashboard and left to `/spine`
  (SPINE-3, FLOW-12), because a rename must move the cards and their history together.
- Backups **leave out** stored passwords (TOOLS-12, HARNESS-6). After a restore, reset the logins.
- ↑ Coaching logs can **only add** logs for athletes who have none (TOOLS-1); the server copy is
  never replaced.
- "Delete all data" is now **"Delete training history"** and says what stays (FILE-7, HARNESS-7).
- Forget is **refused for coached clients** (MKT-1).

**Waiting on you** (all twelve answered on 2026-10-11; the state of each is in §11):
1. ~~**The 13 free Proof signups have had no way into the app since 7 September** (FILE-4, SERVER-7)~~ **Forget them all, remove everything.** (Done 2026-10-11.)
2. ~~**Apply the Forget guard on the server** (stage45).~~ **Apply it.** (Done 2026-10-11: you ran it in the SQL editor, because the tool's confirmation never reaches you.)
3. ~~**Cancelling a quest week takes back the XP already earned** (TODAY-1).~~ **Athletes keep it** (stage55, live).
4. ~~**Stored passwords:** may the server clear one automatically once the person has signed in with it (SERVER-1, MKT-5)?~~ **Yes** (stage51, live).
5. ~~**A full erasure** for a person, and one for buyers (MKT-2, SERVER-5, MKT-16)?~~ **Both** (stage54, live since 2026-10-11).
6. ~~**Testing-app player data is not in the backup** (SERVER-2)~~ **Yes** (stage50, live).
7. ~~**Version history keeps 20 saves per athlete** (WORK-10, FLOW-11, SERVER-12).~~ **The current and the previous cycle** (stage52, live since 2026-10-11).
8. ~~**Sessions from the previous cycle** are labelled and not judged against the new plan (WORK-9).~~ **Just label them, as now.**
9. ~~**Session with no duration** counts as no load (TODAY-6).~~ **Skip it and grey out the ratio** (done).
10. ~~**Commission:** affiliate "uses" count applications, not payments (MKT-11).~~ **Not yet.**
11. ~~**Buyers can read the label you write about them** (MKT-14).~~ **Move it out of their reach** (stage53, live since 2026-10-11).
12. ~~**Is the weekly call log retired?** (FLOW-16, FILE-15)~~ **Retired; Calls folded into File** (done).

## 8. Next steps, ranked

*The list to continue from is §12; this one keeps the order the third session started with.*

1. ~~**Run the SQL pack** (§11): `supabase/PASTE-1-run-in-sql-editor.sql` (stage45, stage52, stage53, stage54), then
   `supabase/one-off/remove-13-free-signups-2026-10-11.sql`.~~ **Done 2026-10-11**: you ran both and §11 records what was
   checked on the live database. The Forget refusal, the full erasure, the coach-only buyer note and the two-cycle version
   history are on, and the 13 locked-out free users are gone.
2. Your word on `Content/PRIVACY-DRAFT-BUYER-ACCOUNTS.md` (course and testing-app accounts in the privacy notices).
3. ~~A server function for "Delete training history" and the Spine save (one transaction each), so a
   half-finished two-table write cannot happen (SERVER-9, SPINE-5).~~ Done in the second session
   (stage48): written, tested on a real Postgres, applied to the live project and checked on 2026-10-10 (§10).
4. The structure items in §5, one at a time, each with its harness scenario.
5. Run the live dashboard once after this deploy and tap through each tab on your phone.
6. When you are sure the 9 October rename is right, drop the rollback copy it left, `backup.onename_2026_10_09`: whole
   progress blobs of 17 athletes and session logs of 9, personal data outside the app that every erasure has to empty
   separately. It contains a `drop`, so it is yours to run in the SQL editor, and only on your word:
   `drop table backup.onename_2026_10_09;`

## 9. Appendix: every finding and where it stands

<!--T9-->191 findings. Fixed 187 · Partly 2 · Open 2 · Your call 0 · Not a bug 0. (*Open* includes the findings you decided on in §12, pile A, that are not built yet.)

| Severity | Fixed | Partly | Open | Your call | Not a bug |
|---|---|---|---|---|---|
| critical | 12 | 0 | 0 | 0 | 0 |
| high | 32 | 0 | 1 | 0 | 0 |
| medium | 86 | 2 | 0 | 0 | 0 |
| low | 57 | 0 | 1 | 0 | 0 |<!--/T9-->

### The work and the ✎ editor (WORK)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| WORK-1 | critical | Inline editor overwrites the whole programme with the page-load copy (lost update of publish_cycle / pipeline / other-tab writes) | Fixed | Saving an exercise edit now reads the live programme, refuses if anyone (the pipeline, another tab, a restore) saved it since the page loaded, and changes only that one exercise in the live copy. |  |
| WORK-2 | critical | After restore / publish-file / failed save the tab shows the old programme but ✎ edits the new one by index — the edit lands on a different exercise | Fixed | After a publish, restore or failed save the athlete file redraws from the new programme, and the ✎ editor checks the exercise name, refusing and reloading if it no longer matches, so an edit can't land on a different exercise. |  |
| WORK-3 | high | Programme save and restore report success when the update matched no row | Fixed | Exercise saves and version restores ask the server for the changed row back and report a failure when nothing changed, instead of saying 'Saved' or 'Restored'. |  |
| WORK-4 | high | Comparison reads the frozen summary text, so exercises renamed on 2026-10-09 read 'not logged' although they were done | Fixed | The work tab now takes exercise names from the session's structured log, which renames keep up to date, so a renamed lift matches its prescription. The same exercise twice in a day keeps its own log on each row. |  |
| WORK-5 | medium | Sets judged against the written count on days the app asked for fewer (sore: halved; red day: optional) | Fixed | On a sore day that halved the sets, exactly half reads 'half the sets today (sore)' and counts as on plan. Optional work done in part reads 'optional today: N of M sets' and is not counted as a miss. |  |
| WORK-6 | medium | Logged-but-unticked exercises count as 'exactly as prescribed' | Fixed | An exercise with a weight or RPE typed but no set ticked now shows '0 of N sets ticked' and no longer counts as exactly as prescribed. |  |
| WORK-7 | medium | Editor writes rx that breaks the contract: duration under Reps, rep ranges, sets silently dropped, numbers turned to strings | Fixed | The editor checks the fields before saving: reps must be one whole number, a time must be a real duration and a distance needs a unit. It also checks sets and RPE (6 to 10), stores numbers as numbers and clears the old label when the dose type changes. |  |
| WORK-8 | medium | Every re-render throws away the work tab's state: open editor with typed values, expanded days, picked session, scroll | Fixed | A redraw no longer resets your place: open days and the chosen session stay for the same athlete, an open editor comes back with what you typed, and routine sign-in refreshes no longer reload the page. |  |
| WORK-9 | medium | Sessions from the previous cycle are judged against the new cycle's plan | Partly | A session trained before the current cycle began now shows 'previous cycle' instead of a verdict, plus a banner saying it is being compared with the current plan. | The rows underneath are still compared against the new cycle's plan. **Decided 2026-10-11 (§7, question 8): just label them, as now.** |
| WORK-10 | low | Version history: UTC times, a misleading 'saved' date, no athlete or time in the confirm, restore by id only, 20-version cap | Fixed | Version history shows times in your own time zone, the restore confirm names the athlete and the time, a version from a different athlete is refused, and since stage52 (applied 2026-10-11; your answer: about two cycles back) it keeps the last 20 saves and everything since the previous cycle began, at most 150. Checked on the live database: the cut-off is read correctly from a programme's cycles and cannot raise on a programme of any shape. Since 2026-10-11 (pile B9) there is a one-tap Undo after a save and a **What this save changed** button on every version (this version against the next, the newest against the programme now). A restore is also written only if the programme has not moved since it was read, so it can no longer wipe a cycle the pipeline published a minute earlier. |  |
| WORK-11 | low | dayTargetC drops the week note that program.html's dayRpe applies (latent drift) | Fixed | Since 2026-10-11 (pile B6): the dashboard's lower-day target also reads the week note, for the week the session fell in (`weekNoteOnC`), exactly as `dayRpe()` does: the lower of the two targets, never under 6, a normal day ignores the note. `check_twins.js` runs both on 897 target vectors and 1,530 cycle-and-day cases; `test_coach_compare.js` has the compare cases. |  |
| WORK-12 | low | 'kg' is appended to free-text loads | Fixed | 'kg' is added after a load only when it is a number, so 'red band' or 'BW+10' are shown exactly as typed. |  |
| WORK-13 | low | The programs table, its version trigger and program_versions exist only in the live database | Fixed | supabase/stage44_programs_record.sql now records the programmes table, the version-history table, their access rules and the history trigger exactly as they are in the live database. |  |
| WORK-14 | low | Docs drift around The work and the editor | Fixed | The manual now has an 'Editing a prescription (✎)' section and a rewritten 'Where the data comes from' section. The two coach.html messages that still talked about data/*.json files now talk about the server programme. |  |

### Page life: load, auth, saves (LIFE)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| LIFE-1 | high | Every auth event re-runs boot()+loadAll()+render(), wiping open editors, typed text, expanded cards and scroll — and a transient error during one of those reloads blanks the whole dashboard | Fixed | The page now rebuilds only when a different account signs in or the coach signs out; hourly token refreshes and coming back to the tab leave open editors, typed text and the scroll position alone. |  |
| LIFE-2 | critical | A contact email is interpolated into an inline onclick as a single-quoted JS string via esc() (which does not JS-escape) — a crafted signup email runs arbitrary JS in the coach's authenticated session | Fixed | Every value placed inside a button's click code now goes through jsq(), which turns it into a real JavaScript string, so a quote in a signup email can no longer run as code; no handler uses the old esc() pattern any more. |  |
| LIFE-3 | critical | After loadPrograms replaces S.programs (publish / restore / failed-save reload), the open athlete file keeps a stale cache, so a prescription edit saves onto the WRONG exercise | Fixed | After a publish, restore or failed save the roster and athlete file are rebuilt from the new programme, and the ✎ editor re-reads the live row and refuses to save if the exercise's name is no longer at that place. |  |
| LIFE-4 | high | loadPrograms / loadLogins / loadLibrary / contact / intake errors are swallowed and excluded from loadAll's error check — producing a wrong roster, 404 file fetches, and a password-RESET trap | Fixed | A failed read of programmes, logins, contacts, intake or the library keeps what was there, shows a 'Not everything loaded' banner with Try again, and switches off login creation while the login list is unknown; the old data/<id>.json fallback is gone and the server's create no longer resets an existing password. |  |
| LIFE-5 | high | When the access token has expired and refresh is failing, writes fall back to the publishable (anon) key, fail RLS silently, and the UI still reports success | Fixed | The writes that matter (exercise edits, restores, mark read, mark sent, deletes, library and affiliate saves, programme import) now ask for the changed row back and say 'Nothing was saved, your sign-in may have lapsed' when the server changed nothing. |  |
| LIFE-6 | medium | A failed save triggers a reload that, if the network is still down, wipes S.programs to 'none' and blocks all further editing until a manual refresh | Fixed | If reloading programmes fails after a failed save, the page keeps the programmes it already had instead of wiping them, and the banner says programmes did not load. |  |
| LIFE-7 | medium | Every post-write refetch collapses expanded day cards and the chosen session comparison on the athlete file | Fixed | A redraw of the same athlete after a save or refresh keeps the day cards that were open and the session being compared; only opening a different athlete starts fresh. |  |
| LIFE-8 | medium | Switching views via the rail keeps the previous scroll position, landing the coach mid-page on shorter views | Fixed | Moving to a different tab or athlete screen now starts at the top of the page, while a redraw of the same screen keeps its place. |  |
| LIFE-9 | medium | supabase-js is loaded unpinned (@2) from a CDN with no onerror fallback, so a bad or blocked build gives a blank page with neither gate nor app | Fixed | The sign-in library is pinned to the tested version 2.117.3, and if it fails to load the page says the library did not load and to check the connection, instead of going blank. |  |
| LIFE-10 | low | A malformed athlete hash throws an uncaught URI error and aborts render; empty/odd sub-tab hashes are handled awkwardly | Fixed | A broken athlete link no longer crashes the page, and a link with an unknown screen name opens that athlete's file. |  |
| LIFE-11 | low | The empty #toast pill seen floating mid-page is a full-page-screenshot artifact, not visible to real users | Fixed | The idle toast is now hidden outright (not just moved below the screen), so it no longer shows half on screen with a long message or in full-page screenshots. |  |
| LIFE-12 | low | COACH_DASHBOARD.md is stale: it says 'six tabs' (there are nine) and lists data/<id>.json as a live source | Fixed | The dashboard manual now describes nine tabs in two groups and says data/<id>.json is no longer read at all. |  |

### Today (TODAY)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| TODAY-1 | high | 'Cancel this run' says paid quests keep their XP; cancelling actually takes that XP back from every athlete | Fixed | The button is now **End this run today** (stage55, applied and checked on the live database 2026-10-11). It keeps the run with an end day: the quests stop being offered from tomorrow, a quest completed by then keeps paying on the board and in the app, one not completed never pays. The server's scorer and the phone's `runEndKey()` read the same `end`; both are tested, and the live function was compared with the patched one on all 50 athletes in four windows (no difference when no run has an end). Taking a run's XP back is still possible from the SQL editor (`clear_quests`), on purpose. |  |
| TODAY-2 | high | Note backlog is defined and cleared by training date, not by what the coach saw: Clear marks unseen notes read, and late-synced notes skip 'Waiting on you' | Fixed | Clear older notes marks as read only the notes the row counted, matched one by one, and the page updates without downloading everything again. A note's age is now counted from the day it arrived (the row's `updated_at`), not the day the athlete trained, and the unread list is newest arrival first: a note synced late about an old session is waiting for you instead of going straight to older notes. (2026-10-10, second session) |  |
| TODAY-3 | medium | An athlete's note added or changed after Amir marked the session read never returns to 'Waiting on you' | Fixed | Since stage46 (applied), when an athlete adds or edits their session note after you marked it read, the session comes back to Needs you. Since 2026-10-11 (pile B8, stage58 applied) `save_session()` brings a session back to *needs you* when the exercise notes of the new save are not empty and differ from the old row's, as it does for the day note: from the structured log, else the summary text. Taking a note away, a weight edit and the coach's own save do not. Rehearsed on the live database in a rolled-back transaction (the old function left 3 of the 10 steps read: the bug; the new one passes all 10). A `Note:` line with nothing after it no longer counts as a note to read. |  |
| TODAY-4 | medium | Coach line is filed on the server's UTC day but read on the browser's local day; the dashboard assumes the coach's day equals the athlete's day | Fixed | Your line to the crew is now saved and read under your own date, so after midnight it no longer overwrites yesterday's line or shows the wrong one in the box. Since 2026-10-11 (pile B8) a line filed under tomorrow's date (an athlete whose clock is ahead of yours) is headed *Tomorrow, their time* instead of a bare date; `today-small-truths` pins it. |  |
| TODAY-5 | high | ACWR divides chronic load by 4 weeks even when only 2–3 weeks exist: every new athlete shows a false 'High load' or 'Climbing' spike in weeks 3–4 | Fixed | The load ratio now averages over the weeks of history the athlete actually has. A new athlete in weeks 3 and 4 no longer shows a false High load or Climbing. |  |
| TODAY-6 | medium | Sessions with no duration or RPE count as zero load, so ACWR and the weekly bars swing with logging gaps and nothing says so | Fixed | A session in the last four weeks with no duration or RPE is left out, and while any exist the ratio is not shown: the pill and the card say *not enough data* and how many sessions are missing; the bars still use the sessions that have a load. It comes back when they are filled in or are older than four weeks (Amir, 2026-10-11: skip and grey out). |  |
| TODAY-7 | medium | Adherence rounds partial weeks up: a new athlete is red after their first session, and a perfectly adherent athlete reads 67–78% in their first weeks | Fixed | Adherence now counts only the days since the athlete started (up to four weeks) and stops at 100%, so a new athlete who trains as planned reads 100%, not red. |  |
| TODAY-8 | medium | Four 'needs attention' numbers count four different things from two drifting trigger lists | Fixed | Today, the roster's reasons, its Needs you group and its sort now all follow one rule. Needs you counts people, the counter is labelled Notes to read, the demo and your own account are left out, and anyone with no activity for 30 days is folded into Gone quiet. The cut-offs (30 days, notes vs people) were set without asking you and are easy to change. |  |
| TODAY-9 | medium | Every render() rebuilds the Today view: an unsent coach line and ticked quest boxes are wiped, including by the automatic levels repaint after boot | Fixed | A line you have typed but not posted, and the quests you have ticked, now stay when the page redraws, including when the Proof levels arrive after opening. |  |
| TODAY-10 | low | Date-only values run through timestamp maths: before noon, yesterday reads 'today' and the 'no session for N days' flag is one day short | Fixed | Days are now counted by calendar date, so before noon yesterday's session no longer reads 'today' and 'no session for N days' is no longer one day short. |  |
| TODAY-11 | medium | Readiness card uses a different 'usual' from the athlete app's REC-2 check, so it can contradict the day level shown on The work | Fixed | The Readiness number on an athlete's work tab now shows the verdict their app gave that day (short, lower or normal day, against their usual score). Since 2026-10-11 (pile B6) the Readiness chart plots the same measure: the check-in score the app stores (sleep, energy, stress and how ready they feel, soreness left out) against their usual (the mean of their last ten earlier scores, once there are five), with a dashed line at their usual and none while they have fewer than five; a check-in from before the verdict gets both worked out the same way, and the fallback pill never shows a made-up usual. The day card's number is the score too, and two check-ins on one day are told apart by when they were answered, so the pill, the chart and the card name the same one. `readiness-chart` pins the three screens (8 of its 12 checks fail on the old code); `test_coach_compare.js` section 14 has 16 cases for the series. |  |
| TODAY-12 | high | session_history is loaded unpaged with select('*'): Today's numbers will silently truncate at the API row cap, and every boot or refetch pulls about 790 KB | Fixed | The list is read in pages of 1000 in key order, and since 2026-10-11 (pile B1) it is read light: every session's numbers and nothing else, no `summary` and no `log` (78% of the bytes: about 930 kB of JSON became about 220 kB for 502 sessions), plus the text of the unread sessions that contain "Note:" (an exercise-only note lives inside the text and is what puts someone in Needs you; 9 sessions, 13 kB today). An athlete's text and log are read when their file opens, once, and again only after the list was reloaded. If that read fails the work tab says so with Try again; it never reads as days nobody logged. `hist-light-boot`, `hist-athlete-open` and `hist-heavy-fails` pin it (8 checks fail on the old code). | |
| TODAY-13 | low | Refresh never reloads Proof levels, and a failed refetch after a write is silent | Fixed | The ↻ Refresh button now loads the Proof levels again (they used to vanish until a full reload). Since 2026-10-11 (pile B8) every reload after a save reports its failure: *Saved, but the crew wall (<reason>) could not be reloaded, so what you see for it may be out of date. Tap ↻ Refresh*, naming each slice that failed (the wall, quest rules, Proof contacts, intake, affiliate codes, session list, progress, leaderboard names); programmes still report through the banner. `refetch-failures` pins it. |  |
| TODAY-14 | low | The dashboard's live quest run differs from the app's when runs overlap or are scheduled ahead | Fixed | Since 2026-10-11 (pile B8) the dashboard's `questRunEnd()` / `activeQuestRun()` are the twins of the app's: the latest-starting run that covers today, its seventh day clipped the day before the next run starts, or the day you ended it, and the panel says when the next run takes over. `check_twins.js` runs both on 12 run lists and 9 days (279 checks); `test_check_twins.js` breaks the clipping, the pick, the early end and the run filter on purpose; `quest-run-window` pins the screen (3 of its 7 checks fail on the old code). |  |
| TODAY-15 | low | Copy and docs disagree with the code on the Today tab | Fixed | The quest picker says 'Pick 1–4 quests', the start confirm names the quests by title, and the manual is up to date. Since 2026-10-11 (pile B8) the line-to-the-crew box says that quotes, < > and backslashes are removed when you post and line breaks become spaces (what `hab_clean_note()` does). |  |

### The athlete file (FILE)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| FILE-1 | critical | Athlete file keeps showing pre-write data after restore/publish/call-log delete; the ✎ editor then writes to a different exercise than the row clicked | Fixed | After a restore, a programme-file publish, a failed or refused save, or a deleted call log, the athlete file now rebuilds from the new data, and the ✎ editor refuses to save if the exercise on that line is not the one you clicked. |  |
| FILE-2 | medium | renderDetail has no request guard: a slow load for athlete A paints over athlete B (or over Today) after the coach has moved on | Fixed | Opening an athlete now gets a ticket: if you have already moved to someone else or left the file by the time their data arrives, the late answer is thrown away instead of being drawn over the screen you are on. |  |
| FILE-3 | high | Sessions whose only note is an exercise note count as 'waiting' but have no Mark read button anywhere in the file | Fixed | Any session the counters treat as waiting, including one whose only note is on an exercise, now shows that note with a Mark read button on its day card. |  |
| FILE-4 | high | Every free (Proof) athlete has been locked out since the link retirement, and the dashboard tells the coach they still have a secret link | Fixed | Every athlete with a programme but no login (free or coached) shows 'no login — cannot open the app' on the roster, even once they have gone quiet, and their File tab no longer says they have a secret link. Your answer (2026-10-11) was to forget the 13 free signups and remove everything; it was done the same day (programmes 52 → 39, none free). |  |
| FILE-5 | high | Login tools trust S.logins blindly: a failed identities read makes the bulk tool silently RESET every existing athlete's password | Fixed | If the login list fails to load, the dashboard says so, hides the bulk button and refuses to create logins, and the server now never resets an existing login on a create: bulk runs skip those athletes and name them. |  |
| FILE-6 | high | Plaintext athlete passwords stay in athlete_identities for weeks and are copied into every weekly backup | Fixed | Backups now blank every stored, unsent password (athlete, course and testing-app logins), an athlete's File tab shows an unsent password with Copy, WhatsApp and Mark sent, and since stage51 (2026-10-11, your yes) the database clears a stored password the moment the person signs in with it. Your answer (2026-10-11): an unused first password does not expire; Mark sent and the person's first sign-in already clear it. |  |
| FILE-7 | high | 'Delete all data' deletes only sessions and the progress snapshot; programme, login, coaching log, calls, contacts and more survive | Fixed | The button is now 'Delete training history' and lists exactly what goes and what stays. **Erase completely…** under it removes the whole person in one step (stage54, live and checked on the real database 2026-10-11): every table that holds their id (the rollback copy in the `backup` schema included), the login and the sign-in account, with a dry run first, the id typed to confirm, the intake forms you pick, and a receipt that keeps only a hash and counts. |  |
| FILE-8 | high | Email backfill can file a session on the wrong athlete, on today's date, twice, and drops what the app records | Fixed | Adding a past session from an email now warns when the email names a different athlete, has no date filled in for you (you must pick one), warns before replacing or doubling a session for that day, and reads the athlete's whole note. It also reads the email's check-in line (lower day, short day, sore, trained as written) and stores it the way the app does, so the imported session is judged on the day's real targets and counts toward a run of low days; Claude's Gmail import stores the same keys. (2026-10-10, second session) |  |
| FILE-9 | medium | Every render repaints the whole athlete file: typed passwords/emails are wiped, open sections close, the card being read collapses | Fixed | Redrawing the same athlete no longer flashes a spinner, the day cards you had open and the session you picked stay put, and Mark read updates the page without reloading everything. Since 2026-10-11 (pile B4) what you typed or opened in the tab survives every redraw: the password box (with the cursor in it), an email pasted under Add past session with its date and preview, Version history, the Coaching log, a day's raw log and the live snapshot. It holds for the same athlete's same screen only (another athlete or screen starts clean) and a saved past session clears its own box. `file-redraw-keeps-work` (16 checks; 10 fail on the old code) pins it. |  |
| FILE-10 | medium | Call logs are cached once per page load: a failed read shows 'No call logs yet' and ↻ Refresh never refetches | Fixed | Call logs are kept only when they really loaded; if they fail, the Calls tab itself says they did not load and ↻ Refresh tries again. |  |
| FILE-11 | medium | Deleting a session raises a false 'session not synced' warning and can be undone by the athlete's phone | Fixed | Nothing has changed: deleting a session still removes it outright. Since 2026-10-11 (pile A6, stage60 applied) the Raw log's button is Hide this log: `session_history.hidden_at`, one coach-only `coach_hide_session()`, an Undo bar, and Hidden sessions in the athlete's File with Restore and, for a real erasure request, Delete for good (a hidden row only). The phone's `save_session()` leaves a hidden session hidden however often it re-sends it; only a coach's save brings it back. `get_my_history()`, `get_workout_days()`, the dashboard and the pipeline's queries leave hidden sessions out. Rehearsed on the live database in a rolled-back transaction (19 checks); `session-hide-undo` and `session-hide-add-over` pin the page. |  |
| FILE-12 | low | Manual and in-app copy still describe retired secret links and data files | Fixed | The File and Work tabs no longer mention secret links or data files. The sign-in address now matches the athlete's tier, and the manual describes logins, Logins to send and what 'Delete training history' removes. |  |
| FILE-13 | low | HTML escaping used inside JS-string onclick handlers (contact email) | Fixed | Values inside button actions (contact emails and the rest) are now passed as proper quoted text, so a quote in a signup's email can no longer break out and run as code. |  |
| FILE-14 | medium | session_history is loaded with an unpaged select; past 1000 rows the athlete file silently loses sessions | Fixed | Session history is now read in pages of 1000 until every row is in, both on load and after a save, so no athlete loses sessions once the table passes 1000 rows. |  |
| FILE-15 | low | Copy cycle prompt: defaults to the oldest cycle, guesses the session window, and loses the text if the clipboard fails | Fixed | Removed with the Calls tab (FLOW-16): `/cycle-report` is the end-of-cycle review. |  |
| FILE-16 | low | athlete-login revoke reports success even if the auth user was not deleted | Fixed | Remove login reports an error when the account could not be deleted or the login list could not be read, and says when there was no login to remove. |  |

### Coach tools: backup, publish, logs (TOOLS)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| TOOLS-1 | critical | '↑ Coaching logs' replaces server logs with local files: it wipes every Debrief and publish_cycle splice, with no history and no staleness check | Fixed | The button is now '↑ Add coaching logs' and only creates a log for an athlete who has none, never replacing one; and every earlier text of a coaching log is now kept on the server (stage47), so a bad overwrite from anywhere can be put back. |  |
| TOOLS-2 | high | Unpaged reads silently cap at PostgREST max_rows: session_history (497 rows, about 135/month) passes 1000 around Feb 2027 and the dashboard will drop sessions without an error | Fixed | Session history, progress, programmes, the Spine tables and the backup are now read page by page in a fixed order, so nothing is silently cut off at 1,000 rows. |  |
| TOOLS-3 | high | The backup is not complete, and it cannot tell an empty table from a hidden or failed one: tables are missing, an RLS-empty table reads as 0, partial files look like full ones, and paging is unordered | Fixed | The backup now reads every table page by page in a fixed order, checks it got as many rows as the server says exist, and records any table it could not read inside the file and in the INCOMPLETE warning; season results are now readable, and the testing app's players, notes and results are in it since stage50. Since 2026-10-11 (pile B2) a backup that could not read a table is saved as `aa-backup-INCOMPLETE-<date>.json` with `complete: false` and `could_not_read` inside, the alert opens with INCOMPLETE and says it is not a restore point, it does not count as the weekly backup (Today keeps asking and says the last try was incomplete), and `scripts/prune_backups.py` lists it apart, never counts it as the newest backup and removes it on the same 12-week rule (`scripts/test_prune_backups.py`, 14 checks; 7 fail on the old script). |  |
| TOOLS-4 | high | No restore path: the backup has no schema, FK-bound login tables cannot be re-inserted, and the DDL for the core tables is not in the repo | Open | The recipe for the programme and version-history tables is now written down in the repo (stage44). | Decided (2026-10-11): yes. A full schema snapshot, a restore script and one rehearsal on a throwaway Postgres. B3 (the live definitions the repo lacked) is done. **Blocked on 2026-10-11:** this computer has no Postgres, Docker or Supabase CLI and the project is on the free plan (no database branch), so the rehearsal needs your OK to install PGlite or to use a cloud session (§12, A3). Nothing else is built yet. |
| TOOLS-5 | high | '+ Publish article' refuses every article the /article skill writes: it matches category against the category id, but articles carry the display name | Fixed | + Publish article now accepts the category by its name (for example 'Pre-Competition') as well as its id, so articles from the /article skill publish onto the right shelf. |  |
| TOOLS-6 | medium | Library publish has no guard against the wrong file: a .fa.json carrying id+category overwrites the English article, a workout can be published as an article, unpublished items get republished, and a recategorised item is duplicated | Fixed | The Library publish now refuses a Farsi translation file and a workout picked as an article (or the reverse), so the English article can no longer be overwritten by its Farsi copy. Since 2026-10-11 (pile B11) the publish confirm says for each file whether it is new, replaces the live one, or replaces a hidden one (which stays hidden: the row is written with `published: false`), and a file whose id is already on another shelf is refused with the shelf's name instead of being published twice. `library-publish-guards` pins all three. |  |
| TOOLS-7 | high | '↑ Publish programme file' is a blind whole-programme overwrite: no filename-to-athlete check, no staleness or diff, and it bypasses publish_cycle()'s guarantees | Fixed | Publish programme file now refuses a file whose name does not match the athlete inside it, shows the live programme against the file (cycle, days, when and by whom saved) and warns in capitals when the live one is newer. Removed (pile A4, 2026-10-11; you said you never use it): the button and its function are gone from coach.html, so no route is left that replaces a whole live programme outside the pipeline. A new athlete and every new cycle go up through `publish_cycle()`. `no-program-file-button` guards it. |  |
| TOOLS-8 | medium | After publishing or importing a programme the store is not re-assembled: a new athlete is missing from the roster, and the athlete file keeps showing the old programme | Fixed | After publishing or restoring a programme the roster and the open athlete file are rebuilt from the new copy, so a new athlete appears straight away and the file shows the programme you just put up. |  |
| TOOLS-9 | medium | Load errors for programmes, library, coaching logs and logins are swallowed: the roster shows every athlete with no programme, the Library looks empty, and publish blames a missing category | Fixed | A failed load of programmes, logins, coaching logs or the library shows a 'Not everything loaded' banner, and + Publish refuses while the library is not loaded. |  |
| TOOLS-10 | medium | The legacy data/*.json fallback and 'Move programmes into the database' are dead code that can still fire: on a programs read error from a local server with the gitignored data/ copy, one click would overwrite live programmes with stale files | Fixed | The old local-file fallback and the 'Move programmes into the database' button are gone, and the File tab says 'create one below' instead of pointing at secret links. |  |
| TOOLS-11 | medium | 'View their app / View their Proof' shows the athlete's programme but none of their logged progress, while the File tab promises 'their real data'; it also opens real athletes from ?demo=1 | Fixed | From the demo, 'View their app' now opens the public demo programme instead of a real athlete, and the demo uses made-up people. Since 2026-10-11 (pile A7) the File tab says the preview shows the programme only (what they have logged is under The work and Proof), the bar program.html draws over a preview says "without their logged work" instead of "exactly as they see it" (sw.js aap-v106, so the coach's browser does not keep the old text), and the comment that said the preview "loads their real data" is corrected (it skips the pull of their saved progress). `file-preview-wording` pins all three and the two buttons' addresses. |  |
| TOOLS-12 | medium | Every backup file carries 13 plaintext login passwords (athlete_identities and tps_accounts initial_password), kept on two machines for 12 weeks | Fixed | Every backup now blanks the stored login passwords for athletes, course buyers and testing-app buyers before the file is saved. |  |
| TOOLS-13 | low | Unpublishing a Library item has no button, and unpublished items are invisible in coach.html | Fixed | The Library tab lists every item with a Hide or Publish button, and hidden items sit in a folded 'Hidden' group. |  |
| TOOLS-14 | low | Docs and copy drift around the tools: the manual describes retired controls and data sources, and the skills name a tab that does not exist | Fixed | The manual has the nine tabs, the Coach tools and what each overwrites; the backup file and the manual both say it is data only, what a restore needs, and to keep 12 files with the prune script. |  |

### Athletes (roster) (ROSTER)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| ROSTER-1 | critical | S.ath is only rebuilt by refetch('hist')/loadAll: after a programme publish, restore or failed save the athlete file shows the old programme and an inline edit lands on a different exercise | Fixed | After a publish, a restore or a failed save, the roster and the athlete file rebuild from the live programme. The ✎ editor checks the exercise name and refuses to save if the exercise has moved or the programme changed since the page loaded. |  |
| ROSTER-2 | high | Read errors are swallowed for programs, athlete_identities and contact_list, so the roster silently mislabels everyone and offers a bulk 'Create N missing logins' that resets existing passwords | Fixed | If programmes, logins or contacts fail to load, a banner now names them, and the Create missing logins button is hidden while the login list is unknown. The login service (v5, deployed) skips anyone who already has a login and never resets their password. |  |
| ROSTER-3 | high | All 13 free-tier athletes have no login (locked out since the 2026-09-07 cutover) and the roster gives no sign of it | Fixed | Every athlete with a programme and no login shows 'no login — cannot open the app' on their row and in Needs you, linked to their File tab, even after they have gone quiet. The 13 free signups that had no login were removed on 2026-10-11 (your answer to §7 question 1): no free programme is left. Five programmes without a login remain (the public demo, a sample athlete and three others); a real athlete among them shows that line. |  |
| ROSTER-4 | high | '↑ Coaching logs' on the Athletes tab overwrites server coaching logs wholesale from local .md files, and those logs have no version history | Fixed | Add coaching logs is folded under Coach tools and only adds a log for an athlete who has none; every earlier text of a log is kept on the server (stage47). |  |
| ROSTER-5 | high | 10 initial passwords sit in plaintext in athlete_identities (4 already in use, 9 older than 14 days), shown under 'Logins to send' and copied into every backup | Fixed | The weekly backup blanks every unsent password (athletes, course and testing-app buyers), the athlete's File tab shows their unsent password with Copy, WhatsApp and Mark sent, and since stage51 (2026-10-11, your yes) the database clears a stored password the moment the person signs in with it. Checked on the live database after the pack: no athlete, course or testing-app login has a password stored today. |  |
| ROSTER-6 | medium | The 'needs you' rules exist three times and have drifted: roster reasons, roster sort score and the Today panel use different triggers | Fixed | Who needs you is now one rule shared by Today, the roster's reason chips, its Needs you group and filter, and its sort. New signups, unsynced sessions and upgrade leads now show in both places. |  |
| ROSTER-7 | medium | 'Needs you' holds 36 of 49 people: no lapsed or former state, the marketing demo row is counted, and coached athletes who tried Proof once are 'silent on Proof' forever | Fixed | Needs you no longer counts the demo or your own account. Anyone with no activity for 30 days, or whose cycle ended more than 14 days ago, is folded into Gone quiet. Coached athletes are no longer flagged as 'silent on Proof'. Since 2026-10-11 (pile A10, stage63 applied) an athlete is active, paused or former: the File's Status panel (three buttons, optional note) writes `athlete_status` through `coach_set_status()`; a paused athlete is out of Needs you and Gone quiet but still counted (Paused group and chip), a former one is out of Everyone and every tier chip (Former chip) with everything they logged kept, and a note they send still reaches Needs you. The public demo and the dashboard's own identity are in no total and not on the list; the footer says so and links the demo. Rehearsed on the live database in a rolled-back transaction (18 checks incl. RLS and an erasure); `status-paused-former` and `roster-demo-out` pin it. |  |
| ROSTER-8 | medium | Date-only values are aged with 'T12:00:00' against the wall clock, so before noon a session from yesterday reads 'last today' and idle counts are one day short | Fixed | Dates are now aged in calendar days everywhere, so a session from yesterday reads 'yesterday' before noon and idle counts are right. |  |
| ROSTER-9 | medium | The 'session not synced' warning shows only on the roster, cannot be dismissed, and the coach's own Delete session creates a permanent false one | Fixed | An unsynced session now shows in Needs you on Today as well as on the roster, ranked high, and opens the athlete's work tab. Since 2026-10-11 (pile A6) hiding a session no longer leaves a warning that can never clear: the dashboard counts a hidden session as present when it compares the report marks in the athlete's progress with the session list (`session-hide-no-false-warning`, mutation-tested). A report mark with no session at all still warns, as it should. |  |
| ROSTER-10 | medium | Roster ACWR pill: 'low load' and 'climbing' look identical, and idle athletes get an 'ACWR 0' pill that repeats the idle flag | Fixed | The roster's load pill now appears only for a real spike and says it in words (e.g. 'load 1.6 · high load'). Idle athletes no longer get 'ACWR 0'. |  |
| ROSTER-11 | medium | Roster controls: sort resets on any filter tap or refresh, filter chips don't partition the list, empty filter says 'No one matches “”', search is untrimmed and can't find board/contact names | Fixed | The sort and search survive a refresh and a filter tap. Search trims and normalises Persian ی/ک and reads board names, contact name, email and WhatsApp digits. An empty filter says 'Nobody in … right now'. Since 2026-10-11 (pile B10) a person with no programme and no habits has a **No file** chip, so Coached + Free + Proof only + No file add up to Everyone, and a chip with nobody in it is not drawn (Everyone, Needs you and the active chip always are). `roster-tier-chips` pins it. |  |
| ROSTER-12 | medium | At phone width the admin tools push the roster below the fold: first athlete starts at y≈495 px at 360 px and y≈535 px at 320 px | Fixed | Publish programme file, Add coaching logs and Backup are folded into one Coach tools line, and Logins to send folds by itself when more than three are waiting. Since 2026-10-11 (pile A10) Coach tools, Logins to send and Create missing logins sit behind one ⚙ Tools button (a badge counts the logins waiting), so the first athlete starts above y = 400 at 360 px instead of about 495. `tools-button` pins it. |  |
| ROSTER-13 | low | Legacy file-era code still runs: a data/<id>.json fetch for every id without a programme row, the 'Move N programmes' importer, dead normalizeAthleteId/S.keys and 'secret link' copy | Fixed | The data/<id>.json fallback and the one-time 'Move programmes' importer are gone, and the File tab and work tab say 'No login yet' and 'No training programme published yet'. Since 2026-10-11 (pile B11) `normalizeAthleteId`, `S.keys` and the "secure links" heading are gone (nothing read them). |  |
| ROSTER-14 | low | COACH_DASHBOARD.md §4 describes a roster that no longer exists | Fixed | Section 4 of the manual matches the roster: groups, chips, search, load pill, reasons, Coach tools then Logins to send (folded above three). |  |
| ROSTER-15 | low | Small roster and athlete-header inconsistencies (badge counts, labels, reason tone, background re-render) | Fixed | Badges count only recent notes; 'Ready to upgrade' has its own green flag; counts of the last 7 days now say 'last 7 days'. Since 2026-10-11 (pile B10) the Proof levels are drawn in slots and filled in place when they arrive: the page already on screen is not replaced a second time (the rows are the same elements). `levels-in-place` pins it (it fails on the old page). |  |

### Workflows end to end (FLOW)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| FLOW-1 | critical | Programme and contact writes leave the roster and the open athlete file stale; an edit after '↑ Publish programme file' lands on the wrong exercise | Fixed | After a publish, a restore or a failed save, the roster and the open athlete file are rebuilt from the new programme. The ✎ editor names the exercise it is editing, and it refuses to open or save if that exercise is no longer at the same place. |  |
| FLOW-2 | critical | An inline prescription edit writes the whole in-memory programme with no freshness check, and silently reverts a cycle the pipeline published meanwhile | Fixed | A ✎ save first reads the live programme and changes only that one exercise in it. If the programme changed on the server after the page loaded (for example a new cycle from the pipeline), it saves nothing and tells you to redo the edit. |  |
| FLOW-3 | high | A note written only against an exercise counts as 'waiting on you' but has no Mark read button anywhere (8 of today's 12) | Fixed | A note written only against an exercise now gets the same note box and Mark read button as a day note, so every note that counts as waiting can be cleared. |  |
| FLOW-4 | high | Every auth event re-runs the whole boot: three full loads at open, a full reload on every return to the tab, and background renders wipe whatever the coach is typing | Fixed | The page loads once when it opens and no longer reloads when you come back to the tab or when your sign-in refreshes. Text you have typed (the coach line, ✎ edits, quest picks) survives a redraw, and the sign-in library is pinned to one tested version. |  |
| FLOW-5 | high | 'Needs you' has five definitions, and Today shows the narrowest: notes fill the 10-row cap, while sync gaps, upgrade leads, new applications and cycle ends never appear | Fixed | One rule now decides who needs you, and Today, the roster's reasons, its Needs you group, filter and sort all use it. Today shows one row per person with all their reasons, a 'Show all' button instead of a hard cap, and a line for new applications. |  |
| FLOW-6 | high | Cycle end and renewal are invisible to the coach: endDate is never read, and lapsed clients stay in Needs you as 'No session for N days' for ever | Fixed | The dashboard now reads each cycle's end date. A client shows 'cycle ends in N days' in the last week and 'cycle ended N days ago, renew?' for 14 days after the end, then moves to Gone quiet instead of sitting under 'no session for N days' for ever. The Work tab shows the cycle's dates and the days left. The 14 days is a default you can change. |  |
| FLOW-7 | medium | Reading notes loses your place: a Today row opens the athlete with the note's day closed, and Mark read collapses the open cards | Fixed | Tapping a note on Today opens the athlete on that note's day, with the right session picked. Mark read now updates the page in place, so the cards you had open stay open. Since 2026-10-11 (pile B10) a note's row in Needs you has a **Mark read** button beside *open →*: it marks the one quoted session and shows the next, without opening the athlete. `today-mark-read` pins it. |  |
| FLOW-8 | medium | Login hand-off is spread over three places and ends in a collapsed panel, with no WhatsApp number for most coached athletes; 10 passwords are still waiting | Fixed | An unsent password now shows on the athlete's own File tab with Copy message, Mark sent and a WhatsApp button (when a number is known), instead of an alert that disappears. 'Logins to send' opens by itself while three or fewer are waiting. Since 2026-10-11 (pile A9, stage62 applied) every File has a WhatsApp number box (Save number, Remove) and the header under the name shows a WhatsApp button and the number, or "add a WhatsApp number" for a coached athlete with none; a new login's Copy message gets its WhatsApp button once the number is there. `coach_set_whatsapp()` keeps it on the athlete's contact record (made only when there is a number to keep, `source 'coach'`); that record is never counted as a signup (funnel, new-signup reason, last seen, Proof tab). Rehearsed on the live database in a rolled-back transaction (13 checks); `whatsapp-number` pins it, mutation-tested. |  |
| FLOW-9 | medium | The prescription ✎ is invisible and tiny on a phone (hover-only, 18×24 px) | Fixed | On a phone or tablet the ✎ pencil is always visible and bigger, and the editor's fields are large enough that the iPhone does not zoom in. |  |
| FLOW-10 | medium | On a phone, six of the nine tabs and Refresh sit off-screen, and Today's Needs you starts about 1.6 screens down, below the hero and the whole wall | Fixed | On a phone the four daily tabs fit on one row and the other five scroll on a second row, Refresh sits in the top bar, and on Today Needs you comes before the wall. |  |
| FLOW-11 | medium | Undo means restoring the whole programme from a collapsed list in another tab, with no description of what changed and only 20 versions kept | Fixed | Since 2026-10-11 (pile B9) a ✎ save offers a one-tap **Undo** in a bar that says in words what the save changed (*Ava Example: Day 1 · Goblet Squat: sets 4 → 5*). Undo puts the pre-save programme back only if the row still carries the stamp the save left, and refuses (changing nothing) if anything wrote it since. A restore gets the same bar. Every line in Version history has **What this save changed**, a short list from `programDiff()` (27 cases in `test_coach_compare.js`). `undo-after-save` and `version-diff` pin it; both fail on the old page. |  |
| FLOW-12 | medium | The Spine editor lets the coach rename an entry with no warning, which silently detaches every card that matches it by name (672 of 827 slots have no exId) | Fixed | Renaming a Spine entry that is on live cards is now refused, with a message naming the programmes that use it and asking you to have Claude's /spine do the rename. A name that belongs to another entry is refused too. Refusing was the default choice, so say if you want a warning instead. |  |
| FLOW-13 | medium | The Exercises tab opens on an empty Drafts list (0) with all 319 entries behind a button, no search, and no way to start an entry | Fixed | The Exercises tab opens on Approved when there are no drafts, has a search box (name, other names, pattern, equipment, id), and keeps the quality panels folded when nothing needs you. Since 2026-10-11 (pile B10) every name in *Not in the Spine yet* has **Copy /spine add** and the list has **Copy /spine add for all N** (the command, then one `- name` per line). `spine-copy-add` pins it. |  |
| FLOW-14 | medium | Free, Proof and new-signup athletes open on 'The work' with empty training metrics and stale copy; every Needs you row lands on The work whatever the reason | Fixed | A habit-only athlete (free or Proof) opens on their Proof screen. Rows about Proof silence, a new signup or an upgrade lead open Proof, and an empty Work tab now explains why it is empty instead of mentioning old data files. |  |
| FLOW-15 | medium | Retired migration tools sit on the daily roster screen; '↑ Coaching logs' replaces server logs that publish_cycle now writes | Fixed | The 'Move programmes into the database' button and the old data-file fallback are gone. The coaching-log upload can now only add a log for an athlete who has none, never replace one, and it sits in the folded Coach tools line. It was kept add-only as the default; say if you want it removed. |  |
| FLOW-16 | medium | Calls and 'Copy cycle prompt' are a second, mostly unused end-of-cycle workflow that leaves the app and returns to Today | Fixed | Retired (Amir, 2026-10-11: one call log ever, 12 July). The Calls tab, + New call log and Copy cycle prompt are gone; old call logs are read and deleted in the athlete's File under *Old call logs*; an old `/calls` link opens the athlete. `call-log.html` and `CALL_LOG.md` still exist but nothing links to them. |  |
| FLOW-17 | medium | Intake is an island: new leads never reach Today, a lead cannot be linked to the athlete it became, and 24 of 64 are still 'new' | Fixed | Today now shows 'N new applications' with a link to Intake. Since 2026-10-11 (pile A8, stage61 applied) an application records what became of it: each card has What happened (Became a client, Joined the free tracker, Not a fit, No reply, Said no, Something else) and, for the first two, Which athlete (the likely one pre-selected, never saved for you). `set_intake_outcome()` marks a new application handled, refuses a client with no athlete, and `hab_intake.athlete_id` / `outcome` / `linked_at` hold it. The athlete's File says Came from the application. `coach_erase_person()` was patched in place: a linked application is offered first and ticked, and one left unticked keeps its answers and loses only the link (rehearsed on the live database, including a real erasure inside a rolled-back transaction). `intake-outcome` and `erase-linked-form` pin it. |  |
| FLOW-18 | medium | Nothing reminds the coach to take the weekly backup, and the backup button is hidden among roster tools | Fixed | Today shows a 'Weekly backup' row with a Back up now button when no backup has been taken on this computer in 7 days. The Coach tools line on the Athletes tab shows when the last backup was taken. |  |
| FLOW-19 | low | The 'Links' tab is really the Library publisher, cannot unpublish, hides unpublished items and ignores Library Sessions | Fixed | The tab is now called Library. It lists every article and workout, hidden ones included (folded away), and each has a Hide or Publish button and a Copy link. Workouts are shown under their Sessions shelves. |  |
| FLOW-20 | low | After a publish there is no 'published at / by' on the athlete, so the coach cannot check that a cycle landed | Fixed | The athlete's File tab shows when their programme was last saved and by whom, so you can check that a cycle landed. |  |
| FLOW-21 | medium | The manual and in-app copy describe the pre-server system; the manual says 'forget' keeps logs, but it deletes them | Fixed | The manual has been rewritten against the current dashboard. It says Forget permanently deletes the habit log and progress. The screens' empty and Danger-zone text now say exactly what is deleted and what stays. |  |
| FLOW-22 | low | Feedback and confirm patterns are inconsistent across the app (53 alerts, 18 confirms, 73 toasts), and destructive actions warn differently | Fixed | The two delete actions (Delete training history and Forget) now say what stays and suggest taking a backup first, and a new login's password shows on the athlete's file instead of in an alert. One rule now (pile B5, 2026-10-11): it worked is a toast; it did not work is a line that stays (`fail()`); a question is a confirm; a pop-up only for something to read or copy once (a first password the server could not store, the backup summary, a bulk result, an erasure receipt). Pop-ups went from 71 to 10, 61 of them became lines. |  |

### Logic shared with the athlete app (TWIN)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| TWIN-1 | medium | The two Spine resolvers read different catalogues, and the phone falls back to a different approved entry when a card's exId is a draft | Fixed | Since 2026-10-11 (pile B7) a card that names its entry (`exId`) is that entry or nothing on the phone (`spineFor()`) and on the dashboard (`spineForC()`): a card on a DRAFT shows no cues or video until it is approved, instead of the closest approved entry's (a draft "Machine Seated Leg Curl" showed "Seated Leg Curl"'s). No live card was affected (0 of 1,373 cards carry the id of a draft or of a missing entry). The dashboard reads the phone's view wherever it predicts what an athlete sees (`spineLensC()`: the video in the compare view, the day cards' qualities), and the Exercises tab lists every card name that shows something else on a phone, with what each shows. `check_twins.js` runs both resolvers in both views (the "known differences" note is gone), `spine-link.js` covers the app (3 of its 11 checks fail on the old code) and `spine-phone-view` the dashboard (5 of 9 fail on the old code). |  |
| TWIN-2 | medium | The coach re-derives the day's adjusted prescription (REC-2 check-in and week notes) from partial inputs, so correct sessions are flagged | Fixed | On a sore check-in that halved the jumps, doing exactly half the sets now reads 'half the sets today (sore)' and counts as on plan, and partly done optional work is no longer a miss. Since 2026-10-11 (pile B6) the week-note caps are applied when the dashboard judges a lower day (WORK-11). The app still does not store the targets it showed, and no longer needs to: the dashboard derives them by the same rule, checked against the app's own code on every commit. |  |
| TWIN-3 | medium | The coach's 'Readiness vs their usual' pill uses a different score and baseline from the one that set the athlete's lower or short day | Fixed | The Readiness tile now shows the athlete app's own verdict for the latest check-in (normal, lower or short day, its score and their usual) when the check-in has one. Since 2026-10-11 (pile B6) the chart, the fallback pill and the day card use the app's score and usual (`readinessSC` and `usualC`, the twins of `readinessS` and `readinessBase`, run on 38 check-in cases by `check_twins.js`; `test_check_twins.js` breaks each on purpose), and the manual's Readiness section describes the rule. |  |
| TWIN-4 | medium | chips.js is shared at runtime through a hand-bumped ?v= behind a cache-first service worker; nothing ties the bump to a change | Fixed | `scripts/check_twins.js` (pre-commit guard 15) fails a change to `assets/js/chips.js` that keeps coach.html's `?v=` token, and a token bumped without refreshing `scripts/twins_stamp.json`. (2026-10-10, second session) |  |
| TWIN-5 | medium | Passwords are tidied (Persian or Arabic digits folded, ends trimmed) when Amir creates them, but never when the athlete signs in | Fixed | All four sign-in screens (training app, AA Proof, course app, testing app) now fold Persian and Arabic digits in the username, and retry the password once with digits folded and ends trimmed if the typed one fails. |  |
| TWIN-6 | medium | The Live app snapshot calls any unfinished touched day 'in progress', ignoring program.html's sessionIsStale() rule | Fixed | The live snapshot now labels an old unfinished day 'started <date>, not finished, a leftover' instead of 'in progress'. Since 2026-10-11 (pile B6) the snapshot uses the app's own rule, `sessionIsStale()`: a started day is in progress while its stamp is on today's calendar day or under six hours old, and a leftover after that (`sessionIsStaleC`; the day is this computer's, as the app's is the phone's). `check_twins.js` runs both on 116 stamps at four clocks; `live-snapshot-window` pins the screen. |  |
| TWIN-7 | low | Personal records: the coach's age is off by one before noon, and the retest flag is parsed three different ways | Fixed | Record ages are now counted in calendar days, so yesterday no longer reads 'today' before noon. Since 2026-10-11 (pile B6) the dashboard reads a lift's `test` the way the app does (`exTestSpecC`: true, or "<n>RM" with n from 1 to 10, anything else no flag) and `check_program.py` fails any other value under TST-5, so a flag the app ignores can no longer look live. `check_twins.js` (37 values) and `retest-flag` pin it; the checker has six new tests that fail on the old one. |  |
| TWIN-8 | low | The checker's name matching (Python norm_name and the --spine-sql NORM/LOOSE match) is not the apps' exNameVariants | Fixed | Since 2026-10-11 (pile B6) the checker reads a name the way the app does: Python `norm_name()` and the SQL `NORM_SQL` use NFKD and drop anything that is not ASCII, so "Farmer’s Carry" typed with a curly apostrophe is no longer "farmer s carry" (it now resolves to its entry on the server; the old SQL missed it) and "Café" is "cafe". 109 shared names with the app's four tiers sit in `scripts/name_cases.json`: `check_twins.js` holds the app and the dashboard to it and keeps it current (`--write-names`), and `scripts/test_check_program.py` holds `norm_name()` and the SQL's answers, recorded from the live database by `scripts/name_cases_sql.py` with a hash of the two SQL strings, to it (a changed string fails the test until the record is redone). The SQL has no bracket tier on purpose: NAM-4 fails a card with brackets in its name. |  |
| TWIN-9 | low | The Quality check predicts the athlete's day cards from a weekly number; docs claim the coach applies the 70% gate and 12% cut | Fixed | Since 2026-10-11 (pile B6) the Quality check says, day by day, what each day card on the athlete's phone will show: the app's own rule (`qualityDayC`, the twin of `qualityMix`: the 70% gate, the 12% cut, at most three words) run in the phone's view (approved entries and approved qualities only) and again once the drafts are approved, with the reason for every blank day. The weekly line no longer claims anything about the day cards, and PROGRAM-APP.md says which copies apply the gate and the cut. `check_twins.js` runs both on 1,863 checks over generated days, `test_check_twins.js` breaks the gate, the floor, the cut, the tie order, both lens filters and the round count on purpose, `check_parity.py` reads the coach's three numbers, and `quality-day-cards` pins the screen (9 of its 11 checks fail on the old code). |  |
| TWIN-10 | low | Most coach.html twins have no guard; only rxOf, the set-log grammar and the word lists are checked | Fixed | `scripts/check_twins.js` runs the exercise-name tiers, renamed lifts, the Spine lookup, the lower-day RPE target, the Quality check's counts and the check-in line's writer and reader through both copies (923 checks, every pair agreed on the first run), and `scripts/test_check_twins.js` proves it fails when a twin drifts. The known differences (WORK-11, TWIN-1, TWIN-6, TWIN-7) are listed in the script's header, not hidden. (2026-10-10, second session) |  |

### Driven in a browser (HARNESS)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| HARNESS-1 | critical | Inline exercise edit rewrites the whole programme from the copy loaded at page open: a newer server programme (publish_cycle, /program-edit, another tab) is silently reverted | Fixed | An exercise edit is applied to the live server programme and written only if nobody saved it in between, so a newer cycle can no longer be silently put back. Publishing a programme file warns when the live one is newer. |  |
| HARNESS-2 | critical | The athlete file's cached view (_D) is not invalidated when programmes or call logs reload, so the coach sees stale data and a ✎ edit can land on a different exercise | Fixed | Every programme reload rebuilds the roster and the athlete file, deleting a call log refreshes the file, and the editor checks the exercise name before opening and before saving. |  |
| HARNESS-3 | high | Every auth event reruns boot(): 3 full loads per page open, and every tab return or hourly token refresh reloads everything and throws away what Amir is typing | Fixed | The page reloads only when a different person signs in or you sign out. Coming back to the tab or the hourly token refresh no longer reloads it, and the sign-in library is pinned to version 2.117.3. |  |
| HARNESS-4 | medium | Coach line is filed under the server's UTC date: between local midnight and UTC midnight it overwrites yesterday's line and shows up as yesterday | Fixed | Posting or clearing the coach line now sends your local date, so a line written after midnight no longer overwrites yesterday's. |  |
| HARNESS-5 | medium | Backup pages with unordered OFFSET ranges and stops on any short page: rows lost or duplicated under concurrent writes, and silent truncation if the server page cap is not 1000 | Fixed | The backup reads every table page by page in a fixed order, removes any row read twice, notices when the server sends shorter pages, and lists a table under 'Could NOT read' when fewer rows came back than the server counted. |  |
| HARNESS-6 | medium | The weekly backup file carries plaintext initial passwords for athlete and course logins | Fixed | The backup file now blanks unsent login passwords for athletes, course buyers and testing-app buyers, as recommended; after a restore you reset the login and send a new password. |  |
| HARNESS-7 | medium | 'Delete all data' deletes the athlete's habit log, body weight and records but leaves programme, login and roster row, and its copy names a data file that no longer exists | Fixed | The button is now 'Delete training history'. It and its confirm list exactly what goes and what stays, and it reports how many sessions were deleted or that nothing was. Since stage48 the two deletes are one transaction, so a failure between them can no longer leave half done. The full 'remove this athlete' option you asked for (decision 5) is **Erase completely…** under it (stage54, live since 2026-10-11). |  |
| HARNESS-8 | low | Saving an exercise with no change still writes a programme version and turns numeric reps/RPE into strings | Fixed | Saving an exercise with no change writes nothing and says 'No change to save'. Typed reps and RPE are stored as numbers. |  |
| HARNESS-9 | low | Legacy data/<id>.json fallback and the 'Move programmes into the database' UI are still live code | Fixed | The fallback to old data/<id>.json files and the 'Move programmes into the database' button are gone. An athlete with no programme row now reads 'No training programme published yet'. |  |

### Layout, phone, accessibility (BROWSER)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| BROWSER-1 | medium | After a long message the toast never fully hides on phones, it is half-width, and it is not announced | Fixed | The 'Saved'-style message at the bottom now spans the phone width, slides fully out of sight when it hides, and is read out by screen readers. |  |
| BROWSER-2 | medium | The File tab tells the coach that athletes without a login 'still get in through the secret link below', but secret links are dead and there is no link below | Fixed | The File tab now says an athlete with no login cannot open the app (secret links were retired on 7 Sep), an athlete with no programme shows 'no programme row', and the dashboard no longer reads local data files at all. |  |
| BROWSER-3 | medium | Any save that refetches history rebuilds the athlete file: open days collapse, the compared session jumps to the latest one, and half-typed edits are thrown away | Fixed | After a save or refresh the athlete file keeps the days you had open, the session you were comparing, any half-typed prescription edit and your unsent coach line. |  |
| BROWSER-4 | medium | Scroll and context are not managed between views: forward navigation lands mid-page and Back loses the coach's place, search and sort | Fixed | A new screen now opens at the top, the roster keeps your search and sort when you come back, and the browser tab title names the screen or athlete. Since 2026-10-11 (pile B10) going Back to a screen lands where you were on it (the page stamps each history entry, remembers the scroll of the screen on show and puts it back on a history step; a tap on a tab or link still starts at the top). `back-keeps-place` pins it. |  |
| BROWSER-5 | medium | On phones the tab rail hides 6 of 9 sections and Refresh with no hint, and after a reload nothing shows which view is open | Fixed | On a phone the four daily tabs sit on one line and the occasional five on a second line with a fade at the edge, the open tab scrolls into view, and Refresh is in the top bar. |  |
| BROWSER-6 | medium | Low-priority flags render bigger and louder than urgent ones because .fl.note picks up the global .note callout style | Fixed | Low-priority flags on the roster and in The work are now small grey pills, no longer bigger and louder than urgent ones. |  |
| BROWSER-7 | medium | On touch screens the prescription edit pencil is invisible, and many targets are under 32 px | Fixed | On a phone the edit pencil is always visible and finger-sized (about 33 by 39 px), small buttons are taller, and fields are 16 px so the iPhone does not zoom. |  |
| BROWSER-8 | medium | Muted greys, clay text and many sub-12 px labels fail WCAG AA, and the faintest text is the per-set coaching detail | Fixed | Grey and clay text were darkened to pass contrast, the comparison header and per-set detail are bigger, and the Exercises filter shows the active choice properly. Since 2026-10-11 (pile B10) all 69 declarations under 12 px in coach.html are 12 px (no page overflows at 390 or 1280 px, checked screen by screen), and coach.html is under the site style guard (`scripts/check_site_style.py`, pre-commit guard 13), so text under 12 px cannot come back; its two coloured warning signs and the Google Fonts link are the recorded baseline. |  |
| BROWSER-9 | medium | daysSince() is off by one before noon: today's weigh-in reads '-1 days ago' and quiet-athlete flags come half a day late | Fixed | 'Days ago' now counts calendar days, so a weigh-in from this morning reads 'today' and quiet-athlete flags come on the right day. |  |
| BROWSER-10 | medium | Save failures are reported three different ways; several write failures are only a 2.6-second toast | Fixed | Anything that fails to load (Spine, testing app, course, intake, affiliates) now shows in a banner under the tabs, and most saves check that they really changed something. Since 2026-10-11 (pile B5) every failed save, in every tab, is a line at the bottom that stays until you dismiss it with the cross (`fail()`), in view wherever the page is scrolled to, with the same words the pop-up carried; the affiliate and intake failures that were 2.6-second toasts are in it too. `fail-bar` pins it. |  |
| BROWSER-11 | medium | Demo fixtures on the public page use real athlete ids and first names, with made-up weights, notes and flags | Fixed | The public demo now uses made-up people only (demo_ana, Lena, Mina and so on, plus Amir himself) with invented wall lines, and 'View their app' in the demo opens the public demo programme. |  |
| BROWSER-12 | low | At 320 px every view scrolls sideways, and four components overflow their cards | Fixed | At 320 px every screen fits without sideways scrolling, the ten-qualities editor included. |  |
| BROWSER-13 | low | Intake and affiliate card summaries cut off dates and warning pills at common phone widths | Fixed | Intake and affiliate cards now let their pills and dates wrap onto a second line instead of cutting them off. |  |
| BROWSER-14 | low | Sticky header offsets are hard-coded and partly broken: the comparison header never sticks and jump links land under the bar | Fixed | The comparison header now sticks under the bars while you scroll a day, jump links land below the bar, and the reduced-motion setting works. |  |
| BROWSER-15 | low | Keyboard focus ring is invisible on dark green surfaces and removed on password fields | Fixed | Keyboard focus shows as a green ring on light pages (green buttons and the active tab included) and a white ring on the dark green bars. |  |
| BROWSER-16 | low | No landmarks, headings or ARIA states, and many inputs are labelled only by their placeholder | Fixed | The page has a main area and labelled navigation, the open tab and sub-tab are marked for screen readers, and the login, password and ten-qualities fields carry labels. |  |
| BROWSER-17 | low | Demo mode throws on the coaching log, leaves demo through two links, and cannot preview the database programme state | Fixed | In the demo the coaching log says 'Demo — no coaching log', New call log and View their app no longer leave the demo, and demo athletes show as having a database programme. |  |
| BROWSER-18 | low | Cosmetic: underlined tab labels, the brand link leaves the dashboard, the day header squeezes at 721 to 820 px, and the hidden pencil leaves a gap | Fixed | Tab labels are no longer underlined, the brand link goes to Today, the day header wraps cleanly up to 900 px wide, and the hidden pencil no longer leaves a gap on a computer. |  |

### Proof, Library, Affiliates, buyer logins (MKT)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| MKT-1 | high | Forget on a coached contact deletes that athlete's training-app data (Personal Records, body weight, set logs, check-ins), and the warning says their training stays | Fixed | Forget is not offered for coached clients (they show as 'coached · converted'), it is switched off while the programmes have not loaded, and since 2026-10-11 the server refuses it too (stage45, applied). Checked on the live database with two made-up people: the coached one is refused and keeps every row, the free one is forgotten, a signed-in user who is not you gets 'coach only' and the public gets 'permission denied'. |  |
| MKT-2 | medium | Forget is not an erasure: the login stays live, so the person's phone quietly re-creates their data, and the programme, titles and login survive | Fixed | The Forget box and the manual say exactly what is deleted and what stays. **Erase completely…** (stage54, live since 2026-10-11) is the real erasure: it deletes the login and the sign-in account too, so the phone cannot upload again. Forget points to it, and the server refuses Forget for a coached client (stage45). |  |
| MKT-3 | medium | After a Proof write, the board, wall and presence data stay stale until Refresh | Fixed | After a Forget the board, wall, contacts and roster are all reloaded, so the person disappears straight away. Since 2026-10-11 (pile B8) the board says when it was read (*As of 14:32*) with a Reload button, and starting or ending a quest week reads it again, because the XP moved. `proof-board-truth` pins it. |  |
| MKT-4 | medium | WhatsApp links are built three different ways; 8 of 19 funnel links are invalid and an affiliate number typed in Persian digits gives an empty link | Fixed | The funnel, the Proof tab, Affiliates and the login card all use one WhatsApp link builder that handles Persian digits and Iranian 09 numbers, and a number it cannot read gets no button instead of a wrong one. |  |
| MKT-5 | medium | Plaintext login passwords stay stored and on screen after delivery; 'to send' never clears; every Backup file carries them | Fixed | Backups no longer carry stored passwords, Mark sent asks first, and since stage51 (2026-10-11, your yes) the database clears a stored password the moment the person signs in with it, so it stops counting as 'to send' and leaves the screen. | |
| MKT-6 | medium | Buyer logins are two copy-pasted 129-line blocks, and the third copy (athlete logins) and the edge functions have drifted | Fixed | The course and testing-app login functions now report a failed read or write the way the athlete one does (deployed as v3). Since 2026-10-11 (pile B11) the Testing app and Course tabs are one block built twice (`buyerLogins()`, 306 lines became 188), a login call runs one at a time on a buyer tab and on an athlete's File tab (a double tap on Save password made two passwords), the page keeps saying what it did instead of "Copied" a moment later, and the course login function's header no longer names the retired repo (`tps-login` v4, deployed 2026-10-11, verify_jwt still off). The behaviour was pinned first by `buyer-logins-course` and `buyer-logins-assess` (the stub now emulates both functions), then merged; `athlete-login-double-tap` fails on the old page. |  |
| MKT-7 | low | 'Mark sent' does not check that a row changed, and erases the only stored password without asking | Fixed | Mark sent, for athletes and both kinds of buyer, now asks before clearing the stored password and reports a failure if nothing on the server changed. |  |
| MKT-8 | medium | A failed load of Testing app or Course logins shows '0 active · No logins yet' and is never retried | Fixed | If testing-app or course logins fail to load, the tab now says so with a Try again button and offers no Create, instead of showing 'No logins yet'. Since 2026-10-11 (pile B8) a board that fails to load says why (*Couldn't fetch the board: <reason>*) and has Try again. |  |
| MKT-9 | medium | The Library can publish but not unpublish; unpublished items are invisible and toggleLibraryItem is dead code | Fixed | Every Library item has a Hide or Publish button (with a confirm), and hidden items are listed under a folded 'Hidden' group. |  |
| MKT-10 | low | Links offers only the in-app deep link; the public English and Farsi article pages are never offered | Fixed | Each article now has Copy App, Copy Web · FA and Copy Web · EN buttons, workouts keep Copy App, and items are grouped under their category name. |  |
| MKT-11 | medium | An affiliate code's 'uses' counts intakes, not paying clients, yet it is documented as the commission list; typed codes are matched too strictly | Partly | Each code card now counts applications (archived ones left out), says plainly they are not payments, and matches codes typed with spaces, Persian digits or any case. | The apply forms and the server's code check still reject a code typed with a space or Persian digits, and codes that match no affiliate are not shown anywhere. **Decided 2026-10-11: no payment tracking for now.** |
| MKT-12 | low | The 'free signups' funnel includes coached clients, and reads tier from a second copy | Fixed | The funnel takes each person's tier from their programme, counts only free signups in its headline, and lists coached clients separately as 'coached · converted'. |  |
| MKT-13 | low | Four different feedback patterns for the same kinds of action across these tabs | Fixed | A buyer login (testing app and course) now behaves like an athlete's: the message is copied, a toast says so and the password waits in the list, with the pop-up kept only when the server could not store the password. Errors are lines in every tab. |  |
| MKT-14 | low | Buyers can read Amir's private 'who bought it' note (and their stored password) through the buyer-read policy | Fixed | The note now lives in `buyer_notes`, which only you can read (stage53, applied 2026-10-11; your yes). A trigger moves any label the login functions still write, so they did not change; the two existing notes were copied across and every account row's label is now empty. A buyer can still read their own first password until they sign in with it (stage51 clears it then); that is their own credential, and no course buyer has one stored today. |  |
| MKT-15 | low | Docs and comments contradict the code: forget, data sources, AMIR_ATHLETE_ID, and the tps-login header | Fixed | The manual now says what Forget really deletes, lists the affiliates, library and buyer tables, has short Library, Testing app and Course sections, and no longer claims every write goes through a guarded function. Since 2026-10-11 (pile B11) the two comments say what the code does: the board is read as the signed-in coach (`is_coach()`; `amir_ardekani` only marks which row is "you"), and `tps-login`'s header names this repo and Supabase, not the retired one. |  |
| MKT-16 | low | Buyers cannot be erased from the dashboard, and the privacy notices do not mention buyer accounts | Fixed | **Erase…** on each Course and Testing row removes the buyer in one step (stage54, live since 2026-10-11): the login, your note, and for the testing app every player, note and result, including the ones the buyer had removed. A course buyer's dry run was checked on the live database; there is no testing-app account yet, so that kind has only been tested on a local copy. A text for the privacy notices is drafted in `Content/PRIVACY-DRAFT-BUYER-ACCOUNTS.md`. Since 2026-10-11 (pile A2) `privacy-fa.html` carries the same in Farsi, as you approved it: line 1 (the buyer decides about the players, you only store them), line 2 (the sign-in and the players in what you keep) and a new line 8 about the course and testing-app accounts, with the date 11 October 2026. |  |
| MKT-17 | low | Funnel onclick handlers broke on an apostrophe in an email (an injection pattern); already fixed in the working copy | Fixed | Funnel buttons now pass emails and ids safely, so an apostrophe in an email can no longer break the button or run as code. |  |

### Exercises (the Spine) and Intake (SPINE)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| SPINE-1 | critical | Saving an entry rewrites every field from the page-load copy, reverting anything Claude's pipeline wrote since (no updated_at guard) | Fixed | Saving an exercise now sends only the boxes you changed, reads the entry fresh first, and refuses (showing both values, keeping your typing) if Claude or another tab changed the same box since you opened it. |  |
| SPINE-2 | high | A failed load of the coach half (or the Spine itself) is swallowed and cached; the next save wipes SFR, restriction flags, counts, cost and notes | Fixed | If any part of the Spine fails to load, the Exercises tab says what did not arrive, offers Try again, and will not let you save, so blanks can no longer be written over real counts, SFR, flags or notes. |  |
| SPINE-3 | high | Renaming an entry (or adding a colliding alias) is one Save with no check, and detaches every card that finds it by name | Fixed | Renaming an entry that live cards use, or giving it a name another entry already has, is refused with the list of athletes affected and sent to Claude's /spine (the safer of the two options in the open question, listed in the audit report so you can overrule it). |  |
| SPINE-4 | high | 'Who is doing it', the athlete counts and the Coverage meter ignore every exercise inside a circuit | Fixed | Coverage, 'Doing it now', the athlete counts and 'Not in the Spine yet' now count exercises inside circuits too. |  |
| SPINE-5 | medium | Two-table save is not atomic: on a coach-half failure the alert is followed by a success toast and the typed values are thrown away | Fixed | If the coach-only half fails to save, there is no 'Saved' message any more: it says the entry saved but the counts/SFR/flags/cost/notes did not, and keeps those typed values in the form to save again. Since stage48 the two halves are one transaction (`coach_save_spine()`): a clash or a failure in either writes neither, so there is no half-saved state to explain. |  |
| SPINE-6 | medium | No unsaved-change protection: every click redraws the whole tab, losing typed edits and jumping the page | Fixed | Typed work in the editor and in the quality texts survives redraws, and opening another entry, switching the list, Refresh, leaving the tab or closing the page with unsaved changes asks first; the row you tap stays under your finger. |  |
| SPINE-7 | medium | Finding and working an entry is slow: the tab opens on an empty Drafts list, there is no search, and the editor is 1300-2400 px with Save at the bottom | Fixed | The tab opens on Approved when there are no drafts, has a search box, marks the active filter properly, shows who is doing it at the top, and keeps the Save bar on screen while you scroll. Since 2026-10-11 (pile B10) the entry editor folds *Body parts and the body map* and *Coach only: SFR, flags, counts, cost* under headings; each opens by itself when something in it is missing (and says *no count yet* on its heading), stays as you left it across a redraw, and a save sends the folded parts' fields as before. `spine-editor-folds` pins it. |  |
| SPINE-8 | medium | 'Move back to draft' takes an entry (or a quality) off every phone in one tap, next to Save, and also saves the form | Fixed | 'Move back to draft…' now asks first and says how many athletes would lose it, and on an exercise it sits away from Save at the other end of the bar. |  |
| SPINE-9 | medium | Intake WhatsApp links are built from any digits in the contact, so handles and emails become wa.me links to wrong numbers | Fixed | An intake contact only becomes a WhatsApp link when it is a real phone number (Persian digits, 00, +98 and 09… handled); Instagram handles and emails stay plain text with a Copy button. |  |
| SPINE-10 | low | Farsi intake answers render left-to-right in a Latin monospace font | Fixed | Farsi intake answers now read right to left in the page's normal font, and Farsi lists are joined with the Persian comma. |  |
| SPINE-11 | low | An intake card is a dead end: no step from a lead to onboarding, and 'Handled' cannot say what happened | Fixed | Nothing changed: the Intake tab is still a plain inbox, which is its documented job (the verification refuted this as a defect). Since 2026-10-11 (pile A8) the intake card is no longer a dead end: it has an outcome form and a link to the athlete it became (see FLOW-17). |  |
| SPINE-12 | low | Links saved from the editor are one-way, and typed names can link to a different version through loose name tiers | Fixed | A typed link now only matches an entry by its exact name (no more linking to a different version through loose matching), and the editor lists the links that do not point back yet. Your answer (2026-10-11): the editor stays one entry at a time and Claude's /spine Upkeep adds the way back. |  |
| SPINE-13 | low | Values outside the editor's lists are silently dropped or reinterpreted on save | Fixed | A stored value the lists do not know is shown and kept, extra qualities without a primary are refused, SFR must be a whole number, a muscle named twice is refused, and 'quadriceps' and 'hams' are understood. |  |
| SPINE-14 | low | Manual and on-page text drift from the code | Fixed | The manual's Exercises section and the on-page labels now describe what the editor really does (only muscles reach the phone, never SFR, flags, cost or notes; programmes with workouts only; circuits counted). |  |
| SPINE-15 | low | loadSpine reads the Spine with plain selects, which PostgREST caps (1000 rows by default) without an error | Fixed | The Spine, its coach half and the qualities are now read in pages, so nothing is cut off past 1000 rows, and a short read is reported. |  |

### Database and login functions (SERVER)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| SERVER-1 | medium | Plaintext login passwords stay on the server after the person has already signed in, so 'Logins to send' overstates who is waiting | Fixed | Logins to send marked a used password 'signed in with it'; since stage51 (2026-10-11, your yes) the database clears it by itself the moment the person signs in with it, and sent_at says when it reached them. | |
| SERVER-2 | medium | The backup says INCOMPLETE every week (hab_season_results is unreadable), and testing-app buyer data is never backed up | Fixed | Season results can be read by the backup, every table is paged in key order with repeats removed and short reads reported, and since stage50 (2026-10-11, your yes) the coach has a read-only policy on the testing app's players, notes and results, which are now in the weekly backup. The dashboard still cannot change a buyer's data. |  |
| SERVER-3 | medium | Importing a past session over an existing one keeps the old set-by-set log, so the athlete and the coach see different sessions | Fixed | Adding a past session over one already logged on the same date now really replaces it, set-by-set log included, so you and the athlete see the same session and the warning box tells the truth. |  |
| SERVER-4 | medium | A note the athlete edits after Amir marked the session read never comes back to 'needs you' | Fixed | When an athlete edits a note after you marked the session read, it comes back to 'needs you'; re-saving the same note does not. |  |
| SERVER-5 | medium | Forget (forget_contact) cannot deliver what the privacy notice promises, the manual says the opposite of what it does, and the screen keeps showing the forgotten person | Fixed | The manual and the Forget box say exactly what Forget deletes, the screen refreshes after it, the page and the server (stage45, live) refuse Forget for coached clients, and the one-step full erasure the notice promises now exists (stage54, live). |  |
| SERVER-6 | medium | Spine and Quality saves overwrite without a freshness check and keep no history | Fixed | Spine and quality saves check freshness (only changed boxes, refused if someone else changed the same box), the server stamps the time on every change, and since stage49 every change to an exercise entry, its coach-only half or a quality is kept in `spine_versions` by a trigger, from any writer. Exercises → an entry → History lists each change (who, what, old then new) and Undo puts the fields back through the guarded save, under the same identity rules as Save (it will not bring back a name cards no longer use, an alias another entry owns, or a link to a deleted entry). The weekly backup includes the table. (2026-10-10, second session) |  |
| SERVER-7 | medium | 13 free Proof users have had no way into the app since the 2026-09-07 key cutover, yet the funnel still scores them | Fixed | Each locked-out person's roster row said 'no login — cannot open the app'; your answer was to forget the 13 free signups and remove everything, and it was done on 2026-10-11 (13 programmes, 13 contact records, 12 habit-data rows, 5 titles, 2 board entries). No free programme is left, so the funnel no longer scores them. |  |
| SERVER-8 | low | Level functions run with the owner's rights and have no access check: any signed-in athlete or buyer can read any athlete's level or mint their titles | Fixed | Career level, title minting, note purging and the season-level helper can no longer be run by athletes or buyers; the dashboard reads every level through one coach-only call (coach_season_levels). Revoked after this version went live. |  |
| SERVER-9 | low | Five remaining direct writes cannot tell a write that changed nothing from a success; Delete training history is two separate deletes | Fixed | Mark sent (athletes, course, testing app) and Library Hide/Publish confirm a row really changed. Delete training history is now one server call, `coach_delete_training_history()` (stage48): the sessions and the progress snapshot go together or not at all, and the counts come back. (2026-10-10, second session) |  |
| SERVER-10 | low | Reads that are not paged and full-table refetches: nothing is at the cap yet, but several tables are heading there | Fixed | Mark read and Clear older notes update the page's own copy instead of re-downloading every session, and the Spine tables are read in pages. Since 2026-10-11 (pile B11) the Library items are read with `selectAll()` in pages, all or nothing (a short answer is named by the banner), in their shelf order. `library-paged` pins it with a server that answers three rows at a time (it fails on the old page). |  |
| SERVER-11 | low | Login edge functions ignore the error on their follow-up table write after a successful ban or password change | Fixed | All three login functions (athlete v6, course and testing app v3) report a failed account read and a failed bookkeeping write instead of ignoring it. |  |
| SERVER-12 | low | Version history keeps 20 entries per athlete, and an SQL writer that does not set updated_by inherits the previous author's name | Fixed | Version history now keeps the last 20 saves and everything since the previous cycle began, at most 150 (stage52, applied 2026-10-11, your answer). The most any one athlete holds today is 20, the old cap; the new rule applies from their next save. Since 2026-10-11 (pile B11, stage59 applied) a programme edit with no signed-in user (the SQL editor, the MCP) no longer inherits the previous person: an `updated_by` that is still the old email becomes `sql`; a label (`publish_cycle`, `claude`) stays, so two publishes in a row still say publish_cycle. Rehearsed on the live database in a rolled-back transaction (the old function kept the person in 2 of 8 steps; the new one passes all 8, and the 6 stored versions keep their `saved_by`). |  |
| SERVER-13 | low | Core server objects behind coach.html have no source in the repo; the manual describes an older contract; the coach email is hard-coded in about 25 places | Fixed | The programme tables, their access rules, the coach check and the version-history trigger are now written down in the repo (stage44), and the manual was rewritten against the code. Since 2026-10-11 (pile B3): `supabase/stage56_functions_record.sql` is the athlete's programme door `get_program()`, `current_athlete_id()` and the six other live functions that had no CREATE FUNCTION in the repo, exactly as the database holds them (run inside a transaction that was rolled back: all 8 definitions and ACLs identical, so re-running it changes nothing). `stage57_coach_policies_use_is_coach.sql` (applied) moved the 18 older policies that spelled out your address over to `public.is_coach()`: rehearsed on the live project in a rolled-back transaction, as you every table read and wrote exactly as before, as a stranger or the anonymous role every table stayed empty and every write was refused. The address is now typed in `is_coach()` and `coach_erase_person()` in the database, once as `COACH_EMAIL` in coach.html and once in each of the three login Edge Functions. Still to come with the restore path (A3): the tables, policies, triggers and grants themselves. |  |
| SERVER-14 | low | The coach check trusts the email claim alone; whether public sign-up is open cannot be verified from here | Open |  | Checked 2026-10-11 from the project's own public settings (`/auth/v1/settings`): `disable_signup` is **false**, so anyone can register with their own e-mail (confirmation is required; the 38 accounts are all expected, and no page calls `signUp` or `signInWithOtp`). You said you would switch it off now: Supabase dashboard → Authentication → Sign In / Providers → User Signups → Allow new users to sign up → off. Read the setting back afterwards. Tying the coach check to your account id as well is optional. |

## 10. The second session (2026-10-10): what is done, and the one thing that needs you

Done without a decision from you (your list, in your order):

| Item | Where it ended | Finding |
|---|---|---|
| One transaction for *Delete training history* | `coach_delete_training_history()`, stage48, applied; the page sends one call | SERVER-9, HARNESS-7 |
| One transaction for the Spine save | `coach_save_spine()`, stage48, applied; the page sends one call | SPINE-5 |
| Version history for Spine entries | `spine_versions` + a trigger, stage49, applied; Exercises → an entry → History, with Undo | SERVER-6 |
| Note backlog by when a note arrived | live (#302, merged) | TODAY-2 |
| The check-in line in imported emails | live (#302); Claude's Gmail import stores the same keys | FILE-8 |
| A guard for logic in both apps | `scripts/check_twins.js`, pre-commit guard 15, live (#302) | TWIN-10, TWIN-4 |

**What still needed you, on 2026-10-10: stage45, with you present** (the server refusing Forget for a coached client;
you ran it on 2026-10-11 with the rest of the pack, and the first query below now returns true). stage48 and
stage49 are applied (migrations `stage48_coach_one_transaction` and `stage49_spine_versions`), so the order was SQL
first, page second: this page change merged only after both checks below returned `true`. The migration tool
did not ask for a confirmation for either, although both contain the word *delete* inside function and trigger
definitions; the SQL runner is what timed out on a test that really deleted rows. So stage45 may apply without a
prompt too. I did not try, because you asked to be there for it. Say "apply stage45" and check it with the first query:

```sql
-- stage45 (true, applied 2026-10-11)
select position('coached athlete: forget' in pg_get_functiondef('public.forget_contact'::regproc)) > 0;
-- stage48 (true, checked 2026-10-10)
select to_regprocedure('public.coach_save_spine(text,jsonb,jsonb,jsonb,jsonb)') is not null
   and to_regprocedure('public.coach_delete_training_history(text)') is not null;
-- stage49 (true, checked 2026-10-10)
select to_regclass('public.spine_versions') is not null
   and (select count(*) from pg_trigger where tgname in ('exercises_version_trg','exercise_coach_version_trg','qualities_version_trg') and not tgisinternal) = 3;
```

**How stage48 and stage49 were proved before and after going live.**
- Before: both files were run on a real Postgres 16 with a replica of the live tables (`sh scripts/test_spine_sql.sh`:
  73 assertions: the coach check, grants, row-level security, atomicity, the trigger; and two real sessions showing a
  dashboard save waits for Claude's in-flight write and then sees it).
- After applying: the two checks above; the security advisor shows nothing new (the two coach functions sit in its
  *signed-in users can execute* list like every other coach-only function, and each refuses anyone but you;
  `spine_keep_version()` is executable by neither role; `spine_versions` has its policy); and two smoke tests on the live
  tables, each inside a transaction that ended in an error so nothing persisted (re-read afterwards: no history row,
  no stray athlete rows, the entry unchanged). The Spine save: a normal save writes one history row naming your email
  and keeping the old value; a stale snapshot is refused with the live value and writes nothing; an unchanged save leaves
  no history row; the coach-only half saves; a field the editor does not own and a caller who is not you are both
  refused. (Creating a missing coach-only row is covered by the local test only.) The delete, on made-up athletes: two sessions and one progress row
  go, a second made-up athlete's rows stay, an unknown athlete returns zeros, a blank athlete and a caller who is not
  you are refused.
- The first real history row appeared seconds after stage49 went in: a write with no signed-in user (Claude's `/spine`
  or the SQL editor) changed one entry's alternatives, and the trigger recorded it as `sql`.

**An independent review of the second half, and what it changed.** A reviewer who had not written the code ran it
(the SQL on a throwaway Postgres, the page in the browser harness, the stub against the SQL) and found no critical or
high problem; one medium and several low ones, all confirmed by running them. Each is fixed, with a test that fails on the
earlier code (12 failing checks across 6 scenarios; the SQL tests 4 failing before the function change):
- *Medium:* **Undo skipped Save's identity rules.** Claude renames an entry and its cards (the `/spine` one-name move);
  Undo on that history row sent the old name back, so the entry and its 3 cards no longer matched. Undo now meets the same
  rules as Save (`spineIdentityProblem()`, shared): a name or alias another entry owns, a rename of an entry live cards
  use, and a link to an entry that is gone are refused. Scenario `spine-undo-guards`.
- *Low:* a lapsed sign-in read "History is not on the server yet (stage49 has not been applied)" because its error names
  the table; it now says the sign-in may have lapsed. A change past the 140th character of a long text showed as two
  identical lines in History and in the Undo confirm; both sides are now cut to a window that starts at the difference.
  History re-read 80 rows on every keystroke in the search box (10 reads for 5 keystrokes); it now reads when opened and after a
  change. When the answer to a save or a delete never arrived (a dropped connection, no database code), the page said
  "nothing was saved/removed" although the server might have committed; it now says it cannot tell and to refresh.
- *Low, SQL (applied as migration `stage48b_coach_save_spine_strict_payloads`):* a payload that was not a JSON object
  (a double-encoded string, an array) was read as empty and answered `ok: true` having written nothing, which the page would have
  shown as Saved; it is now an error. A `/spine` call that updated `exercise_coach` before `exercises` in one transaction could
  deadlock with the dashboard save (one of the two is aborted with "deadlock detected", nothing is corrupted); the save locks
  `exercises` first, the `/spine` skill now says to write in that order, and `scripts/test_spine_sql.sh` proves that order cannot deadlock.
- *Docs:* the recipe for putting a deleted entry back restored only the entry; the coach-only row is a second version and needs a
  second insert (both are now in stage49's header and tested). The Spine rules keep athlete detail off entries, but that is a rule,
  not a guarantee, so the header now says how to erase a text from `spine_versions` too (SQL only).

**Found in the advisor, not fixed (outside the five items).** stage47's trigger function `coaching_logs_keep_version()`
is still executable by `anon` and signed-in users (stage49's version revokes it). A trigger function cannot be called
directly, so nothing is exposed; the one-line cleanup, which changes no behaviour, is
`revoke execute on function public.coaching_logs_keep_version() from public, anon, authenticated;`. **Done since:** checked on
2026-10-11, neither `anon` nor a signed-in user can execute it.

**Found while doing it, not fixed (program.html, outside the five items).** `cycleWeekInfo()` reads a cycle's
`endDate` as a UTC midnight, so for an athlete west of Greenwich the app says the cycle is over (*Cycle complete*,
no days-left banner) on its **last day**, one day early. Tehran and Madrid are right; New York and Los Angeles are
not (reproduced by running the real function under each time zone). The dashboard reads the date as a local day, so
the two disagree for those athletes. A one-line fix in the app (parse the date as a local day) when you want it.

**Found while doing it, not fixed (outside the five items).** The old stand-alone `backup_supabase.py` (a script that needs the
service key; its own header says you do not need it) still has a 22-table list where the dashboard's ⤓ Backup has 37, and it pages
rows by offset with no order, the flaw the dashboard's backup lost a row to (`backup-paging`). Keep using the dashboard's ⤓ Backup; if you
want the script kept, it needs the table list and an ordered paging fix, or retiring.

**Your decisions** moved on 2026-10-11: see §11.

## 11. Third session (2026-10-11): your answers, and where each one stands

You answered all twelve questions in §7. This table is kept up to date as each one lands. Five of them were SQL that contains a delete
or a drop, so the Supabase tool asks for a confirmation that never reaches you (it ran out five times, three of them with you at the
screen) and I did not work round it: you ran them in the SQL editor on 2026-10-11, and every row below is now done and checked
(*Checked on the live database*, further down).

| # | Question (§7) | Your answer | State |
|---|---|---|---|
| 1 | The 13 free Proof signups with no login | Forget them, and **remove everything** (their programme rows and 5 titles too) | **Done 2026-10-11** (you ran `supabase/one-off/remove-13-free-signups-2026-10-11.sql`): programmes 52 → 39, no free programme left, no row of the 13 left anywhere. |
| 2 | Apply stage45 (Forget refused for coached clients) | Apply it now | **Done and live** (first part of the SQL pack). Checked with two made-up people. |
| 3 | Cancelling a quest week and the XP | **Keep what was earned** | **Done and live** (stage55 applied and checked 2026-10-11; the dashboard button and `habits.html` ship with the pull request). |
| 4 | Stored first passwords | Clear one automatically once the person has signed in with it | **Done** (stage51). Today 3 course buyers had a used password stored; the backfill clears them. |
| 5 | One-step full erasure | Athletes **and** buyers | Built, reviewed twice by an independent agent, fixed and tested (stage54). **Done and live** (fourth part of the pack), then rehearsed on the real database without erasing anyone (below). A partner record stays and only its link to the athlete is cleared; intake forms are **your pick** inside the Erase panel (your answer, below). |
| 6 | Testing-app players, notes and results in the backup | Yes, add the read permission | **Done** (stage50, applied 2026-10-11; in `BACKUP_TABLES`) |
| 7 | How many programme versions to keep | The current and the previous cycle | **Done and live** (stage52, second part of the pack). |
| 8 | Sessions from the previous cycle | Just label them, as now | decided: no change |
| 9 | Sessions with no duration | **Skip them and grey out the ratio** | **Done** (dashboard only; ships with the pull request). |
| 10 | Affiliate commission tracking | **Not yet** | decided: no change; the code card says plainly that its count is applications, not payments. |
| 11 | The buyer note buyers can read | **Move it where only you can read it** | **Done and live** (stage53, third part of the pack; the two notes were copied across). |
| 12 | Is the weekly call log retired | **Retired, fold it into File** | **Done** (dashboard only; ships with the pull request). |

**The SQL pack.** One file you pasted into the Supabase SQL editor, `supabase/PASTE-1-run-in-sql-editor.sql`: stage45, stage52, stage53
and stage54 in that order, ending with a row per part that says whether it is applied (all four said yes). Then `supabase/one-off/remove-13-free-signups-2026-10-11.sql`
on its own (it stops, deleting nothing, unless there are exactly 13 free programmes and none has a login, a session or a message, so
a new signup cannot make it delete the wrong set, and run a second time it stops at "Expected 13 free programmes, found 0"; keeping it apart means that guard cannot stop the four parts above. When it had deleted, it
checks every table in the public and backup schemas that has an `athlete_id` column and undoes everything if one still holds a row for any of the 13.
`scripts/test_spine_sql.sh` section 6 runs it on a throwaway Postgres: refuses with 12, refuses with a session, undoes itself for an unknown table,
removes every row of the 13 and leaves a coached athlete alone).

**Why 1 and 2 were handed to you.** The Supabase tool asks for a confirmation on SQL that deletes, and waits 60 seconds for it. It ran
out five times (checked each time: no stuck session, the function and the 13 programmes unchanged). I did not work round it. Both were tested first on a throwaway
Postgres with made-up people: `scripts/test_spine_sql.sh` section D covers stage45 (a free signup is forgotten, a coached athlete
and a programme with no tier are refused and nothing is deleted, anon is refused), and the removal script stops without deleting
anything unless there are exactly 13 free programmes and none has a login, a session or a message. What the 13 had: 13 programme
rows, 13 contact records, 12 habit-data rows, 5 titles, 2 leaderboard entries, and nothing else anywhere. Your weekly backup files keep
them until they roll off (about 3 months), which is what the privacy notice promises.

**Stage50 and the privacy notices.** The three tables hold a buyer's own players (name, birth year and month, sex, hand, squad), often
juniors. The coach policy is read-only. The privacy notices say nothing about the testing app, its accounts or its players
(MKT-16), so no promise was broken, but the notice should say it. A draft is in `Content/PRIVACY-DRAFT-BUYER-ACCOUNTS.md`; it needs your word, and one legal question answered (controller or processor for the players).

### Checked on the live database (2026-10-11, after you ran both files)

Everything below was read-only, or ran inside a block that ended in an error on purpose so that it was undone (re-read afterwards: no
leftover row, no receipt, the receipt counter back at its start). No real person was erased.

- **The pack is in.** The erase function is the final version (a NULL dry-run flag is refused, the `backup` schema is emptied too);
  `erasure_log` and `buyer_notes` exist with row-level security; the version-history trigger is stage52's; `forget_contact()` carries the
  coached-athlete refusal; two triggers move a label written on a buyer account into `buyer_notes`; the two existing notes were copied across
  (2 rows) and every account row's label is empty. The public cannot run the erase function or read either table; a signed-in user who is not you
  gets "coach only" from the function and sees 0 rows of `buyer_notes`; even you cannot write a receipt by hand, only the erase function can. Your
  ⤓ Backup can read both new tables, and its list now covers every public table except the two publish-key tables, which hold retired secrets on purpose.
- **The 13 free signups are gone.** Programmes 52 → 39, free programmes 0, and no row of any of them left in contacts, progress, titles, the
  board or version history; a coached athlete's rows were untouched.
- **Forget (stage45)**, tried on two made-up people: the coached one is refused and keeps every row, the free one is forgotten, a user who is not you
  gets "coach only", the public gets "permission denied".
- **The erase, rehearsed.** A dry run (the default) on one real coached athlete, as you, counted 25 rows: the programme, 8 saved versions,
  3 sessions, the progress blob, the contact record, 2 titles, the board entry, 3 Library sessions, the coaching log, the login row, 2 rows of the
  rename's rollback copy, and the sign-in account; counted again afterwards, the athlete had exactly the same rows. Refused as designed: a NULL flag,
  a mistyped id ("Nothing is stored for…"), `demo`, and a user who is not you. A **real** run on a made-up person (a programme, a contact record with
  Persian digits, a form that matches by email, and a stranger's form), ended on purpose with an error so it was undone: a wrong word was refused;
  the right word, typed in another case, erased 3 rows (the programme, the contact, the matching form), left the stranger's form alone and wrote one
  receipt with the right hash. A course buyer's dry run counted the login and the account. There is no testing-app account yet, so that kind has only
  been tested on the local Postgres.
- **Version history (stage52).** The cut-off function returns the previous cycle's start, else the current cycle's, else 70 days back, for a
  programme of any shape (no cycles, a bad date, a bad index); the live trigger is stage52's. The most versions any athlete holds is 20, the old cap;
  the new rule applies from their next save.
- **The security advisor** shows nothing new from stages 45 to 54: the erase function sits in its *signed-in users can execute* list like every other
  coach-only function and refuses everyone else, and neither new table lacks row-level security. Its older warnings are unchanged (a mutable search
  path on 13 old habit and touch functions, the key-gated athlete functions open to the public, leaked-password protection off).

### The independent review of the erasure work (2026-10-11)

A separate agent attacked stage53, stage54 and the Erase panel for about 70 minutes on a local copy and with read-only queries on the live
database (it wrote nothing to the project). It found one blocker and a list of real gaps; none were caught by the suite that passed before.
Everything below is fixed, with a test that fails without the fix (each one was broken on purpose to prove it).

| Finding | What it did | Fix |
|---|---|---|
| **Blocker: `p_dry_run => NULL`** | `not null` is null, so the typed-word check, the receipt and the dry-run rollback were all skipped while every delete committed: a real erasure with no confirmation and no receipt | NULL is refused (`p_dry_run must be true or false`) |
| **`backup.onename_2026_10_09`** | The rollback copy of the 9 Oct rename holds 42 rows (whole progress blobs of 17 athletes, 24 session logs of 9) keyed by `athlete_id`; the erasure never touched it and its leftover scan read the `public` schema only | Any table in the `backup` schema with an `athlete_id` column is emptied for the person, and the scan covers both schemas. **You can drop the table itself whenever you are sure the rename is right.** |
| **Intake forms almost never found** | Only 6 of 50 athletes would be offered a form (emails only from the Proof contact, which 30 of 52 athletes lack; Latin programme names against Persian form names), and the panel was silent when none matched | WhatsApp numbers are matched too (last 9 digits, Persian digits folded); a number or email another athlete's contact carries is flagged and never ticked for you; the panel says plainly when nothing matched. **Your answer: a finder in the panel lists every other form** (name, email, contact, date), up to 10 per erasure |
| **Revoked buyers** | Their Erase panel was drawn inside the closed *Revoked* section: invisible | The section opens for the person whose panel is open |
| **A key in the wrong case** | `ZZ_Case_A` for `zz_case_a` deleted the login (found by lower-cased email) and left the data, with a receipt | A sign-in that an identity row ties to another id is never taken; the error names the id that exists |
| **Lock order** | The erasure emptied the coaching log before the programme; `publish_cycle()` locks them the other way round: a deadlock, with the publish as the victim. The same order also let a publish's new version rows slip past | Programme first, as the publish does; tested with two sessions, checking both results |
| **A phone saving at the moment of the erasure** | A write the erasure cannot see (uncommitted), or an upsert that waited for it, leaves one row under the erased id | Not closable without changing every athlete function. The person reappears in the roster and a second erase removes it; the final alert says so. Buyers are safe (foreign keys) |
| Wording and state | "Sign-in account included" even for a free Proof athlete; *answer never arrived* told you to look for "nothing is stored" (an erased person is gone from the list); an error that only *looks* final (PostgREST's own connection codes) was reported as "nothing was erased"; a hung call stranded *Erasing…*; the confirm box lost focus on any redraw; the buyer notes read failed silently | Each corrected: the alert claims only what happened, the wording says "gone from the roster = it went through", only errors that prove nothing committed say so, **Stop waiting** after 30 s (a late success still finishes the job), focus is restored, a failed notes read raises the banner (a missing table, before stage53, does not) |
| Leftover check for buyers | Only the four login tables were checked after a buyer's erasure | Any public `uuid` column called `user_id` or `account_id` that still holds the deleted sign-in undoes the erasure |

**What the panel now says stays, because it is true:** your weekly backups; your inbox and WhatsApp; their phone; **any copy on your computer
(`data/<id>.json`, a saved Backup)**; and their **board name in other athletes' last-seen standings** (`lbSeen`: 32 app-data blobs hold 447
names and places; each phone rewrites it from the current board at its next view, so it clears itself).

**Found, not fixable by code (for the record).** Free-text mentions of an erased person in *other* athletes' coaching logs (3 mention an id,
1 a full name today); two athlete ids named in a migration's text (`20260907140013`); the auth audit log is empty because audit logging is
off (if it is ever switched on its entries carry `athlete.<id>@…` and do not cascade).

**A second pass over the fixes (same reviewer, 2026-10-11).** It confirmed the blocker, the lock order, the backup-schema deletion, the revoked
panel and the wrong-case key fixed, and found these, all now fixed with a test that fails without the fix:

| Finding | Fix |
|---|---|
| A preview answer that arrives after the coach cancelled and reopened (Cancel is offered while it loads) overwrote the newer panel: it could flip a running erasure back to *ready*, enable the button and allow a second real call | Only the panel that asked may use its answer |
| A late success after *Stop waiting* sent the page to the roster and closed a panel the coach had opened meanwhile | The page only navigates when no other panel is open |
| A redraw with focus in the confirm box scrolled the page back to it | `focus({ preventScroll: true })` |
| With the intake forms unreadable the finder said "0 other forms" | It says they did not load and is switched off |
| A WhatsApp match was ticked for you (a foreign number with the same last 9 digits, or a handle holding digits, would be wrong) | Only a same-email form is ticked; number and name matches are offered |
| One exotic case still took only the login: identity row lost, data under a mixed-case id, key typed in lower case | "Nothing is stored" now looks at data only; a bare login does not count |
| "1 intake form carryes"; a very long email widened the page on a phone | Grammar and `overflow-wrap` |

Left as they are, on purpose: WhatsApp matching only sees a contact that exists (30 of 52 athletes have none, so 41 of 50 athletes depend on the finder);
a contact field holding two numbers matches the second only; the finder cannot be offered a form the Intake tab could not load.

## 12. Continue here (rewritten 2026-10-11, fourth session)

<!--T12-->191 findings: 187 fixed, 2 partly, 2 open, 0 waiting on you, 0 not a bug (§9 has every row). All 12 critical findings and 32 of the 33 high ones are fixed; the high ones left: TOOLS-4 (open).<!--/T12-->
Pile **B** (eleven things Claude could just do) is **finished**, and so is pile **A** except three things: **A1** waits for you to switch public sign-up off (then Claude reads it back), **A2** is done in both languages (you approved the Farsi lines), and **A3** (the restore path) is being built on PGlite, a throwaway Postgres, with your OK (see its row). **C** is outside the audit and waits for your yes.

**To start a new chat:** *"Continue the Coach's Box audit: read `Content/COACH-AUDIT.md` §12 and `COACH_DASHBOARD.md`. A1: read the sign-up setting back. A2: the Farsi privacy lines are in `Content/PRIVACY-DRAFT-BUYER-ACCOUNTS.md`, I have read them (or: change this). A3: build the restore path on <the Postgres you chose>. Then the items in pile C that I say yes to."*

### A. Your answers (2026-10-11, fourth session) and the jobs they made

Asked with the question tool. Nothing here waits on a decision any more; one item (A1) waits on you to flip a switch.

| # | Finding | Your answer | The job | State |
|---|---|---|---|---|
| A1 | SERVER-14 | You will switch public sign-up off now | I read the project's own public auth settings (`/auth/v1/settings`) and `disable_signup` was **false** (e-mail sign-up on, confirmation required). The 38 accounts are all expected and nothing in the repo calls `signUp` or `signInWithOtp`, so switching it off breaks nothing (athlete and buyer logins are made by the Edge Functions through the admin API). Supabase dashboard → Authentication → Sign In / Providers → User Signups → "Allow new users to sign up" → off. Read it back with `curl -s https://bvipfipbdcyqnbczjmaq.supabase.co/auth/v1/settings -H "apikey: <the publishable key>"` and look for `"disable_signup": true` | **waiting for you**, then read it back |
| A2 | MKT-16 | Publish the privacy text; the buyer decides why the players' data is collected and you only host it (you are the processor) | Put `Content/PRIVACY-DRAFT-BUYER-ACCOUNTS.md` into `privacy.html` (section 2.10, the short version, the retention lines), saying the buyer is responsible for having the right to record their players. `privacy-fa.html` after you have read the Farsi. A written data-processing term for academies is the usual companion before you sell the testing app to one | **done 2026-10-11**, English and Farsi |
| A3 | TOOLS-4 | Yes, build and rehearse a restore path | B3 first (record the live definitions the repo lacks), then a full schema snapshot, a restore script, and one rehearsal on a throwaway local Postgres | **blocked, needs your OK** (2026-10-11): this computer has no Postgres, Docker or Supabase CLI, and the Supabase project is on the free plan (no database branch to rehearse on). Three ways, your pick: (1) **PGlite**, a real Postgres compiled to WebAssembly, installed into a scratch folder outside the repo with npm (`@electric-sql/pglite`, about 10 MB); (2) a **cloud session** (it has Postgres, as `scripts/test_spine_sql.sh` uses); (3) you install Docker. The restore itself has a hard part worth knowing now: the three login tables point at `auth.users`, which a backup does not hold, so a restore re-creates each login (new password, sent again) and re-points the buyers' players to the new account ids |
| A4 | TOOLS-7 | "I don't need that publish programme button and never use it": remove the button and the function | Remove ↑ Publish programme file and its code from coach.html, its harness scenarios, the manual and CLAUDE.md | **done 2026-10-11** |
| A5 | FILE-6 | No expiry | nothing (Mark sent and the first sign-in clear a stored password) | decided |
| A6 | FILE-11, ROSTER-9 | Hide the session and keep it recoverable | A tombstone on `session_history` (a stage file), hide and undo through one coach-only function, every reader leaves hidden sessions out, the athlete app's save must not bring one back, an Undo in the File. Touches program.html | **done 2026-10-11** (stage60; program.html did not need a change: the server keeps the row hidden, and `get_my_history()` already replaces the phone's copy) |
| A7 | TOOLS-11 | Fix the wording | The File tab says the preview shows their programme as they see it, without their logged work | **done 2026-10-11** |
| A8 | FLOW-17, SPINE-11 | Link an application to the athlete it became, and let Handled record an outcome | A stage file (athlete id and outcome on the application), a picker on the card, and the athlete's File shows where they came from | **done 2026-10-11** (stage61) |
| A9 | FLOW-8 | A WhatsApp number on each coached athlete's File | A coach-only function that sets it, a field in the File, the number in the header with a WhatsApp button | **done 2026-10-11** (stage62) |
| A10 | ROSTER-7, ROSTER-12 | A status (active, paused, former), the demo out of the totals, and a ⚙ Tools button for the admin tools | The status stored per athlete and read by `reasonsOf()`; the demo not counted; Coach tools and Logins to send behind one button | **done 2026-10-11** (stage63) |
| A11 | SPINE-12 | Leave it to `/spine` Upkeep | nothing | decided |

Decided earlier, nothing to do: MKT-11 (no payment tracking for now) and WORK-9 (previous-cycle sessions are just labelled), both 2026-10-11.

### B. No decision needed, in this order

| # | Finding | What | State |
|---|---|---|---|
| B1 | TODAY-12 (high) | Every open or refresh downloads every session in full (about 800 KB, 501 sessions and growing, not paged). Load a light summary for the numbers and the rest on demand, read in key order through `selectAll()`. | **done 2026-10-11** |
| B2 | TOOLS-3 (high) | Name an incomplete backup differently (`aa-backup-INCOMPLETE-<date>.json`) and make `scripts/prune_backups.py` leave it out of the 12 it keeps. | **done 2026-10-11** |
| B3 | SERVER-13 | Record the live definitions the dashboard depends on and the repo lacks (the athlete programme door `get_program`, the "which athlete is this" function) as a record file, like stage44, and put the coach email in one constant. It also feeds A3. | **done 2026-10-11** |
| B4 | FILE-9 | A redraw wipes what you are typing in the File tab (the login box, an email pasted into Add past session) and closes Version history and the Coaching log. | **done 2026-10-11** |
| B5 | BROWSER-10, FLOW-22, MKT-13 | One way to report results: a persistent error line for failed saves (the affiliate and intake ones are a 2.6 s toast) and fewer pop-up alerts (53 became 71). | **done 2026-10-11** |
| B6 | TWIN-2, WORK-11, TWIN-3, TODAY-11, TWIN-6, TWIN-9, TWIN-8, TWIN-7 | Make the dashboard judge a day the way the athlete app does: the week-1 and back-off-week RPE caps, the Readiness chart's measure, the 30-hour "in progress" window against `sessionIsStale()`, the retest flag, the quality check's 70% / 12% rules, the checker's name matching. A rule the dashboard copies goes into `scripts/check_twins.js` the same day. | **done 2026-10-11:** TWIN-2, WORK-11, TWIN-3, TODAY-11, TWIN-6, TWIN-9, TWIN-8 and TWIN-7 are fixed |
| B7 | TWIN-1 | The phone and the dashboard resolve a card whose exercise id points at a draft differently. | **done 2026-10-11** |
| B8 | TODAY-3, TODAY-4, TODAY-13, TODAY-14, TODAY-15, MKT-3, MKT-8 | Small truthfulness fixes on Today and the board: a note on a single exercise added after Mark read, your day against the athlete's day, silent failed reloads, overlapping quest runs, the quote-stripping warning, the board's missing "as of" time and the leaderboard's missing reason. | **done 2026-10-11** |
| B9 | FLOW-11, WORK-10 | Undo as a diff: say what changed between two versions, and a one-tap Undo after a save. | **done 2026-10-11** |
| B10 | BROWSER-4, BROWSER-8, ROSTER-11, ROSTER-15, FLOW-7, FLOW-13, SPINE-7 | Phone and reading polish: Back keeps your place, labels under 12 px and coach.html outside the site's style check, tier chips that add up, a Mark read button on Today, a one-tap `/spine add` for a missing exercise, a shorter Spine editor. | **done 2026-10-11** |
| B11 | MKT-6, ROSTER-13, SERVER-10, MKT-15, TOOLS-6, SERVER-12 | Tidying: the two copied buyer-login blocks, file-era leftovers, the Library read, two stale comments, Library re-upload guards, the previous author's name on a database edit. | **done 2026-10-11** |

### C. Outside the audit (found on the way)

- Drop `backup.onename_2026_10_09` once you are sure the 9 October rename is right (§8, item 6).
- `cycleWeekInfo()` in `program.html` reads a cycle's end date as a UTC midnight, so an athlete west of Greenwich is told "Cycle complete" a day early (Tehran and Madrid are right). A one-line fix in the athlete app.
- `backup_supabase.py`, the old stand-alone script, has a 22-table list where the dashboard's ⤓ Backup has 37, and pages rows with no order. Keep using ⤓ Backup; fix or retire the script.
- Five programmes have no login (the demo, a sample athlete and three others); the roster shows "no login" for a real athlete.

### D. How the work was done, so the next chat can do it the same way

- **Read first:** `COACH_DASHBOARD.md` (the manual) and §2 and §6 here. **Tests:** `node scripts/headless/coach/run.js` after any data or write path (made-up athletes, a stubbed Supabase); `sh scripts/test_spine_sql.sh` for any SQL file (a throwaway local Postgres); `node scripts/check_twins.js` for a rule the dashboard copies. `python scripts/test_prune_backups.py` for the backup prune script (14 checks). Break a fix on purpose to prove its test fails without it.
- **Supabase:** project `bvipfipbdcyqnbczjmaq`. SQL with a line-leading `delete` or `drop` makes the tool ask for a confirmation that never reaches Amir, so hand him that SQL as a file for his SQL editor (as `supabase/PASTE-1-run-in-sql-editor.sql` was); the tool can apply the rest. On 2026-10-11 Amir said to ask him whenever his opinion is needed (use the question tool) and gave permission to run SQL without asking. That never covers erasing or deleting a real person's data: he decides those, one at a time.
- **To try a write path on the live database without leaving a trace:** a `DO` block that sets the coach's claims (`set_config('request.jwt.claims', '{"email":"amirardekanian@gmail.com","role":"authenticated"}', true)` and `set local role authenticated`), uses made-up ids (`zz-…`) and ends in `raise exception` carrying the result. The error rolls everything back and its message returns the numbers; read the tables afterwards to prove nothing stayed. Never run Forget or a real erase on a real athlete, even this way.
- **Ship the same day:** branch, pull request, merge (`CLAUDE.md`), then tell Amir to hard-refresh the page.
