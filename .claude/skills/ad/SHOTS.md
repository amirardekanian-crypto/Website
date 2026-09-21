# SHOTS — how to film him, and the five shot lists

`STRATEGY.md` picks the angle. This file turns it into shots. `PROMPTS.md` holds the Higgsfield
prompts for the few shots nothing already covers.

---

## 1. Filming Amir — the house rules

He films himself on his phone. Nothing here needs a crew, a light or a second person.

**Framing.** Chest-up medium close for the hook and the ask. A step wider for explanation, so a cut
between them is visible. Phone **vertical**, lens at eye height — not below, which makes everyone
look like they are addressing a committee. Eyes to the lens, not to the screen.

**Light.** Soft, indirect, in front of him: a window to the side, an overcast day, a gym doorway.
⚠️ **Shoot dull, never bright.** The house grade deepens shadows and warms highlights; it can
rescue a dull frame and cannot rescue a blown-out one. Never direct sun, never a window behind him.

**Sound.** The phone mic is fine indoors, out of wind. His voice is the ad's only audio track —
generated clips are silent and music goes on in Instagram.

**The one-take rule.** He films the **whole script in one take**, not shot by shot. Cutaways are laid
over it in the edit, which is what hides a stumble. Leave two seconds of silence at the top and tail.
Two or three takes of the whole thing beats twelve takes of fragments.

**Wardrobe and frame.** Plain, dark, no logos, no brand names, **no yellow**. Behind him: a plain
wall, a gym, a court fence — anything without text. Nothing on screen may read as another brand.

**What never to film.** Exercise form. A grip, a push-off, a measurement, a hand on a bar is fine;
a rep is not (`BRAND.md` §5, look rules).

---

## 2. Where a shot comes from — the ladder

Try in this order. Most shots stop at the first three.

| Tag | Source | Cost |
|---|---|---|
| **AMIR** | He films it | free, and the strongest thing in the ad |
| **HAVE** | A clip or picture already generated and paid for (`LEDGER.md`) | free |
| **REUSE** | A shipped still from `assets/tps/` (40) or `assets/art/` (38), mirrored or re-cropped | free |
| **CAPTURE** | A real screen of the real app — `capture_app_screens.js`, never a mock-up | free |
| **GENERATE** | Last, and only what is still missing | 1 credit a picture, 3 a clip |

⚠️ **Run `.claude/skills/image/SKILL.md` Step 0 before tagging anything GENERATE.** The shelf is 78
graded pictures deep and it keeps turning out to already hold the shot.

**Shot list format** — one row per shot, and every row names its source:

| # | Beat | Shot | Source | Notes |
|---|---|---|---|---|

---

## 3. The five ads

Rebuilt 2026-09-21 off the angle bank. Each one takes a different angle, a different problem **in the
customer's own words**, a different visual concept and a different ask.

| # | Ad | Angle | Problem | Looks | Asks |
|---|---|---|---|---|---|
| 1 | **The match you lost** | A8 | P5 + P1 | V1 | C1 demo |
| 2 | **Which number changed?** | A1 + A7 | P4 | V3 | C3 comment |
| 3 | **Slow and bulky** | A12 | P9 | V1 + V4 | C1 demo |
| 4 | **The brake nobody taught you** | A2 + A4 | P3 | V1 + V4 | C1 demo |
| 5 | **$100 or $17** | A5 + price | the objection | V5 | C2 WhatsApp |

---

### AD 1 · «تکنیکش از تو بدتر بود. پاهاش نه.»

Opens on the sharpest thing in the bank: the match everyone has lost and nobody can explain. The
explanation is the third set, and the third set is legs — *"my energy is low and my legs are tired"*,
their words.

| # | Beat | Shot | Source | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:04 hook | MCU Amir, chest up, plain wall | **AMIR** | The hook is the whole ad. One take, no smile at the top. |
| 2 | 0:04–0:09 | Clay, low, a shoe driving off in a burst of dust | **REUSE** `full-acceleration` → 9:16 | Or **GENERATE** the clip, P1 in `PROMPTS.md` |
| 3 | 0:09–0:16 | Amir, one step wider | **AMIR** | the third set argument |
| 4 | 0:16–0:21 | Top-down clay, scuffed rally marks | **REUSE** `rally-map` | slow push in |
| 5 | 0:21–0:26 | Spider-drill points on the lines | **REUSE** `five-points` | |
| 6 | 0:26–0:32 ask | Amir, back to MCU | **AMIR** | «هفته‌ی ۱ رو رایگان امتحان کن» |

### AD 2 · «شش ماهه تمرین می‌کنی. کدوم عددت عوض شده؟»

The house angle, and the one that travels furthest — it gives a whole test away, and the test is
already free in the demo, so the payoff is a real page rather than a teaser.

