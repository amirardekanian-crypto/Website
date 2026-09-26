---
name: cycle-report
description: End-of-cycle report for one coached athlete. Reads the five weeks they just trained (session logs, loads, RPE, readiness, weigh-ins, Personal Records, messages, calls) against what the cycle promised, then produces TWO things. The athlete's cycle report is a WhatsApp message covering wins, what they told Amir, what comes next, what Amir needs from them and three questions. The second is a coach-only "Debrief" section appended to their coaching log, which /program-design reads before the next cycle. Use when Amir says "cycle report", "debrief <name>", "end of cycle for <name>", "how did <name>'s cycle go", "write <name> a report", or in a cycle's closing week before designing the next one.
---

# /cycle-report: the end of a cycle, and the start of the next design

Built 2026-09-24 from the first one, an athlete's Cycle 1 (idea #12, The Debrief). Amir:

> *"i just want the message which is like a cycle report … tell him what he did well, what we are
> gonna do next, what we want more work from him, and celebrate his wins. then we want to update
> the athlete record, because we plan something, we prescribe, then the athlete trains for 5
> weeks, and we need to learn from him in logs, so we need to save the debrief, only the parts
> that affects our coaching decision, to his log."*

**Plan → prescribe → five weeks of training → learn from the logs.** This skill is the "learn" step.

| Output | Who reads it | Where it goes |
|---|---|---|
| **The cycle report** | the athlete | **In chat, as text, ready to paste into WhatsApp.** Amir sends it himself. Never a page, never a file (*"i dont need a file, i liked the content"*). |
| **The Debrief section** | Amir and `/program-design` | Appended to `public.coaching_logs` as `## Debrief — Cycle NN …`. Coach-only. `/program-design` reads it as STEP 1A evidence and answers its **Open** list at the checkpoint. |

**When:** the cycle's closing week (week 5), **before** `/program-design` writes the next cycle,
so the athlete's answers reach the design. Running it after the next cycle is already written
still saves the record, but the questions come too late to shape anything.

Files here: **`queries.sql`** (four read-only queries, tested on real rows) · **`shamsi.py`**
(dates for a Farsi report).

---

## ⚠️ The rules

1. **Every claim carries its number.** "14 of 15 sessions", "squat 20 → 35", never "great
   consistency". The athlete can check it against his own log, so it has to be right.
2. **Never guess what the log can't tell you.** Whole bar or per side, a typo ("250" for 25),
   warm-ups typed into working rows: say what the log shows and ask. The athlete message *teaches*
   the fix ("log the whole bar, bar included") instead of assuming either answer.
3. **Never a weight to lift.** RPE, never load (PRG-2).
   Quoting what he lifted is history and is fine; telling him what to lift next is not.
4. **Promise the retest, never the result.** "We'll measure your broad jump in week 1", not
   "you'll jump 10 cm further".
5. **"What I need from you" is the next step, never the miss thrown back.** State the fact once
   ("RPE only in the first five sessions"), then what to do and why it matters to *him*.
6. **Coach-only stays coach-only.** Nothing from the coaching log, no diagnosis words, no data
   problems he can't act on (a "250" typo is Amir's to know, not the athlete's).
7. **Medical flags never go in the message.** Chest pain, dizziness, fainting, an irregular beat,
   numbness, night pain, pain that is getting worse: Amir asks those himself, and they go in the
   Debrief's **Open** list.
8. **Ask Amir in chat, in one batch.** Film verdicts, what was said on calls, anything sent
   outside the app. **Never with switches on a page**: a page's controls don't reach Claude
   (learned 2026-09-24, when Amir answered on the page and nothing arrived).
9. **Short lists.** At most **4** things in "what I need from you" and **3** questions.
10. **Append, never edit.** The log's earlier sections are never touched (see Step 5).

---

## Step 0 · Which athlete, which cycle

Run **Q1** in `queries.sql` (replace `ATHLETE_ID`). It returns the current cycle (`cycle`: name,
`startDate`, `endDate`, `art`, `focuses`, `message.outcomes`), the next one (`next_cycle`:
name, dates, focuses, `teaser`), the sport and the titles of the notes cards. **Read the note
cards in full too** (`select data->'notes'->'cards' from programs where athlete_id = '…'`). They
hold the cycle's promises ("8 to 15 cm on a broad jump"), its gates ("the weight doesn't go up
until I've cleared the film") and its rules ("week five you back off"). The report checks each one.

If today is before the closing week, say so and ask whether to go ahead (a mid-cycle check-in is
fine, just not a *cycle* report).

## Step 1 · Pull the data

**First, complete the log.** Run the `athlete-brief` agent in **MODE=import**, in the foreground,
with the window (`startDate − 3` to `endDate`). It adds any session that reached Amir's inbox as a
Web3Forms report but not the database (Amir, 2026-09-26: the import is still needed), and returns
one line. Put that line in the Debrief's Sources.

**This report is the evidence for the next cycle** (2026-09-26): /program-design reads the Debrief
as its brief and no longer builds a separate one, so a returning athlete's next cycle starts here.

