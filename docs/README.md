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

### The line maps

The docs told you what the rule is; the line map tells you where the code is. The three apps
are one file each — 20,809 lines, 12,831 and 9,613 — so [`ref/line-map/`](ref/line-map/program-app.md)
names every top-level function with its line number, grouped by the area of the app it belongs
to, with the named style blocks and the screens. It is **generated** by
[`../scripts/build_line_map.py`](../scripts/build_line_map.py) from the files themselves and
never hand-edited; pre-commit guard 26 fails a commit whose map is stale. It is reference of the
purest kind: it points at code and restates no rule.

| Map | For |
|---|---|
| [`ref/line-map/program-app.md`](ref/line-map/program-app.md) | `program.html` |
| [`ref/line-map/habits.md`](ref/line-map/habits.md) | `habits.html` |
| [`ref/line-map/coach-dashboard.md`](ref/line-map/coach-dashboard.md) | `coach.html` |
| [`ref/line-map/service-worker.md`](ref/line-map/service-worker.md) | `sw.js` |

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
- **Nothing swells back.** `scripts/check_docs.py` is pre-commit guard 24, the same ratchet
  idea as `scripts/check_site_style.py`: a baseline (`scripts/docs_baseline.json`) records
  what is there today and only shrinks. The ceilings are **12 KB for the door**, **20 KB for
  a rules file**, **12 KB for an index** and **30 KB for a reference section**. Growing an
  area means splitting it, not swelling it; if a ceiling is genuinely wrong, move the number
  in the guard and say why in the commit, rather than adding the file to the baseline.
- **A cross-reference must resolve.** The same guard fails a commit with a dead relative link
  in any `.md`. Two links were already dead when it went in, and sit in the baseline:
  `Content/DESIGN-ATLAS.md` → `app-warmup-preview.jpg` (the file exists nowhere any more) and
  `Content/showreel/README.md` → `../motion/kit/README.md`. Fix either and take its row out.
- **A prose pointer must name something that is there.** A cross-reference written
  `` `PROGRAM-APP.md` `` → *The working card*, chained or not, is checked too: the named part
  must be a heading, a row of that doc's index, or a **bold lead-in**, which is how this repo
  marks a sub-section where a heading would be too heavy. 159 of them exist; the guard holds
  every one. Name the section as it reads — *If D19 is ever a no*, not *If D19 is a no*.
- **A coaching rule ID cited in this layer must exist.** `scripts/check_rule_index.py` does
  that for the skills, the agents and `SCHEMA.md`; it used to cover `CLAUDE.md`, which no
  longer holds those citations, so guard 24 covers `rules/`, this file and `record/INDEX.md`.
- **The listings cannot go stale.** Guard 24 fails a commit where a rules file is not named
  in this file and in `MAP.md`.
- **The guard proves itself.** `python scripts/check_docs.py --selftest` builds a decoy tree
  and checks each of the seven faults is still caught; the hook runs it whenever the guard
  itself changes. Re-record the baseline with `--update-baseline`.
- **New narration goes in `record/`, not in a rules file.** The rule is the line; the story
  of who decided it and when is the record.
