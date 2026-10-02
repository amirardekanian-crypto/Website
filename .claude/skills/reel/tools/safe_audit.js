// Safe-zone audit for a timeline reel: at many instants, find every visible piece of TEXT and check it against what Instagram covers.
//
// Amir's phone, measured 2026-10-01 (.claude/skills/cut/RESEARCH-2026-10-01.md 2.3): nothing is covered from y 195 to 1165;
// the right-hand button rail covers x 920-993, y 1171-1770; the profile row covers everything below y ~1587.
// Farsi lines START at the right, so the rail matters more than it does for Latin text.
// We hold to a stricter box: text between y 250 and 1580, x 60 to 1020, and nothing in the rail.
//
// usage: node safe_audit.js <reel.html> [step=0.2] [--sel "css,css"] [--min 2]
//   default: every leaf element inside #stage that holds text (measured by the text itself, not its full-width block)
//   --sel    only these selectors      --min  samples a finding must last to count (default 2; single samples are a word mid-transition)
// Exit code 1 when something real is found, so it can gate a render.
const { chromium } = require('./_pw');
const { pathToFileURL } = require('url');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !(argv[i - 1] || '').startsWith('--'));
const file = pos[0], STEP = +(pos[1] || .2), SEL = opt('--sel', ''), MIN = +opt('--min', 2);
if (!file) { console.error('usage: node safe_audit.js <reel.html> [step] [--sel css] [--min 2]'); process.exit(2); }
const BOX = { top: 250, bottom: 1580, left: 60, right: 1020 }, RAIL = { x0: 915, x1: 1000, y0: 1165, y1: 1775 };

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await page.goto(pathToFileURL(path.resolve(file)).href + '?capture=1', { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  const DUR = await page.evaluate(() => window.__DUR);
  const found = {};
  for (let t = 0; t <= DUR + 1e-6; t += STEP) {
    await page.evaluate(tt => window.__render(tt), t);
    const res = await page.evaluate(({ SEL, BOX, RAIL }) => {
      const out = [];
      const els = SEL ? [...document.querySelectorAll(SEL)]
        : [...document.querySelectorAll('#stage *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      els.forEach((el, idx) => {
        let op = 1, e = el, hidden = false;
        while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; } op *= parseFloat(cs.opacity); e = e.parentElement; }
        if (hidden || op < .55) return;
        // a word still rising through its mask is not "there" yet
        const m = /translateY\(([-\d.]+)%\)/.exec(el.style.transform || '');
        if (m && Math.abs(parseFloat(m[1])) > 6) return;
        // measure the text itself
        const rg = document.createRange(); let r = null;
        const nodes = SEL ? [el] : [...el.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
        nodes.forEach(n => { rg.selectNodeContents(n); const b = rg.getBoundingClientRect(); if (b.width > 1) r = r ? { left: Math.min(r.left, b.left), right: Math.max(r.right, b.right), top: Math.min(r.top, b.top), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, right: b.right, top: b.top, bottom: b.bottom }; });
        if (!r) return;
        r.width = r.right - r.left; r.height = r.bottom - r.top;
        if (r.width < 2 || r.height < 2) return;
        // a font's content area is taller than its ink (Lalezar: 1.6 em vs 0.75 em): shrink the box to ~0.8 em of ink, centred
        const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
        if (fs && r.height > fs * 1.15) { const mid = (r.top + r.bottom) / 2, ink = fs * .8; r.top = mid - ink / 2; r.bottom = mid + ink / 2; r.height = ink; }
        if (r.right < 0 || r.left > 1080 || r.bottom < 0 || r.top > 1920) return;
        // text that an overflow:hidden ancestor clips away (a rolling label's other items, a digit reel, a phone screen) is not on screen
        let clipped = false;
        for (let a = el.parentElement; a && a.id !== 'stage'; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflow === 'hidden' || cs.overflow === 'clip') {
            const b = a.getBoundingClientRect(), ix = Math.max(0, Math.min(r.right, b.right) - Math.max(r.left, b.left)), iy = Math.max(0, Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top));
            if (ix * iy < .5 * r.width * r.height) { clipped = true; break; }
          }
        }
        if (clipped) return;
        const v = [];
        if (r.top < BOX.top) v.push('above y' + BOX.top + ' (top ' + Math.round(r.top) + ')');
        if (r.bottom > BOX.bottom) v.push('below y' + BOX.bottom + ' (bottom ' + Math.round(r.bottom) + ')');
        if (r.left < BOX.left) v.push('left of x' + BOX.left + ' (' + Math.round(r.left) + ')');
        if (r.right > BOX.right) v.push('right of x' + BOX.right + ' (' + Math.round(r.right) + ')');
        if (r.right > RAIL.x0 && r.left < RAIL.x1 && r.bottom > RAIL.y0 && r.top < RAIL.y1) v.push('in the button rail');
        if (v.length) out.push({ sel: (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '')) + '[' + idx + ']', txt: (el.textContent || '').trim().slice(0, 24), v, r: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] });
      });
      return out;
    }, { SEL, BOX, RAIL });
    for (const x of res) { const k = x.sel + ' | ' + x.v.join('; '); (found[k] = found[k] || { txt: x.txt, r: x.r, times: [] }).times.push(+t.toFixed(2)); }
  }
  const all = Object.keys(found), keys = all.filter(k => found[k].times.length >= MIN), transient = all.length - keys.length;
  if (transient) console.log('(' + transient + ' short finding(s) ignored: text moving through a transition)');
  if (!keys.length) console.log('SAFE-ZONE AUDIT: every visible text sits inside the safe box at all', Math.round(DUR / STEP) + 1, 'sampled instants.');
  else { console.log('SAFE-ZONE AUDIT: ' + keys.length + ' finding(s)'); keys.forEach(k => { const f = found[k]; console.log(' -', k, '| "' + f.txt + '" rect', f.r.join(','), '| t =', f.times[0] + (f.times.length > 1 ? '..' + f.times[f.times.length - 1] : '') + ' (' + f.times.length + ' samples)'); }); }
  await browser.close();
  process.exit(keys.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
