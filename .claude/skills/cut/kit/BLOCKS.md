# The kit's blocks (stage 1, plus stage 2: the depth family, the broadcast court and the statement cards, plus stage 3: diagrams, the force-time curve, chapter labels, the body map)

Ingredients, not recipes. Read the clip, find its idea, choose the concept, THEN reach for these for the plumbing.
Every block: `K.name(content, options)` in a reel's `BLOCKS_JS`; times are seconds on the EDITED clock (wrap speech-tied
times in `E(sourceSeconds)`); it returns its elements so a reel can add bespoke tweens on top. See the showreel
(`showreel/`) for every block and variant running on his footage: 01-17 in showreel 1, 18-26 in showreel 2 (the depth family and the broadcast court), 27-38 in showreel 3 (the statement cards and the new wipes), 39-40 in showreel 4 (the drum on his video, a clay-studio number), 41-49 in showreel 5 (the diagram builder, the force-time curve, chapter labels, the body map: the three families he asked for), 50-52 in showreel 6 (the diagram on his own video picks a layout that fits, the chapter band).

Brand defaults baked in (breakable on purpose, say so in the plan): clay is the one accent, hard-corner stamps, paper and
dark plates, green = done, Vazirmatn, RTL, whole-word animation, Persian digits (`K.fa(12)` gives ۱۲).

**Start from his favourites (verdicts in the Status column and in `USAGE.md`):** 12 the word behind him, 19 hollow giant word,
20 drifting rows, 25-26 the broadcast court, **29 the number behind him on a studio with him smaller (his best)**, 30-31 versus,
32 the drum, **39 the drum on his video (loved)**, **47 the chapter band on his video (preferred), 48-49 the body map ("amazing")**, 43 the diagram on his video (preferred over the cards), 44-45 the force-time curves, 07 ghost numeral, 08-10 question cards. **Benched:** 04 (mask stamps), 21 (halo, ring, disc, sweep
on the wall), 33 (the quote page), 35 (the whip wipe).

**His verdict on showreel 1 (2026-10-01)** is in the Status column and in `USAGE.md`. The family he calls "premium" and
wants MORE of: 07 (ghost numeral + tag), 08-10 (question cards), 12 (the word behind him).

## The cue table: what he says, what the viewer needs to see, the block (the creative director's lookup)
Amir, 2026-10-01: *"you are my creative director, based on the content of reels, you need to think what visual is best and whats needed, then have a look at the list,
maybe something can be used, so use it. if you need anything, create it, and add it to the list."* So for every beat of a real reel: what does the viewer have to SEE? Look it up
here, use what fits (his favourites first), put it in the plan (`SKILL.md` step 6) and mark anything new as NEW. **Suggest by content, unasked.** Also look at his own list, the Motion Menu artifact, which `/cut` is connected to (`MENU.md`; every block in use has a card there with a When and a How, grouped by the job it does, and `python tools\menu_find.py <word>` finds one with its call; the blocks he dropped (mask stamp, `K.halo`, `K.sweep`, `K.quote`, the whip wipe) are no longer on the menu).

