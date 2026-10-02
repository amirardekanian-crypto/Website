/* scenes.js — reel 9 v2 ("slower"): the five scenes, the ball plan, the camera, the sound plan and the driver.
   Every function here is pure in t (seconds since the reel started).
   v2 (2026-10-02, Amir: "the changes are too fast, there is no time to read"): ~26 s instead of 17 s. THE TIMELINE IS ONE TABLE, T, below:
   scenes, ball and sound all read it. The rule that set the times is tools/read_audit.js: a text block needs 0.8 s + 0.25 s per word fully visible.
   The fast v1 (17 s) is in git (branch wip/reel-9-mehraneh, df7e1c4) and as export/mehraneh-site-reel-v1-fast.mp4. */
'use strict';

const DUR = 25.95;
const ZW = '‌';
const SITE = {                                                // layout numbers measured on the live site at 390 px (tools/capture_site.js)
  tennis: { total: 14552, classes: 4834, contact: 12995, record: 2899 },
  padel: { total: 13527, classes: 5119, contact: 11970, record: 2931 },
};
const TILES = {
  tennis: ['../assets/site/tennis-tile0.webp', '../assets/site/tennis-tile1.webp', '../assets/site/tennis-tile2.webp'],
  padel: ['../assets/site/padel-tile0.webp', '../assets/site/padel-tile1.webp', '../assets/site/padel-tile2.webp'],
};
const TILE_H = 4900, PK = 430 / 390;                          // css px per tile, phone px per css px

/* =====================================================================================================================
   THE TIMELINE — every time in the reel, in seconds. Change a number here and the picture, the ball and the sound all follow.
   ===================================================================================================================== */
const T = {
  // S1 · the gate
  tap1: .8, tap2: 1.4, smash: 2.0, flip: [2.0, 2.35], badgeOut: [3.7, 3.9], doors: [3.7, 4.35],
  // S2 · the name (ball: lands on the chalk, dribbles 10 hops, then up to the medal)
  mark2: 3.85, land2: 3.95, kick2: 4.0, nm1: 4.1, nm2: 4.3, bar: [4.5, 5.1], role: 4.7, wipe2: [7.2, 7.75], dribbleHops: 10,
  // S3 · A the medal
  medalDrop: [7.3, 7.85], roll: [7.35, 7.85], medalHit: 7.85, subA: [7.9, 8.35], aExit: [9.75, 10.25],
  // S3 · B the runner-up photo
  bIn: [9.8, 10.4], cardLand: 10.35, ribbon: 10.45, ring: [10.55, 10.9], cap: 10.4, cap2: [10.85, 11.25], bExit: [13.25, 13.75],
  // S3 · C the years and the national team (the blue rises; the badge pops; the ball lands on it)
  blue: [13.4, 14.0], seamLand: 13.95, yT: [13.8, 14.25], yB: [13.95, 14.4], n13: [13.8, 14.5], n2: [13.95, 14.5], badge: 14.5, badgeLand: 14.7, shield: [14.7, 15.2], cExit: [16.6, 17.0],
  // S4 · the site in two phones
  seamRot: [16.6, 17.25], phR: 16.8, phL: 16.92, t4: 17.1, phHit0: 17.5, phExit: [21.8, 22.35], seamBack: [21.9, 22.5],
  // S5 · the link
  mark5: 22.15, q5: 22.35, url: 22.75, pillLand: 23.2, bio: [23.7, 24.2], sig: [24.1, 24.6], launch: 25.4,
};

