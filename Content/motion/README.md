# Motion Menu

Every move, look and sound in Claude's showreel ([`../showreel/`](../showreel/README.md)), and the ingredients for Amir's own reels, has a **number** and a **name**,
with a sample you can play. Mark the ones you like. On a later video, ask for them by number: *"use 14, 22 and the Kick"*.

**183 items:** 69 moves cut from the showreel, 31 ingredients for reels, 27 design items (4 pieces of frame furniture, 8 colour looks, 3 type pairs, 8 easing "feels", 4 house rules) and 56 sounds.
Four tabs: **Moves**, **Reels**, **Design**, **Sounds**.

The reel is Claude's own piece: English, a cobalt / coral / mint palette, fonts that are not Amir's. The **Reels** tab is different: it is drawn for Amir's reels
(1080 x 1920, clay as the only accent, Barlow Condensed, and **Farsi drafts** with Vazirmatn, right to left, Persian numerals). Step 3 of the plan adds the brand look to the old moves.

Every item is **callable by name** from the kit ([`kit/`](kit/README.md)): `KIT.draw('ruler', ctx, t, { at: 0.47 })`. [`kit/PIECES.md`](kit/PIECES.md) lists every piece and what each knob does.

## How to use it

1. Open the published page: <https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA> (private; only its owner can open it). Play things. Tap **Keep**, **Maybe** or **Drop**.
   The pencil gives an item your own name or leaves a note. Marks are saved on the page. On the Reels tab, the Farsi button switches a sample to its Farsi draft.
2. Tell Claude you are done. Claude reads the marks straight from the page, so nothing has to be copied.
   (If the page says "Kept on this phone only", tap **My picks**, copy the list and paste it to Claude.)
3. Numbers never change and are never reused (`numbers.json`). Names and wording can change at any time.

## Publishing

The page is an Artifact. `build_menu.py` writes `menu/index.html` and `menu/files.json` (every clip, poster and sound the page needs,
by published path). Publish `menu/index.html` with `root: Content/motion/menu`, that file list and `capabilities: {db: {}}`; republish to the
same URL to update it. One publish takes at most 255 files, and the Menu has more, so send the files in two or three publishes to the same URL (each adds to the files already there).
Artifacts serve `.mp4`, `.mp3`, `.wav`, `.ogg` and `.jpg`, **not `.m4a`**, which is why the sounds are MP3.
Marks live in the page's own database (collection `marks`, one document per item id: `v` keep / maybe / drop, `alias`, `note`).
Claude reads them with the `ArtifactData` tool: `list` on `marks`.

## What is in here

```
catalog.json        the single source of truth: one line per item (name, plain label, what you can change, where it was used,
                    which sounds go with it, how its sample clip is made)
numbers.json        id -> number. Written once, never changed, never reused
kit/                the code behind every item (pieces, scene changes, looks, feel, rules): see kit/README.md and kit/PIECES.md
lab.html, lab/      the lab: any ingredient played alone on a small stage (lab.html?item=court, &lang=fa), and the sample for each one
baseline/reel.json  the SHA-256 of all 450 frames of the showreel and its cue sheet: the proof the rebuilt reel is unchanged
fonts/              Barlow Condensed, Barlow and Space Mono (Latin subsets, SIL OFL); Farsi uses assets/fonts/Vazirmatn-Variable.woff2
menu/index.html     the page, built from the catalogue (publish this)
menu/clips/*.mp4    sample clips: 640 x 360 cut from the real reel, 404 x 720 for the reel ingredients (plus a Farsi .fa.mp4 where there are words)
menu/posters/*.jpg  a still for every clip, plus the looks and frame furniture
menu/sounds/*.mp3   56 sound samples; menu/sounds.json holds each one's length and waveform
menu/clips.manifest.json   what was rendered, and a hash of what it came from
tools/              catalog.py · clips.js · sounds.py · sound_recipes.py · build_menu.py · page.html (the page template)
                    verify.js · kit_check.js · kit_docs.js (the proofs and the docs) · still.js · serve.js (looking at a piece) · fonts.py · bodymap.py · srt_words.py
export/             git-ignored: WAV copies of the sounds (48 kHz, 16-bit) and a waveform contact sheet
```

## Rebuild

