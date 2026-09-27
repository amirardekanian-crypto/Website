// Smoke test of both athlete apps against the stub (about a minute). Every main screen opens at phone
// width, light and dark, nothing throws and nothing scrolls sideways. Screenshots go to --out.
// Serve the repo first: python3 -m http.server 8765 --bind 127.0.0.1 (see lib.js).
'use strict';
const path = require('path');
const H = require('./lib');

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const noSideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png') });

  // ── program.html ──
  for (const [w, dark] of [[390, false], [390, true], [320, false]]) {
    const tag = `${w}${dark ? ' dark' : ''}`, file = `program-${w}${dark ? '-dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, dark });
    const home = await p.evaluate(() => ({ on: document.getElementById('screen-home').classList.contains('active'),
      cycle: !!document.querySelector('.cyc-card'), text: document.getElementById('screen-home').innerText.length }));
    t.check(`program ${tag}: Home opens with the This cycle card`, home.on && home.cycle && home.text > 100, JSON.stringify(home));
    t.check(`program ${tag}: Home has no sideways scroll`, (await noSideways(p)) <= 0);
    await shot(p, file + '-home');

    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    const day = await p.evaluate(() => document.querySelectorAll('#day-view .checklist-item').length);
    t.check(`program ${tag}: Day 1 opens with its exercises`, day >= 4, day);

    await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c); c.scrollIntoView({ block: 'start' }); })()`);
    await p.waitForTimeout(300);
    const sets = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; return { rows: c.querySelectorAll('.ex-set-row').length, want: parseInt(c.dataset.sets, 10), last: !!c.querySelector('.lt-box') }; })()`);
    t.check(`program ${tag}: the squat card opens with its sets and Last time`, sets.rows === sets.want && sets.rows > 0 && sets.last, JSON.stringify(sets));
    t.check(`program ${tag}: the open card has no sideways scroll`, (await noSideways(p)) <= 0);
    await shot(p, file + '-card');

    await p.evaluate(() => { startTimerNow('1'); openGuided('1'); });
    await p.waitForTimeout(400);
    const g = await p.evaluate(() => ({ steps: STEP.seq.length, foot: document.getElementById('step-footer').getBoundingClientRect().height }));
    t.check(`program ${tag}: Guided opens on a step with its footer`, g.steps > 0 && g.foot > 0, JSON.stringify(g));
    await shot(p, file + '-guided');
    t.check(`program ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── habits.html (AA Proof), the full app and Home's embedded strip ──
  for (const [url, dark, file] of [['/habits.html', false, 'proof-390'], ['/habits.html', true, 'proof-390-dark'], ['/habits.html?embed=1', false, 'proof-embed']]) {
    const { ctx, p } = await H.openProof(browser, { url, dark });
    const s = await p.evaluate(() => ({ screen: typeof UI !== 'undefined' ? UI.screen : null, text: document.getElementById('app').innerText.length }));
    t.check(`proof ${file}: renders${url.includes('embed') ? '' : ' on Today'}`, s.text > 100 && (url.includes('embed') || s.screen === 'today'), JSON.stringify(s));
    t.check(`proof ${file}: no sideways scroll, no page errors`, (await noSideways(p)) <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await shot(p, file);
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