| He says, or the content is | The viewer needs to see | Use | Notes |
|---|---|---|---|
| **Something that changes over time or has a shape**: force over time, speed, fatigue, adaptation, readiness, "the same peak sooner", "the rate" | the curve itself | **`K.curve`** (44 one curve and its slope, 45 two curves and the time saved) | **Suggest it whenever the content has a curve like this.** A drawn idea, never his data. Good (his verdict) |
| **A place in the body**: a muscle, a joint, hips-knees-ankles, the back, the calves | the body, with that place lit | **`K.bodymap`** (48 muscles, it turns round to the back; 49 a joints chain) | **Use it whenever he talks about a place in the body.** It lights only what he says. "Amazing" (his verdict) |
| **Steps, a sequence, a cause chain, a cycle** ("this leads to that", "train, rest, adapt, repeat") | the chain, built as he says each step | **`K.diagram` ON HIS OWN VIDEO** (43 a row, 50 a stack of long phrases, 51 a loop in a grid); the full card (41 chain, 42 cycle) only when the text cannot fit | He prefers it on his video "if the spacing and the size of the text allows it". It picks the layout that fits and says when none does |
| **The reel is in parts** ("first... second... third...") | a label at each part | **`K.chapter` band** (47, the default); the full card (46) for a bigger break | He prefers 47. Two or three chapters at most |
| **A number**: a time, a distance, a count, a percent | the number, big | `K.number` (27-28 card); **the number BEHIND him on a studio colour** (`K.backdrop` + `K.slamBehind` + `K.tag`, 29 and 40: his best); a distance on the court: `K.courtMeasure3d` (26) | It is HIS number |
| **A list of 3-5 short items** | the items, one at a time | `K.list` the drum (32), **on his own video (39, loved)**; `K.checklist` (11) when the points are ticked later | One short phrase per item |
| **Two things against each other** (a myth and a fact, wrong and right, A or B) | the split | `K.versus` (30-31, "amazing") | With `win` for a verdict |
| **A question, or a hinge in the argument** | a breather | `K.question` (08-10: clay + iris) | |
| **The one word the reel turns on** | the word, behind him | `K.behind` (12), `K.outline` (19), `K.drift` (20), `K.stack` (18); with a studio colour `K.backdrop` (22-23) | Needs the cut-out. His room stays when possible |
| **Court movement**: a few steps, a ball, a distance | the court in 3D | `K.courtSteps3d` (25), `K.courtMeasure3d` (26) | "Really creative" |
| **A hook word, a name, a short stressed phrase** | a stamp | `K.stamps` (01-03 pop or slide), `K.tag` and `K.ghost` (07) | Never a caption (he adds those) |
| **The ask** (comment, follow, link) | the ask | `K.cta` the bubble (17) | |
| **A jump cut to hide** | | `K.whip` (37-38) | One flash (`K.flash`) for the one moment that matters |
| **Nothing here fits** | | **Create it**: write the block in `kit.js` and `kit.css`, try it on his footage (a showreel demo), add a row to the table below and a line to this one, say NEW in the plan | The kit is about 50 blocks; the rule is 15-20 in use, so a new block should earn its place |

