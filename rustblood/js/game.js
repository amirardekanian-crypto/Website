/* ==========================================================================
   RUSTBLOOD RALLY - game.js
   The game itself: renderer + bloom, race states (menu, intro, countdown,
   racing, finished / wrecked, results, pause), the Death Rally style
   follow camera, respawns, explosions, race positions, event feedback and
   the main loop.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const CFG = RR.CONFIG;
  const $ = (id) => document.getElementById(id);
  const yieldFrame = () => new Promise((r) => setTimeout(r, 0));
  const TMP = {};

  const Game = (RR.Game = {
    state: 'loading',
    stateT: 0,
    time: 0,
    raceTime: 0,
    paused: false,
    timeScale: 1,
    slowmoT: 0,
    godMode: false,
    difficulty: 1,
    showTags: false,
    showYou: false,
    debug: { autopilot: false, speed: 1 },
    vehicles: [],
    wrecks: [],
    aiObstacleList: [],

    /* ============================================================ setup */
    async init(status) {
      status('Starting the renderer…', 0.1);
      const canvas = $('game-canvas');
      let renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
      } catch (e) {
        throw new Error('WebGL is not available in this browser.');
      }
      this.renderer = renderer;
      RR.maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      this.quality = this.detectQuality();
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.QUALITY[this.quality].pr);
      renderer.setPixelRatio(this.pixelRatio);
      renderer.setSize(Math.max(2, window.innerWidth), Math.max(2, window.innerHeight));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.0;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(CFG.camera.fov, window.innerWidth / window.innerHeight, 1, 7000);
      this.camera.position.set(0, 60, 40);
      this.camLook = new THREE.Vector3();
      this.camLead = { x: 0, z: 0 };
      this.camH = CFG.camera.height;
      this.camFov = CFG.camera.fov;
      this.menuLook = new THREE.Vector3();
      this.introFrom = new THREE.Vector3();
      this.introLook = new THREE.Vector3();
      this.setupComposer();

      RR.Input.init(canvas);
      RR.FX.init(this.scene);
      RR.FX._camTarget = this.camLook;
      status('Painting rust and sand…', 0.2);
      await yieldFrame();
      this.track = new RR.Track(RR.TRACK_LAYOUT, CFG.track);
      await RR.World.build(this.scene, renderer, this.track, status);

      status('Welding war machines…', 0.76);
      await yieldFrame();
      this.createVehicles();
      RR.Weapons.init(this);
      RR.Pickups.init(this);
      RR.Hazards.init(this);
      RR.HUD.init(this);

      status('Fuelling up…', 0.9);
      await yieldFrame();
      this.applyQuality(this.quality, true);
      this.setupRace();
      this.bindUI();
      window.addEventListener('resize', () => this.onResize());
      this.onResize();
      try { renderer.compile(this.scene, this.camera); } catch (e) { /* not critical */ }
      this.enterMenu();
      status('Ready', 1);
      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    },

    /* ------------------------------------------------- graphics quality */
    QUALITY: [
      { name: 'LOW', pr: 0.8, bloom: false, shadow: 1024 },
      { name: 'MEDIUM', pr: 1.0, bloom: true, shadow: 1536 },
      { name: 'HIGH', pr: 1.5, bloom: true, shadow: 2048 },
    ],

    // Laptop / integrated GPUs start on MEDIUM, others on HIGH.
    detectQuality() {
      try {
        const gl = this.renderer.getContext();
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
        this.gpuName = name;
        if (!name || /intel|iris|uhd|mali|adreno|powervr|swiftshader|llvmpipe|microsoft basic/i.test(name)) return 1;
        return 2;
      } catch (e) {
        return 1;
      }
    },

    applyQuality(level, silent) {
      level = U.clamp(level, 0, this.QUALITY.length - 1);
      const q = this.QUALITY[level];
      this.quality = level;
      this.pixelRatio = Math.min(window.devicePixelRatio || 1, q.pr);
      this.useBloom = q.bloom && !!this.composer;
      const sun = RR.World.sun;
      if (sun && sun.shadow.mapSize.x !== q.shadow) {
        sun.shadow.mapSize.set(q.shadow, q.shadow);
        if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      }
      this.onResize();
      this.fpsWatch = { t: 0, frames: 0 };
      if (!silent && RR.HUD.visible) RR.HUD.toast('GRAPHICS: ' + q.name, '#ffffff');
    },

    // If the game runs slowly during a race, step the quality down once.
    watchPerformance(dtReal) {
      if (this.state !== 'racing' || this.paused || document.hidden || this.quality === 0 || this.autoDropped >= 2) return;
      const w = this.fpsWatch || (this.fpsWatch = { t: 0, frames: 0 });
      w.t += dtReal;
      w.frames++;
      if (w.t >= 4) {
        const fps = w.frames / w.t;
        w.t = 0; w.frames = 0;
        if (fps < 38) {
          this.autoDropped = (this.autoDropped || 0) + 1;
          this.applyQuality(this.quality - 1, true);
          RR.HUD.toast('GRAPHICS LOWERED FOR SPEED (Q to change)', '#ffffff');
        }
      }
    },

    setupComposer() {
      const A = window.THREE_ADDONS;
      this.composer = null;
      if (!A || !A.EffectComposer) return;
      try {
        const r = this.renderer;
        const size = r.getDrawingBufferSize(new THREE.Vector2());
        const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
        const comp = new A.EffectComposer(r, rt);
        comp.addPass(new A.RenderPass(this.scene, this.camera));
        this.bloom = new A.UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.4, 0.4, 1.0);
        comp.addPass(this.bloom);
        comp.addPass(new A.OutputPass());
        this.composer = comp;
      } catch (e) {
        console.warn('Bloom disabled:', e);
        this.composer = null;
      }
    },

    onResize() {
      const w = window.innerWidth, h = window.innerHeight;
      if (w < 2 || h < 2) return; // window minimised / hidden: keep the old size
      this.renderer.setPixelRatio(this.pixelRatio);
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      if (this.menuOffset) this.setMenuOffset(true);
      this.camera.updateProjectionMatrix();
      if (this.composer) this.composer.setSize(w, h);
      RR.FX.setScale(h * this.pixelRatio, this.camera.fov);
      // scale the HUD with the window so it never overlaps on small screens
      const s = U.clamp(Math.min(w / 1500, h / 860), 0.58, 1.25);
      document.documentElement.style.setProperty('--hud-s', s.toFixed(3));
    },

    createVehicles() {
      const defs = [
        { type: 'vulture', name: 'VULTURE', paint: 0x2a2a2e, accent: 0xd8a020, ui: '#ffc83c', number: 7, seed: 202 },
        { type: 'rustjaw', name: 'RUSTJAW', paint: 0x7a2416, accent: 0x2a2622, ui: '#ff5a3c', number: 13, seed: 201 },
        { type: 'scorch', name: 'SCORCH', paint: 0x5a6a2c, accent: 0xd8641c, ui: '#a6e34e', number: 66, seed: 203 },
        { type: 'reaper', name: 'YOU', paint: 0x2b8f88, accent: 0xd8c8a0, ui: '#3ff0dc', number: 1, seed: 204, player: true },
      ];
      this.vehicles = defs.map((d, i) => new RR.Vehicle(this, {
        id: i, type: d.type, name: d.name, paint: d.paint, accent: d.accent, uiColor: d.ui,
        number: d.number, seed: d.seed, isPlayer: !!d.player,
      }));
      this.player = this.vehicles[3];
      this.ais = this.vehicles.filter((v) => !v.isPlayer).map((v) => new RR.AIDriver(v, this, CFG.ai[v.type]));
      this.autoDriver = new RR.AIDriver(this.player, this, { lane: 1.5, skill: 0.96, playerHate: 1, rocketRate: 0.4, mineRate: 0.4, ram: 0.2, burst: 1.1 });
    },

    setupRace() {
      RR.FX.reset();
      RR.Weapons.reset();
      RR.Pickups.reset();
      RR.Hazards.reset();
      this.clearWrecks();
      this.vehicles.forEach((v, slot) => {
        v.reset();
        v.placeOnTrack(RR.World.gridAlong(slot), RR.World.gridLateral(slot), 0);
        v.progress = RR.World.gridAlong(slot);
      });
      this.ais.forEach((a) => a.reset());
      this.autoDriver.reset();
      this.raceTime = 0;
      this.finishOrder = [];
      this.playerDNF = false;
      this.endTimer = 0;
      this.timeScale = 1;
      this.slowmoT = 0;
      this.perfectDone = false;
      this.throttlePressT = null;
      this.wrongT = 0;
      this.resetCool = 0;
      this.camLead.x = this.camLead.z = 0;
      this.snapCam = true;
      this.updatePositions();
      RR.World.setStartLights(0);
    },

    clearWrecks() {
      for (const w of this.wrecks) {
        this.scene.remove(w.obj);
        w.cols.forEach((c) => RR.World.removeCollider(c));
      }
      this.wrecks.length = 0;
    },

    bindUI() {
      const click = (id, fn) => {
        $(id).addEventListener('click', (e) => {
          e.currentTarget.blur();
          RR.Audio.unlock();
          RR.Audio.play('click', { vol: 0.5 });
          fn();
        });
      };
      click('btn-start', () => this.startRace());
      click('btn-resume', () => this.togglePause(false));
      click('btn-restart', () => this.startRace());
      click('btn-menu', () => this.enterMenu());
      click('btn-again', () => this.startRace());
      click('btn-results-menu', () => this.enterMenu());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && ['intro', 'countdown', 'racing'].includes(this.state) && !this.paused) this.togglePause(true);
      });
    },

    showScreen(name) {
      for (const s of ['title', 'pause', 'results']) $('screen-' + s).classList.toggle('hidden', s !== name);
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    },

    /* =========================================================== states */
    enterMenu() {
      this.state = 'menu';
      this.stateT = 0;
      this.paused = false;
      this.setupRace();
      RR.HUD.setVisible(false);
      RR.HUD.clearMessages();
      this.showTags = false;
      this.showYou = false;
      this.showScreen('title');
      this.menuCamT = 0;
      this.menuCar = 0;
      this.menuLook.set(this.vehicles[0].x, 1.5, this.vehicles[0].z);
    },

    startRace() {
      RR.Audio.unlock();
      this.introFrom.copy(this.camera.position);
      this.introLook.copy(this.state === 'menu' ? this.menuLook : this.camLook);
      this.setupRace();
      this.state = 'intro';
      this.stateT = 0;
      this.paused = false;
      this.showScreen(null);
      RR.HUD.clearMessages();
      RR.HUD.setVisible(true);
      RR.HUD.showHint(true);
      RR.HUD.center('GET READY', 'ready', 2.0);
      this.showTags = true;
      this.showYou = true;
      RR.Audio.play('whoosh', { vol: 0.5 });
      RR.Input.reset();
    },

    togglePause(force) {
      const p = force === undefined ? !this.paused : force;
      this.paused = p;
      this.showScreen(p ? 'pause' : null);
      const el = $('quality-label');
      if (el) el.textContent = this.QUALITY[this.quality].name;
      RR.Input.reset();
    },

    perfectStart() {
      if (this.perfectDone) return;
      this.perfectDone = true;
      this.player.boostTimer = 1.3;
      RR.HUD.center('PERFECT START!', 'perfect', 1.4);
      RR.Audio.play('pickup_nitro', { vol: 0.7 });
    },

    stateUpdate(dt, dtReal) {
      this.stateT += dt;
      const s = this.state;
      if (s === 'intro') {
        if (this.stateT > 2.2) { this.state = 'countdown'; this.stateT = 0; this.countStep = 0; }
      } else if (s === 'countdown') {
        const step = Math.floor(this.stateT / 0.9) + 1;
        if (step !== this.countStep && step <= 3) {
          this.countStep = step;
          RR.HUD.countdown(String(4 - step));
          RR.Audio.play('beep', { vol: 0.8 });
          RR.World.setStartLights(step);
        }
        if (this.stateT >= 2.7) {
          this.state = 'racing';
          this.stateT = 0;
          RR.HUD.countdown('GO!', 'go');
          RR.Audio.play('beepGo', { vol: 0.9 });
          RR.World.setStartLights(4);
          if (this.throttlePressT != null && this.time - this.throttlePressT < 0.35 && RR.Input.down('KeyW', 'ArrowUp')) this.perfectStart();
        }
      } else if (s === 'racing') {
        if (this.stateT > 6 && this.showYou) { RR.HUD.showHint(false); this.showYou = false; }
      } else if (s === 'finished' || s === 'wrecked') {
        this.endTimer -= dtReal;
        if (this.endTimer <= 0) this.showResults();
      }
    },

    playerFinished() {
      this.state = 'finished';
      this.stateT = 0;
      this.endTimer = 3.6;
      this.slowmo(0.45, 0.9);
      const pos = this.player.position;
      RR.HUD.center(pos === 1 ? 'VICTORY!' : 'FINISHED ' + pos + U.ordinal(pos), pos === 1 ? 'win' : 'fin', 3.2);
      RR.HUD.showHint(false);
      RR.Audio.play('lap', { vol: 0.8 });
    },

    playerWrecked() {
      if (this.state !== 'racing') return;
      this.state = 'wrecked';
      this.stateT = 0;
      this.endTimer = 3.4;
      this.playerDNF = true;
      this.slowmo(0.3, 1.7);
      RR.HUD.center('WRECKED!', 'dead', 3.2);
      RR.HUD.showHint(false);
    },

    slowmo(scale, dur) {
      this.timeScale = scale;
      this.slowmoT = dur;
    },

    standings() {
      const fin = this.finishOrder.slice();
      const rest = this.vehicles.filter((v) => fin.indexOf(v) < 0);
      rest.sort((a, b) => {
        if (this.playerDNF) {
          if (a.isPlayer) return 1;
          if (b.isPlayer) return -1;
        }
        return b.progress - a.progress;
      });
      return fin.concat(rest);
    },

    showResults() {
      this.state = 'results';
      this.stateT = 0;
      RR.HUD.setVisible(false);
      this.showTags = false;
      const st = this.standings();
      const p = this.player;
      const pos = st.indexOf(p) + 1;
      let title, sub;
      if (this.playerDNF) { title = 'WRECKED'; sub = 'Your war machine burned out on lap ' + Math.min(p.lap, CFG.laps) + '. The wasteland claims another.'; }
      else if (pos === 1) { title = 'VICTORY'; sub = 'First across the line. The wasteland bows to you.'; }
      else { title = pos + U.ordinal(pos) + ' PLACE'; sub = pos === 2 ? 'So close. The crowd wants blood - go again.' : 'You survived. Winning is another matter.'; }
      $('res-title').textContent = title;
      $('res-title').className = this.playerDNF ? 'dead' : pos === 1 ? 'win' : '';
      $('res-sub').textContent = sub;
      const L = this.track.length * CFG.laps;
      let rows = '<tr><th>POS</th><th>DRIVER</th><th>RESULT</th><th>KILLS</th><th>BEST LAP</th></tr>';
      st.forEach((v, i) => {
        let result;
        if (v.finished) result = U.formatTime(v.finishTime);
        else if (v.isPlayer && this.playerDNF) result = 'WRECKED';
        else result = 'RACING (' + Math.max(0, Math.min(99, Math.round((v.progress / L) * 100))) + '%)';
        rows += `<tr class="${v.isPlayer ? 'me' : ''}"><td>${i + 1}</td><td style="color:${v.uiColor}">${v.isPlayer ? 'YOU (REAPER)' : v.name}</td>` +
          `<td>${result}</td><td>${v.kills}</td><td>${isFinite(v.bestLap) ? U.formatTime(v.bestLap) : '--'}</td></tr>`;
      });
      $('res-table').innerHTML = rows;
      $('res-stats').innerHTML =
        `<div><span>RACE TIME</span><b>${U.formatTime(p.finished ? p.finishTime : this.raceTime)}</b></div>` +
        `<div><span>KILLS</span><b>${p.kills}</b></div>` +
        `<div><span>DAMAGE DEALT</span><b>${Math.round(p.damageDealt)}</b></div>` +
        `<div><span>BEST LAP</span><b>${isFinite(p.bestLap) ? U.formatTime(p.bestLap) : '--'}</b></div>`;
      this.showScreen('results');
    },

    /* ======================================================= race logic */
    updatePositions() {
      const fo = this.finishOrder || [];
      const arr = this.vehicles.slice().sort((a, b) => {
        if (a.finished !== b.finished) return a.finished ? -1 : 1;
        if (a.finished) return fo.indexOf(a) - fo.indexOf(b);
        return b.progress - a.progress;
      });
      arr.forEach((v, i) => { v.position = i + 1; });
    },

    raceProgress() {
      const L = this.track.length, laps = CFG.laps;
      const counting = this.state === 'racing' || this.state === 'finished' || this.state === 'wrecked' || this.state === 'results';
      for (const v of this.vehicles) {
        if (v.finished) continue;
        const lapNow = Math.max(1, Math.floor(v.progress / L) + 1);
        if (lapNow > v.lap) {
          const lapTime = this.raceTime - v.lapStart;
          v.lapStart = this.raceTime;
          if (counting && lapTime > 5) {
            v.lapTimes.push(lapTime);
            v.bestLap = Math.min(v.bestLap, lapTime);
          }
          v.lap = lapNow;
          if (v.isPlayer && this.state === 'racing' && v.lap <= laps) {
            if (v.lap === laps) RR.HUD.center('FINAL LAP!', 'final', 2);
            else RR.HUD.center('LAP ' + v.lap + '/' + laps, 'lap', 1.6);
            RR.HUD.toast('LAP TIME ' + U.formatTime(lapTime), '#fff');
            RR.Audio.play('lap', { vol: 0.7 });
          }
        }
        if (counting && v.progress >= laps * L) {
          v.finished = true;
          v.finishTime = this.raceTime;
          this.finishOrder.push(v);
          if (v.isPlayer) {
            if (this.state === 'racing') { this.updatePositions(); this.playerFinished(); }
          } else if (this.state === 'racing') {
            RR.HUD.feed(`<span style="color:${v.uiColor}">${v.name}</span> crossed the finish line`);
          }
        }
      }
      this.updatePositions();
    },

    updateRespawns(dt) {
      for (const v of this.vehicles) {
        if (v.alive) { v.invuln = Math.max(0, v.invuln - dt); continue; }
        if (v.isPlayer && this.state !== 'menu') continue;
        v.respawnTimer -= dt;
        if (v.respawnTimer <= 0) this.respawn(v);
      }
      for (let i = this.wrecks.length - 1; i >= 0; i--) {
        const w = this.wrecks[i];
        w.t += dt;
        if (w.t > w.life - 3) w.obj.position.y = -(w.t - (w.life - 3)) * 0.8;
        if (w.t > w.life) {
          this.scene.remove(w.obj);
          w.cols.forEach((c) => RR.World.removeCollider(c));
          this.wrecks.splice(i, 1);
        }
      }
    },

    respawn(v) {
      const obj = v.makeWreckCopy();
      this.scene.add(obj);
      const fx = Math.sin(v.h), fz = Math.cos(v.h), off = v.stats.length * 0.5 - v.stats.radius;
      const cols = [
        RR.World.addCollider(v.x + fx * off, v.z + fz * off, v.stats.radius, 'wreck'),
        RR.World.addCollider(v.x - fx * off, v.z - fz * off, v.stats.radius, 'wreck'),
      ];
      RR.FX.emitter({ kind: 'fire', x: v.x, y: 1.2, z: v.z, rate: 16, life: 12, scale: 1.3 });
      this.wrecks.push({ obj, cols, t: 0, life: 22, ob: { along: v.tr.along, lateral: v.tr.lateral, r: 2.5 } });
      while (this.wrecks.length > 6) {
        const w = this.wrecks.shift();
        this.scene.remove(w.obj);
        w.cols.forEach((c) => RR.World.removeCollider(c));
      }
      const back = CFG.respawnBack;
      const along = v.tr.along - back;
      const lane = this.freeLane(along);
      v.revive();
      v.placeOnTrack(along, lane, 14);
      v.progress -= back;
      v.invuln = CFG.respawnInvuln;
      RR.FX.glowBurst(v.x, 1, v.z, RR.Pickups.TYPES.nitro.color, 20, 8, 1.4);
      RR.FX.ring(v.x, v.z, 10, 0.5);
      RR.Audio.play('respawn', { x: v.x, z: v.z, vol: 0.6 });
      if (this.state !== 'menu') RR.HUD.feed(`<span style="color:${v.uiColor}">${v.name}</span> is back in the race`);
    },

    freeLane(along) {
      for (const l of [0, -5, 5, -8, 8]) {
        let ok = true;
        for (const o of this.aiObstacleList) {
          if (Math.abs(this.track.delta(along, o.along)) < 9 && Math.abs(o.lateral - l) < o.r + 2.5) { ok = false; break; }
        }
        if (ok) {
          for (const v of this.vehicles) {
            if (v.hidden || !v.alive) continue;
            if (Math.abs(this.track.delta(along, v.tr.along)) < 9 && Math.abs(v.tr.lateral - l) < 4) { ok = false; break; }
          }
        }
        if (ok) return l;
      }
      return 0;
    },

    buildObstacleList() {
      const L = this.aiObstacleList;
      L.length = 0;
      for (const o of RR.World.aiObstacles) L.push(o);
      RR.Hazards.aiObstacles(L);
      for (const w of this.wrecks) L.push(w.ob);
      for (const m of RR.Weapons.mines) {
        if (!m.active) continue;
        this.track.nearest(m.x, m.z, m.ti === undefined ? -1 : m.ti, TMP);
        m.ti = TMP.i;
        if (!m.ob) m.ob = { along: 0, lateral: 0, r: 1.7 };
        m.ob.along = TMP.along; m.ob.lateral = TMP.lateral;
        L.push(m.ob);
      }
      for (const v of this.vehicles) {
        if (!v.alive && !v.hidden) {
          if (!v.deadOb) v.deadOb = { along: 0, lateral: 0, r: 2.6 };
          v.deadOb.along = v.tr.along; v.deadOb.lateral = v.tr.lateral;
          L.push(v.deadOb);
        }
      }
    },

    explode(x, z, o) {
      const y = o.y == null ? 0.8 : o.y;
      this.lastBlast = this.lastBlast || { x: 0, z: 0 };
      this.lastBlast.x = x; this.lastBlast.z = z;
      RR.FX.explosion(x, y, z, o.scale || 1);
      RR.Audio.play(o.big ? 'explosionBig' : 'explosion', { x, z, vol: o.big ? 1 : 0.85, rate: U.rand(0.9, 1.1) });
      const dc = Math.hypot(x - this.camLook.x, z - this.camLook.z);
      RR.FX.shake(U.clamp(1.15 - dc / 55, 0, 1) * (o.big ? 0.85 : 0.55));
      for (const v of this.vehicles) {
        if (v.hidden || v === o.exclude) continue;
        const dx = v.x - x, dz = v.z - z;
        const dist = Math.hypot(dx, dz);
        if (dist > o.radius + v.stats.radius) continue;
        const k = U.clamp(1 - Math.max(0, dist - v.stats.radius) / o.radius, 0, 1);
        let dmg = v === o.direct ? o.damage * 1.15 : o.damage * (0.2 + 0.8 * k);
        const self = o.owner && v === o.owner;
        if (self) dmg *= 0.4;
        if (v.alive) v.damage(dmg, self ? null : o.owner, 'explosion');
        const nx = dist > 0.01 ? dx / dist : 0, nz = dist > 0.01 ? dz / dist : 0;
        const f = (o.force * k) / v.stats.mass;
        v.vx += nx * f; v.vz += nz * f;
        v.av += U.rand(-1, 1) * f * 0.3;
        v.vy = Math.max(v.vy, f * 0.42 * (o.launch || 1));
        if (v.vy > 0) v.y = Math.max(v.y, 0.02);
        v.spinTimer = Math.max(v.spinTimer, 0.4 * k);
        v.tiltX += U.rand(-0.25, 0.25) * k;
        v.tiltZ += U.rand(-0.3, 0.3) * k;
      }
      RR.Hazards.blast(x, z, o.radius, o.owner);
      for (const m of RR.Weapons.mines) {
        if (m.active && m.arm <= 0 && m.life > 0 && Math.hypot(m.x - x, m.z - z) < o.radius * 0.6) { m.life = 0; m.detonate = o.owner || m.owner; }
      }
    },

    /* ============================================================ events */
    onImpact(v, x, z, speed, kind, other) {
      const vol = Math.min(1, speed / 25);
      RR.Audio.play('impact', { x, z, vol: 0.3 + vol * 0.7, rate: U.rand(0.85, 1.15) });
      if (v.isPlayer || (other && other.isPlayer)) RR.FX.shake(Math.min(0.5, speed * 0.02));
    },
    onDamage(v, amount, source, kind) {
      if (this.state === 'menu') return;
      if (v.isPlayer) {
        RR.HUD.damage(kind === 'fire' ? amount * 0.3 : amount);
        if (kind === 'bullet') RR.FX.shake(0.04);
        if (source && source !== v && kind !== 'explosion') RR.HUD.damageFrom(source.x, source.z);
        else if (kind === 'explosion' && this.lastBlast) RR.HUD.damageFrom(this.lastBlast.x, this.lastBlast.z);
      }
      if (source && source.isPlayer && v !== source) RR.HUD.hitMarker(v);
    },
    onPlayerHit() {},
    onDestroyed(v, killer) {
      if (this.state !== 'menu') {
        const name = (q) => `<span style="color:${q.uiColor}">${q.isPlayer ? 'YOU' : q.name}</span>`;
        if (killer) RR.HUD.feed(`${name(killer)} wrecked ${name(v)}`);
        else RR.HUD.feed(`${name(v)} crashed and burned`);
        if (killer && killer.isPlayer && !v.isPlayer) {
          RR.HUD.center('WRECKED ' + v.name + '!', 'kill', 1.6);
          RR.Audio.play('kill', { vol: 0.6 });
          this.slowmo(0.35, 0.4);
        }
      }
      if (v.isPlayer && this.state === 'racing') this.playerWrecked();
    },
    onPickup(v, type) {
      if (v.isPlayer && this.state !== 'menu') RR.HUD.toast(RR.Pickups.TYPES[type].label, RR.Pickups.TYPES[type].css);
    },
    onOil(v) {
      if (v.isPlayer && this.state === 'racing') RR.HUD.toast('OIL SLICK!', '#c9b8ff');
    },
    onBurn() {
      if (this.state === 'menu' || this.burnToastT > this.time) return;
      this.burnToastT = this.time + 2;
      RR.HUD.toast('ON FIRE!', '#ff8a30');
    },
    onEmpty(w) {
      if (this.emptyToastT > this.time) return;
      this.emptyToastT = this.time + 1.2;
      RR.HUD.toast('NO ' + w + ' - GRAB AMMO CRATES', '#ff6040');
    },

    /* ============================================================ input */
    readPlayerInput() {
      const I = RR.Input, inp = this.player.input;
      const up = I.down('KeyW', 'ArrowUp'), down = I.down('KeyS', 'ArrowDown');
      const left = I.down('KeyA', 'ArrowLeft'), right = I.down('KeyD', 'ArrowRight');
      inp.throttle = up ? 1 : 0;
      inp.brake = down ? 1 : 0;
      inp.steer = (right ? 1 : 0) - (left ? 1 : 0);
      inp.handbrake = I.down('Space');
      inp.nitro = I.down('ShiftLeft', 'ShiftRight');
      // "held or tapped since last frame" so even very quick clicks register
      inp.fire = I.mouseLeft || I.mouseLeftHit || I.down('KeyJ') || I.hit('KeyJ');
      inp.rocket = I.mouseRight || I.mouseRightHit || I.down('KeyK') || I.hit('KeyK');
      inp.mine = I.down('KeyE', 'KeyL') || I.hit('KeyE', 'KeyL');
      if (I.hit('KeyW', 'ArrowUp')) {
        this.throttlePressT = this.time;
        if (this.state === 'racing' && this.stateT < 0.25) this.perfectStart();
      }
    },

    resetPlayerCar() {
      const p = this.player;
      if (this.resetCool > 0 || !p.alive) return;
      p.placeOnTrack(p.tr.along, U.clamp(p.tr.lateral, -6, 6), 0);
      p.invuln = 1.5;
      this.resetCool = 3;
      RR.HUD.toast('BACK ON TRACK', '#ffffff');
    },

    handleKeys() {
      const I = RR.Input;
      if (I.hit('KeyM')) {
        RR.Audio.unlock();
        const m = RR.Audio.toggleMute();
        if (RR.HUD.visible) RR.HUD.toast(m ? 'SOUND OFF' : 'SOUND ON', '#ffffff');
      }
      if (I.hit('KeyQ')) {
        this.applyQuality((this.quality + 1) % this.QUALITY.length);
        this.autoDropped = 2; // the player chose, stop auto-adjusting
        const el = $('quality-label');
        if (el) el.textContent = this.QUALITY[this.quality].name;
      }
      switch (this.state) {
        case 'menu':
          if (I.hit('Enter')) this.startRace();
          break;
        case 'intro':
        case 'countdown':
        case 'racing':
          if (I.hit('Escape', 'KeyP')) this.togglePause();
          else if (this.paused && I.hit('Enter')) this.togglePause(false);
          else if (!this.paused && this.state === 'racing' && I.hit('KeyR')) this.resetPlayerCar();
          break;
        case 'results':
          if (I.hit('Enter', 'KeyR')) this.startRace();
          else if (I.hit('Escape')) this.enterMenu();
          break;
        default:
          break;
      }
    },

    /* ============================================================ camera */
    // On the title screen the image is shifted right so the car you watch is
    // not hidden behind the menu on the left.
    setMenuOffset(on) {
      const cam = this.camera, w = window.innerWidth, h = window.innerHeight;
      if (on) cam.setViewOffset(w, h, -w * 0.2, 0, w, h);
      else if (cam.view && cam.view.enabled) cam.clearViewOffset();
      this.menuOffset = on;
    },

    updateCamera(dt) {
      const C = CFG.camera, cam = this.camera;
      const wantOffset = this.state === 'menu';
      if (wantOffset !== !!this.menuOffset) this.setMenuOffset(wantOffset);
      if (this.state === 'menu') { this.menuCamera(dt); return; }
      const p = this.player;
      const lx = U.clamp(p.vx * C.lead, -C.maxLead, C.maxLead), lz = U.clamp(p.vz * C.lead, -C.maxLead, C.maxLead);
      this.camLead.x = U.damp(this.camLead.x, lx, 2.0, dt);
      this.camLead.z = U.damp(this.camLead.z, lz, 2.0, dt);
      const tx = p.x + this.camLead.x, tz = p.z + this.camLead.z;
      if (this.snapCam) { this.camLook.set(tx, 0, tz); this.camH = C.height; this.snapCam = false; }
      this.camLook.x = U.damp(this.camLook.x, tx, C.follow, dt);
      this.camLook.z = U.damp(this.camLook.z, tz, C.follow, dt);
      this.camLook.y = 0;
      const spd = Math.hypot(p.vx, p.vz);
      const hT = C.height + Math.min(spd, 62) * C.speedZoom + (p.nitroActive ? 2 : 0);
      this.camH = U.damp(this.camH, hT, 1.4, dt);
      const back = this.camH * (C.back / C.height);
      const sx = RR.FX.shakeX, sz = RR.FX.shakeZ;
      let px = this.camLook.x + sx, py = this.camH, pz = this.camLook.z + back + sz;
      let lx2 = this.camLook.x + sx * 0.4, ly2 = 0, lz2 = this.camLook.z + sz * 0.4;
      if (this.state === 'intro') {
        const k = U.smoothstep(0, 1, Math.min(1, this.stateT / 2.0));
        px = U.lerp(this.introFrom.x, px, k); py = U.lerp(this.introFrom.y, py, k); pz = U.lerp(this.introFrom.z, pz, k);
        lx2 = U.lerp(this.introLook.x, lx2, k); ly2 = U.lerp(this.introLook.y, ly2, k); lz2 = U.lerp(this.introLook.z, lz2, k);
      }
      cam.position.set(px, py, pz);
      cam.lookAt(lx2, ly2, lz2);
      const fovT = C.fov + (p.nitroActive || p.boostTimer > 0 ? 6 : 0);
      this.camFov = U.damp(this.camFov, fovT, 3, dt);
      if (Math.abs(cam.fov - this.camFov) > 0.01) {
        cam.fov = this.camFov;
        cam.updateProjectionMatrix();
        RR.FX.setScale(window.innerHeight * this.pixelRatio, cam.fov);
      }
    },

    menuCamera(dt) {
      const cam = this.camera;
      this.menuCamT += dt;
      if (this.menuCamT > 9) {
        this.menuCamT = 0;
        this.menuCar = (this.menuCar + 1) % this.vehicles.length;
        const v = this.vehicles[this.menuCar];
        this.menuLook.set(v.x, 1.5, v.z);
      }
      const v = this.vehicles[this.menuCar];
      const tx = v.x + v.vx * 0.25, tz = v.z + v.vz * 0.25;
      this.menuLook.x = U.damp(this.menuLook.x, tx, 3, dt);
      this.menuLook.z = U.damp(this.menuLook.z, tz, 3, dt);
      this.menuLook.y = 1.6;
      const a = this.time * 0.13 + this.menuCar * 1.9;
      cam.position.set(this.menuLook.x + Math.cos(a) * 21, 8.5 + Math.sin(this.time * 0.3) * 2, this.menuLook.z + Math.sin(a) * 21);
      cam.lookAt(this.menuLook);
      this.camLook.set(this.menuLook.x, 0, this.menuLook.z);
      if (cam.fov !== CFG.camera.fov) {
        cam.fov = CFG.camera.fov;
        this.camFov = cam.fov;
        cam.updateProjectionMatrix();
        RR.FX.setScale(window.innerHeight * this.pixelRatio, cam.fov);
      }
    },

    /* ============================================================= audio */
    updateAudio() {
      const A = RR.Audio;
      if (!A.ready) return;
      A.listener.x = this.camLook.x;
      A.listener.z = this.camLook.z;
      const menu = this.state === 'menu';
      for (const v of this.vehicles) {
        if (!v.engineSnd) v.engineSnd = A.createEngine(v.type);
        if (!v.engineSnd) continue;
        if (this.paused) { v.engineSnd.set(0, 0, 0, 0); continue; }
        v.updateAudio(A.listener.x, A.listener.z, !menu);
      }
      const p = this.player;
      const active = !this.paused && !menu && p.alive;
      const drift = active && !p.offroad && (p.drifting || (p.input.handbrake && Math.abs(p.speed) > 8)) ? Math.min(1, Math.abs(p.lat) / 10 + 0.3) : 0;
      A.setLoop('skid', drift * 0.3);
      A.setLoop('nitro', active && (p.nitroActive || p.boostTimer > 0) ? 0.45 : 0);
      A.setLoop('wind', this.paused ? 0 : 0.1);
    },

    /* ============================================================== loop */
    loop(now) {
      requestAnimationFrame((t) => this.loop(t));
      let dtReal = (now - this.last) / 1000;
      this.last = now;
      if (!(dtReal > 0)) return;
      dtReal = Math.min(dtReal, 0.05);
      try {
        this.frame(dtReal);
      } catch (e) {
        if (!this._errShown) { console.error(e); this._errShown = true; }
      }
      RR.Input.endFrame();
    },

    frame(dtReal) {
      this.handleKeys();
      if (this.slowmoT > 0) {
        this.slowmoT -= dtReal;
        if (this.slowmoT <= 0) this.timeScale = 1;
      }
      const dt = this.paused ? 0 : dtReal * this.timeScale * this.debug.speed;
      if (dt > 0) this.simulate(dt, dtReal);
      if (!this.paused) this.updateCamera(dtReal);
      this.updateAudio();
      RR.HUD.update(dtReal);
      this.watchPerformance(dtReal);
      const cv = this.renderer.domElement;
      if (cv.width < 2 || cv.height < 2) return;
      if (cv.clientWidth > 1 && Math.abs(cv.clientWidth - window.innerWidth) > 1 && window.innerWidth > 1) this.onResize();
      if (this.useBloom) this.composer.render();
      else this.renderer.render(this.scene, this.camera);
    },

    simulate(dt, dtReal) {
      this.time += dt;
      // the race clock keeps running after you finish so rivals get real times
      const st = this.state;
      if (st === 'racing' || st === 'finished' || st === 'wrecked' || st === 'results') this.raceTime += dt;
      this.stateUpdate(dt, dtReal);
      const frozen = this.state === 'intro' || this.state === 'countdown';
      this.buildObstacleList();

      if ((this.state === 'racing' && !this.debug.autopilot) || frozen) this.readPlayerInput();
      else if (this.player.alive) this.autoDriver.update(dt);
      for (const ai of this.ais) ai.update(dt);
      if (frozen) {
        for (const v of this.vehicles) {
          if (!v.isPlayer) v.input.throttle = Math.sin(this.time * 3 + v.id * 2) > 0.3 ? 1 : 0;
          v.input.fire = v.input.rocket = v.input.mine = false;
          v.input.nitro = false;
        }
      } else {
        for (const v of this.vehicles) RR.Weapons.handle(v, dt);
        const steps = Math.max(1, Math.ceil(dt / CFG.substep));
        const h = dt / steps;
        const vs = this.vehicles;
        for (let s = 0; s < steps; s++) {
          for (const v of vs) if (!v.hidden) v.physics(h);
          for (const v of vs) {
            if (v.hidden) continue;
            v.collideWalls();
            v.collideStatics();
          }
          for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) RR.Vehicle.collide(vs[i], vs[j]);
        }
      }
      RR.Weapons.update(dt);
      RR.Pickups.update(dt);
      RR.Hazards.update(dt);
      this.updateRespawns(dt);
      this.raceProgress();
      this.resetCool -= dt;
      if (this.state === 'racing') {
        const p = this.player;
        const th = Math.atan2(p.tr.tx, p.tr.tz);
        const wrong = p.alive && Math.abs(U.wrapAngle(th - p.h)) > 1.9 && p.speed > 4;
        this.wrongT = wrong ? this.wrongT + dt : 0;
        RR.HUD.wrongWay(this.wrongT > 1.0);
      } else RR.HUD.wrongWay(false);

      for (const v of this.vehicles) { v.emitEffects(dt); v.syncVisual(dt); }
      RR.World.update(dt, this.camera, this.camLook.x, this.camLook.z);
      RR.FX.update(dt, this.camera);
      RR.FX.streaks.begin();
      RR.Weapons.render();
      RR.FX.renderStreaks();
    },

    // Debug helper: let the AI drive the player's car.
    setAutopilot(on) { this.debug.autopilot = !!on; },
  });

  window.GAME = Game;
})();
