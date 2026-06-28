---
name: reel
description: Build a ready-to-record Instagram reel (1080×1920, animated HTML) from Amir's script, story, or topic. Use whenever Amir asks for a reel or gives content for one — a personal story, a coaching tip, a myth-bust, something about his app/method/programming, proof/results, pricing, or a Q&A. Also use when he says "make a reel about…" or pastes a script for a reel. (For static swipe posts use /carousel instead.)
---

# Instagram reel generator — AA Performance

Turn Amir's raw script/topic into a finished, **self-contained 1080×1920 animated HTML reel** that
auto-loops and is captured by screen-recording. Same brand and voice as the carousels; the difference
is motion. He posts for the **Farsi general-fitness market**; content **justifies the premium price &
retains clients** (show depth) — never cheap lead-gen.

## Step 0 — Required reading (EVERY run, before designing)

1. **`Content/BUILD-MAP.md`** — the system index. Read **§8 (Reels)**, **§3 (one type system)**,
   **§2 (colour canon)**, and **§4–§6** (real app cards / coach data / cycle-day images) so the reel
   mirrors the real product.
2. **`Content/PRODUCT.md`** — the offer, the app's four tabs, readiness/ACWR, the coach dashboard,
   pricing, and the **"Content angles that work"** list.
3. **`Content/DESIGN_SYSTEM.md`** — palette, type (§2), and **§7 Reels & motion** (the beat/scene
   model, phone mock-up spec, house ease). Plus **§10 voice & canonical word choices** (hard rules).
4. **An existing reel to fork the engine from:**
   - `Content/reel-5-how-it-works.html` — **English/LTR**, scene-swap, clean reference build.
   - `Content/reel-1-dashboard.html` — **Farsi/RTL**, scene-swap (note: its `--gold` is retired — use clay).
   - `Content/reel-4-app.html` — **persistent-subject** "App-as-Product" phone reel.
   Copy the JS driver + `.fitwrap` scale + progress + loop + count-up verbatim; restyle scenes.

## Step 1 — Analyze the script & pick the angle

Classify: **story · coaching tip/how-to · myth-bust · app/method/programming · proof/results ·
pricing/objection · Q&A.** Extract the **hook** (first-2-seconds line), the single **thesis**, and
**4–7 beats**, plus any numbers/claims.

**Don't duplicate the existing reels' angles** (BUILD-MAP §8): 1 = coach dashboard / "what your coach
sees" · 2 = the 6-month roadmap · 3 = "a coach in your pocket" · 4 = the app (phone) · 5 = the full
5-step "how it works" journey. New reel = a fresh angle, or a sharper cut of one.

**Accuracy gate (non-negotiable):** every physiology number must be right (Amir holds an
exercise-physiology ارشد). Prefer a simple round figure over unverified math. ACWR danger threshold in
content = **1.5**; readiness scale 1–5 (5 = best). If a claim can't be verified, soften or flag it.

## Step 2 — Choose language, scene model, length

- **Language:** **Farsi/RTL default** (Vazirmatn). **English/LTR on request** (Barlow Condensed for
  display/headlines + Barlow for body, `<html lang="en" dir="ltr">`). When unsure, ask.
- **Scene model:** **scene-swap** (default — full-screen scenes, one `.on` at a time) or
  **persistent-subject** (a phone stays on screen while UI swaps inside — the cinematic
  "App-as-Product" option; use for product-deep reels, see DESIGN_SYSTEM §7 + the phone spec).
- **Length:** ~30–40s, **6–8 scenes**, **hook in the first 2s**, **captions burned in** (watched muted).
- Sketch the scene list (eyebrow + headline + the one motif per scene) and confirm the angle with Amir
  before building if the brief is open-ended.

## Step 3 — Write the copy (burned-in captions)

- **Farsi** (default): colloquial Tehrani, warm, direct, no fluff. **Hard rules:** never `letter-spacing`
  (breaks cursive joining), no UPPERCASE, **Persian numerals** (۰۱/۰۵), numeric counters get
  `direction:ltr`. Canonical words (DESIGN_SYSTEM §10): «مربیِ بدنسازیِ حرفه‌ای» · «ارشد» not "MSc" ·
  «یه برنامه» not «فایل/PDF» · «شدت» not «سختی» · «شروع کن» not «درخواست».
- **English** (on request): sharp & athletic. Headlines in Barlow Condensed; body/sub in Barlow.
- **One idea per scene.** Highlight ONE accent word per headline in **clay** (clay-2 `#E06B43` on dark).
- Close on the **canonical outro**: setup → payoff + brand row + handle. FA: «یه نقشه تا هدفت» → «یه
  مربی تو جیبت» (مربی in clay) + «@amirardekanian · دایرکت بده 📩». EN: a tight "not a file → a coach"
  line + `Move Better. Hit Harder. Last Longer.` + `@amirardekanian`.

