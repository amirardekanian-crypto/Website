# Coaching Principles — Amir Ardekanian

This is Amir's codified coaching philosophy, in two parts: **the rule index** (one numbered
line per rule, just below) and **the stories behind the rules** (the dated bullets after it).
`/program-design` reads the whole file every run; `/program-engage` and the reviewers read the
index and the sections their job needs. Either way, settled questions are never re-asked. It
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
> its stage and its check), then a dated story bullet under the right section, tagged with the
> same ID. Keep the rule general (applies across athletes) and actionable.

---

## The rule index

**Read this first. One line per rule, and the line is the rule.** Everything below the index is
the story behind each rule: the date, Amir's words, the athlete it came from. If a line and its
story ever disagree, **the line wins** and the story gets fixed. Search a rule's ID (`SEL-4`) to
find its story. *(Built 2026-09-26 from the pipeline audit: the same rule lived in up to ten
places, and a stale copy reached athletes.)*

- **Stage** is the skill that applies it: intake, roadmap, design, engage, assemble (Part A
  builds and checks, Part B finishes), edit, report (/cycle-report), spine, workout (library
  sessions).
- **Check** is what `scripts/check_program.py` does with a breach: **✓** fails it · **warn**
  flags it · **part** checks part of it · **oblig** fails it once design puts that key on the
  spec's `obligations:` list · blank is judgment (the designer, the reviewer, Amir). Every FAIL
  and WARN the checker prints names its rule, and `scripts/check_rule_index.py` holds this
  column to the script.
- **Adding a rule:** the next free number in its section (never reuse a retired one), one line
  here in 25 words or fewer, then the dated story bullet below, tagged with the same ID.
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
| SEL-11 | Audit every range or height restriction against every exercise, cue, warm-up and prep item; if nothing fits, the pattern leaves. | design | part (`bans:`) |
| SEL-12 | Check every fallback against every deferral in the cycle, and read the fallback list last. | design | ✓ (`bans:`) |
| SEL-13 | Posture and tennis clients: horizontal pressing low or none; bias the posterior chain and scapular health. | design | |
| SEL-14 | No corrective or postural drill without a noted posture issue; prep mobilises and activates the day's patterns. | design | |
| SEL-15 | Each working exercise appears once per cycle; a second exposure is more sets or a different movement. Prep items may repeat. | design | ✓ |
| SEL-16 | A missing demo video never shapes the prescription: prescribe the best movement, and Amir adds the video. | design | |
| SEL-17 | An exercise removed for dislike, inability or pain stays out until re-earned with evidence; the Exercise Ledger records why. | design | ✓ (ledger) |
| SEL-18 | No Assault Bike warm-up for a flexion-sensitive back: an incline treadmill walk, or an upright bike with hips above knees. | design | |
| SEL-19 | While the free hinge is deferred, a loaded carry is picked up from a bench or rack at hip height, never the floor. | design · engage | |

### Naming (exercises, cycles, days)
| ID | Rule | Stage | Check |
|---|---|---|---|
| NAM-1 | Exercise names run [modification] [equipment] [movement]. | assemble | |
| NAM-2 | Equipment goes in a name only when the movement has several implements; bodyweight moves take the bare name. | assemble | |
| NAM-3 | Defining setups belong in the name: Chest-Supported, Heels-Elevated, Half-Kneeling, Incline, B-Stance, Single-Arm, Single-Leg. | assemble | |
| NAM-4 | Never in a name: grip, intent, range, tempo, holds, bare digits, brackets, colons, commas. Canonical digits (45°, 90/90) stay. | assemble | |
| NAM-5 | A grip or one intention is the card's `intent` pill: the athlete's own, never free text, never on the library entry. | assemble | ✓ (grip as text) |
| NAM-6 | A variant that changes the exercise (Short-Lever Copenhagen Plank) is its own exercise, with its own name, entry and cues. | design · spine | |
| NAM-7 | A hold on a dynamic exercise keeps the canonical name; `rx.tempo: "iso"`, the time and a Coach's Note carry the hold. | assemble | |
| NAM-8 | Use the library's canonical spelling (word, digit and possessive differences matter); the library is not a whitelist, so prescribe any real movement. | design · assemble | |
| NAM-9 | A newly prescribed exercise joins the library in the same run, in full: cues, details, qualities, links both ways. Never swap it out instead. | assemble · spine | ✓ |
| NAM-10 | Cycle names are punchy, evocative one- or two-word power-names, set in the roadmap. | roadmap | |
| NAM-11 | Day names (`focusTag`) have sports-headline energy, never spreadsheet labels. | design · assemble | |

### Recovery & autoregulation
| ID | Rule | Stage | Check |
|---|---|---|---|
| REC-1 | Recovery capacity gates everything: set the weekly volume ceiling before the number of sessions. | roadmap · design | |
| REC-2 | Every programme carries the low-readiness line (1 off every RPE, never below 6); high-stress and concurrent athletes add a minimum dose and flexible order. | design · engage | oblig `low-readiness` |
| REC-3 | Separate training fatigue from life load in every review. | design · report | |
| REC-4 | Never program past a fatigue wall: every cycle's last week is a back-off, written as `weekNotes.last`. | design | ✓ |
| REC-5 | A concurrent athlete gets a double-day rule: gym after sport or 4–6 hours apart, otherwise the minimum dose with the primary at RPE 6. | design · engage | oblig `double-day` |

### Session structure & time
| ID | Rule | Stage | Check |
|---|---|---|---|
| SES-1 | Days are listed in the best execution order; an optional day keeps its place in the week and is labelled optional. | design | |
| SES-2 | A day trains what it says: never top up a muscle on the wrong half of the split; fix attendance with day order. | design | |
| SES-3 | Warm-up plus prep is always 10–15 minutes of programmed time. | design | |
| SES-4 | Gym clients warm up on a machine; strength prep has no joint-isolation drills; skips, shuffles and sprints belong to court or run days. | design · edit | |
| SES-5 | Warm-up and prep items log nothing and carry no RPE. | design · assemble | warn |
| SES-6 | Lifting-day prep may repeat rounds; a cardio or running day's prep builds through distinct movements in one pass. | design | |
| SES-7 | Design to the real minutes the logs show; a new athlete gets the form's minutes plus 15. A cap binds only on a hard stop. | design | warn |
| SES-8 | No competition calendar unless Amir names one: the arc runs straight through. | roadmap · design | |
| SES-9 | Order within a session: power, then primary, accessories, core; blocks use the standard section names (SCHEMA.md). | design · assemble | |
| SES-10 | Superset non-competing pairs to save time, except a unilateral Primary lift, which always runs as straight sets. | design | |
| SES-11 | No supersets in a first cycle, or on a movement new to the athlete (a variant of a logged one isn't new), mid-cycle included. | design · edit | part (first cycle) |
| SES-12 | A superset is ONE circuit entry with a descriptive name, never two standard cards carrying a pill. | assemble | ✓ |
| SES-13 | A circuit in a working block logs a weight per exercise and one RPE per round; a prep block's circuit logs nothing. | assemble | |
| SES-14 | A library session is as hard as its adaptation needs: no weekly hard-session count, only tissue-cost spacing (48 hours, not before a match). | workout | |

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

### Volume & dosing
| ID | Rule | Stage | Check |
|---|---|---|---|
| VOL-1 | A sport athlete's volume is a report (sets, range, verdict); an under-dose on a time-limited client is maintenance, not failure. | design | |
| VOL-2 | Manage load per day: weight sets by cost (heavy compound ×1.5, moderate ×1, isolation ×0.5), undulate the week, avoid back-to-back hard days. | design | warn |
| VOL-3 | Hypertrophy runs on about 10–20 hard sets per muscle a week, most of the gain by 10; about 10 direct sets per session at most. | design | warn (over 20) |
| VOL-4 | When the aim is strength and muscle, every major muscle clears 10 working sets a week; an exception goes on `floor-except:` with its reason. | design | ✓ |
| VOL-5 | A session with real headroom (15 minutes or more) gets low-cost work before the day is called done. | design | |
| VOL-6 | The pattern is deferred, the effort never: a restricted cycle still carries a real strength benchmark. | design | |
| VOL-7 | The shoulder is one group on 10–20 sets: press, side and rear delt together. Scapular retraction counts as back. | design | warn (under 10) |
| VOL-8 | Never more than 4 working sets on one exercise until our own logs prove more; add an exercise instead. | design | ✓ |
| VOL-9 | A rounded-shoulder or forward-head client keeps chest volume low, as a stated exception, never loaded to reach a range. | design | |
| VOL-10 | Count every exercise that loads a muscle (1, 0.5 or 0); warm-ups don't count, core counts anywhere. Both volume tables go in the log. | design · assemble | ✓ (tables vs programme) |
| VOL-11 | A new athlete's first cycle has no weighted exercise under 8 reps. | design | ✓ |

### Testing
| ID | Rule | Stage | Check |
|---|---|---|---|
| TST-1 | Light testing: an e1RM from the heaviest logged set, tracked cycle to cycle; no separate test day. | design · report | |
| TST-2 | No test goes to a grind: it stops at the first rep that slows, shortens or breaks position. Never a true 1RM. | design · engage | |
| TST-3 | A new athlete's baseline is a filmed AMRAP to technical failure; a flagged 5RM retest is one set of 3–5 at about RPE 9. | design | |
| TST-4 | A test that goes past the cycle's RPE ceiling is written as a stated exception to it. | design · engage | |

### Communication & in-app text
| ID | Rule | Stage | Check |
|---|---|---|---|
| COM-1 | In-app athlete text (message, outcomes, notes, completion text) is English. | engage | |
| COM-2 | Two WhatsApp messages ship with every programme, in the athlete's own language (Farsi: Persian numerals, Persian date first). | engage | |
| COM-3 | Everything an athlete reads sounds like Amir typed it: plain words, short sentences; no em-dashes, semicolons, triads or brochure lines. | engage · report | warn (em-dash) |
| COM-4 | 5–10 personal Becauses (`why`) a cycle, on exercises chosen for this athlete: the body part not the diagnosis, the next step not the failure. | engage | ✓ |
| COM-5 | Notes name days as Day N and their on-screen names, never internal labels like "the Control day". | engage | |
| COM-6 | Guidance about one exercise is its Coach's Note; notes cards carry programme-wide guidance only. | engage · assemble | warn (flagged vs placed) |
| COM-7 | Coach-facing reports (the volume tables) go to chat and the coaching log, never the app. | assemble | |
| COM-8 | Note bodies are real HTML: 2–4 short paragraphs, a list when the content is a list, one bold phrase per paragraph. | engage | ✓ |
| COM-9 | Every required note is on the spec's `obligations:` list; engage writes those first and tags each card. | design · engage | ✓ |
| COM-10 | Card count is a byproduct: write what is required and what carries weight, never pad. | engage | |
| COM-11 | Celebrate a genuine win each cycle on its own card; never invent one. | engage | oblig `win` |
| COM-12 | A notes card and the matching Coach's Note never repeat: the card holds the protocol, the note the point-of-action detail. | engage | |
| COM-13 | When a cycle turns on body mass, a card sends the athlete to Home → Body Weight in the programme app, never AA Proof. | engage | oblig `weigh-in` |

### Coaching cues & the library
| ID | Rule | Stage | Check |
|---|---|---|---|
| CUE-1 | Exactly 3 cues per exercise (external, internal, avoid), written once on its Spine entry for anyone: no side, kit, tempo or dose. | spine | |
| CUE-2 | A programme card carries no cues; what only this athlete needs is the exercise's Coach's Note. | assemble | ✓ |
| CUE-3 | Never create a new pill: qualities come from the ten, patterns from the library's own list. | spine · assemble | part (qualities) |
| CUE-4 | Every programme write leaves the Spine more complete: `/spine` → Upkeep ends every run. | assemble · edit · workout | part (`exId`, Spine gate) |
| CUE-5 | Claude drafts library entries and never approves one; new entries are one approval question to Amir, answered before the programme publishes. | assemble · spine | warn (drafts) |

### Chips & modifiers
| ID | Rule | Stage | Check |
|---|---|---|---|
| CHP-1 | No floating text: no grey `setup` line on a programme card; the detail is the Coach's Note (for a circuit item, the circuit's note). | assemble | ✓ |
| CHP-2 | An `intent` pill is something the athlete does or holds in mind that set, never a pairing, a muscle or a category. | assemble | part (a pairing) |
| CHP-3 | A hold is `rx.tempo: "iso"` with the hold as `rx.time`. | assemble | part (format) |
| CHP-4 | No RPE below 6 anywhere; a note that lowers RPE names the floor of 6 in the same sentence. | design · engage | ✓ |
| CHP-5 | A prescription is the `rx` object: write what is prescribed and omit the rest (absent means not prescribed). Never write `chips[]`. | assemble | part (`chips[]`, two doses) |

