---
name: program-design
description: Design one athlete's training program for a cycle — the core S&C design pass, run as an assistant-coach who consults Amir on genuine forks and learns his style over time. Use when Amir says "design <name>'s program", "do prompt 1", "write her next cycle", or after /athlete-intake + /program-roadmap for a new client. Auto-detects NEW (athlete analysis, SFR selection) vs RETURNING (cycle review, progress/replace/add). Reads the locked roadmap, a clean Athlete Brief, and COACHING-PRINCIPLES.md; outputs the program SPEC + coach-facing reports. Then /program-assemble Part A builds and checks it and goes straight on to /program-engage (the words), and /program-assemble Part B publishes after Amir's "ship it".
---

> Programmes and coaching logs live on the server (`public.programs`, `public.coaching_logs`;
> CLAUDE.md → *THE BIG ONE*). A local `data/<id>.json` is scratch, never the truth. A new cycle is
> published by /program-assemble Step 7; a change inside the live cycle is /program-edit's.
>
> **How a run is carried out:** `.claude/skills/PIPELINE-RUN.md` (PRC-29): the main conversation talks to Amir and
> writes the database; this stage's heavy work runs as a fresh helper at the effort that file sets.


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
database reads are the context pull in STEP 0 and, once the movements are chosen, the one Spine
match in STEP 3.

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
- **Read `.claude/COACHING-PRINCIPLES.md` at STEP 0** and apply it: the **rule index** in full
  (one numbered line per rule, and the line is the rule), then the stories this pass decides from
  (STEP 0.1 lists them). Never re-ask a question it already answers. Where a rule decides something in the spec or the
  log, cite its ID (`VOL-8`) rather than restating it (PRC-23).
- When Amir makes a call during design that is **generalizable** (would apply to other
  athletes — e.g. an exercise preference, a dosing rule, a communication choice), ask:
  *"Save this as a principle?"* On yes, add it the way the file's *How to add* says: one index
  line with the next free ID in its section (25 words or fewer, its stage, its check), a story
  bullet tagged with the same ID, and its date and Amir's words in `COACHING-PRINCIPLES-HISTORY.md`;
  `scripts/check_rule_index.py` checks the pair. **One-off,
  athlete-specific calls are NOT saved** — Amir curates what's learned. **During the rule freeze
  (PRC-25)** offer this only when his call fixes something that actually broke.