How to choose between two that fit: his favourites first (the loved list in `USAGE.md`); **on his own video before a full card** whenever the text fits (his face on screen is worth more than a
bigger graphic); one spine and two or three devices a reel, not a tour of the shelf; rotate (rule 3); the top band y 230-470 stays free for his captions.

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
| 41-42 | `K.diagram(nodes, { mode:"card" })` | The diagram as a full-screen card: plates land one by one as he says them, joined by arrows, and a glowing pulse runs along each arrow (the node being said is clay, earlier ones cool to paper). `chain` is a staircase of plates; `cycle` is four plates in a loop, the last arrow runs back to the first, every plate lights and a mark turns in the middle | `mode:"card"`, `layout` chain/cycle, `at`, `nodeAt[]`, `out`, `look` ink/clay, `travel`, `loopAt`, `wipeVariant` | The words cannot fit on his video at a readable size, or it is a big statement moment | Anything that fits on his video (he prefers that, 43). Four nodes at most; a cycle needs exactly four | **Good** |
| 43, 50, 51 | `K.diagram(nodes, o)` ON HIS OWN VIDEO (`mode:"video"` is the default) | The same chain over his chest zone, his face stays: plates in the drum's dark-plate look, a pulse along the arrows. It picks a layout that fits: **row** (43: short words, up to three steps), **grid** (51: 2 x 2, three or four steps, words up to about ten letters; `loop:true` runs the last arrow back to the first and lights everything), **stack** (50: up to three long phrases, one under the other; his own 23-letter phrases fit). The text shrinks to fit (never under 42 px) and a label that still does not fit is reported (`console.warn`, `window.__kitWarnings`) | `layout` auto/row/grid/stack, `loop`, `loopAt`, `at`, `nodeAt[]`, `out`, `y` (the block's centre, 1350), `travel` | Any sequence or cause chain of 2-4 steps. **His preferred way** | His hands gesture in the chest zone (the block covers about y 1160-1560); a phrase too long even for the stack (then a card) | **43 good, and the way he prefers it ("if the spacing and the size of the text allows it"); 50-51 liked ("very nice", showreel 6)** |
| 44-45 | `K.curve(o)` | The force-time curve: two axes draw themselves, a curve draws with a glowing head, a tangent marks the slope with its rise and run, and two curves show the time each takes to reach a share of the peak (lit on the time axis) | `at`, `out`, `yLabel`, `xLabel`, `curves[{at, dur, tone, x0, k, label}]`, `slope{at, curve, label}`, `gap{at, level, label}` | He talks about force over time, the rate of force development, "faster to the same peak" | The curves are a drawn IDEA (a logistic climb), never his data: no numbers on them unless he gives them. Made for the ink card | **Good. Suggest it whenever the content has a curve like these** |
| 46-47 | `K.chapter(n, title, o)` | A chapter label on the clay wipe: a ghost odometer rolls from the last chapter's number to this one, the title is slammed in, a row of chips shows done, here and to come. **`band` (the default, 47) is a clay band across the chest zone and his face stays**; `card` (46) takes the whole screen while his voice runs on. A long title shrinks to fit | `at`, `landAt`, `titleAt`, `out`, `total`, `from`, `variant` band/card, `look`, `wipeVariant` (clay by default), `size`, `y` (band), `roll` | A reel built in 2-3 parts, each starting with a label | A one-idea reel, more than three chapters, or the top band (his captions). Not a persistent bar: Instagram's own progress line sits at the bottom | **46 very good; 47 preferred; 52 (long titles shrink to fit) liked** |
| 48-49 | `K.bodymap(steps, o)` | The app's own traced body (the drawing behind the muscle map in program.html): a scan line reveals it, the muscle he says lights clay with a glow and a label on a leader line, earlier ones stay in soft clay, and the body turns round (a 3D flip) when a step asks for the back view. With `chain:true` and the joint rings (hip, knee, ankle) a pulse runs down the leg | steps `{m, label, at, view, side, dy}` where `m` is a muscle group or `"ring:hip"/"ring:knee"/"ring:ankle"` (or a list), `at`, `out`, `chain`, `travel`, `height`, `y` | He names muscles or joints in order (hips, knees, ankles for triple extension) | A claim ("this only trains X"): it lights what he SAYS and nothing else. Made for the ink card; too small to read on his own video | **Amazing. Use it whenever he talks about a place in the body** |
| 33 | `K.quote(lines, o)` | A page falls onto a dark table, the lines are written in, a clay highlighter sweeps the key line, then the page zooms onto it and the rest fades | `at`, `lineAt[]`, `hlAt`, `zoomAt`, `zoom` (default fits the key line), `out`, `look`, `tag`, `top`; a line is a string or `{t, hl:true}` | He reads or cites a sentence and one phrase must land | A sentence he has not said or read | **BENCHED: "i dont like"** |
| 34-36 | wipes `slice`, `whip`, `zoom` | Three more wipes for full-screen cards: six bars stepping in from the right, a fast slanted slide with blur, a circle that opens while the card rushes in | `wipeVariant` on `K.question`, `K.number`, `K.versus`, `K.list`, `K.quote`, the courts | | Every card: keep to two or three kinds per reel (iris and push are still his favourites) | 34 slice and 36 zoom good; **35 whip wipe BENCHED** |
| 37-38 | `K.whip(t, o)` | Hides a jump cut between two footage segments: the old picture blurs and slides (or zooms) away, the new one settles from the other side | `out`, `in` (segment indexes), `style` whip/zoom, `dir`, `d1`, `d2` | A jump cut inside one thought | In a segment that already uses `K.focus` or a backdrop `lower` (they move the same videos) | **Good** |
| 16-17 | `K.cta(word, o)` | Call to action: a comment bubble or a big stamp, plus a small line | `variant` **bubble (default)** / stamp, `sub`, `subAt`, `pulse`, `y`, `out` | The ask at the end | A reel with no ask | 17 (bubble) liked more than 16 (stamp) |
| - | `K.wipeIn/wipeOut(layer, t, d, v)` | Transitions for full-screen layers | v clay (a clay line sweeping right to left) / **iris** / push | Section changes | Every cut: hard cuts and punch-ins carry most of the reel | iris and push are the favourites |
| - | `K.flash(t, o)` | One quick flash | `color`, `peak`, `d` | The single moment that matters | More than once per reel | Part of 12 |
| - | `K.fa(n)`, `K.words(s)` | Persian digits; split into words | | | | |
| - | `K.label(text, t0, t1)` | A catalogue label | | The showreel only | A real reel | |

Python side (`kit.py`): `kit.scaffold(public)` copies the runtime and assets into a reel; `kit.build(...)` assembles the
page and prints `audit:` notes (below); `kit.sfx_html(events, E, align=True)` makes the sound cues (34 sounds, auto track assignment; **see "Sounds" below for what the
time of a cue means**); `kit.behind_video(...)` is the static cut-out video that `K.behind` needs.

