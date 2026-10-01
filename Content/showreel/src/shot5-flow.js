/* SHOT 5 — FLOW  (bar 5, 7.500–9.375 s)
 *
 * 5,200 particles. At the bar line they burst from the centre and are carried by a curl-noise flow field,
 * painting additive light trails. Between 0.46 s and beat 3 each one is drawn onto its own point of the word
 * "FLOW" (sampled from the real glyph outlines), colours sorted left to right into a spectrum, so order
 * appears out of chaos exactly on the beat. After a short hold the word detonates outward.
 *
 * Built from the kit (Content/motion/kit/particles.js): backdrop, the particle field (Big Bang, Current, Assembly and Supernova
 * are its four moves) and the readout. The field is simulated once at load (fixed 1/120 s steps) and read back by time, so any
 * frame can be rendered on its own. The numbers are the reel's own, so the picture is exactly what it was.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL } = L;
  const W = R.W, H = R.H;
  const N = KIT.resolve('particle-field').p.count;          // the field's own count, for the readout

  KIT.scene({
    id: 'shot5-flow', label: 'FLOW', hud: { color: PAL.bone }, samples: 4,
    fx: { bloom: .55, ca: .55, grain: .055, vig: .34 },
    layers: [
      { piece: 'backdrop', params: { from: [W / 2, H / 2, 60], stops: [[0, '#12121B'], [1, '#07070B']] } },
      { piece: 'particle-field' },
      /* caption: rolls in, and slides back out as it fades */
      { piece: 'readout', params: { text: ['FLOW FIELD', `${N.toLocaleString('en-US')} PARTICLES · CURL NOISE`], at: .15, rise: 18, out: [1.5, .3], slideOut: true } },
    ],
    cueList: [{ dt: 0, hit: 1, props: { glitch: 1 } }],     // the flash cut lands on the bar line (the field's own cues come from the field)
  });
})(window);
