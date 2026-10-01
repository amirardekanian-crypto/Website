/* SHOT 1 — POINT  (bar 1, 0.000–1.875 s)
 *
 * A coral dot on black. It arcs up, lands on beat 2 and a ruler line zips out from under it.
 * On a 32nd-note roll six letters drop onto the line (M-O-T-I-O-N), then the dot hops across the word
 * and lands on beat 3 as the full stop. "MOTION." The full stop then floods the screen (transition 1).
 * The dot is the reel's mark: it comes back as the full stop of CLAUDE. in the last shot.
 *
 * Built from the kit (Content/motion/kit): backdrop, dot-grid, crosshair, ruler, thud (and its dust), shock rings (Tremor),
 * the ball (Squash, Hop) and a caption. The numbers are the reel's own, so the picture is exactly what it was.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL } = L;
  const BEAT = R.BEAT, W = R.W, STEP = BEAT / 8;
  const F = 648;                                            // the floor line
  const T_LAND1 = BEAT;                                     // dot touches down: beat 2
  const T_PERIOD = BEAT * 2;                                // full stop lands: beat 3
  const dot = () => KIT.marks.dot;                          // where the full stop sits, published by the thud piece

  R.inits.push(() => { R.dotMark = KIT.marks.dot; });       // the scene change that floods from the full stop still reads it from here

  KIT.scene({
    id: 'shot1-point', label: 'POINT', hud: { color: PAL.bone }, samples: 16,
    fx: { bloom: .18, ca: .5, grain: .05, vig: .38 },
    layers: [
      { piece: 'backdrop', params: { from: [W / 2, 560, 80], to: [W / 2, 560, 1150], stops: [[0, '#16161F'], [1, PAL.ink]] } },
      { piece: 'dot-grid' },
      { piece: 'crosshair' },
      { id: 'ruler', piece: 'ruler', params: { at: T_LAND1 } },
      { id: 'thud', piece: 'thud', params: { at: T_PERIOD, step: STEP } },
      /* shock rings: heartbeat at 0, floor shock at touch-down, full-stop shock on beat 3 */
      { piece: 'shock-ring', params: { x: 960, y: 540, r0: () => dot().r, r1: () => dot().r + 110, at: 0, dur: .55 } },
      { piece: 'tremor', params: { at: T_LAND1 } },
      { piece: 'shock-ring', params: { x: () => dot().x, y: F, r0: 10, r1: 420, at: T_PERIOD, dur: .5, flat: .12 } },
      { id: 'ball', piece: 'ball', params: { r: () => dot().r, hopX: () => dot().x } },
      { piece: 'caption', params: { at: T_PERIOD + .02, clip: [0, F + 76, W, 40] } },
    ],
    cueOrder: ['ball', 'ruler', 'thud'],                    // the hit and the zip share a time: the hit is written first, as it always was
    cueList: [{ dt: BEAT * 3 + .06, kind: 'riser', props: { dur: BEAT * 1 - .06 } }],   // swell into the drop
  });
})(window);
