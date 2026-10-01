/* samples-body.js — samples for the athlete and force pieces (figure.js), and for the muscle light-up (anatomy.js). */
(function (g) {
  'use strict';
  const KIT = g.KIT, L = g.L, T = KIT.text;
  const FX = { bloom: .05, ca: 0, grain: .035, vig: .22 };
  const scene = (c, layers, extra) => KIT.scene(Object.assign({ id: c.id, label: c.id.toUpperCase(), t0: 0, dur: c.DUR, fx: FX, layers: [KIT.lab.stage(c.W, c.H)].concat(layers) }, extra));

  /* a drawing aid, not a Menu item: every pose side by side, to judge them */
  KIT.sample('dev-poses', {
    dur: 1, langs: ['en'], fx: FX, dev: true,
    build(c) {
      const names = ['ready', 'split-step', 'first-step', 'drive', 'plant'], layers = [];
      names.forEach((n, i) => {
        layers.push({ piece: 'figure', params: { poses: [{ pose: n, at: 0 }], x: 130 + i * 205, groundY: 600 + (i % 2) * 0, height: 330, ground: true } });
        layers.push({ fn(ctx) { ctx.font = '600 22px "Barlow"'; ctx.fillStyle = '#F2EEE5'; ctx.textAlign = 'center'; ctx.fillText(n, 130 + i * 205, 660); } });
      });
      scene(c, layers);
    },
  });
  KIT.sample('figure', {
    dur: 5.6, langs: ['en'], fx: FX,
    build(c) {
      /* the athlete holds a ready stance, takes a split step, then runs: the poses alternate and the body travels, leaving afterimages */
      const run = t => 240 + L.clamp((t - 2.5) / 3.0) * 380;
      scene(c, [{ piece: 'figure', params: {
        poses: [{ pose: 'ready', at: 0 }, { pose: 'split-step', at: 1.2 }, { pose: 'ready', at: 1.75 }, { pose: 'first-step', at: 2.5 }, { pose: 'drive', at: 3.1 }, { pose: 'first-step', at: 3.7 }, { pose: 'drive', at: 4.3 }, { pose: 'first-step', at: 4.9 }],
        blend: .3, x: run, groundY: 1250, height: 760, ghosts: 3, ghostStep: .1,
      } }]);
    },
  });

  KIT.sample('ground-reaction', {
    dur: 4.2, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const fig = { poses: [{ pose: 'ready', at: 0 }, { pose: 'first-step', at: 1.0 }], blend: .5, x: 400, groundY: 1280, height: 720, dir: 1 };
      scene(c, [
        { piece: 'figure', params: Object.assign({ highlight: ['legB'], alpha: t => 1 - .45 * L.clamp((t - 1.4) / .5) }, fig) },
        { piece: 'ground-reaction', params: { figure: fig, foot: 'toeB', up: 400, forward: 250, at: 1.5, dur: .7, label: fa ? 'نیروی زمین' : 'GROUND PUSH', upLabel: fa ? 'عمودی' : 'UP', forwardLabel: fa ? 'جلو' : 'FORWARD' } },
      ]);
    },
  });

  KIT.sample('force-arrow', {
    dur: 3.6, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c, rise = t => { const u = L.clamp((t - 1.3) / 2.1); return .18 + .82 * Math.pow(Math.sin(Math.PI * u), 2); };
      scene(c, [
        { fn(ctx) { ctx.strokeStyle = 'rgba(242,238,229,.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(160, 1300); ctx.lineTo(920, 1300); ctx.stroke(); } },
        { piece: 'force-arrow', params: { from: [300, 1296], angle: -90, length: 560, at: .3, label: fa ? 'نیروی بزرگ' : 'BIG FORCE', labelSide: 'right' } },
        { piece: 'force-arrow', params: { from: [760, 1296], angle: -90, length: 560, at: 1.0, color: 'normal', labelColor: 'normal', follow: rise, label: fa ? 'نیرو' : 'FORCE', labelSide: 'right' } },
      ]);
    },
  });

  KIT.sample('muscle-map', {
    dur: 6.6, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      scene(c, [{ piece: 'muscle-map', params: {
        views: [{ view: 'front', at: 0 }, { view: 'back', at: 3.2 }],
        lights: [{ muscle: 'quads', at: 1.0, role: 'main', view: 'front' }, { muscle: 'adductors', at: 1.7, role: 'helper', view: 'front' }, { muscle: 'glutes', at: 4.1, role: 'main', view: 'back' }, { muscle: 'hamstrings', at: 4.7, role: 'helper', view: 'back' }, { muscle: 'calves', at: 5.3, role: 'main', view: 'back' }],
        at: .2, labelSide: fa ? 'right' : 'left', x: fa ? 450 : 630,
      } }]);
    },
  });

  KIT.sample('pose-strip', {
    dur: 4.4, langs: ['en', 'fa'], fx: FX,
    build(c) {
      const { fa } = c;
      const poses = fa
        ? [{ pose: 'split-step', label: 'اسپلیت استپ' }, { pose: 'first-step', label: 'قدم اول' }, { pose: 'drive', label: 'شتاب‌گیری' }]
        : [{ pose: 'split-step', label: 'Split step' }, { pose: 'first-step', label: 'First step' }, { pose: 'drive', label: 'Acceleration' }];
      scene(c, [{ piece: 'pose-strip', params: { poses, x: 540, groundY: 1000, w: 980, height: 400, at: .3, step: 1.0 } }]);
    },
  });
})(window);
