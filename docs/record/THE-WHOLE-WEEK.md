# The Whole Week (stage127, 2026-11-24)

Round 13 of the idea bank, *The Whole Week* (#134 to #138; the page: https://claude.ai/artifact/U3KBuQcFvqBR4ra7q6ZLKc). Amir: *"go with
your picks but movement should give people xp, because those who walk get more xp compared to those who play tennis"*, then *"do i
need to pick? can the app choose automatically?"*, then *"Yes, build it"*. Built and applied live the same day. The source of truth is
the header of `supabase/stage127_whole_week.sql`.

## What was built

- **Sport fills the day (#136).** The Court Log credit's cap went from 70% to 100% of the day's Steps target from 2026-11-24
  (`move_cap_on()`). Before, an hour of tennis paid 42 Steps XP and 10,000 steps walked paid 72.
- **Move minutes (#134).** One weekly number from plan sessions, Library, Court Log and walking, worked out once on the server and
  returned per week by `get_five_weeks()`: The Week Line on program.html's Your weeks, The Mix on coach.html's Five weeks.
- **A full moving week pays (#135).** Rulebook version 13, seeded live with `starts_on = 2026-11-24`: 300 Move minutes in a plan week
  pays 150 XP once a week (`career_move_sync()`).
- **Your Number sets itself (#137).** `steps_targets.source`; the app sets the number once a week, Amir's is an override.

The rules: `docs/rules/habits-in-app.md`, `docs/rules/career.md`. The numbers: `docs/ref/move-credit.md`. The procedure:
`career/PROCEDURES.md` → *Stage 127*. The skills that read it: `/cycle-report` (the athlete's line, the Debrief's split) and
`/program-design` (context only, REC-7).

## Open

- **Closed the same day: the live catalogue and the repo now match.** The repo took `century`'s live `paid_from = "2026-10-18"` (it
  pays as it always has; `check_career.py` knows the key), and the live `amirs_pick` line took the repo's "{month}" wording, which coach.html
  already used. All 162 rows and the version 13 rulebook hash the same on both sides; `career_compare()` ok.
- **Closed the same day: every Library session carries its own MET** from a named 2024 Adult Compendium entry (stage129, `docs/ref/move-credit.md` → *Library sessions*); `/workout` adds it to every new one and pre-commit guard 14b checks it.
