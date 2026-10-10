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

**Where it stands:** of 191 findings, 113 are fixed, 54 partly fixed (the harm is gone, something named
in the finding is left), 12 wait on a decision from you, 11 are open (all low or medium) and 1 was not
a bug. Of the 45 critical and high ones, 32 are fixed, 10 partly and 3 are your call; none is untouched.

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
| 6512744 | Small fixes from the re-check: focus ring, Calls and Library failures say so, labelled fields; athlete-login v6 |
| 83dec62 | Coaching logs keep every earlier text (stage47); Forget is off while programmes have not loaded |

**Files changed and why:** `coach.html` (all of the above), `program.html`, `habits.html`,
`tennis/app/app.js`, `tennis-testing/app/app.js` (Farsi-keyboard sign-in only), `sw.js` (cache bump
for that), `supabase/functions/*` (login functions), `supabase/stage44-47*.sql` (record of the
programme tables; Forget guard; server half; coaching-log history), `scripts/test_coach_compare.js` and
`scripts/headless/coach/` (tests), `COACH_DASHBOARD.md`, `CLAUDE.md`, `CODEBASE.md`, `SCHEMA.md`,
`supabase/functions/README.md` (docs).

**Database (applied 2026-10-10):** `save_session()` re-opens a note the athlete edits after it was
read, and lets the coach's import really replace a session; `hab_season_results` readable by the
backup; `coach_season_levels()` (coach only), the level helpers revoked from signed-in accounts;
`exercises` and `qualities` stamp `updated_at` on every update; `coach_login_use()` says which stored
passwords have already been used; `coaching_log_versions` (stage47) keeps every earlier text of a
coaching log. **Deployed:** athlete-login v6,
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

- `node scripts/headless/coach/run.js`: 38 scenarios in a real browser against a stand-in database
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
5. The structure items in §5, one at a time, each with its harness scenario.
6. Run the live dashboard once after this deploy and tap through each tab on your phone.

## 9. Appendix: every finding and where it stands

191 findings. Fixed 113 · Partly 54 · Open 11 · Your call 12 · Not a bug 1.

| Severity | Fixed | Partly | Open | Your call | Not a bug |
|---|---|---|---|---|---|
| critical | 12 | 0 | 0 | 0 | 0 |
| high | 20 | 10 | 0 | 3 | 0 |
| medium | 48 | 30 | 3 | 7 | 0 |
| low | 33 | 14 | 8 | 2 | 1 |

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
| WORK-9 | medium | Sessions from the previous cycle are judged against the new cycle's plan | Partly | A session trained before the current cycle began now shows 'previous cycle' instead of a verdict, plus a banner saying it is being compared with the current plan. | The rows underneath are still compared against the new cycle's plan. Amir still has to choose: hide that comparison, or compare the session with the archived previous cycle. |
| WORK-10 | low | Version history: UTC times, a misleading 'saved' date, no athlete or time in the confirm, restore by id only, 20-version cap | Partly | Version history shows times in your own time zone, the restore confirm names the athlete and the time, a version from a different athlete is refused, and the list says only the last 20 are kept. | There is still no one-tap Undo after a save and no view of which exercises a version changes. Whether 20 versions per athlete is enough is still Amir's call. |
| WORK-11 | low | dayTargetC drops the week note that program.html's dayRpe applies (latent drift) | Open |  | On a lowered day, the dashboard still works out the day's RPE target without the week-1 or back-off-week note that the athlete's app applies, so the two can show different targets. |
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
| TODAY-1 | high | 'Cancel this run' says paid quests keep their XP; cancelling actually takes that XP back from every athlete | Your call | The Cancel this run warning now tells the truth: everyone who already completed a quest in the run loses that XP, on the board and in the app. | Your call: should cancelling a live quest week keep the XP people already earned? That needs a small change on the server and in the app. If un-awarding is what you want, nothing more is needed. |
| TODAY-2 | high | Note backlog is defined and cleared by training date, not by what the coach saw: Clear marks unseen notes read, and late-synced notes skip 'Waiting on you' | Partly | Clear older notes now marks as read only the notes the row counted, matched one by one, and the page updates without downloading everything again. | A note is still sorted by the day the athlete trained, not the day it arrived. A note synced late about a session from more than 14 days ago goes straight to 'older notes' and never shows in Needs you. |
| TODAY-3 | medium | An athlete's note added or changed after Amir marked the session read never returns to 'Waiting on you' | Partly | Since stage46 (applied), when an athlete adds or edits their session note after you marked it read, the session comes back to Needs you. | This only covers the note for the whole session. A note on a single exercise, added or changed after you marked the session read, still stays read. |
| TODAY-4 | medium | Coach line is filed on the server's UTC day but read on the browser's local day; the dashboard assumes the coach's day equals the athlete's day | Partly | Your line to the crew is now saved and read under your own date, so after midnight it no longer overwrites yesterday's line or shows the wrong one in the box. | The wall still assumes your day is the athlete's day. A line from an athlete whose clock has already moved to tomorrow just shows a plain date, not 'tomorrow, their time'. |
| TODAY-5 | high | ACWR divides chronic load by 4 weeks even when only 2–3 weeks exist: every new athlete shows a false 'High load' or 'Climbing' spike in weeks 3–4 | Fixed | The load ratio now averages over the weeks of history the athlete actually has. A new athlete in weeks 3 and 4 no longer shows a false High load or Climbing. |  |
| TODAY-6 | medium | Sessions with no duration or RPE count as zero load, so ACWR and the weekly bars swing with logging gaps and nothing says so | Your call | The load chart now says how many of the last four weeks' sessions have no duration or RPE and count as zero. | Those sessions still count as zero in the ratio and on the roster. Your call: skip them and grey out the ratio, or estimate them from the athlete's usual session. |
| TODAY-7 | medium | Adherence rounds partial weeks up: a new athlete is red after their first session, and a perfectly adherent athlete reads 67–78% in their first weeks | Fixed | Adherence now counts only the days since the athlete started (up to four weeks) and stops at 100%, so a new athlete who trains as planned reads 100%, not red. |  |
| TODAY-8 | medium | Four 'needs attention' numbers count four different things from two drifting trigger lists | Fixed | Today, the roster's reasons, its Needs you group and its sort now all follow one rule. Needs you counts people, the counter is labelled Notes to read, the demo and your own account are left out, and anyone with no activity for 30 days is folded into Gone quiet. The cut-offs (30 days, notes vs people) were set without asking you and are easy to change. |  |
| TODAY-9 | medium | Every render() rebuilds the Today view: an unsent coach line and ticked quest boxes are wiped, including by the automatic levels repaint after boot | Fixed | A line you have typed but not posted, and the quests you have ticked, now stay when the page redraws, including when the Proof levels arrive after opening. |  |
| TODAY-10 | low | Date-only values run through timestamp maths: before noon, yesterday reads 'today' and the 'no session for N days' flag is one day short | Fixed | Days are now counted by calendar date, so before noon yesterday's session no longer reads 'today' and 'no session for N days' is no longer one day short. |  |
| TODAY-11 | medium | Readiness card uses a different 'usual' from the athlete app's REC-2 check, so it can contradict the day level shown on The work | Partly | The Readiness number on an athlete's work tab now shows the verdict their app gave that day (short, lower or normal day, against their usual score). | The Readiness chart behind the Charts button still uses the old measure (soreness included, compared with all-time average), so it can still disagree with the number above it. |
| TODAY-12 | high | session_history is loaded unpaged with select('*'): Today's numbers will silently truncate at the API row cap, and every boot or refetch pulls about 790 KB | Partly | The session list is now read in pages of 1000, so the numbers can no longer be cut off silently when the table grows. | Every open or refresh still downloads every session in full, all text included (about 800 KB and growing). |
| TODAY-13 | low | Refresh never reloads Proof levels, and a failed refetch after a write is silent | Partly | The ↻ Refresh button now loads the Proof levels again (they used to vanish until a full reload). | After a save, only a failed reload of the session list is reported. If the wall, quests, contacts, programmes or progress fail to reload, the page says nothing. |
| TODAY-14 | low | The dashboard's live quest run differs from the app's when runs overlap or are scheduled ahead | Open |  | When two quest runs overlap or one is scheduled ahead, the dashboard can still show a different live run and end date from the one the athletes see in the app. |
| TODAY-15 | low | Copy and docs disagree with the code on the Today tab | Partly | The quest picker says 'Pick 1–4 quests', the start confirm names the quests by title, and the manual is up to date. | The line-to-the-crew box still does not warn that quotes and < > are stripped from what you post. |