| # | Beat | Shot | Source | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:04 hook | MCU Amir | **AMIR** | a question he is about to answer |
| 2 | 0:04–0:08 | Tape measure on a hall floor, coin at the zero | **REUSE** `the-coin` → 9:16 | Or **GENERATE** the clip, P2 |
| 3 | 0:08–0:20 | Amir demonstrating the set-up: tape laid, toes behind the line | **AMIR** (V3) | ⚠️ the set-up and the measurement only — **never the jump** |
| 4 | 0:20–0:27 | Tape, stopwatch, cones on a dark floor | **REUSE** `test-day` | the other six tests exist |
| 5 | 0:27–0:33 | Amir | **AMIR** | two test days, 2–5 days apart, average them |
| 6 | 0:33–0:38 ask | Amir | **AMIR** | «عددت رو بنویس» — the comment ask |

### AD 3 · «می‌ترسی باشگاه کندت کنه؟ حق داری.»

The myth that stops them before they consider anything. **Agree with the fear, then move it onto the
method.** Never argue "no it won't" — they have watched it happen, to bodybuilders.

| # | Beat | Shot | Source | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:05 hook | MCU Amir | **AMIR** | «حق داری» lands in the first five seconds or the ad fails |
| 2 | 0:05–0:10 | A long row of dumbbells receding into shadow | **REUSE** `the-row` | *this* is the gym they are picturing |
| 3 | 0:10–0:14 | **CUT.** A single hex bar on a dark floor | **REUSE** `the-heavy-set` | V4 — heavy, few, nothing else |
| 4 | 0:14–0:20 | Chalked hands tighten on the bar, chalk dust lifts | **HAVE** clip `804a5c00` | 0–3 s, silent |
| 5 | 0:20–0:26 | Medicine ball hitting a wall in a burst of dust | **REUSE** `impact` | the other half: power, not mass |
| 6 | 0:26–0:34 | Amir | **AMIR** | the four blocks by name; the fourth is the court |
| 7 | 0:34–0:39 ask | Amir | **AMIR** | demo |

### AD 4 · «زانوت موقع ترمز درد می‌گیره؟»

Their exact words were *knee pain from deceleration*. Braking is a skill nobody taught them, and it
is trainable — so this teaches, and never frightens.

| # | Beat | Shot | Source | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:05 hook | MCU Amir | **AMIR** | ⚠️ no fear, no "or else". Refusal 3. |
| 2 | 0:05–0:11 | A slide mark ending in a ridge of piled clay at a white line | **REUSE** `braking-mark` → 9:16 | the single best picture we own for this ad |
| 3 | 0:11–0:16 | The same brake, moving — dust bursting forward | **GENERATE** clip, P3 | optional; the still carries it if not |
| 4 | 0:16–0:26 | Amir | **AMIR** | braking is a skill; it is trained, and the course trains it |
| 5 | 0:26–0:31 | Orange tape and a folded knee sleeve on a bench | **REUSE** `armour` | robustness, quietly |
| 6 | 0:31–0:36 | Amir | **AMIR** | ⚠️ **the doctor referral stays in** — this is what makes it trustworthy |
| 7 | 0:36–0:41 ask | Amir | **AMIR** | demo |

### AD 5 · «۱۰۰ دلار یا ۱۷ دلار؟ همون ۱۶ هفته.»

The only one that asks for money. Runs to people who have already seen the demo. Quietest of the
five on purpose — it has to feel expensive to be believed as cheap.

| # | Beat | Shot | Source | Notes |
|---|---|---|---|---|
| 1 | 0:00–0:04 hook | Empty floodlit clay court at night, haze drifting | **HAVE** clip `0a334ef3` | 3 s, silent, type over it |
| 2 | 0:04–0:10 | Amir | **AMIR** | the comparison: same 16 weeks |
| 3 | 0:10–0:18 | Real app screens — programme, session card, a test | **CAPTURE** demo | `capture_app_screens.js` |
| 4 | 0:18–0:24 | The app offline — status bar swapped | **CAPTURE** demo | it works after the first sign-in |
| 5 | 0:24–0:30 | Amir | **AMIR** | «یه‌بار پرداخت، بدونِ تاریخِ انقضا» |
| 6 | 0:30–0:35 ask | Button, brand row | **BUILD** | «خرید از واتساپ» + ships with reply **T3** |

⚠️ **Prices in this ad are Iran prices only** — معادلِ ۲۵ دلار در ماه, so ~$100 for 16 weeks,
against $17. The $200 and the £50 UK session never appear in a Farsi ad (`STRATEGY.md` §6).

---

## 4. What actually needs generating

Everything above is covered by what we own **except three optional clips**. Each is one vertical
start picture (1 credit) plus one 3-second silent clip (3 credits) = **4 credits each, 12 for all
three**. Every one has a still that already does the job, so none of them is required — they buy
motion in the first ten seconds, which is where motion is worth most.

| | Clip | For | Built from |
|---|---|---|---|
| **P1** | Shoe driving off clay, dust bursting | Ad 1 | `full-acceleration` |
| **P2** | Tape and coin on a hall floor, light moving | Ad 2 | `the-coin` |
| **P3** | A shoe braking hard, clay piling and dust bursting forward | Ad 4 | `braking-mark` |

Prompts ready to paste: **`PROMPTS.md`**.

---

## Changelog

- **2026-09-21** — Created. Filming rules, the source ladder, and the five rebuilt shot lists.
