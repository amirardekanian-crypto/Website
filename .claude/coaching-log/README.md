# Coaching Log — coach-only design record

One file per athlete: `.claude/coaching-log/<id>.md` (the coach-side analog of
`data/<id>.json`). It captures **why** each training cycle looks the way it does — the
Step 1 read, the locked decisions, and the coach reports (volume, progression levers, e1RM) —
so months later you can open it and see exactly how you were thinking and why you changed
something.

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

## File template

When an athlete's log is first created, it starts with this header:

    # Coaching Log — <First Last> (<id>)
    Coach-only design record. Append-only — one section per cycle, newest last.
    Why each cycle looks the way it does. Never published; never read by the athlete app.

Then one section is appended per cycle (the **COACHING LOG ENTRY** emitted by
`/program-design`):

    ## Cycle <NN> — <Cycle Name> · <YYYY-MM-DD> · <NEW|RETURNING>

    **The read** — the Step 1 analysis that drove this cycle, condensed but complete:
    adaptation / recovery & lifestyle / injury / capacity / roadmap reads (returning), or
    recovery-ceiling / priority targets / contraindications / structure reads (new).

    **Decisions** — the locked lists verbatim (PROGRESS / REPLACE / ADD, or PRIMARY LIFT
    SELECTIONS), plus any fork Amir settled at the checkpoint and the call he made (the
    "why we changed something").

    **Volume & Dose** — priority muscle → programmed sets/week → goal range → verdict.

    **Progression levers** — per primary: lever · add-trigger · increment · deload.

    **e1RM** — per primary: estimate (from logs) + change vs last cycle.
