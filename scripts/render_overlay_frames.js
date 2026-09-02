const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const path = require('path'), fs = require('fs');

(async () => {
  const file  = process.argv[2];
  const out   = process.argv[3];
  const fps   = parseFloat(process.argv[4] || '60');
  const dur   = parseFloat(process.argv[5] || '4.0');
  const only  = process.argv[6] ? process.argv[6].split(',').map(Number) : null;

  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--force-color-profile=srgb', '--disable-lcd-text', '--font-render-hinting=none']
  });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.resolve(file) + '?capture=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });
  await page.waitForTimeout(250);

  const times = only ? only : Array.from({ length: Math.round(dur * fps) }, (_, i) => i / fps);
  let n = 0;
  for (const t of times) {
    await page.evaluate((tt) => window.__seek(tt), t);
    const name = only ? `t${t.toFixed(3)}.png` : `f${String(n).padStart(4, '0')}.png`;
    await page.screenshot({ path: path.join(out, name), omitBackground: true, type: 'png' });
    n++;
  }
  console.log('frames:', n);
  await browser.close();
})();