/* ---------- small DOM builders ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(name, attrs, parent) { const e = document.createElementNS(SVGNS, name); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
const DRAW = [];
function addLine(g, x1, y1, x2, y2, cls = 'ln') { const l = svgEl('line', { x1, y1, x2, y2, class: cls }, g); const len = hypot(x2 - x1, y2 - y1); l.style.strokeDasharray = len; l.style.strokeDashoffset = len; const it = { el: l, len }; DRAW.push(it); return it; }
function addRect(g, x, y, w, h, rx, cls = 'ln') { const r = svgEl('rect', { x, y, width: w, height: h, rx, class: cls }, g); const len = 2 * (w + h); r.style.strokeDasharray = len; r.style.strokeDashoffset = len; const it = { el: r, len }; DRAW.push(it); return it; }
const drawOn = (it, p) => { const v = (it.len * (1 - p)).toFixed(1); if (it._o !== v) { it.el.style.strokeDashoffset = v; it._o = v; } };
function wordify(el) {                                        // text -> word masks. Persian letters JOIN: the unit is the word
  const words = el.textContent.trim().split(/\s+/);
  el.innerHTML = words.map(w => '<span class="wm"><span class="wi">' + w + '</span></span>').join(' ');
  return [...el.querySelectorAll('.wi')];
}
const riseTo = (wi, p) => { const v = `translateY(${(118 * (1 - p)).toFixed(2)}%)`; if (wi._r !== v) { wi.style.transform = v; wi._r = v; } };

const els = {}, DR = {};
let WI = {};
function init() {
  ['s1', 's2', 's3', 's4', 's5', 'hTop', 'hBot', 'badge', 'badgeI', 'cam', 'flash', 'seam', 'splitB', 'bgsplit', 'wipe', 'mark2', 'kick2', 'g1', 'g2', 'nm1', 'nm2', 'hlbar', 'role', 's2svg',
    'gA', 'gB', 'gD', 'medal', 'disc', 'discShine', 'rankLab', 'rankCol', 'rankReel', 'rankSub', 'rCard', 'rImg', 'ring', 'ribbon', 'rCap', 'rCap2', 'shield', 'teamBadge', 'yT', 'yB', 'n13', 'n2',
    'ttl4', 'phT', 'phP', 'stT', 'stP', 'nvT', 'nvP', 'brT', 'brP', 'tbT', 'tbP', 'slot', 'slotCol', 'mark5', 'q5', 'urlpill', 'shine', 'bio', 'sig']
    .forEach(i => els[i] = document.getElementById(i));
  els.fx = document.getElementById('fx'); els.ctx = els.fx.getContext('2d');

  // S1 courts (the gate's own SVG, scaled to each half: see the site's .gh-court)
  const mk = (gid, mid1, mid2) => {
    const g = document.getElementById(gid), L = [];
    L.push(addRect(g, 171, 86, 738, 789, 14)); L.push(addLine(g, 171, 480, 909, 480)); L.push(addLine(g, 171, mid1, 909, mid1)); L.push(addLine(g, 171, mid2, 909, mid2)); L.push(addLine(g, 540, mid1, 540, mid2));
    return L;
  };
  DR.s1 = mk('court1T', 283, 678).concat(mk('court1B', 326, 635));
  // the persistent split background: one court in screen space, drawn in both colours
  DR.A = []; DR.B = [];
  for (const [gid, arr] of [['courtA', DR.A], ['courtB', DR.B]]) {
    const g = document.getElementById(gid);
    arr.push(addRect(g, 110, 170, 860, 1580, 18), addLine(g, 110, 960, 970, 960), addLine(g, 110, 660, 970, 660), addLine(g, 110, 1260, 970, 1260), addLine(g, 540, 660, 540, 1260));
  }
  // S2: faint giant court + the chalk floor the ball bounces on
  const s2 = els.s2svg;
  svgEl('rect', { x: 60, y: 200, width: 960, height: 1520, rx: 20, class: 'cl' }, s2);
  svgEl('line', { x1: 60, y1: 960, x2: 1020, y2: 960, class: 'cl' }, s2);
  DR.floor = addLine(s2, 90, FLOOR2, 990, FLOOR2, 'floor');
  // S3 digit reel: 9..1
  for (let d = 9; d >= 1; d--) { const c = document.createElement('div'); c.className = 'cell'; c.textContent = fa(d); els.rankCol.appendChild(c); }
  // word masks for headlines typed as plain text
  WI.cap = wordify(els.rCap); WI.t4 = wordify(els.ttl4);
  els.q5.innerHTML = ['آماده' + ZW + 'ای اولین جلسه', 'رو بذاریم؟'].map(line => '<div>' + line.split(' ').map(w => '<span class="wm"><span class="wi">' + w + '</span></span>').join(' ') + '</div>').join('');
  WI.q5 = [...els.q5.querySelectorAll('.wi')];
  // S4 rolling label: two stops
  ['کارنامه', 'کلاس' + ZW + 'ها و قیمت' + ZW + 'ها'].forEach(n => {
    const d = document.createElement('div'); d.className = 'it'; d.innerHTML = '<span class="tk"><svg viewBox="0 0 24 24"><path d="M5 12.5 10 17.5 19 7"/></svg></span><span>' + n + '</span>'; els.slotCol.appendChild(d);
  });
  // S4 phones: the real pages as tiles
  for (const sp of ['tennis', 'padel']) {
    const strip = sp === 'tennis' ? els.stT : els.stP;
    TILES[sp].forEach((src, i) => { const im = new Image(); im.src = src; im.style.top = (i * TILE_H * PK).toFixed(1) + 'px'; strip.appendChild(im); });
  }
  planBall();
}

/* =====================================================================================================================
   THE BALL PLAN — one rally through the whole reel. Gravity is solved per leg from the apex we ask for.
   While the viewer reads, the ball is calm: slower hops (0.6 s), then it rests; it never covers a word that is being read.
   ===================================================================================================================== */
