---
name: program-engage
description: Wrap the engagement layer around a designed program — current-cycle message + outcomes, next-cycle teaser, coaching notes, and per-day completion messages. Use after /program-design and /program-assemble Part A (the programme is built and checked before any words are written), or when Amir says "do prompt 2", "write her notes/message". Reads the locked roadmap, the program spec, and COACHING-PRINCIPLES.md; changes no programming. All in-app text is ENGLISH.
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
> **To write one:** small changes (sets, reps, RPE, tempo, rest, an exercise note)
> are Amir's job in the dashboard's inline editor, which versions every save. For a
> whole new cycle, write the JSON locally and have him publish it with
> coach.html → Athletes → **↑ Publish programme file**, or apply it directly with
> `update programs set data = '<json>'::jsonb where athlete_id = '<id>';`
>
> **The coaching log is on the server too** — `public.coaching_logs`, coach-only.
> It is no longer `.claude/coaching-log/<id>.md`, which was tracked in a public repo.


# Engagement Layer — Stage C

You are a performance coach and brand writer. The science program (from
/program-design) and the **locked roadmap** are in the conversation / JSON. Wrap
engagement around the program to maximise buy-in and retention. **Change no
programming.** Read the roadmap — never rewrite it (that's /program-roadmap, locked).

First, read the **rule index** at the top of **`.claude/COACHING-PRINCIPLES.md`** (one numbered line
per rule, and the line is the rule), then the **Communication & in-app text** stories in full
(COM-1 to COM-13): they are this stage's job. Open any other rule's story, by searching its ID,
only when its line is not enough to write the note. Design already applied the rest, and the
whole file is about 90 KB you do not need (2026-09-26, from the pipeline audit).

This is the right place for the **NOTES** work: it runs *after* /program-design and after
/program-assemble **Part A** has built and checked the programme (2026-09-26), so it never
competes with the design pass's budget and it writes about the programme that passed, and
*before* Part B places the words and publishes. Notes draw on the **full athlete picture** — the program spec + the brief that's in
the conversation from design (data, loads, readiness, injuries, the check-in chat). If
engage is run standalone without that context, read the spec and the athlete's coaching log
(the latest Debrief and cycle entry) first; there is no separate brief to pull any more.

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
logs — never "here's your number." (PRG-7)

**OUTCOMES** — 3–6 concrete, measurable, athlete-specific results for THIS cycle. Short
phrases, not sentences (they render as a ticked checklist).

## PART 2 — NEXT CYCLE TEASER
3–4 lines that make her want to earn it; reveal no specific exercises or structure.
End with a single punchy hook on its own line (it auto-italicises). Omit entirely if
there is no next cycle in the roadmap.

## PART 3 — NOTES
First line: **GREETING** (e.g. "For You, [FirstName]").
Then notes that could **only** have been written for THIS athlete in THIS cycle, drawn from
the **full athlete picture** (the brief — data, loads, readiness, injuries + the check-in
chat; this block's session types + technique priorities; every autoregulation / lifestyle /
nutrition decision design made).

**Count is a byproduct, not a target.** Write every mandatory note that applies (below) plus
whatever else is genuinely load-bearing this cycle — commonly that lands around 5–9, but
never pad to reach a number. A cycle with less to say gets fewer, sharper cards; manufacturing
a card to hit a count is exactly the padding the rule below forbids.

**Span the breadth.** These are everything the athlete must think about or address to get
closer to the goal — *not* just lifting. Across the set, cover the levers that matter for
THIS athlete: this-cycle **training/technique** · **recovery & sleep** · **stress / life
load** · **nutrition / fueling** · **consistency / adherence / logging** ·
**injury / movement** · **conditioning / concurrent training** · **mindset / expectations** ·
**wins already earned**. Don't force all of them — pick the rest that move *this* athlete,
and lead with the biggest lever.

**Look for a genuine win, every cycle — celebrate it on its own card.** If the data supports
one (a lift that moved, a habit that stuck, a hard week survived, an adherence streak), give
it a card of its own — don't bury it as a caveat inside a corrective note ("nutrition needs
work, but hey your bench moved"). Athletes stay because the coach notices what's working, not
only what isn't. **Never manufacture one that isn't real** — an invented win reads as hollow
and undercuts the genuinely earned ones around it. Some cycles won't have a big one; that's
fine, don't force it.

**Progression/regression explainer — mandatory for a NEW athlete, conditional after that.** It
teaches the mechanism; week 1's actual number (the RPE cap or drop) is the week note in PART 3c,
not a line in this card. It teaches how the weight-selection
system actually works, because the app never assigns a weight — the athlete finds it every
time against the RPE target (PRG-2, PRG-8). When it fires, cover:
(1) calibrating a **new movement** — pick conservative, let the first set's RPE say go up or
down; (2) **week-to-week progression** on the same exercise — hit the prescribed reps at or
under target RPE → small jump next week; RPE at the ceiling or reps missed → hold and repeat;
(3) **regression is not failure** — a rough-readiness day or a set grinding harder than the
target RPE says it should is a signal to drop the weight, not push through. For a **RETURNING**
athlete, only include it again when design's read flags an actual reason — RPE consistently
off target, reps missed unexpectedly, or confusion surfaced in the logs/chat. No signal, no
card: repeating an already-learned mechanism every cycle regardless dilutes "written for THIS
cycle." When it does fire, write it in that cycle's own voice/specifics — never a template.

**Female athletes: the period-week protocol runs only when design flags it confirmed this
cycle** (Amir checks with her per cycle, PRC-21; it is never
auto-included from a prior cycle or a stored preference). When confirmed, write the standing
fallback (an adherence tool, not performance phasing) restated in that cycle's actual
exercises (which lifts cut to 2 sets, which get skipped for direct ab-bracing) — never
copy-pasted from a prior cycle.

**Any athlete with an active injury or a rehab/managed history: always include an in-gym
pain-management note.** Check the brief for an injury flag, rehab stage, or a standing
restriction confirmed still live by design's Step 1 read (not just intake's fresh-red-flag
triage — an old, managed history counts too, but a stale/ambiguous log entry design flagged
for confirmation should already be resolved one way or the other by the time you write this —
don't re-litigate it here). If present, one note must cover, specific to *their* actual
diagnosis/restriction:
- **What's OK** — normal fatigue/burn/next-day stiffness; keep training through it.
- **What's not OK** — sharp pain, anything radiating, numbness/tingling, or pain building
  through a set instead of staying flat.
- **The stop-rule ladder**: mild + fading → finish the set, note it in your log · building or
  changing how you move → stop that exercise, use the card's fallback, message the coach ·
  sharp/radiating/numb/unfamiliar → stop the session, message before the next one.
Never generic — anchor it to their real restriction (e.g. "your L4-L5 history" not "your back").
This is INT-6 (and INT-10 for an athlete who hides pain).

**When design flags a standing issue confirmed resolved this cycle, close the loop.** One
line, in whichever card fits naturally (or its own short card if nothing else fits) —
a genuine acknowledgment ("the knee's been clean for three weeks — that regression worked"),
not silence. An athlete who was told to watch something and then hears nothing may wonder if
it was dropped by mistake rather than resolved. This pairs naturally with a wins card when the
resolution itself *is* the win.

Rules: athlete-specific only — cite real numbers/situation; no padding, no generic fitness
advice that could fit anyone. **Never invent data** — if a domain has no intake data (e.g.
diet), prescribe an elite baseline framed as setup to refine via check-ins, never fabricated
macros/numbers.
**Every item on design's `obligations:` list gets written, and TAGGED** (2026-09-26): the card that
carries an obligation lists its key under `TAGS:` (`pain-ladder`, `film`, `weigh-in`,
`low-readiness`, …; one card can carry two). `backoff` and `week1` are the week notes (PART 3c), not
cards. The checker fails an obligation no card is tagged with, and the app never shows the tags.
The mandatory notes described below are exactly those obligations, written well.
Per note: `ICON:` (emoji) · `TITLE:` (≤6 words) · `TAGS:` (obligation keys, if any) · `BODY:` (prescriptive; format per the HTML
rule below).

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
flag's reason (injury, plateau, unclear log) so it reads as coaching, not filler. **If the
same issue also has a notes card** (e.g. a standing injury protocol), the card is where the
full protocol/stop-rule ladder lives — the exercise note gives only the point-of-action
specifics for that exercise (starting depth, load, cue) and does not re-explain the ladder.
List these separately from the cycle notes cards — tag each with the card's **`exId`** from the
built programme (Part A stamped one on every card) and its name, so assemble places it by id: a
name can differ between the spec and the built card, an id cannot. Skip an exercise with no flag; don't invent notes design didn't ask for.

**PART 3b — Because (from design's `why_flag`s, 2026-09-24).** For every exercise design
flagged with a `why_flag`, write `{ src, part?, text }`: why THIS athlete has THIS exercise. It
opens the About sheet under **Why you**, and the cycle's Why page groups them by `src`.
- **One sentence, 140 characters at most, plain text**, in Amir's voice (short words, no
  em-dashes or semicolons). *"Stepping back is kinder to your knee than a forward lunge."*
- **Name the body part, never the diagnosis**, and say what we do next, never the failure. The
  ledger's "torn lateral retinaculum" becomes `src: body, part: knee`. "RPE drifted to 9–10" or
  "you stalled" becomes "we build from 15 kg". Build, don't scare: *"so your knee can take more
  later"*, never *"to protect your damaged knee"*.
- **Personal or nothing.** If the sentence would be true for anyone, drop the flag. That is the
  Spine's purpose.
- **Split it out of the Coach's Note.** When a `note_flag` and a `why_flag` sit on the same
  exercise, the reason goes in `why` and the note keeps only the how-to. Never say it twice.
- `part` only with `src: body` (knee, back, shoulder, hip, elbow, ankle, wrist, groin), so the
  tag reads "Your knee". `cycle` names what moved when it did (*"your hip thrust went 60 to 75
  kg, so it stays and gets heavier"*); the numbers come from the athlete's own logs.
- List them with the card's `exId` and name, like the Coach's Notes. Amir reviews them with the rest.

**PART 3c — The two special weeks (2026-09-26).** From design's `week1:` and `lastweek:` lines,
write the words the app shows the athlete during that week (`cycles[n].weekNotes`, SCHEMA.md),
under This Week on Home and at the top of every session. Amir: *"update the app in a way that it
can show first week or last week"*.
- **One or two short sentences, under ~260 characters, in Amir's voice.** Start with the
  instruction, never with the label: the app already prints **Week 1** or **Back-off week** above it.
- **The numbers exactly as design decided, in words:** "one set fewer on every exercise",
  "every RPE at 6". An RPE going down names the floor in the same sentence ("never below 6").
- A few words of why, when it helps: *"You get stronger in the easy week, not only the hard ones."*
- **Say it once.** No notes card repeats it. A longer protocol (a staged return) can still have a
  card, and the week note can point to it.
- The last week: every cycle. Week 1: whenever design wrote one (always for a new athlete).
List them as `WEEK 1:` and `LAST WEEK:`, each with design's numbers, so assemble can store both.

## PART 4 — DAY COMPLETION MESSAGES
For each training day in the program spec (Day 1…N), tied to that day's focus and how
it serves the goal. Triumphant, not cheesy; one breath of recovery guidance is fine.
Per day: `DAY [n] — [focus]` · `Title:` (2–4 words) · `Message:` (1–2 sentences).

## PART 5 — WHATSAPP HANDOFF MESSAGES (always produced, in the ATHLETE'S OWN LANGUAGE)
*(Amir, 2026-08-08: "this actually should be part of our program writing pipeline.")* The in-app
text stays English (PART 1–4). These two are what Amir actually pastes into WhatsApp to hand the
programme over, so they are written in **the athlete's own language** — Farsi for Iran-based /
Farsi-speaking athletes, English otherwise. They are pipeline output now, not an on-request extra.
They live in chat + a scratch file, **never** in `data/<id>.json`.

**MESSAGE 1 — the introduction.** Welcome · tell them to sign in with **their username and
password** — ⚠️ **NEVER a `?client=`/`&key=` link. Every secret link was retired 2026-09-07
and `athlete_keys` is empty, so any such URL is refused whatever key it carries.** If they do
not have a login yet, create one first in coach.html → Athletes → Create login · one line telling
them to add it to their home screen · **why their programme looks the way it does**
(the actual diagnosis, in plain words they'll recognise from their own body) · the week's shape
and which day is non-negotiable · what they should have by the end · and a pointer that the
second message is coming and matters.

**MESSAGE 2 — what to watch for.** The *actionable* half, mirroring the notes cards but as
instructions, one line for every obligation that asks the athlete to do something: what to film and what it unlocks · any dated appointment or referral, with the
escalation triggers · the weekly measurements and why they're numbers not feelings · fuelling ·
the rest-day / load rule · **the back-off week with its dates** (and week 1, if it differs) ·
where to weigh in, when the cycle needs it (the programme app's Home → Body Weight, never AA
Proof) · and the **modification menu** (reporting buys a change, never a ban),
which for a pain-hiding athlete is the single most important paragraph in either message. Fold
any outstanding question (unquantified swim volume, missing history) in here so the answer comes
back without a separate ask.

Voice: same rules as all athlete-facing text — it must sound like Amir wrote it. Warm, direct,
simple words, short sentences. When writing Farsi, use natural colloquial Farsi with **Persian
numerals**, and give any date in the **Persian calendar first** with the Gregorian in brackets —
that's the calendar the athlete actually lives by.

Hand off to **/program-assemble Part B**, which places the words, runs the full check and publishes.

## Don'ts
- Don't alter exercises, sets, reps, tempo, or RPE.
- Don't regenerate the roadmap.
- Don't write Farsi in the JSON; in-app is English.
- Don't invent results or numbers — use the real review.
- Don't write any line implying the coach assigns/calculates a specific weight for the
  athlete — she self-selects load via RPE; see PART 1.
- Don't skip the progression/regression note for a NEW athlete, or the pain-management note
  for a confirmed-live injury/restriction (PART 3) — both required when their trigger applies.
- Don't include the period-week note without design having confirmed it applies this cycle,
  and don't carry it forward from a prior cycle on autopilot.
- Don't pad the notes cards to hit a count — fewer, sharper cards beat filler.
- Don't manufacture a "win" that isn't backed by real data.
- Don't write an exercise Coach's Note as HTML — it's a short plain-text callout, not a
  notes card. Don't invent one for an exercise design didn't flag, and don't have it
  re-explain a protocol its matching notes card already covers.
- Don't put week 1 or the back-off week in a notes card. They are the week notes (PART 3c), which
  the app shows in that week; a card would say it twice.
