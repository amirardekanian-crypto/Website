/* samples-text.js — samples for the number and word pieces (numbers.js). Farsi versions are drafts for Amir to read. */
(function (g) {
  'use strict';
  const KIT = g.KIT;
  const FX = { bloom: .05, ca: 0, grain: .035, vig: .22 };
  const scene = (c, layers, extra) => KIT.scene(Object.assign({ id: c.id, label: c.id.toUpperCase(), t0: 0, dur: c.DUR, fx: FX, layers: [KIT.lab.stage(c.W, c.H)].concat(layers) }, extra));

  KIT.sample('tally', {
    dur: 3.6, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { W, fa } = c;
      scene(c, [
        { piece: 'tally', params: { to: 13, unit: fa ? 'متر' : 'm', x: W / 2, y: 900, size: 420, at: .3, dur: 1.4 } },
        { piece: 'tally', params: { to: 2.4, decimals: 1, unit: fa ? 'ثانیه' : 's', x: W / 2, y: 1240, size: 190, weight: 700, at: 1.5, dur: 1.2, color: 'soft', unitColor: 'soft' } },
      ]);
    },
  });

  KIT.sample('span', {
    dur: 3.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { W, fa } = c;
      scene(c, [{ piece: 'span', params: { a: 2, b: 13, unit: fa ? 'متر' : 'm', x: W / 2, y: 1000, size: 300, at: .3, dur: 1.2 } }]);
    },
  });

  KIT.sample('tiers', {
    dur: 4.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const lines = fa
        ? [{ text: 'شتاب‌گیری تو تنیس کوتاهه', tier: 'head' }, { text: 'بیشتر دویدن‌ها تو زمین فقط چند قدم طول می‌کشن.', tier: 'body' }, { text: 'برای همین قدم‌های اول از همه مهم‌ترن.', tier: 'detail' }]
        : [{ text: 'Short bursts decide the point', tier: 'head' }, { text: 'Most runs on court last only a few steps.', tier: 'body' }, { text: 'So the first steps matter most.', tier: 'detail' }];
      scene(c, [{ piece: 'tiers', params: { lines, x: 88, y: 700, w: 904, at: .3, step: .55 } }]);
    },
  });

  KIT.sample('key-words', {
    dur: 4.4, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const words = fa
        ? [['بیشترِ', 0], ['شتاب‌گیری‌های', 1], ['تنیس', 0], ['خیلی', 0], ['کوتاه‌ان', 1]].map(([text, key], i) => ({ t: .3 + i * .55, text, key: !!key }))
        : [['Most', 0], ['tennis', 0], ['accelerations', 1], ['are', 0], ['actually', 0], ['very', 0], ['short', 1]].map(([text, key], i) => ({ t: .3 + i * .42, text, key: !!key }));
      scene(c, [{ piece: 'key-words', params: { words, x: 88, y: 640, w: 904, size: fa ? 140 : 168, ghost: .12, align: fa ? 'right' : 'left' } }]);
    },
  });

  KIT.sample('strike-fix', {
    dur: 3.6, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { W, fa } = c;
      scene(c, [{ piece: 'strike-fix', params: fa
        ? { wrong: 'فقط سنگین بزن', fix: 'سنگین بزن، سریع حرکت کن', x: W / 2, y: 900, size: 110 }
        : { wrong: 'Just lift heavy', fix: 'Lift heavy. Move fast.', x: W / 2, y: 900, size: 120 } }]);
    },
  });
})(window);
