// Love All round 2, the paint group (2026-10-24): node scripts/headless/love-all-paint.js
//   AVATAR  no ochre tan (#C57D52, #E3966C) behind Amir's initials or anywhere else the app draws; white on clay clears 3:1.
//   EARLY   the theme is on before the first paint: the loading screen itself draws dark on a dark phone, or with a stored 1; a stored 0 stays light.
//   DOOR    "How the app works" is the first row on the Coach tab, above Amir's notes, and still opens the help sheet.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js).
'use strict';
const fs = require('fs');
const path = require('path');
const H = require('./lib');
const t = H.checker();

const ROOT = path.join(__dirname, '..', '..');
const lum = ([r, g, b]) => { const f = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

async function avatar(browser) {
  // Source: neither tan is in the page or in anything it loads from assets/.
  const files = [path.join(ROOT, 'program.html')];
  for (const d of ['assets/css', 'assets/js']) for (const f of fs.readdirSync(path.join(ROOT, d))) if (/\.(css|js)$/.test(f)) files.push(path.join(ROOT, d, f));
  const hits = files.filter(f => /c57d52|e3966c/i.test(fs.readFileSync(f, 'utf8'))).map(f => path.basename(f));
  t.check('AVATAR: #C57D52 and #E3966C are in neither program.html nor its shared CSS/JS', hits.length === 0, hits.join());
  t.check('AVATAR: white initials on clay #C7552F are over 3:1 (large text)', ratio([255, 255, 255], [199, 85, 47]) >= 3, ratio([255, 255, 255], [199, 85, 47]).toFixed(2));
  // Rendered: the photo fails (removed), and what is left behind the initials is not a tan, light or dark.
  for (const dark of [false, true]) {
    const { ctx, p } = await H.openProgram(browser, { dark });
    const o = await p.evaluate(() => {
      document.querySelectorAll('.wn-av img, .note-av img').forEach(i => i.remove());
      const host = document.createElement('div');
      host.innerHTML = '<span class="wn-av"><i>AA</i></span>'; document.querySelector('.screen.active').appendChild(host);
      const els = [...document.querySelectorAll('.wn-av, .note-av, .global-account, .cr-ini')];
      return els.map(e => getComputedStyle(e).backgroundColor);
    });
    const tan = o.filter(c => { const m = c.match(/\d+/g); if (!m) return false; const [r, g, b] = m.map(Number); return r > 180 && g > 100 && g < 170 && b < 120 && r - b > 80 && g > b + 30; });
    t.check(`AVATAR: ${dark ? 'dark' : 'light'}: the fallback behind the initials is not a tan (${o.length} avatar surfaces read)`, o.length > 0 && tan.length === 0, JSON.stringify(o));
    await ctx.close();
  }
}

// What the page looked like the moment the loading screen first existed: the theme, the loader's own colour, the page's.
const RECORD = `(() => {
  const rec = () => { const l = document.getElementById('loading'); if (!l || window.__early) return;
    window.__early = { dark: document.body.hasAttribute('data-dark'), loader: getComputedStyle(l).backgroundColor, body: getComputedStyle(document.body).backgroundColor, scheme: document.documentElement.style.colorScheme }; };
  new MutationObserver(rec).observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', rec);
})();`;
async function early(browser) {
  const DARK = 'rgb(24, 24, 24)', LIGHT = 'rgb(250, 247, 242)';
  const cases = [
    ['dark phone, no pick', 'dark', null, true],
    ['light phone, stored 1', 'light', '1', true],
    ['dark phone, stored 0', 'dark', '0', false],
    ['light phone, no pick', 'light', null, false],
  ];
  for (const [name, scheme, pick, want] of cases) {
    const { ctx, p } = await H.openProgram(browser, { scheme });
    await p.evaluate(v => { v === null ? localStorage.removeItem('dark_mode') : localStorage.setItem('dark_mode', v); }, pick);
    await p.addInitScript({ content: RECORD });
    await p.reload({ waitUntil: 'domcontentloaded' });
    const e = await p.evaluate(() => window.__early);
    t.check(`EARLY: ${name}: when the loading screen first exists the app is already ${want ? 'dark' : 'light'}`, !!e && e.dark === want, JSON.stringify(e));
    t.check(`EARLY: ${name}: the loading screen draws ${want ? 'dark' : 'light'}, not the other`, !!e && e.loader === (want ? DARK : LIGHT), JSON.stringify(e));
    t.check(`EARLY: ${name}: color-scheme is ${want ? 'dark' : 'unset'} on the page`, !!e && e.scheme === (want ? 'dark' : ''), JSON.stringify(e));
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(200);
    t.check(`EARLY: ${name}: after boot it is still ${want ? 'dark' : 'light'}`, (await p.evaluate(() => document.body.hasAttribute('data-dark'))) === want);
    t.check(`EARLY: ${name}: no page errors`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // Picking Light in the account sheet after a dark start clears the dark colour-scheme too.
  const { ctx, p } = await H.openProgram(browser, { scheme: 'dark' });
  await p.click('#global-account');
  await p.waitForSelector('#hist-overlay .acct-seg button');
  await p.click('#hist-overlay .acct-seg button[data-theme="light"]');
  await p.waitForTimeout(150);
  t.check('EARLY: picking Light on a dark phone turns the app and its colour-scheme light', await p.evaluate(() => !document.body.hasAttribute('data-dark') && document.documentElement.style.colorScheme === ''));
  await ctx.close();
}

async function door(browser) {
  const P = H.fixture(); P.notes = { greeting: 'For You', cards: [1, 2, 3].map(i => ({ icon: '🛌', title: 'Note ' + i, body: '<p>Body ' + i + '</p>' })) };
  const { ctx, p } = await H.openProgram(browser, { prog: P });
  await p.evaluate(() => { window.scrollTo(0, 0); goTo('notes'); }); await p.waitForTimeout(500);
  const o = await p.evaluate(() => {
    const s = document.getElementById('screen-notes'), d = s.querySelector('.hrow'), sec = s.querySelector('.prog-sec');
    return { label: d.querySelector('.hrow-l').textContent.trim(), above: !!(d.compareDocumentPosition(sec) & Node.DOCUMENT_POSITION_FOLLOWING), top: Math.round(d.getBoundingClientRect().top), secTop: Math.round(sec.getBoundingClientRect().top),
      rowsBelow: [...s.querySelectorAll('.cn-row')].every(r => d.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING), n: s.querySelectorAll('.hrow').length };
  });
  t.check('DOOR: "How the app works" is above "Notes from Amir" and every note, and there is still only one', o.label === 'How the app works' && o.above && o.rowsBelow && o.n === 1 && o.top < o.secTop, JSON.stringify(o));
  await p.click('#screen-notes .hrow');
  await p.waitForTimeout(300);
  t.check('DOOR: a tap on it opens the help sheet', await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && /How the app works/.test(document.getElementById('hist-overlay').textContent)));
  t.check('DOOR: no page errors', !p.errs.length, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await avatar(browser);
  await early(browser);
  await door(browser);
  await browser.close();
  const failed = t.report();
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
