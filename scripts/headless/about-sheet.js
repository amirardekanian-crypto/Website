// The About sheet (the ⓘ), Changeover (Amir, 2026-10-12: "lets go with A"). Opened from a card and from
// Library → Exercises, light and dark, at 390 and 320 px: the questions it asks, the green tiles with their
// marks, the body at its old size with the line under it ("Mostly your ● quads."), the three lists,
// Your history, and what it must NOT carry any more (the WhatsApp door, impact). Also: the open exercise card
// has no Last time box, and the sheet's look comes off when History or a quality draws into the same frame and
// comes back with ‹ Back. Serve the repo first (see lib.js); screenshots go to --out.
'use strict';
const path = require('path');
const H = require('./lib');

// The fixture's Spine, with the fields the sheet shows. Made-up text, never a real athlete's.
const extra = {
  'barbell-back-squat': { pattern: 'squat', qualities: ['strength', 'muscle'], tennis: 'The low, loaded base you return to between shots.',
    muscles: { quads: 1, glutes: 1, hamstrings: 0.5, core: 0.5 }, loads: ['knee', 'hip-groin'], impact: 'none',
    easier: ['Goblet Squat'], harder: [], alts: ['dumbbell-bulgarian-split-squat'] },
  'box-jump': { pattern: 'jump-land', qualities: ['power', 'spring'], muscles: null, loads: ['knee', 'ankle-foot', 'hip-groin'], impact: 'plyometric',
    easier: [], harder: [], alts: [] },
  'dumbbell-bulgarian-split-squat': { pattern: 'single-leg', qualities: ['strength'], muscles: { quads: 1, glutes: 0.5 }, impact: 'none',
    easier: [], harder: [], alts: ['barbell-back-squat'] },
};
const SPINE = H.SPINE.map(e => Object.assign({}, e, extra[e.id] || {}));
const QUALS = ['armour', 'brakes', 'engine', 'movement', 'muscle', 'power', 'rotation', 'speed', 'spring', 'strength']
  .map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), line: 'What ' + id + ' means.', tennis: '', sort: i }));