const R0 = 62;
const GATE = { topPill: 690, botPill: 1480, badgeBottom: 1075 };
const FLOOR2 = 1480;                                          // S2's chalk floor
const L3 = { discTop: 500, cardTop: 372, seamY: 960, badgeTop: 840, ballX: 850 };   // ballX: the badge's right end, clear of the label (x 360-720) and the number (x to 772)
const L4 = { phTx: 905, phTy: 497, phPx: 175, phPy: 540 };    // phone top edges once settled (tuned on stills)
const L5 = { markTop: 250, pillTop: 875, pillX: 700 };
function planBall() {
  const legs = [], imp = [];
  const hit = (t, x, y, mag, extra = {}) => imp.push(Object.assign({ t, x, y, nx: 0, ny: -1, mag, dust: [255, 233, 232], n: 12, sparks: 6 }, extra));
  const arc = (t0, t1, p0, p1, apexY, extra = {}) => legs.push(Object.assign({ type: 'arc', t0, t1, p0, p1, apexY, w: 12 }, extra));
  const pinkDust = { dust: [236, 153, 175], ringCol: [236, 153, 175], sparkCol: [255, 255, 255] };
  const limeDust = { dust: [208, 255, 65], ringCol: [208, 255, 65], sparkCol: [255, 255, 255] };
  const chalk = { dust: [236, 153, 175], ringCol: [0, 51, 32], sparkCol: [0, 51, 32], n: 9, sparks: 5, ring: 110 };
  // hops along a surface at height y: one hop per entry of xs (after the first), `per` seconds each, `h` px high
  const hops = (t0, per, xs, y, h, mag, extra, r = R0) => {
    for (let i = 0; i < xs.length - 1; i++) {
      const a = t0 + i * per, b = a + per;
      arc(a, b, [xs[i], y - r], [xs[i + 1], y - r], y - r - h, { r0: r, w: 12 });
      hit(b, xs[i + 1], y, mag, extra);
    }
  };
  // --- S1: tap the tennis pill, tap the padel pill, smash the badge ---
  arc(.4, T.tap1, [170, -170], [470, GATE.topPill - R0], -170, { w: 11 });
  hit(T.tap1, 470, GATE.topPill, .85, Object.assign({ ring: 130, shake: 6, snd: 'ui' }, pinkDust));
  arc(T.tap1, T.tap2, [470, GATE.topPill - R0], [620, GATE.botPill - R0], 470, { w: 13 });
  hit(T.tap2, 620, GATE.botPill, .85, Object.assign({ ring: 130, shake: 6, snd: 'ui' }, limeDust));
  legs.push({ type: 'line', t0: T.tap2, t1: T.smash, p0: [620, GATE.botPill - R0], p1: [548, GATE.badgeBottom + 50], ease: E.inCubic, w: 16 });
  imp.push({ t: T.smash, x: 548, y: GATE.badgeBottom, nx: 0, ny: 1, mag: 1, ring: 260, round: .55, ringCol: [255, 255, 255], dust: [255, 255, 255], n: 14, sparks: 14, sparkCol: [255, 255, 255], shake: 20, snd: 'none' });
  legs.push({ type: 'line', t0: T.smash, t1: T.smash + .28, p0: [548, GATE.badgeBottom + 50], p1: [560, 820], ease: E.outCubic, r1: 360, w: 6, alpha: [1, 0] });
  // --- S2: drop onto the chalk floor, dribble in low quick hops (the floor is below every word), then up to the medal ---
  arc(T.land2 - .5, T.land2, [300, -170], [300, FLOOR2 - R0], -170, { w: 10 });
  hit(T.land2, 300, FLOOR2, .9, chalk);
  const dribble = [300, 380, 470, 560, 650, 740, 800, 730, 640, 550, 460];
  for (let i = 0; i < T.dribbleHops; i++) {
    const a = T.land2 + i * .3, b = a + .3, beat = i % 2 === 1;
    arc(a, b, [dribble[i], FLOOR2 - R0], [dribble[i + 1], FLOOR2 - R0], FLOOR2 - R0 - 72, { w: 14 });
    hit(b, dribble[i + 1], FLOOR2, beat ? .85 : .5, beat ? chalk : Object.assign({}, chalk, { ring: 0, n: 5, sparks: 0 }));
  }
  const dEnd = T.land2 + T.dribbleHops * .3;
  arc(dEnd, T.medalHit, [dribble[T.dribbleHops], FLOOR2 - R0], [540, L3.discTop - R0], 200, { w: 13 });
  // --- S3 · A: the medal swings with every tap ---
  hit(T.medalHit, 540, L3.discTop, 1, Object.assign({ ring: 170, shake: 12, n: 14, sparks: 10, medal: true }, pinkDust));
  hops(T.medalHit, .6, [540, 470, 610, 540], L3.discTop, 240, .8, Object.assign({ ring: 110, shake: 4, medal: true }, pinkDust));
  const aEnd = T.medalHit + 1.8;
  // --- S3 · B: onto the photo card; hops along its top edge (never over her face) ---
  arc(aEnd, T.cardLand, [540, L3.discTop - R0], [820, L3.cardTop - R0], 110, { w: 10 });
  hit(T.cardLand, 820, L3.cardTop, .9, Object.assign({ ring: 130, shake: 8 }, pinkDust));
  hops(T.cardLand, .6, [820, 700, 600, 700, 820], L3.cardTop, 260, .75, Object.assign({ ring: 100, shake: 3 }, pinkDust));
  const bEnd = T.cardLand + 2.4;
  // --- S3 · C: onto the seam as the blue arrives, then onto the team badge ---
  arc(bEnd, T.seamLand, [820, L3.cardTop - R0], [L3.ballX, L3.seamY - R0], 150, { w: 11 });
  hit(T.seamLand, L3.ballX, L3.seamY, 1, Object.assign({ ring: 230, round: .45, shake: 14, n: 14, sparks: 12, ringCol: [255, 255, 255], snd: 'none' }, { dust: [255, 255, 255], sparkCol: [255, 255, 255] }));
  arc(T.seamLand, T.badgeLand, [L3.ballX, L3.seamY - R0], [L3.ballX, L3.badgeTop - R0], 500, { w: 12 });
  hit(T.badgeLand, L3.ballX, L3.badgeTop, .9, Object.assign({ ring: 140, shake: 6 }, pinkDust));
  hops(T.badgeLand, .6, [L3.ballX, L3.ballX - 15, L3.ballX + 5, L3.ballX - 5], L3.badgeTop, 220, .7, Object.assign({ ring: 100 }, pinkDust));
  const cEnd = T.badgeLand + 1.8;
  // --- S4: a rally between the two phones, every 0.6 s, low enough to stay under the title (tools/read_audit.js counts a covered word as unread) ---
  arc(cEnd, T.phHit0, [L3.ballX - 5, L3.badgeTop - R0], [L4.phTx, L4.phTy - R0], 60, { w: 11 });
  hit(T.phHit0, L4.phTx, L4.phTy, .9, Object.assign({ ring: 140, shake: 6, phone: 'T' }, pinkDust));
  let last = [L4.phTx, L4.phTy], tH = T.phHit0;
  for (let i = 0; i < 7; i++) {
    const who = i % 2 === 0 ? 'P' : 'T', to = who === 'P' ? [L4.phPx, L4.phPy] : [L4.phTx, L4.phTy];
    arc(tH, tH + .6, [last[0], last[1] - R0], [to[0], to[1] - R0], Math.min(last[1], to[1]) - R0 - 24, { w: 13 });   // a low volley: the title above is never covered
    hit(tH + .6, to[0], to[1], .85, Object.assign({ ring: 120, shake: 4, phone: who }, who === 'P' ? limeDust : pinkDust));
    last = to; tH += .6;
  }
  // --- S5: the mark, the link, a calm rest, and out through the top (where the reel loops back in) ---
  arc(tH, 22.6, [L4.phPx, L4.phPy - R0], [540, L5.markTop - R0], 60, { w: 11 });
  hit(22.6, 540, L5.markTop, .9, Object.assign({ ring: 130, shake: 5 }, pinkDust));
  arc(22.6, T.pillLand, [540, L5.markTop - R0], [L5.pillX, L5.pillTop - 50], 120, { r1: 50, w: 12 });
  hit(T.pillLand, L5.pillX, L5.pillTop, 1, Object.assign({ ring: 200, round: .4, shake: 12, n: 14, sparks: 10, pill: true }, { dust: [255, 233, 232], ringCol: [236, 153, 175], sparkCol: [255, 255, 255] }));
  arc(T.pillLand, T.pillLand + .45, [L5.pillX, L5.pillTop - 50], [L5.pillX - 90, L5.pillTop - 50], L5.pillTop - 50 - 95, { r0: 50, w: 10 });
  hit(T.pillLand + .45, L5.pillX - 90, L5.pillTop, .55, Object.assign({ ring: 80, n: 6, sparks: 3, pill: true }, pinkDust));
  arc(T.pillLand + .45, T.pillLand + .8, [L5.pillX - 90, L5.pillTop - 50], [L5.pillX - 170, L5.pillTop - 50], L5.pillTop - 50 - 60, { r0: 50, w: 8 });
  hit(T.pillLand + .8, L5.pillX - 170, L5.pillTop, .35, Object.assign({ ring: 0, n: 4, sparks: 0, pill: true }, pinkDust));
  legs.push({ type: 'hold', t0: T.pillLand + .8, t1: T.launch, p0: [L5.pillX - 170, L5.pillTop - 50], r0: 50, w: 0 });
  arc(T.launch, T.launch + .6, [L5.pillX - 170, L5.pillTop - 50], [170, -170], 100, { r0: 50, r1: R0, w: 12 });
  Ball.legs = prepLegs(legs); Ball.impacts = imp;
}

