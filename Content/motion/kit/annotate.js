/* annotate.js — marks and diagrams that sit on top of a picture or a word:
 *   Marker (a highlight that sweeps behind or around something)   Arrow (draws itself between two points)
 *   Bracket (a measuring line with a label)   Label Line (a label joined to a point)   Chain (ideas linked one by one)
 *
 * Positions are in the canvas's own pixels, so a piece works in any frame size and sits in any box (KIT.fit).
 * Anything with words runs right to left in Farsi (fa: true, or a Farsi look in force).
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };

  /* the box a line of text takes, for a Marker to sit behind: [x, y, w, h] from the baseline, size and alignment */
  T.box = (font, str, x, baseline, size, align, dir) => {
    const w = T.width(font, str, dir), l = align === 'center' ? x - w / 2 : align === 'right' ? x - w : x;
    return [l, baseline - size * .82, w, size * 1.02];
  };

  /* a curve through a start, a bend and an end, as a list of points with the distance along it */
  function curve(a, b, bend, n) {
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const cx = (a[0] + b[0]) / 2 + nx * bend, cy = (a[1] + b[1]) / 2 + ny * bend, pts = [], dist = [0];
    for (let i = 0; i <= n; i++) {
      const u = i / n, v = 1 - u;
      pts.push([v * v * a[0] + 2 * v * u * cx + u * u * b[0], v * v * a[1] + 2 * v * u * cy + u * u * b[1]]);
      if (i) dist.push(dist[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    return { pts, dist, total: dist[n] };
  }
  /* the part of a curve up to a length, as points, ending exactly at that length */
  function upTo(c, len) {
    const out = [c.pts[0]];
    for (let i = 1; i < c.pts.length; i++) {
      if (c.dist[i] <= len) out.push(c.pts[i]);
      else { const k = (len - c.dist[i - 1]) / (c.dist[i] - c.dist[i - 1]); out.push([lerp(c.pts[i - 1][0], c.pts[i][0], k), lerp(c.pts[i - 1][1], c.pts[i][1], k)]); break; }
    }
    return out;
  }
  KIT.curve = { make: curve, upTo };

  /* ═══════════════ Arrow ═══════════════ */
  KIT.piece('arrow', {
    group: 'diagram',
    doc: 'An arrow draws itself from one point to another, straight or curved, and the head pops on at the end.',
    defaults: { from: [200, 700], to: [880, 700], bend: 0, width: 9, head: 38, color: 'key', alpha: 1, at: 0, dur: .6, ease: 'outExpo', dash: null, trimStart: 0, trimEnd: 0, headStyle: 'solid' },
    params: {
      from: '[x, y] where it starts', to: '[x, y] where the head lands', bend: 'how far the middle is pushed sideways (px; positive curves left of the way it points)', width: 'line width (px)', head: 'arrow head size (px)',
      color: 'colour (a role or a hex)', alpha: 'strength', at: 'when it starts (s)', dur: 'how long it takes to draw (s)', ease: 'easing name', dash: 'null, or [dash, gap] for a dashed arrow',
      trimStart: 'stop this many px short of the start', trimEnd: 'stop this many px short of the end', headStyle: 'solid | open (a chevron)',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'swish' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const A = KIT.val(p.from), B = KIT.val(p.to), dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy);
      if (len < 2) return;
      const ux = dx / len, uy = dy / len, a = [A[0] + ux * p.trimStart, A[1] + uy * p.trimStart], b = [B[0] - ux * p.trimEnd, B[1] - uy * p.trimEnd];
      const c = curve(a, b, p.bend, 64), u = (E[p.ease] || E.outExpo)(prog(t, p.at, p.dur));
      const pts = c.pts, end = pts[pts.length - 1], pre = pts[pts.length - 4];
      const ang = Math.atan2(end[1] - pre[1], end[0] - pre[0]), hs = p.head, hl = p.headStyle === 'open' ? 0 : hs * .78;   // the line stops at the head's base
      const lineLen = Math.max(0, c.total - hl) * u, part = upTo(c, lineLen);
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.strokeStyle = col(p.color); ctx.fillStyle = col(p.color); ctx.lineWidth = p.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (p.dash) ctx.setLineDash(p.dash);
      ctx.beginPath(); part.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke();
      ctx.setLineDash([]);
      const hu = clamp((u - .82) / .18);
      if (hu > 0) {
        const s = E.outBack(hu), tx = end[0], ty = end[1];
        ctx.translate(tx, ty); ctx.rotate(ang); ctx.scale(s, s);
        ctx.beginPath();
        if (p.headStyle === 'open') { ctx.moveTo(-hs * .8, -hs * .55); ctx.lineTo(0, 0); ctx.lineTo(-hs * .8, hs * .55); ctx.stroke(); }
        else { ctx.moveTo(0, 0); ctx.lineTo(-hs, -hs * .56); ctx.lineTo(-hs * .78, 0); ctx.lineTo(-hs, hs * .56); ctx.closePath(); ctx.fill(); }
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Marker ═══════════════ */
  KIT.piece('marker', {
    group: 'diagram',
    doc: 'A highlight that sweeps in behind a word, or draws a line, box or loop around it.',
    defaults: { box: [88, 700, 500, 120], style: 'bar', color: 'key', alpha: 1, pad: 14, thick: 12, radius: 10, at: 0, dur: .45, dir: null, fa: null, ease: 'outExpo' },
    params: {
      box: '[x, y, w, h] of the thing to mark (T.box() measures a line of text for you)', style: 'bar (filled behind) | underline | box (outline) | loop (an ellipse around it)', color: 'colour', alpha: 'strength',
      pad: 'space around the box (px)', thick: 'thickness of an underline, box or loop (px)', radius: 'corner roundness of the bar and box (px)', at: 'when it starts (s)', dur: 'how long it takes (s)',
      dir: 'ltr | rtl: which way a bar sweeps (null = follow the language)', fa: 'true = Farsi', ease: 'easing name',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'swish' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const [bx, by, bw, bh] = KIT.val(p.box), u = (E[p.ease] || E.outExpo)(prog(t, p.at, p.dur)), rtl = (p.dir ? p.dir === 'rtl' : isFa(p)), pad = p.pad;
      const x0 = bx - pad, y0 = by - pad * .5, w = bw + pad * 2, h = bh + pad;
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = col(p.color); ctx.strokeStyle = col(p.color); ctx.lineWidth = p.thick; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (p.style === 'bar') {
        const ww = w * u; ctx.beginPath(); ctx.roundRect(rtl ? x0 + w - ww : x0, y0, ww, h, p.radius); ctx.fill();
      } else if (p.style === 'underline') {
        const ww = w * u, yy = by + bh + pad * .35; ctx.beginPath(); ctx.moveTo(rtl ? x0 + w : x0, yy); ctx.lineTo(rtl ? x0 + w - ww : x0 + ww, yy); ctx.stroke();
      } else if (p.style === 'box') {
        const per = 2 * (w + h); ctx.setLineDash([per * u, per]); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, p.radius); ctx.stroke();
      } else if (p.style === 'loop') {
        const cx = bx + bw / 2, cy = by + bh / 2, rx = w * .62, ry = h * .86, sweep = Math.PI * 2.2 * u, a0 = -Math.PI * .62;
        ctx.beginPath();
        for (let i = 0; i <= 64; i++) { const a = a0 + sweep * i / 64, k = 1 + .045 * Math.sin(a * 1.2 + .8) + (i / 64) * .03 * u; const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.stroke();
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Bracket (a measuring line) ═══════════════ */
  KIT.piece('bracket', {
    group: 'diagram',
    doc: 'A measuring line with end ticks and a label in the middle, like a distance on a drawing. It grows out from the middle.',
    defaults: {
      from: [200, 900], to: [880, 900], side: null, offset: 0, label: '5 m', size: 64, weight: 800, cap: 26, width: 6, color: 'key', labelColor: 'normal', plate: null,
      labelGap: 22, at: 0, dur: .6, kind: 'display', fa: null, alpha: 1,
    },
    params: {
      from: '[x, y] of one end', to: '[x, y] of the other end', side: 'where the label goes: above | below | left | right (null = above a level line, right of an upright one)',
      offset: 'slide the whole line sideways by this much (px)', label: 'the words on it (a measurement, a name)', size: 'label size (px)', weight: 'label weight', cap: 'length of the end ticks (px)', width: 'line width (px)',
      color: 'colour of the line', labelColor: 'colour of the label', plate: 'a colour for a plate behind the label (null = none), for reading over a photo', labelGap: 'space between line and label (px)',
      at: 'when it starts (s)', dur: 'how long it takes (s)', kind: 'type kind', fa: 'true = Farsi', alpha: 'strength',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'click' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const A = KIT.val(p.from), B = KIT.val(p.to), dx = B[0] - A[0], dy = B[1] - A[1], len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len, nx = -uy, ny = ux;
      const level = Math.abs(dx) >= Math.abs(dy), side = p.side || (level ? 'above' : 'right');
      const ox = nx * p.offset, oy = ny * p.offset, a = [A[0] + ox, A[1] + oy], b = [B[0] + ox, B[1] + oy], mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const u = E.outExpo(prog(t, p.at, p.dur)), fa = isFa(p), cap = p.cap * E.outBack(clamp((u - .6) / .4));
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.strokeStyle = col(p.color); ctx.lineWidth = p.width; ctx.lineCap = 'round';
      const s = [mid[0] + (a[0] - mid[0]) * u, mid[1] + (a[1] - mid[1]) * u], e = [mid[0] + (b[0] - mid[0]) * u, mid[1] + (b[1] - mid[1]) * u];
      ctx.beginPath(); ctx.moveTo(s[0], s[1]); ctx.lineTo(e[0], e[1]);
      ctx.moveTo(s[0] - nx * cap / 2, s[1] - ny * cap / 2); ctx.lineTo(s[0] + nx * cap / 2, s[1] + ny * cap / 2);
      ctx.moveTo(e[0] - nx * cap / 2, e[1] - ny * cap / 2); ctx.lineTo(e[0] + nx * cap / 2, e[1] + ny * cap / 2);
      ctx.stroke();
      const lu = clamp((u - .35) / .65);
      if (lu > 0 && p.label) {
        const text = fa ? T.fa(p.label) : p.label, font = KIT.face(fa ? 'display' : p.kind, p.size * (fa ? .88 : 1), p.weight), tw = T.width(font, text, fa ? 'rtl' : 'ltr');
        const lx = side === 'left' ? mid[0] - p.labelGap - tw / 2 - p.cap / 2 : side === 'right' ? mid[0] + p.labelGap + tw / 2 + p.cap / 2 : mid[0];
        const ly = side === 'above' ? mid[1] - p.labelGap - p.cap / 2 : side === 'below' ? mid[1] + p.labelGap + p.size * .8 + p.cap / 2 : mid[1] + p.size * .3;
        const sc = E.outBack(lu); ctx.translate(lx, ly - p.size * .3); ctx.scale(sc, sc); ctx.translate(-lx, -(ly - p.size * .3));
        ctx.globalAlpha = p.alpha * E.outCubic(lu);
        if (p.plate) { ctx.fillStyle = col(p.plate); ctx.beginPath(); ctx.roundRect(lx - tw / 2 - 18, ly - p.size * .86, tw + 36, p.size * 1.12, 10); ctx.fill(); }
        ctx.font = font; ctx.fillStyle = col(p.labelColor); ctx.textBaseline = 'alphabetic'; T.put(ctx, text, lx, ly, 'center', fa);
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Label Line ═══════════════ */
  KIT.piece('label-line', {
    group: 'diagram',
    doc: 'A label joined to a point by a thin line with a dot on the end. It draws out from the point.',
    defaults: { point: [540, 900], to: [820, 760], text: 'Quads', size: 48, weight: 700, color: 'normal', lineColor: 'soft', dot: 9, width: 3, at: 0, dur: .5, kind: 'ui', fa: null, plate: null, alpha: 1, hold: 28 },
    params: {
      point: '[x, y] the point being labelled (or a function of time, to follow a moving point)', to: '[x, y] where the line ends and the label starts (or a function of time)', text: 'the label', size: 'label size (px)', weight: 'label weight', color: 'label colour', lineColor: 'line and dot colour',
      dot: 'dot radius (px)', width: 'line width (px)', at: 'when it starts (s)', dur: 'how long it takes (s)', kind: 'type kind', fa: 'true = Farsi', plate: 'a plate colour behind the label (null = none)',
      alpha: 'strength', hold: 'the short flat run before the label (px)',
    },
    cues: () => [{ dt: 0, kind: 'sound', props: { id: 'click' } }],
    draw(ctx, t, p) {
      if (t < p.at) return;
      const P = KIT.val(p.point, t), Q = KIT.val(p.to, t), u = E.outExpo(prog(t, p.at, p.dur)), fa = isFa(p), right = Q[0] >= P[0];
      const e = [lerp(P[0], Q[0], u), lerp(P[1], Q[1], u)], flat = (right ? 1 : -1) * p.hold * clamp((u - .6) / .4);
      ctx.save(); ctx.globalAlpha = p.alpha; ctx.strokeStyle = col(p.lineColor); ctx.fillStyle = col(p.lineColor); ctx.lineWidth = p.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(P[0], P[1]); ctx.lineTo(e[0], e[1]); if (flat) ctx.lineTo(e[0] + flat, e[1]); ctx.stroke();
      ctx.beginPath(); ctx.arc(P[0], P[1], p.dot * E.outBack(clamp(u * 3)), 0, Math.PI * 2); ctx.fill();
      const lu = clamp((u - .55) / .45);
      if (lu > 0 && p.text) {
        const text = p.text, font = KIT.face(fa ? 'display' : p.kind, p.size * (fa ? .9 : 1), p.weight), tw = T.width(font, text, fa ? 'rtl' : 'ltr');
        const lx = Q[0] + (right ? 1 : -1) * (p.hold + 14), ly = Q[1] + p.size * .32, x = right ? lx : lx - 0;
        ctx.globalAlpha = p.alpha * E.outCubic(lu);
        if (p.plate) { ctx.fillStyle = col(p.plate); ctx.beginPath(); ctx.roundRect((right ? lx : lx - tw) - 14, ly - p.size * .88, tw + 28, p.size * 1.18, 10); ctx.fill(); }
        ctx.font = font; ctx.fillStyle = col(p.color); ctx.textBaseline = 'alphabetic';
        T.put(ctx, text, x, ly + (1 - E.outExpo(lu)) * 10, right ? 'left' : 'right', fa);
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Chain ═══════════════ */
  const NODE_ROLE = {
    normal: { fill: 'rgba(242,238,229,.05)', stroke: 'rgba(242,238,229,.55)', text: 'normal' },
    soft: { fill: 'rgba(242,238,229,.03)', stroke: 'rgba(242,238,229,.28)', text: 'soft' },
    key: { fill: 'key', stroke: null, text: 'clayWhite' },
    fix: { fill: 'fix', stroke: null, text: 'clayWhite' },
  };
  KIT.piece('chain', {
    group: 'diagram',
    doc: 'A chain of ideas builds one step at a time. Each idea pops in, and an arrow draws itself to the next.',
    defaults: {
      nodes: [{ text: 'Strength' }, { text: 'Force × time' }, { text: 'Rate of force development' }, { text: 'Sport performance', role: 'key' }],
      dir: 'down', x: 540, y: 960, w: 800, minH: 150, gap: 108, size: 66, weight: 800, anchor: 'center', at: 0, step: .85, dur: .45, linkDur: .35,
      stroke: 4, radius: 26, arrowColor: 'soft', caps: true, kind: 'display', fa: null,
    },
    params: {
      nodes: 'a list of { text, role?: normal | soft | key | fix }', dir: 'down (a column) | across (a row, right to left in Farsi)', x: 'centre x of the chain', y: 'centre (or top) y of the chain', w: 'width of one node (px)',
      minH: 'least height of a node (px)', gap: 'space between nodes, where the arrow lives (px)', size: 'text size (px)', weight: 'text weight', anchor: 'center | top: what y means', at: 'when the first node starts (s)',
      step: 'time between nodes (s)', dur: 'how long a node takes to pop in (s)', linkDur: 'how long an arrow takes to draw (s)', stroke: 'outline width (px)', radius: 'corner roundness (px)',
      arrowColor: 'colour of the arrows', caps: 'uppercase English (never Farsi)', kind: 'type kind', fa: 'true = Farsi',
    },
    cues: p => p.nodes.flatMap((n, i) => [{ dt: i * p.step, kind: 'sound', props: { id: 'click' } }].concat(i < p.nodes.length - 1 ? [{ dt: i * p.step + p.dur * .7, kind: 'sound', props: { id: 'swish' } }] : [])),
    draw(ctx, t, p) {
      const fa = isFa(p), n = p.nodes.length, across = p.dir === 'across';
      const size = p.size * (fa ? .88 : 1), font = KIT.face(fa ? 'display' : p.kind, size, p.weight), lh = size * (fa ? 1.3 : 1.08), padX = 30, padY = 26;
      /* measure every node: its lines and its box */
      const nodes = p.nodes.map(nd => {
        const txt = (p.caps && !fa) ? nd.text.toUpperCase() : nd.text, lines = T.balance(font, txt, p.w - padX * 2, fa ? 'rtl' : 'ltr');
        return { nd, lines, h: Math.max(p.minH, lines.length * lh + padY * 2), w: p.w };
      });
      /* place them */
      let total, pos = [];
      if (!across) {
        total = nodes.reduce((s, q) => s + q.h, 0) + p.gap * (n - 1);
        let y = p.anchor === 'center' ? p.y - total / 2 : p.y;
        for (const q of nodes) { pos.push({ x: p.x - q.w / 2, y, w: q.w, h: q.h }); y += q.h + p.gap; }
      } else {
        const hmax = Math.max(...nodes.map(q => q.h)); total = n * p.w + p.gap * (n - 1);
        let x = p.x - total / 2;
        for (let i = 0; i < n; i++) { const idx = fa ? n - 1 - i : i; pos[idx] = { x, y: (p.anchor === 'center' ? p.y - hmax / 2 : p.y), w: p.w, h: hmax }; x += p.w + p.gap; }
      }
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';
      nodes.forEach((q, i) => {
        const r = pos[i], t0 = p.at + i * p.step, u = prog(t, t0, p.dur);
        if (u > 0) {
          const e = E.outBack(u, 1.4), role = NODE_ROLE[q.nd.role || 'normal'] || NODE_ROLE.normal, cx = r.x + r.w / 2, cy = r.y + r.h / 2;
          ctx.save(); ctx.translate(cx, cy + (1 - E.outExpo(u)) * 26); ctx.scale(lerp(.9, 1, e), lerp(.9, 1, e)); ctx.globalAlpha = E.outCubic(u);
          ctx.beginPath(); ctx.roundRect(-r.w / 2, -r.h / 2, r.w, r.h, p.radius);
          ctx.fillStyle = KIT.role(role.fill); ctx.fill();
          if (role.stroke) { ctx.strokeStyle = role.stroke; ctx.lineWidth = p.stroke; ctx.stroke(); }
          ctx.font = font; ctx.fillStyle = KIT.role(role.text);
          q.lines.forEach((s, k) => T.put(ctx, s, 0, -(q.lines.length * lh) / 2 + lh * (k + .78), 'center', fa));
          ctx.restore();
        }
        if (i < n - 1) {
          const nx = pos[i + 1], a = r, lu = prog(t, t0 + p.dur * .7, p.linkDur);
          if (lu > 0) {
            const from = across ? [fa ? a.x : a.x + a.w, a.y + a.h / 2] : [a.x + a.w / 2, a.y + a.h], to = across ? [fa ? nx.x + nx.w : nx.x, nx.y + nx.h / 2] : [nx.x + nx.w / 2, nx.y];
            KIT.draw('arrow', ctx, t, { from, to, at: t0 + p.dur * .7, dur: p.linkDur, color: p.arrowColor, width: 7, head: 30, trimStart: 12, trimEnd: 10 });
          }
        }
      });
      ctx.restore();
    },
  });

  /* ═══════════════ Signal Key ═══════════════ */
  const KEYROWS = {
    en: [
      { role: 'normal', name: 'NORMAL', sample: 'Short bursts' },
      { role: 'key', name: 'KEY WORD', sample: 'Acceleration' },
      { role: 'fix', name: 'THE FIX', sample: 'Train it' },
      { role: 'soft', name: 'DETAIL', sample: '2 to 13 m' },
      { role: 'problem', name: 'MISTAKE', sample: 'Slow strength' },
    ],
    fa: [
      { role: 'normal', name: 'معمولی', sample: 'شتاب‌گیری کوتاه' },
      { role: 'key', name: 'کلیدی', sample: 'شتاب' },
      { role: 'fix', name: 'راه‌حل', sample: 'تمرینش بده' },
      { role: 'soft', name: 'جزئیات', sample: '۲ تا ۱۳ متر' },
      { role: 'problem', name: 'اشتباه', sample: 'فقط قدرت' },
    ],
  };
  KIT.piece('signal-key', {
    group: 'diagram',
    doc: 'The colour language on one screen: bone is normal, clay is the key word, green is the fix, grey is detail, a clay strike-through is a mistake.',
    defaults: { rows: null, x: 88, y: 480, w: 904, size: 112, at: 0, step: .5, rowGap: 268, fa: null },
    params: { rows: 'a list of { role, name, sample } (null = the five standard roles)', x: 'left edge (px)', y: 'top of the first row (px)', w: 'width (px)', size: 'size of the example words (px)', at: 'when the first row starts (s)', step: 'time between rows (s)', rowGap: 'distance from one row to the next (px)', fa: 'true = Farsi' },
    cues: p => (p.rows || KEYROWS.en).map((_, i) => ({ dt: i * p.step, kind: 'sound', props: { id: 'click' } })),
    draw(ctx, t, p) {
      const fa = isFa(p), rows = p.rows || KEYROWS[fa ? 'fa' : 'en'], size = p.size * (fa ? .84 : 1), font = KIT.face(fa ? 'display' : 'display', size, 800), nameFont = fa ? KIT.face('ui', 38, 700) : KIT.face('mono', 32, 700);
      const edge = fa ? p.x + p.w : p.x, dir = fa ? -1 : 1;
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';
      rows.forEach((r, i) => {
        const u = prog(t, p.at + i * p.step, .5); if (u <= 0) return;
        const y = p.y + i * p.rowGap, e = E.outExpo(u), look = KIT.look(KIT.activeLook);
        ctx.save(); ctx.globalAlpha = E.outCubic(u); ctx.translate(0, (1 - e) * 36);
        /* the swatch and the name of the role */
        const sw = { normal: look.normal, key: look.key, fix: look.fix, soft: look.normal, problem: look.key }[r.role] || look.normal;
        ctx.fillStyle = r.role === 'soft' ? col('normal', .5) : col(sw); ctx.beginPath(); ctx.arc(edge + dir * 16, y - 8, 16, 0, Math.PI * 2); ctx.fill();
        ctx.font = nameFont; if (!fa) ctx.letterSpacing = '4px'; ctx.fillStyle = col('soft'); T.put(ctx, r.name, edge + dir * 52, y, fa ? 'right' : 'left', fa); ctx.letterSpacing = '0px';
        /* the example word, set the way that role is set */
        const word = (!fa && r.role !== 'soft') ? r.sample.toUpperCase() : r.sample, wy = y + size * .95, ww = T.width(font, word, fa ? 'rtl' : 'ltr'), left = fa ? edge - ww : edge;
        ctx.font = font;
        if (r.role === 'key') { const pad = size * .14; ctx.fillStyle = col('key'); ctx.beginPath(); ctx.roundRect(left - pad, wy - size * .86, ww + pad * 2, size * 1.04, size * .08); ctx.fill(); ctx.fillStyle = col('clayWhite'); }
        else ctx.fillStyle = col({ normal: 'normal', fix: 'fixText', soft: 'soft', problem: 'normal' }[r.role] || 'normal', r.role === 'problem' ? .5 : 1);
        T.put(ctx, word, left, wy, 'left', fa);
        if (r.role === 'problem') { ctx.strokeStyle = col('key'); ctx.lineWidth = size * .08; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(left - 10, wy - size * .3); ctx.lineTo(left + ww + 10, wy - size * .3); ctx.stroke(); }
        ctx.restore();
      });
      ctx.restore();
    },
  });
})(window);
