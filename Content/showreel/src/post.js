/* post.js — the finishing pass: two-scale bloom, radial chromatic aberration, vignette, film grain, flash.
 * Runs once per OUTPUT frame (not per motion-blur sample), so it stays cheap.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL;
  /* everything here is sized from the frame: 1/4 and 1/8 size glow buffers, one full-size scratch for the colour split.
     REEL.configure() rebuilds them (R.onConfigure). At 1920 x 1080 they are the same 480 x 270 and 240 x 135 as ever. */
  let W, H, BW, BH, bl1, bl1x, bl2, bl2x, mk1, mk1x, co1, co1x, ca, cax;
  function build() {
    W = R.W; H = R.H; BW = W / 4; BH = H / 4;
    bl1 = L.canvas(BW, BH); bl1x = bl1.getContext('2d');             // tight glow
    bl2 = L.canvas(BW / 2, BH / 2); bl2x = bl2.getContext('2d');     // wide halo
    mk1 = L.canvas(BW, BH); mk1x = mk1.getContext('2d');             // highlight mask + colour scratch
    co1 = L.canvas(BW, BH); co1x = co1.getContext('2d');
    ca = L.canvas(W, H); cax = ca.getContext('2d');
  }
  build(); R.onConfigure.push(build);

  /* Highlights only, in their own colour: a luminance mask (grayscale -> hard contrast) multiplied onto the
     colour image, then blurred. A per-channel threshold would pass any saturated red and lift flat coral. */
  function highlights(dst, dx, w, h, src, blur) {
    mk1x.filter = 'none'; mk1x.fillStyle = '#000'; mk1x.fillRect(0, 0, BW, BH);
    mk1x.filter = 'grayscale(1) contrast(3.6) brightness(.92)'; mk1x.drawImage(src, 0, 0, w, h); mk1x.filter = 'none';
    co1x.globalCompositeOperation = 'source-over'; co1x.filter = 'none'; co1x.drawImage(src, 0, 0, w, h);
    co1x.globalCompositeOperation = 'multiply'; co1x.drawImage(mk1, 0, 0, w, h, 0, 0, w, h);
    co1x.globalCompositeOperation = 'source-over';
    dx.filter = 'none'; dx.clearRect(0, 0, w, h);
    dx.filter = `blur(${blur}px)`; dx.drawImage(co1, 0, 0, w, h, 0, 0, w, h); dx.filter = 'none';
  }

  /* film grain: a few 512px tiles of soft gaussian-ish noise, drawn with a random offset each frame */
  const grainTiles = [];
  (function () {
    const rnd = L.mulberry32(20260930);
    for (let k = 0; k < 6; k++) {
      const c = L.canvas(512, 512), x = c.getContext('2d'), id = x.createImageData(512, 512);
      for (let i = 0; i < id.data.length; i += 4) {
        const v = 128 + ((rnd() + rnd() + rnd() - 1.5) * 90);
        id.data[i] = id.data[i + 1] = id.data[i + 2] = v < 0 ? 0 : v > 255 ? 255 : v; id.data[i + 3] = 255;
      }
      x.putImageData(id, 0, 0);
      grainTiles.push(c);
    }
  })();

  function chromatic(dst, src, px) {
    const chans = [['#ff0000', 1], ['#00ff00', 0], ['#0000ff', -1]];
    dst.save(); dst.globalCompositeOperation = 'lighter';
    const lift = R.caMode === 'zoom' ? 1 : 0;      // 'zoom': scale all three channels up by one step so no channel leaves a coloured border at the frame edge
    for (const [col, dir] of chans) {
      const s = 1 + (dir + lift) * px / (W / 2);
      cax.setTransform(1, 0, 0, 1, 0, 0); cax.globalCompositeOperation = 'source-over'; cax.globalAlpha = 1;
      cax.fillStyle = '#000'; cax.fillRect(0, 0, W, H);
      cax.setTransform(s, 0, 0, s, W / 2 * (1 - s), H / 2 * (1 - s));
      cax.drawImage(src, 0, 0);
      cax.setTransform(1, 0, 0, 1, 0, 0);
      cax.globalCompositeOperation = 'multiply'; cax.fillStyle = col; cax.fillRect(0, 0, W, H);
      dst.drawImage(ca, 0, 0);
    }
    dst.restore();
  }

  R.post = function (ctx, src, t, f, fx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    if (fx.ca > .35) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); chromatic(ctx, src, fx.ca); }
    else ctx.drawImage(src, 0, 0);

    /* bloom: keep the highlights, blur them at two scales, add them back */
    if (fx.bloom > .01) {
      highlights(bl1, bl1x, BW, BH, src, 3);
      highlights(bl2, bl2x, BW / 2, BH / 2, src, 5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.globalAlpha = clampA(fx.bloom * .55); ctx.drawImage(bl1, 0, 0, W, H);
      ctx.globalAlpha = clampA(fx.bloom * .75); ctx.drawImage(bl2, 0, 0, W, H);
      ctx.restore();
    }

    /* vignette */
    if (fx.vig > .01) {
      const V = Math.min(W, H), gr = ctx.createRadialGradient(W / 2, H / 2, V * .45, W / 2, H / 2, V * 1.05);
      gr.addColorStop(0, 'rgba(4,4,8,0)'); gr.addColorStop(1, `rgba(4,4,8,${fx.vig})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }

    /* grain (also dithers the 8-bit gradients) */
    if (fx.grain > .001) {
      const fi = Math.floor(f + 1e-6);
      const tile = grainTiles[fi % grainTiles.length];
      const ox = Math.floor(L.hash(fi, 11) * 512), oy = Math.floor(L.hash(fi, 12) * 512);
      ctx.save();
      ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = fx.grain * 2.2;
      ctx.setTransform(2, 0, 0, 2, -ox * 2, -oy * 2);
      ctx.fillStyle = ctx.createPattern(tile, 'repeat');
      ctx.fillRect(ox, oy, W / 2 + 1, H / 2 + 1);
      ctx.restore();
    }

    if (fx.flash > .003) { ctx.globalAlpha = clampA(fx.flash); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  };
  function clampA(a) { return a < 0 ? 0 : a > 1 ? 1 : a; }
})(window);
