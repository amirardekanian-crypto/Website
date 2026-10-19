## 4.5 What the badges pay, and why it is safe

Tiers and milestones were displayed with an XP value and awarded **nothing** until
stage 12: `overallXp()` summed `habitXp` and stopped. They pay now, under three
rules that keep the guarantee at the top of this file intact.

**1. A bonus is paid on the day it was crossed.** `bonusEvents()` walks the log once
and returns `{day, xp, kind, id}` for every tier and milestone crossing. Dating it is
the whole trick: a bonus is then just an ordinary amount inside a window, so the
season rule and both leaderboard windows filter it with no special cases — and
nothing new is stored, so retuning still rescores everyone automatically.

**2. Runs are measured from the season start.** `bonusEvents()` walks `seasonDays()`,
not `loggedDays()`. This is a **fairness rule, not an implementation detail**: a tier
crosses once, so scoring it against all-time runs would mean an athlete whose streak
began before the season could never earn tier points again, while someone who joined
yesterday could earn all 5,300. The season resets the run *for payment*; the badge
itself is still judged on the best run ever and is never taken back. So the pip on
the Progress tab can read "tier 5" while this season has only paid tier 2 — that is
the same rule as pre-season days not scoring, applied to streaks.
**Once Career Mode's XP switch is on this changes for the career, not for the board.** The phone's ledger walks the whole log
(`scoreDays()`) and the server's career score calls `hab_bonus_xp()` with no season, so a tier, a milestone or a quest pays the
career once, ever. The board's season points are still measured from the season start, so the same badge pays again toward each
season's points.

**3. Bonuses land on the overall ladder only**, never on a habit's own. A habit's
level has to stay a pure count of how often it was done (§2), and paying its ladder
for its own streak would quietly break that.

**Once the catalogue switch is on (phase 3), tiers and milestones leave this ledger.** `bonusEvents()` emits no `tier` and no
`milestone` events (quests and comebacks are unchanged until phase 5), exactly as the server strips them from `hab_bonus_xp()`
(`career_bonus_rules()`). They are **awards** instead (`career_awards`): one row per badge tier or milestone, minted once in a
career on the day its measure crossed, priced from the CURRENT catalogue whenever the score is worked out (D12), and counted in
the career, the season and the week like any fact (§8). Three things keep this safe:

1. **Nothing drops at the switch.** Everything Proof had already paid is minted in silence with Proof's own price on its own
   crossing day, so career XP after the switch is the XP before plus any back-pay of the new badges (D2). The phone drops the XP
   of a push made before the flip (`_pushedXp`), so the number on screen does not move.
2. **The phone still shows a step at the tap** (P13, GAME-13). `awardMeasures()` / `phoneAwards()` decide the awards a phone can
   decide from its log (the habit badges, the day streak, DAWN PATROL, CLEAN SWEEP, BACK IN THE FIGHT, FIRST BLOOD, THE CENTURION,
   FULL STACK and the five events) and `pendingAwardXp()` adds their XP to the career XP shown until the server owns them. A
   crossing on the switch day or earlier is history and never pending (the switch day is history on both sides).
3. **A disagreement is withdrawn, never kept.** A pending award the server still does not hold after a push of the same log is
   withdrawn on that phone (`<id>_hab_awwd`), its XP and its line go, and the console names it (`[career] twin disagrees`).

"Owned" is the core's: `get_profile().owned` is a **list** of award ids (byte order, no days, stage70's split), read through
`ownedIds()`. The shelf's rows with their days are `get_awards()`'s, read only when Progress opens (`HABITS.md` → *Two reads: the
core and the shelf*); no XP number reads them.

**Retired, never removed.** HEAVY METAL (it paid sessions on days in a row, which means skipping a rest day: Hold Serve replaces
it), THE MACHINIST (Century counts the same sessions), HARD TO KILL (widened to training returns as *comebacks*), the seven habit
families and the per-habit tiers are earned as Proof earned them up to the switch and never after. Anyone who has one keeps it:
on Progress it is a line under the badge that replaced it, *Earned before: HEAVY METAL II*.

**4. Each day is counted against the habits it actually had.** The two milestones
measured per day — `daysWith3` (DP, 75xp) and `perfectDays` (CN, 500xp) — need a
denominator, and they take it from `rosterOn(day)`: a dated timeline of the tracked
set (`CFG.roster`), not `live()`. Until stage18 both used the current set for all of
history, which meant adding a habit **deleted** perfect days already earned and
switching one off **invented** perfect days that never happened — 500xp in either
direction, and enough to cost a level in 67 of 266 log lengths. `hab_bonus_xp` was
changed to match, so the board and the phone still agree. Tiers are unaffected: a run
is per habit, so it never needed a denominator. Full design in `HABITS.md` →
*Days are settled units*.

