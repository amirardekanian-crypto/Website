/* ==========================================================================
   RUSTBLOOD RALLY - vehicle-models.js
   Procedural 3D models of the four war machines. Each model is assembled
   from dozens of parts (welded armour, exposed engines, cages, spikes, guns)
   and merged per material. Local axes: +Z forward, +Y up, +X = car's left.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const G = RR.Geo;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const PI = Math.PI;

  /* ------------------------------------------------------------ materials */
  function makeMaterials(paintHex, accentHex, seed) {
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const m = {
      paint: std({ map: RR.Tex.paint(paintHex, seed), roughness: 0.6, metalness: 0.35 }),
      accent: std({ map: RR.Tex.paint(accentHex, seed + 50), roughness: 0.6, metalness: 0.3 }),
      armor: std({ map: RR.Tex.armor(), roughness: 0.5, metalness: 0.65 }),
      metal: std({ map: RR.Tex.metal(), roughness: 0.36, metalness: 0.85 }),
      chrome: std({ color: 0xd9cfc0, roughness: 0.2, metalness: 1.0 }),
      dark: std({ color: 0x1e1b18, roughness: 0.75, metalness: 0.4 }),
      rust: std({ map: RR.Tex.rust(), roughness: 0.85, metalness: 0.3 }),
      glass: std({ color: 0x141b1f, roughness: 0.12, metalness: 0.7 }),
      tire: std({ map: RR.Tex.tread(), roughness: 0.95, metalness: 0.0 }),
      rubber: std({ color: 0x191715, roughness: 0.95, metalness: 0.0 }),
      head: std({ color: 0xfff2d6, emissive: 0xffd9a0, emissiveIntensity: 2.2 }),
      tail: std({ color: 0x3a0500, emissive: 0xff2a10, emissiveIntensity: 1.8 }),
    };
    m.tire.userData.keepUV = true;
    // Materials that char and flash when damaged.
    m.damageable = [m.paint, m.accent, m.armor, m.metal, m.rust, m.chrome, m.dark];
    for (const mat of m.damageable) {
      mat.userData.baseColor = mat.color.clone();
      mat.emissive = new THREE.Color(0x000000);
    }
    return m;
  }

  /* --------------------------------------------------------- shared parts */
  function wheelGeoms(m, r, w, opts, side) {
    opts = opts || {};
    const b = new G.ModelBuilder();
    b.cyl(m.tire, r, w, 0, 0, 0, 0, 0, -PI / 2, 18);
    b.cyl(m.rubber, r * 0.9, w * 1.03, 0, 0, 0, 0, 0, -PI / 2, 18);
    b.cyl(opts.rimMat || m.metal, r * 0.55, w * 1.07, 0, 0, 0, 0, 0, -PI / 2, 10);
    b.cyl(m.dark, r * 0.22, w * 1.14, 0, 0, 0, 0, 0, -PI / 2, 8);
    // beadlock bolts
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      b.cyl(m.chrome, 0.035, w * 1.1, 0, Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, 0, 0, -PI / 2, 5);
    }
    if (opts.spikes) {
      // scythe spike pointing outwards from the hub
      b.cone(m.dark, 0.09, 0.55, side * (w / 2 + 0.3), 0, 0, 0, 0, -side * PI / 2, 6);
    }
    return b.buildGeometries(false);
  }

  function headlight(b, m, x, y, z, r) {
    b.cylZ(m.dark, r * 1.25, 0.16, x, y, z - 0.04, 10);
    b.cylZ(m.head, r, 0.06, x, y, z + 0.05, 10);
    // protective cage bars
    b.box(m.metal, r * 2.4, 0.03, 0.03, x, y + r * 0.45, z + 0.12);
    b.box(m.metal, r * 2.4, 0.03, 0.03, x, y - r * 0.45, z + 0.12);
  }

  function gun(b, m, x, y, z, len) {
    b.box(m.metal, 0.17, 0.2, 0.62, x, y, z);
    b.box(m.dark, 0.08, 0.12, 0.3, x, y + 0.15, z - 0.05);
    b.cylZ(m.metal, 0.075, len * 0.45, x, y + 0.02, z + 0.31 + len * 0.22, 8);
    b.cylZ(m.dark, 0.042, len, x, y + 0.02, z + 0.31 + len / 2, 6);
    return V3(x, y + 0.02, z + 0.31 + len + 0.05);
  }

  function rocketPod(b, m, x, y, z, w, h, tubes) {
    b.box(m.armor, w, h, 0.75, x, y, z);
    b.box(m.paint, w + 0.04, 0.05, 0.78, x, y + h / 2, z);
    const cols = tubes > 2 ? 2 : 1, rows = Math.ceil(tubes / cols);
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const tx = x + (i - (cols - 1) / 2) * (w / cols);
        const ty = y + (j - (rows - 1) / 2) * (h / rows);
        b.cylZ(m.dark, Math.min(w / cols, h / rows) * 0.36, 0.12, tx, ty, z + 0.38, 8);
        b.cylZ(m.chrome, 0.03, 0.06, tx, ty, z + 0.44, 5);
      }
    }
    return V3(x, y, z + 0.55);
  }

  function roundel(num, colorCss, size) {
    const mat = new THREE.MeshStandardMaterial({
      map: RR.Tex.roundel(num, colorCss), transparent: true, alphaTest: 0.25,
      roughness: 0.7, metalness: 0.2, polygonOffset: true, polygonOffsetFactor: -2,
    });
    const geo = new THREE.PlaneGeometry(size, size);
    return { mat, geo };
  }

  // Assemble the final object graph from builders and wheel definitions.
  function assemble(def) {
    const root = new THREE.Group();
    const body = new THREE.Group();
    root.add(body);
    const main = def.builder.build({ boxUV: 0.5 });
    body.add(main);
    const detachables = [];
    for (const d of def.detach || []) {
      const g = d.build({ boxUV: 0.5 });
      body.add(g);
      detachables.push(g);
    }
    if (def.decals) {
      for (const dc of def.decals) {
        const mesh = new THREE.Mesh(dc.geo, dc.mat);
        mesh.position.copy(dc.pos);
        mesh.rotation.y = dc.ry;
        body.add(mesh);
      }
    }
    const wheels = [];
    const geomCache = new Map();
    for (const w of def.wheels) {
      const side = Math.sign(w.x);
      const key = w.r + '_' + w.w + '_' + side;
      if (!geomCache.has(key)) geomCache.set(key, wheelGeoms(def.mats, w.r, w.w, def.wheelOpts, side));
      const geoms = geomCache.get(key);
      const pivot = new THREE.Group();
      pivot.position.set(w.x, w.r, w.z);
      const spin = new THREE.Group();
      pivot.add(spin);
      for (const [mat, geo] of geoms) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        spin.add(mesh);
      }
      root.add(pivot);
      wheels.push({ pivot, spin, r: w.r, front: !!w.front, side: Math.sign(w.x), x: w.x, z: w.z });
    }
    // Muzzle flashes (additive sprites, hidden until firing).
    const flashes = [];
    for (const mz of def.muzzles) {
      const s = new THREE.Sprite(RR.Models.flashMaterial());
      s.position.copy(mz);
      s.scale.set(1.3, 1.3, 1.3);
      s.visible = false;
      body.add(s);
      flashes.push(s);
    }
    // Small glow sprites on headlights.
    for (const hp of def.headlights || []) {
      const s = new THREE.Sprite(RR.Models.lampMaterial());
      s.position.copy(hp);
      s.scale.set(0.9, 0.9, 0.9);
      body.add(s);
    }
    return {
      root, body, wheels, detachables, flashes,
      mats: def.mats,
      muzzles: def.muzzles,
      rocketPods: def.rocketPods,
      minePos: def.minePos,
      exhausts: def.exhausts,
      enginePos: def.enginePos,
    };
  }

  /* ================================================================ REAPER
     Player's sand-rail buggy: open roll cage, exposed supercharged V8 at the
     back, huge rear tyres, spiked bull bar and twin cage-mounted guns. */
  function buildReaper(opts) {
    const m = makeMaterials(opts.paint, opts.accent, opts.seed);
    const b = new G.ModelBuilder();
    // floor pan + nose
    b.box(m.armor, 1.3, 0.18, 3.5, 0, 0.5, 0.0);
    b.profile(m.paint, [[2.25, 0.46], [2.3, 0.64], [1.45, 0.98], [0.5, 1.02], [0.5, 0.46]], 1.3, 0, 0.04);
    b.box(m.dark, 1.0, 0.04, 0.9, 0, 1.0, 0.95, -0.04);
    // side pods
    b.sym((s) => {
      b.box(m.paint, 0.1, 0.5, 1.7, s * 0.68, 0.76, -0.2, 0, 0, s * 0.1);
      b.box(m.dark, 0.32, 0.22, 1.2, s * 0.55, 0.55, -0.3);
    });
    // driver
    b.box(m.dark, 0.6, 0.7, 0.12, 0, 0.98, -0.62, -0.18);
    b.box(m.dark, 0.52, 0.42, 0.36, 0, 0.98, -0.36);
    b.sphere(m.accent, 0.34, 0.36, 0.38, 0, 1.33, -0.32);
    b.box(m.glass, 0.26, 0.09, 0.08, 0, 1.34, -0.14);
    // roll cage
    const R = 0.045;
    b.sym((s) => {
      b.tube(m.metal, s * 0.64, 0.58, -0.72, s * 0.5, 1.78, -0.66, R);
      b.tube(m.metal, s * 0.64, 0.95, 0.52, s * 0.46, 1.68, 0.14, R);
      b.tube(m.metal, s * 0.46, 1.68, 0.14, s * 0.5, 1.78, -0.66, R);
      b.tube(m.metal, s * 0.5, 1.78, -0.66, s * 0.55, 1.08, -1.95, R);
      b.tube(m.metal, s * 0.64, 0.95, 0.52, s * 0.6, 0.62, 1.9, R);
    });
    b.tube(m.metal, -0.5, 1.78, -0.66, 0.5, 1.78, -0.66, R);
    b.tube(m.metal, -0.46, 1.68, 0.14, 0.46, 1.68, 0.14, R);
    b.tube(m.metal, -0.62, 0.62, -0.7, 0.5, 1.78, -0.66, R);
    // exposed engine
    b.box(m.metal, 0.78, 0.5, 0.95, 0, 0.92, -1.35);
    b.sym((s) => b.box(m.chrome, 0.2, 0.14, 0.86, s * 0.27, 1.22, -1.35, 0, 0, s * 0.35));
    b.box(m.metal, 0.46, 0.32, 0.56, 0, 1.4, -1.3);
    b.box(m.dark, 0.42, 0.3, 0.34, 0, 1.68, -1.22);
    b.box(m.chrome, 0.44, 0.05, 0.36, 0, 1.84, -1.22);
    b.cylZ(m.dark, 0.16, 0.08, 0, 1.0, -0.84, 12);
    b.sym((s) => {
      for (let k = 0; k < 2; k++) {
        const z0 = -1.15 - k * 0.3;
        b.tube(m.chrome, s * 0.4, 0.92, z0, s * 0.72, 0.78, z0 - 0.25, 0.04);
        b.tube(m.chrome, s * 0.72, 0.78, z0 - 0.25, s * 0.56, 1.1, -2.15, 0.04);
      }
      b.cylZ(m.chrome, 0.085, 0.28, s * 0.56, 1.12, -2.22, 8);
    });
    // rear wing
    b.box(m.rust, 1.75, 0.06, 0.5, 0, 1.86, -1.98);
    b.sym((s) => {
      b.tube(m.metal, s * 0.5, 1.15, -1.8, s * 0.5, 1.84, -1.95, 0.04);
      b.box(m.rust, 0.05, 0.3, 0.55, s * 0.88, 1.8, -1.98);
    });
    // bull bar + spikes
    b.tube(m.metal, -0.78, 0.68, 2.36, 0.78, 0.68, 2.36, 0.06);
    b.tube(m.metal, -0.7, 0.98, 2.22, 0.7, 0.98, 2.22, 0.05);
    b.sym((s) => {
      b.tube(m.metal, s * 0.72, 0.5, 2.3, s * 0.7, 1.0, 2.22, 0.05);
      b.tube(m.metal, s * 0.26, 0.5, 2.34, s * 0.26, 0.98, 2.22, 0.04);
    });
    for (let i = -2; i <= 2; i++) b.spike(m.dark, i * 0.32, 0.68, 2.38, 0, 0, 1, 0.5, 0.07);
    headlight(b, m, 0.42, 1.0, 2.05, 0.11);
    headlight(b, m, -0.42, 1.0, 2.05, 0.11);
    b.sym((s) => b.box(m.tail, 0.18, 0.1, 0.06, s * 0.62, 0.86, -2.02));
    // suspension
    b.sym((s) => {
      b.tube(m.dark, s * 0.6, 0.55, 1.3, s * 0.95, 0.52, 1.42, 0.035);
      b.tube(m.dark, s * 0.6, 0.62, 1.6, s * 0.95, 0.52, 1.42, 0.035);
      b.tube(m.chrome, s * 0.55, 0.98, 1.25, s * 0.9, 0.6, 1.42, 0.045);
      b.tube(m.dark, s * 0.55, 0.6, -0.85, s * 1.0, 0.72, -1.28, 0.05);
      b.tube(m.chrome, s * 0.52, 1.15, -1.0, s * 0.95, 0.8, -1.28, 0.05);
    });
    // twin machine guns on the cage
    const mz1 = gun(b, m, 0.28, 1.82, 0.35, 0.95);
    const mz2 = gun(b, m, -0.28, 1.82, 0.35, 0.95);
    b.box(m.armor, 0.36, 0.22, 0.4, 0, 1.78, 0.2);
    // rocket pod on the right of the cage
    const pod = rocketPod(b, m, -0.86, 1.3, -0.05, 0.36, 0.32, 4);
    b.tube(m.metal, -0.66, 1.3, -0.05, -0.5, 1.5, -0.1, 0.04);
    // fuel cell + antenna
    b.cylZ(m.metal, 0.2, 0.5, 0, 0.82, -0.85, 10);
    b.tube(m.metal, 0.55, 1.6, -0.75, 0.62, 3.0, -0.95, 0.015);
    b.box(m.accent, 0.02, 0.24, 0.42, 0.62, 2.88, -1.15);

    // detachable parts (fly off as damage builds up)
    const spare = new G.ModelBuilder();
    spare.cyl(m.tire, 0.4, 0.26, 0, 1.17, 1.3, 0, 0, 0, 14);
    spare.cyl(m.metal, 0.22, 0.28, 0, 1.17, 1.3, 0, 0, 0, 8);
    spare.box(m.dark, 0.06, 0.3, 0.9, 0, 1.15, 1.3);
    const plateL = new G.ModelBuilder();
    plateL.box(m.paint, 0.07, 0.44, 1.3, 0.79, 0.74, -0.15);
    const cans = new G.ModelBuilder();
    cans.box(m.accent, 0.18, 0.36, 0.28, -0.84, 0.92, -0.82);
    cans.box(m.rust, 0.18, 0.36, 0.28, -0.84, 0.92, -1.14);
    const decal = roundel(opts.number, opts.css, 0.42);

    return assemble({
      mats: m,
      builder: b,
      detach: [spare, cans, plateL],
      decals: [
        { geo: decal.geo, mat: decal.mat, pos: V3(0.735, 0.8, -0.2), ry: PI / 2 },
        { geo: decal.geo, mat: decal.mat, pos: V3(-0.735, 0.8, -0.2), ry: -PI / 2 },
      ],
      wheels: [
        { x: 1.05, z: 1.42, r: 0.52, w: 0.42, front: true },
        { x: -1.05, z: 1.42, r: 0.52, w: 0.42, front: true },
        { x: 1.12, z: -1.28, r: 0.72, w: 0.62 },
        { x: -1.12, z: -1.28, r: 0.72, w: 0.62 },
      ],
      muzzles: [mz1, mz2],
      rocketPods: [pod],
      minePos: V3(0, 0.5, -2.3),
      exhausts: [{ pos: V3(0.56, 1.12, -2.4), dir: V3(0, 0.15, -1) }, { pos: V3(-0.56, 1.12, -2.4), dir: V3(0, 0.15, -1) }],
      enginePos: V3(0, 1.4, -1.3),
      headlights: [V3(0.42, 1.0, 2.14), V3(-0.42, 1.0, 2.14)],
    });
  }

  /* =============================================================== RUSTJAW
     Six-wheeled armoured war truck with a spiked ram plow, twin exhaust
     stacks and a pintle gun in the cargo bed. */
  function buildRustjaw(opts) {
    const m = makeMaterials(opts.paint, opts.accent, opts.seed);
    const b = new G.ModelBuilder();
    b.sym((s) => b.box(m.dark, 0.2, 0.26, 5.4, s * 0.62, 0.66, -0.1));
    // hood + cab
    b.profile(m.paint, [[2.6, 0.9], [2.62, 1.58], [2.45, 1.74], [1.1, 1.8], [1.1, 0.9]], 1.75, 0, 0.05);
    b.profile(m.paint, [[1.12, 0.88], [1.12, 1.88], [0.86, 2.5], [-0.38, 2.56], [-0.46, 0.88]], 2.16, 0, 0.05);
    b.box(m.armor, 2.2, 0.1, 1.0, 0, 2.6, 0.1);
    // windscreen slits + side windows
    b.box(m.glass, 1.8, 0.34, 0.06, 0, 2.2, 1.0, -0.42);
    b.sym((s) => b.box(m.glass, 0.04, 0.3, 0.75, s * 1.085, 2.15, 0.4));
    for (let i = 0; i < 3; i++) b.box(m.metal, 1.95, 0.05, 0.05, 0, 2.06 + i * 0.13, 1.08 - i * 0.06);
    // grille, radiator, air cleaner
    b.box(m.dark, 1.4, 0.55, 0.06, 0, 1.25, 2.64);
    for (let i = -3; i <= 3; i++) b.box(m.chrome, 0.05, 0.55, 0.05, i * 0.19, 1.25, 2.68);
    b.cyl(m.chrome, 0.24, 0.32, 0.5, 1.98, 1.85, 0, 0, 0, 12);
    b.cyl(m.dark, 0.08, 0.5, 0.5, 2.3, 1.85, 0, 0, 0, 8);
    // ram plow with spikes
    b.box(m.armor, 2.55, 0.85, 0.12, 0, 0.82, 2.9, -0.45);
    b.sym((s) => b.box(m.armor, 0.5, 0.75, 0.12, s * 1.35, 0.8, 2.72, -0.4, s * 0.6, 0));
    b.box(m.paint, 2.6, 0.08, 0.2, 0, 1.22, 2.78);
    for (let i = 0; i < 6; i++) b.spike(m.dark, -1.05 + i * 0.42, 0.8, 3.0, 0, -0.15, 1, 0.65, 0.09);
    headlight(b, m, 0.62, 1.46, 2.68, 0.13);
    headlight(b, m, -0.62, 1.46, 2.68, 0.13);
    // exhaust stacks
    b.sym((s) => {
      b.cyl(m.chrome, 0.1, 2.0, s * 1.0, 2.3, -0.55, 0, 0, 0, 10);
      b.box(m.dark, 0.24, 0.04, 0.26, s * 1.0, 3.32, -0.5, -0.4);
      b.tube(m.metal, s * 1.0, 1.6, -0.55, s * 1.08, 1.6, -0.2, 0.04);
    });
    // cargo bed
    b.box(m.rust, 2.2, 0.16, 2.6, 0, 1.02, -1.75);
    b.sym((s) => b.box(m.paint, 0.1, 0.62, 2.6, s * 1.06, 1.38, -1.75));
    b.box(m.paint, 2.2, 0.62, 0.1, 0, 1.38, -3.03);
    b.cyl(m.rust, 0.3, 0.85, -0.5, 1.52, -2.35, 0, 0, 0, 12);
    b.cyl(m.accent, 0.3, 0.85, 0.35, 1.52, -2.5, 0, 0, 0, 12);
    // pintle-mounted twin gun over the cab
    b.cyl(m.metal, 0.08, 1.75, 0, 1.95, -1.05, 0, 0, 0, 8);
    b.box(m.armor, 0.95, 0.6, 0.06, 0, 2.86, -0.62, -0.1);
    const mz1 = gun(b, m, 0.12, 2.9, -1.0, 1.55);
    const mz2 = gun(b, m, -0.12, 2.9, -1.0, 1.55);
    // side armour skirts with spikes (right side; left one is detachable)
    b.box(m.armor, 0.08, 0.52, 5.0, -1.24, 1.12, -0.25);
    for (let i = 0; i < 6; i++) b.spike(m.dark, -1.27, 1.12, 1.9 - i * 0.85, -1, 0, 0, 0.4, 0.07);
    // fuel tanks
    b.sym((s) => b.cylZ(m.metal, 0.25, 1.0, s * 0.82, 0.78, 0.45, 10));
    // rocket launcher on the roof
    const pod = rocketPod(b, m, -0.66, 2.82, 0.25, 0.5, 0.36, 4);
    b.sym((s) => b.box(m.tail, 0.2, 0.12, 0.06, s * 0.95, 1.25, -3.09));
    b.box(m.tail, 0.5, 0.06, 0.06, 0, 2.66, -0.4);

    const skirtL = new G.ModelBuilder();
    skirtL.box(m.armor, 0.08, 0.52, 5.0, 1.24, 1.12, -0.25);
    for (let i = 0; i < 6; i++) skirtL.spike(m.dark, 1.27, 1.12, 1.9 - i * 0.85, 1, 0, 0, 0.4, 0.07);
    const spare = new G.ModelBuilder();
    spare.cylZ(m.tire, 0.46, 0.3, 0.55, 1.5, -3.2, 14);
    spare.cylZ(m.metal, 0.24, 0.32, 0.55, 1.5, -3.2, 8);
    const plow = new G.ModelBuilder();
    plow.box(m.rust, 0.7, 0.5, 0.08, 0.6, 1.5, 2.75, -0.3, 0, 0.2);
    plow.box(m.rust, 0.6, 0.4, 0.08, -0.7, 1.55, 2.73, -0.3, 0, -0.15);
    const decal = roundel(opts.number, opts.css, 0.6);

    return assemble({
      mats: m,
      builder: b,
      detach: [spare, plow, skirtL],
      decals: [
        { geo: decal.geo, mat: decal.mat, pos: V3(1.09, 1.45, 0.35), ry: PI / 2 },
        { geo: decal.geo, mat: decal.mat, pos: V3(-1.09, 1.45, 0.35), ry: -PI / 2 },
      ],
      wheels: [
        { x: 1.16, z: 1.78, r: 0.68, w: 0.55, front: true },
        { x: -1.16, z: 1.78, r: 0.68, w: 0.55, front: true },
        { x: 1.16, z: -0.95, r: 0.68, w: 0.55 },
        { x: -1.16, z: -0.95, r: 0.68, w: 0.55 },
        { x: 1.16, z: -2.15, r: 0.68, w: 0.55 },
        { x: -1.16, z: -2.15, r: 0.68, w: 0.55 },
      ],
      muzzles: [mz1, mz2],
      rocketPods: [pod],
      minePos: V3(0, 0.6, -3.3),
      exhausts: [{ pos: V3(1.0, 3.4, -0.55), dir: V3(0, 1, -0.3) }, { pos: V3(-1.0, 3.4, -0.55), dir: V3(0, 1, -0.3) }],
      enginePos: V3(0, 1.9, 1.8),
      headlights: [V3(0.62, 1.46, 2.78), V3(-0.62, 1.46, 2.78)],
    });
  }

  /* =============================================================== VULTURE
     Supercharged muscle coupe: blower bursting through the hood, side pipes,
     armoured windscreen slats and a twin rocket launcher on the roof. */
  function buildVulture(opts) {
    const m = makeMaterials(opts.paint, opts.accent, opts.seed);
    const b = new G.ModelBuilder();
    b.profile(m.paint, [[2.45, 0.36], [2.52, 0.74], [2.28, 0.92], [0.6, 1.02], [-1.7, 1.07], [-2.38, 1.08], [-2.46, 0.8], [-2.42, 0.36]], 1.96, 0, 0.06);
    b.profile(m.glass, [[0.62, 1.0], [-0.08, 1.4], [-0.95, 1.42], [-1.72, 1.08], [-1.72, 1.0]], 1.5, 0, 0.03);
    b.box(m.paint, 1.46, 0.07, 0.92, 0, 1.43, -0.52);
    b.sym((s) => {
      b.tube(m.paint, s * 0.74, 1.02, 0.6, s * 0.7, 1.42, -0.08, 0.05);
      b.tube(m.paint, s * 0.72, 1.42, -0.95, s * 0.76, 1.06, -1.72, 0.07);
    });
    // armour slats over windscreen
    for (let i = 0; i < 3; i++) b.box(m.metal, 1.56, 0.04, 0.05, 0, 1.12 + i * 0.1, 0.42 - i * 0.16, -0.6);
    // fender flares
    b.sym((s) => {
      b.box(m.paint, 0.36, 0.2, 1.15, s * 0.98, 0.86, 1.5);
      b.box(m.paint, 0.46, 0.24, 1.32, s * 1.0, 0.93, -1.45);
    });
    // blower bursting through the hood
    b.box(m.metal, 0.56, 0.36, 0.62, 0, 1.18, 1.25);
    b.box(m.chrome, 0.52, 0.3, 0.42, 0, 1.5, 1.32);
    b.box(m.dark, 0.44, 0.2, 0.04, 0, 1.5, 1.54);
    b.box(m.dark, 0.4, 0.3, 0.08, 0, 1.12, 1.6);
    // side pipes
    b.sym((s) => {
      b.cylZ(m.chrome, 0.09, 2.2, s * 1.03, 0.45, -0.1, 10);
      b.tube(m.chrome, s * 0.7, 0.75, 1.0, s * 1.03, 0.45, 0.95, 0.06);
      b.tube(m.chrome, s * 0.7, 0.7, 0.8, s * 1.03, 0.45, 0.75, 0.06);
    });
    // grille, lights
    b.box(m.dark, 1.4, 0.28, 0.06, 0, 0.66, 2.48);
    for (let i = -3; i <= 3; i++) b.box(m.chrome, 0.04, 0.28, 0.05, i * 0.2, 0.66, 2.51);
    headlight(b, m, 0.72, 0.76, 2.46, 0.1);
    headlight(b, m, -0.72, 0.76, 2.46, 0.1);
    b.sym((s) => b.box(m.tail, 0.36, 0.1, 0.05, s * 0.66, 0.88, -2.46));
    // bumper guns
    const mz1 = gun(b, m, 0.46, 0.6, 1.95, 0.75);
    const mz2 = gun(b, m, -0.46, 0.6, 1.95, 0.75);
    // racing stripes
    b.sym((s) => {
      b.box(m.accent, 0.18, 0.012, 1.68, s * 0.22, 0.985, 1.44, -0.06);
      b.box(m.accent, 0.18, 0.012, 0.9, s * 0.22, 1.47, -0.52);
      b.box(m.accent, 0.18, 0.012, 0.66, s * 0.22, 1.09, -2.05);
    });
    // roof rocket launcher
    b.box(m.armor, 0.5, 0.12, 0.5, 0, 1.52, -0.45);
    b.sym((s) => {
      b.cylZ(m.metal, 0.13, 1.1, s * 0.25, 1.69, -0.4, 10);
      b.cylZ(m.dark, 0.1, 0.06, s * 0.25, 1.69, 0.16, 10);
    });

    const spoiler = new G.ModelBuilder();
    spoiler.box(m.rust, 1.8, 0.05, 0.42, 0, 1.42, -2.24);
    spoiler.sym((s) => spoiler.box(m.metal, 0.05, 0.32, 0.2, s * 0.62, 1.24, -2.2));
    const bar = new G.ModelBuilder();
    bar.tube(m.metal, -0.92, 0.5, 2.64, 0.92, 0.5, 2.64, 0.06);
    for (let i = -1.5; i <= 1.5; i += 1) bar.spike(m.dark, i * 0.5, 0.5, 2.66, 0, 0, 1, 0.42, 0.06);
    const scoopPlate = new G.ModelBuilder();
    scoopPlate.box(m.armor, 0.85, 0.08, 0.6, -0.55, 1.12, -1.95, 0, 0.2, 0.05);
    const decal = roundel(opts.number, opts.css, 0.48);

    return assemble({
      mats: m,
      builder: b,
      detach: [spoiler, bar, scoopPlate],
      decals: [
        { geo: decal.geo, mat: decal.mat, pos: V3(0.99, 0.74, -0.25), ry: PI / 2 },
        { geo: decal.geo, mat: decal.mat, pos: V3(-0.99, 0.74, -0.25), ry: -PI / 2 },
      ],
      wheels: [
        { x: 1.0, z: 1.5, r: 0.55, w: 0.42, front: true },
        { x: -1.0, z: 1.5, r: 0.55, w: 0.42, front: true },
        { x: 1.02, z: -1.45, r: 0.62, w: 0.56 },
        { x: -1.02, z: -1.45, r: 0.62, w: 0.56 },
      ],
      muzzles: [mz1, mz2],
      rocketPods: [V3(0.25, 1.69, 0.3), V3(-0.25, 1.69, 0.3)],
      minePos: V3(0, 0.5, -2.7),
      exhausts: [{ pos: V3(1.03, 0.45, -1.25), dir: V3(0.2, 0, -1) }, { pos: V3(-1.03, 0.45, -1.25), dir: V3(-0.2, 0, -1) }],
      enginePos: V3(0, 1.3, 1.3),
      headlights: [V3(0.72, 0.76, 2.56), V3(-0.72, 0.76, 2.56)],
    });
  }

  /* ================================================================ SCORCH
     Lifted spiked pickup: scythe hubs, a mine dropper in the bed, roll bar
     with spotlights, tall stacks and a roof-mounted heavy gun. */
  function buildScorch(opts) {
    const m = makeMaterials(opts.paint, opts.accent, opts.seed);
    const b = new G.ModelBuilder();
    b.sym((s) => b.box(m.dark, 0.16, 0.22, 4.7, s * 0.56, 0.86, 0));
    b.profile(m.paint, [[2.5, 0.95], [2.52, 1.5], [2.36, 1.62], [1.06, 1.68], [1.06, 0.95]], 1.92, 0, 0.05);
    b.profile(m.paint, [[1.08, 0.95], [1.08, 1.72], [0.6, 2.3], [-0.45, 2.32], [-0.55, 0.95]], 1.94, 0, 0.05);
    b.box(m.glass, 1.6, 0.42, 0.05, 0, 2.0, 0.86, -0.85);
    b.sym((s) => b.box(m.glass, 0.04, 0.36, 0.7, s * 0.975, 2.0, 0.15));
    // window cage
    for (let i = -3; i <= 3; i++) b.tube(m.metal, i * 0.24, 1.72, 1.1, i * 0.24, 2.3, 0.62, 0.025);
    b.sym((s) => {
      for (let k = 0; k < 3; k++) b.box(m.metal, 0.03, 0.42, 0.03, s * 1.0, 2.0, -0.15 + k * 0.3);
    });
    // bed
    b.box(m.dark, 1.78, 0.1, 1.95, 0, 1.05, -1.55);
    b.sym((s) => b.box(m.paint, 0.1, 0.56, 1.95, s * 0.93, 1.3, -1.55));
    // mine dropper rack
    b.box(m.armor, 1.2, 0.5, 0.8, 0, 1.35, -1.85);
    for (let i = -1; i <= 1; i++) {
      b.cyl(m.dark, 0.22, 0.1, i * 0.36, 1.66, -1.85, 0, 0, 0, 10);
      b.cyl(m.tail, 0.04, 0.04, i * 0.36, 1.73, -1.85, 0, 0, 0, 6);
    }
    b.box(m.metal, 0.4, 0.4, 0.5, 0, 0.75, -2.45);
    // roll bar + spotlights
    b.sym((s) => b.tube(m.metal, s * 0.86, 1.55, -0.72, s * 0.76, 2.45, -0.72, 0.05));
    b.tube(m.metal, -0.76, 2.45, -0.72, 0.76, 2.45, -0.72, 0.05);
    for (let i = 0; i < 4; i++) {
      const x = -0.54 + i * 0.36;
      b.cylZ(m.dark, 0.1, 0.14, x, 2.56, -0.68, 8);
      b.cylZ(m.head, 0.075, 0.04, x, 2.56, -0.6, 8);
    }
    // tall stacks
    b.sym((s) => {
      b.cyl(m.chrome, 0.09, 1.7, s * 0.8, 1.95, -0.6, 0, 0, 0, 10);
      b.cyl(m.dark, 0.11, 0.12, s * 0.8, 2.82, -0.6, 0, 0, 0, 10);
    });
    // spiked bumper
    b.box(m.armor, 2.1, 0.3, 0.25, 0, 0.95, 2.62);
    for (let i = -2; i <= 2; i++) b.spike(m.dark, i * 0.42, 0.95, 2.72, 0, 0.05, 1, 0.8, 0.08);
    // grille + lights
    b.box(m.dark, 1.3, 0.38, 0.05, 0, 1.25, 2.53);
    for (let i = -4; i <= 4; i++) b.box(m.chrome, 0.035, 0.38, 0.05, i * 0.14, 1.25, 2.56);
    headlight(b, m, 0.7, 1.3, 2.52, 0.12);
    headlight(b, m, -0.7, 1.3, 2.52, 0.12);
    b.sym((s) => b.box(m.tail, 0.14, 0.22, 0.05, s * 0.88, 1.35, -2.55));
    // lifted suspension
    b.sym((s) => {
      b.tube(m.chrome, s * 0.62, 1.15, 1.45, s * 1.0, 0.72, 1.6, 0.06);
      b.tube(m.chrome, s * 0.62, 1.15, -1.35, s * 1.0, 0.72, -1.5, 0.06);
    });
    b.cylX(m.dark, 0.07, 2.1, 0, 0.72, 1.6, 8);
    b.cylX(m.dark, 0.08, 2.1, 0, 0.72, -1.5, 8);
    // flame accent strips on the hood
    b.sym((s) => {
      b.box(m.accent, 0.12, 0.012, 1.1, s * 0.45, 1.66, 1.7, 0, s * 0.15);
      b.box(m.accent, 0.1, 0.012, 0.8, s * 0.25, 1.67, 1.85, 0, s * 0.1);
    });
    // roof gun + bed rocket pod
    b.box(m.armor, 0.42, 0.14, 0.42, 0, 2.4, 0.05);
    const mz1 = gun(b, m, 0, 2.58, 0.15, 1.1);
    const pod = rocketPod(b, m, -0.66, 1.85, -1.15, 0.36, 0.34, 2);

    const tailgate = new G.ModelBuilder();
    tailgate.box(m.paint, 1.9, 0.56, 0.1, 0, 1.3, -2.53);
    const roofSpikes = new G.ModelBuilder();
    roofSpikes.sym((s) => {
      roofSpikes.spike(m.dark, s * 0.75, 2.32, -0.35, s * 0.3, 1, -0.4, 0.5, 0.06);
      roofSpikes.spike(m.dark, s * 0.4, 2.33, -0.42, s * 0.1, 1, -0.5, 0.45, 0.05);
    });
    const sideBox = new G.ModelBuilder();
    sideBox.box(m.rust, 0.25, 0.32, 0.9, 1.08, 1.15, -1.5);
    const decal = roundel(opts.number, opts.css, 0.5);

    return assemble({
      mats: m,
      builder: b,
      detach: [tailgate, roofSpikes, sideBox],
      decals: [
        { geo: decal.geo, mat: decal.mat, pos: V3(0.985, 1.3, 0.25), ry: PI / 2 },
        { geo: decal.geo, mat: decal.mat, pos: V3(-0.985, 1.3, 0.25), ry: -PI / 2 },
      ],
      wheels: [
        { x: 1.12, z: 1.6, r: 0.72, w: 0.6, front: true },
        { x: -1.12, z: 1.6, r: 0.72, w: 0.6, front: true },
        { x: 1.12, z: -1.5, r: 0.72, w: 0.6 },
        { x: -1.12, z: -1.5, r: 0.72, w: 0.6 },
      ],
      wheelOpts: { spikes: true },
      muzzles: [mz1],
      rocketPods: [pod],
      minePos: V3(0, 0.6, -2.75),
      exhausts: [{ pos: V3(0.8, 2.9, -0.6), dir: V3(0, 1, -0.3) }, { pos: V3(-0.8, 2.9, -0.6), dir: V3(0, 1, -0.3) }],
      enginePos: V3(0, 1.7, 1.8),
      headlights: [V3(0.7, 1.3, 2.62), V3(-0.7, 1.3, 2.62)],
    });
  }

  /* ---------------------------------------------------------------- API */
  let flashMat = null, lampMat = null;
  RR.Models = {
    flashMaterial() {
      if (!flashMat) {
        flashMat = new THREE.SpriteMaterial({
          map: RR.Tex.glow(), color: new THREE.Color(3.0, 1.9, 0.7),
          blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
        });
      }
      return flashMat;
    },
    lampMaterial() {
      if (!lampMat) {
        lampMat = new THREE.SpriteMaterial({
          map: RR.Tex.glow(), color: new THREE.Color(1.2, 0.95, 0.6),
          blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55,
        });
      }
      return lampMat;
    },
    builders: { reaper: buildReaper, rustjaw: buildRustjaw, vulture: buildVulture, scorch: buildScorch },
    build(type, opts) {
      const model = this.builders[type](opts);
      model.type = type;
      return model;
    },
  };
})();
