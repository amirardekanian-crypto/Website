# The pipeline audit of 26 September 2026: what we set out to do, and what's left

Two audits were written on 26 September as claude.ai pages, which Amir is deleting: the
**programme pipeline audit** and the **redundancy audit** that followed it. This file replaces
both. It records what they found, what Amir answered, what shipped, and what is still open.

No athlete is named here, because this repo is public. Where live data matters, the query that
finds it is given instead.

**Picking this up in a new chat:** read section 5, choose an item, and say which one. Before any
work, `git pull --rebase` (other sessions push to `main` too), then ship straight to `main`, one
push at a time.

---

## 1. What we set out to do

The first audit read every pipeline skill, the principles, the checker and the memory notes, and
tested them against the 34 live programmes. What it found:

1. **Nobody owned the week-5 back-off, and mostly it wasn't happening.** 16 of 34 programmes had
   no back-off wording, and week-5 session RPE (6.71) matched weeks 1 to 4 (6.74).
2. **Out-of-date rules reached athletes.** "Reps are one number" was written about ten times, and
   two copies said the opposite. Athletes were sent to weigh in on a Proof screen that no longer
   existed.
3. **The checks ran after the text was written**, so a late fix left the notes describing the old
   programme.
4. **The checker was set up by the model it was checking.** Sex, first cycle, bans and the volume
   table all came from the same run; leave a flag off and a floor was skipped in silence.
5. **Returning athletes had lost their safety net.** No reviewer, and the script checked neither
   rotation nor repeated doses, though every failure of that kind on record was a returning cycle.
6. **A new athlete's 25-week roadmap was locked before the athlete was analysed**, and its
   reasoning was never saved.
7. **Some rules sat in stages that couldn't act on them** (the warm-up rules, "start lower and say
   the number", the film-gate card).
8. **Some rules cancelled each other out.** Rotate every accessory to something new, and never
   superset a new exercise: so an accessory superset could never happen.
9. **The pipeline had changed faster than it had been used** (2 of 34 live programmes had come
   through the current version).
10. **The public skill files named athletes**, two of them with health details.

The proposed shape: the same skills in a new order. Analyse before the roadmap, check the
programme before any text is written, store an athlete profile instead of re-reading notes every
cycle, and give every rule one home. No new agents.

The **redundancy audit** then looked one level down: every fact, rule and piece of code that lives
in more than one place, and whether the copies still agree.

## 2. Amir's answers, and where each one lives now

