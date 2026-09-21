# Ledger — every ad, what it cost, what it did

Read this at **Step 0** (do not remake a flop; do reuse a hook that worked) and write to it at
**Step 9**. The "what it did" column is the only thing that makes the next ad better than the last,
and it can only be filled in by Amir after he posts.

**The number is WhatsApp messages received** (BRAND §1). Views are context, not success.

---

## Posted

| Date | Ad | Angle | Hook | Shape | Ask | Credits | Views | **WhatsApp** | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| — | *nothing posted yet* | | | | | | | | |

---

## Made, not yet posted

| Date | Ad | Angle | Shape | Credits | Where it is |
|---|---|---|---|---|---|
| 2026-09-20 | **Reel 7 · "Dawn to Floodlights"** — 30 s, Farsi, fully generated, ends on the free demo | pre-dates the angle bank; closest to **A5 Order** (the 16 weeks as one day) | V2 | 0 new (2 pictures Amir made by hand) | `Content/reel-7-course.html`, sources in `Content/reel-7-course/` |

Amir's reaction to reel 7 when he watched it: *"incredible"*. It is the closest thing to a house
reference for a V2 ad — read its README before building another one.

---

## Planned, not built

**The five ads, draft 3** — rebuilt 2026-09-21 off the angle bank, after the first board turned out
to aim two of its five at an audience and a problem the interview says are not there. Board: `Content/tps-ads/plan-board.html` and the Artifact.
**Each has a full 17-stage brief** at `Content/tps-ads/ad-NN-<slug>.md` — that is the working
document; the board is the visual summary of it.

| # | Ad | Angle | Problem | Looks | Asks | Credits |
|---|---|---|---|---|---|---|
| 01 | His legs, not his technique | A8 | P5 + P1 | V1 | demo | 4 |
| 02 | Your own starting number | A1 + A7 | P4 | V3 | comment | 4 |
| 03 | Slow and bulky | **A12** | **P9** | V1 + V4 | demo | 0 |
| 04 | The brake nobody taught you | A2 + A4 | P3 | V1 + V4 | demo | 4 |
| 05 | A hundred dollars or seventeen | A5 + anchor | the objection | V5 | WhatsApp | 0 |

**Retired from draft 2**, and why: *Stronger in the gym* (built on a problem Amir does not hear) and
*New shoes again?* (parents are not in the audience — keep it as a share-driven idea, not cold reach).

## Generated 2026-09-21 — the nine start-picture candidates

9 credits (96.76 → 87.76). `gpt_image_2_5` flare, medium/1k, 9:16, 752×1344, each recomposed from a
shipped still passed as an `image_references` media. ⚠️ **Claude could not see these** — the session's
network refuses Higgsfield's CloudFront hosts, so **Amir judged them in the gallery**. Uploads to S3
worked (200), downloads did not: that asymmetry is worth remembering.

**Source media ids** (reusable for 24h from upload, then re-upload):
`3eeafb51-13e2-4618-9c81-e2db03db4fe2` full-acceleration ·
`87e57a85-fce0-45c0-b184-9e3169713c43` the-coin ·
`4bebf046-2047-4a38-ab66-28203bd6bbb8` braking-mark

| Shown | Slot | For | Job id | Picked? |
|---|---|---|---|---|
| 1 | push-off A | Ad 01 | `ba6d189b-7874-4438-95d5-fc7003dbf6a5` | |
| 2 | push-off B | Ad 01 | `ecaaeff9-fac0-4ac4-90e5-169498f69349` | |
| 3 | push-off C | Ad 01 | `28b7c675-ec0e-46f7-ae1d-ee9a52491e28` | |
| 4 | coin A | Ad 02 | `cfbfe236-ccde-4e19-ab70-6d5ec743fd5e` | |
| 5 | coin B | Ad 02 | `1ca13660-dcae-45cf-85ed-9703f486b7a5` | |
| 6 | coin C | Ad 02 | `ed1d1fa9-0d71-4ca5-bdf9-9f43d9a2198a` | |
| 7 | brake A | Ad 04 | `830e380e-0e15-4d0b-a2e5-95d5ddab0f0e` | |
| 8 | brake B | Ad 04 | `4d26dcc7-cfd8-4c04-ad8c-fb81f2160bd7` | |
| 9 | brake C | Ad 04 | `f71d9cfb-0426-41fb-8d73-5c79b591af2c` | |

**Next:** the winner's job id goes straight in as `start_image` for its clip (no download needed) —
3 clips × 3 credits = 9, taking the balance to about 78.76. Prompts: `PROMPTS.md`.

⚠️ **The rate limit is real and shared.** A 6-wide batch had 2 items rejected with
`429 rate_limit_reached` — **no job id and no charge** — and both went through on the next
submission. Resubmit only the rejected indexes.

## Assets already paid for — reuse before generating

Full detail in `.claude/skills/video/SKILL.md`'s ledger. The two that matter most for ads:

| What | Job id | Use |
|---|---|---|
| **Grip clip** — chalked hands tighten on a trap bar, chalk dust, 3 s silent, 9:16 | `804a5c00-f07c-422b-9c02-f66d2aa86d5c` | Confirmed good by Amir 2026-09-21. Gym b-roll. |
| **Night plate** — empty floodlit clay court, haze drifting, 3 s silent, 9:16 | `0a334ef3-3184-45f6-9f98-97ae5ed59bb1` | A calm plate to run type over. |
| Grip start picture, 752×1344 | `9c7eef38-a64e-47ae-8c17-daff50cb1746` | Vertical gym still. |
| Reel 7 court pair, 1080×1920 graded | — | `Content/reel-7-course/assets/bg-day.webp`, `bg-night.webp` — the only true verticals we own. |

Plus **78 shipped, graded stills**: `assets/tps/` (40) and `assets/art/` (38). Contact sheets:
`python .claude/skills/image/tools/shelf.py`.
