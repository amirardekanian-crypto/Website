### The expired-token retry (`scripts/test_fetch_retry.js`, 2026-10-12)

Pre-commit guard 18, run when `program.html`, `habits.html`, `tennis/app/app.js` or `tennis-testing/app/app.js` is staged. A phone with a wrong clock keeps sending a token the server
has expired (supabase-js judges expiry by the phone's clock), and the apps used to read the `401 "JWT expired"` as a refusal (SITE-AUDIT 25b). Each app hands `createClient` the same
`fetchRetryExpired()`, which refreshes the session once and repeats the call. The test cuts the function out of all four files, requires one text, requires every
`createClient(SB_URL, SB_KEY …)` to carry it, and runs the real supabase-js (the bundled 2.116; `SUPABASE_LIB=` another build) through 27 vectors against a mock server (the field report, concurrency,
a refused refresh, a second 401, other statuses, auth URLs, headers in three shapes, no signal). `scripts/headless/clock-skew.js` runs the real `program.html` with the real library against a
mock Supabase, with and without the fix. Nine deliberate breakages of the function were each caught. Details: `PROGRAM-APP.md` → *No signal*.

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
