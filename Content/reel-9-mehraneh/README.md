# Reel 9 — Mehraneh Zohourian's website (26 s, Farsi, 1080×1920)

An Instagram reel that introduces **mehranehzohourian.com**, made for **her** account (`@mehraneh_zohourian`), not for Amir's.
Amir asked for a 10–20 s animated video that shows what the studio can do (2026-10-02). He called the first cut (17 s) "amazing" and then said
*"the speed of the changes are too fast, there is no time to be able to read"*, so this is the **slower cut: about 26 s**, planned from a reading budget
(*Pacing*, below). It is also the first reel built on the reusable **timeline kit** (`.claude/skills/reel/timeline/README.md`).

**Open `Content/reel-9-mehraneh.html`** (one self-contained file, ~2.5 MB): it plays, loops and has a scrub bar (space = pause, ← → = ±0.1 s).
The finished videos are in `export/` (git-ignored): `mehraneh-site-reel.mp4` (17.7 MB, silent, H.264 High, BT.709, 30 fps), `mehraneh-site-reel-sfx.mp4` (18.3 MB, the same picture with a synthesized
sound-effects layer), `cover.png` (the clean cover frame at 1.3 s, no ball) and `storyboard.png` (a contact sheet). The earlier 17 s cut is kept as `*-v1-fast.*` there, and its source is
commit `df7e1c4` on the local branch `wip/reel-9-mehraneh` (never pushed).

## Her brand, not Amir's
Everything here is taken from her live site (`amirardekanian-crypto/mehraneh-site`, the `SPORTS` table and the `:root` skins), so the clay/`#C7552F`, "no yellow",
Amir's handle and his mantra **do not apply** to this reel. Her rules are:

