# `docs/` — four layers, so a session reads only what its job needs

| Layer | Where | Read it… |
|---|---|---|
| **The door** | [`../CLAUDE.md`](../CLAUDE.md) | every session, automatically. Who/what this is, the non-negotiables, and the READ-LIST that says which files a given job opens. |
| **Rules** | [`rules/`](rules/) | one short file per area, opened when you change that area. The rule, current tense. If a rules file and anything else disagree, the rules file wins. |
| **Reference** | [`ref/`](ref/) | one file per section, looked up by name from its index. The athlete app's index is [`../PROGRAM-APP.md`](../PROGRAM-APP.md) (49 sections), AA Proof's is [`../HABITS.md`](../HABITS.md) (19). Never read whole. |
| **Record** | [`record/`](record/) | never, unless you ask for it. Dated audits, walkthroughs, histories. |

The atlas across the whole repo — pages, assets, skills, scripts, docs — is
[`../MAP.md`](../MAP.md).

## The rules files

| File | Area |
|---|---|
| [`rules/server-and-data.md`](rules/server-and-data.md) | programmes live on the server; backups; coaching logs; erasure |
| [`rules/program-app.md`](rules/program-app.md) | the athlete app: data, sessions, saving |
| [`rules/program-app-look.md`](rules/program-app-look.md) | the athlete app: screens, cards, colour, navigation |
| [`rules/habits.md`](rules/habits.md) | AA Proof, the habit app |
| [`rules/coach-dashboard.md`](rules/coach-dashboard.md) | the coach dashboard |
| [`rules/career.md`](rules/career.md) | Career Mode |
| [`rules/push.md`](rules/push.md) | reminders on a phone |
| [`rules/site.md`](rules/site.md) | the public site, the Farsi products, the chatbot |
| [`rules/seo.md`](rules/seo.md) | article pages, SEO, content parity |
| [`rules/design.md`](rules/design.md) | design work |
| [`rules/coaching.md`](rules/coaching.md) | the coaching pipeline and the rule index |
| [`rules/working-with-amir.md`](rules/working-with-amir.md) | how Amir works; verifying the live site; the hooks setup |

## The reference

A monolith is its own index: one line per section, each line linking to that section's file. A reference written "`PROGRAM-APP.md` → *The working card*" is the row with that name — follow it, read that file, stop.

| Index | Sections live in | Count |
|---|---|---|
| [`../PROGRAM-APP.md`](../PROGRAM-APP.md) | [`ref/program-app/`](ref/program-app/) | 49 |
| [`../HABITS.md`](../HABITS.md) | [`ref/habits/`](ref/habits/) | 19 |
| [`../COACH_DASHBOARD.md`](../COACH_DASHBOARD.md) | [`ref/coach-dashboard/`](ref/coach-dashboard/) | 9 |
| [`../CODEBASE.md`](../CODEBASE.md) | [`ref/codebase/`](ref/codebase/) | 6 |
| [`../XP_SYSTEM.md`](../XP_SYSTEM.md) | [`ref/xp-system/`](ref/xp-system/) | 19 |
| [`../career/PROCEDURES.md`](../career/PROCEDURES.md) | [`ref/career-procedures/`](ref/career-procedures/) | 29 |
| [`../career/CAREER_MODE.md`](../career/CAREER_MODE.md) | [`ref/career-mode/`](ref/career-mode/) | 17 |

`SCHEMA.md` is the exception: `scripts/check_parity.py` parses two of its tables, so it stays one file and carries a jump table at the top instead.
`.claude/COACHING-PRINCIPLES.md` is the other: `scripts/check_rule_index.py` parses its rule index, and that index is already the pattern everything here copies.

A section of 20 KB or more with two or more sub-headings is split again into a folder with its own `INDEX.md`. Nothing is reworded in a split: every line of the monolith still exists, byte for byte, in exactly one file.

## House rules for these files
### Why the rules layer was not mined out of the reference

Every rule that must never break was already in `CLAUDE.md`, which is why that file had grown to 99 KB. Those sections are the twelve rules files, moved verbatim. Lifting more lines out of the reference would make a second copy of a rule — the exact fault `scripts/check_twins.js` exists to catch. So the reference keeps the full account and the rules files stay the one short place a rule is stated.

A NEW rule goes in its area's rules file, one line, with its ID. Its story goes in the reference section it belongs to, or in `record/`.


- **A rule's wording and its ID never change in a move.** `VOL-8`, `CUE-7`, `PRC-29`,
  `GAME-14`, `D20`, `REL-01`, `NAV-01`, `TWIN-1` and the rest keep their exact text. Where
  the coaching rule index restates one, the index wins (PRC-23).
- **A rules file stays small.** `scripts/check_docs.py` (pre-commit) holds each one to its
  recorded size and fails a commit that grows it past the ceiling, the same ratchet idea as
  `scripts/check_site_style.py`. Growing an area means splitting it, not swelling it.
- **A cross-reference must resolve.** The same guard fails a commit with a dead link
  between docs.
- **New narration goes in `record/`, not in a rules file.** The rule is the line; the story
  of who decided it and when is the record.
