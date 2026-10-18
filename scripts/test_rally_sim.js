// Off the Glass, The Read (2026-10-18): does Amir play like a person?   node scripts/test_rally_sim.js
//   options: --secs N (game time per bot per game, 3000) · --seed N (first seed) · --seeds N (games per bot, pooled, 3) · --only name
//            --quiet (print only failures) · --set speed=1.2 --set react=0.2,0.1 (try one of Amir's numbers without editing rally.js)
//            --only average --trace 40 (print the first 40 s of one bot's play, every 0.1 s)
//
// No browser. assets/js/rally.js is loaded into a bare vm context with a stubbed window, document, canvas, localStorage and
// matchMedia, its Math.random replaced by a seeded generator, and a 390 x 804 court opened. Then bots with a person's limits play
// it frame by frame (1/60 s, Rally._tick) for 3,000 s of game time each, steering S.target the way a thumb would:
//   · each sees the ball as it was `r` seconds ago (a person's reaction) and moves its target at most `v` court widths a second;
//   · while the ball is in its half it gets just below it and pushes it up toward the side of Amir's gap his racket is not on
//     (with a little aim noise); otherwise it guards in front of its own gap;
//   · like Amir, every bot now and then reads a point late (SLIP). A bot that never erred could not lose, so "the follower wins
//     under 90%" would say nothing; with it the follower is as perfect as a person can be.
// Four of them: sharp (r 0.10, v 4.0), average (0.20, 2.5), tired (0.30, 1.5) and the old perfect follower (r 0, no speed limit),
// the bot that used to win 58 points out of 58 against the first Amir.
//
// What it holds true (every number measured on 2026-10-18, over eight seeds, none of it a hope):
//   sharp ~70% of the points, average ~57% (about two matches in three at first to 5), tired ~47%, the follower ~86%;
//   every bot loses some points; sharper always wins more; no NaN; the ball never leaves the court except through a gap; Amir's
//   form changes only between points and really does change how he plays; his top speed is the same whoever leads (the first
//   Amir sped up while you led and slowed while you trailed); and the same seed plays the same game.
// Pre-commit guard 22 runs it whenever rally.js or this file is staged: when Amir's numbers move, this says whether he still
// plays like a person. Change a number in the AMIR block of rally.js, run this, read the table.
'use strict';
const fs = require('fs'), path = require('path');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const SECS = +arg('secs', 3000), SEED = +arg('seed', 1), SEEDS = Math.max(1, +arg('seeds', 3)), ONLY = arg('only', ''), QUIET = argv.includes('--quiet');
const TRACE = +arg('trace', 0);
const DT = 1 / 60, CW = 390, CH = 804;

// ── Amir's numbers live in the AMIR block of rally.js; --set tries one without touching the file ──
function patchSrc(src, k, v) {
  const val = String(v).includes(',') ? '[' + v + ']' : String(v);
  const re = new RegExp('(\\n    ' + k + ': )(\\[[^\\]]*\\]|[-0-9.]+)(,)');
  if (!re.test(src)) { console.log('--set ' + k + ': no such number in the AMIR block of rally.js'); process.exit(2); }
  return src.replace(re, '$1' + val + '$3');
}
let SRC = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'rally.js'), 'utf8');
for (let i = 0; i < argv.length; i++) if (argv[i] === '--set') { const [k, v] = argv[i + 1].split('='); SRC = patchSrc(SRC, k, v); }
const AMIR_SPEED = +(SRC.match(/\n    speed: ([0-9.]+),/) || [])[1];   // court widths a second
const AMIR_STEP = +(SRC.match(/\n    step: ([0-9.]+),/) || [])[1];     // how far his form moves after a point

