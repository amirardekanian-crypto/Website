# The kit: every Motion Menu item, callable by name

The Menu (`../catalog.json`) names 143 things. The kit is the code behind them: each visual item is a **piece** you can call
with `KIT.draw('ruler', ctx, t, params)`, each scene change is a **join**, and the rest are data (looks, fonts, easing, rules).
The showreel is rebuilt from these pieces, and a tool proves it renders **exactly** the frames it did before.

## Files

| File | What |
|---|---|
| `core.js` | the registry and the rules: `KIT.piece`, `KIT.join`, `KIT.alias`, `KIT.draw`, `KIT.transition`, `KIT.cut`, `KIT.scene`, `KIT.cue`, `KIT.fit`, `KIT.text`, `KIT.describe` |
| `data.js` | looks, type pairs, easing ("feel"), house rules |
| `furniture.js`, `weight.js` | pieces: backdrop, dot-grid, crosshair, caption · shock-ring (Tremor), ruler, thud (Dust), ball (Squash, Hop), heartbeat |
| `type.js`, `cells.js`, `panels.js` | type moves · the cell grid (Bullseye, Quarter Turn, Pills, Gravity) and Paper · graph editor, keyframes, spring card |
| `depth.js`, `particles.js` | the 3D knot scene (Trefoil ... Ghost Word) · the particle field (Big Bang ... Supernova) |
| `screens.js`, `lockup.js` | the bento cards · the lockup (Punch In, Afterglow) |
| `plates.js`, `joins.js` | the eight plates (Dot Pop ... Pinpoint) · every scene change (Full Stop ... Flipcard) |

## How a piece is written

```js
KIT.piece('ruler', {
  group: 'weight',
  doc: 'A line shoots out and prints its tick marks and numbers.',
  defaults: { x: 960, y: 648, half: 864, at: 0, dur: .55, color: PAL.bone },      // every knob, set to what the reel used
  params:   { x: 'where it shoots out from', half: 'half the final length (px)', at: 'when it starts (s)' },   // one line each
  cues: p => [{ dt: 0, kind: 'zip', props: { dur: .5 } }, { dt: .04, kind: 'ticks', props: { dur: .45 } }],   // its sounds, after p.at
  draw(ctx, t, p, env) { ... },     // t = the caller's clock in seconds; p.at = this piece's start on that clock
});
KIT.alias('tremor', 'shock-ring', { flat: .12 }, 'A flat ring ripples out along the floor.');   // a Menu name for a preset
```

Rules (the rebuild proof depends on them):

1. **Time.** `draw(ctx, t, p, env)`: `t` is on the caller's clock, the piece's own start is `p.at`, and the code uses
   `prog(t, p.at + x, d)` exactly as the reel's code did. Do not "simplify" the arithmetic: `a - (b + c)` is not always `(a - b) - c`
   in floating point, and the proof is bit for bit.
2. **Params.** Defaults equal the reel's numbers. A param may be a function (`r: () => KIT.marks.dot.r`); resolve with `KIT.val(p.r)`.
   Every number in the Menu's *You can change* list is a param.
3. **State.** `KIT.draw` wraps every call in `ctx.save() / ctx.restore()`. A piece sets everything it needs (`fillStyle`, `font`,
   `lineWidth`, `textAlign`, `letterSpacing`, `globalAlpha`...) and never relies on what an earlier piece left on the context.
4. **Order.** Drawing order belongs to the caller (the scene's `layers`). Where the reel drew a ring before a ball, the scene lists
   the ring first. If the reel drew letter 1, its dust, then letter 2, a piece that draws "a letter and its dust" keeps that order.
5. **Heavy work** (a mesh, a simulation, text layout) goes in `warm(p, env)` with a `warmKey(p)`; it runs once, after the fonts load,
   before the first frame. Pure functions only: the same frame must come out whichever page renders it.
6. **Cues.** `cues(p)` lists templates `{ dt, kind, props }` or `{ dt, hit: amplitude, props }`, seconds after `p.at`. `KIT.scene`
   registers them at the scene start + `p.at` + `dt`, **in the order of the scene's layers**, or the order of `cueOrder` (a list of layer
   ids) when two cues share a time and the order matters. `props` must never contain a key called `kind` (it would replace the cue's own).
7. **Names.** The piece or alias id is the Menu id (`catalog.json`), so `KIT.has('rise')` is true. A Menu item that is one phase of a
   bigger system is an alias of that system with a preset (`squash` = `ball` with `phases: ['flight', 'contact']`).
8. **Docs.** `doc` and one line per param. `KIT.describe(id)` returns them; `tools/kit_docs.js` prints the whole kit as `PIECES.md`.
9. **A scene change is a join:** `KIT.join(id, { pre, post, fxMix, draw(ctx, A, B, p, t, params, env), fx(p, params) })`.
   `KIT.transition(id, params)` gives the object `REEL.transition` wants; `KIT.cut(id, ctx, A, B, p, params)` runs the same code inline.

## A scene

```js
KIT.scene({
  id: 'shot1-point', label: 'POINT', hud: { color: PAL.bone }, samples: 16, fx: { bloom: .18, ca: .5, grain: .05, vig: .38 },
  layers: [
    { piece: 'backdrop', params: { ... } },
    { id: 'ruler', piece: 'ruler', params: { at: BEAT } },
    { group: [ ...layers ], transform: (ctx, t, env) => { ... } },       // a group with its own transform
    { fn: (ctx, t, env) => { ... } },                                    // inline code, when a piece does not fit
    { piece: 'caption', params: { ... }, when: [1.0, 1.8] },             // only between these scene times
  ],
  cueOrder: ['ball', 'ruler'], cueList: [{ dt: 1.4, kind: 'riser', props: { dur: .4 } }],
});
```

## The proof

`Content/motion/baseline/reel.json` holds the SHA-256 of every one of the reel's 450 frames and its cue sheet. `tools/verify.js` renders
frames in headless Chromium and compares:

```
node Content/motion/tools/verify.js check --page showreel/reel.html --baseline Content/motion/baseline/reel.json --range 56-112 --workers 2
```

It prints how many frames differ and whether the cue sheet is identical, and exits 1 on any difference. `--dump DIR` writes the differing
frames as PNG so you can look. The reel is deterministic (same frames whichever worker renders them), so any difference is a real change.
