/* SHOT 1 — POINT  (bar 1, 0.000–1.875 s)
 *
 * A coral dot on black. It arcs up, lands on beat 2 and a ruler line zips out from under it.
 * On a 32nd-note roll six letters drop onto the line (M-O-T-I-O-N), then the dot hops across the word
 * and lands on beat 3 as the full stop. "MOTION." The full stop then floods the screen (transition 1).
 * The dot is the reel's mark: it comes back as the full stop of CLAUDE. in the last shot.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, mixHex, rgbaHex } = L;
  const BEAT = R.BEAT, W = R.W, H = R.H, STEP = BEAT / 8;
  const WORD = 'MOTION';
  const F = 648;                                            // the floor line
  const LAY = {};

  const T_LAND1 = BEAT;                                     // dot touches down: beat 2
  const T_PERIOD = BEAT * 2;                                // full stop lands: beat 3
  const T_LAND = [...WORD].map((_, i) => T_PERIOD - STEP * (WORD.length - i));   // 0.586 … 0.879 (32nd-note roll)
  const FALL = .22, DROP_H = 900;                           // letters: fall time, release height (px)
  const G = 2 * DROP_H / (FALL * FALL), V0 = G * FALL, REST = .2;

  R.inits.push(() => {
    const c = L.canvas(8, 8).getContext('2d');
    c.font = L.fnt(900, 200);
    const m0 = L.chars(c, WORD, 0);
    LAY.fs = Math.round(200 * 1480 / m0.total);              // word is ~1480 px wide
    c.font = L.fnt(900, LAY.fs);
    const m = L.chars(c, WORD, 0);
    LAY.xs = m.xs; LAY.ws = m.ws; LAY.total = m.total;
    LAY.cap = L.capHeight(c);
    LAY.r = Math.round(LAY.fs * .125);                       // dot radius
    LAY.gap = LAY.fs * .075;
    const full = m.total + LAY.gap + LAY.r * 2;
    LAY.x0 = Math.round((W - full) / 2);
    LAY.px = LAY.x0 + m.total + LAY.gap + LAY.r;             // full-stop centre x
    LAY.py = F - LAY.r;                                      // …and y (sitting on the floor)
    R.dotMark = { x: LAY.px, y: LAY.py, r: LAY.r };          // the transition floods from here
  });

  /* ── audio / camera cues ── */
  R.cue(0, 'pulse');
  R.cue(.06, 'blip', { pitch: 0, dur: .18 });
  R.hit(T_LAND1, .55, { sub: 1 });
  R.cue(T_LAND1, 'zip', { dur: .5 });
  R.cue(T_LAND1 + .04, 'ticks', { dur: .45 });
  T_LAND.forEach((t, i) => R.cue(t, 'land', { i }));
  R.hit(T_PERIOD, .85, { sub: 1 });
  R.cue(BEAT * 3 + .06, 'riser', { dur: BEAT * 1 - .06 });  // swell into the drop

  /* ── a ball: elastic squash on contact, stretch in flight ── */
  const sqz = d => Math.exp(-d * 13) * Math.cos(d * 34);     // d = seconds since impact (>= 0)
  function ball(ctx, cx, cy, r, sx, sy, lift) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sx, sy);
    const gr = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
    gr.addColorStop(0, '#FF8A63'); gr.addColorStop(.55, PAL.coral); gr.addColorStop(1, '#E23E1B');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, L.TAU); ctx.fill();
    ctx.restore();
  }

  function dotState(t) {
    const r = LAY.r, cx0 = W / 2, cy0 = 540;
    // pre-launch: hover in place with a heartbeat
    if (t < .06) {
      const pl = 1 + .1 * Math.exp(-t * 22) * Math.cos(t * 50);
      return { cx: cx0, cy: cy0, sx: pl, sy: pl };
    }
    // up leg → apex → down leg to the floor
    if (t < T_LAND1) {
      const tA = .23, yA = 300, yF = F - r;
      let cy, v;
      if (t < tA) { const u = (t - .06) / (tA - .06); cy = lerp(cy0, yA, E.outQuad(u)); v = (1 - u) * .8; }
      else { const u = (t - tA) / (T_LAND1 - tA); cy = lerp(yA, yF, E.inQuad(u)); v = u; }
      const st = 1 + .32 * v * v;
      return { cx: cx0, cy, sx: 1 / Math.sqrt(st), sy: st };
    }
    // contact squash, short rest
    if (t < .59) {
      const d = t - T_LAND1, s = sqz(d), sy = 1 - .55 * s, sx = 1 + .8 * s;
      return { cx: cx0, cy: F - r * sy, sx, sy };
    }
    // the hop across the word to the full stop
    if (t < T_PERIOD) {
      const u = (t - .59) / (T_PERIOD - .59);
      const cx = lerp(cx0, LAY.px, E.inOutSine(u) * .35 + u * .65);
      const cy = (F - r) - 4 * 360 * u * (1 - u);
      const v = Math.abs(1 - 2 * u);
      const st = 1 + .26 * v * v;
      return { cx, cy, sx: 1 / Math.sqrt(st), sy: st };
    }
    // full stop landing
    const d = t - T_PERIOD, s = sqz(d) * Math.exp(-d * 2), sy = 1 - .6 * s, sx = 1 + .9 * s;
    return { cx: LAY.px, cy: F - r * sy, sx, sy };
  }

  /* ── ruler ── */
  function ruler(ctx, t) {
    const hl = 864 * E.outExpo(prog(t, T_LAND1, .55));        // half-length of the line
    if (hl < 1) return;
    const drift = t > .95 ? (t - .95) * 36 : 0;
    ctx.fillStyle = rgbaHex(PAL.bone, .85);
    ctx.fillRect(960 - hl, F, hl * 2, 2);
    ctx.font = '500 13px "JetBrains Mono"'; ctx.letterSpacing = '1.5px'; ctx.textAlign = 'center';
    for (let k = -36; k <= 36; k++) {
      const x = 960 + k * 24;
      const reach = hl - Math.abs(x - 960);
      if (reach <= 0) continue;
      const pop = E.outBack(clamp(reach / 110));
      const major = (k % 5 === 0);
      const hgt = (major ? 26 : 11) * pop;
      ctx.fillStyle = rgbaHex(PAL.bone, major ? .7 : .38);
      ctx.fillRect(x - 1, F + 2, 2, hgt);
      if (major && pop > .5) {
        ctx.fillStyle = rgbaHex(PAL.bone, .42 * clamp(pop));
        ctx.fillText(String(Math.abs(k / 5 * 5) + 100).slice(1).padStart(2, '0') + 'f', x, F + 54);
      }
    }
    ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
    void drift;
  }

  /* ── letters: drop, thud, tiny rebound ── */
  function letter(ctx, i, t) {
    const rel = T_LAND[i] - FALL, tau = t - rel;
    if (tau < 0) return;
    let h, v, d = -1;
    if (tau < FALL) { h = DROP_H * (1 - (tau / FALL) ** 2); v = tau / FALL; }
    else {
      d = tau - FALL;
      const v1 = V0 * REST, fl = 2 * v1 / G;
      h = d < fl ? v1 * d - .5 * G * d * d : 0; v = 0;
    }
    const sq = d >= 0 ? .13 * Math.exp(-d * 20) * Math.cos(d * 44) : 0;
    const sy = d >= 0 ? 1 - sq : 1 + .12 * v * v;
    const sx = d >= 0 ? 1 + sq * .6 : 1 - .05 * v * v;
    const x = LAY.x0 + LAY.xs[i], w = LAY.ws[i];
    const flash = d >= 0 ? Math.exp(-d * 24) : 0;
    ctx.save();
    ctx.translate(x + w / 2, F - h);
    ctx.scale(sx, sy);
    ctx.fillStyle = flash > .02 ? mixHex(PAL.bone, PAL.coral, flash) : PAL.bone;
    ctx.font = L.fnt(900, LAY.fs);
    ctx.fillText(WORD[i], -w / 2, 0);
    ctx.restore();
    // dust off the floor
    if (d >= 0 && d < .42) {
      const p = d / .42;
      for (let k = 0; k < 6; k++) {
        const side = k % 2 ? 1 : -1, sp = 90 + hash(i * 17 + k, 3) * 240, lif = 14 + hash(i * 31 + k, 5) * 46;
        const px = x + w / 2 + side * (w * .3 + sp * E.outCubic(p) * .55);
        const py = F - 3 - lif * Math.sin(p * Math.PI) * (.4 + hash(k, i) * .6);
        ctx.fillStyle = rgbaHex(PAL.bone, .55 * (1 - p));
        ctx.beginPath(); ctx.arc(px, py, 3.2 * (1 - p) + .6, 0, L.TAU); ctx.fill();
      }
    }
  }

  function ring(ctx, cx, cy, r0, r1, p, lw, a, flat) {
    if (p <= 0 || p >= 1) return;
    const r = lerp(r0, r1, E.outExpo(p));
    ctx.save(); ctx.translate(cx, cy); if (flat) ctx.scale(1, flat);
    ctx.strokeStyle = rgbaHex(PAL.coral, a * (1 - p)); ctx.lineWidth = lw * (1 - p * .6);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, L.TAU); ctx.stroke(); ctx.restore();
  }

  R.shot({
    id: 'shot1-point', label: 'POINT', hud: { color: PAL.bone },
    samples: 16,
    fx: { bloom: .28, ca: .5, grain: .05, vig: .38 },
    draw(ctx, t, e) {
      /* ground */
      const bg = ctx.createRadialGradient(W / 2, 560, 80, W / 2, 560, 1150);
      bg.addColorStop(0, '#16161F'); bg.addColorStop(1, PAL.ink);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      /* dot grid + origin crosshair */
      ctx.fillStyle = rgbaHex(PAL.bone, .10);
      for (let y = 96; y < H; y += 96) for (let x = 96; x < W; x += 96) ctx.fillRect(x - 1, y - 1, 2, 2);
      const ch = 1 - prog(t, .05, .35);
      if (ch > .01) {
        ctx.strokeStyle = rgbaHex(PAL.bone, .5 * ch); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(960 - 46, 540); ctx.lineTo(960 + 46, 540); ctx.moveTo(960, 540 - 46); ctx.lineTo(960, 540 + 46); ctx.stroke();
      }

      ruler(ctx, t);
      for (let i = 0; i < WORD.length; i++) letter(ctx, i, t);

      /* shock rings: heartbeat at 0, floor shock at touch-down, full-stop shock on beat 3 */
      ring(ctx, 960, 540, LAY.r, LAY.r + 110, prog(t, 0, .55), 3, .9);
      ring(ctx, 960, F, 10, 520, prog(t, T_LAND1, .5), 3, .9, .12);
      ring(ctx, LAY.px, F, 10, 420, prog(t, T_PERIOD, .5), 3, .9, .12);

      /* the dot */
      const s = dotState(t);
      ball(ctx, s.cx, s.cy, LAY.r, s.sx, s.sy);

      /* sub-line, appears once the word is set */
      const cp = E.outExpo(prog(t, T_PERIOD + .02, .3));
      if (cp > .01) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, F + 76, W, 40); ctx.clip();
        ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '7px'; ctx.textAlign = 'center';
        ctx.fillStyle = rgbaHex(PAL.bone, .62);
        ctx.fillText('POINT  →  LINE  →  PLANE', W / 2, F + 106 + (1 - cp) * 34);
        ctx.restore();
      }
    },
  });
})(window);
