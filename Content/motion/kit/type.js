/* type.js — type moves: Rise, Tumble, Pop, Swing, Heavyweight, Monolith.
 * (Thud is in weight.js and Punch In is in lockup.js.)
 *
 *   rise (Rise)   tumble (Tumble)   pop (Pop)   swing (Swing)   heavyweight (Heavyweight, and Monolith as an alias)
 *
 * Written from shot 2 of the showreel ("EVERY FRAME IS a DECISION"); with no params each piece draws exactly the word it drew there.
 * Each move works on a line of Latin text, letter by letter. All the text layout is in ONE function, layout(), so Farsi (words,
 * not letters, right to left; see KIT.text.units) can be plugged in there later without touching a move.
 *
 * Common params of every piece here:  text  x  y (the baseline)  size  font  color  align  at  stagger  dur
 *   font     a CSS font with {s} for the size (and {w} for the weight in Heavyweight)
 *   at       when the first letter starts; the other times are relative to it
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog, mixHex } = L;
  const BEAT = .46875, S8 = BEAT / 2;                       // one beat and one 8th note at 128 bpm (s)

  /* ── shared: font strings, text layout, one glyph ─────────────────────────────────────────────── */
  const fnt = (tpl, size, weight) => tpl.replace('{w}', weight).replace('{s}', size);

  /* THE layout function. Where each letter of a line sits: left edge xs[i], advance ws[i], total width, and the capital height
     (the height a letter turns about). Measured kerning-aware on a scratch canvas, once per font and text. */
  const meas = L.canvas(8, 8).getContext('2d'), laid = new Map();
  function layout(font, text) {
    const key = font + '\n' + text;
    let lay = laid.get(key);
    if (!lay) {
      meas.font = font;
      const m = L.chars(meas, text, 0);                     // Latin: one unit per letter. Farsi would be one unit per word here.
      lay = { xs: m.xs, ws: m.ws, total: m.total, cap: L.capHeight(meas) };
      laid.set(key, lay);
    }
    return lay;
  }
  const leftEdge = (x, total, align) => (align === 'center' ? x - total / 2 : align === 'right' ? x - total : x);
  const warmText = p => { if (typeof p.text === 'string') layout(fnt(p.font, p.size), p.text); };
  const warmKey = p => [p.font, p.size, typeof p.text === 'string' ? p.text : ''].join('|');

  /* one letter: it turns and scales about the middle of the capitals, and its baseline stays on y */
  function glyph(ctx, ch, cx, by, cap, o) {
    ctx.save();
    ctx.translate(cx + (o.dx || 0), by - cap / 2 + (o.dy || 0));
    if (o.rot) ctx.rotate(o.rot);
    ctx.scale(o.sx == null ? 1 : o.sx, o.sy == null ? 1 : o.sy);
    ctx.globalAlpha *= (o.a == null ? 1 : o.a);
    ctx.font = o.font; ctx.fillStyle = o.color; ctx.textAlign = 'center';
    ctx.fillText(ch, 0, cap / 2);
    ctx.restore();
  }

  /* the elastic ease with a bounce knob: 1 is exactly L.E.outElastic, more wobbles for longer, less settles sooner */
  const elastic = (t, k) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t / k) * Math.sin((t * 10 - .75) * (L.TAU / 3)) + 1);

  const COMMON = {
    text: 'the words (Latin letters; Farsi will move whole words)',
    x: 'where the word starts (its left edge, or its middle with align)',
    y: 'the baseline of the word',
    size: 'letter size (px)',
    font: 'CSS font, with {s} where the size goes',
    color: 'letter colour',
    align: 'which edge of the word x holds: left, center or right',
    at: 'when the first letter starts (s)',
    stagger: 'delay between one letter and the next (s)',
    dur: 'how long each letter takes (s); less is faster',
  };
  const doc = (more) => Object.assign({}, COMMON, more);

  /* ── rise: letters rise out from under a line, hidden by a mask until they pass it ── */
  KIT.piece('rise', {
    group: 'type',
    doc: 'Words rise out from behind a line, one letter after another.',
    defaults: { text: 'EVERY', x: 118, y: 300, size: 176, font: '900 {s}px "Unbounded"', color: PAL.ink, align: 'left', at: 0, stagger: .028, dur: .36, pad: 80, below: 5, maskW: 1100 },
    params: doc({ pad: 'room above the capitals inside the mask; also how far below the line the letters wait (px)', below: 'how far the mask reaches below the baseline (px)', maskW: 'width of the mask (px)' }),
    cues: () => [{ dt: 0, hit: 1, props: { drop: 1 } }],       // the flood lands on the bar line and the word rises
    warm: warmText, warmKey,
    draw(ctx, t, p) {
      const font = fnt(p.font, p.size), text = String(KIT.val(p.text, t)), y = KIT.val(p.y, t);
      const lay = layout(font, text), cap = lay.cap, x = leftEdge(KIT.val(p.x, t), lay.total, p.align);
      ctx.beginPath(); ctx.rect(x - p.pad, y - cap - p.pad, p.maskW, cap + p.pad + p.below); ctx.clip();
      for (let i = 0; i < text.length; i++) {
        const pr = E.outExpo(prog(t, p.at + i * p.stagger, p.dur));
        glyph(ctx, text[i], x + lay.xs[i] + lay.ws[i] / 2, y, cap, { dy: (1 - pr) * (cap + p.pad), font, color: p.color });
      }
    },
  });

  /* ── tumble: letters drop in from above, turning, a little oversize, overshoot the line and settle ── */
  KIT.piece('tumble', {
    group: 'type',
    doc: 'Letters drop in with a spin and one bounce.',
    defaults: { text: 'FRAME', x: 118, y: 496, size: 176, font: '900 {s}px "Unbounded"', color: PAL.ink, align: 'left', at: S8, stagger: .03, dur: .36, drop: 360, spin: -.3, grow: .25, over: 1.6, fade: 9 },
    params: doc({ drop: 'how high above the line the letters start (px)', spin: 'how far each letter is turned when it starts (radians; negative turns it back)', grow: 'how much bigger each letter starts (0.25 = a quarter bigger)', over: 'how far it overshoots the line before it settles', fade: 'how fast the letters fade in (higher is quicker)' }),
    cues: () => [{ dt: 0, kind: 'stab', props: { i: 0, amp: .6 } }],
    warm: warmText, warmKey,
    draw(ctx, t, p) {
      const font = fnt(p.font, p.size), text = String(KIT.val(p.text, t)), y = KIT.val(p.y, t);
      const lay = layout(font, text), cap = lay.cap, x = leftEdge(KIT.val(p.x, t), lay.total, p.align);
      for (let i = 0; i < text.length; i++) {
        const pr = prog(t, p.at + i * p.stagger, p.dur), e = E.outBack(pr, p.over);
        if (pr <= 0) continue;
        glyph(ctx, text[i], x + lay.xs[i] + lay.ws[i] / 2, y, cap, {
          dy: (e - 1) * p.drop, rot: (1 - e) * p.spin, sx: 1 + (1 - e) * p.grow, sy: 1 + (1 - e) * p.grow, a: clamp(pr * p.fade), font, color: p.color,
        });
      }
    },
  });

  /* ── pop: each letter springs out of nothing with an elastic overshoot ── */
  KIT.piece('pop', {
    group: 'type',
    doc: 'A short word pops in with a springy overshoot.',
    defaults: { text: 'IS', x: 118, y: 692, size: 176, font: '900 {s}px "Unbounded"', color: PAL.ink, align: 'left', at: BEAT, stagger: .035, dur: .55, bounce: 1 },
    params: doc({ bounce: 'how bouncy it is: 1 is the reel, more wobbles for longer, less settles sooner' }),
    cues: () => [{ dt: 0, hit: .45, props: { i: 1 } }],
    warm: warmText, warmKey,
    draw(ctx, t, p) {
      const font = fnt(p.font, p.size), text = String(KIT.val(p.text, t)), y = KIT.val(p.y, t);
      const lay = layout(font, text), cap = lay.cap, x = leftEdge(KIT.val(p.x, t), lay.total, p.align);
      for (let i = 0; i < text.length; i++) {
        const pr = prog(t, p.at + i * p.stagger, p.dur), s = elastic(pr, p.bounce);
        if (pr <= 0) continue;
        glyph(ctx, text[i], x + lay.xs[i] + lay.ws[i] / 2, y, cap, { sx: s, sy: s, font, color: p.color });
      }
    },
  });

  /* ── swing: one serif letter (or word) swings in from the side, tipped back, as a single piece ──
        It sits after a heavy word on the same line (`after`), turns about the middle of that line's capitals,
        and starts 0.09 s after the beat. */
  KIT.piece('swing', {
    group: 'type',
    doc: 'A serif letter or word swings in with a tilt.',
    defaults: {
      text: 'a', x: 118, y: 694, size: 285, font: 'italic 400 {s}px "Instrument Serif"', color: PAL.bone, align: 'left',
      at: BEAT + .09, dur: .6, tilt: -.9, dx: -220, over: 2.2, fade: 7,
      after: 'IS', lineFont: '900 {s}px "Unbounded"', lineSize: 176, gap: .3,
    },
    params: {
      text: 'the letter or word (it swings in as one piece)', x: 'left edge of the line the letter joins (px)', y: 'the baseline of the letter', size: 'letter size (px)',
      font: 'CSS font, with {s} where the size goes', color: 'letter colour', align: 'left | center | right: which edge of the letter sits at its place on the line',
      at: 'when it starts to swing (s)', dur: 'how long the swing takes (s)', tilt: 'how far it is tipped when it starts (radians; negative leans it back)',
      dx: 'how far to the side it starts (px; negative starts on the left)', over: 'how far it overshoots before it settles', fade: 'how fast it fades in (higher is quicker)',
      after: 'the heavy word it follows on the same line; the letter sits after it (empty = at x)', lineFont: 'CSS font of that heavy line, with {s} for its size',
      lineSize: 'size of that heavy line (px); sets the gap and the height the letter turns about', gap: 'space after that word, as a share of the line size',
    },
    warm(p) { if (p.after) layout(fnt(p.lineFont, p.lineSize), p.after); layout(fnt(p.lineFont, p.lineSize), ''); },
    warmKey: p => [p.lineFont, p.lineSize, p.after].join('|'),
    draw(ctx, t, p) {
      const pr = prog(t, p.at, p.dur), e = E.outBack(pr, p.over);
      if (pr <= 0) return;
      const line = fnt(p.lineFont, p.lineSize), text = String(KIT.val(p.text, t)), font = fnt(p.font, p.size);
      const cap = layout(line, '').cap, before = p.after ? layout(line, p.after).total : 0, gap = p.after ? p.lineSize * p.gap : 0;
      ctx.font = font; const aw = ctx.measureText(text).width;
      const half = p.align === 'center' ? 0 : p.align === 'right' ? -aw / 2 : aw / 2;
      glyph(ctx, text, KIT.val(p.x, t) + before + gap + half, KIT.val(p.y, t), cap, { dx: (1 - e) * p.dx, rot: (1 - e) * p.tilt, a: clamp(pr * p.fade), font, color: p.color });
    },
  });

  /* ── heavyweight: each letter slides in from the right while its weight sweeps from thin to black; the word's letters
        flow along as they widen. With `depth` > 0 the word also gets a 3D block on the beat: that is Monolith. ── */
  function sweepLetters(ctx, t, p, text, x) {
    const rows = []; let total = 0;
    for (let i = 0; i < text.length; i++) {
      const st = p.at + i * p.stagger;
      const ep = E.outExpo(prog(t, st, p.slideDur));
      const wgt = Math.round(lerp(p.from, p.to, E.outCubic(prog(t, st, p.dur))));
      const font = fnt(p.font, p.size, wgt);
      ctx.font = font;
      const adv = ctx.measureText(text[i]).width;
      rows.push({ ch: text[i], adv, wgt, dx: (1 - ep) * (p.slide + i * p.spread), a: clamp(prog(t, st, p.fade)), font });
      total += adv;
    }
    let cx = leftEdge(x, total, p.align);
    for (const r of rows) { r.x = cx + r.adv / 2; cx += r.adv; }
    return rows;
  }

  KIT.piece('heavyweight', {
    group: 'type',
    doc: 'A word grows from thin to black as it slides in.',
    defaults: {
      text: 'DECISION', x: 118, y: 888, size: 176, font: '{w} {s}px "Unbounded"', color: PAL.ink, align: 'left', at: S8 * 3, stagger: .011, dur: .22,
      from: 200, to: 900, slide: 620, spread: 60, slideDur: .24, fade: .05,
      depth: 0, block: BEAT * 2 - S8 * 3, blockDur: .6, dir: [.56, .83], near: PAL.bone, far: '#B7AD99', shade: 44,
    },
    params: {
      text: 'the word', x: 'where the word starts (its left edge, or its middle with align)', y: 'the baseline of the word', size: 'letter size (px)',
      font: 'CSS font; {w} is the weight and {s} the size', color: 'colour of the letters', align: 'which edge of the word x holds: left, center or right',
      at: 'when the first letter starts (s)', stagger: 'delay between one letter and the next (s)', dur: 'how long the weight takes to sweep (s); less is faster',
      from: 'starting weight (thin)', to: 'final weight (black)', slide: 'how far to the right the first letter starts (px)', spread: 'how much further out each later letter starts (px)',
      slideDur: 'how long the slide takes (s)', fade: 'how long each letter takes to fade in (s)',
      depth: 'depth of the 3D block (px); 0 = no block (that is Heavyweight, Monolith sets 36)', block: 'when the block starts to grow, after the word starts (s)', blockDur: 'how long the block takes to grow (s)',
      dir: 'where the block points: [right, down] for each px of depth', near: 'block colour next to the letters', far: 'block colour at its far end', shade: 'depth (px) over which the block fades from near to far',
    },
    cues: p => [{ dt: 0, kind: 'stab', props: { i: 2, amp: .7 } }].concat(p.depth > 0 ? [{ dt: p.block, hit: .95, props: { big: 1 } }] : []),
    warm(p) { layout(fnt(p.font, p.size, p.to), ''); },
    warmKey: p => [p.font, p.size, p.to].join('|'),
    draw(ctx, t, p) {
      const cap = layout(fnt(p.font, p.size, p.to), '').cap, y = KIT.val(p.y, t);
      const dl = sweepLetters(ctx, t, p, String(KIT.val(p.text, t)), KIT.val(p.x, t));
      const depth = p.depth * E.outElastic(prog(t, p.at + p.block, p.blockDur));
      if (depth > 1) {                                                  // the block: copies of the letters stepped away, far end first
        const steps = Math.round(depth);
        for (let k = steps; k >= 1; k--) {
          const col = mixHex(p.near, p.far, k / p.shade);
          for (const l of dl) glyph(ctx, l.ch, l.x + k * p.dir[0], y + k * p.dir[1], cap, { dx: l.dx, font: l.font, color: col, a: l.a });
        }
      }
      for (const l of dl) glyph(ctx, l.ch, l.x, y, cap, { dx: l.dx, font: l.font, color: p.color, a: l.a });
    },
  });
  KIT.alias('monolith', 'heavyweight', { depth: 36 }, 'A word gets a 3D block on the beat.');
})(window);
