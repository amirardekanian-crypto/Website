---
name: video
description: Generate video clips (footage) for Amir's brand ads with the connected Higgsfield MCP — the start-picture-then-clip pipeline, the 3-second rule, prompt craft for a locked camera, the price list, judging a clip without ears, trimming, and how a clip goes into a reel. Use whenever Amir asks for footage, a clip, b-roll, a video plate, "real video" in an ad, or to animate a picture. Read it before writing a single prompt.
---

# Generating video clips — AA Performance

Claude generates, downloads, judges and trims clips itself through the Higgsfield MCP (first used
2026-09-20: two test clips for a second course reel). This file is the craft and the price list.
It is the sister of **`/image`**: a clip *starts from a picture*, so the look, the palette and the
"no text, no logos, no yellow" rules live in `.claude/skills/image/SKILL.md` — read that first. The
HTML reel a clip goes into is **`/reel`**.

The whole job in one line: **a picture (1-3 credits) → a 3-second clip (4.5-6) → look at it with
`clip_check.py` → trim to the good part → write it in the ledger.**

## ⚠️ Standing rules

1. **Do not generate unless Amir asked for THIS run.** The pot is shared with his own generations
   in the Higgsfield app, and a clip costs 4.5-12.5 credits, five to ten times a picture. Plan it,
   prompt it, preflight with `get_cost: true` (free, single calls only), quote him the number, and
   wait for "go". Never generate "a few options to see".
2. **Ask for 3 seconds, never 5.** Both test clips used only their first 2-3 s (see the log), and
   3 s is the minimum on both models and ~40% cheaper. Amir on the 5 s pivot: *"a bit too long"*.
3. **You cannot hear the sound.** Measure it (mean and peak dB, below), say what the prompt asked
   for, and let him judge by ear. Never write "the audio sounds great".
4. **Generated footage is atmosphere, never evidence.** It shows an invented athlete: no "my
   client", no before/after, no result claim laid over it. Instagram asks creators to label
   realistic AI-made video (an AI-label setting when posting). Tell Amir when a reel contains it;
   whether and how he labels is his call. Never write copy that hides it.
5. **Faces stay turned away** and nothing carries text, numbers or a logo (shoes and shirts have
   them: check). Same palette rules as `/image`: clay `#C7552F` is the only saturated colour, no
   yellow, no gold.

## Step 1 — before you touch the tools

1. **`git status --short`**, and read the **ledger** at the bottom: a start picture or a clip may
   already exist. Two sessions once generated the same 12 covers in the same minute.
2. **Decide the beat**: what this clip shows, how many seconds it will be on screen (usually
   1.5-3), what words land over it (keep the **top 40% calm**), and what sits either side of it
   (two clips in a row should differ in distance or subject). Decide the seconds *before*
   generating; it is what you are buying.
3. **`balance`**, then quote him the total: start picture(s) + clip(s).

## Step 2 — the start picture

Always image-to-video (text-to-video is untried). The start picture fixes the composition, the
palette and the athlete, and the clip inherits all of it, which is what keeps footage on brand:
both tests opened on exactly their start picture.

- **From a still that already exists** (`assets/tps/`, `assets/art/`, a Reel master): they are
  16:9 or square, so recompose to vertical. Upload it (`media_upload` returns presigned URLs → PUT
  the bytes with curl → `media_confirm`; the tests converted the `.webp` to `.jpg` first, so raw
  webp is untried), then:
  ```
  generate_image  { model: "gpt_image_2_5", aspect_ratio: "9:16", quality: "high", resolution: "2k",
                    medias: [{ value: "<media id>", role: "image_references" }],
                    prompt: "<the scene, recomposed vertically: subject big and mid-frame, room to move,
                             top 40% dark and calm, palette guard, avoid list>" }
  ```
  The tests used `high`/`2k` (3 credits). **`medium`/`1k` (1 credit) was not tried as a start
  frame** and very likely does, since the clip comes out 720 px wide. Try it next time, log it.
