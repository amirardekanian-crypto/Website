/* scenes.js — reel 10: Mehraneh's padel classes. One lime ball, one rally, and her own footage.
   Every function here is pure in t (seconds since the reel started). THE TIMELINE IS ONE TABLE, T, below: scenes, ball, footage and sound read it.
   The story: her real overhead (the hook) -> the ball smashes into your screen -> her name over her close-up -> a court door swings back to her
   13 years of tennis -> a pink ball about to go out is saved by a glass wall (that is padel) -> 2 years of padel, her wide clip at 1x with the
   site's own bridge line -> a racket sweeps in the classes -> where she teaches -> «بهم دایرکت بده».
   Footage is drawn from plates (assets/plates/<clip>/f_NNNNN.jpg, the third-party ads already blurred out); frame N is at source time (N-1)/30. */
'use strict';

const DUR = 35.4;
const FONTS = [['400 100px Lalezar', 'مهرانه ظهوریان ۰۱۲۳۴۵۶۷۸۹ دایرکت'], ['400 100px Lalezar', 'ITF'], ['600 40px Vazirmatn', 'سلام'], ['700 40px Vazirmatn', 'سلام'], ['800 40px Vazirmatn', 'سلام @mehraneh']];

/* =====================================================================================================================
   THE TIMELINE — every time in the reel, in seconds. Beats sit on reel 9's 100 BPM grid (0.6 s) where the footage allows.
   ===================================================================================================================== */
const T = {
  // S1 · the hook: IMG_4633, her overhead (contact f84 lands on the first beat), the ball comes off the glass and hits your screen
  hit1: .6, stop1: [.6, .7], glass1: .83, smash: 1.2,
  // S2 · her name over IMG_4631 (backhand contact f76 on 4.2), then the ball knocks the court door open
  reveal2: [1.2, 1.62], card2: 1.45, pill2: 1.55, nm2: 1.68, bar2: [2.0, 2.45], hit2: 4.2, knock: 4.3, door: [4.3, 4.75],
  // S3 · behind me: 13 years of tennis, three record cards stamped by the ball, the pink ball goes out ... and a glass wall saves it
  court3: [4.35, 5.05], n13: [4.9, 5.5], l13: 5.0, c1: 6.0, c2: 7.2, c3: 8.4, save: 11.4, flood: [11.4, 11.95],
  // S4 · padel now: «۲ سال پدل», a glass pane wipes in IMG_4630 at 1x (contacts 14.4, 16.267, 19.233), the bridge line builds in three rows
  court4: [11.55, 12.25], n2: [11.9, 12.3], l2: 12.0, pane: [13.8, 14.2], b4: 14.4, b1: 14.5, b2: 16.0, b3: 17.4, stop4: [19.233, 19.333], glass4: 19.45,
  // S5 · a giant racket sweeps in the classes (it eases into the ball, holds 0.15 s on the hit, then leaves); S6 · the cards flip away for the venues
  racket: [20.0, 20.8], rHit: 20.4, rHold: 20.55, hd5: 20.75, k1: 21.6, k2: 22.8, k3: 24.0, flip: [26.7, 27.05], hd6: 27.0, v1: 27.3, v2: 27.9, v3: 28.5,
  // S7 · the DM: the seam rises, her portrait, «بهم دایرکت بده / تا شروع کنیم», the handle, the ball presses the paper plane and leaves so the plane is seen
  seam: [31.0, 31.45], panel7: 31.2, pill7: 31.5, cta1: 31.35, cta2: 31.55, handle: 32.0, press: 32.4, ask: 32.2, launch: 33.0,
};

/* =====================================================================================================================
   FOOTAGE — the plates, the timing maps (reel time -> source time) and the framing (a camera in source pixels)
   ===================================================================================================================== */
const SRC_W = 1072;
const CLIP = {                                                    // first/count: only the frames the reel uses are loaded
  p33: { id: '4633', h: 1920, first: 1, count: 99 },
  p31: { id: '4631', h: 1920, first: 20, count: 67 },
  p30: { id: '4630', h: 1904, first: 1, count: 188 },
  // IMG_4631 f20-f63 motion-interpolated to 60 fps (ffmpeg minterpolate, from the clean plate): her slowed ready stance stays sharp, no double image
  p31i: { id: '4631i', h: 1920, first: 1, count: 85, fps: 60, t0: (20 - 1) / 30, noRaw: true },
};
const fsrc = n => (n - 1) / 30;                                   // frame number -> source seconds
/* timing maps: [[reel t, source t], ...], linear in between, held outside (equal source times = a freeze) */
const MAP = {
  p33: [[0, fsrc(66)], [T.hit1, fsrc(84)], [T.stop1[1], fsrc(84)], [1.7, fsrc(84) + 1.0]],
  p31: [[T.reveal2[0], fsrc(20)], [3.7667, fsrc(63)], [T.hit2, fsrc(76)], [4.4, fsrc(82)]],
  p30: [[T.pane[0], fsrc(5)], [T.stop4[0], fsrc(168)], [T.stop4[1], fsrc(168)], [T.stop4[1] + (fsrc(188) - fsrc(168)), fsrc(188)]],
  // dim backdrops: IMG_4633 f10-f70 under «۲ سال پدل» (no ball in those frames), IMG_4630 f84-f159 under the classes and venues (no ball either)
  p33b: [[T.save, fsrc(10)], [T.pane[0], fsrc(70)]],
};
function mapAt(keys, t) {
  if (t <= keys[0][0]) return { s: keys[0][1], v: 0 };
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) {
    const [t0, s0] = keys[i - 1], [t1, s1] = keys[i], v = (s1 - s0) / (t1 - t0);
    return { s: s0 + v * (t - t0), v };
  }
  return { s: keys[keys.length - 1][1], v: 0 };
}
/* the framing of each clip over time: s = zoom over cover-fit, (cx, cy) = the source pixel at the centre of the box */
function view1(t) {
  const zin = .12 * E.outQuad(prog(t, 0, .3)) + .88 * E.inCubic(prog(t, .2, T.hit1)), after = E.outCubic(prog(t, T.hit1, 1.5));
  return { s: lerp(1.5, 1.95, zin) + .12 * after + .07 * bump(t, T.hit1, .78, .25), cx: lerp(690, 650, zin) + 40 * after, cy: lerp(1000, 880, zin) - 20 * after };
}
const view2 = t => ({ s: 1 + .06 * E.soft(prog(t, T.reveal2[0], T.door[1])), cx: 540, cy: lerp(960, 985, E.soft(prog(t, T.reveal2[0], T.door[1]))) });
const view4 = t => ({ s: 1.31 + .09 * E.soft(prog(t, T.pane[0], T.stop4[0])) + .1 * bump(t, T.stop4[0], T.stop4[1] + .15, .25), cx: 575, cy: 1075 });
const view7 = t => ({ s: 1.5 + .08 * E.soft(prog(t, T.panel7, DUR)), cx: 545, cy: 1000 });
/* the source -> box transform for a view (the view is clamped so the picture always covers the box) */
function fitView(c, v, bw, bh) {
  const k = Math.max(bw / SRC_W, bh / c.h) * v.s;
  const cx = clamp(v.cx, bw / 2 / k, SRC_W - bw / 2 / k), cy = clamp(v.cy, bh / 2 / k, c.h - bh / 2 / k);
  return { k, ox: bw / 2 - cx * k, oy: bh / 2 - cy * k };
}
function srcToStage(name, v, x, y, bw = W, bh = H) { const f = fitView(CLIP[name], v, bw, bh); return [f.ox + x * f.k, f.oy + y * f.k]; }
const Frames = {};
function loadClip(name) {
  const c = CLIP[name], raw = QS.has('raw') && !c.noRaw, base = location.pathname.includes('/src/') ? '../assets/plates/' : 'reel-10-mehraneh-padel/assets/plates/';
  const arr = Frames[name] = new Array(c.count), jobs = [];
  for (let i = 0; i < c.count; i++) {
    const im = new Image(); arr[i] = im;
    jobs.push(new Promise(r => { im.onload = r; im.onerror = r; im.src = `${base}${raw ? 'raw' : ''}${c.id}/f_${String(c.first + i).padStart(5, '0')}.jpg`; }));
  }
  PRELOAD.push(Promise.all(jobs));
}
const GRADE = 'contrast(1.07) saturate(1.1) brightness(1.02)';
/* draw the frame that belongs at source time s. At 1x it is the nearest frame (crisp); slower than 1x it blends the two neighbours (no stutter). */
function drawClip(ctx, name, s, speed, v, bw = W, bh = H, grade = GRADE) {
  const c = CLIP[name], arr = Frames[name]; if (!arr) return;
  const f = fitView(c, v, bw, bh), fr = (s - (c.t0 || 0)) * (c.fps || 30) + 1 - c.first;
  const pick = i => arr[clamp(i, 0, c.count - 1)];
  ctx.save(); ctx.filter = grade;
  const draw = (im, a) => { if (!im || !im.naturalWidth) return; ctx.globalAlpha = a; ctx.drawImage(im, f.ox, f.oy, SRC_W * f.k, c.h * f.k); };
  if (speed > .02 && Math.abs(speed - 1) > .02) { const i0 = Math.floor(fr + 1e-6), a = fr - i0; draw(pick(i0), 1); if (a > .02) draw(pick(i0 + 1), a); }
  else draw(pick(Math.round(fr)), 1);
  ctx.restore();
}
/* a dim backdrop: her footage, desaturated and multiplied into the court colour */
function backdrop(ctx, name, s, v, col) {
  drawClip(ctx, name, s, 1, v, W, H, 'saturate(.5) brightness(.8) contrast(1.05)');
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = col; ctx.fillRect(0, 0, W, H); ctx.restore();
}
/* a footage canvas shows the frame of the OUTPUT frame t falls in: the 20 sub-frames of one render frame all see the same source frame */
const qt = t => Math.round(t * 30) / 30;

