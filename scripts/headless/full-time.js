// Off the Glass: Full time and Bajada (Amir, 2026-10-18, "go with your picks"): node scripts/headless/full-time.js [--out <dir>]
//
// FULL TIME. One match a session, first to 15, that waits between rests. The match is a variable of rally.js (memory only); program.html
// passes `session` (the day and the local date) and the same key resumes it ("Play resumes · You 6, Amir 4", 1.5 s, no first-open hint,
// the serve to the player), a different key starts fresh. A rest that ends (timeUp) or hands back (Serve Clock) PARKS the match: it is not
// ended and not counted in rally_stats. Only Full time counts a match played or won, says "Full time", the score, the longest rally and,
// when there were any, "Off the glass: N.", and its one button is "Back to the timer". 8 minutes of real play (PLAY_CAP_S) end it at the
// next point that leaves someone ahead; only seconds with a point live count. Done (finishDay) drops the match. The shelf row's small line
// reads the match: the default, "You 6, me 4 · play resumes", "Full time · you won 15–11".
// BAJADA. A goal off the glass counts 2: after a racket's last touch the ball hits the glass (side wall or an end wall beside the gap, never a
// post) faster than 25% of its top speed and then goes through the far gap with no other racket between. "Off the glass +2" for you,
// "Amir off the glass +2" for Amir, the pane lights mint for 0.33 s; an own goal off the glass is 1 for the other side; a slow touch is no bank.
// The court is driven by Rally._tick with the game's animation frame cancelled, so every scenario is exact.
// Serve the repo first (python -m http.server 8871 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const path = require('path');
const H = require('./lib');

const t = H.checker();
const wait = (p, ms) => p.waitForTimeout(ms);
const DEFAULT_LINE = 'Air hockey against me · one match a session';

function prog() {
  const P = H.fixture();
  const day = P.workouts.days[0];
  const ex = n => day.blocks.reduce((a, b) => a.concat(b.exercises), []).find(e => e.name === n);
  ex('Half Kneeling Pallof Press').rx.rest = 90;
  return P;
}
async function open(browser, { w = 390, h = 844, query = '' } = {}) {
  const o = await H.openProgram(browser, { w, h, prog: prog(), spine: H.SPINE, query });
  o.p.setDefaultTimeout(8000);
  await o.p.evaluate(() => openDayView('1'));
  await wait(o.p, 250);
  return o;
}
// A rest with no card ('x' + the date), or the Pallof's own Rest button (its day: '1' + the date)
const restPlain = async (p, secs = 120) => { await p.evaluate(s => openRest(s, 'Back Squat'), secs); await wait(p, 250); };
const restCard = async p => {
  await p.evaluate(`(() => { const c = ${H.card('Half Kneeling Pallof Press')}; if (c.classList.contains('collapsed')) toggleExpand(c); c.querySelector('.rest-btn').click(); })()`);
  await wait(p, 250);
};
const shelf = async (p, key = 'rally') => {
  if (await p.evaluate(() => document.getElementById('timerGames').hidden)) await p.click('#timerPlayBtn');
  await p.click('#timerGames [data-game="' + key + '"]');
};
const playRally = async p => { await shelf(p); await p.waitForFunction(() => window.Rally && Rally.isOpen(), null, { timeout: 8000 }); await wait(p, 300); };
const line = p => p.evaluate(() => document.querySelector('#timerGames [data-game="rally"] small').textContent);
const stats = p => p.evaluate(() => JSON.parse(localStorage.getItem('rally_stats') || 'null'));
const today = p => p.evaluate(() => ymdLocal(new Date()));