```
python3 Content/motion/tools/catalog.py        # check the catalogue, number any new items
node    Content/motion/tools/clips.js          # render only the clips that are new or changed (--force for all, --only tally for one)
python3 Content/motion/tools/sounds.py         # every sound, byte-identical every run
node    Content/motion/tools/kit_check.js      # every item callable, every piece documented and drawn alone, the body map current
node    Content/motion/tools/kit_docs.js       # kit/PIECES.md
python3 Content/motion/tools/build_menu.py     # menu/index.html + a local preview (menu/_preview.html)
```

On Amir's PC the Python command is `python`. Needs node + Playwright with a Chromium, and
`pip install numpy scipy imageio-ffmpeg pillow`. The proof that the reel is unchanged:
`node Content/motion/tools/verify.js check --page showreel/reel.html --baseline Content/motion/baseline/reel.json` (all 450 frames, about 4 minutes).

**A new item:** write the piece in the kit, add a sample in `lab/`, look at it with `tools/still.js`, add one line to `catalog.json` (its `clip.sample` names the sample), run the commands above.
It gets the next free number. **A clip that looks wrong:** change the piece or its sample and run `clips.js` again; the changed clips are redone.

## How the samples are made (and what that means)

- **Moves are not mock-ups.** `clips.js` drives the same `reel.html` page the video is made from and cuts the real frames: a crop, a slower playback
  (the motion blur is scaled with it), a short hold at the end so the loop reads. The "finish" items (Shutter, Jolt, Halo, Prism, Film, Vignette) are split-screen:
  effect off on the left, on on the right.
- **Reel ingredients are drawn in the lab**, tall (1080 x 1920) and scaled to 404 x 720, through the same engine (motion blur, finishing, film grain). The pieces take every number as a
  param, so the sample is just the piece with its defaults and a story. **The numbers on a sample are placeholders, not findings.** The Farsi version is rendered a second time with Farsi words
  (right to left, whole words, Persian numerals): every Farsi word is a draft for Amir to read before it is used.
- **Sound samples are made on the reel's own synth** (`../showreel/tools/audio.py`, with the recipes in `tools/sound_recipes.py`).
  Each sound is its own tiny mix, normalised to a -3 dBFS peak, so a sound is the same whether it is played here or inside a video. The deep-bass sounds are tagged *best on headphones*:
  a phone speaker cannot play them. A piece names its sounds in its cues (`{ kind: 'sound', id: 'whoosh' }`) and the soundtrack tool plays them by name.
- **Claude cannot hear.** The numbers in the sound checks (length, level, where the energy sits, left / right movement) prove a sound is there and is what its label says.
  Whether it *sounds good* is Amir's call, which is what the marks are for.
- **No yellow.** Amir's own rule: clay is the only accent. The colour language uses bone for normal, clay for the key word, green for the fix, grey for detail and a clay
  strike-through for a mistake (a red for mistakes is Amir's call).

## What the build found in the reel

The first draft of the soundtrack (commit `41cb247`) had two bugs, and the finished video (`f414e57`) already has both fixed:

1. The seven plate-cut sounds in the rhythm shot never played (a cue prop named `kind` replaced the cue's own kind).
2. The final Dm chord pad was never added to the mix (its line sat inside a comment). The finale was three bells.

On 2026-10-01 the video's own audio was compared with the soundtrack the tools make today, window by window (the plate cuts and the finale included): they match, so the delivered video has the cut sounds and the chord and nothing needs re-making.

Rebuilding the reel from pieces found two things in the picture side, both fixed: a transition could leave stale pixels where it left a gap (so a frame could depend on which frames a worker had drawn before it; now every frame is a pure function of its number),
and the live preview could ask for a frame before frame zero and stop playing.

Ideas Amir sent for later videos (S&C graphics, animated anatomy, numbers on a court, a colour language, chapters, sound), with Claude's verdict, what was built and what is still open: [`INGREDIENTS.md`](INGREDIENTS.md).

## The plan this belongs to

1. **The menu** (this folder). Names, numbers, samples, marks. Done.
2. Make every item callable by name, rebuild the reel from the pieces to prove it matches, and add Amir's ingredients as new items. Done (2026-10-01).
3. A look switch (reel look or brand look) and Farsi that works on the old moves too (the ingredients already do).
4. A `/motion` skill, plus a line in `CLAUDE.md`, so every session reads the menu first.
5. Video number two, built only from the menu, over Amir's real footage and caption export.