/* her real contacts (source px, from the frame-by-frame analysis): a lime ring and sparks go off on the strings, the camera kicks */
const REAL_HITS = [
  { t: T.hit1, clip: 'p33', view: view1, x: 620, y: 784, big: 1 },
  { t: T.hit2, clip: 'p31', view: view2, x: 395, y: 1080, big: .6, until: T.door[0] },   // cut when the door swings: the ring must not hang over the next scene
  { t: 14.4, clip: 'p30', view: view4, x: 437, y: 832, big: .7 },
  { t: 14.4 + (fsrc(79) - fsrc(23)), clip: 'p30', view: view4, x: 728, y: 1104, big: .55 },
  { t: T.stop4[0], clip: 'p30', view: view4, x: 556, y: 822, big: 1 },
];
/* the real ball before contact (frame, x, y): a lime tracer rides on it so the eye locks on */
const TRACKS = [
  { clip: 'p33', view: view1, at: f => mapInv('p33', fsrc(f)), pts: [[72, 1064, 207], [74, 967, 309], [76, 881, 407], [78, 802, 506], [79, 767, 554], [80, 735, 601], [81, 703, 647], [83, 646, 739], [84, 620, 784]] },
  { clip: 'p30', view: view4, at: f => mapInv('p30', fsrc(f)), pts: [[16, 744, 342], [18, 642, 490], [20, 552, 630], [22, 474, 765], [23, 439, 830]] },
];
function mapInv(name, s) { const k = MAP[name]; for (let i = 1; i < k.length; i++) { const [t0, s0] = k[i - 1], [t1, s1] = k[i]; if (s1 > s0 && s >= s0 && s <= s1) return t0 + (s - s0) / (s1 - s0) * (t1 - t0); } return -1; }

/* =====================================================================================================================
   DOM
   ===================================================================================================================== */
const els = {}, DR = {}, WI = {};
const R0 = 60;
const PSMASH = [860, 1450];                                       // where the ball hits your screen (clear of her face in both clips)
const CARD2 = { top: 292, right: 990 };
const L3 = { iconX: 76, tops: [800, 1010, 1220], floor: 1560 };   // the ball rests on each card's outer left corner (clear of the icon above it)
const L5 = { iconX: 174, tops: [560, 832, 1104] };
const L6 = { pinX: 915, tops: [480, 740, 1000], head: 40 };     // head: the pin's top, measured from the row top
const SOCK = [210, 1282];
const RK = { px: 1300, py: 2300, a0: -82, aHit: -127, a1: -172, D: 1800 };   // the racket: pivot below the bottom-right corner, sweeps right to left
/* it eases INTO the ball (so it arrives slowing down and reads), holds still on the hit, then leaves fast */
const racketAngle = t => t < T.rHit ? lerp(RK.a0, RK.aHit, E.outCubic(prog(t, T.racket[0], T.rHit))) : t < T.rHold ? RK.aHit : lerp(RK.aHit, RK.a1, E.inCubic(prog(t, T.rHold, T.racket[1])));
const racketHead = t => { const a = racketAngle(t) * Math.PI / 180; return [RK.px + RK.D * Math.cos(a), RK.py + RK.D * Math.sin(a)]; };
const seamY = t => lerp(1930, -20, E.inOutCubic(prog(t, T.seam[0], T.seam[1])));
/* the paper plane's flight after the press: a curve out of the left edge, below the headline */
const planePos = t => { const u = E.inCubic(prog(t, T.press, T.press + .6)); return [SOCK[0] - 420 * u, SOCK[1] - 330 * u * u + 40 * Math.sin(Math.PI * u)]; };