- **Or a fresh picture** made per `/image`. Same settings, no `image_references`.
- **Composition decides the clip.** The subject big and mid-frame (a locked camera cannot follow
  it), the ground and the light readable, nothing important at the frame edge (the burst's foot
  left the frame and the clip emptied), the top 40% calm, no ball.
- **Open the picture (Read) before paying to animate it.** A weak frame makes a weak clip.
- **Reuse without downloading:** pass the picture's *job id* as the media `value` below.

## Step 3 — prompt the clip (300-500 characters)

1. **`Static locked-off camera.`** Both tests held perfectly still. Camera moves are untried.
2. **ONE action**, present tense, happening **in place or across the frame**. ⚠️ **Never toward or
   away from the lens.** The pivot prompt said *"explodes into a fast sprint toward the far
   baseline"* and she was a dot by 2.5 s with nothing left in the frame. A push-off, a split-step,
   a grip, a lunge, a landing keep the subject big.
3. **What the air does**: dust, chalk, haze. The clay dust hanging in the light *was* the burst clip.
4. **The guard**: *"Realistic natural physics, no morphing, no extra limbs, face never visible."*
5. **One `Sound:` line** naming 2-3 concrete sounds. Both models mix native audio from it; how
   closely it follows the prompt is unverified by ear.

The one that worked (Cinema Studio v2, `speedramp: "slowmo"`), as a template:

> Slow motion. The player's white shoe drives off the red clay and a burst of red dust explodes
> forward and up, drifting through the warm light. Camera locked and low, no camera movement.
> Realistic, natural physics. The sound of a shoe pushing off clay and a soft dust burst.

Action is **front-loaded**: the model spends itself in the first ~2 s and the rest of a 5 s clip
empties. That is why the answer is 3 s.

## Step 4 — model, settings, price

| Model | Settings | 3 s | 5 s | Use it for |
|---|---|---|---|---|
| `cinematic_studio_video_v2` | `mode: "std"`, `speedramp: "slowmo"` (or `"impact"`), `sound: "on"` | **4.5** | 7.5 | one heroic slow beat: a push-off, an impact, a landing |
| `kling3_0` | `mode: "std"`, `sound: "on"` | **6** | 10 | natural-speed athletic movement (the pivot) |
| `kling3_0` | `mode: "std"`, `sound: "off"` | – | 7.5 | a silent plate |
| `kling3_0` | `mode: "pro"`, `sound: "on"` | 7.5 | 12.5 | only if std morphs the limbs |
| `kling3_0` | `mode: "4k"` | – | 30 | not for a reel |
| `veo3` (`variant: "veo-3-fast"`) | | – | – | untried; 22 at its default length |
| `seedance_2_5` | `resolution: "720p"`, `generate_audio: true` | – | 35 | untried |

All prices are 2026-09-20. Re-preflight; they change. Sound costs about a third more on Kling
(7.5 → 10 for 5 s) and is cheap enough to leave on when the clip's own sound will be used.

Every clip so far came back **720×1276, 24 fps, H.264 + AAC stereo 44.1 kHz** and opened on its
start picture. A 1080-wide reel scales that 1.5×, so expect it soft: give video plates the same
unsharp + fine grain the reel pictures get (`Content/reel-7-course/src/prep_bg.py`). `upscale_video`
(bytedance / topaz) exists and has **no cost preflight**: untried, so quote the price as unknown.

```
generate_video  { model, prompt, duration: 3, aspect_ratio: "9:16", mode, sound, speedramp?,
                  medias: [{ value: "<start picture job id or media id>", role: "start_image" }] }
```
- **`aspect_ratio` is always explicit**, `use_unlim` is never set, `duration: 3`.
- `generate_video_batch` takes `requests: [{ index, params }]` and has **no `get_cost`**, so
  preflight each as a single call first. A two-item batch submitted one job and returned
  `submission_failed` for the other (see the preset note in Step 5); the retry went through.

