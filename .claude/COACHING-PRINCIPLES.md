# Coaching Principles — Amir Ardekanian

This is Amir's codified coaching philosophy, in two parts: **the rule index** (one numbered
line per rule, just below) and **the stories behind the rules** (the bullets after it: what each
rule means in practice, with its examples). The history, meaning each rule's date, Amir's own words
and the athlete it came from, is in **`../docs/record/COACHING-PRINCIPLES-HISTORY.md`** (moved there 2026-09-27).
No stage reads that file; open it for a rule's origin. Every stage reads the whole index and only
the story sections its job needs: `/program-design` the seven its decisions come from (its STEP 0
lists them, since 2026-10-17), `/program-engage`, `/program-edit` and the reviewers theirs. Either
way, settled questions are never re-asked. It
grows as we design together: when Amir makes a **generalizable** call during design, the skill
offers to add it here (he approves; one-off athlete-specific calls are NOT saved). Amir can open
and edit this file anytime.

Tracked in git (synced + versioned) but inside `.claude/`, so GitHub Pages does not
publish it. No athlete health/chat detail goes here — principles only.
⚠️ **The GitHub repo itself is PUBLIC, so never write an athlete's name or id in this file.**
The worked examples say *Athlete A*, *Athlete B* … (coded 2026-09-24 in order of first
appearance; the key is deliberately not kept anywhere). A new example takes the next
free letter, or no label at all. The athlete's own record belongs in `public.coaching_logs`.

> How to add: one line in the rule index (the next free ID in its section, 25 words or fewer,
> its stage and its check), then a story bullet under the right section, tagged with the same ID,
> and its date and Amir's words under the same ID in `../docs/record/COACHING-PRINCIPLES-HISTORY.md`. Keep the
> rule general (applies across athletes) and actionable.

---

## The rule index

**Read this first. One line per rule, and the line is the rule.** Everything below the index is
the story behind each rule: what it means in practice and its examples (the date, Amir's words and
the athlete it came from are in `../docs/record/COACHING-PRINCIPLES-HISTORY.md`). If a line and its story ever
disagree, **the line wins** and the story gets fixed. Search a rule's ID (`SEL-4`) to find its
story. Built 2026-09-26 from the pipeline audit: the same rule lived in up to ten places, and a
stale copy reached athletes.

- **Stage** is the skill that applies it: intake, roadmap, design, engage, assemble (Part A
  builds and checks, Part B finishes), edit, report (/cycle-report), spine, workout (library
  sessions).
- **Check** is what `scripts/check_program.py` does with a breach: **✓** fails it · **warn**
  flags it · **part** checks part of it · **oblig** fails it once design puts that key on the
  spec's `obligations:` list · blank is judgment (the designer, the reviewer, Amir). Every FAIL
  and WARN the checker prints names its rule, and `scripts/check_rule_index.py` holds this
  column to the script.
- **Adding a rule:** the next free number in its section (never reuse a retired one), one line
  here in 25 words or fewer, then the story bullet below, tagged with the same ID, and its date
  and Amir's words in the history file under the same ID.
  **Skills cite IDs; they never restate a rule** (PRC-23).

### Intake & assessment
| ID | Rule | Stage | Check |
|---|---|---|---|
| INT-1 | Intake collects the recovery inputs: sleep quality and hours, stress, nutrition, age, weekly life-load. | intake | |
| INT-2 | Take injury history up front (past injuries, surgeries, recurring pain); it pre-loads the contraindications. | intake | |
| INT-3 | Trust the bar over the résumé: program for demonstrated capacity, and log a hidden weakness as next cycle's target. | intake · design | |
| INT-4 | Ask for more time only against a real limit; if the limit is genuine, reframe the goal honestly (an under-dose is maintenance). | intake · roadmap | |
| INT-5 | Refer out before loading a red flag: sharp, persistent, worsening or radiating pain, numbness, a suspected injury. Coaching is not diagnosis. | every stage | |
| INT-6 | An active injury or rehab history gets a pain card: what's OK, what's not, a stop-rule ladder, tied to their own restriction. | design · engage | oblig `pain-ladder` |
| INT-7 | A complaint repeated word for word with nothing backing it may be a stale log: ask Amir before it drives a decision. | design | |
| INT-8 | A standing issue confirmed resolved gets one acknowledgment line, never silence. | design · engage | oblig `close-loop` |
| INT-9 | Programming around pain carries named escalation triggers and a dated clinician checkpoint (about 6 weeks). | design · engage | |
| INT-10 | An athlete who hides pain gets the modification menu in writing, up front: reporting buys a modification, never a ban. | engage | oblig `modification-menu` |
| INT-11 | Before the roadmap, confirm the form's frame with Amir: days, minutes, kit, and anything the athlete asked him directly. | intake | |

### Exercise selection
| ID | Rule | Stage | Check |
|---|---|---|---|
| SEL-1 | General fitness: the highest stimulus-to-fatigue (SFR) option in each pattern leads. | design | |
| SEL-2 | Sport athletes: transfer may override SFR (a back squat over the leg press); state the trade-off. | design | |
| SEL-3 | In a hypertrophy block, machine and SFR primaries suit sport athletes too: transfer is deferred to a later cycle, not lost. | design | |
| SEL-4 | Accessories rotate every cycle, by variant: same pattern on new kit, angle, stance or grip, or an earned progression. A keep goes on `keep:`. | design | ✓ (70%+ kept) |
| SEL-5 | Circuits and finishers rotate too, to genuinely different kit and patterns, never the same swing, slam and carry. | design | ✓ (with SEL-4) |
| SEL-6 | Rehab and corrective work keeps its best-in-class pieces; that exception never stretches to general accessories. | design | |
| SEL-7 | A kept exercise shows a visible dose progression (sets, reps, RPE, tempo, rounds or a harder variant); never an identical re-ship. | design | ✓ (warn on a primary) |
| SEL-8 | A swap fits demonstrated capacity, not the most advanced-sounding progression. | design | |
| SEL-9 | Knee history: reverse lunge over forward; plyometrics return through stick landings and step-downs; lateral bounds come last. | design | |
| SEL-10 | Chronic back: a supported hinge and a supported squat pattern first; the free hinge and axial loading return after one pain-free cycle. | design | |
| SEL-11 | Audit every range or height restriction against every exercise, its steps and cues, and every warm-up and prep item; if nothing fits, the pattern leaves. | design | part (`bans:`) |
| SEL-12 | Check every fallback against every deferral in the cycle, and read the fallback list last. | design | ✓ (`bans:`) |
| SEL-13 | Posture and tennis clients: horizontal pressing low or none; bias the posterior chain and scapular health. | design | |
| SEL-14 | No corrective or postural drill without a noted posture issue; prep mobilises and activates the day's patterns. | design | |
| SEL-15 | Each working exercise appears once per cycle; a second exposure is more sets or a different movement. Prep items may repeat. | design | ✓ |
| SEL-16 | A missing demo video never shapes the prescription: prescribe the best movement, and Amir adds the video. | design | |
| SEL-17 | An exercise removed for dislike, inability or pain stays out until re-earned with evidence; the Exercise Ledger records why. | design | ✓ (ledger) |
| SEL-18 | No Assault Bike warm-up for a flexion-sensitive back: an incline treadmill walk, or an upright bike with hips above knees. | design | |
| SEL-19 | While the free hinge is deferred, a loaded carry is picked up from a bench or rack at hip height, never the floor. | design · engage | |
| SEL-20 | Name one same-pattern fallback for each primary lift in the spec, for pain or a busy station. | design | |
| SEL-21 | Every exercise's kit is on the athlete's equipment list or confirmed with Amir at the checkpoint; never assume a piece. | design | warn |

### Naming (exercises, cycles, days)
| ID | Rule | Stage | Check |
|---|---|---|---|
| NAM-1 | Exercise names run [modification] [equipment] [movement]. | assemble | |
| NAM-2 | Equipment goes in a name only when the movement has several implements; bodyweight moves take the bare name. | assemble | ✓ (a "Bodyweight" prefix) |
| NAM-3 | Defining setups belong in the name: Chest-Supported, Heels-Elevated, Half-Kneeling, Incline, B-Stance, Single-Arm, Single-Leg. | assemble | |
| NAM-4 | Never in a name: grip, intent, range, tempo, holds, bare digits, brackets, colons, commas. Canonical digits (45°, 90/90) stay. | assemble | ✓ (brackets, colons, commas) |
| NAM-5 | A grip is the card's `intent` pill, never free text; the entry's steps may name the default grip in plain words, never as a pill. | assemble · spine | ✓ (grip as text) |
| NAM-6 | A variant that changes the exercise (Short-Lever Copenhagen Plank) is its own exercise, with its own name, entry and cues. | design · spine | |
| NAM-7 | A hold on a dynamic exercise keeps the canonical name; `rx.tempo: "iso"` and the time carry it, and a hold pill says where. | assemble | |
| NAM-8 | Use the Spine entry's exact name, no alias; a different version is its own entry. Not a whitelist: prescribe any real movement. | design · assemble | warn (a name that is not its entry's) |
| NAM-9 | A newly prescribed exercise joins the library in the same run, in full: cues, details, qualities, links both ways. Never swap it out instead. | assemble · spine | ✓ |
| NAM-10 | Cycle names are punchy, evocative one- or two-word power-names, set in the roadmap. | roadmap | |
| NAM-11 | Day names (`focusTag`) have sports-headline energy, never spreadsheet labels. | design · assemble | |

### Recovery & autoregulation
| ID | Rule | Stage | Check |
|---|---|---|---|
| REC-1 | Recovery capacity gates everything: set the weekly volume ceiling before the number of sessions. | roadmap · design | |
| REC-2 | Low-readiness days: amber, 1 off every RPE (never below 6); red, warm-up, first power and first primary, rest optional; sore, half the jumps and landings. | design · engage | oblig `low-readiness` |
| REC-3 | Separate training fatigue from life load in every review. | design · report | |
| REC-4 | No two slow weeks in a row: the final week trains as written, except a competition taper or less volume on some lifts for retests. | roadmap · design | ✓ (warn: a back-off with no competition) |
| REC-5 | A concurrent athlete gets a double-day rule: gym after sport or 4–6 hours apart, otherwise the minimum dose with the primary at RPE 6. | design · engage | oblig `double-day` |
| REC-6 | High-stress and concurrent athletes also get a flexible session order in their notes. | design · engage | |

### Session structure & time
| ID | Rule | Stage | Check |
|---|---|---|---|
| SES-1 | Days are listed in the best execution order; an optional day keeps its place in the week and is labelled optional. | design | |
| SES-2 | A day trains what it says: never top up a muscle on the wrong half of the split; fix attendance with day order. | design | |
| SES-3 | Warm-up plus prep is always 10–15 minutes of programmed time. | design | |
| SES-4 | Gym clients warm up on a machine; strength prep has no joint-isolation drills; skips, shuffles and sprints belong to court or run days. | design · edit | part (court drills in a roadmap focus) |
| SES-5 | Warm-up and prep items log nothing and carry no RPE. | design · assemble | warn |
| SES-6 | A lifting day's prep is a machine raise plus one two-round prep circuit; a cardio or running day's prep is one pass through distinct movements. | design · assemble | part (lifting days) |
| SES-7 | Design to the real minutes the logs show; a new athlete gets the form's minutes plus 15. A cap binds only on a hard stop. | design | warn |
| SES-8 | No competition calendar unless Amir names one: the arc runs straight through. | roadmap · design | |
| SES-9 | Order within a session: power, then primary, accessories, core; blocks use the standard section names (SCHEMA.md), never one "Strength" block. | design · assemble | part (a Strength block; the order warns) |
| SES-10 | Superset non-competing pairs to save time, except a unilateral Primary lift, which always runs as straight sets. | design | |
| SES-11 | No supersets in a first cycle, or on a movement new to the athlete (a variant of a logged one isn't new), mid-cycle included. | design · edit | part (first cycle) |
| SES-12 | A superset is ONE circuit entry with a descriptive name, never two standard cards carrying a pill. | assemble | ✓ |
| SES-13 | A circuit in a working block logs a weight per exercise and one RPE per round; a prep block's circuit logs nothing. | assemble | |
| SES-14 | A library session is as hard as its adaptation needs: no weekly hard-session count, only tissue-cost spacing (48 hours, not before a match). | workout | |
| SES-15 | Seven or more working exercises make a day a grind: check its load identity before it ships. | design · edit | warn |
| SES-16 | A low-load brace primer (a dead bug or bird dog before a heavy hinge) may stay in prep; costly core work goes to Core. | design · edit | |
| SES-17 | Never tie a training day to a weekday or build the week around the athlete's sport; give rules (REC-5, REC-6), the athlete places the days. | design · engage · report | |
| SES-18 | A block named for jumps or landings holds a jumping or landing exercise. | design | warn |

### Progression
| ID | Rule | Stage | Check |
|---|---|---|---|
| PRG-1 | Progression is coach-driven from the logs: written once per cycle, changed mid-cycle only on a report (pain, a stall, RPE drift). | design · edit | |
| PRG-2 | Prescribe RPE, never load. The one place a weight may appear is that exercise's Coach's Note, drawn from the athlete's own logs. | design · engage | |
| PRG-3 | No self-progression rules in a programme ("add 2.5 kg when…"): the athlete hits the RPE and logs. | engage | |
| PRG-4 | The card's RPE is the normal target and never moves mid-cycle; a temporary reduction lives in `weekNotes` or a notes card. | design · engage | |
| PRG-5 | Starting lower is written down: the RPE number (6 or more), which exercises, and what returns the athlete to the card. | design · engage | ✓ first cycle · oblig `week1`, `start-lower` |
| PRG-6 | Never a rep range: one rep number on every exercise and circuit item. | design | ✓ (warn in text) |
| PRG-7 | Never tell the athlete the coach sets their weight: progression is the programme changing, driven by what they log. | engage | |
| PRG-8 | The progress-and-regress explainer is mandatory for a new athlete; for a returning one only when the review flags a reason. | engage | oblig `explainer` |
| PRG-9 | Before a logged RPE drives a decision, check the athlete's share of sets logged at RPE 10: new athletes tap the button matching their reps. | report · design | |
| PRG-10 | Outside a VOL-11 cycle, dose follows the adaptation: strength 3–6 reps RPE 7–9; hypertrophy 6–12 RPE 7–9; power 1–5 explosive RPE 6–8; endurance 15+. | design | |
| PRG-11 | Over 30% of sets at RPE 10 in the first ten sessions means that RPE is not effort: write no load note from it. | report · design | |

### Volume & dosing
| ID | Rule | Stage | Check |
|---|---|---|---|
| VOL-1 | A sport athlete's volume is a report (sets, range, verdict); an under-dose on a time-limited client is maintenance, not failure. | design | |
| VOL-2 | Manage load per day: weight sets by cost (heavy compound ×1.5, moderate ×1, isolation ×0.5), undulate the week, avoid back-to-back hard days. | design | warn (flat week, grind, back-to-back) |
| VOL-3 | Hypertrophy runs on about 10–20 hard sets per muscle a week, most of the gain by 10; about 10 direct sets per session at most. | design | warn (over 20; over 10 in a session) |
| VOL-4 | Strength-and-muscle aims: every major muscle clears 10 working sets a week. A sport athlete's build or iron cycle warns under 10. Exceptions: `floor-except:`. | design | ✓ (warn: a sport athlete's build or iron cycle; build or iron on aim general) |
| VOL-5 | A session with real headroom (15 minutes or more) gets low-cost work before the day is called done. | design | |
| VOL-6 | The pattern is deferred, the effort never: a restricted cycle still carries a real strength benchmark. | design | |
| VOL-7 | The shoulder is one group on 10–20 sets: press, side and rear delt together. Scapular retraction counts as back. | design | warn (under 10) |
| VOL-8 | Never more than 4 working sets on one exercise until our own logs prove more; add an exercise instead. | design | ✓ |
| VOL-9 | A rounded-shoulder or forward-head client keeps chest volume low, as a stated exception, never loaded to reach a range. | design | |
| VOL-10 | Count every exercise that loads a muscle (1, 0.5 or 0) from its Spine credits; warm-ups count only core. Both tables go in the log. | design · assemble | ✓ (counted from the Spine) |
| VOL-11 | A new athlete's first cycle, or a first cycle back after 3+ weeks off, has no weighted exercise under 8 reps. Any retest is 8RM. | design | ✓ |
| VOL-12 | Small muscles (biceps, triceps) take 6–12 sets a week in a foundation cycle, more in later cycles. | design · edit | |
| VOL-13 | A missing machine never bends the programme: clear the 10-set floor with what the gym has. | design · edit | |

