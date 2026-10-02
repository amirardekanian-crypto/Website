// Capture a real page (his site, an app screen, a client's site) at phone size as tall tiles, for a phone mock-up in a reel.
// The page is shot in its FINAL, fully revealed state (reduced motion makes the page render every scroll-reveal already done),
// lazy images are forced to load, and position:fixed things (a nav that sticks, a bottom bar) can be shot separately as overlays.
//
// usage: node capture_tiles.js <url> <outDir> <name> [options]
//   --width 390 --height 844      phone viewport in css px            --dpr 1.5   pixel density (1.5 is plenty for a 430-px phone on a 1080 canvas)
//   --tile 4900                   css px per tile (keep tile height x dpr under ~16000 px)      --max 20000   stop after this many css px
//   --reduced-motion              render scroll-reveals in their final state (almost always wanted)
//   --hide ".a,.b"                selectors to hide (a live canvas, a draft badge, a cookie bar)
//   --storage '{"k":"v"}'         localStorage to set BEFORE the page loads (the course demo needs {"tps.prefs":"{\"age\":\"adult\"}"})
//   --mark "#about,#record"       also record where these selectors start (css px) in meta, to choreograph the scroll
//   --el "#nav@120=nav"           shoot an element after scrolling to y=120; becomes <name>-nav.png  (repeatable: --el "#bar@800=bar")
//   --css "<css>"                 inject CSS before shooting (his pages hide below-the-fold content until it scrolls in:  --css ".reveal{opacity:1!important;transform:none!important}")
//   --no-scroll-pass              skip the automatic scroll through the whole page (it triggers IntersectionObserver reveals and lazy loading)
//   --wait 1200                   ms after load before shooting
// writes <outDir>/<name>-tile0.png ... and <name>-meta.json  {total, tiles, TH, dpr, width, marks}
// After it: convert to WebP (Pillow, quality 90) and put the tiles in a stack inside the phone; the reel-9 template shows how.
const { chromium } = require('./_pw');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opts = {}, multi = { el: [] };
const pos = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    if (['reduced-motion', 'no-scroll-pass'].includes(k)) opts[k] = true;
    else if (k === 'el') multi.el.push(argv[++i]);
    else opts[k] = argv[++i];
  } else pos.push(a);
}
const [url, outDir, name] = pos;
if (!url || !outDir || !name) { console.error('usage: node capture_tiles.js <url> <outDir> <name> [options]  (see the header of this file)'); process.exit(2); }
const W = +(opts.width || 390), H = +(opts.height || 844), DPR = +(opts.dpr || 1.5), TH = +(opts.tile || 4900), MAX = +(opts.max || 20000), WAIT = +(opts.wait || 1200);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: DPR, locale: 'fa-IR', reducedMotion: opts['reduced-motion'] ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  if (opts.storage) {
    const kv = JSON.parse(opts.storage);
    await page.addInitScript(o => { for (const k in o) try { localStorage.setItem(k, o[k]); } catch (e) { } }, kv);
  }
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(WAIT);
  await page.evaluate(async hide => {
    document.querySelectorAll('img').forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(i => (i.complete && i.naturalWidth) ? 0 : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); setTimeout(r, 6000); })));
    await Promise.all([...document.images].map(i => i.decode ? i.decode().catch(() => { }) : 0));
    const v = document.querySelector('video');
    if (v) { v.pause(); v.currentTime = 2.0; await new Promise(r => { v.addEventListener('seeked', r, { once: true }); setTimeout(r, 1500); }); }
    if (hide) document.querySelectorAll(hide).forEach(e => { e.style.visibility = 'hidden'; });
  }, opts.hide || '');
  if (opts.css) await page.addStyleTag({ content: opts.css });
  if (!opts['no-scroll-pass']) {                                   // walk down the page once so every scroll-triggered reveal and lazy image has fired
    await page.evaluate(async () => {
      const h = () => document.documentElement.scrollHeight;
      for (let y = 0; y < h(); y += 380) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(900);
  }
  await page.waitForTimeout(500);

  const total = Math.min(MAX, await page.evaluate(() => document.documentElement.scrollHeight));
  const tiles = Math.ceil(total / TH);
  for (let i = 0; i < tiles; i++) {
    await page.screenshot({ path: path.join(outDir, `${name}-tile${i}.png`), fullPage: true, clip: { x: 0, y: i * TH, width: W, height: Math.min(TH, total - i * TH) } });
  }
  // overlays: things that are position:fixed on the real page (the strip shows them once, at the top)
  for (const spec of multi.el) {
    const m = /^(.+)@(\d+)=(.+)$/.exec(spec);
    if (!m) { console.error('bad --el', spec); continue; }
    const [, sel, y, nm] = m;
    await page.evaluate(s => { const e = document.querySelector(s); if (e) e.style.visibility = 'visible'; }, sel);
    await page.evaluate(yy => window.scrollTo(0, yy), +y);
    await page.waitForTimeout(900);
    const h = await page.$(sel);
    if (h) await h.screenshot({ path: path.join(outDir, `${name}-${nm}.png`), animations: 'disabled' }); else console.error('element not found:', sel);
  }
  const marks = {};
  if (opts.mark) marks.tops = await page.evaluate(sels => Object.fromEntries(sels.split(',').map(s => { const e = document.querySelector(s.trim()); return [s.trim(), e ? Math.round(e.getBoundingClientRect().top + scrollY) : null]; })), opts.mark);
  const meta = { url, total, tiles, TH, dpr: DPR, width: W, height: H, marks: marks.tops || {} };
  fs.writeFileSync(path.join(outDir, `${name}-meta.json`), JSON.stringify(meta, null, 1));
  console.log(JSON.stringify(meta));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
