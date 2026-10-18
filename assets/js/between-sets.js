// Between Sets: a tennis game for the rest between gym sets (2026-10-18; Amir: a game for his tennis and padel players to
// play while the rest timer runs). You against Amir, a Fast4 set (first to 4 games, a deciding point at deuce, a tiebreak to 5 at
// 3-3). The match is saved after every point, so one set lasts about one workout and a rest picks it up where the last one stopped.
// There is also a rally drill (keep the ball in play, your best is kept). One thumb: drag anywhere to run, the hit is automatic,
// tap as the ring closes for a power shot. Amir's lines on the court are CD.LINES (cd-play section), plain words he reads before it ships.
//
// The rest is the boss, as in Off the Glass and Split Step: the app's clock is on screen the whole time (turns clay in the last
// 10 s, with one 10-second line from Amir), and the game freezes the moment the rest ends (BetweenSets.timeUp()) on a "Time to lift"
// card with no buttons; the app closes it a moment later. Sound follows the rest timer's speaker and plays on the rest timer's own
// AudioContext (never a second one). Stats and the saved match stay on this phone only: localStorage keys starting "courtduel.",
// never synced, never scored, never seen by the coach. No yellow anywhere, no text under 12 px.
//
// API, the same shape as Off the Glass (assets/js/rally.js) and Split Step (assets/js/splitstep.js), so one rest door opens any of them:
//   BetweenSets.open({ root, left, sound, audio, onClose, name }) · BetweenSets.timeUp() · BetweenSets.close() · BetweenSets.isOpen()
//   · BetweenSets.handBack(done) (Serve Clock: finish the point, park, then done())
//   root    -> an empty element the host shows over the rest timer; the game fills it and toggles its `visible` class.
//   left()  -> whole seconds of rest left, or null while the rest is paused.
//   sound() -> true when the rest timer's sound is on.   audio() -> the page's AudioContext, opened in the tap.
//   name    -> the athlete's first name (may be empty): the scoreboard says it instead of "You".
// PROGRAM-APP.md -> Between Sets describes how program.html hosts it (#setsOverlay, in topLayer() so Back closes it; sw.js SHELL, so it
// plays with no signal, and a change to it ships with a CACHE bump).
//
// This file is six small files joined in load order (court-sound, cd-base, cd-physics, cd-play, cd-draw, cd-ui) and the app door at
// the end. Each keeps its own IIFE. CourtDuel.mount(element, options) still works on its own (the standalone page), with no host.

// ═══ court-sound.js ═══
/* CourtSound: every sound effect for the tennis mini-game, synthesised with the Web Audio API.
   No audio files, no libraries, no network. One global: window.CourtSound. Call unlock() from a click
   or tap first; until then, or where Web Audio is missing, every method is a silent no-op that never
   throws. Arguments are optional objects. Methods:
   unlock() setMuted(bool) isMuted() setVolume(0..1) crowdStart() crowdStop() net() ooh()
   hit({power, kind: drive|slice|volley|serve|frame}) whoosh({power}) step({surface}) slide({surface, duration})
   bounce({surface: clay|hard|grass, speed}) applause({level}) cheer({level}) chime({kind: point|game|set})
   ui({kind: tap|confirm|back}). CourtSound.debug = true logs the errors that are normally swallowed.
   App mode (the host app owns the AudioContext, made in a tap, which iPhone needs): useContext(ac) adopts it and builds
   the master chain on it, hasContext() says whether there is one, and silence() stops the crowd and every sound at once. */
(function () {
  'use strict';
  var MAX_VOICES = 24;             // concurrent one-shot sounds; one more than this is skipped
  var CROWD_GAIN = 0.14;           // murmur bed level (its peak lands near 0.04)
  var ctx = null, master = null, white = null, pink = null;   // all made by unlock()
  var muted = false, volume = 0.8, live = 0, crowd = null;
  var adopted = false, srcs = [];  // adopted: ctx is the host's, never ours to close. srcs: every playing source (for silence())

  // ---- helpers ---------------------------------------------------------------------------------
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { v = v == null ? NaN : Number(v); return isFinite(v) ? v : d; }
  function ready() { return !!(ctx && master && white && pink); }
  function bug(e) { if (api.debug && typeof console !== 'undefined') console.warn('CourtSound:', e); }
  function drop(nodes) { nodes.forEach(function (n) { try { n.disconnect(); } catch (e) { /* gone */ } }); }

  // ---- context, master chain, noise buffers ----------------------------------------------------
  function makeNoise() {           // one white and one pink 2 s buffer, made once
    var sr = ctx.sampleRate, n = Math.floor(sr * 2), x = 2048, i, s, raw = new Float32Array(n + x);
    var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    white = ctx.createBuffer(1, n, sr); pink = ctx.createBuffer(1, n, sr);
    var w = white.getChannelData(0), p = pink.getChannelData(0);
    for (i = 0; i < n; i++) w[i] = Math.random() * 2 - 1;
    for (i = 0; i < n + x; i++) {  // pink: Paul Kellet's filter run over white noise
      s = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + s * 0.0555179; b1 = 0.99332 * b1 + s * 0.0750759; b2 = 0.969 * b2 + s * 0.153852;
      b3 = 0.8665 * b3 + s * 0.3104856; b4 = 0.55 * b4 + s * 0.5329522; b5 = -0.7616 * b5 - s * 0.016898;
      raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + s * 0.5362) * 0.11; b6 = s * 0.115926;
    }
    for (i = 0; i < n; i++)        // fade the tail into the head so the loop has no seam
      p[i] = i < x ? raw[i] * Math.sin(i / x * 1.5708) + raw[n + i] * Math.cos(i / x * 1.5708) : raw[i];
  }

  function chain() {              // the master gain, a gentle compressor and the noise buffers, all built on ctx
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    var comp = ctx.createDynamicsCompressor();     // gentle: it only catches pile-ups
    comp.threshold.value = -14; comp.knee.value = 24; comp.ratio.value = 3;
    comp.attack.value = 0.005; comp.release.value = 0.2;
    master.connect(comp); comp.connect(ctx.destination);
    makeNoise();
  }
  function reset() { ctx = master = white = pink = null; crowd = null; live = 0; srcs = []; adopted = false; }
  function resume() {
    if (ctx && ctx.state === 'suspended') { var p = ctx.resume(); if (p && p.catch) p.catch(function () {}); }
  }

  function unlock() {
    try {
      if (!ctx) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        chain();
      }
      resume();
      return true;
    } catch (e) {
      bug(e); try { if (!adopted) ctx.close(); } catch (e2) { /* nothing to close */ }
      reset(); return false;
    }
  }

  // App mode: build on the host's context. A context of our own (standalone) is never replaced; a different
  // host context (the old one was closed) is, so the next sound is not sent to a dead one.
  function useContext(ac) {
    if (!ac) return !!ctx;
    if (ctx && (!adopted || ctx === ac)) { resume(); return true; }
    try {
      if (ctx) reset();
      ctx = ac; adopted = true;
      chain();
      resume();
      return true;
    } catch (e) { bug(e); reset(); return false; }
  }
  function hasContext() { return !!ctx; }

  function setMaster() {           // master = 0 when muted, else the volume; a click-free 20 ms ramp
    if (!ready()) return;
    try {
      var g = master.gain, t = ctx.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(muted ? 0 : volume, t + 0.02);
    } catch (e) { bug(e); }
  }
  function setMuted(m) { muted = !!m; setMaster(); }
  function setVolume(v) { volume = clamp(num(v, volume), 0, 1); setMaster(); }
  function isMuted() { return muted; }

  // ---- building blocks -------------------------------------------------------------------------
  // A sound is a "voice": one gain into the master plus every node built for it. The last source
  // to end disconnects them all and frees the slot.
  function voice(build) {
    if (!ready() || muted || live >= MAX_VOICES) return;
    var nodes = [], pending = 0, v = { t: ctx.currentTime };
    v.add = function (n) { nodes.push(n); return n; };
    v.out = v.add(ctx.createGain());
    v.out.connect(master);
    v.run = function (src, t0, t1, off) {   // play src from t0 to t1 (off: start offset into a buffer)
      src.start(t0, off || 0);
      src.stop(t1 > t0 ? t1 : t0 + 0.05);
      pending++;
      srcs.push(src);
      src.onended = function () {
        var k = srcs.indexOf(src); if (k >= 0) srcs.splice(k, 1);
        if (--pending === 0) { drop(nodes); live--; }
      };
    };
    live++;
    try { build(v); } catch (e) { bug(e); }
    if (pending === 0) { drop(nodes); live--; }
  }

  // Set a param to fs[0] at t, then glide exponentially through the rest, spread evenly over dur.
  function sweep(p, t, fs, dur) {
    fs = [].concat(fs);
    p.setValueAtTime(fs[0], t);
    for (var i = 1; i < fs.length; i++) p.exponentialRampToValueAtTime(fs[i], t + dur * i / (fs.length - 1));
  }

  // Click-free envelope: silence -> peak in atk s -> (hold until the last rel s) -> silence at dur.
  function env(p, t, peak, atk, dur, rel) {
    peak = Math.max(peak, 0.0002);
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(peak, t + atk);
    if (rel) p.setValueAtTime(peak, Math.max(t + atk, t + dur - rel));
    p.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // Filtered noise burst. o: f (Hz, or [Hz, ...] to sweep), type, q, peak, atk, dur, rel, at (delay s),
  // pink (pink buffer), curve (a Float32Array gain shape instead of the envelope). `peak` is the
  // envelope level: narrow or low filters pass little noise, so they need a big one.
  function noise(v, o) {
    var t = v.t + (o.at || 0), s = v.add(ctx.createBufferSource());
    var f = v.add(ctx.createBiquadFilter()), g = v.add(ctx.createGain());
    s.buffer = o.pink ? pink : white;
    s.loop = true;
    f.type = o.type || 'bandpass';
    f.Q.value = o.q || 1;
    sweep(f.frequency, t, o.f, o.dur);
    if (o.curve) { g.gain.value = 0.0001; g.gain.setValueCurveAtTime(o.curve, t, o.dur); }
    else env(g.gain, t, o.peak, o.atk || 0.002, o.dur, o.rel);
    s.connect(f); f.connect(g); g.connect(v.out);
    v.run(s, t, t + o.dur + 0.02, rnd(0, 1.4));
  }

  // Oscillator note. o: f (Hz, or [Hz, ...] to glide over `glide` s, default the whole note), type,
  // peak, atk, dur, rel, at (delay s).
  function tone(v, o) {
    var t = v.t + (o.at || 0), s = v.add(ctx.createOscillator()), g = v.add(ctx.createGain());
    s.type = o.type || 'sine';
    sweep(s.frequency, t, o.f, o.glide || o.dur);
    env(g.gain, t, o.peak, o.atk || 0.002, o.dur, o.rel);
    s.connect(g); g.connect(v.out);
    v.run(s, t, t + o.dur + 0.02);
  }

  // ---- racket, ball and court ------------------------------------------------------------------
  function hit(o) {                // racket meets ball: a crisp "pock" (noise crack + short body tone)
    var kind = o.kind, p = clamp(num(o.power, 0.5), 0, 1);
    if (kind === 'serve') p = Math.max(p, 0.8);
    var lv = (0.4 + 0.3 * p) * (kind === 'serve' ? 1.1 : 1),   // peak 0.4 .. 0.7, 0.55 by default; a serve a touch more
        fc = (1600 + 1600 * p) * rnd(0.96, 1.04),    // noise band: brighter with power
        tf = (260 + 60 * p) * rnd(0.97, 1.03);       // body tone start frequency
    voice(function (v) {
      if (kind === 'frame') {                        // mishit: a thin, high, quiet tink
        tone(v, { f: rnd(900, 1200), peak: lv * 0.4, dur: 0.16 });
        tone(v, { f: rnd(2500, 3000), peak: lv * 0.12, dur: 0.08 });
        noise(v, { f: 3000, q: 1.5, peak: lv * 0.5, dur: 0.012 });
      } else if (kind === 'slice') {                 // brushy: mostly noise, about 90 ms
        noise(v, { f: fc * 0.85, q: 0.8, peak: lv * 1.45, atk: 0.006, dur: 0.09 });
        tone(v, { type: 'triangle', f: [tf, tf * 0.55], peak: lv * 0.12, dur: 0.06 });
      } else if (kind === 'volley') {                // shorter, duller
        noise(v, { f: fc * 0.6, peak: lv * 1.95, dur: 0.02 });
        tone(v, { type: 'triangle', f: [tf, tf * 0.5], peak: lv * 0.38, dur: 0.05 });
      } else {                                       // drive, and the serve's crack
        noise(v, { f: fc, q: 1.2, peak: lv * 2.2, dur: 0.055 - 0.03 * p });
        tone(v, { type: 'triangle', f: [tf, tf * 0.45], peak: lv * 0.2, dur: 0.09 - 0.04 * p });
        if (kind === 'serve') tone(v, { f: [90, 55], peak: lv * 0.18, dur: 0.08 });   // low thump
      }
    });
  }
  function whoosh(o) {             // racket through air: a quiet rising swell, 120-220 ms
    var p = clamp(num(o.power, 0.5), 0, 1), d = 0.22 - 0.1 * p;
    voice(function (v) {
      noise(v, { f: [450, 1800 + 1400 * p], q: 1.6, peak: 0.28 + 0.28 * p, atk: d * 0.65, dur: d });
    });
  }
  function bounce(o) {             // ball meets court: quieter than a hit, louder with speed
    var s = clamp(num(o.speed, 0.5), 0, 1), lv = 0.1 + 0.2 * s, k = 0.85 + 0.3 * s, grass = o.surface === 'grass';
    voice(function (v) {
      if (o.surface === 'hard') {                    // a sharp "tok"
        noise(v, { f: 1200 * k, q: 1.3, peak: lv * 1.25, dur: 0.03 });
        tone(v, { f: [420 * k, 300 * k], peak: lv * 0.9, dur: 0.06 });
      } else {                                       // clay: a dull soft puff. grass: a muffled thud
        noise(v, { type: 'lowpass', f: (grass ? 380 : 700) * k, peak: lv * 4.5, atk: 0.004, dur: grass ? 0.07 : 0.05 });
      }
    });
  }
  function net() {                 // ball into the tape: a muffled thump and a few tiny rattles
    voice(function (v) {
      noise(v, { type: 'lowpass', f: [500, 200], q: 0.7, peak: 2.1, atk: 0.003, dur: 0.14 });
      for (var i = 0, at = 0.012, n = Math.random() < 0.5 ? 2 : 3; i < n; i++, at += rnd(0.007, 0.016))
        noise(v, { f: rnd(3000, 6000), q: 2, peak: 0.12, dur: 0.012, at: at });
    });
  }
  function step(o) {               // a very quiet footstep scuff, 25-35 ms
    var k = rnd(0.85, 1.15), s = o.surface;
    voice(function (v) {
      noise(v, s === 'hard' ? { f: 1400 * k, q: 0.9, peak: 0.13, dur: 0.025 }
        : s === 'grass' ? { type: 'lowpass', f: 600 * k, peak: 0.22, atk: 0.004, dur: 0.035 }
        : { type: 'highpass', f: 1800 * k, peak: 0.042, dur: 0.035 });   // clay: gritty
    });
  }
  function slide(o) {              // a sliding scrape (clay) or a short soft squeak / scuff
    var d = clamp(num(o.duration, 0.35), 0.08, 4), hard = o.surface === 'hard', grass = o.surface === 'grass';
    voice(function (v) {
      if (hard || grass) {
        var s = clamp(d * 0.4, 0.08, 0.15);
        noise(v, { type: hard ? 'bandpass' : 'lowpass', f: hard ? 1800 : 900, peak: hard ? 0.12 : 0.2,
          atk: 0.015, dur: s });
        if (hard) tone(v, { f: [1700, 2300], peak: 0.08, atk: 0.01, dur: s });
        return;
      }
      var n = Math.ceil(d * 90) + 3, c = new Float32Array(n), a = Math.min(0.05, d / 4), r = Math.min(0.2, d / 2), x, i;
      for (i = 0; i < n; i++) {    // clay: attack-sustain-release shape x a random flutter = grit
        x = i / (n - 1) * d;
        c[i] = Math.max(0.0001, Math.min(1, x / a, (d - x) / r)) * rnd(0.5, 1) * 0.23;
      }
      noise(v, { f: [3600, 2300], q: 1.1, curve: c, dur: d });
    });
  }

  // ---- crowd -----------------------------------------------------------------------------------
  // Murmur: a looping pink-noise bed through a bandpass, its level wobbled by two slow LFOs.
  function crowdStart() {
    if (!ready() || crowd) return;   // never stack a second loop
    try {
      var t = ctx.currentTime, all = [], mk = function (n) { all.push(n); return n; };
      var src = mk(ctx.createBufferSource()), bp = mk(ctx.createBiquadFilter());
      var wob = mk(ctx.createGain()), lvl = mk(ctx.createGain());
      var lfos = [[rnd(0.07, 0.13), 0.2], [rnd(0.21, 0.37), 0.1]].map(function (c) {   // two slow LFOs, odd rates
        var osc = mk(ctx.createOscillator()), depth = mk(ctx.createGain());
        osc.frequency.value = c[0]; depth.gain.value = c[1];
        osc.connect(depth); depth.connect(wob.gain);   // adds to wob's own 0.7
        return osc;
      });
      src.buffer = pink; src.loop = true;
      bp.type = 'bandpass'; bp.frequency.value = 560; bp.Q.value = 0.6; wob.gain.value = 0.7;
      lvl.gain.setValueAtTime(0.0001, t); lvl.gain.setTargetAtTime(CROWD_GAIN, t, 0.3);   // fade in over ~1 s
      src.connect(bp); bp.connect(wob); wob.connect(lvl); lvl.connect(master);
      src.onended = function () { drop(all); };
      src.start(t, rnd(0, 1.5));
      lfos.forEach(function (osc) { osc.start(t); });
      crowd = { lvl: lvl, stops: lfos.concat(src) };
    } catch (e) { bug(e); }
  }
  function crowdStop() {
    var c = crowd; crowd = null;
    if (!c) return;
    try {
      var t = ctx.currentTime;
      c.lvl.gain.setTargetAtTime(0.0001, t, 0.09);     // gone in 0.5 s
      c.stops.forEach(function (s) { s.stop(t + 0.5); });
    } catch (e) { bug(e); }
  }

  // Stop the crowd and every sound that is still playing (the app closes the game).
  function silence() {
    crowdStop();
    srcs.slice().forEach(function (s) { try { s.stop(); } catch (e) { /* already ended */ } });
  }

  // Applause: fill a buffer with many 4-14 ms decaying noise clicks at random times and levels,
  // then play it through a 1-2.6 kHz bandpass. Fast rise, a plateau, then the slower decay.
  function claps(v, level) {
    var sr = ctx.sampleRate, dur = 0.85 + 2.9 * level, n = Math.floor(dur * sr), t = v.t, i, j, s, len, e, r, pk = 0;
    var count = Math.round(dur * (100 + 400 * level)), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0);
    for (i = 0; i < count; i++) {
      s = Math.floor((Math.random() < 0.5 ? 1 - Math.sqrt(Math.random()) : Math.random()) * (n - 1));  // thins out
      len = Math.floor(rnd(0.004, 0.014) * sr);
      e = 0.1 + 0.9 * Math.pow(Math.random(), 2);          // this clap's level
      r = Math.exp(-4 / len);                              // per-sample decay
      for (j = 0; j < len && s + j < n; j++, e *= r) d[s + j] += (Math.random() * 2 - 1) * e;
    }
    for (i = 0; i < n; i++) pk = Math.max(pk, Math.abs(d[i]));
    for (i = 0; i < n; i++) d[i] /= pk || 1;
    var src = v.add(ctx.createBufferSource()), f = v.add(ctx.createBiquadFilter()), g = v.add(ctx.createGain());
    src.buffer = buf;
    f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.9;
    env(g.gain, t, 0.82 + 0.26 * level, Math.min(0.25, dur * 0.12), dur, dur * 0.5);   // the bandpass keeps a third
    src.connect(f); f.connect(g); g.connect(v.out);
    v.run(src, t, t + dur + 0.02);
  }
  function applause(o) { voice(function (v) { claps(v, clamp(num(o.level, 0.6), 0, 1)); }); }
  function cheer(o) {              // applause plus a short noisy "yeah" swell
    var lv = clamp(num(o.level, 0.7), 0, 1);
    voice(function (v) {
      claps(v, lv);
      noise(v, { pink: true, f: [600, 1100], q: 1.2, peak: 2 + 0.6 * lv, atk: 0.2, dur: 0.6 });
    });
  }
  function ooh() {                 // a gentle crowd "ooh" for a close call, 420 -> 640 -> 480 Hz
    voice(function (v) {
      noise(v, { pink: true, f: [420, 640, 480], q: 4, peak: 0.72, atk: 0.3, dur: 1, rel: 0.5 });
    });
  }

  // ---- score and interface ---------------------------------------------------------------------
  var CHIMES = {                   // note frequencies (Hz), gap between notes (s), ring (s), loudness
    point: { f: [659.3, 987.8], gap: 0.09, ring: 0.9, gain: 0.085 },               // E5 + B5, a fifth apart
    game: { f: [523.3, 659.3, 784], gap: 0.085, ring: 1.0, gain: 0.072 },          // C5 E5 G5, rising
    set: { f: [523.3, 659.3, 784, 1046.5], gap: 0.075, ring: 1.3, gain: 0.055 }    // a C major arpeggio
  };
  function chime(o) {              // a soft score-change chime
    var c = o.kind === 'set' ? CHIMES.set : o.kind === 'game' ? CHIMES.game : CHIMES.point;
    voice(function (v) {
      c.f.forEach(function (f, i) {  // a sine plus a faint octave: warm and bell-like, not arcade
        tone(v, { f: f, peak: c.gain, atk: 0.006, dur: c.ring, at: i * c.gap });
        tone(v, { f: f * 2, peak: c.gain * 0.2, atk: 0.006, dur: c.ring * 0.5, at: i * c.gap });
      });
      if (o.kind === 'set') tone(v, { f: 261.6, peak: 0.04, atk: 0.03, dur: 1.5 });   // soft low C
    });
  }
  function ui(o) {                 // tiny interface click
    voice(function (v) {
      noise(v, { f: 3200, q: 1.5, peak: 0.05, dur: 0.008 });
      if (o.kind === 'confirm') {
        tone(v, { f: 740, peak: 0.078, dur: 0.1 });
        tone(v, { f: 988, peak: 0.078, dur: 0.14, at: 0.06 });
      } else if (o.kind === 'back') tone(v, { f: [700, 480], peak: 0.078, dur: 0.12 });
      else tone(v, { f: [1100, 900], peak: 0.078, dur: 0.07 });
    });
  }

  // ---- public API: no-ops before unlock(), never throws ----------------------------------------
  function safe(fn) { return function (o) { try { fn(o || {}); } catch (e) { bug(e); } }; }
  var api = {
    unlock: unlock, useContext: useContext, hasContext: hasContext, silence: silence, setMuted: setMuted, isMuted: isMuted, setVolume: setVolume,
    hit: safe(hit), whoosh: safe(whoosh), bounce: safe(bounce), net: safe(net), step: safe(step),
    slide: safe(slide), crowdStart: crowdStart, crowdStop: crowdStop, applause: safe(applause),
    ooh: safe(ooh), cheer: safe(cheer), chime: safe(chime), ui: safe(ui), debug: false
  };
  window.CourtSound = api;
})();

// ═══ cd-base.js ═══
/* Between Sets: a tennis game for the rest between gym sets.
   cd-base.js: the namespace, the court in real numbers, levels, kits, small helpers and the Game shell
   (canvas, camera, loop, lifecycle). cd-physics.js, cd-play.js, cd-draw.js and cd-ui.js add methods to
   Game.prototype, so load this file first. Mount with CourtDuel.mount(element, options).
   App mode: options.host = { left(), sound(), audio(), close() } (see window.BetweenSets at the end of this file). */
