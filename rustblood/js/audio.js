/* ==========================================================================
   RUSTBLOOD RALLY - audio.js
   All sound is synthesised with the Web Audio API: growling engines with
   gear changes, gunfire, rocket launches, explosions, metal crashes,
   pickups, countdown beeps, tyre screech, nitro roar and desert wind.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const TAU = Math.PI * 2;
  const LIMITS = { gun: 8, gunEnemy: 10, hitMetal: 6, impact: 5, explosion: 6, explosionBig: 4, empty: 2 };

  const A = (RR.Audio = {
    ctx: null,
    ready: false,
    muted: false,
    volume: 0.8,
    buffers: {},
    active: {},
    loops: {},
    listener: { x: 0, z: 0 },

    unlock() {
      if (!this.ctx) this.init();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    init() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { this.ctx = new AC(); } catch (e) { return; }
      const ctx = this.ctx;
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.knee.value = 10; comp.ratio.value = 5;
      comp.attack.value = 0.003; comp.release.value = 0.25;
      this.master.connect(comp);
      comp.connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.connect(this.master);
      try {
        this.makeBuffers();
        this.makeLoops();
        this.ready = true;
      } catch (e) {
        console.warn('Audio init failed', e);
      }
    },

    toggleMute() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
      return this.muted;
    },

    /* ------------------------------------------------------- synthesis */
    buf(dur, fn) {
      const sr = this.ctx.sampleRate, n = Math.max(1, Math.floor(dur * sr));
      const b = this.ctx.createBuffer(1, n, sr);
      const d = b.getChannelData(0);
      fn(d, sr, n);
      let peak = 0;
      for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
      if (peak > 0) { const k = 0.9 / peak; for (let i = 0; i < n; i++) d[i] *= k; }
      return b;
    },

    makeBuffers() {
      const B = this.buffers;
      const rnd = () => Math.random() * 2 - 1;

      const gun = (low) => (d, sr, n) => {
        let lp = 0, ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const w = rnd();
          lp += (w - lp) * (low ? 0.22 : 0.4);
          const crack = lp * Math.exp(-t * (low ? 45 : 60));
          ph += (TAU * ((low ? 110 : 150) * Math.exp(-t * 20) + 42)) / sr;
          const thump = Math.sin(ph) * Math.exp(-t * 26);
          const tail = w * 0.12 * Math.exp(-t * 20);
          d[i] = Math.tanh((crack * 1.5 + thump * 0.9 + tail) * 1.8);
        }
      };
      B.gun = this.buf(0.16, gun(false));
      B.gunEnemy = this.buf(0.18, gun(true));

      B.rocket = this.buf(1.0, (d, sr, n) => {
        let low = 0, band = 0, ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 3.0);
          const fc = 500 + 2200 * Math.exp(-t * 3.5);
          const f = 2 * Math.sin((Math.PI * fc) / sr);
          const x = rnd();
          low += f * band;
          const high = x - low - 0.4 * band;
          band += f * high;
          ph += (TAU * (90 * Math.exp(-t * 10) + 38)) / sr;
          d[i] = band * env * 1.3 + Math.sin(ph) * Math.exp(-t * 18) * 0.9;
        }
      });

      const boom = (len, power) => (d, sr, n) => {
        let lp = 0, brown = 0, ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const w = rnd();
          brown = (brown + w * 0.02) * 0.998;
          lp += (w - lp) * (0.015 + 0.3 * Math.exp(-t * 7));
          const env = Math.exp(-t * (2.6 / len)) * (t < 0.006 ? t / 0.006 : 1);
          const crackle = Math.random() < 0.004 * Math.exp(-t * 2) ? rnd() * 1.4 : 0;
          ph += (TAU * (55 * Math.exp(-t * 2.5) + 26)) / sr;
          const sub = Math.sin(ph) * Math.exp(-t * (3.2 / len));
          d[i] = Math.tanh((lp * 2.4 * env + brown * 6 * env + sub * power + crackle * env) * 1.6);
        }
      };
      B.explosion = this.buf(2.2, boom(1, 0.9));
      B.explosionBig = this.buf(3.2, boom(1.4, 1.2));

      B.impact = this.buf(0.7, (d, sr, n) => {
        const fr = [170, 395, 760, 1210, 1730].map((f) => f * (0.9 + Math.random() * 0.2));
        const dc = [8, 11, 15, 21, 30];
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          let s = 0;
          for (let k = 0; k < fr.length; k++) s += (Math.sin(TAU * fr[k] * t + k) * Math.exp(-t * dc[k])) / (k + 1);
          lp += (rnd() - lp) * 0.3;
          d[i] = Math.tanh((s * 1.2 + lp * 1.4 * Math.exp(-t * 35)) * 1.7);
        }
      });

      B.hitMetal = this.buf(0.14, (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const s = Math.sin(TAU * 2350 * t) * Math.exp(-t * 45) + Math.sin(TAU * 3720 * t) * Math.exp(-t * 60) * 0.6 + Math.sin(TAU * 1480 * t) * Math.exp(-t * 35) * 0.5;
          d[i] = s + rnd() * Math.exp(-t * 120) * 0.8;
        }
      });

      const tone = (notes, step, wave) => (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const k = Math.min(notes.length - 1, Math.floor(t / step));
          const lt = t - k * step;
          const f = notes[k];
          let s;
          if (wave === 'square') s = Math.sin(TAU * f * t) > 0 ? 0.6 : -0.6;
          else s = Math.sin(TAU * f * t) + Math.sin(TAU * f * 2 * t) * 0.3;
          const env = Math.min(1, lt * 200) * Math.exp(-lt * 9) * (k === notes.length - 1 ? Math.exp(-lt * 3) : 1);
          d[i] = s * env;
        }
      };
      B.pickup_health = this.buf(0.5, tone([523, 659, 784, 1046], 0.07, 'sine'));
      B.pickup_ammo = this.buf(0.35, (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const c1 = rnd() * Math.exp(-t * 90);
          const t2 = t - 0.11;
          const c2 = t2 > 0 ? rnd() * Math.exp(-t2 * 80) : 0;
          const body = Math.sin(TAU * 170 * t) * Math.exp(-t * 14) + (t2 > 0 ? Math.sin(TAU * 1100 * t2) * Math.exp(-t2 * 30) * 0.5 : 0);
          d[i] = c1 * 0.8 + c2 * 0.8 + body * 0.7;
        }
      });
      B.pickup_nitro = this.buf(0.6, (d, sr, n) => {
        let low = 0, band = 0, ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const fc = 300 + t * 4000;
          const f = 2 * Math.sin((Math.PI * Math.min(fc, sr / 4)) / sr);
          low += f * band;
          const high = rnd() - low - 0.3 * band;
          band += f * high;
          ph += (TAU * (300 + t * 900)) / sr;
          const env = Math.sin(Math.PI * Math.min(1, t / 0.6));
          d[i] = (band * 0.8 + Math.sin(ph) * 0.4) * env;
        }
      });

      B.beep = this.buf(0.2, (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          d[i] = (Math.sin(TAU * 620 * t) + Math.sin(TAU * 1240 * t) * 0.2) * Math.min(1, t * 300) * Math.exp(-t * 10);
        }
      });
      B.beepGo = this.buf(0.7, (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          d[i] = (Math.sin(TAU * 1240 * t) + Math.sin(TAU * 930 * t) * 0.6 + Math.sin(TAU * 620 * t) * 0.4) * Math.min(1, t * 300) * Math.exp(-t * 3.5);
        }
      });
      B.lap = this.buf(0.6, tone([880, 1175], 0.14, 'sine'));
      B.kill = this.buf(0.9, (d, sr, n) => {
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          let s = 0;
          for (const f of [98, 147, 196, 294]) s += ((t * f) % 1) * 2 - 1;
          lp += (s - lp) * (0.05 + 0.2 * Math.exp(-t * 6));
          d[i] = Math.tanh(lp * 0.8) * Math.min(1, t * 80) * Math.exp(-t * 2.8);
        }
      });
      B.mineDrop = this.buf(0.35, (d, sr, n) => {
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          d[i] = Math.sin(TAU * 115 * t) * Math.exp(-t * 16) + Math.sin(TAU * 880 * t) * Math.exp(-t * 25) * 0.4 + rnd() * Math.exp(-t * 80) * 0.5;
        }
      });
      B.empty = this.buf(0.06, (d, sr, n) => {
        for (let i = 0; i < n; i++) { const t = i / sr; d[i] = (rnd() * 0.5 + Math.sin(TAU * 2800 * t)) * Math.exp(-t * 120); }
      });
      B.click = this.buf(0.05, (d, sr, n) => {
        for (let i = 0; i < n; i++) { const t = i / sr; d[i] = Math.sin(TAU * 1600 * t) * Math.exp(-t * 90); }
      });
      B.hiss = this.buf(1.4, (d, sr, n) => {
        let hp = 0, prev = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          const w = rnd();
          hp = 0.9 * (hp + w - prev);
          prev = w;
          d[i] = hp * Math.min(1, t * 3) * (0.6 + 0.4 * Math.sin(t * 40));
        }
      });
      B.flame = this.buf(2.3, (d, sr, n) => {
        let lp = 0, lp2 = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          lp += (rnd() - lp) * 0.08;
          lp2 += (rnd() - lp2) * 0.4;
          const flick = 0.7 + 0.3 * Math.sin(t * 31 + Math.sin(t * 7) * 3);
          const env = Math.min(1, t * 12) * Math.min(1, (2.3 - t) * 4);
          d[i] = (lp * 3 + lp2 * 0.3) * flick * env;
        }
      });
      B.respawn = this.buf(0.6, (d, sr, n) => {
        let ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          ph += (TAU * (200 + t * 700)) / sr;
          d[i] = Math.sin(ph) * Math.sin(Math.PI * Math.min(1, t / 0.6)) * 0.7;
        }
      });
      B.whoosh = this.buf(0.7, (d, sr, n) => {
        let lp = 0;
        for (let i = 0; i < n; i++) {
          const t = i / sr;
          lp += (rnd() - lp) * (0.05 + 0.25 * Math.sin(Math.PI * Math.min(1, t / 0.7)));
          d[i] = lp * Math.sin(Math.PI * Math.min(1, t / 0.7));
        }
      });
    },

    makeLoops() {
      const ctx = this.ctx;
      const noise = this.buf(2.0, (d, sr, n) => { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; });
      const brown = this.buf(3.0, (d, sr, n) => {
        let b = 0;
        for (let i = 0; i < n; i++) { b = (b + (Math.random() * 2 - 1) * 0.02) * 0.998; d[i] = b; }
      });
      const loop = (buffer, filters, vol) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        let node = src;
        for (const f of filters) { node.connect(f); node = f; }
        const g = ctx.createGain();
        g.gain.value = vol;
        node.connect(g);
        g.connect(this.sfx);
        src.start();
        return { src, gain: g };
      };
      const bp = (freq, q) => { const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; return f; };
      const lp = (freq) => { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq; return f; };
      this.loops.skid = loop(noise, [bp(1100, 1.4)], 0);
      this.loops.nitro = loop(noise, [lp(900), bp(420, 0.8)], 0);
      this.loops.wind = loop(brown, [lp(500)], 0.12);
      this.loops.fire = loop(noise, [lp(700)], 0);
    },

    setLoop(name, vol) {
      if (!this.ready) return;
      const l = this.loops[name];
      if (l) l.gain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.08);
    },

    /* --------------------------------------------------------- playback */
    play(name, o) {
      if (!this.ready || this.muted) return;
      const buf = this.buffers[name];
      if (!buf) return;
      o = o || {};
      const lim = LIMITS[name] || 6;
      const act = this.active[name] || 0;
      if (act >= lim) return;
      let vol = o.vol == null ? 1 : o.vol;
      let pan = 0;
      if (o.x !== undefined) {
        const dx = o.x - this.listener.x, dz = o.z - this.listener.z;
        const d = Math.hypot(dx, dz);
        if (d > 230) return;
        vol *= 1 / (1 + d / 24);
        pan = Math.max(-1, Math.min(1, dx / 55));
      }
      if (vol < 0.01) return;
      const ctx = this.ctx;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = o.rate || 1;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(g);
      if (pan !== 0 && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        g.connect(p);
        p.connect(this.sfx);
      } else g.connect(this.sfx);
      this.active[name] = act + 1;
      src.onended = () => { this.active[name] = Math.max(0, (this.active[name] || 1) - 1); };
      src.start();
    },

    distCurve(k) {
      const n = 1024, c = new Float32Array(n);
      for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
      return c;
    },

    // A looping engine voice with gear-like pitch movement.
    createEngine(type) {
      if (!this.ready) return null;
      const ctx = this.ctx;
      const cfg = { reaper: [50, 1.1], rustjaw: [33, 0.8], vulture: [42, 1.0], scorch: [38, 0.9] }[type] || [45, 1];
      const o1 = ctx.createOscillator(); o1.type = 'sawtooth';
      const o2 = ctx.createOscillator(); o2.type = 'square';
      const o3 = ctx.createOscillator(); o3.type = 'sawtooth';
      const g1 = ctx.createGain(); g1.gain.value = 0.5;
      const g2 = ctx.createGain(); g2.gain.value = 0.32;
      const g3 = ctx.createGain(); g3.gain.value = 0.28;
      const shaper = ctx.createWaveShaper(); shaper.curve = this.distCurve(5);
      const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 700; filt.Q.value = 2.5;
      const am = ctx.createGain(); am.gain.value = 0.75;
      const lfo = ctx.createOscillator(); lfo.type = 'sine';
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.25;
      const out = ctx.createGain(); out.gain.value = 0;
      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      lfo.connect(lfoGain); lfoGain.connect(am.gain);
      o1.connect(g1); o2.connect(g2); o3.connect(g3);
      g1.connect(shaper); g2.connect(shaper); g3.connect(shaper);
      shaper.connect(filt); filt.connect(am); am.connect(out);
      if (pan) { out.connect(pan); pan.connect(this.sfx); } else out.connect(this.sfx);
      [o1, o2, o3, lfo].forEach((o) => o.start());
      const base = cfg[0], bright = cfg[1];
      let lastVol = -1;
      return {
        set(rpm, load, vol, p) {
          const t = ctx.currentTime;
          const f = base * (1 + rpm * 2.6);
          o1.frequency.setTargetAtTime(f, t, 0.035);
          o2.frequency.setTargetAtTime(f * 0.5, t, 0.035);
          o3.frequency.setTargetAtTime(f * 1.008, t, 0.035);
          lfo.frequency.setTargetAtTime(f * 0.5, t, 0.035);
          filt.frequency.setTargetAtTime((280 + rpm * 1500 + load * 700) * bright, t, 0.05);
          const v = vol * (0.55 + load * 0.45);
          if (Math.abs(v - lastVol) > 0.002) { out.gain.setTargetAtTime(v, t, 0.06); lastVol = v; }
          if (pan) pan.pan.setTargetAtTime(p, t, 0.05);
        },
      };
    },
  });
})();
