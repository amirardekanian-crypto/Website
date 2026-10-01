/* hud.js — the persistent frame furniture: crop marks, title, SMPTE timecode, section label, 8-bar progress.
 * Drawn AFTER post-processing so it stays razor sharp, and in the colour of whichever shot is on screen.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, { W, H, FPS } = R, { clamp, prog, E, hex, rgb, mixC, smoothstep } = L;
  const MX = 64, MY = 54;

  const pad = (n, w = 2) => String(n).padStart(w, '0');
  function timecode(t) {
    const fr = Math.floor(t * FPS + 1e-6);
    return `${pad(0)}:${pad(0)}:${pad(Math.floor(fr / FPS))}:${pad(fr % FPS)}`;
  }

  R.hud = function (ctx, t) {
    const a = R.active(t);
    let cur, nxt = null, k = 0;
    if (a.tr) { cur = R.shots[a.tr.to - 1]; nxt = R.shots[a.tr.to]; k = smoothstep(.35, .65, a.p); } else cur = R.shots[a.i];
    const hc = s => hex(s.hud.colorAt ? s.hud.colorAt(t - s.t0) : s.hud.color);       // a shot may change its HUD colour over time
    const col = nxt ? mixC(hc(cur), hc(nxt), k) : hc(cur);
    const owner = k > .5 ? nxt : cur;                       // whose label / visibility rules apply
    const idx = R.shots.indexOf(owner);
    const ga = owner.hud.alphaAt ? owner.hud.alphaAt(t - owner.t0) : 1;                 // whole-HUD fade (the lockup fades out)
    const vis = (key) => (nxt ? L.lerp(cur.hud[key], nxt.hud[key], k) : cur.hud[key]) * ga;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.textBaseline = 'alphabetic'; ctx.fontKerning = 'normal';

    /* crop marks */
    const m = vis('marks');
    if (m > .01) {
      ctx.strokeStyle = rgb(col, .55 * m); ctx.lineWidth = 2; ctx.lineCap = 'butt';
      const ins = 26, len = 16;
      for (const [cx, cy, sx, sy] of [[ins, ins, 1, 1], [W - ins, ins, -1, 1], [ins, H - ins, 1, -1], [W - ins, H - ins, -1, -1]]) {
        ctx.beginPath(); ctx.moveTo(cx + sx * len, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx, cy + sy * len); ctx.stroke();
      }
    }

    ctx.font = '500 15px "JetBrains Mono"'; ctx.letterSpacing = '2.4px';

    /* top-left: title */
    const tl = vis('tl');
    if (tl > .01) {
      ctx.fillStyle = rgb(col, .9 * tl); ctx.textAlign = 'left';
      ctx.fillText('CLAUDE', MX, MY);
      const w = ctx.measureText('CLAUDE ').width;
      ctx.fillStyle = rgb(col, .5 * tl); ctx.fillText('— MOTION REEL ’26', MX + w, MY);
    }

    /* top-right: timecode */
    const tr = vis('tr');
    if (tr > .01) {
      ctx.textAlign = 'right';
      const tc = timecode(t), w = ctx.measureText(tc).width;
      ctx.fillStyle = rgb(col, .9 * tr); ctx.fillText(tc, W - MX, MY);
      ctx.fillStyle = rgb(col, .45 * tr); ctx.fillText('TC', W - MX - w - 18, MY);
    }

    /* bottom-left: section label, rolls up on every bar line */
    const bl = vis('bl');
    if (bl > .01 && idx >= 0) {
      const s = R.shots[idx], since = t - s.t0;
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

    /* bottom-right: one segment per bar */
    const br = vis('br');
    if (br > .01) {
      const segW = 26, gap = 6, n = R.shots.length, total = n * segW + (n - 1) * gap;
      const x0 = W - MX - total, y = H - MY - 8;
      for (let i = 0; i < n; i++) {
        const s = R.shots[i], p = clamp((t - s.t0) / s.dur);
        ctx.fillStyle = rgb(col, .22 * br); ctx.fillRect(x0 + i * (segW + gap), y, segW, 4);
        if (p > 0) { ctx.fillStyle = rgb(col, .95 * br); ctx.fillRect(x0 + i * (segW + gap), y, segW * p, 4); }
      }
    }
    ctx.restore();
  };
})(window);
