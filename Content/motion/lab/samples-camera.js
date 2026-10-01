/* samples-camera.js — samples for the chapter rail, the camera moves, the metaphors and the colour language. Farsi versions are drafts for Amir to read. */
(function (g) {
  'use strict';
  const KIT = g.KIT, L = g.L;
  const FX = { bloom: .05, ca: 0, grain: .035, vig: .22 };
  const scene = (c, layers, extra) => KIT.scene(Object.assign({ id: c.id, label: c.id.toUpperCase(), t0: 0, dur: c.DUR, fx: FX, layers: [KIT.lab.stage(c.W, c.H)].concat(layers) }, extra));

  KIT.sample('chapters', {
    dur: 8.4, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const names = fa ? ['مشکل', 'چرا اتفاق می‌افته', 'چیکار کنیم', 'نتیجه'] : ['The problem', 'Why it happens', 'What to do', 'Takeaway'];
      const chapters = names.map((label, i) => ({ label, from: i * 2, to: (i + 1) * 2 }));
      scene(c, [{ piece: 'chapters', params: { chapters, at: .1 } }]);
    },
  });

  const plateLayer = (extra) => Object.assign({ piece: 'camera', params: {} }, extra);
  const CAM = { dur: 4.2, langs: ['en'], fx: FX, images: ['/court-sessions.jpg'] };
  KIT.sample('push-in', Object.assign({}, CAM, { build(c) { KIT.scene({ id: c.id, label: 'PUSH IN', t0: 0, dur: c.DUR, fx: FX, layers: [{ piece: 'push-in', params: { content: { piece: 'plate', params: {} } } }] }); } }));
  KIT.sample('pull-out', Object.assign({}, CAM, { build(c) { KIT.scene({ id: c.id, label: 'PULL OUT', t0: 0, dur: c.DUR, fx: FX, layers: [{ piece: 'pull-out', params: { content: { piece: 'plate', params: {} } } }] }); } }));
  KIT.sample('drift', Object.assign({}, CAM, { build(c) { KIT.scene({ id: c.id, label: 'DRIFT', t0: 0, dur: c.DUR, fx: FX, layers: [{ piece: 'drift', params: { content: { piece: 'plate', params: {} } } }, { piece: 'tiers', params: { lines: [{ text: 'Room for a graphic', tier: 'head' }], x: 88, y: 1180, w: 904, at: 1.9, rise: 30 } }] }); } }));
  KIT.sample('there-and-back', Object.assign({}, CAM, { dur: 5.4, build(c) { KIT.scene({ id: c.id, label: 'THERE AND BACK', t0: 0, dur: c.DUR, fx: FX, layers: [{ piece: 'there-and-back', params: { content: { piece: 'plate', params: {} } } }] }); } }));

  KIT.sample('rev-dial', {
    dur: 4.4, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      scene(c, [{ piece: 'rev-dial', params: { x: 540, y: 900, at: .1, steps: fa ? [{ at: .5, value: .2, text: 'موتور' }, { at: 1.4, value: .52, text: 'توان' }, { at: 2.3, value: .9, text: 'سرعت' }] : undefined } }]);
    },
  });

  KIT.sample('not-equal', {
    dur: 3.6, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      scene(c, [{ piece: 'not-equal', params: fa ? { a: 'نیروی زیاد، ولی کند', b: 'عملکرد ورزشی', size: 124 } : { a: 'Big force, but slow', b: 'Sport performance', size: 132 } }]);
    },
  });

  KIT.sample('signal-colours', {
    dur: 4.6, langs: ['en', 'fa'], fx: FX,
    build(c) { scene(c, [{ piece: 'signal-key', params: { at: .3 } }]); },
  });
})(window);
