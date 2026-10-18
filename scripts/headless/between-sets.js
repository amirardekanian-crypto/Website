// Between Sets, the third rest game (assets/js/between-sets.js): node scripts/headless/between-sets.js [--out <dir>]
// The shelf shows three rows and fits at 320/360/390; the Between Sets row loads the script and opens #setsOverlay on the game's menu; a match
// starts and its rest pill shows the timer's seconds; rest_game_last = 'sets' leads the shelf next rest; the rest running out freezes the game on
// "Time to lift" and closeTimer closes both layers; ✕ returns to the running timer; Back closes the game first, then the timer; opening Off the
// Glass after it closes it (one game at a time); Serve Clock's BetweenSets.handBack(done): closed = done at once, a point in play finishes then the game
// parks on "Time to lift" and done() comes once, twice asked = two dones and one park, a rally drill keeps its best, close() mid-hand-back = done at once;
// no console errors; no horizontal overflow. Serve the repo first (see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const path = require('path');
const H = require('./lib');

const t = H.checker();
const wait = (p, ms) => p.waitForTimeout(ms);
const OV = '#setsOverlay';

async function shelfOpen(p) {
  if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
}
async function reopenShelf(p) {
  if (!(await p.evaluate(() => document.getElementById('timerGames').hidden))) await p.click('#timerPlayBtn');
  await p.click('#timerPlayBtn');
  await wait(p, 100);
}
const rows = p => p.evaluate(() => [...document.querySelectorAll('#timerGames .tg-row')].map(r => r.dataset.game));
async function openSets(p) {
  await shelfOpen(p);
  await p.click('#timerGames [data-game="sets"]');
  await p.waitForFunction(() => window.BetweenSets && BetweenSets.isOpen(), null, { timeout: 8000 });
  await wait(p, 500);
}
const state = p => p.evaluate(() => ({ game: !!(window.BetweenSets && BetweenSets.isOpen()), vis: document.getElementById('setsOverlay').classList.contains('visible'),
  timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, html: document.getElementById('setsOverlay').innerHTML.length }));

// Serve Clock (section 7b): a new rest, a new game. closeTimer() closes the old game with the timer; openSets() loads nothing twice.
async function freshSets(p) {
  await p.evaluate(() => closeTimer());
  await wait(p, 400);
  await p.evaluate(() => openRest(120, 'Back Squat'));
  await wait(p, 300);
  await openSets(p);
}