| | tennis (the site's "spruce" skin) | padel (the "court" skin) |
|---|---|---|
| ground | `#003320` dark spruce (gate `#07130E`) | `#0250B0` elite blue |
| accent / ball | `#EC99AF` pink | `#D0FF41` volt lime |
| paper | `#FFFBFA`, blush `#FFE9E8` | `#FFFFFF` |

Type: **Lalezar** (display, her "Tehran signage" face) + **Vazirmatn** (text). Both embedded (`assets/fonts/`; Lalezar is OFL, fetched from Google Fonts,
the same file her site serves). The Farsi rules of the house still hold: RTL, no letter-spacing, Persian numerals, `‌` half-spaces, headlines animate **by word**.
The idea: her site opens on a **gate** (tennis | padel), so the reel is built on that split.

## The idea in one line
One ball plays one rally through the whole reel: it taps the two gate buttons («تنیس» «پدل»), smashes the badge so «یا» flips to «هر دو», dribbles along the
chalk while her name arrives, knocks a medal, lands on the photo card, rises with the blue to the years and the national-team badge, bounces between two phones that
show her **real site**, and lands on the link. Every bounce is a beat of a **100-BPM grid (0.6 s)**, so any 100-BPM track in Instagram lines up (120 BPM felt frantic).

## Pacing (the rule that made this cut)
A block of text needs **0.8 s + 0.25 s per word** fully visible (max 2.4 s), and a word the ball is sitting on counts as unread. The 17 s cut had 14 of its 33 text blocks under that
(the national-team title 0.5 s, the shortest 0.2 s). This cut: **25 blocks, 0 too fast, shortest clean hold 1.5 s**. To get there a fact was cut (the tagline «هر بازیکن، مسیر خودش» is no longer
in the name scene; it is still on both phones' hero) and two beats were merged (the national team now sits with the years), instead of speeding anything up.
The first slower render still had the ball dribbling on the badge right under «سال تنیس» and lobbing across the phone title; only the ball-aware audit showed it, so the ball now hops at the
end of the badge and volleys under the title.

## Scene map (26.0 s; every time is in the `T` table at the top of `src/scenes.js`)
| time | scene | what happens |
|---|---|---|
| 0.0–4.35 | **1 · The gate** | spruce over blue, her gate copy; ball taps both pills (0.8, 1.4 s); smash at 2.0 → badge flips «یا» → «هر دو»; the gate opens like doors (3.7–4.35) |
| 3.7–7.75 | **2 · The name** | «سلام، من» · **مهرانه ظهوریان** (words rise through masks) · «مربی تنیس و پدل · مشهد»; the ball dribbles ten low hops on a chalk line; wipes upward (7.2–7.75) |
| 7.2–17.25 | **3 · The record** | **A** (7.3–10.25) a medal drops on ribbons, rolls to «۱», swings when hit: «رنکینگ ۱ بانوان کشور» · **B** (9.8–13.75) the ITF runner-up photo, «زیر ۱۸ سال», «نایب‌قهرمانی تور جهانی» · **C** (13.4–17.0) the blue rises: ۱۳ سال تنیس / ۲ سال پدل, the «بازیکن تیم ملی» badge pops and the ball hops at its end |
| 16.6–22.35 | **4 · The site** | the seam turns a quarter; two phones (padel left, tennis right) fly in and scroll the **real** pages; «سایتم راه افتاد»; a label names each section as it passes («کارنامه», «کلاس‌ها و قیمت‌ها»); the ball volleys between the phone tops every 0.6 s and turns lime over the padel phone |
| 22.15–25.95 | **5 · The link** | the mark «م» · «آماده‌ای اولین جلسه رو بذاریم؟» (her site's own CTA line) · **mehranehzohourian.com** (the ball lands on the pill, confetti) · «لینک توی بیو» · her name and role; the ball leaves through the top at 25.4 where it enters at 0.4 (loop) |

## Copy-to-source table
`Content/reel-9-mehraneh/copy-lines.json` is the table; check it against her site with
`python .claude/skills/reel/tools/copy_audit.py Content/reel-9-mehraneh/copy-lines.json <mehraneh-site>/index.html --src Content/reel-9-mehraneh/src`.

**20 lines are on her site word for word:** «تنیس», «پدل», «یا», «از تازه‌کار تا مسابقه», «از صفر تا بازی توی زمین», «وارد شو», «سلام، من», «مهرانه», «ظهوریان»,
«رنکینگ», «بانوان کشور», «زیر ۱۸ سال», «نایب‌قهرمانی تور جهانی», «تنیس ITF», «بازیکن تیم ملی», «سال تنیس», «کارنامه», «کلاس‌ها و قیمت‌ها»,
«آماده‌ای اولین جلسه رو بذاریم؟», «مهرانه ظهوریان».

**5 lines are new, written for the video — Amir to read before it posts:**
| line | where | why / source |
|---|---|---|
| «هر دو» | 2.0 s, the badge | the answer to «تنیس یا پدل؟»; true: she coaches both (site `<meta description>`) |
| «مربی تنیس و پدل · مشهد» | name scene, end card | joins the site's `<title>` («مربی تنیس و پدل») and its eyebrow («مربی تنیس · مشهد») |
| «سال پدل» | under ۲ | the site says «۲ سال سابقه در پدل»; **no padel result is claimed anywhere** (her padel side leads with her tennis background) |
| «سایتم راه افتاد» | title over the phones | the announcement, in her voice (the site speaks in first person too) |
| «لینک توی بیو» | end card | the call to action; **the bio link must be set to https://mehranehzohourian.com before posting** |

No price, no phone number and no WhatsApp number is on screen (the phones show her real class page, small and moving). Gone since the 17 s cut: «هر بازیکن، مسیر خودش» (name scene),
«رده‌های سنی» and «بزرگسال» (the age chips).

## Checks (all clean on this cut)
```
node .claude/skills/reel/tools/read_audit.js Content/reel-9-mehraneh.html 0.1 --all   # 25 blocks, 0 too fast, shortest clean hold 1.5 s (the ball counts)
node .claude/skills/reel/tools/ball_audit.js Content/reel-9-mehraneh.html 0.05 --all  # 8 blocks touched, none covered longer than 0.3 s (the smash at 2.05 s on the badge, by design)
node .claude/skills/reel/tools/safe_audit.js Content/reel-9-mehraneh.html             # every visible text inside y 250-1580, x 60-1020 and outside the button rail
```
(Instagram's covered zones were measured on Amir's phone 2026-10-01: right-hand rail x 920–993, y 1171–1770.)

## Sound
No music (Amir adds it in Instagram, as for every reel). `export/mehraneh-site-reel-sfx.mp4` carries a **synthesized** effects layer built from the page's own
cue list: `export_sound.js` → `sound.json` → `make_sfx.py` (ball thocks come from the same list that moves the ball) → `mux_sfx.py`
(gentle compressor, -1.5 dBFS ceiling). It sits quietly (measured -18.7 LUFS, true peak -1.5 dBFS) on purpose. **It was never auditioned by ear** — listen before using it.

## How it is built (read before changing anything)
* The page is a **pure function of time**: `window.__render(t)` paints the frame for `t` seconds and nothing runs on timers.
  So `?t=5.2` shows any instant, the preview loops in real time, and the renderer can take several instants per frame.
* **Real motion blur**: `render_timeline.js` renders 20 sub-frames across a 180° shutter per output frame and ffmpeg averages them (`tmix`), then adds film grain.
  (A fast move needs enough sub-frames: 5 left visible ghost copies on the gate doors, 10 still layered the digit roll; 20 is smooth. A full 26 s render is about 6.5 min.)
* The phones show **live-site captures** (`tools/capture_site.js`: the real page, both skins, 390 px wide, in 3 tiles; stuck nav and sticky bar as overlays; the shared version is `capture_tiles.js`).
  If the site changes, recapture and rebuild — the choreography reads the section offsets from `SITE` in `scenes.js`.
* The ball: arcs solved from the apex height and arrival time (`prepLegs`), a 3-D felt ball with the real two-lobed seam curve, squash on impact, a comet trail, dust, rings, sparks.
* Words animate by **word** (Persian letters join); the ball and effects live on one canvas above the DOM scenes.
* The shared tools live in `.claude/skills/reel/tools/` (this folder keeps only the two scripts that are specific to her site).

## Rebuild
```
python .claude/skills/reel/tools/setup_tools.py                       # once per PC: node, ffmpeg, Edge, playwright-core
python src/prep_assets.py <captures dir> <mehraneh-site/media>        # WebP tiles + photo crops (after tools/capture_site.js); only if the site changed
python src/build_reel9.py                                             # -> Content/reel-9-mehraneh.html  (set PYTHONIOENCODING=utf-8 on this PC)
node .claude/skills/reel/tools/still.js Content/reel-9-mehraneh.html out 1.5 5.2 ...    # frozen frames; sheet.py tiles them
node .claude/skills/reel/tools/render_timeline.js Content/reel-9-mehraneh.html silent.mp4 --sub 20 --crf 18 --grain 4     # run it as a tracked background task
node .claude/skills/reel/tools/export_sound.js Content/reel-9-mehraneh.html sound.json && python .claude/skills/reel/tools/make_sfx.py sound.json sfx.wav
python .claude/skills/reel/tools/mux_sfx.py silent.mp4 sfx.wav export/mehraneh-site-reel-sfx.mp4
```
`render_timeline.js` writes the BT.709 tags into the stream, so the silent MP4 needs no extra step.

## Before it posts (for Amir and Mehraneh)
1. **Read the five new lines** (table above) — Farsi ships only after Amir has read it.
2. **Set the bio link** of `@mehraneh_zohourian` to `https://mehranehzohourian.com` (the reel says «لینک توی بیو»).
3. **Photos:** the runner-up photo comes from her site. If a photographer owns it, check the credit (the other trophy photo on her site is watermarked "Soheil Faraji").
   No other person's face is featured; the national-team and childhood photos were left out on purpose.
4. Pick the cover at about 1.3 s (`export/cover.png`): the gate with «تنیس یا پدل», no ball.
5. If she wants it nearer 20 s: drop a beat (the photo card, or the years), never speed the rest up.
