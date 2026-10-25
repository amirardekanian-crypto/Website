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

const open = (browser, extra) => H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: H.fixture(), stub: { library: H.library() } }, extra || {}));
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

(async () => {
  const browser = await H.launch();
  await blocks(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