(async () => {
  const browser = await H.launch();
  const out = H.outDir();
  const errors = [];
  const watch = p => { p.on('pageerror', e => errors.push('pageerror ' + e)); p.on('console', m => { if (m.type() === 'error') errors.push('console ' + m.text()); }); };
  try {
    // ── 1. the shelf at three widths ──
    for (const [w, h] of [[320, 568], [360, 740], [390, 844]]) {
      const { ctx, p } = await H.openProgram(browser, { w, h, prog: H.fixture() });
      watch(p);
      await p.evaluate(() => openRest(120, 'Back Squat'));
      await wait(p, 300);
      await p.click('#timerPlayBtn');
      await wait(p, 200);
      const s = await p.evaluate(() => { const g = document.getElementById('timerGames'), rs = [...g.querySelectorAll('.tg-row')];
        return { games: rs.map(x => x.dataset.game), names: rs.map(x => x.querySelector('b').textContent),
          fit: rs.every(x => { const r = x.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.height >= 44; }),
          inner: rs.every(x => { const r = x.getBoundingClientRect(); return [...x.children].every(c => { const q = c.getBoundingClientRect(); return q.right <= r.right + 0.5 && q.left >= r.left - 0.5; }); }),
          sw: document.documentElement.scrollWidth, w: innerWidth, bottom: g.getBoundingClientRect().bottom, h: innerHeight }; });
      t.check(w + ' px: the shelf has three rows including Between Sets', s.games.length === 3 && s.games.includes('sets') && s.names.includes('Between Sets'), s.games.join() + ' / ' + s.names.join('|'));
      t.check(w + ' px: rows are 44 px targets inside the screen and their text inside the row', s.fit && s.inner, JSON.stringify(s));
      t.check(w + ' px: no horizontal overflow', s.sw <= s.w, s.sw + ' vs ' + s.w);
      if (w === 320) await p.screenshot({ path: path.join(out, 'sets-shelf-320.png') });
      await ctx.close();
    }

    // ── 2. open the game ──
    let { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture() });
    watch(p);
    const before = await p.evaluate(() => !!window.BetweenSets);
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    await openSets(p);
    const o = await p.evaluate(() => { const lay = document.getElementById('setsOverlay');
      return { loaded: !!window.BetweenSets, script: !![...document.scripts].find(s => /between-sets\.js/.test(s.src)), vis: lay.classList.contains('visible'),
        timer: document.getElementById('timerOverlay').classList.contains('visible'), role: lay.getAttribute('role'), label: lay.getAttribute('aria-label'),
        menu: !!lay.querySelector('[data-act="match"]'), state: BetweenSets._game().state, sw: document.documentElement.scrollWidth, w: innerWidth }; });
    t.check('the script was not loaded before the tap', !before, before);
    t.check('the row loads between-sets.js and opens #setsOverlay on the menu', o.loaded && o.script && o.vis && o.timer && o.menu && o.state === 'menu', JSON.stringify(o));
    t.check('the layer is a labelled dialog', o.role === 'dialog' && o.label === 'Between Sets', o.role + ' ' + o.label);

    // ── 3. a match starts and the rest pill shows the timer ──
    await p.click(OV + ' [data-act="match"]');
    await wait(p, 1500);
    const m = await p.evaluate(() => { const g = BetweenSets._game(), pill = document.querySelector('#setsOverlay .cd-rest'), tx = document.querySelector('#setsOverlay .cd-rest-t').textContent;
      const mm = /^(\d+):(\d\d)$/.exec(tx.trim()); return { state: g.state, pillVisible: !!pill && !pill.hidden && pill.getBoundingClientRect().width > 0, txt: tx, secs: mm ? +mm[1] * 60 + +mm[2] : -99, left: timerLeft() }; });
    t.check('a match starts', m.state !== 'menu' && m.state !== 'over', m.state);
    t.check("the game's rest pill shows the timer's seconds", m.pillVisible && Math.abs(m.secs - m.left) <= 1, JSON.stringify(m));
    const keys = await p.evaluate(() => ({ last: localStorage.getItem('rest_game_last'), ls: Object.keys(localStorage).filter(k => /rest_game|courtduel/i.test(k)) }));
    t.check("rest_game_last is 'sets' (unprefixed, never synced)", keys.last === 'sets', JSON.stringify(keys));

    // ── 4. ✕ returns to the running timer; the shelf leads with the last game ──
    await p.click(OV + ' .cd-x');
    await wait(p, 300);
    let s = await state(p);
    t.check('✕ closes the game, the timer is still running', !s.game && !s.vis && s.timer && s.running && s.html === 0, JSON.stringify(s));
    await reopenShelf(p);
    const r1 = await rows(p);
    t.check('the last game played leads the shelf next time', r1[0] === 'sets' && r1.length === 3, r1.join());

    // ── 5. Back closes the game first, then the timer ──
    await p.click('#timerGames [data-game="sets"]');
    await p.waitForFunction(() => BetweenSets.isOpen(), null, { timeout: 8000 });
    await wait(p, 400);
    await p.evaluate(() => history.back());
    await wait(p, 500);
    s = await state(p);
    t.check('Back closes the game first, the timer stays and runs', !s.game && !s.vis && s.timer && s.running, JSON.stringify(s));
    await p.evaluate(() => history.back());
    await wait(p, 500);
    s = await state(p);
    t.check('a second Back closes the timer', !s.game && !s.timer, JSON.stringify(s));

    // ── 6. the rest runs out ──
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    await openSets(p);
    await p.click(OV + ' [data-act="match"]');
    await wait(p, 1000);
    await p.evaluate(() => { timerEndsAt = Date.now() + 1500; });
    await wait(p, 2000);
    const up = await p.evaluate(() => { const lay = document.getElementById('setsOverlay'); const g = BetweenSets.isOpen() ? BetweenSets._game() : null;
      return { open: !!g, txt: /Time to lift/.test(lay.textContent), timedOut: g ? g.timedOut : null }; });
    t.check('the rest running out freezes the game on the Time to lift card', up.open && up.txt, JSON.stringify(up));
    await p.screenshot({ path: path.join(out, 'sets-timeup-390.png') });
    await wait(p, 2200);
    s = await state(p);
    t.check('then the game and the timer close together', !s.game && !s.vis && !s.timer && s.html === 0, JSON.stringify(s));

    // closeTimer by itself closes both layers
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    await openSets(p);
    await p.evaluate(() => closeTimer());
    await wait(p, 400);
    s = await state(p);
    t.check('closeTimer closes both layers', !s.game && !s.vis && !s.timer && s.html === 0, JSON.stringify(s));

    // ── 7. one game at a time ──
    await p.evaluate(() => openRest(120, 'Back Squat'));
    await wait(p, 300);
    await openSets(p);
    await p.evaluate(() => openRestGame('rally'));
    await p.waitForFunction(() => window.Rally && Rally.isOpen(), null, { timeout: 8000 });
    await wait(p, 400);
    const two = await p.evaluate(() => ({ sets: BetweenSets.isOpen(), rally: Rally.isOpen(), sv: document.getElementById('setsOverlay').classList.contains('visible'),
      rv: document.getElementById('rallyOverlay').classList.contains('visible'), html: document.getElementById('setsOverlay').innerHTML.length }));
    t.check('opening Off the Glass closes Between Sets', !two.sets && two.rally && !two.sv && two.rv && two.html === 0, JSON.stringify(two));
    await p.evaluate(() => closeTimer());
    await ctx.close();

    // ── 7b. Serve Clock: BetweenSets.handBack(done), driven directly in the real app page ──
    // autoplay is the game's own test bot (it serves and returns by itself), so a point really is in play when handBack is called.
    ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture() }));
    watch(p);
    await p.evaluate(() => {
      window.__hb = {
        sleep: ms => new Promise(r => setTimeout(r, ms)),
        // resolves true the moment a match point is in play, false after ms
        rally: (g, ms) => new Promise(res => { const t0 = Date.now(); const iv = setInterval(() => {
          if (g.mode === 'match' && g.state === 'rally' && !g.paused) { clearInterval(iv); res(true); }
          else if (Date.now() - t0 > ms) { clearInterval(iv); res(false); } }, 15); }),
        // counts the game's hostTimeUp() calls, i.e. how many times the hand-back parked
        spy: g => { const c = { parks: 0 }; const hk = g.hostTimeUp; g.hostTimeUp = function () { c.parks++; return hk.apply(this, arguments); }; return c; },
        lift: g => { const sh = document.querySelector('#setsOverlay .cd-sheet'), card = document.querySelector('#setsOverlay .cd-card');
          return { sheet: !!sh && !sh.hidden, text: !!card && /Time to lift/.test(card.textContent), saved: !!card && /best rally is saved/.test(card.textContent),
            buttons: card ? card.querySelectorAll('button').length : -1, paused: g.paused, timedOut: g.timedOut }; },
      };
      openRest(120, 'Back Squat');
    });
    await wait(p, 300);
    await openSets(p);

    // (a) asked while closed: done() comes at once, and only once (and no done at all is fine)
    await p.evaluate(() => closeTimer());
    await wait(p, 400);
    const hbA = await p.evaluate(async () => {
      const closed = !BetweenSets.isOpen(); let n = 0;
      BetweenSets.handBack();
      BetweenSets.handBack(() => { n++; });
      const sync = n;
      await __hb.sleep(1200);
      return { closed, sync, n };
    });
    t.check('handBack while closed calls done at once, and once', hbA.closed && hbA.sync === 1 && hbA.n === 1, JSON.stringify(hbA));

    // (b) asked in a point: the point may finish, then Time to lift, then done() once within about 7 s
    await freshSets(p);
    await p.click(OV + ' [data-act="match"]');
    const hbB = await p.evaluate(async () => {
      const g = BetweenSets._game(); g.autoplay = true;
      const spy = __hb.spy(g);
      if (!(await __hb.rally(g, 25000))) return { noRally: true, state: g.state };
      let n = 0, at = 0, snap = null; const t0 = Date.now();
      BetweenSets.handBack(() => { n++; at = Date.now() - t0; snap = __hb.lift(g); });
      const stateAtCall = g.state, frozenAtOnce = g.timedOut;
      const stop = Date.now() + 8500;
      while (!n && Date.now() < stop) await __hb.sleep(50);
      await __hb.sleep(1200);
      return { stateAtCall, frozenAtOnce, n, at, snap, parks: spy.parks };
    });
    t.check('handBack in a point: done fires once, within about 7 s (the point, up to 6 s, then 0.9 s)', hbB.n === 1 && hbB.at >= 850 && hbB.at <= 7500, JSON.stringify(hbB));
    t.check('handBack in a point does not cut the point off: still a rally, not frozen, right after the call', hbB.stateAtCall === 'rally' && !hbB.frozenAtOnce, JSON.stringify(hbB));
    t.check('by done the game shows the Time to lift card with no buttons, play is paused, one park',
      !!hbB.snap && hbB.snap.sheet && hbB.snap.text && hbB.snap.buttons === 0 && hbB.snap.paused === true && hbB.snap.timedOut === true && hbB.parks === 1, JSON.stringify(hbB));
    await p.screenshot({ path: path.join(out, 'sets-handback-390.png') });

    // (c) asked twice (300 ms apart) while a point is in play: both dones, together, one park
    await freshSets(p);
    await p.click(OV + ' [data-act="match"]');
    const hbC = await p.evaluate(async () => {
      const g = BetweenSets._game(); g.autoplay = true;
      const spy = __hb.spy(g);
      if (!(await __hb.rally(g, 25000))) return { noRally: true, state: g.state };
      const at = [], t0 = Date.now();
      BetweenSets.handBack(() => at.push(Date.now() - t0));
      await __hb.sleep(300);
      BetweenSets.handBack(() => at.push(Date.now() - t0));
      const stop = Date.now() + 8500;
      while (at.length < 2 && Date.now() < stop) await __hb.sleep(50);
      await __hb.sleep(1200);
      return { at, parks: spy.parks };
    });
    t.check('handBack twice gives two done calls, together', !!hbC.at && hbC.at.length === 2 && Math.abs(hbC.at[0] - hbC.at[1]) < 150, JSON.stringify(hbC));
    t.check('handBack twice still parks once (hostTimeUp called once)', hbC.parks === 1, JSON.stringify(hbC));

    // (d) a rally drill keeps its best: saved when it beats the stored one, left alone when it does not
    for (const [stored, count, want, label] of [[2, 7, '7', 'saves the drill count as best when it beats the stored best (2 -> 7)'], [20, 5, '20', 'leaves the stored best alone when the drill does not beat it (20 stays)']]) {
      await freshSets(p);
      await p.evaluate(v => localStorage.setItem('courtduel.best', String(v)), stored);
      await p.click(OV + ' [data-act="drill"]');
      const hbD = await p.evaluate(async count => {
        const g = BetweenSets._game(), spy = __hb.spy(g), mode = g.mode;
        g.drillCount = count;
        let n = 0, at = 0; const t0 = Date.now();
        BetweenSets.handBack(() => { n++; at = Date.now() - t0; });
        const bestAtOnce = localStorage.getItem('courtduel.best');
        await __hb.sleep(1600);
        return { mode, bestAtOnce, best: localStorage.getItem('courtduel.best'), n, at, parks: spy.parks, lift: __hb.lift(g) };
      }, count);
      t.check('in a rally drill, handBack ' + label, hbD.mode === 'drill' && hbD.bestAtOnce === want && hbD.best === want, JSON.stringify(hbD));
      if (stored === 2) t.check('a drill hand-back parks at once on Time to lift ("Your best rally is saved") and calls done once, about 0.9 s later',
        hbD.n === 1 && hbD.at >= 850 && hbD.at <= 1500 && hbD.parks === 1 && hbD.lift.sheet && hbD.lift.text && hbD.lift.saved && hbD.lift.buttons === 0, JSON.stringify(hbD));
    }

    // (e) close() while a point is still finishing calls the pending done() at once, and only once
    await freshSets(p);
    await p.click(OV + ' [data-act="match"]');
    const hbE = await p.evaluate(async () => {
      const g = BetweenSets._game(); g.autoplay = true;
      const spy = __hb.spy(g);
      if (!(await __hb.rally(g, 25000))) return { noRally: true, state: g.state };
      let n = 0;
      BetweenSets.handBack(() => { n++; });
      const pending = n;
      BetweenSets.close();
      const atClose = n, open = BetweenSets.isOpen();
      await __hb.sleep(1500);
      return { pending, atClose, open, later: n, parks: spy.parks };
    });
    t.check('close() during a pending hand-back calls done at once', hbE.pending === 0 && hbE.atClose === 1 && hbE.open === false, JSON.stringify(hbE));
    t.check('the closed hand-back calls done once only and never parks the destroyed game', hbE.later === 1 && hbE.parks === 0, JSON.stringify(hbE));

    // (f) a hand-back that has finished, the game still open: a second handBack(done2) calls done2 at once and once, with no second park;
    // close() after that calls nothing more
    await freshSets(p);
    const hbF = await p.evaluate(async () => {
      const g = BetweenSets._game(), spy = __hb.spy(g);
      let n1 = 0, n2 = 0;
      BetweenSets.handBack(() => { n1++; });
      await __hb.sleep(1300);
      const first = n1, parksAfterFirst = spy.parks, openAfterFirst = BetweenSets.isOpen();
      BetweenSets.handBack(() => { n2++; });
      const second = n2;
      await __hb.sleep(1200);
      const secondLater = n2, parksAfterSecond = spy.parks;
      BetweenSets.close();
      await __hb.sleep(1200);
      return { first, parksAfterFirst, openAfterFirst, second, secondLater, parksAfterSecond, afterClose: [n1, n2], open: BetweenSets.isOpen() };
    });
    t.check('after a finished hand-back (game still open) a second handBack calls its done at once, once, with no second park',
      hbF.first === 1 && hbF.parksAfterFirst === 1 && hbF.openAfterFirst === true && hbF.second === 1 && hbF.secondLater === 1 && hbF.parksAfterSecond === 1, JSON.stringify(hbF));
    t.check('close() after a finished hand-back calls nothing more', hbF.afterClose[0] === 1 && hbF.afterClose[1] === 1 && hbF.open === false, JSON.stringify(hbF));
    await ctx.close();

    // ── 8. dark mode screenshot ──
    ({ ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), dark: true }));
    watch(p);
    await p.evaluate(() => { if (!document.body.hasAttribute('data-dark') && typeof setDark === 'function') setDark(true); openRest(120, 'Back Squat'); });
    await wait(p, 300);
    const dk = await p.evaluate(() => document.body.hasAttribute('data-dark'));
    await openSets(p);
    await p.screenshot({ path: path.join(out, 'sets-menu-dark-390.png') });
    await p.click(OV + ' [data-act="match"]');
    await wait(p, 1800);
    await p.screenshot({ path: path.join(out, 'sets-match-dark-390.png') });
    t.check('dark mode is on for the screenshot (body[data-dark])', dk, dk);
    const fin = await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    t.check('no horizontal overflow with the game open', fin, fin);
    await ctx.close();

    t.check('no console or page errors', errors.length === 0, errors.join(' | '));
  } catch (e) {
    t.check('the run finished', false, e.stack || String(e));
  } finally {
    await browser.close();
  }
  console.log('screenshots: ' + out);
  process.exit(t.report() ? 1 : 0);
})();
