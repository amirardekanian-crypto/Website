## 🪜 Career on Home, and what a session earns (Career Mode phase 2, 2026-10-17)

> **Round 5 (2026-10-19):** the light screens changed parts of this; *Career, the lightest version* below wins where they disagree.

The training app's half of Career Mode's XP switch (`career/CAREER_MODE.md` → *The switch decisions*, and GAME-13: every meaningful
action answers at once, visibly). The server's half and AA Proof's are in `HABITS.md` → *Career Mode (phase 2, the XP switch)*.
**Built, rehearsed and applied on the server (2026-10-17), and switched on 2026-10-18: nothing here showed, and the app asked the server for nothing new, until the server's XP switch
went on.** Now that it is on, the athlete's
level is the career's (every session, every habit, never reset by a season) and this app shows it in three places.

- **The row** (`#home-career-wrap`, `paintCareer()`, `careerRowHTML()`): one door row on Home, **above Hold Serve**. Home now reads: the
  week's days and the week-done extra, then **Career**, **Hold Serve**, **Daily habits**. The `.hrow` recipe with a rank's chevrons
  (`hrowIc('career')`), the label **CAREER**, the level as the big line (*Level 11*) and the rank with what the next level needs as
  the small one (*GRINDER 1 · 1,310 XP to level 12*). A thin green bar runs along the row's foot (`.career-bar`): the way to the next
  level. The level is worked out here from the profile's XP with `careerLevelOf()`, so the row and the finish card agree to the XP.
- **The tap** (`goCareer()`): AA Proof's Locker, `habits.html?client=<id>&go=pass` (AA Proof reads `go=pass` at the end of its boot).
  The row leaves the app. It does not open the guide the way Hold Serve's row does.
- **When it shows:** the switch is on (`careerOnT()`: a real profile with `ready` and `switch.xp`), `DATA` has loaded and the profile
  carries a level. **When it does not:** before the switch, in the demo, in the coach's preview, and on a first launch with no signal
  (no profile yet and no copy). With no signal and a copy, the copy shows.
- **The data:** `get_profile()` (`refreshCareer()`, 10 s), kept as `<id>_careercache` (`{ p, at }`) and painted at once on the next
  open (`loadCareerCache()`). Before the switch the app never asks. **Hold Serve's own read of `career_rules`** (`refreshHold()`
  selects `version` and `rules->switch`) tells it (`careerSwitchSeen()`): a day in `xp` means ask, anything else drops the copy and
  the row. It asks again after a session reaches the server (`careerSessionSaved()`), 3 s after a habit ticked in the Proof strip
  changes the card snapshot (that tick pays XP), and whenever Hold Serve reads again (at boot, and in the foreground or back online
  after ten minutes).
- **The habits row** (Daily habits) never says a level in Career Mode. Where an earlier day's snapshot would have said *Level N* it
  says *Ready for today*, because the level is the Career row's.
- **The finish card's line, before Done** (`.confirm-earn` in `#confirm-<day>`, `paintConfirmEarn()`): once the session can be
  finished, *This session earns* **+450 XP**, with what makes it up in grey underneath: *Session 400 · Every set logged 50*, and
  *Check-in 20* when it was answered. A day already done this week says *Day 1 is done this week already, so the session itself pays
  once* (the full log and the check-in still pay). A session that completes the week adds *Your week held +400 · Back after a broken
  week +100 when it counts*. The server judges a week (`career_derive()`), so the phone marks those two as pending and keeps them out
  of the sum. `careerEarn()` prices from the profile's `rules.prices`, so a re-seeded rulebook changes it with no release, and it uses
  the cap of `career_facts_paid()` (one paid session per plan day per training week). A session finished early reads *Session,
  finished early* at the early price. The box is empty, and hidden, outside Career Mode and until the card is ready.
- **The finished card's line, after Done** (`#earn-<day>`, `.complete-earn`, at the left of Amir's signature on the green): **+470 XP**
  over **Level 11 · 840 to 12**. At Done, `careerEarnAtDone()` keeps what the session earned and the career XP of that moment in
  `<id>_earn_d<N>` (`{ t, xp, parts, before, saved }`). Until the server has the session, the line shows this phone's number and says
  **counting** where *840 to 12* would be. `careerSessionSaved()` stamps `saved` the moment `save_session` answers and asks for the
  profile again. An answer asked after that stamp turns the line into the server's: its career XP since Done (a held week, a best or
  anything else that landed with the session is in it) and the level that gives. A reload paints the same line again from the key.
- **Twins** (`scripts/check_twins.js` §9, held to `scripts/career/xp_cases.json`, the server's own answers): `careerLevelOf()` is the
  server's `career_level()` and AA Proof's `levelInfo()` on the career's curve. `careerFullLog()`, `careerCheckin()` and `careerEarly()`
  are `career_session_want()`'s full-log, check-in and early rules. `careerEarn()` is not a twin of one function: it prices those facts
  with the profile's prices and the cap of `career_facts_paid()`. A held week stays the server's to decide. Change a rule on both
  sides, then in the cases.
- **The guide:** `APP_GUIDE` has a card `key: 'career'`, *Career: your level* (your initials → How the app works). The row leaves the
  app, so nothing opens the card by key. *Getting around* says where the row sits (next session, the other days, Career, Hold Serve,
  daily habits) and *Finishing a session* says what the finish card shows (CNT-01: a control that moves changes its card in the same
  pass).
- **Keys.** `program.html` still writes **no `<id>_hab_*` key**. Those are AA Proof's, and its profile copy, `<id>_hab_career`, is a key
  this app neither reads nor writes. This app's two Career keys are `<id>_careercache` and `<id>_earn_d<N>`. `_snapshot()` skips both
  (a cache of the server's answer, and this phone's view of a finished day), so neither ever syncs. Neither is written in the demo or
  the coach's preview.
- Checked by `scripts/headless/career.js` (55 checks across both apps, and this is the training half): the row, its place above Hold Serve and the
  10 px between the two, no row and no `get_profile` before the switch (the switch off, and the phase 1 rulebook that has none), the
  phone's copy shown at once and dropped when the switch goes off, nothing in the demo or the preview, the habits row's wording, the
  finish card's line (plain, a repeat, a held week after a broken one), the finished card (*counting*, then the server's number), the
  keys never synced, the tap into the Locker and 320 px. The stub answers `get_profile` from `__STUB.profile` and `career_rules` from
  its `tables`.

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
