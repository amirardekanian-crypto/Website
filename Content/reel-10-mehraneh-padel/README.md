# Reel 10 — Mehraneh Zohourian's padel classes (35.4 s, Farsi, 1080×1920)

An Instagram ad for **her** account (`@mehraneh_zohourian`) that promotes her **padel classes** in Mashhad: a bit of her record, a lot of her playing padel.
Amir's brief (2026-10-21): she loved reel 9 (more tennis); this is its padel sibling, "dynamic, fun", using her three padel clips and the three venues.
His decisions: **no prices**, **the ask is a DM on Instagram**, **no venue name on the footage**, **no offer**.
Built on the timeline kit like reel 9 (`.claude/skills/reel/timeline/README.md`), plus her real footage as **plates**.

## The idea in one line
One lime ball plays one rally, and her **real** shots are part of it: her overhead opens the reel, the ball comes off the glass and smashes into **your** screen,
her name lands over her close-up, a court door swings back to her 13 years of tennis, a pink ball heading **out** is saved by a glass wall that shoots up
(that is padel to a tennis player, and her real path), her wide clip plays at 1x under the site's own bridge line, a giant padel racket sweeps in the classes,
the cards flip to where she teaches, and the ball presses the paper plane on her handle.

How it was decided: three agents analysed the clips frame by frame (hit frames from the audio pops, her face boxes, every logo and number in the background),
three concepts were written («همون توپ», «Your Side of the Net», «پشتمه»), two judges scored them (Instagram lens, craft lens), and this cut takes the
best of each: the screen smash and the one-ball rally (همون توپ), the big footage with punch-ins and the glass save (پشتمه), and the honest "tennis record + 2 years of padel" framing.
Dropped on purpose: a 15-30-40 score bug (it could read as a padel result), long freezes and 0.25x slow motion (they ghost on 30 fps phone footage).

## Scene map (every time is in the `T` table at the top of `src/scenes.js`)
| time | scene | what happens |
|---|---|---|
| 0.0–1.65 | **1 · Hook** | IMG_4633, her overhead: tight from frame 1 (1.5x) and punching in to 1.95x, a lime tracer on the real ball, contact f84 on the beat (0.6) with a 0.1 s hit-stop, ring, sparks and her real pop; the ball leaves right, the graphic ball takes it off the right glass and **hits your screen** at 1.2 (bloom, rays, rings, flash, shake) |
| 1.2–4.75 | **2 · Name** | IMG_4631 opens inside a circle from the impact; slowed 0.56x through her ready stance (from a **60 fps motion-interpolated plate**, so it stays sharp), 1x into the backhand (contact f76 at 4.2); glass card «مربی پدل · مشهد» · **مهرانه ظهوریان** (lime bar); the ball rests on the card's corner, leaves, and at 4.3 knocks the frame open like a **court door** (hinged right) |
| 4.3–11.95 | **3 · Behind me** | spruce tennis world (pink court, no walls): «۱۳» counts up, «سال تنیس پشتمه»; three cards slide in as the pink ball stamps their corners every 1.2 s: «رنکینگ ۱ بانوان کشور / تنیس» (digit reel 9→1), «نایب‌قهرمانی تور جهانی / تنیس ITF · رده‌ی زیر ۱۸ سال» (trophy draws), «بازیکن تیم ملی / رده‌های ۱۲، ۱۴ و ۱۶ سال و بزرگسال» (shield draws). At 11.4 the ball skims toward the right edge (out!) and a **glass wall slams up**: it rebounds lime, four panes thud in, blue floods from the glass, the cards are flung left |
| 11.3–20.8 | **4 · Padel now** | «۲ سال پدل» over a dim, blue-multiplied IMG_4633 (f10–f70, no ball in shot); a glass pane wipes in IMG_4630 at 1x (13.8): overhead 14.4, low backhand 16.25, overhead 19.23 (0.1 s hit-stop + punch); the bridge line builds in a glass card: «چیزهایی که توی پدل دیر جا می‌افتن» / «مثل والی، اسمش، حرکت پا و خوندن توپ» / «برای من از قبل جا افتاده‌ن» |
| 20.0–26.95 | **5 · Classes** | a giant lime, perforated padel racket sweeps right to left (the classes show in its wake), eases into the ball, **holds 0.15 s on the hit** (20.4) and leaves; behind the cards a dim blue-multiplied IMG_4630 (f84–f159, no ball); «از صفر تا / بازی توی زمین»; three glass cards with mini padel courts (coach + 1, coach + 2, a rally): «کلاس خصوصی / یک به یک», «کلاس نیمه‌خصوصی / دو نفر، یک مربی», «هیتینگ پارتنر / بدون درس · فقط بازی» |
| 26.7–31.45 | **6 · Where** | the cards flip away; «کجا تمرین می‌کنیم» (27.0); three rows 260 px apart with lime pins the ball lands on, head first: پدل هاب / سجاد · بوتیک پدل / هفت تیر · نارون پدل / مجموعه‌ی سوارکاری ارشاد (a list: no clip is labelled with a venue) |
| 31.0–35.4 | **7 · DM** | a lime seam rises and shoves the list up; her portrait (IMG_4631 ready stance, slow ping-pong) in a lime-rimmed glass panel, «مربی پدل · مشهد», «بهم دایرکت بده / تا شروع کنیم», the handle pill **@mehraneh_zohourian**; the ball presses the paper plane (32.4: it flies off left with a dashed trail), hops once and leaves up the left gutter (33.0), and a new plane springs into the socket so the DM icon is clear for the last 2 s; «بگو کجای شهری / و چه ساعتی وقت داری» |

