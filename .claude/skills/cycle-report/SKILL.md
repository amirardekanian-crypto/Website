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
10. **Append, then trim.** The Debrief goes on the end, then the whole log is trimmed
    (`program-design/LOG.md`, Step 5). The old text is kept in `coaching_log_versions` by itself.

---

## Step 0 · Which athlete, which cycle

Run **Q1** in `queries.sql` (replace `ATHLETE_ID`). It returns the current cycle (`cycle`: name,
`startDate`, `endDate`, `art`, `focuses`, `message.outcomes`), the next one (`next_cycle`:
name, dates, focuses, `teaser`), the sport and **the notes cards in full** (Q1 returns them since
2026-09-27; it used to take a second query). They
hold the cycle's promises ("8 to 15 cm on a broad jump"), its gates ("the weight doesn't go up
until I've cleared the film") and its rules ("week five you back off"). The report checks each one.

If today is before the closing week, say so and ask whether to go ahead (a mid-cycle check-in is
fine, just not a *cycle* report).

## Step 1 · Pull the data

**First, complete the log.** Run the `athlete-brief` agent in **MODE=import**, in the foreground,
with the window (`startDate − 3` to `endDate`). It adds any session that reached Amir's inbox as a
Web3Forms report but not the database (Amir, 2026-09-26: the import is still needed), and returns
one line. That line goes in the hand-over (Step 6), not the Debrief.

**This report is the evidence for the next cycle** (2026-09-26): /program-design reads the Debrief
as its brief and no longer builds a separate one, so a returning athlete's next cycle starts here.

Then put the cycle's `startDate` and `endDate` into **Q2–Q4** (they open the window 3 days early,
because athletes often start a day or two before the date) and run them:

- **Q2** sessions: date, weekday, day, session RPE, minutes, readiness (composite, sleep,
  soreness), day note.
- **Q3** loaded exercises, one row per session: weights set by set, their `units` (`kg`, `lb` or
  `plates`: an athlete picks it per exercise, 2026-10-18; a bare number is kg), `top`, `sets_at_top`,
  `n_sets`, reps, RPEs, ticks. Never compare or add weights across units, and plates are a position
  on a machine's stack, never a load: say "up a plate", never "+N kg". It reads `session_history.log` (stage30, from 2026-09-24) and
  parses the text summary for older rows, so both kinds come back the same.
  ⚠ In summaries written before the countersigned set log, every set line ends in ✓, so
  `ticked` is not evidence of ticking on those rows. Use the progress blob's `_setlog_` `d`
  flags, or leave it out.
- **Q4** weigh-ins in the window, Personal Records entries, call logs, and the coaching log. (It
  returns the log's head, profile, Exercise Ledger and roadmap, plus the cycle just trained: its
  design read, its in-cycle edits. Older cycles are left out, unless the log has no finished
  profile yet: then it comes back whole.)

## Step 2 · The read (for Amir first, then the athlete)

Work through this list. Each line is a finding only if the data says so.