function init() {
  ['cam', 'flash', 's1', 's2w', 's2', 's3', 's4', 's5', 's7', 'fc1', 'fc2', 'fc4', 'fc4b', 'fc5', 'fc7', 'card2', 'pill2', 'nm2', 'bar2', 'shade2', 'g3', 'hd3', 'n13', 'l13', 'c1', 'c2', 'c3', 'c1dg', 'c2ic', 'c3ic',
    'g4', 'two', 'n2', 'l2', 'foot4', 'b4', 'b1l', 'b3l', 'chips', 'g5', 'hd5', 'hd5a', 'hd5b', 'hd6', 'k1', 'k2', 'k3', 'v1', 'v2', 'v3', 'g7', 'panel7', 'pill7', 'cta1', 'cta2', 'handle', 'sock', 'plane', 'ask',
    'pane', 'racket', 'rk', 'seam'].forEach(i => els[i] = document.getElementById(i));
  els.fx = document.getElementById('fx'); els.ctx = els.fx.getContext('2d');
  for (const k of ['fc1', 'fc2', 'fc4', 'fc4b', 'fc5', 'fc7']) els[k + 'x'] = els[k].getContext('2d');
  for (const n of Object.keys(CLIP)) loadClip(n);

  // S3: a top-down TENNIS court (doubles alleys, no walls), drawn in pink
  const g3 = els.g3; DR.c3 = [];
  DR.c3.push(addRect(g3, 150, 260, 780, 1440, 10), addLine(g3, 240, 260, 240, 1700), addLine(g3, 840, 260, 840, 1700), addLine(g3, 240, 640, 840, 640), addLine(g3, 240, 1320, 840, 1320),
    addLine(g3, 540, 640, 540, 1320), addLine(g3, 110, 980, 970, 980));
  // S4: a top-down PADEL court: no alleys, glass at the ends, mesh along the middle of the sides
  const g4 = els.g4; DR.c4 = [];
  DR.c4.push(addRect(g4, 110, 230, 860, 1500, 18), addLine(g4, 110, 980, 970, 980), addLine(g4, 110, 560, 970, 560), addLine(g4, 110, 1400, 970, 1400), addLine(g4, 540, 560, 540, 1400));
  for (let y = 520; y < 1440; y += 46) { svgEl('line', { x1: 110, y1: y, x2: 150, y2: y + 46, class: 'mesh' }, g4); svgEl('line', { x1: 150, y1: y, x2: 110, y2: y + 46, class: 'mesh' }, g4); svgEl('line', { x1: 930, y1: y, x2: 970, y2: y + 46, class: 'mesh' }, g4); svgEl('line', { x1: 970, y1: y, x2: 930, y2: y + 46, class: 'mesh' }, g4); }
  for (const [gid, key] of [['g5', 'c5'], ['g7', 'c7']]) {
    const g = els[gid]; DR[key] = [];
    DR[key].push(addRect(g, 110, 230, 860, 1500, 18), addLine(g, 110, 980, 970, 980), addLine(g, 110, 560, 970, 560), addLine(g, 110, 1400, 970, 1400), addLine(g, 540, 560, 540, 1400));
  }
  // the racket (an SVG drawn pointing up from its pivot; rotated in render)
  buildRacket(els.rk);

  // word masks
  WI.nm2 = wordify(els.nm2); WI.l13 = wordify(els.l13); WI.l2 = wordify(els.l2);
  WI.b1 = wordify(els.b1l); WI.b2 = wordify(els.chips); WI.b3 = wordify(els.b3l);
  WI.hd5a = wordify(els.hd5a); WI.hd5b = wordifyKeep(els.hd5b); WI.hd6 = wordify(els.hd6);
  WI.cta1 = wordify(els.cta1); WI.cta2 = wordifyKeep(els.cta2);
  planBall();
}
/* riseTo, but a word stays invisible until its own rise starts (a waiting word's dots would peek out of the bottom of its mask) */
function rise(wi, p) { riseTo(wi, p); const o = p > 0 ? '' : '0'; if (wi._o2 !== o) { wi.style.opacity = o; wi._o2 = o; } }
/* wordify, but keeps a highlighted <span class="hi"> as one coloured word */
function wordifyKeep(el) {
  const parts = [];
  el.childNodes.forEach(n => {
    if (n.nodeType === 3) n.textContent.trim().split(/\s+/).filter(Boolean).forEach(w => parts.push({ w, hi: false }));
    else n.textContent.trim().split(/\s+/).forEach(w => parts.push({ w, hi: true }));
  });
  el.innerHTML = parts.map(p => '<span class="wm"><span class="wi' + (p.hi ? ' hi' : '') + '"' + (p.hi ? ' style="color:var(--lime)"' : '') + '>' + p.w + '</span></span>').join(' ');
  return [...el.querySelectorAll('.wi')];
}
function buildRacket(g) {
  const head = svgEl('g', {}, g);
  // handle + throat from the pivot (0,0) up to the head (head centre at -D)
  svgEl('path', { d: `M -34 0 L -30 ${-RK.D + 520} L 30 ${-RK.D + 520} L 34 0 Z`, fill: '#0A0F1A' }, head);
  svgEl('path', { d: `M -30 ${-RK.D + 520} Q -120 ${-RK.D + 380} -150 ${-RK.D + 250} L 150 ${-RK.D + 250} Q 120 ${-RK.D + 380} 30 ${-RK.D + 520} Z`, fill: '#011E45' }, head);
  svgEl('ellipse', { cx: 0, cy: -RK.D, rx: 260, ry: 300, fill: '#D0FF41', stroke: '#FFFFFF', 'stroke-width': 20 }, head);
  svgEl('ellipse', { cx: 0, cy: -RK.D, rx: 236, ry: 276, fill: 'none', stroke: '#011E45', 'stroke-width': 6 }, head);
  for (let yy = -230; yy <= 230; yy += 46) for (let xx = -200; xx <= 200; xx += 46) {
    const ox = xx + ((Math.round(yy / 46) % 2) ? 23 : 0);
    if ((ox * ox) / (215 * 215) + (yy * yy) / (255 * 255) < 1) svgEl('circle', { cx: ox, cy: -RK.D + yy, r: 10, fill: '#013C86' }, head);
  }
  svgEl('path', { d: `M -150 ${-RK.D + 120} Q 0 ${-RK.D + 40} 150 ${-RK.D + 120}`, fill: 'none', stroke: 'rgba(1,30,69,.35)', 'stroke-width': 10, 'stroke-linecap': 'round' }, head);
}

/* =====================================================================================================================
   THE BALL PLAN — one rally. Gravity is solved per leg; the ball is hidden (alpha 0) whenever her REAL ball is in the picture.
   ===================================================================================================================== */
