/* engine.js — the timeline kit's engine (from reel 9, 2026-10-02): maths, easing, springs, DOM helpers, the ball and its effects, footage plates.
   EVERYTHING HERE IS A PURE FUNCTION OF TIME: give it t (seconds) and it returns / paints the state at t, never reads a clock.
   That is what lets one page serve a still at any instant (?t=5.2), a real-time preview, and a render that takes 20 sub-frames per frame.
   Loaded before driver.js and scenes.js; globals on purpose (small files, one author). Read timeline/README.md first. */
'use strict';

const W = 1080, H = 1920, FPS = 30, TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));          // 0..1 progress of t inside [a,b]
const sstep = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const hypot = Math.hypot;

/* ---------- easing ---------- */
function bezier(x1, y1, x2, y2) {                           // CSS cubic-bezier as a function
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = t => ((ax * t + bx) * t + cx) * t, sy = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const e = sx(t) - x; if (Math.abs(e) < 1e-5) break; const d = dx(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    let lo = 0, hi = 1; t = clamp(t);
    for (let i = 0; i < 20 && Math.abs(sx(t) - x) > 1e-5; i++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}
const E = {
  lin: x => x,
  inQuad: x => x * x, outQuad: x => 1 - (1 - x) * (1 - x),
  inCubic: x => x * x * x, outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  inQuart: x => x * x * x * x, outQuart: x => 1 - Math.pow(1 - x, 4),
  inOutQuart: x => x < .5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2,
  outQuint: x => 1 - Math.pow(1 - x, 5),
  outExpo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x),
  inExpo: x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10),
  outBack: (x, s = 1.70158) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2),
  house: bezier(.16, 1, .3, 1),                              // the house ease: fast out, long settle
  soft: bezier(.65, 0, .35, 1),
  snap: bezier(.2, .9, .1, 1),
};
/* closed-form damped spring from 0 to 1, in absolute seconds (f = Hz, z = damping ratio) */
function spring(sec, f = 3.2, z = .42) {
  if (sec <= 0) return 0;
  const w = TAU * f, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * sec) * (Math.cos(wd * sec) + (z * w / wd) * Math.sin(wd * sec));
}
/* pulse: 0 -> 1 -> 0 over [a,b] with the peak at the given fraction */
const bump = (t, a, b, k = .3) => { const u = prog(t, a, b); return u <= 0 || u >= 1 ? 0 : (u < k ? E.outCubic(u / k) : 1 - E.inOutCubic((u - k) / (1 - k))); };

