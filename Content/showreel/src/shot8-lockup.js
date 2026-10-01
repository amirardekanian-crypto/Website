/* SHOT 8 — LOCKUP  (bar 8, 13.125–15.000 s)
 *
 * The bookend. The coral dot from the last plate hangs above black. CLAUDE punches in letter by letter on the bar line,
 * the dot arcs across and lands as the full stop on beat 2 (the same move as MOTION. in shot 1, mirrored), a hairline
 * shoots out, the credit line and the tagline rise. Everything fades to ink for the loop.
 *
 * Built from the kit (Content/motion/kit/lockup.js): punch-in, afterglow, the dot, the hairline and the fade, with the kit's
 * backdrop, dot grid and caption. The numbers are the reel's own, so the picture is exactly what it was.
 * Written here: the slow push-in over the whole hold, and the two pings of the credit line and the tagline.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL, E, clamp, prog } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W;
  const T0 = BAR * 7;                                        // where this shot starts
  const F = 560;                                             // the line the word stands on
  const rel = abs => abs - T0;                               // a time written the old way (T0 + ...) as an offset from the shot start, to the last bit
  const lockup = () => KIT.marks.lockup;                     // where the full stop sits, published by punch-in

  KIT.scene({
    id: 'shot8-lockup', label: 'CLAUDE',
    hud: { color: PAL.bone, tl: 0, bl: 1, alphaAt: t => 1 - E.inQuad(prog(t, 1.5, .34)) },
    samples: 14,
    fx: { bloom: .2, ca: .5, grain: .05, vig: .38 },
    layers: [
      { piece: 'backdrop', params: { from: [W / 2, 520, 80], to: [W / 2, 520, 1150] } },
      { piece: 'dot-grid', params: { step: 96, from: 96, size: 2, alpha: .09 } },
      /* slow push-in over the whole hold */
      {
        group: [
          { piece: 'punch-in', params: { text: 'CLAUDE', y: F } },
          { piece: 'lockup-rule', params: { at: BEAT, y: F + 52 } },
          { piece: 'caption', params: { text: 'MOTION DESIGN REEL', x: W / 2 - 700, y: F + 104, at: .62, dur: .34, rise: 46, clip: [0, F + 72, W, 44], font: '500 20px "JetBrains Mono"', track: '7px', color: PAL.bone, alpha: .7, align: 'left' } },
          { piece: 'caption', params: { text: '2026', x: W / 2 + 700 + 7, y: F + 104, at: .62, dur: .34, rise: 46, clip: [0, F + 72, W, 44], font: '500 20px "JetBrains Mono"', track: '7px', color: PAL.bone, alpha: .7, align: 'right' } },
          { piece: 'caption', params: { text: 'everything starts as a point.', y: F + 222, at: .78, dur: .4, rise: 100, clip: [0, F + 150, W, 110], font: 'italic 400 70px "Instrument Serif"', track: '0px', color: PAL.bone, alpha: .92, align: 'center' } },
          { piece: 'afterglow', params: { at: BEAT, x: () => lockup().x, y: F } },
          { piece: 'lockup-dot', params: { hopX: () => lockup().x, floor: F } },
        ],
        transform: (ctx, t) => { const z = 1 + .035 * clamp(Math.max(0, t) / 1.8); ctx.translate(W / 2, 540); ctx.scale(z, z); ctx.translate(-W / 2, -540); },
      },
      { piece: 'lockup-fade' },
    ],
    cueList: [{ dt: rel(T0 + .64), kind: 'ping', props: { i: 0 } }, { dt: rel(T0 + .8), kind: 'ping', props: { i: 1 } }],
  });
})(window);