// ── what the bots share: their habits as people (experiments: --blead 0.1 --slip 0.2 --slipby 0.4 --aimside 0.9) ──
const HABIT = {
  aimNoise: 0.06,                 // the aim point lands within this many court widths of where it meant
  aimSide: +arg('aimside', 0.6),  // how far toward the edge of the gap it shoots, as a share of the open half
  lookAhead: +arg('blead', 0.2),  // the share of its delay it makes up by knowing where the ball was heading
  slip: +arg('slip', 0.3),        // the chance a point starts with a late read ...
  slipBy: +arg('slipby', 0.3),    // ... and the seconds it adds to the bot's delay
};

// ── a seeded random generator (mulberry32) ──
function prng(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ── rally.js in a bare context ──
function loadRally(src, seed) {
  const M = {}; Object.getOwnPropertyNames(Math).forEach(k => { M[k] = Math[k]; });
  M.random = prng(seed);
  const ctx2d = new Proxy({}, { get: (o, k) => (k in o ? o[k] : () => ({ addColorStop() {} })), set: (o, k, v) => { o[k] = v; return true; } });
  function El() {
    const el = { kids: {}, ev: {}, style: {}, hidden: false, textContent: '', innerHTML: '', width: 0, height: 0 };
    el.classList = { add() {}, remove() {}, toggle() {}, contains: () => false };
    el.querySelector = sel => (el.kids[sel] = el.kids[sel] || El());
    el.addEventListener = (ty, fn) => { (el.ev[ty] = el.ev[ty] || []).push(fn); };
    el.removeEventListener = () => {};
    el.getBoundingClientRect = () => ({ left: 0, top: 0, right: CW, bottom: CH, width: CW, height: CH });
    el.getContext = () => ctx2d;
    el.setPointerCapture = () => {};
    el.appendChild = () => {};
    return el;
  }
  const store = {};
  const win = {
    matchMedia: () => ({ matches: false }), addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1,
    document: { getElementById: () => null, createElement: () => El(), head: El(), body: El() },
  };
  // The file runs as a function whose free names are the stubs (a bare vm context made every Math.hypot a slow global lookup).
  const env = {
    window: win, document: win.document, Math: M,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
    matchMedia: win.matchMedia, getComputedStyle: () => ({ paddingTop: '0px', paddingBottom: '0px' }),
    requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},     // no frames: the test drives Rally._tick itself
    performance: { now: () => 0 }, navigator: {}, setTimeout: () => 0, clearTimeout: () => {},
  };
  new Function(...Object.keys(env), src).apply(null, Object.values(env));
  const sb = { Rally: win.Rally };
  sb.Rally.open({ root: El(), left: () => 120, sound: () => false });
  const S = sb.Rally._state();
  const go = S.msg.querySelector('.rally-go');   // "Play again": the only way rally.js starts a new match
  return { Rally: sb.Rally, S, playAgain: () => go.ev.click.forEach(fn => fn({ stopPropagation() {} })) };
}

