# Career Mode: the procedures

Every function the system needs, step by step, in plain words. Each one says **when** it runs, what it **reads**, its
**steps**, what it **writes**, and the rules it obeys (GAME-n, in [`CAREER_MODE.md`](CAREER_MODE.md) → *The rules*).

**Status (2026-10-18): phase 1 is live, in shadow** (P1, P2, P3, P4, P10, P12, P14, P15: *Phase 1, as built*, at the
end; applied to the live project on Amir's yes, seeded, 34 of 34 athletes matching Proof). **Phase 2, the XP switch, is built,
rehearsed and switched on (2026-10-18)** (P1 step 4, P3, P4, P10, P13, P14 steps 4 to 6, P17: *Phase 2, as built*, at the end). **Phase 3, rewards with meanings and the catalogue switch, is built, applied and switched on (2026-10-18)** (P5, P8 in part, P10, P14, P15, P17: *Phase 3, as built*, at the end). The
rest is a specification. When a phase is built, its SQL follows these steps; when a step here changes, the code
changes with it. The numbers they use live in `rulebook.toml`, and the rewards, missions and quests in the other `.toml`
files: a procedure never hard-codes a number (GAME-10).

| # | Procedure | Runs | Phase |
|---|---|---|---|
| P1 | Turn an action into a fact (`observe()`) | on every save | 1 |
| P2 | Work out the derived facts (`derive()`) | inside P1 | 1 |
| P3 | Score: XP from facts (`score()`) | on read, cached | 1 |
| P4 | Level, rank and the season | inside P3 | 1–2 |
| P5 | Mint rewards (`evaluate()`) | after P1 | 3 |
| P6 | Weekly missions (`plan_missions()`, progress) | Monday, and after P1 | 5 |
| P7 | Personal quests | when set, and after P1 | 7 |
| P8 | Route recognition (`route()`) | after P5, P6, P7 | 3–6 |
| P9 | Amir's tools: reaction, commendation, Amir's Pick | from coach.html | 4 |
| P10 | The profile (`get_profile()`) | when an app opens | 1–2 |
| P11 | Courtside and the Bell (`get_courtside()`, `get_bell()`) | when opened | 4, 6 |
| P12 | Voids and erasure | on hide, on erase | 1 |
| P13 | Offline and the preview | on a tick | 2 |
| P14 | Shadow, then the switch | once | 1–2 |
| P15 | The tables | built with each phase | 1–7 |
| P16 | Changing a detail | whenever Amir wants | any |
| P17 | Instant feedback: every meaningful action answers at once (GAME-13) | on every tap that makes a fact | 2–3 |

---


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](../docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [P1. Turn an action into a fact: `observe()`](../docs/ref/career-procedures/01-p1-turn-an-action-into-a-fact-observe.md) | 2 KB |
| 02 | [P2. Work out the derived facts: `derive()`](../docs/ref/career-procedures/02-p2-work-out-the-derived-facts-derive.md) | 3 KB |
| 03 | [P3. Score: XP from facts: `score()`](../docs/ref/career-procedures/03-p3-score-xp-from-facts-score.md) | 1 KB |
| 04 | [P4. Level, rank and the season](../docs/ref/career-procedures/04-p4-level-rank-and-the-season.md) | 1 KB |
| 05 | [P5. Mint rewards: `evaluate()`](../docs/ref/career-procedures/05-p5-mint-rewards-evaluate.md) | 3 KB |
| 06 | [P6. Weekly missions](../docs/ref/career-procedures/06-p6-weekly-missions.md) | 3 KB |
| 07 | [P7. Personal quests](../docs/ref/career-procedures/07-p7-personal-quests.md) | 1 KB |
| 08 | [P8. Route recognition: `route()`](../docs/ref/career-procedures/08-p8-route-recognition-route.md) | 1 KB |
| 09 | [P9. Amir's tools](../docs/ref/career-procedures/09-p9-amirs-tools.md) | 0 KB |
| 10 | [P10. The profile: `get_profile()`](../docs/ref/career-procedures/10-p10-the-profile-get-profile.md) | 0 KB |
| 11 | [P11. Courtside and the Bell](../docs/ref/career-procedures/11-p11-courtside-and-the-bell.md) | 0 KB |
| 12 | [P12. Voids and erasure](../docs/ref/career-procedures/12-p12-voids-and-erasure.md) | 0 KB |
| 13 | [P13. Offline and the preview](../docs/ref/career-procedures/13-p13-offline-and-the-preview.md) | 0 KB |
| 14 | [P14. Shadow, then the switch](../docs/ref/career-procedures/14-p14-shadow-then-the-switch.md) | 2 KB |
| 15 | [P15. The tables](../docs/ref/career-procedures/15-p15-the-tables.md) | 2 KB |
| 16 | [P16. Changing a detail](../docs/ref/career-procedures/16-p16-changing-a-detail.md) | 1 KB |
| 17 | [P17. Instant feedback: every meaningful action answers at once (GAME-13)](../docs/ref/career-procedures/17-p17-instant-feedback-every-meaningful-action-answers.md) | 2 KB |
| 18 | [Phase 1, as built (2026-10-17)](../docs/ref/career-procedures/18-phase-1-as-built.md) | 8 KB |
| 19 | [Phase 2, as built (2026-10-17): the XP switch](../docs/ref/career-procedures/19-phase-2-as-built-the-xp-switch.md) | 6 KB |
| 20 | [Phase 3, as built (2026-10-18): rewards with meanings, and the catalogue switch](../docs/ref/career-procedures/20-phase-3-as-built-rewards-with-meanings-and-the-catal.md) | 59 KB |
| 21 | [Stage 75: Courtside, as built (2026-10-19)](../docs/ref/career-procedures/21-stage-75-courtside-as-built.md) | 8 KB |
| 22 | [Stage 76: D20, as built (2026-10-19)](../docs/ref/career-procedures/22-stage-76-d20-as-built.md) | 3 KB |
| 23 | [Stage 78: the cut, as built (2026-10-19)](../docs/ref/career-procedures/23-stage-78-the-cut-as-built.md) | 3 KB |
| 24 | [Stage 79: the new achievements, as built (2026-10-19)](../docs/ref/career-procedures/24-stage-79-the-new-achievements-as-built.md) | 4 KB |
| 25 | [Stage 80: the Four Courts read, as built (2026-10-19)](../docs/ref/career-procedures/25-stage-80-the-four-courts-read-as-built.md) | 2 KB |
| 26 | [Stage 81: Crew and the Bell, as built (2026-10-19)](../docs/ref/career-procedures/26-stage-81-crew-and-the-bell-as-built.md) | 10 KB |
| 27 | [Stage 82: the emoji beside the Like, as built (2026-10-19)](../docs/ref/career-procedures/27-stage-82-the-emoji-beside-the-like-as-built.md) | 3 KB |
| 28 | [Stage 83: the Bell's feed only when it has changed (2026-10-19)](../docs/ref/career-procedures/28-stage-83-the-bells-feed-only-when-it-has-changed.md) | 2 KB |
| 29 | [Stage 85: the Monthly Open, as built (2026-10-19)](../docs/ref/career-procedures/29-stage-85-the-monthly-open-as-built.md) | 6 KB |
| 30 | [Stage 86: the crew on a phone, as built (2026-10-20)](../docs/ref/career-procedures/30-stage-86-the-crew-on-a-phone.md) | 13 KB |
| 31 | [Stage 91: the week first on Crew, as built (2026-10-20)](../docs/ref/career-procedures/31-stage-91-the-week-first-on-crew.md) | 6 KB |
| 32 | [Stage 92: the crew's replies, as built (2026-10-20)](../docs/ref/career-procedures/32-stage-92-the-crew-s-replies.md) | 5 KB |
| 33 | [Stage 95: a season counts what was done in it, as built (2026-10-20)](../docs/ref/career-procedures/33-stage-95-a-season-counts-what-was-done-in-it.md) | 4 KB |
| 34 | [Stage 99: the Emblem Cabinet, server side (2026-10-25, applied)](../docs/ref/career-procedures/34-stage-99-the-emblem-cabinet.md) | 7 KB |

---

*34 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`PROCEDURES.md` → *Section*" is the row with that name.*