Then put the cycle's `startDate` and `endDate` into **Q2–Q4** (they open the window 3 days early,
because athletes often start a day or two before the date) and run them:

- **Q2** sessions: date, weekday, day, session RPE, minutes, readiness (composite, sleep,
  soreness), day note.
- **Q3** loaded exercises, one row per session: weights set by set, `top`, `sets_at_top`,
  `n_sets`, reps, RPEs, ticks. It reads `session_history.log` (stage30, from 2026-09-24) and
  parses the text summary for older rows, so both kinds come back the same.
  ⚠ In summaries written before the countersigned set log, every set line ends in ✓, so
  `ticked` is not evidence of ticking on those rows. Use the progress blob's `_setlog_` `d`
  flags, or leave it out.
- **Q4** weigh-ins in the window, Personal Records entries, in-app messages, call logs, and the
  coaching log. (It returns the log's head, profile, Exercise Ledger and roadmap, plus the cycle
  just trained: its design read, its in-cycle edits. Older cycles are left out on purpose.)

## Step 2 · The read (for Amir first, then the athlete)

Work through this list. Each line is a finding only if the data says so.

| Check | How | Why it matters |
|---|---|---|
| **Adherence** | sessions done / (weeks × days per week); name the missed day | The headline win, or the first thing to fix |
| **Tolerance** | readiness avg + lowest; soreness "none" count; session RPE spread; any day notes | "Room to push" or "hold" for the next cycle |
| **Time** | avg / min / max minutes, drop outliers under 15 (a timer left off) vs the design time in the log | The next cycle's time cap |
| **Load trend** per primary | `top` per week, first → last | The win the athlete feels most |
| **Flat lifts** | same `weights` string every session | Where the next cycle has the most room |
| **Working sets** | `sets_at_top` vs the prescribed sets | 1–2 of 4 at the top weight = warm-ups typed into working rows, or a pyramid. Less stimulus than designed |
| **RPE coverage** | sessions with RPE on the main lift | No RPE = no Personal Records estimate and no way to judge "working weight" |
| **RPE as a rep counter** | Q3 `at_10` ÷ `n_rpe`, summed; and whether the logged RPE matches the prescribed reps (a set of 10 logged "@10") | New athletes often tap the button that matches their reps. Over ~30% at 10 in the first ten sessions: the per-set RPE is not effort. Don't write a starting-load note from it; the report teaches the scale |
| **The Ceiling** | Q4 `ceiling`: each flagged lift's estimate, its grade (Sharp / Good / Rough) and date; relative strength when there is a weigh-in | The one e1RM the next design uses. A Rough estimate is a trend, never a starting load |
| **Profile changes** | calls, messages, notes, the log: a new injury or one resolved, new kit or a new gym, a changed schedule or goal | They update the athlete profile at the top of the coaching log (/program-design applies them) |
| **Units** | compare barbell and dumbbell loads at similar RPE | An empty-bar squat at RPE 8 next to 2 × 20 kg dumbbells = whole bar vs per side unknown |
| **Typos** | a jump ×10 (250 after 20) | Never quote it; note it for Amir |
| **Back-off week** | the closing week's `n_sets` and `top` vs weeks 1–4, against the cycle's `weekNotes.last` (what it prescribed, since 2026-09-26) | Full sets and a new top = the back-off didn't happen |
| **Weigh-ins** | Q4 `weigh_ins` | Body weight promised in a notes card and never logged |
| **Personal Records** | Q4 `ceiling` | Empty after a whole cycle = no strength baseline. Since 2026-09-26 the app adds a new best by itself (`auto`), so entries are not evidence the athlete opened the screen; `test` still is |
| **Promises and gates** | each note card and each `message.outcomes` line against the evidence | Done / partly / not yet, with its number |
| **Baselines** | every number the cycle promised to change: is there a starting value? | No baseline = the promise can never be shown; add a test to the next cycle's week 1 |
| **Sleep** | readiness `sleep`: avg, and poor nights by weekday | Call a pattern only at 3+ points; 2 is "watch" |
| **Words** | day notes, messages, calls | What the athlete said goes in "what you told me" |

Then look forward: `next_cycle.focuses` and `teaser` (the locked roadmap), the ledger's deferred
exercises ("enters C2"), and anything Amir already promised the athlete.

## Step 3 · Ask Amir, once

One chat message, only what the data can't answer:
- **Film verdicts** for any film-gated lift (tempo there? lift cleared?).
- **Calls and WhatsApp:** what did the athlete say, and what did you answer? (His answers become
  decisions; keep his wording.)
- **Anything sent outside the app** (weigh-ins, videos, test results).
- **Language of the message** if the log's last Debrief doesn't say (Farsi on WhatsApp for
  athletes in Iran; the programme app itself stays English).
- Anything specific he wants celebrated.

Say what you already found in two or three lines so he can correct a misread before it's written.

## Step 4 · Write the cycle report (the athlete's message)

