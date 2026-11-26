/* ==========================================================================
   RUSTBLOOD RALLY - core.js
   Shared namespace, tuning values, math helpers, seeded random numbers,
   value noise and keyboard / mouse input.
   ========================================================================== */
(function () {
  'use strict';
  const RR = (window.RR = window.RR || {});

  /* ------------------------------------------------------------------------
     TUNING - most gameplay numbers live here so they are easy to tweak.
     Distances are metres, speeds metres/second, times seconds.
     ------------------------------------------------------------------------ */
  RR.CONFIG = {
    laps: 3,
    respawnDelay: 4,          // seconds before a destroyed opponent returns
    respawnInvuln: 2.5,       // seconds of protection after a respawn
    respawnBack: 30,          // metres a respawned car is placed behind its wreck
    track: { halfWidth: 10, shoulder: 3 },
    // Elevated follow camera: height/back set the viewing angle (~59 deg),
    // lead pushes the view ahead of the car so you see what is coming.
    camera: { height: 40, back: 24, fov: 48, lead: 0.42, maxLead: 14, follow: 7, speedZoom: 0.12 },
    substep: 1 / 120,

    nitro: { burn: 0.3, regen: 0.018, driftRegen: 0.15, accelMul: 1.9, speedMul: 1.33 },

    weapons: {
      mg:     { rate: 11, damage: 2.4, speed: 165, life: 0.5, spread: 0.02, aimCone: 0.17, start: 220, max: 300 },
      rocket: { cooldown: 0.8, damage: 30, radius: 7.5, force: 20, speed: 72, life: 2.4, turn: 2.4, aimCone: 0.5, start: 6, max: 10 },
      mine:   { cooldown: 0.45, damage: 38, radius: 7, force: 24, trigger: 2.5, arm: 0.35, life: 45, start: 3, max: 6 },
    },

    pickups: { respawn: 12, health: 50, nitro: 0.5, mg: 120, rocket: 3, mine: 2 },

    // Crashing into walls / obstacles: no damage below `minSpeed` (m/s into
    // the wall), then `perMs` per m/s, never more than `max` per crash.
    crash: { minSpeed: 8, perMs: 0.4, max: 10, cooldown: 0.4 },

    // Driving stats per vehicle design.
    vehicles: {
      reaper:  { label: 'REAPER',  maxSpeed: 46, accel: 34, brake: 62, reverseAccel: 24, maxReverse: 16, turnRate: 2.85, grip: 7.5, driftGrip: 2.5, mass: 1.0,  inertia: 2.0, health: 150, radius: 1.15, length: 4.4, ram: 1.25 },
      rustjaw: { label: 'RUSTJAW', maxSpeed: 43, accel: 27, brake: 52, reverseAccel: 18, maxReverse: 13, turnRate: 2.35, grip: 7.0, driftGrip: 2.6,  mass: 1.7,  inertia: 2.7, health: 165, radius: 1.35, length: 5.8, ram: 1.6 },
      vulture: { label: 'VULTURE', maxSpeed: 48, accel: 33, brake: 58, reverseAccel: 20, maxReverse: 15, turnRate: 2.6,  grip: 7.0, driftGrip: 2.4,  mass: 1.0,  inertia: 2.1, health: 95,  radius: 1.15, length: 4.9, ram: 1.0 },
      scorch:  { label: 'SCORCH',  maxSpeed: 45, accel: 30, brake: 56, reverseAccel: 20, maxReverse: 15, turnRate: 2.6,  grip: 7.5, driftGrip: 2.5,  mass: 1.25, inertia: 2.3, health: 120, radius: 1.25, length: 5.0, ram: 1.4 },
    },

    // AI personalities. playerHate > 1 = prefers attacking you.
    ai: {
      rustjaw: { lane: -4, skill: 0.93, playerHate: 1.15, rocketRate: 0.2, mineRate: 0.25, ram: 0.7, burst: 1.2 },
      vulture: { lane: 3.5, skill: 0.96, playerHate: 1.05, rocketRate: 0.45, mineRate: 0.15, ram: 0.2, burst: 1.0 },
      scorch:  { lane: 0, skill: 0.95, playerHate: 1.1, rocketRate: 0.25, mineRate: 0.4, ram: 0.55, burst: 1.0 },
    },
    // Damage an AI deals is scaled by this when the victim is the player.
    aiDamageToPlayer: 0.42,
    // Explosions nobody owns (barrels, wrecks) are softer on the player.
    envBlastToPlayer: 0.6,
    // Below this armour fraction the player takes less damage (a fighting chance).
    mercyBelow: 0.3,
    mercyFactor: 0.7,
    // AI guns auto-aim less than yours.
    aiAimCone: 0.08,
    // Seconds after GO before AIs may shoot / drop mines.
    aiHoldFire: 3,
    aiHoldMines: 10,
  };

  /* ------------------------------------------------------------------------
     MATH HELPERS
     ------------------------------------------------------------------------ */
  const TAU = Math.PI * 2;
  const U = (RR.U = {
    TAU,
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    smoothstep(e0, e1, x) {
      const t = U.clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    },
    // Frame-rate independent exponential smoothing.
    damp(a, b, lambda, dt) { return a + (b - a) * (1 - Math.exp(-lambda * dt)); },
    wrapAngle(a) {
      a = (a + Math.PI) % TAU;
      if (a < 0) a += TAU;
      return a - Math.PI;
    },
    rand(a = 0, b = 1) { return a + Math.random() * (b - a); },
    randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    sign(v) { return v < 0 ? -1 : 1; },
    ordinal(n) {
      const s = ['TH', 'ST', 'ND', 'RD'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    },
    formatTime(t) {
      if (!isFinite(t) || t < 0) return '--:--.--';
      const m = Math.floor(t / 60);
      const s = t - m * 60;
      return String(m).padStart(2, '0') + ':' + s.toFixed(2).padStart(5, '0');
    },
  });

  /* ------------------------------------------------------------------------
     SEEDED RANDOM - the world is generated from a fixed seed so it looks the
     same every time the game is opened.
     ------------------------------------------------------------------------ */
  RR.makeRNG = function (seed) {
    let s = seed >>> 0;
    const rng = function () {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = (a, b) => a + rng() * (b - a);
    rng.int = (a, b) => Math.floor(a + rng() * (b - a + 1));
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];
    rng.sign = () => (rng() < 0.5 ? -1 : 1);
    return rng;
  };

  /* ------------------------------------------------------------------------
     VALUE NOISE - smooth 2D noise (0..1) with an optional tiling period,
     plus fractal (fbm) and ridged variants.
     ------------------------------------------------------------------------ */
  RR.makeNoise = function (seed) {
    const rng = RR.makeRNG(seed);
    const perm = new Uint16Array(512);
    const vals = new Float32Array(256);
    for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = rng(); }
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
    const hash = (ix, iz) => vals[perm[(perm[ix & 255] + (iz & 255)) & 511]];

    function noise(x, z, period) {
      let ix = Math.floor(x), iz = Math.floor(z);
      const fx = x - ix, fz = z - iz;
      const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
      let ix1 = ix + 1, iz1 = iz + 1;
      if (period) {
        ix = ((ix % period) + period) % period; iz = ((iz % period) + period) % period;
        ix1 = ((ix1 % period) + period) % period; iz1 = ((iz1 % period) + period) % period;
      }
      const a = hash(ix, iz), b = hash(ix1, iz), c = hash(ix, iz1), d = hash(ix1, iz1);
      return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
    }
    function fbm(x, z, oct = 4, period = 0) {
      let sum = 0, amp = 0.5, norm = 0, f = 1;
      for (let o = 0; o < oct; o++) {
        sum += noise(x * f, z * f, period ? period * f : 0) * amp;
        norm += amp; amp *= 0.5; f *= 2;
      }
      return sum / norm;
    }
    function ridged(x, z, oct = 4) {
      let sum = 0, amp = 0.5, norm = 0, f = 1;
      for (let o = 0; o < oct; o++) {
        const n = 1 - Math.abs(noise(x * f, z * f) * 2 - 1);
        sum += n * n * amp; norm += amp; amp *= 0.5; f *= 2;
      }
      return sum / norm;
    }
    return { noise, fbm, ridged };
  };
  RR.noise = RR.makeNoise(1337);

  /* ------------------------------------------------------------------------
     INPUT - keyboard + mouse. "down" = held, "hit" = pressed this frame.
     ------------------------------------------------------------------------ */
  const PREVENT = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);
  RR.Input = {
    keys: Object.create(null),
    pressed: Object.create(null),
    mouseLeft: false,
    mouseRight: false,
    mouseLeftHit: false,  // pressed since last frame (so quick clicks still count)
    mouseRightHit: false,
    anyHit: false,
    canvas: null,
    init(canvas) {
      this.canvas = canvas;
      window.addEventListener('keydown', (e) => {
        if (PREVENT.has(e.code)) e.preventDefault();
        if (!this.keys[e.code]) { this.pressed[e.code] = true; this.anyHit = true; }
        this.keys[e.code] = true;
        if (RR.Audio) RR.Audio.unlock();
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => this.reset());
      window.addEventListener('mousedown', (e) => {
        if (RR.Audio) RR.Audio.unlock();
        if (e.target !== canvas) return;       // clicks on menus never fire guns
        if (e.button === 0) { this.mouseLeft = true; this.mouseLeftHit = true; }
        if (e.button === 2) { this.mouseRight = true; this.mouseRightHit = true; }
        this.anyHit = true;
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.mouseLeft = false;
        if (e.button === 2) this.mouseRight = false;
      });
      window.addEventListener('contextmenu', (e) => e.preventDefault());
    },
    down(...codes) {
      for (let i = 0; i < codes.length; i++) if (this.keys[codes[i]]) return true;
      return false;
    },
    hit(...codes) {
      for (let i = 0; i < codes.length; i++) if (this.pressed[codes[i]]) return true;
      return false;
    },
    endFrame() {
      for (const k in this.pressed) delete this.pressed[k];
      this.mouseLeftHit = false;
      this.mouseRightHit = false;
      this.anyHit = false;
    },
    reset() {
      for (const k in this.keys) this.keys[k] = false;
      this.mouseLeft = this.mouseRight = false;
      this.endFrame();
    },
  };
})();