// A reason on an exercise with no Spine entry: its sheet is the reason alone.
function programme() {
  const P = H.fixture();
  const carry = P.workouts.days[0].blocks[2].exercises.find(x => x.name === 'Mystery Carry');
  carry.why = { src: 'goal', text: 'Carries build the grip you asked for.' };
  return P;
}

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const sheetShot = async (p, name) => {
    // The sheet scrolls inside itself; let it run full length for the picture, then put it back.
    await p.evaluate(() => { const ov = document.getElementById('hist-overlay'), m = ov.querySelector('.readiness-modal');
      ov.style.position = 'absolute'; ov.style.bottom = 'auto'; ov.style.minHeight = '100%'; m.style.maxHeight = 'none'; });
    await p.waitForTimeout(150);
    await p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
    await p.evaluate(() => { const ov = document.getElementById('hist-overlay'), m = ov.querySelector('.readiness-modal');
      ov.style.position = ''; ov.style.bottom = ''; ov.style.minHeight = ''; m.style.maxHeight = ''; });
  };
  // Everything a check needs to know about the sheet as drawn now.
  const read = p => p.evaluate(() => {
    const m = document.querySelector('#hist-overlay .readiness-modal');
    const txt = m.innerText;
    const feel = m.querySelector('.ax-feel'), svg = m.querySelector('.ax-band .bmap svg');
    const dots = feel ? [...feel.querySelectorAll('.ax-mw')].map(w => w.querySelector('.ax-dot').classList.contains('main') ? 'M:' + w.textContent : 'H:' + w.textContent) : [];
    return {
      feel: feel ? [...feel.children].map(s => s.textContent) : [], dots, bodyH: svg ? Math.round(svg.getBoundingClientRect().height) : 0,
      middle: !!m.querySelector('.ax-stage, .ax-co, .ax-wires, .ax-tg'),
      ax: m.classList.contains('ax-sheet'), visible: document.getElementById('hist-overlay').classList.contains('visible'),
      name: (m.querySelector('.ax-name') || {}).textContent || '', qs: [...m.querySelectorAll('h3.ax-q, .ax-oq')].map(q => q.textContent.trim()),
      why: !!m.querySelector('.ax-because'), sig: !!m.querySelector('.ax-by .wn-sig'), photo: !!m.querySelector('.ax-by .wn-av'),
      src: (m.querySelector('.ax-src') || {}).textContent || '',
      tiles: [...m.querySelectorAll('.ax-tile')].map(b => ({ q: b.dataset.q, ico: (b.querySelector('svg').innerHTML || '').length })),
      court: !!m.querySelector('.ax-court'), rings: m.querySelectorAll('.bmap .ring[data-on]').length,
      lists: [...m.querySelectorAll('.ax-qa')].map(q => q.querySelector('.ax-ow').textContent),
      links: [...m.querySelectorAll('.ax-nlink')].map(b => b.dataset.id), plain: [...m.querySelectorAll('.ax-nplain')].map(s => s.firstChild.textContent),
      hist: (m.querySelector('#ax-hist') || {}).innerText || '',
      wa: !!m.querySelector('.wa-inline, a[href*="wa.me"], a[href*="whatsapp"]') || /whatsapp/i.test(txt),
      impact: /\bimpact\b|jumping|landing|running/i.test(txt),
      game: /help my game/i.test(txt), how: !!m.querySelector('.ax-how'), video: !!m.querySelector('.ax-how .ex-vunit'),
      steps: m.querySelectorAll('.ax-steps li').length, stepsShown: [...m.querySelectorAll('.ax-steps li')].filter(li => li.offsetParent).length,
      cues: m.querySelectorAll('.ax-cue').length, bad: m.querySelectorAll('.ax-cue.bad').length, plan: (m.querySelector('.ax-inplan') || {}).innerText || '',
      over: m.scrollWidth - m.clientWidth, bg: getComputedStyle(m).backgroundColor,
    };
  });

  for (const [w, dark] of [[390, false], [390, true], [320, false]]) {
    const tag = `${w}${dark ? ' dark' : ''}`, file = `about-${w}${dark ? '-dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, dark, spine: SPINE, prog: programme() });
    await p.evaluate(q => { setQualities(q); paintSpine(); }, QUALS);
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);

    // 1. The open exercise card: no Last time box (Amir: "should be removed from exercise cards").
    const cardNow = await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; if (c.classList.contains('collapsed')) toggleExpand(c);
      return { box: c.querySelectorAll('.lt-box, .lt-head').length, strip: c.querySelectorAll('.lt-strip:not(.lt-first)').length, rows: c.querySelectorAll('.ex-set-row').length }; })()`);
    t.check(`${tag}: the open squat card has its sets and no Last time box`, cardNow.box === 0 && cardNow.strip === 0 && cardNow.rows > 0, JSON.stringify(cardNow));

    // 2. From the card (the squat carries a reason).
    await p.evaluate(`(() => { const c = ${H.card('Barbell Back Squat')}; c.querySelector('.ex-about').click(); })()`);
    await p.waitForTimeout(350);
    const s = await read(p);
    t.check(`${tag}: from a card the sheet opens in its own look`, s.visible && s.ax && /barbell back squat/i.test(s.name), JSON.stringify({ ax: s.ax, name: s.name }));
    t.check(`${tag}: the reason leads, signed with his signature and photo`, s.why && s.sig && s.photo && /your knee/i.test(s.src) && s.qs[0] === 'Why am I doing this?', JSON.stringify(s.qs) + ' ' + s.src);
    t.check(`${tag}: the questions, in order, with "on court" (not "my game")`,
      JSON.stringify(s.qs.filter(q => /\?$/.test(q))) === JSON.stringify(['Why am I doing this?', 'What does it do?', 'How does it help on court?', 'Where will I feel it?', 'Too hard?', 'Other kit?']) && !s.game && s.court, JSON.stringify(s.qs));
    t.check(`${tag}: what it builds is green tiles, each with its mark`, s.tiles.length === 2 && s.tiles.every(x => x.ico > 20) && s.tiles.map(x => x.q).join() === 'strength,muscle', JSON.stringify(s.tiles));
    t.check(`${tag}: the body at its old size with nothing in the middle (Amir: "too busy")`, s.bodyH === 300 && !s.middle, JSON.stringify({ h: s.bodyH, middle: s.middle }));
    t.check(`${tag}: under it, a line per kind with the colours' dots: main first, then helping`,
      s.feel.join('|') === 'Mostly your quads and glutes.|Your hamstrings and core help.' && s.dots.join() === 'M:quads,M:glutes,H:hamstrings,H:core', JSON.stringify({ f: s.feel, d: s.dots }));
    t.check(`${tag}: the lists: a plain name says it has no page, a link opens one`,
      s.lists.join() === 'Regressions,Alternatives' && s.plain.join() === 'Goblet Squat' && s.links.join() === 'dumbbell-bulgarian-split-squat', JSON.stringify({ l: s.lists, p: s.plain, k: s.links }));
    t.check(`${tag}: Your history says the count and last time`, /your history/i.test(s.hist) && /1 session\. Last time 70 kg × 6 · 6 · 6 · 5\./.test(s.hist), s.hist);
    t.check(`${tag}: no WhatsApp door and no impact on the sheet`, !s.wa && !s.impact, JSON.stringify({ wa: s.wa, impact: s.impact }));
    t.check(`${tag}: no sideways scroll in the sheet`, s.over <= 0, s.over);
    if (dark) t.check(`${tag}: dark sheet`, s.bg === 'rgb(24, 24, 24)', s.bg);
    await sheetShot(p, file + '-card');

    // 3. A tile opens the quality's page on the plain frame; ‹ Back brings the About sheet back in its look.
    await p.evaluate(() => document.querySelector('#hist-overlay .ax-tile').click());
    await p.waitForTimeout(200);
    const q = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal');
      return { ax: m.classList.contains('ax-sheet'), title: (m.querySelector('.readiness-title') || {}).textContent, back: !!m.querySelector('.sheet-back') }; });
    t.check(`${tag}: a tile opens its quality on the plain frame with ‹ Back`, !q.ax && q.title === 'Strength' && q.back, JSON.stringify(q));
    await p.evaluate(() => sheetBack());
    await p.waitForTimeout(200);
    const b1 = await read(p);
    t.check(`${tag}: ‹ Back returns to the About sheet in its look`, b1.ax && b1.feel.length === 2, JSON.stringify({ ax: b1.ax, feel: b1.feel }));
    // 4. Your history opens History on the plain frame.
    await p.evaluate(() => document.getElementById('ax-hist').click());
    await p.waitForTimeout(200);
    const hs = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal');
      return { ax: m.classList.contains('ax-sheet'), eye: (m.querySelector('.readiness-eyebrow') || {}).textContent }; });
    t.check(`${tag}: Your history opens the History sheet, plain`, !hs.ax && hs.eye === 'Your history', JSON.stringify(hs));
    await p.evaluate(() => sheetBack());
    await p.waitForTimeout(150);
    // 5. A linked alternative opens its own sheet, still in the look; with ‹ Back on the green.
    await p.evaluate(() => document.querySelector('#hist-overlay .ax-nlink').click());
    await p.waitForTimeout(300);
    const alt = await read(p);
    const back = await p.evaluate(() => { const b = document.querySelector('#hist-overlay .sheet-back'), h = document.querySelector('#hist-overlay .ax-hero');
      if (!b || !h) return null; const r = b.getBoundingClientRect(), hr = h.getBoundingClientRect(), n = h.querySelector('.ax-name, .ax-eyebrow').getBoundingClientRect();
      return { onHero: r.top >= hr.top && r.bottom <= hr.bottom, clear: r.bottom <= n.top + 1, colour: getComputedStyle(b).color }; });
    t.check(`${tag}: a link opens that exercise's sheet in the same look`, alt.ax && /split squat/i.test(alt.name) && alt.feel.join('|') === 'Mostly your quads.|Your glutes help.', alt.name + ' ' + alt.feel.join('|'));
    t.check(`${tag}: ‹ Back sits on the green, clear of the name`, back && back.onHero && back.clear && back.colour === 'rgb(255, 255, 255)', JSON.stringify(back));
    await p.evaluate(() => closeHistorySheet());

    // 6. From Library → Exercises: How do I do it?, steps folded after two, the cues, In my plan.
    await p.evaluate(() => openExerciseSheet('barbell-back-squat', null, true));
    await p.waitForTimeout(350);
    const L = await read(p);
    t.check(`${tag}: from the Library: How do I do it? with the player, steps folded after two`, L.how && L.video && L.steps === 5 && L.stepsShown === 2, JSON.stringify({ how: L.how, v: L.video, n: L.steps, shown: L.stepsShown }));
    t.check(`${tag}: from the Library: three cues, the fault marked, In my plan names Day 1`, L.cues === 4 && L.bad === 1 && /day 1/i.test(L.plan), JSON.stringify({ c: L.cues, b: L.bad, plan: L.plan }));
    t.check(`${tag}: from the Library: no history row, no WhatsApp, no impact`, !L.hist && !L.wa && !L.impact, JSON.stringify({ h: L.hist, wa: L.wa, imp: L.impact }));
    await p.evaluate(() => document.querySelector('#hist-overlay .ax-unfold').click());
    const shown = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .ax-steps li')].filter(li => li.offsetParent).length);
    t.check(`${tag}: All 5 steps unfolds them`, shown === 5, shown);
    await sheetShot(p, file + '-library');
    await p.evaluate(() => closeHistorySheet());

    // 7. An entry with no muscles lights its body parts, rings on the knee and the ankle, and names them.
    await p.evaluate(() => openExerciseSheet('box-jump', null, true));
    await p.waitForTimeout(350);
    const J = await read(p);
    t.check(`${tag}: no muscles: the body parts lit and named, the joints ringed, no impact word`,
      J.feel.join('|') === 'It loads your knee, ankle & foot and hip & groin.' && J.rings >= 2 && !J.impact && !J.middle,
      JSON.stringify({ f: J.feel, rings: J.rings, imp: J.impact }));
    // The muscles a helper alone works: "No one muscle does the main work here."
    const T = await p.evaluate(() => { SPINE_BY_ID['side-plank'].muscles = { core: 0.5 }; openExerciseSheet('side-plank', null, true);
      return [...document.querySelectorAll('#hist-overlay .ax-feel > span')].map(s => s.textContent); });
    t.check(`${tag}: a helper alone: no one muscle does the main work, your core helps`, T.join('|') === 'No one muscle does the main work here. Your core helps.', T.join('|'));
    await sheetShot(p, file + '-thin');
    await p.evaluate(() => closeHistorySheet());

    // 8. A reason on an exercise with no entry: the sheet is the reason alone.
    const carry = await p.evaluate(`(() => { const c = ${H.card('Mystery Carry')}; const b = c && c.querySelector('.ex-about'); if (!b) return null; b.click();
      const m = document.querySelector('#hist-overlay .readiness-modal');
      return { ax: m.classList.contains('ax-sheet'), why: !!m.querySelector('.ax-because'), bands: m.querySelectorAll('.ax-band').length, wa: /whatsapp/i.test(m.innerText) }; })()`);
    t.check(`${tag}: a reason with no entry: just the reason, signed`, carry && carry.ax && carry.why && carry.bands === 0 && !carry.wa, JSON.stringify(carry));
    await p.evaluate(() => closeHistorySheet());

    // 9. The other pages of the frame are untouched: the Why page and Account draw plain.
    const plain = await p.evaluate(() => { openExerciseSheet('barbell-back-squat', null, true); openWhyPlan();
      const m = document.querySelector('#hist-overlay .readiness-modal'); const r = m.classList.contains('ax-sheet'); closeHistorySheet(); return r; });
    t.check(`${tag}: the Why page draws on the plain frame`, plain === false, plain);
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // 10. History is always one tap behind the ⓘ (the card has no Last time box): a lift with no weight reads in
  // words, a lift whose entry is not approved (or a phone with no Spine at all) still gets the ⓘ and its row.
  {
    const { ctx, p } = await H.openProgram(browser, { spine: SPINE, prog: programme() });
    await p.evaluate(q => { setQualities(q); paintSpine(); }, QUALS);
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
    const bw = await p.evaluate(`(() => { ${H.card('Box Jump')}.querySelector('.ex-about').click();
      return (document.getElementById('ax-hist') || {}).innerText || ''; })()`);
    t.check('a lift with no weight: Your history reads in words, never "Last time ×"', /1 session\. Last time 4 · 4 · 3 reps\./.test(bw) && !/Last time ×/.test(bw), bw);
    await p.evaluate(() => closeHistorySheet());
    const lib = await p.evaluate(() => { openExerciseSheet('barbell-back-squat', null, true);
      const bands = [...document.querySelectorAll('#hist-overlay .ax-band')];
      const at = q => bands.findIndex(b => [...b.querySelectorAll('h3.ax-q')].some(h => h.textContent === q));
      const r = { how: at('How do I do it?'), think: at('What should I think about?'), wrong: at('What do people get wrong?') }; closeHistorySheet(); return r; });
    t.check('from the Library the cues are their own band, after How do I do it?', lib.how === 0 && lib.think === 1 && lib.wrong === 1, JSON.stringify(lib));
    await ctx.close();
  }
  for (const [label, spine] of [['an entry that is not approved', SPINE.filter(e => e.id !== 'half-kneeling-pallof-press')], ['no Spine on the phone at all', []]]) {
    const { ctx, p } = await H.openProgram(browser, { spine, prog: programme() });
    await p.evaluate(() => { if (!SPINE || !SPINE.length) setSpine([]); paintSpine(); });
    await p.evaluate(() => openDayView('1')); await p.waitForTimeout(300);
    const r = await p.evaluate(`(() => { const c = ${H.card('Half Kneeling Pallof Press')}; const b = c && c.querySelector('.ex-about'); if (!b) return { ab: false };
      b.click(); const m = document.querySelector('#hist-overlay .readiness-modal'), row = document.getElementById('ax-hist');
      const out = { ab: true, ax: m.classList.contains('ax-sheet'), row: row ? row.innerText : '' };
      if (row) { row.click(); out.hist = (m.querySelector('.readiness-eyebrow') || {}).textContent; } closeHistorySheet(); return out; })()`);
    t.check(`${label}: the lift with history keeps its ⓘ, and Your history opens History`, r.ab && r.ax && /1 session\. Last time 15 kg × 10\./.test(r.row) && r.hist === 'Your history', JSON.stringify(r));
    t.check(`${label}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
