// Off the Glass: a one-thumb game for the rest between sets (2026-10-17; Amir: "a game like this for my app, to use during
// rest time", after Matt Cannon's air hockey pen). Air hockey on a padel court seen from above: the ball comes off the glass,
// your racket is the bottom one, Amir's is the top one, and a point is the ball through the gap in the other end's wall.
//
// What makes it a rest game, not just a game (PROGRAM-APP.md → *Off the Glass*):
//   · The rest clock is always on screen, turns clay in the last 10 s, and the game stops the moment the rest ends
//     (program.html calls Rally.timeUp() from timerDone(), then closeTimer() closes both). It never runs past a rest.
//   · Full time (2026-10-18): ONE match a session, first to 15, that waits between rests. The match belongs to the session, not the
//     rest: it lives in a variable of this file (memory only, a reload starts fresh), and opening the game again for the same session
//     key (program.html passes the day and the local date) picks it up where it was ("Play resumes · You 6, Amir 4"). A rest that ends
//     or hands back PARKS it and never ends it; only Full time counts a match played or won; Done drops it (Rally.endSession(day)).
//   · Bajada (2026-10-18): a goal that came off the glass IN PLAY counts 2. After a racket's last touch the ball hits the glass (a side wall
//     or an end wall beside the gap, never a post) faster than BANK_MIN of its top speed, while it is still in the shooter's own half or the
//     first half of the far half (BANK_REACH), and then goes through the far gap with no other racket in between: the player whose racket it
//     was scores 2. A glass touch nearer the goal than that is a clip, worth 1 (the last fast touch decides). An own goal off the glass is 1
//     for the other side, as ever.
//   · Amir defends like a person (The Read, 2026-10-18): he sees the ball a moment late,
//     walks to where it will cross his end, aims with a small error and now and then mistimes one. His form moves a step after each
//     point (sharper when you score, softer when he does); nothing changes mid-rally and nothing about it shows on screen.
//   · One thumb: drag anywhere in your half; on a touch screen the racket sits above the finger so the thumb never hides it.
//   · Nothing leaves the phone and nothing syncs: the best rally and the wins live in `rally_stats` on this phone only.
//   · Sound follows the rest timer's speaker (`rest_sound`); a hit buzzes where the phone can; reduced motion drops the shake.
//
// program.html owns the layer (#rallyOverlay, in topLayer() so Back closes it) and loads this file the first time Play is
// tapped (sw.js keeps it in the shell, so it plays with no signal; a change to it ships with a CACHE bump).
// API: Rally.open({ root, left, sound, audio, session, onClose, mode }) · Rally.timeUp() · Rally.close() · Rally.isOpen() · Rally.handBack(done)
//      · Rally.endSession(day) · Rally.matchState(session).
//   mode: 'lob' opens The Lob instead of the game (a slow ball to breathe with, no match, no score: see "The Lob" below). It never reads or
//   changes the parked match, so opening The Lob and then Off the Glass in one session picks the match up where it was left.
//   left()  → whole seconds of rest left, or null while the rest is paused.
//   session → a string that names the session (program.html: the day and the local date). The same string as the parked match's, and
//   the match not over and with a point played, resumes it; anything else starts a fresh match (a 0-0 match is picked up as new). Without one every open is a fresh match.
//   endSession(day) → drops the parked match (Done, program.html's finishDayNow(day)): that day's only, or any with no day.  matchState(session) → { you, amir, over } of the
//   parked match, or null (with a session given, null unless it is that session's), for the shelf row's small line.
//   sound() → true when the rest timer's sound is on.  audio() → the page's AudioContext, opened in the tap on Play.
//   handBack(done) → Serve Clock (idea #39): with 25 s left program.html asks the game to wind down. It says "Last point.", lets a point in
//   play finish (no new serve), then calls done() and program.html closes it, so the last seconds of the rest belong to the next set.
(function () {
  'use strict';
  const WIN_AT = 15;      // Full time: first to 15, Amir's pick 2026-10-18 (a goal that is a bank counts 2, so 16 can win)
  const PLAY_CAP_S = 480; // Full time: 8 minutes of real play a session at most. Only seconds with a point live count (not the serve pause, the end box, a paused rest or the hand-back); then the next point that leaves someone ahead ends it
  const LIT_S = 0.33;     // Bajada: how long the pane lights up
  const BANK_MIN = 0.25;  // Bajada: the ball must hit the glass faster than this share of its top speed for a goal to count 2
  // Bajada counts a PLAYED bank, not a clip. Measure up the court from the end of whoever hit the ball last (you the bottom end, Amir the top):
  // a glass touch counts only in the first BANK_REACH of the court, which is their own half plus the first half of the far half (0.75). A touch
  // nearer the goal than that is a wide shot that clips the side glass on its way in, and the goal is worth 1, as it always was. The LAST fast
  // glass touch decides, so a ball that banked in play and then clipped near the goal is worth 1. (Until 2026-10-18 every glass touch after the
  // racket counted: banks were 36% of all goals, nearly all of them clips, and a tired player won only 39% of the first-to-15 matches. Now they are
  // 19 to 27% of the goals, whoever plays, and Amir's `react` was brought down with it.)
  const BANK_REACH = 0.75;
  const C = {
    court: '#0E4A36', courtDeep: '#082D20', line: 'rgba(255,255,255,.28)', glass: 'rgba(170,235,205,.55)',
    you: '#FFFFFF', youHole: '#16603F', amir: '#C7552F', amirHole: '#8E3A1E', ball: '#FFFFFF', clay: '#E06B43', mint: '#7FD6AE',
  };
  const STORE = 'rally_stats';

  // Amir's numbers (The Read, 2026-10-18). They were set against bots with a person's limits in scripts/test_rally_sim.js, which
  // pre-commit guard 22 runs whenever this file changes: move one, run it. The aim is an average player at about 54% of the goals
  // (a goal is a ball through a gap), which is about 70% of the first-to-15 matches (60 to 75 asserted), a sharp one near 68% of the goals and
  // 98% of the matches (at least 85), a tired one near 50% of the goals and 50% of the matches (45 to 65), and a bot as quick as a person can be,
  // that misreads three points in ten as Amir does, still under 90%. (With every glass touch counting 2 an average player won 80% of the matches and
  // a tired one 63%, which is why `react` came down from 0.24, 0.12 when Bajada began counting played banks only.) Of these numbers `react` is the one
  // that moves the shares most; `speed` and `aim` barely do (the test's bands are too wide to catch them), so judge those two by playing.
  // A pair is [form 0, form 1]. `node scripts/test_rally_sim.js --set speed=1.2 --set react=0.2,0.1` tries a number without editing this.
  const AMIR = {
    speed: 0.95,           // top speed, in court widths a second. Fixed: nothing about him reads the score any more.
    start: 0.5,            // his form at the start of a match (0 to 1: how sharp he is)
    step: 0.2,             // how far his form moves after a point: up when you score, down when he does
    react: [0.16, 0.07],   // seconds late that he sees the ball (was 0.24, 0.12 until Bajada counted only played banks: see above)
    aim: [0.28, 0.05],     // furthest his aim point can land from where he meant it in your gap, in court widths
    read: [0.30, 0.015],   // how far off he can misjudge where a shot will cross his end, in court widths (drawn once per shot)
    late: [0.30, 0.02],    // the chance that a point starts with a mistimed read
    lateBy: 0.2,           // seconds that mistimed read adds to his reaction
    home: 0.4,             // where he waits while the ball is in your half, as a share of his half (0 = on his glass, 1 = at the net)
    guard: 0.8,            // how far up his half he steps to meet a shot, the same way
    lean: 0.25,            // waiting: how far he leans from the middle of his gap toward the ball
    lead: 0.3,             // how much of his delay he makes up by knowing which way the ball was going (0 = none, 1 = all of it)
  };
  const YOU_SPEED = 6;     // your racket's top speed, in court widths a second: it still feels instant, but it cannot jump
  function byForm(pair) { return pair[0] + (pair[1] - pair[0]) * S.form; }

  let S = null;   // the open game, or null
  // The match of this session (Full time), or null. It outlives the open game: closing the game, a rest ending and the hand-back all
  // leave it here, parked. Memory only: a reload starts fresh. { key, score, best, banked, played, over, form }.
  let M = null;
  function freshMatch(key) {
    return { key, score: { you: 0, amir: 0 }, best: 0, banked: { you: 0, amir: 0 }, played: 0, over: false, form: AMIR.start };
  }

  function loadStats() {
    try { const o = JSON.parse(localStorage.getItem(STORE) || '{}'); return { best: o.best | 0, wins: o.wins | 0, played: o.played | 0 }; }
    catch (e) { return { best: 0, wins: 0, played: 0 }; }
  }
  function saveStats(st) { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {} }

  function css() {
    if (document.getElementById('rally-css')) return;
    const st = document.createElement('style');
    st.id = 'rally-css';
    st.textContent = `
      .rally-top { position: absolute; left: 0; right: 0; top: 0; z-index: 2; display: grid; grid-template-columns: 44px 1fr 44px; align-items: center;
        column-gap: 8px; padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px; pointer-events: none; }
      .rally-top > * { pointer-events: auto; }
      .rally-clock { grid-column: 2; justify-self: center; display: inline-flex; align-items: baseline; gap: 8px; padding: 6px 14px; border-radius: 999px;
        background: rgba(0,0,0,.32); color: #fff; font: 700 12px/1 'Space Mono', monospace; letter-spacing: 1.2px; text-transform: uppercase; }
      .rally-clock b { font: 900 26px/1 'Barlow Condensed', 'AA Barlow Condensed', 'Arial Narrow', sans-serif; letter-spacing: 0; font-variant-numeric: tabular-nums; }
      .rally-clock.low { background: ${C.clay}; animation: rallyPulse 1s ease-in-out infinite; }
      @keyframes rallyPulse { 50% { transform: scale(1.06); } }
      @media (prefers-reduced-motion: reduce) { .rally-clock.low { animation: none; } }
      .rally-x { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; cursor: pointer;
        color: #fff; background: rgba(0,0,0,.32); font: 500 20px/1 'Barlow', sans-serif; grid-column: 3; }
      .rally-x:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .rally-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: none; }
      .rally-msg { position: absolute; left: 50%; top: 50%; z-index: 3; transform: translate(-50%, -50%); width: min(300px, calc(100% - 48px));
        padding: 20px 18px; border-radius: 12px; text-align: center; color: #fff; background: rgba(8,45,32,.92);
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.22), 0 18px 40px -16px rgba(0,0,0,.7); }
      .rally-msg[hidden] { display: none; }
      .rally-msg h3 { margin: 0 0 6px; font: 900 34px/1 'Barlow Condensed', 'AA Barlow Condensed', 'Arial Narrow', sans-serif; text-transform: uppercase; }
      .rally-msg p { margin: 0; font: 500 15px/1.4 'Barlow', sans-serif; color: rgba(255,255,255,.85); white-space: pre-line; }
      .rally-msg .rally-go { margin-top: 16px; min-height: 48px; width: 100%; border: 0; border-radius: 8px; cursor: pointer; color: #fff;
        background: #16603F; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.55); font: 700 17px/1 'Barlow Condensed', sans-serif;
        letter-spacing: 1px; text-transform: uppercase; }
      .rally-msg .rally-go[hidden] { display: none; }`;
    document.head.appendChild(st);
  }

  // ── Sound: two tiny Web Audio voices, made in the tap that opened the game ──
  function tone(f, dur, vol, type) {
    if (!S || !S.ac || !S.opts.sound()) return;
    try {
      const t = S.ac.currentTime, o = S.ac.createOscillator(), g = S.ac.createGain();
      o.type = type || 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(S.ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  // ── The court ──
  function sizeCourt() {
    const cv = S.cv, r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 3);
    const oldW = S.W || r.width, oldH = S.H || r.height;
    S.W = Math.max(200, r.width); S.H = Math.max(320, r.height); S.dpr = dpr;
    cv.width = Math.round(S.W * dpr); cv.height = Math.round(S.H * dpr);
    const W = S.W, H = S.H, u = Math.min(W, H * 0.6);
    S.pad = 8;                                   // the glass is drawn this far in from the edge
    S.top = 64 + (parseFloat(getComputedStyle(S.root).paddingTop) || 0);   // under the clock
    S.br = u * 0.04;                             // ball
    S.rr = u * 0.085;                            // racket head
    S.gw = W * 0.4;                              // the gap in each end wall
    S.vmax = u * 3.2;                            // ball top speed, px/s
    if (S.ball && oldW && oldH) {                // a turned phone keeps every body where it was, in proportion
      [S.ball, S.you, S.amir].forEach(b => { b.x *= W / oldW; b.y = S.top + (b.y - S.top) * (H - S.top) / (oldH - S.top); });
      S.target.x *= W / oldW; S.target.y = S.top + (S.target.y - S.top) * (H - S.top) / (oldH - S.top);
      S.hist = [];
    }
  }
  function L() { return S.pad; }
  function R() { return S.W - S.pad; }
  function T() { return S.top; }
  function B() { return S.H - S.pad - (parseFloat(getComputedStyle(S.root).paddingBottom) || 0); }
  function mid() { return (T() + B()) / 2; }

  function newBodies() {
    const cx = S.W / 2;
    S.ball = { x: cx, y: mid() + (B() - mid()) * 0.45, vx: 0, vy: 0 };
    S.you = { x: cx, y: B() - S.rr * 2.2, vx: 0, vy: 0 };
    S.amir = { x: cx, y: T() + S.rr * 2.2, vx: 0, vy: 0 };
    S.target = { x: S.you.x, y: S.you.y };
    S.trail = [];
  }

  // A serve: the ball still, in the half of whoever lost the point (the player's half to start).
  function serve(toYou) {
    const b = S.ball;
    b.x = S.W / 2 + (Math.random() - 0.5) * S.W * 0.2;
    b.y = toYou ? mid() + (B() - mid()) * 0.45 : mid() - (mid() - T()) * 0.45;
    b.vx = 0; b.vy = 0;
    S.trail = []; S.rally = 0; S.freeze = 0.7; S.lastHit = ''; S.lastHitT = -1;
    S.touch = ''; S.glass = null;   // Bajada: nobody has touched this ball yet, and it has not been off the glass since
    S.anchor = { x: b.x, y: b.y, t: S.gt };
    S.hist = []; S.striking = false; S.reading = false;   // Amir's short memory of the ball starts again with the ball
    S.late = Math.random() < byForm(AMIR.late) ? AMIR.lateBy : 0;   // this point's one mistimed read, if it has one
  }

  // Put the open game on a match: a fresh one, a parked one picked up again (resumed), or one that already reached Full time (its end
  // box again, nothing to play). S.score is the match's own object, so a point is written to the parked match as it is scored.
  function loadMatch(m, resumed) {
    S.m = m; S.score = m.score; S.best = m.best; S.form = m.form;
    S.over = !!m.over; S.rally = 0;
    newBodies();
    serve(true);
    msg(null);
    if (m.over) { S.ball.vx = S.ball.vy = 0; S.ball.y = -9999; S.hint = false; showFullTime(); return; }
    if (resumed) {                       // the serve waits 1.5 s so the banner can be read, and the first-open hint stays away
      S.hint = false; S.freeze = 1.5;
      S.banner = { text: `Play resumes · You ${m.score.you}, Amir ${m.score.amir}`, t: 0, c: C.mint, dur: 1.5 };
    }
  }
  // A fresh match for this game's session. Also the way scripts/test_rally_sim.js starts the next match (_next): Full time has no Play again.
  function newMatch() {
    M = freshMatch(S.opts && typeof S.opts.session === 'string' && S.opts.session ? S.opts.session : null);
    loadMatch(M, false);
  }

  // ── The message box (Full time, time up) ──
  function msg(m) {
    const box = S.msg;
    if (!m) { box.hidden = true; return; }
    box.querySelector('h3').textContent = m.title;
    box.querySelector('p').textContent = m.text;
    const go = box.querySelector('.rally-go');
    go.hidden = !m.button || !!S.hb; go.textContent = m.button || '';   // no button once the rest has asked for the screen back
    box.hidden = false;
  }

  // Full time: who won and by how much, the longest rally, and (when there were any) how many came off the glass. One sentence each,
  // each on its own line (the box's text is pre-line, so a sentence never breaks in the middle of "Off the glass: 3.").
  function fullTimeText(m) {
    const y = m.score.you, a = m.score.amir;
    const parts = [y > a ? `You win ${y}–${a}.` : `Amir wins ${a}–${y}.`, `Longest rally: ${m.best} ${m.best === 1 ? 'hit' : 'hits'}.`];
    if (m.banked.you > 0) parts.push(`Off the glass: ${m.banked.you}.`);
    return parts.join('\n');
  }
  // One match a session: no Play again. The button takes the athlete back to the timer (closes the game).
  function showFullTime() { msg({ title: 'Full time', text: fullTimeText(S.m), button: 'Back to the timer' }); }

  // The best rally goes to this phone's stats whenever the game stops being the screen (Full time, time up, the hand-back, closing it),
  // because the match it came from can be parked for a whole workout.
  function saveBest() {
    if (!S || S.mode === 'lob' || !(S.best > 0)) return;   // The Lob has no match, no best: close() reaches here too
    S.m.best = Math.max(S.m.best, S.best);
    const st = loadStats();
    if (S.best > st.best) { st.best = S.best; saveStats(st); }
  }

  function endMatch() {
    const m = S.m;
    S.over = true; m.over = true; m.best = S.best; m.form = S.form;
    const st = loadStats();
    st.played += 1;                     // a match is played and won at Full time only: a hand-back or time up parks it
    const won = m.score.you > m.score.amir;
    if (won) st.wins += 1;
    if (S.best > st.best) st.best = S.best;
    saveStats(st);
    if (won) { burst(S.W / 2, mid(), 60, true); tone(660, 0.15, 0.25); setTimeout(() => tone(990, 0.3, 0.25), 140); buzz([20, 40, 20]); }
    showFullTime();
  }

  // ── Physics ──
  function speed(b) { return Math.hypot(b.vx, b.vy); }
  function capBall() {
    const b = S.ball, s = speed(b);
    if (s > S.vmax) { b.vx *= S.vmax / s; b.vy *= S.vmax / s; }
  }

  // The ball against a racket (a circle that moves): bounce off the moving surface, keep some of the racket's speed.
  function hitRacket(m, who) {
    const b = S.ball, dx = b.x - m.x, dy = b.y - m.y, d = Math.hypot(dx, dy), min = S.br + S.rr;
    if (d >= min || d === 0) return;
    const nx = dx / d, ny = dy / d;
    b.x = m.x + nx * min; b.y = m.y + ny * min;
    const rvx = b.vx - m.vx, rvy = b.vy - m.vy, dot = rvx * nx + rvy * ny;
    if (dot < 0) {
      b.vx -= 1.9 * dot * nx; b.vy -= 1.9 * dot * ny;
      capBall();
      const s = speed(b);
      S.touch = who; S.glass = null;   // Bajada: this racket touched it last, and whatever glass it hit before no longer counts
      // A ball squeezed between two rackets (or a racket and the glass) touches them every substep and goes nowhere. Such
      // a ball (still inside its 2-ball circle after 0.3 s) counts no hit and makes no sound or buzz, and otherwise a hit
      // counts in the rally only 0.12 s after the last one and rings 0.09 s apart per racket, or a trapped ball would buzz
      // the phone nonstop and run the rally into the thousands (found 2026-10-18).
      const jam = S.gt - S.anchor.t > 0.3;
      if (!jam && S.lastHit !== who && S.gt - S.lastHitT > 0.12) { S.rally += 1; S.best = Math.max(S.best, S.rally); S.lastHit = who; S.lastHitT = S.gt; }
      if (!jam && S.gt - (S.fxT[who] || -1) > 0.09) {
        S.fxT[who] = S.gt;
        S.flash.push({ x: b.x, y: b.y, t: 0, c: who === 'you' ? C.mint : C.clay });
        tone(320 + Math.min(1, s / S.vmax) * 520, 0.06, 0.18);
        if (who === 'you') buzz(s > S.vmax * 0.7 ? 18 : 8);
        if (s > S.vmax * 0.8) S.shake = Math.max(S.shake, 4);
      }
    }
  }

  // A goalpost: the end of the glass beside the gap, a point the ball bounces off.
  function hitPost(px, py) {
    const b = S.ball, dx = b.x - px, dy = b.y - py, d = Math.hypot(dx, dy);
    if (d >= S.br || d === 0) return;
    const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
    b.x = px + nx * S.br; b.y = py + ny * S.br;
    if (dot < 0) { b.vx -= 1.85 * dot * nx; b.vy -= 1.85 * dot * ny; tone(1200, 0.04, 0.1, 'sine'); }
  }

  // The pane of glass a hit touched, as the line to light up if the goal that follows counts double: a side wall is three panes, and
  // each end wall has one pane either side of the gap.
  function paneAt(kind, b) {
    const l = L(), r = R(), t = T(), bt = B(), g1 = S.W / 2 - S.gw / 2, g2 = S.W / 2 + S.gw / 2;
    if (kind === 'L' || kind === 'R') {
      const x = kind === 'L' ? l : r, third = (bt - t) / 3, i = Math.max(0, Math.min(2, Math.floor((b.y - t) / third)));
      return { x1: x, y1: t + i * third, x2: x, y2: t + (i + 1) * third };
    }
    const y = kind[0] === 'T' ? t : bt;
    return kind[1] === 'L' ? { x1: l, y1: y, x2: g1, y2: y } : { x1: g2, y1: y, x2: r, y2: y };
  }

  // Bajada: is a glass touch at height y close enough to `who`'s own end to be a played bank? (BANK_REACH; you shoot up from the bottom
  // end, Amir down from the top.)
  function playedBank(who, y) {
    const run = who === 'you' ? B() - y : y - T();   // how far up the court from the shooter's end wall
    return run <= (B() - T()) * BANK_REACH;
  }

  function walls() {
    const b = S.ball, r = S.br, g1 = S.W / 2 - S.gw / 2, g2 = S.W / 2 + S.gw / 2, e = 0.9;
    const arrive = speed(b);   // how fast it comes at the glass (Bajada: a bank needs more than BANK_MIN of the top speed)
    let glass = false, pane = null;
    if (b.x < L() + r) { b.x = L() + r; b.vx = Math.abs(b.vx) * e; glass = true; pane = paneAt('L', b); }
    if (b.x > R() - r) { b.x = R() - r; b.vx = -Math.abs(b.vx) * e; glass = true; pane = paneAt('R', b); }
    const inGap = b.x > g1 && b.x < g2;
    if (!inGap) {
      if (b.y < T() + r) { b.y = T() + r; b.vy = Math.abs(b.vy) * e; glass = true; pane = paneAt(b.x < S.W / 2 ? 'TL' : 'TR', b); }
      if (b.y > B() - r) { b.y = B() - r; b.vy = -Math.abs(b.vy) * e; glass = true; pane = paneAt(b.x < S.W / 2 ? 'BL' : 'BR', b); }
    }
    [[g1, T()], [g2, T()], [g1, B()], [g2, B()]].forEach(p => hitPost(p[0], p[1]));   // a post is not glass: it never makes a bank
    if (glass && speed(b) > S.vmax * 0.15) tone(180, 0.05, 0.12, 'sine');
    // Bajada: the glass, after a racket's last touch and at speed. The last such touch decides: within BANK_REACH of the court from that
    // racket's own end it is a played bank (its pane lights if the goal counts 2), nearer the goal it is a clip and takes any earlier bank back.
    // A slower touch changes nothing, and takes nothing back.
    if (glass && S.touch && arrive > S.vmax * BANK_MIN) S.glass = playedBank(S.touch, b.y) ? pane : null;
    // through the gap: a point
    if (b.y < T() - r * 1.5) point('you');
    else if (b.y > B() + r * 1.5) point('amir');
  }

  function point(who) {
    const m = S.m, top = who === 'you';
    // Bajada: the scorer's own racket touched it last, the glass came after that and the ball went through the OTHER side's gap.
    // (A ball off the glass into your own gap is the other side's goal for 1, as it always was.)
    const bank = !!S.glass && S.touch === who;
    S.score[who] += bank ? 2 : 1;
    if (bank) { m.banked[who] += 1; S.lit = Object.assign({ t: 0 }, S.glass); }
    burst(S.W / 2, top ? T() : B(), bank ? 48 : 34, false);
    S.shake = 10;
    if (top) { tone(523, 0.12, 0.22); setTimeout(() => tone(784, 0.2, 0.22), 110); buzz([15, 30, 15]); }
    else { tone(220, 0.25, 0.2, 'sawtooth'); buzz(40); }
    if (bank) {
      setTimeout(() => tone(top ? 1047 : 330, 0.2, 0.2, top ? 'triangle' : 'sawtooth'), 230);
      S.banner = { text: top ? 'Off the glass +2' : 'Amir off the glass +2', t: 0, c: top ? C.mint : C.clay };
    } else S.banner = { text: top ? 'Point!' : 'Amir scores', t: 0, c: top ? C.mint : C.clay };
    // Full time: first to WIN_AT, or, once the play budget is used up, the next point that leaves someone ahead
    if (S.score[who] >= WIN_AT || (m.played >= PLAY_CAP_S && S.score.you !== S.score.amir)) { S.ball.vx = S.ball.vy = 0; S.ball.y = -9999; endMatch(); lastPointIn(); return; }
    // Amir's form changes here and nowhere else: a step sharper after your point, a step softer after his
    S.form = Math.max(0, Math.min(1, S.form + (top ? AMIR.step : -AMIR.step)));
    m.form = S.form;   // the parked match keeps how sharp he was
    if (lastPointIn()) return;   // Serve Clock: that was the last point of this rest, nobody serves again
    serve(!top);   // the one who lost the point serves
  }

  // ── Serve Clock (idea #39): the rest hands the screen back ──
  // The last point is in (or no point was in play): serve nothing more and let it show for 0.8 s, then hand the screen back.
  function lastPointIn() {
    const hb = S.hb;
    if (!hb || hb.fired) return false;
    S.over = true; S.ball.vx = S.ball.vy = 0; S.ball.y = -9999;   // the court stops: no serve, no auto-serve, no more points
    hb.timers.push(setTimeout(hb.finish, 800));
    return true;
  }

  // ── Amir's racket: The Read (2026-10-18) ──
  // The first version chased the ball's current spot at a speed that rose and fell with the score, and a bot that only followed
  // the ball won 58 of 58 points. Now his speed is fixed and he plays like a person:
  //   · he sees the ball as it was `react` seconds ago (S.hist), so a quick hit or a bounce off the glass is news to him a moment
  //     late; in smooth flight he knows where it is going and makes up part of that delay (AMIR.lead);
  //   · a ball heading for his end: he works out where it will cross his guard line, off the side glass too, misjudges it a little
  //     (drawn once per shot) and walks there;
  //   · a ball in his half that is slow or going away: he strikes it toward the biggest hole beside your racket in your gap (as he
  //     last saw it), from an aim point that lands a little off (drawn once per strike, never every frame, so he looks calm and
  //     not twitchy);
  //   · while your half has the ball he waits at `home` and leans toward it; to meet a shot he steps up to `guard`;
  //   · now and then a point starts with a mistimed read (S.late): a fifth of a second more on top of his reaction.
  // His form (S.form) sets the reaction, the aim and read errors and the chance of a mistimed read, and moves only between points.
  function snap() { const b = S.ball; return { t: S.gt, x: b.x, y: b.y, vx: b.vx, vy: b.vy, px: S.you.x }; }
  function seenBall() {
    const h = S.hist, t = S.gt - byForm(AMIR.react) - S.late;
    let b = h.length ? h[0] : snap();
    for (let i = h.length - 1; i >= 0; i--) if (h[i].t <= t) { b = h[i]; break; }
    // A person follows a ball in smooth flight and is only late to a change: a hit, or a bounce off the glass. So the old
    // sighting is carried on along its own line (folded off the side glass) for `lead` of the time since.
    const ahead = Math.max(0, S.gt - b.t) * AMIR.lead;
    if (!ahead || (!b.vx && !b.vy)) return b;   // nothing yet to look ahead from, or a ball at rest
    const lo = L() + S.br, w = R() - S.br - lo;
    let x = ((b.x + b.vx * ahead - lo) % (2 * w) + 2 * w) % (2 * w);
    return { t: b.t, x: lo + (x <= w ? x : 2 * w - x), y: Math.max(T(), Math.min(B(), b.y + b.vy * ahead)), vx: b.vx, vy: b.vy, px: b.px };
  }
  // Known, left as it is: seenBall() folds the sighting's x off the side glass but keeps its old vx, so on the (8% of) frames where the
  // look-ahead crosses a glass his crossX() leans the wrong way, by 57 px at the 90th percentile of those. Flipping vx there is right. With the
  // numbers of the first tuning it moved the shares enough to break "sharp > average > tired" (average 57.3 to 54.7%, tired 50.8 to 55.0%); with
  // the 2026-10-18 retune it does not (24 seeds: average 54.3 to 54.0%, tired 50.1 to 50.4%, sharp 67.4 to 67.8%), so it can be fixed on its own
  // with scripts/test_rally_sim.js and a playthrough by Amir.
  // Where a ball heading up the court will cross the line y, bouncing off the side glass on the way.
  function crossX(b, y) {
    const lo = L() + S.br, w = R() - S.br - lo;
    let x = b.x + (b.vx / -b.vy) * Math.max(0, b.y - y);
    x = ((x - lo) % (2 * w) + 2 * w) % (2 * w);
    return lo + (x <= w ? x : 2 * w - x);
  }
  function rollRead() {   // two dice, so a small miss is more likely than a big one
    return (Math.random() + Math.random() - 1) * S.W * byForm(AMIR.read);
  }
  // Where in your gap he shoots: the middle of the biggest hole beside your racket, as he saw it (a racket parked in the middle
  // leaves two slivers at the posts; a racket in a corner leaves the whole gap, so he shoots at its middle).
  function holeX(px) {
    const half = S.gw / 2 - S.br, reach = S.rr + S.br, rel = px - S.W / 2;
    const lt = Math.min(half, rel - reach), rf = Math.max(-half, rel + reach);   // the left hole is -half to lt, the right one rf to half
    const lw = lt + half, rw = half - rf;                         // their widths in pixels
    if (lw <= 0 && rw <= 0) return 0;                             // your racket covers it all: the middle
    const lm = (lt - half) / 2, rm = (rf + half) / 2;             // the middle of each hole
    if (Math.abs(lw - rw) < 4) return S.coin < 0 ? lm : rm;       // as good a hole on either side: toss for it
    return lw > rw ? lm : rm;
  }
  function rollAim() {
    const a = Math.random() * Math.PI * 2, r = S.W * byForm(AMIR.aim) * Math.sqrt(Math.random());
    return { x: Math.cos(a) * r, y: Math.sin(a) * r };
  }
  function amirMove(dt) {
    const m = S.amir, W = S.W, rr = S.rr, pb = seenBall();
    const lo = T() + rr, hi = mid() - rr, gy = T() + (mid() - T()) * AMIR.guard, hy = T() + (mid() - T()) * AMIR.home;
    const toward = pb.vy < -S.vmax * 0.3, awayFast = pb.vy > S.vmax * 0.3;   // clearly coming at his end, clearly leaving it
    let tx, ty, striking = false;
    if (toward) {                               // stand where it will cross his guard line (a hit during the serve pause counts)
      if (!S.reading) S.miss = rollRead();      // his misjudgement is fixed for the shot, not redrawn every frame
      tx = crossX(pb, gy) + S.miss; ty = gy;
    } else if (!S.freeze && pb.y < mid() && !awayFast) {   // the pause only holds him back from his own serve
      striking = true;                          // in his half, slow or going away: hit it toward your gap
      if (!S.striking) { S.aim = rollAim(); S.coin = Math.random() < 0.5 ? -1 : 1; }
      if (pb.y < m.y - rr * 0.5) {              // the ball got behind him: go round it, never push it into his own gap
        tx = pb.x + (pb.x < W / 2 ? 1 : -1) * rr * 2.2; ty = pb.y - rr * 1.2;
      } else {                                  // strike: aim just behind the ball, toward the aim point
        const ax = W / 2 + holeX(pb.px) + S.aim.x - pb.x, ay = B() + S.aim.y - pb.y, al = Math.hypot(ax, ay) || 1;
        tx = pb.x - (ax / al) * rr * 0.6; ty = pb.y - (ay / al) * rr * 0.6;
        if (Math.hypot(pb.vx, pb.vy) < S.vmax * 0.1) { tx += (ax / al) * rr * 1.6; ty += (ay / al) * rr * 1.6; }   // a still ball: go through it
      }
    } else {                                    // guard: between the ball and his gap
      tx = W / 2 + (pb.x - W / 2) * AMIR.lean; ty = hy;
    }
    S.striking = striking; S.reading = toward;
    tx = Math.max(L() + rr, Math.min(R() - rr, tx)); ty = Math.max(lo, Math.min(hi, ty));
    let dx = tx - m.x, dy = ty - m.y; const d = Math.hypot(dx, dy), stepMax = AMIR.speed * W * dt;
    if (d > stepMax) { dx *= stepMax / d; dy *= stepMax / d; }
    return { dx, dy };
  }

  // Your racket follows your finger at up to YOU_SPEED court widths a second: quick enough that a normal drag feels instant,
  // but it never jumps across the court in one frame, so a tap on the far side is a sprint and not a teleport.
  function youMove(dt) {
    const m = S.you, t = S.target;
    const tx = Math.max(L() + S.rr, Math.min(R() - S.rr, t.x));
    const ty = Math.max(mid() + S.rr, Math.min(B() - S.rr, t.y));
    let dx = tx - m.x, dy = ty - m.y; const d = Math.hypot(dx, dy), cap = YOU_SPEED * S.W * dt;
    if (d > cap) { dx *= cap / d; dy *= cap / d; }
    return { dx, dy };
  }

  function step(dt) {
    if (S.freeze > 0) S.freeze = Math.max(0, S.freeze - dt);
    const ym = youMove(dt), am = amirMove(dt);
    // Substeps so a fast racket or ball never passes through the other.
    const travel = Math.max(Math.hypot(ym.dx, ym.dy), Math.hypot(am.dx, am.dy), speed(S.ball) * dt);
    const n = Math.min(12, Math.max(1, Math.ceil(travel / (S.br * 0.8))));
    const h = dt / n;
    S.you.vx = ym.dx / dt; S.you.vy = ym.dy / dt;
    S.amir.vx = am.dx / dt; S.amir.vy = am.dy / dt;
    for (let i = 0; i < n; i++) {
      S.you.x += ym.dx / n; S.you.y += ym.dy / n;
      S.amir.x += am.dx / n; S.amir.y += am.dy / n;
      if (!S.over) {
        const b = S.ball;
        b.x += b.vx * h; b.y += b.vy * h;
        hitRacket(S.you, 'you'); hitRacket(S.amir, 'amir');
        walls();
        if (S.over) break;
      }
    }
    const drag = Math.pow(0.8, dt);   // the court is a little slow: a ball left alone settles in a few seconds
    S.ball.vx *= drag; S.ball.vy *= drag;
    // A ball that goes nowhere for 3 s is served to the other half, so the court never sits still: one that died (tucked
    // behind Amir, left alone by a player who is only resting) and one trapped and shaking between the two rackets at the
    // net or against the glass, which moves fast and goes nowhere (so this watches where the ball is, not its speed).
    S.gt += dt;
    if (S.over || S.freeze || Math.hypot(S.ball.x - S.anchor.x, S.ball.y - S.anchor.y) > S.br * 2) {
      S.anchor.x = S.ball.x; S.anchor.y = S.ball.y; S.anchor.t = S.gt;
    } else if (S.gt - S.anchor.t > 3) serve(S.ball.y < mid());
    if (!S.over) {
      S.trail.push({ x: S.ball.x, y: S.ball.y }); if (S.trail.length > 10) S.trail.shift();
      const h = S.hist;   // what Amir can look back on: the ball's last 0.6 s (more if his reaction plus a mistimed read is longer), and where your racket was
      h.push(snap());
      const keep = Math.max(0.6, Math.max(AMIR.react[0], AMIR.react[1]) + AMIR.lateBy + 0.15);
      while (h.length > 2 && h[1].t < S.gt - keep) h.shift();
    }
  }

  // ── Effects ──
  function burst(x, y, n, confetti) {
    const cols = confetti ? [C.mint, C.clay, '#fff', '#3E6A92'] : [C.clay, '#fff'];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = (confetti ? 120 : 80) + Math.random() * 260;
      S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (confetti ? 120 : 0), life: 0.8 + Math.random() * 0.7, t: 0,
        c: cols[i % cols.length], sz: 2 + Math.random() * (confetti ? 4 : 3), sq: confetti && i % 2 === 0 });
    }
  }
  function tickFx(dt) {
    S.parts = S.parts.filter(p => (p.t += dt) < p.life);
    S.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 0.98; });
    S.flash = S.flash.filter(f => (f.t += dt) < 0.3);
    if (S.lit && (S.lit.t += dt) > LIT_S) S.lit = null;   // Bajada: the pane that made the goal count double glows mint for a third of a second
    if (S.banner) { S.banner.t += dt; if (S.banner.hold) S.banner.t = Math.min(S.banner.t, 0.5); else if (S.banner.t > (S.banner.dur || 1.1)) S.banner = null; }   // a held banner ("Last point.") stays until the next one replaces it
    S.shake = S.reduce ? 0 : Math.max(0, S.shake - dt * 40);
  }

  // ── Drawing ──
  function racket(m, face, hole, up) {
    const g = S.g, r = S.rr;
    g.save(); g.translate(m.x, m.y);
    // handle, toward its owner's end
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(-r * 0.16, up ? -r * 1.75 : r * 0.75, r * 0.32, r);
    g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 4;
    g.fillStyle = face; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'transparent';
    g.fillStyle = hole;                       // a padel racket's holes
    const hr = r * 0.075;
    for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) {
      const px = xx * r * 0.3 + (yy % 2 ? r * 0.15 : 0), py = yy * r * 0.28;
      if (Math.hypot(px, py) < r * 0.72) { g.beginPath(); g.arc(px, py, hr, 0, Math.PI * 2); g.fill(); }
    }
    g.lineWidth = r * 0.1; g.strokeStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.arc(0, 0, r * 0.95, 0, Math.PI * 2); g.stroke();
    g.restore();
  }

  function draw() {
    const g = S.g, W = S.W, H = S.H, dpr = S.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = S.shake ? (Math.random() - 0.5) * S.shake : 0, sy = S.shake ? (Math.random() - 0.5) * S.shake : 0;
    g.translate(sx, sy);
    // turf
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.court); bg.addColorStop(0.5, '#105239'); bg.addColorStop(1, C.court);
    g.fillStyle = C.courtDeep; g.fillRect(-20, -20, W + 40, H + 40);
    g.fillStyle = bg; g.fillRect(L(), T(), R() - L(), B() - T());
    // lines: the net across the middle, a service line in each half, the centre line
    g.strokeStyle = C.line; g.lineWidth = 2;
    const q = (B() - T()) * 0.2;
    g.beginPath();
    g.moveTo(L(), mid() - q * 1.4); g.lineTo(R(), mid() - q * 1.4);
    g.moveTo(L(), mid() + q * 1.4); g.lineTo(R(), mid() + q * 1.4);
    g.moveTo(W / 2, mid() - q * 1.4); g.lineTo(W / 2, mid() + q * 1.4);
    g.stroke();
    g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(L(), mid()); g.lineTo(R(), mid()); g.stroke(); g.setLineDash([]);
    // the score, big and quiet, in each half
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `900 ${Math.round(W * 0.34)}px 'Barlow Condensed', 'AA Barlow Condensed', 'Arial Narrow', sans-serif`;
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.fillText(String(S.score.amir), W / 2, mid() - (mid() - T()) * 0.5);
    g.fillText(String(S.score.you), W / 2, mid() + (B() - mid()) * 0.5);
    g.font = `700 11px 'Space Mono', monospace`; g.fillStyle = 'rgba(255,255,255,.45)';
    g.textAlign = 'left';
    g.fillText('AMIR', L() + 10, mid() - 14);
    g.fillText('YOU', L() + 10, mid() + 14);
    g.textAlign = 'right';
    if (S.rally > 1) g.fillText(`RALLY ${S.rally}`, R() - 10, mid() + 14);
    // the glass, with a gap at each end
    const g1 = W / 2 - S.gw / 2, g2 = W / 2 + S.gw / 2;
    g.strokeStyle = C.glass; g.lineWidth = 4; g.lineCap = 'round';
    g.shadowColor = C.mint; g.shadowBlur = 8;
    g.beginPath();
    g.moveTo(g1, T()); g.lineTo(L(), T()); g.lineTo(L(), B()); g.lineTo(g1, B());
    g.moveTo(g2, T()); g.lineTo(R(), T()); g.lineTo(R(), B()); g.lineTo(g2, B());
    g.stroke(); g.shadowBlur = 0;
    g.fillStyle = 'rgba(0,0,0,.35)';
    g.fillRect(g1, T() - 6, S.gw, 6); g.fillRect(g1, B(), S.gw, 6);
    // Bajada: the pane the ball banked off lights up mint, fading out over LIT_S
    if (S.lit) {
      g.globalAlpha = Math.max(0, 1 - S.lit.t / LIT_S); g.strokeStyle = C.mint; g.lineWidth = 8; g.lineCap = 'round';
      g.shadowColor = C.mint; g.shadowBlur = 18;
      g.beginPath(); g.moveTo(S.lit.x1, S.lit.y1); g.lineTo(S.lit.x2, S.lit.y2); g.stroke();
      g.shadowBlur = 0; g.globalAlpha = 1;
    }
    // hit rings
    S.flash.forEach(f => {
      g.strokeStyle = f.c; g.globalAlpha = 1 - f.t / 0.3; g.lineWidth = 3;
      g.beginPath(); g.arc(f.x, f.y, S.br + f.t * 120, 0, Math.PI * 2); g.stroke();
    });
    g.globalAlpha = 1;
    // rackets
    racket(S.amir, C.amir, C.amirHole, true);
    racket(S.you, C.you, C.youHole, false);
    // the ball and its trail
    if (!S.over) {
      S.trail.forEach((p, i) => {
        g.globalAlpha = (i / S.trail.length) * 0.35; g.fillStyle = C.ball;
        g.beginPath(); g.arc(p.x, p.y, S.br * (0.4 + 0.6 * i / S.trail.length), 0, Math.PI * 2); g.fill();
      });
      g.globalAlpha = S.freeze > 0 ? 0.5 + 0.5 * Math.abs(Math.sin(S.freeze * 9)) : 1;
      g.shadowColor = 'rgba(255,255,255,.8)'; g.shadowBlur = speed(S.ball) > S.vmax * 0.6 ? 16 : 6;
      g.fillStyle = C.ball; g.beginPath(); g.arc(S.ball.x, S.ball.y, S.br, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.strokeStyle = 'rgba(14,74,54,.45)'; g.lineWidth = 1.5;   // the seam
      g.beginPath(); g.arc(S.ball.x - S.br * 0.9, S.ball.y, S.br * 0.75, -0.9, 0.9); g.stroke();
      g.beginPath(); g.arc(S.ball.x + S.br * 0.9, S.ball.y, S.br * 0.75, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
      g.globalAlpha = 1;
    }
    // particles
    S.parts.forEach(p => {
      g.globalAlpha = Math.max(0, 1 - p.t / p.life); g.fillStyle = p.c;
      if (p.sq) g.fillRect(p.x, p.y, p.sz * 1.6, p.sz);
      else { g.beginPath(); g.arc(p.x, p.y, p.sz, 0, Math.PI * 2); g.fill(); }
    });
    g.globalAlpha = 1;
    // the point banner
    if (S.banner && !(S.m && S.m.over)) {   // not behind the Full time box: the last point's banner would show round its edges
      const t = S.banner.t, d = S.banner.dur || 1.1, a = t < 0.15 ? t / 0.15 : t > d - 0.3 ? Math.max(0, 1 - (t - (d - 0.3)) / 0.3) : 1;
      g.globalAlpha = a; g.fillStyle = S.banner.c; g.textAlign = 'center';
      const word = S.banner.text.toUpperCase(), fam = `'Barlow Condensed', 'AA Barlow Condensed', 'Arial Narrow', sans-serif`;
      g.font = `900 ${Math.round(W * 0.13)}px ${fam}`;
      // a long banner ("Amir off the glass +2", "Play resumes · You 6, Amir 4") shrinks to fit the court's width, never under 22 px
      const wide = g.measureText(word).width, room = W - 28;
      if (wide > room) g.font = `900 ${Math.max(22, Math.floor(W * 0.13 * room / wide))}px ${fam}`;
      g.fillText(word, W / 2, mid() - 40);
      g.globalAlpha = 1;
    }
    // the first serve's hint
    if (S.hint) {
      g.fillStyle = 'rgba(255,255,255,.8)'; g.textAlign = 'center';
      const lines = ['Drag in your half. Hit it through Amir\'s gap.', `First to ${WIN_AT}. The match waits for your next rest.`];
      g.font = `600 15px 'Barlow', sans-serif`;
      const wide = Math.max(g.measureText(lines[0]).width, g.measureText(lines[1]).width), room = W - 24;
      if (wide > room) g.font = `600 ${Math.max(12, Math.floor(15 * room / wide))}px 'Barlow', sans-serif`;   // a narrow phone: smaller, never under 12 px
      g.fillText(lines[0], W / 2, B() - S.rr * 4.2);
      g.fillText(lines[1], W / 2, B() - S.rr * 4.2 + 22);
    }
  }

  // ── The rest clock ──
  function paintClock() {
    const left = S.opts.left();
    const el = S.clock;
    if (S.timeUp) return;
    if (left == null) { el.querySelector('b').textContent = '—'; el.querySelector('span').textContent = 'Rest paused'; el.classList.remove('low'); return; }
    const txt = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (el._t !== txt) { el._t = txt; el.querySelector('b').textContent = txt; el.querySelector('span').textContent = 'Rest'; }
    el.classList.toggle('low', left <= 10);
    if (left <= 3 && left > 0 && S._lastCount !== left) { S._lastCount = left; buzz(12); tone(880, 0.07, 0.15, 'sine'); }
  }

  // One frame of the game. `dt` moves the court (never more than 1/30 s, so a hiccup cannot throw the ball through a wall); `wall` is the
  // wall-clock time that passed (never more than 0.25 s, so a page that was asleep adds a quarter of a second, not the minutes it was
  // away) and is what the play budget (PLAY_CAP_S) counts: only while a point is live, not in the serve pause, the end box, a paused
  // rest, the hand-back or after time up.
  function advance(dt, wall) {
    const live = !S.over && !S.timeUp && !S.hb && !(S.freeze > 0) && S.opts.left() != null;
    if (!S.timeUp && dt > 0) step(dt);
    if (live && wall > 0) S.m.played += Math.min(0.25, wall);
    tickFx(dt);
  }

  function frame(now) {
    if (!S) return;
    S.raf = requestAnimationFrame(frame);
    const raw = Math.max(0, (now - (S.last || now)) / 1000), dt = Math.min(1 / 30, raw);
    S.last = now;
    advance(dt, raw);
    draw();
    paintClock();
  }

  // ── Input: one finger (or the mouse) in your half ──
  function toCourt(e) {
    const r = S.cv.getBoundingClientRect();
    const lift = e.pointerType === 'touch' || e.pointerType === 'pen' ? S.rr * 1.4 : 0;   // the racket sits above the thumb
    return { x: e.clientX - r.left, y: e.clientY - r.top - lift };
  }
  function onDown(e) {
    if (!S || S.timeUp) return;
    e.preventDefault();
    try { S.cv.setPointerCapture(e.pointerId); } catch (x) {}
    S.pid = e.pointerId;
    S.hint = false;
    const p = toCourt(e); S.target.x = p.x; S.target.y = p.y;
  }
  function onMove(e) {
    if (!S || S.timeUp) return;
    if (e.pointerType !== 'mouse' && S.pid !== e.pointerId) return;
    e.preventDefault();
    const p = toCourt(e); S.target.x = p.x; S.target.y = p.y;
    if (e.pointerType === 'mouse') S.hint = false;
  }
  function onUp(e) { if (S && S.pid === e.pointerId) S.pid = null; }

  function open(opts) {
    if (opts && opts.mode === 'lob') return openLob(opts);   // The Lob: a calm mode of this file, below (no match, no rackets)
    if (S) close(true);
    css();
    const root = opts.root;
    root.innerHTML =
      `<canvas class="rally-cv" aria-label="Off the Glass: drag in the bottom half to move your racket"></canvas>
       <div class="rally-top">
         <div class="rally-clock" role="timer" aria-live="off"><span>Rest</span><b>0:00</b></div>
         <button type="button" class="rally-x" aria-label="Back to the rest timer">✕</button>
       </div>
       <div class="rally-msg" role="status" hidden><h3></h3><p></p><button type="button" class="rally-go" hidden></button></div>`;
    S = {
      opts, root, cv: root.querySelector('canvas'), clock: root.querySelector('.rally-clock'), msg: root.querySelector('.rally-msg'),
      parts: [], flash: [], shake: 0, banner: null, hint: true, timeUp: false, pid: null, raf: 0, last: 0,
      gt: 0, fxT: {}, lastHitT: -1, anchor: { x: 0, y: 0, t: 0 }, lit: null, touch: '', glass: null,
      reduce: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
      score: { you: 0, amir: 0 },
    };
    // Full time: the same session key as the parked match picks it up again; a different one (or none) starts a fresh match. A match
    // that is already over is shown again (its end box), not replayed: one match a session.
    const key = typeof opts.session === 'string' && opts.session ? opts.session : null;
    const same = !!(M && key !== null && M.key === key);
    if (!same) M = freshMatch(key);
    S.g = S.cv.getContext('2d');
    // The page's own audio context (opened in the tap on Play, which iPhone needs); a page with none gets ours.
    try {
      S.ac = opts.audio && opts.audio();
      if (!S.ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) { S.ac = new A(); S.ownAc = true; } }
      if (S.ac && S.ac.state === 'suspended') S.ac.resume();
    } catch (e) {}
    root.querySelector('.rally-x').addEventListener('click', () => close());
    S.msg.querySelector('.rally-go').addEventListener('click', e => { e.stopPropagation(); if (S && !S.timeUp && !S.hb) close(); });   // Full time's button: back to the timer
    S.cv.addEventListener('pointerdown', onDown);
    S.cv.addEventListener('pointermove', onMove);
    S.cv.addEventListener('pointerup', onUp);
    S.cv.addEventListener('pointercancel', onUp);
    root.classList.add('visible');
    S.onResize = () => { if (S) sizeCourt(); };
    window.addEventListener('resize', S.onResize);
    sizeCourt();
    loadMatch(M, same && !M.over && M.score.you + M.score.amir > 0);   // a match with no point played yet is not "resumed": it opens like a new one, hint and all
    S.raf = requestAnimationFrame(frame);
  }

  // The rest is over: freeze the court and say so. program.html closes the layer a moment later (closeTimer()).
  function timeUp() {
    if (!S || S.timeUp) return;
    S.timeUp = true;
    S.clock.classList.remove('low');
    S.clock.querySelector('b').textContent = '0:00';
    S.clock.querySelector('span').textContent = 'Rest';
    saveBest();   // the match is parked, not ended: it waits for the next rest
    msg({ title: 'Time. Next set.', text: S.over ? 'Back to work.' : `You ${S.score.you}, Amir ${S.score.amir}. Back to work.`, button: '' });
  }

  // Serve Clock (idea #39, Amir 2026-10-18 "go with your picks"): with 25 s left the last seconds of the rest belong to the next set, so
  // program.html asks the game to wind down and closes it when done() is called. A point in play is let finish (nothing is served after
  // it); with no point in play (the serve freeze, a ball that died, a match that is over) done() comes after 0.6 s; never later than 6 s.
  function handBack(done) {
    if (!S) { if (done) done(); return; }
    if (S.hb) return;                              // asked already: the first done() stands
    const s = S;
    const live = !s.over && !s.timeUp && !s.freeze && speed(s.ball) >= s.vmax * 0.1;
    const hb = s.hb = { fired: false, timers: [] };
    hb.finish = () => {
      if (hb.fired) return;
      hb.fired = true;
      hb.timers.forEach(clearTimeout);
      if (S === s) {
        s.over = true;                             // after done() the court never serves again, whatever the caller does next (the MATCH is only parked)
        saveBest();                                // the best rally of a match cut short counts, as it does when time runs out
      }
      if (done) { try { done(); } catch (e) {} }
    };
    s.banner = { text: 'Last point.', t: 0, c: C.mint, hold: true };
    s.msg.querySelector('.rally-go').hidden = true;
    hb.timers.push(setTimeout(hb.finish, 6000));   // the hard deadline
    if (!live) hb.timers.push(setTimeout(hb.finish, 600));
  }

  function close(quiet) {
    if (!S) return;
    saveBest();   // closing parks the match; its best rally is not lost with the screen
    const s = S; S = null;
    if (s.hb) s.hb.timers.forEach(clearTimeout);
    cancelAnimationFrame(s.raf);
    window.removeEventListener('resize', s.onResize);
    try { if (s.ac && s.ownAc) s.ac.close(); } catch (e) {}
    s.root.classList.remove('visible');
    s.root.innerHTML = '';
    if (s.mode === 'lob') s.root.setAttribute('aria-label', s.label0);   // The Lob named the layer for a screen reader; it goes back to the game's name
    if (!quiet && s.opts.onClose) s.opts.onClose();
  }

  // ── The Lob (idea #44 of the Rest in Play round, Amir 2026-10-18 "go with your picks"): a calm mode of this file ──
  // Not a game: the shelf's fourth row, for a rest when you would rather breathe than play. On the dimmed court a soft white ball grows for 4 s
  // (breathe in) and shrinks for 6 s (breathe out), eased, until the rest says stop. Seen from above, a ball that rises looks bigger and its shadow
  // slides away from it, so "in as it rises, out as it falls" is what the screen does. No score, no rackets, no counts, no hold, no number but the
  // rest clock, and no health claim anywhere on it.
  // It is a MODE of Rally, so every hook program.html already has works with no change (the clock, ✕, Back, timeUp, handBack, closeRestGames):
  // Rally.open({ ..., mode: 'lob' }) leaves S.mode === 'lob' and none of the match's fields (no score, ball or rackets), so nothing here can touch a
  // match. While it is open Rally.timeUp(), .handBack() and ._tick() route to the functions below; close() is shared (S has the raf, onResize, ac,
  // ownAc, root, opts and hb.timers it reads, and it puts the layer's name back). `lob_seen` (no athlete prefix, never synced) holds that the
  // one-time line has been shown on this phone.
  // PROGRAM-APP.md → Off the Glass → The Lob. Test: node scripts/headless/lob.js.
  const LOB = {
    inS: 4, outS: 6,        // seconds breathing in (the ball grows) and out (it shrinks)
    rest: 0.36,             // the ball's resting size, as a share of its full size
    hintCycles: 2,          // the one-time line shows for this many breaths, then fades
    settleS: 0.6,           // handBack: seconds the ball takes to settle to its resting size
    seen: 'lob_seen',       // localStorage: the one-time line has been shown
    inHz: 262, outHz: 196,  // the very soft tone at each turn (only with the timer's sound on): a little higher going in, lower going out
  };

  function lobEase(x) { return (1 - Math.cos(Math.PI * Math.max(0, Math.min(1, x)))) / 2; }
  // Where the breath is `t` seconds in: which word it is, and how full the ball is (0 = its resting size, 1 = full).
  function lobAt(t) {
    const cyc = LOB.inS + LOB.outS, c = ((t % cyc) + cyc) % cyc;
    return c < LOB.inS ? { phase: 'in', k: lobEase(c / LOB.inS) } : { phase: 'out', k: 1 - lobEase((c - LOB.inS) / LOB.outS) };
  }

  function lobCss() {
    if (document.getElementById('lob-css')) return;
    const st = document.createElement('style');
    st.id = 'lob-css';
    st.textContent = `
      .lob-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; pointer-events: none; }
      .lob-stage { position: absolute; left: 0; right: 0; top: calc(env(safe-area-inset-top, 0px) + 64px); bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
        z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 0 24px; text-align: center; color: #fff; pointer-events: none; }
      .lob-orb { position: relative; flex: none; width: var(--lob-d, 220px); height: var(--lob-d, 220px); }
      .lob-orb > * { position: absolute; inset: 0; border-radius: 50%; will-change: transform, opacity; }
      .lob-shadow { background: radial-gradient(circle, rgba(0,0,0,.5) 0%, rgba(0,0,0,0) 70%); }
      .lob-halo { inset: -16%; background: radial-gradient(circle, rgba(127,214,174,.4) 0%, rgba(127,214,174,0) 68%); }
      .lob-ball { overflow: hidden; background: radial-gradient(circle at 36% 32%, #fff 0%, #F4FBF7 55%, #D5EDE0 100%); box-shadow: 0 0 36px 4px rgba(127,214,174,.3); }
      .lob-ball::before, .lob-ball::after { content: ''; position: absolute; top: 0; width: 100%; height: 100%; border-radius: 50%; border: 3px solid rgba(14,74,54,.16); box-sizing: border-box; }
      .lob-ball::before { left: -64%; }
      .lob-ball::after { left: 64%; }
      .lob-word { margin: 28px 0 0; min-height: 1.2em; font: 900 34px/1.1 'Barlow Condensed', 'AA Barlow Condensed', 'Arial Narrow', sans-serif; text-transform: uppercase; letter-spacing: .5px; transition: opacity .6s ease; }
      .lob-word.lob-pop { animation: lobPop .5s ease-out; }
      .lob-word.lob-gone { opacity: 0; }
      @keyframes lobPop { from { opacity: .15; } to { opacity: 1; } }
      .lob-hint { margin: 12px 0 0; max-width: 300px; text-wrap: balance; font: 500 15px/1.4 'Barlow', sans-serif; color: rgba(255,255,255,.8); transition: opacity 1s ease; }
      .lob-hint.lob-fade { opacity: 0; }
      .lob-hint[hidden] { display: none; }
      @media (prefers-reduced-motion: reduce) { .lob-word, .lob-hint { transition: none; } .lob-word.lob-pop { animation: none; } }`;
    document.head.appendChild(st);
  }

  // The court, drawn once per size: the game's turf and lines with the lines dimmed (nothing here is in play).
  function lobCourt() {
    const g = S.g, W = S.W, H = S.H, dpr = S.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = C.courtDeep; g.fillRect(0, 0, W, H);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, C.court); bg.addColorStop(0.5, '#105239'); bg.addColorStop(1, C.court);
    g.fillStyle = bg; g.fillRect(L(), T(), R() - L(), B() - T());
    g.strokeStyle = 'rgba(255,255,255,.1)'; g.lineWidth = 2;
    const q = (B() - T()) * 0.2;
    g.beginPath();
    g.moveTo(L(), mid() - q * 1.4); g.lineTo(R(), mid() - q * 1.4);
    g.moveTo(L(), mid() + q * 1.4); g.lineTo(R(), mid() + q * 1.4);
    g.moveTo(W / 2, mid() - q * 1.4); g.lineTo(W / 2, mid() + q * 1.4);
    g.stroke();
    g.setLineDash([4, 6]); g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(L(), mid()); g.lineTo(R(), mid()); g.stroke(); g.setLineDash([]);
    const g1 = W / 2 - S.gw / 2, g2 = W / 2 + S.gw / 2;
    g.strokeStyle = 'rgba(170,235,205,.2)'; g.lineWidth = 4; g.lineCap = 'round';
    g.beginPath();
    g.moveTo(g1, T()); g.lineTo(L(), T()); g.lineTo(L(), B()); g.lineTo(g1, B());
    g.moveTo(g2, T()); g.lineTo(R(), T()); g.lineTo(R(), B()); g.lineTo(g2, B());
    g.stroke();
  }
  function lobSize() {
    const r = S.cv.getBoundingClientRect();
    S.dpr = Math.min(window.devicePixelRatio || 1, 3);
    S.W = Math.max(200, r.width); S.H = Math.max(320, r.height);
    S.cv.width = Math.round(S.W * S.dpr); S.cv.height = Math.round(S.H * S.dpr);
    S.pad = 8; S.top = 64 + (parseFloat(getComputedStyle(S.root).paddingTop) || 0); S.gw = S.W * 0.4;
    // the ball at its full size is the square its box holds, so the words under it never move while it breathes
    const d = Math.round(Math.max(120, Math.min(S.W * 0.68, (S.H - S.top) * 0.46, 320)));
    S.stage.style.setProperty('--lob-d', d + 'px');
    S.lob.d = d;
    lobCourt();
    lobPaint();
  }

  // The ball, its halo and its shadow follow k (0 resting, 1 full) as compositor-only changes (a transform and an opacity each).
  function lobPaint() {
    const L = S.lob, k = L.settle ? L.settle.k : L.k, sc = LOB.rest + (1 - LOB.rest) * k;
    L.ballEl.style.transform = 'scale(' + sc.toFixed(4) + ')';
    L.haloEl.style.transform = 'scale(' + sc.toFixed(4) + ')';
    L.haloEl.style.opacity = (S.reduce ? 0.6 : 0.3 + 0.55 * k).toFixed(3);   // reduced motion keeps the size change (it is the pacer) and drops the glow's pulse
    const d = L.d || 220;
    L.shadowEl.style.transform = 'translate(' + (k * d * 0.1).toFixed(1) + 'px,' + (k * d * 0.14).toFixed(1) + 'px) scale(' + (LOB.rest * (1 + 0.5 * k)).toFixed(4) + ')';
    L.shadowEl.style.opacity = (0.6 - 0.35 * k).toFixed(3);
  }
  function lobWord() {
    const L = S.lob, w = S.wordEl;
    w.textContent = L.phase === 'in' ? 'Breathe in' : 'Breathe out';
    w.classList.remove('lob-pop'); void w.offsetWidth; w.classList.add('lob-pop');
  }
  function lobClock() {
    if (S.timeUp) return;
    const left = S.opts.left(), el = S.clock;
    if (left == null) { el.querySelector('b').textContent = '—'; el.querySelector('span').textContent = 'Rest paused'; el.classList.remove('low'); return; }
    const txt = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    if (el._t !== txt) { el._t = txt; el.querySelector('b').textContent = txt; el.querySelector('span').textContent = 'Rest'; }
    el.classList.toggle('low', left <= 10);   // no tick and no buzz at 3, 2, 1 here: nothing on this screen startles
  }
  // One very soft low tone at a turn, only with the rest timer's sound on (S.opts.sound()). Never a buzz.
  function lobTone(f) {
    if (!S || !S.ac || !S.opts.sound()) return;
    try {
      const t = S.ac.currentTime, o = S.ac.createOscillator(), g = S.ac.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
      o.connect(g); g.connect(S.ac.destination); o.start(t); o.stop(t + 1.15);
    } catch (e) {}
  }

  // dt seconds of breathing (a hidden page sends none, and a janky frame is capped by lobFrame so the ball never jumps).
  function lobAdvance(dt) {
    const L = S.lob;
    if (L.frozen || !(dt > 0)) return;
    if (L.settle) {                                // handed back: the ball eases down to its resting size, the breath stands still
      L.settle.t = Math.min(LOB.settleS, L.settle.t + dt);
      L.settle.k = L.settle.from * (1 - lobEase(L.settle.t / LOB.settleS));
      lobPaint();
      return;
    }
    L.t += dt;
    const b = lobAt(L.t);
    L.k = b.k;
    if (b.phase !== L.phase) { L.phase = b.phase; lobWord(); lobTone(b.phase === 'in' ? LOB.inHz : LOB.outHz); }
    const end = LOB.hintCycles * (LOB.inS + LOB.outS);
    if (S.hintEl && L.t >= end) {                  // the one-time line stays for two breaths, fades, then goes
      S.hintEl.classList.add('lob-fade');
      if (L.t >= end + 1.2) { S.hintEl.hidden = true; S.hintEl = null; }
    }
    lobPaint();
  }
  function lobFrame(now) {
    if (!S || S.mode !== 'lob') return;
    S.raf = requestAnimationFrame(lobFrame);
    const dt = Math.min(0.25, Math.max(0, (now - (S.last || now)) / 1000));
    S.last = now;
    lobAdvance(dt);
    lobClock();
  }
  // For scripts/headless/lob.js: dt seconds of breathing in quarter-second steps, with no frame needed.
  function lobTick(dt) { for (let left = dt; left > 0; left -= 0.25) lobAdvance(Math.min(0.25, left)); lobClock(); }

  function openLob(opts) {
    if (S) close(true);
    css(); lobCss();
    const root = opts.root, label0 = root.getAttribute('aria-label') || 'Off the Glass';
    let first = true;                              // the one-time line: only on the first open on this phone (storage that throws shows it each time)
    try { first = !localStorage.getItem(LOB.seen); localStorage.setItem(LOB.seen, '1'); } catch (e) {}
    root.setAttribute('aria-label', 'The Lob');
    root.innerHTML =
      `<canvas class="lob-cv" aria-hidden="true"></canvas>
       <div class="rally-top">
         <div class="rally-clock" role="timer" aria-live="off"><span>Rest</span><b>0:00</b></div>
         <button type="button" class="rally-x" aria-label="Back to the rest timer">✕</button>
       </div>
       <div class="lob-stage">
         <div class="lob-orb" aria-hidden="true"><div class="lob-shadow"></div><div class="lob-halo"></div><div class="lob-ball"></div></div>
         <p class="lob-word" role="status" aria-live="polite">Breathe in</p>
         ${first ? '<p class="lob-hint">Breathe in as the ball rises. Breathe out as it falls.</p>' : ''}
       </div>`;
    S = {
      mode: 'lob', opts, root, label0, cv: root.querySelector('canvas'), g: null, clock: root.querySelector('.rally-clock'),
      stage: root.querySelector('.lob-stage'), wordEl: root.querySelector('.lob-word'), hintEl: root.querySelector('.lob-hint'),
      timeUp: false, raf: 0, last: 0,
      reduce: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
      lob: { t: 0, k: 0, phase: 'in', frozen: false, settle: null, d: 0,
        ballEl: root.querySelector('.lob-ball'), haloEl: root.querySelector('.lob-halo'), shadowEl: root.querySelector('.lob-shadow') },
    };
    S.g = S.cv.getContext('2d');
    try {                                          // the page's own audio context, as the game takes it; a silent rest needs none
      if (opts.sound && opts.sound()) {
        S.ac = opts.audio && opts.audio();
        if (!S.ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) { S.ac = new A(); S.ownAc = true; } }
        if (S.ac && S.ac.state === 'suspended') S.ac.resume();
      }
    } catch (e) {}
    root.querySelector('.rally-x').addEventListener('click', () => close());
    root.classList.add('visible');
    S.onResize = () => { if (S && S.mode === 'lob') lobSize(); };
    window.addEventListener('resize', S.onResize);
    lobSize();
    lobClock();
    S.raf = requestAnimationFrame(lobFrame);
  }

  // The rest is over: stop at once, wherever the ball is, and say so. program.html closes the layer a moment later (closeTimer()).
  function lobTimeUp() {
    if (S.timeUp) return;
    S.timeUp = true; S.lob.frozen = true;
    cancelAnimationFrame(S.raf);
    S.clock.classList.remove('low');
    S.clock.querySelector('b').textContent = '0:00';
    S.clock.querySelector('span').textContent = 'Rest';
    S.wordEl.classList.remove('lob-pop', 'lob-gone');
    S.wordEl.textContent = 'Time. Next set.';
    if (S.hintEl) { S.hintEl.hidden = true; S.hintEl = null; }
  }

  // Serve Clock: the ball settles to its resting size over about 0.6 s, then done(); nothing is left to finish, so it never waits longer. A second
  // call is ignored (the first done() stands); one made after timeUp() only calls done() on the next tick.
  function lobHandBack(done) {
    const s = S, L = s.lob;
    if (s.hb) return;
    const hb = s.hb = { fired: false, timers: [] };
    hb.finish = () => {
      if (hb.fired) return;
      hb.fired = true;
      hb.timers.forEach(clearTimeout);
      if (done) { try { done(); } catch (e) {} }
    };
    if (!L.frozen) {
      L.settle = { t: 0, from: L.k, k: L.k };
      s.wordEl.classList.remove('lob-pop'); s.wordEl.classList.add('lob-gone');
      if (s.hintEl) s.hintEl.classList.add('lob-fade');
    }
    hb.timers.push(setTimeout(hb.finish, L.frozen ? 0 : Math.round(LOB.settleS * 1000)));
  }

  function apiTimeUp() { return S && S.mode === 'lob' ? lobTimeUp() : timeUp(); }
  function apiHandBack(done) { return S && S.mode === 'lob' ? lobHandBack(done) : handBack(done); }

  // For scripts/test_rally_sim.js, which plays whole matches with no browser: one frame, with nothing drawn.
  function tick(dt) { if (!S) return; advance(dt, dt); }
  function apiTick(dt) { return S && S.mode === 'lob' ? lobTick(dt) : tick(dt); }

  // Done drops the parked match (program.html's finishDayNow()): the next session starts a fresh one. With the finished day given, only that
  // day's match goes (and one opened with no day, 'x'): finishing day 2 leaves a match parked for day 1 alone. No day, every match.
  function endSession(day) {
    if (!M) return;
    if (day == null || typeof M.key !== 'string') { M = null; return; }
    if (M.key.indexOf(String(day) + '|') === 0 || M.key.indexOf('x|') === 0) M = null;
  }
  // The parked match as { you, amir, over }, or null. With a session given, only that session's (a match left from another day is not
  // "play resumes": open() would start a fresh one). The Lob never touches it.
  function matchState(session) {
    if (!M) return null;
    if (typeof session === 'string' && session && M.key !== session) return null;
    return { you: M.score.you, amir: M.score.amir, over: !!M.over };
  }

  window.Rally = { open, timeUp: apiTimeUp, handBack: apiHandBack, endSession, matchState, close: () => close(), isOpen: () => !!S, stats: loadStats,
    _state: () => S, _tick: apiTick, _draw: () => { if (S && S.mode !== 'lob') draw(); }, _next: () => { if (S && S.mode !== 'lob') newMatch(); } };
})();