## Step 4 — Build the file

Create **`Content/reel-N-<slug>.html`** (next free N; kebab-case slug). Self-contained, no libraries.

- **Stage:** `1080×1920`, `.fitwrap` auto-scales to the viewport (`transform:scale(min(w/1080,
  h/1920))`); `.reel` clips; `.scene{position:absolute;inset:0;opacity:0;transition}` → `.on`. Copy the
  driver from reel-5 (sequences `.on` by `data-dur`, runs the progress bar, counts up, **loops**).
- **Palette tokens** (clay-only — NO gold): green `#0E4A36`, green-2 `#156A4D`, clay `#C7552F`, clay-2
  `#E06B43` (accent on dark), paper `#FAF7F2`, ink `#1A1A1A`, muted `#5C5C5C`, good `#1F7A4D`, bad
  `#C0392B`, stage `#0c0f0b`.
- **Fonts** (Google Fonts link): Farsi → Vazirmatn; English → Barlow + Barlow Condensed (+ Space Mono
  only if you need tiny mono labels). Reels need internet for fonts.
- **Type scale @1080×1920:** big 92–104 · mid 62–66 · sub 42–46 · eyebrow 34–36 · edge pad 88.
- **Motion:** house ease `cubic-bezier(.16,1,.3,1)`; `.rise` children (`opacity:0; translateY(~46px)`)
  cascade in with `transition-delay` (~.12s steps); count-up numbers with ease-out (FA → Persian
  numerals, `direction:ltr`).
- **Frame:** a per-scene inset border `inset:28px; border-radius:14px` — `rgba(255,255,255,.18)` on
  dark, `rgba(0,0,0,.14)` on light. Optional faint film-grain `::after` (opacity ~.05, no blend-mode).
- **Mirror the real app** when a scene shows UI: reproduce the real cards from `card-preview.html`
  (exercise card with colour-coded left bar + 5-cell stats grid + per-set log; readiness 1–5; cycle/day
  banners with green scrim). Embed `assets/cycles/*.jpg` (16:9) / `assets/days/*.webp` (≈5:2) as base64.
- Keep the **controls + progress bar OUTSIDE** the 1080×1920 frame (a `.controls` bar with a Replay
  button + a "screen-record the frame" hint) so they don't get recorded.

## Step 5 — Verify (before delivering)

The screenshot/preview MCP tool is unreliable here; verify with **headless Chromium** (pre-installed at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, drive via `playwright-core`):

1. Load the file, `await document.fonts.ready`. **Stop the autoplay loop before inspecting**
   (`for(let i=1;i<300000;i++)clearTimeout(i)`) — otherwise the loop races your scene-jump and you
   screenshot the wrong scene.
2. For each scene call `window.__show(i)`, wait ~2.9s for staggered reveals/counters/line-draws, then
   `#reel.screenshot()` at a viewport tall enough that scale = 1 (e.g. 1080×2000).
3. Assert **no overflow** (no child's rect outside the canvas) and **no text/graphic collisions**;
   confirm the active scene index matches; check **no console errors**.
4. Eyeball the stills. Fonts load from Google Fonts (blocked in this sandbox → a fallback sans renders);
   tell Amir the real browser shows Barlow/Vazirmatn. Harden any layout that only just fits in the wide
   fallback font (worst case) so it's safe in the real, narrower font.

## Step 6 — Deliver

1. The file path + a **one-line-per-scene summary** (eyebrow + headline + motif) so Amir reviews fast.
2. The **Instagram caption** — hook line ≈ the opening scene, 2–4 value lines, a question to drive
   comments, CTA + «@amirardekanian», then 5–10 hashtags (FA mix; EN tags allowed for English reels).
   Embed it at the top of the HTML as `<!-- IG CAPTION … -->` so it travels with the file.
3. Remind him: open the file in a browser, narrow the window until the whole 1080×1920 frame shows, hit
   **Replay**, and **screen-record the frame** (controls sit outside it). Offer to render an MP4 or make
   the other-language version.

## Don'ts

- No gold/yellow — **clay `#C7552F` is the only accent** (clay-2 `#E06B43` on dark). The old reel-1
  `--gold` is retired; don't reuse it.
- Don't duplicate an existing reel's angle (see Step 1).
- No `letter-spacing` on Farsi, ever. No UPPERCASE Farsi. No Latin digits in Farsi lines.
- Don't invent results, client names, or numbers. Real proof only, or clearly generic phrasing.
- Don't cram — one idea per scene; hook in the first 2 seconds.
- Don't put the controls/progress chrome inside the recordable frame.