### The athlete file (FILE)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| FILE-1 | critical | Athlete file keeps showing pre-write data after restore/publish/call-log delete; the ✎ editor then writes to a different exercise than the row clicked | Fixed | After a restore, a programme-file publish, a failed or refused save, or a deleted call log, the athlete file now rebuilds from the new data, and the ✎ editor refuses to save if the exercise on that line is not the one you clicked. |  |
| FILE-2 | medium | renderDetail has no request guard: a slow load for athlete A paints over athlete B (or over Today) after the coach has moved on | Fixed | Opening an athlete now gets a ticket: if you have already moved to someone else or left the file by the time their data arrives, the late answer is thrown away instead of being drawn over the screen you are on. |  |
| FILE-3 | high | Sessions whose only note is an exercise note count as 'waiting' but have no Mark read button anywhere in the file | Fixed | Any session the counters treat as waiting, including one whose only note is on an exercise, now shows that note with a Mark read button on its day card. |  |
| FILE-4 | high | Every free (Proof) athlete has been locked out since the link retirement, and the dashboard tells the coach they still have a secret link | Your call | Every athlete with a programme but no login (free or coached) now shows 'no login — cannot open the app' on the roster, even once they have gone quiet, and their File tab no longer says they have a secret link. | The free signups are still locked out until you decide whether to create logins and re-invite them or forget them, and the bulk 'Create N missing logins' button still covers only coached athletes who have trained. |
| FILE-5 | high | Login tools trust S.logins blindly: a failed identities read makes the bulk tool silently RESET every existing athlete's password | Fixed | If the login list fails to load, the dashboard says so, hides the bulk button and refuses to create logins, and the server now never resets an existing login on a create: bulk runs skip those athletes and name them. |  |
| FILE-6 | high | Plaintext athlete passwords stay in athlete_identities for weeks and are copied into every weekly backup | Partly | Backups now blank every stored, unsent password (athlete, course and testing-app logins), and an athlete's File tab shows an unsent password with Copy, WhatsApp and Mark sent. | Passwords still sit in the database until you tap Mark sent, because copying the message does not count as sent and nothing expires them. Whether it should is your call. |
| FILE-7 | high | 'Delete all data' deletes only sessions and the progress snapshot; programme, login, coaching log, calls, contacts and more survive | Partly | The button is now 'Delete training history'. It lists exactly what goes and what stays, says how many sessions were deleted, and warns you if nothing was removed. | There is still no single button that fully erases an athlete (programme, login, logs, calls, contact). Whether to build one for privacy requests is your call. |
| FILE-8 | high | Email backfill can file a session on the wrong athlete, on today's date, twice, and drops what the app records | Partly | Adding a past session from an email now warns when the email names a different athlete, has no date filled in for you (you must pick one), warns before replacing or doubling a session for that day, and reads the athlete's whole note. | The email's 'Today: lower day / short day / sore' check-in line is still not read, so an imported session carries no readiness verdict. |
| FILE-9 | medium | Every render repaints the whole athlete file: typed passwords/emails are wiped, open sections close, the card being read collapses | Partly | Redrawing the same athlete no longer flashes a spinner, the day cards you had open and the session you picked stay put, and Mark read updates the page without reloading everything. | A redraw still clears a password you were typing in the login box and an email pasted into Add past session, and it closes Version history and the Coaching log. |
| FILE-10 | medium | Call logs are cached once per page load: a failed read shows 'No call logs yet' and ↻ Refresh never refetches | Fixed | Call logs are kept only when they really loaded; if they fail, the Calls tab itself says they did not load and ↻ Refresh tries again. |  |
| FILE-11 | medium | Deleting a session raises a false 'session not synced' warning and can be undone by the athlete's phone | Your call | Nothing has changed: deleting a session still removes it outright. | A deleted session still sets off a false 'session not synced' warning, and the athlete's phone can put it back. This waits on your call on whether a delete should hide the session and keep it recoverable. |
| FILE-12 | low | Manual and in-app copy still describe retired secret links and data files | Fixed | The File and Work tabs no longer mention secret links or data files. The sign-in address now matches the athlete's tier, and the manual describes logins, Logins to send and what 'Delete training history' removes. |  |
| FILE-13 | low | HTML escaping used inside JS-string onclick handlers (contact email) | Fixed | Values inside button actions (contact emails and the rest) are now passed as proper quoted text, so a quote in a signup's email can no longer break out and run as code. |  |
| FILE-14 | medium | session_history is loaded with an unpaged select; past 1000 rows the athlete file silently loses sessions | Fixed | Session history is now read in pages of 1000 until every row is in, both on load and after a save, so no athlete loses sessions once the table passes 1000 rows. |  |
| FILE-15 | low | Copy cycle prompt: defaults to the oldest cycle, guesses the session window, and loses the text if the clipboard fails | Partly | Copy cycle prompt now picks the newest cycle by default, and if the clipboard fails it shows the text so you can copy it by hand. | It still guesses which sessions belong to the cycle from the call dates rather than the cycle's own start and end, and whether to keep it or retire it for /cycle-report is your call. |
| FILE-16 | low | athlete-login revoke reports success even if the auth user was not deleted | Fixed | Remove login reports an error when the account could not be deleted or the login list could not be read, and says when there was no login to remove. |  |

