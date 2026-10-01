#!/usr/bin/env node
/* render.js — drives reel.html in headless Chromium and writes frames as PNGs.
 *
 *   node tools/render.js --out DIR                          every frame (450), 3 workers
 *   node tools/render.js --out DIR --at 0.2,1.1,7.5         stills at those seconds  -> at_0.200.png ...
 *   node tools/render.js --out DIR --range 100-160          a slice of frames
 *   node tools/render.js --out DIR --samples 1 --w 960      quick look: no motion blur, half size
 *   node tools/render.js --cues export/cues.json            write the cue sheet the soundtrack is built from
 *
 * Frames are independent (the reel keeps no state between frames), so workers pull from one queue.
 * Needs: node, playwright (global or local) and a Chromium. CHROMIUM=/path/to/chrome to override.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const ROOT = path.resolve(__dirname, '..');                 // Content/showreel
const CONTENT = path.resolve(ROOT, '..');                   // Content: reel.html loads the kit from ../motion/kit, so the server starts one level up
const A = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } } }

const FPS = 30, TOTAL = 450;
const outDir = A.out ? path.resolve(A.out) : null;
const workers = +(A.workers || 3);
const samples = A.samples != null ? +A.samples : null;      // null = whatever each shot asks for
const width = A.w ? +A.w : 1920;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };

function serve() {
  return new Promise(res => {
    const srv = http.createServer((req, rsp) => {
      const p = path.join(CONTENT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(CONTENT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end('404'); }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(p).pipe(rsp);
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

(async () => {
  const srv = await serve(), port = srv.address().port, url = `http://127.0.0.1:${port}/showreel/reel.html?render=1`;
  const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  let errors = 0;

  async function open(id) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[w${id}] ${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => { errors++; console.error(`[w${id}] PAGE ERROR: ${e.message}\n${(e.stack || '').split('\n').slice(0, 4).join('\n')}`); });
    await page.goto(url);
    await page.waitForFunction('window.REEL_READY === true', null, { timeout: 90000 });
    return page;
  }

  if (A.cues) {
    const page = await open(0);
    const sheet = await page.evaluate(() => REEL.cueSheet());
    fs.mkdirSync(path.dirname(path.resolve(A.cues)), { recursive: true });
    fs.writeFileSync(path.resolve(A.cues), JSON.stringify(sheet, null, 1));
    console.log(`cues: ${sheet.cues.length} -> ${A.cues}`);
    await browser.close(); srv.close(); return;
  }
  if (!outDir) { console.error('need --out DIR (or --cues FILE)'); process.exit(2); }
  fs.mkdirSync(outDir, { recursive: true });

  /* what to render */
  let jobs;
  if (A.at) jobs = String(A.at).split(',').map(s => ({ f: parseFloat(s) * FPS, name: `at_${parseFloat(s).toFixed(3)}.png` }));
  else if (A.frames) jobs = String(A.frames).split(',').map(s => ({ f: +s, name: `f_${String(+s).padStart(4, '0')}.png` }));
  else {
    let [a, b] = A.range ? String(A.range).split('-').map(Number) : [0, TOTAL - 1];
    if (b == null || isNaN(b)) b = a;
    jobs = []; for (let f = a; f <= b; f++) jobs.push({ f, name: `f_${String(f).padStart(4, '0')}.png` });
  }

  const t0 = Date.now(); let done = 0, next = 0;
  const shot = ([f, n, w]) => {
    REEL.renderFrame(f, n != null ? { samples: n } : {});
    const o = REEL.out;
    if (w === o.width) return o.toDataURL('image/png');
    const c = document.createElement('canvas'); c.width = w; c.height = Math.round(w * 9 / 16);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(o, 0, 0, c.width, c.height);
    return c.toDataURL('image/png');
  };
  await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, async (_, id) => {
    const page = await open(id);
    for (;;) {
      const j = jobs[next++]; if (!j) break;
      const data = await page.evaluate(shot, [j.f, samples, width]);
      fs.writeFileSync(path.join(outDir, j.name), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
      done++;
      if (done % 25 === 0 || done === jobs.length) {
        const el = (Date.now() - t0) / 1000;
        console.log(`${done}/${jobs.length}  ${el.toFixed(0)}s  (~${(el / done * (jobs.length - done)).toFixed(0)}s left)`);
      }
    }
  }));
  await browser.close(); srv.close();
  console.log(`done: ${jobs.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s, ${errors} page errors`);
  process.exit(errors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
