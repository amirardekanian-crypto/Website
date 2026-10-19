## P8. Route recognition: `route()`

**When:** after a new award, a mission sweep or a finished quest.

**Reads:** the item's `size`, `recognition.toml`, the athlete's consent.

**Steps:**
1. **The athlete**, always (every reward is celebrated, GAME-14):
   - `tick`: the XP counter moves.
   - `win`: the wins card, until tapped.
   - `highlight`: the wins card, until tapped, and a share card offered.
   - `milestone`, `legend`: a full-screen moment right away, because the athlete has just acted (GAME-13), or at the
     next open when it was earned with the app closed (a server-worked fact such as a cycle finished overnight); one at a
     time, the rest queued; a share card offered.
   - In the training app the moment is `openMoment()` and the card is `openShareSheet()` (program.html, Highlight Reel),
     drawn by `assets/js/sharecard.js` with its badge, achievement, title, level and quest templates (their data shapes are
     written above each one). Proof's are its own.
2. **Amir**, from `highlight` up: a Courtside row with the WhatsApp message from `recognition.toml` → `[message.*]`
   filled in.
3. **The crew**, from `highlight` up, only if the athlete said yes: a line on the Bell, kept `keep_days` (7).
4. **Beyond**, from `highlight` up: the share card, the athlete's to post (GAME-14), in its app's card family. It is drawn
   on the phone and leaves only when the athlete taps Share or Save; a share pays nothing (GAME-6). A `legend` may go in
   Amir's story only after the athlete says yes to a pre-written WhatsApp.
5. **Consent** is asked once, at the athlete's first highlight: *Ring the bell for the crew when you set a best?* Yes,
   or Keep it to me. The switch lives in Settings. Amir always sees everything.
6. Record who was told and when, so nothing is told twice.

**Writes:** recognition rows.

**Rules:** GAME-6, GAME-9, GAME-11, GAME-14.

---
*One section of the reference. The index is [`career/PROCEDURES.md`](../../../career/PROCEDURES.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
