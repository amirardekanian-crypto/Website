### 04 · LOCKER — the long game

> **Not drawn since 2026-10-19.** See *Career screens off*.

> **Since 2026-10-12 (the UX audit), the order stays and the repeats go:** no *4/14* in the header
> (eyebrow *Kept for good*), *4 of 14 rewards kept* once, in the hero; *What you have* has no count; the
> title you wear is first in its rail (*Titles · tap to wear*); on the road the NEXT reward keeps its pill
> and drops the bar and XP line the hero already shows; the level ring and the next bar are the accent,
> not teal; the rank name no longer wraps at 320 px.
The reward track, as a tab of its own (screen id `pass`, drawn by `renderPass()`). Four ways
in: the tab bar; the **level ring** or the **rank** on Today's hero, both `go('pass')` — the
rank lives here and nowhere else now that Progress dropped its strip; the profile card at
the top of Settings; and Settings → *Locker*. A fifth comes from outside, once Career Mode's XP switch is on: the training
app's Career row opens `habits.html?client=<id>&go=pass` (read at the end of boot, after `?open=<id>`, which wins if both are
given, and never in the embed). Top to bottom it draws:

> **Once the catalogue switch is on (Career Mode phase 3):** *What you have* opens with the **Grand Slam row** (a title per kind
> of win, *Not yet* in grey, the GRAND SLAM plate when all four are held), and the title rail carries the catalogue's titles
> (CLOCKWORK, CENTURY …) beside the road's, the events' and the seasons'.

1. **The pass hero** — level ring, rank crest and name, its metal tier with the XP into this
   level, *N of 14 rewards kept*, and a **NEXT ON THE ROAD** button that scrolls the track
   to that reward (*THE ROAD IS CLEARED* once there is none).
2. **What you have** (it was *Your loadout*) — a preview of the rank card in the equipped skin, the equipped
   title beside it and **Share it →** into the share picker, then two horizontal rails of what the
   athlete **owns**: *Titles* (level, event and season titles, as metal plates — tap to
   wear, tap again to show none) and *Card skins*.
3. **Seasons** — the shelf of finished seasons, drawn only once one has closed.
4. **The road** (it was *The pass*) — the 10 ranks as gates with the 14 rewards threaded between
   them, the *YOU ARE HERE* marker at the athlete's exact level, and the star past 50.
   **Folded to the next three rewards** (PRF-02, Amir's 5A, 2026-09-27): the rank you are in,
   the marker and the next three rewards with any rank they cross into, then **The whole road
   to level 50**, which opens the rest (`CFG.msOpen.road`, remembered). At level 9 the road
   ran to level 50, about 300 days away: 2,954 → 1,447 px. The road is built as a list of
   rows (`items`) so the fold is a slice of the same markup.

*How rewards work* at the foot opens the manual. The design, and the three shapes it went
through, are in *The long game* below.

---
*One section of the reference. The index is [`HABITS.md`](../../../../HABITS.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
