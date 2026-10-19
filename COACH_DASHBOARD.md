# The Coach's Box — user manual

A plain-English guide to `coach.html`: Amir's private mission control. Every
threshold below is the real value from the code, so this doubles as the
reference for how the flagging actually works.

**Redesigned 2026-08-09.** The old dashboard was a triage list of coached
athletes and nothing else — built before Proof existed, so it could not see the
habit crew, the wall, the board or the funnel, which is most of what happens on
a given day. It went unused. This version opens on **what today needs**, and it
covers **both halves of the business** in one place.

**Audited 2026-10-10** (`docs/record/COACH-AUDIT.md`: what was wrong, what changed, what is still
open, and the harness that tests the write paths). The short version of what changed for you:
the inline editor can no longer overwrite a newer programme, every number that says "needs you"
comes from one rule, the tabs fit a phone, and a failed load or save says so instead of looking
like an empty list or a success.

---


**This file is the index now.** Every word it ever had is still here, one file per section, listed below. Open the one section you need; nothing reads the whole reference. The rules that must never break are in [`docs/rules/`](docs/README.md).

## The sections — open the one you need, never the whole reference

| # | Section | Size |
|---|---|---|
| 01 | [1. Getting in](docs/ref/coach-dashboard/01-1-getting-in.md) | 1 KB |
| 02 | [2. The seven places, in one bar](docs/ref/coach-dashboard/02-2-the-seven-places-in-one-bar/INDEX.md) | 41 KB · 6 parts |
| 03 | [3. TODAY](docs/ref/coach-dashboard/03-3-today.md) | 19 KB |
| 04 | [4. ATHLETES](docs/ref/coach-dashboard/04-4-athletes.md) | 7 KB |
| 05 | [5. The athlete file (`#a/<id>`)](docs/ref/coach-dashboard/05-5-the-athlete-file-aid/INDEX.md) | 26 KB · 6 parts |
| 06 | [6. The three metrics](docs/ref/coach-dashboard/06-6-the-three-metrics.md) | 3 KB |
| 07 | [7. PROOF](docs/ref/coach-dashboard/07-7-proof/INDEX.md) | 27 KB · 3 parts |
| 08 | [8. ⚠ What this page deliberately does NOT do](docs/ref/coach-dashboard/08-8-what-this-page-deliberately-does-not-do.md) | 0 KB |
| 09 | [9. Where the data comes from](docs/ref/coach-dashboard/09-9-where-the-data-comes-from.md) | 7 KB |

---

*9 sections, split 2026-10-19. Every word is where it was; only the file changed. A reference written "`COACH_DASHBOARD.md` → *Section*" is the row with that name.*
