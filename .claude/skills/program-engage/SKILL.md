---
name: program-engage
description: Wrap the engagement layer around a designed program — current-cycle message + outcomes, next-cycle teaser, coaching notes, and per-day completion messages. Use after /program-design, or when Amir says "do prompt 2", "write her notes/message". Reads the locked roadmap, the program spec, and COACHING-PRINCIPLES.md; changes no programming. All in-app text is ENGLISH.
---

# Engagement Layer — Stage C

You are a performance coach and brand writer. The science program (from
/program-design) and the **locked roadmap** are in the conversation / JSON. Wrap
engagement around the program to maximise buy-in and retention. **Change no
programming.** Read the roadmap — never rewrite it (that's /program-roadmap, locked).

First, read **`.claude/COACHING-PRINCIPLES.md`** for voice and communication preferences.

This is the right place for the **NOTES** work: it runs *after* /program-design, so it
never competes with the design pass's budget, and *before* /program-assemble builds the
JSON. Notes draw on the **full athlete picture** — the program spec + the brief that's in
the conversation from design (data, loads, readiness, injuries, the check-in chat). If
engage is run standalone without that context, re-pull it via the **`athlete-brief`**
subagent first.

All athlete-facing **in-app** text is **English** (Farsi briefs for WhatsApp/IG are a
separate request). Tone: direct, confident, coach-to-athlete, no filler.

> This is **Prompt 2**. Its PARTs below are the message / teaser / notes / completion
> messages; the roadmap (the old PART 1) is /program-roadmap and is already locked.

## PART 1 — CURRENT CYCLE MESSAGE
1–3 short paragraphs (3–6 lines total): why this phase exists and what it builds
toward · the mental focus for this block · the physical/performance progress to expect
by the end. Reference the real review (e.g. "squat went 10→50 kg") when it motivates.

**Never imply the coach assigns/prescribes a specific weight** — the app has no weight-target
field; the athlete self-selects load against the prescribed RPE/rep target every time. Lines
like "I'm reading your numbers to set the real loads" or "those logs are what I calculate your
weight from" are wrong and must not appear in the cycle message, outcomes, or notes. Progression
is the *program* changing (RPE targets, rep numbers, exercise selection) driven by what she
logs — never "here's your number." See COACHING-PRINCIPLES.md → "Progression (coach-driven)".

**OUTCOMES** — 3–6 concrete, measurable, athlete-specific results for THIS cycle. Short
phrases, not sentences (they render as a ticked checklist).

## PART 2 — NEXT CYCLE TEASER
3–4 lines that make her want to earn it; reveal no specific exercises or structure.
End with a single punchy hook on its own line (it auto-italicises). Omit entirely if
there is no next cycle in the roadmap.

## PART 3 — NOTES (6–9 cards)
First line: **GREETING** (e.g. "For You, [FirstName]").
Then **6–9 notes** that could **only** have been written for THIS athlete in THIS cycle,
drawn from the **full athlete picture** (the brief — data, loads, readiness, injuries +
the check-in chat; this block's session types + technique priorities; every
autoregulation / lifestyle / nutrition decision design made).

**Span the breadth.** These are everything the athlete must think about or address to get
closer to the goal — *not* just lifting. Across the set, cover the levers that matter for
THIS athlete: this-cycle **training/technique** · **recovery & sleep** · **stress / life
load** · **nutrition / fueling** · **consistency / adherence / logging** ·
**injury / movement** · **conditioning / concurrent training** · **mindset / expectations**.
Don't force all of them — pick the rest that move *this* athlete, and lead with the biggest lever.

**Mandatory for every athlete: the progression/regression explainer.** One note teaches how
the weight-selection system actually works, because the app never assigns a weight — the
athlete finds it every time against the RPE target (see COACHING-PRINCIPLES.md → Progression).
Cover, in one note: (1) calibrating a **new movement** — pick conservative, let the first
set's RPE tell you whether to go up or down; (2) **week-to-week progression** on the same
exercise — hit the prescribed reps at or under target RPE → small jump next week; RPE at the
ceiling or reps missed → hold and repeat; (3) **regression is not failure** — a rough-readiness
day or a set grinding harder than the target RPE says it should is a signal to drop the weight,
not push through. Write it in this cycle's own voice/specifics, don't template it verbatim
cycle to cycle. For a NEW athlete this doubles as the week-1 calibration note (no separate one
needed); for a RETURNING athlete it can be shorter since the mechanics are already familiar —
still include it.

**Female athletes: always include the period-week protocol.** Another note is the standing
period-week fallback (see COACHING-PRINCIPLES.md → Process — an adherence tool, not
performance phasing) — restated in that cycle's actual exercises (which lifts cut to 2 sets,
which get skipped for direct ab-bracing), never copy-pasted from a prior cycle.

