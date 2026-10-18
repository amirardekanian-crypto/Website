# How a programme run is split (PRC-29)

Written 2026-10-17 from a new athlete's run that cost about $36 and four hours, two of them stalled. Half of the
cost was re-reading: the run lived in ONE conversation, which grew from 106k to 781k tokens, and every step re-reads
everything before it (by Part B each step re-read ~760k). The skills (/athlete-intake, /program-roadmap,
/program-design, /program-assemble, /program-engage, /spine Upkeep) are unchanged in WHAT they do; this file is
HOW a run is carried out.

## The rule

**The main conversation talks to Amir and writes the database. Every heavy stage runs as a helper** (the Agent
tool, `run_in_background: false`, a `general-purpose` agent) that starts fresh (about 107k tokens on 2026-10-18 instead of the
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
| Spine drafts for the spec's `new_exercise:` lines (before the build) | helper | medium | `spec.md` | the Spine drafts |
| Part A build + check | helper | medium | `spec.md`, the Spine file | `<id>.json`, `check_build.txt` |
| New-athlete reviewer (PRC-4) | helper (files only) | high | brief, spec, build, check | must-fixes |
| Engage words | helper | high | spec, build, roadmap, principles' index | `words.json`, `whatsapp.txt` |
| Part B: place words, full check, log entry | helper | medium | the above | `<id>_final.json`, log files, `publish.sql` |
| Publish (`publish_cycle()`) | main decides; a Sonnet helper sends it | — | `publish.sql` | the server; main reads back the checksums |
| Spine upkeep | helper | medium | the live programme | proposals (it may write the Spine itself: it runs in the foreground) |

- A helper never asks Amir anything: it returns its questions and the main conversation asks them.
- The main conversation never reads the principles, the skills in full or the whole Spine: the helper that needs
  them does. It reads only what it must act on (a summary, a check line, the SQL it sends).
- A database write is built by a helper into a file. The main conversation sends a short one as written; one over
  ~5k characters goes through a sender helper (*Cheaper runs*, rule 6). Either way the main conversation reads back
  what it changed.
- A late design change (Amir changes something after the review, or the reviewer's own suggestions go in) gets a
  **delta review**: a files-only helper reads only the changed cards and their words, against the rule index
  (PRC-4).

## Keep every call cheap

Every tool call re-reads the whole conversation before it, so what a call costs is the size of the context it runs
in, not the size of its own output. Measured on 2026-10-17 (a returning athlete's cycle: the main conversation
reached ~580k tokens and re-read about 26M in all):

- **A second round with a helper is a NEW helper with a short brief file, never a resume.** SendMessage to a helper
  that has finished re-reads its whole transcript before it does anything: one resume cost 214k tokens for three
  tool calls. Write what the second round needs into `<scratch>/brief_<stage>_2.md` (what changed, the files to
  read, what to return) and start a fresh helper on it, at the stage's effort from the table above.
- **Batch shell steps into one script.** A dozen single Bash calls in a long conversation re-read it a dozen times.
  Write the steps (build, check, pull the lines that matter, write a summary file) into one script in the
  scratchpad, run it once and read only the summary. A step whose answer decides the next one is the only reason
  to split.
- **No whole skill in the main conversation.** That run kept three skill bodies (~1,550 lines) in context from start
  to finish. The helper for a stage reads its skill; the main conversation greps the one step it acts on.

## Cheaper runs (2026-10-18)

Measured on one returning athlete's cycle report and next cycle, one session: 84.0M tokens and 444 model
calls. The main conversation was 23.2M (peak context 371k), 28 helpers 60.7M. Every helper's first call already
carried ~107k tokens (system prompt, tool and skill lists, CLAUDE.md, MEMORY.md) and wrote it all to the cache
fresh; every later call re-reads that baseline (~48M of the 84M). The heaviest helpers grew to 277-402k because
they Read whole files (the principles 141k characters, program-design 62k, program-assemble 49k, engage 27k) and
re-read them on each of 20-36 calls. The build stage was 32.6M: three Part A builds and a spec fix, for VOL-8,
CHP-2 and CUE-4 misses. A late dosing change cost 5.3M of rework.

1. **A helper reads less.** The principles: the top of the file down to the end of the rule index (Read with
   offset and limit), plus each story section it is told to read, found by grep and read by line range. A skill:
   only the steps it runs, found by a grep of its headings and read by line range. Never Read a whole file over
   ~30k characters. Read every input in ONE turn of parallel reads. Batch shell steps into one script (*Keep
   every call cheap*), helpers included.
2. **A new helper costs ~107k tokens of cache writes before it reads anything.** Do not start one for three or
   fewer mechanical fixes: fold them into the next stage, or let the main conversation apply them.
3. **The spec pre-flight** (/program-design, end of STEP 3): VOL-8, CHP-2, CUE-4 / NAM-9 and VOL-11's `reentry:`
   line are checked on the spec before it goes to the build. Each miss on 2026-10-18 cost a rebuild.
4. **Spine drafts before the build.** When the spec has `new_exercise:` lines, the `/spine` drafting helper runs
   BEFORE the first Part A build (/program-assemble Step 4 already drafts first; the split run broke that). One
   Spine snapshot, one build.
5. **The checkpoint shows the main lifts as a table** (exercise, sets x reps, RPE, rest; /program-design STEP 1A),
   so a dosing call is made before the build. A Debrief with 3+ weeks of no training is named there too (VOL-11).
6. **The main conversation never Reads a skill body** (grep the one step it acts on) **or a big result.** A
   database paste over ~5k characters (a Debrief append, `publish.sql`) is sent by a Sonnet helper that sends
   the file verbatim and proves it with checksums: the prefix md5 and length for an append; the programme
   fingerprint and the log md5 for `publish_cycle()`. The main conversation reads back only the checksums. It
   still decides every write and reads back what changed (*The rule*).
7. **The publish payload is the whole `workouts` object, label included** (/program-assemble Step 7). On
   2026-10-18 a payload of days only dropped the label.
8. **Measure the helpers too:** `python scripts/session_cost.py --latest --helpers` (*Measuring a run*).

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
paste the summary into the handoff, so a run that leaks shows up the same day. `--helpers` also counts the
helpers the session started (on 2026-10-18 they were 60.7M of the 84M), each with its first-call baseline and its
peak context.