/* ball tint: pink in tennis land, lime in padel land; it changes colour as it crosses the S1 seam */
function tintAt(b) {
  if (b.t < T.smash + .1) return mixTint(TINTS.pink, TINTS.lime, sstep((b.y - 900) / 120));
  // on the phones the ball takes the colour of the court it is over: lime on the padel (left) phone, pink on the tennis (right) one
  if (b.t > T.phHit0 - .3 && b.t < T.phExit[0]) return mixTint(TINTS.lime, TINTS.pink, sstep((b.x - 400) / 280));
  return TINTS.pink;
}

/* =====================================================================================================================
   CAMERA — a slow push per scene + shake on the big hits
   ===================================================================================================================== */
function camera(t) {
  let s = 1, x = 0, y = 0, r = 0;
  s += .035 * (E.soft(prog(t, 3.9, T.wipe2[0])) - E.soft(prog(t, T.wipe2[0], T.wipe2[1])));
  s += .03 * (E.soft(prog(t, T.seamRot[0], T.phExit[0])) - E.soft(prog(t, T.phExit[0], T.phExit[1] + .1)));
  s += .02 * E.soft(prog(t, T.phExit[1], T.launch));
  for (const im of Ball.impacts) {
    if (!im.shake) continue;
    const dt = t - im.t; if (dt < 0 || dt > .5) continue;
    const k = Math.exp(-dt / .09);
    x += Math.sin(dt * 95 + im.t) * im.shake * k; y += Math.cos(dt * 83 + 1) * im.shake * k * .8; r += Math.sin(dt * 60) * im.shake * .016 * k;
  }
  return { s, x, y, r };
}
/* how hard something was just hit (1 -> 0): used to press pills, phones, the mark */
function pressAt(t, test) {
  let a = 0;
  for (const im of Ball.impacts) if (test(im)) { const dt = t - im.t; if (dt >= 0 && dt < .4) a = Math.max(a, im.mag * Math.exp(-dt / .09)); else if (dt < 0 && dt > -.03) a = Math.max(a, im.mag * .3); }
  return a;
}

/* =====================================================================================================================
   THE SPLIT BACKGROUND — spruce (tennis) | blue (padel); the seam rises, turns a quarter, and turns back
   ===================================================================================================================== */
function splitParams(t) {
  let alpha = 90, d = 1100;
  d = lerp(1100, 0, E.inOutCubic(prog(t, T.blue[0], T.blue[1])));
  alpha = lerp(90, 180, E.inOutCubic(prog(t, T.seamRot[0], T.seamRot[1])));
  alpha = lerp(alpha, 90, E.inOutCubic(prog(t, T.seamBack[0], T.seamBack[1])));
  return { alpha, d };
}
function paintSplit(t) {
  const { alpha, d } = splitParams(t), a = alpha * Math.PI / 180, nx = Math.cos(a), ny = Math.sin(a), ux = -ny, uy = nx, L = 4200;
  const px = 540 + nx * d, py = 960 + ny * d;
  const P = [[px - ux * L, py - uy * L], [px + ux * L, py + uy * L], [px + ux * L + nx * L, py + uy * L + ny * L], [px - ux * L + nx * L, py - uy * L + ny * L]];
  setStyle(els.splitB, 'clipPath', 'polygon(' + P.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')');
  put(els.seam, { x: nx * d, y: ny * d, r: alpha - 90 });
  const gp = (arr, t0) => arr.forEach((it, i) => drawOn(it, E.outCubic(prog(t, t0 + i * .05, t0 + .7 + i * .05))));
  gp(DR.A, T.wipe2[1] - .3); gp(DR.B, T.blue[1] - .3);
}

/* =====================================================================================================================
   S1 — THE GATE (0 – 4.35 s). «تنیس یا پدل؟» … «هر دو.»
   ===================================================================================================================== */
function sceneGate(t) {
  const on = t < T.doors[1] + .1; show(els.s1, on); if (!on) return;
  DR.s1.forEach((it, i) => drawOn(it, E.outCubic(prog(t, (i % 5) * .06, .8 + (i % 5) * .06))));
  const door = E.inOutCubic(prog(t, T.doors[0], T.doors[1]));
  put(els.hTop, { y: -1010 * door }); put(els.hBot, { y: 1010 * door });
  const topWord = els.hTop.querySelector('.word'), botWord = els.hBot.querySelector('.word');
  const br = 1 + .012 * Math.sin(t * 2.6);
  put(topWord, { s: (.82 + .18 * spring(t - .05, 3.4, .5)) * br, o: .3 + .7 * prog(t, 0, .22) }); put(botWord, { s: (.82 + .18 * spring(t - .18, 3.4, .5)) / br, o: .3 + .7 * prog(t, .1, .35) });
  const kT = els.hTop.querySelector('.kick'), kB = els.hBot.querySelector('.kick');
  put(kT, { y: 18 * (1 - E.house(prog(t, .1, .55))), o: prog(t, .1, .45) }); put(kB, { y: 18 * (1 - E.house(prog(t, .22, .65))), o: prog(t, .22, .55) });
  const pT = els.hTop.querySelector('.pill'), pB = els.hBot.querySelector('.pill');
  const pr1 = pressAt(t, im => im.t === T.tap1), pr2 = pressAt(t, im => im.t === T.tap2);
  put(pT, { sx: spring(t - .3, 3.6, .48), sy: spring(t - .3, 3.6, .48) * (1 - .18 * pr1), y: 12 * pr1, o: prog(t, .3, .45) });
  put(pB, { sx: spring(t - .42, 3.6, .48), sy: spring(t - .42, 3.6, .48) * (1 - .18 * pr2), y: 12 * pr2, o: prog(t, .42, .57) });
  const pop = spring(t - .28, 3.2, .42), flip = E.outBack(prog(t, T.flip[0], T.flip[1] + .05), 2.2), outS = 1 - E.inCubic(prog(t, T.badgeOut[0], T.badgeOut[1]));
  put(els.badge, { s: pop * outS * (1 + .16 * bump(t, T.smash, T.smash + .45, .2)), o: prog(t, .28, .36) * outS });
  put(els.badgeI, { rx: 180 * flip });
  setStyle(els.flash, 'opacity', (bump(t, T.smash - .005, T.smash + .12, .15) * .34 + bump(t, T.seamLand - .005, T.seamLand + .1, .2) * .22 + bump(t, T.pillLand - .005, T.pillLand + .1, .2) * .18).toFixed(3));
}

