---
name: ad
description: Build an Instagram ad that sells one of Amir's products — from the brand and audience definition, through the angle, hook, Farsi script and shot list, to the Higgsfield prompts and a finished MP4 he can post. Use whenever Amir asks for an ad, a promo, "something to sell the course", a hook, an ad script, an ad concept or a batch of ad ideas. Read BRAND.md before writing a single word.
---

# Ad creation — AA Performance

Turn a product and a problem into **one postable ad**: an angle, a hook, a Farsi script in Amir's
mouth, a shot list, only the Higgsfield generation that is still missing, and a finished vertical
MP4. Built 2026-09-21 from a five-round interview with Amir; this file is the process, and the two
files beside it are the content.

| File | What it is | When |
|---|---|---|
| **`BRAND.md`** | Who Amir is, who is watching, what he will never do. The interview, not my inference. | **Step 0, every run.** |
| **`STRATEGY.md`** | The ten principles, ten angles, thirteen hooks, the problem→angle map, five visual concepts, three CTAs. | Step 2. |
| **`SHOTS.md`** | How Amir films himself, the source ladder, and the five current ads' shot lists. | Step 4. |
| **`PROMPTS.md`** | Paste-ready Higgsfield prompts, and the house formula for writing new ones. | Step 7. |
| **`WHATSAPP.md`** | What Amir sends when someone messages — the price anchor, the objections, the routing. | Step 3, for any ad whose ask is WhatsApp. |
| **`LEDGER.md`** | Every ad made, what it cost, what it did. | Step 0 (read) and step 9 (write). |
| `.claude/skills/image/SKILL.md` | Prompt craft, settings, real prices, judging, grading. **Its Step 0 is the reuse pass.** | Steps 5 and 7. |
| `.claude/skills/video/SKILL.md` | The clip pipeline and the spend protocol. | Steps 6 and 7. |
| `.claude/skills/reel/SKILL.md` | The animated-HTML reel engine, for a V2 ad with no human in it. | Step 8, sometimes. |

## ⚠️ The two rules that override everything

1. **Never generate before Amir has said yes to a plan with numbers in it.** Credits come from a pot
   shared with his own work. The plan block and the protocol live in
   `.claude/skills/video/SKILL.md`; they bind here unchanged. `get_cost: true` preflights for free.
2. **He films, Claude assembles.** Amir can film often, edits in Instagram's own editor, and editing
   is what stops him (BRAND §4). So the deliverable is a **finished MP4**, never a pile of parts.
   Everything generated exists to make that cut.

---

## Step 0 — read before thinking

1. **`BRAND.md`**, all of it. The refusal list in §5 is not advisory.
2. **`LEDGER.md`** — what has been made, and what landed. Do not re-make an ad that flopped, or
   re-shoot a hook that worked (reuse the clip).
3. **`git status --short`** and a look at `assets/tps/`, `assets/art/` and any scratchpads — two
   sessions once generated the same twelve pictures in the same minute.

---

## Step 1 — the brief, in one line

**One ad = one problem × one objection × one angle × one ask.** Write that line before anything
else; if it cannot be filled in, there is no ad yet, and the honest move is to ask Amir which of the
three problems this one is for.

Also fix, before writing: **which product** (the $17 course by default — BRAND §1), **who it is
aimed at** (a stranger on explore, or someone who has already seen the demo), and **the visual
shape** (V1 talking head, V2 fully generated, V3 demonstration — `STRATEGY.md`).

### Step 1b — competitive research, when it is wanted

`STRATEGY.md`'s research section is empty and says so. If Amir asks for research, or an ad leans on
a claim about the market, do it properly — name accounts, collect real posts, write down hook shapes
and production level — and put it in that file. **Never imply research that has not happened.**

---

## Step 2 — angle and hook

**Check the ten principles first** (`STRATEGY.md` §1) — especially *open on a problem or a desire,
never the product*, *no wasted second*, and *an arresting first frame that is still*.

