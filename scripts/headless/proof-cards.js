// AA Proof's share cards, headless (about 15 seconds). habits.html paints six cards (rank, receipt, streak,
// medal, title, wrap) on a canvas at three sizes (post 1080x1350, story 1080x1920, square 1080x1080) through
// buildShareCard(kind, size, subject). The subject is what a card is ABOUT (a medal, a title, a day, a streak
// mark, a habit) or null. This renders every card for every subject the app hands one (the Month card in a
// six-row month too), writes the PNGs to --out (<card>-<subject>-<size>.png, plus draws.json: every text, shape
// and colour the canvas was told to draw), and reads what was drawn by wrapping the canvas (fillText, fillStyle,
// strokeStyle, shadowColor, gradient stops, the path of every fill), never by looking at pixels:
//   - Story: no text above y 250 or below y 1580 (Instagram covers the top 250 px and the bottom 340 px), and
//     the footer's four texts have baselines at or above 1580.
//   - Every size: the handle and the site are drawn; no text runs past the left or right edge (or off the top
//     or bottom); no plate, chip, panel or tile (a filled shape from 2,500 px2 up to half the card) cuts through
//     text it does not hold; every PNG is the size it says.
//   - The subject is on its card: the medal, tier, comeback, quest, title, habit rank, day and streak mark.
//   - No gold, yellow, amber or ochre (hue 33-70, saturation over .30, lightness .20-.85) in any fill, stroke,
//     shadow or gradient stop: the house rule, no yellow in either app. (Emoji are drawn by the emoji font, so
//     the rule cannot see them: the run prints a note listing the gold-looking ones.)
//   - No page errors.
// And the routing in the real UI, by clicks: a takeover's Share it opens the card of THAT win and parks the
// rest of the queue until the picker closes; the wins card's Share it holds the newest win of each card, and
// the rail then shows them; the picker's rail names follow the subject; every other door to a card (a quest, a
// streak mark, a skin, a rank-up, a tier, a comeback, a habit's rank, a season with no title).
// Career Mode phase 3 (the catalogue switch): the same cards for the subjects it adds, on a page whose profile has the catalogue on (scripts/headless/career.js
// builds the answer in the shape get_profile() really gives): a badge of each kind of win and an achievement as {k: 'award', id} on the Milestone card (its tier's
// metal, its kind of win's emoji, none of them gold), a catalogue title and the Grand Slam on the Title card, an event title that is also a catalogue title.
// A made-up athlete (lib.js stub), 40 days of log ending today. Serve the repo first
// (python -m http.server 8765 --bind 127.0.0.1, see lib.js), then:
//   node scripts/headless/proof-cards.js [--out <dir for the PNGs>]
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const TZ = 'Europe/London';   // the browser's zone, so "today" is the same day here and in the page
// habits.html draws no Rank card, no Title card and no Locker while CAREER_LIGHT is true (Career Mode round 5, 2026-10-19: the lightest version).
// The routing below (section 5) walks those doors, so it runs on the page with the switch set false: that drawing code stays under test
// until "the cut" removes it. scripts/headless/proof-light.js tests the light version (the picker's rail, the doors that fall back to the day's card).
const LEGACY_HTML = fs.readFileSync(path.join(__dirname, '..', '..', 'habits.html'), 'utf8');
if (LEGACY_HTML.split('const CAREER_LIGHT = true;').length !== 2) throw new Error('proof-cards.js: habits.html has no "const CAREER_LIGHT = true;" to switch off');
const LEGACY_PAGE = LEGACY_HTML.replace('const CAREER_LIGHT = true;', 'const CAREER_LIGHT = false;');
function legacyBrowser(browser) {
  return { newContext: async (...a) => {
    const ctx = await browser.newContext(...a);
    const np = ctx.newPage.bind(ctx);
    ctx.newPage = async () => {
      await ctx.route(u => u.origin === new URL(H.BASE).origin && u.pathname === '/habits.html',
        r => r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: LEGACY_PAGE }));
      return np();
    };
    return ctx;
  } };
}
const SIZES = ['post', 'story', 'square'];
const DIMS = { post: [1080, 1350], story: [1080, 1920], square: [1080, 1080] };
const COVERED = { top: 250, bottom: 1580 };   // Story: Instagram covers the top 250 px and the bottom 340 px of 1920
const FOOTER = ['AA PROOF', 'The habit tracker that keeps score', '@amirardekanian', 'AMIRARDEKANI.COM'];
const HANDLE = ['@amirardekanian', 'AMIRARDEKANI.COM'];

// ── The athlete: 40 days of log ending today ──
const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: TZ });   // 'YYYY-MM-DD'
const ago = n => { const [y, m, d] = todayKey.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10); };
const yesterday = ago(1);

// The five core habits done on most days (a short day keeps part of its number, a missed check is left out),
// water and steps on every one of the last 25 days, today and yesterday perfect, and one empty day 31 days
// back so a best streak sits behind the current one. `broken` leaves today and yesterday empty: the day
// streak is 0, the case for a streak mark that was crossed and then lost (a streak card must still say 7).
function habitLog(broken) {
  const full = { strength: 1, steps: 10000, sleep: 8, fuel: 3, water: 8 };
  const part = { steps: 6500, sleep: 6.5, fuel: 2, water: 5 };
  const miss = { strength: [2, 5, 9, 14, 20, 27, 33], sleep: [4, 12, 17, 23, 30, 36], fuel: [7, 15, 26, 37], steps: [28, 38], water: [34] };
  const log = {};
  for (let n = 0; n < 40; n++) {
    if (n === 31 || (broken && n < 2)) continue;
    const day = Object.assign({}, full);
    Object.keys(miss).forEach(h => { if (miss[h].includes(n)) { if (h in part) day[h] = part[h]; else delete day[h]; } });
    log[ago(n)] = day;
  }
  return log;
}
// Everything worn or shown on a card: every title in the cases, the Ember skin and a finished season.
const CFG_SEED = {
  pass: { owned: ['t_signed', 't_23', 'c_ember', 't_early', 't_unbowed', 't_sn_20260726', 't_proof'], title: 't_early', card: null },
  seasons: [{ starts_on: '2026-07-26', season_name: 'Pre-Season', ended_on: '2026-10-17', level: 23, xp: 21400, title: 't_sn_20260726' }],
  seasonNames: [{ starts_on: '2026-07-26', name: 'Pre-Season' }],
};