### Process
| ID | Rule | Stage | Check |
|---|---|---|---|
| PRC-1 | A programme run never touches the app: ideas and bugs go to Amir in the handoff. The one outside change is the library. | every stage | |
| PRC-2 | A correction changes exactly what Amir named, and nothing else. | edit | |
| PRC-3 | A roadmap is one coherent pass, then one reviewer working from files; every must-fix is applied, and it locks without Amir's sign-off. | roadmap | |
| PRC-4 | Check the build before engage writes a word (assemble Part A) and fix every FAIL. A new athlete gets one reviewer; a returning one none. | design · assemble | |
| PRC-5 | Background agents work from scratchpad files, never the database or an MCP tool, and never launch with placeholder arguments. | every stage | |
| PRC-6 | Ask the database as few times as possible: one context pull, one Spine query, never a lookup per exercise or schema discovery. | every stage | |
| PRC-7 | Every progression gate resolves to a measurement, a film or a third party, never the athlete's word; ask forced-choice questions. | design | |
| PRC-8 | A film gate is real only when a card says what to film, which weeks, where to send it, and what stops without it. | engage | oblig `film` |
| PRC-9 | Stay in scope: symptoms, training data, filmed lifts, body mass. No range-of-motion battery, and no gate on a number you can't interpret. | design | |
| PRC-10 | Keep the monitoring stack small: cut any measure that feeds no gate or deload trigger. | design | |
| PRC-11 | A gate that waits on someone else holds back one variable, never the whole cycle. | design | |
| PRC-12 | Every build ends with a coach handoff: measurements, gates, films, dated escalations and decisions made for Amir, each with its reason. | assemble | |
| PRC-13 | Reassessment is scheduled: every cycle has a set length and a trigger (a primary stalled about two weeks). | design | |
| PRC-14 | The roadmap is 5 cycles of 5 weeks, each 4 loading weeks and 1 back-off. Deviate only on Amir's word, and say so. | roadmap | |
| PRC-15 | Week 1 and the back-off: design sets the dose as numbers, engage writes the words, assemble stores them as `weekNotes`. | design · engage · assemble | ✓ |
| PRC-16 | One current athlete profile heads the coaching log: intake drafts it, every run keeps it current, and the checker reads it. | intake · design · edit | warn (missing) |
| PRC-17 | The roadmap is written once and locked. A change goes through design's `roadmap_amend:` line at the checkpoint, never a quiet rewrite. | roadmap · design | |
| PRC-18 | Every cycle's rationale is appended to the coach-only coaching log and never overwritten. | assemble | |
| PRC-19 | An athlete whose cycle ends without a renewal keeps the app and gets no coaching until Amir says so. | every stage | |
| PRC-20 | Cycles continue, they don't reset: read the log and the roadmap, progress the same logic; the latest rationale is the operative one. | design | |
| PRC-21 | No menstrual-cycle phasing. A period-week fallback is used when confirmed with the athlete that cycle, never carried forward on its own. | design · engage | oblig `period` |
| PRC-22 | Athlete first: programming before names, chips and styling. Design flags a needed note (`note_flag`); engage writes it. | design | |
| PRC-23 | Skills cite rule IDs and never restate a rule; a checker message names the rule it enforces. | every stage | |
| PRC-24 | The cycle's `art` headline should be in the week's top two qualities; if not, tell Amir with a recommendation, never add volume for a label. | design · assemble | warn |

---

## The stories behind the rules

Each bullet below is tagged with the rule it explains. The stories keep the dates, Amir's own
words and what went wrong, which is why the rules exist. Read a rule's story before changing it.

## Intake & assessment
- `INT-1` **Intake captures recovery inputs, not just goals.** The volume ceiling needs **sleep,
  stress, nutrition, age and weekly life-load** — *Recovery capacity gates everything* — and
  the web intake form now collects all of them (sleep quality + hours, stress, nutrition,
  weekly life-load, age), so the brief arrives with the full recovery picture. *(2026-06-28)*
- `INT-2` **Always take injury history up front.** Ask past injuries, surgeries and recurring pain at
  intake — prior injury is the best predictor of the next one, and it pre-loads the
  contraindications (knee history → reverse lunge, chronic back → trunk-supported hinge). Don't
  wait for pain to surface under load. *(2026-06-28)*
- `INT-3` **Trust the bar over the résumé.** Establish baseline numbers early; when stated training age
  and demonstrated capacity conflict (the "4-year pro" with a 40 kg squat), program for what's
  shown and log the hidden weakness as a target for next cycle. *(2026-06-28)*
- `INT-4` **Negotiate the minimum effective frequency, but only against a real limit.** If availability
  can't support the goal (strength + power + injury-prevention in 2×30 min/wk), ask for more
  time; if the limit is genuine, reframe the goal honestly rather than promising it on the
  available dose (see *Volume is a report* — under-dose = maintenance, not failure). *(2026-06-28)*
- `INT-5` **Know the referral line.** Program *around* minor pain, but a red flag — sharp, persistent,
  worsening, radiating pain, numbness, or a suspected real injury — means refer out to a
  physio/doctor before loading it further. Coaching is not diagnosis. *(2026-06-28)*
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
  *(2026-07-08)*
- `INT-7` **Logs are filled in by humans and go stale — confirm before a repeated complaint drives a
  decision.** A pain/cramp/complaint that repeats verbatim across sessions with no other
  corroboration, or that reads inconsistent with the readiness/adherence trend, may be a
  carried-forward log artifact rather than a live issue (it has happened — a verbatim ab-cramp
  note across three sessions turned out to be an unedited log, not a recurring problem).
  /program-design flags it and asks Amir before it drives an exercise swap, a regression, or a
  mandatory note — never silently assumed either way. *(2026-07-12)*
- `INT-8` **When a standing issue is confirmed resolved, close the loop — don't let it silently
  vanish.** An athlete who was told to watch something (an injury protocol, a regression) and
  then simply stops hearing about it next cycle may wonder if it was dropped by mistake rather
  than resolved. /program-design flags the resolution; /program-engage writes one genuine
  acknowledgment line (not a full card) — pairs naturally with a wins note when the resolution
  itself is the win. *(2026-07-12)*
- `INT-9` **A decision to program AROUND pain instead of referring out needs a DATE and named escalation
  triggers — otherwise it stands forever by silence.** "Coach around it and monitor" is a real
  option, but written without an expiry it is a default, not a decision: nobody revisits it and
  the athlete keeps loading the thing. Write the triggers that override it (night pain, loss of
  range, numbness/tingling, pain arriving *earlier* session to session) plus a hard calendar
  checkpoint — typically ~6 weeks of genuine offloading — at which it goes to a clinician
  regardless of what the athlete says or wants. *(2026-08-08)*
- `INT-10` **For an athlete who hides pain, show the MODIFICATION MENU in writing before they have anything
  to hide.** They under-report because they believe reporting costs them training or match time.
  Hand them up front exactly what happens to a session when each symptom is reported — reporting
  always buys a **modification, never a ban** — then demonstrate it once, deliberately, early. It
  is the only countermeasure that fixes the cause rather than policing the symptom, and it makes
  every other monitoring measure cheaper. *(2026-08-08)*

## Exercise selection
- `SEL-1` **SFR leads for general-fitness clients.** Pick the highest stimulus-to-fatigue option
  per pattern: Machine Shoulder Press > DB OHP · Leg Press > Back Squat · 45° Back
  Extension > Barbell RDL · Chest-Supported Row > Barbell Row. *(2026-06-15)*
- `SEL-2` **Sport-performance athletes: transfer can override SFR** — state the trade-off
  explicitly (e.g. Back Squat over Leg Press for a tennis player: lower SFR, higher
  athletic transfer). *(2026-06-15)*
- `SEL-3` **Hypertrophy-accumulation blocks: machine/SFR primaries are acceptable even for sport
  athletes** — transfer isn't lost, it's deferred to the later power/translation cycle
  (e.g. Leg Press over Back Squat for a tennis player in a mass block). *(2026-07-12)*
- `SEL-4` **Accessories rotate every cycle, BY VARIANT.** *(Amir, 2026-09-26, asked how to square rotation
  with "no supersets on a new exercise": "rotate by variant".)* The new pick is the same movement
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
  stay — say so, don't force a worse substitute just to rotate. *(2026-06-15, clarified 2026-07-13
  — Athlete A C3 shipped with ~half its accessories unrotated by oversight, not by stated exception;
  same failure mode hit Athlete B C2 the same day, at an 83% overlap with Cycle 1, caught on review
  not at design time — two independent hits in one day means this is a recurring gap, not a
  one-off)*
- `SEL-5` **Conditioning-circuit/finisher exercises rotate for real variety too — not just accessories.**
  Kettlebell Swing, Medicine Ball Slam, and Farmer's Walk had become the default finisher on
  cycle after cycle, across different athletes — read back to back, every program sounded like
  it only knew three exercises. Circuit/finisher slots get the same rotation discipline as
  accessories: genuinely different equipment and movement patterns each time (loaded carries,
  battle ropes, rowing, sled work, renegade rows, overhead carries — not just a new rep scheme
  on the same three moves), picked for what the athlete's equipment/goals/injury history
  actually support. *(2026-07-18, Amir: Athlete A's and Athlete C's circuits had converged on identical
  exercises)*
- `SEL-6` **Rehab/corrective:** keep the best-in-class pieces; rotate the rest for freshness.
  (Coach may elect to rotate the whole block — done for Athlete D C3.) *(2026-06-15)*
- `SEL-6` **The "keep best-in-class" exception above is for rehab/corrective work only.** Don't stretch
  it to general accessories just because their load is progressing well on paper — that kind of
  progress is invisible to the athlete; new movements are what read as forward motion, and she's
  paying monthly expecting to feel it. *(2026-07-13)*
