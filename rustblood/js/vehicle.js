/* ==========================================================================
   RUSTBLOOD RALLY - vehicle.js
   A war machine: arcade driving physics (grip, drifting, nitro, reverse),
   collisions with walls / obstacles / other cars, damage, parts flying off,
   burning wrecks, visual body motion and per-car effects + engine sound.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const CFG = RR.CONFIG;
  const W = CFG.weapons;
  const CHAR = new THREE.Color(0x1b1612);
  const SURF = { speed: 1, drag: 0, grip: 1 };
  let wreckMat = null;

  class Vehicle {
    constructor(game, opts) {
      this.game = game;
      this.id = opts.id;
      this.type = opts.type;
      this.name = opts.name;
      this.isPlayer = !!opts.isPlayer;
      this.uiColor = opts.uiColor;
      this.stats = Object.assign({}, CFG.vehicles[opts.type]);
      this.model = RR.Models.build(opts.type, {
        paint: opts.paint, accent: opts.accent, seed: opts.seed, number: opts.number, css: opts.uiColor,
      });
      this.root = this.model.root;
      this.body = this.model.body;
      game.scene.add(this.root);
      this.parts = this.model.detachables.map((obj) => ({ obj, attached: true }));
      this.rearWheels = this.model.wheels.filter((w) => !w.front);
      this.input = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false, fire: false, rocket: false, mine: false };
      this.tr = { i: -1, along: 0, lateral: 0, rx: 1, rz: 0, tx: 0, tz: 1 };
      this.speedMul = 1;
      this.engineSnd = null;
      this.reset();
    }

    // Full reset for a new race.
    reset() {
      this.x = 0; this.z = 0; this.h = 0;
      this.ammo = { mg: W.mg.start, rocket: W.rocket.start, mine: W.mine.start };
      this.nitro = 0.5;
      this.progress = 0; this.finished = false; this.finishTime = 0;
      this.lap = 1; this.lapStart = 0; this.bestLap = Infinity; this.lapTimes = [];
      this.position = 1;
      this.kills = 0; this.deaths = 0; this.damageDealt = 0;
      this.lastAttacker = null; this.lastAttackTime = -99;
      this.fireCool = 0; this.rocketCool = 0; this.mineCool = 0;
      this.muzzleIdx = 0; this.podIdx = 0; this.flashT = 0;
      this.wrongWayT = 0;
      this.invuln = 0;
      this.speedMul = 1;
      this.revive();
    }

    // Bring the car back to full health (keeps race progress and stats).
    revive() {
      this.vx = 0; this.vz = 0; this.av = 0;
      this.y = 0; this.vy = 0;
      this.pitch = 0; this.roll = 0; this.tiltX = 0; this.tiltZ = 0;
      this.speed = 0; this.prevSpeed = 0; this.lat = 0;
      this.maxHealth = this.stats.health;
      this.health = this.maxHealth;
      this.alive = true;
      this.respawnTimer = 0;
      this.nitro = Math.max(this.nitro, 0.35);
      this.nitroActive = false;
      this.boostTimer = 0;
      this.spinTimer = 0;
      this.ammo.mg = Math.max(this.ammo.mg, W.mg.start);
      this.ammo.rocket = Math.max(this.ammo.rocket, W.rocket.start);
      this.ammo.mine = Math.max(this.ammo.mine, W.mine.start);
      this.flash = 0; this._flashOn = true;
      this.oilTimer = 0; this.sandTimer = 0; this.burnTimer = 0;
      this.drifting = false; this.offroad = false;
      this.skidLast = [null, null];
      this.steerVis = 0;
      this.fxAcc = { dust: 0, smoke: 0, fire: 0, exhaust: 0, tire: 0 };
      this.hidden = false;
      this.landed = 0;
      for (const p of this.parts) { p.obj.visible = true; p.attached = true; }
      this.root.visible = true;
      this.body.visible = true;
      this.applyDamageLook();
      for (const f of this.model.flashes) f.visible = false;
    }

    /* ------------------------------------------------------ placement */
    placeOnTrack(along, lateral, speed) {
      const track = this.game.track;
      const s = track.pointAt(along, lateral, {});
      this.x = s.x; this.z = s.z; this.h = s.heading;
      const v = speed || 0;
      this.vx = Math.sin(this.h) * v; this.vz = Math.cos(this.h) * v;
      this.av = 0; this.y = 0; this.vy = 0;
      this.tr.i = -1;
      track.nearest(this.x, this.z, -1, this.tr);
      this.skidLast[0] = this.skidLast[1] = null;
      this.syncVisual(0);
    }

    // local car coordinates -> world (x, z)
    toWorld(lx, lz, out) {
      const c = Math.cos(this.h), s = Math.sin(this.h);
      out.x = this.x + lx * c + lz * s;
      out.z = this.z - lx * s + lz * c;
      return out;
    }

    /* -------------------------------------------------------- physics */
    surfaceMods() {
      const W2 = this.game.track.halfWidth;
      SURF.speed = 1; SURF.drag = 0; SURF.grip = 1;
      this.offroad = Math.abs(this.tr.lateral) > W2 + 0.6;
      if (this.offroad) { SURF.speed = 0.88; SURF.drag = 0.15; SURF.grip = 0.9; }
      if (this.sandTimer > 0) { SURF.speed = Math.min(SURF.speed, 0.62); SURF.drag = Math.max(SURF.drag, 0.7); }
      return SURF;
    }

    physics(dt) {
      const s = this.stats, inp = this.input, N = CFG.nitro;
      this.spinTimer = Math.max(0, this.spinTimer - dt);
      this.oilTimer = Math.max(0, this.oilTimer - dt);
      this.sandTimer = Math.max(0, this.sandTimer - dt);
      this.boostTimer = Math.max(0, this.boostTimer - dt);

      if (!this.alive) {
        const k = Math.exp(-2.2 * dt);
        this.vx *= k; this.vz *= k;
        this.av *= Math.exp(-2.5 * dt);
        this.h += this.av * dt;
        this.x += this.vx * dt; this.z += this.vz * dt;
        this.vertical(dt);
        return;
      }
      const airborne = this.y > 0.45;
      let sh = Math.sin(this.h), ch = Math.cos(this.h);
      let vF = this.vx * sh + this.vz * ch;
      const spdAbs = Math.abs(vF);

      // steering -> yaw rate
      const authority = Math.min(1, spdAbs / 6) * (1 - 0.55 * Math.min(1, spdAbs / s.maxSpeed));
      let turn = s.turnRate * authority * (inp.handbrake ? 1.2 : 1);
      if (airborne) turn *= 0.15;
      const dir = vF >= -0.5 ? 1 : -1;
      const targetAV = -inp.steer * turn * dir;
      const resp = this.spinTimer > 0 ? 2.2 : 12;
      this.av += (targetAV - this.av) * Math.min(1, resp * dt);
      const dh = this.av * dt;
      this.h += dh;

      // velocity partly follows the nose (arcade grip); less while drifting
      const follow = airborne ? 0 : this.oilTimer > 0 || this.spinTimer > 0 ? 0.1 : inp.handbrake ? 0.38 : 0.72;
      if (follow > 0) {
        const a = dh * follow, ca = Math.cos(a), sa = Math.sin(a);
        const nvx = this.vx * ca + this.vz * sa;
        const nvz = this.vz * ca - this.vx * sa;
        this.vx = nvx; this.vz = nvz;
      }
      sh = Math.sin(this.h); ch = Math.cos(this.h);
      const fx = sh, fz = ch, rx = -ch, rz = sh;
      vF = this.vx * fx + this.vz * fz;
      let vR = this.vx * rx + this.vz * rz;

      const surf = this.surfaceMods();
      let maxSpd = s.maxSpeed * this.speedMul * surf.speed;
      let accel = s.accel;
      const nitroOn = inp.nitro && this.nitro > 0.02 && vF > -1 && !airborne;
      this.nitroActive = nitroOn;
      if (nitroOn) {
        maxSpd *= N.speedMul; accel *= N.accelMul;
        this.nitro = Math.max(0, this.nitro - N.burn * dt);
      }
      if (this.boostTimer > 0) { maxSpd *= 1.2; accel *= 1.8; }

      if (!airborne) {
        if (inp.throttle > 0) {
          if (vF < -0.5) vF += s.brake * dt;
          else if (vF < maxSpd) vF += accel * inp.throttle * Math.max(0.22, 1 - (vF / maxSpd) * 0.78) * dt;
        } else if (inp.brake > 0) {
          if (vF > 0.5) vF -= s.brake * inp.brake * dt;
          else if (vF > -s.maxReverse) vF -= s.reverseAccel * inp.brake * dt;
        } else {
          vF -= vF * 0.45 * dt + Math.sign(vF) * Math.min(Math.abs(vF), 1.2 * dt);
        }
        if (vF > maxSpd) vF -= (vF - maxSpd) * Math.min(1, 2.2 * dt);
        vF -= vF * surf.drag * dt;
        if (inp.handbrake) vF -= vF * 0.3 * dt;
        let grip = (inp.handbrake ? s.driftGrip : s.grip) * surf.grip;
        if (this.oilTimer > 0) grip *= 0.12;
        if (this.spinTimer > 0) grip *= 0.35;
        // keep drifts controllable: extra grip when sliding too far sideways
        else if (Math.abs(vR) > Math.abs(vF) * 0.75 + 4) grip += 4;
        vR *= Math.exp(-grip * dt);
      }
      this.vx = fx * vF + rx * vR;
      this.vz = fz * vF + rz * vR;
      this.x += this.vx * dt;
      this.z += this.vz * dt;
      this.speed = vF;
      this.lat = vR;
      this.drifting = !airborne && Math.abs(vR) > 3.2 && spdAbs > 7;
      if (!nitroOn) this.nitro = Math.min(1, this.nitro + (N.regen + (this.drifting ? N.driftRegen : 0)) * dt);
      this.vertical(dt);
    }

    vertical(dt) {
      if (this.y > 0 || this.vy !== 0) {
        this.vy -= 32 * dt;
        this.y += this.vy * dt;
        if (this.y <= 0) {
          this.y = 0;
          if (this.vy < -7) {
            const v = -this.vy;
            this.vy = v * 0.3;
            this.landed = v;
          } else this.vy = 0;
        }
      }
    }

    /* ---------------------------------------------------- collisions */
    collideWalls() {
      const track = this.game.track, tr = this.tr;
      const prevAlong = tr.along;
      track.nearest(this.x, this.z, tr.i, tr);
      if (tr.i >= 0 && this.tracked) this.progress += track.delta(prevAlong, tr.along);
      this.tracked = true;
      const s = this.stats;
      const off = s.length * 0.5 - s.radius;
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      const limit = track.wallDist - s.radius;
      const across = fx * tr.rx + fz * tr.rz;
      for (let k = -1; k <= 1; k += 2) {
        const latC = tr.lateral + k * off * across;
        if (Math.abs(latC) > limit) {
          const sg = latC > 0 ? 1 : -1;
          const nx = tr.rx * sg, nz = tr.rz * sg;
          const pen = Math.abs(latC) - limit;
          this.x -= nx * pen; this.z -= nz * pen;
          tr.lateral -= sg * pen;
          const px = this.x + fx * off * k + nx * s.radius;
          const pz = this.z + fz * off * k + nz * s.radius;
          this.hitStatic(px, pz, nx, nz, 'wall');
          // steer the nose along the wall so the car slides instead of sticking
          if (this.alive && this.speed > 5) {
            const wallH = Math.atan2(tr.tx, tr.tz);
            const diff = U.wrapAngle(wallH - this.h);
            if (Math.abs(diff) < 1.2) this.av += diff * 0.9;
          }
        }
      }
    }

    collideStatics() {
      const list = RR.World.nearColliders(this.x, this.z);
      if (!list.length) return;
      const s = this.stats, off = s.length * 0.5 - s.radius;
      const fx = Math.sin(this.h), fz = Math.cos(this.h);
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.dead) continue;
        for (let k = -1; k <= 1; k += 2) {
          const cx = this.x + fx * off * k, cz = this.z + fz * off * k;
          const dx = cx - c.x, dz = cz - c.z;
          const d2 = dx * dx + dz * dz, rr = s.radius + c.r;
          if (d2 < rr * rr && d2 > 1e-6) {
            const d = Math.sqrt(d2);
            const nx = -dx / d, nz = -dz / d;
            const pen = rr - d;
            this.x -= nx * pen; this.z -= nz * pen;
            this.hitStatic(cx + nx * s.radius, cz + nz * s.radius, nx, nz, c.kind);
            if (c.kind === 'barrel') c.hit = this;
          }
        }
      }
    }

    // Impulse against an immovable surface; n points from the car into it.
    hitStatic(px, pz, nx, nz, kind) {
      const rx = px - this.x, rz = pz - this.z;
      const vpx = this.vx + this.av * rz, vpz = this.vz - this.av * rx;
      const vn = vpx * nx + vpz * nz;
      if (vn <= 0) return;
      const m = this.stats.mass, I = m * this.stats.inertia;
      const rn = rz * nx - rx * nz;
      const J = (1.18 * vn) / (1 / m + (rn * rn) / I);
      this.vx -= (J * nx) / m; this.vz -= (J * nz) / m;
      this.av -= ((J * rn) / I) * 0.25;
      const tx = -nz, tz = nx;
      const vt = this.vx * tx + this.vz * tz;
      const fr = Math.min(Math.abs(vt), (J * 0.1) / m) * Math.sign(vt);
      this.vx -= tx * fr; this.vz -= tz * fr;
      if (vn > 4.5) {
        // crash damage: ignores glancing hits, capped, one crash per cooldown
        const C = CFG.crash;
        const t = this.game.time;
        if (kind !== 'barrel' && vn > C.minSpeed && t > (this.crashT || 0)) {
          this.crashT = t + C.cooldown;
          this.damage(Math.min(C.max, (vn - C.minSpeed) * C.perMs), null, 'crash');
        }
        RR.FX.sparks(px, 0.7, pz, -nx, 0.25, -nz, Math.min(22, 4 + Math.floor(vn)), 11);
        this.game.onImpact(this, px, pz, vn, kind);
      } else if (Math.abs(vt) > 9 && Math.random() < 0.5) {
        RR.FX.sparks(px, 0.6, pz, tx * Math.sign(vt), 0.3, tz * Math.sign(vt), 2, 8);
        this.scrapeT = 0.15;
      }
    }

    static collide(A, B) {
      if (A.hidden || B.hidden) return;
      const dx0 = B.x - A.x, dz0 = B.z - A.z;
      const maxR = (A.stats.length + B.stats.length) * 0.5 + 0.6;
      if (dx0 * dx0 + dz0 * dz0 > maxR * maxR) return;
      const aoff = A.stats.length * 0.5 - A.stats.radius, boff = B.stats.length * 0.5 - B.stats.radius;
      const afx = Math.sin(A.h), afz = Math.cos(A.h), bfx = Math.sin(B.h), bfz = Math.cos(B.h);
      const rr = A.stats.radius + B.stats.radius;
      let best = 0, nx = 0, nz = 0, px = 0, pz = 0;
      for (let ka = -1; ka <= 1; ka += 2) {
        const ax = A.x + afx * aoff * ka, az = A.z + afz * aoff * ka;
        for (let kb = -1; kb <= 1; kb += 2) {
          const bx = B.x + bfx * boff * kb, bz = B.z + bfz * boff * kb;
          const dx = bx - ax, dz = bz - az;
          const d2 = dx * dx + dz * dz;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 0.001;
            const pen = rr - d;
            if (pen > best) {
              best = pen; nx = dx / d; nz = dz / d;
              px = ax + nx * A.stats.radius; pz = az + nz * A.stats.radius;
            }
          }
        }
      }
      if (best <= 0) return;
      const mA = A.stats.mass, mB = B.stats.mass, tot = mA + mB;
      A.x -= nx * best * (mB / tot); A.z -= nz * best * (mB / tot);
      B.x += nx * best * (mA / tot); B.z += nz * best * (mA / tot);
      const rax = px - A.x, raz = pz - A.z, rbx = px - B.x, rbz = pz - B.z;
      const vax = A.vx + A.av * raz, vaz = A.vz - A.av * rax;
      const vbx = B.vx + B.av * rbz, vbz = B.vz - B.av * rbx;
      const vrel = (vbx - vax) * nx + (vbz - vaz) * nz;
      if (vrel >= 0) return;
      const IA = mA * A.stats.inertia, IB = mB * B.stats.inertia;
      const ran = raz * nx - rax * nz, rbn = rbz * nx - rbx * nz;
      const J = (-(1.35) * vrel) / (1 / mA + 1 / mB + (ran * ran) / IA + (rbn * rbn) / IB);
      A.vx -= (J * nx) / mA; A.vz -= (J * nz) / mA; A.av -= ((J * ran) / IA) * 0.5;
      B.vx += (J * nx) / mB; B.vz += (J * nz) / mB; B.av += ((J * rbn) / IB) * 0.5;
      const impact = -vrel;
      if (impact > 3.5) {
        const base = Math.min(14, (impact - 3.5) * 0.8);
        const aFront = (px - A.x) * afx + (pz - A.z) * afz > aoff * 0.4;
        const bFront = (px - B.x) * bfx + (pz - B.z) * bfz > boff * 0.4;
        const toA = base * Math.sqrt(mB / mA) * (bFront ? B.stats.ram : 1) * (aFront ? 0.75 : 1);
        const toB = base * Math.sqrt(mA / mB) * (aFront ? A.stats.ram : 1) * (bFront ? 0.75 : 1);
        // hitting a burning wreck counts as a crash (capped), not a ram
        const C = CFG.crash, t = A.game.time;
        const hit = (V, dmg, other) => {
          if (!V.alive) return;
          if (other.alive) { V.damage(dmg, other, 'ram'); return; }
          if (impact > C.minSpeed && t > (V.crashT || 0)) {
            V.crashT = t + C.cooldown;
            V.damage(Math.min(C.max, (impact - C.minSpeed) * C.perMs), null, 'crash');
          }
        };
        hit(A, toA, B);
        hit(B, toB, A);
        if (impact > 11) {
          if (mA <= mB) A.spinTimer = 0.35; else B.spinTimer = 0.35;
        }
        RR.FX.sparks(px, 0.8, pz, 0, 0.5, 0, Math.min(26, 6 + Math.floor(impact)), 12);
        A.game.onImpact(A, px, pz, impact, 'car', B);
      }
    }

    /* -------------------------------------------------------- damage */
    damage(amount, source, kind) {
      if (!this.alive || amount <= 0 || this.invuln > 0) return;
      const g = this.game;
      if (this.isPlayer) {
        if (source && !source.isPlayer) amount *= CFG.aiDamageToPlayer;
        else if (!source && kind === 'explosion') amount *= CFG.envBlastToPlayer;
        if (this.health < this.maxHealth * CFG.mercyBelow) amount *= CFG.mercyFactor;
        if (g.godMode) amount = 0;
      }
      this.health -= amount;
      this.flash = Math.min(1, this.flash + amount * 0.045 + 0.12);
      if (source && source !== this) {
        this.lastAttacker = source;
        this.lastAttackTime = g.time;
        source.damageDealt += amount;
      }
      g.onDamage(this, amount, source, kind);
      this.applyDamageLook();
      const ratio = this.health / this.maxHealth;
      const thresholds = [0.72, 0.48, 0.26];
      for (let i = 0; i < this.parts.length; i++) {
        if (this.parts[i].attached && ratio < thresholds[i]) this.detachPart(this.parts[i], 1);
      }
      if (this.health <= 0) this.destroy(kind);
    }

    heal(amount) {
      this.health = Math.min(this.maxHealth, this.health + amount);
      this.applyDamageLook();
    }

    applyDamageLook() {
      const dmg = this.alive ? 1 - this.health / this.maxHealth : 1;
      const k = this.alive ? dmg * dmg * 0.6 : 0.88;
      for (const m of this.model.mats.damageable) m.color.copy(m.userData.baseColor).lerp(CHAR, k);
    }

    detachPart(p, force) {
      p.attached = false;
      this.root.updateMatrixWorld(true);
      const c = p.obj.clone();
      p.obj.matrixWorld.decompose(c.position, c.quaternion, c.scale);
      p.obj.visible = false;
      const a = Math.random() * Math.PI * 2;
      RR.FX.flyPart(c, this.vx * 0.5 + Math.cos(a) * 5 * force, 5 + Math.random() * 6 * force, this.vz * 0.5 + Math.sin(a) * 5 * force);
      RR.FX.sparks(c.position.x, c.position.y, c.position.z, 0, 1, 0, 10, 8);
    }

    destroy(kind) {
      const g = this.game;
      this.health = 0;
      this.alive = false;
      const killer = this.lastAttacker && g.time - this.lastAttackTime < 4.5 && this.lastAttacker !== this ? this.lastAttacker : null;
      this.deaths++;
      if (killer) killer.kills++;
      for (const p of this.parts) if (p.attached) this.detachPart(p, 2);
      this.vy = 10; this.y = Math.max(this.y, 0.05);
      this.av += U.rand(-5, 5);
      this.tiltX = U.rand(-0.4, 0.4); this.tiltZ = U.rand(-0.5, 0.5);
      this.respawnTimer = CFG.respawnDelay;
      this.applyDamageLook();
      for (const f of this.model.flashes) f.visible = false;
      g.explode(this.x, this.z, { radius: 8, damage: 12, force: 16, owner: killer, scale: 1.5, y: 1.2, exclude: this, big: true });
      g.onDestroyed(this, killer, kind);
    }

    // Leave a charred burning copy of the body behind (used when respawning).
    makeWreckCopy() {
      if (!wreckMat) wreckMat = new THREE.MeshStandardMaterial({ map: RR.Tex.rust(), color: 0x2a221d, roughness: 0.95, metalness: 0.3 });
      const c = this.body.clone();
      c.traverse((o) => {
        if (o.isSprite) o.visible = false;
        if (o.isMesh) o.material = wreckMat;
      });
      const g = new THREE.Group();
      g.add(c);
      g.position.set(this.x, 0, this.z);
      g.rotation.y = this.h;
      c.position.y = -0.25;
      c.rotation.set(U.rand(-0.15, 0.15), 0, U.rand(-0.2, 0.2));
      return g;
    }

    /* ------------------------------------------------------- visuals */
    syncVisual(dt) {
      this.root.position.set(this.x, 0, this.z);
      this.root.rotation.y = this.h;
      if (dt > 0) {
        const accF = (this.speed - this.prevSpeed) / dt;
        this.prevSpeed = this.speed;
        const tp = U.clamp(-accF * 0.0035, -0.07, 0.08);
        const trl = U.clamp(this.av * this.speed * 0.0032, -0.09, 0.09);
        this.pitch = U.damp(this.pitch, tp, 7, dt);
        this.roll = U.damp(this.roll, trl, 6, dt);
        if (this.alive) { this.tiltX *= Math.exp(-3 * dt); this.tiltZ *= Math.exp(-3 * dt); }
        this.steerVis = U.damp(this.steerVis, this.alive ? -this.input.steer * 0.45 : 0, 12, dt);
      }
      const bump = this.offroad && this.alive ? Math.sin(this.game.time * 38 + this.id * 3) * 0.025 * Math.min(1, Math.abs(this.speed) / 20) : 0;
      this.body.position.y = this.y + bump;
      this.body.rotation.set(this.pitch + this.tiltX, 0, this.roll + this.tiltZ);
      const spin = this.speed * dt;
      for (const w of this.model.wheels) {
        w.spin.rotation.x += spin / w.r;
        if (w.front) w.pivot.rotation.y = this.steerVis;
        w.pivot.position.y = w.r + this.y * 0.85;
      }
      // damage flash / respawn shimmer
      let f = this.flash;
      if (this.invuln > 0) f = Math.max(f, 0.35 + Math.sin(this.game.time * 25) * 0.35);
      if (f > 0.002 || this._flashOn) {
        for (const m of this.model.mats.damageable) m.emissive.setRGB(f * 1.3, f * 0.55, f * 0.35);
        this._flashOn = f > 0.002;
      }
      this.flash = Math.max(0, this.flash - dt * 5);
      // muzzle flash sprites
      if (this.flashT > 0) {
        this.flashT -= dt;
        if (this.flashT <= 0) for (const s of this.model.flashes) s.visible = false;
      }
    }

    showMuzzle(i) {
      const s = this.model.flashes[i];
      if (!s) return;
      s.visible = true;
      const k = U.rand(1.0, 1.7);
      s.scale.set(k, k, k);
      s.material.rotation = Math.random() * 6;
      this.flashT = 0.05;
    }

    /* ------------------------------------------------- particle FX */
    emitEffects(dt) {
      if (this.hidden) return;
      const FX = RR.FX;
      const spd = Math.abs(this.speed);
      const p = this._p || (this._p = { x: 0, z: 0 });
      const t = this.game.time;
      if (this.landed) {
        for (let i = 0; i < 8; i++) FX.dust(this.x, this.z, this.vx, this.vz, 2.2, 0.5, true);
        this.landed = 0;
      }
      if (this.alive) {
        // dust behind the rear wheels
        const dustRate = (this.offroad ? 1.1 : 0.22) * Math.min(1, spd / 25) + (this.drifting ? 0.5 : 0) + (this.sandTimer > 0 ? 1.4 : 0);
        this.fxAcc.dust += dustRate * dt * 28;
        while (this.fxAcc.dust >= 1) {
          this.fxAcc.dust -= 1;
          const w = this.rearWheels[(Math.random() * this.rearWheels.length) | 0];
          this.toWorld(w.x * 1.05, w.z - 0.3, p);
          FX.dust(p.x, p.z, this.vx, this.vz, 1.1 + spd * 0.025, this.offroad || this.sandTimer > 0 ? 0.42 : 0.24, this.offroad);
        }
        // drift smoke + skid marks
        const skidding = this.drifting || (this.input.handbrake && spd > 8) || (this.input.brake > 0 && this.speed > 14);
        if (skidding && !this.offroad && this.y < 0.3) {
          this.fxAcc.tire += dt * (this.drifting ? 26 : 12);
          while (this.fxAcc.tire >= 1) {
            this.fxAcc.tire -= 1;
            const w = this.rearWheels[(Math.random() * this.rearWheels.length) | 0];
            this.toWorld(w.x, w.z, p);
            FX.tireSmoke(p.x, p.z, this.vx, this.vz);
          }
          for (let i = 0; i < 2 && i < this.rearWheels.length; i++) {
            const w = this.rearWheels[i];
            this.toWorld(w.x, w.z, p);
            const last = this.skidLast[i];
            if (last) {
              const d = Math.hypot(p.x - last.x, p.z - last.z);
              if (d > 0.6) {
                FX.skids.add(last.x, last.z, p.x, p.z, 0.5, t, this.drifting ? 0.9 : 0.6);
                last.x = p.x; last.z = p.z;
              }
            } else this.skidLast[i] = { x: p.x, z: p.z };
          }
        } else {
          this.skidLast[0] = this.skidLast[1] = null;
        }
        // nitro flames + exhaust
        const c = Math.cos(this.h), s = Math.sin(this.h);
        for (const ex of this.model.exhausts) {
          const wx = this.x + ex.pos.x * c + ex.pos.z * s, wz = this.z - ex.pos.x * s + ex.pos.z * c;
          const dx = ex.dir.x * c + ex.dir.z * s, dz = -ex.dir.x * s + ex.dir.z * c;
          if (this.nitroActive || this.boostTimer > 0) {
            FX.nitroFlame(wx, ex.pos.y + this.y, wz, dx, ex.dir.y, dz, this.vx, this.vz);
          } else if (this.input.throttle > 0 && Math.random() < dt * 8) {
            FX.exhaustPuff(wx, ex.pos.y + this.y, wz, dx, ex.dir.y, dz, false);
          }
        }
        // damage smoke and fire from the engine
        const ratio = this.health / this.maxHealth;
        if (ratio < 0.5) {
          this.toWorld(this.model.enginePos.x, this.model.enginePos.z, p);
          this.fxAcc.smoke += dt * (ratio < 0.25 ? 20 : 9);
          while (this.fxAcc.smoke >= 1) {
            this.fxAcc.smoke -= 1;
            FX.damageSmoke(p.x, this.model.enginePos.y + this.y + 0.3, p.z, ratio < 0.25, this.vx, this.vz);
          }
          if (ratio < 0.25) {
            this.fxAcc.fire += dt * 22;
            while (this.fxAcc.fire >= 1) { this.fxAcc.fire -= 1; FX.fire(p.x, this.model.enginePos.y + this.y, p.z, 0.8, this.vx, this.vz); }
            if (Math.random() < dt * 3) FX.sparks(p.x, this.model.enginePos.y + 0.5, p.z, 0, 1, 0, 3, 5);
          }
        }
      } else {
        // burning wreck
        this.fxAcc.fire += dt * 22;
        while (this.fxAcc.fire >= 1) {
          this.fxAcc.fire -= 1;
          FX.fire(this.x + U.rand(-1, 1), 1.0 + this.y, this.z + U.rand(-1, 1), 1.15, this.vx, this.vz);
          if (Math.random() < 0.4) FX.damageSmoke(this.x, 2 + this.y, this.z, true, this.vx, this.vz);
        }
      }
    }

    /* ---------------------------------------------------- engine sound */
    updateAudio(listenerX, listenerZ, playerFocus) {
      if (!this.engineSnd) return;
      const spd = Math.abs(this.speed);
      const gears = [0, 11, 21, 31, 41, 80];
      let g = 0;
      while (g < 4 && spd > gears[g + 1]) g++;
      let rpm = 0.22 + 0.78 * U.clamp((spd - gears[g]) / (gears[g + 1] - gears[g]), 0, 1);
      if (spd < 1.5) rpm = 0.16 + this.input.throttle * 0.35;
      if (this.nitroActive) rpm = Math.min(1.15, rpm + 0.12);
      if (!this.alive || this.hidden) rpm = 0;
      const dx = this.x - listenerX, dz = this.z - listenerZ;
      const dist = Math.hypot(dx, dz);
      let vol = this.alive && !this.hidden ? (this.isPlayer && playerFocus ? 0.55 : 0.32 / (1 + dist / 18)) : 0;
      if (dist > 160) vol = 0;
      this.engineSnd.set(rpm, this.input.throttle, vol, U.clamp(dx / 60, -1, 1));
    }
  }

  RR.Vehicle = Vehicle;
})();
