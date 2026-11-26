/* ==========================================================================
   RUSTBLOOD RALLY - geometry.js
   Geometry helpers: cached primitives, a ModelBuilder that assembles many
   parts and merges them per material (few draw calls), box-projected UVs,
   and procedural rocks.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const G = (RR.Geo = {});

  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _p = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const _v = new THREE.Vector3();
  const _n3 = new THREE.Matrix3();
  const UP = new THREE.Vector3(0, 1, 0);
  const IDENTITY = new THREE.Matrix4();

  /* ------------------------------------------------ cached unit primitives */
  const prims = {};
  function nonIndexed(g) {
    if (!g.index) return g;
    const r = g.toNonIndexed();
    g.dispose();
    return r;
  }
  G.nonIndexed = nonIndexed;
  function prim(key, make) {
    if (!prims[key]) prims[key] = nonIndexed(make());
    return prims[key];
  }
  G.unitBox = () => prim('box', () => new THREE.BoxGeometry(1, 1, 1));
  // Unit cylinder: diameter 1, height 1, along +Y. taper = top/bottom radius.
  G.unitCyl = (seg = 12, taper = 1) =>
    prim('cyl' + seg + '_' + taper.toFixed(2), () => new THREE.CylinderGeometry(0.5 * taper, 0.5, 1, seg, 1));
  G.unitCone = (seg = 8) => prim('cone' + seg, () => new THREE.ConeGeometry(0.5, 1, seg, 1));
  G.unitSphere = (ws = 10, hs = 7) => prim('sph' + ws + '_' + hs, () => new THREE.SphereGeometry(0.5, ws, hs));
  G.unitTorus = (tube = 0.3, rs = 6, ts = 14) =>
    prim('tor' + tube + rs + ts, () => new THREE.TorusGeometry(0.5, tube * 0.5, rs, ts));

  G.matrix = function (x, y, z, rx, ry, rz, sx, sy, sz) {
    _e.set(rx || 0, ry || 0, rz || 0);
    _q.setFromEuler(_e);
    _p.set(x || 0, y || 0, z || 0);
    _s.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz);
    return _m.compose(_p, _q, _s);
  };

  /* ------------------------------------------------------------- merging */
  // parts: [{ geo (non-indexed, position/normal/uv), matrix }]
  G.mergeParts = function (parts) {
    let count = 0;
    for (let k = 0; k < parts.length; k++) count += parts[k].geo.attributes.position.count;
    const pos = new Float32Array(count * 3);
    const nor = new Float32Array(count * 3);
    const uvs = new Float32Array(count * 2);
    let o = 0;
    for (let k = 0; k < parts.length; k++) {
      const p = parts[k];
      const P = p.geo.attributes.position, Nn = p.geo.attributes.normal, UV = p.geo.attributes.uv;
      _n3.getNormalMatrix(p.matrix);
      const flip = p.matrix.determinant() < 0;
      for (let i = 0; i < P.count; i++) {
        const src = flip ? i - (i % 3) + (2 - (i % 3)) : i;
        _v.fromBufferAttribute(P, src).applyMatrix4(p.matrix);
        pos[o * 3] = _v.x; pos[o * 3 + 1] = _v.y; pos[o * 3 + 2] = _v.z;
        _v.fromBufferAttribute(Nn, src).applyMatrix3(_n3).normalize();
        nor[o * 3] = _v.x; nor[o * 3 + 1] = _v.y; nor[o * 3 + 2] = _v.z;
        if (UV) { uvs[o * 2] = UV.getX(src); uvs[o * 2 + 1] = UV.getY(src); }
        o++;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  };

  // Box (tri-planar style) UVs chosen per triangle: even texel density on
  // every part so rust/rivet textures never look stretched.
  G.boxUV = function (geo, scale) {
    const P = geo.attributes.position, Nn = geo.attributes.normal, uv = geo.attributes.uv;
    for (let i = 0; i < P.count; i += 3) {
      const nx = Math.abs(Nn.getX(i) + Nn.getX(i + 1) + Nn.getX(i + 2));
      const ny = Math.abs(Nn.getY(i) + Nn.getY(i + 1) + Nn.getY(i + 2));
      const nz = Math.abs(Nn.getZ(i) + Nn.getZ(i + 1) + Nn.getZ(i + 2));
      for (let k = 0; k < 3; k++) {
        const j = i + k;
        let u, v;
        if (nx >= ny && nx >= nz) { u = P.getZ(j); v = P.getY(j); }
        else if (ny >= nz) { u = P.getX(j); v = P.getZ(j); }
        else { u = P.getX(j); v = P.getY(j); }
        uv.setXY(j, u * scale, v * scale);
      }
    }
    uv.needsUpdate = true;
  };

  /* -------------------------------------------------------- ModelBuilder */
  class ModelBuilder {
    constructor() { this.parts = []; }
    add(geo, mat, matrix) {
      this.parts.push({ geo, mat, matrix: (matrix || IDENTITY).clone() });
      return this;
    }
    box(mat, w, h, d, x, y, z, rx, ry, rz) {
      return this.add(G.unitBox(), mat, G.matrix(x, y, z, rx, ry, rz, w, h, d));
    }
    // Cylinder along local Y (radius r, length len).
    cyl(mat, r, len, x, y, z, rx, ry, rz, seg, taper) {
      return this.add(G.unitCyl(seg || 12, taper == null ? 1 : taper), mat, G.matrix(x, y, z, rx, ry, rz, r * 2, len, r * 2));
    }
    // Cylinder whose axis points along +X / +Z.
    cylX(mat, r, len, x, y, z, seg, taper) { return this.cyl(mat, r, len, x, y, z, 0, 0, -Math.PI / 2, seg, taper); }
    cylZ(mat, r, len, x, y, z, seg, taper) { return this.cyl(mat, r, len, x, y, z, Math.PI / 2, 0, 0, seg, taper); }
    cone(mat, r, len, x, y, z, rx, ry, rz, seg) {
      return this.add(G.unitCone(seg || 6), mat, G.matrix(x, y, z, rx, ry, rz, r * 2, len, r * 2));
    }
    // Spike pointing from (x,y,z) in direction (dx,dy,dz).
    spike(mat, x, y, z, dx, dy, dz, len, r) {
      _v.set(dx, dy, dz).normalize();
      _q.setFromUnitVectors(UP, _v);
      _p.set(x + _v.x * len * 0.5, y + _v.y * len * 0.5, z + _v.z * len * 0.5);
      _m.compose(_p, _q, _s.set(r * 2, len, r * 2));
      return this.add(G.unitCone(5), mat, _m);
    }
    sphere(mat, sx, sy, sz, x, y, z, ws, hs) {
      return this.add(G.unitSphere(ws || 10, hs || 7), mat, G.matrix(x, y, z, 0, 0, 0, sx, sy, sz));
    }
    torus(mat, d, tube, x, y, z, rx, ry, rz) {
      return this.add(G.unitTorus(tube), mat, G.matrix(x, y, z, rx, ry, rz, d, d, d));
    }
    // Round bar between two points.
    tube(mat, ax, ay, az, bx, by, bz, r, seg) {
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.hypot(dx, dy, dz) || 0.001;
      _v.set(dx / len, dy / len, dz / len);
      _q.setFromUnitVectors(UP, _v);
      _p.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      _m.compose(_p, _q, _s.set(r * 2, len, r * 2));
      return this.add(G.unitCyl(seg || 6), mat, _m);
    }
    // Side profile [[z, y], ...] extruded across the width (centred on x).
    profile(mat, pts, width, x, bevel) {
      const b = bevel || 0;
      const shape = new THREE.Shape();
      shape.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
      shape.closePath();
      const depth = Math.max(0.01, width - b * 2);
      const g = new THREE.ExtrudeGeometry(shape, {
        depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 1, curveSegments: 1,
      });
      g.rotateY(-Math.PI / 2);
      g.translate((x || 0) + depth / 2, 0, 0);
      return this.add(nonIndexed(g), mat, IDENTITY);
    }
    geometry(mat, geo, x, y, z, rx, ry, rz, sx, sy, sz) {
      return this.add(geo, mat, G.matrix(x, y, z, rx, ry, rz, sx, sy, sz));
    }
    // Call fn(+1) and fn(-1) for left/right symmetric parts.
    sym(fn) { fn(1); fn(-1); return this; }

    // Merge parts by material into a Group of meshes.
    build(opts) {
      opts = opts || {};
      const byMat = new Map();
      for (const p of this.parts) {
        if (!byMat.has(p.mat)) byMat.set(p.mat, []);
        byMat.get(p.mat).push(p);
      }
      const group = new THREE.Group();
      for (const [mat, list] of byMat) {
        const geo = G.mergeParts(list);
        if (opts.boxUV && !(mat.userData && mat.userData.keepUV)) G.boxUV(geo, opts.boxUV);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = opts.castShadow !== false;
        mesh.receiveShadow = !!opts.receiveShadow;
        group.add(mesh);
      }
      return group;
    }
    // Merged geometries keyed by material (for batching into world chunks).
    buildGeometries(boxUV) {
      const byMat = new Map();
      for (const p of this.parts) {
        if (!byMat.has(p.mat)) byMat.set(p.mat, []);
        byMat.get(p.mat).push(p);
      }
      const out = new Map();
      for (const [mat, list] of byMat) {
        const geo = G.mergeParts(list);
        if (boxUV && !(mat.userData && mat.userData.keepUV)) G.boxUV(geo, boxUV);
        out.set(mat, geo);
      }
      return out;
    }
  }
  G.ModelBuilder = ModelBuilder;

  /* -------------------------------------------------------------- rocks */
  G.rock = function (seed, detail) {
    const N = RR.makeNoise(seed);
    const g = new THREE.IcosahedronGeometry(1, detail == null ? 1 : detail);
    const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i);
      const n = N.fbm(_v.x * 1.4 + 5 + _v.y * 0.6, _v.z * 1.4 + _v.y * 0.9, 3);
      _v.multiplyScalar(0.65 + n * 0.7);
      if (_v.y < 0) _v.y *= 0.35;
      P.setXYZ(i, _v.x, _v.y, _v.z);
    }
    g.computeVertexNormals();
    const out = nonIndexed(g);
    G.boxUV(out, 1.2); // layered strata on the sides instead of "tree rings"
    return out;
  };
})();
