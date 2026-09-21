---
name: ad
description: Build an Instagram ad that sells one of Amir's products, through his own 17-stage pipeline — objective, audience, problem, objection, message, CTA, idea, emotion, storyboard, script, shot list, look lock, image prompts, selection, video prompts, edit plan, review. Use whenever Amir asks for an ad, a promo, "something to sell the course", a hook, an ad script, an ad concept or a batch of ad ideas. Read BRAND.md before writing a single word.
---

# Ad creation — AA Performance

Turn a product and a problem into **one postable ad**. The pipeline below is **Amir's own**, proposed
2026-09-21, with three moves and one addition he approved — the reasons are in each stage.

| File | What it is | Used at |
|---|---|---|
| **`BRAND.md`** | Who he is, who is watching, what he will never do. The interview, not inference. | **Before stage 1, every run.** |
| **`STRATEGY.md`** | Ten principles, ten angles, thirteen hooks, five visual concepts, three CTAs. | Stages 3–7 |
| **`SHOTS.md`** | How he films himself, the source ladder, worked shot lists. | Stages 11–12 |
| **`PROMPTS.md`** | Paste-ready Higgsfield prompts and the house formula. | Stages 13–15 |
| **`WHATSAPP.md`** | What he sends when someone messages. | Stages 6 and 17 |
| **`LEDGER.md`** | Every ad, what it cost, what it did. | Before stage 1, and after posting |
| **`BRIEF-TEMPLATE.md`** | The blank 17 stages. Copy it per ad. | Stage 1 |

## ⚠️ The two rules that override everything

1. **Never generate before Amir says yes to a plan with numbers in it.** Credits come from a pot
   shared with his own work. The plan block and protocol are in `.claude/skills/video/SKILL.md` and
   bind here unchanged. `get_cost: true` preflights free.
2. **He films, Claude assembles.** He can film often, edits in Instagram's own editor, and editing
   is what stops him. The deliverable is a **finished MP4**, never parts to assemble.

## Before stage 1

Read `BRAND.md` in full — the refusal list in §5 is not advisory. Read `LEDGER.md` — do not remake a
flop or re-shoot a hook that already worked. Run `git status --short` and look at `assets/tps/`; two
sessions once generated the same twelve pictures in the same minute.

---

# The pipeline

**Every ad gets its own brief file** — `Content/tps-ads/ad-NN-<slug>.md`, copied from
`BRIEF-TEMPLATE.md` and filled in as you go. It is the ad's record, it is versioned, and the next
session reads it instead of guessing.

## PART A · THE BRIEF — settle all six before a single creative thought

If any of these six cannot be filled in, there is no ad yet. Ask Amir rather than inventing one.

**1 · CAMPAIGN OBJECTIVE** — what it sells and the number being counted. Default: the $17 course,
counted in **WhatsApp messages received** (`BRAND.md` §1). Organic only, so the ad must also be
worth *keeping* — saves and sends are the entire distribution.

**2 · TARGET AUDIENCE** — who, and **what they already believe**. Iranian tennis and padel players;
coaches and general-fitness people are also watching. ⚠️ Parents are not (`BRAND.md` §2).

**3 · THE PROBLEM, IN THEIR WORDS** *(split out of core message)* — one of the six he reports, or
one of the three desires. **Quote them, do not improve them.** *"My legs are tired in the third
set"*, not "poor endurance". `STRATEGY.md` §2.

**4 · THE OBJECTION IT KILLS** ← **added.** Which of the four does this ad answer: don't trust
online · it's free on YouTube · want a coach watching · **the gym will make me slow and bulky**. An
ad that kills none of them is a brochure with good lighting. One per ad, never all four.

**5 · CORE MESSAGE** — one sentence a viewer could repeat to a friend. If it takes two, the ad is
two ads.

**6 · CTA** ← **moved up from 14, the most important change.** The ask decides the *whole* ad —
length, hook, the last ten seconds. Decide it here and the film builds toward it; decide it at the
end and you discover the ad leads nowhere after it is already cut. One ask only (`STRATEGY.md` §6).
**If the ask is WhatsApp, name the reply from `WHATSAPP.md` now** — usually T3 — because the ad's
last line and his first message must carry the same promise.

## PART B · THE IDEA

**7 · CREATIVE IDEA** — the angle from `STRATEGY.md` §3, plus what makes *this* execution of it its
own thing. Write **three hooks** and read them out loud; he has to say them.

