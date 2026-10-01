/* transitions.js — the seven joins between shots. Each one lands ON a bar line (the next shot's first beat), and
 * each is a match-cut of some kind: the full stop floods, the ink slab carries the next section number, the disc
 * becomes the portal, the glitch cuts on the flash, the screen splits open, a whip pan, a flash into the lockup.
 *
 *   draw(ctx, A, B, p, t)   A = outgoing shot, B = incoming shot (full canvases), p = 0..1 across the window
 *   fx(p)                   extra post-processing added on top of the shots' own (chromatic aberration, flash)
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { PAL, E, clamp, lerp, prog, hash, rgbaHex } = L;
  const W = R.W, H = R.H, CX = W / 2, CY = H / 2;
  const bump = (p, c = .5, k = 6) => Math.exp(-Math.pow((p - c) * k, 2));

  /* 1 · POINT → TYPE: the full stop swells and floods the screen coral */
  R.transition({
    pre: .45, post: .02,
    draw(ctx, A, B, p) {
      const D = R.dotMark || { x: 1750, y: 650, r: 32 };
      const q = E.inQuart(p), r = lerp(D.r, 2300, q), s = 1 + .14 * q * q;
      ctx.save(); ctx.translate(D.x, D.y); ctx.scale(s, s); ctx.translate(-D.x, -D.y); ctx.drawImage(A, 0, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(D.x, D.y, r, 0, L.TAU); ctx.clip(); ctx.drawImage(B, 0, 0);
      const gl = 1 - clamp(p * 3);                                    // keep the dot's gloss while it is still small
      if (gl > .01) {
        const gr = ctx.createRadialGradient(D.x - r * .35, D.y - r * .4, r * .05, D.x, D.y, r * 1.05);
        gr.addColorStop(0, rgbaHex('#FF8A63', gl)); gr.addColorStop(.6, rgbaHex(PAL.coral, gl * .6)); gr.addColorStop(1, rgbaHex('#E23E1B', gl));
        ctx.fillStyle = gr; ctx.fillRect(D.x - r - 2, D.y - r - 2, r * 2 + 4, r * 2 + 4);
      }
      ctx.restore();
    },
    fx: p => ({ ca: 10 * E.inCubic(p), bloom: .1 * p }),
  });

  /* 2 · TYPE → FORM: a skewed ink slab sweeps right to left, carrying the next section number */
  R.transition({
    pre: .42, post: .02,
    draw(ctx, A, B, p) {
      const e = E.inOutCubic(p), Wb = 600, sk = 190;
      const xl = lerp(W + sk, -Wb, e);                                // slab's left edge (top): fully off at p = 1
      ctx.drawImage(B, 0, 0);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(xl, 0); ctx.lineTo(xl - sk, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
      ctx.save(); ctx.translate(-Math.max(0, W - xl) * .1, 0); ctx.drawImage(A, 0, 0); ctx.restore(); ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(xl, 0); ctx.lineTo(xl + Wb, 0); ctx.lineTo(xl + Wb - sk, H); ctx.lineTo(xl - sk, H); ctx.closePath();
      ctx.fillStyle = PAL.ink; ctx.fill(); ctx.clip();
      ctx.font = L.fnt(900, 430); ctx.textAlign = 'center'; ctx.fillStyle = PAL.coral; ctx.fillText('03', xl + Wb / 2 - sk * .5, CY + 150);
      ctx.fillStyle = PAL.bone; ctx.font = '500 22px "JetBrains Mono"'; ctx.letterSpacing = '8px'; ctx.fillText('FORM', xl + Wb / 2 - sk * .5, CY + 215); ctx.letterSpacing = '0px';
      ctx.restore();
      ctx.fillStyle = PAL.bone; ctx.beginPath(); ctx.moveTo(xl - 3, 0); ctx.lineTo(xl + 4, 0); ctx.lineTo(xl - sk + 4, H); ctx.lineTo(xl - sk - 3, H); ctx.closePath(); ctx.fill();
    },
    fxMix: [.1, .4],
    fx: p => ({ ca: 7 * bump(p, .6, 3) }),
  });

  /* 3 · FORM → DEPTH: the cobalt disc is the portal; its edge becomes the iris into the next world */
  R.transition({
    pre: .33, post: .05,
    draw(ctx, A, B, p) {
      const q = E.inCubic(p), r = lerp(170, 1500, q), s = 1 + .35 * q;
      ctx.save(); ctx.translate(CX, CY); ctx.scale(s, s); ctx.translate(-CX, -CY); ctx.drawImage(A, 0, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, r, 0, L.TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
      ctx.strokeStyle = rgbaHex(PAL.bone, .75 * (1 - p)); ctx.lineWidth = 6 * (1 - p) + 1; ctx.beginPath(); ctx.arc(CX, CY, r, 0, L.TAU); ctx.stroke();
    },
    fx: p => ({ ca: 12 * bump(p, .9, 4), bloom: .15 * p }),
  });

  /* 4 · DEPTH → FLOW: a glitch cut on the flash */
  R.transition({
    pre: .12, post: .14,
    draw(ctx, A, B, p, t) {
      const src = p < .5 ? A : B, amp = bump(p, .5, 3.6), bands = 16, bh = Math.ceil(H / bands), seed = Math.floor(p * 16);
      ctx.drawImage(src, 0, 0);
      for (let j = 0; j < bands; j++) {
        const dx = (hash(j, seed) - .5) * 760 * amp; if (Math.abs(dx) < 2) continue;
        ctx.drawImage(src, 0, j * bh, W, bh, dx, j * bh, W, bh);
      }
    },
    fx: p => ({ flash: .9 * (p < .5 ? E.inCubic(p / .5) : Math.exp(-(p - .5) * 17)), ca: 24 * bump(p, .5, 3.4) }),
  });

  /* 5 · FLOW → INTERFACE: the screen splits along its middle and opens */
  R.transition({
    pre: .38, post: .02,
    draw(ctx, A, B, p) {
      const e = E.inOutCubic(p), off = e * (H / 2 + 6);
      ctx.drawImage(B, 0, 0);
      ctx.drawImage(A, 0, 0, W, H / 2, 0, -off, W, H / 2);
      ctx.drawImage(A, 0, H / 2, W, H / 2, 0, H / 2 + off, W, H / 2);
      const a = 1 - E.outQuad(p);
      ctx.fillStyle = rgbaHex(PAL.bone, a); ctx.fillRect(0, H / 2 - off - 3, W, 3); ctx.fillRect(0, H / 2 + off, W, 3);
    },
    fxMix: [.1, .35],
    fx: p => ({ ca: 6 * bump(p, .5, 3) }),
  });

  /* 6 · INTERFACE → RHYTHM: whip pan */
  R.transition({
    pre: .30, post: .03,
    draw(ctx, A, B, p) {
      const e = E.inOutCubic(p), off = e * (W + 140), sA = 1 + .1 * e, sB = 1.1 - .1 * e;
      ctx.save(); ctx.translate(-off + CX, CY); ctx.scale(sA, sA); ctx.translate(-CX, -CY); ctx.drawImage(A, 0, 0); ctx.restore();
      ctx.save(); ctx.translate(W + 140 - off + CX, CY); ctx.scale(sB, sB); ctx.translate(-CX, -CY); ctx.drawImage(B, 0, 0); ctx.restore();
    },
    fx: p => ({ ca: 14 * bump(p, .5, 3) }),
  });

  /* 7 · RHYTHM → CLAUDE: hard cut on a white flash */
  R.transition({
    pre: .05, post: .10,
    draw(ctx, A, B, p) { ctx.drawImage(p < .333 ? A : B, 0, 0); },
    fx: p => ({ flash: .9 * (p < .333 ? E.inCubic(p / .333) : Math.exp(-(p - .333) * 20)), ca: 20 * bump(p, .333, 5) }),
  });
})(window);
