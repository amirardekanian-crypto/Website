// The sheets and the notices in the Centre Court look (Amir, 2026-10-13: "continue until everything has a consistent design"): the ONE sheet
// (#hist-overlay: History, About, Why your plan, a Quality, Account, Help) and the readiness check share ONE sticky top row (the handle,
// ‹ Back only when a page is behind, Close on the right) and no grey Close at the foot; the pages are Centre Court's parts; notices have three
// looks (the banner: Home's offline line and the filed-day card; the note box, aaToast(), above the sheets; the first-session hint, unchanged);
// the install offer is a bottom card. Behaviour is checked as well as looks: ‹ Back stepping back a page, the swipe, the tap above and the phone's
// Back closing, Skip for today starting the clock, the readiness answers and Begin, Account's Theme / Install / Help / Privacy / Sign out (two
// taps). Serve the repo first (see lib.js), then: node scripts/headless/sheets-notices.js [--out <dir>]
// (it lets Google Fonts through for its screenshots; NOFONTS=1 keeps them off, as a phone with no signal would).
'use strict';
const path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // the LOCAL calendar day
const day = n => ymd(new Date(Date.now() - n * DAY));
const FONTS = !process.env.NOFONTS;

// The fixture's Spine, with the fields the About sheet shows (made-up text, never a real athlete's).
const extra = {
  'barbell-back-squat': { pattern: 'squat', qualities: ['strength', 'muscle'], tennis: 'The low, loaded base you return to between shots.',
    muscles: { quads: 1, glutes: 1, hamstrings: 0.5, core: 0.5 }, loads: ['knee', 'hip-groin'], impact: 'none',
    easier: ['Goblet Squat'], harder: [], alts: ['dumbbell-bulgarian-split-squat'] },
  'box-jump': { pattern: 'jump-land', qualities: ['power', 'spring'], muscles: null, loads: ['knee', 'ankle-foot', 'hip-groin'], impact: 'plyometric', easier: [], harder: [], alts: [] },
  'dumbbell-bulgarian-split-squat': { pattern: 'single-leg', qualities: ['strength'], muscles: { quads: 1, glutes: 0.5 }, impact: 'none', easier: [], harder: [], alts: ['barbell-back-squat'] },
};
const SPINE = H.SPINE.map(e => Object.assign({}, e, extra[e.id] || {}));
const QUALS = ['armour', 'brakes', 'engine', 'movement', 'muscle', 'power', 'rotation', 'speed', 'spring', 'strength']
  .map((id, i) => ({ id, name: id[0].toUpperCase() + id.slice(1), line: 'What ' + id + ' means.', tennis: id === 'strength' ? 'The force you push the court away with.' : '', sort: i }));
const LIFTS = [{ lift: 'Barbell Back Squat', kg: 104, w: '85', r: '6', rpe: 7, d: day(2), t: Date.now() - 2 * DAY }];
// The fixture's one squat session, and two older ones, so History has a chart (it draws from two sessions) and three rows.
const HIST3 = H.HISTORY.concat([[9, '65'], [16, '60']].map(([n, w]) => ({ completed_on: H.past(n), day: '1', readiness: 4, log: [
  { ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: n === 16 ? 'First time at this weight' : '', sets: [{ w, n: 6, r: '7', d: true }, { w, n: 6, r: '8', d: true }, { w, n: 5, r: '8', d: true }] }] })));
function programme() {
  const P = H.fixture();
  const carry = P.workouts.days[0].blocks[2].exercises.find(x => x.name === 'Mystery Carry');
  carry.why = { src: 'goal', text: 'Carries build the grip you asked for.' };
  return P;
}

const GREEN = 'rgb(14, 74, 54)', GREEN_DARK = 'rgb(109, 190, 149)', MARK_DARK = 'rgb(27, 114, 84)', WHITE = 'rgb(255, 255, 255)', ROW_DARK = 'rgb(36, 36, 36)';
const PAPER = 'rgb(250, 247, 242)', PAPER_DARK = 'rgb(24, 24, 24)', SAND = 'rgb(241, 236, 227)', RING = 'rgb(138, 131, 120)', CLAY_FILL = 'rgb(194, 81, 44)';
const MODAL = '#hist-overlay .readiness-modal';

