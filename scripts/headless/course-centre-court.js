// The course app (tennis/app/) in Centre Court, in Farsi (2026-10-13; Amir: "Im ok with your recommendations start", after the
// direction board claude.ai/artifact/92KNKRwtzBvvReRTu3TifC). Every screen of the demo at 390, 375 and 320 px, checked for the
// rules of the look and for the parts the tour and the other tests lean on:
//   · no page errors, nothing running sideways, no visible text under 12 px, every control at least 44 px to hit;
//   · no middle dot "·" next to a Persian digit in what the shell draws (in Vazirmatn it is the Persian zero ۰: «۴ بلوک» read
//     «۴۰ بلوک»), and no emoji (they paint yellow on most phones); no yellow, gold or amber colour anywhere on screen;
//   · a screen with a picture opens on the green cover, one without on the paper header; at most one green button on a screen;
//   · the tour's targets resolve on their screens, and the tour walks all its steps with a ring on each one that has a target;
//   · Start's button says «شروع هفتهٔ ۱» on a first open and «ادامه: هفتهٔ N» once week N was opened (tps.lastweek, this phone only);
//   · step by step (warm-up, a set, the rest, the finish), the Yo-Yo player, the 1RM calculator, the sign-in screen.
// The demo's content is fetched ONCE from Supabase (tps_demo(), public) and served to every page, so this needs the network.
// Three made-up changes let it reach what the demo locks: strength-check and yo-yo-ir1 unlocked (with a line of made-up text),
// and week 1's session C turned into a test day. Nothing from the course is stored in this repo.
// Serve the repo (python -m http.server 8765 --bind 127.0.0.1), then: node scripts/headless/course-centre-court.js [--out <dir>]
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const SB = 'https://bvipfipbdcyqnbczjmaq.supabase.co';
const KEY = 'sb_publishable_BuDVTTC1E0eg3wc7F1Pcig_1A_tqYCy';   // the public key the app itself ships
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
const ROOT = path.join(__dirname, '..', '..');

function unlock(demo) {
  const T = demo.tests.tests;
  const sc = T.find(t => t.id === 'strength-check');
  if (sc) { delete sc.locked; Object.assign(sc, { calc: sc.calc || 'one-rep-max', steps: sc.steps || ['ساختگی: گرم کن.'], record: sc.record || 'ساختگی' }); }
  const yy = T.find(t => t.id === 'yo-yo-ir1');
  if (yy) { delete yy.locked; Object.assign(yy, { player: yy.player || 'yo-yo-ir1', steps: yy.steps || ['ساختگی: پشت خط بایست.'], record: yy.record || 'ساختگی' }); }
  ['adult', 'u16'].forEach(age => {
    const core = demo.programme.weeks[0].plans[age].core, i = core.findIndex(s => s.code === 'C');
    if (i >= 0) core[i] = { id: 'w1-' + age + '-C', code: 'C', kind: 'core', type: 'test', place: 'gym', title: 'ساختگی · روز آزمون', minutes: 60,
      note: 'متن ساختگی برای این آزمایش.', tests: ['broad-jump', 'strength-check', 'yo-yo-ir1'], testTitles: {} };
  });
  return demo;
}

async function newPage(browser, payload, { w = 390, h = 844, prefs = true, toured = true, storage = null } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const init = [];
  if (storage === 'empty') init.push('try{localStorage.clear()}catch(e){}');
  else {
    if (prefs) init.push(`localStorage.setItem('tps.prefs','{"age":"adult"}');`);
    if (toured) init.push(`localStorage.setItem('tps.toured','1');`);
  }
  await ctx.addInitScript(`if (!sessionStorage.getItem('__seeded')) { ${init.join('')} sessionStorage.setItem('__seeded','1'); }`);
  await ctx.route('**/*', r => {
    const u = r.request().url();
    if (u.startsWith(SB + '/rest/v1/rpc/tps_demo')) {
      if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
      return r.fulfill({ status: 200, headers: Object.assign({ 'content-type': 'application/json' }, CORS), body: JSON.stringify(payload) });
    }
    if (u.startsWith(SB + '/rest/v1/rpc/get_exercises_fa')) return r.continue();
    return u.startsWith(H.BASE + '/') ? r.continue() : r.abort();
  });
  const p = await ctx.newPage();
  p.errs = [];
  p.on('pageerror', e => p.errs.push(String(e.message || e)));
  return { ctx, p };
}

