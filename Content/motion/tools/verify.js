#!/usr/bin/env node
/* verify.js — proves that a page renders exactly the frames it used to.
 *
 * The reel is a pure function of its frame number, so a frame can be fingerprinted: this tool opens a page in headless
 * Chromium, renders frames, and takes the SHA-256 of each frame's decoded pixels (so it does not depend on PNG encoding).
 *
 *   node Content/motion/tools/verify.js hash  --page showreel/reel.html --out Content/motion/baseline/reel.json
 *       fingerprint every frame (or --range 100-160) and the cue sheet the picture exports; write them to --out
 *   node Content/motion/tools/verify.js check --page showreel/reel.html --baseline Content/motion/baseline/reel.json
 *       render again and compare with the baseline: lists every frame that differs and whether the cue sheet is identical
 *       --range 100-160     only these frames          --workers 4      parallel pages (default 3)
 *       --dump DIR          write the differing frames as PNG (and a diff mask if --ref-page is given)
 *       --ref-page PAGE     a second page to dump from (the old code), for looking at a difference
 *       --samples N         cap motion-blur samples (default: whatever each shot asks for; the baseline uses the default)
 *
 * Pages are served from Content/ (so "showreel/reel.html" and "motion/compose.html" both work). Exit code 1 on any difference.
 */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const CONTENT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2), mode = argv[0];
const A = {};
for (let i = 1; i < argv.length; i++) { const a = argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } } }
if (!['hash', 'check'].includes(mode) || !A.page) { console.error(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(2); }

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
const serve = () => new Promise(res => {
  const srv = http.createServer((req, rsp) => {
    const p = path.join(CONTENT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(CONTENT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { rsp.writeHead(404); return rsp.end('404'); }
    rsp.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(p).pipe(rsp);
  }).listen(0, '127.0.0.1', () => res(srv));
});

const workers = +(A.workers || 3);
const samples = A.samples != null ? +A.samples : null;

(async () => {
  const srv = await serve(), port = srv.address().port;
  const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  let pageErrors = 0;
  const open = async (page_) => {
    const sep = page_.includes('?') ? '&' : '?';
    const pg = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    pg.on('pageerror', e => { pageErrors++; console.error('PAGE ERROR:', e.message); });
    pg.on('console', m => { if (m.type() === 'error') console.log('console error:', m.text()); });
    await pg.goto(`http://127.0.0.1:${port}/${page_}${sep}render=1`);
    await pg.waitForFunction('window.REEL_READY === true', null, { timeout: 120000 });
    return pg;
  };

  /* what to render */
  const probe = await open(A.page);
  const info = await probe.evaluate(() => ({ fps: REEL.FPS, dur: REEL.DUR, w: REEL.W, h: REEL.H }));
  const total = Math.round(info.fps * info.dur);
  let [a, b] = A.range ? String(A.range).split('-').map(Number) : [0, total - 1];
  if (b == null || isNaN(b)) b = a;
  const frames = []; for (let f = a; f <= b; f++) frames.push(f);
  const sheet = JSON.stringify(await probe.evaluate(() => REEL.cueSheet()));
  await probe.close();

  const HASH = async ([f, n]) => {
    REEL.renderFrame(f, n != null ? { samples: n } : {});
    const o = REEL.out, d = o.getContext('2d').getImageData(0, 0, o.width, o.height).data;
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', d));
    return Array.from(h, x => x.toString(16).padStart(2, '0')).join('');
  };
  const hashes = {}; let next = 0; const t0 = Date.now();
  await Promise.all(Array.from({ length: Math.min(workers, frames.length) }, async () => {
    const pg = await open(A.page);
    for (;;) {
      const f = frames[next++]; if (f === undefined) break;
      hashes[f] = await pg.evaluate(HASH, [f, samples]);
      if (Object.keys(hashes).length % 50 === 0) process.stdout.write(`  ${Object.keys(hashes).length}/${frames.length}  ${((Date.now() - t0) / 1000).toFixed(0)}s\n`);
    }
    await pg.close();
  }));

  if (mode === 'hash') {
    const out = { page: A.page, w: info.w, h: info.h, fps: info.fps, dur: info.dur, frames: hashes, cues: sheet };
    fs.mkdirSync(path.dirname(path.resolve(A.out)), { recursive: true });
    if (fs.existsSync(A.out) && A.range) {                      // merge a partial run into an existing baseline
      const old = JSON.parse(fs.readFileSync(A.out, 'utf8')); out.frames = Object.assign(old.frames, hashes); out.cues = old.cues;
    }
    fs.writeFileSync(A.out, JSON.stringify(out));
    console.log(`hashed ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${pageErrors} page errors -> ${A.out}`);
    await browser.close(); srv.close(); process.exit(pageErrors ? 1 : 0);
  }

  /* check */
  const base = JSON.parse(fs.readFileSync(A.baseline, 'utf8'));
  const bad = frames.filter(f => base.frames[f] !== hashes[f]);
  const cuesSame = base.cues === sheet;
  console.log(`frames checked: ${frames.length}   different: ${bad.length}   cue sheet: ${cuesSame ? 'identical' : 'DIFFERENT'}   page errors: ${pageErrors}`);
  if (bad.length) console.log('  differing frames:', bad.length > 60 ? bad.slice(0, 60).join(',') + ' ...' : bad.join(','));
  if (!cuesSame) {
    const x = JSON.parse(base.cues).cues, y = JSON.parse(sheet).cues;
    console.log(`  cues: baseline ${x.length}, now ${y.length}`);
    for (let i = 0; i < Math.max(x.length, y.length); i++) if (JSON.stringify(x[i]) !== JSON.stringify(y[i])) { console.log(`  first difference at cue #${i}:\n    baseline ${JSON.stringify(x[i])}\n    now      ${JSON.stringify(y[i])}`); break; }
  }
  if (bad.length && A.dump) {
    fs.mkdirSync(A.dump, { recursive: true });
    const PNG = async ([f, n]) => { REEL.renderFrame(f, n != null ? { samples: n } : {}); return REEL.out.toDataURL('image/png'); };
    const pg = await open(A.page), rf = A['ref-page'] ? await open(A['ref-page']) : null;
    for (const f of bad.slice(0, +(A.limit || 12))) {
      const nm = String(f).padStart(4, '0');
      fs.writeFileSync(path.join(A.dump, `new_${nm}.png`), Buffer.from((await pg.evaluate(PNG, [f, samples])).split(',')[1], 'base64'));
      if (rf) fs.writeFileSync(path.join(A.dump, `ref_${nm}.png`), Buffer.from((await rf.evaluate(PNG, [f, samples])).split(',')[1], 'base64'));
    }
    console.log(`  wrote ${Math.min(bad.length, +(A.limit || 12))} differing frame(s) to ${A.dump}`);
  }
  await browser.close(); srv.close();
  process.exit(bad.length || !cuesSame || pageErrors ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
