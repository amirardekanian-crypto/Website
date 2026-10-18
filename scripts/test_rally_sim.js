// Off the Glass, The Read (2026-10-18): does Amir play like a person?   node scripts/test_rally_sim.js
// Full time and Bajada (2026-10-18) changed the match: first to 15, one match a session, and a goal that came off the glass IN PLAY (a played bank:
// rally.js, BANK_REACH) is worth 2. The shares below are counted in GOALS (a ball through a gap, one each: what The Read was tuned on) and in MATCHES
// (first to 15 on the board, which is what a player feels); the board's score share, the banks and the minutes a match takes are printed beside them.
//   options: --secs N (game time per bot per game, 3000) · --seed N (first seed) · --seeds N (games per bot, pooled, 8) · --only name
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
// the bot that used to win 58 points out of 58 against the first Amir. A fifth, the ace (sharp's reaction and speed, never late, shoots
// at the edges of the gap, reads ahead), is printed and never asserted on: Amir's form is capped at 1, so the rubber band cannot save him
// from a player this good, and the row shows that ceiling whenever a number moves. Amir should play it himself: this is a ruler, not a player.
//
// What it holds true (every number measured on 2026-10-18, after Bajada began counting only PLAYED banks and The Read's `react` was retuned for it:
// over eight seeds, and again over 96 seeds from seed 1000 and twelve more blocks of eight, none of it a hope):
//   goals: sharp ~68%, average ~54%, tired ~50%, the follower ~85%. Matches (first to 15 on the board, a played bank worth 2): sharp ~98%, average ~70% (asserted 60 to 75%),
//   tired ~50% (45 to 65%), the follower 100% (a bot that wins 85% of the goals loses a first-to-15 match about once in 400,000, so "under 100%" is asked of its GOALS and
//   its board, under 90% of each, and not of its matches). Banks are 19 to 27% of ALL goals for every bot (average 21%, tired 20%, sharp 24%, the follower 27%; asserted 12 to 28%);
//   when every glass touch counted they were 36% and the average player won 80% of the matches, the tired one 63%, which is why `react` came down. A match takes the average bot
//   about 1.5 minutes of play (the longest of 221 took 2.8), so the 8-minute budget is for a person who dawdles and no bot ever reaches it;
//   every bot loses some points; sharper always wins more; he looks calm (his misjudgement is drawn once per shot, his aim once per strike); no NaN; the ball never leaves the court except through a gap; Amir's
//   form changes only between points and really does change how he plays; his top speed is the same whoever leads (the first
//   Amir sped up while you led and slowed while you trailed); the same seed plays the same game; and Bajada's rule itself, on a bare court: a bank
//   made in the shooter's own half or the first half of the far half is worth 2, one made nearer the goal (a clip) is worth 1, and the LAST glass touch decides.
// Pre-commit guard 22 runs it whenever rally.js or this file is staged: when Amir's numbers move, this says whether he still
// plays like a person. Change a number in the AMIR block of rally.js, run this, read the table. A match share needs about 300 matches to hold still (its standard error is
// 3 points over 8 seeds and 5 over 3, so the default is 8 seeds, about 14 s); the goal shares wobble by 1 to 3 points. `react` is the number they guard, while `speed` and `aim` barely move the
// shares (speed 0.6 or 1.6 and aim 0 all still pass), so judge those two by playing.
'use strict';
const fs = require('fs'), path = require('path');

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf('--' + k); return i >= 0 && argv[i + 1] !== undefined ? argv[i + 1] : d; };
const SECS = +arg('secs', 3000), SEED = +arg('seed', 1), SEEDS = Math.max(1, +arg('seeds', 8)), ONLY = arg('only', ''), QUIET = argv.includes('--quiet');
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
const YOU_SPEED = +(SRC.match(/const YOU_SPEED = ([0-9.]+);/) || [])[1];   // your racket's top speed, court widths a second
const WIN_AT_SRC = +(SRC.match(/const WIN_AT = ([0-9]+);/) || [])[1];       // first to this many (Full time)
const CAP_SRC = +(SRC.match(/const PLAY_CAP_S = ([0-9]+);/) || [])[1];      // seconds of real play a match may take before the next point that leaves someone ahead ends it
const patchConst = (src, k, v) => { const re = new RegExp('(const ' + k + ' = )[0-9.]+(;)'); if (!re.test(src)) { console.log('no const ' + k + ' in rally.js'); process.exit(2); } return src.replace(re, '$1' + v + '$2'); };

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
  // Full time has no Play again (one match a session), so the next match is rally.js's own test hook: a fresh match on the same court.
  return { Rally: sb.Rally, S, playAgain: () => sb.Rally._next() };
}

