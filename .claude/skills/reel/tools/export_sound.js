// Export the sound plan (bounce times from the ball, cue list, scroll speed) from the page as JSON for tools/make_sfx.py.
// usage: node export_sound.js <reel.html> <out.json>
const { chromium } = require('./_pw');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');
(async () => {
  const b = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(pathToFileURL(path.resolve(process.argv[2])).href + '?capture=1');
  await p.evaluate(() => window.__ready);
  const s = await p.evaluate(() => window.__sound());
  fs.writeFileSync(process.argv[3], JSON.stringify(s));
  console.log('cues', s.cues.length, '| impacts', s.impacts.length, '| scroll samples', s.scroll.length, '|', errs.length ? errs : 'no errors');
  await b.close();
})();
