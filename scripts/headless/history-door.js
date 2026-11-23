// Your history on the card (direction B, "History Door", of the board History on the Card; Amir 2026-11-23: "Build B").
// The open card carries a door to the History sheet under How to do it: the session count, where the lift started and
// where it is now, and a small line. The sheet says it in one sentence and draws two lanes: the heaviest set of each
// session (dots with their numbers and dates, a grey mark for a session with no weight, a dashed dot on a low day), then
// one bar per set's effort against a dashed target. Checked at 390 and 320 px, light and dark: where the door sits, what
// it says for a climbing lift, a lift with a missing weight, a lift with no weight and a lift met once, that a lift never
// logged keeps its First time line, that a repaint draws one door, that the door opens the sheet and leaves the card open,
// and the graph's parts. Serve the repo first (see lib.js); screenshots go to --out.
'use strict';
const path = require('path');
const H = require('./lib');

const low = { level: 'amber', asWritten: false };
const S = (ex, reps, sets) => ({ ex, block: 'Strength', reps, note: '', sets });
const set = (w, n, r) => ({ w: w == null ? '' : String(w), n, r: String(r), d: true });
// Made-up history, never a real athlete's. The squat climbs 65 → 75 kg over six sessions (26 Oct-ish a low day);
// the split squat has one session with no weight; the box jump is never weighed; the Pallof press was done once.
const day = (ago, entries, ready) => ({ completed_on: H.past(ago), day: '1', readiness: ready ? 2 : 4, ready: ready || null, log: entries });
const HIST = [
  day(3, [S('Barbell Back Squat', 6, [set(75, 6, 7), set(75, 6, 7), set(75, 6, 8), set(75, 5, 8)]),
          S('Dumbbell Bulgarian Split Squat', 8, [set(20, 8, 7), set(20, 8, 7)]),
          S('Box Jump', 4, [set(null, 5, 7), set(null, 4, 7), set(null, 4, 8)]),
          S('Half Kneeling Pallof Press', 10, [set(15, 10, 6)])]),
  day(10, [S('Barbell Back Squat', 6, [set(72.5, 6, 7), set(72.5, 6, 7), set(72.5, 6, 7), set(72.5, 6, 8)]),
           S('Dumbbell Bulgarian Split Squat', 8, [set(null, 8, 7), set(null, 8, 8)]),
           S('Box Jump', 4, [set(null, 4, 7), set(null, 4, 7), set(null, 4, 7)])]),
  day(17, [S('Barbell Back Squat', 6, [set(70, 6, 6), set(70, 6, 7), set(70, 6, 7), set(70, 6, 7)]),
           S('Dumbbell Bulgarian Split Squat', 8, [set(16, 8, 7), set(16, 8, 7)]),
           S('Box Jump', 4, [set(null, 4, 7), set(null, 4, 8), set(null, 3, 8)])]),
  day(24, [S('Barbell Back Squat', 6, [set(70, 6, 7), set(70, 6, 8), set(70, 5, 8), set(70, 5, 9)])], low),
  day(31, [S('Barbell Back Squat', 6, [set(67.5, 6, 6), set(67.5, 6, 7), set(67.5, 6, 7), set(67.5, 6, 7)])]),
  day(38, [S('Barbell Back Squat', 6, [set(65, 6, 7), set(65, 6, 7), set(65, 6, 7), set(65, 6, 7)])]),
];