// ── a bot with a person's limits ──
function makeBot(S, spec, rnd) {
  const seen = [];
  let striking = false, aim = 0, coin = 1, extra = 0, wasFrozen = false;
  return function think() {
    const b = S.ball;
    if (S.freeze > 0 && !wasFrozen) extra = rnd() < HABIT.slip ? HABIT.slipBy : 0;   // a new point: now and then a person reads it late
    wasFrozen = S.freeze > 0;
    const delay = spec.r + extra, lag = Math.round(delay / DT);
    seen.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, ax: S.amir.x }); if (seen.length > 40) seen.shift();
    const m = S.you, rr = S.rr, W = S.W, T = S.top, B = S.H - S.pad, mid = (T + B) / 2;
    let pb = seen[Math.max(0, seen.length - 1 - lag)];
    if (delay > 0) {                                            // it follows a ball in smooth flight a little, and is late to a hit or a bounce
      const lo = S.pad + S.br, w = W - S.pad - S.br - lo, a = delay * HABIT.lookAhead;
      const x = ((pb.x + pb.vx * a - lo) % (2 * w) + 2 * w) % (2 * w);
      pb = { x: lo + (x <= w ? x : 2 * w - x), y: Math.max(T, Math.min(B, pb.y + pb.vy * a)), vx: pb.vx, vy: pb.vy, ax: pb.ax };
    }
    let tx, ty;
    if (pb.y > mid && !(pb.vy < -S.vmax * 0.3)) {               // in my half and not already leaving it: just below it, push it up toward his gap
      if (!striking) { striking = true; aim = (rnd() * 2 - 1) * HABIT.aimNoise * W; coin = rnd() < 0.5 ? -1 : 1; }
      const side = Math.abs(pb.ax - W / 2) < rr * 0.25 ? coin : (pb.ax < W / 2 ? 1 : -1);   // the open side of his gap, as it saw him
      if (pb.y > m.y + rr * 0.5) {                              // it got behind me: go round it, never push it into my own gap
        tx = pb.x + (pb.x < W / 2 ? 1 : -1) * rr * 2.2; ty = pb.y + rr * 1.2;
      } else {
        const ax = W / 2 + side * HABIT.aimSide * (S.gw / 2 - S.br) + aim - pb.x, ay = T - pb.y, al = Math.hypot(ax, ay) || 1;
        tx = pb.x - (ax / al) * rr * 0.6; ty = pb.y - (ay / al) * rr * 0.6;
        if (Math.hypot(pb.vx, pb.vy) < S.vmax * 0.1) { tx += (ax / al) * rr * 1.6; ty += (ay / al) * rr * 1.6; }
      }
    } else {                                                    // guard in front of my own gap
      striking = false;
      tx = W / 2 + (pb.x - W / 2) * 0.4; ty = B - rr * 1.8;
    }
    // the thumb: its target moves at most v court widths a second
    let dx = tx - S.target.x, dy = ty - S.target.y; const d = Math.hypot(dx, dy), lim = spec.v * W * DT;
    if (d > lim) { dx *= lim / d; dy *= lim / d; }
    S.target.x += dx; S.target.y += dy;
  };
}

const BOTS = [
  { name: 'sharp', r: 0.10, v: 4.0 },
  { name: 'average', r: 0.20, v: 2.5 },
  { name: 'tired', r: 0.30, v: 1.5 },
  { name: 'follower', r: 0, v: Infinity },
];

