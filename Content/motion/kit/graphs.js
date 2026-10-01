/* graphs.js — force and time:
 *   Force Curve (axes and one or more force-time curves that draw themselves; presets for a sprint contact, a jump, an isometric pull,
 *                a fast rise and a slow rise)    Same Peak (two curves with the same top and different speed, and the gap at one moment)
 *   Slope Line (the rate of force development: a line, its rise and its run)
 *
 * The shapes are TEACHING shapes, drawn from the standard forms of these curves, not measured data. A video that shows a number
 * (a peak force, a time) takes the number from Amir or from a source he approves, and the curve is only the picture around it.
 * Graphs stay left to right in Farsi too (a time axis is drawn the same way in Persian sport-science texts): ask Amir if he wants them mirrored.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };

  /* a smooth curve through points (Catmull-Rom), as a function of u in 0..1 (the points' first coordinate), sampled once */
  function through(pts) {
    const S = [], N = 240;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], n = Math.ceil(N * (p2[0] - p1[0]));
      for (let k = 0; k < n; k++) {
        const u = k / n, u2 = u * u, u3 = u2 * u;
        S.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
      }
    }
    S.push(pts[pts.length - 1]);
    return x => { x = clamp(x); let lo = 0, hi = S.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (S[m][0] <= x) lo = m; else hi = m; } const a = S[lo], b = S[hi], k = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]); return lerp(a[1], b[1], k); };
  }
  /* the presets: force (0..1) against time (0..1) */
  const CURVES = {
    'sprint-contact': u => Math.pow(Math.sin(Math.PI * Math.pow(clamp(u), .7)), 1.15),
    'jump': through([[0, .42], [.1, .4], [.2, .22], [.32, .5], [.46, .93], [.54, 1], [.66, .72], [.78, .3], [.88, .04], [1, 0]]),
    'isometric': through([[0, 0], [.08, .02], [.3, .4], [.5, .9], [.64, 1], [1, 1]]),
  };
  /* 'fast' and 'slow' both level off at the same top: they start at zero and end at 1 */
  CURVES.fast = u => { const k = clamp(u); return (1 - Math.exp(-k / .09)) / (1 - Math.exp(-1 / .09)); };
  CURVES.slow = u => { const k = clamp(u); return (1 - Math.exp(-k / .36)) / (1 - Math.exp(-1 / .36)); };
  KIT.graph = { CURVES, eval: (c, u) => (typeof c === 'string' ? CURVES[c] : c)(u), through };

  /* the plotting box: [x, y, w, h] of the axes; the top 8% of the height is headroom above the curve's peak */
  const plot = (box) => { const [bx, by, bw, bh] = KIT.val(box); return { X: u => bx + u * bw, Y: f => by + bh - f * bh * .92, bx, by, bw, bh }; };

  function axes(ctx, P, p, t, fa, a0) {
    const u = E.outExpo(prog(t, a0, .6)); if (u <= 0) return;
    ctx.save(); ctx.globalAlpha = u; ctx.strokeStyle = col('soft'); ctx.fillStyle = col('soft'); ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P.bx, P.by - 20); ctx.lineTo(P.bx, P.by + P.bh); ctx.lineTo(P.bx + P.bw + 20, P.by + P.bh); ctx.stroke();
    const ah = 16; ctx.beginPath(); ctx.moveTo(P.bx, P.by - 34); ctx.lineTo(P.bx - ah * .6, P.by - 34 + ah); ctx.lineTo(P.bx + ah * .6, P.by - 34 + ah); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(P.bx + P.bw + 34, P.by + P.bh); ctx.lineTo(P.bx + P.bw + 34 - ah, P.by + P.bh - ah * .6); ctx.lineTo(P.bx + P.bw + 34 - ah, P.by + P.bh + ah * .6); ctx.closePath(); ctx.fill();
    if (p.axes === true || p.axes === 'labels') {
      const font = fa ? KIT.face('ui', p.labelSize * .9, 700) : KIT.face('mono', p.labelSize, 700);
      ctx.font = font; ctx.fillStyle = col('normal', .85); ctx.textBaseline = 'alphabetic'; if (!fa) ctx.letterSpacing = '4px';
      T.put(ctx, p.yLabel, P.bx - 6, P.by - 56, 'left', fa); T.put(ctx, p.xLabel, P.bx + P.bw + 34, P.by + P.bh + p.labelSize * 1.5, 'right', fa);
    }
    ctx.restore();
  }

  /* ═══════════════ Force Curve ═══════════════ */
  KIT.piece('force-curve', {
    group: 'graph',
    doc: 'A force-time graph. The axes appear, then one or more curves draw themselves, with the area under them filling in.',
    defaults: {
      box: [130, 700, 820, 520], curves: [{ curve: 'sprint-contact', color: 'key', label: null, at: .5, dur: 1.5 }], axes: true, xLabel: 'TIME', yLabel: 'FORCE', fill: true, peak: false, peakLabel: 'PEAK',
      at: 0, line: 10, labelSize: 34, marker: null, peakLine: false, fa: null, ease: 'inOutCubic',
    },
    params: {
      box: '[x, y, w, h] of the graph (px)', curves: 'a list of { curve: a preset name (sprint-contact, jump, isometric, fast, slow) or a function of 0..1, color, label, at: seconds after the start, dur, labelAt: where along the curve its name sits (0 to 1, default the end), labelDx, labelDy: nudge the name (px), labelAlign }',
      axes: 'draw the axes and their names', xLabel: 'name of the time axis', yLabel: 'name of the force axis', fill: 'fill the area under each curve', peak: 'mark the highest point', peakLabel: 'name for the highest point',
      at: 'when the axes start (s)', line: 'curve width (px)', labelSize: 'size of the labels (px)', marker: 'null, or { time: 0..1, label }: a vertical line at one moment with a dot on each curve', peakLine: 'a dashed line across at the top of the curves',
      fa: 'true = Farsi', ease: 'easing name for the drawing',
    },
    cues: p => [{ dt: .1, kind: 'sound', props: { id: 'zip' } }].concat(p.curves.map(c => ({ dt: c.at, kind: 'sound', props: { id: 'whoosh' } }))),
    draw(ctx, t, p) {
      if (t < p.at) return;
      const P = plot(p.box), fa = isFa(p), ez = E[p.ease] || E.inOutCubic;
      axes(ctx, P, p, t, fa, p.at);
      if (p.peakLine) { const u = E.outExpo(prog(t, p.at + .2, .8)); ctx.save(); ctx.globalAlpha = .55 * u; ctx.strokeStyle = col('soft'); ctx.lineWidth = 3; ctx.setLineDash([14, 12]); ctx.beginPath(); ctx.moveTo(P.bx, P.Y(1)); ctx.lineTo(P.bx + P.bw * u, P.Y(1)); ctx.stroke(); ctx.restore(); }
      for (const c of p.curves) {
        const f = typeof c.curve === 'string' ? CURVES[c.curve] : c.curve, u = ez(prog(t, p.at + c.at, c.dur || 1.5)); if (u <= 0) continue;
        const N = 160, n = Math.max(2, Math.ceil(N * u)), color = col(c.color || 'key'), pts = [];
        for (let i = 0; i <= n; i++) { const x = (i / n) * u; pts.push([P.X(x), P.Y(f(x))]); }
        ctx.save();
        if (p.fill) { ctx.beginPath(); ctx.moveTo(pts[0][0], P.by + P.bh); pts.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(pts[pts.length - 1][0], P.by + P.bh); ctx.closePath(); const gr = ctx.createLinearGradient(0, P.by, 0, P.by + P.bh); gr.addColorStop(0, L.rgbaHex(KIT.role(c.color || 'key'), .4)); gr.addColorStop(1, L.rgbaHex(KIT.role(c.color || 'key'), .03)); ctx.fillStyle = gr; ctx.fill(); }
        ctx.strokeStyle = color; ctx.lineWidth = p.line; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
        const h = pts[pts.length - 1]; if (u < 1) { L.glow(ctx, h[0], h[1], 60, '#FFFFFF', .25); ctx.fillStyle = '#F2EEE5'; ctx.beginPath(); ctx.arc(h[0], h[1], 14, 0, Math.PI * 2); ctx.fill(); }
        if (c.label) {                                                                                  // the name sits on the curve at labelAt (default the far end), once the head has passed that point
          const la = c.labelAt != null ? c.labelAt : 1, start = Math.min(la, .92), a = E.outCubic(clamp((u - start) * 10));
          if (a > 0) { const font = fa ? KIT.face('ui', p.labelSize, 700) : KIT.face('display', p.labelSize * 1.15, 800); ctx.globalAlpha = a; ctx.font = font; ctx.fillStyle = color; ctx.textBaseline = 'alphabetic'; T.put(ctx, c.label, P.X(la) + (c.labelDx != null ? c.labelDx : -10), P.Y(f(la)) + (c.labelDy != null ? c.labelDy : -24), c.labelAlign || 'right', fa); }
        }
        ctx.restore();
      }
      if (p.peak && p.curves.length) {                                                       // the highest point of the first curve
        const c = p.curves[0], f = typeof c.curve === 'string' ? CURVES[c.curve] : c.curve, u = ez(prog(t, p.at + c.at, c.dur || 1.5));
        let bx = 0, bv = -1; for (let i = 0; i <= 200; i++) { const v = f(i / 200); if (v > bv) { bv = v; bx = i / 200; } }
        const pu = E.outBack(clamp((u - bx) / .08)); if (u > bx && pu > 0) {
          const x = P.X(bx), y = P.Y(bv); ctx.save(); ctx.fillStyle = '#F2EEE5'; ctx.beginPath(); ctx.arc(x, y, 16 * pu, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = clamp(pu); ctx.font = fa ? KIT.face('ui', p.labelSize, 700) : KIT.face('mono', p.labelSize, 700); if (!fa) ctx.letterSpacing = '3px'; ctx.fillStyle = col('normal'); T.put(ctx, p.peakLabel, x, y - 36, 'center', fa); ctx.restore();
        }
      }
      if (p.marker) {                                                                         // one moment in time: a line, a dot on each curve and the gap between the dots
        const m = p.marker, mu = E.outExpo(prog(t, p.at + (m.at != null ? m.at : 2.4), .6)); if (mu > 0) {
          const x = P.X(m.time); ctx.save(); ctx.strokeStyle = col('normal', .7); ctx.lineWidth = 3; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(x, P.by + P.bh); ctx.lineTo(x, P.by + P.bh - P.bh * .98 * mu); ctx.stroke(); ctx.setLineDash([]);
          const ys = p.curves.map(c => P.Y((typeof c.curve === 'string' ? CURVES[c.curve] : c.curve)(m.time)));
          ctx.fillStyle = '#F2EEE5'; ys.forEach((y, i) => { if (mu > .6) { ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill(); } });
          if (ys.length > 1 && mu > .8) { const y0 = Math.min(...ys), y1 = Math.max(...ys); ctx.strokeStyle = col('keyText'); ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x + 36, y0); ctx.lineTo(x + 36, y1); ctx.moveTo(x + 24, y0); ctx.lineTo(x + 48, y0); ctx.moveTo(x + 24, y1); ctx.lineTo(x + 48, y1); ctx.stroke(); }
          if (m.label) { ctx.globalAlpha = E.outCubic(clamp((mu - .3) * 2)); ctx.font = fa ? KIT.face('ui', p.labelSize, 700) : KIT.face('mono', p.labelSize, 700); if (!fa) ctx.letterSpacing = '3px'; ctx.fillStyle = col('normal'); T.put(ctx, m.label, x, P.by + P.bh + p.labelSize * 1.6 + 60, 'center', fa); }
          ctx.restore();
        }
      }
    },
  });
  KIT.alias('same-peak', 'force-curve', {
    curves: [{ curve: 'fast', color: 'key', label: 'FAST', at: .5, dur: 1.2, labelAt: .09, labelDx: 30, labelDy: 14, labelAlign: 'left' }, { curve: 'slow', color: 'normal', label: 'SLOW', at: 1.8, dur: 1.6, labelAt: .74, labelDx: 0, labelDy: 74, labelAlign: 'center' }], peakLine: true, fill: false, marker: { time: .22, label: '100 MS', at: 3.6 },
  }, 'Two curves reach the same peak force. One gets there fast, one slow. At the same moment, one has far more force.');

  /* ═══════════════ Slope Line (RFD) ═══════════════ */
  KIT.piece('slope-line', {
    group: 'graph',
    doc: 'How fast force rises: a line across the steep part of the curve, with its rise and its run marked.',
    defaults: {
      box: [130, 700, 820, 520], curve: 'sprint-contact', from: .02, to: .24, at: 0, dur: .9, color: 'keyText', lineColor: 'key', label: 'RFD', sub: 'FORCE ÷ TIME', labelSize: 64, subSize: 30, line: 9, extend: .12, fa: null, showCurve: true, labelAt: null,
    },
    params: {
      box: 'the same [x, y, w, h] as the Force Curve it sits on', curve: 'the same preset or function', from: 'where the slope starts, as a share of the time axis (0 to 1)', to: 'where it ends',
      at: 'when it starts (s)', dur: 'how long it takes (s)', color: 'colour of the label', lineColor: 'colour of the slope line', label: 'the big name', sub: 'the small line under it', labelSize: 'size of the big name (px)', subSize: 'size of the small line (px)',
      line: 'line width (px)', extend: 'how far the slope line carries on past its ends (share of the axis)', fa: 'true = Farsi', showCurve: 'draw the curve under it (off when a Force Curve is drawn already)', labelAt: '[x, y] for the big name (null = inside the curve, clear of the line)',
    },
    cues: () => [{ dt: 0, kind: 'sound', props: { id: 'slide' } }, { dt: .7, kind: 'sound', props: { id: 'click' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const P = plot(p.box), fa = isFa(p), f = typeof p.curve === 'string' ? CURVES[p.curve] : p.curve, a = [P.X(p.from), P.Y(f(p.from))], b = [P.X(p.to), P.Y(f(p.to))];
      const u = E.outExpo(prog(t, p.at, p.dur)), dx = b[0] - a[0], dy = b[1] - a[1], ex = p.extend * P.bw, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
      ctx.save(); ctx.lineCap = 'round';
      if (p.showCurve) { ctx.strokeStyle = col('soft'); ctx.lineWidth = 6; ctx.beginPath(); for (let i = 0; i <= 120; i++) { const x = i / 120; i ? ctx.lineTo(P.X(x), P.Y(f(x))) : ctx.moveTo(P.X(x), P.Y(f(x))); } ctx.stroke(); }
      /* the slope line, drawn from its low end, carrying on a little at both ends */
      const s0 = [a[0] - ux * ex * .5, a[1] - uy * ex * .5], s1 = [b[0] + ux * ex, b[1] + uy * ex];
      ctx.strokeStyle = col(p.lineColor); ctx.lineWidth = p.line; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(lerp(s0[0], s1[0], u), lerp(s0[1], s1[1], u)); ctx.stroke();
      /* the run and the rise as a right-angled triangle */
      const tu = E.outExpo(prog(t, p.at + p.dur * .6, .5)); if (tu > 0) {
        ctx.strokeStyle = col('normal', .8); ctx.lineWidth = 4; ctx.setLineDash([12, 10]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], tu), a[1]); ctx.moveTo(b[0], a[1]); ctx.lineTo(b[0], lerp(a[1], b[1], tu)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#F2EEE5'; for (const q of [a, b]) { ctx.beginPath(); ctx.arc(q[0], q[1], 13 * tu, 0, Math.PI * 2); ctx.fill(); }
        const font = fa ? KIT.face('ui', p.subSize, 700) : KIT.face('mono', p.subSize, 700); ctx.font = font; ctx.fillStyle = col('normal'); ctx.globalAlpha = tu; if (!fa) ctx.letterSpacing = '2px';
        T.put(ctx, fa ? 'زمان' : 'Δ TIME', (a[0] + b[0]) / 2, a[1] + p.subSize * 1.9, 'center', fa); T.put(ctx, fa ? 'نیرو' : 'Δ FORCE', b[0] + 26, (a[1] + b[1]) / 2 + p.subSize * .35, 'left', fa);
      }
      const lu = E.outBack(prog(t, p.at + p.dur * .8, .5)); if (lu > 0) {
        const lp = p.labelAt ? KIT.val(p.labelAt) : [P.X(.3), P.by + P.bh * .78];                // the name sits inside the belly of the curve, clear of the line
        ctx.save(); ctx.translate(lp[0], lp[1]); ctx.scale(lu, lu); ctx.globalAlpha = clamp(lu);
        ctx.font = fa ? KIT.face('display', p.labelSize * .85, 900) : KIT.face('display', p.labelSize * 1.3, 900); ctx.fillStyle = col(p.color); T.put(ctx, p.label, 0, 0, 'left', fa);
        if (p.sub) { ctx.font = fa ? KIT.face('ui', p.subSize, 600) : KIT.face('mono', p.subSize * .8, 700); if (!fa) ctx.letterSpacing = '2px'; ctx.fillStyle = col('soft'); T.put(ctx, p.sub, 0, p.subSize * 1.6, 'left', fa); }
        ctx.restore();
      }
      ctx.restore();
    },
  });
})(window);