// ── The cards: every subject the app hands one, and what must be drawn for the subject to be on it ──
const QUEST = { title: 'THE WELL RUNS DEEP', note: 'Full water on 5 days', kind: 'daysHit:water', xp: 150 };
// A thing to find: some drawn text that has / is / starts with it, or a ground (the colours painted) that is not
// the one another card painted (the Ember skin is not the House ground).
const has = s => ['has', s], is = s => ['is', s], starts = s => ['starts', s], differs = id => ['differs', id];
const say = w => w[0] === 'differs' ? `a ground other than ${w[1]}'s` : JSON.stringify(w[1]);
// show(facts) -> the list of things to find. broken: rendered on the page whose day streak is 0. on: [y, m, d], the
// date the app's clock reads for that card only (today()), for a month whose grid has a different shape.
const CASES = [
  { card: 'rank', slug: 'none', subj: null, show: f => [starts('PROOF ·'), has(f.overall)] },
  { card: 'rank', slug: 'level', subj: { moment: 'level' }, show: f => [has('LEVEL UP'), has(f.overall)] },
  { card: 'rank', slug: 'newrank-ember', subj: { moment: 'rank', skin: 'c_ember' }, show: () => [has('NEW RANK'), differs('rank-level')] },
  { card: 'rank', slug: 'habit-water', subj: { habit: 'water' }, show: f => [has('WATER RANK'), has(f.water)] },
  { card: 'receipt', slug: 'none', subj: null, show: f => [starts(f.dateToday), has('BANKED TODAY')] },
  { card: 'receipt', slug: 'yesterday', subj: { day: yesterday }, show: f => [starts(f.dateYesterday), is('A perfect day.'), has('BANKED THAT DAY')] },
  { card: 'streak', slug: 'none', subj: null, show: f => [is(String(f.streak))] },
  { card: 'streak', slug: 'days-7', subj: { days: 7 }, broken: true, show: () => [is('7')] },
  { card: 'streak', slug: 'none-broken', subj: null, broken: true, show: () => [is('0')] },
  { card: 'medal', slug: 'none', subj: null, show: f => [has(f.medal ? f.medal.toUpperCase() : 'No milestones yet.')] },
  { card: 'medal', slug: 'milestone-HS2', subj: { k: 'milestone', id: 'HS2' }, show: () => [has('HUMAN SPRINKLER II')] },
  { card: 'medal', slug: 'tier-locked-in', subj: { k: 'tier', ti: 2, h: ['water', 'steps'] }, show: () => [has('LOCKED IN')] },
  { card: 'medal', slug: 'comeback', subj: { k: 'comeback', gone: 4 }, show: () => [has('SECOND WIND')] },
  { card: 'medal', slug: 'quest', subj: { k: 'quest', q: QUEST }, show: () => [has('THE WELL RUNS DEEP')] },
  { card: 'title', slug: 'none', subj: null, show: f => [has(f.title ? f.title.toUpperCase() : 'No title yet.')] },
  { card: 'title', slug: 't_early', subj: { id: 't_early' }, show: () => [has('EARLY DOORS')] },
  { card: 'title', slug: 't_unbowed', subj: { id: 't_unbowed' }, show: () => [has('UNBOWED'), has('FINISHED BACKBONE')] },
  { card: 'title', slug: 't_sn_20260726', subj: { id: 't_sn_20260726' }, show: () => [has('PRE-SEASON')] },
  { card: 'title', slug: 't_proof', subj: { id: 't_proof' }, show: () => [has('PROOF ITSELF')] },
  { card: 'wrap', slug: 'none', subj: null, show: () => [has('My month, logged.')] },
  // The month grid has 5 rows in most months and 6 in some (a Sunday start, or a Saturday start with 31 days): the
  // tight fit. November 2026 starts on a Sunday and has 30 days.
  { card: 'wrap', slug: 'six-row-month', subj: null, on: [2026, 11, 15], show: () => [has('NOVEMBER 2026 · 30 DAYS')] },
];
// Career Mode phase 3: the subjects the catalogue switch adds. They are painted on a page whose profile has the catalogue on (cat: true).
const A = (id, name, kindOfWin, emoji) => ({ card: 'medal', slug: 'award-' + id.replace(/[:_]/g, '-'), subj: { k: 'award', id }, cat: true, emoji,
  show: () => [has(name), has(kindOfWin.toUpperCase()), has(emoji)] });
