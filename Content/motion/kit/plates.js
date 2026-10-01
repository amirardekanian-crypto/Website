/* plates.js — the eight plates of shot 7 (Dot Pop, Slash, Ripple, Twist, Tip Over, Spinner, Sweep, Pinpoint) and the Ghost Numeral.
 *
 * A plate is a whole card in its own pixels (1920 x 1080 by default): a coloured stage, a big faint number, a small label and one
 * shape that moves in. It draws at its own origin with its own design size, so a scene can place it with KIT.fit (that is how the
 * same plate will sit in a tall frame). Its defaults are the colours, number, label and beat strength it had in the reel, so
 *     KIT.draw('slash', ctx, t, { at: 0.234375 })
 * is the reel's second plate. A plate draws itself at any time: before `at` it shows its first frame and after it holds its last,
 * because a cut needs the plate on both sides of the beat. When a plate is on screen is the scene's job.
 *
 * Menu looks: Colour Plates (ink, cobalt, mint, coral, bone, lilac). Menu names: Dot Pop, Slash, Ripple, Twist, Tip Over, Spinner,
 * Sweep, Pinpoint, Ghost Numeral.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog } = L;

  /* ── ghost-numeral: the big faint number behind a plate ──
     All of its layout is in this one function, so a Farsi or tall-frame version changes only this. */
  function layoutGhost(p, t) {
    return {
      text: p.fa ? KIT.text.fa(p.text) : String(p.text),         // Persian digits on request
      font: p.font.replace('{s}', p.size),
      x: KIT.val(p.x, t), y: KIT.val(p.y, t), align: p.align,
    };
  }
  KIT.layoutGhost = layoutGhost;

  KIT.piece('ghost-numeral', {
    group: 'furniture',
    doc: 'A huge faint number sitting behind the scene. It rises into place.',
    defaults: { text: '01', x: 1850, y: 990, size: 620, font: '900 {s}px "Unbounded"', align: 'right', color: PAL.coral, alpha: .1, at: 0, dur: .3, rise: 120, fa: false },
    params: {
      text: 'the number (or any short word)',
      x: 'where it is anchored (x), or a function of time. With align "right" this is the right edge',
      y: 'the baseline once it has risen into place (y), or a function of time',
      size: 'text size (px)',
      font: 'CSS font with {s} where the size goes. Use a Farsi font such as "Vazirmatn" for Farsi digits',
      align: 'left | center | right: which side of x the number sits on',
      color: 'colour',
      alpha: 'how faint it is (0 to 1)',
      at: 'when it starts to rise (s)',
      dur: 'how long it takes to rise (s)',
      rise: 'how far below its place it starts (px)',
      fa: 'true turns the digits 0 to 9 into Persian digits',
    },
    draw(ctx, t, p) {
      const gp = E.outExpo(prog(t, p.at, p.dur)), lay = layoutGhost(p, t);
      ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color; ctx.font = lay.font; ctx.textAlign = lay.align;
      ctx.fillText(lay.text, lay.x, lay.y + (1 - gp) * p.rise);
    },
  });

  /* ── what every plate shares: a stage glow, the ghost numeral, a label, then the pen is set for the shape ── */
  const FRAME_DOC = {
    x: 'centre of the shape (x), or a function of time. null = the middle of the card',
    y: 'centre of the shape (y), or a function of time. null = the middle of the card',
    bg: 'plate colour',
    mid: 'colour at the middle of the plate. null = the plate colour lightened a little (an ink plate gets the dark stage glow)',
    color: 'colour of the shape, the label and the faint number',
    name: 'the word in the small label (for example DOT). Empty = no label',
    num: 'the plate number in the label and behind the plate. null = 01 to 08, taken from index',
    ghost: 'how strong the faint number behind the plate is (0 = none)',
    index: 'which beat of the run this plate is (0 to 7). It sets the note of its sound and its number',
    hit: 'how hard its beat shakes the camera (0 = no hit)',
    w: 'design width of the card (px). The shapes are drawn for 1920 wide. To fit another frame, call KIT.fit(ctx, 1920, 1080, box) first',
    h: 'design height of the card (px). The shapes are drawn for 1080 high',
  };

  function stage(ctx, t, p) {                                        // t is already the plate's own clock, never below 0
    const w = p.w, h = p.h, cx = w / 2, cy = h / 2;
    const bg = ctx.createRadialGradient(cx, cy, 80, cx, cy, 1200);
    const mid = p.mid || (p.bg === PAL.ink ? '#17171F' : L.mixHex(p.bg, '#FFFFFF', .1));
    bg.addColorStop(0, mid); bg.addColorStop(1, p.bg);
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

    const num = p.num != null ? p.num : String(p.index + 1).padStart(2, '0');
    if (p.ghost > 0) KIT.draw('ghost-numeral', ctx, t, { text: num, color: p.color, alpha: p.ghost, x: w - 70, y: h - 90, at: 0 });
    if (p.name) {
      KIT.draw('caption', ctx, t, {
        text: (num ? num + '  ' : '') + p.name, x: 96, y: 158, at: .02, dur: .2, rise: 44, clip: [80, 120, 600, 52],
        font: '500 22px "JetBrains Mono"', track: '8px', color: p.color, alpha: .9, align: 'left',
      });
    }
    ctx.fillStyle = p.color; ctx.strokeStyle = p.color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  }

  /* one plate = one piece. `o.draw` draws the shape on a stage that is already painted, around the centre (cx, cy). */
  function plate(k, id, o) {
    KIT.piece(id, {
      group: 'shapes',
      doc: o.doc,
      defaults: Object.assign({ at: 0 }, o.defaults, {
        x: null, y: null, bg: o.bg, mid: null, color: o.color, name: o.name, num: null, ghost: .1, index: k, hit: .16 + k * .035, w: 1920, h: 1080,
      }),
      params: Object.assign({ at: 'when the plate lands (s). It also sets when its sound and camera hit fall' }, o.params, FRAME_DOC),
      cues: p => [{ dt: 0, kind: 'stab', props: { i: p.index, rise: 1 } }].concat(p.hit ? [{ dt: 0, hit: p.hit, props: { plate: p.index } }] : []),
      draw(ctx, t, p) {
        const tt = Math.max(0, t - p.at);
        stage(ctx, tt, p);
        o.draw(ctx, tt, p, p.x == null ? p.w / 2 : KIT.val(p.x, t), p.y == null ? p.h / 2 : KIT.val(p.y, t));
      },
    });
  }

  /* 1 · DOT: pops in with a shock ring */
  plate(0, 'dot-pop', {
    doc: 'A colour plate where a dot pops in with a shock ring.',
    bg: PAL.ink, color: PAL.coral, name: 'DOT',
    defaults: { size: 290, dur: .2, overshoot: 1.8, ring: 6, reach: 220 },
    params: {
      size: 'final radius of the dot (px)',
      dur: 'how long the pop takes (s)',
      overshoot: 'how far the dot overshoots before it settles (bigger = bouncier)',
      ring: 'line width of the shock ring at the start (px). 0 = no ring',
      reach: 'how far the ring travels beyond the dot (px)',
    },
    draw(ctx, t, p, cx, cy) {
      const r = p.size * E.outBack(prog(t, 0, p.dur), p.overshoot);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(0, r), 0, L.TAU); ctx.fill();
      if (p.ring > 0) {
        const rp = prog(t, .02, .3); ctx.lineWidth = p.ring * (1 - rp); ctx.globalAlpha = 1 - rp;
        ctx.beginPath(); ctx.arc(cx, cy, p.size + 10 + p.reach * E.outExpo(rp), 0, L.TAU); ctx.stroke(); ctx.globalAlpha = 1;
      }
    },
  });

  /* 2 · LINE: draws across on the diagonal, with a thin line beside it */
  plate(1, 'slash', {
    doc: 'A colour plate where a thick line draws itself across the screen.',
    bg: PAL.cobalt, color: PAL.bone, name: 'LINE',
    defaults: { from: [-140, 940], to: [2060, 140], angle: null, thickness: 34, thin: 9, offset: [40, 110], lag: .05, dur: .22 },
    params: {
      from: 'where the thick line starts [x, y]',
      to: 'where the thick line ends [x, y]',
      angle: 'tilt in degrees (0 = flat, 90 = upright, positive rises to the right). It keeps the same centre and length. null = the line from "from" to "to"',
      thickness: 'thickness of the thick line (px)',
      thin: 'thickness of the thin line beside it (px)',
      offset: 'where the thin line sits compared with the thick one [x, y] (px)',
      lag: 'how long the thin line starts after the thick one (s)',
      dur: 'how long each line takes to draw (s)',
    },
    draw(ctx, t, p, cx, cy) {
      let a = p.from, b = p.to, off = p.offset;
      if (p.angle != null) {                                         // keep the line's length, turn it about its centre; the thin line stays square to it
        const half = Math.hypot(p.to[0] - p.from[0], p.to[1] - p.from[1]) / 2, th = p.angle * Math.PI / 180, ux = Math.cos(th), uy = -Math.sin(th);
        a = [cx - ux * half, cy - uy * half]; b = [cx + ux * half, cy + uy * half];
        const m = Math.hypot(p.offset[0], p.offset[1]); off = [m * Math.sin(th), m * Math.cos(th)];
      }
      const p1 = E.outExpo(prog(t, 0, p.dur)), p2 = E.outExpo(prog(t, p.lag, p.dur));
      ctx.lineWidth = p.thickness; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(lerp(a[0], b[0], p1), lerp(a[1], b[1], p1)); ctx.stroke();
      ctx.lineWidth = p.thin; ctx.beginPath(); ctx.moveTo(a[0] + off[0], a[1] + off[1]); ctx.lineTo(lerp(a[0], b[0], p2) + off[0], lerp(a[1], b[1], p2) + off[1]); ctx.stroke();
    },
  });

  /* 3 · RING: expands while its stroke thins, with a small dot popping in the middle */
  plate(2, 'ripple', {
    doc: 'A colour plate where a ring expands while its edge gets thinner.',
    bg: PAL.mint, color: PAL.ink, name: 'RING',
    defaults: { size: 430, r0: 60, width: 150, thin: 20, dot: 24, dur: .26 },
    params: {
      size: 'final radius of the ring (px)',
      r0: 'starting radius of the ring (px)',
      width: 'thickness of the ring edge at the start (px)',
      thin: 'thickness of the ring edge at the end (px)',
      dot: 'radius of the small dot in the middle (px). 0 = no dot',
      dur: 'how long the ring takes to expand (s)',
    },
    draw(ctx, t, p, cx, cy) {
      const e = E.outExpo(prog(t, 0, p.dur));
      ctx.lineWidth = lerp(p.width, p.thin, e); ctx.beginPath(); ctx.arc(cx, cy, lerp(p.r0, p.size, e), 0, L.TAU); ctx.stroke();
      if (p.dot > 0) { ctx.beginPath(); ctx.arc(cx, cy, p.dot * E.outBack(prog(t, .06, .2), 2), 0, L.TAU); ctx.fill(); }
    },
  });

  /* 4 · SQUARE: a quarter turn, two squares nested */
  plate(3, 'twist', {
    doc: 'A colour plate where nested squares turn a quarter turn.',
    bg: PAL.coral, color: PAL.ink, name: 'SQUARE',
    defaults: { size: 400, inner: PAL.bone, ratio: .42, turn: .25, dur: .2, turnDur: .24, overshoot: 1.6 },
    params: {
      size: 'side of the big square (px)',
      inner: 'colour of the small square inside',
      ratio: 'size of the small square compared with the big one',
      turn: 'how far it turns, in full turns (0.25 = a quarter turn)',
      dur: 'how long the squares take to grow (s)',
      turnDur: 'how long the turn takes (s)',
      overshoot: 'how far the squares overshoot before they settle (bigger = bouncier)',
    },
    draw(ctx, t, p, cx, cy) {
      const s = p.size * E.outBack(prog(t, 0, p.dur), p.overshoot), r = (Math.PI * 2 * p.turn) * E.inOutExpo(prog(t, 0, p.turnDur));
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(r); ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.rotate(-r * 2); ctx.fillStyle = p.inner; const s2 = s * p.ratio; ctx.fillRect(-s2 / 2, -s2 / 2, s2, s2); ctx.restore();
    },
  });

  /* 5 · TRIANGLE: flips over with an overshoot, a smaller one inside */
  plate(4, 'tip-over', {
    doc: 'A colour plate where a triangle flips over with an overshoot.',
    bg: PAL.bone, color: PAL.cobalt, name: 'TRIANGLE',
    defaults: { size: 620, inner: PAL.ink, ratio: .4, dur: .24, overshoot: 1.7 },
    params: {
      size: 'side of the big triangle (px)',
      inner: 'colour of the small triangle inside',
      ratio: 'size of the small triangle compared with the big one',
      dur: 'how long the flip takes (s)',
      overshoot: 'how far the flip overshoots before it settles (bigger = bouncier)',
    },
    draw(ctx, t, p, cx, cy) {
      const f = E.outBack(prog(t, 0, p.dur), p.overshoot), side = p.size, th = side * Math.sqrt(3) / 2;
      ctx.save(); ctx.translate(cx, cy + 20); ctx.scale(1, lerp(-1, 1, clamp(f, -.2, 1.25)));
      ctx.beginPath(); ctx.moveTo(0, -th * .62); ctx.lineTo(side / 2, th * .38); ctx.lineTo(-side / 2, th * .38); ctx.closePath(); ctx.fill();
      ctx.fillStyle = p.inner; const k2 = p.ratio; ctx.beginPath(); ctx.moveTo(0, -th * .62 * k2 + 40); ctx.lineTo(side / 2 * k2, th * .38 * k2 + 40); ctx.lineTo(-side / 2 * k2, th * .38 * k2 + 40); ctx.closePath(); ctx.fill();
      ctx.restore();
    },
  });

  /* 6 · CROSS: the arms extend while it spins */
  plate(5, 'spinner', {
    doc: 'A colour plate where a cross grows its arms while it spins.',
    bg: PAL.ink, color: PAL.mint, name: 'CROSS',
    defaults: { arm: 340, thickness: 96, turn: .25, dur: .22, turnDur: .26 },
    params: {
      arm: 'length of each arm from the centre (px)',
      thickness: 'thickness of the arms (px)',
      turn: 'how far it spins, in full turns (0.25 = a quarter turn)',
      dur: 'how long the arms take to grow (s)',
      turnDur: 'how long the spin takes (s)',
    },
    draw(ctx, t, p, cx, cy) {
      const e = E.outBack(prog(t, 0, p.dur), 1.5), a = (Math.PI * 2 * p.turn) * E.outBack(prog(t, 0, p.turnDur), 1.4), len = p.arm * e, th = p.thickness;
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
      L.roundedRect(ctx, -len, -th / 2, len * 2, th, th / 2); ctx.fill(); L.roundedRect(ctx, -th / 2, -len, th, len * 2, th / 2); ctx.fill();
      ctx.restore();
    },
  });

  /* 7 · ARC: a sweeping, spinning part-ring, with a thin one outside it */
  plate(6, 'sweep', {
    doc: 'A colour plate where a thick arc sweeps around and keeps spinning.',
    bg: PAL.lilac, color: PAL.ink, name: 'ARC',
    defaults: { radius: 300, thickness: 96, thin: 12, sweep: 1.5, spin: 4.2, dur: .24 },
    params: {
      radius: 'radius of the thick arc (px). The thin arc sits 110 px outside it',
      thickness: 'thickness of the thick arc (px)',
      thin: 'thickness of the thin arc (px)',
      sweep: 'how far the arc opens, in half turns (1.5 = three quarters of a circle)',
      spin: 'how fast it keeps turning (radians a second)',
      dur: 'how long the arc takes to open (s)',
    },
    draw(ctx, t, p, cx, cy) {
      const sw = p.sweep * Math.PI * E.outExpo(prog(t, 0, p.dur)), rot = t * p.spin - Math.PI / 2;
      ctx.lineWidth = p.thickness; ctx.beginPath(); ctx.arc(cx, cy, p.radius, rot, rot + sw); ctx.stroke();
      ctx.lineWidth = p.thin; ctx.beginPath(); ctx.arc(cx, cy, p.radius + 110, rot + 1, rot + 1 + sw * .5); ctx.stroke();
    },
  });

  /* 8 · POINT: the big dot shrinks to a point and rises to where the lockup will pick it up */
  plate(7, 'pinpoint', {
    doc: 'A colour plate where a big dot shrinks to a point and rises.',
    bg: PAL.ink, color: PAL.coral, name: 'POINT',
    defaults: { size: 300, point: 32, to: [960, 300], colors: ['#FF8A63', PAL.coral, '#E23E1B'], dur: .2 },
    params: {
      size: 'starting radius of the dot (px)',
      point: 'radius of the point it shrinks to (px)',
      to: 'where it ends up [x, y]',
      colors: 'three gloss colours of the dot, light to dark',
      dur: 'how long the shrink and rise take (s)',
    },
    draw(ctx, t, p, cx, cy) {
      const q = E.inOutExpo(prog(t, 0, p.dur)), r = lerp(p.size, p.point, q), px = lerp(cx, p.to[0], q), py = lerp(cy, p.to[1], q);
      const gr = ctx.createRadialGradient(px - r * .35, py - r * .4, r * .1, px, py, r * 1.05);
      gr.addColorStop(0, p.colors[0]); gr.addColorStop(.55, p.colors[1]); gr.addColorStop(1, p.colors[2]);
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(px, py, r, 0, L.TAU); ctx.fill();
    },
  });
})(window);
