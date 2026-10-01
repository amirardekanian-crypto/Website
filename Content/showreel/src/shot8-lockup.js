/* SHOT 8 — LOCKUP  (bar 8, 13.125–15.000 s)
 *
 * The bookend. The coral dot from the last plate hangs above black. CLAUDE punches in letter by letter on the bar line,
 * the dot arcs across and lands as the full stop on beat 2 (the same move as MOTION. in shot 1, mirrored), a hairline
 * shoots out, the credit line and the tagline rise. Everything fades to ink for the loop.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, mixHex, rgbaHex } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W, H = R.H, STEP = BEAT / 16;
  const T0 = BAR * 7;
  const WORD = 'CLAUDE';
  const FS = 256, F = 560, R_DOT = 32;
  const LAY = {};
  const T_LAUNCH = .17, T_LAND = BEAT;                           // the dot's hop: lands on beat 2

  R.hit(T0, 1.2, { final: 1 });                                  // flash cut into the lockup
  R.cue(T0 + .02, 'slam', { n: 6 });
  R.cue(T0 + T_LAUNCH, 'blip', { pitch: 2, dur: .3 });
  R.hit(T0 + T_LAND, .9, { sub: 1, last: 1 });                   // the full stop lands: the last big hit
  R.cue(T0 + T_LAND, 'chord', { dur: 1.4 });
  R.cue(T0 + T_LAND + .12, 'zip', { dur: .5 });
  R.cue(T0 + .64, 'ping', { i: 0 });
  R.cue(T0 + .8, 'ping', { i: 1 });

  R.inits.push(() => {
    const c = L.canvas(8, 8).getContext('2d');
    c.font = L.fnt(900, FS);
    const m = L.chars(c, WORD, 0);
    LAY.xs = m.xs; LAY.ws = m.ws; LAY.total = m.total; LAY.cap = L.capHeight(c);
    LAY.gap = FS * .075;
    const full = m.total + LAY.gap + R_DOT * 2;
    LAY.x0 = Math.round((W - full) / 2);
    LAY.px = LAY.x0 + m.total + LAY.gap + R_DOT;
    LAY.w = full;
  });

  const sqz = d => Math.exp(-d * 13) * Math.cos(d * 34);
  function ball(ctx, cx, cy, r, sx, sy) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(sx, sy);
    const gr = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
    gr.addColorStop(0, '#FF8A63'); gr.addColorStop(.55, PAL.coral); gr.addColorStop(1, '#E23E1B');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, L.TAU); ctx.fill(); ctx.restore();
  }

  function dotState(t) {
    const r = R_DOT, sx0 = 960, sy0 = 300, yF = F - r;
    if (t < T_LAUNCH) { const pl = 1 + .08 * Math.exp(-Math.max(0, t) * 20) * Math.cos(t * 50); return { cx: sx0, cy: sy0, sx: pl, sy: pl }; }
    if (t < T_LAND) {
      const u = (t - T_LAUNCH) / (T_LAND - T_LAUNCH);
      const cx = lerp(sx0, LAY.px, E.inOutSine(u) * .4 + u * .6);
      const cy = lerp(sy0, yF, u * u) - 4 * 120 * u * (1 - u);
      const v = Math.abs(u - .35) * 1.2, st = 1 + .3 * Math.min(1, v) * Math.min(1, v);
      return { cx, cy, sx: 1 / Math.sqrt(st), sy: st };
    }
    const d = t - T_LAND, s = sqz(d) * Math.exp(-d * 1.6), sy = 1 - .62 * s, sx = 1 + .95 * s;
    return { cx: LAY.px, cy: F - r * sy, sx, sy };
  }

  function mask(ctx, x, y, w, h, fn) { ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); fn(); ctx.restore(); }

  R.shot({
    id: 'shot8-lockup', label: 'CLAUDE',
    hud: { color: PAL.bone, tl: 0, bl: 1, alphaAt: t => 1 - E.inQuad(prog(t, 1.5, .34)) },
    samples: 14,
    fx: { bloom: .5, ca: .5, grain: .05, vig: .38 },
    draw(ctx, t, e) {
      const tt = Math.max(0, t);
      const bg = ctx.createRadialGradient(W / 2, 520, 80, W / 2, 520, 1150);
      bg.addColorStop(0, '#16161F'); bg.addColorStop(1, PAL.ink);
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = rgbaHex(PAL.bone, .09);
      for (let y = 96; y < H; y += 96) for (let x = 96; x < W; x += 96) ctx.fillRect(x - 1, y - 1, 2, 2);

      /* slow push-in over the whole hold */
      const z = 1 + .035 * clamp(tt / 1.8);
      ctx.save(); ctx.translate(W / 2, 540); ctx.scale(z, z); ctx.translate(-W / 2, -540);

      /* CLAUDE: punches in from the camera, one letter every 1/16 note */
      ctx.font = L.fnt(900, FS);
      for (let i = 0; i < WORD.length; i++) {
        const st = i * STEP * 1.2, p = E.outExpo(prog(tt, st, .34)); if (p <= 0 && t < st) continue;
        const a = clamp(prog(tt, st, .08) * 1), sc = lerp(2.3, 1, p), rot = (1 - p) * (i % 2 ? .22 : -.22);
        const w = LAY.ws[i], x = LAY.x0 + LAY.xs[i] + w / 2;
        ctx.save(); ctx.translate(x, F - LAY.cap / 2); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = a;
        const flash = Math.exp(-Math.max(0, tt - st) * 18);
        ctx.fillStyle = flash > .03 ? mixHex(PAL.bone, '#FFFFFF', flash) : PAL.bone; ctx.textAlign = 'center';
        ctx.fillText(WORD[i], 0, LAY.cap / 2); ctx.restore();
      }

      /* hairline + credits */
      const hl = 700 * E.outExpo(prog(tt, T_LAND + .03, .5));
      if (hl > 1) {
        ctx.fillStyle = rgbaHex(PAL.bone, .8); ctx.fillRect(W / 2 - hl, F + 52, hl * 2, 2);
        const endcap = E.outBack(prog(tt, T_LAND + .1, .3), 2);
        ctx.fillStyle = PAL.coral; ctx.fillRect(W / 2 - hl, F + 46, 3 * endcap, 14); ctx.fillRect(W / 2 + hl - 3 * endcap, F + 46, 3 * endcap, 14);
      }
      const c1 = E.outExpo(prog(tt, .62, .34));
      mask(ctx, 0, F + 72, W, 44, () => {
        ctx.font = '500 20px "JetBrains Mono"'; ctx.letterSpacing = '7px'; ctx.fillStyle = rgbaHex(PAL.bone, .7);
        ctx.textAlign = 'left'; ctx.fillText('MOTION DESIGN REEL', W / 2 - 700, F + 104 + (1 - c1) * 46);
        ctx.textAlign = 'right'; ctx.fillText('2026', W / 2 + 700 + 7, F + 104 + (1 - c1) * 46); ctx.letterSpacing = '0px';
      });
      const c2 = E.outExpo(prog(tt, .78, .4));
      mask(ctx, 0, F + 150, W, 110, () => {
        ctx.font = 'italic 400 70px "Instrument Serif"'; ctx.fillStyle = rgbaHex(PAL.bone, .92); ctx.textAlign = 'center';
        ctx.fillText('everything starts as a point.', W / 2, F + 222 + (1 - c2) * 100);
      });

      /* the dot, and its landing shock */
      const s = dotState(tt);
      if (tt >= T_LAND && tt < T_LAND + .6) {
        const rp = prog(tt, T_LAND, .6);
        ctx.save(); ctx.translate(LAY.px, F); ctx.scale(1, .14);
        ctx.strokeStyle = rgbaHex(PAL.coral, .9 * (1 - rp)); ctx.lineWidth = 4 * (1 - rp) + 1; ctx.beginPath(); ctx.arc(0, 0, 30 + 700 * E.outExpo(rp), 0, L.TAU); ctx.stroke(); ctx.restore();
        L.glow(ctx, LAY.px, F - 20, 520, PAL.coral, .5 * Math.exp(-(tt - T_LAND) * 7));
      }
      ball(ctx, s.cx, s.cy, R_DOT, s.sx, s.sy);
      ctx.restore();

      /* fade to ink for the loop */
      const fo = E.inQuad(prog(tt, 1.55, .32));
      if (fo > .004) { ctx.fillStyle = rgbaHex(PAL.ink, fo); ctx.fillRect(0, 0, W, H); }
    },
  });
})(window);
