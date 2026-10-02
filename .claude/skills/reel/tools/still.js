// Frozen frames of reel 9 at exact times — the page is a pure function of time, so any instant can be shot.
// usage: node still.js <reel.html> <outDir> <t1> <t2> ...        (times in seconds)   [--scale 0.5] [--jpg] [--query noball=1]
// prints console errors / page errors; names files t_0520.png (= 5.20 s)
const { chromium } = require('./_pw');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const flag = n => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] && ['--scale', '--query'].includes(argv[i - 1])));
const [file, outDir, ...times] = pos;
if (!file || !outDir || !times.length) { console.error('usage: node still.js <reel.html> <outDir> <t1> [t2 ...]'); process.exit(2); }
const SCALE = +opt('--scale', 1), QUERY = opt('--query', '');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: SCALE });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGE ERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
  await page.goto(pathToFileURL(path.resolve(file)).href + '?capture=1' + (QUERY ? '&' + QUERY : ''), { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  for (const t of times) {
    await page.evaluate(tt => window.__render(tt), +t);
    await page.waitForTimeout(30);
    const name = 't_' + String(Math.round(+t * 100)).padStart(4, '0') + (flag('--jpg') ? '.jpg' : '.png');
    await page.screenshot(Object.assign({ path: path.join(outDir, name), type: flag('--jpg') ? 'jpeg' : 'png' }, flag('--jpg') ? { quality: 92 } : {}));
  }
  console.log('shot', times.length, 'frames ->', outDir, errs.length ? '\n' + [...new Set(errs)].join('\n') : '(no errors)');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
