// The Lob, a calm breathing door on the rest games' shelf (idea #44 of the Rest in Play round, Amir 2026-10-18 "go with your picks"):
//   node scripts/headless/lob.js [--out <dir>]
//
// The shelf's fourth row opens The Lob, a MODE of assets/js/rally.js (Rally.open({ mode: 'lob' })): the dimmed court, the rest clock and ✕, a
// soft white ball that grows for 4 s (breathe in) and shrinks for 6 s (breathe out), eased, and one word under it. No rackets, no score, no
// counts. This checks the row, that it opens in lob mode with the match untouched, the word's timing (driven by Rally._tick, and once in real
// time), the ball's size, the one-time line (and `lob_seen`, this phone only), the soft tone at each turn (only with the timer's sound on) and no
// buzz, reduced motion, ✕ and Back, Serve Clock's hand-back (the ball settles, the game closes, the get-set line shows), the rest running out,
// Off the Glass after The Lob and the reverse (no state left behind), restGamesOpen() listing Rally once (so timeUp / handBack run once), and
// the layout in light and dark at 390 and 320 x 568. Serve the repo first (python -m http.server 8883 --bind 127.0.0.1; see lib.js:
// PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const t = H.checker();
const wait = (p, ms) => p.waitForTimeout(ms);
const REST = 0.36;   // the ball's resting size, a share of its full size (LOB.rest in rally.js)

// The shelf may already be open from the last time, so the door is tapped only when it is folded.
async function lobRow(p, key = 'lob') {
  if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
  await p.click('#timerGames [data-game="' + key + '"]');
}
// Counts what a lob must not do (a buzz) and what it does at a turn (one oscillator), without changing either.
const instrument = p => p.evaluate(() => {
  window.__osc = 0; window.__vib = 0;
  const A = window.AudioContext || window.webkitAudioContext;
  if (A) { const oc = A.prototype.createOscillator; A.prototype.createOscillator = function () { window.__osc++; return oc.apply(this, arguments); }; }
  navigator.vibrate = function () { window.__vib++; return true; };
});

async function openLob(browser, opts = {}) {
  const P = H.fixture();
  const o = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: P }, opts.demo ? { query: '?client=demo', stub: { demo: P } } : {}, opts));
  o.p.setDefaultTimeout(8000);
  await instrument(o.p);
  if (opts.reduced) await o.p.emulateMedia({ reducedMotion: 'reduce' });
  await o.p.evaluate(() => openRest(120, 'Back Squat'));
  await wait(o.p, 300);
  await lobRow(o.p);
  await o.p.waitForFunction(() => window.Rally && Rally.isOpen(), null, { timeout: 8000 });
  await wait(o.p, 300);
  return o;
}
// Stop the page's own frames and put the breath at 0, so Rally._tick is the only clock and the phase checks are exact.
const freeze = p => p.evaluate(() => {
  const s = Rally._state(); cancelAnimationFrame(s.raf); s.raf = 0;
  const L = s.lob; L.t = 0; L.k = 0; L.phase = 'in'; L.settle = null; L.frozen = false;
  s.wordEl.textContent = 'Breathe in';
  Rally._tick(0.001);   // paint it
});
const tick = (p, s) => p.evaluate(x => Rally._tick(x), s);
const view = p => p.evaluate(() => {
  const s = Rally._state(); if (!s) return null;
  const L = s.lob, m = /scale\(([\d.]+)\)/.exec(L.ballEl.style.transform);
  return { mode: s.mode, word: s.wordEl.textContent, sc: m ? +m[1] : null, t: +L.t.toFixed(2), halo: +L.haloEl.style.opacity, shadow: +L.shadowEl.style.opacity,
    hint: s.hintEl ? { fade: s.hintEl.classList.contains('lob-fade'), hidden: s.hintEl.hidden } : null };
});
const near = (a, b, e) => Math.abs(a - b) <= e;
const ease = x => (1 - Math.cos(Math.PI * x)) / 2;
const SC = k => REST + (1 - REST) * k;
const rect = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const apart = (a, b) => a.b <= b.t + 0.5 || b.b <= a.t + 0.5 || a.r <= b.l + 0.5 || b.r <= a.l + 0.5;