async function go(p, hash, first) {
  if (first || !p.url().startsWith(H.BASE)) await p.goto(H.BASE + '/tennis/app/index.html?demo=1' + hash, { waitUntil: 'domcontentloaded' });
  else await p.evaluate(hh => { location.hash = hh; }, hash);
  await p.waitForSelector('#view .banner, #view .section', { timeout: 25000 });
  await p.waitForTimeout(700);
}

// Everything checked on one screen, in the page. scope: the root to audit (#view, #step, #yoyo, the sign-in screen).
const AUDIT = scope => {
  const root = document.querySelector(scope) || document.body;
  const vis = el => { const s = getComputedStyle(el); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return false;
    const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const inView = el => { const b = el.getBoundingClientRect(); return b.bottom > 0 && b.top < innerHeight * 6; };
  const label = el => (el.className && el.className.baseVal === undefined ? String(el.className) : el.tagName).slice(0, 40) + ' «' + (el.textContent || '').trim().slice(0, 24) + '»';
  const over = document.documentElement.scrollWidth - innerWidth;
  const all = [...root.querySelectorAll('*'), ...document.querySelectorAll('#tabs *')];
  const small = [];
  all.forEach(el => {
    if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
    if (!vis(el)) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs > 0 && fs < 11.95) small.push(label(el) + ' ' + fs + 'px');   // 0: a glyph kept for the code and drawn by CSS (the ▶, the ‹)
  });
  // The shell's own text (heads, titles, rows, labels, bars), not a lesson's paragraphs, which are content.
  const CHROME = '.banner, .sec, .h2, .list-row, .ex-main, .door, .band, .stats, .step-top, .step-slot, .step-name, .set-label, .rest, .acc-head, .weeks, .wrow, .label, .demo-bar, .tourcard, .yy-body, .si-hero, .si-sheet, .tabs, .meta, .kicker';
  const chrome = [...root.querySelectorAll(CHROME), ...document.querySelectorAll('#tabs, .demo-bar')].filter(vis);
  const text = chrome.map(e => e.innerText).join('\n');
  const dots = text.match(/[۰-۹][^\S\n]*·|·[^\S\n]*[۰-۹]/g) || [];
  const emoji = [...new Set((text.match(/\p{Extended_Pictographic}/gu) || []).filter(c => !'✓✕'.includes(c)))];
  const TAP = 'a[href], button, input, .wchk';
  const tiny = [...root.querySelectorAll(TAP), ...document.querySelectorAll('#tabs a')].filter(vis).filter(inView).filter(el => {
    if (el.closest('.prose p, .prose li, p, .tourcard p')) return false;    // a link inside a sentence
    if (el.closest('.video') && !el.matches('.play')) return false;
    const b = el.getBoundingClientRect();
    const round = el.matches('.back, .gear, .bhelp, .x, .yy-x, .play');
    return b.height < 43.5 || (round && b.width < 43.5);
  }).map(el => label(el) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
  const greens = [...root.querySelectorAll('.btn.primary, .btn.clay')].filter(vis).length;
  const head = root.querySelector('.banner');
  const isYellow = c => { const m = String(c).match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/); if (!m || (m[4] !== undefined && +m[4] < .12)) return false;
    const r = m[1] / 255, g = m[2] / 255, b = m[3] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
    if (d < .15) return false; const s = d / (1 - Math.abs(2 * l - 1));
    let hh = mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4); if (hh < 0) hh += 360;
    return hh >= 36 && hh <= 68 && s > .35 && l > .2 && l < .9; };
  const yellow = [];
  [root, ...all].filter(vis).forEach(el => { const s = getComputedStyle(el);
    ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor'].forEach(k => { if (isYellow(s[k])) yellow.push(label(el) + ' ' + k); }); });
  return { over, small: small.slice(0, 6), dots, emoji, tiny: tiny.slice(0, 6), greens, head: head ? (head.classList.contains('is-cover') ? 'cover' : head.classList.contains('is-paper') ? 'paper' : 'other') : 'none',
    yellow: [...new Set(yellow)].slice(0, 6) };
};

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const shot = (p, name, full) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: !!full });

  // 0. The sheet itself: no gold, no capitals, no letter-spacing, no size under 12 px.
  const css = fs.readFileSync(path.join(ROOT, 'tennis/app/app.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tooSmall = [...css.matchAll(/font(?:-size)?:[^;{}]*?(\d+(?:\.\d+)?)px/g)].map(m => +m[1]).filter(n => n < 12);
  t.check('app.css: no gold or ochre (#A8741C, #F3D9A6, --ochre as a colour)', !/#A8741C|#F3D9A6/i.test(css));
  t.check('app.css: no text-transform: uppercase and no letter-spacing', !/text-transform:\s*uppercase|letter-spacing:\s*(?!0[;\s}]|normal)/i.test(css));
  t.check('app.css: no font size under 12 px', tooSmall.length === 0, tooSmall.join(', '));

  let payload;
  try {
    const res = await fetch(SB + '/rest/v1/rpc/tps_demo', { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' }, body: '{}' });
    payload = unlock(await res.json());
  } catch (e) { console.log('SKIP: tps_demo() could not be fetched (this test needs the network): ' + e.message); process.exit(1); }

  const browser = await H.launch();
  // [name, hash, head, tour selectors that must resolve, extra step]
  const SCREENS = [
    ['start', '#/start', 'cover', ['#tabs', '[data-tour="version"]', '#safety', '.bhelp']],
    ['setup', '#/setup', 'paper', []],
    ['guide', '#/guide', 'paper', []],
    ['programme', '#/programme', 'paper', ['.block-card .weeks']],
    ['week', '#/programme/week/1', 'cover', ['.session-card']],
    ['session', '#/programme/week/1/A', 'cover', ['.ex:not(.warm)', '.cta-bar .btn.primary']],
    ['session-open', '#/programme/week/1/A', 'cover', [], async p => {
      await p.evaluate(() => { const rows = [...document.querySelectorAll('.ex:not(.warm) .ex-main')]; const b = rows[3] || rows[0]; b.click(); b.scrollIntoView({ block: 'start' }); });
      await p.waitForTimeout(300); }],
    ['session-warm', '#/programme/week/1/A', 'cover', [], async p => {
      await p.evaluate(() => { const b = document.querySelector('.ex.warm .ex-main'); b.click(); b.scrollIntoView({ block: 'start' });
        const c = document.querySelector('.ex.warm .wchk'); if (c) c.click(); });
      await p.waitForTimeout(300); }],
    ['addon', '#/programme/week/1/COND', 'cover', []],
    ['testday', '#/programme/week/1/C', 'cover', []],
    ['locked-week', '#/programme/week/2', 'cover', []],
    ['exercises', '#/exercises', 'paper', ['.search']],
    ['exercise', '#/exercises/trap-bar-deadlift', 'paper', []],
    ['learn', '#/learn', 'paper', ['.section .list-row']],
    ['lesson', '#/learn/tennis-demands', 'cover', []],
    ['lesson-locked', '#/learn/growth', 'cover', []],
    ['tests', '#/tests', 'cover', ['.section .list-row', '.bhelp']],
    ['test', '#/tests/broad-jump', 'cover', []],
    ['test-1rm', '#/tests/strength-check', 'cover', [], async p => {
      await p.evaluate(() => { const f = [...document.querySelectorAll('.orm-field input')]; const v = ['100', '5', '8'];
        f.slice(0, 3).forEach((el, i) => { el.value = v[i]; el.dispatchEvent(new Event('input', { bubbles: true })); });
        const o = document.querySelector('.card.orm, .orm-out'); if (o) o.scrollIntoView({ block: 'center' }); });
      await p.waitForTimeout(300); }],
    ['test-yoyo', '#/tests/yo-yo-ir1', 'cover', []],
  ];

  for (const [w, h] of [[390, 844], [375, 812], [320, 640]]) {
    const { ctx, p } = await newPage(browser, payload, { w, h });
    let first = true;
    for (const [name, hash, head, sels, extra] of SCREENS) {
      await go(p, hash, first); first = false;
      if (extra) await extra(p);
      const a = await p.evaluate(AUDIT, '#view');
      const tag = `${w} ${name}`;
      t.check(`${tag}: nothing runs sideways`, a.over <= 0, a.over);
      t.check(`${tag}: no text under 12 px`, a.small.length === 0, a.small.join(' | '));
      t.check(`${tag}: no "·" next to a Persian digit, no emoji in what the shell draws`, !a.dots.length && !a.emoji.length, JSON.stringify([a.dots, a.emoji]));
      t.check(`${tag}: every control 44 px to hit`, a.tiny.length === 0, a.tiny.join(' | '));
      t.check(`${tag}: no yellow, gold or amber on screen`, a.yellow.length === 0, a.yellow.join(' | '));
      t.check(`${tag}: opens on the ${head === 'cover' ? 'green cover' : 'paper header'}`, a.head === head, a.head);
      t.check(`${tag}: at most one green button`, a.greens <= 1, a.greens);
      for (const s of sels) t.check(`${tag}: the tour's target ${s} is there`, await p.evaluate(q => !!document.querySelector(q), s));
      if (w === 390 || name === 'start' || name === 'session') await shot(p, `${w}-${name}`, w === 390);
    }
    // The Yo-Yo player (full screen) on the unlocked test.
    await go(p, '#/tests/yo-yo-ir1', false);
    await p.evaluate(() => { const b = document.querySelector('[data-yy="open"]'); if (b) b.click(); });
    await p.waitForTimeout(400);
    const yy = await p.evaluate(AUDIT, '#yoyo');
    t.check(`${w} yo-yo player: open, no small text, no "·"/emoji, controls 44 px, nothing sideways`,
      await p.evaluate(() => { const y = document.getElementById('yoyo'); return !!y && !y.hidden; }) && !yy.small.length && !yy.dots.length && !yy.emoji.length && !yy.tiny.length && yy.over <= 0,
      JSON.stringify(yy));
    t.check(`${w} yo-yo player: its primary button is not green on green`, await p.evaluate(() => {
      const b = [...document.querySelectorAll('#yoyo .btn.primary')].find(x => x.offsetParent); if (!b) return true;
      return getComputedStyle(b).backgroundColor !== getComputedStyle(document.getElementById('yoyo')).backgroundColor || getComputedStyle(b).backgroundImage !== 'none'; }));
    if (w === 390) await shot(p, `${w}-yoyo`);
    await p.evaluate(() => { const b = document.querySelector('[data-yy="close"]'); if (b) b.click(); });

    // Step by step: the warm-up, a set, a rest, the finish.
    await go(p, '#/programme/week/1/A', false);
    await p.evaluate(() => document.querySelector('[data-step-open]').click());
    await p.waitForTimeout(400);
    const stepCheck = async (label, sels) => {
      const a = await p.evaluate(AUDIT, '#step');
      t.check(`${w} step, ${label}: no small text, no "·"/emoji, controls 44 px, nothing sideways`,
        !a.small.length && !a.dots.length && !a.emoji.length && !a.tiny.length && a.over <= 0 && !a.yellow.length, JSON.stringify(a));
      for (const s of sels) t.check(`${w} step, ${label}: ${s} is there`, await p.evaluate(q => { const e = document.querySelector(q); return !!e && !!e.offsetParent; }, s));
      if (w === 390 || w === 320) await shot(p, `${w}-step-${label}`);
    };
    await stepCheck('warm-up', ['.step-body .rest', '.step-top', '.step-foot .btn.primary']);
    await p.evaluate(() => document.querySelector('.step-foot [data-step="done"]').click());   // warm-up done: the first exercise
    await p.waitForTimeout(300);
    await stepCheck('a set', ['.step-top', '.step-foot .btn.primary']);
    await p.evaluate(() => document.querySelector('.step-foot [data-step="done"]').click());   // a set with a rest: the rest screen
    await p.waitForTimeout(300);
    if (await p.evaluate(() => !!document.querySelector('.ring .time') && !document.querySelector('.step-body .wlist'))) await stepCheck('rest', ['[data-step="skip"]']);
    for (let i = 0; i < 80 && await p.evaluate(() => !document.querySelector('.done-cover')); i++) {
      await p.evaluate(() => { const s = document.querySelector('[data-step="skip"]'); if (s) s.click(); else { const n = document.querySelector('[data-step="next"]'); if (n) n.click(); } });
    }
    await p.waitForTimeout(400);
    await stepCheck('the finish', ['.done-cover', '.step-foot .btn.primary']);
    await p.evaluate(() => document.querySelector('[data-step="close"]').click());
    t.check(`${w}: no page errors on any screen`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // Start's button: «شروع هفتهٔ ۱» on a first open, «ادامه: هفتهٔ ۱» once week 1 was opened; tps.lastweek holds the week.
  {
    const { ctx, p } = await newPage(browser, payload, {});
    await go(p, '#/start', true);
    const before = await p.evaluate(() => (document.querySelector('#view .banner .btn.primary') || {}).textContent || '');
    await go(p, '#/programme/week/1', false);
    await go(p, '#/start', false);
    const after = await p.evaluate(() => [(document.querySelector('#view .banner .btn.primary') || {}).textContent || '',
      (document.querySelector('#view .banner .btn.primary') || {}).getAttribute && document.querySelector('#view .banner .btn.primary').getAttribute('href'), localStorage.getItem('tps.lastweek')]);
    t.check('Start: the button says «شروع هفتهٔ ۱» before any week was opened', /شروع هفتهٔ ۱/.test(before), before);
    t.check('Start: after week 1, it says «ادامه: هفتهٔ ۱», links to week 1, and tps.lastweek is {"week":1}',
      /ادامه: هفتهٔ ۱/.test(after[0]) && after[1] === '#/programme/week/1' && after[2] === '{"week":1}', JSON.stringify(after));
    await go(p, '#/programme/week/2', false);   // a locked week is never remembered
    t.check('Start: a locked week is not remembered', await p.evaluate(() => localStorage.getItem('tps.lastweek')) === '{"week":1}');
    await ctx.close();
  }

  // The first open: no version yet, the picker card carries the tour's target.
  {
    const { ctx, p } = await newPage(browser, payload, { prefs: false });
    await go(p, '#/start', true);
    t.check('first open: the version picker is the [data-tour="version"] card, with its two choices',
      await p.evaluate(() => !!document.querySelector('[data-tour="version"] .seg') && document.querySelectorAll('[data-tour="version"] .seg button').length === 2));
    await shot(p, '390-start-first-open');
    await ctx.close();
  }

  // The tour: every step, a ring on each step that has a target, the card's text 12 px or more.
  {
    const { ctx, p } = await newPage(browser, payload, { toured: false });
    await go(p, '#/start', true);
    await p.waitForSelector('.tourcard', { timeout: 15000 });
    let steps = 0, rings = [], bad = [];
    for (let i = 0; i < 25; i++) {
      await p.waitForTimeout(700);
      const st = await p.evaluate(() => { const r = document.querySelector('.tourring'), c = document.querySelector('.tourcard');
        if (!c) return null; const rb = r && r.getBoundingClientRect();
        const small = [...c.querySelectorAll('*')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(e).fontSize) < 11.95).length;
        return { title: c.querySelector('h4').textContent, ring: !!(rb && rb.width > 8 && rb.height > 8 && getComputedStyle(r).display !== 'none'), small, n: c.querySelector('.tourn').textContent }; });
      if (!st) break;
      steps++; rings.push(st.ring); if (st.small) bad.push(st.title);
      if (steps === 1 || steps === 8) await shot(p, `390-tour-${steps}`);
      const more = await p.evaluate(() => { const b = document.querySelector('.tourcard [data-t="next"]'); if (!b) return false; b.click(); return true; });
      if (!more) break;
    }
    t.check('tour: it walks all its steps (15 in the demo)', steps === 15, steps);
    t.check('tour: every step after the first two rings a real control', rings.slice(1).filter(Boolean).length >= 13, JSON.stringify(rings));
    t.check('tour: no text under 12 px on its card', bad.length === 0, bad.join(' | '));
    t.check('tour: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // The sign-in screen (nobody signed in): green button, a Farsi eyebrow, the type rules.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
    await ctx.route('**/*', r => r.request().url().startsWith(H.BASE + '/') ? r.continue() : r.abort());
    const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(String(e.message || e)));
    await p.goto(H.BASE + '/tennis/app/index.html', { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.signin-screen.visible', { timeout: 15000 });
    await p.waitForTimeout(600);
    const a = await p.evaluate(AUDIT, '.signin-screen');
    t.check('sign in: no small text, no "·"/emoji, controls 44 px, no yellow, nothing sideways',
      !a.small.length && !a.dots.length && !a.emoji.length && !a.tiny.length && !a.yellow.length && a.over <= 0, JSON.stringify(a));
    t.check('sign in: the button is green, not clay', await p.evaluate(() => { const s = getComputedStyle(document.querySelector('.signin-go'));
      return /gradient/.test(s.backgroundImage) || !/rgb\(199, 85, 47\)/.test(s.backgroundColor); }));
    t.check('sign in: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await shot(p, '390-signin');
    await ctx.close();
  }

  await browser.close();
  console.log('screenshots: ' + shots);
  process.exit(t.report() ? 1 : 0);
})();
