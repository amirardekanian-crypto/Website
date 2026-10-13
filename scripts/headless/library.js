// The Library in the Centre Court look, without the doors page (Amir, 2026-10-13: "the Library opens on Sessions with a Sessions ·
// Playbook · Exercises switch, remembering the last one"; "Before you start" is open the first time each session is opened and one
// folded row after that). This checks the behaviour (the switch, the pane memory, Back from a pane, a session and an article coming
// back to their pane at the same scroll, a suggestion's ←, the shelves, the ✓ labels, the Playbook, Exercises, Before you start, Mark
// as done, the deep links) and the look at 320, 375 and 390 px, light and dark.
// The harness answers get_library from workouts/ and articles/ (lib.js library(): 42 sessions on 7 shelves, 21 reads in 4 categories
// that have reads and 3 that do not).
// Serve the repo first (python -m http.server 8781 --bind 127.0.0.1, see lib.js), then:
//   node scripts/headless/library.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const t = H.checker();
const LIB = H.library();
const WHITE = 'rgb(255, 255, 255)';
const CLAY = ['rgb(199, 85, 47)', 'rgb(181, 70, 31)', 'rgb(224, 107, 67)', 'rgb(194, 81, 44)'];
const sessions = [].concat(...LIB.workout.map(c => c.items.map(it => ({ cat: c.id, shelf: c.title, key: c.id + '/' + it.id, it }))));
const reads = [].concat(...LIB.article.map(c => c.items.map(it => ({ cat: c.id, title: c.title, key: c.id + '/' + it.id, it }))));
const FULL = 'strength/full-body-power';   // 8 Before-you-start rows, countsAs strength, an intro of two paragraphs
const OTHER = 'mobility/everyday-mobility';

async function open(browser, o = {}) {
  const opts = { w: o.w || 390, h: o.h || 844, dark: !!o.dark, stub: Object.assign({ library: LIB }, o.stub || {}) };
  ['seed', 'query', 'prog', 'spine'].forEach(k => { if (o[k]) opts[k] = o[k]; });
  const r = await H.openProgram(browser, opts);
  r.p.setDefaultTimeout(8000);
  return r;
}
const sleep = (p, ms) => p.waitForTimeout(ms);
const goLib = async p => { await p.evaluate(() => goLibrary()); await sleep(p, 900); };
const where = p => p.evaluate(() => ({
  screen: document.querySelector('.screen.active').id,
  pane: ['sessions', 'playbook', 'exercises'].find(x => !document.getElementById('lib-' + x).hidden) || null,
  y: Math.round(scrollY),
}));
const reload = async p => { await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForFunction(() => document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 }); await sleep(p, 400); };
const OVERLAP = `(() => {
  const b = document.getElementById('global-account'), r = b.getBoundingClientRect();
  if (!r.width) return { hidden: true, hits: [] };
  const hits = [], tw = document.createTreeWalker(document.querySelector('.screen.active'), NodeFilter.SHOW_TEXT);
  for (let n; (n = tw.nextNode());) {
    if (!n.textContent.trim() || !n.parentElement) continue;
    const cs = getComputedStyle(n.parentElement);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const range = document.createRange(); range.selectNodeContents(n);
    for (const q of range.getClientRects()) {
      if (q.width < 1 || q.height < 1) continue;
      if (q.left < r.right && q.right > r.left && q.top < r.bottom && q.bottom > r.top) hits.push(n.textContent.trim().slice(0, 28));
    }
  }
  return { hidden: false, hits, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) };
})()`;