(function () {
  'use strict';
  const CD = (window.CourtDuel = window.CourtDuel || {});

  // The court in centimetres (ITF numbers). x runs across (+ is the near player's right), y runs along
  // (0 is the near baseline, L the far one), z is height above the court.
  const C = (CD.C = {
    L: 2377, NET_Y: 1188.5, HS: 411.5, HD: 548.5, SVC: 640,
    NET_C: 91.4, NET_P: 107, POST: 639.9,
    G: 981, R: 3.35, BALL_VIS: 9,
    SIDE: 1060, BACK_NEAR: -900, BACK_FAR: 2377 + 700, WALL_H: 190,
    STEP: 1 / 240
  });
  C.NEAR_SVC = C.NET_Y - C.SVC; // 548.5
  C.FAR_SVC = C.NET_Y + C.SVC;  // 1828.5

  // Surfaces: e = how much bounce the ball keeps, mu = how much speed it keeps along the court.
  CD.SURF = {
    clay: { key: 'clay', label: 'Clay', e: 0.76, mu: 0.6, near: '#A9462A', far: '#C4633E', court: null,
      line: '#F1EADF', mark: [92, 32, 12], dust: [201, 112, 72], slide: true, speck: true, shade: 'rgba(40,10,0,.16)' },
    grass: { key: 'grass', label: 'Grass', e: 0.64, mu: 0.82, near: '#2F5A2D', far: '#4C7A43', court: null,
      line: '#F7F5EF', mark: null, dust: null, slide: false, stripes: true, shade: 'rgba(0,20,0,.18)' },
    hard: { key: 'hard', label: 'Hard', e: 0.76, mu: 0.71, near: '#1F5039', far: '#2E6A4E', court: ['#24507A', '#3A6E9A'],
      line: '#F7F5EF', mark: null, dust: null, slide: false, shade: 'rgba(0,10,20,.18)' }
  };
  CD.SURF_KEYS = ['clay', 'grass', 'hard'];

  // Amir's three levels. ts = game speed (1 is real time), react = seconds before he moves,
  // noise = how wrong his first read is (cm), baseErr/pressErr = error chance calm / under pressure.
  CD.LEVELS = [
    { key: 'easy', label: 'Easy', ts: 0.72, aiSpeed: 560, aiAcc: 2400, react: 0.27, noise: 95, baseErr: 0.08, pressErr: 0.32,
      attack: 0.35, pace: 2100, margin: 120, serveIn: 0.62, serveKmh: [118, 142] },
    { key: 'medium', label: 'Medium', ts: 0.8, aiSpeed: 630, aiAcc: 2900, react: 0.18, noise: 60, baseErr: 0.045, pressErr: 0.24,
      attack: 0.5, pace: 2400, margin: 88, serveIn: 0.65, serveKmh: [140, 168] },
    { key: 'hard', label: 'Hard', ts: 0.88, aiSpeed: 700, aiAcc: 3300, react: 0.12, noise: 32, baseErr: 0.03, pressErr: 0.18,
      attack: 0.6, pace: 2700, margin: 60, serveIn: 0.68, serveKmh: [160, 192] }
  ];

  // Kits. No yellow anywhere (the app's rule), so the ball is white too.
  CD.KIT = {
    you: { shirt: '#F4EFE6', shirtDark: '#D5CBBB', shorts: '#0E4A36', skin: '#C68E68', hair: '#2A1E17', shoe: '#FFFFFF',
      band: '#C7552F', frame: '#1C1C1C', throat: '#C7552F' },
    amir: { shirt: '#0E4A36', shirtDark: '#082F22', shorts: '#F4EFE6', skin: '#B27B56', hair: '#1E1612', shoe: '#FFFFFF',
      cap: '#F4EFE6', frame: '#1C1C1C', throat: '#6DBE95' }
  };
  CD.CROWD = ['#F4EFE6', '#E4DDD1', '#C9C0B2', '#9C9488', '#6B6B6B', '#3A3A3A', '#0E4A36', '#1B7254', '#6DBE95',
    '#C7552F', '#E06B43', '#3E6A92', '#8DB3D6', '#7B3B26', '#2B2B2B', '#FFFFFF', '#A9B7B0', '#4F6F86'];
  CD.SKIN = ['#E8C3A0', '#D6A47F', '#C08A63', '#9C6B4A', '#6E4A33', '#4A3226'];

  const U = (CD.U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    rand: (a, b) => a + Math.random() * (b - a),
    pick: (arr) => arr[(Math.random() * arr.length) | 0],
    chance: (p) => Math.random() < p,
    sgn: (v) => (v < 0 ? -1 : 1),
    smooth: (t) => t * t * (3 - 2 * t),
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    randn() {
      let u = 0, v = 0;
      while (!u) u = Math.random();
      while (!v) v = Math.random();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },
    // A seeded random for the scenery, so the crowd is the same crowd every time.
    rng(seed) {
      let a = seed >>> 0;
      return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    kmh: (cms) => Math.round(cms * 0.036),
    now: () => (window.performance && performance.now ? performance.now() : Date.now()) / 1000,
    load(key, dflt) {
      try {
        const v = window.localStorage.getItem('courtduel.' + key);
        return v == null ? dflt : JSON.parse(v);
      } catch (e) { return dflt; }
    },
    save(key, val) {
      try {
        if (val == null) window.localStorage.removeItem('courtduel.' + key);
        else window.localStorage.setItem('courtduel.' + key, JSON.stringify(val));
      } catch (e) { /* private mode or blocked storage: the game still runs */ }
    },
    reduced() {
      try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
    },
    esc: (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]))
  });

  CD.makePlayer = function (i) {
    return {
      i, mir: i === 0 ? 1 : -1, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0, setT: 0, runPhase: 0, sliding: 0, slideAt: -9,
      kit: i === 0 ? CD.KIT.you : CD.KIT.amir, swing: null, act: null, actT: 0, splitT: -9, stepAcc: 0,
      plan: null, frozen: false, sprinting: false, lastDir: 0
    };
  };
  CD.makeBall = function () {
    return {
      x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, px: 0, py: 0, pz: 0, g: C.G, spin: 0, live: false, inPlay: false,
      bounces: 0, lastHit: -1, serve: false, serveFlight: false, box: null, netted: false, netCord: false,
      rolling: false, trail: [], speed: 0, held: -1, kind: ''
    };
  };

  class Game {
    constructor(root, opts) {
      this.o = Object.assign({
        player: 'You', opponent: 'Amir', level: null, surface: null, sound: false, haptics: true,
        restDemo: true, onEvent: null, host: null
      }, opts || {});
      this.host = this.o.host || null;          // app mode: the app owns the rest clock, the sound and the ✕
      if (this.host) this.o.restDemo = false;
      const saved = U.load('settings', {}) || {};
      this.levelIdx = U.clamp(this.o.level != null ? this.o.level : saved.level != null ? saved.level : 1, 0, 2);
      const sk = this.o.surface || saved.surface;
      this.surface = CD.SURF[sk] ? sk : 'clay';
      this.restPick = saved.rest != null ? saved.rest : 0;
      this.soundOn = this.host ? this.hostSound() : saved.sound != null ? !!saved.sound : !!this.o.sound;
      this.root = root;
      this.reduced = U.reduced();
      this.dpr = Math.min(2, window.devicePixelRatio || 1);
      this.listeners = {};
      this.time = 0; this.acc = 0; this.rt = 0; this.speedMul = 1;
      this.state = 'menu'; this.paused = false; this.mode = 'match'; this.m = null;
      this.ts = CD.LEVELS[this.levelIdx].ts;
      this.P = [CD.makePlayer(0), CD.makePlayer(1)];
      this.ball = CD.makeBall();
      this.fx = { marks: [], slides: [], dust: [], pops: [], flashes: [] };
      this.input = { tx: 0, keys: {}, touches: {}, kb: false, dragged: false };
      this.ring = null; this.pred = null; this.srv = null; this.rest = null; this.restLocked = false;
      this.hints = { drag: false, ring: false };
      this.buildDom();                       // cd-ui.js
      this.ctx = this.cv.getContext('2d');
      this.bg = document.createElement('canvas');
      this.netCv = document.createElement('canvas');
      this.bindInput();                      // cd-play.js
      this.idlePositions();                  // cd-play.js
      if (window.ResizeObserver) { this._ro = new ResizeObserver(() => this.layout()); this._ro.observe(this.root); }
      else { this._onResize = () => this.layout(); window.addEventListener('resize', this._onResize); }
      this._vis = () => { if (document.hidden) this.autoPause(); else this.tickRest(); };
      document.addEventListener('visibilitychange', this._vis);
      window.addEventListener('pageshow', this._vis);
      this.onScreen = true;
      if (window.IntersectionObserver) {
        this._io = new IntersectionObserver((es) => { this.onScreen = es.some((e) => e.isIntersecting); });
        this._io.observe(this.root);
      }
      this.layout(true);
      if (document.fonts && document.fonts.load) {
        Promise.all([document.fonts.load('700 20px "Barlow Condensed"'), document.fonts.load('600 14px "Barlow"')])
          .then(() => { if (this.dead) return; this.fontsReady = true; this.layout(true); }).catch(() => {});
      }
      this.showMenu();                       // cd-ui.js
      this._frame = (t) => this.frame(t);
      this.raf = requestAnimationFrame(this._frame);
    }

    lv() { return CD.LEVELS[this.levelIdx]; }

    // App mode: the host's answers, each safe if the host throws. left() is whole seconds, or null while the rest is paused.
    hostSound() { try { return !!(this.host && this.host.sound && this.host.sound()); } catch (e) { return false; } }
    hostAudio() { try { return (this.host && this.host.audio && this.host.audio()) || null; } catch (e) { return null; } }
    hostLeft() {
      try {
        const v = this.host && this.host.left ? this.host.left() : null;
        return v == null || !isFinite(+v) ? null : Math.max(0, +v);
      } catch (e) { return null; }
    }

    // The camera: a pinhole behind the near baseline with an upright picture plane, solved so the near
    // singles court fills most of the width and the far baseline sits about a quarter of the way down.
    layout(force) {
      const r = this.root.getBoundingClientRect();
      const W = Math.max(240, Math.round(r.width)), H = Math.max(320, Math.round(r.height));
      this.root.classList.toggle('cd-narrow', W < 380);
      this.root.classList.toggle('cd-short', H < 560);
      if (!force && this.cam && this.cam.W === W && this.cam.H === H) return;
      const dpr = this.dpr;
      [this.cv, this.bg, this.netCv].forEach((cv) => { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); });
      this.cv.style.width = W + 'px';
      this.cv.style.height = H + 'px';
      const portrait = W / H < 0.85;
      const D = 1700;
      const singlesPx = portrait ? 0.9 * W : Math.min(0.78 * W, 0.98 * H);
      const aW = singlesPx * C.HD / C.HS;
      const Yn = H * (portrait ? 0.735 : 0.8), Yf = H * (portrait ? 0.275 : 0.34);
      const f = aW * D / (2 * C.HD);
      const Hc = (Yn - Yf) * (2 * C.HD) * (D + C.L) / (aW * C.L);
      const hy = Yn - Hc * f / D;
      this.cam = { W, H, D, f, Hc, hy, cx: W / 2, portrait };
      this.cam.yBottom = Hc * f / (H - hy) - D;   // court depth at the bottom edge of the screen
      this.buildScene();                     // cd-draw.js
      if (this.paused || this.state === 'menu') this.draw(0);
    }
    proj(x, y, z) {
      const c = this.cam, s = c.f / (c.D + y);
      return [c.cx + x * s, c.hy + (c.Hc - z) * s, s];
    }
    sAt(y) { return this.cam.f / (this.cam.D + y); }
    worldX(sx, y) { return (sx - this.cam.cx) / this.sAt(y); }

    frame(t) {
      if (this.dead) return;
      this.raf = requestAnimationFrame(this._frame);
      const now = t / 1000;
      let dt = this.lastT == null ? 0 : now - this.lastT;
      this.lastT = now;
      if (dt > 0.1) dt = 0.1;
      if (dt < 0) dt = 0;
      this.tickRest();                       // cd-play.js (real time, keeps running when paused)
      if (!this.onScreen) return;
      if (!this.paused) { this.rt += dt; this.rtWall = U.now(); this.update(dt); }     // cd-play.js
      else if ((this.pauseFrames = (this.pauseFrames || 0) + 1) % 8) { this.paintHud(); return; }
      this.draw(dt);                         // cd-draw.js
      this.paintHud();                       // cd-ui.js
    }

    on(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); return this; }
    emit(type, data) {
      (this.listeners[type] || []).forEach((fn) => { try { fn(data); } catch (e) { /* a host error never stops the game */ } });
      if (this.o.onEvent) { try { this.o.onEvent(type, data); } catch (e) { /* same */ } }
    }
    sfx(name, arg) {
      const S = window.CourtSound;
      if (this.host) this.soundOn = this.hostSound();    // the rest timer's speaker decides
      if (!S || !this.soundOn || typeof S[name] !== 'function') return;
      try { S[name](arg || {}); } catch (e) { /* sound is optional */ }
    }
    // Make the sound ready: our own context standalone, the host's in app mode (never a second one). True when it can play.
    audioReady() {
      const S = window.CourtSound;
      if (!S) return false;
      try {
        if (this.host) { S.useContext(this.hostAudio()); if (!S.hasContext()) return false; }
        return S.unlock() !== false;
      } catch (e) { return false; }
    }
    unlockAudio() {
      const S = window.CourtSound;
      if (this.host) this.soundOn = this.hostSound();
      if (!S || !this.soundOn) return;
      try {
        if (!this.audioReady()) return;
        if (!this._crowd && this.state !== 'menu' && !this.timedOut) { S.crowdStart(); this._crowd = true; }
      } catch (e) { /* optional */ }
    }
    buzz(ms) {
      if (!this.o.haptics) return;
      try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* not on iPhone */ }
    }
    destroy() {
      this.dead = true;
      cancelAnimationFrame(this.raf);
      if (this._ro) this._ro.disconnect();
      if (this._io) this._io.disconnect();
      if (this._onResize) window.removeEventListener('resize', this._onResize);
      document.removeEventListener('visibilitychange', this._vis);
      window.removeEventListener('pageshow', this._vis);
      if (this.unbindInput) this.unbindInput();
      try {                                 // the crowd and every sound still playing, whether or not sound is on now
        const S = window.CourtSound;
        if (S) { if (this.host && S.silence) S.silence(); else S.crowdStop(); }
      } catch (e) { /* optional */ }
      this.root.innerHTML = '';
      this.root.classList.remove('cd-root');
    }
  }
  CD.Game = Game;

  // The host's door. The app would call setRest(seconds) when a rest starts and pause() when it ends early.
  CD.mount = function (root, opts) {
    const g = new Game(root, opts);
    return {
      game: g,
      pause: () => g.autoPause(),
      resume: () => g.resumeGame(),
      setRest: (sec) => g.setRest(sec),
      on: (type, fn) => { g.on(type, fn); },
      destroy: () => g.destroy()
    };
  };
})();

// ═══ cd-physics.js ═══
/* Between Sets: cd-physics.js. The ball: flight, the net, bounces, line calls, prediction and the shot
   planner. One fixed step (C.STEP) is used by the game and by the prediction, so what the AI and the
   timing ring expect is what happens. */
(function () {
  'use strict';
  const CD = window.CourtDuel, C = CD.C, U = CD.U, G = CD.Game.prototype;

  // Net height at x: 91.4 cm in the middle, 107 cm at the posts.
  G.netH = function (x) {
    const k = Math.min(1, (x / C.POST) * (x / C.POST));
    return C.NET_C + (C.NET_P - C.NET_C) * k;
  };

  G.stepBall = function (dt) {
    const b = this.ball;
    b.px = b.x; b.py = b.y; b.pz = b.z;
    if (b.rolling) {
      const k = Math.max(0, 1 - 1.6 * dt);
      b.vx *= k; b.vy *= k; b.x += b.vx * dt; b.y += b.vy * dt; b.z = C.R;
      this.wallBounce();
      return;
    }
    b.vz -= b.g * dt;
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (!b.netted && !b.netCord && (b.py - C.NET_Y) * (b.y - C.NET_Y) < 0) {
      const k = (C.NET_Y - b.py) / (b.y - b.py), zx = b.pz + (b.z - b.pz) * k, xx = b.px + (b.x - b.px) * k;
      if (Math.abs(xx) < C.POST && zx - C.R < this.netH(xx)) this.netHit(xx, zx);
    }
    if (b.z <= C.R && b.vz < 0) this.bounceBall();
    this.wallBounce();
  };

  // A dead ball that reaches the fence drops back instead of flying off the screen.
  G.wallBounce = function () {
    const b = this.ball;
    if (b.y < C.BACK_NEAR + 20 && b.vy < 0) { b.vy = -b.vy * 0.25; b.vx *= 0.5; }
    if (b.y > C.BACK_FAR - 20 && b.vy > 0) { b.vy = -b.vy * 0.25; b.vx *= 0.5; }
    if (Math.abs(b.x) > C.SIDE - 20 && b.x * b.vx > 0) { b.vx = -b.vx * 0.25; b.vy *= 0.5; }
  };

  G.netHit = function (xx, zx) {
    const b = this.ball, h = this.netH(xx), dir = b.vy > 0 ? 1 : -1;
    this.sfx('net');
    if (zx > h - 5 && b.inPlay && U.chance(0.45)) {
      // Off the tape and over: the ball loses most of its pace and dribbles on.
      b.netCord = true; b.x = xx; b.y = C.NET_Y + dir * 2;
      b.vy *= 0.3; b.vx *= 0.55; b.vz = Math.abs(b.vz) * 0.15 + 80; b.z = Math.max(b.z, h + C.R + 1);
      this.pred = this.predict(); this.pred.base = b.bounces;
      if (this.onNetCord) this.onNetCord();
    } else {
      b.netted = true; b.x = xx; b.y = C.NET_Y - dir * 3; b.z = Math.min(zx, h - 2);
      b.vy = -b.vy * 0.1; b.vx *= 0.3; b.vz = Math.min(b.vz, 0) * 0.2;
      if (this.onNetted) this.onNetted();
    }
  };

  G.bounceBall = function () {
    const b = this.ball, s = CD.SURF[this.surface];
    const vin = Math.hypot(b.vx, b.vy, b.vz);
    b.z = C.R;
    b.vz = -b.vz * s.e * (1 + 0.1 * b.spin);
    const fr = U.clamp(s.mu + 0.06 * b.spin, 0.4, 0.95);
    b.vx *= fr; b.vy *= fr;
    b.g = C.G * (1 + 0.25 * Math.max(-0.5, b.spin));
    b.spin *= 0.5;
    b.bounces++;
    if (b.vz < 45) { b.vz = 0; b.rolling = true; }
    this.onBounce(b.x, b.y, vin);            // cd-play.js: the rules
  };

  // Simulates the ball forward with the game's own step. Samples every second step, notes the first two
  // bounces, stops at the net, a second bounce or maxT seconds. base = bounces already made this flight.
  G.predict = function (maxT) {
    const b = this.ball, s = CD.SURF[this.surface], dt = C.STEP;
    const out = { pts: [], b1: null, b2: null, net: false, t0: this.time, base: b.bounces };
    let x = b.x, y = b.y, z = b.z, vx = b.vx, vy = b.vy, vz = b.vz, g = b.g, spin = b.spin, n = 0;
    let netDone = b.netted || b.netCord, t = 0, i = 0;
    const T = maxT || 3.4;
    if (b.rolling) return out;
    while (t < T) {
      const px = x, py = y, pz = z;
      vz -= g * dt; x += vx * dt; y += vy * dt; z += vz * dt; t += dt; i++;
      if (!netDone && (py - C.NET_Y) * (y - C.NET_Y) < 0) {
        const k = (C.NET_Y - py) / (y - py), zx = pz + (z - pz) * k, xx = px + (x - px) * k;
        if (Math.abs(xx) < C.POST && zx - C.R < this.netH(xx)) { out.net = true; break; }
        netDone = true;
      }
      if (z <= C.R && vz < 0) {
        z = C.R; vz = -vz * s.e * (1 + 0.1 * spin);
        const fr = U.clamp(s.mu + 0.06 * spin, 0.4, 0.95);
        vx *= fr; vy *= fr; g = C.G * (1 + 0.25 * Math.max(-0.5, spin)); spin *= 0.5; n++;
        if (!out.b1) out.b1 = { t, x, y };
        else { out.b2 = { t, x, y }; break; }
        if (vz < 45) { out.b2 = { t, x, y }; break; }
      }
      if (i % 2 === 0) out.pts.push({ t, x, y, z, vz, n });
    }
    return out;
  };

  // How far back and forward a player may go. The near player stays where the camera can see the feet.
  G.depthLim = function (p) {
    if (p.i === 0) return { min: Math.max(this.cam ? this.cam.yBottom + 95 : -320, -430), max: C.NET_Y - 110 };
    return { min: C.NET_Y + 160, max: C.L + 520 };
  };

  // Where p should meet the ball: after its first bounce on p's side, at a comfortable height, inside p's
  // depth limits. Prefers the ball dropping through about waist height, then the top of the bounce, then
  // taking it early on the rise. Returns { t: seconds from now, x, y, z } or null.
  G.contactFor = function (p, pred) {
    pred = pred || this.pred;
    if (!pred) return null;
    const near = p.i === 0, lim = this.depthLim(p), age = this.time - pred.t0;
    let best = null, peak = null, early = null;
    for (let k = 0; k < pred.pts.length; k++) {
      const q = pred.pts[k];
      if (q.t < age) continue;
      const bounced = pred.base + q.n;
      if (bounced < 1) continue;
      if (bounced > 1) break;
      if (near ? q.y >= C.NET_Y : q.y <= C.NET_Y) continue;
      if (near ? q.y < lim.min + 35 : q.y > lim.max - 35) break;
      if (q.z > 255) continue;
      if (q.z < 14) { if (peak) break; continue; }
      if (!early) early = q;
      if (!peak || q.z > peak.z) peak = q;
      if (q.vz < 0 && q.z <= 125) { best = q; break; }
    }
    const pick = best || peak || early;
    if (!pick) return null;
    return { t: pick.t - age, x: pick.x, y: pick.y, z: pick.z };
  };

  // Launch velocity that lands the ball at (tx, ty). pace = speed along the court (cm/s), spin from -0.6
  // (slice, floats) to 1.2 (heavy topspin, dips). The flight is slowed until it clears the net by `clear`.
  // The formulas include the half-step of the integrator, so the ball lands where it was aimed.
  G.planShot = function (from, tx, ty, o) {
    const dx = tx - from.x, dy = ty - from.y, dist = Math.hypot(dx, dy) || 1, h = C.STEP;
    const spin = o.spin || 0, g = C.G * (o.gMul || 1 + 0.6 * spin);
    const clear = o.clear != null ? o.clear : 30;
    const crosses = (from.y - C.NET_Y) * (ty - C.NET_Y) < 0;
    let T = dist / o.pace, vz = 0;
    for (let i = 0; i < 60; i++) {
      vz = (C.R - from.z + 0.5 * g * T * (T + h)) / T;
      if (!crosses) break;
      const tn = (C.NET_Y - from.y) / (dy / T);
      const zn = from.z + vz * tn - 0.5 * g * tn * (tn + h), xn = from.x + (dx / T) * tn;
      if (zn - C.R >= this.netH(xn) + clear) break;
      T *= 1.05;
    }
    return { vx: dx / T, vy: dy / T, vz, g, spin, T };
  };

  // The same shot sent into the tape: an error into the net.
  G.planNet = function (from, tx, ty, o) {
    const p = this.planShot(from, tx, ty, Object.assign({}, o, { clear: 0 })), h = C.STEP;
    const tn = (C.NET_Y - from.y) / p.vy, xn = from.x + p.vx * tn, zt = this.netH(xn) - U.rand(12, 38);
    p.vz = (zt - from.z + 0.5 * p.g * tn * (tn + h)) / tn;
    return p;
  };

  G.launch = function (who, from, plan, meta) {
    const b = this.ball;
    b.x = from.x; b.y = from.y; b.z = from.z; b.px = b.x; b.py = b.y; b.pz = b.z;
    b.vx = plan.vx; b.vy = plan.vy; b.vz = plan.vz; b.g = plan.g; b.spin = plan.spin;
    b.live = true; b.inPlay = true; b.bounces = 0; b.lastHit = who; b.netted = false; b.netCord = false;
    b.rolling = false; b.held = -1; b.serveFlight = false;
    b.serve = !!(meta && meta.serve); b.box = (meta && meta.box) || null; b.kind = (meta && meta.kind) || 'drive';
    b.speed = Math.hypot(plan.vx, plan.vy, plan.vz);
    this.flightBounce = null;
    this.pred = this.predict();
    const b1 = this.pred.b1;
    this.flightIn = !!b1 && !this.pred.net && this.lineCall(b1.x, b1.y, who, b.box).inn;
  };

  // The call for a bounce at (x, y) from `hitter` (box = the service box for a serve). Lines are in, so a
  // ball whose edge touches the outside edge of a line is in. Returns { inn, m: margin in cm (minus = out),
  // axis, edge, w: line width, inDir } for the deciding line, which the mark check draws.
  G.lineCall = function (x, y, hitter, box) {
    const R = C.R, list = [];
    if (box) {
      if (box.far ? y < C.NET_Y : y > C.NET_Y) return { inn: false, m: -99, axis: 'y', edge: C.NET_Y, w: 0, inDir: 1 };
      list.push({ m: x - (box.x0 - R), axis: 'x', edge: box.x0, w: 5, inDir: 1 });
      list.push({ m: box.x1 + R - x, axis: 'x', edge: box.x1, w: 5, inDir: -1 });
      if (box.far) list.push({ m: box.y1 + R - y, axis: 'y', edge: box.y1, w: 5, inDir: -1 });
      else list.push({ m: y - (box.y0 - R), axis: 'y', edge: box.y0, w: 5, inDir: 1 });
    } else {
      if (hitter === 0 ? y < C.NET_Y : y > C.NET_Y) return { inn: false, m: -99, axis: 'y', edge: C.NET_Y, w: 0, inDir: 1 };
      list.push({ m: x - (-C.HS - R), axis: 'x', edge: -C.HS, w: 5, inDir: 1 });
      list.push({ m: C.HS + R - x, axis: 'x', edge: C.HS, w: 5, inDir: -1 });
      if (hitter === 0) list.push({ m: C.L + R - y, axis: 'y', edge: C.L, w: 10, inDir: -1 });
      else list.push({ m: y + R, axis: 'y', edge: 0, w: 10, inDir: 1 });
    }
    let worst = list[0];
    for (let i = 1; i < list.length; i++) if (list[i].m < worst.m) worst = list[i];
    return Object.assign({ inn: worst.m >= 0 }, worst);
  };

  // The service box that `who` serves into from the deuce or ad side. The centre service line belongs to
  // both boxes, so each box runs to its far edge (x = +-2.5).
  G.serveBox = function (who, side) {
    const deuce = side === 'deuce';
    if (who === 0) {
      return deuce ? { x0: -C.HS, x1: 2.5, y0: C.NET_Y, y1: C.FAR_SVC, far: true, outer: -1 }
        : { x0: -2.5, x1: C.HS, y0: C.NET_Y, y1: C.FAR_SVC, far: true, outer: 1 };
    }
    return deuce ? { x0: -2.5, x1: C.HS, y0: C.NEAR_SVC, y1: C.NET_Y, far: false, outer: 1 }
      : { x0: -C.HS, x1: 2.5, y0: C.NEAR_SVC, y1: C.NET_Y, far: false, outer: -1 };
  };
})();

