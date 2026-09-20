// Deterministic MP4 export for any reel built on the /reel skill driver (three URL modes, ?capture=1).
//
// Why not just record the screen: a recording depends on how fast the PC is that second, and Playwright's own
// recordVideo is a low-bitrate VP8 stream. This renders the reel FRAME BY FRAME instead:
//   1. Playwright's fake clock is installed and paused BEFORE the page loads, so every setTimeout, rAF and
//      performance.now() in the page waits for us. play() schedules its scene timers on that frozen clock.
//   2. For each frame we run the clock forward exactly 1/fps seconds (timers and rAF fire on time), then
//      seek every CSS transition, CSS animation and Web Animation to the same instant (document.getAnimations()),
//      because those run on the browser's own timeline, which the fake clock does not control.
//   3. One JPEG screenshot per frame, then ffmpeg (H.264, BT.709, yuv420p, faststart, no audio).
//
// usage:
//   node render_mp4.js <reel.html> <out.mp4> [--fps 30] [--seconds 30] [--lead 150] [--crf 18]
//        [--from 0] [--to N] [--every 1]      (--every 90 = a quick test: shoots one frame in 90, no video)
//        [--frames <dir>] [--keep]            (default frames dir: <out>.frames, deleted after encoding unless --keep)
//
// needs: `npm i playwright-core` somewhere on NODE_PATH, Microsoft Edge (or Chrome), and ffmpeg
//        (PATH, $FFMPEG, or `python -m pip install --user imageio-ffmpeg`).
// --lead is the ms the reel waits before its first scene (reel-6/7 drivers: 150). --seconds is the sum of data-dur.
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright-core')); } catch (e) {
  console.error('playwright-core not found. Run `npm i playwright-core` in a temp folder and set NODE_PATH to its node_modules.'); process.exit(2);
}

const argv = process.argv.slice(2);
const opt = (name, def) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : def; };
const flag = name => argv.includes(name);
const [file, out] = argv.filter(a => !a.startsWith('--') && !/^\d+(\.\d+)?$/.test(a));
if (!file || !out) { console.error('usage: node render_mp4.js <reel.html> <out.mp4> [options]'); process.exit(2); }
const FPS = +opt('--fps', 30), SECONDS = +opt('--seconds', 30), LEAD = +opt('--lead', 150), CRF = +opt('--crf', 18);
const TOTAL = Math.round(FPS * SECONDS);
const FROM = +opt('--from', 0), TO = +opt('--to', TOTAL - 1), EVERY = +opt('--every', 1);
const framesDir = opt('--frames', out.replace(/\.mp4$/i, '') + '.frames');
fs.mkdirSync(framesDir, { recursive: true });
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  let r = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.split(/\r?\n/)[0].trim();
  r = spawnSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  throw new Error('No ffmpeg found. Run: python -m pip install --user imageio-ffmpeg');
}

// Runs in the page: put every animation on the virtual clock. An animation is paused the first time we see it and
// counted from that virtual instant (it was created by a timer or class change that fired inside the last step).
const SEEK = `(() => {
  const start = new WeakMap();
  window.__seek = V => {
    for (const a of document.getAnimations()) {
      if (!start.has(a)) { start.set(a, V); a.pause(); }
      a.currentTime = Math.max(0, V - start.get(a));
    }
  };
})()`;

(async () => {
  const t00 = Date.now();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.clock.install({ time: 0 });
  await page.clock.pauseAt(1000);                      // frozen: nothing in the page moves until we say so
  await page.goto(pathToFileURL(path.resolve(file)).href + '?capture=1', { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);                     // real time: fonts ready, play() has scheduled its timers
  await page.evaluate(SEEK);
  await page.evaluate(() => window.__seek(0));
  let V = 0, shot = 0;
  for (let k = 0; k <= TO; k++) {
    const target = LEAD + Math.round(k * 1000 / FPS);  // ms since play(); scene 0 starts at LEAD
    if (target > V) await page.clock.runFor(target - V);
    V = target;
    await page.evaluate(v => window.__seek(v), V);
    if (k >= FROM && (k - FROM) % EVERY === 0) {
      await page.screenshot({ path: path.join(framesDir, 'f_' + String(k).padStart(4, '0') + '.jpg'), type: 'jpeg', quality: 95 });
      shot++;
    }
    if (k % 60 === 0) console.log('frame', k + '/' + TOTAL, ((Date.now() - t00) / 1000).toFixed(0) + 's');
  }
  await browser.close();
  console.log('shot', shot, 'frames in', ((Date.now() - t00) / 1000).toFixed(0) + 's;', errs.length ? errs : 'no page errors');
  if (EVERY !== 1 || FROM !== 0 || TO !== TOTAL - 1) { console.log('partial run: frames in', framesDir, '(no video)'); return; }

  const ff = findFfmpeg();
  const args = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, 'f_%04d.jpg'),
    '-vf', 'scale=in_range=full:in_color_matrix=bt601:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-profile:v', 'high', '-level', '4.2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-movflags', '+faststart', '-an', path.resolve(out)];
  const r = spawnSync(ff, args, { stdio: 'inherit' });
  if (r.status !== 0) { console.error('ffmpeg failed'); process.exit(1); }
  console.log('wrote', out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB');
  if (!flag('--keep')) fs.rmSync(framesDir, { recursive: true, force: true });
})().catch(e => { console.error('FAILED', e); process.exit(1); });
