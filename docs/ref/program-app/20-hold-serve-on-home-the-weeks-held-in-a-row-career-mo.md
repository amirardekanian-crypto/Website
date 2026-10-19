## 🎾 Hold Serve on Home: the weeks held in a row (Career Mode, 2026-10-17)

> **Round 5 (2026-10-19):** the light screens changed parts of this; *Career, the lightest version* below wins where they disagree.

The one piece of Career Mode an athlete sees in phase 1 (`career/CAREER_MODE.md` → Consistency and the Build order's row 1). Amir
picked the place and the words on the page *Hold Serve on Home* (https://claude.ai/artifact/T6MTq7KGa78t7XvtjaPRAp), option B of
three: *"B, show it at zero, words ok"*. **Display only: nothing is written and nothing pays XP.**

- **Where:** its own door row (`#home-hold-wrap`, `paintHold()`), after the week's days and the week-done extra, right above **Daily
  habits**: the two rows are a pair. The `.hrow` recipe with a tennis ball (`hrowIc('ball')`), **HOLD SERVE**, the count as the big line,
  the next step as the small one, and the run as dots in the sparkline's place (this week a dashed ring while it is open). A tap opens
  the guide at its card (`openHelp('hold')`, `APP_GUIDE` key `hold`).
- **The words** (`holdRowHTML()`): *4 weeks in a row* · *1 more this week to make it 5* (*Do all 3 this week to make it 5* before any);
  this week held: the count in green, *This week is held*; one week: *1 week held*; at zero (nothing held yet, or the last week missed):
  *Hold this week* · *2 more sessions this week to hold it*, no dots; every day done on this phone before the server has judged the week:
  the server's count and *All 3 done this week*; between cycles or before the next starts: *5 weeks in a row* · *It carries into Cycle 3*
  (at zero then, nothing). "This week" is the plan's own training week, the same one This Week counts (`weekDoneDays()`).
- **The data:** the athlete's own `week_held` and `week_broken` facts (`career_facts`, row-level security: their own only), read with
  `sb.from()` in `refreshHold()`, and one row of `career_rules` (a rulebook exists, and its `switch`: the Career row below asks for the
  profile only when it says the XP switch is on). Hold Serve itself never calls `get_profile()`: it works out the whole career
  (0.2 to 1.5 s) and writes as it goes. `holdCount()` counts them as `get_profile()` does, a **twin** of its loop:
  `scripts/check_twins.js` runs `scripts/career/hold_cases.json`, and `scripts/career/rehearse.mjs` holds the two equal on every athlete
  it builds (and they were equal for all 28 live athletes on 2026-10-17). Change one, change the other.
- **Not sure yet, so nothing** (`holdState()`): the server judges a week only when something makes it look (a session saved, a
  programme change, a profile read). A week that ended unheld with nothing saved since has no fact yet, so when the training week after
  the newest held one has ended (`holdWeeks()`, `career_weeks()`'s weeks), the row hides until a save brings the facts up to date. A
  week Amir paused has no fact either; the phone cannot tell the two apart and never guesses.
- **Nothing** offline (no answer this visit), in the demo, in the coach's preview, with no rulebook (Career Mode switched off: the copy
  is dropped too), after a refusal, or for a current cycle with no dates (the server has no training week for it).
- **When it reads:** at boot behind the first paint (after `loadHistory()`), after a session reaches the server (`recordSessionToCloud()`
  and `_replayQueue()`: its trigger has judged the week by the time `save_session` answers), and back in the foreground or online after
  ten minutes. `paintWeek()` repaints it, so the next step follows the week's count.
- **The copy:** `<id>_holdcache` (`{ t, facts }`), written only from a real answer, never synced (`_snapshot()` skips it), painted at
  once on the next open unless the app already knows it has no signal; the read that follows confirms it or takes it away.
- Checked by `scripts/headless/hold-serve.js` (40 checks: every state of the words, the not-sure rule, offline, no rulebook, a refusal,
  the demo, the preview, an undated cycle, the copy kept or dropped and never synced, the tap, a re-read after a session reaches the
  server, 320 px and dark). The stub answers table reads from its `tables` (and `tableErr`).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
