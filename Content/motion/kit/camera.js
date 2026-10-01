/* camera.js — a camera that moves over a picture or a clip: Camera (push in, pull out, drift, there and back) and the Plate it moves over.
 *
 *   KIT.draw('push-in', ctx, t, { content: { piece: 'plate', params: { src: '/court-sessions.jpg' } } })
 *
 * A move changes three things: zoom (1 = the whole frame), dx and dy (how far the camera has slid from the middle, in pixels).
 * Draw the footage inside the camera and the graphics outside it, so the footage moves and the graphics stay put.
 *
 * Footage: the test browser cannot play H.264, so a clip is turned into a numbered run of pictures with ffmpeg and loaded with
 * KIT.media.load(url). Until real footage is given, Plate draws a STAND-IN: the court photo with a head-and-shoulders shape on it.
 * Every move needs a reason (a new point, emphasis, a return). About one every five seconds at most (INGREDIENTS.md).
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { E, clamp, lerp, prog } = L;
  const col = (c, a) => { const v = KIT.role(c); return a == null || a >= 1 ? v : L.rgbaHex(/^#/.test(v) ? v : '#FFFFFF', a); };

  /* ── pictures loaded before the first frame ── */
  KIT.media = { img: Object.create(null) };
  KIT.media.load = url => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { const done = () => { KIT.media.img[url] = im; res(im); }; (im.decode ? im.decode().then(done, done) : done()); };
    im.onerror = () => rej(new Error('kit: could not load ' + url));
    im.src = url;
  });

  /* ═══════════════ Plate ═══════════════ */
  KIT.piece('plate', {
    group: 'camera',
    doc: 'A picture or a frame of footage laid across the frame, with a dark scrim over it. With nothing given it draws a stand-in.',
    defaults: { src: '/court-sessions.jpg', scrim: .55, stand: true, tint: 'rgba(8,38,27,.9)', x: 0, y: 0, w: null, h: null, label: 'YOUR FOOTAGE' },
    params: { src: 'the picture (a path the page can load), or the name of a loaded frame', scrim: 'how dark the scrim over it is (0 to 1)', stand: 'draw the stand-in head and shoulders when the picture is the court photo', tint: 'colour of the scrim', x: 'left edge (px)', y: 'top edge (px)', w: 'width (null = the frame)', h: 'height (null = the frame)', label: 'the small label on the stand-in (null = none)' },
    draw(ctx, t, p, env) {
      const W = p.w || env.W, H = p.h || env.H, im = KIT.media.img[p.src];
      ctx.save(); ctx.translate(p.x, p.y); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
      if (im) {                                                                                     // cover-fit the picture
        const s = Math.max(W / im.width, H / im.height), w = im.width * s, h = im.height * s; ctx.drawImage(im, (W - w) / 2, (H - h) / 2, w, h);
      } else { const gr = ctx.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#26362D'); gr.addColorStop(1, '#101713'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
      const sc = ctx.createLinearGradient(0, H, 0, 0); sc.addColorStop(0, L.rgbaHex('#08261B', .94 * p.scrim / .55)); sc.addColorStop(.56, L.rgbaHex('#08261B', .18 * p.scrim / .55)); sc.addColorStop(1, L.rgbaHex('#08261B', .58 * p.scrim / .55));
      ctx.fillStyle = sc; ctx.fillRect(0, 0, W, H);
      if (p.stand) {                                                                                // a head-and-shoulders shape where a speaker would be
        const cx = W / 2, hy = H * .40, hr = Math.min(W, H) * .12, by = H * .8;
        const gl = ctx.createRadialGradient(cx, hy, 10, cx, hy, hr * 3.6); gl.addColorStop(0, 'rgba(242,238,229,.10)'); gl.addColorStop(1, 'rgba(242,238,229,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(8,12,10,.92)';
        ctx.beginPath(); ctx.ellipse(cx, hy, hr * .84, hr * 1.04, 0, 0, Math.PI * 2); ctx.fill();                                                    // head
        ctx.beginPath(); ctx.moveTo(cx - hr * .42, hy + hr * .8); ctx.lineTo(cx + hr * .42, hy + hr * .8); ctx.lineTo(cx + hr * .7, hy + hr * 1.6); ctx.lineTo(cx - hr * .7, hy + hr * 1.6); ctx.closePath(); ctx.fill();   // neck
        ctx.beginPath(); ctx.moveTo(cx - hr * 2.9, by);                                                                                               // shoulders
        ctx.bezierCurveTo(cx - hr * 2.9, hy + hr * 2.4, cx - hr * 1.9, hy + hr * 1.85, cx - hr * .7, hy + hr * 1.5); ctx.lineTo(cx + hr * .7, hy + hr * 1.5);
        ctx.bezierCurveTo(cx + hr * 1.9, hy + hr * 1.85, cx + hr * 2.9, hy + hr * 2.4, cx + hr * 2.9, by); ctx.closePath(); ctx.fill();
        if (p.label) { ctx.font = KIT.face('mono', Math.round(W * .028), 700); ctx.letterSpacing = '4px'; ctx.fillStyle = 'rgba(242,238,229,.5)'; ctx.textAlign = 'center'; ctx.fillText(p.label, cx, by + H * .045); }
      }
      ctx.restore();
    },
  });

  /* ═══════════════ Camera ═══════════════ */
  KIT.piece('camera', {
    group: 'camera',
    doc: 'A camera move over whatever is drawn inside it: push in, pull out, drift to a new framing, or go and come back.',
    defaults: { content: null, moves: [{ at: .4, dur: 1.5, zoom: 1.3 }], start: { zoom: 1, dx: 0, dy: 0 }, ease: 'inOutCubic', at: 0, keepInside: true },
    params: {
      content: 'what the camera films: { piece, params } or a function (ctx, t, env). Null = the stand-in plate', moves: 'a list of { at: seconds, dur, zoom?, dx?, dy?, ease? }: each goes from where the last one ended',
      start: '{ zoom, dx, dy }: where the camera begins', ease: 'easing name for the moves', at: 'when the camera clock starts (s)', keepInside: 'never slide past the edge of the picture (keeps the sides filled)',
    },
    cues: p => p.moves.map(m => ({ dt: m.at, kind: 'sound', props: { id: 'whoosh' } })),
    draw(ctx, t, p, env) {
      const W = env.W, H = env.H, ez = E[p.ease] || E.inOutCubic;
      let cur = Object.assign({ zoom: 1, dx: 0, dy: 0 }, p.start);
      for (const m of p.moves) {
        const u = (E[m.ease] || ez)(prog(t, p.at + m.at, m.dur)); if (u <= 0) break;
        const to = { zoom: m.zoom != null ? m.zoom : cur.zoom, dx: m.dx != null ? m.dx : cur.dx, dy: m.dy != null ? m.dy : cur.dy };
        cur = { zoom: lerp(cur.zoom, to.zoom, u), dx: lerp(cur.dx, to.dx, u), dy: lerp(cur.dy, to.dy, u) };
        if (u < 1) break;
      }
      if (p.keepInside) { const mx = W / 2 * (1 - 1 / Math.max(1, cur.zoom)), my = H / 2 * (1 - 1 / Math.max(1, cur.zoom)); cur.dx = clamp(cur.dx, -mx, mx); cur.dy = clamp(cur.dy, -my, my); }   // never slide off the edge of the picture
      ctx.save();
      ctx.translate(W / 2, H / 2); ctx.scale(cur.zoom, cur.zoom); ctx.translate(-(W / 2 + cur.dx), -(H / 2 + cur.dy));
      const c = p.content;
      if (typeof c === 'function') c(ctx, t, env); else if (c) KIT.draw(c.piece, ctx, t, c.params); else KIT.draw('plate', ctx, t, {});
      ctx.restore();
    },
  });
  KIT.alias('push-in', 'camera', { moves: [{ at: .4, dur: 1.6, zoom: 1.32 }] }, 'A slow push toward the speaker, like walking in. Use it for emphasis.');
  KIT.alias('pull-out', 'camera', { start: { zoom: 1.32, dx: 0, dy: 0 }, moves: [{ at: .4, dur: 1.4, zoom: 1 }] }, 'Pull back out to the wide shot, after a close-up.');
  KIT.alias('drift', 'camera', { moves: [{ at: .4, dur: 1.8, zoom: 1.26, dx: -100, dy: 40 }] }, 'Slide to a new framing while pushing in a little. A good way to make room for a graphic.');
  KIT.alias('there-and-back', 'camera', { moves: [{ at: .3, dur: 1.1, zoom: 1.35 }, { at: 2.6, dur: 1.1, zoom: 1, dx: 0, dy: 0 }] }, 'Push in for the point, hold, then go back to exactly the wide shot you started on.');
})(window);
