// Site audit harness: screenshots (as readable tiles) + in-page probe + request log, per page x viewport.
// Usage: node capture.js [--pages a,b|all] [--vp mobile,tablet,desktop] [--throttle] [--noshots]
// Env:   AUDIT_BASE (default https://www.amirardekani.com)  AUDIT_OUT (default ./out)
const { chromium } = require('playwright-core');
const fs = require('fs'), path = require('path'), os = require('os');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true); };
const BASE = process.env.AUDIT_BASE || 'https://www.amirardekani.com';
const OUT = process.env.AUDIT_OUT || path.join(os.tmpdir(), 'site-audit', 'out');
const PAGES = JSON.parse(fs.readFileSync(path.join(__dirname, 'pages.json'), 'utf8'));
const probeSrc = fs.readFileSync(path.join(__dirname, 'probe.js'), 'utf8');
const THROTTLE = !!arg('throttle', false), NOSHOTS = !!arg('noshots', false) || THROTTLE;
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36';
const VPS = {
  mobile:  { viewport: { width: 390, height: 844 },  deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID, tile: 1100 },
  small:   { viewport: { width: 360, height: 740 },  deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID, tile: 1100 },
  tablet:  { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, isMobile: false, hasTouch: true, tile: 1180 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, tile: 900 },
  wide:    { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, tile: 1080 },
};
const perfInit = () => {
  window.__perf = { cls: 0, lcp: null, lcpEl: null, fcp: null, longTasks: 0, longTaskMs: 0 };
  const ob = (type, cb) => { try { new PerformanceObserver(l => cb(l.getEntries())).observe({ type, buffered: true }); } catch (e) {} };
  ob('layout-shift', es => es.forEach(e => { if (!e.hadRecentInput) window.__perf.cls += e.value; }));
  ob('largest-contentful-paint', es => { const e = es[es.length - 1]; window.__perf.lcp = Math.round(e.startTime); window.__perf.lcpEl = e.element ? (e.element.tagName + (e.element.currentSrc ? ' ' + e.element.currentSrc.slice(-70) : ' ' + (e.element.textContent || '').trim().slice(0, 30))) : null; });
  ob('paint', es => es.forEach(e => { if (e.name === 'first-contentful-paint') window.__perf.fcp = Math.round(e.startTime); }));
  ob('longtask', es => es.forEach(e => { window.__perf.longTasks++; window.__perf.longTaskMs += Math.round(e.duration); }));
};

async function autoScroll(page) {
  await page.evaluate(async () => {
    document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important');
    if (document.body) document.body.style.setProperty('scroll-behavior', 'auto', 'important');
    const step = Math.max(300, Math.floor(innerHeight * 0.7)); let y = 0, g = 0;
    while (y < document.documentElement.scrollHeight && g++ < 150) { window.scrollTo(0, y); y += step; await new Promise(r => setTimeout(r, 110)); }
    window.scrollTo(0, document.documentElement.scrollHeight); await new Promise(r => setTimeout(r, 300));
    window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 300));
  });
  await page.waitForFunction(() => window.scrollY === 0, null, { timeout: 5000 }).catch(() => {});
}
async function focusTest(page, n) {
  const out = [];
  await page.evaluate(() => { window.scrollTo(0, 0); if (document.activeElement) document.activeElement.blur(); });
  for (let i = 0; i < n; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const e = document.activeElement; if (!e || e === document.body) return null;
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      return { tag: e.tagName.toLowerCase(), t: (e.textContent || e.getAttribute('aria-label') || e.placeholder || '').trim().replace(/\s+/g, ' ').slice(0, 34), outline: cs.outlineStyle === 'none' ? 'none' : cs.outlineStyle + ' ' + cs.outlineWidth, shadow: cs.boxShadow === 'none' ? 'none' : 'yes', inView: r.width > 0 && r.bottom > 0 && r.top < innerHeight };
    });
    if (info) out.push(info);
  }
  return out;
}

