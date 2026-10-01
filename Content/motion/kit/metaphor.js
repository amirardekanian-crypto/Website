/* metaphor.js — two visual metaphors for hard S&C ideas: Rev Dial (ENGINE, POWER, SPEED) and Not Equal (BIG FORCE is not SPORT PERFORMANCE).
 *
 * Use at most one metaphor in a video, and only after a curve or a diagram has shown the real mechanism (INGREDIENTS.md):
 * the metaphor is for the takeaway, not the explanation.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const T = KIT.text;
  const isFa = p => (p.fa != null ? !!p.fa : KIT.rtl());
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };
  const rad = d => d * Math.PI / 180;

  /* ═══════════════ Rev Dial ═══════════════ */
  KIT.piece('rev-dial', {
    group: 'metaphor',
    doc: 'A rev counter. The needle climbs in steps, springing past each mark, and the word in the middle changes with it: ENGINE, POWER, SPEED.',
    defaults: {
      x: 540, y: 900, r: 380, from: 0, steps: [{ at: .5, value: .2, text: 'ENGINE' }, { at: 1.4, value: .52, text: 'POWER' }, { at: 2.3, value: .9, text: 'SPEED' }], at: 0, hz: 2.4, damp: .36, size: 118, zoneFrom: .78,
      track: 'rgba(242,238,229,.16)', fill: 'normal', zone: 'key', needle: 'key', textColor: 'normal', kind: 'display', fa: null,
    },
    params: {
      x: 'centre (px)', y: 'centre (px)', r: 'radius (px)', from: 'where the needle starts (0 to 1)', steps: 'the climb: a list of { at: seconds, value: where the needle goes (0 to 1), text: the word in the middle }',
      at: 'when the dial appears (s)', hz: 'springiness of the needle (swings per second)', damp: 'how fast the swinging dies (0 to 1)', size: 'size of the word (px)', zoneFrom: 'where the top zone starts (0 to 1)',
      track: 'colour of the dial track', fill: 'colour of the lit part of the track', zone: 'colour of the zone at the top', needle: 'colour of the needle', textColor: 'colour of the word', kind: 'type kind', fa: 'true = Farsi',
    },
    cues: p => p.steps.map((s, i) => ({ dt: s.at, kind: 'sound', props: { id: i === p.steps.length - 1 ? 'rush' : 'thump' } })),
    draw(ctx, t, p) {
      if (t < p.at) return;
      const fa = isFa(p), a0 = 135, sweep = 270, u0 = E.outExpo(prog(t, p.at, .6)), R = p.r, tt = t - p.at;
      let val = p.from, prev = p.from, idx = -1;
      p.steps.forEach((s, i) => { if (tt >= s.at) { val = lerp(prev, s.value, L.spring(tt - s.at, p.hz, p.damp)); idx = i; } prev = s.value; });
      val = clamp(val, -.04, 1.07);
      const ang = a0 + sweep * val;
      ctx.save(); ctx.translate(p.x, p.y); ctx.globalAlpha = u0; ctx.lineCap = 'round';
      const arc = (v0, v1, w, c) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.arc(0, 0, R, rad(a0 + sweep * v0), rad(a0 + sweep * v1)); ctx.stroke(); };
      arc(0, 1, 26, col(p.track)); arc(p.zoneFrom, 1, 26, col(p.zone, .35)); if (val > 0) arc(0, clamp(val), 26, col(p.fill, .92));
      if (val > p.zoneFrom) arc(p.zoneFrom, clamp(val), 26, col(p.zone));
      for (let i = 0; i <= 40; i++) { const v = i / 40, a = rad(a0 + sweep * v), major = i % 5 === 0, r1 = R - 46, r2 = R - (major ? 86 : 68); ctx.strokeStyle = col(v >= p.zoneFrom ? p.zone : 'normal', major ? .9 : .5); ctx.lineWidth = major ? 5 : 3; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); ctx.stroke(); }
      ctx.save(); ctx.rotate(rad(ang)); ctx.fillStyle = col(p.needle); ctx.beginPath(); ctx.moveTo(R - 40, 0); ctx.lineTo(0, -14); ctx.lineTo(-48, 0); ctx.lineTo(0, 14); ctx.closePath(); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#16181A'; ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = col(p.needle); ctx.lineWidth = 8; ctx.stroke();
      /* the word in the middle: the latest step's, rolling up each time it changes */
      if (idx >= 0) {
        const st = p.steps[idx], size = p.size * (fa ? .8 : 1), ru = E.outExpo(prog(tt, st.at, .35));
        ctx.font = KIT.face(fa ? 'display' : p.kind, size, 900); ctx.fillStyle = col(p.textColor); ctx.textBaseline = 'alphabetic';
        ctx.save(); ctx.beginPath(); ctx.rect(-R, R * .26, R * 2, size * 1.4); ctx.clip();
        T.put(ctx, st.text, 0, R * .26 + size * 1.0 + (1 - ru) * size * 1.1, 'center', fa); ctx.restore();
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Not Equal ═══════════════ */
  KIT.piece('not-equal', {
    group: 'metaphor',
    doc: 'Two ideas, and a not-equal sign that slams down between them, with a thud.',
    defaults: { a: 'Big force', b: 'Sport performance', x: 540, y: 960, w: 904, size: 150, gap: 78, at: 0, step: .55, slamAt: 1.4, signColor: 'key', color: 'normal', kind: 'display', caps: true, fa: null, signSize: 1.35 },
    params: {
      a: 'the first idea', b: 'the second idea', x: 'centre (px)', y: 'centre of the whole thing (px)', w: 'widest the words may be (px)', size: 'size of the words (px)', gap: 'space between the words and the sign (px)',
      at: 'when the first word appears (s)', step: 'time between the two words (s)', slamAt: 'when the sign slams down (s)', signColor: 'colour of the sign', color: 'colour of the words', kind: 'type kind', caps: 'uppercase English (never Farsi)', fa: 'true = Farsi', signSize: 'size of the sign as a multiple',
    },
    cues: p => [{ dt: 0, kind: 'sound', props: { id: 'click' } }, { dt: p.step, kind: 'sound', props: { id: 'click' } }, { dt: p.slamAt, hit: .8, props: { id: 'boom' } }],
    draw(ctx, t, p, env) {
      const fa = isFa(p), size = p.size * (fa ? .86 : 1), font = KIT.face(fa ? 'display' : p.kind, size, 900), cap = s => (p.caps && !fa ? s.toUpperCase() : s);
      const lines = s => T.balance(font, cap(s), p.w, fa ? 'rtl' : 'ltr'), A = lines(p.a), B = lines(p.b), lh = size * (fa ? 1.2 : 1.0), hA = A.length * lh, hB = B.length * lh, signH = 120 * p.signSize;
      const total = hA + p.gap + signH + p.gap + hB, top = p.y - total / 2, yA = top, yS = top + hA + p.gap, yB = yS + signH + p.gap;
      ctx.save(); ctx.textBaseline = 'alphabetic'; ctx.font = font; ctx.fillStyle = col(p.color);
      const word = (ls, y, at) => { const u = prog(t, at, .5); if (u <= 0) return; ctx.globalAlpha = E.outCubic(u); ls.forEach((s, i) => T.put(ctx, s, p.x, y + lh * (i + .82) + (1 - E.outExpo(u)) * 40, 'center', fa)); ctx.globalAlpha = 1; };
      word(A, yA, p.at); word(B, yB, p.at + p.step);
      /* the sign: two bars and a slash, drawn as shapes so it needs no font, slamming down from large */
      const su = prog(t, p.slamAt - .22, .22);
      if (su > 0) {
        const sc = lerp(3.2, 1, E.inQuad(su)) * p.signSize, cy = yS + signH / 2, w = 150, bh = 20, off = 28, a = clamp(su * 3);
        ctx.save(); ctx.translate(p.x, cy); ctx.scale(sc, sc); ctx.globalAlpha = a; ctx.fillStyle = col(p.signColor); ctx.strokeStyle = col(p.signColor);
        ctx.beginPath(); ctx.roundRect(-w / 2, -off - bh / 2, w, bh, bh / 2); ctx.fill(); ctx.beginPath(); ctx.roundRect(-w / 2, off - bh / 2, w, bh, bh / 2); ctx.fill();
        ctx.lineWidth = bh; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-34, 74); ctx.lineTo(34, -74); ctx.stroke(); ctx.restore();
        if (t >= p.slamAt) KIT.draw('shock-ring', ctx, t, { x: p.x, y: cy, r0: 50, r1: 620, at: p.slamAt, dur: .55, color: KIT.role(p.signColor), width: 6, alpha: .8 });
      }
      ctx.restore();
    },
  });
})(window);
