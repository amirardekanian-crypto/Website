## The rules

The index line is the rule. A later doc cites the ID instead of restating it, the way `COACHING-PRINCIPLES.md` works.

| ID | Rule |
|---|---|
| **GAME-1** | **Facts are stored, points are derived, rewards are kept.** A fact changes only when the thing it records changes (an open day's habit count, a corrected session) and is voided, never deleted. XP and level are worked out from facts with the current rules. A badge, achievement or title, once minted, is never taken back. |
| **GAME-2** | **One scorer, on the server.** The apps write facts and show the profile. A phone may preview a tick's XP from the rulebook, marked pending; the server's number is the number. |
| **GAME-3** | **Every reward means something.** Each belongs to one of the four meanings and says in one sentence what it proves. |
| **GAME-4** | **The plan is the biggest earner.** A held training week is worth about half of a perfect week. Past the plan, XP shrinks (caps), so more never beats as written. |
| **GAME-5** | **Pay for the act, never for the value.** Logging an RPE pays; the RPE number never does. Answering the check-in pays; the answers never do. Progress is judged against the athlete's own history at the same effort, and a Progress reward needs the weight or the reps to go up: a lower RPE alone shows on the This cycle card and earns nothing. |
| **GAME-6** | **Social actions pay nothing.** Kudos, roll call lines and shares are the recognition, not the work. |
| **GAME-7** | **Missions and quests pay the same share of the work inside them.** A mission on a cheap habit is a cheap mission. Amir's lesson from the 27 July 2026 quest run: NO NEGOTIATION paid 7 times a supplement's value and THREE HARD DAYS 2.5 times a session's, and supplements took the board. |
| **GAME-8** | **Nothing is lost.** A hidden or deleted session stops paying from then on, and what it minted stays. A quest pauses; it never fails. |
| **GAME-9** | **The bigger the audience, the clearer the yes.** The athlete sees everything about themselves and Amir sees every athlete. The crew sees only what the athlete agreed to show, the public only what the athlete shares or approves. |
| **GAME-10** | **Every number is a row.** XP values, badges, achievements, missions, quests and thresholds live in the `.toml` files and, once built, in their tables. Changing a detail never needs new code. |
| **GAME-11** | **Amir's time is budgeted.** The system finds the moment and writes the message. He spends seconds each, about 10 minutes a week in all. |
| **GAME-12** | **One system for everyone.** Free and coached athletes share the rules and the board. A free athlete simply has no training facts. |
| **GAME-13** | **Every meaningful action answers at once, visibly.** In the same moment as the tap, never waiting for the network: what it earned, where it moved the athlete, and the nearest goal it touched. Nothing changes on screen without the athlete seeing it move. (Amir, 2026-10-17; `PROCEDURES.md` → P17.) |
| **GAME-14** | **Every reward is celebrated: a moment at its size for the athlete, and from highlight up a share card in its app's card family.** The instant answer is GAME-13; this is the celebration and the card. The training's family is Highlight Reel (`assets/js/sharecard.js`, built 2026-10-17: the five training cards, and a badge tier, an achievement, a title, a level and a quest drawn already for phase 3, opened by program.html's `openShareSheet()` and `openMoment()`); Proof's cards keep Proof's look. A card is drawn on the phone and leaves only when the athlete taps Share or Save; a share pays nothing (GAME-6). (Amir, 2026-10-17: *"the achievements, badges and other things need to have a celebration as well, those are important as well"*; `PROCEDURES.md` → P8.) |

---
*One section of the reference. The index is [`career/CAREER_MODE.md`](../../../career/CAREER_MODE.md); the rules are in [`docs/rules/`](../../../docs/README.md).*
