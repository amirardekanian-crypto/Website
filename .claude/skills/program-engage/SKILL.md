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

All athlete-facing **in-app** text is **English** (Farsi briefs for WhatsApp/IG are a
separate request). Tone: direct, confident, coach-to-athlete, no filler.

> This is **Prompt 2**. Its PARTs below are the message / teaser / notes / completion
> messages; the roadmap (the old PART 1) is /program-roadmap and is already locked.

## PART 1 — CURRENT CYCLE MESSAGE
1–3 short paragraphs (3–6 lines total): why this phase exists and what it builds
toward · the mental focus for this block · the physical/performance progress to expect
by the end. Reference the real review (e.g. "squat went 10→50 kg") when it motivates.

**OUTCOMES** — 3–6 concrete, measurable, athlete-specific results for THIS cycle. Short
phrases, not sentences (they render as a ticked checklist).

## PART 2 — NEXT CYCLE TEASER
3–4 lines that make her want to earn it; reveal no specific exercises or structure.
End with a single punchy hook on its own line (it auto-italicises). Omit entirely if
there is no next cycle in the roadmap.

## PART 3 — NOTES
First line: **GREETING** (e.g. "For You, [FirstName]").
Then notes that could **only** have been written for THIS athlete in THIS cycle — draw
from her data, the check-in chat, this block's session types, technique priorities, and
any autoregulation/lifestyle decision /program-design made. No padding, no generic
fitness advice.
Per note: `ICON:` (emoji) · `TITLE:` (short) · `BODY:` (2–5 sentences, specific).

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
