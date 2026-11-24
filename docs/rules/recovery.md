# Rules — recovery after a session, and the Library's moments

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

The plain account and the evidence: [`../../recovery/RECOVERY.md`](../../recovery/RECOVERY.md). The functions and how to ship a change:
[`../../recovery/PROCEDURES.md`](../../recovery/PROCEDURES.md). The screens: [`program-app-look.md`](program-app-look.md).

## What must never break

- **The Library offers a session at two moments only** (LIB-01, Amir 2026-09-27; `PROGRAM-APP.md` → *The Library's
  Sessions*): a sore check-in (soreness 1 or 2, on the finished card) and a finished week (Home, under This Week), never
  a rest day. The picks are `LIB_PICKS`, one line each; a line goes once its session has been opened (`<id>_libseen`,
  never synced). Every ✓ in the Library asks `libTickLabel()`. The Sessions shelves are a list: a photo band, three
  rows, **All N ›** for the rest.
  *Grown, round 14, 2026-11-24 (Amir: "go with your picks and build all"): a day finished today also offers one Library row and one
  article under The Last Word (#140), Home one session the morning after a big or hard day (#141 Day Two, in the suggestion's slot,
  before the week's own), and Court Log's saved message the day-after session after a second hard day in a row and Final Whistle
  after a match (#142). Still never a rest day, a sore check-in still brings The Morning After, and the seen rule covers every one.*
- **The numbers and the words are recovery/*.toml, and the apps read them only as `window.AAREC`** (`assets/js/recovery.js`, built by
  `scripts/build_recovery.py`; the Farsi in `scripts/i18n/fa/29-recovery.json`, generated). Edit the toml, rebuild, run
  `scripts/check_recovery.py` (pre-commit guard 32), never hand-edit a built file. A change of the toml is an app change: the `?v=` bumps
  and the CACHE (the steps under Shipping a change in `recovery/PROCEDURES.md`).
- **Footprint is never shown to the athlete as a number, a score or a ring** (rounds 5 and 12). The athlete reads words; the coach sees a
  "big day" pill. `footprintOf()` in program.html and `footprintOfC()` in coach.html are one function in two copies, held equal by
  `scripts/check_twins.js` §12: change both.
- **Information only** (REC-7, REC-2): nothing in this area changes a set, a rep, an RPE, a day or a load, and nothing is pushed or pays XP.
- **The Last Word speaks only on the day the session was finished** (until 6 the next morning, `lastWordDay()`); on any other day the
  finished card is LIB-01's. One line per slot (tonight, tomorrow, the next hard day), at most one Library row and one article.
- **The words**: plain and short (COM-3), English and Farsi (COM-1), formal Farsi, a draft until Amir has read it. Never a rest day, never
  cold water after a session, never stretching or breathing as repair: sleep, food and spacing do the recovering. The checker refuses
  the mechanical half.
- **Matched Pair never offers a Care loading session** (Forearm Forge, Shoulder Brake, Iron Back, Quiet Knee, Steady Spine): they are
  training, not recovery. `matched-pair.toml` → `never`, and the checker refuses one anywhere in the folder.
- **The phone keeps its own reads in `<id>_fpdays`** (the last 10 finished days, for Day Two), never synced (`_snapshot()` skips it). Its
  history carries each session's minutes and finish time since stage128 (`get_my_history()`); before it, the load rule says nothing.
