// Open the reel the way Amir does (no URL parameters): it must autoplay, loop, fit the window and show no errors.
// usage: node preview_check.js <reel.html> [shot.png]
const { chromium } = require('./_pw');
const { pathToFileURL } = require('url');
const path = require('path');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGE ERROR: ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console error: ' + m.text()); });
  p.on('requestfailed', r => errs.push('request failed: ' + r.url().slice(0, 80)));
  await p.goto(pathToFileURL(path.resolve(process.argv[2])).href);
  await p.evaluate(() => window.__ready);
  const t0 = await p.evaluate(() => document.getElementById('tt').textContent);
  await p.waitForTimeout(2400);
  const t1 = await p.evaluate(() => document.getElementById('tt').textContent);
  const box = await p.evaluate(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
  console.log('clock', t0, '->', t1, '| stage on screen', box.join('x'), '|', errs.length ? errs : 'no errors');
  if (process.argv[3]) await p.screenshot({ path: process.argv[3] });
  await b.close();
})();
