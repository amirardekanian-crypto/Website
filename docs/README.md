# `docs/` — four layers, so a session reads only what its job needs

| Layer | Where | Read it… |
|---|---|---|
| **The door** | [`../CLAUDE.md`](../CLAUDE.md) | every session, automatically. Who/what this is, the non-negotiables, and the READ-LIST that says which files a given job opens. |
| **Rules** | [`rules/`](rules/) | one short file per area, opened when you change that area. The rule, current tense. If a rules file and anything else disagree, the rules file wins. |
| **Reference** | [`ref/`](ref/) | one file per section, looked up by name from an `INDEX.md`. Never read whole. |
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

## House rules for these files

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
