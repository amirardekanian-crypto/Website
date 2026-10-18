// Split Step and the rest games' shelf (assets/js/splitstep.js, 2026-10-18): node scripts/headless/splitstep.js [--out <dir>]
//
// One door on the rest timer ("Play while you rest") opens a shelf with a row for each game, the game played last on this phone first
// (Split Step first when there is no history); a row opens its game full screen over the running rest, the court shows the rest clock and
// it matches the timer; a clean First Step round (tapped 240 ms after each hit) finishes with every ball right and keeps the best in
// `splitstep_stats` (this phone only, no athlete prefix); a tap during the wait is a foot fault; Back and ✕ return to the running timer;
// the shelf remembers the last game in `rest_game_last` (never synced) and lists it first; opening one game closes the other; the rest
// running out shows "Time. Next set." and closes the game with the timer; a new rest starts with the shelf folded; Guided's rest has the
// same door and shelf; the ready card is inside the screen at 320 px; the layer sits under the demo banner; no yellow in the file; sw.js
// precaches it. Serve the repo first (python -m http.server 8779 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const t = H.checker();
const wait = (p, ms) => p.waitForTimeout(ms);
const ROOT = path.join(__dirname, '..', '..');

// The shelf may already be open from the last time, so the door is tapped only when it is folded.
async function shelfOpen(p) {
  if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
}
// Fold the shelf and open it again, as a new tap on the door does: it puts the last game played first each time it opens.
async function reopenShelf(p) {
  if (!(await p.evaluate(() => document.getElementById('timerGames').hidden))) await p.click('#timerPlayBtn');
  await p.click('#timerPlayBtn');
  await wait(p, 100);
}
async function openRow(p, key) {
  await shelfOpen(p);
  await p.click('#timerGames [data-game="' + key + '"]');
}
const GAME = { splitstep: 'SplitStep', rally: 'Rally' };
async function openFromShelf(p, key) {
  await openRow(p, key);
  await p.waitForFunction(g => window[g] && window[g].isOpen(), GAME[key], { timeout: 8000 });
  await wait(p, 400);
}
async function openSplit(browser, opts = {}) {
  const P = H.fixture();
  const o = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: P }, opts.demo ? { query: '?client=demo', stub: { demo: P } } : {}, opts));
  await o.p.evaluate(() => openRest(120, 'Back Squat'));
  await wait(o.p, 300);
  await openFromShelf(o.p, 'splitstep');
  return o;
}
const rows = p => p.evaluate(() => [...document.querySelectorAll('#timerGames .tg-row')].map(r => r.dataset.game));

// One round of the open drill, played like a thumb: wait for the hit, wait 240 ms, tap. Resolves when the card says done (or time is up).
const PLAY = `(async () => {
  const st = () => SplitStep._state();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tapAt = x => { const s = st(), r = s.cv.getBoundingClientRect();
    s.cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, pointerType: 'touch', clientX: r.left + x, clientY: r.top + r.height * 0.6 })); };
  let last = -1; const t0 = Date.now();
  while (st() && st().phase !== 'done' && st().phase !== 'up' && Date.now() - t0 < 60000) {
    const s = st();
    if (s.phase === 'live' && s.i !== last) { last = s.i; await sleep(240); tapAt(s.W / 2); continue; }
    await sleep(16);
  }
  const s = st();
  return { phase: s && s.phase, res: s && s.res.map(r => ({ ok: r.ok, ms: r.ms })), ff: s && s.ff };
})()`;

