// Off the Glass, the rest game (assets/js/rally.js, 2026-10-17): node scripts/headless/rally.js [--out <dir>]
//
// The door on the rest timer opens a shelf, and Off the Glass's row opens the game over the running rest; the rest clock shows on the court and matches the timer; a swipe
// hits the ball (a touch lifts the racket above the thumb); a ball through Amir's gap is your point and through yours is his; five wins
// the match, which says so and keeps the best rally and the wins in `rally_stats` (this phone only); Play again starts at 0-0; Back and
// ✕ return to the timer, still running; the rest running out freezes the game ("Time. Next set.") and closes it with the timer; twenty
// seconds of Amir playing alone keeps every body on the court with no NaN; the clock is whole at 320 and 390 px and under the demo banner;
// no yellow in the file. Serve the repo first (python -m http.server 8779 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const t = H.checker();
const wait = (p, ms) => p.waitForTimeout(ms);

// The door opens the shelf (2026-10-18) and the row opens the game; the shelf may already be open from the last time, so the door is tapped only when it is folded.
async function rallyRow(p) {
  if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
  await p.click('#timerGames [data-game="rally"]');
}

async function openGame(browser, opts = {}) {
  const P = H.fixture();
  const o = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: P }, opts.demo ? { query: '?client=demo', stub: { demo: P } } : {}, opts));
  await o.p.evaluate(() => openRest(120, 'Back Squat'));
  await wait(o.p, 300);
  await rallyRow(o.p);
  await o.p.waitForFunction(() => window.Rally && Rally.isOpen(), null, { timeout: 8000 });
  await wait(o.p, 400);
  return o;
}

