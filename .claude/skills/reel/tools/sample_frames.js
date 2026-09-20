// Plays the reel in REAL time (the way Amir will see it) and saves timed frames, to catch what stills cannot:
// stuck or ghost elements, wrong timing, a scene that does not replay on the second loop.
//
// usage: node sample_frames.js <reel.html> <outDir> <startSec> <endSec> <stepSec> [--tag x] [--default] [--loop2]
//   --default  play in the normal view (controls, progress bar, the black dip at the loop end) instead of ?capture=1
//   --loop2    wait for the SECOND pass of the loop, then sample it (proves the reset works)
// needs the reel's driver to set window.__t0 = performance.now() at the start of play() (reel-7 does).
// Frames are JPEGs named <tag>-<seconds>.jpg; frame times are printed as target@actual. Each screenshot costs ~0.15 s.
const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const flag = n => args.includes(n);
const val = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--tag');
const [file, outDir] = pos;
const [a, b, s] = pos.slice(2).map(Number);
const tag = val('--tag', 'm');
if (!file || !outDir || [a, b, s].some(Number.isNaN)) { console.error('usage: node sample_frames.js <reel.html> <outDir> <start> <end> <step> [--tag x] [--default] [--loop2]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(pathToFileURL(path.resolve(file)).href + (flag('--default') ? '' : '?capture=1'), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__t0 > 0, null, { timeout: 20000 });
  if (flag('--loop2')) {
    const first = await page.evaluate(() => window.__t0);
    await page.waitForFunction(f => window.__t0 !== f, first, { timeout: 120000, polling: 'raf' });
  }
  const log = [];
  for (let t = a; t <= b + 1e-6; t += s) {
    await page.waitForFunction(x => performance.now() - window.__t0 >= x * 1000, t, { polling: 'raf', timeout: 120000 });
    const now = await page.evaluate(() => (performance.now() - window.__t0) / 1000);
    await page.screenshot({ path: path.join(outDir, tag + '-' + t.toFixed(1).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 72 });
    log.push(t.toFixed(1) + '@' + now.toFixed(2));
  }
  console.log('frames', log.join(' '));
  console.log('errors:', errs.length ? errs : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
