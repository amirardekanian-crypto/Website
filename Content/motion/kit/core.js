/* core.js — the kit: every Motion Menu item as a named, callable piece.
 *
 * A PIECE is one move, one graphic or one scene change, written as a pure function of time: it draws onto a canvas context
 * and keeps nothing between frames. Every number the Menu says you can change ("the words, size, speed") is a PARAM with
 * a default equal to what the showreel used, so calling a piece with no params gives exactly the reel's version.
 *
 *   KIT.draw('ruler', ctx, t, { at: 0.469 })       draw the piece at scene time t (seconds); it starts at params.at (default 0)
 *   KIT.transition('slab', { text: '03' })          a scene change, for REEL.transition(...)
 *   KIT.cut('venetian', ctx, A, B, p, params)       the same scene change inline, between two canvases A and B at progress p 0..1
 *   KIT.scene({ id, label, layers: [...] })         a scene made of layers; cues are registered for you
 *   KIT.cue('ruler', t0, params)                    the sound cues a piece comes with, registered at scene start t0 + params.at
 *
 * CONVENTIONS (the rules every piece follows; the reel is rebuilt from pieces and checked frame by frame, so they matter)
 *   time     draw(ctx, t, p, env): t is the time on whatever clock the caller uses (a scene's clock, or a card's own clock).
 *            The piece reads its own start from p.at and works with prog(t, p.at + x, d) exactly as the reel's code did.
 *   params   p = defaults merged with the caller's params. Positions and sizes are in the canvas's own pixels, and a piece
 *            designed for a box is placed with KIT.fit(). A param may be a function: KIT.val(p.x, t) resolves it.
 *   state    KIT.draw wraps every call in ctx.save() / ctx.restore(). A piece sets every bit of canvas state it needs itself
 *            (fillStyle, font, lineWidth, textAlign, letterSpacing...) and never relies on what an earlier piece left behind.
 *   order    drawing order is the caller's. Where the reel drew a ring before a ball, call the ring piece first.
 *   cues     a piece lists its own sound cues in cues(p) as templates relative to p.at.
 *   docs     every piece has a one-line doc and a doc string per param, so KIT.describe(id) can tell Claude how to call it.
 *
 * Aliases: KIT.alias('squash', 'ball', { phases: [...] }) gives a Menu name to a preset of a bigger piece.
 */
