/* samples-diagram.js — samples for the marks and diagrams (annotate.js). Farsi versions are drafts for Amir to read. */
(function (g) {
  'use strict';
  const KIT = g.KIT, L = g.L, T = KIT.text;
  const FX = { bloom: .05, ca: 0, grain: .035, vig: .22 };
  const scene = (c, layers, extra) => KIT.scene(Object.assign({ id: c.id, label: c.id.toUpperCase(), t0: 0, dur: c.DUR, fx: FX, layers: [KIT.lab.stage(c.W, c.H)].concat(layers) }, extra));
  /* a line of plain type for the samples: { text, x, y, size, align, color, weight } */
  const word = (o) => ({ fn(ctx, t) {
    const fa = KIT.rtl(), size = o.size * (fa ? .88 : 1);
    ctx.font = KIT.face(fa ? 'display' : 'display', size, o.weight || 800); ctx.fillStyle = KIT.role(o.color || 'normal'); ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = o.at != null ? L.clamp((t - o.at) / .15) : 1;
    T.put(ctx, (!fa && o.caps !== false) ? o.text.toUpperCase() : o.text, o.x, o.y, o.align || 'center', fa);
  } });
  g.SAMPLE_WORD = word;

  KIT.sample('marker', {
    dur: 4.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { W, fa } = c, size = 150, font = KIT.face('display', size * (fa ? .88 : 1), 800);
      const words = fa ? ['نیرو', 'زمان', 'توان', 'سرعت'] : ['Force', 'Time', 'Power', 'Speed'], ys = [640, 900, 1160, 1420], styles = ['bar', 'underline', 'box', 'loop'];
      const layers = [];
      words.forEach((w, i) => {
        const txt = fa ? w : w.toUpperCase(), box = T.box(font, txt, W / 2, ys[i], size * (fa ? .88 : 1), 'center', fa ? 'rtl' : 'ltr');
        layers.push({ piece: 'marker', params: { box, style: styles[i], at: .5 + i * .8, color: 'key', pad: 18, thick: 12 } });
        layers.push(word({ text: w, x: W / 2, y: ys[i], size, color: styles[i] === 'bar' ? 'clayWhite' : 'normal' }));
      });
      scene(c, layers);
    },
  });

  KIT.sample('arrow', {
    dur: 3.4, langs: ['en'], fx: FX,
    build(c) {
      const { W } = c;
      scene(c, [
        { piece: 'arrow', params: { from: [180, 640], to: [900, 640], at: .3, dur: .7 } },
        { piece: 'arrow', params: { from: [180, 940], to: [900, 1040], bend: -150, at: 1.0, dur: .8, color: 'normal' } },
        { piece: 'arrow', params: { from: [180, 1340], to: [900, 1340], dash: [26, 22], width: 8, at: 1.8, dur: .8, color: 'fixText' } },
      ]);
    },
  });

  KIT.sample('bracket', {
    dur: 3.6, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { W, fa } = c;
      scene(c, [
        { fn(ctx, t) { ctx.strokeStyle = 'rgba(242,238,229,.2)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(200, 760, 680, 520, 12); ctx.stroke(); } },
        { piece: 'bracket', params: { from: [200, 760], to: [880, 760], label: fa ? '۱۰ متر' : '10 m', at: .4, offset: 0, side: 'above' } },
        { piece: 'bracket', params: { from: [880, 760], to: [880, 1280], label: fa ? '۵ متر' : '5 m', at: 1.3, side: 'right', offset: -1, color: 'normal', labelColor: 'normal' } },
      ]);
    },
  });

  KIT.sample('label-line', {
    dur: 5, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const names = fa ? ['قدم اول', 'قدم دوم', 'قدم سوم'] : ['First step', 'Second step', 'Third step'];
      const pts = [[360, 700], [500, 900], [620, 1100]];
      /* a moving point (a tracked ball) and a callout that follows it */
      const ball = t => [560 - 260 * L.clamp((t - 2.6) / 1.9), 1380 - 90 * Math.sin(L.clamp((t - 2.6) / 1.9) * Math.PI)];
      scene(c, [
        { fn(ctx) { ctx.strokeStyle = 'rgba(242,238,229,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(320, 640); ctx.lineTo(660, 1160); ctx.stroke(); } },
      ].concat(pts.map((p, i) => ({ piece: 'label-line', params: { point: p, to: [p[0] + (i % 2 ? -110 : 150), p[1] - 70], text: names[i], at: .4 + i * .6, size: 52, color: i === 2 ? 'keyText' : 'normal', lineColor: i === 2 ? 'key' : 'soft' } })),
      [
        { fn(ctx, t) { if (t < 2.4) return; const b = ball(t); ctx.globalAlpha = L.clamp((t - 2.4) / .2); ctx.fillStyle = '#F2EEE5'; ctx.beginPath(); ctx.arc(b[0], b[1], 22, 0, Math.PI * 2); ctx.fill(); } },
        { piece: 'label-line', params: { point: ball, to: t => { const b = ball(t); return [b[0] + 110, b[1] - 120]; }, text: fa ? 'دنبال توپ' : 'Follows the ball', at: 2.6, size: 50, color: 'normal', lineColor: 'keyText' } },
      ]));
    },
  });

  KIT.sample('chain', {
    dur: 5.4, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const nodes = fa
        ? [{ text: 'قدرت' }, { text: 'نیرو × زمان' }, { text: 'نرخ تولید نیرو' }, { text: 'عملکرد ورزشی', role: 'key' }]
        : [{ text: 'Strength' }, { text: 'Force × time' }, { text: 'Rate of force development' }, { text: 'Sport performance', role: 'key' }];
      scene(c, [{ piece: 'chain', params: { nodes, x: 540, y: 960, at: .3 } }]);
    },
  });

  KIT.sample('force-curve', {
    dur: 4.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      scene(c, [{ piece: 'force-curve', params: { box: [130, 760, 820, 560], at: .2, peak: true, xLabel: fa ? 'زمان' : 'TIME', yLabel: fa ? 'نیرو' : 'FORCE', peakLabel: fa ? 'اوج' : 'PEAK', curves: [{ curve: 'sprint-contact', color: 'key', at: .8, dur: 1.9 }] } }]);
    },
  });

  KIT.sample('slope-line', {
    dur: 4.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c, box = [130, 760, 820, 560], curves = [{ curve: 'sprint-contact', color: 'normal', at: .5, dur: 1.3 }];
      scene(c, [
        { piece: 'force-curve', params: { box, at: .1, fill: false, xLabel: fa ? 'زمان' : 'TIME', yLabel: fa ? 'نیرو' : 'FORCE', curves } },
        { piece: 'slope-line', params: { box, curve: 'sprint-contact', from: .03, to: .2, at: 2.1, showCurve: false, label: fa ? 'نرخ تولید نیرو' : 'RFD', sub: fa ? 'نیرو ÷ زمان' : 'FORCE ÷ TIME' } },
      ]);
    },
  });

  KIT.sample('same-peak', {
    dur: 7.4, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      scene(c, [{ piece: 'same-peak', params: { box: [130, 760, 820, 560], at: .1, xLabel: fa ? 'زمان' : 'TIME', yLabel: fa ? 'نیرو' : 'FORCE',
        curves: [{ curve: 'fast', color: 'key', label: fa ? 'سریع' : 'FAST', at: .6, dur: 1.2, labelAt: .09, labelDx: 30, labelDy: 14, labelAlign: 'left' }, { curve: 'slow', color: 'normal', label: fa ? 'کند' : 'SLOW', at: 2.0, dur: 1.7, labelAt: .74, labelDx: 0, labelDy: 74, labelAlign: 'center' }], marker: { time: .22, label: fa ? '۱۰۰ میلی‌ثانیه' : '100 MS', at: 4.3 } } }]);
    },
  });
})(window);
