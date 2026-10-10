# The Coach's Box audit (coach.html), 2026-10-10

What was checked, what was wrong, what changed, and what is still open. Written for Amir; the
technical detail behind each line is in the commits named, the harness in
`scripts/headless/coach/`, and `COACH_DASHBOARD.md` (the manual, brought back in line with the code).

**How it was done.** 191 findings from 13 independent passes over the dashboard and everything it
talks to (the athlete app, AA Proof, the database, the three login functions, the course and testing
apps), each one checked again by a separate reviewer told to disprove it: 186 held, 4 were plausible
but not provable from here, 1 was wrong. The write paths were then driven for real in a browser
against a stand-in database (36 scenarios, made-up athletes), before and after the fixes.

## 1. In one paragraph

The dashboard looked right and mostly was, but it trusted the copy of the data it loaded when the
page opened. Claude's pipeline writes the same records while the page sits open (a new cycle, a
Spine entry, a coaching-log Debrief), and several saves wrote the old page copy back over that work
without a word. Separately, a failed read or a refused write usually looked exactly like an empty
list or a success. Those two habits caused every critical and most high findings. Both are fixed
at the root: every save that can collide now reads the live record first, sends only what changed,
and refuses with both values shown when someone else changed the same thing; every read that can
fail says so in a banner, and every write asks for its rows back.

## 2. The system, as it is now

**Nine tabs in two groups.** Daily: Today · Athletes · Intake · Exercises. Now and then: Proof ·
Library · Affiliates · Testing app · Course. An athlete opens as a file with four screens:
The work · Proof · Calls · File.

| Feature | Reads | Writes | Shares logic with |
|---|---|---|---|
| Today: Needs you, wall, coach line, quest week, notes to read | everything in memory; `hab_notes`, `xp_rules` | `set_coach_note`, `hide_note`, `set_quests`, `clear_quests`, `session_history.coach_status` | the roster (`reasonsOf()`, one rule) |
| Athletes: roster, logins, backup, publish a programme file, add coaching logs | `programs`, `athlete_progress`, `session_history`, `athlete_identities`, `coaching_logs` | `programs` (file publish), `coaching_logs` (create only), athlete-login function | `athletesNeedingLogin()` |
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
was four). These are guarded by `scripts/test_coach_compare.js` (72 assertions) and the word-list
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
for 30+ days; readiness shows the app's own stored verdict; load and adherence are pro-rated; the
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
level through the level helpers (SERVER-8). **Now:** Forget is refused for coached clients in the
dashboard (the server-side refusal is written, stage45, and waits for your confirmation to apply),
backups blank stored passwords, the level helpers are coach-only. Full erasure is a decision (§7).

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

**Files changed and why:** `coach.html` (all of the above), `program.html`, `habits.html`,
`tennis/app/app.js`, `tennis-testing/app/app.js` (Farsi-keyboard sign-in only), `sw.js` (cache bump
for that), `supabase/functions/*` (login functions), `supabase/stage44-46*.sql` (record of the
programme tables; Forget guard; server half), `scripts/test_coach_compare.js` and
`scripts/headless/coach/` (tests), `COACH_DASHBOARD.md`, `CLAUDE.md`, `CODEBASE.md`, `SCHEMA.md`,
`supabase/functions/README.md` (docs).

**Database (applied 2026-10-10):** `save_session()` re-opens a note the athlete edits after it was
read, and lets the coach's import really replace a session; `hab_season_results` readable by the
backup; `coach_season_levels()` (coach only), the level helpers revoked from signed-in accounts;
`exercises` and `qualities` stamp `updated_at` on every update; `coach_login_use()` says which stored
passwords have already been used. **Deployed:** athlete-login v5,
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

- `node scripts/headless/coach/run.js`: 36 scenarios in a real browser against a stand-in database
  (made-up athletes): every save, delete, login, backup and import path, the auth events, the Spine
  editor (Claude's work survives, a clash is refused, a failed load offers nothing to save, renames,
  unsaved work), WhatsApp links. Before the fixes: 32 failing checks. Now: 0.
- `node scripts/test_coach_compare.js`: 72 assertions over the plan-vs-logged compare (renames,
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

**Waiting on you:**
1. **The 13 free Proof signups have had no way into the app since 7 September** (FILE-4, SERVER-7):
   create their logins and re-invite them, or forget them?
2. **Apply the Forget guard on the server** (stage45). The database tool asks for a confirmation on
   anything containing a delete, and nobody was there to give it. Say "apply stage45" and it is one
   step.
3. **Cancelling a quest week takes back the XP already earned** (TODAY-1). The box now says so. Should
   athletes keep it instead (a small server and app change)?
4. **Stored passwords:** may the server clear one automatically once the person has signed in with it
   (SERVER-1, MKT-5)? 13 are still stored and 8 of them already used; the lists now mark those
   "signed in with it", so you can clear them by hand today.
5. **A full erasure** for a person (programme, login, logs, sessions, titles) in one confirmed step,
   to match the privacy notice (MKT-2, SERVER-5), and one for buyers (MKT-16)?
6. **Testing-app player data is not in the backup** (SERVER-2): the coach has no read policy on those
   three tables. Add one (you would be able to read buyers' player results)?
7. **Version history keeps 20 saves per athlete**; one athlete is at 20 (WORK-10, FLOW-11, SERVER-12).
   Keep 20, or keep everything from the current and last cycle?
8. **Sessions from the previous cycle** are now labelled and not judged against the new plan
   (WORK-9). Compare them against the archived cycle instead?
9. **Session with no duration** counts as no load (TODAY-6): skip and say so, or estimate?
10. **Commission:** affiliate "uses" count applications, not payments (MKT-11). Track conversions?
11. **Buyers can read the label you write about them** (MKT-14). Move it out of their reach?
12. **Is the weekly call log retired?** If yes, Calls folds into File (FLOW-16, FILE-15).

## 8. Next steps, ranked

1. Decision 2 (apply stage45): one step, closes the last server gap behind a critical-class finding.
2. Decision 1 (the 13 locked-out free users): the top of the funnel is closed for them today.
3. Decision 4 and 5 (passwords and erasure): what the privacy notice already promises.
4. A server function for "Delete training history" and the Spine save (one transaction each), so a
   half-finished two-table write cannot happen (SERVER-9, SPINE-5).
5. A coaching-log version history like programmes have (TOOLS-1's second half).
6. The structure items in §5, one at a time, each with its harness scenario.
7. Run the live dashboard once after this deploy and tap through each tab on your phone.

## 9. Appendix: every finding and where it stands

The status of every finding is being re-checked against the current code; this table is filled in from that check in the next commit.
