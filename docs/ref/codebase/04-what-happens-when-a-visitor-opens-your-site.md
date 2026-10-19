## What Happens When a Visitor Opens Your Site

1. Visitor types `amirardekani.com` in the browser.
2. GitHub Pages looks at `CNAME`, matches the domain, and serves `index.html`.
3. `index.html` loads the three CSS files (paint, walls, furniture) and the `shared.js` script.
4. `shared.js` quietly fetches `partials/nav.html` and drops it into the top of the page, then does the same for the footer.
5. `shared.js` also wires up the mobile menu, scroll animations, and the year in the footer.
6. The visitor reads the page. Anything that says "Apply" links to `/form.html`.
7. On the apply page, they fill in the form. The progress bar updates as they go. On submit, the form posts to Web3Forms, which emails you.
8. Later, you create an accepted athlete a login (coach.html → Athletes → the athlete → File → Create login) and WhatsApp them the message it copies: the app's address, their username and their password.
9. They sign in at `program.html`, which loads their programme row through `get_program()` and builds their whole training app from it.
10. When they press play on an exercise, the video plays inline in its card (`loadInlineVideo()`); a circuit or warm-up row's ▶ opens `shared.js`'s YouTube pop-up.
11. Once they have finished a session (on a later open, or right after a report is sent), the app offers an "Install app" prompt so it feels like a real app on their phone; never on first open (HOME-03).
12. Anonymous visitor stats are reported to Plausible (no cookies, no personal data).

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