## STEP 0 — Setup
0. **Check the pipeline is current, without pulling** (2026-09-27). The rules and skills are edited
   from Amir's other sessions, and designing against a stale copy silently drops his newest rules
   (on 2026-09-26 a checkout 101 commits behind still allowed rep ranges and the retired panel). But
   this folder is shared by several sessions: `git pull` refuses when one has work in progress, and
   when it runs it moves the one HEAD they all share. So never pull here. Run
   `git fetch -q origin && git diff --name-only HEAD...origin/main -- .claude SCHEMA.md scripts assets/js/chips.js`
   (three dots: only what `origin/main` has that this checkout doesn't). An empty list means the
   local files are current. Every file on it is newer on `origin/main`:
   read it from there with `MSYS_NO_PATHCONV=1 git show origin/main:<path>` (Git Bash otherwise
   rewrites the path), **this skill included**, since the Skill tool loaded the local copy. If
   `scripts/check_program.py` or `assets/js/chips.js` is on the list, write both from `origin/main`
   into `<scratch>/pipeline/` at the same paths and run `python <scratch>/pipeline/scripts/check_program.py`
   for the whole run: run it, never read it.
1. Read **`.claude/COACHING-PRINCIPLES.md`** the way /program-engage does (2026-10-17): the **rule
   index** in full, then only the story sections this pass decides from: **Intake & assessment** (the
   injury logic), **Exercise selection**, **Recovery & autoregulation**, **Session structure & time**,
   **Progression**, **Volume & dosing** and **Testing**. Apply them throughout. The other sections
   (naming, communication, cues, chips, process) belong to assemble, engage and /spine: open one of
   their stories, by searching its ID, only when its line is not enough for a decision in hand.
   Not `COACHING-PRINCIPLES-HISTORY.md`: its dates and quotes change no decision.
2. Establish `athlete_id`. If Amir pasted athlete info, proceed without commentary.
3. **ONE context pull: everything design reads from the server, in a single call**: **Q1 in
   `queries.sql`** (this skill's folder; replace `<id>`). Run it once per athlete and keep the result
   for the whole pipeline (roadmap, design, assemble). Never look these up again one at a time, and
   never discover the schema: the tables and columns are all named there (PRC-6).
   - **Mode** from `ctx.row.has_workouts` and `ctx.sessions.n` (`data/*.json` is deleted, so a
     file test calls everyone NEW). Workouts and logged sessions → **RETURNING**; no row, or a row
     with no workouts (intake's identity, and the roadmap once it has locked) → **NEW**. Workouts
     but **no** sessions → the athlete never trained the last cycle (no login yet? check
     `athlete_identities`): stop and ask Amir before designing.
   - `ctx.log` is the coaching log's **head** (header, athlete profile, Exercise Ledger, roadmap
     rationale) plus **everything from the latest cycle on** (its entry, its in-cycle edits, its
     Debrief). Older cycle sections are left out on purpose. It comes back **whole** when the log has
     one cycle, or no finished profile (none yet, or one marked `status: partial`), because step 5a
     then builds the profile from all of it. `ctx.log_index` lists every `##` heading; when the
     latest entry points back to an older one, fetch just that section with **Q3**.
     `ctx.cycle_names_in_use` stops a roadmap reusing a cycle name. `ctx.qualities` are the Quality
     Map words.
   - `ctx.row.programme` is the cycle being reviewed as prescribed: every day, block and exercise
     with its `rx` (or legacy `chips`), Coach's Note and test flag. STEP 1A needs no other read of
     it. `ctx.row.cycles` is the whole roadmap and `ctx.row.athlete`/`sport` the identity block,
     exactly what assemble's local copy and fingerprint need, so nothing is looked up twice.
     `ctx.row.notes` lists last cycle's card titles. `ctx.sessions.minutes_by_day` is the real
     average session length per day over the last six weeks (STEP 2's time check).
   - **No exercise catalogue comes with it** (2026-10-17; Amir: *"i want the program writer to write
     the best program possible, use new exercises if needed, and then check spine"*). Until then Q1
     carried the whole Spine, 39,000 characters ordered by SFR, and reading it before choosing anchored
     each pick to what the library happened to hold. Design chooses every movement from the athlete
     first, then checks the Spine once (STEP 3 → *THE SPINE*).
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
   - NEW → use the ATHLETE BRIEF from /athlete-intake. In a new chat, the profile draft and the
     roadmap's read and rationale in `ctx.log` (saved when the roadmap locked, PRC-3) plus intake's one
     lookup (/athlete-intake Step 1) stand in for it. If neither exists, stop and ask Amir to run
     /athlete-intake first.
4b. **RETURNING — are the athlete's answers in?** (2026-10-17: a cycle was designed before the
   athlete had answered the cycle report's questions.) The latest Debrief's **Open** list names the
   questions sent to the athlete. An answer is recorded when Amir pasted it into this chat or a later
   section of `ctx.log` holds it. If any question has no recorded answer, ask Amir before STEP 1, in
   one message: *wait for the answers, or design now?* List each open question with the default you
   would design on (for a back: which direction you would assume is the worse one, and what that does
   to the hinge, squat and core picks). On "wait", stop: nothing is written. On "design now", each
   default goes under MY CALLS at the checkpoint and into the log entry's read, so the next cycle knows
   which answers were assumed. Answers that arrive go into this cycle's log entry (*The read*), in the
   athlete's words.
5a. **The athlete profile — read it first** (2026-09-26). The `## Athlete profile` block at the
   top of `ctx.log` says who the athlete is today: aim (sport / strength-muscle / general, decided
   again every cycle by `PROFILE.md` → *Choosing the aim*, since it moves with the goals and this
   cycle's `art`), goals in order, the bottleneck, days and real minutes, kit, standing bans, injuries with status,
   recovery. Apply the Debrief's **Profile changes** to it. **No profile yet** (every athlete before
   2026-09-26), **or one marked `status: partial`**: `ctx.log` is then the whole log (Q1 returns it
   whole, since the old injuries and bans may sit in an early cycle's section). Build or complete
   the profile from it, the latest Debrief, the roadmap and the intake form (whose `programme` sets
   the `tier`), keeping any lines already there, and show the whole block at the checkpoint. A NEW athlete's comes from
   /athlete-intake's draft plus the roadmap's read. **The format, the academy tier and `partial` are
   in `PROFILE.md`** (this skill's folder). An academy athlete (`tier: academy`) is designed to that
   tier's limits. The profile opens the spec, and the checker takes `aim`, `proven`, `bans`,
   `floor-except` and `cap` from it.
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
6. Read the **locked roadmap** (`ctx.row.cycles`). Honour the roadmap's focus for THIS cycle;
   deviate only if the brief demands it, and state the data point + reason.
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
- **ADAPTATION RESPONSE** — strength/RPE trends, loads progressed, reps hit; the
  **e1RM trend** per primary (the Debrief's The Ceiling, with each grade); where they
  over/under-performed + the read.
- **RECOVERY & LIFESTYLE INTEGRATION** *(required)* — sleep, stress, session-RPE trend AND
  the check-in chat. Separate training fatigue from life load. Close with a concrete
  consequence (session length, frequency, autoregulation, deload) or an explicit "no
  adjustment needed" + why. Never ignore the chat.
- **INJURY / MOVEMENT STATUS** — emerged / persisted / resolved; per item, the exercise-
  level implication. For a back, the direction decides the picks: which is worse, bending forward,
  arching back or sitting long (the cycle report asks it; without an answer it is a STEP 0.4b
  question, never a guess). For anything **resolving**, plan a staged return (isometric →
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
the same movement pattern on a different implement, stance, angle or grip, or its progression when
the athlete has earned it. Pick it as a coach would; the library's `alts` and `harder` for that lift
(Q5, read after the pick) show what it already holds, and a variant it lacks is a `new_exercise:`. It reads as new, keeps the
movement skill and what the logs know, and it is not "new to the client", so from Cycle 2 it may be
supersetted. A genuinely new pattern is still fine when the athlete needs one; it runs as straight
sets its first cycle.

**Check the rotation rate before finalizing REPLACE** (SEL-4, SEL-5). Roughly tally how many
non-primary, non-warm-up exercises from the prior cycle would carry over unchanged into this one. North of ~70% is a signal, not a
detail — it happened once at 83%, caught only on review, not at design time. The
"keep best-in-class" exception is for rehab/corrective work only; don't stretch it to
accessories just because their load is progressing well on paper — that kind of progress
is invisible to the athlete, new movements are what read as forward motion, and they pay
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
athlete (not yet backfilled), fall back to the older cycle sections of the log (`ctx.log_index`;
fetch one with Q3).

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
Show the **main lifts as a small table** (exercise · sets x reps · RPE · rest), so Amir makes any dosing
call here and not after the build (2026-10-18: a late "no weighted lift under 8 reps" cost 5.3M tokens of
rework). **When the Debrief shows 3 or more weeks with no training, say so here**: the spec then carries
`reentry:` and the cycle follows VOL-11.
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
  from available equipment and say why (SEL-1; extend as equipment dictates). The SFR judgment is
  yours, made from the athlete; the Spine is checked after (STEP 3 → *THE SPINE*). For a
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
**Kit (SEL-21):** name, in the primary-lift question, every piece the plan needs that is not on the athlete's
equipment list (a trap bar, a landmine, a stability ball, an air bike), so Amir confirms it or you swap it now.
**A frame change at the checkpoint** (days, session length, kit, conditioning) means the locked roadmap's
reasoning was built on other facts: read its focus lines and its `## Roadmap` read against the new frame and put
every line that no longer holds on a `roadmap_amend:` line in the same checkpoint (PRC-17, PRC-28), before the
spec, not after the build.

---

## STEP 2 — SESSION ARCHITECTURE
Day count + type of each day; one line of rationale per day citing Step 1.
- **Adaptation → prescription contract** (PRG-10; the cycle name drives the numbers): Strength →
  3–6 reps, RPE 7–9, rest 2–4′ · Hypertrophy → 6–12, RPE 7–9, 1–2′ · Power → 1–5
  explosive, RPE 6–8, full rest · Endurance/conditioning → 15+ / time. Don't let a Power
  cycle get programmed like hypertrophy.
- **PER-DAY LOAD DISTRIBUTION (required — not just weekly volume, VOL-2):** give each day a
  deliberate **load identity** and **undulate the week**: one peak / one–two moderate / one low
  day, not four flat days. Raw set count lies, so read each day by cost (heavy ×1.5, moderate ×1,
  isolation ×0.5: your estimate while choosing, each entry's `cost` from Q4 once the names are
  matched). The build check prints every day's load from the entries and warns on a flat week. Also: no two high-load days for the same pattern back-to-back,
  and no grind (7 or more working exercises, SES-15). For poor-recovery clients this distribution is the
  primary lever.
- **Warm-up + prep** on every day: 10–15 minutes (SES-3), its contents by SES-4, and its shape
  by SES-6 (a lifting day: the machine raise plus ONE prep circuit of two rounds, three or four
  movements, with a rest of 30 s or more; a cardio or running day builds through distinct
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
  **RETURNING athlete: calibrate against reality first.** The model runs short: one athlete's
  Cycle 1 modelled ~48 min and ran 69 (×1.44), so a 55-minute design meant ~75 real. Take the ratio
  from the last Debrief's time line (logged minutes against the modelled minutes that `--tables`
  writes into each log entry since 2026-09-27); without one, set your estimate against
  `ctx.sessions.minutes_by_day`. Part A's check prints the exact ratio (last cycle's model against
  its logged minutes) and each new day's expected real length, and holds the soft cap against that
  (since 2026-10-17 a last cycle still in the old chips format is read too, so there is a ratio).
  Tell Amir the expected real length at the checkpoint, not only the model's number, and say it is
  your estimate: the handoff quotes Part A's line, and its contacts line, never a hand sum.
  **NEW athlete: no logs yet, so design to the form's minutes plus 15** (Amir, 2026-09-26:
  *"form + 15"*), unless they said plainly that the time is a hard stop.
- **Sequencing within a day:** power/CNS → Primary → Accessory → corrective/Core →
  conditioning (SES-9; these are the section blocks, see STEP 3 CLASSIFICATION).
- **Superset** non-competing pairs to fit the time ceiling (SES-10), never in a first cycle or on
  a movement new to the athlete (SES-11; a **variant** of a logged movement is not new, so from
  Cycle 2 a rotated accessory can be paired), and never a unilateral Primary (SES-10). Spec the
  whole pair as ONE circuit-role entry (the STEP 3 template below), never two accessory-role
  entries carrying `intent: superset` (SES-12).
- **WEEK NOTES (required output, 2026-09-26; any week since 2026-10-11).** The cards never change,
  so every week that differs from the card gets a note, decided here as numbers. A note belongs to
  ONE week and the app shows it only then (`cycles[n].weekNotes`, keyed by week number: SCHEMA.md, PRC-15).
  - **The final week trains as written** (REC-4, since 2026-10-19: no back-off, because the next
    cycle's week 1 is already slow). **Only when the cycle ends into a competition Amir named**
    (SES-8) does it taper: write the spec's `taper:` line and the dose. Pick from `setsDrop` (sets
    fewer on every exercise), `rpeDrop` (RPE points off, never below 6) and `rpeCap` (no set above
    it, 6–9), and say what else changes: retests on flagged lifts only, no new top sets, a shorter
    outside day. The usual shape is one set fewer and every RPE at 6 or 7. A competition inside the
    cycle gets a titled lighter week before it instead (below).
  - **A final week that holds the retests** (TST-5) may cut volume on some lifts so the tests go in
    fresh (REC-4): a titled *Testing week*, which lifts test and which lose sets, as words for engage,
    with no `setsDrop`, `rpeDrop` or `rpeCap` (a number covers every lift, PRC-15). Untitled, the app
    would call it the *Back-off week*.
  - **Week 1, when it differs:** always for a new athlete, and for a returning one after a
    layoff, a return from injury, or a cycle full of new patterns. Usually an `rpeCap` of 7 or an
    `rpeDrop` of 1, which covers every lift that week (PRC-15), and what moves them back to the card
    from week 2. A limit on only the new exercises is not a number: write it on the line as words for
    engage, with no `rpeCap` or `rpeDrop` (the checker warns on a number scoped to some lifts).
  - **Any other week that differs from the card** (Amir, 2026-10-11: *"for example when some one has a
    testing week, or reduced load"*): a testing week (which lifts get one test set, and what the rest
    of the week does) or a reduced-load week (a mid-cycle deload, a travel or exam week, a staged
    return). Name the week number, a short title (*Testing week*, *Lighter week*) and the dose in the
    same three numbers. Never a note for a week that matches the card. A week whose tests go past its cap
    carries no `rpeCap` (the colours would mark every test set over): the cap goes in words, or the tests
    sit in the closing week, where the app exempts a flagged retest by itself (TST-4, PRC-15).
  Engage writes the athlete's words for each; you write the decision, one `weeknotes:` line per week.
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
1. **`scripts/check_program.py`** on the built file (Part A runs it). **Your spec's athlete profile
   sets its flags**: `aim: strength-muscle` turns on the 10-set floor (VOL-4; a sport athlete gets it
   as a warning in a `build` or `iron` cycle; a muscle or strength goal in the top two, or a `build` or
   `iron` cycle, is strength-muscle, and `general` turns the floor off: `PROFILE.md` → *Choosing the aim*),
   `proven` lifts the 4-set cap (VOL-8), `bans` and `floor-except` are read as written, and `cap` is
   the soft session length; a first cycle turns the new-athlete rules on by itself. So get the
   profile right rather than typing flags (a typed flag only ever adds one). What it checks is the
   rule index's Check column: the floors, the set cap, the new-athlete rules, bans in any exercise
   or fallback, RPE floors in every note, the week notes, back-to-back days, the Spine gate, the card
   names, retest flags, block order and continuity. Every FAIL is fixed; session length and the
   Quality headline are warnings.
2. **NEW athlete: ONE reviewer** (one agent, files only) for what a script cannot judge:
   injury logic, exercise choice, transfer, and whether the notes cover every exercise they
   should. **RETURNING athlete: no reviewer** unless Amir asks for one.
So write the spec for a script to read: each
banned movement named in one line (`bans: goblet, hanging, …`), every fallback on a line that
starts `fallback:`, a muscle excused from the floor on `floor-except: chest (posture)`, and the
week notes on the `weeknotes:` lines. A ban word is matched anywhere on a line holding `fallback`, `→`, `instead`
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
  placeholder. The one field that is never absent is the rest: write `rest:` on every working
  exercise and every circuit, a prep circuit included, 30 s at the least (CHP-7; Amir, 2026-10-11:
  *"some main exercise and some accessory exercises have rest time, some dont, it must be
  consistent"*). **Choose it for THAT exercise from CHP-7's guide** (heavy compound 150 to 180,
  other Primary 120, compound Accessory 75 to 90, isolation 60 to 75, core 45 to 60, a circuit once
  per round, never per item), never one number for a whole section. Show the rests in the spec so
  Amir sees each at the checkpoint.
- standard grinding lift → sets · reps/duration/distance · tempo · RPE · rest · intent (or none)
- ballistic (jumps/throws/Olympic) → sets · reps · RPE · rest · intent `max intent` — **no tempo**
- loaded carry → sets · distance/duration · RPE · rest — **no tempo**
- circuit (working) → rounds + rest + per-item reps + one overall RPE — **no per-item tempo**.
  **This is also how a superset/complex is spec'd — one circuit block, each paired exercise
  is one `items[]` entry.** Never spec a superset pair as two separate standard-role entries
  each with its own `rest:` and an `intent: superset` tag — see the "Superset" bullet in STEP 2.
- **warm-up / prep** → dose only (reps/duration); **no RPE, logs nothing** (prep circuits get
  `warmup: true` in assembly). RPE on a warm-up is noise. The bike is a simple line (time); a
  lifting day's movements are ONE circuit, two rounds, one reps number per item, and a rest of its
  own (SES-6, CHP-7).
- `intent` is the pill: one or two values from the closed list in SCHEMA.md → *`intent`: the pill
  list*, under CHP-2's rules (the groups, two at most, one per group, what is never a pill). Leave it
  blank if none. Choose it from the athlete, not the exercise: the grip this athlete needs, the side
  that goes first, the effort of every rep (`max intent` on ballistic work), where a hold sits. It is
  the athlete's, never the library entry's (NAM-5), and it never repeats what the entry's steps already
  say (CUE-7). Nothing goes on a grey `setup` line (CHP-1): a detail for this athlete is a `note_flag`.
  A variant that changes the exercise is its own `new_exercise:` (NAM-6), and a superset is a
  circuit-role decision, never a pill (SES-12).
- Tempo = Eccentric–Pause–Concentric–Reset (e.g. 3-0-1-0). RPE 1–10.
- `test_flag` (optional, standard lifts only; TST-5): `test_flag: 5RM` marks a lift as one this
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
  the athlete's sentence from it; you don't. **Only on a card of its own, never on a circuit item**
  (a superset's, a working circuit's or the prep circuit's): the app draws no Because on an item, so
  a flag there is lost (2026-10-17: six of one cycle's twelve). Move the reason to a standalone
  exercise, or drop it. The build and `check_program.py --stage build` warn when one sits on an item.
- `note_flag` (optional, NOT athlete-facing wording): when THIS athlete needs something on the card
  that the entry's steps, cues and the pill can't say, flag it in one short coaching-domain line naming
  what COM-14 lets a note carry (a starting weight from their logs, their limit, their kit, their checked
  fallback, a film ask) and why, e.g. `note_flag: staged knee return, stops at the box (changes the
  entry's step 3)` or `note_flag: log shows no confirmed RPE at 40 kg, start from the confirmed 35 kg`.
  Never a flag for general how-to (a missing or wrong step is a `spine_cue:` line for the entry, CUE-6),
  a general cue, or when to add weight (PRG-3). That's the whole job here: name the exercise + the
  reason. **Don't draft the athlete-facing sentence** — /program-engage PART 3 writes the
  actual "Coach's Note" copy from this flag + the full athlete picture, and /program-assemble
  places it on the exercise. This is the ONLY athlete-facing place a weight number may ever
  appear (in engage's copy, never in the dose). Program-wide guidance goes to engage's notes
  cards instead (COM-6).

**FALLBACK** (SEL-20): for each primary, note one same-pattern swap (if pain or the station's busy).

**OBLIGATIONS (required output, 2026-09-26): name every note this cycle MUST carry.** Engage writes
each one, tags the card that carries it, and the checker fails a missing one, so a rule that
lives only as "engage should write a card about X" can no longer slip. List every key that applies:
- `backoff` — only a cycle with a `taper:` line (carried by the week note on its final week, REC-4).
- `week1` — a new athlete, a layoff, a return from injury, a cycle of new patterns (the week 1 note).
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
The same list drives the WhatsApp message's action lines (COM-17) and your handoff (MEASURE, GATE, FILM, DATES, WATCH).

**THE SPINE — choose first, then check it (2026-10-17).** Amir: *"i want the program writer to write
the best program possible, use new exercises if needed, and then check spine."* Every exercise he
programmes has (or will have) one entry in `public.exercises`, its coach-only half in
`public.exercise_coach`. The library records a choice; it never makes one (NAM-8: not a whitelist).
1. **Write every slot's movement from the athlete read**, any real name: the injury picture (what
   hurts, in which direction, what is deferred), the kit they have, the load each limb can take (a
   side that lags, a joint in a staged return, one leg or two), and the goal and this cycle's
   adaptation. Pick what you would pick with no library in front of you: the best SFR you know for
   this athlete (SEL-1), transfer when it wins (SEL-2), a variant for REPLACE (STEP 1A). Write the
   whole week this way, prep and core included, before any lookup.
2. **One match, every name at once.** Put the chosen names (each exercise and circuit item) in a stub
   and let the checker resolve them, with the resolver Part A runs on the built file (exact after
   normalising, else a loose match), so design and assemble cannot disagree:
   ```
   # <scratch>/names_<id>.json:
   # {"athlete": {"id": "<id>"}, "workouts": {"days": [{"id": 1, "blocks": [{"exercises": [{"name": "<a chosen name>"}, …]}]}]}}
   python scripts/check_program.py <scratch>/names_<id>.json --spine-sql --pad   # ONE query: run it
   python scripts/save_spine_result.py <the file the connector names> <scratch>/match_<id>.json
   ```
   Its `names` field is one line per name, `name|hit|near|entry name`. Then run **Q4** in
   `queries.sql` once, for every id it found (PRC-6: these two and Q5 below are the run's Spine reads).
3. **Read each name.** A **hit**: the card takes the entry's exact name and id (NAM-8). A **near**
   match only: the same movement under another spelling takes the entry's name and id; a different
   version (other kit or setup) is a miss (NAM-6). **Nothing**: a miss.
4. **Check each matched entry against the athlete, and change the pick, never the label.** A
   restriction flag (`loaded-knee-flexion`, `axial-load`, `free-hinge`, `high-impact`, `overhead`)
   that meets the injury picture means the pick was wrong: choose again from step 1, or say on the
   line why it is still right. `credits` (what one working set counts toward) and `cost` (its
   day-load tier) size the week, since the checker counts from them. An entry with no video goes on
   the handoff's film list (SEL-16; videos are added in coach.html → Exercises).
5. **Every miss is a `new_exercise:` line**, and it goes INTO the library, in full, like the entries
   already there (Amir, 2026-09-25: *"if there is any exercise that is outside of the exercise
   library, after its prescribed for any athlete, it should be added to our library, with all the
   cues and other details like the ones already there"*). Write its pattern (from the library's list)
   and its qualities NOW, from the movement alone, before THE QUALITY CHECK below has run (/spine →
   *qualities*). Part A drafts it with `/spine`. A card shows cues only from an APPROVED entry, so the
   new entries are the one approval question in the handoff. Never swap a movement out because it
   has no entry (NAM-9).
**Regressions, progressions and kit swaps, when you want them:** **Q5** lists the entries in one or
more patterns (all of them in one call), each with its kit and `easier>harder>alts` (`easier` the
same movement made easier, `harder` made harder, `alts` the same movement on other kit). Read it only
after the slot's own pick is written, to find a version of THAT pick, never to choose it. A name that
changes after the match is matched again (the stub once more, with the changed names only).

**THE QUALITY CHECK — before the spec goes to Amir (Quality Map, 2026-09-24).** Each Spine entry
carries `qualities` (first = primary) from the ten: `strength · muscle · power · spring · speed ·
brakes · rotation · engine · armour · movement`. The cycle's `art` word names its headline:
`iron` strength, `build` muscle, `voltage` power, and `spring`, `brakes`, `engine` and `armour` each
their own quality. Only `bedrock`, `peak` and `reset` have no headline: they are phases (a
foundation, a sharpening or a recovery block) that train a mix on purpose (PRC-24). Count the designed week's
working sets per quality (PRC-26): primary 1, secondary ½, prep blocks skipped, and an exercise dosed by
time with no sets (a 30-min ride) counts one set per 10 minutes, never less than 1 (the same rule
as the athlete's day cards and coach.html → Exercises → *Quality check*; 2026-09-26). **The headline
should be in the top two.** When it isn't, report it with your recommendation (Amir, 2026-09-26:
*"report it, but recommend what you think should happen"*); it is a warning, never a fail. Counting
sets under-weights a quality trained in few, fast sets, so a real power block can put Power third,
and that is fine when the power work comes first each day. Never add volume only to move this
line, and never re-tag an exercise to move it: a new exercise counts with the qualities its
`new_exercise:` line already carries, set before this count (THE SPINE, step 5). Report the per-day top three too: it is exactly what each day card on Home will say
it builds, so a day card that reads "Movement · Armour" on a day you meant as the power day is a
design bug.

**STEPS AND CUES COME FROM THE SPINE, and only from the Spine (Amir, 2026-09-24: *"the aim is to use
these cues for all the exercises that everyone has from now on … if there is a cue for someone specific,
it should be in coach's notes. thats why its there"*).** The spec carries **no cues and no steps**. Each
exercise has one set of steps (CUE-6) and three cues (CUE-1) on its Spine entry, and every athlete's card
shows those; each layer says one thing (CUE-7).
- **Read the four layers before you write a pill or a flag** (CUE-7; Amir, 2026-10-11: *"everytime we write a
  program, we dont have conflict of coaching with the cues, coaches notes, and how to do the exercise and
  pills"*). Q4 (THE SPINE, step 2) already returned every matched entry's steps, cues, purpose and On
  court line; a `new_exercise:` brings its own. Then, exercise by exercise:
  - **The pill** changes or adds to what the entry says, every rep. Never a value the steps or cues already
    say (the Broad Jump's steps hold the landing, so no `stick the landing`), never the grip the steps name
    unless this athlete holds it differently.
  - **A `note_flag`** only for what the steps, the cues and the pill can't say about this athlete (COM-14). A
    limit that changes a step names the step: `note_flag: stops at the box, changes step 3`. Never a flag
    that restates a step or a cue.
  - **A `why_flag`** is why THIS athlete has it: never the entry's purpose or its On court line in other words.
  - **An approved entry with no steps yet** is no reason to put how-to in a note: add a `spine_cue:` line
    asking for its steps, and Upkeep proposes them to Amir.
  The checker backs this up: Part A warns on a pill the entry's steps or cues already say, Part B on a
  note that repeats a step or a cue. A warn there comes back to this step.
- **Something only THIS athlete needs** (an injury limit, a range to stop at, a setup for their home
  kit, a fault you saw on their film) is a `note_flag` on that exercise, which engage writes as the
  Coach's Note (COM-14), never as a cue. The side that goes first is the pill (CHP-2). A limit that
  changes one of the entry's steps is flagged as such, so the note can say what changes.
- **A general coaching point is not a note.** If it would help anyone doing the lift, it belongs on
  the Spine entry: a missing or unclear step, a better cue. Say so in the spec (`spine_cue:` + the
  entry id + the wording) and Upkeep proposes it to Amir. Never put it on one card.
- **RETURNING athlete whose last cycle's cards carry their own `cues`** (every programme before
  2026-09-24 does): read each card's cues against its Spine entry's. Anything that is about THIS
  athlete becomes a `note_flag` on the same exercise in the new cycle, so it is not lost when the
  card stops carrying cues. The rest is dropped. Two athletes had such cues moved into their
  Coach's Notes on 2026-09-24; their coaching logs say which. (This file is in a public repo:
  never name an athlete or their health here.)
- **An exercise with no Spine entry** is `new_exercise:` with its steps (CUE-6) and three cues
  (CUE-1), written for ANYONE. They go on the new entry via `/spine`, with every other field the
  existing entries carry, never on the card.

**Never spend a step or a cue on the tempo** (CHP-6): the card already shows `rx.tempo` with the digits
that matter picked out in clay. A point about this athlete's training age is a `note_flag`.

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
[the current athlete profile, updated this cycle: PROFILE.md has the format]
```
ATHLETE_ID: [id]
SPORT_BADGE: [emoji] [label]
PROGRAM: [number] | [N] days | [one-line focus]
week: [the usual training week, e.g. Sat:1, Mon:2, Wed:3 — turns on the back-to-back check]
weeknotes:
- 1 | [rpeCap 7 / rpeDrop 1 (every lift, PRC-15), and what moves them back to the card] (leave the line out when week 1 is "same as the card")
- [N] | [title: Testing week / Lighter week] | [the dose, and what changes] (any other week that differs from the card)
- 5 | [setsDrop 1 · rpeCap 6, plus anything else that changes] (the final week, ONLY with a taper: line, REC-4)
- 5 | Testing week | [which lifts test, which lose sets, in words, no number] (the final week, when it holds the retests and there is no taper)
bans: [one line, if any]
floor-except: [muscle (reason), only when the aim is strength-muscle and a muscle is excused]
reentry: [reason, e.g. "4 weeks off after the cycle ended"; only when the Debrief shows 3+ weeks with no training (VOL-11)]
taper: [the competition and its date; only when Amir named one this cycle ends into (SES-8, REC-4)]
obligations:
- [week1 · explainer · pain-ladder: knee · film: … · weigh-in · double-day · low-readiness · backoff (only with taper:) · …, one per line]
keep: [exercise (why it stays), … — returning athletes, anything carried over on purpose]
reintroduce: [exercise (what earned it back), … — only for a Disliked / Pain-flagged / Banned ledger row]
roadmap_amend: [cycle N: field → new value (the data point that forces it) — only when the locked roadmap must change]

---
DAY [N] — [plain working title: what it trains] | load identity: [peak/moderate/low]

SECTION: Activation & Prep   (logs nothing — no RPE)
  • [Machine raise] | [duration] | note_flag: [only if this athlete needs one]
  PREP CIRCUIT (a lifting day: ONE circuit of two rounds, SES-6) | rounds: 2 | rest: Xs (30 or more, CHP-7)
    [Movement A] — reps: X | note_flag: [optional]
    [Movement B] — reps: X
    ...

SECTION: Primary
[Movement] | role: primary
sets: X | reps: X | tempo: X-X-X-X | RPE: X | rest: Xs | intent: [one or two values from the pill list (CHP-2) / none]
note_flag: [only if THIS athlete needs something the Spine's steps, cues and the pill can't say (COM-14)]

SECTION: Accessory
[Movement] | role: accessory
sets: X | reps: X | tempo: X-X-X-X | RPE: X | rest: Xs | intent: [one or two values from the pill list (CHP-2) / none]
note_flag: [optional]

SECTION: Accessory (superset pair — role: circuit, NOT two accessory entries)
[Movement A] + [Movement B] | role: circuit (superset) | rounds: X | rest: Xs (shared — once
per round, after BOTH exercises, not per exercise) | RPE: X (one for the whole round, SES-13)
  [Movement A] — reps: X | note_flag: [optional]
  [Movement B] — reps: X | note_flag: [optional]

SECTION: Core
[Movement or circuit] | dose | rest: Xs | note_flag: [optional]

(cues and steps: none in the spec. They come from each exercise's Spine entry. Anything you noticed
 about an entry while designing, such as a missing regression/progression/alternative, a wrong flag, a
 missing or unclear step or a better general cue, goes in as spine_cue: / new_exercise: lines.
 /program-assemble applies them in its Spine upkeep step.
 new_exercise: [name] | pattern: … | qualities: … (from the movement alone, set before the Quality check) | steps: 1. … 2. … 3. … (CUE-6) | key point / feel or check / avoid (CUE-1), written for anyone → drafted into the Spine
 spine_cue: [entry id] | [a general change to a step, a cue or the purpose, for Amir to approve on the entry])

(fallback per primary: one same-pattern swap if pain / station busy)
---
[repeat for all days]
````

**SPEC PRE-FLIGHT (2026-10-18, before the spec leaves this stage).** Each of these cost a full Part A
rebuild on one athlete's Cycle 3 (about 8M tokens each; PIPELINE-RUN.md → *Cheaper runs*). Check them on the
spec itself, then hand it over:
- [ ] **VOL-8**: an interval or round count is sets. Write blocks of rounds; never 5 or more sets of one
  conditioning item (an 8-round bike interval written as 8 sets failed).
- [ ] **CHP-2**: no pace or effort pill beside an RPE on the same card.
- [ ] **CUE-4 / NAM-9**: every exercise the Spine match missed has its `new_exercise:` line, so its Spine
  draft runs before the first build, not after it.
- [ ] **VOL-11**: when the Debrief shows 3 or more weeks with no training, the `reentry:` line is in the
  header. The checker then applies the 8-rep floor, and a rep-max retest is an 8RM.
- [ ] The checkpoint showed the main lifts as a table (STEP 1A), so no dose is changed after the build.

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
the per-muscle totals against 10–20, and each day's cost-weighted load and minutes (modelled, and
the expected real length once a ratio exists). /program-assemble pastes
that file here as written. Leave the line `<the checker's tables>` in your draft, and write only
what the numbers can't say, in a few lines: a time-limited under-dose framed as maintenance and
where to invest if time allows (VOL-1), a muscle under 10 by choice and why (VOL-9, the spec's
`floor-except:`), an over flagged as loudly as an under (VOL-3), and each day's load identity
(peak, moderate, low: VOL-2). A count that looks wrong for one exercise is fixed on its Spine
entry (a proposal to Amir, /spine), never by hand in the log.

**Week notes** — each as decided: week, title, numbers (one line each: week 1, a taper on the final week, and any testing or reduced-load week).
```
*(Progression levers and an e1RM section used to close the entry. Amir doesn't read them, so they
went on 2026-09-26. An e1RM that drove a decision belongs in "The read", with its grade.)*

Then **build and check before any words are written** (2026-09-26): **/program-assemble Part A**
builds the workouts, drafts any new exercise into the Spine, runs `check_program.py --stage build`
and, for a new athlete, the one review. Every FAIL there is yours: change this spec and the log
entry together, and rebuild. When the build passes and no FAIL overturned a checkpoint answer, Part
A goes straight on to **/program-engage** (PRC-4: no "do prompt 2"), and after Amir's "ship it"
**/program-assemble Part B** places the words, runs the full check, writes the log and publishes.

## THE CEILING — the e1RM (a design input, never a prescription)

For a RETURNING athlete it arrives as the Debrief's **The Ceiling** line: each primary's estimated
1RM (from logged weight, reps and RPE), its grade and date, and relative strength (e1RM ÷ the latest
body weight, the number that matters for tennis and padel). The app keeps the history on its
Personal Records screen and adds a new best by itself. Body weight is weighed in on the programme
app's Home → Body Weight card, never in AA Proof (COM-13).
- **The grade is the instruction** (TST-6): Sharp (≤3 effective reps) trust it · Good (4–6) trust
  the direction and roughly the number · Rough (7–10) a trend only, never a starting load.
- ✅ A **starting-load suggestion on an exercise's `note`**, the one place a weight may appear
  (PRG-2): *"Last cycle's estimate puts your squat around 125 kg. Start the top set near 100 and let
  RPE decide from there."*
- ✅ **Evidence in the cycle review** (climbing, flat or falling) and to spot a **lagging lift**,
  stated with its number.
- ❌ **Never a %1RM prescription** ("4×5 @ 80%" nowhere), and never written into the programme as a
  target: a predicted max is ±5% at best, so a percentage on it is false precision.
- **Retests:** `test_flag: 5RM` on two or three lifts the cycle is about (TST-5). The app then asks
  for one set of 3–5 at about RPE 9 in the closing week, stopping at the first rep that slows (TST-2).
  Never a true 1RM. **A first cycle, an athlete in pain or with poor technique under load gets no
  max-effort set and no test flag** (TST-3: the first cycle's logs are its baseline). The athlete can
  also log a max from Personal Records → + Log a max, so a test asked for in a `note` still lands.

---

## Don'ts
- Don't ask trivial questions or drip them — consult only on genuine forks; batch.
- Don't read the Spine before choosing: the pick comes from the athlete, the match comes after
  (STEP 3 → *THE SPINE*).
- Don't prescribe %1RM off The Ceiling, and don't prescribe a true 1RM test — see
  *The Ceiling* above. Loads stay RPE-prescribed; a max estimate informs a starting-load
  note, nothing more.
- Don't save one-off athlete-specific calls as principles — only generalizable ones, with Amir's OK.
- Don't put coach-facing reports or athlete health/chat detail into the athlete JSON or any
  **published** path — the reports' only home is chat + the coach-only
  `public.coaching_logs` row (which assemble writes).
- Don't regenerate the roadmap.