function planBall() {
  const legs = [], imp = [];
  const hit = (t, x, y, mag, extra = {}) => imp.push(Object.assign({ t, x, y, nx: 0, ny: -1, mag, dust: [233, 255, 158], ringCol: [208, 255, 65], sparkCol: [255, 255, 255], n: 10, sparks: 6 }, extra));
  const arc = (t0, t1, p0, p1, apexY, extra = {}) => legs.push(Object.assign({ type: 'arc', t0, t1, p0, p1, apexY, w: 12 }, extra));
  const line = (t0, t1, p0, p1, extra = {}) => legs.push(Object.assign({ type: 'line', t0, t1, p0, p1, w: 12 }, extra));
  const hide = (t0, t1, p) => legs.push({ type: 'hold', t0, t1, p0: p, r0: R0, w: 0, alpha: [0, 0] });
  const hop = (t0, t1, x0, x1, yc, h, ex = {}, r = R0) => { arc(t0, t1, [x0, yc], [x1, yc], yc - h, Object.assign({ r0: r }, ex)); };
  const pink = { dust: [255, 233, 232], ringCol: [236, 153, 175], sparkCol: [255, 255, 255] };
  const glassL = { nx: 1, ny: 0, glass: 'L', snd: 'tap', ring: 120, round: .2, n: 6, sparks: 8, dust: [255, 255, 255], ringCol: [255, 255, 255] };
  const glassR = Object.assign({}, glassL, { nx: -1, glass: 'R' });

  // --- S1: her real ball leaves the right edge (f88); the graphic ball takes it off the right glass and comes at your screen ---
  hit(T.glass1, 1078, 870, .8, Object.assign({}, glassR, { shake: 6 }));
  line(T.glass1, T.smash, [1056, 870], PSMASH, { r0: 26, r1: 250, ease: E.inQuad, w: 16 });
  imp.push({ t: T.smash, x: PSMASH[0], y: PSMASH[1], nx: 0, ny: -1, mag: .25, screen: true, shake: 18, ring: 0, n: 0, sparks: 0, snd: 'none' });
  // --- S2: it falls away from the glass onto the court, climbs the right side, rests on the name card's corner, leaves right ---
  line(T.smash, 1.5, PSMASH, [985, 1580], { r0: 250, r1: R0, ease: E.outCubic, w: 10 });
  hit(1.5, 985, 1640, .85, { shake: 5, ring: 130 });
  arc(1.5, 2.1, [985, 1580], [985, CARD2.top - R0], 140, { w: 12 });
  hit(2.1, 985, CARD2.top, .8, { snd: 'ui', ring: 110, card: 'card2' });
  hop(2.1, 2.7, 985, 972, CARD2.top - R0, 70); hit(2.7, 972, CARD2.top, .5, { ring: 0, n: 5, sparks: 0, card: 'card2' });
  hop(2.7, 3.3, 972, 985, CARD2.top - R0, 70); hit(3.3, 985, CARD2.top, .5, { ring: 0, n: 5, sparks: 0, card: 'card2' });
  arc(3.3, 3.75, [985, CARD2.top - R0], [1170, 700], 150, { w: 12 });
  hide(3.75, T.knock, [1170, 700]);
  // --- the real ball leaves her backhand through the left edge (f78); the graphic ball knocks the court door open, turns pink ---
  hit(T.knock, 4, 968, .9, Object.assign({}, glassL, { shake: 8 }));
  arc(T.knock, 4.8, [40, 968], [300, L3.floor - R0], 880, { r0: 18, r1: R0, w: 12 });
  // --- S3: two hops along the floor, then it stamps the three record cards' icons, one per 1.2 s, and waits on the last ---
  hit(4.8, 300, L3.floor, .8, pink);
  hop(4.8, 5.4, 300, 520, L3.floor - R0, 170, {}); hit(5.4, 520, L3.floor, .7, pink);
  const icon = i => [L3.iconX, L3.tops[i] - R0];
  arc(5.4, T.c1, [520, L3.floor - R0], icon(0), icon(0)[1], { w: 12 });   // apex at the landing: the ball never rises into «سال تنیس پشتمه» hit(T.c1, L3.iconX, L3.tops[0], .9, Object.assign({ snd: 'ui', card: 'c1', shake: 4 }, pink));
  hop(T.c1, 6.6, L3.iconX, L3.iconX, icon(0)[1], 110); hit(6.6, L3.iconX, L3.tops[0], .45, Object.assign({ ring: 0, n: 4, sparks: 0, card: 'c1' }, pink));
  arc(6.6, T.c2, icon(0), icon(1), icon(0)[1] - 100); hit(T.c2, L3.iconX, L3.tops[1], .9, Object.assign({ snd: 'ui', card: 'c2', shake: 4 }, pink));
  hop(T.c2, 7.8, L3.iconX, L3.iconX, icon(1)[1], 110); hit(7.8, L3.iconX, L3.tops[1], .45, Object.assign({ ring: 0, n: 4, sparks: 0, card: 'c2' }, pink));
  arc(7.8, T.c3, icon(1), icon(2), icon(1)[1] - 90); hit(T.c3, L3.iconX, L3.tops[2], .9, Object.assign({ snd: 'ui', card: 'c3', shake: 4 }, pink));
  for (let k = 0; k < 4; k++) { const a = T.c3 + k * .6; hop(a, a + .6, L3.iconX, L3.iconX, icon(2)[1], 90); hit(a + .6, L3.iconX, L3.tops[2], .4, Object.assign({ ring: 0, n: 4, sparks: 0, card: 'c3' }, pink)); }
  // --- out ... saved: off the card to the floor at the far left, then a fast skim to the right edge, where a glass wall shoots up ---
  arc(10.8, 11.1, icon(2), [70, L3.floor - R0], icon(2)[1] - 40, { w: 12 });
  hit(11.1, 70, L3.floor, .7, pink);
  arc(11.1, T.save, [70, L3.floor - R0], [1020, L3.floor - R0], L3.floor - R0 - 60, { w: 18 });
  hit(T.save, 1080, L3.floor - R0, 1, Object.assign({}, glassR, { shake: 14, ring: 200, sparks: 12, save: true }));
  // --- S4: back across the blue (it is lime now), off the left glass, two hops, then lobbed out of the top where her real ball drops in ---
  arc(T.save, 12.0, [1020, L3.floor - R0], [60, 1160], 880, { w: 14 });
  hit(12.0, 0, 1160, .8, Object.assign({}, glassL, { shake: 5 }));
  arc(12.0, 12.6, [60, 1160], [300, L3.floor - R0], 1100); hit(12.6, 300, L3.floor, .7);
  hop(12.6, 13.2, 300, 560, L3.floor - R0, 160); hit(13.2, 560, L3.floor, .6);
  hop(13.2, T.pane[0], 560, 760, L3.floor - R0, 160); hit(T.pane[0], 760, L3.floor, .7, { snd: 'none', n: 0, ring: 0, sparks: 0 });   // no dust: it would float on her footage
  line(T.pane[0], 14.05, [760, L3.floor - R0], [880, -130], { r0: R0, r1: 40, ease: E.outQuad, w: 14 });
  hide(14.05, T.glass4, [880, -130]);
  // --- her final overhead leaves the right edge (f171): the graphic ball comes off the right glass, over her head, into the racket ---
  const hp = racketHead(T.rHit);
  hit(T.glass4, 1078, 700, .8, Object.assign({}, glassR, { shake: 5 }));
  arc(T.glass4, T.rHit, [1050, 700], hp, 200, { r0: 22, r1: R0, w: 12 });
  hit(T.rHit, hp[0], hp[1], 1, { nx: .5, ny: -.86, shake: 12, ring: 170, round: .6, sparks: 12, n: 12, snd: 'none', racket: true });
  // --- S5: up and over, down onto each class card's little court, one per 1.2 s ---
  const kicon = i => [L5.iconX, L5.tops[i] - R0];
  arc(T.rHit, T.k1, hp, kicon(0), -150, { ease: E.outQuad, w: 12 }); hit(T.k1, L5.iconX, L5.tops[0], .9, { snd: 'ui', card: 'k1', shake: 4 });
  hop(T.k1, 22.2, L5.iconX, L5.iconX, kicon(0)[1], 110); hit(22.2, L5.iconX, L5.tops[0], .45, { ring: 0, n: 4, sparks: 0, card: 'k1' });
  arc(22.2, T.k2, kicon(0), kicon(1), kicon(0)[1] - 60); hit(T.k2, L5.iconX, L5.tops[1], .9, { snd: 'ui', card: 'k2', shake: 4 });
  hop(T.k2, 23.4, L5.iconX, L5.iconX, kicon(1)[1], 110); hit(23.4, L5.iconX, L5.tops[1], .45, { ring: 0, n: 4, sparks: 0, card: 'k2' });
  arc(23.4, T.k3, kicon(1), kicon(2), kicon(1)[1] - 60); hit(T.k3, L5.iconX, L5.tops[2], .9, { snd: 'ui', card: 'k3', shake: 4 });
  for (let k = 0; k < 5; k++) { const a = T.k3 + k * .6; hop(a, a + .6, L5.iconX, L5.iconX, kicon(2)[1], 90); hit(a + .6, L5.iconX, L5.tops[2], .4, { ring: 0, n: 4, sparks: 0, card: 'k3' }); }
  // --- S6: once the cards have flipped away, across to the map pins, landing ON each pin's head (its top is the leg's apex: it never rises into the heading) ---
  const pin = i => [L6.pinX, L6.tops[i] + L6.head - R0];
  arc(27.0, T.v1, kicon(2), pin(0), pin(0)[1], { w: 16 }); hit(T.v1, L6.pinX, L6.tops[0] + L6.head, .85, { snd: 'ui', pin: 'v1', shake: 3 });
  arc(T.v1, T.v2, pin(0), pin(1), pin(0)[1]); hit(T.v2, L6.pinX, L6.tops[1] + L6.head, .85, { snd: 'ui', pin: 'v2', shake: 3 });
  arc(T.v2, T.v3, pin(1), pin(2), pin(1)[1]); hit(T.v3, L6.pinX, L6.tops[2] + L6.head, .85, { snd: 'ui', pin: 'v3', shake: 3 });
  for (let k = 0; k < 4; k++) { const a = T.v3 + k * .6; hop(a, a + .6, L6.pinX, L6.pinX, pin(2)[1], 40); hit(a + .6, L6.pinX, L6.tops[2] + L6.head, .4, { ring: 0, n: 4, sparks: 0, pin: 'v3' }); }
  // --- S7: up and out of the top right before the seam; it comes back down the left gutter, presses the paper plane, and leaves so the plane is seen ---
  line(30.9, 31.25, pin(2), [1010, -160], { ease: E.inQuad, r1: 50, w: 14 });
  hide(31.25, 32.0, [60, -110]);
  arc(32.0, T.press, [60, -110], [SOCK[0], SOCK[1]], -110, { ease: E.inQuad, r0: 46, r1: 46, w: 10 });
  hit(T.press, SOCK[0], SOCK[1] + 46, 1, { snd: 'ui', press: true, shake: 10, ring: 180, round: .5, sparks: 10, n: 12 });
  hop(T.press, T.launch, SOCK[0], SOCK[0], SOCK[1], 34, {}, 46); hit(T.launch, SOCK[0], SOCK[1] + 46, .4, { ring: 0, n: 3, sparks: 0, press: true, snd: 'pill' });
  arc(T.launch, T.launch + .55, [SOCK[0], SOCK[1]], [60, -170], -170, { ease: E.outQuad, r0: 46, r1: R0, w: 12 });
  Ball.legs = prepLegs(legs); Ball.impacts = imp;
}
/* lime in padel, pink in her tennis years (from the door to the glass save) */
function tintAt(t) {
  if (t > 4.4 && t < T.save) return mixTint(TINTS.lime, TINTS.pink, sstep((t - 4.45) / .2));
  return TINTS.lime;
}

/* =====================================================================================================================
   CAMERA — a slow push per scene + shake from the ball's big hits and her real contacts
   ===================================================================================================================== */
function camera(t) {
  let s = 1;
  s += .025 * E.soft(prog(t, T.reveal2[0], T.door[0])) * (t < T.door[1] ? 1 : 0);
  s += .025 * E.soft(prog(t, T.court3[0], T.save)) * (t > T.door[0] && t < T.flood[1] ? 1 : 0);
  s += .02 * E.soft(prog(t, T.racket[1], T.seam[0])) * (t > T.racket[0] && t < T.seam[1] ? 1 : 0);
  s += .025 * E.soft(prog(t, T.seam[1], DUR)) * (t > T.seam[0] ? 1 : 0);
  const sh = shakeAt(t);
  for (const h of REAL_HITS) { const dt = t - h.t; if (dt < 0 || dt > .5) continue; const k = Math.exp(-dt / .08); sh.x += Math.sin(dt * 97 + h.t) * 9 * h.big * k; sh.y += Math.cos(dt * 81 + 2) * 7 * h.big * k; }
  // while it shakes, scale up just enough that the picture never pulls away from the frame edges
  s = Math.max(s, 1 + Math.abs(sh.x) / 540 + Math.abs(sh.y) / 960 + Math.abs(sh.r) * .035 + .003 * (Math.abs(sh.x) + Math.abs(sh.y) > .5 ? 1 : 0));
  return { s, x: sh.x, y: sh.y, r: sh.r };
}

