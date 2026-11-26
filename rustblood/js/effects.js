/* ==========================================================================
   RUSTBLOOD RALLY - effects.js
   Visual effects: pooled particles (fire, smoke, dust), streaks (tracers,
   sparks), skid marks, flying debris, scorch decals, shockwaves,
   explosion lights, persistent emitters and camera shake.
   Everything is pooled so no objects are created during play.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const rand = U.rand;

  const C = (hex) => new THREE.Color(hex); // sRGB hex -> linear colour
  // HDR colours (values > 1 glow through the bloom pass). Kept moderate so
  // fire reads as orange flame instead of white blobs.
  const COL = {
    white: C(0xffffff), flashHot: new THREE.Color(2.6, 1.9, 1.2),
    fireCore: new THREE.Color(1.9, 1.0, 0.32), fireMid: new THREE.Color(1.5, 0.48, 0.1), fireEnd: new THREE.Color(0.42, 0.07, 0.02),
    smokeDark: C(0x2a2522), smokeGrey: C(0x6b625a), smokeLight: C(0xb8ada0),
    dust: C(0xc9a070), dustDark: C(0x9c7448),
    spark: new THREE.Color(2.6, 1.5, 0.5), sparkEnd: new THREE.Color(1.3, 0.3, 0.05),
    nitroCore: new THREE.Color(1.2, 1.8, 3.0), nitroEnd: new THREE.Color(1.8, 0.55, 0.12),
    tracer: new THREE.Color(2.6, 1.7, 0.6),
    brass: C(0xd8a840),
  };
  const _tmpC = new THREE.Color();

  /* ------------------------------------------------------------ shaders */
  const PARTICLE_VERT = `
    attribute float psize;
    attribute vec4 pcolor;
    uniform float uScale;
    varying vec4 vColor;
    void main() {
      vColor = pcolor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = psize * uScale / max(0.5, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;
  const PARTICLE_FRAG = `
    uniform sampler2D uMap;
    varying vec4 vColor;
    void main() {
      vec4 t = texture2D(uMap, gl_PointCoord);
      gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
      if (gl_FragColor.a < 0.004) discard;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const QUAD_VERT = `
    attribute vec4 qcolor;
    varying vec4 vColor;
    varying vec2 vUv;
    void main() {
      vColor = qcolor;
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const QUAD_FRAG = `
    uniform sampler2D uMap;
    varying vec4 vColor;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(uMap, vUv);
      gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
      if (gl_FragColor.a < 0.004) discard;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  const SKID_VERT = `
    attribute float birth;
    attribute float strength;
    uniform float uTime;
    uniform float uLife;
    varying float vAlpha;
    varying vec2 vUv;
    void main() {
      vUv = uv;
      vAlpha = strength * clamp(1.0 - (uTime - birth) / uLife, 0.0, 1.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;
  const SKID_FRAG = `
    uniform sampler2D uMap;
    varying float vAlpha;
    varying vec2 vUv;
    void main() {
      vec4 t = texture2D(uMap, vUv);
      gl_FragColor = vec4(t.rgb, t.a * vAlpha * 0.7);
      if (gl_FragColor.a < 0.004) discard;
      #include <colorspace_fragment>
    }`;

  /* ------------------------------------------------------- ParticlePool */
  class ParticlePool {
    constructor(scene, max, map, additive, fadeIn) {
      this.max = max;
      this.n = 0;
      this.fadeIn = fadeIn;
      const f = () => new Float32Array(max);
      this.fields = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'life', 'maxLife', 's0', 's1', 'r0', 'g0', 'b0', 'r1', 'g1', 'b1', 'a0', 'a1', 'drag', 'grav'];
      for (const k of this.fields) this[k] = f();
      this.pos = new Float32Array(max * 3);
      this.col = new Float32Array(max * 4);
      this.size = new Float32Array(max);
      const geo = new THREE.BufferGeometry();
      this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
      this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
      this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', this.posAttr);
      geo.setAttribute('pcolor', this.colAttr);
      geo.setAttribute('psize', this.sizeAttr);
      geo.setDrawRange(0, 0);
      this.geo = geo;
      this.mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: map }, uScale: { value: 600 } },
        vertexShader: PARTICLE_VERT,
        fragmentShader: PARTICLE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      this.points = new THREE.Points(geo, this.mat);
      this.points.frustumCulled = false;
      this.points.renderOrder = additive ? 4 : 3;
      scene.add(this.points);
    }
    spawn(x, y, z, vx, vy, vz, life, s0, s1, c0, c1, a0, a1, drag, grav) {
      let i;
      if (this.n < this.max) i = this.n++;
      else i = (Math.random() * this.max) | 0;
      this.x[i] = x; this.y[i] = y; this.z[i] = z;
      this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
      this.life[i] = life; this.maxLife[i] = life;
      this.s0[i] = s0; this.s1[i] = s1;
      this.r0[i] = c0.r; this.g0[i] = c0.g; this.b0[i] = c0.b;
      this.r1[i] = c1.r; this.g1[i] = c1.g; this.b1[i] = c1.b;
      this.a0[i] = a0; this.a1[i] = a1;
      this.drag[i] = drag || 0; this.grav[i] = grav || 0;
    }
    _kill(i) {
      const last = --this.n;
      if (i !== last) for (const k of this.fields) this[k][i] = this[k][last];
    }
    update(dt) {
      let i = 0;
      while (i < this.n) {
        const l = this.life[i] - dt;
        if (l <= 0) { this._kill(i); continue; }
        this.life[i] = l;
        const d = this.drag[i] > 0 ? Math.exp(-this.drag[i] * dt) : 1;
        this.vx[i] *= d; this.vz[i] *= d;
        this.vy[i] = this.vy[i] * d - this.grav[i] * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; this.z[i] += this.vz[i] * dt;
        if (this.y[i] < 0.06 && this.grav[i] > 0) {
          this.y[i] = 0.06; this.vy[i] *= -0.35; this.vx[i] *= 0.6; this.vz[i] *= 0.6;
        }
        i++;
      }
      const P = this.pos, Cc = this.col, S = this.size, fade = this.fadeIn;
      for (let k = 0; k < this.n; k++) {
        const t = 1 - this.life[k] / this.maxLife[k];
        P[k * 3] = this.x[k]; P[k * 3 + 1] = this.y[k]; P[k * 3 + 2] = this.z[k];
        S[k] = this.s0[k] + (this.s1[k] - this.s0[k]) * t;
        Cc[k * 4] = this.r0[k] + (this.r1[k] - this.r0[k]) * t;
        Cc[k * 4 + 1] = this.g0[k] + (this.g1[k] - this.g0[k]) * t;
        Cc[k * 4 + 2] = this.b0[k] + (this.b1[k] - this.b0[k]) * t;
        let a = this.a0[k] + (this.a1[k] - this.a0[k]) * t;
        if (fade) a *= Math.min(1, t * 10);
        Cc[k * 4 + 3] = a;
      }
      this.geo.setDrawRange(0, this.n);
      this.posAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
      this.sizeAttr.needsUpdate = true;
    }
    clear() { this.n = 0; this.geo.setDrawRange(0, 0); }
  }

  /* ------------------------------------------------- StreakBatch (quads) */
  class StreakBatch {
    constructor(scene, max, map) {
      this.max = max;
      this.n = 0;
      this.pos = new Float32Array(max * 12);
      this.col = new Float32Array(max * 16);
      const uv = new Float32Array(max * 8);
      const idx = new Uint32Array(max * 6);
      for (let i = 0; i < max; i++) {
        uv.set([0, 0, 0, 1, 1, 0, 1, 1], i * 8);
        const b = i * 4;
        idx.set([b, b + 2, b + 1, b + 1, b + 2, b + 3], i * 6);
      }
      const geo = new THREE.BufferGeometry();
      this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
      this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', this.posAttr);
      geo.setAttribute('qcolor', this.colAttr);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.setDrawRange(0, 0);
      this.geo = geo;
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: map } },
        vertexShader: QUAD_VERT, fragmentShader: QUAD_FRAG,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      });
      this.mesh = new THREE.Mesh(geo, mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 5;
      scene.add(this.mesh);
      this.camDir = new THREE.Vector3(0, 0.87, 0.49);
    }
    begin() { this.n = 0; }
    // Head position, unit direction of travel, length, width, colour, alpha.
    add(hx, hy, hz, dx, dy, dz, len, width, c, a) {
      if (this.n >= this.max) return;
      const cd = this.camDir;
      let sx = dy * cd.z - dz * cd.y, sy = dz * cd.x - dx * cd.z, sz = dx * cd.y - dy * cd.x;
      let sl = Math.hypot(sx, sy, sz);
      if (sl < 1e-4) { sx = 1; sy = 0; sz = 0; sl = 1; }
      const w = width * 0.5 / sl;
      sx *= w; sy *= w; sz *= w;
      const tx = hx - dx * len, ty = hy - dy * len, tz = hz - dz * len;
      const p = this.pos, o = this.n * 12;
      p[o] = tx - sx; p[o + 1] = ty - sy; p[o + 2] = tz - sz;
      p[o + 3] = tx + sx; p[o + 4] = ty + sy; p[o + 5] = tz + sz;
      p[o + 6] = hx - sx; p[o + 7] = hy - sy; p[o + 8] = hz - sz;
      p[o + 9] = hx + sx; p[o + 10] = hy + sy; p[o + 11] = hz + sz;
      const cc = this.col, q = this.n * 16;
      for (let k = 0; k < 4; k++) {
        cc[q + k * 4] = c.r; cc[q + k * 4 + 1] = c.g; cc[q + k * 4 + 2] = c.b;
        cc[q + k * 4 + 3] = k < 2 ? 0 : a;
      }
      this.n++;
    }
    end() {
      this.geo.setDrawRange(0, this.n * 6);
      if (this.n > 0) {
        this.posAttr.needsUpdate = true;
        this.colAttr.needsUpdate = true;
      }
    }
  }

  /* ---------------------------------------------------------- SkidMarks */
  class SkidMarks {
    constructor(scene, max) {
      this.max = max;
      this.head = 0;
      this.pos = new Float32Array(max * 12);
      this.birth = new Float32Array(max * 4).fill(-1000);
      this.strength = new Float32Array(max * 4);
      const uv = new Float32Array(max * 8);
      const idx = new Uint32Array(max * 6);
      for (let i = 0; i < max; i++) {
        uv.set([0, 0, 1, 0, 0, 1, 1, 1], i * 8);
        const b = i * 4;
        idx.set([b, b + 2, b + 1, b + 1, b + 2, b + 3], i * 6);
      }
      const geo = new THREE.BufferGeometry();
      this.posAttr = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
      this.birthAttr = new THREE.BufferAttribute(this.birth, 1).setUsage(THREE.DynamicDrawUsage);
      this.strAttr = new THREE.BufferAttribute(this.strength, 1).setUsage(THREE.DynamicDrawUsage);
      geo.setAttribute('position', this.posAttr);
      geo.setAttribute('birth', this.birthAttr);
      geo.setAttribute('strength', this.strAttr);
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      this.mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: RR.Tex.skid() }, uTime: { value: 0 }, uLife: { value: 14 } },
        vertexShader: SKID_VERT, fragmentShader: SKID_FRAG,
        transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      });
      this.mesh = new THREE.Mesh(geo, this.mat);
      this.mesh.frustumCulled = false;
      this.mesh.renderOrder = 1;
      scene.add(this.mesh);
      this.dirty = false;
    }
    add(x0, z0, x1, z1, width, time, strength) {
      const dx = x1 - x0, dz = z1 - z0;
      const l = Math.hypot(dx, dz);
      if (l < 0.01) return;
      const sx = (-dz / l) * width * 0.5, sz = (dx / l) * width * 0.5;
      const i = this.head, o = i * 12, y = 0.035;
      const p = this.pos;
      p[o] = x0 - sx; p[o + 1] = y; p[o + 2] = z0 - sz;
      p[o + 3] = x0 + sx; p[o + 4] = y; p[o + 5] = z0 + sz;
      p[o + 6] = x1 - sx; p[o + 7] = y; p[o + 8] = z1 - sz;
      p[o + 9] = x1 + sx; p[o + 10] = y; p[o + 11] = z1 + sz;
      for (let k = 0; k < 4; k++) { this.birth[i * 4 + k] = time; this.strength[i * 4 + k] = strength; }
      this.head = (this.head + 1) % this.max;
      this.dirty = true;
    }
    update(time) {
      this.mat.uniforms.uTime.value = time;
      if (this.dirty) {
        this.posAttr.needsUpdate = true;
        this.birthAttr.needsUpdate = true;
        this.strAttr.needsUpdate = true;
        this.dirty = false;
      }
    }
    clear() {
      this.birth.fill(-1000);
      this.birthAttr.needsUpdate = true;
    }
  }

  /* ---------------------------------------------------------- Debris */
  class DebrisPool {
    constructor(scene, max) {
      this.max = max;
      this.n = 0;
      // A bent, jagged scrap plate.
      const g = new THREE.BoxGeometry(0.7, 0.07, 0.45, 2, 1, 2);
      const P = g.attributes.position;
      const rng = RR.makeRNG(808);
      for (let i = 0; i < P.count; i++) {
        P.setY(i, P.getY(i) + (rng() - 0.5) * 0.12 + Math.abs(P.getX(i)) * 0.25);
        P.setX(i, P.getX(i) * (0.8 + rng() * 0.4));
      }
      g.computeVertexNormals();
      const mat = new THREE.MeshStandardMaterial({ map: RR.Tex.armor(), roughness: 0.6, metalness: 0.6, color: 0x8a7a6a });
      this.mesh = new THREE.InstancedMesh(g, mat, max);
      this.mesh.castShadow = true;
      this.mesh.count = 0;
      this.mesh.frustumCulled = false;
      this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(this.mesh);
      const f = () => new Float32Array(max);
      this.fields = ['x', 'y', 'z', 'vx', 'vy', 'vz', 'rx', 'ry', 'rz', 'wx', 'wy', 'wz', 'life', 's'];
      for (const k of this.fields) this[k] = f();
      this._o = new THREE.Object3D();
    }
    spawn(x, y, z, vx, vy, vz, s) {
      let i;
      if (this.n < this.max) i = this.n++;
      else i = (Math.random() * this.max) | 0;
      this.x[i] = x; this.y[i] = y; this.z[i] = z;
      this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
      this.rx[i] = rand(0, 6); this.ry[i] = rand(0, 6); this.rz[i] = rand(0, 6);
      this.wx[i] = rand(-14, 14); this.wy[i] = rand(-10, 10); this.wz[i] = rand(-14, 14);
      this.life[i] = rand(4, 7);
      this.s[i] = s || rand(0.6, 1.3);
    }
    update(dt) {
      let i = 0;
      const o = this._o;
      while (i < this.n) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) {
          const last = --this.n;
          if (i !== last) for (const k of this.fields) this[k][i] = this[k][last];
          continue;
        }
        this.vy[i] -= 26 * dt;
        this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; this.z[i] += this.vz[i] * dt;
        const ground = 0.06 * this.s[i] - (this.life[i] < 1 ? (1 - this.life[i]) * 0.5 : 0);
        if (this.y[i] < ground) {
          this.y[i] = ground;
          if (this.vy[i] < -2) {
            this.vy[i] *= -0.32;
            this.wx[i] *= 0.6; this.wz[i] *= 0.6;
          } else {
            this.vy[i] = 0;
            this.wx[i] *= 0.85; this.wy[i] *= 0.85; this.wz[i] *= 0.85;
          }
          this.vx[i] *= 0.82; this.vz[i] *= 0.82;
          if (this.vy[i] === 0) { this.rx[i] *= 0.9; this.rz[i] *= 0.9; }
        }
        this.rx[i] += this.wx[i] * dt; this.ry[i] += this.wy[i] * dt; this.rz[i] += this.wz[i] * dt;
        o.position.set(this.x[i], this.y[i], this.z[i]);
        o.rotation.set(this.rx[i], this.ry[i], this.rz[i]);
        o.scale.setScalar(this.s[i]);
        o.updateMatrix();
        this.mesh.setMatrixAt(i, o.matrix);
        i++;
      }
      this.mesh.count = this.n;
      this.mesh.instanceMatrix.needsUpdate = true;
    }
    clear() { this.n = 0; this.mesh.count = 0; }
  }

  /* ============================================================ Effects */
  const FX = {
    init(scene) {
      this.scene = scene;
      this.add = new ParticlePool(scene, 3500, RR.Tex.glow(), true, false);
      this.smoke = new ParticlePool(scene, 3500, RR.Tex.smoke(), false, true);
      this.streaks = new StreakBatch(scene, 900, RR.Tex.streak());
      this.skids = new SkidMarks(scene, 2400);
      this.debris = new DebrisPool(scene, 140);
      this.time = 0;
      this.trauma = 0;
      this.shakeX = 0; this.shakeZ = 0;

      // sparks (rendered as streaks)
      this.sparkMax = 700;
      this.sparkN = 0;
      const f = () => new Float32Array(this.sparkMax);
      this.sp = { x: f(), y: f(), z: f(), vx: f(), vy: f(), vz: f(), life: f(), max: f(), w: f() };

      // explosion lights (always in the scene to avoid shader recompiles)
      this.lights = [];
      for (let i = 0; i < 3; i++) {
        const l = new THREE.PointLight(0xff8a3a, 0, 55, 2);
        l.position.set(0, -100, 0);
        scene.add(l);
        this.lights.push({ light: l, t: 0, dur: 1, peak: 0 });
      }
      // shockwave rings
      this.rings = [];
      const ringGeo = new THREE.PlaneGeometry(1, 1);
      ringGeo.rotateX(-Math.PI / 2);
      for (let i = 0; i < 8; i++) {
        const mat = new THREE.MeshBasicMaterial({
          map: RR.Tex.ring(), color: new THREE.Color(1.1, 0.55, 0.22), transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const mesh = new THREE.Mesh(ringGeo, mat);
        mesh.visible = false;
        mesh.renderOrder = 4;
        scene.add(mesh);
        this.rings.push({ mesh, t: 0, dur: 0.5, size: 10 });
      }
      // scorch decals
      this.scorches = [];
      this.scorchHead = 0;
      const scGeo = new THREE.PlaneGeometry(1, 1);
      scGeo.rotateX(-Math.PI / 2);
      for (let i = 0; i < 28; i++) {
        const mat = new THREE.MeshStandardMaterial({
          map: RR.Tex.scorch(), transparent: true, depthWrite: false, roughness: 1, opacity: 0,
          polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
        });
        const mesh = new THREE.Mesh(scGeo, mat);
        mesh.visible = false;
        mesh.renderOrder = 1;
        mesh.receiveShadow = true;
        scene.add(mesh);
        this.scorches.push({ mesh, t: 0 });
      }
      this.emitters = [];
      this.parts = []; // detached car parts flying around
    },

    reset() {
      this.add.clear(); this.smoke.clear(); this.debris.clear(); this.skids.clear();
      this.sparkN = 0;
      for (const l of this.lights) { l.light.intensity = 0; l.t = l.dur; }
      for (const r of this.rings) { r.mesh.visible = false; r.t = r.dur; }
      for (const s of this.scorches) { s.mesh.visible = false; }
      this.emitters = this.emitters.filter((e) => e.persistent);
      for (const p of this.parts) this.scene.remove(p.obj);
      this.parts.length = 0;
      this.trauma = 0;
    },

    setScale(pixelHeight, fovDeg) {
      const s = pixelHeight / (2 * Math.tan((fovDeg * Math.PI) / 360));
      this.add.mat.uniforms.uScale.value = s;
      this.smoke.mat.uniforms.uScale.value = s;
    },

    shake(amount) { this.trauma = Math.min(1, this.trauma + amount); },

    /* ------------------------------------------------------- primitives */
    spark(x, y, z, vx, vy, vz, life, w) {
      const sp = this.sp;
      let i;
      if (this.sparkN < this.sparkMax) i = this.sparkN++;
      else i = (Math.random() * this.sparkMax) | 0;
      sp.x[i] = x; sp.y[i] = y; sp.z[i] = z;
      sp.vx[i] = vx; sp.vy[i] = vy; sp.vz[i] = vz;
      sp.life[i] = life; sp.max[i] = life; sp.w[i] = w || 0.12;
    },

    sparks(x, y, z, nx, ny, nz, count, speed) {
      for (let i = 0; i < count; i++) {
        const s = speed * rand(0.4, 1.1);
        this.spark(x, y, z,
          (nx + rand(-0.7, 0.7)) * s, (ny + rand(0.1, 0.9)) * s, (nz + rand(-0.7, 0.7)) * s,
          rand(0.25, 0.6), rand(0.08, 0.16));
      }
    },

    dust(x, z, vx, vz, size, alpha, dark) {
      const c = dark ? COL.dustDark : COL.dust;
      this.smoke.spawn(x + rand(-0.4, 0.4), 0.4, z + rand(-0.4, 0.4),
        vx * 0.25 + rand(-1, 1), rand(0.4, 1.6), vz * 0.25 + rand(-1, 1),
        rand(1.0, 2.0), size * 0.6, size * 2.4, c, c, alpha, 0, 1.6, -0.2);
    },

    tireSmoke(x, z, vx, vz) {
      this.smoke.spawn(x + rand(-0.3, 0.3), 0.35, z + rand(-0.3, 0.3),
        vx * 0.15 + rand(-0.8, 0.8), rand(0.6, 1.4), vz * 0.15 + rand(-0.8, 0.8),
        rand(1.0, 1.8), 1.0, 4.2, COL.smokeLight, COL.smokeGrey, 0.32, 0, 1.4, -0.3);
    },

    exhaustPuff(x, y, z, dx, dy, dz, heavy) {
      this.smoke.spawn(x, y, z, dx * 2 + rand(-0.3, 0.3), dy * 2 + rand(0.2, 0.8), dz * 2 + rand(-0.3, 0.3),
        rand(0.5, 0.9), 0.4, heavy ? 2.0 : 1.2, COL.smokeDark, COL.smokeGrey, heavy ? 0.45 : 0.22, 0, 2, -0.5);
    },

    nitroFlame(x, y, z, dx, dy, dz, vx, vz) {
      for (let i = 0; i < 2; i++) {
        const s = rand(10, 16);
        this.add.spawn(x, y, z, vx + dx * s + rand(-0.6, 0.6), dy * s + rand(-0.4, 0.4), vz + dz * s + rand(-0.6, 0.6),
          rand(0.08, 0.16), rand(0.7, 1.0), 0.25, COL.nitroCore, COL.nitroEnd, 0.9, 0, 2, 0);
      }
    },

    muzzle(x, y, z, dx, dz, vx, vz) {
      this.add.spawn(x, y, z, vx + dx * 8, 0.5, vz + dz * 8, 0.06, 1.3, 0.4, COL.flashHot, COL.fireMid, 0.9, 0, 0, 0);
      if (Math.random() < 0.4) {
        this.smoke.spawn(x, y, z, vx * 0.6 + dx * 3, rand(0.5, 1.5), vz * 0.6 + dz * 3,
          rand(0.4, 0.7), 0.5, 1.8, COL.smokeGrey, COL.smokeLight, 0.18, 0, 3, -0.6);
      }
    },

    shellCasing(x, y, z, sx, sz, vx, vz) {
      this.smoke.spawn(x, y, z, vx + sx * rand(3, 5), rand(3, 5), vz + sz * rand(3, 5),
        rand(0.5, 0.8), 0.18, 0.16, COL.brass, COL.brass, 1, 1, 0.5, 22);
    },

    bulletImpact(x, y, z, nx, nz, metal) {
      if (metal) {
        this.sparks(x, y, z, nx, 0.3, nz, 4, 14);
        this.add.spawn(x, y, z, 0, 0, 0, 0.06, 1.2, 0.6, COL.flashHot, COL.fireMid, 0.8, 0, 0, 0);
      } else {
        this.smoke.spawn(x, 0.3, z, nx * 2 + rand(-1, 1), rand(1, 3), nz * 2 + rand(-1, 1),
          rand(0.5, 0.9), 0.6, 2.2, COL.dust, COL.dust, 0.5, 0, 2, 4);
        if (Math.random() < 0.5) this.sparks(x, 0.3, z, nx, 0.5, nz, 2, 8);
      }
    },

    fire(x, y, z, scale, vx, vz) {
      this.add.spawn(x + rand(-0.3, 0.3) * scale, y, z + rand(-0.3, 0.3) * scale,
        (vx || 0) * 0.5 + rand(-0.6, 0.6), rand(2, 4) * scale, (vz || 0) * 0.5 + rand(-0.6, 0.6),
        rand(0.3, 0.6), 1.05 * scale, 0.3 * scale, COL.fireCore, COL.fireEnd, 0.7, 0, 1, -1.5);
    },

    damageSmoke(x, y, z, heavy, vx, vz) {
      const c0 = heavy ? COL.smokeDark : COL.smokeGrey;
      this.smoke.spawn(x + rand(-0.2, 0.2), y, z + rand(-0.2, 0.2),
        vx * 0.3 + rand(-0.5, 0.5), rand(1.5, 3), vz * 0.3 + rand(-0.5, 0.5),
        rand(1.2, 2.2), 0.9, heavy ? 5 : 3.5, c0, COL.smokeGrey, heavy ? 0.55 : 0.35, 0, 1.2, -0.8);
    },

    glowBurst(x, y, z, color, count, speed, size) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2), s = rand(0.3, 1) * speed;
        this.add.spawn(x, y, z, Math.cos(a) * s, rand(1, 4), Math.sin(a) * s,
          rand(0.4, 0.8), size, 0.2, color, color, 0.9, 0, 2, 2);
      }
    },

    flashLight(x, y, z, peak, dur) {
      let best = this.lights[0];
      for (const l of this.lights) if (l.t / l.dur > best.t / best.dur) best = l;
      best.light.position.set(x, y, z);
      best.peak = peak; best.dur = dur; best.t = 0;
      best.light.intensity = peak;
    },

    ring(x, z, size, dur) {
      let r = this.rings[0];
      for (const q of this.rings) if (q.t / q.dur > r.t / r.dur) r = q;
      r.mesh.position.set(x, 0.3, z);
      r.size = size; r.dur = dur; r.t = 0;
      r.mesh.visible = true;
    },

    scorch(x, z, size) {
      const s = this.scorches[this.scorchHead];
      this.scorchHead = (this.scorchHead + 1) % this.scorches.length;
      s.mesh.position.set(x, 0.04 + this.scorchHead * 0.0004, z);
      s.mesh.rotation.y = rand(0, Math.PI * 2);
      s.mesh.scale.set(size, 1, size);
      s.mesh.material.opacity = 0.85;
      s.mesh.visible = true;
      s.t = 0;
    },

    /* ------------------------------------------------------- composites */
    explosion(x, y, z, scale) {
      scale = scale || 1;
      // hot flash
      this.add.spawn(x, y + 0.5, z, 0, 0, 0, 0.14, 9 * scale, 13 * scale, COL.flashHot, COL.fireMid, 0.9, 0, 0, 0);
      // fireball (half hot cores, half deeper orange so it reads as flame)
      for (let i = 0; i < 15 * scale; i++) {
        const a = rand(0, Math.PI * 2), s = rand(3, 11) * scale;
        this.add.spawn(x + rand(-0.8, 0.8), y + rand(0, 1), z + rand(-0.8, 0.8),
          Math.cos(a) * s, rand(2, 9) * scale, Math.sin(a) * s,
          rand(0.4, 0.85), rand(2.5, 4) * scale, rand(5, 7.5) * scale, i % 2 ? COL.fireCore : COL.fireMid, COL.fireEnd, 0.6, 0, 3.2, -2);
      }
      // smoke
      for (let i = 0; i < 14 * scale; i++) {
        const a = rand(0, Math.PI * 2), s = rand(1, 5) * scale;
        this.smoke.spawn(x + rand(-1, 1), y + rand(0.5, 2), z + rand(-1, 1),
          Math.cos(a) * s, rand(2, 6), Math.sin(a) * s,
          rand(2.0, 3.6), rand(3, 4) * scale, rand(10, 15) * scale, COL.smokeDark, COL.smokeGrey, 0.62, 0, 1.0, -0.7);
      }
      // sparks + debris
      for (let i = 0; i < 26 * scale; i++) {
        const a = rand(0, Math.PI * 2), s = rand(10, 30);
        this.spark(x, y + 0.5, z, Math.cos(a) * s, rand(4, 18), Math.sin(a) * s, rand(0.4, 1.0), rand(0.12, 0.22));
      }
      for (let i = 0; i < 6 * scale; i++) {
        const a = rand(0, Math.PI * 2), s = rand(5, 14);
        this.debris.spawn(x, y + 1, z, Math.cos(a) * s, rand(7, 16), Math.sin(a) * s, rand(0.5, 1.2) * scale);
      }
      this.ring(x, z, 18 * scale, 0.45);
      this.flashLight(x, y + 3, z, 650 * scale, 0.55);
      this.scorch(x, z, 7 * scale);
    },

    pickupBurst(x, z, color) {
      this.glowBurst(x, 1.2, z, color, 22, 9, 1.2);
      this.ring(x, z, 9, 0.4);
    },

    /* ---------------------------------------------------- emitters */
    // kind: 'fire' | 'smoke' | 'barrel' ; follow: optional object with .worldPos(out)
    emitter(opts) {
      const e = Object.assign({ rate: 20, life: Infinity, scale: 1, acc: 0, alive: true, y: 1 }, opts);
      this.emitters.push(e);
      return e;
    },

    // Detached car part that tumbles away.
    flyPart(obj, vx, vy, vz) {
      this.scene.add(obj);
      this.parts.push({ obj, vx, vy, vz, wx: rand(-8, 8), wy: rand(-6, 6), wz: rand(-8, 8), life: 9 });
    },

    /* ---------------------------------------------------------- update */
    update(dt, camera) {
      this.time += dt;
      // camera-facing direction for streaks
      this.streaks.camDir.set(0, 0.87, 0.49);
      if (camera) {
        this.streaks.camDir.copy(camera.position).sub(this._camTarget || camera.position).normalize();
        if (this.streaks.camDir.lengthSq() < 0.5) this.streaks.camDir.set(0, 0.87, 0.49);
      }

      // emitters
      for (let i = this.emitters.length - 1; i >= 0; i--) {
        const e = this.emitters[i];
        e.life -= dt;
        if (e.life <= 0 || !e.alive) { this.emitters.splice(i, 1); continue; }
        const ft = this._camTarget;
        if (!e.far && ft && (e.x - ft.x) * (e.x - ft.x) + (e.z - ft.z) * (e.z - ft.z) > 180 * 180) { e.acc = 0; continue; }
        e.acc += e.rate * dt;
        while (e.acc >= 1) {
          e.acc -= 1;
          if (e.kind === 'fire') {
            this.fire(e.x, e.y, e.z, e.scale);
            if (Math.random() < 0.35) this.damageSmoke(e.x, e.y + 1, e.z, true, 0, 0);
          } else if (e.kind === 'smoke') {
            this.smoke.spawn(e.x + rand(-1, 1) * e.scale, e.y, e.z + rand(-1, 1) * e.scale,
              rand(-0.6, 0.6), rand(2, 4), rand(-0.6, 0.6), rand(3, 5), 2 * e.scale, 9 * e.scale,
              COL.smokeDark, COL.smokeGrey, 0.4, 0, 0.6, -0.4);
          } else if (e.kind === 'barrel') {
            this.add.spawn(e.x + rand(-0.25, 0.25), e.y, e.z + rand(-0.25, 0.25), rand(-0.3, 0.3), rand(1.5, 3), rand(-0.3, 0.3),
              rand(0.3, 0.55), 1.1, 0.3, COL.fireCore, COL.fireEnd, 0.8, 0, 1, -1);
          }
        }
      }

      this.add.update(dt);
      this.smoke.update(dt);
      this.debris.update(dt);
      this.skids.update(this.time);

      // sparks -> streaks
      const sp = this.sp;
      let i = 0;
      while (i < this.sparkN) {
        sp.life[i] -= dt;
        if (sp.life[i] <= 0) {
          const last = --this.sparkN;
          if (i !== last) for (const k in sp) sp[k][i] = sp[k][last];
          continue;
        }
        sp.vy[i] -= 24 * dt;
        sp.vx[i] *= 0.985; sp.vz[i] *= 0.985;
        sp.x[i] += sp.vx[i] * dt; sp.y[i] += sp.vy[i] * dt; sp.z[i] += sp.vz[i] * dt;
        if (sp.y[i] < 0.05) { sp.y[i] = 0.05; sp.vy[i] *= -0.4; sp.vx[i] *= 0.7; sp.vz[i] *= 0.7; }
        i++;
      }

      // lights
      for (const l of this.lights) {
        if (l.t < l.dur) {
          l.t += dt;
          const k = Math.max(0, 1 - l.t / l.dur);
          l.light.intensity = l.peak * k * k;
        } else if (l.light.intensity !== 0) l.light.intensity = 0;
      }
      // rings
      for (const r of this.rings) {
        if (!r.mesh.visible) continue;
        r.t += dt;
        const k = r.t / r.dur;
        if (k >= 1) { r.mesh.visible = false; continue; }
        const s = r.size * (0.2 + 0.8 * Math.sqrt(k));
        r.mesh.scale.set(s, 1, s);
        r.mesh.material.opacity = (1 - k) * 0.7;
      }
      // scorch fade
      for (const s of this.scorches) {
        if (!s.mesh.visible) continue;
        s.t += dt;
        if (s.t > 40) {
          s.mesh.material.opacity = Math.max(0, 0.85 - (s.t - 40) / 8);
          if (s.mesh.material.opacity <= 0) s.mesh.visible = false;
        }
      }
      // flying parts
      for (let k = this.parts.length - 1; k >= 0; k--) {
        const p = this.parts[k];
        p.life -= dt;
        if (p.life <= 0) { this.scene.remove(p.obj); this.parts.splice(k, 1); continue; }
        p.vy -= 24 * dt;
        p.obj.position.x += p.vx * dt; p.obj.position.y += p.vy * dt; p.obj.position.z += p.vz * dt;
        if (p.obj.position.y < (p.life < 1.5 ? -(1.5 - p.life) : 0)) {
          p.obj.position.y = p.life < 1.5 ? -(1.5 - p.life) : 0;
          if (p.vy < -3) { p.vy *= -0.3; } else { p.vy = 0; p.wx *= 0.8; p.wz *= 0.8; p.wy *= 0.8; }
          p.vx *= 0.85; p.vz *= 0.85;
        }
        p.obj.rotation.x += p.wx * dt; p.obj.rotation.y += p.wy * dt; p.obj.rotation.z += p.wz * dt;
      }

      // camera shake
      this.trauma = Math.max(0, this.trauma - dt * 1.5);
      const t2 = this.trauma * this.trauma;
      this.shakeX = t2 * 1.8 * (RR.noise.noise(this.time * 28, 3.3) * 2 - 1);
      this.shakeZ = t2 * 1.8 * (RR.noise.noise(7.7, this.time * 28) * 2 - 1);
    },

    // Called after all systems added their streaks for this frame.
    renderStreaks() {
      const sp = this.sp, st = this.streaks;
      for (let i = 0; i < this.sparkN; i++) {
        const vx = sp.vx[i], vy = sp.vy[i], vz = sp.vz[i];
        const v = Math.hypot(vx, vy, vz) || 1;
        const k = sp.life[i] / sp.max[i];
        _tmpC.copy(COL.sparkEnd).lerp(COL.spark, k);
        st.add(sp.x[i], sp.y[i], sp.z[i], vx / v, vy / v, vz / v, Math.min(2.2, v * 0.035 + 0.15), sp.w[i], _tmpC, Math.min(1, k * 1.5));
      }
      st.end();
    },
  };
  FX.COL = COL;
  RR.FX = FX;
})();
