/* SHOT 5 — FLOW  (bar 5, 7.500–9.375 s)
 *
 * 5,200 particles. At the bar line they burst from the centre and are carried by a curl-noise flow field,
 * painting additive light trails. Between 0.46 s and beat 3 each one is drawn onto its own point of the word
 * "FLOW" (sampled from the real glyph outlines), colours sorted left to right into a spectrum, so order
 * appears out of chaos exactly on the beat. After a short hold the word detonates outward.
 * The whole thing is simulated once at load (fixed 1/120 s steps) and read back by time, so any frame
 * can be rendered on its own.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, hex, rgbaHex, noise3 } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W, H = R.H;
  const T0 = BAR * 4;
  const N = 5200, HZ = 120, STEPS = 270;
  const T_FORM = .46, T_LOCK = BEAT * 2, T_BURST = BEAT * 3 - .02;
  const SPECTRUM = ['#5CF0C0', '#5CCBFF', '#7FA2FF', '#B7A4FF', '#FF8FB0', '#FF5530'];
  const SIM = new Float32Array(STEPS * N * 2);
  const TX = new Float32Array(N), TY = new Float32Array(N), DLY = new Float32Array(N), BDX = new Float32Array(N), BDY = new Float32Array(N), COL = new Uint8Array(N);
  let ready = false;

  R.hit(T0, 1, { glitch: 1 });                                  // the flash cut lands, particles burst
  R.cue(T0 + .02, 'burst', { dur: .6 });
  R.cue(T0 + T_FORM, 'sweep', { dur: T_LOCK - T_FORM });        // everything rushes toward the word
  R.hit(T0 + T_LOCK, .8, { lock: 1 });                          // …and locks on beat 3
  R.cue(T0 + T_LOCK, 'chime', {});
  R.cue(T0 + BEAT * 3 - .14, 'riser', { dur: .14 });
  R.hit(T0 + BEAT * 3, .55, { burst: 1 });                      // the word detonates

  R.inits.push(() => {
    /* 1 — sample targets from the glyph outlines of FLOW */
    const cw = 1920, ch = 600, c = L.canvas(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
    x.font = L.fnt(900, 200); const w0 = x.measureText('FLOW').width;
    const fs = Math.round(200 * 1560 / w0);
    x.font = L.fnt(900, fs); x.textAlign = 'center'; x.fillStyle = '#fff';
    const cap = x.measureText('H').actualBoundingBoxAscent;
    x.fillText('FLOW', cw / 2, ch / 2 + cap / 2);
    const img = x.getImageData(0, 0, cw, ch).data, a = (px, py) => (px < 0 || py < 0 || px >= cw || py >= ch) ? 0 : img[(py * cw + px) * 4 + 3];
    const inner = [], edge = [];
    for (let py = 2; py < ch; py += 3) for (let px = 2; px < cw; px += 3) {
      if (a(px, py) < 140) continue;
      const isEdge = a(px - 4, py) < 100 || a(px + 4, py) < 100 || a(px, py - 4) < 100 || a(px, py + 4) < 100;
      (isEdge ? edge : inner).push(px, py);
    }
    const rnd = L.mulberry32(77);
    const shuffle = arr => { for (let i = arr.length / 2 - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); for (let k = 0; k < 2; k++) { const t = arr[i * 2 + k]; arr[i * 2 + k] = arr[j * 2 + k]; arr[j * 2 + k] = t; } } };
    shuffle(edge); shuffle(inner);
    const nEdge = Math.min(edge.length / 2, Math.floor(N * .42));
    for (let i = 0; i < N; i++) {
      let px, py;
      if (i < nEdge) { px = edge[i * 2]; py = edge[i * 2 + 1]; }
      else { const k = (i - nEdge) % (inner.length / 2); px = inner[k * 2]; py = inner[k * 2 + 1]; }
      TX[i] = px + (rnd() - .5) * 2; TY[i] = py + (H - ch) / 2 + (rnd() - .5) * 2;
      COL[i] = Math.min(5, Math.floor(clamp((TX[i] - 180) / 1560) * 6));
      DLY[i] = hash(i, 9) * .17;
      const dx = TX[i] - W / 2 + (rnd() - .5) * 260, dy = TY[i] - H / 2 + (rnd() - .5) * 260, dl = Math.hypot(dx, dy) || 1;
      BDX[i] = dx / dl * (.7 + rnd() * .8); BDY[i] = dy / dl * (.7 + rnd() * .8);
    }

    /* 2 — simulate the free flow: burst from the centre, then relax into a curl-noise field */
    const dt = 1 / HZ, k = 1 - Math.exp(-2.0 * dt), E_ = 1.2;
    const px_ = new Float32Array(N), py_ = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      px_[i] = W / 2 + (hash(i, 1) - .5) * 16; py_[i] = H / 2 + (hash(i, 2) - .5) * 16;
      const an = hash(i, 3) * L.TAU, sp = 90 + 1050 * Math.pow(hash(i, 4), 2.2);
      vx[i] = Math.cos(an) * sp - Math.sin(an) * sp * .55; vy[i] = Math.sin(an) * sp + Math.cos(an) * sp * .55;
    }
    const psi = (X, Y, tau) => noise3(X * .0016, Y * .0016, tau * .4) + .5 * noise3(X * .0034 + 11.3, Y * .0034 + 4.1, tau * .7);
    for (let s = 0; s < STEPS; s++) {
      const tau = s * dt;
      for (let i = 0; i < N; i++) {
        const o = (s * N + i) * 2; SIM[o] = px_[i]; SIM[o + 1] = py_[i];
        const X = px_[i], Y = py_[i], p0 = psi(X, Y, tau);
        const fx = (psi(X, Y + E_, tau) - p0) / E_ * 175000, fy = -(psi(X + E_, Y, tau) - p0) / E_ * 175000;
        vx[i] += (fx - vx[i]) * k; vy[i] += (fy - vy[i]) * k;
        px_[i] += vx[i] * dt; py_[i] += vy[i] * dt;
      }
    }
    ready = true;
  });

  const P = new Float32Array(2);
  function pos(i, t) {
    const f = clamp(t * HZ, 0, STEPS - 1.001), k = f | 0, u = f - k, a = (k * N + i) * 2, b = a + N * 2;
    let x = SIM[a] + (SIM[b] - SIM[a]) * u, y = SIM[a + 1] + (SIM[b + 1] - SIM[a + 1]) * u;
    const A = E.inOutCubic(prog(t, T_FORM + DLY[i], .3));
    if (A > 0) {
      x = lerp(x, TX[i], A); y = lerp(y, TY[i], A);
      const sh = A * (1 - clamp((t - T_BURST) / .1));
      x += noise3(i * .37, t * 7, 1.3) * 2.4 * sh; y += noise3(i * .53, t * 7, 4.7) * 2.4 * sh;
    }
    const B = E.inQuad(prog(t, T_BURST + DLY[i] * .3, .5));
    if (B > 0) { x += BDX[i] * 1250 * B; y += BDY[i] * 1250 * B; }
    P[0] = x; P[1] = y;
  }

  function ring(ctx, p, r1, a) {
    if (p <= 0 || p >= 1) return;
    ctx.strokeStyle = rgbaHex(PAL.bone, a * (1 - p)); ctx.lineWidth = 3 * (1 - p) + .5;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, r1 * E.outExpo(p), 0, L.TAU); ctx.stroke();
  }

  R.shot({
    id: 'shot5-flow', label: 'FLOW', hud: { color: PAL.bone }, samples: 4,
    fx: { bloom: .55, ca: .55, grain: .055, vig: .34 },
    draw(ctx, t, e) {
      const bg = ctx.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 1150);
      bg.addColorStop(0, '#12121B'); bg.addColorStop(1, '#07070B');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      if (!ready || t < 0) return;

      ring(ctx, prog(t, 0, .7), 1500, .55);
      ring(ctx, prog(t, T_LOCK, .55), 760, .5);
      ring(ctx, prog(t, T_BURST + .02, .6), 1500, .45);
      if (t > T_LOCK && t < T_LOCK + .5) L.glow(ctx, W / 2, H / 2, 1000, PAL.lilac, .2 * Math.exp(-(t - T_LOCK) * 8));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const fade = clamp(t / .08) * (1 - clamp((t - 1.72) / .15));
      const seg = [[1.0, .17], [1.5, .34], [2.1, .62]];              // tail, middle, head: [width, alpha]
      const dts = [0, .02, .048, .085];
      const paths = [];
      for (let c = 0; c < 6; c++) paths.push({ tail: new Path2D(), mid: new Path2D(), head: new Path2D(), dotA: new Path2D(), dotB: new Path2D() });
      for (let i = 0; i < N; i++) {
        pos(i, t); const x0 = P[0], y0 = P[1];
        if (x0 < -80 || x0 > W + 80 || y0 < -80 || y0 > H + 80) continue;
        pos(i, t - dts[1]); const x1 = P[0], y1 = P[1];
        const pc = paths[COL[i]];
        if (t >= T_FORM && Math.abs(x0 - x1) + Math.abs(y0 - y1) < 5) {   // (nearly) stationary: a bright round dot, two twinkle groups
          const d = (i & 1) ? pc.dotA : pc.dotB; d.moveTo(x0, y0); d.lineTo(x0 + .01, y0);
          continue;
        }
        pos(i, t - dts[2]); const x2 = P[0], y2 = P[1];
        pos(i, t - dts[3]); const x3 = P[0], y3 = P[1];
        pc.head.moveTo(x0, y0); pc.head.lineTo(x1, y1);
        pc.mid.moveTo(x1, y1); pc.mid.lineTo(x2, y2);
        pc.tail.moveTo(x2, y2); pc.tail.lineTo(x3, y3);
      }
      const tw = [.62 + .38 * Math.sin(t * 21), .62 + .38 * Math.cos(t * 21)];
      for (let c = 0; c < 6; c++) {
        const P_ = paths[c];
        ctx.strokeStyle = rgbaHex(SPECTRUM[c], seg[0][1] * fade); ctx.lineWidth = seg[0][0]; ctx.stroke(P_.tail);
        ctx.strokeStyle = rgbaHex(SPECTRUM[c], seg[1][1] * fade); ctx.lineWidth = seg[1][0]; ctx.stroke(P_.mid);
        ctx.strokeStyle = rgbaHex(SPECTRUM[c], seg[2][1] * fade); ctx.lineWidth = seg[2][0]; ctx.stroke(P_.head);
        [P_.dotA, P_.dotB].forEach((d, k) => {
          ctx.strokeStyle = rgbaHex(SPECTRUM[c], .1 * fade); ctx.lineWidth = 13; ctx.stroke(d);
          ctx.strokeStyle = rgbaHex(SPECTRUM[c], (.55 + .4 * tw[k]) * fade); ctx.lineWidth = 5.4; ctx.stroke(d);
        });
      }
      ctx.restore();

      /* caption */
      const cp = E.outExpo(prog(t, .15, .5)) * (1 - E.inCubic(prog(t, 1.5, .3)));
      if (cp > .01) {
        ctx.save(); ctx.globalAlpha = cp;
        ctx.font = '500 15px "JetBrains Mono"'; ctx.letterSpacing = '2.4px'; ctx.textAlign = 'left';
        ctx.fillStyle = rgbaHex(PAL.bone, .75); ctx.fillText('FLOW FIELD', 96, 930 + (1 - cp) * 18);
        ctx.fillStyle = rgbaHex(PAL.bone, .45); ctx.fillText(`${N.toLocaleString('en-US')} PARTICLES · CURL NOISE`, 96, 956 + (1 - cp) * 18);
        ctx.letterSpacing = '0px'; ctx.restore();
      }
    },
  });
})(window);