⚠️ **`live()` is the present tense only.** Any function that takes a `dayKey` must use
`rosterOn(dayKey)`, or it will quietly re-judge history again.

⚠️ **Onboarding is exempt from the removals-land-tomorrow rule.** `stampRoster()` dates a
removal to tomorrow so a habit cannot be switched off at 23:00 to erase a miss — but the
roster is first stamped before onboarding is ever seen (`migrateOld()` ends in
`saveCfg()`), so declining one of the suggestions on that screen used to leave it on
**today's** roster and score day one against a habit the athlete had just said no to. It
now collapses to a single entry dated today while `!CFG.onboarded` **and** `LOG` is empty;
an empty log is the proof that there is no closed day to re-judge, which is the only thing
the tomorrow rule protects. Full account in `HABITS.md` → *The eight habits*.

Milestones keep flat values — they are one-off and genuinely hard — totalling
**9,585 XP** across the 32 (§4.6), in three tiers (`tier` on each entry: `week`,
`long`, `rare`; grouping only, nothing scores off it). The 3,650 that sits in `rare`
needs 150 sessions, 100 perfect days, 100 step days, a 60-day water run or five comebacks
that stuck, so it is a year of work rather than a windfall; the 650 in `week` (seven
badges) is the deliberate part, because an athlete's first fortnight used to be worth
almost nothing in one-offs and that is exactly the fortnight where people quit.
**Seasonal events (`EVENTS`) pay no XP at all** — they pay a title, for the reasons in
`HABITS.md`. The exception is **FIRST BLOOD** (`FB`, 50xp, one logged
session): every other milestone needs at least five days, so the whole section was
unreachable for an athlete's first working week and rendered as nine greyed rows on the
screen they open to see how they are doing. It pays the least of any of them precisely
because it is the easiest — the ladder only stays honest while the hardest work pays most.
Note it is WORKOUT-gated, so a free-tier athlete cannot earn it (the habit is locked and
only a finished session in `program.html` ticks it); the same was already true of
HEAVY METAL. (This paragraph predates the marks: `DAWN PATROL I`, 40 XP, and
`CLEAN SWEEP I`, one perfect day, are day-one badges too now — §4.6.)

⚠️ **`measureAch()` and `bonusEvents()` are the display half and the paying half of the
same measures, and they must agree.** `daysWith3` read `live()` in the display half long
after stage18 fixed the paying half to `rosterOn(day)`, so switching a habit off dropped
days from the counter on Progress while the 75xp already paid correctly stayed put — a
progress figure falling while the XP behind it does not. Fixed; the rule is the same one
as everywhere else in this file: **any function that takes a `dayKey` uses
`rosterOn(dayKey)`.** The two halves still differ in one respect *by design* — the display
walks `loggedDays()` (a badge is judged on the best run ever) while the ledger walks
`seasonDays()` (it is only *paid* inside the season). See rule 2 above.
Once the XP switch is on the ledger walks the whole log too (`scoreDays()`), so the two halves stop differing.

**The same rule was broken a second way, on the `streak:` measures, and fixed 2026-08-02.**
`measureAch()` returned `habitStreak(h)` — the run ending *today* — for all eight
streak-measured milestones (HS · TS · ZM · BA · HM · RB · IM · UB), while the tiers beside
them correctly used `habitBest(h)`. So a badge the athlete had earned and been shown a
takeover for greyed back to `0/5` the day their streak broke, the earned-milestone count on
Progress dropped, and the XP it had paid stayed exactly where it was — the identical
"progress figure falling while the XP behind it does not" fault as `daysWith3`. Worse,
`currentAch()` feeds `CFG.seenAch`, so the code fell out of the seen list and rebuilding the
streak fired the full **"Medal unlocked · +N XP banked"** takeover again, for XP that had
landed weeks earlier and could not land twice (`bonusEvents()` pays each milestone once per
season). It now reads `habitBest(h)`, which folds in the live run, so an unearned badge
still shows real progress. `CFG.seenAch` and `CFG.seenQuests` are also **unioned** rather
than replaced now: they record what has already had its moment, so they may only ever grow. **Weekly quests ride the same rail** (§8.5): dated on the
day they complete, so they need no special handling in any window.

`bonusEvents()` is cached and dropped by `invalidateBonus()`, which `saveLog()` and
`saveCfg()` call — and which also drops the roster lookup cache, since the two are read
together. **Anything that mutates `LOG` or `CFG` without going through those two must
invalidate by hand** — `syncFromCloud()` and `importWorkoutDays()` do. `saveCfg()` also
calls `stampRoster()`, which is why every path that changes the tracked set records
itself without anyone having to remember. The cold walk is ~7ms over 400 days of full
logs.

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
