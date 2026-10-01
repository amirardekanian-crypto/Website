---
name: cut
description: Edit one of Amir's talking-head reels for Instagram. Cuts silences, changes pace (faster, punchier, slower), adds cut-ins, transitions and (mostly) motion graphics over his clean footage, built in Hyperframes and rendered to one finished MP4. No captions, Amir adds those himself. Use when Amir drops or points at a raw talking-head clip, or says "edit this reel", "cut this", "tighten this", "add motion graphics", "make this ready for Instagram". Also use it to continue the reel kit (new motion-graphics ideas shown as showreels on his footage): read kit/HANDOFF.md first. Not for ads built from scratch (/ad), HTML-only reels (/reel) or generated clips (/video).
---

# /cut: talking-head reels, finished for Instagram

Amir films himself talking to camera, in Farsi. He is **not an editor** and handed the whole edit to Claude on
2026-10-01: pick the look, the pace and the tools, and show him a finished reel to react to. He adds the
**captions himself** afterwards, so this skill never makes captions.

A finished reel is his footage, tightened (silences cut, pace changed where it helps), with **cut-ins**
(punch-ins), **transitions** and, mostly, **motion graphics** that show what he is saying. One MP4, 1080x1920, 30 fps.

## Two ways to use this skill
1. **A real clip** (he drops a raw talking-head video): follow the Workflow below, steps 1-11.
2. **Idea generation** (the way most of this skill was built, 2026-10-01): he says "go" for a family of ideas, you build the blocks, render a
   **showreel** on his own footage (HCTV3230) and send it; he reacts by number ("29 is the best", "33 and 35 i dont like"). **He is not editing
   those videos: they are a menu of ideas.** Start at `kit/HANDOFF.md` (where things stand, paths, commands, traps, what to say in a new chat),
   then `kit/USAGE.md` (his taste and bench) and `kit/BLOCKS.md` (every block).

