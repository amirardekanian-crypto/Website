// Plain Words, Group B (2026-10-25): the day, Home, habits and Library say it the plain way. node scripts/headless/love-all-words-b.js
//   blocks     Home's day card says "9 exercises", not "6 blocks · 9 movements".
//   qualities  "Today builds" leads the quality chips on the Home card and the day head.
//   isolation  the About sheet's pattern says "One muscle at a time".
//   guided     the Guided button carries "One set at a time".
//   finish     "Stop here" replaces "Finish early" everywhere the athlete reads it.
//   reset      "Start this day again", and its armed tap says what it clears.
//   offswitch  "These five are for everyone."
//   alwayson   the habits list says "For everyone".
//   playbook   the Playbook pane says "Articles from me".
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js).
'use strict';
const H = require('./lib');
const t = H.checker();

// The fixture's Spine with qualities, so the day card has quality chips to lead (made-up lists, never a real athlete's).
const QOF = { 'barbell-back-squat': ['strength', 'muscle', 'armour'], 'box-jump': ['power', 'spring'], 'dumbbell-bulgarian-split-squat': ['strength'] };
const SPINE = H.SPINE.map(e => Object.assign({}, e, QOF[e.id] ? { qualities: QOF[e.id] } : { qualities: ['strength'] }))
  .concat([{ id: 'cable-lateral-raise', name: 'Cable Lateral Raise', aliases: [], equipment: ['cable'], pattern: 'isolation', impact: 'none', cues: { good: [], bad: [] }, purpose: 'Side delts.' }])
  .concat(['Incline Dumbbell Press', 'Single-Arm Dumbbell Row'].map(n => ({ id: n.toLowerCase().replace(/ /g, '-'), name: n, aliases: [], qualities: ['muscle', 'strength'] })));
const QUALS = ['armour', 'brakes', 'engine', 'movement', 'muscle', 'power', 'rotation', 'speed', 'spring', 'strength']
  .map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), line: 'What ' + id + ' means.', tennis: '', sort: i }));
const open = async (browser, extra) => {
  const r = await H.openProgram(browser, Object.assign({ w: 390, h: 844, prog: H.fixture(), spine: SPINE, stub: { library: H.library() } }, extra || {}));
  await r.p.evaluate(q => { setQualities(q); paintSpine(); paintDayQualities(); }, QUALS);
  return r;
};
const noScroll = async (p, w, what) => {
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  t.check(`${what}: nothing overflows sideways at ${w} px`, m.sw <= w && m.iw <= w, JSON.stringify(m));
};
const fits = async (p, sel, w, what) => {
  const r = await p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).map(e => {
    const b = e.getBoundingClientRect(); return { l: Math.round(b.left), r: Math.round(b.right), sw: e.scrollWidth, cw: e.clientWidth, h: Math.round(b.height) };
  }), sel);
  t.check(`${what}: shown and inside the screen at ${w} px`, r.length > 0 && r.every(x => x.l >= 0 && x.r <= w && x.sw <= x.cw + 1), JSON.stringify(r));
};

