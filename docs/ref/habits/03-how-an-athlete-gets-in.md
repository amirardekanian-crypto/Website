## How an athlete gets in

**A username and password**, the same login as their programme — they open
`habits.html` and sign in. Amir creates the account from coach.html → Athletes → the
athlete → **Create login**.

⚠️ **The old `habits.html?client=<id>&key=<key>` links are dead** (retired 2026-09-07).
`public.athlete_keys` is empty and `get_program()` fails closed on that path, so such a
URL is refused whatever key it carries — and since `data/*.json` is 404 on the live site
there is no fallback. An athlete **without a login cannot open Proof at all**.

The two apps are **linked both ways**:

| From | To | Where |
|---|---|---|
| `program.html` | Proof | **Daily Habits card** on Home *and* at the end of Game Plan (a plain shortcut — it shows no level or XP, because that is Proof's job). On Home it sits **below** This Week and the day cards since 2026-09-26: training leads, habits follow. Under it on Home, **today's habits, ticked in place** (Proof embedded, `?embed=1`; see *Embedded on the training app's Home*) |
| `program.html` | Proof's Locker | **Once Career Mode's XP switch is on:** the **Career** row on Home, above Hold Serve, shows the athlete's level and what the next one needs, and a tap opens `habits.html?client=<id>&go=pass`, the Locker (*Career Mode (phase 2, the XP switch)*). **Since 2026-10-19 there is no Locker:** `go=pass` opens Progress (*Career screens off*). The Daily Habits row still shows no level of its own: where it would have said one, it says *Ready for today* |
| Proof | `program.html` | The session row at the end of Today's list (its → opens the programme), a row in Settings (behind the initials button) and, since 2026-10-19, the **door card** on Progress for a coached athlete (*Open AA Performance*). The **Your training programme** card at the bottom of Today went on 2026-10-12; a free athlete keeps **Want the training too?** there |

Both are the same origin with the same PWA scope, so tapping through from an installed
app stays inside the app shell — no browser bounce, no second install. The handover
needs nothing in the URL any more: the Supabase session says who the athlete is on both
sides, and `athleteFromSession()` resolves the id on arrival.

### No signal — it opens anyway (REL-01, 2026-09-26)

Boot needs `get_program()` only for the athlete block (id, name, tier), and with no
signal it had nothing: the full app, opened from its own icon, showed the **sign-in
card** to an athlete who was already signed in, and the strip on the training app's
Home hid itself. The manual's *"Nothing here needs a signal"* was untrue at launch.
Now (Amir's pick, "A with Proof"; the full account is `PROGRAM-APP.md` → *No signal*):
- **`athleteFromSession()` says `null` for "could not ask"** (no library, no answer, out
  of its new 6 s cap), which is not `''` (nobody signed in). Then boot takes
  `aa_athlete_id`, the athlete this phone last signed in as, only with a session on the
  device. Proof now writes that key too, and its `signOutAthlete()` clears it.
- **The athlete block comes from `plancache`** when the server cannot be reached: the
  one-slot copy of the last plan this phone loaded, **the same key and shape
  `program.html` keeps**. The full app writes it from a real answer (so free athletes,
  who never open the training app, get it too); the strip, the demo and the coach
  preview never write it. A refusal, an empty answer, a session the server says is nobody's
  and every successful sign-in delete it.
- **Opened from the copy, the app paints at once.** The pull still gets its 6 s turn,
  behind the screen, and `SYNC.ready` lifts only when that turn is over, the same rule as a
  boot pull that fails (never upload before the first download has had its turn). The
  season, quests and workout days wait for the next launch; `pullFresh()` runs on the next
  foreground or reconnect, and `syncFromCloud()` fetches the library again (`_sbLoad()`)
  if it never arrived.
- **The error screen names the cause**: *No connection* (no copy yet) or *Not available*
  (the server refused), each with a button. Its old hint showed a `?client=` link.
- ⚠️ `_noAnswer()`, `_sbLoad()`, `_sbForSignIn()` (the sign-in's own door to the library) and the copy's helpers exist in both apps: change both.

### Putting it on the home screen

Proof carries its own manifest — the static `/manifest-proof.json`, which everyone
installs from now that the session carries identity. (A generated blob manifest with
`?client=&key=` in `start_url` is still built for anyone arriving on a legacy link; that
block can go once every athlete has a login.)
The app is called **AA Proof** everywhere on the site, and that name has to stay in
step in three places specifically for the install identity: `manifest.name`,
`manifest.short_name`, and the `apple-mobile-web-app-title` meta — iOS labels a
home-screen icon from that meta and ignores the manifest, so without it the icon would
read `AA Proof — AA Performance` truncated to nothing.

The offer is a sheet, and **it is not shown on arrival**. It fires once, ~1.5s after the
athlete logs their **first** habit — `setVal()` is the one door into the log, so that is
where it hooks. Before anything has happened it is a pop-up from a stranger; straight
after the first tick it is *keep this*. It stands down for a celebration, the log sheet,
any screen other than Today, demo mode, and an app already running standalone. **It is offered to
free athletes only** (HOME-03, 2026-09-26): a coached athlete is asked once to install the training
app, whose Home carries Proof, and was being asked for a second icon here. Saying
*Not now* sets `CFG.installAsked` and it never asks again — **Settings keeps a permanent
row**, which is also the only route for someone on a new phone. The row disappears once
the app is installed, where it would do nothing.

`beforeinstallprompt` is Chromium-only: there the sheet has a real **Add to home screen**
button wired to the deferred prompt. iOS Safari has no such event and no way to open the
OS sheet from script, so there it shows the instruction — *Share → Add to Home Screen* —
and no button that could not work.

**The third case is the common one.** Amir sends the link over WhatsApp, so the first
screen most athletes ever see is inside **WhatsApp's own browser** — and an in-app
browser cannot add anything to a home screen. Some have no share sheet; the ones that do
leave *Add to Home Screen* out of it. `inAppBrowser()` catches the apps that identify
themselves (Instagram, Facebook, WhatsApp on Android, WeChat, Line, LinkedIn) and the
sheet says *"open this in Safari first"* instead, with the install button suppressed
because it could not work either. Detection is best-effort — a WKWebView can look exactly
like Safari — so the plain-iOS copy carries the same escape hatch as a second line. An
instruction naming a button the athlete does not have reads as *"this app is broken"*, on
the first screen they ever see.

### A new version is ready (2026-10-19)

An installed app left in the background keeps the OLD page in memory until it reloads, and Amir
had been telling athletes by hand to close it and open it again. It says so itself now: when a
`sw.js` `CACHE` bump takes the shell over, `swTookOver()` sets `UI.newver` and **the note box in the
middle of the screen, in clay** (`.newver`) reads **"A new version of the app is ready"** with
**Reload** and **Not now**. It never hides itself: it stays until one of them is tapped. Amir picked
that look from three directions (2026-10-19). The same box is in `program.html`, in its own look, and
the full account is `PROGRAM-APP.md` -> *A new version is ready*.

What must not break here:
- **NEVER in the embed** (`?embed=1`, the strip on the training app's Home). The iframe is a
  client of the **same worker at scope `/`**, so it is claimed and `controllerchange` fires there
  too, but a reload from inside it would reload the training app's Home, not AA Proof, and the row
  would sit in the habit strip. `versionWatchOff()` stands the watch down and `renderEmbed()` has
  no row to draw. Not in the demo or the coach's preview either.
- **A first install says nothing** (`_hadWorker`): `clients.claim()` fires `controllerchange` on a
  first install and after a hard refresh, with nothing stale behind either.
- **The five functions exist twice**, once per app (`swTookOver()`, `swCheck()`,
  `versionWatchOff()`, `reloadNewVersion()`, `initVersionWatch()`). Change both.
  `node scripts/headless/new-version.js`.

---

---
*One section of the reference. The index is [`HABITS.md`](../../../HABITS.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
