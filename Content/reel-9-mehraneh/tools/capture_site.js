// Capture the LIVE site at phone size for the video's phone mock-ups.
// For each skin (tennis = spruce, padel = court): a tall strip of the top of the page (final, fully revealed state),
// the "stuck" nav and the sticky bottom bar as separate overlays (they are position:fixed on the real site), plus layout numbers.
//
// usage: node capture_site.js <outDir> [url] [stripHeightCssPx=4800]
// needs playwright-core on NODE_PATH and Edge (channel 'msedge'), same as .claude/skills/reel/tools.
const { chromium } = require('../../../.claude/skills/reel/tools/_pw');
const fs = require('fs');
const path = require('path');

const out = path.resolve(process.argv[2] || 'site-captures');
const url = process.argv[3] || 'https://mehranehzohourian.com/';

fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const meta = {}, tilesInfo = {};
  for (const sport of ['tennis', 'padel']) {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.5, locale: 'fa-IR',
      reducedMotion: 'reduce',   // the site's own reduced-motion rules render every reveal in its FINAL state
    });
    const page = await ctx.newPage();
    await page.goto(url + '#' + sport, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);

    // lazy photos (About shots, the "moments" strip) only load near the viewport: make every image eager and wait for it
    await page.evaluate(async () => {
      document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
      await Promise.all([...document.images].map(i => (i.complete && i.naturalWidth) ? 0 : new Promise(r => {
        i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 6000);
      })));
      await Promise.all([...document.images].map(i => i.decode ? i.decode().catch(() => {}) : 0));
    });
    // park the hero video on a good frame, hide the live canvas rally (the video brings its own ball)
    await page.evaluate(async () => {
      const v = document.querySelector('video');
      if (v) { v.pause(); v.currentTime = 2.0; await new Promise(r => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 1500); }); }
      const hide = ['.rail', '.tbar', '#bar', '.rally', '.draft-badge'];
      hide.forEach(s => document.querySelectorAll(s).forEach(e => { e.style.visibility = 'hidden'; }));
    });
    await page.waitForTimeout(500);

    // 1) the whole page as tiles (nav stays in its transparent top-of-page state, baked into the first tile)
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const TH = 4900, tiles = Math.ceil(total / TH);
    for (let i = 0; i < tiles; i++) {
      await page.screenshot({ path: path.join(out, sport + '-tile' + i + '.png'), fullPage: true, clip: { x: 0, y: i * TH, width: 390, height: Math.min(TH, total - i * TH) } });
    }
    tilesInfo[sport] = { tiles, TH, total };

    // 2) the stuck nav: scroll a little so .nav.stuck applies, shoot the element only
    await page.evaluate(() => { document.querySelector('#nav').style.visibility = 'visible'; window.scrollTo(0, 120); });
    await page.waitForTimeout(900);
    const nav = await page.$('#nav');
    await nav.screenshot({ path: path.join(out, sport + '-nav-stuck.png'), animations: 'disabled' });

    // 3) the sticky bottom bar (shows after 640 px of scroll)
    await page.evaluate(() => { document.querySelector('#bar').style.visibility = 'visible'; window.scrollTo(0, 800); });
    await page.waitForTimeout(900);
    const bar = await page.$('#bar');
    await bar.screenshot({ path: path.join(out, sport + '-bar.png'), animations: 'disabled' });

    // layout numbers for choreography
    meta[sport] = await page.evaluate(() => {
      const top = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      const rect = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; };
      return {
        total: document.documentElement.scrollHeight,
        sections: Object.fromEntries(['#home', '.stats', '#about', '#record', '#photos', '.ticker', '#classes', '#venues', '#how', '#why', '#faq', '#contact'].map(s => [s, top(s)])),
        nav: rect('#nav'), bar: rect('#bar'),
        skin: document.documentElement.dataset.skin,
      };
    });
    meta[sport].tiles = tilesInfo[sport];
    await ctx.close();
  }
  fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