// The six pages of the one sheet, as an opener each.
const PAGES = [
  ['History', p => p.evaluate(`(() => { openHistorySheet(${H.card('Barbell Back Squat')}); })()`), /barbell back squat/i],
  ['About', p => p.evaluate(`(() => { ${H.card('Barbell Back Squat')}.querySelector('.ex-about').click(); })()`), /./],
  ['Why', p => p.evaluate(() => openWhyPlan()), /looks like this/i],
  ['Quality', p => p.evaluate(() => openQualitySheet('strength', true)), /./],
  ['Account', p => p.evaluate(() => openAccount()), /./],
  ['Help', p => p.evaluate(() => openHelp('rpe')), /./],
];
// What a control must be: 44 px both ways (WCAG 2.2 AAA target size, the app's own floor).
const CONTROLS = '.sheet-back, .sheet-close, .acct-seg button, .hrow, .acct-signout, .note-card-header, .wp-row, .readiness-opt, .readiness-begin, .readiness-skip, .hs-link, .ax-tile, .ax-nlink, .ax-unfold, .ax-hist';

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  // Screenshots: the three sizes asked for (375 light, 320 light, 390 dark) and the wide account; the other three combinations are checked, not shot.
  const WANT = ['375x667', '320x568', '390x844-dark'];
  const shot = (p, name) => { const m = name.match(/(\d+x\d+(-dark)?)/); if (m && /^(375x667|320x568|390x844)/.test(m[1]) && !WANT.includes(m[1])) return Promise.resolve(); return p.screenshot({ path: path.join(shots, name + '.png') }); };
  const SIX = [[375, 667, false], [320, 568, false], [390, 844, true], [375, 667, true], [320, 568, true], [390, 844, false]];
  // The app, signed in, with the Spine and the qualities, on Day 1 (a card to open an ⓘ from).
  const setup = async (o = {}) => {
    const r = await H.openProgram(browser, Object.assign({ spine: SPINE, prog: programme(), hist: HIST3, seed: { _1rm: LIFTS }, fonts: FONTS }, o));
    await r.p.evaluate(q => { setQualities(q); paintSpine(); }, QUALS);
    await r.p.evaluate(() => openDayView('1'));
    await r.p.waitForTimeout(300);
    return r;
  };
  const sheetOn = p => p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'));
  const title = p => p.evaluate(() => (document.querySelector('#hist-overlay .readiness-title, #hist-overlay .ax-name') || {}).textContent || '');
  // The top row as drawn now, against the sheet's own box.
  const row = (p, sel = MODAL) => p.evaluate(sel => {
    const m = document.querySelector(sel), mr = m.getBoundingClientRect(), bar = m.firstElementChild;
    const isBar = !!(bar && bar.classList.contains('sheet-bar'));
    const close = isBar ? bar.querySelector('.sheet-close') : null, back = isBar ? bar.querySelector('.sheet-back') : null;
    const cr = close && close.getBoundingClientRect(), br = back && back.getBoundingClientRect();
    return { isBar, nClose: [...m.querySelectorAll('button, a')].filter(b => b.textContent.trim() === 'Close').length, nBar: m.querySelectorAll('.sheet-bar').length,
      closeCls: [...m.querySelectorAll('button, a')].filter(b => b.textContent.trim() === 'Close').every(b => b.classList.contains('sheet-close')),
      close: cr ? { gapR: Math.round((mr.right - cr.right) * 10) / 10, gapT: Math.round((cr.top - mr.top) * 10) / 10, w: Math.round(cr.width), h: Math.round(cr.height), label: close.getAttribute('aria-label'), colour: getComputedStyle(close).color } : null,
      back: br ? { gapL: Math.round((br.left - mr.left) * 10) / 10, w: Math.round(br.width), h: Math.round(br.height), text: back.textContent.trim(), colour: getComputedStyle(back).color, before: back.nextElementSibling === close } : null,
      foot: m.querySelectorAll('.hs-actions .readiness-skip, .ax-foot').length, over: m.scrollWidth - m.clientWidth, bg: getComputedStyle(m).backgroundColor,
      barBg: bar ? getComputedStyle(bar).backgroundColor : null, radius: getComputedStyle(m).borderTopLeftRadius, edge: getComputedStyle(m).borderTopWidth };
  }, sel);
  const small = (p, scope) => p.evaluate(([scope, sel]) => [...document.querySelector(scope).querySelectorAll(sel)].filter(e => e.getClientRects().length)
    .map(e => { const r = e.getBoundingClientRect(); return { cls: e.className.toString().slice(0, 30), w: Math.round(r.width), h: Math.round(r.height) }; })
    .filter(x => x.w < 43.5 || x.h < 43.5), [scope, CONTROLS]);

  // ── 1. Every page, every size and both themes: the row, Close top right, nothing at the foot, no sideways scroll, every control 44 px ──
  for (const [w, h, dark] of SIX) {
    const tag = `${w}${dark ? ' dark' : ''}`, file = `${w}x${h}${dark ? '-dark' : ''}`;
    const { ctx, p } = await setup({ w, h, dark });
    for (const [name, open, titleRe] of PAGES) {
      await open(p); await p.waitForTimeout(450);
      const r = await row(p), ax = await p.evaluate(m => document.querySelector(m).classList.contains('ax-sheet'), MODAL);
      t.check(`${tag} ${name}: the sheet is open, and the top row is its first child`, await sheetOn(p) && r.isBar && r.nBar === 1 && titleRe.test(await title(p)), JSON.stringify({ bar: r.isBar, n: r.nBar }));
      t.check(`${tag} ${name}: Close sits top right, 44 px, labelled`, r.close && r.close.gapR >= 0 && r.close.gapR <= 24 && r.close.gapT <= 16 && r.close.w >= 44 && r.close.h >= 44 && r.close.label === 'Close', JSON.stringify(r.close));
      t.check(`${tag} ${name}: Close is green ink on the paper, white on the About sheet's green`, r.close && r.close.colour === (ax ? WHITE : dark ? GREEN_DARK : GREEN), r.close && r.close.colour);
      t.check(`${tag} ${name}: one Close, in the top row, and nothing at the foot`, r.nClose === 1 && r.closeCls && r.foot === 0, JSON.stringify({ n: r.nClose, cls: r.closeCls, foot: r.foot }));
      t.check(`${tag} ${name}: no ‹ Back on a page nothing is behind`, r.back === null, JSON.stringify(r.back));
      t.check(`${tag} ${name}: the frame is the paper with 16 px corners and no clay edge`, (ax || r.bg === (dark ? PAPER_DARK : PAPER)) && r.radius === '16px' && r.edge === '0px', JSON.stringify({ bg: r.bg, radius: r.radius, edge: r.edge }));
      t.check(`${tag} ${name}: no sideways scroll`, r.over <= 0, r.over);
      const sm = await small(p, MODAL);
      t.check(`${tag} ${name}: every control is 44 px`, sm.length === 0, JSON.stringify(sm));
      if (name === 'History') {
        const hs = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'), rows = [...m.querySelectorAll('.hs-row')], cs = e => getComputedStyle(e);
          const line = m.querySelector('.hs-line'), dot = m.querySelector('.hs-dot'), door = m.querySelector('#hs-rec');
          return { rows: rows.length, first: rows[0] && cs(rows[0]).borderTopWidth, second: rows[1] && cs(rows[1]).borderTopWidth, line: line && cs(line).stroke, dot: dot && cs(dot).fill, chart: !!m.querySelector('.hs-chart'),
            date: rows[0] && cs(rows[0].querySelector('.hs-d')).fontFamily, set: rows[0] && { f: cs(rows[0].querySelector('.hs-v')).fontFamily, w: cs(rows[0].querySelector('.hs-v')).fontWeight },
            note: rows[2] && cs(rows[2].querySelector('.hs-n')).fontStyle, door: door && { cls: door.className, h: Math.round(door.getBoundingClientRect().height), ic: !!door.querySelector('.hrow-ic svg'), a: !!door.querySelector('.hrow-a'), r: cs(door).borderTopLeftRadius },
            eyebrow: m.querySelector('.readiness-eyebrow').textContent }; });
        t.check(`${tag} History: the chart on the paper in green (line and dots), three paper rows with a hairline between and none above the first`, hs.chart && hs.line === (dark ? GREEN_DARK : GREEN) && hs.dot === (dark ? GREEN_DARK : GREEN) && hs.rows === 3 && hs.first === '0px' && hs.second === '1px', JSON.stringify(hs));
        t.check(`${tag} History: the date in mono, the set line in Barlow bold, the note in italics, Personal Records a door row`, /Space Mono/.test(hs.date) && /Barlow/.test(hs.set.f) && +hs.set.w >= 700 && hs.note === 'italic' && hs.door && /hrow/.test(hs.door.cls) && hs.door.h >= 64 && hs.door.ic && hs.door.a && hs.door.r === '12px' && hs.eyebrow === 'Your history', JSON.stringify(hs));
      }
      if (name === 'Help') {
        const hp = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'), o = m.querySelector('.note-card.open'), bar = m.querySelector('.sheet-bar'), cs = e => getComputedStyle(e);
          return { open: m.querySelectorAll('.note-card.open').length, below: o ? Math.round(o.getBoundingClientRect().top - bar.getBoundingClientRect().bottom) : null, scrolled: m.scrollTop,
            icon: cs(m.querySelector('.app-card-icon')).backgroundColor, iconW: Math.round(m.querySelector('.app-card-icon').getBoundingClientRect().width), title: cs(m.querySelector('.note-card-title')).fontFamily, chev: cs(m.querySelector('.note-chevron')).maskImage !== 'none' || cs(m.querySelector('.note-chevron')).webkitMaskImage !== 'none',
            bodyPx: o ? cs(o.querySelector('.note-body')).fontSize : null }; });
        t.check(`${tag} Help: the asked-for card (RPE) is the one open and sits below the top row, not under it`, hp.open === 1 && hp.below >= -1, JSON.stringify(hp));
        t.check(`${tag} Help: fold rows: a 22 px line icon with no tile, the title in Barlow, the app's ⌄`, hp.icon === 'rgba(0, 0, 0, 0)' && hp.iconW === 22 && /Barlow/.test(hp.title) && !/Condensed/.test(hp.title) && hp.chev, JSON.stringify(hp));
      }
      await shot(p, `sheet-${name.toLowerCase()}-${file}`);
      await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(150);
    }
    // The readiness check.
    await p.evaluate(() => openReadiness('1')); await p.waitForTimeout(350);
    const rr = await row(p, '#readiness-overlay .readiness-modal');
    t.check(`${tag} readiness: the same top row, Close top right, and Skip for today is still there`, rr.isBar && rr.close && rr.close.gapR <= 24 && rr.close.h >= 44 && rr.nClose === 1, JSON.stringify(rr.close));
    t.check(`${tag} readiness: no sideways scroll and every control is 44 px`, rr.over <= 0 && (await small(p, '#readiness-overlay .readiness-modal')).length === 0, rr.over);
    const rk = await p.evaluate(() => { const o = document.querySelector('#readiness-overlay .readiness-opt'), q = document.querySelector('.readiness-q-text'), sk = [...document.querySelectorAll('#readiness-overlay button')].find(b => /skip for today/i.test(b.textContent));
      return { keyH: Math.round(o.getBoundingClientRect().height), keyBg: getComputedStyle(o).backgroundColor, qFont: getComputedStyle(q).fontFamily, qCase: getComputedStyle(q).textTransform, skip: !!sk, qs: document.querySelectorAll('.readiness-q').length }; });
    t.check(`${tag} readiness: five green-titled questions, keys of 48 px or more, Skip for today`, rk.qs === 5 && rk.keyH >= 48 && /Barlow Condensed/.test(rk.qFont) && rk.qCase === 'uppercase' && rk.skip && rk.keyBg === (dark ? ROW_DARK : WHITE), JSON.stringify(rk));
    await p.evaluate(() => { const q = document.querySelectorAll('.readiness-q'); for (let i = 0; i < 3; i++) q[i].querySelectorAll('.readiness-opt')[i + 1].click(); });
    await p.waitForTimeout(250);
    await shot(p, `sheet-readiness-${file}`);
    await p.evaluate(() => cancelReadiness());
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. ‹ Back appears only when a page is behind, and steps back ──
  {
    const { ctx, p } = await setup({ fonts: false });
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    await p.click('#acct-help'); await p.waitForTimeout(350);
    let r = await row(p);
    t.check('Account → Help: ‹ Back appears on the left, before Close, 44 px, in green', r.back && r.back.gapL <= 24 && r.back.h >= 44 && r.back.w >= 44 && /Back/.test(r.back.text) && r.back.before && r.back.colour === GREEN, JSON.stringify(r.back));
    t.check('Account → Help: it is Help (the asked-for card is not asked: no key), still one Close', /how the app works/i.test(await title(p)) && r.nClose === 1 && r.nBar === 1, await title(p));
    await p.click(`${MODAL} .sheet-back`); await p.waitForTimeout(300);
    r = await row(p);
    t.check('‹ Back steps back to the account page, and then there is no Back', (await title(p)) === 'Alex Rivera' && r.back === null && await sheetOn(p), await title(p));
    // About → a quality → Back → About in its own look
    await p.evaluate(() => closeHistorySheet());
    await p.evaluate(`(() => { ${H.card('Barbell Back Squat')}.querySelector('.ex-about').click(); })()`); await p.waitForTimeout(300);
    t.check('About: no Back (first page)', (await row(p)).back === null);
    await p.evaluate(() => document.querySelector('#hist-overlay .ax-tile').click()); await p.waitForTimeout(250);
    r = await row(p);
    t.check('About → a quality: ‹ Back, on the plain frame (the green top is gone, the row is the paper\'s)', r.back && r.close.colour === GREEN && r.barBg === PAPER && !(await p.evaluate(m => document.querySelector(m).classList.contains('ax-sheet'), MODAL)), JSON.stringify({ b: r.back, c: r.close, bg: r.barBg }));
    await p.click(`${MODAL} .sheet-back`); await p.waitForTimeout(300);
    r = await row(p);
    t.check('‹ Back returns to the About sheet in its look, row white on the green, no Back', r.back === null && r.close.colour === WHITE && /barbell back squat/i.test(await title(p)), JSON.stringify(r.close));
    // About → Your history: Back
    await p.click('#ax-hist'); await p.waitForTimeout(250);
    r = await row(p);
    t.check('About → Your history: ‹ Back on the paper frame', r.back && /history/i.test(await p.evaluate(() => document.querySelector('#hist-overlay .readiness-eyebrow').textContent)), JSON.stringify(r.back));
    // the phone's Back steps back a page, then closes the sheet
    await p.evaluate(() => history.back()); await p.waitForTimeout(350);
    t.check('the phone\'s Back steps back one page (the sheet stays)', await sheetOn(p) && (await row(p)).back === null && /barbell back squat/i.test(await title(p)));
    await p.evaluate(() => history.back()); await p.waitForTimeout(350);
    t.check('…and the next Back closes the sheet', !(await sheetOn(p)));
    // Why → an exercise → Back → Why
    await p.evaluate(() => openWhyPlan()); await p.waitForTimeout(250);
    await p.click(`${MODAL} .wp-row`); await p.waitForTimeout(300);
    r = await row(p);
    t.check('Why → an exercise: ‹ Back, and it steps back to the Why page', r.back && !!(await p.evaluate(() => { document.querySelector('#hist-overlay .sheet-back').click(); return /looks like this/i.test(document.querySelector('#hist-overlay .readiness-title').textContent); })), JSON.stringify(r.back));
    t.check('no page errors (back)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. The row stays at the top while a long page scrolls ──
  {
    const { ctx, p } = await setup({ fonts: false });
    const stays = async (name, open) => {
      await open(); await p.waitForTimeout(450);
      const before = await p.evaluate(m => { const e = document.querySelector(m); return { room: e.scrollHeight - e.clientHeight }; }, MODAL);
      await p.evaluate(m => { const e = document.querySelector(m); e.scrollTop = Math.min(e.scrollHeight, 700); e.dispatchEvent(new Event('scroll')); }, MODAL);
      await p.waitForTimeout(250);
      const s = await p.evaluate(m => { const e = document.querySelector(m), er = e.getBoundingClientRect(), b = e.querySelector('.sheet-bar'), br = b.getBoundingClientRect(), c = e.querySelector('.sheet-close'), cr = c.getBoundingClientRect();
        const hit = document.elementFromPoint(cr.left + cr.width / 2, cr.top + cr.height / 2);
        return { scrolled: e.scrollTop, topGap: Math.round((br.top - er.top) * 10) / 10, hit: hit === c, cls: e.classList.contains('is-scrolled'), bg: getComputedStyle(b).backgroundColor, ax: e.classList.contains('ax-sheet') }; }, MODAL);
      t.check(`${name}: a page long enough to scroll (${before.room} px of it)`, before.room > 300 && s.scrolled > 100, JSON.stringify({ room: before.room, scrolled: s.scrolled }));
      t.check(`${name}: scrolled ${s.scrolled} px, the row is still at the top, visible and tappable`, Math.abs(s.topGap) <= 1 && s.hit, JSON.stringify(s));
      t.check(`${name}: scrolled, the row is solid (${s.ax ? 'green' : 'paper'}) with the page under it`, s.cls && (s.ax ? s.bg === GREEN : s.bg === PAPER), JSON.stringify(s));
      await p.evaluate(() => closeHistorySheet());
    };
    await stays('Help', () => p.evaluate(() => openHelp()));
    await stays('About from the Library', () => p.evaluate(() => openExerciseSheet('barbell-back-squat', null, true)));
    await p.evaluate(() => openExerciseSheet('barbell-back-squat', null, true)); await p.waitForTimeout(350);
    const top = await p.evaluate(m => { const b = document.querySelector(m + ' > .sheet-bar'); return { bg: getComputedStyle(b).backgroundColor, cls: document.querySelector(m).classList.contains('is-scrolled'), over: (() => { const h = document.querySelector(m + ' .ax-hero'), hr = h.getBoundingClientRect(), mr = document.querySelector(m).getBoundingClientRect(); return Math.round((hr.top - mr.top) * 10) / 10; })() }; }, MODAL);
    t.check('About at the top: the row lies over the green with no fill of its own, the green starts at the sheet\'s first pixel', top.bg === 'rgba(0, 0, 0, 0)' && !top.cls && Math.abs(top.over) <= 1, JSON.stringify(top));
    await p.evaluate(() => closeHistorySheet());
    t.check('no page errors (scroll)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. Close, the swipe, the tap above and the phone's Back all close; a swipe from the middle of a scrolled page does not ──
  {
    const { ctx, p } = await setup({ fonts: false, touch: true });
    const swipe = (y0off, dy) => p.evaluate(([y0off, dy]) => {
      const m = document.querySelector('#hist-overlay .readiness-modal'), r = m.getBoundingClientRect();
      const mk = (type, y) => { const tc = new Touch({ identifier: 7, target: m, clientX: r.left + 100, clientY: y });
        m.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [tc], targetTouches: type === 'touchend' ? [] : [tc], changedTouches: [tc], bubbles: true, cancelable: true })); };
      const y0 = r.top + y0off; mk('touchstart', y0); mk('touchmove', y0 + 20); mk('touchmove', y0 + dy); mk('touchend', y0 + dy);
    }, [y0off, dy]);
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    await p.click(`${MODAL} .sheet-close`); await p.waitForTimeout(250);
    t.check('Close closes the sheet', !(await sheetOn(p)));
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    await swipe(20, 160); await p.waitForTimeout(500);
    t.check('a swipe down from the handle closes the sheet', !(await sheetOn(p)));
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    await p.mouse.click(187, 40); await p.waitForTimeout(250);
    t.check('a tap above the sheet closes it', !(await sheetOn(p)));
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    await p.evaluate(() => history.back()); await p.waitForTimeout(350);
    t.check('the phone\'s Back closes it', !(await sheetOn(p)));
    // scrolled Help: the swipe from the row closes it, from the middle of the page it scrolls and the sheet stays
    await p.evaluate(() => openHelp()); await p.waitForTimeout(350);
    await p.evaluate(m => { document.querySelector(m).scrollTop = 500; }, MODAL); await p.waitForTimeout(150);
    await swipe(300, 160); await p.waitForTimeout(450);
    t.check('scrolled, a swipe that starts mid-page is a scroll: the sheet stays', await sheetOn(p));
    await swipe(24, 160); await p.waitForTimeout(500);
    t.check('scrolled, a swipe that starts on the top row closes it', !(await sheetOn(p)));
    // the readiness check: Close, the tap above and Back cancel, and nothing starts
    for (const how of ['Close', 'the tap above', 'Back']) {
      await p.evaluate(() => { openReadiness('1'); }); await p.waitForTimeout(250);
      if (how === 'Close') await p.click('#readiness-overlay .sheet-close');
      else if (how === 'Back') await p.evaluate(() => history.back());
      else await p.mouse.click(187, 8);
      await p.waitForTimeout(350);
      const s = await p.evaluate(() => { const t = loadTimer('1'); return { shown: document.getElementById('readiness-overlay').classList.contains('visible'), started: !!(t && (t.sessionStart || t.running)), day: _readinessDay }; });
      t.check(`the readiness check: ${how} cancels it and nothing starts`, !s.shown && !s.started && s.day === null, JSON.stringify(s));
    }
    t.check('no page errors (closing)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 5. The readiness check: Skip for today starts the clock; the answers and Begin behave as before ──
  for (const dark of [false, true]) {
    const tag = dark ? 'dark' : 'light';
    const { ctx, p } = await setup({ fonts: false, dark });
    const started = () => p.evaluate(() => { const t = loadTimer('1'); return !!(t && (t.sessionStart || t.running)); });
    await p.evaluate(() => openReadiness('1')); await p.waitForTimeout(250);
    await p.click('#readiness-overlay .readiness-skip'); await p.waitForTimeout(300);
    const sk = await p.evaluate(() => ({ shown: document.getElementById('readiness-overlay').classList.contains('visible'), r: JSON.parse(localStorage.getItem(readinessKey('1')) || 'null') }));
    t.check(`readiness ${tag}: Skip for today closes it, starts the clock and stores a skipped check`, !sk.shown && await started() && sk.r && sk.r.skipped === true, JSON.stringify(sk));
    await p.evaluate(() => { resetDay('1'); }); await p.waitForTimeout(200);
    await p.evaluate(() => openReadiness('1')); await p.waitForTimeout(250);
    const state = () => p.evaluate(() => { const b = document.getElementById('readiness-begin'); return { t: b.textContent.trim(), dis: b.disabled, bg: (c => { if (c.backgroundImage === 'none') return c.backgroundColor; const e = document.createElement('i'); e.style.backgroundImage = 'var(--btn)'; document.body.appendChild(e); const v = getComputedStyle(e).backgroundImage; e.remove(); return c.backgroundImage === v ? 'BTN' : c.backgroundImage; })(getComputedStyle(b)) }; });
    let s = await state();
    t.check(`readiness ${tag}: starts "0 of 5 answered", disabled and grey`, s.t === '0 of 5 answered' && s.dis && s.bg === (dark ? 'rgb(32, 32, 32)' : SAND), JSON.stringify(s));
    const qs = await p.$$('.readiness-q');
    for (let i = 0; i < 4; i++) await (await qs[i].$$('.readiness-opt'))[2].click();
    s = await state();
    t.check(`readiness ${tag}: "4 of 5 answered" after four`, s.t === '4 of 5 answered' && s.dis, JSON.stringify(s));
    await p.waitForTimeout(250);
    const sel = await p.evaluate(() => { const o = document.querySelector('.readiness-q .readiness-opt.selected'), n = o.querySelector('.readiness-opt-num'); return { bg: getComputedStyle(o).backgroundColor, num: getComputedStyle(n).color, one: document.querySelectorAll('.readiness-q:first-child .readiness-opt.selected').length }; });
    t.check(`readiness ${tag}: the chosen key is the day's selected green (--mark), its number white, one per question`, sel.bg === (dark ? MARK_DARK : GREEN) && sel.num === WHITE && sel.one === 1, JSON.stringify(sel));
    await (await qs[4].$$('.readiness-opt'))[3].click();
    s = await state();
    t.check(`readiness ${tag}: "Begin session ▶", enabled, the primary green`, /begin session/i.test(s.t) && !s.dis && s.bg === 'BTN', JSON.stringify(s));
    await p.click('#readiness-begin'); await p.waitForTimeout(300);
    const b = await p.evaluate(() => ({ shown: document.getElementById('readiness-overlay').classList.contains('visible'), r: JSON.parse(localStorage.getItem(readinessKey('1')) || 'null') }));
    t.check(`readiness ${tag}: Begin closes it, starts the clock and stores the five answers`, !b.shown && await started() && b.r && !b.r.skipped && b.r.sleep === 3 && b.r.overall === 4 && b.r.stress === 3, JSON.stringify(b));
    t.check(`readiness ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. Account: Theme, Install, Help, Privacy, Sign out ──
  {
    const { ctx, p } = await setup({ fonts: false });
    // a report still waiting for signal: a grey note above Sign out, no clay wash
    await p.evaluate(() => { localStorage.setItem(outboxKey(), JSON.stringify([{ day: '1', finish: 1 }])); openAccount(); }); await p.waitForTimeout(250);
    const wt = await p.evaluate(() => { const w = document.querySelector('#hist-overlay .acct-wait'), so = document.getElementById('acct-signout'); if (!w) return null; const cs = getComputedStyle(w);
      return { text: w.textContent.slice(0, 40), colour: cs.color, bg: cs.backgroundColor, above: w.getBoundingClientRect().bottom <= so.getBoundingClientRect().top + 1 }; });
    t.check('Account: a waiting report is said in grey above Sign out (no wash)', wt && /session report is/i.test(wt.text) && wt.colour === 'rgb(92, 92, 92)' && wt.bg === 'rgba(0, 0, 0, 0)' && wt.above, JSON.stringify(wt));
    await p.evaluate(() => { localStorage.removeItem(outboxKey()); openAccount(); closeHistorySheet(); openAccount(); }); await p.waitForTimeout(250);
    const a = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'), sub = m.querySelector('.readiness-sub'), seg = m.querySelectorAll('.acct-seg button'), rows = [...m.querySelectorAll('.hrow')];
      return { eyebrow: m.querySelector('.readiness-eyebrow').textContent, title: m.querySelector('.readiness-title').textContent, subFont: getComputedStyle(sub).fontFamily, sub: sub.textContent,
        seg: [...seg].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')), rows: rows.map(r => r.textContent.replace(/\s+/g, ' ').trim()), arrows: rows.map(r => !!r.querySelector('.hrow-a')), icons: rows.map(r => !!r.querySelector('.hrow-ic svg')),
        privacy: (m.querySelector('a.hrow') || {}).getAttribute && m.querySelector('a.hrow').getAttribute('href') + '|' + m.querySelector('a.hrow').getAttribute('target'),
        signout: (() => { const s = m.querySelector('.acct-signout'), c = getComputedStyle(s); return { text: s.textContent, colour: c.color, bg: c.backgroundColor, border: c.borderTopWidth }; })(), tiles: m.querySelectorAll('.app-card-icon').length }; });
    t.check('Account: the name as the title, a mono line under it, the eyebrow', a.eyebrow === 'Your account' && a.title === 'Alex Rivera' && /Space Mono/.test(a.subFont) && /signed in on this phone/i.test(a.sub), JSON.stringify(a));
    t.check('Account: Theme is two buttons, Light chosen', a.seg.join() === 'Light:true,Dark:false', a.seg.join());
    t.check('Account: Install, How the app works and Privacy are door rows (icon, ›)', a.rows.length === 3 && /Install the app/.test(a.rows[0]) && /How the app works/.test(a.rows[1]) && /Privacy/.test(a.rows[2]) && a.arrows.every(Boolean) && a.icons.every(Boolean), JSON.stringify(a.rows));
    t.check('Account: Privacy is the notice, in a new tab', a.privacy === '/privacy.html|_blank', a.privacy);
    t.check('Account: Sign out is quiet clay text (no box)', a.signout.text === 'Sign out' && a.signout.colour === 'rgb(181, 70, 31)' && a.signout.bg === 'rgba(0, 0, 0, 0)' && a.signout.border === '0px', JSON.stringify(a.signout));
    // Theme
    await p.click('.acct-seg button[data-theme="dark"]'); await p.waitForTimeout(250);
    const chosen = () => p.evaluate(() => { const e = document.querySelector('.acct-seg button[aria-pressed="true"]'), cs = getComputedStyle(e), tr = getComputedStyle(document.querySelector('.acct-seg button[aria-pressed="false"]'));
      return { img: cs.backgroundImage.slice(0, 15), colour: cs.color, other: tr.backgroundColor, h: Math.round(e.getBoundingClientRect().height), track: getComputedStyle(document.querySelector('.acct-seg')).borderTopLeftRadius }; });
    let th = await p.evaluate(() => ({ dark: document.body.hasAttribute('data-dark'), pressed: [...document.querySelectorAll('.acct-seg button')].map(b => b.getAttribute('aria-pressed')).join(), stored: localStorage.getItem('dark_mode') }));
    th = Object.assign(th, await chosen());
    t.check('Theme: Dark turns the app dark (stored), Dark is the pressed button, in the Library switch\'s green fill (white words) on its sand track', th.dark && th.pressed === 'false,true' && th.stored === '1' && /radial-gradient/.test(th.img) && th.colour === WHITE && th.other === 'rgba(0, 0, 0, 0)' && th.h >= 44 && th.track === '14px', JSON.stringify(th));
    await p.click('.acct-seg button[data-theme="light"]'); await p.waitForTimeout(250);
    th = await p.evaluate(() => ({ dark: document.body.hasAttribute('data-dark'), pressed: [...document.querySelectorAll('.acct-seg button')].map(b => b.getAttribute('aria-pressed')).join() }));
    th = Object.assign(th, await chosen());
    t.check('Theme: Light turns it back, Light is the pressed button, filled green', !th.dark && th.pressed === 'true,false' && /radial-gradient/.test(th.img), JSON.stringify(th));
    // Help
    await p.click('#acct-help'); await p.waitForTimeout(300);
    t.check('How the app works opens the guide (cards, none open), with ‹ Back', /how the app works/i.test(await title(p)) && (await p.evaluate(() => document.querySelectorAll('#hist-overlay .help-list .note-card').length)) >= 10 && (await row(p)).back !== null);
    await p.click(`${MODAL} .sheet-back`); await p.waitForTimeout(250);
    // Sign out: two taps; the first arms (and says so), it disarms by itself
    await p.click('#acct-signout'); await p.waitForTimeout(150);
    let so = await p.evaluate(() => { const b = document.getElementById('acct-signout'); return { text: b.textContent, armed: b.classList.contains('armed'), bg: getComputedStyle(b).backgroundColor, colour: getComputedStyle(b).color, h: Math.round(b.getBoundingClientRect().height) }; });
    t.check('Sign out: the first tap arms it ("Tap again to sign out", a clay fill, white words, 44 px)', so.text === 'Tap again to sign out' && so.armed && so.bg === CLAY_FILL && so.colour === WHITE && so.h >= 44, JSON.stringify(so));
    await p.waitForTimeout(4300);
    so = await p.evaluate(() => { const b = document.getElementById('acct-signout'); return { text: b.textContent, armed: b.classList.contains('armed') }; });
    t.check('Sign out: untouched, it disarms after 4 s (nothing signed out)', so.text === 'Sign out' && !so.armed, JSON.stringify(so));
    await p.click('#acct-signout'); await p.waitForTimeout(150);
    await p.click('#acct-signout'); await p.waitForTimeout(250);
    so = await p.evaluate(() => { const b = document.getElementById('acct-signout'); return b ? { text: b.textContent, dis: b.disabled } : { gone: true }; });
    t.check('Sign out: the second tap starts the safe sign-out ("Saving, then signing out…")', so.gone || (/signing out/i.test(so.text) && so.dis), JSON.stringify(so));
    await ctx.close();
  }

  // ── 7. The install offer: from Account, a bottom card in the app's parts; Install only when the browser offered one ──
  for (const [w, h, dark, offered] of [[375, 667, false, false], [390, 844, true, true], [320, 568, false, true]]) {
    const tag = `${w}${dark ? ' dark' : ''}${offered ? ' with Install' : ''}`;
    const { ctx, p } = await setup({ w, h, dark, fonts: FONTS });
    if (offered) await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(150);
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    await p.click('#acct-install'); await p.waitForTimeout(700);
    const c = await p.evaluate(() => { const e = document.querySelector('.a2hs-toast'); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ic = e.querySelector('.a2hs-toast-icon'), btns = [...e.querySelectorAll('button')], pr = e.querySelector('button.primary'), dm = e.querySelector('[data-a2hs-dismiss]');
      return { sheetClosed: !document.getElementById('hist-overlay').classList.contains('visible'), left: Math.round(r.left), w: Math.round(r.width), bottom: Math.round(innerHeight - r.bottom), radius: cs.borderTopLeftRadius + ' ' + cs.borderBottomLeftRadius, bg: cs.backgroundColor,
        icon: getComputedStyle(ic).backgroundImage, iconW: Math.round(ic.getBoundingClientRect().width), words: e.querySelector('.a2hs-toast-body strong').textContent, how: e.querySelector('.a2hs-toast-body span').textContent.slice(0, 40),
        btn: btns.map(b => ({ t: b.textContent.trim(), h: Math.round(b.getBoundingClientRect().height) })), primBg: pr ? getComputedStyle(pr).backgroundColor : null, dismissBg: getComputedStyle(dm).backgroundColor, z: cs.zIndex, over: document.documentElement.scrollWidth - innerWidth }; });
    t.check(`install offer ${tag}: Account's Install closes the sheet and shows the card`, c && c.sheetClosed, JSON.stringify(c));
    if (c) {
      t.check(`install offer ${tag}: a card from the bottom edge, full width, 16 px top corners, white`, c.left === 0 || (w > 520) , JSON.stringify({ left: c.left, w: c.w }));
      t.check(`install offer ${tag}: square at the foot, 16 px at the top, the paper-white row`, c.bottom === 0 && /^16px 0px$/.test(c.radius) && c.bg === (dark ? ROW_DARK : WHITE), JSON.stringify({ b: c.bottom, r: c.radius, bg: c.bg }));
      t.check(`install offer ${tag}: the app's own icon, the words as they were (Install app)`, /icon-192\.png/.test(c.icon) && c.iconW === 48 && c.words === 'Install app', JSON.stringify({ icon: c.icon, w: c.iconW, words: c.words }));
      t.check(`install offer ${tag}: Not now is quiet text${offered ? ', Install the primary green' : ' (and no Install: the browser offered none)'}; every button 44 px`,
        c.btn.every(b => b.h >= 44) && c.btn.some(b => b.t === 'Not now') && c.dismissBg === 'rgba(0, 0, 0, 0)' && (offered ? c.btn.some(b => b.t === 'Install') && c.primBg === (dark ? MARK_DARK : GREEN) : !c.btn.some(b => b.t === 'Install')), JSON.stringify(c.btn));
      t.check(`install offer ${tag}: no sideways scroll`, c.over <= 0, c.over);
      await shot(p, `install-offer-${w}x${h}${dark ? '-dark' : ''}${offered ? '-install' : ''}`);
      await p.click('.a2hs-toast [data-a2hs-dismiss]'); await p.waitForTimeout(500);
      const d = await p.evaluate(() => ({ gone: !document.querySelector('.a2hs-toast'), key: localStorage.getItem('a2hs_dismissed_v1') }));
      t.check(`install offer ${tag}: Not now dismisses it for good (the same key as before)`, d.gone && d.key === '1', JSON.stringify(d));
    }
    t.check(`install offer ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. The note box: the cover's green, in the middle, above an open sheet, under the video pop-up ──
  for (const [w, h, dark] of [[375, 667, false], [320, 568, false], [390, 844, true]]) {
    const tag = `${w}${dark ? ' dark' : ''}`;
    const { ctx, p } = await setup({ w, h, dark, fonts: FONTS });
    await p.evaluate(() => openHelp()); await p.waitForTimeout(350);
    await p.evaluate(() => aaToast("The session clock isn't running.", { action: 'Start', ms: 20000, run: () => { window.__ran = 1; } })); await p.waitForTimeout(300);
    const n = await p.evaluate(() => { const e = document.getElementById('aaToast'), r = e.getBoundingClientRect(), cs = getComputedStyle(e), ov = document.getElementById('hist-overlay'), go = e.querySelector('.aa-toast-go'), x = e.querySelector('.aa-toast-x');
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), hitGo = document.elementFromPoint(go.getBoundingClientRect().left + 10, go.getBoundingClientRect().top + 10);
      return { z: +cs.zIndex, sheetZ: +getComputedStyle(ov).zIndex, sheetOpen: ov.classList.contains('visible'), cx: Math.round(r.left + r.width / 2), cy: Math.round(r.top + r.height / 2), w: innerWidth, h: innerHeight, inside: r.left >= 0 && r.right <= innerWidth,
        above: !!(hit && e.contains(hit)), goUp: hitGo === go, radius: cs.borderTopLeftRadius, bg: cs.backgroundImage.slice(0, 15), colour: cs.color, shadow: cs.boxShadow !== 'none',
        goBg: getComputedStyle(go).backgroundImage.slice(0, 15), goH: Math.round(go.getBoundingClientRect().height), xH: Math.round(x.getBoundingClientRect().height), xBg: getComputedStyle(x).backgroundColor, xRing: getComputedStyle(x).boxShadow !== 'none',
        text: e.querySelector('.aa-toast-t').textContent, btns: [go.textContent, x.textContent].join('|'), videoZ: +getComputedStyle(document.querySelector('.video-modal') || document.body).zIndex || 0 }; });
    t.check(`note box ${tag}: above the open sheet (z ${n.z} over ${n.sheetZ}) and the sheet is still open under it`, n.sheetOpen && n.z > n.sheetZ && n.z === 215 && n.above && n.goUp, JSON.stringify({ z: n.z, sheetZ: n.sheetZ, above: n.above, goUp: n.goUp }));
    t.check(`note box ${tag}: in the middle of the screen, inside it`, Math.abs(n.cx - n.w / 2) <= 2 && Math.abs(n.cy - n.h / 2) <= 6 && n.inside, JSON.stringify({ cx: n.cx, cy: n.cy, w: n.w, h: n.h }));
    t.check(`note box ${tag}: the cover's green, white words, 16 px corners; Start is the light-ring button, Not now outlined; both 44 px`,
      /radial-gradient/.test(n.bg) && n.colour === WHITE && n.radius === '16px' && /radial-gradient/.test(n.goBg) && n.xBg === 'rgba(0, 0, 0, 0)' && n.xRing && n.goH >= 44 && n.xH >= 44 && n.btns === 'Start|Not now', JSON.stringify(n));
    await shot(p, `note-box-over-sheet-${w}x${h}${dark ? '-dark' : ''}`);
    await p.click('#aaToast .aa-toast-go'); await p.waitForTimeout(250);
    const ran = await p.evaluate(() => ({ ran: window.__ran === 1, hidden: document.getElementById('aaToast').hidden, sheet: document.getElementById('hist-overlay').classList.contains('visible') }));
    t.check(`note box ${tag}: Start runs its action, hides the box, leaves the sheet open`, ran.ran && ran.hidden && ran.sheet, JSON.stringify(ran));
    // a lone Got it is the light-ring button; a kicker is a mint-dot eyebrow
    await p.evaluate(() => aaToast('No weight saved on that set. Type it in the kg box.', { kicker: 'Heads up' })); await p.waitForTimeout(200);
    const k = await p.evaluate(() => { const e = document.getElementById('aaToast'), kk = e.querySelector('.aa-toast-k'), x = e.querySelector('.aa-toast-x'), dot = kk && getComputedStyle(kk, '::before');
      return { kicker: kk && kk.textContent, caps: kk && getComputedStyle(kk).textTransform, mono: kk && getComputedStyle(kk).fontFamily, dot: dot && dot.backgroundColor, xBg: getComputedStyle(x).backgroundImage.slice(0, 15), text: e.querySelector('.aa-toast-t').textContent, btn: x.textContent, order: [...e.children].map(c => c.className).join() }; });
    t.check(`note box ${tag}: a note with a kicker: the mint-dot eyebrow over the words, a lone Got it as the light-ring button`, k.kicker === 'Heads up' && k.caps === 'uppercase' && /Space Mono/.test(k.mono) && k.dot === 'rgb(109, 190, 149)' && /radial-gradient/.test(k.xBg) && k.btn === 'Got it' && /^aa-toast-k,aa-toast-t,/.test(k.order), JSON.stringify(k));
    await p.evaluate(() => hideAaToast());
    // and with no kicker nothing is drawn for it
    await p.evaluate(() => aaToast('One more.')); await p.waitForTimeout(100);
    t.check(`note box ${tag}: no kicker, no eyebrow`, await p.evaluate(() => !document.querySelector('#aaToast .aa-toast-k')));
    await p.evaluate(() => hideAaToast());
    t.check(`note box ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 9. The banner: Home's offline line (three states) and the filed-day card wear the day's lower-day recipe ──
  for (const [w, h, dark] of SIX) {
    const tag = `${w}${dark ? ' dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, h, dark, fonts: FONTS, seed: { _autofiled: [{ on: day(1), day: '1', done: 3, total: 9, at: Date.now() }] } });
    const look = sel => p.evaluate(sel => { const e = document.querySelector(sel); if (!e || e.hidden) return null; const cs = getComputedStyle(e), r = e.getBoundingClientRect(), kk = e.querySelector('.po-k, .uf-k'), tx = e.querySelector('.po-txt, .uf-s'),
      a = e.querySelector('.po-btn, .uf-send'), ar = a && a.getBoundingClientRect();
      return { bg: cs.backgroundColor, radius: cs.borderTopLeftRadius, shadow: cs.boxShadow, left: Math.round(r.left), w: Math.round(r.width), vw: innerWidth, padL: parseFloat(cs.paddingLeft), borderT: cs.borderTopWidth, borderB: cs.borderBottomWidth,
        label: kk && { t: kk.textContent, font: getComputedStyle(kk).fontFamily, caps: getComputedStyle(kk).textTransform, colour: getComputedStyle(kk).color }, sentence: tx && { t: tx.textContent, colour: getComputedStyle(tx).color },
        link: a && { t: a.textContent.trim(), h: Math.round(ar.height), colour: getComputedStyle(a).color, bg: getComputedStyle(a).backgroundColor, font: getComputedStyle(a).fontFamily, chev: getComputedStyle(a, '::after').content }, over: document.documentElement.scrollWidth - innerWidth }; }, sel);
    const gutter = w < 360 ? 16 : 20, rowBg = dark ? ROW_DARK : WHITE, ring = dark ? 'rgb(102, 102, 102)' : RING, greenInk = dark ? GREEN_DARK : GREEN, clayInk = dark ? 'rgb(224, 107, 67)' : 'rgb(181, 70, 31)';
    // offline
    await p.evaluate(() => { PLAN_OFFLINE = { id: 'x', at: Date.now() - 3 * 3600000 }; paintPlanOffline('offline'); });
    let o = await look('#home-offline');
    t.check(`banner ${tag}: the offline line is a white row, full width, hairlines above and below, no corners`, o && o.bg === rowBg && o.radius === '0px' && o.left === 0 && o.w === o.vw && o.borderT === '1px' && o.borderB === '1px', JSON.stringify(o));
    t.check(`banner ${tag}: offline: a 4 px grey stripe, the label in mono capitals, the sentence in ink, the gutter inside`, o && /inset/.test(o.shadow) && o.shadow.includes(ring) && /4px/.test(o.shadow) && o.label.t === 'Offline' && /Space Mono/.test(o.label.font) && o.label.caps === 'uppercase' && o.padL === gutter
      && /your plan as saved on this phone/i.test(o.sentence.t) && !o.link, JSON.stringify({ shadow: o && o.shadow, label: o && o.label, padL: o && o.padL, s: o && o.sentence }));
    await p.evaluate(() => { document.getElementById('home-overview').scrollTop = 0; window.scrollTo(0, 0); });
    await shot(p, `home-offline-banner-${w}x${h}${dark ? '-dark' : ''}`);
    // updated: Refresh is the one green condensed link with the chevron, 44 px, clay stripe (it asks)
    await p.evaluate(() => paintPlanOffline('changed'));
    o = await look('#home-offline');
    t.check(`banner ${tag}: "Your plan was updated" asks (clay stripe and label) with Refresh as the green condensed link, a chevron, 44 px`, o && o.shadow.includes(CLAY_FILL) && /Your plan was updated/.test(o.sentence.t) && o.label.colour === clayInk && o.link && o.link.t === 'Refresh' && o.link.h >= 44
      && o.link.colour === greenInk && o.link.bg === 'rgba(0, 0, 0, 0)' && /Barlow Condensed/.test(o.link.font) && o.link.chev !== 'none', JSON.stringify(o));
    await shot(p, `home-plan-updated-banner-${w}x${h}${dark ? '-dark' : ''}`);
    await p.evaluate(() => paintPlanOffline('refused'));
    o = await look('#home-offline');
    t.check(`banner ${tag}: "The server didn't confirm your plan" in the same banner`, o && /didn't confirm your plan/.test(o.sentence.t) && o.bg === rowBg && o.radius === '0px', JSON.stringify(o && o.sentence));
    await p.evaluate(() => paintPlanOffline('hide'));
    t.check(`banner ${tag}: hidden when there is nothing to say`, !(await look('#home-offline')));
    // the filed-day card
    const f = await look('#home-unfinished-wrap .uf-card');
    t.check(`banner ${tag}: the filed-day card is the same banner: white, full width, a clay stripe, the kicker in clay mono capitals`, f && f.bg === rowBg && f.radius === '0px' && f.left === 0 && f.w === f.vw && f.shadow.includes(CLAY_FILL) && /4px/.test(f.shadow) && f.label.t === 'Saved for you' && f.label.colour === clayInk && /Space Mono/.test(f.label.font) && f.padL === gutter, JSON.stringify(f));
    t.check(`banner ${tag}: the filed-day card keeps its words, and OK is the green condensed link, 44 px`, f && /wasn't finished/.test(await p.evaluate(() => document.querySelector('.uf-card').textContent)) && /I still got it/.test(f.sentence.t) && f.link.t === 'OK' && f.link.h >= 44 && f.link.colour === greenInk && f.link.bg === 'rgba(0, 0, 0, 0)', JSON.stringify(f && f.link));
    t.check(`banner ${tag}: no sideways scroll`, f && f.over <= 0 && o && o.over <= 0, f && f.over);
    await p.evaluate(() => paintPlanOffline('offline'));
    await shot(p, `home-filed-day-card-${w}x${h}${dark ? '-dark' : ''}`);
    await p.click('#home-unfinished-wrap .uf-send'); await p.waitForTimeout(200);
    t.check(`banner ${tag}: OK clears the card, as before`, await p.evaluate(() => !document.querySelector('.uf-card') && !localStorage.getItem(ATHLETE_ID + '_autofiled')));
    t.check(`banner ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 10. A wide screen: the sheet is a centred dialog, the row is there, the dim covers the whole window ──
  {
    const { ctx, p } = await setup({ w: 1280, h: 800, fonts: FONTS });
    await p.evaluate(() => openAccount()); await p.waitForTimeout(300);
    const wd = await p.evaluate(() => { const ov = document.getElementById('hist-overlay'), r = ov.getBoundingClientRect(), m = ov.querySelector('.readiness-modal'), mr = m.getBoundingClientRect(), cs = getComputedStyle(ov), bar = m.querySelector('.sheet-bar');
      return { ov: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], w: innerWidth, h: innerHeight, dim: cs.backgroundColor, mw: Math.round(mr.width), centred: Math.abs((mr.left + mr.right) / 2 - innerWidth / 2) <= 2, radius: getComputedStyle(m).borderTopLeftRadius + ' ' + getComputedStyle(m).borderBottomLeftRadius,
        handle: getComputedStyle(bar, '::before').display, bar: !!bar }; });
    t.check('1280: the dim covers the whole window, not the 520 px column', wd.ov[0] === 0 && wd.ov[1] === 0 && wd.ov[2] === wd.w && wd.ov[3] === wd.h && /rgba\(26, 26, 26/.test(wd.dim), JSON.stringify(wd));
    t.check('1280: a centred dialog with all four corners at 16 px, no handle, and the top row is there', wd.centred && wd.mw <= 520 && wd.radius === '16px 16px' && wd.handle === 'none' && wd.bar, JSON.stringify(wd));
    const r = await row(p);
    t.check('1280: Close is top right of the dialog, 44 px', r.close && r.close.gapR <= 24 && r.close.h >= 44, JSON.stringify(r.close));
    await shot(p, 'sheet-account-1280x800');
    await p.mouse.click(60, 400); await p.waitForTimeout(250);
    t.check('1280: a tap on the dim outside the column closes the sheet', !(await sheetOn(p)));
    await p.evaluate(() => openHelp()); await p.waitForTimeout(300);
    await shot(p, 'sheet-help-1280x800');
    await p.evaluate(() => closeHistorySheet());
    await p.evaluate(() => openReadiness('1')); await p.waitForTimeout(300);
    const rd = await p.evaluate(() => { const r = document.getElementById('readiness-overlay').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.width), innerWidth]; });
    t.check('1280: the readiness check\'s dim covers the whole window too', rd[0] === 0 && rd[1] === rd[2], JSON.stringify(rd));
    await shot(p, 'sheet-readiness-1280x800');
    await p.evaluate(() => cancelReadiness());
    t.check('1280: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 11. The CSS and the markup: one block, before CENTRE COURT, declaring no custom property or colour; no grey Close left anywhere ──
  {
    const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'program.html'), 'utf8').replace(/\r\n/g, '\n');
    const head = '/* ══ SHEETS AND NOTICES IN THE CENTRE COURT LOOK (2026-10-13) ';
    const i = src.indexOf(head), j = src.indexOf('/* ══ ', i + head.length), rec = src.indexOf('/* ══ RECORDS AND BODY WEIGHT IN THE CENTRE COURT LOOK'), cc = src.indexOf('/* ══ CENTRE COURT:');
    const block = i > 0 ? src.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, '') : '';
    t.check('CSS: ONE block headed "SHEETS AND NOTICES IN THE CENTRE COURT LOOK (2026-10-13)", after the RECORDS block and before CENTRE COURT', i > 0 && src.split(head).length === 2 && rec > 0 && rec < i && j > i && cc >= j, [rec, i, j, cc].join());
    const decl = block.match(/(^|[;{\s])--[a-z0-9-]+\s*:/g) || [];
    t.check('CSS: the block declares no custom property (no colour token of its own), and no hex colour but white', decl.length === 0 && !(block.match(/#[0-9a-fA-F]{3,8}\b/g) || []).some(h => !/^#fff$/i.test(h)), JSON.stringify(decl.concat(block.match(/#[0-9a-fA-F]{3,8}\b/g) || []).slice(0, 8)));
    t.check('CSS: no pixel font size under 32 px that is not a token (the type scale)', !/font(-size)?:[^;}]*[^0-9.-]([0-9]|[12][0-9]|3[01])(\.[0-9]+)?px/.test(block.replace(/var\(--fs-[a-z]+\)/g, '')), (block.match(/font(-size)?:[^;}]*px[^;}]*/g) || []).slice(0, 3).join(' | '));
    t.check('markup: no grey Close at the foot of any page (no readiness-skip that closes, no ax-foot, no hs-actions Close)', !/class="readiness-skip" onclick="closeHistorySheet/.test(src) && !/ax-foot|ax-handle/.test(src) && !/hs-actions">\s*<button type="button" class="readiness-skip"/.test(src));
    t.check('markup: the old notice looks are gone (po-dot, a coloured note box, the 380 px install toast)', !/po-dot/.test(src) && !/#1c2420/.test(src) && !/a2hs-toast\s*\{[^}]*380px/.test(src));
    t.check('the guide says where Close is', /<strong>Close<\/strong> at its top right/.test(src) && !/<strong>Close<\/strong> at its end/.test(src));
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})();