## Step 5 — generate and fetch

```
ToolSearch "select:mcp__<higgsfield>__generate_video,mcp__<higgsfield>__generate_image,mcp__<higgsfield>__jobs_wait,mcp__<higgsfield>__balance,mcp__<higgsfield>__media_upload,mcp__<higgsfield>__media_confirm"
```
`<higgsfield>` was `9848bc9c-ae34-4762-b153-8d1fb4170f25` on 2026-09-20; it changes if Amir reconnects.

- `jobs_wait { jobs: [{ index, job_id }], timeout_seconds: 15 }` long-polls: call it again until
  the job is `completed`. A 5 s clip took about two minutes, a batch of two start pictures about 30 s.
- The result is a plain CloudFront URL, no auth: `curl -sS -o clip.mp4 "<result url>"`.
- ⚠️ A submission can come back **`submission_failed` with a recommended preset** (it happened on
  the night scene, preset «IN THE DARK»). Resubmit the identical params plus
  `declined_preset_id: "<that preset id>"` to get a plain generation.
- ⚠️ **Never resubmit after a transport timeout**: the job may exist. Reuse its id.
- `balance` again afterwards and write the difference in the ledger.

## Step 6 — judge it (without ears)

```bash
python .claude/skills/video/tools/clip_check.py clip.mp4 --out sheet.png
```
(Needs ffmpeg: `python -m pip install --user imageio-ffmpeg`, see `[[reference-edge-playwright-on-amirs-pc]]`;
on his PC set `FFMPEG` to `%APPDATA%\Python\Python314\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe`.)

It prints the facts, the audio mean and peak in dB, the motion per half second and a suggested
cut, and writes a labelled contact sheet with one frame per half second. **Open the sheet with
Read** and check:

- **The first frame is the start picture**, and the light did not drift (no yellow, no blue).
- **When the subject leaves the frame or shrinks**: that is the trim point. The tool's suggestion
  is the *outer* bound: by eye the good part ended 0.5-1 s earlier both times (3.0 s against 3.5,
  1.75 s against 2.0).
- **Faces**: visible at any moment? A head in profile at 0.5 s is small enough to pass; a face is not.
- **Morphing**: hands, racket, feet, a third leg. Logos or letters appearing on shoes and clothing.
- **The last frame**: empty? Then the clip is too long.
- **Audio**: the two tests measured mean −33.6 / −32.8 dB with peaks at −3.7 / −7.0 dB: a quiet
  bed and a few sharp hits, no music. It sits under the music he adds in Instagram; do not boost it.

Give him the frames and the numbers, not an opinion about the sound.

## Step 7 — trim and save

```bash
python .claude/skills/video/tools/clip_check.py clip.mp4 --trim 3.0 --to Content/<reel>/clips/<name>.mp4
```
Writes a copy cut to that length, 0.25 s audio fade-out, H.264 crf 16, AAC. Keep the **original**
too (it cost credits and a different cut may be wanted): `Content/<reel>/clips/`, tracked in git
(3-5 MB each). Then add the ledger row below. Send Amir the trimmed clip with `SendUserFile`.

## Step 8 — into a reel (PLAN: not built yet — rewrite this when the first reel needs it)

- A clip is a **plate**: a full-bleed `<video muted playsinline>` under the type, embedded as
  base64 like every other asset (the reel stays self-contained). Embed a lean copy: 720p, no audio,
  crf ~24 (a 2 s clip is roughly 0.5 MB, +33% as base64).
- ⚠️ `render_mp4.js` steps a **fake clock**, so a `<video>` will not advance on its own. Per frame it
  must set `video.currentTime = frameTime − sceneStart` and wait for `seeked` before the
  screenshot. Build that in the first reel that uses a clip and test it on one clip first.
- ⚠️ The renderer writes **no audio**. Mix afterwards with ffmpeg: each trimmed clip's audio
  delayed to its scene start (`adelay`), `amix` with `normalize=0`, short fades, then mux with
  `-c:v copy -c:a aac`. Amir adds music in Instagram, so leave the clip sound as found.