CASES.push(
  A('badge:held_weeks:3', 'HOLD SERVE · EMERALD', 'Consistency', '🔁'),
  A('badge:century:2', 'CENTURY · SILVER', 'Commitment', '📅'),
  A('badge:bests:3', 'RECORD BREAKER · EMERALD', 'Progress', '📈'),
  A('badge:comebacks:2', 'HARD TO KILL · SILVER', 'Resilience', '🛡️'),
  A('badge:habit_water:1', 'HUMAN SPRINKLER · BRONZE', 'Consistency', '🔁'),
  A('achievement:the_foundry', 'THE FOUNDRY', 'Commitment', '📅'),
  { card: 'title', slug: 'cat-clockwork', subj: { id: 'clockwork' }, cat: true, show: () => [has('CLOCKWORK'), has('TITLE · CONSISTENCY')] },
  { card: 'title', slug: 'cat-the-constant', subj: { id: 'the_constant' }, cat: true, show: () => [has('THE CONSTANT')] },
  { card: 'title', slug: 'cat-grand-slam', subj: { id: 'grand_slam' }, cat: true, show: () => [has('GRAND SLAM'), has('A TITLE IN ALL FOUR')] },
  { card: 'title', slug: 'cat-event-sun-forged', subj: { id: 't_sunforged' }, cat: true, show: () => [has('SUN-FORGED'), has('FINISHED THE FOUNDRY')] },
);
CASES.forEach(c => { c.id = c.card + '-' + c.slug; });

// ── In the page ──
// Wraps the canvas once, so every card leaves a record of what it drew. Only canvases 1000 px wide or more (the
// cards) are recorded, so nothing else the app paints can end up in a card's list. Colours are stored as the
// canvas gives them back (#rrggbb or rgba(r, g, b, a)), whatever CSS syntax the app wrote.
function installCapture() {
  if (window.__cap) return;
  const cap = window.__cap = { texts: [], colours: [], shapes: [] };
  const proto = CanvasRenderingContext2D.prototype, wide = c => c.canvas && c.canvas.width >= 1000;
  const fillDesc = Object.getOwnPropertyDescriptor(proto, 'fillStyle');
  const scratch = document.createElement('canvas').getContext('2d');
  const canon = css => { fillDesc.set.call(scratch, '#000000'); fillDesc.set.call(scratch, css); return fillDesc.get.call(scratch); };
  ['fillText', 'strokeText'].forEach(fn => {
    const orig = proto[fn];
    proto[fn] = function (text, x, y) {
      if (wide(this)) {
        const m = this.getTransform(), s = String(text);
        cap.texts.push({ fn, text: s, x, y, font: this.font, align: this.textAlign, baseline: this.textBaseline,
          ls: parseFloat(this.letterSpacing) || 0, width: this.measureText(s).width,
          cw: this.canvas.width, ch: this.canvas.height, ctm: [m.a, m.b, m.c, m.d, m.e, m.f] });
      }
      return orig.apply(this, arguments);
    };
  });
  ['fillStyle', 'strokeStyle', 'shadowColor'].forEach(prop => {
    const d = Object.getOwnPropertyDescriptor(proto, prop);
    Object.defineProperty(proto, prop, { configurable: true, enumerable: d.enumerable, get: d.get, set(v) {
      d.set.call(this, v);
      if (typeof v === 'string' && wide(this)) cap.colours.push({ prop, css: v, rgba: d.get.call(this) });   // a gradient object is read through its stops
    } });
  });
  const stop = CanvasGradient.prototype.addColorStop;
  CanvasGradient.prototype.addColorStop = function (at, css) { cap.colours.push({ prop: 'stop', css, rgba: canon(css) }); return stop.call(this, at, css); };
  // Filled shapes (a plate, chip, panel, tile or band): the bounding box of the path when fill() runs, each point
  // mapped through the transform it was added under. An arc counts as its circle, so a wedge over-estimates; the
  // reader leaves out the shapes that cover half the canvas or more.
  let box = null;
  const grow = (c, x, y) => {
    const m = c.getTransform(), X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f;
    box = box ? [Math.min(box[0], X), Math.min(box[1], Y), Math.max(box[2], X), Math.max(box[3], Y)] : [X, Y, X, Y];
  };
  const onPath = (fn, pts) => { const orig = proto[fn]; proto[fn] = function (...a) { pts(this, a); return orig.apply(this, a); }; };
  onPath('beginPath', () => { box = null; });
  onPath('moveTo', (c, a) => grow(c, a[0], a[1]));
  onPath('lineTo', (c, a) => grow(c, a[0], a[1]));
  onPath('arcTo', (c, a) => { grow(c, a[0], a[1]); grow(c, a[2], a[3]); });
  onPath('arc', (c, a) => { grow(c, a[0] - a[2], a[1] - a[2]); grow(c, a[0] + a[2], a[1] + a[2]); });
  onPath('rect', (c, a) => { grow(c, a[0], a[1]); grow(c, a[0] + a[2], a[1] + a[3]); });
  const fill = proto.fill, fillRect = proto.fillRect;
  proto.fill = function (...a) {
    if (wide(this) && box && !(a[0] instanceof Path2D)) cap.shapes.push({ box: box.slice() });
    return fill.apply(this, a);
  };
  proto.fillRect = function (x, y, w, h) {
    if (wide(this)) { const m = this.getTransform(); cap.shapes.push({ box: [m.a * x + m.e, m.d * y + m.f, m.a * (x + w) + m.e, m.d * (y + h) + m.f] }); }
    return fillRect.call(this, x, y, w, h);
  };
}

// One card the way the picker paints it: the PNG (base64) and what was drawn on it.
function shoot(p, card, size, subj) {
  return p.evaluate(async ([card, size, subj]) => {
    window.__cap.texts = []; window.__cap.colours = []; window.__cap.shapes = [];
    const blob = await buildShareCard(card, size, subj);
    const b64 = await new Promise((done, fail) => { const r = new FileReader(); r.onload = () => done(String(r.result).split(',')[1]); r.onerror = fail; r.readAsDataURL(blob); });
    return { b64, texts: window.__cap.texts, colours: window.__cap.colours, shapes: window.__cap.shapes };
  }, [card, size, subj]);
}