| # | Question | Answer | Where it lives now |
|---|---|---|---|
| 1 | Is 10 sets a week a floor? | Only when the aim is strength and muscle; athletes get what suits them | VOL-4, `floor-except:`, checker `--floor` |
| 2 | Who does the 4-set cap apply to? | Everyone, until our own logs prove more (a self-described "pro" doesn't count) | VOL-8, checker `--proven` |
| 3 | Supersets or rotation? | Rotate by variant | SEL-4, SES-11 |
| 4 | The back-off week | The app shows the first and the last week | `cycles[n].weekNotes`, REC-4, program.html |
| 5 | The three-lens roadmap panel | "You decide what gets the highest quality program" | One pass plus one reviewer (PRC-3) |
| 6 | Roadmap approval | Not needed | /program-roadmap |
| 7 | Headline quality out of the top two | Report it and recommend | A checker WARN (PRC-24) |
| 8 | The Progression levers and e1RM log sections | Not read | Cut from the log |
| 9 | Autoregulation note for whom | As recommended | REC-2: the one line for everyone; REC-6: the full kit for high-stress and concurrent athletes |
| 10 | A new athlete's session time | The form's minutes plus 15 | SES-7 |
| 11 | Competition calendars | None unless Amir names one | SES-8 |
| 12 | Two programmes sending athletes to Proof to weigh in | Fix those sentences | Done. Four more found since: see 5.1 |
| 13 | The Gmail session import | Still needed | athlete-brief, MODE=import |
| 14 | How hard a retest goes | My call | TST-2, TST-3: stop at the first rep that slows; a 5RM retest is one set at about RPE 9 |
| 15 | Two athletes weeks past their cycle's end | They keep the app, with no coaching | Nothing to build |
| 16 | Scrub names and health details from the skills | Yes | Done; pre-commit guard 6 blocks an athlete id under `.claude/` |

## 3. The plan, item by item

The first audit's plan had 24 items. All the critical and high ones shipped on 26 September, and
so did the rest except where noted.

| # | Item | Status | Commit |
|---|---|---|---|
| 1 | The back-off week gets an owner | Done: design sets the week-5 dose, it is written as `weekNotes.last`, the app shows it, the checker fails a cycle without it | 9e044ec |
| 2 | Stale rules that reach athletes | Done: body weight, rep ranges, the log path, cue calibration, the glute example; the two named programmes corrected | 9e044ec |
| 3 | Assemble in two parts | Done: Part A builds and runs every programming check before engage; Part B places the words and publishes | 76a1e3b |
| 4 | A stored athlete profile | Done: a `profile` block at the top of the coaching log, which the checker reads | 8e0577b |
| 5 | Continuity checks in the script | Done: overlap with the last cycle, identical re-ships, the Exercise Ledger, circuits, grind days; "weighted" comes from the Spine | 3237320 |
| 6 | /cycle-report is the one evidence path | Done: the Debrief carries the RPE-10 rate, The Ceiling and profile changes; the returning-athlete brief is retired | 98040eb |
| 7 | One rulebook | Done: the numbered rule index (148 rules, 54 enforced by the checker), the stories behind it, guard 7 | b0aa2c1, 5dfbec2 |
| 8 | A notes obligations list | Done: design lists them, engage writes them first and tags the cards, the checker counts them | 9a40d42 |
| 9 | The roadmap after the analysis | Done: one pass plus one reviewer, no sign-off; the rationale and exit tests are saved to the log | 9e044ec |
| 10 | Scrub names; a guard | Done: skills, principles and five more docs; guard 6 | 9e044ec, 6a9a4c5, 0a9ee57 |
| 11 | The headline check becomes a WARN | Done | 9e044ec |
| 12 | Muscle credits and a cost tier on the Spine | Done: stage39; the checker writes both volume tables and the day loads | 942b9b6 |
| 13 | Design reads a slice of the log | Done | b8fb3d9 |
| 14 | Remove duplicate checks, the local log copy, the internal contradictions | Done | b8fb3d9, 3bedea6, 0a9ee57 |
| 15 | Amir's answers into the rulebook and the checker | Done (section 2) | 9e044ec, b0aa2c1 |
| 16 | The planted-fault test as a fixture | Done: `scripts/test_check_program.py`, 108 tests, guard 8 | b8fb3d9 |
| 17 | Record which checks fired | Done: a `Checks:` line in each cycle's log entry. **The review it feeds is still to come (5.3)** | b8fb3d9 |
| 18 | One-call publish | Done: `publish_cycle()`, stage38 | 1f788b1 |
| 19 | Required cards first; a soft cap | Done: COM-9, and COM-10 (past 8 cards, say why) | b0aa2c1, 4b2a478 |
| 20 | Cut the Progression levers and e1RM sections | Done (Q8) | 9e044ec |
| 21 | One exercise catalogue | Done: the Spine carries names, cues and videos; `exercise_library.json` and its Notion sync are retired | bcaa55a |
| 22 | Rewrite COACHING-HOWTO.md | Done | 76a1e3b, 0a9ee57 |
| 23 | Rotation by variant | Done (Q3) | 9e044ec |
| 24 | A version stamp on the skills | Done another way: design's Step 0 pulls, falls back to `origin/main`, and re-reads every pipeline file the pull changed | 3bedea6 |

## 4. Also shipped the same day

**Seven follow-ups** Amir approved after the plan ("yes to all, go"):

- A day's reset clears every circuit round's RPE (4e1d08f).
- CLAUDE.md's second pass: 101.7k characters down to about 31k. AA Proof's detail went to
  HABITS.md and XP_SYSTEM.md, the Farsi products to FARSI-PRODUCTS.md, design to the atlas
  (cc95cac, 0a9ee57, ea3628c).
- Muscle credits and a cost tier on every Spine entry (942b9b6, stage39).
- One-call publish, `publish_cycle()` (1f788b1, stage38).
- A soft cap of 8 notes cards (4b2a478, COM-10).
- Videos come from the Spine (bcaa55a).
- The rule freeze, PRC-25: no new rules for 5 to 8 cycles unless something breaks (4b2a478).

**The redundancy audit's fixes:**

- A live bug: circuits stored as text ("×3 Rounds") drew one round of logging rows. 106 circuits
  across about 29 athletes; fixed and served live (cc2d4af).
- AA Proof's docs, tour, manual and board wording checked against the code; leaving the board now
  always sticks (ea3628c).
- coach.html's "forget" confirm says exactly what it deletes (ea3628c).
- /carousel and /reel default to Farsi; the reference carousel that no longer existed; the brand
  bible (0a9ee57).
- Nine rule copies in the skills that contradicted their own rule (0a9ee57).
- Names removed from five more public docs (0a9ee57).
- Claude's memory notes: 48 down to 22.

**Amir's answers to the redundancy audit:**

- privacy.html matches the app (b821468).
- The phone rounds the day's percentage the way the board does (b821468).
- `add_contact()` no longer mints a key (stage41, b821468).
- A Coach's Note is one to three short sentences, COM-14 (5dfbec2).
- Sixteen rules that lived only in a skill got numbered lines, worded as they were (5dfbec2).
- Straight to `main`, one push at a time; a cloud session merges its PR the same day (5dfbec2).

## 5. What's left

### 5.0 Done in the second pass (26 September, evening)

- **Weigh-in lines (was 5.1.1):** on Amir's yes, ten lines in four current programmes now point at
  Home → Body Weight; the lines that mention Proof for sleep or protein were left alone. Each
  programme's previous version is in `program_versions` (note "before weigh-in pointer fix"), and
  each coaching log has an in-cycle edit line. The query that found them still returns only
  correct lines.
- **Ochre (was 5.1.2):** Amir said swap. coach.html's `--ochre`, its chart `C.amber` and
  call-log.html's `--amber` are now muted plum `#7A4E6E` (legacy names kept). The course apps keep
  theirs until the private repos change.
- **5.2.1** COM-13 is in `check_program.py` (clause by clause; 17 tests).
- **5.2.2** `scripts/check_xp_rules.py` against `supabase/xp_rules_snapshot.json` (pre-commit guard 10).
- **5.2.3** `scripts/check_parity.py` against `supabase/word_lists_snapshot.json` (guard 11). Every
  list agrees today.
- **5.2.4** `scripts/check_setlog.js` (guard 9). A "2×20" weight no longer reads as 20 reps, in both
  readers; `parseLoggedKg()` reads a pair as one implement.
- **5.2.5** The site video modal uses the app's YouTube rules and never invents an id.
- **5.2.6** /ad stage 16b AUDIO and `.claude/skills/reel/tools/mux_audio.py` (-14 LUFS, checks sound).
- **5.2.7** /spine has a pending list for wording proposals, in
  `exercise_coach.suggested_changes` (stage43, applied on Amir's word).
- **5.2.8** WhatsApp message 2 and the handoff's OBLIGATIONS block are built from the spec's
  obligations list, with a count-and-order self-check.
- **XP wording** (found by the new guard): the app's wording won (Amir). The `xp_rules` row now
  carries the four "I / II" milestone names and the three "this week" quest notes, and the
  snapshot is refreshed; the guard reads 0 FAIL, 0 NOTE.
- **ytVideoId()** in program.html has the site modal's host check (sw `aap-v40`).
- **5.5** The six AA Proof bugs and the two stale habits.html comments are fixed.

### 5.1 Needs Amir

1. **Rotate the Supabase keys from May** (Amir, 26 September: not sure they were). Project Settings →
   API → roll the secret key; Account → Access Tokens → revoke the old token; then update the MCP
   config with the new one.

Amir, 26 September: *"do as recomended"*. The recovery-band table and the COM-9 line wait for
the end of the freeze (5.3), and the names stay in git history (5.6).

### 5.2 Recommended, no decision needed

Nothing open: every item shipped (5.0) or waits for the freeze (5.3).

### 5.3 At the end of the rule freeze (PRC-25: after 5 to 8 cycles through the new pipeline)

- **Read the `Checks:` lines** in the coaching logs: which checks fire and which never do. Keep what
  earns its cost and cut the rest (plan item 17).
- **Trim about 150 lines of restated rules** in program-design, program-assemble and program-edit
  (its Rules 1 to 1d) down to rule-ID citations. Wording only, no rule changes: do it once, with Amir
  watching the result.
- **Decide which unchecked rules the checker should enforce**, starting with VOL-12 (biceps and
  triceps 6 to 12 sets in a foundation cycle): the one with a real effect that nothing checks.
- **The recovery-band table** (REC-1): recovery band → starting sets per muscle and an RPE ceiling.
  Amir gives the bands and numbers; then the rule, /program-design's starting row and a checker
  test that flags a programme past its band.
- **COM-9 extended** so WhatsApp message 2 and the handoff follow the obligations list in order,
  and teach the checker to compare them against the list (today only the self-check line does).

### 5.4 Happens by itself: just watch

Older athletes pick up the new structures (the profile block, the obligations list, week notes,
the `Checks:` line) at their next cycle. There were no bulk edits (Amir, 26 September: *"we dont
want to change anything but the our ways"*). The first two or three cycles through the new order
are the real test of this whole audit: watch for friction between Part A, engage and Part B.

### 5.5 Outside the pipeline, still open

- **The course app** still carries a comment about a removed "open in YouTube" link, and its
  `--ochre`. Its source is the private `tps-content` repo, so fix both there.

### 5.6 Deliberately left as they are

- **Git history still holds the names that were scrubbed.** Rewriting it would break every clone
  and open branch (Amir, 26 September: leave it).
- From the redundancy table: "new or returning" is detected twice (harmless between sessions); the
  Quality line is worked out twice in one run (the handoff copies the checker's); the RPE floor sits
  in three layers (two scripts guard different things); the mid-cycle and end-of-cycle reads of the
  same logs ask different questions.
- The audit's "do not change" list: the Step 1 checkpoint with Amir; design reasons and assemble
  copies; the one new-athlete reviewer; the publish fingerprint and the saved versions; the
  append-only log with its mutable Exercise Ledger; /cycle-report's rules (every claim carries its
  number, and Amir is asked once); RPE-only prescription and a card that stays put all cycle; the
  Spine as the one home for cues, with Amir approving every entry; "a correction changes only what
  Amir named" and "never touch the app during a run"; the text checks in the script; one context
  pull; the start-date question at the checkpoint; rotation discipline; reading `origin/main` when
  the pull fails; the 5×5 house shape.

## 6. Where things are now

- **Rules:** `.claude/COACHING-PRINCIPLES.md`, the rule index at the top (148 rules, 54 enforced by
  the checker), kept honest by `scripts/check_rule_index.py`.
- **The checker:** `scripts/check_program.py`; its tests: `python scripts/test_check_program.py`.
- **The pipeline order and the magic words:** `.claude/COACHING-HOWTO.md`.
- **Server functions from this work:** `supabase/stage38_publish_cycle.sql`,
  `stage39_spine_credits.sql`, `stage41_add_contact_no_key.sql`.
- **Pre-commit:** eleven guards in `.githooks/`; run `git config core.hooksPath .githooks` once per
  clone.
