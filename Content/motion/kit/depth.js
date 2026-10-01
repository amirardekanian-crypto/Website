/* depth.js — 3D objects, scan lines and camera moves. The Menu's Depth group:
 *   Trefoil · Spin Kick · X-Ray · Dive  (four views of one piece, `knot`)    Orbit    Ghost Word
 * and three small pieces that sit around them: motes (specks in 3D), soft-lights (drifting glows), readout (two lines of small type).
 *
 * Written from shot 4 of the showreel: a small software 3D renderer (rotate, project, cull, painter's sort, shade with a key light,
 * a highlight, a rim and an iridescent colour ramp). With no params each piece reproduces the reel exactly.
 *
 * THE CAMERA is the same few numbers on every 3D piece (x, y, focal, scale, from, to, pull, close, diveAt, diveDur, phases).
 * A scene that wants a different camera passes the same numbers to the knot, the orbit and the motes, so they move together.
 * `phases` says which moves play: 'draw' (the camera pulls back and the knot draws itself on), 'kick', 'scan' and 'dive'.
 * The Menu names are presets of that list: Trefoil = ['draw'], Spin Kick = ['kick'], X-Ray = ['scan'], Dive = ['dive'].
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL, E, clamp, lerp, prog, hash, ramp, rgbaHex } = L;
  const BEAT = R.BEAT;

  /* ── the camera, shared by every 3D piece ─────────────────────── */
  const CAM = {
    phases: ['draw', 'kick', 'scan', 'dive'],
    x: 1004, y: 556, focal: 1080, scale: 1,
    from: 6.4, to: 8.6, pull: .8, close: 2.5, diveAt: BEAT * 3 - .05, diveDur: .52,
  };
  const CAM_DOC = {
    phases: 'which moves play: draw (the camera pulls back and the knot draws itself), kick, scan and dive. Each piece reacts to the ones that concern it',
    x: 'where the knot sits on screen (x)',
    y: 'where the knot sits on screen (y)',
    focal: 'the lens, in px. A bigger number makes the whole picture bigger',
    scale: 'zoom around the knot (1 is the size in the reel)',
    from: 'how far the camera starts from the knot',
    to: 'how far the camera is once it has settled',
    pull: 'how long the pull back takes (s)',
    close: 'how near the camera gets in the dive (smaller is closer)',
    diveAt: 'when the dive starts (s after at)',
    diveDur: 'how long the dive takes (s)',
  };
  const pick = (src, keys) => { const o = {}; for (const k of keys) o[k] = src[k]; return o; };
  const ALL = Object.keys(CAM), NEAR = ['phases', 'diveAt', 'diveDur'];
  const has = (p, k) => p.phases.indexOf(k) >= 0;
  const inList = (list, k) => list.indexOf(k) >= 0;

  /* how far into the dive we are (0 to 1) */
  const diveAmount = (p, t) => (has(p, 'dive') ? E.inCubic(prog(t, p.at + p.diveAt, p.diveDur)) : 0);
  /* how far the camera is from the knot: pulled back at the start, then through the dive */
  function distance(p, t) {
    const dive = diveAmount(p, t);
    const near = has(p, 'draw') ? lerp(p.from, p.to, E.outExpo(prog(t, p.at + 0, p.pull))) : p.to;
    return { dive, D: near - (p.to - p.close) * dive };
  }

  /* ── the knot: a tube along a torus knot, as a grid of quads ───────────────────────────────── */
  const meshes = new Map(), luts = new Map();

  /* Built once per shape (in warm, and on demand): a pure function of the shape, so any worker builds the same one. */
  function getMesh(p) {
    const [kp, kq] = p.shape, NU = p.segments, NV = p.sides, rt = p.tube;
    const key = [kp, kq, NU, NV, rt].join('|');
    let M = meshes.get(key); if (M) return M;
    M = { NU, NV };
    const P = u => { const r = Math.cos(kq * u) + 2; return [r * Math.cos(kp * u), r * Math.sin(kp * u), -Math.sin(kq * u)]; };
    const nv = (NU + 1) * (NV + 1);
    M.pos = new Float32Array(nv * 3); M.nrm = new Float32Array(nv * 3);
    const eps = 1e-3;
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
    meshes.set(key, M);
    return M;
  }
  /* the iridescent colour ramp as 256 steps */
  function getLut(stops) {
    const key = JSON.stringify(stops); let lut = luts.get(key);
    if (!lut) { lut = []; for (let i = 0; i < 256; i++) lut.push(ramp(stops, i / 255)); luts.set(key, lut); }
    return lut;
  }
  const unit = v => { const n = Math.hypot(...v); return v.map(x => x / n); };

  /* rotate + project every vertex for this sample */
  function project(M, rm, D, f, cx, cy) {
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

  /* draw the knot: far wireframe first, then the solid quads from far to near, then the near wireframe.
     Quads left of the scan line (right of it when the scan runs the other way) are wireframe instead of solid. */
  function drawKnot(ctx, M, p, rm, D, f, cx, cy, iMax, scanX, sgn) {
    const NU = M.NU, NV = M.NV, LUT = getLut(p.colors), KEY = unit(p.light);
    project(M, rm, D, f, cx, cy);
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
      if (sgn > 0 ? cxs < scanX : cxs > scanX) (front ? wireF : wireB).push(q); else if (front) solid.push(q);
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
    wire(wireB, p.wireBack, 1.1);
    /* solid, painter's order */
    solid.sort((u, w) => dep[w] - dep[u]);
    ctx.lineWidth = .9;
    for (const q of solid) {
      const i = (q / NV) | 0, j = q - i * NV, a = i * stride + j, b = a + stride, c = b + 1, d = a + 1;
      let nx = NX[a] + NX[c], ny = NY[a] + NY[c], nz = NZ[a] + NZ[c]; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const px = (VX[a] + VX[c]) * .5, py = (VY[a] + VY[c]) * .5, pz = (VZ[a] + VZ[c]) * .5, pl = Math.hypot(px, py, pz);
      const vx = -px / pl, vy = -py / pl, vz = -pz / pl;
      const ndv = Math.max(0, nx * vx + ny * vy + nz * vz), fres = Math.pow(1 - ndv, 2.4);
      const diff = Math.max(0, nx * KEY[0] + ny * KEY[1] + nz * KEY[2]);
      const hx = KEY[0] + vx, hy = KEY[1] + vy, hz = KEY[2] + vz, hn = Math.hypot(hx, hy, hz) || 1;
      const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hn), 70);
      let h = .5 + .42 * (nx * .35 + ny * .75 - nz * .15) + .55 * fres + .1 * Math.sin(i / NU * L.TAU * p.bands);
      h = Math.abs(((h % 2) + 2) % 2 - 1);
      const col = LUT[(h * 255) | 0], k = .34 + .8 * diff;
      const r = Math.min(255, col[0] * k + spec * 235 + fres * 70), gg = Math.min(255, col[1] * k + spec * 235 + fres * 80), bb = Math.min(255, col[2] * k + spec * 235 + fres * 140);
      const s = `rgb(${r | 0},${gg | 0},${bb | 0})`;
      ctx.fillStyle = s; ctx.strokeStyle = s;
      ctx.beginPath(); ctx.moveTo(SX[a], SY[a]); ctx.lineTo(SX[b], SY[b]); ctx.lineTo(SX[c], SY[c]); ctx.lineTo(SX[d], SY[d]); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    wire(wireF, p.wire, 1.25);
  }

  /* the scan line: a bright bar with a soft trail behind it, a glow and a small label */
  function scanLine(ctx, p, x, sgn, env) {
    const gr = ctx.createLinearGradient(x - 220 * sgn, 0, x, 0);
    gr.addColorStop(0, rgbaHex(p.scanColor, 0)); gr.addColorStop(1, rgbaHex(p.scanColor, .22));
    ctx.fillStyle = gr; ctx.fillRect(Math.min(x, x - 220 * sgn), 0, 220, env.H);
    ctx.fillStyle = p.barColor; ctx.fillRect(x - 1.5, 0, 3, env.H);
    L.glow(ctx, x, env.H / 2, 380, p.scanColor, .2);
    ctx.font = p.font; ctx.letterSpacing = p.track; ctx.fillStyle = rgbaHex(p.barColor, .85); ctx.textAlign = sgn > 0 ? 'left' : 'right';
    ctx.fillText(p.text, x + 14 * sgn, p.labelY);
  }

  KIT.piece('knot', {
    group: 'depth',
    doc: 'A glossy 3D knot that draws itself along its path, spins, takes a kick on the beat, turns to wireframe under a scan line, then lets the camera dive through it.',
    defaults: Object.assign({ at: 0 }, CAM, {
      parts: ['knot', 'line'],
      shape: [2, 3], tube: .38, segments: 320, sides: 26,
      colors: [[0, '#2430B8'], [.25, '#6C7DFF'], [.45, '#B7A4FF'], [.62, '#FFB0C8'], [.8, '#FFD3BE'], [1, '#8CF7D8']],
      light: [-.5, .62, -.6], bands: 3, wire: 'rgba(242,238,229,.62)', wireBack: 'rgba(183,164,255,.16)',
      angle: 1.0, spin: 1.55, entry: 5.2, entryDur: 1.05, tilt: .55, sway: .1, swayRate: 2.1, lean: .25, drawDur: .55,
      kick: 1.5, beat: 1, kickDur: .5, kickTilt: .22, bounce: 1.2,
      scanAt: BEAT * 2, scanDur: .44, dir: 'right', scanColor: PAL.mint, barColor: PAL.bone, text: 'TOPOLOGY', font: '500 14px "JetBrains Mono"', track: '2.4px', labelY: 150,
      roll: 1.0, pitch: .2,
    }),
    params: Object.assign({
      at: 'when the clock of this piece starts (s). The moves below are counted from here',
      parts: 'what to draw: knot (the solid knot and its wireframe) and line (the scan line and its label). A scene can draw them as two layers so another piece sits between',
      shape: 'the knot type [turns round the middle, turns through the hole]. [2, 3] is the trefoil',
      tube: 'how thick the tube is',
      segments: 'quads along the knot. More is smoother and slower',
      sides: 'quads round the tube',
      colors: 'the colour ramp that runs over the knot: [[0 to 1, "#hex"], ...]',
      light: 'the direction the light comes from [x, y, z]',
      bands: 'how many colour bands run along the knot',
      wire: 'colour of the near wireframe',
      wireBack: 'colour of the far wireframe',
      angle: 'the angle it starts at (radians)',
      spin: 'how fast it turns (radians a second)',
      entry: 'extra turn it arrives with, which settles (radians)',
      entryDur: 'how long that arrival turn takes (s)',
      tilt: 'how far it leans towards the camera (radians)',
      sway: 'how much the lean wobbles (radians)',
      swayRate: 'how fast the lean wobbles',
      lean: 'the sideways roll it rests at (radians)',
      drawDur: 'how long it takes to draw itself on (s)',
      kick: 'how much extra spin the kick adds (radians)',
      beat: 'which beat the kick lands on (0 is the first beat after at, 1 the second)',
      kickDur: 'how long the kick takes to settle (s)',
      kickTilt: 'how far the kick tips it (radians)',
      bounce: 'how far the kick overshoots before it settles',
      scanAt: 'when the scan starts (s after at)',
      scanDur: 'how long the scan takes to cross the frame (s). Smaller is faster',
      dir: 'which way the scan travels: right or left. The side it has passed turns to wireframe',
      scanColor: 'colour of the scan line glow and trail',
      barColor: 'colour of the bright bar and its label',
      text: 'the small label that rides on the scan line',
      font: 'label font',
      track: 'label letter-spacing as CSS text',
      labelY: 'where the label sits (y)',
      roll: 'how far the knot rolls during the dive (radians)',
      pitch: 'how far the knot tips back during the dive (radians)',
    }, CAM_DOC),
    warm(p) { getMesh(p); getLut(p.colors); },
    warmKey: p => [p.shape.join(','), p.tube, p.segments, p.sides, JSON.stringify(p.colors)].join('|'),
    cues(p, env) {
      const B = env.BEAT, c = [];
      if (has(p, 'draw')) c.push({ dt: .05, kind: 'draw', props: { dur: .5 } });
      if (has(p, 'kick')) c.push({ dt: p.beat * B, hit: .6, props: { kick: 1 } });
      if (has(p, 'scan')) { c.push({ dt: p.scanAt, kind: 'scan', props: { dur: .42 } }); c.push({ dt: p.scanAt, hit: .35, props: { scan: 1 } }); }
      if (has(p, 'dive')) c.push({ dt: p.diveAt - .03, kind: 'whoosh', props: { dir: 'in', dur: .5 } });
      return c;
    },
    draw(ctx, t, p, env) {
      const B = env.BEAT, W = env.W;
      const tt = Math.max(0, t - p.at);
      const { D, dive } = distance(p, t);
      const f = p.focal * p.scale, cx = p.x, cy = p.y;
      /* the scan: where its line is, and which way it runs */
      const sgn = p.dir === 'left' ? -1 : 1;
      const scanP = has(p, 'scan') ? E.inOutCubic(prog(t, p.at + p.scanAt, p.scanDur)) : 0;
      const scanX = scanP <= 0 ? -1e4 * sgn : (sgn > 0 ? lerp(-160, W + 160, scanP) : lerp(W + 160, -160, scanP));
      if (inList(p.parts, 'knot')) {
        /* camera and pose: spin (with the arrival turn and the kick), lean, roll */
        const kAt = p.at + p.beat * B;
        const kick = has(p, 'kick') ? p.kick * E.outBack(prog(t, kAt, p.kickDur), p.bounce) : 0;
        const nod = has(p, 'kick') ? p.kickTilt * E.outBack(prog(t, kAt, p.kickDur)) : 0;
        const entry = has(p, 'draw') ? p.entry * E.outExpo(prog(t, p.at + 0, p.entryDur)) : 0;
        const ry = p.angle + p.spin * tt + entry + kick;
        const rx = p.tilt + p.sway * Math.sin(tt * p.swayRate) + nod - p.pitch * dive;
        const rz = p.lean + p.roll * dive;
        const rm = L.rotMat(rx, ry, rz);
        const M = getMesh(p), NU = M.NU;
        /* the knot draws itself on along its path */
        const iMax = has(p, 'draw') ? Math.max(0, Math.min(NU, Math.ceil(NU * E.outExpo(prog(t, p.at + 0, p.drawDur))))) : NU;
        if (iMax > 0) drawKnot(ctx, M, p, rm, D, f, cx, cy, iMax, scanX, sgn);
      }
      if (inList(p.parts, 'line') && scanP > 0 && scanP < 1) scanLine(ctx, p, scanX, sgn, env);
    },
  });
  KIT.alias('trefoil', 'knot', { phases: ['draw'] }, 'A glossy 3D knot that draws itself along its path.');
  KIT.alias('spin-kick', 'knot', { phases: ['kick'], beat: 0 }, 'A beat kicks the spin faster.');
  KIT.alias('x-ray', 'knot', { phases: ['scan'], scanAt: 0 }, 'A scan line turns solid into wireframe.');
  KIT.alias('dive', 'knot', { phases: ['dive'], diveAt: 0 }, 'The camera flies through the object.');

  /* ── orbit: a tilted ring with glowing satellites; `half` picks the half nearer or farther than the knot ── */
  function ring(ctx, p, t, D, f, cx, cy, front) {
    const rm = L.rotMat(p.tilt[0], t * p.spin, p.tilt[1]), Rr = p.radius, n = p.segments;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const a = i / n * L.TAU, x = Rr * Math.cos(a), z = Rr * Math.sin(a);
      const X = rm[0] * x + rm[2] * z, Y = rm[3] * x + rm[5] * z, Z = rm[6] * x + rm[8] * z + D;
      pts.push([cx + X * f / Z, cy - Y * f / Z, Z]);
    }
    ctx.lineCap = 'round'; ctx.lineWidth = p.line;
    for (let i = 0; i < n; i++) {
      if (pts[i][2] < .6 || pts[i + 1][2] < .6) continue;                      // behind or through the camera during the dive
      const isFront = (pts[i][2] + pts[i + 1][2]) / 2 < D;
      if (isFront !== front) continue;
      ctx.strokeStyle = front ? p.lineFront : p.lineBack;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
    }
    const cols = p.colors, spread = KIT.val(p.spread, p.count);
    for (let k = 0; k < p.count; k++) {
      const col = cols[k % cols.length];
      const a = t * p.speed + k * spread, x = Rr * Math.cos(a), z = Rr * Math.sin(a);
      const X = rm[0] * x + rm[2] * z, Y = rm[3] * x + rm[5] * z, Z = rm[6] * x + rm[8] * z + D;
      if (Z < .6 || (Z < D) !== front) continue;
      const sx = cx + X * f / Z, sy = cy - Y * f / Z, r = p.size * f / Z;
      const gr = ctx.createRadialGradient(sx - r * .35, sy - r * .4, r * .1, sx, sy, r);
      gr.addColorStop(0, '#fff'); gr.addColorStop(.35, col); gr.addColorStop(1, rgbaHex(col, .55));
      L.glow(ctx, sx, sy, r * 3.2, col, p.glow);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(sx, sy, r, 0, L.TAU); ctx.fill();
    }
  }
  KIT.piece('orbit', {
    group: 'depth',
    doc: 'A tilted ring with three glowing satellites circles the knot, drawn in two halves so the knot can sit between them.',
    defaults: Object.assign({ at: 0 }, pick(CAM, ALL), {
      half: 'both', radius: 4.7, count: 3, colors: [PAL.coral, PAL.bone, PAL.mint], tilt: [.95, .25], spin: .6, speed: 1.25,
      spread: n => (n === 3 ? 2.094 : L.TAU / n),
      size: .24, segments: 120, line: 2.2, lineFront: 'rgba(242,238,229,.7)', lineBack: 'rgba(242,238,229,.22)', glow: .35,
    }),
    params: Object.assign({
      at: 'when the clock of this piece starts (s)',
      half: 'which half to draw: back (farther than the knot), front (nearer) or both',
      radius: 'ring size, in the knot\'s own units',
      count: 'how many satellites',
      colors: 'satellite colours, used in turn',
      tilt: 'how the ring is tipped [forward, sideways] (radians)',
      spin: 'how fast the ring turns (radians a second)',
      speed: 'how fast the satellites travel round it (radians a second)',
      spread: 'the angle between neighbouring satellites (radians), or a function of the count. By default they are spaced evenly, which for three is 2.094',
      size: 'satellite size, in the knot\'s own units',
      segments: 'how many pieces the ring line is cut into',
      line: 'ring line width (px)',
      lineFront: 'colour of the near half of the ring',
      lineBack: 'colour of the far half of the ring',
      glow: 'strength of the glow round each satellite',
    }, pick(CAM_DOC, ALL)),
    draw(ctx, t, p) {
      const tt = Math.max(0, t - p.at), { D } = distance(p, t), f = p.focal * p.scale;
      const halves = p.half === 'both' ? [false, true] : [p.half === 'front'];
      for (const front of halves) ring(ctx, p, tt, D, f, p.x, p.y, front);
    },
  });

  /* ── ghost word: a giant outlined word behind the 3D object ─────────────────────────────────
     The whole layout is this one function of the text, so another script (Farsi, right to left) only has to change it.
     The word is stroked wide, then the fill is erased, so a variable font's overlapping contours never show. */
  const words = new Map(), measure = L.canvas(8, 8).getContext('2d');
  function layoutWord(p) {
    const key = [p.text, p.size, p.font, p.outline, p.box.join('x'), p.baseline].join('|');
    let w = words.get(key); if (w) return w;
    const font = p.font.replace('{s}', p.size);
    measure.font = font;
    const cw = Math.max(p.box[0], Math.ceil(measure.measureText(p.text).width + 2 * p.outline + 40));   // the picture grows for a long word
    const ch = Math.max(p.box[1], Math.ceil(p.size * 1.3)), base = Math.max(p.baseline, Math.ceil(p.size * 1.05));
    const wc = L.canvas(cw, ch), wx = wc.getContext('2d');
    wx.font = font; wx.textAlign = 'center'; wx.lineJoin = 'round';
    wx.strokeStyle = '#fff'; wx.lineWidth = p.outline; wx.strokeText(p.text, cw / 2, base);
    wx.globalCompositeOperation = 'destination-out'; wx.fillStyle = '#000'; wx.fillText(p.text, cw / 2, base);
    w = { canvas: wc, w: cw, h: ch };
    words.set(key, w);
    return w;
  }
  KIT.piece('ghost-word', {
    group: 'depth',
    doc: 'A giant outlined word sits behind the 3D object, drifts slowly sideways and swells as the camera dives.',
    defaults: Object.assign({ at: 0 }, pick(CAM, NEAR), {
      text: 'DEPTH', font: '900 {s}px "Unbounded"', size: 380, outline: 9, alpha: .5, x: 960, y: 540, drift: 110, settle: .9, zoom: 1.6, box: [2100, 520], baseline: 400,
    }),
    params: Object.assign({
      at: 'when the clock of this piece starts (s)',
      text: 'the word',
      font: 'CSS font with {s} where the size goes',
      size: 'letter height (px)',
      outline: 'outline weight (px)',
      alpha: 'how strong it is (0 to 1)',
      x: 'where the word is centred when it has settled (x)',
      y: 'where the word is centred (y)',
      drift: 'how far it drifts sideways in a second (px)',
      settle: 'the time it sits exactly on x (s after at)',
      zoom: 'how much it swells in the dive (0 for none)',
      box: 'size of the picture the outline is drawn into [w, h] in px. It grows by itself for a longer word or bigger letters',
      baseline: 'where the letters sit in that picture (y)',
    }, pick(CAM_DOC, NEAR)),
    warm(p) { layoutWord(p); },
    warmKey: p => [p.text, p.size, p.font, p.outline, p.box.join('x'), p.baseline].join('|'),
    draw(ctx, t, p) {
      const w = layoutWord(p), tt = Math.max(0, t - p.at), dive = diveAmount(p, t);
      ctx.translate(p.x - (tt - p.settle) * p.drift, p.y); ctx.scale(1 + dive * p.zoom, 1 + dive * p.zoom);
      ctx.globalAlpha = p.alpha; ctx.drawImage(w.canvas, -w.w / 2, -w.h / 2);
    },
  });

  /* ── motes: specks of light floating in 3D, each at its own depth and speed ── */
  const speckLists = new Map();
  function getSpecks(p) {
    const key = [p.count, p.area.join(','), p.nearest].join('|');
    let s = speckLists.get(key); if (s) return s;
    s = []; for (let i = 0; i < p.count; i++) s.push([(hash(i, 1) - .5) * p.area[0], (hash(i, 2) - .5) * p.area[1], hash(i, 3) * p.area[2] + p.nearest, .5 + hash(i, 4)]);
    speckLists.set(key, s);
    return s;
  }
  KIT.piece('motes', {
    group: 'depth',
    doc: 'Specks of light float in 3D space and drift past the camera, each at its own speed.',
    defaults: Object.assign({ at: 0 }, pick(CAM, ALL), { count: 90, color: '#D6DEFF', alpha: .5, size: .05, area: [22, 12, 11], nearest: -3, drift: [.5, .6], fog: .08 }),
    params: Object.assign({
      at: 'when the clock of this piece starts (s)',
      count: 'how many specks',
      color: 'colour',
      alpha: 'how bright the nearest ones are (0 to 1)',
      size: 'speck size, in the knot\'s own units',
      area: 'the box they fill [wide, high, deep]',
      nearest: 'where the nearest specks start in depth (negative is nearer the camera than the knot)',
      drift: 'how fast they slide sideways and towards the camera',
      fog: 'how quickly far specks fade (bigger fades sooner)',
    }, pick(CAM_DOC, ALL)),
    warm(p) { getSpecks(p); },
    warmKey: p => [p.count, p.area.join(','), p.nearest].join('|'),
    draw(ctx, t, p) {
      const tt = Math.max(0, t - p.at), { D } = distance(p, t), f = p.focal * p.scale, cx = p.x, cy = p.y;
      ctx.globalCompositeOperation = 'lighter';
      for (const [dx, dy, dz, sz] of getSpecks(p)) {
        const Z = dz + D - tt * p.drift[1] * sz; if (Z < .5) continue;
        const x = cx + (dx - tt * p.drift[0] * sz) * f / Z, y = cy - dy * f / Z;
        const r = Math.max(.8, p.size * f / Z * sz);
        ctx.fillStyle = rgbaHex(p.color, p.alpha / (1 + Z * p.fog)); ctx.beginPath(); ctx.arc(x, y, r, 0, L.TAU); ctx.fill();
      }
    },
  });

  /* ── soft lights: big blurred blobs of colour that drift behind the scene ── */
  KIT.piece('soft-lights', {
    group: 'furniture',
    doc: 'Big soft blobs of coloured light drift slowly behind the scene.',
    defaults: {
      at: 0,
      lights: [
        { x: t => 360 + Math.sin(t * 1.3) * 80, y: 250, r: 520, color: PAL.lilac, alpha: .09 },
        { x: t => 1560 + Math.cos(t * 1.1) * 90, y: 880, r: 560, color: PAL.coral, alpha: .07 },
      ],
    },
    params: {
      at: 'when the clock of this piece starts (s)',
      lights: 'the lights, each { x, y, r (radius), color, alpha }. x and y may be functions of the time since at (s), which is how a light drifts',
    },
    draw(ctx, t, p) {
      const tt = Math.max(0, t - p.at);
      for (const l of p.lights) L.glow(ctx, KIT.val(l.x, tt), KIT.val(l.y, tt), l.r, l.color, l.alpha);
    },
  });

  /* ── readout: two lines of small tracked type at the bottom left that rise in and fade ── */
  KIT.piece('readout', {
    group: 'furniture',
    doc: 'Two small lines of letter-spaced type at the bottom left rise into place, fade in and can fade out again.',
    defaults: {
      text: ['TORUS KNOT (2,3)', '8,320 FACES · SOFTWARE 3D'], alphas: [.75, .45], x: 96, y: 930, lead: 26,
      at: .2, dur: .5, rise: 20, out: null, slideOut: false,
      font: '500 15px "JetBrains Mono"', track: '2.4px', color: PAL.bone, align: 'left',
    },
    params: {
      text: 'the lines, one text for each',
      alphas: 'how strong each line is (0 to 1)',
      x: 'where the lines are anchored (x)',
      y: 'baseline of the first line once it has risen',
      lead: 'distance between the lines (px)',
      at: 'when they start to appear (s)',
      dur: 'how long they take to appear (s)',
      rise: 'how far they rise (px)',
      out: 'when they fade out: [start (s), how long (s)], or null to stay',
      slideOut: 'true: they also slide back down while they fade out',
      font: 'CSS font',
      track: 'letter-spacing as CSS text',
      color: 'text colour',
      align: 'left | center | right',
    },
    draw(ctx, t, p) {
      const sp = E.outExpo(prog(t, p.at, p.dur));
      const fade = p.out ? 1 - E.inCubic(prog(t, p.out[0], p.out[1])) : 1;
      const k = p.slideOut ? sp * fade : sp;
      if (k <= .01) return;
      ctx.globalAlpha = sp * fade;
      ctx.font = p.font; ctx.letterSpacing = p.track; ctx.textAlign = p.align;
      for (let i = 0; i < p.text.length; i++) {
        ctx.fillStyle = rgbaHex(p.color, p.alphas[i]);
        ctx.fillText(p.text[i], p.x, p.y + i * p.lead + (1 - k) * p.rise);
      }
    },
  });
})(window);
