## 📶 No signal — the plan saved on the phone (REL-01, 2026-09-26)

Fresh Eyes REL-01; Amir picked *"A with Proof"*. Since 2026-09-07 the plan came only from
`get_program`, and nothing kept a copy on the phone. iOS closes a backgrounded PWA freely, so an
athlete who checked WhatsApp between sets in a no-signal gym reopened on *"Program Not Found … ask
Amir for a fresh one"*, their logged sets safe on the phone and no way to see or finish them. The
service worker keeps the app's own files; its old offline path for the plan, `data/<id>.json`, has
been a 404 since 2026-09-07. Rejected then: opening from the phone on every launch (a stale plan first,
swapped under a running session) and letting `sw.js` keep the plan (it cannot cache a POST, and it
sits in front of the whole site).

**Opened FIRST on every launch since 2026-10-13** (Line Call, Second Serve N1; Amir: *"yes to all
recommended"*, decision 2, with both guards). Every open waited for the library and then `get_program`
(6 s cap) before Home, with the plan already on the phone: 9.8 s on a simulated slow evening line, and
a stalled one held the loading screen 6 s, then up to 4 s more for the dead `data/<id>.json` (now tried on
local hosts only). Now a phone holding this athlete's plan (`readPlanCopy(clientId)`; never the demo, the
coach preview or a fresh sign-in, which drops the copy) opens from it at once as `PLAN_OFFLINE.fast`, and
`_resumeSync()` runs straight after the first paint: the same plan → nothing shows and the held uploads go;
a changed plan → *Your plan was updated · Refresh*, the old one on screen until the tap (**guard 2: never
swapped under a running session**); no answer → the *Offline* line, only once the check has failed (a fast
open says nothing before); a "no" → **guard 1: the app closes** on *Plan not available* and the copy goes
(`showPlanRefused()`), unless a session is under way (`sessionUnderway()`), which keeps the screen with the
*Heads up* line as before. The progress pull runs in the same check, so a two-phone athlete sees the other
phone's sets from the next open. `scripts/headless/phone-first.js`.

- **`plancache`** (localStorage, no athlete prefix, so it never syncs): ONE slot, `{ id, at, data }`
  = the athlete id it was asked for, when, and the plan exactly as the server sent it. A shared phone
  never holds two athletes' plans.
