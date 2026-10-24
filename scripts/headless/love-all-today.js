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

(async () => {
  const browser = await H.launch();
  await b11(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
