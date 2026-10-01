# Kit usage log, rotation and vetoes

The kit exists to save time on plumbing, not to decide what a reel looks like. These rules keep reels from becoming alike.
Amir's taste is collected here, newest verdicts included. `HANDOFF.md` says where things stand.

## Rules
1. **Concept first.** Read the clip, find its idea, choose the spine and the look. Only then reach for the kit.
2. **A signature moment.** Every reel gets at least one thing designed from scratch for THAT clip (a bespoke element,
   or a kit block used in an unexpected way). A good one is promoted into the kit afterwards.
3. **Rotation.** Log every reel below. A block that appears in three reels in a row is swapped for another variant or
   rested for a reel. Do not use the same spine (the same main device) in two reels in a row.
4. **Variants before repeats.** If a block is right again, use a different variant (entrance, layout, look, wipe).
5. **Small and sharp.** Aim for 15-20 blocks in use. The kit holds about 40 after four showreels, so retire stale ones (see
   "Retire next") once he confirms, and start a real reel from his favourites below, not from the whole shelf.
6. **His veto wins.** If he says "I've seen that" or "I don't like it", the block goes on the bench until he says otherwise.

## Bench (his veto; the code stays in the kit, do not use these until he says otherwise)
- `K.stamps` with `variant: "mask"`, `tone: "ink"`, `size: "sm"` (showreel 04): "does not like it" (2026-10-01).
- **21** `K.halo` (glow, ring, disc) and `K.sweep` on his own wall: "i dont like 21" (2026-10-01). The soft glow INSIDE a studio
  swap (22, 23) is part of those and stays.
- **33** `K.quote` (the page with the highlighter): "33 and 35 i dont like" (2026-10-01).
- **35** the whip WIPE (`wipeVariant: "whip"` on a full-screen card). The cut transition `K.whip` (37) is fine.

## His taste, all verdicts (the house style first)
**House style, in one paragraph:** big confident type; depth (type BEHIND him on a cut-out); him smaller and lower in frame with
type above ("i liked the text and how i was smalled"); his own room kept when possible ("the background was my own background"),
a studio colour as the occasional hinge; full-screen statement cards with strong, creative animation (3D, stroboscopic ghosts, an
odometer, a drum); very few elements at once; strong easing; clean wipes. He wants ideas, not a finished edit: "this is just idea
generation, i like it" (he is not editing these videos).

**Loved / "amazing" (start from these):**
- 07 ghost numeral + tag; 08-10 question cards (09 clay + iris over 08; 10 court + push); 12 the word behind him ("amazing").
- 19 hollow giant word and 20 drifting rows ("amazing", and the room was his own).
- 25 and 26 the broadcast court ("really creative").
- **29 the number behind him on a dark studio, he sinks: "the best" of showreel 3.**
- 30 and 31 versus ("amazing"). 32 the drum list ("amazing"): he wanted it ON his video too, built as 39 (`mode:"video"`) and **"i loved 39"**
  (2026-10-01). So the overlay reading of "on the video itself" was right; the drum rolling the footage itself between cuts is optional.

**Good:** 40 a clay-studio number behind him (two digits); 05-06 chips; 11 checklist paper (over 13 dark); 17 cta bubble (over 16 stamp); 22 clay studio; 18 poster (green studio,
type stacked, him smaller); 27 and 28 number slam; 34 slice wipe; 36 zoom wipe; 37 and 38 cut transitions (whip, zoom).
01 pop and 02 slide stamps are good if we ever do captions (he adds those himself); 03 drop suits a statement that is not a caption.

**Not liked:** see the Bench. 14 and 15 (photo courts) were "good but the animation was not creative": redone as 25 and 26.

The kit's defaults follow this: question = clay + iris, checklist = paper, cta = bubble, backdrop swap sinks him (`lower`).

## The showreels (idea generation on his footage HCTV3230; the build scripts are in `showreel/`)
| # | Blocks | Delivered file | Verdict |
|---|---|---|---|
| 1 | 01-17 stamps, chips, ghost, tag, question cards, checklist, behind-him word, cta, wipes | `kit-showreel\kit-showreel.mp4` (75 s) | see taste |
| 2 | 18-26 the depth family, the broadcast court | `kit-showreel2\kit-showreel2.mp4` (52 s) | see taste |
| 3 | 27-38 number slam, number behind him, versus, drum list, quote, wipes, cut whip | `kit-showreel3\kit-showreel3.mp4` (71 s) | see taste |
| 4 | 39-40 the drum on his own video, a clay-studio number behind him | `kit-showreel4\kit-showreel4.mp4` (16 s) | **loved 39; 40 good** |
All under `C:\Users\Amir\Videos\Reels\`. Contact sheets: `showreel/showreelN-sheet-*.png`.

## Retire next (propose once he confirms: the kit is too big)
The photo courts `K.courtSteps` / `K.courtMeasure` (superseded by 25-26, kept only so showreel 1 still builds), `K.halo` and `K.sweep`
on the wall, `K.quote`, the whip wipe, the benched stamp variant. Do not delete without his word.

## Log (one line per real reel: what the spine was, which blocks and variants, what was bespoke)
- **HCTV3230 v1** (2026-10-01, "the three checks"): spine = checklist (paper) ticked on the proof; stamps pop (hook tag),
  chips grid, ghost numeral, question card ink with clay wipe, court steps, court measure, word behind him (clay then
  paper), tag with ring, closing stamp (slide), call to action stamp, flash once; sounds: pop, whoosh, ding, thock, hit,
  stamp. Bespoke: none (all of it became the kit).
