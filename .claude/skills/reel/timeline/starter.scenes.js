/* scenes.js — STARTER. A 9-second sample in Amir's brand that uses the kit's main moves. Replace the copy, the scenes and the ball plan with the real ad.
   Read .claude/skills/reel/timeline/README.md first. Contract with driver.js: DUR, init(), render(t)  (+ FONTS, soundPlan()).
   Every function below is PURE in t: no clocks, no state that outlives the call. Time is in seconds. The hits sit on a 0.5 s grid (120 BPM) only because this demo is short: plan a real ad from the READING BUDGET (README: 0.8 s + 0.25 s per word per block, nothing under the ball)
   on a 100 BPM (0.6 s) grid, and run tools/read_audit.js before you render. This starter passes it: keep it passing as you replace the copy. */
'use strict';

const DUR = 9.0;
const FONTS = [['700 40px Vazirmatn', 'سلام'], ['800 40px Vazirmatn', 'سلام'], ['900 120px Vazirmatn', 'سلام ۰۱۲۳۴۵۶۷۸۹']];
const R0 = 62;                                                 // ball radius in px
const els = {}, WI = {};

function init() {
  ['s1', 's2', 's3', 'k1', 'h1a', 'h1b', 'pill1', 'k2', 'num', 'lab', 'bar2', 'g2', 'q3', 'urlpill', 'bio', 'sig', 'wipe2', 'wipe3', 'flash', 'cam'].forEach(i => els[i] = document.getElementById(i));
  els.fx = document.getElementById('fx'); els.ctx = els.fx.getContext('2d');
  // a faint court behind the hook: lines that draw themselves on (engine.js addRect / addLine / drawOn)
  const g = document.getElementById('court1');
  addRect(g, 110, 250, 860, 1420, 18); addLine(g, 110, 960, 970, 960); addLine(g, 110, 690, 970, 690); addLine(g, 110, 1230, 970, 1230); addLine(g, 540, 690, 540, 1230);
  // headlines are typed as plain text in the template; wordify turns each into word masks that rise one by one
  WI.h1 = wordify(els.h1a).concat(wordify(els.h1b));
  WI.q3 = wordify(els.q3);
  planBall();
}

/* =====================================================================================================================
   THE BALL PLAN — one rally through the whole reel. Each leg is an arc whose gravity is SOLVED from the apex height and the arrival time.
   Every impact says where, when, how hard (mag 0..1) and which sound it makes (snd). The scenes press buttons from the same list (pressAt),
   and tools/export_sound.js turns it into the soundtrack, so picture and sound cannot drift apart.
   ===================================================================================================================== */