/* =====================================================================================================================
   S1 — THE HOOK (0 – 1.65): her overhead, punch-in, hit-stop, the ball off the right glass and into your screen
   ===================================================================================================================== */
function sceneHook(t) {
  const on = t < 1.65; show(els.s1, on); if (!on) return;
  const tq = qt(t), m = mapAt(MAP.p33, tq);
  drawClip(els.fc1x, 'p33', m.s, m.v, view1(tq));
}

/* =====================================================================================================================
   S2 — THE NAME (1.2 – 4.75): her close-up; the glass card with her name; the ball knocks the court door open
   ===================================================================================================================== */
function sceneName(t) {
  const on = t > T.reveal2[0] - .01 && t < T.door[1] + .02; show(els.s2w, on); if (!on) return;
  const rr = 2300 * E.outExpo(prog(t, T.reveal2[0], T.reveal2[1]));
  setStyle(els.s2, 'clipPath', t < T.reveal2[1] ? `circle(${rr.toFixed(1)}px at ${PSMASH[0]}px ${PSMASH[1]}px)` : 'none');
  const tq = qt(t), m = mapAt(MAP.p31, tq);
  if (m.s <= CLIP.p31i.t0 + (CLIP.p31i.count - 1) / 60 + 1e-6) drawClip(els.fc2x, 'p31i', m.s, 1, view2(tq)); else drawClip(els.fc2x, 'p31', m.s, 1, view2(tq));
  const cs = spring(t - T.card2, 3.0, .55), press = pressAt(t, im => im.card === 'card2');
  put(els.card2, { s: .9 + .1 * Math.min(cs, 1.1), y: 30 * (1 - Math.min(1, cs)) + 8 * press, o: prog(t, T.card2, T.card2 + .15) });
  put(els.pill2, { s: spring(t - T.pill2, 3.6, .5), o: prog(t, T.pill2, T.pill2 + .1) });
  WI.nm2.forEach((wi, i) => rise(wi, E.house(prog(t, T.nm2 + i * .14, T.nm2 + .7 + i * .14))));
  put(els.bar2, { sx: E.house(prog(t, T.bar2[0], T.bar2[1])) });
  // the court door: hinged on the right edge, it swings away when the ball knocks its left edge
  const d = E.inCubic(prog(t, T.door[0], T.door[1]));
  put(els.s2, { ry: -104 * d });
  setStyle(els.shade2, 'opacity', (.75 * d).toFixed(3));
}

/* =====================================================================================================================
   S3 — BEHIND ME (4.3 – 11.95): 13 years of tennis, three cards, then out ... and the glass comes up
   ===================================================================================================================== */
function sceneTennis(t) {
  const on = t > T.door[0] - .05 && t < T.flood[1] + .02; show(els.s3, on); if (!on) return;
  DR.c3.forEach((it, i) => drawOn(it, E.outCubic(prog(t, T.court3[0] + i * .06, T.court3[1] + i * .06))));
  // the blue floods in from the glass on the right: the tennis world is clipped away from the right edge
  const fl = E.inOutCubic(prog(t, T.flood[0], T.flood[1]));
  setStyle(els.s3, 'clipPath', fl > 0 ? `inset(0 ${(fl * 1080).toFixed(1)}px 0 0)` : 'none');
  const fling = i => E.inCubic(prog(t, T.save + i * .05, T.save + .42 + i * .05));
  // ۱۳ counts up (from ۱: a Persian ۰ is a dot), the line rises
  const n = Math.max(1, Math.round(13 * E.outQuart(prog(t, T.n13[0], T.n13[1]))));
  if (els.n13._n !== n) { els.n13.textContent = fa(n); els.n13._n = n; }
  WI.l13.forEach((wi, i) => rise(wi, E.house(prog(t, T.l13 + i * .13, T.l13 + .7 + i * .13))));
  put(els.hd3, { x: -1300 * fling(0) });
  // the record cards slide in from the right as the ball stamps their icons
  ['c1', 'c2', 'c3'].forEach((id, i) => {
    const t0 = T['c' + (i + 1)] - .18, sp = spring(t - t0, 2.8, .6), press = pressAt(t, im => im.card === id);
    put(els[id], { x: 1000 * (1 - Math.min(1, sp)) - 14 * Math.max(0, sp - 1) * 8 - 1300 * fling(i + 1), y: 10 * press, r: -2 * (1 - Math.min(1, sp)), o: prog(t, t0, t0 + .06) });
  });
  // the icons: a digit reel lands on ۱; the trophy and the shield draw themselves
  const roll = E.outCubic(prog(t, T.c1 - .1, T.c1 + .4)), dg = Math.max(1, Math.round(9 - 8 * roll));
  if (els.c1dg._n !== dg) { els.c1dg.textContent = fa(dg); els.c1dg._n = dg; }
  const drawIco = (svg, t0) => svg.querySelectorAll('path').forEach((p, i) => { const v = (1 - E.outCubic(prog(t, t0 + i * .14, t0 + .5 + i * .14))).toFixed(3); if (p._v !== v) { p.style.strokeDasharray = 1; p.style.strokeDashoffset = v; p._v = v; } });
  drawIco(els.c2ic, T.c2 - .05); drawIco(els.c3ic, T.c3 - .05);
  ['c1', 'c2', 'c3'].forEach((id, i) => shineAt(els[id], t, T['c' + (i + 1)] + .15));
  put(els.hd3.firstElementChild, { s: (.7 + .3 * Math.min(1.08, spring(t - T.n13[0], 3.2, .5))) * (1 + .015 * Math.sin((t - T.n13[1]) * 2.4) * (t > T.n13[1] ? 1 : 0)), o: prog(t, T.n13[0], T.n13[0] + .12) });
}
/* a light sweep across a card, once, just after it lands */
function shineAt(card, t, t0) { const sh = card.querySelector('.shine'); if (sh) put(sh, { x: 1300 * E.inOutCubic(prog(t, t0, t0 + .7)) }); }
/* the little ball in a class card's mini court rallies between the coach (lime) and the student dots, one shot per beat */
const RALLY = { k1: [[60, 48], [60, 132]], k2: [[60, 48], [34, 132], [60, 48], [86, 132]], k3: [[40, 44], [82, 136]] };
function miniRally(id, t, t0) {
  const mb = els[id].querySelector('.mb'), pts = RALLY[id];
  if (t < t0) { mb.style.opacity = '0'; return; }
  const u = (t - t0) / .6, k = Math.floor(u), f = u - k, a = pts[k % pts.length], b = pts[(k + 1) % pts.length];
  const x = lerp(a[0], b[0], f), y = lerp(a[1], b[1], f), r = 6 + 4 * Math.sin(Math.PI * f);
  mb.setAttribute('cx', x.toFixed(1)); mb.setAttribute('cy', y.toFixed(1)); mb.setAttribute('r', r.toFixed(2)); mb.style.opacity = prog(t, t0, t0 + .1).toFixed(2);
}

/* =====================================================================================================================
   S4 — PADEL NOW (11.3 – 20.65): «۲ سال پدل», then her wide clip at 1x with the bridge line building in three rows
   ===================================================================================================================== */
