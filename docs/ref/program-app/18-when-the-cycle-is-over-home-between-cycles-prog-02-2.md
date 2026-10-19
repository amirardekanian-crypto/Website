## 🏁 When the cycle is over: Home between cycles (PROG-02, 2026-10-10)

**Since 2026-10-12 the Cycle complete card is on Progress; Home opens with a *Cycle N complete* door row to it**, then
Up next and the rest as below (*Home and Progress in the Centre Court look*, above).

Athletes kept training after their cycle ended, taking the cycle for a week. The day after the end date the This cycle
card shrank to the small line, whose "Weeks 6–10" is the *roadmap's* count, the "days left" banner went (it shows from
14 days down to 0), and This Week started again at "0 of 3 sessions done this week" under the big day cards: the app
told them to train. Amir picked direction B of three mockups (https://claude.ai/artifact/Cb6wBcfLhJ48rbz5HtuYDF):

- **The card says so** (`paintCycleCard()`, `p.over`): the day after the current cycle's `endDate` (the end date itself
  is still the cycle), the same card reads **Cycle complete**, *Finished Oct 6 · 5 of 5 weeks*, the week bar full, the
  sessions done against planned (up to the end date only: a session repeated since never counts) and the wins. On the
  roadmap's last cycle it is **Roadmap complete**, *3 cycles · 15 weeks* (the weeks only when every cycle is dated) and
  one filled segment per cycle. No wins: nothing, not the "your wins show here" line.
- **Up next** (`betweenCyclesHTML()`, where This Week was): Game Plan's own card for the next cycle, folded, its Read
  more in place and a tap to Game Plan, then the one ask, a WhatsApp door: **Ready for Cycle 3?** *Message Amir to start
  it.* On the last cycle: **What's next**, *You've trained the whole plan.* and the same door, **Ready for Cycle 4?**
- **One ask, in all situations** (Amir, 2026-10-10: *"dont say amir is making the other one, just say 'Ready for
  NextCycle ? Message Amir to start it' in all situations"*). The first version said "Amir is building it now" for 14
  days, then this; it went the same day. Nothing on Home says the next cycle is being made.
- **Game Plan marks it Done**: past the end date the cycle's row on Progress's road reads **Done** (`is-done`, its
  numeral solid; it was the card's Active pill and the meter's segment until 2026-10-13), and the Why door stays under it.
- **Between cycles**: *No new week until Cycle 3 starts. Want to keep moving? Any session from Load & Build still works.*
  and one **Repeat a session** row (`#bt-rep`) that unfolds the day cards (`paintBetweenFold()`, `.bt-folded`). They stay
  folded unless it is open or a session is under way: that card carries Resume, so it never hides. No week count, no
  suggested day (`markSuggestedDay()` marks only a session under way) and no week-done Library extra (LIB-01's two
  moments stay two).
- It ends when the next cycle is published (`currentCycleIndex` moves on). A cycle with no dates cannot end and never
  shows any of this; the demo has none. `cycleOver()` is the one test.
- The guide's *How your program is structured* card says it in Amir's voice. Checked by
  `scripts/headless/cycle-end.js` (running, the end date, 4 and 40 days past, the last cycle light, dark and at 320 px,
  undated, the fold, Read more, Resume, and Game Plan's Active or Done).

---
*One section of the reference. The index is [`PROGRAM-APP.md`](../../../PROGRAM-APP.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
