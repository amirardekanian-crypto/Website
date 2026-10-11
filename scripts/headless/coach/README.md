# coach harness — coach.html in REAL mode against a fake Supabase

Built during the coach.html audit (2026-10-10, `Content/COACH-AUDIT.md`). It drives `coach.html`
(not `?demo=1`) in headless Chromium with a stubbed `window.supabase`, so the write paths that demo
mode turns into no-ops actually run, and checks both the payload that leaves the page and what the
screen shows afterwards. Every check is written as the CORRECT behaviour: a FAIL is a defect.

All data is MADE UP (`fixtures.js`: ava_test, ben_test, eli_new, cara_free, dan_proof …, addresses at
`example.invalid`). This repo is public: never seed it with real athlete data, and never point it at
the real Supabase project.

**Run it after any change to coach.html's data or write paths** (the editor, saves, loads, auth,
backup, logins, deletes). On 2026-10-10 it went from 32 failing checks to 0.

## Run

```
# 1. serve the repo (any port; COACH_BASE overrides the default)
cd <repo> && python3 -m http.server 8765 --bind 127.0.0.1 &

# 2. the scenarios
node scripts/headless/coach/run.js              # all of them -> $OUT/results.json, backups, screenshots
node scripts/headless/coach/run.js editor backup  # only ids containing one of the words
sh scripts/headless/coach/run-parallel.sh [3]    # the whole suite in 3 parallel shards (SHARD=i/n), one summary: about a third of the time
COACH_BASE=http://127.0.0.1:9000 node scripts/headless/coach/run.js

# 3. (optional) the REAL supabase-js, for the auth events: vendor it once, outside git
cd scripts/headless/coach && mkdir -p vendor-src vendor && cd vendor-src \
  && npm pack @supabase/supabase-js@2.117.3 && tar -xzf supabase-supabase-js-2.117.3.tgz \
  && cp package/dist/umd/supabase.js ../vendor/ \
  && echo '{"supabaseJs":{"package":"@supabase/supabase-js","version":"2.117.3","file":"dist/umd/supabase.js"}}' > ../vendor/VERSION.json
node scripts/headless/coach/reallib.js           # which auth events reach onAuthStateChange, and how many loads
```

`vendor/`, `vendor-src/` are gitignored. Output goes to `$OUT` (default: `<tmp>/coach-harness-out`),
never into the repo. Playwright and Chromium are found where the cloud container keeps them; elsewhere
set `PLAYWRIGHT` (its module path) and `CHROMIUM` (a browser binary). coach.html pins supabase-js
2.117.3; bump the pin and the version here together.

## Files

| file | what |
|---|---|
| `stub.js` | the fake supabase-js v2 client, injected by `addInitScript` before the page's scripts. In-memory DB (`window.__DB`, persisted to localStorage `__harness_db` so a reload keeps it), a chainable thenable query builder (select/eq/neq/in/gte/lte/gt/lt/is/like/order/limit/range/maybeSingle/single/insert/update/upsert/delete/match/not/or/filter, `.select()` after a write returns the rows, `{count:'exact'}`), the RPCs coach.html calls (emulated from their SQL: `set_coach_note` defaults `p_day` to the UTC date like `CURRENT_DATE` on the UTC server), `functions.invoke` for `athlete-login`, auth (`getSession` = signed-in coach; `onAuthStateChange` stores callbacks in `window.__authCbs` and fires `INITIAL_SESSION` like the real v2 client). The `programs` BEFORE UPDATE trigger is emulated (snapshot into `program_versions`, keep 20, bump `updated_at`). Every call lands in `window.__calls` with filters, modifiers and payload. |
| `fixtures.js` | `buildSeed({today, bigHistory, stub})`: the made-up rows, column names taken from `information_schema` on 2026-10-10. |
| `lib.js` | `openCoach(browser, {hash, tz, fixedTime, seed})`: new context, routes jsDelivr's supabase-js to an empty script and every other outside host to 204, seeds, injects the stub, opens the page, auto-accepts confirm/alert (recorded in `log.dialogs`; `dismissDialogs(page, log)` in run.js answers No to confirms instead). Helpers: `calls`, `callsSince`, `db`, `go`, `jsClick`, `loadAllCount`, `toastText`, `failText` (the bar of lines that stay until dismissed). Every new line in that bar is also pushed to `log.dialogs` as an `alert` with `via: 'bar'`, so a check that asks "was the coach told X?" finds it whether it was a pop-up or a line; filter `d.via !== 'bar'` to see only real pop-ups. |
| `run.js` | the scenarios (below). |
| `reallib.js` | loads the REAL supabase-js UMD (vendored, step 3) with a fake stored session and answers every Supabase request locally; counts store loads at page load and after a hidden→visible tab switch, and logs the auth events. |

