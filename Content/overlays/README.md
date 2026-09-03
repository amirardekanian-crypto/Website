# Transparent video overlays

Motion graphics meant to sit **on top of a talking-head reel** in CapCut — not standalone
posts. Built the same way as a `/reel`: an animated, self-contained HTML canvas at
1080×1920, but rendered out frame-by-frame with a real alpha channel instead of screen-
recorded.

## What's here

| File | What it is |
|---|---|
| `overlay-fast-feet.html` | **The source.** FAST FEET ≠ FAST, 4.00s, transparent. Open it to preview (autoplays, loops, backdrop toggle). Everything — fonts included — is base64-embedded, so it works offline. |
| `fast-feet-overlay-alpha.webm` | VP9 + alpha, 60fps. True transparency. Desktop CapCut only. |
| `fast-feet-overlay-black-screenblend.mp4` | H.264 on pure black, 60fps. For **Screen** blend mode — works on any CapCut that has per-clip blend/mix modes, mobile included. |
| `overlay-fast-feet-greenscreen.html` | A **derived** source — same timeline, solid `#00FF00` background, for CapCut builds with **no blend-mode option at all** (Chroma Key only). Not a copy-paste recolor — see below. |
| `fast-feet-overlay-greenscreen.mp4` | H.264 on solid green, 60fps. Keyed with CapCut's **Chroma Key** tool. |

A ProRes 4444 `.mov` (also true alpha, ~30MB — ProRes is near its bitrate floor on this
content, so `-bits_per_mb` barely moves it) is **not committed** — re-render it from the HTML
with the pipeline below when it's needed.

## Using them in CapCut

Pick one path, in order of preference:

1. **Blend mode exists → use the black `.mp4`.** Drop it on the track above the talking
   head → clip settings → **Blend / Mix mode → Screen**. Black disappears; white and clay
   stay. Works on every CapCut that has this feature, including mobile.
2. **No blend mode, but Chroma Key exists → use the green `.mp4`.** Drop it on the track
   above the talking head → clip settings → **Chroma Key** (sometimes shown as a
   scissors/color-swatch icon) → tap the eyedropper on the green background → raise
   **Intensity** until the green is gone → nudge **Shadow/Feather** only if a thin green
   edge remains around the letters.
3. **Desktop CapCut with alpha-video import → use the `.webm` or ProRes `.mov`.** Import
   straight onto the overlay track, no keying step needed — it's already transparent.

All three render the same graphic and timeline. Verified: the true-alpha composite and the
Screen-blend composite match to a mean pixel diff of 0.46/255 over real footage (only the
text drop-shadow differs, which Screen blend drops); the green-screen build was checked by
simulating a chroma key over the same footage and comparing side-by-side (see below).

## Why the green-screen file is a separate, reworked source — not just a recolor

Swapping the background to green and leaving everything else alone does **not** work here,
and the difference showed up immediately once actually simulated:

- **A hard keyer can't hold partial transparency.** It can only decide "keep" or "remove"
  per pixel (plus a little edge feathering) — there's no equivalent of a soft alpha fade.
  Any shape held at a fixed low opacity for longer than an instant bakes into a color close
  to green and either gets eaten or left as a green-tinted smear.
- **That's exactly what the "resting" footprints and the hairline guides were.** The
  inactive footprints sat at 11% opacity for most of the stepping sequence (not a quick
  transition — a sustained state), and the hairlines (`--hair`) were a fixed 30%-alpha
  white. Both keyed as dirty green blobs in a simulated composite. **Fix:** the footprints'
  dim state now comes from `filter:brightness(.22)` instead of opacity — fully opaque
  throughout, so the keyer sees a plain dark grey shape and keeps it cleanly. `--hair` is
  now a solid opaque grey, not a translucent white.
- **The two big soft glows** (the `≠` halo, the arrowhead glow) and every **blurred drop-
  shadow** are removed outright in this build — a soft gradient fading to nothing is the
  same problem as the footprints, just shaped like a halo instead of a paw print.
- **Left alone on purpose:** the footstep motion-blur sweep, the FAST ghost-trail streaks,
  the speed lines, the arrow shaft's own built-in fade-up, and the `≠` appear-ring. These
  are brief and moving — a soft trailing edge on something already whipping across the
  frame reads as intentional motion blur, not a rendering defect. Only a shape that just
  *sits there* half-transparent is the actual problem.

If you build another green-screen variant, check for this the same way: render a still,
composite it with a quick keying simulation (script below), and look for anything that's
tinted-but-not-gone rather than trusting it by eye against the raw green frame.

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

# green-screen source renders opaque, not alpha — pass "opaque" as the 7th arg
# (leave the 6th arg, the still-frame list, empty to render the whole sequence)
node scripts/render_overlay_frames.js Content/overlays/overlay-fast-feet-greenscreen.html \
  ./gsframes 60 4 "" opaque
ffmpeg -y -framerate 60 -i gsframes/f%04d.png -c:v libx264 -preset slow -crf 16 \
  -pix_fmt yuv420p -movflags +faststart -an greenscreen-out.mp4
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
2. **The `?capture=1` mode must stay chrome-free at native scale.** The alpha build keeps
   the page background transparent (frames come from `page.screenshot({omitBackground:true})`);
   a green-screen build instead sets `html,body{background:#00FF00}` and renders with the
   `opaque` flag (see above) so the color bakes into the PNGs.

Design constraint specific to this format: build the **alpha source** light-on-transparent
(paper white + clay-2 `#E06B43`, no dark fills) so it also works as a Screen-blend MP4. If
you also need a green-screen variant, don't just recolor the background — read the section
above and check every element that rests at a fixed partial opacity for more than an
instant; those are what break a real chroma key, and the only way that's caught reliably is
compositing a simulated key over a test frame, not eyeballing the raw green render.
