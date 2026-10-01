# Reel ideas bank (Amir, 2026-10-01, after v1 of HCTV3230)

**Standing instruction (Amir, 2026-10-01):** these were only suggestions, not a to-do list. For every new clip: read it,
get the script, decide what makes THAT reel most interesting, give him the plan with a few suggestions (my pick
marked), and build it after his "go" ("you always choose whatever you think is best"). Use this file as a menu of options. Vary the devices from reel to reel (a feed of identical reels goes stale)
while keeping the look consistent.

He loved v1 ("this was amazing, i loved it") and pasted a list of ideas for later. My verdicts, in build order. Each
item becomes a reusable block in the reel template, so every later reel is faster to make.

**Status (2026-10-01):** kit stage 1 is built (`kit/BLOCKS.md`): stamps, chips, ghost, tag, question, checklist, court
steps and measure, behind, cta, wipes, flash. Stage 2 so far (his "go for 1 and 2", showreel 2): the depth family (stack,
outline, drift, halo, sweep, backdrop swap, focus) and the broadcast court (`courtSteps3d`, `courtMeasure3d`), awaiting his verdict.
Showreel 3 (statement cards: number slam, number behind him, versus, drum, quote, wipes) and showreel 4 (the drum on his video,
a clay-studio number) followed; his verdicts are in `kit/USAGE.md`. The items below are the rest: build ONE at a time (or in a
showreel round he says "go" to), so each is tested on real footage.

## My picks for the next round (after showreel 4: he loved 39, 40 was good)
1. **A versus poster:** the skewed split (30-31) as the STUDIO behind him, two colours, one word in each half beside his head, him
   sunk and in front. Joins his two favourites (29 and 30-31): the words sit exactly in the free wall beside the head.
2. **The drum as a footage roll between jump cuts** (the other reading of "32 ... on the video itself"; he loved the overlay reading, so only if he asks): the outgoing and incoming
   pictures turn on a cylinder. It needs the clips to overlap for about 0.4 s, so `plan_to_clips.py` needs a `tail` (extra visual seconds
   on the outgoing clip, on an alternate track).
3. **A poster convenience block** (`K.poster`): studio colour + him sunk + ONE hero (a number, a word echo, a versus pair) in one call,
   since that composition is his favourite.
4. **Count-up variant of the number slam** (numbers counting while he runs), and a number slam with a unit that flips.
5. Then the rest of the list below (diagram builder and force-time curve, chapter labels, body map, his own movement with force arrows).

## Build order
1. **Distance court:** BUILT as `K.courtMeasure3d` (numbers stand up at each tick as the runner passes, a big answer at
   the end). A count-up variant (numbers counting while he runs) can still be added. Numbers come only from him. Run them
   through `/sc-research` first and keep the source in the reel's folder.
2. **Step-by-step diagram builder** (A, B, C, D: four nodes at most, each appearing as he says it) and the
   **force-time / RFD curve** (draw the curve, mark the slope). Flat vector, quick to make.
3. **Chapter labels at the clay wipes** (۰۱ · ۰۲ · ۰۳). Not a persistent bar: the bottom of a Reel is Instagram's own UI
   (and its progress line) and the top band is his captions.
4. **Body map highlighter:** reuse the app's traced drawing (`.claude/skills/image/bodymap/bodymap.json`: front and
   back, 15 muscles plus lowback, hip, ankle, silhouette, line art). Light the muscles in the order he says them
   (hips, knees, ankles for triple extension). Highlight what he says only: no "this only trains X" claims. It also
   makes the reel and the app one visual system.
5. **His own movement:** he films 3-5 s from the side (split-step, first step, a cut), the clip is cut out with
   `hyperframes remove-background`, and force arrows and joint angles are drawn on him. An open pose model
   (Apache-2.0 ONNX, run through onnxruntime-node, already installed) can track the joints. Needs one test clip and a
   model download with his yes. Not YOLO-pose: AGPL.
6. **More sound:** clicks, risers, footsteps, ball hits, synthesised in ffmpeg (`examples/hctv3230/make_sfx.ps1`).
   Keep them well under the voice: he adds music in Instagram.
7. **Camera:** horizontal reposition (slide him aside to open a side panel) and B-roll. The archive clips in
   `Content/video-archive/clips/` are AI-generated (label if Instagram asks). Better: he films 20-30 s of footwork,
   sprints and gym once and it is reused.
8. **Text that follows him:** short moments only, from mask or pose tracking.

## Colour language (adopted, with one change: no neon yellow)
Clay = look here (the key concept). Green = the solution, or done. Brick red `#C0392B` = a mistake (rare). Paper or
white = information. Grey = support. v1 already follows it. The pasted list said neon yellow: the brand bans yellow
and it would fight the clay.

## Notes
- The pasted list was written for English caps. Farsi reels: Vazirmatn, no uppercase, Persian digits; Latin
  abbreviations (RFD, GRF) in Barlow Condensed uppercase. English reels can use caps.
- One spine plus one or two supporting devices per reel. Keep his face on screen about 60% of the time or more.
- Every number and every physics drawing is a claim: he approves it first.
- After he posts a reel, look at Instagram Insights (average watch time, where people drop) to learn which devices help.
