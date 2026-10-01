/* furniture.js — the stage and the small graphic details around the picture:
 *   backdrop (a gradient stage, every scene starts with one)   dot-grid   crosshair   caption (a line of small type that rolls up)
 * Menu names: Dot Grid.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog, rgbaHex } = L;

  /* ── backdrop: a radial or linear gradient across the whole frame ── */
  KIT.piece('backdrop', {
    group: 'furniture',
    doc: 'A gradient stage across the whole frame. Every scene starts with one.',
    defaults: { type: 'radial', from: null, to: null, stops: [[0, '#16161F'], [1, PAL.ink]] },
    params: {
      type: '"radial" or "linear"',
      from: '[x, y, radius] of the inner circle (radial) or [x, y] of the start (linear); a number list, or a function of env; null = the centre',
      to: '[x, y, radius] of the outer circle (radial) or [x, y] of the end (linear)',
      stops: 'colour stops [[0, "#hex"], [1, "#hex"]]',
    },
    draw(ctx, t, p, env) {
      const f = KIT.val(p.from, env) || [env.W / 2, env.H / 2, 80], o = KIT.val(p.to, env) || [env.W / 2, env.H / 2, 1150];
      const gr = p.type === 'linear' ? ctx.createLinearGradient(f[0], f[1], o[0], o[1]) : ctx.createRadialGradient(f[0], f[1], f[2], o[0], o[1], o[2]);
      for (const [pos, col] of p.stops) gr.addColorStop(pos, col);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, env.W, env.H);
    },
  });

  /* ── dot grid: a faint grid of dots behind the scene ── */
  KIT.piece('dot-grid', {
    group: 'furniture',
    doc: 'A faint grid of dots behind the scene.',
    defaults: { step: 96, from: 96, size: 2, color: PAL.bone, alpha: .10 },
    params: { step: 'distance between dots (px)', from: 'where the first dot sits (px, both ways)', size: 'dot size (px)', color: 'dot colour', alpha: 'how faint (0 to 1)' },
    draw(ctx, t, p, env) {
      ctx.fillStyle = rgbaHex(p.color, p.alpha);
      const h = p.size / 2;
      for (let y = p.from; y < env.H; y += p.step) for (let x = p.from; x < env.W; x += p.step) ctx.fillRect(x - h, y - h, p.size, p.size);
    },
  });

  /* ── crosshair: the origin mark that fades out as the first move starts ── */
  KIT.piece('crosshair', {
    group: 'furniture',
    doc: 'A small origin crosshair that fades out.',
    defaults: { x: 960, y: 540, arm: 46, at: .05, dur: .35, alpha: .5, width: 1.5, color: PAL.bone },
    params: { x: 'centre x', y: 'centre y', arm: 'arm length (px)', at: 'when it starts to fade (s)', dur: 'how long the fade takes (s)', alpha: 'starting strength', width: 'line width', color: 'colour' },
    draw(ctx, t, p) {
      const ch = 1 - prog(t, p.at, p.dur);
      if (ch <= .01) return;
      ctx.strokeStyle = rgbaHex(p.color, p.alpha * ch); ctx.lineWidth = p.width;
      ctx.beginPath(); ctx.moveTo(p.x - p.arm, p.y); ctx.lineTo(p.x + p.arm, p.y); ctx.moveTo(p.x, p.y - p.arm); ctx.lineTo(p.x, p.y + p.arm); ctx.stroke();
    },
  });

  /* ── caption: one line of small type that rolls up from under a mask ── */
  KIT.piece('caption', {
    group: 'furniture',
    doc: 'A line of small type that rolls up from under a mask.',
    defaults: {
      text: 'POINT  →  LINE  →  PLANE', x: null, y: 754, at: 0, dur: .3, rise: 34, clip: null,
      font: '500 20px "JetBrains Mono"', track: '7px', color: PAL.bone, alpha: .62, align: 'center',
    },
    params: { text: 'the words', x: 'where the line is anchored (null = the centre)', y: 'baseline of the line at rest', at: 'when it starts rolling up', dur: 'how long it takes', rise: 'how far it travels (px)', clip: 'mask [x, y, w, h] the text rolls up from under (null = none)', font: 'CSS font', track: 'letter-spacing as CSS text', color: 'text colour', alpha: 'strength', align: 'left | center | right' },
    draw(ctx, t, p, env) {
      const cp = E.outExpo(prog(t, p.at, p.dur));
      if (cp <= .01) return;
      if (p.clip) { ctx.beginPath(); ctx.rect(p.clip[0], p.clip[1], p.clip[2], p.clip[3]); ctx.clip(); }
      ctx.font = p.font; ctx.letterSpacing = p.track; ctx.textAlign = p.align;
      ctx.fillStyle = rgbaHex(p.color, p.alpha);
      ctx.fillText(p.text, p.x == null ? env.W / 2 : p.x, p.y + (1 - cp) * p.rise);
    },
  });
})(window);
