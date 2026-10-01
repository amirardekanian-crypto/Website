/* lib.js — maths, easing, springs, noise, colour and text helpers for the reel.
 *
 * Everything here is a PURE function of its inputs. The reel never keeps state between
 * frames, so any frame can be rendered on its own, in any order, on any worker, and the
 * result is identical (that is what lets tools/render.js fan frames out across pages).
 */
(function (g) {
  'use strict';

  const TAU = Math.PI * 2, PI = Math.PI;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, start, dur) => clamp((t - start) / dur);           // 0..1 progress of a time window
  const mapr = (x, a, b, c, d) => c + (d - c) * clamp((x - a) / (b - a));
  const mod = (a, n) => ((a % n) + n) % n;
  const deg = d => d * PI / 180;
  const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const dist = (x0, y0, x1, y1) => Math.hypot(x1 - x0, y1 - y0);

  /* ───────────────────────────── easing ───────────────────────────── */
  const E = {
    lin: t => t,
    inQuad: t => t * t, outQuad: t => 1 - (1 - t) * (1 - t),
    inOutQuad: t => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
    inCubic: t => t * t * t, outCubic: t => 1 - Math.pow(1 - t, 3),
    inOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    inQuart: t => t ** 4, outQuart: t => 1 - Math.pow(1 - t, 4),
    inOutQuart: t => (t < .5 ? 8 * t ** 4 : 1 - Math.pow(-2 * t + 2, 4) / 2),
    inQuint: t => t ** 5, outQuint: t => 1 - Math.pow(1 - t, 5),
    inOutQuint: t => (t < .5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
    inSine: t => 1 - Math.cos(t * PI / 2), outSine: t => Math.sin(t * PI / 2),
    inOutSine: t => -(Math.cos(PI * t) - 1) / 2,
    inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
    outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
    inCirc: t => 1 - Math.sqrt(1 - t * t), outCirc: t => Math.sqrt(1 - Math.pow(t - 1, 2)),
    outBack: (t, s = 1.70158) => { const c = s + 1; return 1 + c * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); },
    inBack: (t, s = 1.70158) => { const c = s + 1; return c * t * t * t - s * t * t; },
    inOutBack: (t, s = 1.70158) => { const c = s * 1.525; return t < .5 ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2 : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2; },
    outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (TAU / 3)) + 1),
    outBounce: t => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; },
  };

  /* CSS cubic-bezier(x1,y1,x2,y2) as an easing function (y2 > 1 overshoots, like the real thing). */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const X = s => ((ax * s + bx) * s + cx) * s, Y = s => ((ay * s + by) * s + cy) * s;
    const dX = s => (3 * ax * s + 2 * bx) * s + cx;
    return t => {
      if (t <= 0) return 0; if (t >= 1) return 1;
      let s = t;
      for (let i = 0; i < 8; i++) { const x = X(s) - t; if (Math.abs(x) < 1e-6) return Y(s); const d = dX(s); if (Math.abs(d) < 1e-6) break; s -= x / d; }
      let lo = 0, hi = 1; s = t;
      for (let i = 0; i < 32; i++) { const x = X(s); if (Math.abs(x - t) < 1e-6) break; if (x < t) lo = s; else hi = s; s = (lo + hi) / 2; }
      return Y(s);
    };
  }

  /* Step response of a damped spring, 0 -> 1. t in seconds, f = natural frequency (Hz), z = damping ratio. */
  function spring(t, f = 2.4, z = 0.42) {
    if (t <= 0) return 0;
    const w = TAU * f;
    if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
    const wd = w * Math.sqrt(1 - z * z);
    return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + (z * w / wd) * Math.sin(wd * t));
  }

  /* ───────────────────────── seeded randomness ───────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /* stable float in [0,1) from an integer (and an optional seed) */
  function hash(n, s = 0) {
    let x = (Math.imul(n | 0, 374761393) + Math.imul(s | 0, 668265263)) | 0;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  /* ───────────────────────── Perlin noise ───────────────────────── */
  const P = new Uint8Array(512);
  (function () {
    const r = mulberry32(1337), p = [];
    for (let i = 0; i < 256; i++) p.push(i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    for (let i = 0; i < 512; i++) P[i] = p[i & 255];
  })();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  function noise3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
    x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z);
    const A = P[X] + Y, AA = P[A] + Z, AB = P[A + 1] + Z, B = P[X + 1] + Y, BA = P[B] + Z, BB = P[B + 1] + Z;
    return lerp(
      lerp(lerp(grad(P[AA], x, y, z), grad(P[BA], x - 1, y, z), u), lerp(grad(P[AB], x, y - 1, z), grad(P[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(P[AA + 1], x, y, z - 1), grad(P[BA + 1], x - 1, y, z - 1), u), lerp(grad(P[AB + 1], x, y - 1, z - 1), grad(P[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }
  const noise2 = (x, y) => noise3(x, y, 0.5);
  function fbm(x, y, z, oct = 4) { let a = 1, f = 1, s = 0, n = 0; for (let i = 0; i < oct; i++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= .5; f *= 2; } return s / n; }

  /* ───────────────────────── colour ───────────────────────── */
  const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const rgb = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const rgbaHex = (h, a = 1) => rgb(hex(h), a);
  const mixC = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const mixHex = (h1, h2, t, a = 1) => rgb(mixC(hex(h1), hex(h2), t), a);
  /* colour ramp: stops = [[pos, '#hex'], ...] with ascending pos, t in the same range */
  function ramp(stops, t) {
    if (t <= stops[0][0]) return hex(stops[0][1]);
    for (let i = 1; i < stops.length; i++) {
      if (t <= stops[i][0]) { const a = stops[i - 1], b = stops[i]; return mixC(hex(a[1]), hex(b[1]), (t - a[0]) / (b[0] - a[0])); }
    }
    return hex(stops[stops.length - 1][1]);
  }

  /* The reel's palette. Warm bone + ink with one hot accent and two cool companions. */
  const PAL = {
    ink: '#0B0B10', ink2: '#15151D', ink3: '#22222E',
    bone: '#F2EEE5', bone2: '#E4DED1', bone3: '#CFC8B8',
    coral: '#FF5530', coralDeep: '#D63A17',
    cobalt: '#2A45FF', cobaltDeep: '#1A2BC9',
    mint: '#5CF0C0', lilac: '#B7A4FF', sky: '#7FB2FF',
  };

  /* ───────────────────────── canvas + text helpers ───────────────────────── */
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  const fnt =(weight, size, family = 'Unbounded', style = '') => `${style ? style + ' ' : ''}${weight} ${size}px "${family}"`;

  /* Per-character layout that respects kerning: x offsets of each glyph, advance widths, total width.
     ctx.font must already be set. `tracking` is extra px between glyphs. */
  function chars(ctx, str, tracking = 0) {
    const xs = [], ws = [];
    let prev = 0;
    for (let i = 0; i < str.length; i++) {
      const pw = ctx.measureText(str.slice(0, i + 1)).width;
      xs.push(prev + tracking * i);
      ws.push(pw - prev);
      prev = pw;
    }
    return { xs, ws, total: prev + tracking * Math.max(0, str.length - 1) };
  }

  /* Cap height of the current font (px), measured on 'H'. */
  function capHeight(ctx) { return ctx.measureText('H').actualBoundingBoxAscent; }

  function roundedRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  function fillBg(ctx, W, H, color) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = color; ctx.fillRect(0, 0, W, H); }

  /* soft round glow, additive */
  function glow(ctx, x, y, r, color, a = 1) {
    const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, rgbaHex(color, a)); gr.addColorStop(1, rgbaHex(color, 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }

  /* ───────────────────────── tiny 3D kit ───────────────────────── */
  /* 3x3 rotation matrix (row-major) from Euler angles, applied Z then X then Y. */
  function rotMat(rx, ry, rz) {
    const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
    // R = Ry * Rx * Rz
    return [
      cy * cz + sy * sx * sz, -cy * sz + sy * sx * cz, sy * cx,
      cx * sz, cx * cz, -sx,
      -sy * cz + cy * sx * sz, sy * sz + cy * sx * cz, cy * cx,
    ];
  }

  g.L = {
    TAU, PI, clamp, lerp, prog, mapr, mod, deg, smoothstep, dist,
    E, bezier, spring, mulberry32, hash, noise2, noise3, fbm,
    hex, rgb, rgbaHex, mixC, mixHex, ramp, PAL,
    canvas, fnt, chars, capHeight, roundedRect, fillBg, glow, rotMat,
  };
})(window);
