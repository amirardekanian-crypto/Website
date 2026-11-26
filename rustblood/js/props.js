/* ==========================================================================
   RUSTBLOOD RALLY - props.js
   Scenery builders (wrecks, buses, tankers, shacks, watchtowers, scrap
   walls, refinery tanks, chimneys, ruins, pumpjacks, a crashed plane, a
   giant skeleton, the start gantry) and the code that scatters them around
   the circuit. Static props are merged per material into map chunks.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const G = RR.Geo;
  const PI = Math.PI;

  /* -------------------------------------------- batching into map chunks */
  class Batcher {
    constructor(chunk) { this.chunk = chunk; this.map = new Map(); }
    add(builder, worldMatrix) {
      const cx = Math.floor(worldMatrix.elements[12] / this.chunk);
      const cz = Math.floor(worldMatrix.elements[14] / this.chunk);
      const key = cx + ',' + cz;
      let byMat = this.map.get(key);
      if (!byMat) { byMat = new Map(); this.map.set(key, byMat); }
      for (const p of builder.parts) {
        let list = byMat.get(p.mat);
        if (!list) { list = []; byMat.set(p.mat, list); }
        list.push({ geo: p.geo, matrix: new THREE.Matrix4().multiplyMatrices(worldMatrix, p.matrix) });
      }
    }
    flush(scene) {
      for (const byMat of this.map.values()) {
        for (const [mat, list] of byMat) {
          const geo = G.mergeParts(list);
          if (!mat.userData.keepUV) G.boxUV(geo, mat.userData.uvScale || 0.45);
          const mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
        }
      }
      this.map.clear();
    }
  }

  /* ----------------------------------------------------- prop builders
     Each builder fills a ModelBuilder in local space (ground at y = 0) and
     returns optional info. fn.r is the approximate footprint radius. */
  // Czech hedgehog: three crossed rusty girders (anti-tank barricade).
  function hedgehog(b, M, rng) {
    const L = 2.3;
    b.box(M.rust, 0.2, 0.2, L, 0, 0.72, 0, 0.62, 0.3, 0);
    b.box(M.rust, 0.2, 0.2, L, 0, 0.72, 0, -0.62, 0.3, 0);
    b.box(M.rust, 0.2, L, 0.2, 0, 0.72, 0, 0, 0.3, 0.62);
    if (rng() < 0.5) b.box(M.rust, 0.2, 0.2, L, 0.9, 0.2, 0.5, 0, 1.2, 0.1);
    return {};
  }
  hedgehog.r = 1.4;

  // Pole with a ragged flag and a skull on top.
  function flagPole(b, M, rng) {
    b.cyl(M.metal, 0.06, 5.2, 0, 2.6, 0, 0, 0, 0, 6);
    b.box(rng() < 0.5 ? M.cloth : M.clothBone, 0.03, 0.9, 1.5, 0, 4.5, -0.78, 0, 0, rng.range(-0.12, 0.12));
    b.sphere(M.bone, 0.3, 0.33, 0.36, 0, 5.35, 0);
    b.box(M.dark, 0.08, 0.08, 0.04, 0.08, 5.38, 0.17);
    b.box(M.dark, 0.08, 0.08, 0.04, -0.08, 5.38, 0.17);
    return {};
  }
  flagPole.r = 1;

  // Oil drum with a fire burning inside (gets a flame emitter).
  function burnBarrel(b, M) {
    b.cyl(M.rust, 0.45, 1.2, 0, 0.6, 0, 0, 0, 0, 10);
    b.cyl(M.charred, 0.47, 0.08, 0, 1.16, 0, 0, 0, 0, 10);
    return { fire: 1.35 };
  }
  burnBarrel.r = 0.9;

  function sandbags(b, M, rng) {
    const n = rng.int(6, 10), per = Math.ceil(n / 2);
    for (let i = 0; i < n; i++) {
      const row = i < per ? 0 : 1, k = i % per;
      b.box(M.sand, 0.95, 0.36, 0.55, k * 0.9 - per * 0.45 + row * 0.45, 0.18 + row * 0.34, rng.range(-0.05, 0.05), 0, rng.range(-0.15, 0.15), 0);
    }
    return {};
  }
  sandbags.r = 2.6;

  function tireWall(b, M, rng) {
    const n = rng.int(4, 7);
    for (let i = 0; i < n; i++) {
      const h = rng.int(2, 4);
      for (let k = 0; k < h; k++) b.torus(M.tire, 0.95, 0.44, (i - n / 2) * 0.95, 0.22 + k * 0.4, rng.range(-0.08, 0.08), PI / 2, 0, 0);
    }
    return {};
  }
  tireWall.r = 3.4;

  function wreckCar(b, M, rng) {
    const paint = rng.pick([M.paintRed, M.paintBlue, M.paintYellow, M.paintGreen, M.rust, M.rust, M.charred]);
    const L = rng.range(4.2, 4.8), W = 1.8;
    b.profile(paint, [[L / 2, 0.35], [L / 2 + 0.05, 0.75], [L / 2 - 0.5, 0.9], [0.6, 0.95], [0.1, 1.38], [-0.9, 1.4], [-1.4, 1.0], [-L / 2, 0.95], [-L / 2, 0.35]], W, 0, 0.04);
    b.box(M.glass, W - 0.25, 0.32, 0.05, 0, 1.15, 0.35, -0.85);
    b.box(M.dark, W - 0.3, 0.2, 0.05, 0, 0.6, L / 2 + 0.03);
    for (const [x, z] of [[0.85, 1.35], [-0.85, 1.35], [0.85, -1.35], [-0.85, -1.35]]) {
      if (rng() < 0.55) b.cylX(M.tire, 0.36, 0.28, x, 0.36, z, 10);
      else b.cylX(M.rust, 0.2, 0.15, x, 0.28, z, 6);
    }
    if (rng() < 0.4) b.box(paint, W - 0.1, 0.05, 1.2, 0, 1.35, 1.75, -1.1);
    if (rng() < 0.3) return { rz: PI, sink: -1.4 }; // upside down
    return { rz: rng.range(-0.12, 0.12) };
  }
  wreckCar.r = 2.6;

  function bus(b, M, rng) {
    const paint = rng.pick([M.paintYellow, M.rust, M.paintBlue]);
    b.box(paint, 2.5, 2.4, 10, 0, 1.6, 0);
    b.box(M.dark, 2.52, 0.1, 10.02, 0, 0.42, 0);
    for (let i = 0; i < 7; i++) b.sym((s) => b.box(M.glass, 0.04, 0.8, 1.0, s * 1.26, 2.1, -3.9 + i * 1.3));
    b.box(M.glass, 2.2, 0.9, 0.04, 0, 2.05, 5.01);
    b.box(M.rust, 2.3, 0.15, 6, 0, 2.88, -1);
    for (const z of [3.5, -3.2]) b.sym((s) => b.cylX(M.tire, 0.5, 0.4, s * 1.1, 0.35, z, 10));
    b.box(M.wood, 1.2, 0.3, 1.5, 0.3, 3.1, 0.5, 0, 0.3, 0);
    b.box(M.rust, 0.9, 0.6, 0.9, -0.4, 3.25, -2.5, 0, 0.5, 0);
    return { rz: rng.range(-0.06, 0.06) };
  }
  bus.r = 5.5;

  function tanker(b, M, rng) {
    const paint = rng.pick([M.paintRed, M.paintBlue, M.rust]);
    b.profile(paint, [[4.2, 0.6], [4.25, 1.9], [3.9, 2.6], [2.8, 2.65], [2.8, 0.6]], 2.3, 0, 0.05);
    b.box(M.glass, 2.0, 0.6, 0.05, 0, 2.2, 4.07, -0.4);
    b.box(M.dark, 2.0, 0.3, 7.5, 0, 0.6, -0.5);
    b.cylZ(M.metal, 1.25, 6.5, 0, 2.0, -0.6, 16);
    b.cylZ(M.rust, 1.3, 0.2, 0, 2.0, 2.6, 16);
    b.cylZ(M.rust, 1.3, 0.2, 0, 2.0, -3.8, 16);
    b.cylZ(M.rust, 1.3, 0.2, 0, 2.0, -0.6, 16);
    for (const z of [3.5, 0.5, -2.5, -3.5]) b.sym((s) => b.cylX(M.tire, 0.55, 0.45, s * 1.05, 0.55, z, 10));
    return {};
  }
  tanker.r = 5;

  function tirePile(b, M, rng) {
    const n = rng.int(5, 12);
    for (let i = 0; i < n; i++) {
      const a = rng() * PI * 2, d = rng() * 1.5;
      b.torus(M.tire, 0.95, 0.44, Math.cos(a) * d, 0.2 + (i > 6 ? 0.42 : 0), Math.sin(a) * d, PI / 2 + rng.range(-0.3, 0.3), 0, rng.range(-0.3, 0.3));
    }
    return {};
  }
  tirePile.r = 2.2;

  function containerStack(b, M, rng) {
    const mats = [M.contRed, M.contBlue, M.contGreen, M.contOrange];
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      b.box(rng.pick(mats), 2.45, 2.6, 6, rng.range(-0.3, 0.3), 1.3 + i * 2.6, rng.range(-0.4, 0.4), 0, rng.range(-0.2, 0.2), 0);
    }
    if (rng() < 0.5) b.box(rng.pick(mats), 2.45, 2.6, 6, 2.6, 1.3, 0, 0, rng.range(-0.3, 0.3), 0);
    return {};
  }
  containerStack.r = 4.2;

  function shack(b, M, rng) {
    const w = rng.range(3, 5), d = rng.range(3, 4.5), h = rng.range(2.4, 3);
    b.box(M.rust, w, h, 0.1, 0, h / 2, d / 2);
    b.box(M.rust, w, h, 0.1, 0, h / 2, -d / 2);
    b.box(M.rust, 0.1, h, d, w / 2, h / 2, 0);
    b.box(M.rust, 0.1, h, d, -w / 2, h / 2, 0);
    b.box(M.dark, 0.9, 1.9, 0.12, w * 0.2, 0.95, d / 2 + 0.01);
    b.box(M.glass, 0.8, 0.5, 0.12, -w * 0.25, 1.6, d / 2 + 0.01);
    b.box(M.rust, w + 0.6, 0.08, d + 0.6, 0, h + 0.25, 0, 0.12, 0, 0);
    b.cyl(M.metal, 0.12, 1.4, -w * 0.3, h + 0.8, -d * 0.2, 0, 0, 0, 8);
    if (rng() < 0.6) b.box(M.wood, 1.2, 0.8, 0.8, w / 2 + 0.7, 0.4, 0.5, 0, 0.3, 0);
    return {};
  }
  shack.r = 3.4;

  function watchtower(b, M, rng) {
    const h = 7;
    const legs = [[1.5, 1.5], [-1.5, 1.5], [1.5, -1.5], [-1.5, -1.5]];
    for (const [x, z] of legs) b.tube(M.metal, x, 0, z, x * 0.75, h, z * 0.75, 0.12, 6);
    b.tube(M.metal, 1.5, 0.3, 1.5, -1.25, h * 0.55, 1.25, 0.05);
    b.tube(M.metal, -1.5, 0.3, -1.5, 1.25, h * 0.55, -1.25, 0.05);
    b.tube(M.metal, 1.5, 0.3, -1.5, 1.25, h * 0.55, 1.25, 0.05);
    b.box(M.wood, 3.0, 0.2, 3.0, 0, h, 0);
    b.box(M.rust, 3.0, 1.0, 0.06, 0, h + 0.6, 1.5);
    b.box(M.rust, 3.0, 1.0, 0.06, 0, h + 0.6, -1.5);
    b.box(M.rust, 0.06, 1.0, 3.0, 1.5, h + 0.6, 0);
    for (const [x, z] of legs) b.tube(M.metal, x * 0.9, h, z * 0.9, x * 0.9, h + 2.4, z * 0.9, 0.06, 5);
    b.box(M.rust, 3.6, 0.1, 3.6, 0, h + 2.45, 0, 0.12, 0, 0);
    b.tube(M.wood, 1.2, 0, 2.6, 0.9, h, 1.4, 0.05, 4);
    b.tube(M.wood, 0.4, 0, 2.6, 0.2, h, 1.4, 0.05, 4);
    b.cyl(M.dark, 0.05, 3, 1.2, h + 3.8, -1.2, 0, 0, 0, 5);
    b.box(rng() < 0.5 ? M.cloth : M.clothBone, 0.03, 0.8, 1.3, 1.2, h + 4.8, -1.85);
    return {};
  }
  watchtower.r = 2.6;

  function scrapWall(b, M, rng) {
    const n = rng.int(4, 8);
    let x = -n * 0.6;
    for (let i = 0; i < n; i++) {
      const h = rng.range(1.8, 3.4), w = rng.range(1.0, 1.6);
      const mat = rng() < 0.8 ? M.rust : rng.pick([M.paintRed, M.paintBlue, M.contOrange]);
      b.box(mat, w, h, 0.06, x + w / 2, h / 2, rng.range(-0.15, 0.15), rng.range(-0.08, 0.08), rng.range(-0.15, 0.15), rng.range(-0.1, 0.1));
      x += w * 0.9;
    }
    for (let i = 0; i <= n; i += 2) b.cyl(M.dark, 0.06, 3.4, -n * 0.6 + i * 1.2, 1.7, 0.1, 0, 0, 0, 6);
    return {};
  }
  scrapWall.r = 4.5;

  function storageTank(b, M, rng) {
    const r = rng.range(5, 8), h = rng.range(7, 12);
    b.cyl(rng() < 0.5 ? M.rust : M.metal, r, h, 0, h / 2, 0, 0, 0, 0, 24);
    b.cyl(M.metal, r * 1.02, 0.25, 0, h * 0.33, 0, 0, 0, 0, 24);
    b.cyl(M.metal, r * 1.02, 0.25, 0, h * 0.66, 0, 0, 0, 0, 24);
    b.cone(M.rust, r * 1.03, 1.6, 0, h + 0.8, 0, 0, 0, 0, 24);
    b.box(M.dark, 0.6, h, 0.1, 0, h / 2, r + 0.15);
    b.cylX(M.metal, 0.35, r + 3, r / 2 + 1.5, 0.9, 0, 10);
    if (rng() < 0.5) b.box(M.charred, r * 0.8, h * 0.4, 0.2, 0, h * 0.5, -r * 0.99, 0, 0, 0.3);
    return {};
  }
  storageTank.r = 8.5;

  function chimney(b, M) {
    b.cyl(M.concrete, 1.8, 28, 0, 14, 0, 0, 0, 0, 14, 0.65);
    for (let i = 1; i < 5; i++) b.cyl(M.rust, 1.85 - i * 0.12, 0.6, 0, i * 5.5, 0, 0, 0, 0, 14);
    b.cyl(M.dark, 1.25, 0.8, 0, 28, 0, 0, 0, 0, 14);
    return { top: 28.5 };
  }
  chimney.r = 2.5;

  function pipeRun(b, M, rng) {
    const len = rng.range(16, 28);
    b.cylX(M.metal, 0.45, len, 0, 1.6, 0, 12);
    b.cylX(M.rust, 0.35, len, 0, 2.5, 0.5, 12);
    for (let x = -len / 2 + 1; x < len / 2; x += 5) {
      b.box(M.dark, 0.2, 2.8, 0.2, x, 1.4, -0.5);
      b.box(M.dark, 0.2, 2.8, 0.2, x, 1.4, 1.0);
      b.box(M.dark, 0.2, 0.2, 1.7, x, 2.8, 0.25);
    }
    b.torus(M.paintRed, 0.7, 0.18, len * 0.2, 2.2, 0.75, 0, 0, 0);
    return {};
  }
  pipeRun.r = 12;

  function girderRuin(b, M, rng) {
    const nx = rng.int(2, 3), nz = 2, sp = 5, floors = rng.int(1, 3), fh = 4;
    for (let i = 0; i <= nx; i++) {
      for (let j = 0; j <= nz; j++) {
        const hgt = (rng() < 0.3 ? rng.range(0.3, 0.9) : 1) * floors * fh;
        b.box(M.metal, 0.35, hgt, 0.35, (i - nx / 2) * sp, hgt / 2, (j - nz / 2) * sp);
      }
    }
    for (let f = 1; f <= floors; f++) {
      for (let i = 0; i < nx; i++) for (let j = 0; j <= nz; j++) if (rng() < 0.7) b.box(M.metal, sp, 0.3, 0.3, (i - nx / 2 + 0.5) * sp, f * fh, (j - nz / 2) * sp);
      for (let i = 0; i <= nx; i++) for (let j = 0; j < nz; j++) if (rng() < 0.7) b.box(M.metal, 0.3, 0.3, sp, (i - nx / 2) * sp, f * fh, (j - nz / 2 + 0.5) * sp);
    }
    for (let k = 0; k < 3; k++) {
      if (rng() < 0.7) b.box(M.concrete, sp * rng.range(1, 2), rng.range(1.5, 3.5), 0.3, rng.range(-1, 1) * nx * sp / 3, 1.2, (rng() < 0.5 ? -1 : 1) * nz * sp / 2);
    }
    for (let k = 0; k < 7; k++) {
      b.box(M.concrete, rng.range(0.5, 1.5), rng.range(0.3, 0.8), rng.range(0.5, 1.5), rng.range(-1, 1) * nx * sp / 2, 0.25, rng.range(-1, 1) * nz * sp / 2, rng() * 0.5, rng() * 3, rng() * 0.5);
    }
    return {};
  }
  girderRuin.r = 9;

  function barrels(b, M, rng) {
    const n = rng.int(3, 7);
    for (let i = 0; i < n; i++) {
      const a = rng() * PI * 2, d = rng() * 1.5;
      if (rng() < 0.25) b.cyl(M.drum, 0.42, 1.2, Math.cos(a) * d, 0.42, Math.sin(a) * d, PI / 2, rng() * 3, 0, 10);
      else b.cyl(rng() < 0.5 ? M.drum : M.rust, 0.42, 1.2, Math.cos(a) * d, 0.6, Math.sin(a) * d, 0, 0, 0, 10);
    }
    return {};
  }
  barrels.r = 2;

  function signpost(b, M, rng) {
    b.cyl(M.wood, 0.1, 3.2, 0, 1.6, 0, 0, 0, 0, 6);
    b.box(M.wood, 1.6, 0.6, 0.08, 0.3, 2.7, 0, 0, 0, rng.range(-0.2, 0.2));
    b.sphere(M.bone, 0.42, 0.44, 0.48, 0, 3.42, 0.05);
    b.box(M.bone, 0.3, 0.12, 0.26, 0, 3.15, 0.12);
    b.box(M.dark, 0.1, 0.1, 0.05, 0.1, 3.47, 0.28);
    b.box(M.dark, 0.1, 0.1, 0.05, -0.1, 3.47, 0.28);
    return {};
  }
  signpost.r = 1;

  function crushedStack(b, M, rng) {
    const n = rng.int(3, 6);
    const mats = [M.paintRed, M.paintBlue, M.paintYellow, M.paintGreen, M.rust, M.charred];
    for (let i = 0; i < n; i++) {
      b.box(rng.pick(mats), rng.range(1.7, 2.0), 0.6, rng.range(3.8, 4.4), rng.range(-0.25, 0.25), 0.3 + i * 0.62, rng.range(-0.3, 0.3),
        rng.range(-0.05, 0.05), rng.range(-0.2, 0.2), rng.range(-0.05, 0.05));
    }
    return {};
  }
  crushedStack.r = 2.6;

  function grandstand(b, M, rng) {
    const w = rng.range(14, 20), rows = 5;
    for (let r = 0; r < rows; r++) {
      b.box(M.wood, w, 0.15, 1.0, 0, 0.8 + r * 0.7, -r * 1.0);
      b.box(M.rust, w, 0.7, 0.06, 0, 0.45 + r * 0.7, -r * 1.0 + 0.5);
    }
    for (let x = -w / 2; x <= w / 2 + 0.01; x += w / 5) {
      b.tube(M.metal, x, 0, 0.5, x, 1, 0.5, 0.07);
      b.tube(M.metal, x, 0, -rows + 0.5, x, rows * 0.7 + 3.5, -rows + 0.5, 0.07);
      b.tube(M.metal, x, 0.5, 0.5, x, rows * 0.7 + 0.5, -rows + 0.5, 0.06);
    }
    b.box(M.rust, w + 1, 0.1, rows + 1.5, 0, rows * 0.7 + 3.6, -rows / 2, -0.15, 0, 0);
    for (let k = 0; k < 4; k++) {
      const x = -w / 2 + (k * w) / 3;
      b.cyl(M.dark, 0.05, 3, x, rows * 0.7 + 5.1, -rows + 0.5, 0, 0, 0, 5);
      b.box(k % 2 ? M.cloth : M.clothBone, 0.03, 0.7, 1.1, x, rows * 0.7 + 6.2, -rows - 0.05);
    }
    return {};
  }
  grandstand.r = 10;

  function waterTower(b, M) {
    const legs = [[3, 3], [-3, 3], [3, -3], [-3, -3]];
    for (const [x, z] of legs) b.tube(M.metal, x, 0, z, x * 0.65, 12, z * 0.65, 0.18, 6);
    for (const y of [4, 8]) {
      b.tube(M.metal, 2.7, y, 2.7, -2.7, y, 2.7, 0.08);
      b.tube(M.metal, 2.7, y, -2.7, -2.7, y, -2.7, 0.08);
      b.tube(M.metal, 2.7, y, 2.7, 2.7, y, -2.7, 0.08);
      b.tube(M.metal, -2.7, y, 2.7, -2.7, y, -2.7, 0.08);
    }
    b.cyl(M.rust, 3.6, 4.5, 0, 14.2, 0, 0, 0, 0, 20);
    b.cone(M.rust, 3.8, 1.6, 0, 17.2, 0, 0, 0, 0, 20);
    b.box(M.dark, 0.5, 12, 0.08, 0, 6, 3.4);
    b.box(M.paintRed, 2.6, 1.0, 0.05, 0, 14.5, 3.62);
    return {};
  }
  waterTower.r = 4;

  function ribcage(b, M) {
    b.tube(M.bone, 0, 1.0, -12, 0, 1.6, 12, 0.5, 8);
    for (let i = 0; i < 9; i++) {
      const z = -9 + i * 2.2, r = 4.6 - Math.abs(i - 4) * 0.35;
      b.sym((s) => {
        b.tube(M.bone, 0, 1.5, z, s * r * 0.6, r * 0.9, z + 0.3, 0.24, 6);
        b.tube(M.bone, s * r * 0.6, r * 0.9, z + 0.3, s * r, r * 0.45, z + 0.5, 0.21, 6);
        b.tube(M.bone, s * r, r * 0.45, z + 0.5, s * r * 0.9, -0.2, z + 0.6, 0.18, 6);
      });
    }
    b.sphere(M.bone, 3.2, 2.4, 4.4, 0, 1.6, 14.5, 12, 8);
    b.box(M.bone, 2.0, 0.6, 3.2, 0, 0.4, 16.6);
    b.sym((s) => {
      b.cone(M.bone, 0.5, 5.5, s * 1.9, 3.4, 13.2, 0.4, 0, -s * 0.9, 6);
      b.box(M.dark, 0.8, 0.6, 0.2, s * 0.8, 2.2, 16.55);
    });
    return {};
  }
  ribcage.r = 16;

  function crashedPlane(b, M) {
    b.cylZ(M.metal, 2.6, 18, 0, 2.0, 0, 16);
    b.sphere(M.metal, 5.2, 5.2, 7, 0, 2.0, 9.2, 16, 10);
    b.box(M.glass, 2.2, 0.6, 0.6, 0, 3.4, 11.2, -0.6);
    for (let i = 0; i < 8; i++) b.sym((s) => b.box(M.glass, 0.1, 0.4, 0.5, s * 2.55, 2.6, -6 + i * 1.6));
    b.box(M.metal, 13, 0.45, 4.5, 7.5, 1.7, 1.0, 0, 0.12, -0.12);
    b.box(M.metal, 9, 0.45, 4.0, -9, 0.4, 3.5, 0.1, -0.5, 0.25);
    b.cylZ(M.dark, 0.9, 3.0, 5.5, 0.9, 1.8, 12);
    b.cylZ(M.dark, 0.9, 3.0, -6.0, 0.6, 2.0, 12);
    b.cyl(M.metal, 2.4, 8, 1.5, 1.9, -15, PI / 2, 0.35, 0.1, 16);
    b.box(M.paintRed, 0.4, 5.5, 4, 2.8, 5.2, -18.2, 0, 0.35, 0.15);
    b.box(M.metal, 7, 0.3, 2.5, 2.4, 2.4, -18, 0, 0.35, 0.05);
    for (let i = 0; i < 8; i++) b.box(M.metal, 1.5, 0.15, 1.0, -4 + i * 2.2, 0.15, -6 + (i % 3) * 3, 0.2, i, 0.1);
    return {};
  }
  crashedPlane.r = 20;

  function mesa(b, M, rng) {
    const s = rng.range(30, 60), h = rng.range(22, 42);
    b.geometry(M.rock, G.rock(rng.int(1, 999), 2), 0, h * 0.3, 0, 0, rng() * 6, 0, s, h, s * rng.range(0.6, 1.0));
    b.geometry(M.rock, G.rock(rng.int(1, 999), 1), s * 0.5, h * 0.1, s * 0.3, 0, rng() * 6, 0, s * 0.4, h * 0.6, s * 0.4);
    return {};
  }
  mesa.r = 50;

  function pumpjack(world, scene, M, x, y, z, ry, phase) {
    const b = new G.ModelBuilder();
    b.box(M.concrete, 3, 0.4, 7.5, 0, 0.2, 0);
    b.sym((s) => {
      b.tube(M.paintYellow, s * 1.0, 0.4, -1.2, s * 0.3, 4.2, 0, 0.12, 6);
      b.tube(M.paintYellow, s * 1.0, 0.4, 1.2, s * 0.3, 4.2, 0, 0.12, 6);
    });
    b.box(M.metal, 1.2, 1.0, 1.5, 0, 0.9, -2.6);
    b.cylX(M.dark, 0.9, 0.3, 0.8, 1.2, -2.6, 12);
    b.cyl(M.metal, 0.12, 1.4, 0, 0.9, 3.4, 0, 0, 0, 6);
    const base = b.build({ boxUV: 0.5 });
    base.position.set(x, y, z);
    base.rotation.y = ry;
    scene.add(base);
    const bb = new G.ModelBuilder();
    bb.box(M.paintYellow, 0.45, 0.55, 6.6, 0, 0, 0.4);
    bb.box(M.paintYellow, 0.6, 1.8, 0.9, 0, -0.5, 3.8);
    bb.box(M.dark, 0.5, 0.4, 0.6, 0, 0.1, -2.6);
    const beam = bb.build({ boxUV: 0.5 });
    beam.position.set(0, 4.3, 0);
    base.add(beam);
    world.animated.push({ update(dt, t) { beam.rotation.x = Math.sin(t * 1.3 + phase) * 0.3; } });
  }

  function startGantry(world, scene, M, track) {
    const span = (track.wallDist + 2.4) * 2;
    const h = 9;
    const b = new G.ModelBuilder();
    b.sym((s) => {
      const x = s * span / 2;
      for (const dz of [-1.1, 1.1]) for (const dx of [-0.9, 0.9]) b.box(M.metal, 0.35, h + 1.6, 0.35, x + dx, (h + 1.6) / 2, dz);
      for (let y = 0.6; y < h - 1; y += 2.6) {
        b.tube(M.metal, x - 0.9, y, -1.1, x + 0.9, y + 2.6, -1.1, 0.07);
        b.tube(M.metal, x - 0.9, y, 1.1, x + 0.9, y + 2.6, 1.1, 0.07);
        b.tube(M.metal, x - 0.9, y + 2.6, -1.1, x - 0.9, y, 1.1, 0.07);
      }
      b.cyl(M.drum, 0.42, 1.2, x + s * 2.0, 0.6, 1.6, 0, 0, 0, 10);
      b.cyl(M.rust, 0.42, 1.2, x + s * 2.1, 0.6, 0.6, 0, 0, 0, 10);
      b.torus(M.tire, 0.95, 0.44, x + s * 2.0, 0.22, -1.2, PI / 2, 0, 0);
      b.torus(M.tire, 0.95, 0.44, x + s * 2.0, 0.6, -1.2, PI / 2, 0, 0);
      b.cyl(M.dark, 0.06, 3.2, x, h + 3.0, 0, 0, 0, 0, 5);
      b.box(s > 0 ? M.cloth : M.clothBone, 0.03, 1.0, 1.7, x, h + 4.0, -0.85);
    });
    b.box(M.rust, span + 2.2, 1.4, 0.8, 0, h, 0);
    b.box(M.metal, span + 2.2, 0.15, 1.2, 0, h - 0.75, 0);
    b.box(M.metal, span + 2.2, 0.15, 1.2, 0, h + 0.75, 0);
    b.box(M.banner, span * 0.6, 2.4, 0.14, 0, h + 1.95, 0);
    for (let i = -4; i <= 4; i++) {
      if (Math.abs(i) < 2) continue;
      b.tube(M.dark, i * 2.6, h - 0.7, 0, i * 2.6, h - 2.0, 0, 0.03, 4);
      b.torus(M.tire, 1.0, 0.42, i * 2.6, h - 2.55, 0, 0, i * 0.4, 0);
    }
    b.box(M.dark, 5.2, 1.5, 0.7, 0, h - 1.35, 0);
    const g = b.build({ boxUV: 0.5 });
    const s0 = track.sampleAt(0, {});
    g.position.set(s0.x, 0, s0.z);
    g.rotation.y = s0.heading;
    scene.add(g);
    // three start lamps facing the grid (and a copy facing forward)
    const lampGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.9, 16);
    lampGeo.rotateX(PI / 2);
    world.startLamps = [];
    for (let i = 0; i < 3; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x220806, emissive: 0x000000, roughness: 0.35, metalness: 0.2 });
      const lamp = new THREE.Mesh(lampGeo, mat);
      lamp.position.set((i - 1) * 1.6, h - 1.35, 0);
      g.add(lamp);
      world.startLamps.push(mat);
    }
  }

  /* ------------------------------------------------------- populate map */
  function weightedPick(rng, list) {
    let total = 0;
    for (const [, w] of list) total += w;
    let r = rng() * total;
    for (const [fn, w] of list) { r -= w; if (r <= 0) return fn; }
    return list[0][0];
  }

  // Props that line the track (close to the walls).
  const NEAR_PROPS = {
    start: [[flagPole, 3], [burnBarrel, 2.5], [tireWall, 2], [sandbags, 1.5], [barrels, 2], [hedgehog, 1.5], [signpost, 1], [wreckCar, 1]],
    scrap: [[crushedStack, 3], [tireWall, 2], [wreckCar, 3], [hedgehog, 2], [burnBarrel, 1.5], [scrapWall, 2], [tirePile, 2]],
    desert: [[wreckCar, 3], [hedgehog, 2.5], [flagPole, 1.5], [burnBarrel, 1.5], [sandbags, 1.5], [signpost, 1.5], [tireWall, 1.5], [barrels, 1]],
    canyon: [[wreckCar, 1.2], [hedgehog, 1], [signpost, 0.8], [burnBarrel, 0.6]],
    industrial: [[barrels, 3], [burnBarrel, 2], [hedgehog, 1.5], [sandbags, 1.5], [containerStack, 1.5], [scrapWall, 1.5], [tireWall, 1]],
  };
  // Bigger scenery a little further out.
  const ZONE_PROPS = {
    start: [[shack, 2], [barrels, 2], [tirePile, 2], [wreckCar, 2], [scrapWall, 2], [watchtower, 1.5], [containerStack, 1.5], [bus, 0.6]],
    scrap: [[crushedStack, 4], [tirePile, 3], [wreckCar, 4], [scrapWall, 3], [containerStack, 2.5], [shack, 1], [bus, 0.8], [watchtower, 0.6]],
    desert: [[wreckCar, 4], [tanker, 0.8], [bus, 0.8], [barrels, 1], [tirePile, 1], [shack, 1], [scrapWall, 1], [watchtower, 0.6]],
    canyon: [[wreckCar, 1.5], [signpost, 0.5], [barrels, 0.4]],
    industrial: [[storageTank, 1.6], [pipeRun, 2.4], [containerStack, 3], [girderRuin, 1.8], [barrels, 2], [shack, 1], [scrapWall, 1]],
  };

  const OB_BUILD = {
    wreck(b, M, rng) { wreckCar(b, M, rng); return [[0, 1.2, 1.25], [0, -1.2, 1.25]]; },
    blocks(b, M, rng) {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const z = (i - 1) * 2.4, x = rng.range(-0.4, 0.4);
        b.box(M.barrier, 0.9, 1.1, 2.2, x, 0.55, z, 0, rng.range(-0.3, 0.3), 0);
        out.push([x, z, 1.25]);
      }
      return out;
    },
    rocks(b, M, rng) {
      const out = [];
      for (let i = 0; i < 3; i++) {
        const x = rng.range(-1.2, 1.2), z = (i - 1) * 2.6, s = rng.range(1.2, 1.7);
        b.geometry(M.rock, G.rock(rng.int(1, 500), 1), x, s * 0.35, z, 0, rng() * 6, 0, s, s * 0.9, s);
        out.push([x, z, s * 0.95]);
      }
      return out;
    },
    boulder(b, M, rng) {
      const s = rng.range(2.0, 2.5);
      b.geometry(M.rock, G.rock(rng.int(1, 500), 1), 0, s * 0.4, 0, 0, rng() * 6, 0, s, s * 0.85, s * 1.1);
      return [[0, 0, s * 0.95]];
    },
    bus(b, M, rng) { bus(b, M, rng); return [[0, 3.8, 1.4], [0, 1.3, 1.4], [0, -1.3, 1.4], [0, -3.8, 1.4]]; },
    tanker(b, M, rng) { tanker(b, M, rng); return [[0, 3.2, 1.3], [0, 0.9, 1.4], [0, -1.4, 1.4], [0, -3.4, 1.4]]; },
    tires(b, M, rng) { tirePile(b, M, rng); return [[0, 0, 2.0]]; },
  };

  RR.Props = {
    populate(world, scene, track, M) {
      const rng = RR.makeRNG(9001);
      const batch = new Batcher(230);
      const WD = track.wallDist;
      const placed = [];
      const s = {}, s2 = {};
      const free = (x, z, r) => {
        if (world.df.sample(x, z) < WD + 2.5 + r) return false;
        for (let i = 0; i < placed.length; i++) {
          const p = placed[i];
          const dx = p.x - x, dz = p.z - z, rr = p.r + r + 1;
          if (dx * dx + dz * dz < rr * rr) return false;
        }
        return true;
      };
      const place = (fn, x, z, ry, force) => {
        if (!force && !free(x, z, fn.r)) return null;
        const b = new G.ModelBuilder();
        const info = fn(b, M, rng) || {};
        const ground = world.heightAt(x, z);
        const y = ground - 0.12 - (info.sink || 0);
        batch.add(b, G.matrix(x, y, z, info.rx || 0, ry, info.rz || 0).clone());
        placed.push({ x, z, r: fn.r });
        if (info.fire) RR.FX.emitter({ kind: 'barrel', x, y: ground + info.fire, z, rate: 12, persistent: true });
        return info;
      };
      const faceTrack = (sample, side) => Math.atan2(-side * sample.rx, -side * sample.rz);

      /* ---- landmarks */
      startGantry(world, scene, M, track);
      for (const [along, side] of [[42, 1], [70, -1], [118, 1], [150, -1]]) {
        track.pointAt(along, side * (WD + 8), s);
        place(grandstand, s.x, s.z, faceTrack(s, side), true);
      }
      track.pointAt(200, -(WD + 30), s);
      place(waterTower, s.x, s.z, 0.3);
      track.pointAt(800, WD + 46, s);
      place(crashedPlane, s.x, s.z, 2.2);
      track.pointAt(1500, -(WD + 48), s);
      place(ribcage, s.x, s.z, s.heading + 0.4);
      // refinery: tanks + chimneys
      for (const [along, lat] of [[1700, 30], [1735, 52], [1790, -34], [1840, -58], [1870, 40], [1660, -40]]) {
        track.pointAt(along, lat, s);
        place(storageTank, s.x, s.z, rng() * 6);
      }
      for (const [along, lat] of [[1765, 72], [1815, -80]]) {
        track.pointAt(along, lat, s);
        const info = place(chimney, s.x, s.z, 0, false);
        if (info) RR.FX.emitter({ kind: 'smoke', x: s.x, y: world.heightAt(s.x, s.z) + info.top, z: s.z, rate: 5, scale: 1.8, persistent: true, far: true });
      }
      // pumpjacks
      let phase = 0;
      for (const [along, lat] of [[600, -36], [1350, 38], [1580, 30], [2300, 40]]) {
        track.pointAt(along, lat, s);
        if (!free(s.x, s.z, 4.5)) continue;
        pumpjack(world, scene, M, s.x, world.heightAt(s.x, s.z), s.z, s.heading + 0.5, phase += 1.7);
        placed.push({ x: s.x, z: s.z, r: 4.5 });
      }
      // pipe bridge over the track in the refinery
      {
        const along = 1760;
        track.sampleAt(along, s);
        const span = (WD + 2) * 2;
        const b = new G.ModelBuilder();
        const h = 7.5;
        b.sym((sd) => {
          for (const dz of [-1, 1]) for (const dx of [-0.7, 0.7]) b.box(M.metal, 0.3, h + 1.2, 0.3, sd * span / 2 + dx, (h + 1.2) / 2, dz * 1.1);
          for (let y = 0.5; y < h; y += 2.5) b.tube(M.metal, sd * span / 2 - 0.7, y, -1.1, sd * span / 2 + 0.7, y + 2.5, 1.1, 0.06);
        });
        b.cylX(M.rust, 0.55, span + 3, 0, h, -0.45, 12);
        b.cylX(M.metal, 0.38, span + 3, 0, h + 0.15, 0.6, 12);
        b.box(M.dark, span + 2, 0.12, 0.9, 0, h - 0.65, 0.1);
        batch.add(b, G.matrix(s.x, 0, s.z, 0, s.heading, 0).clone());
      }
      // distant mesas and burning wrecks
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * PI * 2 + rng.range(-0.2, 0.2);
        const r = rng.range(470, 620);
        const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.85;
        place(mesa, x, z, rng() * 6, true);
      }
      for (const [x, z] of [[-520, -90], [430, 330], [120, -470]]) {
        RR.FX.emitter({ kind: 'smoke', x, y: world.heightAt(x, z) + 2, z, rate: 4, scale: 2.4, persistent: true, far: true });
        RR.FX.emitter({ kind: 'fire', x, y: world.heightAt(x, z) + 0.5, z, rate: 10, scale: 2.2, persistent: true, far: true });
      }

      /* ---- on-track obstacles (solid) */
      for (const ob of track.layout.obstacles) {
        track.sampleAt(ob.along, s);
        track.pointAt(ob.along, ob.lat, s2);
        const b = new G.ModelBuilder();
        const circles = OB_BUILD[ob.type](b, M, rng);
        const ry = s.heading + (ob.yaw || 0);
        batch.add(b, G.matrix(s2.x, 0, s2.z, 0, ry, 0).clone());
        const c = Math.cos(ry), sn = Math.sin(ry);
        for (const [lx, lz, r] of circles) {
          const wx = s2.x + lx * c + lz * sn, wz = s2.z - lx * sn + lz * c;
          world.addCollider(wx, wz, r, 'obstacle');
          const n = track.nearest(wx, wz, -1, {});
          world.aiObstacles.push({ along: n.along, lateral: n.lateral, r });
        }
      }

      /* ---- props lining the track (what you actually see while racing) */
      for (let along = 0; along < track.length; along += rng.range(5, 9)) {
        track.sampleAt(along, s);
        const list = NEAR_PROPS[s.zone] || NEAR_PROPS.desert;
        for (const side of [-1, 1]) {
          if (rng() < 0.22) continue;
          track.pointAt(along + rng.range(-2, 2), side * rng.range(WD + 3, WD + 11), s2);
          const fn = weightedPick(rng, list);
          place(fn, s2.x, s2.z, rng() * PI * 2);
        }
      }
      /* ---- small clutter hugging the walls */
      const CLUTTER = {
        start: [[flagPole, 2], [burnBarrel, 1.5], [barrels, 1.5], [tirePile, 1]],
        scrap: [[tirePile, 2], [hedgehog, 2], [barrels, 1.5], [burnBarrel, 1]],
        desert: [[hedgehog, 2], [signpost, 1.2], [flagPole, 1], [tirePile, 1.2], [barrels, 0.8]],
        canyon: [[hedgehog, 0.5]],
        industrial: [[barrels, 2.5], [burnBarrel, 1.5], [hedgehog, 1], [tirePile, 0.8]],
      };
      for (let along = 3; along < track.length; along += rng.range(4, 7)) {
        track.sampleAt(along, s);
        if (s.zone === 'canyon') continue;
        const list = CLUTTER[s.zone] || CLUTTER.desert;
        for (const side of [-1, 1]) {
          if (rng() < 0.4) continue;
          track.pointAt(along + rng.range(-1.5, 1.5), side * rng.range(WD + 2.6, WD + 7), s2);
          place(weightedPick(rng, list), s2.x, s2.z, rng() * PI * 2);
        }
      }
      /* ---- bigger scenery a bit further out */
      for (let along = 0; along < track.length; along += rng.range(9, 15)) {
        track.sampleAt(along, s);
        const list = ZONE_PROPS[s.zone] || ZONE_PROPS.desert;
        for (const side of [-1, 1]) {
          if (rng() < 0.3) continue;
          const band = rng() < 0.65 ? rng.range(WD + 10, WD + 26) : rng.range(WD + 26, WD + 65);
          track.pointAt(along + rng.range(-4, 4), side * band, s2);
          const fn = weightedPick(rng, list);
          place(fn, s2.x, s2.z, rng() * PI * 2);
        }
      }
      // extra wrecks and junk scattered in the open desert
      for (let i = 0; i < 90; i++) {
        const x = rng.range(-560, 560), z = rng.range(-470, 470);
        const fn = weightedPick(rng, [[wreckCar, 5], [tirePile, 2], [barrels, 1], [shack, 1], [scrapWall, 1], [bus, 0.5], [tanker, 0.4], [signpost, 0.7]]);
        place(fn, x, z, rng() * PI * 2);
      }
      batch.flush(scene);

      /* ---- rocks (instanced) */
      const rockGeos = [G.rock(11, 1), G.rock(23, 1), G.rock(37, 1), G.rock(51, 1)];
      const lists = rockGeos.map(() => []);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
      const pv = new THREE.Vector3(), sv = new THREE.Vector3();
      const addRock = (x, z, sc, tall) => {
        if (world.df.sample(x, z) < WD + 1.5 + sc * 0.9) return;
        e.set(rng() * 0.6, rng() * 6.3, rng() * 0.6);
        q.setFromEuler(e);
        sv.set(sc * rng.range(0.8, 1.4), sc * rng.range(0.6, 1.1) * (tall || 1), sc * rng.range(0.8, 1.4));
        pv.set(x, world.heightAt(x, z) + sc * 0.2, z);
        m4.compose(pv, q, sv);
        lists[rng.int(0, 3)].push(m4.clone());
      };
      // canyon walls: dense large rocks along both sides
      for (let along = 0; along < track.length; along += 2.5) {
        track.sampleAt(along, s);
        if (s.zone !== 'canyon') continue;
        for (const side of [-1, 1]) {
          track.pointAt(along, side * (WD + rng.range(4, 9)), s2);
          addRock(s2.x, s2.z, rng.range(3, 7), rng.range(1.0, 1.8));
          if (rng() < 0.6) {
            track.pointAt(along, side * (WD + rng.range(10, 26)), s2);
            addRock(s2.x, s2.z, rng.range(5, 12), rng.range(1.0, 2.2));
          }
        }
      }
      for (let i = 0; i < 700; i++) {
        const x = rng.range(-640, 640), z = rng.range(-540, 540);
        const d = world.df.sample(x, z);
        addRock(x, z, rng.range(0.5, 2.0) * (d > 60 ? 2 : 1), 1);
      }
      rockGeos.forEach((geo, gi) => {
        const list = lists[gi];
        if (!list.length) return;
        const items = list.map((m) => {
          const k = rng.range(0.7, 1.0);
          return { m, c: new THREE.Color(k * rng.range(0.95, 1.05), k * rng.range(0.88, 0.96), k * rng.range(0.82, 0.92)) };
        });
        world.instanced(scene, geo, M.rock, items, { chunk: 180 });
      });

      world.propCount = placed.length;
    },
  };
})();