### Coach tools: backup, publish, logs (TOOLS)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| TOOLS-1 | critical | '↑ Coaching logs' replaces server logs with local files: it wipes every Debrief and publish_cycle splice, with no history and no staleness check | Fixed | The button is now '↑ Add coaching logs' and only creates a log for an athlete who has none, never replacing one; and every earlier text of a coaching log is now kept on the server (stage47), so a bad overwrite from anywhere can be put back. |  |
| TOOLS-2 | high | Unpaged reads silently cap at PostgREST max_rows: session_history (497 rows, about 135/month) passes 1000 around Feb 2027 and the dashboard will drop sessions without an error | Fixed | Session history, progress, programmes, the Spine tables and the backup are now read page by page in a fixed order, so nothing is silently cut off at 1,000 rows. |  |
| TOOLS-3 | high | The backup is not complete, and it cannot tell an empty table from a hidden or failed one: tables are missing, an RLS-empty table reads as 0, partial files look like full ones, and paging is unordered | Partly | The backup now reads every table page by page in a fixed order, checks it got as many rows as the server says exist, and records any table it could not read inside the file and in the INCOMPLETE warning; season results are now readable. | The testing app's player, note and result tables are still not in the backup (waits on your OK for a coach-only server backup), an incomplete file still gets the normal file name, and the prune script cannot tell it from a full one. |
| TOOLS-4 | high | No restore path: the backup has no schema, FK-bound login tables cannot be re-inserted, and the DDL for the core tables is not in the repo | Your call | The recipe for the programme and version-history tables is now written down in the repo (stage44). | There is still no full schema snapshot, no restore script and no rehearsed restore, so a real loss could not be rebuilt from the backup file alone; this waits on your yes. |
| TOOLS-5 | high | '+ Publish article' refuses every article the /article skill writes: it matches category against the category id, but articles carry the display name | Fixed | + Publish article now accepts the category by its name (for example 'Pre-Competition') as well as its id, so articles from the /article skill publish onto the right shelf. |  |
| TOOLS-6 | medium | Library publish has no guard against the wrong file: a .fa.json carrying id+category overwrites the English article, a workout can be published as an article, unpublished items get republished, and a recategorised item is duplicated | Partly | The Library publish now refuses a Farsi translation file and a workout picked as an article (or the reverse), so the English article can no longer be overwritten by its Farsi copy. | Re-uploading an item you hid publishes it again without asking, the confirm does not say which items are new and which replace one, and an item moved to another category is published twice. |
| TOOLS-7 | high | '↑ Publish programme file' is a blind whole-programme overwrite: no filename-to-athlete check, no staleness or diff, and it bypasses publish_cycle()'s guarantees | Partly | Publish programme file now refuses a file whose name does not match the athlete inside it, shows the live programme against the file (cycle, days, when and by whom saved) and warns in capitals when the live one is newer. | After that warning it can still replace a whole existing programme outside the pipeline; whether to limit it to brand-new athletes is your call. |
| TOOLS-8 | medium | After publishing or importing a programme the store is not re-assembled: a new athlete is missing from the roster, and the athlete file keeps showing the old programme | Fixed | After publishing or restoring a programme the roster and the open athlete file are rebuilt from the new copy, so a new athlete appears straight away and the file shows the programme you just put up. |  |
| TOOLS-9 | medium | Load errors for programmes, library, coaching logs and logins are swallowed: the roster shows every athlete with no programme, the Library looks empty, and publish blames a missing category | Fixed | A failed load of programmes, logins, coaching logs or the library shows a 'Not everything loaded' banner, and + Publish refuses while the library is not loaded. |  |
| TOOLS-10 | medium | The legacy data/*.json fallback and 'Move programmes into the database' are dead code that can still fire: on a programs read error from a local server with the gitignored data/ copy, one click would overwrite live programmes with stale files | Fixed | The old local-file fallback and the 'Move programmes into the database' button are gone, and the File tab says 'create one below' instead of pointing at secret links. |  |
| TOOLS-11 | medium | 'View their app / View their Proof' shows the athlete's programme but none of their logged progress, while the File tab promises 'their real data'; it also opens real athletes from ?demo=1 | Your call | From the demo, 'View their app' now opens the public demo programme instead of a real athlete, and the demo uses made-up people. | The preview still shows none of the athlete's logged sets, records or habit days while the File tab promises 'their real data'; whether to load that data read-only or change the wording is your call. |
| TOOLS-12 | medium | Every backup file carries 13 plaintext login passwords (athlete_identities and tps_accounts initial_password), kept on two machines for 12 weeks | Fixed | Every backup now blanks the stored login passwords for athletes, course buyers and testing-app buyers before the file is saved. |  |
| TOOLS-13 | low | Unpublishing a Library item has no button, and unpublished items are invisible in coach.html | Fixed | The Library tab lists every item with a Hide or Publish button, and hidden items sit in a folded 'Hidden' group. |  |
| TOOLS-14 | low | Docs and copy drift around the tools: the manual describes retired controls and data sources, and the skills name a tab that does not exist | Fixed | The manual has the nine tabs, the Coach tools and what each overwrites; the backup file and the manual both say it is data only, what a restore needs, and to keep 12 files with the prune script. |  |

### Athletes (roster) (ROSTER)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| ROSTER-1 | critical | S.ath is only rebuilt by refetch('hist')/loadAll: after a programme publish, restore or failed save the athlete file shows the old programme and an inline edit lands on a different exercise | Fixed | After a publish, a restore or a failed save, the roster and the athlete file rebuild from the live programme. The ✎ editor checks the exercise name and refuses to save if the exercise has moved or the programme changed since the page loaded. |  |
| ROSTER-2 | high | Read errors are swallowed for programs, athlete_identities and contact_list, so the roster silently mislabels everyone and offers a bulk 'Create N missing logins' that resets existing passwords | Fixed | If programmes, logins or contacts fail to load, a banner now names them, and the Create missing logins button is hidden while the login list is unknown. The login service (v5, deployed) skips anyone who already has a login and never resets their password. |  |
| ROSTER-3 | high | All 13 free-tier athletes have no login (locked out since the 2026-09-07 cutover) and the roster gives no sign of it | Partly | Every athlete with a programme and no login now shows 'no login — cannot open the app' on their row and in Needs you, linked to their File tab where you can create one, even after they have gone quiet. | All 13 free athletes still have no login on the server today, and there is no bulk button for them: each one is created by hand from their File tab, or wait for your decision. |
| ROSTER-4 | high | '↑ Coaching logs' on the Athletes tab overwrites server coaching logs wholesale from local .md files, and those logs have no version history | Fixed | Add coaching logs is folded under Coach tools and only adds a log for an athlete who has none; every earlier text of a log is kept on the server (stage47). |  |
| ROSTER-5 | high | 10 initial passwords sit in plaintext in athlete_identities (4 already in use, 9 older than 14 days), shown under 'Logins to send' and copied into every backup | Partly | The weekly backup now blanks every unsent password (athletes, course and testing-app buyers), and the athlete's File tab shows their unsent password with Copy, WhatsApp and Mark sent. | Ten passwords still sit in plain text on the server, all more than 14 days old. Nothing clears them when the athlete first signs in or after a set time, and you still have to tap Mark sent. |
| ROSTER-6 | medium | The 'needs you' rules exist three times and have drifted: roster reasons, roster sort score and the Today panel use different triggers | Fixed | Who needs you is now one rule shared by Today, the roster's reason chips, its Needs you group and filter, and its sort. New signups, unsynced sessions and upgrade leads now show in both places. |  |
| ROSTER-7 | medium | 'Needs you' holds 36 of 49 people: no lapsed or former state, the marketing demo row is counted, and coached athletes who tried Proof once are 'silent on Proof' forever | Partly | Needs you no longer counts the demo or your own account. Anyone with no activity for 30 days, or whose cycle ended more than 14 days ago, is folded into Gone quiet. Coached athletes are no longer flagged as 'silent on Proof'. | The demo still has a row on the roster and is counted in the totals. There is still no way to mark someone active, paused or former, which was left to you. |
| ROSTER-8 | medium | Date-only values are aged with 'T12:00:00' against the wall clock, so before noon a session from yesterday reads 'last today' and idle counts are one day short | Fixed | Dates are now aged in calendar days everywhere, so a session from yesterday reads 'yesterday' before noon and idle counts are right. |  |
| ROSTER-9 | medium | The 'session not synced' warning shows only on the roster, cannot be dismissed, and the coach's own Delete session creates a permanent false one | Partly | An unsynced session now shows in Needs you on Today as well as on the roster, ranked high, and opens the athlete's work tab. | It still can't be dismissed, the work tab doesn't show it next to '+ Add past session from email', and deleting a session yourself still leaves a permanent false warning. |
| ROSTER-10 | medium | Roster ACWR pill: 'low load' and 'climbing' look identical, and idle athletes get an 'ACWR 0' pill that repeats the idle flag | Fixed | The roster's load pill now appears only for a real spike and says it in words (e.g. 'load 1.6 · high load'). Idle athletes no longer get 'ACWR 0'. |  |
| ROSTER-11 | medium | Roster controls: sort resets on any filter tap or refresh, filter chips don't partition the list, empty filter says 'No one matches “”', search is untrimmed and can't find board/contact names | Partly | The sort and search survive a refresh and a filter tap. Search trims and normalises Persian ی/ک and reads board names, contact name, email and WhatsApp digits. An empty filter says 'Nobody in … right now'. | The tier chips still don't add up to Everyone: someone with no programme and no habits ('No file') falls under no tier chip, and 'Proof only' shows even when it is 0. |
| ROSTER-12 | medium | At phone width the admin tools push the roster below the fold: first athlete starts at y≈495 px at 360 px and y≈535 px at 320 px | Partly | Publish programme file, Add coaching logs and Backup are folded into one Coach tools line, and Logins to send folds by itself when more than three are waiting. | On a phone the first athlete still starts low. Measured today with Logins to send folded, it is about 555 px down at 360 px wide and 593 px at 320, lower than before: the tabs now take two rows, and search, sort, the tools line, Logins to send and the filter chips all sit above the list. Where the tools should go is still your call. |
| ROSTER-13 | low | Legacy file-era code still runs: a data/<id>.json fetch for every id without a programme row, the 'Move N programmes' importer, dead normalizeAthleteId/S.keys and 'secret link' copy | Partly | The data/<id>.json fallback and the one-time 'Move programmes' importer are gone, and the File tab and work tab say 'No login yet' and 'No training programme published yet'. | A couple of unused leftovers from the file era (normalizeAthleteId, S.keys, the 'secure links' heading) are still in the code. They are harmless. |
| ROSTER-14 | low | COACH_DASHBOARD.md §4 describes a roster that no longer exists | Fixed | Section 4 of the manual matches the roster: groups, chips, search, load pill, reasons, Coach tools then Logins to send (folded above three). |  |
| ROSTER-15 | low | Small roster and athlete-header inconsistencies (badge counts, labels, reason tone, background re-render) | Partly | Badges count only recent notes; 'Ready to upgrade' has its own green flag; counts of the last 7 days now say 'last 7 days'. | When the Proof levels arrive, the whole page still redraws once. |

### Workflows end to end (FLOW)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| FLOW-1 | critical | Programme and contact writes leave the roster and the open athlete file stale; an edit after '↑ Publish programme file' lands on the wrong exercise | Fixed | After a publish, a restore or a failed save, the roster and the open athlete file are rebuilt from the new programme. The ✎ editor names the exercise it is editing, and it refuses to open or save if that exercise is no longer at the same place. |  |
| FLOW-2 | critical | An inline prescription edit writes the whole in-memory programme with no freshness check, and silently reverts a cycle the pipeline published meanwhile | Fixed | A ✎ save first reads the live programme and changes only that one exercise in it. If the programme changed on the server after the page loaded (for example a new cycle from the pipeline), it saves nothing and tells you to redo the edit. |  |
| FLOW-3 | high | A note written only against an exercise counts as 'waiting on you' but has no Mark read button anywhere (8 of today's 12) | Fixed | A note written only against an exercise now gets the same note box and Mark read button as a day note, so every note that counts as waiting can be cleared. |  |
| FLOW-4 | high | Every auth event re-runs the whole boot: three full loads at open, a full reload on every return to the tab, and background renders wipe whatever the coach is typing | Fixed | The page loads once when it opens and no longer reloads when you come back to the tab or when your sign-in refreshes. Text you have typed (the coach line, ✎ edits, quest picks) survives a redraw, and the sign-in library is pinned to one tested version. |  |
| FLOW-5 | high | 'Needs you' has five definitions, and Today shows the narrowest: notes fill the 10-row cap, while sync gaps, upgrade leads, new applications and cycle ends never appear | Fixed | One rule now decides who needs you, and Today, the roster's reasons, its Needs you group, filter and sort all use it. Today shows one row per person with all their reasons, a 'Show all' button instead of a hard cap, and a line for new applications. |  |
| FLOW-6 | high | Cycle end and renewal are invisible to the coach: endDate is never read, and lapsed clients stay in Needs you as 'No session for N days' for ever | Fixed | The dashboard now reads each cycle's end date. A client shows 'cycle ends in N days' in the last week and 'cycle ended N days ago, renew?' for 14 days after the end, then moves to Gone quiet instead of sitting under 'no session for N days' for ever. The Work tab shows the cycle's dates and the days left. The 14 days is a default you can change. |  |
| FLOW-7 | medium | Reading notes loses your place: a Today row opens the athlete with the note's day closed, and Mark read collapses the open cards | Partly | Tapping a note on Today opens the athlete on that note's day, with the right session picked. Mark read now updates the page in place, so the cards you had open stay open. | There is still no Mark read button on Today itself, so to clear a note that needs no action you still have to open the athlete. |
| FLOW-8 | medium | Login hand-off is spread over three places and ends in a collapsed panel, with no WhatsApp number for most coached athletes; 10 passwords are still waiting | Partly | An unsent password now shows on the athlete's own File tab with Copy message, Mark sent and a WhatsApp button (when a number is known), instead of an alert that disappears. 'Logins to send' opens by itself while three or fewer are waiting. | Most coached athletes still have no WhatsApp number stored, so the button is missing for them, and their number is not shown in the athlete header. Whether to store one for every coached athlete is your call. |
| FLOW-9 | medium | The prescription ✎ is invisible and tiny on a phone (hover-only, 18×24 px) | Fixed | On a phone or tablet the ✎ pencil is always visible and bigger, and the editor's fields are large enough that the iPhone does not zoom in. |  |
| FLOW-10 | medium | On a phone, six of the nine tabs and Refresh sit off-screen, and Today's Needs you starts about 1.6 screens down, below the hero and the whole wall | Fixed | On a phone the four daily tabs fit on one row and the other five scroll on a second row, Refresh sits in the top bar, and on Today Needs you comes before the wall. |  |
| FLOW-11 | medium | Undo means restoring the whole programme from a collapsed list in another tab, with no description of what changed and only 20 versions kept | Open |  | Undo still means opening Version history on the File tab and restoring the whole programme. There is no Undo after an edit and no line saying what changed between versions. Only 20 versions are kept per athlete, and whether to keep more is your call. |
| FLOW-12 | medium | The Spine editor lets the coach rename an entry with no warning, which silently detaches every card that matches it by name (672 of 827 slots have no exId) | Fixed | Renaming a Spine entry that is on live cards is now refused, with a message naming the programmes that use it and asking you to have Claude's /spine do the rename. A name that belongs to another entry is refused too. Refusing was the default choice, so say if you want a warning instead. |  |
| FLOW-13 | medium | The Exercises tab opens on an empty Drafts list (0) with all 319 entries behind a button, no search, and no way to start an entry | Partly | The Exercises tab opens on Approved when there are no drafts, has a search box (name, other names, pattern, equipment, id), and keeps the quality panels folded when nothing needs you. | The 'Not in the Spine yet' list still has no one-tap way (such as a Copy '/spine add <name>' button) to hand a missing exercise to Claude. |
| FLOW-14 | medium | Free, Proof and new-signup athletes open on 'The work' with empty training metrics and stale copy; every Needs you row lands on The work whatever the reason | Fixed | A habit-only athlete (free or Proof) opens on their Proof screen. Rows about Proof silence, a new signup or an upgrade lead open Proof, and an empty Work tab now explains why it is empty instead of mentioning old data files. |  |
| FLOW-15 | medium | Retired migration tools sit on the daily roster screen; '↑ Coaching logs' replaces server logs that publish_cycle now writes | Fixed | The 'Move programmes into the database' button and the old data-file fallback are gone. The coaching-log upload can now only add a log for an athlete who has none, never replace one, and it sits in the folded Coach tools line. It was kept add-only as the default; say if you want it removed. |  |
| FLOW-16 | medium | Calls and 'Copy cycle prompt' are a second, mostly unused end-of-cycle workflow that leaves the app and returns to Today | Your call | Copy cycle prompt now picks the newest cycle by default and never loses the text, but Calls is still a separate tab beside /cycle-report. | This waits on you: is the weekly call log retired, so that Calls can be folded into the File tab and Copy cycle prompt removed? |
| FLOW-17 | medium | Intake is an island: new leads never reach Today, a lead cannot be linked to the athlete it became, and 24 of 64 are still 'new' | Partly | Today now shows 'N new applications' with a link to Intake. | An application still cannot be linked to the athlete it became, and the old 'new' backlog has not been cleared. Both wait on your decision. |
| FLOW-18 | medium | Nothing reminds the coach to take the weekly backup, and the backup button is hidden among roster tools | Fixed | Today shows a 'Weekly backup' row with a Back up now button when no backup has been taken on this computer in 7 days. The Coach tools line on the Athletes tab shows when the last backup was taken. |  |
| FLOW-19 | low | The 'Links' tab is really the Library publisher, cannot unpublish, hides unpublished items and ignores Library Sessions | Fixed | The tab is now called Library. It lists every article and workout, hidden ones included (folded away), and each has a Hide or Publish button and a Copy link. Workouts are shown under their Sessions shelves. |  |
| FLOW-20 | low | After a publish there is no 'published at / by' on the athlete, so the coach cannot check that a cycle landed | Fixed | The athlete's File tab shows when their programme was last saved and by whom, so you can check that a cycle landed. |  |
| FLOW-21 | medium | The manual and in-app copy describe the pre-server system; the manual says 'forget' keeps logs, but it deletes them | Fixed | The manual has been rewritten against the current dashboard. It says Forget permanently deletes the habit log and progress. The screens' empty and Danger-zone text now say exactly what is deleted and what stays. |  |
| FLOW-22 | low | Feedback and confirm patterns are inconsistent across the app (53 alerts, 18 confirms, 73 toasts), and destructive actions warn differently | Partly | The two delete actions (Delete training history and Forget) now say what stays and suggest taking a backup first, and a new login's password shows on the athlete's file instead of in an alert. | There is still no single way of showing results: pop-up alerts went up from 53 to 71, and the backup summary is still an alert. |

### Logic shared with the athlete app (TWIN)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| TWIN-1 | medium | The two Spine resolvers read different catalogues, and the phone falls back to a different approved entry when a card's exId is a draft | Open |  | The athlete app still looks a card up by name when its exercise id points at a draft, and the dashboard still predicts videos and quality coverage from all entries including drafts, so the coach and the phone can show different Spine entries for the same card. |
| TWIN-2 | medium | The coach re-derives the day's adjusted prescription (REC-2 check-in and week notes) from partial inputs, so correct sessions are flagged | Partly | On a sore check-in that halved the jumps, doing exactly half the sets now reads 'half the sets today (sore)' and counts as on plan, and partly done optional work is no longer a miss. | The week-1 and back-off week notes' RPE caps are still not applied when the dashboard judges a lower day, and the athlete app still does not store the targets it actually showed for each exercise. |
| TWIN-3 | medium | The coach's 'Readiness vs their usual' pill uses a different score and baseline from the one that set the athlete's lower or short day | Partly | The Readiness tile now shows the athlete app's own verdict for the latest check-in (normal, lower or short day, its score and their usual) when the check-in has one. | The readiness chart still plots the old composite against all history, and the manual's Readiness section still describes the old rule. |
| TWIN-4 | medium | chips.js is shared at runtime through a hand-bumped ?v= behind a cache-first service worker; nothing ties the bump to a change | Open |  | coach.html still loads chips.js with a hand-typed ?v= number and nothing checks that the number changes when chips.js does, so an edit can be hidden behind the cached old file. |
| TWIN-5 | medium | Passwords are tidied (Persian or Arabic digits folded, ends trimmed) when Amir creates them, but never when the athlete signs in | Fixed | All four sign-in screens (training app, AA Proof, course app, testing app) now fold Persian and Arabic digits in the username, and retry the password once with digits folded and ends trimmed if the typed one fails. |  |
| TWIN-6 | medium | The Live app snapshot calls any unfinished touched day 'in progress', ignoring program.html's sessionIsStale() rule | Partly | The live snapshot now labels an old unfinished day 'started <date>, not finished, a leftover' instead of 'in progress'. | It uses its own 30-hour window rather than the athlete app's rule (another day and 6 hours past the check-in), so for some hours the two can disagree, and there is no guard tying them together. |
| TWIN-7 | low | Personal records: the coach's age is off by one before noon, and the retest flag is parsed three different ways | Partly | Record ages are now counted in calendar days, so yesterday no longer reads 'today' before noon. | The retest flag is still read differently by the dashboard (any text shows as a tag) and the athlete app (only true or 1-10RM counts), and the programme checker still does not reject a bad test value. |
| TWIN-8 | low | The checker's name matching (Python norm_name and the --spine-sql NORM/LOOSE match) is not the apps' exNameVariants | Open |  | The programme checker's Python and SQL name matching is still written separately from the apps' name rules, with no shared test cases. |
| TWIN-9 | low | The Quality check predicts the athlete's day cards from a weekly number; docs claim the coach applies the 70% gate and 12% cut | Open |  | The dashboard's Quality check is still weekly only and never says when a day card will be blank, and PROGRAM-APP.md still says the coach applies the 70% and 12% rules. |
| TWIN-10 | low | Most coach.html twins have no guard; only rxOf, the set-log grammar and the word lists are checked | Open |  | There is still no twin guard script; apart from the prescription, set-log and word-list checks, the dashboard's copies of the app's rules can drift with nothing failing. |

### Driven in a browser (HARNESS)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| HARNESS-1 | critical | Inline exercise edit rewrites the whole programme from the copy loaded at page open: a newer server programme (publish_cycle, /program-edit, another tab) is silently reverted | Fixed | An exercise edit is applied to the live server programme and written only if nobody saved it in between, so a newer cycle can no longer be silently put back. Publishing a programme file warns when the live one is newer. |  |
| HARNESS-2 | critical | The athlete file's cached view (_D) is not invalidated when programmes or call logs reload, so the coach sees stale data and a ✎ edit can land on a different exercise | Fixed | Every programme reload rebuilds the roster and the athlete file, deleting a call log refreshes the file, and the editor checks the exercise name before opening and before saving. |  |
| HARNESS-3 | high | Every auth event reruns boot(): 3 full loads per page open, and every tab return or hourly token refresh reloads everything and throws away what Amir is typing | Fixed | The page reloads only when a different person signs in or you sign out. Coming back to the tab or the hourly token refresh no longer reloads it, and the sign-in library is pinned to version 2.117.3. |  |
| HARNESS-4 | medium | Coach line is filed under the server's UTC date: between local midnight and UTC midnight it overwrites yesterday's line and shows up as yesterday | Fixed | Posting or clearing the coach line now sends your local date, so a line written after midnight no longer overwrites yesterday's. |  |
| HARNESS-5 | medium | Backup pages with unordered OFFSET ranges and stops on any short page: rows lost or duplicated under concurrent writes, and silent truncation if the server page cap is not 1000 | Fixed | The backup reads every table page by page in a fixed order, removes any row read twice, notices when the server sends shorter pages, and lists a table under 'Could NOT read' when fewer rows came back than the server counted. |  |
| HARNESS-6 | medium | The weekly backup file carries plaintext initial passwords for athlete and course logins | Fixed | The backup file now blanks unsent login passwords for athletes, course buyers and testing-app buyers, as recommended; after a restore you reset the login and send a new password. |  |
| HARNESS-7 | medium | 'Delete all data' deletes the athlete's habit log, body weight and records but leaves programme, login and roster row, and its copy names a data file that no longer exists | Partly | The button is now 'Delete training history'. It and its confirm list exactly what goes and what stays, and it reports how many sessions were deleted or that nothing was. | The two deletes are still separate steps, so a failure between them is reported but not undone. Whether there should also be a full 'remove this athlete' option is still Amir's call (for now the copy says to ask Claude). |
| HARNESS-8 | low | Saving an exercise with no change still writes a programme version and turns numeric reps/RPE into strings | Fixed | Saving an exercise with no change writes nothing and says 'No change to save'. Typed reps and RPE are stored as numbers. |  |
| HARNESS-9 | low | Legacy data/<id>.json fallback and the 'Move programmes into the database' UI are still live code | Fixed | The fallback to old data/<id>.json files and the 'Move programmes into the database' button are gone. An athlete with no programme row now reads 'No training programme published yet'. |  |

### Layout, phone, accessibility (BROWSER)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| BROWSER-1 | medium | After a long message the toast never fully hides on phones, it is half-width, and it is not announced | Fixed | The 'Saved'-style message at the bottom now spans the phone width, slides fully out of sight when it hides, and is read out by screen readers. |  |
| BROWSER-2 | medium | The File tab tells the coach that athletes without a login 'still get in through the secret link below', but secret links are dead and there is no link below | Fixed | The File tab now says an athlete with no login cannot open the app (secret links were retired on 7 Sep), an athlete with no programme shows 'no programme row', and the dashboard no longer reads local data files at all. |  |
| BROWSER-3 | medium | Any save that refetches history rebuilds the athlete file: open days collapse, the compared session jumps to the latest one, and half-typed edits are thrown away | Fixed | After a save or refresh the athlete file keeps the days you had open, the session you were comparing, any half-typed prescription edit and your unsent coach line. |  |
| BROWSER-4 | medium | Scroll and context are not managed between views: forward navigation lands mid-page and Back loses the coach's place, search and sort | Partly | A new screen now opens at the top, the roster keeps your search and sort when you come back, and the browser tab title names the screen or athlete. | Going Back to the roster still puts you at the top of the list rather than where you were scrolled. |
| BROWSER-5 | medium | On phones the tab rail hides 6 of 9 sections and Refresh with no hint, and after a reload nothing shows which view is open | Fixed | On a phone the four daily tabs sit on one line and the occasional five on a second line with a fade at the edge, the open tab scrolls into view, and Refresh is in the top bar. |  |
| BROWSER-6 | medium | Low-priority flags render bigger and louder than urgent ones because .fl.note picks up the global .note callout style | Fixed | Low-priority flags on the roster and in The work are now small grey pills, no longer bigger and louder than urgent ones. |  |
| BROWSER-7 | medium | On touch screens the prescription edit pencil is invisible, and many targets are under 32 px | Fixed | On a phone the edit pencil is always visible and finger-sized (about 33 by 39 px), small buttons are taller, and fields are 16 px so the iPhone does not zoom. |  |
| BROWSER-8 | medium | Muted greys, clay text and many sub-12 px labels fail WCAG AA, and the faintest text is the per-set coaching detail | Partly | Grey and clay text were darkened to pass contrast, the comparison header and per-set detail are bigger, and the Exercises filter shows the active choice properly. | Many small labels are still 9 to 10.5 px (table labels, flag pills, the funnel's day captions), and coach.html is still outside the site's style check. |
| BROWSER-9 | medium | daysSince() is off by one before noon: today's weigh-in reads '-1 days ago' and quiet-athlete flags come half a day late | Fixed | 'Days ago' now counts calendar days, so a weigh-in from this morning reads 'today' and quiet-athlete flags come on the right day. |  |
| BROWSER-10 | medium | Save failures are reported three different ways; several write failures are only a 2.6-second toast | Partly | Anything that fails to load (Spine, testing app, course, intake, affiliates) now shows in a banner under the tabs, and most saves check that they really changed something. | Some failed saves (affiliate save or retire, intake status) are still only a 2.6-second message at the bottom, and there is still no single persistent error banner for failed saves. |
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
| MKT-1 | high | Forget on a coached contact deletes that athlete's training-app data (Personal Records, body weight, set logs, check-ins), and the warning says their training stays | Partly | Forget is not offered for coached clients (they show as 'coached · converted'), and it is switched off while the programmes have not loaded, when a coached client could look like a free signup. | The server-side refusal (stage45) is written but not applied: it needs your OK because the database tool asks for a confirmation on anything containing a delete. |
| MKT-2 | medium | Forget is not an erasure: the login stays live, so the person's phone quietly re-creates their data, and the programme, titles and login survive | Your call | The Forget box and the manual now say exactly what is deleted and what stays, and that the login still works. | There is still no full erasure, and the person's login stays live, so their phone can quietly upload their data again; a one-step erasure waits on your decision. |
| MKT-3 | medium | After a Proof write, the board, wall and presence data stay stale until Refresh | Partly | After a Forget the board, wall, contacts and roster are all reloaded, so the person disappears straight away. | Otherwise the board is still kept from the first time you opened it until you press Refresh (for example after cancelling a quest week), and it shows no 'as of' time. |
| MKT-4 | medium | WhatsApp links are built three different ways; 8 of 19 funnel links are invalid and an affiliate number typed in Persian digits gives an empty link | Fixed | The funnel, the Proof tab, Affiliates and the login card all use one WhatsApp link builder that handles Persian digits and Iranian 09 numbers, and a number it cannot read gets no button instead of a wrong one. |  |
| MKT-5 | medium | Plaintext login passwords stay stored and on screen after delivery; 'to send' never clears; every Backup file carries them | Partly | Backups no longer carry stored passwords, and Mark sent now asks first. | Passwords still stay stored and on screen, and still count as 'to send', until you tap Mark sent, even after the person has signed in; clearing them automatically waits on your yes. |
| MKT-6 | medium | Buyer logins are two copy-pasted 129-line blocks, and the third copy (athlete logins) and the edge functions have drifted | Partly | The course and testing-app login functions now report a failed read or write the way the athlete one does (deployed as v3). | The Testing app and Course tabs are still two copied blocks, the athlete login buttons still have no double-tap guard, and the course login function's header still names the retired private repo. |
| MKT-7 | low | 'Mark sent' does not check that a row changed, and erases the only stored password without asking | Fixed | Mark sent, for athletes and both kinds of buyer, now asks before clearing the stored password and reports a failure if nothing on the server changed. |  |
| MKT-8 | medium | A failed load of Testing app or Course logins shows '0 active · No logins yet' and is never retried | Partly | If testing-app or course logins fail to load, the tab now says so with a Try again button and offers no Create, instead of showing 'No logins yet'. | When the leaderboard fails to load it still just says it couldn't fetch the board, with no reason. |
| MKT-9 | medium | The Library can publish but not unpublish; unpublished items are invisible and toggleLibraryItem is dead code | Fixed | Every Library item has a Hide or Publish button (with a confirm), and hidden items are listed under a folded 'Hidden' group. |  |
| MKT-10 | low | Links offers only the in-app deep link; the public English and Farsi article pages are never offered | Fixed | Each article now has Copy App, Copy Web · FA and Copy Web · EN buttons, workouts keep Copy App, and items are grouped under their category name. |  |
| MKT-11 | medium | An affiliate code's 'uses' counts intakes, not paying clients, yet it is documented as the commission list; typed codes are matched too strictly | Partly | Each code card now counts applications (archived ones left out), says plainly they are not payments, and matches codes typed with spaces, Persian digits or any case. | The apply forms and the server's code check still reject a code typed with a space or Persian digits, codes that match no affiliate are not shown anywhere, and tracking who actually paid waits on your decision. |
| MKT-12 | low | The 'free signups' funnel includes coached clients, and reads tier from a second copy | Fixed | The funnel takes each person's tier from their programme, counts only free signups in its headline, and lists coached clients separately as 'coached · converted'. |  |
| MKT-13 | low | Four different feedback patterns for the same kinds of action across these tabs | Open |  | Results still come back four different ways: a buyer login create shows a blocking pop-up while an athlete one shows a short toast, and errors are pop-ups in some tabs and toasts in others (only Mark sent gained a confirm). |
| MKT-14 | low | Buyers can read Amir's private 'who bought it' note (and their stored password) through the buyer-read policy | Your call |  | A buyer can still read the private note you write about them (and their stored password) through their own account; moving it out of their reach waits on your call. |
| MKT-15 | low | Docs and comments contradict the code: forget, data sources, AMIR_ATHLETE_ID, and the tps-login header | Partly | The manual now says what Forget really deletes, lists the affiliates, library and buyer tables, has short Library, Testing app and Course sections, and no longer claims every write goes through a guarded function. | The code comment still says the board is fetched through your own athlete identity, the course login function's header still names the retired private repo, and the manual says the stage45 server refusal is in place when it is not applied yet. |
| MKT-16 | low | Buyers cannot be erased from the dashboard, and the privacy notices do not mention buyer accounts | Your call |  | There is still no way to erase a buyer from the dashboard, and the privacy notices still do not mention course or testing-app accounts; both wait on your decision. |
| MKT-17 | low | Funnel onclick handlers broke on an apostrophe in an email (an injection pattern); already fixed in the working copy | Fixed | Funnel buttons now pass emails and ids safely, so an apostrophe in an email can no longer break the button or run as code. |  |

### Exercises (the Spine) and Intake (SPINE)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| SPINE-1 | critical | Saving an entry rewrites every field from the page-load copy, reverting anything Claude's pipeline wrote since (no updated_at guard) | Fixed | Saving an exercise now sends only the boxes you changed, reads the entry fresh first, and refuses (showing both values, keeping your typing) if Claude or another tab changed the same box since you opened it. |  |
| SPINE-2 | high | A failed load of the coach half (or the Spine itself) is swallowed and cached; the next save wipes SFR, restriction flags, counts, cost and notes | Fixed | If any part of the Spine fails to load, the Exercises tab says what did not arrive, offers Try again, and will not let you save, so blanks can no longer be written over real counts, SFR, flags or notes. |  |
| SPINE-3 | high | Renaming an entry (or adding a colliding alias) is one Save with no check, and detaches every card that finds it by name | Fixed | Renaming an entry that live cards use, or giving it a name another entry already has, is refused with the list of athletes affected and sent to Claude's /spine (the safer of the two options in the open question, listed in the audit report so you can overrule it). |  |
| SPINE-4 | high | 'Who is doing it', the athlete counts and the Coverage meter ignore every exercise inside a circuit | Fixed | Coverage, 'Doing it now', the athlete counts and 'Not in the Spine yet' now count exercises inside circuits too. |  |
| SPINE-5 | medium | Two-table save is not atomic: on a coach-half failure the alert is followed by a success toast and the typed values are thrown away | Fixed | If the coach-only half fails to save, there is no 'Saved' message any more: it says the entry saved but the counts/SFR/flags/cost/notes did not, and keeps those typed values in the form to save again. |  |
| SPINE-6 | medium | No unsaved-change protection: every click redraws the whole tab, losing typed edits and jumping the page | Fixed | Typed work in the editor and in the quality texts survives redraws, and opening another entry, switching the list, Refresh, leaving the tab or closing the page with unsaved changes asks first; the row you tap stays under your finger. |  |
| SPINE-7 | medium | Finding and working an entry is slow: the tab opens on an empty Drafts list, there is no search, and the editor is 1300-2400 px with Save at the bottom | Partly | The tab opens on Approved when there are no drafts, has a search box, marks the active filter properly, shows who is doing it at the top, and keeps the Save bar on screen while you scroll. | The editor is still one long form; the body map and the coach-only part are not folded away. |
| SPINE-8 | medium | 'Move back to draft' takes an entry (or a quality) off every phone in one tap, next to Save, and also saves the form | Fixed | 'Move back to draft…' now asks first and says how many athletes would lose it, and on an exercise it sits away from Save at the other end of the bar. |  |
| SPINE-9 | medium | Intake WhatsApp links are built from any digits in the contact, so handles and emails become wa.me links to wrong numbers | Fixed | An intake contact only becomes a WhatsApp link when it is a real phone number (Persian digits, 00, +98 and 09… handled); Instagram handles and emails stay plain text with a Copy button. |  |
| SPINE-10 | low | Farsi intake answers render left-to-right in a Latin monospace font | Fixed | Farsi intake answers now read right to left in the page's normal font, and Farsi lists are joined with the Persian comma. |  |
| SPINE-11 | low | An intake card is a dead end: no step from a lead to onboarding, and 'Handled' cannot say what happened | Not a bug | Nothing changed: the Intake tab is still a plain inbox, which is its documented job (the verification refuted this as a defect). | Whether Handled should record an outcome or link a lead to the athlete it became is your call (listed as a later structure item in the audit report). |
| SPINE-12 | low | Links saved from the editor are one-way, and typed names can link to a different version through loose name tiers | Partly | A typed link now only matches an entry by its exact name (no more linking to a different version through loose matching), and the editor lists the links that do not point back yet. | Saving a link still writes only one side; whether the editor should add the way back itself or leave it to Claude's /spine Upkeep is your call. |
| SPINE-13 | low | Values outside the editor's lists are silently dropped or reinterpreted on save | Fixed | A stored value the lists do not know is shown and kept, extra qualities without a primary are refused, SFR must be a whole number, a muscle named twice is refused, and 'quadriceps' and 'hams' are understood. |  |
| SPINE-14 | low | Manual and on-page text drift from the code | Fixed | The manual's Exercises section and the on-page labels now describe what the editor really does (only muscles reach the phone, never SFR, flags, cost or notes; programmes with workouts only; circuits counted). |  |
| SPINE-15 | low | loadSpine reads the Spine with plain selects, which PostgREST caps (1000 rows by default) without an error | Fixed | The Spine, its coach half and the qualities are now read in pages, so nothing is cut off past 1000 rows, and a short read is reported. |  |

### Database and login functions (SERVER)

| ID | Sev | Finding | Status | Now | Still |
|---|---|---|---|---|---|
| SERVER-1 | medium | Plaintext login passwords stay on the server after the person has already signed in, so 'Logins to send' overstates who is waiting | Partly | Logins to send (athletes, course and testing-app buyers, and the athlete's File card) now marks a stored password 'signed in with it' once the person has used it, so the list no longer overstates who is waiting. | The plain-text password still stays on the server until you tap Mark sent; clearing a used one automatically is waiting on your call. |
| SERVER-2 | medium | The backup says INCOMPLETE every week (hab_season_results is unreadable), and testing-app buyer data is never backed up | Partly | Season results can now be read by the backup, so the weekly backup no longer says INCOMPLETE because of that table, and every table is paged in key order with repeats removed and short reads reported. | Testing-app buyers' players, notes and results are still not backed up; that needs you to agree the coach may read them. |
| SERVER-3 | medium | Importing a past session over an existing one keeps the old set-by-set log, so the athlete and the coach see different sessions | Fixed | Adding a past session over one already logged on the same date now really replaces it, set-by-set log included, so you and the athlete see the same session and the warning box tells the truth. |  |
| SERVER-4 | medium | A note the athlete edits after Amir marked the session read never comes back to 'needs you' | Fixed | When an athlete edits a note after you marked the session read, it comes back to 'needs you'; re-saving the same note does not. |  |
| SERVER-5 | medium | Forget (forget_contact) cannot deliver what the privacy notice promises, the manual says the opposite of what it does, and the screen keeps showing the forgotten person | Your call | The manual and the Forget box now say exactly what Forget deletes, the screen refreshes after it, and the page refuses Forget for coached clients. | There is still no one-step full erasure matching the privacy notice (your call), and the server-side refusal for coached clients (stage45) is not applied yet. |
| SERVER-6 | medium | Spine and Quality saves overwrite without a freshness check and keep no history | Partly | Spine and quality saves now check freshness (only changed boxes, refused if someone else changed the same box), and the server stamps the time on every change to exercises and qualities. | There is still no version history for Spine entries (coaching logs got one, stage47), so an overwritten cue can only be restored from a backup. |
| SERVER-7 | medium | 13 free Proof users have had no way into the app since the 2026-09-07 key cutover, yet the funnel still scores them | Your call | Each locked-out person's roster row now keeps saying 'no login — cannot open the app', even once they have gone quiet. | The 13 free Proof users still have no login; whether to create logins and re-invite them, or forget them, is your call. |
| SERVER-8 | low | Level functions run with the owner's rights and have no access check: any signed-in athlete or buyer can read any athlete's level or mint their titles | Partly | Career level, title minting and note purging can no longer be run by athletes or buyers, and coach.html reads every level in one coach-only call. | The season-level helper is still callable by any signed-in account until it is revoked on the server after this version of coach.html is live. |
| SERVER-9 | low | Five remaining direct writes cannot tell a write that changed nothing from a success; Delete training history is two separate deletes | Partly | Mark sent (athletes, course, testing app) and Library Hide/Publish now confirm a row really changed, and Delete training history says how many sessions went and warns when nothing did. | Delete training history is still two separate deletes, so a failure halfway is reported but not prevented. |
| SERVER-10 | low | Reads that are not paged and full-table refetches: nothing is at the cap yet, but several tables are heading there | Partly | Mark read and Clear older notes update the page's own copy instead of re-downloading every session, and the Spine tables are read in pages. | The Library list is still read in one request (small today, far from the cap). |
| SERVER-11 | low | Login edge functions ignore the error on their follow-up table write after a successful ban or password change | Fixed | All three login functions (athlete v6, course and testing app v3) report a failed account read and a failed bookkeeping write instead of ignoring it. |  |
| SERVER-12 | low | Version history keeps 20 entries per athlete, and an SQL writer that does not set updated_by inherits the previous author's name | Open |  | Version history still keeps only the last 20 saves per athlete (how many to keep is your call), and a database edit with no signed-in user still shows the previous author's name. |
| SERVER-13 | low | Core server objects behind coach.html have no source in the repo; the manual describes an older contract; the coach email is hard-coded in about 25 places | Partly | The programme tables, their access rules, the coach check and the version-history trigger are now written down in the repo (stage44), and the manual was rewritten against the code. | The athlete's programme door and the 'which athlete is this' function still have no copy in the repo, and the coach email is still typed into many places. |
| SERVER-14 | low | The coach check trusts the email claim alone; whether public sign-up is open cannot be verified from here | Open |  | The coach check still trusts the email address alone; someone needs to confirm in the Supabase dashboard that public sign-up is off, and optionally tie the check to your account id. |
