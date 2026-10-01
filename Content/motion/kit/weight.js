/* weight.js — small bits of physics that make things feel real.
 *   shock-ring (Tremor)   ruler (Ruler)   thud (Thud, Dust)   ball (Squash, Hop)   heartbeat (Heartbeat)
 * Written from shot 1 of the showreel; with no params each one reproduces the reel exactly.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog, hash, mixHex, rgbaHex } = L;

  /* ── shock-ring: a ring that expands while its line thins; flatten it and it ripples along a floor ── */
  KIT.piece('shock-ring', {
    group: 'weight',
    doc: 'A ring that expands while its edge gets thinner. Flatten it and it ripples out along the floor from a landing.',
    defaults: { x: 960, y: 540, r0: 10, r1: 520, at: 0, dur: .5, width: 3, alpha: .9, flat: 0, color: PAL.coral },
    params: { x: 'centre x', y: 'centre y', r0: 'starting radius', r1: 'final radius', at: 'when it starts (s)', dur: 'how long it takes (s)', width: 'line width at the start', alpha: 'strength at the start', flat: 'squash it flat (0 = a circle, 0.12 = a ripple on the floor)', color: 'colour' },
    draw(ctx, t, p) {
      const pr = prog(t, p.at, p.dur);
      if (pr <= 0 || pr >= 1) return;
      const r = lerp(KIT.val(p.r0), KIT.val(p.r1), E.outExpo(pr));
      ctx.translate(KIT.val(p.x), KIT.val(p.y)); if (p.flat) ctx.scale(1, p.flat);
      ctx.strokeStyle = rgbaHex(p.color, p.alpha * (1 - pr)); ctx.lineWidth = p.width * (1 - pr * .6);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, L.TAU); ctx.stroke();
    },
  });
  KIT.alias('tremor', 'shock-ring', { r0: 10, r1: 520, dur: .5, flat: .12, y: 648 }, 'A flat ring ripples out along the floor from a landing.');

  /* ── ruler: a line shoots out from the middle and prints its tick marks and numbers ── */
  KIT.piece('ruler', {
    group: 'weight',
    doc: 'A line shoots out and prints its tick marks and numbers.',
    defaults: {
      x: 960, y: 648, half: 864, tick: 24, major: 5, count: 36, at: 0, dur: .55, color: PAL.bone,
      font: '500 13px "JetBrains Mono"', track: '1.5px', labelDrop: 54, label: k => String(Math.abs(k / 5 * 5) + 100).slice(1).padStart(2, '0') + 'f',
    },
    params: { x: 'where it shoots out from (x)', y: 'the line (y)', half: 'half the final length (px)', tick: 'distance between ticks (px)', major: 'a long tick every this many', count: 'ticks each side', at: 'when it starts (s)', dur: 'how long it takes (s)', color: 'colour', font: 'label font', track: 'label letter-spacing', labelDrop: 'how far below the line the labels sit', label: 'function: tick number -> label text' },
    cues: p => [{ dt: 0, kind: 'zip', props: { dur: .5 } }, { dt: .04, kind: 'ticks', props: { dur: .45 } }],
    draw(ctx, t, p) {
      const hl = p.half * E.outExpo(prog(t, p.at, p.dur));
      if (hl < 1) return;
      ctx.fillStyle = rgbaHex(p.color, .85);
      ctx.fillRect(p.x - hl, p.y, hl * 2, 2);
      ctx.font = p.font; ctx.letterSpacing = p.track; ctx.textAlign = 'center';
      for (let k = -p.count; k <= p.count; k++) {
        const x = p.x + k * p.tick;
        const reach = hl - Math.abs(x - p.x);
        if (reach <= 0) continue;
        const pop = E.outBack(clamp(reach / 110));
        const major = (k % p.major === 0);
        const hgt = (major ? 26 : 11) * pop;
        ctx.fillStyle = rgbaHex(p.color, major ? .7 : .38);
        ctx.fillRect(x - 1, p.y + 2, 2, hgt);
        if (major && pop > .5) {
          ctx.fillStyle = rgbaHex(p.color, .42 * clamp(pop));
          ctx.fillText(p.label(k), x, p.y + p.labelDrop);
        }
      }
    },
  });

  /* ── thud: letters drop onto a floor, thud, rebound once; Dust is the specks they kick up ── */
  const laid = new Map();
  function layoutWord(p, env) {
    const key = [p.text, p.width, p.floor, p.withDot, env.W].join('|');
    let lay = laid.get(key);
    if (lay) return lay;
    const c = L.canvas(8, 8).getContext('2d');
    c.font = L.fnt(900, 200);
    const m0 = L.chars(c, p.text, 0);
    const fs = Math.round(200 * p.width / m0.total);                    // the word comes out about `width` px wide
    c.font = L.fnt(900, fs);
    const m = L.chars(c, p.text, 0);
    lay = { fs, xs: m.xs, ws: m.ws, total: m.total, cap: L.capHeight(c) };
    lay.r = Math.round(fs * .125);                                       // radius of the full stop
    lay.gap = fs * .075;
    const full = m.total + lay.gap + lay.r * 2;
    lay.x0 = Math.round((env.W - (p.withDot ? full : m.total)) / 2);
    lay.px = lay.x0 + m.total + lay.gap + lay.r;                         // where the full stop sits
    lay.py = p.floor - lay.r;
    laid.set(key, lay);
    return lay;
  }
  KIT.layoutWord = layoutWord;

  KIT.piece('thud', {
    group: 'weight',
    doc: 'Letters drop in, land with a thud and bounce once. Each lands on its own beat of a quick roll that ends at "at".',
    defaults: {
      text: 'MOTION', at: 0, step: .05859375, width: 1480, floor: 648, fall: .22, drop: 900, rest: .2, withDot: true,
      color: PAL.bone, flash: PAL.coral, glyph: true, dust: true, only: null, publish: 'dot',
    },
    params: { text: 'the letters (Latin letters; Farsi words should move whole, see KIT.text)', at: 'when the LAST letter lands (s)', step: 'time between letters landing (s)', width: 'word width (px)', floor: 'the floor line (y)', fall: 'fall time (s)', drop: 'release height (px)', rest: 'how hard it rebounds (0 to 1)', withDot: 'centre the word together with a full stop', color: 'letter colour', flash: 'colour flash on landing', glyph: 'draw the letters', dust: 'draw the specks', only: 'draw just this letter index (null = all)', publish: 'name the full stop position is published under for a scene change' },
    warm(p, env) { const lay = layoutWord(p, env); if (p.publish) KIT.mark(p.publish, { x: lay.px, y: lay.py, r: lay.r }); },
    warmKey: p => [p.text, p.width, p.floor, p.withDot].join('|'),
    cues(p) { return Array.from(p.text, (_, i) => ({ dt: -p.step * (p.text.length - i), kind: 'land', props: { i } })); },
    draw(ctx, t, p, env) {
      const lay = layoutWord(p, env), n = p.text.length;
      const FALL = p.fall, DROP_H = p.drop, G = 2 * DROP_H / (FALL * FALL), V0 = G * FALL, REST = p.rest, F = p.floor;
      for (let i = 0; i < n; i++) {
        if (p.only != null && p.only !== i) continue;
        const land = p.at - p.step * (n - i);
        const rel = land - FALL, tau = t - rel;
        if (tau < 0) continue;
        let h, v, d = -1;
        if (tau < FALL) { h = DROP_H * (1 - (tau / FALL) ** 2); v = tau / FALL; }
        else {
          d = tau - FALL;
          const v1 = V0 * REST, fl = 2 * v1 / G;
          h = d < fl ? v1 * d - .5 * G * d * d : 0; v = 0;
        }
        const sq = d >= 0 ? .13 * Math.exp(-d * 20) * Math.cos(d * 44) : 0;
        const sy = d >= 0 ? 1 - sq : 1 + .12 * v * v;
        const sx = d >= 0 ? 1 + sq * .6 : 1 - .05 * v * v;
        const x = lay.x0 + lay.xs[i], w = lay.ws[i];
        if (p.glyph) {
          const fl = d >= 0 ? Math.exp(-d * 24) : 0;
          ctx.save();
          ctx.translate(x + w / 2, F - h);
          ctx.scale(sx, sy);
          ctx.fillStyle = fl > .02 ? mixHex(p.color, p.flash, fl) : p.color;
          ctx.font = L.fnt(900, lay.fs);
          ctx.fillText(p.text[i], -w / 2, 0);
          ctx.restore();
        }
        // dust off the floor
        if (p.dust && d >= 0 && d < .42) {
          const pr = d / .42;
          for (let k = 0; k < 6; k++) {
            const side = k % 2 ? 1 : -1, sp = 90 + hash(i * 17 + k, 3) * 240, lif = 14 + hash(i * 31 + k, 5) * 46;
            const px = x + w / 2 + side * (w * .3 + sp * E.outCubic(pr) * .55);
            const py = F - 3 - lif * Math.sin(pr * Math.PI) * (.4 + hash(k, i) * .6);
            ctx.fillStyle = rgbaHex(p.color, .55 * (1 - pr));
            ctx.beginPath(); ctx.arc(px, py, 3.2 * (1 - pr) + .6, 0, L.TAU); ctx.fill();
          }
        }
      }
    },
  });
  KIT.alias('dust', 'thud', { glyph: false }, 'Little specks kick up where a letter lands.');

  /* ── ball: a dot with weight. It hovers with a pulse, arcs up and falls (stretching in the air), squashes on the floor,
        hops across to a point and lands there. `phases` picks which parts are drawn. ── */
  const sqz = d => Math.exp(-d * 13) * Math.cos(d * 34);                // d = seconds since impact (>= 0)
  function drawBall(ctx, cx, cy, r, sx, sy, cols) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(sx, sy);
    const gr = ctx.createRadialGradient(-r * .35, -r * .4, r * .1, 0, 0, r * 1.05);
    gr.addColorStop(0, cols[0]); gr.addColorStop(.55, cols[1]); gr.addColorStop(1, cols[2]);
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, r, 0, L.TAU); ctx.fill();
    ctx.restore();
  }
  KIT.drawBall = drawBall;

  KIT.piece('ball', {
    group: 'weight',
    doc: 'A dot with weight: pulses, arcs up and falls stretched, squashes on the floor, hops across and lands as a full stop.',
    defaults: {
      at: 0, x: 960, y: 540, r: 34, floor: 648, apex: 300, tApex: .23, launch: .06, land: .46875, rest: .59, period: .9375,
      hopX: 1709.76748046875, hopH: 360, phases: ['pulse', 'flight', 'contact', 'hop', 'landing'],
      colors: ['#FF8A63', PAL.coral, '#E23E1B'],
    },
    params: { at: 'start of the clock the times below are on (s)', x: 'where it hovers (x)', y: 'where it hovers (y)', r: 'ball radius (px), or a function', floor: 'the floor line (y)', apex: 'height of the arc (y)', tApex: 'time of the apex', launch: 'when it leaves the hover', land: 'when it touches the floor', rest: 'when the squash is over and the hop starts', period: 'when it lands as the full stop', hopX: 'where the hop ends (x), or a function', hopH: 'height of the hop (px)', phases: 'which parts to draw: pulse, flight, contact, hop, landing', colors: 'three gloss colours, light to dark' },
    cues: p => [{ dt: 0, kind: 'pulse', props: {} }, { dt: p.launch, kind: 'blip', props: { pitch: 0, dur: .18 } }, { dt: p.land, hit: .55, props: { sub: 1 } }, { dt: p.period, hit: .85, props: { sub: 1 } }],
    draw(ctx, t, p) {
      const r = KIT.val(p.r), F = p.floor, cx0 = p.x, cy0 = p.y, tx = KIT.val(p.hopX);
      t = t - p.at;
      let s, phase;
      if (t < p.launch) {                                                  // pre-launch: hover in place with a heartbeat
        const pl = 1 + .1 * Math.exp(-t * 22) * Math.cos(t * 50);
        s = { cx: cx0, cy: cy0, sx: pl, sy: pl }; phase = 'pulse';
      } else if (t < p.land) {                                             // up leg -> apex -> down leg to the floor
        const tA = p.tApex, yA = p.apex, yF = F - r;
        let cy, v;
        if (t < tA) { const u = (t - p.launch) / (tA - p.launch); cy = lerp(cy0, yA, E.outQuad(u)); v = (1 - u) * .8; }
        else { const u = (t - tA) / (p.land - tA); cy = lerp(yA, yF, E.inQuad(u)); v = u; }
        const st = 1 + .32 * v * v;
        s = { cx: cx0, cy, sx: 1 / Math.sqrt(st), sy: st }; phase = 'flight';
      } else if (t < p.rest) {                                             // contact squash, short rest
        const d = t - p.land, q = sqz(d), sy = 1 - .55 * q, sx = 1 + .8 * q;
        s = { cx: cx0, cy: F - r * sy, sx, sy }; phase = 'contact';
      } else if (t < p.period) {                                           // the hop across to the full stop
        const u = (t - p.rest) / (p.period - p.rest);
        const cx = lerp(cx0, tx, E.inOutSine(u) * .35 + u * .65);
        const cy = (F - r) - 4 * p.hopH * u * (1 - u);
        const v = Math.abs(1 - 2 * u);
        const st = 1 + .26 * v * v;
        s = { cx, cy, sx: 1 / Math.sqrt(st), sy: st }; phase = 'hop';
      } else {                                                             // full stop landing
        const d = t - p.period, q = sqz(d) * Math.exp(-d * 2), sy = 1 - .6 * q, sx = 1 + .9 * q;
        s = { cx: tx, cy: F - r * sy, sx, sy }; phase = 'landing';
      }
      if (p.phases.indexOf(phase) < 0) return;
      drawBall(ctx, s.cx, s.cy, r, s.sx, s.sy, p.colors);
    },
  });
  KIT.alias('squash', 'ball', { phases: ['flight', 'contact'] }, 'A ball stretches in the air and squashes when it lands.');
  KIT.alias('hop', 'ball', { phases: ['hop', 'landing'] }, 'The ball hops across the word and lands as the full stop.');

  /* ── heartbeat: a dot that pulses with a ring, like a pulse ── */
  KIT.piece('heartbeat', {
    group: 'weight',
    doc: 'A dot pulses with a ring, like a pulse.',
    defaults: { at: 0, x: 960, y: 540, r: 34, ring: 110, dur: .55, launch: .06, color: PAL.coral, colors: ['#FF8A63', PAL.coral, '#E23E1B'] },
    params: { at: 'start (s)', x: 'centre x', y: 'centre y', r: 'dot radius', ring: 'how far the ring grows beyond the dot (px)', dur: 'how long the ring takes (s)', launch: 'how long the dot pulses before it would move off', color: 'ring colour', colors: 'dot gloss colours' },
    cues: p => [{ dt: 0, kind: 'pulse', props: {} }, { dt: p.launch, kind: 'blip', props: { pitch: 0, dur: .18 } }],
    draw(ctx, t, p) {
      KIT.draw('shock-ring', ctx, t, { x: p.x, y: p.y, r0: KIT.val(p.r), r1: KIT.val(p.r) + p.ring, at: p.at, dur: p.dur, color: p.color });
      const tt = t - p.at;
      if (tt < 0 || tt >= p.launch) return;
      const pl = 1 + .1 * Math.exp(-tt * 22) * Math.cos(tt * 50);
      KIT.drawBall(ctx, p.x, p.y, KIT.val(p.r), pl, pl, p.colors);
    },
  });
})(window);
