/* ==========================================================================
   RUSTBLOOD RALLY - track.js
   The circuit: a closed spline sampled every ~2 m. Provides fast queries
   (nearest point, lateral offset, curvature) used by physics, AI and racing.
   Pure math - the 3D road meshes are built in world.js.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;

  /* Control points of the loop, driven counter-clockwise (seen from above).
     x = east, z = south. "zone" sets the scenery of the segment that starts
     at that point. */
  RR.TRACK_LAYOUT = {
    start: { x: -40, z: 258 },
    points: [
      { x: -230, z: 255, zone: 'start' },
      { x: -60, z: 262, zone: 'start' },
      { x: 110, z: 255, zone: 'start' },
      { x: 225, z: 222, zone: 'scrap' },
      { x: 285, z: 150, zone: 'scrap' },
      { x: 290, z: 65, zone: 'scrap' },
      { x: 250, z: 5, zone: 'scrap' },
      { x: 275, z: -65, zone: 'desert' },
      { x: 305, z: -150, zone: 'desert' },
      { x: 270, z: -228, zone: 'desert' },
      { x: 195, z: -245, zone: 'desert' },
      { x: 145, z: -190, zone: 'canyon' },
      { x: 95, z: -120, zone: 'canyon' },
      { x: 25, z: -105, zone: 'canyon' },
      { x: -35, z: -155, zone: 'canyon' },
      { x: -95, z: -230, zone: 'canyon' },
      { x: -190, z: -250, zone: 'desert' },
      { x: -275, z: -195, zone: 'desert' },
      { x: -315, z: -110, zone: 'desert' },
      { x: -290, z: -20, zone: 'industrial' },
      { x: -212, z: 28, zone: 'industrial' },
      { x: -160, z: 66, zone: 'industrial' },
      { x: -140, z: 116, zone: 'industrial' },
      { x: -180, z: 160, zone: 'industrial' },
      { x: -250, z: 186, zone: 'start' },
      { x: -290, z: 192, zone: 'start' },
      { x: -317, z: 207, zone: 'start' },
      { x: -324, z: 232, zone: 'start' },
      { x: -308, z: 254, zone: 'start' },
      { x: -276, z: 261, zone: 'start' },
    ],

    /* Level design: positions are (distance along track, lateral offset),
       lateral > 0 = right side of the driving direction. */
    obstacles: [
      { along: 305, lat: 6.0, type: 'wreck', yaw: 0.5 },
      { along: 472, lat: -5.5, type: 'blocks', yaw: 0.1 },
      { along: 706, lat: 6.3, type: 'rocks' },
      { along: 958, lat: -5.0, type: 'boulder' },
      { along: 1066, lat: 5.4, type: 'boulder' },
      { along: 1172, lat: -6.2, type: 'boulder' },
      { along: 1456, lat: 6.4, type: 'bus', yaw: 0.06 },
      { along: 1738, lat: -6.5, type: 'tanker', yaw: -0.05 },
      { along: 1996, lat: 5.5, type: 'blocks', yaw: -0.15 },
      { along: 2216, lat: -6.0, type: 'tires' },
    ],
    hazards: {
      // explosive barrels (along, lateral)
      barrels: [[150, 10.2], [153, 11.4], [560, -10.4], [563, -11.6], [905, 10.6], [1300, -10.4], [1303, -11.5],
        [1690, 10.3], [2050, -10.2], [2053, -11.4], [2380, 10.5]],
      // oil slicks (along, lateral, radius)
      oil: [[522, 1.5, 4.5], [866, -3, 4], [1880, 2.5, 4.5], [2108, 3, 4]],
      // flame-spewing broken pipes (along, wall side -1 left / +1 right)
      fireJets: [[1800, -1], [1935, 1]],
      // drifted sand that slows you down (along, lateral, radius)
      sand: [[722, -2, 8], [1520, 3, 9]],
    },
    // pickups (along, lateral, type)
    pickups: [
      [90, -4, 'ammo'], [90, 4, 'nitro'], [380, 0, 'health'], [640, -5, 'ammo'], [790, 3.5, 'nitro'],
      [1010, 0, 'health'], [1210, -4, 'ammo'], [1390, 4.5, 'nitro'], [1590, -3, 'health'],
      [1725, 3, 'ammo'], [1910, -3.5, 'nitro'], [2060, 2.5, 'health'], [2290, 0, 'ammo'],
    ],
  };

  // Centripetal Catmull-Rom through a closed loop of points.
  function catmullRomClosed(pts, perSeg) {
    const n = pts.length;
    const out = [];
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const t0 = 0;
      const t1 = t0 + Math.sqrt(Math.hypot(p1.x - p0.x, p1.z - p0.z));
      const t2 = t1 + Math.sqrt(Math.hypot(p2.x - p1.x, p2.z - p1.z));
      const t3 = t2 + Math.sqrt(Math.hypot(p3.x - p2.x, p3.z - p2.z));
      for (let s = 0; s < perSeg; s++) {
        const t = t1 + (t2 - t1) * (s / perSeg);
        const a1x = ((t1 - t) * p0.x + (t - t0) * p1.x) / (t1 - t0);
        const a1z = ((t1 - t) * p0.z + (t - t0) * p1.z) / (t1 - t0);
        const a2x = ((t2 - t) * p1.x + (t - t1) * p2.x) / (t2 - t1);
        const a2z = ((t2 - t) * p1.z + (t - t1) * p2.z) / (t2 - t1);
        const a3x = ((t3 - t) * p2.x + (t - t2) * p3.x) / (t3 - t2);
        const a3z = ((t3 - t) * p2.z + (t - t2) * p3.z) / (t3 - t2);
        const b1x = ((t2 - t) * a1x + (t - t0) * a2x) / (t2 - t0);
        const b1z = ((t2 - t) * a1z + (t - t0) * a2z) / (t2 - t0);
        const b2x = ((t3 - t) * a2x + (t - t1) * a3x) / (t3 - t1);
        const b2z = ((t3 - t) * a2z + (t - t1) * a3z) / (t3 - t1);
        out.push({
          x: ((t2 - t) * b1x + (t - t1) * b2x) / (t2 - t1),
          z: ((t2 - t) * b1z + (t - t1) * b2z) / (t2 - t1),
          zone: p1.zone || 'desert',
        });
      }
    }
    return out;
  }

  class Track {
    constructor(layout, cfg) {
      this.layout = layout;
      this.halfWidth = cfg.halfWidth;
      this.shoulder = cfg.shoulder;
      this.wallDist = cfg.halfWidth + cfg.shoulder;
      this._build(layout);
    }

    _build(layout) {
      const dense = catmullRomClosed(layout.points, 60);
      const n = dense.length;
      const cum = new Float64Array(n + 1);
      for (let i = 0; i < n; i++) {
        const a = dense[i], b = dense[(i + 1) % n];
        cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.z - a.z);
      }
      const total = cum[n];
      const N = Math.round(total / 2);
      const S = total / N;

      // Resample at uniform spacing.
      const xs = new Float64Array(N), zs = new Float64Array(N), zones = new Array(N);
      let j = 0;
      for (let k = 0; k < N; k++) {
        const d = k * S;
        while (j < n - 1 && cum[j + 1] < d) j++;
        const a = dense[j], b = dense[(j + 1) % n];
        const t = (d - cum[j]) / (cum[j + 1] - cum[j] || 1);
        xs[k] = a.x + (b.x - a.x) * t;
        zs[k] = a.z + (b.z - a.z) * t;
        zones[k] = a.zone;
      }

      // Rotate so index 0 sits on the start/finish line.
      let best = 0, bestD = Infinity;
      for (let k = 0; k < N; k++) {
        const d = (xs[k] - layout.start.x) ** 2 + (zs[k] - layout.start.z) ** 2;
        if (d < bestD) { bestD = d; best = k; }
      }

      this.N = N;
      this.spacing = S;
      this.length = total;
      this.px = new Float32Array(N); this.pz = new Float32Array(N);
      this.tx = new Float32Array(N); this.tz = new Float32Array(N);
      this.rx = new Float32Array(N); this.rz = new Float32Array(N);
      this.curv = new Float32Array(N);
      this.dist = new Float32Array(N);
      this.zone = new Array(N);
      for (let k = 0; k < N; k++) {
        const src = (k + best) % N;
        this.px[k] = xs[src]; this.pz[k] = zs[src];
        this.zone[k] = zones[src];
        this.dist[k] = k * S;
      }
      for (let k = 0; k < N; k++) {
        const a = (k - 1 + N) % N, b = (k + 1) % N;
        let dx = this.px[b] - this.px[a], dz = this.pz[b] - this.pz[a];
        const l = Math.hypot(dx, dz) || 1;
        dx /= l; dz /= l;
        this.tx[k] = dx; this.tz[k] = dz;
        this.rx[k] = -dz; this.rz[k] = dx; // right-hand side of the driving direction
      }
      // Signed curvature (positive = left turn), lightly smoothed.
      const raw = new Float32Array(N);
      for (let k = 0; k < N; k++) {
        const a = (k - 1 + N) % N, b = (k + 1) % N;
        const ha = Math.atan2(this.tx[a], this.tz[a]);
        const hb = Math.atan2(this.tx[b], this.tz[b]);
        raw[k] = U.wrapAngle(hb - ha) / (2 * S);
      }
      const R = 4;
      for (let k = 0; k < N; k++) {
        let s = 0;
        for (let o = -R; o <= R; o++) s += raw[(k + o + N) % N];
        this.curv[k] = s / (2 * R + 1);
      }
      // Bounds (for the minimap).
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let k = 0; k < N; k++) {
        minX = Math.min(minX, this.px[k]); maxX = Math.max(maxX, this.px[k]);
        minZ = Math.min(minZ, this.pz[k]); maxZ = Math.max(maxZ, this.pz[k]);
      }
      this.bounds = { minX, maxX, minZ, maxZ };
    }

    index(along) {
      const L = this.length;
      along = ((along % L) + L) % L;
      return Math.floor(along / this.spacing) % this.N;
    }

    _proj(x, z, a, b) {
      const ax = this.px[a], az = this.pz[a];
      const sx = this.px[b] - ax, sz = this.pz[b] - az;
      const l2 = sx * sx + sz * sz || 1;
      let t = ((x - ax) * sx + (z - az) * sz) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const dx = x - (ax + sx * t), dz = z - (az + sz * t);
      this._d2 = dx * dx + dz * dz;
      return t;
    }

    /* Closest point on the centre line. `hint` = previous index for a fast
       local search (pass -1 for a full search). Fills and returns `out`. */
    nearest(x, z, hint, out) {
      const N = this.N, px = this.px, pz = this.pz;
      let best = 0, bestD = Infinity;
      if (hint === undefined || hint < 0) {
        for (let i = 0; i < N; i++) {
          const dx = x - px[i], dz = z - pz[i];
          const d = dx * dx + dz * dz;
          if (d < bestD) { bestD = d; best = i; }
        }
      } else {
        for (let o = -20; o <= 20; o++) {
          const i = (hint + o + N) % N;
          const dx = x - px[i], dz = z - pz[i];
          const d = dx * dx + dz * dz;
          if (d < bestD) { bestD = d; best = i; }
        }
      }
      const iP = (best - 1 + N) % N, iN = (best + 1) % N;
      let a = best, b = iN;
      let t = this._proj(x, z, best, iN);
      const dA = this._d2;
      const t2 = this._proj(x, z, iP, best);
      if (this._d2 < dA) { a = iP; b = best; t = t2; }

      const ax = px[a], az = pz[a];
      const sx = px[b] - ax, sz = pz[b] - az;
      const sl = Math.hypot(sx, sz) || 1;
      const cx = ax + sx * t, cz = az + sz * t;
      const nrx = -sz / sl, nrz = sx / sl;
      let along = this.dist[a] + t * this.spacing;
      if (along >= this.length) along -= this.length;

      let itx = this.tx[a] + (this.tx[b] - this.tx[a]) * t;
      let itz = this.tz[a] + (this.tz[b] - this.tz[a]) * t;
      const il = Math.hypot(itx, itz) || 1;
      itx /= il; itz /= il;

      out.i = best;
      out.along = along;
      out.lateral = (x - cx) * nrx + (z - cz) * nrz;
      out.cx = cx; out.cz = cz;
      out.tx = itx; out.tz = itz;
      out.rx = -itz; out.rz = itx;
      out.zone = this.zone[best];
      out.curv = this.curv[best];
      return out;
    }

    // Interpolated sample at a distance along the track.
    sampleAt(along, out) {
      const L = this.length;
      along = ((along % L) + L) % L;
      const f = along / this.spacing;
      const a = Math.floor(f) % this.N;
      const b = (a + 1) % this.N;
      const t = f - Math.floor(f);
      out.x = this.px[a] + (this.px[b] - this.px[a]) * t;
      out.z = this.pz[a] + (this.pz[b] - this.pz[a]) * t;
      let tx = this.tx[a] + (this.tx[b] - this.tx[a]) * t;
      let tz = this.tz[a] + (this.tz[b] - this.tz[a]) * t;
      const l = Math.hypot(tx, tz) || 1;
      tx /= l; tz /= l;
      out.tx = tx; out.tz = tz;
      out.rx = -tz; out.rz = tx;
      out.curv = this.curv[a] + (this.curv[b] - this.curv[a]) * t;
      out.i = a;
      out.zone = this.zone[a];
      out.heading = Math.atan2(tx, tz);
      return out;
    }

    // World position at (distance along, lateral offset to the right).
    pointAt(along, lateral, out) {
      this.sampleAt(along, out);
      out.x += out.rx * lateral;
      out.z += out.rz * lateral;
      return out;
    }

    curvatureAt(along) { return this.curv[this.index(along)]; }

    // Largest |curvature| between two distances (a0 < a1, may exceed length).
    maxCurvature(a0, a1) {
      let m = 0;
      for (let d = a0; d <= a1; d += this.spacing) {
        const c = Math.abs(this.curv[this.index(d)]);
        if (c > m) m = c;
      }
      return m;
    }

    // Signed shortest distance from a to b along the loop.
    delta(a, b) {
      const L = this.length;
      let d = b - a;
      if (d > L / 2) d -= L;
      else if (d < -L / 2) d += L;
      return d;
    }
  }

  RR.Track = Track;
})();
