/* particles.js — thousands of points acting as one. The Menu's Particles group:
 *   Big Bang · Current · Assembly · Supernova  (four moves of one piece, `particle-field`)
 *
 * Written from shot 5 of the showreel. 5,200 points burst from the centre and are carried by a curl-noise flow field, painting
 * additive light trails. Between 0.46 s and beat 3 each one is drawn onto its own point of a word (sampled from the real glyph
 * outlines), its colour sorted left to right into a spectrum, so order appears out of chaos exactly on the beat. After a short
 * hold the word blows apart. The free flow is simulated once (fixed 1/120 s steps) and read back by time, so any frame can be
 * drawn on its own. With no params the piece reproduces the reel exactly.
 *
 * `phases` says which moves happen: 'burst' (the shock ring and the burst sound), 'assemble' (the points rush in and lock into
 * the word, with its ring and flash) and 'detonate' (the word blows apart, with its ring). The flow itself always runs.
 * The Menu names are presets of that list: Big Bang = ['burst'], Current = [] (a gentler start), Assembly = ['assemble'],
 * Supernova = ['assemble', 'detonate'] with the word already in place, held for one beat, then blown apart.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog, hash, rgbaHex, noise3 } = L;
  const HZ = 120, STEPS = 270;                              // the simulation: 1/120 s steps, 2.25 s long
  const DTS = [0, .02, .048, .085];                         // how far back (s) the four points of a trail sit: head, then three more
  const SEG = [[1.0, .17], [1.5, .34], [2.1, .62]];         // tail, middle, head: [line width, alpha]
  const has = (p, k) => p.phases.indexOf(k) >= 0;

  const sims = new Map(), targets = new Map();

  /* The free flow: every point bursts from the centre, then relaxes into a curl-noise field. Built once per setting. */
  function getSim(p) {
    const key = [p.count, p.x, p.y, p.speed, p.flow, p.drag].join('|');
    let S = sims.get(key); if (S) return S;
    const N = p.count, SIM = new Float32Array(STEPS * N * 2);
    const dt = 1 / HZ, k = 1 - Math.exp(-p.drag * dt), E_ = 1.2;
    const px_ = new Float32Array(N), py_ = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      px_[i] = p.x + (hash(i, 1) - .5) * 16; py_[i] = p.y + (hash(i, 2) - .5) * 16;
      const an = hash(i, 3) * L.TAU, sp = (90 + 1050 * Math.pow(hash(i, 4), 2.2)) * p.speed;
      vx[i] = Math.cos(an) * sp - Math.sin(an) * sp * .55; vy[i] = Math.sin(an) * sp + Math.cos(an) * sp * .55;
    }
    const psi = (X, Y, tau) => noise3(X * .0016, Y * .0016, tau * .4) + .5 * noise3(X * .0034 + 11.3, Y * .0034 + 4.1, tau * .7);
    for (let s = 0; s < STEPS; s++) {
      const tau = s * dt;
      for (let i = 0; i < N; i++) {
        const o = (s * N + i) * 2; SIM[o] = px_[i]; SIM[o + 1] = py_[i];
        const X = px_[i], Y = py_[i], p0 = psi(X, Y, tau);
        const fx = (psi(X, Y + E_, tau) - p0) / E_ * p.flow, fy = -(psi(X + E_, Y, tau) - p0) / E_ * p.flow;
        vx[i] += (fx - vx[i]) * k; vy[i] += (fy - vy[i]) * k;
        px_[i] += vx[i] * dt; py_[i] += vy[i] * dt;
      }
    }
    S = { N, SIM };
    sims.set(key, S);
    return S;
  }

  /* The word's points. The whole layout lives in this one function of the text (the glyph outlines are sampled from the real
     font), so another script (Farsi, right to left) only has to change this. Every point gets a spot on the word, a colour by
     where that spot is, a small delay, and a direction to fly when the word blows apart. Its own seed (77), used in a fixed order. */
  function getTargets(p, env) {
    const key = [p.count, p.text, p.font, p.width, p.x, p.y, p.colors.length, env.W, env.H].join('|');
    let T = targets.get(key); if (T) return T;
    const N = p.count, ncol = p.colors.length;
    const TX = new Float32Array(N), TY = new Float32Array(N), DLY = new Float32Array(N), BDX = new Float32Array(N), BDY = new Float32Array(N), COL = new Uint8Array(N);
    /* 1: sample the outline of the word */
    const cw = env.W, ch = 600, c = L.canvas(cw, ch), x = c.getContext('2d', { willReadFrequently: true });
    x.font = p.font.replace('{s}', 200); const w0 = x.measureText(p.text).width;
    const fs = Math.round(200 * p.width / w0);
    x.font = p.font.replace('{s}', fs); x.textAlign = 'center'; x.fillStyle = '#fff';
    const cap = x.measureText('H').actualBoundingBoxAscent;
    x.fillText(p.text, cw / 2, ch / 2 + cap / 2);
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
    /* 2: give every point its place */
    const nEdge = Math.min(edge.length / 2, Math.floor(N * .42));
    const ox = p.x - cw / 2, oy = p.y - ch / 2, x0 = p.x - p.width / 2;      // where the sampled picture sits on screen
    for (let i = 0; i < N; i++) {
      let px, py;
      if (i < nEdge) { px = edge[i * 2]; py = edge[i * 2 + 1]; }
      else { const k = (i - nEdge) % (inner.length / 2); px = inner[k * 2]; py = inner[k * 2 + 1]; }
      TX[i] = px + ox + (rnd() - .5) * 2; TY[i] = py + oy + (rnd() - .5) * 2;
      COL[i] = Math.min(ncol - 1, Math.floor(clamp((TX[i] - x0) / p.width) * ncol));
      DLY[i] = hash(i, 9) * .17;
      const dx = TX[i] - p.x + (rnd() - .5) * 260, dy = TY[i] - p.y + (rnd() - .5) * 260, dl = Math.hypot(dx, dy) || 1;
      BDX[i] = dx / dl * (.7 + rnd() * .8); BDY[i] = dy / dl * (.7 + rnd() * .8);
    }
    T = { TX, TY, DLY, BDX, BDY, COL };
    targets.set(key, T);
    return T;
  }

  /* where point i is at time t: the free flow, pulled onto the word, then thrown outward. The answer goes in F.P (32-bit, as it always was). */
  function pos(F, i, t) {
    const { N, SIM } = F;
    const f = clamp(t * HZ, 0, STEPS - 1.001), k = f | 0, u = f - k, a = (k * N + i) * 2, b = a + N * 2;
    let x = SIM[a] + (SIM[b] - SIM[a]) * u, y = SIM[a + 1] + (SIM[b + 1] - SIM[a + 1]) * u;
    if (F.assemble) {
      const A = E.inOutCubic(prog(t, F.tForm + F.DLY[i], F.formDur));
      if (A > 0) {
        x = lerp(x, F.TX[i], A); y = lerp(y, F.TY[i], A);
        const sh = A * (1 - clamp((t - F.tBurst) / .1));                      // a small shiver while it is held
        x += noise3(i * .37, t * 7, 1.3) * 2.4 * sh; y += noise3(i * .53, t * 7, 4.7) * 2.4 * sh;
      }
    }
    if (F.detonate) {
      const B = E.inQuad(prog(t, F.tBurst + F.DLY[i] * .3, F.blastDur));
      if (B > 0) { x += F.BDX[i] * F.blast * B; y += F.BDY[i] * F.blast * B; }
    }
    F.P[0] = x; F.P[1] = y;
  }

  /* a shock ring from the centre: it grows fast while its line thins out */
  function shockRing(ctx, p, pr, r1, a) {
    if (pr <= 0 || pr >= 1) return;
    ctx.strokeStyle = rgbaHex(p.ringColor, a * (1 - pr)); ctx.lineWidth = 3 * (1 - pr) + .5;
    ctx.beginPath(); ctx.arc(p.x, p.y, r1 * E.outExpo(pr), 0, L.TAU); ctx.stroke();
  }

  KIT.piece('particle-field', {
    group: 'particles',
    doc: 'Thousands of points burst out of the centre, ride a flow field leaving trails of light, rush into a word, lock on the beat and blow apart.',
    defaults: {
      at: 0, x: 960, y: 540, phases: ['burst', 'assemble', 'detonate'],
      count: 5200, speed: 1, flow: 175000, drag: 2, trail: 1,
      colors: ['#5CF0C0', '#5CCBFF', '#7FA2FF', '#B7A4FF', '#FF8FB0', '#FF5530'],
      text: 'FLOW', font: '900 {s}px "Unbounded"', width: 1560,
      formAt: .46, formDur: .3, lockBeat: 2, blastBeat: 3, lead: .02, blast: 1250, blastDur: .5,
      fadeIn: .08, until: 1.72, fadeOut: .15, ringColor: PAL.bone, glowColor: PAL.lilac,
    },
    params: {
      at: 'when the clock of this piece starts (s). Everything below is counted from here',
      x: 'the centre the points burst from and the word is centred on (x)',
      y: 'the centre the points burst from and the word is centred on (y)',
      phases: 'which moves happen: burst (the shock ring and its sound), assemble (the points rush into the word and lock) and detonate (the word blows apart). The flow always runs',
      count: 'how many points',
      speed: 'how fast the points leave the centre (1 is the reel)',
      flow: 'how hard the flow field pushes the points',
      drag: 'how quickly the points settle into the flow (bigger is quicker)',
      trail: 'how long the light trails are (1 is the reel)',
      colors: 'the colours, from the left of the word to the right (the Night Spectrum look)',
      text: 'the word the points lock into',
      font: 'CSS font with {s} where the size goes',
      width: 'how wide the word is (px)',
      formAt: 'when the points start to rush to the word (s after at)',
      formDur: 'how long each point takes to arrive (s)',
      lockBeat: 'which beat the word locks on (0 is the first beat after at)',
      blastBeat: 'which beat the word blows apart on (0 is the first beat after at)',
      lead: 'how early the blow-apart starts before its beat, so it reads on the beat (s)',
      blast: 'blast size: how far the points fly when the word blows apart (px)',
      blastDur: 'blast speed: how long the blow-apart takes (s). Smaller is faster',
      fadeIn: 'how long the trails take to appear (s)',
      until: 'when the trails start to fade out (s after at)',
      fadeOut: 'how long the fade out takes (s)',
      ringColor: 'colour of the shock rings',
      glowColor: 'colour of the flash when the word locks',
    },
    warm(p, env) { getSim(p); getTargets(p, env); },
    warmKey: p => [p.count, p.x, p.y, p.speed, p.flow, p.drag, p.text, p.font, p.width, p.colors.length].join('|'),
    cues(p, env) {
      const B = env.BEAT, tLock = p.lockBeat * B, c = [];
      if (has(p, 'burst')) c.push({ dt: .02, kind: 'burst', props: { dur: .6 } });
      if (has(p, 'assemble') && p.formAt >= 0) {              // a word that was already there before this piece starts makes no sound
        c.push({ dt: p.formAt, kind: 'sweep', props: { dur: tLock - p.formAt } });
        c.push({ dt: tLock, hit: .8, props: { lock: 1 } });
        c.push({ dt: tLock, kind: 'chime', props: {} });
      }
      if (has(p, 'detonate')) {
        c.push({ dt: p.blastBeat * B - .14, kind: 'riser', props: { dur: .14 } });
        c.push({ dt: p.blastBeat * B, hit: .55, props: { burst: 1 } });
      }
      return c;
    },
    draw(ctx, t, p, env) {
      const tl = t - p.at;
      if (tl < 0) return;
      const W = env.W, H = env.H, B = env.BEAT;
      const S = getSim(p), T = getTargets(p, env), N = S.N, ncol = p.colors.length;
      const tLock = p.lockBeat * B, tBurst = p.blastBeat * B - p.lead;
      const F = {
        N, SIM: S.SIM, TX: T.TX, TY: T.TY, DLY: T.DLY, BDX: T.BDX, BDY: T.BDY, P: new Float32Array(2),
        assemble: has(p, 'assemble'), detonate: has(p, 'detonate'), tForm: p.formAt, formDur: p.formDur, tBurst, blast: p.blast, blastDur: p.blastDur,
      };
      const P = F.P, COL = T.COL;

      /* shock rings, and the flash when the word locks */
      if (has(p, 'burst')) shockRing(ctx, p, prog(tl, 0, .7), 1500, .55);
      if (F.assemble) shockRing(ctx, p, prog(tl, tLock, .55), 760, .5);
      if (F.detonate) shockRing(ctx, p, prog(tl, tBurst + p.lead, .6), 1500, .45);
      if (F.assemble && tl > tLock && tl < tLock + .5) L.glow(ctx, p.x, p.y, 1000, p.glowColor, .2 * Math.exp(-(tl - tLock) * 8));

      /* the points, as light trails: four samples back in time, drawn as tail, middle and head, and a bright dot when one has stopped */
      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const fade = clamp(tl / p.fadeIn) * (1 - clamp((tl - p.until) / p.fadeOut));
      const dts = DTS.map(d => d * p.trail);
      const paths = [];
      for (let c = 0; c < ncol; c++) paths.push({ tail: new Path2D(), mid: new Path2D(), head: new Path2D(), dotA: new Path2D(), dotB: new Path2D() });
      for (let i = 0; i < N; i++) {
        pos(F, i, tl); const x0 = P[0], y0 = P[1];
        if (x0 < -80 || x0 > W + 80 || y0 < -80 || y0 > H + 80) continue;
        pos(F, i, tl - dts[1]); const x1 = P[0], y1 = P[1];
        const pc = paths[COL[i]];
        if (F.assemble && tl >= p.formAt && Math.abs(x0 - x1) + Math.abs(y0 - y1) < 5) {   // (nearly) stationary: a bright round dot, two twinkle groups
          const d = (i & 1) ? pc.dotA : pc.dotB; d.moveTo(x0, y0); d.lineTo(x0 + .01, y0);
          continue;
        }
        pos(F, i, tl - dts[2]); const x2 = P[0], y2 = P[1];
        pos(F, i, tl - dts[3]); const x3 = P[0], y3 = P[1];
        pc.head.moveTo(x0, y0); pc.head.lineTo(x1, y1);
        pc.mid.moveTo(x1, y1); pc.mid.lineTo(x2, y2);
        pc.tail.moveTo(x2, y2); pc.tail.lineTo(x3, y3);
      }
      const tw = [.62 + .38 * Math.sin(tl * 21), .62 + .38 * Math.cos(tl * 21)];
      for (let c = 0; c < ncol; c++) {
        const P_ = paths[c], col = p.colors[c];
        ctx.strokeStyle = rgbaHex(col, SEG[0][1] * fade); ctx.lineWidth = SEG[0][0]; ctx.stroke(P_.tail);
        ctx.strokeStyle = rgbaHex(col, SEG[1][1] * fade); ctx.lineWidth = SEG[1][0]; ctx.stroke(P_.mid);
        ctx.strokeStyle = rgbaHex(col, SEG[2][1] * fade); ctx.lineWidth = SEG[2][0]; ctx.stroke(P_.head);
        [P_.dotA, P_.dotB].forEach((d, k) => {
          ctx.strokeStyle = rgbaHex(col, .1 * fade); ctx.lineWidth = 13; ctx.stroke(d);
          ctx.strokeStyle = rgbaHex(col, (.55 + .4 * tw[k]) * fade); ctx.lineWidth = 5.4; ctx.stroke(d);
        });
      }
      ctx.restore();
    },
  });
  KIT.alias('big-bang', 'particle-field', { phases: ['burst'] }, 'Thousands of points burst out of the centre.');
  KIT.alias('current', 'particle-field', { phases: [], speed: .25 }, 'Points ride a flow field and leave trails of light.');
  KIT.alias('assembly', 'particle-field', { phases: ['assemble'] }, 'Points rush in and lock into a word.');
  KIT.alias('supernova', 'particle-field', { phases: ['assemble', 'detonate'], formAt: -2, lockBeat: -2, blastBeat: 1 }, 'The word blows apart.');
})(window);