// ── one bot, `secs` seconds of game time ──
function play(spec, secs, seed, src) {
  const { Rally, S, playAgain } = loadRally(src || SRC, seed);
  const think = makeBot(S, spec, prng(seed ^ 0x9E3779B9));
  const r = { pts: { you: 0, amir: 0 }, matches: { you: 0, amir: 0 }, quick: 0, nan: 0, escaped: 0, formMoved: 0, formRange: [1, 0], youFast: 0, ballFast: 0,
    amirTop: { lead: 0, trail: 0, all: 0 }, formSteps: 0, formStepsOk: 0, bad: [] };
  const L = S.pad, R = S.W - S.pad, T = S.top, B = S.H - S.pad, g1 = S.W / 2 - S.gw / 2 - S.br, g2 = S.W / 2 + S.gw / 2 + S.br;
  let last = { you: 0, amir: 0 }, form = S.form, sincePoint = 0, formSum = 0, mid = (T + B) / 2;
  const ticks = Math.round(secs / DT), note = s => { if (r.bad.length < 5) r.bad.push(s); };
  for (let i = 0; i < ticks; i++) {
    if (S.over) {                                               // a finished match: count it, then "Play again"
      r.matches[S.score.you > S.score.amir ? 'you' : 'amir']++;
      playAgain(); last = { you: 0, amir: 0 }; form = S.form;
      continue;
    }
    think();
    const yx = S.you.x, yy = S.you.y, ax = S.amir.x, ay = S.amir.y, lead = S.score.you - S.score.amir, form0 = S.form;
    const last0 = { you: S.score.you, amir: S.score.amir };
    Rally._tick(DT);
    if (TRACE && i * DT < TRACE && i % 6 === 0) {
      const f = v => String(Math.round(v)).padStart(5);
      console.log((i * DT).toFixed(2).padStart(6) + ' ball' + f(S.ball.x) + f(S.ball.y) + ' v' + f(S.ball.vx) + f(S.ball.vy) + ' | amir' + f(S.amir.x) + f(S.amir.y) + ' | you' + f(S.you.x) + f(S.you.y) +
        ' | ' + S.score.you + '-' + S.score.amir + ' form ' + S.form.toFixed(2) + (S.freeze ? ' frz' : '') + ' hit:' + S.lastHit + ' rally ' + S.rally + (S.late ? ' LATE' : ''));
    }
    // ── what it counts ──
    for (const who of ['you', 'amir']) {
      const n = S.score[who] - last[who];
      if (n > 0) { r.pts[who] += n; if (sincePoint <= 2) r.quick += n; sincePoint = 0; }
    }
    sincePoint += DT;
    const scored = S.score.you !== last.you || S.score.amir !== last.amir;
    last = { you: S.score.you, amir: S.score.amir };
    // ── what must stay true ──
    if (S.form !== form) { if (!scored) r.formMoved++; form = S.form; }
    if (scored && !S.over) {                                    // a point that did not end the match: his form moved one step the right way
      const want = Math.max(0, Math.min(1, form0 + (S.score.you > last0.you ? AMIR_STEP : -AMIR_STEP)));
      r.formSteps++; if (Math.abs(S.form - want) < 1e-9) r.formStepsOk++;
    }
    r.formRange = [Math.min(r.formRange[0], S.form), Math.max(r.formRange[1], S.form)];
    formSum += S.form;
    if (Math.hypot(S.you.x - yx, S.you.y - yy) > 6 * S.W * DT + 1e-6) r.youFast++;
    const am = Math.hypot(S.amir.x - ax, S.amir.y - ay) / DT / S.W;   // Amir's speed this frame, in court widths a second
    if (!scored) {                                              // a point's own frame can be a re-serve; the racket does not teleport but skip it anyway
      r.amirTop.all = Math.max(r.amirTop.all, am);
      if (lead >= 2) r.amirTop.lead = Math.max(r.amirTop.lead, am);
      if (lead <= -2) r.amirTop.trail = Math.max(r.amirTop.trail, am);
    }
    if (!S.over) {
      const b = S.ball, vals = [b.x, b.y, b.vx, b.vy, S.amir.x, S.amir.y, S.you.x, S.you.y, S.form];
      if (vals.some(v => !Number.isFinite(v))) { r.nan++; note('NaN at t=' + (i * DT).toFixed(1)); }
      else {
        if (Math.hypot(b.vx, b.vy) > S.vmax * 1.001) r.ballFast++;
        if (b.x < L - 0.5 || b.x > R + 0.5) { r.escaped++; note('ball off the side at ' + b.x.toFixed(1)); }
        else if ((b.y < T - 0.5 || b.y > B + 0.5) && !(b.x > g1 && b.x < g2)) { r.escaped++; note('ball through the end wall at x=' + b.x.toFixed(1) + ' y=' + b.y.toFixed(1)); }
        if (S.amir.y > mid + 1 || S.you.y < mid - 1) { r.escaped++; note('a racket crossed the net'); }
      }
    }
  }
  r.formMean = formSum / ticks;
  const n = r.pts.you + r.pts.amir, mt = r.matches.you + r.matches.amir;
  r.share = n ? r.pts.you / n : 0; r.matchShare = mt ? r.matches.you / mt : 0;
  r.sPerPt = n ? secs / n : 0; r.quickShare = n ? r.quick / n : 0; r.n = n; r.mt = mt; r.secs = secs;
  return r;
}