const PILL = { top: 1220 }, FLOOR = { top: 1340 }, URL = { top: 900 };
function planBall() {
  const legs = [], imp = [];
  const hit = (t, x, y, mag, o = {}) => imp.push(Object.assign({ t, x, y, nx: 0, ny: -1, mag, dust: [250, 247, 242], n: 12, sparks: 6, snd: 'thock' }, o));
  const clay = { dust: [224, 107, 67], ringCol: [224, 107, 67], sparkCol: [255, 255, 255] };
  // scene 1: drop onto the button, three low hops on it
  legs.push({ type: 'arc', t0: .05, t1: .5, p0: [200, -170], p1: [470, PILL.top - R0], apexY: -170, w: 11 });
  hit(.5, 470, PILL.top, .85, Object.assign({ ring: 130, shake: 6, snd: 'ui' }, clay));
  [[.5, 1.0, 470, 620], [1.0, 1.5, 620, 440], [1.5, 2.0, 440, 600]].forEach(([a, b, x0, x1]) => {
    legs.push({ type: 'arc', t0: a, t1: b, p0: [x0, PILL.top - R0], p1: [x1, PILL.top - R0], apexY: PILL.top - R0 - 70, w: 12 });          // low hops: the ball never climbs into the headline above the button
    hit(b, x1, PILL.top, .8, Object.assign({ ring: 110, snd: 'ui' }, clay));
  });
  // scene 1 -> 2: a big arc up and over the wipe, onto the chalk floor of scene 2
  legs.push({ type: 'arc', t0: 2.0, t1: 3.0, p0: [600, PILL.top - R0], p1: [540, FLOOR.top - R0], apexY: 120, w: 10 });
  hit(3.0, 540, FLOOR.top, 1, Object.assign({ ring: 170, shake: 12, n: 14, sparks: 10, snd: 'medal' }, clay));
  // scene 2: dribble along the floor while the number counts
  [[3.0, 3.5, 540, 420], [3.5, 4.0, 420, 660], [4.0, 4.5, 660, 520], [4.5, 5.0, 520, 600]].forEach(([a, b, x0, x1]) => {
    legs.push({ type: 'arc', t0: a, t1: b, p0: [x0, FLOOR.top - R0], p1: [x1, FLOOR.top - R0], apexY: FLOOR.top - R0 - 110, w: 13 });
    hit(b, x1, FLOOR.top, .7, Object.assign({ ring: 100, n: 8, sparks: 4 }, clay));
  });
  // scene 2 -> 3: up and over the wipe onto the link
  legs.push({ type: 'arc', t0: 5.0, t1: 6.0, p0: [600, FLOOR.top - R0], p1: [700, URL.top - 50], apexY: 160, r1: 50, w: 12 });
  hit(6.0, 700, URL.top, 1, Object.assign({ ring: 200, round: .4, shake: 12, n: 14, sparks: 10, pill: true, snd: 'pill' }, clay));
  legs.push({ type: 'arc', t0: 6.0, t1: 6.4, p0: [700, URL.top - 50], p1: [610, URL.top - 50], apexY: URL.top - 50 - 140, r0: 50, w: 10 });
  hit(6.4, 610, URL.top, .55, Object.assign({ ring: 80, n: 6, sparks: 3, pill: true, snd: 'pill' }, clay));
  legs.push({ type: 'arc', t0: 6.4, t1: 6.7, p0: [610, URL.top - 50], p1: [530, URL.top - 50], apexY: URL.top - 50 - 60, r0: 50, w: 8 });
  hit(6.7, 530, URL.top, .35, Object.assign({ ring: 0, n: 4, sparks: 0, pill: true, snd: 'pill' }, clay));
  legs.push({ type: 'hold', t0: 6.7, t1: 8.4, p0: [530, URL.top - 50], r0: 50, w: 0 });
  // out through the top, exactly where leg 1 comes in at 0.05 s: the reel loops
  legs.push({ type: 'arc', t0: 8.4, t1: 9.05, p0: [530, URL.top - 50], p1: [200, -170], apexY: 100, r0: 50, r1: R0, w: 12 });
  Ball.legs = prepLegs(legs); Ball.impacts = imp;
}
/* the ball's colour: Amir's brand is clay (no yellow). For a client: TINTS.<name> from engine.js, or a photo sprite via loadSprite(). */
function tintAt(b) { return TINTS.clay; }

/* a slow push on the whole frame + shake on the hard hits */
function camera(t) {
  const sk = shakeAt(t);
  return { s: 1 + .025 * E.soft(prog(t, 0, DUR)), x: sk.x, y: sk.y, r: sk.r };
}

/* ---------- scene 1: the hook (0 - 3.1 s). Wipes away to the left, the way Farsi reads ---------- */
function scene1(t) {
  const on = t < 3.15; show(els.s1, on); if (!on) return;
  DRAW.forEach((it, i) => drawOn(it, E.outCubic(prog(t, i * .05, .8 + i * .05))));
  put(els.k1, { y: 20 * (1 - E.house(prog(t, .1, .55))), o: prog(t, .1, .4) });
  WI.h1.forEach((wi, i) => riseTo(wi, E.house(prog(t, .3 + i * .15, 1.1 + i * .15))));
  const press = pressAt(t, im => im.snd === 'ui'), pop = spring(t - .25, 3.6, .48);
  put(els.pill1, { sx: pop, sy: pop * (1 - .18 * press), y: 12 * press, o: prog(t, .25, .4) });
  const w = E.inOutCubic(prog(t, 2.55, 3.05)), R = w * 1090;       // S1 is clipped away from the right edge; the clay line travels with that edge
  setStyle(els.s1, 'clipPath', w > 0 ? `inset(0 ${R.toFixed(1)}px 0 0)` : 'none');
  show(els.wipe2, w > 0 && w < 1); put(els.wipe2, { x: -R });
}
/* ---------- scene 2: one number (2.5 - 6.1 s) ---------- */
function scene2(t) {
  const on = t > 2.5 && t < 6.15; show(els.s2, on); if (!on) return;
  put(els.g2, { x: 50 * Math.sin(t * .7), y: 30 * Math.cos(t * .55) });
  put(els.k2, { y: 24 * (1 - E.house(prog(t, 2.9, 3.4))), o: prog(t, 2.9, 3.2) });
  els.num.textContent = fa(Math.round(1000 * E.outQuart(prog(t, 3.0, 4.2))));      // a count-up in Persian numerals
  put(els.num, { s: 1 + .06 * bump(t, 3.0, 3.4, .2), o: prog(t, 2.9, 3.1) });
  put(els.lab, { y: 30 * (1 - E.house(prog(t, 3.3, 3.8))), o: prog(t, 3.3, 3.6) });
  put(els.bar2, { sx: E.house(prog(t, 2.8, 3.3)) });                               // the chalk floor draws on right to left
  const w = E.inOutCubic(prog(t, 5.55, 6.05)), R = w * 1090;
  setStyle(els.s2, 'clipPath', w > 0 ? `inset(0 ${R.toFixed(1)}px 0 0)` : 'none');
  show(els.wipe3, w > 0 && w < 1); put(els.wipe3, { x: -R });
}
/* ---------- scene 3: the link (5.5 - 9 s) ---------- */
function scene3(t) {
  const on = t > 5.5; show(els.s3, on); if (!on) return;
  WI.q3.forEach((wi, i) => riseTo(wi, E.house(prog(t, 5.9 + i * .14, 6.7 + i * .14))));
  const press = pressAt(t, im => im.pill), pop = spring(t - 5.75, 3.2, .5);
  put(els.urlpill, { sx: pop, sy: pop * (1 - .1 * press), y: 10 * press, o: prog(t, 5.75, 5.9) });
  put(els.bio, { y: 34 * (1 - E.house(prog(t, 6.6, 7.1))), o: prog(t, 6.6, 6.9) });
  els.bio.querySelector('svg').style.transform = `translateY(${(Math.sin((t - 6.9) * 7) * 8 * (t > 6.9 ? 1 : 0)).toFixed(2)}px)`;
  put(els.sig, { y: 30 * (1 - E.house(prog(t, 6.75, 7.25))), o: prog(t, 6.75, 7.1) });
}

