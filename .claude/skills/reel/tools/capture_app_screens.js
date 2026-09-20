// Screenshots REAL screens of a web app at phone size, for a phone mock-up inside a reel ("nothing faked").
//
// usage: node capture_app_screens.js <config.json> <outDir>
// config (see Content/reel-7-course/tools/capture.config.json for a working one):
//   url            the app, with a start hash            viewport {width,height}, dpr (2 is plenty), locale, mobile
//   localStorage   {key: value} set BEFORE the app loads (e.g. the version picker the app would otherwise show)
//   settleMs       wait after each route change          measure  [css selectors]  -> printed [top, height] in CSS px
//   shots          [{name, hash}]                        one viewport screenshot each (bars included)
//   tall           [{name, hash, height, hide}]          a full-page strip of `height` CSS px with the fixed/sticky
//                                                        bars in `hide` removed, so it can SCROLL inside the phone
//                                                        while the real bars are laid over it as a separate crop
// Choose the viewport so the phone screen's aspect is right: reel-7's screen is 528x1050 under a 58 px status bar,
// which is 390x770 CSS px. Convert the PNGs to lossless WebP to store them (reel-7/src/to_webp.py).
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const [cfgPath, outDir] = process.argv.slice(2);
if (!cfgPath || !outDir) { console.error('usage: node capture_app_screens.js <config.json> <outDir>'); process.exit(2); }
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const vw = cfg.viewport.width;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({
    viewport: cfg.viewport, deviceScaleFactor: cfg.dpr || 2, locale: cfg.locale || 'en-GB', isMobile: !!cfg.mobile, hasTouch: !!cfg.mobile,
  });
  if (cfg.localStorage) await ctx.addInitScript(kv => { try { for (const k in kv) localStorage.setItem(k, kv[k]); } catch (e) {} }, cfg.localStorage);
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') console.log('console error:', m.text().slice(0, 160)); });
  await page.goto(cfg.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  const go = async hash => {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForTimeout(cfg.settleMs || 2200);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForFunction(() => [...document.images].every(i => i.complete), null, { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(600);
  };
  for (const s of cfg.shots || []) {
    await go(s.hash);
    await page.screenshot({ path: path.join(outDir, s.name + '.png') });
    const info = await page.evaluate(sels => Object.fromEntries(sels.map(q => { const e = document.querySelector(q); if (!e) return [q, null]; const b = e.getBoundingClientRect(); return [q, [Math.round(b.top), Math.round(b.height)]]; })), cfg.measure || []);
    console.log(s.name, JSON.stringify(info));
  }
  for (const t of cfg.tall || []) {
    await go(t.hash);
    const style = await page.addStyleTag({ content: (t.hide || '.no-such-thing') + '{display:none!important}' });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(outDir, t.name + '.png'), fullPage: true, clip: { x: 0, y: 0, width: vw, height: t.height } });
    await style.evaluate(el => el.remove());
    console.log(t.name, 'tall', t.height, 'px');
  }
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
