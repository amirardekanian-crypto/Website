/* boot.js — load the fonts, flag the page ready for tools/render.js, or play it live. */
(function (g) {
  'use strict';
  const R = g.REEL;
  const q = new URLSearchParams(location.search);
  const FONTS = [
    '900 100px "Unbounded"', '200 100px "Unbounded"', '500 100px "Unbounded"',
    'italic 400 100px "Instrument Serif"', '400 100px "Instrument Serif"',
    '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '600 20px "Inter Tight"', '400 20px "Inter Tight"',
  ];

  Promise.all(FONTS.map(f => document.fonts.load(f, 'ABCxyz0123 ’—'))).then(() => document.fonts.ready).then(() => {
    R.fontsOk = FONTS.every(f => document.fonts.check(f));
    if (R.init) R.init();                       // shots that pre-compute (particles, glyph targets) do it here
    g.REEL_READY = true;

    if (q.has('render')) return;                // the renderer drives frames itself
    const live = { frame: 0, playing: !q.has('t'), t0: performance.now(), base: 0 };
    if (q.has('t')) live.frame = Math.round(parseFloat(q.get('t')) * R.FPS);
    const draw = () => R.renderFrame(live.frame, { samples: q.has('t') ? 6 : 2 });
    function loop(now) {
      if (live.playing) {
        live.frame = Math.floor(((now - live.t0) / 1000 * R.FPS + live.base) % (R.DUR * R.FPS));
        draw();
      }
      requestAnimationFrame(loop);
    }
    draw(); requestAnimationFrame(loop);
    addEventListener('keydown', e => {
      const step = e.shiftKey ? Math.round(R.BEAT * R.FPS) : 1, N = R.DUR * R.FPS;
      if (e.code === 'Space') { live.playing = !live.playing; if (live.playing) { live.t0 = performance.now(); live.base = live.frame; } e.preventDefault(); }
      else if (e.code === 'ArrowRight') { live.playing = false; live.frame = (live.frame + step) % N; draw(); }
      else if (e.code === 'ArrowLeft') { live.playing = false; live.frame = (live.frame - step + N) % N; draw(); }
      else if (e.code === 'KeyR') { live.frame = 0; live.t0 = performance.now(); live.base = 0; live.playing = true; }
    });
  });
})(window);
