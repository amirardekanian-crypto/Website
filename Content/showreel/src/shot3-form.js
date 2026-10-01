/* SHOT 3 — FORM  (bar 3, 3.750–5.625 s)
 *
 * A 16×9 grid of cells on bone. Every cell is one rounded rectangle whose corner radii, size, rotation and
 * colour are interpolated between four poses, one per beat, each wave staggered from a different origin:
 *   A  target of dots      (radial pop-in from the centre)
 *   B  quarter-circle tiles (radial wave, each tile spins to its own quarter-turn)
 *   C  pill bars            (left-to-right wave; rows then slide against each other)
 *   D  one cobalt disc      (outside-in collapse). That disc is the portal transition 3 opens into shot 4.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, hex } = L;
  const BEAT = R.BEAT, W = R.W, H = R.H;
  const COLS = 16, ROWS = 9, S = 120;
  const T_B = BEAT - .04, T_C = BEAT * 2 - .04, T_D = BEAT * 3 - .06;      // poses land on the beat (1-2 frames of anticipation)
  const INK = hex(PAL.ink), CORAL = hex(PAL.coral), COBALT = hex(PAL.cobalt), BONE3 = hex(PAL.bone3);
  const CELLS = [];

  /* pose = [cx, cy, w, h, rot, rtl, rtr, rbr, rbl, r, g, b] */
  const pose = (cx, cy, w, h, rot, rad, col) => [cx, cy, w, h, rot, rad[0], rad[1], rad[2], rad[3], col[0], col[1], col[2]];
  const mixPose = (a, b, p) => { const o = new Array(12); for (let i = 0; i < 12; i++) o[i] = a[i] + (b[i] - a[i]) * p; return o; };

  R.inits.push(() => {
    const barLen = [7, 10, 12, 14, 16, 14, 12, 10, 7];                     // diamond profile, cells per row
    const barCol = [COBALT, CORAL, INK, CORAL, COBALT, CORAL, INK, CORAL, COBALT];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c, cx = S / 2 + c * S, cy = S / 2 + r * S;
      const d = Math.hypot(c - 7.5, r - 4);                                // distance from the centre, in cells
      const ring = [CORAL, INK, COBALT][Math.floor(d / 1.5) % 3];
      const A = pose(cx, cy, 96, 96, 0, [48, 48, 48, 48], ring);
      const Z = pose(cx, cy, 0, 0, 0, [0, 0, 0, 0], ring);
      const k = Math.floor(hash(i, 7) * 4);
      const qcol = [CORAL, INK, INK, COBALT, INK][(c + 2 * r) % 5];
      const B = pose(cx, cy, S, S, k * Math.PI / 2, [S, 0, 0, 0], qcol);

      // pose C: this cell's slice of its row's bar (cells outside the bar shrink into the nearest end)
      const len = barLen[r], x0 = 960 - len * S / 2, x1 = 960 + len * S / 2;
      const a = Math.max(c * S, x0), b = Math.min((c + 1) * S, x1);
      let C;
      if (b > a) {
        const first = a === x0, last = b === x1, rr = 48;
        C = pose((a + b) / 2, cy, b - a + 1.5, 96, 0, [first ? rr : 0, last ? rr : 0, last ? rr : 0, first ? rr : 0], barCol[r]);
      } else {
        const ex = cx < 960 ? x0 : x1;
        C = pose(ex, cy, 0, 96, 0, [0, 0, 0, 0], barCol[r]);
      }
      const D = pose(960, 540, 340, 340, 0, [170, 170, 170, 170], COBALT);
      CELLS.push({
        c, r, Z, A, B, C, D,
        dA: d * .012, dB: d * .009, dC: c * .006 + Math.abs(r - 4) * .003, dD: (9.3 - d) * .007,
        dir: r % 2 ? 1 : -1,
      });
    }
  });

  const T0 = R.BAR * 2;                                                    // this shot starts on bar 3
  R.hit(T0, .6, { pop: 1 });
  for (let k = 0; k < 8; k++) R.cue(T0 + k * .035, 'arp', { k });
  R.hit(T0 + BEAT, .5, { i: 1 });
  R.hit(T0 + BEAT * 2, .5, { i: 2 });
  R.cue(T0 + T_D - .1, 'whoosh', { dir: 'in', dur: .5 });                  // the collapse into the disc

  function drawCell(ctx, s, shift) {
    const w = s[2], h = s[3];
    if (w < .6 || h < .6) return;
    ctx.save();
    ctx.translate(s[0] + shift, s[1]);
    if (s[4]) ctx.rotate(s[4]);
    ctx.fillStyle = `rgb(${s[9] | 0},${s[10] | 0},${s[11] | 0})`;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, [Math.max(0, s[5]), Math.max(0, s[6]), Math.max(0, s[7]), Math.max(0, s[8])]);
    ctx.fill();
    ctx.restore();
  }

  R.shot({
    id: 'shot3-form', label: 'FORM', hud: { color: PAL.ink }, samples: 10,
    fx: { bloom: .04, ca: .35, grain: .04, vig: .06 },
    draw(ctx, t, e) {
      /* paper */
      const bg = ctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 1200);
      bg.addColorStop(0, '#F7F3EB'); bg.addColorStop(1, '#EEE8DC');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(11,11,16,.055)'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = S; x < W; x += S) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
      for (let y = S; y < H; y += S) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
      ctx.stroke();

      const slide = E.inOutCubic(prog(t, T_C + .1, .36));                    // pose C: rows slide against each other
      for (const k of CELLS) {
        const pA = E.outBack(prog(t - k.dA, -.06, .24), 1.7);
        const pB = E.outBack(prog(t - k.dB, T_B, .26), 1.35);
        const pC = E.outBack(prog(t - k.dC, T_C, .26), 1.25);
        const pD = E.inOutCubic(prog(t - k.dD, T_D, .28));
        let s = mixPose(k.Z, k.A, pA);
        if (pB > 0) s = mixPose(s, k.B, pB);
        if (pC > 0) s = mixPose(s, k.C, pC);
        if (pD > 0) s = mixPose(s, k.D, pD);
        drawCell(ctx, s, k.dir * 64 * slide * (1 - pD));
      }
    },
  });
})(window);
