## 👤 Your account, and Sign out (NAV-02, 2026-09-27)

`signOutAthlete()` existed in both apps and nothing called it: a shared family phone, a lent phone or a
second account meant clearing the browser. Now the **initials button** sits top right on Home, Progress,
Library and Coach, where the floating dark-mode toggle was (`#global-account`, a solid green disc with the
athlete's initials; hidden in a day view, whose banner keeps its own moon for mid-session). Since 2026-10-12 it is
`position: absolute`, in the page: it scrolls away with the screen instead of floating over its content. It opens
`openAccount()` in the one sheet (`#hist-overlay`, so Back closes it):

- **Theme** — Light / Dark, the athlete's choice as before (`toggleDark()`, `dark_mode`).
- **Install the app** — only when not already installed; it clears an earlier dismissal first, because
  here it was asked for (`A2HS.show()`).
- **How the app works** — the guide in the same sheet (`openHelp()`), with ‹ Back to this page (COACH-02, below).
- **Privacy** — `/privacy.html`.
- **Sign out** — two taps (`armedTap()`), then `signOutSafely()`: the waiting report (`flushOutbox()`), the
  session queue (`_replayQueue()`) and the progress (`_pushSnapshot(true)`, now awaitable) go up, in that order
  and each capped, then `_signingOut` stops every later push (the page's own pagehide push would otherwise run
  after the sign-out), then `signOutAthlete()`. The athlete's data stays on the phone under their id; a report
  still waiting is said on the sheet. Never offered in the demo or the coach preview (it would sign the coach out).

AA Proof has the same in Settings (HABITS.md → *Sign out*); the two apps share the sign-in, so either signs
out of both.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