## The depth family and the cut-out (2026-10-01)
Every block from 12 to 24 needs the speaker cut out of the footage, so that something can sit between the wall and him.
1. **Make the whole-clip cut-out once per clip**: `tools/cutout.py <input.mp4> <out dir>`, run detached (RobustVideoMatting since
   2026-10-02: about 3 s per source second on the CPU, 85 s took 4 min 9 s with the trim and the encode included; the old u2net route,
   `--engine u2net`, took 10 min plus 2 min for the trim). It gives `full_cut_t.webm`, trimmed so no light rim shows on dark backdrops.
   RVM keeps his shirt solid where u2net let it fade or left a hole when his hand crossed his chest (a hole shows as the backdrop through
   his chest in block 29 and the studio swaps). Time zero of the cut-out is time zero of the input.
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
  because a shadow inside a reel would be clipped. The `roll` sound ENDS on `landAt`: in a new reel (`sfx_align=True`) cue it AT `landAt`; the old showreel builds cue the file's start, so they put it about 0.98 s before.
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

## Diagrams, the force-time curve, chapter labels, the body map (2026-10-01, "go" after he named the three families)
All four are full-screen cards (or sit on the footage), so none needs the cut-out. Every word and number is HIS; the showreel's are placeholders.
- **Diagram:** each arrow is a line that grows (`scaleX`/`scaleY` from its start end) plus a glowing dot moving with the SAME ease, so the dot is always at
  the head of the line; the arrowhead pops when it arrives and the plate slides in from where the pulse came. The node's time `nodeAt[i]` is the moment the
  pulse ARRIVES (the pulse leaves `travel` s earlier). Plates are the checklist's vocabulary (a numeral tab on the right, hard shadow). A card gets a faint dot grid.
- **Curve:** the stroke draws with the dash trick (`strokeDasharray = length`, tween `strokeDashoffset` to 0). The glowing head cannot follow with a callback
  (seeks fire none), so it runs along the SAME polyline as one short linear leg per three samples, timed through the inverse of the stroke's ease (`easeAt`).
  The shape is a normalised logistic climb (`x0` where it climbs, `k` how fast): two curves reach the same peak, one sooner. The slope is a tangent at the
  steepest point; the gap solves each curve for a share of the peak (`level`) and lights the time between on the axis.
- **Chapter:** the number is a ghost odometer (one column from the last chapter's digit through a full turn to this one, blur while it rolls); the title is the
  question card's slam; the chips are done / here / to come. The `band` reveals with a `clip-path` wipe and a white edge riding it, right to left.
- **Body map:** `assets/data/bodymap.js` (`window.BODYMAP`) is the app's traced drawing made by `assets/data/make_bodymap.py` from
  `.claude/skills/image/bodymap/bodymap.json` (rerun it only if that drawing changes). Muscle groups are the app's ids; the joint rings are the app's knee
  and ankle plus the kit's own hip ring (placed by eye), and need the `ring:` prefix because hip and ankle are also muscle groups. The figure has two SVG faces
  (`backface-visibility: hidden`, the back one pre-rotated 180 degrees) on a `preserve-3d` element that the flip turns.
  **Trap: `clip-path`, `opacity` or `filter` on an element with `transform-style: preserve-3d` flattens it, so the reveal clip lives on a wrapper, not on the figure.**
  Labels sit against the screen edge (right edge at x 960; on his phone the buttons start at x 920 between y 1171 and 1770, so a label that low overlaps them by up to 40 px) and the leader line ends at a LOW estimate of the plate's width,
  so it tucks under the plate: nothing is measured, because a font that has not loaded yet would give a wrong width.
- **Looks:** the curve and the body map are made for the ink card. `look: "paper"` exists in the code but is not designed (the curve's paper tone would vanish).

## Sounds, the gate and the audit (2026-10-01, from the research: `../RESEARCH-2026-10-01.md`)
**Sounds: the time of a cue is where the HIT lands** (new reels: `kit.build(..., sfx_align=True)`, which `tools/new_reel.py` writes). Each sound starts early by its own lead
(`kit/sfx/timing.json`, made by `tools/sfx_lead.py`): a sharp hit (`onset`: click, stamp, thud, ball hit, ding, pop...) lands on the cue, a whoosh, rise, riser, drop, snare roll, swish or
inhale (`peak`) PEAKS on it, and the odometer `roll` (`end`) ENDS on it. So `ev(landAt, "hit")`, `ev(cutTime, "whoosh")` and `ev(slamTime, "riser")` are all you write; a riser needs 1.3 s of run-up
and gets it. Why: the menu's mp3 files start 0.12 s in (the lab's `sounds.py` has `LEAD = 0.10`), the swells peak 155-275 ms in and the build-ups 1.0-1.3 s in, so a file placed on its cue landed
4 frames late (a swell 5-8 frames, a riser a whole second). A cue too close to the start of the reel to fit its run-up plays from the middle of the file. **The old showreel builds do not pass
`sfx_align`: they cue the file's start and must not change** (`python tools\sfx_proof.py` proves both: old pages identical, new reel within 20 ms of its flashes; run it after any change to `sfx_html`
or a sound file). Rules of thumb from the repos: a sound every 3-5 s at most, none on a low impact under a key word, at least 2.5 s between big ones.