// ── a bot with a person's limits ──
function makeBot(S, spec, rnd) {
  const HB = Object.assign({}, HABIT, spec.habit || {});   // a bot may have its own habits (the ace)
  const seen = [];
  let striking = false, aim = 0, coin = 1, extra = 0, wasFrozen = false;
  return function think() {
    const b = S.ball;
    if (S.freeze > 0 && !wasFrozen) extra = rnd() < HB.slip ? HB.slipBy : 0;   // a new point: now and then a person reads it late
    wasFrozen = S.freeze > 0;
    const delay = spec.r + extra, lag = Math.round(delay / DT);
    seen.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, ax: S.amir.x }); if (seen.length > 40) seen.shift();
    const m = S.you, rr = S.rr, W = S.W, T = S.top, B = S.H - S.pad, mid = (T + B) / 2;
    let pb = seen[Math.max(0, seen.length - 1 - lag)];
    if (delay > 0) {                                            // it follows a ball in smooth flight a little, and is late to a hit or a bounce
      const lo = S.pad + S.br, w = W - S.pad - S.br - lo, a = delay * HB.lookAhead;
      const x = ((pb.x + pb.vx * a - lo) % (2 * w) + 2 * w) % (2 * w);
      pb = { x: lo + (x <= w ? x : 2 * w - x), y: Math.max(T, Math.min(B, pb.y + pb.vy * a)), vx: pb.vx, vy: pb.vy, ax: pb.ax };
    }
    let tx, ty;
    if (pb.y > mid && !(pb.vy < -S.vmax * 0.3)) {               // in my half and not already leaving it: just below it, push it up toward his gap
      if (!striking) { striking = true; aim = (rnd() * 2 - 1) * HB.aimNoise * W; coin = rnd() < 0.5 ? -1 : 1; }
      const side = Math.abs(pb.ax - W / 2) < rr * 0.25 ? coin : (pb.ax < W / 2 ? 1 : -1);   // the open side of his gap, as it saw him
      if (pb.y > m.y + rr * 0.5) {                              // it got behind me: go round it, never push it into my own gap
        tx = pb.x + (pb.x < W / 2 ? 1 : -1) * rr * 2.2; ty = pb.y + rr * 1.2;
      } else {
        const ax = W / 2 + side * HB.aimSide * (S.gw / 2 - S.br) + aim - pb.x, ay = T - pb.y, al = Math.hypot(ax, ay) || 1;
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
  { name: 'ace', r: 0.10, v: 4.0, extra: true, habit: { slip: 0, aimSide: 0.95, lookAhead: 0.6 } },   // printed, never asserted on
];

// ── one bot, `secs` seconds of game time ──
function play(spec, secs, seed, src) {
  const { Rally, S, playAgain } = loadRally(src || SRC, seed);
  const think = makeBot(S, spec, prng(seed ^ 0x9E3779B9));
  const winAt = +((src || SRC).match(/const WIN_AT = ([0-9]+);/) || [])[1], cap = +((src || SRC).match(/const PLAY_CAP_S = ([0-9]+);/) || [])[1];
  // pts: GOALS (a ball through a gap, one each, what The Read was tuned on); score: what the board says (a bank is worth 2); banks: goals that were banks;
  // mins: the minutes of real play each finished match took (S.m.played, which only counts while a point is live)
  const r = { pts: { you: 0, amir: 0 }, score: { you: 0, amir: 0 }, banks: { you: 0, amir: 0 }, mins: [], matches: { you: 0, amir: 0 }, quick: 0, nan: 0, escaped: 0, formMoved: 0, formRange: [1, 0], youFast: 0, ballFast: 0,
    amirTop: { lead: 0, trail: 0, all: 0 }, formSteps: 0, formStepsOk: 0, missRolls: 0, aimRolls: 0, bad: [], level: 0, odd: 0, over16: 0, capped: 0 };
  const L = S.pad, R = S.W - S.pad, T = S.top, B = S.H - S.pad, g1 = S.W / 2 - S.gw / 2 - S.br, g2 = S.W / 2 + S.gw / 2 + S.br;
  let last = { you: 0, amir: 0 }, form = S.form, sincePoint = 0, formSum = 0, mid = (T + B) / 2;
  const ticks = Math.round(secs / DT), note = s => { if (r.bad.length < 5) r.bad.push(s); };
  for (let i = 0; i < ticks; i++) {
    if (S.over) {                                               // Full time: count it, then the next match
      r.matches[S.score.you > S.score.amir ? 'you' : 'amir']++;
      r.mins.push(S.m.played / 60);
      const hi = Math.max(S.score.you, S.score.amir);
      if (S.score.you === S.score.amir) r.level++;                         // a match never ends level, on the budget or not
      if (hi > winAt + 1 || (hi < winAt && S.m.played < cap)) r.odd++;   // it ends at 15 or 16 (a bank from 14), or on the budget
      if (hi > winAt + 1) r.over16++;
      if (hi < winAt) r.capped++;                                          // ended on the budget, before anyone reached the target
      playAgain(); last = { you: 0, amir: 0 }; form = S.form;
      continue;
    }
    think();
    const yx = S.you.x, yy = S.you.y, ax = S.amir.x, ay = S.amir.y, lead = S.score.you - S.score.amir, form0 = S.form;
    const last0 = { you: S.score.you, amir: S.score.amir }, miss0 = S.miss, aim0 = S.aim;
    Rally._tick(DT);
    if (S.miss !== miss0) r.missRolls++;       // a new read of a shot (drawn once per shot) and a new aim point (once per strike)
    if (S.aim !== aim0) r.aimRolls++;
    if (TRACE && i * DT < TRACE && i % 6 === 0) {
      const f = v => String(Math.round(v)).padStart(5);
      console.log((i * DT).toFixed(2).padStart(6) + ' ball' + f(S.ball.x) + f(S.ball.y) + ' v' + f(S.ball.vx) + f(S.ball.vy) + ' | amir' + f(S.amir.x) + f(S.amir.y) + ' | you' + f(S.you.x) + f(S.you.y) +
        ' | ' + S.score.you + '-' + S.score.amir + ' form ' + S.form.toFixed(2) + (S.freeze ? ' frz' : '') + ' hit:' + S.lastHit + ' rally ' + S.rally + (S.late ? ' LATE' : ''));
    }
    // ── what it counts ──
    for (const who of ['you', 'amir']) {
      const n = S.score[who] - last[who];
      if (n > 0) { r.pts[who] += 1; r.score[who] += n; if (n === 2) r.banks[who] += 1; if (sincePoint <= 2) r.quick += 1; sincePoint = 0; }
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
    if (Math.hypot(S.you.x - yx, S.you.y - yy) > YOU_SPEED * S.W * DT + 1e-6) r.youFast++;
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
  const r = { pts: { you: 0, amir: 0 }, score: { you: 0, amir: 0 }, banks: { you: 0, amir: 0 }, mins: [], matches: { you: 0, amir: 0 }, quick: 0, nan: 0, escaped: 0, formMoved: 0, formRange: [1, 0], youFast: 0, ballFast: 0, amirTop: { lead: 0, trail: 0, all: 0 }, bad: [], formMean: 0, formSteps: 0, formStepsOk: 0, missRolls: 0, aimRolls: 0 };
  games.forEach(g => {
    ['you', 'amir'].forEach(w => { r.pts[w] += g.pts[w]; r.score[w] += g.score[w]; r.banks[w] += g.banks[w]; r.matches[w] += g.matches[w]; });
    r.mins.push(...g.mins);
    ['quick', 'nan', 'escaped', 'formMoved', 'youFast', 'ballFast', 'formSteps', 'formStepsOk', 'missRolls', 'aimRolls', 'level', 'odd', 'over16', 'capped'].forEach(k => { r[k] = (r[k] || 0) + g[k]; });
    r.formRange = [Math.min(r.formRange[0], g.formRange[0]), Math.max(r.formRange[1], g.formRange[1])];
    ['lead', 'trail', 'all'].forEach(k => { r.amirTop[k] = Math.max(r.amirTop[k], g.amirTop[k]); });
    r.bad.push(...g.bad); r.formMean += g.formMean / games.length;
  });
  const n = r.pts.you + r.pts.amir, mt = r.matches.you + r.matches.amir;
  r.share = n ? r.pts.you / n : 0; r.matchShare = mt ? r.matches.you / mt : 0;
  r.sPerPt = n ? games.length * games[0].secs / n : 0; r.quickShare = n ? r.quick / n : 0; r.n = n; r.mt = mt;
  r.shares = games.map(g => g.share);
  // Bajada and Full time: banks as a share of each side's goals, the board's score share (a bank is worth 2) and how long a match takes
  r.bankYou = r.pts.you ? r.banks.you / r.pts.you : 0; r.bankAmir = r.pts.amir ? r.banks.amir / r.pts.amir : 0;
  r.bankAll = n ? (r.banks.you + r.banks.amir) / n : 0;
  r.scoreShare = (r.score.you + r.score.amir) ? r.score.you / (r.score.you + r.score.amir) : 0;
  const ms = r.mins.slice().sort((x, y) => x - y);
  r.medMin = ms.length ? ms[Math.floor(ms.length / 2)] : 0; r.maxMin = ms.length ? ms[ms.length - 1] : 0;
  return r;
}
function table(results) {
  const lines = [pad('bot', 10) + pad('react', 7) + pad('speed', 7) + pad('goals', 8) + pad('you win', 9) + pad('on board', 10) + pad('matches', 9) + pad('you win', 9) + pad('min med/max', 15) + pad('s/goal', 8) + pad('banks all', 11) + pad('banks you', 11) + pad('banks Amir', 12) + pad('<2 s', 7) + pad('form', 6) + 'by game'];
  Object.keys(results).forEach(k => {
    const s = BOTS.find(b => b.name === k), r = results[k];
    lines.push(pad(k + (s.extra ? ' *' : ''), 10) + pad(s.r.toFixed(2), 7) + pad(s.v === Infinity ? 'any' : s.v.toFixed(1), 7) + pad(r.n, 8) + pad(pc(r.share), 9) + pad(pc(r.scoreShare), 10) + pad(r.mt, 9) + pad(pc(r.matchShare), 9) +
      pad(r.medMin.toFixed(2) + '/' + r.maxMin.toFixed(1), 15) + pad(r.sPerPt.toFixed(1), 8) + pad(pc(r.bankAll), 11) + pad(pc(r.bankYou), 11) + pad(pc(r.bankAmir), 12) + pad(pc(r.quickShare), 7) + pad(r.formMean.toFixed(2), 6) + r.shares.map(x => (x * 100).toFixed(0)).join(' '));
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
  const sh = results.sharp, av = results.average, ti = results.tired, fo = results.follower, all = BOTS.filter(b => !b.extra).map(b => results[b.name]);
  const bad = all.map(r => r.bad[0]).filter(Boolean).join('; ');
  check('every bot loses some points: Amir scores against all of them', all.every(r => r.pts.amir > 0), Object.keys(results).map(n => n + ' ' + results[n].pts.amir).join(', '));
  // The follower is asked "under 100%" of what it wins at, which is its goals and its board (under 90% of each). Its MATCHES are not asked: a bot at 85% of the
  // points loses a first-to-15 match about once in 400,000, so it wins every match this sim can play (measured 100%).
  check('the old perfect follower wins under 90% of the goals and of the board (it still wins all its matches, as 85% of the points must)', fo.share < 0.90 && fo.scoreShare < 0.90, pc(fo.share) + ' / ' + pc(fo.scoreShare) + ', matches ' + pc(fo.matchShare));
  check('a sharper player wins a bigger share: sharp > average > tired', sh.share > av.share && av.share > ti.share, [sh, av, ti].map(r => pc(r.share)).join(' > '));
  check('an average player wins between 50% and 60% of the goals (aim: about 54%)', av.share >= 0.50 && av.share <= 0.60, pc(av.share));
  check('a tired player wins between 45% and 57% of the goals (aim: about 50%)', ti.share >= 0.45 && ti.share <= 0.57, pc(ti.share));
  // Bajada: a played bank is worth 2, so the board is not quite the goals, but with banks about a fifth of the goals and shared by both sides the board follows
  // them closely (measured: the average bot 54% of the goals, 54.5% of the board; the tired one 50% and 50%).
  check('on the board (a played bank counts 2) a sharper player still leads: sharp > average > tired', sh.scoreShare > av.scoreShare && av.scoreShare > ti.scoreShare, [sh, av, ti].map(r => pc(r.scoreShare)).join(' > '));
  check('on the board an average player gets between 48% and 61% and a tired one between 44% and 57%', av.scoreShare >= 0.48 && av.scoreShare <= 0.61 && ti.scoreShare >= 0.44 && ti.scoreShare <= 0.57, pc(av.scoreShare) + ' / ' + pc(ti.scoreShare));
  // First to 15 on the board: the share of whole matches a player wins is what they feel (a tired lifter lost about six in ten when every glass touch counted 2).
  check('first to ' + WIN_AT_SRC + ': an average player wins 60% to 75% of the matches (aim: about 70%)', av.matchShare >= 0.60 && av.matchShare <= 0.75, pc(av.matchShare) + ' of ' + av.mt);
  check('first to ' + WIN_AT_SRC + ': a tired player wins 45% to 65% of the matches (aim: about 50%)', ti.matchShare >= 0.45 && ti.matchShare <= 0.65, pc(ti.matchShare) + ' of ' + ti.mt);
  check('first to ' + WIN_AT_SRC + ': a sharp player wins at least 85% of the matches (measured about 98%)', sh.matchShare >= 0.85, pc(sh.matchShare) + ' of ' + sh.mt);
  check('first to ' + WIN_AT_SRC + ': a sharper player wins more matches too: sharp > average > tired', sh.matchShare > av.matchShare && av.matchShare > ti.matchShare, [sh, av, ti].map(r => pc(r.matchShare)).join(' > '));
  check('the board is the goals plus the banks, for both sides, for every bot', all.every(r => r.score.you === r.pts.you + r.banks.you && r.score.amir === r.pts.amir + r.banks.amir), all.map(r => r.score.you + '=' + r.pts.you + '+' + r.banks.you).join(' '));
  // Bajada counts a PLAYED bank only (rally.js BANK_REACH): made in the shooter's own half or the first half of the far half, the last glass touch deciding. When every
  // glass touch counted, banks were 36% of ALL goals (nearly all wide shots that clip the side glass) and Amir's about half of his.
  check('banks (a played bank, worth 2) are 12% to 28% of ALL the goals, for every bot (measured 19 to 27%)',
    all.every(r => r.bankAll >= 0.12 && r.bankAll <= 0.28), all.map(r => pc(r.bankAll)).join(' '));
  check('neither side\'s goals are mostly banks (each side between 5% and 50%, for every bot)',
    all.every(r => r.bankYou >= 0.05 && r.bankYou <= 0.50 && r.bankAmir >= 0.05 && r.bankAmir <= 0.50), all.map(r => pc(r.bankYou) + '/' + pc(r.bankAmir)).join(' '));
  check('no number goes NaN', all.every(r => r.nan === 0), bad);
  check('the ball never leaves the court except through a gap, and no racket crosses the net', all.every(r => r.escaped === 0), bad);
  check('the ball never goes faster than its top speed', all.every(r => r.ballFast === 0), all.map(r => r.ballFast).join(','));
  check('your racket never moves faster than YOU_SPEED (' + YOU_SPEED + ') court widths a second', all.every(r => r.youFast === 0), all.map(r => r.youFast).join(','));
  check('Amir\'s form changes only between points', all.every(r => r.formMoved === 0), all.map(r => r.formMoved).join(','));
  check('Amir\'s form moves one step after every point: up when you score, down when he does', all.every(r => r.formSteps > 100 && r.formStepsOk === r.formSteps), all.map(r => r.formStepsOk + '/' + r.formSteps).join(' '));
  check('Amir\'s form stays between 0 and 1', all.every(r => r.formRange[0] >= 0 && r.formRange[1] <= 1), all.map(r => r.formRange.join('-')).join(' '));
  // His top speed is one number: it never exceeds the AMIR block's, and he reaches it whether he is ahead or behind (the first Amir
  // had a speed that rose to 1.45x while you led and fell to 0.65x while you trailed, which players saw and resented).
  const top = all.map(r => r.amirTop);
  check('Amir\'s top speed is fixed: never over the AMIR block\'s, reached both when you lead and when you trail',
    top.every(t => t.all <= AMIR_SPEED * 1.001 && t.lead >= AMIR_SPEED * 0.95 && t.trail >= AMIR_SPEED * 0.95), top.map(t => t.lead.toFixed(2) + '/' + t.trail.toFixed(2) + '/' + t.all.toFixed(2)).join(' ') + ' of ' + AMIR_SPEED);
  // He looks calm: his misjudgement of a shot is drawn once per shot and his aim once per strike. Redrawn every frame he would twitch
  // (a mutant that re-rolls either each frame measures 69 and 40 a point; as written about 4 and 1.4).
  const calm = all.map(r => ({ miss: r.missRolls / r.n, aim: r.aimRolls / r.n }));
  check('Amir looks calm, not twitchy: under 10 new reads and 5 new aim points a point (they are drawn once per shot and per strike)',
    calm.every(c => c.miss < 10 && c.aim < 5), calm.map(c => c.miss.toFixed(1) + '/' + c.aim.toFixed(1)).join(' '));
  check('every bot played matches to the end (first to ' + WIN_AT_SRC + ')', all.every(r => r.mt >= 40), all.map(r => r.mt).join(','));
  check('a match ends at ' + WIN_AT_SRC + ' or ' + (WIN_AT_SRC + 1) + ' (a bank from ' + (WIN_AT_SRC - 1) + '), never level, and none runs past the play budget (' + CAP_SRC + ' s) by more than a point or two',
    all.every(r => r.odd === 0 && r.level === 0 && r.over16 === 0 && r.maxMin * 60 <= CAP_SRC + 40), all.map(r => r.odd + '/' + r.level + '/' + r.over16 + '/' + (r.maxMin * 60).toFixed(0) + ' s').join(' '));
  check('an average bot reaches Full time in 1 to 4 minutes of real play (the median; measured about 1.5)', av.medMin >= 1 && av.medMin <= 4, av.medMin.toFixed(2) + ' min, longest ' + av.maxMin.toFixed(1));
  // The play budget: with it cut to 20 s (the real one is 8 minutes, which a bot never reaches) a match ends at the next point that leaves someone
  // ahead, before anyone has 15, and never level. Without it a bot would need about 80 s.
  const cut = pool([...Array(SEEDS)].map((_, k) => Object.assign(play(BOTS[1], 900, SEED + k, patchConst(SRC, 'PLAY_CAP_S', 20)), { secs: 900 })));
  check('with the play budget cut to 20 s, matches end on it: early, never level, within a point or two of it',
    cut.mt >= 20 && cut.capped >= cut.mt * 0.8 && cut.level === 0 && cut.maxMin * 60 <= 20 + 40, cut.mt + ' matches, ' + cut.capped + ' ended early, ' + cut.level + ' level, longest ' + (cut.maxMin * 60).toFixed(0) + ' s');
  // Only live seconds are play: none in the serve pause, then the clock runs; one hiccup of a frame adds a quarter of a second at most
  {
    const { Rally: R2, S: S2 } = loadRally(SRC, 7);
    for (let i = 0; i < 30; i++) R2._tick(DT);
    const pause = S2.m.played;
    for (let i = 0; i < 60; i++) R2._tick(DT);
    const live = S2.m.played, before = S2.m.played;
    R2._tick(4);
    check('the play budget counts only live seconds: none in the serve pause, the clock runs after it, a long frame adds at most 0.25 s',
      pause === 0 && live > 0.7 && live < 0.9 && S2.m.played - before <= 0.25 + 1e-9, 'pause ' + pause + ', live ' + live.toFixed(2) + ', long frame +' + (S2.m.played - before).toFixed(3));
  }
  // Bajada's rule itself, on a bare court (no bots; the rackets pinned in the corners): a shot off a side glass at 80% of the top speed, `q` of the way up the court from the
  // shooter's own end wall (0 = their end wall, 1 = the far one), then through the far gap. Up to BANK_REACH it is a played bank (2); nearer the goal it is a clip (1).
  {
    const BR = +(SRC.match(/const BANK_REACH = ([0-9.]+);/) || [])[1];
    const shot = (who, q, f, pre) => {
      const { Rally: R3, S: S3 } = loadRally(SRC, 21);
      const W = S3.W, T3 = S3.top, B3 = S3.H - S3.pad, up = who === 'you';
      const wall = up ? S3.pad + S3.br + 0.5 : W - S3.pad - S3.br - 0.5;   // you shoot off the left glass, Amir off the right (away from the racket parked at the other's goal)
      const y0 = up ? B3 - q * (B3 - T3) : T3 + q * (B3 - T3), dy = up ? y0 - T3 : B3 - y0, k = Math.abs(W / 2 - wall) / (dy * 0.9);
      const vy = (up ? -1 : 1) * f * S3.vmax / Math.sqrt(1 + k * k);
      Object.assign(S3.ball, { x: wall, y: y0, vx: (up ? -1 : 1) * Math.abs(vy) * k, vy });
      S3.freeze = 0; S3.touch = who; S3.glass = null; S3.anchor = { x: S3.ball.x, y: S3.ball.y, t: S3.gt }; S3.hist = [];
      if (pre) pre(S3);
      for (let i = 0; i < 600 && S3.score.you + S3.score.amir === 0; i++) {
        S3.amir.x = W - 30; S3.amir.y = T3 + S3.rr * 2.2; S3.you.x = 30; S3.you.y = B3 - S3.rr * 2.2; S3.target.x = S3.you.x; S3.target.y = S3.you.y;
        R3._tick(DT);
      }
      return { mine: S3.score[who], theirs: S3.score[up ? 'amir' : 'you'] };
    };
    const earlier = s => { s.glass = { x1: 1, y1: 1, x2: 1, y2: 2 }; };   // an earlier bank already on the ball
    const row = (q, f, pre) => ['you', 'amir'].map(w => { const r = shot(w, q, f, pre); return w + ' ' + r.mine + '-' + r.theirs; }).join(', ');
    const twice = (q, f, pre) => ['you', 'amir'].every(w => { const r = shot(w, q, f, pre); return r.mine === 2 && r.theirs === 0; });
    const once = (q, f, pre) => ['you', 'amir'].every(w => { const r = shot(w, q, f, pre); return r.mine === 1 && r.theirs === 0; });
    check('Bajada: BANK_REACH is read from rally.js and is three quarters of the court (own half plus the first half of the far half)', BR === 0.75, 'BANK_REACH ' + BR);
    check('Bajada: a bank made at mid-court, and just inside BANK_REACH, is a played bank worth 2, for you and for Amir', twice(0.55, 0.8) && twice(BR - 0.04, 0.8), row(0.55, 0.8) + ' | ' + row(BR - 0.04, 0.8));
    check('Bajada: a glass touch just past BANK_REACH, and one nearer the goal, is a clip worth 1, for you and for Amir', once(BR + 0.04, 0.8) && once(0.9, 0.8), row(BR + 0.04, 0.8) + ' | ' + row(0.9, 0.8));
    check('Bajada: the LAST glass touch decides: a clip near the goal after an earlier bank is worth 1', once(0.9, 0.8, earlier), row(0.9, 0.8, earlier));
    check('Bajada: a slow touch (under BANK_MIN of the top speed) changes nothing: it takes back no earlier bank, and makes none', twice(0.9, 0.2, earlier) && once(0.55, 0.2), row(0.9, 0.2, earlier) + ' | ' + row(0.55, 0.2));
  }
  // the same seed plays the same game
  const a = play(BOTS[1], 240, SEED + 1000), b = play(BOTS[1], 240, SEED + 1000);
  check('the same seed plays the same game (deterministic)', a.pts.you === b.pts.you && a.pts.amir === b.pts.amir && a.matches.you === b.matches.you, a.pts.you + '-' + a.pts.amir + ' vs ' + b.pts.you + '-' + b.pts.amir);
  // His form does something: with it held at 0 an average player wins clearly more points than with it held at 1 (a form that did
  // nothing would leave this level, and the rubber band between points would be for nothing). About 12 points apart when measured.
  const held = f => { const src = patchSrc(patchSrc(SRC, 'step', '0'), 'start', f); return pool([...Array(SEEDS)].map((_, k) => Object.assign(play(BOTS[1], 1500, SEED + k, src), { secs: 1500 }))); };
  const soft = held(0), sharp = held(1);
  check('his form matters: held soft (0) he loses clearly more points than held sharp (1)', soft.share - sharp.share >= 0.06, pc(soft.share) + ' vs ' + pc(sharp.share));
}
if (!QUIET || failed) console.log('\n' + table(results) + (BOTS.some(b => b.extra && results[b.name]) ? '\n* printed, not asserted on: the ceiling (a player this good beats his rubber band)' : '') + '\n\n' + SECS + ' s of game time per bot per game, ' + SEEDS + ' games per bot pooled, ' + CW + 'x' + CH + ' court, seeds ' + SEED + (SEEDS > 1 ? '-' + (SEED + SEEDS - 1) : '') + ', ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s to run');
process.exitCode = failed ? 1 : 0;
