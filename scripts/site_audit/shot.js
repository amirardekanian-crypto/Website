// Real-viewport screenshot: what a visitor actually sees at one scroll position / after clicks.
// node shot.js <path-or-url> <out.png> [--vp mobile|small|tablet|desktop|wide] [--scroll "<css selector>"|y=1200]
//              [--click "<css selector>"]...(repeatable, in order) [--tab N] [--wait ms] [--reduced] [--block "<host regex>"] [--text "<selector>"]
// Env: AUDIT_BASE (default https://www.amirardekani.com). Analytics (plausible) is always blocked. Read-only: never submits anything.
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path');
const argv = process.argv.slice(2);
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--') && !['--reduced'].includes(argv[i - 1])));
const opt = (n) => { const out = []; argv.forEach((a, i) => { if (a === '--' + n) out.push(argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); }); return out; };
const BASE = process.env.AUDIT_BASE || 'https://www.amirardekani.com';
const winPath = p => (p || '').replace(/^\/([a-zA-Z])\//, '$1:/');
const target = pos[0], out = winPath(pos[1]);
if (!target || !out) { console.error('usage: node shot.js <path-or-url> <out.png> [--vp mobile] [--scroll sel|y=N] [--click sel]... [--tab N]'); process.exit(2); }
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
const VPS = {
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID },
  small: { viewport: { width: 360, height: 740 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID },
  tablet: { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  wide: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
};
(async () => {
  const vp = VPS[opt('vp')[0] || 'mobile'];
  let browser; try { browser = await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { browser = await chromium.launch({ channel: 'msedge', headless: true }); }
  const ctx = await browser.newContext({ ...vp, locale: /fa|index-fa|form-fa|tennis|partner|links|etminan\.html/.test(target) ? 'fa-IR' : 'en-GB', reducedMotion: opt('reduced').length ? 'reduce' : 'no-preference' });
  await ctx.route(/plausible\.io/, r => r.abort());
  for (const b of opt('block')) await ctx.route(new RegExp(b), r => r.abort());   // e.g. --block "fonts\.(googleapis|gstatic)\.com" to see the page without Google Fonts
  const page = await ctx.newPage();
  await page.goto(/^(https?|file):/.test(target) ? target : BASE + target, { waitUntil: 'load', timeout: 45000 });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.evaluate(() => { document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important'); });
  await page.waitForTimeout(700);
  // Scroll a little at a time so scroll-triggered reveals fire exactly as for a visitor
  const sc = opt('scroll')[0];
  if (sc) {
    await page.evaluate(async (sc) => {
      let y;
      if (/^y=/.test(sc)) y = +sc.slice(2);
      else { const el = document.querySelector(sc); if (!el) throw new Error('selector not found: ' + sc); y = el.getBoundingClientRect().top + scrollY - 80; }
      const start = scrollY, steps = 14;
      for (let i = 1; i <= steps; i++) { window.scrollTo(0, start + (y - start) * i / steps); await new Promise(r => setTimeout(r, 90)); }
    }, sc);
  }
  for (const c of opt('click')) { await page.click(c, { timeout: 8000 }); await page.waitForTimeout(700); }
  const tabs = +(opt('tab')[0] || 0);
  for (let i = 0; i < tabs; i++) await page.keyboard.press('Tab');
  await page.waitForTimeout(+(opt('wait')[0] || 1500));
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  await page.screenshot({ path: out });
  const t = opt('text')[0];
  if (t) console.log(await page.evaluate(sel => Array.from(document.querySelectorAll(sel)).slice(0, 6).map(e => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { text: (e.textContent || '').trim().slice(0, 60), font: c.fontSize + ' ' + c.fontFamily.split(',')[0], color: c.color, bg: c.backgroundColor, box: [Math.round(r.width), Math.round(r.height)] }; }), t));
  console.log('saved', out);
  await browser.close();
})().catch(e => { console.error('ERR', String(e).slice(0, 300)); process.exit(1); });
