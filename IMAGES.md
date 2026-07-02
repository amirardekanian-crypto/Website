# Image guide

Every image used in the app, where it lives, what size to make it, and how to
add or replace one. All images are committed to the repo and served from a fixed
path, so **every device loads the exact same file** — nothing can get lost or
"moved" between phones.

> Rule of thumb for all photos: the app uses `object-fit: cover`, so images are
> **never stretched or distorted** — they scale to fill their box and crop the
> overflow. Match the recommended aspect ratio and the whole image shows with no
> crop. Wrong ratio = still looks fine, just cropped at the edges.

## Quick reference

| What | Folder | Aspect | Recommended size | Format | Target file size |
|------|--------|--------|------------------|--------|------------------|
| **Cycle banners** | `assets/cycles/` | 16:9 | 1200×675 | JPG/WebP | < 120 KB |
| **Workout banners** | `assets/img/workouts/` | 2:1 | 1600×800 | WebP | < 80 KB |
| **Landing photos** | `assets/img/athletes/` | portrait ~4:5 | ~1080×1350 | JPG | < 150 KB |
| **Social share (OG)** | `assets/img/og-image.jpg` | 1.91:1 | 1200×630 | JPG | < 100 KB |
| **App icons** | `assets/img/` + root | 1:1 | see icons section | PNG/SVG/ICO | tiny |

---

## 1. Cycle banners — `assets/cycles/`  ⭐ (the ones you manage most)

The image at the top of each cycle card on the **My Plan** page.

- **Aspect ratio:** 16:9 (the banner is locked to 16:9, so the whole image shows
  identically on every device).
- **Recommended size:** **1200×675** JPG, ~80% quality (≈ 60–90 KB).
- **Formats accepted:** the loader tries `.jpg → .jpeg → .png → .webp`, so any of
  those work. WebP is ~30% smaller if you want.
- **Filename = the cycle name, slugified:** lowercase, spaces/punctuation become
  hyphens. **Case-insensitive.**
  - `Foundation Forge` → `foundation-forge.jpg`
  - `Load & Build` → `load-build.jpg`
  - `Power Translation` → `power-translation.jpg`
- **No file? No problem:** the card falls back to the brand-green gradient
  automatically. Add images gradually; each appears the moment its file exists.
- **Composition:** text overlays the **bottom-left** (cycle name/weeks/tagline)
  and corners (status pill top-right, "Read more" bottom-right). Keep the subject
  **upper-center**; the bottom is darkened by a built-in scrim for legibility.
- **Where it's wired:** `program.html` → `cycleCardHTML()` builds
  `assets/cycles/<slug>.jpg`; CSS class `.cm-banner` (aspect-ratio 16/9).
- See `assets/cycles/README.md` for the full 38-name filename checklist.

**Image generation prompt** (swap the name in quotes):
```
Cinematic, moody athletic photograph for a strength & conditioning training
phase called "<CYCLE NAME>". A focused athlete mid-action that fits the spirit
of that phase, in a dramatic gym or sports setting. Deep forest-green and warm
clay-orange color grade, strong directional side lighting, subtle atmospheric
haze, high contrast, shallow depth of field, editorial sports photography.
Keep the lower-left and bottom of the frame darker and less busy so text can
overlay cleanly. No text, no logos, no watermark. 16:9 landscape.
```

---

## 2. Workout category banners — `assets/img/workouts/`

The wide banner at the top of each category in the **Workouts** tab
(Strength, Conditioning, Mobility, On-Court, Recovery).

- **Aspect ratio:** 2:1 (the `.wl-banner` box is locked to `aspect-ratio: 2/1`).
- **Recommended size:** **1600×800** WebP (current files are 41–63 KB).
- **Filename:** matches the category id — `strength.webp`, `conditioning.webp`,
  `mobility.webp`, `on-court.webp`, `recovery.webp`.
- **Where it's wired:** the path is set per category in `workouts/index.json`
  under `"banner"`; displayed as a CSS `background-image` (cover + dark scrim).
- **Composition:** the title sits bottom-left over a left-to-right dark gradient,
  so keep the left side usable for text; subject can sit center/right.
- To add a new category banner: drop the WebP here and point its `"banner"`
  field in `workouts/index.json` at it.

---

## 3. Landing-page athlete photos — `assets/img/athletes/`

Testimonial/showcase photos on the public homepage (`index.html`).

- **Aspect ratio:** portrait. Display crops with `object-fit: cover` and
  `object-position: center 15%` (biased to the top so faces stay visible).
- **Recommended size:** **~1080×1350 (4:5)** JPG, < 150 KB. Existing photos range
  from ~3:4 to square and all work — just keep the face in the upper third.
- **Filename:** the person's name, e.g. `Mehraneh.jpg`, `mehdi-rahmani.jpg`.
- **Where it's wired:** referenced directly as `<img>` inside `.testimonial-photo`
  in `index.html`. To add one: drop the JPG here and add a `<article class=
  "testimonial-card">` block in the testimonials section.

---

## 4. Social share image (Open Graph) — `assets/img/og-image.jpg`

The preview card shown when the site link is shared (WhatsApp, iMessage, etc.).

- **Size:** **1200×630** (1.91:1) — the standard OG size. Current file ~52 KB.
- **Format:** JPG (q85, progressive) — the banner's grain bloats PNG past the
  <100 KB budget. Regenerated from `source/og-source.png` by `generate_icons.py`.
- **Where it's wired:** `<meta property="og:image">` / `twitter:image` in the
  `<head>` of the public pages (`index.html`, etc.).
- Replace this one file to change every link preview.

---

## 5. App icons & favicon — `assets/img/` and repo root

PWA / browser icons. Set once for branding; rarely change.

| File | Size | Used for |
|------|------|----------|
| `assets/img/icon-192.png` | 192×192 | PWA home-screen icon (manifest) |
| `assets/img/icon-512.png` | 512×512 | PWA splash / store icon (manifest) |
| `assets/img/apple-touch-icon.png` | 180×180 | iOS "Add to Home Screen" |
| `assets/img/favicon-32.png` | 32×32 | browser tab (PNG) |
| `assets/img/favicon.svg` | vector | browser tab (modern) |
| `favicon.ico` (repo root) | multi | browser tab (legacy) |

- **Where wired:** `manifest.json` (icon-192 / icon-512) and `<link rel="icon">`
  / `apple-touch-icon` in the page `<head>`.
- There's a helper to regenerate the raster sizes: `assets/img/generate_icons.py`.

---

## Adding or replacing any image — checklist

1. Export at the **recommended size & aspect** from the table above.
2. Compress (JPG ~80% quality, or WebP) to hit the target file size — keeps phones fast.
3. Name it exactly as required (cycle slug / category id / person name).
4. Drop it in the right folder.
5. `git add`, `commit`, `push` → it's live for every device.

That's it — because images load from a fixed URL in the repo, what you push is
exactly what every phone, tablet, and desktop sees.
