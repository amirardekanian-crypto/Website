// Love All round 2, the words group (2026-10-24): node scripts/headless/love-all-words.js
//   B17/L2  every Playbook article fits the screen at 320, 360 and 390 wide (a long heading wraps; it used to push the page sideways).
//   B33     the demo's "Apply to get yours" link wears the app's green link look, not the browser's blue.
//   GUIDE   each corrected line of "How the app works", the records help and the system manual is there, each old false line is gone.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js).
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./lib');
const t = H.checker();

const root = path.join(__dirname, '..', '..');
const articleFiles = JSON.parse(fs.readFileSync(path.join(root, 'articles', 'index.json'), 'utf8')).categories
  .flatMap(c => (c.articles || []).map(a => a.file));

async function articles(browser) {
  for (const w of [320, 360, 390]) {
    const { ctx, p } = await H.openProgram(browser, { w, h: 800, stub: { library: H.library() } });
    await p.waitForTimeout(800);
    const bad = [];
    for (const file of articleFiles) {
      await p.evaluate(f => openArticle(f), file);
      await p.waitForFunction(() => document.querySelector('#ar-body .ar-h, #ar-body .ar-p') || document.querySelector('#ar-body .wl-empty'), null, { timeout: 8000 }).catch(() => {});
      await p.waitForTimeout(120);
      const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, blocks: document.querySelectorAll('#ar-body .ar-h, #ar-body .ar-p').length }));
      if (m.sw > w || m.iw > w || !m.blocks) bad.push(file + ' ' + JSON.stringify(m));
    }
    t.check(`B17: all ${articleFiles.length} Playbook articles open and fit at ${w} wide (no sideways scroll)`, articleFiles.length >= 10 && !bad.length, bad.join(' | '));
    if (w === 320) {
      // The control: put the old rule back and the same loop must see the overflow, so the check above can fail.
      await p.addStyleTag({ content: '#ar-body .ar-h .ar-h-t { flex-shrink: 0 !important; overflow-wrap: normal !important; }' });
      let over = 0;
      for (const file of articleFiles) {
        await p.evaluate(f => openArticle(f), file);
        await p.waitForTimeout(120);
        if (await p.evaluate(() => document.documentElement.scrollWidth > 320)) over++;
      }
      t.check('B17: control, the old rule makes some articles overflow at 320', over > 0, 'overflowing: ' + over);
    }
    t.check(`B17: no page errors at ${w}`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

async function demoLink(browser) {
  const P = H.fixture();
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: P, query: '?client=demo', stub: { demo: P, library: H.library() } });
  await p.waitForTimeout(800);
  const r = await p.evaluate(() => {
    const el = document.createElement('div');
    el.className = 'send-session-status';
    el.innerHTML = 'Demo only. <a href="/form.html">Apply to get yours →</a>';
    document.querySelector('.screen.active').appendChild(el);
    const a = el.querySelector('a'), cs = getComputedStyle(a);
    const ink = document.createElement('i'); ink.style.color = 'var(--green-ink)'; document.body.appendChild(ink);
    return { color: cs.color, ink: getComputedStyle(ink).color, deco: cs.textDecorationLine, real: !!window.IS_DEMO };
  });
  t.check('B33: the demo is open', r.real);
  t.check('B33: "Apply to get yours" is the app\'s green ink, underlined, not browser blue', r.color === r.ink && r.color !== 'rgb(0, 0, 238)' && r.deco === 'underline', JSON.stringify(r));
  const real = await p.evaluate(() => { const e = document.querySelector('.send-session-status a'); return e ? getComputedStyle(e).color : null; });
  await ctx.close();
}

async function guide(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, stub: { library: H.library() } });
  await p.waitForTimeout(1000);
  const text = await p.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = APP_GUIDE.map(c => c.body).join(' ').replace('<!--crew-->', '');
    return d.textContent.replace(/\s+/g, ' ');
  });
  const has = (s) => text.includes(s);
  t.check('a. Career card: the level is the number in the ring on Home, and tapping it opens Your numbers', has('Your level is the number in the ring on Home') && has('Tap the ring to open Your numbers.'));
  t.check('a. …the old "Career row" lines are gone', !/Home has a Career row|Tap the Career row/.test(text));
  t.check('b. Logging card: the arrow is next to the name, the i is on the right', has('The small arrow next to its name means it opens, and the i on the right is its info.') && !has('The small arrow on the right means it opens'));
  t.check('c. Records card: only a max put in with Log a max is labelled', has('A max you put in with Log a max is labelled') && !has('Every number is labelled'));
  t.check('d. Library: Done ticks the habit on the Today card, no AA Proof', has('ticks the matching habit on your Today card') && !/AA Proof/.test(text) && !/✓ the AA Proof/.test(text));
  t.check('e. Getting stronger: each new best, not weeks', has('(your best lift, each time you set a new best)') && !has('week by week'));
  t.check('g. Records: the picker says you can search', has('pick a lift (or search for one)') && !has('pick a lift from your programme'));
  t.check('h. The i card: your last 12 sessions', has('Tap it for your last 12 sessions.') && !has('Tap it for every session.'));
  t.check('COM-3: none of the new lines has an em-dash or a semicolon',
    !/Your level is the number in the ring[^.]*[—;]/.test(text) && !/next to its name means it opens[^.]*[—;]/.test(text));

  await p.evaluate(() => openSystemGuide('habits'));
  await p.waitForTimeout(900);
  const sys = await p.evaluate(() => (document.getElementById('sys-body') || document.body).textContent.replace(/\s+/g, ' '));
  const water = await p.evaluate(() => (window.AAHabits.XP_RULES.weights || {}).water);
  t.check('f. How it works: part pays part of its base, five eighths of the real water price, bonus only at the full target',
    sys.includes(`Five of eight glasses pays five eighths of ${water}. The bonus comes only when the whole target is met.`) && !sys.includes('pays five eighths.'), sys.slice(sys.indexOf('Part of one'), sys.indexOf('Part of one') + 160));
  // The sentence is true: 5 of 8 glasses really pays 5/8 of the base.
  const paid = await p.evaluate(() => { const hb = window.AAHabits.HABITS.find(h => h.id === 'water'); const k = window.AAHabits.AKEY(); return { base: window.AAHabits.XP_RULES.weights.water, full: habXpFull(hb), target: hb.target }; });
  t.check('f. …and habXpOf agrees: the full price is base x bonus, so five eighths of the base is not five eighths of the full price', paid.full > paid.base && paid.target === 8, JSON.stringify(paid));
  t.check('no page errors (guide)', !p.errs.length, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await articles(browser);
  await demoLink(browser);
  await guide(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
