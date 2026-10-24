// Love All round 2 (2026-10-24): today's targets, checked the way the athlete meets them.
//   B11 the lower-day banner says only what changed today ("Effort 1 lower today."), never what did not change.
//   B12 Guided follows today's targets: a halved card walks its halved sets, a struck (sore) card and an optional (red day) card are not walked,
//       and the finish count (getDayCompletion) agrees with what Guided walked.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-today.js
'use strict';
const H = require('./lib');

const t = H.checker();

async function openDay(browser, ready, prog) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog || H.fixture(),
    seed: ready ? { _readiness_1: Object.assign({ timestamp: Date.now() }, ready) } : {} });
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(400);
  return { ctx, p };
}
const banner = p => p.evaluate(() => { const b = document.querySelector('#day1 .rd-banner'); return b && !b.hidden ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });

async function b11(browser) {
  for (const [name, ready] of [['amber', { level: 'amber', drop: 1, sore: '' }], ['red', { level: 'red', drop: 1, sore: '' }]]) {
    const { ctx, p } = await openDay(browser, ready);
    const txt = await banner(p);
    t.check(`B11 ${name} day: the banner says "Effort 1 lower today."`, /Effort 1 lower today\./.test(txt), txt);
    t.check(`B11 ${name} day: the banner never says what did not change`, !/same sets|same reps/i.test(txt), txt);
    t.check(`B11 ${name} day: no em-dash or semicolon in the banner`, !/[—;]/.test(txt), txt);
    t.check(`B11 ${name} day: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// Guided's sequence, then every walked set ticked in the card (the athlete's own tap), then what the finish count says.
async function walk(p) {
  // A warm-up group is one step: the athlete ticks its rows with Next, as the day's list does.
  const seq = await p.evaluate(() => { openStepMode('1'); return STEP.seq.flatMap(s => s.group ? s.cards.map(c => ({ name: c.querySelector('.item-name').textContent.trim(), setI: 0, total: 0, warm: true })) : [{ name: s.name, setI: s.setI, total: s.total }]); });
  for (const s of seq) {
    await p.evaluate(s => {
      const c = [...document.querySelectorAll('#day1 .checklist-item')].find(c => (c.querySelector('.item-name') || {}).textContent.trim() === s.name);
      if (c.classList.contains('collapsed')) toggleExpand(c);
      const k = c.querySelectorAll('.ex-set-check');
      if (k.length) { k[s.setI]._now = true; k[s.setI].click(); k[s.setI]._now = false; }   // a hold would count down; the test means "ticked"
      else if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
    }, s);
    await p.waitForTimeout(80);
  }
  const st = await p.evaluate(() => { const g = getDayCompletion('1'); return { done: g.done, total: g.total, missing: g.missing.map(x => x.name + ' ' + x.label) }; });
  return { seq, st };
}
async function b12(browser) {
  const cnt = (seq, nm) => seq.filter(s => !s.warm && s.name === nm).length;
  // Sore, half: the 3-set Box Jump is 1 set today.
  let { ctx, p } = await openDay(browser, { level: 'green', drop: 0, sore: 'half' });
  let r = await walk(p);
  t.check('B12 sore (half): Guided walks 1 of the 3 Box Jump sets', cnt(r.seq, 'Box Jump') === 1, JSON.stringify(r.seq.filter(s => !s.warm).map(s => s.name + s.setI)));
  t.check('B12 sore (half): the lifts keep every set (squat 4)', cnt(r.seq, 'Barbell Back Squat') === 4, JSON.stringify(r.seq.filter(s => !s.warm).map(s => s.name + s.setI)));
  t.check('B12 sore (half): after the walk the count agrees: done === total, nothing missing', r.st.total > 0 && r.st.done === r.st.total && !r.st.missing.length, JSON.stringify(r.st));
  await ctx.close();
  // Sore, skip: no Box Jump step at all.
  ({ ctx, p } = await openDay(browser, { level: 'green', drop: 0, sore: 'skip' }));
  r = await walk(p);
  t.check('B12 sore (skip): Guided does not walk Box Jump', cnt(r.seq, 'Box Jump') === 0, JSON.stringify(r.seq.filter(s => !s.warm).map(s => s.name + s.setI)));
  t.check('B12 sore (skip): after the walk the count agrees: done === total, nothing missing', r.st.total > 0 && r.st.done === r.st.total && !r.st.missing.length, JSON.stringify(r.st));
  await ctx.close();
  // Red day: only the core is walked; the optional cards are not.
  ({ ctx, p } = await openDay(browser, { level: 'red', drop: 1, sore: '' }));
  const opt = await p.evaluate(() => [...document.querySelectorAll('#day1 .checklist-item.rd-optional .item-name')].map(e => e.textContent.trim()));
  r = await walk(p);
  t.check('B12 red day: there are optional cards to leave out', opt.length > 0, JSON.stringify(opt));
  t.check('B12 red day: Guided walks none of the optional cards', !r.seq.some(s => !s.warm && opt.includes(s.name)), JSON.stringify([opt, r.seq.map(s => s.name)]));
  t.check('B12 red day: Guided still walks the first lift in full', cnt(r.seq, 'Barbell Back Squat') === 4, JSON.stringify(r.seq.filter(s => !s.warm).map(s => s.name + s.setI)));
  t.check('B12 red day: after the walk the count agrees: done === total, nothing missing', r.st.total > 0 && r.st.done === r.st.total && !r.st.missing.length, JSON.stringify(r.st));
  t.check('B12 no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await b11(browser);
  await b12(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