**Voice.** Farsi: warm, colloquial Tehrani, Persian digits, Shamsi dates (`shamsi.py`), no
em-dashes. Exercise names stay as the app shows them (RDL, Force Bank), and so do app labels
(Weigh in, Body Weight, How hard). English: sharp, athletic, plain. WhatsApp formatting: `*bold*` for
section heads and the fact that leads each bullet; one emoji per section head at most.

**Shape** (keep this order; drop a section only if it's empty):

```
*<Cycle report title>: <Cycle name>* 🎾
<start> تا <end>

<Opener: two lines. The cycle is done; here, with your own numbers, is what you built,
what's next, and what I need from you.>

*<What went well>* 👏
• *<fact with number>.* <why it matters, one line>      ← 3 to 5 bullets, strongest first:
                                                          adherence · load trend · technique cleared ·
                                                          tolerance · anything he logged well

*<What you told me, and what we do about it>*          ← only if he said something (calls, notes, messages)
• *<his point, in his words>.* <what we do> <when>

*<Next cycle: name>* (<dates>) 💪
• <the roadmap focus in plain words, tied to his sport>
• <each decision that changes his training, including what he asked for>
• <any new baseline test: what, when, and why it lets us show progress>

*<What I need from you>* 🙏                            ← at most 4
۱. *<the ask>.* <the fact, once> <why it matters to him> <how, in one tap if possible>

*<Three questions, a short answer is enough>*          ← at most 3; each one feeds the next design
۱. …
<optional: one data request, e.g. match heart rate if he has a watch>

<Sign-off, one line> 
امیر
```

**Worked example:** the first report (2026-09-24, its athlete's coaching log holds it) is the model: 5 wins, 3 things he
said on a call (heart rate and fatigue → cardio base; left arm on backhands → medicine-ball
throws; speed → cycle 3), the Force Bank plan with a broad-jump baseline, 4 asks (tick + RPE,
working sets only with the whole bar, weekly weigh-in, a real back-off week), 3 questions.
Its log section is the model for Step 5.

## Step 5 · Save the Debrief to the coaching log

**Only what changes a coaching decision.** Not the message, not the wins for their own sake.
English, coach-only. Template:

```
---

## Debrief — Cycle NN <Name> · <YYYY-MM-DD> · end of cycle, before C<NN+1> design

Coach-only. Only what changes a coaching decision. Sources: <n> session_history rows
(<first>–<last>), Gmail import: <its line>, <film review / calls / messages>. Athlete message:
<language>, <channel>.

**Adherence & tolerance** — sessions, missed days, readiness, soreness, session RPE, time vs
design, sleep. End with the read ("absorbed easily, room to push" / "hold").

**Loads as logged (top set per week)** — one line per primary; flag typos; film gate verdict.

**Data quality — read before writing any starting-load note** — units, warm-ups in working
rows, RPE coverage, the share of sets logged at RPE 10, weigh-ins, Personal Records, back-off
week. Say what the athlete was told.

**The Ceiling** — one line per flagged or primary lift: estimate, grade, date, and relative
strength if there's a weigh-in. The next design reads its e1RM here, nowhere else.

**Profile changes** — only what changed: an injury new or resolved, kit, schedule, goal. "None"
when nothing did.

**The athlete's words** — what he said, and what Amir answered, in their words.

**Decisions carried into C<NN+1>** — each one with its reason. A decision that goes beyond the
locked roadmap is labelled **ROADMAP DEVIATION** with the data point that forced it. New
baselines (what, which week). Exercises entering or staying deferred.

**Open — answer at the C<NN+1> checkpoint** — numbered: the questions sent to the athlete,
medical flags for Amir, anything the log couldn't settle.
```

Write it with an append, never a retype, and prove nothing before it moved:

```sql
-- before: note md5(body) and length(body)
select md5(body), length(body) from public.coaching_logs where athlete_id = '<id>';

update public.coaching_logs
   set body = body || $D$
---

## Debrief — Cycle NN …
$D$, updated_at = now()
 where athlete_id = '<id>'
returning md5(substring(body from 1 for <old length>)) as prefix_md5, length(body);
-- prefix_md5 must equal the "before" md5
```

No row yet (a brand-new athlete whose first cycle wasn't logged)? Insert one with the log header
(`# Coaching Log — <First Last> (<id>)` and the coach-only note) and the section, and say so.

## Step 6 · Hand over

In this order, in chat:
1. **The message**, ready to paste, between two rules. Nothing else inside the rules.
2. What was **left out on purpose** and why (a medical question for Amir to ask himself, a typo).
3. **What was saved**: the log section's headings in one line each, its length before and after,
   and that the prefix checksum matched.
4. The next step: `/program-design <name>` once the athlete answers.

---

## Don'ts

- Don't build a page, a file or an artifact for the report. Text in chat.
- Don't write to `programs` (the athlete app reads it) or to `program_versions`.
- Don't edit, reorder or delete any earlier section of the coaching log.
- Don't send the message. Amir sends it.
- Don't let the report design the next cycle: it names decisions Amir already made, what the
  roadmap already locks and what the data forces. The exercises, sets and doses belong to
  `/program-design`.
