# Reel 7 · "Dawn to Floodlights" · the tennis course, in Farsi

`Content/reel-7-course.html` is the reel: one self-contained file, about 30 seconds, silent, 1080x1920. This folder
holds everything it was made from, so it can be rebuilt, edited and exported again. Made 2026-09-20. Amir's reaction
when he saw it: "incredible".

## What was decided (Amir, 2026-09-20)

- **Farsi**, on purpose: the course app, its price and the WhatsApp buying are all Farsi and Iran-only. This is the
  one reel that breaks the 2026-07-02 "English-only social" rule, and he chose it.
- **Goal: try week 1 free.** The reel ends on the button that is on his links page, word for word.
- **Animation only.** No voice, no face. He adds audio in Instagram.
- **Hook C:** no question. It opens straight on «۱۶ هفته تا بدنِ تنیسی.»
- **Yes** to the line under the button, «یه‌بار می‌خری، همیشه مالِ خودته.»
- Deliberately NOT used: the «یه مربی تو جیبت» outro (it promises personal coaching, and this course is self-guided)
  and the $17 price (the ask is the free demo; the price is one tap away on the page).

## The idea

One court, one day. The reel opens on the empty court at first light (picture 1) and ends on the same court at night,
the clay marked by work (picture 2). Between them the 16 weeks are told as one day: a clay ball hops along the white
baseline, one hop per block, higher each time, lighting the 16 week marks painted on the line. The four block
pictures from the app play as 16:9 windows. Then a phone shows four real screens of the free demo, and the ball
drops onto the button.

| Scene | Time | What happens |
|---|---|---|
| 0 Opening | 0-5 s | Ball drops on the baseline, dust. ۱۶ counts up while the marks light. «هفته تا بدنِ تنیسی.» |
| 1-4 Blocks | 5-17 s | Build, Develop, Express, Transfer, 3 s each. Window wipe from the right, ball hop, arcs, marks. Day fades to night. |
| 5 App | 17-25 s | Ball rolls off. Phone rises. Session, step player, test (coin ping), lesson, offline. Counters 16, 114, 7, 22. |
| 6 Button | 25-30 s | Ball drops on the button, ripple, breathing glow. «لینک تو بایو», the buy-once line, brand row. |

## On-screen copy and where it comes from

Nothing is invented. The Farsi lines marked "draft" are Claude's wording for Amir to change.

| On screen | Source |
|---|---|
| «دوره‌ی خودآموز · سطح ۲ · پیشرفته» | /tennis/ hero kicker |
| «۱۶ هفته تا بدنِ تنیسی.» | /tennis/ hero heading |
| «سیستم آمادگی جسمانی تنیس» | /tennis/ hero name |
| بلوک ۱ پایه‌سازی (Build) هفته ۱ تا ۴, ۲ پیشرفت (Develop) ۵ تا ۸, ۳ انفجار (Express) ۹ تا ۱۲, ۴ انتقال به زمین (Transfer) ۱۳ تا ۱۶ | The app's programme screen (4 blocks of 4 weeks) |
| «یاد می‌گیری. پایه می‌سازی.» / «قدرت می‌شه نیرو.» / «نیرو می‌شه سرعت.» / «می‌بریش تو زمین.» | Shortened from the app's four block descriptions (draft wording) |
| «همه‌ش رو گوشیت.» | Draft |
| ۱۶ هفته برنامه · ۱۱۴ حرکت · ۷ آزمون · ۲۲ درس | /tennis/ stats bar |
| «بعد از اولین ورود، آفلاین هم کار می‌کنه.» | /tennis/ FAQ: offline after the first sign-in (keep that nuance) |
| «نسخه‌ی نمایشیِ دوره · بدونِ ثبت‌نام» | links.html, subtitle of the demo button |
| «هفته‌ی ۱ رو رایگان امتحان کن» | links.html, title of the demo button (verbatim, so people recognise it) |
| «یه‌بار می‌خری، همیشه مالِ خودته.» | /tennis/ price heading |
| «لینک تو بایو» | Draft |
| @amirardekanian | Design atlas (handle for new work) |

The phone shows the demo exactly as it is, including its clay «نسخهٔ نمایشی» bar. That is honest: the CTA is the demo.

## Folder map

```
Content/reel-7-course.html         the reel (built; never edit by hand, edit src/ and rebuild)
Content/reel-7-course/
  README.md                        this file
  plan-board.html                  the plan board Amir approved (also an Artifact, see below)
  src/reel7.template.html          the whole reel with %%PLACEHOLDERS%% instead of pictures and the font
  src/build_reel7.py               fills the placeholders -> ../reel-7-course.html
  src/prep_bg.py                   grades + upscales the two masters, measures the baseline
  src/prep_ball.py                 cuts the ball out of assets/img/tennis-ball-clay.png
  src/to_webp.py                   PNG screenshots -> lossless WebP
  masters/day-one.webp             Higgsfield master 1 (lossless copy of hf_20260920_190741_...png, 752x1344)
  masters/week-sixteen.webp        Higgsfield master 2 (hf_20260920_190933_...png)
  assets/                          bg-day, bg-night, ball, baseline.json, baseline-check.png, screens/*.webp
  tools/capture.config.json        the config that captures the demo screens
  export/                          the MP4 and the cover frame (git-ignored: regenerate with render_mp4.js)
```

Generic tools (render, stills, frame sampling, screen capture, contact sheet) live in `.claude/skills/reel/tools/`.

## Rebuild, check, export

```
python Content/reel-7-course/src/prep_bg.py            graded backgrounds + baseline numbers
python Content/reel-7-course/src/prep_ball.py          the ball
node .claude/skills/reel/tools/capture_app_screens.js Content/reel-7-course/tools/capture.config.json %TEMP%\r7
python Content/reel-7-course/src/to_webp.py %TEMP%\r7  the demo screens
python Content/reel-7-course/src/build_reel7.py        writes Content/reel-7-course.html
```

Rebuilding from these files gives the same file, byte for byte (checked on the day it was saved).
Check it with `still_beats.js`, `sample_frames.js` and export with `render_mp4.js` (see `.claude/skills/reel/tools/README.md`).
URL modes: default plays and loops; `?beat=N` freezes scene N (for scene 5 add `&sub=0..4`); `?capture=1` is the clean frame.

## If you change something

- **A picture:** run `prep_bg.py` and read the printed baseline. The ticks, arcs and ball are registered on the white
  line, so copy the new `m` and `b` into `G` in `reel7.template.html` (`X0` and `X16` are the first and last mark).
  The dots in `assets/baseline-check.png` must sit on the white line.
- **Words:** they are plain text in the template. Farsi rules: no letter-spacing, `&zwnj;` for the half-space, Persian
  digits, counters `direction:ltr`, headings never uppercase. Check every claim against the source column above.
- **A number** (16, 114, 22, 7): it is in the pills and in the caption comment at the top; the source is the /tennis/
  stats bar. If the course changes, change both.
- **Timing:** each scene's `data-dur` is in the markup, and the phone's sub-timeline is in `sceneApp()`. If the total
  changes, pass `--seconds` to `render_mp4.js`.
- The demo screens go stale if the app changes. Re-run the capture.

## Where else it is written down

- The plan board (storyboard, animations, both pictures, decisions): https://claude.ai/artifact/JLFwGd1mhmRivsBPpH7mQo
- The technique and the lessons: `.claude/skills/reel/SKILL.md` (Steps 2b, 4b, 6, 7, 9 and 10) and `Content/DESIGN-ATLAS.md`.