/* =====================================================================================================================
   S2 — THE NAME (3.4 – 7.75 s). Each word has time to be read; then the whole page wipes upward
   ===================================================================================================================== */
function sceneName(t) {
  const on = t > T.doors[0] - .3 && t < T.wipe2[1] + .1; show(els.s2, on); show(els.wipe, on && t > T.wipe2[0] - .1); if (!on) return;
  drawOn(DR.floor, E.outCubic(prog(t, T.land2 - .45, T.land2)));
  put(els.g1, { x: 60 * Math.sin(t * .7), y: 36 * Math.cos(t * .55) }); put(els.g2, { x: -50 * Math.sin(t * .6 + 1), y: 40 * Math.cos(t * .5) });
  const m = spring(t - T.mark2, 3.0, .5);
  put(els.mark2, { y: -340 * (1 - m), s: .6 + .4 * Math.min(1.2, m), r: -8 * (1 - Math.min(1, m)), o: prog(t, T.mark2, T.mark2 + .12) });
  put(els.kick2, { y: 30 * (1 - E.house(prog(t, T.kick2, T.kick2 + .45))), o: prog(t, T.kick2, T.kick2 + .3) });
  riseTo(els.nm1.querySelector('.wi'), E.house(prog(t, T.nm1, T.nm1 + .8))); riseTo(els.nm2.querySelector('.wi'), E.house(prog(t, T.nm2, T.nm2 + .8)));
  const pulse = 1 + .03 * bump(t, 5.0, 5.35, .2); put(els.nm1, { s: pulse }); put(els.nm2, { s: pulse });
  put(els.hlbar, { sx: E.house(prog(t, T.bar[0], T.bar[1])) });
  put(els.role, { s: spring(t - T.role, 3.4, .5), o: prog(t, T.role, T.role + .13) });
  const w = E.inOutCubic(prog(t, T.wipe2[0], T.wipe2[1]));
  setStyle(els.s2, 'clipPath', w > 0 ? `inset(0 0 ${(w * 1930).toFixed(1)}px 0)` : 'none');
  put(els.wipe, { y: -w * 1930 });
}

/* =====================================================================================================================
   S3 — THE RECORD (7.2 – 17 s): rank 1, the runner-up trophy, 13 and 2 years with the national team
   ===================================================================================================================== */
function sceneRecord(t) {
  const on = t > T.wipe2[0] - .1 && t < T.cExit[1] + .2; show(els.s3, on); if (!on) return;
  // --- A: رنکینگ ۱ — a medal that drops on its ribbons, rolls to 1, and swings with every tap ---
  const aOn = t < T.aExit[1] + .1; show(els.gA, aOn);
  if (aOn) {
    const exit = E.inCubic(prog(t, T.aExit[0], T.aExit[1]));
    put(els.gA, { x: -1200 * exit });
    const drop = E.outBack(prog(t, T.medalDrop[0], T.medalDrop[1]), 1.15);
    let swing = (1 - drop) * -6;
    for (const im of Ball.impacts) if (im.medal) { const dt = t - im.t; if (dt >= 0) swing += 7 * im.mag * Math.exp(-dt / .85) * Math.sin(dt * TAU * 1.25); }
    put(els.medal, { y: -900 * (1 - drop), r: swing });
    const roll = E.outCubic(prog(t, T.roll[0], T.roll[1]));
    els.rankCol.style.transform = `translateY(${(-8 * 380 * roll).toFixed(2)}px)`;
    put(els.discShine, { x: lerp(0, 1000, E.inOutCubic(prog(t, T.medalHit, T.medalHit + .5))) });
    put(els.rankSub, { y: 40 * (1 - E.house(prog(t, T.subA[0], T.subA[1]))), o: prog(t, T.subA[0], T.subA[0] + .25) });
  }
  // --- B: the runner-up card ---
  const bOn = t > T.bIn[0] - .1 && t < T.bExit[1] + .1; show(els.gB, bOn);
  if (bOn) {
    const enter = E.house(prog(t, T.bIn[0], T.bIn[1])), exit = E.inCubic(prog(t, T.bExit[0], T.bExit[1]));
    put(els.gB, { x: 1250 * (1 - enter) - 1250 * exit });
    put(els.rCard, { r: lerp(-15, -3.5, enter), s: lerp(.92, 1, enter), y: 14 * Math.sin((t - T.cardLand) * 2.2) });
    els.rImg.style.transform = `scale(${(1 + .14 * E.soft(prog(t, T.bIn[0] + .2, T.bExit[0]))).toFixed(4)})`;
    const rp = prog(t, T.ring[0], T.ring[1]);                                         // the ring finds the plaque
    put(els.ring, { s: lerp(2.6, 1, E.house(rp)) * (1 + .06 * Math.sin((t - T.ring[1]) * 9) * (rp >= 1 ? 1 : 0)), o: E.outCubic(rp) * .95 });
    put(els.ribbon, { s: spring(t - T.ribbon, 3.4, .45), r: -5, o: prog(t, T.ribbon, T.ribbon + .1) });
    WI.cap.forEach((wi, i) => riseTo(wi, E.house(prog(t, T.cap + i * .15, T.cap + .75 + i * .15))));
    put(els.rCap2, { y: 24 * (1 - E.house(prog(t, T.cap2[0], T.cap2[1]))), o: prog(t, T.cap2[0], T.cap2[0] + .3) });
  }
  // --- C: ۱۳ سال تنیس | ۲ سال پدل, and the national team ---
  const dOn = t > T.blue[0] - .1 && t < T.cExit[1] + .1; show(els.gD, dOn);
  if (dOn) {
    const exit = E.inCubic(prog(t, T.cExit[0], T.cExit[1]));
    put(els.gD, { o: 1 - exit, s: 1 + .35 * exit });
    els.n13.textContent = fa(Math.round(13 * E.outQuart(prog(t, T.n13[0], T.n13[1])))); els.n2.textContent = fa(Math.round(2 * E.outQuart(prog(t, T.n2[0], T.n2[1]))));
    put(els.yT, { y: 60 * (1 - E.house(prog(t, T.yT[0], T.yT[1]))), o: prog(t, T.yT[0], T.yT[0] + .25) });
    put(els.yB, { y: 60 * (1 - E.house(prog(t, T.yB[0], T.yB[1]))), o: prog(t, T.yB[0], T.yB[0] + .25) });
    const bp = pressAt(t, im => im.y === L3.badgeTop), ps = spring(t - T.badge, 3.4, .5);
    put(els.teamBadge, { sx: ps, sy: ps * (1 - .1 * bp), y: 10 * bp, o: prog(t, T.badge, T.badge + .1) });
    els.shield.querySelectorAll('path').forEach((p, i) => { const v = (1 - E.outCubic(prog(t, T.shield[0] + i * .15, T.shield[1] + i * .15))).toFixed(3); if (p._v !== v) { p.style.strokeDashoffset = v; p._v = v; } });
  }
}