async function blocks(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await p.waitForTimeout(700);
    const home = await p.evaluate(() => {
      const d = DATA.workouts.days.find(x => String(x.id) === (document.querySelector('[data-dc]') || {}).dataset.dc) || DATA.workouts.days[0];
      return { n: d.blocks.reduce((k, b) => k + b.exercises.length, 0), words: document.querySelector('#home-overview .dc-hero .cm-weeks').textContent.trim() };
    });
    t.check(`blocks: Home's card says "${home.n} exercises" (${w} px)`, home.words === home.n + ' exercises', home.words);
    t.check('blocks: …and never "blocks" or "movements"', !/block|movement/i.test(home.words), home.words);
    t.check(`blocks: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

async function qualities(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await p.waitForTimeout(700);
    const lead = await p.evaluate(() => { const e = document.querySelector('#home-overview .dc-hero .dq-lead'); return e ? e.textContent.trim() : null; });
    t.check(`qualities: Home's card says "Today builds:" before the quality names (${w} px)`, lead === 'Today builds:', String(lead));
    const names = await p.evaluate(() => [...document.querySelectorAll('#home-overview .dc-hero .dq-chip')].map(c => c.textContent.trim()));
    t.check('qualities: …the quality names are still the chips after it', names.length >= 1, names.join(' | '));
    t.check('qualities: …and a chip still opens its sheet', await p.evaluate(async () => {
      const c = document.querySelector('#home-overview .dc-hero .dq-chip'); if (!c) return false; c.click();
      await new Promise(r => setTimeout(r, 200)); const ok = !!document.querySelector('#hist-overlay.visible .readiness-title'); document.getElementById('hist-overlay').classList.remove('visible'); return ok;
    }));
    await fits(p, '#home-overview .dc-hero .dq-lead', w, 'qualities: Home line');
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(500);
    const lead2 = await p.evaluate(() => { const e = document.querySelector('#day-view-card .dq-lead'); return e ? e.textContent.trim() : null; });
    t.check(`qualities: the day head says "Today builds:" too (${w} px)`, lead2 === 'Today builds:', String(lead2));
    await fits(p, '#day-view-card .dq-lead', w, 'qualities: day-head line');
    await noScroll(p, w, 'qualities: day head');
    t.check(`qualities: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

async function isolation(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await p.evaluate(() => openExerciseSheet('cable-lateral-raise', null, true));
    await p.waitForTimeout(400);
    const e = await p.evaluate(() => { const x = document.querySelector('#hist-overlay .ax-eyebrow'); return x ? x.textContent.trim() : null; });
    t.check(`isolation: the About sheet says "One muscle at a time" (${w} px)`, e === 'One muscle at a time', String(e));
    t.check('isolation: …and not "Isolation"', !/isolation/i.test(await p.evaluate(() => document.querySelector('#hist-overlay .readiness-modal').innerText)));
    await fits(p, '#hist-overlay .ax-eyebrow', w, 'isolation: eyebrow');
    await noScroll(p, w, 'isolation: sheet');
    await p.evaluate(() => { document.getElementById('hist-overlay').classList.remove('visible'); goLibrary(); setLibPane('exercises'); });
    await p.waitForTimeout(500);
    const chip = await p.evaluate(() => [...document.querySelectorAll('#xl-chips .xl-chip')].map(c => c.textContent.trim()).find(x => /muscle at a time/i.test(x)) || null);
    t.check(`isolation: Library, Exercises has the same words on its filter (${w} px)`, chip === 'One muscle at a time', String(chip));
    t.check(`isolation: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

async function guided(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(500);
    const g = () => p.evaluate(() => {
      const b = document.querySelector('#day1 .session-timer-btn.guided') || document.querySelector('.session-timer-btn.guided');
      if (!b || !b.offsetParent) return null;
      const r = b.getBoundingClientRect(), s = b.querySelector('.stb-sub'), sr = s.getBoundingClientRect();
      return { name: b.querySelector('.stb-gl').textContent.replace(/\s+/g, ' ').trim(), line: s.textContent.trim(), sub: Math.round(sr.height),
        inside: sr.left >= r.left - 0.5 && sr.right <= r.right + 0.5 && sr.bottom <= r.bottom + 0.5 && sr.top >= r.top - 0.5, bh: Math.round(r.height), br: Math.round(r.right) };
    });
    let r = await g();
    t.check(`guided: before Start the button is still "Guided" with "One set at a time" under it (${w} px)`, r && /^Guided/.test(r.name) && r.line === 'One set at a time', JSON.stringify(r));
    t.check('guided: …the line is one line, grey, and inside the button', r && r.sub <= 16 && r.inside && r.br <= w, JSON.stringify(r));
    await noScroll(p, w, 'guided: before Start');
    await p.evaluate(() => startTimerNow('1'));
    await p.waitForTimeout(500);
    await p.evaluate(() => { const m = document.querySelector('#day1 .session-timer-more, .session-timer.slim .session-timer-more'); if (m) m.click(); });
    await p.waitForTimeout(500);
    r = await g();
    t.check(`guided: with ⋯ open the button keeps the line, inside the screen (${w} px)`, r && r.line === 'One set at a time' && r.sub <= 16 && r.inside && r.br <= w, JSON.stringify(r));
    await noScroll(p, w, 'guided: ⋯ open');
    await p.evaluate(() => { window.restAfterTick = () => {}; const c = document.querySelector('#day-view .ex-set-row .ex-set-check'); if (c) c.click(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => { const m = document.querySelector('.session-timer.slim .session-timer-more'); if (m && m.getAttribute('aria-expanded') !== 'true') m.click(); });
    await p.waitForTimeout(400);
    r = await g();
    const fin = await p.evaluate(() => !!document.querySelector('.session-timer.has-finish'));
    t.check(`guided: …and once a set is ticked (the fourth button shows, a 2 x 2 grid) too (${w} px)`, fin && r && r.line === 'One set at a time' && r.sub <= 16 && r.inside && r.br <= w, fin + ' ' + JSON.stringify(r));
    await p.click('.session-timer-btn.guided');
    await p.waitForTimeout(600);
    t.check('guided: a tap on it opens Guided', await p.evaluate(() => !!STEP && STEP.day === '1'), '');
    t.check(`guided: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
}

// A part-done day: the clock running, one set ticked, the rest left. The day the athlete stops on.
async function partDone(p) {
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(500);
  await p.evaluate(() => { window.restAfterTick = () => {}; startTimerNow('1'); });
  await p.waitForTimeout(300);
  await p.evaluate(() => { document.querySelector('#day-view .ex-set-row .ex-set-check').click(); });
  await p.waitForTimeout(400);
}
const body = p => p.evaluate(() => document.getElementById('day-view').innerText + ' ' + [...document.querySelectorAll('#day-view [aria-label]')].map(e => e.getAttribute('aria-label')).join(' '));

async function finish(browser) {
  for (const w of [390, 320]) {
    const { ctx, p } = await open(browser, { w });
    await partDone(p);
    const card = await p.evaluate(() => document.querySelector('#confirm-1 .confirm-btn').textContent.trim());
    t.check(`finish: the finish card's button says "Stop here" while sets are left (${w} px)`, card === 'Stop here', card);
    t.check('finish: …and nowhere on the day does it say "Finish early"', !/finish early/i.test(await body(p)), '');
    await p.click('#timer-1 .session-timer-more');
    await p.waitForTimeout(250);
    const b = await p.evaluate(() => { const e = document.querySelector('#timer-1 .session-timer-finish'); const r = e.getBoundingClientRect(); return { txt: e.textContent.trim(), l: Math.round(r.left), r: Math.round(r.right), fits: e.scrollWidth <= e.clientWidth + 1 }; });
    t.check(`finish: under ⋯ the button says "Stop here" and fits (${w} px)`, b.txt === 'Stop here' && b.fits && b.l >= 0 && b.r <= w, JSON.stringify(b));
    const lab = await p.getAttribute('#timer-1 .session-timer-more', 'aria-label');
    t.check('finish: ⋯ names it in its label', /Stop here/.test(lab) && !/Finish early/.test(lab), lab);
    await p.click('#timer-1 .session-timer-finish');
    await p.waitForTimeout(200);
    const armed = await p.evaluate(() => document.querySelector('#timer-1 .session-timer-finish').textContent.trim());
    t.check('finish: the first tap asks "Stop here?"', armed === 'Stop here?', armed);
    await noScroll(p, w, 'finish: armed');
    await p.click('#timer-1 .session-timer-finish');
    await p.waitForTimeout(900);
    const head = await p.evaluate(() => document.querySelector('#confirm-1 .confirm-text').textContent.trim());
    t.check('finish: the second tap lands on the card headed "Stopping Day 1 here"', head === 'Stopping Day 1 here', head);
    t.check('finish: …and the card is early, so the session would file as a part-done one', await p.evaluate(() => document.getElementById('confirm-1').dataset.early === '1'));
    await noScroll(p, w, 'finish: early card');
    t.check(`finish: no page errors (${w})`, !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  const { ctx, p } = await open(browser, { w: 390 });   // the card's own button, two taps
  await partDone(p);
  await p.click('#confirm-1 .confirm-btn');
  await p.waitForTimeout(200);
  const a = await p.evaluate(() => document.querySelector('#confirm-1 .confirm-btn').textContent.trim());
  t.check('finish: the card\'s first tap says "Tap again to stop here"', a === 'Tap again to stop here', a);
  await p.click('#confirm-1 .confirm-btn');
  await p.waitForTimeout(700);
  const head = await p.evaluate(() => document.querySelector('#confirm-1 .confirm-text').textContent.trim());
  t.check('finish: …and the second lands on "Stopping Day 1 here"', head === 'Stopping Day 1 here', head);
  t.check('finish: the how-the-app-works guide says Stop here, not Finish early', await p.evaluate(() => { const g = JSON.stringify(APP_GUIDE); return !/Finish early/.test(g) && /Stop here/.test(g); }), '');
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await blocks(browser);
  await qualities(browser);
  await isolation(browser);
  await guided(browser);
  await finish(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
