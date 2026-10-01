# The kit's blocks (stage 1, plus stage 2: the depth family, the broadcast court and the statement cards)

Ingredients, not recipes. Read the clip, find its idea, choose the concept, THEN reach for these for the plumbing.
Every block: `K.name(content, options)` in a reel's `BLOCKS_JS`; times are seconds on the EDITED clock (wrap speech-tied
times in `E(sourceSeconds)`); it returns its elements so a reel can add bespoke tweens on top. See the showreel
(`showreel/`) for every block and variant running on his footage: 01-17 in showreel 1, 18-26 in showreel 2 (the depth family and the broadcast court), 27-38 in showreel 3 (the statement cards and the new wipes), 39-40 in showreel 4 (the drum on his video, a clay-studio number).

Brand defaults baked in (breakable on purpose, say so in the plan): clay is the one accent, hard-corner stamps, paper and
dark plates, green = done, Vazirmatn, RTL, whole-word animation, Persian digits (`K.fa(12)` gives ۱۲).

**Start from his favourites (verdicts in the Status column and in `USAGE.md`):** 12 the word behind him, 19 hollow giant word,
20 drifting rows, 25-26 the broadcast court, **29 the number behind him on a studio with him smaller (his best)**, 30-31 versus,
32 the drum, **39 the drum on his video (loved)**, 07 ghost numeral, 08-10 question cards. **Benched:** 04 (mask stamps), 21 (halo, ring, disc, sweep
on the wall), 33 (the quote page), 35 (the whip wipe).

**His verdict on showreel 1 (2026-10-01)** is in the Status column and in `USAGE.md`. The family he calls "premium" and
wants MORE of: 07 (ghost numeral + tag), 08-10 (question cards), 12 (the word behind him).

