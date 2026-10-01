/* SHOT 7 — RHYTHM  (bar 7, 11.250–13.125 s)
 *
 * Eight plates on eighth-note beats, one primitive each: DOT · LINE · RING · SQUARE · TRIANGLE · CROSS · ARC · POINT.
 * Point and line to plane. Every cut between plates is a different technique (whip, iris, blinds, glitch slices,
 * zoom-through, pixelate, flip), 4–5 frames each. The last plate shrinks the dot to a point and lifts it
 * to where the lockup will pick it up.
 *
 * Built from the kit (Content/motion/kit): the eight plates (Dot Pop, Slash, Ripple, Twist, Tip Over, Spinner, Sweep, Pinpoint, in the
 * Colour Plates look, each with its Ghost Numeral and label) and the seven cuts (Whiplash, Pinhole, Venetian, Shatter, Tunnel, Mosaic,
 * Flipcard). The plates carry the reel's colours, numbers and labels as their defaults, so the scene only says when each one lands.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL, clamp } = L;
  const BAR = R.BAR, W = R.W, H = R.H, S8 = R.BEAT / 2;
  const PRE = .06, POST = .09;                              // a cut starts PRE before the beat it lands on and ends POST after it: .15 s in all

  /* the eight plates, one per eighth note. bg and color are the Colour Plates look; hud is the colour of the frame furniture over each plate */
  const PLATES = [
    { piece: 'dot-pop',  bg: PAL.ink,    color: PAL.coral,  hud: PAL.bone },
    { piece: 'slash',    bg: PAL.cobalt, color: PAL.bone,   hud: PAL.bone },
    { piece: 'ripple',   bg: PAL.mint,   color: PAL.ink,    hud: PAL.ink },
    { piece: 'twist',    bg: PAL.coral,  color: PAL.ink,    hud: PAL.ink },
    { piece: 'tip-over', bg: PAL.bone,   color: PAL.cobalt, hud: PAL.ink },
    { piece: 'spinner',  bg: PAL.ink,    color: PAL.mint,   hud: PAL.bone },
    { piece: 'sweep',    bg: PAL.lilac,  color: PAL.ink,    hud: PAL.ink },
    { piece: 'pinpoint', bg: PAL.ink,    color: PAL.coral,  hud: PAL.bone },
  ].map((P, k) => Object.assign(P, { params: { at: k * S8, bg: P.bg, color: P.color } }));

  /* the seven cuts, one across each plate boundary. A plain whip (no zoom, no gap) is the first; the flip needs the colour of the plate on each side. */
  const CUTS = [
    { join: 'whiplash', params: { zoom: 0, gap: 0 } },
    { join: 'pinhole' },
    { join: 'venetian' },
    { join: 'shatter' },
    { join: 'tunnel' },
    { join: 'mosaic' },
    { join: 'flipcard', params: { bg: [PLATES[6].bg, PLATES[7].bg] } },
  ].map((C, c) => Object.assign(C, { params: Object.assign({ at: (c + 1) * S8, pre: PRE, post: POST }, C.params) }));
  const cutFrom = c => CUTS[c].params.at - CUTS[c].params.pre;                  // when cut c starts
  const cutDur = c => CUTS[c].params.pre + CUTS[c].params.post;
  const cutTo = c => cutFrom(c) + cutDur(c);                                    // and when it is over

  /* a cut straddles each plate boundary: both plates are drawn on their own canvases, then the join mixes them onto the frame */
  const cA = L.canvas(W, H), cB = L.canvas(W, H), cAx = cA.getContext('2d'), cBx = cB.getContext('2d');
  function runCut(ctx, t, c) {
    KIT.draw(PLATES[c].piece, cAx, t, PLATES[c].params);
    KIT.draw(PLATES[c + 1].piece, cBx, t, PLATES[c + 1].params);
    KIT.cut(CUTS[c].join, ctx, cA, cB, (t - cutFrom(c)) / cutDur(c), CUTS[c].params);
  }

  const shot = KIT.scene({
    id: 'shot7-rhythm', label: 'RHYTHM', samples: 26,
    hud: { color: PAL.bone, colorAt: t => PLATES[clamp(Math.floor((t + .02) / S8), 0, 7)].hud },
    fx: { bloom: .22, ca: .5, grain: .045, vig: .14 },
    layers: [
      /* each plate is on screen by itself between the cuts: the first from before the shot starts, the last to the end */
      ...PLATES.map((P, k) => ({ piece: P.piece, params: P.params, when: [k ? cutTo(k - 1) : -Infinity, k < 7 ? cutFrom(k) : Infinity] })),
      /* and each cut owns the short window across its plate boundary */
      ...CUTS.map((C, c) => ({ when: [cutFrom(c), cutTo(c)], fn: (ctx, t) => runCut(ctx, t, c) })),
    ],
    cueList: [{ dt: BAR - .5, kind: 'riser', props: { dur: .5 } }],              // into the lockup
  });
  /* the whoosh of each cut falls PRE before its beat (the plates' stab and hit come from the plates themselves) */
  CUTS.forEach(C => KIT.cue(C.join, shot.t0, C.params));
})(window);
