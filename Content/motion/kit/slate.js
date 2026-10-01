/* slate.js — the Slate: the small furniture that frames every picture.
 *   slate (Slate)   crop marks in the four corners, a title, a running timecode, the name of the section on screen
 *                   and one progress bar for every section.
 *
 * The reel draws it AFTER the finishing pass, straight onto the output canvas, so it stays razor sharp (src/hud.js does that:
 * it works out the colour of the shot on screen and how visible each corner is, then calls this piece). With no params the
 * piece draws the reel's own slate in bone.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL, E, clamp, prog, hex, rgb } = L;

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  /* 00:00:SS:FF at the reel's frame rate */
  function timecode(t, FPS) {
    const fr = Math.floor(t * FPS + 1e-6);
    return `${pad(0)}:${pad(0)}:${pad(Math.floor(fr / FPS))}:${pad(fr % FPS)}`;
  }

  KIT.piece('slate', {
    group: 'furniture',
    doc: 'Crop marks in the corners, a title, a running timecode, the name of the section on screen and one progress bar for each section.',
    defaults: {
      title: 'CLAUDE', sub: '— MOTION REEL ’26', tc: 'TC', color: PAL.bone, alpha: 1,
      marks: 1, tl: 1, tr: 1, bl: 1, br: 1,
      sections: () => R.shots, section: null,
      mx: 64, my: 54, inset: 26, arm: 16, seg: 26, gap: 6,
      font: '500 15px "JetBrains Mono"', track: '2.4px',
    },
    params: {
      title: 'the bright words in the top left corner',
      sub: 'the fainter words that follow the title',
      tc: 'the small tag in front of the timecode',
      color: 'colour of everything: a hex colour, or a list [r, g, b] (0 to 255)',
      alpha: 'fades the whole slate (0 to 1)',
      marks: 'how visible the crop marks are (0 hides them, 1 shows them)',
      tl: 'how visible the top left title is (0 hides it)',
      tr: 'how visible the top right timecode is (0 hides it)',
      bl: 'how visible the bottom left section label is (0 hides it)',
      br: 'how visible the bottom right progress bars are (0 hides them)',
      sections: 'the sections: a list of { label, t0, dur } in seconds, or a function that gives one (the reel gives its eight shots)',
      section: 'which section is on screen, counting from 0 (null = the one the time falls in)',
      mx: 'margin at the left and right edge (px)',
      my: 'margin at the top and bottom edge (px)',
      inset: 'how far the crop marks sit from the edge (px)',
      arm: 'length of each crop mark arm (px)',
      seg: 'width of one progress bar (px)',
      gap: 'space between progress bars (px)',
      font: 'CSS font of every word',
      track: 'letter-spacing of every word, as CSS text',
    },
    draw(ctx, t, p, env) {
      const W = env.W, H = env.H, MX = p.mx, MY = p.my, col = typeof p.color === 'string' ? hex(p.color) : p.color;
      const secs = KIT.val(p.sections) || [];
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';

      /* crop marks */
      const m = p.marks * p.alpha;
      if (m > .01) {
        ctx.strokeStyle = rgb(col, .55 * m); ctx.lineWidth = 2; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
        const ins = p.inset, len = p.arm;
        for (const [cx, cy, sx, sy] of [[ins, ins, 1, 1], [W - ins, ins, -1, 1], [ins, H - ins, 1, -1], [W - ins, H - ins, -1, -1]]) {
          ctx.beginPath(); ctx.moveTo(cx + sx * len, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * len); ctx.stroke();
        }
      }

      ctx.font = p.font; ctx.letterSpacing = p.track;

      /* top left: the title */
      const tl = p.tl * p.alpha;
      if (tl > .01) {
        ctx.fillStyle = rgb(col, .9 * tl); ctx.textAlign = 'left';
        ctx.fillText(p.title, MX, MY);
        const w = ctx.measureText(p.title + ' ').width;
        ctx.fillStyle = rgb(col, .5 * tl); ctx.fillText(p.sub, MX + w, MY);
      }

      /* top right: the timecode */
      const tr = p.tr * p.alpha;
      if (tr > .01) {
        ctx.textAlign = 'right';
        const tc = timecode(t, env.FPS), w = ctx.measureText(tc).width;
        ctx.fillStyle = rgb(col, .9 * tr); ctx.fillText(tc, W - MX, MY);
        ctx.fillStyle = rgb(col, .45 * tr); ctx.fillText(p.tc, W - MX - w - 18, MY);
      }

      /* bottom left: the section label, which rolls up as each section starts */
      const bl = p.bl * p.alpha;
      let idx = p.section;
      if (idx == null) { idx = 0; for (let k = 0; k < secs.length; k++) if (t >= secs[k].t0) idx = k; }
      if (bl > .01 && idx >= 0 && idx < secs.length) {
        const s = secs[idx], since = t - s.t0;
        const roll = E.outExpo(prog(since, -0.02, .36));
        ctx.save();
        ctx.beginPath(); ctx.rect(MX - 4, H - MY - 24, 520, 34); ctx.clip();
        ctx.textAlign = 'left';
        const num = pad(idx + 1) + ' ', lab = '/ ' + s.label;
        const ty = H - MY + (1 - roll) * 26;
        ctx.fillStyle = rgb(col, .95 * bl); ctx.fillText(num, MX, ty);
        const nw = ctx.measureText(num).width;
        ctx.fillStyle = rgb(col, .6 * bl); ctx.fillText(lab, MX + nw, ty);
        ctx.restore();
      }

      /* bottom right: one bar for every section */
      const br = p.br * p.alpha;
      if (br > .01) {
        const segW = p.seg, gap = p.gap, n = secs.length, total = n * segW + (n - 1) * gap;
        const x0 = W - MX - total, y = H - MY - 8;
        for (let i = 0; i < n; i++) {
          const s = secs[i], pr = clamp((t - s.t0) / s.dur);
          ctx.fillStyle = rgb(col, .22 * br); ctx.fillRect(x0 + i * (segW + gap), y, segW, 4);
          if (pr > 0) { ctx.fillStyle = rgb(col, .95 * br); ctx.fillRect(x0 + i * (segW + gap), y, segW * pr, 4); }
        }
      }
    },
  });
})(window);
