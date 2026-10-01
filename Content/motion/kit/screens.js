/* screens.js — cards, charts and controls that move like a real app.
 *   bento (Bento)               a grid of cards springs in one after another; each card holds one of the graphics below
 *   pulse-line (Pulse Line)     a line chart that draws itself, then a tooltip pops
 *   ring-counter (Ring Counter) a donut that counts up to a number
 *   switch (Switch)             a toggle flips with a spring
 *   scrub (Scrub)               a slider drags and its number follows
 *   skyline (Skyline)           bars grow with a spring and the last one lights up
 *   odometer (Odometer)         a big number counts up next to a live dot
 *   lifeline (Lifeline)         a heartbeat line scrolls under a number
 *   tick-list (Tick List)       checks draw themselves one by one
 *   pointer (Pointer)           a cursor moves, presses and sends a ripple out of every click
 * Written from shot 6 of the showreel; with no params each one reproduces the reel exactly.
 *
 * The eight graphics each draw at their OWN origin (the top left of their card) at their design size (the w and h params), so
 * a scene can place any of them with KIT.fit, in a 16:9 frame or a 9:16 one. They draw no card: the bento draws the white card,
 * its shadow and its spring, then calls each graphic inside it. A graphic's time `t` is the clock the caller gives it. In the
 * bento the clock of most graphics is the card's own (it starts when the card does); the three that are timed to the pointer
 * (switch, scrub, tick-list) are on the scene's clock. `now` is the scene's clock, for the parts that run free (the live dot, the
 * scrolling line).
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, prog, spring, hex, mixC, rgb, rgbaHex } = L;
  const INK = PAL.ink, WHITE = '#FFFFFF', GREY = '#EDEAE3', MUTE = 'rgba(11,11,16,.5)';

  /* the small tracked label every card wears */
  const mono = (ctx, size = 14, ls = 2.4) => { ctx.font = `500 ${size}px "JetBrains Mono"`; ctx.letterSpacing = ls + 'px'; };
  const label = (ctx, s, x, y, a = 1, align = 'left') => { mono(ctx); ctx.textAlign = align; ctx.fillStyle = `rgba(11,11,16,${.52 * a})`; ctx.fillText(s, x, y); ctx.letterSpacing = '0px'; };

  /* A canvas quirk the reel's pixels depend on. The reel drew its cards over a gradient fill of the whole frame, and after any
     gradient fill Chrome draws the soft shadows that follow, in the same canvas state, a little tighter and lighter (about 2% less
     shadow, a few levels of colour); a plain colour fill does not do it. KIT.draw drops the state when a piece ends, so a piece with
     soft shadows takes it up again itself with a gradient fill that draws nothing. It lasts until the piece ends. */
  function afterGradient(ctx) {
    const a = ctx.globalAlpha, f = ctx.fillStyle, g = ctx.createLinearGradient(0, 0, 1, 0);
    g.addColorStop(0, '#000000'); g.addColorStop(1, '#FFFFFF');
    ctx.globalAlpha = 0; ctx.fillStyle = g; ctx.fillRect(0, 0, 1, 1); ctx.globalAlpha = a; ctx.fillStyle = f;
  }

  /* ── pulse-line: a line chart that draws itself ── */
  /* a smooth curve through the values (Catmull-Rom, 30 steps a segment) and the points it passes through */
  function curvePts(data, x0, y0, w, h) {
    const P = data.map((v, i) => [x0 + w * i / (data.length - 1), y0 + h * (1 - v)]);
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      for (let s = 0; s < 30; s++) {
        const u = s / 30, a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
        out.push([a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0], a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1]]);
      }
    }
    out.push(P[P.length - 1]);
    return { out, P };
  }

  KIT.piece('pulse-line', {
    group: 'screens',
    doc: 'A line chart draws itself, a dot pops on every point, the day names fade in and a tooltip pops on the last point.',
    defaults: {
      at: 0, w: 800, h: 440, title: 'VELOCITY', data: [.22, .38, .3, .55, .5, .78, .94],
      days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], tooltip: '↑ 248%', color: PAL.cobalt, dur: .62,
    },
    params: {
      at: 'when the chart starts (s)', w: 'design width (px)', h: 'design height (px)',
      title: 'the small label at the top left', data: 'the values, each from 0 to 1, one dot for each',
      days: 'the names under the dots, one for each value', tooltip: 'the words in the tooltip on the last dot',
      color: 'colour of the line, the dots and the fill under the line', dur: 'how long the line takes to draw (s)',
    },
    cues: () => [{ dt: .04, kind: 'sweep', props: { dur: .5, soft: 1 } }],
    draw(ctx, t, p) {
      const T = t - p.at, w = p.w;
      label(ctx, p.title, 40, 56);
      const gx = 44, gy = 130, gw = w - 88, gh = 230;
      ctx.strokeStyle = 'rgba(11,11,16,.07)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(gx, gy + gh * i / 3); ctx.lineTo(gx + gw, gy + gh * i / 3); ctx.stroke(); }
      const { out, P } = curvePts(p.data, gx, gy, gw, gh);
      const pr = E.outCubic(prog(T, .04, p.dur)), n = Math.floor(pr * (out.length - 1));
      if (n > 1) {
        const f = ctx.createLinearGradient(0, gy, 0, gy + gh); f.addColorStop(0, rgbaHex(p.color, .22)); f.addColorStop(1, rgbaHex(p.color, 0));
        ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(out[0][0], gy + gh); for (let i = 0; i <= n; i++) ctx.lineTo(out[i][0], out[i][1]); ctx.lineTo(out[n][0], gy + gh); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = p.color; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); for (let i = 0; i <= n; i++) i ? ctx.lineTo(out[i][0], out[i][1]) : ctx.moveTo(out[i][0], out[i][1]); ctx.stroke();
      }
      P.forEach((pt, i) => {
        const dp = E.outBack(prog(T, .04 + (i / (P.length - 1)) * .5, .25), 2.4); if (dp <= 0) return;
        ctx.fillStyle = WHITE; ctx.strokeStyle = p.color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(pt[0], pt[1], 8.5 * dp, 0, L.TAU); ctx.fill(); ctx.stroke();
      });
      p.days.forEach((d, i) => label(ctx, d, gx + gw * i / (p.days.length - 1), gy + gh + 44, clamp((T - .1 - i * .03) * 6), 'center'));
      // end-point pulse + tooltip
      const tp = spring(T - .6, 3, .5);
      if (tp > 0) {
        const ex = P[P.length - 1][0], ey = P[P.length - 1][1], pulse = (T * 1.6) % 1;
        ctx.strokeStyle = rgbaHex(p.color, .4 * (1 - pulse)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(ex, ey, 14 + pulse * 26, 0, L.TAU); ctx.stroke();
        ctx.save(); ctx.translate(ex - 46, ey - 62 + (1 - tp) * 24); ctx.scale(tp, tp);
        ctx.fillStyle = INK; L.roundedRect(ctx, -62, -26, 124, 52, 26); ctx.fill();
        ctx.beginPath(); ctx.moveTo(38, 26); ctx.lineTo(46, 36); ctx.lineTo(54, 26); ctx.fill();
        ctx.fillStyle = PAL.bone; ctx.font = '700 24px "Inter Tight"'; ctx.textAlign = 'center'; ctx.fillText(p.tooltip, 0, 9);
        ctx.restore();
      }
    },
  });

  /* ── ring-counter: a donut that counts up to a number ── */
  KIT.piece('ring-counter', {
    group: 'screens',
    doc: 'A ring fills up while the number in the middle counts up to its target.',
    defaults: { at: 0, w: 360, h: 440, title: 'FOCUS', caption: 'ON TARGET', unit: '%', target: 87, color: PAL.cobalt, dur: .8 },
    params: {
      at: 'when the count starts (s)', w: 'design width (px)', h: 'design height (px)',
      title: 'the small label at the top left', caption: 'the small label under the ring', unit: 'the sign next to the number',
      target: 'the number it counts up to (0 to 100)', color: 'colour of the ring', dur: 'how long the count takes (s)',
    },
    draw(ctx, t, p) {
      const T = t - p.at;
      label(ctx, p.title, 36, 56);
      const cx = p.w / 2, cy = 252, r = 112, v = (p.target / 100) * E.outExpo(prog(T, .06, p.dur));
      ctx.lineWidth = 28; ctx.lineCap = 'round';
      ctx.strokeStyle = GREY; ctx.beginPath(); ctx.arc(cx, cy, r, 0, L.TAU); ctx.stroke();
      if (v > .003) { ctx.strokeStyle = p.color; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + L.TAU * v); ctx.stroke(); }
      ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.font = '700 84px "Unbounded"'; ctx.fillText(String(Math.round(v * 100)), cx - 10, cy + 30);
      ctx.font = '500 30px "Unbounded"'; ctx.fillStyle = MUTE; ctx.fillText(p.unit, cx + 68, cy + 6);
      label(ctx, p.caption, cx, 410, clamp((T - .3) * 5), 'center');
    },
  });

  /* ── switch: a toggle that flips with a spring ── */
  KIT.piece('switch', {
    group: 'screens',
    doc: 'A toggle flips with a spring: the knob slides across, the track changes colour and the word changes from OFF to ON.',
    defaults: { at: .66, w: 460, h: 200, label: 'MOTION BLUR', words: ['OFF', 'ON'], onColor: PAL.coral, offColor: '#D9D5CC' },
    params: {
      at: 'when it flips (s)', w: 'design width (px)', h: 'design height (px)',
      label: 'the small label at the top left', words: 'the two words, off first and on second',
      onColor: 'colour of the track when it is on', offColor: 'colour of the track when it is off',
    },
    draw(ctx, t, p) {
      afterGradient(ctx);
      label(ctx, p.label, 36, 56);
      const on = spring(t - p.at, 2.8, .5), kx = lerp(46, 126, on);
      ctx.fillStyle = rgb(mixC(hex(p.offColor), hex(p.onColor), clamp(on))); L.roundedRect(ctx, 28 + 200, 92, 156, 80, 40); ctx.fill();
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 4;
      ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(228 + kx - 4, 132, 29 * (1 + .06 * Math.sin(clamp(on) * Math.PI)), 0, L.TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = INK; ctx.font = '700 64px "Unbounded"'; ctx.textAlign = 'left';
      ctx.fillText(on > .5 ? p.words[1] : p.words[0], 36, 156);
    },
  });

  /* ── scrub: a slider that drags, with its number following ── */
  KIT.piece('scrub', {
    group: 'screens',
    doc: 'A slider drags from one value to another and the big number follows the knob.',
    defaults: {
      at: .94, w: 460, h: 200, title: 'EASE', range: [0, 1], from: .08, end: .62, dur: .26,
      grab: [.92, 1.2], grabSize: 1.18, ticks: ['0', '.5', '1'], decimals: 2,
    },
    params: {
      at: 'when the drag starts (s)', w: 'design width (px)', h: 'design height (px)',
      title: 'the small label at the top left', range: 'the lowest and highest value of the slider',
      from: 'the value the knob starts on', end: 'the value the knob ends on', dur: 'how long the drag takes (s)',
      grab: 'the two times between which the knob looks grabbed (s)', grabSize: 'how much bigger the knob looks while it is grabbed',
      ticks: 'the labels under the track, spread evenly from left to right', decimals: 'digits after the point in the big number',
    },
    cues: p => [{ dt: 0, kind: 'slide', props: { dur: p.dur } }],
    draw(ctx, t, p) {
      afterGradient(ctx);
      const w = p.w, sv = p.from + (p.end - p.from) * E.inOutCubic(prog(t, p.at, p.dur));
      const fr = (sv - p.range[0]) / (p.range[1] - p.range[0]);
      label(ctx, p.title, 36, 56);
      ctx.fillStyle = INK; ctx.font = '700 40px "Unbounded"'; ctx.textAlign = 'right'; ctx.fillText(sv.toFixed(p.decimals), w - 36, 62);
      const x0 = 50, x1 = w - 50, y = 138;
      ctx.fillStyle = GREY; L.roundedRect(ctx, x0, y - 6, x1 - x0, 12, 6); ctx.fill();
      ctx.fillStyle = INK; L.roundedRect(ctx, x0, y - 6, (x1 - x0) * fr, 12, 6); ctx.fill();
      const kx = x0 + (x1 - x0) * fr, grab = t > p.grab[0] && t < p.grab[1] ? p.grabSize : 1;
      ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 5;
      ctx.fillStyle = WHITE; ctx.beginPath(); ctx.arc(kx, y, 22 * grab, 0, L.TAU); ctx.fill(); ctx.restore();
      ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(kx, y, 22 * grab, 0, L.TAU); ctx.stroke();
      p.ticks.forEach((s, i) => label(ctx, s, x0 + (x1 - x0) * i / (p.ticks.length - 1), y + 52, 1, i === 0 ? 'left' : i === p.ticks.length - 1 ? 'right' : 'center'));
    },
  });

  /* ── skyline: bars that grow with a spring ── */
  KIT.piece('skyline', {
    group: 'screens',
    doc: 'Bars grow one after another with a spring, and the last bar is lit in a second colour.',
    defaults: { at: 0, w: 560, h: 360, title: 'OUTPUT', values: [.4, .66, .5, .86, .7, 1], height: 200, color: INK, highlight: PAL.coral },
    params: {
      at: 'when the first bar starts to grow (s)', w: 'design width (px)', h: 'design height (px)',
      title: 'the small label at the top left', values: 'the heights of the bars, each from 0 to 1',
      height: 'height of a full bar (px)', color: 'colour of the bars', highlight: 'colour of the last bar',
    },
    draw(ctx, t, p) {
      const T = t - p.at, w = p.w, h = p.h;
      label(ctx, p.title, 36, 56);
      const vals = p.values, n = vals.length, bw = 52, gap = (w - 72 - bw * n) / (n - 1), base = h - 56;
      vals.forEach((v, i) => {
        const sp = spring(T - .1 - i * .05, 2.6, .5), bh = p.height * v * Math.max(0, sp);
        ctx.fillStyle = i === n - 1 ? p.highlight : p.color; L.roundedRect(ctx, 36 + i * (bw + gap), base - bh, bw, Math.max(0, bh), [14, 14, 6, 6]); ctx.fill();
      });
      ctx.fillStyle = 'rgba(11,11,16,.12)'; ctx.fillRect(36, base + 8, w - 72, 2);
    },
  });

  /* ── odometer: a big number that counts up beside a live dot ── */
  KIT.piece('odometer', {
    group: 'screens',
    doc: 'A big number counts up next to a small word, with a pulsing live dot and a LIVE tag in the corner.',
    defaults: {
      at: 0, now: null, w: 600, h: 360, value: 60, unit: 'fps', tag: 'LIVE', size: 188,
      color: PAL.bone, unitColor: PAL.lilac, dotColor: PAL.mint, dur: .55,
    },
    params: {
      at: 'when the count starts (s)', now: 'the clock for the pulsing dot, if it is not the piece\'s own (null = the same clock)',
      w: 'design width (px)', h: 'design height (px)', value: 'the number it counts up to', unit: 'the small word after the number',
      tag: 'the small tag next to the live dot', size: 'size of the big number (px)', color: 'colour of the number',
      unitColor: 'colour of the small word', dotColor: 'colour of the live dot and its glow', dur: 'how long the count takes (s)',
    },
    draw(ctx, t, p) {
      const T = t - p.at, live = p.now == null ? T : p.now, text = String(p.value);
      const n = Math.round(p.value * E.outExpo(prog(T, .1, p.dur)));
      ctx.fillStyle = p.color; ctx.font = `900 ${p.size}px "Unbounded"`; ctx.textAlign = 'left'; ctx.fillText(String(n).padStart(text.length, '0'), 36, 226);
      const nw = ctx.measureText(text).width;
      ctx.font = 'italic 400 70px "Instrument Serif"'; ctx.fillStyle = p.unitColor; ctx.fillText(p.unit, 36 + nw + 18, 226);
      const pl = .5 + .5 * Math.sin(live * 7);
      L.glow(ctx, 58, 56, 40, p.dotColor, .5 * pl);
      ctx.fillStyle = p.dotColor; ctx.beginPath(); ctx.arc(58, 56, 8, 0, L.TAU); ctx.fill();
      mono(ctx); ctx.fillStyle = 'rgba(242,238,229,.7)'; ctx.textAlign = 'left'; ctx.fillText(p.tag, 78, 62); ctx.letterSpacing = '0px';
    },
  });

  /* ── lifeline: a heartbeat line that draws across, then keeps scrolling ── */
  KIT.piece('lifeline', {
    group: 'screens',
    doc: 'A heartbeat line draws itself across the card and then keeps scrolling, like a monitor.',
    defaults: { at: 0, now: null, w: 600, h: 360, y: 300, amp: 30, speed: 1.6, color: '#FFFFFF', dur: .4 },
    params: {
      at: 'when the line starts to draw (s)', now: 'the clock for the scrolling, if it is not the piece\'s own (null = the same clock)',
      w: 'design width (px)', h: 'design height (px)', y: 'the middle line of the beat (y)', amp: 'how tall the beat is (px)',
      speed: 'how fast the line scrolls', color: 'colour of the line', dur: 'how long the line takes to draw across (s)',
    },
    draw(ctx, t, p) {
      const T = t - p.at, live = p.now == null ? T : p.now;
      const y0 = p.y, amp = p.amp, x0 = 36, x1 = p.w - 36;
      ctx.strokeStyle = rgbaHex(p.color, .9); ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath();
      const draw = Math.min(1, Math.max(0, (T - .15) / p.dur));
      for (let i = 0; i <= 160 * draw; i++) {
        const u = i / 160, ph = ((u * 3.2 - live * p.speed) % 1 + 1) % 1;
        const v = Math.exp(-Math.pow((ph - .5) * 26, 2)) * 1.0 - .28 * Math.exp(-Math.pow((ph - .58) * 22, 2)) + .14 * Math.exp(-Math.pow((ph - .3) * 16, 2));
        const X = x0 + (x1 - x0) * u, Y = y0 - v * amp * 1.6;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
    },
  });

  /* ── tick-list: a checklist that ticks itself, one row after another ── */
  KIT.piece('tick-list', {
    group: 'screens',
    doc: 'A checklist ticks itself: each disc fills and its check mark draws, one row after another.',
    defaults: { at: 1.34, w: 460, h: 360, step: .08, title: 'SHIPPED', items: ['Ease', 'Stagger', 'Overshoot'], color: INK },
    params: {
      at: 'when the first tick starts (s)', w: 'design width (px)', h: 'design height (px)',
      step: 'time between one tick and the next (s)', title: 'the small label at the top left',
      items: 'the words of the list, one row each', color: 'colour of a ticked disc and its words',
    },
    cues: p => p.items.map((_, i) => ({ dt: p.step * (i + 1), kind: 'tick', props: { i } })),
    draw(ctx, t, p) {
      label(ctx, p.title, 36, 56);
      p.items.forEach((s, i) => {
        const y = 118 + i * 78, cp = prog(t, p.at + i * p.step, .22), fill = E.outBack(cp, 2);
        ctx.fillStyle = cp > 0 ? p.color : GREY; ctx.beginPath(); ctx.arc(66, y + 20, 26 * (cp > 0 ? clamp(fill, 0, 1.15) : 1), 0, L.TAU); ctx.fill();
        if (cp > 0) {
          ctx.strokeStyle = WHITE; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          const q = E.outCubic(cp); ctx.beginPath(); ctx.moveTo(54, y + 21); ctx.lineTo(54 + 9 * Math.min(1, q * 2), y + 21 + 9 * Math.min(1, q * 2));
          if (q > .5) ctx.lineTo(66 + 14 * (q - .5) * 2, y + 30 - 24 * (q - .5) * 2); ctx.stroke();
        }
        ctx.fillStyle = cp > 0 ? p.color : 'rgba(11,11,16,.62)'; ctx.font = '600 32px "Inter Tight"'; ctx.textAlign = 'left'; ctx.fillText(s, 114, y + 32);
      });
    },
  });

  /* ── pointer: the cursor, with its press and the ripple of every click ── */
  KIT.piece('pointer', {
    group: 'screens',
    doc: 'A cursor glides along a path, shrinks a little while it presses, and sends a ripple out of every click.',
    defaults: {
      at: 0,
      path: [[.2, 1960, 1060], [.62, 1700, 252], [.76, 1702, 254], [.9, 1432, 500], [1.2, 1624, 500], [1.34, 1418, 740], [1.46, 1422, 742], [1.86, 2000, 1000]],
      press: [[.66, .74], [.92, 1.2], [1.34, 1.42]],
      clicks: [{ at: .66, x: 1700, y: 252 }, { at: 1.34, x: 1418, y: 740 }],
      scale: 1.75, pressScale: 1.5, ripple: .45, color: INK, outline: WHITE,
    },
    params: {
      at: 'when the clock of the path starts (s)',
      path: 'where the cursor goes: a list of [time, x, y] stops, each reached with an ease; before the first time it is hidden',
      press: 'the times between which the cursor looks pressed: a list of [from, to]',
      clicks: 'what it clicks: a list of { at, x, y }, one ripple (and one click sound) for each',
      scale: 'size of the cursor', pressScale: 'size of the cursor while it presses', ripple: 'how long a ripple lasts (s)',
      color: 'colour of the cursor and the ripples', outline: 'colour of the thin line around the cursor',
    },
    cues: p => p.clicks.map((c, i) => ({ dt: c.at, kind: 'click', props: { i } })),
    draw(ctx, t, p) {
      afterGradient(ctx);
      const T = t - p.at, WAY = p.path;
      let x = WAY[0][1], y = WAY[0][2];
      for (let i = 0; i < WAY.length - 1; i++) {
        const a = WAY[i], b = WAY[i + 1];
        if (T >= a[0] && T < b[0]) { const u = E.inOutCubic((T - a[0]) / (b[0] - a[0])); x = lerp(a[1], b[1], u); y = lerp(a[2], b[2], u); }
        else if (T >= b[0] && i === WAY.length - 2) { x = b[1]; y = b[2]; }
      }
      /* click ripples, under the cursor */
      for (const ck of p.clicks) {
        const rp = prog(T, ck.at, p.ripple); if (rp > 0 && rp < 1) {
          ctx.strokeStyle = rgbaHex(p.color, .45 * (1 - rp)); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ck.x, ck.y, 14 + 52 * E.outCubic(rp), 0, L.TAU); ctx.stroke();
        }
      }
      if (T < WAY[0][0]) return;
      const press = p.press.some(w => T > w[0] && T < w[1]);
      ctx.save(); ctx.translate(x, y); const s = press ? p.pressScale : p.scale; ctx.scale(s, s);
      ctx.shadowColor = 'rgba(0,0,0,.28)'; ctx.shadowBlur = 10; ctx.shadowOffsetY = 5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 27); ctx.lineTo(6.5, 21); ctx.lineTo(11, 31); ctx.lineTo(15.5, 29); ctx.lineTo(11, 19.5); ctx.lineTo(19, 19.5); ctx.closePath();
      ctx.fillStyle = p.color; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.strokeStyle = p.outline; ctx.lineWidth = 2.4; ctx.lineJoin = 'round'; ctx.stroke();
      ctx.restore();
    },
  });

  /* ── bento: the cards ── */
  /* The reel's seven cards, A to G. delay = when the card starts to move (s, negative = before the scene start);
     clock 'scene' = the graphic is timed to the scene (the pointer clicks it), not to its own card. */
  const CARDS = [
    { id: 'A', x: 110, y: 120, w: 800, h: 440, delay: -.16, content: [{ piece: 'pulse-line' }] },
    { id: 'B', x: 950, y: 120, w: 360, h: 440, delay: -.12, content: [{ piece: 'ring-counter' }] },
    { id: 'C', x: 1350, y: 120, w: 460, h: 200, delay: -.09, content: [{ piece: 'switch', clock: 'scene' }] },
    { id: 'D', x: 1350, y: 360, w: 460, h: 200, delay: -.06, content: [{ piece: 'scrub', clock: 'scene' }] },
    { id: 'E', x: 110, y: 600, w: 560, h: 360, delay: -.03, content: [{ piece: 'skyline' }] },
    { id: 'F', x: 710, y: 600, w: 600, h: 360, delay: 0, fill: PAL.cobalt, content: [{ piece: 'odometer' }, { piece: 'lifeline' }] },
    { id: 'G', x: 1350, y: 600, w: 460, h: 360, delay: .03, content: [{ piece: 'tick-list', clock: 'scene' }] },
  ];

  /* `order` hands the delays out again: the first id gets the earliest delay, and so on */
  function arranged(p) {
    if (!p.order) return p.cards;
    const delays = p.cards.map(c => c.delay).sort((a, b) => a - b);
    return p.cards.map(c => { const i = p.order.indexOf(c.id); return i < 0 ? c : Object.assign({}, c, { delay: delays[i] }); });
  }

  KIT.piece('bento', {
    group: 'screens',
    doc: 'A grid of white cards springs in one after another, each with a small graphic inside it.',
    defaults: {
      at: 0, cards: CARDS, order: null, spring: [2.9, .56], lag: .12, from: .86, rise: 80, wobble: 2.5, radius: 34,
      fill: WHITE, shadow: 'rgba(28,28,60,.13)', blur: 56, drop: 22, hit: .7,
    },
    params: {
      at: 'when the scene clock of the cards starts (s)',
      cards: 'the cards: a list of { id, x, y, w, h, delay, fill, content: [{ piece, params, clock }] }; delay is when the card starts to move (s), content is what is drawn inside, and clock is "card" (its time starts when the card does) or "scene"',
      order: 'the order the cards arrive in, as a list of card ids (null = each card keeps its own delay)',
      spring: 'how springy the cards are: [speed in Hz, damping]; a lower damping wobbles more',
      lag: 'how long after a card starts to move its content starts (s)', from: 'how small a card starts (1 = full size)',
      rise: 'how far below its place a card starts (px)', wobble: 'how far a settled card keeps floating up and down (px)',
      radius: 'corner radius of a card (px)', fill: 'colour of a card (a card can set its own)',
      shadow: 'colour of the card shadow', blur: 'how soft the card shadow is (px)', drop: 'how far the shadow falls (px)',
      hit: 'how hard the first card lands (shakes the camera, 0 = no thump)',
    },
    cues(p) {
      const cards = arranged(p), out = [];
      if (p.hit) out.push({ dt: 0, hit: p.hit, props: { flip: 1 } });
      cards.forEach((c, i) => out.push({ dt: c.delay, kind: 'ui', props: { i } }));
      /* the sounds of the graphics inside, moved onto the scene's clock */
      for (const c of cards) for (const it of c.content) {
        const off = (it.clock === 'scene' ? 0 : c.delay + p.lag) + (KIT.resolve(it.piece, it.params).p.at || 0);
        for (const k of KIT.cueList(it.piece, Object.assign({ w: c.w, h: c.h }, it.params))) out.push(Object.assign({}, k, { dt: off + k.dt }));
      }
      return out;
    },
    draw(ctx, t, p) {
      afterGradient(ctx);
      const T = t - p.at, tt = Math.max(0, T);
      for (const c of arranged(p)) {
        const sp = spring(T - c.delay, p.spring[0], p.spring[1]);
        if (sp <= 0) continue;
        const wob = Math.sin(T * 1.3 + c.x * .01) * p.wobble;
        ctx.save();
        ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + (1 - sp) * p.rise + wob); ctx.scale(lerp(p.from, 1, sp), lerp(p.from, 1, sp));
        ctx.translate(-c.w / 2, -c.h / 2);
        ctx.globalAlpha = clamp(sp * 3);
        ctx.shadowColor = p.shadow; ctx.shadowBlur = p.blur; ctx.shadowOffsetY = p.drop;
        ctx.fillStyle = c.fill || p.fill; L.roundedRect(ctx, 0, 0, c.w, c.h, p.radius); ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.save(); L.roundedRect(ctx, 0, 0, c.w, c.h, p.radius); ctx.clip();
        for (const it of c.content) KIT.draw(it.piece, ctx, it.clock === 'scene' ? tt : T - c.delay - p.lag, Object.assign({ w: c.w, h: c.h, now: tt }, it.params));
        ctx.restore();
        ctx.restore();
      }
    },
  });
})(window);
