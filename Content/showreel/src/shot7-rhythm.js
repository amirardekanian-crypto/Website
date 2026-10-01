/* SHOT 7 — RHYTHM  (bar 7, 11.250–13.125 s)
 *
 * Eight plates on eight-note beats, one primitive each: DOT · LINE · RING · SQUARE · TRIANGLE · CROSS · ARC · POINT.
 * Point and line to plane. Every cut between plates is a different technique (whip, iris, blinds, glitch slices,
 * zoom-through, pixelate, flip), 4–5 frames each. The last plate shrinks the dot to a point and lifts it
 * to where the lockup will pick it up.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, rgbaHex } = L;
  const BEAT = R.BEAT, BAR = R.BAR, W = R.W, H = R.H, S8 = BEAT / 2;
  const T0 = BAR * 6;
  const CX = W / 2, CY = H / 2;

  const PLATES = [
    { bg: PAL.ink, fg: PAL.coral, name: 'DOT', hud: PAL.bone },
    { bg: PAL.cobalt, fg: PAL.bone, name: 'LINE', hud: PAL.bone },
    { bg: PAL.mint, fg: PAL.ink, name: 'RING', hud: PAL.ink },
    { bg: PAL.coral, fg: PAL.ink, name: 'SQUARE', hud: PAL.ink },
    { bg: PAL.bone, fg: PAL.cobalt, name: 'TRIANGLE', hud: PAL.ink },
    { bg: PAL.ink, fg: PAL.mint, name: 'CROSS', hud: PAL.bone },
    { bg: PAL.lilac, fg: PAL.ink, name: 'ARC', hud: PAL.ink },
    { bg: PAL.ink, fg: PAL.coral, name: 'POINT', hud: PAL.bone },
  ];
  const CUTS = ['whip', 'iris', 'blinds', 'glitch', 'zoom', 'pixel', 'flip'];
  const PRE = .06, DUR = .15;
  const cA = L.canvas(W, H), cB = L.canvas(W, H), cAx = cA.getContext('2d'), cBx = cB.getContext('2d');
  const small = L.canvas(W / 2, H / 2), smallx = small.getContext('2d');

  /* cues: a stab per plate (rising), a whoosh per cut */
  PLATES.forEach((p, k) => {
    R.cue(T0 + k * S8, 'stab', { i: k, rise: 1 });
    R.hit(T0 + k * S8, .16 + k * .035, { plate: k });
    if (k < 7) R.cue(T0 + (k + 1) * S8 - PRE, 'cut', { type: CUTS[k], dur: DUR });   // 'type', not 'kind': props are merged over the cue and 'kind' would replace 'cut'
  });
  R.cue(T0 + BAR - .5, 'riser', { dur: .5 });                          // into the lockup

  const mono = (ctx, size, ls) => { ctx.font = `500 ${size}px "JetBrains Mono"`; ctx.letterSpacing = ls + 'px'; };

  /* ── plates ── */
  function plate(ctx, k, tau) {
    const P = PLATES[k], t = Math.max(0, tau);
    const bg = ctx.createRadialGradient(CX, CY, 80, CX, CY, 1200);
    const top = k === 0 || k === 5 || k === 7 ? '#17171F' : null;
    if (top) { bg.addColorStop(0, top); bg.addColorStop(1, PAL.ink); } else { bg.addColorStop(0, L.mixHex(P.bg, '#FFFFFF', .1)); bg.addColorStop(1, P.bg); }
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // ghost numeral
    const gp = E.outExpo(prog(t, 0, .3));
    ctx.save(); ctx.globalAlpha = .1; ctx.fillStyle = P.fg; ctx.font = L.fnt(900, 620); ctx.textAlign = 'right';
    ctx.fillText(String(k + 1).padStart(2, '0'), W - 70, H - 90 + (1 - gp) * 120); ctx.restore();

    // label
    const lp = E.outExpo(prog(t, .02, .2));
    ctx.save(); ctx.beginPath(); ctx.rect(80, 120, 600, 52); ctx.clip();
    mono(ctx, 22, 8); ctx.textAlign = 'left'; ctx.fillStyle = rgbaHex(P.fg, .9);
    ctx.fillText(`${String(k + 1).padStart(2, '0')}  ${P.name}`, 96, 158 + (1 - lp) * 44); ctx.letterSpacing = '0px'; ctx.restore();

    ctx.fillStyle = P.fg; ctx.strokeStyle = P.fg; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (k) {
      case 0: {                                             // DOT: pops, with a shock ring
        const r = 290 * E.outBack(prog(t, 0, .2), 1.8);
        ctx.beginPath(); ctx.arc(CX, CY, Math.max(0, r), 0, L.TAU); ctx.fill();
        const rp = prog(t, .02, .3); ctx.lineWidth = 6 * (1 - rp); ctx.globalAlpha = 1 - rp;
        ctx.beginPath(); ctx.arc(CX, CY, 300 + 220 * E.outExpo(rp), 0, L.TAU); ctx.stroke(); ctx.globalAlpha = 1;
        break;
      }
      case 1: {                                             // LINE: draws across on the diagonal
        const a = [-140, 940], b = [2060, 140];
        const p1 = E.outExpo(prog(t, 0, .22)), p2 = E.outExpo(prog(t, .05, .22));
        ctx.lineWidth = 34; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], p1), lerp(a[1], b[1], p1)); ctx.stroke();
        ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(a[0] + 40, a[1] + 110); ctx.lineTo(lerp(a[0], b[0], p2) + 40, lerp(a[1], b[1], p2) + 110); ctx.stroke();
        break;
      }
      case 2: {                                             // RING: expands while its stroke thins
        const p = E.outExpo(prog(t, 0, .26));
        ctx.lineWidth = lerp(150, 20, p); ctx.beginPath(); ctx.arc(CX, CY, lerp(60, 430, p), 0, L.TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(CX, CY, 24 * E.outBack(prog(t, .06, .2), 2), 0, L.TAU); ctx.fill();
        break;
      }
      case 3: {                                             // SQUARE: quarter-turn, two nested
        const s = 400 * E.outBack(prog(t, 0, .2), 1.6), r = (Math.PI / 2) * E.inOutExpo(prog(t, 0, .24));
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(r); ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.rotate(-r * 2); ctx.fillStyle = PAL.bone; const s2 = s * .42; ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2); ctx.restore();
        break;
      }
      case 4: {                                             // TRIANGLE: flips over with an overshoot
        const f = E.outBack(prog(t, 0, .24), 1.7), side = 620, h = side * Math.sqrt(3) / 2;
        ctx.save(); ctx.translate(CX, CY + 20); ctx.scale(1, lerp(-1, 1, clamp(f, -.2, 1.25)));
        ctx.beginPath(); ctx.moveTo(0, -h * .62); ctx.lineTo(side / 2, h * .38); ctx.lineTo(-side / 2, h * .38); ctx.closePath(); ctx.fill();
        ctx.fillStyle = PAL.ink; const k2 = .4; ctx.beginPath(); ctx.moveTo(0, -h * .62 * k2 + 40); ctx.lineTo(side / 2 * k2, h * .38 * k2 + 40); ctx.lineTo(-side / 2 * k2, h * .38 * k2 + 40); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 5: {                                             // CROSS: arms extend while it spins
        const e = E.outBack(prog(t, 0, .22), 1.5), a = (Math.PI / 2) * E.outBack(prog(t, 0, .26), 1.4), len = 340 * e, th = 96;
        ctx.save(); ctx.translate(CX, CY); ctx.rotate(a);
        L.roundedRect(ctx, -len, -th / 2, len * 2, th, th / 2); ctx.fill(); L.roundedRect(ctx, -th / 2, -len, th, len * 2, th / 2); ctx.fill();
        ctx.restore();
        break;
      }
      case 6: {                                             // ARC: a sweeping, spinning half-ring
        const sw = 1.5 * Math.PI * E.outExpo(prog(t, 0, .24)), rot = t * 4.2 - Math.PI / 2;
        ctx.lineWidth = 96; ctx.beginPath(); ctx.arc(CX, CY, 300, rot, rot + sw); ctx.stroke();
        ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(CX, CY, 410, rot + 1, rot + 1 + sw * .5); ctx.stroke();
        break;
      }
      case 7: {                                             // POINT: the dot shrinks to a point and rises to where CLAUDE. will find it
        const q = E.inOutExpo(prog(t, 0, .2)), r = lerp(300, 32, q), cy = lerp(CY, 300, q);
        const gr = ctx.createRadialGradient(CX - r * .35, cy - r * .4, r * .1, CX, cy, r * 1.05);
        gr.addColorStop(0, '#FF8A63'); gr.addColorStop(.55, PAL.coral); gr.addColorStop(1, '#E23E1B');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(CX, cy, r, 0, L.TAU); ctx.fill();
        break;
      }
    }
  }

  /* ── cuts: A (outgoing) and B (incoming) are full plates; p runs 0→1 ── */
  function cut(ctx, kind, A, B, p, flipBg) {
    const e = E.inOutCubic(p), bell = Math.sin(p * Math.PI);
    switch (kind) {
      case 'whip': {
        ctx.drawImage(A, -W * e, 0); ctx.drawImage(B, W * (1 - e), 0);
        break;
      }
      case 'iris': {
        ctx.drawImage(A, 0, 0);
        ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, 1250 * E.inOutCubic(p), 0, L.TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
        break;
      }
      case 'blinds': {
        ctx.drawImage(A, 0, 0);
        const n = 8, sw = W / n;
        for (let i = 0; i < n; i++) {
          const q = clamp((p - i * .06) / .55), w = sw * E.outCubic(q);
          ctx.save(); ctx.beginPath(); ctx.rect(i * sw, 0, w, H); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
        }
        break;
      }
      case 'glitch': {
        const bands = 14, bh = Math.ceil(H / bands);
        ctx.drawImage(p < .5 ? A : B, 0, 0);                  // a base under the slices, so the gaps they open show the scene, not leftovers
        for (let j = 0; j < bands; j++) {
          const src = (p + hash(j, 3) * .5 > .5) ? B : A, dx = (hash(j, 9) - .5) * 520 * bell;
          ctx.drawImage(src, 0, j * bh, W, bh, dx, j * bh, W, bh);
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 * bell; ctx.drawImage(p < .5 ? A : B, 18 * bell, 0); ctx.restore();
        break;
      }
      case 'zoom': {
        const sa = 1 + 2.4 * E.inQuart(p), sb = .55 + .45 * E.outCubic(p);
        ctx.save(); ctx.translate(CX, CY); ctx.scale(sa, sa); ctx.translate(-CX, -CY); ctx.drawImage(A, 0, 0); ctx.restore();
        ctx.save(); ctx.translate(CX, CY); ctx.scale(sb, sb); ctx.translate(-CX, -CY); ctx.globalAlpha = E.outQuad(p); ctx.drawImage(B, 0, 0); ctx.restore();
        break;
      }
      case 'pixel': {
        const bsz = Math.max(1, Math.round(lerp(1, 110, bell))), src = p < .5 ? A : B;
        if (bsz <= 1) { ctx.drawImage(src, 0, 0); break; }
        const sw = Math.max(2, Math.ceil(W / bsz)), sh = Math.max(2, Math.ceil(H / bsz));
        smallx.imageSmoothingEnabled = true; smallx.clearRect(0, 0, W / 2, H / 2); smallx.drawImage(src, 0, 0, sw, sh);
        ctx.imageSmoothingEnabled = false; ctx.drawImage(small, 0, 0, sw, sh, 0, 0, sw * bsz, sh * bsz); ctx.imageSmoothingEnabled = true;
        break;
      }
      case 'flip': {
        const half = p < .5;
        ctx.fillStyle = flipBg; ctx.fillRect(0, 0, W, H);
        const q = half ? p * 2 : (1 - p) * 2, sx = Math.cos(q * Math.PI / 2);
        ctx.save(); ctx.translate(CX, CY); ctx.scale(Math.max(.001, sx), 1 + (1 - sx) * .06); ctx.translate(-CX, -CY);
        ctx.drawImage(half ? A : B, 0, 0); ctx.fillStyle = `rgba(0,0,0,${(1 - sx) * .55})`; ctx.fillRect(0, 0, W, H); ctx.restore();
        break;
      }
    }
  }

  R.shot({
    id: 'shot7-rhythm', label: 'RHYTHM', samples: 26,
    hud: { color: PAL.bone, colorAt: t => PLATES[clamp(Math.floor((t + .02) / S8), 0, 7)].hud },
    fx: { bloom: .22, ca: .5, grain: .045, vig: .14 },
    draw(ctx, t, e) {
      const k = clamp(Math.floor(t / S8), 0, 7);
      // is a cut under way? (it straddles each plate boundary)
      for (let c = 0; c < 7; c++) {
        const b = (c + 1) * S8, p = (t - (b - PRE)) / DUR;
        if (p >= 0 && p < 1) {
          plate(cAx, c, t - c * S8); plate(cBx, c + 1, t - (c + 1) * S8);
          cut(ctx, CUTS[c], cA, cB, p, p < .5 ? PLATES[c].bg : PLATES[c + 1].bg);
          return;
        }
      }
      plate(ctx, clamp(Math.floor((t + PRE * 0) / S8), 0, 7), t - k * S8);
    },
  });
})(window);
