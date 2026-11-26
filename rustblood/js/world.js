/* ==========================================================================
   RUSTBLOOD RALLY - world.js
   Builds the environment around the track: dune terrain and mountains,
   road surface, kerbs, gravel, barrier walls, warning chevrons, sky dome,
   golden-hour lighting, ambient dust and circling vultures.
   Scenery props are placed by props.js.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const G = RR.Geo;

  const SUN_DIR = new THREE.Vector3(-0.8, 0.46, 0.38).normalize();
  const yieldFrame = () => new Promise((r) => setTimeout(r, 0));

  const World = (RR.World = {
    colliders: [],    // static circles {x, z, r, kind}
    cgrid: new Map(), // spatial hash for colliders
    aiObstacles: [],  // { along, lateral, r } obstacles on the racing surface
    animated: [],     // { update(dt, t) }
    time: 0,
  });

  /* ------------------------------------------------------- distance field */
  function buildDistanceField(track) {
    const half = 760, cell = 5;
    const n = Math.ceil((half * 2) / cell) + 1;
    const MAXD = 150;
    const d2 = new Float32Array(n * n).fill(MAXD * MAXD);
    const R = Math.ceil(MAXD / cell);
    for (let k = 0; k < track.N; k++) {
      const px = track.px[k], pz = track.pz[k];
      const ci = Math.round((px + half) / cell), cj = Math.round((pz + half) / cell);
      const j0 = Math.max(0, cj - R), j1 = Math.min(n - 1, cj + R);
      const i0 = Math.max(0, ci - R), i1 = Math.min(n - 1, ci + R);
      for (let j = j0; j <= j1; j++) {
        const dz = j * cell - half - pz;
        const dz2 = dz * dz;
        const row = j * n;
        for (let i = i0; i <= i1; i++) {
          const dx = i * cell - half - px;
          const v = dx * dx + dz2;
          if (v < d2[row + i]) d2[row + i] = v;
        }
      }
    }
    for (let i = 0; i < d2.length; i++) d2[i] = Math.sqrt(d2[i]);
    const d = d2;
    return {
      sample(x, z) {
        const fx = (x + half) / cell, fz = (z + half) / cell;
        if (fx < 0 || fz < 0 || fx >= n - 1 || fz >= n - 1) return MAXD;
        const i = Math.floor(fx), j = Math.floor(fz);
        const tx = fx - i, tz = fz - j;
        const a = d[j * n + i], b = d[j * n + i + 1], c = d[(j + 1) * n + i], e = d[(j + 1) * n + i + 1];
        return (a * (1 - tx) + b * tx) * (1 - tz) + (c * (1 - tx) + e * tx) * tz;
      },
    };
  }

  /* -------------------------------------------------------------- terrain */
  World.heightAt = function (x, z, d) {
    if (d === undefined) d = this.df.sample(x, z);
    const N = RR.noise;
    const mask = U.smoothstep(this.wallDist + 6, this.wallDist + 85, d);
    let h = 0;
    if (mask > 0) {
      const dunes = N.fbm(x * 0.0055 + 3.1, z * 0.0055 - 1.7, 4);
      const ridge = N.ridged(x * 0.004 + 11, z * 0.004 + 5, 3);
      h = (Math.pow(dunes, 1.7) * 30 + ridge * 9) * mask;
    }
    const r = Math.hypot(x * 0.85, z);
    const mk = U.smoothstep(640, 1080, r);
    if (mk > 0) h += mk * mk * (50 + N.ridged(x * 0.0028 + 2, z * 0.0028, 5) * 320);
    return h - 0.05;
  };

  function buildTerrain(scene) {
    const SIZE = 2900, SEG = 230;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const P = geo.attributes.position;
    const count = P.count;
    const colors = new Float32Array(count * 3);
    const N = RR.noise;
    const cLight = [1.0, 0.95, 0.88], cDark = [0.72, 0.53, 0.4], cDirt = [0.6, 0.47, 0.38];
    const cRock = [0.5, 0.33, 0.29], cRockHi = [0.78, 0.6, 0.52];
    for (let i = 0; i < count; i++) {
      const x = P.getX(i), z = P.getZ(i);
      const d = World.df.sample(x, z);
      const h = World.heightAt(x, z, d);
      P.setY(i, h);
      const v = N.noise(x * 0.025 + 9, z * 0.025);
      const t = U.clamp(h / 26 + 0.4 + (v - 0.5) * 0.45, 0, 1);
      let r = U.lerp(cDark[0], cLight[0], t), g = U.lerp(cDark[1], cLight[1], t), b = U.lerp(cDark[2], cLight[2], t);
      const near = U.smoothstep(World.wallDist + 26, World.wallDist + 2, d) * 0.65;
      r = U.lerp(r, cDirt[0], near); g = U.lerp(g, cDirt[1], near); b = U.lerp(b, cDirt[2], near);
      const mk = U.smoothstep(620, 900, Math.hypot(x * 0.85, z));
      if (mk > 0) {
        const hi = U.clamp((h - 80) / 220, 0, 1);
        r = U.lerp(r, U.lerp(cRock[0], cRockHi[0], hi), mk);
        g = U.lerp(g, U.lerp(cRock[1], cRockHi[1], hi), mk);
        b = U.lerp(b, U.lerp(cRock[2], cRockHi[2], hi), mk);
      }
      colors[i * 3] = r; colors[i * 3 + 1] = g; colors[i * 3 + 2] = b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * SIZE) / 18, (uv.getY(i) * SIZE) / 18);
    const mat = new THREE.MeshStandardMaterial({ map: RR.Tex.sand(), vertexColors: true, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    scene.add(mesh);
    World.terrain = mesh;
  }

  /* --------------------------------------------------------- road ribbons */
  // A strip following the track between lateral offsets l0 < l1.
  function ribbon(track, l0, l1, y, vLen, k0, k1, alpha) {
    const N = track.N;
    const count = k1 - k0 + 1;
    const pos = new Float32Array(count * 6), nor = new Float32Array(count * 6), uv = new Float32Array(count * 4);
    const col = alpha ? new Float32Array(count * 8) : null;
    const reps = Math.max(1, Math.round(track.length / vLen));
    const vScale = track.length / reps;
    for (let c = 0; c < count; c++) {
      const k = k0 + c;
      const i = ((k % N) + N) % N;
      const px = track.px[i], pz = track.pz[i], rx = track.rx[i], rz = track.rz[i];
      const v = (k * track.spacing) / vScale;
      pos.set([px + rx * l0, y, pz + rz * l0, px + rx * l1, y, pz + rz * l1], c * 6);
      nor.set([0, 1, 0, 0, 1, 0], c * 6);
      uv.set([0, v, 1, v], c * 4);
      if (col) col.set([1, 1, 1, alpha[0], 1, 1, 1, alpha[1]], c * 8);
    }
    const idx = [];
    for (let c = 0; c < count - 1; c++) {
      const a = c * 2, b = a + 1, c2 = a + 2, d = a + 3;
      idx.push(a, b, c2, b, d, c2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  // Contiguous index ranges where predicate(i) holds (handles wrap-around).
  function runs(N, pred) {
    const out = [];
    let start = -1;
    for (let k = 0; k < N; k++) {
      const ok = pred(k);
      if (ok && start < 0) start = k;
      if (!ok && start >= 0) { out.push([start, k]); start = -1; }
    }
    if (start >= 0) {
      if (out.length && out[0][0] === 0) out[0] = [start, N + out[0][1]];
      else out.push([start, N]);
    }
    return out;
  }
  World.runs = runs;

  function buildRoad(scene, track) {
    const W = track.halfWidth, WD = track.wallDist, N = track.N;
    const roadMat = new THREE.MeshStandardMaterial({ map: RR.Tex.road(), roughness: 0.92, metalness: 0.05 });
    const road = new THREE.Mesh(ribbon(track, -W, W, 0.02, 20, 0, N), roadMat);
    road.receiveShadow = true;
    scene.add(road);

    const gravelMat = new THREE.MeshStandardMaterial({ map: RR.Tex.gravel(), roughness: 1, metalness: 0 });
    for (const [l0, l1] of [[-WD - 0.4, -W], [W, WD + 0.4]]) {
      const m = new THREE.Mesh(ribbon(track, l0, l1, 0.012, 8, 0, N), gravelMat);
      m.receiveShadow = true;
      scene.add(m);
    }
    // packed-dirt apron outside the walls fading into the sand
    const apronMat = new THREE.MeshStandardMaterial({
      map: RR.Tex.gravel(), roughness: 1, metalness: 0, vertexColors: true, transparent: true, depthWrite: false,
      polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    for (const [l0, l1, a] of [[-WD - 8, -WD - 0.3, [0, 1]], [WD + 0.3, WD + 8, [1, 0]]]) {
      const m = new THREE.Mesh(ribbon(track, l0, l1, 0.03, 8, 0, N, a), apronMat);
      m.receiveShadow = true;
      m.renderOrder = 1;
      scene.add(m);
    }
    // red/white kerbs on corners (and around the start)
    const curbMat = new THREE.MeshStandardMaterial({ map: RR.Tex.curb(), roughness: 0.85, metalness: 0 });
    const curbRuns = runs(N, (k) => Math.abs(track.curv[k]) > 0.0065 || k < 40 || k > N - 30);
    for (const [k0, k1] of curbRuns) {
      for (const [l0, l1] of [[-W - 1.0, -W + 0.15], [W - 0.15, W + 1.0]]) {
        const m = new THREE.Mesh(ribbon(track, l0, l1, 0.06, 4, k0, k1), curbMat);
        m.receiveShadow = true;
        scene.add(m);
      }
    }
    // start / finish line
    const lineGeo = new THREE.PlaneGeometry(W * 2, 3);
    lineGeo.rotateX(-Math.PI / 2);
    const lineMat = new THREE.MeshStandardMaterial({
      map: RR.Tex.checker(), roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    lineMat.map = lineMat.map.clone();
    lineMat.map.repeat.set(1.25, 1);
    lineMat.map.needsUpdate = true;
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.position.set(track.px[0], 0.045, track.pz[0]);
    line.rotation.y = Math.atan2(track.tx[0], track.tz[0]);
    line.receiveShadow = true;
    scene.add(line);
    // grid boxes
    const s = {};
    const boxMat = new THREE.MeshBasicMaterial({ color: 0xd8ccb0, transparent: true, opacity: 0.55, depthWrite: false });
    const b = new G.ModelBuilder();
    for (let k = 0; k < 4; k++) {
      track.pointAt(World.gridAlong(k), World.gridLateral(k), s);
      const h = s.heading;
      const corner = (dx, dz) => [s.x + Math.cos(h) * dx + Math.sin(h) * dz, s.z - Math.sin(h) * dx + Math.cos(h) * dz];
      const c = corner(0, 2.8);
      b.box(boxMat, 3.4, 0.01, 0.25, c[0], 0.05, c[1], 0, h, 0);
      for (const sx of [-1.7, 1.7]) {
        const e = corner(sx, 1.4);
        b.box(boxMat, 0.22, 0.01, 2.8, e[0], 0.05, e[1], 0, h, 0);
      }
    }
    const grid = b.build({ castShadow: false });
    grid.renderOrder = 2;
    scene.add(grid);
  }

  World.gridAlong = (slot) => -9 - slot * 7.5;
  World.gridLateral = (slot) => (slot % 2 === 0 ? -4.2 : 4.2);

  /* -------------------------------------------------------------- walls */
  const PROFILES = {
    concrete: { pts: [[0, 0], [0.12, 0.3], [0.2, 1.0], [0.3, 1.12], [0.6, 1.12], [0.7, 1.0], [0.78, 0.3], [0.9, 0]], vLen: 6 },
    scrap: { pts: [[0, 0], [0.02, 1.75], [0.14, 1.88], [0.26, 1.75], [0.28, 0]], vLen: 3, swap: true },
    rock: { pts: [[0, 0], [0.3, 0.95], [0.9, 1.55], [1.8, 1.45], [2.6, 0.45], [3.0, 0]], vLen: 9 },
  };
  const ZONE_WALL = { start: 'concrete', desert: 'concrete', industrial: 'concrete', scrap: 'scrap', canyon: 'rock' };

  function wallGeometry(track, side, prof, k0, k1) {
    const N = track.N, WD = track.wallDist;
    const pts = prof.pts, segs = pts.length - 1;
    const count = k1 - k0 + 1;
    const cum = [0];
    for (let s = 0; s < segs; s++) cum.push(cum[s] + Math.hypot(pts[s + 1][0] - pts[s][0], pts[s + 1][1] - pts[s][1]));
    const total = cum[segs];
    const reps = Math.max(1, Math.round(track.length / prof.vLen));
    const vScale = track.length / reps;
    const pos = [], nor = [], uv = [], idx = [];
    let base = 0;
    for (let s = 0; s < segs; s++) {
      const [o0, y0] = pts[s], [o1, y1] = pts[s + 1];
      const dO = o1 - o0, dY = y1 - y0;
      const L = Math.hypot(dO, dY) || 1;
      const nO = -dY / L, nY = dO / L;
      for (let c = 0; c < count; c++) {
        const k = k0 + c, i = ((k % N) + N) % N;
        const ox = track.rx[i] * side, oz = track.rz[i] * side;
        const bx = track.px[i] + ox * WD, bz = track.pz[i] + oz * WD;
        pos.push(bx + ox * o0, y0, bz + oz * o0, bx + ox * o1, y1, bz + oz * o1);
        const nx = ox * nO, nz = oz * nO;
        nor.push(nx, nY, nz, nx, nY, nz);
        const v = (k * track.spacing) / vScale;
        const u0 = cum[s] / total, u1 = cum[s + 1] / total;
        if (prof.swap) uv.push(v, u0, v, u1); else uv.push(u0, v, u1, v);
      }
      // decide winding from the first quad
      const a = base, b = base + 1, c2 = base + 2;
      const ax = pos[a * 3], ay = pos[a * 3 + 1], az = pos[a * 3 + 2];
      const e1 = [pos[b * 3] - ax, pos[b * 3 + 1] - ay, pos[b * 3 + 2] - az];
      const e2 = [pos[c2 * 3] - ax, pos[c2 * 3 + 1] - ay, pos[c2 * 3 + 2] - az];
      const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
      const flip = cx * nor[a * 3] + cy * nor[a * 3 + 1] + cz * nor[a * 3 + 2] < 0;
      for (let c = 0; c < count - 1; c++) {
        const p = base + c * 2, q = p + 1, r = p + 2, t = p + 3;
        if (!flip) idx.push(p, q, r, q, t, r); else idx.push(p, r, q, q, r, t);
      }
      base += count * 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  }

  function buildWalls(scene, track, M) {
    const N = track.N;
    const matFor = { concrete: M.barrier, scrap: M.rustWall, rock: M.rockWall };
    const zoneRuns = [];
    let start = 0;
    for (let k = 1; k <= N; k++) {
      if (k === N || ZONE_WALL[track.zone[k]] !== ZONE_WALL[track.zone[start]]) {
        zoneRuns.push([start, Math.min(k, N), ZONE_WALL[track.zone[start]]]);
        start = k;
      }
    }
    for (const [k0, k1, type] of zoneRuns) {
      for (const side of [-1, 1]) {
        const mesh = new THREE.Mesh(wallGeometry(track, side, PROFILES[type], k0, k1), matFor[type]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
      }
    }
    return zoneRuns;
  }

  /* ------------------------------------------- chunked instanced meshes */
  // Splits instances into map chunks so off-screen chunks are culled both
  // in the main view and in the shadow pass. list: [{ m: Matrix4, c?: Color }]
  World.instanced = function (scene, geo, mat, list, opts) {
    opts = opts || {};
    const size = opts.chunk || 200;
    const groups = new Map();
    for (const it of list) {
      const e = it.m.elements;
      const key = Math.floor(e[12] / size) + ',' + Math.floor(e[14] / size);
      let arr = groups.get(key);
      if (!arr) { arr = []; groups.set(key, arr); }
      arr.push(it);
    }
    const meshes = [];
    for (const arr of groups.values()) {
      const im = new THREE.InstancedMesh(geo, mat, arr.length);
      arr.forEach((it, i) => {
        im.setMatrixAt(i, it.m);
        if (it.c) im.setColorAt(i, it.c);
      });
      im.castShadow = opts.castShadow !== false;
      im.receiveShadow = opts.receiveShadow !== false;
      im.computeBoundingSphere();
      scene.add(im);
      meshes.push(im);
    }
    return meshes;
  };

  /* ------------------------------------------------ wall decorations */
  function buildWallDecor(scene, track, M, zoneRuns) {
    const rng = RR.makeRNG(2024);
    const WD = track.wallDist, N = track.N;
    const s = {};
    const m4 = new THREE.Matrix4();
    // instanced tyre stacks
    const tyreGeo = new THREE.TorusGeometry(0.42, 0.2, 5, 10);
    tyreGeo.rotateX(Math.PI / 2);
    const tyres = [];
    const drums = [];
    const posts = [];
    const boulders = [];
    for (const [k0, k1, type] of zoneRuns) {
      for (const side of [-1, 1]) {
        let k = k0 + rng.int(1, 3);
        while (k < k1) {
          const i = k % N;
          const lat = side * (WD + (type === 'rock' ? 3.2 : 1.6));
          track.pointAt(i * track.spacing, lat, s);
          if (type === 'concrete') {
            if (rng() < 0.75) {
              const h = rng.int(2, 4);
              for (let t = 0; t < h; t++) {
                m4.makeRotationY(rng() * 3);
                m4.setPosition(s.x + rng.range(-0.1, 0.1), 0.2 + t * 0.38, s.z + rng.range(-0.1, 0.1));
                tyres.push(m4.clone());
              }
            } else {
              m4.makeRotationY(rng() * 3);
              m4.setPosition(s.x, 0.6, s.z);
              drums.push({ m: m4.clone(), c: rng() });
            }
            k += rng.int(3, 5);
          } else if (type === 'scrap') {
            track.pointAt(i * track.spacing, side * (WD + 0.32), s);
            m4.makeRotationY(s.heading);
            m4.setPosition(s.x, 1.0, s.z);
            posts.push(m4.clone());
            k += 2;
          } else {
            const sc = rng.range(1.6, 3.4);
            m4.compose(new THREE.Vector3(s.x + rng.range(-1, 1), sc * 0.3, s.z + rng.range(-1, 1)),
              new THREE.Quaternion().setFromEuler(new THREE.Euler(rng() * 0.5, rng() * 6, rng() * 0.5)),
              new THREE.Vector3(sc * rng.range(0.9, 1.4), sc * rng.range(0.7, 1.2), sc * rng.range(0.9, 1.4)));
            boulders.push(m4.clone());
            k += rng.int(2, 4);
          }
        }
      }
    }
    const inst = (geo, mat, list, colorFn, castShadow) => {
      if (!list.length) return [];
      const items = list.map((m, i) => ({ m: m.m || m, c: colorFn ? colorFn(m, i) : null }));
      return World.instanced(scene, geo, mat, items, { castShadow: castShadow !== false });
    };
    inst(tyreGeo, M.tire, tyres);
    const drumGeo = new THREE.CylinderGeometry(0.42, 0.42, 1.2, 10);
    const drumCols = [new THREE.Color(0xffffff), new THREE.Color(0xff9a80), new THREE.Color(0x9ab0c0), new THREE.Color(0xd8c070)];
    inst(drumGeo, M.drum, drums, (d) => drumCols[Math.floor(d.c * drumCols.length)]);
    inst(new THREE.BoxGeometry(0.16, 2.0, 0.16), M.dark, posts);
    inst(G.rock(77, 1), M.rock, boulders);

    // chevron boards on the outside of sharp corners
    const boardGeo = new THREE.PlaneGeometry(2.0, 1.0);
    const postGeo = new THREE.BoxGeometry(0.1, 1.6, 0.1);
    const flipTex = M.chevron.map.clone();
    flipTex.repeat.x = -1;
    flipTex.offset.x = 1;
    flipTex.needsUpdate = true;
    const chevL = M.chevron, chevR = M.chevron.clone();
    chevR.map = flipTex;
    const boardsL = [], boardsR = [], bposts = [];
    const basis = new THREE.Matrix4();
    for (let k = 0; k < N; k += 3) {
      const kc = track.curv[k];
      if (Math.abs(kc) < 0.0115) continue;
      const side = kc > 0 ? 1 : -1; // outside of the turn
      const prof = ZONE_WALL[track.zone[k]];
      const lat = side * (WD + (prof === 'rock' ? 0.8 : 0.45));
      track.pointAt(k * track.spacing, lat, s);
      const tx = s.tx, tz = s.tz, rx = s.rx, rz = s.rz;
      // board faces the track; X axis chosen so arrows point along travel
      if (side < 0) basis.makeBasis(new THREE.Vector3(tx, 0, tz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(rx, 0, rz));
      else basis.makeBasis(new THREE.Vector3(-tx, 0, -tz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-rx, 0, -rz));
      basis.setPosition(s.x, 2.05, s.z);
      (side < 0 ? boardsL : boardsR).push(basis.clone());
      for (const o of [-0.8, 0.8]) {
        m4.makeTranslation(s.x + tx * o, 1.3, s.z + tz * o);
        bposts.push(m4.clone());
      }
    }
    inst(boardGeo, chevL, boardsL, null, false);
    inst(boardGeo, chevR, boardsR, null, false);
    inst(postGeo, M.dark, bposts);
  }

  /* ---------------------------------------------------------------- sky */
  function skyMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        uSun: { value: SUN_DIR },
        uTop: { value: new THREE.Color(0x46607a) },
        uHorizon: { value: new THREE.Color(0xf2a060) },
        uGround: { value: new THREE.Color(0xb27a4e) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 uSun; uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uGround;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.5));
          col = mix(col, uGround, clamp(-h * 5.0, 0.0, 1.0));
          float sd = max(dot(d, normalize(uSun)), 0.0);
          col += vec3(1.0, 0.5, 0.2) * pow(sd, 5.0) * 0.6;
          col += vec3(1.0, 0.75, 0.45) * pow(sd, 48.0) * 1.2;
          col += vec3(5.0, 3.8, 2.4) * pow(sd, 1200.0) * 6.0;
          col = mix(col, uHorizon * 1.15, exp(-abs(h) * 16.0) * 0.45);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
  }

  function buildSky(scene, renderer) {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMaterial());
    sky.renderOrder = -10;
    sky.frustumCulled = false;
    scene.add(sky);
    World.sky = sky;
    // image-based lighting from the same sky
    try {
      const envScene = new THREE.Scene();
      envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial()));
      const pmrem = new THREE.PMREMGenerator(renderer);
      const rt = pmrem.fromScene(envScene, 0.04, 0.1, 200);
      scene.environment = rt.texture;
      pmrem.dispose();
    } catch (e) {
      console.warn('Environment map unavailable', e);
    }
    scene.fog = new THREE.Fog(0xd9a272, 260, 1700);
  }

  function buildLights(scene) {
    const hemi = new THREE.HemisphereLight(0xffd6ac, 0x6e4a30, 0.65);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffc088, 3.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -66; sc.right = 66; sc.top = 66; sc.bottom = -66;
    sc.near = 20; sc.far = 420;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    scene.add(sun.target);
    World.sun = sun;
    World.hemi = hemi;
  }

  // Start lamps on the gantry: 0 = off, 1-3 = red lamps lit, 4 = all green.
  World.setStartLights = function (stage) {
    if (!this.startLamps) return;
    this.startLamps.forEach((m, i) => {
      if (stage >= 4) { m.color.setHex(0x0b3a12); m.emissive.setRGB(0.3, 3.2, 0.5); }
      else if (i < stage) { m.color.setHex(0x3a0806); m.emissive.setRGB(4.0, 0.3, 0.12); }
      else { m.color.setHex(0x220806); m.emissive.setRGB(0, 0, 0); }
    });
  };

  World.followSun = function (x, z) {
    const sx = Math.round(x / 0.5) * 0.5, sz = Math.round(z / 0.5) * 0.5;
    this.sun.position.set(sx + SUN_DIR.x * 220, SUN_DIR.y * 220, sz + SUN_DIR.z * 220);
    this.sun.target.position.set(sx, 0, sz);
  };

  /* ------------------------------------------------------------ ambience */
  function buildDustMotes(scene) {
    const n = 450;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = U.rand(-90, 90); pos[i * 3 + 1] = U.rand(0.5, 18); pos[i * 3 + 2] = U.rand(-70, 70);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      map: RR.Tex.glow(), color: new THREE.Color(1.0, 0.8, 0.55), size: 0.35, transparent: true, opacity: 0.45,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    World.motes = { pts, pos, n, cx: 0, cz: 0 };
  }

  function buildVultures(scene, track) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.9 });
    const bodyGeo = new THREE.BoxGeometry(0.35, 0.25, 1.1);
    const wingGeo = new THREE.BoxGeometry(1.7, 0.05, 0.6);
    wingGeo.translate(0.85, 0, 0);
    const rng = RR.makeRNG(66);
    for (let i = 0; i < 5; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, mat);
      const wl = new THREE.Mesh(wingGeo, mat), wr = new THREE.Mesh(wingGeo, mat);
      wr.rotation.y = Math.PI;
      g.add(body, wl, wr);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      scene.add(g);
      const k = rng.int(0, track.N - 1);
      const bird = {
        g, wl, wr,
        cx: track.px[k] + rng.range(-40, 40), cz: track.pz[k] + rng.range(-40, 40),
        r: rng.range(22, 50), h: rng.range(26, 38), w: rng.range(0.25, 0.4) * rng.sign(), a: rng() * 6, f: rng() * 6,
      };
      World.animated.push({
        update(dt, t) {
          bird.a += bird.w * dt;
          const x = bird.cx + Math.cos(bird.a) * bird.r, z = bird.cz + Math.sin(bird.a) * bird.r;
          g.position.set(x, bird.h + Math.sin(t * 0.7 + bird.f) * 1.5, z);
          g.rotation.y = -bird.a + (bird.w > 0 ? 0 : Math.PI);
          g.rotation.z = bird.w > 0 ? -0.25 : 0.25;
          const flap = Math.sin(t * 2 + bird.f) > 0.7 ? Math.sin(t * 14) * 0.5 : 0.08;
          wl.rotation.z = flap; wr.rotation.z = -flap;
        },
      });
    }
  }

  /* ---------------------------------------------------- shared materials */
  function buildMaterials() {
    const T = RR.Tex;
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const M = {
      rust: std({ map: T.rust(), roughness: 0.85, metalness: 0.35 }),
      rustWall: std({ map: T.rust(), roughness: 0.85, metalness: 0.35, side: THREE.DoubleSide }),
      metal: std({ map: T.metal(), roughness: 0.45, metalness: 0.8 }),
      armor: std({ map: T.armor(), roughness: 0.6, metalness: 0.6 }),
      concrete: std({ map: T.concrete(), roughness: 0.95, metalness: 0 }),
      barrier: std({ map: T.barrier(), roughness: 0.9, metalness: 0 }),
      wood: std({ map: T.wood(), roughness: 0.92, metalness: 0 }),
      rock: std({ map: T.rock(), roughness: 0.95, metalness: 0 }),
      rockWall: std({ map: T.rock(), roughness: 0.95, metalness: 0 }),
      tire: std({ color: 0x1f1c1a, roughness: 0.95, metalness: 0 }),
      charred: std({ map: T.rust(), color: 0x3a302a, roughness: 0.95, metalness: 0.25 }),
      paintRed: std({ map: T.paint(0x8a2c1e, 301), roughness: 0.7, metalness: 0.3 }),
      paintBlue: std({ map: T.paint(0x2f4c60, 302), roughness: 0.7, metalness: 0.3 }),
      paintYellow: std({ map: T.paint(0xb08a2c, 303), roughness: 0.7, metalness: 0.3 }),
      paintGreen: std({ map: T.paint(0x4f5c34, 304), roughness: 0.7, metalness: 0.3 }),
      contRed: std({ map: T.container(), color: 0x9a3a28, roughness: 0.75, metalness: 0.4 }),
      contBlue: std({ map: T.container(), color: 0x2e5872, roughness: 0.75, metalness: 0.4 }),
      contGreen: std({ map: T.container(), color: 0x4d6b3a, roughness: 0.75, metalness: 0.4 }),
      contOrange: std({ map: T.container(), color: 0xb8662a, roughness: 0.75, metalness: 0.4 }),
      glass: std({ color: 0x0f1416, roughness: 0.2, metalness: 0.6 }),
      dark: std({ color: 0x1d1a17, roughness: 0.8, metalness: 0.4 }),
      cloth: std({ color: 0x8c2a1e, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
      clothBone: std({ color: 0xcfc2a6, roughness: 1, metalness: 0, side: THREE.DoubleSide }),
      banner: std({ map: T.banner(), roughness: 0.75, metalness: 0.3 }),
      bone: std({ color: 0xd6cbb2, roughness: 0.75, metalness: 0 }),
      drum: std({ map: T.paint(0x8a3a24, 305), roughness: 0.7, metalness: 0.35 }),
      chevron: std({ map: T.chevron(), roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide }),
      sand: std({ map: T.sand(), color: 0xd8b088, roughness: 1, metalness: 0 }),
    };
    M.rock.userData.uvScale = 0.22;
    M.chevron.userData.keepUV = true;
    M.banner.userData.keepUV = true;
    M.tire.userData.keepUV = true;
    return M;
  }

  /* --------------------------------------------------------- colliders */
  World.addCollider = function (x, z, r, kind) {
    const c = { x, z, r, kind: kind || 'static' };
    this.colliders.push(c);
    const cs = 16;
    const i0 = Math.floor((x - r) / cs), i1 = Math.floor((x + r) / cs);
    const j0 = Math.floor((z - r) / cs), j1 = Math.floor((z + r) / cs);
    for (let i = i0; i <= i1; i++) {
      for (let j = j0; j <= j1; j++) {
        const key = i * 100003 + j;
        let cell = this.cgrid.get(key);
        if (!cell) { cell = []; this.cgrid.set(key, cell); }
        cell.push(c);
      }
    }
    return c;
  };
  World.removeCollider = function (c) {
    const i = this.colliders.indexOf(c);
    if (i >= 0) this.colliders.splice(i, 1);
    for (const cell of this.cgrid.values()) {
      const j = cell.indexOf(c);
      if (j >= 0) cell.splice(j, 1);
    }
  };
  // Colliders near a point (returns a shared array).
  const _near = [];
  World.nearColliders = function (x, z) {
    _near.length = 0;
    const cs = 16;
    const ci = Math.floor(x / cs), cj = Math.floor(z / cs);
    for (let i = ci - 1; i <= ci + 1; i++) {
      for (let j = cj - 1; j <= cj + 1; j++) {
        const cell = this.cgrid.get(i * 100003 + j);
        if (cell) for (let k = 0; k < cell.length; k++) if (_near.indexOf(cell[k]) < 0) _near.push(cell[k]);
      }
    }
    return _near;
  };

  /* --------------------------------------------------------------- build */
  World.build = async function (scene, renderer, track, progress) {
    this.scene = scene;
    this.track = track;
    this.wallDist = track.wallDist;
    progress('Measuring the wasteland…', 0.3);
    await yieldFrame();
    this.df = buildDistanceField(track);
    this.M = buildMaterials();
    progress('Raising dunes and mountains…', 0.38);
    await yieldFrame();
    buildTerrain(scene);
    buildSky(scene, renderer);
    buildLights(scene);
    progress('Laying the road…', 0.48);
    await yieldFrame();
    buildRoad(scene, track);
    const zoneRuns = buildWalls(scene, track, this.M);
    buildWallDecor(scene, track, this.M, zoneRuns);
    progress('Dumping scrap and wrecks…', 0.58);
    await yieldFrame();
    RR.Props.populate(this, scene, track, this.M);
    buildDustMotes(scene);
    buildVultures(scene, track);
    progress('World ready', 0.7);
  };

  /* -------------------------------------------------------------- update */
  World.update = function (dt, camera, focusX, focusZ) {
    this.time += dt;
    for (let i = 0; i < this.animated.length; i++) this.animated[i].update(dt, this.time);
    if (this.sky && camera) this.sky.position.copy(camera.position);
    this.followSun(focusX, focusZ);
    // wrap the dust motes around the focus point
    const m = this.motes;
    if (m) {
      const p = m.pos;
      for (let i = 0; i < m.n; i++) {
        let x = p[i * 3] + dt * 2.2, y = p[i * 3 + 1] + Math.sin(this.time * 0.5 + i) * dt * 0.3, z = p[i * 3 + 2] + dt * 0.6;
        if (x - focusX > 90) x -= 180; else if (x - focusX < -90) x += 180;
        if (z - focusZ > 70) z -= 140; else if (z - focusZ < -70) z += 140;
        p[i * 3] = x; p[i * 3 + 1] = y; p[i * 3 + 2] = z;
      }
      m.pts.geometry.attributes.position.needsUpdate = true;
    }
  };

  World.SUN_DIR = SUN_DIR;
})();
