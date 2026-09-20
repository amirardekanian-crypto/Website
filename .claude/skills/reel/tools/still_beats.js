// Renders the frozen ?beat=N still of every scene of a reel (stillmode: transitions and animations off, so each
// scene shows its final state). Also prints console/page errors and whether the fonts loaded.
//
// usage: node still_beats.js <reel.html> <outDir> [beat ...]
//   beats default to 0 1 2 3 4 5 6. A beat can carry extra query text, e.g. "5&sub=1" (reel-7: app screen 1).
// output: <outDir>/beat-<beat>.png at 1080x1920. Tile them with contact_sheet.py, then LOOK AT EACH ONE at full
// size: the sheet is for the overview, the full-size look is where the overlaps and clipped text show up.
const { chromium } = require('playwright-core');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

const [file, outDir, ...rest] = process.argv.slice(2);
if (!file || !outDir) { console.error('usage: node still_beats.js <reel.html> <outDir> [beat ...]'); process.exit(2); }
const beats = rest.length ? rest : ['0', '1', '2', '3', '4', '5', '6'];
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  for (const b of beats) {
    await page.goto(pathToFileURL(path.resolve(file)).href + '?beat=' + b, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'beat-' + b.replace(/[^0-9a-z]/gi, '_') + '.png') });
  }
  const fonts = await page.evaluate(() => [...document.fonts].map(f => f.family + ':' + f.status).filter((v, i, a) => a.indexOf(v) === i).join(' '));
  console.log('fonts:', fonts);
  console.log('errors:', errs.length ? errs.slice(0, 12) : 'none');
  await browser.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
