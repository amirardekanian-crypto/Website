# Five ads for the tennis course — the plan

`plan-board.html` is the board Amir opens: five ad concepts for the Tennis Performance System
(`/tennis/`, the paid Farsi course at `/tennis/app/`), each doing a different job. Built 2026-09-21.
Also published as an Artifact: https://claude.ai/artifact/Wqw1QznEYc8NufX7bm6s1P

**Status: nothing has been generated.** Balance was 96.76 before this session and is unchanged.
Amir's call on 2026-09-21 was *"nothing yet"* — refine the concepts and the copy first.

## The five (rebuilt 2026-09-21, draft 3)

The first draft was drawn before the interview and aimed two of its five ads at an audience that is
not watching (parents) and a problem nobody reports (not knowing what to do in the gym). Rebuilt off
`.claude/skills/ad/STRATEGY.md`, every ad now opens on something **a customer actually said**.

| # | Ad | Angle | Their words | Looks | Asks | Credits |
|---|---|---|---|---|---|---|
| 01 | His legs, not his technique | A8 | *"my energy is low and my legs are tired"* | V1 | demo | 4 |
| 02 | Your own starting number | A1+A7 | *"however much I train, I don't get better"* | V3 | comment | 4 |
| 03 | **Slow and bulky** | A12 | *"the gym will make me slower or bulky"* | V1+V4 | demo | **0** |
| 04 | The brake nobody taught you | A2+A4 | *"knee pain from deceleration"* | V1+V4 | demo | 4 |
| 05 | A hundred dollars or seventeen | A5 | they ask the price first | V5 | WhatsApp | **0** |

**Ad 03 is the new one and may be the most valuable.** It is the only objection that stops someone
before they consider buying anything, and it is Amir's own argument from the other side: they fear
the gym because the gym they have seen is bodybuilding.

**Each ad has its own brief**, all 17 stages of Amir's pipeline filled in — objective, audience,
problem, objection, message, CTA, idea, emotion, storyboard, script, shot list, look lock, prompts,
selection, video prompts, edit plan, review:

- [`ad-01-the-match-you-lost.md`](ad-01-the-match-you-lost.md)
- [`ad-02-your-own-starting-number.md`](ad-02-your-own-starting-number.md)
- [`ad-03-slow-and-bulky.md`](ad-03-slow-and-bulky.md) ← **film this one first**
- [`ad-04-the-brake-nobody-taught-you.md`](ad-04-the-brake-nobody-taught-you.md)
- [`ad-05-a-hundred-or-seventeen.md`](ad-05-a-hundred-or-seventeen.md)

The blank is `.claude/skills/ad/BRIEF-TEMPLATE.md`; the pipeline is `.claude/skills/ad/SKILL.md`.
Shot-list craft: `SHOTS.md`. Higgsfield prompts for the three optional clips: `PROMPTS.md`.

## Working folders

- **`takes/`** — Amir's filmed takes go here. It is the only way a recording reaches Claude; the web
  sessions cannot download from Higgsfield, though they can upload to it.
- **`clips/`** — Higgsfield clips after Amir downloads them. Three already generated and waiting in
  his gallery; job ids in `.claude/skills/ad/LEDGER.md`.

⚠️ **Amir writes his own scripts when he wants to** (2026-09-21) — that is **Route B** in
`.claude/skills/ad/SKILL.md`, and it makes a better edit than Route A because the beats come from
his real delivery. The scripts in the five briefs below stay as drafts for the ads he does not
rewrite.

## Decisions (Amir, 2026-09-21)

- **Ad 05 goes to WhatsApp, not the demo.** It is the only ad that asks for money, so it runs to
  people who already saw the demo. Its last frame carries the price card's own words, «خرید از واتساپ».
  Ads 01–04 all end on the demo button, «هفته‌ی ۱ رو رایگان امتحان کن», verbatim off `links.html`.
- **The trap-bar grip clip from 2026-09-20 is good** (job `804a5c00-f07c-422b-9c02-f66d2aa86d5c`).
  Ad 02 opens on it, so Ad 02 generates nothing.
- **No generating yet.** All three clips are optional — each has a shipped still that does the job.
- **Iran prices only** in any Farsi ad: ۲۵ دلار در ماه, so ~$100 for the same 16 weeks, against $17.
  The $200-for-4-months is the English ladder and the £50 session is the UK; neither may appear.
- **Amir is on camera**, so four of the five are talking-head.

## Copy provenance — the point of the board

Every Farsi line on the board is tagged **verbatim** / **from the course** / **draft**. 21 of 30 lines
are the course's own words; **9 are drafts** and are Amir's to rewrite. Sources: `tps_content`
(lessons `growth`, `speed-braking`, `tennis-demands`; test `broad-jump`; the four block names),
the `/tennis/` stats bar, price card and offline FAQ, and the `links.html` buttons.

⚠️ Two content rules the ads must keep, both taken from the course itself:
- **Ad 03 does not fear-sell.** The growth lesson's own callout — «رشد سریع سالم است و علامت خطر
  نیست» — stays in the ad, in clay, held longer than anything else.
- **Ad 04 shows no pass/fail number.** The course sets no standard for the broad jump; you only ever
  compare with your own number («فقط با عددِ خودت مقایسه می‌کنی»). That honesty *is* the ad.

## What it would cost

12 credits for all five: 3 pictures recomposed to 9:16 (1 each) + 3 clips (3 s, silent,
Cinema Studio v2 `std`, 3 each). Ads 02 and 05 cost nothing — they reuse clips already paid for on
2026-09-20 (`804a5c00…` the grip, `0a334ef3…` the night plate). Ad 01 alone is 4, if a single
finished ad is wanted before the rest.

Reused pictures, all already shipped and graded: `braking-mark`, `door-frame`, `the-coin`,
`first-light`, plus the reel-7 vertical masters. See `.claude/skills/image/LEDGER.md`.

## ⚠️ This session could not download from Higgsfield

The network policy in the 2026-09-21 session refused both Higgsfield CloudFront hosts
(`d8j0ntlcm91z4` and `d2ol7oe51mr4n9`, `connect_rejected`, 403 to CONNECT), so generated files could
not be pulled down to judge, grade or cut. Generation and `show_generation_by_ids` still work, so
Amir can see results in the gallery — but **assembling the finished reels needs a session that can
reach those hosts**, or the files dropped into the repo by hand. Check
`curl -sS "$HTTPS_PROXY/__agentproxy/status"` before planning a build.

## Rebuild

```
python Content/tps-ads/src/build_board.py      # -> Content/tps-ads/plan-board.html
```
`src/build_board.py` holds the concepts, the beats and the provenance tags (edit the copy there, not
in the HTML); `src/board.tpl.html` is the page shell; `assets/ad1..ad5.jpg` are 9:16 crops of existing
shipped pictures, indicative previews only. The rebuild is deterministic — it reproduced the published
board byte for byte on the day it was saved.

`Content/` is excluded in `_config.yml`, so none of this is served on the live site.

## Next

The board's own "Where this stands" section lists what is open: whether these are the right five
(the parents' ad is the real bet — a new audience, not a new angle), the 9 draft lines, and where the
build runs. Nothing is generated until Amir says go, with a number.
