## 📲 The install ask waits for a finished session (HOME-03, 2026-09-26)

The "Install app" toast (`A2HS` in `assets/js/shared.js`) used to fire 2.5 s after the first sign-in, on
top of the welcome and over Day 1. `maybeOfferInstall()` in `program.html` now asks only once the athlete
has finished a session (`hasFinishedASession()`: the history cache, or a finish or send on this phone): on
a later open, or 1.8 s after the session report reaches the coach (`flushOutbox()`, WK-04). A dismissal is remembered
(`a2hs_dismissed_v1`), and the toast shows once per page. Its words match the phone: **Install** only when
the browser offered an install (`beforeinstallprompt`), the menu route when it did not, Share → Add to Home
Screen on iOS, and "open in Safari/browser" inside WhatsApp, Instagram and the like. AA Proof no longer asks
a coached athlete to install a second app (HABITS.md → the install offer).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