### Testing
| ID | Rule | Stage | Check |
|---|---|---|---|
| TST-1 | Light testing: an e1RM from the heaviest logged set, tracked cycle to cycle; no separate test day. | design · report | |
| TST-2 | No test goes to a grind: it stops at the first rep that slows, shortens or breaks position. Never a true 1RM. | design · engage | |
| TST-3 | No max-effort set in a first cycle; logs are the baseline. A 5RM retest is one set of 3–5 at RPE ~9, 8RM under VOL-11. | design | |
| TST-4 | A test that goes past the cycle's RPE ceiling is written as a stated exception to it. | design · engage | |
| TST-5 | Flag two or three lifts a cycle for a retest (`test_flag`), never in a first cycle, in pain or with poor technique under load. | design | ✓ (a first cycle; more than 3; a value the app ignores) |
| TST-6 | An e1RM graded Rough is a trend only: never set a starting load from a single Rough estimate. | design · report | |

### Communication & in-app text
| ID | Rule | Stage | Check |
|---|---|---|---|
| COM-1 | In-app athlete text (message, outcomes, notes, completion text) is English. | engage | |
| COM-2 | One WhatsApp handoff message ships with every programme, in the athlete's own language (Farsi: Persian numerals, Persian date first). | engage | |
| COM-3 | Everything an athlete reads sounds like Amir typed it: plain words, short sentences; no em-dashes, semicolons, triads or brochure lines. | engage · report | warn (em-dash, a roadmap semicolon) |
| COM-4 | 5–10 personal Becauses (`why`) a cycle, on exercises chosen for this athlete: the body part not the diagnosis, the next step not the failure. | engage | ✓ |
| COM-5 | Notes name days as Day N and their on-screen names, never internal labels like "the Control day". | engage | |
| COM-6 | Guidance about one exercise is its Coach's Note; notes cards carry programme-wide guidance only. | engage · assemble | warn (flagged vs placed) |
| COM-7 | Coach-facing reports (the volume tables) go to chat and the coaching log, never the app. | assemble | |
| COM-8 | Note bodies are real HTML: 2–4 short paragraphs, a list when the content is a list, one bold phrase per paragraph. | engage | ✓ |
| COM-9 | Every required note is on the spec's `obligations:` list; engage writes those first and tags each card. | design · engage | ✓ |
| COM-10 | Card count is a byproduct: write what is required and what carries weight, never pad. Past 8 cards, say why. | engage | warn (over 8) |
| COM-11 | Celebrate a genuine win each cycle on its own card; never invent one. | engage | oblig `win` |
| COM-12 | A notes card and the matching Coach's Note never repeat: the card holds the protocol, the note the point-of-action detail. | engage | |
| COM-13 | When a cycle turns on body mass, a card sends the athlete to Home → Body Weight in the programme app, never AA Proof. | engage | ✓ (weighing in + Proof) · oblig `weigh-in` |
| COM-14 | A Coach's Note is one to three sentences about this athlete, point first: start weight, limit, kit, checked fallback. Never general how-to, cue or dose. | engage · edit | warn (over 3 sentences or 300 characters) |
| COM-15 | A Because is one sentence of 140 characters at most, written fresh each cycle, never carried over. | engage | ✓ (140 characters) |
| COM-16 | A week note is one or two sentences under ~260 characters, the first the rule under 100; no greeting, no sign-off, said once. | engage | warn (length, label, headline, greeting, sign-off) |
| COM-17 | The handoff message points into the app: each action is a one-line gist plus where it is; never a card's full text. | engage | |

### Coaching cues & the library
| ID | Rule | Stage | Check |
|---|---|---|---|
| CUE-1 | Exactly 3 cues per Spine entry, for anyone: key point, feel or position check, one avoid naming the fault. No side, kit, tempo or dose. | spine | |
| CUE-2 | A programme card carries no cues; what only this athlete needs is the exercise's Coach's Note. | assemble | ✓ |
| CUE-3 | Never create a new pill: qualities come from the ten, patterns from the library's own list. | spine · assemble | part (qualities) |
| CUE-4 | Every programme write leaves the Spine more complete: `/spine` → Upkeep ends every run. | assemble · edit · workout | part (`exId`, Spine gate) |
| CUE-5 | Claude drafts library entries and never approves one; new entries are one approval question to Amir, answered before the programme publishes. | assemble · spine | warn (drafts) |
| CUE-6 | Every Spine entry has steps for anyone: 3–5 one-phase lines (2–3 stretches and conditioning, 6 rack lifts), setup to safe finish, never dose or side. | spine | warn (later ✓) |
| CUE-7 | Say each thing once across seven pieces: purpose, on court, steps, cues (entry); pill, note, Because (card). Existing steps and cues are read, never rewritten. | design · spine · engage · edit · assemble · workout | warn (a note or Because repeating its entry; a pill the entry already says) |

### Chips & modifiers
| ID | Rule | Stage | Check |
|---|---|---|---|
| CHP-1 | No floating text: no grey `setup` line on a programme card; the detail is the Coach's Note (for a circuit item, the circuit's note). | assemble | ✓ |
| CHP-2 | The `intent` pill is from the closed list (hands, lead, intent, hold, brakes, pace), at most two, one per group; never pairing, dose or muscle. | assemble | ✓ (off the list, two in a group, a pairing) |
| CHP-3 | A hold is `rx.tempo: "iso"` with the hold as `rx.time`. | assemble | part (format) |
| CHP-4 | No RPE below 6 anywhere; a note that lowers RPE names the floor of 6 in the same sentence. | design · engage | ✓ |
| CHP-5 | A prescription is the `rx` object: write what is prescribed and omit the rest (absent means not prescribed). Never write `chips[]`. | assemble | part (`chips[]`, two doses) |
| CHP-6 | Say the tempo once, in its cell: never restate it in `intent`, a note or a cue. | design · assemble | |
| CHP-7 | Every working exercise and circuit carries its own rest in `rx.rest`, chosen for that exercise; a prep circuit's can be 30 seconds. | design · assemble | ✓ |

### Process
| ID | Rule | Stage | Check |
|---|---|---|---|
| PRC-1 | A programme run never touches the app: ideas and bugs go to Amir in the handoff. The one outside change is the library. | every stage | |
| PRC-2 | A correction changes exactly what Amir named, and nothing else. | edit | |
| PRC-3 | A roadmap: one pass, then one reviewer from files, every must-fix applied; it locks without Amir's sign-off and is saved to the row at once. | roadmap | |
| PRC-4 | Check the build before engage writes; fix every FAIL. New athletes get one reviewer, and a delta review of any later design change. | design · assemble | |
| PRC-5 | Background agents work from scratchpad files, never the database or an MCP tool, and never launch with placeholder arguments. | every stage | |
| PRC-6 | Ask the database as few times as possible: one context pull, one Spine query, never a lookup per exercise or schema discovery. | every stage | |
| PRC-7 | Every progression gate resolves to a measurement, a film or a third party, never the athlete's word; ask forced-choice questions. | design | |
| PRC-8 | A film gate is real only when a card says what to film, which weeks, where to send it, and what stops without it. | engage | oblig `film` |
| PRC-9 | Stay in scope: symptoms, training data, filmed lifts, body mass. No range-of-motion battery, and no gate on a number you can't interpret. | design | |
| PRC-10 | Keep the monitoring stack small: cut any measure that feeds no gate or deload trigger. | design | |
| PRC-11 | A gate that waits on someone else holds back one variable, never the whole cycle. | design | |
| PRC-12 | Every build ends with a coach handoff: measurements, gates, films, dated escalations and decisions made for Amir, each with its reason. | assemble | |
| PRC-13 | Reassessment is scheduled: every cycle has a set length and a trigger (a primary stalled about two weeks). | design | |
| PRC-14 | The roadmap is 5 cycles of 5 weeks. Deviate only on Amir's word, and say so. | roadmap | |
| PRC-15 | A week note belongs to one week, shows on Home, and its number covers every lift: design sets numbers, engage the words. | design · engage · assemble | ✓ (warn: a scoped number) |
| PRC-16 | One current athlete profile heads the coaching log: intake drafts it, every run keeps it current, and the checker reads it. | intake · design · edit | warn (missing) |
| PRC-17 | The roadmap is written once and locked. A change goes through design's `roadmap_amend:` line at the checkpoint, never a quiet rewrite. | roadmap · design | warn (with PRC-28) |
| PRC-18 | Every cycle's rationale is appended to the coach-only coaching log and never overwritten. | assemble | |
| PRC-19 | An athlete whose cycle ends without a renewal keeps the app and gets no coaching until Amir says so. | every stage | |
| PRC-20 | Cycles continue, they don't reset: read the log and the roadmap, progress the same logic; the latest rationale is the operative one. | design | |
| PRC-21 | No menstrual-cycle phasing. A period-week fallback is used when confirmed with the athlete that cycle, never carried forward on its own. | design · engage | oblig `period` |
| PRC-22 | Athlete first: programming before names, chips and styling. Design flags a needed note (`note_flag`); engage writes it. | design | |
| PRC-23 | Skills cite rule IDs and never restate a rule; a checker message names the rule it enforces. | every stage | |
| PRC-24 | The cycle's `art` headline should be in the week's top two qualities; if not, tell Amir with a recommendation, never add volume for a label. | design · assemble | warn |
| PRC-25 | Rule freeze from 2026-09-26 until eight cycles have run on this pipeline: a new rule only when something breaks, through the index. | every stage | |
| PRC-26 | The Quality mix counts working sets (primary 1, secondary ½), skips prep, and shows nothing under 70% tagged; bedrock, peak and reset have no headline. | design · assemble | |
| PRC-27 | A new athlete's first cycle gets a foundation picture word (bedrock, armour or build), never iron or voltage. | roadmap | |
| PRC-28 | The current cycle's focus names only patterns its build trains; a gap is fixed in the build or by `roadmap_amend:`. | design · assemble | warn |
| PRC-29 | The main conversation talks to Amir and writes the database; each heavy stage runs as a fresh helper, at its own effort, from files. | every stage | |

---

## The stories behind the rules

Each bullet below is tagged with the rule it explains: what it means in practice and its examples.
The dates, Amir's own words and what went wrong are in `../docs/record/COACHING-PRINCIPLES-HISTORY.md` under the
same ID. Read a rule's story and its history before changing it.

## Intake & assessment
- `INT-1` **Intake captures recovery inputs, not just goals.** The volume ceiling needs **sleep,
  stress, nutrition, age and weekly life-load** — *Recovery capacity gates everything* — and
  the web intake form now collects all of them (sleep quality + hours, stress, nutrition,
  weekly life-load, age), so the brief arrives with the full recovery picture.
- `INT-2` **Always take injury history up front.** Ask past injuries, surgeries and recurring pain at
  intake — prior injury is the best predictor of the next one, and it pre-loads the
  contraindications (knee history → reverse lunge, chronic back → trunk-supported hinge). Don't
  wait for pain to surface under load.
- `INT-3` **Trust the bar over the résumé.** Establish baseline numbers early; when stated training age
  and demonstrated capacity conflict (the "4-year pro" with a 40 kg squat), program for what's
  shown and log the hidden weakness as a target for next cycle.
- `INT-4` **Negotiate the minimum effective frequency, but only against a real limit.** If availability
  can't support the goal (strength + power + injury-prevention in 2×30 min/wk), ask for more
  time; if the limit is genuine, reframe the goal honestly rather than promising it on the
  available dose (see *Volume is a report* — under-dose = maintenance, not failure).
- `INT-5` **Know the referral line.** Program *around* minor pain, but a red flag — sharp, persistent,
  worsening, radiating pain, numbness, or a suspected real injury — means refer out to a
  physio/doctor before loading it further. Coaching is not diagnosis.
- `INT-6` **Every athlete with an active injury or a rehab/managed history gets a mandatory
  in-gym pain-management note.** Anyone whose brief carries an injury, a rehab stage, or a
  managed/standing restriction (not just a fresh red flag) must have a note that translates
  "know the referral line" into what *they* actually do mid-session:
  - **What's OK** — normal fatigue/burn/next-day stiffness; keep training through it.
  - **What's not OK** — sharp pain, anything radiating, numbness/tingling, or pain that builds
    through a set instead of staying flat.
  - **A simple stop-rule ladder**: mild + fading → finish the set, note it · building or
    changes how you move → stop that exercise, use the card's fallback, message the coach ·
    sharp/radiating/numb/unfamiliar → stop the session, message before the next one.
  - Ties back to *their own specific restriction* (their actual diagnosis/history), not a
    generic disclaimer. /program-engage PART 3 makes this mandatory — see that skill.
- `INT-7` **Logs are filled in by humans and go stale — confirm before a repeated complaint drives a
  decision.** A pain/cramp/complaint that repeats verbatim across sessions with no other
  corroboration, or that reads inconsistent with the readiness/adherence trend, may be a
  carried-forward log artifact rather than a live issue (it has happened — a verbatim ab-cramp
  note across three sessions turned out to be an unedited log, not a recurring problem).
  /program-design flags it and asks Amir before it drives an exercise swap, a regression, or a
  mandatory note — never silently assumed either way.
- `INT-8` **When a standing issue is confirmed resolved, close the loop — don't let it silently
  vanish.** An athlete who was told to watch something (an injury protocol, a regression) and
  then simply stops hearing about it next cycle may wonder if it was dropped by mistake rather
  than resolved. /program-design flags the resolution; /program-engage writes one genuine
  acknowledgment line (not a full card) — pairs naturally with a wins note when the resolution
  itself is the win.
- `INT-9` **A decision to program AROUND pain instead of referring out needs a DATE and named escalation
  triggers — otherwise it stands forever by silence.** "Coach around it and monitor" is a real
  option, but written without an expiry it is a default, not a decision: nobody revisits it and
  the athlete keeps loading the thing. Write the triggers that override it (night pain, loss of
  range, numbness/tingling, pain arriving *earlier* session to session) plus a hard calendar
  checkpoint — typically ~6 weeks of genuine offloading — at which it goes to a clinician
  regardless of what the athlete says or wants.
- `INT-10` **For an athlete who hides pain, show the MODIFICATION MENU in writing before they have anything
  to hide.** They under-report because they believe reporting costs them training or match time.
  Hand them up front exactly what happens to a session when each symptom is reported — reporting
  always buys a **modification, never a ban** — then demonstrate it once, deliberately, early. It
  is the only countermeasure that fixes the cause rather than policing the symptom, and it makes
  every other monitoring measure cheaper.
- `INT-11` **Confirm the form's frame before anything is planned.** The form is a snapshot, and athletes tell Amir things it never sees. Before the roadmap, put one question to him with the form's days a week, session length and kit, and ask what the athlete asked him directly (conditioning, a lift, an event). The roadmap waits for the answer. A first cycle was once built and locked for 2 gym days when the athlete wanted 3 with conditioning, and the change arrived after the build: a second spec, two rebuilds and a roadmap still arguing from 2 days.

## Exercise selection
- `SEL-1` **SFR leads for general-fitness clients.** Pick the highest stimulus-to-fatigue option
  per pattern: Machine Shoulder Press > DB OHP · Leg Press > Back Squat · 45° Back
  Extension > Barbell RDL · Chest-Supported Row > Barbell Row.
- `SEL-2` **Sport-performance athletes: transfer can override SFR** — state the trade-off
  explicitly (e.g. Back Squat over Leg Press for a tennis player: lower SFR, higher
  athletic transfer).
- `SEL-3` **Hypertrophy-accumulation blocks: machine/SFR primaries are acceptable even for sport
  athletes** — transfer isn't lost, it's deferred to the later power/translation cycle
  (e.g. Leg Press over Back Squat for a tennis player in a mass block).
