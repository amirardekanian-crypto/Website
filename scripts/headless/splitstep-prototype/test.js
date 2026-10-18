// Split Step's own harness (2026-10-18): the module alone, in the prototype page (index.html here, the page published at
// https://claude.ai/artifact/DFZd4XE2MgVtQhPpkSeCGL), at four sizes in light and dark, with every drill played by a "thumb",
// foot faults, the rest deciding (nearly over, paused, the backstop, handBackAt and handBack), the background, blocked storage,
// reduced motion. It loads the REAL module, assets/js/splitstep.js. The app-level test is scripts/headless/splitstep.js.
// node scripts/headless/splitstep-prototype/test.js   (PLAYWRIGHT and CHROMIUM as for the other headless scripts; it serves itself;
// the wrapped page and the screenshots go to the temp folder, never into the repo)
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require(process.env.PLAYWRIGHT || 'C:/Users/Amir/AppData/Local/npm-cache/_npx/9833c18b2d85bc59/node_modules/playwright');
const DIR = __dirname, MODULE = path.join(__dirname, '..', '..', '..', 'assets', 'js', 'splitstep.js');
const TMP = path.join(require('os').tmpdir(), 'splitstep-prototype'), SHOTS = path.join(TMP, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

// The artifact skeleton the publish step adds around index.html
const page0 = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
fs.writeFileSync(path.join(TMP, 'test.html'),
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` +
  `<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>` +
  `</head><body>${page0}</body></html>`);

const server = http.createServer((req, res) => {
  const name = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'test.html';
  const f = name === 'splitstep.js' ? MODULE : name === 'test.html' ? path.join(TMP, 'test.html') : path.join(DIR, name);
  if (req.url.startsWith('/favicon')) { res.writeHead(204); return res.end(); }
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});

let fails = 0, passes = 0;
const ok = (cond, msg) => { if (cond) passes++; else { fails++; console.log('  FAIL ' + msg); } };

// Plays one round of the open drill in the page: waits for each hit and taps like a player would.
// mode 'good' taps right; 'ff' taps once during the first wait (a foot fault) and then plays well.
const PLAY = `async (mode) => {
  const st = () => SplitStep._state();
  const cv = () => st().cv;
  const tapAt = (x) => { const r = cv().getBoundingClientRect(); cv().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, isPrimary: true, pointerType: 'touch', clientX: r.left + x, clientY: r.top + r.height * 0.6 })); };
  const frame = () => new Promise(r => requestAnimationFrame(r));
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let didFF = false, guard = 0;
  while (st() && st().phase !== 'done' && st().phase !== 'up' && guard++ < 4000) {
    const s = st();
    if (mode === 'ff' && !didFF && s.phase === 'wait') { await sleep(150); tapAt(s.W / 2); didFF = true; continue; }
    if (s.phase === 'live' && !s._tapped) {
      s._tapped = true;
      const b = s.ball, W = s.W;
      if (s.drill === 'first') { await sleep(240); tapAt(W / 2); }
      else if (s.drill === 'side') { await sleep(280); tapAt(b.side === 'L' ? W * 0.2 : W * 0.8); }
      else if (s.drill === 'call') { if (b.isIn) { await sleep(300); tapAt(W / 2); } }
      else { const wait = s.onset + b.arrive + 16 - performance.now() - 4; await sleep(Math.max(0, wait)); tapAt(W / 2); }
      continue;
    }
    if (s.phase !== 'live') { for (const k in s) if (k === '_tapped') delete s._tapped; }
    await frame();
  }
  const s = st();
  return { phase: s && s.phase, res: s && s.res, ff: s && s.ff, card: s && s.card.innerText };
}`;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = `http://127.0.0.1:${server.address().port}/test.html`;
  const LAUNCH = () => chromium.launch({ executablePath: process.env.CHROMIUM || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  // one browser per size and scheme: a single browser running every page in a row crashed its renderer now and then on a busy PC
  let browser = await LAUNCH();
  const sizes = [
    { name: 'se', width: 320, height: 568, mobile: true },
    { name: 's8', width: 360, height: 740, mobile: true },
    { name: 'iphone', width: 390, height: 844, mobile: true },
    { name: 'desk', width: 1280, height: 820, mobile: false },
  ];
  for (const scheme of ['light', 'dark']) for (const sz of sizes) {
    const tag = `${sz.name}-${scheme}`;
    console.log('— ' + tag);
    await browser.close(); browser = await LAUNCH();
    const ctx = await browser.newContext({ viewport: { width: sz.width, height: sz.height }, deviceScaleFactor: 2, hasTouch: sz.mobile, isMobile: sz.mobile, colorScheme: scheme });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // the page: no sideways scroll, nothing under 12 px
    const pg = await page.evaluate(() => {
      const small = [];
      document.querySelectorAll('body *').forEach(el => {
        if (!el.childNodes.length || ![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const fs = parseFloat(cs.fontSize); if (fs < 12) small.push(el.tagName + '.' + el.className + ' ' + fs);
      });
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, small, bg: getComputedStyle(document.body).backgroundColor };
    });
    ok(pg.sw <= pg.iw, `${tag}: page scrolls sideways (${pg.sw} > ${pg.iw})`);
    ok(!pg.small.length, `${tag}: text under 12 px: ${pg.small.slice(0, 4).join(', ')}`);
    if (sz.name === 'iphone' || sz.name === 'desk') await page.screenshot({ path: path.join(SHOTS, `${tag}-page.png`) });

    // open the game from the door, then stretch the demo rest so it outlasts every round below
    await page.click('[data-rest="120"]');
    await page.click('#door');
    await page.waitForFunction(() => window.SplitStep && SplitStep.isOpen() && SplitStep._state().phase === 'ready');
    await page.evaluate(() => { for (let k = 0; k < 16; k++) document.getElementById('restAdd').click(); });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const g = await page.evaluate(() => {
      const s = SplitStep._state(), gr = document.getElementById('game').getBoundingClientRect(), cr = s.card.getBoundingClientRect(), ct = s.ct;
      const small = [];
      document.querySelectorAll('#game *').forEach(el => {
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) small.push(el.className + ' ' + fs);
      });
      return { inside: cr.left >= gr.left - 0.5 && cr.right <= gr.right + 0.5 && cr.top >= gr.top - 0.5 && cr.bottom <= gr.bottom + 0.5,
        scroll: s.card.scrollHeight - s.card.clientHeight, ct, W: s.W, H: s.H, small, clock: s.clock.innerText, go: !!s.card.querySelector('[data-go]') };
    });
    ok(g.inside, `${tag}: the ready card is cut off`);
    ok(g.scroll <= 1, `${tag}: the ready card scrolls (${g.scroll}px)`);
    ok(!g.small.length, `${tag}: game text under 12 px: ${g.small.join(', ')}`);
    ok(g.ct.x >= 40 && g.ct.w > 150 && g.ct.y > 40, `${tag}: court geometry ${JSON.stringify(g.ct)}`);
    ok(/REST/i.test(g.clock) && /\d:\d\d/.test(g.clock), `${tag}: clock reads "${g.clock}"`);
    ok(g.go, `${tag}: no Start button with a full rest`);
    if (sz.name === 'se' || sz.name === 'iphone') await page.screenshot({ path: path.join(SHOTS, `${tag}-ready.png`) });

    // play every drill: a clean round, then (First Step only) a round with a foot fault
    for (const drill of ['first', 'side', 'call', 'sweet']) {
      await page.evaluate(d => { document.querySelector(`#game [data-drill="${d}"]`).click(); }, drill);
      await page.evaluate(() => document.querySelector('#game [data-go]').click());
      const r = await page.evaluate(new Function('return (' + PLAY + ')')(), 'good');
      const allOk = r.res && r.res.every(x => x.ok);
      ok(r.phase === 'done', `${tag} ${drill}: round did not finish (${r.phase})`);
      ok(allOk && r.ff === 0, `${tag} ${drill}: not every ball right ${JSON.stringify(r.res)}`);
      if (drill === 'first') ok(r.res.every(x => x.ms > 200 && x.ms < 330), `${tag} first: odd times ${r.res.map(x => Math.round(x.ms))}`);
      if (drill === 'sweet') ok(r.res.every(x => Math.abs(x.err) < 40), `${tag} sweet: timing off ${r.res.map(x => Math.round(x.err))}`);
      const stat = await page.evaluate(d => JSON.parse(localStorage.getItem('splitstep_stats')).m[d], drill);
      ok(stat && stat.best != null && stat.best >= 0 && stat.hist.length >= 1, `${tag} ${drill}: no best saved ${JSON.stringify(stat)}`);
      ok(/new best on this phone/i.test(r.card), `${tag} ${drill}: no new-best line: ${r.card.replace(/\n/g, ' | ')}`);
      const fit = await page.evaluate(() => { const s = SplitStep._state(), gr = document.getElementById('game').getBoundingClientRect(), cr = s.card.getBoundingClientRect();
        return { inside: cr.top >= gr.top - 0.5 && cr.bottom <= gr.bottom + 0.5 && cr.left >= gr.left - 0.5 && cr.right <= gr.right + 0.5, scroll: s.card.scrollHeight - s.card.clientHeight }; });
      ok(fit.inside, `${tag} ${drill}: the result card is cut off`);
      if (sz.name === 'se') ok(fit.scroll <= 1, `${tag} ${drill}: result card scrolls by ${fit.scroll}px at 320x568`);
      if ((sz.name === 'se' && drill === 'sweet') || (sz.name === 'iphone' && drill === 'call')) await page.screenshot({ path: path.join(SHOTS, `${tag}-${drill}-done.png`) });
    }
    // a foot fault: counted, the ball played again, and the round is not a best
    await page.evaluate(() => document.querySelector('#game [data-drill="first"]').click());
    await page.evaluate(() => document.querySelector('#game [data-go]').click());
    const ffr = await page.evaluate(new Function('return (' + PLAY + ')')(), 'ff');
    ok(ffr.ff === 1 && ffr.res.length === 5, `${tag}: foot fault not counted right (ff ${ffr.ff}, balls ${ffr.res && ffr.res.length})`);
    ok(/1 foot fault/i.test(ffr.card) && /a best needs every ball right/i.test(ffr.card), `${tag}: foot-fault round card: ${ffr.card.replace(/\n/g, ' | ')}`);
    if (sz.name === 'desk' && scheme === 'light') {
      // two more clean rounds, so the last-rounds chart shows
      for (let k = 0; k < 2; k++) {
        await page.evaluate(() => document.querySelector('#game [data-go]').click());
        await page.evaluate(new Function('return (' + PLAY + ')')(), 'good');
      }
      ok(await page.evaluate(() => !!SplitStep._state().card.querySelector('.ss-spark')), `${tag}: no chart after 3 clean rounds`);
      await page.screenshot({ path: path.join(SHOTS, `${tag}-spark.png`) });
    }
    // mid-ball: a live frame for the eye
    if (sz.name === 'iphone' && scheme === 'light') {
      await page.evaluate(() => document.querySelector('#game [data-drill="sweet"]').click());
      await page.evaluate(() => document.querySelector('#game [data-go]').click());
      await page.waitForFunction(() => { const s = SplitStep._state(); return s.phase === 'live' && performance.now() - s.onset > s.ball.arrive * 0.55; });
      await page.screenshot({ path: path.join(SHOTS, `${tag}-sweet-live.png`) });
      await page.evaluate(() => SplitStep._state() && SplitStep.close());
      await page.click('#door');
      await page.waitForFunction(() => SplitStep.isOpen());
    }
    // time up: the round stops, the card says so, and close() hides the layer
    await page.evaluate(() => document.querySelector('#game [data-go]') && document.querySelector('#game [data-go]').click());
    await page.waitForTimeout(400);
    await page.evaluate(() => SplitStep.timeUp());
    const up = await page.evaluate(() => ({ phase: SplitStep._state().phase, card: SplitStep._state().card.innerText, saved: JSON.parse(localStorage.getItem('splitstep_stats')).m }));
    ok(up.phase === 'up' && /time\. next set\./i.test(up.card), `${tag}: time up card: ${up.phase} ${up.card}`);
    await page.evaluate(() => SplitStep.close());
    ok(await page.evaluate(() => !SplitStep.isOpen() && !document.getElementById('game').classList.contains('visible') && document.getElementById('game').innerHTML === ''), `${tag}: close left the layer up`);
    ok(!errs.length, `${tag}: console errors: ${errs.join(' | ')}`);
    await ctx.close();
  }

  // the rest decides: nearly over (no Start), paused (play on), and the backstop at 0
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const r = await page.evaluate(async () => {
      const root = document.getElementById('game'), out = {};
      let L = 12;
      SplitStep.open({ root, left: () => L });
      await new Promise(r => setTimeout(r, 100));
      const s = SplitStep._state();
      out.nearly = { go: !!s.card.querySelector('[data-go]'), wait: (s.card.querySelector('.ss-wait') || {}).textContent };
      L = 40; await new Promise(r => setTimeout(r, 100));
      out.after = !!s.card.querySelector('[data-go]');   // the button comes back when the rest is extended
      L = null; await new Promise(r => setTimeout(r, 100));
      out.paused = s.clock.innerText;
      L = 0; await new Promise(r => setTimeout(r, 100));
      out.zero = s.phase;
      SplitStep.close();
      return out;
    });
    ok(!r.nearly.go && /not enough rest/i.test(r.nearly.wait || ''), `rest nearly over: ${JSON.stringify(r.nearly)}`);
    ok(r.after, 'Start did not come back after +15s');
    ok(/paused/i.test(r.paused), `paused clock reads "${r.paused}"`);
    ok(r.zero === 'up', `left 0 did not stop the game (${r.zero})`);
    // the hand-back: the host (program.html's Serve Clock) takes the screen back handBackAt seconds before the rest ends
    const hb = await page.evaluate(async () => {
      const root = document.getElementById('game'), out = {};
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const hasGo = () => !!SplitStep._state().card.querySelector('[data-go]');
      localStorage.removeItem('splitstep_stats');
      const buzzes = [];
      Object.defineProperty(navigator, 'vibrate', { configurable: true, value: ms => { buzzes.push(ms); return true; } });
      const ticks = () => buzzes.filter(x => x === 12).length;

      // a number: a round starts only when left - handBackAt covers the drill's need (First Step 19)
      let L = 40;
      SplitStep.open({ root, left: () => L, handBackAt: 25, drill: 'first' });
      await sleep(100);
      out.n40 = hasGo(); out.n40phase = SplitStep._state().phase;   // 40 - 25 = 15 < 19: no Start, and not stopped yet
      L = 50; await sleep(100); out.n50 = hasGo();                  // 25 >= 19
      L = 44; await sleep(100); out.n44 = hasGo();                  // 19 >= 19: just enough
      L = 43; await sleep(100); out.n43 = hasGo();                  // 18 < 19
      SplitStep.close();
      // a function, read live
      let H = 25; L = 50;
      SplitStep.open({ root, left: () => L, handBackAt: () => H, drill: 'first' });
      await sleep(100); out.f25 = hasGo();
      H = 35; await sleep(100); out.f35 = hasGo();                  // 15 < 19
      H = 0; await sleep(100); out.f0 = hasGo();
      SplitStep.close();
      // anything that is not a number means 0: 20 s left covers First Step's 19
      out.junk = [];
      for (const v of ['soon', '25', null, undefined, NaN, Infinity, -5, {}, () => 'x', () => NaN, () => { throw new Error('bad host'); }]) {
        SplitStep.open({ root, left: () => 20, handBackAt: v, drill: 'first' });
        await sleep(60);
        out.junk.push(SplitStep._state().phase === 'ready' && hasGo());
        SplitStep.close();
      }
      // a paused rest allows a round, and does not hand back
      SplitStep.open({ root, left: () => null, handBackAt: 25, drill: 'first' });
      await sleep(100); out.pausedGo = hasGo(); out.pausedPhase = SplitStep._state().phase;
      SplitStep.close();

      // the pill shows the real rest, the warning is against the hand-back (left - 25 <= 10)
      L = 36;
      SplitStep.open({ root, left: () => L, handBackAt: 25, drill: 'first' });
      await sleep(100); const el = SplitStep._state().clock;
      out.low36 = el.classList.contains('low');
      L = 35; await sleep(100); out.low35 = el.classList.contains('low'); out.pill35 = el.innerText;
      L = 34; await sleep(100); out.low34 = el.classList.contains('low'); out.pill34 = el.innerText;
      SplitStep.close();
      // and with no handBackAt the warning is still 10 s from the end
      L = 11; SplitStep.open({ root, left: () => L, drill: 'first' });
      await sleep(100); out.plain11 = SplitStep._state().clock.classList.contains('low');
      L = 10; await sleep(100); out.plain10 = SplitStep._state().clock.classList.contains('low');
      SplitStep.close();

      // the 3-2-1 counts down to the hand-back (left - 25 in 3..1) and not to the rest's end
      buzzes.length = 0; L = 29;
      SplitStep.open({ root, left: () => L, handBackAt: 25, drill: 'first' });
      await sleep(100); out.tick4 = ticks();                        // 4 to go: quiet
      L = 28; await sleep(100); L = 27; await sleep(100); L = 26; await sleep(100);
      out.tick321 = ticks();                                        // 3, 2, 1: three
      SplitStep.close();
      buzzes.length = 0; L = 28;
      SplitStep.open({ root, left: () => L, drill: 'first' });
      await sleep(100); out.tickPlain = ticks();                    // no hand-back: 28 s left is far from 3
      SplitStep.close();
      // quiet during a wait (a beep then would be a second cue)
      buzzes.length = 0; L = 80;
      SplitStep.open({ root, left: () => L, handBackAt: 25, drill: 'first' });
      SplitStep._state().card.querySelector('[data-go]').click();
      out.waitPhase = SplitStep._state().phase;
      L = 27; await sleep(120);
      out.tickWait = ticks();

      // handBack during a round: it stops at once, the round is dropped and not saved, done comes once and on the next tick
      for (let k = 0; k < 400 && SplitStep._state().phase !== 'live'; k++) await sleep(20);
      out.livePhase = SplitStep._state().phase;
      const calls = [];
      const s = SplitStep._state();
      SplitStep.handBack(() => calls.push('first'));
      out.syncPhase = s.phase; out.syncCard = s.card.innerText; out.syncCalls = calls.length; out.syncBall = s.ball;
      await sleep(100);
      out.asyncCalls = calls.length;
      out.srLine = s.sr.textContent; out.srLive = s.sr.getAttribute('aria-live');
      out.pillUp = s.clock.innerText;
      await sleep(1500);   // longer than any ball's window: nothing carries on
      out.laterPhase = s.phase; out.laterRes = s.res.length;
      const saved = JSON.parse(localStorage.getItem('splitstep_stats') || '{}');
      out.saved = saved.m ? saved.m.first.hist.length + '/' + saved.m.first.best : 'none';
      out.stillOpen = SplitStep.isOpen();
      // a second call only calls its done; timeUp() after it does not throw
      SplitStep.handBack(() => calls.push('second'));
      out.second = calls.length;
      await sleep(50);
      out.secondAfter = calls.slice();
      try { SplitStep.timeUp(); out.timeUpAfter = 'ok'; } catch (e) { out.timeUpAfter = 'threw ' + e.message; }
      try { SplitStep.handBack(); SplitStep.handBack('not a function'); out.noDone = 'ok'; } catch (e) { out.noDone = 'threw ' + e.message; }
      // the host closes the game in done()
      SplitStep.handBack(() => SplitStep.close());
      await sleep(50);
      out.hostClosed = !SplitStep.isOpen() && root.innerHTML === '' && !root.classList.contains('visible');

      // handBack while the game is closed still calls done, on the next tick, once
      const closedCalls = [];
      SplitStep.handBack(() => closedCalls.push(1));
      out.closedSync = closedCalls.length;
      await sleep(50);
      out.closedAsync = closedCalls.length;
      // handBack from the ready card (no round) stops it too
      SplitStep.open({ root, left: () => 90, handBackAt: 25, drill: 'sweet' });
      SplitStep.handBack();
      out.readyUp = SplitStep._state().phase + '|' + SplitStep._state().card.innerText.replace(/\n+/g, ' ');
      SplitStep.close();

      // the backstop: left - handBackAt <= 0 stops the game by itself, with no done involved
      L = 60;
      SplitStep.open({ root, left: () => L, handBackAt: 25, drill: 'first' });
      await sleep(100); L = 26; await sleep(100); out.stop26 = SplitStep._state().phase;
      L = 25; await sleep(100); out.stop25 = SplitStep._state().phase; out.stop25card = SplitStep._state().card.innerText.replace(/\n+/g, ' ');
      SplitStep.close();
      L = 60;
      SplitStep.open({ root, left: () => L, handBackAt: 25, drill: 'first' });
      SplitStep._state().card.querySelector('[data-go]').click();   // mid-round
      await sleep(300); L = 24; await sleep(100); out.stopRound = SplitStep._state().phase;
      SplitStep.close();
      // opened already inside the hand-back window: it stops at the first frame
      SplitStep.open({ root, left: () => 20, handBackAt: 25, drill: 'first' });
      await sleep(100); out.inside = SplitStep._state().phase;
      SplitStep.close();
      // and the plain backstop at 0 is unchanged with a hand-back set
      L = 3;
      SplitStep.open({ root, left: () => L, handBackAt: 0, drill: 'first' });
      await sleep(100); out.zeroHand0 = SplitStep._state().phase; L = 0; await sleep(100); out.zeroHand0After = SplitStep._state().phase;
      SplitStep.close();
      delete navigator.vibrate;
      return out;
    });
    ok(!hb.n40 && hb.n40phase === 'ready', `handBackAt 25, left 40: no Start (${hb.n40}, ${hb.n40phase})`);
    ok(hb.n50, 'handBackAt 25, left 50: Start offered');
    ok(hb.n44 && !hb.n43, `handBackAt 25 boundary: left 44 → ${hb.n44}, left 43 → ${hb.n43}`);
    ok(hb.f25 && !hb.f35 && hb.f0, `handBackAt as a function: ${hb.f25}/${hb.f35}/${hb.f0} (want true/false/true)`);
    ok(hb.junk.length === 11 && hb.junk.every(Boolean), `non-numbers mean 0: ${JSON.stringify(hb.junk)}`);
    ok(hb.pausedGo && hb.pausedPhase === 'ready', `paused rest with a hand-back: ${hb.pausedGo}, ${hb.pausedPhase}`);
    ok(!hb.low36 && hb.low35 && hb.low34, `low class against the hand-back: 36 ${hb.low36}, 35 ${hb.low35}, 34 ${hb.low34}`);
    ok(/0:35/.test(hb.pill35) && /0:34/.test(hb.pill34), `the pill shows the real rest: "${hb.pill35}" / "${hb.pill34}"`);
    ok(!hb.plain11 && hb.plain10, `no hand-back: low at 10, not at 11 (${hb.plain11}, ${hb.plain10})`);
    ok(hb.tick4 === 0 && hb.tick321 === 3, `3-2-1 to the hand-back: ${hb.tick4} at 4 to go, ${hb.tick321} for 3-2-1`);
    ok(hb.tickPlain === 0, `no hand-back, 28 s left: no tick (${hb.tickPlain})`);
    ok(hb.waitPhase === 'wait' && hb.tickWait === 0, `3-2-1 quiet during a wait (${hb.waitPhase}, ${hb.tickWait})`);
    ok(hb.livePhase === 'live', `the round never reached a live ball (${hb.livePhase})`);
    ok(hb.syncPhase === 'up' && /time\. next set\./i.test(hb.syncCard) && /back to work/i.test(hb.syncCard), `handBack stops at once: ${hb.syncPhase} "${hb.syncCard}"`);
    ok(hb.syncBall === null, 'handBack left a ball in the air');
    ok(hb.syncCalls === 0 && hb.asyncCalls === 1, `done is asynchronous and once (sync ${hb.syncCalls}, after ${hb.asyncCalls})`);
    ok(/back to work/i.test(hb.srLine) && hb.srLive === 'assertive', `screen reader line: "${hb.srLine}" ${hb.srLive}`);
    ok(hb.laterPhase === 'up' && hb.laterRes === 0, `the dropped round carried on (${hb.laterPhase}, ${hb.laterRes} results)`);
    ok(hb.saved === 'none' || hb.saved === '0/null', `the dropped round was saved (${hb.saved})`);
    ok(hb.stillOpen && hb.second === 1 && JSON.stringify(hb.secondAfter) === '["first","second"]', `second handBack only calls its done (${hb.second}, ${JSON.stringify(hb.secondAfter)})`);
    ok(hb.timeUpAfter === 'ok' && hb.noDone === 'ok', `timeUp / handBack with no done after handBack: ${hb.timeUpAfter}, ${hb.noDone}`);
    ok(hb.hostClosed, 'a host that closes the game in done() left the layer up');
    ok(hb.closedSync === 0 && hb.closedAsync === 1, `handBack while closed: done sync ${hb.closedSync}, after ${hb.closedAsync}`);
    ok(/^up\|.*time\. next set\./i.test(hb.readyUp), `handBack on the ready card: ${hb.readyUp}`);
    ok(hb.stop26 === 'ready' && hb.stop25 === 'up' && /time\. next set\./i.test(hb.stop25card), `backstop at left - handBackAt <= 0: 26 → ${hb.stop26}, 25 → ${hb.stop25}`);
    ok(hb.stopRound === 'up', `backstop mid-round (${hb.stopRound})`);
    ok(hb.inside === 'up', `opened inside the hand-back window (${hb.inside})`);
    ok(hb.zeroHand0 === 'ready' && hb.zeroHand0After === 'up', `backstop at 0 with handBackAt 0: ${hb.zeroHand0}, ${hb.zeroHand0After}`);
    // the background stops a round
    const bg = await page.evaluate(async () => {
      const root = document.getElementById('game');
      SplitStep.open({ root, left: () => 80, drill: 'first' });
      document.querySelector('#game [data-go]').click();
      await new Promise(r => setTimeout(r, 200));
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      const s = SplitStep._state(), out = { phase: s.phase, card: s.card.innerText };
      delete document.hidden; SplitStep.close(); return out;
    });
    ok(bg.phase === 'ready' && /left the app/i.test(bg.card), `background did not stop the round: ${JSON.stringify(bg)}`);
    // storage that throws: the game still plays
    const noStore = await page.evaluate(async () => {
      const orig = Storage.prototype.getItem, origSet = Storage.prototype.setItem;
      Storage.prototype.getItem = () => { throw new Error('blocked'); }; Storage.prototype.setItem = () => { throw new Error('blocked'); };
      try { SplitStep.open({ root: document.getElementById('game'), left: () => 80 }); return SplitStep._state().phase; }
      finally { SplitStep.close(); Storage.prototype.getItem = orig; Storage.prototype.setItem = origSet; }
    });
    ok(noStore === 'ready', `blocked storage broke the game (${noStore})`);
    // the real host: the demo rest runs out while a round is on
    const host = await page.evaluate(async () => {
      document.querySelector('[data-rest="60"]').click();
      document.getElementById('door').click();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      const s = SplitStep._state();
      return { open: SplitStep.isOpen(), clock: s.clock.innerText, go: !!s.card.querySelector('[data-go]') };
    });
    ok(host.open && /1:00|0:59/.test(host.clock) && host.go, `door: ${JSON.stringify(host)}`);
    ok(!errs.length, `console errors: ${errs.join(' | ')}`);
    await ctx.close();
  }
  // reduced motion still plays
  {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.click('#door');
    await page.evaluate(() => { document.querySelector('#game [data-drill="side"]').click(); document.querySelector('#game [data-go]').click(); });
    const r = await page.evaluate(new Function('return (' + PLAY + ')')(), 'good');
    ok(r.phase === 'done' && r.res.every(x => x.ok), `reduced motion round: ${JSON.stringify(r)}`);
    await ctx.close();
  }
  await browser.close(); server.close();
  console.log(`\n${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); server.close(); process.exit(2); });
