# Reel tools

Small, tested helpers for building, checking and exporting reels on Amir's Windows PC. They were written for
`Content/reel-7-course.html` (2026-09-20) and work for any reel built on the `/reel` skill's driver. **The timeline-kit tools (reel 9, 2026-10-02) are in the second table at the end.**

| Tool | What it does |
|---|---|
| `render_mp4.js` | **Deterministic MP4 export.** Freezes the page clock, steps it 1/30 s at a time, seeks every CSS animation to the same instant, shoots one JPEG per frame, encodes H.264 (BT.709, faststart). 900 frames in about 35 s. |
| `still_beats.js` | The frozen `?beat=N` still of every scene, plus console errors and font status. |
| `sample_frames.js` | Plays the reel in real time and saves timed frames (`--loop2` proves the second pass, `--default` shows the black dip at the loop end). |
| `capture_app_screens.js` | Screenshots real app screens at phone size from a JSON config, for a phone mock-up. |
| `contact_sheet.py` | Tiles images into one labelled sheet. |
| `mux_audio.py` | **Sound for an ad.** Lays Amir's filmed take under a silent render (video copied, not re-encoded): two-pass loudnorm to -14 LUFS / -1.5 dBTP, 48 kHz stereo AAC, optional music bed ducked under his voice, then proves the file has an audio stream at the right loudness and length. Exits 1 on a failed check. `/ad` stage 16, `/reel` Step 9. |

## One-time setup on this PC

```
mkdir %TEMP%\reel-tools && cd %TEMP%\reel-tools && npm init -y && npm i playwright-core
set NODE_PATH=%TEMP%\reel-tools\node_modules
python -m pip install --user imageio-ffmpeg            (ships ffmpeg 7.1 with libx264)
```

Edge is used through `channel: 'msedge'` (no Chrome is installed, and no browser download is needed). Every tool
finds `playwright-core` through `NODE_PATH`. `render_mp4.js` finds ffmpeg on `PATH`, in `$FFMPEG`, or through
`imageio_ffmpeg`.

## What the reel's driver must provide

- The three URL modes: default (autoplay + loop), `?beat=N` (frozen still), `?capture=1` (no chrome, exact 1080x1920).
- `window.__t0 = performance.now()` at the start of `play()` (only `sample_frames.js` needs it).
- Scene timers made with `setTimeout` and animation done with CSS or the Web Animations API. `render_mp4.js`
  controls `setTimeout`, `requestAnimationFrame`, `performance.now` and `Date` through Playwright's fake clock, and
  seeks CSS transitions, CSS animations and `element.animate()` through `document.getAnimations()`. Anything driven
  by something else (a CSS `animation-timeline`, a WebGL clock) would not be frame-accurate.
- **`<video>` plates** (reel-8) obey neither clock, so the reel and the renderer share a small protocol. The renderer sets
  `window.__renderMode = true` before the page loads: the reel must then **not** play its videos. After every frame step the
  renderer calls `window.__videoAt(V)` (V = ms since `play()`), which must seek each video to the frame that belongs at V and
  return a Promise that resolves when the seeks have landed (truthy if a frame changed, so the renderer waits 45 ms for the
  paint). No `__videoAt` means no videos and nothing changes. In real time the reel plays them itself. Seek to the MIDDLE of a
  source frame, `(n + 0.5) / fps`, or float rounding shows the frame before. The reference is
  `Content/reel-8-course/src/reel8.template.html` (search for `__videoAt`). Do not put a timer fallback in the seek under
  `__renderMode`: the clock is frozen and it would never fire.

## Export recipe

```
node render_mp4.js Content/<reel>.html Content/<reel>/export/<reel>.mp4 --frames %TEMP%\<reel>-frames --crf 15
node render_mp4.js Content/<reel>.html x.mp4 --every 90 --frames %TEMP%\t     (quick test: one frame in 90, no video)
```

`--seconds` is the sum of the scenes' `data-dur` (default 30) and `--lead` is the delay before scene 0 (default 150 ms,
the reel-6/7/8 driver). `--query hook=b` adds URL parameters after `?capture=1` (reel-8's second hook). Keep the frames
folder OUT of the repo (OneDrive would sync 900 files). `crf 15` gave 26 MB for reel-7 (about 7 Mbps); `crf 18` gave 14 MB;
reel-8 at `crf 16` gave 16 MB for 20 s, and 600 frames took 35 s (the clips add a seek and 45 ms on the 220 steps where a
video frame changes). The MP4 has no audio: Amir adds it in Instagram.

## Timeline-kit tools (2026-10-02, reel 9)

For a reel built on `../timeline/` (the page is a pure function of time, `window.__render(t)`; playbook: `../timeline/README.md`, `/reel` Step 2d).
They find `playwright-core` through `_pw.js`, so **no `NODE_PATH` is needed**. Run `python setup_tools.py` once per PC.

| Tool | What it does |
|---|---|
| `setup_tools.py` | Checks node, ffmpeg, Edge, numpy / scipy / Pillow and installs `playwright-core` into `%TEMP%\reel-tools` when it is missing. Safe to run any time. |
| `still.js` + `sheet.py` | A frozen frame at any exact second (`still.js reel.html OUT 0.5 3.5 6.5`; `--query noball=1` for a cover without the hero), then a labelled contact sheet. Look at the sheet, then at single frames. |
| `render_timeline.js` | **The MP4.** 20 sub-frames per frame across a 180 degree shutter, averaged by ffmpeg = real motion blur, then film grain, H.264 High, BT.709 tags in the stream. `--draft` is half size and 4 sub-frames (about a minute). A final takes about 15 s of rendering per second of reel (26 s: 6.5 min, 30 s: about 8 min): run it as a background task. |
| `safe_audit.js` | Every piece of text against what Instagram covers (y 250-1580, x 60-1020, never in the right-hand button rail x 915-1000 below y 1165). Exit 1 on a finding. |
| **`read_audit.js`** | **Can a person read it?** Each text block must be fully visible for `0.8 s + 0.25 s per word` (cap 2.4 s) **and not under the ball** (the hero hiding 12% of a word's ink box counts as unread; one quick flash per hold is forgiven, a second one or a longer cover breaks the hold; `--no-ball` turns that off). Exit 1 when a block is more than 0.2 s short. **Zero "TOO FAST" before any render** (reel 9's first cut had 14 of 33). |
| `ball_audit.js` | Lists every text block the hero covers, with the longest cover and when (`--max-run 0.3` fails the longer ones). Use it to see what to move once `read_audit.js` says "ball: -x s". |
| `copy_audit.py` | Traces every on-screen line to a source file (his page, a brief) and lists the NEW lines for Amir to read before Farsi ships. |
| `capture_tiles.js` | A real page (his site, an app screen, a client's site) as tall phone-width tiles: reduced motion, lazy images forced, a scroll pass, `--css`, `--storage`, `--mark`, `--el`. |
| `extract_plate.py` | Footage to numbered frames the page draws by time (`plateDraw`): a plate, never a `<video>`. |
| `export_sound.js` -> `make_sfx.py` -> `mux_sfx.py` | The page's own cue list becomes **synthesized** effects (nothing downloaded) placed on the exact frames, then laid under the silent render with a PASS check (peak at most -1 dBTP, lengths within 0.1 s). Never auditioned by ear: say so. `spectro.py` draws the track as a picture. |
| `preview_check.js` | Opens the reel with no parameters, the way Amir does: it must autoplay, loop, fit the window and show no errors. |
