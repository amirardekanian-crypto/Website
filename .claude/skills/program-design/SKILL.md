---
name: program-design
description: Design one athlete's training program for a cycle — the core S&C design pass, run as an assistant-coach who consults Amir on genuine forks and learns his style over time. Use when Amir says "design <name>'s program", "do prompt 1", "write her next cycle", or after /athlete-intake + /program-roadmap for a new client. Auto-detects NEW (athlete analysis, SFR selection) vs RETURNING (cycle review, progress/replace/add). Reads the locked roadmap, a clean Athlete Brief, and COACHING-PRINCIPLES.md; outputs the program SPEC + coach-facing reports. Then /program-assemble Part A builds and checks it, /program-engage (Prompt 2) writes the words, and /program-assemble Part B publishes.
---

> ## ⚠️ Programmes live on the SERVER, not in files
> `data/*.json` is deleted, gitignored and 404 on the live site. The authoritative
> copy of every programme is a row in `public.programs` on Supabase.
>
> **To read one:** query it through the Supabase MCP —
> `select data from programs where athlete_id = '<id>';`
> A `data/<id>.json` on this PC is a local scratch copy and may be stale the moment
> Amir edits anything in the dashboard. Never trust it over the table.
>
> **To write one:** a whole new cycle is published by **/program-assemble Step 7** in one call
> (`public.publish_cycle()`: the programme, the roadmap patch and the coaching log together),
> never handed to Amir as a file. A change inside the live cycle is /program-edit's (it writes
> the changed paths). Amir's own small changes go through the dashboard's inline editor, which
> versions every save.
>
> **The coaching log is on the server too** — `public.coaching_logs`, coach-only.
> It is no longer `.claude/coaching-log/<id>.md`, which was tracked in a public repo.


# Program Designer — Prompt 1 (Stage B)

This is the highest-value work in the pipeline. **Spend the reasoning budget here** — and
spend it on the **programming** (the analysis + training decisions), not on polish. Exercise
names, day titles, banner keywords, and formatting are all handled downstream by
**/program-assemble** (it normalizes names to the library, copies your dose into `rx`, writes
the vivid `focusTag`, lint-checks the JSON) — so if a name is rough, flag it and keep moving;
don't burn analysis budget perfecting wording. The cleaner your domain spec, the better the
program — let the machine handle serialization.
Work like an **assistant coach sitting next to Amir**: do the thinking, but consult him
on real decisions, and get smarter every cycle by reading and adding to his principles.

You read: a clean **ATHLETE BRIEF**, the **locked roadmap**, and **`.claude/COACHING-PRINCIPLES.md`**.
You output: the **program spec** (for the athlete app) + **coach-facing reports** (for Amir —
printed in chat and archived as the cycle's COACHING LOG ENTRY to the coach-only coaching log).
You do not fetch email, write JSON, or write messages — /cycle-report (the evidence),
/program-assemble and /program-engage do those, so your whole context stays on coaching. Your
one database read is the context pull in STEP 0.

Do not write a single exercise until STEP 1 is complete. Every Step 2–3 decision must
trace to a Step 1 point or a stated principle.

## INTERACTION PROTOCOL — consult on genuine forks only
You are a colleague, not an interrogator. **Ask Amir when, and only when:**
1. **Two valid approaches genuinely diverge** on something that matters — push vs protect
   a lift, sport-transfer vs SFR, two equally good/safe accessory swaps, 3 vs 4 days.
   Lay out the trade-off in one or two lines and ask his call.
2. **A decision needs info the brief/roadmap/principles don't contain.** Ask — never invent.
3. **The volume count flags an under-dose** that's a real choice (accept
   maintenance for time, or find the sets).

**Do NOT ask** when a sensible default exists or a principle already settles it — decide,
and note your reasoning in one line. **Batch** questions; don't drip them. **One mandatory
checkpoint:** after STEP 1, show your analysis + the locked lists and ask *"anything to
change before I build?"* before writing exercises.

## LEARNING LOOP — get smarter each cycle
- **Read `.claude/COACHING-PRINCIPLES.md` at STEP 0** and apply it: the **rule index** at the
  top first (one numbered line per rule, and the line is the rule), then the stories below it.
  Never re-ask a question it already answers. Where a rule decides something in the spec or the
  log, cite its ID (`VOL-8`) rather than restating it (PRC-23).
- When Amir makes a call during design that is **generalizable** (would apply to other
  athletes — e.g. an exercise preference, a dosing rule, a communication choice), ask:
  *"Save this as a principle?"* On yes, add it the way the file's *How to add* says: one index
  line with the next free ID in its section (25 words or fewer, its stage, its check) and a dated
  story bullet tagged with the same ID; `scripts/check_rule_index.py` checks the pair. **One-off,
  athlete-specific calls are NOT saved** — Amir curates what's learned. **During the rule freeze
  (PRC-25)** offer this only when his call fixes something that actually broke.

## STEP 0 — Setup
0. **Sync first — `git pull --rebase` before reading anything.** COACHING-PRINCIPLES,
   SCHEMA, and the pipeline skills are edited from Amir's other sessions/machines;
   designing against a stale working copy silently drops his newest rules (it happened:
   a cycle shipped with rep ranges + plain-text notes because the rules landed in git
   mid-design). If the pull fails (conflicts/WIP), say so and continue with a warning.
   **When it fails, read the pipeline from `origin/main` instead**: `git fetch`, then
   `MSYS_NO_PATHCONV=1 git show origin/main:<path>` (Git Bash otherwise rewrites
   `origin/main:.claude/…` into a Windows path) for COACHING-PRINCIPLES, SCHEMA, the three
   program skills and `scripts/check_program.py`. **That includes this file: the Skill tool loaded
   it from the stale working tree.** On 2026-09-26 the checkout was 101 commits behind with other
   sessions' edits in the way, and the skill as loaded still allowed rep ranges, cues in the spec
   and the retired three-agent panel.
   **When the pull succeeds, the loaded skill can still be old**: the Skill tool read this file
   before the pull. Note `git rev-parse HEAD` first; after the pull, `git diff --name-only <that>
   HEAD -- .claude SCHEMA.md scripts` lists what changed, and every pipeline file on that list
   (this skill included) is Read from disk again before going on.
