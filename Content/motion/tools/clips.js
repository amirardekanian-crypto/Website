#!/usr/bin/env node
/* clips.js — renders the Motion Menu's sample clips through the REAL reel engine.
 *
 * Every visual item in catalog.json carries a `clip` spec: which seconds of the reel show it, where to crop,
 * how slow to play it, and whether to show it split-screen with the effect off and on. This tool drives the same
 * reel.html page the video is made from, so a sample can never drift from what a video would use.
 *
 *   node Content/motion/tools/clips.js                         every clip that is new or changed
 *   node Content/motion/tools/clips.js --only full-stop,slab   just these ids
 *   node Content/motion/tools/clips.js --group scenes,type     just these groups
 *   node Content/motion/tools/clips.js --force                 re-render even if unchanged
 *   node Content/motion/tools/clips.js --force --encode-only   re-encode from the frames already on disk (--tmp), no rendering
 *   node Content/motion/tools/clips.js --list                  print what would render
 *   node Content/motion/tools/clips.js --catalog try.json --out DIR --tmp DIR   try specs out in a scratch folder
 *
 * clip spec (all optional except t0):
 *   t0, t1      reel seconds (t1 omitted = a still frame, poster only)
 *   speed       1 = real time, 0.25 = four times slower (motion blur shrinks with it)
 *   crop        [centreX, centreY, width] in the 1920x1080 frame (height follows, 16:9); default the whole frame
 *   hold        seconds to freeze on the last frame before the loop restarts (default 0.35)
 *   fx          post overrides {bloom, ca, grain, vig, flash}
 *   noCamera / noHud / samples
 *   compare     {left:{...opts}, right:{...opts}, labels:["OFF","ON"]}: split-screen of the same frame
 *   poster      0..1, which moment becomes the still (default 0.85)
 *   crf         x264 quality for this clip (default 25; use 12-14 where fine grain must survive, as in Film)
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const CONTENT = path.resolve(__dirname, '..', '..');                 // .../Content
const MOTION = path.resolve(__dirname, '..');                        // .../Content/motion
const A = {};
for (let i = 2; i < process.argv.length; i++) { const a = process.argv[i]; if (a.startsWith('--')) { const k = a.slice(2), v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) A[k] = true; else { A[k] = v; i++; } } }

const FPS = 30, OUT_W = +(A.w || 640), OUT_H = Math.round(OUT_W * 9 / 16);
const outDir = path.resolve(A.out || path.join(MOTION, 'menu'));
const tmpDir = path.resolve(A.tmp || path.join(os.tmpdir(), 'motion-clips'));
const workers = +(A.workers || 4);
const CRF = +(A.crf || 25);
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png', '.css': 'text/css' };

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  return execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
}
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
const hashOf = o => crypto.createHash('sha1').update(JSON.stringify(o)).digest('hex').slice(0, 12);

/* ── what to render ── */
const catalog = JSON.parse(fs.readFileSync(A.catalog ? path.resolve(A.catalog) : path.join(MOTION, 'catalog.json'), 'utf8'));   // --catalog: try a spec out without touching the real one
const manifestPath = path.join(outDir, 'clips.manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};
const only = A.only ? new Set(String(A.only).split(',')) : null, groups = A.group ? new Set(String(A.group).split(',')) : null;
const todo = [];
for (const it of catalog.items) {
  if (!it.clip) continue;
  if (only && !only.has(it.id)) continue;
  if (groups && !groups.has(it.group)) continue;
  const spec = Object.assign({ speed: 1, hold: .35, crop: [960, 540, 1920], poster: .85 }, it.clip);
  const h = hashOf([spec, OUT_W, CRF]);
  const still = spec.t1 == null;
  const outFile = path.join(outDir, still ? 'posters' : 'clips', it.id + (still ? '.jpg' : '.mp4'));
  if (!A.force && manifest[it.id] && manifest[it.id].hash === h && fs.existsSync(outFile)) continue;
  const step = spec.speed / FPS, n = still ? 1 : Math.floor((spec.t1 - spec.t0) / step + 1e-9) + 1;
  todo.push({ id: it.id, spec, hash: h, still, n, step });
}
if (A.list) { for (const c of todo) console.log(`${c.id.padEnd(18)} ${c.still ? 'still' : c.n + ' frames'}  ${JSON.stringify(c.spec.crop)}`); console.log(todo.length + ' clips'); process.exit(0); }
if (!todo.length) { console.log('nothing to render (use --force to redo)'); process.exit(0); }

(async () => {
  const srv = await serve(), port = srv.address().port, url = `http://127.0.0.1:${port}/showreel/reel.html?render=1`;
  const exe = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
  const browser = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--font-render-hinting=none'] });
  let errors = 0;
  for (const d of ['clips', 'posters']) fs.mkdirSync(path.join(outDir, d), { recursive: true });
  fs.mkdirSync(tmpDir, { recursive: true });

  const jobs = [];
  for (const c of todo) {
    const d = path.join(tmpDir, c.id);
    fs.mkdirSync(d, { recursive: true });
    if (!A['encode-only']) {
      for (const f of fs.readdirSync(d)) if (/^f_\d+\.png$/.test(f)) fs.unlinkSync(path.join(d, f));   // never inherit frames from an older, longer window
      for (let k = 0; k < c.n; k++) jobs.push({ c, k });
    }
  }
  let next = 0, done = 0; const t0 = Date.now();

  /* runs inside the page: render one engine frame (or two, for a split-screen), crop it, scale it, return a PNG */
  const grab = (a) => {
    const { f, crop, outW, outH, variants, labels } = a;
    let w = Math.min(1920, crop[2]), h = Math.round(w * 9 / 16);
    const x = Math.max(0, Math.min(1920 - w, Math.round(crop[0] - w / 2))), y = Math.max(0, Math.min(1080 - h, Math.round(crop[1] - h / 2)));
    const c = document.createElement('canvas'); c.width = outW; c.height = outH;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    const paint = (opts, dx, dw) => {
      REEL.renderFrame(f, opts);
      g.save(); g.beginPath(); g.rect(dx, 0, dw, outH); g.clip(); g.drawImage(REEL.out, x, y, w, h, 0, 0, outW, outH); g.restore();
    };
    if (variants.length === 1) paint(variants[0], 0, outW);
    else {
      paint(variants[0], 0, outW / 2); paint(variants[1], outW / 2, outW / 2);
      g.fillStyle = 'rgba(255,255,255,.92)'; g.fillRect(outW / 2 - 1, 0, 2, outH);
      const fs_ = Math.round(outW / 46); g.font = `700 ${fs_}px "JetBrains Mono"`; g.textBaseline = 'alphabetic';
      (labels || ['', '']).forEach((s, i) => {
        if (!s) return; const tw = g.measureText(s).width + fs_ * 1.4, bx = i === 0 ? fs_ * .6 : outW - tw - fs_ * .6, by = outH - fs_ * 2.2;
        g.fillStyle = 'rgba(11,11,16,.78)'; g.beginPath(); g.roundRect(bx, by, tw, fs_ * 1.7, 4); g.fill();
        g.fillStyle = '#F2EEE5'; g.fillText(s, bx + fs_ * .7, by + fs_ * 1.2);
      });
    }
    return c.toDataURL('image/png');
  };

  async function worker(id) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`[w${id}] ${m.type()}: ${m.text()}`); });
    page.on('pageerror', e => { errors++; console.error(`[w${id}] PAGE ERROR: ${e.message}`); });
    await page.goto(url);
    await page.waitForFunction('window.REEL_READY === true', null, { timeout: 120000 });
    for (;;) {
      const j = jobs[next++]; if (!j) break;
      const { c, k } = j, s = c.spec, t = s.t0 + k * c.step;
      const base = { samples: s.samples, shutter: .6 * s.speed, fx: s.fx, noCamera: s.noCamera, noHud: s.noHud };
      const variants = s.compare ? [Object.assign({}, base, s.compare.left), Object.assign({}, base, s.compare.right)] : [base];
      const data = await page.evaluate(grab, { f: t * FPS, crop: s.crop, outW: OUT_W, outH: OUT_H, variants, labels: s.compare && s.compare.labels });
      fs.writeFileSync(path.join(tmpDir, c.id, `f_${String(k).padStart(4, '0')}.png`), Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
      done++;
      if (done % 50 === 0 || done === jobs.length) { const el = (Date.now() - t0) / 1000; console.log(`frames ${done}/${jobs.length}  ${el.toFixed(0)}s  (~${(el / done * (jobs.length - done)).toFixed(0)}s left)`); }
    }
  }
  if (jobs.length) await Promise.all(Array.from({ length: Math.min(workers, jobs.length) }, (_, i) => worker(i)));
  await browser.close(); srv.close();
  if (errors) { console.error(errors + ' page errors, not encoding'); process.exit(1); }

  /* ── encode ── */
  const ff = ffmpegPath();
  const run = (args) => new Promise((res, rej) => { const p = spawn(ff, args, { stdio: ['ignore', 'ignore', 'pipe'] }); let err = ''; p.stderr.on('data', d => err += d); p.on('close', code => code ? rej(new Error(err.slice(-600))) : res()); });
  let ei = 0;
  async function encoder() {
    for (;;) {
      const c = todo[ei++]; if (!c) break;
      const dir = path.join(tmpDir, c.id), last = path.join(dir, `f_${String(c.n - 1).padStart(4, '0')}.png`);
      for (const f of fs.readdirSync(dir)) { const m = /^f_(\d+)\.png$/.exec(f); if (m && +m[1] >= c.n) fs.unlinkSync(path.join(dir, f)); }   // the encoder reads a numbered run: nothing past frame n may be there
      const pickK = Math.max(0, Math.min(c.n - 1, Math.round((c.n - 1) * c.spec.poster)));
      const pick = path.join(dir, `f_${String(pickK).padStart(4, '0')}.png`);
      await run(['-y', '-hide_banner', '-loglevel', 'error', '-i', pick, '-q:v', '4', path.join(outDir, 'posters', c.id + '.jpg')]);
      let bytes = fs.statSync(path.join(outDir, 'posters', c.id + '.jpg')).size, dur = 0;
      if (!c.still) {
        const hold = c.spec.hold;
        await run(['-y', '-hide_banner', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f_%04d.png'),
          '-vf', `tpad=stop_mode=clone:stop_duration=${hold},scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+bicubic,format=yuv420p`,
          '-c:v', 'libx264', '-preset', 'slow', '-crf', String(c.spec.crf || CRF), '-profile:v', 'main', '-level', '3.1', '-g', '60', '-an',
          '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-movflags', '+faststart',
          path.join(outDir, 'clips', c.id + '.mp4')]);
        bytes = fs.statSync(path.join(outDir, 'clips', c.id + '.mp4')).size; dur = +(c.n / FPS + hold).toFixed(2);
      }
      manifest[c.id] = { hash: c.hash, frames: c.n, dur, bytes };
      void last;
    }
  }
  await Promise.all([encoder(), encoder(), encoder()]);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
  const total = todo.reduce((s, c) => s + manifest[c.id].bytes, 0);
  console.log(`done: ${todo.length} clips, ${(total / 1e6).toFixed(1)} MB, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})().catch(e => { console.error(e); process.exit(1); });
