/* lockup.js — the last shot: the word that punches in, the dot that lands as its full stop, and the glow that follows.
 *   punch-in (Punch In)    letters slam in from the camera, one after another, each spinning and shrinking onto the line
 *   afterglow (Afterglow)  a landing sends out a flat ring and a warm glow
 * and three small pieces of the lockup that have no Menu name of their own:
 *   lockup-dot     the coral dot that hangs, arcs across and lands as the full stop
 *   lockup-rule    a thin line that shoots out under the word and ends in two coral caps
 *   lockup-fade    a fade of the whole frame to one colour, for the loop
 * Written from shot 8 of the showreel; with no params each one reproduces the reel exactly.
 *
 * The credits and the tagline are the kit's caption piece, and the backdrop and the dot grid are the kit's own.
 * punch-in measures its word once the fonts are loaded (warm) and publishes where the full stop goes (KIT.marks.lockup),
 * so the dot and the glow can land on it.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL, KIT = g.KIT, { PAL, E, clamp, lerp, prog, mixHex, rgbaHex } = L;

  /* ── punch-in: the word ── */
  const laidOut = new Map();
  /* where every letter sits. One function does all the layout, so a different alphabet only has to change this one
     (KIT.text.units cuts a Latin line into letters and a Farsi line into whole words). */
  function layoutLine(p, env) {
    const key = [p.text, p.size, p.font, p.dot ? p.dotRadius : 0, p.x, env.W].join('|');
    let lay = laidOut.get(key);
    if (lay) return lay;
    const font = p.font.replace('{s}', p.size), c = L.canvas(8, 8).getContext('2d');
    c.font = font;
    const u = KIT.text.units(font, p.text, { unit: 'letter' });
    lay = { font, units: u.units, total: u.total, cap: L.capHeight(c) };
    lay.gap = p.size * .075;
    const full = p.dot ? lay.total + lay.gap + p.dotRadius * 2 : lay.total;
    lay.x0 = p.x == null ? Math.round((env.W - full) / 2) : Math.round(p.x - full / 2);
    lay.px = lay.x0 + lay.total + lay.gap + p.dotRadius;                // where the full stop sits
    laidOut.set(key, lay);
    return lay;
  }

  KIT.piece('punch-in', {
    group: 'type',
    doc: 'Letters slam in from the camera one after another, each tilted and too big at first, then settling onto the line with a white flash.',
    defaults: {
      text: 'CLAUDE', at: 0, x: null, y: 560, size: 256, font: '900 {s}px "Unbounded"', color: PAL.bone, flash: '#FFFFFF',
      from: 2.3, stagger: R.BEAT / 16 * 1.2, dur: .34, spin: .22, fade: .08, flashRate: 18,
      dot: true, dotRadius: 32, publish: 'lockup',
    },
    params: {
      text: 'the word (Latin letters move one by one; a Farsi word would move whole)',
      at: 'when the first letter starts (s)',
      x: 'where the middle of the word (with its full stop) sits (null = the middle of the frame)',
      y: 'the line the letters stand on',
      size: 'letter size (px)', font: 'CSS font, with {s} where the size goes',
      color: 'colour of the letters', flash: 'colour each letter flashes to as it lands',
      from: 'how big each letter starts, as a multiple of its final size',
      stagger: 'time between one letter and the next (s)', dur: 'how long each letter takes to land (s)',
      spin: 'how far each letter is tilted at the start, in radians (0.22 is about 13 degrees); odd letters lean one way and even ones the other',
      fade: 'how long each letter takes to fade in (s)', flashRate: 'how fast the flash dies away (higher is quicker)',
      dot: 'leave room after the word for a full stop', dotRadius: 'radius of that full stop (px)',
      publish: 'the name the full stop position is published under, for the dot and the glow to find (KIT.marks)',
    },
    warm(p, env) {
      const lay = layoutLine(p, env);
      if (p.publish) KIT.mark(p.publish, { x: lay.px, y: p.y - p.dotRadius, r: p.dotRadius });
    },
    warmKey: p => [p.text, p.size, p.font, p.x, p.dot, p.dotRadius, p.publish].join('|'),
    cues: p => [{ dt: 0, hit: 1.2, props: { final: 1 } }, { dt: .02, kind: 'slam', props: { n: Array.from(p.text).length } }],
    draw(ctx, t, p, env) {
      const lay = layoutLine(p, env), T = t - p.at, tt = Math.max(0, T);
      ctx.font = lay.font;
      for (let i = 0; i < lay.units.length; i++) {
        const st = i * p.stagger, pr = E.outExpo(prog(tt, st, p.dur)); if (pr <= 0 && T < st) continue;
        const a = clamp(prog(tt, st, p.fade)), sc = lerp(p.from, 1, pr), rot = (1 - pr) * (i % 2 ? p.spin : -p.spin);
        const u = lay.units[i], w = u.w, x = lay.x0 + u.x + w / 2;
        ctx.save(); ctx.translate(x, p.y - lay.cap / 2); ctx.rotate(rot); ctx.scale(sc, sc); ctx.globalAlpha = a;
        const flash = Math.exp(-Math.max(0, tt - st) * p.flashRate);
        ctx.fillStyle = flash > .03 ? mixHex(p.color, p.flash, flash) : p.color; ctx.textAlign = 'center';
        ctx.fillText(u.s, 0, lay.cap / 2); ctx.restore();
      }
    },
  });

  /* where the full stop of the lockup lands: where punch-in published it, or the middle of the frame */
  const stop = () => (KIT.marks.lockup || { x: 960 }).x;

  /* ── afterglow: the ring and the glow of a landing ── */
  KIT.piece('afterglow', {
    group: 'weight',
    doc: 'A landing sends a flat ring racing out along the floor and leaves a warm glow that fades away.',
    defaults: { at: R.BEAT, x: stop, y: 560, dur: .6, color: PAL.coral, size: 520, ring: 700, lift: 20, flat: .14 },
    params: {
      at: 'when it lands (s)', x: 'where it lands (x), or a function that gives it', y: 'the floor it lands on (y)',
      dur: 'how long the ring takes to run out (s)', color: 'colour of the ring and the glow', size: 'radius of the glow (px)',
      ring: 'how far the ring runs out (px)', lift: 'how far above the floor the glow is centred (px)',
      flat: 'how flat the ring is squashed (1 = a circle)',
    },
    cues: () => [{ dt: 0, hit: .9, props: { sub: 1, last: 1 } }, { dt: 0, kind: 'chord', props: { dur: 1.4 } }],
    draw(ctx, t, p) {
      if (t < p.at || t >= p.at + p.dur) return;
      const rp = prog(t, p.at, p.dur), x = KIT.val(p.x);
      ctx.save(); ctx.translate(x, p.y); ctx.scale(1, p.flat);
      ctx.strokeStyle = rgbaHex(p.color, .9 * (1 - rp)); ctx.lineWidth = 4 * (1 - rp) + 1; ctx.beginPath(); ctx.arc(0, 0, 30 + p.ring * E.outExpo(rp), 0, L.TAU); ctx.stroke(); ctx.restore();
      L.glow(ctx, x, p.y - p.lift, p.size, p.color, .5 * Math.exp(-(t - p.at) * 7));
    },
  });

  /* ── lockup-dot: the dot that becomes the full stop ── */
  const sqz = d => Math.exp(-d * 13) * Math.cos(d * 34);                // d = seconds since it touched down
  KIT.piece('lockup-dot', {
    group: 'weight',
    doc: 'The coral dot hangs and pulses, arcs across in one hop and lands as the full stop, squashing as it lands.',
    defaults: {
      at: 0, x: 960, y: 300, r: 32, floor: 560, launch: .17, land: R.BEAT, hopX: stop, hopH: 120,
      colors: ['#FF8A63', PAL.coral, '#E23E1B'],
    },
    params: {
      at: 'start of the clock the times below are on (s)', x: 'where it hangs (x)', y: 'where it hangs (y)', r: 'radius of the dot (px)',
      floor: 'the floor it lands on (y)', launch: 'when it leaves the hang', land: 'when it touches the floor',
      hopX: 'where it lands (x), or a function that gives it', hopH: 'how high the arc lifts it (px)', colors: 'three gloss colours, light to dark',
    },
    cues: p => [{ dt: p.launch, kind: 'blip', props: { pitch: 2, dur: .3 } }],
    draw(ctx, t, p) {
      const tt = Math.max(0, t - p.at), r = p.r, yF = p.floor - r, px = KIT.val(p.hopX);
      let s;
      if (tt < p.launch) {                                                  // hanging, with a small pulse
        const pl = 1 + .08 * Math.exp(-Math.max(0, tt) * 20) * Math.cos(tt * 50);
        s = { cx: p.x, cy: p.y, sx: pl, sy: pl };
      } else if (tt < p.land) {                                             // the hop across, stretching in the air
        const u = (tt - p.launch) / (p.land - p.launch);
        const cx = lerp(p.x, px, E.inOutSine(u) * .4 + u * .6);
        const cy = lerp(p.y, yF, u * u) - 4 * p.hopH * u * (1 - u);
        const v = Math.abs(u - .35) * 1.2, st = 1 + .3 * Math.min(1, v) * Math.min(1, v);
        s = { cx, cy, sx: 1 / Math.sqrt(st), sy: st };
      } else {                                                              // landing: a squash that slowly settles
        const d = tt - p.land, q = sqz(d) * Math.exp(-d * 1.6), sy = 1 - .62 * q, sx = 1 + .95 * q;
        s = { cx: px, cy: p.floor - r * sy, sx, sy };
      }
      KIT.drawBall(ctx, s.cx, s.cy, r, s.sx, s.sy, p.colors);
    },
  });

  /* ── lockup-rule: the hairline under the word ── */
  KIT.piece('lockup-rule', {
    group: 'furniture',
    doc: 'A thin line shoots out from the middle and ends in two small coral caps.',
    defaults: { at: R.BEAT, x: 960, y: 612, half: 700, dur: .5, color: PAL.bone, cap: PAL.coral },
    params: {
      at: 'when the landing it follows happens (s)', x: 'middle of the line (x)', y: 'the line (y)',
      half: 'half the final length (px)', dur: 'how long it takes to shoot out (s)', color: 'colour of the line', cap: 'colour of the two end caps',
    },
    cues: () => [{ dt: .12, kind: 'zip', props: { dur: .5 } }],
    draw(ctx, t, p) {
      const hl = p.half * E.outExpo(prog(t, p.at + .03, p.dur));
      if (hl > 1) {
        ctx.fillStyle = rgbaHex(p.color, .8); ctx.fillRect(p.x - hl, p.y, hl * 2, 2);
        const endcap = E.outBack(prog(t, p.at + .1, .3), 2);
        ctx.fillStyle = p.cap; ctx.fillRect(p.x - hl, p.y - 6, 3 * endcap, 14); ctx.fillRect(p.x + hl - 3 * endcap, p.y - 6, 3 * endcap, 14);
      }
    },
  });

  /* ── lockup-fade: everything fades to one colour for the loop ── */
  KIT.piece('lockup-fade', {
    group: 'finish',
    doc: 'The whole frame fades to one colour, so the film can loop.',
    defaults: { at: 1.55, dur: .32, color: PAL.ink },
    params: { at: 'when the fade starts (s)', dur: 'how long it takes (s)', color: 'the colour it fades to' },
    draw(ctx, t, p, env) {
      const fo = E.inQuad(prog(t, p.at, p.dur));
      if (fo > .004) { ctx.fillStyle = rgbaHex(p.color, fo); ctx.fillRect(0, 0, env.W, env.H); }
    },
  });
})(window);