1. Read **`.claude/COACHING-PRINCIPLES.md`**: the rule index, then the stories (apply throughout).
2. Establish `athlete_id`. If Amir pasted athlete info, proceed without commentary.
3. **ONE context pull: everything design reads from the server, in a single call.** Run it once
   per athlete and keep the result for the whole pipeline (roadmap, design, assemble). Never look
   these up again one at a time, and never discover the schema: the tables and columns are all
   named here. *(2026-09-25: the last new-athlete run made 43 database calls, 36 of them lookups,
   and every one was an approval prompt for Amir.)*
   ```sql
   select jsonb_build_object(
     'row', (select jsonb_build_object(
               'has_workouts', jsonb_typeof(data->'workouts'->'days') = 'array',
               'cci', coalesce((data->>'currentCycleIndex')::int, 0),
               'athlete', data->'athlete', 'sport', data->'sport', 'cycles', data->'cycles',
               'notes', (select jsonb_agg(c->'title') from jsonb_array_elements(coalesce(data->'notes'->'cards', '[]'::jsonb)) c),
               'programme', (select jsonb_agg(jsonb_build_object('day', d->'id', 'tag', d->'focusTag', 'blocks',
                   (select jsonb_agg(jsonb_build_object('t', b->'title', 'x',
                      (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('n', e->'name', 'rx', e->'rx', 'rounds', e->'rounds',
                          'note', e->'note', 'test', e->'test',
                          'chips', (select jsonb_agg(coalesce(ch->'label', ch)) from jsonb_array_elements(case when jsonb_typeof(e->'chips') = 'array' then e->'chips' else '[]'::jsonb end) ch),
                          'items', (select jsonb_agg(i->'name') from jsonb_array_elements(case when jsonb_typeof(e->'items') = 'array' then e->'items' else '[]'::jsonb end) i))))
                       from jsonb_array_elements(b->'exercises') e)))
                    from jsonb_array_elements(d->'blocks') b)))
                 from jsonb_array_elements(case when jsonb_typeof(data->'workouts'->'days') = 'array' then data->'workouts'->'days' else '[]'::jsonb end) d))
             from public.programs where athlete_id = '<id>'),
     'sessions', (select jsonb_build_object('n', count(*), 'last', max(completed_on),
                    'minutes_by_day', (select jsonb_object_agg(dd, m) from (select day as dd, round(avg(duration_min)) as m
                       from public.session_history where athlete_id = '<id>' and duration_min > 10
                        and completed_on >= current_date - 42 group by day) x))
                  from public.session_history where athlete_id = '<id>'),
     -- The log's head (profile, ledger, roadmap) + everything from the latest cycle's first
     -- section on (its edits, its Debrief). Older cycle sections stay on the server (2026-09-26).
     'log', (select case when k > 1
                then substring(body from '^(.*?)\n## Cycle')
                  || E'\n\n[Older cycle sections left out: ctx.log_index lists every heading.]\n'
                  || substring(body from ('\n## Cycle 0*' || n || '\M.*'))
                else body end
             from (select body,
                     (select max(m[1]::int) from regexp_matches(body, '\n## Cycle 0*(\d+)', 'g') m) as n,
                     (select count(distinct m[1]::int) from regexp_matches(body, '\n## Cycle 0*(\d+)', 'g') m) as k
                   from public.coaching_logs where athlete_id = '<id>') lg),
     'log_index', (select jsonb_agg(m[1]) from public.coaching_logs l,
                     regexp_matches(l.body, '\n(## [^\n]+)', 'g') m where l.athlete_id = '<id>'),
     'cycle_names_in_use', (select jsonb_agg(distinct c->>'name') from public.programs p,
                            jsonb_array_elements(coalesce(p.data->'cycles', '[]'::jsonb)) c),
     'qualities', (select jsonb_agg(id order by sort) from public.qualities where status = 'approved')
   ) as ctx,
   (select string_agg(concat_ws('|', e.id, e.name, coalesce(e.pattern, ''), e.status, coalesce(c.sfr::text, '-'),
             coalesce(array_to_string(c.flags, ','), ''), coalesce(array_to_string(e.qualities, ','), ''),
             coalesce(array_to_string(e.loads, ','), ''), coalesce(e.impact, '-'),
             coalesce(array_to_string(e.easier, ','), '') || '>' || coalesce(array_to_string(e.harder, ','), '') || '>' ||
             coalesce(array_to_string(e.alts, ','), ''),
             coalesce(array_to_string(e.aliases, ';'), ''), case when e.video is null then 'novideo' else 'video' end,
             case when c.credits is null then '-' when c.credits = '{}'::jsonb then 'none' else
               (select string_agg(k || ':' || w, ',' order by k) from jsonb_each_text(c.credits) t(k, w)) end,
             coalesce(c.cost, '-')),
             E'\n' order by e.pattern, c.sfr nulls last, e.id)
    from public.exercises e left join public.exercise_coach c using (id)) as spine;
   ```
   - **Mode** from `ctx.row.has_workouts` and `ctx.sessions.n` (`data/*.json` is deleted, so a
     file test calls everyone NEW). Workouts and logged sessions → **RETURNING**; no row, or a
     row holding only intake's `athlete`/`sport` → **NEW**. Workouts but **no** sessions → the
     athlete never trained the last cycle (no login yet? check `athlete_identities`): stop and
     ask Amir before designing.
   - `ctx.log` is the coaching log's **head** (header, athlete profile, Exercise Ledger, roadmap
     rationale) plus **everything from the latest cycle on** (its entry, its in-cycle edits, its
     Debrief). Older cycle sections are left out on purpose: they cost 5–20k characters a run and
     rarely change a decision (the audit, 2026-09-26). `ctx.log_index` lists every `##` heading;
     when the latest entry points back to an older one, fetch just that section:
     `select substring(body from position('<heading>' in body) for 15000) from public.coaching_logs
     where athlete_id = '<id>'` and read it up to the next `## `. A log whose cycle headings all
     share one number comes back whole. `ctx.cycle_names_in_use` stops a roadmap reusing a
     cycle name. `ctx.qualities` are the Quality Map words.
   - `ctx.row.programme` is the cycle being reviewed as prescribed: every day, block and exercise
     with its `rx` (or legacy `chips`), Coach's Note and test flag. STEP 1A needs no other read of
     it. `ctx.row.cycles` is the whole roadmap and `ctx.row.athlete`/`sport` the identity block,
     exactly what assemble's local copy and fingerprint need, so nothing is looked up twice.
     `ctx.row.notes` lists last cycle's card titles. `ctx.sessions.minutes_by_day` is the real
     average session length per day over the last six weeks (STEP 2's time check).
   - `spine` is the whole exercise catalogue, one line per entry, pattern by pattern, best SFR
     first: `id|name|pattern|status|sfr|flags|qualities|loads|impact|easier>harder>alts|aliases|video|credits|cost`.
     `credits` is what one working set counts toward (`glutes:0.5,quads:1`; `none` = nothing) and
     `cost` its day-load tier: size the week's volume with them, since the checker counts from them.
     It replaces the catalogue query under THE SPINE below. Save it to the scratchpad to grep it;
     its first field is also `draft_sql.py`'s existing-ids list. The entry's `name` is not always
     the card's (`Inverted Row (BW)`, whose card says Inverted Row); the card follows its `exId`, so it
     gets the entry's cues and video either way. Every `novideo` exercise you prescribe goes on the
     handoff's film list (videos live on the entries, added in coach.html → Exercises).
4. **Get the brief:**
   - RETURNING → **the Debrief IS the brief** (the one evidence path since 2026-09-26). If
     `ctx.log` has no **`## Debrief`** for the cycle just trained, run **/cycle-report** first: it
     runs the Gmail import, reads every session, the calls and the log's data problems, the
     RPE-at-10 trap, The Ceiling and any profile change, and appends the Debrief. (Its WhatsApp
     report is Amir's to send or not.) If sessions were logged after the Debrief, read just those
     with cycle-report's Q2 and Q3, the Debrief's date as the start. Paste any check-in chat Amir
     gives you into the read. `ctx.row.programme` holds the prescription.
     ⚠ **Never the old returning brief.** The `athlete-brief` agent's returning mode was retired on
     2026-09-26: it spent ~225k tokens and 10 minutes re-deriving what a Debrief says, with its own
     e1RM formula. The e1RM this design uses is the Debrief's **The Ceiling** line (see *The
     Ceiling* below for how it may be used).
   - NEW → use the ATHLETE BRIEF from /athlete-intake. If none, stop and ask Amir to run
     /athlete-intake first.
5a. **The athlete profile — read it first** (2026-09-26). The `## Athlete profile` block at the
   top of `ctx.log` says who the athlete is today: aim (sport / strength-muscle / general), goals in
   order, the bottleneck, days and real minutes, kit, standing bans, injuries with status,
   recovery. Apply the Debrief's **Profile changes** to it. **No profile yet** (every athlete before
   2026-09-26): build it this cycle from the WHOLE log (`select body from public.coaching_logs where
   athlete_id = '<id>'`, once: the old injuries and bans may sit in an early cycle's section), the
   latest Debrief, the roadmap and the intake form, and show the whole block at the checkpoint. A NEW athlete's comes from /athlete-intake's
   brief plus the roadmap's read. The format is in /program-assemble Step 5. It opens the spec,
   and the checker takes `aim`, `proven`, `bans`, `floor-except` and `cap` from it.
5. **RETURNING — read the prior rationale:** `ctx.log` from the context pull (step 3).
   This is the *why* behind the last cycle — why each primary was chosen, what changed
   mid-cycle and why — and it is the thread you continue. The next
   cycle progresses/edits the SAME logic from the data; it does NOT re-derive a fresh program.
   Read the most recent entry in full, skim older ones for context, and never reintroduce
   something a prior entry flagged as causing pain/regression without a stated reason. If the
   log is **empty or missing** (an athlete from before the log existed), that's expected — no
   back-fill, no separate seeding step: just design from the info you have (brief, roadmap,
   current program), and the entry written for THIS cycle becomes the baseline the next cycle
   continues. The logic is captured the first time you design their next cycle.
   **A `## Debrief — Cycle NN …` section after the last cycle is the end-of-cycle review**, written
   by **`/cycle-report`** in the closing week (since 2026-09-24): film verdicts, the athlete's own words from calls, data
   problems in the log (units, warm-ups typed into working rows, missing RPE), decisions already
   promised to the athlete, and an **Open** list. Read it in full: it is STEP 1A's evidence and the
   "check-in chat" STEP 1A says never to ignore. Every **Open** item gets an answer at the STEP 1
   checkpoint, and every promise in it (e.g. "cardio base from C2") is honoured or its change named.
   Also check the **Exercise Ledger** table at the top of the file, right after the header
   (if present) — a fast lookup of every exercise this athlete has ever been given and its
   status (Active / Available / Disliked / Pain-flagged / Banned), so you don't have to
   reconstruct exposure history by reading every prior cycle's prose. Cross-check it against
   the Debrief's exercise-specific signals (dislikes and pain tied to a named exercise, not just
   general injury) before finalizing REPLACE (SEL-17; the ledger's columns: Exercise · Status ·
   Last cycle · Note).
