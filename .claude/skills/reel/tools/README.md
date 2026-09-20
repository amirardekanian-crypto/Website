# Reel tools

Small, tested helpers for building, checking and exporting reels on Amir's Windows PC. They were written for
`Content/reel-7-course.html` (2026-09-20) and work for any reel built on the `/reel` skill's driver.

| Tool | What it does |
|---|---|
| `render_mp4.js` | **Deterministic MP4 export.** Freezes the page clock, steps it 1/30 s at a time, seeks every CSS animation to the same instant, shoots one JPEG per frame, encodes H.264 (BT.709, faststart). 900 frames in about 35 s. |
| `still_beats.js` | The frozen `?beat=N` still of every scene, plus console errors and font status. |
| `sample_frames.js` | Plays the reel in real time and saves timed frames (`--loop2` proves the second pass, `--default` shows the black dip at the loop end). |
| `capture_app_screens.js` | Screenshots real app screens at phone size from a JSON config, for a phone mock-up. |
| `contact_sheet.py` | Tiles images into one labelled sheet. |

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
  by something else (a `<video>`, a CSS `animation-timeline`, a WebGL clock) would not be frame-accurate.

## Export recipe

```
node render_mp4.js Content/<reel>.html Content/<reel>/export/<reel>.mp4 --frames %TEMP%\<reel>-frames --crf 15
node render_mp4.js Content/<reel>.html x.mp4 --every 90 --frames %TEMP%\t     (quick test: one frame in 90, no video)
```

`--seconds` is the sum of the scenes' `data-dur` (default 30) and `--lead` is the delay before scene 0 (default 150 ms,
the reel-6/7 driver). Keep the frames folder OUT of the repo (OneDrive would sync 900 files). `crf 15` gave 26 MB for
reel-7 (about 7 Mbps); `crf 18` gave 14 MB. The MP4 has no audio: Amir adds it in Instagram.