- `SEL-4` **Accessories rotate every cycle, BY VARIANT.** The new pick is the same movement
  pattern on a different implement, stance, angle or grip (the Spine entry's **Alternatives**), or its
  **Progression** when the athlete has earned it: a DB row becomes a chest-supported or cable row, a
  goblet squat a heels-elevated goblet squat. It reads as new to the athlete, keeps the movement skill
  and keeps what their logs already know. **A variant of a movement the athlete has logged is not "new
  to the client"**, so it may be supersetted from Cycle 2 (Session structure & time). A genuinely new
  pattern is still fine when the athlete needs it; it just runs as straight sets its first cycle.
- `SEL-4` **Accessories rotate every cycle** for variety — always to a *safe* alternative. **The goal is
  perceived novelty, not physiological necessity** — the athlete should feel the program changed,
  even when a new superset/format pairing is the bigger stimulus change that cycle. Don't skip
  rotation "because the format already changed enough"; that reasoning has to be an explicit,
  stated exception if used, never a silent default. Exception: an isolation slot with no genuine
  SFR-equivalent alternative in the library (e.g. Leg Extension for direct knee extension) can
  stay — say so, don't force a worse substitute just to rotate.
- `SEL-5` **Conditioning-circuit/finisher exercises rotate for real variety too — not just accessories.**
  Kettlebell Swing, Medicine Ball Slam, and Farmer's Walk had become the default finisher on
  cycle after cycle, across different athletes — read back to back, every program sounded like
  it only knew three exercises. Circuit/finisher slots get the same rotation discipline as
  accessories: genuinely different equipment and movement patterns each time (loaded carries,
  battle ropes, rowing, sled work, renegade rows, overhead carries — not just a new rep scheme
  on the same three moves), picked for what the athlete's equipment/goals/injury history
  actually support.
- `SEL-6` **Rehab/corrective:** keep the best-in-class pieces; rotate the rest for freshness.
  (Coach may elect to rotate the whole block — done for Athlete D C3.)
- `SEL-6` **The "keep best-in-class" exception above is for rehab/corrective work only.** Don't stretch
  it to general accessories just because their load is progressing well on paper — that kind of
  progress is invisible to the athlete; new movements are what read as forward motion, and she's
  paying monthly expecting to feel it.
- `SEL-7` **Anything genuinely kept must still show a visible dose progression — never re-ship an
  identical prescription cycle to cycle.** Rotation isn't the only lever: a kept exercise's sets,
  rounds, load, or difficulty should move. Athlete B C2 initially re-shipped Medicine Ball
  Rotational Slam and Assault Bike Intervals with the exact same numbers as Cycle 1 — caught on
  review, not by design.
- `SEL-8` **A fresh-exercise swap must fit the athlete's demonstrated capacity, not the most
  advanced-sounding progression.** Nordic Curl and Depth Jump to Box were both proposed as
  Athlete B C2 swaps and both rejected as too advanced; Stability Ball Leg Curl and a lower-box
  Single-Leg Box Jump were the right calibration. Same logic as "Trust the bar over the résumé"
  (Intake & assessment) — program for what's shown, not what sounds impressive.
- `SEL-9` **Knee-history clients:** reverse lunge over forward lunge; reintroduce plyometrics
  with stick-landings / step-downs; lateral bounds are the highest-risk item — ramp last.
- `SEL-10` **Chronic-back clients:** lead the hinge with trunk-supported options (45° Back
  Extension + Hip Thrust) and defer the loaded *free* hinge (barbell RDL/deadlift) one
  cycle — build the brace first, then load the free pattern (the brace is its permission
  slip). Also high-SFR, so little stimulus is lost.
- `SEL-10` **Chronic-back clients: AXIAL loading defers a cycle too, not just the free hinge.** The
  first cycle runs a supported knee-dominant primary (Leg Press / Hack Squat) instead of the
  Back Squat; the squat re-enters the next cycle only after a fully pain-free one. Same logic
  as the hinge rule above — the pain-free cycle is the permission slip, and SFR means almost
  nothing is lost by waiting. Applies to the *fallbacks* too: don't let a fallback quietly
  re-admit the free pattern the cycle deferred.
- `SEL-11` **A RANGE OR HEIGHT RESTRICTION MUST BE AUDITED AGAINST EVERY EXERCISE IN THE CYCLE, INCLUDING
  WARM-UP AND PREP — not just the ones it obviously names.** A rule like "nothing above shoulder
  height" or "no end-range lumbar flexion" is written once against one lift and then silently
  broken by movements nobody thought to re-check: a lat pulldown and an overhead Y-raise both
  START in the banned position, a lateral raise "capped at shoulder height" stops the athlete
  dead in the middle of the painful arc rather than below it, and a Cat-Cow in the prep circuit
  cues the exact end-range flexion the primary's own note forbids. Two lines of a programme must
  never give opposite instructions for the same joint. Sweep the restriction across every
  movement, its steps and cues, and every prep item before the spec is final. The Spine's steps are
  written for anyone, so a step that takes this athlete past their limit (down to the floor when they
  stop at a box) gets a Coach's Note that says what changes (CUE-7). If no exercise in a pattern can
  satisfy it, the PATTERN leaves the cycle rather than the rule bending.
- `SEL-12` **The fallback rule above generalises: EVERY fallback is checked against EVERY deferral the
  cycle makes, not just the free hinge.** A fallback is written as an afterthought ("if the
  station is busy") and is the easiest place for a banned pattern to walk back in — the athlete
  follows it unsupervised, on a busy day, with no coach present. Machine Hack Squat shipped as
  the leg-press fallback in a cycle that had removed axial loading entirely: shoulder pads are
  axial load, so a full gym sent a chronic-back athlete straight onto the thing the cycle
  existed to avoid. Read the fallback list last, against the contraindication list, every time.
- `SEL-13` **Posture / tennis clients:** horizontal-press volume deliberately low or omitted;
  bias posterior chain + scapular health.
- `SEL-14` **No corrective/postural drills without an indication.** Postural or scap-control
  correctives (scapular wall slides, postural-specific work) only go in when the athlete
  has a *noted* posture issue/restriction. For a general client with none, prep is
  mobilisation + activation of the day's patterns — not corrective theatre. (General
  shoulder mobility/activation before pressing — band pull-apart, pass-through, cat-cow —
  is fine; it preps the lift, it doesn't "fix posture.")
- `SEL-15` **One exercise appears ONCE per cycle — never the same movement on two different days.** If a
  muscle needs more volume than one slot carries, add sets to that slot, or find a different
  movement for the second exposure. Repeating the exercise across days reads to the athlete as the
  program repeating itself, wastes a rotation slot, and hides the fact that the movement pool for
  that muscle has run out — which is information you need, not something to paper over.
- `SEL-15` **One-exercise-once-per-cycle applies to WORKING exercises only** (Primary / Accessory / Core /
  conditioning). **Activation & Prep items may repeat across days** — a primer's job is to prime
  the day's patterns, so repetition there is the point, not program repetition.
- `SEL-16` **A missing demo video NEVER shapes the prescription — Amir adds URLs manually.** Prescribe the best movement for the athlete, always; don't downgrade a choice,
  substitute a lesser exercise, or hedge because an exercise has no video yet (videos live on the
  Spine entries since 2026-09-26, and Amir adds them in coach.html → Exercises).
  Off-library picks are normal and expected — follow the naming convention, and since 2026-09-25
  the new exercise joins the Spine in full in the same run (Exercise naming, below). Extends "the library is a video-join key, not a whitelist" (Exercise naming) from
  permission into a standing instruction.
- `SEL-17` **A removed exercise stays removed unless re-earned.** When something is dropped for dislike,
  inability, or pain, record *why* in the coaching log — and don't reintroduce it next cycle
  without a real reason and evidence the athlete has earned it back (pain resolved, capacity
  built). The log is what stops a bad fit silently reappearing months later.
- `SEL-18` **The Assault Bike is NOT a neutral warm-up — it is banned as the general raise for any
  flexion-sensitive back.** It seats the lumbar in flexion and cycles it under reciprocal arm
  drive, so five minutes of it at the top of every session is repeated low-load lumbar flexion
  on exactly the athlete who must not have it — roughly 75 minutes of it across a cycle, before
  a single working set. Low-load repeated flexion is the classic disc-symptom provocateur; the
  mechanism does not need a heavy load to matter. Use an **incline treadmill walk** (or an
  upright bike set high enough that the hips stay above the knees and the torso stays tall)
  instead. Same failure shape as the Cat-Cow precedent (2026-08-17), one scale up: the warm-up
  is where a cycle's own contraindication is most likely to be broken, because nobody re-reads
  the prep block against it.
- `SEL-19` **A loaded carry's PICK-UP is a free hinge — spec the pick-up, not just the carry.** Any cycle
  deferring the free loaded hinge must say where the weight is lifted from: a bench or a rack pin
  at hip height, never the floor. A 3-set suitcase carry is six loaded single-arm pick-ups and six
  set-downs per session, at a grip-limiting load, usually in the last block when she is tired — an
  offset free hinge, unsupervised, and typically the only rep in the program with no instruction
  attached to it. The exercise's own cues describe the walk; nobody writes a cue for getting the
  thing off the floor. Since 2026-10-11 the entry's steps say how anyone picks it up and sets it down
  (CUE-6); while the free hinge is deferred, the Coach's Note says where THIS athlete picks it up instead,
  because it changes a step (CUE-7). Extends "audit the restriction against every exercise, including warm-up
  and fallbacks" (2026-08-17) to the parts of an exercise nobody thinks to write down.
- `SEL-20` **One same-pattern fallback per primary, named in the spec.** For pain or a busy station, so the athlete never improvises a swap. A fallback is also where a banned movement hides, which is why the checker scans every `fallback:` line (SEL-12).
- `SEL-21` **Kit is confirmed, not assumed.** Every piece an exercise needs is on the athlete's equipment list, or it is named in the checkpoint question so Amir can confirm it. A 'full gym' covers benches, racks, cables and its machines, never a trap bar, a landmine, a stability ball or an air bike. The checker lists what is not on the list. One first cycle shipped a stability ball leg curl to a gym with no ball, and the athlete found out mid-session.

## Exercise naming
*(This is the single source of truth for exercise names — `/program-design`,
`/program-assemble`, and `/program-edit` all defer here; none should restate the rule.)*
- `NAM-1` **Word order = `[modification] [equipment] [movement]`** — modifications first
  (stance / unilateral / defining setup), then equipment, then the movement. E.g.
  "Standing Dumbbell Shoulder Press", "Chest-Supported Dumbbell Row", "Single-Arm Cable
  Row".
- `NAM-2` **Equipment in the name only when the move has multiple implements** (cable / dumbbell /
  barbell / machine / kettlebell); omit when equipment-agnostic.
- `NAM-2` **Bodyweight moves take the bare movement — no "Bodyweight" prefix** (Reverse Lunge,
  Lateral Lunge, Glute Bridge — not "Bodyweight Reverse Lunge").
- `NAM-3` **Defining setups DO belong in the name** (Chest-Supported, Heels-Elevated,
  Half-Kneeling, Incline, B-Stance, Bottoms-Up, Single-Arm, Single-Leg).
- `NAM-4` **Never in the name → these go in the prescription, the pill or the Coach's Note:** grip ·
  focus/intent · range qualifier · tempo emphasis · holds/durations · bare digits · parentheses ·
  colons · commas. (A 30s plank → `rx.time: "30s"`; a hold → `rx.tempo: "iso"`; a grip, a lead side
  or one intention from the list → the `intent` pill, CHP-2; anything else for this athlete → the Coach's Note. `chips[]` is
  legacy and never written: SCHEMA.md → `rx`.) **Exception — digits in an established/canonical name stay** (45° Back
  Extension, 90/90, B-Stance); don't mangle them.
- `NAM-5` **A grip is the card's pill, never the name** (e.g. Lat Pulldown + `wide grip`; Chin-Up). Keeps card
  titles clean and stable. **And never free text either:** on an `rx` card it is the `intent` pill
  (`"intent": "neutral grip"`), never the grey `setup` line and never words in the Coach's Note.
  **The grip pill belongs to the athlete, on their card.** The entry's steps may name the default grip in plain
  words (*"a dumbbell in each hand, palms facing you"*, CUE-6), so an athlete with no video and no pill still
  knows how to hold the weight; a grip pill on the card overrides it. A grip never goes on the entry as a pill.
- `NAM-6` **A variant that changes the exercise is its own exercise**, with its own name, its own library
  entry and its own steps and cues, never the parent exercise with a note or a chip. Short-Lever Copenhagen
  Plank is not Copenhagen Plank + "short lever".
- `NAM-7` **An isometric hold on a dynamic library exercise KEEPS the canonical library name —
  the video stays; the tempo cell and a hold pill carry the hold.** Amir's ruling (2026-07-24,
  Athlete I C1): a rename-to-"…Hold" was tried (it breaks the video join) and he reverted
  it — the machine-setup video is still worth having, and the execution change is
  communicated by the hold time (`rx.time`), `rx.tempo: "iso"` (the TEMPO cell reads
  **Hold**, so the card already says it's one continuous hold; CHP-3) and a hold pill that says
  where (`hold at the top`, `mid-range hold`, `hold at 90°`; CHP-2). The Coach's Note adds only
  what is about this athlete (COM-14). When telling Amir about a
  program, point at where the isometric lives (exercise + day) rather than assuming the
  card reads as one. Longer-term option stands: add a dedicated isometric (Wall Sit,
  Spanish Squat…) with its own video to the Spine and rotate it in.
- `NAM-8` **The Spine is the source of truth for names and videos.** Author each exercise to its
  entry's name, exactly; `/program-assemble` Step 4 normalizes misses, and every card carries
  its entry's `exId`. **One name** (Amir, 2026-10-09): the Spine carries no aliases, a card never
  keeps a second spelling, and a card that is a different version of an entry (other equipment or
  setup: bodyweight vs Dumbbell, Banded, Leaning, Single-Arm, Half-Kneeling, Smith) is its own entry
  under its own name. A rename in a LIVE programme moves the athlete's logged history with it, or
  Last time and Records lose the lift (the app joins history by name).
- `NAM-8` `NAM-9` **The library is a video-join key, not a whitelist — programming is never restricted to what's
  already catalogued.** Pick whatever real movement is right for the athlete; a new one joins the
  Spine in the same run and ships without a demo video until Amir adds one in coach.html →
  Exercises (the app handles a missing video gracefully — no play button, nothing breaks). Follow
  the naming *convention* above regardless of whether the name is already catalogued. A missing
  video is covered by the entry's steps (CUE-6), never by how-to in a Coach's Note.
  ⚠ **Since the Spine (2026-09-24) the card's cues come from the library**, so a newly prescribed
  exercise is ADDED to the library in the same run, in full: its steps, its three cues and every detail
  the existing entries carry (purpose, on-court line, body parts, qualities, links both ways). Never
  swap the movement out because it has no entry. Only an approved entry reaches the phone, so the
  new entries are the one approval question in the handoff.
- `NAM-8` **The app resolver normalizes case/punctuation/accents** as a safety net, so minor
  drift still finds the entry and renames don't break old programmes — but
  word/digit/possessive differences (Leg Press vs Machine Leg Press, Farmer vs Farmer's)
  need the entry's name on the card (aliases were retired on 2026-10-09).

## Recovery & autoregulation
- `REC-1` **Recovery capacity gates everything** — set the weekly volume ceiling *before*
  choosing session count.
- `REC-2` **Readiness changes the day in three ways, and never the programme.**
  Cards are prescribed by RPE, so a bad day already means a lighter weight at the same RPE. The rule
  moves what RPE does not: effort, sets and impact work.
  - **Two signals.** Sleep, energy, stress and overall move together (across 348 answered check-ins,
    overall tracks energy r .77, stress .55, sleep .49); their mean is the day's score **S**. Soreness
    barely tracks any of them (r .12 to .28), so it moves impact work only. **B** is the athlete's own
    mean S over their last 10 check-ins, used once there are 5.
  - **Amber**: S 2.5 or lower, or at least 0.75 below B. 1 off every RPE, circuit rounds included,
    never below 6; the same sets, reps and order.
  - **Red**: S 2.0 or lower, or sleep, energy, stress or overall at 1. Amber, and the session is the
    warm-up, the first power move and the first primary lift (all its sets); the rest is optional,
    cut from the end. A day with no Primary block: the warm-up and the first working block.
  - **Sore**, on any level: soreness 2 or lower. Plyometric and landing items (the Spine's `impact`)
    at half the sets, rounded down, at least one; at 1, skipped. Lifts are unchanged: a sore muscle
    can still be lifted, and RPE already regulates it.
  - **Never** below RPE 6 (CHP-4), below the warm-up and the minimum dose, or an edit to the card
    (PRG-4). Week notes and readiness do not stack: a week note's limit is already the target on every
    day of its week (PRC-15), a lower day moves only what is still above it, and the lower target wins,
    floor 6. A flagged retest (TST-1) waits for a green day. The athlete may always train as written, and
    that choice is logged. Training as written undoes the check-in, never the week note's limit.
  - **A run of low days is Amir's call, not the rule's**: three amber or red check-ins in five, or
    stress 2 or lower on three of five (REC-3, PRG-1).
  - **Why these numbers.** Simulated on 348 answered check-ins (27 athletes, April to September
    2026), something changes on about 1 in 6: amber 6.9%, red 2.9%, sore 8.9%. "Any answer at 2 or
    lower" was rejected because it fires on 26.7%. The fixed 2.5 alone never reached 14 of 20 regular
    athletes, which is why B exists. The direction of each change is evidence-led (cut volume before
    intensity: Bosquet 2007, Spiering 2021; stopping further from failure costs little strength:
    Robinson 2024, Grgic 2022; soreness lowers jump output: Byrne & Eston 2002, Cheung 2003; sleep
    loss: Craven 2022). Every threshold is judgement: review them at the PRC-25 eight-cycle review.
  - The app applies it since 2026-09-26 (program.html → *Today's targets*: the day's level is set at
    the check-in and the cards show today's numbers); the notes card tagged `low-readiness` says the
    same thing in the athlete's words, and stays.
- `REC-3` **Separate training fatigue from life load** in every review — a readiness dip from
  poor sleep/stress is not the same as training fatigue (Athlete D's end-cycle dip was
  life, not load).
- `REC-4` **No two slow weeks in a row** (2026-10-19; until then every cycle's last week was a
  back-off). Week 1 of every cycle is already slow: the athlete finds weights on new and rotated
  exercises (SEL-4), and a new athlete or one back from a layoff has a week 1 note (PRG-5). A back-off
  on the final week put a second slow week straight before it, for no reason. So the final week
  trains as written, and the next cycle's week 1 is the reset. Two exceptions:
  - **A competition Amir named** (SES-8) that the cycle ends into: the final week tapers into it.
    Design writes the spec's `taper:` line (the competition and its date) and the dose as numbers,
    engage the words, and the note needs no title (the app calls an untitled final-week note the
    *Back-off week*). A competition inside a cycle gets a titled lighter week before it instead (PRC-15).
  - **Retests:** a final week that holds the cycle's retests (TST-5) may cut volume on some lifts so
    the tests go in fresh. It is a titled *Testing week*, and the cut is words with no number, because
    a number covers every lift (PRC-15). The other lifts train as written.
  - A fatigue wall mid-cycle is still read from the logs (Athlete D ran 4 sessions in 5 days in C2
    and hit one): a titled lighter week where the logs show the need (PRC-15), never a default.
  - `scripts/check_program.py` fails a `taper:` cycle with no back-off on its final week. With no
    `taper:` line it warns on a number on the final week's note, and on a final-week note when no
    lift is flagged for a retest. Cycles already published keep the back-off they were written
    with; the rule applies from each athlete's next cycle.
- `REC-5` **Concurrent athletes (heavy sport schedule alongside the gym) always get a double-day
  rule in autoregulation.** When most gym days will also be sport days, the program must say
  what to do on one: gym after the sport session, or at least 4–6 h apart; if the gap is
  impossible, run the minimum effective dose with the primary capped at RPE 6. Silence on
  double days is a design gap, not a detail — at 5–6 sport days/week they are the norm, not
  the edge case.
- `REC-6` **High-stress and concurrent athletes also get a flexible session order.** The minimum dose that used to come with it now belongs to every athlete's red day
  (REC-2).

## Session structure & time
- `SES-1` **`workouts.days[]` is authored in the best execution order.** The order days appear in
  the app IS the recommended weekly sequence (e.g. Lower → Upper → Walk-Run → Control →
  Recovery) — the athlete reads the week top-to-bottom, then the notes tell her she may
  shuffle around her schedule (within the stated invariants). Never list days in
  design-convenience order and rely on a notes card to re-map them.
- `SES-1` **An OPTIONAL day still sits in its correct place in the week — you mark it optional, you
  don't move it.** Optionality is a label on the day, never a reason to demote it to the end of
  `days[]` or to order the week around the loaded days alone. Author every day in the best
  execution order — restoration/recovery days included, since *where they fall between loaded
  days* is the whole point of them — then write "optional" on the ones that are. A restoration
  day parked after the last lifting day reads as an afterthought and loses the spacing it was
  designed to provide.
- `SES-2` **A day trains what it says it trains — upper work on upper days, lower work on lower days.**
  Never sprinkle a muscle onto the wrong half of the split to top up its weekly total. The day's
  identity, its prep circuit and its fatigue profile are all built for one half of the body, so a
  stray delt raise on a glute day is warmed up by nothing and lengthens a session that was already
  dosed. If a muscle is under its target, add the volume on the days that actually train it.
- `SES-3` **Warm-up + preparation is always 10–15 minutes** — never a token 5-min cardio bookend.
  The full prep (cardio raise + mobilisation/activation circuit) should occupy 10 min
  minimum, up to 15. This is programmed time, not filler: it primes the patterns trained
  that session and is part of the dose.
- `SES-4` **What goes in a warm-up.**
  - **A gym client warms up on a machine** (bike, treadmill or rower, easy pace), never a walk, a
    march on the spot or arm swings. Equipment-free warm-ups are for home and bodyweight programmes.
  - **No joint-isolation drills in a STRENGTH session's prep**: no CARs, hip or leg circles, or
    anything cued "isolate the joint". Use a movement that mobilises, activates and rehearses the
    day's pattern (reverse or lateral lunge, Cossack squat, World's Greatest Stretch, band
    pass-through, band pull-apart; Cat-Cow only where the back allows flexion). Running, speed and
    change-of-direction warm-ups are different: leg swings, skips and running drills belong there.
  - **Movement drills (skips, shuffles, cone work, sprints) are not gym-session filler.** They belong
    on the outside or court day, or in its warm-up, not in a strength day's prep.
- `SES-5` **Warm-up / prep logs nothing — and carries no RPE.** A circuit in a prep block logs nothing
  (the block title decides since 2026-09-15: SCHEMA.md → "Circuit logging"), and a warm-up
  `simple` item (bike, treadmill, mobility drill) carries only its dose, `rx.time` or `rx.reps`,
  with **no `rx.rpe`**. An RPE on a warm-up is noise; the pre-session readiness check already
  captures how the athlete feels. RPE on a `simple` item is reserved for a genuinely
  effort-graded piece (a cool-down jog, a conditioning finisher), never the warm-up.
- `SES-6` **A lifting day's prep is a machine raise plus ONE prep circuit of two rounds** (Amir, 2026-10-11:
  "I want my lifting day preps to be a circuit, because we don't need much rest"). The raise is a `simple`
  item (bike, `rx.time`); the movements are the circuit's `items`, one `rx.reps` (or `rx.time`) each, with
  `rx.rounds: 2` and the circuit's own rest (CHP-7, 30 s is enough). Never the same movements as separate
  `simple` cards with `sets`: that made the athlete tick every set of a warm-up like a lift (Pooya's Cycle 5
  was built that way, and 33 of 36 live programmes already had the circuit). A lifting day is a day with a
  Primary block; repeating a short list twice reinforces the pattern before loading it. A prep circuit
  before a *cardio/running* session builds progressively through **more distinct movements in a single
  pass** (mobility → activation → dynamic movement → plyo/stride primer) rather than repeating the same
  short list twice: that progression is the point, not the rep count.
- `SES-7` **Time-limited clients (esp. tennis): cap sessions ~45–50 min.** Power work (low volume,
  long rest, few reps) is naturally shorter and fits the constraint. Only for a
  REAL limit: see the next bullet.
- `SES-7` **The session length on the intake form is a starting guess, not a limit.** Athletes who write
  "I only have 60 minutes" routinely spend 75 in the gym and never complain, which means they
  could do more. Design to what the logs show (the real minutes per day), not what the form says,
  and never cut useful work to fit a stated cap. A cap binds only when there is a real hard stop:
  the athlete says so plainly, the logs show sessions cut short, or they complain about length.
  When a design runs past the form's number, say the expected real length at the checkpoint and
  move on.
  **A new athlete has no logs yet: design to the form's minutes plus 15** (Amir, same day,
  "form + 15"), unless they said plainly that the time is a hard stop.
- `SES-8` **No competition calendar unless Amir names one.** Design the 5×5 arc straight through; if an
  athlete has tournaments or a season that should bend it, Amir says so. A cycle that ends into one he
  named tapers on its final week (REC-4); with none named, no week is a taper.
- `SES-9` **Sequencing:** power/CNS → primary strength → accessories → corrective/core.
- `SES-9` **Standard section (block) names** — Activation & Prep → [power] → Primary → Accessory →
  Core → [conditioning]; use these so the app's section headers stay consistent across
  athletes (Core holds all core work *including bracing/anti-movement & carries*). The full
  list with order + holds + icons lives in **SCHEMA.md → "Standard section names"** (single
  source — don't re-enumerate it here).
- `SES-10` **Superset non-competing pairs** to save time.
- `SES-10` **Never superset a unilateral (two-sided) Primary lift with anything else** (Split Squat,
  Single-Leg Hip Thrust, Single-Leg RDL, and similar main lifts done Each Side/Each Leg). A
  unilateral Primary already costs roughly double the per-set time and fatigue of a bilateral
  one (both sides land inside the same set) — before adding a second exercise. Primaries are
  also the exact lifts Amir tracks e1RM/RPE progression on cycle-over-cycle, so pairing one
  dilutes that read and rushes the side that most needs full attention and full rest. Keep
  every unilateral Primary on independent straight sets, same as a bilateral one. This is
  scoped to the **Primary** block specifically — a unilateral **Accessory** exercise (e.g.
  Single-Arm Dumbbell Row, Single-Leg Glute Bridge) can still superset per the normal
  non-competing-pair rule above; accessories aren't progression-tracked with the same rigor
  and the time-saving trade-off is the whole point there.
- `SES-11` **No supersets in an athlete's first cycle, or on any exercise new to that client** (even in
  a later cycle). **A variant of a movement they have already logged is not new** (accessories
  rotate by variant, see Exercise selection, 2026-09-26), so from Cycle 2 a rotated accessory can be
  paired. Pairing two not-yet-calibrated loads/movements adds logistics friction
  exactly when you need clean baseline data — run straight sets with independent rest until
  each movement has at least one cycle of logged working weights, then superset from there.
  ⚠️ **The friction is concrete: a circuit logs ONE weight per exercise for the whole block and
  ONE RPE per round, so a first cycle spent inside supersets produces no per-set progression
  record at all** — and the next cycle, whose whole job is to load off those numbers, has
  nothing to load from. It also hides an over-cap effort, because a shared round-RPE can't say
  which of the two lifts is the one running hot. **This applies to a mid-cycle restructure too,
  not just the original build** — merging two already-running straight-set exercises into a pair
  destroys the resolution they were already giving you.
- `SES-12` **A superset pair is authored as ONE `type: circuit` entry — never two `"standard"`
  exercises each carrying a `"superset"` chip.** The chip-based version breaks the entire
  point of a superset: each `"standard"` exercise gets its own independent rest timer, so the
  athlete does all of exercise A's sets first (resting between each), then starts exercise B —
  not alternating with one shared rest — and there's no card grouping to show the two
  exercises are even paired. Name the circuit descriptively (`"Push-Pull Superset"`, `"Arm
  Superset"`), never a generic `"Superset A/B"` — the block's name is what communicates the
  pairing. See SCHEMA.md → `"circuit"` type ("Common mistake") and `/program-assemble`
  SKILL.md → "Set type from the design category."
- `SES-13` **Round-format circuits log load** — any superset / complex / conditioning circuit in a
  working block gets an inline weight field *per exercise* + one RPE *per round* (each exercise
  its own weight; the RPE rates the whole round). A circuit in a **warm-up / prep** block logs
  nothing (the pre-session readiness check covers feel). Since 2026-09-15 the **block title
  decides**, so neither needs a flag: `"warmup": true` is back-compat only, and
  `"logWeight": true` is for a genuinely loaded primer in a prep block. See SCHEMA.md → "Circuit
  logging".
- `SES-14` **A library session is as hard as its adaptation needs — it is never capped or softened by a weekly
  budget.** A library athlete opens ONE session, not a week, so "two hard sessions a week in total"
  protects nobody and only waters down the card that has to be hard. Set intensity from the quality being
  trained (aerobic base RPE 6 · threshold 7-8 · repeat sprints 9) and write **no per-week count into any
  library file**. What stays is spacing that comes from **tissue cost**: 48 hours clear of another hard
  session, and not the day before a match.
- `SES-4` /program-edit's Rules 1–1c are this rule's worked list: what leaves gym prep (skips, shuffles, agility and sprint work, a box step-up used as a drill), what stays (bodyweight squats, lunges and bridges in a prep circuit; a box step-up as a loaded, logged lift) and what replaces a joint-isolation drill (a movement that primes the day's pattern).
- `SES-9` Never collapse Primary and Accessory into one "Strength" block.
- `SES-15` **Seven or more working exercises make a day a grind.** A long session spikes fatigue even at low RPE, which matters most for poor-recovery clients (VOL-2, 2026-06-19).
- `SES-16` **A low-load brace primer may stay in prep.** A dead bug or bird dog before a heavy hinge primes the brace; costly core work (planks for time, Pallof presses, hollow holds) goes to the Core block (SES-9). The primer still counts toward core volume wherever it sits (VOL-10).
- `SES-17` **The athlete places the days; the programme never does.** Day 1, 2 and 3 are an order, not dates. No card, week note, WhatsApp message or cycle report ties a training day to a weekday ("Day 3 on Thursday"), and no question asks for the athlete's sport schedule in order to fit the gym around it. That holds for every sport. What the athlete gets instead are rules he applies himself: the double-day rule (REC-5), the flexible order (REC-6) and the readiness levels (REC-2). A weekday pattern in the data, such as a short night before one session every week, is noted coach-only, and its fix is one of those rules, never a schedule.
- `SES-18` **A block's name is a promise.** A block called Land & Launch or Jumps holds at least one exercise the Spine files as plyometric or landing; otherwise rename the block or change the exercise. The check reads the Spine's impact, so an entry filed wrongly fools it: the reviewer still reads the steps.
- `SES-4` **The roadmap too.** A focus line that names shuffles, cone or ladder work, or change-of-direction and braking drills, puts court work into a gym cycle: the checker flags it when the roadmap is drafted.

## Progression (coach-driven)
- `PRG-1` **Progression is coach-driven from the weekly logs** — the app shows one prescription
  per exercise, so the program is a starting point Amir adjusts each week.
- `PRG-1` **Set increments from logged data** (RPE/RIR, bar speed), not guesswork.
- `PRG-1` **Write once per cycle; adjust only on a report.** The program is authored once at design;
  mid-cycle changes happen only when a session report / check-in gives a reason (pain, a
  stall, flagged RPE drift) — never routine tweaking for its own sake.
- `PRG-2` **Prescribe RPE, never load — with ONE exception: the exercise note.** Chips, cycle notes
  cards, messages, and completion text never contain target weights or kg increments — the
  athlete picks whatever load lands at the prescribed RPE. The one place load guidance may
  appear is that exercise's own `note` field (see *Communication*): a starting-weight
  suggestion drawn from the athlete's own past logs, or how to find it, framed around the RPE (COM-14).
  Coach-side load targets stay in the coaching log.
- `PRG-1` `PRG-3` **Mid-cycle adjustments are report-driven only.** No self-progression rules in the program
  ("add 2.5 kg when you complete all sets…") — Amir adjusts from the weekly logs and check-ins
  when something is reported. The athlete's job is to hit the RPE and log.
- `PRG-4` **The RPE printed on a card is the athlete's NORMAL working target and never moves mid-cycle
  — every temporary reduction is explained in the notes, never baked into the prescription.**
   Week-1 calibration and a taper before a competition (REC-4) are the cycle's **`weekNotes`**, which the
  app shows during that week (2026-09-26, Amir: *"update the app in a way that it can show first
  week or last week"*); a low-readiness day, a medication change, a period week are
  **notes-card instructions to the athlete**. None of them is a lower number authored onto the
  exercise. In a week whose note sets an RPE limit, the app colours every logged RPE against that
  limit on every day, and the card still prints its own number (PRC-15, 2026-10-12).
  The card is a stable reference she reads all cycle;
  rewriting it for a temporary condition breaks the week-to-week progression read (a logged
  RPE 6 then means two different things) and forces a mid-cycle edit the program is not
  supposed to need. A genuinely light day in the design — an undulation choice, a low-CNS
  accessory — is different: that IS its normal target and belongs on the card.
- `PRG-5` **The other half of that rule: if the athlete has to START lower, the notes MUST SAY SO —
  and say the number.** The card carrying the normal target is only safe when something
  actually tells her to hold back; otherwise a returning, detrained, deloading, injured or
  brand-new athlete reads RPE 8 on day one and takes it literally. Silence is the failure
  mode, and a card that merely teaches load-finding ("start under what you think and let the
  first set tell you") is NOT that instruction — it explains *how* to pick a weight, never
  that this week's effort ceiling is lower. Whenever the design read says start lower, write
  it where she will meet it: week 1 is its week note (with `rpeCap` or `rpeDrop`), and a
  longer start-lower, like a staged return, is a notes card. Either way it names: **the reduced
  RPE as an actual number** (≥6 — see the RPE-floor
  rules in "Chips & modifiers"), **which exercises it applies to**, and **what moves her back
  to the number on the card**. A week note's `rpeCap` or `rpeDrop` covers every lift that week
  (PRC-15), so a limit on only some exercises names its number in the note's words, with no
  `rpeCap` or `rpeDrop`, or goes on a notes card. Triggers: a layoff or detraining, week-1 recalibration, a
  deload/back-off week, a movement new to the client, a staged return from injury, a period
  week.
- `PRG-6` **Never prescribe a rep range — always a single rep number.** The app has no rep-range
  field; it prescribes exactly one number per exercise (e.g. `×10 Reps`, never `×8–10 Reps`).
  When the design intent is naturally a zone (hypertrophy 8–10, etc.), /program-design writes the
  one number it means; nobody downstream picks an end for it. This applies to
  every exercise on every day, including circuit items and unilateral (`Each Side`) reps.
  **Reconfirmed 2026-09-24** (Amir: *"I don't prescribe rep ranges"*), after a 2026-09-20 schema
  note had briefly said ranges ship as ranges. It matters more now: the set log pre-fills the
  prescribed number and a tick means "done as written", so the one number IS what gets recorded.
- `PRG-1` **The program is written once per cycle and adjusted reactively, not on a fixed rewrite
  cadence.** Amir doesn't rebuild the program every week by default — he steps in on a real
  signal: a logged difficulty pattern (RPE consistently over/under the target) or a wellbeing/
  readiness dip. No signal, no rewrite.
- `PRG-7` **Never tell the athlete the coach assigns/prescribes a specific weight.** The app has no
  weight-target field for a reason: the athlete self-selects load against the prescribed
  RPE/rep target, and that's the whole mechanism — Amir doesn't hand her a number. Athlete-
  facing text (cycle message, notes, completion messages) must never imply otherwise (e.g.
  "I'm setting your loads", "I calculate your weight next cycle"). Frame progression as the
  *program* changing — RPE targets, rep numbers, exercise selection — driven by what they log,
  never as "here's your number."
- `PRG-8` **Progression/regression explainer note: mandatory for a NEW athlete, conditional after
  that.** Since the app never assigns weight (see above), a NEW athlete needs the mechanism
  taught directly (week-1 calibration note): how to calibrate a **new movement** (pick
  conservative, let the first set's RPE say go up or down), how to **progress week-to-week**
  on the same exercise (hit prescribed reps at/under target RPE → small jump; RPE at ceiling
  or reps missed → hold and repeat), and that **regression isn't failure** (a rough-readiness
  day or a harder-than-target set is a signal to drop weight, not push through). For a
  RETURNING athlete, only repeat it when the cycle review actually flags a reason (RPE drift,
  missed reps, confusion in logs/chat) — not on a fixed cadence. Repeating an already-learned
  mechanism every cycle regardless dilutes the promise that notes are written for *this*
  cycle.
- `PRG-9` **Check the RPE-10 rate before a logged RPE drives a decision.** New athletes often tap the
  per-set RPE button that matches their prescribed reps, as if it were a "reps done" field: a set
  of 10 logs "@10", while exercises prescribed ×12 or ×15 log no RPE at all (the selector only
  offers 6–10). Checked across every athlete on 2026-09-05: first-cycle athletes logged up to 96%
  of their RPE-carrying sets at 10, against 0–14% for everyone with ten or more sessions, and it
  fades with exposure. So above ~30% at 10 in the first ten sessions the per-set RPE is not
  effort: write no starting-load note from it, and settle the question with a filmed set, never by
  asking. /cycle-report reports the rate.
- `PRG-10` **The dose follows the cycle's adaptation.** Strength 3–6 reps at RPE 7–9 with 2–4 minutes' rest; hypertrophy 6–12 at RPE 7–9 with 1–2 minutes; power 1–5 explosive reps at RPE 6–8 with full rest; endurance and conditioning 15+ reps or time. Don't let a power cycle be programmed like hypertrophy. A first cycle keeps VOL-11 (nothing weighted under 8 reps), which is why its picture word is a foundation one (PRC-27). So does a first cycle back after 3+ weeks off (VOL-11): its ranges start at 8.
- `PRG-11` **Over 30% of sets at RPE 10 means the RPE is a rep counter, not effort.** Measured over the first ten sessions; above that share, no starting-load note is written from the logged RPE and the cycle report teaches the scale instead (PRG-9, 2026-09-05).

## Volume & dosing
- `VOL-1` **Volume is a report, not a rule, for a sport-performance athlete.** Show programmed
  sets/muscle vs the goal range vs a verdict; frame an under-dose as "maintenance" for
  time-limited clients (not failure), and say where to invest if/when time allows.
  When the programme's aim is strength and muscle, the 10-set floor below is a rule instead, and in
  a `build` or `iron` cycle it is a warning for a sport athlete too (VOL-4).
- `VOL-2` **Manage load per DAY, not just per week — weight by systemic cost, then undulate.**
  Raw set count lies: 21 isolation sets ≠ 13 heavy-compound sets. Weight each working set
  by neural/systemic cost (heavy compound ≈ ×1.5, moderate compound ≈ ×1.0, isolation ≈
  ×0.5) to read the true per-day load. Then give each day a deliberate **load identity** and
  **undulate the week** (one peak / one–two moderate / one low day) rather than four flat
  "RPE 6, everything matters" days. For poor-recovery clients (low sleep, high stress) this
  is the *primary* lever — distribution beats total volume. Check three things every review:
  (1) cost-weighted load per day, (2) that no two high-load days for the same pattern sit
  back-to-back, (3) session **length/grind** (a 7-exercise day spikes cortisol even at low
  RPE).
- `VOL-3` **Evidence-based volume ceiling for hypertrophy: ~10–20 hard sets/muscle/week, most of the
  benefit captured by ~10; per-session, ~5–10 sets/muscle is likely near the sweet spot in
  trained lifters** (Barbalho 2019 RCT in trained women found 5–10 sets/session matched or beat
  15–20). Don't stack a single session past ~10 direct sets on one muscle — spread it instead.
  Use this as the working ceiling when sizing weekly/per-day muscle volume, not just intuition.
- `VOL-4` **When the programme's aim is to get strong and build muscle, every major muscle clears ≥10
  working sets/week — a hard floor, not a target** (quads, hamstrings, glutes, back, chest,
  shoulder; any athlete, any sex). It began as the women's lower-body
  rule below and now covers the aim, not the sex. A sport-performance athlete (tennis, padel)
  gets what is best for them and their condition, and their volume is a report, **except in a
  `build` or `iron` cycle** (2026-10-17): a muscle or strength cycle under 10 sets is not one, so
  the checker warns on each major muscle under 10, and a real reason (a match month, a sore joint)
  goes on `floor-except:`. A `build` or `iron` cycle on `aim: general` warns too, because that aim
  switches the floor off. The checker
  applies it with `--floor`; a muscle excused for a stated reason (chest on a rounded-shoulder
  client, below) goes on the spec's `floor-except:` line. Where it began: **women's lower body,
  quads, hamstrings and glutes each ≥10.** The 10–20 range above is a rule to satisfy, not a band to approach from
  below. Never sign a major lower-body muscle off as "maintenance by design" just because it isn't
  the athlete's headline goal — under 10 needs a stated, genuinely good reason, and "it's
  secondary to her physique goal" is not one. Where the sets go: the day with the lowest
  cost-weighted load and spare time (see the bullet below), and prefer movements the athlete
  hasn't seen in the prior cycle so the added volume also reads as new.
- `VOL-5` **Check for unused session-time budget before calling a day "done."** Estimate the day's
  actual working time (sets × rest + set duration) against its time cap (the athlete's real
  session length, not the form's number: see 2026-09-26 under Session structure) — if there's real
  headroom (15+ min) and the athlete's recovery capacity allows it, that's free volume, not a
  reason to stop. Fill it with low-priority, low-CNS-cost work (arms, calves, a secondary
  muscle under its dose range) rather than leaving the session light. A session with room to
  spare and nothing added in it is an under-dosed session, even if every individual exercise
  looks reasonable on its own.
- `VOL-6` **The PATTERN is deferred; the EFFORT never is.** Any cycle that withholds a movement pattern
  (axial loading, the free hinge, cutting) must still carry a real strength benchmark the athlete
  has to hit in the patterns they DO own. Without one, "train them hard inside what's safe" stays
  a sentence in the rationale and quietly doesn't happen — and the programming itself tells the
  athlete you think they are breakable.
- `VOL-7` **The SHOULDER is ONE muscle group, scored on the normal 10-20 range — press, side delt and rear
  delt all count against the same total.** Rear delt is not a separate budget. The line that makes
  this workable: **rear-delt work counts as shoulder, scapular retractors count as back** (rows,
  Y-T-W, face-pull-style retraction into the mid-back), so a posture cycle can push back volume up
  without inflating the shoulder number.
- `VOL-8` **Never more than 4 working sets on one exercise, until the athlete has PROVEN more in our own
  logs. If a muscle needs more volume, ADD AN EXERCISE.** What the athlete says about their experience never
  lifts the cap; a full cycle of our logs at the prescribed volume, with RPE on target and reps
  made, can. Say the evidence in the spec and run the checker with `--proven`. This is the
  hard-cap version of the 2026-07-27 movement-variety correction ("padding sets onto an existing
  movement instead of adding a new one is itself a corner-cut") — that one banned set-padding as a
  way to reach a number, this one caps the set count outright. Athlete G C3 had a leg curl at 6 sets to
  clear the hamstring floor; the fix was 4 sets plus a second, genuinely distinct curl variation.
- `VOL-9` **Do not load horizontal pressing to hit a volume range on a rounded-shoulder / forward-head
  client.** The "every major muscle group clears its range" rule yields to the posture principle
  here: chest volume stays low or omitted, the volume goes into pulling and scapular work instead,
  and the exception is stated on the face of the design rather than silently resolved either way.
- `VOL-10` **⚖️ COUNT EVERY EXERCISE THAT LOADS THE MUSCLE, NOT JUST THE ISOLATION WORK — and show the
  working in the coaching log.** The convention:

  | Weight | When | Example |
  |---|---|---|
  | **1.0** | the muscle is a prime mover, trained under load through a real range | RDL → hamstrings; lat pulldown → back; lateral raise → shoulder |
  | **0.5** | significant synergist, OR a prime mover loaded only in a shortened / partial range | hip thrust → hamstrings; leg press → glutes; row → biceps; overhead press → triceps |
  | **0** | stabiliser only, or trivial contribution | plank → glutes |

  Warm-up and activation circuits do **not** count — they are priming, not dose. The one exception
  is **core, which counts wherever it sits**, activation rounds included.

  **Every volume tally is published as TWO tables in the athlete's coaching log**: a per-exercise
  table (day · exercise · sets · what it counts toward, fractions shown) and the per-muscle total
  against its goal range. Amir reads the working, not just the verdict — a bare "hamstrings 11"
  hides which exercises produced it and whether the number is real.

  **The weights live on the exercise, not in each log**. Each
  Spine entry carries its `credits` (muscle → 1 or 0.5) and its VOL-2 `cost` (coach-only, stage39),
  and `scripts/check_program.py --tables` writes both tables and the per-day load from them. They
  had been typed by hand every cycle, and the logs disagreed with each other: an RDL's glutes at 1
  in one and 0.5 in another, a face pull under back, shoulder or both. The 220 entries started from
  the counts the logs already used, one answer per movement whatever the kit. A count that looks
  wrong is changed on the entry, for every athlete at once.

  **Why this is a rule and not a preference:** scored isolation-only, a muscle can read as
  under-dosed when the athlete is training it hard through compounds, and the programme then gets
  contorted around a number that was never true. Athlete G C3 read hamstrings 11 direct-only and a
  seated leg curl looked load-bearing; counted properly it was 14.5, and the same pass revealed
  glutes at **22 — over the 10-20 ceiling** — which the old convention had scored 13. The error
  runs in both directions. **A missing machine is not a reason to contort the programme:** clear
  the 10-set floor with what the gym has and move on.
- `VOL-11` **A new athlete with no known lifts, or one back after 3+ weeks off: no weighted exercise under 8 reps in that first cycle.**
  Unweighted landing and jump drills (a snap down at 3 × 5, pogo contacts) and warm-up counts are
  exempt. Heavier, lower-rep work waits until the first cycle's logs and films show what the
  athlete can really do.
  **The same floor holds for a returning athlete's first cycle after 3 or more weeks off** (2026-10-18).
  After a long gap we no longer know what they can lift today, so the cycle restarts at 8 reps
  like a first one. The 3 weeks is read from the Debrief: the longest run of days with no training, in the last cycle or between its end
  and the new start. The spec says so on a `reentry: <reason>` line and the checker holds it
  (`--reentry`). Only the rep floor comes back: supersets and the first-week note stay a new
  athlete's (SES-11). A retest in such a cycle is an 8RM, not TST-3's 3-5 (the app reads 1RM to 10RM).
  Bodyweight prep, landings, jumps and mobility sit outside it, as in a first cycle. The case: a
  returning athlete's Cycle 3, after 10 of 20 sessions and then 22 days off.
- `VOL-12` **Small muscles: 6–12 sets a week in a foundation cycle, more later.** Biceps and triceps sit below the major muscles' 10–20 (VOL-3) because the big pulls and presses already reach them at half a set (VOL-10). Whether the checker should report it is Amir's call at the end of the rule freeze (PRC-25).
- `VOL-13` **A missing machine never bends the programme.** Clear the 10-set floor with what the gym has and move on (the VOL-10 story, 2026-09-08: *"when the machine is not there, just being able to hit the minimum of 10 sets a week is good"*).

## Testing
- `TST-1` **Light testing only:** derive an estimated 1RM from the heaviest logged set each cycle
  and track it cycle-over-cycle. No separate test day.
- `TST-2` `TST-4` **A max-rep test is an AMRAP to TECHNICAL failure, filmed — never an unstated
  all-out set.** The set ends at the first rep that slows, shortens, or breaks position
  (~2 shy of grind), and if the cycle carries an RPE ceiling, the test is written as an
  explicit, stated exception to it — two lines of a program must never give opposite
  instructions for the same set. It never runs in a first cycle (TST-3). The app keeps to it too: on a day with a
  test-flagged lift in the closing week (the retest window), the session bar's cap reads *Max RPE 7 except the
  retest* (2026-10-12), and that lift's logged RPEs are coloured against its own card, not the cap, in the app and
  on the dashboard (the session's date decides there). On a lower check-in day neither applies: the retest waits for
  a green day, so it is capped like every lift and the bar says no exception.
- `TST-2` `TST-3` **No test goes to a grind: every max-effort set stops at the first rep that slows, shortens or
  breaks position.** A flagged rep-max retest (`test: 5RM`) is one set of 3–5 reps at about
  **RPE 9**, one rep left, never RPE 10. In a first cycle back after 3+ weeks off it is an 8RM (VOL-11). That is accurate enough for The Ceiling (a *Good*
  estimate) and safe for an athlete training with nobody next to them. A first cycle has no
  max-effort set at all (TST-3). Never a true 1RM.
- `TST-3` **A new athlete's first cycle has no max-effort test: the logged sets are its baseline.** The first
  cycle's logs already give a Rough estimate per lift (TST-1, TST-6), and the first retest is flagged in a
  later cycle (TST-5), when the athlete's technique and effort scale can be trusted.
- `TST-5` **Two or three flagged retests a cycle, no more.** `test_flag: 5RM` makes the app chase a retest in the cycle's closing week, so it goes only on lifts the cycle is about, usually the primaries: a grinding bilateral or loaded unilateral lift, never a jump, a carry, a warm-up or anything timed. Never in a first cycle, in pain, or with poor technique under load. The nudge works by being rare.
- `TST-6` **A Rough e1RM is a trend, never a load.** The Ceiling grades each estimate Sharp, Good or Rough (long sets, low RPE), and a single Rough estimate never sets a starting load.

## Communication & in-app text
- `COM-1` **In-app athlete text (message, outcomes, notes, completion) is ENGLISH.**
- `COM-2` **The WhatsApp handoff message is PIPELINE OUTPUT, and it is written in the ATHLETE'S OWN
  LANGUAGE — not English, and not on request.** Every finished programme ships with ONE message (two until
  2026-10-11): what changed and why, the week, this cycle's actions pointed into the app (COM-17), what they
  will have by the end, then dates and questions. Farsi for Iran-based athletes, English otherwise. In Farsi
  use Persian numerals and put the **Persian calendar date first** with the Gregorian in brackets. It never
  enters the programme — the in-app text stays English. Owned by /program-engage PART 5.
- `COM-3` `COM-4` **⚠️ EVERY word an athlete reads must sound like AMIR wrote it — not like AI wrote it.**
   This governs
  all athlete-facing copy: cycle messages, notes cards, Coach's Notes, completion messages,
  WhatsApp text. How to hit it:
  - **Simple, everyday words.** Short sentences. If a plainer word exists, use it ("build up"
    not "accumulate", "for now" not "at this stage", "that's fine" not "that is entirely
    acceptable"). His English is good but not literary — polished prose is the tell.
  - **Warm and direct, coach-to-athlete.** Speak *to* him ("you", "your back"), use
    contractions, allow a little informality and the odd short fragment. "Trust me on this one."
  - **Ban the AI tells**: em-dashes, semicolons, "moreover/furthermore/additionally", tricolons
    and balanced triads, "it's not X, it's Y" antithesis, "Let's dive in", corporate-motivational
    filler, and headings on a two-sentence note. Vary sentence length — perfectly even rhythm
    reads generated.
  - **Say the real reason in plain words.** "Your back has history, so we start with the leg
    press" beats "we are prioritising trunk-supported loading patterns."
    Since 2026-09-24 that sentence has its own home on the exercise: **`why` (Because)**, 5–10 per
    cycle, on the exercises chosen for THIS athlete. Body part, never the diagnosis. What we do
    next, never the failure. See SCHEMA.md → *`why` — Because* and /program-engage PART 3b.
  - Read it back and ask: *would a busy coach type this on his phone?* If it reads like a
    brochure or a textbook, rewrite it.
- `COM-5` **Notes speak in the athlete's app language — day numbers + on-screen names, never
  design-side shorthand.** The athlete sees "Day 4 — Quiet Feet, Iron Trunk", not "the
  Control day"; a notes card that references days by the coach's internal labels
  (Lower/Upper/Control) is unintelligible to her. Anchor every day reference to **Day N**,
  optionally + its visible focusTag, and describe it in plain words ("Day 4 — knee control &
  trunk").
- `COM-6` **Exercise-scoped guidance goes ON the exercise — the `note` field.** Anything about one
  specific exercise (an injury caveat like "start slower", a starting-weight suggestion from
  the athlete's past logs, how to load it) is authored as that exercise's `note`, which the
  app renders as a highlighted clay "Coach's Note" (a clay dot after the name on the closed card,
  a callout when it is open) so the athlete pays attention. The cycle notes cards carry only
  program-wide guidance. See SCHEMA.md → "Exercise coach's note".
- `COM-7` **Coach-facing reports** (the two volume tables) print in chat for Amir — never in the
  athlete app or the programme. They are also archived per athlete in the coach-only
  `public.coaching_logs` row, append-only (it was `.claude/coaching-log/<id>.md` until 2026-09-07,
  in a public repo; that folder is gitignored now and never comes back).
- `COM-8` **Personal note bodies (`notes.cards[].body`) render as real HTML, not one paragraph.**
  The app used to escape this field to plain text — it now renders `<p>`, `<ul><li>`,
  `<strong>`, `<em>` (fixed `2026-07-08`, see `program.html` "note-body" CSS + `renderNotes()`).
  Write 2–4 short paragraphs (one idea each), reach for a bullet list the instant content is
  enumerable (rules, steps, a keep/cut/skip breakdown), bold the one key phrase per paragraph.
  A note that opens as a dense wall of text is a bug, not a style choice — see SCHEMA.md →
  "notes" and program-engage SKILL.md PART 3.
- `COM-9` **Every required note is on the spec's obligations list, and the checker holds engage to it.**
   Design lists the keys that apply (`backoff`, `week1`, `explainer`,
  `pain-ladder`, `modification-menu`, `film`, `weigh-in`, `double-day`, `low-readiness`, `period`,
  `start-lower`, `close-loop`, `win`); engage writes each and tags its card; the same list drives
  the WhatsApp message's action lines (COM-17) and Amir's handoff. A required note is written first, before the breadth.
- `COM-10` **Notes card count is a byproduct, not a target — never pad.** Write every mandatory note
  that applies plus whatever else is genuinely load-bearing this cycle; a simple cycle with
  less to say gets fewer, sharper cards. Manufacturing a card to hit a number produces exactly
  the generic filler the "athlete-specific only" rule forbids. **Soft cap: 8 cards.**
  A cycle that needs more says why in the handoff; the checker warns past 8.
- `COM-11` **Celebrate a genuine win every cycle, on its own card — never manufacture one.** A lift
  that moved, a habit that stuck, a hard week survived, an adherence streak: give it its own
  card, not a caveat buried inside a corrective note. Retention runs on the athlete feeling
  seen for what's working, not only corrected on what isn't — but an invented win reads as
  hollow and undercuts the real ones. Some cycles genuinely have no big one; don't force it.
- `COM-12` **A cycle notes card and its matching exercise Coach's Note don't repeat each other.** When
  the same issue has both (e.g. a standing injury protocol), the card states the full
  protocol/stop-rule ladder once; the exercise note gives only the point-of-action specifics
  for that exercise (starting depth, load, a fault seen on their film) — it never re-explains the ladder.

- `COM-13` **Body weight is logged in the programme app — when an athlete's goal actually turns on the
  scale, point them at it in a notes card.** It lives on **Home → Body Weight** in `program.html`:
  tap the card, then **Weigh in**. ⚠️ **Not in AA Proof:** the weight screen moved out of Proof on
  2026-09-12 and Proof has none now. Kilograms, worth no XP, and the chart is a 7-day rolling
  average with the raw readings as dots, so it reads a trend, never one morning. It never reaches
  the leaderboard or the wall, and Amir reads it in `coach.html` → athlete → Proof (the readings
  still live under the Proof key). Any athlete whose cycle genuinely depends on body mass (a
  fat-loss phase, a deficit, a medication-driven change) gets a notes card telling them to weigh
  in and exactly where. Two things the card must say: that nobody else sees it, and — for anyone
  previously told not to trust the scale — why the rolling average is a different instrument from
  the number under their feet.
- `COM-14` **A Coach's Note is one to three short sentences about this athlete, the point first.** Plain text.
  Only about 75 characters show before More ›, so the first sentence carries the point. One to three, not one,
  because a note sometimes carries a starting weight and a caveat. What it holds, most useful first:
  - **Their starting weight**, from their own logs and framed by the RPE (PRG-2): *"Last cycle 20 kg for 10 at
    RPE 8. Try 22.5 kg and let the first set's RPE decide."* With no logs, how to find it: *"Start with a bell
    you can keep upright every rep."* Unsupervised lifters pick weights that are too light, so this is the
    most useful thing a note says.
  - **Their limit**: a range, a pain stop, a side. A limit that changes one of the entry's steps says so:
    *"Stop at the box, not the floor."* (CUE-7)
  - **Their kit or place**: a box height, a home anchor for a band, the court version.
  - **Their checked fallback** (SEL-20): the swap for pain or a busy station that has been checked against
    their restrictions (SEL-12). An unchecked "if the machine is busy" swap is not a note: the About sheet's
    Alternatives cover that.
  - **An ask**: *"Film set 2 and send it."* A fault seen on their own film belongs here too.
  - **A few words of reason** (*"for your wrists"*) only when the exercise has no Because; when it has one,
    the reason is the Because (COM-4), never said twice.
  **Never in a note:** when to add weight (PRG-3 stands: the athlete hits the RPE and logs, and Amir changes the
  card), general how-to (it is a step, CUE-6), a general cue (CUE-1, CUE-2), the tempo (CHP-6), sets or reps,
  the grip (the pill, NAM-5). The checker warns past three sentences or 300 characters, on a note that repeats
  its own pill or its entry's steps or cues (CUE-7), and on a grip written in a note.
- `COM-15` **A Because is one sentence of 140 characters at most, written fresh each cycle.** A reason from Cycle 1 is stale by Cycle 3, so it is never carried over.
- `COM-16` **A week note is short and says it once.** One or two short sentences under about 260 characters, starting with the instruction (the app already names the week above it), and no notes card repeats it.
  Home sets it as a cover (Front Page, 2026-10-12): the athlete's first name, then the **first sentence as the
  week's headline**, its numbers in clay, the rest under it, then Amir's signature and photo. So the first sentence
  IS the rule, with the number in the words the app colours (*"Keep every set at RPE 7 or under this week."*,
  *"One set fewer on every exercise and nothing above RPE 7."*), and under 100 characters (longer, and the headline
  falls back to the week's name). No greeting, no name, no sign-off: the app adds all three. The checker warns on each.
- `COM-17` **The handoff message points into the app; it never rewrites it.** The cards, Coach's Notes and
  week notes hold everything in full, so a line about anything the app holds is a short gist in the athlete's
  language (what to do) plus where it is, by the app's own names: *"if the cough won't settle, stop and
  message me ← Coach ← The Cough Rule"*, *"weigh in once a week ← Home ← Body Weight"*, *"film your split
  squat in week 2; how to film it is on the exercise's clay dot"*. The gist matters because the app is in
  English and the message is in their language: a bare pointer leaves them reading an English card to learn
  what to do. Only what the app does not hold is written out: why, a date, a question.
  - **Length:** about 12 to 15 lines for a returning athlete; about 20 to 25 for a new one, the extra being
    the sign-in and a short tour of where things are, never card content.
  - **A returning athlete hears only what is new or changed this cycle**, plus the good news; the rest is
    one line (*everything else is where it always is, on the Coach tab*). A week note is never in the
    message: Home shows each in its own week.
  - **A doctor is advised once, never chased.** No reminder is written for later, and nothing waits on it:
    if the athlete goes and reports back, the programme may change; if not, nothing follows.

## Coaching cues
- `CUE-1` **Exactly 3 cues per entry — never more, never fewer — and each has its own job.** They
  finish the entry's steps and never repeat them (CUE-6, CUE-7). The key point and the feel or check go
  in `cues.good[]`, the avoid in `cues.bad[]`:
  - **Key point** (`good[0]`): the one thing to hold in mind during the set, about ten words. The effect
    outside the body or an analogy works best, as in Amir's own *"Throw it through the wall, not at it"* and
    *"Bounce off the floor like it's hot"*. No setup and no chain of orders joined by commas: half the first
    cues once did the steps' job (*"Half-kneeling, pull the handle down to the ribs"*).
  - **Feel or check** (`good[1]`), decided by the entry's FIRST quality so two writers agree. `muscle`,
    `armour` or `movement`: where you should feel it, in plain place words, starting "Feel" (*"Feel a
    stretch in the back of your standing thigh"*). `power`, `spring`, `speed`, `brakes`, `rotation`,
    `strength` or `engine`: a quick position check (*"Chest and hips rise together as you stand"*). A
    "feel the muscle" focus helps light-to-moderate muscle work and lowers force on a max-effort jump.
  - **Avoid** (`bad[0]`): the ONE fault that most risks injury or ruins the rep, written **fault first,
    then the fix**: *"Knee falling inward. Keep it over your second toe."* Never two faults joined by "or",
    never two cues on the same point. A stop rule is fine: *"Low back lifting off the floor. If it lifts,
    stop the set."* The fault is named because a fix-only line on the red row read as "don't do this",
    and a colour-blind athlete can't tell the red row from the green ones, so the words carry it.
  - A cue is read on its own, so it points back to a landmark the steps gave (*"Stop at the straight
    line"*), never "flat" or "tight". Written once, for anyone (next bullet): a point about one athlete's
    training age or history goes in their Coach's Note.
- `CUE-1` `CUE-2` **The cues live on the exercise, not the athlete.** Each exercise's steps and three cues are
  written once, on its Spine entry (`public.exercises`, edited in coach.html → Exercises), and every
  athlete's card shows them. A programme carries **no cues**. Something only this athlete needs (an
  injury limit, a range, a home-kit setup, a fault seen on their film) is the exercise's **Coach's
  Note**, one to three short sentences (COM-14), never a cue; which side goes first is the card's lead
  pill (CHP-2), and a hand position the pill list can't say stays in the note. A point that would help
  anyone is a change to the Spine entry. Spine cues are written for anyone: no athlete, no side, no home
  furniture, no tempo, no dose.
- `CUE-3` **Never create a new pill.** An exercise's quality pills come from the ten (Strength, Muscle,
  Power, Spring, Speed, Brakes, Rotation, Engine, Armour, Movement), which cover every physical
  quality, and its pattern pill from the library's own list (Squat, Hinge, Single leg … Jump & land,
  Sprint & change of direction, Conditioning). Use those; never invent another of either kind.
- `CUE-4` **Every programme write leaves the Spine more complete.** At the end of writing or editing a
  programme (or a library workout), every exercise it used is checked against the Spine: a missing
  one is drafted, empty fields are filled, and missing steps or a better general cue are applied to a
  draft or proposed for an approved entry (`/spine` → Upkeep).
- `CUE-5` **Claude drafts library entries; only Amir approves them, and before the programme
  publishes.** A card shows cues and steps only from an approved entry (`get_exercises()` serves approved
  rows only), so a new exercise's entry is drafted in the same run and put to Amir as one question
  at the top of the handoff: *"approve these N so their cards show cues and steps?"* Never approve one
  without his word, and never put anything about one athlete on an entry.
- `CUE-6` **How to do it: every Spine entry has steps, written once for anyone.** The Farsi course reads the same entry's
  Farsi (stage65), so a change to the English steps, cues, purpose or On court line changes the Farsi in the same run. The test: someone who has
  never seen the exercise, with no video, can do it safely from the words alone. With no video an athlete
  used to get three short cues and nothing else, and a handout alone gives more than twice the errors of video
  or live teaching, so where text is all there is, it has to be complete. The steps are the entry's `steps`
  (stage64), shown inside the card's *How to do it* and in the About sheet.
  - **Shape.** 3 to 5 steps, one phase each: a raise may lift and lower in one step, and a short fragment can
    give an end position (*"Feet shoulder-width, toes out a little."*). 2 to 3 for a `mobility` or
    `conditioning` entry (the count follows the pattern, so two writers agree). Up to 6 for a lift that comes
    off a rack or is kicked into place, so the bail fits (*"If you get stuck, sit down and let the safety bars
    take the bar."*). Each step under about 90 characters (140 at most; the database refuses more), in the
    "you" voice and everyday words. The entry's own name is never jargon.
  - **Order.** The setup (the kit, where you and the weight go, the normal grip in plain words: *"a dumbbell
    in each hand, palms facing you"*, NAM-5), the start position, the move ending at something you can see or
    feel (*"until your back knee is just above the floor"*, never "go deep"), the way back and where the rep
    ends, then what is left: breathing, setting a free weight down, *"do all the reps on one side, then
    switch"*.
  - **What the pilot taught** (twelve real entries read by a test reader with no video, 2026-10-11):
    every direction word needs its reference point (*"side-on"*, *"square"* and *"sit back"* each caused a
    guess; *"hips face the floor"* and *"second toe"* did not). Getting in and out is a step wherever people
    get hurt: unracking and racking, a kettlebell held upside down, lying face down with weights, a spin
    bike's flywheel, a band under tension. Safety setup goes in step 1: a non-slip floor, space to land or
    run past, a band with no cuts on an anchor it can't slide off. A range landmark gets a form stop
    (*"dumbbells at mid-shin, or higher if your back rounds"*), because a fixed landmark alone tells a stiff
    beginner to round. "How long?" is answered by a landmark, never a time (*"until you are steady"*).
    Balance work gets a way out (*"Tap the other foot down if you lose balance."*). An alternating exercise
    says what counts as one rep (*"Each reach counts as one rep."*). A setup number that is the same for
    everyone is fine (*"about 3 m of space"*, *"about 45°"*, *"3 small steps"*); one set for one athlete (a
    lower step) is their Coach's Note.
  - **Plain words.** The words a second-language reader tripped on and the gym words that need a plain
    version are one list, in `.claude/skills/spine/draft_sql.py`, which checks every draft against it. The
    list lives there only (PRC-23).
  - **Never in steps:** sets, reps, time, tempo or seconds, RPE, kilos, which side this athlete starts, home
    furniture, why the exercise is good (the `purpose`), what to feel (a cue), another exercise's name or when
    to move to it (Regressions and Progressions).
  - Write the steps first, then the cues from what is left, so a cue never repeats a step. On an approved
    entry Claude never fills the steps: they wait on the pending list, and Amir's Save in coach.html is the
    approval (CUE-5). The checker warns when an approved entry on a card has none; it becomes a fail once the
    entries with no video are done.
- `CUE-7` **Say each thing once: seven pieces, seven jobs.** Four live on the Spine entry and are the same
  for every athlete; three live on the programme card and are about one athlete. If a sentence would help
  anyone, it belongs on the entry; if it is about this athlete, it belongs on the card.
  - **What it does** (`purpose`, in the ⓘ): what it builds, one sentence for anyone. Never how to do it,
    never the court moment.
  - **On court** (`tennis`, in the ⓘ): the match moment it serves. Never the purpose again, never how.
  - **Why you** (the Because, `why`, in the ⓘ, COM-4): why THIS athlete has it. Never the purpose or the On
    court line in other words, never how.
  **An entry's steps and cues, once written, are read and never rewritten** (Amir, 2026-10-11: *"we dont have
  to rewrite the instruction again"*): a programme run writes only the card's pieces against them. A step or
  cue that is wrong or unsafe is a proposal, never a quiet edit. **A new exercise is written in order**: steps,
  cues, purpose, On court, each checked against those before it, then the card's pill, note and Because
  against all four. The four layers on the entry and the card:
  - **Steps** (CUE-6): how to do it, from the setup to a safe finish.
  - **Cues** (CUE-1): the key point, a feel or a position check, and the one fault. They finish the steps.
  - **The pill** (`intent`, CHP-2): the one thing this athlete changes or adds, every rep, from the list.
  - **The Coach's Note** (`note`, COM-14): what only this athlete needs: their weight, limit, kit, checked
    fallback.
  **The card overrides its entry, and says what it changes.** A grip pill overrides the grip the steps
  name; a limit that changes a step says so in the note (*"Stop at the box, not the floor."*). A pill that
  only repeats the steps adds nothing: the Broad Jump's steps hold the landing, so `stick the landing` on it
  says it twice. Before this rule the missing how-to was typed into notes (about a third of them), the cue
  slots carried setup and the pill carried the tempo. **Every stage that writes a pill or a note reads the
  entry's steps and cues first** (design and edit in one query; engage for the flagged cards), and the
  checker warns when a note repeats its own pill, a step or a cue, when a pill says what the steps or cues
  already say, and when a Because retells the On court line, the purpose, a step or a cue (2 of 81 live
  Becauses retold the On court line on 2026-10-11). `draft_sql.py` warns when a purpose reads as an
  instruction or names the court, and when an On court line repeats the purpose or reads as how-to (about
  20 of 322 purposes read as instructions that day). It compares wording, so a paraphrase is still the writer's and the reviewer's judgment.

## Chips & modifiers
- `CHP-1` **No floating text on a card.** Nothing goes on a programme card as a grey `setup` line. A grip,
  the side that goes first or another value on the pill list is the pill (CHP-2). Any other detail for this
  athlete (a hand position the list can't say, a bench, a range, how a drill is called) is the exercise's
  Coach's Note; on a circuit item, the circuit's note.
- `CHP-2` **The pill comes from a closed list.** The pill (`intent`) is the only words on the closed card,
  so it carries the one thing this athlete does differently from the entry's normal way, every rep. The list
  and the old spellings it replaces live once, in SCHEMA.md → *`intent`: the pill list*; the checker and the
  app hold copies that `scripts/check_parity.py` keeps equal. Six groups: **hands** (a grip, or straps),
  **lead** (which side goes first, or alternating), **intent** (the effort of every rep), **hold** (where the
  hold is, only with `rx.tempo: "iso"`), **brakes** (how a braking drill stops) and **pace** (only on an item
  with no RPE). **At most two values, never two from one group**, joined in the one `intent` string with
  " · ". A new value joins only on Amir's word, like a new quality (CUE-3).
  Never a pill: the tempo or seconds (it has its own cell, CHP-6), a number or dose, a muscle or category
  (*glute focus*, *court transfer*: a label, not an instruction), a cue, or the grip the entry's steps
  already state. **A superset/complex pairing is never a pill** — it's a structural decision (see
  "Session structure & time" below): the paired exercises become one `type: circuit` block with a shared
  name + rest, not a `"superset"` pill on a standalone standard exercise. Test before adding one: does it
  change what the entry already says, and could the athlete act on it every rep? The checker fails a value
  off the list (naming the list value an old spelling became), two from one group, more than two, a hold
  pill without `iso`, a pace pill beside an RPE, and a pairing.
- `CHP-3` **Hold exercises write `Iso` in the Tempo — Amir's rule, verbatim (2026-07-24): "if
  it's a hold exercise, in the Tempo write Iso."** Every isometric/hold prescription
  (iso holds on a machine, planks, wall sits…) is `rx.tempo: "iso"` with the hold as
  `rx.time`, so the card's TEMPO cell reads **Hold** and the athlete knows it's one
  continuous hold, not reps. Pairs with the canonical-name ruling in "Exercise naming" — name
  stays library-canonical, the tempo cell + note carry the execution.
- `CHP-4` **The app's RPE selector runs 6–10 — never prescribe an RPE below 6, anywhere.** Any
  sub-6 intent (easy run, recovery walk, low-effort control drill) is authored as **RPE 6**
  (the scale's floor = easy/conversational), or `rx.rpe` is left out entirely on a
  `simple` item that doesn't need grading. A prescribed RPE the athlete literally cannot
  select in the logger is a mismatch, not a nuance.
- `CHP-4` **The 6 floor binds INSTRUCTIONS as well as the card — any note telling the athlete to take
  RPE off must name the floor in the same sentence** (the cycle's `weekNotes` too). Auditing only the RPE chips passes a
  program that still sends her below 6, because the autoregulation card does the subtracting
  at runtime: "drop every RPE by 1 on a low-readiness day" lands on **RPE 5** for every
  exercise authored at 6, and she cannot log it. Write it as *"take 1 off every RPE, but
  never go below 6 — anything already at 6 stays at 6."* Same for a period-week card, a
  deload note, a double-day rule, or a Coach's Note. Sweep every athlete-facing string for
  sub-6 RPE, not just `rx` (`scripts/check_program.py` does).
- `CHP-5` **A prescription is DATA: the `rx` object, never `chips[]`.** `rx` holds `sets`, one of
  `reps` / `time` / `distance` / `work`, `side`, `rpe`, `tempo`, `rest` and `rounds`, and **an
  absent field means not prescribed**: the card draws no cell for it, so nothing is invented
  (rest used to default to 2 minutes, so a calf raise and a back squat showed the same rest).
  Legacy `chips[]` is still read by the app and never written. Full spec: SCHEMA.md → `rx`.
- `CHP-6` **Say the tempo once, in its cell.** Never restate it in `intent`, a note or a cue: *3s eccentric* beside a tempo of 3-1-1-0 is the same instruction twice, and the card already highlights the digit that carries the instruction (2026-09-20).
- `CHP-7` **Every working exercise and every circuit carries its own rest, in `rx.rest`** (Amir, 2026-10-11:
  "some main exercise and some accessory exercises have rest time, some don't, it must be consistent"; "you
  must write a rest time for circuits, can be as short as 30 seconds"). A block's shared `rest` used to be
  written once on its header with no cell on the cards under it (2026-09-20: eight cards each repeating REST
  2m is one fact eight times), so a card with its own number showed a REST cell and its neighbours showed
  none, and a prep circuit had no rest at all. Now every `standard` exercise and every `circuit`, a prep
  circuit included, writes `rx.rest` (30 s at the least; a `simple` item such as a bike or a walk has none, and
  neither has a card that is one continuous effort with no sets),
  and the block's `rest` is not written (the app still reads it on programmes written before this). The app
  still never invents a rest: writing one on every card is the pipeline's duty, not a fallback.
  **The number is chosen for that exercise, never one value for a whole section** (Amir, 2026-10-11: *"as a
  coach i think its better that each exercise has its own rest time, this is more accurate ... unless its a
  circuit, and in circuit we dont have rest for each exercise"*). Start from PRG-10's ranges and the exercise
  in front of you:
  - a heavy compound at 6 reps or fewer (squat, hinge, bench, hip thrust, leg press): 150 to 180 s;
  - any other Primary compound (a pulldown, a press at 8 reps or more): 120 s;
  - a compound or single-leg Accessory (a row, an incline press, a split squat, a hinge accessory): 75 to 90 s;
  - a machine, cable or isolation Accessory (curl, raise, extension, face pull, calf raise): 60 to 75 s;
  - core: 45 to 60 s; a carry: 60 s; a light prehab or rehab drill (external rotation, ankle, wrist): 30 to 45 s;
  - sprints and starts: 90 s; throws, jumps and landings: 60 to 90 s (power wants full rest, PRG-10);
  - a circuit (a superset) has ONE rest, after the round, 75 to 90 s, and never a rest per item; a prep
    circuit rests 30 to 45 s.
  What the athlete has told us moves a number (Pooya feels strongest on long rests and hates one minute: his
  Primary lifts stay at 150 to 180 s). The checker warns when every working card of a day rests the same, the
  sign of a section's number copied onto its cards.

## Naming
- `NAM-10` **Cycle names are cool & evocative** — punchy 1–2 word power-names (Foundation Forge,
  Volume Engine, Bedrock), never dry labels. Set in /program-roadmap.
- `NAM-11` **Day names (`focusTag`) have sports-headline energy** — vivid, write them like a sports
  writer trying to make the athlete *want* to train ("Built From The Legs Up", "Press, Pull,
  Repeat", "Whole-Body Workhorse"), never spreadsheet labels ("Upper Body & Press" ✗). The
  picture comes from the day's own `art` word now, so the name is free; the keyword scan is
  only the fallback for days without one (SCHEMA.md).

## Process
- `PRC-1` **Writing a programme never touches the app. Ideas go to Amir; they are not built.** No edit to
  `program.html`, `coach.html`, `habits.html`, `assets/js/*` or any other page while a programme is
  being written, corrected or delivered. A better way to prescribe something, a bug seen in passing,
  a new idea: say it in the handoff and let him decide. The one change a programme run may make
  outside the programme is the library: a newly prescribed exercise added to the Spine in full,
  cues and all, linked like the others.
- `PRC-2` **A correction changes exactly what Amir named, and nothing else.** Asked to fix one thing on a
  delivered programme, fix that thing: no exercise removed or swapped, no section renamed, no note
  or message rewritten on the side. Anything else that looks wrong is a question for him.
- `PRC-3` `PRC-4` **Every design pass is checked, and reviewed where judgment is needed — Amir's standing
  order, not an option.** Two shapes:
  **(1) Roadmaps** (/program-roadmap): ONE coherent pass, then ONE independent reviewer.
  Claude reads the athlete first (recovery ceiling, restrictions, goal order, the bottleneck),
  weighs two or three arcs in one place, and writes the one it would defend, with a short
  rationale and an exit test for each cycle. One reviewer agent (files only) then critiques the
  finished arc against the brief and this file, and every must-fix is applied. It locks without
  Amir's sign-off (Amir, 2026-09-26: *"no doesnt need me"*). No literature search unless Amir
  asks for one.
  **(2) Cycle designs**: Claude drafts the spec with full context (the STEP 1 checkpoint with
  Amir still comes first). The built programme then goes through `scripts/check_program.py`,
  **straight after design and BEFORE engage writes a word** (/program-assemble Part A, since
  2026-09-26), and every FAIL is fixed in the spec: the 10-set floor (strength-and-muscle aims only, `--floor`), the
  4-set cap (`--proven` once our logs show more), the new-athlete rules (automatic on a first
  cycle), a banned movement in any exercise or fallback, RPE floors in every note, the week-1
  note and a taper's back-off (`weekNotes`), back-to-back days, the Spine gate, and (since 2026-09-26) the
  continuity checks against the cycle just trained: accessories carried over, a kept dose that
  didn't move, a Disliked / Pain-flagged / Banned ledger exercise brought back. A day past the time
  cap is only a warning (the cap is soft, 2026-09-26), and so is a Quality headline outside the
  week's top two, which is reported with a recommendation (Amir, 2026-09-26: *"report it, but
  recommend what you think should happen"*). Then a **new athlete** gets ONE
  reviewer, files only, for what a script cannot judge (injury logic, exercise choice,
  transfer, whether the notes cover every exercise they should), and every surviving
  must-fix/should-fix is applied. A **returning athlete** gets no reviewer unless Amir asks: the
  mechanical failures on record for returning cycles (rotation, re-shipped doses, a banned or
  disliked exercise back, the same exercise twice, floors, the set cap) are all script checks now.
  The original three-auditor panel caught real issues (Athlete I C1: a deep-flexion warm-up
  leak on a locking-history knee, a 60-min cap breach, an unwritten run ladder). The script
  now catches the mechanical half of that kind of miss, and the reviewer keeps the judgment
  half.
- `PRC-3` **The roadmap is saved the moment it locks.** /program-roadmap writes `cycles[]` onto the
  athlete's programme row and starts their coaching log (the header, the profile draft, an empty
  Exercise Ledger, the roadmap's exit tests and rationale) in the same call, so design and assemble read
  it from the server, as they do for a returning athlete.
- `PRC-4` **When Part A passes, engage runs straight on.** No "do prompt 2" in between: 0 FAIL and
  nothing that overturned a checkpoint answer, and engage starts at once. Amir still reads every
  athlete-facing word before "ship it".
- `PRC-5` **Background agents work from files, never the database.** Before launching a lens or a
  reviewer, write everything it needs (brief, spec, Spine slice, built programme) into
  scratchpad files, pass their real paths, and tell it in so many words not to call the
  database or any MCP tool. A background agent's approval prompts do not reach Amir: on
  2026-09-24 two reviewers sat 12 and 13 minutes on unanswered database prompts and the run had
  to be killed. The one agent that must read the database, `athlete-brief`, runs in the
  foreground. And never launch a Workflow with placeholder arguments (the first launch that
  day went out with `"SEE_FILE"` and had to be stopped).
- `PRC-6` **Ask the database as few times as possible.** One lookup at intake, one write when the
  roadmap locks, one context pull at the start of design (athlete row, sessions, log, cycle names,
  the whole Spine), one query for the checker (`check_program.py --spine-sql`: the Spine lines, the
  name matches, last cycle, the ledger), one publish call (`publish_cycle()` writes the programme and
  the log and returns the fingerprint), then the upkeep. Never one query per exercise, and never schema discovery: the
  skills name the tables and columns.
- `PRC-7` **Every progression gate resolves to a MEASUREMENT, a FILM, or a THIRD PARTY — never the
  athlete's word.** That includes a gate written against "their log", because the log is them. For
  any athlete with a history of training through pain, a self-reported gate is not a gate. Ask in
  forced-choice comparatives they cannot answer with "fine" (*which side is stiffer this week ·
  how many strokes before it starts · what did it stop you doing*), never yes/no or open.
- `PRC-8` **A FILM gate is not real until the athlete is told to film.** Deciding a criterion resolves to
  video (see above) is a design-time call — it only works once /program-engage turns it into an
  explicit notes card: which exercise, which weeks, where to send it, and the consequence if it
  stops. Precedent, verbatim: *"These lifts are new to you and I'm not standing next to you, so
  video is how I coach you… weight goes up on those three only after I've seen the film and
  cleared it. If the videos stop coming, the weight stops moving."* (Athlete J C1, `📹 Film your top
  sets`.) A film-gated exercise with only a design-side `note_flag` and no matching notes card is
  a gate that exists in the coach's head and nowhere the athlete can actually read it — the
  exercise-level Coach's Note tells him what to do *on the lift*, this card is what tells him the
  video is mandatory and what happens without it.
- `PRC-9` **⚠️ STAY IN SCOPE: track SYMPTOMS and PERFORMANCE. Never build a joint-assessment battery —
  that is a physio's job.** A monitoring stack may contain **only** what an
  S&C coach is qualified to collect *and interpret*:
  - **Symptom reports** — what hurts, where, when, what it stopped them doing, how long they can
    sit/run/hit before it starts. Asked as forced-choice comparatives, never yes/no.
  - **Training data** — loads, reps, RPE, adherence, session length.
  - **Movement quality on the lifts themselves** — filmed top sets, landing mechanics. This is
    technique coaching and it *is* the job.
  - **Body mass and stature** — fuelling and growth-related load management.

  **Range-of-motion assessment is out of scope.** No ROM battery, no goniometry, no asking the
  athlete to film joints for measurement, and **never gate a progression on a number you are not
  qualified to interpret** — an S&C coach staring at a hip-rotation video has no defensible basis
  for a load decision. Train mobility, train strength, watch symptoms, refer out when something
  hurts. This does not weaken a cycle whose *rationale* is a mobility restriction — the hypothesis
  is still tested the S&C way: **does the symptom settle, can they do more, do they move better
  under load.** Extends "Know the referral line — coaching is not diagnosis" (Intake & assessment)
  from pain into assessment.
- `PRC-10` **The monitoring stack stays SMALL — five measures run religiously beat fifteen that get
  abandoned.** An abandoned monitoring system is worse than a minimal one, because gates then get
  passed on nothing at all while everyone believes they were measured. Cut every metric that does
  not feed a gate or a deload trigger.
- `PRC-11` **A gate that depends on someone ELSE acting is scoped to a variable, never to whole-cycle
  progression.** If the athlete met every training criterion but a third party has not booked the
  appointment, hold back density or volume — do not repeat the cycle. A six-week block repeating
  because a parent has not made a phone call is a scheduling failure wearing a safety rule's
  clothes.
- `PRC-12` **⚠️ EVERY program build ENDS with a COACH HANDOFF BRIEF — everything to measure, gate, film
  and watch for, and WHY.** The last thing /program-assemble does, after the JSON
  validates and the log is archived, is tell Amir **in chat**, as its own clearly-headed section:
  every **measurement** he has to take or collect · every **gate** and exactly what clears it ·
  every **film** he has to review and by when · every **date-stamped escalation** (referrals,
  appointments, checkpoints) · and every **decision made on his behalf** that overrides, extends
  or fills a gap in something he said. One line each, each with its reason. It is a to-do list he
  can act on, not a recap of the programming. A program whose coach has to reverse-engineer his
  own responsibilities out of a long design write-up is a handoff failure, however good the
  programming underneath it is. **Anything the athlete must do repeatedly to keep a gate alive
  (filming, weekly measures, an appointment) also belongs in the PLAN he can see** — a cycle
  focus line and/or a `message.outcomes` entry — not only in a notes card.
- `PRC-13` **Reassessment is scheduled, not only reactive.** You adjust day-to-day on what you observe
  (pain, dislike, readiness), but each cycle also has a defined length and a reassessment
  trigger (e.g. a primary lift stalls ~2 weeks → revisit) — the cycle boundary forces a
  deliberate re-read even when nothing visibly broke.
- `PRC-14` `PRC-15` **THE ROADMAP IS 5 CYCLES OF 5 WEEKS. 25 weeks. That is the house shape.**
  Cycle count and cycle length are NOT things to re-derive from the athlete's goal, and not
  things a design panel gets a vote on — a panel proposes what each cycle CONTAINS, never how
  many there are or how long they run. Cycle 1 is 5 weeks like every other, so the first
  program /program-design builds is a 5-week program. Deviate only when Amir says so for that
  athlete, and say out loud that you are deviating.
  A second, independent hit the same day: on Athlete P's roadmap the head-coach judge issued
  *"do not add a fifth cycle"* as a binding directive, on the science. It is overruled — fit the
  arc to 5×5 and make the extra block do real work rather than padding it with a retest or a
  maintenance phase. Every week of a cycle trains: the final week is a back-off only when it tapers
  into a competition Amir named (REC-4; until 2026-10-19 every cycle was 4 loading weeks + 1 back-off).
  **A week note belongs to one week (2026-09-26, widened 2026-10-11).** /program-design decides a special
  week's dose as numbers (how many sets fewer, how many RPE points off, or an RPE cap, never below 6),
  /program-engage writes the athlete's words, and /program-assemble stores both in the cycle's `weekNotes`
  under that week's number (`"1"`, `"4"`, `"5"`). The app shows a note only in its own week, on Home, where it
  IS the This Week section (since 2026-10-12), and nowhere else: not at the top of a session (there its numbers
  sit on the session bar's last row), not before the cycle starts, not after it ends.
  **In its week the note's numbers are also the target every logged RPE is coloured against** (2026-10-12), on every
  day of that week, with or without a check-in, skipped or trained as written: the card's RPE lowered by the
  `rpeCap` (else the `rpeDrop`), never below 6 (CHP-4) and never above the card. The card still prints its own
  RPE (PRG-4), a lower check-in day takes the lower of the two (REC-2), and a test-flagged lift in the closing
  week keeps its own card on a normal day (TST-4; on a lower day it waits for a green day, capped like every lift). The dashboard judges each session against the week it fell in, the same way.
  **A number in a week note covers every lift that week**, because the session bar and the set colours read it
  for every card. A limit on only some lifts (*new exercises stay at RPE 7, known lifts go to the card*) is
  written in the note's words with no `rpeCap` or `rpeDrop`, and `scripts/check_program.py` warns when a note
  with a number scopes it in words to some lifts.
  Week 1 has a note when it differs (always for a new athlete), the final week only for a competition taper
  or its retests (REC-4). Any other week that differs from the card, a testing week or a reduced-load week, gets
  its own note with a title (*Testing week*, *Lighter week*), and so does a final-week note that is not a taper:
  the app calls an untitled one the *Back-off week*. `first` and `last` still read as week 1 and the final
  week on programmes written before 2026-10-11. `scripts/check_program.py` fails a taper cycle without its
  back-off and a new athlete's first cycle without the week 1 note.
- `PRC-16` **One record of who the athlete is today: the athlete profile.** Goals in order, the bottleneck, days and real minutes, kit, standing bans, injuries with
  their status, recovery, and whether the aim is sport or strength-and-muscle live in a small
  `profile` block at the top of the coaching log, kept current like the Exercise Ledger:
  /athlete-intake drafts it, the roadmap adds the bottleneck, each design updates it (the Debrief's
  profile changes), and a mid-cycle edit that changes a constraint updates it too. Until then these
  facts were re-read from prose every cycle, so a ban could quietly drop out, and the checker was
  told what to check by the run it was checking. `scripts/check_program.py` now reads `aim`,
  `proven`, `bans`, `floor-except` and `cap` from it.
- `PRC-17` **Roadmap is created once and locked** — design/engage read it, never rewrite it.
  A change the data forces goes through design's `roadmap_amend:` line: what changes and why,
  shown to Amir at the checkpoint and written by assemble. Beyond that, a run touches only this
  cycle's message, `weekNotes` and a gate line in its focuses (PRC-12), and the next cycle's
  teaser.
- `PRC-18` **Every cycle's design rationale is archived.** /program-assemble appends the design read +
  locked decisions + ledger changes + the two volume tables to the coach-only
  `public.coaching_logs` row as its last step: append-only, never the programme. Prior cycles are
  never overwritten, so months later you can see how a cycle was thought through and why
  something changed.
- `PRC-19` **An athlete whose cycle ends without a renewal keeps the app, and gets no coaching.** They can
  keep training the programme they have; no new cycle, report or edit is written for them until
  Amir says so.
- `PRC-20` **Cycles continue; they don't reset.** Each cycle reads the prior rationale (the coaching
  log) alongside the data, then **progresses or edits the same logic** — it does not invent a
  new program each month. Change the underlying logic only when a data point forces it (pain,
  a stall, a plateau), and record the why. The locked roadmap is the path; the coaching log is
  the reasoning + what actually happened — read both before designing the next cycle.
- `PRC-20` **Rationale can be set or revised at any cycle, and the latest is the operative logic.** When
  you land on (or change) the real logic mid-journey — a new rationale at cycle 3 — it becomes
  the baseline the next cycle continues (the log reads most-recent-first). New athletes are
  logged from cycle 1; athletes who predate the log start empty and get their first entry
  naturally on the next design pass — no separate seeding step (the why is Amir's to supply;
  the data only scaffolds it).
- `PRC-21` **Menstrual-cycle phasing is NOT used** in programming (coach's decision).
- `PRC-21` **Period-week protocol IS used — as an adherence fallback, not performance phasing —
  confirmed per cycle, never auto-included.** Distinct from the rule above: this is a standing
  low-friction menu for period days (so she never has to build a plan from scratch under
  discomfort), but whether it belongs in *this* cycle's notes is something Amir checks with
  her at the cycle's check-in each time — not a stored preference and not carried forward
  automatically from a prior cycle. /program-design flags the question for Amir at the STEP 1
  checkpoint; /program-engage only writes it once confirmed. Logic when confirmed: full sets on
  cardio/mobility/light hip work (walking, stretching, glute bridges) — light movement eases
  cramping; primary lifts cut to ~2 sets at a visibly lighter weight/RPE — move the pattern,
  don't grind; anything with direct heavy ab-bracing or intra-abdominal pressure (weighted
  rollouts, planks, hollow holds) skipped outright for those days. Restate it in that cycle's
  actual exercises, not copied verbatim cycle to cycle.
- `PRC-22` **Athlete-first; naming & styling are downstream.** The aim is always *what's good for
  the athlete* — get the format, exercise selection and dose right first. Categorizing,
  section names, chips and styling are a mechanical layer applied *after* that, and must
  **never bend the programming logic or burn design energy**. Right training first; correct
  labels and styling fall out afterward. Two concrete applications: **reps** —
  design writes the one number it means, even when it thinks in a zone, because the number is
  the prescription and the app records it (Progression → never a rep range; assemble never picks
  an end). **Exercise
  Coach's Notes** — design only flags which exercise needs one + why (a `note_flag`, one
  domain-language line); engage drafts the athlete-facing sentence; assemble places it.
  Design's job is *deciding* what needs a note, never *writing* it.
- `PRC-22` **Design pass = programming first; polish later.** During /program-design put ALL the
  reasoning into the coaching decisions + analysis (athlete read, SFR/transfer selection,
  volume, sequencing, progression). Exercise **names, chips, day names, and formatting are a
  polish pass AFTER the program exists** — nail the right movement + dose first; wording is
  tidied later (/program-assemble format-lints, and names settle on the Spine entry). Don't burn design budget perfecting names/chips mid-analysis; if a name/chip is
  rough, flag it and move on.
- `PRC-23` **Skills cite rule IDs; they never restate a rule.** A skill says *how its stage
  applies* a rule and cites the ID (`VOL-8`); the rule itself lives only in the index. The checker
  names the rule on every FAIL and WARN, and `scripts/check_rule_index.py` (pre-commit) fails an ID
  that doesn't exist, a Check column the script doesn't back, and a rule with no story.
- `PRC-24` **The cycle's headline quality is reported, never forced.** A cycle's `art` word names the
  quality it builds (`iron` → Strength, `voltage` → Power …), and the week's top two qualities
  should include it. When they don't, the checker warns and Amir hears it in the handoff with a
  recommendation: a quality trained in few, fast sets (power, speed, spring) can sit third while
  the block is right, so keep the week if that work comes first in the day; otherwise add work for
  it or change the art word. **Never add volume only to satisfy the line.** `bedrock`, `peak` and
  `reset` are phases, not qualities, so they have no headline.
- `PRC-25` **Rule freeze: no new rules until eight cycles have run on this pipeline.** The pipeline changed more than 60 times in six
  weeks while only two live programmes were in the current format, so rules were being added
  faster than any of them was tested. Until eight cycles have been written on this pipeline
  (count the `Checks:` lines in the coaching logs), a new rule goes in only when something
  actually broke: through the index, with its stage and, where possible, a check. At eight
  cycles, read the `Checks:` lines and prune what never fired or never mattered.
- `PRC-26` **How the Quality mix counts.** Working sets, the primary quality 1 and a secondary ½, prep blocks skipped, an exercise dosed by time counting one set per 10 minutes (never less than 1), nothing shown under 70% tagged coverage, and a 12% cut; bedrock, peak and reset are phases with no headline (2026-09-24). The method exists four times (program.html, coach.html, /program-design, the checker) and they must match.
- `PRC-27` **A first cycle's picture word is a foundation one.** bedrock, armour or build, never iron or voltage: a new athlete's first cycle has no weighted lift under 8 reps and no supersets (VOL-11, SES-11), so it is never a heavy, low-rep block.
- `PRC-28` **The focus is the cycle's promise to the athlete, on his screen.** If it names squat, hinge, single-leg, push, pull or carry patterns, the build trains each of them in its working blocks. A gap is closed by adding the pattern or by a `roadmap_amend:` line that drops the word (PRC-17), never left for the athlete to notice.
- `PRC-29` **One conversation, many helpers.** The main conversation asks Amir, saves to the database and publishes; the roadmap draft, the design analysis and spec, the Part A build and check, engage's words, Part B's preparation and the Spine upkeep each run as a fresh helper that reads its inputs from files and writes its outputs to files. Effort follows the job: max for the roadmap and design, high for engage, medium for the build, Part B and upkeep. A run kept in one conversation once re-read 500 to 780 thousand tokens on every step by Part B. A long write is sent by a helper, and the main conversation decides it and reads it back (PIPELINE-RUN.md). How to run it: `.claude/skills/PIPELINE-RUN.md`.
- `PRC-4` **A late change gets a delta review.** When the design changes after the one review (Amir adds conditioning, an exercise is swapped, the reviewer's own suggestions go in), a helper reviews only the changed cards and their words before Part B: what changed, against the same rules. Once, the finishers added after the review reached the athlete unread, and his first question was how hard to go on them.

