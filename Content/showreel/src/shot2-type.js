/* SHOT 2 — TYPE  (bar 2, 1.875–3.750 s)
 *
 * "EVERY FRAME IS a DECISION" on coral, one word per 8th note, each with its own motion:
 * a mask rise (EVERY), a staggered drop with overshoot (FRAME), an elastic pop (IS) and a swung-in serif italic (a),
 * then DECISION slides in letter by letter while its weight sweeps 200 → 900 and, on beat 3, extrudes into
 * 3D with a camera hit. A cubic-bezier graph editor sits top right and re-tunes its curve on every word;
 * a keyframe strip under it pops a diamond per word.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, spring, bezier, hash, rgbaHex, mixHex } = L;
  const BEAT = R.BEAT, W = R.W, H = R.H, S8 = BEAT / 2;
  const FS = 176, X0 = 118, BASE = [300, 496, 692, 888];
  const INK = PAL.ink, BONE = PAL.bone;
  const LAY = {};
  const WORDS = ['EVERY', 'FRAME', 'IS'];

  R.inits.push(() => {
    const c = L.canvas(8, 8).getContext('2d');
    c.font = L.fnt(900, FS);
    LAY.cap = L.capHeight(c);
    for (const w of WORDS) LAY[w] = L.chars(c, w, 0);
    LAY.serif = `italic 400 ${Math.round(FS * 1.62)}px "Instrument Serif"`;
  });

  /* cues: every word is a hit on the 8th-note grid */
  const T0 = R.BAR * 1;                              // this shot starts on bar 2
  R.hit(T0, 1, { drop: 1 });                         // bar line: the flood lands, EVERY rises
  R.cue(T0 + S8, 'stab', { i: 0, amp: .6 });         // FRAME
  R.hit(T0 + BEAT, .45, { i: 1 });                   // IS a
  R.cue(T0 + S8 * 3, 'stab', { i: 2, amp: .7 });     // DECISION starts
  R.hit(T0 + BEAT * 2, .95, { big: 1 });             // …and extrudes
  R.cue(T0 + BEAT * 3 - .1, 'whoosh', { dir: 'in', dur: .5 });

  const EASES = [[.16, 1, .3, 1, 'outExpo'], [.34, 1.56, .64, 1, 'outBack'], [.65, 0, .35, 1, 'inOutCubic'], [.7, -.45, .25, 1.3, 'anticipate']];

  function glyph(ctx, ch, cx, by, o) {
    ctx.save();
    ctx.translate(cx + (o.dx || 0), by - LAY.cap / 2 + (o.dy || 0));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy);
    ctx.globalAlpha *= (o.a == null ? 1 : o.a);
    ctx.font = o.font; ctx.fillStyle = o.color; ctx.textAlign = 'center';
    ctx.fillText(ch, 0, LAY.cap / 2);
    ctx.restore();
  }

  /* DECISION: per-letter state, positions flow with the weight sweep */
  function decisionLetters(ctx, t) {
    const str = 'DECISION', out = [];
    let x = X0;
    for (let i = 0; i < str.length; i++) {
      const st = S8 * 3 + i * .011;
      const ep = E.outExpo(prog(t, st, .24));
      const wgt = Math.round(lerp(200, 900, E.outCubic(prog(t, st, .22))));
      ctx.font = L.fnt(wgt, FS);
      const adv = ctx.measureText(str[i]).width;
      out.push({ ch: str[i], x: x + adv / 2, wgt, dx: (1 - ep) * (620 + i * 60), a: clamp(prog(t, st, .05) * 1), font: L.fnt(wgt, FS) });
      x += adv;
    }
    return out;
  }

  function words(ctx, t, push) {
    const F9 = L.fnt(900, FS);
    ctx.save(); ctx.translate(-push, 0);

    /* EVERY — rises out from under its baseline */
    ctx.save(); ctx.beginPath(); ctx.rect(X0 - 80, BASE[0] - LAY.cap - 80, 1100, LAY.cap + 80 + 5); ctx.clip();
    for (let i = 0; i < 5; i++) {
      const w = LAY.EVERY, p = E.outExpo(prog(t, i * .028, .36));
      glyph(ctx, 'EVERY'[i], X0 + w.xs[i] + w.ws[i] / 2, BASE[0], { dy: (1 - p) * (LAY.cap + 80), font: F9, color: INK });
    }
    ctx.restore();

    /* FRAME — drops in with a rotation and an overshoot */
    for (let i = 0; i < 5; i++) {
      const w = LAY.FRAME, p = prog(t, S8 + i * .03, .36), e = E.outBack(p, 1.6);
      if (p <= 0) continue;
      glyph(ctx, 'FRAME'[i], X0 + w.xs[i] + w.ws[i] / 2, BASE[1], {
        dy: (e - 1) * 360, rot: (1 - e) * -.3, sx: 1 + (1 - e) * .25, sy: 1 + (1 - e) * .25, a: clamp(p * 9), font: F9, color: INK,
      });
    }

    /* IS — elastic pop;  a — swings in, serif italic */
    for (let i = 0; i < 2; i++) {
      const w = LAY.IS, p = prog(t, BEAT + i * .035, .55), s = E.outElastic(p);
      if (p <= 0) continue;
      glyph(ctx, 'IS'[i], X0 + w.xs[i] + w.ws[i] / 2, BASE[2], { sx: s, sy: s, font: F9, color: INK });
    }
    {
      const p = prog(t, BEAT + .09, .6), e = E.outBack(p, 2.2);
      if (p > 0) {
        ctx.font = LAY.serif; const aw = ctx.measureText('a').width;
        glyph(ctx, 'a', X0 + LAY.IS.total + FS * .3 + aw / 2, BASE[2] + 2, { dx: (1 - e) * -220, rot: (1 - e) * -.9, a: clamp(p * 7), font: LAY.serif, color: BONE });
      }
    }

    /* DECISION — weight sweep, then 3D extrusion on the beat */
    const dl = decisionLetters(ctx, t);
    const depth = 36 * E.outElastic(prog(t, BEAT * 2, .6));
    if (depth > 1) {
      const steps = Math.round(depth);
      for (let k = steps; k >= 1; k--) {
        const col = mixHex(BONE, '#B7AD99', k / 44);
        for (const l of dl) glyph(ctx, l.ch, l.x + k * .56, BASE[3] + k * .83, { dx: l.dx, font: l.font, color: col, a: l.a });
      }
    }
    for (const l of dl) glyph(ctx, l.ch, l.x, BASE[3], { dx: l.dx, font: l.font, color: INK, a: l.a });
    ctx.restore();
  }

  /* the graph editor */
  function panel(ctx, t) {
    const pe = spring(t - .02, 2.1, .6);
    const ex = (1 - pe) * 820;
    if (pe <= 0) return;
    const px = 1180 + ex, py = 150, pw = 620, ph = 440;
    ctx.save();
    ctx.translate(px, py); ctx.rotate((1 - pe) * -.05);
    ctx.shadowColor = 'rgba(110,22,0,.5)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 28;
    ctx.fillStyle = INK; L.roundedRect(ctx, 0, 0, pw, ph, 28); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.strokeStyle = rgbaHex(BONE, .1); ctx.lineWidth = 1.5; L.roundedRect(ctx, .75, .75, pw - 1.5, ph - 1.5, 28); ctx.stroke();

    // header
    const k = Math.max(0, Math.floor(t / S8)), cur = EASES[k % 4], prev = EASES[(k + 3) % 4];
    ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(34, 38, 7, 0, L.TAU); ctx.fill();
    ctx.font = '500 14px "JetBrains Mono"'; ctx.letterSpacing = '2.4px';
    ctx.fillStyle = rgbaHex(BONE, .6); ctx.textAlign = 'left'; ctx.fillText('GRAPH EDITOR', 54, 43);
    ctx.fillStyle = rgbaHex(BONE, .95); ctx.textAlign = 'right'; ctx.fillText(cur[4].toUpperCase(), pw - 30, 43);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = rgbaHex(BONE, .08); ctx.fillRect(0, 70, pw, 1.5);

    // plot area (y runs -0.3 … 1.3 so overshoot is visible)
    const gx = 50, gw = pw - 100, gt = 100, gh = 272, ylo = -.3, yhi = 1.3;
    const X = u => gx + u * gw, Y = v => gt + gh - (v - ylo) / (yhi - ylo) * gh;
    ctx.strokeStyle = rgbaHex(BONE, .07); ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(X(i / 4), gt); ctx.lineTo(X(i / 4), gt + gh); ctx.stroke(); }
    for (const v of [0, .5, 1]) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); }
    ctx.strokeStyle = rgbaHex(BONE, .22); ctx.setLineDash([5, 6]);
    for (const v of [0, 1]) { ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke(); }
    ctx.setLineDash([]);

    // the curve, morphing between presets on every 8th note (handles flick with an overshoot)
    const m = E.outBack(prog(t - k * S8, 0, .16), 2.2);
    const P = [0, 1, 2, 3].map(i => lerp(prev[i], cur[i], m));
    const x1 = clamp(P[0]), x2 = clamp(P[2]), y1 = P[1], y2 = P[3];
    const ez = bezier(x1, y1, x2, y2);
    ctx.strokeStyle = BONE; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64, v = ez(u); i ? ctx.lineTo(X(u), Y(v)) : ctx.moveTo(X(u), Y(v)); } ctx.stroke();
    // handles
    ctx.strokeStyle = rgbaHex(PAL.coral, .95); ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(x1), Y(y1)); ctx.moveTo(X(1), Y(1)); ctx.lineTo(X(x2), Y(y2)); ctx.stroke();
    for (const [hx, hy] of [[x1, y1], [x2, y2]]) {
      ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(X(hx), Y(hy), 10, 0, L.TAU); ctx.fill();
      ctx.strokeStyle = BONE; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X(hx), Y(hy), 10, 0, L.TAU); ctx.stroke();
    }
    ctx.fillStyle = BONE; for (const [ax, ay] of [[0, 0], [1, 1]]) ctx.fillRect(X(ax) - 5, Y(ay) - 5, 10, 10);

    // the playhead runs the curve once per word
    const s = prog(t - k * S8, .02, .2), val = ez(s);
    ctx.strokeStyle = rgbaHex(PAL.coral, .55); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(X(s), gt); ctx.lineTo(X(s), gt + gh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(gx, Y(val)); ctx.lineTo(X(s), Y(val)); ctx.stroke();
    L.glow(ctx, X(s), Y(val), 34, PAL.coral, .9);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X(s), Y(val), 8, 0, L.TAU); ctx.fill();

    // readout
    ctx.font = '500 14px "JetBrains Mono"'; ctx.letterSpacing = '1px'; ctx.textAlign = 'left';
    ctx.fillStyle = rgbaHex(BONE, .55);
    ctx.fillText(`cubic-bezier(${x1.toFixed(2)}, ${y1.toFixed(2)}, ${x2.toFixed(2)}, ${y2.toFixed(2)})`, 30, ph - 26);
    ctx.textAlign = 'right'; ctx.fillStyle = rgbaHex(BONE, .9); ctx.fillText(`y ${val.toFixed(3)}`, pw - 30, ph - 26);
    ctx.letterSpacing = '0px';
    ctx.restore();

    /* keyframe strip */
    const sx0 = 1180 + ex, sx1 = sx0 + pw, sy = 650;
    ctx.fillStyle = rgbaHex(INK, .55); ctx.font = '500 14px "JetBrains Mono"'; ctx.letterSpacing = '2.4px'; ctx.textAlign = 'left';
    ctx.fillText('KEYFRAMES', sx0, sy - 30);
    ctx.fillStyle = rgbaHex(INK, .9); ctx.fillRect(sx0, sy - 1, pw, 2);
    const evs = [0, S8, BEAT, S8 * 3, BEAT * 2];
    evs.forEach(et => {
      const dp = E.outBack(prog(t, et, .3), 2.4); if (dp <= 0) return;
      const dx = sx0 + pw * (et / R.BAR), r = 11 * dp;
      ctx.save(); ctx.translate(dx, sy); ctx.rotate(Math.PI / 4); ctx.fillStyle = INK; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore();
    });
    const ph_x = sx0 + pw * clamp(t / R.BAR);
    ctx.fillStyle = BONE; ctx.fillRect(ph_x - 1.5, sy - 22, 3, 44);
    ctx.letterSpacing = '0px';
  }

  /* the spring card: a ball on a rail, re-sprung on every word (alternating ends); the numbers are the real spring */
  function springCard(ctx, t) {
    const pe = spring(t - .1, 2.1, .62); if (pe <= 0) return;
    const w = 470, h = 150, x = 1330 + (1 - pe) * 720, y = 750;
    ctx.save(); ctx.translate(x, y); ctx.rotate((1 - pe) * -.04);
    ctx.shadowColor = 'rgba(110,22,0,.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 24;
    ctx.fillStyle = INK; L.roundedRect(ctx, 0, 0, w, h, 26); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    const k = Math.max(0, Math.floor(t / S8)), tau = t - k * S8, f = 3.6, z = .42;
    const pos = (tt) => { const a0 = (k % 2) ? 1 : 0, a1 = 1 - a0; return a0 + (a1 - a0) * spring(tt, f, z); };
    ctx.font = '500 14px "JetBrains Mono"'; ctx.letterSpacing = '2.4px'; ctx.textAlign = 'left';
    ctx.fillStyle = rgbaHex(BONE, .6); ctx.fillText('SPRING', 30, 40);
    ctx.textAlign = 'right'; ctx.fillStyle = rgbaHex(BONE, .9);
    const om = L.TAU * f; ctx.fillText(`k ${(om * om).toFixed(0)} · c ${(2 * z * om).toFixed(1)}`, w - 30, 40); ctx.letterSpacing = '0px';
    const x0 = 40, x1 = w - 40, yr = 96;
    ctx.fillStyle = rgbaHex(BONE, .22); ctx.fillRect(x0, yr - 1.5, x1 - x0, 3);
    ctx.fillStyle = rgbaHex(BONE, .5); ctx.fillRect(x0 - 1.5, yr - 14, 3, 28); ctx.fillRect(x1 - 1.5, yr - 14, 3, 28);
    for (let j = 6; j >= 1; j--) {                      // short motion trail
      const px = x0 + (x1 - x0) * pos(Math.max(0, tau - j * .014));
      ctx.fillStyle = rgbaHex(PAL.coral, .1 * (7 - j)); ctx.beginPath(); ctx.arc(px, yr, 12 - j * .8, 0, L.TAU); ctx.fill();
    }
    const bx = x0 + (x1 - x0) * pos(tau);
    L.glow(ctx, bx, yr, 46, PAL.coral, .8);
    ctx.fillStyle = PAL.coral; ctx.beginPath(); ctx.arc(bx, yr, 13, 0, L.TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(bx - 3, yr - 4, 4, 0, L.TAU); ctx.fill();
    ctx.restore();
  }

  R.shot({
    id: 'shot2-type', label: 'TYPE', hud: { color: INK }, samples: 14,
    fx: { bloom: .12, ca: .45, grain: .045, vig: .22 },
    draw(ctx, t, e) {
      const bg = ctx.createRadialGradient(W * .3, H * .42, 100, W * .5, H * .5, 1250);
      bg.addColorStop(0, '#FF6A45'); bg.addColorStop(1, '#F24A24');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      const z = 1 + .035 * clamp(t / R.BAR);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(z, z); ctx.translate(-W / 2, -H / 2);
      const push = 300 * E.inCubic(prog(t, 1.46, .42));
      words(ctx, t, push);
      panel(ctx, t - 0);
      springCard(ctx, t);
      ctx.restore();

      // the beat-3 hit: a bone flash that decays fast
      const fl = t > BEAT * 2 ? Math.exp(-(t - BEAT * 2) * 16) * .2 : 0;
      if (fl > .01) { ctx.fillStyle = rgbaHex(BONE, fl); ctx.fillRect(0, 0, W, H); }
    },
  });
})(window);
