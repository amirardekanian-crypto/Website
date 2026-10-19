# Rules — the coaching pipeline and the rule index

<!-- Rules for one area. The door is CLAUDE.md; the atlas is MAP.md. One rule per line, wording unchanged. -->

- `.claude/COACHING-PRINCIPLES.md` — Amir's codified coaching philosophy. **It opens with the RULE INDEX**
  (2026-09-26): one numbered line per rule (`VOL-8`, `SEL-4` …), the stage that applies it and whether
  the checker enforces it; the bullets below it are the stories. **The index line is the rule**:
  where this file, a skill or SCHEMA restates one, the index wins, and new text cites the ID instead of
  restating (PRC-23). `scripts/check_rule_index.py` (pre-commit) keeps the index, its stories, the
  checker and every cited ID in agreement. Every stage reads the whole index and only its own story
  sections (design's seven are listed in its STEP 0, since 2026-10-17). The dates, Amir's words and each rule's origin are in
  `COACHING-PRINCIPLES-HISTORY.md` (2026-09-27), which no stage reads.
- **`scripts/check_program.py`** — the house rules as a script (2026-09-25). `/program-assemble` runs it on every built programme before any review: the volume count (both log tables and the day loads, counted from each exercise's Spine credits since 2026-09-26), floors, set cap, the 8-rep rule for a new athlete and for a first cycle back after 3+ weeks off (VOL-11, `reentry:`), bans, RPE floors in every note, session length (with last cycle's real-to-model ratio), the Spine gate, every card's name against the Spine, retest flags, block order, the Quality Map, and the publish fingerprint. Every FAIL and WARN it prints names its rule ID. A new athlete then gets ONE reviewer; a returning athlete none unless Amir asks (PRC-4).
- **`.claude/skills/PIPELINE-RUN.md`** — HOW a programme run is carried out (PRC-29, 2026-10-17): the main conversation
  talks to Amir and writes the database, each heavy stage runs as a fresh helper at its own effort, and the Supabase
  connector's timeouts are read back, never resent blind. `python scripts/session_cost.py --latest` measures a run.
- `.claude/skills/*` + `.claude/agents/athlete-brief.md` (data prep only since 2026-09-26: the new athlete's intake form, and the Gmail session import /cycle-report runs first) — the coaching pipeline (intake → roadmap → design → assemble **Part A** (build + every programming check) → engage → assemble **Part B** (words, full check, publish) → **`/cycle-report`** at the end of every cycle: the athlete's WhatsApp report plus a coach-only `## Debrief` section in their coaching log, which `/program-design` reads before the next cycle). the coach-only per-athlete rationale log now lives in `public.coaching_logs`, read and
  written from coach.html (it used to be `.claude/coaching-log/*.md`, in this public repo).