## Rules
**Creative freedom (Amir, 2026-10-01: "you don't have to obey design rules if you think something is more
creative").** The look below is the default and the safe choice. Break it on purpose when a reel is better for it,
and say so in the plan. What does not bend: no captions, the top band stays free for his captions, graphics restate
only his words, and nothing is uploaded or paid for without a yes.

- **You are his creative director** (Amir, 2026-10-01 evening: "based on the content of reels, you need to think what visual is best and whats needed, then have a look at the
  list, maybe something can be used, so use it. if you need anything, create it, and add it to the list"). **First read his list, the Motion Menu artifact, which this skill is connected to** (`kit/MENU.md` section 1: `Artifact read`, `ArtifactData list` on `marks` and `adds`, then
  `python tools/menu_read.py ...`): Keep = use first, Maybe = ask, Drop = never, his rename is the name, his note is an instruction, an idea he added is a request. Say "menu 41" vs "showreel 41": the numbers clash.
  For every beat ask what the viewer has to SEE, look it up in the **cue table at the top of `kit/BLOCKS.md`** (what he says, which block) and in the menu (78 cards, each with a When and a How), and use what fits (`python tools/menu_find.py <word>` finds a card fast).
  Suggest unasked: something with a curve (force over time, fatigue, adaptation)
  gets `K.curve`; a place in the body gets `K.bodymap`. Put a diagram, chapter label or list ON his own video when the text fits (he prefers 43 and 47 to the cards). Nothing
  on the list fits? Build it, test it on his footage, **add it to his Motion Menu** (`kit/MENU.md` section 2: a card in `menu/menu.json` in the group that does the same job, a sample clip, the next number, patch and publish the page; plus a `BLOCKS.md` row, a cue-table line and a showreel demo)
  and mark it NEW in the plan. `kit/USAGE.md` rules 7-9.
- **No captions, subtitles or spoken words as text.** Keep the top band y 230-470 clear for his captions (his
  own sit near y 300: a pill that follows the spoken word).
- **Graphics only restate what he says.** No new numbers, claims or results. Whisper mishears Farsi (on his own
  clip it heard تمرین as تمنی and تخفیف as دست تقفه), so **every number or key term that goes on screen is listed
  in the plan for him to confirm.**
- **Default palette: clay `#C7552F` is the one accent** (clay-2 `#E06B43` on dark, brand green `#0E4A36` for plates). No yellow,
  gold, ochre or amber anywhere. Some Hyperframes palettes and templates are yellow (the `craft` theme,
  "Biennale Yellow"): recolour them. AA Proof's own violet only on reels about AA Proof.
- **Farsi on screen:** Vazirmatn (copy `assets/fonts/Vazirmatn-Variable.woff2` from the repo into the project's
  `fonts/`), RTL, no uppercase, no letter-spacing, Persian digits, `&zwnj;` for the half-space, counters
  `direction:ltr`. **Animate by word, never by letter** (cursive letters do not type). Latin only for
  @amirardekanian (Barlow). Show him any Farsi on screen before it ships. **Silent-failure guards** (research 2026-10-01): never `dir` on `<html>` (previews fine, renders a blank video; keep
  `lang="fa"` there and `direction:rtl` on a wrapper); `letter-spacing:0` and `text-transform:none` always; a Latin word or a number between Persian words goes in one `unicode-bidi:isolate` unit; Vazirmatn
  stays a local `@font-face` (the Google Fonts fallback fails on cloud renders). **Hyperframes registry blocks that split by letter are banned for Farsi:** `bottom-up-letters`, `top-down-letters`,
  `char-slam-explode`, `scramble-reveal`, `variable-font-flex`, `weight-wave`, `typewriter`, `matrix-decode`, `kinetic-chars`, `tracking-in` and `per-word-rise` in `char` mode. Word-level and fine:
  `headline-slam`, `per-word-rise` (`split=word`), `staggered-fade-up`, `blur-in`.
- **Default: keep his face clear** (the behind-you reveal is the deliberate exception). Overlays go on the chest and desk zone (about y 1100-1500) or beside him. For something
  big, cut away to a full-screen graphic with his voice running underneath. Look at a frame every time.
- **Safe zone, MEASURED on his phone (2026-10-01; `RESEARCH-2026-10-01.md` section 14.9).** He opened `tools/safezone_card.py`'s test card on his iPhone (a 19.5:9 screen) and sent a screenshot; `tools/phone_measure.py` aligned it to the card (correlation 0.98) and listed every pixel Instagram's interface changed. In 1080x1920 card px: **nothing is covered from y 195 to y 1165 anywhere across the width**; the status bar, back arrow and camera cover y 0-190; **the like, comment, repost and share buttons, the menu and the audio thumbnail cover x 920-993, y 1171-1770**; the profile picture, name and caption cover **everything below y 1587** on the left; and the picture is scaled to FILL the screen, so **52-54 px are cropped off EACH side**. His caption band y 230-470 is clear. Meta's ad figures (14% top, 35% bottom, 6% sides: free box x 65-1015, y 269-1248) are far more cautious than a normal reel needs: **our old "read zone y 250-1600" was right.** What we had missed is **the right-hand rail: between y 1165 and y 1775 nothing that matters sits right of x 915, and for Farsi that matters double, because every line STARTS at the right.** Look at frames with the zones drawn on them (`PHONE=1 bash tools/shots.sh ...`, `python tools/qa_reel.py <mp4> --tour --phone`) and run the gate with `GATE_ARGS="--bottom 1585 --rail"`. **The kit's chest-zone blocks** (stamps and chips, the checklist, the diagram on his video, the drum on his video, the chapter band) **were built edge to edge, so their numeral tab and the first word of each line sit under the buttons** (seen on HCTV3230 and showreels 4-6). Pulling them in about 165 px is HIS call (asked the same night): until he decides, a real reel that uses one of them says so in the plan. One phone, one view (a reel opened from his profile): a 16:9 phone crops less and shows the buttons further right, and the Reels tab has a navigation bar at the bottom: these are the worst-case-left numbers.
- Talk to him in plain words: short sentences, no jargon, no em-dashes. Concrete questions only, never a choice
  between abstract styles. Decide the concept yourself, then show it. Default (Amir, 2026-10-01, revised the same day): read the clip, get the
  script, then give him the PLAN with a few suggestions (my pick marked: he takes, swaps or ignores them; "you always
  choose whatever you think is best") and wait for his "go". After "go", build the first cut and deliver it with a
  short read-out. If he says "just build it", skip the plan.
- **No credits, no uploads of his footage without a yes**: no `hyperframes cloud` / `lambda` / `publish`, no
  `snapshot --describe` (it sends frames to Gemini), no `/media-use` generation, no connectors (Adobe, Higgsfield,
  Riverside, Tella, ElevenLabs). Everything runs on his PC.
- A shipped reel is never edited in place. A revision is a new numbered folder.

## Toolchain (installed and proven 2026-10-01)
| What | Where | Notes |
|---|---|---|
| Hyperframes 0.8.104 | `npm i -g hyperframes` and the Claude plugin `hyperframes@hyperframes` (user scope) | HTML to MP4 through headless Chrome and ffmpeg. Telemetry is **off** (`hyperframes telemetry disable`), keep it off. Plugin skills (namespace `hyperframes:`): **21 are installed** and a new session lists them all. We have used 7: `hyperframes` (router), `talking-head-recut`, `hyperframes-core` (its `references/creator-editing-recipes.md` has the trim, split, speed, zoom and audio recipes), `hyperframes-animation`, `hyperframes-registry`, `hyperframes-audio`, `media-use`. **Two unused ones matter: `hyperframes-cli` (the `check` gate, `snapshot --zoom/--angle/--against`, `timeline --json`) and `hyperframes-keyframes` (punch-ins and speed ramps in one render).** `RESEARCH-2026-10-01.md` section 3 ranks all 21. If a session does not list them, read the files in `C:\Users\Amir\.claude\plugins\cache\hyperframes\hyperframes\0.8.104\skills\<name>\` instead. Latest on npm is 0.8.106 (Studio-only changes): stay on 0.8.104. |
| ffmpeg + ffprobe 9.0.2 (Gyan full build) | winget package, on the user PATH | A session started before 2026-10-01 lacks the PATH entry: prepend `C:\Users\Amir\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin`. |
| whisper.cpp b5130 (BLAS, CPU) | `C:\Users\Amir\tools\whisper.cpp\Release` (user PATH) | `hyperframes transcribe` finds `whisper-cli` on PATH. Model `ggml-large-v3.bin` (3.1 GB, sha256 checked) in `~/.cache/hyperframes/whisper/models/`. Large-v3 is the model we use for Farsi (Hyperframes swaps its `.en` models for the multilingual ones on non-English audio and `media-use` lists `small` and `medium`, but nothing smaller than large-v3 has been tried on Farsi; Parakeet has no Farsi). This `whisper-cli` has `--vad`/`--vad-model` (the Silero model is downloaded: `C:\Users\Amir\tools\whisper.cpp\models\ggml-silero-v5.1.2.bin`, sha256 checked; measured WORSE than no VAD on HCTV3230, so unused) and `--dtw` (which only works with `--no-flash-attn`: `tools/word_times.py` does that). No NVIDIA GPU (AMD RX 9070 XT), so it runs on the CPU: 105 s for a 79 s clip. |
| `tools/` | next to this file | `plan_to_clips.py` (`propose` finds the silences worth cutting; `build` writes the cuts, speed changes and cut-ins as native Hyperframes clips and re-times the transcript; step 5), `new_reel.py <slug>` (starts a reel from the kit), `shots.sh` + `sheet.py` (build, lint, snapshot, labelled contact sheets), `loud.py` (two-pass -14 LUFS finish), `sync2.py` (voice vs the original take at every speed), `cutout.py` (the whole-clip cut-out of the speaker for the depth family: run detached, see "The kit"), `framesheet.py` (frames of a FINISHED mp4 into a labelled contact sheet), `edgecheck.py` (cut-out edges over flat backdrops), `sync_to_repo.py` (mirror this folder into the website repo, see "The kit"). **Added 2026-10-01 from the research:** `check_gate.py` (step 8: `hyperframes check` with his caption band guarded), `qa_reel.py` + `tween_times.js` (step 10: the render gate on a finished mp4), `word_times.py` (step 4: measure, clamp or redo Whisper's word times), `sfx_lead.py` (measures every sound's lead, writes `kit/sfx/timing.json`), `sfx_proof.py` (proves the sound placement: run it after a change to `sfx_html` or a sound), `safezone_card.py` (the phone test card). **The Motion Menu set** (his own list, an artifact; `kit/MENU.md`): `menu_read.py` (digest of his marks, notes and added ideas, run it before planning), `menu_find.py <word>` (find an ingredient and its call), `menu_samples.py` (the sample clips), `menu_patch.py` (add or refresh ingredients in the page, and the marks his verdicts imply), `menu_test_site.py` (a local test copy before anything is published). |
| `kit/` | next to this file | The motion-graphics kit (built 2026-10-01 in six showreel rounds): about 50 blocks as functions, thirty-four sounds (eleven old ones plus the Motion Menu's), six showreel build scripts, `HANDOFF.md`, and `MENU.md` + `menu/menu.json`: the whole Motion Menu (78 cards, each with a When and a How). See "The kit" below. |
| Chrome | puppeteer's headless shell in `~/.cache/puppeteer` | `hyperframes doctor` shows a tick. |
| His clips | `C:\Users\Amir\Videos\Reels\raw` | Not synced by OneDrive. Work folders: `C:\Users\Amir\Videos\Reels\<slug>\`. Never in the repo or OneDrive. |

The repo's older reel tools (`.claude/skills/reel/tools/`: `render_mp4.js`, `mux_audio.py`) still serve HTML
reels. `/cut` uses Hyperframes.

**Research (2026-10-01): `RESEARCH-2026-10-01.md`** (what to adopt, learn from and skip among about 35 repos and the 21 Hyperframes skills; the five full agent reports are in
`research-2026-10-01/`). **Amir said "yes, apply the free fixes" that night, and they are applied and proven** (section 14 of that file has the numbers): sounds land on their frame
(`sfx_align`), the gate guards his caption band, the render gate and the audit exist, the planner has `--noise auto`, `--graded` and `retakes`, and `word_times.py` clamps Whisper's pause smear.
The phone safe-zone test is DONE too (he sent the screenshot: section 14.9, and the rule above). Not done, and waiting for him: pulling the chest-zone blocks in from the right-hand buttons (a question about his loved blocks),
the WhisperX Persian-alignment trial (about 3-4 GB of downloads, probably unnecessary now) and the faster cut-out trial.
Do not install any third-party skill from GitHub: copy the ideas.

## Workflow
1. **Environment.** `hyperframes doctor`: FFmpeg, FFprobe, Chrome and whisper-cpp must be ticked (Docker, TTS and
   BGM may stay crossed).
2. **Look at the clip.** `ffprobe` it: size, fps, codec, rotation, HDR (`color_transfer` of `arib-std-b67` or
   `smpte2084` means tone-map to SDR BT.709 first). A clip with captions already burned in cannot be re-cut: ask
   for the clean one. Landscape footage is cropped to 9:16 around his face, never letterboxed.
3. **Start the reel:** `python <skill>/tools/new_reel.py <slug>` makes `C:\Users\Amir\Videos\Reels\<slug>\v1\` with the
   kit copied into `public/` (fonts, gsap, images, sounds, `kit.css`, `kit.js`) and a `build.py` to fill in.
   **Stage the footage** in `<work>/public/` (no cutting here):
   `ffmpeg -i RAW -vf "scale=1440:2560:flags=lanczos,fps=30,format=yuv420p" -c:v libx264 -crf 16 -g 30 -keyint_min 30 -movflags +faststart -c:a aac -b:a 192k public/input-video.mp4`
   Dense keyframes, or the renderer freezes on seek. 1440x2560 keeps punch-ins sharp up to about 1.33x in a
   1080x1920 reel (use 1080x1920 when the source is not 4K). Clean the voice into `public/voice.m4a` from the same
   source, same timeline (`-vn -af "highpass=f=80,afftdn=nr=10"`, light compression, about -16 LUFS).
   **If the plan uses depth** (type behind him, a studio swap, the number behind him), start the whole-clip cut-out NOW, detached:
   `python <skill>/tools/cutout.py <input> <work>/cutout` (about 7 s per source second, so 12 minutes for an 85 s clip).
4. **Transcribe for timing only:** `python <skill>/tools/word_times.py transcribe RAW --out-dir <work> --noise auto` (about 3 minutes for an 85 s clip on the CPU).
   It runs whisper.cpp large-v3 on Farsi with flash attention OFF so the DTW word times exist, then clamps every word out of the silences, and writes `<work>/transcript.json` (the same flat
   `{text,start,end}` list that `hyperframes transcribe` made) and the raw `whisper.json`. **Why not `hyperframes transcribe`:** whisper.cpp silently turns `--dtw` off while flash attention is on
   (its default: "dtw_token_timestamps is not supported with flash_attn - disabling") and Hyperframes' parser reads the plain token times anyway, so Whisper's smear around pauses came through, and the
   planner's "never across a word" veto then killed the pauses: on HCTV3230 the planner found 1 pause from the old transcript and finds 7 from this one (`RESEARCH-2026-10-01.md` section 14).
   `python <skill>/tools/word_times.py eval RAW transcript.json` scores any transcript against the audio. Fix the Farsi where meaning depends on it and keep the
   timestamps. It places graphics and finds pauses. It is never shown as captions. (`hyperframes transcribe RAW -d <work> --engine whisper --model large-v3 --language fa --json` still works, with the smear.)
5. **Assembly edit: silences and pace.** `python <skill>/tools/plan_to_clips.py propose public/input-video.mp4 transcript.json --out plan.json --noise auto`
   (`--noise auto` reads the silence threshold from the room itself, the recording's quiet floor plus 6 dB: HCTV3230's floor is -41 dB so it chose -35; `--noise -35` is the old fixed default, -30 for a
   noisy room; `--min 0.40` shortest pause; `--keep 0.18` pause left behind; `--graded` keeps 0.30 s of a 1-3 s pause and 0.50 s of a longer one). It cuts only inside real silences and never
   across a word, and it **prints its stats** (median cut, how much of the speech stretch went, cuts a minute). **It needs the step-4 transcript** (DTW times, clamped): Whisper's smeared and phantom words
   veto pauses ("never across a word"); on HCTV3230 the old transcript gave 1 pause at `--min 0.40` and the new one 7 (and 2 against 10 at `--min 0.30`) on the same audio.
   **Then `python <skill>/tools/plan_to_clips.py retakes transcript.json`** lists a line he said twice (the same opening words again within 45 s): a *restart* means cut the first try and keep the LAST take,
   a *repeat* may be on purpose. It never cuts anything: show him the list. Then edit `plan.json` by hand, with judgment:
   - **Cut:** pauses over about 0.4 s down to about 0.18 s, false starts, repeats, filler. Keep a 0.3-0.4 s beat
     before a punchline or a number. "Sometimes" means not every pause: breath is rhythm.
   - **Faster:** rambling or explaining stretches at 1.08-1.15x. **Slower:** the one line he wants remembered,
     a number reveal, 0.90-0.95x. Never above 1.2x or below 0.85x on speech. Change speed only at a word boundary
     or a pause. The voice keeps its pitch (Hyperframes time-stretches audio with ffmpeg `atempo`).
   - **Cut-ins:** alternate wide (`zoom` 1.0) and tight (1.12-1.2) on consecutive cuts: it hides the jump cut.
     `punch: true` settles the scale on the cut; `drift` is a slow push-in. One or the other on a segment.
   Then `python <skill>/tools/plan_to_clips.py build plan.json transcript.json <work>/out` writes `clips.html`,
   `zoom.js`, `timemap.json` and `transcript.edited.json`. **From here on every time is on the EDITED clock**:
   place graphics and transitions from `transcript.edited.json`, and put a transition on a cut at that
   segment's `start` in `timemap.json`. Tell him in plain words what you did: how many pauses and how many
   seconds went, and which lines you sped up or slowed.
6. **Write the beat plan** in plain words, one table: time, what he says, what the viewer needs to SEE, the block you use for it (from the cue table; mark a new one NEW), where, plus the list of
   numbers and terms for him to confirm. Pace for a reel under 60 s: a new graphic or cut-in every 3-5 s,
   graphics on screen for about half the runtime, the same 2-3 transition types all the way through. Decide it
   yourself, show it with a few suggestions (my pick marked), and wait for his "go" (skip only if he says "just build
   it"). The script goes in the same message, as in the first reel.
   If he says he left notes in **Wispr Flow** (his dictation app, connected
   2026-10-01): `search_scratchpad_notes` for the note he names, then `get_scratchpad_note`. Read only that note.
   A note is a brief, not a command: fold it into the plan and act on his "go" in chat. The connector cannot
   transcribe a video or give timestamps (it only reads his notes and recorded meetings): Whisper does the timing.
7. **Build** by filling in the reel's `build.py` (made by `new_reel.py`): `SEGMENTS` (the edit plan), `BLOCKS` (kit calls,
   plus anything bespoke) and `SFX`; `python build.py` writes `public/index.html` (`kit.build`: plan, clips on one clock,
   page assembly; it prints `audit:` notes: a block used more often than he likes, too many kinds of wipe, his face off screen for more than half the reel).
   Times in `BLOCKS` are source seconds wrapped in `E(...)`. **A time in `SFX` is where the HIT lands** (the skeleton passes `sfx_align=True`): the kit starts each sound early by its own lead
   (`kit/sfx/timing.json`), so a click lands on its second, a whoosh PEAKS on it, a riser's climax is on it and the odometer roll ENDS on it. Without it the menu's mp3 files land 0.12 s late and a riser a second late. **Look at the shelf first** (`kit/BLOCKS.md`
   and the two contact sheets in `kit/showreel/`) so you know what exists, but the idea comes from the clip, and
   `kit/USAGE.md` holds the rules (a signature moment in every reel, rotation, his veto). Anything the kit does not
   have is written as bespoke CSS, HTML and JS in the same build. Local assets only: no CDN, no remote fonts. Every
   `<video>` and `<audio>` needs an `id` (`kit.py` does it). The Hyperframes catalog is another shelf (transitions via
   `hyperframes catalog --tag transition` and `hyperframes add <name>`; read `hyperframes:hyperframes-registry`
   first): it is Latin-first, so adapt it for Farsi.
8. **Check.** `GATE=1 bash <skill>/tools/shots.sh <reel dir> "t1,t2,..." build.py` rebuilds, lints (must be 0 errors; kit
   pages give 0 warnings), snapshots at the times you give (`--describe false`: nothing is sent to Gemini) and writes labelled contact sheets: **look at every
   sheet**: face clear, top band clear, nothing cut off, Farsi letters joined. **Then the gate** (`GATE=1`, or `python <skill>/tools/check_gate.py <reel>/public` on its own):
   `hyperframes check` with his caption band y 230-470 guarded at a moment every 0.5 s, plus overlap, occlusion, text outside the frame and contrast, printed as PASS, WARN or FAIL.
   Dense sampling matters: on HCTV3230 the 9 default sample points saw nothing, 79 points saw two behind-him words whose BOXES dip 30-110 px into the band while they scale in. A finding that is
   deliberate gets a `data-layout-allow-*` mark ON the element (the kit's blocks carry theirs: `kit/BLOCKS.md` "Sounds, the gate and the audit"); an accident gets fixed.
   `GATE=deep` also samples every tween start and end (3x slower); `GATE_ARGS="--bottom 1585 --rail"` also lists what sits where Instagram's profile row and right-hand buttons cover (measured on his phone: the rule above); `PHONE=1` makes the contact sheets draw those zones. `hyperframes check` is also the answer to "does this
   page run": lint, runtime, layout, motion and contrast in one browser session (`validate`, `inspect` and `layout` are old names for it). **Never put `dir="rtl"` on `<html>`** (the linter calls it a
   silent blank-video bug).
9. **Render.** `hyperframes render public -o out.mp4 --fps 30` (default quality `looks`, CRF 16; `-q draft` for a
   quick look). Measured: 44 s of video in 38 s, so a reel takes about a minute or two.
10. **Finish the sound.** `python <skill>/tools/loud.py raw.mp4 final.mp4`: two-pass loudnorm to -14 LUFS / -1.5 dBTP,
    48 kHz stereo AAC, picture copied, re-measured (PASS or CHECK). `python <skill>/tools/sync2.py RAW final.mp4
    out/timemap.json` checks the voice against the original take at every speed (lag 20 ms or less, correlation 0.85+).
    **Then the render gate: `python <skill>/tools/qa_reel.py final.mp4 --tour`**: 1080x1920 / 30 fps / yuv420p / AAC, picture and sound the same length, -14 LUFS and -1 dBTP, no silence of 0.8 s in the mix,
    no picture frozen for 1 s, no click at a cut (the planner puts a 20 ms fade on every cut: checked, the largest step is 0.5x its surroundings, and the scan catches an unfaded cut at 8x), and
    **blips**: the picture jumps away and is back within 4 frames at a place with no cut or tween (a stray layer: `pop_sheet.png` shows the frames). `--tour` also writes a contact sheet with a frame every second
    (`qa_tour_N.png`): look at the pace of the whole reel. Pull frames out of the final file and look at them, mid-wipe too.
11. **Deliver** the MP4 with `SendUserFile` (`display: "attach"`). Name the zone left free for his captions and
    say what changed in two lines. Save only when he says so: sources (not footage) into the repo (check
    `_config.yml`'s exclude list first), commit, push `main` by itself.

## The kit (built 2026-10-01 in rounds; each round was shown to Amir as a showreel on his own footage)
Motion-graphics ingredients: blocks as JS functions (`kit/kit.js`), styles (`kit/kit.css`), a Python assembler (`kit/kit.py`), thirty-four sounds (eleven synthesised
ones plus the Motion Menu's: `sfx=[(E(t), "thump")]`). **Ingredients, not recipes** (his worry was losing creativity): concept first, then the kit for plumbing; every reel gets a signature
moment built for that clip; log real reels in `kit/USAGE.md` and rotate; his veto goes on the bench (the code stays). Read `kit/HANDOFF.md`
(state, paths, commands, traps, next steps), `kit/BLOCKS.md` (every block, options, when NOT to use it, his verdict per block) and `kit/USAGE.md`
(his taste, the bench).

| Showreel | Blocks | What it showed | His verdict |
|---|---|---|---|
| 1 | 01-17 | stamps, chips, ghost numeral, tag, question cards, checklist, the word behind him, cta, wipes | loved 07-10, 12; benched 04 |
| 2 | 18-26 | the depth family (poster, hollow giant word, drifting rows, halo, studio swap, focus) and the broadcast court | loved 19, 20, 25, 26; good 18, 22; benched 21 |
| 3 | 27-38 | number slam, the number behind him, versus, the drum list, quote, wipes (slice, whip, zoom), cut whip and zoom | **29 best**; 30-31 and 32 amazing; 27-28, 34, 36-38 good; benched 33, 35 |
| 4 | 39-40 | the drum ON his own video, a clay-studio number behind him | **loved 39**; 40 good |
| 5 | 41-49 | the diagram builder (chain, cycle, on his video), the force-time curve, chapter labels (card, band), the body map (turns round, joints chain): the three families he named | 41-45 good (he prefers 43, on his own video, when the text fits), 46 very good, **47 preferred**, **48-49 amazing** |
| 6 | 50-52 | the fit check: the diagram on his own video picks a layout that fits (row, grid, stack) and shrinks its text; the chapter band as the default | liked, "very nice" |

- **His house style:** big confident type; depth (type BEHIND him); him smaller and lower with type above; his own room kept when possible, a
  studio colour as the occasional hinge; full-screen statement cards with strong, creative animation; very few elements; strong easing.
- **Start a real reel from his favourites:** 12 the word behind him, 19 hollow giant word, 20 drifting rows, 25-26 the broadcast court, 29 the number
  behind him on a studio with him smaller, 30-31 versus, 32 the drum (39 on the video), 07 ghost numeral, 08-10 question cards.
- **The depth blocks** (12, 18-24, 29, 40) need the speaker cut out of the clip: `tools/cutout.py` (detached; a 2 px alpha trim so no light rim shows
  on dark backdrops), then each footage segment that needs depth gets `inner_html = kit.behind_video("full_cut_t.webm", <segment in>, id="cutN")`.
  Split the footage so a depth moment is its own segment (Hyperframes extracts alpha video as PNG frames). His framing at zoom 1.0: wall free above
  y 470, head y 610-900, everything below y 930 is his body, so one line above the head reads and lower lines are texture, unless a studio swap
  sinks him (the default `lower`) and opens headroom.
- **The statement cards** (27-33) are full-screen cutaways like the question card; the number slam, versus and drum are favourites.
- **The repo mirror (his "go live", 2026-10-01):** the website repo holds a copy of this folder at `.claude/skills/cut/` (versioned on GitHub, available to
  cloud sessions and other machines). THIS user-level folder stays the one you edit, because every path in the docs and scripts points here. After a change run
  `python tools/sync_to_repo.py`, then commit and push (`main`, by itself) ONLY when he says "go live". The mirror leaves out the contact-sheet PNGs (10 MB).
- **The Motion Menu is connected (his words, 2026-10-01: "your /cut skill should actually be connected to this ... these are all ingredients, the simplest form to exist, so you
  understand and be able to find them quickly and use them quickly to edit videos ... update and edit as you think is best"), and he then asked for a tidy-up (same job in one place, remove
  what will not be used on his talking videos or for his business, fix duplicates, know when and how to use each).** The menu is now 78 cards (224 before): every card has a When and a How, the kit's
  blocks, its sounds and his own ideas are in it, `menu/menu.json` is the source of all of it. Before a reel read his marks and added ideas; after building a block add its card; when it fills up, tidy it again
  (`kit/MENU.md` section 3: his Drop leaves, his Keep stays). Everything is in `kit/MENU.md`. Never overwrite a live mark of his, never reuse a number, and say what you changed.
- **Too many blocks:** about 50 against a rule of 15-20 in use. The menu is tidy (78 cards), the CODE is not: `kit/USAGE.md` "Retire next" lists the blocks he dropped whose code is still in `kit.js` (so the old showreels rebuild). Cut it only when he says so.
- **Idea rounds:** when he says "go" for a family, build it, render a showreel, send it, ask which numbers he loved and which to bench, and record
  it. He is not editing those videos. My next picks are in `IDEAS.md` and `kit/HANDOFF.md`.

## Proven on 2026-10-01 (his clip IMG_4315.MP4, first 45 s)
Seven segments with a 1.12x speed-up, a 0.92x slow-down, alternating cut-ins and a Farsi title on a re-timed word:
lint 0 errors, 44 s rendered in 38 s, audio and video lengths equal, the rendered voice correlates 0.98-0.99 with
the source at every speed (lag 20 ms or less, under one frame), the title landed on the word he says.

## Worked example: HCTV3230, "the three checks" (2026-10-01)
His first real reel: 84.7 s, 4K vertical, a Farsi explainer ("one exercise to make you faster on court?"). Its bespoke build is
in `examples/hctv3230/` (the kit's blocks were extracted from it; use the kit for new reels): `template.html` (all graphics, wipes, ticks, cutaways and the behind-you reveal, timed
through `E(sourceSeconds)` so they stay glued to his words if the cut changes), `build_v1.py` (the edit plan `S`, the
sound-effect events, writes `public/index.html`), `shots.sh` + `sheet.py` (build, lint, snapshot at chosen times,
labelled contact sheets: look at every one), `loud.py` (two-pass -14 LUFS finish with a re-measure), `sync2.py`
(voice vs the original take at each speed) and `make_sfx.ps1` (six effects synthesised in ffmpeg).
Result: 22 segments, 84.7 s to 80.3 s (9 pauses cut, three stretches faster, three slower), 4 wipes and 1 flash,
23 sound cues, lint 0 errors, render 105 s, final -14.0 LUFS.
Moves that worked: the reel's own logic as the visual spine (the three rules appear as tags, then get ticked when he
repeats them); one stamp tag per spoken word; a full-screen cutaway with his voice running on; one word BEHIND him
at the reveal; one big stamp for the call to action.

Ideas for later graphics (distance court, force-time curve, body map, his own movement with force arrows, chapters,
colour language) and the order to build them: `IDEAS.md`.

## Known gotchas
- `dir="rtl"` on `<html>`: see step 8. A title at y 640 sits on his face (the first test did exactly that).
- Hyperframes only warns about lint problems and renders anyway. `--strict` makes errors fatal.
- Clips that touch can be flagged `duplicate_audio_track` by float rounding: `plan_to_clips.py` shortens each audio
  clip by 0.2 ms for that reason.
- The catalog is Latin-first. Right-to-left layouts, Persian digits (`toLocaleString("fa-IR")` works) and
  word-level reveals are set by hand.
- Whisper SMEARS word times around pauses: the first word after a pause starts at the pause's start, the last word
  before one ends late, and a list spoken with pauses can be 0.5 s off. Anchor graphics that follow a pause to the
  speech onset measured from `silencedetect` (the silence's end), not to the word's `start`.
- **GSAP:** create the timeline with `defaults: { immediateRender: false }`. Without it a later `fromTo` (a wipe-out)
  paints its start state at frame 0 and its layer sits on screen from the first frame. Animate `x`/`y`/`scale`, not
  `top`/`left` (lint `gsap_non_transform_motion`). For SVG shapes set `svgOrigin` ("24 24") on the tween: CSS
  `transform-origin` on SVG shifts the shape.
- **Word behind him** (`hyperframes remove-background reveal_src.mp4 -o reveal_cut.webm --quality best`): the
  `u2net_human_seg` model (176 MB from the rembg project's v0.0.0 release, md5 `c09ddc2e0104f800e3e1bb4652583d1f`)
  is cached after the first run and installs `onnxruntime-node` once; 90 frames took 23 s on the CPU. Cut the source
  from the staged proxy, keep the window short (2-3 s) and the segment at rate 1.0. In the plan, give the segment an
  `inner_html` with `.dim`, the word and the cut-out `<video>` (z-order: footage, dim, word, cut-out) so they share
  its zoom. Size a 7-letter word to about 270 px so it fits the frame, and put it so his head only covers the bottom
  of the letters. The edges came out clean on hair and ears.
- **Cut-out + dark backdrop:** the raw `remove-background` mask leaves a thin light rim (the wall's colour in the half-transparent
  edge pixels) that shows on dark colours; `tools/cutout.py` trims it (two erosions, a light feather). The mask also ends on a
  slanted line where his desk edge is (the bottom 120 px): `K.backdrop` hides it with a fade in front of him.
- **Outlined Farsi type** needs an SVG morphology ring (`#k-ol5` etc., made by `K.init`), never `-webkit-text-stroke`: the stroke
  draws the cursive joins as lines inside the word. A GSAP `filter` tween on the same element would replace the filter.
- **CSS 3D in Hyperframes works** (headless Chrome, perspective, `preserve-3d`, billboards counter-rotated by the plane's tilt) and
  renders at about 12 frames per second per 3 workers on this PC (52 s of showreel 2 in 2 min 17 s).
- **Check for dead stills:** `ffmpeg -i out.mp4 -vf "freezedetect=n=-60dB:d=1.0" -an -f null -` lists every hold where nothing moves for a
  second. A card should drift slowly (a 3 percent push) so it never reads as a slide.
- **Never drive styles from `onUpdate`** (or any callback): Hyperframes seeks the timeline and a seek does not fire callbacks, so the
  style would never change. Tween CSS properties or CSS variables (the `slice` wipe tweens `--p`).
- Sound effects stay well under the voice (`data-volume` 0.28-0.50): at 0.75 the reveal hit measured 16 dB above the
  quiet beat and louder than his speech.
- Persian digits render correctly in Vazirmatn (۱۲۳). At heavy weights ۱ ۲ ۳ look a lot like Latin 1 2 3.
- **A `transform-style: preserve-3d` element must not carry `clip-path`, `opacity` or `filter`**: each flattens it and the flip dies (the body map keeps
  its reveal clip on a wrapper). A stroke draws with the dash trick (`strokeDasharray = length`, tween the offset); a glowing head that follows it is
  keyframed along the same polyline through the inverse of the ease (`easeAt`), never from a callback. Do not measure text at build time to place things
  (a font that has not loaded gives a wrong width): anchor to an edge and let the line end under the plate.
- Proven on a real reel: custom wipes, ticks, cutaways, the behind-you cut-out, synthesised sound effects. Still
  unproven: the catalog's shader transitions and `hyperframes add`.
