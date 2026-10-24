// Love All round 2, the theme group (2026-10-24): node scripts/headless/love-all-theme.js
//   B32   until the athlete picks Light or Dark the app follows the phone's dark mode (at boot and live); a pick is kept and wins.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js).
'use strict';
const H = require('./lib');
const t = H.checker();

const isDark = p => p.evaluate(() => document.body.hasAttribute('data-dark'));
const pressed = p => p.evaluate(() => [...document.querySelectorAll('#hist-overlay .acct-seg button')].map(b => b.dataset.theme + ':' + b.getAttribute('aria-pressed')).join());
const bg = p => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

async function theme(browser) {
  for (const scheme of ['dark', 'light']) {
    const want = scheme === 'dark';
    // No pick: the phone decides.
    const { ctx, p } = await H.openProgram(browser, { scheme });
    t.check(`B32: phone ${scheme}, no pick: the app is ${want ? 'dark' : 'light'}`, (await isDark(p)) === want);
    // The phone flips while the app is open: the app follows.
    await p.emulateMedia({ colorScheme: want ? 'light' : 'dark' });
    await p.waitForTimeout(200);
    t.check(`B32: the phone flips to ${want ? 'light' : 'dark'} while open: the app follows`, (await isDark(p)) === !want);
    await p.emulateMedia({ colorScheme: scheme });
    await p.waitForTimeout(200);
    t.check('B32: …and flips back', (await isDark(p)) === want);
    t.check('B32: following the phone stores no pick', await p.evaluate(() => localStorage.getItem('dark_mode') === null));
    // The switch tells the truth while following.
    await p.click('#global-account');
    await p.waitForSelector('#hist-overlay .acct-seg button');
    t.check(`B32: the account sheet's Theme shows ${scheme} while following`, (await pressed(p)) === `light:${!want},dark:${want}`, await pressed(p));
    // A pick wins: pick the opposite of the phone.
    await p.click(`#hist-overlay .acct-seg button[data-theme="${want ? 'light' : 'dark'}"]`);
    await p.waitForTimeout(150);
    t.check('B32: a pick against the phone is applied', (await isDark(p)) === !want);
    t.check('B32: the pick is stored', await p.evaluate(w => localStorage.getItem('dark_mode') === (w ? '0' : '1'), want));
    t.check('B32: the switch shows the pick', (await pressed(p)) === `light:${want},dark:${!want}`, await pressed(p));
    await p.emulateMedia({ colorScheme: want ? 'light' : 'dark' });
    await p.waitForTimeout(200);
    t.check('B32: with a pick the phone flipping changes nothing', (await isDark(p)) === !want);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.waitForTimeout(300);
    t.check('B32: after a reload the pick still wins over the phone', (await isDark(p)) === !want);
    t.check('B32: no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // A stored Light pick on a dark phone, and the old moon toggle.
  const { ctx, p } = await H.openProgram(browser, { scheme: 'dark' });
  await p.evaluate(() => localStorage.setItem('dark_mode', ''));
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  t.check('B32: an old stored light pick (empty) still wins on a dark phone', !(await isDark(p)));
  await p.evaluate(() => toggleDark());
  t.check('B32: toggleDark from light goes dark and stores 1', (await isDark(p)) && await p.evaluate(() => localStorage.getItem('dark_mode') === '1'));
  await p.evaluate(() => toggleDark());
  t.check('B32: toggleDark again goes light and keeps that pick', !(await isDark(p)) && await p.evaluate(() => localStorage.getItem('dark_mode') === '0'));
  await ctx.close();
  // The existing dark option (pick = dark) on a light phone.
  const d = await H.openProgram(browser, { scheme: 'light', dark: true });
  t.check('B32: a stored Dark pick on a light phone is dark', await isDark(d.p));
  await d.ctx.close();
}

(async () => {
  const browser = await H.launch();
  await theme(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