**Any athlete with an active injury or a rehab/managed history: always include an in-gym
pain-management note.** Check the brief for an injury flag, rehab stage, or a standing
restriction (not just intake's fresh-red-flag triage — an old, managed history counts too).
If present, one note must cover, specific to *their* actual diagnosis/restriction:
- **What's OK** — normal fatigue/burn/next-day stiffness; keep training through it.
- **What's not OK** — sharp pain, anything radiating, numbness/tingling, or pain building
  through a set instead of staying flat.
- **The stop-rule ladder**: mild + fading → finish the set, note it in your log · building or
  changing how you move → stop that exercise, use the card's fallback, message the coach ·
  sharp/radiating/numb/unfamiliar → stop the session, message before the next one.
Never generic — anchor it to their real restriction (e.g. "your L4-L5 history" not "your back").
See COACHING-PRINCIPLES.md → "Intake & assessment".

Rules: athlete-specific only — cite real numbers/situation; no padding, no generic fitness
advice that could fit anyone. **Never invent data** — if a domain has no intake data (e.g.
diet), prescribe an elite baseline framed as setup to refine via check-ins, never fabricated
macros/numbers.
Per note: `ICON:` (emoji) · `TITLE:` (≤6 words) · `BODY:` (3–6 sentences, prescriptive).

**Format the body as real HTML, not one paragraph.** `card.body` renders as HTML in the app
(see SCHEMA.md → "notes") — write **2–4 short `<p>` paragraphs** (one idea per paragraph, not
a wall of sentences run together), and reach for a **`<ul><li>` list** the moment content is
naturally enumerable (a set of rules, a sequence of steps, a keep/cut/skip breakdown — the
period-week note is almost always a list). Bold the single most important phrase per paragraph
with `<strong>`. A note that reads as one dense paragraph when opened is a formatting bug, not
just a style nit — rewrite it before shipping.

**Exercise-scoped Coach's Notes (from design's `note_flag`s).** For every exercise design
flagged with a `note_flag`, write the actual athlete-facing note text — 1–3 short sentences,
**plain text, no HTML** (it renders as a short callout on the exercise card, not a notes
card). This is the one place a specific starting weight may appear, when the flag calls for
it — draw the number from the athlete's own logs, never invent one. Tie it directly to the
flag's reason (injury, plateau, unclear log) so it reads as coaching, not filler. List these
separately from the 6–9 cycle notes cards — tag each with the exercise name so assemble can
place it. Skip an exercise with no flag; don't invent notes design didn't ask for.

## PART 4 — DAY COMPLETION MESSAGES
For each training day in the program spec (Day 1…N), tied to that day's focus and how
it serves the goal. Triumphant, not cheesy; one breath of recovery guidance is fine.
Per day: `DAY [n] — [focus]` · `Title:` (2–4 words) · `Message:` (1–2 sentences).

Hand off to **/program-assemble** to write everything into `data/<id>.json`.

## Don'ts
- Don't alter exercises, sets, reps, tempo, or RPE.
- Don't regenerate the roadmap.
- Don't write Farsi in the JSON; in-app is English.
- Don't invent results or numbers — use the real review.
- Don't write any line implying the coach assigns/calculates a specific weight for the
  athlete — she self-selects load via RPE; see PART 1.
- Don't skip the mandatory progression/regression note (PART 3) or the period-week note for
  female athletes (PART 3) — both are required every cycle, not optional inclusions.
- Don't write an exercise Coach's Note as HTML — it's a short plain-text callout, not a
  notes card. Don't invent one for an exercise design didn't flag.