// Numbers the cases compare against, asked of the app itself: its own level, streak, newest medal and worn title,
// and the two dates as the card writes them (en-GB, upper case).
function facts(p) {
  return p.evaluate(([today, yest]) => {
    const day = key => { const [y, m, d] = key.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long' }).toUpperCase(); };
    return { today: TKEY(), perfectYesterday: isPerfect(yest), streak: currentDayStreak(), best: bestDayStreak(),
      overall: overallLevel().rank.label.toUpperCase(), water: habitLevel(habitById('water')).rank.label.toUpperCase(),
      medal: (latestMedal() || {}).name, title: (passTitle() || {}).name,
      dateToday: day(today), dateYesterday: day(yest) };
  }, [todayKey, yesterday]);
}

// ── Reading what was drawn ──
const px = font => parseFloat((/(\d+(?:\.\d+)?)px/.exec(font) || [])[1]) || 16;
// Where a text's glyphs sit, in canvas pixels. measureText's width includes the letter-spacing after the last
// character, which is blank, so the ink stops one spacing short. Alphabetic: top = y - .8 em, bottom = y + .25 em.
function boxOf(tx) {
  const [a, , , d, e, f] = tx.ctm, fs = px(tx.font) * Math.abs(d), w = tx.width * Math.abs(a);
  const X = a * tx.x + e, Y = d * tx.y + f;
  const l = tx.align === 'center' ? X - w / 2 : (tx.align === 'right' || tx.align === 'end') ? X - w : X;
  const above = { middle: 0.5, top: 0, hanging: 0, bottom: 1 }[tx.baseline] ?? 0.8;
  const below = { middle: 0.5, top: 1, hanging: 1, bottom: 0 }[tx.baseline] ?? 0.25;
  return { l, r: l + w - tx.ls * Math.abs(a), t: Y - fs * above, b: Y + fs * below };
}
const short = s => (s.length > 34 ? s.slice(0, 33) + '…' : s);
const drew = (tx, b) => `"${short(tx.text)}" ${tx.font} y=${Math.round(tx.y)} glyphs y ${Math.round(b.t)}..${Math.round(b.b)}, x ${Math.round(b.l)}..${Math.round(b.r)}`;

function rgbOf(css) {
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(css);
  if (m) { const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
  m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/i.exec(css);
  return m ? [+m[1], +m[2], +m[3]] : null;
}
function hslOf([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, l = (max + min) / 2;
  if (!d) return [0, 0, l];
  const hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(hue * 60 + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l];
}
// Amir's rule: no hue 33-70 deg with saturation over .30 and lightness .20-.85. Alpha does not excuse a colour.
function goldish(css) {
  const c = rgbOf(css);
  if (!c) return false;
  const [h, s, l] = hslOf(c);
  return h >= 33 && h <= 70 && s > 0.30 && l >= 0.20 && l <= 0.85;
}
// Colour emoji the canvas colour rule cannot judge: the ones whose glyphs are gold or yellow.
const GOLD_EMOJI = /[🏆🥇🏅🎖⭐🌟✨💫⚡☀🌞💡💰🪙👑🔔🍋🍌🧀🟡🟨]/gu;

(async () => {
  const out = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const errs = [];
  const open = log => H.openProof(browser, { w: 390, h: 844, tz: TZ, cfg: CFG_SEED, seed: { _hab_log: log } });
  const shots = [];   // one per card, subject and size: { id, size, texts, colours, png | error }

  async function paintAll(p, cases) {
    for (const c of cases) {
      // A card with its own date: the app's today() answers it for this card only.
      if (c.on) await p.evaluate(([y, m, d]) => { window.today0 = window.today0 || window.today; window.today = () => new Date(y, m - 1, d); invalidateBonus(); }, c.on);
      for (const size of SIZES) {
        const s = { id: c.id, size, texts: [], colours: [], shapes: [] };
        try {
          const r = await shoot(p, c.card, size, c.subj);
          const png = Buffer.from(r.b64, 'base64');
          fs.writeFileSync(path.join(out, `${c.id}-${size}.png`), png);
          Object.assign(s, { texts: r.texts, colours: r.colours, shapes: r.shapes,
            png: { sig: png.subarray(0, 8).toString('hex'), w: png.readUInt32BE(16), h: png.readUInt32BE(20) } });
        } catch (e) { s.error = String(e && e.message || e).split('\n')[0]; }
        shots.push(s);
      }
      if (c.on) await p.evaluate(() => { window.today = window.today0; invalidateBonus(); });
    }
  }

  // 1. The athlete with a live streak: every card, every subject, all three sizes.
  const A = await open(habitLog(false));
  await A.p.evaluate(installCapture);
  const f = await facts(A.p);
  t.check('setup: the page and this script agree on today', f.today === todayKey, f.today + ' vs ' + todayKey);
  t.check('setup: yesterday is a perfect day and a day streak is running', f.perfectYesterday && f.streak >= 8, JSON.stringify({ perfectYesterday: f.perfectYesterday, streak: f.streak, best: f.best }));
  await paintAll(A.p, CASES.filter(c => !c.broken && !c.cat));
  errs.push(...A.p.errs);
  await A.ctx.close();

  // 2. The same athlete after losing the streak: a mark crossed earlier (7) is still the number its card shows.
  const B = await open(habitLog(true));
  await B.p.evaluate(installCapture);
  const fb = await facts(B.p);
  t.check('setup: the second page has no day streak (a lost streak, with a best behind it)', fb.streak === 0 && fb.best >= 7, JSON.stringify({ streak: fb.streak, best: fb.best }));
  await paintAll(B.p, CASES.filter(c => c.broken && !c.cat));
  errs.push(...B.p.errs);
  await B.ctx.close();

  // 2b. The catalogue switch on: the same athlete, with a profile that has the awards, the titles and a full Grand Slam, and the catalogue copy the cards name them from.
  const R = require('./career');
  const slamTitles = { consistency: { id: 'clockwork', name: 'CLOCKWORK' }, commitment: { id: 'sun_forged', name: 'SUN-FORGED' }, progress: { id: 'proven', name: 'PROVEN' }, resilience: { id: 'second_wind', name: 'SECOND WIND' } };
  const slam = Object.fromEntries(Object.entries(slamTitles).map(([k, v]) => [k, Object.assign({ day: R.at(-2) }, v)]).concat([['grand', { id: 'grand_slam', name: 'GRAND SLAM', day: R.at(-1) }]]));
  const prof = R.rwProfile(10000, { slam, worn: null,
    owned: { 'title:grand_slam': R.at(-1), 'title:sun_forged': R.at(-2), 'badge:held_weeks:3': R.at(-2), 'badge:century:2': R.at(-9), 'badge:bests:3': R.at(-8), 'badge:comebacks:2': R.at(-7), 'badge:habit_water:1': R.at(-5), 'achievement:the_foundry': R.at(-2) },
    titles: [{ id: 'clockwork', hab_id: 'clockwork', name: 'CLOCKWORK', meaning: 'consistency', metal: 'prismatic', from: 'Hold Serve, prismatic: 52 weeks held in a row', day: R.at(-20), source: 'award' },
      { id: 'the_constant', hab_id: 'the_constant', name: 'THE CONSTANT', meaning: 'consistency', metal: 'prismatic', from: 'Long Count, prismatic: 100 weeks held', day: R.at(-20), source: 'award' },
      { id: 'grand_slam', hab_id: 'grand_slam', name: 'GRAND SLAM', meaning: 'all', metal: 'prismatic', from: 'A title in all four', day: R.at(-1), source: 'award' }] });
  const D = await H.openProof(browser, { w: 390, h: 844, tz: TZ, cfg: Object.assign({}, CFG_SEED, { careerSeen: R.SWX, catalogueSeen: R.at(-3) }), seed: { _hab_log: habitLog(false) },
    stub: { profile: prof, awards: R.rwShelf(prof), tables: { career_rules: R.RW_RULES, career_facts: [], career_catalogue: R.catRows() } } });
  await D.p.waitForFunction(() => typeof catalogueReady === 'function' && catalogueReady(), null, { timeout: 15000 }).catch(() => {});
  t.check('setup: the third page has the catalogue on and holds the catalogue copy', await D.p.evaluate(() => catalogueReady()));
  await D.p.evaluate(installCapture);
  await paintAll(D.p, CASES.filter(c => c.cat));
  errs.push(...D.p.errs);
  await D.ctx.close();

  fs.writeFileSync(path.join(out, 'draws.json'), JSON.stringify(shots.map(s => ({ id: s.id, size: s.size, error: s.error,
    texts: s.texts.map(x => ({ text: x.text, x: x.x, y: x.y, font: x.font, align: x.align, baseline: x.baseline, ls: x.ls, width: Math.round(x.width) })),
    shapes: s.shapes.map(sh => sh.box.map(Math.round)), colours: [...new Set(s.colours.map(c => c.rgba))] })), null, 1));

  // 3. What was drawn. One line per rule; a rule that finds nothing passes, each card that offends is its own FAIL line.
  const bad = {}, full = [];
  const flagged = new Set();
  const flag = (rule, s, what) => {
    if (flagged.has(rule + s.id + s.size + what)) return;   // a shape filled twice (a glow, then the plate) is one finding
    flagged.add(rule + s.id + s.size + what);
    (bad[rule] = bad[rule] || []).push({ id: s.id, what: s.size + ' ' + what });
  };
  const painted = shots.filter(s => !s.error);
  shots.filter(s => s.error).forEach(s => flag('render', s, 'would not paint: ' + s.error));
  painted.forEach(s => {
    const [W, Hh] = DIMS[s.size];
    if (s.png.sig !== '89504e470d0a1a0a' || s.png.w !== W || s.png.h !== Hh) flag('render', s, `is not a ${W}x${Hh} PNG (${s.png.w}x${s.png.h})`);
    s.texts.forEach(tx => {
      const b = boxOf(tx);
      if (s.size === 'story' && (b.t < COVERED.top || b.b > COVERED.bottom)) flag('story', s, drew(tx, b));
      if (b.l < -0.5 || b.r > W + 0.5) flag('edges', s, drew(tx, b));
      if (b.t < 0 || b.b > Hh) flag('vertical', s, drew(tx, b));
    });
    // A plate, chip, panel or tile never cuts through text it does not hold: shapes from 2,500 px2 up to half the card.
    s.shapes.filter(sh => { const a = (sh.box[2] - sh.box[0]) * (sh.box[3] - sh.box[1]); return a >= 2500 && a <= 0.5 * W * Hh; }).forEach(sh => {
      const [x0, y0, x1, y1] = sh.box;
      s.texts.forEach(tx => {
        const g = boxOf(tx);
        const touches = Math.min(g.r, x1) - Math.max(g.l, x0) > 1 && Math.min(g.b, y1) - Math.max(g.t, y0) > 1;
        const holds = g.l >= x0 - 1 && g.r <= x1 + 1 && g.t >= y0 - 1 && g.b <= y1 + 1;
        if (touches && !holds) flag('cut', s, `${drew(tx, g)} is cut by a shape at x ${Math.round(x0)}..${Math.round(x1)}, y ${Math.round(y0)}..${Math.round(y1)}`);
      });
    });
    HANDLE.forEach(h => { if (!s.texts.some(x => x.text === h)) flag('handle', s, `"${h}" is not drawn`); });
    if (s.size === 'story') FOOTER.forEach(h => {
      const tx = s.texts.find(x => x.text === h);
      if (!tx) flag('footer', s, `footer text "${h}" is not drawn`);
      else if (tx.y > COVERED.bottom) flag('footer', s, `footer text "${h}" has its baseline at y=${Math.round(tx.y)}, under ${COVERED.bottom}`);
    });
    new Set(s.colours.map(c => c.rgba)).forEach(rgba => {
      if (!goldish(rgba)) return;
      const c = s.colours.find(x => x.rgba === rgba), [h, sat, l] = hslOf(rgbOf(rgba));
      flag('gold', s, `${c.prop} ${c.css} (${rgba}) is hue ${Math.round(h)}, saturation ${sat.toFixed(2)}, lightness ${l.toFixed(2)}`);
    });
  });
  function verdict(label, key, okNote) {
    const list = bad[key] || [];
    if (!list.length) return t.check(label, true, okNote);
    const by = new Map();
    list.forEach(o => by.set(o.id, (by.get(o.id) || []).concat(o.what)));
    by.forEach((whats, id) => {
      t.check(`${label} · ${id}`, false, whats.slice(0, 2).join(' | ') + (whats.length > 2 ? ` | +${whats.length - 2} more` : ''));
      full.push(`${label} · ${id}\n    ` + whats.join('\n    '));
    });
  }
  const nTexts = painted.reduce((n, s) => n + s.texts.length, 0), nStory = painted.filter(s => s.size === 'story').length;
  verdict('every card paints a PNG of its size', 'render', `${shots.length} cards: ${CASES.length} subjects x ${SIZES.length} sizes`);
  verdict('story: no text above y 250 or below y 1580', 'story', `${nStory} Story cards`);
  verdict('story: the footer\'s four texts are drawn, baselines at or above y 1580', 'footer', `${nStory} Story cards`);
  verdict('every size: @amirardekanian and AMIRARDEKANI.COM are drawn', 'handle', `${painted.length} cards`);
  verdict('every size: no text runs past the left or right edge', 'edges', `${nTexts} texts`);
  verdict('every size: no text falls off the top or bottom', 'vertical', `${nTexts} texts`);
  verdict('every size: no plate, chip, panel or tile cuts through text it does not hold', 'cut',
    `${painted.reduce((n, s) => n + s.shapes.length, 0)} filled shapes, ${nTexts} texts`);
  t.check('colour rule: the detector flags amber and gold and passes the app\'s palette',
    ['#FFC107', '#D4AF37', '#E0A800', 'rgba(255, 200, 0, 0.5)'].every(goldish)
      && !['#FF8A5B', '#6C5CE7', '#89C540', '#E2A377', '#35D0BA', '#F6F4FF', 'rgba(23, 20, 43, 0.9)'].some(goldish));
  verdict('every size: no gold, yellow, amber or ochre in any fill, stroke, shadow or gradient stop', 'gold',
    `${painted.reduce((n, s) => n + new Set(s.colours.map(c => c.rgba)).size, 0)} colours`);

  // 4. The subject is on its card, on all three sizes.
  const found = (s, w) => w[0] === 'differs'
    ? s.colours.some(c => !shots.find(o => o.id === w[1] && o.size === s.size).colours.some(k => k.rgba === c.rgba))
    : s.texts.some(x => w[0] === 'is' ? x.text === w[1] : w[0] === 'starts' ? x.text.startsWith(w[1]) : x.text.includes(w[1]));
  CASES.forEach(c => {
    const wants = c.show(c.broken ? fb : f), label = `${c.id}: the subject is on the card (${wants.map(say).join(', ')})`;
    const mine = shots.filter(s => s.id === c.id), miss = [];
    mine.forEach(s => s.error ? miss.push(`${s.size}: ${s.error}`) : wants.forEach(w => { if (!found(s, w)) miss.push(`${s.size} lacks ${say(w)}`); }));
    const drawn = (mine.find(s => s.size === 'post') || { texts: [] }).texts.map(x => x.text).filter(x => x.length > 3).join(' / ');
    t.check(label, !miss.length, miss.length ? miss.join('; ') + ' | post drew: ' + drawn : 'post, story and square');
    if (miss.length) full.push(label + '\n    ' + miss.join('\n    ') + '\n    post drew: ' + drawn);
  });
  const emoji = new Map();
  painted.forEach(s => s.texts.forEach(x => (x.text.match(GOLD_EMOJI) || []).forEach(e => emoji.set(e, (emoji.get(e) || new Set()).add(s.id)))));

  // The four kinds of win's emoji are drawn on their cards and none of them is on the gold list (Amir: no yellow, gold, ochre or amber, emoji included).
  const WIN_EMOJI_SET = ['🔁', '📅', '📈', '🛡️'];
  t.check('the four kinds of win\'s emoji (consistency, commitment, progress, resilience) are not on the gold-or-yellow list', WIN_EMOJI_SET.every(e => !new RegExp(GOLD_EMOJI.source, 'u').test(e)), WIN_EMOJI_SET.join(' '));
  const drawnEmoji = new Set();
  painted.filter(s => /^medal-award-/.test(s.id)).forEach(s => s.texts.forEach(x => WIN_EMOJI_SET.forEach(e => { if (x.text.includes(e)) drawnEmoji.add(e); })));
  t.check('the award cards draw all four emoji between them', WIN_EMOJI_SET.every(e => drawnEmoji.has(e)), [...drawnEmoji].join(' '));
  t.check('no award or catalogue title card draws a gold-looking emoji', painted.filter(s => /^(medal-award-|title-cat-)/.test(s.id)).every(s => !s.texts.some(x => (x.text.match(GOLD_EMOJI) || []).length)), '');

  // 5. The routing, in the real UI. A fresh page, and every step is a real click.
  const C = await H.openProof(legacyBrowser(browser), { w: 390, h: 844, tz: TZ, cfg: CFG_SEED, seed: { _hab_log: habitLog(false) } }), p = C.p;
  await p.evaluate(installCapture);
  const tap = sel => p.click(sel, { timeout: 5000 });
  // A picker paints its preview in the background; wait for it, so nothing is half drawn when the next step starts.
  const settle = async () => { await p.waitForFunction(() => !UI.share || !UI.share.busy, null, { timeout: 15000 }); await p.waitForTimeout(150); };
  const look = () => p.evaluate(() => ({ share: UI.share ? { kind: UI.share.kind, subj: UI.share.subj } : null,
    queue: UI.celebrate.map(e => e.kind || 'level'), parked: UI.celebrateLater.length }));
  const forget = () => p.evaluate(() => { window.__cap.texts = []; });                       // what the picker draws next is all that is listed
  const drawnNow = () => p.evaluate(() => window.__cap.texts.map(x => x.text));
  const j = o => JSON.stringify(o);
  // Whatever is open is closed the way a person closes it (the picker's ✕), then the app's Back guard gets a moment
  // to pop its history entry before anything else opens. NAV-01 expects its layers a human's moment apart: closing
  // one layer and opening another in a single tick (as an evaluate would) throws the guard out of step, and the
  // next close walks the page back out of the app to the harness's first page, robots.txt (seen 2026-10-17).
  const clear = async () => {
    if ((await p.$$('.sharex')).length) await tap('.sharex');
    await p.evaluate(() => { UI.celebrate = []; UI.celebrateLater = []; UI.share = null; CFG.wins = []; UI.screen = 'today'; render(); });
    await p.waitForTimeout(150);
  };
  // A step that throws (a button that is not there, a page that left the app) is a FAIL line, not the end of the run.
  const step = async (what, fn) => {
    try { await fn(); } catch (e) { t.check(`${what}: could not be done`, false, String(e && e.message || e).split('\n')[0] + ' @ ' + p.url().replace(/^.*?\/\/[^/]*/, '')); }
  };
  let s, drawn;

  // (i) Two takeovers waiting: a level-up that unlocked EARLY DOORS, and the finished BACKBONE event's UNBOWED.
  await step('takeovers', async () => {
    await p.evaluate(() => {
      UI.screen = 'today'; UI.share = null; UI.celebrate = []; UI.celebrateLater = [];
      UI.celebrate.push({ id: '_overall', overall: true, from: 7, to: 8, rankChanged: false, name: 'OVERALL', big: true, rewards: [PASS_TRACK.find(t => t.id === 't_early')] });
      UI.celebrate.push({ kind: 'reward', id: 't_unbowed', reward: Object.assign({ kind: 'title', event: 'ev_backbone', evName: 'BACKBONE' },
        { id: 't_unbowed', name: 'UNBOWED', note: 'Fell off. Came back. Did it again.' }) });
      render();
    });
    s = await look();
    t.check('takeovers: the level-up is on screen with one more behind it', s.queue.join() === 'level,reward', j(s));
    await tap('.lvshare');
    s = await look();
    t.check('level takeover: Share it opens the Title card of the title it unlocked (EARLY DOORS)',
      !!s.share && s.share.kind === 'title' && !!s.share.subj.title && s.share.subj.title.id === 't_early', j(s.share));
    t.check('level takeover: the takeover behind it is parked, not lost', s.queue.length === 0 && s.parked === 1, j(s));
    await settle();
    await tap('.sharex');
    s = await look();
    t.check('closing the picker puts the parked takeover back, and it is next', s.share === null && s.queue[0] === 'reward' && s.parked === 0, j(s));
    await tap('.lvshare');
    s = await look();
    t.check('title takeover: Share it opens the Title card of UNBOWED', !!s.share && s.share.kind === 'title' && !!s.share.subj.title && s.share.subj.title.id === 't_unbowed', j(s.share));
    await settle();
  });

  // (ii) The wins card: a milestone and yesterday's perfect day. Share it opens the newest win's card, and the
  // picker already holds the newest win of each other card, so one tap on the rail shows the milestone.
  await step('wins card', async () => {
    await clear();
    await p.evaluate(y => { CFG.wins = [{ k: 'milestone', id: 'HS2' }, { k: 'perfect', id: y }]; render(); }, yesterday);
    t.check('wins card: it is on Today with its Share it', (await p.$$('.wins-share')).length === 1);
    await forget();
    await tap('.wins-share');
    s = await look();
    t.check('wins card: Share it opens the Receipt, for yesterday', !!s.share && s.share.kind === 'receipt' && !!s.share.subj.receipt && s.share.subj.receipt.day === yesterday, j(s.share));
    t.check('wins card: the picker holds the milestone (HS2) for the Milestone card', !!s.share && !!s.share.subj.medal && s.share.subj.medal.id === 'HS2', j(s.share && s.share.subj));
    await settle();
    drawn = await drawnNow();
    t.check('wins card: the Receipt it paints is yesterday\'s', drawn.some(x => x.startsWith(f.dateYesterday)), drawn.filter(x => x.length > 3).slice(0, 6).join(' / '));
    await forget();
    await tap('.scard[data-k="sc:medal"]');
    await settle();
    drawn = await drawnNow();
    t.check('wins card: the rail\'s Milestone card then paints the milestone (HUMAN SPRINKLER II)', drawn.some(x => x.includes('HUMAN SPRINKLER II')), drawn.filter(x => x.length > 3).slice(0, 6).join(' / '));
  });

  // (iii) The rail follows the subject: a quest turns the Milestone card into Quest, and the preview paints that quest.
  await step('rail', async () => {
    await clear();
    await forget();
    await p.evaluate(q => openShare('medal', { medal: { k: 'quest', q } }), QUEST);
    const rail = await p.evaluate(() => ({ names: [...document.querySelectorAll('.scard-nm')].map(e => e.textContent.trim()),
      on: ((document.querySelector('.scard.on .scard-nm') || {}).textContent || '').trim() }));
    t.check('rail: the Milestone card reads Quest when it holds a quest, and it is the one open',
      rail.names.includes('Quest') && !rail.names.includes('Milestone') && rail.on === 'Quest', rail.names.join(' · ') + ' (open: ' + rail.on + ')');
    t.check('rail: the Title card is in the rail', rail.names.includes('Title'), rail.names.join(' · '));
    await settle();
    drawn = await drawnNow();
    t.check('picker: its preview paints the quest it was opened with', drawn.some(x => x.includes('THE WELL RUNS DEEP')), drawn.filter(x => x.length > 3).slice(0, 12).join(' / '));
  });

  // (iv) Every other door to a card, one at a time: what is on screen, the card its Share it opens, and what that
  // card was handed. A season with no title has a line on the wins card and no card, so it has no Share it.
  const ROUTES = [
    { what: 'quest takeover', push: { kind: 'quest', id: 'q1', quest: QUEST }, card: 'medal', ok: u => u.k === 'quest' && u.q.title === QUEST.title },
    { what: 'streak takeover (14 days)', push: { kind: 'streak', id: 's14', days: 14, best: false }, card: 'streak', ok: u => u.days === 14 },
    { what: 'level-up that unlocked the Ember skin', push: { id: '_overall', overall: true, from: 5, to: 6, rankChanged: false, name: 'OVERALL', big: true,
      rewards: [{ lv: 6, kind: 'card', id: 'c_ember', name: 'EMBER', note: '' }] }, card: 'rank', ok: u => u.skin === 'c_ember' && u.moment === 'level' },
    { what: 'rank-up takeover', push: { id: '_overall', overall: true, from: 10, to: 11, rankChanged: true, name: 'OVERALL', big: true }, card: 'rank', ok: u => u.moment === 'rank' },
    { what: 'wins card: a consistency tier', win: { k: 'tier', id: 't20', ti: 2, h: ['water', 'steps'] }, card: 'medal', ok: u => u.k === 'tier' && u.ti === 2 && u.h.join() === 'water,steps' },
    { what: 'wins card: a comeback', win: { k: 'comeback', id: 'cb1', gone: 4 }, card: 'medal', ok: u => u.k === 'comeback' && u.gone === 4 },
    { what: 'wins card: the 3-day streak', win: { k: 'streak', id: 's3', days: 3 }, card: 'streak', ok: u => u.days === 3 },
    { what: 'wins card: a habit\'s new rank', win: { k: 'hrank', id: 'water', to: 11 }, card: 'rank', ok: u => u.habit === 'water' },
    { what: 'wins card: a season with no title', win: { k: 'season', id: '2026-07-26' }, card: null },
  ];
  for (const r of ROUTES) await step(r.what, async () => {
    await clear();
    await p.evaluate(([push, win]) => { if (win) CFG.wins = [win]; if (push) UI.celebrate.push(push); render(); }, [r.push || null, r.win || null]);
    if (!r.card) {
      t.check(`${r.what}: its line is on the wins card, with no Share it`, (await p.$$('.wins')).length === 1 && (await p.$$('.wins-share')).length === 0);
      return;
    }
    await tap(r.push ? '.lvshare' : '.wins-share');
    s = await look();
    const u = s.share && s.share.subj[r.card];
    t.check(`${r.what}: Share it opens the ${r.card} card, handed what it is about`, !!s.share && s.share.kind === r.card && !!u && r.ok(u), j(s.share));
    await settle();
  });
  await step('Back guard', async () => {
    if (/\/habits\.html/.test(p.url())) await clear();   // the last picker closes: its guard entry pops, and Back must not go further
    t.check('Back guard: after every one of those layers opened and closed, the page is still the app', /\/habits\.html/.test(p.url()), p.url());
  });
  errs.push(...p.errs);
  await C.ctx.close();

  t.check('no page errors (three pages)', errs.length === 0, errs.join(' | '));
  await browser.close();
  const failed = t.report();
  if (full.length) console.log('\nin full:\n' + full.join('\n'));
  if (emoji.size) console.log('\nnote: emoji are drawn by the emoji font, which the colour rule cannot see. Gold-looking ones drawn: '
    + [...emoji].map(([e, ids]) => `${e} on ${[...ids].join(', ')}`).join('; '));
  console.log('PNGs and draws.json: ' + out);
  process.exit(Math.min(failed, 255));
})().catch(e => { console.error(e); process.exit(1); });