// helpers that need the day view (the card's real Rest button), as serve-clock.js has them
async function openDay(browser) {
  const P = H.fixture(); const day = P.workouts.days[0];
  const ex = n => day.blocks.reduce((a, b) => a.concat(b.exercises), []).find(e => e.name === n);
  ex('Half Kneeling Pallof Press').rx.rest = 60;
  const o = await H.openProgram(browser, { w: 390, h: 844, prog: P });
  o.p.setDefaultTimeout(8000);
  await instrument(o.p);
  await o.p.evaluate(() => openDayView('1'));
  await wait(o.p, 250);
  return o;
}
async function rallyOpen(p) { await lobRow(p, 'rally'); await p.waitForFunction(() => window.Rally && Rally.isOpen() && Rally._state().mode === undefined, null, { timeout: 8000 }); await wait(p, 300); }
const restOn = (p, name) => p.evaluate(`(() => { const c = ${H.card(name)}; c.querySelector('.rest-btn').click(); })()`);
const tickSet = async (p, name, i) => { await p.evaluate(`(() => { const c = ${H.card(name)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.querySelectorAll('.ex-set-check')[${i}].click(); try { hideAaToast(); } catch (e) {} })()`); await wait(p, 150); };
const serveView = p => p.evaluate(() => {
  const q = id => document.getElementById(id), door = q('timerPlayBtn'), box = q('timerGetSet');
  return { timer: q('timerOverlay').classList.contains('visible'), running: timerRunning, door: !door.hidden && getComputedStyle(door).display !== 'none',
    box: !box.hidden && getComputedStyle(box).display !== 'none', k: box.querySelector('.tgs-k').textContent, next: q('timerGetNext').textContent.replace(/\s+/g, ' ').trim(), cue: q('timerGetCue').hidden ? '' : q('timerGetCue').textContent };
});

