/* ==========================================================================
   RUSTBLOOD RALLY - hud.js
   Heads-up display: position / lap / timer, speed, armour, nitro, ammo,
   opponents' health list, live minimap, floating name tags with health
   bars above rivals, off-screen arrows, damage vignette and messages.
   ========================================================================== */
(function () {
  'use strict';
  const RR = window.RR;
  const U = RR.U;
  const CFG = RR.CONFIG;
  const $ = (id) => document.getElementById(id);
  const V = new THREE.Vector3();

  const HUD = (RR.HUD = {
    visible: false,

    init(game) {
      this.game = game;
      this.el = {
        root: $('hud'), pos: $('hud-pos'), posSuf: $('hud-pos-suf'), lap: $('hud-lap'), time: $('hud-time'), best: $('hud-best'),
        opp: $('hud-opponents'), hp: $('hud-hp'), hpNum: $('hud-hp-num'), nitro: $('hud-nitro'),
        speed: $('hud-speed-num'), speedFill: $('hud-speedfill'),
        mg: $('hud-mg'), rocket: $('hud-rocket'), mine: $('hud-mine'),
        wMg: $('w-mg'), wRocket: $('w-rocket'), wMine: $('w-mine'),
        center: $('hud-center'), toasts: $('hud-toasts'), feed: $('hud-feed'),
        tags: $('hud-tags'), arrows: $('hud-arrows'), wrong: $('hud-wrongway'),
        vignette: $('vignette'), hint: $('hud-hint'),
      };
      this.cache = {};
      this.map = $('hud-minimap');
      this.mctx = this.map.getContext('2d');
      this.buildMapBase();
      this.opp = [];
      for (const v of game.vehicles) {
        if (v.isPlayer) continue;
        const row = document.createElement('div');
        row.className = 'opp';
        row.innerHTML = `<span class="opp-pos">-</span><span class="opp-name" style="color:${v.uiColor}">${v.name}</span>` +
          `<div class="opp-bar"><div class="opp-fill" style="background:${v.uiColor}"></div></div><span class="opp-status"></span>`;
        this.el.opp.appendChild(row);
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `<div class="tag-name" style="color:${v.uiColor}">${v.name}</div><div class="tag-bar"><div class="tag-fill" style="background:${v.uiColor}"></div></div>`;
        this.el.tags.appendChild(tag);
        const arrow = document.createElement('div');
        arrow.className = 'arrow';
        arrow.style.setProperty('--c', v.uiColor);
        arrow.innerHTML = '<div class="arrow-tri"></div>';
        this.el.arrows.appendChild(arrow);
        this.opp.push({
          v, row, pos: row.querySelector('.opp-pos'), fill: row.querySelector('.opp-fill'), status: row.querySelector('.opp-status'),
          tag, tagFill: tag.querySelector('.tag-fill'), arrow, hitT: 0, c: {},
        });
      }
      this.you = document.createElement('div');
      this.you.className = 'you-tag';
      this.you.innerHTML = 'YOU<div class="you-arrow"></div>';
      this.el.tags.appendChild(this.you);
      // red wedge around your car pointing at whoever just hurt you
      this.hitDir = document.createElement('div');
      this.hitDir.className = 'hitdir';
      this.el.tags.appendChild(this.hitDir);
      this.hitSrc = { x: 0, z: 0, t: 0 };
      this.dmgFlash = 0;
    },

    damageFrom(x, z) {
      this.hitSrc.x = x; this.hitSrc.z = z; this.hitSrc.t = 0.9;
    },

    setVisible(b) {
      this.visible = b;
      this.el.root.classList.toggle('hidden', !b);
    },

    clearMessages() {
      this.el.center.innerHTML = '';
      this.el.toasts.innerHTML = '';
      this.el.feed.innerHTML = '';
      this.dmgFlash = 0;
      this.el.vignette.style.opacity = '0';
      this.cache = {};
      for (const o of this.opp) o.c = {};
    },

    /* --------------------------------------------------------- minimap */
    buildMapBase() {
      const t = this.game.track, b = t.bounds;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const size = 200;
      this.map.width = size * dpr;
      this.map.height = size * dpr;
      this.map.style.width = size + 'px';
      this.map.style.height = size + 'px';
      this.mapDpr = dpr;
      const pad = 14;
      const w = b.maxX - b.minX, h = b.maxZ - b.minZ;
      const s = (size - pad * 2) / Math.max(w, h);
      this.mapS = s;
      this.mapOx = pad + (size - pad * 2 - w * s) / 2 - b.minX * s;
      this.mapOz = pad + (size - pad * 2 - h * s) / 2 - b.minZ * s;
      const base = document.createElement('canvas');
      base.width = this.map.width;
      base.height = this.map.height;
      const c = base.getContext('2d');
      c.scale(dpr, dpr);
      c.lineJoin = 'round';
      c.lineCap = 'round';
      const path = () => {
        c.beginPath();
        for (let i = 0; i <= t.N; i += 2) {
          const k = i % t.N;
          const x = t.px[k] * s + this.mapOx, y = t.pz[k] * s + this.mapOz;
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        c.closePath();
      };
      c.strokeStyle = 'rgba(15,9,5,0.85)'; c.lineWidth = 11; path(); c.stroke();
      c.strokeStyle = '#a8865f'; c.lineWidth = 7; path(); c.stroke();
      c.strokeStyle = 'rgba(70,48,30,0.7)'; c.lineWidth = 1; path(); c.stroke();
      const x0 = t.px[0] * s + this.mapOx, y0 = t.pz[0] * s + this.mapOz;
      c.strokeStyle = '#ffffff'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x0 + t.rx[0] * 7, y0 + t.rz[0] * 7); c.lineTo(x0 - t.rx[0] * 7, y0 - t.rz[0] * 7); c.stroke();
      // direction arrow after the start line
      const k = 40, ax = t.px[k] * s + this.mapOx, ay = t.pz[k] * s + this.mapOz;
      const dx = t.tx[k], dy = t.tz[k];
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(ax + dx * 6, ay + dy * 6);
      c.lineTo(ax - dx * 3 - dy * 4, ay - dy * 3 + dx * 4);
      c.lineTo(ax - dx * 3 + dy * 4, ay - dy * 3 - dx * 4);
      c.closePath(); c.fill();
      this.mapBase = base;
    },

    mapX(x) { return x * this.mapS + this.mapOx; },
    mapY(z) { return z * this.mapS + this.mapOz; },

    drawMap() {
      const c = this.mctx, dpr = this.mapDpr;
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.clearRect(0, 0, this.map.width, this.map.height);
      c.drawImage(this.mapBase, 0, 0);
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (const p of RR.Pickups.items) {
        if (!p.active) continue;
        c.fillStyle = RR.Pickups.TYPES[p.type].css;
        c.fillRect(this.mapX(p.x) - 1.6, this.mapY(p.z) - 1.6, 3.2, 3.2);
      }
      c.fillStyle = '#ff2a10';
      for (const m of RR.Weapons.mines) if (m.active) c.fillRect(this.mapX(m.x) - 1.2, this.mapY(m.z) - 1.2, 2.4, 2.4);
      const vs = this.game.vehicles;
      for (let pass = 0; pass < 2; pass++) {
        for (const v of vs) {
          if (v.hidden || (pass === 0) === v.isPlayer) continue;
          const x = this.mapX(v.x), y = this.mapY(v.z);
          const fx = Math.sin(v.h), fy = Math.cos(v.h);
          const sz = v.isPlayer ? 7 : 5.2;
          c.beginPath();
          c.moveTo(x + fx * sz, y + fy * sz);
          c.lineTo(x - fx * sz * 0.65 + fy * sz * 0.6, y - fy * sz * 0.65 - fx * sz * 0.6);
          c.lineTo(x - fx * sz * 0.65 - fy * sz * 0.6, y - fy * sz * 0.65 + fx * sz * 0.6);
          c.closePath();
          c.fillStyle = v.alive ? v.uiColor : '#4a4440';
          c.fill();
          c.lineWidth = v.isPlayer ? 2 : 1;
          c.strokeStyle = v.isPlayer ? '#ffffff' : '#000000';
          c.stroke();
        }
      }
    },

    /* ------------------------------------------------------ messages */
    center(text, cls, dur) {
      // older messages slide up so two events never print on top of each other
      for (const old of this.el.center.children) old.classList.add('pushed');
      const d = document.createElement('div');
      d.className = 'center-msg ' + (cls || '');
      d.textContent = text;
      this.el.center.appendChild(d);
      while (this.el.center.children.length > 2) this.el.center.firstChild.remove();
      setTimeout(() => d.remove(), (dur || 1.6) * 1000);
    },
    countdown(text, cls) {
      this.el.center.innerHTML = '';
      this.center(text, 'count ' + (cls || ''), 0.95);
    },
    toast(text, color) {
      const d = document.createElement('div');
      d.className = 'toast';
      d.textContent = text;
      if (color) d.style.color = color;
      this.el.toasts.appendChild(d);
      while (this.el.toasts.children.length > 3) this.el.toasts.firstChild.remove();
      setTimeout(() => d.remove(), 1500);
    },
    feed(html) {
      const d = document.createElement('div');
      d.className = 'feed-item';
      d.innerHTML = html;
      this.el.feed.appendChild(d);
      while (this.el.feed.children.length > 5) this.el.feed.firstChild.remove();
      setTimeout(() => d.remove(), 5200);
    },
    damage(amount) { this.dmgFlash = Math.min(0.85, this.dmgFlash + 0.1 + amount * 0.03); },
    hitMarker(v) {
      for (const o of this.opp) if (o.v === v) o.hitT = 0.12;
    },
    showHint(b) { this.el.hint.classList.toggle('show', b); },

    /* -------------------------------------------------------- update */
    txt(key, elm, val) {
      if (this.cache[key] !== val) { this.cache[key] = val; elm.textContent = val; }
    },
    sty(key, elm, prop, val) {
      if (this.cache[key] !== val) { this.cache[key] = val; elm.style[prop] = val; }
    },
    cls(key, elm, name, on) {
      const k = key + name;
      if (this.cache[k] !== on) { this.cache[k] = on; elm.classList.toggle(name, on); }
    },

    update(dt) {
      if (!this.visible) return;
      const g = this.game, p = g.player, el = this.el;
      this.txt('pos', el.pos, String(p.position));
      this.txt('suf', el.posSuf, U.ordinal(p.position));
      this.txt('lap', el.lap, Math.min(p.lap, CFG.laps) + '/' + CFG.laps);
      this.txt('time', el.time, U.formatTime(p.finished ? p.finishTime : g.raceTime));
      this.txt('best', el.best, isFinite(p.bestLap) ? U.formatTime(p.bestLap) : '--:--.--');

      const hp = Math.max(0, p.health / p.maxHealth);
      this.sty('hp', el.hp, 'width', (hp * 100).toFixed(1) + '%');
      this.cls('hp', el.hp, 'low', hp < 0.3);
      this.txt('hpn', el.hpNum, String(Math.ceil(Math.max(0, p.health))));
      this.sty('ni', el.nitro, 'width', (p.nitro * 100).toFixed(1) + '%');
      this.cls('ni', el.nitro, 'active', p.nitroActive);

      const kmh = Math.round(Math.abs(p.speed) * 3.6);
      this.txt('spd', el.speed, String(kmh));
      this.sty('spf', el.speedFill, 'width', Math.min(100, (kmh / 230) * 100).toFixed(1) + '%');
      this.cls('spf', el.speedFill, 'boost', p.nitroActive);

      this.txt('mg', el.mg, String(p.ammo.mg));
      this.txt('rk', el.rocket, String(p.ammo.rocket));
      this.txt('mn', el.mine, String(p.ammo.mine));
      this.cls('wmg', el.wMg, 'empty', p.ammo.mg <= 0);
      this.cls('wmg', el.wMg, 'low', p.ammo.mg > 0 && p.ammo.mg < 50);
      this.cls('wrk', el.wRocket, 'empty', p.ammo.rocket <= 0);
      this.cls('wmn', el.wMine, 'empty', p.ammo.mine <= 0);
      this.cls('wmg', el.wMg, 'firing', p.input.fire && p.ammo.mg > 0);

      for (const o of this.opp) {
        const v = o.v, c = o.c;
        const w = (Math.max(0, v.health / v.maxHealth) * 100).toFixed(0) + '%';
        if (c.w !== w) { c.w = w; o.fill.style.width = w; o.tagFill.style.width = w; }
        const pos = String(v.position);
        if (c.pos !== pos) { c.pos = pos; o.pos.textContent = pos; o.row.style.order = pos; }
        let st = '';
        if (!v.alive) st = v.respawnTimer > 0 ? 'WRECKED ' + Math.ceil(v.respawnTimer) : 'WRECKED';
        else if (v.finished) st = 'FINISHED';
        else if (v.invuln > 0) st = 'BACK!';
        if (c.st !== st) { c.st = st; o.status.textContent = st; o.row.classList.toggle('dead', !v.alive); }
        o.hitT -= dt;
      }
      this.updateTags(dt);
      this.drawMap();

      this.dmgFlash = Math.max(0, this.dmgFlash - dt * 2.2);
      const low = hp < 0.3 && p.alive ? 0.28 + Math.sin(g.time * 7) * 0.14 : 0;
      this.sty('vig', el.vignette, 'opacity', Math.min(1, this.dmgFlash + low).toFixed(2));
    },

    updateTags(dt) {
      const g = this.game, cam = g.camera, p = g.player;
      const w = window.innerWidth, h = window.innerHeight;
      for (const o of this.opp) {
        const v = o.v, c = o.c;
        let tagOn = false, arrowOn = false;
        if (!v.hidden && g.showTags) {
          V.set(v.x, 3.8 + v.y, v.z).project(cam);
          const sx = (V.x * 0.5 + 0.5) * w, sy = (-V.y * 0.5 + 0.5) * h;
          const inside = V.z < 1 && sx > 20 && sx < w - 20 && sy > 20 && sy < h - 20;
          if (inside) {
            tagOn = true;
            o.tag.style.transform = `translate(${sx.toFixed(0)}px,${sy.toFixed(0)}px)`;
            const hit = o.hitT > 0;
            if (c.hit !== hit) { c.hit = hit; o.tag.classList.toggle('hit', hit); }
            const dead = !v.alive;
            if (c.dead !== dead) { c.dead = dead; o.tag.classList.toggle('dead', dead); }
          } else if (v.alive) {
            const dist = Math.hypot(v.x - p.x, v.z - p.z);
            if (dist < 150) {
              arrowOn = true;
              let dx = sx - w / 2, dy = sy - h / 2;
              if (V.z > 1) { dx = -dx; dy = -dy; }
              const ang = Math.atan2(dy, dx);
              const m = 46;
              const k = Math.min((w / 2 - m) / Math.max(1e-3, Math.abs(dx)), (h / 2 - m) / Math.max(1e-3, Math.abs(dy)));
              o.arrow.style.transform = `translate(${(w / 2 + dx * k).toFixed(0)}px,${(h / 2 + dy * k).toFixed(0)}px) rotate(${ang.toFixed(2)}rad)`;
              o.arrow.style.opacity = (1 - dist / 170).toFixed(2);
            }
          }
        }
        if (c.tagOn !== tagOn) { c.tagOn = tagOn; o.tag.style.display = tagOn ? 'block' : 'none'; }
        if (c.arrowOn !== arrowOn) { c.arrowOn = arrowOn; o.arrow.style.display = arrowOn ? 'block' : 'none'; }
      }
      const youOn = g.showYou && !p.hidden;
      if (youOn) {
        V.set(p.x, 4.5, p.z).project(cam);
        this.you.style.transform = `translate(${((V.x * 0.5 + 0.5) * w).toFixed(0)}px,${((-V.y * 0.5 + 0.5) * h).toFixed(0)}px)`;
      }
      if (this.cache.you !== youOn) { this.cache.you = youOn; this.you.style.display = youOn ? 'block' : 'none'; }
      // damage direction indicator
      const hs = this.hitSrc;
      const hitOn = hs.t > 0 && p.alive;
      if (hitOn) {
        hs.t -= dt;
        V.set(p.x, 1, p.z).project(cam);
        const px = (V.x * 0.5 + 0.5) * w, py = (-V.y * 0.5 + 0.5) * h;
        V.set(hs.x, 1, hs.z).project(cam);
        const sx = (V.x * 0.5 + 0.5) * w, sy = (-V.y * 0.5 + 0.5) * h;
        const ang = Math.atan2(sy - py, sx - px);
        const R = 62;
        this.hitDir.style.transform = `translate(${(px + Math.cos(ang) * R).toFixed(0)}px,${(py + Math.sin(ang) * R).toFixed(0)}px) rotate(${ang.toFixed(2)}rad)`;
        this.hitDir.style.opacity = Math.min(1, hs.t * 1.6).toFixed(2);
      }
      if (this.cache.hit !== hitOn) { this.cache.hit = hitOn; this.hitDir.style.display = hitOn ? 'block' : 'none'; }
    },

    wrongWay(on) { this.cls('ww', this.el.wrong, 'hidden', !on); },
  });
})();