// ═══ cd-play.js ═══
/* Between Sets: cd-play.js. Input, the flow of a point, serving, contact and shot choice (yours and
   Amir's), the rules, Fast4 scoring (first to 4 games, no-ad deciding point, tiebreak to 5 at 3-3), the
   rally drill, the rest timer, saving, and a test bot. */
(function () {
  'use strict';
  const CD = window.CourtDuel, C = CD.C, U = CD.U, G = CD.Game.prototype;
  const REST_SECS = (CD.REST_SECS = [0, 60, 90, 120]);

  // Amir's lines. Plain words, short. He reads these before the game ships.
  CD.LINES = {
    perfect: ["That's the one.", 'Clean. Again.', 'Early prep. Big ball.', 'Feet first, then the ball. Yes.'],
    late: ['Get there early.', 'Move first, then hit.', 'Split step, then go.', 'Small steps. Be set.'],
    ace: ['Big serve.', 'Nothing I could do there.'],
    double: ['Breathe. Same toss.', 'Slow it down. Same toss.'],
    rally: ['Good legs. Keep that.', 'Long point. Nice work.'],
    gameYou: ['Your game. Keep going.', 'Good game.'],
    gameAmir: ['My game. Stay with me.', 'One game. Plenty left.'],
    setYou: ['You beat me. Good work.', 'Great set. Now lift.'],
    setAmir: ['Close. Run it back next rest.', 'Good fight. Back to work.'],
    drill: { 10: 'Ten. Nice rhythm.', 20: 'Twenty. Locked in.', 30: 'Thirty. That is focus.', 50: 'Fifty. I am impressed.' },
    rest10: ['10 seconds. Finish the point.']
  };

  function newStats() {
    return {
      won: [0, 0], winners: 0, errors: 0, aces: 0, doubles: 0, firstIn: 0, firstTot: 0, longest: 0, fastServe: 0,
      fastShot: 0, shots: 0, setEarly: 0, setSum: 0, perfect: 0, dist: 0, sprints: 0, cods: 0, aiWinners: 0, aiErrors: 0
    };
  }
  CD.newStats = newStats;

  /* ---------------- input ---------------- */
  G.bindInput = function () {
    const el = this.cv, root = this.root, opt = { passive: false };
    const h = {
      pd: (e) => this.onDown(e), pm: (e) => this.onMove(e), pu: (e) => this.onUp(e),
      kd: (e) => this.onKey(e, true), ku: (e) => this.onKey(e, false), blur: () => { this.input.keys = {}; }
    };
    el.addEventListener('pointerdown', h.pd, opt);
    el.addEventListener('pointermove', h.pm, opt);
    el.addEventListener('pointerup', h.pu, opt);
    el.addEventListener('pointercancel', h.pu, opt);
    root.addEventListener('keydown', h.kd);
    root.addEventListener('keyup', h.ku);
    window.addEventListener('blur', h.blur);
    this.unbindInput = () => {
      el.removeEventListener('pointerdown', h.pd, opt);
      el.removeEventListener('pointermove', h.pm, opt);
      el.removeEventListener('pointerup', h.pu, opt);
      el.removeEventListener('pointercancel', h.pu, opt);
      root.removeEventListener('keydown', h.kd);
      root.removeEventListener('keyup', h.ku);
      window.removeEventListener('blur', h.blur);
    };
  };
  G.local = function (e) { const r = this.cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  G.playing = function () { return this.state !== 'menu' && this.state !== 'over' && !this.paused && !this.sheetOpen; };

  G.onDown = function (e) {
    if (e.cancelable) e.preventDefault();
    try { this.root.focus({ preventScroll: true }); } catch (err) { /* old browsers */ }
    this.unlockAudio();
    if (!this.playing()) return;
    const pt = this.local(e);
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      this.input.mouse = true;
      this.setMouseTarget(pt.x);
      this.tap();
      return;
    }
    try { this.cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    this.input.mouse = false;
    const ring = this.ring, had = !!(ring && ring.tapAt);
    this.input.touches[e.pointerId] = { x: pt.x, x0: pt.x, t0: this.rtNow(), ringTap: null };
    this.tap();
    if (this.ring && this.ring.tapAt && !had) this.input.touches[e.pointerId].ringTap = this.ring;
  };
  // Touch is relative: drag anywhere and your player runs by that much (your thumb never covers them).
  // The mouse is absolute: your player runs to the pointer.
  G.onMove = function (e) {
    if (!this.playing()) return;
    const pt = this.local(e);
    if (e.pointerType === 'mouse') { this.input.mouse = true; this.setMouseTarget(pt.x); return; }
    const t = this.input.touches[e.pointerId];
    if (!t) return;
    if (e.cancelable) e.preventDefault();
    const dx = pt.x - t.x;
    t.x = pt.x;
    if (t.ringTap && t.ringTap === this.ring && !this.ring.done && Math.abs(pt.x - t.x0) > 10 && this.rtNow() - t.t0 < 0.18) { this.ring.tapAt = 0; t.ringTap = null; }
    const s = this.sAt(this.P[0].y);
    this.input.tx = U.clamp(this.input.tx + (dx / s) * 1.7, -C.HD - 170, C.HD + 170);
    if (dx) this.hints.drag = true;
  };
  G.onUp = function (e) { delete this.input.touches[e.pointerId]; };
  G.setMouseTarget = function (sx) {
    const tx = U.clamp(this.worldX(sx, this.P[0].y), -C.HD - 170, C.HD + 170);
    if (Math.abs(tx - this.input.tx) > 4) this.hints.drag = true;
    this.input.tx = tx;
  };
  G.onKey = function (e, down) {
    const k = e.key;
    if (k === ' ' || k === 'Enter' || k === 'Spacebar') {
      if (!this.playing()) return;
      e.preventDefault();
      if (down && !e.repeat) { this.unlockAudio(); this.tap(); }
      return;
    }
    if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd' || k === 'A' || k === 'D') {
      if (!this.playing()) return;
      e.preventDefault();
      this.input.keys[k === 'ArrowLeft' || k === 'a' || k === 'A' ? 'L' : 'R'] = down;
      if (down) this.hints.drag = true;
      return;
    }
    if (down && (k === 'p' || k === 'P' || k === 'Escape') && this.state !== 'menu' && this.state !== 'over') {
      e.preventDefault();
      this.togglePause();
    }
  };
  // Real time of "now" between frames, so a tap is timed to the millisecond, not to the frame.
  G.rtNow = function () { return this.rt + Math.max(0, Math.min(0.05, U.now() - (this.rtWall || U.now()))); };

  G.tap = function () {
    if (!this.playing() || this.restLocked) return;
    const sv = this.srv;
    if (this.state === 'serve' && sv) {
      if (sv.kind === 'feed') {
        if (sv.phase === 'wait') { sv.phase = 'ready'; sv.readyAt = this.rt; sv.wait = 0.2; }
        return;
      }
      if (sv.who === 0) {
        if (sv.phase === 'ready') this.toss(0);
        else if (sv.phase === 'toss' && this.time - sv.tossT > 0.2) this.serveTap();
      }
      return;
    }
    if (this.state === 'rally' && this.ring && !this.ring.tapAt && !this.ring.done) {
      this.ring.tapAt = this.rtNow();
      this.hints.ring = true;
    }
  };

  /* ---------------- positions and flow ---------------- */
  G.setPos = function (p, x, y) {
    p.x = p.tx = x; p.y = p.ty = y; p.vx = p.vy = 0; p.setT = 0; p.swing = null; p.plan = null; p.act = null; p.sliding = 0;
  };
  G.idlePositions = function () {
    this.setPos(this.P[0], 0, -110); this.setPos(this.P[1], 0, C.L + 110);
    this.input.tx = 0;
    const b = this.ball; b.live = false; b.inPlay = false; b.held = -1; b.trail.length = 0;
  };
  G.placeForServe = function () {
    const sv = this.srv, d = sv.side === 'deuce' ? 1 : -1, near = this.P[0], far = this.P[1];
    if (sv.who === 0) { this.setPos(near, 70 * d, -26); this.setPos(far, -248 * d, C.L + 125 + this.levelIdx * 15); }
    else { this.setPos(far, -70 * d, C.L + 26); this.setPos(near, 248 * d, -118); }
    this.input.tx = near.x;
    const b = this.ball;
    b.live = false; b.inPlay = false; b.held = sv.who; b.trail.length = 0; b.rolling = false;
    this.ring = null; this.pred = null; this.markCheck = null; this.lastIn = null;
  };

  G.startMatch = function (resume) {
    if (this.restLocked && this.rest && this.rest.done) { this.showLift(); return; }
    let m = resume ? U.load('match', null) : null;
    if (!(m && m.v === 1 && !m.done && Array.isArray(m.games) && Array.isArray(m.pts) && m.stats)) m = null;
    if (m) {
      this.levelIdx = U.clamp(m.level | 0, 0, 2);
      if (CD.SURF[m.surface]) this.surface = m.surface;
    } else {
      m = { v: 1, level: this.levelIdx, surface: this.surface, games: [0, 0], pts: [0, 0], tb: false, tbFirst: 0,
        server: 0, stats: newStats(), points: 0 };
    }
    this.m = m; this.mode = 'match'; this.ts = this.lv().ts;
    this.beginPlay();
    this.startPoint();
    this.emit('start', { mode: 'match', resume: !!resume });
  };
  G.startDrill = function () {
    if (this.restLocked && this.rest && this.rest.done) { this.showLift(); return; }
    this.mode = 'drill'; this.m = null; this.drillCount = 0;
    this.ts = Math.min(this.lv().ts, 0.8);
    this.beginPlay();
    this.startDrillPoint(true);
    this.emit('start', { mode: 'drill' });
  };
  G.beginPlay = function () {
    this.fx.marks.length = 0; this.fx.slides.length = 0; this.fx.pops.length = 0;
    this.buildScene();
    this.closeSheet();
    this.paused = false; this.restLocked = false; this.lastLineAt = -9;
    if (this.o.restDemo) this.setRest(REST_SECS[this.restPick] || 0);
    this.startCrowd();
  };
  G.startDrillPoint = function (first) {
    this.setPos(this.P[0], this.P[0].x * 0.5, -120);
    this.setPos(this.P[1], 0, C.L + 100);
    this.input.tx = this.P[0].x;
    this.srv = { who: 1, kind: 'feed', phase: first ? 'wait' : 'ready', readyAt: this.rt, wait: 0.75 };
    const b = this.ball;
    b.live = false; b.inPlay = false; b.held = 1; b.trail.length = 0;
    this.state = 'serve'; this.rally = 0; this.ring = null; this.markCheck = null; this.lastIn = null;
    this.fx.marks.length = 0;
    this.paintBoard(true);
  };
  G.startPoint = function () {
    const m = this.m, n = m.pts[0] + m.pts[1];
    let server, side;
    if (m.tb) {
      server = n === 0 ? m.tbFirst : Math.floor((n - 1) / 2) % 2 === 0 ? 1 - m.tbFirst : m.tbFirst;
      side = n % 2 === 0 ? 'deuce' : 'ad';
      if (m.pts[0] === 4 && m.pts[1] === 4) side = this.receiverPick(1 - server);
    } else {
      server = m.server;
      side = n % 2 === 0 ? 'deuce' : 'ad';
      if (m.pts[0] === 3 && m.pts[1] === 3) side = this.receiverPick(1 - server);
    }
    this.srv = { who: server, side, faults: 0, phase: 'ready', readyAt: this.rt, wait: U.rand(0.9, 1.4) };
    this.rally = 0;
    this.fx.marks.length = 0;
    this.placeForServe();
    this.state = 'serve';
    this.paintBoard(true);
  };
  // No-ad deciding point: the receiver picks the side. You get the deuce side, Amir picks at random.
  G.receiverPick = function (rcv) { return rcv === 0 ? 'deuce' : U.chance(0.5) ? 'deuce' : 'ad'; };

  /* ---------------- serving ---------------- */
  G.toss = function (who) {
    const sv = this.srv, p = this.P[who], b = this.ball;
    sv.phase = 'toss'; sv.tossT = this.time;
    b.x = p.x + 16 * p.mir; b.y = p.y + (who === 0 ? 6 : -6); b.z = 165;
    b.vx = 0; b.vy = 0; b.vz = 590; b.g = C.G; b.spin = 0;
    b.live = true; b.inPlay = false; b.held = -1; b.bounces = 0; b.serve = false; b.rolling = false;
    b.netted = false; b.netCord = false; b.trail.length = 0;
    // The toss peaks at 342 cm after 0.60 s; the ideal contact is at 262 cm on the way down.
    sv.ideal = this.time + 590 / C.G + Math.sqrt((2 * (165 + (590 * 590) / (2 * C.G) - 262)) / C.G);
    sv.aiOff = U.randn() * 0.02;
    p.swing = { kind: 'serve', t0: this.time, dur: (sv.ideal - this.time) / 0.55, cAt: 0.55, lx: 16, lz: 262 };
    this.sfx('whoosh', { power: 0.15 });
  };
  G.tossCheck = function () {
    const sv = this.srv, b = this.ball;
    if (sv.who === 1) { if (this.time >= sv.ideal + sv.aiOff) this.hitServe(1, 'good'); return; }
    if (this.autoplay && this.time >= sv.ideal + (this.botServeErr || 0)) { this.serveTap(); return; }
    if (b.vz < 0 && b.z < 150) {
      // You let the toss drop. No penalty: toss again.
      sv.phase = 'ready'; sv.readyAt = this.rt;
      b.live = false; b.held = 0; b.trail.length = 0;
      this.P[0].swing = null;
      this.popAt('Toss again', this.P[0].x, this.P[0].y, 220, { size: 18 });
    }
  };
  G.serveTap = function () {
    const sv = this.srv;
    if (!sv || sv.phase !== 'toss') return;
    const tapSim = this.time + (this.rtNow() - this.rt) * this.ts;
    const d = (tapSim - sv.ideal) / this.ts, a = Math.abs(d);
    this.hitServe(0, a <= 0.085 ? 'perfect' : a <= 0.18 ? 'good' : 'mistimed');
  };
  G.hitServe = function (who, grade) {
    const sv = this.srv, p = this.P[who], b = this.ball, lv = this.lv(), first = sv.faults === 0;
    sv.phase = 'hit';
    const pl = this.planeLocal(p, b.x, b.y, b.z);
    const box = this.serveBox(who, sv.side), out = box.outer, toFar = who === 0;
    let pace, spin, gMul, aim, fault;
    if (who === 0) {
      if (first) {
        if (grade === 'perfect') { pace = U.rand(4900, 5350); spin = 0.15; gMul = 2.15; aim = U.pick(['T', 'wide', 'T', 'wide', 'body']); fault = U.chance(0.07); }
        else if (grade === 'good') { pace = U.rand(4300, 4750); spin = 0.25; gMul = 2.0; aim = U.pick(['T', 'wide', 'body']); fault = U.chance(0.16); }
        else { pace = U.rand(4300, 4800); spin = 0.1; gMul = 2.0; aim = 'T'; fault = true; }
      } else {
        pace = U.rand(2900, 3300); spin = 1.0; gMul = 1.75; aim = U.pick(['body', 'T', 'wide']);
        fault = grade === 'mistimed' ? U.chance(0.35) : U.chance(0.03);
      }
    } else {
      const kmh = first ? U.rand(lv.serveKmh[0], lv.serveKmh[1]) : U.rand(112, 138);
      pace = (kmh / 0.036) * 0.98; spin = first ? 0.2 : 1.0; gMul = first ? 2.1 : 1.75;
      aim = U.pick(first ? ['T', 'wide', 'body', 'T'] : ['body', 'T', 'wide']);
      fault = !U.chance(first ? lv.serveIn : 0.95);
    }
    let tx = aim === 'T' ? out * U.rand(15, 45) : aim === 'wide' ? out * (C.HS - U.rand(22, 50)) : out * U.rand(150, 230);
    let ty = toFar ? C.FAR_SVC - U.rand(35, 110) : C.NEAR_SVC + U.rand(35, 110);
    const from = { x: b.x, y: b.y, z: Math.max(200, b.z) };
    let plan;
    if (fault) {
      const kind = U.pick(['net', 'long', 'long', 'wide']), miss = U.chance(0.3) ? U.rand(1.5, 5) : U.rand(14, 70);
      if (kind === 'net') plan = this.planNet(from, tx, ty, { pace, spin, gMul });
      else {
        if (kind === 'long') ty = toFar ? C.FAR_SVC + C.R + miss : C.NEAR_SVC - C.R - miss;
        else tx = out * (C.HS + C.R + miss);
        plan = this.planShot(from, tx, ty, { pace, spin, gMul, clear: 10 });
      }
    } else plan = this.planShot(from, tx, ty, { pace, spin, gMul, clear: first ? 8 : 30 });
    this.launch(who, from, plan, { serve: true, box, kind: 'serve' });
    this.state = 'rally'; this.rally = 0;
    if (p.swing && p.swing.kind === 'serve') {
      p.swing.t0 = this.time - p.swing.cAt * p.swing.dur;
      p.swing.lx = pl.lx; p.swing.lz = pl.lz; p.swing.keys = null;
    }
    this.P[1 - who].splitT = this.time;
    this.sfx('hit', { power: Math.min(1, pace / 5200), kind: 'serve' });
    const kmh = U.kmh(b.speed);
    this.showSpeed(kmh, first ? 'Serve' : '2nd serve');
    if (who === 0) {
      this.buzz(14);
      if (grade === 'perfect' || grade === 'good') this.gradeFx(grade, p);
      if (this.m) { const st = this.m.stats; if (first) st.firstTot++; if (kmh > st.fastServe) st.fastServe = kmh; }
      this.aiPlan();
    } else this.userReady();
  };
  G.drillFeed = function () {
    const p = this.P[1], u = this.P[0];
    this.srv.phase = 'hit';
    const from = { x: p.x - 30, y: p.y - 30, z: 95 };
    const plan = this.planShot(from, U.clamp(u.x + 85, -C.HS + 60, C.HS - 60), U.rand(260, 420), { pace: 1750, spin: 0.45, clear: 45 });
    this.launch(1, from, plan, { kind: 'feed' });
    p.swing = { kind: 'fh', t0: this.time - 0.31, dur: 0.62, cAt: 0.5, lx: 62, lz: 95 };
    this.state = 'rally'; this.rally = 0;
    this.sfx('hit', { power: 0.35, kind: 'drive' });
    this.userReady();
  };

  /* ---------------- the loop ---------------- */
  G.update = function (dt) {
    const tsEff = (this.state === 'menu' ? 0.8 : this.ts) * this.speedMul;
    this.acc += dt * tsEff;
    let n = 0;
    while (this.acc >= C.STEP && n < 160) {
      this.acc -= C.STEP;
      this.rtS = this.rt - this.acc / tsEff;   // the real time of this step, for timing taps
      this.step(C.STEP);
      n++;
    }
    if (n >= 160) this.acc = 0;
    this.frameLogic();
  };
  G.step = function (dt) {
    this.time += dt;
    this.userTarget();
    this.aiThink();
    this.movePlayer(this.P[0], dt);
    this.movePlayer(this.P[1], dt);
    const b = this.ball;
    if (b.live && b.held < 0) {
      this.stepBall(dt);
      if (this.state === 'rally' && b.inPlay) {
        this.checkContact(this.P[0]);
        if (b.inPlay && this.state === 'rally') this.checkContact(this.P[1]);
        if (b.inPlay && this.state === 'rally') this.checkBounds();
      } else if (this.state === 'serve' && this.srv && this.srv.phase === 'toss') this.tossCheck();
    }
    this.stepFx(dt);                         // cd-draw.js
    for (let i = 0; i < 2; i++) {
      const p = this.P[i];
      if (p.act && this.time - p.actT > 1.3) p.act = null;
      if (p.swing && (this.time - p.swing.t0) / p.swing.dur > 1.04) p.swing = null;
    }
  };
  G.frameLogic = function () {
    const sv = this.srv;
    if (this.state === 'serve' && sv) {
      if (sv.phase === 'wait' && this.autoplay) { sv.phase = 'ready'; sv.readyAt = this.rt; }
      if (sv.phase === 'ready' && (sv.who === 1 || this.autoplay) && this.rt - sv.readyAt > sv.wait) {
        if (sv.kind === 'feed') this.drillFeed(); else this.toss(sv.who);
      }
    }
    if (this.state === 'dead' && this.rt >= this.deadUntil) this.afterDead();
    this.updateRing();
    this.prepSwings();
    this.sampleTrail();                      // cd-draw.js
    if (this.autoplay) this.botTap();
    this.updateHint();                       // cd-ui.js
  };
  G.afterDead = function () {
    const nx = this.deadNext;
    this.deadNext = null;
    if (nx === 'second') {
      const sv = this.srv;
      sv.phase = 'ready'; sv.readyAt = this.rt; sv.wait = U.rand(0.7, 1.1);
      this.placeForServe();
      this.state = 'serve';
      return;
    }
    if (nx === 'over') { this.state = 'over'; this.showReport(); return; }
    if (nx === 'drillOver') { this.state = 'over'; this.showDrillOver(); return; }
    if (nx === 'drillFeed') { this.startDrillPoint(false); return; }
    this.startPoint();
  };
  G.autoPause = function () {
    if (this.state === 'menu' || this.state === 'over' || this.paused) return;
    this.paused = true;
    this.input.keys = {};
    this.showPause();
  };
  G.togglePause = function () {
    if (this.state === 'menu' || this.state === 'over' || this.restLocked) return;
    if (this.paused) this.resumeGame();
    else { this.paused = true; this.input.keys = {}; this.showPause(); }
  };
  G.resumeGame = function () {
    if (this.restLocked || this.state === 'menu' || this.state === 'over') return;
    this.paused = false;
    this.closeSheet();
    this.lastT = null;
  };
  G.goMenu = function () {
    this.paused = false;
    if (!this.timedOut) this.restLocked = false;   // app mode: a rest that ended stays ended
    if (this.o.restDemo) this.setRest(0);
    this.state = 'menu'; this.srv = null; this.ring = null; this.markCheck = null;
    this.fx.marks.length = 0; this.fx.slides.length = 0; this.fx.pops.length = 0;
    this.idlePositions();
    this.stopCrowd();
    this.showMenu();
  };

  /* ---------------- players ---------------- */
  G.userTarget = function () {
    const p = this.P[0], k = this.input.keys;
    p.frozen = this.state === 'serve' && !!this.srv && this.srv.who === 0 && this.srv.kind !== 'feed';
    if (this.state === 'menu') { p.tx = Math.sin(this.time * 0.5 + 1) * 25; return; }
    if (p.frozen) { this.input.tx = p.x; return; }
    if (this.autoplay) { this.botMove(); return; }
    if (k.L || k.R) { this.input.tx = p.x + (k.R ? 1 : -1) * 320; this.input.kb = true; }
    else if (this.input.kb) { this.input.tx = p.x + p.vx * 0.1; this.input.kb = false; }
    p.tx = this.input.tx;
  };
  G.aiThink = function () {
    const p = this.P[1];
    p.frozen = this.state === 'serve' && !!this.srv && this.srv.who === 1;
    if (this.state === 'menu') { p.tx = Math.sin(this.time * 0.6) * 30; return; }
    if (p.plan && this.time >= p.plan.at) {
      const span = Math.max(0.15, p.plan.tc - p.plan.at), k = U.clamp((this.time - p.plan.at) / span, 0, 1);
      p.tx = p.plan.tx + p.plan.noise * Math.max(0, 1 - k * 1.6);
    }
  };
  // Amir reads your ball: after his reaction time he runs to stand a forehand (or backhand) away from
  // where he will meet it. His first read is off by `noise` and gets better as the ball comes.
  G.aiPlan = function () {
    const p = this.P[1], lv = this.lv(), drill = this.mode === 'drill';
    const c = this.contactFor(p);
    p.splitT = this.time;
    if (!c) { p.plan = null; return; }
    const fhX = c.x + 78, bhX = c.x - 72;
    const tx = Math.abs(fhX - p.x) < Math.abs(bhX - p.x) + 150 ? fhX : bhX;
    const react = drill ? 0.05 : lv.react * U.rand(0.85, 1.3);
    p.plan = { at: this.time + react, tx, noise: drill ? 0 : U.randn() * lv.noise, tc: this.time + c.t };
    p.ty = c.y + 35;
  };
  // Your depth is automatic: you move forward and back to meet the ball at a good height.
  G.userReady = function () {
    const p = this.P[0], c = this.contactFor(p);
    p.ty = c ? c.y - 35 : -118;
    p.splitT = this.time;
  };

  G.movePlayer = function (p, dt) {
    const near = p.i === 0, drill = this.mode === 'drill', lv = this.lv(), sf = CD.SURF[this.surface];
    const vmax = near ? 730 : drill ? 980 : lv.aiSpeed, acc = near ? 3300 : drill ? 4300 : lv.aiAcc;
    const lim = this.depthLim(p);
    p.tx = U.clamp(p.tx, -C.HD - 200, C.HD + 200);
    p.ty = U.clamp(p.ty, lim.min, lim.max);
    if (p.frozen) { p.vx = 0; p.vy = 0; p.setT += dt; return; }
    const ex = p.tx - p.x, ey = p.ty - p.y, dist = Math.hypot(ex, ey);
    let dvx = 0, dvy = 0;
    if (dist > 0.5) {
      const sp = Math.min(vmax, Math.sqrt(2 * acc * 0.8 * dist));
      dvx = (ex / dist) * sp; dvy = (ey / dist) * sp;
    }
    const speed = Math.hypot(p.vx, p.vy);
    // On clay a hard stop from speed becomes a slide: less grip, so you slide past a little.
    const braking = speed > 380 && p.vx * dvx + p.vy * dvy < speed * speed * 0.35;
    let a = acc;
    if (braking && sf.slide) { a = acc * 0.6; if (p.sliding <= 0) this.startSlide(p); p.sliding = 0.12; }
    else if (p.sliding > 0) p.sliding = Math.max(0, p.sliding - dt);
    const ax = dvx - p.vx, ay = dvy - p.vy, am = Math.hypot(ax, ay), mdv = a * dt;
    if (am > mdv) { p.vx += (ax / am) * mdv; p.vy += (ay / am) * mdv; } else { p.vx = dvx; p.vy = dvy; }
    const ox = p.x, oy = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.x = U.clamp(p.x, -C.HD - 220, C.HD + 220);
    if (p.sliding > 0 && sf.slide) this.addSlide(p, ox, oy);
    if (Math.abs(p.vx) < 140 && Math.abs(ex) < 34) p.setT += dt; else p.setT = 0;
    const sp = Math.hypot(p.vx, p.vy);
    p.runPhase += dt * (4 + sp / 55);
    if (sp > 160) {
      p.stepAcc += dt * (2.2 + sp / 260);
      if (p.stepAcc > 1) {
        p.stepAcc = 0;
        if (near) this.sfx('step', { surface: this.surface });
        if (sf.dust && sp > 420) this.puff(p.x + U.rand(-12, 12), p.y, 0, 2, true);
      }
    }
    if (near && this.m && this.mode === 'match' && (this.state === 'rally' || this.state === 'serve')) {
      const st = this.m.stats;
      st.dist += Math.hypot(p.x - ox, p.y - oy);
      if (sp > 600) { if (!p.sprinting) { p.sprinting = true; st.sprints++; } } else if (sp < 300) p.sprinting = false;
      const dir = Math.abs(p.vx) > 260 ? U.sgn(p.vx) : 0;
      if (dir && p.lastDir && dir !== p.lastDir) st.cods++;
      if (dir) p.lastDir = dir;
    }
  };

  // Start the swing a little before the ball arrives, so the backswing is under way at contact.
  G.prepSwings = function () {
    const b = this.ball;
    if (this.state !== 'rally' || !b.inPlay || b.netted) return;
    for (let i = 0; i < 2; i++) {
      const p = this.P[i];
      if (b.lastHit === p.i || p.swing || (b.serve && b.bounces === 0 && this.time - this.pred.t0 < 0.05)) continue;
      const c = this.contactFor(p);
      if (!c || c.t > 0.31) continue;
      const local = (c.x - p.tx) * p.mir;
      const pl = this.planeLocal({ x: p.tx, y: p.ty, mir: p.mir }, c.x, c.y, c.z);
      p.swing = { kind: local >= -12 ? 'fh' : 'bh', t0: this.time + c.t - 0.31, dur: 0.62, cAt: 0.5, lx: pl.lx, lz: pl.lz, pre: true };
    }
  };
  G.planeLocal = function (p, bx, by, bz) {
    const k = this.sAt(by) / this.sAt(p.y), c = this.cam;
    return { lx: (bx * k - p.x) * p.mir, lz: c.Hc - (c.Hc - bz) * k };
  };
  G.syncSwing = function (p, info, pl) {
    const kind = info.volley ? (info.fh ? 'vfh' : 'vbh') : info.fh ? 'fh' : 'bh', dur = info.volley ? 0.42 : 0.62;
    p.swing = { kind, t0: this.time - 0.5 * dur, dur, cAt: 0.5, lx: pl ? pl.lx : info.local, lz: pl ? pl.lz : info.z, stretch: info.stretch };
  };
  G.whiff = function (p, fh, local, z) {
    if (p.whiffAt && this.time - p.whiffAt < 0.5) return;
    p.whiffAt = this.time;
    if (Math.abs(local) < 330 && z < 300) {
      const pl = this.planeLocal(p, this.ball.x, this.ball.y, this.ball.z);
      p.swing = { kind: fh ? 'fh' : 'bh', t0: this.time - 0.31, dur: 0.62, cAt: 0.5, lx: U.clamp(pl.lx, -215, 225),
        lz: U.clamp(pl.lz, 30, 210), miss: true, stretch: true };
      this.sfx('whoosh', { power: 0.6 });
    }
    if (p.i === 0) this.lateMiss = true;
  };

  /* ---------------- contact and shots ---------------- */
  G.checkContact = function (p) {
    const b = this.ball;
    if (!b.inPlay || b.lastHit === p.i || b.netted || b.rolling || b.serve) return;
    const near = p.i === 0;
    if (near ? b.y >= C.NET_Y : b.y <= C.NET_Y) return;
    if (b.bounces > 1) return;
    const yc = p.y + (near ? 35 : -35);
    const crossed = near ? b.py > yc && b.y <= yc : b.py < yc && b.y >= yc;
    if (!crossed) return;
    const volley = b.bounces === 0;
    if (volley && !this.flightIn) return;    // a ball on its way out: let it go
    const local = (b.x - p.x) * p.mir, fh = local >= -12, reach = fh ? local : -local, z = b.z;
    const maxR = fh ? 176 : 166, stretchR = fh ? 216 : 206;
    if (z < 9 || z > (volley ? 235 : 262) || reach > stretchR) { this.whiff(p, fh, local, z); return; }
    this.contact(p, { fh, local, z, stretch: reach > maxR, jammed: Math.abs(local) < 16, volley });
  };

  G.contact = function (p, info) {
    const b = this.ball, opp = this.P[1 - p.i], inc = Math.hypot(b.vx, b.vy);
    const pl = this.planeLocal(p, b.x, b.y, b.z);
    const from = { x: b.x, y: b.y, z: Math.max(b.z, 20) };
    const s = this.mode === 'drill' && p.i === 1 ? this.drillShot() : p.i === 0 ? this.userShot(p, info, inc) : this.aiShot(p, info, inc);
    const plan = s.err === 'net' ? this.planNet(from, s.tx, s.ty, s) : this.planShot(from, s.tx, s.ty, s);
    this.launch(p.i, from, plan, { kind: s.kind });
    this.rally++;
    this.syncSwing(p, info, pl);
    const sp = Math.hypot(plan.vx, plan.vy), power = U.clamp((sp - 1500) / 2100, 0, 1);
    const kind = info.volley ? 'volley' : s.kind === 'defend' || s.kind === 'drop' || s.spin < 0 ? 'slice' : 'drive';
    this.sfx('hit', { power, kind });
    if (p.i === 0) {
      this.buzz(power > 0.7 ? 20 : 10);
      if (s.grade === 'perfect' || s.grade === 'good' || s.grade === 'mistimed') this.gradeFx(s.grade, p);
      if (this.m) {
        const st = this.m.stats, k = U.kmh(b.speed);
        st.shots++; st.setSum += Math.min(1, p.setT);
        if (p.setT >= 0.25) st.setEarly++;
        if (s.grade === 'perfect') st.perfect++;
        if (k > st.fastShot) st.fastShot = k;
      }
      this.lastUserShot = s;
      if (power > 0.82 && !this.reduced) this.shake(2);
      if (power > 0.78) this.showSpeed(U.kmh(b.speed), '');
      p.ty = -118;
      if (this.ring) this.ring.done = { grade: s.grade || 'none', t: this.rt };
    } else {
      p.plan = null;
      p.tx = U.clamp(0.3 * s.tx, -160, 160);
      p.ty = C.L + 115;
    }
    if (opp.i === 1) this.aiPlan(); else this.userReady();
  };

  // Your shot. Footwork first: being set early (feet still, in place) adds pace and accuracy. Then timing:
  // a tap as the ring closes is a power ball into the open court; no tap is a safe rally ball.
  G.userShot = function (p, info, inc) {
    const ai = this.P[1], setT = p.setT, setB = U.clamp(setT / 0.4, 0, 1);
    let grade = 'none';
    const r = this.ring;
    if (r && r.tapAt) {
      const d = r.tapAt - ((this.rtS || this.rt) - 0.05), a = Math.abs(d);
      grade = a <= 0.08 ? 'perfect' : a <= 0.17 ? 'good' : 'mistimed';
    }
    const aimX = ai.x + ai.vx * 0.25, open = aimX > 0 ? -1 : 1;
    const press = U.clamp((inc - 2300) / 1600, 0, 1) * 0.5 + (info.jammed ? 0.25 : 0) + (setT < 0.12 ? 0.2 : 0);
    let s;
    if (info.stretch) {
      s = { kind: 'defend', tx: U.rand(-150, 150), ty: U.rand(C.L - 470, C.L - 220), pace: 1850, spin: 0.7, clear: 62, errP: 0.12 };
      if (grade === 'perfect') grade = 'good';
    } else if (info.volley) {
      s = { kind: 'volley', tx: open * U.rand(170, 320), ty: U.rand(C.L - 720, C.L - 380), pace: 2500, spin: -0.3, clear: 16, errP: 0.06 };
    } else if (grade === 'perfect') {
      if (setB > 0.6 && U.chance(0.3) && ai.y > C.L - 50) {
        s = { kind: 'angle', tx: open * (C.HS - U.rand(35, 60)), ty: U.rand(C.L - 780, C.L - 620), pace: 2450, spin: 1.05, clear: 26, errP: 0.03 };
      } else {
        s = { kind: 'power', tx: open * (C.HS - U.rand(45, 90)), ty: U.rand(C.L - 300, C.L - 110), pace: 3150 + 380 * setB + U.rand(0, 160),
          spin: 0.72, clear: 14, errP: 0.02 + (setT < 0.1 ? 0.05 : 0) };
      }
    } else if (grade === 'good') {
      s = { kind: 'drive', tx: open * U.rand(140, 300), ty: U.rand(C.L - 460, C.L - 160), pace: 2750 + 220 * setB, spin: 0.65, clear: 26, errP: 0.035 + press * 0.08 };
    } else if (grade === 'mistimed') {
      s = { kind: 'drive', tx: U.rand(-200, 200), ty: U.rand(C.NET_Y + 420, C.NET_Y + 820), pace: 1950, spin: 0.4, clear: 30, errP: 0.3 };
    } else {
      s = { kind: 'drive', tx: U.rand(-170, 170) + open * 45, ty: U.rand(C.L - 640, C.L - 250), pace: 2250 + 260 * setB, spin: 0.55, clear: 38, errP: 0.035 + press * 0.16 };
    }
    s.grade = grade;
    if (this.mode === 'drill') s.errP *= 0.6;
    s.errP += Math.min(0.08, Math.max(0, this.rally - 6) * 0.006);
    if (U.chance(s.errP)) this.makeError(s, 0);
    return s;
  };

  // Amir's shot. Pressure (your pace, a stretch, a bad bounce, not being set) raises his error chance and
  // pushes him to defend. When you are out of position he attacks the open court.
  G.aiShot = function (p, info, inc) {
    const lv = this.lv(), u = this.P[0], setOk = p.setT > 0.16;
    let press = U.clamp((inc - 2100) / 1500, 0, 1) * 0.45 + (info.stretch ? 0.45 : 0) + (setOk ? 0 : 0.18) +
      (info.z > 195 || info.z < 28 ? 0.15 : 0) + (info.jammed ? 0.2 : 0) + (info.volley ? 0.1 : 0);
    press = U.clamp(press, 0, 1);
    const ux = u.x + u.vx * 0.3, open = ux > 0 ? -1 : 1, userOut = Math.abs(u.x) > 175 || Math.abs(u.vx) > 320;
    // A ball that landed near or inside his service line is a short ball: he steps in and attacks it.
    const short = !!this.flightBounce && this.flightBounce.y < C.FAR_SVC + 80;
    const attackP = (userOut ? lv.attack : lv.attack * 0.45) + (short ? 0.3 : 0) + (setOk ? 0.12 : 0);
    let s;
    if (press > 0.62) s = { kind: 'defend', tx: U.rand(-130, 130), ty: U.rand(170, 420), pace: lv.pace * 0.8, spin: 0.7, clear: 60 };
    else if ((userOut || short || U.chance(0.15)) && U.chance(attackP)) {
      if (U.chance(0.32)) s = { kind: 'angle', tx: open * (C.HS - U.rand(22, 22 + lv.margin * 0.45)), ty: U.rand(520, 700), pace: lv.pace * 1.02, spin: 1.05, clear: 24 };
      else s = { kind: 'power', tx: open * (C.HS - lv.margin * U.rand(0.55, 1.0)), ty: U.rand(100, 330), pace: lv.pace * 1.4, spin: 0.72, clear: 16 };
    } else if (u.y < -170 && U.chance(0.04 + 0.03 * this.levelIdx)) {
      s = { kind: 'drop', tx: U.rand(-220, 220), ty: U.rand(860, 1030), pace: 1050, spin: -0.5, clear: 16 };
    } else {
      s = { kind: 'drive', tx: (U.chance(0.58) ? -1 : 1) * U.rand(90, C.HS - lv.margin), ty: U.rand(200, 520), pace: lv.pace * U.rand(0.93, 1.08), spin: 0.62, clear: 42 };
    }
    if (U.chance(lv.baseErr + press * lv.pressErr + Math.min(0.1, Math.max(0, this.rally - 6) * 0.008))) this.makeError(s, 1);
    return s;
  };
  // In the drill Amir feeds you: always in, a little wider and faster every few balls.
  G.drillShot = function () {
    const u = this.P[0], n = this.drillCount, spread = Math.min(340, 70 + n * 13);
    return { kind: 'drive', tx: U.clamp(u.x + U.rand(-1, 1) * spread, -C.HS + 40, C.HS - 40), ty: U.rand(170, 480),
      pace: Math.min(3000, 1850 + n * 48), spin: 0.6, clear: 40 };
  };
  G.makeError = function (s, who) {
    const r = Math.random(), toFar = who === 0, just = U.chance(0.25), miss = just ? U.rand(1, 5) : U.rand(18, 130);
    if (r < (who === 1 ? 0.3 : 0.4)) s.err = 'net';
    else if (r < 0.72) { s.err = 'long'; s.ty = toFar ? C.L + C.R + miss : -C.R - miss; }
    else { s.err = 'wide'; s.tx = U.sgn(s.tx || U.rand(-1, 1)) * (C.HS + C.R + miss); }
  };
  G.checkBounds = function () {
    const b = this.ball;
    if (!(b.y < C.BACK_NEAR + 80 || b.y > C.BACK_FAR - 80 || Math.abs(b.x) > C.SIDE - 60)) return;
    if (b.bounces >= 1) this.endPoint(b.lastHit, b.serveFlight ? 'ace' : 'winner', { x: b.x, y: b.y });
    else this.endPoint(1 - b.lastHit, 'out', { x: b.x, y: b.y });
  };

  /* ---------------- rules ---------------- */
  G.onBounce = function (x, y, vin) {
    const b = this.ball, sp = U.clamp(vin / 2800, 0, 1);
    if (b.bounces <= 3) {
      this.addMark(x, y, b.vx, b.vy);
      this.puff(x, y, 0, 3 + Math.round(sp * 7));
      this.sfx('bounce', { surface: this.surface, speed: sp });
    }
    if (!b.inPlay || this.state !== 'rally') return;
    const hitter = b.lastHit, rcv = 1 - hitter;
    if (b.serve) {
      if (b.netted) { this.fault(x, y, { m: -99 }); return; }
      const lc = this.lineCall(x, y, hitter, b.box);
      if (!lc.inn) { this.fault(x, y, lc); return; }
      b.serve = false; b.serveFlight = true;
      if (this.m && hitter === 0 && this.srv.faults === 0) this.m.stats.firstIn++;
      this.lastIn = Math.abs(lc.m) < 6 ? { x, y, lc } : null;
      return;
    }
    if (b.netted) { this.endPoint(rcv, 'net', { x, y }); return; }
    if (b.bounces === 1) {
      const lc = this.lineCall(x, y, hitter, null);
      if (!lc.inn) { this.endPoint(rcv, lc.m === -99 ? 'net' : 'out', { x, y, lc }); return; }
      this.lastIn = Math.abs(lc.m) < 6 ? { x, y, lc } : null;
      this.flightBounce = { x, y };
      if (this.mode === 'drill' && hitter === 0) this.drillHit();
      return;
    }
    this.endPoint(hitter, b.serveFlight ? 'ace' : 'winner', { x, y });
  };
  G.onNetCord = function () {
    const b = this.ball, pred = this.pred;
    this.flightIn = !!(pred.b1 && !pred.net && this.lineCall(pred.b1.x, pred.b1.y, b.lastHit, b.serve ? b.box : null).inn);
    this.ring = null;
    if (1 - b.lastHit === 1) this.aiPlan(); else this.userReady();
    this.sfx('ooh');
    this.popAt('NET CORD', b.x, C.NET_Y, 140, { size: 18 });
  };
  G.fault = function (x, y, lc) {
    const sv = this.srv, b = this.ball, close = lc && lc.m > -6 && lc.m !== -99;
    b.inPlay = false; this.ring = null;
    if (close) { this.markCheck = { x, y, lc, t0: this.rt, inn: false }; this.sfx('ooh'); }
    if (sv.faults === 0) {
      sv.faults = 1;
      this.callAt('FAULT', x, y);
      this.state = 'dead'; this.deadNext = 'second'; this.deadUntil = this.rt + (close ? 2.3 : 1.15);
    } else {
      this.callAt('DOUBLE FAULT', x, y);
      this.endPoint(1 - sv.who, 'double', { x, y });
    }
  };
  G.endPoint = function (w, why, info) {
    if (this.state !== 'rally' && this.state !== 'serve') return;
    info = info || {};
    const b = this.ball;
    b.inPlay = false; this.ring = null; this.state = 'dead';
    let close = !!this.markCheck && this.rt - this.markCheck.t0 < 0.1;
    if (!close && why === 'out' && info.lc && info.lc.m > -6) { this.markCheck = { x: info.x, y: info.y, lc: info.lc, t0: this.rt, inn: false }; close = true; this.sfx('ooh'); }
    else if (!close && (why === 'winner' || why === 'ace') && this.lastIn) {
      this.markCheck = { x: this.lastIn.x, y: this.lastIn.y, lc: this.lastIn.lc, t0: this.rt, inn: true }; close = true; this.sfx('ooh');
    }
    if (why === 'winner' && w === 1) this.lateMiss = true;
    const CALL = { ace: 'ACE', winner: 'WINNER', out: 'OUT', net: 'NET' };
    if (CALL[why]) this.callAt(CALL[why], info.x != null ? info.x : b.x, info.y != null ? info.y : b.y);
    if (this.mode === 'drill') { this.drillEnd(w, why, close); return; }
    const m = this.m, st = m.stats, userWon = w === 0;
    st.won[w]++; m.points++;
    if (this.rally > st.longest) st.longest = this.rally;
    if (why === 'ace' && userWon) st.aces++;
    if (why === 'double' && !userWon) st.doubles++;
    if (why === 'winner') { if (userWon) st.winners++; else st.aiWinners++; }
    if (why === 'out' || why === 'net') { if (userWon) st.aiErrors++; else st.errors++; }
    const res = this.award(w);
    const sc = this.scoreCall(res, w);
    this.banner(sc.big, sc.small, res.game || res.set);
    this.react(w, res, why);
    this.coachAfterPoint(w, why, res);
    this.paintBoard(true);
    this.saveMatch();
    this.sfx('chime', { kind: res.set ? 'set' : res.game ? 'game' : 'point' });
    this.emit('point', { winner: userWon ? 'player' : 'opponent', why, games: m.games.slice(), points: m.pts.slice(), tiebreak: m.tb });
    if (res.game) this.emit('game', { winner: userWon ? 'player' : 'opponent', games: m.games.slice() });
    if (res.set) {
      const rec = U.load('record', {}) || {}, key = this.lv().key;
      rec[key] = rec[key] || { won: 0, lost: 0 };
      rec[key][userWon ? 'won' : 'lost']++;
      U.save('record', rec);
      this.emit('match', { winner: userWon ? 'player' : 'opponent', games: m.games.slice(), level: key, stats: Object.assign({}, st) });
    }
    this.deadNext = res.set ? 'over' : 'next';
    this.deadUntil = this.rt + (close ? 2.5 : 1.55) + (res.game ? 0.6 : 0) + (res.set ? 0.9 : 0);
  };

  // Fast4: games to 4 (no need to win by 2), no-ad (at 40-40 the next point wins), tiebreak to 5 at 3-3
  // (at 4-4 the next point wins). The server changes every game; in the tiebreak after the first point,
  // then every two.
  G.award = function (w) {
    const m = this.m, res = { game: false, set: false, tb: false, deciding: false };
    m.pts[w]++;
    if (m.tb) {
      if (m.pts[w] >= 5) { m.tbScore = m.pts.slice(); m.games[w]++; res.game = true; res.set = true; }
      else if (m.pts[0] === 4 && m.pts[1] === 4) res.deciding = true;
    } else if (m.pts[w] >= 4) {
      m.games[w]++; res.game = true;
      if (m.games[w] >= 4) res.set = true;
      else {
        m.server = 1 - m.server;
        if (m.games[0] === 3 && m.games[1] === 3) { m.tb = true; m.tbFirst = m.server; res.tb = true; }
      }
    } else if (m.pts[0] === 3 && m.pts[1] === 3) res.deciding = true;
    if (res.game) m.pts = [0, 0];
    if (res.set) { m.done = true; m.winner = w; }
    return res;
  };
  G.scoreCall = function (res, w) {
    const m = this.m, opp = this.o.opponent;
    if (res.set) return { big: w === 0 ? 'You win the set' : opp + ' wins the set', small: m.games[0] + '–' + m.games[1] + (m.tbScore ? ' (' + m.tbScore[0] + '–' + m.tbScore[1] + ')' : '') };
    if (res.game) return { big: w === 0 ? 'Your game' : opp + "'s game", small: res.tb ? 'Tiebreak. First to 5.' : 'Games ' + m.games[0] + '–' + m.games[1] };
    if (m.tb) return { big: m.pts[0] + '–' + m.pts[1], small: res.deciding ? 'Deciding point' : 'Tiebreak' };
    const P = ['0', '15', '30', '40'], sv = m.server, a = m.pts[sv], b = m.pts[1 - sv];
    if (res.deciding) return { big: '40–40', small: 'Deciding point' };
    if (a === b) return { big: P[a] + ' all', small: '' };
    return { big: P[a] + '–' + P[b], small: '' };
  };
  G.react = function (w, res, why) {
    const win = this.P[w], lose = this.P[1 - w];
    if (res.set || res.game || why === 'ace' || why === 'winner') { win.act = 'cheer'; win.actT = this.time; }
    if (res.set) { lose.act = 'sad'; lose.actT = this.time; }
    if (w === 0) {
      const lvl = res.set ? 1 : res.game ? 0.75 : why === 'ace' || why === 'winner' ? Math.min(0.85, 0.5 + this.rally * 0.03) : 0.3;
      this.cheer(lvl);
    } else this.sfx('applause', { level: res.game || res.set ? 0.35 : 0.16 });
  };
  G.cheer = function (level) {
    this.sfx(level > 0.7 ? 'cheer' : 'applause', { level });
    if (!this.reduced) this.flash(Math.round(5 + level * 22));
    if (level > 0.5) this.buzz(25);
  };
  G.coachAfterPoint = function (w, why, res) {
    const L = CD.LINES, m = this.m;
    let line = null, force = false;
    if (res.set) { line = U.pick(w === 0 ? L.setYou : L.setAmir); force = true; }
    else if (res.game) { if (U.chance(0.55)) line = U.pick(w === 0 ? L.gameYou : L.gameAmir); }
    else if (w === 0 && why === 'ace' && U.chance(0.6)) line = U.pick(L.ace);
    else if (w === 1 && why === 'double') line = U.pick(L.double);
    else if (w === 0 && this.lastUserShot && this.lastUserShot.grade === 'perfect' && U.chance(0.45)) line = U.pick(L.perfect);
    else if (w === 1 && this.lateMiss && U.chance(0.5)) line = U.pick(L.late);
    else if (this.rally >= 9 && U.chance(0.6)) line = U.pick(L.rally);
    this.lateMiss = false; this.lastUserShot = null;
    if (!line) return;
    if (!force && m.points - this.lastLineAt < 3) return;
    this.lastLineAt = m.points;
    this.coachSay(line);
  };

  /* ---------------- the rally drill ---------------- */
  G.drillHit = function () {
    this.drillCount++;
    this.paintBoard(true);
    const n = this.drillCount, line = CD.LINES.drill[n];
    if (line) { this.coachSay(line); this.cheer(0.5); }
    if (n === (U.load('best', 0) | 0) + 1 && n > 3) this.popAt('NEW BEST', this.P[0].x, this.P[0].y, 230, { size: 20, clay: true });
  };
  G.drillEnd = function (w, why, close) {
    if (w === 0) { this.deadNext = 'drillFeed'; this.deadUntil = this.rt + (close ? 2.2 : 1.0); return; }
    const n = this.drillCount, best = U.load('best', 0) | 0, isBest = n > best;
    if (isBest) U.save('best', n);
    this.drillResult = { n, best: Math.max(n, best), isBest, why };
    if (why === 'winner') this.popAt('MISSED', this.P[0].x, this.P[0].y, 220, { size: 22 });
    this.sfx('applause', { level: Math.min(0.8, 0.2 + n * 0.02) });
    this.deadNext = 'drillOver'; this.deadUntil = this.rt + (close ? 2.4 : 1.3);
    this.emit('drill', { rally: n, best: Math.max(n, best) });
  };

  /* ---------------- the ring: tap as it closes ---------------- */
  G.updateRing = function () {
    const b = this.ball, p = this.P[0], r = this.ring;
    if (r && r.done) { if (this.rt - r.done.t > 0.4) this.ring = null; return; }
    const incoming = this.state === 'rally' && b.inPlay && b.lastHit === 1 && !b.netted;
    if (!incoming) { this.ring = null; return; }
    const c = this.contactFor(p);
    if (!c) { if (r && !r.tapAt) this.ring = null; return; }
    const tReal = c.t / (this.ts * this.speedMul);
    if (tReal > 0.78) { if (r && !r.tapAt) this.ring = null; return; }
    const local = (c.x - p.x) * p.mir, ok = local > -235 && local < 245;
    if (!r) { if (!ok) return; this.ring = { born: this.rt, tapAt: 0 }; }
    const R = this.ring;
    R.tc = this.rt + tReal; R.x = c.x; R.y = c.y; R.z = c.z; R.ok = ok;
  };

  /* ---------------- rest timer ---------------- */
  // The app starts a rest with setRest(seconds). When it runs out the game freezes and says so: it never
  // makes a rest longer. Real time, so it keeps counting while paused.
  G.setRest = function (sec) {
    sec = +sec || 0;
    if (!sec) { this.rest = null; this.restLocked = false; return; }
    this.rest = { total: sec, end: Date.now() / 1000 + sec, left: sec, warned: false, done: false };
    this.restLocked = false;
  };
  G.tickRest = function () {
    if (this.host) { this.hostSync(); return; }
    const r = this.rest;
    if (!r || r.done) return;
    r.left = Math.max(0, r.end - Date.now() / 1000);
    if (r.left <= 10 && !r.warned && this.state !== 'menu' && this.state !== 'over') {
      r.warned = true; this.coachSay(U.pick(CD.LINES.rest10)); this.buzz(40);
    }
    if (r.left <= 0) { r.done = true; this.restOver(); }
  };
  G.restOver = function () {
    if (this.state === 'menu' || this.state === 'over') { this.restLocked = true; this.emit('restEnd', {}); return; }
    this.restLocked = true; this.paused = true; this.input.keys = {};
    this.showLift();
    this.emit('restEnd', {});
    this.sfx('chime', { kind: 'game' });
    this.buzz([80, 60, 80]);
  };

  // App mode (the host owns the clock). Every frame: read left() and the speaker, fire the 10-second line once per rest,
  // and keep the crowd in step with the speaker. timeUp() is the host saying the rest is over.
  G.hostSync = function () {
    this.soundOn = this.hostSound();
    this.leftNow = this.timedOut ? 0 : this.hostLeft();
    if (this.timedOut) return;
    const left = this.leftNow, playing = this.state !== 'menu' && this.state !== 'over';
    if (left != null) {
      if (left > 10) this.warned10 = false;
      else if (!this.warned10 && playing) { this.warned10 = true; this.coachSay(U.pick(CD.LINES.rest10)); this.buzz(40); }
    }
    if (!this.soundOn && this._crowd) this.stopCrowd();
    else if (this.soundOn && !this._crowd && this.state !== 'menu') this.unlockAudio();
  };
  G.hostTimeUp = function () {
    if (this.timedOut || this.dead) return;
    this.timedOut = true;
    this.leftNow = 0;
    this.rest = { total: 0, end: 0, left: 0, warned: true, done: true };   // the same flag the standalone rest sets
    this.stopCrowd();
    this.restOver();                       // freezes play and shows the lift card; a menu or report just freezes quietly
  };

  /* ---------------- saving, sound ---------------- */
  G.saveMatch = function () { if (this.mode === 'match' && this.m) U.save('match', this.m.done ? null : this.m); };
  G.saveSettings = function () { U.save('settings', { level: this.levelIdx, surface: this.surface, rest: this.restPick, sound: this.host ? (U.load('settings', {}) || {}).sound : this.soundOn }); };
  G.startCrowd = function () {
    if (this.host) this.soundOn = this.hostSound();
    if (!this.soundOn || !window.CourtSound || this.timedOut) return;
    try { if (this.audioReady()) { window.CourtSound.crowdStart(); this._crowd = true; } } catch (e) { /* optional */ }
  };
  G.stopCrowd = function () {
    try { if (window.CourtSound) window.CourtSound.crowdStop(); } catch (e) { /* optional */ }
    this._crowd = false;
  };

  /* ---------------- test bot (window.__betweenSets.autoplay = true) ----------------
     botStyle 'pro' reads every ball at once and taps on time. 'human' waits a reaction time, misreads a
     little at first, taps on about 60% of balls and is off by about a tenth of a second. */
  G.botMove = function () {
    const p = this.P[0], b = this.ball, human = this.botStyle === 'human';
    if (b.inPlay && b.lastHit === 1) {
      if (this.botAim == null) {
        this.botAim = U.rand(30, 120);
        this.botNoise = human ? U.randn() * 90 : 0;
        this.botStart = this.time + (human ? U.rand(0.25, 0.45) * this.ts : 0);
      }
      const c = this.contactFor(p);
      if (c && this.time >= this.botStart) {
        const k = human ? U.clamp((this.time - this.botStart) / (0.7 * this.ts), 0, 1) : 1;
        this.input.tx = c.x - this.botAim + this.botNoise * (1 - k * 0.85);
      }
    } else { this.botAim = null; this.input.tx += (0 - this.input.tx) * 0.01; }
    p.tx = this.input.tx;
  };
  G.botTap = function () {
    const r = this.ring, human = this.botStyle === 'human';
    if (this.state === 'serve' && this.srv && this.srv.phase === 'ready') this.botServeErr = U.randn() * (human ? 0.11 : 0.05);
    if (!r) { this.botErr = null; return; }
    if (r.tapAt || r.done) return;
    if (this.botErr == null) { this.botErr = U.randn() * (human ? 0.1 : 0.05); this.botSkip = human && U.chance(0.4); }
    if (this.botSkip) return;
    if (this.rt >= r.tc - 0.05 + this.botErr) { r.tapAt = this.rt; this.botErr = null; }
  };
})();