| Check | How | Why it matters |
|---|---|---|
| **Adherence** | sessions done / (weeks × days per week); name the missed day | The headline win, or the first thing to fix |
| **Tolerance** | readiness avg + lowest; soreness "none" count; session RPE spread; any day notes | "Room to push" or "hold" for the next cycle |
| **Time** | avg / min / max minutes, drop outliers under 15 (a timer left off), against the modelled minutes in the cycle entry's day table (the checker writes them since 2026-09-27): real ÷ model per day and overall | The next cycle's time cap: the ratio goes in the Debrief, and design sizes the next cycle with it |
| **Load trend** per primary | `top` per week, first → last | The win the athlete feels most |
| **Flat lifts** | same `weights` string every session | Where the next cycle has the most room |
| **Working sets** | `sets_at_top` vs the prescribed sets | 1–2 of 4 at the top weight = warm-ups typed into working rows, or a pyramid. Less stimulus than designed |
| **RPE coverage** | sessions with RPE on the main lift | No RPE = no Personal Records estimate and no way to judge "working weight" |
| **RPE as a rep counter** | Q3 `at_10` ÷ `n_rpe`, summed; and whether the logged RPE matches the prescribed reps (a set of 10 logged "@10") | New athletes often tap the button that matches their reps. Over ~30% at 10 in the first ten sessions: the per-set RPE is not effort (PRG-11). Don't write a starting-load note from it; the report teaches the scale |
| **The Ceiling** | Q4 `ceiling`: each flagged lift's estimate, its grade (Sharp / Good / Rough) and date; relative strength when there is a weigh-in | The one e1RM the next design uses. A Rough estimate is a trend, never a starting load (TST-6) |
| **Profile changes** | calls, messages, notes, the log: a new injury or one resolved, new kit or a new gym, a changed schedule or goal | They update the athlete profile at the top of the coaching log (/program-design applies them) |
| **Units** | compare barbell and dumbbell loads at similar RPE | An empty-bar squat at RPE 8 next to 2 × 20 kg dumbbells = whole bar vs per side unknown |
| **Typos** | a jump ×10 (250 after 20) | Never quote it; note it for Amir |
| **Back-off week** | only a cycle whose final week has a note in `weekNotes` (a taper before a competition since 2026-10-19, REC-4; every cycle before that): the closing week's `n_sets` and `top` vs weeks 1–4, against what the note prescribed | Full sets and a new top = the back-off didn't happen. No note = the week trains as written, nothing to check |
| **Weigh-ins** | Q4 `weigh_ins` | Body weight promised in a notes card and never logged |
| **Personal Records** | Q4 `ceiling` | Empty after a whole cycle = no strength baseline. Since 2026-09-26 the app adds a new best by itself (`auto`), so entries are not evidence the athlete opened the screen; `test` still is |
| **Promises and gates** | each note card and each `message.outcomes` line against the evidence | Done / partly / not yet, with its number |
| **Baselines** | every number the cycle promised to change: is there a starting value? | No baseline = the promise can never be shown; add a test to the next cycle's week 1 |
| **Sleep** | readiness `sleep`: avg, and poor nights by weekday | Call a pattern only at 3+ points; 2 is "watch" |
| **Words** | day notes, messages, calls | What the athlete said goes in "what you told me" |

Then look forward: `next_cycle.focuses` and `teaser` (the locked roadmap), the ledger's deferred
exercises ("enters C2"), and anything Amir already promised the athlete.

**The read is for Amir in chat and for the message, not for the log.** Most of the table above
never reaches the Debrief. Typos, units, warm-ups typed into working rows, a back-off week not done,
readiness, sleep, weigh-ins and Personal Records go in the Debrief only when they change a decision
for the next cycle, and then as that decision ("take no starting load from his RPE", PRG-11), not
as the finding. Step 5 says what stays in.

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

**A question that is always asked** (2026-10-17): for any athlete with back pain, now or in their
profile, one of the three questions is **which is worse: bending forward, arching back, or sitting
for a long time**. The answer decides the next cycle's hinge, squat and core picks (on 2026-10-17 a
cycle was designed without it). Write it in the athlete's language, with the three choices, so a
one-word answer works.