(async () => {
  const browser = await H.launch();
  const out = H.outDir();
  const errors = [];
  try {
    // ── 1. open, clock, swipe ──
    let { ctx, p } = await openGame(browser);
    p.on('pageerror', e => errors.push(String(e)));
    const st = await p.evaluate(() => { const s = Rally._state(); return { W: s.W, H: s.H, vis: document.getElementById('rallyOverlay').classList.contains('visible'),
      timer: document.getElementById('timerOverlay').classList.contains('visible'), clock: s.clock.querySelector('b').textContent, left: timerLeft() }; });
    t.check('Play opens the game over the rest timer', st.vis && st.timer, JSON.stringify(st));
    t.check('the court fills the screen', st.W === 390 && st.H > 700, st.W + 'x' + st.H);
    const lm = st.left;
    t.check('the court shows the rest clock', st.clock === Math.floor(lm / 60) + ':' + String(lm % 60).padStart(2, '0') || Math.abs(parseInt(st.clock.split(':')[1]) - lm % 60) <= 1, st.clock + ' vs ' + lm);
    const box = await p.evaluate(() => { const r = document.querySelector('.rally-clock').getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
    t.check('the clock is whole at 390 px', box[0] >= 0 && box[1] <= box[2], box.join(','));
    await p.screenshot({ path: path.join(out, 'rally-open-390.png') });

    const hit = await p.evaluate(async () => {
      const s = Rally._state(), cv = s.cv, rc = cv.getBoundingClientRect();
      await new Promise(r => setTimeout(r, 800));   // past the serve's pause
      const ev = (ty, x, y) => cv.dispatchEvent(new PointerEvent(ty, { pointerId: 1, pointerType: 'mouse', clientX: rc.left + x, clientY: rc.top + y, bubbles: true }));
      const bx = s.ball.x, by = s.ball.y, y0 = s.ball.y;
      ev('pointerdown', bx, by + 110);
      for (let i = 0; i < 14; i++) { ev('pointermove', bx, by + 110 - i * 18); await new Promise(r => requestAnimationFrame(r)); }
      ev('pointerup', bx, by - 140);
      return { rally: s.rally, vy: s.ball.vy, moved: y0 - s.ball.y, nan: [s.ball.x, s.ball.y, s.ball.vx, s.ball.vy].some(Number.isNaN) };
    });
    t.check('a swipe up hits the ball up the court', hit.rally >= 1 && hit.vy < 0 && !hit.nan, JSON.stringify(hit));

    const lift = await p.evaluate(() => {
      const s = Rally._state(), rc = s.cv.getBoundingClientRect(), y = s.H * 0.8;
      s.cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', clientX: rc.left + 100, clientY: rc.top + y, bubbles: true }));
      const ty = s.target.y;
      s.cv.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', clientX: rc.left + 100, clientY: rc.top + y, bubbles: true }));
      return y - ty;
    });
    t.check('a touch puts the racket above the thumb', lift > 20, lift);

    // ── 2. points, the match, the stats ──
    const pts = await p.evaluate(async () => {
      const s = Rally._state(), f = () => new Promise(r => requestAnimationFrame(r));
      const shoot = async up => {
        for (let k = 0; k < 60 && s.freeze > 0; k++) await f();
        s.ball.x = s.W / 2; s.ball.y = up ? s.top + 40 : s.H - 60; s.ball.vx = 0; s.ball.vy = up ? -900 : 900;
        s.amir.x = 30; s.you.x = s.W - 30;   // out of the way
        for (let k = 0; k < 30; k++) await f();
      };
      await shoot(true); const a = Object.assign({}, s.score);
      await shoot(false); const b = Object.assign({}, s.score);
      return { a, b };
    });
    t.check('the ball through Amir\'s gap is your point', pts.a.you === 1 && pts.a.amir === 0, JSON.stringify(pts.a));
    t.check('the ball through your gap is Amir\'s point', pts.b.you === 1 && pts.b.amir === 1, JSON.stringify(pts.b));

    const won = await p.evaluate(async () => {
      const s = Rally._state(), f = () => new Promise(r => requestAnimationFrame(r));
      s.best = 9;
      while (!s.over) {
        for (let k = 0; k < 60 && s.freeze > 0; k++) await f();
        s.ball.x = s.W / 2; s.ball.y = s.top + 40; s.ball.vx = 0; s.ball.vy = -900; s.amir.x = 30;
        for (let k = 0; k < 20; k++) await f();
      }
      const m = s.msg;
      return { over: s.over, score: s.score, hidden: m.hidden, title: m.querySelector('h3').textContent, text: m.querySelector('p').textContent,
        stats: JSON.parse(localStorage.getItem('rally_stats') || 'null'), synced: Object.keys(localStorage).filter(k => /rally/.test(k)) };
    });
    t.check('five points win the match and it says so', won.over && won.score.you === 5 && !won.hidden && /You win 5–1/.test(won.title), JSON.stringify(won));
    t.check('the best rally and the wins are kept on this phone', won.stats && won.stats.best === 9 && won.stats.wins === 1 && won.stats.played === 1, JSON.stringify(won.stats));
    t.check('its key is not an athlete key (never synced)', won.synced.length === 1 && won.synced[0] === 'rally_stats', won.synced.join(','));
    await p.screenshot({ path: path.join(out, 'rally-won-390.png') });
    await p.click('.rally-go');
    await wait(p, 200);
    const again = await p.evaluate(() => { const s = Rally._state(); return { sc: s.score, over: s.over, hidden: s.msg.hidden }; });
    t.check('Play again starts at 0-0', again.sc.you === 0 && again.sc.amir === 0 && !again.over && again.hidden, JSON.stringify(again));

    // ── 3. Amir alone for 20 s: the bodies stay on the court ──
    // Your racket is parked in the far corner: nobody defends. (It used to sit dead centre in front of his gap, and he now aims for
    // the middle of the biggest hole beside your racket, which for a racket parked in the middle is two 14 px slivers at the posts:
    // he scores on that too, but not within 20 s every time, and this check only ever meant "he can finish a point when nobody defends".)
    const solo = await p.evaluate(async () => {
      const s = Rally._state(); let bad = 0, maxV = 0;
      s.target.x = 30; s.target.y = s.H - 40;
      const t0 = performance.now();
      while (performance.now() - t0 < 20000 && !s.over) {
        await new Promise(r => requestAnimationFrame(r));
        const b = s.ball;
        if ([b.x, b.y, b.vx, b.vy, s.amir.x, s.amir.y].some(v => !Number.isFinite(v))) bad++;
        if (s.amir.y > (s.top + s.H) / 2 + 2 || s.amir.x < 0 || s.amir.x > s.W) bad++;
        if (b.y > -100 && (b.x < -5 || b.x > s.W + 5)) bad++;
        maxV = Math.max(maxV, Math.hypot(b.vx, b.vy));
      }
      // The 20 s above ran in the page's own frames. He scores on a racket in the corner within 20 s nine times in ten (a dead ball waits
      // 3 s for its re-serve, and his aim is off by design), so if he has not yet, play on in Rally._tick steps (no drawing) up to 90 s of game
      // time: measured, he always scores by then.
      for (let k = 0; k < 90 * 60 && s.score.amir < 1 && !s.over; k++) Rally._tick(1 / 60);
      return { bad, score: s.score, capped: maxV <= s.vmax + 1 };
    });
    t.check('twenty seconds of Amir alone: no NaN, nothing off the court, speed capped', solo.bad === 0 && solo.capped, JSON.stringify(solo));
    t.check('Amir scores on an empty racket', solo.score.amir >= 1, JSON.stringify(solo.score));

    // ── 3b. a ball trapped between the two rackets against the glass (found 2026-10-18 by a bot: it shook in place for
    // ever, the rally ran into the thousands and every substep buzzed). It must be served again within 3-4 s, count as
    // no rally, and ring at most ~11 times a second per racket. ──
    const pinch = await p.evaluate(async () => {
      const s = Rally._state(), f = () => new Promise(r => requestAnimationFrame(r));
      for (let k = 0; k < 60 && s.freeze > 0; k++) await f();
      const mid = (s.top + s.H - 8) / 2, x = 8 + s.br + 1;
      const base = s.rally;                                              // what the earlier solo play left on the counter
      s.rally = 0; s.lastHit = ''; s.lastHitT = -1;                      // the trap starts a fresh rally, as a serve leaves it
      s.ball.x = x; s.ball.y = mid + 2; s.ball.vx = 0; s.ball.vy = 0;
      s.over = false; s.score.you = 0; s.score.amir = 0;
      let maxRally = 0, rings = 0, lastFx = -1, moved = false, t0 = performance.now(), at = null;
      while (performance.now() - t0 < 5000) {
        s.target.x = x; s.target.y = s.ball.y + s.rr * 0.6;              // the player pushes the ball up into the net
        s.amir.x = x + 6; s.amir.y = Math.min(s.ball.y - s.br - s.rr + 4, mid - s.rr);   // and Amir leans on it from above
        await f();
        if (s.fxT.you !== undefined && s.fxT.you !== lastFx) { rings++; lastFx = s.fxT.you; }
        if (!moved) maxRally = Math.max(maxRally, s.rally);
        if (!moved && Math.hypot(s.ball.x - x, s.ball.y - (mid + 2)) > s.br * 4) { moved = true; at = (performance.now() - t0) / 1000; }
        if (moved) break;
      }
      return { moved, at, rally: maxRally, rings, base };
    });
    t.check('a ball trapped between the rackets is served again in about 3 s', pinch.moved && pinch.at > 1 && pinch.at < 4.2, JSON.stringify(pinch));
    // Before the ball counts as jammed (0.3 s in its circle) hits count 0.12 s apart, so at most three get through: 0, 0.12 and 0.24 s.
    // <= 5, not 3: the jam window is 0.3 s of game time, so one anchor reset during the first squeeze can let a 4th hit through on a loaded machine (seen once, 2026-10-18). The bug it guards was thousands.
    t.check('a trapped ball adds a few hits at most (the three before it counts as jammed), not thousands', pinch.rally <= 5, JSON.stringify(pinch));
    t.check('a trapped ball goes quiet: a few rings at most, not one per frame', pinch.rings <= 6, JSON.stringify(pinch));

    // ── 4. Back and ✕ return to the running rest ──
    await p.evaluate(() => history.back());
    await wait(p, 400);
    let back = await p.evaluate(() => ({ game: Rally.isOpen(), vis: document.getElementById('rallyOverlay').classList.contains('visible'),
      timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning }));
    t.check('Back closes the game, the rest keeps running', !back.game && !back.vis && back.timer && back.running, JSON.stringify(back));
    await rallyRow(p);
    await p.waitForFunction(() => Rally.isOpen());
    await p.click('.rally-x');
    await wait(p, 200);
    back = await p.evaluate(() => ({ game: Rally.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning }));
    t.check('✕ closes the game, the rest keeps running', !back.game && back.timer && back.running, JSON.stringify(back));

    // ── 5. the rest runs out mid-game ──
    await rallyRow(p);
    await p.waitForFunction(() => Rally.isOpen());
    await p.evaluate(() => { timerEndsAt = Date.now() + 2000; });
    await wait(p, 1100);
    const low = await p.evaluate(() => document.querySelector('.rally-clock').classList.contains('low'));
    t.check('the clock turns clay in the last 10 seconds', low);
    await wait(p, 1200);
    const up = await p.evaluate(() => { const s = Rally._state(); return s ? { timeUp: s.timeUp, title: s.msg.querySelector('h3').textContent, hidden: s.msg.hidden } : null; });
    t.check('the rest running out stops the game and says so', up && up.timeUp && !up.hidden && up.title === 'Time. Next set.', JSON.stringify(up));
    await p.screenshot({ path: path.join(out, 'rally-timeup-390.png') });
    await wait(p, 1500);
    const gone = await p.evaluate(() => ({ game: Rally.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), html: document.getElementById('rallyOverlay').innerHTML.length }));
    t.check('then the game and the timer close together', !gone.game && !gone.timer && gone.html === 0, JSON.stringify(gone));
    await ctx.close();

    // ── 6. 320 px and the demo banner ──
    ({ ctx, p } = await openGame(browser, { w: 320, h: 568 }));
    const b320 = await p.evaluate(() => { const r = document.querySelector('.rally-clock').getBoundingClientRect(), x = document.querySelector('.rally-x').getBoundingClientRect();
      return { l: r.left, r: r.right, xl: x.left, w: innerWidth, sw: document.documentElement.scrollWidth }; });
    t.check('at 320 px the clock is whole and clear of ✕', b320.l >= 0 && b320.r <= b320.xl && b320.sw <= b320.w, JSON.stringify(b320));
    await p.screenshot({ path: path.join(out, 'rally-open-320.png') });
    await ctx.close();
    ({ ctx, p } = await openGame(browser, { demo: true }));
    const demo = await p.evaluate(() => { const b = document.querySelector('.demo-banner, #demo-banner'); const o = document.getElementById('rallyOverlay').getBoundingClientRect();
      return { bannerBottom: b ? b.getBoundingClientRect().bottom : null, top: o.top }; });
    t.check('in the demo the game sits under the banner', demo.bannerBottom == null || demo.top >= demo.bannerBottom - 1, JSON.stringify(demo));
    await p.screenshot({ path: path.join(out, 'rally-demo-390.png') });
    await ctx.close();

    // ── 7. the file ──
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'rally.js'), 'utf8');
    const hexes = src.match(/#[0-9a-fA-F]{6}\b/g) || [];
    const yellow = hexes.filter(h => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40) return false;
      let hue; if (mx === r) hue = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) hue = 60 * ((b - r) / (mx - mn) + 2); else hue = 60 * ((r - g) / (mx - mn) + 4);
      if (hue < 0) hue += 360; return hue >= 38 && hue <= 70; });
    t.check('no yellow, gold or amber in the game', yellow.length === 0, yellow.join(','));
    t.check('the page logged no error', errors.length === 0, errors.join(' | '));
  } catch (e) {
    t.check('the run finished', false, e.stack || String(e));
  } finally {
    await browser.close();
  }
  console.log('screenshots: ' + out);
  process.exit(t.report() ? 1 : 0);
})();
