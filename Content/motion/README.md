# Motion Menu

Every move, look and sound in Claude's showreel ([`../showreel/`](../showreel/README.md)) has a **number** and a **name**,
with a sample you can play. Mark the ones you like. On a later video, ask for them by number: *"use 14, 22 and the Kick"*.

**143 items:** 73 moves, 26 design items (frame furniture, colour looks, type pairs, easing "feel", house rules), 48 sounds.
It is Claude's own kit. It is **not** Amir's brand system: the reel is English, uses a cobalt / coral / mint palette and
fonts that are not Amir's. Step 3 of the plan adds a switch to the brand look (clay, Vazirmatn, Farsi, right to left).

## How to use it

1. Open the published page: <https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA> (private; only its owner can open it). Play things. Tap **Keep**, **Maybe** or **Drop**.
   The pencil gives an item your own name or leaves a note. Marks are saved on the page.
2. Tell Claude you are done. Claude reads the marks straight from the page, so nothing has to be copied.
   (If the page says "Kept on this phone only", tap **My picks**, copy the list and paste it to Claude.)
3. Numbers never change and are never reused (`numbers.json`). Names and wording can change at any time.

## Publishing

The page is an Artifact. `build_menu.py` writes `menu/index.html` and `menu/files.json` (every clip, poster and sound the page needs,
by published path). Publish `menu/index.html` with `root: Content/motion/menu`, that file list and `capabilities: {db: {}}`; republish to the
same URL to update it. Artifacts serve `.mp4`, `.mp3`, `.wav`, `.ogg` and `.jpg`, **not `.m4a`**, which is why the sounds are MP3.
Marks live in the page's own database (collection `marks`, one document per item id: `v` keep / maybe / drop, `alias`, `note`).
Claude reads them with the `ArtifactData` tool: `list` on `marks`.

## What is in here

```
catalog.json        the single source of truth: one line per item (name, plain label, what you can change,
                    where it was used, which sounds go with it, how its sample clip is cut)
numbers.json        id -> number. Written once, never changed, never reused
menu/index.html     the page, built from the catalogue (publish this)
menu/clips/*.mp4    68 sample clips, cut from the real reel through the real engine (640x360, 3.9 MB)
menu/posters/*.jpg  80 stills (a poster for every clip, plus the looks and frame furniture)
menu/sounds/*.mp3   48 sound samples (2.2 MB); menu/sounds.json holds each one's length and waveform
menu/clips.manifest.json   what was rendered, and a hash of the spec it came from
tools/              catalog.py · clips.js · sounds.py · build_menu.py · page.html (the page template)
export/             git-ignored: WAV copies of the sounds (48 kHz, 16-bit) and a waveform contact sheet
```

## Rebuild

```
python3 Content/motion/tools/catalog.py        # check the catalogue, number any new items
node    Content/motion/tools/clips.js          # render only the clips whose spec changed (--force for all)
python3 Content/motion/tools/sounds.py         # all 48 sounds, about 20 s, byte-identical every run
python3 Content/motion/tools/build_menu.py     # menu/index.html + a local preview (menu/_preview.html)
```

On Amir's PC the Python command is `python`. Needs node + Playwright with a Chromium, and
`pip install numpy scipy imageio-ffmpeg pillow`.

**A new item:** add one line to `catalog.json` (its `clip` says which reel seconds show it), run the four commands above.
It gets the next free number. **A clip that looks wrong:** change its `t0` / `t1` / `crop` / `speed` in the catalogue
and run `clips.js` again; only that clip is redone.

## How the samples are made (and what that means)

- **Visual samples are not mock-ups.** `clips.js` drives the same `reel.html` page the video is made from and cuts the
  real frames: a crop, a slower playback (the motion blur is scaled with it), a short hold at the end so the loop reads.
  The "finish" items (Shutter, Jolt, Halo, Prism, Film, Vignette) are split-screen: effect off on the left, on on the right.
  They use two options added to `REEL.renderFrame()`: `noCamera` and `fx` (overrides for bloom / ca / grain / vig / flash),
  plus `noHud`. With none of them set the engine renders exactly what it did before; 17 sampled frames were compared
  byte for byte against the delivered video's frames.
- **Sound samples are made on the reel's own synth** (`../showreel/tools/audio.py` is imported, never copied).
  Each sound is its own tiny mix, normalised to a -3 dBFS peak, so a sound is the same whether it is played here or
  inside a video. The ten deep-bass sounds are tagged *best on headphones*: a phone speaker cannot play them.
- **Claude cannot hear.** The numbers in the sound checks (length, level, where the energy sits, left / right movement)
  prove a sound is there and is what its label says. Whether it *sounds good* is Amir's call, which is what the marks are for.

## What the build found in the reel

Two bugs in the delivered video's soundtrack turned up while the sounds were being made, and are fixed:

1. The seven plate-cut sounds in the rhythm shot never played (a cue prop named `kind` replaced the cue's own kind).
2. The final Dm chord pad was never added to the mix (its line sat inside a comment). The finale was three bells.

## The plan this belongs to

1. **The menu** (this folder). Names, numbers, samples, marks.
2. Make every item callable by name, and rebuild the reel from the pieces to prove it matches.
3. A look switch (reel look or brand look) and Farsi tags that actually work on Farsi text.
4. A `/motion` skill, plus a line in `CLAUDE.md` and `MAP.md`, so every session reads the menu first.
5. Video number two, built only from the menu.