(async () => {
  const browser = await H.launch();

  // ── 1. no doors; the header; the switch ──
  {
    const { ctx, p } = await open(browser);
    await goLib(p);
    const a = await p.evaluate(() => {
      const tabs = [...document.querySelectorAll('#lib-switch [role=tab]')];
      const eb = document.querySelector('#screen-workouts .lib-head .prog-eyebrow'), h1 = document.querySelector('#screen-workouts .lib-head h1');
      return {
        doors: !!document.getElementById('lib-doors') || !!document.querySelector('.lib-door') || typeof enterWorld !== 'undefined' || typeof exitWorld !== 'undefined',
        arrows: document.querySelectorAll('#screen-workouts .nav-back').length, heads: document.querySelectorAll('#screen-workouts .w-head, #screen-workouts .pb-hero, #screen-workouts .pb-court').length,
        role: document.getElementById('lib-switch').getAttribute('role'),
        tabs: tabs.map(b => ({ w: b.querySelector('.lib-tab-w').textContent, sel: b.getAttribute('aria-selected'), h: Math.round(b.getBoundingClientRect().height), n: b.querySelector('.lib-tab-n').textContent.trim(), id: b.querySelector('.lib-tab-n').id, ctl: b.getAttribute('aria-controls') })),
        panels: ['sessions', 'playbook', 'exercises'].map(x => { const e = document.getElementById('lib-' + x); return e.getAttribute('role') + ':' + e.hidden; }),
        eb: eb.textContent.trim(), ebCase: getComputedStyle(eb).textTransform, ebDot: getComputedStyle(eb, '::before').width, title: h1.textContent.trim(), titleSize: getComputedStyle(h1).fontSize,
        stored: localStorage.getItem('lib_pane'),
      };
    });
    t.check('no doors page: no #lib-doors, no door, no enterWorld() or exitWorld(), no ← anywhere in the Library tab', !a.doors && a.arrows === 0 && a.heads === 0, JSON.stringify([a.doors, a.arrows, a.heads]));
    t.check('the header is Progress\'s: the eyebrow "Train it, learn it, know it" in capitals with its dot, the title Library at 44 px',
      /^Train it, learn it, know it$/.test(a.eb) && a.ebCase === 'uppercase' && a.ebDot === '7px' && a.title === 'Library' && a.titleSize === '44px', JSON.stringify([a.eb, a.ebCase, a.ebDot, a.title, a.titleSize]));
    t.check('ONE switch: a tablist of three tabs, Sessions · Playbook · Exercises, each with aria-selected, aria-controls and 44 px at the least',
      a.role === 'tablist' && a.tabs.map(x => x.w).join(' · ') === 'Sessions · Playbook · Exercises' && a.tabs.every(x => x.h >= 44 && x.ctl) && a.tabs.filter(x => x.sel === 'true').length === 1, JSON.stringify(a.tabs));
    t.check('opens on Sessions by default (nothing stored yet), the other panes hidden, each pane a tabpanel', a.tabs[0].sel === 'true' && a.panels.join() === 'tabpanel:false,tabpanel:true,tabpanel:true' && a.stored === null, JSON.stringify([a.panels, a.stored]));
    t.check('the counts keep their ids and show the numbers only (42 sessions, 21 reads, the Spine\'s entries)',
      a.tabs.map(x => x.id).join() === 'sessions-count,playbook-count,exercises-count' && a.tabs.map(x => x.n).join() === `${sessions.length},${reads.length},${H.SPINE.length}`, JSON.stringify(a.tabs.map(x => [x.id, x.n])));
    t.check('no page errors (the switch)', p.errs.length === 0, p.errs.join(' | '));

    // ── 2. the pane memory ──
    await p.evaluate(() => document.getElementById('lib-tab-playbook').click()); await sleep(p, 600);
    let w = await where(p);
    const sel = await p.evaluate(() => [...document.querySelectorAll('#lib-switch [role=tab]')].map(b => b.getAttribute('aria-selected')).join());
    t.check('tapping Playbook shows the Playbook pane and moves aria-selected', w.pane === 'playbook' && sel === 'false,true,false', JSON.stringify([w, sel]));
    const keys = await p.evaluate(() => ({ v: localStorage.getItem('lib_pane'), twins: Object.keys(localStorage).filter(k => /lib_pane/.test(k) && k !== 'lib_pane') }));
    t.check('the pane is remembered under lib_pane, a key that is NOT athlete-prefixed (so it is never synced)', keys.v === 'playbook' && keys.twins.length === 0, JSON.stringify(keys));
    await p.evaluate(() => window.scrollTo(0, 500));
    await p.evaluate(() => document.getElementById('lib-tab-sessions').click()); await sleep(p, 600);
    w = await where(p);
    t.check('switching panes keeps no scroll (the Sessions pane opens at the top)', w.pane === 'sessions' && w.y === 0, JSON.stringify(w));
    await p.evaluate(() => document.getElementById('lib-tab-exercises').click()); await sleep(p, 400);
    await reload(p); await goLib(p);
    w = await where(p);
    t.check('after a reload the Library tab opens on the last pane used (Exercises)', w.screen === 'screen-workouts' && w.pane === 'exercises', JSON.stringify(w));
    await p.evaluate(() => localStorage.setItem('lib_pane', 'nonsense'));
    await reload(p); await goLib(p);
    w = await where(p);
    t.check('a stored value that is not a pane is ignored: Sessions', w.pane === 'sessions', JSON.stringify(w));
    // the arrow keys move along the tablist
    await p.evaluate(() => document.getElementById('lib-tab-sessions').focus());
    await p.keyboard.press('ArrowRight'); await sleep(p, 400);
    w = await where(p);
    t.check('ArrowRight on the tablist moves to the next pane and focuses its tab', w.pane === 'playbook' && await p.evaluate(() => document.activeElement.id) === 'lib-tab-playbook', JSON.stringify(w));
    t.check('no page errors (the memory)', p.errs.length === 0, p.errs.join(' | '));

    // ── 3. Back from a pane goes Home, like any tab ──
    for (const pane of ['sessions', 'playbook', 'exercises']) {
      await p.evaluate(() => goTo('home')); await sleep(p, 250);
      await p.evaluate(pn => { goLibrary(); return setLibPane(pn); }, pane); await sleep(p, 600);
      const before = await where(p);
      await p.goBack(); await sleep(p, 500);
      const after = await where(p);
      t.check(`the phone's Back from the ${pane} pane goes Home (NAV-01)`, before.screen === 'screen-workouts' && before.pane === pane && after.screen === 'screen-home', JSON.stringify([before, after]));
    }
    t.check('topLayer() no longer looks for the panes\' ←: from a pane it is the way Home', await p.evaluate(() => { goTo('home'); goLibrary(); return typeof topLayer() === 'function' && !document.querySelector('#screen-workouts .nav-back'); }));
    await ctx.close();
  }

  // ── 4. a session and an article come back to their pane at the same scroll ──
  {
    const { ctx, p } = await open(browser);
    await goLib(p);
    for (const how of ['its ←', 'the phone\'s Back']) {
      await p.evaluate(() => { goLibrary(); window.scrollTo(0, 450); });
      await sleep(p, 500);
      await p.evaluate(() => document.querySelectorAll('#lib-sessions .shelf-row')[1].click()); await sleep(p, 500);
      const s = await where(p);
      if (how === 'its ←') await p.evaluate(() => document.querySelector('#screen-workout .nav-back').click()); else await p.goBack();
      await sleep(p, 600);
      const b = await where(p);
      t.check(`Sessions: a session opened at scroll 450 comes back with ${how} to the Sessions pane at the same scroll`, s.screen === 'screen-workout' && b.screen === 'screen-workouts' && b.pane === 'sessions' && Math.abs(b.y - 450) <= 2, JSON.stringify([s, b]));
    }
    for (const how of ['its ←', 'the phone\'s Back']) {
      await p.evaluate(() => { goLibrary(); return setLibPane('playbook'); });
      await sleep(p, 500);
      await p.evaluate(() => window.scrollTo(0, 520)); await sleep(p, 200);
      await p.evaluate(() => document.querySelectorAll('#lib-playbook .pb-row')[4].click()); await sleep(p, 600);
      const s = await where(p);
      if (how === 'its ←') await p.evaluate(() => document.querySelector('#screen-article .nav-back').click()); else await p.goBack();
      await sleep(p, 600);
      const b = await where(p);
      t.check(`Playbook: an article opened at scroll 520 comes back with ${how} to the Playbook pane at the same scroll`, s.screen === 'screen-article' && b.screen === 'screen-workouts' && b.pane === 'playbook' && Math.abs(b.y - 520) <= 2, JSON.stringify([s, b]));
    }
    await p.evaluate(() => goLibrary()); await sleep(p, 500);
    const top = await where(p);
    t.check('the Library tab itself always starts at the top (the scroll is forgotten)', top.y === 0 && top.pane === 'playbook', JSON.stringify(top));

    // ── 5. a suggestion's ← goes back to where it was offered ──
    await p.evaluate(async () => { goTo('home'); window.weekSuggWanted = () => true; await paintWeekSugg(); });
    await sleep(p, 500);
    const sug = await p.evaluate(() => { const b = document.querySelector('#home-sugg-wrap .lib-sugg'); return b ? { file: b.dataset.file, text: b.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) } : null; });
    t.check('Home offers the week-done extra (a .lib-sugg row)', !!sug && /everyday-mobility/.test(sug.file), JSON.stringify(sug));
    for (const how of ['its ←', 'the phone\'s Back']) {
      await p.evaluate(async () => { goTo('home'); await paintWeekSugg(); }); await sleep(p, 300);
      await p.evaluate(() => document.querySelector('#home-sugg-wrap .lib-sugg').click()); await sleep(p, 600);
      const s = await where(p);
      if (how === 'its ←') await p.evaluate(() => document.querySelector('#screen-workout .nav-back').click()); else await p.goBack();
      await sleep(p, 600);
      const b = await where(p);
      t.check(`a suggested session's ${how === 'its ←' ? '←' : 'Back'} goes back to Home where it was offered, not to the Library`, s.screen === 'screen-workout' && b.screen === 'screen-home', JSON.stringify([s, b]));
    }
    // the finished card's suggestion goes back to the day, not Home's overview
    const fin = await p.evaluate(async () => {
      goTo('home'); openDayView('1'); await new Promise(r => setTimeout(r, 300));
      const card = document.getElementById('complete-1'); if (!card) return { card: false };
      const b = document.createElement('button'); b.dataset.file = 'mobility/everyday-mobility'; card.appendChild(b); openLibSugg(b);
      await new Promise(r => setTimeout(r, 500));
      const on = document.querySelector('.screen.active').id;
      document.querySelector('#screen-workout .nav-back').click();
      await new Promise(r => setTimeout(r, 500));
      return { card: true, on, back: document.querySelector('.screen.active').id, day: !document.getElementById('day-view').hidden };
    });
    t.check('a suggestion offered on a finished day card comes back to that day', fin.card && fin.on === 'screen-workout' && fin.back === 'screen-home' && fin.day, JSON.stringify(fin));
    t.check('no page errors (back to the pane)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. the shelves: 3 shown, All N ›, Show fewer ‹; the cover band ──
  {
    const { ctx, p } = await open(browser);
    await goLib(p);
    const sh = await p.evaluate(() => [...document.querySelectorAll('#lib-sessions .w-shelf')].map(s => {
      const band = s.querySelector('.shelf-band'), vis = () => [...s.querySelectorAll('.shelf-row')].filter(r => r.getClientRects().length).length;
      const all = s.querySelector('.shelf-all');
      const r = { n: s.querySelectorAll('.shelf-row').length, tag: band.tagName, exp: band.getAttribute('aria-expanded'), all: all ? all.textContent : null, vis: vis(), eyebrow: band.querySelector('.shelf-n').textContent, name: band.querySelector('.shelf-t').textContent, h: Math.round(band.getBoundingClientRect().height) };
      if (band.tagName === 'BUTTON') { band.click(); r.openVis = vis(); r.openAll = band.querySelector('.shelf-all').textContent; r.openExp = band.getAttribute('aria-expanded'); band.click(); r.shutVis = vis(); r.shutAll = band.querySelector('.shelf-all').textContent; }
      return r;
    }));
    t.check('seven shelves, one per category, in order, each with its sessions', sh.length === LIB.workout.length && sh.map(s => s.n).join() === LIB.workout.map(c => c.items.length).join(), JSON.stringify(sh.map(s => [s.name, s.n])));
    t.check('a shelf of more than three shows 3 rows and "All N ›"; its band is a button with aria-expanded=false', sh.filter(s => s.n > 3).every(s => s.tag === 'BUTTON' && s.vis === 3 && s.exp === 'false' && s.all === `All ${s.n} ›`), JSON.stringify(sh.map(s => [s.n, s.tag, s.vis, s.exp, s.all])));
    t.check('tapping the band shows them all and says "Show fewer ‹" (aria-expanded=true); tapping again folds it back', sh.filter(s => s.n > 3).every(s => s.openVis === s.n && s.openAll === 'Show fewer ‹' && s.openExp === 'true' && s.shutVis === 3 && s.shutAll === `All ${s.n} ›`), JSON.stringify(sh.map(s => [s.openVis, s.openAll, s.shutVis])));
    t.check('a shelf of three has a plain band: no button, no pill, all three shown', sh.filter(s => s.n <= 3).length > 0 && sh.filter(s => s.n <= 3).every(s => s.tag === 'DIV' && s.all === null && s.vis === s.n), JSON.stringify(sh.filter(s => s.n <= 3)));
    t.check('the band\'s eyebrow is "NN · Train" (the shelf\'s number), then the shelf\'s name; every band is 44 px or more', sh.every((s, i) => s.eyebrow === String(i + 1).padStart(2, '0') + ' · Train' && s.name === LIB.workout[i].title && s.h >= 44), JSON.stringify(sh.map(s => [s.eyebrow, s.name, s.h])));
    const look = await p.evaluate(() => {
      const s = document.querySelector('#lib-sessions .w-shelf'), band = s.querySelector('.shelf-band'), img = band.querySelector('.shelf-img'), row = s.querySelector('.shelf-row');
      const c = (e, ps) => getComputedStyle(e, ps), gut = parseFloat(c(document.body).getPropertyValue('--g'));
      const br = band.getBoundingClientRect(), rr = row.getBoundingClientRect();
      return { bg: c(band).backgroundImage.slice(0, 15), radius: c(band).borderRadius, left: Math.round(br.left), right: Math.round(innerWidth - br.right), gut, rowLeft: Math.round(rr.left), blend: c(img).mixBlendMode, op: c(img).opacity, src: img.getAttribute('src'),
        eb: c(band.querySelector('.shelf-n')).fontFamily.slice(0, 11), ebDot: c(band.querySelector('.shelf-n'), '::before').backgroundColor, ebCase: c(band.querySelector('.shelf-n')).textTransform, title: c(band.querySelector('.shelf-t')).textTransform,
        pill: c(band.querySelector('.shelf-all')).boxShadow.slice(0, 40),
        rows: [...document.querySelectorAll('#lib-sessions .shelf-row')].slice(0, 3).map(r => ({ w: Math.round(r.getBoundingClientRect().height), bg: c(r).backgroundColor, name: c(r.querySelector('.sr-name')).fontWeight + ' ' + c(r.querySelector('.sr-name')).fontSize, nameFam: c(r.querySelector('.sr-name')).fontFamily.slice(0, 7), forSize: c(r.querySelector('.sr-for')).fontSize,
          meta: c(r.querySelector('.sr-meta')).fontFamily.slice(0, 11) + ' ' + c(r.querySelector('.sr-meta')).textTransform, go: r.querySelector('.sr-go').textContent, border: c(r).borderTopWidth })),
        second: c(document.querySelectorAll('#lib-sessions .shelf-row')[1]).borderTopWidth, cards: document.querySelectorAll('#lib-sessions .shelf-row').length };
    });
    t.check('the band is a cover: --hero (a radial gradient), 12 px corners, inside the gutter, the shelf\'s picture graded in (luminosity, 0.7), the eyebrow in Space Mono capitals with a mint dot',
      look.bg === 'radial-gradient' && look.radius === '12px' && look.left === look.gut && look.right === look.gut && look.blend === 'luminosity' && look.op === '0.7' && /art\/library\/sessions-strength/.test(look.src) && /^"?Space Mono/.test(look.eb) && look.ebCase === 'uppercase' && look.ebDot === 'rgb(109, 190, 149)' && look.title === 'uppercase', JSON.stringify(look));
    t.check('the sessions are paper rows on the gutter: no white card, a hairline between rows and none above the first, the name in Barlow 600 at 18 px, what it is for at 13 px, the meta in Space Mono capitals, a grey ›',
      look.rows.every(r => r.bg === 'rgba(0, 0, 0, 0)' && +r.w >= 64 && r.name === '600 18px' && /^"?Barlow/.test(r.nameFam) && r.forSize === '13px' && /^"?Space Mono uppercase$/.test(r.meta) && r.go === '›') && look.rows[0].border === '0px' && look.second === '1px' && look.rowLeft === look.gut, JSON.stringify(look.rows));
    t.check('no page errors (the shelves)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 7. the ✓ labels only where libTickLabel() gives them (the habit switched on in AA Proof); none in the demo ──
  for (const [label, cfg] of [['strength only (the default)', null], ['Mobility and Breathe switched on', { on: { mobility: true, breathe: true } }]]) {
    const { ctx, p } = await open(browser, cfg ? { seed: { _hab_cfg: cfg } } : {});
    await goLib(p);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#lib-sessions .shelf-row')].map(r => ({ file: r.dataset.file, tick: (r.querySelector('.sr-tick') || {}).textContent || '', meta: r.querySelector('.sr-meta').textContent })));
    const want = ca => ca === 'strength' ? 'Session' : ca === 'mobility' && cfg ? 'Mobility' : ca === 'breathe' && cfg ? 'Breathe' : '';
    const bad = rows.filter(r => { const s = sessions.find(x => x.key === r.file); return !s || r.tick !== (want(s.it.countsAs) ? '✓ ' + want(s.it.countsAs) : ''); });
    t.check(`✓ labels (${label}): exactly where the habit will tick, on all ${rows.length} rows`, rows.length === sessions.length && bad.length === 0 && rows.some(r => r.tick) && rows.some(r => !r.tick), JSON.stringify(bad.slice(0, 3)));
    t.check(`the mono line reads minutes · kit, then the tick (${label})`, rows.every(r => /^\d+ min · [A-Za-z ]+( · ✓ [A-Za-z]+)?$/i.test(r.meta.replace(/\s+/g, ' ').trim())), JSON.stringify(rows.slice(0, 3)));
    await ctx.close();
  }
  {
    const prog = H.fixture();
    const { ctx, p } = await open(browser, { query: '?client=demo', prog, stub: { demo: prog } });
    await goLib(p);
    const d = await p.evaluate(() => ({ demo: !!window.IS_DEMO, ticks: document.querySelectorAll('#lib-sessions .sr-tick').length, rows: document.querySelectorAll('#lib-sessions .shelf-row').length }));
    t.check('in the demo there is no record to write to: no ✓ label on any row', d.demo && d.ticks === 0 && d.rows === sessions.length, JSON.stringify(d));
    await p.evaluate(() => openWorkout('strength/full-body-power')); await sleep(p, 600);
    t.check('in the demo a session has no Mark as done', await p.evaluate(() => document.getElementById('ws-finish').hidden === true));
    await ctx.close();
  }

  // ── 8. Playbook: the latest read as the cover, categories with reads only, paper rows, no clay ──
  {
    const { ctx, p } = await open(browser);
    await goLib(p);
    await p.evaluate(() => setLibPane('playbook')); await sleep(p, 700);
    const withReads = LIB.article.filter(c => c.items.length), without = LIB.article.filter(c => !c.items.length);
    const a = await p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), pane = document.getElementById('lib-playbook');
      const cover = pane.querySelector('.pb-cover'), secs = [...pane.querySelectorAll('.lib-sec')], rows = [...pane.querySelectorAll('.pb-row')];
      const CLAYS = ['rgb(199, 85, 47)', 'rgb(181, 70, 31)', 'rgb(224, 107, 67)', 'rgb(194, 81, 44)'];
      const clay = [...pane.querySelectorAll('*')].filter(e => CLAYS.includes(c(e).color) || CLAYS.includes(c(e).backgroundColor));
      return {
        cover: cover && { tag: cover.tagName, eb: cover.querySelector('.pb-eb').textContent, title: cover.querySelector('.pb-title').textContent, min: cover.querySelector('.pb-min').textContent, bg: c(cover).backgroundImage.slice(0, 15), radius: c(cover).borderRadius, file: cover.dataset.file, titleCase: c(cover.querySelector('.pb-title')).textTransform, h: Math.round(cover.getBoundingClientRect().height) },
        secs: secs.map(s => ({ t: s.querySelector('.lib-sec-t').textContent, n: s.querySelector('.lib-sec-n').textContent, color: c(s.querySelector('.lib-sec-t')).color, line: c(s.querySelector('.lib-sec-t'), '::after').height })),
        rows: rows.length, kids: rows.map(r => r.parentElement.previousElementSibling.querySelector('.lib-sec-t').textContent),
        row: rows[0] && { name: r0(rows[0]), meta: rows[0].querySelector('.sr-meta').textContent, case: c(rows[0].querySelector('.sr-meta')).textTransform, go: rows[0].querySelector('.sr-go').textContent, bg: c(rows[0]).backgroundColor },
        clay: clay.map(e => e.className).slice(0, 5), old: pane.querySelectorAll('.pb-hero, .pb-dn, .pb-latest, .pb-block, .pb-disp').length, soon: /coming soon/i.test(pane.textContent), nav: pane.querySelectorAll('.nav-back').length,
      };
      function r0(r) { return r.querySelector('.sr-name').textContent; }
    });
    const firstRead = withReads[0].items[0];
    t.check('the cover is the latest read: "Latest · Training", its title, its minutes, --hero, 16 px corners, the whole cover one button',
      a.cover.tag === 'BUTTON' && a.cover.eb === 'Latest · ' + withReads[0].title && a.cover.title === firstRead.title && a.cover.min === firstRead.readMins + ' min read' && a.cover.bg === 'radial-gradient' && a.cover.radius === '16px' && a.cover.titleCase === 'uppercase' && a.cover.h >= 44, JSON.stringify(a.cover));
    t.check('only categories that have reads are drawn (4), each a green section title with a hairline and its count at the right; For Coaches, Mental and Supplements are not there, and nothing says "coming soon"',
      a.secs.map(s => s.t).join() === withReads.map(c => c.title).join() && a.secs.every((s, i) => s.n === withReads[i].items.length + (withReads[i].items.length === 1 ? ' read' : ' reads') && s.color === 'rgb(14, 74, 54)' && s.line === '1px') && without.every(c => !a.secs.some(s => s.t === c.title)) && without.length === 3 && !a.soon, JSON.stringify([a.secs, a.soon]));
    t.check(`every read is a paper row under its category (${reads.length}): the title in Barlow, "N min read" in mono capitals, a ›`, a.rows === reads.length && a.kids.join('|') === [].concat(...withReads.map(c => c.items.map(() => c.title))).join('|') && /min read$/.test(a.row.meta) && a.row.case === 'uppercase' && a.row.go === '›' && a.row.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(a.row));
    t.check('no clay header, no clay tiles: nothing in the pane is drawn in clay, and the old hero, number tiles and latest card are gone', a.clay.length === 0 && a.old === 0 && a.nav === 0, JSON.stringify([a.clay, a.old, a.nav]));
    await p.evaluate(() => document.querySelector('#lib-playbook .pb-cover').click()); await sleep(p, 700);
    const open1 = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, title: document.getElementById('ar-title').textContent }));
    t.check('the cover opens its article', open1.screen === 'screen-article' && open1.title === firstRead.title, JSON.stringify(open1));
    t.check('no page errors (the Playbook)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 9. Exercises: search and chips filter, the rows, the About sheet ──
  {
    const pattern = { 'barbell-back-squat': 'squat', 'box-jump': 'jump-land', 'dumbbell-bulgarian-split-squat': 'single-leg', 'half-kneeling-pallof-press': 'anti-rotation', 'side-plank': 'anti-lateral-flexion' };
    const spine = H.SPINE.map(e => Object.assign({}, e, { pattern: pattern[e.id] })).concat([{ id: 'goblet-squat', name: 'Goblet Squat', aliases: [], equipment: ['dumbbell'], cues: { good: ['Elbows inside the knees'], bad: [] }, purpose: 'A squat you can learn.', pattern: 'squat' }]);
    const { ctx, p } = await open(browser, { spine });
    await goLib(p);
    await p.evaluate(() => setLibPane('exercises')); await sleep(p, 500);
    const rows = () => p.evaluate(() => [...document.querySelectorAll('#xl-list .xl-row')].map(r => r.querySelector('b').textContent));
    const base = await rows();
    const a = await p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), q = document.getElementById('xl-q'), chips = [...document.querySelectorAll('#xl-chips .xl-chip')], row = document.querySelector('#xl-list .xl-row.mine');
      const tools = document.querySelector('.xl-tools');
      return {
        q: { h: Math.round(q.getBoundingClientRect().height), size: c(q).fontSize, border: c(q).borderTopColor, bg: c(q).backgroundColor, radius: c(q).borderRadius, ph: q.placeholder },
        chips: chips.map(b => ({ t: b.textContent, on: b.classList.contains('on'), h: Math.round(b.getBoundingClientRect().height), font: c(b).fontFamily.slice(0, 22), size: c(b).fontSize, pill: c(b, '::before').borderRadius, fill: c(b, '::before').backgroundImage.slice(0, 15), color: c(b).color })),
        row: row && { name: c(row.querySelector('b')).fontWeight + ' ' + c(row.querySelector('b')).fontSize, tag: row.querySelector('small em') && { t: row.querySelector('small em').textContent, color: c(row.querySelector('small em')).color, fam: c(row.querySelector('small em')).fontFamily.slice(0, 11), up: c(row.querySelector('small em')).textTransform }, arr: row.querySelector('.xl-arr').textContent, bg: c(row).backgroundColor, h: Math.round(row.getBoundingClientRect().height) },
        sticky: c(tools).position, groups: [...document.querySelectorAll('#xl-list .xl-group')].map(g => g.textContent), heads: document.querySelectorAll('#lib-exercises .w-head').length,
      };
    });
    t.check('the search box is the set table\'s input: white, edged --field (#A89F92), 16 px text, 48 px tall', a.q.h === 48 && a.q.size === '16px' && a.q.border === 'rgb(168, 159, 146)' && a.q.bg === WHITE && a.q.radius === '10px' && a.q.ph === 'Search exercises', JSON.stringify(a.q));
    t.check('the chips are ONE pill style (the same size and font, a pill drawn inside a 44 px control), the selected one (All) the green fill',
      a.chips.length === 2 + new Set(Object.values(pattern)).size && a.chips.every(c => c.h >= 44 && c.size === '15px' && /^"?Barlow Condensed/.test(c.font) && c.pill === '999px') && a.chips.filter(c => c.on).length === 1 && a.chips[0].on && a.chips[0].fill === 'radial-gradient' && a.chips.slice(1).every(c => c.fill === 'none'), JSON.stringify(a.chips));
    t.check('the list is paper rows: the name in Barlow 600 at 18 px, "In your plan" a small green Space Mono capitals tag, a ›; the group titles are green with a hairline',
      a.row && a.row.name === '600 18px' && a.row.tag.t === 'In your plan' && a.row.tag.color === 'rgb(14, 74, 54)' && /^"?Space Mono/.test(a.row.tag.fam) && a.row.tag.up === 'uppercase' && a.row.arr === '›' && a.row.bg === 'rgba(0, 0, 0, 0)' && a.row.h >= 64 && a.heads === 0, JSON.stringify(a.row));
    t.check('all six exercises are listed, this athlete\'s own first and grouped (In your plan · 5, Everything else · 1), as before', base.length === 6 && base[5] === 'Goblet Squat' && a.groups.join(' | ') === 'In your plan · 5 | Everything else · 1', JSON.stringify([base, a.groups]));
    // search
    await p.fill('#xl-q', 'squat'); await sleep(p, 300);
    const sq = await rows();
    t.check('typing in the search filters the list (squat: the back squat, the split squat and the goblet squat)', sq.length === 3 && sq.every(n => /squat/i.test(n)), JSON.stringify(sq));
    await p.fill('#xl-q', 'zzzz'); await sleep(p, 300);
    t.check('a search with no match says so, in a plain line', await p.evaluate(() => /Nothing matches/.test(document.querySelector('#xl-list .xl-empty').textContent) && !document.querySelector('#xl-list .xl-row')));
    await p.fill('#xl-q', ''); await sleep(p, 300);
    // chips
    await p.evaluate(() => [...document.querySelectorAll('#xl-chips .xl-chip')].find(b => b.textContent === 'Single leg').click()); await sleep(p, 300);
    const sl = await rows(), on = await p.evaluate(() => [...document.querySelectorAll('#xl-chips .xl-chip.on')].map(b => b.textContent));
    t.check('a pattern chip filters the list and becomes the selected one', sl.join() === 'Dumbbell Bulgarian Split Squat' && on.join() === 'Single leg', JSON.stringify([sl, on]));
    await p.evaluate(() => [...document.querySelectorAll('#xl-chips .xl-chip')].find(b => b.textContent === 'In your plan').click()); await sleep(p, 300);
    const mine = await rows();
    t.check('"In your plan" lists only the exercises in the current programme (not the goblet squat)', mine.length === 5 && mine.includes('Barbell Back Squat') && !mine.includes('Goblet Squat'), JSON.stringify(mine));
    await p.evaluate(() => [...document.querySelectorAll('#xl-chips .xl-chip')].find(b => b.textContent === 'All').click()); await sleep(p, 300);
    // a row opens the About sheet
    await p.evaluate(() => document.querySelector('#xl-list .xl-row[data-id="barbell-back-squat"]').click()); await sleep(p, 600);
    const sheet = await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return { shown: ov.classList.contains('visible'), text: ov.querySelector('.readiness-modal').textContent.replace(/\s+/g, ' ').slice(0, 60) }; });
    t.check('a row opens the About sheet for that exercise', sheet.shown && /Barbell Back Squat/.test(sheet.text), JSON.stringify(sheet));
    t.check('the sheet\'s Back closes it and the Exercises pane is still there', await (async () => { await p.goBack(); await sleep(p, 500); const w = await where(p); const o = await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible')); return !o && w.screen === 'screen-workouts' && w.pane === 'exercises'; })());
    t.check('no page errors (Exercises)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 10. a Library session: the cover, Before you start (open once, folded after), Why this session ──
  {
    const wk = sessions.find(s => s.key === FULL), oth = sessions.find(s => s.key === OTHER);
    const { ctx, p } = await open(browser);
    await goLib(p);
    const info = () => p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), btn = document.getElementById('ws-before-btn'), body = document.getElementById('ws-before-body'), sec = document.getElementById('ws-before');
      const vis = e => !!e.getClientRects().length;
      return { sec: vis(sec), row: vis(btn), exp: btn.getAttribute('aria-expanded'), bodyVis: vis(body), paras: [...body.querySelectorAll('p')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), parasVis: [...body.querySelectorAll('p')].filter(vis).length,
        label: document.getElementById('ws-before-h').textContent, line: btn.querySelector('.wb-l').textContent, rowH: Math.round(btn.getBoundingClientRect().height),
        seen: localStorage.getItem('ws_before_seen'), twins: Object.keys(localStorage).filter(k => /ws_before_seen/.test(k) && k !== 'ws_before_seen'), inWhy: !!document.getElementById('ws-why').contains(sec) };
    });
    const want = wk.it.before.map(r => (typeof r === 'string' ? r : (r.label ? r.label + ' ' : '') + r.text).replace(/\s+/g, ' ').trim());
    await p.evaluate(k => openWorkout(k), FULL); await sleep(p, 700);
    const f1 = await info();
    t.check('Before you start is OPEN the first time a session is opened: the row, the heading, and all the rows\' text, intact',
      f1.sec && f1.row && f1.exp === 'true' && f1.bodyVis && f1.paras.length === want.length && f1.paras.every((x, i) => x === want[i]) && f1.parasVis === want.length && f1.label === 'Before you start' && f1.line === 'Safety checks: what to stop for', JSON.stringify([f1.exp, f1.paras.length, f1.label, f1.line]));
    t.check('the phone remembers it under ws_before_seen = {"<workout id>": 1}, a key that is not athlete-prefixed', JSON.parse(f1.seen)[wk.it.id] === 1 && f1.twins.length === 0, JSON.stringify([f1.seen, f1.twins]));
    t.check('the text is in its own section, never inside "Why this session"', !f1.inWhy);
    // Why this session closing must not touch it
    await p.evaluate(() => document.getElementById('ws-why-toggle').click()); await sleep(p, 200);
    const why1 = await p.evaluate(() => ({ closed: document.getElementById('ws-why').classList.contains('is-closed'), exp: document.getElementById('ws-why-toggle').getAttribute('aria-expanded'), key: localStorage.getItem('ws_why_off'), body: !!document.getElementById('ws-why-body').getClientRects().length }));
    const f1b = await info();
    t.check('closing "Why this session" (a fold row, remembered for every session) hides none of the Before-you-start text', why1.closed && why1.exp === 'false' && why1.key === '1' && !why1.body && f1b.bodyVis && f1b.parasVis === want.length, JSON.stringify([why1, f1b.parasVis]));
    await p.evaluate(() => document.getElementById('ws-why-toggle').click());
    // second open: folded
    await p.evaluate(() => goTo('workouts')); await sleep(p, 300);
    await p.evaluate(k => openWorkout(k), FULL); await sleep(p, 700);
    const f2 = await info();
    t.check('the second time it is ONE FOLDED ROW titled Before you start (aria-expanded=false), its text hidden, the row 64 px tall or more', f2.sec && f2.row && f2.exp === 'false' && !f2.bodyVis && f2.parasVis === 0 && f2.label === 'Before you start' && f2.rowH >= 64, JSON.stringify([f2.exp, f2.bodyVis, f2.rowH]));
    await p.evaluate(() => document.getElementById('ws-before-btn').click()); await sleep(p, 200);
    const f3 = await info();
    t.check('a tap opens it in place with the same text', f3.exp === 'true' && f3.bodyVis && f3.paras.every((x, i) => x === want[i]) && f3.parasVis === want.length, JSON.stringify([f3.exp, f3.parasVis]));
    await p.evaluate(() => document.getElementById('ws-before-btn').click()); await sleep(p, 200);
    t.check('and a second tap folds it again', (await info()).exp === 'false');
    // per session
    await p.evaluate(() => goTo('workouts')); await sleep(p, 200);
    await p.evaluate(k => openWorkout(k), OTHER); await sleep(p, 700);
    const o1 = await info();
    t.check('it is per session: a session never opened before is open the first time', o1.exp === 'true' && o1.parasVis === oth.it.before.length, JSON.stringify([o1.exp, o1.parasVis]));
    const seen = await p.evaluate(() => JSON.parse(localStorage.getItem('ws_before_seen')));
    t.check('both sessions are in the memory', seen[wk.it.id] === 1 && seen[oth.it.id] === 1, JSON.stringify(seen));
    // after a reload the memory is still there
    await reload(p); await goLib(p);
    await p.evaluate(k => openWorkout(k), FULL); await sleep(p, 700);
    t.check('after a reload (a new run of the app) the first session is still folded', (await info()).exp === 'false');
    // the cover
    const cv = await p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), hd = document.querySelector('#screen-workout .ws-header'), img = document.getElementById('ws-img'), back = document.querySelector('#screen-workout .nav-back'), gut = parseFloat(c(document.body).getPropertyValue('--g'));
      const eb = document.getElementById('ws-eyebrow'), ti = document.getElementById('ws-title'), me = document.getElementById('ws-meta');
      const br = back.getBoundingClientRect(), cap = document.querySelector('#screen-workout .ws-cap');
      return { bg: c(hd).backgroundImage.slice(0, 15), imgShown: !img.hidden, src: img.getAttribute('src'), blend: c(img).mixBlendMode, op: c(img).opacity,
        back: { w: Math.round(br.width), h: Math.round(br.height), left: Math.round(br.left), top: Math.round(br.top - hd.getBoundingClientRect().top), bg: c(back).backgroundColor, radius: c(back).borderRadius, label: back.getAttribute('aria-label'), text: back.textContent },
        eb: eb.textContent, ebDot: c(eb, '::before').backgroundColor, ebFam: c(eb).fontFamily.slice(0, 11), title: ti.textContent, titleCase: c(ti).textTransform, titleFam: c(ti).fontFamily.slice(0, 22), meta: me.textContent, metaFam: c(me).fontFamily.slice(0, 11), metaCase: c(me).textTransform,
        padLeft: parseFloat(c(cap).paddingLeft), gut };
    });
    t.check('the top is a cover: --hero with the shelf\'s picture graded in (luminosity .7), ← as the day cover\'s 44 px glass button at the top left',
      cv.bg === 'radial-gradient' && cv.imgShown && /sessions-strength/.test(cv.src) && cv.blend === 'luminosity' && cv.op === '0.7' && cv.back.w === 44 && cv.back.h === 44 && cv.back.left === 8 && cv.back.top === 8 && cv.back.bg === 'rgba(0, 0, 0, 0.22)' && cv.back.radius === '50%' && cv.back.label === 'Back' && cv.back.text === '←', JSON.stringify(cv));
    t.check('the eyebrow is its focus with a mint dot, the title in capitals, the mono line "50 min · Barbell" in capitals', cv.eb === wk.it.focusTag && cv.ebDot === 'rgb(109, 190, 149)' && /^"?Space Mono/.test(cv.ebFam) && cv.title === wk.it.title && cv.titleCase === 'uppercase' && /^"?Barlow Condensed/.test(cv.titleFam) && cv.meta === wk.it.duration + ' · ' + wk.it.equipment && /^"?Space Mono/.test(cv.metaFam) && cv.metaCase === 'uppercase' && cv.padLeft === cv.gut, JSON.stringify([cv.eb, cv.title, cv.meta]));
    const bs = await p.evaluate(() => { const c = (e, ps) => getComputedStyle(e, ps), s = document.getElementById('ws-before'), k = document.querySelector('#ws-before .wb-k'), pa = document.querySelector('#ws-before-body p');
      return { bg: c(s).backgroundColor, shadow: c(s).boxShadow, kFam: c(k).fontFamily.slice(0, 11), kColor: c(k).color, kCase: c(k).textTransform, paSize: c(pa).fontSize, paColor: c(pa).color }; });
    await p.evaluate(() => document.getElementById('ws-before-btn').click()); await sleep(p, 200);
    const bs2 = await p.evaluate(() => { const c = (e, ps) => getComputedStyle(e, ps), pa = document.querySelector('#ws-before-body p'); return { paSize: c(pa).fontSize, paColor: c(pa).color, line: c(pa).lineHeight }; });
    t.check('Before you start wears the lower-day banner: a white row with a 4 px clay stripe, BEFORE YOU START in clay Space Mono capitals, the paragraphs at reading size (15 px, ink)',
      bs.bg === WHITE && /rgb\(194, 81, 44\)[^,]*0px 0px 0px 4px|inset/.test(bs.shadow) && bs.shadow.includes('rgb(194, 81, 44)') && /^"?Space Mono/.test(bs.kFam) && bs.kColor === 'rgb(181, 70, 31)' && bs.kCase === 'uppercase' && bs2.paSize === '15px' && bs2.paColor === 'rgb(26, 26, 26)', JSON.stringify([bs, bs2]));
    t.check('Why this session stays a fold: a green Space Mono label with the app\'s chevron on the paper, the intro at reading size', await p.evaluate(() => { const c = (e, ps) => getComputedStyle(e, ps), tg = document.getElementById('ws-why-toggle'), w = document.getElementById('ws-why'); return !w.hidden && /Why this session/.test(tg.textContent) && /^"?Space Mono/.test(c(tg).fontFamily) && c(tg).color === 'rgb(14, 74, 54)' && c(w).backgroundColor === 'rgba(0, 0, 0, 0)' && tg.getAttribute('aria-expanded') === 'true' && c(document.querySelector('#ws-why-body p')).fontSize === '15px'; }));
    t.check('no page errors (a session)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // storage that cannot be read or written (a private window): the card is simply open every time, the pane is Sessions
  {
    const { ctx, p } = await open(browser);
    await p.evaluate(() => {
      const og = Storage.prototype.getItem, os = localStorage.setItem;
      const blocked = k => k === 'lib_pane' || k === 'ws_before_seen';
      localStorage.getItem = k => { if (blocked(k)) throw new Error('blocked'); return og.call(localStorage, k); };
      localStorage.setItem = (k, v) => { if (blocked(k)) throw new Error('blocked'); return os.call(localStorage, k, v); };
    });
    await goLib(p);
    await p.evaluate(() => document.getElementById('lib-tab-playbook').click()); await sleep(p, 500);
    const w1 = await where(p);
    await p.evaluate(k => openWorkout(k), FULL); await sleep(p, 600);
    await p.evaluate(() => goTo('workouts')); await sleep(p, 200);
    await p.evaluate(k => openWorkout(k), FULL); await sleep(p, 600);
    const open2 = await p.evaluate(() => document.getElementById('ws-before-btn').getAttribute('aria-expanded'));
    t.check('storage blocked: the switch still works and Before you start is open every time (the safe way round), with no error', w1.pane === 'playbook' && open2 === 'true' && p.errs.length === 0, JSON.stringify([w1, open2, p.errs]));
    await ctx.close();
  }

  // ── 11. Mark as done: the screen's one primary button, its behaviour unchanged ──
  {
    const { ctx, p } = await open(browser);
    await goLib(p);
    await p.evaluate(k => openWorkout(k), FULL); await sleep(p, 700);
    const m = await p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), b = document.getElementById('ws-done-btn'), n = document.getElementById('ws-done-note'), gut = parseFloat(c(document.body).getPropertyValue('--g'));
      const r = b.getBoundingClientRect();
      return { text: b.textContent, note: n.textContent, bg: c(b).backgroundImage.slice(0, 15), color: c(b).color, w: Math.round(r.width), want: Math.round(innerWidth - 2 * gut), h: Math.round(r.height), fam: c(b).fontFamily.slice(0, 22), noteColor: c(n).color, noteBelow: n.getBoundingClientRect().top >= r.bottom, radius: c(b).borderRadius };
    });
    t.check('Mark as done is the primary green button, full width inside the gutter, 56 px tall, its note under it in grey',
      m.text === 'Mark as done' && m.bg === 'radial-gradient' && m.color === WHITE && m.w === m.want && m.h >= 56 && /^"?Barlow Condensed/.test(m.fam) && m.noteBelow && m.noteColor === 'rgb(92, 92, 92)' && m.radius === '8px' && /It ticks your Session habit in AA Proof/.test(m.note), JSON.stringify(m));
    await p.evaluate(() => document.getElementById('ws-done-btn').click()); await sleep(p, 600);
    const d = await p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), b = document.getElementById('ws-done-btn');
      const calls = (window.__STUB.params || []).filter(x => x[0] === 'log_library_session').map(x => x[1]);
      return { text: b.textContent, done: b.classList.contains('is-done'), color: c(b).color, bg: c(b).backgroundColor, note: document.getElementById('ws-done-note').textContent, calls, stored: !!localStorage.getItem('wkdone_full-body-power') };
    });
    t.check('pressing it writes the row once (log_library_session with the slug) and the done state is hollow with green text, "Done today ✓"',
      d.calls.length === 1 && d.calls[0].p_slug === 'workouts/strength/full-body-power' && d.text === 'Done today ✓' && d.done && d.color === 'rgb(14, 74, 54)' && d.bg === 'rgba(0, 0, 0, 0)' && /^Done today\. This ticks your Session habit/.test(d.note) && d.stored, JSON.stringify(d));
    t.check('no page errors (Mark as done)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 12. an article: the cover, the pull-quote callouts, a session as a door row; the deep links ──
  {
    const { ctx, p } = await open(browser, { query: '?article=pre-competition/tennis-warm-up', stub: { demo: H.fixture() } })   // a public link with no ?client= opens the demo's programme;
    await sleep(p, 1200);
    const a = await p.evaluate(() => {
      const c = (e, ps) => getComputedStyle(e, ps), hd = document.querySelector('#screen-article .ar-hero'), back = document.querySelector('#screen-article .nav-back');
      const call = document.querySelector('#ar-body .ar-callout'), door = document.querySelector('#ar-body .ar-workout-card');
      return { screen: document.querySelector('.screen.active').id, bg: c(hd).backgroundImage.slice(0, 15), eb: document.getElementById('ar-eyebrow').textContent, ebDot: c(document.getElementById('ar-eyebrow'), '::before').backgroundColor, title: document.getElementById('ar-title').textContent, titleCase: c(document.getElementById('ar-title')).textTransform, hl: document.querySelectorAll('#ar-title .hl').length,
        meta: document.getElementById('ar-meta').textContent, metaFam: c(document.getElementById('ar-meta')).fontFamily.slice(0, 11), back: { w: Math.round(back.getBoundingClientRect().width), bg: c(back).backgroundColor },
        callouts: document.querySelectorAll('#ar-body .ar-callout').length, call: call && { quote: c(call, '::before').content, qColor: c(call, '::before').color, bg: c(call).backgroundColor, border: c(call).borderLeftWidth, label: call.querySelector('.ar-cl').textContent, dataLabel: call.hasAttribute('data-label') },
        door: door && { tag: door.tagName, cls: door.className, bg: c(door).backgroundColor, radius: c(door).borderRadius, edge: c(door).borderTopWidth, l: door.querySelector('.hrow-l').textContent, v: door.querySelector('.hrow-v').textContent, a: door.querySelector('.hrow-a').textContent, h: Math.round(door.getBoundingClientRect().height), file: door.dataset.file, oldTile: document.querySelectorAll('#ar-body .ar-workout-card-icon').length },
        padLeft: parseFloat(c(document.getElementById('ar-body')).paddingLeft), gut: parseFloat(c(document.body).getPropertyValue('--g')) };
    });
    t.check('the ?article= deep link opens the article (a cover with the category as the eyebrow, the title in capitals, the minutes and date in mono, ← as the glass button)',
      a.screen === 'screen-article' && a.bg === 'radial-gradient' && a.eb === 'Pre-Competition' && a.ebDot === 'rgb(109, 190, 149)' && /^The Tennis Warm-Up$/i.test(a.title) && a.titleCase === 'uppercase' && a.hl === 0 && /min read · /.test(a.meta) && /^"?Space Mono/.test(a.metaFam) && a.back.w === 44 && a.back.bg === 'rgba(0, 0, 0, 0.22)', JSON.stringify(a));
    t.check('a callout wears the Coach\'s note pull-quote look: the clay quote mark (“), no tinted box, no side rule, the label in bold at the start of the line',
      a.callouts > 0 && a.call.quote === '"“"' && a.call.qColor === 'rgb(199, 85, 47)' && a.call.bg === 'rgba(0, 0, 0, 0)' && a.call.border === '0px' && /\.$/.test(a.call.label) && !a.call.dataLabel, JSON.stringify(a.call));
    t.check('a session inside an article is a door row (.hrow: white, a 1 px edge, 12 px corners, a green mono label over the name, a ›), not the old scoreboard card',
      a.door && a.door.tag === 'BUTTON' && /hrow/.test(a.door.cls) && a.door.bg === WHITE && a.door.radius === '12px' && a.door.edge === '1px' && a.door.l === 'Session' && /Tennis Warm-Up Routine/.test(a.door.v) && a.door.a === '›' && a.door.h >= 64 && a.door.oldTile === 0, JSON.stringify(a.door));
    t.check('the article\'s body keeps the reading layout on the gutter', a.padLeft === a.gut, JSON.stringify([a.padLeft, a.gut]));
    await p.evaluate(() => document.querySelector('#ar-body .ar-workout-card').click()); await sleep(p, 700);
    const sess = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, title: document.getElementById('ws-title').textContent }));
    t.check('the door row opens that session', sess.screen === 'screen-workout' && /Tennis Warm-Up Routine/i.test(sess.title), JSON.stringify(sess));
    await p.evaluate(() => document.querySelector('#screen-workout .nav-back').click()); await sleep(p, 500);
    const back = await where(p);
    t.check('a deep-linked article\'s ← goes to the Library (on the pane the phone remembers, else Sessions)', back.screen === 'screen-workouts' && back.pane === 'sessions', JSON.stringify(back));
    t.check('no page errors (the article)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    const w = await open(browser, { query: '?workout=mobility/everyday-mobility', stub: { demo: H.fixture() } });
    await sleep(w.p, 1200);
    const dw = await w.p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, title: document.getElementById('ws-title').textContent, img: !document.getElementById('ws-img').hidden }));
    t.check('the ?workout= deep link opens the session, on its shelf\'s picture', dw.screen === 'screen-workout' && dw.title === sessions.find(x => x.key === OTHER).it.title && dw.img, JSON.stringify(dw));
    await w.p.evaluate(() => document.querySelector('#screen-workout .nav-back').click()); await sleep(w.p, 500);
    t.check('and its ← goes to the Library', (await where(w.p)).screen === 'screen-workouts');
    await w.ctx.close();
  }

  // ── 13. 320, 375 and 390 px, light and dark: no sideways scroll, every control 44 px, the initials button on no text, nothing cut ──
  for (const [width, height, dark] of [[320, 568, false], [375, 667, false], [390, 844, false], [320, 568, true], [375, 667, true], [390, 844, true]]) {
    const tag = `${width}${dark ? ' dark' : ''}`;
    const { ctx, p } = await open(browser, { w: width, h: height, dark });
    const scan = (screenSel, ctlSel) => p.evaluate(([screenSel, ctlSel]) => {
      const root = document.querySelector(screenSel);
      const controls = [...root.querySelectorAll(ctlSel)].filter(e => e.getClientRects().length).map(e => { const r = e.getBoundingClientRect(); return { c: (e.className || e.tagName).toString().split(' ')[0], w: Math.round(r.width), h: Math.round(r.height) }; });
      const cut = [...root.querySelectorAll('.shelf-tx, .shelf-all, .pb-title, .ws-title, .ws-eyebrow, .ar-htitle, .ar-kicker, .lib-tab-w, .sr-name, .wb-l, .xl-row b')].filter(e => e.getClientRects().length && e.scrollWidth - e.clientWidth > 1).map(e => e.className);
      const over = [...root.querySelectorAll('.shelf-band')].filter(b => { const a = b.querySelector('.shelf-tx').getBoundingClientRect(), x = b.querySelector('.shelf-all'); return x && x.getClientRects().length && a.right > x.getBoundingClientRect().left + 0.5; }).length;
      return { controls, cut, over, sideways: document.documentElement.scrollWidth - innerWidth, bg: getComputedStyle(document.body).backgroundColor };
    }, [screenSel, ctlSel]);
    const checkScreen = async (name, screenSel, ctlSel, minControls) => {
      await p.evaluate(() => window.scrollTo(0, 0)); await sleep(p, 250);
      const s = await scan(screenSel, ctlSel);
      const o = await p.evaluate(OVERLAP);
      t.check(`${tag}, ${name}: no sideways scroll, ${s.controls.length} controls all 44 px or more, nothing cut off, the initials button on no text`,
        s.sideways <= 0 && s.controls.length >= minControls && s.controls.every(c => c.w >= 44 && c.h >= 44) && s.cut.length === 0 && s.over === 0 && !o.hidden && o.hits.length === 0, JSON.stringify({ s: s.sideways, n: s.controls.length, small: s.controls.filter(c => c.w < 44 || c.h < 44), cut: s.cut, over: s.over, hits: o.hits }));
      return s;
    };
    await goLib(p);
    const s1 = await checkScreen('Sessions', '#screen-workouts', '#lib-switch button, #lib-sessions button', 7 + 3 + 6);
    t.check(`${tag}: the page is ${dark ? 'the dark paper (#181818)' : 'the paper (#FAF7F2)'}`, s1.bg === (dark ? 'rgb(24, 24, 24)' : 'rgb(250, 247, 242)'), s1.bg);
    await p.evaluate(() => document.querySelector('.shelf-band[aria-expanded]').click()); await sleep(p, 200);
    await checkScreen('Sessions with a shelf open', '#screen-workouts', '#lib-switch button, #lib-sessions button', 10);
    await p.evaluate(() => setLibPane('playbook')); await sleep(p, 500);
    await checkScreen('Playbook', '#screen-workouts', '#lib-switch button, #lib-playbook button', 3 + 1 + 5);
    await p.evaluate(() => setLibPane('exercises')); await sleep(p, 500);
    await checkScreen('Exercises', '#screen-workouts', '#lib-switch button, #lib-exercises button, #lib-exercises input', 3 + 1 + 2 + 5);
    await p.evaluate(k => { openWorkout(k); }, FULL); await sleep(p, 700);
    await checkScreen('a Library session (Before you start open)', '#screen-workout', '#screen-workout .nav-back, #ws-before-btn, #ws-why-toggle', 3);
    await p.evaluate(() => { goTo('workouts'); }); await sleep(p, 200);
    await p.evaluate(k => { openWorkout(k); }, FULL); await sleep(p, 700);
    const sf = await checkScreen('a Library session (folded)', '#screen-workout', '#screen-workout .nav-back, #ws-before-btn, #ws-why-toggle, #ws-done-btn', 4);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.evaluate(() => openArticle('pre-competition/tennis-warm-up')); await sleep(p, 700);
    await checkScreen('an article', '#screen-article', '#screen-article .nav-back, #ar-body .hrow', 2);
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  process.exit(failed ? 1 : 0);
})().catch(e => { t.check('the run reached its end', false, String(e.stack || e).split('\n').slice(0, 4).join(' | ')); t.report(); process.exit(1); });
