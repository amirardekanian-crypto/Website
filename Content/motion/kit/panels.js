/* panels.js — the editor panels of shot 2: Curve Lab (a graph editor), Keyframes (the timeline strip) and Spring Lab (the spring card).
 *
 * Each is a card with a design size (curve-lab 620 x 440, spring-lab 470 x 150, keyframes 620 wide) and a centre, x and y.
 * A scene can place one in another frame with KIT.fit: wrap it in a group whose transform is KIT.fit(ctx, 620, 440, box) and give
 * x and y as the middle of the design size (310, 220). The three slide in on a spring, tipped, and then run on the beat grid.
 * With no params each one draws exactly the card the reel showed in shot 2.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog, spring, bezier, rgbaHex } = L;
  const BEAT = .46875, S8 = BEAT / 2, BAR = BEAT * 4;           // 128 bpm: a beat, an 8th note and a bar (s)
  const MONO = '500 14px "JetBrains Mono"';
  const SHADOW = 'rgba(110,22,0,.5)';                          // the deep red-brown the cards cast on the coral stage

  const EASES = [[.16, 1, .3, 1, 'outExpo'], [.34, 1.56, .64, 1, 'outBack'], [.65, 0, .35, 1, 'inOutCubic'], [.7, -.45, .25, 1.3, 'anticipate']];

  /* After a real gradient fill Chrome draws the soft shadows that follow, in the same canvas state, a little tighter and lighter
     (about 2% less shadow, a few levels of colour); a plain colour fill does not do it. The reel's old shots drew their cards in
     that state, because their backdrop was a top-level gradient fill. KIT.draw drops the state when a piece ends, so a piece with
     soft shadows takes it up again itself, with a gradient fill that draws nothing. It lasts until the piece ends. */
  function afterGradient(ctx) {
    const a = ctx.globalAlpha, f = ctx.fillStyle, g = ctx.createLinearGradient(0, 0, 1, 0);
    g.addColorStop(0, '#000000'); g.addColorStop(1, '#FFFFFF');
    ctx.globalAlpha = 0; ctx.fillStyle = g; ctx.fillRect(0, 0, 1, 1); ctx.globalAlpha = a; ctx.fillStyle = f;
  }

  /* ── curve-lab: a cubic-bezier graph editor. The curve morphs to the next preset on every change (the handles flick with an
        overshoot), and a playhead runs the curve once per change. ── */
  KIT.piece('curve-lab', {
    group: 'screens',
    size: [620, 440],
    doc: 'An easing curve editor with live handles that changes shape on the beat.',
    defaults: {
      x: 1490, y: 370, at: .02, enter: [2.1, .6], slide: 820, tilt: -.05,
      curves: EASES, every: S8, sync: 0, title: 'GRAPH EDITOR', font: MONO, color: PAL.coral, card: PAL.ink, line: PAL.bone, shadow: SHADOW,
    },
    params: {
      x: 'centre of the card (x)', y: 'centre of the card (y)', at: 'when the card starts to slide in (s)', enter: 'the slide-in spring: [how fast it swings (Hz), damping]',
      slide: 'how far to the right it starts (px)', tilt: 'how far it is tipped when it starts (radians)',
      curves: 'the curves to show, each [x1, y1, x2, y2, name] (a CSS cubic-bezier and its name)', every: 'how often the curve changes (s)', sync: 'when the first change lands (s, on the scene clock)',
      title: 'the title in the header', font: 'CSS font of the small labels', color: 'handle and playhead colour', card: 'card colour', line: 'curve, grid and text colour', shadow: 'colour of the shadow under the card',
    },
    draw(ctx, t, p) {
      const pe = spring(t - p.at, p.enter[0], p.enter[1]);
      if (pe <= 0) return;
      afterGradient(ctx);
      const pw = 620, ph = 440, ex = (1 - pe) * p.slide;
      const px = (KIT.val(p.x, t) - pw / 2) + ex, py = KIT.val(p.y, t) - ph / 2;
      const INK = p.card, BONE = p.line, CORAL = p.color;
      ctx.translate(px, py); ctx.rotate((1 - pe) * p.tilt);
      ctx.shadowColor = p.shadow; ctx.shadowBlur = 70; ctx.shadowOffsetY = 28;
      ctx.fillStyle = INK; L.roundedRect(ctx, 0, 0, pw, ph, 28); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.strokeStyle = rgbaHex(BONE, .1); ctx.lineWidth = 1.5; L.roundedRect(ctx, .75, .75, pw - 1.5, ph - 1.5, 28); ctx.stroke();

      // header
      const tg = t - p.sync, n = p.curves.length;
      const k = Math.max(0, Math.floor(tg / p.every)), cur = p.curves[k % n], prev = p.curves[(k + n - 1) % n];
      ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(34, 38, 7, 0, L.TAU); ctx.fill();
      ctx.font = p.font; ctx.letterSpacing = '2.4px';
      ctx.fillStyle = rgbaHex(BONE, .6); ctx.textAlign = 'left'; ctx.fillText(p.title, 54, 43);
      ctx.fillStyle = rgbaHex(BONE, .95); ctx.textAlign = 'right'; ctx.fillText(cur[4].toUpperCase(), pw - 30, 43);
      ctx.letterSpacing = '0px';
      ctx.fillStyle = rgbaHex(BONE, .08); ctx.fillRect(0, 70, pw, 1.5);

      // plot area (y runs -0.3 ... 1.3 so overshoot is visible)
      const gx = 50, gw = pw - 100, gt = 100, gh = 272, ylo = -.3, yhi = 1.3;
      const X = u => gx + u * gw, Y = v => gt + gh - (v - ylo) / (yhi - ylo) * gh;
      ctx.strokeStyle = rgbaHex(BONE, .07); ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(X(i / 4), gt); ctx.lineTo(X(i / 4), gt + gh); ctx.stroke(); }
      for (const v of [0, .5, 1]) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); }
      ctx.strokeStyle = rgbaHex(BONE, .22); ctx.setLineDash([5, 6]);
      for (const v of [0, 1]) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); }
      ctx.setLineDash([]);

      // the curve, morphing between presets on every change (handles flick with an overshoot)
      const m = E.outBack(prog(tg - k * p.every, 0, .16), 2.2);
      const P = [0, 1, 2, 3].map(i => lerp(prev[i], cur[i], m));
      const x1 = clamp(P[0]), x2 = clamp(P[2]), y1 = P[1], y2 = P[3];
      const ez = bezier(x1, y1, x2, y2);
      ctx.strokeStyle = BONE; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64, v = ez(u); i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v)); } ctx.stroke();
      // handles
      ctx.strokeStyle = rgbaHex(CORAL, .95); ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(x1), Y(y1)); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke();
      for (const [hx, hy] of [[x1, y1], [x2, y2]]) {
        ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(X(hx), Y(hy), 10, 0, L.TAU); ctx.fill();
        ctx.strokeStyle = BONE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(hx), Y(hy), 10, 0, L.TAU); ctx.stroke();
      }
      ctx.fillStyle = BONE; for (const [ax, ay] of [[0, 0], [1, 1]]) ctx.fillRect(X(ax) - 5, Y(ay) - 5, 10, 10);

      // the playhead runs the curve once per change
      const s = prog(tg - k * p.every, .02, .2), val = ez(s);
      ctx.strokeStyle = rgbaHex(CORAL, .55); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(X(s), gt); ctx.lineTo(X(s), gt + gh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, Y(val)); ctx.lineTo(X(s), Y(val)); ctx.stroke();
      L.glow(ctx, X(s), Y(val), 34, CORAL, .9);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(s), Y(val), 8, 0, L.TAU); ctx.fill();

      // readout
      ctx.font = p.font; ctx.letterSpacing = '1px'; ctx.textAlign = 'left';
      ctx.fillStyle = rgbaHex(BONE, .55);
      ctx.fillText(`cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`, 30, ph - 26);
      ctx.textAlign = 'right'; ctx.fillStyle = rgbaHex(BONE, .9); ctx.fillText(`y ${val.toFixed(3)}`, pw - 30, ph - 26);
      ctx.letterSpacing = '0px';
    },
  });

  /* ── keyframes: a timeline strip with a diamond for every move and a playhead; it rides in with the graph editor ── */
  KIT.piece('keyframes', {
    group: 'screens',
    size: [620, 63],
    doc: 'Diamonds pop onto a timeline, one per move.',
    defaults: {
      x: 1490, y: 650, w: 620, at: .02, enter: [2.1, .6], slide: 820,
      moves: [0, S8, BEAT, S8 * 3, BEAT * 2], span: BAR, sync: 0, dur: .3, over: 2.4, diamond: 11,
      title: 'KEYFRAMES', font: MONO, color: PAL.ink, head: PAL.bone,
    },
    params: {
      x: 'centre of the strip (x)', y: 'the height of the timeline line (y)', w: 'length of the strip (px)', at: 'when the strip starts to slide in (s)', enter: 'the slide-in spring: [how fast it swings (Hz), damping]',
      slide: 'how far to the right it starts (px)', moves: 'the times the diamonds pop on, one per move (s, on the scene clock); the number of moves is the length of this list', span: 'how long the whole strip stands for (s)',
      sync: 'where the strip starts on the scene clock (s)', dur: 'how long each diamond takes to pop (s)', over: 'how far a diamond overshoots its size', diamond: 'final half-size of a diamond (px)',
      title: 'the label above the line', font: 'CSS font of the label', color: 'colour of the diamonds, line and label', head: 'colour of the playhead',
    },
    draw(ctx, t, p) {
      const pe = spring(t - p.at, p.enter[0], p.enter[1]);
      if (pe <= 0) return;
      const ex = (1 - pe) * p.slide, pw = p.w;
      const sx0 = (KIT.val(p.x, t) - pw / 2) + ex, sy = KIT.val(p.y, t), tg = t - p.sync;
      ctx.fillStyle = rgbaHex(p.color, .55); ctx.font = p.font; ctx.letterSpacing = '2.4px'; ctx.textAlign = 'left';
      ctx.fillText(p.title, sx0, sy - 30);
      ctx.fillStyle = rgbaHex(p.color, .9); ctx.fillRect(sx0, sy - 1, pw, 2);
      p.moves.forEach(et => {
        const dp = E.outBack(prog(tg, et, p.dur), p.over); if (dp <= 0) return;
        const dx = sx0 + pw * (et / p.span), r = p.diamond * dp;
        ctx.save(); ctx.translate(dx, sy); ctx.rotate(Math.PI / 4); ctx.fillStyle = p.color; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
      });
      const ph_x = sx0 + pw * clamp(tg / p.span);
      ctx.fillStyle = p.head; ctx.fillRect(ph_x - 1.5, sy - 22, 3, 44);
      ctx.letterSpacing = '0px';
    },
  });

  /* ── spring-lab: a ball on a rail, re-sprung on every change (it alternates ends); the numbers on the card are the real spring ── */
  KIT.piece('spring-lab', {
    group: 'weight',
    size: [470, 150],
    doc: 'A ball on a rail, sprung with real numbers.',
    defaults: {
      x: 1565, y: 825, at: .1, enter: [2.1, .62], slide: 720, tilt: -.04,
      stiffness: 3.6, damping: .42, every: S8, sync: 0, title: 'SPRING', font: MONO, color: PAL.coral, card: PAL.ink, line: PAL.bone, shadow: SHADOW,
    },
    params: {
      x: 'centre of the card (x)', y: 'centre of the card (y)', at: 'when the card starts to slide in (s)', enter: 'the slide-in spring: [how fast it swings (Hz), damping]',
      slide: 'how far to the right it starts (px)', tilt: 'how far it is tipped when it starts (radians)',
      stiffness: 'how stiff the spring is, as swings per second (Hz); the k on the card is (2 x pi x this) squared', damping: 'damping ratio: 0 never settles, 1 does not overshoot at all',
      every: 'how often the ball is sent to the other end (s)', sync: 'when the first send lands (s, on the scene clock)',
      title: 'the title on the card', font: 'CSS font of the labels', color: 'ball and trail colour', card: 'card colour', line: 'rail and text colour', shadow: 'colour of the shadow under the card',
    },
    draw(ctx, t, p) {
      const pe = spring(t - p.at, p.enter[0], p.enter[1]); if (pe <= 0) return;
      afterGradient(ctx);
      const w = 470, h = 150, x = (KIT.val(p.x, t) - w / 2) + (1 - pe) * p.slide, y = KIT.val(p.y, t) - h / 2;
      const INK = p.card, BONE = p.line, CORAL = p.color;
      ctx.translate(x, y); ctx.rotate((1 - pe) * p.tilt);
      ctx.shadowColor = p.shadow; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
      ctx.fillStyle = INK; L.roundedRect(ctx, 0, 0, w, h, 26); ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      const tg = t - p.sync, k = Math.max(0, Math.floor(tg / p.every)), tau = tg - k * p.every, f = p.stiffness, z = p.damping;
      const pos = (tt) => { const a0 = (k % 2) ? 1 : 0, a1 = 1 - a0; return a0 + (a1 - a0) * spring(tt, f, z); };
      ctx.font = p.font; ctx.letterSpacing = '2.4px'; ctx.textAlign = 'left';
      ctx.fillStyle = rgbaHex(BONE, .6); ctx.fillText(p.title, 30, 40);
      ctx.textAlign = 'right'; ctx.fillStyle = rgbaHex(BONE, .9);
      const om = L.TAU * f; ctx.fillText(`k ${(om * om).toFixed(0)} · c ${(2 * z * om).toFixed(1)}`, w - 30, 40); ctx.letterSpacing = '0px';
      const x0 = 40, x1 = w - 40, yr = 96;
      ctx.fillStyle = rgbaHex(BONE, .22); ctx.fillRect(x0, yr - 1.5, x1 - x0, 3);
      ctx.fillStyle = rgbaHex(BONE, .5); ctx.fillRect(x0 - 1.5, yr - 14, 3, 28); ctx.fillRect(x1 - 1.5, yr - 14, 3, 28);
      for (let j = 6; j >= 1; j--) {                      // short motion trail
        const px = x0 + (x1 - x0) * pos(Math.max(0, tau - j * .014));
        ctx.fillStyle = rgbaHex(CORAL, .1 * (7 - j)); ctx.beginPath(); ctx.arc(px, yr, 12 - j * .8, 0, L.TAU); ctx.fill();
      }
      const bx = x0 + (x1 - x0) * pos(tau);
      L.glow(ctx, bx, yr, 46, CORAL, .8);
      ctx.fillStyle = CORAL; ctx.beginPath(); ctx.arc(bx, yr, 13, 0, L.TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx - 3, yr - 4, 4, 0, L.TAU); ctx.fill();
    },
  });
})(window);
