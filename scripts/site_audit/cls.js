// Which elements cause layout shift? (slow 4G + 4x CPU, phone). node cls.js <path> [...]
const { chromium } = require('playwright-core');
const BASE = process.env.AUDIT_BASE || 'https://www.amirardekani.com';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  for (const p of process.argv.slice(2)) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID });
    await ctx.route(/plausible\.io/, r => r.abort());
    await ctx.addInitScript(() => {
      window.__shifts = [];
      new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__shifts.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: (e.sources || []).map(s => { const n = s.node; return { node: n ? (n.nodeName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && n.className.toString ? '.' + n.className.toString().trim().split(/\s+/).slice(0, 2).join('.') : '')) : '?', from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)], to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)] }; }).slice(0, 3) }); } }).observe({ type: 'layout-shift', buffered: true });
    });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.goto(BASE + p, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3500);
    const sh = await page.evaluate(() => window.__shifts);
    const total = sh.reduce((a, s) => a + s.v, 0).toFixed(3);
    console.log('== ' + p + '  total CLS ' + total + '  shifts: ' + sh.length);
    sh.sort((a, b) => b.v - a.v).slice(0, 6).forEach(s => console.log('  t=' + s.t + 'ms value=' + s.v + ' ' + JSON.stringify(s.src)));
    await ctx.close();
  }
  await browser.close();
})();
