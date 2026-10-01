# The reel kit

**Continuing in a new chat? Read `HANDOFF.md` first.**

Motion-graphics ingredients for Amir's talking-head reels, proven on HCTV3230 (v1) and kept in this folder so every
later reel starts from working parts. **It exists to save time on plumbing, not to decide how a reel looks.**
Read `USAGE.md` before using it: the rules there are what keep his reels from looking alike.

| File | What it is |
|---|---|
| `kit.js` | The blocks, as functions (`K.stamps`, `K.chips`, `K.question`, `K.checklist`, `K.behind`, `K.cta`, wipes, flash ...), the **statement cards** (`K.number`, `K.slamBehind`, `K.versus`, `K.list`, `K.quote`) and the cut transition `K.whip`, the **depth family** (`K.stack`, `K.outline`, `K.drift`, `K.halo`, `K.sweep`, `K.backdrop`, `K.focus`) and the **broadcast court** (`K.courtSteps3d`, `K.courtMeasure3d`; the photo courts `K.courtSteps` / `K.courtMeasure` are kept for showreel 1 only), and **stage 3** (`K.diagram`, `K.curve`, `K.chapter`, `K.bodymap`: the diagram builder, the force-time curve, chapter labels, the body map) |
| `kit.css` | Their styles. A "mood" is a different set of the CSS variables at the top (Stamp is the default mood) |
| `kit.py` | The Python side: `scaffold`, `build`, the static media (`behind_video`, `sfx_html`), the `SFX` table (the eleven old sounds plus every sound card of the Motion Menu) |
| `template.html` | The page every reel is assembled into (reel-specific CSS, HTML and JS have their own slots) |
| `assets/`, `sfx/` | Vazirmatn, the two court photos, the ball, gsap, `data/bodymap.js` (the app's traced body for `K.bodymap`, made by `data/make_bodymap.py`); the eleven synthesised sounds (`step`, `rise` for the court; `tick`, `roll`, `swipe` for the cards, made by `sfx/make_sfx3.py`) and the 23 mp3 sounds that came in from his Motion Menu (2026-10-01) |
| `BLOCKS.md` | The catalogue: what each block is, its options, when to use it and when NOT to |
| `USAGE.md` | His taste (all verdicts), the rules that protect creativity, the bench of vetoed blocks, the showreel table, the log of real reels |
| `HANDOFF.md` | Where things stand, every path, the commands, the traps, and what to say in a new chat |
| `MENU.md`, `menu/menu.json` | **The connection to his Motion Menu artifact**: read his marks and ideas before a reel, add every new block as a card after, tidy it when it fills up. `menu.json` (version 2) is the source of the WHOLE menu: 78 cards with When and How, and `retired` (what left on 2026-10-01 and why) |
| `showreel/` | `build_showreel.py` (blocks 01-17), `build_showreel2.py` (18-26: depth family and broadcast court; needs the whole-clip cut-out, see below), `build_showreel3.py` (27-38: the statement cards and wipes), `build_showreel4.py` (39-40: the drum on the video, a clay-studio number), `build_showreel5.py` (41-49: diagrams, the force-time curve, chapter labels, the body map; takes `diagram`, `curve`, `chapter` or `body`), `build_showreel6.py` (50-52: the diagram on his own video picks a layout that fits, the chapter band), `showreel-sheet-*.png` (what showreel 1 looks like) |

## Words we use (so he and I mean the same thing; he asked, 2026-10-01: "what do you call each of these? are they visuals? are they animations?")
- **Visual**: the general word for anything the viewer sees that helps what he says (a graphic, a chart, a photo, a clip). The creative director decides, beat by beat, which visual a moment needs.
- **Motion graphic** (or animated graphic): a designed graphic that moves: words, numbers, shapes, charts, diagrams. **Everything in this kit is a motion graphic.** "Animation" is only the
  movement itself (the pulse running along the arrow, the curve drawing); it also means cartoons and animated films, so we say motion graphic.
- **Block**: our name for one ready-made motion graphic in the kit (`K.diagram`, `K.curve`, `K.chapter`, `K.bodymap` ...). **Family**: blocks that belong together (the depth family, the
  statement cards). **Showreel**: the demo video that shows blocks on his own footage (idea generation, he is not editing it). **The list** = `BLOCKS.md`, with its cue table.
- **Overlay**: a graphic placed over his own video, his face stays (39, 43, 47, 50, 51). **Card** (full-screen card): a graphic that covers the whole screen while his voice carries on
  (41, 42, 46, the number slam, versus). He prefers the overlay when the text fits.
- **Lower third**: a strip across the lower part of the screen (the broadcast word for a name or title strip). The chapter band (47, 52) is a big one.
- **Diagram** (flow or process diagram): steps joined by arrows (41-43, 50-51). **Graph / chart**: the force-time curve (44-45). **Anatomy graphic** (muscle map): 48-49.
  **Chapter label** (chapter title): 46, 47, 52. **Kinetic type**: animated words and numbers (the number slam, the stamps, the word behind him). **Text behind subject** (depth text): words
  between the wall and him (12, 18-20; needs the cut-out). **Split screen**: versus (30-31). **Drum**: the 3D list (32, 39).
- **Transition / wipe**: how one thing replaces another (the clay wipe, iris, push, the whip). **Cut-in / punch-in**: a quick zoom into his footage. **SFX**: the small sounds under the graphics.

## His own list: the Motion Menu (an artifact he made for himself) — **connected to /cut since 2026-10-01, see `MENU.md`**
`https://claude.ai/artifact/REg9vwGxmf4pddShMtZemA` (private, his own). "A place for all my motion graphics to exist at once, just for me to see, to drop, to add or to edit." After the tidy-up of
2026-10-01 it has **78 cards** in four tabs, grouped by the job each one does (224 items before; the rest were merged into these or removed, see `MENU.md` and `menu/menu.json` -> `retired`):
**Moves** 14 (wipes and cuts, camera moves, how a word arrives), **Reels** 32 (words and stamps, numbers and charts, lists and steps, against each other, curves and force, body and movement, court,
behind you, chapters, questions and the ask, and "Yours" for his own ideas), **Design** 8 (signal colours, Farsi type, five easings, sound lock), **Sounds** 24 (sweeps, builds, hits, ticks, bells, sport and
body, music). He marks each card **Keep** (use it), **Maybe** (ask him first) or **Drop** (never use it, and it leaves at the next tidy-up), renames it or leaves a note (the pencil), and adds an idea of his own with **+ Add**.
- **Ingredients, not recipes:** every card says what it is, **When** you would use it, **How** (the call to copy, or "Not built."), what you can change, the sounds that go with it, "Close to", "Also called"
  (the old cards it swallowed, with their numbers) and "You said" (his verdict in his words). A card with forms (On your video | Full card, Pulse | Line) has buttons on its picture. A green `/cut` tag
  means it is built; **Ready in /cut** filters to those (every sound counts: it can be cued by its name). Search finds the block name too (`K.curve`) and old names (`portal` finds Iris).
- **Read it before a reel:** `MENU.md` section 1 (`Artifact read`, `ArtifactData list` on `marks` and `adds`, then `python tools\menu_read.py ...`). His marks are in the page's database, one document per card id
  (`v` keep/maybe/drop, `alias`, `note`, `no`, `name`); his ideas are in collection `adds` (`name`, `label`, `link`, `status` new or built). **A mark he sets later beats anything written here.**
- **It is "the list"** in the creative-director rule (`USAGE.md` rule 7): use Keep, ask about Maybe, Drop leaves. After building something new, add its card (`MENU.md` section 2). Republishing the
  page for this is part of finishing a block (he asked for the connection on 2026-10-01: "update and edit as you think is best"); never overwrite a mark of his, and say what you changed.
- **Its numbers are not the showreel numbers**: menu 41 is gone (it was Spring Lab), showreel 41 is the diagram chain. Always say "menu N" or "showreel N". A removed number is never used again; the next new card is 226.
- **Sounds:** the menu's sounds are the kit's sound table (`kit.py` reads them from `menu.json`): `sfx=[(E(t), "thump")]`. The old kit names still work.

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
`kit-showreel2`; `build_showreel3.py [cards|wipes]` for `kit-showreel3`; `build_showreel5.py [diagram|curve|chapter|body]` for `kit-showreel5`) and look at every block. A change that breaks a block
shows up there. Add new blocks to `BLOCKS.md` with a "do NOT use it when" column, and add a demo to the showreel.
