# Reel 8 · "16 Weeks" · the tennis course, in Farsi, on real footage

`Content/reel-8-course.html` is the reel: one self-contained file (about 3.5 MB), 20 seconds, silent, 1080x1920. This folder
holds everything it was made from, so it can be rebuilt, edited and exported again. Made 2026-09-20, the day after
[reel-7](../reel-7-course/README.md) ("Dawn to Floodlights", the 30 s version made of stills and a bouncing ball). Reel 8 is
the sharper cut: four generated video clips, a rail of 16 weeks, the real demo in a phone, the same free-week button.

## What was decided (Amir, 2026-09-20)

- **Farsi and silent**, like reel-7. The clips carry no sound on purpose (sound is off by default, see the `/video` skill);
  Amir adds music in Instagram.
- **Goal: try week 1 free.** It ends on the bio-link button's own words, and on the line «یه‌بار می‌خری، همیشه مالِ خودته.»
- **Two hooks, same reel.** A «۱۶ هفته تا بدنِ تنیسی.» is the default and the one he prefers. B «تو زمین: سریع‌تر. قوی‌تر. انفجاری‌تر.»
  is the test: open the file with `?hook=b`. Nothing else differs, so an Instagram test compares the hook and nothing more.
  B is Amir's pick from six options built from the /tennis/ page's own Farsi. It **replaced a first B** («تو باشگاه قوی‌ای. تو زمین؟»)
  that he said made no sense in Farsi at all (my invented wording): take hooks from the page, not from thin air.
- **The footage is AI-generated** (Higgsfield, 30.5 credits in all, see the ledger in `.claude/skills/video/SKILL.md`). It is
  atmosphere, not clients: no claim is laid over it, and the caption comment says to label the post if Instagram asks.
