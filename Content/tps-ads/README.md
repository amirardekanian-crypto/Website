# Five ads for the tennis course — the plan

`plan-board.html` is the board Amir opens: five ad concepts for the Tennis Performance System
(`/tennis/`, the paid Farsi course at `/tennis/app/`), each doing a different job. Built 2026-09-21.
Also published as an Artifact: https://claude.ai/artifact/Wqw1QznEYc8NufX7bm6s1P

**Status: nothing has been generated.** Balance was 96.76 before this session and is unchanged.
Amir's call on 2026-09-21 was *"nothing yet"* — refine the concepts and the copy first.

## The five, and why they do not overlap

Read in order they are a funnel, not five versions of one ad.

| # | Name | Job | Talks to | The one idea |
|---|---|---|---|---|
| 01 | One step late | Cold reach | A player who trains tennis and never trains their body | You lose the point at the second step, not at the racket |
| 02 | Stronger in the gym | The differentiator | A player who already lifts | Strength does not become speed by itself — block 4 is literally «انتقال به زمین» |
| 03 | New shoes again? | A new audience | **Parents of 13–17 year olds** | The course's own first sign of a growth spurt, in its own words |
| 04 | Your own starting number | Value first | Anyone who has never measured anything | Give the broad-jump test away whole; it is already free in the demo |
| 05 | Once, forever | The close | Someone who saw the demo and did not buy | Price, no subscription, and it works offline |

Each also has its own **look**, not just its own words: 01 never lifts the camera off the clay;
02 is hard cuts between iron and clay; 03 is a home, with no court or gym in it at all;
04 is a measurement graphic; 05 is one unbroken dark plate with type on it.

## Decisions (Amir, 2026-09-21)

- **Ad 05 goes to WhatsApp, not the demo.** It is the only ad that asks for money, so it runs to
  people who already saw the demo. Its last frame carries the price card's own words, «خرید از واتساپ».
  Ads 01–04 all end on the demo button, «هفته‌ی ۱ رو رایگان امتحان کن», verbatim off `links.html`.
- **The trap-bar grip clip from 2026-09-20 is good** (job `804a5c00-f07c-422b-9c02-f66d2aa86d5c`).
  Ad 02 opens on it, so Ad 02 generates nothing.
- **No generating yet.**

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