// In-page helpers for the exact scenarios: the game's own loop is cancelled, rackets can be pinned out of the way (Amir top right, you bottom
// left), and a shot is launched off a side wall toward a gap at a given share of the ball's top speed.
async function helpers(p) {
  await p.evaluate(() => {
    const bt = s => s.H - s.pad - (parseFloat(getComputedStyle(s.root).paddingBottom) || 0);
    window.__stop = () => { const s = Rally._state(); cancelAnimationFrame(s.raf); s.freeze = 0; return true; };
    window.__drive = (n, pin) => {
      const s = Rally._state();
      for (let i = 0; i < n; i++) {
        if (pin) {
          s.amir.x = s.W - 30; s.amir.y = s.top + s.rr * 2.2; s.you.x = 30; s.you.y = bt(s) - s.rr * 2.2;
          s.target.x = s.you.x; s.target.y = s.you.y;
        }
        Rally._tick(1 / 60);
      }
    };
    // launch off a side wall ('L' or 'R') toward the 'top' (Amir's) or 'bottom' (your) gap at f of the top speed; touch is who touched it last
    window.__shot = ({ side, toward, f, touch }) => {
      const s = Rally._state(), W = s.W, T = s.top, B = bt(s);
      const wall = side === 'L' ? s.pad + s.br + 0.5 : W - s.pad - s.br - 0.5, dir = side === 'L' ? 1 : -1;
      const y0 = toward === 'top' ? T + 0.45 * (B - T) : B - 0.45 * (B - T), dy = toward === 'top' ? y0 - T : B - y0;
      const k = Math.abs(W / 2 - wall) / (dy * 0.9);
      const vy = (toward === 'top' ? -1 : 1) * f * s.vmax / Math.sqrt(1 + k * k);
      Object.assign(s.ball, { x: wall, y: y0, vx: -dir * Math.abs(vy) * k, vy });
      s.freeze = 0; s.touch = touch; s.glass = null; s.lit = null; s.banner = null; s.rally = 0;
      s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt }; s.hist = [];
      return { y0, T, B };
    };
    // drive until the score changes (at most 10 s); what happened
    window.__goal = (pin = true) => {
      const s = Rally._state(), a = s.score.you + s.score.amir, y0 = s.score.you, m0 = s.score.amir;
      let glassSeen = false;
      for (let i = 0; i < 600 && s.score.you + s.score.amir === a && !s.over; i++) { window.__drive(1, pin); if (s.glass) glassSeen = true; }
      return { you: s.score.you - y0, amir: s.score.amir - m0, banner: s.banner && s.banner.text, bannerColour: s.banner && s.banner.c,
        lit: s.lit ? { x1: s.lit.x1, y1: s.lit.y1, x2: s.lit.x2, y2: s.lit.y2, t: s.lit.t } : null, banked: Object.assign({}, s.m.banked), over: s.over, matchOver: s.m.over, glassSeen };
    };
  });
}