**8 · EMOTIONAL DIRECTION** — what the viewer should feel, in one word, and how the ad earns it.
Recognition · relief · irritation at a method · curiosity · resolve. ⚠️ Never fear, never shame
(refusal 3). The register is teacherly throughout: a question he is about to answer, or a correction
he is about to justify.

> ### → GATE · Amir's yes ← **added**
> Nothing gets storyboarded, filmed or generated until he has seen stages 1–8 and agreed. This is
> the cheapest place to kill a bad ad, and he is the one who has to stand in front of the camera.

## PART C · THE PLAN

**9 · STORYBOARD** — the beats in order with their timings, what is on screen, and what the viewer
understands by the end of each. Hook lands inside 2 seconds; first frame **arresting and still**
(principle 4).

**10 · TEXT / VOICEOVER** ← **moved up from 13.** You cannot plan an edit without the words. Farsi,
teacherly, word for word, with each line marked **verbatim** / **from the course** / **draft** so he
can see at a glance which are his to rewrite. On-screen text is never the script repeated — three or
four words, Persian numerals, carrying only what his voice cannot spell.

**11 · SHOT LIST** — one row per shot, and **every row names its source**: `AMIR` · `HAVE` ·
`REUSE` · `CAPTURE` · `GENERATE`. ⚠️ **The reuse pass lives here** — run `.claude/skills/image/SKILL.md`
Step 0 before tagging anything `GENERATE`, and say what you found in one line (*"7 of 9 exist, so I
would generate 2"*). Format and filming rules: `SHOTS.md`.

**12 · LOOK LOCK** *(was "visual bible")* — **three lines, not a document.** Which of the five visual
concepts, what the light is doing, what is in frame. The real bible is `Content/DESIGN_SYSTEM.md` and
`Content/DESIGN-ATLAS.md`; writing a fresh one per ad is how five ads end up with five slightly
different looks.

## PART D · PRODUCTION

**13 · IMAGE PROMPTS** — only for what survived stage 11. `PROMPTS.md` holds ready-made ones and the
house formula. **Quote the credits and wait** (rule 1).

**14 · SELECT / REFINE IMAGES** — three candidates per slot; judge through the destination's own
scrim, check the crop, check the whole set for near-twins. When all three miss the same way the
prompt is wrong — change the subject, do not roll a fourth.

**15 · IMAGE → VIDEO PROMPTS** — 3 seconds, `sound: "off"` (the default is ON), one action in place
or across the frame, never toward or away from the lens. The clip must survive being cut to 1.5 s.

**16 · EDITING PLAN** — the cut, beat by beat: which shot, how long, where his take is underneath,
where the on-screen words land, where the grain and grade go. **Includes what Amir films and when**:
one take of the whole script, leave two seconds at each end. He sends it, Claude cuts it.

## PART E · SHIP

**17 · FINAL AD REVIEW** — against the refusal list, out loud, before it goes anywhere:

- Hook lands inside 2 seconds · first frame arresting and still
- **One** ask, in the destination's own words
- No named coach · no promised result on a timeline · no fear · no hype editing
- Every claim checkable on his own pages — **Iran prices only** in a Farsi ad
- Nothing generated implies a client, a result or a before/after
- Nothing in frame carries a logo, a brand name or yellow
- Everything readable sits between y≈250 and y≈1600
- **The WhatsApp reply ships with it** when the ask is C2

Then deliver: the MP4 by `SendUserFile`, the caption, the reply. Then a row in `LEDGER.md` — and once
he has posted it, **what it actually did**. That last column is the only thing that makes the next ad
better than this one.

---

## Learned the hard way

- **2026-09-21** — Five ad concepts written *before* asking who the audience was: two aimed at people
  who are not watching and a problem nobody reports. Ask first, write second.
- **2026-09-21** — All four purchase objections attack the *format* or a *belief*, never the price.
  An ad that only describes the course answers none of them.
- **2026-09-21** — Offered the hard version and the honest version of three edgy angles, Amir took
  the honest one every time. Offer the stronger-and-defensible variant rather than assuming.
- **2026-09-21** — His audience contains the coaches who share his work. That is a distribution
  argument against attacking coaches, not a manners one, and it is the one that persuaded.
- **2026-09-21** — He proposed this pipeline himself. The CTA sat at stage 14; moved to 6, because
  the ask decides the length, the hook and the last ten seconds of the film.
