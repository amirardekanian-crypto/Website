/* SHOT 4 — DEPTH  (bar 4, 5.625–7.500 s)
 *
 * A trefoil torus knot (8,320 quads) rendered by a tiny software 3D pipeline: rotate, project, cull, painter's sort,
 * shade (key light + specular + Fresnel + a normal-driven iridescent ramp). It draws itself on along its path,
 * takes a spin kick on beat 2, and on beat 3 a scan line sweeps across turning solid into X-ray wireframe.
 * On the last beat the camera dives through the knot's hole (into the glitch cut). Behind it: a giant outlined word,
 * a tilted orbit ring with three satellites, and drifting dust, all on their own parallax.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, hex, ramp, rgbaHex } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W, H = R.H;
  const T0 = BAR * 3;
  const NU = 320, NV = 26;
  const M = {};                      // mesh buffers, built in init
  const IRI = [[0, '#2430B8'], [.25, '#6C7DFF'], [.45, '#B7A4FF'], [.62, '#FFB0C8'], [.8, '#FFD3BE'], [1, '#8CF7D8']];
  const LUT = [];
  const KEY = (() => { const v = [-.5, .62, -.6], n = Math.hypot(...v); return v.map(x => x / n); })();

  /* cues */
  R.hit(T0, 1, { portal: 1 });                                  // the iris lands, the knot starts drawing itself
  R.cue(T0 + .05, 'draw', { dur: .5 });
  R.hit(T0 + BEAT, .6, { kick: 1 });                            // spin kick
  R.cue(T0 + BEAT * 2, 'scan', { dur: .42 });
  R.hit(T0 + BEAT * 2, .35, { scan: 1 });
  R.cue(T0 + BEAT * 3 - .08, 'whoosh', { dir: 'in', dur: .5 });  // the dive

  R.inits.push(() => {
    for (let i = 0; i < 256; i++) LUT.push(ramp(IRI, i / 255));
    const P = u => { const r = Math.cos(3 * u) + 2; return [r * Math.cos(2 * u), r * Math.sin(2 * u), -Math.sin(3 * u)]; };
    const nv = (NU + 1) * (NV + 1);
    M.pos = new Float32Array(nv * 3); M.nrm = new Float32Array(nv * 3);
    const eps = 1e-3, rt = .38;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    for (let i = 0; i <= NU; i++) {
      const u = i / NU * L.TAU, p0 = P(u), p1 = P(u + eps), pm = P(u - eps);
      const T = nrm(sub(p1, pm));
      const acc = [p1[0] - 2 * p0[0] + pm[0], p1[1] - 2 * p0[1] + pm[1], p1[2] - 2 * p0[2] + pm[2]];
      const dT = T[0] * acc[0] + T[1] * acc[1] + T[2] * acc[2];
      const Nn = nrm([acc[0] - dT * T[0], acc[1] - dT * T[1], acc[2] - dT * T[2]]);
      const B = cross(T, Nn);
      for (let j = 0; j <= NV; j++) {
        const a = j / NV * L.TAU, ca = Math.cos(a), sa = Math.sin(a), k = (i * (NV + 1) + j) * 3;
        const nx = ca * Nn[0] + sa * B[0], ny = ca * Nn[1] + sa * B[1], nz = ca * Nn[2] + sa * B[2];
        M.nrm[k] = nx; M.nrm[k + 1] = ny; M.nrm[k + 2] = nz;
        M.pos[k] = p0[0] + rt * nx; M.pos[k + 1] = p0[1] + rt * ny; M.pos[k + 2] = p0[2] + rt * nz;
      }
    }
    M.VX = new Float32Array(nv); M.VY = new Float32Array(nv); M.VZ = new Float32Array(nv);
    M.SX = new Float32Array(nv); M.SY = new Float32Array(nv);
    M.NX = new Float32Array(nv); M.NY = new Float32Array(nv); M.NZ = new Float32Array(nv);
    M.dep = new Float32Array(NU * NV);
    /* the backdrop word as a clean outline: stroke wide, then erase the fill, so a variable font's overlapping contours never show */
    const wc = L.canvas(2100, 520), wx = wc.getContext('2d');
    wx.font = L.fnt(900, 380); wx.textAlign = 'center'; wx.lineJoin = 'round';
    wx.strokeStyle = '#fff'; wx.lineWidth = 9; wx.strokeText('DEPTH', 1050, 400);
    wx.globalCompositeOperation = 'destination-out'; wx.fillStyle = '#000'; wx.fillText('DEPTH', 1050, 400);
    M.word = wc;
    /* dust */
    M.dust = []; for (let i = 0; i < 90; i++) M.dust.push([(hash(i, 1) - .5) * 22, (hash(i, 2) - .5) * 12, hash(i, 3) * 11 - 3, .5 + hash(i, 4)]);
  });

  /* rotate + project every vertex for this sample */
  function project(rm, D, f, cx, cy) {
    const { pos, nrm, VX, VY, VZ, SX, SY, NX, NY, NZ } = M, n = pos.length / 3;
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = rm;
    for (let k = 0, q = 0; k < n; k++, q += 3) {
      const x = pos[q], y = pos[q + 1], z = pos[q + 2];
      const X = m0 * x + m1 * y + m2 * z, Y = m3 * x + m4 * y + m5 * z, Z = m6 * x + m7 * y + m8 * z + D;
      VX[k] = X; VY[k] = Y; VZ[k] = Z;
      const s = f / Z; SX[k] = cx + X * s; SY[k] = cy - Y * s;
      const a = nrm[q], b = nrm[q + 1], c = nrm[q + 2];
      NX[k] = m0 * a + m1 * b + m2 * c; NY[k] = m3 * a + m4 * b + m5 * c; NZ[k] = m6 * a + m7 * b + m8 * c;
    }
  }

  function knot(ctx, t, rm, D, f, cx, cy, iMax, scanX) {
    project(rm, D, f, cx, cy);
    const { VX, VY, VZ, SX, SY, NX, NY, NZ, dep } = M;
    const solid = [], wireF = [], wireB = [];
    const stride = NV + 1;
    for (let i = 0; i < iMax; i++) for (let j = 0; j < NV; j++) {
      const a = i * stride + j, b = a + stride, c = b + 1, d = a + 1;
      const zc = (VZ[a] + VZ[c]) * .5; if (zc < .35) continue;
      const cxs = (SX[a] + SX[c]) * .5;
      const nx = NX[a] + NX[c], ny = NY[a] + NY[c], nz = NZ[a] + NZ[c];
      const vx = -(VX[a] + VX[c]) * .5, vy = -(VY[a] + VY[c]) * .5, vz = -zc;
      const front = (nx * vx + ny * vy + nz * vz) > 0;
      const q = i * NV + j; dep[q] = zc;
      if (cxs < scanX) (front ? wireF : wireB).push(q); else if (front) solid.push(q);
    }
    /* far wire first */
    const wire = (list, col, lw) => {
      if (!list.length) return;
      ctx.beginPath();
      for (const q of list) {
        const i = (q / NV) | 0, j = q - i * NV, a = i * stride + j, b = a + stride, d = a + 1;
        ctx.moveTo(SX[d], SY[d]); ctx.lineTo(SX[a], SY[a]); ctx.lineTo(SX[b], SY[b]);
      }
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    wire(wireB, 'rgba(183,164,255,.16)', 1.1);
    /* solid, painter's order */
    solid.sort((p, q) => dep[q] - dep[p]);
    ctx.lineWidth = .9;
    const hl = Math.hypot(KEY[0] - 0, KEY[1], KEY[2] - 1);
    for (const q of solid) {
      const i = (q / NV) | 0, j = q - i * NV, a = i * stride + j, b = a + stride, c = b + 1, d = a + 1;
      let nx = NX[a] + NX[c], ny = NY[a] + NY[c], nz = NZ[a] + NZ[c]; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const px = (VX[a] + VX[c]) * .5, py = (VY[a] + VY[c]) * .5, pz = (VZ[a] + VZ[c]) * .5, pl = Math.hypot(px, py, pz);
      const vx = -px / pl, vy = -py / pl, vz = -pz / pl;
      const ndv = Math.max(0, nx * vx + ny * vy + nz * vz), fres = Math.pow(1 - ndv, 2.4);
      const diff = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
      const hx = KEY[0] + vx, hy = KEY[1] + vy, hz = KEY[2] + vz, hn = Math.hypot(hx, hy, hz) || 1;
      const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hn), 70);
      let h = .5 + .42 * (nx * .35 + ny * .75 - nz * .15) + .55 * fres + .1 * Math.sin(i / NU * L.TAU * 3);
      h = Math.abs(((h % 2) + 2) % 2 - 1);
      const col = LUT[(h * 255) | 0], k = .34 + .8 * diff;
      const r = Math.min(255, col[0] * k + spec * 235 + fres * 70), gg = Math.min(255, col[1] * k + spec * 235 + fres * 80), bb = Math.min(255, col[2] * k + spec * 235 + fres * 140);
      const s = `rgb(${r | 0},${gg | 0},${bb | 0})`;
      ctx.fillStyle = s; ctx.strokeStyle = s;
      ctx.beginPath(); ctx.moveTo(SX[a], SY[a]); ctx.lineTo(SX[b], SY[b]); ctx.lineTo(SX[c], SY[c]); ctx.lineTo(SX[d], SY[d]); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    wire(wireF, 'rgba(242,238,229,.62)', 1.25);
    void hl;
  }

  /* orbit ring + satellites; `front` picks the half nearer the camera than the knot */
  function ring(ctx, t, D, f, cx, cy, front) {
    const rm = L.rotMat(.95, t * .6, .25), Rr = 4.7, n = 120;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * L.TAU, x = Rr * Math.cos(a), z = Rr * Math.sin(a);
      const X = rm[0] * x + rm[2] * z, Y = rm[3] * x + rm[5] * z, Z = rm[6] * x + rm[8] * z + D;
      pts.push([cx + X * f / Z, cy - Y * f / Z, Z]);
    }
    ctx.lineCap = 'round'; ctx.lineWidth = 2.2;
    for (let i = 0; i < n; i++) {
      if (pts[i][2] < .6 || pts[i + 1][2] < .6) continue;                      // behind / through the camera during the dive
      const isFront = (pts[i][2] + pts[i + 1][2]) / 2 < D;
      if (isFront !== front) continue;
      ctx.strokeStyle = front ? 'rgba(242,238,229,.7)' : 'rgba(242,238,229,.22)';
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
    const cols = [PAL.coral, PAL.bone, PAL.mint];
    for (let k = 0; k < 3; k++) {
      const a = t * 1.25 + k * 2.094, x = Rr * Math.cos(a), z = Rr * Math.sin(a);
      const X = rm[0] * x + rm[2] * z, Y = rm[3] * x + rm[5] * z, Z = rm[6] * x + rm[8] * z + D;
      if (Z < .6 || (Z < D) !== front) continue;
      const sx = cx + X * f / Z, sy = cy - Y * f / Z, r = .24 * f / Z;
      const gr = ctx.createRadialGradient(sx - r * .35, sy - r * .4, r * .1, sx, sy, r);
      gr.addColorStop(0, '#fff'); gr.addColorStop(.35, cols[k]); gr.addColorStop(1, rgbaHex(cols[k], .55));
      L.glow(ctx, sx, sy, r * 3.2, cols[k], .35);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, L.TAU); ctx.fill();
    }
  }

  R.shot({
    id: 'shot4-depth', label: 'DEPTH', hud: { color: PAL.bone }, samples: 8,
    fx: { bloom: .36, ca: .6, grain: .05, vig: .3 },
    draw(ctx, t, e) {
      const tt = Math.max(0, t);
      /* ground: cobalt with a lit centre and drifting soft lights */
      const bg = ctx.createRadialGradient(W * .56, H * .46, 60, W * .5, H * .5, 1250);
      bg.addColorStop(0, '#4560FF'); bg.addColorStop(.5, PAL.cobalt); bg.addColorStop(1, '#0A1370');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      L.glow(ctx, 360 + Math.sin(tt * 1.3) * 80, 250, 520, PAL.lilac, .09);
      L.glow(ctx, 1560 + Math.cos(tt * 1.1) * 90, 880, 560, PAL.coral, .07);

      const dive = E.inCubic(prog(t, BEAT * 3 - .05, .52));
      /* the word behind everything */
      ctx.save();
      ctx.translate(W / 2 - (tt - .9) * 110, 540); ctx.scale(1 + dive * 1.6, 1 + dive * 1.6);
      ctx.globalAlpha = .5; ctx.drawImage(M.word, -1050, -260);
      ctx.restore();

      /* camera + knot pose */
      const pull = E.outExpo(prog(t, 0, .8));
      const D = lerp(6.4, 8.6, pull) - (8.6 - 2.5) * dive;
      const f = 1080, cx = 1004, cy = 556;
      const kick = 1.5 * E.outBack(prog(t, BEAT, .5), 1.2);
      const ry = 1.0 + 1.55 * tt + 5.2 * E.outExpo(prog(t, 0, 1.05)) + kick;
      const rx = .55 + .1 * Math.sin(tt * 2.1) + .22 * E.outBack(prog(t, BEAT, .5)) - .2 * dive;
      const rz = .25 + 1.0 * dive;
      const rm = L.rotMat(rx, ry, rz);

      /* dust (far) */
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [dx, dy, dz, sz] of M.dust) {
        const Z = dz + D - tt * .6 * sz; if (Z < .5) continue;
        const x = cx + (dx - tt * .5 * sz) * f / Z, y = cy - dy * f / Z;
        const r = Math.max(.8, .05 * f / Z * sz);
        ctx.fillStyle = `rgba(214,222,255,${.5 / (1 + Z * .08)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, L.TAU); ctx.fill();
      }
      ctx.restore();

      ring(ctx, tt, D, f, cx, cy, false);

      /* the knot: draws itself on, then the scan line turns it to wireframe */
      const iMax = Math.max(0, Math.min(NU, Math.ceil(NU * E.outExpo(prog(t, 0, .55)))));
      const scanP = E.inOutCubic(prog(t, BEAT * 2, .44));
      const scanX = scanP <= 0 ? -1e4 : lerp(-160, W + 160, scanP);
      if (iMax > 0) knot(ctx, tt, rm, D, f, cx, cy, iMax, scanX);

      ring(ctx, tt, D, f, cx, cy, true);

      /* the scan line */
      if (scanP > 0 && scanP < 1) {
        const x = scanX, gr = ctx.createLinearGradient(x - 220, 0, x, 0);
        gr.addColorStop(0, rgbaHex(PAL.mint, 0)); gr.addColorStop(1, rgbaHex(PAL.mint, .22));
        ctx.fillStyle = gr; ctx.fillRect(x - 220, 0, 220, H);
        ctx.fillStyle = PAL.bone; ctx.fillRect(x - 1.5, 0, 3, H);
        L.glow(ctx, x, 540, 380, PAL.mint, .2);
        ctx.font = '500 14px "JetBrains Mono"'; ctx.letterSpacing = '2.4px'; ctx.fillStyle = rgbaHex(PAL.bone, .85); ctx.textAlign = 'left';
        ctx.fillText('TOPOLOGY', x + 14, 150); ctx.letterSpacing = '0px';
      }

      /* spec line */
      const sp = E.outExpo(prog(t, .2, .5));
      if (sp > .01) {
        ctx.save(); ctx.globalAlpha = sp * (1 - dive);
        ctx.font = '500 15px "JetBrains Mono"'; ctx.letterSpacing = '2.4px'; ctx.textAlign = 'left';
        ctx.fillStyle = rgbaHex(PAL.bone, .75);
        ctx.fillText('TORUS KNOT (2,3)', 96, 930 + (1 - sp) * 20);
        ctx.fillStyle = rgbaHex(PAL.bone, .45);
        ctx.fillText(`${(NU * NV).toLocaleString('en-US')} FACES · SOFTWARE 3D`, 96, 956 + (1 - sp) * 20);
        ctx.letterSpacing = '0px'; ctx.restore();
      }
    },
  });
})(window);
