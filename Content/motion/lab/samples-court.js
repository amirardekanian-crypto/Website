/* samples-court.js — samples for the court pieces (court.js). Farsi versions are drafts for Amir to read. */
(function (g) {
  'use strict';
  const KIT = g.KIT, L = g.L, T = KIT.text;
  const FX = { bloom: .05, ca: 0, grain: .035, vig: .22 };
  const scene = (c, layers, extra) => KIT.scene(Object.assign({ id: c.id, label: c.id.toUpperCase(), t0: 0, dur: c.DUR, fx: FX, layers: [KIT.lab.stage(c.W, c.H)].concat(layers) }, extra));
  const COURT = { sport: 'tennis', x: 540, y: 960, ppm: 58, orient: 'v' };
  g.SAMPLE_COURT = COURT;

  KIT.sample('court', {
    dur: 3.4, langs: ['en'], fx: FX,
    build(c) { scene(c, [{ piece: 'court', params: Object.assign({}, COURT, { at: .2, dur: 1.6 }) }]); },
  });

  KIT.sample('metre-marks', {
    dur: 5.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      scene(c, [
        { piece: 'court', params: Object.assign({}, COURT, { at: 0, dur: 1.0 }) },
        { piece: 'metre-marks', params: { court: COURT, from: [0, 11.885], dir: [0, -1], marks: [2, 5, 8, 13], at: 1.1, step: .6, highlight: { from: 0, to: 5, at: 2.3 } } },
      ]);
    },
  });

  KIT.sample('scale-bar', {
    dur: 5.4, langs: ['en', 'fa'], fx: FX,
    build(c) { scene(c, [{ piece: 'scale-bar', params: { x: 88, y: 940, w: 904, at: .3 } }]); },
  });

  KIT.sample('sprint-trace', {
    dur: 3.6, langs: ['en'], fx: FX,
    build(c) {
      scene(c, [
        { piece: 'court', params: Object.assign({}, COURT, { at: 0, dur: .8 }) },
        { piece: 'sprint-trace', params: { court: COURT, points: [[-2.8, 10.2], [-2.4, 6.2], [0.4, 2.6], [3.4, 0.9]], at: .9, dur: 1.9 } },
      ]);
    },
  });

  KIT.sample('cut-angle', {
    dur: 3.4, langs: ['en', 'fa'], fx: FX,
    build(c) { scene(c, [{ piece: 'cut-angle', params: { apex: [560, 980], inAngle: 55, outAngle: -35, length: 400, radius: 150, at: .3, dur: 1.6 } }]); },
  });

  KIT.sample('footfalls', {
    dur: 3.6, langs: ['en'], fx: FX,
    build(c) {
      scene(c, [
        { piece: 'court', params: Object.assign({}, COURT, { at: 0, dur: .6 }) },
        { piece: 'footfalls', params: { court: COURT, at: .8, step: .26 } },
      ]);
    },
  });
})(window);