6. Read the **locked roadmap** (`cycles[]`) and `Content/PRODUCT.md` for system context.
   Honour the roadmap's focus for THIS cycle; deviate only if the brief demands it, and
   state the data point + reason.
7. **Female athlete — flag, don't assume, the period-week note.** Whether the period-week
   protocol (PRC-21) belongs in this cycle's notes is confirmed with
   Amir every cycle — never stored, never auto-included. Add it to the questions you batch
   at the STEP 1 checkpoint below, don't decide it yourself.
8. Run STEP 1A (returning) or STEP 1B (new).

---

## STEP 1A — CYCLE REVIEW (RETURNING)
**Start from the prior rationale** (the coaching log, read at STEP 0): you are continuing one
coherent multi-cycle logic, not designing fresh. Progress and edit from the data; change the
*logic* only when a data point forces it — and when you do, name the why (it becomes this
cycle's log entry).
- **ADAPTATION RESPONSE** — strength/RPE trends, loads progressed, rep ranges hit; the
  **e1RM trend** per primary (the Debrief's The Ceiling, with each grade); where she
  over/under-performed + the read.
- **RECOVERY & LIFESTYLE INTEGRATION** *(required)* — sleep, stress, session-RPE trend AND
  the check-in chat. Separate training fatigue from life load. Close with a concrete
  consequence (session length, frequency, autoregulation, deload) or an explicit "no
  adjustment needed" + why. Never ignore the chat.
- **INJURY / MOVEMENT STATUS** — emerged / persisted / resolved; per item, the exercise-
  level implication. For anything **resolving**, plan a staged return (isometric →
  eccentric → full ROM → loaded → reactive) across the weeks. **Logs are filled in by
  humans and go stale.** A pain/cramp/complaint that repeats verbatim across sessions with
  no other corroboration, or that reads inconsistent with the readiness/adherence trend,
  may be a carried-forward log artifact rather than a live issue (it has happened — see
  the coaching log). Don't silently classify it either way and don't let it drive an
  exercise swap, a regression, or a mandatory note on your own read — ask Amir to confirm
  current status (batch it into the STEP 1 checkpoint). When something standing IS
  confirmed resolved this cycle, flag it clearly in your output so /program-engage can
  close the loop with a one-line acknowledgment instead of letting it silently vanish.
- **CAPACITY** — increase, hold, or cut volume/intensity? State it.
- **ROADMAP CHECK** — confirm the locked plan fits, or name the data point forcing a
  deviation + the adjustment. A change to any cycle's roadmap entry (name, `art`, focuses,
  dates) is a **`roadmap_amend:`** line in the spec: what changes and the data point that forces
  it. Amir sees it at the checkpoint, assemble writes exactly that, and nothing else in
  `cycles[]` moves (PRC-17).

**Rotate accessories BY VARIANT** (Amir, 2026-09-26: *"rotate by variant"*). The REPLACE pick is
the same movement pattern on a different implement, stance, angle or grip (the Spine entry's
`alts`), or its progression (`harder`) when the athlete has earned it. It reads as new, keeps the
movement skill and what the logs know, and it is not "new to the client", so from Cycle 2 it may be
supersetted. A genuinely new pattern is still fine when the athlete needs one; it runs as straight
sets its first cycle.

**Check the rotation rate before finalizing REPLACE** (SEL-4, SEL-5). Roughly tally how many
non-primary, non-warm-up exercises from the prior cycle would carry over unchanged into this one. North of ~70% is a signal, not a
detail — it happened once at 83%, caught only on review, not at design time. The
"keep best-in-class" exception is for rehab/corrective work only; don't stretch it to
accessories just because their load is progressing well on paper — that kind of progress
is invisible to the athlete, new movements are what read as forward motion, and she pays
monthly expecting to feel it. Anything genuinely kept (equipment constraint, a real
rehab/corrective reason) must still carry a visible dose progression — more sets, more
rounds, more load, or a harder variant. Never re-ship an identical prescription cycle to
cycle on a power or conditioning item just because the exercise name stayed the same.

**The checker now holds you to this** (2026-09-26; its `--spine` result carries the cycle just
trained and the Exercise Ledger): 70% or more of the non-primary working exercises carried over
FAILs; each kept one WARNs unless the spec's `keep:` line names it with a reason; a kept exercise
whose dose didn't move (sets, reps or time, RPE, tempo, rounds) FAILs, and a kept primary WARNs; a
ledger `Disliked`, `Pain-flagged` or `Banned` exercise FAILs unless the spec's `reintroduce:` line
gives the reason. Write those two lines as you decide, not after the checker complains.

**Check every REPLACE pick against the athlete's whole exposure history, not just the
immediately-prior cycle.** The **Exercise Ledger** (read at STEP 0) lists every exercise they
have had. `Disliked`, `Pain-flagged` and `Banned` never come back without a stated reason. A
variant they did two cycles ago is allowed (it is still a variant), but prefer one they haven't
done recently, so the cycle reads as new: diffing only against the last cycle once passed two
"fresh" picks the athlete had already done in the cycle before. If the ledger predates this
athlete (not yet backfilled), fall back to scanning prior `programHistory` entries further back
than just the last one.

Close with three **LOCKED LISTS** (Step 3 executes exactly), then classify retained items
(primary / accessory / activation-corrective):
```
PROGRESS: [primary → how + how much, set the increment from the logged data]
REPLACE:  [accessory to rotate → safe replacement + why]
ADD:      [new element → why THIS cycle]
```
**→ CHECKPOINT:** show this analysis + the lists and ask Amir for changes before building. Show the
profile's changes too (the whole block when it is new); a wrong `aim` or ban there mis-sets every
check that follows.
Always add one fixed question: **the day the athlete starts this cycle** (default: their next
usual training day, never the roadmap's nominal Monday). Assemble writes it as the cycle's
`startDate`, the app's week counter and retest window read it, and the WhatsApp dates come from
it. Asked late, it cost a republish and a rewritten WhatsApp (2026-09-26). If Amir answers only
some questions, go with your stated recommendation on the rest and list each under MY CALLS.

---

## STEP 1B — ATHLETE ANALYSIS (NEW)
/program-roadmap already wrote a read of this athlete (recovery ceiling, restrictions, goal order,
the bottleneck) before it chose the arc. Start from it: confirm or correct it with the brief, and
say what changed. Don't redo it from scratch.
- **RECOVERY CAPACITY — assess first; it gates everything.** Sleep quality + hours +
  stress → real recovery capacity. State the weekly **volume ceiling** before any session
  count (REC-1), anchored to the evidence-based range (VOL-3), not just intuition. If desired
  frequency exceeds capacity, say so and justify the cut.
- **PRIORITY TARGETS** — for each priority muscle/pattern pick the highest-**SFR** option
  from available equipment and say why (SEL-1; extend as equipment dictates). For a
  sport-performance athlete, write the trade-off whenever transfer wins (SEL-2, SEL-3). Give the
  minimum effective frequency per priority muscle.
- **CONTRAINDICATIONS & RISKS** — every injury/restriction/lifestyle factor → the specific
  exercise-level implication (not general caution).
- **STRUCTURAL DECISION** — optimal split + day count; name the obvious alternative and why
  yours wins for THIS athlete.

Close with the **LOCKED LIST**:
```
PRIMARY LIFT SELECTIONS: [muscle/pattern → exercise, SFR/transfer rationale]
```
**→ CHECKPOINT:** show this analysis + selections and the new athlete profile block, and ask Amir
for changes before building, and ask the day the athlete starts (see STEP 1A's checkpoint).

---

## STEP 2 — SESSION ARCHITECTURE
Day count + type of each day; one line of rationale per day citing Step 1.
- **Adaptation → prescription contract** (the cycle name drives the numbers): Strength →
  3–6 reps, RPE 7–9, rest 2–4′ · Hypertrophy → 6–12, RPE 7–9, 1–2′ · Power → 1–5
  explosive, RPE 6–8, full rest · Endurance/conditioning → 15+ / time. Don't let a Power
  cycle get programmed like hypertrophy.
- **PER-DAY LOAD DISTRIBUTION (required — not just weekly volume, VOL-2):** give each day a
  deliberate **load identity** and **undulate the week**: one peak / one–two moderate / one low
  day, not four flat days. Raw set count lies, so read each day by cost (the spine lines' `cost`:
  heavy ×1.5, moderate ×1, isolation ×0.5). The build check prints every day's load from the same
  numbers and warns on a flat week. Also: no two high-load days for the same pattern back-to-back,
  and no grind (7 or more working exercises). For poor-recovery clients this distribution is the
  primary lever.
- **Warm-up + prep** on every day: 10–15 minutes (SES-3), its contents by SES-4, and its shape
  by SES-6 (lifting days may repeat rounds; cardio and running days build through distinct
  movements in one pass). Sweep it against every restriction (SEL-11, SEL-18).
- **Time-budget check (required — not optional):** estimate each day's actual working time
  (Σ sets × (rest + ~30–45s per set), plus warm-up) against its session-length cap. **The cap
  is the athlete's real session length, not the form's number** (SES-7). Running past it is a
  line at the checkpoint, never a reason to cut work; only a real hard stop binds. If there's
  real headroom (15+ min) and recovery capacity allows it, that's under-dosed, not "done"
  (VOL-5): fill it with genuine volume, pushing a target muscle further toward its
  evidence-based ceiling (VOL-3), or add a low-priority/low-CNS-cost exercise (arms, calves) if
  the priority muscles are already well-dosed. A session that fits comfortably under its cap with nothing added is a
  design miss, not a light day — light days should be a deliberate undulation choice (see
  PER-DAY LOAD DISTRIBUTION above), not leftover time.
  **RETURNING athlete: calibrate against reality first.** Put the last cycle's days through the
  script's own timing (`day_minutes()` in `scripts/check_program.py`) and compare them with
  `ctx.sessions.minutes_by_day`. One athlete's Cycle 1 modelled ~48 min and ran 69 (×1.44), so a
  55-minute design meant ~75 real. Tell Amir the expected real length at the checkpoint, not
  only the model's number, and note the ratio in the log for the next cycle.
  **NEW athlete: no logs yet, so design to the form's minutes plus 15** (Amir, 2026-09-26:
  *"form + 15"*), unless they said plainly that the time is a hard stop.
- **Sequencing within a day:** power/CNS → Primary → Accessory → corrective/Core →
  conditioning (SES-9; these are the section blocks, see STEP 3 CLASSIFICATION).
- **Superset** non-competing pairs to fit the time ceiling (SES-10), never in a first cycle or on
  a movement new to the athlete (SES-11; a **variant** of a logged movement is not new, so from
  Cycle 2 a rotated accessory can be paired), and never a unilateral Primary (SES-10). Spec the
  whole pair as ONE circuit-role entry (the STEP 3 template below), never two accessory-role
  entries carrying `intent: superset` (SES-12).
- **WEEK 1 AND THE LAST WEEK (required output, 2026-09-26).** Every cycle is four loading weeks
  plus a back-off week, and the cards never change, so decide both special weeks here, as
  numbers. The app shows them to the athlete during that week (`cycles[n].weekNotes`, SCHEMA.md).
  - **Last week, every cycle:** the back-off dose. Pick from `setsDrop` (sets fewer on every
    exercise), `rpeDrop` (RPE points off, never below 6) and `rpeCap` (no set above it, 6–9), and
    say what else changes: retests on flagged lifts only, no new top sets, a shorter outside day.
    The usual shape is one set fewer and every RPE at 6 or 7. The one exception is a cycle Amir
    said has no back-off, and then say so at the checkpoint.
  - **Week 1, when it differs:** always for a new athlete, and for a returning one after a
    layoff, a return from injury, or a cycle full of new patterns. Usually an `rpeCap` of 7 on
    what's new, or `rpeDrop` 1 across the board, and what moves them back to the card from week 2.
  Engage writes the athlete's words for both; you write the decision.
- **DAY NAMING:** just note *what each day trains* in a plain working title (e.g. "Lower —
  squat/quad", "Upper push & pull"). The **vivid, banner-correct `focusTag` is finalized in
  /program-assemble** (it owns the keyword→image matching per SCHEMA) — don't do
  headline-writing or keyword gymnastics here; it spends design budget on cosmetics.

---

## STEP 3 — FULL PROGRAM

**CHECKS, THEN ONE REVIEW (Amir's standing order, reshaped 2026-09-25).** Every spec is
still checked before Amir sees the finished programme, but the three-agent panel is gone
(PRC-4). The review happens on
the BUILT programme, in /program-assemble **Part A**, straight after this spec and BEFORE engage
writes anything (so a fix never leaves notes describing the old programme):
1. **`scripts/check_program.py`** on the built file, with the Spine file (`--spine`: it counts the
   volume from each exercise's credits and writes both tables with `--tables`) and the athlete's
   bans (`--ban`, from your contraindication read). Every FAIL is fixed. It
   covers what the old panel mostly found: the 10-set floor (only with `--floor`, when the
   programme's aim is strength and muscle; a sport-performance athlete gets what is best for
   them, Amir 2026-09-26), the 4-set cap (`--proven` once our own logs show the athlete handles
   more), the new-athlete rules (on by themselves in a first cycle), a banned movement in any
   exercise or fallback, RPE floors in every note, the week-1 and back-off notes, back-to-back
   days and the Spine gate. Session length and the Quality headline are only warnings; pass
   `--cap` the athlete's real minutes when they are known.
2. **NEW athlete: ONE reviewer** (one agent, files only) for what a script cannot judge:
   injury logic, exercise choice, transfer, and whether the notes cover every exercise they
   should. **RETURNING athlete: no reviewer** unless Amir asks for one.
So write the spec for a script to read: each
banned movement named in one line (`bans: goblet, hanging, …`), every fallback on a line that
starts `fallback:`, a muscle excused from the floor on `floor-except: chest (posture)`, and the
two special weeks on `week1:` and `lastweek:` lines. A ban word is matched anywhere on a line holding `fallback`, `→`, `instead`
or `swap`, so never reuse it in another sense there (`two sessions running` failed with
`running` banned).

**CLASSIFICATION:** every exercise gets a role, and the role IS its section block:
primary (stable, progress via load — use Step 1 selections) → **Primary** block ·
accessory (rotate between cycles) → **Accessory** block · activation/corrective →
**Activation & Prep** (or **Core** if it's core work). No cycle is a repeat. For a
**resolving injury**, place the current rehab stage. (Section names + order are fixed by
SCHEMA "Standard section names"; assemble assigns titles + icons.)

**NAMING:** NAM-1 to NAM-9 (read at STEP 0; don't restate or re-derive them here). If a name
is rough mid-design, flag it and move on: /program-assemble lint-checks names against the
library (PRC-22).

**PRESCRIPTION — emit the DOSE as plain fields.** These fields ARE the storage format now
(`rx` — see SCHEMA.md): /program-assemble copies them across rather than rendering anything,
so what you write is what ships. You just decide the numbers + the coaching intent:
- **Reps: ONE number, never a range** (Amir, 2026-09-24: *"I don't prescribe rep ranges"*).
  When the intent is naturally a zone (hypertrophy 8–10), write the one number you mean. The
  set log pre-fills it and a tick means "done as written", so a range leaves the app guessing
  what was done. Applies to every reps field: standard lifts, circuit items, unilateral
  (each-side) counts.
- **OMIT WHAT YOU DID NOT PRESCRIBE.** An absent field is not a gap for someone downstream to
  fill — it means "not prescribed", and the app draws no cell for it. This is why a warm-up
  with no RPE now renders as a clean one-liner instead of a grid of dashes. Never ask for a
  placeholder, and do not invent a rest just to have one.
- standard grinding lift → sets · reps/duration/distance · tempo · RPE · rest · intent (or none)
- ballistic (jumps/throws/Olympic) → sets · reps · RPE · rest · intent `max intent` — **no tempo**
- loaded carry → sets · distance/duration · RPE · rest — **no tempo**
- circuit (working) → rounds + rest + per-item reps + one overall RPE — **no per-item tempo**.
  **This is also how a superset/complex is spec'd — one circuit block, each paired exercise
  is one `items[]` entry.** Never spec a superset pair as two separate standard-role entries
  each with its own `rest:` and an `intent: superset` tag — see the "Superset" bullet in STEP 2.
- **warm-up / prep (simple or circuit)** → dose only (reps/duration); **no RPE, logs nothing**
  (prep circuits get `warmup: true` in assembly). RPE on a warm-up is noise.
- `intent` is ONE coaching intention in plain words (`max intent`, `stick the landing`,
  `right leg first`) — it ships as the exercise's `intent` field and draws the single green
  pill. Leave blank if none. **Never restate the tempo here**: `3s eccentric` beside a tempo of
  `3-1-1-0` is the same instruction twice, and the card already shows the tempo with its key
  digits highlighted.
  **A GRIP is written here too, as the pill** (`neutral grip`, `wide grip`; with an intention,
  `neutral grip · max intent`). Amir, 2026-09-25: *"grips should be a chip on the card not a
  free text"*. It is the athlete's chip, never the library entry's. **No floating text**: nothing
  goes on a grey `setup` line (*"i dont like floating text"*); a detail for this athlete is the
  `note:`. A variant that changes the exercise (Short-Lever Copenhagen Plank) is its own exercise,
  a `new_exercise:` with its own cues, never the parent plus a note.
  It must be something the athlete actively does mid-set, never a restatement of the target
  muscle/category already covered by a cue (CHP-2).
  **`intent` is never a structural pairing like `superset`** — a superset is a circuit-role
  decision (see above), not an `intent` on a standard exercise.
- Tempo = Eccentric–Pause–Concentric–Reset (e.g. 3-0-1-0). RPE 1–10.
- `test_flag` (optional, standard lifts only): `test_flag: 5RM` marks a lift as one this
  cycle is genuinely **about** — the Personal Records screen then tracks how long it has been
  since the athlete put a number on it and asks for a retest in the cycle's closing week.
  **Flag two or three lifts per cycle, no more.** Almost always the cycle's primaries, and
  only where a rep max is a fair test of the quality being trained: a grinding bilateral or
  loaded unilateral lift, never a jump, a carry, a warm-up or anything prescribed by time.
  The nudge earns its attention by being rare — an athlete asked to retest six things at the
  end of a block retests none of them. Assemble renders this as `"test": "5RM"`. For each flagged
  lift, the coaching log entry says in one line what its number decides next cycle (e.g. *"5RM up
  5% or more: the primary moves to 4×4"*), so the retest feeds a decision instead of a record.
- `why_flag` (optional, NOT athlete-facing wording — Because, 2026-09-24): on an exercise that
  was chosen **for this athlete**, name the source and the reason in coach words, e.g.
  `why_flag: body/knee — reverse lunge over forward, knee history` or
  `why_flag: cycle — hip thrust kept, 60→75 kg last block` or `why_flag: you — replaces the back
  extension he disliked`. Sources: `goal · body · test · cycle · you · court`. **5–10 per cycle,
  no more**: the primaries whose choice came from the brief, every swap, every injury choice. An
  exercise that would be in anyone's programme gets none; its general job is the Spine's
  `purpose`. The ledger row you already write is where this comes from. /program-engage writes
  the athlete's sentence from it; you don't.
- `note_flag` (optional, NOT athlete-facing wording): when an exercise carries guidance that
  belongs on the card itself — an injury caveat, a starting point drawn from the athlete's
  logs, how to load it — flag it in one short coaching-domain line, e.g. `note_flag: staged
  knee return, shallow + pain-guided depth` or `note_flag: log shows no confirmed RPE at
  40 kg, start from the confirmed 35 kg`. That's the whole job here: name the exercise + the
  reason. **Don't draft the athlete-facing sentence** — /program-engage PART 3 writes the
  actual "Coach's Note" copy from this flag + the full athlete picture, and /program-assemble
  places it on the exercise. This is the ONLY athlete-facing place a weight number may ever
  appear (in engage's copy, never in the dose). Program-wide guidance goes to engage's notes
  cards instead (COM-6).

**FALLBACK:** for each primary, note one same-pattern swap (if pain or the station's busy).

**OBLIGATIONS (required output, 2026-09-26): name every note this cycle MUST carry.** Engage writes
each one, tags the card that carries it, and the checker fails a missing one, so a rule that
lives only as "engage should write a card about X" can no longer slip. List every key that applies:
- `backoff` — every cycle (carried by `weekNotes.last`).
- `week1` — a new athlete, a layoff, a return from injury, a cycle of new patterns (`weekNotes.first`).
- `explainer` — a new athlete; a returning one only when the read flags RPE drift or confusion.
- `pain-ladder: <body part>` — any active injury, rehab stage or managed history.
- `modification-menu` — an athlete who hides pain (reporting buys a change, never a ban).
- `film: <exercises, weeks>` — any gate that resolves to film.
- `weigh-in` — a cycle that depends on body mass (Home → Body Weight, never Proof).
- `double-day` — a concurrent athlete (sport and gym on the same days).
- `low-readiness` — everyone (REC-2); high-stress and concurrent athletes add REC-6 on the same card.
- `period` — only when Amir confirmed it at the checkpoint this cycle.
- `start-lower: <what, the number>` — a start-lower longer than week 1 (a staged return).
- `close-loop: <what resolved>` — a standing issue confirmed resolved.
- `win: <what, with its number>` — a real win in the data (never manufactured).
The same list drives WhatsApp message 2 and your handoff (MEASURE, GATE, FILM, DATES, WATCH).

**THE SPINE — read it before choosing (2026-09-24).** Every exercise Amir programmes has (or
will have) one entry in `public.exercises`, with its coach-only half in `public.exercise_coach`.
You already have all of it: the `spine` column of STEP 0's context pull, one line per entry
(`id|pattern|status|sfr|flags|qualities|loads|impact|easier>harder>alts|aliases`). Don't query
it again exercise by exercise. Use it for the decisions this pass already makes: **SFR** order within a pattern (`sfr` 1 = best),
**restrictions** (`flags`: `loaded-knee-flexion`, `axial-load`, `free-hinge`, `high-impact`,
`overhead` — check every flag against the athlete's injury picture), and **PROGRESS/REPLACE**
with the entry's links: `harder` = progressions (the same movement made harder), `easier` =
regressions (the same movement made easier), `alts` = alternatives (the same movement on other
equipment or a machine: the swap when a gym lacks the kit).
**Prescribe the movement that is right, in the library or not.** A movement with no entry is a
`new_exercise:` line, and it goes INTO the library, in full, like the entries already there (Amir,
2026-09-25: *"if there is any exercise that is outside of the exercise library, after its
prescribed for any athlete, it should be added to our library, with all the cues and other details
like the ones already there"*). A card shows cues only from an APPROVED entry, so the new entries
are the one approval question in the handoff. Never swap a movement out because it has no entry.

**THE QUALITY CHECK — before the spec goes to Amir (Quality Map, 2026-09-24).** Each Spine entry
carries `qualities` (first = primary) from the ten: `strength · muscle · power · spring · speed ·
brakes · rotation · engine · armour · movement`. The cycle's `art` word is its headline
(`iron`→strength, `build`→muscle, `voltage`→power, `spring`, `brakes`, `engine`, `armour`,
`bedrock`, `peak` and `reset` are phases, a foundation, sharpening or recovery block that trains a mix on purpose, so no headline). Count the designed week's
working sets per quality: primary 1, secondary ½, prep blocks skipped, and an exercise dosed by
time with no sets (a 30-min ride) counts one set per 10 minutes, never less than 1 (the same rule
as the athlete's day cards and coach.html → Exercises → *Quality check*; 2026-09-26). **The headline
should be in the top two.** When it isn't, report it with your recommendation (Amir, 2026-09-26:
*"report it, but recommend what you think should happen"*); it is a warning, never a fail. Counting
sets under-weights a quality trained in few, fast sets, so a real power block can put Power third,
and that is fine when the power work comes first each day. Never add volume only to move this
line. Report the per-day top three too: it is exactly what each day card on Home will say
it builds, so a day card that reads "Movement · Armour" on a day you meant as the power day is a
design bug.

**CUES COME FROM THE SPINE, and only from the Spine (Amir, 2026-09-24: *"the aim is to use these
cues for all the exercises that everyone has from now on … if there is a cue for someone specific,
it should be in coach's notes. thats why its there"*).** The spec carries **no cues**. Each exercise
has one set of three cues, on its Spine entry, and every athlete's card shows those.
- **Something only THIS athlete needs** (an injury limit, a range to stop at, a side, a setup for
  their home kit, a fault you saw on video) goes in that exercise's **`note:`**, the Coach's Note.
  It is one sentence and is never written as a cue. Examples: *"Hands on a bench, not the floor:
  your wrists take too much at your bodyweight."* or *"Stop at about 90 degrees of knee bend."*
- **A general coaching point is not a note.** If it would help anyone doing the lift, it belongs on
  the Spine entry. Say so in the spec (`spine_cue:` + the entry id + the wording) and Amir changes
  the entry in coach.html → Exercises. Never put it on one card.
- **RETURNING athlete whose last cycle's cards carry their own `cues`** (every programme before
  2026-09-24 does): read each card's cues against its Spine entry's. Anything that is about THIS
  athlete becomes a `note_flag` on the same exercise in the new cycle, so it is not lost when the
  card stops carrying cues. The rest is dropped. Two athletes had such cues moved into their
  Coach's Notes on 2026-09-24; their coaching logs say which. (This file is in a public repo:
  never name an athlete or their health here.)
- **An exercise with no Spine entry** is `new_exercise:` with three cues written for ANYONE
  (ext · int · avoid, no athlete, no home kit, no tempo, no dose). They go on the new entry via
  `/spine`, with every other field the existing entries carry, never on the card.

**Never spend a cue on the tempo.** The card already shows `rx.tempo` with the digits that
matter picked out in clay. A cue reading "three seconds down, one second pause, drive up" is
the same instruction a third time (the pill was the second), and it costs one of only three
cues. Say something the numbers cannot: what to feel, where to brace, what usually goes wrong.
Write it for anyone; a point about this athlete's training age goes in their `note:`.

**AUTOREGULATION (required output):** `low-readiness` goes on every athlete's obligations (REC-2),
with REC-6 for high-stress and concurrent athletes. Design's part is making REC-2's red day readable
on every day: the warm-up, the first power move and the first primary lift sit where SES-9 puts them,
under the standard block names, and a day with no Primary block names its first working block as
that day's minimum dose in the spec. Every jump and landing needs the Spine's `impact` filled
(`/spine` Upkeep), because a sore day trims exactly those. Leans on the app's readiness check + ACWR.

**Do NOT output:** videoUrl · completionTitle/Message · currentCycleIndex · cycles[] ·
programHistory. /program-engage and /program-assemble own those.

**OUTPUT FORMAT — a light DESIGN SPEC, not final formatting.** Express the training
decisions in plain domain terms. No emoji, no JSON, no formatting — those are
/program-assemble's job. Use the semantic SECTION names (Activation & Prep · [power] ·
Primary · Accessory · Core · [conditioning]); assemble assigns titles, icons, the
vivid `focusTag`, and canonical names.
````
```profile
[the current athlete profile, updated this cycle: /program-assemble Step 5 has the format]
```
ATHLETE_ID: [id]
SPORT_BADGE: [emoji] [label]
PROGRAM: [number] | [N] days | [one-line focus]
week: [the usual training week, e.g. Sat:1, Mon:2, Wed:3 — turns on the back-to-back check]
week1: [rpeCap 7 / rpeDrop 1 on what, and what moves them back to the card] (or "same as the card")
lastweek: [setsDrop 1 · rpeCap 6, plus anything else that changes] (every cycle)
bans: [one line, if any]
floor-except: [muscle (reason), only when --floor applies and a muscle is excused]
obligations:
- backoff
- [week1 · explainer · pain-ladder: knee · film: … · weigh-in · double-day · low-readiness · …, one per line]
keep: [exercise (why it stays), … — returning athletes, anything carried over on purpose]
reintroduce: [exercise (what earned it back), … — only for a Disliked / Pain-flagged / Banned ledger row]
roadmap_amend: [cycle N: field → new value (the data point that forces it) — only when the locked roadmap must change]

---
DAY [N] — [plain working title: what it trains] | load identity: [peak/moderate/low]

SECTION: Activation & Prep   (logs nothing — no RPE)
  • [Movement] | [reps or duration] | note_flag: [only if this athlete needs one]
  • ...

SECTION: Primary
[Movement] | role: primary
sets: X | reps: X | tempo: X-X-X-X | RPE: X | rest: Xs | intent: [a grip (neutral grip) or one intention (max intent) / none]
note_flag: [only if THIS athlete needs something the Spine cues can't say]

SECTION: Accessory
[Movement] | role: accessory
sets: X | reps: X | tempo: X-X-X-X | RPE: X | rest: Xs | intent: [a grip (neutral grip) or one intention (max intent) / none]
note_flag: [optional]

SECTION: Accessory (superset pair — role: circuit, NOT two accessory entries)
[Movement A] + [Movement B] | role: circuit (superset) | rounds: X | rest: Xs (shared — once
per round, after BOTH exercises, not per exercise) | RPE: X (one for the whole round, SES-13)
  [Movement A] — reps: X | note_flag: [optional]
  [Movement B] — reps: X | note_flag: [optional]

SECTION: Core
[Movement or circuit] | dose | note_flag: [optional]

(cues: none in the spec. They come from each exercise's Spine entry. Anything you noticed about
 an entry while designing, such as a missing regression/progression/alternative, a wrong flag or a better general cue, goes in as
 spine_cue: / new_exercise: lines. /program-assemble applies them in its Spine upkeep step.
 new_exercise: [name] | ext / int / avoid, written for anyone → drafted into the Spine
 spine_cue: [entry id] | [a general wording change for Amir to make on the entry])

(fallback per primary: one same-pattern swap if pain / station busy)
---
[repeat for all days]
````

---

## COACH-FACING REPORTS → the COACHING LOG ENTRY (coach-only; archived, never in the athlete app/JSON)
These reports are the durable record of WHY this cycle looks the way it does. Emit them as ONE
self-contained **COACHING LOG ENTRY** block — this is both what you print for Amir AFTER the
program and what /program-assemble appends verbatim to the coach-only, unpublished
athlete's `public.coaching_logs` row (append-only; prior cycles are never touched). They go to chat +
that log ONLY — never into the athlete app or the programme.

```
## Cycle <NN> — <Cycle Name> · <YYYY-MM-DD> · <NEW|RETURNING>

**The read** — the Step 1 analysis that drove this cycle, condensed but complete: the key
adaptation / recovery & lifestyle / injury / capacity / roadmap reads (returning), or the
recovery-ceiling / priority-target / contraindication / structure reads (new). Keep the
reasoning ("how we were thinking"); drop the throat-clearing.

**Decisions** — the LOCKED LISTS verbatim (PROGRESS / REPLACE / ADD, or PRIMARY LIFT
SELECTIONS), plus any fork Amir settled at the checkpoint and the call he made ("why we
changed something").

**Profile changes** — what changed in the athlete profile this cycle and why, one line each, or
"none". The block itself is kept current at the top of the log; this line is its history.

**Exercise Ledger Updates** — deltas only, not the whole table (/program-assemble applies
these to the persisted ledger): every REPLACE'd-out exercise → `Available` (rotated for
freshness, safe to reuse later) unless the brief/Amir flagged it as `Disliked`,
`Pain-flagged`, or `Banned` instead (name the reason in one clause); every PROGRESS/ADD
exercise → `Active`. If nothing changed status this cycle beyond the normal rotate/keep,
say so in one line rather than omitting the section.

**Volume & Dose** — **the checker writes the tables; nobody types them** (2026-09-26). Part A's
build check (`check_program.py --tables`) counts every exercise from its Spine entry's credits
(VOL-10: 1 prime mover, 0.5 helper; warm-ups count only core) and writes the per-exercise table,
the per-muscle totals against 10–20 and each day's cost-weighted load. /program-assemble pastes
that file here as written. Leave the line `<the checker's tables>` in your draft, and write only
what the numbers can't say, in a few lines: a time-limited under-dose framed as maintenance and
where to invest if time allows (VOL-1), a muscle under 10 by choice and why (VOL-9, the spec's
`floor-except:`), an over flagged as loudly as an under (VOL-3), and each day's load identity
(peak, moderate, low: VOL-2). A count that looks wrong for one exercise is fixed on its Spine
entry (a proposal to Amir, /spine), never by hand in the log.

**Special weeks** — the week-1 and back-off doses as decided (one line each).
```
*(Progression levers and an e1RM section used to close the entry. Amir doesn't read them, so they
went on 2026-09-26. An e1RM that drove a decision belongs in "The read", with its grade.)*

Then **build and check before any words are written** (2026-09-26): **/program-assemble Part A**
builds the workouts, drafts any new exercise into the Spine, runs `check_program.py --stage build`
and, for a new athlete, the one review. Every FAIL there is yours: change this spec and the log
entry together, and rebuild. Only then **/program-engage** (Prompt 2) writes the words, and
**/program-assemble Part B** places them, runs the full check, writes the log and publishes.

## THE CEILING — the athlete's 1RM tracker (a design input, not a prescription)

Athletes now carry an **estimated 1RM per lift**, built from the sets they already log.
`program.html` derives it from any set that has both a weight and an RPE (reps in reserve
= 10 − RPE, added back before the maths), and the history lives in **The Ceiling**, the
strength section on Game Plan. Nobody has to test a true max for this to exist.

**Read it before you set loads.** For a RETURNING athlete it arrives as the Debrief's **The
Ceiling** line (the one e1RM this pass uses: estimate, grade, date), and it also
carries **relative strength** (estimated 1RM ÷ body weight, from the athlete's latest
weigh-in). **Body weight is logged on the programme app's Home → Body Weight card** (tap it, then
Weigh in). ⚠️ Never send anyone to AA Proof to weigh in: the weight screen left Proof on
2026-09-12, and two programmes written that week still pointed there. For tennis and padel that ratio is the number that matters — absolute
kilos say much less about a player than kilos per kilo of them.

**Every estimate is graded, and the grade is the instruction:**
- **Sharp** (≤3 effective reps) — trust it. Usable as a starting-load reference.
- **Good** (4–6) — trust the direction and roughly the number.
- **Rough** (7–10) — a trend line only. Never set a load off a single Rough estimate.

**How it may and may not be used:**
- ✅ As the basis for a **starting-load suggestion on an exercise's `note`** — the one place
  in the whole app a weight is allowed to appear (PRG-2). *"Last cycle's estimate puts your squat around 125kg. Start the top set
  near 100 and let RPE decide from there."*
- ✅ As **evidence in the cycle review** — is the estimate climbing, flat or falling? That
  answers "did the last block work?" far better than a single logged load, because it
  normalises for the reps and RPE the set was done at.
- ✅ To spot a **lagging lift** — if lower-body relative strength has stalled while upper
  has moved, that is a cycle focus, stated with the number behind it.
- ❌ **Never as a %1RM prescription.** No "4×5 @ 80%" in the dose, cards or notes. The
  prescription stays RPE. A predicted max carries roughly ±5% error at best, so a
  percentage built on it is false precision wearing a lab coat.
- ❌ Never write the estimate into the athlete JSON as a target. It is derived on their
  device from their own log.

**Refreshing the number — the under-5RM test.** Where an athlete's estimates have all gone
Rough (long sets, low RPE) and you want a real number, prescribe **one set of 3–5 reps at
about RPE 9, stopping at the first rep that slows or breaks position** on a main lift, about
**once a month**. That is close to the condition where both halves of the estimate are at their
most accurate: the equation holds under about 10 reps, and an athlete's own sense of reps in
reserve is roughly 2 reps out at RPE 9 against 5 reps out at RPE 5 (Zourdos 2021). RPE 9, not
10: the estimate comes out *Good* rather than *Sharp*, and an athlete training alone never grinds
a rep (TST-2, TST-3). **Never prescribe a true 1RM** — it buys
almost nothing over a hard triple and costs warm-up time, fatigue and risk.

**The app now asks for it, so you do not have to remember to.** Put `test_flag: 5RM` on the
lift in the spec (see STEP 3's exercise fields) and Personal Records tracks how long it has
been since that lift got a number, then asks for a retest in the cycle's **closing week** —
which is the right place for one anyway: it measures the block that is ending and hands the
next one a real starting figure. The athlete taps through to a form with the reps already
set, warm-up instructions in place, and the same estimator the exercise card uses. **Two or
three flags a cycle at most** — the nudge works because it is rare.

They can also log a max for any lift in the cycle without a flag, from Personal Records →
**+ Log a max**. So a test you asked for in a `note` still reaches the record; the flag is
what makes the app chase it.

Suitability first: an athlete in their first cycle, in pain, or with poor technique under
load does not get a max-effort set — and does not get a `test_flag` either. Rough estimates
are fine for them.

---

## Don'ts
- Don't ask trivial questions or drip them — consult only on genuine forks; batch.
- Don't prescribe %1RM off The Ceiling, and don't prescribe a true 1RM test — see
  *The Ceiling* above. Loads stay RPE-prescribed; a max estimate informs a starting-load
  note, nothing more.
- Don't save one-off athlete-specific calls as principles — only generalizable ones, with Amir's OK.
- Don't put coach-facing reports or athlete health/chat detail into the athlete JSON or any
  **published** path — the reports' only home is chat + the coach-only
  `public.coaching_logs` row (which assemble writes).
- Don't regenerate the roadmap.