const pad = (s, n) => String(s).padEnd(n), pc = x => (x * 100).toFixed(1) + '%';

// Several independent games of one bot, pooled: a share measured on ~550 points wobbles by ~2 points, and the gap between the
// average and the tired bot is only a handful, so each bot plays SEEDS games of SECS seconds and the points are added up.
function pool(games) {
  const r = { pts: { you: 0, amir: 0 }, matches: { you: 0, amir: 0 }, quick: 0, nan: 0, escaped: 0, formMoved: 0, formRange: [1, 0], youFast: 0, ballFast: 0, amirTop: { lead: 0, trail: 0, all: 0 }, bad: [], formMean: 0, formSteps: 0, formStepsOk: 0 };
  games.forEach(g => {
    ['you', 'amir'].forEach(w => { r.pts[w] += g.pts[w]; r.matches[w] += g.matches[w]; });
    ['quick', 'nan', 'escaped', 'formMoved', 'youFast', 'ballFast', 'formSteps', 'formStepsOk'].forEach(k => { r[k] += g[k]; });
    r.formRange = [Math.min(r.formRange[0], g.formRange[0]), Math.max(r.formRange[1], g.formRange[1])];
    ['lead', 'trail', 'all'].forEach(k => { r.amirTop[k] = Math.max(r.amirTop[k], g.amirTop[k]); });
    r.bad.push(...g.bad); r.formMean += g.formMean / games.length;
  });
  const n = r.pts.you + r.pts.amir, mt = r.matches.you + r.matches.amir;
  r.share = n ? r.pts.you / n : 0; r.matchShare = mt ? r.matches.you / mt : 0;
  r.sPerPt = n ? games.length * games[0].secs / n : 0; r.quickShare = n ? r.quick / n : 0; r.n = n; r.mt = mt;
  r.shares = games.map(g => g.share);
  return r;
}
function table(results) {
  const lines = [pad('bot', 10) + pad('react', 7) + pad('speed', 7) + pad('points', 8) + pad('you win', 9) + pad('matches', 9) + pad('you win', 9) + pad('s/point', 9) + pad('<2 s', 7) + pad('form', 6) + 'by game'];
  Object.keys(results).forEach(k => {
    const s = BOTS.find(b => b.name === k), r = results[k];
    lines.push(pad(k, 10) + pad(s.r.toFixed(2), 7) + pad(s.v === Infinity ? 'any' : s.v.toFixed(1), 7) + pad(r.n, 8) + pad(pc(r.share), 9) + pad(r.mt, 9) + pad(pc(r.matchShare), 9) +
      pad(r.sPerPt.toFixed(1), 9) + pad(pc(r.quickShare), 7) + pad(r.formMean.toFixed(2), 6) + r.shares.map(x => (x * 100).toFixed(0)).join(' '));
  });
  return lines.join('\n');
}

let failed = 0;
function check(name, ok, detail) {
  if (ok) { if (!QUIET) console.log('ok ' + name); }
  else { failed++; console.log('FAIL ' + name + (detail ? ' (' + detail + ')' : '')); }
}