- `SEL-7` **Anything genuinely kept must still show a visible dose progression — never re-ship an
  identical prescription cycle to cycle.** Rotation isn't the only lever: a kept exercise's sets,
  rounds, load, or difficulty should move. Athlete B C2 initially re-shipped Medicine Ball
  Rotational Slam and Assault Bike Intervals with the exact same numbers as Cycle 1 — caught on
  review, not by design. *(2026-07-13)*
- `SEL-8` **A fresh-exercise swap must fit the athlete's demonstrated capacity, not the most
  advanced-sounding progression.** Nordic Curl and Depth Jump to Box were both proposed as
  Athlete B C2 swaps and both rejected as too advanced; Stability Ball Leg Curl and a lower-box
  Single-Leg Box Jump were the right calibration. Same logic as "Trust the bar over the résumé"
  (Intake & assessment) — program for what's shown, not what sounds impressive. *(2026-07-13)*
- `SEL-9` **Knee-history clients:** reverse lunge over forward lunge; reintroduce plyometrics
  with stick-landings / step-downs; lateral bounds are the highest-risk item — ramp last. *(2026-06-15)*
- `SEL-10` **Chronic-back clients:** lead the hinge with trunk-supported options (45° Back
  Extension + Hip Thrust) and defer the loaded *free* hinge (barbell RDL/deadlift) one
  cycle — build the brace first, then load the free pattern (the brace is its permission
  slip). Also high-SFR, so little stimulus is lost. *(2026-06-15)*