/* =====================================================================================================================
   S4 — THE SITE, IN TWO PHONES (16.6 – 22.4 s)
   ===================================================================================================================== */
function keyScroll(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) { const [t0, y0] = keys[i - 1], [t1, y1] = keys[i]; return lerp(y0, y1, E.inOutCubic(prog(t, t0, t1))); }
  }
  return keys[keys.length - 1][1];
}
/* the hero is held first, then the record gets a real dwell, then the classes get one; labels follow (tennis phone leads by 0.1 s) */
function scrollKeys(sp) {
  const S = SITE[sp], d = sp === 'tennis' ? 0 : .1;
  return [[T.phR + .1 + d, 0], [17.8 + d, 0], [18.4 + d, S.record], [19.6 + d, S.record + 70], [20.2 + d, S.classes], [21.5 + d, S.classes + 60]];
}
function paintPhone(sp, t) {
  const S = SITE[sp], k = sp === 'tennis' ? 'T' : 'P';
  const wrap = els['ph' + k], strip = els['st' + k], nav = els['nv' + k], bar = els['br' + k], tb = els['tb' + k];
  const right = sp === 'tennis';
  const t0 = right ? T.phR : T.phL;
  const sp1 = spring(t - t0, 2.6, .55), o = prog(t, t0, t0 + .1);
  const fin = right ? { x: 790, y: 990, ry: -13, r: 3.5 } : { x: 290, y: 1035, ry: 13, r: -3.5 };
  const from = right ? { x: 1500, y: 2150, ry: -45, r: 24 } : { x: -420, y: 2250, ry: 45, r: -24 };
  const ex = E.inCubic(prog(t, T.phExit[0], T.phExit[1]));
  const to = right ? { x: 1000, y: -700, r: 22 } : { x: -950, y: 900, r: -22 };
  const press = pressAt(t, im => im.phone === k);
  const bob = Math.sin((t - T.phR) * 1.7 + (right ? 0 : 2)) * 7;
  const x = lerp(from.x, fin.x, sp1) + (to.x - fin.x) * ex, y = lerp(from.y, fin.y, sp1) + (to.y - fin.y) * ex + bob + 16 * press;
  const ry = lerp(from.ry, fin.ry, Math.min(sp1, 1.15)) + Math.sin((t - T.phR) * 1.3 + (right ? 0 : 1.7)) * 1.6, rz = lerp(from.r, fin.r, sp1) + (to.r - fin.r) * ex;
  put(wrap, { x: x - 233, y: y - 483, o });
  put(wrap.firstElementChild, { ry, r: rz, s: 1.04 });
  const sy = keyScroll(t, scrollKeys(sp));                                              // the page scrolls
  put(strip, { y: -sy * PK });
  put(nav, { o: sstep(prog(sy, 20, 70)) });
  bar.style.transform = `translateY(${(110 * (1 - E.house(prog(sy, 600, 760)))).toFixed(2)}%)`;
  tb.style.width = (clamp(sy / (S.total - 844)) * 100).toFixed(2) + '%';
  return sy;
}
const SLOT_STOPS = [[18.2, 0], [20.0, 1]];                     // [time, label index]: «کارنامه» as the record arrives, «کلاس‌ها و قیمت‌ها» as the classes do
function sceneSite(t) {
  const on = t > T.seamRot[0] - .1 && t < T.phExit[1] + .1; show(els.s4, on); if (!on) return;
  WI.t4.forEach((wi, i) => riseTo(wi, E.house(prog(t, T.t4 + i * .14, T.t4 + .7 + i * .14)) * (1 - E.inCubic(prog(t, T.phExit[0], T.phExit[0] + .35)))));
  paintPhone('tennis', t); paintPhone('padel', t);
  let idx = 0, rollT = SLOT_STOPS[0][0]; for (const [ts, i] of SLOT_STOPS) if (t >= ts) { idx = i; rollT = ts; }
  const u = idx === 0 ? 1 : E.house(prog(t, rollT, rollT + .35));
  els.slotCol.style.transform = `translateY(${(-lerp(Math.max(0, idx - 1), idx, u) * 112).toFixed(2)}px)`;
  const s0 = SLOT_STOPS[0][0] - .1, sIn = spring(t - s0, 3.4, .5), sOut = E.inCubic(prog(t, T.phExit[0], T.phExit[0] + .35));
  put(els.slot, { s: sIn * (1 - sOut), y: 60 * sOut, o: prog(t, s0, s0 + .1) * (1 - sOut) });
}

/* =====================================================================================================================
   S5 — THE END CARD (22 – 26 s): the same question the site asks, the link, the name
   ===================================================================================================================== */