const doorOf = nm => `(() => { const c = ${H.card(nm)}; if (!c) return null; if (c.classList.contains('collapsed')) toggleExpand(c);
  const d = c.querySelectorAll('.lt-door'), b = d[0];
  if (!b) return { n: 0, first: !!c.querySelector('.lt-first') };
  return { n: d.length, t: b.querySelector('.lt-door-t').textContent, line: b.querySelector('.lt-door-n').textContent.replace(/\\u00a0/g, ' '),
    nbsp: /\\d\\u00a0(kg|reps|sessions?)/.test(b.querySelector('.lt-door-n').textContent),
    spark: !!b.querySelector('.lt-door-spark') && getComputedStyle(b.querySelector('.lt-door-spark')).display !== 'none',
    first: !!c.querySelector('.lt-first') }; })()`;

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  for (const [w, dark] of [[390, false], [390, true], [320, false]]) {
    const tag = `${w}px${dark ? ' dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, dark, hist: HIST });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(400);

    // 1. The climbing squat: the door sits under How to do it and over the first set, and says where the lift went.
    const sq = await p.evaluate(doorOf('Barbell Back Squat'));
    await p.waitForTimeout(450);
    t.check(`${tag}: the open squat card has ONE Your history door`, sq && sq.n === 1 && sq.t === 'Your history', JSON.stringify(sq));
    t.check(`${tag}: the squat's door says the count and where it went`, sq && sq.line === '6 sessions · up from 65 to 75 kg', sq && sq.line);
    t.check(`${tag}: a number keeps its word on its line (no-break space)`, sq && sq.nbsp, JSON.stringify(sq));
    t.check(`${tag}: the small line shows at ${w} px only when there is room (hidden under 360)`, sq && sq.spark === (w >= 360), JSON.stringify(sq));
    const pos = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}, r = e => e && e.getBoundingClientRect();
      const how = r(c.querySelector('.ex-how-sum')), door = r(c.querySelector('.lt-door')), row = r(c.querySelector('.ex-set-row'));
      return { how: how && Math.round(how.bottom), top: Math.round(door.top), bottom: Math.round(door.bottom), row: Math.round(row.top), h: Math.round(door.height),
        left: Math.round(door.left), howLeft: how && Math.round(how.left), w: Math.round(door.width), howW: how && Math.round(how.width),
        box: !!c.querySelector('.lt-box, .lt-strip:not(.lt-first)'), over: document.documentElement.scrollWidth - innerWidth }; })()`);
    t.check(`${tag}: the door is under How to do it and above the sets`, (pos.how == null || pos.top >= pos.how) && pos.bottom <= pos.row, JSON.stringify(pos));
    t.check(`${tag}: the door lines up with How to do it, 44 px or taller`, pos.h >= 44 && (pos.howLeft == null || (pos.left === pos.howLeft && pos.w === pos.howW)), JSON.stringify(pos));
    t.check(`${tag}: still no Last time box, and no sideways scroll`, !pos.box && pos.over <= 0, JSON.stringify(pos));
    await p.evaluate(`${H.card('Barbell Back Squat')}.scrollIntoView({ block: 'start' })`);
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(shots, `history-door-card-${w}${dark ? '-dark' : ''}.png`) });

    // 2. A repaint draws one door, not two.
    const again = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; paintLastTime(c); paintLastTime(c); return c.querySelectorAll('.lt-door').length; })()`);
    t.check(`${tag}: a repaint keeps one door`, again === 1, again);

    // 3. The other lifts: a missing weight, never weighed, met once, never logged.
    const ss = await p.evaluate(doorOf('Dumbbell Bulgarian Split Squat'));
    t.check(`${tag}: a lift with a session with no weight still compares its weights`, ss && ss.line === '3 sessions · up from 16 to 20 kg', ss && ss.line);
    const bj = await p.evaluate(doorOf('Box Jump'));
    t.check(`${tag}: a lift never weighed compares its best set's reps`, bj && bj.line === '3 sessions · best set up from 4 to 5 reps', bj && bj.line);
    const pf = await p.evaluate(doorOf('Half Kneeling Pallof Press'));
    t.check(`${tag}: a lift met once says what it was, in the About sheet's words, with no small line`, pf && pf.line === '1 session. Last time 15 kg × 10.' && !pf.spark, JSON.stringify(pf));
    const sp = await p.evaluate(doorOf('Side Plank'));
    t.check(`${tag}: a lift never logged has no door`, sp && sp.n === 0, JSON.stringify(sp));

    // 4. The door opens the sheet and leaves the card open behind it.
    await p.evaluate(`${H.card('Barbell Back Squat')}.querySelector('.lt-door').click()`);
    await p.waitForTimeout(400);
    const hs = await p.evaluate(() => {
      const ov = document.getElementById('hist-overlay'), m = ov.querySelector('.readiness-modal'), q = s => m.querySelectorAll(s);
      const txt = s => [...q(s)].map(e => e.textContent);
      return { on: ov.classList.contains('visible'), eye: (m.querySelector('.readiness-eyebrow') || {}).textContent,
        sum: ((m.querySelector('.hs-sum') || {}).textContent || '').replace(/ /g, ' '), lbl: (m.querySelector('.hs-lbl') || {}).textContent,
        dots: q('.hs-pt').length + q('.hs-dot').length, now: q('.hs-dot').length, vals: txt('.hs-val, .hs-end'), ticks: txt('.hs-tick'),
        low: q('.hs-low').length, lowt: txt('.hs-lowt'), bars: q('.hs-eff').length, over: q('.hs-eff.over').length, under: q('.hs-eff.under').length,
        tgt: q('.hs-tgt').length, lane: txt('.hs-lanet'), rows: q('.hs-row').length,
        fit: (() => { const s = m.querySelector('.hs-chart').getBoundingClientRect(); return Math.round(s.right) <= Math.round(m.getBoundingClientRect().right); })() };
    });
    t.check(`${tag}: the door opens the History sheet`, hs.on && hs.eye === 'Your history' && hs.rows === 6, JSON.stringify({ on: hs.on, eye: hs.eye, rows: hs.rows }));
    t.check(`${tag}: one plain sentence: the change and the effort`, /^10 kg more than on \d{1,2} [A-Z][a-z]{2}, at about the same effort\.$/.test(hs.sum || ''), hs.sum);
    t.check(`${tag}: the graph is the heaviest set, never the estimate`, hs.lbl === 'Top weight, kg', hs.lbl);
    t.check(`${tag}: a dot and a number for every session, the newest filled`, hs.dots === 6 && hs.now === 1 && hs.vals.join(' ') === '65 67.5 70 70 72.5 75', JSON.stringify(hs.vals));
    t.check(`${tag}: a date under every dot, each with its month`, hs.ticks.length === 6 && hs.ticks.every(d => /^\d{1,2} [A-Z][a-z]{2}$/.test(d)), JSON.stringify(hs.ticks));
    t.check(`${tag}: the low day is a dashed dot with "low day" under its date`, hs.low === 1 && hs.lowt.length === 1 && hs.lowt[0] === 'low day', JSON.stringify({ low: hs.low, t: hs.lowt }));
    t.check(`${tag}: one effort bar per set, clay over the target, steel under it, the target dashed`,
      hs.bars === 24 && hs.over === 6 && hs.under === 2 && hs.tgt === 1 && hs.lane[0] === 'Effort, each set' && hs.lane[1] === 'target 7', JSON.stringify({ b: hs.bars, o: hs.over, u: hs.under, l: hs.lane }));
    t.check(`${tag}: the graph fits the sheet`, hs.fit, hs.fit);
    // The picture: the first-session hint that a hold card raises sits over the sheet, so it goes first.
    await p.evaluate(() => { if (typeof hideAaToast === 'function') hideAaToast(); const ov = document.getElementById('hist-overlay'), m = ov.querySelector('.readiness-modal');
      ov.style.position = 'absolute'; ov.style.bottom = 'auto'; ov.style.minHeight = '100%'; m.style.maxHeight = 'none'; });
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(shots, `history-door-sheet-${w}${dark ? '-dark' : ''}.png`), fullPage: true });
    await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); ov.style.position = ''; ov.style.bottom = ''; ov.style.minHeight = ''; ov.querySelector('.readiness-modal').style.maxHeight = ''; });
    await p.evaluate(() => closeHistorySheet());
    await p.waitForTimeout(200);
    const still = await p.evaluate(`!${H.card('Barbell Back Squat')}.classList.contains('collapsed')`);
    t.check(`${tag}: the card is still open after the sheet closes`, still, still);

    // 5. A missing weight on the sheet: a grey mark that says so, and the line goes dotted across it.
    await p.evaluate(`${H.card('Dumbbell Bulgarian Split Squat')}.querySelector('.lt-door').click()`);
    await p.waitForTimeout(350);
    const gap = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal');
      return { gap: m.querySelectorAll('.hs-gap').length, t: [...m.querySelectorAll('.hs-gapt')].map(e => e.textContent), skip: m.querySelectorAll('.hs-skip').length,
        sum: ((m.querySelector('.hs-sum') || {}).textContent || '').replace(/ /g, ' ') }; });
    t.check(`${tag}: a session with no weight is a grey "no kg" mark, the line dotted across it`, gap.gap === 1 && gap.t[0] === 'no kg' && gap.skip === 1, JSON.stringify(gap));
    t.check(`${tag}: the split squat's sentence`, /^4 kg more than on \d{1,2} [A-Z][a-z]{2}, at about the same effort\.$/.test(gap.sum || ''), gap.sum);
    await p.evaluate(() => closeHistorySheet());

    // 6. A lift never weighed: reps on the graph and in the sentence.
    await p.evaluate(`${H.card('Box Jump')}.querySelector('.lt-door').click()`);
    await p.waitForTimeout(350);
    const reps = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal');
      return { lbl: (m.querySelector('.hs-lbl') || {}).textContent, sum: (m.querySelector('.hs-sum') || {}).textContent }; });
    t.check(`${tag}: a lift never weighed draws its best set's reps`, reps.lbl === 'Most reps in a set' && /^Your best set went up from 4 to 5 reps since \d{1,2} [A-Z][a-z]{2}, at about the same effort\.$/.test(reps.sum || ''), JSON.stringify(reps));
    await p.evaluate(() => closeHistorySheet());

    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // 7. On a Farsi phone: the door, the sentence, the graph's words and the guide's new lines all have their Farsi.
  {
    const FARSI = "localStorage.setItem('aa_lang_beta', '1'); localStorage.setItem('aa_lang', 'fa');";
    const { ctx, p } = await H.openProgram(browser, { hist: HIST, init: FARSI });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(400);
    await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); })()`);
    await p.waitForTimeout(500);
    const fa = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}, b = c.querySelector('.lt-door');
      return { t: b.querySelector('.lt-door-t').textContent, line: b.querySelector('.lt-door-n').textContent }; })()`);
    t.check('Farsi: the door says the count and the change in Farsi', /جلسه/.test(fa.line) && !/[A-Za-z]/.test(fa.line) && !/[A-Za-z]/.test(fa.t), JSON.stringify(fa));
    await p.evaluate(`${H.card('Barbell Back Squat')}.querySelector('.lt-door').click()`);
    await p.waitForTimeout(500);
    const fs = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'), txt = s => [...m.querySelectorAll(s)].map(e => e.textContent);
      return { sum: (m.querySelector('.hs-sum') || {}).textContent, lbl: (m.querySelector('.hs-lbl') || {}).textContent, ticks: txt('.hs-tick'), lane: txt('.hs-lanet'), low: txt('.hs-lowt') }; });
    const latin = a => a.some(s => /[A-Za-z]/.test(s));
    t.check('Farsi: the sentence and the graph label are Farsi', fs.sum && !/[A-Za-z]/.test(fs.sum) && !/[A-Za-z]/.test(fs.lbl), JSON.stringify({ sum: fs.sum, lbl: fs.lbl }));
    t.check('Farsi: every date is a Shamsi date, the lane and low day are Farsi', fs.ticks.length === 6 && !latin(fs.ticks) && !latin(fs.lane) && !latin(fs.low), JSON.stringify(fs));
    await p.evaluate(() => { closeHistorySheet(); openHelp(); });
    await p.waitForTimeout(500);
    const guide = await p.evaluate(() => document.querySelector('#hist-overlay .help-list').textContent);
    const left = ['For the whole story', 'on the open exercise', 'then Your history on an exercise', 'heaviest set'].filter(s => guide.includes(s));
    t.check('Farsi: the guide\'s new lines about the door are Farsi', left.length === 0, JSON.stringify(left));
    t.check('Farsi: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})();
