#!/usr/bin/env node
/* still.js — takes pictures of a kit sample, to look at while building it.
 *
 *   node Content/motion/tools/still.js court --t 0.5,1.5,3,4.5            a contact sheet of those moments
 *   node Content/motion/tools/still.js court --t 2 --full                  one frame at full size
 *   node Content/motion/tools/still.js court --every 0.5                   every half second of the whole sample
 *   options:  --lang fa   --w 360 (width of each picture in the sheet)   --cols 5   --out DIR   --samples 4 (motion blur)
 *             --page motion/lab.html (the page to open; the item goes in the address)
 * Prints the path of the picture it wrote (look at it with the Read tool).
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const { serve } = require('./serve');

const argv = process.argv.slice(2), item = argv[0], A = {};
for (let i = 1; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } } }
if (!item || item.startsWith('--')) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(2); }

(async () => {
  const srv = await serve(), port = srv.address().port;
  const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  let errors = 0;
  pg.on('pageerror', e => { errors++; console.error('PAGE ERROR:', e.message); });
  pg.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type() + ':', m.text()); });
  const qs = `item=${encodeURIComponent(item)}&render=1${A.lang ? '&lang=' + A.lang : ''}${A.w && A.full ? '' : ''}`;
  await pg.goto(`http://127.0.0.1:${port}/${A.page || 'motion/lab.html'}?${qs}`);
  await pg.waitForFunction('window.REEL_READY === true', null, { timeout: 120000 });
  const info = await pg.evaluate(() => window.LAB || null);
  if (!info || !info.id) { console.error('no such sample. available:', info && info.samples.join(', ')); await browser.close(); srv.close(); process.exit(1); }

  let times = A.t ? String(A.t).split(',').map(Number) : [];
  if (A.every) { const st = +A.every; for (let t = 0; t < info.dur - 1e-6; t += st) times.push(+t.toFixed(3)); }
  if (!times.length) times = [0, info.dur * .25, info.dur * .5, info.dur * .75, info.dur - 1 / info.fps];
  const outDir = path.resolve(A.out || path.join(os.tmpdir(), 'motion-stills')); fs.mkdirSync(outDir, { recursive: true });
  const tag = item + (A.lang === 'fa' ? '.fa' : '');
  const samples = A.samples != null ? +A.samples : 4;

  if (A.full) {
    for (const t of times) {
      const data = await pg.evaluate(([f, n]) => { REEL.renderFrame(f, { samples: n }); return REEL.out.toDataURL('image/png'); }, [Math.round(t * info.fps), samples]);
      const file = path.join(outDir, `${tag}-${String(t).replace('.', '_')}.png`);
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64')); console.log(file);
    }
  } else {
    const cw = +(A.w || 360), cols = Math.min(+(A.cols || 5), times.length), ch = Math.round(cw * info.H / info.W);
    const data = await pg.evaluate(([ts, n, cw, ch, cols, fps]) => {
      const rows = Math.ceil(ts.length / cols), gap = 6, S = document.createElement('canvas');
      S.width = cols * cw + (cols + 1) * gap; S.height = rows * (ch + 22) + (rows + 1) * gap; const g = S.getContext('2d');
      g.fillStyle = '#333'; g.fillRect(0, 0, S.width, S.height); g.imageSmoothingQuality = 'high'; g.font = '14px monospace';
      ts.forEach((t, i) => {
        REEL.renderFrame(Math.round(t * fps), { samples: n });
        const x = gap + (i % cols) * (cw + gap), y = gap + Math.floor(i / cols) * (ch + 22 + gap);
        g.drawImage(REEL.out, x, y, cw, ch); g.fillStyle = '#fff'; g.fillText(t.toFixed(2) + ' s', x + 2, y + ch + 16);
      });
      return S.toDataURL('image/png');
    }, [times, samples, cw, ch, cols, info.fps]);
    const file = path.join(outDir, `${tag}-sheet.png`);
    fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64')); console.log(file);
  }
  await browser.close(); srv.close();
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
