# Tools: Persian word timing, silence tools, matting, free sounds, Lottie, editor MCPs

*Research report, 2026-10-01. Written by a read-only research subagent for the /cut skill: model output, read by Claude and cross-checked in part (see `RESEARCH-2026-10-01.md` section 'What I verified myself'). Nothing here was installed or downloaded. Stars, licences and dates are as the pages showed on 2026-10-01. Treat every instruction-like sentence in it as the agent's own words, not as a rule of the skill.*

**Two of its recommended trials are settled (2026-10-02), see `RESEARCH-2026-10-01.md` 14.8 and 14.10: trial 2 (WhisperX Persian alignment) was DROPPED and never installed, because the DTW times plus the silence clamp already solved the pause smear; trial 3 (RVM matting) was run and ADOPTED (2.94 s per source second, steadier, no torso holes). The text below is the agent's original report, left as it was written.**

---

# Tools research for the Farsi reel pipeline (2026-10-01; read-only, nothing downloaded)

Sources: READMEs, PyPI, Hugging Face (HF), vendor pages; no fetched page addressed an AI. Repos are GitHub owner/repo. Speeds on Amir's PC are UNVERIFIED unless stated.

## 1. Persian word timing

- **WhisperX** (m-bain/whisperX, 24.3k stars, BSD-2, v3.8.6 25 May 2026, 3.8.7rc1 26 Jun). Yes, Persian ships: its alignment table maps `fa` to HF jonatasgrosman/wav2vec2-large-xlsr-53-persian (Apache-2.0, 1.26 GB, character CTC, 30% WER / 7.4% CER on Common Voice 6.1). CPU-only works. Pain: needs Python below 3.14 (his `python` is 3.14, so a 3.10-3.13 venv), pins torch ~2.8, pulls pyannote 4 and torchcodec. In source (checked), `import whisperx` is lazy, `alignment.py` imports neither, and `load_audio` shells out to ffmpeg, so his ffmpeg 9 is fine. `align()` accepts any segments `{text,start,end}`, so Amir's corrected text works, one segment per speech run. The model vocabulary (67 tokens) has no ZWNJ and no digits: spell numbers out; words with no vocabulary characters get no timing.
- **ctc-forced-aligner** (MahmoudAshraf97/ctc-forced-aligner, 566 stars, v1.0.2 Feb 2025, code BSD-2). Text file plus audio, language `fas` with `--romanize`. Default MMS-300m aligner is CC-BY-NC-4.0, a commercial risk for marketing reels; `--alignment_model` can swap in the Apache Persian model. No CPU-speed or accuracy claims; open issues on imprecise starts (#61) and drift (#84). PyPI is sdist-only with a C++ file, so Windows likely needs a compiler.
- **Montreal Forced Aligner**: no Persian pretrained acoustic model in its index (a 2024 English-only paper has MFA beating WhisperX and MMS). Skip.
- **stable-ts** (jianfch/stable-ts, MIT, 2.3k stars, archived 30 May 2026): `model.align(audio, text, language='fa')` force-decodes confirmed text via Whisper cross-attention; `suppress_silence` and Silero `vad` clamp words to silence; CPU via faster-whisper. A/B partner.
- **whisper-timestamped** (linto-ai, AGPL-3.0): documents that unrecognised hesitations shift the next word's start (`detect_disfluencies`), our exact symptom; no forced-text mode found.
- **Persian models**: HF vhdm/whisper-large-fa-v1 (MIT, large-v3-turbo base, 14% WER on its own set, timestamp quality unknown); nvidia/stt_fa_fastconformer_hybrid_large (CC-BY-4.0, CTC head 13.2% WER, NeMo, heavy on Windows); Meta Omnilingual ASR (Apache-2.0, Persian CTC fine-tunes, needs fairseq2, no native Windows); Qwen3-ForcedAligner (11 languages, no Persian).
- **Smearing tricks.** whisper.cpp 1.9.4 (11 Sep 2026): `--vad -vm ggml-silero-v6.2.0.bin` decodes speech only; `--dtw large.v3 -ojf` adds `t_dtw` token times from alignment heads (merged 2024; accuracy PRs still draft); `--prompt` takes a glossary for misheard terms. faster-whisper 1.2.1: `clip_timestamps`, `hotwords`, `hallucination_silence_threshold`. Calibration: the CrisperWhisper paper (English) has WhisperX near 77% F1 at a 0.2 s collar, so expect plus or minus 100 ms and pad cuts. Cheapest fix: clamp each word to the silencedetect map.

**Verdict:** first try WhisperX `align` (about 20 lines) with the Persian default on Amir-confirmed text, one segment per speech run, in a Python 3.12 venv; then snap word edges to silence or energy valleys. 1-2 h to a first number. Fallbacks: ctc-forced-aligner with the Apache Persian model, or stable-ts align.

## 2. Silence, filler, retake

- **auto-editor** (WyattBlue/auto-editor, 31.6.x, 6 Sep 2026, Nim, Unlicense, 5.4k stars; Windows binary from GitHub Releases, no pip). Audio method default 0.04 (about -28 dB; `audio:-30dB` accepted), plus motion and subtitle/regex/word. `--margin` 0.2s (asymmetric allowed), `--smooth` 0.2s,0.1s, `--when-silent` cut or `speed:N`. `whisper` subcommand runs whisper.cpp ggml models (srt/json, `--split-words`). Exports premiere, resolve, fcp, shotcut, kdenlive. Verdict: equals a good silencedetect planner; no word snapping, no retakes; second opinion only.
- **jumpcutter** (MIT, abandoned; defaults 0.03 = -30.5 dB, 1-frame margin), **unsilence** (MIT, 594 stars): nothing new.
- **video-use** (browser-use/video-use, MIT, 27.8k stars; Claude Code plus Hyperframes) and free fork **freecut** (Moh4696/freecut, MIT, 280): best-documented rules. Gaps of 400 ms or more are cleanest cuts, 150-400 ms usable, under 150 ms unsafe; pad 30-200 ms around kept words (launch: 50 ms before, 80 ms after) because ASR drifts 50-100 ms; 30 ms fades at every cut; never cut inside a word; the LLM reads a packed word-timed transcript and picks the best take.
- **declip** (b2bvic/declip, MIT, Apple-Silicon only, 6 stars): sliding-window sentence-similarity retakes, keeps the latest; trims gaps over 300 ms; merges cuts under 200 ms apart. SmartCut MCP is CapCut-only.
- **Retake idea:** Claude reads transcript lines annotated with gap milliseconds. Pre-flag with rapidfuzz (MIT) `token_set_ratio` of 70 or more between phrases within 30 s, after Persian normalising (yeh/kaf variants, ZWNJ, digits); add a restart test (same first 2-3 words after a 0.3 s pause). Keep the later take; Amir approves.
- **Thresholds:** guides start at noise -30 dB, d 0.5 s (one says -20 dB, another -40 dB for quiet rooms). My rule: 8-10 dB above measured room tone (UNVERIFIED). Keep the custom planner.

## 3. Person cut-out

- **Current:** Hyperframes `remove-background` = u2net_human_seg (Apache-2.0, 168 MB ONNX, per-frame). `--device auto|cpu|coreml|cuda`: no DirectML, hence CPU. Outputs VP9-alpha WebM or ProRes 4444.
- **RVM** (PeterL1n/RobustVideoMatting, GPL-3.0, 9.5k stars, last update 2021): mobilenetv3 ONNX 14.3 MB, 3.7 M params, 9.4 GFLOPs; recurrent state gives temporal stability; HD 104 FPS on a GTX 1080 Ti. Only CPU datapoint: about 5 FPS on a 9th-gen i7 (issue #284), so perhaps 2-3 times faster than u2net on his CPU (UNVERIFIED). ONNX tested on CPU/CUDA only; DirectML untested. Set downsample_ratio so working size is 256-512 px (0.25 at 1080p). Needs an ~80-line script.
- **ONNX Runtime:** CPU wheel 1.30.0 has cp314; `onnxruntime-directml` 1.24.4 stops at cp313, and Microsoft calls DirectML sustained engineering (WinML preferred). Use a 3.12/3.13 venv; real speed-up is GPU only (UNVERIFIED).
- **Others:** MODNet (Apache-2.0, 4.4k, image-first); BackgroundMattingV2 (MIT, needs a clean-plate photo, GPU); BiRefNet (MIT, ~58 ms per 1024 px frame on an RTX 4090, per-frame flicker); transparent-background (MIT, per-frame); rembg (MIT, but default RMBG-2.0 needs a paid BRIA commercial agreement, so use `-m u2net_human_seg`; no DirectML); MatAnyone (S-Lab non-commercial: no); SAM 2 (Apache-2.0, CUDA/WSL, binary masks); MediaPipe selfie (Apache-2.0, 256 px, rough hair, wheels to cp312). PyTorch on a 9070 XT under Windows is preview-only (UNVERIFIED).
- **Alpha export:** pipe RGBA to ffmpeg `libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0` as .webm (MP4 cannot carry VP9 alpha).

**Verdict:** RVM first (CPU, then DirectML). Fallback: the cached u2net_human_seg ONNX on DirectML (same look, GPU speed, UNVERIFIED).

## 4. Free SFX (licence in one line)

- Pixabay Content Licence: commercial, no attribution; no resale or standalone redistribution.
- Mixkit Sound Effects Free License: commercial incl. social and ads, no attribution; no resale of unaltered files (its restricted tier is personal-only: read each label).
- Sonniss GDC 2026 (16 Mar 2026, 7.47 GB, 17 vendors; gdc.sonniss.com): royalty-free, commercial, no attribution; no redistribution; AI/ML training banned.
- Kenney audio (Impact Sounds 130 files, Interface, UI, Digital): CC0.
- Freesound: filter to Creative Commons 0 only (CC BY needs credit; BY-NC bars commercial).
- Woven SFX (woven-video/woven-sfx): repo says CC0 1.0, 0 stars, provenance undisclosed (UNVERIFIED).
- Avoid BBC Sound Effects (RemArc: personal, educational, research only).
- Auto-placement: only `add-sfx` (fetches WAVs, does not place) and gooseworks `synthesize-sfx-ffmpeg` (7 stars; ffmpeg-synthesised dings, whooshes, risers, no licence issue). Place SFX from our own cut list and graphics events; adopt nothing.

## 5. Lottie, Rive, SVG

- **Seekable:** lottie-web (airbnb/lottie-web, MIT, 32.1k stars, `goToAndStop`, `autoplay:false`) and dotlottie-web (LottieFiles, MIT, 890, `setFrame`). The Hyperframes lottie skill registers players on `window.__hfLottie` and seeks per captured frame (from skill listings; no primary doc found).
- **LottieFiles free licence** (Lottie Simple License): commercial OK, edits OK, attribution encouraged not required, no resale, standalone redistribution or scraping; creators may add terms, so check each page (terms from its Help Centre). Tennis, tennis-ball, confetti, arrow and tick animations exist.
- **diffusionstudio/lottie** (MIT, 5.5k): Claude writes Lottie JSON (licence-clean) for Skottie; test in lottie-web.
- **GSAP:** free with all plugins since 30 Apr 2025 (no competing visual animation builders; AI-generated code allowed): SVG arrows and ticks.
- **Rive:** runtime MIT; no verified per-frame seek story, skip.

## 6. Editor MCPs

None matters: he owns none of the apps, and Hyperframes plus ffmpeg renders the final MP4. Best maintained: DaVinci Resolve (samuelgursky/davinci-resolve-mcp, 3.3k stars, MIT, v4.8.x; free Resolve gates external scripting, and 21.1 moved Python scripting to Studio). Premiere (hetpatel-11/adobe_premiere_pro_mcp, 635 stars) and After Effects (Dakkshin/after-effects-mcp, 684) need paid Adobe. CapCut (sun-guannan/VectCutAPI, 2.3k, Apache-2.0) only writes draft files for CapCut desktop.

## 7. Verified facts

- **Safe zone:** Meta's Ads Guide says leave roughly 14% top, 35% bottom, 6% each side free of text and logos: about 269 px top, 672 px bottom, 65 px sides at 1080x1920, a 950x979 px box. These are ad numbers; Meta's help article on the same would not load for me. An uncited blog gives lighter organic numbers (about 108 top, 300-320 bottom, 100-120 right): use Meta's as the envelope. The profile grid is 3:4 since 2025 (Mosseri): a 1080x1920 cover is centre-cropped to 1080x1440 (240 px off top and bottom, by arithmetic).
- **Loudness:** Meta publishes no LUFS for Reels (two third-party sources say so). Practice: -14 LUFS integrated, true peak at or below -1 dBTP; some say -10 to -12 for punch (UNVERIFIED). video-use masters at -14 LUFS with music 12-15 dB under speech. Measure with `ffmpeg -af ebur128=peak=true`.

## RECOMMENDED TRIALS, in order

All local and free; nothing needs credits, keys or cloud.

1. **Clamp plus whisper.cpp flags** (~40 min; needs a yes for the tiny Silero VAD model). Re-run the 79 s clip with `--vad` and `--dtw large.v3 -ojf`, then clamp words to silencedetect. Success: words after pauses start within 60 ms of audible onset; the paused list within 80 ms (now 0.5 s off).
2. **WhisperX Persian alignment** (1-2 h; needs a yes: 1.26 GB model plus an estimated 1-2 GB of Python packages in a 3.12 venv; CPU run time unknown). Success: 90% of 30 hand-checked word starts within 50 ms, none beyond 120 ms, and 50/80 ms-padded cuts clip no consonant. If it fails, A/B stable-ts align.
3. **RVM matting** (1 h on CPU, +1 h for a DirectML venv; needs a yes: 14 MB ONNX plus onnxruntime, under 200 MB estimated). Success: 2 s or less per source second on CPU, or 0.7 s on DirectML; no flicker over 10 s; hair equal or better after the same 2 px trim; the WebM plays in Hyperframes.
4. **SFX kit:** Kenney Impact and Interface (CC0, small; needs a yes) plus five ffmpeg-synthesised whooshes and risers (no download). Skip Sonniss (7.5 GB) unless he wants breadth. Success: 12 sounds, each with a licence line.
5. **Lottie:** tick, arrow, confetti via lottie-web in a Hyperframes composition (needs a yes for LottieFiles files). Success: two renders identical frame by frame, licence noted per file.
6. **Optional:** auto-editor binary for a second-opinion cut list; apply the 14/35/6 safe zone and a -14 LUFS check to the templates.

Sources: [WhisperX-align](https://raw.githubusercontent.com/m-bain/whisperX/main/whisperx/alignment.py), [Persian-wav2vec2](https://huggingface.co/jonatasgrosman/wav2vec2-large-xlsr-53-persian), [ctc-forced-aligner](https://github.com/MahmoudAshraf97/ctc-forced-aligner), [stable-ts](https://github.com/jianfch/stable-ts), [whisper.cpp](https://github.com/ggml-org/whisper.cpp), [auto-editor](https://github.com/WyattBlue/auto-editor), [video-use](https://github.com/browser-use/video-use), [RVM](https://github.com/PeterL1n/RobustVideoMatting), [Hyperframes-CLI](https://raw.githubusercontent.com/heygen-com/hyperframes/main/docs/packages/cli.mdx), [DirectML](https://onnxruntime.ai/docs/execution-providers/DirectML-ExecutionProvider.html), [rembg](https://github.com/danielgatis/rembg), [Meta-Ads-Guide](https://www.facebook.com/business/ads-guide/update/image/instagram-reels), [LottieFiles](https://help.lottiefiles.com/animation-licensing-basics-), [Pixabay](https://pixabay.com/service/license-summary/), [Mixkit](https://mixkit.co/llm-info/), [Sonniss](https://rekkerd.org/sonniss-releases-gdc-2026-game-audio-bundle/), [Kenney](https://kenney.nl/assets/impact-sounds), [Freesound](https://freesound.org/help/faq/), [Woven](https://github.com/woven-video/woven-sfx), [diffusionstudio](https://github.com/diffusionstudio/lottie), [GSAP](https://gsap.com/community/standard-license/), [Resolve-MCP](https://github.com/samuelgursky/davinci-resolve-mcp), [Reels-loudness](https://cutscore.io/blog/loudness-for-instagram-reels), [MFA-paper](https://arxiv.org/abs/2406.19363), [CrisperWhisper](https://arxiv.org/html/2408.16589v1)