(async () => {
  const browser = await H.launch();
  const out = H.outDir();
  const errors = [];
  try {
    // ── 1. the row, and it opens in lob mode ─────────────────────────────────────────────────────────────────────────────────────
    let { ctx, p } = await openLob(browser);
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(() => foldRestGames());
    const rows = await p.evaluate(() => Array.from(document.querySelectorAll('#timerGames .tg-row')).map(r => ({ g: r.dataset.game, name: r.querySelector('b').textContent, small: r.querySelector('small').textContent, on: r.getAttribute('onclick') })));
    const row = rows.find(r => r.g === 'lob');
    t.check('the shelf has four rows and The Lob is the last', rows.length === 4 && rows[3].g === 'lob', rows.map(r => r.g).join(','));
    t.check('its row reads The Lob, "Breathe with the ball · in 4, out 6", and opens the lob', !!row && row.name === 'The Lob' && row.small === 'Breathe with the ball · in 4, out 6' && row.on === "openRestGame('lob')", JSON.stringify(row));
    t.check('REST_GAMES gives it rally.js, Rally, the Off the Glass layer and mode lob', JSON.stringify(await p.evaluate(() => REST_GAMES.lob)) === JSON.stringify({ src: '/assets/js/rally.js', global: 'Rally', root: 'rallyOverlay', mode: 'lob' }));
    const st = await p.evaluate(() => { const s = Rally._state(); return { mode: s.mode, vis: document.getElementById('rallyOverlay').classList.contains('visible'), timer: document.getElementById('timerOverlay').classList.contains('visible'),
      running: timerRunning, label: document.getElementById('rallyOverlay').getAttribute('aria-label'), last: localStorage.getItem('rest_game_last'),
      match: ['score', 'ball', 'you', 'amir', 'target', 'best', 'form'].filter(k => s[k] !== undefined), rackets: !!document.querySelector('#rallyOverlay .rally-cv, #rallyOverlay .rally-msg'),
      stats: localStorage.getItem('rally_stats'), canvases: document.querySelectorAll('#rallyOverlay canvas').length }; });
    t.check('the row opens the lob over the running rest, full screen', st.mode === 'lob' && st.vis && st.timer && st.running, JSON.stringify(st));
    t.check('it is a lob, not a match: no score, ball, rackets or form, no game canvas or message box', st.match.length === 0 && !st.rackets && st.canvases === 1, JSON.stringify(st));
    t.check('nothing is written to rally_stats, and rest_game_last is lob', st.stats === null && st.last === 'lob', JSON.stringify(st));
    t.check('the layer is named The Lob for a screen reader while it is open', st.label === 'The Lob', st.label);
    const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => /lob/i.test(k)));
    t.check('its only key is lob_seen, with no athlete prefix (never synced)', keys.length === 1 && keys[0] === 'lob_seen' && (await p.evaluate(() => localStorage.getItem('lob_seen'))) === '1', keys.join(','));
    const clock = await p.evaluate(() => { const c = document.querySelector('.rally-clock'); return { txt: c.querySelector('b').textContent, role: c.getAttribute('role'), x: document.querySelector('.rally-x').getAttribute('aria-label') }; });
    t.check('the rest clock and ✕ are the game\'s: the clock runs and ✕ is named', /^\d:\d\d$/.test(clock.txt) && clock.txt !== '0:00' && clock.role === 'timer' && clock.x === 'Back to the rest timer', JSON.stringify(clock));
    const hint = await p.evaluate(() => { const h = document.querySelector('.lob-hint'); return h ? h.textContent : null; });
    t.check('the first open on this phone shows the one line', hint === 'Breathe in as the ball rises. Breathe out as it falls.', String(hint));
    await p.screenshot({ path: path.join(out, 'lob-open-390.png') });

    // ── 2. the word and the ball, driven by Rally._tick ──
    await freeze(p);
    let v = await view(p);
    t.check('it starts on "Breathe in" with the ball at its resting size', v.word === 'Breathe in' && near(v.sc, REST, 0.001), JSON.stringify(v));
    await tick(p, 2);
    v = await view(p);
    t.check('2 s in, the ball is half grown (eased) and the word is still Breathe in', v.word === 'Breathe in' && near(v.sc, SC(0.5), 0.01), JSON.stringify(v));
    await tick(p, 1.9);
    v = await view(p);
    t.check('at 3.9 s it is still Breathe in, nearly full', v.word === 'Breathe in' && v.sc > SC(0.97), JSON.stringify(v));
    await tick(p, 0.2);
    v = await view(p);
    t.check('at 4.1 s the word turns to Breathe out and the ball is full', v.word === 'Breathe out' && v.sc > SC(0.99), JSON.stringify(v));
    await tick(p, 2.9);
    v = await view(p);
    t.check('at 7.0 s (3 s into the 6 s out) the ball is half-way down', v.word === 'Breathe out' && near(v.sc, SC(0.5), 0.02), JSON.stringify(v));
    await tick(p, 2.9);
    v = await view(p);
    t.check('at 9.9 s it is still Breathe out, nearly back to rest', v.word === 'Breathe out' && v.sc < SC(0.03), JSON.stringify(v));
    await tick(p, 0.2);
    v = await view(p);
    t.check('at 10.1 s the word turns back to Breathe in, and the breath goes on for ever', v.word === 'Breathe in' && v.t > 10 && v.sc < SC(0.01), JSON.stringify(v));
    await tick(p, 1.9);
    v = await view(p);
    t.check('and it grows again (12.0 s = 2 s into the second breath): Breathe in, half grown', v.word === 'Breathe in' && near(v.sc, SC(0.5), 0.02), JSON.stringify(v));
    // the size follows one smooth curve: no step bigger than the eased curve allows between two quarter-seconds
    await freeze(p);
    const steps = await p.evaluate(() => { let prev = null, worst = 0, mono = true, last = -1; const s = Rally._state();
      for (let i = 0; i < 80; i++) { Rally._tick(0.125); const sc = +/scale\(([\d.]+)\)/.exec(s.lob.ballEl.style.transform)[1];
        if (prev !== null) { worst = Math.max(worst, Math.abs(sc - prev)); if (s.lob.t < 4 && sc < prev - 1e-6) mono = false; if (s.lob.t > 4.2 && s.lob.t < 10 && sc > prev + 1e-6) mono = false; }
        prev = sc; }
      return { worst: +worst.toFixed(4), mono }; });
    t.check('the size is eased: it only grows while breathing in and only shrinks while breathing out, in small steps', steps.mono && steps.worst < 0.04, JSON.stringify(steps));

    // ── 3. sound (the timer's sound is on) and no buzz ──
    await freeze(p);
    const o0 = await p.evaluate(() => window.__osc);
    await tick(p, 3.9);
    t.check('no tone while the breath runs between turns', (await p.evaluate(() => window.__osc)) === o0);
    await tick(p, 0.2);
    t.check('one tone at the turn from in to out', (await p.evaluate(() => window.__osc)) === o0 + 1);
    await tick(p, 6);
    t.check('and one at the turn from out to in', (await p.evaluate(() => window.__osc)) === o0 + 2);
    t.check('no buzz at any turn (navigator.vibrate is never called)', (await p.evaluate(() => window.__vib)) === 0);
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'js', 'rally.js'), 'utf8');
    const lobSrc = src.slice(src.indexOf('// ── The Lob (idea #44'), src.indexOf('window.Rally = {'));
    t.check('the lob code has no buzz and no vibrate call at all', lobSrc.length > 3000 && !/buzz\(|vibrate/.test(lobSrc.replace(/\/\/.*$/gm, '')));
    // tone is quiet: the gain peaks at 0.05 and the pitch is low (below the game's lowest hit tone)
    t.check('the tone is very soft and low (gain 0.05, 262 and 196 Hz)', /exponentialRampToValueAtTime\(0\.05,/.test(lobSrc) && /inHz: 262, outHz: 196/.test(lobSrc));

    // ── 4. the one-time line: two breaths, a fade, then gone ──
    await freeze(p);
    await tick(p, 19.9);
    v = await view(p);
    t.check('the one-time line is still there through the first two breaths (19.9 s)', v.hint && !v.hint.fade && !v.hint.hidden, JSON.stringify(v.hint));
    await tick(p, 0.3);
    v = await view(p);
    t.check('it fades after the second breath (20.2 s)', v.hint && v.hint.fade && !v.hint.hidden, JSON.stringify(v.hint));
    await tick(p, 1.5);
    t.check('and is gone a moment later (21.7 s)', (await view(p)).hint === null);
    t.check('the line has not been shown a second time: nothing left of it in the layer', (await p.evaluate(() => document.querySelectorAll('.lob-hint').length)) === 1 && (await p.evaluate(() => document.querySelector('.lob-hint').hidden)));

    // ── 5. ✕ and Back return to the running rest ──
    await p.click('.rally-x');
    await wait(p, 250);
    let back = await p.evaluate(() => ({ game: Rally.isOpen(), vis: document.getElementById('rallyOverlay').classList.contains('visible'), html: document.getElementById('rallyOverlay').innerHTML.length,
      timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning, label: document.getElementById('rallyOverlay').getAttribute('aria-label'), state: Rally._state() }));
    t.check('✕ closes the lob, the rest keeps running, and the layer has its name back', !back.game && !back.vis && back.html === 0 && back.timer && back.running && back.label === 'Off the Glass' && back.state === null, JSON.stringify(back));
    t.check('the shelf is where the athlete left it and focus is on the door or the clock', await p.evaluate(() => { const a = document.activeElement; return !!a && (a.id === 'timerPlayBtn' || a.id === 'startStopBtn'); }));

    // ── 6. the second open: no line, and the real clock (the word turns at 4 s and at 10 s, ±0.2 s) ──
    await p.evaluate(() => { window.__osc = 0; window.__vib = 0; });
    await lobRow(p);
    await p.waitForFunction(() => Rally.isOpen());
    t.check('the second open shows no line, and lob_seen stays set', (await p.evaluate(() => document.querySelectorAll('.lob-hint').length)) === 0 && (await p.evaluate(() => localStorage.getItem('lob_seen'))) === '1');
    const rt = await p.evaluate(() => new Promise(res => {
      const s = Rally._state(), t0 = performance.now(), off = s.lob.t, seen = []; let last = s.wordEl.textContent;
      (function poll() {
        const w = s.wordEl.textContent;
        if (w !== last) { seen.push({ w, at: +((performance.now() - t0) / 1000 + off).toFixed(2), lt: +s.lob.t.toFixed(2) }); last = w; }
        if (performance.now() - t0 < 10600 - off * 1000) requestAnimationFrame(poll); else res({ seen, off: +off.toFixed(2), osc: window.__osc, vib: window.__vib });
      })();
    }));
    t.check('in real time the word turns to Breathe out at 4 s and back to Breathe in at 10 s, ±0.2 s',
      rt.seen.length === 2 && rt.seen[0].w === 'Breathe out' && near(rt.seen[0].at, 4, 0.2) && rt.seen[1].w === 'Breathe in' && near(rt.seen[1].at, 10, 0.2), JSON.stringify(rt));
    t.check('…with one soft tone at each of those turns and no buzz', rt.osc === 2 && rt.vib === 0, JSON.stringify(rt));
    await p.screenshot({ path: path.join(out, 'lob-realtime-390.png') });
    await p.evaluate(() => history.back());
    await wait(p, 400);
    back = await p.evaluate(() => ({ game: Rally.isOpen(), vis: document.getElementById('rallyOverlay').classList.contains('visible'), timer: document.getElementById('timerOverlay').classList.contains('visible'), running: timerRunning }));
    t.check('Back closes the lob, the rest keeps running', !back.game && !back.vis && back.timer && back.running, JSON.stringify(back));

    // ── 7. Off the Glass after The Lob, and The Lob after Off the Glass: no state left behind ──
    await rallyOpen(p);
    let g = await p.evaluate(() => { const s = Rally._state(), r = document.getElementById('rallyOverlay');
      return { mode: s.mode, score: s.score, ball: !!s.ball, canvas: !!r.querySelector('.rally-cv'), lob: !!r.querySelector('.lob-stage, .lob-cv'), label: r.getAttribute('aria-label'), msg: !!r.querySelector('.rally-msg') }; });
    t.check('Off the Glass after The Lob is the game: a score, a ball, its canvas, its name; no lob left in the layer', g.mode === undefined && g.score && g.score.you === 0 && g.ball && g.canvas && !g.lob && g.label === 'Off the Glass' && g.msg, JSON.stringify(g));
    const played = await p.evaluate(async () => { const s = Rally._state(); await new Promise(r => setTimeout(r, 900)); Rally._tick(1 / 60); return [s.ball.x, s.ball.y].every(Number.isFinite) && s.W > 300; });
    t.check('…and it plays', played);
    await p.click('.rally-x');
    await wait(p, 200);
    await lobRow(p);
    await p.waitForFunction(() => Rally.isOpen());
    g = await p.evaluate(() => { const s = Rally._state(), r = document.getElementById('rallyOverlay');
      return { mode: s.mode, match: ['score', 'ball', 'you', 'amir'].filter(k => s[k] !== undefined), game: !!r.querySelector('.rally-cv, .rally-msg'), lob: !!r.querySelector('.lob-stage'), label: r.getAttribute('aria-label'), stats: localStorage.getItem('rally_stats') }; });
    t.check('The Lob after Off the Glass is the lob again: no match fields, no game canvas or message box, its name', g.mode === 'lob' && g.match.length === 0 && !g.game && g.lob && g.label === 'The Lob', JSON.stringify(g));
    t.check('neither wrote a stat the other could read (rally_stats is still empty: no match was finished)', g.stats === null, String(g.stats));
    // straight across, with one open and the other asked for by program.html (openRestGame())
    await p.evaluate(() => openRestGame('rally'));
    await p.waitForFunction(() => Rally.isOpen() && Rally._state().mode === undefined, null, { timeout: 5000 });
    g = await p.evaluate(() => { const r = document.getElementById('rallyOverlay'); return { open: restGamesOpen().length, canvas: !!r.querySelector('.rally-cv'), lob: !!r.querySelector('.lob-stage'), label: r.getAttribute('aria-label') }; });
    t.check('asking for Off the Glass while The Lob is open swaps them: one game, no lob left', g.open === 1 && g.canvas && !g.lob && g.label === 'Off the Glass', JSON.stringify(g));
    await p.evaluate(() => openRestGame('lob'));
    await p.waitForFunction(() => Rally.isOpen() && Rally._state().mode === 'lob', null, { timeout: 5000 });
    g = await p.evaluate(() => { const r = document.getElementById('rallyOverlay'); return { open: restGamesOpen().length, canvas: !!r.querySelector('.rally-cv'), lob: !!r.querySelector('.lob-stage'), label: r.getAttribute('aria-label') }; });
    t.check('and asking for The Lob while Off the Glass is open swaps them back', g.open === 1 && !g.canvas && g.lob && g.label === 'The Lob', JSON.stringify(g));
    await wait(p, 600);

    // ── 8. restGamesOpen() lists Rally once, so timeUp() and handBack() run once ──
    const once = await p.evaluate(() => { const l = restGamesOpen(); return { n: l.length, same: l[0] === window.Rally, keys: Object.keys(REST_GAMES).filter(k => window[REST_GAMES[k].global] === window.Rally) }; });
    t.check('with the lob open, restGamesOpen() has Rally once although two keys share it', once.n === 1 && once.same && once.keys.length === 2, JSON.stringify(once));
    await p.evaluate(() => closeRestGames());
    t.check('closeRestGames() closes it and nothing is left open', await p.evaluate(() => restGamesOpen().length === 0 && !Rally.isOpen()));
    await ctx.close();

    // ── 9. Serve Clock: the hand-back closes the lob within about a second and the get-set line shows ──
    ({ ctx, p } = await openDay(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await tickSet(p, 'Half Kneeling Pallof Press', 0);
    await restOn(p, 'Half Kneeling Pallof Press');   // written 60 s: the hand-back is at 25 s
    await wait(p, 300);
    await lobRow(p);
    await p.waitForFunction(() => window.Rally && Rally.isOpen());
    await wait(p, 300);
    await p.evaluate(() => { window.__hb = { n: 0, at: 0, done: 0 }; const o = Rally.handBack; Rally.handBack = function (d) { window.__hb.n++; window.__hb.at = performance.now(); return o.call(Rally, function () { window.__hb.done++; d(); }); }; });
    await p.evaluate(() => { Rally._state().lob.t = 3.95; });   // the ball is nearly full when the rest asks for the screen back (the page's own frames keep running: the settle needs them)
    await wait(p, 150);
    const full = await view(p);
    t.check('before the hand-back the ball is full', full.sc > SC(0.97), JSON.stringify(full));
    await p.evaluate(() => { timerEndsAt = Date.now() + 24 * 1000; });
    await p.waitForFunction(() => window.__hb.n > 0, null, { timeout: 2000 });
    await wait(p, 300);
    const mid = await p.evaluate(() => { const s = Rally._state(); return s ? { k: s.lob.settle ? +s.lob.settle.k.toFixed(3) : null, gone: s.wordEl.classList.contains('lob-gone'), open: true } : { open: false }; });
    t.check('300 ms into the hand-back the ball is settling (smaller than full, bigger than rest) and the word is fading', mid.open && mid.k !== null && mid.k > 0.05 && mid.k < 0.95 && mid.gone, JSON.stringify(mid));
    await p.waitForFunction(() => !Rally.isOpen(), null, { timeout: 2500 });
    const after = await p.evaluate(() => ({ closeAt: performance.now(), n: window.__hb.n, at: window.__hb.at, done: window.__hb.done }));
    const took = after.closeAt - after.at;
    t.check('Rally.handBack ran once, and the lob closed itself within about a second of it (settle 0.6 s)', after.n === 1 && after.done === 1 && took > 500 && took < 1300, JSON.stringify({ n: after.n, done: after.done, took: Math.round(took) }));
    const sv = await serveView(p);
    t.check('the timer is still there, running, the door gone, and the get-set line shows the next set and the cue', sv.timer && sv.running && !sv.door && sv.box && sv.k === 'Get set' && sv.next === 'Next: Half Kneeling Pallof Press · set 2 of 3' && sv.cue === 'Ribs down', JSON.stringify(sv));
    t.check('focus went to the clock\'s button, not the hidden door', await p.evaluate(() => document.activeElement && document.activeElement.id === 'startStopBtn'));
    await p.screenshot({ path: path.join(out, 'lob-handback-390.png') });
    t.check('a lob cannot be opened after the hand-back', await (async () => { await p.evaluate(() => openRestGame('lob')); await wait(p, 500); return p.evaluate(() => !Rally.isOpen()); })());
    await ctx.close();

    // direct API: handBack and timeUp are idempotent, and handBack with no game calls done at once
    ({ ctx, p } = await openLob(browser));
    p.on('pageerror', e => errors.push(String(e)));
    const idem = await p.evaluate(async () => {
      const r = { done: 0, done2: 0 }, a = performance.now();
      Rally.handBack(() => { r.done++; r.at = performance.now() - a; });
      Rally.handBack(() => { r.done2++; });
      Rally.timeUp(); Rally.timeUp();
      await new Promise(res => setTimeout(res, 1100));
      r.word = Rally._state().wordEl.textContent;
      Rally.close();
      let n = 0; Rally.handBack(() => n++); r.noGame = n;
      Rally.timeUp(); Rally.close();
      return r;
    });
    t.check('handBack twice: the first done() stands and runs once, after about 0.6 s; timeUp twice is harmless', idem.done === 1 && idem.done2 === 0 && idem.at > 500 && idem.at < 900 && !errors.length, JSON.stringify(idem));
    t.check('handBack with no game calls done() at once; timeUp and close with no game do nothing', idem.noGame === 1, JSON.stringify(idem));
    await ctx.close();

    // ── 10. the rest runs out: the lob stops at once, says so, and closes with the timer ──
    ({ ctx, p } = await openLob(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(() => { window.__tu = 0; const o = Rally.timeUp; Rally.timeUp = function () { window.__tu++; return o.apply(Rally, arguments); }; });
    // Serve Clock would hand the lob back with 30 s left; this check is the rest running out on a lob that is still open
    await p.evaluate(() => { SERVE_CLOCK.at = 0; SERVE_CLOCK.atLong = 0; timerEndsAt = Date.now() + 2000; });
    await wait(p, 1200);
    await wait(p, 1000);
    const up = await p.evaluate(() => { const s = Rally._state(); return s ? { timeUp: s.timeUp, word: s.wordEl.textContent, clock: s.clock.querySelector('b').textContent, frozen: s.lob.frozen, calls: window.__tu } : null; });
    t.check('at zero timeUp() ran once: the lob stopped, the clock says 0:00 and the word says Time. Next set.', up && up.timeUp && up.frozen && up.word === 'Time. Next set.' && up.clock === '0:00' && up.calls === 1, JSON.stringify(up));
    const still1 = (await view(p)).sc;
    await wait(p, 400);
    t.check('the ball stopped where it was: it does not go on breathing, nor settle', near(still1, (await view(p)).sc, 0.0001), still1);
    await p.screenshot({ path: path.join(out, 'lob-timeup-390.png') });
    await wait(p, 1300);
    const gone = await p.evaluate(() => ({ game: Rally.isOpen(), timer: document.getElementById('timerOverlay').classList.contains('visible'), html: document.getElementById('rallyOverlay').innerHTML.length, label: document.getElementById('rallyOverlay').getAttribute('aria-label') }));
    t.check('then the lob and the timer close together, and the layer has its name back', !gone.game && !gone.timer && gone.html === 0 && gone.label === 'Off the Glass', JSON.stringify(gone));
    await ctx.close();

    // ── 11. no sound when the timer's sound is off ──
    ({ ctx, p } = await openLob(browser));
    await p.evaluate(() => closeRestGames());
    await p.evaluate(() => { localStorage.setItem('rest_sound', '0'); window.__osc = 0; });
    await lobRow(p);
    await p.waitForFunction(() => Rally.isOpen());
    await freeze(p); await tick(p, 21);
    t.check('with the timer\'s sound off, a whole breath and more makes no tone', (await p.evaluate(() => window.__osc)) === 0 && (await p.evaluate(() => window.__vib)) === 0);
    await ctx.close();

    // ── 12. reduced motion: the ball still changes size (it is the pacer), the glow does not pulse ──
    ({ ctx, p } = await openLob(browser, { reduced: true }));
    p.on('pageerror', e => errors.push(String(e)));
    t.check('the page reports reduced motion', await p.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches && Rally._state().reduce === true));
    await freeze(p);
    const rm = [];
    for (const s of [0, 4, 3, 3]) { await tick(p, s); rm.push(await view(p)); }   // t = 0, 4, 7, 10
    t.check('reduced motion: the ball still grows to full and shrinks back', near(rm[0].sc, REST, 0.001) && rm[1].sc > SC(0.99) && rm[2].sc > SC(0.4) && rm[2].sc < SC(0.6) && rm[3].sc < SC(0.01), JSON.stringify(rm.map(x => x.sc)));
    t.check('…and the glow does not pulse: one halo opacity at every size', new Set(rm.map(x => x.halo)).size === 1, JSON.stringify(rm.map(x => x.halo)));
    const anim = await p.evaluate(() => { const w = document.querySelector('.lob-word'); return { a: getComputedStyle(w).animationName, tr: getComputedStyle(w).transitionDuration }; });
    t.check('…and the word does not animate in', anim.a === 'none' && /^0s/.test(anim.tr), JSON.stringify(anim));
    await ctx.close();
    ({ ctx, p } = await openLob(browser));
    await freeze(p);
    const nm = [];
    for (const s of [0, 4, 3, 3]) { await tick(p, s); nm.push(await view(p)); }
    t.check('without reduced motion the glow does breathe with the ball (it is brightest at full size)', nm[1].halo > nm[0].halo + 0.3 && nm[2].halo < nm[1].halo && nm[3].halo < nm[2].halo, JSON.stringify(nm.map(x => x.halo)));
    t.check('the shadow slides away and fades as the ball rises, and comes back as it falls', nm[1].shadow < nm[0].shadow && nm[3].shadow > nm[1].shadow, JSON.stringify(nm.map(x => x.shadow)));
    await ctx.close();

    // ── 13. layout: light and dark, 390 and 320 x 568 ──
    for (const dark of [false, true]) for (const [w, h] of [[390, 844], [320, 568]]) {
      const tag = (dark ? 'dark' : 'light') + '-' + w;
      ({ ctx, p } = await openLob(browser, { w, h, dark }));
      p.on('pageerror', e => errors.push(String(e)));
      await freeze(p);
      for (const [label, secs] of [['full', 4], ['rest', 6]]) {
        await tick(p, secs);   // 4 s: full; 10 s: back at rest (the second tick of 6 s)
        await wait(p, 700);    // the word fades in over 0.5 s at each turn: measure and shoot it whole
        const L = await p.evaluate(() => {
          const q = s => { const e = document.querySelector(s), r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; };
          const s = Rally._state();
          const px = (el, a) => { const r = el.getBoundingClientRect(), c = s.cv.getBoundingClientRect(), d = s.dpr, pts = [[.1, .5], [.5, .2], [.5, .8], [.9, .5], [.5, .5]]; let lum = 0;
            const lu = ([R, G, B]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(R) + .7152 * f(G) + .0722 * f(B); };
            const cs = getComputedStyle(el).color.match(/[\d.]+/g).map(Number), al = cs.length > 3 ? cs[3] : 1; let worst = 99;
            pts.forEach(([fx, fy]) => { const x = Math.round((r.left + r.width * fx - c.left) * d), y = Math.round((r.top + r.height * fy - c.top) * d), bg = Array.from(s.g.getImageData(x, y, 1, 1).data).slice(0, 3);
              const fg = [0, 1, 2].map(i => al * cs[i] + (1 - al) * bg[i]), a = lu(fg), b = lu(bg); worst = Math.min(worst, (Math.max(a, b) + .05) / (Math.min(a, b) + .05)); });
            return +worst.toFixed(1); };
          const hint = document.querySelector('.lob-hint');
          return { w: innerWidth, h: innerHeight, sw: document.documentElement.scrollWidth, clock: q('.rally-clock'), x: q('.rally-x'), orb: q('.lob-orb'), ball: q('.lob-ball'), word: q('.lob-word'), hint: hint ? q('.lob-hint') : null,
            wordFs: parseFloat(getComputedStyle(document.querySelector('.lob-word')).fontSize), hintFs: hint ? parseFloat(getComputedStyle(hint).fontSize) : null,
            wordOp: +getComputedStyle(document.querySelector('.lob-word')).opacity, wordC: px(document.querySelector('.lob-word'), 1), hintC: hint ? px(hint, 1) : null, text: document.querySelector('.lob-word').textContent };
        });
        const inside = r => r.l >= -0.5 && r.r <= L.w + 0.5 && r.t >= -0.5 && r.b <= L.h + 0.5;
        const ok = apart(L.clock, L.x) && L.orb.t >= L.clock.b && L.orb.b <= L.word.t + 0.5 && (!L.hint || L.word.b <= L.hint.t + 0.5) && [L.clock, L.x, L.orb, L.word].concat(L.hint ? [L.hint] : []).every(inside) && L.sw <= L.w;
        t.check(`${tag} (${label}): clock, ✕, ball, word and line sit apart, inside the screen, with no sideways scroll`, ok, JSON.stringify({ w: L.w, h: L.h, sw: L.sw, clock: L.clock, x: L.x, orb: L.orb, word: L.word, hint: L.hint }));
        t.check(`${tag} (${label}): the word is 30 px or more and the line 15 px or more, both at 4.5:1 or better on the court`, L.wordFs >= 30 && L.wordOp === 1 && (!L.hint || L.hintFs >= 15) && L.wordC >= 4.5 && (!L.hint || L.hintC >= 4.5), JSON.stringify({ wordFs: L.wordFs, wordOp: L.wordOp, hintFs: L.hintFs, wordC: L.wordC, hintC: L.hintC }));
        await p.screenshot({ path: path.join(out, `lob-${tag}-${label}.png`) });
      }
      // the shelf with four rows
      await p.evaluate(() => closeRestGames());
      await wait(p, 200);
      if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
      await p.evaluate(() => document.querySelector('#timerGames [data-game="lob"]').scrollIntoView({ block: 'nearest' }));
      await wait(p, 200);
      const sh = await p.evaluate(() => {
        const rs = Array.from(document.querySelectorAll('#timerGames .tg-row')).map(r => { const b = r.getBoundingClientRect(), sm = r.querySelector('small'), nm = r.querySelector('b'); return { l: b.left, t: b.top, r: b.right, b: b.bottom, g: r.dataset.game, clip: sm.scrollWidth > sm.clientWidth + 1 || r.scrollHeight > r.clientHeight + 1, nameClip: nm.scrollWidth > nm.clientWidth + 1, smallFs: parseFloat(getComputedStyle(sm).fontSize) }; });
        return { rs, w: innerWidth, sw: document.documentElement.scrollWidth, first: rs.length };
      });
      const stacked = sh.rs.every((r, i) => i === 0 || r.t >= sh.rs[i - 1].b - 0.5), within = sh.rs.every(r => r.l >= 0 && r.r <= sh.w + 0.5);
      t.check(`${tag}: the shelf's four rows stack without overlap, stay inside the screen and clip no text`, sh.rs.length === 4 && stacked && within && sh.sw <= sh.w && sh.rs.every(r => !r.clip && !r.nameClip && r.smallFs >= 12), JSON.stringify(sh));
      await p.screenshot({ path: path.join(out, `lob-shelf-${tag}.png`) });
      await ctx.close();
    }

    // ── 14. the demo banner ──
    ({ ctx, p } = await openLob(browser, { demo: true }));
    const demo = await p.evaluate(() => { const b = document.querySelector('.demo-banner, #demo-banner'), o = document.getElementById('rallyOverlay').getBoundingClientRect(), x = document.querySelector('.rally-x').getBoundingClientRect();
      return { bannerBottom: b ? b.getBoundingClientRect().bottom : null, top: o.top, xTop: x.top }; });
    t.check('in the demo the lob sits under the banner', demo.bannerBottom == null || (demo.top >= demo.bannerBottom - 1 && demo.xTop >= demo.bannerBottom - 1), JSON.stringify(demo));
    await ctx.close();

    // ── 15. the guide and the file ──
    ({ ctx, p } = await openLob(browser));
    const guide = await p.evaluate(() => APP_GUIDE.map(c => c.body).join(' '));
    t.check('the guide\'s rest timer entry names The Lob: "in as it rises, out as it falls"', /<strong>The Lob<\/strong> is a slow ball to breathe with: in as it rises, out as it falls\./.test(guide));
    t.check('…and still says all of them stop with about 25 seconds left', /All of them stop with about 25 seconds left/.test(guide));
    await ctx.close();
    const hexes = lobSrc.match(/#[0-9a-fA-F]{6}\b/g) || [];
    const yellow = hexes.filter(h => { const r = parseInt(h.slice(1, 3), 16), g2 = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
      const mx = Math.max(r, g2, b), mn = Math.min(r, g2, b); if (mx - mn < 40) return false;
      let hue; if (mx === r) hue = 60 * (((g2 - b) / (mx - mn)) % 6); else if (mx === g2) hue = 60 * ((b - r) / (mx - mn) + 2); else hue = 60 * ((r - g2) / (mx - mn) + 4);
      if (hue < 0) hue += 360; return hue >= 38 && hue <= 70; });
    t.check('no yellow, gold or amber in the lob', yellow.length === 0, yellow.join(','));
    t.check('the page logged no error', errors.length === 0, errors.join(' | '));
  } catch (e) {
    t.check('the run finished', false, e.stack || String(e));
  } finally {
    await browser.close();
  }
  console.log('screenshots: ' + out);
  process.exit(t.report() ? 1 : 0);

})();