// ═══ cd-draw.js ═══
/* Between Sets: cd-draw.js. The stadium and court (drawn once per size into this.bg and this.netCv),
   then every frame: marks, shadows, the two players, the ball, the ring, dust, text and the mark check.
   Players are drawn from a small skeleton: legs and arms solved by two-bone IK, swings from keyframes
   whose contact frame is the real ball position. */
(function () {
  'use strict';
  const CD = window.CourtDuel, C = CD.C, U = CD.U, G = CD.Game.prototype;
  const TAU = Math.PI * 2, RK = 47; // RK: hand to the middle of the racket head (cm)
  const FD = '"Barlow Condensed", "Arial Narrow", sans-serif';

  /* ---------------- the scene, drawn once ---------------- */
  G.buildScene = function () {
    if (!this.cam) return;
    this.buildBg();
    this.buildNet();
  };

  G.buildBg = function () {
    const c = this.cam, x = this.bg.getContext('2d'), sf = CD.SURF[this.surface], rnd = U.rng(20261017);
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.clearRect(0, 0, c.W, c.H);
    const top = x.createLinearGradient(0, 0, 0, c.H * 0.4);
    top.addColorStop(0, '#02140D');
    top.addColorStop(1, '#093024');
    x.fillStyle = top;
    x.fillRect(0, 0, c.W, c.H);
    this.flashSpots = [];
    this.drawStands(x, rnd);
    this.drawWalls(x);
    this.drawFloor(x, sf, rnd);
    this.drawLines(x, sf);
    this.drawNetShadow(x);
  };

  G.quad = function (x, pts) {
    x.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = this.proj(pts[i][0], pts[i][1], pts[i][2] || 0);
      if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]);
    }
    x.closePath();
  };

  G.fan = function (x, sx, sy, s, rnd) {
    const body = CD.CROWD[(rnd() * CD.CROWD.length) | 0], skin = CD.SKIN[(rnd() * CD.SKIN.length) | 0];
    const w = 40 * s, h = 26 * s;
    x.fillStyle = body;
    x.beginPath(); x.ellipse(sx, sy + h * 0.55, Math.max(0.8, w * 0.5), Math.max(0.6, h * 0.6), 0, Math.PI, 0); x.fill();
    x.fillStyle = skin;
    x.beginPath(); x.arc(sx, sy - h * 0.1, Math.max(0.55, 9.5 * s), 0, TAU); x.fill();
    const r = rnd();
    if (r < 0.5) { x.fillStyle = 'rgba(28,20,15,.9)'; x.beginPath(); x.arc(sx, sy - h * 0.1 - 2.2 * s, Math.max(0.5, 9.2 * s), Math.PI, 0); x.fill(); }
    else if (r < 0.62) { x.fillStyle = rnd() < 0.5 ? '#F4EFE6' : '#0E4A36'; x.fillRect(sx - 9.5 * s, sy - h * 0.1 - 9.5 * s, 19 * s, 6 * s); }
  };

  G.drawStands = function (x, rnd) {
    const c = this.cam;
    // Behind the far wall: rows climbing away from the court.
    const RF = 24, rowD = 85, rowH = 55, y0b = C.BACK_FAR + 60, z0b = C.WALL_H + 25;
    for (let r = RF - 1; r >= 0; r--) {
      const y0 = y0b + r * rowD, z0 = z0b + r * rowH;
      const a = this.proj(-4400, y0, z0), d = this.proj(-4400, y0 + rowD, z0 + rowH);
      if (a[1] < -30 && d[1] < -30) continue;
      x.fillStyle = r % 2 ? '#0A3427' : '#0C3A2C';
      this.quad(x, [[-4400, y0, z0], [4400, y0, z0], [4400, y0 + rowD, z0 + rowH], [-4400, y0 + rowD, z0 + rowH]]);
      x.fill();
      const s = this.sAt(y0 + 30);
      for (let X = -4400; X <= 4400; X += 46) {
        const pr = this.proj(X + (rnd() - 0.5) * 14, y0 + 30, z0 + 40);
        if (pr[0] < -10 || pr[0] > c.W + 10 || pr[1] < -12 || pr[1] > c.H) continue;
        if (rnd() < 0.07) continue;
        this.fan(x, pr[0], pr[1], s, rnd);
        if (rnd() < 0.16) this.flashSpots.push([pr[0], pr[1] - 6 * s]);
      }
    }
    // Along each side: rows climbing outward, drawn far to near so nearer heads sit on top.
    for (const d of [-1, 1]) {
      for (let r = 14; r >= 0; r--) {
        const xr = d * (C.SIDE + 70 + r * 85), zr = 150 + 30 + r * 55, xr2 = d * (C.SIDE + 70 + (r + 1) * 85), zr2 = zr + 55;
        x.fillStyle = r % 2 ? '#0A3427' : '#0C3A2C';
        this.quad(x, [[xr, C.BACK_NEAR - 300, zr], [xr, C.BACK_FAR + 60, zr], [xr2, C.BACK_FAR + 60, zr2], [xr2, C.BACK_NEAR - 300, zr2]]);
        x.fill();
        for (let Y = C.BACK_FAR + 40; Y >= C.BACK_NEAR - 280; Y -= 48) {
          const pr = this.proj(xr - d * 30, Y + (rnd() - 0.5) * 12, zr + 40);
          if (pr[0] < -10 || pr[0] > c.W + 10 || pr[1] < -12 || pr[1] > c.H) continue;
          if (rnd() < 0.07) continue;
          this.fan(x, pr[0], pr[1], this.sAt(Y), rnd);
        }
      }
    }
  };

  G.drawWalls = function (x) {
    const c = this.cam, s = this.sAt(C.BACK_FAR);
    // the far wall, with the name on it
    const g = x.createLinearGradient(0, this.proj(0, C.BACK_FAR, C.WALL_H)[1], 0, this.proj(0, C.BACK_FAR, 0)[1]);
    g.addColorStop(0, '#11553E'); g.addColorStop(1, '#0B3D2D');
    x.fillStyle = g;
    this.quad(x, [[-C.SIDE - 600, C.BACK_FAR, 0], [C.SIDE + 600, C.BACK_FAR, 0], [C.SIDE + 600, C.BACK_FAR, C.WALL_H], [-C.SIDE - 600, C.BACK_FAR, C.WALL_H]]);
    x.fill();
    const t = this.proj(0, C.BACK_FAR, C.WALL_H);
    x.fillStyle = 'rgba(244,239,230,.22)';
    x.fillRect(0, t[1], c.W, 1);
    const mid = this.proj(0, C.BACK_FAR, C.WALL_H * 0.47);
    x.fillStyle = 'rgba(244,239,230,.86)';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '700 ' + Math.max(8, Math.round(C.WALL_H * 0.42 * s)) + 'px ' + FD;
    x.fillText('AMIRARDEKANI.COM', mid[0], mid[1]);
    // The domain is painted on the wall (scenery, sized by the perspective); the side lines show only at 12 px or more.
    const sidePx = Math.round(C.WALL_H * 0.3 * s);
    if (sidePx >= 12) for (const d of [-1, 1]) {
      const side = this.proj(d * 800, C.BACK_FAR, C.WALL_H * 0.47);
      x.font = '600 ' + sidePx + 'px ' + FD;
      x.fillStyle = 'rgba(244,239,230,.5)';
      x.fillText(d < 0 ? 'BETWEEN SETS' : 'TENNIS · PADEL', side[0], side[1]);
    }
    // the side walls
    for (const d of [-1, 1]) {
      x.fillStyle = '#0B3B2B';
      this.quad(x, [[d * C.SIDE, C.BACK_NEAR - 300, 0], [d * C.SIDE, C.BACK_FAR, 0], [d * C.SIDE, C.BACK_FAR, 150], [d * C.SIDE, C.BACK_NEAR - 300, 150]]);
      x.fill();
      x.strokeStyle = 'rgba(244,239,230,.18)'; x.lineWidth = 1;
      const a = this.proj(d * C.SIDE, C.BACK_NEAR - 300, 150), b = this.proj(d * C.SIDE, C.BACK_FAR, 150);
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    }
  };

  G.floorNear = function () { return Math.max(C.BACK_NEAR, this.cam.yBottom - 120, -this.cam.D + 140); };

  G.drawFloor = function (x, sf, rnd) {
    const c = this.cam, yN = this.floorNear();
    const yTop = this.proj(0, C.BACK_FAR, 0)[1];
    const g = x.createLinearGradient(0, yTop, 0, c.H);
    g.addColorStop(0, sf.far); g.addColorStop(1, sf.near);
    x.fillStyle = g;
    this.quad(x, [[-C.SIDE, yN], [C.SIDE, yN], [C.SIDE, C.BACK_FAR], [-C.SIDE, C.BACK_FAR]]);
    x.fill();
    if (sf.court) {
      const g2 = x.createLinearGradient(0, this.proj(0, C.L, 0)[1], 0, this.proj(0, 0, 0)[1]);
      g2.addColorStop(0, sf.court[1]); g2.addColorStop(1, sf.court[0]);
      x.fillStyle = g2;
      this.quad(x, [[-C.HD, 0], [C.HD, 0], [C.HD, C.L], [-C.HD, C.L]]);
      x.fill();
    }
    if (sf.stripes) {
      x.fillStyle = 'rgba(255,255,255,.05)';
      for (let Y = Math.floor(yN / 230) * 230; Y < C.BACK_FAR; Y += 230) {
        this.quad(x, [[-C.SIDE, Math.max(yN, Y)], [C.SIDE, Math.max(yN, Y)], [C.SIDE, Y + 115], [-C.SIDE, Y + 115]]);
        x.fill();
      }
      x.fillStyle = 'rgba(70,58,36,.16)';
      for (const Y of [-90, C.L + 90]) {
        const p = this.proj(0, Y, 0), s = this.sAt(Y);
        x.beginPath(); x.ellipse(p[0], p[1], 260 * s, 150 * s * (c.Hc / (c.D + Y)), 0, 0, TAU); x.fill();
      }
    }
    if (sf.speck) {
      // Clay: grains of brick dust, and the faint circles left by the drag mat.
      for (let i = 0; i < 2600; i++) {
        const X = U.lerp(-C.SIDE, C.SIDE, rnd()), Y = U.lerp(yN, C.BACK_FAR, rnd()), p = this.proj(X, Y, 0);
        if (p[0] < 0 || p[0] > c.W || p[1] < 0 || p[1] > c.H) continue;
        const sz = Math.max(0.6, 2.2 * p[2]);
        x.fillStyle = rnd() < 0.55 ? 'rgba(78,22,6,.2)' : 'rgba(240,160,120,.15)';
        x.fillRect(p[0], p[1], sz, sz * 0.7);
      }
      x.strokeStyle = 'rgba(255,200,165,.045)'; x.lineWidth = 1;
      for (let k = 0; k < 14; k++) {
        const R = 280 + k * 95;
        x.beginPath();
        for (let a = 0; a <= 64; a++) {
          const ang = (a / 64) * TAU, p = this.proj(Math.cos(ang) * R * 1.2, C.NET_Y + Math.sin(ang) * R, 0);
          if (a) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]);
        }
        x.stroke();
      }
    }
    // Late-afternoon shade from the left-hand stand.
    x.fillStyle = sf.shade;
    this.quad(x, [[-C.SIDE, yN], [-C.SIDE, C.BACK_FAR], [-380, C.BACK_FAR], [-860, yN]]);
    x.fill();
  };

  // Lines: along the court they are exact quads plus a hairline so the far end never vanishes; across the
  // court they are flat bands at least a pixel tall (perspective squeezes them hardest).
  G.drawLines = function (x, sf) {
    x.fillStyle = sf.line;
    x.strokeStyle = sf.line;
    const along = (x0, x1) => {
      this.quad(x, [[x0, 0], [x1, 0], [x1, C.L], [x0, C.L]]);
      x.fill();
      const a = this.proj((x0 + x1) / 2, 0, 0), b = this.proj((x0 + x1) / 2, C.L, 0);
      x.lineWidth = 0.9; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    };
    const across = (x0, x1, y0, y1, minH) => {
      const a = this.proj(x0, y0, 0), b = this.proj(x1, y0, 0), d = this.proj(x0, y1, 0);
      const h = Math.max(minH, Math.abs(d[1] - a[1]));
      x.fillRect(a[0], Math.min(a[1], d[1]) - (h - Math.abs(d[1] - a[1])) / 2, b[0] - a[0], h);
    };
    along(-C.HD, -C.HD + 5); along(C.HD - 5, C.HD); along(-C.HS, -C.HS + 5); along(C.HS - 5, C.HS);
    // the centre service line runs only between the service lines
    this.quad(x, [[-2.5, C.NEAR_SVC], [2.5, C.NEAR_SVC], [2.5, C.FAR_SVC], [-2.5, C.FAR_SVC]]);
    x.fill();
    const a = this.proj(0, C.NEAR_SVC, 0), b = this.proj(0, C.FAR_SVC, 0);
    x.lineWidth = 0.9; x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
    across(-C.HD, C.HD, 0, 10, 1.6); across(-C.HD, C.HD, C.L - 10, C.L, 1.3);
    across(-C.HS, C.HS, C.NEAR_SVC, C.NEAR_SVC + 5, 1.2); across(-C.HS, C.HS, C.FAR_SVC - 5, C.FAR_SVC, 1.05);
    across(-2.5, 2.5, 10, 20, 1.2); across(-2.5, 2.5, C.L - 20, C.L - 10, 1);
  };

  G.drawNetShadow = function (x) {
    x.fillStyle = 'rgba(0,0,0,.13)';
    x.beginPath();
    for (let i = 0; i <= 32; i++) {
      const X = -C.POST + (i / 32) * 2 * C.POST, h = this.netH(X), p = this.proj(X + h * 0.3, C.NET_Y - h * 0.22, 0);
      if (i) x.lineTo(p[0], p[1]); else x.moveTo(p[0], p[1]);
    }
    const r = this.proj(C.POST, C.NET_Y, 0), l = this.proj(-C.POST, C.NET_Y, 0);
    x.lineTo(r[0], r[1]); x.lineTo(l[0], l[1]); x.closePath(); x.fill();
  };

  G.buildNet = function () {
    const c = this.cam, x = this.netCv.getContext('2d'), sN = this.sAt(C.NET_Y);
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    x.clearRect(0, 0, c.W, c.H);
    this.drawUmpire(x);
    const N = 32, top = [];
    for (let i = 0; i <= N; i++) { const X = -C.POST + (i / N) * 2 * C.POST; top.push(this.proj(X, C.NET_Y, this.netH(X))); }
    const bl = this.proj(-C.POST, C.NET_Y, 0), br = this.proj(C.POST, C.NET_Y, 0);
    x.fillStyle = 'rgba(8,20,14,.4)';
    x.beginPath(); x.moveTo(bl[0], bl[1]);
    top.forEach((p) => x.lineTo(p[0], p[1]));
    x.lineTo(br[0], br[1]); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(240,235,225,.15)'; x.lineWidth = 0.6;
    x.beginPath();
    for (let X = -C.POST + 20; X < C.POST; X += 22) {
      const a = this.proj(X, C.NET_Y, 0), b = this.proj(X, C.NET_Y, this.netH(X));
      x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]);
    }
    for (let z = 10; z < C.NET_C; z += 10) { const a = this.proj(-C.POST, C.NET_Y, z), b = this.proj(C.POST, C.NET_Y, z); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); }
    x.stroke();
    x.strokeStyle = '#F4EFE6'; x.lineWidth = Math.max(1.6, 5 * sN); x.lineCap = 'round'; x.lineJoin = 'round';
    x.beginPath(); top.forEach((p, i) => (i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]))); x.stroke();
    const s0 = this.proj(0, C.NET_Y, 0), s1 = this.proj(0, C.NET_Y, C.NET_C);
    x.lineWidth = Math.max(1, 5 * sN); x.beginPath(); x.moveTo(s0[0], s0[1]); x.lineTo(s1[0], s1[1]); x.stroke();
    for (const d of [-1, 1]) {
      const a = this.proj(d * C.POST, C.NET_Y, 0), b = this.proj(d * C.POST, C.NET_Y, C.NET_P + 5);
      x.strokeStyle = '#0B3D2D'; x.lineWidth = Math.max(2.2, 9 * sN);
      x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      x.fillStyle = '#F4EFE6'; x.beginPath(); x.arc(b[0], b[1], Math.max(1.2, 4.5 * sN), 0, TAU); x.fill();
    }
  };

  G.drawUmpire = function (x) {
    const X = -(C.HD + 215), Y = C.NET_Y, s = this.sAt(Y);
    const P = (dx, dy, z) => this.proj(X + dx, Y + dy, z);
    const line = (a, b) => { x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); };
    x.strokeStyle = 'rgba(226,218,204,.75)'; x.lineWidth = Math.max(1, 4 * s); x.lineCap = 'round';
    [[-34, -28], [34, -28], [-34, 28], [34, 28]].forEach((q) => line(P(q[0], q[1], 0), P(q[0], q[1], 175)));
    [55, 115].forEach((z) => line(P(-34, -28, z), P(34, -28, z)));
    x.lineWidth = Math.max(1.5, 7 * s); line(P(-42, -32, 178), P(42, -32, 178));
    x.strokeStyle = '#0E4A36'; x.lineWidth = Math.max(2, 24 * s); line(P(0, 0, 190), P(5, 0, 240));
    x.fillStyle = '#B98A66'; const h = P(7, 0, 262); x.beginPath(); x.arc(h[0], h[1], Math.max(1.4, 10 * s), 0, TAU); x.fill();
    x.fillStyle = '#F4EFE6'; x.beginPath(); x.arc(h[0], h[1] - Math.max(0.6, 3 * s), Math.max(1.2, 10 * s), Math.PI, 0); x.fill();
  };

  /* ---------------- every frame ---------------- */
  G.draw = function () {
    const x = this.ctx, c = this.cam;
    if (!c) return;
    x.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    let ox = 0, oy = 0;
    if (this.shk && this.rt < this.shk.until) {
      const k = (this.shk.until - this.rt) / 0.18;
      ox = (Math.random() * 2 - 1) * this.shk.amp * k; oy = (Math.random() * 2 - 1) * this.shk.amp * k;
    }
    x.save();
    x.translate(ox, oy);
    x.drawImage(this.bg, 0, 0, c.W, c.H);
    this.drawFlashes(x);
    this.drawFloorFx(x);
    const near = this.P[0], far = this.P[1];
    this.poses = [this.pose(near), this.pose(far)];
    const bp = this.ballPos(), held = bp && bp.held;
    const ballFar = !!bp && bp.y >= C.NET_Y;
    this.drawPShadow(x, far);
    if (bp && ballFar) this.drawBallShadow(x, bp);
    if (bp && ballFar && !held && bp.y > far.y) { this.drawBall(x, bp); this.drawPlayer(x, far); }
    else { this.drawPlayer(x, far); if (bp && ballFar) this.drawBall(x, bp); }
    x.drawImage(this.netCv, 0, 0, c.W, c.H);
    this.drawPShadow(x, near);
    if (bp && !ballFar) this.drawBallShadow(x, bp);
    if (bp && !ballFar && !held && bp.y > near.y + 10) { this.drawBall(x, bp); this.drawPlayer(x, near); }
    else { this.drawPlayer(x, near); if (bp && !ballFar) this.drawBall(x, bp); }
    this.drawDust(x);
    this.drawRing(x);
    this.drawPops(x);
    this.drawMarkCheck(x);
    x.restore();
  };

  G.ballPos = function () {
    const b = this.ball;
    if (b.held >= 0) {
      const p = this.P[b.held], q = this.poses ? this.poses[b.held] : this.pose(p);
      return { x: p.x + q.lh[0] * p.mir, y: p.y - (p.i === 0 ? -6 : 6), z: q.lh[1] + 4, held: true };
    }
    if (!b.live) return null;
    return { x: b.x, y: b.y, z: b.z };
  };

  G.drawBall = function (x, bp) {
    const pr = this.proj(bp.x, bp.y, bp.z), r = Math.max(2.3, C.BALL_VIS * pr[2]), tr = this.ball.trail;
    if (!bp.held && tr.length > 1 && !this.reduced) {
      x.lineCap = 'round';
      for (let i = 1; i < tr.length; i++) {
        const a = this.proj(tr[i - 1][0], tr[i - 1][1], tr[i - 1][2]), b = this.proj(tr[i][0], tr[i][1], tr[i][2]), k = i / tr.length;
        x.strokeStyle = 'rgba(250,246,238,' + (0.3 * k).toFixed(3) + ')';
        x.lineWidth = r * 1.6 * k;
        x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
      }
    }
    const g = x.createRadialGradient(pr[0] - r * 0.35, pr[1] - r * 0.35, r * 0.1, pr[0], pr[1], r);
    g.addColorStop(0, '#FFFFFF'); g.addColorStop(1, '#D6CEBF');
    x.fillStyle = g;
    x.beginPath(); x.arc(pr[0], pr[1], r, 0, TAU); x.fill();
    if (r > 3.4) {
      x.strokeStyle = 'rgba(150,138,120,.55)'; x.lineWidth = Math.max(0.6, r * 0.16);
      x.beginPath(); x.arc(pr[0] - r * 0.9, pr[1], r * 0.8, -0.9, 0.9); x.stroke();
    }
  };

  G.drawBallShadow = function (x, bp) {
    const c = this.cam, f = this.proj(bp.x + bp.z * 0.05, bp.y - bp.z * 0.04, 0);
    const r = Math.max(2.3, C.BALL_VIS * f[2]) * (1.15 + bp.z / 900), ratio = U.clamp(c.Hc / (c.D + bp.y), 0.25, 0.75);
    x.fillStyle = 'rgba(20,8,2,' + (0.34 * (1 - Math.min(bp.z / 650, 0.75))).toFixed(3) + ')';
    x.beginPath(); x.ellipse(f[0], f[1], r, r * ratio, 0, 0, TAU); x.fill();
  };

  G.drawPShadow = function (x, p) {
    const a = this.proj(p.x, p.y, 0), b = this.proj(p.x + 48, p.y - 34, 0), s = a[2];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]) / 2 + 12 * s;
    x.fillStyle = CD.SURF[this.surface].slide ? 'rgba(46,12,0,.18)' : 'rgba(0,12,4,.18)';
    x.beginPath(); x.ellipse(mx, my, len, 14 * s, Math.atan2(b[1] - a[1], b[0] - a[0]), 0, TAU); x.fill();
  };

  /* marks, slides, the landing hint, the run target */
  G.drawFloorFx = function (x) {
    const sf = CD.SURF[this.surface], c = this.cam, now = this.rt;
    const mk = this.fx.marks;
    for (let i = mk.length - 1; i >= 0; i--) {
      const m = mk[i], age = now - m.t0;
      let a;
      if (sf.mark) a = age < 8 ? 0.62 : 0.62 * (1 - (age - 8) / 3);
      else a = 0.4 * (1 - age / 0.7);
      if (a <= 0) { mk.splice(i, 1); continue; }
      const p = this.proj(m.x, m.y, 0), ratio = U.clamp(c.Hc / (c.D + m.y), 0.25, 0.75), rx = Math.max(1.4, 6.2 * p[2]);
      if (sf.mark) { x.fillStyle = 'rgba(' + sf.mark.join(',') + ',' + a.toFixed(3) + ')'; x.beginPath(); x.ellipse(p[0], p[1], rx, rx * ratio * 1.6, 0, 0, TAU); x.fill(); }
      else { x.strokeStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')'; x.lineWidth = 1.2; x.beginPath(); x.ellipse(p[0], p[1], rx * 2.2, rx * 2.2 * ratio, 0, 0, TAU); x.stroke(); }
    }
    const sl = this.fx.slides;
    if (sl.length) {
      x.lineCap = 'round';
      for (let i = sl.length - 1; i >= 0; i--) {
        const q = sl[i], age = now - q.t0, a = age < 5 ? 0.3 : 0.3 * (1 - (age - 5) / 3);
        if (a <= 0) { sl.splice(i, 1); continue; }
        const p1 = this.proj(q.x1, q.y1, 0), p2 = this.proj(q.x2, q.y2, 0);
        x.strokeStyle = 'rgba(92,30,10,' + a.toFixed(3) + ')';
        x.lineWidth = Math.max(1, 9 * p1[2]);
        x.beginPath(); x.moveTo(p1[0], p1[1]); x.lineTo(p2[0], p2[1]); x.stroke();
      }
    }
    const b = this.ball, pd = this.pred;
    if (this.levelIdx < 2 && b.inPlay && b.lastHit === 1 && b.bounces === 0 && pd && pd.b1 && pd.b1.y < C.NET_Y && !pd.net) {
      const p = this.proj(pd.b1.x, pd.b1.y, 0), ratio = U.clamp(c.Hc / (c.D + pd.b1.y), 0.25, 0.75);
      const r = 20 * p[2] * (1 + 0.12 * Math.sin(this.rt * 12));
      x.strokeStyle = 'rgba(244,239,230,.42)'; x.lineWidth = 1.4;
      x.beginPath(); x.ellipse(p[0], p[1], r, r * ratio, 0, 0, TAU); x.stroke();
    }
    const u = this.P[0];
    if ((this.state === 'rally' || this.state === 'serve') && !u.frozen && Math.abs(u.tx - u.x) > 45) {
      const p = this.proj(u.tx, u.y, 0), s = p[2];
      x.strokeStyle = 'rgba(244,239,230,.38)'; x.lineWidth = 1.5;
      x.beginPath(); x.moveTo(p[0] - 9 * s, p[1] - 6 * s); x.lineTo(p[0], p[1]); x.lineTo(p[0] + 9 * s, p[1] - 6 * s); x.stroke();
    }
  };

  G.drawDust = function (x) {
    const d = this.fx.dust, sf = CD.SURF[this.surface];
    if (!d.length || !sf.dust) return;
    const col = sf.dust.join(',');
    for (let i = 0; i < d.length; i++) {
      const q = d[i], p = this.proj(q.x, q.y, q.z), k = q.life / q.max;
      x.fillStyle = 'rgba(' + col + ',' + (0.45 * k).toFixed(3) + ')';
      x.beginPath(); x.arc(p[0], p[1], Math.max(0.8, q.r * p[2] * (1.6 - k * 0.6)), 0, TAU); x.fill();
    }
  };

  G.drawRing = function (x) {
    const r = this.ring;
    if (!r || r.x == null) return;
    const pr = this.proj(r.x, r.y, r.z), br = Math.max(2.3, C.BALL_VIS * pr[2]);
    if (r.done) {
      const k = U.clamp((this.rt - r.done.t) / 0.4, 0, 1);
      const col = r.done.grade === 'perfect' ? '224,107,67' : r.done.grade === 'good' ? '109,190,149' : '244,239,230';
      x.strokeStyle = 'rgba(' + col + ',' + (0.9 * (1 - k)).toFixed(3) + ')';
      x.lineWidth = 1 + 3 * (1 - k);
      x.beginPath(); x.arc(pr[0], pr[1], br + 6 + k * 26, 0, TAU); x.stroke();
      return;
    }
    if (!r.ok) return;
    const left = r.tc - 0.05 - this.rt, k = U.clamp(left / 0.7, 0, 1), hot = Math.abs(left) < 0.08 && !r.tapAt;
    const a = r.tapAt ? 0.3 : 0.28 + 0.62 * (1 - k);
    x.lineWidth = hot ? 3.2 : 2;
    x.strokeStyle = hot ? 'rgba(224,107,67,' + a.toFixed(3) + ')' : 'rgba(244,239,230,' + a.toFixed(3) + ')';
    x.beginPath(); x.arc(pr[0], pr[1], br + 5 + k * 40, 0, TAU); x.stroke();
    x.fillStyle = 'rgba(244,239,230,' + (0.15 + 0.4 * (1 - k)).toFixed(3) + ')';
    x.beginPath(); x.arc(pr[0], pr[1], 2, 0, TAU); x.fill();
  };

  G.drawPops = function (x) {
    const ps = this.fx.pops;
    if (!ps.length) return;
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    for (let i = ps.length - 1; i >= 0; i--) {
      const q = ps[i], age = this.rt - q.t0;
      if (age > q.dur) { ps.splice(i, 1); continue; }
      const k = age / q.dur, p = this.proj(q.x, q.y, q.z), a = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      const sc = age < 0.12 ? 0.7 + (age / 0.12) * 0.3 : 1;
      x.font = 'italic 700 ' + Math.round(q.size * sc) + 'px ' + FD;
      const ty = p[1] - k * q.rise;
      x.globalAlpha = a;
      x.lineWidth = 4; x.strokeStyle = q.clay ? 'rgba(199,85,47,.95)' : 'rgba(6,30,22,.75)';
      x.strokeText(q.text, p[0], ty);
      x.fillStyle = '#FBF8F2';
      x.fillText(q.text, p[0], ty);
      x.globalAlpha = 1;
    }
  };

  // Clay keeps the mark, so a close call is settled by looking at it (Roland-Garros style): a zoomed
  // top-down view of the mark and the line, then the verdict.
  G.drawMarkCheck = function (x) {
    const mc = this.markCheck;
    if (!mc) return;
    const age = this.rt - mc.t0;
    if (age > 2.3) { this.markCheck = null; return; }
    const c = this.cam, sf = CD.SURF[this.surface], lc = mc.lc;
    const a = age < 0.2 ? age / 0.2 : age > 2 ? (2.3 - age) / 0.3 : 1;
    const R = Math.min(74, c.W * 0.19), cx = c.W / 2, cy = c.H * 0.43, k = R / 15;
    x.save();
    x.globalAlpha = a;
    x.fillStyle = 'rgba(2,20,13,.35)';
    x.beginPath(); x.arc(cx, cy + 3, R + 3, 0, TAU); x.fill();
    x.beginPath(); x.arc(cx, cy, R, 0, TAU);
    x.fillStyle = sf.court ? sf.court[1] : sf.far;
    x.fill();
    x.save(); x.clip();
    if (sf.speck) {
      const rnd = U.rng(Math.round(mc.x * 7 + mc.y));
      for (let i = 0; i < 140; i++) { x.fillStyle = rnd() < 0.5 ? 'rgba(78,22,6,.25)' : 'rgba(240,160,120,.2)'; x.fillRect(cx - R + rnd() * 2 * R, cy - R + rnd() * 2 * R, 2, 1.5); }
    }
    x.fillStyle = sf.line;
    if (lc.axis === 'x') {
      const x0 = (lc.edge - mc.x) * k, x1 = (lc.edge + lc.inDir * lc.w - mc.x) * k;
      x.fillRect(cx + Math.min(x0, x1), cy - R, Math.abs(x1 - x0), 2 * R);
    } else if (lc.w) {
      const y0 = (lc.edge - mc.y) * k, y1 = (lc.edge + lc.inDir * lc.w - mc.y) * k;
      x.fillRect(cx - R, cy - Math.max(y0, y1), 2 * R, Math.abs(y1 - y0));
    }
    const mcol = sf.mark ? 'rgba(' + sf.mark.join(',') + ',.75)' : 'rgba(30,30,30,.45)';
    x.fillStyle = mcol;
    x.beginPath(); x.ellipse(cx, cy, C.R * k, C.R * 1.45 * k, 0, 0, TAU); x.fill();
    x.restore();
    x.strokeStyle = 'rgba(244,239,230,.92)'; x.lineWidth = 2;
    x.beginPath(); x.arc(cx, cy, R, 0, TAU); x.stroke();
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = '700 13px ' + FD;
    x.fillStyle = 'rgba(244,239,230,.9)';
    x.fillText(sf.mark ? 'MARK CHECK' : 'LINE CHECK', cx, cy - R - 12);
    if (age > 0.75) {
      const v = mc.inn ? 'IN' : 'OUT';
      x.font = 'italic 700 30px ' + FD;
      x.lineWidth = 5; x.strokeStyle = mc.inn ? 'rgba(14,74,54,.95)' : 'rgba(199,85,47,.95)';
      x.strokeText(v, cx, cy + R + 22);
      x.fillStyle = '#FBF8F2';
      x.fillText(v, cx, cy + R + 22);
    }
    x.restore();
  };

  G.drawFlashes = function (x) {
    const f = this.fx.flashes;
    for (let i = f.length - 1; i >= 0; i--) {
      const q = f[i], age = this.rt - q.t0;
      if (age > q.dur) { f.splice(i, 1); continue; }
      if (age < 0) continue;
      const a = 1 - age / q.dur;
      x.fillStyle = 'rgba(255,255,255,' + (0.16 * a).toFixed(3) + ')';
      x.beginPath(); x.arc(q.x, q.y, 5 + 6 * a, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,' + (0.9 * a).toFixed(3) + ')';
      x.beginPath(); x.arc(q.x, q.y, 1.2 + 1.8 * a, 0, TAU); x.fill();
    }
  };

  /* ---------------- effects bookkeeping ---------------- */
  G.addMark = function (x, y) {
    this.fx.marks.push({ x, y, t0: this.rt });
    if (this.fx.marks.length > 26) this.fx.marks.shift();
  };
  G.puff = function (x, y, z, n, small) {
    const sf = CD.SURF[this.surface];
    if (!sf.dust || this.reduced) return;
    const d = this.fx.dust;
    for (let i = 0; i < n && d.length < 90; i++) {
      const life = U.rand(0.45, 0.9);
      d.push({ x, y, z: z + 2, vx: U.rand(-70, 70), vy: U.rand(-70, 70), vz: U.rand(20, small ? 60 : 110), life, max: life, r: small ? U.rand(3, 5) : U.rand(5, 9) });
    }
  };
  G.startSlide = function (p) {
    if (this.time - p.slideAt < 0.45) return;
    p.slideAt = this.time;
    p.slideFrom = { x: p.x, y: p.y };
    this.sfx('slide', { surface: this.surface, duration: 0.32 });
    this.puff(p.x, p.y, 0, p.i === 0 ? 9 : 5, true);
  };
  G.addSlide = function (p) {
    const f = p.slideFrom;
    if (!f) { p.slideFrom = { x: p.x, y: p.y }; return; }
    if (Math.hypot(p.x - f.x, p.y - f.y) < 10) return;
    for (const off of [-11, 11]) this.fx.slides.push({ x1: f.x + off, y1: f.y, x2: p.x + off, y2: p.y, t0: this.rt });
    while (this.fx.slides.length > 220) this.fx.slides.shift();
    p.slideFrom = { x: p.x, y: p.y };
    if (Math.random() < 0.35) this.puff(p.x, p.y, 0, 1, true);
  };
  G.stepFx = function (dt) {
    const d = this.fx.dust;
    for (let i = d.length - 1; i >= 0; i--) {
      const q = d[i];
      q.life -= dt;
      if (q.life <= 0) { d.splice(i, 1); continue; }
      q.vz -= 240 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.z = Math.max(0, q.z + q.vz * dt); q.vx *= 0.97; q.vy *= 0.97;
    }
  };
  G.sampleTrail = function () {
    const b = this.ball, t = b.trail;
    if (!b.live || b.held >= 0 || b.rolling) { t.length = 0; return; }
    t.push([b.x, b.y, b.z]);
    if (t.length > 7) t.shift();
  };
  G.popAt = function (text, x, y, z, o) {
    o = o || {};
    this.fx.pops.push({ text, x, y, z, t0: this.rt, dur: o.dur || 0.95, size: o.size || 22, clay: !!o.clay, rise: o.rise != null ? o.rise : 26 });
    if (this.fx.pops.length > 6) this.fx.pops.shift();
  };
  G.callAt = function (text, x, y) { this.popAt(text, x, y, 70, { size: text.length > 6 ? 22 : 28, dur: 1.15, rise: 18 }); };
  G.gradeFx = function (grade, p) {
    const label = grade === 'perfect' ? 'PERFECT' : grade === 'good' ? 'GOOD' : 'EARLY';
    this.popAt(label, p.x, p.y, 225, { size: grade === 'perfect' ? 24 : 19, clay: grade === 'perfect', dur: 0.85 });
  };
  G.shake = function (amp) { this.shk = { until: this.rt + 0.18, amp }; };
  G.flash = function (n) {
    const sp = this.flashSpots;
    if (!sp || !sp.length) return;
    for (let i = 0; i < n; i++) {
      const s = sp[(Math.random() * sp.length) | 0];
      this.fx.flashes.push({ x: s[0], y: s[1], t0: this.rt + Math.random() * 0.8, dur: 0.1 + Math.random() * 0.09 });
    }
  };

  /* ---------------- the players ---------------- */
  // Two-bone IK in the picture plane. bend +1 / -1 picks which side the joint goes.
  function ik(a, t, l1, l2, bend) {
    let dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy);
    const max = (l1 + l2) * 0.999;
    if (d > max) { dx *= max / d; dy *= max / d; d = max; }
    if (d < 0.001) d = 0.001;
    const ca = U.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const ang = Math.atan2(dy, dx) + bend * Math.acos(ca);
    return { j: [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1], e: [a[0] + dx, a[1] + dy] };
  }
  function key(u, rh, th, lh, tw, cr, hop) { return { u, rh, th, lh, tw, cr, hop: hop || 0 }; }
  function headAt(rh, th) { return [rh[0] + Math.cos(th) * RK, rh[1] + Math.sin(th) * RK]; }
  function handFor(ball, th) { return [ball[0] - Math.cos(th) * RK, ball[1] - Math.sin(th) * RK]; }

  // Keyframes for each swing, in the player's own frame (x = their right, y = up from the court).
  // The contact frame puts the racket head on the ball.
  function keysFor(sw) {
    if (sw.keys) return sw.keys;
    const lx = sw.lx, lz = U.clamp(sw.lz, 18, 300), ready = key(0, [24, 104], 1.2, [10, 110], 0, 12);
    let k;
    if (sw.kind === 'fh') {
      k = [ready, key(0.3, [50, 136], 1.95, [36, 130], 0.85, 16), key(0.43, [54, 96], -0.85, [28, 124], 0.5, 16),
        key(0.5, handFor([lx, lz], 0.12), 0.12, [12, 124], 0.05, 14), key(0.66, [-4, 152], 2.35, [-20, 122], -0.55, 12),
        key(1, [-22, 148], 3.55, [-18, 130], -0.65, 12)];
    } else if (sw.kind === 'bh') {
      const P = Math.PI;
      k = [ready, key(0.3, [-48, 134], P - 1.95, [0, 0], -0.85, 16), key(0.43, [-52, 96], P + 0.85, [0, 0], -0.5, 16),
        key(0.5, handFor([lx, lz], P - 0.12), P - 0.12, [0, 0], -0.05, 14), key(0.66, [6, 152], P - 2.35, [0, 0], 0.55, 12),
        key(1, [24, 148], P - 3.55, [0, 0], 0.7, 12)];
    } else if (sw.kind === 'vfh') {
      const c = handFor([lx, lz], 0.75);
      k = [ready, key(0.35, [36, 132], 1.35, [10, 128], 0.4, 14), key(0.5, c, 0.75, [12, 126], 0.15, 14),
        key(0.75, [c[0] - 4, c[1] - 6], 0.6, [10, 120], 0.1, 13), key(1, [24, 112], 1.1, [10, 112], 0, 12)];
    } else if (sw.kind === 'vbh') {
      const P = Math.PI, c = handFor([lx, lz], P - 0.75);
      k = [ready, key(0.35, [-34, 132], P - 1.35, [-4, 124], -0.4, 14), key(0.5, c, P - 0.75, [-8, 122], -0.15, 14),
        key(0.75, [c[0] + 4, c[1] - 6], P - 0.6, [-8, 118], -0.1, 13), key(1, [24, 112], 1.1, [10, 112], 0, 12)];
    } else {
      // the serve: toss, trophy, up to the ball, through and across
      const c = handFor([lx, lz], 1.45);
      k = [key(0, [20, 106], 1.0, [-10, 122], 0, 8), key(0.22, [34, 114], -0.55, [-8, 208], 0.3, 14),
        key(0.42, [30, 150], -1.7, [-10, 202], 0.45, 24), key(0.55, c, 1.45, [-14, 154], 0, -6, 18),
        key(0.75, [-6, 126], -2.2, [-12, 118], -0.45, 8, 4), key(1, [-20, 100], -2.4, [-8, 112], -0.25, 10)];
    }
    sw.keys = k;
    return k;
  }
  function sampleKeys(k, u) {
    if (u <= k[0].u) return k[0];
    for (let i = 1; i < k.length; i++) {
      if (u <= k[i].u) {
        const a = k[i - 1], b = k[i], t = U.smooth((u - a.u) / (b.u - a.u));
        return {
          rh: [U.lerp(a.rh[0], b.rh[0], t), U.lerp(a.rh[1], b.rh[1], t)], th: U.lerp(a.th, b.th, t),
          lh: [U.lerp(a.lh[0], b.lh[0], t), U.lerp(a.lh[1], b.lh[1], t)], tw: U.lerp(a.tw, b.tw, t),
          cr: U.lerp(a.cr, b.cr, t), hop: U.lerp(a.hop, b.hop, t)
        };
      }
    }
    return k[k.length - 1];
  }

  G.pose = function (p) {
    const t = this.time, sp = Math.hypot(p.vx, p.vy), latV = p.vx * p.mir, run = U.clamp(sp / 520, 0, 1), ph = p.runPhase;
    let cr = 12, hop = 0, tw = 0, shift = 0, face = 0.75, grip = 20;
    let rh = [24, 104], th = 1.2, lh = [10, 110], both = true;
    const sAge = t - p.splitT, split = sAge >= 0 && sAge < 0.26;
    if (split) hop += Math.sin((sAge / 0.26) * Math.PI) * 7;
    const bob = sp < 40 ? Math.sin(t * 2.4 + p.i * 1.7) * 1.2 : -Math.abs(Math.sin(ph)) * 4 * run;
    const sw = p.swing;
    let swU = -1;
    if (sw) {
      const u = U.clamp((t - sw.t0) / sw.dur, 0, 1), k = sampleKeys(keysFor(sw), u);
      swU = u;
      rh = k.rh; th = k.th; lh = k.lh; tw = k.tw; cr = k.cr; hop += k.hop;
      both = sw.kind === 'bh'; grip = 9;
      face = 0.5 + 0.5 * Math.abs(Math.sin(u * Math.PI));
      if (sw.kind === 'fh' || sw.kind === 'bh') {
        const sh = U.clamp((Math.abs(sw.lx) - 95) * 0.7, 0, 70) * U.sgn(sw.lx);
        shift = sh * Math.sin(U.clamp(u / 0.8, 0, 1) * Math.PI);
        const lift = U.clamp((sw.lz - 160) * 0.45, 0, 42);
        hop += lift * Math.sin(U.clamp(u / 0.9, 0, 1) * Math.PI);
      } else if (sw.kind === 'vfh' || sw.kind === 'vbh') {
        const lift = U.clamp((sw.lz - 170) * 0.4, 0, 30);
        hop += lift * Math.sin(U.clamp(u / 0.9, 0, 1) * Math.PI);
      }
    } else if (p.act === 'cheer') {
      const a = t - p.actT;
      rh = [22, 222]; th = 1.57; lh = [-16, 160]; both = false;
      if (a < 0.7) hop += Math.max(0, Math.sin(a * 9)) * 6;
    } else if (p.act === 'sad') {
      rh = [18, 80]; th = -1.45; lh = [-12, 92]; cr = 4; both = false;
    } else if (sp > 120) {
      rh = [26 + Math.cos(ph) * 6 * run, 104 + Math.sin(ph) * 6 * run]; th = 1.0;
      lh = [-22 - Math.cos(ph) * 8 * run, 112 - Math.sin(ph) * 8 * run]; both = false;
    }
    const hipX = U.clamp(latV / 720, -1, 1) * 8 + shift, hipY = 96 - cr + bob + hop;
    const lean = U.clamp(latV / 800, -1, 1) * 0.1 + shift / 420;
    const half = 23 + run * 4 + (split ? 5 : 0);
    let lf = [-half + Math.cos(ph) * 15 * run + hipX * 0.35, Math.max(0, Math.sin(ph)) * 11 * run + hop * 0.85];
    let rf = [half - Math.cos(ph) * 15 * run + hipX * 0.35, Math.max(0, -Math.sin(ph)) * 11 * run + hop * 0.85];
    if (Math.abs(shift) > 15) { if (shift > 0) rf = [half + shift * 0.9, rf[1]]; else lf = [-half + shift * 0.9, lf[1]]; }
    if (p.sliding > 0) {
      const dir = U.sgn(latV || 1);
      if (dir > 0) rf = [half + 22, 0]; else lf = [-half - 22, 0];
      cr += 10;
    }
    let chest = [hipX + Math.sin(lean) * 50, hipY + 50 * Math.cos(lean)];
    let head = [chest[0] + Math.sin(lean) * 20, chest[1] + 22];
    const sw2 = 20 * (1 - 0.42 * Math.min(1, Math.abs(tw)));
    let ls = [chest[0] - sw2 + tw * 4, chest[1] - 3], rs = [chest[0] + sw2 + tw * 4, chest[1] - 3];
    const lHip = [hipX - 10, hipY], rHip = [hipX + 10, hipY];
    const L = ik(lHip, lf, 45, 47, -1), R = ik(rHip, rf, 45, 47, 1);
    if (sw && Math.abs(swU - sw.cAt) < 0.08) {
      // out of reach: lean the chest and shoulders toward the hand
      const fade = 1 - Math.abs(swU - sw.cAt) / 0.08;
      const dx = rh[0] - rs[0], dy = rh[1] - rs[1], dist = Math.hypot(dx, dy), over = Math.min(14, dist - 57) * fade;
      if (dist > 1e-6 && over > 0) {
        const mx = dx / dist * over, my = dy / dist * over;
        chest = [chest[0] + mx, chest[1] + my]; head = [head[0] + mx, head[1] + my];
        ls = [ls[0] + mx, ls[1] + my]; rs = [rs[0] + mx, rs[1] + my];
      }
    }
    const ra = ik(rs, rh, 29, 28, 1);
    rh = ra.e;
    if (both) lh = [rh[0] + Math.cos(th) * grip, rh[1] + Math.sin(th) * grip];
    const la = ik(ls, lh, 29, 28, -1);
    return { hipX, hipY, lHip, rHip, lf: L.e, rf: R.e, lk: L.j, rk: R.j, chest, head, ls, rs, re: ra.j, le: la.j, rh, lh: la.e, th, tw, face };
  };

  G.drawPlayer = function (x, p) {
    const q = this.poses ? this.poses[p.i] : this.pose(p), pr = this.proj(p.x, p.y, 0), s = pr[2], m = p.mir, k = p.kit;
    const big = 185 * s > 46;
    const X = (v) => pr[0] + v[0] * s * m, Y = (v) => pr[1] - v[1] * s;
    const seg = (a, b, w, col) => {
      x.strokeStyle = col; x.lineWidth = Math.max(1, w * s);
      x.beginPath(); x.moveTo(X(a), Y(a)); x.lineTo(X(b), Y(b)); x.stroke();
    };
    const poly = (pts, col) => {
      x.fillStyle = col; x.beginPath();
      pts.forEach((v, i) => (i ? x.lineTo(X(v), Y(v)) : x.moveTo(X(v), Y(v))));
      x.closePath(); x.fill();
    };
    const mid = (a, b, t) => [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t)];
    x.lineCap = 'round'; x.lineJoin = 'round';
    // legs, socks, shoes
    [[q.lHip, q.lk, q.lf], [q.rHip, q.rk, q.rf]].forEach((l) => {
      const f = l[2];
      seg(l[0], l[1], 15, k.skin);
      seg(l[1], [f[0], f[1] + 9], 11.5, k.skin);
      seg([f[0], f[1] + 10], [f[0], f[1] + 3], 10.5, '#F4EFE6');
      x.fillStyle = k.shoe;
      x.beginPath(); x.ellipse(X([f[0], 0]), Y([0, f[1] + 2.5]), Math.max(1.6, 8.5 * s), Math.max(1, 4.3 * s), 0, 0, TAU); x.fill();
    });
    // shorts
    const lm = mid(q.lHip, q.lk, 0.5), rm = mid(q.rHip, q.rk, 0.5);
    poly([[q.hipX - 17, q.hipY + 10], [q.hipX + 17, q.hipY + 10], [q.hipX + 19, q.hipY - 2], [rm[0] + 9, rm[1]], [rm[0] - 7, rm[1] - 1],
      [q.hipX, q.hipY - 7], [lm[0] + 7, lm[1] - 1], [lm[0] - 9, lm[1]], [q.hipX - 19, q.hipY - 2]], k.shorts);
    // shirt, shaded away from the sun (it comes from the left of the picture)
    const tl = [q.ls[0] - 7, q.ls[1] + 3], tr = [q.rs[0] + 7, q.rs[1] + 3], br = [q.hipX + 17, q.hipY + 8], bl = [q.hipX - 17, q.hipY + 8];
    const gx0 = Math.min(X(tl), X(tr)), gx1 = Math.max(X(tl), X(tr));
    const g = x.createLinearGradient(gx0, 0, gx1 + 0.01, 0);
    g.addColorStop(0, k.shirt); g.addColorStop(0.55, k.shirt); g.addColorStop(1, k.shirtDark);
    x.strokeStyle = g; x.lineWidth = Math.max(1, 6 * s);
    x.beginPath(); [tl, tr, br, bl].forEach((v, i) => (i ? x.lineTo(X(v), Y(v)) : x.moveTo(X(v), Y(v)))); x.closePath();
    x.fillStyle = g; x.fill(); x.stroke();
    seg(q.chest, [q.chest[0], q.chest[1] + 9], 8, k.skin);
    // head
    const hx = X(q.head), hy = Y(q.head), hr = Math.max(1.6, 10.5 * s);
    if (p.i === 0) {
      x.fillStyle = k.skin;
      x.beginPath(); x.arc(hx - hr, hy + hr * 0.1, hr * 0.24, 0, TAU); x.arc(hx + hr, hy + hr * 0.1, hr * 0.24, 0, TAU); x.fill();
      x.fillStyle = k.hair; x.beginPath(); x.arc(hx, hy, hr, 0, TAU); x.fill();
      x.strokeStyle = k.band; x.lineWidth = Math.max(1, hr * 0.32); x.lineCap = 'butt';
      x.beginPath(); x.moveTo(hx - hr * 0.97, hy - hr * 0.18); x.lineTo(hx + hr * 0.97, hy - hr * 0.18); x.stroke();
      x.lineCap = 'round';
    } else {
      x.fillStyle = k.skin; x.beginPath(); x.arc(hx, hy, hr, 0, TAU); x.fill();
      x.fillStyle = k.cap || k.hair; x.beginPath(); x.arc(hx, hy - hr * 0.08, hr * 1.03, Math.PI * 1.02, Math.PI * 1.98); x.fill();
      x.fillRect(hx - hr * 1.15, hy - hr * 0.2, hr * 2.3, Math.max(0.8, hr * 0.22));
    }
    // arms: the free arm, then the racket arm and the racket
    const arm = (sh, el, hd) => {
      seg(sh, el, 9.5, k.skin); seg(el, hd, 8.5, k.skin);
      seg(sh, mid(sh, el, 0.42), 12, k.shirt);
      x.fillStyle = k.skin; x.beginPath(); x.arc(X(hd), Y(hd), Math.max(1, 4.6 * s), 0, TAU); x.fill();
    };
    arm(q.ls, q.le, q.lh);
    arm(q.rs, q.re, q.rh);
    const dir = [Math.cos(q.th), Math.sin(q.th)], at = (d) => [q.rh[0] + dir[0] * d, q.rh[1] + dir[1] * d];
    seg(q.rh, at(19), 4.4, k.frame);
    seg(at(19), at(31), 3.4, k.throat);
    const hc = at(RK), rot = Math.atan2(-dir[1], dir[0] * m);
    x.beginPath(); x.ellipse(X(hc), Y(hc), Math.max(2.4, 16.5 * s), Math.max(1.2, 12.5 * s * q.face), rot, 0, TAU);
    x.fillStyle = 'rgba(244,239,230,.2)'; x.fill();
    x.strokeStyle = k.frame; x.lineWidth = Math.max(1.1, 2.7 * s); x.stroke();
    if (big) {
      x.save(); x.clip();
      x.strokeStyle = 'rgba(244,239,230,.45)'; x.lineWidth = 0.6;
      const cx = X(hc), cy = Y(hc), L = 17 * s, ux = Math.cos(rot), uy = Math.sin(rot);
      x.beginPath();
      for (let i = -2; i <= 2; i++) {
        const o = i * 5 * s;
        x.moveTo(cx - ux * L - uy * o, cy - uy * L + ux * o); x.lineTo(cx + ux * L - uy * o, cy + uy * L + ux * o);
        x.moveTo(cx + ux * o * 1.3 - uy * L, cy + uy * o * 1.3 + ux * L); x.lineTo(cx + ux * o * 1.3 + uy * L, cy + uy * o * 1.3 - ux * L);
      }
      x.stroke(); x.restore();
    }
  };
})();