**Worked example:** the first report (2026-09-24, its athlete's coaching log holds it) is the model: 5 wins, 3 things he
said on a call (heart rate and fatigue → cardio base; left arm on backhands → medicine-ball
throws; speed → cycle 3), the Force Bank plan with a broad-jump baseline, 4 asks (tick + RPE,
working sets only with the whole bar, weekly weigh-in, a real back-off week), 3 questions.
Its log section was written in the long form, before 2026-11-20: Step 5's template is the model
for the Debrief, not that section.

## Step 5 · Save the Debrief to the coaching log

**Only what changes a programming decision.** Every `/program-design` run reads this section
again, so every line in it is read every cycle. Amir, 2026-11-20, after a 5.5k-character Debrief:
*"never keep that much info in some ones log, im sure there are loads of information that needs to
be read everytime and doesnt affect programming much."* That one was cut by hand to 1.3k and lost
nothing design needed. The same day he said who it is for: a coach six months into working with
an athlete, who needs *"the info that helps you write the next cycle, based on what he wants to do,
based on his injuries, his equipment or any information that can affect programming … keep them
how you would read fast and helps write a program fast, i never read them."* So write for the next
design run, not for Amir: goals, injuries, kit, time and loads first.

**About 1.5k characters. Four sections, one-line items.** English, coach-only. The test for every
line: *without it, would the next design pick a different exercise, dose, load, time cap or test?*
If not, leave it out.

```
---

## Debrief — Cycle NN <Name> · <YYYY-MM-DD> · before C<NN+1> design

**Training** — <done> of <planned> sessions (a gap and its cause, in a few words) · real time
×<ratio> the model, per day (D1 73 vs 51) · each primary's top set, first → last, flat lifts named
· the Ceiling for a flagged lift: e1RM, grade, date (TST-6) · a data fault only as the decision it
forces ("take no starting load from his RPE", PRG-11; "whole bar or per side unknown") · each
promise or gate: met / partly / not yet, with its number · at most one short quote, only when it
moves the dose.

**Profile changes** — only what changed: an injury new or resolved, kit, gym, schedule, goal, a
film verdict. "None" when nothing did.

**Into C<NN+1>** — each decision in a few words, its reason only when it isn't plain · a decision
beyond the locked roadmap is marked **ROADMAP DEVIATION** with the data point that forced it ·
new baselines (what, which week) · exercises in, out or still deferred · a start date that moved.

**Open** — numbered, one line each: the questions sent to the athlete (mark them "asked"),
medical flags for Amir, anything the log couldn't settle.
```

**Stays out of the log** (it goes in chat at Step 6, or nowhere): the sources and the Gmail import
line, the language and channel of the message, typos, app glitches, readiness and sleep that change
nothing, a back-off week that wasn't done, weigh-ins and Personal Records that are missing, wins for
their own sake, what the athlete was told, and long quotes from the athlete. What he said lives on
as the decision it led to, or as an Open question.

A made-up example of the size and the voice:

```
**Training** — 14 of 15 sessions (one missed in week 3, a tournament). Real time ×1.3 the model
(D1 62 vs 48, D2 58 vs 45). Trap-bar deadlift 60 → 80 kg x5; split squat flat at 12 kg. Half his
sets logged RPE 10: take no starting load from his RPE (PRG-11). Broad-jump baseline 2.10 m.

**Profile changes** — new gym, has a cable stack · left knee settled, no pain since week 2.

**Into C02** — split squat goes up · cable rows in, band rows out · knee allowed full-range lunges ·
retest broad jump in week 5.

**Open** — 1 any knee pain on stairs? (asked) · 2 match days this cycle? (asked).
```

Write it with an append, never a retype, and prove nothing before it moved, then **trim the log**
(below):

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

**Then trim the log** (Amir, 2026-11-20: *"trim it so its updated"*), by
[`../program-design/LOG.md`](../program-design/LOG.md) → *How*: anything older than the cycle
this Debrief reports on becomes one History line, and the facts still live move to the profile and
the ledger first.

## Step 6 · Hand over

In this order, in chat:
1. **The message**, ready to paste, between two rules. Nothing else inside the rules.
2. What was **left out on purpose** and why (a medical question for Amir to ask himself, a typo),
   and the sources in one line: the sessions read, the Gmail import's line, film, calls.
3. **What was saved**: the section's length (about 1.5k; say why if it is much longer), that the
   prefix checksum matched, and the trim's line: the log's length before → after, old text saved.
4. The next step: `/program-design <name>` once the athlete answers. Paste the answers into that run:
   design records them in the new cycle's log entry, and when the Debrief's Open list still has a
   question with no recorded answer it asks Amir first, *wait or design now with stated defaults*.

---

## Don'ts

- Don't build a page, a file or an artifact for the report. Text in chat.
- Don't write to `programs` (the athlete app reads it) or to `program_versions`.
- Don't cut a section of the coaching log before its live facts are in the profile or the ledger
  (LOG.md, step 2).
- Don't send the message. Amir sends it.
- Don't let the report design the next cycle: it names decisions Amir already made, what the
  roadmap already locks and what the data forces. The exercises, sets and doses belong to
  `/program-design`.
