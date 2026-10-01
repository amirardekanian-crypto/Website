/* engine.js — the reel's timeline.
 *
 * 128 BPM, 4/4: one beat = 0.46875 s, one bar = 1.875 s, so EIGHT BARS = exactly 15.000 s.
 * Eight shots, one per bar. Every hit lands on the grid, and the soundtrack (tools/audio.py)
 * is built from the same cue sheet (REEL.cues), so picture and sound cannot drift apart.
 *
 * renderFrame(f) is a pure function of the frame number: it supersamples time (real motion blur,
 * a 0.6-frame shutter by default), composites shots through their transitions, shakes the camera on
 * hits, then hands the frame to post.js (bloom, chromatic aberration, grain) and hud.js.
 */
(function (g) {
  'use strict';
  const L = g.L, { clamp, lerp, noise2, smoothstep } = L;
  /* the size, frame rate, length and tempo are set once, by REEL.configure() (the defaults are the reel's own) */
  let W = 1920, H = 1080, FPS = 30, DUR = 15, BPM = 128;
  let BEAT = 60 / BPM, BAR = BEAT * 4;

  const R = g.REEL = { W, H, FPS, DUR, BPM, BEAT, BAR, shots: [], trans: [], cues: [], hits: [], samples: 6, shutter: 0.6,
    fonts: [], onConfigure: [], jolt: { x: 30, y: 22, rot: .010, zoom: .04, decay: 9, on: true } };

  /* ── registration ─────────────────────────────────────────────── */
  R.shot = function (s) {
    const prev = R.shots[R.shots.length - 1];
    s.t0 = s.t0 != null ? s.t0 : (prev ? prev.t0 + prev.dur : 0);
    s.dur = s.dur != null ? s.dur : BAR;
    s.fx = Object.assign({ bloom: .5, ca: .5, grain: .06, vig: .32, flash: 0 }, s.fx);
    s.samples = s.samples != null ? s.samples : 6;
    s.hud = Object.assign({ color: L.PAL.bone, tl: 1, tr: 1, bl: 1, br: 1, marks: 1 }, s.hud);
    R.shots.push(s);
    return s;
  };
  R.transition = function (tr) {                       // transition i joins shot i and shot i+1
    tr.to = R.trans.length + 1;
    tr.pre = tr.pre != null ? tr.pre : .3;
    tr.post = tr.post != null ? tr.post : .3;
    R.trans.push(tr);
    return tr;
  };
  R.inits = [];                                         // shots push layout/pre-compute work here; runs once fonts are loaded
  R.init = () => { for (const fn of R.inits) fn(); };
  R.cue = (t, kind, props) => { R.cues.push(Object.assign({ t: +t.toFixed(4), kind }, props)); };
  R.hit = (t, amp = 1, props) => {
    const j = props && props.jolt != null ? props.jolt : 1;           // props.jolt scales this hit's camera shake (0 = none); it is not part of the cue
    let pr = props; if (props && 'jolt' in props) { pr = Object.assign({}, props); delete pr.jolt; }
    R.hits.push({ t, amp, j }); R.cues.push(Object.assign({ t: +t.toFixed(4), kind: 'hit', amp }, pr));
  };
  /* time of beat b (0-based, may be fractional) */
  R.at = beat => beat * BEAT;

  /* ── canvases ─────────────────────────────────────────────────── */
  const mk = () => L.canvas(W, H);
  const out = document.getElementById('out');
  const outCtx = out.getContext('2d');
  let sceneC, accC, aC, bC, sceneX, accX, aX, bX;
  function build() {
    out.width = W; out.height = H;
    sceneC = mk(); accC = mk(); aC = mk(); bC = mk();
    sceneX = sceneC.getContext('2d'); accX = accC.getContext('2d'); aX = aC.getContext('2d'); bX = bC.getContext('2d');
    env.W = W; env.H = H; env.BEAT = BEAT; env.BAR = BAR; env.FPS = FPS;
  }
  R.out = out;

  const env = { W, H, t: 0, BEAT, BAR, FPS };
  build();

  /* REEL.configure({ W, H, FPS, DUR, BPM, fonts }): call it BEFORE any shot or piece is created. Everything that holds a
     buffer sized to the frame (post.js, hud.js) registers a function in R.onConfigure and is rebuilt here. */
  R.configure = function (o) {
    if (R.shots.length || R.trans.length) throw new Error('REEL.configure() must come before any shot or transition is registered');
    if (o.W) W = R.W = o.W;
    if (o.H) H = R.H = o.H;
    if (o.FPS) FPS = R.FPS = o.FPS;
    if (o.DUR) DUR = R.DUR = o.DUR;
    if (o.BPM) { BPM = R.BPM = o.BPM; BEAT = R.BEAT = 60 / BPM; BAR = R.BAR = BEAT * 4; }
    if (o.fonts) R.fonts = R.fonts.concat(o.fonts);
    if (o.jolt) Object.assign(R.jolt, o.jolt);
    build();
    for (const fn of R.onConfigure) fn(R);
    return R;
  };
  function reset(ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none'; ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.lineCap = 'butt'; ctx.lineJoin = 'miter';
    ctx.setLineDash([]); ctx.lineDashOffset = 0; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = '0px'; ctx.fontKerning = 'normal'; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  }

  /* which shot / transition owns time t */
  function active(t) {
    for (const tr of R.trans) {
      const s = R.shots[tr.to], a = s.t0 - tr.pre, b = s.t0 + tr.post;
      if (t >= a && t < b) return { tr, p: (t - a) / (b - a) };
    }
    let i = 0;
    for (let k = 0; k < R.shots.length; k++) if (t >= R.shots[k].t0) i = k;
    return { i };
  }
  R.active = active;

  /* Every shot canvas is cleared before it is drawn. A transition or a cut that leaves a gap (the whip pan, the glitch slices)
     used to show whatever the previous sample or frame had left there, so a frame depended on which frames a worker had
     rendered before it. Clearing makes every frame a pure function of its number. */
  function drawShot(ctx, s, t) { reset(ctx); ctx.clearRect(0, 0, W, H); env.t = t; s.draw(ctx, t - s.t0, env); }

  function drawWorld(ctx, t) {
    const a = active(t);
    env.t = t;
    if (a.tr) {
      const from = R.shots[a.tr.to - 1], to = R.shots[a.tr.to];
      drawShot(aX, from, t); drawShot(bX, to, t);
      reset(ctx); a.tr.draw(ctx, aC, bC, a.p, t, env);
    } else {
      drawShot(ctx, R.shots[a.i], t);
    }
  }

  /* ── camera: shake + punch-in on every hit ────────────────────── */
  function camera(t) {
    let x = 0, y = 0, r = 0, e = 0;
    const J = R.jolt;
    if (!J.on) return { x, y, r, e, s: 1 };
    for (const h of R.hits) {
      const dt = t - h.t;
      if (dt < 0 || dt > .7) continue;
      const env_ = h.amp * h.j * Math.exp(-dt * J.decay), n = dt * 34;
      x += noise2(n, h.t * 7.1) * J.x * env_;
      y += noise2(n + 31.7, h.t * 3.3) * J.y * env_;
      r += noise2(n + 77.1, h.t * 1.7) * J.rot * env_;
      e += env_;
    }
    return { x, y, r, e, s: 1 + J.zoom * Math.min(e, 1.2) };
  }
  R.energy = t => { let e = 0; for (const h of R.hits) { const dt = t - h.t; if (dt >= 0 && dt < .7) e += h.amp * Math.exp(-dt * 9); } return e; };

  /* ── per-frame fx (shot defaults blended across transitions, plus the hit energy) ── */
  function fxAt(t) {
    const a = active(t);
    let fx;
    if (a.tr) {
      const A = R.shots[a.tr.to - 1].fx, B = R.shots[a.tr.to].fx, mx = a.tr.fxMix || [.3, .7], k = smoothstep(mx[0], mx[1], a.p);
      fx = {}; for (const key in A) fx[key] = lerp(A[key], B[key], k);
      if (a.tr.fx) { const add = a.tr.fx(a.p); for (const key in add) fx[key] = (fx[key] || 0) + add[key]; }
    } else fx = Object.assign({}, R.shots[a.i].fx);
    const e = R.energy(t);
    fx.ca += e * 5; fx.bloom += e * .18;
    return fx;
  }

  function samplesAt(t) {
    const a = active(t);
    return a.tr ? Math.max(R.shots[a.tr.to - 1].samples, R.shots[a.tr.to].samples) : R.shots[a.i].samples;
  }

  /* ── the frame ────────────────────────────────────────────────── */
  R.renderFrame = function (f, o = {}) {
    const t = f / FPS;
    const N = o.samples != null ? Math.min(o.samples, samplesAt(t)) : samplesAt(t);
    const shutter = o.shutter != null ? o.shutter : R.shutter;
    reset(accX); accX.fillStyle = '#000'; accX.fillRect(0, 0, W, H);
    for (let k = 0; k < N; k++) {
      const tk = N === 1 ? t : t + ((k + .5) / N - .5) * shutter / FPS;
      reset(sceneX); sceneX.clearRect(0, 0, W, H);
      drawWorld(sceneX, tk);
      const c = o.noCamera ? { e: 0 } : camera(tk);               // o.noCamera: the Motion Menu's "Jolt off" demo
      accX.setTransform(1, 0, 0, 1, 0, 0);
      accX.globalAlpha = 1 / (k + 1);
      if (c.e > .002) {
        accX.translate(W / 2 + c.x, H / 2 + c.y); accX.rotate(c.r); accX.scale(c.s, c.s); accX.translate(-W / 2, -H / 2);
      }
      accX.drawImage(sceneC, 0, 0);
    }
    accX.setTransform(1, 0, 0, 1, 0, 0); accX.globalAlpha = 1;
    reset(outCtx);
    const fx = fxAt(t); if (o.fx) Object.assign(fx, o.fx);        // o.fx: override bloom / ca / grain / vig / flash (before-and-after demos)
    R.post(outCtx, accC, t, f, fx);
    if (!o.noHud) R.hud(outCtx, t);
    return out;
  };

  /* every cue the picture fires, for the audio tool */
  R.cueSheet = () => ({ fps: FPS, bpm: BPM, dur: DUR, cues: R.cues.slice().sort((a, b) => a.t - b.t) });
})(window);