## Footage (her own, 3 clips from Downloads, 2026-10-21)
| clip | used | how |
|---|---|---|
| IMG_4633 (wide, behind the net, 3.28 s) | f66–f99, f10–f70 | hook (punch-in 1.5→2.07x, hit-stop on f84); dim backdrop under «۲ سال پدل» |
| IMG_4631 (close, front-on, 2.96 s) | f20–f82, f28–f60 | name scene (0.56x then 1x); end-card portrait (0.5x ping-pong). Both slow stretches come from `assets/plates/4631i/` (f20–f63 interpolated to 60 fps with `ffmpeg minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`), drawn nearest-frame: blending neighbours made a double image. f11–f19 and f83–f89 (her hand over the QR) are **not used** |
| IMG_4630 (wide, behind the net, 6.28 s) | f5–f188, f84–f159 | the proof scene at 1x, 1.31→1.40x; dim backdrop under the classes and venues |
Plates: `assets/plates/<clip>/f_NNNNN.jpg` with the third parties **taken out** (tracked, her pixels matted so she stays sharp): in 4631 the «YASAMIN AZARI / architectural designer / phone» panel,
its QR and its line-art logo are **filled with the plain wall** (no blur smudge), two brand banners are blurred; in 4630 / 4633 the «…ub café» sign (it names a venue) is blurred, the green venue
logos are filled with the wall, placards and a sign are blurred, and a silhouette in the café (4630, f91–f127) is softened. The scripts and check sheets were made in a scratch folder (plates_work: `run.py <clip>` with `cfg<clip>.py`).
`assets/plates/raw<clip>/` are the untouched frames (dev only: `?raw=1`). Neither folder belongs in git (about 110 MB each set): rebuild them from the clips.
The plates are drawn by time (`drawClip`), never a `<video>`: at 1x the nearest frame, slower than 1x two neighbours blended. Grade: contrast 1.07, saturation 1.1.

## Copy-to-source (`copy-lines.json`; `copy_audit.py` against mehraneh-site/index.html)
**28 lines are on her site word for word** (the bridge sentence is split into its three clauses; «۱۳ سال تنیس پشتمه» is its clause without «چون»).
**3 lines are NEW, for Amir to read before it posts:**
| line | where | why |
|---|---|---|
| «۲ سال پدل» | 11.9 s | the site says «۲ سال سابقه در پدل» / «۲ سال بازی پدل»; reel 9 said «سال پدل» |
| «بهم دایرکت بده» | 31.35 s | the ask Amir chose (DM), in her first-person voice |
| «تا شروع کنیم» | 31.55 s | the second half of the same line |
No price, no phone number, no offer, no padel result. Her tennis record always carries «تنیس» / «تنیس ITF · رده‌ی زیر ۱۸ سال» so nothing reads as a padel result.