function sceneEnd(t) {
  const on = t > T.phExit[0] + .2; show(els.s5, on); if (!on) return;
  const m = spring(t - T.mark5, 3.0, .5), pm = pressAt(t, im => im.y === L5.markTop);
  put(els.mark5, { y: -300 * (1 - m) + 14 * pm, s: (.6 + .4 * Math.min(1.2, m)) * (1 - .06 * pm), r: -8 * (1 - Math.min(1, m)), o: prog(t, T.mark5, T.mark5 + .12) });
  WI.q5.forEach((wi, i) => riseTo(wi, E.house(prog(t, T.q5 + i * .14, T.q5 + .8 + i * .14))));
  const pp = pressAt(t, im => im.pill), ps = spring(t - T.url, 3.2, .5);
  put(els.urlpill, { sx: ps, sy: ps * (1 - .1 * pp), y: 10 * pp, o: prog(t, T.url, T.url + .12) });
  put(els.shine, { x: lerp(0, 1200, E.inOutCubic(prog(t, T.pillLand + 1.0, T.pillLand + 1.7))) });
  put(els.bio, { y: 34 * (1 - E.house(prog(t, T.bio[0], T.bio[1]))), o: prog(t, T.bio[0], T.bio[0] + .3) });
  els.bio.querySelector('svg').style.transform = `translateY(${(Math.sin((t - T.bio[0] - .3) * 7) * 8 * (t > T.bio[0] + .3 ? 1 : 0)).toFixed(2)}px)`;
  put(els.sig, { y: 30 * (1 - E.house(prog(t, T.sig[0], T.sig[1]))), o: prog(t, T.sig[0], T.sig[0] + .35) });
}

/* =====================================================================================================================
   MASTER RENDER
   ===================================================================================================================== */
function drawFx(t) {
  const ctx = els.ctx; ctx.clearRect(0, 0, W, H);
  // speed streaks: under the rising wipe, and across the conveyor moves
  if (t > T.wipe2[0] && t < T.wipe2[1] + .1) { const w = E.inOutCubic(prog(t, T.wipe2[0], T.wipe2[1])); ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * clamp((t - T.wipe2[0]) / .6)) * .9; drawStreaksUp(ctx, t, 1920 - w * 1930, 'wipe', 11); ctx.restore(); }
  drawStreaksH(ctx, t, 'h1', [T.aExit[0] - .05, T.aExit[1] + .1], 21, 26);
  drawStreaksH(ctx, t, 'h2', [T.bExit[0] - .05, T.bExit[1] + .1], 31, 24);
  drawStreaksH(ctx, t, 'h3', [T.phExit[0] - .05, T.phExit[1] + .1], 41, 26, [255, 255, 255], [208, 255, 65]);
  const NB = Q.has('noball');                                  // ?noball=1 = a clean frame (the cover): no ball, trail, dust, rings or confetti
  if (!NB) { drawTrail(ctx, t, b => tintAt(Object.assign({ t }, b))); drawBursts(ctx, t); }
  const b = NB ? null : ballState(t);
  if (b) {
    b.t = t; b.sq = squashAt(t);
    let al = 1; if (b.L.alpha) al = lerp(b.L.alpha[0], b.L.alpha[1], clamp((t - b.L.t0) / b.L.T));
    if (al > .01) drawBall(ctx, b, tintAt(b), al);
  }
  if (!NB) drawConfetti(ctx, t, T.pillLand, 700, 850, 42, 99);   // the site is live
}
function render(t) {
  t = clamp(t, 0, DUR);
  const c = camera(t);
  put(els.cam, { x: c.x, y: c.y, s: c.s, r: c.r });
  paintSplit(t);
  sceneEnd(t); sceneSite(t); sceneRecord(t); sceneName(t); sceneGate(t);
  drawFx(t);
}

/* =====================================================================================================================
   SOUND PLAN — the cues tools/make_sfx.py turns into audio, all read from T. The bounces come straight from Ball.impacts.
   ===================================================================================================================== */
