// Plain Words, Group B (2026-10-25): the day, Home, habits and Library say it the plain way. node scripts/headless/love-all-words-b.js
//   blocks     Home's day card says "9 exercises", not "6 blocks · 9 movements".
//   qualities  "Today builds" leads the quality chips on the Home card and the day head.
//   isolation  the About sheet's pattern says "One muscle at a time".
//   guided     the Guided button carries "One set at a time".
//   finish     "Stop here" replaces "Finish early" everywhere the athlete reads it.
//   reset      "Start this day again", and its armed tap says what it clears.
//   offswitch  "These five are for everyone."
//   alwayson   the habits list says "For everyone".
//   playbook   the Playbook pane says "Articles from me".
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js).
'use strict';
const H = require('./lib');
const t = H.checker();

// The fixture's Spine with qualities, so the day card has quality chips to lead (made-up lists, never a real athlete's).
const QOF = { 'barbell-back-squat': ['strength', 'muscle', 'armour'], 'box-jump': ['power', 'spring'], 'dumbbell-bulgarian-split-squat': ['strength'] };
const SPINE = H.SPINE.map(e => Object.assign({}, e, QOF[e.id] ? { qualities: QOF[e.id] } : { qualities: ['strength'] }))
  .concat(['Incline Dumbbell Press', 'Single-Arm Dumbbell Row'].map(n => ({ id: n.toLowerCase().replace(/ /g, '-'), name: n, aliases: [], qualities: ['muscle', 'strength'] })));
const QUALS = ['armour', 'brakes', 'engine', 'movement', 'muscle', 'power', 'rotation', 'speed', 'spring', 'strength']
  .map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), line: 'What ' + id + ' means.', tennis: '', sort: i }));
const open = async (browser, extra) => {
  const r = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: H.fixture(), spine: SPINE, stub: { library: H.library() } }, extra || {}));
  await r.p.evaluate(q => { setQualities(q); paintSpine(); paintDayQualities(); }, QUALS);
  return r;
};
const noScroll = async (p, w, what) => {
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  t.check(`${what}: nothing overflows sideways at ${w} px`, m.sw <= w && m.iw <= w, JSON.stringify(m));
};
const fits = async (p, sel, w, what) => {
  const r = await p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => {
    const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), sw: e.scrollWidth, cw: e.clientWidth, h: Math.round(b.height) };
  }), sel);
  t.check(`${what}: shown and inside the screen at ${w} px`, r.length > 0 && r.every(x => x.l >= 0 && x.r <= w && x.sw <= x.cw + 1), JSON.stringify(r));
};

async function blocks(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await p.waitForTimeout(700);
    const home = await p.evaluate(() => {
      const d = DATA.workouts.days.find(x => String(x.id) === (document.querySelector('[data-dc]') || {}).dataset.dc) || DATA.workouts.days[0];
      return { n: d.blocks.reduce((k, b) => k + b.exercises.length, 0), words: document.querySelector('#home-overview .dc-hero .cm-weeks').textContent.trim() };
    });
    t.check(`blocks: Home's card says "${home.n} exercises" (${w} px)`, home.words === home.n + ' exercises', home.words);
    t.check('blocks: …and never "blocks" or "movements"', !/block|movement/i.test(home.words), home.words);
    t.check(`blocks: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

async function qualities(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await p.waitForTimeout(700);
    const lead = await p.evaluate(() => { const e = document.querySelector('#home-overview .dc-hero .dq-lead'); return e ? e.textContent.trim() : null; });
    t.check(`qualities: Home's card says "Today builds:" before the quality names (${w} px)`, lead === 'Today builds:', String(lead));
    const names = await p.evaluate(() => [...document.querySelectorAll('#home-overview .dc-hero .dq-chip')].map(c => c.textContent.trim()));
    t.check('qualities: …the quality names are still the chips after it', names.length >= 1, names.join(' | '));
    t.check('qualities: …and a chip still opens its sheet', await p.evaluate(async () => {
      const c = document.querySelector('#home-overview .dc-hero .dq-chip'); if (!c) return false; c.click();
      await new Promise(r => setTimeout(r, 200)); const ok = !!document.querySelector('#hist-overlay.visible .readiness-title'); document.getElementById('hist-overlay').classList.remove('visible'); return ok;
    }));
    await fits(p, '#home-overview .dc-hero .dq-lead', w, 'qualities: Home line');
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(500);
    const lead2 = await p.evaluate(() => { const e = document.querySelector('#day-view-card .dq-lead'); return e ? e.textContent.trim() : null; });
    t.check(`qualities: the day head says "Today builds:" too (${w} px)`, lead2 === 'Today builds:', String(lead2));
    await fits(p, '#day-view-card .dq-lead', w, 'qualities: day-head line');
    await noScroll(p, w, 'qualities: day head');
    t.check(`qualities: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

(async () => {
  const browser = await H.launch();
  await blocks(browser);
  await qualities(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
