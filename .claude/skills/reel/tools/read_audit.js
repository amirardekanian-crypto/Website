// Readability audit for a timeline reel: can a person actually READ each piece of text before it changes?
// (Reel 9, 2026-10-02: Amir said "the speed of the changes is too fast, there is no time to be able to read". This is the check that would have caught it.)
//
// For every text block (the words of a headline are grouped back into their line) it samples the reel and finds the LONGEST stretch in which the block is
// fully there: opacity >= 0.9, not still rising through its mask, >= 90% of it inside the frame and inside any clip, and its text not changing (a count-up
// only counts once it has stopped). Then it compares that with the time a viewer needs:
//        need = base + perWord x words     (default 0.8 s + 0.25 s per word, at most 2.4 s)
// Rule of thumb behind it: three big Farsi words want about 1.5 s, five want 2 s, a block of several lines 2.4 s. A hold that is shorter feels like a flash.
// THE HERO COUNTS TOO: when the reel has a ball (ballState(t)), a word the ball is covering is not readable, so the clean stretch is cut there
// (the line then says "ball: -x s"); ONE quick flash of the ball per hold is forgiven (it costs its time, it does not reset the hold); a second flash or a longer cover does. tools/ball_audit.js lists every crossing so you know what to move.
//
// usage: node read_audit.js <reel.html> [step=0.1] [--min-font 54] [--base 0.8] [--per-word 0.25] [--cap 2.4] [--sel "css"] [--all] [--no-ball] [--margin 8] [--cover 0.12]
//   --min-font  ignore text smaller than this (kickers, fine print): it is not what the viewer is meant to read at speed
//   --all       also list the blocks that pass
//   --no-ball   ignore the hero (text timing only)          --margin  px the ball may graze a word before it counts (default 8)
//   --cover     the share of a word's ink box the ball must hide before the word counts as covered (default 0.12)
// Exit code 1 when a block is more than 0.2 s short, so it can gate a render.
const { chromium } = require('./_pw');
const { pathToFileURL } = require('url');
const path = require('path');

