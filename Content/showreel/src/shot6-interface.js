/* SHOT 6 — INTERFACE  (bar 6, 9.375–11.250 s)
 *
 * A light bento dashboard after the dark of the last shot. Seven cards spring in on a stagger and every one has its
 * own micro-interaction: a chart that draws itself with a tooltip, a donut that counts to 87, a toggle driven by a
 * cursor click, a slider drag, springy bars, a live fps counter with an ECG strip, a checklist that ticks itself.
 * The cursor is a real path with ease, press and click ripples. Springs everywhere (L.spring).
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, spring, hash, hex, mixC, rgb, rgbaHex } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W, H = R.H, S8 = BEAT / 2;
  const T0 = BAR * 5;
  const INK = PAL.ink, WHITE = '#FFFFFF', GREY = '#EDEAE3', MUTE = 'rgba(11,11,16,.5)';

  /* cues */
  R.hit(T0, .7, { flip: 1 });
  [-.16, -.12, -.09, -.06, -.03, 0, .03].forEach((d, i) => R.cue(T0 + d, 'ui', { i }));
  R.cue(T0, 'sweep', { dur: .5, soft: 1 });                          // chart draws
  R.cue(T0 + .66, 'click', { i: 0 });                               // toggle
  R.cue(T0 + .94, 'slide', { dur: .26 });                           // slider drag
  R.cue(T0 + 1.34, 'click', { i: 1 });                              // checklist
  [1.42, 1.5, 1.58].forEach((d, i) => R.cue(T0 + d, 'tick', { i }));
  R.hit(T0 + BEAT * 3, .4, { punch: 1 });
  R.cue(T0 + BEAT * 3 - .12, 'whoosh', { dir: 'pan', dur: .35 });

  const CARDS = {
    A: { x: 110, y: 120, w: 800, h: 440, d: -.16 },
    B: { x: 950, y: 120, w: 360, h: 440, d: -.12 },
    C: { x: 1350, y: 120, w: 460, h: 200, d: -.09 },
    D: { x: 1350, y: 360, w: 460, h: 200, d: -.06 },
    E: { x: 110, y: 600, w: 560, h: 360, d: -.03 },
    F: { x: 710, y: 600, w: 600, h: 360, d: 0 },
    G: { x: 1350, y: 600, w: 460, h: 360, d: .03 },
  };

  const mono = (ctx, size = 14, ls = 2.4) => { ctx.font = `500 ${size}px "JetBrains Mono"`; ctx.letterSpacing = ls + 'px'; };
  const label = (ctx, s, x, y, a = 1, align = 'left') => { mono(ctx); ctx.textAlign = align; ctx.fillStyle = `rgba(11,11,16,${.52 * a})`; ctx.fillText(s, x, y); ctx.letterSpacing = '0px'; };

  function card(ctx, k, t, body, fill) {
    const c = CARDS[k], p = spring(t - c.d, 2.9, .56);
    if (p <= 0) return;
    const wob = Math.sin(t * 1.3 + c.x * .01) * 2.5;
    ctx.save();
    ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - p) * 80 + wob); ctx.scale(lerp(.86, 1, p), lerp(.86, 1, p));
    ctx.translate(-c.w / 2, -c.h / 2);
    ctx.globalAlpha = clamp(p * 3);
    ctx.shadowColor = 'rgba(28,28,60,.13)'; ctx.shadowBlur = 56; ctx.shadowOffsetY = 22;
    ctx.fillStyle = fill || WHITE; L.roundedRect(ctx, 0, 0, c.w, c.h, 34); ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.save(); L.roundedRect(ctx, 0, 0, c.w, c.h, 34); ctx.clip();
    body(ctx, t - c.d - .12, c.w, c.h);
    ctx.restore();
    ctx.restore();
  }

  /* ── A: line chart ── */
  const DATA = [.22, .38, .3, .55, .5, .78, .94];
  function curvePts(x0, y0, w, h) {
    const P = DATA.map((v, i) => [x0 + w * i / (DATA.length - 1), y0 + h * (1 - v)]);
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      for (let s = 0; s < 30; s++) {
        const u = s / 30, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
        out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]);
      }
    }
    out.push(P[P.length - 1]);
    return { out, P };
  }
  function chart(ctx, t, w, h) {
    label(ctx, 'VELOCITY', 40, 56);
    const gx = 44, gy = 130, gw = w - 88, gh = 230;
    ctx.strokeStyle = 'rgba(11,11,16,.07)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * i / 3); ctx.lineTo(gx + gw, gy + gh * i / 3); ctx.stroke(); }
    const { out, P } = curvePts(gx, gy, gw, gh);
    const pr = E.outCubic(prog(t, .04, .62)), n = Math.floor(pr * (out.length - 1));
    if (n > 1) {
      const f = ctx.createLinearGradient(0, gy, 0, gy + gh); f.addColorStop(0, 'rgba(42,69,255,.22)'); f.addColorStop(1, 'rgba(42,69,255,0)');
      ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(out[0][0], gy + gh); for (let i = 0; i <= n; i++) ctx.lineTo(out[i][0], out[i][1]); ctx.lineTo(out[n][0], gy + gh); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = PAL.cobalt; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); for (let i = 0; i <= n; i++) i ? ctx.lineTo(out[i][0], out[i][1]) : ctx.moveTo(out[i][0], out[i][1]); ctx.stroke();
    }
    P.forEach((p, i) => {
      const dp = E.outBack(prog(t, .04 + (i / (P.length - 1)) * .5, .25), 2.4); if (dp <= 0) return;
      ctx.fillStyle = WHITE; ctx.strokeStyle = PAL.cobalt; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(p[0], p[1], 8.5 * dp, 0, L.TAU); ctx.fill(); ctx.stroke();
    });
    ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].forEach((d, i) => label(ctx, d, gx + gw * i / 6, gy + gh + 44, clamp((t - .1 - i * .03) * 6), 'center'));
    // end-point pulse + tooltip
    const tp = spring(t - .6, 3, .5);
    if (tp > 0) {
      const ex = P[6][0], ey = P[6][1], pulse = (t * 1.6) % 1;
      ctx.strokeStyle = rgbaHex(PAL.cobalt, .4 * (1 - pulse)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, 14 + pulse * 26, 0, L.TAU); ctx.stroke();
      ctx.save(); ctx.translate(ex - 46, ey - 62 + (1 - tp) * 24); ctx.scale(tp, tp);
      ctx.fillStyle = INK; L.roundedRect(ctx, -62, -26, 124, 52, 26); ctx.fill();
      ctx.beginPath(); ctx.moveTo(38, 26); ctx.lineTo(46, 36); ctx.lineTo(54, 26); ctx.fill();
      ctx.fillStyle = PAL.bone; ctx.font = '700 24px "Inter Tight"'; ctx.textAlign = 'center'; ctx.fillText('↑ 248%', 0, 9);
      ctx.restore();
    }
  }

  /* ── B: donut ── */
  function donut(ctx, t, w, h) {
    label(ctx, 'FOCUS', 36, 56);
    const cx = w / 2, cy = 252, r = 112, v = .87 * E.outExpo(prog(t, .06, .8));
    ctx.lineWidth = 28; ctx.lineCap = 'round';
    ctx.strokeStyle = GREY; ctx.beginPath(); ctx.arc(cx, cy, r, 0, L.TAU); ctx.stroke();
    if (v > .003) { ctx.strokeStyle = PAL.cobalt; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + L.TAU * v); ctx.stroke(); }
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.font = '700 84px "Unbounded"'; ctx.fillText(String(Math.round(v * 100)), cx - 10, cy + 30);
    ctx.font = '500 30px "Unbounded"'; ctx.fillStyle = MUTE; ctx.fillText('%', cx + 68, cy + 6);
    label(ctx, 'ON TARGET', cx, 410, clamp((t - .3) * 5), 'center');
  }

  /* ── cursor path ── */
  const WAY = [[.2, 1960, 1060], [.62, 1700, 252], [.76, 1702, 254], [.9, 1432, 500], [1.2, 1624, 500], [1.34, 1418, 740], [1.46, 1422, 742], [1.86, 2000, 1000]];
  function cursor(t) {
    let x = WAY[0][1], y = WAY[0][2];
    for (let i = 0; i < WAY.length - 1; i++) {
      const a = WAY[i], b = WAY[i + 1];
      if (t >= a[0] && t < b[0]) { const u = E.inOutCubic((t - a[0]) / (b[0] - a[0])); x = lerp(a[1], b[1], u); y = lerp(a[2], b[2], u); }
      else if (t >= b[0] && i === WAY.length - 2) { x = b[1]; y = b[2]; }
    }
    if (t < WAY[0][0]) return null;
    const press = (t > .66 && t < .74) || (t > .92 && t < 1.2) || (t > 1.34 && t < 1.42);
    return { x, y, press };
  }

  R.shot({
    id: 'shot6-interface', label: 'INTERFACE', hud: { color: INK }, samples: 10,
    fx: { bloom: .06, ca: .3, grain: .04, vig: .08 },
    draw(ctx, t, e) {
      const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, '#F7F4EE'); bg.addColorStop(1, '#ECE6DA');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (t < -.4) return;
      const tt = Math.max(0, t);

      card(ctx, 'A', t, chart);
      card(ctx, 'B', t, donut);

      /* C: toggle */
      card(ctx, 'C', t, (ctx, t, w, h) => {
        label(ctx, 'MOTION BLUR', 36, 56);
        const on = spring(tt - .66, 2.8, .5), kx = lerp(46, 126, on);
        ctx.fillStyle = rgb(mixC(hex('#D9D5CC'), hex(PAL.coral), clamp(on))); L.roundedRect(ctx, 28 + 200, 92, 156, 80, 40); ctx.fill();
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
        ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(228 + kx - 4, 132, 29 * (1 + .06 * Math.sin(clamp(on) * Math.PI)), 0, L.TAU); ctx.fill(); ctx.restore();
        ctx.fillStyle = INK; ctx.font = '700 64px "Unbounded"'; ctx.textAlign = 'left';
        ctx.fillText(on > .5 ? 'ON' : 'OFF', 36, 156);
      });

      /* D: slider */
      const sv = .08 + (.62 - .08) * E.inOutCubic(prog(tt, .94, .26));
      card(ctx, 'D', t, (ctx, t, w, h) => {
        label(ctx, 'EASE', 36, 56);
        ctx.fillStyle = INK; ctx.font = '700 40px "Unbounded"'; ctx.textAlign = 'right'; ctx.fillText(sv.toFixed(2), w - 36, 62);
        const x0 = 50, x1 = w - 50, y = 138;
        ctx.fillStyle = GREY; L.roundedRect(ctx, x0, y - 6, x1 - x0, 12, 6); ctx.fill();
        ctx.fillStyle = INK; L.roundedRect(ctx, x0, y - 6, (x1 - x0) * sv, 12, 6); ctx.fill();
        const kx = x0 + (x1 - x0) * sv, grab = tt > .92 && tt < 1.2 ? 1.18 : 1;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
        ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(kx, y, 22 * grab, 0, L.TAU); ctx.fill(); ctx.restore();
        ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(kx, y, 22 * grab, 0, L.TAU); ctx.stroke();
        ['0', '.5', '1'].forEach((s, i) => label(ctx, s, x0 + (x1 - x0) * i / 2, y + 52, 1, i === 0 ? 'left' : i === 2 ? 'right' : 'center'));
      });

      /* E: bars */
      card(ctx, 'E', t, (ctx, t, w, h) => {
        label(ctx, 'OUTPUT', 36, 56);
        const vals = [.4, .66, .5, .86, .7, 1], bw = 52, gap = (w - 72 - bw * 6) / 5, base = h - 56;
        vals.forEach((v, i) => {
          const p = spring(t - .1 - i * .05, 2.6, .5), bh = 200 * v * Math.max(0, p);
          ctx.fillStyle = i === 5 ? PAL.coral : INK; L.roundedRect(ctx, 36 + i * (bw + gap), base - bh, bw, Math.max(0, bh), [14, 14, 6, 6]); ctx.fill();
        });
        ctx.fillStyle = 'rgba(11,11,16,.12)'; ctx.fillRect(36, base + 8, w - 72, 2);
      });

      /* F: live fps */
      card(ctx, 'F', t, (ctx, t, w, h) => {
        const n = Math.round(60 * E.outExpo(prog(t, .1, .55)));
        ctx.fillStyle = PAL.bone; ctx.font = '900 188px "Unbounded"'; ctx.textAlign = 'left'; ctx.fillText(String(n).padStart(2, '0'), 36, 226);
        const nw = ctx.measureText('60').width;
        ctx.font = 'italic 400 70px "Instrument Serif"'; ctx.fillStyle = PAL.lilac; ctx.fillText('fps', 36 + nw + 18, 226);
        const pl = .5 + .5 * Math.sin(tt * 7);
        L.glow(ctx, 58, 56, 40, PAL.mint, .5 * pl);
        ctx.fillStyle = PAL.mint; ctx.beginPath(); ctx.arc(58, 56, 8, 0, L.TAU); ctx.fill();
        mono(ctx); ctx.fillStyle = 'rgba(242,238,229,.7)'; ctx.textAlign = 'left'; ctx.fillText('LIVE', 78, 62); ctx.letterSpacing = '0px';
        // ECG strip
        const y0 = 300, amp = 30, x0 = 36, x1 = w - 36;
        ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
        const draw = Math.min(1, Math.max(0, (t - .15) / .4));
        for (let i = 0; i <= 160 * draw; i++) {
          const u = i / 160, ph = ((u * 3.2 - tt * 1.6) % 1 + 1) % 1;
          const v = Math.exp(-Math.pow((ph - .5) * 26, 2)) * 1.0 - .28 * Math.exp(-Math.pow((ph - .58) * 22, 2)) + .14 * Math.exp(-Math.pow((ph - .3) * 16, 2));
          const X = x0 + (x1 - x0) * u, Y = y0 - v * amp * 1.6;
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        }
        ctx.stroke();
      }, PAL.cobalt);

      /* G: checklist */
      card(ctx, 'G', t, (ctx, t, w, h) => {
        label(ctx, 'SHIPPED', 36, 56);
        ['Ease', 'Stagger', 'Overshoot'].forEach((s, i) => {
          const y = 118 + i * 78, cp = prog(tt, 1.34 + i * .08, .22), fill = E.outBack(cp, 2);
          ctx.fillStyle = cp > 0 ? INK : GREY; ctx.beginPath(); ctx.arc(66, y + 20, 26 * (cp > 0 ? clamp(fill, 0, 1.15) : 1), 0, L.TAU); ctx.fill();
          if (cp > 0) {
            ctx.strokeStyle = WHITE; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const q = E.outCubic(cp); ctx.beginPath(); ctx.moveTo(54, y + 21); ctx.lineTo(54 + 9 * Math.min(1, q * 2), y + 21 + 9 * Math.min(1, q * 2));
            if (q > .5) ctx.lineTo(66 + 14 * (q - .5) * 2, y + 30 - 24 * (q - .5) * 2); ctx.stroke();
          }
          ctx.fillStyle = cp > 0 ? INK : 'rgba(11,11,16,.62)'; ctx.font = '600 32px "Inter Tight"'; ctx.textAlign = 'left'; ctx.fillText(s, 114, y + 32);
        });
      });

      /* cursor + click ripples */
      const c = cursor(tt);
      for (const ct of [.66, 1.34]) {
        const rp = prog(tt, ct, .45); if (rp > 0 && rp < 1) {
          const k = ct === .66 ? CARDS.C : CARDS.G, cx = ct === .66 ? 1700 : 1418, cy = ct === .66 ? 252 : 740;
          ctx.strokeStyle = rgbaHex(INK, .45 * (1 - rp)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 14 + 52 * E.outCubic(rp), 0, L.TAU); ctx.stroke(); void k;
        }
      }
      if (c) {
        ctx.save(); ctx.translate(c.x, c.y); const s = c.press ? 1.5 : 1.75; ctx.scale(s, s);
        ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 27); ctx.lineTo(6.5, 21); ctx.lineTo(11, 31); ctx.lineTo(15.5, 29); ctx.lineTo(11, 19.5); ctx.lineTo(19, 19.5); ctx.closePath();
        ctx.fillStyle = INK; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = WHITE; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.restore();
      }
    },
  });
})(window);
