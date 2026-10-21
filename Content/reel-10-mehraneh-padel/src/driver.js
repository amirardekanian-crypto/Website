/* driver.js — the three ways a timeline reel runs. Load it AFTER engine.js and the reel's scenes.js.

   default        autoplay + loop, scaled to the window, with a scrub bar (space = play/pause, left/right = 0.1 s, click the bar to seek)
   ?t=SECONDS     one frozen frame at native size (tools/still.js drives this)
   ?capture=1     exact 1080x1920, no chrome (tools/render_timeline.js drives this; it calls window.__render(t) as often as it likes)

   What the reel (scenes.js) must define, as globals:
     const DUR            total seconds
     function init()      build what has to be built (called once, after the fonts are in); may push promises into PRELOAD (plateLoad, loadSprite)
     function render(t)   paint the frame for t seconds; PURE: no clocks, no state that outlives the call
   Optional:
     const FONTS = [['800 40px Vazirmatn','سلام'], ...]     fonts to wait for (default: Vazirmatn 400-900)
     function soundPlan() -> [{t, k, ...cue}]               the sound cues (see tools/make_sfx.py for the kinds)
     function scrollEnv()  -> [{t, a, b}]                    page-scroll speeds for a velocity-following swish
   Query string values are in QS (a URLSearchParams) for variants such as ?hook=b. */
'use strict';
const QS = new URLSearchParams(location.search);
const CAPTURE = QS.has('capture');
document.body.classList.toggle('capture', CAPTURE);

function fit() {
  const f = document.getElementById('fit');
  if (CAPTURE) { f.style.transform = 'none'; return; }
  const s = Math.min(innerWidth / W, (innerHeight - (QS.has('t') ? 0 : 46)) / H);
  f.style.transform = `translate(${(innerWidth - W * s) / 2}px,0) scale(${s})`;
}
addEventListener('resize', fit);

window.__DUR = DUR;
window.__render = t => { render(t); };
if (typeof soundPlan === 'function') {
  window.__sound = () => ({
    dur: DUR,
    impacts: Ball.impacts.map(i => ({ t: i.t, x: i.x, y: i.y, mag: i.mag, snd: i.snd || null, phone: i.phone || null, medal: !!i.medal, pill: !!i.pill, skip: !!i.skip })),
    cues: soundPlan(), scroll: typeof scrollEnv === 'function' ? scrollEnv() : [],
  });
}
window.__ready = (async () => {
  const fonts = (typeof FONTS !== 'undefined' && FONTS.length) ? FONTS : [['400 40px Vazirmatn', 'سلام'], ['600 40px Vazirmatn', 'سلام'], ['800 40px Vazirmatn', 'سلام'], ['900 100px Vazirmatn', 'سلام ۰۱۲۳']];
  try { await Promise.all(fonts.map(f => document.fonts.load(f[0], f[1]))); await document.fonts.ready; } catch (e) { }
  init(); fit();
  try { await Promise.all(PRELOAD); await Promise.all([...document.images].map(i => i.decode ? i.decode().catch(() => { }) : 0)); } catch (e) { }
  render(QS.has('t') ? +QS.get('t') : 0);
  window.__isReady = true;
  return true;
})();

if (!CAPTURE && !QS.has('t')) {
  let playing = true, t0 = performance.now(), tNow = 0;
  window.__ready.then(() => {
    const ppEl = document.getElementById('pp'), tt = document.getElementById('tt'), bar = document.getElementById('bar'), bari = document.getElementById('bari');
    const loop = now => {
      if (playing) tNow = ((now - t0) / 1000) % (DUR + .4);
      const t = Math.min(tNow, DUR);
      render(t); tt.textContent = t.toFixed(2); bari.style.width = (t / DUR * 100) + '%';
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    ppEl.onclick = () => { playing = !playing; ppEl.textContent = playing ? '⏸' : '▶'; if (playing) t0 = performance.now() - tNow * 1000; };
    bar.onclick = e => { const r = bar.getBoundingClientRect(); tNow = (e.clientX - r.left) / r.width * DUR; t0 = performance.now() - tNow * 1000; };
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); ppEl.onclick(); }
      if (e.code === 'ArrowRight') { tNow = Math.min(DUR, tNow + .1); t0 = performance.now() - tNow * 1000; }
      if (e.code === 'ArrowLeft') { tNow = Math.max(0, tNow - .1); t0 = performance.now() - tNow * 1000; }
    });
  });
}