const argv = process.argv.slice(2);
const VALUE_FLAGS = ['--min-font', '--base', '--per-word', '--cap', '--sel', '--margin', '--cover'];
const opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const positional = argv.filter((a, i) => !a.startsWith('--') && !VALUE_FLAGS.includes(argv[i - 1]));
const file = positional[0], STEP = +(positional[1] || .1);
const MINF = +opt('--min-font', 54), BASE = +opt('--base', .8), PERW = +opt('--per-word', .25), CAP = +opt('--cap', 2.4), SEL = opt('--sel', ''), ALL = argv.includes('--all'), USEBALL = !argv.includes('--no-ball'), MARGIN = +opt('--margin', 8), COVER = +opt('--cover', .12);
if (!file) { console.error('usage: node read_audit.js <reel.html> [step] [--min-font 54] [--base .8] [--per-word .25] [--cap 2.4] [--sel css] [--all]'); process.exit(2); }

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 1080, height: 1920 } })).newPage();
  await page.goto(pathToFileURL(path.resolve(file)).href + '?capture=1', { waitUntil: 'load' });
  await page.evaluate(() => window.__ready);
  const DUR = await page.evaluate(() => window.__DUR);
  const blocks = {};                                           // key -> { label, words, samples: [{t, ok, txt}] }
  for (let t = 0; t <= DUR + 1e-6; t += STEP) {
    await page.evaluate(tt => window.__render(tt), t);
    const res = await page.evaluate(({ SEL, MINF, USEBALL, MARGIN, COVER, t }) => {
      // how much of a word's ink box the ball hides (0..1): the circle sampled on a 3 px grid inside the box
      const hiddenShare = (ball, l, t, rr, b) => {
        const R = Math.max(0, ball.r - MARGIN); if (R <= 0) return 0;
        const x0 = Math.max(l, ball.x - R), x1 = Math.min(rr, ball.x + R), y0 = Math.max(t, ball.y - R), y1 = Math.min(b, ball.y + R);
        if (x1 <= x0 || y1 <= y0) return 0;
        let n = 0; const st = 3;
        for (let x = x0 + st / 2; x < x1; x += st) for (let y = y0 + st / 2; y < y1; y += st) { const dx = x - ball.x, dy = y - ball.y; if (dx * dx + dy * dy < R * R) n++; }
        return n * st * st / Math.max(1, (rr - l) * (b - t));
      };
      // the hero, if there is one and it is drawn (a leg can fade it out: the page does not draw it below 1% alpha)
      let ball = null;
      if (USEBALL && typeof ballState === 'function') {
        ball = ballState(t);
        if (ball && ball.L && ball.L.alpha) { const f = Math.min(1, Math.max(0, (t - ball.L.t0) / ball.L.T)); if (ball.L.alpha[0] + (ball.L.alpha[1] - ball.L.alpha[0]) * f <= .01) ball = null; }
      }
      const leaves = SEL ? [...document.querySelectorAll(SEL)] : [...document.querySelectorAll('#stage *')].filter(el => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
      const isBlock = e => { const d = getComputedStyle(e).display; return d === 'block' || d === 'flex' || d === 'grid' || d === 'list-item'; };
      const groups = new Map();
      leaves.forEach(el => {
        const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
        if (fs < MINF) return;
        let g = el; while (g.parentElement && g.parentElement.id !== 'stage' && !(isBlock(g) && !g.classList.contains('wm') && !g.classList.contains('wi') && !g.classList.contains('hl'))) g = g.parentElement;
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(el);
      });
      const out = [];
      groups.forEach((els, g) => {
        let ok = true;
        const stage = { l: 0, t: 0, r: 1080, b: 1920 };
        for (const el of els) {
          let op = 1, e = el, hidden = false, clip = null;
          while (e && e !== document.body) {
            const cs = getComputedStyle(e);
            if (cs.display === 'none' || cs.visibility === 'hidden') { hidden = true; break; }
            op *= parseFloat(cs.opacity);
            const addClip = c => { clip = clip ? { l: Math.max(clip.l, c.l), t: Math.max(clip.t, c.t), r: Math.min(clip.r, c.r), b: Math.min(clip.b, c.b) } : c; };
            const m = /inset\(([-\d.]+)(?:px)?\s+([-\d.]+)(?:px)?\s+([-\d.]+)(?:px)?\s+([-\d.]+)(?:px)?\)/.exec(e.style.clipPath || '');
            if (m) { const r = e.getBoundingClientRect(); addClip({ l: r.left + +m[4], t: r.top + +m[1], r: r.right - +m[2], b: r.bottom - +m[3] }); }
            if (e !== el && (cs.overflow === 'hidden' || cs.overflow === 'clip') && e.id !== 'stage' && e.id !== 'cam') { const r = e.getBoundingClientRect(); addClip({ l: r.left, t: r.top, r: r.right, b: r.bottom }); }
            e = e.parentElement;
          }
          if (hidden || op < .9) { ok = false; break; }
          const m = /translateY\(([-\d.]+)%\)/.exec(el.style.transform || '');
          if (m && Math.abs(parseFloat(m[1])) > 6) { ok = false; break; }
          const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();
          if (r.width < 2) { ok = false; break; }
          let vis = { l: Math.max(r.left, stage.l), t: Math.max(r.top, stage.t), r: Math.min(r.right, stage.r), b: Math.min(r.bottom, stage.b) };
          if (clip) vis = { l: Math.max(vis.l, clip.l), t: Math.max(vis.t, clip.t), r: Math.min(vis.r, clip.r), b: Math.min(vis.b, clip.b) };
          const area = Math.max(0, vis.r - vis.l) * Math.max(0, vis.b - vis.t);
          if (area < .9 * r.width * r.height) { ok = false; break; }
        }
        // the ball sits on a word of the block: not readable (the ink, not the font's tall content box)
        let covered = false;
        if (ok && ball) {
          for (const el of els) {
            const fs = parseFloat(getComputedStyle(el).fontSize) || 0;
            const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect();
            let top = r.top, bottom = r.bottom;
            if (r.height > fs * 1.15) { const mid = (top + bottom) / 2; top = mid - fs * .4; bottom = mid + fs * .4; }
            if (hiddenShare(ball, r.left, top, r.right, bottom) >= COVER) { covered = true; break; }
          }
        }
        const txt = els.map(e => e.textContent.trim()).join(' ');
        window.__raN = window.__raN || 0; if (!g._raId) g._raId = ++window.__raN;
        const key = 'b' + g._raId;
        out.push({ key, label: (g.id ? '#' + g.id : g.tagName.toLowerCase() + '.' + String(g.className).trim().split(/\s+/)[0]), txt, ok, covered });
      });
      return out;
    }, { SEL, MINF, USEBALL, MARGIN, COVER, t });
    for (const r of res) {
      const b = blocks[r.key] = blocks[r.key] || { label: r.label, samples: [] };
      b.samples.push({ t: +t.toFixed(3), ok: r.ok, cov: !!r.covered, txt: r.txt });
    }
  }
  const rows = [];
  for (const k in blocks) {
    const b = blocks[k]; let best = 0, run = 0, runStart = 0, bestAt = 0, last0 = null, flashes = 0, covLen = 0, txtAt = '', bestFree = 0, runFree = 0, lastFree = null;
    for (const s of b.samples) {
      if (s.ok && s.txt === lastFree) { runFree += STEP; } else if (s.ok) { runFree = STEP; } else runFree = 0;   // the text alone (the ball ignored)
      lastFree = s.ok ? s.txt : null;
      if (runFree > bestFree) bestFree = runFree;
      // clean = fully there AND nothing on it. ONE quick flash of the ball per hold (a single sample) is forgiven: it costs its time, not the hold, because the eye keeps the word.
      // A cover of two samples in a row, or a second flash, breaks the hold (a ball crossing a title every few tenths of a second is not readable, however short each cover is).
      if (!s.ok) { run = 0; flashes = 0; covLen = 0; last0 = null; }
      else {
        if (s.txt !== last0) { run = 0; flashes = 0; covLen = 0; last0 = s.txt; }
        if (s.cov) { covLen++; if (covLen === 1) flashes++; if (covLen >= 2 || flashes >= 2) { run = 0; flashes = 0; } }
        else { covLen = 0; if (run === 0) runStart = s.t; run += STEP; if (run > best) { best = run; bestAt = runStart; txtAt = s.txt; } }
      }
    }
    if (bestFree === 0) continue;                                // never fully readable (decor, or a block that only ever passes through)
    if (best === 0) { best = 0; bestAt = 0; txtAt = (b.samples.find(s => s.ok) || {}).txt || ''; }
    const words = txtAt.split(/\s+/).filter(Boolean).length, need = Math.min(CAP, BASE + PERW * words);
    rows.push({ label: b.label, txt: txtAt.slice(0, 26), words, best: +best.toFixed(2), free: +bestFree.toFixed(2), at: bestAt, need: +need.toFixed(2), short: +(need - best).toFixed(2) });
  }
  rows.sort((a, b) => b.short - a.short);
  const bad = rows.filter(r => r.short > .2), warn = rows.filter(r => r.short > 0 && r.short <= .2);
  console.log(`READABILITY AUDIT (step ${STEP} s; need = ${BASE} s + ${PERW} s per word, max ${CAP} s; text >= ${MINF}px)`);
  console.log('  block                 words  readable  need   from    text');
  (ALL ? rows : bad.concat(warn)).forEach(r => console.log(`  ${(r.label + ' ').padEnd(22)}${String(r.words).padEnd(7)}${(r.best + ' s').padEnd(10)}${(r.need + ' s').padEnd(7)}${(r.at + ' s').padEnd(8)}${r.txt}${r.short > .2 ? '   TOO FAST (' + (-r.short) + ' s)' : r.short > 0 ? '   a little short' : ''}${r.free - r.best > .2 ? '   ball: -' + (r.free - r.best).toFixed(2) + ' s' : ''}`));
  console.log(`SUMMARY: ${rows.length} text blocks; ${bad.length} too fast, ${warn.length} a little short, ${rows.length - bad.length - warn.length} fine. Shortest clean hold: ${rows.length ? Math.min(...rows.map(r => r.best)) : '-'} s.`);
  await browser.close();
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
