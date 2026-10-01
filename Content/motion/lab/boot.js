/* boot.js (lab) — pick the sample named in the address, size the engine to it, build its scene, load the fonts, flag ready. */
(function (g) {
  'use strict';
  const R = g.REEL, KIT = g.KIT, L = g.L;
  const q = new URLSearchParams(location.search);
  const id = q.get('item'), lang = q.get('lang') === 'fa' ? 'fa' : 'en';
  const S = id && KIT.samples[id];
  const hint = document.getElementById('hint');

  if (!S) {
    document.title = 'Motion lab';
    hint.textContent = id ? `no sample called "${id}"` : 'samples: ' + Object.keys(KIT.samples).join(' · ');
    g.REEL_READY = true; g.LAB = { samples: Object.keys(KIT.samples) };
    return;
  }

  const W = +(q.get('w') || S.w), H = +(q.get('h') || S.h);
  R.configure({ W, H, DUR: S.dur, jolt: Object.assign({ on: false }, S.jolt || {}) });
  R.caMode = 'zoom';                                        // a new video: no coloured fringe at the frame edge
  R.hud = () => {};                                         // the lab shows the piece, not the reel's furniture
  R.hudText = { title: '', sub: '' };

  const out = document.getElementById('out');
  out.style.aspectRatio = W + ' / ' + H;
  out.style.width = `min(100vw, ${(W / H * 100).toFixed(3)}vh)`; out.style.height = 'auto';

  const look = KIT.use(S.look + (lang === 'fa' && S.look === 'brand' ? '-fa' : ''));
  const ctx = { id, lang, fa: lang === 'fa', rtl: lang === 'fa', W, H, DUR: S.dur, look, PAD: KIT.lab.PAD, TOP: KIT.lab.TOP, fx: KIT.fx };
  S.build(ctx);

  const FONTS = ['900 100px "Barlow Condensed"', '800 100px "Barlow Condensed"', '700 100px "Barlow Condensed"', '600 100px "Barlow Condensed"', '500 100px "Barlow Condensed"',
    '400 20px "Barlow"', '500 20px "Barlow"', '600 20px "Barlow"', '700 20px "Barlow"', '400 20px "Space Mono"', '700 20px "Space Mono"',
    '900 100px "Unbounded"', '500 20px "JetBrains Mono"', '600 20px "Inter Tight"'].concat(S.fonts || []);
  const FA = ['300 40px "Vazirmatn"', '500 40px "Vazirmatn"', '700 40px "Vazirmatn"', '900 40px "Vazirmatn"'];
  const all = lang === 'fa' ? FONTS.concat(FA) : FONTS;
  Promise.all(all.map(f => document.fonts.load(f, 'ABCxyz0123 ’' + (lang === 'fa' ? 'امیر۰۱۲۳۴۵۶۷۸۹ تمرین' : ''))).concat((S.images || []).map(u => KIT.media.load(u)))).then(() => document.fonts.ready).then(() => {
    R.fontsOk = all.every(f => document.fonts.check(f));
    if (R.init) R.init();
    g.REEL_READY = true; g.LAB = { id, lang, W, H, dur: S.dur, fps: R.FPS, samples: Object.keys(KIT.samples) };
    if (q.has('render')) return;

    hint.textContent = `${id}${lang === 'fa' ? ' · فارسی' : ''} · Space pause · ←/→ frame · R restart`;
    const live = { frame: 0, playing: !q.has('t'), t0: performance.now(), base: 0 };
    if (q.has('t')) live.frame = Math.round(parseFloat(q.get('t')) * R.FPS);
    const draw = () => R.renderFrame(live.frame, { samples: q.has('t') ? 6 : 2 });
    const N = Math.round(R.DUR * R.FPS);
    function loop(now) {
      if (live.playing) { live.frame = Math.floor((Math.max(0, now - live.t0) / 1000 * R.FPS + live.base) % N); draw(); }
      requestAnimationFrame(loop);
    }
    draw(); requestAnimationFrame(loop);
    addEventListener('keydown', e => {
      if (e.code === 'Space') { live.playing = !live.playing; if (live.playing) { live.t0 = performance.now(); live.base = live.frame; } e.preventDefault(); }
      else if (e.code === 'ArrowRight') { live.playing = false; live.frame = (live.frame + 1) % N; draw(); }
      else if (e.code === 'ArrowLeft') { live.playing = false; live.frame = (live.frame - 1 + N) % N; draw(); }
      else if (e.code === 'KeyR') { live.frame = 0; live.t0 = performance.now(); live.base = 0; live.playing = true; }
    });
  });
})(window);