- **Written** (`savePlanCopy()`) only from a real `get_program` answer, before anything touches `DATA`;
  never in the demo (the marketing demo opened on an athlete's own phone would replace their plan), the
  coach preview or Proof's strip on Home. AA Proof's full app writes it too.
- **Opened** only when the server could not be reached: no library, the 6 s timeout, a failed fetch
  (status 0) or a 5xx (`_noAnswer()`, `planAnswerOf()`). **Never when it answered no**: a 4xx
  (`get_program` raises `invalid athlete key`) or an empty answer deletes the copy (`dropPlanCopy()`)
  and shows *Plan not available* with *Sign in again* and a WhatsApp button.
- **Deleted** too by `signOutAthlete()` (the error screen's *Sign in again*, and **Sign out** under your
  initials through `signOutSafely()`, NAV-02) and by every successful sign-in in either app, so a new
  athlete whose signal drops before the first load can never open the previous one's plan. The reload saves theirs at once.
- **What the athlete sees:** the app opens from the copy with one quiet line under the greeting,
  *Offline · your plan as saved on this phone, Tue 18:40* (`paintPlanOffline()`, `#home-offline`).
  With no copy: *No connection*, with *Try again*. The error screen's ⚠️ emoji (yellow) is now an
  icon in clay.
- **An installed app asks the browser to keep its storage** (2026-10-13, Second Serve N3): `navigator.storage.persist()` after the
  first paint, standalone only, silent either way, because Safari clears a site's storage after about 7 days unused and a session still
  waiting to send lives only there. Still to check on a real iPhone: whether it is granted, and the safe areas (no `viewport-fit=cover`,
  so the 12 `env(safe-area-inset-*)` rules return 0).
- **The library is our own file since 2026-10-13** (Line Call, Second Serve N1/N2; Amir: *"yes to all recommended"*):
  `/assets/js/supabase-2.117.3.js`, the same bytes jsDelivr and unpkg serve for 2.117.3 (sha256 `d6a5c441…`), precached
  by `sw.js` (`SHELL`), so a repeat open reads it from the phone instead of fetching `@2` from jsDelivr every time (the
  worker never keeps another host's files, and jsDelivr was unverified from Iran). program.html and habits.html load it;
  coach.html the same version from jsDelivr. A version bump is a NEW file name and all three together. `_sbLoad()` finds
  the tag by `script[src*="/supabase"]` (it was `supabase-js`, which the local name does not contain: the retry below
  would never have started, caught by `signin.js`). The headless harness aborts the file (`lib.js`) so the stub stays the
  library.
- **The fonts are our own files too** (2026-10-13, aap-v158): `/assets/css/app-fonts.css` (the Barlow and Barlow Condensed
  weights the app uses, the same files as the site's `fonts.css`, and Space Mono, added to `/assets/fonts/` with its licence
  line), loaded without blocking paint as the Google stylesheet was. The worker precaches the stylesheet and keeps each font
  file the first time it is used. AA Proof's strip on Home (`habits.html?embed=1`) loads the same sheet since 2026-10-17
  (aap-v159; it added the Barlow Condensed 800 face, which only the strip uses), so nothing on Home asks Google Fonts.
- **The library** marks a failed download
  (`onerror` → `window.SB_FAILED`), so `_sbReady()` stops at once instead of polling ~3 s before
  every call; `_sbLoad()` fetches it again once the connection is back. **Sign-in uses `_sbForSignIn()`** (2026-10-11): it waits, fetches the library again when the first download failed or is only slow, takes whichever copy arrives first (12 s ceiling) and, if there is still nothing, says "The sign-in could not load…" instead of "check your connection". Before this a failed first download answered every tap with the connection message until the app was force-closed.
- **Uploads wait for a pull (`_sbHold`).** A run opened from the copy, or whose boot pull ran out of
  its new 6 s cap, has not merged the cloud's progress, so `_pushSnapshot()` sends nothing; every edit
  is still saved and stamped (`lastEditAt`), which is what lets this device's offline session win the
  merge later. `_resumeSync()` runs on `online`, on return to the foreground and once a minute: the
  library, then the plan (unchanged: the line goes; changed: *Your plan was updated · Refresh*, never
  swapped under a running session; refused: *The server didn't confirm your plan*, and it stops), then
  the pull, then the held push and the unsent sessions (`_replayQueue()`).
- **`syncFromCloud()` reports** `'pulled'`, `'rejected'` (answered with an error: uploads go ahead,
  as they always did), `'unreachable'` or `'late'`; a pull that outlives its cap is thrown away when it
  lands, and it merges with `_lsRawSet`, because a merge is not an edit.
- **Not awaited on the copy path:** the identity check (it cannot answer offline; the copy only opens
  for the remembered id it was saved under, and the server checks again on reconnect). Elsewhere it is
  capped at 6 s. The legacy `data/<id>.json` fetch stays, capped at 4 s, because the headless render
  checks serve one.
- ⚠️ **Exists twice**, in this file and `habits.html`: `_noAnswer()`, `_sbLoad()`, `_sbForSignIn()`, `readPlanCopy()` /
  `savePlanCopy()` / `dropPlanCopy()` / `planAnswerOf()` and the `plancache` shape. Change both. Proof's
  side: `HABITS.md` → *No signal*.
- **A finished session waits on the phone until the server has it** (2026-10-12, after 10 sessions of 4 athletes reached
  Amir by email and never reached the dashboard). `recordSessionToCloud()` puts the record in the session queue
  (`<id>_csq`) BEFORE it calls `save_session`, and only the server's answer takes it out; a call that never answers
  (capped at `SESSION_SAVE_MS`, 20 s) leaves it there. One entry per session (day and date). The queue drains at every
  open, back in the foreground, on `online` and after a report goes, and it never syncs. Every finished session is also
  noted in `<id>_finished` (synced), which coach.html reads to name one the server is missing. CODEBASE.md has the story;
  `node scripts/headless/session-queue.js` holds it (a hanging server, a cloud copy of the queue, two Day 1s from
  different weeks, an unfinished day filed online and offline).
- **Left as is:** one bar of signal still costs up to the 6 s `get_program` wait before the copy opens.
  Waiting less when a copy exists would open slow-but-working connections on the copy more often; it is
  a separate call.
- **A wrong phone clock no longer reads as a refusal** (SITE-AUDIT 25b, 2026-10-12; the 2026-10-04 reach reports: an Irancell iPhone 89 minutes behind).
  supabase-js decides by the phone's clock whether a token has expired, so a clock that runs behind keeps sending an hour-old token and the server
  answers `401 "JWT expired"` (PostgREST `PGRST301`) for about an hour and a half of every cycle. That used to be a 4xx, so `planAnswerOf()` said
  *no*: *Plan not available*, the saved plan deleted (`dropPlanCopy()`), the athlete told to sign in again, and the identity lookup that finds who is
  signed in failed the same way. **`fetchRetryExpired()`** is the fix: `_sb()` hands `createClient` a `global.fetch` that, on a 401 whose body says
  `JWT expired` or `PGRST301`, calls `auth.refreshSession()` once (concurrent calls share one refresh; the library dedupes it) and repeats the call with
  the new token. A sign-in or refresh call, any other status and any other 401 pass through, a call is repeated at most once, and a refresh that fails
  leaves the original 401 (so a signed-out athlete still sees *Sign in again*). A clock running *ahead* is a different case (the library refreshes on
  every call; nothing breaks) and is not touched.
  ⚠️ **Exists four times**: `program.html`, `habits.html`, `tennis/app/app.js` and `tennis-testing/app/app.js`, the same text.
  `node scripts/test_fetch_retry.js` (pre-commit guard 18) cuts it out of all four, requires one text, requires every `createClient(SB_URL, SB_KEY …)` to
  be given it, and runs the real library (the bundled 2.116; `SUPABASE_LIB=<a UMD build>` for another version, 2.117.3 passes) through 27 vectors.
  `node scripts/headless/clock-skew.js` runs the real page: the same page without the fix shows *Plan not available* (the field report), with it Home
  opens after one refresh and the saved plan stays.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