// ═══ cd-ui.js ═══
/* Between Sets: cd-ui.js. Everything that is not drawn on the canvas: the scoreboard, the rest timer,
   the sound and pause buttons, the score banner, Amir's lines, the hint, and the sheets (menu, pause,
   rest over, match report, rally result). Styles are injected once and scoped to .cd-root, so the game
   can be dropped into the app as it is. No text under 12 px, no yellow. */
(function () {
  'use strict';
  const CD = window.CourtDuel, U = CD.U, G = CD.Game.prototype, esc = U.esc;

  const CSS = `
.cd-root{--cd-ink:#F4EFE6;--cd-dim:rgba(244,239,230,.74);--cd-faint:rgba(244,239,230,.16);--cd-glass:rgba(5,32,23,.8);
--cd-card:rgba(5,30,22,.95);--cd-clay:#C7552F;--cd-clay-hi:#E06B43;--cd-mint:#6DBE95;--cd-green:#0E4A36;
--cd-fd:'Barlow Condensed','Arial Narrow',sans-serif;--cd-fb:'Barlow',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
position:relative;overflow:hidden;background:#05231A;color:var(--cd-ink);font-family:var(--cd-fb);
-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;outline:none}
.cd-root:focus-visible{box-shadow:inset 0 0 0 2px var(--cd-mint)}
.cd-root [hidden]{display:none!important}
.cd-root button{font:inherit;color:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent}
.cd-root button:focus-visible{outline:2px solid var(--cd-mint);outline-offset:2px}
.cd-cv{position:absolute;inset:0;display:block;touch-action:none;cursor:default}
.cd-root.cd-live .cd-cv{cursor:none}
.cd-hud{position:absolute;inset:0;pointer-events:none}
.cd-board{position:absolute;left:10px;top:10px;min-width:156px;padding:6px 8px 6px;border-radius:10px;
background:var(--cd-glass);border:1px solid var(--cd-faint);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.cd-row{display:grid;grid-template-columns:9px minmax(0,1fr) 22px 34px;align-items:center;column-gap:6px;height:24px;font-variant-numeric:tabular-nums}
.cd-dot{width:7px;height:7px;border-radius:50%;background:var(--cd-clay-hi);opacity:0;transition:opacity .2s}
.cd-row.srv .cd-dot{opacity:1}
.cd-name{font:700 16px/1 var(--cd-fd);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cd-g{font:600 16px/1 var(--cd-fd);text-align:center;color:var(--cd-dim)}
.cd-pt{font:700 17px/1 var(--cd-fd);text-align:center;background:rgba(244,239,230,.12);border-radius:6px;padding:3px 0 2px}
.cd-tag{font:600 12px/1.2 var(--cd-fb);letter-spacing:.06em;text-transform:uppercase;color:var(--cd-mint);padding:3px 0 0 15px}
.cd-tag:empty{display:none}
.cd-tools{position:absolute;z-index:3;right:10px;top:10px;display:flex;gap:6px;align-items:center;pointer-events:auto}
.cd-tools.in-menu .cd-pause{display:none}
.cd-ic{width:40px;height:40px;border-radius:10px;border:1px solid var(--cd-faint);background:var(--cd-glass);display:grid;place-items:center;padding:0}
.cd-ic svg{width:20px;height:20px;fill:none;stroke:var(--cd-ink);stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.cd-rest{height:40px;padding:0 10px;border-radius:10px;border:1px solid var(--cd-faint);background:var(--cd-glass);display:flex;flex-direction:column;justify-content:center;align-items:flex-end}
.cd-rest-l{font:600 12px/1 var(--cd-fb);letter-spacing:.08em;text-transform:uppercase;color:var(--cd-dim)}
.cd-rest-t{font:700 18px/1.05 var(--cd-fd);font-variant-numeric:tabular-nums}
.cd-rest.warn{border-color:var(--cd-clay);background:rgba(199,85,47,.9)}
.cd-rest.warn .cd-rest-l{color:var(--cd-ink)}
.cd-speed{position:absolute;right:10px;top:58px;padding:5px 9px;border-radius:8px;background:var(--cd-glass);border:1px solid var(--cd-faint);
display:flex;gap:6px;align-items:baseline;opacity:0;transform:translateY(-4px);transition:opacity .25s,transform .25s}
.cd-speed.on{opacity:1;transform:none}
.cd-speed-l{font:600 12px/1 var(--cd-fb);letter-spacing:.08em;text-transform:uppercase;color:var(--cd-dim)}
.cd-speed-v{font:700 18px/1 var(--cd-fd);font-variant-numeric:tabular-nums}
.cd-banner{position:absolute;left:50%;top:34%;transform:translate(-50%,-50%) scale(.92);text-align:center;opacity:0;transition:opacity .22s,transform .22s;width:92%}
.cd-banner.on{opacity:1;transform:translate(-50%,-50%) scale(1)}
.cd-banner-big{font:italic 700 44px/1 var(--cd-fd);letter-spacing:.01em;text-shadow:0 2px 14px rgba(0,0,0,.55),0 1px 0 rgba(0,0,0,.4)}
.cd-banner-small{margin-top:6px;font:600 14px/1.2 var(--cd-fb);letter-spacing:.08em;text-transform:uppercase;color:var(--cd-ink);text-shadow:0 1px 8px rgba(0,0,0,.7)}
.cd-banner-small:empty{display:none}
.cd-coach{position:absolute;left:10px;bottom:46px;max-width:min(80%,330px);display:flex;gap:9px;align-items:center;padding:7px 12px 7px 7px;border-radius:999px;
background:var(--cd-card);border:1px solid var(--cd-faint);opacity:0;transform:translateY(8px);transition:opacity .25s,transform .25s}
.cd-coach.on{opacity:1;transform:none}
.cd-av{flex:none;width:30px;height:30px;box-sizing:border-box;border-radius:50%;background:var(--cd-green);border:1px solid rgba(244,239,230,.35);display:grid;place-items:center;font:700 13px/1 var(--cd-fd);letter-spacing:.04em}
.cd-av.cd-av-img{overflow:hidden;padding:0}
.cd-av img{display:block;width:100%;height:100%;object-fit:cover;border-radius:50%}
.cd-say{font:500 15px/1.25 var(--cd-fb)}
.cd-hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:6px 12px;border-radius:999px;background:rgba(5,30,22,.72);
font:600 13px/1.2 var(--cd-fb);letter-spacing:.02em;white-space:nowrap;opacity:0;transition:opacity .3s}
.cd-hint.on{opacity:1}
.cd-sheet{position:absolute;z-index:2;inset:0;display:flex;align-items:flex-end;justify-content:center;padding:60px 12px 12px;pointer-events:auto;
background:linear-gradient(to bottom,rgba(2,18,12,.15) 0%,rgba(2,18,12,.55) 45%,rgba(2,18,12,.8) 100%)}
.cd-sheet.mid{align-items:center}
.cd-root.cd-narrow .cd-board{min-width:0;max-width:calc(100% - 186px)}
.cd-root.cd-narrow .cd-row{grid-template-columns:8px minmax(0,1fr) 18px 30px;column-gap:5px}
.cd-root.cd-narrow .cd-rest-l{display:none}
.cd-root.cd-narrow .cd-rest{padding:0 8px}
.cd-root.cd-short .cd-sheet{padding-top:12px}
.cd-root.cd-short .cd-lede,.cd-root.cd-short .cd-how{display:none}
.cd-root.cd-short .cd-title{font-size:30px}
.cd-root.cd-short .cd-opts{margin-top:10px}
.cd-root.cd-short .cd-acts{margin-top:10px}
.cd-card{box-sizing:border-box;width:100%;max-width:440px;max-height:100%;overflow:auto;touch-action:pan-y;-webkit-overflow-scrolling:touch;background:var(--cd-card);
border:1px solid var(--cd-faint);border-radius:18px;padding:18px 18px 16px;box-shadow:0 18px 50px rgba(0,0,0,.45);-webkit-user-select:text;user-select:text}
.cd-eye{margin:0 0 4px;font:600 12px/1.3 var(--cd-fb);letter-spacing:.14em;text-transform:uppercase;color:var(--cd-mint)}
.cd-title{margin:0;font:700 42px/.95 var(--cd-fd);letter-spacing:.01em;text-transform:uppercase;text-wrap:balance}
.cd-title.sm{font-size:34px}
.cd-lede{margin:8px 0 14px;font:400 15px/1.45 var(--cd-fb);color:var(--cd-dim);max-width:44ch}
.cd-acts{display:grid;gap:8px}
.cd-b{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:50px;padding:0 16px;border-radius:12px;
border:1px solid rgba(244,239,230,.42);background:transparent;font:700 19px/1 var(--cd-fd);letter-spacing:.04em;text-transform:uppercase;text-align:left}
.cd-b span{font:600 13px/1.2 var(--cd-fb);letter-spacing:.02em;text-transform:none;color:var(--cd-dim)}
.cd-b.main{background:var(--cd-ink);color:var(--cd-green);border-color:var(--cd-ink)}
.cd-b.main span{color:rgba(14,74,54,.8)}
.cd-b:active{transform:scale(.985)}
.cd-opts{display:grid;gap:9px;margin:16px 0 4px}
.cd-opt{display:grid;grid-template-columns:86px minmax(0,1fr);align-items:center;gap:8px}
.cd-opt-l{font:600 13px/1.2 var(--cd-fb);color:var(--cd-dim)}
.cd-seg{display:flex;padding:3px;border-radius:10px;background:rgba(244,239,230,.08);border:1px solid var(--cd-faint)}
.cd-seg button{flex:1;min-height:34px;border:0;border-radius:7px;background:transparent;font:600 14px/1 var(--cd-fb);color:var(--cd-dim);padding:0 4px;white-space:nowrap}
.cd-seg button[aria-pressed="true"]{background:var(--cd-ink);color:var(--cd-green)}
.cd-how{list-style:none;margin:14px 0 0;padding:12px 0 0;border-top:1px solid var(--cd-faint);display:grid;gap:7px}
.cd-how li{display:grid;grid-template-columns:52px minmax(0,1fr);gap:8px;font:400 14px/1.4 var(--cd-fb);color:var(--cd-dim)}
.cd-how b{font:700 14px/1.4 var(--cd-fd);letter-spacing:.06em;text-transform:uppercase;color:var(--cd-ink)}
.cd-foot{margin:12px 0 0;font:400 13px/1.4 var(--cd-fb);color:var(--cd-dim)}
.cd-big{font:italic 700 64px/1 var(--cd-fd);margin:4px 0 2px}
.cd-new{display:inline-block;margin-left:8px;padding:3px 8px;border-radius:999px;background:var(--cd-clay);color:var(--cd-ink);font:700 13px/1.2 var(--cd-fd);letter-spacing:.06em;vertical-align:middle}
.cd-score{display:flex;gap:10px;align-items:baseline;margin:6px 0 2px;font:700 30px/1 var(--cd-fd);font-variant-numeric:tabular-nums}
.cd-score small{font:600 13px/1.2 var(--cd-fb);color:var(--cd-dim);letter-spacing:.04em}
.cd-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:14px 0}
.cd-stats h3{margin:0 0 6px;font:600 12px/1.2 var(--cd-fb);letter-spacing:.12em;text-transform:uppercase;color:var(--cd-mint)}
.cd-stats dl{margin:0;display:grid;gap:5px}
.cd-stats div{display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid rgba(244,239,230,.08);padding-bottom:4px}
.cd-stats dt{font:400 13px/1.3 var(--cd-fb);color:var(--cd-dim)}
.cd-stats dd{margin:0;font:700 15px/1.3 var(--cd-fd);font-variant-numeric:tabular-nums;white-space:nowrap}
.cd-note{display:flex;gap:10px;align-items:flex-start;margin:4px 0 14px;padding:10px 12px;border-radius:12px;background:rgba(244,239,230,.07)}
.cd-note p{margin:0;font:500 15px/1.4 var(--cd-fb)}
/* App mode: the game fills the app's full-screen layer, so keep clear of the notch and the home bar. */
.cd-root.cd-app .cd-board{top:calc(env(safe-area-inset-top,0px) + 10px);max-width:calc(100% - 196px)}
.cd-root.cd-app .cd-tools{top:calc(env(safe-area-inset-top,0px) + 10px)}
.cd-root.cd-app .cd-speed{top:calc(env(safe-area-inset-top,0px) + 58px)}
.cd-root.cd-app .cd-coach{bottom:calc(env(safe-area-inset-bottom,0px) + 46px)}
.cd-root.cd-app .cd-hint{bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
.cd-root.cd-app .cd-sheet{padding-top:calc(env(safe-area-inset-top,0px) + 60px);padding-bottom:calc(env(safe-area-inset-bottom,0px) + 12px)}
.cd-root.cd-app.cd-short .cd-sheet{padding-top:calc(env(safe-area-inset-top,0px) + 56px)}
@media (max-width:360px){.cd-stats{grid-template-columns:minmax(0,1fr)}.cd-title{font-size:36px}.cd-opt{grid-template-columns:70px minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){.cd-root *{transition:none!important}}`;

  const ICON = {
    on: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.5 4.5 0 010 6M18 6.5a8 8 0 010 11"/></svg>',
    off: '<svg viewBox="0 0 24 24"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M9 6v12M15 6v12"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  G.buildDom = function () {
    if (!document.getElementById('cd-css')) {
      const st = document.createElement('style');
      st.id = 'cd-css'; st.textContent = CSS;
      document.head.appendChild(st);
    }
    const r = this.root;
    r.classList.add('cd-root');
    if (this.host) r.classList.add('cd-app');
    r.tabIndex = 0;
    r.setAttribute('role', 'application');
    r.setAttribute('aria-label', 'Between Sets, a tennis game');
    r.innerHTML =
      '<canvas class="cd-cv" aria-hidden="true"></canvas>' +
      '<div class="cd-hud">' +
      '<div class="cd-board" aria-live="polite" hidden>' +
      '<div class="cd-row" data-p="0"><i class="cd-dot"></i><b class="cd-name"></b><span class="cd-g"></span><span class="cd-pt"></span></div>' +
      '<div class="cd-row" data-p="1"><i class="cd-dot"></i><b class="cd-name"></b><span class="cd-g"></span><span class="cd-pt"></span></div>' +
      '<div class="cd-tag"></div></div>' +
      '<div class="cd-tools in-menu"><div class="cd-rest" hidden><span class="cd-rest-l">Rest</span><span class="cd-rest-t">0:00</span></div>' +
      (this.host ? '' : '<button class="cd-ic cd-snd" type="button"></button>') +
      '<button class="cd-ic cd-pause" type="button" aria-label="Pause">' + ICON.pause + '</button>' +
      (this.host ? '<button class="cd-ic cd-x" type="button" aria-label="Back to the rest timer">' + ICON.close + '</button>' : '') + '</div>' +
      '<div class="cd-speed"><span class="cd-speed-l"></span><b class="cd-speed-v"></b></div>' +
      '<div class="cd-banner" aria-live="polite"><div class="cd-banner-big"></div><div class="cd-banner-small"></div></div>' +
      '<div class="cd-coach" aria-live="polite">' + this.avHtml() + '<span class="cd-say"></span></div>' +
      '<div class="cd-hint"></div>' +
      '</div>' +
      '<div class="cd-sheet" hidden><div class="cd-card" role="dialog" aria-modal="true"></div></div>';
    const q = (s) => r.querySelector(s);
    this.cv = q('.cd-cv');
    const rows = r.querySelectorAll('.cd-row');
    this.ui = {
      board: q('.cd-board'), tag: q('.cd-tag'), tools: q('.cd-tools'), rest: q('.cd-rest'), restT: q('.cd-rest-t'),
      snd: q('.cd-snd'), x: q('.cd-x'), pause: q('.cd-pause'), speed: q('.cd-speed'), speedL: q('.cd-speed-l'), speedV: q('.cd-speed-v'),
      banner: q('.cd-banner'), bBig: q('.cd-banner-big'), bSmall: q('.cd-banner-small'), coach: q('.cd-coach'), say: q('.cd-say'),
      hint: q('.cd-hint'), sheet: q('.cd-sheet'), card: q('.cd-card'),
      rows: Array.prototype.map.call(rows, (row) => ({ el: row, name: row.querySelector('.cd-name'), g: row.querySelector('.cd-g'), pt: row.querySelector('.cd-pt') }))
    };
    this._txt = {};
    this.paintSound();
    if (this.ui.snd) this.ui.snd.addEventListener('click', () => this.toggleSound());
    if (this.ui.x) this.ui.x.addEventListener('click', () => { try { this.host.close(); } catch (e) { /* the host is gone */ } });
    // The coach's picture can fail to load (no signal, an old cache): then the circle keeps its initials.
    r.addEventListener('error', (e) => {
      const t = e.target;
      if (!t || t.tagName !== 'IMG' || !t.hasAttribute('data-av')) return;
      this._avFail = true;
      const p = t.parentNode;
      if (p) { p.classList.remove('cd-av-img'); p.textContent = 'AA'; }
    }, true);
    this.ui.pause.addEventListener('click', () => this.togglePause());
    this.ui.card.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]');
      if (b) this.act(b.getAttribute('data-act'), b.getAttribute('data-v'));
    });
    this.coarse = (() => { try { return window.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } })();
  };

  // The coach's circle: his photo in the app (the app serves it), his initials anywhere else or when the photo fails.
  G.avHtml = function () {
    return this.host && !this._avFail
      ? '<span class="cd-av cd-av-img" aria-hidden="true"><img src="/assets/img/coach.jpg" alt="" data-av></span>'
      : '<span class="cd-av" aria-hidden="true">AA</span>';
  };

  // Write text only when it changed (the HUD is painted every frame).
  G.setText = function (el, key, v) { v = String(v); if (this._txt[key] !== v) { this._txt[key] = v; el.textContent = v; } };

  G.paintSound = function () {
    const b = this.ui.snd;
    if (!b) return;                          // app mode has no sound button of its own
    b.innerHTML = this.soundOn ? ICON.on : ICON.off;
    b.setAttribute('aria-label', this.soundOn ? 'Sound on. Tap to mute' : 'Sound off. Tap to turn on');
    b.setAttribute('aria-pressed', this.soundOn ? 'true' : 'false');
  };
  G.toggleSound = function () {
    this.soundOn = !this.soundOn;
    const S = window.CourtSound;
    if (S) {
      try {
        if (this.soundOn) { S.unlock(); S.setMuted(false); if (this.state !== 'menu') { S.crowdStart(); this._crowd = true; } S.ui({ kind: 'confirm' }); }
        else { S.crowdStop(); S.setMuted(true); this._crowd = false; }
      } catch (e) { /* optional */ }
    }
    this.paintSound();
    this.saveSettings();
  };

  G.paintHud = function () {
    const u = this.ui, inMenu = this.state === 'menu';
    this.root.classList.toggle('cd-live', !inMenu && !this.paused && !this.sheetOpen && !!this.input.mouse);
    u.tools.classList.toggle('in-menu', inMenu || this.state === 'over');
    const r = this.rest;
    if (this.host) {                           // the app's clock: whole seconds, or null while the rest is paused
      const s = this.leftNow == null ? null : Math.ceil(this.leftNow);
      if (s == null) u.rest.hidden = true;
      else {
        this.setText(u.restT, 'rest', Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
        u.rest.hidden = false;
        u.rest.classList.toggle('warn', s <= 10);
      }
    } else if (r && !inMenu) {
      const s = Math.ceil(r.left);
      this.setText(u.restT, 'rest', Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'));
      u.rest.hidden = false;
      u.rest.classList.toggle('warn', r.left <= 10);
    } else u.rest.hidden = true;
    if (this.speedUntil && this.rt > this.speedUntil) { u.speed.classList.remove('on'); this.speedUntil = 0; }
    if (this.bannerUntil && this.rt > this.bannerUntil) { u.banner.classList.remove('on'); this.bannerUntil = 0; }
    if (this.coachUntil && this.rt > this.coachUntil) { u.coach.classList.remove('on'); this.coachUntil = 0; }
    this.paintBoard();
  };

  G.paintBoard = function () {
    // Hidden in the menu and behind the cards that cover the court (the report shows the score itself).
    const big = this.sheetOpen === 'Menu' || this.sheetOpen === 'Match report' || this.sheetOpen === 'Rally result';
    const u = this.ui, show = this.state !== 'menu' && !big;
    u.board.hidden = !show;
    if (!show) return;
    const rows = u.rows;
    if (this.mode === 'drill') {
      const best = Math.max(U.load('best', 0) | 0, this.drillCount || 0);
      this.setText(rows[0].name, 'n0', 'Rally'); this.setText(rows[0].g, 'g0', ''); this.setText(rows[0].pt, 'p0', this.drillCount || 0);
      this.setText(rows[1].name, 'n1', 'Best'); this.setText(rows[1].g, 'g1', ''); this.setText(rows[1].pt, 'p1', best);
      rows[0].el.classList.remove('srv'); rows[1].el.classList.remove('srv');
      this.setText(u.tag, 'tag', 'Rally drill');
      return;
    }
    const m = this.m;
    if (!m) return;
    const P = ['0', '15', '30', '40'];
    const server = this.srv && (this.state === 'serve' || this.state === 'rally' || this.state === 'dead') ? this.srv.who : m.server;
    for (let i = 0; i < 2; i++) {
      this.setText(rows[i].name, 'n' + i, i === 0 ? this.o.player : this.o.opponent);
      this.setText(rows[i].g, 'g' + i, m.games[i]);
      this.setText(rows[i].pt, 'p' + i, m.tb ? m.pts[i] : P[Math.min(3, m.pts[i])]);
      rows[i].el.classList.toggle('srv', server === i && !m.done);
    }
    let tag = '';
    if (m.tb) tag = m.pts[0] === 4 && m.pts[1] === 4 ? 'Deciding point' : 'Tiebreak';
    else if (m.pts[0] === 3 && m.pts[1] === 3) tag = 'Deciding point';
    if (this.srv && this.srv.faults && (this.state === 'serve' || this.state === 'rally')) tag = tag ? tag + ' · 2nd serve' : '2nd serve';
    this.setText(u.tag, 'tag', tag);
  };

  G.banner = function (big, small, long) {
    const u = this.ui;
    u.bBig.textContent = big; u.bSmall.textContent = small || '';
    u.banner.classList.add('on');
    this.bannerUntil = this.rt + (long ? 2.0 : 1.3);
  };
  G.coachSay = function (text) {
    const u = this.ui;
    u.say.textContent = text;
    u.coach.classList.add('on');
    this.coachUntil = this.rt + 2.8;
  };
  G.showSpeed = function (kmh, label) {
    const u = this.ui;
    u.speedL.textContent = label || 'Shot';
    u.speedV.textContent = kmh + ' km/h';
    u.speed.classList.add('on');
    this.speedUntil = this.rt + 2.2;
  };
  G.updateHint = function () {
    let t = '';
    const sv = this.srv, mouse = this.input.mouse || (!this.coarse && this.input.mouse !== false);
    const run = mouse ? 'Move the mouse to run' : 'Drag anywhere to run';
    if (this.state === 'serve' && sv) {
      if (sv.kind === 'feed') t = sv.phase === 'wait' ? (mouse ? 'Click to start the rally' : 'Tap to start the rally') : '';
      else if (sv.who === 0) t = sv.phase === 'ready' ? (sv.faults ? 'Second serve. Tap to toss' : 'Tap to toss') : sv.phase === 'toss' ? 'Tap again at the top' : '';
      else if (!this.hints.drag) t = run;
    } else if (this.state === 'rally') {
      if (!this.hints.drag && this.ball.lastHit === 1) t = run;
      else if (!this.hints.ring && this.ring && this.ring.ok && !this.ring.tapAt && !this.ring.done) t = mouse ? 'Click as the ring closes' : 'Tap as the ring closes';
    }
    if (this.autoplay) t = '';
    if (t !== this._hint) {
      this._hint = t;
      if (t) this.ui.hint.textContent = t;
      this.ui.hint.classList.toggle('on', !!t);
    }
  };

  /* ---------------- sheets ---------------- */
  G.openSheet = function (html, kind, mid) {
    const u = this.ui;
    u.card.innerHTML = html;
    u.sheet.hidden = false;
    u.sheet.classList.toggle('mid', !!mid);
    u.card.setAttribute('aria-label', kind);
    this.sheetOpen = kind;
    this.ui.coach.classList.remove('on');
    this.ui.hint.classList.remove('on'); this._hint = '';
    const first = u.card.querySelector('.cd-b');
    if (first && !this.coarse) { try { first.focus({ preventScroll: true }); } catch (e) { /* fine */ } }
  };
  G.closeSheet = function () {
    this.ui.sheet.hidden = true;
    this.sheetOpen = null;
    try { this.root.focus({ preventScroll: true }); } catch (e) { /* fine */ }
  };
  function seg(label, act, opts, cur) {
    return '<div class="cd-opt"><span class="cd-opt-l">' + label + '</span><div class="cd-seg" role="group" aria-label="' + label + '">' +
      opts.map((o, i) => '<button type="button" data-act="' + act + '" data-v="' + i + '" aria-pressed="' + (i === cur) + '">' + o + '</button>').join('') +
      '</div></div>';
  }
  G.showMenu = function () {
    this.state = 'menu';
    const saved = U.load('match', null), best = U.load('best', 0) | 0, opp = esc(this.o.opponent);
    const canGo = saved && saved.v === 1 && !saved.done && Array.isArray(saved.games);
    const lvName = (i) => CD.LEVELS[i] ? CD.LEVELS[i].label : '';
    let html = '<p class="cd-eye">Tennis for your rest</p><h1 class="cd-title">Between Sets</h1>' +
      '<p class="cd-lede">Play a few points while you rest. Your match saves after every point, so one set lasts about one workout.</p><div class="cd-acts">';
    if (canGo) {
      html += '<button class="cd-b main" type="button" data-act="continue">Continue <span>You ' + saved.games[0] + '–' + saved.games[1] + ' ' + opp + ' · ' + lvName(saved.level) + '</span></button>' +
        '<button class="cd-b" type="button" data-act="match">New match <span>First to 4 games</span></button>';
    } else html += '<button class="cd-b main" type="button" data-act="match">Play ' + opp + ' <span>First to 4 games</span></button>';
    html += '<button class="cd-b" type="button" data-act="drill">Rally drill <span>' + (best ? 'Best ' + best : 'Keep the ball in play') + '</span></button></div>' +
      '<div class="cd-opts">' + seg('Level', 'level', CD.LEVELS.map((l) => l.label), this.levelIdx) +
      seg('Court', 'surface', CD.SURF_KEYS.map((k) => CD.SURF[k].label), CD.SURF_KEYS.indexOf(this.surface)) +
      (this.o.restDemo ? seg('Rest timer', 'rest', ['Off', '60 s', '90 s', '2 min'], this.restPick) : '') + '</div>' +
      '<ul class="cd-how"><li><b>Run</b><span>' + (this.coarse ? 'Drag anywhere. Your player follows your thumb.' : 'Move the mouse, or use the arrow keys.') + '</span></li>' +
      '<li><b>Hit</b><span>Automatic when you reach the ball. Get there early for a better shot. ' + (this.coarse ? 'Tap' : 'Click') + ' as the ring closes for a power shot.</span></li>' +
      '<li><b>Serve</b><span>' + (this.coarse ? 'Tap' : 'Click') + ' to toss. Then again at the top.</span></li></ul>';
    const rec = U.load('record', null);
    if (rec) {
      const parts = CD.LEVELS.filter((l) => rec[l.key]).map((l) => l.label + ' ' + rec[l.key].won + '–' + rec[l.key].lost);
      if (parts.length) html += '<p class="cd-foot">Your sets against ' + opp + ': ' + esc(parts.join(', ')) + '</p>';
    }
    this.openSheet(html, 'Menu');
  };
  G.showPause = function () {
    const m = this.m, opp = esc(this.o.opponent);
    const line = this.mode === 'drill' ? 'Rally ' + (this.drillCount || 0) + '. Best ' + Math.max(U.load('best', 0) | 0, this.drillCount || 0) + '.'
      : m ? esc(this.o.player) + ' ' + m.games[0] + '–' + m.games[1] + ' ' + opp + ' in games. Saved after every point.' : '';
    this.openSheet('<p class="cd-eye">Paused</p><h2 class="cd-title sm">Take your time</h2><p class="cd-lede">' + line + '</p>' +
      '<div class="cd-acts"><button class="cd-b main" type="button" data-act="resume">Resume</button>' +
      '<button class="cd-b" type="button" data-act="menu">Menu</button></div>', 'Paused', true);
  };
  G.showLift = function () {
    const saved = this.mode === 'drill' ? 'Your best rally is saved.'
      : (this.m && this.m.points > 0 && !this.m.done) ? 'Score saved after every point. Pick it up on your next rest.'
      : 'Pick the game up on your next rest.';
    let html = '<p class="cd-eye">Rest over</p><h2 class="cd-title">Time to lift</h2><p class="cd-lede">' + saved + '</p>' + (this.host ? '' : '<div class="cd-acts">');
    if (this.o.restDemo) {
      html += '<button class="cd-b main" type="button" data-act="nextrest">Start the next rest <span>Demo of the app\'s rest timer</span></button>' +
        '<button class="cd-b" type="button" data-act="notimer">Keep playing <span>Timer off</span></button>';
    }
    if (!this.host) html += '<button class="cd-b" type="button" data-act="menu">Menu</button></div>';   // the app closes the game itself
    this.openSheet(html, 'Rest over', true);
  };
  function statRows(rows) {
    return '<dl>' + rows.map((r) => '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd></div>').join('') + '</dl>';
  }
  G.showReport = function () {
    const m = this.m, st = m.stats, won = m.winner === 0, opp = esc(this.o.opponent), lv = this.lv();
    const pts = st.won[0] + st.won[1], early = st.shots ? Math.round((st.setEarly / st.shots) * 100) : 0;
    const first = st.firstTot ? Math.round((st.firstIn / st.firstTot) * 100) + '%' : '–';
    const tennis = [['Points won', st.won[0] + ' of ' + pts], ['Winners', st.winners], ['Errors', st.errors], ['Aces', st.aces],
      ['Double faults', st.doubles], ['Longest rally', st.longest + ' shots'], ['Fastest serve', st.fastServe ? st.fastServe + ' km/h' : '–'], ['First serves in', first]];
    const move = [['Distance run', Math.round(st.dist / 100) + ' m'], ['Sprints', st.sprints], ['Changes of direction', st.cods],
      ['Set early', early + '% of shots'], ['Power shots', st.perfect]];
    const note = early < 40 ? 'You were set early on ' + early + '% of your shots. Get there first, then hit.'
      : early < 70 ? 'Set early on ' + early + '% of your shots. Push that to 80 and the winners come.'
        : 'Set early on ' + early + '% of your shots. That is how points are won.';
    const tb = m.tbScore ? '<small>Tiebreak ' + m.tbScore[0] + '–' + m.tbScore[1] + '</small>' : '';
    const html = '<p class="cd-eye">Fast4 set · ' + lv.label + ' · ' + CD.SURF[this.surface].label + '</p>' +
      '<h2 class="cd-title">' + (won ? 'You win the set' : opp + ' wins the set') + '</h2>' +
      '<div class="cd-score">' + m.games[0] + '–' + m.games[1] + ' ' + tb + '</div>' +
      '<div class="cd-stats"><section><h3>Your tennis</h3>' + statRows(tennis) + '</section><section><h3>Your movement</h3>' + statRows(move) + '</section></div>' +
      '<div class="cd-note">' + this.avHtml() + '<p>' + note + '</p></div>' +
      '<div class="cd-acts"><button class="cd-b main" type="button" data-act="match">Play again</button>' +
      '<button class="cd-b" type="button" data-act="menu">Menu</button></div>';
    this.openSheet(html, 'Match report');
  };
  G.showDrillOver = function () {
    const r = this.drillResult || { n: 0, best: 0 };
    const line = r.n >= 20 ? 'Locked in. Now go lift.' : r.n >= 10 ? 'Good rhythm. Beat it on your next rest.' : 'Warm-up done. Go again on your next rest.';
    this.openSheet('<p class="cd-eye">Rally drill</p><div class="cd-big">' + r.n + (r.isBest && r.n ? '<span class="cd-new">New best</span>' : '') + '</div>' +
      '<p class="cd-lede">Shots in a row. Your best is ' + r.best + '.</p>' +
      '<div class="cd-note">' + this.avHtml() + '<p>' + line + '</p></div>' +
      '<div class="cd-acts"><button class="cd-b main" type="button" data-act="drill">Go again</button>' +
      '<button class="cd-b" type="button" data-act="menu">Menu</button></div>', 'Rally result', true);
  };

  G.act = function (a, v) {
    this.unlockAudio();
    this.sfx('ui', { kind: a === 'menu' ? 'back' : 'tap' });
    const n = v != null ? +v : 0;
    if (a === 'continue') this.startMatch(true);
    else if (a === 'match') this.startMatch(false);
    else if (a === 'drill') this.startDrill();
    else if (a === 'resume') this.resumeGame();
    else if (a === 'menu') this.goMenu();
    else if (a === 'nextrest' || a === 'notimer') {
      this.setRest(a === 'nextrest' ? CD.REST_SECS[this.restPick] || 90 : 0);
      // A rest can end while the report or the menu is up: then go back to the menu, not to a finished game.
      if (this.state === 'over' || this.state === 'menu') this.goMenu(); else this.resumeGame();
    }
    else if (a === 'level') { this.levelIdx = U.clamp(n, 0, 2); this.ts = this.lv().ts; this.saveSettings(); this.showMenu(); }
    else if (a === 'surface') { this.surface = CD.SURF_KEYS[n] || 'clay'; this.saveSettings(); this.buildScene(); this.showMenu(); }
    else if (a === 'rest') { this.restPick = U.clamp(n, 0, 3); this.saveSettings(); this.showMenu(); }
  };
})();

