/* SHOT 2 — TYPE  (bar 2, 1.875–3.750 s)
 *
 * "EVERY FRAME IS a DECISION" on coral, one word per 8th note, each with its own motion:
 * a mask rise (EVERY), a staggered drop with overshoot (FRAME), an elastic pop (IS) and a swung-in serif italic (a),
 * then DECISION slides in letter by letter while its weight sweeps 200 → 900 and, on beat 3, extrudes into
 * 3D with a camera hit. A cubic-bezier graph editor sits top right and re-tunes its curve on every word;
 * a keyframe strip under it pops a diamond per word and a spring card re-springs its ball.
 *
 * Built from the kit (Content/motion/kit): backdrop, rise, tumble, pop, swing, monolith (the heavyweight word with its 3D block),
 * curve-lab, keyframes and spring-lab. The numbers are the reel's own, so the picture is exactly what it was.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL, E, clamp, prog, rgbaHex } = L;
  const BEAT = R.BEAT, W = R.W, H = R.H;
  const FS = 176, X0 = 118, BASE = [300, 496, 692, 888];      // the type size, the left edge, the four baselines
  const T_HIT = BEAT * 2;                                     // beat 3: DECISION extrudes and the screen flashes

  KIT.scene({
    id: 'shot2-type', label: 'TYPE', hud: { color: PAL.ink }, samples: 14,
    fx: { bloom: .12, ca: .45, grain: .045, vig: .22 },
    layers: [
      { piece: 'backdrop', params: { from: [W * .3, H * .42, 100], to: [W * .5, H * .5, 1250], stops: [[0, '#FF6A45'], [1, '#F24A24']] } },
      {
        /* the whole stage drifts in (a slow zoom) */
        transform: (ctx, t) => { const z = 1 + .035 * clamp(t / R.BAR); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2); },
        group: [
          {
            /* the words, pushed off to the left just before the next scene change */
            transform: (ctx, t) => { const push = 300 * E.inCubic(prog(t, 1.46, .42)); ctx.translate(-push, 0); },
            group: [
              { piece: 'rise', params: { text: 'EVERY', x: X0, y: BASE[0], size: FS } },
              { piece: 'tumble', params: { text: 'FRAME', x: X0, y: BASE[1], size: FS } },
              { piece: 'pop', params: { text: 'IS', x: X0, y: BASE[2], size: FS } },
              { piece: 'swing', params: { text: 'a', x: X0, y: BASE[2] + 2, after: 'IS', lineSize: FS } },
              { piece: 'monolith', params: { text: 'DECISION', x: X0, y: BASE[3], size: FS } },
            ],
          },
          { piece: 'curve-lab' },
          { piece: 'keyframes' },
          { piece: 'spring-lab' },
        ],
      },
      /* the beat-3 hit: a bone flash that decays fast */
      {
        fn: (ctx, t) => {
          const fl = t > T_HIT ? Math.exp(-(t - T_HIT) * 16) * .2 : 0;
          if (fl > .01) { ctx.fillStyle = rgbaHex(PAL.bone, fl); ctx.fillRect(0, 0, W, H); }
        },
      },
    ],
    cueList: [{ dt: BEAT * 3 - .1, kind: 'whoosh', props: { dir: 'in', dur: .5 } }],    // the push-off, into the slab
  });
})(window);