(async () => {
  const browser = await H.launch();
  const out = H.outDir();
  const errors = [];
  try {
    // ── 1. the door and the shelf ──
    let { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture() });
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    const door = await p.evaluate(() => { const d = document.getElementById('timerPlayBtn'), g = document.getElementById('timerGames');
      return { text: d.textContent.trim(), exp: d.getAttribute('aria-expanded'), ctl: d.getAttribute('aria-controls'), hidden: g.hidden, h: d.getBoundingClientRect().height }; });
    t.check('the door reads "Play while you rest", folded', door.text === 'Play while you rest' && door.exp === 'false' && door.ctl === 'timerGames' && door.hidden, JSON.stringify(door));
    t.check('the door is a 44 px target', door.h >= 44, door.h);
    await p.click('#timerPlayBtn');
    await wait(p, 200);
    const shelf = await p.evaluate(() => { const g = document.getElementById('timerGames'), r = g.getBoundingClientRect();
      return { hidden: g.hidden, exp: document.getElementById('timerPlayBtn').getAttribute('aria-expanded'), games: [...g.querySelectorAll('.tg-row')].map(x => x.dataset.game),
        names: [...g.querySelectorAll('.tg-row b')].map(x => x.textContent), lines: [...g.querySelectorAll('.tg-row small')].map(x => x.textContent),
        rowH: Math.min(...[...g.querySelectorAll('.tg-row')].map(x => x.getBoundingClientRect().height)), l: r.left, r: r.right, w: innerWidth }; });
    t.check('the door opens the shelf, aria-expanded true', !shelf.hidden && shelf.exp === 'true', JSON.stringify(shelf));
    t.check('the shelf has three rows, Split Step first with no history', shelf.games.join() === 'splitstep,rally,sets', shelf.games.join());
    t.check('the rows carry the names and lines', shelf.names.join('|') === 'Split Step|Off the Glass|Between Sets' && shelf.lines.join('|') === 'React to the hit · 4 drills|Air hockey against me · one match a session|Tennis against me · a set lasts your workout', shelf.names.join('|') + ' / ' + shelf.lines.join('|'));
    t.check('each row is a 44 px target inside the screen', shelf.rowH >= 44 && shelf.l >= 0 && shelf.r <= shelf.w, JSON.stringify([shelf.rowH, shelf.l, shelf.r]));
    await p.screenshot({ path: path.join(out, 'shelf-390.png') });
    await p.click('#timerPlayBtn');
    await wait(p, 100);
    const folded = await p.evaluate(() => ({ hidden: document.getElementById('timerGames').hidden, exp: document.getElementById('timerPlayBtn').getAttribute('aria-expanded') }));
    t.check('the door folds the shelf again', folded.hidden && folded.exp === 'false', JSON.stringify(folded));

    // ── 2. Split Step over the running rest ──
    await openFromShelf(p, 'splitstep');
    const st = await p.evaluate(() => { const s = SplitStep._state(), lay = document.getElementById('splitOverlay');
      return { vis: lay.classList.contains('visible'), timer: document.getElementById('timerOverlay').classList.contains('visible'), rally: window.Rally ? Rally.isOpen() : false,
        W: s.W, H: s.H, clock: s.clock.querySelector('b').textContent, left: timerLeft(), running: timerRunning, role: lay.getAttribute('role'), label: lay.getAttribute('aria-label') }; });
    t.check('the Split Step row opens #splitOverlay over the running rest', st.vis && st.timer && st.running && !st.rally, JSON.stringify(st));
    t.check('the layer is a labelled dialog', st.role === 'dialog' && st.label === 'Split Step', st.role + ' ' + st.label);
    t.check('the court fills the screen', st.W === 390 && st.H > 700, st.W + 'x' + st.H);
    const sec = txt => { const m = /^(\d+):(\d\d)$/.exec(txt); return m ? +m[1] * 60 + +m[2] : -99; };
    t.check('the court shows the rest clock and it matches the timer', Math.abs(sec(st.clock) - st.left) <= 1, st.clock + ' vs ' + st.left);
    await p.screenshot({ path: path.join(out, 'splitstep-open-390.png') });

    // ── 3. a foot fault ──
    await p.click('#splitOverlay [data-go]');
    await p.waitForFunction(() => SplitStep._state().phase === 'wait', null, { timeout: 5000 });
    await p.evaluate(() => { const s = SplitStep._state(), r = s.cv.getBoundingClientRect();
      s.cv.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, pointerType: 'touch', clientX: r.left + 100, clientY: r.top + 300 })); });
    await wait(p, 100);
    const ff = await p.evaluate(() => { const s = SplitStep._state(); return { ff: s.ff, phase: s.phase, txt: s.fb.textContent }; });
    t.check('a tap during the wait is a foot fault', ff.ff === 1 && ff.phase === 'ff' && /Foot fault/.test(ff.txt), JSON.stringify(ff));
    await p.screenshot({ path: path.join(out, 'splitstep-footfault-390.png') });

    // ── 4. ✕ returns to the running timer ──
    await p.click('#splitOverlay .ss-x');
    await wait(p, 300);
    let back = await p.evaluate(() => ({ game: SplitStep.isOpen(), vis: document.getElementById('splitOverlay').classList.contains('visible'),
      timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, html: document.getElementById('splitOverlay').innerHTML.length }));
    t.check('✕ closes the game, the rest keeps running', !back.game && !back.vis && back.timer && back.running && back.html === 0, JSON.stringify(back));

    // ── 5. a clean First Step round ──
    await openFromShelf(p, 'splitstep');
    await p.click('#splitOverlay [data-go]');
    const round = await p.evaluate(PLAY);
    t.check('a First Step round finishes', round.phase === 'done' && round.res.length >= 3, JSON.stringify(round));
    t.check('every ball right and no foot faults', round.res.every(r => r.ok) && round.ff === 0, JSON.stringify(round));
    t.check('the reaction times are the 240 ms the thumb waited', round.res.every(r => r.ms >= 200 && r.ms < 450), round.res.map(r => Math.round(r.ms)).join(','));
    const saved = await p.evaluate(() => ({ raw: localStorage.getItem('splitstep_stats'), best: SplitStep.stats().m.first.best, keys: Object.keys(localStorage).filter(k => /splitstep/i.test(k)) }));
    t.check('the best is kept on this phone', saved.raw && Number.isFinite(saved.best) && saved.best > 100, JSON.stringify(saved));
    t.check('its key is not an athlete key (never synced)', saved.keys.length === 1 && saved.keys[0] === 'splitstep_stats', saved.keys.join(','));
    await p.screenshot({ path: path.join(out, 'splitstep-done-390.png') });

    // ── 6. Back returns to the running timer ──
    await p.evaluate(() => history.back());
    await wait(p, 400);
    back = await p.evaluate(() => ({ game: SplitStep.isOpen(), vis: document.getElementById('splitOverlay').classList.contains('visible'),
      timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning }));
    t.check('Back closes the game, the timer is still visible and running', !back.game && !back.vis && back.timer && back.running, JSON.stringify(back));

    // ── 7. the shelf remembers the last game, on this phone only ──
    await reopenShelf(p);
    t.check('the shelf lists Split Step first after playing it', (await rows(p)).join() === 'splitstep,rally,sets', (await rows(p)).join());
    await p.click('#timerGames [data-game="rally"]');
    await p.waitForFunction(() => window.Rally && Rally.isOpen(), null, { timeout: 8000 });
    await wait(p, 300);
    const two = await p.evaluate(() => ({ rally: Rally.isOpen(), split: SplitStep.isOpen(), last: localStorage.getItem('rest_game_last'),
      timer: document.getElementById('timerOverlay').classList.contains('visible'), vis: document.getElementById('rallyOverlay').classList.contains('visible') }));
    t.check('the Off the Glass row opens Off the Glass over the rest', two.rally && !two.split && two.vis && two.timer && two.last === 'rally', JSON.stringify(two));
    await p.click('.rally-x');
    await wait(p, 300);
    await reopenShelf(p);
    t.check('after Off the Glass, the shelf lists it first', (await rows(p)).join() === 'rally,splitstep,sets', (await rows(p)).join());
    const keys = await p.evaluate(id => Object.keys(localStorage).filter(k => /rest_game/.test(k)).concat(Object.keys(localStorage).filter(k => k.startsWith(id) && /rest_game|splitstep|rally/i.test(k))), H.ID);
    t.check('rest_game_last is one unprefixed key, so it never syncs', keys.length === 1 && keys[0] === 'rest_game_last', keys.join(','));
    // opening one game while the other is open closes the other (the shelf is behind the full-screen game, so call the door's function)
    await openFromShelf(p, 'rally');
    await p.evaluate(() => openRestGame('splitstep'));
    await p.waitForFunction(() => window.SplitStep && SplitStep.isOpen(), null, { timeout: 8000 });
    await wait(p, 300);
    const swap = await p.evaluate(() => ({ rally: Rally.isOpen(), split: SplitStep.isOpen(), rv: document.getElementById('rallyOverlay').classList.contains('visible'),
      sv: document.getElementById('splitOverlay').classList.contains('visible') }));
    t.check('opening one game closes the other', !swap.rally && swap.split && !swap.rv && swap.sv, JSON.stringify(swap));
    await p.click('#splitOverlay .ss-x');
    await wait(p, 200);

    // ── 8. the rest runs out mid-round ──
    await openFromShelf(p, 'splitstep');
    await p.click('#splitOverlay [data-go]');
    await p.waitForFunction(() => /^(wait|live)$/.test(SplitStep._state().phase), null, { timeout: 5000 });
    // Serve Clock would close the game with 30 s left (serve-clock.js tests that); this check is the rest running out on an open round, so the hand-back is off.
    await p.evaluate(() => { SERVE_CLOCK.at = 0; SERVE_CLOCK.atLong = 0; timerEndsAt = Date.now() + 1500; });
    await wait(p, 2100);
    const up = await p.evaluate(() => { const s = SplitStep._state(); return s ? { up: s.up, phase: s.phase, title: s.card.querySelector('h3') && s.card.querySelector('h3').textContent, hidden: s.card.hidden } : null; });
    t.check('the rest running out stops the round and says so', up && up.up && !up.hidden && up.title === 'Time. Next set.', JSON.stringify(up));
    await p.screenshot({ path: path.join(out, 'splitstep-timeup-390.png') });
    await wait(p, 1800);
    const gone = await p.evaluate(() => ({ game: SplitStep.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), html: document.getElementById('splitOverlay').innerHTML.length,
      vis: document.getElementById('splitOverlay').classList.contains('visible') }));
    t.check('then the game and the timer close together', !gone.game && !gone.timer && !gone.vis && gone.html === 0, JSON.stringify(gone));

    // ── 9. a new rest starts with the shelf folded ──
    await p.evaluate(() => openRest(90, 'Back Squat'));
    await wait(p, 300);
    await shelfOpen(p);
    const shelfWas = await p.evaluate(() => !document.getElementById('timerGames').hidden);
    await p.evaluate(() => openRest(60, 'Back Squat'));   // the next set's rest
    await wait(p, 300);
    const fresh = await p.evaluate(() => ({ hidden: document.getElementById('timerGames').hidden, exp: document.getElementById('timerPlayBtn').getAttribute('aria-expanded') }));
    t.check('a new rest starts with the shelf folded', shelfWas && fresh.hidden && fresh.exp === 'false', JSON.stringify([shelfWas, fresh]));

    // ── 10. Guided's rest has the same door ──
    await p.evaluate(() => closeTimer());
    await wait(p, 200);
    await p.evaluate(() => openTimerAuto(100, 'Back Squat', () => {}));
    await wait(p, 300);
    const gd = await p.evaluate(() => { const d = document.getElementById('timerPlayBtn'), r = d.getBoundingClientRect(); return { vis: r.width > 0 && r.height > 0, guided: !document.getElementById('timerCloseBtn').hidden }; });
    t.check('Guided\'s rest shows the door', gd.vis && gd.guided, JSON.stringify(gd));
    await openFromShelf(p, 'splitstep');
    const gs = await p.evaluate(() => ({ open: SplitStep.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, left: SplitStep._state().opts.left() }));
    t.check('the shelf works in Guided: the game opens over the running rest', gs.open && gs.timer && gs.running && gs.left > 90, JSON.stringify(gs));
    await p.click('#splitOverlay .ss-x');
    await wait(p, 200);
    await p.evaluate(() => closeTimer());
    await ctx.close();

    // ── 11. 320 px: the ready card is inside the screen and the clock is whole ──
    ({ ctx, p } = await openSplit(browser, { w: 320, h: 568 }));
    p.on('pageerror', e => errors.push(String(e)));
    const b320 = await p.evaluate(() => { const c = document.querySelector('#splitOverlay .ss-card').getBoundingClientRect(), k = document.querySelector('#splitOverlay .ss-clock').getBoundingClientRect(),
      x = document.querySelector('#splitOverlay .ss-x').getBoundingClientRect(), go = document.querySelector('#splitOverlay [data-go]').getBoundingClientRect();
      return { cl: c.left, cr: c.right, ct: c.top, cb: c.bottom, kl: k.left, kr: k.right, xl: x.left, gb: go.bottom, w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth }; });
    t.check('at 320 px the ready card is inside the screen', b320.cl >= 0 && b320.cr <= b320.w && b320.ct >= 0 && b320.cb <= b320.h && b320.gb <= b320.h, JSON.stringify(b320));
    t.check('at 320 px the clock is whole and clear of ✕', b320.kl >= 0 && b320.kr <= b320.xl && b320.sw <= b320.w, JSON.stringify(b320));
    await p.screenshot({ path: path.join(out, 'splitstep-open-320.png') });
    await ctx.close();

    // ── 12. the demo banner ──
    ({ ctx, p } = await openSplit(browser, { demo: true }));
    const demo = await p.evaluate(() => { const b = document.querySelector('.demo-banner, #demo-banner'); const o = document.getElementById('splitOverlay').getBoundingClientRect();
      return { bannerBottom: b ? b.getBoundingClientRect().bottom : null, top: o.top }; });
    t.check('in the demo the game sits under the banner', demo.bannerBottom == null || demo.top >= demo.bannerBottom - 1, JSON.stringify(demo));
    await p.screenshot({ path: path.join(out, 'splitstep-demo-390.png') });
    await ctx.close();

    // ── 12b. the host's loading rules: the last tap wins, a late load never opens over a later rest or the GO!, and a rest that ends does not pull focus to the door ──
    const slowSplit = async c => { await c.route('**/assets/js/splitstep.js', async r => { await new Promise(x => setTimeout(x, 1500)); r.continue(); }); };
    ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture() }));
    p.on('pageerror', e => errors.push(String(e)));
    await slowSplit(ctx);
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    await p.click('#timerPlayBtn');
    await p.click('#timerGames [data-game="splitstep"]');
    await p.click('#timerGames [data-game="rally"]');
    await wait(p, 3200);
    const race = await p.evaluate(() => ({ rally: Rally.isOpen(), split: !!(window.SplitStep && SplitStep.isOpen()), last: localStorage.getItem('rest_game_last') }));
    t.check('the last tap wins: a slow load of the first game does not take the screen', race.rally && !race.split && race.last === 'rally', JSON.stringify(race));
    await ctx.close();

    ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture() }));
    p.on('pageerror', e => errors.push(String(e)));
    await slowSplit(ctx);
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    await p.click('#timerPlayBtn');
    await p.click('#timerGames [data-game="splitstep"]');
    await p.evaluate(() => { closeTimer(); openRest(90, 'Back Squat'); });   // the rest ends and the next one starts while it loads
    await wait(p, 3000);
    const late = await p.evaluate(() => ({ split: !!(window.SplitStep && SplitStep.isOpen()), timer: document.getElementById('timerOverlay').classList.contains('visible') }));
    t.check('a game that finishes loading after its rest ended does not open over the next rest', late.timer && !late.split, JSON.stringify(late));

    await p.evaluate(() => { closeTimer(); openRest(120, 'Back Squat'); });
    await wait(p, 300);
    await p.evaluate(() => { timerEndsAt = Date.now() + 300; });
    await wait(p, 800);   // timerDone() is showing GO! for 1.2 s
    await p.evaluate(() => openRestGame('rally'));
    await wait(p, 500);
    const goWin = await p.evaluate(() => ({ rally: !!(window.Rally && Rally.isOpen()) }));
    t.check('a tap in the GO! window opens nothing', !goWin.rally, JSON.stringify(goWin));
    await wait(p, 1200);

    await p.evaluate(() => { closeTimer(); openRest(120, 'Back Squat'); });
    await wait(p, 300);
    await openFromShelf(p, 'splitstep');
    await p.evaluate(() => { window.__doorFocus = 0; document.getElementById('timerPlayBtn').addEventListener('focus', () => { window.__doorFocus++; }); closeTimer(); });
    await wait(p, 300);
    const foc = await p.evaluate(() => ({ n: window.__doorFocus, open: SplitStep.isOpen() }));
    t.check('a rest that ends with a game open closes it without pulling focus to the door', foc.n === 0 && !foc.open, JSON.stringify(foc));
    await ctx.close();

    // ── 13. the files ──
    const src = fs.readFileSync(path.join(ROOT, 'assets', 'js', 'splitstep.js'), 'utf8');
    const hexes = src.match(/#[0-9a-fA-F]{6}\b/g) || [];
    const yellow = hexes.filter(h => { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b); if (mx - mn < 40) return false;
      let hue; if (mx === r) hue = 60 * (((g - b) / (mx - mn)) % 6); else if (mx === g) hue = 60 * ((b - r) / (mx - mn) + 2); else hue = 60 * ((r - g) / (mx - mn) + 4);
      if (hue < 0) hue += 360; return hue >= 38 && hue <= 70; });
    t.check('no yellow, gold or amber in the game', yellow.length === 0, yellow.join(','));
    const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
    t.check('sw.js precaches /assets/js/splitstep.js', /SHELL\s*=\s*\[[\s\S]*?'\/assets\/js\/splitstep\.js'[\s\S]*?\]/.test(sw), 'SHELL');
    t.check('the page logged no error', errors.length === 0, errors.join(' | '));
  } catch (e) {
    t.check('the run finished', false, e.stack || String(e));
  } finally {
    await browser.close();
  }
  console.log('screenshots: ' + out);
  process.exit(t.report() ? 1 : 0);
})();
