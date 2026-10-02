// Frame-accurate MP4 render for a page that is a pure function of time (window.__render(t)).
// No fake clock needed: for every output frame we call __render at SUB instants spread across a 180-degree shutter,
// grab each one, and let ffmpeg average them (tmix) = real temporal motion blur, exactly like a film camera. Then film grain, H.264.
//
// usage: node render_timeline.js <reel.html> <out.mp4> [--draft] [--fps 30] [--sub 20] [--shutter 0.5] [--crf 18] [--scale 1]
//                                [--from 0] [--to <dur>] [--grain 4] [--audio file.wav] [--preset slow] [--query hook=b]
//   --draft  half size, 4 sub-frames, no grain: a minute-long look at the motion      --sub 1  no blur
//   House finals (reel 9): --sub 20 --crf 18 --grain 4 -> 13 MB for 17 s, 4 min to render. 5 sub-frames leave ghost copies on fast moves, 10 still layers a digit roll.
//   Run a final as a tracked background task (run_in_background on the node command itself): a '( ... ) &' inside one shell call is easy to lose track of.
// needs: playwright-core on NODE_PATH, Microsoft Edge, ffmpeg on PATH (or $FFMPEG).
const { chromium } = require('./_pw');
const { spawn, spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const BOOL_FLAGS = ['--draft'];                      // flags without a value, so the argument after them is still a file name
const pos = argv.filter((a, i) => !a.startsWith('--') && !((argv[i - 1] || '').startsWith('--') && !BOOL_FLAGS.includes(argv[i - 1])));
const [file, out] = pos;
if (!file || !out) { console.error('usage: node render_timeline.js <reel.html> <out.mp4> [options]'); process.exit(2); }
const DRAFT = argv.includes('--draft');              // a quick look: half size, 4 sub-frames, no grain (about 1 minute for 17 s)
const FPS = +opt('--fps', 30), SUB = +opt('--sub', DRAFT ? 4 : 20), SHUT = +opt('--shutter', .5), CRF = +opt('--crf', DRAFT ? 22 : 18), SCALE = +opt('--scale', DRAFT ? .5 : 1);
const GRAIN = +opt('--grain', DRAFT ? 0 : 4), PRESET = opt('--preset', DRAFT ? 'veryfast' : 'slow'), AUDIO = opt('--audio', ''), QUERY = opt('--query', '');
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });

function findFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  let r = spawnSync('where', ['ffmpeg'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.split(/\r?\n/)[0].trim();
  r = spawnSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'], { encoding: 'utf8' });
  if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  throw new Error('No ffmpeg found');
}

(async () => {
  const t00 = Date.now();
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  await page.goto(pathToFileURL(path.resolve(file)).href + '?capture=1' + (QUERY ? '&' + QUERY : ''), { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  const DUR = await page.evaluate(() => window.__DUR);
  const FROM = +opt('--from', 0), TO = +opt('--to', DUR);
  const f0 = Math.round(FROM * FPS), f1 = Math.round(TO * FPS);
  const cdp = await ctx.newCDPSession(page);

  const ff = findFfmpeg();
  const vf = [];
  // the exposure: average the SUB sub-frames of every output frame, keep one frame in SUB
  if (SUB > 1) vf.push(`tmix=frames=${SUB}`, `select=eq(mod(n\\,${SUB})\\,${SUB - 1})`, `setpts=N/(${FPS}*TB)`);
  if (SCALE !== 1) vf.push(`scale=${Math.round(1080 * SCALE)}:${Math.round(1920 * SCALE)}:flags=lanczos`);   // drafts (CDP shots ignore DPR < 1)
  if (GRAIN > 0) vf.push(`noise=alls=${GRAIN}:allf=t+u`);
  vf.push('scale=in_range=full:in_color_matrix=bt601:out_color_matrix=bt709:out_range=tv:flags=lanczos', 'format=yuv420p');
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS * SUB), '-c:v', 'mjpeg', '-i', '-'];
  if (AUDIO) args.push('-i', AUDIO);
  args.push('-vf', vf.join(','), '-r', String(FPS), '-c:v', 'libx264', '-preset', PRESET, '-crf', String(CRF), '-profile:v', 'high', '-level', '4.2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0', '-movflags', '+faststart');
  if (AUDIO) args.push('-c:a', 'aac', '-b:a', '192k', '-shortest'); else args.push('-an');
  args.push(path.resolve(out));
  const enc = spawn(ff, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  let encErr = null; enc.on('error', e => { encErr = e; });
  const done = new Promise(res => enc.on('close', c => res(c)));

  let n = 0;
  for (let f = f0; f < f1; f++) {
    const T = f / FPS;
    for (let k = 0; k < SUB; k++) {
      const t = SUB > 1 ? T + ((k + .5) / SUB - .5) * SHUT / FPS : T;
      await page.evaluate(tt => window.__render(tt), Math.min(Math.max(t, 0), DUR));
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 97, optimizeForSpeed: true });
      const buf = Buffer.from(data, 'base64');
      if (!enc.stdin.write(buf)) await new Promise(r => enc.stdin.once('drain', r));
      n++;
    }
    if ((f - f0) % 30 === 0) console.log('frame', f - f0, '/', f1 - f0, ((Date.now() - t00) / 1000).toFixed(0) + 's');
  }
  enc.stdin.end();
  const code = await done;
  await browser.close();
  if (code !== 0 || encErr) { console.error('ffmpeg failed', code, encErr); process.exit(1); }
  console.log('wrote', out, (fs.statSync(out).size / 1048576).toFixed(1) + ' MB;', n, 'captures in', ((Date.now() - t00) / 1000).toFixed(0) + 's;', errs.length ? errs : 'no page errors');
})().catch(e => { console.error('FAILED', e); process.exit(1); });
