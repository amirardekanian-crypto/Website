/* joins.js — scene changes: Full Stop, Slab, Portal, Static, Clamshell, Whiplash, Strobe, and the cuts Venetian, Pinhole, Shatter, Tunnel,
 * Mosaic, Flipcard.
 *
 * A join takes two full pictures, A (going out) and B (coming in), and a progress p from 0 to 1, and draws the change onto a canvas.
 * Two ways to run one:
 *   REEL.transition(KIT.transition('slab', { text: '03' }))     between two shots; the engine times it on the bar line
 *   KIT.cut('venetian', ctx, A, B, p, params)                   inline, between two canvases the scene owns (a cut inside one shot)
 * Every join has the same three timing params. `at` is the moment the two scenes meet, `pre` is how long it runs before that
 * moment and `post` how long after, so a smaller number is a faster join. Between shots the engine places it on the bar line and
 * only pre and post are read. Inside a scene `at` is the beat it lands on, and the cut's own sound is registered with KIT.cue.
 * Finish strengths use the Menu's words: prism = colour split, halo = glow, flash = white flash.
 * Where a number was the reel's, it is the default here, so a join with no params is the reel's version.
 */
(function (g) {
  'use strict';
  const L = g.L, KIT = g.KIT, { PAL, E, clamp, lerp, hash, rgbaHex } = L;
  const bump = (p, c = .5, k = 6) => Math.exp(-Math.pow((p - c) * k, 2));      // a bell: 1 at p = c, falling away either side
  const centre = (o, env) => [o.x == null ? env.W / 2 : KIT.val(o.x), o.y == null ? env.H / 2 : KIT.val(o.y)];

  const WINDOW_DOC = {
    at: 'the moment the two scenes meet (s). Used when the join runs inside a scene. Between shots the engine sets it',
    pre: 'how long it runs before that moment (s). Smaller means faster',
    post: 'how long it runs after that moment (s). Smaller means faster',
  };
  const windowed = (pre, post) => ({ at: 0, pre, post });
  const gloss = ['#FF8A63', PAL.coral, '#E23E1B'];

  /* ── Full Stop: the dot swells and floods the screen ── */
  KIT.join('full-stop', {
    group: 'scenes',
    doc: 'The dot swells and floods the screen.',
    defaults: Object.assign({ x: null, y: null, r: null, reach: 2300, push: .14, colors: gloss, prism: 10, halo: .1 }, windowed(.45, .02)),
    params: Object.assign({
      x: 'where the dot sits (x), or a function. null = the full stop of the last word (KIT.marks.dot)',
      y: 'where the dot sits (y), or a function. null = the full stop of the last word',
      r: 'radius of the dot before it swells (px), or a function. null = the full stop of the last word',
      reach: 'radius it swells to (px). It must cover the whole screen',
      push: 'how much the old scene is pushed up toward the viewer as the dot swells',
      colors: 'three gloss colours of the dot, light to dark',
      prism: 'colour split at the end',
      halo: 'glow at the end',
    }, WINDOW_DOC),
    draw(ctx, A, B, p, t, o) {
      const m = KIT.marks.dot || { x: 1750, y: 650, r: 32 };         // the full stop the last word published; the old reel's own fallback if none did
      const D = { x: o.x == null ? m.x : KIT.val(o.x), y: o.y == null ? m.y : KIT.val(o.y), r: o.r == null ? m.r : KIT.val(o.r) };
      const q = E.inQuart(p), r = lerp(D.r, o.reach, q), s = 1 + o.push * q * q;
      ctx.save(); ctx.translate(D.x, D.y); ctx.scale(s, s); ctx.translate(-D.x, -D.y); ctx.drawImage(A, 0, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(D.x, D.y, r, 0, L.TAU); ctx.clip(); ctx.drawImage(B, 0, 0);
      const gl = 1 - clamp(p * 3);                                    // keep the dot's gloss while it is still small
      if (gl > .01) {
        const gr = ctx.createRadialGradient(D.x - r * .35, D.y - r * .4, r * .05, D.x, D.y, r * 1.05);
        gr.addColorStop(0, rgbaHex(o.colors[0], gl)); gr.addColorStop(.6, rgbaHex(o.colors[1], gl * .6)); gr.addColorStop(1, rgbaHex(o.colors[2], gl));
        ctx.fillStyle = gr; ctx.fillRect(D.x - r - 2, D.y - r - 2, r * 2 + 4, r * 2 + 4);
      }
      ctx.restore();
    },
    fx: (p, o) => ({ ca: o.prism * E.inCubic(p), bloom: o.halo * p }),
  });

  /* ── Slab: a skewed bar sweeps right to left, carrying the next number ── */
  KIT.join('slab', {
    group: 'scenes',
    doc: 'A black bar sweeps across carrying the next number.',
    fxMix: [.1, .4],
    defaults: Object.assign({
      text: '03', label: 'FORM', color: PAL.ink, numColor: PAL.coral, labelColor: PAL.bone, edge: PAL.bone, width: 600, skew: 190, angle: null,
      drag: .1, size: 430, font: '900 {s}px "Unbounded"', labelFont: '500 22px "JetBrains Mono"', track: '8px', prism: 7,
    }, windowed(.42, .02)),
    params: Object.assign({
      text: 'the big number or word on the bar. Farsi works: give a Farsi font and Persian digits',
      label: 'the small word under it. Empty = none',
      color: 'colour of the bar',
      numColor: 'colour of the big number',
      labelColor: 'colour of the small word',
      edge: 'colour of the thin line along the front edge of the bar',
      width: 'width of the bar (px)',
      skew: 'how far the bar leans: sideways shift from top to bottom (px)',
      angle: 'lean in degrees from upright. null = use skew',
      drag: 'how much the old scene is dragged along as the bar passes',
      size: 'size of the big number (px)',
      font: 'CSS font of the big number with {s} where the size goes',
      labelFont: 'CSS font of the small word',
      track: 'letter-spacing of the small word as CSS text. Use "0px" for Farsi',
      prism: 'colour split while the bar passes',
    }, WINDOW_DOC),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H, CY = H / 2;
      const e = E.inOutCubic(p), Wb = o.width, sk = o.angle != null ? H * Math.tan(o.angle * Math.PI / 180) : o.skew;
      const xl = lerp(W + sk, -Wb, e);                                // the bar's left edge (top): fully off at p = 1
      ctx.drawImage(B, 0, 0);
      ctx.save(); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(xl, 0); ctx.lineTo(xl - sk, H); ctx.lineTo(0, H); ctx.closePath(); ctx.clip();
      ctx.save(); ctx.translate(-Math.max(0, W - xl) * o.drag, 0); ctx.drawImage(A, 0, 0); ctx.restore(); ctx.restore();
      ctx.save();
      ctx.beginPath(); ctx.moveTo(xl, 0); ctx.lineTo(xl + Wb, 0); ctx.lineTo(xl + Wb - sk, H); ctx.lineTo(xl - sk, H); ctx.closePath();
      ctx.fillStyle = o.color; ctx.fill(); ctx.clip();
      ctx.font = o.font.replace('{s}', o.size); ctx.textAlign = 'center'; ctx.fillStyle = o.numColor; ctx.fillText(o.text, xl + Wb / 2 - sk * .5, CY + 150);
      if (o.label) { ctx.fillStyle = o.labelColor; ctx.font = o.labelFont; ctx.letterSpacing = o.track; ctx.fillText(o.label, xl + Wb / 2 - sk * .5, CY + 215); ctx.letterSpacing = '0px'; }
      ctx.restore();
      ctx.fillStyle = o.edge; ctx.beginPath(); ctx.moveTo(xl - 3, 0); ctx.lineTo(xl + 4, 0); ctx.lineTo(xl - sk + 4, H); ctx.lineTo(xl - sk - 3, H); ctx.closePath(); ctx.fill();
    },
    fx: (p, o) => ({ ca: o.prism * bump(p, .6, 3) }),
  });

  /* ── Portal: the disc becomes an iris into the next world ── */
  KIT.join('portal', {
    group: 'scenes',
    doc: 'A circle opens like an eye into the next scene.',
    defaults: Object.assign({ x: null, y: null, r0: 170, r1: 1500, zoom: .35, color: PAL.bone, width: 6, alpha: .75, prism: 12, halo: .15 }, windowed(.33, .05)),
    params: Object.assign({
      x: 'where it opens (x). null = the middle of the screen',
      y: 'where it opens (y). null = the middle of the screen',
      r0: 'radius it starts with (px)',
      r1: 'radius it opens to (px). It must cover the whole screen',
      zoom: 'how much the old scene is pushed toward the viewer as the circle opens',
      color: 'colour of the ring',
      width: 'thickness of the ring at the start (px)',
      alpha: 'strength of the ring at the start',
      prism: 'colour split near the end',
      halo: 'glow at the end',
    }, WINDOW_DOC),
    draw(ctx, A, B, p, t, o, env) {
      const [CX, CY] = centre(o, env);
      const q = E.inCubic(p), r = lerp(o.r0, o.r1, q), s = 1 + o.zoom * q;
      ctx.save(); ctx.translate(CX, CY); ctx.scale(s, s); ctx.translate(-CX, -CY); ctx.drawImage(A, 0, 0); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, r, 0, L.TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
      ctx.strokeStyle = rgbaHex(o.color, o.alpha * (1 - p)); ctx.lineWidth = o.width * (1 - p) + 1; ctx.beginPath(); ctx.arc(CX, CY, r, 0, L.TAU); ctx.stroke();
    },
    fx: (p, o) => ({ ca: o.prism * bump(p, .9, 4), bloom: o.halo * p }),
  });

  /* ── Static: a glitch cut on the flash ── */
  KIT.join('static', {
    group: 'scenes',
    doc: 'A glitch cut on a white flash.',
    defaults: Object.assign({ bands: 16, slide: 760, rolls: 16, flash: .9, fade: 17, prism: 24 }, windowed(.12, .14)),
    params: Object.assign({
      bands: 'number of slices',
      slide: 'how far the slices slide at the worst moment (px). More is more violent',
      rolls: 'how many times the slices re-roll during the cut',
      flash: 'strength of the white flash (0 to 1)',
      fade: 'how fast the flash dies away after the cut',
      prism: 'colour split at the worst moment',
    }, WINDOW_DOC),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H;
      const src = p < .5 ? A : B, amp = bump(p, .5, 3.6), bands = o.bands, bh = Math.ceil(H / bands), seed = Math.floor(p * o.rolls);
      ctx.drawImage(src, 0, 0);
      for (let j = 0; j < bands; j++) {
        const dx = (hash(j, seed) - .5) * o.slide * amp; if (Math.abs(dx) < 2) continue;
        ctx.drawImage(src, 0, j * bh, W, bh, dx, j * bh, W, bh);
      }
    },
    fx: (p, o) => ({ flash: o.flash * (p < .5 ? E.inCubic(p / .5) : Math.exp(-(p - .5) * o.fade)), ca: o.prism * bump(p, .5, 3.4) }),
  });

  /* ── Clamshell: the screen splits along its middle and opens ── */
  KIT.join('clamshell', {
    group: 'scenes',
    doc: 'The screen splits open from the middle.',
    fxMix: [.1, .35],
    defaults: Object.assign({ axis: 'y', gap: 6, line: 3, color: PAL.bone, prism: 6 }, windowed(.38, .02)),
    params: Object.assign({
      axis: '"y" splits along the middle and the halves open up and down. "x" splits down the middle and they open left and right',
      gap: 'extra distance the halves travel so they clear the screen (px)',
      line: 'thickness of the two thin lines on the cut edges (px)',
      color: 'colour of the two thin lines',
      prism: 'colour split while it opens',
    }, WINDOW_DOC),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H;
      const e = E.inOutCubic(p), a = 1 - E.outQuad(p);
      if (o.axis === 'x') {
        const off = e * (W / 2 + o.gap);
        ctx.drawImage(B, 0, 0);
        ctx.drawImage(A, 0, 0, W / 2, H, -off, 0, W / 2, H);
        ctx.drawImage(A, W / 2, 0, W / 2, H, W / 2 + off, 0, W / 2, H);
        ctx.fillStyle = rgbaHex(o.color, a); ctx.fillRect(W / 2 - off - o.line, 0, o.line, H); ctx.fillRect(W / 2 + off, 0, o.line, H);
        return;
      }
      const off = e * (H / 2 + o.gap);
      ctx.drawImage(B, 0, 0);
      ctx.drawImage(A, 0, 0, W, H / 2, 0, -off, W, H / 2);
      ctx.drawImage(A, 0, H / 2, W, H / 2, 0, H / 2 + off, W, H / 2);
      ctx.fillStyle = rgbaHex(o.color, a); ctx.fillRect(0, H / 2 - off - o.line, W, o.line); ctx.fillRect(0, H / 2 + off, W, o.line);
    },
    fx: (p, o) => ({ ca: o.prism * bump(p, .5, 3) }),
  });

  /* ── Whiplash: a whip pan. Between shots it pushes in a little and leaves a gap; as a plain cut (zoom 0, gap 0) the two scenes just slide ── */
  const cutCue = type => p => [{ dt: -p.pre, kind: 'cut', props: { type, dur: p.pre + p.post } }];   // `type`, never `kind`: a prop named kind would replace the cue's own
  KIT.join('whiplash', {
    group: 'scenes',
    doc: 'A fast whip of the camera with heavy blur.',
    defaults: Object.assign({ dir: 'left', zoom: .1, gap: 140, smear: 0, prism: 14 }, windowed(.3, .03)),
    params: Object.assign({
      dir: 'which way the old scene is whipped away: left | right | up | down',
      zoom: 'how much both scenes push in while they whip. 0 = a plain slide',
      gap: 'empty distance between the two scenes while they travel (px)',
      smear: 'extra blur: how many faint echoes trail behind the whip (0 = none)',
      prism: 'colour split during the whip (the heavy blur look)',
    }, WINDOW_DOC),
    cues: cutCue('whip'),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H, CX = W / 2, CY = H / 2;
      const e = E.inOutCubic(p), horiz = o.dir === 'left' || o.dir === 'right', sgn = o.dir === 'left' || o.dir === 'up' ? -1 : 1;
      const span = (horiz ? W : H) + o.gap, flat = !o.zoom;
      const sA = 1 + o.zoom * e, sB = (1 + o.zoom) - o.zoom * e;
      /* where the old scene (pa) and the new scene (pb) sit along the whip. A plain slide keeps its own arithmetic: A at -span*e, B at span*(1 - e). */
      const pa = flat ? sgn * span * e : sgn * (e * span), pb = flat ? -sgn * span * (1 - e) : -sgn * (span - e * span);
      const place = (img, d, s) => {
        if (flat) { ctx.drawImage(img, horiz ? d : 0, horiz ? 0 : d); return; }         // a plain slide needs no transform
        ctx.save(); ctx.translate(horiz ? d + CX : CX, horiz ? CY : d + CY); ctx.scale(s, s); ctx.translate(-CX, -CY); ctx.drawImage(img, 0, 0); ctx.restore();
      };
      place(A, pa, sA); place(B, pb, sB);
      for (let i = 1; i <= o.smear; i++) {                            // faint echoes trailing behind the whip, nearest first
        const back = -sgn * i * span * .03;
        ctx.save(); ctx.globalAlpha = .35 * (1 - i / (o.smear + 1));
        place(A, pa + back, sA); place(B, pb + back, sB);
        ctx.restore();
      }
    },
    fx: (p, o) => ({ ca: o.prism * bump(p, .5, 3) }),
  });

  /* ── Strobe: a hard cut on a white flash ── */
  KIT.join('strobe', {
    group: 'scenes',
    doc: 'A hard cut on a white flash.',
    defaults: Object.assign({ flash: .9, cutAt: .333, fade: 20, prism: 20 }, windowed(.05, .10)),
    params: Object.assign({
      flash: 'strength of the white flash (0 to 1)',
      cutAt: 'where in the join the picture switches (0 to 1). It should sit on the beat',
      fade: 'how fast the flash dies away after the cut',
      prism: 'colour split at the cut',
    }, WINDOW_DOC),
    draw(ctx, A, B, p, t, o) { ctx.drawImage(p < o.cutAt ? A : B, 0, 0); },
    fx: (p, o) => ({ flash: o.flash * (p < o.cutAt ? E.inCubic(p / o.cutAt) : Math.exp(-(p - o.cutAt) * o.fade)), ca: o.prism * bump(p, o.cutAt, 5) }),
  });

  /* ── the cuts used inside shot 7: A and B are two whole plates ── */

  /* Pinhole (the reel's iris): a circle grows from the centre and shows the next scene */
  KIT.join('pinhole', {
    group: 'scenes',
    doc: 'A circle grows from the centre and shows the next scene.',
    defaults: Object.assign({ x: null, y: null, reach: 1250 }, windowed(.06, .09)),
    params: Object.assign({
      x: 'where the circle starts (x). null = the middle of the screen',
      y: 'where the circle starts (y). null = the middle of the screen',
      reach: 'radius it grows to (px). It must cover the whole screen',
    }, WINDOW_DOC),
    cues: cutCue('iris'),
    draw(ctx, A, B, p, t, o, env) {
      const [CX, CY] = centre(o, env);
      ctx.drawImage(A, 0, 0);
      ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, o.reach * E.inOutCubic(p), 0, L.TAU); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
    },
  });

  /* Venetian (the reel's blinds): vertical blinds sweep the next scene in */
  KIT.join('venetian', {
    group: 'scenes',
    doc: 'Vertical blinds sweep the next scene in.',
    defaults: Object.assign({ blinds: 8, stagger: .06, spread: .55 }, windowed(.06, .09)),
    params: Object.assign({
      blinds: 'number of blinds',
      stagger: 'how much later each blind starts than the one before (0 to 1 of the join)',
      spread: 'how long each blind takes to open (0 to 1 of the join)',
    }, WINDOW_DOC),
    cues: cutCue('blinds'),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H;
      ctx.drawImage(A, 0, 0);
      const n = o.blinds, sw = W / n;
      for (let i = 0; i < n; i++) {
        const q = clamp((p - i * o.stagger) / o.spread), w = sw * E.outCubic(q);
        ctx.save(); ctx.beginPath(); ctx.rect(i * sw, 0, w, H); ctx.clip(); ctx.drawImage(B, 0, 0); ctx.restore();
      }
    },
  });

  /* Shatter (the reel's glitch slices): strips of the picture slide sideways, then settle */
  KIT.join('shatter', {
    group: 'scenes',
    doc: 'Strips of the picture slide sideways, then settle.',
    defaults: Object.assign({ strips: 14, slide: 520, ghost: .25, ghostShift: 18 }, windowed(.06, .09)),
    params: Object.assign({
      strips: 'number of strips',
      slide: 'how far the strips slide at the worst moment (px)',
      ghost: 'strength of the bright double image over the strips (0 = none)',
      ghostShift: 'how far the double image is offset (px)',
    }, WINDOW_DOC),
    cues: cutCue('glitch'),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H;
      const bell = Math.sin(p * Math.PI), bands = o.strips, bh = Math.ceil(H / bands);
      ctx.drawImage(p < .5 ? A : B, 0, 0);                            // a base under the strips, so the gaps they open show the scene, not leftovers
      for (let j = 0; j < bands; j++) {
        const src = (p + hash(j, 3) * .5 > .5) ? B : A, dx = (hash(j, 9) - .5) * o.slide * bell;
        ctx.drawImage(src, 0, j * bh, W, bh, dx, j * bh, W, bh);
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.ghost * bell; ctx.drawImage(p < .5 ? A : B, o.ghostShift * bell, 0); ctx.restore();
    },
  });

  /* Tunnel (the reel's zoom): zoom through the old scene into the new one */
  KIT.join('tunnel', {
    group: 'scenes',
    doc: 'Zoom through the old scene into the new one.',
    defaults: Object.assign({ x: null, y: null, zoom: 2.4, inFrom: .55, inBy: .45 }, windowed(.06, .09)),
    params: Object.assign({
      x: 'the point you zoom through (x). null = the middle of the screen',
      y: 'the point you zoom through (y). null = the middle of the screen',
      zoom: 'how much bigger the old scene grows (2.4 = it ends 3.4 times its size)',
      inFrom: 'size the new scene starts at (0.55 = just over half)',
      inBy: 'how much the new scene grows after that. inFrom + inBy should be 1',
    }, WINDOW_DOC),
    cues: cutCue('zoom'),
    draw(ctx, A, B, p, t, o, env) {
      const [CX, CY] = centre(o, env);
      const sa = 1 + o.zoom * E.inQuart(p), sb = o.inFrom + o.inBy * E.outCubic(p);
      ctx.save(); ctx.translate(CX, CY); ctx.scale(sa, sa); ctx.translate(-CX, -CY); ctx.drawImage(A, 0, 0); ctx.restore();
      ctx.save(); ctx.translate(CX, CY); ctx.scale(sb, sb); ctx.translate(-CX, -CY); ctx.globalAlpha = E.outQuad(p); ctx.drawImage(B, 0, 0); ctx.restore();
    },
  });

  /* Mosaic (the reel's pixelate): the picture breaks into big pixels and back. The scratch canvas is half the screen, as it always was. */
  const scratches = new Map();
  function scratch(env) {
    const key = env.W + 'x' + env.H; let s = scratches.get(key);
    if (!s) { const c = L.canvas(env.W / 2, env.H / 2); s = { c, x: c.getContext('2d') }; scratches.set(key, s); }
    return s;
  }
  KIT.join('mosaic', {
    group: 'scenes',
    doc: 'The picture breaks into big pixels and back.',
    defaults: Object.assign({ size: 110 }, windowed(.06, .09)),
    params: Object.assign({
      size: 'biggest pixel size at the worst moment (px)',
    }, WINDOW_DOC),
    cues: cutCue('pixel'),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H;
      const bell = Math.sin(p * Math.PI), bsz = Math.max(1, Math.round(lerp(1, o.size, bell))), src = p < .5 ? A : B;
      if (bsz <= 1) { ctx.drawImage(src, 0, 0); return; }
      const sw = Math.max(2, Math.ceil(W / bsz)), sh = Math.max(2, Math.ceil(H / bsz));
      const small = scratch(env), smallx = small.x;
      smallx.imageSmoothingEnabled = true; smallx.clearRect(0, 0, W / 2, H / 2); smallx.drawImage(src, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false; ctx.drawImage(small.c, 0, 0, sw, sh, 0, 0, sw * bsz, sh * bsz); ctx.imageSmoothingEnabled = true;
    },
  });

  /* Flipcard (the reel's flip): the scene turns over like a card, with the new scene on its back */
  KIT.join('flipcard', {
    group: 'scenes',
    doc: 'The scene turns over like a card.',
    defaults: Object.assign({ axis: 'y', bg: [PAL.lilac, PAL.ink], shade: .55, tilt: .06 }, windowed(.06, .09)),
    params: Object.assign({
      axis: '"y" turns it about the upright middle. "x" turns it about the horizontal middle',
      bg: 'colour behind the card: one colour, or [colour behind the old side, colour behind the new side], or a function of progress',
      shade: 'how dark the card goes when it is edge on (0 to 1)',
      tilt: 'how much the card grows along the other direction as it turns (a hint of perspective)',
    }, WINDOW_DOC),
    cues: cutCue('flip'),
    draw(ctx, A, B, p, t, o, env) {
      const W = env.W, H = env.H, CX = W / 2, CY = H / 2;
      const half = p < .5, bgs = KIT.val(o.bg, p);
      ctx.fillStyle = Array.isArray(bgs) ? bgs[half ? 0 : 1] : bgs; ctx.fillRect(0, 0, W, H);
      const q = half ? p * 2 : (1 - p) * 2, sx = Math.cos(q * Math.PI / 2);
      ctx.save(); ctx.translate(CX, CY);
      if (o.axis === 'x') ctx.scale(1 + (1 - sx) * o.tilt, Math.max(.001, sx)); else ctx.scale(Math.max(.001, sx), 1 + (1 - sx) * o.tilt);
      ctx.translate(-CX, -CY);
      ctx.drawImage(half ? A : B, 0, 0); ctx.fillStyle = `rgba(0,0,0,${(1 - sx) * o.shade})`; ctx.fillRect(0, 0, W, H); ctx.restore();
    },
  });
})(window);