**The gate: `python tools\check_gate.py <reel>\public`** (or `GATE=1 bash tools\shots.sh ...`) runs `hyperframes check` with his caption band y 230-470 guarded at a moment every 0.5 s,
`--bottom 1248` adds a warning for anything below Meta's line. A block that layers or bleeds on purpose carries `data-layout-allow-*` marks, so only an accident fails. **Where a mark goes matters**
(tested): `caption-zone` and `overflow` work from a container; `occlusion` and `overlap` count ONLY on the text element itself (an ancestor's does not), which is why the odometer digits, the court's
number labels and the behind-him words carry `LEAF` in `kit.js`. `text_not_painted` (blurred odometer digits) and `frame_out_of_frame` on zoomed footage have no mark: the gate sets them aside and
says how many. **A new block must mark what it layers on purpose** (`allow(el, "overlap")` on the text, `allow(container, "overflow")` on a stage) and be run through the gate once on a showreel demo.
Two limits: `check` takes ONE caption zone per run, and its collisions are about element BOXES (a 270 px word's box starts 30 px before its ink).

**The audit** (`kit.audit`, printed as `audit:` lines when a reel is built) says in plain words when a reel uses a block more often than he likes (the caps below), a tour of the shelf (more than 6
kinds of block), more than 3 kinds of wipe (his rule: two or three, the same ones all the way), full-screen cards up for more than half the reel (his face off screen), or more than 20 sound cues a
minute. They are prompts, never errors: HCTV3230 (loved) used 4 wipes and 17 cues a minute. Caps a reel usually stays under (his own "do not use it when" plus the repos' per-reel caps):
number 3, slamBehind 2, versus 2, list 2, quote 1, question 3, chapter 3, whip 2, behind 3, backdrop 2, one court of each kind, diagram 3, curve 2, bodymap 2, checklist 2, cta 1, flash 2.

## Gotchas already solved (do not re-learn them)
- The timeline is created with `immediateRender: false` (`K.timeline()`): without it a later wipe-out paints its layer at frame 0.
- SVG ticks use `svgOrigin`; CSS `transform-origin` on SVG shifts the shape.
- Farsi: words animate whole, never letter by letter; the ZWNJ half-space goes in the text (`&zwnj;` or U+200C).
- Never put `dir="rtl"` on `<html>`: it is on the elements that hold text.
- Tween `x`/`y`/`scale`, never `top`/`left`.
- Media (the cut-out video, the sounds) must be static HTML: that is what `kit.py` is for. Everything else can be created by JS.
- Chest-zone blocks sit at y 1180-1560 so they clear his chin even at a 1.2 zoom. **That zone is clear of Instagram's profile row (it starts at y 1587) but NOT of the right-hand buttons**
  (measured on his phone 2026-10-01: like, comment, repost and share cover x 920-993, y 1171-1770, and the picture is cropped 52-54 px a side). The stamps and chips, the checklist, the diagram on his
  video, the drum on his video and the chapter band run edge to edge, so their numeral tab and the first word of each Farsi line (the right end) sit UNDER the buttons. Review any real reel with
  `qa_reel.py --tour --phone`; narrowing these blocks by about 165 px is his decision (`../RESEARCH-2026-10-01.md` 14.9).

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