- Deliberately NOT used: the «یه مربی تو جیبت» outro (this course is self-guided), the price on screen, and any offline claim
  (reel-7's nuance line was cut, and a chip alone would overclaim).

## The idea

The reel is footage first, and the 16 weeks are a rail of 16 dashes at the top. The hook fills the rail as the number counts to 16.
Then each cut lights one block of four weeks in white: Develop (weeks 5-8) on the grip, Express (9-12) on the pivot, Transfer
(13-16) on the empty night court, and the block's own line sits over the picture. Block 1 (Build) has no clip on purpose: three
clips, three blocks, and the hook clip stands for all 16 weeks. A phone then shows three real screens of the free demo, and the
button ends it.

| Scene | Time | Clip | What happens |
|---|---|---|---|
| 0 Hook | 0-3.2 s | clay burst, first 3.0 s | «۱۶» counts up and lights the rail. «هفته تا بدنِ تنیسی.» (or B: «تو زمین:» then «سریع‌تر.» «قوی‌تر.» «انفجاری‌تر.» one word at a time, the rail filling in three steps). |
| 1 Develop | 3.2-5.1 s | chalked grip, first 1.55 s | Wipe from the right with a clay line. «بلوک ۲ · DEVELOP · هفته ۵ تا ۸», «قدرت می‌شه نیرو.» |
| 2 Express | 5.1-7.0 s | floodlit pivot, first 1.75 s | «بلوک ۳ · EXPRESS · هفته ۹ تا ۱۲», «نیرو می‌شه سرعت.» |
| 3 Transfer | 7.0-9.4 s | night court plate, 3.0 s | «بلوک ۴ · TRANSFER · هفته ۱۳ تا ۱۶», «می‌بریش تو زمین.» The plate stays behind the next two scenes. |
| 4 App | 9.4-15.0 s | (plate, blurred and dim) | «همه‌ش رو گوشیت.» The phone rises: session, test, lesson. The pills count 16, 7, 22. |
| 5 Button | 15.0-20.0 s | (plate, bright again) | «نسخه‌ی نمایشیِ دوره · بدونِ ثبت‌نام», the button, a tap and a ripple, «لینک تو بایو», the buy-once line, the brand row. |

Each clip is trimmed to the seconds worth using, and holds its last frame if the scene runs longer.

## The clips (where they came from, and what was cut)

| Clip | Made with | Used | Why that range |
|---|---|---|---|
| `burst` clay push-off, slow motion | Cinema Studio v2, job `371bb4ef`, 5 s with sound | 0-3.0 s, sound dropped | the foot leaves the frame at 3 s |
| `pivot` woman at night, floodlit | Kling 3.0, job `b4e56996`, 5 s with sound | 0-1.75 s, sound dropped | she runs to a dot after that |
| `gym` chalked grip on a trap bar | Cinema Studio v2, job `804a5c00`, 3 s silent | 0-1.55 s | **from 1.67 s a man bends into the frame: his face and a printed shirt logo break the no-face, no-logo rule** |
| `plate` empty night court, haze | Cinema Studio v2, job `0a334ef3`, 3 s silent, from the reel-7 night picture | 0-3.0 s | the whole clip |

`masters/` holds the trimmed clips at high quality (crf 14, 7 MB in all) and `assets/clip-*.mp4` the lean copies the reel embeds
(crf 24, 2.4 MB). **The untrimmed originals, their start pictures and their prompts are in `Content/video-archive/`** (ids
`clay-burst`, `floodlit-pivot`, `chalk-grip`, `night-court-plate`), and on Higgsfield under the job ids above.

## On-screen copy and where it comes from

Nothing is invented. The Farsi lines marked "draft" are Claude's wording for Amir to change.

| On screen | Source |
|---|---|
| «۱۶ هفته تا بدنِ تنیسی.» | /tennis/ hero heading (hook A) |
| «تو زمین: سریع‌تر. قوی‌تر. انفجاری‌تر.» | /tennis/ Level 2 description («می‌خواد تو زمین سریع‌تر، قوی‌تر و انفجاری‌تر بشه»), shortened (hook B) |
| بلوک ۲ پیشرفت (DEVELOP) هفته ۵ تا ۸ · بلوک ۳ انفجار (EXPRESS) ۹ تا ۱۲ · بلوک ۴ انتقال به زمین (TRANSFER) ۱۳ تا ۱۶ | The app's programme screen (4 blocks of 4 weeks); the tags carry the number, the English name and the weeks |
| «قدرت می‌شه نیرو.» / «نیرو می‌شه سرعت.» / «می‌بریش تو زمین.» | Shortened from the app's block descriptions (draft wording, as in reel-7) |
| «همه‌ش رو گوشیت.» | Draft (as in reel-7) |
| ۱۶ هفته برنامه · ۷ آزمون · ۲۲ درس | /tennis/ stats bar (the «۱۱۴ حرکت» pill of reel-7 was dropped for room) |
| «نسخه‌ی نمایشیِ دوره · بدونِ ثبت‌نام» | links.html, subtitle of the demo button |
| «هفته‌ی ۱ رو رایگان امتحان کن» | links.html, title of the demo button (verbatim, so people recognise it) |
| «یه‌بار می‌خری، همیشه مالِ خودته.» | /tennis/ price heading |
| «لینک تو بایو» | Draft |
| @amirardekanian | Design atlas (handle for new work) |

The phone shows the demo exactly as it is on 2026-09-20 evening, including its clay «نسخهٔ نمایشی» bar. The screens were
captured again for this reel because the course app got its cover pictures after reel-7's screens were taken.

## The Instagram caption

Copy-paste. Every fact is from the /tennis/ page, and the button name is the one on links.html. The first two lines carry the hook,
the free week and where the link is, because Instagram shows only two lines before "more". For hook B change line 1 to
«تو زمین: سریع‌تر. قوی‌تر. انفجاری‌تر.» and delete the sentence «برای کسی که تمرین می‌کنه...» (the hook already says it).

```
۱۶ هفته تا بدنِ تنیسی.
هفته‌ی ۱ رو رایگان امتحان کن. لینکش تو بایوی پیجمه.

سیستم آمادگی جسمانی تنیس، سطح ۲ (پیشرفته): برنامه‌ی کاملِ ۱۶ هفته‌ایِ بدنسازیِ تنیس، هفته‌به‌هفته رو گوشیت. برای کسی که تمرین می‌کنه و می‌خواد تو زمین سریع‌تر، قوی‌تر و انفجاری‌تر بشه.

۴ بلوک: پایه‌سازی، پیشرفت، انفجار، انتقال به زمین
هر هفته ۳ جلسه: ۲ جلسه تو باشگاه، ۱ جلسه تو زمین
۱۱۴ حرکت با نکته‌ی اجرا · ۲۲ درسِ کوتاه · ۷ تستِ ساده
بعد از اولین ورود، بدونِ اینترنت هم باز میشه.

بایو رو باز کن و روی «هفته‌ی ۱ رو رایگان امتحان کن» بزن. بدونِ ثبت‌نام.
یه‌بار می‌خری، همیشه مالِ خودته.
```

Optional hashtags: #تنیس #بدنسازی_تنیس #آمادگی_جسمانی #تمرین_تنیس #tennisfitness. When posting, switch on Instagram's AI label for the
footage if it asks (Amir's call).

## Folder map

```
Content/reel-8-course.html         the reel (built; never edit by hand, edit src/ and rebuild)
Content/reel-8-course/
  README.md                        this file
  src/reel8.template.html          the whole reel with %%PLACEHOLDERS%% instead of clips, screens and the font
  src/build_reel8.py               fills the placeholders -> ../reel-8-course.html
  src/prep_clips.py                trims the downloaded clips into masters/ and makes the lean copies in assets/
  masters/                         burst, pivot, gym, plate: the trimmed clips at high quality
  assets/                          clip-*.mp4 (lean, embedded), screens/*.webp (the real demo)
  tools/capture.config.json        the config that captures the demo screens
  export/                          the MP4s (git-ignored: regenerate with render_mp4.js)
```

Generic tools live in `.claude/skills/reel/tools/` (render, stills, frame sampling, screen capture, contact sheet).

## Rebuild, check, export

```
python Content/reel-8-course/src/prep_clips.py masters <folder-with-the-downloaded-clips>    only if you re-cut the masters
python Content/reel-8-course/src/prep_clips.py embeds                                        lean copies from the masters
node .claude/skills/reel/tools/capture_app_screens.js Content/reel-8-course/tools/capture.config.json %TEMP%\r8
python Content/reel-7-course/src/to_webp.py %TEMP%\r8 Content/reel-8-course/assets/screens   the demo screens
python Content/reel-8-course/src/build_reel8.py                                              writes Content/reel-8-course.html
node .claude/skills/reel/tools/render_mp4.js Content/reel-8-course.html Content/reel-8-course/export/reel-8-course-hookA.mp4 --seconds 20 --crf 16
node .claude/skills/reel/tools/render_mp4.js Content/reel-8-course.html Content/reel-8-course/export/reel-8-course-hookB.mp4 --seconds 20 --crf 16 --query hook=b
```

URL modes: default plays and loops; `?beat=N` freezes scene N (for scene 4 add `&sub=0..2`); `?capture=1` is the clean frame;
`?hook=b` is the B hook. Check with `still_beats.js` (`"0&hook=b"` for hook B) and `sample_frames.js`.

## How the video is played (the part that is new)

- The clips are `<video muted playsinline>` elements in the world layer, each in a `.plate` that wipes in from the right.
  Their bytes are base64 in the file, so the reel stays self-contained (3.5 MB).
- **Real time:** `setScene(i)` seeks the scene's clip to 0 and plays it. A clip ends on its last frame and stays there.
- **Stills:** `?beat=N` seeks every clip to a chosen frame (`still` in the `CLIPS` table).
- **MP4 export:** `render_mp4.js` freezes the page clock, and a `<video>` does not obey it. So the renderer sets
  `window.__renderMode` before the page loads (the page then plays nothing) and, after every frame step, calls
  `window.__videoAt(V)`. The page seeks each clip to the frame that belongs at `V` ms, and resolves when the seeks have landed.
  The clips are 24 fps and the MP4 is 30 fps, so every fourth source frame is shown twice.

## If you change something

- **A clip:** re-run `prep_clips.py`, then set that clip's `len` and `still` in the `CLIPS` table in the template, and the
  scene's `data-dur`. If a scene gets longer than its clip, the clip holds its last frame.
- **Words:** they are plain text in the template. Farsi rules: no letter-spacing, `&zwnj;` for the half-space, Persian digits,
  counters `direction:ltr`, headings never uppercase. Check every claim against the source column above.
- **Timing:** each scene's `data-dur` is in the markup, and the phone's sub-timeline is in `sceneApp()`. If the total changes,
  pass `--seconds` to `render_mp4.js` (it is 20 now).
- **The demo screens** go stale if the app changes. Re-run the capture.
- **Class names:** the video plates are `.pl0` to `.pl3`, and the pills are `.p1` to `.p3`. They were the same names once,
  and the plate rules blurred a pill. Keep each family of elements to its own prefix.
