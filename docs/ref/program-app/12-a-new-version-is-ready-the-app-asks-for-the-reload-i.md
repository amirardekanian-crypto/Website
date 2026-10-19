## 🔄 A new version is ready: the app asks for the reload itself (2026-10-19)

Amir: *"every time there is a change in the app, and its updated, i want everyone to be notified to close their
app from background and re open it. i dont know how to make this a rule or a memory."* **There is no rule to
remember. The code is the rule.**

An installed PWA left in the background keeps the OLD page in memory. `sw.js` takes the shell over the moment a
`CACHE` bump deploys (`skipWaiting()` on install, `clients.claim()` on activate), so a **cold open is already the
new version** — a page that is only *resumed* is not, until it reloads. That gap is what Amir had been closing by
hand, telling athletes to swipe the app away and open it again. **Both apps now notice and say so.**

- **The signal is `controllerchange`** on `navigator.serviceWorker`: a NEW worker has claimed this page.
  A **first install fires it too**, with nothing stale behind it, and so does a hard refresh (the page is
  uncontrolled, and `claim()` takes it). One guard covers all three: `_hadWorker`, read once while the page loads
  — **it only counts when this page already had a worker.**
- **Nothing finds the new worker unless someone looks.** A navigation makes the browser check `sw.js` by itself,
  which covers every cold open. An app resumed from the background never navigates, so **`swCheck()` calls
  `registration.update()`** when the app comes back to the foreground and when the connection returns, at most
  once every `SW_CHECK_MS` (20 minutes: `sw.js` is 45 KB and Iran's lines are slow).
- **NEVER mid-session** (the principle `_resumeSync()` already keeps for a changed plan): a reload would take the
  sets on the screen with it. `paintNewVersion()` holds the line while `sessionUnderway()` is true and asks again
  every 30 s, so it lands the moment the session is over. `swCheck()` holds the *check* for the same window, so a
  worker does not start answering a running session's lazy loads (a rest game, the share card) from the new cache.
- **The look is the note box, in clay** — Amir picked it from three directions (2026-10-19: *"lets go with C but
  in ckay"*; the other two are kept as a parts bin on the board). Clay because it asks for something (DS-01). It
  sits in the middle of the screen wherever the athlete is, so it is not missed on another tab, and it **does not
  hide itself**: it stays until **Reload** or **Not now**. It never dims or blocks the page under it.
  The words are **"A new version of the app is ready"** under a **NEW VERSION** kicker.
- **program.html**: `aaToast()` with `tone: 'clay'` and `ms: 0`, from `paintNewVersion()`. The two options are new:
  `tone` paints the box in the one accent (`.aa-toast[data-tone="clay"]`, **`--clay-hero`** and **`--clay-deep`**,
  which joined THE APP'S ONE COLOUR SET on `body`, never `:root`), and **`ms: 0`** means a note that stays until it
  is answered. `off` is what a REAL tap on the second button does — the box going for any other reason is not an
  answer — so Not now sets `_newVerDone` (this run only: the next cold open is the new version anyway) and tapping
  Reload does not. Ordinary toasts are untouched: no tone, 6 s, *Got it*.
- **habits.html (AA Proof)**: the same box and the same words in its own look, `.newver`, from `UI.newver`, drawn
  over every screen (z 96: above its sheet and its toast, under the tour and a takeover) until one button is
  tapped. `dismissNewVersion()` is its Not now. Its ground is `--clay-deep` with `--on-clay` on it, both of which
  invert between the themes, so it is deep clay with cream in light and light clay with near-black in dark. ⚠️ It
  has **its own keyframe** (`nvIn`): the app's `riseIn` ends on `transform: none`, which threw the box's own
  centring away for the whole animation and dropped it in 81 px low.
- **⛔ Never in the embed** (`habits.html?embed=1` on Home). The iframe is a client of the **same worker at scope
  `/`**, so it is claimed and `controllerchange` fires there too. A reload from inside it would reload the wrong
  document, and the line would sit in the habit strip. `versionWatchOff()` stands the whole thing down there, and
  `renderEmbed()` has no row to draw. **Not in the demo or the coach's preview either.**
- **The functions exist twice, one set per app**: `swTookOver()`, `swCheck()`, `versionWatchOff()`,
  `reloadNewVersion()`, `initVersionWatch()`. Change both.
  `node scripts/headless/new-version.js` (34 checks) runs the real pages: the first-install guard, the box and its
  colours in both themes, that it does not hide itself and does not block the page, the mid-session hold (it is
  also taken down if a session starts under it) and its return, Reload, Not now, that an ordinary toast is
  unchanged, the embed's silence, and that each app registers the worker through `initVersionWatch()` and nowhere
  else. Playwright blocks service workers, so the lifecycle itself is not exercised there; the suite calls the
  handler the lifecycle calls.
- **What this means for a deploy**: a `CACHE` bump is now the whole message. Nobody has to be told anything.
  ⚠️ An athlete only learns this from the version that *has* the watcher, so **v188 is the last bump anyone has to
  close and reopen for**.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