- `SEL-10` **Chronic-back clients: AXIAL loading defers a cycle too, not just the free hinge.** The
  first cycle runs a supported knee-dominant primary (Leg Press / Hack Squat) instead of the
  Back Squat; the squat re-enters the next cycle only after a fully pain-free one. Same logic
  as the hinge rule above — the pain-free cycle is the permission slip, and SFR means almost
  nothing is lost by waiting. Applies to the *fallbacks* too: don't let a fallback quietly
  re-admit the free pattern the cycle deferred. *(2026-07-30, Amir, on Athlete E C1: "leg press as
  its safer a bit for his lower back, if he was pain free the whole cycle then we can progress
  to a back squat")*
- `SEL-11` **A RANGE OR HEIGHT RESTRICTION MUST BE AUDITED AGAINST EVERY EXERCISE IN THE CYCLE, INCLUDING
  WARM-UP AND PREP — not just the ones it obviously names.** A rule like "nothing above shoulder
  height" or "no end-range lumbar flexion" is written once against one lift and then silently
  broken by movements nobody thought to re-check: a lat pulldown and an overhead Y-raise both
  START in the banned position, a lateral raise "capped at shoulder height" stops the athlete
  dead in the middle of the painful arc rather than below it, and a Cat-Cow in the prep circuit
  cues the exact end-range flexion the primary's own note forbids. Two lines of a programme must
  never give opposite instructions for the same joint. Sweep the restriction across every
  movement, every cue and every prep item before the spec is final; if no exercise in a pattern
  can satisfy it, the PATTERN leaves the cycle rather than the rule bending. *(2026-08-17,
  Athlete F C1 — the clinical audit lens caught four separate breaches of the cycle's own
  shoulder rule plus a prep-circuit flexion leak on a chronic back)*
- `SEL-12` **The fallback rule above generalises: EVERY fallback is checked against EVERY deferral the
  cycle makes, not just the free hinge.** A fallback is written as an afterthought ("if the
  station is busy") and is the easiest place for a banned pattern to walk back in — the athlete
  follows it unsupervised, on a busy day, with no coach present. Machine Hack Squat shipped as
  the leg-press fallback in a cycle that had removed axial loading entirely: shoulder pads are
  axial load, so a full gym sent a chronic-back athlete straight onto the thing the cycle
  existed to avoid. Read the fallback list last, against the contraindication list, every time.
  *(2026-08-17, Athlete F C1)*
- `SEL-13` **Posture / tennis clients:** horizontal-press volume deliberately low or omitted;
  bias posterior chain + scapular health. *(2026-06-15)*
- `SEL-14` **No corrective/postural drills without an indication.** Postural or scap-control
  correctives (scapular wall slides, postural-specific work) only go in when the athlete
  has a *noted* posture issue/restriction. For a general client with none, prep is
  mobilisation + activation of the day's patterns — not corrective theatre. (General
  shoulder mobility/activation before pressing — band pull-apart, pass-through, cat-cow —
  is fine; it preps the lift, it doesn't "fix posture.") *(2026-06-19)*
- `SEL-15` **One exercise appears ONCE per cycle — never the same movement on two different days.** If a
  muscle needs more volume than one slot carries, add sets to that slot, or find a different
  movement for the second exposure. Repeating the exercise across days reads to the athlete as the
  program repeating itself, wastes a rotation slot, and hides the fact that the movement pool for
  that muscle has run out — which is information you need, not something to paper over.
  *(2026-07-27, Amir — Athlete G C2 shipped Cable Lateral Raise on both Day 1 and Day 4 to reach a
  side-delt target; the fix was 5 sets on one day plus a different raise on the other.)*
- `SEL-15` **One-exercise-once-per-cycle applies to WORKING exercises only** (Primary / Accessory / Core /
  conditioning). **Activation & Prep items may repeat across days** — a primer's job is to prime
  the day's patterns, so repetition there is the point, not program repetition. *(2026-07-30, Amir
  — the rule as written had no carve-out, which would have banned the same warm-up bike or glute
  bridge on two days.)*
- `SEL-16` **A missing demo video NEVER shapes the prescription — Amir adds URLs manually.** *(Amir,
  2026-07-30, verbatim: "i will always add url for all the videos that doesnt have a url, this is
  not your worry, you always prescribe what is best for the athlete, and the ill add videos
  manually.")* Prescribe the best movement for the athlete, always; don't downgrade a choice,
  substitute a lesser exercise, or hedge because a name isn't in `exercise_library.json` yet.
  Off-library picks are normal and expected — follow the naming convention, and since 2026-09-25
  the new exercise joins the Spine in full in the same run (Exercise naming, below). Extends "the library is a video-join key, not a whitelist" (Exercise naming) from
  permission into a standing instruction.
- `SEL-17` **A removed exercise stays removed unless re-earned.** When something is dropped for dislike,
  inability, or pain, record *why* in the coaching log — and don't reintroduce it next cycle
  without a real reason and evidence the athlete has earned it back (pain resolved, capacity
  built). The log is what stops a bad fit silently reappearing months later. *(2026-06-28)*
- `SEL-18` **The Assault Bike is NOT a neutral warm-up — it is banned as the general raise for any
  flexion-sensitive back.** It seats the lumbar in flexion and cycles it under reciprocal arm
  drive, so five minutes of it at the top of every session is repeated low-load lumbar flexion
  on exactly the athlete who must not have it — roughly 75 minutes of it across a cycle, before
  a single working set. Low-load repeated flexion is the classic disc-symptom provocateur; the
  mechanism does not need a heavy load to matter. Use an **incline treadmill walk** (or an
  upright bike set high enough that the hips stay above the knees and the torso stays tall)
  instead. Same failure shape as the Cat-Cow precedent (2026-08-17), one scale up: the warm-up
  is where a cycle's own contraindication is most likely to be broken, because nobody re-reads
  the prep block against it. *(2026-09-07, Athlete H C1 — the draft opened all three
  sessions with it on a lumbar-disc athlete, having already dropped Cat-Cow for that very reason)*
- `SEL-19` **A loaded carry's PICK-UP is a free hinge — spec the pick-up, not just the carry.** Any cycle
  deferring the free loaded hinge must say where the weight is lifted from: a bench or a rack pin
  at hip height, never the floor. A 3-set suitcase carry is six loaded single-arm pick-ups and six
  set-downs per session, at a grip-limiting load, usually in the last block when she is tired — an
  offset free hinge, unsupervised, and typically the only rep in the program with no instruction
  attached to it. The exercise's own cues describe the walk; nobody writes a cue for getting the
  thing off the floor. Extends "audit the restriction against every exercise, including warm-up
  and fallbacks" (2026-08-17) to the parts of an exercise nobody thinks to write down.
  *(2026-09-07, Athlete H C1)*

## Exercise naming
*(This is the single source of truth for exercise names — `/program-design`,
`/program-assemble`, and `/program-edit` all defer here; none should restate the rule.)*
- `NAM-1` **Word order = `[modification] [equipment] [movement]`** — modifications first
  (stance / unilateral / defining setup), then equipment, then the movement. E.g.
  "Standing Dumbbell Shoulder Press", "Chest-Supported Dumbbell Row", "Single-Arm Cable
  Row". *(2026-06-15)*
- `NAM-2` **Equipment in the name only when the move has multiple implements** (cable / dumbbell /
  barbell / machine / kettlebell); omit when equipment-agnostic. *(2026-06-15)*
- `NAM-2` **Bodyweight moves take the bare movement — no "Bodyweight" prefix** (Reverse Lunge,
  Lateral Lunge, Glute Bridge — not "Bodyweight Reverse Lunge"). *(2026-06-19)*
- `NAM-3` **Defining setups DO belong in the name** (Chest-Supported, Heels-Elevated,
  Half-Kneeling, Incline, B-Stance, Bottoms-Up, Single-Arm, Single-Leg). *(2026-06-15)*
- `NAM-4` **Never in the name → these go in the prescription, the pill or the Coach's Note:** grip ·
  focus/intent · range qualifier · tempo emphasis · holds/durations · bare digits · parentheses ·
  colons · commas. (A 30s plank → `rx.time: "30s"`; a hold → `rx.tempo: "iso"`; a grip or one
  intention → the `intent` pill; anything else for this athlete → the Coach's Note. `chips[]` is
  legacy and never written: SCHEMA.md → `rx`.) **Exception — digits in an established/canonical name stay** (45° Back
  Extension, 90/90, B-Stance); don't mangle them. *(2026-06-19; rx wording 2026-09-26)*
- `NAM-5` **Grip / intent / execution tweak is a chip, never the name** (e.g. Lat Pulldown +
  `wide grip`; Chin-Up). Keeps card titles clean and stable. *(2026-06-15)*
  **And never free text either:** on an `rx` card the chip is `intent` (`"intent": "neutral grip"`),
  never the grey `setup` line. *(Amir, 2026-09-25, after a first cycle came back with its grips as
  grey lines: "grips should be a chip on the card not a free text. you changed how my file look
  like")* **A grip chip belongs to the athlete, on their card, never on the exercise's library
  entry.** *(Same day: "the chips you added for grip, is specific to the athlete, so dont add that
  chip to the whole exercise library")*
- `NAM-6` **A variant that changes the exercise is its own exercise**, with its own name, its own library
  entry and its own cues, never the parent exercise with a note or a chip. Short-Lever Copenhagen
  Plank is not Copenhagen Plank + "short lever". *(Amir, 2026-09-25: "if some one is doing short lever
  copenhagen, thats another exercise with its own name and different cues")*
- `NAM-7` **An isometric hold on a dynamic library exercise KEEPS the canonical library name —
  the video stays; the chip + Coach's Note carry the hold.** Amir's ruling (2026-07-24,
  Athlete I C1): a rename-to-"…Hold" was tried (it breaks the video join) and he reverted
  it — the machine-setup video is still worth having, and the execution change is
  communicated by the hold time (`rx.time`), `rx.tempo: "iso"` (the TEMPO cell reads
  **Hold**; see "Chips & modifiers", Amir's rule), a `mid-range hold` intent pill where it
  helps, and a Coach's Note that states it's one continuous hold, not reps. When telling Amir about a
  program, point at where the isometric lives (exercise + day) rather than assuming the
  card reads as one. Longer-term option stands: add a dedicated isometric (Wall Sit,
  Spanish Squat…) with its own video to the Notion library and rotate it in.
- `NAM-8` **`exercise_library.json` (generated from Notion) is the source of truth for names —
  it is the video join key.** Author each exercise to the library's canonical spelling
  exactly; `/program-assemble` validates and normalizes misses. *(2026-06-15)*
- `NAM-8` `NAM-9` **The library is a video-join key, not a whitelist — programming is never restricted to what's
  already catalogued.** Pick whatever real movement is right for the athlete; a name not yet in
  `exercise_library.json` just ships without a demo video until it's filmed and added to Notion
  (the app handles a missing video gracefully — no play button, nothing breaks). Follow the naming
  *convention* above regardless of whether the name is already catalogued. Compensate for the
  missing video with a clear setup note when the movement is new to the athlete. *(2026-07-27,
  Amir, verbatim: "you can prescribe any movement that you like" — said after Athlete G C2 avoided a
  genuinely better exercise, a leaning cable lateral raise, out of a mistaken belief that only
  library entries were available.)*
  ⚠ **Since the Spine (2026-09-24) the card's cues come from the library**, so a newly prescribed
  exercise is ADDED to the library in the same run, in full: its three cues and every detail the
  existing entries carry (purpose, on-court line, body parts, qualities, links both ways). Never
  swap the movement out because it has no entry. Only an approved entry reaches the phone, so the
  new entries are the one approval question in the handoff. *(Amir, 2026-09-25: "if there is any
  exercise that is outside of the exercise library, after its prescribed for any athlete, it should
  be added to our library, with all the cues and other details like the ones already there". A
  first cycle had shipped seven new outside-day drills as bare drafts, so every card was blank; the
  "fix" then removed the drills, which was worse.)*
- `NAM-8` **The app resolver normalizes case/punctuation/accents** as a safety net, so minor
  drift still finds the video and Notion renames don't break old programs — but
  word/digit/possessive differences (Leg Press vs Machine Leg Press, Farmer vs Farmer's)
  still need the exact canonical name. *(2026-06-15)*

## Recovery & autoregulation
- `REC-1` **Recovery capacity gates everything** — set the weekly volume ceiling *before*
  choosing session count. *(2026-06-15)*
- `REC-2` **Every athlete gets the low-readiness rule; high-stress and concurrent athletes get the full
  kit.** Everyone has rough days and the app already asks about readiness, so every programme
  carries one line: on a low-readiness day, take 1 off every RPE, **never below 6** (anything at 6
  stays at 6). High- or chronic-stress clients and concurrent athletes also get a minimum effective
  dose (first power move + first primary lift) and a flexible session order. *(2026-06-15, floor
  added 2026-08-21, the one line made universal 2026-09-26: Amir left the scope to the
  recommendation)*
- `REC-3` **Separate training fatigue from life load** in every review — a readiness dip from
  poor sleep/stress is not the same as training fatigue (Athlete D's end-cycle dip was
  life, not load). *(2026-06-15)*
- `REC-4` **Never program past a fatigue wall** — build a deload/back-off after dense weeks
  (Athlete D ran 4 sessions in 5 days in C2 and hit a wall). *(2026-06-15)* Every cycle's
  last week is that back-off, written as `weekNotes.last` (Process → 5 cycles of 5 weeks).
- `REC-5` **Concurrent athletes (heavy sport schedule alongside the gym) always get a double-day
  rule in autoregulation.** When most gym days will also be sport days, the program must say
  what to do on one: gym after the sport session, or at least 4–6 h apart; if the gap is
  impossible, run the minimum effective dose with the primary capped at RPE 6. Silence on
  double days is a design gap, not a detail — at 5–6 sport days/week they are the norm, not
  the edge case. *(2026-08-02, Athlete J C1 — caught by the dose/time audit)*

## Session structure & time
- `SES-1` **`workouts.days[]` is authored in the best execution order.** The order days appear in
  the app IS the recommended weekly sequence (e.g. Lower → Upper → Walk-Run → Control →
  Recovery) — the athlete reads the week top-to-bottom, then the notes tell her she may
  shuffle around her schedule (within the stated invariants). Never list days in
  design-convenience order and rely on a notes card to re-map them. *(2026-07-24, Athlete I C1
  — shipped with the run day after the control day; Amir had the order corrected to the
  ideal week and the days renumbered.)*
- `SES-1` **An OPTIONAL day still sits in its correct place in the week — you mark it optional, you
  don't move it.** Optionality is a label on the day, never a reason to demote it to the end of
  `days[]` or to order the week around the loaded days alone. Author every day in the best
  execution order — restoration/recovery days included, since *where they fall between loaded
  days* is the whole point of them — then write "optional" on the ones that are. A restoration
  day parked after the last lifting day reads as an afterthought and loses the spacing it was
  designed to provide. *(2026-08-07, Amir, on Athlete K C1)*
- `SES-2` **A day trains what it says it trains — upper work on upper days, lower work on lower days.**
  Never sprinkle a muscle onto the wrong half of the split to top up its weekly total. The day's
  identity, its prep circuit and its fatigue profile are all built for one half of the body, so a
  stray delt raise on a glute day is warmed up by nothing and lengthens a session that was already
  dosed. If a muscle is under its target, add the volume on the days that actually train it.
  *(2026-07-27, Amir — Athlete G C2 put a rear-delt raise on the glute day and a lateral raise on the
  single-leg day as "adherence insurance" for an athlete who reliably skips her back-half days.
  The legitimate fixes for that are **day ORDER** — put the priority day first, where attendance
  is highest — and the short-week/minimum-dose protocol. Not contaminating the split.)*
- `SES-3` **Warm-up + preparation is always 10–15 minutes** — never a token 5-min cardio bookend.
  The full prep (cardio raise + mobilisation/activation circuit) should occupy 10 min
  minimum, up to 15. This is programmed time, not filler: it primes the patterns trained
  that session and is part of the dose. *(2026-06-19)*
- `SES-4` **What goes in a warm-up.** *(Amir's rules from 2026-06/07, kept until 2026-09-26 only in
  /program-edit's checklist and memory, where the design pass never saw them.)*
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
  *(2026-06-19; rx wording 2026-09-26)*
- `SES-6` **Lifting-day warm-ups can repeat rounds; cardio/running-day warm-ups shouldn't.** A prep
  circuit before a *lifting* session is fine at ×2 rounds of a tight movement list (repetition
  reinforces the pattern before loading it). A prep circuit before a *cardio/running* session
  should instead build progressively through **more distinct movements in a single pass**
  (mobility → activation → dynamic movement → plyo/stride primer) rather than repeating the
  same short list twice — that progression is the point, not the rep count. *(2026-07-08)*
- `SES-7` **Time-limited clients (esp. tennis): cap sessions ~45–50 min.** Power work (low volume,
  long rest, few reps) is naturally shorter and fits the constraint. *(2026-06-15)* Only for a
  REAL limit: see the next bullet.
- `SES-7` **The session length on the intake form is a starting guess, not a limit.** Athletes who write
  "I only have 60 minutes" routinely spend 75 in the gym and never complain, which means they
  could do more. Design to what the logs show (the real minutes per day), not what the form says,
  and never cut useful work to fit a stated cap. A cap binds only when there is a real hard stop:
  the athlete says so plainly, the logs show sessions cut short, or they complain about length.
  When a design runs past the form's number, say the expected real length at the checkpoint and
  move on. *(2026-09-26, Amir, verbatim: "sometimes an athlete when filling the form say i only
  have 60 minute, but then eveytime they go to the gym, they spend 75 minutes, and they NEVER
  complain, it means they could do more 😃 so days time cap, is usually not very important")*
  **A new athlete has no logs yet: design to the form's minutes plus 15** (Amir, same day,
  "form + 15"), unless they said plainly that the time is a hard stop.
- `SES-8` **No competition calendar unless Amir names one.** Design the 5×5 arc straight through; if an
  athlete has tournaments or a season that should bend it, Amir says so. *(Amir, 2026-09-26: "if
  there is, i would tell you so, otherwise assume no")*
- `SES-9` **Sequencing:** power/CNS → primary strength → accessories → corrective/core. *(2026-06-15)*
- `SES-9` **Standard section (block) names** — Activation & Prep → [power] → Primary → Accessory →
  Core → [conditioning]; use these so the app's section headers stay consistent across
  athletes (Core holds all core work *including bracing/anti-movement & carries*). The full
  list with order + holds + icons lives in **SCHEMA.md → "Standard section names"** (single
  source — don't re-enumerate it here). *(2026-06-17)*
- `SES-10` **Superset non-competing pairs** to save time. *(2026-06-15)*
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
  and the time-saving trade-off is the whole point there. *(2026-07-18, Athlete L C2 —
  Single-Leg Dumbbell Hip Thrust had been mistakenly tagged as a superset partner for
  Front-Foot-Elevated Split Squat, the only such instance across every multi-primary day in
  this athlete's entire file; tag removed.)*
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
  destroys the resolution they were already giving you. *(2026-07-05, Athlete M C1; again
  Athlete Q C1, caught 2026-09-15 on Amir's review — three supersets had been merged in
  mid-cycle, leaving 5 of 16 working exercises with no baseline going into "Forge — Earn the
  Load", while the Delt pair logged an identical `R1 9 · R2 9 · R3 9` against a prescribed RPE
  7/8 for two sessions running. The same two lifts had logged cleanly per set, with RPE, before
  they were paired. Unpicked back to straight sets; volume unchanged.)*
- `SES-12` **A superset pair is authored as ONE `type: circuit` entry — never two `"standard"`
  exercises each carrying a `"superset"` chip.** The chip-based version breaks the entire
  point of a superset: each `"standard"` exercise gets its own independent rest timer, so the
  athlete does all of exercise A's sets first (resting between each), then starts exercise B —
  not alternating with one shared rest — and there's no card grouping to show the two
  exercises are even paired. Name the circuit descriptively (`"Push-Pull Superset"`, `"Arm
  Superset"`), never a generic `"Superset A/B"` — the block's name is what communicates the
  pairing. See SCHEMA.md → `"circuit"` type ("Common mistake") and `/program-assemble`
  SKILL.md → "Set type from the design category." *(2026-07-18, Athlete A C3 — shipped across all
  4 days with every superset pair built this wrong way; caught only when Amir asked why the
  pairing wasn't labeled and why the first exercise still had its own rest. Root cause: the
  design SPEC template and this file's own "Chips & modifiers" section both listed `superset`
  as a valid chip/intent value — both fixed alongside this entry.)*
- `SES-13` **Round-format circuits log load** — any superset / complex / conditioning circuit in a
  working block gets an inline weight field *per exercise* + one RPE *per round* (each exercise
  its own weight; the RPE rates the whole round). A circuit in a **warm-up / prep** block logs
  nothing (the pre-session readiness check covers feel). Since 2026-09-15 the **block title
  decides**, so neither needs a flag: `"warmup": true` is back-compat only, and
  `"logWeight": true` is for a genuinely loaded primer in a prep block. See SCHEMA.md → "Circuit
  logging". *(2026-06-17; the block default 2026-09-15, after prep circuits that forgot the old
  opt-out flag had been asking athletes for kilograms on mobility drills)*
- `SES-14` **A library session is as hard as its adaptation needs — it is never capped or softened by a weekly
  budget.** *(Amir, 2026-09-20, verbatim: "the athlete doesn't have to pick 2 or 3. they might only do 1
  so it doesn't matter if they are hard or easy, the difficulty should be based on the adaptation they are
  looking for.")* A library athlete opens ONE session, not a week, so "two hard sessions a week in total"
  protects nobody and only waters down the card that has to be hard. Set intensity from the quality being
  trained (aerobic base RPE 6 · threshold 7-8 · repeat sprints 9) and write **no per-week count into any
  library file**. What stays is spacing that comes from **tissue cost**: 48 hours clear of another hard
  session, and not the day before a match. *(2026-09-20, the twenty new Train-library sessions — the
  planning panel had ruled a shared weekly ceiling across shelves; overruled.)*

## Progression (coach-driven)
- `PRG-1` **Progression is coach-driven from the weekly logs** — the app shows one prescription
  per exercise, so the program is a starting point Amir adjusts each week. *(2026-06-15)*
- `PRG-1` **Set increments from logged data** (RPE/RIR, bar speed), not guesswork. *(2026-06-15)*
- `PRG-1` **Write once per cycle; adjust only on a report.** The program is authored once at design;
  mid-cycle changes happen only when a session report / check-in gives a reason (pain, a
  stall, flagged RPE drift) — never routine tweaking for its own sake. *(2026-07-12)*
- `PRG-2` **Prescribe RPE, never load — with ONE exception: the exercise note.** Chips, cycle notes
  cards, messages, and completion text never contain target weights or kg increments — the
  athlete picks whatever load lands at the prescribed RPE. The one place load guidance may
  appear is that exercise's own `note` field (see *Communication*): a starting-weight
  suggestion drawn from the athlete's own past logs, or how to load, framed around the RPE.
  Coach-side load targets stay in the coaching log. *(2026-07-12)*
- `PRG-1` `PRG-3` **Mid-cycle adjustments are report-driven only.** No self-progression rules in the program
  ("add 2.5 kg when you complete all sets…") — Amir adjusts from the weekly logs and check-ins
  when something is reported. The athlete's job is to hit the RPE and log. *(2026-07-12)*
- `PRG-4` **The RPE printed on a card is the athlete's NORMAL working target and never moves mid-cycle
  — every temporary reduction is explained in the notes, never baked into the prescription.**
  *(Amir, 2026-08-07: "i wont change the program RPE in middle of the cycle … in their program
  you must write their normal effort target, but explain in the notes to reduce rpe for those
  reasons.")* Week-1 calibration and the back-off week are the cycle's **`weekNotes`**, which the
  app shows during that week (2026-09-26, Amir: *"update the app in a way that it can show first
  week or last week"*); a low-readiness day, a medication change, a period week are
  **notes-card instructions to the athlete**. None of them is a lower number authored onto the
  exercise. The card is a stable reference she reads all cycle;
  rewriting it for a temporary condition breaks the week-to-week progression read (a logged
  RPE 6 then means two different things) and forces a mid-cycle edit the program is not
  supposed to need. A genuinely light day in the design — an undulation choice, a low-CNS
  accessory — is different: that IS its normal target and belongs on the card.
  *(2026-08-07)*
- `PRG-5` **The other half of that rule: if the athlete has to START lower, the notes MUST SAY SO —
  and say the number.** The card carrying the normal target is only safe when something
  actually tells her to hold back; otherwise a returning, detrained, deloading, injured or
  brand-new athlete reads RPE 8 on day one and takes it literally. Silence is the failure
  mode, and a card that merely teaches load-finding ("start under what you think and let the
  first set tell you") is NOT that instruction — it explains *how* to pick a weight, never
  that this week's effort ceiling is lower. Whenever the design read says start lower, write
  it where she will meet it: week 1 is `weekNotes.first` (with `rpeCap` or `rpeDrop`), and a
  longer start-lower, like a staged return, is a notes card. Either way it names: **the reduced
  RPE as an actual number** (≥6 — see the RPE-floor
  rules in "Chips & modifiers"), **which exercises it applies to**, and **what moves her back
  to the number on the card**. Triggers: a layoff or detraining, week-1 recalibration, a
  deload/back-off week, a movement new to the client, a staged return from injury, a period
  week. *(2026-08-21, Amir, verbatim: "Remember if some one has to start with lower rpe, you
  mention that in notes." Athlete N C2 shipped RPE 8 primaries to an athlete 16 weeks detrained
  with only a load-finding card and no stated week-1 ceiling.)*
- `PRG-6` **Never prescribe a rep range — always a single rep number.** The app has no rep-range
  field; it prescribes exactly one number per exercise (e.g. `×10 Reps`, never `×8–10 Reps`).
  When the design intent is naturally a zone (hypertrophy 8–10, etc.), /program-design writes the
  one number it means; nobody downstream picks an end for it. This applies to
  every exercise on every day, including circuit items and unilateral (`Each Side`) reps.
  *(2026-07-08, Athlete O C1 — caught 15 rep-range chips across the program and converted them.)*
  **Reconfirmed 2026-09-24** (Amir: *"I don't prescribe rep ranges"*), after a 2026-09-20 schema
  note had briefly said ranges ship as ranges. It matters more now: the set log pre-fills the
  prescribed number and a tick means "done as written", so the one number IS what gets recorded.
- `PRG-1` **The program is written once per cycle and adjusted reactively, not on a fixed rewrite
  cadence.** Amir doesn't rebuild the program every week by default — he steps in on a real
  signal: a logged difficulty pattern (RPE consistently over/under the target) or a wellbeing/
  readiness dip. No signal, no rewrite. *(2026-07-08)*
- `PRG-7` **Never tell the athlete the coach assigns/prescribes a specific weight.** The app has no
  weight-target field for a reason: the athlete self-selects load against the prescribed
  RPE/rep target, and that's the whole mechanism — Amir doesn't hand her a number. Athlete-
  facing text (cycle message, notes, completion messages) must never imply otherwise (e.g.
  "I'm setting your loads", "I calculate your weight next cycle"). Frame progression as the
  *program* changing — RPE targets, rep ranges, exercise selection — driven by what she logs,
  never as "here's your number." *(2026-07-08, Athlete O C1 — caught two athlete-facing lines
  that implied weight assignment and reworded them.)*
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
  cycle. *(2026-07-08, made conditional 2026-07-12)*
- `PRG-9` **Check the RPE-10 rate before a logged RPE drives a decision.** New athletes often tap the
  per-set RPE button that matches their prescribed reps, as if it were a "reps done" field: a set
  of 10 logs "@10", while exercises prescribed ×12 or ×15 log no RPE at all (the selector only
  offers 6–10). Checked across every athlete on 2026-09-05: first-cycle athletes logged up to 96%
  of their RPE-carrying sets at 10, against 0–14% for everyone with ten or more sessions, and it
  fades with exposure. So above ~30% at 10 in the first ten sessions the per-set RPE is not
  effort: write no starting-load note from it, and settle the question with a filmed set, never by
  asking. /cycle-report reports the rate. *(2026-09-05; into the rules 2026-09-26, when the audit
  found it living only in memory)*

## Volume & dosing
- `VOL-1` **Volume is a report, not a rule, for a sport-performance athlete.** Show programmed
  sets/muscle vs the goal range vs a verdict; frame an under-dose as "maintenance" for
  time-limited clients (not failure), and say where to invest if/when time allows. *(2026-06-15)*
  When the programme's aim is strength and muscle, the 10-set floor below is a rule instead.
- `VOL-2` **Manage load per DAY, not just per week — weight by systemic cost, then undulate.**
  Raw set count lies: 21 isolation sets ≠ 13 heavy-compound sets. Weight each working set
  by neural/systemic cost (heavy compound ≈ ×1.5, moderate compound ≈ ×1.0, isolation ≈
  ×0.5) to read the true per-day load. Then give each day a deliberate **load identity** and
  **undulate the week** (one peak / one–two moderate / one low day) rather than four flat
  "RPE 6, everything matters" days. For poor-recovery clients (low sleep, high stress) this
  is the *primary* lever — distribution beats total volume. Check three things every review:
  (1) cost-weighted load per day, (2) that no two high-load days for the same pattern sit
  back-to-back, (3) session **length/grind** (a 7-exercise day spikes cortisol even at low
  RPE). *(2026-06-19)*
- `VOL-3` **Evidence-based volume ceiling for hypertrophy: ~10–20 hard sets/muscle/week, most of the
  benefit captured by ~10; per-session, ~5–10 sets/muscle is likely near the sweet spot in
  trained lifters** (Barbalho 2019 RCT in trained women found 5–10 sets/session matched or beat
  15–20). Don't stack a single session past ~10 direct sets on one muscle — spread it instead.
  Use this as the working ceiling when sizing weekly/per-day muscle volume, not just intuition.
  *(2026-07-08, sc-research brief — Schoenfeld 2017, Iversen 2022 umbrella review, Pelland 2025
  meta-regression, Barbalho 2019, Krause Neto 2025 for glute-specific)*
- `VOL-4` **When the programme's aim is to get strong and build muscle, every major muscle clears ≥10
  working sets/week — a hard floor, not a target** (quads, hamstrings, glutes, back, chest,
  shoulder; any athlete, any sex). *(Amir, 2026-09-26, verbatim: "its a floor for when the program
  aim is to get strong and build muscles, that rule is based on science of hyper trophy, for
  athletes, do what is best for them and their condition.")* It began as the women's lower-body
  rule below and now covers the aim, not the sex. A sport-performance athlete (tennis, padel)
  gets what is best for them and their condition, and their volume is a report. The checker
  applies it with `--floor`; a muscle excused for a stated reason (chest on a rounded-shoulder
  client, below) goes on the spec's `floor-except:` line. Where it began: **women's lower body,
  quads, hamstrings and glutes each ≥10.** The 10–20 range above is a rule to satisfy, not a band to approach from
  below. Never sign a major lower-body muscle off as "maintenance by design" just because it isn't
  the athlete's headline goal — under 10 needs a stated, genuinely good reason, and "it's
  secondary to her physique goal" is not one. Where the sets go: the day with the lowest
  cost-weighted load and spare time (see the bullet below), and prefer movements the athlete
  hasn't seen in the prior cycle so the added volume also reads as new. *(2026-07-27, Amir,
  verbatim: "specially for women every major muscle in lower body should get at least 10, this is
  a hard rule, unless you have a very good reason not to" — Athlete G C2 first shipped with quads at
  5.5 and hamstrings at 7.5 sets/wk, both wrongly justified as secondary-by-design.)*
- `VOL-5` **Check for unused session-time budget before calling a day "done."** Estimate the day's
  actual working time (sets × rest + set duration) against its time cap (the athlete's real
  session length, not the form's number: see 2026-09-26 under Session structure) — if there's real
  headroom (15+ min) and the athlete's recovery capacity allows it, that's free volume, not a
  reason to stop. Fill it with low-priority, low-CNS-cost work (arms, calves, a secondary
  muscle under its dose range) rather than leaving the session light. A session with room to
  spare and nothing added in it is an under-dosed session, even if every individual exercise
  looks reasonable on its own. *(2026-07-08, Athlete O C1 — first draft left 20–25 min unused
  on three lifting days; caught only because Amir compared it against her training age.)*
- `VOL-6` **The PATTERN is deferred; the EFFORT never is.** Any cycle that withholds a movement pattern
  (axial loading, the free hinge, cutting) must still carry a real strength benchmark the athlete
  has to hit in the patterns they DO own. Without one, "train them hard inside what's safe" stays
  a sentence in the rationale and quietly doesn't happen — and the programming itself tells the
  athlete you think they are breakable. *(2026-08-08)*
- `VOL-7` **The SHOULDER is ONE muscle group, scored on the normal 10-20 range — press, side delt and rear
  delt all count against the same total.** Rear delt is not a separate budget. The line that makes
  this workable: **rear-delt work counts as shoulder, scapular retractors count as back** (rows,
  Y-T-W, face-pull-style retraction into the mid-back), so a posture cycle can push back volume up
  without inflating the shoulder number. *(2026-09-05, Amir, verbatim: "The whole shoulder total
  load should be 10 sets total. So if she is doing rear delt, it counts" and, when the rewrite
  landed at exactly 10, "10 is not a cap, 10-20 is good." Athlete G C3 first drafted at 26 shoulder
  sets/week by scoring each head against its own 10-20 range.)*
- `VOL-8` **Never more than 4 working sets on one exercise, until the athlete has PROVEN more in our own
  logs. If a muscle needs more volume, ADD AN EXERCISE.** *(2026-09-05, Amir, verbatim: "For an
  intermediate athele, never go for more than 4 sets in an exercise. Always add a new exercise. This
  is a rule." Scope set 2026-09-26: "some people call them selves pro, or they say that they have a
  long experience of gym training, but practically, they are very week, so doing 5 sets of
  something, will hurt them, but if we have an athlete , who proved him self, in the logs, and in
  our cycles, why not go over than that.")* What the athlete says about their experience never
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
  *(2026-09-05, Athlete G C3 — chest held at 3 sets against a 10-20 range, deliberately.)*
- `VOL-10` **⚖️ COUNT EVERY EXERCISE THAT LOADS THE MUSCLE, NOT JUST THE ISOLATION WORK — and show the
  working in the coaching log.** *(2026-09-08, Amir, verbatim: "why are you calculating hamstring
  work just by isolated movements? she is getting them from rdls, hipthrusts and other stuff, all
  the muscles are like this, why are you focusing too much on isolation movements? … when the
  machine is not there, just being able to hit the minimum of 10 sets a week is good" and "i know
  sometimes you count some exercises as 0.5 a set, which is ok".)* The convention:

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

  **Why this is a rule and not a preference:** scored isolation-only, a muscle can read as
  under-dosed when the athlete is training it hard through compounds, and the programme then gets
  contorted around a number that was never true. Athlete G C3 read hamstrings 11 direct-only and a
  seated leg curl looked load-bearing; counted properly it was 14.5, and the same pass revealed
  glutes at **22 — over the 10-20 ceiling** — which the old convention had scored 13. The error
  runs in both directions. **A missing machine is not a reason to contort the programme:** clear
  the 10-set floor with what the gym has and move on.
- `VOL-11` **A new athlete with no known lifts: no weighted exercise under 8 reps in the first cycle.**
  Unweighted landing and jump drills (a snap down at 3 × 5, pogo contacts) and warm-up counts are
  exempt. Heavier, lower-rep work waits until the first cycle's logs and films show what the
  athlete can really do. *(2026-09-24, Amir, verbatim: "i dont want to start with anything less
  that 8 reps in first cycle, because i dont know how good of athlete or how strong she really
  is". Saved as a principle 2026-09-25.)*

## Testing
- `TST-1` **Light testing only:** derive an estimated 1RM from the heaviest logged set each cycle
  and track it cycle-over-cycle. No separate test day. *(2026-06-15)*
- `TST-3` `TST-4` **A baseline max-rep test is an AMRAP to TECHNICAL failure, filmed — never an unstated
  all-out set.** The set ends at the first rep that slows, shortens, or breaks position
  (~2 shy of grind), and if the cycle carries an RPE ceiling, the test is written as an
  explicit, stated exception to it — two lines of a program must never give opposite
  instructions for the same set. *(2026-08-02, Athlete J C1 — all three audit lenses
  independently caught the unstated contradiction)*
- `TST-2` `TST-3` **No test goes to a grind: every max-effort set stops at the first rep that slows, shortens or
  breaks position.** A flagged rep-max retest (`test: 5RM`) is one set of 3–5 reps at about
  **RPE 9**, one rep left, never RPE 10. That is accurate enough for The Ceiling (a *Good*
  estimate) and safe for an athlete training with nobody next to them. A new athlete's baseline is
  the AMRAP above. Never a true 1RM. *(2026-09-26: Amir left the test effort to the
  recommendation; this settles the design skill's old "genuine RPE 9–10" against the rule above.)*

## Communication & in-app text
- `COM-1` **In-app athlete text (message, outcomes, notes, completion) is ENGLISH.** *(2026-06-15)*
- `COM-2` **The WhatsApp handoff messages are PIPELINE OUTPUT, and they are written in the ATHLETE'S OWN
  LANGUAGE — not English, and not on request.** *(Amir, 2026-08-08: "this actually should be part
  of our program writing pipeline.")* Every finished programme ships with two: **(1)** the
  introduction — link, why their programme looks the way it does in plain words they recognise
  from their own body, the week's shape, what they'll have by the end; **(2)** what to watch for —
  what to film and what it unlocks, dated appointments + escalation triggers, the weekly measures,
  fuelling, the rest rule, and the modification menu. Farsi for Iran-based athletes, English
  otherwise. In Farsi use Persian numerals and put the **Persian calendar date first** with the
  Gregorian in brackets. These never enter the programme — the in-app text stays English.
  Message 2 names the back-off week with its dates. Owned by /program-engage PART 5. *(2026-08-08)*
- `COM-3` `COM-4` **⚠️ EVERY word an athlete reads must sound like AMIR wrote it — not like AI wrote it.**
  *(Amir, 2026-07-30, verbatim: "write in a friendly human voice, dont let them think ai wrote
  these, let them think i wrote them, and my english is not very high level.")* This governs
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
  trunk"). *(2026-07-24, Athlete I C1 — Amir couldn't map "Control day" to anything in the app.)*
- `COM-6` **Exercise-scoped guidance goes ON the exercise — the `note` field.** Anything about one
  specific exercise (an injury caveat like "start slower", a starting-weight suggestion from
  the athlete's past logs, how to load it) is authored as that exercise's `note`, which the
  app renders as a highlighted clay "Coach's Note" (pill on the collapsed row + callout in
  the expanded card) so the athlete pays attention. The cycle notes cards carry only
  program-wide guidance. See SCHEMA.md → "Exercise coach's note". *(2026-07-12)*
- `COM-7` **Coach-facing reports** (the two volume tables) print in chat for Amir — never in the
  athlete app or the programme. They are also archived per athlete in the coach-only
  `public.coaching_logs` row, append-only (it was `.claude/coaching-log/<id>.md` until 2026-09-07,
  in a public repo; that folder is gitignored now and never comes back). *(2026-06-15, archive
  added 2026-06-28. The progression-sheet and e1RM sections were dropped 2026-09-26: Amir doesn't
  read them.)*
- `COM-8` **Personal note bodies (`notes.cards[].body`) render as real HTML, not one paragraph.**
  The app used to escape this field to plain text — it now renders `<p>`, `<ul><li>`,
  `<strong>`, `<em>` (fixed `2026-07-08`, see `program.html` "note-body" CSS + `renderNotes()`).
  Write 2–4 short paragraphs (one idea each), reach for a bullet list the instant content is
  enumerable (rules, steps, a keep/cut/skip breakdown), bold the one key phrase per paragraph.
  A note that opens as a dense wall of text is a bug, not a style choice — see SCHEMA.md →
  "notes" and program-engage SKILL.md PART 3. *(2026-07-08, caught on Athlete O's "How To
  Progress & Regress" note.)*
- `COM-9` **Every required note is on the spec's obligations list, and the checker holds engage to it.**
  *(2026-09-26, from the pipeline audit: engage's own list of required notes had left out the
  back-off week, "start lower and say the number", the film gate and the weigh-in, so those rules
  changed nothing.)* Design lists the keys that apply (`backoff`, `week1`, `explainer`,
  `pain-ladder`, `modification-menu`, `film`, `weigh-in`, `double-day`, `low-readiness`, `period`,
  `start-lower`, `close-loop`, `win`); engage writes each and tags its card; the same list drives
  WhatsApp message 2 and Amir's handoff. A required note is written first, before the breadth.
- `COM-10` **Notes card count is a byproduct, not a target — never pad.** Write every mandatory note
  that applies plus whatever else is genuinely load-bearing this cycle; a simple cycle with
  less to say gets fewer, sharper cards. Manufacturing a card to hit a number produces exactly
  the generic filler the "athlete-specific only" rule forbids. *(2026-07-12)*
- `COM-11` **Celebrate a genuine win every cycle, on its own card — never manufacture one.** A lift
  that moved, a habit that stuck, a hard week survived, an adherence streak: give it its own
  card, not a caveat buried inside a corrective note. Retention runs on the athlete feeling
  seen for what's working, not only corrected on what isn't — but an invented win reads as
  hollow and undercuts the real ones. Some cycles genuinely have no big one; don't force it.
  *(2026-07-12)*
- `COM-12` **A cycle notes card and its matching exercise Coach's Note don't repeat each other.** When
  the same issue has both (e.g. a standing injury protocol), the card states the full
  protocol/stop-rule ladder once; the exercise note gives only the point-of-action specifics
  for that exercise (starting depth, load, cue) — it never re-explains the ladder. *(2026-07-12)*

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
  the number under their feet. *(2026-09-05, Amir: "if some one like Athlete K need to monitor her
  weight, add a note in their app and point it to them so they start using it". Moved 2026-09-12;
  this bullet still said Proof until 2026-09-26, and two programmes written that week sent athletes
  to a Proof button that no longer existed.)*

## Coaching cues
- `CUE-1` **Exactly 3 cues per exercise — never more, never fewer:** one **external** cue (an
  action/focus *outside* the body — where to push, what to move toward), one **internal**
  cue (what to *feel* — the target muscle/sensation), and one **avoid** cue (the single
  mistake that most risks injury). They are written once, for anyone (next bullet), so a point
  about one athlete's training age or history goes in their Coach's Note, not in the wording. On
  the Spine entry the external + internal go in `cues.good[]`, the avoid cue in `cues.bad[]`.
  *(2026-06-17; "calibrate to training age" retired 2026-09-26, it contradicted one set of cues
  for everyone)*
- `CUE-1` `CUE-2` **The cues live on the exercise, not the athlete.** Each exercise's three cues are written once,
  on its Spine entry (`public.exercises`, edited in coach.html → Exercises), and every athlete's
  card shows them. A programme carries **no cues**. Something only this athlete needs (an injury
  limit, a range, a side, a home-kit setup, a fault seen on video) is the exercise's **Coach's
  Note**, one sentence, never a cue. A point that would help anyone is a change to the Spine entry.
  Spine cues are written for anyone: no athlete, no side, no home furniture, no tempo, no dose.
  *(Amir, 2026-09-24: "the aim is to use these cues for all the exercises that everyone has from
  now on … if there is a cue for someone specific, it should be in coach's notes. thats why its
  there")*
- `CUE-3` **Never create a new pill.** An exercise's quality pills come from the ten (Strength, Muscle,
  Power, Spring, Speed, Brakes, Rotation, Engine, Armour, Movement), which cover every physical
  quality, and its pattern pill from the library's own list (Squat, Hinge, Single leg … Jump & land,
  Sprint & change of direction, Conditioning). Use those; never invent another of either kind.
  *(Amir, 2026-09-25: "we only use the 10 pills which cover everything … remember to never create new
  pills", and on the pattern pills, which he had first taken for extra qualities: "pattern pills are
  good, if its ones i created in my library, ofcourse use them")*
- `CUE-4` **Every programme write leaves the Spine more complete.** At the end of writing or editing a
  programme (or a library workout), every exercise it used is checked against the Spine: a missing
  one is drafted, empty fields are filled, and a better general cue is applied to a draft or
  proposed for an approved entry (`/spine` → Upkeep). *(Amir, 2026-09-24: "so everytime i write a
  program for an athlete, this gets more complete")*
- `CUE-5` **Claude drafts library entries; only Amir approves them, and before the programme
  publishes.** A card shows cues only from an approved entry (`get_exercises()` serves approved
  rows only), so a new exercise's entry is drafted in the same run and put to Amir as one question
  at the top of the handoff: *"approve these N so their cards show cues?"* Never approve one
  without his word, and never put anything about one athlete on an entry. *(2026-09-24, the
  Spine. Approval moved before publishing 2026-09-26: a first cycle had gone live with seven new
  drills as bare drafts, and every one of those cards was blank.)*

## Chips & modifiers
- `CHP-1` **No floating text on a card.** Nothing goes on a programme card as a grey `setup` line. A
  detail for this athlete (a hand position, a bench, a range, how a drill is called) is the
  exercise's Coach's Note; on a circuit item, the circuit's note. *(Amir, 2026-09-25: "i suggest you
  put them in coaching notes as i dont like floating text and remember this")*
- `CHP-2` **A modifier (`intent`) chip must be something the athlete actively does or holds in mind
  that set** — a tempo/pause emphasis (`3s eccentric`, `2s top hold`), a sequencing order
  (`right leg first`), or an effort cue (`max intent`). **A superset/complex pairing is never
  a chip** — it's a structural decision (see "Session structure & time" below): the paired
  exercises become one `type: circuit` block with a shared name + rest, not a `"superset"`
  chip on a standalone standard exercise. A modifier chip is also never a restatement of the
  target muscle or exercise category — if it just re-labels what the exercise already trains,
  especially when that's already said in the internal cue right next to it, drop it; it's a
  label, not an instruction. Test before adding one: could the athlete act on this mid-set, or
  would removing it lose nothing? *(2026-07-05, Athlete M C1 — dropped "knee control," "adductor
  focus," "anti-rotation," "no push-off," "dysplasia stability" as redundant with cues/
  rationale already stated elsewhere on the card. 2026-07-18, Athlete A C3 — this file itself was
  found listing `superset` as a valid chip value, alongside the same mistake in SCHEMA.md's
  chip tables and the design SPEC template; all three fixed the same day, see "Session
  structure & time.")*
- `CHP-3` **Hold exercises write `Iso` in the Tempo — Amir's rule, verbatim (2026-07-24): "if
  it's a hold exercise, in the Tempo write Iso."** Every isometric/hold prescription
  (iso holds on a machine, planks, wall sits…) is `rx.tempo: "iso"` with the hold as
  `rx.time`, so the card's TEMPO cell reads **Hold** and the athlete knows it's one
  continuous hold, not reps. Pairs with the canonical-name ruling in "Exercise naming" — name
  stays library-canonical, the tempo cell + note carry the execution. *(2026-07-24, Athlete I
  C1 — applied to the leg-extension holds and Side Plank. rx wording 2026-09-26.)*
- `CHP-4` **The app's RPE selector runs 6–10 — never prescribe an RPE below 6, anywhere.** Any
  sub-6 intent (easy run, recovery walk, low-effort control drill) is authored as **RPE 6**
  (the scale's floor = easy/conversational), or `rx.rpe` is left out entirely on a
  `simple` item that doesn't need grading. A prescribed RPE the athlete literally cannot
  select in the logger is a mismatch, not a nuance. *(2026-07-24, Athlete I C1 — shipped with
  RPE 4/5 on the walk-run, a step-down, and a recovery walk; Amir caught the selector
  mismatch and all three were raised to 6.)*
- `CHP-4` **The 6 floor binds INSTRUCTIONS as well as the card — any note telling the athlete to take
  RPE off must name the floor in the same sentence** (the cycle's `weekNotes` too). Auditing only the RPE chips passes a
  program that still sends her below 6, because the autoregulation card does the subtracting
  at runtime: "drop every RPE by 1 on a low-readiness day" lands on **RPE 5** for every
  exercise authored at 6, and she cannot log it. Write it as *"take 1 off every RPE, but
  never go below 6 — anything already at 6 stays at 6."* Same for a period-week card, a
  deload note, a double-day rule, or a Coach's Note. Sweep every athlete-facing string for
  sub-6 RPE, not just `rx` (`scripts/check_program.py` does). *(2026-08-21, Amir, on Athlete N C2: "Again you prescribed rpe
  5 but my app minumum is 6. That is a hard rule." The chip lint was clean; the notes card
  was the leak.)*
- `CHP-5` **A prescription is DATA: the `rx` object, never `chips[]`.** `rx` holds `sets`, one of
  `reps` / `time` / `distance` / `work`, `side`, `rpe`, `tempo`, `rest` and `rounds`, and **an
  absent field means not prescribed**: the card draws no cell for it, so nothing is invented
  (rest used to default to 2 minutes, so a calf raise and a back squat showed the same rest).
  Legacy `chips[]` is still read by the app and never written. Full spec: SCHEMA.md → `rx`.
  *(2026-09-20, Amir: "sometimes we have to write the time, in the reps chart … and sometimes the
  pills get mixed up.")*

## Naming
- `NAM-10` **Cycle names are cool & evocative** — punchy 1–2 word power-names (Foundation Forge,
  Volume Engine, Bedrock), never dry labels. Set in /program-roadmap. *(2026-06-15)*
- `NAM-11` **Day names (`focusTag`) have sports-headline energy** — vivid, write them like a sports
  writer trying to make the athlete *want* to train ("Built From The Legs Up", "Press, Pull,
  Repeat", "Whole-Body Workhorse"), never spreadsheet labels ("Upper Body & Press" ✗). The
  picture comes from the day's own `art` word now, so the name is free; the keyword scan is
  only the fallback for days without one (SCHEMA.md). *(2026-06-15; art word 2026-09-19)*

## Process
- `PRC-1` **Writing a programme never touches the app. Ideas go to Amir; they are not built.** No edit to
  `program.html`, `coach.html`, `habits.html`, `assets/js/*` or any other page while a programme is
  being written, corrected or delivered. A better way to prescribe something, a bug seen in passing,
  a new idea: say it in the handoff and let him decide. The one change a programme run may make
  outside the programme is the library: a newly prescribed exercise added to the Spine in full,
  cues and all, linked like the others. *(Amir, 2026-09-25, verbatim: "this is a strict rule, you
  cant do that, when you write a program and you deliver, dont touch the html file, if you see
  anything or want to prescribe better in a way , or have a new idea, share it with me, dont change
  everything. the only thing that you can change, is that , when you actually prescribe a new
  movement or exercise, it should have cue, should be connected to our spine like other ones")*
- `PRC-2` **A correction changes exactly what Amir named, and nothing else.** Asked to fix one thing on a
  delivered programme, fix that thing: no exercise removed or swapped, no section renamed, no note
  or message rewritten on the side. Anything else that looks wrong is a question for him. *(Amir,
  2026-09-25, after a request to turn grips into chips came back with a rebuilt Day 3, rewritten
  notes and seven exercises gone: "why did you changed her program and removed some of the
  exercises?")*
- `PRC-3` `PRC-4` **Every design pass is checked, and reviewed where judgment is needed — Amir's standing
  order, not an option.** *(Amir, 2026-07-24, verbatim intent: "it should happen for every
  single program you want to write for me." Reshaped 2026-09-25, when a new athlete's first
  programme took about 2 h 40 min of work, 70% of it two multi-agent panels, and about 50
  approval prompts. Amir, on the five fixes: "yes, do all five".)* Two shapes:
  **(1) Roadmaps** (/program-roadmap): ONE coherent pass, then ONE independent reviewer.
  Claude reads the athlete first (recovery ceiling, restrictions, goal order, the bottleneck),
  weighs two or three arcs in one place, and writes the one it would defend, with a short
  rationale and an exit test for each cycle. One reviewer agent (files only) then critiques the
  finished arc against the brief and this file, and every must-fix is applied. It locks without
  Amir's sign-off (Amir, 2026-09-26: *"no doesnt need me"*). No literature search unless Amir
  asks for one. *(Reshaped 2026-09-26 on Amir's "you decide what gets the highest quality
  program". The old shape, three independent arcs merged by grafting, produced the recorded
  roadmap errors (a 6-cycle arc; "do not add a fifth cycle"), and a grafted cycle loses the
  sequence logic that made it fit its own arc. A critic of ONE finished arc keeps the second
  opinion without the grafting.)*
  **(2) Cycle designs**: Claude drafts the spec with full context (the STEP 1 checkpoint with
  Amir still comes first). The built programme then goes through `scripts/check_program.py`,
  **straight after design and BEFORE engage writes a word** (/program-assemble Part A, since
  2026-09-26), and every FAIL is fixed in the spec: the 10-set floor (strength-and-muscle aims only, `--floor`), the
  4-set cap (`--proven` once our logs show more), the new-athlete rules (automatic on a first
  cycle), a banned movement in any exercise or fallback, RPE floors in every note, the week-1
  and back-off notes (`weekNotes`), back-to-back days, the Spine gate, and (since 2026-09-26) the
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
  half. *(2026-07-24; reshaped 2026-09-25)*
- `PRC-5` **Background agents work from files, never the database.** Before launching a lens or a
  reviewer, write everything it needs (brief, spec, Spine slice, built programme) into
  scratchpad files, pass their real paths, and tell it in so many words not to call the
  database or any MCP tool. A background agent's approval prompts do not reach Amir: on
  2026-09-24 two reviewers sat 12 and 13 minutes on unanswered database prompts and the run had
  to be killed. The one agent that must read the database, `athlete-brief`, runs in the
  foreground. And never launch a Workflow with placeholder arguments (the first launch that
  day went out with `"SEE_FILE"` and had to be stopped). *(2026-09-25)*
- `PRC-6` **Ask the database as few times as possible.** One lookup at intake, one context pull at the
  start of design (athlete row, sessions, log, cycle names, the whole Spine), one Spine query
  for the gate (`check_program.py --spine-sql`), the staged publish, one fingerprint, one log
  write, then the upkeep. Never one query per exercise, and never schema discovery: the
  skills name the tables and columns. *(2026-09-25: a new athlete's first programme made 43
  database calls, 36 of them lookups, and each one stopped for Amir's approval.)*
- `PRC-7` **Every progression gate resolves to a MEASUREMENT, a FILM, or a THIRD PARTY — never the
  athlete's word.** That includes a gate written against "their log", because the log is them. For
  any athlete with a history of training through pain, a self-reported gate is not a gate. Ask in
  forced-choice comparatives they cannot answer with "fine" (*which side is stiffer this week ·
  how many strokes before it starts · what did it stop you doing*), never yes/no or open. *(2026-08-08)*
- `PRC-8` **A FILM gate is not real until the athlete is told to film.** Deciding a criterion resolves to
  video (see above) is a design-time call — it only works once /program-engage turns it into an
  explicit notes card: which exercise, which weeks, where to send it, and the consequence if it
  stops. Precedent, verbatim: *"These lifts are new to you and I'm not standing next to you, so
  video is how I coach you… weight goes up on those three only after I've seen the film and
  cleared it. If the videos stop coming, the weight stops moving."* (Athlete J C1, `📹 Film your top
  sets`.) A film-gated exercise with only a design-side `note_flag` and no matching notes card is
  a gate that exists in the coach's head and nowhere the athlete can actually read it — the
  exercise-level Coach's Note tells him what to do *on the lift*, this card is what tells him the
  video is mandatory and what happens without it. *(2026-08-08)*
- `PRC-9` **⚠️ STAY IN SCOPE: track SYMPTOMS and PERFORMANCE. Never build a joint-assessment battery —
  that is a physio's job.** *(Amir, 2026-08-08, verbatim: "im a strength and conditioning coach.
  how am i supposed to work with hip turn or wrist and upper back turn measurement? i havent
  studied those. we should just talk about symptoms, if anything hurts, refer. and try to mobilise
  and strength. but its a physio job to asses.")* A monitoring stack may contain **only** what an
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
  from pain into assessment. *(2026-08-08)*
- `PRC-10` **The monitoring stack stays SMALL — five measures run religiously beat fifteen that get
  abandoned.** An abandoned monitoring system is worse than a minimal one, because gates then get
  passed on nothing at all while everyone believes they were measured. Cut every metric that does
  not feed a gate or a deload trigger. *(2026-08-08)*
- `PRC-11` **A gate that depends on someone ELSE acting is scoped to a variable, never to whole-cycle
  progression.** If the athlete met every training criterion but a third party has not booked the
  appointment, hold back density or volume — do not repeat the cycle. A six-week block repeating
  because a parent has not made a phone call is a scheduling failure wearing a safety rule's
  clothes. *(2026-08-08)*
- `PRC-12` **⚠️ EVERY program build ENDS with a COACH HANDOFF BRIEF — everything to measure, gate, film
  and watch for, and WHY.** *(Amir, 2026-08-08, verbatim: "if there are things to be measured, to
  gate, to film or to watch for, i should be informed to watch for and think about it… sometimes
  you write something your self, and im not aware of which is stupid. you are my assistant and i
  need to be on top of everything.")* The last thing /program-assemble does, after the JSON
  validates and the log is archived, is tell Amir **in chat**, as its own clearly-headed section:
  every **measurement** he has to take or collect · every **gate** and exactly what clears it ·
  every **film** he has to review and by when · every **date-stamped escalation** (referrals,
  appointments, checkpoints) · and every **decision made on his behalf** that overrides, extends
  or fills a gap in something he said. One line each, each with its reason. It is a to-do list he
  can act on, not a recap of the programming. A program whose coach has to reverse-engineer his
  own responsibilities out of a long design write-up is a handoff failure, however good the
  programming underneath it is. **Anything the athlete must do repeatedly to keep a gate alive
  (filming, weekly measures, an appointment) also belongs in the PLAN he can see** — a cycle
  focus line and/or a `message.outcomes` entry — not only in a notes card. *(2026-08-08)*
- `PRC-13` **Reassessment is scheduled, not only reactive.** You adjust day-to-day on what you observe
  (pain, dislike, readiness), but each cycle also has a defined length and a reassessment
  trigger (e.g. a primary lift stalls ~2 weeks → revisit) — the cycle boundary forces a
  deliberate re-read even when nothing visibly broke. *(2026-06-28)*
- `PRC-14` `PRC-15` **THE ROADMAP IS 5 CYCLES OF 5 WEEKS. 25 weeks. That is the house shape.** *(Amir,
  2026-08-17, verbatim: "the rule is 5 cycles of 5 weeks and you need to remember that.")*
  Cycle count and cycle length are NOT things to re-derive from the athlete's goal, and not
  things a design panel gets a vote on — a panel proposes what each cycle CONTAINS, never how
  many there are or how long they run. Cycle 1 is 5 weeks like every other, so the first
  program /program-design builds is a 5-week program. Deviate only when Amir says so for that
  athlete, and say out loud that you are deviating. *(Written after a roadmap shipped as
  6 cycles of 4/5/5/4/6/5 because the multi-lens panel argued the arc from the science and
  nobody checked it against the house rule.)*
  A second, independent hit the same day: on Athlete P's roadmap the head-coach judge issued
  *"do not add a fifth cycle"* as a binding directive, on the science. It is overruled — fit the
  arc to 5×5 and make the extra block do real work rather than padding it with a retest or a
  maintenance phase. Each cycle runs **4 loading weeks + 1 back-off week**, which is what
  satisfies "never program past a fatigue wall" without a mid-cycle deload.
  **The back-off week has an owner (2026-09-26).** /program-design decides its dose as numbers
  (how many sets fewer, how many RPE points off, or an RPE cap, never below 6), /program-engage
  writes the athlete's words, and /program-assemble stores both as the cycle's `weekNotes.last`,
  which the app shows in the last week, under This Week on Home and at the top of every session.
  Week 1 works the same way through `weekNotes.first`. `scripts/check_program.py` fails a cycle
  without them. *(The audit that day found 16 of 34 live programmes with no back-off at all, and
  no drop in week-5 session RPE across 12 finished cycles. Amir: "update the app in a way that it
  can show first week or last week".)*
- `PRC-16` **One record of who the athlete is today: the athlete profile.** *(2026-09-26, from the pipeline
  audit.)* Goals in order, the bottleneck, days and real minutes, kit, standing bans, injuries with
  their status, recovery, and whether the aim is sport or strength-and-muscle live in a small
  `profile` block at the top of the coaching log, kept current like the Exercise Ledger:
  /athlete-intake drafts it, the roadmap adds the bottleneck, each design updates it (the Debrief's
  profile changes), and a mid-cycle edit that changes a constraint updates it too. Until then these
  facts were re-read from prose every cycle, so a ban could quietly drop out, and the checker was
  told what to check by the run it was checking. `scripts/check_program.py` now reads `aim`,
  `proven`, `bans`, `floor-except` and `cap` from it.
- `PRC-17` **Roadmap is created once and locked** — design/engage read it, never rewrite it. *(2026-06-15)*
  A change the data forces goes through design's `roadmap_amend:` line: what changes and why,
  shown to Amir at the checkpoint and written by assemble. Beyond that, a run touches only this
  cycle's message, `weekNotes` and a gate line in its focuses (PRC-12), and the next cycle's
  teaser. *(2026-09-26, from the pipeline audit: four stages were changing the locked roadmap and
  none of them owned the change.)*
- `PRC-18` **Every cycle's design rationale is archived.** /program-assemble appends the design read +
  locked decisions + ledger changes + the two volume tables to the coach-only
  `public.coaching_logs` row as its last step: append-only, never the programme. Prior cycles are
  never overwritten, so months later you can see how a cycle was thought through and why
  something changed. *(2026-06-28. On the server since 2026-09-07: the old
  `.claude/coaching-log/` files sat in this public repo. Progression levers and e1RM left the
  entry 2026-09-26, Amir: he doesn't read them.)*
- `PRC-19` **An athlete whose cycle ends without a renewal keeps the app, and gets no coaching.** They can
  keep training the programme they have; no new cycle, report or edit is written for them until
  Amir says so. *(Amir, 2026-09-26: "let them, they can have access to their programs, they wont
  get any coaching")*
- `PRC-20` **Cycles continue; they don't reset.** Each cycle reads the prior rationale (the coaching
  log) alongside the data, then **progresses or edits the same logic** — it does not invent a
  new program each month. Change the underlying logic only when a data point forces it (pain,
  a stall, a plateau), and record the why. The locked roadmap is the path; the coaching log is
  the reasoning + what actually happened — read both before designing the next cycle. *(2026-06-28)*
- `PRC-20` **Rationale can be set or revised at any cycle, and the latest is the operative logic.** When
  you land on (or change) the real logic mid-journey — a new rationale at cycle 3 — it becomes
  the baseline the next cycle continues (the log reads most-recent-first). New athletes are
  logged from cycle 1; athletes who predate the log start empty and get their first entry
  naturally on the next design pass — no separate seeding step (the why is Amir's to supply;
  the data only scaffolds it). *(2026-06-28)*
- `PRC-21` **Menstrual-cycle phasing is NOT used** in programming (coach's decision). *(2026-06-15)*
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
  actual exercises, not copied verbatim cycle to cycle. *(2026-07-06, confirm-per-cycle
  2026-07-12)*
- `PRC-22` **Athlete-first; naming & styling are downstream.** The aim is always *what's good for
  the athlete* — get the format, exercise selection and dose right first. Categorizing,
  section names, chips and styling are a mechanical layer applied *after* that, and must
  **never bend the programming logic or burn design energy**. Right training first; correct
  labels and styling fall out afterward. *(2026-06-17)* Two concrete applications: **reps** —
  design writes the one number it means, even when it thinks in a zone, because the number is
  the prescription and the app records it (Progression → never a rep range; assemble never picks
  an end). **Exercise
  Coach's Notes** — design only flags which exercise needs one + why (a `note_flag`, one
  domain-language line); engage drafts the athlete-facing sentence; assemble places it.
  Design's job is *deciding* what needs a note, never *writing* it. *(2026-07-12)*
- `PRC-22` **Design pass = programming first; polish later.** During /program-design put ALL the
  reasoning into the coaching decisions + analysis (athlete read, SFR/transfer selection,
  volume, sequencing, progression). Exercise **names, chips, day names, and formatting are a
  polish pass AFTER the program exists** — nail the right movement + dose first; wording is
  tidied later (/program-assemble format-lints, names finalize in Notion when videos are
  added). Don't burn design budget perfecting names/chips mid-analysis; if a name/chip is
  rough, flag it and move on. *(2026-06-15)*
- `PRC-23` **Skills cite rule IDs; they never restate a rule.** *(2026-09-26, from the pipeline audit:
  "reps are one number" was stated about ten times across CLAUDE.md, this file, three skills,
  SCHEMA and a memory note, and two of those copies said the opposite; a stale body-weight copy
  sent two athletes to a Proof screen that no longer existed.)* A skill says *how its stage
  applies* a rule and cites the ID (`VOL-8`); the rule itself lives only in the index. The checker
  names the rule on every FAIL and WARN, and `scripts/check_rule_index.py` (pre-commit) fails an ID
  that doesn't exist, a Check column the script doesn't back, and a rule with no story.
- `PRC-24` **The cycle's headline quality is reported, never forced.** A cycle's `art` word names the
  quality it builds (`iron` → Strength, `voltage` → Power …), and the week's top two qualities
  should include it. When they don't, the checker warns and Amir hears it in the handoff with a
  recommendation: a quality trained in few, fast sets (power, speed, spring) can sit third while
  the block is right, so keep the week if that work comes first in the day; otherwise add work for
  it or change the art word. **Never add volume only to satisfy the line.** `bedrock`, `peak` and
  `reset` are phases, not qualities, so they have no headline. *(Quality Map 2026-09-24; a WARN
  since 2026-09-26, Amir: "report it, but recommend what you think should happen")*