## Knobs (set in a scenario with `page.evaluate(() => …)`)

- `window.__STUB.fail.push({kind:'from'|'rpc'|'fn', name, op?, message, status?, times})` — make the next call(s) fail.
- `window.__STUB.rlsDeny.<table> = ['update','insert','delete']` — the write "succeeds" with zero rows, like PostgREST under RLS.
- `window.__STUB.maxRows` (seed `stub.maxRows`) — PostgREST max-rows cap, default 1000.
- `window.__STUB.missingRpc = ['coach_save_spine']` — those RPCs answer "Could not find the function" (a server that has not had the stage applied).
- `window.__sqlWrite(table, id, patch)` — a write with no signed-in user (Claude's `/spine`, the SQL editor): fires the version trigger as `sql`.
- `window.__STUB.delay.<name> = ms` — extra latency.
- `window.__STUB.afterSelect = (table, call, DB) => {}` — mutate the DB between two reads (concurrency).
- `window.__fireAuth('TOKEN_REFRESHED' | 'SIGNED_IN' | …)` — call every stored onAuthStateChange callback.
- Mutate `window.__DB.<table>` directly to simulate another writer (the pipeline's `publish_cycle`, another tab).
- `openCoach(b, {tz:'Asia/Tehran', fixedTime:'2026-10-09T22:00:00Z'})` — page clock and time zone.

## Scenarios (2026-10-11: 69 scenarios; 32 failing checks before the audit's fixes, 0 after)

| id | covers | before the fixes |
|---|---|---|
| boot-double-load | loads per page open | 2 with the stub, 3 with the real library (now 1) |
| editor-save | ✎ → sets/reps/RPE → Save: payload (guarded by `updated_at`), program_versions, redraw, no-op save | no concurrency guard; no-op save wrote a version; numbers became strings |
| editor-save-error | server refuses the save | the row kept showing the failed value |
| editor-stale-overwrite | pipeline publishes after load, then an inline edit | the new cycle was silently reverted |
| editor-zero-rows | update matches no row | "Saved" toast |
| editor-wrong-exercise | the programme replaced on the server and reloaded (`reloadPrograms`) while an athlete was viewed earlier, then ✎ on their page | the edit landed on a different exercise |
| auth-TOKEN_REFRESHED / auth-SIGNED_IN | open editor with typed values, auth event | full reload, editor gone |
| auth-SIGNED_IN-forms | Spine editor / coach line / affiliate form with typed text | Spine editor stayed open with old text; others wiped |
| note-mark-read | Mark read | ok |
| coach-line-utc / coach-line-tehran-0130 | post + take down the coach line | no p_day; 00:00–03:30 Tehran overwrote yesterday's line |
| wall-hide, intake-status, affiliates, spine-approve, login-create, session-import-delete | the other writes | ok (login-create now checks the in-place password card) |
| quest-week | start a quest week, then End this run today | (2026-10-11, stage55) the button was *Cancel* and called `clear_quests`, which took the XP back from everyone; it now calls `end_quests(start, today)`, the run stays with an `end` day, the panel says *ended early* |
| quest-week-end-fails | End this run when stage55 is not applied | must name the missing file, change nothing and never fall back to `clear_quests` |
| backlog-clear | Clear older notes | now: one update per counted note, by key |
| backlog-late-note | a 30-day-old session whose note arrived today; a note trained 12 days ago but delivered today beside yesterday's | filed by training day: skipped Needs you and went into *older notes* (second session; failed 10 checks on the old code) |
| calllog-delete | the Calls tab is retired (2026-10-11): old call logs are read and deleted in File → Old call logs; no Calls tab, no New call log, no Copy cycle prompt; the section disappears when none is left | the deleted log stayed listed |
| calls-old-link | an old `#a/<id>/calls` link | must open the athlete on a screen that exists |
| load-partial | a session in the last 4 weeks with no duration or RPE, then two, then filled in, then an old one | (TODAY-6) it counted as zero and the ratio swung; now the ratio is left out and the pill says *not enough data* until they are filled in |
| erase-athlete | File → Danger zone → Erase completely…: the dry run, the typed id, three offered intake forms (same email and same WhatsApp number ticked, same name not), the rollback copies in the count, one real call, the receipt alert names the forms | (stage54) no way to erase a person from the page |
| erase-forms | the finder: a number another athlete's contact carries is flagged and not ticked, a search finds any other form, 8 shown at a time, the cap of 10, *remove*, focus kept while typing and across a redraw, a ticked form that no longer exists stops the erasure, an athlete with no login gets no "sign-in account" claim | (review, 2026-10-11) forms were found for 6 of 50 athletes and the rest could not be removed at all |
| erase-revoked | Erase… on a REVOKED course buyer and testing-app buyer: the Revoked section opens and the panel is visible, also after a redraw | (review) the panel was drawn inside the closed section |
| erase-slow | the server does not answer: after 30 s *Stop waiting*, and a success that arrives later still finishes the job (fake clock) | (review) a hung call stranded *Erasing…* |
| erase-guards | wrong id + Enter, Cancel, leaving the page with the panel open, the board identity | a wrong id must call nothing; the panel never follows the coach to another screen |
| erase-fails | stage54 missing, a refusal, a server error, a lapsed sign-in, a deadlock (proves nothing committed), PostgREST's own `PGRST001` and an answer that never arrives (neither proves it) | the words must fit the cause; "never arrived" must not claim nothing was erased |
| erase-buyers | Course and Testing lists: the note comes from `buyer_notes`; Erase… on a course buyer and on a testing-app buyer (players, notes, results) | (stage53/54) the buyer could read the note; buyers could not be erased |
| buyer-notes-fallback | `buyer_notes` missing (stage53 not applied) | the old label shows, nothing breaks, and no banner (expected) |
| buyer-notes-error | `buyer_notes` fails for a real reason | (review) every buyer showed with no note, silently; now the banner names *your notes about buyers* |
| version-restore | Restore a version, then The work | showed the pre-restore programme |
| no-program-file-button | Athletes → Coach tools after the upload button was removed (pile A4, 2026-10-11) | the line offers Add coaching logs and Backup only; `pickProgramFile` is gone |
| backup-basic | every table, every row; passwords | unsent initial passwords were in the file |
| backup-incomplete | a table cannot be read during a backup, then a complete backup | (pile B2, TOOLS-3) an incomplete file had the plain name, counted as the weekly backup and silenced the reminder; now `aa-backup-INCOMPLETE-<date>.json`, `complete: false`, the alert says it is not a restore point, Today and the Coach tools line keep asking |
| backup-paging | 2,345 rows; 500-row cap; a write mid-backup | unordered OFFSET paging (1 row lost + 1 duplicated); a cap under 1000 truncated silently |
| athlete-delete-all | Danger zone → Delete training history | the copy promised "all data"; it now says what stays. Since stage48 it is ONE `coach_delete_training_history` call, no direct deletes |
| athlete-delete-fails | the same, when the server refuses, the sign-in lapsed, stage48 is not applied, or the answer never arrives (no database code: the page must not say "nothing was removed") | (second session) two deletes from the page: a failure between them left one gone and one standing |
| spine-save-keeps-claude | Claude fills an entry by SQL, then Amir adds a video from a tab opened earlier | every column went up from the page's copy: Claude's court line, links, count and cost were reverted |
| spine-clash | Claude and Amir change the same field | silent overwrite; now a refusal naming both values, typing kept, Save again wins |
| spine-save-atomic | a clash in the coach-only half; a failed save; an answer that never arrives (not reported as "nothing was saved"); stage48 missing | (second session) the entry half was saved and only the coach half refused; now neither is written |
| spine-history | an entry's History (stage49): who changed what, newest first, Undo through `coach_save_spine`, the coach-only half | (second session) no history existed |
| spine-history-unavailable | History when `spine_versions` is missing, the sign-in lapsed (42501 names the table too), or the read fails | (second session) a lapsed sign-in read "stage49 has not been applied" (review finding) |
| spine-history-reads | History is read when opened and after a change, not on every redraw (five keystrokes in the search box) | (review finding) 10 reads for 5 keystrokes, 2 after a save |
| spine-history-long-text | an edit past the 140th character shows in the list and in the Undo confirm | (review finding) both sides showed the same first 140 characters |
| spine-undo-guards | Undo of a rename the cards use, an alias another entry owns, a link to a deleted entry: refused with Save's rules; an ordinary undo still goes through | (review finding) Undo sent them all and detached 3 cards from their entry |
| spine-load-fail | the coach-only half fails to load | cached as blanks; the next save wiped SFR, flags, counts, cost |
| spine-rename-guard | rename an entry live cards use; an alias that is another entry's name | saved silently and detached the cards |
| spine-move-back-confirm | Move back to draft | one tap took it off every phone |
| spine-unsaved-guard | typed work vs a redraw, another entry, leaving the tab | lost without a word |
| spine-circuits-count | an exercise used only inside a circuit | counted as unused |
| walink | intake / funnel WhatsApp links | "@sara_1990" opened wa.me/1990 |
| session-import-replace | Add past session over one on the same date | the old set-by-set log stayed under the email's text |
| session-import-checkin | Add past session from an email with the `Today: lower day … · sore: …` check-in line, and one without | the line was never read: no verdict on an imported session (second session) |
| login-used-mark | Logins to send after the person signed in | every stored password looked unsent |
| calls-load-fail | call logs fail to load | the File tab must name the failure (the Calls tab used to say "No call logs yet") |
| route-unknown-sub | `#a/<id>/<unknown>` | "No athlete in the store" |
| hist-light-boot | boot reads session_history twice: every session's numbers (no `summary`, no `log`) and the text of the unread sessions that contain "Note:"; an exercise-only note still reaches Needs you and is quoted | (pile B1, TODAY-12) every open downloaded every session in full, 78% of it text the numbers never read |
| hist-athlete-open | opening an athlete reads their text and log once (filtered on their id), the comparison and the raw log have them, sub-tabs and going back read nothing, another athlete reads only theirs, a reloaded list reads them again | (pile B1) all of it was loaded at boot |
| hist-heavy-fails | the read of an athlete's logs fails | (pile B1) must say *did not load* with the reason and Try again, keep the numbers, show no verdict or "not logged"; Try again brings the comparison |
| file-redraw-keeps-work | the Change password box (typed, cursor in it), Version history and the Coaching log opened, then a full redraw and a tab-body redraw; Add past session with a pasted email, date and preview, a day card toggled, a full redraw, Save; another athlete's file | (pile B4, FILE-9) the box emptied, the sections folded, the add-session box hid again and lost the email |
| live-snapshot-window | the live app snapshot at 14:00 and 02:00 UTC with check-ins stamped 1 h to 23 h earlier | (pile B6, TWIN-6) a started day read "in progress" for 30 hours; now the app's rule: today's date, or under six hours |
| retest-flag | Personal records with `test` set to "3RM", true, "heavy" and "11RM" | (pile B6, TWIN-7) any text was shown as a flag; now only what the athlete's app reads |
| fail-bar | a failed post on Today (and the same again, and a failed intake status), then a success, on a 1280 px screen and a 360 px phone | (pile B5) a failure was a 2.6 s toast in some tabs and a pop-up in others; now a line that stays until dismissed, in view when scrolled, merged when repeated, never a pop-up; a success stays a toast |

## Adding a scenario

Add `S['my-id'] = async (b) => { const r = {id, title, checks: []}; const {page, log, today} = await L.openCoach(b, {hash});
… check(r, 'what correct looks like', ok, actual, expect); await page.context().close(); return r; }` in `run.js`.
Read calls with `L.callsSince(page, n0)` after `const n0 = await L.nCalls(page)`.