function soundPlan() {
  const C = [], add = (t, k, o) => C.push(Object.assign({ t, k }, o || {}));
  // S1 — the gate
  add(.34, 'fall', { dur: .46 }); add(.28, 'pop', { f: 520, pan: 0 }); add(.30, 'pop', { f: 440, pan: -.25 }); add(.42, 'pop', { f: 392, pan: .25 });
  add(T.tap2, 'riser', { dur: T.smash - T.tap2 }); add(T.smash, 'smash'); add(T.smash, 'whoosh', { dur: .26, f0: 3200, f1: 260, pan: 0 }); add(T.doors[0], 'doors', { dur: T.doors[1] - T.doors[0] });
  // S2 — the name
  add(T.mark2, 'bloop'); add(T.kick2, 'swish', { pan: 0 }); add(T.nm1, 'swish', { pan: .15 }); add(T.nm2, 'swish', { pan: -.15 }); add(T.bar[0], 'zip', { pan: .2 }); add(T.role, 'pop', { f: 610, pan: 0 });
  add(T.wipe2[0], 'wipe', { dur: T.wipe2[1] - T.wipe2[0] });
  // S3 · A — the medal
  add(T.medalDrop[0], 'fall', { dur: .55, f0: 1100, f1: 240 });
  for (let k = 1; k <= 8; k++) add(T.roll[0] + (T.roll[1] - T.roll[0]) * (1 - Math.pow(1 - k / 8, 1 / 3)), 'tick', { f: 1500 + k * 90, pan: 0, vol: .55 });
  add(T.medalHit, 'bell', { f: 784 }); add(T.medalHit, 'shimmer', { dur: .55 }); add(T.subA[0], 'swish', { pan: 0 });
  add(T.aExit[0], 'whoosh', { dur: .55, f0: 300, f1: 2600, pan: .6, pan1: -.6 });
  // S3 · B — the photo
  add(T.cardLand, 'slap'); [0, 1, 2].forEach(i => add(T.cap + i * .15, 'swish', { pan: .1 })); add(T.ribbon, 'pop', { f: 700, pan: -.3 }); add(T.ring[0] + .15, 'ping', { f: 1760 }); add(T.cap2[0], 'swish', { pan: 0 });
  add(T.bExit[0], 'whoosh', { dur: .5, f0: 300, f1: 2600, pan: .6, pan1: -.6 });
  // S3 · C — years and the team (a tick whenever a displayed number changes)
  add(T.blue[0], 'riser', { dur: .55 });
  for (let n = 1, last = 0; n <= 120; n++) { const tt = T.n13[0] + (T.n13[1] - T.n13[0]) * n / 120, v = Math.round(13 * E.outQuart(prog(tt, T.n13[0], T.n13[1]))); if (v !== last) { add(tt, 'tick', { f: 1900 + v * 40, pan: -.2, vol: .45 }); last = v; } }
  for (let n = 1, last = 0; n <= 120; n++) { const tt = T.n2[0] + (T.n2[1] - T.n2[0]) * n / 120, v = Math.round(2 * E.outQuart(prog(tt, T.n2[0], T.n2[1]))); if (v !== last) { add(tt, 'tick', { f: 1500 + v * 200, pan: .25, vol: .5 }); last = v; } }
  add(T.seamLand, 'boom'); add(T.shield[0], 'draw', { dur: .5 }); add(T.badge, 'pop', { f: 560, pan: 0 });
  // S4 — the site
  add(T.seamRot[0], 'whoosh', { dur: .65, f0: 200, f1: 1800, pan: -.5, pan1: .5 }); add(T.phR, 'whoosh', { dur: .5, f0: 250, f1: 2200, pan: .7, pan1: .1 }); add(T.phL, 'whoosh', { dur: .5, f0: 250, f1: 2200, pan: -.7, pan1: -.1 });
  add(T.phL + .5, 'thud', { vol: .5 }); [0, 1, 2].forEach(i => add(T.t4 + i * .14, 'swish', { pan: [.3, 0, -.3][i] }));
  add(SLOT_STOPS[0][0] - .1, 'pop', { f: 640, pan: 0, vol: .6 }); SLOT_STOPS.forEach(([ts], i) => { if (i) add(ts, 'tick', { f: 1800 + i * 160, pan: 0, vol: .6 }); });
  // S5 — the end card
  add(T.phExit[0], 'whoosh', { dur: .55, f0: 400, f1: 2800, pan: 0, pan1: 0 });
  add(T.mark5, 'bloop', { pan: 0 }); [0, 1, 2, 3, 4].forEach(i => add(T.q5 + i * .14, 'swish', { pan: .1 - i * .05, vol: .7 }));
  add(T.url, 'pop', { f: 480, pan: 0 }); add(T.pillLand, 'confetti'); add(T.pillLand, 'pad', { dur: 2.6 }); add(T.bio[0], 'pop', { f: 700, pan: 0, vol: .6 }); add(T.sig[0], 'swish', { pan: 0 });
  add(T.launch, 'launch', { dur: .55 });
  return C;
}
function scrollEnv() {                                         // |scroll speed| of each phone at 50 Hz, for a velocity-following swish
  const out = [], kT = scrollKeys('tennis'), kP = scrollKeys('padel');
  for (let t = T.phR; t <= T.phExit[0]; t += .02) { const d = .01, v = a => Math.abs(keyScroll(t + d, a) - keyScroll(t - d, a)) / (2 * d); out.push({ t: +t.toFixed(3), a: v(kT), b: v(kP) }); }
  return out;
}

/* =====================================================================================================================
   DRIVER — default (autoplay, loop, fit to window), ?t=SECONDS (frozen), ?capture=1 (exact size, driven by the renderer)
   ===================================================================================================================== */
const Q = new URLSearchParams(location.search);
const CAPTURE = Q.has('capture');
document.body.classList.toggle('capture', CAPTURE);
function fit() {
  if (CAPTURE) { $('#fit').style.transform = 'none'; return; }
  const s = Math.min(innerWidth / W, (innerHeight - (Q.has('t') ? 0 : 46)) / H);
  $('#fit').style.transform = `translate(${(innerWidth - W * s) / 2}px,0) scale(${s})`;
}
addEventListener('resize', fit);
window.__DUR = DUR;
window.__render = t => { render(t); };
window.__sound = () => ({ dur: DUR, impacts: Ball.impacts.map(i => ({ t: i.t, x: i.x, y: i.y, mag: i.mag, snd: i.snd || null, phone: i.phone || null, pill: !!i.pill, medal: !!i.medal })), cues: soundPlan(), scroll: scrollEnv() });
window.__ready = (async () => {
  try {
    await Promise.all([document.fonts.load('400 100px Lalezar', 'مهرانه ظهوریان تنیس پدل ۰۱۲۳۴۵۶۷۸۹ م'), document.fonts.load('600 40px Vazirmatn', 'سلام'), document.fonts.load('700 40px Vazirmatn', 'سلام'), document.fonts.load('800 40px Vazirmatn', 'سلام')]);
    await document.fonts.ready;
  } catch (e) { }
  init(); fit();
  try { await Promise.all([...document.images].map(i => i.decode ? i.decode().catch(() => { }) : 0)); } catch (e) { }
  render(Q.has('t') ? +Q.get('t') : 0);
  window.__isReady = true;
  return true;
})();

if (!CAPTURE && !Q.has('t')) {
  let playing = true, t0 = performance.now(), tNow = 0;
  window.__ready.then(() => {
    const ppEl = $('#pp'), tt = $('#tt'), bar = $('#bar'), bari = $('#bari');
    const loop = now => {
      if (playing) tNow = ((now - t0) / 1000) % (DUR + .4);
      render(Math.min(tNow, DUR)); tt.textContent = Math.min(tNow, DUR).toFixed(2); bari.style.width = (Math.min(tNow, DUR) / DUR * 100) + '%';
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    ppEl.onclick = () => { playing = !playing; ppEl.textContent = playing ? '⏸' : '▶'; if (playing) t0 = performance.now() - tNow * 1000; };
    bar.onclick = e => { const r = bar.getBoundingClientRect(); tNow = (e.clientX - r.left) / r.width * DUR; t0 = performance.now() - tNow * 1000; };
    addEventListener('keydown', e => {
      if (e.code === 'Space') { e.preventDefault(); ppEl.onclick(); }
      if (e.code === 'ArrowRight') { tNow = Math.min(DUR, tNow + .1); t0 = performance.now() - tNow * 1000; }
      if (e.code === 'ArrowLeft') { tNow = Math.max(0, tNow - .1); t0 = performance.now() - tNow * 1000; }
    });
  });
}