function scenePadel(t) {
  const on = t > T.save - .1 && t < T.racket[1] + .05; show(els.s4, on); show(els.pane, t > T.pane[0] && t < T.pane[1] + .02); if (!on) return;
  DR.c4.forEach((it, i) => drawOn(it, E.outCubic(prog(t, T.court4[0] + i * .07, T.court4[1] + i * .07))));
  if (t < T.pane[1] + .05) { const tq = qt(t); backdrop(els.fc4bx, 'p33', mapAt(MAP.p33b, tq).s, { s: 1.15, cx: 650, cy: 1000 }, 'rgba(2,80,176,.9)'); }
  put(els.n2, { s: .6 + .4 * Math.min(1.1, spring(t - T.n2[0], 3.0, .45)), o: prog(t, T.n2[0], T.n2[0] + .1) });
  WI.l2.forEach((wi, i) => rise(wi, E.house(prog(t, T.l2 + i * .14, T.l2 + .7 + i * .14))));
  // the glass pane wipes her clip in from the right (RTL)
  const pw = E.inOutCubic(prog(t, T.pane[0], T.pane[1])), X = 1080 * (1 - pw);
  const fon = t > T.pane[0]; show(els.foot4, fon);
  if (fon) {
    setStyle(els.foot4, 'clipPath', pw < 1 ? `inset(0 0 0 ${X.toFixed(1)}px)` : 'none');
    put(els.pane, { x: X - 1080 - 32 });
    const tq = qt(t), m = mapAt(MAP.p30, tq);
    drawClip(els.fc4x, 'p30', m.s, m.v, view4(tq));
  }
  // the bridge line: «چیزهایی که توی پدل دیر جا می‌افتن» / «مثل والی، اسمش، حرکت پا و خوندن توپ» / «برای من از قبل جا افتاده‌ن»
  const bs = spring(t - T.b4, 3.0, .55);
  put(els.b4, { s: .92 + .08 * Math.min(1.05, bs), y: 40 * (1 - Math.min(1, bs)), o: prog(t, T.b4, T.b4 + .15) });
  WI.b1.forEach((wi, i) => rise(wi, E.house(prog(t, T.b1 + i * .08, T.b1 + .6 + i * .08))));
  WI.b2.forEach((wi, i) => { const t0 = T.b2 + i * .12; rise(wi, E.house(prog(t, t0, t0 + .55))); });
  WI.b3.forEach((wi, i) => rise(wi, E.house(prog(t, T.b3 + i * .08, T.b3 + .6 + i * .08))));
}

/* =====================================================================================================================
   S5 + S6 — CLASSES, THEN WHERE (20.15 – 31.45): revealed behind the racket; the cards flip away for the venues
   ===================================================================================================================== */
function sceneClasses(t) {
  const on = t > T.racket[0] && t < T.seam[1] + .02; show(els.s5, on); show(els.racket, t > T.racket[0] - .05 && t < T.racket[1] + .05); if (!on) return;
  // the racket's wedge: everything it has swept past shows the new scene
  if (t < T.racket[1]) {
    const a0 = (RK.a0 + 6) * Math.PI / 180, a = racketAngle(t) * Math.PI / 180, P = [[RK.px, RK.py]];
    for (let k = 0; k <= 16; k++) { const aa = lerp(a0, a, k / 16); P.push([RK.px + 4200 * Math.cos(aa), RK.py + 4200 * Math.sin(aa)]); }
    setStyle(els.s5, 'clipPath', 'polygon(' + P.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(',') + ')');
  } else setStyle(els.s5, 'clipPath', 'none');
  setStyle(els.rk, 'transform', `translate(${RK.px}px,${RK.py}px) rotate(${(racketAngle(t) + 90).toFixed(3)}deg)`);
  // the seam pushes the whole scene up and out at the end
  put(els.s5, { y: t > T.seam[0] ? seamY(t) - 1930 : 0 });
  DR.c5.forEach((it, i) => drawOn(it, E.outCubic(prog(t, T.racket[0] + .2 + i * .06, T.racket[1] + .3 + i * .06))));
  { const per = (fsrc(159) - fsrc(84)) / .5, u = Math.max(0, qt(t) - T.racket[0]) / per, tri = (u % 2) < 1 ? u % 2 : 2 - (u % 2);
    backdrop(els.fc5x, 'p30', fsrc(84) + tri * (fsrc(159) - fsrc(84)), { s: 1.2, cx: 600, cy: 1020 }, 'rgba(1,60,134,.93)'); }
  const fl = i => E.inCubic(i ? prog(t, T.flip[0] + i * .06, T.flip[0] + .3 + i * .06) : prog(t, T.flip[0], T.flip[0] + .15));
  WI.hd5a.forEach((wi, i) => rise(wi, E.house(prog(t, T.hd5 + i * .12, T.hd5 + .7 + i * .12))));
  WI.hd5b.forEach((wi, i) => rise(wi, E.house(prog(t, T.hd5 + .3 + i * .12, T.hd5 + 1.0 + i * .12))));
  put(els.hd5, { y: -60 * fl(0), o: 1 - fl(0) });
  ['k1', 'k2', 'k3'].forEach((id, i) => {
    const t0 = T[id] - .16, sp = spring(t - t0, 2.9, .58), press = pressAt(t, im => im.card === id);
    put(els[id], { x: 1050 * (1 - Math.min(1, sp)), y: 10 * press, rx: 90 * fl(i + 1), o: prog(t, t0, t0 + .06) * (1 - prog(t, T.flip[0] + .25 + i * .06, T.flip[0] + .3 + i * .06)) });
    shineAt(els[id], t, T[id] + .15); miniRally(id, t, T[id] + .3);
  });
  WI.hd6.forEach((wi, i) => rise(wi, E.house(prog(t, T.hd6 + i * .12, T.hd6 + .7 + i * .12))));
  ['v1', 'v2', 'v3'].forEach(id => {
    const t0 = T[id] - .14, sp = spring(t - t0, 3.0, .6), press = pressAt(t, im => im.pin === id);
    put(els[id], { x: 900 * (1 - Math.min(1, sp)), o: prog(t, t0, t0 + .06) });
    put(els[id].firstElementChild, { sy: 1 - .16 * press, y: 18 * press, s: undefined });
  });
}

/* =====================================================================================================================
   S7 — THE DM (31.0 – 35.4): her portrait (IMG_4631, slow ping-pong), «بهم دایرکت بده / تا شروع کنیم», the handle, the ask
   ===================================================================================================================== */
function sceneDM(t) {
  const on = t > T.seam[0] - .02; show(els.s7, on); show(els.seam, t > T.seam[0] && t < T.seam[1] + .05); if (!on) return;
  const sy = seamY(t);
  setStyle(els.s7, 'clipPath', t < T.seam[1] ? `inset(${Math.max(0, sy).toFixed(1)}px 0 0 0)` : 'none');
  put(els.seam, { y: sy - 1920 });
  DR.c7.forEach((it, i) => drawOn(it, E.outCubic(prog(t, T.seam[0] + i * .06, T.seam[1] + .4 + i * .06))));
  const ps = spring(t - T.panel7, 2.8, .55);
  put(els.panel7, { s: .82 + .18 * Math.min(1.06, ps), y: 60 * (1 - Math.min(1, ps)), r: -3 * (1 - Math.min(1, ps)), o: prog(t, T.panel7, T.panel7 + .1) });
  const per = (fsrc(60) - fsrc(28)) / .5, u = Math.max(0, qt(t) - T.panel7) / per, tri = (u % 2) < 1 ? u % 2 : 2 - (u % 2);
  drawClip(els.fc7x, 'p31i', fsrc(28) + tri * (fsrc(60) - fsrc(28)), 1, view7(t), 558, 628);
  put(els.pill7, { s: spring(t - T.pill7, 3.4, .5), o: prog(t, T.pill7, T.pill7 + .1) });
  WI.cta1.forEach((wi, i) => rise(wi, E.house(prog(t, T.cta1 + i * .13, T.cta1 + .7 + i * .13))));
  WI.cta2.forEach((wi, i) => rise(wi, E.house(prog(t, T.cta2 + i * .13, T.cta2 + .7 + i * .13))));
  const hs = spring(t - T.handle, 3.2, .5), hp = pressAt(t, im => im.press);
  put(els.handle, { sx: hs * (1 + .04 * hp), sy: hs * (1 - .1 * hp), y: 8 * hp, o: prog(t, T.handle, T.handle + .1) });
  // the paper plane: pressed, it flies off up and out of the left edge (clear of every word), and a new one springs into the socket
  const pp = planePos(t), back = spring(t - (T.press + .9), 3.4, .5);
  if (t < T.press + .9) put(els.plane, { x: pp[0] - SOCK[0], y: pp[1] - SOCK[1], r: -20 * prog(t, T.press, T.press + .55), s: 1 + .4 * prog(t, T.press, T.press + .55), o: 1 - prog(t, T.press + .45, T.press + .6) });
  else put(els.plane, { s: back, o: 1 });
  put(els.ask, { y: 36 * (1 - E.house(prog(t, T.ask, T.ask + .4))), o: prog(t, T.ask, T.ask + .3) });
}

