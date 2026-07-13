# Coaching Log — coach-only design record

One file per athlete: `.claude/coaching-log/<id>.md` (the coach-side analog of
`data/<id>.json`). It captures **why** each training cycle looks the way it does — the
Step 1 read, the locked decisions, and the coach reports (volume, progression levers, e1RM) —
so months later you can open it and see exactly how you were thinking and why you changed
something. It also carries a running **Exercise Ledger** (see below) so a future cycle can
check in one glance what this athlete has already done, disliked, or been in pain from,
instead of re-deriving it from raw session data every time.

**Coach-only & private.** It lives inside `.claude/`, so GitHub Pages never publishes it and
the athlete app never reads it (the app only fetches `data/<id>.json`). It is git-tracked, so
it is versioned and synced across machines — but it is never served to the athlete or the web.
This is the *one* place the design rationale is allowed to live; it must never be copied into
the athlete JSON or any published path.

**Append-only.** Each cycle adds one new `## Cycle NN — …` section at the end.
`/program-assemble` writes it as its last step (at the same moment it advances the JSON cycle),
so the log grows in lockstep with `programHistory` / `currentCycleIndex`. **Existing sections
are never edited, reordered, or deleted** — a cycle's original reasoning is preserved even
after the program is later changed.

**Not for raw intake.** This holds the *designed* coaching rationale, not raw intake forms or
verbatim check-in chat (those stay in the conversation — see `athlete-intake`). Keep it to the
read + decisions + reports.

---

## Athletes from before the log existed

**No retroactive back-fill — and no special seeding step.** New athletes get their log from
cycle 1 automatically. Athletes who were already training when the log was introduced start
empty, and that's expected: the first entry is written *naturally, the next time you design
that athlete's cycle*. `/program-design` reads whatever info is available (brief, roadmap,
current program), you write that cycle, and its ordinary entry becomes the baseline the next
cycle continues. From then on it's normal read-back + append.

- The first entry is just that cycle's entry (e.g. `## Cycle <NN> — …`). Optionally note
  `(first logged cycle — earlier cycles predate the log)` so a later reader knows the history
  starts here, not at cycle 1.
- **The "why" is the coach's.** `data/<id>.json` + `session_history` show *what* the program is
  and *what happened* (exercises, loads, injuries); they do NOT contain *why* a choice was made.
  Capture the standing logic in your own words as you design the cycle. **Never invent a
  rationale** — a fabricated "why" poisons every future cycle that reads it.

## Exercise Ledger (mutable — the one exception to append-only)

Right after the file header, before any `## Cycle` section, every athlete's log carries one
table tracking every exercise ever programmed for them — so a later design pass can check an
athlete's whole exposure history with a glance instead of reading every prior cycle's prose:

    | Exercise | Status | Last cycle | Note |
    |---|---|---|---|
    | Ab Wheel Rollout | Banned | C2 | Self-reported too hard twice — don't reintroduce without a stated reason |
    | Cable Pallof Press | Available | C1 | rotated out C1→C2, safe to reuse |
    | Barbell Back Squat | Active | C3 | primary — doesn't rotate |

**Status values:** `Active` (in the current cycle) · `Available` (rotated out, genuinely
safe to bring back — this is the default when something rotates out for plain freshness,
no complaint attached) · `Disliked` (soft signal — avoid unless nothing better fits) ·
`Pain-flagged` (needs a check-in before reuse, not necessarily permanent) · `Banned` (never
reintroduce without a new, stated reason — see COACHING-PRINCIPLES.md → "A removed exercise
stays removed unless re-earned").

**Unlike the cycle sections below, this table IS mutated in place every cycle** — it's a
current-state index, not a historical narrative, so there's nothing to preserve by
appending. `/program-design` reads it at STEP 0 and hands `/program-assemble` this cycle's
deltas (the "Exercise Ledger Updates" component of the COACHING LOG ENTRY); `/program-assemble`
applies them as part of Step 5, before appending the immutable cycle section below it.

New athletes get an empty ledger (header row only) from cycle 1. An athlete whose log
predates the ledger gets one backfilled from whatever cycle is being designed now, not
reconstructed from earlier cycles' prose — same "no back-fill" logic as the cycle sections.

## File template

When an athlete's log is first created, it starts with this header:

    # Coaching Log — <First Last> (<id>)
    Coach-only design record. Append-only — one section per cycle, newest last.
    Why each cycle looks the way it does. Never published; never read by the athlete app.

Then the Exercise Ledger table (see above), then one section per cycle (the **COACHING LOG
ENTRY** emitted by `/program-design`):

    ## Cycle <NN> — <Cycle Name> · <YYYY-MM-DD> · <NEW|RETURNING>

    **The read** — the Step 1 analysis that drove this cycle, condensed but complete:
    adaptation / recovery & lifestyle / injury / capacity / roadmap reads (returning), or
    recovery-ceiling / priority targets / contraindications / structure reads (new).

    **Decisions** — the locked lists verbatim (PROGRESS / REPLACE / ADD, or PRIMARY LIFT
    SELECTIONS), plus any fork Amir settled at the checkpoint and the call he made (the
    "why we changed something").

    **Exercise Ledger Updates** — deltas this cycle applies to the ledger table above
    (rotated-out → Available/Disliked/Pain-flagged/Banned, PROGRESS/ADD → Active).

    **Volume & Dose** — priority muscle → programmed sets/week → goal range → verdict.

    **Progression levers** — per primary: lever · add-trigger · increment · deload.

    **e1RM** — per primary: estimate (from logs) + change vs last cycle.