Pick the angle from `STRATEGY.md` using the problem→angle map. Default to **A1 Measurement** when
nothing argues otherwise: it is the only angle that serves Amir's own argument, the strongest
objection and the position at once.

Then write **three hooks**, from the six shapes, and read them out loud. He has to say them.

- Nothing in the first two seconds names the course, the price or the app.
- No question a viewer can answer "no" to and scroll on.
- Show him all three and let him pick — he picks fast, and his ear is better than the page.

---

## Step 3 — the script

**Farsi. Teacherly. His mouth, not a brand voice.** He explains things: calm, structured, a coach at
a whiteboard. Colloquial Tehrani in grammar, precise in content.

Write it as a table so it can be filmed and cut from one document:

| # | Time | Spoken (Farsi) | On screen | What the viewer sees |
|---|---|---|---|---|
| 1 | 0:00–0:03 | the hook, word for word | — | his face, tight |
| 2 | 0:03–0:09 | … | a number or 3 words | b-roll under his voice |

**Rules.**
- **Every spoken line is word for word.** Never "he explains the tests here".
- **Mark each line's source** the way the ad board does — **verbatim** from the course / page /
  button, **from the course** (its own fact, tightened), or **draft** (yours, and say so). Amir
  rewrites the drafts; he should be able to see which they are at a glance.
- **20–40 seconds.** A teaching angle may run longer if every second teaches.
- **On-screen text is not the script repeated.** It carries the number, the word or the name his
  voice cannot spell — three or four words at most, and Persian numerals.
- **The last line is the one ask**, in the destination's own words.
- **If the ask is WhatsApp, the matching reply from `WHATSAPP.md` ships with the ad** (BRAND §8) —
  usually T3, since most people open by asking the price. Adapt it to this ad's promise rather than
  writing a new one, and **keep the price anchor exactly as it is**: $17 once against ~$100 for the
  same 16 weeks of personal coaching.

Check the finished script against the refusal list before showing it: no named coach, no promised
outcome on a timeline, no fear, no invented number.

---

## Step 4 — the shot list

One row per shot, and **every row says where the picture comes from** — that is what makes the next
two steps cheap.

**`SHOTS.md` holds the format, the filming rules and five worked examples.** Copy one of those
shot lists rather than inventing a layout.

