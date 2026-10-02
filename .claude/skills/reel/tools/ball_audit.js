// Hero-over-text audit for a timeline reel: does the ball (the hero object) cover a word while that word is being read?
// (Reel 9 v2, 2026-10-02: the frame check found the ball dribbling for 1.8 s straight across "سال تنیس", and its lobs crossing the phone title. This is the check
//  that would have caught it before a 7-minute render. It is the twin of read_audit.js: that one asks "is the text on screen long enough?", this one asks "is the ball in the way?")
//
// At every sample it asks the page for the ball (ballState(t): x, y, radius), finds every text element that is fully visible (opacity >= 0.9, not still rising through
// its mask, font >= --min-font), measures its ink (a font's content box is taller than its ink, so the box is shrunk to ~0.8 em) and checks whether the ball's circle
// (radius - margin) hides at least --cover of it. A run is a stretch of consecutive samples in which the same block is covered.
//
// usage: node ball_audit.js <reel.html> [step=0.05] [--min-font 54] [--margin 8] [--cover 0.12] [--max-run 0.3] [--all]
//   --margin   px the ball may graze a word before it counts (default 8)
//   --cover    the share of a word's ink box the ball must hide before it counts (default 0.12: grazing the foot of a big digit does not)
//   --max-run  longest cover, in seconds, a word may take (default 0.3: a ball dropping through a line is fine, a ball sitting on it is not)
//   --all      also list the short crossings that pass
// Exit code 1 when a run is longer than --max-run, so it can gate a render.
const { chromium } = require('./_pw');
const { pathToFileURL } = require('url');
const path = require('path');

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--min-font', '--margin', '--max-run', '--cover'];
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const file = positional[0], STEP = +(positional[1] || .05);
const MINF = +opt('--min-font', 54), MARGIN = +opt('--margin', 8), COVER = +opt('--cover', .12), MAXRUN = +opt('--max-run', .3), ALL = argv.includes('--all');
if (!file) { console.error('usage: node ball_audit.js <reel.html> [step] [--min-font 54] [--margin 8] [--cover 0.12] [--max-run 0.3] [--all]'); process.exit(2); }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await page.goto(pathToFileURL(path.resolve(file)).href + '?capture=1', { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  const DUR = await page.evaluate(() => window.__DUR);
  if (!(await page.evaluate(() => typeof ballState === 'function'))) { console.log('BALL AUDIT: this reel has no ballState(); nothing to check.'); await browser.close(); process.exit(0); }
  const blocks = {};                                           // key -> { label, txt, hits: [t...] }
  for (let t = 0; t <= DUR + 1e-6; t += STEP) {
    await page.evaluate(tt => window.__render(tt), t);
    const res = await page.evaluate(({ t, MINF, MARGIN, COVER }) => {
      // how much of a word's ink box the ball hides (0..1): the circle sampled on a 3 px grid inside the box
      const hiddenShare = (ball, l, t, rr, b) => {
        const R = Math.max(0, ball.r - MARGIN); if (R <= 0) return 0;
        const x0 = Math.max(l, ball.x - R), x1 = Math.min(rr, ball.x + R), y0 = Math.max(t, ball.y - R), y1 = Math.min(b, ball.y + R);
        if (x1 <= x0 || y1 <= y0) return 0;
        let n = 0; const st = 3;
        for (let x = x0 + st / 2; x < x1; x += st) for (let y = y0 + st / 2; y < y1; y += st) { const dx = x - ball.x, dy = y - ball.y; if (dx * dx + dy * dy < R * R) n++; }
        return n * st * st / Math.max(1, (rr - l) * (b - t));
      };
      const b = ballState(t); if (!b) return [];
      // a leg can fade the ball out (a smash toward the camera): the page does not draw it below 1% alpha, so it covers nothing
      if (b.L && b.L.alpha) { const f = Math.min(1, Math.max(0, (t - b.L.t0) / b.L.T)); if (b.L.alpha[0] + (b.L.alpha[1] - b.L.alpha[0]) * f <= .01) return []; }
      const leaves = [...document.querySelectorAll('#stage *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const isBlock = e => { const d = getComputedStyle(e).display; return d === 'block' || d === 'flex' || d === 'grid' || d === 'list-item'; };
      const out = [];
      window.__baN = window.__baN || 0;
      leaves.forEach(el => {
        const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
        if (fs < MINF) return;
        let op = 1, e = el, hidden = false;
        while (e && e !== document.body) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; } op *= parseFloat(cs.opacity); e = e.parentElement; }
        if (hidden || op < .9) return;
        const m = /translateY\(([-\d.]+)%\)/.exec(el.style.transform || '');
        if (m && Math.abs(parseFloat(m[1])) > 6) return;
        const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) return;
        let top = r.top, bottom = r.bottom;
        if (r.height > fs * 1.15) { const mid = (top + bottom) / 2; top = mid - fs * .4; bottom = mid + fs * .4; }   // ink, not the content box
        // text that an overflow:hidden ancestor clips away is not on screen
        let clipped = false;
        for (let a = el.parentElement; a && a.id !== 'stage'; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if ((cs.overflow === 'hidden' || cs.overflow === 'clip') && a.id !== 'cam') {
            const ab = a.getBoundingClientRect(), ix = Math.max(0, Math.min(r.right, ab.right) - Math.max(r.left, ab.left)), iy = Math.max(0, Math.min(bottom, ab.bottom) - Math.max(top, ab.top));
            if (ix * iy < .5 * r.width * (bottom - top)) { clipped = true; break; }
          }
        }
        if (clipped) return;
        if (hiddenShare(b, r.left, top, r.right, bottom) < COVER) return;
        let g = el; while (g.parentElement && g.parentElement.id !== 'stage' && !(isBlock(g) && !g.classList.contains('wm') && !g.classList.contains('wi') && !g.classList.contains('hl'))) g = g.parentElement;
        if (!g._baId) g._baId = ++window.__baN;
        out.push({ key: 'b' + g._baId, label: g.id ? '#' + g.id : g.tagName.toLowerCase() + '.' + String(g.className).trim().split(/\s+/)[0], txt: (g.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 26), word: (el.textContent || '').trim().slice(0, 14) });
      });
      return out;
    }, { t, MINF, MARGIN, COVER });
    const seen = new Set();
    for (const r of res) {
      if (seen.has(r.key)) continue; seen.add(r.key);
      const b = blocks[r.key] = blocks[r.key] || { label: r.label, txt: r.txt, hits: [] };
      b.hits.push(+t.toFixed(3));
    }
  }
  const rows = [];
  for (const k in blocks) {
    const b = blocks[k]; const runs = []; let s = null, p = null;
    for (const h of b.hits) { if (s !== null && h - p < STEP * 1.5) { p = h; } else { if (s !== null) runs.push([s, p]); s = p = h; } }
    if (s !== null) runs.push([s, p]);
    const lens = runs.map(([a, c]) => c - a + STEP), longest = Math.max(...lens), total = lens.reduce((x, y) => x + y, 0);
    rows.push({ label: b.label, txt: b.txt, runs: runs.length, longest: +longest.toFixed(2), total: +total.toFixed(2), first: runs[0][0], at: runs[lens.indexOf(longest)][0] });
  }
  rows.sort((a, b) => b.longest - a.longest);
  const bad = rows.filter(r => r.longest > MAXRUN + 1e-6);
  console.log(`BALL-OVER-TEXT AUDIT (step ${STEP} s; covered = ${Math.round(COVER * 100)}% of a word hidden; a cover longer than ${MAXRUN} s fails; text >= ${MINF}px)`);
  console.log('  block                 covered  longest  from     text');
  (ALL ? rows : bad).forEach(r => console.log(`  ${(r.label + ' ').padEnd(22)}${(r.total + ' s').padEnd(9)}${(r.longest + ' s').padEnd(9)}${(r.at + ' s').padEnd(9)}${r.txt}${r.longest > MAXRUN + 1e-6 ? '   BALL IN THE WAY' : ''}`));
  console.log(`SUMMARY: ${rows.length} text block(s) ever crossed by the ball; ${bad.length} covered longer than ${MAXRUN} s.`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
