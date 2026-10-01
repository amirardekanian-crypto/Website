/* court.js — the court and the distances on it:
 *   Court (a tennis or padel court, drawn to scale)   Metre Marks (distance flags along a line, with a runner)
 *   Scale Bar (a number line that stretches from 0-5 m to 0-10 m to 0-15 m)   Sprint Trace (a path drawing itself)
 *   Cut Angle (the angle of a change of direction)   Footfalls (foot contacts along a path)
 *
 * Coordinates on the court are in METRES, measured from the centre of the net: u runs across (to the right of the picture
 * when the court is upright), v runs along the length (v > 0 is the near end, the bottom of an upright court).
 * One object describes where the court sits on the canvas, and every piece that draws on it takes the same object:
 *     const C = { sport: 'tennis', x: 540, y: 960, ppm: 70, orient: 'v' };        // ppm = pixels per metre
 * orient 'v' stands the court upright (a reel); 'h' lays it on its side. flip: true turns it end for end.
 * Court sizes are the real ones (ITF tennis 23.77 x 10.97 m, singles 8.23 m; padel 20 x 10 m).
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };

  const DIM = {
    tennis: { L: 23.77, W: 10.97, Ws: 8.23, svc: 6.40 },
    padel: { L: 20, W: 10, Ws: 10, svc: 6.95 },
  };
  const DEFAULT_COURT = { sport: 'tennis', x: 540, y: 960, ppm: 70, orient: 'v', flip: false };
  KIT.court = {
    DIM,
    /* a court object with its blanks filled in */
    of: c => Object.assign({}, DEFAULT_COURT, KIT.val(c) || {}),
    /* metres -> pixels for a court object */
    map(c) {
      c = KIT.court.of(c); const k = c.ppm, f = c.flip ? -1 : 1;
      return c.orient === 'h' ? (u, v) => [c.x + v * k * f, c.y + u * k] : (u, v) => [c.x + u * k, c.y + v * k * f];
    },
    /* the unit vector, in pixels, of the direction (du, dv) given in court metres */
    dirPx(c, du, dv) { const m = KIT.court.map(c), a = m(0, 0), b = m(du, dv), l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; },
  };

  /* every line of a court as segments in metres, in the order they draw */
  function lines(sport) {
    const d = DIM[sport] || DIM.tennis, hw = d.W / 2, hs = d.Ws / 2, hl = d.L / 2, S = [];
    const add = (name, a, b, wave) => S.push({ name, a, b, wave });
    add('base-far', [-hw, -hl], [hw, -hl], 0); add('base-near', [hw, hl], [-hw, hl], 0);
    add('side-l', [-hw, hl], [-hw, -hl], 0); add('side-r', [hw, -hl], [hw, hl], 0);
    if (sport !== 'padel') {
      add('single-l', [-hs, hl], [-hs, -hl], 1); add('single-r', [hs, -hl], [hs, hl], 1);
      add('svc-far', [-hs, -d.svc], [hs, -d.svc], 2); add('svc-near', [hs, d.svc], [-hs, d.svc], 2);
    } else {
      add('svc-far', [-hw, -d.svc], [hw, -d.svc], 2); add('svc-near', [hw, d.svc], [-hw, d.svc], 2);
    }
    add('centre-far', [0, -d.svc], [0, 0], 3); add('centre-near', [0, d.svc], [0, 0], 3);
    return { S, d };
  }
  KIT.court.lines = lines;

  /* ═══════════════ Court ═══════════════ */
  KIT.piece('court', {
    group: 'court',
    doc: 'A tennis or padel court drawn to scale. The lines draw themselves on, and the net drops in.',
    defaults: Object.assign({
      surface: 'rgba(14,74,54,.5)', margin: 2.6, line: 5, color: 'normal', alpha: .88, net: true, half: null, at: 0, dur: 1.4, stagger: .16,
    }, DEFAULT_COURT),
    params: {
      sport: 'tennis | padel', x: 'where the centre of the net sits (px)', y: 'where the centre of the net sits (px)', ppm: 'pixels per metre (the size)', orient: 'v (upright, for a reel) | h (on its side)', flip: 'turn the court end for end',
      surface: 'colour of the playing surface (null = none)', margin: 'metres of run-off drawn around the lines', line: 'line width (px)', color: 'line colour', alpha: 'line strength',
      net: 'draw the net', half: 'null for the whole court, or near | far to draw one half only', at: 'when it starts (s)', dur: 'how long the drawing takes (s)', stagger: 'delay between groups of lines (s)',
    },
    cues: () => [{ dt: 0, kind: 'sound', props: { id: 'glassline' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const C = KIT.court.of(p), m = KIT.court.map(C), { S, d } = lines(C.sport), hw = d.W / 2, hl = d.L / 2, mg = p.margin;
      const half = p.half, v0 = half === 'far' ? -hl : half === 'near' ? 0 : -hl, v1 = half === 'near' ? hl : half === 'far' ? 0 : hl;
      ctx.save();
      /* surface */
      if (p.surface) {
        const su = E.outCubic(prog(t, p.at, .5)), a = m(-hw - mg, v0 - (half === 'near' ? 0 : mg)), b = m(hw + mg, v1 + (half === 'far' ? 0 : mg));
        ctx.globalAlpha = su; ctx.fillStyle = col(p.surface); ctx.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
      }
      /* lines */
      ctx.globalAlpha = p.alpha; ctx.strokeStyle = col(p.color); ctx.lineWidth = p.line; ctx.lineCap = 'butt';
      for (const s of S) {
        let a = s.a, b = s.b;
        if (half) {   // keep only the part of a line that is on this side of the net
          const keep = v => (half === 'near' ? v >= 0 : v <= 0);
          if (!keep(a[1]) && !keep(b[1])) continue;
          if (!keep(a[1])) a = [a[0] + (b[0] - a[0]) * (0 - a[1]) / (b[1] - a[1]), 0];
          if (!keep(b[1])) b = [b[0] + (a[0] - b[0]) * (0 - b[1]) / (a[1] - b[1]), 0];
        }
        const u = E.outExpo(prog(t, p.at + .1 + s.wave * p.stagger, p.dur * .55)); if (u <= 0) continue;
        const pa = m(a[0], a[1]), pb = m(b[0], b[1]);
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(lerp(pa[0], pb[0], u), lerp(pa[1], pb[1], u)); ctx.stroke();
      }
      /* the net: it drops in last, with posts just outside the sidelines */
      if (p.net) {
        const nu = E.outBack(prog(t, p.at + p.dur * .7, p.dur * .3)); if (nu > 0) {
          const post = .9, a = m(-hw - post, 0), b = m(hw + post, 0);
          ctx.globalAlpha = p.alpha * clamp(nu); ctx.lineWidth = p.line * 1.7; ctx.strokeStyle = col(p.color, .75);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          ctx.fillStyle = col(p.color); for (const q of [a, b]) { ctx.beginPath(); ctx.arc(q[0], q[1], p.line * 1.9, 0, Math.PI * 2); ctx.fill(); }
        }
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Metre Marks ═══════════════ */
  KIT.piece('metre-marks', {
    group: 'court',
    doc: 'Distance flags pop up along a line on the court, one after another, with a dot running along and a band lit over one stretch.',
    defaults: {
      court: DEFAULT_COURT, from: [0, 11.885], dir: [0, -1], marks: [2, 5, 8, 13], unit: null, at: 0, step: .55, dur: .4, size: 54, weight: 800, across: 3.2,
      color: 'normal', labelColor: 'normal', plate: 'rgba(12,15,11,.82)', highlight: null, bandWidth: 1.5, bandColor: 'keyText', runner: true, line: 4, fa: null, kind: 'display',
    },
    params: {
      court: 'the court object { sport, x, y, ppm, orient, flip } (the same one the Court piece uses)', from: '[u, v] in metres: where the measuring starts', dir: '[du, dv]: which way it runs (default: from the near baseline toward the net)',
      marks: 'the distances to flag, in metres', unit: 'the unit text (null = m, or متر in Farsi)', at: 'when the first flag starts (s)', step: 'time between flags (s)', dur: 'how long a flag takes to pop (s)',
      size: 'label size (px)', weight: 'label weight', across: 'how many metres wide each tick is', color: 'tick and line colour', labelColor: 'label colour', plate: 'colour of the plate behind a label (null = none)',
      highlight: 'null, or { from, to, at, dur }: a band lit between two distances', bandWidth: 'width of the lit band (metres)', bandColor: 'colour of the band', runner: 'a dot runs along the line', line: 'line width (px)', fa: 'true = Farsi', kind: 'type kind',
    },
    cues: p => p.marks.map((_, i) => ({ dt: i * p.step, kind: 'sound', props: { id: 'click' } })),
    draw(ctx, t, p) {
      if (t < p.at) return;
      const C = KIT.court.of(p.court), m = KIT.court.map(C), fa = isFa(p), dir = KIT.val(p.dir), from = KIT.val(p.from), n = p.marks.length;
      const at = d => m(from[0] + dir[0] * d, from[1] + dir[1] * d), px = KIT.court.dirPx(C, dir[0], dir[1]), nrm = [-px[1], px[0]];
      const far = Math.max(...p.marks), unit = p.unit != null ? p.unit : (fa ? 'متر' : 'm');
      ctx.save();
      /* the lit band, under everything */
      const hi = p.highlight;
      if (hi) {
        const hu = E.outExpo(prog(t, hi.at != null ? hi.at : p.at, hi.dur || .6)); if (hu > 0) {
          const d0 = hi.from, d1 = lerp(hi.from, hi.to, hu), w = p.bandWidth, a = at(d0), b = at(d1), hwPx = w * C.ppm / 2;
          const q = [[a[0] + nrm[0] * hwPx, a[1] + nrm[1] * hwPx], [b[0] + nrm[0] * hwPx, b[1] + nrm[1] * hwPx], [b[0] - nrm[0] * hwPx, b[1] - nrm[1] * hwPx], [a[0] - nrm[0] * hwPx, a[1] - nrm[1] * hwPx]];
          ctx.globalAlpha = .5; ctx.fillStyle = col(p.bandColor); ctx.beginPath(); q.forEach((z, i) => (i ? ctx.lineTo(z[0], z[1]) : ctx.moveTo(z[0], z[1]))); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = .9; ctx.strokeStyle = col(p.bandColor); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); ctx.lineTo(q[1][0], q[1][1]); ctx.moveTo(q[3][0], q[3][1]); ctx.lineTo(q[2][0], q[2][1]); ctx.stroke();
        }
      }
      /* the line itself, growing to the last flag that has appeared */
      const times = p.marks.map((_, i) => p.at + i * p.step), cur = (() => { let d = 0; for (let i = 0; i < n; i++) { const u = prog(t, times[i] - p.step * .6, p.step * .6); const prev = i ? p.marks[i - 1] : 0; if (u > 0) d = lerp(prev, p.marks[i], E.outCubic(u)); } return d; })();
      ctx.globalAlpha = .75; ctx.strokeStyle = col(p.color); ctx.lineWidth = p.line; ctx.setLineDash([p.line * 2.2, p.line * 2.2]);
      const a0 = at(0), a1 = at(cur); ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke(); ctx.setLineDash([]);
      /* the flags */
      p.marks.forEach((d, i) => {
        const u = prog(t, times[i], p.dur); if (u <= 0) return;
        const c = at(d), e = E.outBack(u), hwPx = p.across * C.ppm / 2;
        ctx.globalAlpha = clamp(u * 2); ctx.strokeStyle = col(p.color); ctx.lineWidth = p.line + 1; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(c[0] - nrm[0] * hwPx * e, c[1] - nrm[1] * hwPx * e); ctx.lineTo(c[0] + nrm[0] * hwPx * e, c[1] + nrm[1] * hwPx * e); ctx.stroke();
        const label = fa ? `${T.fa(d)} ${unit}` : `${d} ${unit}`, font = KIT.face(fa ? 'display' : p.kind, p.size * (fa ? .86 : 1), p.weight), tw = T.width(font, label, fa ? 'rtl' : 'ltr');
        const side = Math.abs(nrm[0]) > Math.abs(nrm[1]) ? (nrm[0] > 0 ? 1 : -1) : 1;
        const lx = c[0] + (Math.abs(nrm[0]) > Math.abs(nrm[1]) ? nrm[0] * (hwPx + tw / 2 + 34) : tw / 2 + hwPx * .35 + 28), ly = c[1] + (Math.abs(nrm[0]) > Math.abs(nrm[1]) ? 0 : nrm[1] * 0) + p.size * .32;
        void side;
        ctx.save(); ctx.translate(lx, ly - p.size * .3); ctx.scale(e, e); ctx.translate(-lx, -(ly - p.size * .3)); ctx.globalAlpha = clamp(u * 2);
        if (p.plate) { ctx.fillStyle = col(p.plate); ctx.beginPath(); ctx.roundRect(lx - tw / 2 - 20, ly - p.size * .86, tw + 40, p.size * 1.16, 14); ctx.fill(); }
        ctx.font = font; ctx.fillStyle = col(p.labelColor); ctx.textBaseline = 'alphabetic'; T.put(ctx, label, lx, ly, 'center', fa); ctx.restore();
      });
      /* the runner */
      if (p.runner && cur > 0) { const r = at(cur); L.glow(ctx, r[0], r[1], 46, '#FFFFFF', .35); ctx.globalAlpha = 1; ctx.fillStyle = '#F2EEE5'; ctx.beginPath(); ctx.arc(r[0], r[1], 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col(p.bandColor); ctx.beginPath(); ctx.arc(r[0], r[1], 7, 0, Math.PI * 2); ctx.fill(); }
      void far;
      ctx.restore();
    },
  });

  /* ═══════════════ Scale Bar ═══════════════ */
  KIT.piece('scale-bar', {
    group: 'court',
    doc: 'A number line that stretches out, 0 to 5 m, then 0 to 10 m, then 0 to 15 m, while one stretch stays lit.',
    defaults: {
      x: 88, y: 960, w: 904, h: 30, range: [{ at: 0, max: 5 }, { at: 1.6, max: 10 }, { at: 3.2, max: 15 }], trans: .8, highlight: [0, 5], unit: null, labelEvery: 5,
      color: 'soft', hiColor: 'key', at: 0, dur: .6, size: 56, kind: 'display', weight: 800, fa: null, labelColor: 'normal', hiLabel: null,
    },
    params: {
      x: 'left end of the bar (px)', y: 'height of the bar (px)', w: 'length of the bar (px)', h: 'thickness of the lit stretch (px)', range: 'a list of { at: seconds, max: metres }: how far the bar reaches, and when', trans: 'how long the stretch takes (s)',
      highlight: '[from, to] in metres: the stretch kept lit', unit: 'unit text (null = m, or متر in Farsi)', labelEvery: 'a number under every this many metres', color: 'colour of the bar and ticks', hiColor: 'colour of the lit stretch',
      at: 'when it starts (s)', dur: 'how long the first draw takes (s)', size: 'size of the numbers (px)', kind: 'type kind', weight: 'number weight', fa: 'true = Farsi (the bar then runs right to left)', labelColor: 'colour of the numbers',
      hiLabel: 'text above the lit stretch (null = its length, like 5 m)',
    },
    cues: p => p.range.slice(1).map(r => ({ dt: r.at, kind: 'sound', props: { id: 'whoosh' } })),
    draw(ctx, t, p) {
      if (t < p.at) return;
      const fa = isFa(p), unit = p.unit != null ? p.unit : (fa ? 'متر' : 'm');
      /* the reach of the bar right now: it glides from one keyframe to the next */
      let max = p.range[0].max;
      for (let i = 1; i < p.range.length; i++) { const k = p.range[i], u = prog(t, p.at + k.at, p.trans); if (u > 0) max = lerp(p.range[i - 1].max, k.max, E.inOutCubic(u)); }
      const grow = E.outExpo(prog(t, p.at, p.dur)), W = p.w, X = p.x, Y = p.y;
      const px = v => (fa ? X + W - (v / max) * W * grow : X + (v / max) * W * grow);
      ctx.save(); ctx.textBaseline = 'alphabetic';
      /* the bar and its ticks */
      ctx.strokeStyle = col(p.color, .7); ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px(0), Y); ctx.lineTo(px(max), Y); ctx.stroke();
      const maxN = p.range.reduce((a, b) => Math.max(a, b.max), 0);
      for (let v = 0; v <= maxN + 1e-6; v++) {
        if (v > max + 1e-6) break;
        const major = v % p.labelEvery === 0, gap = Math.abs(px(1) - px(0)), minorA = clamp((gap - 14) / 18);
        if (!major && minorA <= 0) continue;
        const x = px(v), a = major ? 1 : minorA * .8, hh = major ? 30 : 14;
        ctx.globalAlpha = a * clamp(grow * 3); ctx.strokeStyle = col(p.color); ctx.lineWidth = major ? 5 : 3;
        ctx.beginPath(); ctx.moveTo(x, Y); ctx.lineTo(x, Y + hh); ctx.stroke();
        if (major) {
          const lab = fa ? T.fa(v) : String(v), font = KIT.face(fa ? 'display' : p.kind, p.size * (fa ? .85 : .72), 700);
          ctx.globalAlpha = clamp(grow * 3) * clamp((max - v) / .4 + 1); ctx.font = font; ctx.fillStyle = col(p.labelColor, .8); T.put(ctx, lab, x, Y + 34 + p.size * .72, 'center', fa);
        }
      }
      /* the lit stretch */
      const [h0, h1] = p.highlight, a = px(h0), b = px(h1);
      ctx.globalAlpha = .96 * clamp(grow * 2); ctx.fillStyle = col(p.hiColor); ctx.beginPath(); ctx.roundRect(Math.min(a, b), Y - p.h / 2, Math.abs(b - a), p.h, p.h / 2); ctx.fill();
      const lab = p.hiLabel != null ? p.hiLabel : (fa ? `${T.fa(h1 - h0)} ${unit}` : `${h1 - h0} ${unit}`), font = KIT.face(fa ? 'display' : p.kind, p.size * 1.55 * (fa ? .85 : 1), 900);
      ctx.globalAlpha = clamp(grow * 2); ctx.font = font; ctx.fillStyle = col('keyText'); T.put(ctx, lab, (a + b) / 2, Y - p.h / 2 - 26, 'center', fa);
      ctx.restore();
    },
  });

  /* ═══════════════ Sprint Trace ═══════════════ */
  function spline(pts, n) {      // Catmull-Rom through points, as a polyline of about n points per span
    if (pts.length < 3) return pts.slice();
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let k = 0; k < n; k++) {
        const u = k / n, u2 = u * u, u3 = u2 * u;
        out.push([.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
          .5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  KIT.piece('sprint-trace', {
    group: 'court',
    doc: 'A path draws itself across the court with a bright head and a fading trail, and an arrow lands at the end.',
    defaults: {
      court: DEFAULT_COURT, points: [[-2.6, 9.5], [-2.2, 6.5], [0, 3.2], [3.2, 1.2]], smooth: true, width: 12, color: 'key', headColor: 'normal', head: 17, trail: .5, ghost: .22,
      arrow: true, at: 0, dur: 1.5, ease: 'inOutCubic', dash: null,
    },
    params: {
      court: 'the court object', points: 'the route as [u, v] points in metres', smooth: 'round the corners', width: 'line width (px)', color: 'colour of the trail', headColor: 'colour of the head', head: 'size of the head (px)',
      trail: 'how much of the path stays bright behind the head (0 to 1; 1 = all of it)', ghost: 'how visible the whole route is before the head gets there (0 = hidden)', arrow: 'end with an arrow head',
      at: 'when it starts (s)', dur: 'how long the run takes (s)', ease: 'easing name', dash: 'null, or [dash, gap]',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'whoosh' } }],
    draw(ctx, t, p) {
      const C = KIT.court.of(p.court), m = KIT.court.map(C), pts = p.points.map(q => m(q[0], q[1])), poly = p.smooth ? spline(pts, 18) : pts;
      const dist = [0]; for (let i = 1; i < poly.length; i++) dist.push(dist[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
      const total = dist[dist.length - 1]; if (total < 1) return;
      const u = (E[p.ease] || E.inOutCubic)(prog(t, p.at, p.dur)), s = total * u;
      const slice = (a, b) => { const o = []; for (let i = 0; i < poly.length; i++) { if (dist[i] >= a && dist[i] <= b) o.push(poly[i]); } const at = x => { for (let i = 1; i < poly.length; i++) if (dist[i] >= x) { const k = (x - dist[i - 1]) / ((dist[i] - dist[i - 1]) || 1); return [lerp(poly[i - 1][0], poly[i][0], k), lerp(poly[i - 1][1], poly[i][1], k)]; } return poly[poly.length - 1]; }; return [at(a)].concat(o, [at(b)]); };
      const stroke = (arr) => { ctx.beginPath(); arr.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); };
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = p.width;
      if (p.dash) ctx.setLineDash(p.dash);
      if (p.ghost > 0) { ctx.globalAlpha = p.ghost * clamp((t - p.at) / .3 + 1); ctx.strokeStyle = col(p.color); stroke(poly); }
      if (u > 0) {
        const tail = p.trail >= 1 ? 0 : Math.max(0, s - total * p.trail), N = 22;
        for (let k = 0; k < N; k++) {                // the trail fades towards its tail
          const a = lerp(tail, s, k / N), b = lerp(tail, s, (k + 1) / N); ctx.globalAlpha = Math.pow((k + 1) / N, 1.6); ctx.strokeStyle = col(p.color);
          stroke(slice(a, b));
        }
        ctx.setLineDash([]);
        const h = slice(s, s)[0];
        if (p.arrow && u > .985) { const a2 = slice(Math.max(0, s - 6), s), pa = a2[0], pb = a2[a2.length - 1], ang = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]), hs = p.width * 3.4; ctx.globalAlpha = 1; ctx.fillStyle = col(p.color); ctx.save(); ctx.translate(pb[0], pb[1]); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(hs * .5, 0); ctx.lineTo(-hs * .5, -hs * .6); ctx.lineTo(-hs * .5, hs * .6); ctx.closePath(); ctx.fill(); ctx.restore(); }
        else { L.glow(ctx, h[0], h[1], p.head * 3.2, '#FFFFFF', .3); ctx.globalAlpha = 1; ctx.fillStyle = col(p.headColor); ctx.beginPath(); ctx.arc(h[0], h[1], p.head, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = col(p.color); ctx.beginPath(); ctx.arc(h[0], h[1], p.head * .45, 0, Math.PI * 2); ctx.fill(); }
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Cut Angle ═══════════════ */
  KIT.piece('cut-angle', {
    group: 'court',
    doc: 'The angle of a change of direction. A path comes in, the old line carries on faintly, a new line leaves, and the turn is measured.',
    defaults: {
      apex: [540, 1000], inAngle: 60, outAngle: -30, length: 380, radius: 150, label: null, size: 90, width: 11, inColor: 'normal', outColor: 'key', arcColor: 'normal', at: 0, dur: 1.5, kind: 'display', fa: null, arrow: true,
    },
    params: {
      apex: '[x, y] where the cut happens (px)', inAngle: 'the way the player is moving before the cut, in degrees (0 = right, 90 = down, -90 = up)', outAngle: 'the way the player moves after the cut, in degrees',
      length: 'how long each line is (px)', radius: 'radius of the arc (px)', label: 'text on the arc (null = the size of the turn in degrees)', size: 'label size (px)', width: 'line width (px)',
      inColor: 'colour of the way in', outColor: 'colour of the way out', arcColor: 'colour of the arc and the faint line that carries on', at: 'when it starts (s)', dur: 'how long it takes (s)', kind: 'type kind', fa: 'true = Farsi', arrow: 'an arrow on the way out',
    },
    cues: () => [{ dt: 0, kind: 'sound', props: { id: 'swish' } }, { dt: .75, kind: 'sound', props: { id: 'plink' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const A = KIT.val(p.apex), rad = d => d * Math.PI / 180, fa = isFa(p), a0 = p.inAngle, a1 = p.outAngle, turn = ((a1 - a0 + 540) % 360) - 180;
      const u1 = E.outExpo(prog(t, p.at, p.dur * .4)), u2 = E.outExpo(prog(t, p.at + p.dur * .3, p.dur * .4)), u3 = E.outBack(prog(t, p.at + p.dur * .7, p.dur * .3));
      const pt = (ang, d) => [A[0] + Math.cos(rad(ang)) * d, A[1] + Math.sin(rad(ang)) * d];
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      /* the way in: from far away up to the apex */
      const s0 = pt(a0 + 180, p.length), s1 = [lerp(s0[0], A[0], u1), lerp(s0[1], A[1], u1)];
      ctx.strokeStyle = col(p.inColor); ctx.lineWidth = p.width; ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
      /* the line that would have carried on, faint and dashed */
      const cu = E.outExpo(prog(t, p.at + p.dur * .25, p.dur * .4)), c1 = pt(a0, p.length * .85 * cu);
      ctx.globalAlpha = .55; ctx.strokeStyle = col(p.arcColor); ctx.lineWidth = p.width * .5; ctx.setLineDash([p.width * 1.6, p.width * 1.6]); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(c1[0], c1[1]); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      /* the new line */
      const e = pt(a1, p.length * u2); ctx.strokeStyle = col(p.outColor); ctx.fillStyle = col(p.outColor); ctx.lineWidth = p.width; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(e[0], e[1]); ctx.stroke();
      if (p.arrow && u2 > .97) { const hs = p.width * 3.2; ctx.save(); ctx.translate(e[0], e[1]); ctx.rotate(rad(a1)); ctx.beginPath(); ctx.moveTo(hs * .6, 0); ctx.lineTo(-hs * .4, -hs * .6); ctx.lineTo(-hs * .4, hs * .6); ctx.closePath(); ctx.fill(); ctx.restore(); }
      /* the turn, as an arc from the old direction to the new one */
      const au = E.outExpo(prog(t, p.at + p.dur * .55, p.dur * .4)); if (au > 0) {
        ctx.strokeStyle = col(p.arcColor); ctx.lineWidth = p.width * .5; ctx.beginPath(); ctx.arc(A[0], A[1], p.radius, rad(a0), rad(a0 + turn * au), turn < 0); ctx.stroke();
      }
      const mid = rad(a0 + turn / 2), deg = Math.abs(Math.round(turn)), text = p.label != null ? p.label : (fa ? T.fa(deg) + '°' : deg + '°');
      if (u3 > 0) {
        const font = KIT.face(fa ? 'display' : p.kind, p.size * (fa ? .88 : 1), 900), r = p.radius + p.size * .8, lx = A[0] + Math.cos(mid) * r, ly = A[1] + Math.sin(mid) * r + p.size * .3;
        ctx.save(); ctx.translate(lx, ly - p.size * .3); ctx.scale(u3, u3); ctx.translate(-lx, -(ly - p.size * .3)); ctx.globalAlpha = clamp(u3); ctx.font = font; ctx.fillStyle = col('keyText'); ctx.textBaseline = 'alphabetic'; T.put(ctx, text, lx, ly, 'center', fa); ctx.restore();
      }
      ctx.fillStyle = col('normal'); ctx.beginPath(); ctx.arc(A[0], A[1], p.width * .95, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    },
  });

  /* ═══════════════ Footfalls ═══════════════ */
  KIT.piece('footfalls', {
    group: 'court',
    doc: 'Foot contacts land one after another along a route, each with a small ring where it hits the ground.',
    defaults: {
      court: DEFAULT_COURT, points: [[-2.4, 9.4], [-1.6, 8.3], [-2.0, 7.1], [-1.1, 6.0], [-1.5, 4.8], [-.6, 3.7]], at: 0, step: .22, dur: .3, size: 1, side: .25, color: 'normal', ringColor: 'key', ring: true, alpha: .95, key: [],
    },
    params: {
      court: 'the court object', points: 'where each foot lands, as [u, v] metres', at: 'when the first one lands (s)', step: 'time between landings (s)', dur: 'how long a landing takes to settle (s)',
      size: 'size of a foot print as a multiple of the normal', side: 'how far left and right of the route feet alternate (metres)', color: 'colour of the foot prints', ringColor: 'colour of the ring', ring: 'show the ring', alpha: 'strength',
      key: 'a list of landing numbers (0 is the first) to draw in the key colour',
    },
    cues: p => p.points.map((_, i) => ({ dt: i * p.step, kind: 'sound', props: { id: 'footsteps' } })),
    draw(ctx, t, p) {
      const C = KIT.court.of(p.court), m = KIT.court.map(C), n = p.points.length;
      ctx.save();
      for (let i = 0; i < n; i++) {
        const u = prog(t, p.at + i * p.step, p.dur); if (u <= 0) continue;
        const a = p.points[Math.max(0, i - 1)], b = p.points[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
        const c = p.points[i], off = (i % 2 ? 1 : -1) * p.side, pt = m(c[0] + (-dy / l) * off, c[1] + (dx / l) * off), q0 = m(0, 0), q1 = m(dx / l, dy / l), ang = Math.atan2(q1[1] - q0[1], q1[0] - q0[0]);
        const s = lerp(1.5, 1, E.outCubic(u)) * p.size * C.ppm / 70, isKey = p.key.indexOf(i) >= 0, color = isKey ? p.ringColor : p.color;
        if (p.ring) { const ru = E.outExpo(u); ctx.globalAlpha = (1 - ru) * .8; ctx.strokeStyle = col(p.ringColor); ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(pt[0], pt[1], 30 * s * (1 + ru * 2.6), 22 * s * (1 + ru * 2.6), ang, 0, Math.PI * 2); ctx.stroke(); }
        ctx.globalAlpha = p.alpha * clamp(u * 3); ctx.fillStyle = col(color);
        ctx.save(); ctx.translate(pt[0], pt[1]); ctx.rotate(ang); ctx.scale(1.35 * s, 1.35 * s);
        /* a shoe print: a heel and a wider forefoot joined by a tapering middle */
        const hr = 9, fr = 13, hx = -17, fx = 15;
        ctx.beginPath(); ctx.arc(hx, 0, hr, Math.PI / 2, -Math.PI / 2); ctx.lineTo(fx, -fr); ctx.arc(fx, 0, fr, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
  });
})(window);