## Checks
```
node .claude/skills/reel/tools/read_audit.js Content/reel-10-mehraneh-padel/src/reel10.template.html 0.1    # 25 blocks, 0 too fast, shortest clean hold 2.6 s
node .claude/skills/reel/tools/ball_audit.js  Content/reel-10-mehraneh-padel/src/reel10.template.html 0.05   # 2 brief crossings, both after their block was read
node .claude/skills/reel/tools/safe_audit.js  Content/reel-10-mehraneh-padel/src/reel10.template.html        # all text in the safe box, none in the button rail
node Content/reel-10-mehraneh-padel/tools/face_audit.js Content/reel-10-mehraneh-padel/src/reel10.template.html  # the ball never touches her face (20 px margin)
```
After the first render a four-lens frame review (motion, Farsi copy, privacy, Instagram) with an adversarial check on every finding confirmed 27 problems and refuted 3. All were fixed in
this cut, the main ones: slowed footage double-exposed her face (now an interpolated plate), the lime bridge line was clipped by its card (52 px now), the architect's logo and a QR smudge
were still next to her face (now plain wall), the racket never read (now lime, eased in, held on the hit), the ball hovered above the pins, the ball covered the DM icon for 2.4 s, dust from
a graphic bounce floated on her footage, the shake showed the stage edges, waiting words leaked their dots out of their masks. The first render is kept as `export/*-v1*`.

## Sound
No music (she adds it in Instagram). The effects come from the page's cue list (`export_sound.js` → `make_sfx.py`), and **her five real racket pops**
are laid on the contact frames by `tools/mix_clip_audio.py` (from `assets/audio/<clip>.wav`); under the 1x proof stretch the clip's own sound plays as a bed (her pops and the
off-camera partner's shots, moved 45 ms so her pops sit on the contacts). Then `mux_sfx.py`. Beats sit on reel 9's 100 BPM grid where the footage allows.

## Rebuild
```
python .claude/skills/reel/tools/extract_plate.py <IMG_xxxx.MP4> Content/reel-10-mehraneh-padel/assets/plates/raw<xxxx> --width 1072 --quality 3   # then the blur pass (see plates notes)
PYTHONIOENCODING=utf-8 python Content/reel-10-mehraneh-padel/src/build_reel.py          # -> Content/reel-10-mehraneh-padel.html (plates load by relative path)
node .claude/skills/reel/tools/render_timeline.js Content/reel-10-mehraneh-padel/src/reel10.template.html export/silent.mp4 --sub 20 --crf 18 --grain 4
node .claude/skills/reel/tools/export_sound.js Content/reel-10-mehraneh-padel/src/reel10.template.html sound.json
python .claude/skills/reel/tools/make_sfx.py sound.json sfx.wav && python Content/reel-10-mehraneh-padel/tools/mix_clip_audio.py sound.json sfx.wav sfx-pops.wav
python .claude/skills/reel/tools/mux_sfx.py export/silent.mp4 sfx-pops.wav export/mehraneh-padel-reel-sfx.mp4
node .claude/skills/reel/tools/still.js Content/reel-10-mehraneh-padel/src/reel10.template.html export 3.5 --query noball=1     # the cover
```

## Before it posts (for Amir and Mehraneh)
1. **Read the three new lines** (table above).
2. Her DMs should be open to everyone (the ask is «بهم دایرکت بده»).
3. The footage shows her own kit (HEAD racket, shirt logos): fine, it's her gear. The clubs' signs and a stranger's ad are blurred out.
4. Cover: 3.5 s (her close-up with her name), `?noball=1` → `export/cover.png`.
5. A caption draft is in `export/caption.txt` (NEW copy: Amir reads it first).
