/* SHOT 6 — INTERFACE  (bar 6, 9.375–11.250 s)
 *
 * A light bento dashboard after the dark of the last shot. Seven cards spring in on a stagger and every one has its
 * own micro-interaction: a chart that draws itself with a tooltip, a donut that counts to 87, a toggle driven by a
 * cursor click, a slider drag, springy bars, a live fps counter with an ECG strip, a checklist that ticks itself.
 * The cursor is a real path with ease, press and click ripples. Springs everywhere (L.spring).
 *
 * Built from the kit (Content/motion/kit/screens.js): the bento (its cards hold the pulse line, ring counter, switch, scrub,
 * skyline, odometer + lifeline and tick list) and the pointer on top. The numbers are the reel's own, so the picture is exactly
 * what it was. The only things written here are the sounds of the scene change out (the punch and the whoosh into the whip pan).
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W, H = R.H;
  const T0 = BAR * 5;                                       // where this shot starts
  const rel = abs => abs - T0;                              // a time written the old way (T0 + ...) as an offset from the shot start, to the last bit

  KIT.scene({
    id: 'shot6-interface', label: 'INTERFACE', hud: { color: PAL.ink }, samples: 10,
    fx: { bloom: .06, ca: .3, grain: .04, vig: .08 },
    layers: [
      { piece: 'backdrop', params: { type: 'linear', from: [0, 0], to: [W, H], stops: [[0, '#F7F4EE'], [1, '#ECE6DA']] } },
      { piece: 'bento', when: [-.4, Infinity] },             // nothing but the backdrop before 0.4 s ahead of the bar line
      { piece: 'pointer', when: [-.4, Infinity] },
    ],
    cueList: [
      { dt: BEAT * 3, hit: .4, props: { punch: 1 } },
      { dt: rel(T0 + BEAT * 3 - .12), kind: 'whoosh', props: { dir: 'pan', dur: .35 } },
    ],
  });
})(window);