// ═══ The app door: window.BetweenSets ═══
(function () {
  'use strict';
  const CD = window.CourtDuel;
  let S = null;   // the open game, or null

  function open(opts) {
    opts = opts || {};
    const root = opts.root;
    if (!root || !CD || !CD.Game) return;
    if (S) close(true);
    root.innerHTML = '';
    // The game gets its own box inside the layer, so the layer keeps its own position and background.
    const el = document.createElement('div');
    el.className = 'bs-host';
    el.style.cssText = 'position:absolute;left:0;top:0;right:0;bottom:0';
    root.appendChild(el);
    root.classList.add('visible');          // before the game measures itself: a hidden layer is 0 x 0
    const call = (fn, dflt) => { try { return typeof fn === 'function' ? fn() : dflt; } catch (e) { return dflt; } };
    const host = {
      left: () => call(opts.left, null),
      sound: () => !!call(opts.sound, false),
      audio: () => call(opts.audio, null),
      close: () => close(),
    };
    const name = String(opts.name || '').trim().slice(0, 14) || 'You';
    let game = null;
    try { game = new CD.Game(el, { player: name, opponent: 'Amir', host }); }
    catch (e) {
      root.classList.remove('visible');
      root.innerHTML = '';
      if (opts.onClose) opts.onClose();
      return;
    }
    S = { opts, root, game };
  }

  // The rest is over: freeze play and say so. The app closes the layer a moment later.
  function timeUp() {
    if (!S) return;
    try { S.game.hostTimeUp(); } catch (e) {}
  }

  // Serve Clock: the app hands the rest back to the set about 25 s before it ends and calls handBack(done). A point in play may
  // finish (up to 6 s; the score saves when a point ends), a rally drill keeps its best, then the game freezes on its Time to
  // lift card and calls done() once, about a second later. Asked when closed, done() comes at once.
  function handBack(done) {
    let called = false;
    const finish = () => { if (called) return; called = true; try { if (typeof done === 'function') done(); } catch (e) {} };
    if (!S) { finish(); return; }
    const s = S, g = s.game;
    if (s.handedBack) { finish(); return; }              // already parked: nothing left to finish
    if (s.handing) { s.handing.push(finish); return; }   // asked twice: one hand-back, every done() called
    s.handing = [finish];
    const t0 = Date.now();
    const inPoint = () => g.mode === 'match' && g.state === 'rally' && !g.paused;
    const park = () => {
      clearInterval(s.wait); s.wait = 0;
      if (S === s) {
        try {
          if (g.mode === 'drill' && (g.drillCount | 0) > (CD.U.load('best', 0) | 0)) CD.U.save('best', g.drillCount | 0);
          g.hostTimeUp();
        } catch (e) {}
      }
      s.handOff = setTimeout(() => { s.handedBack = true; s.handing.splice(0).forEach((f) => f()); }, 900);
    };
    if (!inPoint()) { park(); return; }
    s.wait = setInterval(() => { if (S !== s || !inPoint() || Date.now() - t0 > 6000) park(); }, 100);
  }

  function close(quiet) {
    if (!S) return;
    const s = S; S = null;
    if (s.wait) { clearInterval(s.wait); s.wait = 0; }
    try { s.game.destroy(); } catch (e) {}    // listeners, the frame loop, the crowd and every sound
    s.root.classList.remove('visible');
    s.root.innerHTML = '';
    if (!quiet && s.opts.onClose) s.opts.onClose();
    if (s.handing) s.handing.splice(0).forEach((f) => f());   // closed during a hand-back: every waiting done() runs now, once
  }

  window.BetweenSets = { open, timeUp, handBack, close: () => close(), isOpen: () => !!S, _game: () => (S ? S.game : null) };
})();
