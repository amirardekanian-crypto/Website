## 4.6 Milestones come in MARKS

*(Amir, 2026-08-02: "as ive seen in call of duty you can unlock achievements again but next
levels of them. so like some milestones can have different levels.")*

A **family** is one achievement you can earn again at a higher bar: same name, a roman
numeral after it. `HUMAN SPRINKLER I` (5 days) → `II` (20) → `III` (60).

**Once the catalogue switch is on (phase 3)** the families that track one habit (HUMAN SPRINKLER, GROUND COVERED, FULLY FUELLED,
ZEN MACHINE, BLACKOUT ARTIST, RUBBER BAND, IRON MONK) retire into that habit's one badge (§4), HEAVY METAL into Hold Serve, HARD TO
KILL into *comebacks*, and THE MACHINIST into Century. DAWN PATROL, CLEAN SWEEP, BACK IN THE FIGHT, FIRST BLOOD and THE CENTURION
stay, as catalogue awards paying Proof's numbers, once in a career. The five events become milestones that pay their title.

`mark` is **display only**. Each rung is an ordinary independent row on the existing rail —
its own `code`, `need` and `xp` — which is why adding twelve of them needed no new scoring
machinery on either side. ⚠️ But every rung still has to exist in the `milestones` array on
the `xp_rules` row too, or the board underpays. Verified programmatically after the change:
32 rows client-side, 32 server-side, zero mismatches on code/need/xp/measure.

Two rules the ladder keeps, both machine-checked:

1. **Inside a family, a higher mark always pays more than the one below.** A test walks
   every family in `need` order and asserts `xp` strictly increases.
2. **Every habit gets at least a II**, so whichever habits an athlete favours, there is
   always a next rung in something they actually do.

Three names carry **no mark** on purpose — `FIRST BLOOD`, `THE MACHINIST`, `THE CENTURION`.
They are the entry and the two trophies, not rungs, and a numeral would make them look like
waypoints to something else.

**`DAWN PATROL I` is the free tier's way in** (this also closes what was §12.1). The badge
shelf's only day-one row was `FIRST BLOOD`, which is WORKOUT-gated — and a free athlete's
WORKOUT is locked for life, so the entire funnel landed on a screen whose entry badge they
could never earn. `DAWN PATROL I` needs three habits logged once, reachable on their first
evening, and pays 40 against FIRST BLOOD's 50 because it is the easier of the two.

⚠️ **Five badges were renamed** so their families read as one thing: `THE TONE SETTER` →
`HEAVY METAL I`, `ROAD RUNNER` → `GROUND COVERED II`, `UNBREAKABLE` → `HUMAN SPRINKLER III`,
`THE LONG ROAD BACK` → `BACK IN THE FIGHT II`, `UNSINKABLE` → `HARD TO KILL II`. Display
only — every `code` is untouched, so no history, XP or medal moved. (`UNBREAKABLE` had to go
regardless: it was also the 60-day `CONSISTENCY_TIERS` name, and two different things
wearing one name on the same screen is exactly the confusion this app keeps fixing.)

`THE CENTURION` went **500 → 1,200**. `CLEAN SWEEP III` pays 600 for thirty perfect days, so
a hundred of them had to outpay it by a distance or the last rung of the hardest ladder in
the app was worth less per day than the rung below it.

The shelf is now **32 milestones worth 9,585 XP** in total, up from 20 and 5,085. Since
milestone XP re-pays every season (§4.5), that also widens the runway a returning veteran
has to climb in a new season — which is part of what §12.2 was about.
(Once the XP switch is on a milestone pays the career once, and still pays again toward each season's board points.)

---

---
*One section of the reference. The index is [`XP_SYSTEM.md`](../../../XP_SYSTEM.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