async function runOne(browser, pg, vpName) {
  const vp = VPS[vpName]; const dir = path.join(OUT, pg.key, vpName); fs.mkdirSync(dir, { recursive: true });
  const { tile, ...ctxOpts } = vp;
  const ctx = await browser.newContext({ ...ctxOpts, locale: pg.lang === 'fa' ? 'fa-IR' : 'en-GB', colorScheme: 'light' });
  await ctx.addInitScript(perfInit);
  await ctx.route(/plausible\.io/, r => r.abort());          // never count the audit as real visits
  const page = await ctx.newPage();
  const log = { console: [], errors: [], failed: [], statuses: {}, nonOk: [], hosts: {}, textNoEnc: [], noCache: [], bytes: 0 };
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') log.console.push([m.type(), m.text().slice(0, 220)]); });
  page.on('pageerror', e => log.errors.push(String(e).slice(0, 220)));
  page.on('requestfailed', r => { if (!/plausible/.test(r.url())) log.failed.push([r.url().slice(0, 140), (r.failure() || {}).errorText]); });
  page.on('response', r => {
    try {
      const u = r.url(), h = r.headers(), s = r.status(); const host = new URL(u).host;
      log.statuses[s] = (log.statuses[s] || 0) + 1; log.hosts[host] = (log.hosts[host] || 0) + 1;
      if (s >= 400) log.nonOk.push([s, u.slice(0, 140)]);
      if (h['content-length']) log.bytes += +h['content-length'];
      const ct = h['content-type'] || '';
      if (/text|javascript|json|svg|xml/.test(ct) && !h['content-encoding'] && +(h['content-length'] || 0) > 2000 && host.endsWith('amirardekani.com')) log.textNoEnc.push([u.replace(BASE, '').slice(0, 80), h['content-length']]);
      if (host.endsWith('amirardekani.com') && /image|font|css|javascript/.test(ct)) { const cc = h['cache-control'] || '(none)'; log.noCache.push(cc); }
    } catch (e) {}
  });
  if (THROTTLE) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const rec = { key: pg.key, vp: vpName, url: BASE + pg.path, throttle: THROTTLE };
  try {
    const t0 = Date.now();
    const resp = await page.goto(BASE + pg.path, { waitUntil: 'load', timeout: THROTTLE ? 120000 : 45000 });
    rec.status = resp ? resp.status() : null; rec.finalUrl = page.url().replace(BASE, ''); rec.loadMs = Date.now() - t0;
    await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
    await page.waitForTimeout(THROTTLE ? 2500 : 500);
    if (THROTTLE) { rec.probe = await page.evaluate(probeSrc); }
    else {
      await autoScroll(page);
      await page.addStyleTag({ content: '.reveal,.fade-in,[data-reveal]{opacity:1!important;transform:none!important;transition:none!important}' }).catch(() => {});
      await page.waitForTimeout(1800);
      rec.probe = await page.evaluate(probeSrc);
      rec.focus = await focusTest(page, 14);
      await page.evaluate(() => window.scrollTo(0, 0));
      // second look: reduced motion honoured?
      if (!NOSHOTS) {
        const total = await page.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight));
        const w = vp.viewport.width; let i = 0;
        for (let y = 0; y < total && i < 40; y += tile, i++) {
          const h = Math.min(tile, total - y); if (h < 40) break;
          await page.screenshot({ path: path.join(dir, 'tile-' + String(i).padStart(2, '0') + '.png'), fullPage: true, clip: { x: 0, y, width: w, height: h }, caret: 'hide' });
        }
        rec.tiles = i; rec.totalHeight = total;
      }
    }
  } catch (e) { rec.error = String(e).slice(0, 300); }
  rec.log = log;
  fs.writeFileSync(path.join(dir, THROTTLE ? 'throttled.json' : 'record.json'), JSON.stringify(rec, null, 1));
  await ctx.close();
  return rec;
}

(async () => {
  const want = arg('pages', 'all'); const vps = String(arg('vp', 'mobile,desktop')).split(',');
  const list = want === 'all' ? PAGES : PAGES.filter(p => String(want).split(',').includes(p.key));
  let browser; try { browser = await chromium.launch({ channel: 'chrome', headless: true }); } catch (e) { browser = await chromium.launch({ channel: 'msedge', headless: true }); }
  for (const pg of list) for (const v of vps) {
    const t0 = Date.now(); const r = await runOne(browser, pg, v);
    const p = r.probe || {}; const st = p.structure || {};
    console.log([pg.key.padEnd(12), v.padEnd(8), String(r.status).padEnd(4), (r.error ? 'ERR ' + r.error.slice(0, 80) : ('h=' + (st.docHeight || '?') + ' tiles=' + (r.tiles === undefined ? '-' : r.tiles) + ' ' + ((Date.now() - t0) / 1000).toFixed(1) + 's'))].join(' '));
  }
  await browser.close();
})();