/* ---------- misc ---------- */
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const FA = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const fa = n => String(n).replace(/[0-9]/g, d => FA[+d]);
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
function show(el, on) { const v = on ? '' : 'none'; if (el._d !== v) { el.style.display = v; el._d = v; } }
/* write transform + opacity only when they change */
function put(el, o) {
  const x = o.x || 0, y = o.y || 0, sx = o.sx !== undefined ? o.sx : (o.s !== undefined ? o.s : 1), sy = o.sy !== undefined ? o.sy : (o.s !== undefined ? o.s : 1);
  let tr = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0)`;
  if (o.rx) tr += ` rotateX(${o.rx.toFixed(2)}deg)`;
  if (o.ry) tr += ` rotateY(${o.ry.toFixed(2)}deg)`;
  if (o.r) tr += ` rotate(${o.r.toFixed(3)}deg)`;
  if (sx !== 1 || sy !== 1) tr += ` scale(${sx.toFixed(4)},${sy.toFixed(4)})`;
  if (el._tr !== tr) { el.style.transform = tr; el._tr = tr; }
  if (o.o !== undefined) { const op = clamp(o.o).toFixed(3); if (el._op !== op) { el.style.opacity = op; el._op = op; } }
}
function setStyle(el, prop, val) { if (el['_' + prop] !== val) { el.style[prop] = val; el['_' + prop] = val; } }

/* ---------- colours ---------- */
const TINTS = {
  pink: { base: [236, 153, 175], light: [255, 214, 226], dark: [170, 88, 118], glow: [236, 153, 175] },
  lime: { base: [208, 255, 65], light: [244, 255, 170], dark: [128, 170, 20], glow: [208, 255, 65] },
  white: { base: [255, 255, 255], light: [255, 255, 255], dark: [200, 210, 205], glow: [255, 255, 255] },
  // Amir's brand: clay #C7552F (glow = clay-2 #E06B43). No yellow in his work: use clay, or a photo sprite of the real ball (loadSprite)
  clay: { base: [199, 85, 47], light: [232, 131, 94], dark: [143, 58, 28], glow: [224, 107, 67] },
};
const mixRGB = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function mixTint(a, b, t) { if (a.sprite || b.sprite) return t < .5 ? a : b; return { base: mixRGB(a.base, b.base, t), light: mixRGB(a.light, b.light, t), dark: mixRGB(a.dark, b.dark, t), glow: mixRGB(a.glow, b.glow, t) }; }

/* =====================================================================================================================
   THE BALL — a path made of legs, each solved to land exactly where and when we say.
   leg: { type:'arc'|'line'|'hold', t0, t1, p0:[x,y], p1:[x,y], apexY, ease, r0, r1, w (spin, rad/s), tag }
   'arc'  is a true parabola: x moves linearly, y follows gravity; the gravity is SOLVED so the apex height and the arrival time come out as asked.
   'line' is an eased straight run (a smash toward the camera, a glide).   'hold' keeps still.
   ===================================================================================================================== */
const Ball = { legs: [], impacts: [], spinAxis: [.34, .86, .38], tilt0: [.5, -.35] };

function prepLegs(legs) {
  let ang = 0;
  legs.sort((a, b) => a.t0 - b.t0);
  for (const L of legs) {
    L.T = L.t1 - L.t0;
    if (L.r0 === undefined) L.r0 = 62; if (L.r1 === undefined) L.r1 = L.r0;
    if (L.w === undefined) L.w = 9;
    L.ang0 = ang; ang += L.w * L.T;
    if (L.type === 'arc') {
      const dy = L.p1[1] - L.p0[1];
      let h = Math.max(0, L.p0[1] - L.apexY);
      h = Math.max(h, -dy);                                  // the apex can't be lower than the end point
      const s = (Math.sqrt(2 * h) + Math.sqrt(Math.max(0, 2 * (h + dy)))) / L.T;
      L.g = s * s; L.vy0 = -Math.sqrt(2 * L.g * h);
    }
  }
  return legs;
}
function legPos(L, t) {
  const u = clamp(t - L.t0, 0, L.T), f = u / L.T;
  if (L.type === 'arc') return [lerp(L.p0[0], L.p1[0], L.ease ? L.ease(f) : f), L.p0[1] + L.vy0 * u + .5 * L.g * u * u];
  if (L.type === 'line') { const e = (L.ease || E.lin)(f); return [lerp(L.p0[0], L.p1[0], e), lerp(L.p0[1], L.p1[1], e)]; }
  return [L.p0[0], L.p0[1]];
}
function ballPos(t) {                                         // position only (used for velocity + trail)
  const ls = Ball.legs; if (!ls.length) return null;
  if (t < ls[0].t0 || t > ls[ls.length - 1].t1) return null;
  let L = ls[0];
  for (const l of ls) { if (t >= l.t0) L = l; else break; }
  return { L, p: legPos(L, Math.min(t, L.t1)) };
}
function ballState(t) {
  const q = ballPos(t); if (!q) return null;
  const { L, p } = q, e = 1 / 240;
  const a = ballPos(t - e), b = ballPos(t + e);
  const vx = a && b ? (b.p[0] - a.p[0]) / (2 * e) : 0, vy = a && b ? (b.p[1] - a.p[1]) / (2 * e) : 0;
  const f = clamp((t - L.t0) / L.T);
  const r = L.type === 'arc' || L.type === 'line' ? lerp(L.r0, L.r1, L.rEase ? L.rEase(f) : f) : L.r0;
  return { x: p[0], y: p[1], r, vx, vy, spin: L.ang0 + L.w * clamp(t - L.t0, 0, L.T), L };
}
/* squash on impact: amount 0..1 and the surface normal (pointing away from the surface) */
function squashAt(t) {
  let best = null, bestA = 0;
  for (const im of Ball.impacts) {
    const dt = t - im.t;
    let a = 0;
    if (dt >= 0 && dt < .3) a = im.mag * Math.exp(-dt / .06) * (1 - dt / .3);
    else if (dt < 0 && dt > -.035) a = im.mag * .45 * (1 + dt / .035);
    if (a > bestA) { bestA = a; best = im; }
  }
  return best ? { a: bestA, nx: best.nx, ny: best.ny } : { a: 0, nx: 0, ny: -1 };
}

/* a felt texture, made once (seeded) */
let FELT = null;
function feltPattern(ctx) {
  if (!FELT) {
    const c = document.createElement('canvas'); c.width = c.height = 192;
    const g = c.getContext('2d'), im = g.createImageData(192, 192), r = rng(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = 90 + (r() * 150) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0);
    FELT = ctx.createPattern(c, 'repeat');
  }
  return FELT;
}

/* the seam: the classic two-lobed baseball/tennis curve on a unit sphere */
const SEAM = (() => {
  const a = .42, n = 140, pts = [];
  for (let i = 0; i < n; i++) {
    const t = i / n * TAU;
    pts.push([(1 - a) * Math.cos(t) + a * Math.cos(3 * t), (1 - a) * Math.sin(t) - a * Math.sin(3 * t), 2 * Math.sqrt(a * (1 - a)) * Math.sin(2 * t)]);
  }
  return pts;
})();
function rotAxis(v, ax, th) {                                 // Rodrigues
  const c = Math.cos(th), s = Math.sin(th), d = ax[0] * v[0] + ax[1] * v[1] + ax[2] * v[2];
  const cx = [ax[1] * v[2] - ax[2] * v[1], ax[2] * v[0] - ax[0] * v[2], ax[0] * v[1] - ax[1] * v[0]];
  return [v[0] * c + cx[0] * s + ax[0] * d * (1 - c), v[1] * c + cx[1] * s + ax[1] * d * (1 - c), v[2] * c + cx[2] * s + ax[2] * d * (1 - c)];
}
const AXN = (() => { const a = Ball.spinAxis, l = hypot(a[0], a[1], a[2]); return [a[0] / l, a[1] / l, a[2] / l]; })();

function drawBall(ctx, b, tint, alpha = 1) {
  const r = b.r;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(b.x, b.y);
  // soft glow (the site's own canvas ball glows the same way)
  const gl = ctx.createRadialGradient(0, 0, r * .7, 0, 0, r * 2.5);
  gl.addColorStop(0, rgba(tint.glow, .42)); gl.addColorStop(1, rgba(tint.glow, 0));
  ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, r * 2.5, 0, TAU); ctx.fill();
  // deformation: squash against a surface, else stretch along the velocity
  const sq = b.sq, sp = hypot(b.vx, b.vy);
  let ang, sx, sy;
  if (sq.a > .02) { ang = Math.atan2(sq.ny, sq.nx); sx = 1 - .36 * sq.a; sy = 1 + .26 * sq.a; }
  else { const k = clamp(sp / 7000, 0, .3); ang = Math.atan2(b.vy, b.vx); sx = 1 + k; sy = 1 / Math.sqrt(1 + k); }
  ctx.rotate(ang); ctx.scale(sx, sy); ctx.rotate(-ang);
  if (tint.sprite) {                                         // a photo of the real ball (loadSprite): no procedural body or seam
    ctx.save(); ctx.rotate(b.spin * .5); ctx.drawImage(tint.sprite, -r, -r, 2 * r, 2 * r); ctx.restore(); ctx.restore(); return;
  }
  ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.save(); ctx.clip();
  // body
  const g = ctx.createRadialGradient(-r * .36, -r * .42, r * .08, 0, 0, r * 1.06);
  g.addColorStop(0, rgba(tint.light, 1)); g.addColorStop(.5, rgba(tint.base, 1)); g.addColorStop(1, rgba(tint.dark, 1));
  ctx.fillStyle = g; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  // felt
  ctx.save(); ctx.rotate(b.spin * .6); ctx.globalAlpha = .17 * alpha; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = feltPattern(ctx); ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3); ctx.restore();
  // seam (3D)
  const th = b.spin;
  const proj = SEAM.map(p => {
    let v = rotAxis([p[0], p[1], p[2]], [0, 0, 1], Ball.tilt0[0]);
    v = rotAxis(v, [1, 0, 0], Ball.tilt0[1]);
    v = rotAxis(v, AXN, th);
    return v;
  });
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < proj.length; i++) {
      const p = proj[i], q = proj[(i + 1) % proj.length], z = (p[2] + q[2]) / 2;
      if (z < -.04) continue;
      const vis = sstep((z + .04) / .32);
      const wdt = r * (.115 + .05 * clamp(z));
      ctx.beginPath(); ctx.moveTo(p[0] * r, p[1] * r); ctx.lineTo(q[0] * r, q[1] * r);
      if (pass === 0) { ctx.strokeStyle = rgba(tint.dark, .55 * vis); ctx.lineWidth = wdt * 1.5; }
      else { ctx.strokeStyle = `rgba(255,255,255,${.96 * vis})`; ctx.lineWidth = wdt; }
      ctx.stroke();
    }
  }
  // shading: terminator crescent + specular + rim
  const sh = ctx.createRadialGradient(r * .42, r * .5, r * .2, r * .2, r * .25, r * 1.25);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,18,10,.34)');
  ctx.fillStyle = sh; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  const sp2 = ctx.createRadialGradient(-r * .4, -r * .46, 0, -r * .4, -r * .46, r * .62);
  sp2.addColorStop(0, 'rgba(255,255,255,.55)'); sp2.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sp2; ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  ctx.restore();
}

/* =====================================================================================================================
   BURSTS — dust, sparks and a ring at every impact.  Pure: particle positions come from (time since impact, seeded random).
   impact: { t, x, y, nx, ny, mag, ring, dust:[r,g,b], n, kind }
   ===================================================================================================================== */
function drawBursts(ctx, t) {
  for (const im of Ball.impacts) {
    const dt = t - im.t;
    if (dt < 0 || dt > 1.1) continue;
    const col = im.dust || [255, 233, 232];
    // ring
    if (im.ring !== 0 && dt < .45) {
      const u = dt / .45, rr = (im.ring || 150) * E.outCubic(u) + 20;
      ctx.save(); ctx.translate(im.x, im.y);
      ctx.rotate(Math.atan2(im.ny, im.nx) + Math.PI / 2);
      ctx.scale(1, .34 + .66 * (im.round || 0));
      ctx.strokeStyle = rgba(im.ringCol || col, (1 - u) * .85); ctx.lineWidth = 14 * (1 - u) + 2;
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke(); ctx.restore();
    }
    // dust puffs
    const R = rng(im.seed || Math.round(im.t * 1000) + 11), n = im.n === undefined ? 12 : im.n, base = Math.atan2(im.ny, im.nx);
    for (let i = 0; i < n; i++) {
      const ang = base + (R() - .5) * 2.5, sp = 150 + R() * 520, life = .5 + R() * .5, s0 = 14 + R() * 26;
      if (dt > life) continue;
      const k = 3.2, d = (1 - Math.exp(-dt * k)) / k;
      const x = im.x + Math.cos(ang) * sp * d, y = im.y + Math.sin(ang) * sp * d - 26 * dt;
      const u = dt / life, size = s0 * (1 + 1.7 * u), a = Math.pow(1 - u, 1.4) * .55;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, size);
      gr.addColorStop(0, rgba(col, a)); gr.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
    }
    // sparks
    const ns = im.sparks === undefined ? 7 : im.sparks;
    for (let i = 0; i < ns; i++) {
      const ang = base + (R() - .5) * 2.9, sp = 520 + R() * 900, life = .26 + R() * .2;
      if (dt > life) continue;
      const d = sp * (1 - Math.exp(-dt * 5)) / 5, d0 = sp * (1 - Math.exp(-Math.max(0, dt - .03) * 5)) / 5;
      const x1 = im.x + Math.cos(ang) * d, y1 = im.y + Math.sin(ang) * d, x0 = im.x + Math.cos(ang) * d0, y0 = im.y + Math.sin(ang) * d0;
      const u = dt / life;
      ctx.strokeStyle = rgba(im.sparkCol || [255, 255, 255], (1 - u)); ctx.lineWidth = 6 * (1 - u) + 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
  }
}

/* a tapering comet tail behind the ball: many small overlapping discs, so it reads as one soft streak */
function drawTrail(ctx, t, tintFor, minSpeed = 800) {
  const cur = ballState(t); if (!cur) return;
  if (cur.L.alpha && t > cur.L.t1) return;
  const sp = hypot(cur.vx, cur.vy); if (sp < minSpeed) return;
  const N = 34, span = .26 * clamp(sp / 3600, .4, 1);
  const tint = tintFor(cur), amt = clamp((sp - minSpeed) / 2600);
  let prev = [cur.x, cur.y];
  for (let k = 1; k <= N; k++) {
    const u = k / N, q = ballPos(t - u * span); if (!q) break;
    if (hypot(q.p[0] - prev[0], q.p[1] - prev[1]) > 260) break;                // a jump between legs: stop, never draw across it
    prev = q.p;
    const rr = cur.r * Math.pow(1 - u, .8) * .9;
    ctx.fillStyle = rgba(tint.base, Math.pow(1 - u, 1.6) * .085 * amt * 3);
    ctx.beginPath(); ctx.arc(q.p[0], q.p[1], rr, 0, TAU); ctx.fill();
  }
}

/* speed streaks: thin lines that slide past during a fast move. Seeded; all of them are pure functions of t.
   kind 'h' = horizontal, moving left (reading direction in Farsi);  'up' = vertical trail below a rising line */
const STREAK_SETS = {};
function streakSet(key, n, seed, win) {
  if (!STREAK_SETS[key]) {
    const R = rng(seed), a = [];
    for (let i = 0; i < n; i++) a.push({ ts: win[0] + R() * (win[1] - win[0] - .2), y: 220 + R() * 1500, x: 200 + R() * 1100, len: 240 + R() * 520, w: 2.5 + R() * 4.5, v: 3400 + R() * 3600, life: .14 + R() * .1, c: R() < .3 ? 1 : 0, off: R() * 140 });
    STREAK_SETS[key] = a;
  }
  return STREAK_SETS[key];
}
function drawStreaksH(ctx, t, key, win, seed, n = 30, col = [255, 255, 255], col2 = [236, 153, 175], dir = -1) {
  if (t < win[0] || t > win[1] + .3) return;
  for (const s of streakSet(key, n, seed, win)) {
    const u = (t - s.ts) / s.life; if (u <= 0 || u >= 1) continue;
    const x = s.x + dir * s.v * (t - s.ts), a = Math.sin(Math.PI * u) * .55;
    const g = ctx.createLinearGradient(x, 0, x - dir * s.len, 0);
    const c = s.c ? col2 : col;
    g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
    ctx.strokeStyle = g; ctx.lineWidth = s.w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, s.y); ctx.lineTo(x - dir * s.len, s.y); ctx.stroke();
  }
}
function drawStreaksUp(ctx, t, yLine, key, seed, n = 46, col = [255, 255, 255]) {   // lines trailing below a line that is moving up
  const set = streakSet(key, n, seed, [0, 1]);
  for (const s of set) {
    const x = 20 + (s.x / 1300) * 1040, y0 = yLine + s.off, len = s.len * .85;
    const g = ctx.createLinearGradient(0, y0, 0, y0 + len);
    g.addColorStop(0, rgba(col, .5)); g.addColorStop(1, rgba(col, 0));
    ctx.strokeStyle = g; ctx.lineWidth = s.w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + len); ctx.stroke();
  }
}

/* confetti: pink / lime / blush / white / sky, thrown up from a point, tumbling as they fall */
const CONFETTI_COLS = [[236, 153, 175], [208, 255, 65], [255, 233, 232], [255, 255, 255], [46, 134, 240], [236, 153, 175]];
function drawConfetti(ctx, t, t0, x0, y0, n, seed, spread = 1.5) {
  const dt = t - t0; if (dt < 0 || dt > 2.3) return;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI / 2 + (R() - .5) * spread, sp = 520 + R() * 1250, life = 1.15 + R() * .55, ph = R() * TAU, wr = (R() - .5) * 16, fl = 7 + R() * 7;
    const col = CONFETTI_COLS[(R() * CONFETTI_COLS.length) | 0], w = 12 + R() * 11, h = 22 + R() * 16;
    if (dt > life) continue;
    const k = 1.7, d = (1 - Math.exp(-k * dt)) / k;
    const x = x0 + Math.cos(ang) * sp * d + Math.sin(dt * 3 + ph) * 18 * dt, y = y0 + Math.sin(ang) * sp * d + .5 * 1500 * dt * dt * .75;
    const a = 1 - sstep((dt - (life - .45)) / .45);
    ctx.save(); ctx.translate(x, y); ctx.rotate(ph + wr * dt); ctx.scale(Math.abs(Math.cos(fl * dt + ph)) * .9 + .1, 1);
    ctx.fillStyle = rgba(col, a); ctx.fillRect(-w / 2, -h / 2, w, h); ctx.restore();
  }
}


/* =====================================================================================================================
   HELPERS THAT EVERY REEL NEEDS (they lived in reel 9's scenes.js)
   ===================================================================================================================== */
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs, parent) { const e = document.createElementNS(SVGNS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
/* lines that draw themselves on: addLine / addRect set up the dash, drawOn(item, 0..1) moves it. Give them class 'ln' (stroke, fill:none in your CSS). */
const DRAW = [];
function addLine(g, x1, y1, x2, y2, cls = 'ln') { const l = svgEl('line', { x1, y1, x2, y2, class: cls }, g); const len = hypot(x2 - x1, y2 - y1); l.style.strokeDasharray = len; l.style.strokeDashoffset = len; const it = { el: l, len }; DRAW.push(it); return it; }
function addRect(g, x, y, w, h, rx, cls = 'ln') { const r = svgEl('rect', { x, y, width: w, height: h, rx, class: cls }, g); const len = 2 * (w + h); r.style.strokeDasharray = len; r.style.strokeDashoffset = len; const it = { el: r, len }; DRAW.push(it); return it; }
const drawOn = (it, p) => { const v = (it.len * (1 - p)).toFixed(1); if (it._o !== v) { it.el.style.strokeDashoffset = v; it._o = v; } };
/* text -> word masks. Persian letters JOIN to their neighbours, so the unit of animation is the WORD, never the letter.
   Needs the .wm / .wi CSS from the starter template. Returns the .wi elements; animate each with riseTo(wi, 0..1). */
function wordify(el) {
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => '<span class="wm"><span class="wi">' + w + '</span></span>').join(' ');
  return [...el.querySelectorAll('.wi')];
}
const riseTo = (wi, p) => { const v = `translateY(${(118 * (1 - p)).toFixed(2)}%)`; if (wi._r !== v) { wi.style.transform = v; wi._r = v; } };
/* a scroll position from keyframes [[t, y], ...] with an ease between each pair (a page scrolling inside a phone) */
function keyScroll(t, keys, ease = E.inOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, y0] = keys[i - 1], [t1, y1] = keys[i]; return lerp(y0, y1, ease(prog(t, t0, t1))); }
  return keys[keys.length - 1][1];
}
/* how hard something was just hit (1 -> 0): press a button, a phone or a badge when the ball lands. test(impact) picks which impacts count. */
function pressAt(t, test) {
  let a = 0;
  for (const im of Ball.impacts) if (test(im)) { const dt = t - im.t; if (dt >= 0 && dt < .4) a = Math.max(a, im.mag * Math.exp(-dt / .09)); else if (dt < 0 && dt > -.03) a = Math.max(a, im.mag * .3); }
  return a;
}
/* camera shake from impacts that carry `shake` (px): add the result to the camera */
function shakeAt(t) {
  let x = 0, y = 0, r = 0;
  for (const im of Ball.impacts) {
    if (!im.shake) continue;
    const dt = t - im.t; if (dt < 0 || dt > .5) continue;
    const k = Math.exp(-dt / .09);
    x += Math.sin(dt * 95 + im.t) * im.shake * k; y += Math.cos(dt * 83 + 1) * im.shake * k * .8; r += Math.sin(dt * 60) * im.shake * .016 * k;
  }
  return { x, y, r };
}
/* a split background: colour B covers one side of a line through the middle. alpha = direction of the normal in degrees (90 = B below,
   180 = B on the left), d = how far the line is pushed along the normal (px). el = the B layer, seam = an optional thin line element. */
function paintSplit(elB, seam, alpha, d) {
  const a = alpha * Math.PI / 180, nx = Math.cos(a), ny = Math.sin(a), ux = -ny, uy = nx, L = 4200, px = 540 + nx * d, py = 960 + ny * d;
  const P = [[px - ux * L, py - uy * L], [px + ux * L, py + uy * L], [px + ux * L + nx * L, py + uy * L + ny * L], [px - ux * L + nx * L, py - uy * L + ny * L]];
  setStyle(elB, 'clipPath', 'polygon(' + P.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')');
  if (seam) put(seam, { x: nx * d, y: ny * d, r: alpha - 90 });
}

/* =====================================================================================================================
   ASSETS THAT MUST BE READY BEFORE THE FIRST FRAME: push promises into PRELOAD; driver.js awaits them.
   ===================================================================================================================== */
const PRELOAD = [];
/* a photo of the real ball (or any sprite) for drawBall: TINTS.photo = { sprite: await loadSprite(<url of a transparent webp/png in assets>), base:[..], glow:[..] } */
function loadSprite(url) { const p = new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; }); PRELOAD.push(p); return p; }

/* =====================================================================================================================
   FOOTAGE PLATES — a clip as numbered stills, drawn by time (tools/extract_plate.py makes the folder).
   A <video> element would obey neither the page clock nor the renderer; a plate is just another pure function of t.
   ===================================================================================================================== */
const Plates = {};
function plateLoad(name, o) {                                 // o: { dir, count, fps, ext='jpg', pad=5, start=1 }
  const p = Plates[name] = { frames: new Array(o.count), fps: o.fps, count: o.count, w: 0, h: 0 }, jobs = [];
  for (let i = 0; i < o.count; i++) {
    const im = new Image(); p.frames[i] = im;
    jobs.push(new Promise(r => { im.onload = r; im.onerror = r; im.src = `${o.dir}/f_${String(i + (o.start || 1)).padStart(o.pad || 5, '0')}.${o.ext || 'jpg'}`; }));
  }
  PRELOAD.push(Promise.all(jobs).then(() => { const f = p.frames[0]; p.w = f.naturalWidth; p.h = f.naturalHeight; }));
  return p;
}
function plateAt(name, srcT, loop = false) {                  // the frame that belongs at source time srcT (seconds into the clip)
  const p = Plates[name]; let i = Math.floor(srcT * p.fps + 1e-6);
  i = loop ? ((i % p.count) + p.count) % p.count : Math.max(0, Math.min(p.count - 1, i));
  return p.frames[i];
}
function plateDraw(ctx, name, srcT, x, y, w, h, o = {}) {      // cover-fit into the box; o.ax / o.ay = where the crop sits (0..1, default centre); o.loop
  const p = Plates[name], im = plateAt(name, srcT, o.loop); if (!im || !p.w) return;
  const s = Math.max(w / p.w, h / p.h), sw = w / s, sh = h / s, sx = (p.w - sw) * (o.ax === undefined ? .5 : o.ax), sy = (p.h - sh) * (o.ay === undefined ? .5 : o.ay);
  ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
}
