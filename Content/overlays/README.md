# Transparent video overlays

Motion graphics meant to sit **on top of a talking-head reel** in CapCut — not standalone
posts. Built the same way as a `/reel`: an animated, self-contained HTML canvas at
1080×1920, but rendered out frame-by-frame with a real alpha channel instead of screen-
recorded.

## What's here

| File | What it is |
|---|---|
| `overlay-fast-feet.html` | **The source.** FAST FEET ≠ FAST, 4.00s. Open it to preview (autoplays, loops, backdrop toggle). Everything — fonts included — is base64-embedded, so it works offline. |
| `fast-feet-overlay-alpha.webm` | VP9 + alpha, 60fps. True transparency. |
| `fast-feet-overlay-black-screenblend.mp4` | H.264 on pure black, 60fps. For **Screen** blend mode — the path that works in every version of CapCut, mobile included. |

A ProRes 4444 `.mov` (also true alpha, ~30MB — ProRes is near its bitrate floor on this
content, so `-bits_per_mb` barely moves it) is **not committed** — re-render it from the HTML
with the pipeline below when it's needed.

## Using them in CapCut

- **MP4 (recommended, always works):** drop it on the track above the talking head →
  *Blend* → **Screen**. Black disappears; white and clay stay. The graphic is designed
  light-on-transparent precisely so this works.
- **WebM / ProRes MOV:** import straight onto the overlay track — CapCut desktop keeps the
  alpha. Skip these on mobile; use the MP4.

Both routes render the same picture (verified: mean pixel diff 0.46/255 over real footage).
The only difference is the text drop-shadow, which Screen blend drops.

## Re-rendering

```bash
node scripts/render_overlay_frames.js Content/overlays/overlay-fast-feet.html ./frames 60 4

# true alpha, VP9
ffmpeg -y -framerate 60 -i frames/f%04d.png -c:v libvpx-vp9 -pix_fmt yuva420p \
  -b:v 0 -crf 24 -row-mt 1 -auto-alt-ref 0 -metadata:s:v:0 alpha_mode=1 out.webm

# true alpha, ProRes 4444
ffmpeg -y -framerate 60 -i frames/f%04d.png -c:v prores_ks -profile:v 4444 \
  -pix_fmt yuva444p10le -vendor apl0 -alpha_bits 8 -bits_per_mb 190 out.mov

# black plate for Screen blend
ffmpeg -y -f lavfi -i color=c=black:s=1080x1920:r=60 -framerate 60 -i frames/f%04d.png \
  -filter_complex "[0:v][1:v]overlay=shortest=1,format=yuv420p" \
  -c:v libx264 -preset slow -crf 16 -movflags +faststart -an out.mp4
```

`ffmpeg` isn't in the sandbox by default — `sudo apt-get update && sudo apt-get install -y
--no-install-recommends ffmpeg` (the Playwright-bundled one can't encode any of this).

## Building another one

Copy `overlay-fast-feet.html` and rework the composition. Two things carry the pipeline and
must survive any edit:

1. **Every animation runs on one timeline from page load** — plain `animation-delay`
   offsets, `fill-mode: both`, no class-gated reveals. The renderer scrubs by setting
   `currentTime` on `document.getAnimations()`, so an animation that only exists after a
   class toggle will never be captured.
2. **The `?capture=1` mode must stay chrome-free at native scale** with a transparent page
   background — the frames come from `page.screenshot({ omitBackground: true })`.

Design constraint specific to this format: build it **light-on-transparent** (paper white +
clay-2 `#E06B43`, no dark fills). Dark elements vanish under Screen blend, which is the one
route guaranteed to work in CapCut.
