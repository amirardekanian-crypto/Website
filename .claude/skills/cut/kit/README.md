# The reel kit

**Continuing in a new chat? Read `HANDOFF.md` first.**

Motion-graphics ingredients for Amir's talking-head reels, proven on HCTV3230 (v1) and kept in this folder so every
later reel starts from working parts. **It exists to save time on plumbing, not to decide how a reel looks.**
Read `USAGE.md` before using it: the rules there are what keep his reels from looking alike.

| File | What it is |
|---|---|
| `kit.js` | The blocks, as functions (`K.stamps`, `K.chips`, `K.question`, `K.checklist`, `K.behind`, `K.cta`, wipes, flash ...), the **statement cards** (`K.number`, `K.slamBehind`, `K.versus`, `K.list`, `K.quote`) and the cut transition `K.whip`, the **depth family** (`K.stack`, `K.outline`, `K.drift`, `K.halo`, `K.sweep`, `K.backdrop`, `K.focus`) and the **broadcast court** (`K.courtSteps3d`, `K.courtMeasure3d`; the photo courts `K.courtSteps` / `K.courtMeasure` are kept for showreel 1 only) |
| `kit.css` | Their styles. A "mood" is a different set of the CSS variables at the top (Stamp is the default mood) |
| `kit.py` | The Python side: `scaffold`, `build`, the static media (`behind_video`, `sfx_html`), the eight sounds' levels |
| `template.html` | The page every reel is assembled into (reel-specific CSS, HTML and JS have their own slots) |
| `assets/`, `sfx/` | Vazirmatn, the two court photos, the ball, gsap; the eleven synthesised sounds (`step`, `rise` for the court; `tick`, `roll`, `swipe` for the cards, made by `sfx/make_sfx3.py`) and how they are made |
| `BLOCKS.md` | The catalogue: what each block is, its options, when to use it and when NOT to |
| `USAGE.md` | His taste (all verdicts), the rules that protect creativity, the bench of vetoed blocks, the showreel table, the log of real reels |
| `HANDOFF.md` | Where things stand, every path, the commands, the traps, and what to say in a new chat |
| `showreel/` | `build_showreel.py` (blocks 01-17), `build_showreel2.py` (18-26: depth family and broadcast court; needs the whole-clip cut-out, see below), `build_showreel3.py` (27-38: the statement cards and wipes), `build_showreel4.py` (39-40: the drum on the video, a clay-studio number), `showreel-sheet-*.png` (what showreel 1 looks like) |

## Start a reel
`python C:\Users\Amir\.claude\skills\cut\tools\new_reel.py <slug>` makes `C:\Users\Amir\Videos\Reels\<slug>\v1\` with the
kit copied in (each reel keeps its own frozen copy, so a later kit change never alters a shipped reel) and a `build.py`
to fill in. The workflow around it is in `../SKILL.md`.

## The whole-clip cut-out (needed by the depth family)
`python C:\Users\Amir\.claude\skills\cut\tools\cutout.py <input.mp4> <out dir>`, run detached: about 7 s per source second
on the CPU (85 s = 10 min) plus 2 min for the alpha trim. It writes `full_cut_t.webm`; a segment that starts at source second S
uses `kit.behind_video("full_cut_t.webm", S, id="cutN")`. `BLOCKS.md` -> "The depth family and the cut-out" has the rest.

## Change the kit
Edit `kit.js` / `kit.css` here, then rebuild and render the showreels (`python showreel\build_showreel.py`, then
`hyperframes render` in `C:\Users\Amir\Videos\Reels\kit-showreel`; the same with `build_showreel2.py [depth|courts]` for
`kit-showreel2`; `build_showreel3.py [cards|wipes]` for `kit-showreel3`) and look at every block. A change that breaks a block
shows up there. Add new blocks to `BLOCKS.md` with a "do NOT use it when" column, and add a demo to the showreel.