- Cuts between a clip and a still plate (`bg-*.webp`) can jump in brightness: check the seam, and
  put the same grain over both.

## Not tried yet (so do not claim it works)

Text-to-video · camera moves · `multi_shots` · people's faces · two subjects · a ball in flight ·
Veo 3 · Seedance · `motion_control` · `upscale_video` · `reframe` · `virality_predictor` (needs the
finished reel uploaded). **`generate_audio` is speech only: Higgsfield makes no music and no sound
effects**; a clip's sound comes only from `sound: "on"`.

## Money

`balance` before and after every generation and the difference in the ledger. If the number is off,
`transactions`: his own spends show as −1 GPT Image lines in batches of 4, which is how ~55 credits
disappeared in one session. Tell him when a budget you quoted no longer holds.

---

## Learned the hard way — append here

Add a dated line whenever a round teaches something. This section is the reason the skill exists.

- **2026-09-20** — 5 s is too long. Burst: the foot leaves the frame at ~3 s and the last 1.5 s is
  drifting dust. Pivot: the subject ran to a dot by 2.5 s. Both had 2-3 s of use. Amir on the pivot:
  *"a bit too long"*. Request 3 s and trim.
- **2026-09-20** — The action is front-loaded, so the trim is almost always from the END.
- **2026-09-20** — Do not prompt travel toward or away from a locked camera; the subject shrinks or
  grows out of the shot. Prompt something in place or across the frame.
- **2026-09-20** — The start picture matters more than the prompt: the clip opens on it exactly and
  inherits its palette, so on-brand footage needs no extra grading pass.
- **2026-09-20** — Cinema Studio v2 with `speedramp: "slowmo"` gave the best hero beat (the dust);
  Kling 3.0 gave natural-speed athletic motion. Different subjects, so this is not a fair race.
- **2026-09-20** — Sound is a quiet bed (mean about −33 dB) with sparse peaks. I cannot hear it.
- **2026-09-20** — The pot is shared with Amir's own generations; one session's balance fell by ~55
  credits that were not mine. `get_cost` is free; a batch has none.
- **2026-09-20** — A batch item can fail with a recommended preset; retry with `declined_preset_id`.

## Ledger — what already exists in the Higgsfield account

Job ids can be passed straight to `medias[].value`; nothing needs downloading and re-uploading.
Sources are `assets/tps/<name>.webp` (course-app banners) converted to `.jpg` for upload.

| Date | What | Made from / with | Credits | Job id | Verdict |
|---|---|---|---|---|---|
| 2026-09-20 | Start picture "burst": white shoe pushing off red clay, dust, low camera | `full-acceleration`, `gpt_image_2_5` high/2k, upload `c02c164f-3381-4ac6-b8f1-e602c8247d57` | 3 | `6de014d5-3bff-4738-83e0-8da2d61c458f` | good |
| 2026-09-20 | Start picture "pivot": woman from behind, mid split-step, floodlit night court | `under-lights`, `gpt_image_2_5` high/2k, upload `23b2b80b-0449-4b07-b732-db7e3ad80bd0` | 3 | `6fdcfb40-7ea2-4989-b173-9f004988c2fb` | good |
| 2026-09-20 | Clip "clay burst", 5 s | Cinema Studio v2 std, slowmo, sound on | 7.5 | `371bb4ef-83ec-4786-ba24-3687ce406b2e` | use **0-3.0 s** |
| 2026-09-20 | Clip "floodlit pivot", 5 s | Kling 3.0 std, sound on | 10 | `b4e56996-df20-4ec1-bb28-5c10ff49203f` | use **0-1.75 s**; she runs away |

Not yet generated: a start picture from `first-light` (chalked hands on a trap bar, window light,
a clay-orange towel) for a dawn strength beat. The two test clips are also in Amir's Higgsfield
history; the local copies were scratch files and are not in the repo.
