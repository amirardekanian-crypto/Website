# The muscle map's drawing (program.html, stage42, 2026-09-26)

The body in the About sheet's *Muscles worked* section. Everything the app draws comes from here;
never hand-edit `BODYMAP_SVG` in program.html.

| File | What it is |
|---|---|
| `master.png` | The chosen Higgsfield drawing, greyscale, exact pixels. GPT Image 2.5 (flare, medium, 2k, 4:3), round 1 candidate C, job `f37ea7da-2673-43d7-9b4c-30d1b3633927`. Prompt in `../LEDGER.md` |
| `bm1_axis.py` | Splits the front and back figures, finds each mirror axis, writes both symmetric versions (`sym_<view>_L/R.png`) |
| `bm2_label.py` | Labels every muscle shape (`lab_<view>.npy`, `bm_regions.json`) and draws numbered overlays to assign them |
| `bm3_trace.py` | `GROUP` maps each shape to a muscle id; traces shapes, line art and the outline into `bodymap.json` |
| `bodymap.json` | The traced result: `groups[view][muscle] = path`, `line`, `sil`, `place`, `viewBox` |
| `inject.py` | Writes `BODYMAP_SVG` into program.html between `// BODYMAP:BEGIN` and `// BODYMAP:END`. `--check` exits 1 if stale |

**To change which shape is which muscle:** run the three scripts in a scratch copy of this folder
(they write their work files beside themselves), edit `GROUP` in `bm3_trace.py`, rerun it, copy the
new `bodymap.json` back here, run `inject.py`, and bump `CACHE` in `sw.js`.

Decisions baked in: the front uses the LEFT half mirrored, the back the RIGHT half (cleaner abs;
better triceps and shoulder blade). The muscle mask drops pixels within 3 px of the pale outline,
or neighbouring shapes join through its soft edge (the trapezius merged with the rear shoulder
before that). The outline is traced as one closed silhouette, because the drawn line is 2-3 px and
faint on the back view. Extra groups beyond the Spine's 15 muscles: `lowback` (lit with `core`),
`hip` (the outer hip, lit only by the body-part fallback, so an RDL does not light the front) and
`ankle`; the knee and ankle rings are ellipses in `inject.py`.

Colours live in program.html's `.bmap` CSS, not in the drawing.