// ── run, print, assert ──
const t0 = Date.now();
const results = {};
BOTS.filter(b => !ONLY || b.name === ONLY).forEach(spec => {
  const games = []; for (let k = 0; k < SEEDS; k++) { const g = play(spec, SECS, SEED + k); g.secs = SECS; games.push(g); }
  results[spec.name] = pool(games);
});
if (!ONLY) {
  const sh = results.sharp, av = results.average, ti = results.tired, fo = results.follower, all = Object.keys(results).map(n => results[n]);
  const bad = all.map(r => r.bad[0]).filter(Boolean).join('; ');
  check('every bot loses some points: Amir scores against all of them', all.every(r => r.pts.amir > 0), Object.keys(results).map(n => n + ' ' + results[n].pts.amir).join(', '));
  check('the old perfect follower wins under 90% of the points', fo.share < 0.90, pc(fo.share));
  check('a sharper player wins a bigger share: sharp > average > tired', sh.share > av.share && av.share > ti.share, [sh, av, ti].map(r => pc(r.share)).join(' > '));
  check('an average player wins between 50% and 72% of the points (aim: about 58%)', av.share >= 0.50 && av.share <= 0.72, pc(av.share));
  check('a tired player still wins at least 25% of the points', ti.share >= 0.25, pc(ti.share));
  check('no number goes NaN', all.every(r => r.nan === 0), bad);
  check('the ball never leaves the court except through a gap, and no racket crosses the net', all.every(r => r.escaped === 0), bad);
  check('the ball never goes faster than its top speed', all.every(r => r.ballFast === 0), all.map(r => r.ballFast).join(','));
  check('your racket never moves faster than 6 court widths a second', all.every(r => r.youFast === 0), all.map(r => r.youFast).join(','));
  check('Amir\'s form changes only between points', all.every(r => r.formMoved === 0), all.map(r => r.formMoved).join(','));
  check('Amir\'s form moves one step after every point: up when you score, down when he does', all.every(r => r.formSteps > 100 && r.formStepsOk === r.formSteps), all.map(r => r.formStepsOk + '/' + r.formSteps).join(' '));
  check('Amir\'s form stays between 0 and 1', all.every(r => r.formRange[0] >= 0 && r.formRange[1] <= 1), all.map(r => r.formRange.join('-')).join(' '));
  // His top speed is one number: it never exceeds the AMIR block's, and he reaches it whether he is ahead or behind (the first Amir
  // had a speed that rose to 1.45x while you led and fell to 0.65x while you trailed, which players saw and resented).
  const top = all.map(r => r.amirTop);
  check('Amir\'s top speed is fixed: never over the AMIR block\'s, reached both when you lead and when you trail',
    top.every(t => t.all <= AMIR_SPEED * 1.001 && t.lead >= AMIR_SPEED * 0.95 && t.trail >= AMIR_SPEED * 0.95), top.map(t => t.lead.toFixed(2) + '/' + t.trail.toFixed(2) + '/' + t.all.toFixed(2)).join(' ') + ' of ' + AMIR_SPEED);
  check('every bot played matches to the end (first to 5)', all.every(r => r.mt >= 40), all.map(r => r.mt).join(','));
  // the same seed plays the same game
  const a = play(BOTS[1], 240, SEED + 1000), b = play(BOTS[1], 240, SEED + 1000);
  check('the same seed plays the same game (deterministic)', a.pts.you === b.pts.you && a.pts.amir === b.pts.amir && a.matches.you === b.matches.you, a.pts.you + '-' + a.pts.amir + ' vs ' + b.pts.you + '-' + b.pts.amir);
  // His form does something: with it held at 0 an average player wins clearly more points than with it held at 1 (a form that did
  // nothing would leave this level, and the rubber band between points would be for nothing). About 12 points apart when measured.
  const held = f => { const src = patchSrc(patchSrc(SRC, 'step', '0'), 'start', f); return pool([...Array(SEEDS)].map((_, k) => Object.assign(play(BOTS[1], 1500, SEED + k, src), { secs: 1500 }))); };
  const soft = held(0), sharp = held(1);
  check('his form matters: held soft (0) he loses clearly more points than held sharp (1)', soft.share - sharp.share >= 0.06, pc(soft.share) + ' vs ' + pc(sharp.share));
}
if (!QUIET || failed) console.log('\n' + table(results) + '\n\n' + SECS + ' s of game time per bot per game, ' + SEEDS + ' games per bot pooled, ' + CW + 'x' + CH + ' court, seeds ' + SEED + (SEEDS > 1 ? '-' + (SEED + SEEDS - 1) : '') + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s to run');
process.exitCode = failed ? 1 : 0;
