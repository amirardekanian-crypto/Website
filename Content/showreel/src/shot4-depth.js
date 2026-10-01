/* SHOT 4 — DEPTH  (bar 4, 5.625–7.500 s)
 *
 * A trefoil torus knot (8,320 quads) on a cobalt stage. It draws itself on along its path, takes a spin kick on beat 2,
 * and on beat 3 a scan line sweeps across turning solid into X-ray wireframe. On the last beat the camera dives through the
 * knot's hole (into the glitch cut). Behind it: a giant outlined word, a tilted orbit ring with three satellites and drifting
 * dust, all on their own parallax.
 *
 * Built from the kit (Content/motion/kit/depth.js): backdrop, soft-lights, ghost-word, motes, the orbit's far half, the knot
 * (Trefoil, Spin Kick, X-Ray and Dive are its four moves), the orbit's near half, the scan line and the readout. The numbers are
 * the reel's own, so the picture is exactly what it was.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL } = L;
  const W = R.W, H = R.H;
  const K = KIT.resolve('knot').p;                          // the knot's own numbers: the camera that every depth piece shares
  const FACES = (K.segments * K.sides).toLocaleString('en-US');

  KIT.scene({
    id: 'shot4-depth', label: 'DEPTH', hud: { color: PAL.bone }, samples: 8,
    fx: { bloom: .36, ca: .6, grain: .05, vig: .3 },
    layers: [
      /* ground: cobalt with a lit centre and drifting soft lights */
      { piece: 'backdrop', params: { from: [W * .56, H * .46, 60], to: [W * .5, H * .5, 1250], stops: [[0, '#4560FF'], [.5, PAL.cobalt], [1, '#0A1370']] } },
      { piece: 'soft-lights' },
      /* the word behind everything, the dust, the far half of the ring */
      { piece: 'ghost-word' },
      { piece: 'motes' },
      { piece: 'orbit', params: { half: 'back' } },
      /* the knot, then the near half of the ring over it, then the scan line over both */
      { piece: 'knot', params: { parts: ['knot'] } },
      { piece: 'orbit', params: { half: 'front' } },
      { piece: 'knot', params: { parts: ['line'] }, cues: false },
      /* spec line: fades out as the dive starts */
      { piece: 'readout', params: { text: ['TORUS KNOT (2,3)', `${FACES} FACES · SOFTWARE 3D`], out: [K.diveAt, K.diveDur] } },
    ],
    cueList: [{ dt: 0, hit: 1, props: { portal: 1 } }],     // the iris lands on the bar line (the knot's own cues come from the knot)
  });
})(window);
