// Split Step: a reaction game for the rest between sets (2026-10-17; Amir: "can you create a game like this for my app?",
// after play.harmansharma.in/reaction, "i want my tennis and padel players to use this during their rest time").
// Four drills, each a tennis question rather than a light switch:
//   First Step    tap the moment Amir hits (a simple reaction)
//   Fore or Back  tap the side the ball goes to (a choice between two)
//   In or Out     tap only what lands in, and on the line is in (the leave counts as much as the tap)
//   Sweet Spot    tap as the ball reaches your racket; after the bounce it slows by a different amount each time (timing)
//
// What makes it a rest game, and a fair one:
//   · The rest is the boss. Its clock is on screen the whole time, a round starts only when there is enough rest left for
//     it to almost always finish (DRILLS[x].need), and the game stops the moment the rest ends (the host calls SplitStep.timeUp()).
//   · The wait before each hit cannot be learned: a floor plus an exponential tail keeps the chance of "now" flat, where
//     an even 1-3 s spread gets surer the longer you wait. A tap before the hit, or too soon after it to be a real
//     reaction (GUESS), is a foot fault and the ball is played again.
//   · The cue is seen, never heard: sound comes after the tap, so a phone on silent scores the same. The cue is movement,
//     never a colour change alone (red to green fails about 1 in 12 men of European descent).
//   · A round's number is the median, so one tap missed while someone talks to you does not ruin it.
//   · Every phone adds its own touch and screen delay, so bests are this phone's only and nobody is ranked against anyone.
//   · Nothing leaves the phone and nothing syncs: `splitstep_stats`, in this phone's storage only.
//
// How program.html hosts it: program.html owns the layer (#splitOverlay, in topLayer() so Back closes it) and loads this file on the
// first tap of its shelf row under the rest timer's "Play while you rest" door (openRestGame('splitstep')). sw.js keeps it in SHELL, so it
// plays with no signal, and a change to it ships with a CACHE bump. PROGRAM-APP.md -> Split Step describes it.
//
// API, the same shape as Off the Glass (assets/js/rally.js), so one rest door can open either game:
//   SplitStep.open({ root, left, sound, audio, onClose, drill }) · SplitStep.timeUp() · SplitStep.close() · SplitStep.isOpen()
//   root    → an empty element the host shows over the rest timer; the game fills it and toggles its `visible` class.
//   left()  → whole seconds of rest left, or null while the rest is paused.
//   sound() → true when the rest timer's sound is on.  audio() → the page's AudioContext, opened in the tap on Play.
(function () {
  'use strict';

  const STORE = 'splitstep_stats';
  const KEEP = 30;          // rounds kept per drill on this phone
  const FB_MS = 800;        // a ball's result stays this long before the next wait begins
  const FF_MS = 1100;       // a foot fault's pause before the ball is played again
  // A tap this soon after the hit (ms) is a guess, not a reaction: a phone adds about 60 ms of screen and touch lag, and a
  // choice cannot be made faster than about 180 ms. Sweet Spot's tap is timed to the arrival, so only an early one is a guess.
  const GUESS = { first: 130, side: 180, call: 200, sweet: 100 };
  const SHOWN_MS = 16;      // a frame drawn now reaches the glass about one frame later (Sweet Spot judges what was seen)
  const ASPECT = 0.46;      // the court's width over its length: a doubles tennis court, close to padel's 0.5
  const C = {
    deep: '#082D20', court: '#0E4A36', line: 'rgba(255,255,255,.30)', lineHi: 'rgba(255,255,255,.72)', net: 'rgba(255,255,255,.55)',
    ball: '#FFFFFF', seam: 'rgba(14,74,54,.5)', amir: '#C7552F', amirRim: '#E06B43', mint: '#7FD6AE',
  };

  // `need` is the rest a round needs, in seconds: the 99th-percentile length of a clean round plus 1 s (left() rounds up).
  // Simulated with this file's own waits and windows, so about 1% of clean rounds run over. Each foot fault adds about 2.7 s.
  const DRILLS = {
    first: { name: 'First Step', line: 'Tap the moment Amir hits the ball.', hint: 'Wait for the hit', need: 19,
             label: 'tap anywhere the moment Amir hits the ball' },
    side:  { name: 'Fore or Back', line: 'Tap the side the ball goes to.', hint: 'Left half or right half', need: 23,
             label: 'tap the left or right half, the side the ball goes to' },
    call:  { name: 'In or Out', line: 'Tap if it lands in. Leave it if it is out. On the line is in.', hint: 'Tap if in. Leave it if out.', need: 24,
             label: 'tap if the ball lands in, do nothing if it is out' },
    sweet: { name: 'Sweet Spot', line: 'Tap as the ball reaches your racket. It slows after the bounce, by a different amount each time.', hint: 'Tap at your racket', need: 17,
             label: 'tap as the ball reaches your racket' },
  };
  const ORDER = ['first', 'side', 'call', 'sweet'];
  const WHY = { slow: 'Slow', wrong: 'Wrong', out: 'Out', in: 'In', early: 'Early', late: 'Late', miss: 'Miss' };

  let S = null;   // the open game, or null

  // ── This phone's numbers ── `best` is null until a clean round sets it; a score can be 0 (Sweet Spot, dead on).
  const isNum = x => typeof x === 'number' && isFinite(x) && x >= 0;
  function blankStats() { const m = {}; ORDER.forEach(k => { m[k] = { best: null, hist: [] }; }); return { v: 1, last: 'first', m }; }
  function loadStats() {
    const st = blankStats();
    try {
      const o = JSON.parse(localStorage.getItem(STORE) || '{}');
      if (o && o.m) ORDER.forEach(k => {
        const d = o.m[k];
        if (!d) return;
        st.m[k].best = isNum(d.best) ? Math.round(d.best) : null;
        st.m[k].hist = Array.isArray(d.hist) ? d.hist.filter(x => x && isNum(x.s)).slice(-KEEP) : [];
      });
      if (o && ORDER.includes(o.last)) st.last = o.last;
    } catch (e) {}
    return st;
  }
  function saveStats(st) { try { localStorage.setItem(STORE, JSON.stringify(st)); } catch (e) {} }

  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return !n ? 0 : n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const rand = (a, b) => a + Math.random() * (b - a);
  const lerp = (a, b, p) => a + (b - a) * p;
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  // The tap's own time (the touch screen's stamp, the same clock as requestAnimationFrame's), or now on a browser that has none.
  function stamp(e) { const t = e && e.timeStamp; return t > 0 && t < 1e11 ? t : performance.now(); }
  function clock(sec) { return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0'); }

  function css() {
    if (document.getElementById('splitstep-css')) return;
    const st = document.createElement('style');
    st.id = 'splitstep-css';
    const COND = `'Barlow Condensed', 'AA Barlow Condensed', 'Roboto Condensed', 'Arial Narrow', sans-serif`;
    st.textContent = `
      .ss-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; }
      .ss-top { position: absolute; left: 0; right: 0; top: 0; z-index: 2; display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; align-items: center;
        column-gap: 8px; padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px; pointer-events: none; }
      .ss-top > * { pointer-events: auto; }
      .ss-clock { grid-column: 2; justify-self: center; display: inline-flex; align-items: baseline; gap: 8px; padding: 6px 14px; border-radius: 999px; white-space: nowrap;
        background: rgba(0,0,0,.32); color: #fff; font: 700 12px/1 'Space Mono', monospace; letter-spacing: 1.2px; text-transform: uppercase; }
      .ss-clock b { font: 900 26px/1 ${COND}; letter-spacing: 0; font-variant-numeric: tabular-nums; }
      .ss-clock.low { background: #C2512C; animation: ssPulse 1s ease-in-out infinite; }
      @keyframes ssPulse { 50% { transform: scale(1.06); } }
      .ss-x { grid-column: 3; display: grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 50%; cursor: pointer;
        color: #fff; background: rgba(0,0,0,.32); font: 500 20px/1 'Barlow', sans-serif; }
      .ss-x:focus-visible, .ss-btn:focus-visible, .ss-chip:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
      .ss-hud { position: absolute; left: 0; right: 0; bottom: 0; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; min-height: 30px;
        padding: 8px 16px calc(env(safe-area-inset-bottom, 0px) + 14px); pointer-events: none; text-align: center;
        color: rgba(255,255,255,.82); font: 600 14px/1.3 'Barlow', sans-serif; }
      .ss-dots { display: flex; gap: 8px; min-height: 10px; }
      .ss-hint { min-height: 1.3em; }   /* the same HUD height on the card and in a round, so sizeCourt() measures what a round uses */
      .ss-sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .ss-dots i { width: 10px; height: 10px; border-radius: 50%; box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.5); }
      .ss-dots i.ok { background: #fff; box-shadow: none; }
      .ss-dots i.bad { background: #C2512C; box-shadow: none; }
      .ss-fb { position: absolute; left: 50%; top: 30%; z-index: 2; width: calc(100% - 32px); transform: translate(-50%, -50%); text-align: center; pointer-events: none; color: #fff; }
      .ss-fb b { display: block; font: 900 64px/1 ${COND}; letter-spacing: -1px; font-variant-numeric: tabular-nums; text-shadow: 0 2px 18px rgba(0,0,0,.35); }
      .ss-fb b.word { font-size: 44px; letter-spacing: 0; text-transform: uppercase; }
      .ss-fb b small { margin-left: 6px; font: 700 20px/1 ${COND}; letter-spacing: .5px; text-transform: uppercase; }
      .ss-fb span { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; padding: 7px 12px; border-radius: 999px;
        background: rgba(0,0,0,.38); font: 600 15px/1.25 'Barlow', sans-serif; }
      .ss-fb span::before { content: ''; flex: none; width: 8px; height: 8px; border-radius: 50%; background: ${C.mint}; }
      .ss-fb.bad span::before { background: #E06B43; }
      /* centred in the space under the clock (--ss-top and --ss-bot are measured by sizeCourt(), safe areas included) */
      .ss-card { position: absolute; left: 50%; z-index: 3; transform: translate(-50%, -50%); width: min(320px, calc(100% - 32px));
        top: calc(var(--ss-top, 66px) + (100% - var(--ss-top, 66px) - var(--ss-bot, 14px)) / 2);
        max-height: calc(100% - var(--ss-top, 66px) - var(--ss-bot, 14px)); overflow-y: auto; overscroll-behavior: contain;
        padding: 18px 16px 16px; border-radius: 12px; text-align: center;
        color: #fff; background: rgba(8,45,32,.95); box-shadow: inset 0 0 0 1px rgba(255,255,255,.22), 0 18px 40px -16px rgba(0,0,0,.7); }
      .ss-card[hidden] { display: none; }
      .ss-eye { font: 700 12px/1.4 'Space Mono', monospace; letter-spacing: 1.2px; text-transform: uppercase; color: ${C.mint}; }
      .ss-eye::before { content: ''; display: inline-block; width: 7px; height: 7px; margin-right: 8px; border-radius: 50%; background: ${C.mint}; vertical-align: 1px; }
      .ss-card h3 { margin: 8px 0 6px; font: 900 34px/1 ${COND}; text-transform: uppercase; }
      .ss-card p { margin: 0; font: 500 15px/1.4 'Barlow', sans-serif; color: rgba(255,255,255,.86); }
      .ss-card p + p { margin-top: 8px; }
      .ss-big { margin: 6px 0 2px; font: 900 64px/1 ${COND}; letter-spacing: -1px; font-variant-numeric: tabular-nums; }
      .ss-big small { margin-left: 6px; font: 700 20px/1 ${COND}; letter-spacing: .5px; text-transform: uppercase; }
      .ss-balls { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 12px 0 0; }
      .ss-balls i { min-width: 44px; padding: 5px 8px; border-radius: 999px; font: 700 14px/1.2 ${COND}; font-style: normal; letter-spacing: .4px;
        font-variant-numeric: tabular-nums; background: rgba(255,255,255,.12); }
      .ss-balls i.bad { background: rgba(194,81,44,.9); }
      .ss-note { color: rgba(255,255,255,.86); }
      .ss-card p.ss-good { display: inline-flex; align-items: center; gap: 8px; color: ${C.mint}; font-weight: 700; }
      .ss-card p.ss-good::before { content: ''; width: 8px; height: 8px; border-radius: 50%; background: ${C.mint}; }
      .ss-card .ss-tip { margin-top: 12px; font-size: 14px; color: rgba(255,255,255,.72); }
      .ss-spark { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: end; gap: 10px; margin: 14px 0 0;
        font: 700 12px/1 'Space Mono', monospace; letter-spacing: .6px; text-transform: uppercase; color: rgba(255,255,255,.62); }
      .ss-spark div { display: flex; align-items: flex-end; gap: 4px; height: 30px; }
      .ss-spark i { flex: 1; min-width: 4px; border-radius: 2px; background: rgba(255,255,255,.38); }
      .ss-spark i.now { background: ${C.mint}; }
      .ss-btn { margin-top: 16px; min-height: 52px; width: 100%; border: 0; border-radius: 8px; cursor: pointer; color: #fff; background: #16603F;
        box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.55), 0 10px 22px -10px rgba(0,0,0,.6); font: 700 17px/1 ${COND}; letter-spacing: 1px; text-transform: uppercase; }
      .ss-btn:active, .ss-chip:active { transform: scale(0.97); }
      .ss-wait { margin-top: 16px !important; padding: 14px 12px; border-radius: 8px; background: rgba(194,81,44,.92); color: #fff !important; font-weight: 700 !important; }
      .ss-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 14px; }
      .ss-chip { min-height: 44px; padding: 0 8px; border: 0; border-radius: 999px; cursor: pointer; color: #fff; background: transparent;
        box-shadow: inset 0 0 0 1.5px rgba(255,255,255,.36); font: 700 14px/1.1 'Barlow', sans-serif; }
      .ss-chip[aria-pressed="true"] { color: #0E4A36; background: #fff; box-shadow: none; }
      @media (max-height: 600px) { .ss-card h3 { font-size: 28px; } .ss-big, .ss-fb b { font-size: 52px; } .ss-btn { margin-top: 12px; } }
      /* a short screen (sizeCourt() sets .ss-short under 640 px) keeps the card to one screen */
      .ss-short .ss-card { padding: 14px 14px 12px; }
      .ss-short .ss-card h3 { margin: 6px 0 4px; font-size: 28px; }
      .ss-short .ss-big { font-size: 52px; }
      .ss-short .ss-spark { display: none; }
      .ss-short .ss-balls { margin-top: 10px; }
      .ss-short .ss-balls i { min-width: 38px; padding: 4px 6px; }
      .ss-short .ss-btn { margin-top: 12px; min-height: 48px; }
      .ss-short .ss-chips { margin-top: 10px; }
      /* six result chips on one row at 320 px (6 x 34 + 5 x 4 = 224 of the card's 256) */
      @media (max-width: 360px) { .ss-card .ss-balls { gap: 4px; } .ss-card .ss-balls i { min-width: 34px; padding: 4px 6px; } }
      @media (prefers-reduced-motion: reduce) { .ss-clock.low { animation: none; } .ss-btn:active, .ss-chip:active { transform: none; } }`;
    document.head.appendChild(st);
  }

  // ── Sound: after the tap only, never with the hit ──
  function tone(f, dur, vol, type, delay) {
    if (!S || !S.ac || !(S.opts.sound && S.opts.sound())) return;
    try {
      const t = S.ac.currentTime + (delay || 0), o = S.ac.createOscillator(), g = S.ac.createGain();
      o.type = type || 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(S.ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  // ── The court: drawn to fit between the clock and the dots, a doubles court's shape ──
  function sizeCourt() {
    const s = S, box = s.root.getBoundingClientRect();
    s.W = Math.max(1, box.width); s.H = Math.max(1, box.height);
    s.dpr = Math.min(window.devicePixelRatio || 1, 2);
    s.cv.width = Math.round(s.W * s.dpr); s.cv.height = Math.round(s.H * s.dpr);
    s.g.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    const topB = s.top.getBoundingClientRect().bottom - box.top;
    const y0 = topB + 14;
    const y1 = s.hud.getBoundingClientRect().top - box.top - 36;   // below the baseline: room for a ball that lands long
    // the card sits in the space under the clock and above the phone's bottom edge; a short screen gets the compact card
    s.root.style.setProperty('--ss-top', Math.round(topB + 4) + 'px');
    s.root.style.setProperty('--ss-bot', Math.round(parseFloat(getComputedStyle(s.hud).paddingBottom) || 14) + 'px');
    s.root.classList.toggle('ss-short', s.H < 640);
    const availH = Math.max(160, y1 - y0);
    const cw = Math.max(120, Math.min(s.W - 88, availH * ASPECT));   // 44 px each side: room for a ball wide of the line
    const ch = Math.min(availH, cw / ASPECT);
    s.ct = { x: (s.W - cw) / 2, y: y0 + (availH - ch) / 2, w: cw, h: ch };
    s.r = Math.max(7, cw * 0.03);
    s.fb.style.top = (s.ct.y + s.ct.h * 0.3) + 'px';   // in Amir's half, clear of where the balls land
  }
  // A place on the court in court units: u across (0 = left line, 1 = right line), v down (0 = Amir's baseline, 1 = yours).
  function P(u, v) { return [S.ct.x + u * S.ct.w, S.ct.y + v * S.ct.h]; }
  const AMIR = [0.5, 0.085], YOU = [0.5, 0.915], RACKET = [0.66, 0.86];

  function seg(g, x1, y1, x2, y2) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); }
  function drawRacket(x, y, fill, rim, strings, up) {
    const g = S.g, r = S.r, rx = r * 1.5, ry = r * 1.9, dir = up ? -1 : 1;
    g.lineCap = 'round';
    g.strokeStyle = rim; g.lineWidth = Math.max(2.5, r * 0.36);
    seg(g, x, y + dir * ry * 0.95, x, y + dir * (ry + r * 1.6));
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fillStyle = fill; g.fill();
    g.save(); g.clip();
    g.strokeStyle = strings; g.lineWidth = 1;
    for (let i = -rx; i <= rx; i += r * 0.55) seg(g, x + i, y - ry, x + i, y + ry);
    for (let j = -ry; j <= ry; j += r * 0.55) seg(g, x - rx, y + j, x + rx, y + j);
    g.restore();
    g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.strokeStyle = rim; g.lineWidth = 2.2; g.stroke();
  }
  function drawBall(x, y, sc, alpha) {
    const g = S.g, r = S.r * sc, lift = Math.max(0, sc - 1) * S.r * 2.2;
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = 'rgba(0,0,0,.3)';   // the shadow drifts away from the ball as it rises
    g.beginPath(); g.ellipse(x + lift * 0.5, y + lift * 0.8 + S.r * 0.2, S.r * 0.95, S.r * 0.62, 0, 0, Math.PI * 2); g.fill();
    g.shadowColor = 'rgba(127,214,174,.6)'; g.shadowBlur = r * 1.3;
    g.fillStyle = C.ball; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.shadowBlur = 0;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    g.strokeStyle = C.seam; g.lineWidth = Math.max(1, r * 0.16);
    g.beginPath(); g.arc(x - r * 1.18, y, r * 0.92, -0.85, 0.85); g.stroke();
    g.beginPath(); g.arc(x + r * 1.18, y, r * 0.92, Math.PI - 0.85, Math.PI + 0.85); g.stroke();
    g.restore();
  }
  function burst(u, v, color, now) { if (!S.reduce) S.fx.push({ u, v, color, t0: now }); }

  function draw(now) {
    const s = S, g = s.g, ct = s.ct, r = s.r;
    g.clearRect(0, 0, s.W, s.H);
    g.fillStyle = C.deep; g.fillRect(0, 0, s.W, s.H);
    g.fillStyle = C.court; g.fillRect(ct.x, ct.y, ct.w, ct.h);
    const net = ct.y + ct.h / 2, sv = ct.h * 0.5 * 0.55, cx = ct.x + ct.w / 2;
    g.lineCap = 'butt';
    g.strokeStyle = C.line; g.lineWidth = 2;
    seg(g, ct.x, net - sv, ct.x + ct.w, net - sv); seg(g, ct.x, net + sv, ct.x + ct.w, net + sv); seg(g, cx, net - sv, cx, net + sv);
    // In or Out is judged on these lines, so they are bright there
    g.strokeStyle = s.drill === 'call' ? C.lineHi : C.line; g.lineWidth = s.drill === 'call' ? 3 : 2;
    g.strokeRect(ct.x, ct.y, ct.w, ct.h);
    g.strokeStyle = C.net; g.lineWidth = 3; seg(g, ct.x - 8, net, ct.x + ct.w + 8, net);
    g.fillStyle = C.net; g.beginPath(); g.arc(ct.x - 8, net, 3, 0, Math.PI * 2); g.arc(ct.x + ct.w + 8, net, 3, 0, Math.PI * 2); g.fill();
    if (s.drill === 'side') {   // the two halves you tap
      g.save(); g.setLineDash([6, 8]); g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 2; seg(g, cx, ct.y + ct.h * 0.18, cx, ct.y + ct.h); g.restore();
    }
    const a = P(AMIR[0], AMIR[1]);
    drawRacket(a[0], a[1], C.amir, C.amirRim, 'rgba(255,255,255,.28)', true);
    const yo = s.drill === 'sweet' ? P(RACKET[0], RACKET[1]) : P(YOU[0], YOU[1]);
    drawRacket(yo[0], yo[1], 'rgba(255,255,255,.1)', '#FFFFFF', 'rgba(255,255,255,.34)', false);
    if (s.drill === 'sweet' && (s.phase === 'wait' || s.phase === 'live' || s.phase === 'fb')) {   // where contact should be
      g.save(); g.setLineDash([4, 5]); g.strokeStyle = 'rgba(127,214,174,.6)'; g.lineWidth = 2;
      g.beginPath(); g.arc(yo[0], yo[1], r * 1.55, 0, Math.PI * 2); g.stroke(); g.restore();
    }
    // bursts: Amir's hit, a ball landing, a clean contact
    s.fx = s.fx.filter(f => now - f.t0 < 420);
    s.fx.forEach(f => {
      const p = (now - f.t0) / 420, q = P(f.u, f.v);
      g.save(); g.globalAlpha = 1 - p; g.strokeStyle = f.color; g.lineWidth = 3 * (1 - p) + 1;
      g.beginPath(); g.arc(q[0], q[1], r * (1.6 + p * 3.2), 0, Math.PI * 2); g.stroke(); g.restore();
    });
    const b = s.ball;
    if (b) {
      const t = (b.frozen != null ? b.frozen : now) - s.onset;
      if (b.mark && t >= b.markAt) {   // the mark where it bounced
        const m = P(b.mark[0], b.mark[1]);
        g.fillStyle = 'rgba(255,255,255,.2)'; g.beginPath(); g.ellipse(m[0], m[1], r * 1.05, r * 0.7, 0, 0, Math.PI * 2); g.fill();
      }
      const p = b.path(t), q = P(p[0], p[1]);
      const fade = b.frozen != null ? Math.max(0.35, 1 - (now - b.frozen) / 1400) : 1;
      if (b.frozen != null && s.drill === 'sweet') {   // a ghost where it should have been met
        g.save(); g.strokeStyle = C.mint; g.lineWidth = 2; g.globalAlpha = 0.9;
        g.beginPath(); g.arc(yo[0], yo[1], r, 0, Math.PI * 2); g.stroke(); g.restore();
      }
      if (q[1] < s.H + r * 3) drawBall(q[0], q[1], p[2], fade);
    }
  }

  // ── A round ──
  // The wait before each hit: a floor plus an exponential tail, capped, so the hit cannot be timed.
  function foreperiod(drill) {
    return drill === 'sweet' ? 600 + Math.min(900, -Math.log(1 - Math.random()) * 450)
                             : 900 + Math.min(2400, -Math.log(1 - Math.random()) * 800);
  }
  function makePlan(drill) {
    if (drill === 'side') {   // each side at random, never more than three in a row, so the last balls cannot be counted
      let p;
      do { p = Array.from({ length: 6 }, () => (Math.random() < 0.5 ? 'L' : 'R')); } while (/LLLL|RRRR/.test(p.join('')));
      return p;
    }
    if (drill === 'call') return shuffle(['in', 'in', 'in', 'line', 'out', 'out']);   // four in (one on the line), two out
    return [1, 2, 3, 4, 5];
  }
  // One ball: path(t) gives [u, v, scale] at t ms after the hit; `window` is how long it waits for a tap.
  function makeBall(drill, k) {
    const s = S, ru = s.r / s.ct.w, rv = s.r / s.ct.h, rpx = s.r;
    if (drill === 'first') {
      return { window: 1000, path: t => { const p = Math.min(1, t / 650); return [0.5, lerp(0.12, 0.88, p), 1 + 0.32 * Math.sin(Math.PI * p)]; } };
    }
    if (drill === 'side') {
      const d = k === 'L' ? -1 : 1;
      return { side: k, window: 1200, path: t => { const p = Math.min(1, t / 700); return [0.5 + d * lerp(0.1, 0.4, p), lerp(0.12, 0.86, p), 1 + 0.3 * Math.sin(Math.PI * p)]; } };
    }
    if (drill === 'call') {
      // Lands near a sideline or your baseline: in by a few pixels, on the line (touching it is in), or out with a gap.
      const where = ['L', 'R', 'B'][Math.floor(Math.random() * 3)];
      const room = Math.max(8, s.ct.x - rpx * 2 - 6);   // a ball wide of the sideline still fits on the screen
      // an out ball clears the line by at least 8 px, so its glow cannot make it look like touching (a leave must be a fair call)
      const gapIn = rand(3, 20), gapOut = Math.min(room, rand(8, 20)), onLine = rand(-0.55, 0.55);
      let u, v;
      if (where === 'B') {
        u = rand(0.12, 0.88);
        v = 1 + (k === 'out' ? (rpx + gapOut) / s.ct.h : k === 'line' ? onLine * rv : -(rpx + gapIn) / s.ct.h);
      } else {
        v = rand(0.6, 0.93);
        const off = k === 'out' ? -(rpx + gapOut) / s.ct.w : k === 'line' ? onLine * ru : (rpx + gapIn) / s.ct.w;   // + is inside
        u = where === 'L' ? off : 1 - off;
      }
      return { isIn: k !== 'out', onLine: k === 'line', window: 1000, mark: [u, v], markAt: 0,
               path: t => [u, v, 1 + 0.7 * Math.max(0, 1 - t / 140)] };
    }
    // Sweet Spot: Amir's hit, a bounce in your half, then your racket. After the bounce the ball slows by a random factor
    // (0.62 to 1), a slowing target being what expert table tennis players timed better than novices (Ripoll & Latiri 1997).
    const A = [0.5, 0.12], R = RACKET;
    const B = [lerp(A[0], R[0], 0.62) + rand(-0.14, 0.14), lerp(A[1], R[1], 0.62)];
    const px = (p1, p2) => Math.hypot((p2[0] - p1[0]) * s.ct.w, (p2[1] - p1[1]) * s.ct.h);
    const T1 = rand(480, 700), slow = rand(0.62, 1), T2 = T1 * (px(B, R) / px(A, B)) / slow;
    return {
      arrive: T1 + T2, window: T1 + T2 + 300, mark: B, markAt: T1,
      path: t => {
        if (t < T1) { const p = t / T1; return [lerp(A[0], B[0], p), lerp(A[1], B[1], p), 1 + 0.38 * Math.sin(Math.PI * p)]; }
        const q = (t - T1) / T2;
        return [lerp(B[0], R[0], q), lerp(B[1], R[1], q), 1 + 0.2 * Math.sin(Math.PI * 0.5 * Math.min(q, 1))];
      },
    };
  }

  function canGo() { const l = S.opts.left ? S.opts.left() : null; return l == null || l >= DRILLS[S.drill].need; }
  function goHtml(label) {
    return canGo() ? `<button type="button" class="ss-btn" data-go>${label}</button>`
                   : `<p class="ss-wait">Not enough rest left for a round. Get set.</p>`;
  }
  function chipsHtml() {
    return `<div class="ss-chips" role="group" aria-label="Drill">${ORDER.map(k =>
      `<button type="button" class="ss-chip" data-drill="${k}" aria-pressed="${k === S.drill}">${DRILLS[k].name}</button>`).join('')}</div>`;
  }
  function unitOf(drill) { return drill === 'sweet' ? 'ms off' : 'ms'; }
  function card(html) { S.card.innerHTML = html; S.card.hidden = false; S.card.scrollTop = 0; }
  // Keyboard and screen reader users land on the card's main button (the pressed drill when there is none). Deferred a tick so a
  // held Enter or Space cannot press the new button too.
  function focusCard() {
    const s = S;
    if (!s) return;
    const b = s.card.hidden ? s.root.querySelector('.ss-x')
      : (s.card.querySelector('.ss-btn') || s.card.querySelector('.ss-chip[aria-pressed="true"]') || s.root.querySelector('.ss-x'));
    if (b) try { b.focus({ preventScroll: true }); } catch (e) {}
  }
  // Said to a screen reader through the hidden live region (the rest ending is the one assertive message).
  function say(text, assertive) {
    const s = S;
    if (!s || !s.sr) return;
    const el = s.sr;
    el.setAttribute('aria-live', assertive ? 'assertive' : 'polite');
    el.textContent = '';
    setTimeout(() => { if (S === s) el.textContent = text; }, 60);
  }
  function setFb(big, unit, line, bad, word) {
    const f = S.fb;
    if (big == null) { f.innerHTML = ''; return; }
    f.className = 'ss-fb' + (bad ? ' bad' : '');
    f.innerHTML = `<b${word ? ' class="word"' : ''}>${big}${unit ? `<small>${unit}</small>` : ''}</b>${line ? `<span>${line}</span>` : ''}`;
  }
  function hud(text) {
    const s = S, n = s.plan ? s.plan.length : 0;
    s.dots.innerHTML = s.phase === 'ready' || s.phase === 'done' || s.phase === 'up' ? '' :
      Array.from({ length: n }, (_, i) => { const r = s.res[i]; return `<i class="${r ? (r.ok ? 'ok' : 'bad') : ''}"></i>`; }).join('');
    if (text != null) s.hint.textContent = text;
  }

  function showReady(note, keepFocus) {
    const s = S;
    s.phase = 'ready'; s.ball = null; s.plan = null; setFb(); hud('');
    const d = DRILLS[s.drill], m = s.st.m[s.drill];
    s.canGo = canGo();
    card(`<div class="ss-eye">Split Step · ${ORDER.indexOf(s.drill) + 1} of 4</div>
      <h3>${d.name}</h3><p>${d.line}</p>
      ${note ? `<p class="ss-note">${note}</p>` : ''}
      <div class="ss-go-slot">${goHtml('Start')}</div>
      <p class="ss-tip">${m.best != null ? `Best on this phone <b>${m.best} ${unitOf(s.drill)}</b>` : 'A best needs every ball right and no foot faults.'}</p>
      ${chipsHtml()}`);
    s.cv.setAttribute('aria-label', `Split Step, ${d.name}: ${d.label}`);
    if (!keepFocus) setTimeout(focusCard, 0);
  }
  function startRound() {
    const s = S;
    if (!s || s.up || !canGo()) return;
    s.plan = makePlan(s.drill); s.res = []; s.ff = 0; s.i = 0;
    s.card.hidden = true;
    try { s.root.focus({ preventScroll: true }); } catch (e) {}   // the Start button is gone: focus stays in the game, not on the page behind
    toWait(performance.now());
  }
  function toWait(now) {
    const s = S;
    s.phase = 'wait'; s.ball = null; s.due = now + foreperiod(s.drill);
    setFb(); hud(DRILLS[s.drill].hint);
  }
  function launch(now) {
    const s = S;
    s.phase = 'live'; s.onset = now;
    s.ball = makeBall(s.drill, s.plan[s.i]);
    s.deadline = now + s.ball.window;
    // In or Out gets no ring: it would be drawn across the line the player is judging, and the ball's own pop is the cue
    if (s.drill !== 'call') burst(AMIR[0], AMIR[1], C.amirRim, now);
  }
  function tap(t, x) {
    const s = S;
    if (!s || s.up) return;
    if (s.phase === 'wait') return footFault(t);
    if (s.phase !== 'live') return;
    const b = s.ball, rt = t - s.onset;
    if (rt < GUESS[s.drill]) return footFault(t);
    if (s.drill === 'side' && x == null) return;   // Space and Enter name no side: only the arrows answer here
    b.frozen = t;
    let r;
    if (s.drill === 'first') r = { ok: true, ms: rt };
    else if (s.drill === 'side') r = (x < s.W / 2 ? 'L' : 'R') === b.side ? { ok: true, ms: rt } : { ok: false, why: 'wrong' };
    else if (s.drill === 'call') r = b.isIn ? { ok: true, ms: rt } : { ok: false, why: 'out' };
    else {
      const err = rt - b.arrive - SHOWN_MS;
      r = Math.abs(err) <= 250 ? { ok: true, err } : { ok: false, why: err < 0 ? 'early' : 'late' };
    }
    settle(r, t);
  }
  function timeout(now) {
    const s = S, b = s.ball;
    if (s.drill === 'call') return settle(b.isIn ? { ok: false, why: 'in' } : { ok: true, leave: true }, now);
    settle({ ok: false, why: s.drill === 'sweet' ? 'miss' : 'slow' }, now);
  }
  function footFault(t) {
    const s = S;
    s.ff++; s.phase = 'ff'; s.ball = null; s.nextAt = t + FF_MS;
    setFb('Foot fault', '', 'Wait for the hit.', true, true);
    tone(170, 0.14, 0.12, 'sine'); buzz(30);
  }
  function settle(r, t) {
    const s = S, b = s.ball;
    s.res.push(r); s.i++;
    s.phase = 'fb'; s.nextAt = t + FB_MS + (r.ok ? 0 : 250);
    if (r.ok && r.leave) setFb('Out', '', 'Good leave.', false, true);
    else if (r.ok && s.drill === 'sweet') {
      const e = Math.round(r.err), a = Math.abs(e);
      setFb(a, e < 0 ? 'ms early' : e > 0 ? 'ms late' : 'ms', a <= 20 ? 'Sweet spot.' : '', false);
      if (a <= 20) burst(RACKET[0], RACKET[1], C.mint, performance.now());
    } else if (r.ok) setFb(Math.round(r.ms), 'ms', s.drill === 'call' && b && b.onLine ? 'On the line is in.' : '', false);
    else if (r.why === 'out') setFb('Out', '', 'You played it. It was out.', true, true);
    else if (r.why === 'in') setFb('In', '', b && b.onLine ? 'It touched the line. On the line is in.' : 'It was in. You left it.', true, true);
    else setFb({ slow: 'Too slow', wrong: 'Wrong side', early: 'Too early', late: 'Too late', miss: 'Missed it' }[r.why], '', '', true, true);
    if (r.ok) { tone(r.err != null && Math.abs(r.err) <= 20 ? 990 : 660, 0.06, 0.12, 'triangle'); buzz(10); }
    else { tone(196, 0.12, 0.1, 'sine'); buzz(30); }
    hud();
  }

  function finishRound() {
    const s = S, d = DRILLS[s.drill], R = s.res, ok = R.filter(r => r.ok), m = s.st.m[s.drill];
    const taps = ok.filter(r => r.ms != null).map(r => r.ms);
    const ffTxt = s.ff ? ` · ${s.ff} foot fault${s.ff > 1 ? 's' : ''}` : '';
    let score = null, sub = '', bias = null;   // null: too few hits to score (a score of 0 is real in Sweet Spot)
    if (s.drill === 'sweet') {
      const errs = ok.map(r => r.err);
      if (errs.length >= 3) { score = median(errs.map(Math.abs)); bias = errs.reduce((x, y) => x + y, 0) / errs.length; }
      const lean = bias == null ? '' : Math.abs(bias) < 5 ? ' · on time on average' : ` · ${Math.round(Math.abs(bias))} ms ${bias < 0 ? 'early' : 'late'} on average`;
      sub = `${ok.length} of ${R.length} hit${lean}${ffTxt}`;
    } else {
      if (taps.length >= (s.drill === 'call' ? 2 : 3)) score = median(taps);
      sub = s.drill === 'first' ? `Middle time of ${taps.length} balls${ffTxt}`
          : `${ok.length} of ${R.length} ${s.drill === 'call' ? 'calls ' : ''}right${ffTxt}`;
    }
    const has = score != null;
    if (has) score = Math.round(score);
    const clean = has && ok.length === R.length && s.ff === 0;
    let best = false;
    if (has) {
      m.hist.push(Object.assign({ t: Date.now(), s: score, ok: ok.length, n: R.length, ff: s.ff, c: clean ? 1 : 0 }, bias == null ? {} : { b: Math.round(bias) }));
      if (m.hist.length > KEEP) m.hist = m.hist.slice(-KEEP);
      if (clean && (m.best == null || score < m.best)) { m.best = score; best = true; }
    }
    s.st.last = s.drill; saveStats(s.st);
    const cleanH = m.hist.filter(x => x.c), usual = cleanH.length >= 3 ? Math.round(median(cleanH.slice(-10).map(x => x.s))) : null;
    const unit = unitOf(s.drill);
    let note;
    if (!has) note = `<p class="ss-note">Too few hits to score this round.</p>`;
    else if (best) note = `<p class="ss-good">New best on this phone.</p>`;
    else if (clean) note = `<p class="ss-note">Best on this phone ${m.best} ${unit}.${usual != null ? ` Your usual is ${usual} ${unit}.` : ''}</p>`;
    else note = `<p class="ss-note">A best needs every ball right and no foot faults.${m.best != null ? ` Yours is ${m.best} ${unit}.` : ''}</p>`;
    let spark = '';
    const h = cleanH.slice(-10);
    if (h.length >= 3) {
      const vals = h.map(x => x.s), lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals), span = Math.max(1, hi - lo);
      spark = `<div class="ss-spark" role="img" aria-label="Your last ${h.length} clean rounds, oldest to newest: ${vals.join(', ')} ${unit}. ${s.drill === 'sweet' ? 'Lower is closer' : 'Lower is faster'}. Taller bars are better."><span>Last ${h.length}</span><div>${h.map((x, i) =>
        `<i style="height:${Math.round(28 + 72 * (hi - x.s) / span)}%"${i === h.length - 1 && clean ? ' class="now"' : ''}></i>`).join('')}</div><span>${s.drill === 'sweet' ? 'Taller is closer' : 'Taller is faster'}</span></div>`;
    }
    const signed = e => { const n = Math.round(e); return (n < 0 ? '−' : n > 0 ? '+' : '') + Math.abs(n); };   // never "−0"
    // what a screen reader says for each chip (the chip itself shows the short form)
    const SR = { slow: 'too slow', wrong: 'wrong side', out: 'you played it, it was out', in: 'you left it, it was in', early: 'too early', late: 'too late', miss: 'missed' };
    const chip = (r, i) => {
      const t = r.ok && r.leave ? 'Leave' : r.ok && r.err != null ? signed(r.err) : r.ok ? Math.round(r.ms) : WHY[r.why];
      const n = r.err != null ? Math.round(r.err) : 0;
      const lab = r.ok && r.leave ? 'good leave' : r.ok && r.err != null ? (n === 0 ? 'on time' : Math.abs(n) + ' ms ' + (n < 0 ? 'early' : 'late')) + ', hit'
                : r.ok ? Math.round(r.ms) + ' ms, right' : SR[r.why];
      return `<i role="listitem" aria-label="Ball ${i + 1}: ${lab}" class="${r.ok ? '' : 'bad'}">${t}</i>`;
    };
    s.phase = 'done'; s.ball = null; setFb(); hud('');
    s.canGo = canGo();
    card(`<div class="ss-eye">${d.name} · round done</div>
      <div class="ss-big">${has ? `${score}<small>${unit}</small>` : '–'}</div>
      <p>${sub}</p>
      <div class="ss-balls" role="list" aria-label="Each ball">${R.map(chip).join('')}</div>
      ${note}${spark}
      <div class="ss-go-slot">${goHtml('Again')}</div>
      ${chipsHtml()}`);
    say(`${d.name} round done. ${has ? score + ' ' + unit + '. ' : 'Too few hits to score. '}${sub.replace(/ · /g, '. ')}. ${best ? 'New best on this phone.' : ''}`);
    setTimeout(focusCard, 0);
    if (best) { tone(523, 0.08, 0.12, 'triangle'); tone(784, 0.08, 0.12, 'triangle', 0.09); tone(1046, 0.12, 0.12, 'triangle', 0.18); buzz(20); }
  }

  // ── The rest clock: always on screen; it decides whether a round may start ──
  function paintClock() {
    const s = S;
    if (s.up) return;
    const left = s.opts.left ? s.opts.left() : null, el = s.clock;
    if (left == null) {
      if (el._t !== '-') { el._t = '-'; el.querySelector('b').textContent = '–'; el.querySelector('span').textContent = 'Rest paused'; }
      el.classList.remove('low');
    } else {
      const txt = clock(Math.max(0, left));
      if (el._t !== txt) { el._t = txt; el.querySelector('b').textContent = txt; el.querySelector('span').textContent = 'Rest'; }
      el.classList.toggle('low', left <= 10);
      // the 3-2-1 stays quiet during a wait or a live ball: a beep then would be a second, faster cue
      if (left <= 3 && left > 0 && s._count !== left) { s._count = left; if (s.phase !== 'wait' && s.phase !== 'live') { buzz(12); tone(880, 0.07, 0.15, 'sine'); } }
      if (left <= 0) { timeUp(); return; }   // the host says so first; this is the backstop
    }
    if (s.phase === 'ready' || s.phase === 'done') {
      const go = canGo();
      if (go !== s.canGo) {
        s.canGo = go;
        const slot = s.card.querySelector('.ss-go-slot');
        if (slot) slot.innerHTML = goHtml(s.phase === 'done' ? 'Again' : 'Start');
      }
    }
  }

  function frame(now) {
    const s = S;
    if (!s) return;
    s.raf = requestAnimationFrame(frame);
    if (!s.up) {
      if (s.phase === 'wait' && now >= s.due) launch(now);
      else if (s.phase === 'live' && now >= s.deadline) timeout(now);
      else if ((s.phase === 'fb' || s.phase === 'ff') && now >= s.nextAt) {
        if (s.phase === 'fb' && s.i >= s.plan.length) finishRound(); else toWait(now);
      }
    }
    draw(now);
    paintClock();
  }

  function onDown(e) {
    if (!S || e.isPrimary === false || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    tap(stamp(e), e.clientX - S.root.getBoundingClientRect().left);
  }
  // Keys for a computer: Space or Enter taps, the arrows pick a side. Caught first and kept from the page while a round is
  // on, so the rest timer under the game never takes a Space as Pause. Escape is left to the host (Back closes the game).
  function onKey(e) {
    if (!S || S.up || !S.card.hidden) return;   // on a card the buttons take the keys
    const k = e.key;
    // the ✕ keeps its own Space and Enter, so a keyboard user can leave
    if ((k === ' ' || k === 'Enter') && e.target && e.target.closest && e.target.closest('.ss-x')) return;
    if (k === ' ' || k === 'Enter' || k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat) tap(stamp(e), k === 'ArrowLeft' ? S.W * 0.25 : k === 'ArrowRight' ? S.W * 0.75 : null);   // null: no side named
    }
  }
  function onClick(e) {
    if (!S || S.up) return;
    if (e.target.closest('[data-go]')) { startRound(); return; }
    const ch = e.target.closest('[data-drill]');
    if (ch && ORDER.includes(ch.dataset.drill)) {
      S.drill = ch.dataset.drill; S.st.last = S.drill; saveStats(S.st); showReady(null, true);
      const again = S.card.querySelector(`[data-drill="${S.drill}"]`);   // the chip was redrawn: keep the keyboard on it
      if (again) try { again.focus({ preventScroll: true }); } catch (e) {}
    }
  }

  function open(opts) {
    if (S) close(true);
    css();
    const root = opts.root;
    root.innerHTML =
      `<canvas class="ss-cv" role="img" aria-label="Split Step"></canvas>
       <div class="ss-top">
         <div class="ss-clock" role="timer" aria-live="off"><span>Rest</span><b>0:00</b></div>
         <button type="button" class="ss-x" aria-label="Back to the rest timer">✕</button>
       </div>
       <div class="ss-fb" role="status" aria-live="polite"></div>
       <div class="ss-hud"><div class="ss-dots" aria-hidden="true"></div><div class="ss-hint"></div></div>
       <div class="ss-card" hidden></div>
       <div class="ss-sr" role="status" aria-live="polite" aria-atomic="true"></div>`;
    root.setAttribute('tabindex', '-1'); root.style.outline = 'none';   // focus can rest on the game itself during a round
    const st = loadStats();
    S = {
      opts, root, st, drill: ORDER.includes(opts.drill) ? opts.drill : st.last,
      sr: root.querySelector('.ss-sr'),
      cv: root.querySelector('.ss-cv'), top: root.querySelector('.ss-top'), clock: root.querySelector('.ss-clock'),
      fb: root.querySelector('.ss-fb'), hud: root.querySelector('.ss-hud'), dots: root.querySelector('.ss-dots'),
      hint: root.querySelector('.ss-hint'), card: root.querySelector('.ss-card'),
      phase: 'ready', plan: null, res: [], ff: 0, i: 0, ball: null, fx: [], up: false, raf: 0,
      reduce: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    };
    S.g = S.cv.getContext('2d');
    // The page's own audio context (opened in the tap on Play, which an iPhone needs); a page with none gets ours.
    try {
      S.ac = opts.audio && opts.audio();
      if (!S.ac) { const A = window.AudioContext || window.webkitAudioContext; if (A) { S.ac = new A(); S.ownAc = true; } }
      if (S.ac && S.ac.state === 'suspended') S.ac.resume();
    } catch (e) {}
    root.querySelector('.ss-x').addEventListener('click', () => close());
    root.addEventListener('click', onClick);
    S.cv.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    // A round timed in the background is not a fair round: it stops, and the card says why.
    S.onVis = () => { if (S && document.hidden && !S.up && /^(wait|live|fb|ff)$/.test(S.phase)) showReady('That round stopped because you left the app.'); };
    document.addEventListener('visibilitychange', S.onVis);
    // In or Out bakes its pixel gaps into the ball, so a turned screen under a live ball would change what is in or out
    S.onResize = () => {
      if (!S) return;
      const w = S.ct && S.ct.w, h = S.ct && S.ct.h;
      sizeCourt();
      if (S.drill === 'call' && w && (Math.abs(S.ct.w - w) > 1 || Math.abs(S.ct.h - h) > 1) && /^(wait|live|fb)$/.test(S.phase)) showReady('That round stopped when the screen turned.');
    };
    window.addEventListener('resize', S.onResize);
    root.classList.add('visible');
    sizeCourt();
    showReady();   // also moves focus to the card's Start button
    S.raf = requestAnimationFrame(frame);
  }

  // The rest is over: stop and say so. The host closes the layer a moment later (in program.html, closeTimer()).
  function timeUp() {
    const s = S;
    if (!s || s.up) return;
    s.up = true; s.phase = 'up'; s.ball = null;
    s.clock.classList.remove('low'); s.clock.querySelector('b').textContent = '0:00'; s.clock.querySelector('span').textContent = 'Rest';
    setFb(); hud('');
    card(`<div class="ss-eye">Rest</div><h3>Time. Next set.</h3><p>Back to work.</p>`);
    say('Rest over. Back to work.', true);
  }

  function close(quiet) {
    if (!S) return;
    const s = S; S = null;
    cancelAnimationFrame(s.raf);
    window.removeEventListener('resize', s.onResize);
    window.removeEventListener('keydown', onKey, true);
    document.removeEventListener('visibilitychange', s.onVis);
    s.root.removeEventListener('click', onClick);   // the host's element outlives the game (another game may use it next)
    try { if (s.ac && s.ownAc) s.ac.close(); } catch (e) {}
    s.root.removeAttribute('tabindex'); s.root.style.removeProperty('outline');
    s.root.classList.remove('visible', 'ss-short');
    s.root.style.removeProperty('--ss-top'); s.root.style.removeProperty('--ss-bot');
    s.root.innerHTML = '';
    if (!quiet && s.opts.onClose) s.opts.onClose();
  }

  window.SplitStep = { open, timeUp, close: () => close(), isOpen: () => !!S, stats: loadStats, _state: () => S };
})();