/* ---------- fx layer: streaks on the wipes, the ball, its trail and bursts, confetti when it lands on the link ---------- */
function drawFx(t) {
  const ctx = els.ctx; ctx.clearRect(0, 0, W, H);
  drawStreaksH(ctx, t, 'w1', [2.55, 3.05], 21, 22, [255, 255, 255], [224, 107, 67]);
  drawStreaksH(ctx, t, 'w2', [5.55, 6.05], 31, 22, [255, 255, 255], [224, 107, 67]);
  const NB = QS.has('noball');                                 // ?noball=1 = a clean frame (a cover): no ball, trail, dust, rings or confetti
  if (!NB) { drawTrail(ctx, t, b => tintAt(Object.assign({ t }, b))); drawBursts(ctx, t); }
  const b = NB ? null : ballState(t);
  if (b) { b.t = t; b.sq = squashAt(t); let al = 1; if (b.L.alpha) al = lerp(b.L.alpha[0], b.L.alpha[1], clamp((t - b.L.t0) / b.L.T)); if (al > .01) drawBall(ctx, b, tintAt(b), al); }
  if (!NB) drawConfetti(ctx, t, 6.0, 700, 880, 42, 99);
}
function render(t) {
  t = clamp(t, 0, DUR);
  const c = camera(t);
  put(els.cam, { x: c.x, y: c.y, s: c.s, r: c.r });
  scene3(t); scene2(t); scene1(t);
  drawFx(t);
}

/* ---------- sound: the cue list tools/export_sound.js + make_sfx.py turn into audio (bounces come from the ball plan by themselves) ---------- */
function soundPlan() {
  const C = [], add = (t, k, o) => C.push(Object.assign({ t, k }, o || {}));
  add(.06, 'fall', { dur: .44 }); add(.25, 'pop', { f: 480 }); [.3, .45, .6, .75].forEach(t => add(t, 'swish', { pan: .1 }));
  add(2.0, 'riser', { dur: .5 }); add(2.55, 'wipe', { dur: .5 });
  for (let tt = 3.0; tt < 4.2; tt += .06) add(tt, 'tick', { f: 1500 + 700 * E.outQuart(prog(tt, 3.0, 4.2)), vol: .4 });
  add(3.3, 'swish'); add(5.55, 'wipe', { dur: .5 }); add(5.75, 'pop', { f: 480 }); [5.9, 6.04, 6.18].forEach(t => add(t, 'swish', { pan: -.1 }));
  add(6.0, 'confetti'); add(6.0, 'pad', { dur: 2.6 }); add(6.6, 'pop', { f: 700, vol: .6 }); add(6.75, 'swish'); add(8.4, 'launch', { dur: .55 });
  return C;
}
