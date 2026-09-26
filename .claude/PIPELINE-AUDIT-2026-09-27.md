# The second pipeline audit (26–27 September 2026): what it found and what shipped

A fresh audit, separate from the first one (`PIPELINE-AUDIT-2026-09-26.md`). It asked four questions
of the programme pipeline: is it fast, does it waste tokens, does it make sense, and is the quality
of the programmes protected. The full report is a claude.ai page, *Coaching Pipeline Audit II*
(https://claude.ai/artifact/Wx5dkAJcqVtkoHePtGomUV). This file is the record that stays with the repo.
No athlete is named here, because the repo is public.

## 1. What it found

- **The new pipeline had never run end to end.** No programme had been written by `publish_cycle()`,
  no coaching log had a profile, no cycle carried week notes, and there were no `Checks:` lines.
  The first real cycle is still the real test (the first audit's §5.4 says the same).
- **Speed.** Claude re-typed big query results into files (the 39,000-character Spine catalogue
  every cycle), and on Amir's PC every `python3` command failed once: `python3` there is the
  Microsoft Store stub.
- **Tokens.** A returning athlete's cycle loaded about 620,000 characters before Claude wrote
  anything; roughly 15 to 25 percent could go without touching a rule.
- **Makes sense.** 19 lines contradicted each other or pointed at things that had moved; five of
  them could change a programme (the first-cycle test rule, hand-typed checker flags, two stories
  teaching the opposite of their index lines, a sentence that dropped four Quality headlines).
- **Three bugs.** A publish retry would append the cycle's log entry twice (and fail outright for a
  new athlete); Part B printed the handoff before the Spine upkeep it needs; the `python3` stub.
- **Solid.** The checker's tests, the rule-index guard, the deployed database functions (identical
  to the repo), the Spine (222 entries, all approved with cues and counts), no athlete ids in the
  public pipeline files.

## 2. Amir's answers (27 September), and where each lives now

| # | Question | Answer | Where it lives |
|---|---|---|---|
| 1 | A filmed AMRAP baseline in a new athlete's first cycle? | No | TST-3 now says no max-effort set in a first cycle; the checker fails a retest flag there (TST-5) |
| 2 | Save the roadmap to the row when it locks? | Yes | PRC-3; /program-roadmap *Save it*; assemble publishes a new athlete like a returning one |
| 3 | Part A straight into engage? | Yes | PRC-4; assemble Part A, the how-to (no "do prompt 2" unless a check stops) |
| 4 | A local query script with the Supabase token? | Claude's call: **not now** | The token is unrotated; the checker's own name matching and checksums removed the worst re-typing without it. Revisit after the rotation |
| 5 | Replace `git pull --rebase` in design? | Claude's call: **yes** | Design STEP 0.0: fetch, list the changed pipeline files, read only those from `origin/main`, never move the shared HEAD |
| 6 | Move the dated history out of the principles? | Yes | `COACHING-PRINCIPLES-HISTORY.md` (166 dated blocks, 30 notes, 20.7K characters) |
| 7 | TST-5 and SES-9 in the checker now? | Claude's call: **yes** | `check_program.py` (with NAM-2, NAM-4 and NAM-8 as part of the name matching) |
| 8 | The academy limits in those athletes' profiles? | Yes | `program-design/PROFILE.md` (`tier: academy`), intake sets it; the one academy player's log started with a `status: partial` profile that flags a tier question for Amir |
| 9 | Remove the leftover worktree? | Yes, clean up | Removed (it was clean and already in `main`) |

## 3. What shipped (all on `main`, 27 September)

- **The checker** (commit 2b2ba16): card names resolved on the server inside the one `--spine-sql`
  query, with checksums that stop the run on a copy error; TST-5, SES-9, NAM-2, NAM-4, NAM-8; the
  RPE-floor sentence test no longer passes "Day 6"; last cycle's real-to-model minutes ratio, each
  day's expected real length, and minutes in the `--tables` day table. Tests 154/154; rule index 148
  rules, 59 checked. The principles' dated history moved to its own file.
- **The skills** (this commit): the fixes for F1–F8 and S1–S8 in the report, and every stale line in
  its table: the retry sends the programme only; Step 6 split into 6a (before publishing) and 6b (the
  closing SPINE and QUALITY lines after the upkeep); `python` on this PC; shared queries in
  `program-design/queries.sql`; the profile format in `program-design/PROFILE.md`; the context pull
  returns the whole log while there is no finished profile; design no longer reads `PRODUCT.md`;
  edit reads the rule index, not the whole file, and runs the volume tables only when a set count
  changes; cycle-report's Q1 returns the cards and Q4 no longer reads the retired messages table;
  the Ceiling section trimmed to its rules; "they" for athletes in general.
- **Sizes that design reads every run:** principles 134.5K → 115.7K, the design skill 60.1K → 52.8K,
  `PRODUCT.md` (11.6K) no longer read, and the 39K catalogue no longer re-typed in Part A.

## 4. Still open

- **Amir's to do (security):** rotate the Supabase access token and secret key (open since May,
  first audit §5.1). The old token is written in plain text inside two old `claude mcp add` entries
  in `.claude/settings.local.json` (the file is gitignored and was never committed): delete those
  two entries after rotating. Also remove `Bash(git stash *)` and `Bash(git checkout *)` from that
  file's allow list, so Claude asks before either in the shared folder.
- **The local query script** (question 4): worth it once the token is rotated.
- **At the freeze review (PRC-25):** the other mechanical rules a script could check (SES-10, CHP-6,
  SEL-20, PRG-10, SES-3), with VOL-12 from the first audit.
- **Watch the first real cycles:** they are the first run of the whole new order.
