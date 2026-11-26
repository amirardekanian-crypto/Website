/* ==========================================================================
   RUSTBLOOD RALLY - textures.js
   Every texture in the game is painted here on <canvas> elements:
   sand, road, rusty paint, armour plate, tyres, concrete, rock, crates,
   particle sprites and decals.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const T = (RR.Tex = {});
  const cache = {};

  /* ---------------------------------------------------------------- helpers */
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }
  function finish(canvas, opts) {
    opts = opts || {};
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
    tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.anisotropy = RR.maxAniso || 4;
    tex.needsUpdate = true;
    return tex;
  }
  // Fill a canvas pixel by pixel. fn(u, v, x, y, out) writes rgba into out.
  function pixels(w, h, fn) {
    const c = makeCanvas(w, h);
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(w, h);
    const d = img.data;
    const px = [0, 0, 0, 255];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        px[3] = 255;
        fn(x / w, y / h, x, y, px);
        const i = (y * w + x) * 4;
        d[i] = px[0]; d[i + 1] = px[1]; d[i + 2] = px[2]; d[i + 3] = px[3];
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  }
  const clamp255 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
  function hexToRgb(hex) {
    return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  }
  function memo(key, fn) {
    if (!cache[key]) cache[key] = fn();
    return cache[key];
  }
  // Draw something at (x,y) and wrapped copies so the texture tiles.
  function wrapDraw(S, x, y, r, draw) {
    for (let ox = -1; ox <= 1; ox++) {
      for (let oy = -1; oy <= 1; oy++) {
        const px = x + ox * S, py = y + oy * S;
        if (px + r < 0 || px - r > S || py + r < 0 || py - r > S) continue;
        draw(px, py);
      }
    }
  }
  function rivet(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath(); ctx.arc(x + 0.6, y + 0.8, r * 1.1, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    g.addColorStop(0, 'rgba(230,220,200,0.9)');
    g.addColorStop(0.5, 'rgba(120,110,95,0.9)');
    g.addColorStop(1, 'rgba(50,45,40,0.9)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  function scratches(ctx, S, rng, count, color) {
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      const x = rng() * S, y = rng() * S;
      const a = rng() * Math.PI * 2, l = 6 + rng() * 40;
      ctx.lineWidth = 0.5 + rng() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
  }
  function cracks(ctx, rng, count, x0, y0, w, h, color, width) {
    ctx.strokeStyle = color;
    for (let i = 0; i < count; i++) {
      let x = x0 + rng() * w, y = y0 + rng() * h;
      let a = rng() * Math.PI * 2;
      ctx.lineWidth = width * (0.5 + rng());
      ctx.beginPath();
      ctx.moveTo(x, y);
      const steps = 5 + Math.floor(rng() * 12);
      for (let s = 0; s < steps; s++) {
        a += (rng() - 0.5) * 1.2;
        x += Math.cos(a) * (3 + rng() * 7);
        y += Math.sin(a) * (3 + rng() * 7);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  /* ------------------------------------------------------------ ground */
  T.sand = () => memo('sand', () => {
    const N = RR.makeNoise(11);
    const S = 512;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const big = N.fbm(u * 6, v * 6, 4, 6);
      const grain = N.noise(u * 96, v * 96, 96);
      const ripple = Math.sin((u * 12 + v * 5 + N.fbm(u * 4, v * 4, 2, 4) * 2.4) * Math.PI * 2) * 0.5 + 0.5;
      const k = 0.78 + big * 0.3 + (grain - 0.5) * 0.2 + ripple * 0.08;
      p[0] = clamp255(222 * k); p[1] = clamp255(176 * k); p[2] = clamp255(124 * k);
    });
    const ctx = c.getContext('2d');
    const rng = RR.makeRNG(5);
    for (let i = 0; i < 340; i++) {
      const x = rng() * S, y = rng() * S, r = 0.8 + rng() * 2.2;
      const dark = rng() < 0.6;
      wrapDraw(S, x, y, r * 2, (px, py) => {
        ctx.fillStyle = dark ? 'rgba(90,60,35,0.55)' : 'rgba(250,230,190,0.5)';
        ctx.beginPath(); ctx.ellipse(px, py, r, r * 0.7, rng() * 3, 0, Math.PI * 2); ctx.fill();
      });
    }
    return finish(c);
  });

  T.road = () => memo('road', () => {
    const N = RR.makeNoise(23);
    const S = 512;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const n = N.fbm(u * 4, v * 4, 4, 4);
      const grain = N.noise(u * 128, v * 128, 128);
      let k = 0.82 + n * 0.32 + (grain - 0.5) * 0.16;
      // worn tyre tracks
      const track = Math.exp(-Math.pow((u - 0.3) / 0.06, 2)) + Math.exp(-Math.pow((u - 0.7) / 0.06, 2));
      k *= 1 - track * 0.16 * (0.6 + N.noise(u * 8, v * 32, 0) * 0.8);
      let r = 92 * k, g = 80 * k, b = 68 * k;
      // sand drifting onto the edges and in patches
      const edge = U.smoothstep(0.1, 0.0, u) + U.smoothstep(0.9, 1.0, u);
      const patch = U.smoothstep(0.66, 0.8, N.fbm(u * 3 + 7, v * 3, 4, 3));
      const sandAmt = U.clamp(edge * (0.6 + n * 0.6) + patch * 0.3, 0, 1);
      r = U.lerp(r, 196 * (0.9 + grain * 0.2), sandAmt);
      g = U.lerp(g, 152 * (0.9 + grain * 0.2), sandAmt);
      b = U.lerp(b, 102 * (0.9 + grain * 0.2), sandAmt);
      // faded centre dashes
      if (Math.abs(u - 0.5) < 0.009 && (v * 6) % 1 < 0.55) {
        const wear = N.noise(u * 200, v * 60, 0);
        if (wear > 0.35) { r = U.lerp(r, 205, 0.55); g = U.lerp(g, 170, 0.55); b = U.lerp(b, 70, 0.55); }
      }
      p[0] = clamp255(r); p[1] = clamp255(g); p[2] = clamp255(b);
    });
    const ctx = c.getContext('2d');
    const rng = RR.makeRNG(77);
    // a few soft oil stains (kept subtle so the 20 m repeat is not obvious)
    for (let i = 0; i < 7; i++) {
      const x = S * (0.15 + rng() * 0.7), y = rng() * S, r = 8 + rng() * 18;
      wrapDraw(S, x, y, r, (px, py) => {
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, 'rgba(20,16,14,0.28)');
        g.addColorStop(1, 'rgba(20,16,14,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      });
    }
    // faint repair patches with soft edges
    for (let i = 0; i < 4; i++) {
      const w = 40 + rng() * 70, h = 50 + rng() * 110;
      const x = S * 0.15 + rng() * (S * 0.7 - w), y = rng() * (S - h);
      ctx.fillStyle = 'rgba(38,34,30,0.07)';
      ctx.fillRect(x, y, w, h);
      ctx.fillRect(x + 3, y + 3, w - 6, h - 6);
    }
    cracks(ctx, rng, 46, S * 0.1, 20, S * 0.8, S - 40, 'rgba(25,20,16,0.5)', 1.1);
    return finish(c);
  });

  T.gravel = () => memo('gravel', () => {
    const N = RR.makeNoise(31);
    const S = 256;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const n = N.fbm(u * 5, v * 5, 3, 5);
      const g = N.noise(u * 64, v * 64, 64);
      const g2 = N.noise(u * 128 + 3, v * 128, 128);
      const k = 0.7 + n * 0.3 + (g - 0.5) * 0.35 + (g2 > 0.8 ? 0.25 : 0) - (g2 < 0.15 ? 0.25 : 0);
      p[0] = clamp255(170 * k); p[1] = clamp255(134 * k); p[2] = clamp255(96 * k);
    });
    return finish(c);
  });

  T.curb = () => memo('curb', () => {
    const N = RR.makeNoise(41);
    const W = 32, H = 128;
    const c = pixels(W, H, (u, v, x, y, p) => {
      const red = v < 0.5;
      const n = N.fbm(u * 4, v * 8, 3, 0);
      const dirt = U.smoothstep(0.55, 0.85, N.noise(u * 10, v * 30, 0));
      let col = red ? [158, 44, 30] : [222, 210, 186];
      const k = 0.8 + n * 0.3;
      col = col.map((cc) => cc * k);
      const edge = Math.abs(v - 0.5) < 0.012 || v < 0.012 || v > 0.988 ? 0.55 : 1;
      p[0] = clamp255(U.lerp(col[0], 120, dirt * 0.6) * edge);
      p[1] = clamp255(U.lerp(col[1], 92, dirt * 0.6) * edge);
      p[2] = clamp255(U.lerp(col[2], 64, dirt * 0.6) * edge);
    });
    return finish(c);
  });

  /* ------------------------------------------------------------ metals */
  // Weathered paint with rust, primer, scratches and panel rivets.
  T.paint = (hex, seed) => memo('paint' + hex + '_' + seed, () => {
    const N = RR.makeNoise(seed);
    const base = hexToRgb(hex);
    const S = 512;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const large = N.fbm(u * 3, v * 3, 3, 3);
      const grime = N.fbm(u * 14, v * 14, 2, 14);
      const rustN = N.fbm(u * 4 + 10, v * 4, 4, 4);
      // weathered paint with patches of brown rust along the edges
      const rust = U.smoothstep(0.63, 0.71, rustN) * 0.9;
      const peel = U.smoothstep(0.58, 0.63, rustN) * (1 - rust);
      const k = (0.8 + large * 0.3) * (0.92 + grime * 0.14);
      let r = base[0] * k, g = base[1] * k, b = base[2] * k;
      r = U.lerp(r, 150, peel * 0.45); g = U.lerp(g, 140, peel * 0.45); b = U.lerp(b, 124, peel * 0.45);
      const rr = 88 + grime * 40, rg = 46 + grime * 22, rb = 26 + grime * 10;
      r = U.lerp(r, rr, rust); g = U.lerp(g, rg, rust); b = U.lerp(b, rb, rust);
      p[0] = clamp255(r); p[1] = clamp255(g); p[2] = clamp255(b);
    });
    const ctx = c.getContext('2d');
    const rng = RR.makeRNG(seed + 9);
    // panel seams with rivets
    ctx.strokeStyle = 'rgba(15,10,8,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      const pos = i * 128;
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(S, pos); ctx.stroke();
    }
    for (let i = 0; i <= 4; i++) {
      for (let j = 4; j < S; j += 16) {
        rivet(ctx, i * 128 + 5, j, 2.2);
        rivet(ctx, j, i * 128 + 5, 2.2);
      }
    }
    scratches(ctx, S, rng, 90, 'rgba(235,225,205,0.35)');
    scratches(ctx, S, rng, 40, 'rgba(20,14,10,0.4)');
    // bullet dents
    for (let i = 0; i < 14; i++) {
      const x = rng() * S, y = rng() * S;
      ctx.fillStyle = 'rgba(200,190,170,0.5)';
      ctx.beginPath(); ctx.arc(x, y, 3.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(10,8,6,0.85)';
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // rust streaks
    for (let i = 0; i < 30; i++) {
      const x = rng() * S, y = rng() * S, l = 20 + rng() * 60;
      const g = ctx.createLinearGradient(x, y, x, y + l);
      g.addColorStop(0, 'rgba(120,52,20,0.45)');
      g.addColorStop(1, 'rgba(120,52,20,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, 2 + rng() * 3, l);
    }
    return finish(c);
  });

  T.armor = () => memo('armor', () => {
    const N = RR.makeNoise(57);
    const S = 512;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const n = N.fbm(u * 6, v * 6, 4, 6);
      const plate = N.noise(Math.floor(u * 4) * 3.1, Math.floor(v * 4) * 2.7, 0);
      const rust = U.smoothstep(0.6, 0.72, N.fbm(u * 7 + 3, v * 7, 4, 7));
      const k = 0.7 + n * 0.35 + plate * 0.2;
      let r = 78 * k, g = 74 * k, b = 68 * k;
      r = U.lerp(r, 110, rust); g = U.lerp(g, 54, rust); b = U.lerp(b, 28, rust);
      p[0] = clamp255(r); p[1] = clamp255(g); p[2] = clamp255(b);
    });
    const ctx = c.getContext('2d');
    const rng = RR.makeRNG(58);
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      const pos = i * 128;
      ctx.strokeStyle = 'rgba(10,8,6,0.8)';
      ctx.beginPath(); ctx.moveTo(pos, 0); ctx.lineTo(pos, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, pos); ctx.lineTo(S, pos); ctx.stroke();
      ctx.strokeStyle = 'rgba(200,190,170,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pos + 2, 0); ctx.lineTo(pos + 2, S); ctx.stroke();
      ctx.lineWidth = 3;
    }
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const x0 = i * 128, y0 = j * 128;
        for (let k = 12; k < 128; k += 22) {
          rivet(ctx, x0 + 9, y0 + k, 3);
          rivet(ctx, x0 + 119, y0 + k, 3);
          rivet(ctx, x0 + k, y0 + 9, 3);
          rivet(ctx, x0 + k, y0 + 119, 3);
        }
      }
    }
    // weld beads
    ctx.strokeStyle = 'rgba(150,130,100,0.5)';
    ctx.setLineDash([2, 2]);
    for (let i = 0; i < 6; i++) {
      const x = rng() * S, y = rng() * S;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (rng() - 0.5) * 120, y + (rng() - 0.5) * 120); ctx.stroke();
    }
    ctx.setLineDash([]);
    scratches(ctx, S, rng, 120, 'rgba(220,210,190,0.28)');
    return finish(c);
  });

  T.metal = () => memo('metal', () => {
    const N = RR.makeNoise(61);
    const S = 256;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const brushed = N.noise(u * 4, v * 160, 0) * 0.5 + N.noise(u * 2, v * 60, 0) * 0.5;
      const n = N.fbm(u * 5, v * 5, 3, 5);
      const k = 0.75 + brushed * 0.2 + n * 0.2;
      p[0] = clamp255(122 * k); p[1] = clamp255(118 * k); p[2] = clamp255(112 * k);
    });
    const ctx = c.getContext('2d');
    scratches(ctx, S, RR.makeRNG(62), 60, 'rgba(240,235,225,0.3)');
    return finish(c);
  });

  // Corrugated rusty sheet metal.
  T.rust = () => memo('rust', () => {
    const N = RR.makeNoise(71);
    const S = 512;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const corr = Math.sin(u * Math.PI * 2 * 24) * 0.5 + 0.5;
      const n = N.fbm(u * 6, v * 6, 4, 6);
      const blot = N.fbm(u * 3 + 4, v * 3, 4, 3);
      const k = 0.62 + corr * 0.3 + n * 0.25;
      let r = 132 * k, g = 66 * k, b = 34 * k;
      const paint = U.smoothstep(0.62, 0.7, blot);
      r = U.lerp(r, 118 * k, paint); g = U.lerp(g, 112 * k, paint); b = U.lerp(b, 96 * k, paint);
      // streaky dark drips
      const drip = N.noise(u * 70, v * 3, 0);
      const d = U.smoothstep(0.7, 0.9, drip) * 0.4;
      p[0] = clamp255(r * (1 - d)); p[1] = clamp255(g * (1 - d)); p[2] = clamp255(b * (1 - d));
    });
    const ctx = c.getContext('2d');
    const rng = RR.makeRNG(72);
    for (let i = 0; i < 3; i++) {
      const x = rng() * S, y = rng() * S, r = 2 + rng() * 4;
      ctx.fillStyle = 'rgba(15,8,4,0.85)';
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    return finish(c);
  });

  // Painted corrugated container steel (grey; tinted by material colour).
  T.container = () => memo('container', () => {
    const N = RR.makeNoise(73);
    const S = 256;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const corr = Math.abs(Math.sin(u * Math.PI * 16));
      const n = N.fbm(u * 5, v * 5, 3, 5);
      const rust = U.smoothstep(0.6, 0.7, N.fbm(u * 6 + 2, v * 6, 3, 6));
      const k = 0.65 + corr * 0.3 + n * 0.2;
      p[0] = clamp255(U.lerp(220 * k, 150, rust));
      p[1] = clamp255(U.lerp(220 * k, 80, rust));
      p[2] = clamp255(U.lerp(220 * k, 50, rust));
    });
    return finish(c);
  });

  /* ------------------------------------------------------------ concrete */
  // Barrier wall texture: u runs around the wall profile, v along the track.
  T.barrier = () => memo('barrier', () => {
    const N = RR.makeNoise(83);
    const S = 512;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const n = N.fbm(u * 6, v * 6, 4, 6);
      const grain = N.noise(u * 90, v * 90, 90);
      const k = 0.72 + n * 0.32 + (grain - 0.5) * 0.12;
      let r = 176 * k, g = 160 * k, b = 138 * k;
      // hazard stripes on the inner face (u < 0.42)
      if (u < 0.42) {
        const stripe = ((v * 8 + u * 2) % 1) < 0.5;
        const wear = U.smoothstep(0.35, 0.6, N.fbm(u * 10, v * 20, 3, 0));
        if (stripe) {
          r = U.lerp(r, 165 * k, wear); g = U.lerp(g, 42 * k, wear); b = U.lerp(b, 30 * k, wear);
        } else {
          r = U.lerp(r, 228 * k, wear * 0.7); g = U.lerp(g, 218 * k, wear * 0.7); b = U.lerp(b, 196 * k, wear * 0.7);
        }
      }
      // dirt near the ground
      const ground = U.smoothstep(0.12, 0.0, u) + U.smoothstep(0.88, 1.0, u);
      r = U.lerp(r, 110, ground * 0.6); g = U.lerp(g, 84, ground * 0.6); b = U.lerp(b, 58, ground * 0.6);
      // block joints every 1/2 of the texture
      if ((v * 2) % 1 < 0.008) { r *= 0.4; g *= 0.4; b *= 0.4; }
      p[0] = clamp255(r); p[1] = clamp255(g); p[2] = clamp255(b);
    });
    const ctx = c.getContext('2d');
    const rng = RR.makeRNG(84);
    cracks(ctx, rng, 26, 0, 0, S, S, 'rgba(40,32,26,0.5)', 1);
    // rust drips from rebar
    for (let i = 0; i < 18; i++) {
      const x = rng() * S, y = rng() * S, l = 20 + rng() * 50;
      const g = ctx.createLinearGradient(x, y, x + l, y);
      g.addColorStop(0, 'rgba(120,58,24,0.5)');
      g.addColorStop(1, 'rgba(120,58,24,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, l, 2 + rng() * 2);
    }
    return finish(c);
  });

  T.concrete = () => memo('concrete', () => {
    const N = RR.makeNoise(91);
    const S = 256;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const n = N.fbm(u * 5, v * 5, 4, 5);
      const g = N.noise(u * 70, v * 70, 70);
      const stain = U.smoothstep(0.55, 0.8, N.fbm(u * 3 + 9, v * 3, 3, 3));
      const k = 0.7 + n * 0.3 + (g - 0.5) * 0.12 - stain * 0.25;
      p[0] = clamp255(168 * k); p[1] = clamp255(156 * k); p[2] = clamp255(138 * k);
    });
    cracks(c.getContext('2d'), RR.makeRNG(92), 14, 0, 0, S, S, 'rgba(40,32,26,0.5)', 1);
    return finish(c);
  });

  /* ------------------------------------------------------------ natural */
  T.rock = () => memo('rock', () => {
    const N = RR.makeNoise(101);
    const S = 256;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const n = N.fbm(u * 6, v * 6, 4, 6);
      const layers = Math.sin((v * 12 + n * 2.5) * Math.PI * 2) * 0.5 + 0.5;
      const g = N.noise(u * 64, v * 64, 64);
      const k = 0.62 + layers * 0.16 + n * 0.3 + (g - 0.5) * 0.18;
      p[0] = clamp255(168 * k); p[1] = clamp255(118 * k); p[2] = clamp255(86 * k);
    });
    cracks(c.getContext('2d'), RR.makeRNG(102), 18, 0, 0, S, S, 'rgba(50,28,16,0.45)', 1);
    return finish(c);
  });

  T.wood = () => memo('wood', () => {
    const N = RR.makeNoise(111);
    const S = 256;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const plank = Math.floor(u * 6);
      const tone = N.noise(plank * 5.3, 0.5, 0);
      const grain = N.noise(u * 6 * 8, v * 3, 0) * 0.6 + N.noise(u * 120, v * 8, 0) * 0.4;
      let k = 0.6 + tone * 0.3 + grain * 0.25;
      if ((u * 6) % 1 < 0.04) k *= 0.45;
      p[0] = clamp255(150 * k); p[1] = clamp255(126 * k); p[2] = clamp255(100 * k);
    });
    return finish(c);
  });

  T.tread = () => memo('tread', () => {
    const W = 256, H = 64;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#1c1a18';
    ctx.fillRect(0, 0, W, H);
    // chunky chevron blocks
    for (let i = 0; i < 16; i++) {
      const x = i * 16;
      ctx.fillStyle = i % 2 ? '#34312d' : '#2e2b28';
      ctx.beginPath();
      ctx.moveTo(x, 4); ctx.lineTo(x + 10, 4); ctx.lineTo(x + 16, H / 2 - 2); ctx.lineTo(x + 6, H / 2 - 2);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + 6, H / 2 + 2); ctx.lineTo(x + 16, H / 2 + 2); ctx.lineTo(x + 10, H - 4); ctx.lineTo(x, H - 4);
      ctx.closePath(); ctx.fill();
    }
    const rng = RR.makeRNG(121);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${150 + rng() * 60},${110 + rng() * 40},${70},${0.12 + rng() * 0.2})`;
      ctx.fillRect(rng() * W, rng() * H, 1 + rng() * 3, 1 + rng() * 2);
    }
    return finish(c);
  });

  /* ------------------------------------------------------------ signage */
  T.checker = () => memo('checker', () => {
    const W = 256, H = 64;
    const c = makeCanvas(W, H);
    const ctx = c.getContext('2d');
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#1a1714' : '#ddd3bf';
        ctx.fillRect(i * 16, j * 16, 16, 16);
      }
    }
    const rng = RR.makeRNG(131);
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(120,90,60,${rng() * 0.35})`;
      ctx.fillRect(rng() * W, rng() * H, 2 + rng() * 6, 2 + rng() * 4);
    }
    return finish(c);
  });

  T.chevron = () => memo('chevron', () => {
    const S = 128;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d9a514';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#16120e';
    for (let i = -1; i < 3; i++) {
      const x = i * 52 + 14;
      ctx.beginPath();
      ctx.moveTo(x, 10); ctx.lineTo(x + 24, 10); ctx.lineTo(x + 56, S / 2); ctx.lineTo(x + 24, S - 10);
      ctx.lineTo(x, S - 10); ctx.lineTo(x + 32, S / 2); ctx.closePath(); ctx.fill();
    }
    const rng = RR.makeRNG(141);
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = `rgba(${90 + rng() * 60},${50 + rng() * 30},20,${rng() * 0.4})`;
      ctx.fillRect(rng() * S, rng() * S, 1 + rng() * 5, 1 + rng() * 5);
    }
    ctx.strokeStyle = 'rgba(20,14,10,0.9)';
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, S, S);
    return finish(c);
  });

  T.banner = () => memo('banner', () => {
    const W = 1024, H = 160;
    const N = RR.makeNoise(151);
    const c = pixels(W, H, (u, v, x, y, p) => {
      const n = N.fbm(u * 16, v * 3, 4, 0);
      const rust = U.smoothstep(0.55, 0.7, N.fbm(u * 20 + 5, v * 4, 3, 0));
      const k = 0.55 + n * 0.4;
      p[0] = clamp255(U.lerp(70 * k, 120, rust));
      p[1] = clamp255(U.lerp(64 * k, 56, rust));
      p[2] = clamp255(U.lerp(56 * k, 28, rust));
    });
    const ctx = c.getContext('2d');
    ctx.font = 'bold 104px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillText('RUSTBLOOD RALLY', W / 2 + 5, H / 2 + 7);
    ctx.fillStyle = '#c8321e';
    ctx.fillText('RUSTBLOOD RALLY', W / 2, H / 2);
    // weather the letters
    const rng = RR.makeRNG(152);
    ctx.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${60 + rng() * 60},${50 + rng() * 30},${40},${rng() * 0.5})`;
      ctx.fillRect(rng() * W, rng() * H, 2 + rng() * 10, 1 + rng() * 4);
    }
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 2; i++) {
      for (let x = 14; x < W; x += 40) rivet(ctx, x, i ? H - 12 : 12, 4);
    }
    return finish(c);
  });

  // Small painted number roundel for car doors.
  T.roundel = (num, colorCss) => memo('roundel' + num + colorCss, () => {
    const S = 128;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    ctx.fillStyle = 'rgba(232,222,200,0.92)';
    ctx.beginPath(); ctx.arc(S / 2, S / 2, 56, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 9;
    ctx.strokeStyle = colorCss;
    ctx.stroke();
    ctx.fillStyle = '#16120e';
    ctx.font = 'bold 76px Impact, "Arial Black", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), S / 2, S / 2 + 4);
    const rng = RR.makeRNG(num * 13);
    ctx.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rng() * 0.7})`;
      ctx.fillRect(rng() * S, rng() * S, 1 + rng() * 6, 1 + rng() * 3);
    }
    ctx.globalCompositeOperation = 'source-over';
    return finish(c, { clamp: true });
  });

  function crate(key, bg, draw) {
    return memo(key, () => {
      const S = 128;
      const N = RR.makeNoise(key.length * 17);
      const c = pixels(S, S, (u, v, x, y, p) => {
        const n = N.fbm(u * 6, v * 6, 3, 6);
        const k = 0.75 + n * 0.35;
        p[0] = clamp255(bg[0] * k); p[1] = clamp255(bg[1] * k); p[2] = clamp255(bg[2] * k);
      });
      const ctx = c.getContext('2d');
      ctx.strokeStyle = 'rgba(15,12,10,0.85)';
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, S - 10, S - 10);
      draw(ctx, S);
      return finish(c);
    });
  }
  T.crateHealth = () => crate('crateHealth', [214, 206, 188], (ctx, S) => {
    ctx.fillStyle = '#c0261c';
    ctx.fillRect(S / 2 - 14, 26, 28, S - 52);
    ctx.fillRect(26, S / 2 - 14, S - 52, 28);
  });
  T.crateAmmo = () => crate('crateAmmo', [92, 98, 52], (ctx, S) => {
    ctx.fillStyle = '#e0b030';
    for (let i = 0; i < 3; i++) {
      const x = 34 + i * 24;
      ctx.fillRect(x, 50, 14, 44);
      ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x + 7, 32); ctx.lineTo(x + 14, 50); ctx.fill();
    }
    ctx.fillStyle = '#16120e';
    ctx.font = 'bold 20px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AMMO', S / 2, 114);
  });
  T.crateNitro = () => crate('crateNitro', [60, 92, 128], (ctx, S) => {
    ctx.fillStyle = '#e8f4ff';
    ctx.font = 'bold 44px Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N2O', S / 2, S / 2);
    ctx.fillStyle = '#ff8a20';
    ctx.beginPath(); ctx.moveTo(S / 2, 18); ctx.lineTo(S / 2 + 12, 38); ctx.lineTo(S / 2 - 12, 38); ctx.fill();
  });

  /* ------------------------------------------------------------ sprites */
  T.glow = () => memo('glow', () => {
    const S = 64;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return finish(c, { clamp: true, linear: true });
  });

  T.smoke = () => memo('smoke', () => {
    const S = 64;
    const N = RR.makeNoise(171);
    const c = pixels(S, S, (u, v, x, y, p) => {
      const dx = u - 0.5, dy = v - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const n = N.fbm(u * 5, v * 5, 4, 0);
      const a = U.clamp((1 - d) * 1.6 - 0.15, 0, 1) * (0.45 + n * 0.75);
      p[0] = 255; p[1] = 255; p[2] = 255; p[3] = clamp255(a * 255);
    });
    return finish(c, { clamp: true, linear: true });
  });

  // Soft-edged horizontal streak used for tracers and sparks.
  T.streak = () => memo('streak', () => {
    const W = 64, H = 16;
    const c = pixels(W, H, (u, v, x, y, p) => {
      const across = 1 - Math.pow(Math.abs(v - 0.5) * 2, 2);
      p[0] = 255; p[1] = 255; p[2] = 255; p[3] = clamp255(across * 255);
    });
    return finish(c, { clamp: true, linear: true });
  });

  T.ring = () => memo('ring', () => {
    const S = 128;
    const c = pixels(S, S, (u, v, x, y, p) => {
      const d = Math.hypot(u - 0.5, v - 0.5) * 2;
      const ring = Math.exp(-Math.pow((d - 0.8) / 0.08, 2)) + Math.exp(-Math.pow((d - 0.8) / 0.2, 2)) * 0.18;
      const a = ring * U.smoothstep(0.99, 0.9, d); // fully transparent before the square's edge
      p[0] = 255; p[1] = 255; p[2] = 255; p[3] = clamp255(a * 255);
    });
    return finish(c, { clamp: true, linear: true });
  });

  T.scorch = () => memo('scorch', () => {
    const S = 128;
    const N = RR.makeNoise(181);
    const c = pixels(S, S, (u, v, x, y, p) => {
      const dx = u - 0.5, dy = v - 0.5;
      const ang = Math.atan2(dy, dx);
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const edge = 0.75 + N.noise(Math.cos(ang) * 3 + 5, Math.sin(ang) * 3 + 5, 0) * 0.35;
      const a = U.smoothstep(edge, edge * 0.4, d) * (0.6 + N.fbm(u * 8, v * 8, 3, 0) * 0.5);
      p[0] = 18; p[1] = 14; p[2] = 10; p[3] = clamp255(a * 235);
    });
    return finish(c, { clamp: true });
  });

  T.oil = () => memo('oil', () => {
    const S = 128;
    const N = RR.makeNoise(191);
    const c = pixels(S, S, (u, v, x, y, p) => {
      const dx = u - 0.5, dy = v - 0.5;
      const ang = Math.atan2(dy, dx);
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const edge = 0.7 + N.noise(Math.cos(ang) * 2.5 + 3, Math.sin(ang) * 2.5 + 3, 0) * 0.3;
      const a = U.smoothstep(edge, edge - 0.08, d);
      const sheen = N.fbm(u * 6, v * 6, 3, 0);
      const rim = U.smoothstep(edge - 0.25, edge - 0.05, d) * a;
      p[0] = clamp255(12 + sheen * 30 + rim * 60);
      p[1] = clamp255(10 + sheen * 18 + rim * 30);
      p[2] = clamp255(14 + sheen * 40 + rim * 80);
      p[3] = clamp255(a * 230);
    });
    return finish(c, { clamp: true });
  });

  // Wind-blown sand drift lying on the road (soft noisy edge + ripples).
  T.drift = () => memo('drift', () => {
    const S = 256;
    const N = RR.makeNoise(197);
    const c = pixels(S, S, (u, v, x, y, p) => {
      const dx = u - 0.5, dy = v - 0.5;
      const ang = Math.atan2(dy, dx);
      const d = Math.sqrt(dx * dx + dy * dy) * 2;
      const edge = 0.7 + N.noise(Math.cos(ang) * 2 + 4, Math.sin(ang) * 2 + 4, 0) * 0.3;
      const a = U.smoothstep(edge, edge * 0.55, d);
      const ripple = Math.sin((u * 9 + N.fbm(u * 3, v * 3, 2, 0) * 2.5) * Math.PI * 2) * 0.5 + 0.5;
      const k = 0.85 + ripple * 0.18 + N.noise(u * 60, v * 60, 0) * 0.1;
      p[0] = clamp255(214 * k); p[1] = clamp255(170 * k); p[2] = clamp255(116 * k); p[3] = clamp255(a * 255);
    });
    return finish(c, { clamp: true });
  });

  T.skid = () => memo('skid', () => {
    const W = 16, H = 64;
    const N = RR.makeNoise(195);
    const c = pixels(W, H, (u, v, x, y, p) => {
      const across = 1 - Math.pow(Math.abs(u - 0.5) * 2, 3);
      const n = 0.6 + N.noise(u * 8, v * 16, 0) * 0.4;
      p[0] = 20; p[1] = 16; p[2] = 14; p[3] = clamp255(across * n * 255);
    });
    return finish(c);
  });

  T.blob = () => memo('blob', () => {
    const S = 64;
    const c = makeCanvas(S, S);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.7)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    return finish(c, { clamp: true });
  });
})();
