/* ==========================================================================
   RUSTBLOOD RALLY - weapons.js
   Machine-gun bullets (tracers with light auto-aim), homing rockets with
   smoke trails, and proximity mines. Projectiles are pooled.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const W = RR.CONFIG.weapons;
  const TR = { i: -1 };
  const P = { x: 0, z: 0 };

  // Does segment (ax,az)->(bx,bz) touch either collision circle of vehicle v?
  function segHitsVehicle(ax, az, bx, bz, v, pad, out) {
    const off = v.stats.length * 0.5 - v.stats.radius;
    const fx = Math.sin(v.h), fz = Math.cos(v.h);
    const r = v.stats.radius + pad;
    const sx = bx - ax, sz = bz - az;
    const l2 = sx * sx + sz * sz || 1e-6;
    for (let k = -1; k <= 1; k += 2) {
      const cx = v.x + fx * off * k, cz = v.z + fz * off * k;
      let t = ((cx - ax) * sx + (cz - az) * sz) / l2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = ax + sx * t, pz = az + sz * t;
      const dx = px - cx, dz = pz - cz;
      if (dx * dx + dz * dz < r * r) {
        if (out) { out.x = px; out.z = pz; out.nx = dx; out.nz = dz; }
        return true;
      }
    }
    return false;
  }
  RR.segHitsVehicle = segHitsVehicle;

  const HIT = { x: 0, z: 0, nx: 0, nz: 0 };

  const Weapons = (RR.Weapons = {
    init(game) {
      this.game = game;
      // bullets
      this.maxB = 500;
      this.nB = 0;
      const f = () => new Float32Array(this.maxB);
      this.b = { x: f(), z: f(), y: f(), vx: f(), vz: f(), life: f(), dmg: f(), ti: new Int32Array(this.maxB) };
      this.bOwner = new Array(this.maxB);

      // rockets
      const rb = new RR.Geo.ModelBuilder();
      const mMetal = new THREE.MeshStandardMaterial({ map: RR.Tex.metal(), roughness: 0.4, metalness: 0.8 });
      const mRed = new THREE.MeshStandardMaterial({ color: 0x9a2a18, roughness: 0.6, metalness: 0.3 });
      const mDark = new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.7, metalness: 0.4 });
      rb.cylZ(mMetal, 0.13, 1.1, 0, 0, 0, 8);
      rb.cone(mRed, 0.13, 0.35, 0, 0, 0.72, Math.PI / 2, 0, 0, 8);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        rb.box(mDark, 0.03, 0.22, 0.3, Math.cos(a) * 0.16, Math.sin(a) * 0.16, -0.45, 0, 0, a);
      }
      const rocketProto = rb.build({ castShadow: true });
      this.rockets = [];
      for (let i = 0; i < 28; i++) {
        const g = rocketProto.clone();
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: RR.Tex.glow(), color: new THREE.Color(3, 1.6, 0.5), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
        }));
        glow.position.set(0, 0, -0.7);
        glow.scale.set(1.4, 1.4, 1.4);
        g.add(glow);
        g.visible = false;
        game.scene.add(g);
        this.rockets.push({ mesh: g, active: false, x: 0, z: 0, y: 1, h: 0, speed: 0, maxSpeed: 0, life: 0, owner: null, target: null, ti: -1, trail: 0 });
      }

      // mines
      const mb = new RR.Geo.ModelBuilder();
      mb.cyl(mDark, 0.55, 0.2, 0, 0.1, 0, 0, 0, 0, 12);
      mb.cyl(mMetal, 0.35, 0.12, 0, 0.24, 0, 0, 0, 0, 10);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        mb.spike(mDark, Math.cos(a) * 0.5, 0.12, Math.sin(a) * 0.5, Math.cos(a), 0.3, Math.sin(a), 0.3, 0.05);
      }
      const mineProto = mb.build({ castShadow: true });
      const lightGeo = new THREE.SphereGeometry(0.1, 8, 6);
      this.mines = [];
      for (let i = 0; i < 30; i++) {
        const g = mineProto.clone();
        const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.1) });
        const light = new THREE.Mesh(lightGeo, lightMat);
        light.position.y = 0.33;
        g.add(light);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({
          map: RR.Tex.glow(), color: new THREE.Color(3, 0.25, 0.08), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true,
        }));
        glow.position.y = 0.4;
        glow.scale.set(1.6, 1.6, 1.6);
        g.add(glow);
        g.visible = false;
        game.scene.add(g);
        this.mines.push({ mesh: g, light, glow, active: false, x: 0, z: 0, vx: 0, vz: 0, arm: 0, life: 0, owner: null, safe: 0 });
      }
    },

    reset() {
      this.nB = 0;
      for (const r of this.rockets) { r.active = false; r.mesh.visible = false; }
      for (const m of this.mines) { m.active = false; m.mesh.visible = false; }
    },

    /* --------------------------------------------------------- targeting */
    findTarget(v, cone, range) {
      let best = null, bestScore = Infinity;
      for (const o of this.game.vehicles) {
        if (o === v || !o.alive || o.hidden) continue;
        const dx = o.x - v.x, dz = o.z - v.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > range * range) continue;
        const a = Math.abs(U.wrapAngle(Math.atan2(dx, dz) - v.h));
        if (a > cone * 1.6) continue;
        const score = a * 2 + Math.sqrt(d2) / range;
        if (score < bestScore) { bestScore = score; best = o; }
      }
      return best;
    },

    /* ------------------------------------------------------------ firing */
    handle(v, dt) {
      v.fireCool -= dt; v.rocketCool -= dt; v.mineCool -= dt;
      if (!v.alive || v.hidden) return;
      const inp = v.input;
      if (inp.fire && v.ammo.mg > 0) {
        let n = 0;
        while (v.fireCool <= 0 && n < 3 && v.ammo.mg > 0) {
          this.fireBullet(v);
          v.fireCool += 1 / W.mg.rate;
          n++;
        }
      } else if (v.fireCool < 0) v.fireCool = 0;
      if (inp.fire && v.ammo.mg <= 0 && v.isPlayer && v.fireCool <= 0) {
        RR.Audio.play('empty', { vol: 0.4 });
        v.fireCool = 0.3;
        this.game.onEmpty('GUNS');
      }
      if (inp.rocket && v.rocketCool <= 0) {
        if (v.ammo.rocket > 0) { this.fireRocket(v); v.rocketCool = W.rocket.cooldown; }
        else if (v.isPlayer) { RR.Audio.play('empty', { vol: 0.4 }); v.rocketCool = 0.4; this.game.onEmpty('ROCKETS'); }
      }
      if (inp.mine && v.mineCool <= 0) {
        if (v.ammo.mine > 0) { this.dropMine(v); v.mineCool = W.mine.cooldown; }
        else if (v.isPlayer) { RR.Audio.play('empty', { vol: 0.4 }); v.mineCool = 0.4; this.game.onEmpty('MINES'); }
      }
    },

    fireBullet(v) {
      if (this.nB >= this.maxB) return;
      v.ammo.mg--;
      const n = v.model.muzzles.length;
      const mi = v.muzzleIdx % n;
      v.muzzleIdx++;
      const mz = v.model.muzzles[mi];
      const c = Math.cos(v.h), s = Math.sin(v.h);
      const wx = v.x + mz.x * c + mz.z * s, wz = v.z - mz.x * s + mz.z * c, wy = mz.y + v.y;
      let ang = v.h;
      const cone = v.isPlayer ? W.mg.aimCone : RR.CONFIG.aiAimCone;
      const t = this.findTarget(v, cone, 85);
      if (t) {
        const dx = t.x - wx, dz = t.z - wz;
        const tt = Math.hypot(dx, dz) / W.mg.speed;
        const aim = Math.atan2(t.x + t.vx * tt - wx, t.z + t.vz * tt - wz);
        ang = v.h + U.clamp(U.wrapAngle(aim - v.h), -cone, cone);
      }
      ang += U.rand(-W.mg.spread, W.mg.spread) * (v.isPlayer ? 1 : 1.9);
      const i = this.nB++;
      const B = this.b;
      B.x[i] = wx; B.z[i] = wz; B.y[i] = Math.max(0.6, wy);
      B.vx[i] = Math.sin(ang) * W.mg.speed + v.vx * 0.5;
      B.vz[i] = Math.cos(ang) * W.mg.speed + v.vz * 0.5;
      B.life[i] = W.mg.life;
      B.dmg[i] = W.mg.damage;
      B.ti[i] = v.tr.i;
      this.bOwner[i] = v;
      v.showMuzzle(mi);
      RR.FX.muzzle(wx, wy, wz, Math.sin(ang), Math.cos(ang), v.vx, v.vz);
      RR.FX.shellCasing(wx, wy, wz, c * Math.sign(mz.x || 1), -s * Math.sign(mz.x || 1), v.vx, v.vz);
      RR.Audio.play(v.isPlayer ? 'gun' : 'gunEnemy', { x: wx, z: wz, vol: v.isPlayer ? 0.42 : 0.5, rate: U.rand(0.9, 1.1) });
      if (v.isPlayer) RR.FX.shake(0.03);
    },

    fireRocket(v) {
      const r = this.rockets.find((q) => !q.active);
      if (!r) return;
      v.ammo.rocket--;
      const pods = v.model.rocketPods;
      const pod = pods[v.podIdx % pods.length];
      v.podIdx++;
      v.toWorld(pod.x, pod.z, P);
      r.active = true;
      r.x = P.x; r.z = P.z; r.y = pod.y + v.y;
      r.h = v.h;
      const fwd = Math.max(0, v.speed);
      r.speed = fwd + 25;
      r.maxSpeed = fwd + W.rocket.speed;
      r.life = W.rocket.life;
      r.owner = v;
      r.target = this.findTarget(v, W.rocket.aimCone, 110);
      r.ti = v.tr.i;
      r.mesh.visible = true;
      r.mesh.position.set(r.x, r.y, r.z);
      r.mesh.rotation.set(0, r.h, 0);
      for (let k = 0; k < 6; k++) RR.FX.exhaustPuff(r.x, r.y, r.z, -Math.sin(r.h), 0.2, -Math.cos(r.h), true);
      RR.FX.add.spawn(r.x, r.y, r.z, 0, 0, 0, 0.1, 2.5, 1, RR.FX.COL.flashHot, RR.FX.COL.fireMid, 1, 0, 0, 0);
      RR.Audio.play('rocket', { x: r.x, z: r.z, vol: v.isPlayer ? 0.7 : 0.6 });
      if (v.isPlayer) RR.FX.shake(0.12);
    },

    dropMine(v) {
      const m = this.mines.find((q) => !q.active);
      if (!m) return;
      v.ammo.mine--;
      v.toWorld(v.model.minePos.x, v.model.minePos.z, P);
      m.active = true;
      m.x = P.x; m.z = P.z;
      m.vx = v.vx * 0.35; m.vz = v.vz * 0.35;
      m.arm = W.mine.arm;
      m.life = W.mine.life;
      m.owner = v;
      m.safe = 1.6;
      m.mesh.visible = true;
      m.mesh.position.set(m.x, 0, m.z);
      m.mesh.rotation.y = Math.random() * 6;
      RR.Audio.play('mineDrop', { x: m.x, z: m.z, vol: 0.6 });
    },

    /* ------------------------------------------------------------ update */
    update(dt) {
      this.updateBullets(dt);
      this.updateRockets(dt);
      this.updateMines(dt);
    },

    removeBullet(i) {
      const last = --this.nB;
      if (i === last) return;
      const B = this.b;
      for (const k in B) B[k][i] = B[k][last];
      this.bOwner[i] = this.bOwner[last];
    },

    updateBullets(dt) {
      const B = this.b, g = this.game, track = g.track;
      const vehicles = g.vehicles;
      let i = 0;
      while (i < this.nB) {
        B.life[i] -= dt;
        const ox = B.x[i], oz = B.z[i];
        const nx = ox + B.vx[i] * dt, nz = oz + B.vz[i] * dt;
        B.x[i] = nx; B.z[i] = nz;
        const owner = this.bOwner[i];
        let hit = false;
        for (let k = 0; k < vehicles.length; k++) {
          const v = vehicles[k];
          if (v === owner || v.hidden) continue;
          const dx = v.x - nx, dz = v.z - nz;
          if (dx * dx + dz * dz > 100) continue;
          if (segHitsVehicle(ox, oz, nx, nz, v, 0.15, HIT)) {
            if (v.alive) v.damage(B.dmg[i], owner, 'bullet');
            const l = Math.hypot(HIT.nx, HIT.nz) || 1;
            RR.FX.bulletImpact(HIT.x, B.y[i], HIT.z, HIT.nx / l, HIT.nz / l, true);
            if (owner && owner.isPlayer) { RR.Audio.play('hitMetal', { vol: 0.35, rate: U.rand(0.9, 1.2) }); g.onPlayerHit(v); }
            else if (v.isPlayer) RR.Audio.play('hitMetal', { vol: 0.45, rate: U.rand(0.7, 0.9) });
            hit = true;
            break;
          }
        }
        if (!hit) {
          const list = RR.World.nearColliders(nx, nz);
          for (let k = 0; k < list.length; k++) {
            const c = list[k];
            if (c.dead) continue;
            const dx = nx - c.x, dz = nz - c.z;
            if (dx * dx + dz * dz < c.r * c.r) {
              if (c.kind === 'barrel') { c.shot = (c.shot || 0) + B.dmg[i]; c.shooter = owner; }
              const l = Math.hypot(dx, dz) || 1;
              RR.FX.bulletImpact(nx, B.y[i], nz, dx / l, dz / l, c.kind !== 'obstacle' || Math.random() < 0.5);
              hit = true;
              break;
            }
          }
        }
        if (!hit) {
          // shoot armed mines
          for (const m of this.mines) {
            if (!m.active || m.arm > 0) continue;
            const dx = nx - m.x, dz = nz - m.z;
            if (dx * dx + dz * dz < 0.7) { m.life = 0; m.detonate = owner; hit = true; break; }
          }
        }
        if (!hit) {
          track.nearest(nx, nz, B.ti[i], TR);
          B.ti[i] = TR.i;
          if (Math.abs(TR.lateral) > track.wallDist + 0.15) {
            RR.FX.bulletImpact(nx, B.y[i], nz, -TR.rx * Math.sign(TR.lateral), -TR.rz * Math.sign(TR.lateral), Math.random() < 0.6);
            hit = true;
          }
        }
        if (hit || B.life[i] <= 0) {
          if (!hit && Math.random() < 0.3) RR.FX.bulletImpact(nx, 0.1, nz, 0, 0, false);
          this.removeBullet(i);
          continue;
        }
        i++;
      }
    },

    updateRockets(dt) {
      const g = this.game, track = g.track;
      for (const r of this.rockets) {
        if (!r.active) continue;
        r.life -= dt;
        const t = r.target;
        if (t && t.alive && !t.hidden) {
          const want = Math.atan2(t.x - r.x, t.z - r.z);
          const diff = U.wrapAngle(want - r.h);
          if (Math.abs(diff) < 1.5) r.h += U.clamp(diff, -W.rocket.turn * dt, W.rocket.turn * dt);
        }
        r.speed = Math.min(r.maxSpeed, r.speed + 110 * dt);
        const ox = r.x, oz = r.z;
        r.x += Math.sin(r.h) * r.speed * dt;
        r.z += Math.cos(r.h) * r.speed * dt;
        // trail
        r.trail += dt * 60;
        while (r.trail >= 1) {
          r.trail -= 1;
          const bx = -Math.sin(r.h), bz = -Math.cos(r.h);
          RR.FX.smoke.spawn(r.x + bx * 0.7, r.y, r.z + bz * 0.7, bx * 2 + U.rand(-0.5, 0.5), U.rand(0.2, 0.8), bz * 2 + U.rand(-0.5, 0.5),
            U.rand(0.8, 1.4), 0.5, 2.6, RR.FX.COL.smokeLight, RR.FX.COL.smokeGrey, 0.5, 0, 1.5, -0.3);
          RR.FX.add.spawn(r.x + bx * 0.6, r.y, r.z + bz * 0.6, bx * 6, 0, bz * 6, 0.07, 0.9, 0.3, RR.FX.COL.fireCore, RR.FX.COL.fireMid, 0.9, 0, 0, 0);
        }
        // collisions
        let hitV = null, boom = false;
        for (const v of g.vehicles) {
          if (v === r.owner || v.hidden) continue;
          if (segHitsVehicle(ox, oz, r.x, r.z, v, 0.45, null)) { hitV = v; boom = true; break; }
        }
        if (!boom) {
          const list = RR.World.nearColliders(r.x, r.z);
          for (const c of list) {
            if (c.dead) continue;
            const dx = r.x - c.x, dz = r.z - c.z;
            if (dx * dx + dz * dz < (c.r + 0.3) * (c.r + 0.3)) { boom = true; break; }
          }
        }
        if (!boom) {
          track.nearest(r.x, r.z, r.ti, TR);
          r.ti = TR.i;
          if (Math.abs(TR.lateral) > track.wallDist + 0.3) boom = true;
        }
        if (boom || r.life <= 0) {
          r.active = false;
          r.mesh.visible = false;
          g.explode(r.x, r.z, { radius: W.rocket.radius, damage: W.rocket.damage, force: W.rocket.force, owner: r.owner, scale: 1, y: r.y, direct: hitV });
          continue;
        }
        r.mesh.position.set(r.x, r.y, r.z);
        r.mesh.rotation.set(0, r.h, 0);
      }
    },

    updateMines(dt) {
      const g = this.game;
      for (const m of this.mines) {
        if (!m.active) continue;
        m.life -= dt; m.arm -= dt; m.safe -= dt;
        const k = Math.exp(-3.5 * dt);
        m.vx *= k; m.vz *= k;
        m.x += m.vx * dt; m.z += m.vz * dt;
        m.mesh.position.set(m.x, 0, m.z);
        const blink = (g.time * (m.arm > 0 ? 2 : 5)) % 1 < 0.5;
        m.light.visible = blink;
        m.glow.visible = blink && m.arm <= 0;
        if (m.arm <= 0 && m.life > 0) {
          for (const v of g.vehicles) {
            if (v.hidden || !v.alive) continue;
            if (v === m.owner && m.safe > 0) continue;
            const dx = v.x - m.x, dz = v.z - m.z;
            const rr = W.mine.trigger + v.stats.radius * 0.6;
            if (dx * dx + dz * dz < rr * rr) { m.life = 0; m.detonate = m.owner; break; }
          }
        }
        if (m.life <= 0) {
          m.active = false;
          m.mesh.visible = false;
          if (m.detonate !== undefined) {
            g.explode(m.x, m.z, { radius: W.mine.radius, damage: W.mine.damage, force: W.mine.force, owner: m.detonate || m.owner, scale: 1.15, y: 0.4, launch: 1.3 });
          } else {
            RR.FX.exhaustPuff(m.x, 0.3, m.z, 0, 1, 0, true);
          }
          m.detonate = undefined;
        }
      }
    },

    // Push tracer quads for all live bullets.
    render() {
      const B = this.b, st = RR.FX.streaks, col = RR.FX.COL.tracer;
      for (let i = 0; i < this.nB; i++) {
        const vx = B.vx[i], vz = B.vz[i];
        const l = Math.hypot(vx, vz) || 1;
        st.add(B.x[i], B.y[i], B.z[i], vx / l, 0, vz / l, 4.2, 0.32, col, 1);
      }
    },
  });
})();
