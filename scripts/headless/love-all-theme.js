// Love All round 2, the theme group (2026-10-24): node scripts/headless/love-all-theme.js
//   B32   until the athlete picks Light or Dark the app follows the phone's dark mode (at boot and live); a pick is kept and wins.
//   RING  on Home, the level in the habit card's ring is a button (44 px or more) that opens Your numbers; the day's count is not.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js).
'use strict';
const H = require('./lib');
const C = require('./career');
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

const HAB_ON = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
async function ring(browser) {
  // Career on, the level in the ring.
  const prof = C.rwProfile(10000);
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, tz: 'UTC', hist: [], seed: { _hab_cfg: HAB_ON },
    stub: { tables: { career_rules: C.RW_RULES, career_facts: [], career_catalogue: C.catRows() }, profile: prof, awards: C.rwShelf(prof) } });
  await C.waitRow(p);
  const r = await p.evaluate(() => {
    const e = document.querySelector('#home-overview .today-ring'); if (!e) return null;
    const b = e.getBoundingClientRect();
    return { tag: e.tagName, aria: e.getAttribute('aria-label'), w: b.width, h: b.height, kick: e.querySelector('.today-mid span').textContent,
             border: getComputedStyle(e).borderTopWidth, bgc: getComputedStyle(e).backgroundColor };
  });
  t.check('RING: with the level in it the ring is a button', r && r.tag === 'BUTTON' && r.kick === 'Level', JSON.stringify(r));
  t.check('RING: its label says what it is and what it does', r && r.aria === 'Your level. Open your numbers', r && r.aria);
  t.check('RING: the tap target is at least 44 px', r && r.w >= 44 && r.h >= 44, r && r.w + 'x' + r.h);
  t.check('RING: it looks as before (no border, no fill, 84 px)', r && r.border === '0px' && r.bgc === 'rgba(0, 0, 0, 0)' && r.w === 84 && r.h === 84, JSON.stringify(r));
  await p.focus('#home-overview .today-ring-go');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(500);
  const where = await p.evaluate(() => ({ plan: document.getElementById('screen-plan').classList.contains('active'),
    top: Math.round(document.getElementById('numbers-title').getBoundingClientRect().top) }));
  t.check('RING: Enter on it opens Progress at Your numbers', where.plan && where.top < 200, JSON.stringify(where));
  await p.evaluate(() => goTo('home'));
  await p.waitForTimeout(300);
  await p.click('#home-overview .today-ring-go');
  await p.waitForTimeout(500);
  t.check('RING: a tap opens Progress at Your numbers', await p.evaluate(() => document.getElementById('screen-plan').classList.contains('active')));
  t.check('RING: no page errors', !p.errs.length, p.errs.join(' | '));
  await ctx.close();
  // Career off: the day's count, not a button.
  const o = await H.openProgram(browser, { w: 390, h: 844, tz: 'UTC', hist: [], seed: { _hab_cfg: HAB_ON } });
  await o.p.waitForTimeout(500);
  const k = await o.p.evaluate(() => { const e = document.querySelector('#home-overview .today-ring'); return e && { tag: e.tagName, role: e.getAttribute('role'), kick: e.querySelector('.today-mid span').textContent }; });
  t.check('RING: showing the day\'s count, the ring stays a picture', k && k.tag === 'DIV' && k.role === 'img' && k.kick === 'Done', JSON.stringify(k));
  await o.ctx.close();
}

(async () => {
  const browser = await H.launch();
  await theme(browser);
  await ring(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
