// Probe the live site at phone size: section offsets + page height for both skins.
// usage: node probe_site.js [url]
const { chromium } = require('../../../.claude/skills/reel/tools/_pw');
const url = process.argv[2] || 'https://mehranehzohourian.com/';
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  for (const sport of ['tennis', 'padel']) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'fa-IR',
      reducedMotion: 'reduce', isMobile: true, hasTouch: true,
    });
    const page = await ctx.newPage();
    await page.goto(url + '#' + sport, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(800);
    const info = await page.evaluate(() => {
      const q = s => document.querySelector(s);
      const top = el => el ? Math.round(el.getBoundingClientRect().top + scrollY) : null;
      const h = el => el ? Math.round(el.getBoundingClientRect().height) : null;
      const secs = ['#home', '.stats', '#about', '#record', '#photos', '.ticker', '#classes', '#venues', '#how', '#why', '#faq', '#contact', '.foot'];
      const out = {};
      secs.forEach(s => { out[s] = [top(q(s)), h(q(s))]; });
      return {
        total: document.documentElement.scrollHeight, secs: out,
        skin: document.documentElement.dataset.skin, gated: document.documentElement.classList.contains('gated'),
        nav: [h(q('#nav'))], bar: [h(q('#bar'))], videoState: (q('video') || {}).readyState, dur: (q('video') || {}).duration,
      };
    });
    console.log(sport, JSON.stringify(info));
    await ctx.close();
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
