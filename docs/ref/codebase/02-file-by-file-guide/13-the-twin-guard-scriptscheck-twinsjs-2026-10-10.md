### The twin guard (`scripts/check_twins.js`, 2026-10-10)

Pre-commit guard 15, run whenever `program.html`, `coach.html`, `assets/js/chips.js` or (since 2026-10-18) `habits.html`, a `career/*.toml`, `scripts/career_seed.py` or
`scripts/career/{hold,xp,reward}_cases.json` is staged. coach.html
re-implements some of the athlete app's rules, so a change to one copy alone makes the coach and the athlete
see different numbers with nothing erroring (coach.html audit, TWIN-10). The script cuts each pair out of
both files by function name, compiles each side in its own sandbox and runs the same vectors through both:
the exercise-name tiers, a renamed lift, the Spine lookup, today's RPE target on a lower day, what the
Quality check counts, and the check-in line (the app's writer `readinessPlanLine()` against the email
import's reader `parseCheckinPlan()`, 300 random answer sets included). A function it cannot find fails, so a
rename has to come here. It also checks coach.html's hand-typed `chips.js?v=` token: an edit to chips.js under
an unchanged token fails (the service worker serves `/assets/` cache-first); bump it, then run
`node scripts/check_twins.js --stamp` to refresh `scripts/twins_stamp.json`. `scripts/test_check_twins.js`
breaks a copy of the files on purpose, 131 ways, and requires the guard to fail each time. The known, deliberate
differences (the week-note input, drafts, the leftover-session window, the retest flag) are in the script's header.
Career Mode's phone copies are sections 8 to 11 (2026-10-17/18; 65,472 checks in all, section 11 being a lift in its own measure, the weight units' stage72): the weeks held in a row, phase 2's curve and the day's XP, and phase 3's award id, the
phone's scoring (`habits.html awardMeasures()` / `phoneAwardsFrom()`, held to the server's `reward_cases.json` and to a measure grown by hand for every entry and every tier),
the finish card's lines (a plan day done again in its week moves no session count) and Home's pending session, and the five events' goals against `career/*.toml` (read through `career_seed.py --json`; in index mode the toml, the seed script, the checker, the
snapshot and `coach.html` come from the index, like `habits.html`). Already guarded elsewhere: `rxOf()` (`check_rx.js`), the set-log grammar (`check_setlog.js`), the word lists
(`check_parity.py`), the XP rules (`check_xp_rules.py`).

---

---
*One section of the reference. The index is [`CODEBASE.md`](../../../../CODEBASE.md); the rules are in [`docs/rules/`](../../../../docs/README.md).*
