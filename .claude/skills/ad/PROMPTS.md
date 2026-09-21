# PROMPTS — ready to paste into Higgsfield

For Amir to run himself. Three clips, one per ad that wants motion. **None is required** — every one
has a still already in `assets/tps/` that does the job. They buy movement in the first ten seconds,
which is where movement is worth most.

**Cost: 4 credits each** (1 picture + 1 clip) — **12 for all three.** Craft behind all of it:
`.claude/skills/image/SKILL.md` and `.claude/skills/video/SKILL.md`.

---

## Settings

**Picture** — model `GPT Image 2.5`, variant **Flare** · quality **medium** · resolution **1k** ·
aspect **9:16** · 1 credit. Never leave aspect on auto; it returns portrait at the wrong ratio.

**Clip** — model **Cinema Studio v2** · mode **std** · duration **3 s** · aspect **9:16** ·
**sound OFF** · speedramp **slowmo** (P1, P3) or **linear** (P2) · 3 credits.

⚠️ **Sound defaults to ON and costs 1.5 credits extra for audio nobody uses.** Turn it off every
time. ⚠️ **3 seconds, never 5** — the action is front-loaded and the last two seconds are always
drifting dust.

**How each one runs:** upload the source picture named below (it is in the repo at
`assets/tps/<name>.webp`) as an **image reference**, paste the picture prompt, generate. Then feed
that result in as the **start image** for the clip and paste the clip prompt. Every clip opens
exactly on its start picture, which is what keeps them on brand.

---

## P1 · The push-off — Ad 1, «تکنیکش از تو بدتر بود»

**Source:** `assets/tps/full-acceleration.webp`

**Picture (9:16):**
> Recompose this photograph as a vertical 9:16 image. Same scene: a single white tennis shoe driving
> hard off deep red clay at the instant of a sprint start, a burst of fine red clay dust kicking up
> behind the toe, a white court line just visible beyond. Only the shoe and the lower leg are in
> frame. Low camera, close to the ground. Late low sun raking across the clay from one side, the rest
> of the frame in deep shadow. The shoe and the dust in the lower half of the frame, the top 40% dark
> and calm. Photograph, muted natural colour, clay orange the only saturated colour. No text, no
> numbers, no logos, no face, no yellow, no gold.

**Clip (3 s, slowmo, silent):**
> Static locked-off camera. The white shoe drives off the red clay and a burst of fine red dust
> explodes forward and up, drifting through the raking light. Grains of clay scatter across the
> ground. The camera does not move. Slow motion. Realistic, natural physics, no morphing, no extra
> limbs, no face.

---

## P2 · The coin and the tape — Ad 2, «کدوم عددت عوض شده؟»

**Source:** `assets/tps/the-coin.webp`

**Picture (9:16):**
> Recompose this photograph as a vertical 9:16 image. Same scene: a steel tape measure lying flat and
> taut on a dark green sports hall floor, running away from the camera, a small silver coin resting on
> the floor beside its blade. A clay-orange painted court line crosses the floor in the foreground.
> Low camera, close to the floor, looking along the tape. Soft low window light from one side, the
> rest of the room in deep shadow. Tape and coin in the lower half of the frame, the top 40% dark and
> calm. Photograph, muted natural colour, clay orange the only saturated colour. The tape has
> markings but no readable numbers. No text, no logos, no people, no yellow, no gold.

**Clip (3 s, linear, silent):**
> Static locked-off camera. The small silver coin spins and settles flat onto the floor beside the
> tape measure, wobbling to a stop, a faint puff of dust lifting as it lands. The tape does not move.
> Nothing else in the frame moves. Realistic, natural physics, no morphing, no people, no face.

---

## P3 · The brake — Ad 4, «زانوت موقع ترمز درد می‌گیره؟»

**The best of the three.** It is the exact thing the ad is about — deceleration — and we have no
moving footage of it.

**Source:** `assets/tps/braking-mark.webp`

**Picture (9:16):**
> Recompose this photograph as a vertical 9:16 image. Same scene: a deep slide mark carved into red
> clay, ending in a ridge of piled clay right at a white court line, the surface churned and grooved
> where a shoe has braked hard. Low camera close to the ground, looking along the mark toward the
> line. Low late sun raking across the clay from one side, the rest of the frame in deep shadow. The
> mark and the ridge in the lower half of the frame, the top 40% dark and calm. Photograph, muted
> natural colour, clay orange the only saturated colour. No text, no numbers, no logos, no people, no
> yellow, no gold.

**Clip (3 s, slowmo, silent):**
> Static locked-off camera. A white tennis shoe slides into the red clay and brakes hard, piling a
> ridge of clay ahead of it and throwing a burst of fine red dust forward and up through the low
> light. The shoe comes to a stop at the white line. Slow motion. Realistic, natural physics, no
> morphing, no extra limbs, no face.

---

## Writing your own

**Picture, in this order:** the scene, one thing, concrete · the light — *"low raking light from one
side, the rest of the frame in deep shadow"* is the reliable setting; a bright even room comes back
flat and cannot be fixed afterwards · **one** clay-orange object · *"subject in the lower half, the
top 40% dark and calm"* (that is where the caption sits) · *"Photograph, muted natural colour, clay
orange the only saturated colour"* · then what to avoid for this subject, plus *"no text, no numbers,
no logos, no face, no yellow, no gold."*

**Clip, 300–500 characters:** `Static locked-off camera.` · **one** action, present tense, happening
**in place or across the frame** · what the air does — dust, chalk, haze · *"Realistic, natural
physics, no morphing, no extra limbs, face never visible."*

**Five things that fail, proven:**
1. **Motion toward or away from the lens.** The subject shrinks to a dot or fills the frame. A
   push-off, a brake, a grip, a landing stays big.
2. **Anything yellow you did not think of as yellow** — tennis balls (dust them red), lemons,
   bananas, corn, butter.
3. **Objects that carry numbers** — tapes, stopwatches, clocks. Ask for markings and "nothing
   readable".
4. **Bright even light.** Describe the light, not the exposure.
5. **A second saturated colour.** One clay-orange object, and nothing else competing.

**When all three candidates miss the same way, the prompt is wrong — change the subject, do not roll
a fourth.**

---

## Changelog

- **2026-09-21** — Created. Three optional clips for the five rebuilt ads, plus the house formula.