/* =====================================================================================================================
   FX — the ball, its bursts, the glass (walls that flash when hit), her real contacts, the screen smash, confetti
   ===================================================================================================================== */
function glassFlash(ctx, t) {
  for (const im of Ball.impacts) {
    if (!im.glass) continue;
    const dt = t - im.t; if (dt < 0 || dt > .45) continue;
    const a = Math.pow(1 - dt / .45, 1.6), x = im.glass === 'L' ? 0 : 1080, dir = im.glass === 'L' ? 1 : -1, len = 900;
    const g = ctx.createLinearGradient(0, im.y - len / 2, 0, im.y + len / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, `rgba(255,255,255,${(.85 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(dir > 0 ? 0 : 1080 - 22, im.y - len / 2, 22, len);
    const g2 = ctx.createRadialGradient(x, im.y, 0, x, im.y, 260);
    g2.addColorStop(0, `rgba(208,255,65,${(.5 * a).toFixed(3)})`); g2.addColorStop(1, 'rgba(208,255,65,0)');
    ctx.fillStyle = g2; ctx.fillRect(x - 260, im.y - 260, 520, 520);
    for (const k of [-1, 1]) { ctx.fillStyle = `rgba(255,255,255,${(.9 * a).toFixed(3)})`; ctx.beginPath(); ctx.arc(x + dir * 30, im.y + k * 230, 9 + 6 * a, 0, TAU); ctx.fill(); }
  }
}
/* the glass walls of the padel scenes: four panes slam up at the save (right first), then stay as faint glass with bolts */
function walls(ctx, t) {
  const inPadel = (t > T.save && t < T.pane[0] + .1) || (t > T.racket[1] && t < DUR + 1);
  if (!(t > T.save)) return;
  const slam = [[T.save, 'R'], [T.save + .06, 'L'], [T.save + .12, 'T'], [T.save + .18, 'B']];
  for (const [t0, side] of slam) {
    const u = E.outCubic(prog(t, t0, t0 + .1)); if (u <= 0) continue;
    const a = inPadel ? .1 + .35 * bump(t, t0, t0 + .5, .1) : .0;
    if (a < .005) continue;
    ctx.fillStyle = `rgba(233,255,158,${a.toFixed(3)})`;
    if (side === 'R') ctx.fillRect(1080 - 18, 1920 * (1 - u), 18, 1920 * u);
    if (side === 'L') ctx.fillRect(0, 1920 * (1 - u), 18, 1920 * u);
    if (side === 'T') ctx.fillRect(0, 0, 1080 * u, 14);
    if (side === 'B') ctx.fillRect(1080 * (1 - u), 1920 - 14, 1080 * u, 14);
    ctx.fillStyle = `rgba(255,255,255,${(a * 1.6).toFixed(3)})`;
    if (side === 'R' || side === 'L') for (let y = 300; y < 1920 * u + 1920 * (1 - u) && y < 1900; y += 420) if (y > 1920 * (1 - u)) { ctx.beginPath(); ctx.arc(side === 'R' ? 1062 : 18, y, 6, 0, TAU); ctx.fill(); }
  }
}
function realHits(ctx, t) {
  for (const h of REAL_HITS) {
    const dt = t - h.t; if (dt < 0 || dt > .7 || (h.until && t >= h.until)) continue;
    const [x, y] = srcToStage(h.clip, h.view(h.t), h.x, h.y);
    const u = dt / .5;
    if (u < 1) {
      ctx.strokeStyle = `rgba(208,255,65,${(.95 * (1 - u)).toFixed(3)})`; ctx.lineWidth = 12 * (1 - u) + 2;
      ctx.beginPath(); ctx.arc(x, y, 30 + 150 * h.big * E.outCubic(u), 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${(.7 * (1 - u)).toFixed(3)})`; ctx.lineWidth = 5 * (1 - u) + 1;
      ctx.beginPath(); ctx.arc(x, y, 20 + 90 * h.big * E.outCubic(Math.min(1, u * 1.4)), 0, TAU); ctx.stroke();
    }
    const R = rng(Math.round(h.t * 1000) + 3), n = Math.round(10 * h.big) + 4;
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (R() - .3) * 2.6, sp = 500 + R() * 900, life = .22 + R() * .2; if (dt > life) continue;
      const d = sp * (1 - Math.exp(-dt * 6)) / 6, d0 = sp * (1 - Math.exp(-Math.max(0, dt - .035) * 6)) / 6, uu = dt / life;
      ctx.strokeStyle = i % 3 ? `rgba(255,255,255,${(1 - uu).toFixed(3)})` : `rgba(208,255,65,${(1 - uu).toFixed(3)})`; ctx.lineWidth = 5 * (1 - uu) + 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * d0, y + Math.sin(ang) * d0); ctx.lineTo(x + Math.cos(ang) * d, y + Math.sin(ang) * d); ctx.stroke();
    }
  }
}
function tracers(ctx, t) {
  for (const tr of TRACKS) {
    const ts = tr.pts.map(p => tr.at(p[0])); if (t < ts[0] || t > ts[ts.length - 1] + .05) continue;
    const v = tr.view(qt(t)), pos = tt => { if (tt < ts[0] || tt > ts[ts.length - 1]) return null; let i = 1; while (i < ts.length - 1 && ts[i] < tt) i++; const f = clamp((tt - ts[i - 1]) / (ts[i] - ts[i - 1])); return srcToStage(tr.clip, v, lerp(tr.pts[i - 1][1], tr.pts[i][1], f), lerp(tr.pts[i - 1][2], tr.pts[i][2], f)); };
    const head = Math.min(t, ts[ts.length - 1]), fade = 1 - prog(t, ts[ts.length - 1], ts[ts.length - 1] + .05);
    let prev = pos(head); if (!prev) continue;
    for (let k = 1; k <= 14; k++) {
      const q = pos(head - k * .014); if (!q) break;
      const u = k / 14;
      ctx.strokeStyle = `rgba(208,255,65,${((1 - u) * .85 * fade).toFixed(3)})`; ctx.lineWidth = 14 * (1 - u) + 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); prev = q;
    }
    const h = pos(head); ctx.fillStyle = `rgba(233,255,158,${(.35 * fade).toFixed(3)})`; ctx.beginPath(); ctx.arc(h[0], h[1], 26, 0, TAU); ctx.fill();
  }
}
/* the ball hits YOUR screen: a frosted bloom, rays and two rings */
function screenSmash(ctx, t) {
  const dt = t - T.smash; if (dt < 0 || dt > .7) return;
  const [x, y] = PSMASH, u = dt / .7, a = Math.pow(1 - u, 1.5);
  const g = ctx.createRadialGradient(x, y, 0, x, y, 420);
  g.addColorStop(0, `rgba(255,255,255,${(.55 * a).toFixed(3)})`); g.addColorStop(.5, `rgba(233,255,158,${(.18 * a).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 420, y - 420, 840, 840);
  const R = rng(1202);
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const ang = i / 16 * TAU + (R() - .5) * .3, r0 = 120 + 60 * E.outCubic(u), r1 = r0 + (200 + R() * 260) * E.outCubic(Math.min(1, u * 2));
    ctx.strokeStyle = `rgba(255,255,255,${(.8 * a).toFixed(3)})`; ctx.lineWidth = 4 * a + 1;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * r0, y + Math.sin(ang) * r0); ctx.lineTo(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1); ctx.stroke();
  }
  // the rings die out before they reach her face in the close-up behind (about 740 px from the impact)
  for (const [rmax, col, w] of [[1100, '255,255,255', 26], [700, '208,255,65', 16]]) {
    const r = 80 + rmax * E.outCubic(u), fade = 1 - sstep((r - 420) / 220);
    if (fade <= 0) continue;
    ctx.strokeStyle = `rgba(${col},${(.85 * a * fade).toFixed(3)})`; ctx.lineWidth = w * a + 2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
  }
}
/* the line where the blue floods in, and the pane's glint, drawn as light */
function floodEdge(ctx, t) {
  const fl = E.inOutCubic(prog(t, T.flood[0], T.flood[1])); if (fl <= 0 || fl >= 1) return;
  const x = 1080 * (1 - fl), g = ctx.createLinearGradient(x - 40, 0, x + 40, 0);
  g.addColorStop(0, 'rgba(208,255,65,0)'); g.addColorStop(.5, 'rgba(233,255,158,.95)'); g.addColorStop(1, 'rgba(208,255,65,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 40, 0, 80, 1920);
}
function drawFx(t) {
  const ctx = els.ctx; ctx.clearRect(0, 0, W, H);
  const NB = QS.has('noball');                                  // ?noball=1 = a clean frame (the cover): no ball, trail, rings, tracer or confetti
  walls(ctx, t);
  floodEdge(ctx, t);
  drawStreaksH(ctx, t, 'fling', [T.save, T.save + .6], 21, 26, [255, 255, 255], [236, 153, 175], -1);
  drawStreaksH(ctx, t, 'flip', [T.flip[0], T.flip[0] + .5], 31, 22, [255, 255, 255], [208, 255, 65], -1);
  if (t > T.seam[0] && t < T.seam[1] + .2) { ctx.save(); ctx.globalAlpha = Math.sin(Math.PI * clamp((t - T.seam[0]) / .6)) * .9; drawStreaksUp(ctx, t, seamY(t), 'seam', 11, 46, [208, 255, 65]); ctx.restore(); }
  if (NB) return;
  glassFlash(ctx, t);
  tracers(ctx, t);
  realHits(ctx, t);
  screenSmash(ctx, t);
  drawTrail(ctx, t, () => tintAt(t));
  drawBursts(ctx, t);
  const b = ballState(t);
  if (b) {
    b.sq = squashAt(t);
    let al = 1; if (b.L.alpha) al = lerp(b.L.alpha[0], b.L.alpha[1], clamp((t - b.L.t0) / b.L.T));
    if (al > .01) drawBall(ctx, b, tintAt(t), al);
  }
  planeTrail(ctx, t);
}
/* a dashed lime trail behind the flying paper plane */
function planeTrail(ctx, t) {
  if (t < T.press || t > T.press + 1.1) return;
  const head = Math.min(t, T.press + .6), a = 1 - prog(t, T.press + .6, T.press + 1.1);
  ctx.save(); ctx.strokeStyle = `rgba(208,255,65,${(.9 * a).toFixed(3)})`; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.setLineDash([2, 18]);
  ctx.beginPath(); let first = true;
  for (let tt = T.press; tt <= head + 1e-6; tt += .01) { const p = planePos(tt); if (first) { ctx.moveTo(p[0], p[1]); first = false; } else ctx.lineTo(p[0], p[1]); }
  ctx.stroke(); ctx.restore();
}
function render(t) {
  t = clamp(t, 0, DUR);
  const c = camera(t);
  put(els.cam, { x: c.x, y: c.y, s: c.s, r: c.r });
  sceneHook(t); sceneName(t); sceneTennis(t); scenePadel(t); sceneClasses(t); sceneDM(t);
  setStyle(els.flash, 'opacity', (bump(t, T.smash - .005, T.smash + .14, .15) * .5 + bump(t, T.save - .005, T.save + .12, .2) * .3 + bump(t, T.rHit - .005, T.rHit + .1, .2) * .2 + bump(t, T.press - .005, T.press + .1, .2) * .15).toFixed(3));
  drawFx(t);
}

/* =====================================================================================================================
   SOUND — the cues tools/make_sfx.py synthesizes (the bounces come from Ball.impacts), and her real racket pops (clipAudioPlan)
   ===================================================================================================================== */
function soundPlan() {
  const C = [], add = (t, k, o) => C.push(Object.assign({ t, k }, o || {}));
  // S1
  add(.22, 'whoosh', { dur: .4, f0: 400, f1: 2600, pan: .3 }); add(T.smash, 'smash'); add(T.smash, 'boom'); add(.85, 'whoosh', { dur: .35, f0: 2600, f1: 300, pan: .4, pan1: 0 });
  // S2
  add(T.pill2, 'pop', { f: 560, pan: 0 }); [0, 1].forEach(i => add(T.nm2 + i * .14, 'swish', { pan: .15 - i * .3 })); add(T.bar2[0], 'zip', { pan: .2 }); add(T.door[0], 'doors', { dur: T.door[1] - T.door[0] });
  // S3
  for (let k = 2; k <= 13; k++) add(T.n13[0] + (T.n13[1] - T.n13[0]) * (1 - Math.pow(1 - k / 13, 1 / 4)), 'tick', { f: 1500 + k * 60, pan: 0, vol: .5 });
  [0, 1, 2].forEach(i => add(T.l13 + i * .13, 'swish', { pan: .2 - i * .2, vol: .6 }));
  [T.c1, T.c2, T.c3].forEach((tc, i) => { add(tc - .12, 'slap'); add(tc, 'ping', { f: 1320 + i * 220, vol: .45, pan: -.4 }); });
  add(T.c2, 'draw', { dur: .5 }); add(T.c3, 'draw', { dur: .5 });
  // the save: four panes slam, the blue floods in, ۲ ticks
  [0, .06, .12, .18].forEach((d, i) => add(T.save + d, 'thud', { vol: .7 - i * .1, pan: [.7, -.7, 0, 0][i] })); add(T.save, 'wipe', { dur: .55 }); add(T.save, 'shimmer', { dur: .6 });
  add(T.n2[0] + .2, 'tick', { f: 2200, vol: .55 }); add(T.l2, 'swish', { pan: 0 });
  // S4
  add(T.pane[0], 'whoosh', { dur: .4, f0: 300, f1: 2400, pan: .6, pan1: -.6 }); add(T.pane[0], 'wipe', { dur: .4 });
  add(T.b4, 'pop', { f: 520, vol: .6 }); for (let i = 0; i < 7; i++) add(T.b2 + i * .12 + .1, 'tick', { f: 1700 + i * 90, vol: .35, pan: .3 - i * .1 });
  // S5 / S6
  add(T.racket[0], 'whoosh', { dur: .5, f0: 200, f1: 1900, pan: .7, pan1: -.7 }); add(T.rHit, 'slap'); add(T.rHit, 'smash');
  [0, 1].forEach(i => add(T.hd5 + i * .3, 'swish', { pan: 0 })); [T.k1, T.k2, T.k3].forEach(tk => add(tk - .12, 'slap'));
  add(T.flip[0], 'whoosh', { dur: .4, f0: 400, f1: 2200, pan: .3, pan1: -.3 }); add(T.hd6, 'swish', { pan: 0 });
  [T.v1, T.v2, T.v3].forEach((tv, i) => add(tv - .1, 'pop', { f: 620 + i * 80, vol: .55, pan: .5 }));
  // S7
  add(T.seam[0], 'riser', { dur: .45 }); add(T.seam[0], 'wipe', { dur: .45 }); add(T.panel7, 'bloop'); add(T.cta1, 'swish', { pan: 0 }); add(T.cta2, 'swish', { pan: 0 });
  add(T.handle, 'pop', { f: 480 }); add(T.press, 'launch', { dur: .55 }); add(T.press, 'confetti'); add(T.press, 'pad', { dur: 2.8 }); add(T.ask, 'swish', { pan: 0, vol: .5 });
  add(T.launch, 'launch', { dur: .5 });
  return C;
}
/* her real pops: the onset goes on the picture's contact frame (sound reached the phone 17-45 ms after the hit; that lag is taken out) */
function clipAudioPlan() {
  return [
    { t: T.hit1 + .013, clip: '4633', src: 2.8039, dur: .55, gain: 1.0, pan: -.05 },
    { t: T.hit2 - .015, clip: '4631', src: 2.4985, dur: .38, gain: .9, pan: -.25 },
    // under the 1x proof stretch, the clip's own sound: her two pops AND the off-camera partner's shots (moved 45 ms earlier so her pops sit on the contacts)
    { t: T.pane[0] - .045, clip: '4630', src: fsrc(5), dur: 5.55 - fsrc(5), gain: .5, pan: 0, norm: false },
    { t: T.stop4[0] + .004, clip: '4630', src: 5.6154, dur: .55, gain: 1.0, pan: 0 },
  ];
}
