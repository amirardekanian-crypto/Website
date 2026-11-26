/* ==========================================================================
   RUSTBLOOD RALLY - ai.js
   AI drivers. Each frame an AI picks a lane (racing line, overtaking,
   lining up shots, grabbing pickups, dodging obstacles / mines / fire),
   steers toward a look-ahead point, brakes for corners, uses nitro on
   straights, fires guns / rockets / mines and recovers when stuck.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const S = {};

  class AIDriver {
    constructor(vehicle, game, persona) {
      this.v = vehicle;
      this.g = game;
      this.p = persona;
      this.reset();
    }

    reset() {
      this.phase = Math.random() * 10;
      this.laneSm = this.p.lane;
      this.stuckT = 0;
      this.reverseT = 0;
      this.reverseSteer = 0;
      this.burstT = 0;
      this.burstOn = false;
      this.rocketCool = 2 + Math.random() * 2;
      this.mineCool = 3 + Math.random() * 3;
      this.target = null;
      this.ramming = false;
    }

    pickTarget() {
      const v = this.v, g = this.g;
      let best = null, bestS = 0;
      for (const o of g.vehicles) {
        if (o === v || !o.alive || o.hidden) continue;
        const da = g.track.delta(v.tr.along, o.tr.along);
        if (da < -8 || da > 70) continue;
        let s = 1 - Math.abs(da) / 80;
        if (o.isPlayer) s *= this.p.playerHate;
        if (s > bestS) { bestS = s; best = o; }
      }
      return best;
    }

    // Shift the planned lane away from anything in our path.
    avoid(along, lane, spd) {
      const g = this.g, track = g.track, W = track.halfWidth;
      const list = g.aiObstacleList;
      const range = 12 + Math.max(0, spd) * 1.1;
      const half = this.v.stats.radius + 1.3;
      for (let iter = 0; iter < 2; iter++) {
        for (let i = 0; i < list.length; i++) {
          const o = list[i];
          if (o.owner === this.v) continue;
          const da = track.delta(along, o.along);
          if (da < 1 || da > range) continue;
          const need = o.r + half;
          const d = lane - o.lateral;
          if (Math.abs(d) < need) {
            const leftLane = o.lateral - need, rightLane = o.lateral + need;
            const leftOk = leftLane > -W + 1.2, rightOk = rightLane < W - 1.2;
            if (d >= 0 && rightOk) lane = rightLane;
            else if (d < 0 && leftOk) lane = leftLane;
            else lane = rightOk ? rightLane : leftLane;
          }
        }
      }
      return lane;
    }

    update(dt) {
      const v = this.v, g = this.g, track = g.track, inp = v.input, p = this.p;
      inp.fire = false; inp.rocket = false; inp.mine = false;
      if (!v.alive || v.hidden) {
        inp.throttle = 0; inp.brake = 0; inp.steer = 0; inp.nitro = false; inp.handbrake = false;
        return;
      }
      const along = v.tr.along;
      const spd = v.speed;
      const W = track.halfWidth;
      const diff = g.difficulty || 1;

      /* ---------------- lane planning */
      let lane = p.lane + Math.sin(g.time * 0.21 + this.phase) * 3.2;
      const kAhead = track.curvatureAt(along + 18 + Math.max(0, spd) * 0.6);
      lane -= U.clamp(kAhead * 260, -6.5, 6.5);

      const hp = v.health / v.maxHealth;
      const want = hp < 0.55 ? 'health' : v.ammo.mg < 60 || v.ammo.rocket === 0 ? 'ammo' : v.nitro < 0.3 ? 'nitro' : null;
      if (want) {
        for (const pk of RR.Pickups.items) {
          if (!pk.active || pk.type !== want) continue;
          const da = track.delta(along, pk.along);
          if (da > 12 && da < 90) { lane = pk.lat; break; }
        }
      }

      const target = this.pickTarget();
      this.target = target;
      this.ramming = false;
      if (target) {
        const da = track.delta(along, target.tr.along);
        if (da > 4 && da < 55) lane = U.lerp(lane, target.tr.lateral, 0.75);
        if (Math.abs(da) < 6 && p.ram > 0.3 && Math.abs(target.tr.lateral - v.tr.lateral) < 7) {
          lane = target.tr.lateral;
          this.ramming = true;
        }
      }

      for (const o of g.vehicles) {
        if (o === v || o.hidden) continue;
        if (this.ramming && o === target) continue;
        const da = track.delta(along, o.tr.along);
        if (da > 2 && da < 22 && Math.abs(o.tr.lateral - lane) < 3.4) {
          const leftRoom = o.tr.lateral + W, rightRoom = W - o.tr.lateral;
          lane = rightRoom > leftRoom ? o.tr.lateral + 5 : o.tr.lateral - 5;
        }
      }

      lane = this.avoid(along, lane, spd);
      lane = U.clamp(lane, -W + 2, W - 2);
      this.laneSm = U.damp(this.laneSm, lane, 2.4, dt);

      /* ---------------- steering */
      const look = 9 + Math.max(0, spd) * 0.45;
      track.pointAt(along + look, this.laneSm, S);
      const desired = Math.atan2(S.x - v.x, S.z - v.z);
      const err = U.wrapAngle(desired - v.h);
      let steer = U.clamp(-err * 2.4, -1, 1);

      /* ---------------- speed */
      const kMax = track.maxCurvature(along + 4, along + 18 + Math.max(0, spd) * 1.1);
      const T = v.stats.turnRate, Vmax = v.stats.maxSpeed;
      const R = 1 / Math.max(kMax, 1e-4);
      let safe = (T * R) / (1 + (0.55 * T * R) / Vmax);
      safe *= p.skill * (0.92 + 0.08 * diff);
      let targetSpeed = Math.min(Vmax * 1.5, safe);
      if (Math.abs(err) > 0.7) targetSpeed = Math.min(targetSpeed, 16);
      const pl = g.player;
      if (pl && pl.alive && v !== pl && g.state !== 'menu') {
        const gap = v.progress - pl.progress;
        v.speedMul = U.clamp(1 - gap * 0.0009, 0.88, 1.1) * (0.94 + 0.06 * diff);
      } else v.speedMul = 1;

      let throttle = 0, brake = 0;
      if (spd < targetSpeed - 1) throttle = 1;
      else if (spd > targetSpeed + 2.5) brake = 1;
      else throttle = 0.35;
      let handbrake = Math.abs(err) > 0.85 && spd > 14;
      let nitro = v.nitro > 0.3 && kMax < 0.005 && spd > 18 && Math.abs(err) < 0.12;
      if (target && target.isPlayer && v.nitro > 0.2 && kMax < 0.008) {
        const da = track.delta(along, target.tr.along);
        if (da > 15 && da < 50) nitro = true;
      }

      /* ---------------- stuck recovery */
      if (g.state === 'intro' || g.state === 'countdown') {
        // cars are held on the grid: that is not "stuck"
        this.stuckT = 0;
        this.reverseT = 0;
      } else if (this.reverseT > 0) {
        this.reverseT -= dt;
        throttle = 0; brake = 1; steer = this.reverseSteer; nitro = false; handbrake = false;
      } else {
        if (Math.abs(spd) < 2.5 && throttle > 0) this.stuckT += dt;
        else this.stuckT = Math.max(0, this.stuckT - dt * 2);
        if (this.stuckT > 1.0) {
          this.stuckT = 0;
          this.reverseT = 1.0;
          this.reverseSteer = err > 0 ? 1 : -1;
        }
      }

      this.weapons(dt);

      inp.throttle = throttle;
      inp.brake = brake;
      inp.steer = steer;
      inp.handbrake = handbrake;
      inp.nitro = nitro;
    }

    weapons(dt) {
      const v = this.v, g = this.g, inp = v.input, p = this.p;
      const diff = g.difficulty || 1;
      this.burstT -= dt; this.rocketCool -= dt; this.mineCool -= dt;
      // give everyone a clean start: no shooting right after GO, no early mines
      const racing = g.state === 'racing';
      if (racing && g.raceTime < RR.CONFIG.aiHoldFire) return;
      if (racing && g.raceTime < RR.CONFIG.aiHoldMines) this.mineCool = Math.max(this.mineCool, 0.5);
      if (this.burstT <= 0) {
        this.burstOn = !this.burstOn;
        this.burstT = this.burstOn ? U.rand(0.6, 1.3) * p.burst : U.rand(0.5, 1.1) / diff;
      }
      let inCone = null, coneAng = 9, coneD = 0;
      for (const o of g.vehicles) {
        if (o === v || !o.alive || o.hidden) continue;
        const dx = o.x - v.x, dz = o.z - v.z;
        const d = Math.hypot(dx, dz);
        if (d > 62) continue;
        const a = Math.abs(U.wrapAngle(Math.atan2(dx, dz) - v.h));
        const lim = o.isPlayer ? 0.22 : 0.15;
        if (a < lim && a < coneAng) { coneAng = a; inCone = o; coneD = d; }
      }
      if (inCone && this.burstOn && v.ammo.mg > 0) inp.fire = true;
      if (inCone && coneAng < 0.12 && coneD > 12 && coneD < 70 && this.rocketCool <= 0 && v.ammo.rocket > 0) {
        if (Math.random() < p.rocketRate * diff * dt * 6) {
          inp.rocket = true;
          this.rocketCool = U.rand(2.5, 5) / diff;
        }
      }
      if (this.mineCool <= 0 && v.ammo.mine > 0) {
        for (const o of g.vehicles) {
          if (o === v || !o.alive || o.hidden) continue;
          const da = g.track.delta(v.tr.along, o.tr.along);
          if (da < -4 && da > -24 && Math.abs(o.tr.lateral - v.tr.lateral) < 3.5) {
            if (Math.random() < p.mineRate * dt * 4) {
              inp.mine = true;
              this.mineCool = U.rand(4, 8);
            }
            break;
          }
        }
      }
    }
  }

  RR.AIDriver = AIDriver;
})();