| # | Block | What it is | Options and variants | Use it when | Do NOT use it when | Status |
|---|---|---|---|---|---|---|
| 01-03 | `K.stamps(words, o)` | One clay stamp per spoken word, in a row | `at[]`, `y`, `size` big/sm/huge/mega, `tone` paper/ink/green/bad, `variant` pop/slide/drop/mask, `x`, `out` | A short phrase he stresses (hook, name, contrast). `pop` and `slide` read as caption-style words (he likes them for that); `drop` suits a statement that is not a caption | More than ~4 words (it becomes a caption) | 01, 02, 03 liked. **04 (`mask` + ink + small) benched** |
| 05-06 | `K.chips(items, o)` | A list of options popping in as he says each | `at[]`, `layout` grid2/stack, `variant`, `y`, `out`, `lead` | He lists 3-4 things | The list is longer than 4, or the items are sentences | Liked |
| 07 | `K.ghost(text, o)` | A huge translucent numeral or word on the wall | `at`, `out`, `x`, `y`, `size` | A number or "one thing" idea; wall space beside his head | He is close to the camera and the wall is hidden | **Premium family: wants more** |
| 07 | `K.tag(text, o)` | A small stamp beside him with a ring burst | `at`, `out`, `x`, `y`, `rot`, `ring`, `tone` | One word he says with weight | Two tags at once | **Premium family** |
| 08-10 | `K.question(lines, o)` | A full-screen card while his voice runs on; one line is slammed as a stamp | `look` **clay (default)** / court / ink, `court` clay/green, `wipeVariant` **iris (default)** / push / clay, `lineAt[]`, `tops` | A question or a hinge in the argument; a breather for the eye | Back to back with a court cutaway (too long off his face) | **Premium family.** 09 (clay + iris) > 08 (ink + clay line); 10 (court + push) loved |
| 11, 13 | `K.checklist(items, o)` | Rows arrive as he names them, pulse, then get ticked | `at[]`, `ticks[]`, `pulses[]`, `hide:[t0,t1]`, `style` **paper (default)** / dark, `y`, `out` | He sets 2-4 rules and later proves each one | One item; or the points are not parallel | 11 (paper) liked more than 13 (dark) |
| 12 | `K.behind(seg, words, o)` + `kit.behind_video` | A word BEHIND him (cut-out layer) | `at[]`, `out[]`, `dim`, per-word `tone`/`size`/`top` | The reveal: the one word the reel turns on | More than once per reel unless it is the reel's spine; or when his head covers the word's middle | **"Amazing". Premium family: wants more** |
| 12+ | `K.behind(seg, words, o)` | Now one of the **depth family** (below). Per word: `tone` clay / paper / ink / green / outline, `size`, `top` | as before | as before | | Premium family |
| 18 | `K.stack(seg, lines, o)` | Lines of type behind him that rise in one by one. With his head in front only the top line and the line ends read, so make the lower lines an **echo** of the same word (solid, outline, faint outline) | `at[]`, `out`, `top`, `size`, `lead`, `enter` rise/blur/slide/pop, `exit`, per line `t`/`tone`/`a`/`x` | Headroom (a studio backdrop with `lower`) or a short echo above his head | Different words on the lower lines at his framing: they are hidden | **Liked** (18: "the text and how I was smalled") |
| 19 | `K.outline(seg, word, o)` | A giant hollow word that draws on right to left, then can turn solid on a beat | `at`, `out`, `size` (380 fits a 4-letter word), `top`, `tone` paper/clay, `fill`, `fillAt`, `enter` draw/rise/pop | The one word the reel turns on, as texture or as a reveal | A word wider than the frame at that size (7 letters at 400 px bleed off both sides) | **Loved: "amazing", his own background stays** |
| 20 | `K.drift(seg, word, o)` | Rows of one repeated word sliding slowly behind him at different speeds and directions | `at`, `out`, `rows[{top,size,tone,dir,speed,a}]`, `dim` | A beat where he stays still and you want life in the room; words slide behind his head | Over a stretch where the words must be read: it is texture | **Loved: "amazing"** |
| 21 | `K.halo(seg, o)` + `K.sweep(seg, o)` | A soft glow, a flat disc or a thin ring behind his head; a light band crossing the wall | halo: `kind` glow/disc/ring, `tone` clay/paper/green/ink, `x`, `y`, `size`, `a`, `breathe`; sweep: `at`, `d`, `dir`, `tone` | A moment of weight or a name | Two at once (pick the glow or the ring or the disc) | **BENCHED: "i dont like 21"** (the glow inside a studio swap stays) |
| 22-23 | `K.backdrop(seg, o)` | The room turns into a studio colour, only he stays. A fade in front of him hides where the cut-out ends at his desk | `at`, `out`, `tone` clay/ink/green/paper, `variant` iris/wipe/drop/fade, `from`, `d`, `rim` (a coloured edge light), `lower` (he sinks: headroom), `floor`, `shadow` | The hinge of the reel; put a word, a stack, a halo or drifting rows on top of it | More than once or twice per reel; over footage where his hands leave his body a lot | **Liked** (22 good; 18 and 22: him smaller). `lower` is now the default |
| 24 | `K.focus(seg, o)` | The room goes soft, dark and grey, he stays sharp | `at`, `out`, `blur`, `gray`, `dim` | A quiet, serious line; gentler than a backdrop swap | With `lower` in the same segment; the blur leaves a faint soft halo of his own shirt around him | No verdict yet |
| 14 | `K.courtSteps(o)` | Court cutaway: a ball is struck, then a runner takes a few steps to it | `at`, `hit`, `line1/2(+At)`, `steps[]`, `arrive`, `out`, `image`, `wipeVariant` | "A few seconds, a few steps": speed, reaction, distance | Anything not about tennis movement | **Superseded by `K.courtSteps3d` (25).** He said the animation was not creative; kept only for showreel 1 |
| 15 | `K.courtMeasure(o)` | Court cutaway: a distance line draws in, a ball sprints along it | `at`, `label`, `labelAt`, `sprintAt`, `out`, `image` | A distance he names | He gives several distances (a distance court, stage 2) | **Superseded by `K.courtMeasure3d` (26).** Kept only for showreel 1 |
| 25 | `K.courtSteps3d(o)` | The broadcast court: lines draw themselves on a top-down blueprint, the camera swings into perspective, a ball is struck and bounces, a runner takes steps to it leaving stroboscopic ghosts, footprints, ripples and numbers standing up. Replaces 14 | `at`, `hit`, `line1/line1At`, `line2/line2At`, `steps[]`, `arrive`, `out`, `from`/`ballFrom`/`bounce1`/`bounce2` (metres), `swing`, `wipeVariant` | "A few seconds, a few steps": speed, reaction, distance | Anything not about tennis movement. Give it 2 s from `at` before the first event (swing:false: 1 s) | **Loved: "really creative"** |
| 26 | `K.courtMeasure3d(o)` | The same court for a distance: a measuring line with caps and ticks, a sprint along it with a ghost every metre, numbers rising at each tick and a big answer at the end. Replaces 15 | `at`, `label`, `labelAt`, `lineAt`, `sprintAt`, `sprintDur`, `from`/`to` (metres), `every`, `value`, `unit`, `out` | A distance he names. The number and unit are HIS words | Several distances at once | **Loved: "really creative"** |
| 27-28 | `K.number(value, o)` | An odometer rolls to the number and it lands with a slam: screen shake, a shock ring, a hard shadow, an optional line above and a unit stamp that drops below | `at`, `landAt` (the last digit stops), `roll`, `unit`, `unitAt`, `pre`, `preAt`, `out`, `look` clay/ink/paper, `wipeVariant`, `y`, `size`, `cycles`, `shake`; a `٫` or `.` becomes a square dot | A number he says with weight (a time, a distance, a count). It is HIS number | A string of numbers: one card each | **Good** |
| 29 | `K.slamBehind(seg, value, o)` | The same rolling number behind him (needs the cut-out). Best on a studio swap where he sinks, with a `K.tag` unit on his chest | `at`, `landAt`, `out`, `top` (500), `size`, `tone` | The number is the hinge of the reel | Without headroom: it has to sit above his head | **His favourite of showreel 3: "29 is the best"** |
| 30-31 | `K.versus(a, b, o)` | A skewed split: A (right, the reading side) and B (left) slide in and meet on a slanted seam, a stamp sits on the seam. With `win`, the seam moves toward the loser, the loser is struck through in brick red and dims, the winner turns green with a tick | `at`, `aAt`, `bAt`, `vs`, `vsAt`, `win` a/b, `winAt`, `colors` clay/ink2/paper/green, `subA`, `subB`, `out`, `wipeVariant` | A myth against a fact, a wrong way against a right way, two options | More than two sides | **Amazing** |
| 32 | `K.list(items, o)` | A 3D drum that turns to each item as he says it (the active one lights clay), then unrolls into the whole list | `at`, `itemAt[]`, `flatAt`, `out`, `look`, `wipeVariant` | 3-5 short items, one phrase each (about 22 characters at most) | Items that are sentences; when the checklist (11) says it better | **Amazing. He wants it ON his video too: `mode:"video"` (39)** |
| 39 | `K.list(items, { mode:"video" })` | The drum ON his own footage: no card, no wipe, a smaller drum in the chest zone that rises in, turns to each item (the active one lights clay), unrolls into a paper list and sinks out. His face stays on screen | the same options as 32 plus `y` (the drum's centre, default 1360) | The list should not take over the screen; he wants to stay visible | His hands gesture in the chest zone (the drum covers y 1180-1560) | **Loved: "i loved 39"** |
| 40 | `K.backdrop` + `K.slamBehind` + `K.tag` | The best idea of showreel 3 as a recipe: a studio colour drops in (he sinks), a two-digit number rolls behind his head and lands with a ring, a unit tag stamps on his chest | `tone` clay/ink/green, `variant` drop/iris/wipe, `size` 470-560, `top` 500 | A number is the hinge of the reel | A long number (3+ digits at 400 px) | **Good** |
| 33 | `K.quote(lines, o)` | A page falls onto a dark table, the lines are written in, a clay highlighter sweeps the key line, then the page zooms onto it and the rest fades | `at`, `lineAt[]`, `hlAt`, `zoomAt`, `zoom` (default fits the key line), `out`, `look`, `tag`, `top`; a line is a string or `{t, hl:true}` | He reads or cites a sentence and one phrase must land | A sentence he has not said or read | **BENCHED: "i dont like"** |
| 34-36 | wipes `slice`, `whip`, `zoom` | Three more wipes for full-screen cards: six bars stepping in from the right, a fast slanted slide with blur, a circle that opens while the card rushes in | `wipeVariant` on `K.question`, `K.number`, `K.versus`, `K.list`, `K.quote`, the courts | | Every card: keep to two or three kinds per reel (iris and push are still his favourites) | 34 slice and 36 zoom good; **35 whip wipe BENCHED** |
| 37-38 | `K.whip(t, o)` | Hides a jump cut between two footage segments: the old picture blurs and slides (or zooms) away, the new one settles from the other side | `out`, `in` (segment indexes), `style` whip/zoom, `dir`, `d1`, `d2` | A jump cut inside one thought | In a segment that already uses `K.focus` or a backdrop `lower` (they move the same videos) | **Good** |
| 16-17 | `K.cta(word, o)` | Call to action: a comment bubble or a big stamp, plus a small line | `variant` **bubble (default)** / stamp, `sub`, `subAt`, `pulse`, `y`, `out` | The ask at the end | A reel with no ask | 17 (bubble) liked more than 16 (stamp) |
| - | `K.wipeIn/wipeOut(layer, t, d, v)` | Transitions for full-screen layers | v clay (a clay line sweeping right to left) / **iris** / push | Section changes | Every cut: hard cuts and punch-ins carry most of the reel | iris and push are the favourites |
| - | `K.flash(t, o)` | One quick flash | `color`, `peak`, `d` | The single moment that matters | More than once per reel | Part of 12 |
| - | `K.fa(n)`, `K.words(s)` | Persian digits; split into words | | | | |
| - | `K.label(text, t0, t1)` | A catalogue label | | The showreel only | A real reel | |

Python side (`kit.py`): `kit.scaffold(public)` copies the runtime and assets into a reel; `kit.build(...)` assembles the
page; `kit.sfx_html(events, E)` makes the sound cues (six sounds, auto track assignment); `kit.behind_video(...)` is the
static cut-out video that `K.behind` needs.

## The depth family and the cut-out (2026-10-01)
Every block from 12 to 24 needs the speaker cut out of the footage, so that something can sit between the wall and him.
1. **Make the whole-clip cut-out once per clip**: `tools/cutout.py <input.mp4> <out dir>`, run detached (about 7 s per
   source second on the CPU: 85 s took 10 min, plus 2 min for the trim). It gives `full_cut_t.webm`, trimmed so no light rim
   shows on dark backdrops. Time zero of the cut-out is time zero of the input.
2. **Give each footage segment that needs depth the cut-out**: `"inner_html": kit.behind_video("full_cut_t.webm", <the segment's in>, id="cutN")`
   (a unique id per segment). Hyperframes extracts an alpha video as PNG frames, so split the footage so a depth moment is its own
   segment: the cut-out then covers only those seconds.
3. **Call the blocks with the segment's index** (`K.stack(3, ...)`). Several can run in one segment: the cut-out is on from the
   first block's start to the last block's end (`depth()` merges the spans), and the footage under a backdrop is hidden.
4. **His framing at zoom 1.0** (HCTV3230, a seated head and shoulders): the wall above his head is free from y 470 (his
   captions own 230-470), the head sits at about y 610-900 and about x 380-700, the shoulders and chest cover everything below
   y 930. So words above and beside the head read; anything lower is texture that slides behind him. Check a frame of the real
   clip, because another framing moves all of this. Where the mask ends at his desk (the bottom 120 px) the edge is slanted:
   `K.backdrop` hides it with a fade in front of him.
5. **Cursive outlines are made with an SVG morphology filter** (`K.init` adds `#k-ol3 #k-ol5 #k-oc3 #k-oc5`: dilate minus erode of
   the letters' silhouette). `-webkit-text-stroke` on Farsi shows the joins as lines inside the word. The filter sits on an
   inner `<span>`, because a GSAP `filter` tween (the blur entrance) on the same element would replace it.
6. **Headroom**: `K.backdrop(..., { lower: true })` scales him about his seat and sinks him 150 px after the swap, which puts
   the top of his head at about y 890 and opens y 470-890 for type. Without a backdrop there is no room for more than one line.

## The broadcast court (2026-10-01)
A flat court (plane 1240 x 2600 px, 100 px = 1 m, the real court's proportions) in CSS 3D: `.k-stage3d` has the perspective
(1100 px, origin 50% 30%), `.k-plane` is tilted 62 degrees about its near edge. Things that stand (the net, the runner, the ball,
numbers) are **billboards**: `rotationX: -62` about their feet, so they face the camera; things that lie (lines, footprints,
ripples, the path) are flat in the plane. Positions are plane px: `M3(xMetres, yMetres)` converts metres from the near baseline's
centre. The camera swings from a top-down blueprint (scale 0.7, no tilt) into the broadcast angle (scale 1.25, y -916), then
pushes in. Text lines stay in screen space, in front, at y 480 and 672 (below his caption band).
Tuning notes: the runner is a three-pose pictogram (`fig()`), mirror it with `scaleX: -1` to run left; numbers need a `lift` of
about 245 px to float above a ghost's head; keep the stamp above the action (y under 780) or it hides the numbers; ghosts are at
alpha 0.4 so the clay shows through.

## The statement cards (2026-10-01, "go" after showreel 2)
Full-screen cards like the question card, for the moments he says a number, sets two things against each other, lists, or cites.
They share the card looks (clay, ink, paper) and the wipes. Every word and number on them is HIS; the showreel's are placeholders.
- **Number slam:** each digit is a column (`.k-rcol`) inside a clipped window (`.k-reel`); the columns roll `cycles` times round and stop
  on the digit, the last one exactly at `landAt` and the others a little before it. The shadow is a CSS `drop-shadow` on the whole row,
  because a shadow inside a reel would be clipped. Put the `roll` sound so it ENDS on `landAt` (about 0.98 s before it).
- **Versus:** two parallelograms (`skewX -7`) whose inner text is counter-skewed (`skewX 7`); the seam passes through (540, 960). A is on
  the right because Farsi reads right to left. The verdict moves the seam and both texts by half the shift so they stay centred.
- **Drum:** pivots on the drum's axis (`rotationX = -i x 36`), each card pushed out by `z = R` where R = (card + gap) / (2 tan 18 degrees);
  the drum rotates to bring item i to the front, and the unroll tweens every pivot to 0 and every card to `z 0`. Inactive cards are dark and
  light up clay; in the unrolled list they are paper with clay numerals.
- **Quote:** lines are broken by hand, one short line each, so nothing is measured; the zoom origin is the key line's centre.
- **slice** is one comb-shaped `clip-path: polygon()` driven by the CSS variable `--p` (a tween on `--p`, so it needs no callback).
- **No dead-still holds:** every card gets a slow push-in (`push(el, t0, t1, amt)`, about 3 percent over the hold), because
  `freezedetect` flagged 2-second stills in the first render and a perfectly still card reads as a slide. The number slam also sends
  two outline echoes of the numeral rippling outwards on the landing, and the versus card flashes when the halves meet.
- **Never drive styles from `onUpdate`:** Hyperframes seeks the timeline, and seeks do not fire callbacks. Tween properties or CSS variables.
- **A whip moves the footage videos**, so scale them up while they slide (110 px needs about 1.22) or the edge of the frame shows.

## Gotchas already solved (do not re-learn them)
- The timeline is created with `immediateRender: false` (`K.timeline()`): without it a later wipe-out paints its layer at frame 0.
- SVG ticks use `svgOrigin`; CSS `transform-origin` on SVG shifts the shape.
- Farsi: words animate whole, never letter by letter; the ZWNJ half-space goes in the text (`&zwnj;` or U+200C).
- Never put `dir="rtl"` on `<html>`: it is on the elements that hold text.
- Tween `x`/`y`/`scale`, never `top`/`left`.
- Media (the cut-out video, the sounds) must be static HTML: that is what `kit.py` is for. Everything else can be created by JS.
- Chest-zone blocks sit at y 1180-1560 so they clear his chin even at a 1.2 zoom.

## What "premium" means to him (from his notes on the showreel), and so what to build next
He said 07, 08-10 and 12 "feel like premium videos" and wants to see more of them. Reading what they share: big
confident type, a full-screen card or a depth effect instead of a small caption, clean wipes (iris, push), very few
elements on screen at once, strong easing, one idea per moment. More of that, not more stuff. Stage 2 priority order,
each built when a real clip needs it:
1. **The depth family** (extends 12) **BUILT 2026-10-01, awaiting his verdict** (18-24): a full-clip cut-out run once at staging so depth works at ANY moment; more
   behind-him variants (stacked words, outline, slow parallax drift, a clay halo or light sweep behind his head); a
   backdrop swap or tint that turns the wall into a studio colour.
2. **The statement-card family** (extends 08-10): number slam, versus (A against B), list reveal, quote; more wipes
   (slice, zoom-through, whip).
3. **The courts redone** (14-15) **BUILT 2026-10-01 as the broadcast court, awaiting his verdict** (25-26): see the proposals in the conversation of 2026-10-01 (a
   broadcast-style court in perspective with a stroboscopic runner, a camera dolly through photographic layers, or
   footprints).
4. Then the rest of `../IDEAS.md`: count-up numbers, diagram builder, force-time curve, chapter label, body map, side
   panel, B-roll; his own movement with force arrows (stage 3); the "Lab" mood.