(function (g) {
  'use strict';
  const L = g.L, R = g.REEL;
  const KIT = g.KIT = { version: 1, defs: Object.create(null), marks: Object.create(null), nos: Object.create(null), scenes: [], data: { look: {}, font: {}, ease: {}, rule: {}, finish: {} } };

  /* ── the registry ─────────────────────────────────────────────── */
  function add(kind, id, def) {
    if (KIT.defs[id]) throw new Error(`kit: "${id}" is already defined`);
    def.id = id; def.kind = kind; def.defaults = def.defaults || {}; def.params = def.params || {};
    return (KIT.defs[id] = def);
  }
  KIT.piece = (id, def) => add('piece', id, def);                       // draws onto the canvas it is given
  KIT.join = (id, def) => add('join', id, def);                         // joins two canvases: draw(ctx, A, B, p, t, params, env)
  KIT.alias = (id, base, preset, doc) => add('alias', id, { base, preset: preset || {}, doc: doc || '' });
  KIT.has = id => !!KIT.defs[id];
  KIT.ids = kind => Object.keys(KIT.defs).filter(k => !kind || KIT.defs[k].kind === kind);

  /* follow aliases down to the real definition; merge defaults < alias presets (innermost first) < the caller's params */
  function resolve(id, params) {
    let def = KIT.defs[id]; if (!def) throw new Error(`kit: there is no piece called "${id}"`);
    const presets = [];
    while (def.kind === 'alias') { presets.unshift(def.preset); def = KIT.defs[def.base]; if (!def) throw new Error(`kit: alias "${id}" points at a missing piece`); }
    const p = Object.assign({}, def.defaults);
    for (const pr of presets) Object.assign(p, pr);
    if (params) Object.assign(p, params);
    return { def, p };
  }
  KIT.resolve = resolve;

  const SPEC = () => ({ W: R.W, H: R.H, FPS: R.FPS, BEAT: R.BEAT, BAR: R.BAR, S8: R.BEAT / 2, L, R, KIT });

  /* ── drawing ──────────────────────────────────────────────────── */
  KIT.draw = function (id, ctx, t, params) {
    const { def, p } = resolve(id, params);
    if (def.kind !== 'piece') throw new Error(`kit: "${id}" is a ${def.kind}; it is not drawn with KIT.draw`);
    ctx.save();
    try { def.draw(ctx, t, p, SPEC()); } finally { ctx.restore(); }
  };

  /* a scene change for the engine: REEL.transition(KIT.transition('slab', { text: '03' })) */
  KIT.transition = function (id, params) {
    const { def, p } = resolve(id, params);
    if (def.kind !== 'join') throw new Error(`kit: "${id}" is not a scene change`);
    const tr = {
      pre: p.pre != null ? p.pre : (def.pre != null ? def.pre : .3),
      post: p.post != null ? p.post : (def.post != null ? def.post : .3),
      draw: (ctx, A, B, pr, t, env) => def.draw(ctx, A, B, pr, t, p, env || SPEC()),
    };
    if (def.fx) tr.fx = pr => def.fx(pr, p);
    const mix = p.fxMix || def.fxMix; if (mix) tr.fxMix = mix;
    return tr;
  };

  /* the same scene change inline, between two canvases the caller owns (a cut inside one scene) */
  KIT.cut = function (id, ctx, A, B, pr, params) {
    const { def, p } = resolve(id, params);
    if (def.kind !== 'join') throw new Error(`kit: "${id}" is not a scene change`);
    ctx.save();
    try { def.draw(ctx, A, B, pr, 0, p, SPEC()); } finally { ctx.restore(); }
  };

  /* ── cues ─────────────────────────────────────────────────────── */
  /* cues(p) returns templates:  { dt, kind, props }  or  { dt, hit: amplitude, props }   (dt is seconds after p.at) */
  KIT.cueList = function (id, params) {
    const { def, p } = resolve(id, params);
    return def.cues ? def.cues(p, SPEC()) : [];
  };
  KIT.cue = function (id, t0, params) {
    const { def, p } = resolve(id, params), at = p.at || 0;
    if (!def.cues) return;
    for (const c of def.cues(p, SPEC())) {
      if (c.hit != null) R.hit(t0 + at + c.dt, c.hit, c.props); else R.cue(t0 + at + c.dt, c.kind, c.props);
    }
  };
  /* a Menu sound by name: the audio tool plays that sound's recipe at time t */
  KIT.sound = (t, id, props) => R.cue(t, 'sound', Object.assign({ id }, props));

  /* ── scenes ───────────────────────────────────────────────────── */
  /* layers: { piece, params }  { group: [layers], transform(ctx, t, env) }  { fn(ctx, t, env) }, each optionally { when: [from, to] } */
  function drawLayers(ctx, layers, t, env) {
    for (const l of layers) {
      if (l.when && (t < l.when[0] || t >= l.when[1])) continue;
      if (l.group) { ctx.save(); if (l.transform) l.transform(ctx, t, env); drawLayers(ctx, l.group, t, env); ctx.restore(); }
      else if (l.fn) l.fn(ctx, t, env);
      else KIT.draw(l.piece, ctx, t, l.params);
    }
  }
  function eachLayer(layers, fn) { for (const l of layers) { if (l.group) eachLayer(l.group, fn); else if (l.piece) fn(l); } }

  KIT.scene = function (def) {
    const layers = def.layers || [];
    const shot = R.shot({
      id: def.id, label: def.label, t0: def.t0, dur: def.dur, hud: def.hud, fx: def.fx, samples: def.samples,
      draw(ctx, t, env) {
        if (def.before) def.before(ctx, t, env);
        drawLayers(ctx, layers, t, env);
        if (def.after) def.after(ctx, t, env);
      },
    });
    /* cues: the pieces' own (in layer order, or in the order of def.cueOrder, a list of layer ids, when two cues share a time
       and the order they are written in matters), then the scene's explicit list */
    if (def.cues !== false) {
      const flat = []; eachLayer(layers, l => flat.push(l));
      const named = (def.cueOrder || []).map(id => flat.find(l => l.id === id)).filter(Boolean);
      const ordered = named.concat(flat.filter(l => named.indexOf(l) < 0));
      for (const l of ordered) if (l.cues !== false) KIT.cue(l.piece, shot.t0, l.params);
      for (const c of (def.cueList || [])) { if (c.hit != null) R.hit(shot.t0 + c.dt, c.hit, c.props); else R.cue(shot.t0 + c.dt, c.kind, c.props); }
    }
    KIT.scenes.push({ shot, layers });
    return shot;
  };

  /* heavy one-time work (meshes, simulations, layout) runs once the fonts are loaded, before the first frame */
  KIT.warm = function () {
    const done = new Set();
    for (const { layers } of KIT.scenes) eachLayer(layers, l => {
      const { def, p } = resolve(l.piece, l.params);
      if (!def.warm) return;
      const key = l.piece + '|' + (def.warmKey ? def.warmKey(p) : '');
      if (done.has(key)) return; done.add(key);
      def.warm(p, SPEC());
    });
  };
  R.inits.push(() => KIT.warm());

  /* ── small tools every piece uses ─────────────────────────────── */
  KIT.val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);

  /* map a design rectangle (0,0)-(dw,dh) onto a box [x, y, w, h]; returns the scale. mode: contain | cover | stretch */
  KIT.fit = function (ctx, dw, dh, box, o) {
    o = o || {};
    const [bx, by, bw, bh] = box, mode = o.mode || 'contain', ax = o.ax == null ? .5 : o.ax, ay = o.ay == null ? .5 : o.ay;
    if (mode === 'stretch') { ctx.translate(bx, by); ctx.scale(bw / dw, bh / dh); return bw / dw; }
    const s = mode === 'cover' ? Math.max(bw / dw, bh / dh) : Math.min(bw / dw, bh / dh);
    ctx.translate(bx + (bw - dw * s) * ax, by + (bh - dh * s) * ay); ctx.scale(s, s);
    return s;
  };

  /* a piece that ends on a point can publish it for a scene change to find: KIT.mark('dot', {x, y, r}) */
  KIT.mark = (name, v) => { KIT.marks[name] = v; return v; };

  /* ── text: Latin letters, Farsi words ─────────────────────────── */
  const tctx = L.canvas(8, 8).getContext('2d'), wcache = new Map();
  const RTL_RE = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
  KIT.text = {
    isRTL: s => RTL_RE.test(s),
    /* '12' -> '۱۲' */
    fa: x => String(x).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]),
    width(font, str, dir) {
      const key = font + '|' + (dir || '') + '|' + str; let w = wcache.get(key);
      if (w == null) { tctx.font = font; tctx.direction = dir || 'ltr'; w = tctx.measureText(str).width; tctx.direction = 'ltr'; wcache.set(key, w); }
      return w;
    },
    /* Cut a line into units and give each one's left edge. unit: 'letter' | 'word' | 'line'.
       Farsi letters join, so a Farsi line is never cut finer than a word (a 'letter' request becomes 'word').
       Right-to-left lines are laid out from the right: the first word is the rightmost. */
    units(font, str, o) {
      o = o || {};
      const rtl = o.dir ? o.dir === 'rtl' : KIT.text.isRTL(str), dir = rtl ? 'rtl' : 'ltr';
      let unit = o.unit || 'letter'; if (rtl && unit === 'letter') unit = 'word';
      const track = o.track || 0;
      let parts, widths;
      if (unit === 'line') { parts = [str]; widths = [KIT.text.width(font, str, dir)]; }
      else if (unit === 'word') { parts = str.split(/\s+/).filter(Boolean); widths = parts.map(w => KIT.text.width(font, w, dir)); }
      else {                                                                 // letters, kerning-aware: advance = width of the prefix, as L.chars does
        parts = Array.from(str); widths = []; let prev = 0;
        for (let i = 0; i < parts.length; i++) { const pw = KIT.text.width(font, parts.slice(0, i + 1).join('')); widths.push(pw - prev); prev = pw; }
      }
      const gap = unit === 'word' ? (o.space != null ? o.space : KIT.text.width(font, ' ', dir)) : track;
      let total = widths.reduce((a, b) => a + b, 0) + gap * Math.max(0, parts.length - 1);
      const xs = []; let x = 0;
      for (let i = 0; i < parts.length; i++) { xs.push(x); x += widths[i] + gap; }
      const units = parts.map((s, i) => ({ s, i, w: widths[i], x: rtl ? total - xs[i] - widths[i] : xs[i] }));
      return { units, total, rtl, dir, unit };
    },
  };

  /* ── data pieces: looks, fonts, eases, rules, finishes ────────── */
  KIT.defData = (kind, id, value, doc) => { KIT.data[kind][id] = Object.assign({ id, doc: doc || '' }, value); return KIT.data[kind][id]; };
  const need = (kind, id) => { const v = KIT.data[kind][id]; if (!v) throw new Error(`kit: no ${kind} called "${id}"`); return v; };
  KIT.look = id => need('look', id);
  KIT.font = id => need('font', id);
  KIT.rule = id => need('rule', id);
  KIT.ease = (id, ...a) => { const e = need('ease', id); return e.make ? e.make(...a) : e.fn; };
  /* post-processing in the Menu's words: Halo (glow), Prism (colour split), Film (grain), Vignette (dark corners) */
  KIT.fx = o => {
    o = o || {}; const f = {};
    if (o.halo != null) f.bloom = o.halo;
    if (o.prism != null) f.ca = o.prism;
    if (o.film != null) f.grain = o.film;
    if (o.vignette != null) f.vig = o.vignette;
    if (o.flash != null) f.flash = o.flash;
    return f;
  };
  /* Jolt: how hard hits shake the camera. KIT.jolt({ x: 30, y: 22, rot: .01, zoom: .04, decay: 9, on: true }) before the scenes */
  KIT.jolt = o => Object.assign(R.jolt, o);

  /* the Menu's numbers, so a number can be used where a name can: KIT.setNumbers(numbers.json.numbers) */
  KIT.setNumbers = map => { KIT.nos = Object.assign(Object.create(null), map); };
  KIT.byNo = n => Object.keys(KIT.nos).find(k => KIT.nos[k] === +n) || null;

  /* what a piece is and how to call it, for Claude and for the docs */
  KIT.describe = function (id) {
    const { def, p } = resolve(id, {});
    const base = def.kind === 'alias' ? KIT.defs[id] : def, params = {};
    for (const k of Object.keys(def.defaults)) params[k] = { default: p[k], doc: def.params[k] || '' };
    return { id, kind: base.kind, base: def.id, doc: base.doc || def.doc || '', group: def.group || '', params, cues: !!def.cues };
  };
})(window);
