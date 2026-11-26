/* ==========================================================================
   RUSTBLOOD RALLY - pickups.js
   Floating supply crates on the track: HEALTH (repair), AMMO and NITRO.
   Each has a coloured ground ring and light beam so it is easy to spot.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const CFG = RR.CONFIG;

  const TYPES = {
    health: { color: new THREE.Color(0.35, 2.2, 0.45), css: '#5dff6a', label: '+ARMOR', tex: () => RR.Tex.crateHealth() },
    ammo: { color: new THREE.Color(2.4, 1.6, 0.3), css: '#ffc23a', label: '+AMMO', tex: () => RR.Tex.crateAmmo() },
    nitro: { color: new THREE.Color(0.35, 1.3, 2.6), css: '#4fc4ff', label: '+NITRO', tex: () => RR.Tex.crateNitro() },
  };

  const Pickups = (RR.Pickups = {
    TYPES,
    init(game) {
      this.game = game;
      this.items = [];
      const track = game.track;
      const crateGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
      const ringGeo = new THREE.PlaneGeometry(1, 1);
      ringGeo.rotateX(-Math.PI / 2);
      const beamGeo = new THREE.CylinderGeometry(0.9, 0.9, 7, 16, 1, true);
      beamGeo.translate(0, 3.5, 0);
      const s = {};
      const mats = {};
      for (const k in TYPES) {
        const t = TYPES[k];
        mats[k] = {
          crate: new THREE.MeshStandardMaterial({ map: t.tex(), roughness: 0.6, metalness: 0.2, emissive: t.color.clone().multiplyScalar(0.08) }),
          ring: new THREE.MeshBasicMaterial({ map: RR.Tex.ring(), color: t.color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
          beam: new THREE.MeshBasicMaterial({
            color: t.color.clone().multiplyScalar(0.18), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
          }),
        };
      }
      for (const [along, lat, type] of track.layout.pickups) {
        track.pointAt(along, lat, s);
        const group = new THREE.Group();
        group.position.set(s.x, 0, s.z);
        const crate = new THREE.Mesh(crateGeo, mats[type].crate);
        crate.castShadow = true;
        crate.position.y = 1.3;
        const ring = new THREE.Mesh(ringGeo, mats[type].ring);
        ring.position.y = 0.08;
        ring.scale.set(4.2, 1, 4.2);
        ring.renderOrder = 2;
        const beam = new THREE.Mesh(beamGeo, mats[type].beam);
        beam.renderOrder = 2;
        group.add(crate, ring, beam);
        game.scene.add(group);
        this.items.push({ type, x: s.x, z: s.z, along, lat, group, crate, ring, beam, active: true, timer: 0, phase: Math.random() * 6 });
      }
    },

    reset() {
      for (const p of this.items) { p.active = true; p.timer = 0; p.group.visible = true; p.crate.scale.setScalar(1); }
    },

    apply(v, type) {
      const P = CFG.pickups, W = CFG.weapons;
      if (type === 'health') v.heal(P.health);
      else if (type === 'ammo') {
        v.ammo.mg = Math.min(W.mg.max, v.ammo.mg + P.mg);
        v.ammo.rocket = Math.min(W.rocket.max, v.ammo.rocket + P.rocket);
        v.ammo.mine = Math.min(W.mine.max, v.ammo.mine + P.mine);
      } else if (type === 'nitro') v.nitro = Math.min(1, v.nitro + P.nitro);
    },

    update(dt) {
      const g = this.game;
      const t = g.time;
      for (const p of this.items) {
        if (!p.active) {
          p.timer -= dt;
          if (p.timer <= 0) {
            p.active = true;
            p.group.visible = true;
            p.crate.scale.setScalar(0.01);
          }
          continue;
        }
        // grow back after respawning, bob and spin
        const sc = Math.min(1, p.crate.scale.x + dt * 3);
        p.crate.scale.setScalar(sc);
        p.crate.position.y = 1.3 + Math.sin(t * 2.5 + p.phase) * 0.25;
        p.crate.rotation.y += dt * 1.6;
        p.crate.rotation.x = Math.sin(t * 1.3 + p.phase) * 0.2;
        const pulse = 1 + Math.sin(t * 4 + p.phase) * 0.08;
        p.ring.scale.set(4.2 * pulse, 1, 4.2 * pulse);
        for (const v of g.vehicles) {
          if (!v.alive || v.hidden) continue;
          const dx = v.x - p.x, dz = v.z - p.z;
          if (dx * dx + dz * dz < 9) {
            this.apply(v, p.type);
            p.active = false;
            p.timer = CFG.pickups.respawn;
            p.group.visible = false;
            RR.FX.pickupBurst(p.x, p.z, TYPES[p.type].color);
            RR.Audio.play('pickup_' + p.type, { x: p.x, z: p.z, vol: v.isPlayer ? 0.7 : 0.35 });
            g.onPickup(v, p.type);
            break;
          }
        }
      }
    },
  });
})();
