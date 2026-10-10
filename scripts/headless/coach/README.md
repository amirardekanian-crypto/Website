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
| `lib.js` | `openCoach(browser, {hash, tz, fixedTime, seed})`: new context, routes jsDelivr's supabase-js to an empty script and every other outside host to 204, seeds, injects the stub, opens the page, auto-accepts confirm/alert (recorded in `log.dialogs`). Helpers: `calls`, `callsSince`, `db`, `go`, `jsClick`, `loadAllCount`. |
| `run.js` | the scenarios (below). |
| `reallib.js` | loads the REAL supabase-js UMD (vendored, step 3) with a fake stored session and answers every Supabase request locally; counts store loads at page load and after a hidden→visible tab switch, and logs the auth events. |

## Knobs (set in a scenario with `page.evaluate(() => …)`)

- `window.__STUB.fail.push({kind:'from'|'rpc'|'fn', name, op?, message, status?, times})` — make the next call(s) fail.
- `window.__STUB.rlsDeny.<table> = ['update','insert','delete']` — the write "succeeds" with zero rows, like PostgREST under RLS.
- `window.__STUB.maxRows` (seed `stub.maxRows`) — PostgREST max-rows cap, default 1000.
- `window.__STUB.delay.<name> = ms` — extra latency.
- `window.__STUB.afterSelect = (table, call, DB) => {}` — mutate the DB between two reads (concurrency).
- `window.__fireAuth('TOKEN_REFRESHED' | 'SIGNED_IN' | …)` — call every stored onAuthStateChange callback.
- Mutate `window.__DB.<table>` directly to simulate another writer (the pipeline's `publish_cycle`, another tab).
- `openCoach(b, {tz:'Asia/Tehran', fixedTime:'2026-10-09T22:00:00Z'})` — page clock and time zone.

## Scenarios (2026-10-10: 32 failing checks before the audit's fixes, 0 after)

| id | covers | before the fixes |
|---|---|---|
| boot-double-load | loads per page open | 2 with the stub, 3 with the real library (now 1) |
| editor-save | ✎ → sets/reps/RPE → Save: payload (guarded by `updated_at`), program_versions, redraw, no-op save | no concurrency guard; no-op save wrote a version; numbers became strings |
| editor-save-error | server refuses the save | the row kept showing the failed value |
| editor-stale-overwrite | pipeline publishes after load, then an inline edit | the new cycle was silently reverted |
| editor-zero-rows | update matches no row | "Saved" toast |
| editor-wrong-exercise | file publish for an athlete viewed earlier, then ✎ on their page | the edit landed on a different exercise |
| auth-TOKEN_REFRESHED / auth-SIGNED_IN | open editor with typed values, auth event | full reload, editor gone |
| auth-SIGNED_IN-forms | Spine editor / coach line / affiliate form with typed text | Spine editor stayed open with old text; others wiped |
| note-mark-read | Mark read | ok |
| coach-line-utc / coach-line-tehran-0130 | post + take down the coach line | no p_day; 00:00–03:30 Tehran overwrote yesterday's line |
| wall-hide, quest-week, intake-status, affiliates, spine-approve, login-create, session-import-delete | the other writes | ok (login-create now checks the in-place password card) |
| backlog-clear | Clear older notes | now: one update per counted note, by key |
| calllog-delete | delete a call log | the deleted log stayed listed |
| version-restore | Restore a version, then The work | showed the pre-restore programme |
| program-file-publish | ↑ Publish programme file (in Coach tools), then the athlete page; a NEW athlete | showed the old cycle; a new athlete was missing until Refresh |
| backup-basic | every table, every row; passwords | unsent initial passwords were in the file |
| backup-paging | 2,345 rows; 500-row cap; a write mid-backup | unordered OFFSET paging (1 row lost + 1 duplicated); a cap under 1000 truncated silently |
| athlete-delete-all | Danger zone | the copy promised "all data"; it now says what stays |

## Adding a scenario

Add `S['my-id'] = async (b) => { const r = {id, title, checks: []}; const {page, log, today} = await L.openCoach(b, {hash});
… check(r, 'what correct looks like', ok, actual, expect); await page.context().close(); return r; }` in `run.js`.
Read calls with `L.callsSince(page, n0)` after `const n0 = await L.nCalls(page)`.