**Sources, in the order to try them:** `AMIR` (free, and the strongest thing in the ad) · `HAVE` (a
clip or picture already generated — `LEDGER.md` and `.claude/skills/video/SKILL.md`'s ledger) ·
`REUSE` (a shipped still, mirrored or re-cropped — `.claude/skills/image/SKILL.md` Step 0) ·
`CAPTURE` (a real screen of the real app) · `GENERATE` (last, and only what is still missing).

**Shot vocabulary for the talking head:** chest-up medium close for the hook and the ask, wider for
explanation, and cut away to b-roll whenever he names a concrete thing. He should film **one take of
the whole script**, not shot by shot — the cutaways are laid over it in the edit. Tell him to leave
a beat of silence at the top and tail.

⚠️ **Shoot dull, not bright.** The house grade deepens shadows and warms highlights; it cannot
rescue a blown-out frame. Soft, low, indirect light. Nothing in shot with a logo, a brand name or
yellow.

---

## Step 5 — the reuse pass

Run `.claude/skills/image/SKILL.md` **Step 0** over every `GENERATE` row, honestly. On the day that
rule was written, 10 of 29 covers turned out to already exist.

Then say what you found in one line — *"7 of the 9 shots exist, so I would generate 2"* — before
any plan or price.

---

## Step 6 — the plan, and wait

The plan block from `.claude/skills/video/SKILL.md`, unchanged: a table of every generation, what it
is made from, its length, sound **off**, and its credits; the total; the balance before and after.

**Then stop.** A "go" covers that plan and anything cheaper, never anything dearer or different.

---

## Step 7 — the Higgsfield prompts

Only for what survived step 5. **`PROMPTS.md` already holds paste-ready prompts for the three clips
the current five ads want**, plus the house formula — check there before writing a new one. Full
craft in `.claude/skills/image/SKILL.md` (pictures) and
`.claude/skills/video/SKILL.md` (clips); what follows is only what is particular to an ad.

**A start picture, 9:16, in this order:** the scene, concrete and singular · the light (the
brightness dial — for an ad plate, *"overall dark and moody, one narrow shaft of light across X, the
rest in deep shadow"*) · **one** clay-orange prop · the composition (**subject in the lower half,
top 40% dark and calm** — that is where the caption lands) · the palette guard (*"photograph, muted
natural colour, clay orange the only saturated colour"*) · the avoid list for this subject, then
*"no text, no numbers, no logos, no face, no yellow, no gold."*

**A clip, 300–500 characters:** `Static locked-off camera.` · **one** action, present tense,
**in place or across the frame, never toward or away from the lens** · what the air does (dust,
chalk, haze) · *"Realistic natural physics, no morphing, no extra limbs, face never visible."*

**Settings:** `gpt_image_2_5` medium/1k, 16:9 or 9:16 explicitly, 1 credit · clips 3 s,
`sound: "off"` (the default is ON — it is a trap), `mode: "std"`, Cinema Studio v2 at 3 credits.
Submit at most 6 at a time.

**Three ad-specific rules.**
1. **The clip must survive being cut to 1.5 s.** Action is front-loaded; an ad rarely holds a plate
   longer.
2. **Nothing generated may carry a claim.** It is atmosphere, never evidence (BRAND §5.6) — no
   invented athlete implied to be a client, no before/after.
3. **Match it to his footage.** A plate that cuts against his talking head must sit in the same
   light. Grade both through one pass.

---

## Step 8 — assemble and deliver

**The output is a finished vertical MP4 he can post.** 1080×1920, everything readable between
y≈250 and y≈1600.

- **V1 / V3 (he is in it):** he sends one take. Cut the b-roll under it, add the on-screen words,
  grade his footage toward the house look, put the same fine grain over his footage and the
  generated plates so the seams do not show, and export.
- **V2 (no human):** build it in the reel engine (`.claude/skills/reel/SKILL.md`) and export with
  `render_mp4.js`.
- **Audio:** his voice is the track. Generated clips are silent. He adds music in Instagram.
- **Ship:** the MP4 by `SendUserFile`, plus the caption, plus — when the ask is WhatsApp — his
  suggested first reply.
- **Check before sending:** the hook lands inside 2 seconds · the ask is one · the refusal list is
  clean · nothing generated implies a result · the button words match the page.

⚠️ **Downloading from Higgsfield can be blocked by the session's network policy** (it was on
2026-09-21: both CloudFront hosts refused CONNECT). Check
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` before promising an assembly. Generation and
`show_generation_by_ids` still work when downloads do not, so Amir can view results even then — but
the cut has to happen somewhere the files can be fetched.

---

## Step 9 — log it

A row in `LEDGER.md`: the ad, its angle, its hook, what it cost, what it was made from, and — once
he has posted it — **what it actually did**. Views are not the number. WhatsApp messages are.

This is the only step that makes the next ad better than this one. Do not skip it.

---

## Learned the hard way

Append a dated line whenever a round teaches something.

- **2026-09-21 (the interview)** — Five ad concepts written *before* asking who the audience was:
  two of them aimed at people who are not watching (parents) or at a problem nobody reports (not
  knowing what to do in the gym). **Ask who is watching and what they say before writing an ad**,
  not after.
- **2026-09-21** — All three purchase objections attack the *format*, not the price. An ad that only
  describes the course well answers none of them.
- **2026-09-21** — Amir chose the honest version of all three edgy angles when they were offered
  next to the hard ones. Offer the stronger-and-defensible variant rather than assuming he wants the
  safe one or the sharp one.
- **2026-09-21** — His audience contains the coaches who share his work. That is a distribution
  argument against attacking coaches, not a manners argument, and it is the one that persuaded.
