# Reel %%N%% — %%TITLE%%

> Started from the timeline kit (`.claude/skills/reel/timeline/`). Fill this in as you go: it is the record the next session reads.

**What it is:** _who it is for, where it posts, the one thing the viewer should do next._  **Length:** _s_ · 1080×1920 · Farsi · _silent / SFX / voice_.
**Open** `Content/reel-%%N%%-%%SLUG%%.html` (one self-contained file; space = pause, ← → = ±0.1 s). The video is `export/` (git-ignored).

## Brand
_Whose brand (his, or a client's), the tokens used, the fonts. For a client: taken from their live site, not from `DESIGN-ATLAS.md`._

## The idea
_One motif carried from the first frame to the last (reel 9: one ball, one rally), and the scene it hangs on._

## Scene map
| time | scene | what happens |
|---|---|---|
| 0.0– | **1 ·** | |

## Copy-to-source table
_Every on-screen line, and where it comes from (page, app, brief). Mark each **verbatim / shortened / new**. New lines are listed for Amir to read before it ships.
`python .claude/skills/reel/tools/copy_audit.py lines.json <source files> --src src` does the checking._

## Safe zones and sound
_`node .claude/skills/reel/tools/safe_audit.js src/reel%%N%%.template.html` result. Sound: silent (music goes on in Instagram) / SFX layer (never auditioned = say so) / his voice (mux_audio.py PASS)._

## Rebuild
```
PYTHONIOENCODING=utf-8 python src/build_reel.py
node .claude/skills/reel/tools/render_timeline.js Content/reel-%%N%%-%%SLUG%%.html export/reel-%%N%%.mp4          # a final: 20 sub-frames, about 4 min for 17 s
```

## Before it posts
1. _Farsi lines Amir has to read._  2. _Anything the post depends on (a bio link, a photo credit, a price)._  3. _The cover frame._