(async () => {
  const browser = await H.launch();
  const out = H.outDir();
  const errors = [];
  try {
    // ── 1. The shelf row's small line in its states ──
    let { ctx, p } = await open(browser);
    p.on('pageerror', e => errors.push(String(e)));
    await restPlain(p);
    await p.click('#timerPlayBtn');
    t.check('before any game has loaded (rally.js is not here yet) the row reads the default', (await p.evaluate(() => !window.Rally)) && (await line(p)) === DEFAULT_LINE, await line(p));
    await playRally(p);
    t.check('opening the game starts a fresh match at 0-0, parked in the file', await p.evaluate(() => { const m = Rally.matchState(); return m && m.you === 0 && m.amir === 0 && !m.over; }));
    await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); s.score.you = 6; s.score.amir = 4; s.best = 7; });
    await p.click('.rally-x');
    await wait(p, 250);
    t.check('with a match parked, closing the game refreshes the row at once: "You 6, me 4 · play resumes"', (await line(p)) === 'You 6, me 4 · play resumes', await line(p));
    await p.click('#timerPlayBtn'); await p.click('#timerPlayBtn');   // fold, open: it is read again when the shelf opens
    t.check('and the same when the shelf is opened again', (await line(p)) === 'You 6, me 4 · play resumes', await line(p));
    // another session's match is not offered as "play resumes" (the game would start a fresh one)
    await p.evaluate(() => { timerCtx = { card: { dataset: { day: '2' } }, circuit: false, test: false }; });
    await p.click('#timerPlayBtn'); await p.click('#timerPlayBtn');
    t.check('a match left from another session shows the default', (await line(p)) === DEFAULT_LINE, await line(p));
    const key1 = await p.evaluate(() => restGameSession()), day = await today(p);
    t.check('the session key is the card\'s day and the local date', key1 === '2|' + day, key1);
    await p.evaluate(() => { timerCtx = null; });
    // Full time, won and lost
    await playRally(p); await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); s.score.you = 14; s.score.amir = 11; __stop(); });
    await p.evaluate(() => __shot({ side: 'L', toward: 'top', f: 0.1, touch: '' }));   // a slow ball with nobody's touch: a plain point
    let g = await p.evaluate(() => __goal());
    t.check('14-11, a plain point (1) ends it at 15-11', g.you === 1 && g.matchOver && g.over, JSON.stringify(g));
    await p.click('.rally-x'); await wait(p, 200);
    t.check('after Full time the row reads "Full time · you won 15–11"', (await line(p)) === 'Full time · you won 15–11', await line(p));
    await p.evaluate(() => Rally.endSession());
    await playRally(p); await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); s.score.you = 12; s.score.amir = 14; __stop(); });
    await p.evaluate(() => __shot({ side: 'R', toward: 'bottom', f: 0.1, touch: '' }));
    g = await p.evaluate(() => __goal());
    t.check('12-14, his plain point ends it at 12-15', g.amir === 1 && g.matchOver, JSON.stringify(g));
    await p.click('.rally-x'); await wait(p, 200);
    t.check('and the row reads "Full time · I won 15–12"', (await line(p)) === 'Full time · I won 15–12', await line(p));
    await ctx.close();

    // ── 2. Resume: the same session, two rests ──
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restPlain(p);
    await playRally(p);
    const first = await p.evaluate(() => { const s = Rally._state(); return { hint: s.hint, banner: s.banner && s.banner.text, score: s.score.you + '-' + s.score.amir }; });
    t.check('a first open starts 0-0 with the first-open hint and no resume banner', first.hint === true && first.banner === null && first.score === '0-0', JSON.stringify(first));
    await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); s.score.you = 6; s.score.amir = 4; s.best = 7; s.m.played = 90; s.form = 0.9; s.m.form = 0.9; });
    await p.click('.rally-x'); await wait(p, 200);
    t.check('closing parks the match (not over, not counted played)', await p.evaluate(() => JSON.stringify(Rally.matchState()) === JSON.stringify({ you: 6, amir: 4, over: false })) && !(await stats(p) && (await stats(p)).played), JSON.stringify(await stats(p)));
    await playRally(p);   // the second rest, the same session
    const res = await p.evaluate(() => { const s = Rally._state(); return { banner: s.banner && s.banner.text, dur: s.banner && s.banner.dur, colour: s.banner && s.banner.c, hint: s.hint, freeze: s.freeze,
      score: s.score.you + '-' + s.score.amir, best: s.best, played: s.m.played, form: s.form, over: s.over, ballInYourHalf: s.ball.y > (s.top + s.H) / 2, still: s.ball.vx === 0 && s.ball.vy === 0, msgHidden: s.msg.hidden }; });
    t.check('the same session picks the match up: 6-4, with "Play resumes · You 6, Amir 4"', res.score === '6-4' && res.banner === 'Play resumes · You 6, Amir 4' && res.colour === '#7FD6AE', JSON.stringify(res));
    t.check('the banner holds about 1.5 s, the hint stays away, the serve waits for it and goes to the player', res.dur === 1.5 && res.hint === false && res.freeze > 0.8 && res.freeze <= 1.5 && res.ballInYourHalf && res.still && !res.over && res.msgHidden, JSON.stringify(res));
    t.check('the best rally, the played seconds and Amir\'s form come back with it', res.best === 7 && res.played >= 90 && res.played < 91 && Math.abs(res.form - 0.9) < 1e-9, JSON.stringify(res));
    await wait(p, 1800);
    t.check('the banner is gone after about 1.5 s', await p.evaluate(() => { const s = Rally._state(); return !s.banner; }));
    await p.screenshot({ path: path.join(out, 'full-time-resumed-390.png') });
    // a different session starts fresh
    await p.click('.rally-x'); await wait(p, 200);
    await p.evaluate(() => { timerCtx = { card: { dataset: { day: '2' } }, circuit: false, test: false }; });
    await playRally(p);
    const fresh = await p.evaluate(() => { const s = Rally._state(); return { score: s.score.you + '-' + s.score.amir, hint: s.hint, banner: s.banner && s.banner.text, played: s.m.played, form: s.form }; });
    t.check('a different session starts a fresh match: 0-0, the hint, no banner, a fresh form', fresh.score === '0-0' && fresh.hint === true && fresh.banner === null && fresh.played < 1 && fresh.form === 0.5, JSON.stringify(fresh));
    await p.click('.rally-x'); await wait(p, 200);
    t.check('and the first session\'s match is gone (one parked match at a time)', await p.evaluate(() => Rally.matchState('x|' + ymdLocal(new Date())) === null && JSON.stringify(Rally.matchState('2|' + ymdLocal(new Date()))) === JSON.stringify({ you: 0, amir: 0, over: false })));
    // no session at all: every open is a fresh match (a caller that does not pass one)
    const noKey = await p.evaluate(() => {
      Rally.close();
      const root = document.getElementById('rallyOverlay'), mk = () => Rally.open({ root, left: () => 90, sound: () => false });
      mk(); const s1 = Rally._state(); s1.score.you = 3; Rally.close();
      mk(); const s2 = Rally._state(); const r = { score: s2.score.you + '-' + s2.score.amir, hint: s2.hint }; Rally.close(); return r;
    });
    t.check('with no session key every open is a fresh match', noKey.score === '0-0' && noKey.hint === true, JSON.stringify(noKey));
    // the key itself: the card's day, Guided's day, 'x'
    const keys = await p.evaluate(() => {
      const d = ymdLocal(new Date()), r = {};
      timerCtx = null; timerOnComplete = null; r.none = restGameSession() === 'x|' + d;
      timerCtx = { card: { dataset: { day: '3' } } }; r.card = restGameSession() === '3|' + d;
      timerOnComplete = () => {}; STEP = { day: '4' }; r.guided = restGameSession() === '4|' + d;
      STEP = null; timerOnComplete = null; timerCtx = null; r.guidedNoStep = restGameSession() === 'x|' + d;
      return r;
    });
    t.check('the key is the day plus the local date: the list\'s card, Guided\'s STEP.day, else x', keys.none && keys.card && keys.guided && keys.guidedNoStep, JSON.stringify(keys));
    await ctx.close();

    // ── 3. The card's own Rest button, then the hand-back and the time-up park the match ──
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restCard(p);
    t.check('a Rest button on the Pallof card keys the session by its day (1) and the date', await p.evaluate(() => restGameSession()) === '1|' + await today(p));
    await playRally(p); await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); s.score.you = 6; s.score.amir = 4; s.best = 8; });
    await p.evaluate(() => { timerEndsAt = Date.now() + 24 * 1000; });
    await p.waitForFunction(() => { const s = window.Rally && Rally._state(); return s && s.banner && s.banner.text === 'Last point.'; }, null, { timeout: 3000 });
    const t0 = Date.now();
    await p.waitForFunction(() => !Rally.isOpen(), null, { timeout: 7000 });
    const took = Date.now() - t0;
    t.check('the hand-back still closes the game within 6 s (a dead or frozen ball: about 0.6 s)', took < 6600, took + ' ms');
    t.check('the hand-back parked the match: 6-4, not over, not played, not won', await p.evaluate(() => JSON.stringify(Rally.matchState()) === JSON.stringify({ you: 6, amir: 4, over: false })) && !((await stats(p)) && (await stats(p)).played), JSON.stringify(await stats(p)));
    t.check('…and the best rally was kept (8)', ((await stats(p)) || {}).best === 8, JSON.stringify(await stats(p)));
    // a new rest of the same workout: it comes back
    await restCard(p);
    await playRally(p);
    t.check('the next rest of the workout resumes it', await p.evaluate(() => { const s = Rally._state(); return s.banner && s.banner.text === 'Play resumes · You 6, Amir 4' && s.score.you === 6; }));
    // the hand-back of a resumed game with a live ball: the hard deadline is still 6 s
    await helpers(p);
    const hard = await p.evaluate(async () => {
      const s = Rally._state(), sleep = ms => new Promise(r => setTimeout(r, ms));
      __stop(); s.ball.x = s.W / 2; s.ball.y = s.H * 0.62; s.ball.vx = s.vmax * 0.9; s.ball.vy = 0;   // a ball in play, and the game's own frames stopped
      const t0 = performance.now(); let doneAt = 0;
      Rally.handBack(() => { doneAt = performance.now() - t0; });
      await sleep(6900);
      Rally.close();
      return { doneAt, match: Rally.matchState() };
    });
    t.check('a resumed game with a ball in play is cut at the 6 s deadline and the match stays parked', hard.doneAt >= 5800 && hard.doneAt <= 6700 && hard.match && !hard.match.over, JSON.stringify(hard));
    await wait(p, 300);
    // the time-up
    await restCard(p);
    await playRally(p);
    await p.evaluate(() => { SERVE_CLOCK.at = 0; SERVE_CLOCK.atLong = 0; timerEndsAt = Date.now() + 1500; });
    await wait(p, 2200);
    const up = await p.evaluate(() => { const s = Rally._state(); return s ? { timeUp: s.timeUp, title: s.msg.querySelector('h3').textContent, text: s.msg.querySelector('p').textContent } : null; });
    t.check('time up says "Time. Next set." with the score, and the match is parked, not ended', up && up.timeUp && up.title === 'Time. Next set.' && up.text === 'You 6, Amir 4. Back to work.', JSON.stringify(up));
    await wait(p, 1600);
    t.check('the game closes with the timer; the match is still 6-4, not over, and rally_stats counts no match', await p.evaluate(() => !Rally.isOpen() && JSON.stringify(Rally.matchState()) === JSON.stringify({ you: 6, amir: 4, over: false })) && !((await stats(p)) || {}).played, JSON.stringify(await stats(p)));
    await ctx.close();

    // ── 4. Done ends the session's match ──
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restCard(p);
    await playRally(p);
    await p.evaluate(() => { const s = Rally._state(); s.score.you = 5; s.score.amir = 5; });
    await p.click('.rally-x'); await wait(p, 200);
    t.check('a match is parked before Done', await p.evaluate(() => !!Rally.matchState()));
    await p.evaluate(() => { closeTimer(); localStorage.setItem(ATHLETE_ID + '_srpe_1', '7'); finishDay('1'); });
    await wait(p, 700);
    t.check('Done (finishDay → finishDayNow) drops the parked match', await p.evaluate(() => Rally.matchState() === null && document.getElementById('complete-1').classList.contains('visible')));
    t.check('and nothing is left for that session: matchState for its key is null', await p.evaluate(() => Rally.matchState('1|' + ymdLocal(new Date())) === null));
    // Done with the game never loaded does nothing wrong
    await ctx.close();
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await p.evaluate(() => { localStorage.setItem(ATHLETE_ID + '_srpe_1', '7'); finishDay('1'); });
    await wait(p, 600);
    t.check('Done works when Off the Glass was never opened (rally.js not loaded)', await p.evaluate(() => !window.Rally && document.getElementById('complete-1').classList.contains('visible')));
    await ctx.close();

    // ── 5. Full time: the end box, the stats, the play budget ──
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restPlain(p);
    await playRally(p); await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); __stop(); s.score.you = 14; s.score.amir = 9; s.best = 5; s.m.banked.you = 2; });
    await p.evaluate(() => __shot({ side: 'L', toward: 'top', f: 0.8, touch: 'you' }));
    g = await p.evaluate(() => __goal());
    t.check('a bank from 14 makes 16 and wins it (the board shows the real score)', g.you === 2 && g.matchOver && g.over && g.banner === 'Off the glass +2', JSON.stringify(g));
    const box = await p.evaluate(() => { const s = Rally._state(), b = s.msg.querySelector('.rally-go'); return { hidden: s.msg.hidden, title: s.msg.querySelector('h3').textContent, text: s.msg.querySelector('p').textContent, btn: b.textContent, btnHidden: b.hidden, score: s.score.you + '-' + s.score.amir }; });
    t.check('Full time: "You win 16–9." then the longest rally and "Off the glass: 3." (2 before and this one)', box.title === 'Full time' && box.text === 'You win 16–9.\nLongest rally: 5 hits.\nOff the glass: 3.' && !box.hidden, JSON.stringify(box));
    t.check('its one button is "Back to the timer" (no Play again)', box.btn === 'Back to the timer' && !box.btnHidden, JSON.stringify(box));
    t.check('rally_stats counts it once, played and won, with the best rally', JSON.stringify(await stats(p)) === JSON.stringify({ best: 5, wins: 1, played: 1 }), JSON.stringify(await stats(p)));
    await p.screenshot({ path: path.join(out, 'full-time-won-390.png') });
    await p.click('.rally-go'); await wait(p, 200);
    t.check('the button closes the game, the rest keeps running', await p.evaluate(() => !Rally.isOpen() && timerRunning && document.getElementById('timerOverlay').classList.contains('visible')));
    // a loss, and an end box with no banks
    await p.evaluate(() => Rally.endSession());
    await playRally(p); await helpers(p);
    await p.evaluate(() => { const s = Rally._state(); __stop(); s.score.you = 12; s.score.amir = 14; s.best = 3; });
    await p.evaluate(() => __shot({ side: 'R', toward: 'bottom', f: 0.1, touch: '' }));
    await p.evaluate(() => __goal());
    const lost = await p.evaluate(() => Rally._state().msg.querySelector('p').textContent);
    t.check('a loss reads "Amir wins 15–12." and, with no banks, has no Off the glass sentence', lost === 'Amir wins 15–12.\nLongest rally: 3 hits.', lost);
    t.check('rally_stats: two matches played, one won', JSON.stringify(await stats(p)) === JSON.stringify({ best: 5, wins: 1, played: 2 }), JSON.stringify(await stats(p)));
    await p.click('.rally-go'); await wait(p, 200);

    // the play budget: only live seconds count
    await p.evaluate(() => Rally.endSession());
    await playRally(p); await helpers(p);
    const live = await p.evaluate(() => {
      const s = Rally._state(), r = {}; __stop(); s.m.played = 0;
      s.freeze = 0.5; __drive(20, true); r.freeze = s.m.played;                 // 0.33 s of the serve pause
      s.freeze = 0; s.ball.vx = 0; s.ball.vy = 0; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      const p0 = s.m.played; __drive(60, true); r.live = s.m.played - p0;      // 1 s of play
      return r;
    });
    t.check('the serve pause adds nothing to the played seconds, a live second adds one', live.freeze === 0 && Math.abs(live.live - 1) < 0.02, JSON.stringify(live));
    const paused = await p.evaluate(() => {
      const s = Rally._state(), r = {}; s.freeze = 0;
      const base = () => { s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt }; return s.m.played; };
      pauseTimer(); let p0 = base(); __drive(30, true); r.restPaused = s.m.played - p0;   // left() is null while the rest is paused
      startTimer(); p0 = base(); __drive(30, true); r.running = s.m.played - p0;
      s.hb = { fired: false, timers: [] }; p0 = base(); __drive(30, true); r.handedBack = s.m.played - p0; s.hb = null;
      const keep = s.over; s.over = true; p0 = s.m.played; __drive(30, true); r.ended = s.m.played - p0; s.over = keep;
      s.timeUp = true; p0 = s.m.played; __drive(30, true); r.timeUp = s.m.played - p0; s.timeUp = false;
      p0 = base(); Rally._tick(3); r.longFrame = s.m.played - p0;                          // a page that slept: a quarter of a second at most
      return r;
    });
    t.check('a paused rest, the hand-back, the end box and time up add nothing; a running rest adds its half second; a long frame adds at most 0.25 s',
      paused.restPaused === 0 && Math.abs(paused.running - 0.5) < 0.02 && paused.handedBack === 0 && paused.ended === 0 && paused.timeUp === 0 && paused.longFrame <= 0.25 + 1e-9 && paused.longFrame > 0, JSON.stringify(paused));
    // under the cap a point that leaves someone ahead does not end it; level at the cap it plays on; the next point ends it
    const cap = await p.evaluate(() => {
      const s = Rally._state(), r = {}; __stop(); s.over = false; s.m.over = false; s.score.you = 5; s.score.amir = 5; s.m.played = 100; s.timeUp = false;
      __shot({ side: 'L', toward: 'top', f: 0.1, touch: '' });
      let g = __goal(); r.under = { score: s.score.you + '-' + s.score.amir, over: s.m.over };
      s.score.you = 5; s.score.amir = 5; s.m.played = 479.9; s.over = false; s.m.over = false;
      __shot({ side: 'L', toward: 'top', f: 0.1, touch: '' });
      __drive(20, true);                                                            // the budget runs out in the rally, with the score level
      r.levelAtCap = { played: s.m.played, over: s.m.over, score: s.score.you + '-' + s.score.amir };
      g = __goal(); r.atCap = { score: s.score.you + '-' + s.score.amir, over: s.m.over, text: s.msg.querySelector('p').textContent };
      return r;
    });
    t.check('with 100 s played, 6-5 is just a point', cap.under.score === '6-5' && !cap.under.over, JSON.stringify(cap.under));
    t.check('the budget running out in a level rally ends nothing', cap.levelAtCap.played >= 480 && !cap.levelAtCap.over && cap.levelAtCap.score === '5-5', JSON.stringify(cap.levelAtCap));
    t.check('…the next point (6-5) ends it: Full time, "You win 6–5."', cap.atCap.over && cap.atCap.score === '6-5' && /^You win 6–5\.\n/.test(cap.atCap.text), JSON.stringify(cap.atCap));
    await ctx.close();

    // ── 6. Bajada ──
    ({ ctx, p } = await open(browser));
    p.on('pageerror', e => errors.push(String(e)));
    await restPlain(p);
    await playRally(p); await helpers(p);
    await p.evaluate(() => __stop());
    // a. your racket, the left glass at speed, Amir's gap
    let geo = await p.evaluate(() => __shot({ side: 'L', toward: 'top', f: 0.8, touch: 'you' }));
    g = await p.evaluate(() => __goal());
    t.check('a. your bank off the left glass into Amir\'s gap counts 2, "Off the glass +2" in mint', g.you === 2 && g.amir === 0 && g.banner === 'Off the glass +2' && g.bannerColour === '#7FD6AE' && g.banked.you === 1, JSON.stringify(g));
    const third = (geo.B - geo.T) / 3;
    t.check('…and the pane it touched (the middle third of the left glass) is lit', g.lit && g.lit.x1 === g.lit.x2 && g.lit.x1 === 8 && Math.abs(g.lit.y1 - (geo.T + third)) < 1 && Math.abs(g.lit.y2 - (geo.T + 2 * third)) < 1, JSON.stringify(g.lit));
    await p.evaluate(() => __drive(15, true));
    const lit1 = await p.evaluate(() => !!Rally._state().lit);
    await p.evaluate(() => __drive(10, true));
    const lit2 = await p.evaluate(() => !!Rally._state().lit);
    t.check('the pane stays lit for a third of a second (still lit at 0.25 s, gone by 0.42 s)', lit1 && !lit2, lit1 + ' ' + lit2);
    // b. Amir's racket, the right glass, your gap
    await p.evaluate(() => __shot({ side: 'R', toward: 'bottom', f: 0.8, touch: 'amir' }));
    g = await p.evaluate(() => __goal());
    t.check('b. Amir\'s bank off the right glass into your gap counts 2, "Amir off the glass +2" in clay', g.amir === 2 && g.you === 0 && g.banner === 'Amir off the glass +2' && g.bannerColour === '#E06B43' && g.lit && g.lit.x1 === g.lit.x2, JSON.stringify(g));
    // c. an own goal off the glass
    await p.evaluate(() => __shot({ side: 'L', toward: 'bottom', f: 0.8, touch: 'you' }));
    g = await p.evaluate(() => __goal());
    t.check('c. your ball off the glass into YOUR gap is Amir\'s point, 1, "Amir scores", nothing lit', g.amir === 1 && g.you === 0 && g.banner === 'Amir scores' && g.lit === null && g.banked.amir === 1, JSON.stringify(g));
    await p.evaluate(() => __shot({ side: 'R', toward: 'top', f: 0.8, touch: 'amir' }));
    g = await p.evaluate(() => __goal());
    t.check('c. Amir\'s ball off the glass into HIS gap is your point, 1, "Point!"', g.you === 1 && g.amir === 0 && g.banner === 'Point!' && g.lit === null, JSON.stringify(g));
    // d. slow along the glass, d2 just over the line
    await p.evaluate(() => __shot({ side: 'L', toward: 'top', f: 0.2, touch: 'you' }));
    g = await p.evaluate(() => __goal());
    t.check('d. a ball that touches the glass at 20% of the top speed is not a bank: 1 point', g.you === 1 && g.banner === 'Point!' && g.lit === null && g.glassSeen === false, JSON.stringify(g));
    await p.evaluate(() => __shot({ side: 'L', toward: 'top', f: 0.3, touch: 'you' }));
    g = await p.evaluate(() => __goal());
    t.check('d. at 30% it is: 2 points', g.you === 2 && g.banner === 'Off the glass +2', JSON.stringify(g));
    // e. a ball nobody has touched (a serve that rolls into the gap off the glass) is no bank
    await p.evaluate(() => __shot({ side: 'L', toward: 'top', f: 0.8, touch: '' }));
    g = await p.evaluate(() => __goal());
    t.check('e. a ball no racket has touched since the serve is no bank: 1 point', g.you === 1 && g.banner === 'Point!' && !g.glassSeen, JSON.stringify(g));
    // f. a racket in between: Amir touches it after the glass
    const mid = await p.evaluate(() => {
      __shot({ side: 'L', toward: 'top', f: 0.8, touch: 'you' });
      const s = Rally._state(); let n = 0;
      while (!s.glass && n++ < 200) __drive(1, true);
      const before = { glass: !!s.glass, touch: s.touch };
      // the ball is in mid-court (away from every wall) with its glass hit still on it, and Amir's racket is right in its way: his touch
      const b = s.ball; b.x = s.W / 2; b.y = s.top + 200; b.vx = 0; b.vy = -s.vmax * 0.5; s.anchor = { x: b.x, y: b.y, t: s.gt };
      s.amir.x = b.x; s.amir.y = b.y - (s.br + s.rr - 6);
      let k = 0; while (s.touch !== 'amir' && k++ < 5) Rally._tick(1 / 120);
      return { before, after: { glass: s.glass, touch: s.touch } };
    });
    t.check('f. a glass hit is wiped by the next racket: Amir\'s touch clears it and he touched it last', mid.before.glass && mid.before.touch === 'you' && mid.after.glass === null && mid.after.touch === 'amir', JSON.stringify(mid));
    // g. a racket's real contact sets the toucher
    const touch = await p.evaluate(() => {
      const s = Rally._state(), r = {}; __stop();
      s.glass = { x1: 1, y1: 1, x2: 1, y2: 2 }; s.touch = 'amir';
      s.you.x = 200; s.you.y = s.H - 150; s.target.x = s.you.x; s.target.y = s.you.y;
      s.amir.x = s.W - 30; s.amir.y = s.top + s.rr * 2.2;
      s.ball.x = 200; s.ball.y = s.you.y - (s.rr + s.br) + 2; s.ball.vx = 0; s.ball.vy = 300; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      Rally._tick(1 / 60);
      r.you = { touch: s.touch, glass: s.glass };
      return r;
    });
    t.check('g. your racket hitting the ball makes you the last to touch it and clears any glass before it', touch.you.touch === 'you' && touch.you.glass === null, JSON.stringify(touch));
    // h. a post is not glass
    const post = await p.evaluate(() => {
      const s = Rally._state(); __stop();
      const g1 = s.W / 2 - s.gw / 2;
      Object.assign(s.ball, { x: g1 + 3, y: s.top + s.br + 3, vx: 0, vy: -s.vmax * 0.8 });
      s.touch = 'you'; s.glass = null; s.freeze = 0; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      let seen = false, bounced = false;
      for (let i = 0; i < 15; i++) { __drive(1, true); if (s.glass) seen = true; if (s.ball.vy > 0) bounced = true; }
      return { seen, bounced };
    });
    t.check('h. a ball that hits a post (not the glass) makes no bank', post.bounced && !post.seen, JSON.stringify(post));
    // i. the end wall beside the gap is glass
    const endWall = await p.evaluate(() => {
      const s = Rally._state(); __stop();
      Object.assign(s.ball, { x: 60, y: s.top + s.br + 4, vx: 0, vy: -s.vmax * 0.7 });
      s.touch = 'you'; s.glass = null; s.freeze = 0; s.anchor = { x: s.ball.x, y: s.ball.y, t: s.gt };
      __drive(3, true);
      return { glass: s.glass && { y1: s.glass.y1, y2: s.glass.y2, x1: s.glass.x1, x2: s.glass.x2 } , top: s.top, g1: s.W / 2 - s.gw / 2 };
    });
    t.check('i. the end wall beside the gap is glass: the ball off it at speed is a bank, lit from the corner to the post', endWall.glass && endWall.glass.y1 === endWall.top && endWall.glass.y2 === endWall.top && endWall.glass.x1 === 8 && Math.abs(endWall.glass.x2 - endWall.g1) < 1, JSON.stringify(endWall));
    await p.screenshot({ path: path.join(out, 'bajada-390.png') });
    await ctx.close();

    // ── 7. How it looks: the banners and the hint fit a 320 px court, the lit pane and the resumed court are seen ──
    ({ ctx, p } = await open(browser, { w: 320, h: 568 }));
    p.on('pageerror', e => errors.push(String(e)));
    await restPlain(p);
    await p.evaluate(() => {
      window.__txt = [];
      const orig = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (text, x, y) {
        window.__txt.push({ text: String(text), w: this.measureText(String(text)).width, font: this.font });
        return orig.apply(this, arguments);
      };
    });
    await playRally(p);
    await wait(p, 250);
    const hint = await p.evaluate(() => { const W = Rally._state().W; const a = window.__txt.filter(x => /^Drag in your half|^First to/.test(x.text)); return { W, a: a.slice(-2).map(x => ({ text: x.text, w: Math.round(x.w), px: parseFloat((x.font.match(/([0-9.]+)px/) || [])[1]) })) }; });
    t.check('the first-open hint is the two new lines', hint.a.length === 2 && hint.a[0].text === 'Drag in your half. Hit it through Amir\'s gap.' && hint.a[1].text === 'First to 15. The match waits for your next rest.', JSON.stringify(hint));
    t.check('at 320 px both lines fit the court and none is under 12 px', hint.a.every(x => x.w <= hint.W - 8 && x.px >= 12), JSON.stringify(hint));
    await helpers(p);
    await p.evaluate(() => {   // keep the rackets out of the way while the game's own frames run
      window.__pin = setInterval(() => { const s = Rally._state(); if (!s) return; s.amir.x = s.W - 30; s.amir.y = s.top + s.rr * 2.2; s.you.x = 30; s.you.y = s.H - 8 - s.rr * 2.2; s.target.x = 30; s.target.y = s.you.y; }, 4);
      const s = Rally._state(); s.score.you = 11; s.score.amir = 12; s.freeze = 0; __shot({ side: 'R', toward: 'bottom', f: 0.8, touch: 'amir' });
    });
    await p.waitForFunction(() => Rally._state().score.amir === 14, null, { timeout: 6000 });
    await wait(p, 120);
    await p.evaluate(() => { const s = Rally._state(); window.__hold = setInterval(() => { if (s.lit) s.lit.t = 0.04; if (s.banner) s.banner.t = 0.4; }, 4); });
    await wait(p, 150);
    await p.screenshot({ path: path.join(out, 'bajada-320.png') });
    await p.evaluate(() => { clearInterval(window.__hold); });
    const ban = await p.evaluate(() => { const W = Rally._state().W; const a = window.__txt.filter(x => /OFF THE GLASS/.test(x.text)); return { W, a: a.slice(-1).map(x => ({ text: x.text, w: Math.round(x.w), px: parseFloat((x.font.match(/([0-9.]+)px/) || [])[1]) })) }; });
    t.check('"AMIR OFF THE GLASS +2" is drawn whole inside a 320 px court, at 22 px or more', ban.a.length === 1 && ban.a[0].text === 'AMIR OFF THE GLASS +2' && ban.a[0].w <= ban.W - 8 && ban.a[0].px >= 22, JSON.stringify(ban));
    await p.evaluate(() => { clearInterval(window.__pin); });
    await p.click('.rally-x'); await wait(p, 200);
    await playRally(p);
    await p.evaluate(() => { window.__txt.length = 0; });
    await wait(p, 300);
    await p.screenshot({ path: path.join(out, 'full-time-resumed-320.png') });
    const rs = await p.evaluate(() => { const W = Rally._state().W; const a = window.__txt.filter(x => /RESUMES/.test(x.text)); return { W, a: a.slice(-1).map(x => ({ text: x.text, w: Math.round(x.w), px: parseFloat((x.font.match(/([0-9.]+)px/) || [])[1]) })), hint: window.__txt.some(x => /^Drag in your half/.test(x.text)) }; });
    t.check('"PLAY RESUMES · YOU 11, AMIR 14" is drawn whole inside a 320 px court, and the hint is not drawn', rs.a.length === 1 && rs.a[0].text === 'PLAY RESUMES · YOU 11, AMIR 14' && rs.a[0].w <= rs.W - 8 && rs.a[0].px >= 22 && !rs.hint, JSON.stringify(rs));
    await ctx.close();

    t.check('the page logged no error', errors.length === 0, errors.join(' | '));
  } catch (e) {
    t.check('the run finished', false, e.stack || String(e));
  } finally {
    await browser.close();
  }
  console.log('screenshots: ' + out);
  process.exit(t.report() ? 1 : 0);
})();
