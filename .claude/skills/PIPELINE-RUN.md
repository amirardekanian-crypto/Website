# How a programme run is split (PRC-29)

Written 2026-10-17 from a new athlete's run that cost about $36 and four hours, two of them stalled. Half of the
cost was re-reading: the run lived in ONE conversation, which grew from 106k to 781k tokens, and every step re-reads
everything before it (by Part B each step re-read ~760k). The skills (/athlete-intake, /program-roadmap,
/program-design, /program-assemble, /program-engage, /spine Upkeep) are unchanged in WHAT they do; this file is
HOW a run is carried out.

## The rule

**The main conversation talks to Amir and writes the database. Every heavy stage runs as a helper** (the Agent
tool, `run_in_background: false`, a `general-purpose` agent) that starts fresh (about 83k tokens instead of the
main conversation's 500k+), reads its inputs from scratchpad files, writes its outputs to scratchpad files, and
returns a short summary (under ~300 words: what it decided, the file paths, the questions for Amir, every FAIL and
WARN). Effort is set per helper, by this file's word (the Agent tool's `effort`):

| Stage | Who | Effort | Reads | Writes |
|---|---|---|---|---|
| Intake questions, every answer from Amir | main | — | the form | `brief.md` |
| Roadmap draft (+ `check_program.py <cycles.json>`) | helper | max | brief, principles | `roadmap.md`, `cycles.json` |
| Roadmap reviewer | helper (files only, PRC-5) | high | the three files | must-fixes |
| Roadmap save | main | — | `cycles.json`, log v0 | the server |
| Design STEP 0-1 analysis | helper | max | context pull file, roadmap, brief, principles | `analysis.md` + the checkpoint questions |
| Checkpoint | main | — | the helper's questions | Amir's answers into `answers.md` |
| Spec (STEP 2-3) | helper | high | `analysis.md`, `answers.md`, principles | `spec.md` |
| Part A build + check | helper | medium | `spec.md`, the Spine file | `<id>.json`, `check_build.txt` |
| New-athlete reviewer (PRC-4) | helper (files only) | high | brief, spec, build, check | must-fixes |
| Engage words | helper | high | spec, build, roadmap, principles' index | `words.json`, `whatsapp.txt` |
| Part B: place words, full check, log entry | helper | medium | the above | `<id>_final.json`, log files, `publish.sql` |
| Publish (`publish_cycle()`) | main | — | `publish.sql` | the server |
| Spine upkeep | helper | medium | the live programme | proposals (it may write the Spine itself: it runs in the foreground) |

- A helper never asks Amir anything: it returns its questions and the main conversation asks them.
- The main conversation never reads the principles, the skills in full or the whole Spine: the helper that needs
  them does. It reads only what it must act on (a summary, a check line, the SQL it sends).
- A database write the main conversation sends is built by a helper into a file; the main conversation sends it
  as written and reads back what it changed.
- A late design change (Amir changes something after the review, or the reviewer's own suggestions go in) gets a
  **delta review**: a files-only helper reads only the changed cards and their words, against the rule index
  (PRC-4).

## Before anything is planned (INT-11)

The intake question round confirms the form's frame with Amir: days a week, session length, the kit list, and
anything the athlete asked him directly. The roadmap helper is not started until he answers.

## The Spine snapshot for the checker

```
python scripts/check_program.py <id>.json --spine-sql --pad     # the query, with a padding column
# send it; the connector saves the whole answer to a file (the result names it)
python scripts/save_spine_result.py <that file> <scratch>/spine_<id>.json   # verifies the checksums
```

One snapshot per build. Re-run it only when an exercise was added or renamed.

## The Supabase connector

- **A timeout is not an answer.** The connector can stall for minutes (2026-10-14: 12, 22 and 107 minutes) and
  returns "timed out after 60s" for a write that never reached the database. After any timeout, read the row back
  before anything else; never resend blind.
- **Dollar quoting is fine** (tested 2026-10-17: a `$R$` literal came back byte-identical). The timeouts that
  looked like quoting were the connector.
- **Some long writes never arrive**, for no reason found (2026-10-17: a coaching-log `replace()` timed out three
  times while smaller writes of the same text went through). Split a long log change into small statements, each
  guarded so a retry cannot apply it twice (`where body not like '%<marker>%'`).
- **During a long run, arm a check-in.** Before a stage that makes several connector calls, schedule
  `send_later` 15 minutes ahead ("check-in: is the run still moving?"). A stalled session restarts when a message
  reaches it; when the check-in arrives and all is well, ignore it and arm the next one only if work remains.
  Delete the pending one when the run ends.

## Measuring a run

`python scripts/session_cost.py <transcript.jsonl>` prints the calls, the peak and average context, the cost by
phase, the stalls and the biggest tool results of one Claude Code session. Transcripts live in
`~/.claude/projects/<the repo's folder>/` (newest file = this session). Run it at the end of a pipeline run and
paste the summary into the handoff, so a run that leaks shows up the same day.
