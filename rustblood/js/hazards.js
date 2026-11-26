/* ==========================================================================
   RUSTBLOOD RALLY - hazards.js
   Environmental hazards: explosive red barrels (shoot them!), oil slicks
   that make cars spin, sand drifts that slow you down, and broken pipes
   that periodically blast flames across the road.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const TR = { i: -1 };

  const Hazards = (RR.Hazards = {
    init(game) {
      this.game = game;
      const track = game.track;
      const H = track.layout.hazards;
      const s = {};
      const scene = game.scene;
      this.pending = [];

      /* ---- explosive barrels */
      const bb = new RR.Geo.ModelBuilder();
      const red = new THREE.MeshStandardMaterial({ map: RR.Tex.paint(0xb02818, 401), roughness: 0.55, metalness: 0.35 });
      const band = new THREE.MeshStandardMaterial({ color: 0xd8b030, roughness: 0.6, metalness: 0.3 });
      bb.cyl(red, 0.45, 1.25, 0, 0.625, 0, 0, 0, 0, 14);
      bb.cyl(band, 0.465, 0.12, 0, 0.35, 0, 0, 0, 0, 14);
      bb.cyl(band, 0.465, 0.12, 0, 0.95, 0, 0, 0, 0, 14);
      bb.cyl(band, 0.2, 0.06, 0, 1.27, 0, 0, 0, 0, 10);
      const proto = bb.build({ castShadow: true });
      this.barrels = [];
      for (const [along, lat] of H.barrels) {
        track.pointAt(along, lat, s);
        const mesh = proto.clone();
        mesh.position.set(s.x, 0, s.z);
        mesh.rotation.y = Math.random() * 6;
        scene.add(mesh);
        const col = RR.World.addCollider(s.x, s.z, 0.6, 'barrel');
        const n = track.nearest(s.x, s.z, -1, {});
        this.barrels.push({ mesh, col, x: s.x, z: s.z, along: n.along, lateral: n.lateral, dead: false, timer: 0 });
      }

      /* ---- oil slicks */
      this.oil = [];
      const oilMat = new THREE.MeshStandardMaterial({
        map: RR.Tex.oil(), transparent: true, depthWrite: false, roughness: 0.08, metalness: 0.5,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      const decalGeo = new THREE.PlaneGeometry(1, 1);
      decalGeo.rotateX(-Math.PI / 2);
      for (const [along, lat, r] of H.oil) {
        track.pointAt(along, lat, s);
        const m = new THREE.Mesh(decalGeo, oilMat);
        m.position.set(s.x, 0.05, s.z);
        m.rotation.y = Math.random() * 6;
        m.scale.set(r * 2.3, 1, r * 1.9);
        m.renderOrder = 1;
        m.receiveShadow = true;
        scene.add(m);
        this.oil.push({ x: s.x, z: s.z, r, along, lateral: lat });
      }

      /* ---- sand drifts */
      this.sand = [];
      const sandMat = new THREE.MeshStandardMaterial({
        map: RR.Tex.drift(), transparent: true, depthWrite: false, roughness: 1,
        polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
      });
      for (const [along, lat, r] of H.sand) {
        track.pointAt(along, lat, s);
        const m = new THREE.Mesh(decalGeo, sandMat);
        m.position.set(s.x, 0.06, s.z);
        m.rotation.y = s.heading + 0.4;
        m.scale.set(r * 2.4, 1, r * 2);
        m.renderOrder = 1;
        m.receiveShadow = true;
        scene.add(m);
        this.sand.push({ x: s.x, z: s.z, r, along, lateral: lat });
      }

      /* ---- flame jets from broken pipes in the wall */
      this.jets = [];
      const pipeB = new RR.Geo.ModelBuilder();
      const rust = new THREE.MeshStandardMaterial({ map: RR.Tex.rust(), roughness: 0.8, metalness: 0.4 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x1c1916, roughness: 0.7, metalness: 0.5 });
      pipeB.cylX(rust, 0.55, 4, 2.2, 1.0, 0, 12);
      pipeB.cylX(dark, 0.62, 0.3, 0.3, 1.0, 0, 12);
      pipeB.cyl(rust, 0.4, 3, 4.0, 1.5, 0, 0, 0, 0, 10);
      pipeB.box(dark, 0.8, 0.8, 1.6, 2.5, 0.4, 0);
      const pipeProto = pipeB.build({ castShadow: true });
      H.fireJets.forEach(([along, side], idx) => {
        track.sampleAt(along, s);
        const wx = s.x + s.rx * side * track.wallDist, wz = s.z + s.rz * side * track.wallDist;
        const mesh = pipeProto.clone();
        mesh.position.set(wx, 0, wz);
        // local +X points away from the track (pipe extends outward)
        mesh.rotation.y = Math.atan2(-s.rz * side, s.rx * side);
        scene.add(mesh);
        this.jets.push({
          along, side, x: wx, z: wz, dx: -s.rx * side, dz: -s.rz * side,
          length: 12.5, state: 'idle', t: 2 + idx * 2.7, mesh,
        });
      });
    },

    reset() {
      for (const b of this.barrels) this.restoreBarrel(b);
      this.pending.length = 0;
      this.jets.forEach((j, i) => { j.state = 'idle'; j.t = 2 + i * 2.7; });
    },

    restoreBarrel(b) {
      b.dead = false;
      b.col.dead = false;
      b.col.shot = 0;
      b.col.hit = null;
      b.mesh.visible = true;
      b.timer = 0;
    },

    explodeBarrel(b, owner) {
      if (b.dead) return;
      b.dead = true;
      b.col.dead = true;
      b.mesh.visible = false;
      b.timer = 25;
      this.game.explode(b.x, b.z, { radius: 8.5, damage: 28, force: 22, owner: owner || null, scale: 1.25, y: 0.8, launch: 1.2 });
    },

    // An explosion nearby sets barrels off (with a short chain delay).
    blast(x, z, radius, owner) {
      for (const b of this.barrels) {
        if (b.dead) continue;
        const d = Math.hypot(b.x - x, b.z - z);
        if (d < radius + 0.5 && d > 0.01) this.pending.push({ b, t: 0.12 + d * 0.02, owner });
      }
    },

    // Dynamic obstacles the AI should steer around.
    aiObstacles(out) {
      for (const b of this.barrels) if (!b.dead) out.push({ along: b.along, lateral: b.lateral, r: 1.2 });
      for (const o of this.oil) out.push({ along: o.along, lateral: o.lateral, r: o.r * 0.8 });
      for (const j of this.jets) {
        if (j.state === 'warn' || j.state === 'active') {
          out.push({ along: j.along, lateral: j.side * (this.game.track.wallDist - 6), r: 7.5 });
        }
      }
    },

    update(dt) {
      const g = this.game, track = g.track;
      // barrels
      for (const b of this.barrels) {
        if (b.dead) {
          b.timer -= dt;
          if (b.timer <= 0) this.restoreBarrel(b);
          continue;
        }
        if (b.col.hit) { this.explodeBarrel(b, null); continue; }
        if (b.col.shot >= 8) this.explodeBarrel(b, b.col.shooter);
      }
      for (let i = this.pending.length - 1; i >= 0; i--) {
        const p = this.pending[i];
        p.t -= dt;
        if (p.t <= 0) { this.pending.splice(i, 1); this.explodeBarrel(p.b, p.owner); }
      }
      // oil + sand
      for (const v of g.vehicles) {
        if (!v.alive || v.hidden) continue;
        for (const o of this.oil) {
          const dx = v.x - o.x, dz = v.z - o.z;
          if (dx * dx + dz * dz < o.r * o.r * 0.8) {
            if (v.oilTimer <= 0.2) g.onOil(v);
            v.oilTimer = 1.1;
          }
        }
        for (const sd of this.sand) {
          const dx = v.x - sd.x, dz = v.z - sd.z;
          if (dx * dx + dz * dz < sd.r * sd.r * 0.8) v.sandTimer = 0.25;
        }
      }
      // flame jets
      for (const j of this.jets) {
        j.t -= dt;
        if (j.t <= 0) {
          if (j.state === 'idle') { j.state = 'warn'; j.t = 1.4; RR.Audio.play('hiss', { x: j.x, z: j.z, vol: 0.6 }); }
          else if (j.state === 'warn') { j.state = 'active'; j.t = 2.3; RR.Audio.play('flame', { x: j.x, z: j.z, vol: 0.9 }); }
          else { j.state = 'idle'; j.t = 3.6; }
        }
        const near = g.camFocus && Math.hypot(g.camFocus.x - j.x, g.camFocus.z - j.z) < 170;
        if (j.state === 'warn' && near) {
          if (Math.random() < dt * 30) RR.FX.fire(j.x + j.dx * 0.8, 1.0, j.z + j.dz * 0.8, 0.5, j.dx * 3, j.dz * 3);
          if (Math.random() < dt * 10) RR.FX.sparks(j.x + j.dx, 1.0, j.z + j.dz, j.dx, 0.3, j.dz, 2, 8);
        } else if (j.state === 'active') {
          if (near) {
            for (let k = 0; k < 6; k++) {
              const s = U.rand(18, 30);
              RR.FX.add.spawn(j.x + j.dx * 0.6, 1.0, j.z + j.dz * 0.6,
                j.dx * s + U.rand(-2, 2), U.rand(0, 2.5), j.dz * s + U.rand(-2, 2),
                U.rand(0.3, 0.5), U.rand(1.2, 2), U.rand(3.5, 5.5), RR.FX.COL.fireCore, RR.FX.COL.fireEnd, 0.9, 0, 2.2, -2);
            }
            if (Math.random() < dt * 8) RR.FX.damageSmoke(j.x + j.dx * 10, 3, j.z + j.dz * 10, true, 0, 0);
          }
          for (const v of g.vehicles) {
            if (!v.alive || v.hidden) continue;
            // position relative to the jet axis
            const rx = v.x - j.x, rz = v.z - j.z;
            const along = rx * j.dx + rz * j.dz;
            const across = Math.abs(-rx * j.dz + rz * j.dx);
            if (along > 0 && along < j.length && across < 2.6) {
              v.damage(32 * dt, null, 'fire');
              v.burnTimer = 1.4;
              if (v.isPlayer) g.onBurn(v);
            }
          }
        }
      }
      // burning cars keep smoking for a moment
      for (const v of g.vehicles) {
        if (v.burnTimer > 0) {
          v.burnTimer -= dt;
          if (!v.hidden && Math.random() < dt * 25) RR.FX.fire(v.x + U.rand(-0.8, 0.8), 1.2, v.z + U.rand(-0.8, 0.8), 0.7, v.vx, v.vz);
        }
      }
      void track; void TR;
    },
  });
})();
