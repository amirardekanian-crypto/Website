// Progress's road and the archive in the Centre Court look (Amir, 2026-10-13: "do Progress's road cards in the Centre Court look"): the This cycle card as the
// screen's one green cover (the cycle's picture graded into the green, the eyebrow, the name, the dates and, in the last 14 days, the days left), the cycles as ONE
// road of paper rows (Done · Now · Up next · Locked, the P24 numeral, folds), Home between cycles drawing the same Up next row, and the archive as a cover with
// day titles and read-only rows. The cover's contents between cycles and on the last cycle are cycle-end.js's; the one-gutter left edges at 320 / 375 / 390 are
// also home-progress.js's. Serve the repo first (python -m http.server 8777 --bind 127.0.0.1, see lib.js), then: node scripts/headless/progress-road.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

// A local calendar day n days from today, as YYYY-MM-DD (noon, so a clock change cannot move it).
const calDay = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const short = iso => { const [, m, d] = iso.split('-').map(Number); return MON[m - 1] + ' ' + d; };
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const active = p => p.evaluate(() => document.querySelector('.screen.active').id);
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();

// Five cycles, the current one at idx, ending `endsIn` days from today (negative: ended that many days ago), five weeks each. Cycle 2 has its tagline, two aims, two paragraphs
// and two outcomes; cycle 3 a teaser (subtitle and two paragraphs); cycle 4 a teaser, cycle 5 none. Three exercises carry a reason (so Why your plan has its door row),
// and the archive has two days.
function prog({ endsIn = 20, idx = 1, whys = 3, name } = {}) {
  const P = H.fixture();
  P.currentCycleIndex = idx;
  P.cycles.push(
    { art: 'brakes', num: 4, name: 'Brake Check', weeks: 'Weeks 16–20', focuses: ['Land softly.'], tagline: 'Stop well', teaser: { subtitle: 'Control the stop.', paragraphs: ['Cycle 4 teaches you to stop.', 'Then you go again.'] } },
    { art: 'peak', num: 5, name: 'Peak Season', weeks: 'Weeks 21–25', focuses: ['Peak.'], tagline: 'Peak' });
  const c2 = P.cycles[1];
  c2.tagline = 'Earn the adaptation';
  c2.focuses = ['Progress the squat and hinge with real, trackable load.', 'Keep the knee quiet.'];
  c2.message = { paragraphs: ['This is where the body starts genuinely changing.', 'Load goes up, the reps stay honest.'], outcomes: ['Measurable strength gains in the back squat', 'A hinge you trust'] };
  P.cycles[2].teaser = { subtitle: 'Strength becomes court speed.', paragraphs: ['Cycle 3 is where the weights get lighter and the movements get faster.', 'Expect it to feel quick.'] };
  P.cycles.forEach((c, i) => { c.startDate = calDay(endsIn - 34 + (i - idx) * 35); c.endDate = calDay(endsIn + (i - idx) * 35); });
  if (name) P.cycles[idx].name = name;
  const ex = P.workouts.days[0].blocks[1].exercises;
  const texts = ['Your squat is the base for every sprint start.', 'A strong hinge protects the back.', 'The press balances the day.'];
  [ex[1], ex[2], P.workouts.days[0].blocks[2].exercises[0]].slice(0, whys).forEach((e, k) => { if (e) e.why = { src: 'goal', text: texts[k] }; });
  if (whys === 0) ex.forEach(e => { delete e.why; });
  P.programHistory = [{ id: 'prog' + idx, label: 'Program ' + idx, subtitle: P.cycles[idx - 1] ? P.cycles[idx - 1].name : 'Foundation Forge', days: [
    { label: 'Day 1', focus: 'Acceleration & Squat Strength', exercises: [{ name: 'Back Squat', detail: '3×10' }, { name: 'Box Jump', detail: '3×4' }, { name: 'Pallof Press', detail: '3×10 each side' }] },
    { label: 'Day 2', focus: 'Upper', exercises: [{ name: 'Incline Dumbbell Press', detail: '3×8' }] }] }];
  return P;
}

// What the road looks like: every row's state, its numeral, name, mono line, whether its head is a button, whether it is open.
const roadOf = p => p.evaluate(() => [...document.querySelectorAll('#road-wrap .road-row')].map(r => {
  const h = r.querySelector('.road-head'), num = r.querySelector('.road-num'), cs = getComputedStyle(num);
  return { n: r.dataset.cycle, state: ['done', 'now', 'next', 'locked'].find(k => r.classList.contains('is-' + k)) || '-', num: num.textContent, name: r.querySelector('.road-nm').textContent,
    line: h.querySelector('.road-ln').innerText.replace(/\s+/g, ' ').trim(), button: h.tagName === 'BUTTON', exp: h.getAttribute('aria-expanded'), ctl: h.getAttribute('aria-controls'),
    open: r.classList.contains('is-open'), fill: cs.color, stroke: cs.webkitTextStrokeColor, strokeW: cs.webkitTextStrokeWidth, size: cs.fontSize, weight: cs.fontWeight,
    lock: !!r.querySelector('.road-lock'), chev: !!r.querySelector('.road-chev'), tag: (r.querySelector('.road-tag') || {}).textContent || null, go: !!r.querySelector('.road-go'), hist: h.dataset.hist || null };
}));
const toPlan = async p => { await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500); };

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });

  // ── 1. the cover: eyebrow, title, dates, its picture graded into the green, white text, inside the gutter ──
  {
    const P = prog();
    const { ctx, p } = await H.openProgram(browser, { prog: P, w: 390, h: 844 });
    await toPlan(p);
    await p.waitForFunction(() => { const i = document.querySelector('#cycle-card-wrap .cyc-img'); return i && i.complete; }, null, { timeout: 8000 }).catch(() => {});
    const c = await p.evaluate(() => {
      const card = document.querySelector('#cycle-card-wrap .cyc-card'); if (!card) return null;
      const q = s => card.querySelector(s), cs = el => el && getComputedStyle(el), r = card.getBoundingClientRect();
      const img = q('.cyc-img'), ic = cs(img), name = q('.cyc-name');
      const col = el => { const m = /rgba?\(([^)]+)\)/.exec(cs(el).color); const v = m[1].split(',').map(Number); return { rgb: v.slice(0, 3).join(','), a: v.length > 3 ? v[3] : 1 }; };
      return { tag: card.tagName, onclick: card.getAttribute('onclick'), role: card.getAttribute('role'), left: Math.round(r.left * 10) / 10, width: Math.round(r.width * 10) / 10, radius: cs(card).borderTopLeftRadius,
        bg: cs(card).backgroundImage.slice(0, 28), eyebrow: q('.cyc-top').innerText.replace(/\s+/g, ' ').trim(), title: name.innerText.trim(), titleTag: name.tagName, titleSize: parseFloat(cs(name).fontSize), titleWeight: cs(name).fontWeight,
        dates: q('.cyc-dates') && q('.cyc-dates').innerText.replace(/\s+/g, ' ').trim(), hasBanner: !!document.querySelector('#sub-banner-wrap, .sub-banner'),
        img: !!img, src: img && img.getAttribute('src'), loaded: !!img && img.naturalWidth > 0, blend: ic.mixBlendMode, opacity: ic.opacity, mask: (ic.webkitMaskImage || ic.maskImage || '').slice(0, 24), scrim: !!q('.cyc-scrim'),
        white: ['.cyc-top', '.cyc-name', '.cyc-dates', '.cyc-k small'].map(s => [s, col(q(s))]), week: cs(q('.cyc-k')).color, bars: card.querySelectorAll('.cyc-bar').length,
        dot: getComputedStyle(q('.cyc-top'), '::before').backgroundColor, dotContent: getComputedStyle(q('.cyc-top'), '::before').content,
        greens: [...document.querySelectorAll('#screen-plan *')].filter(e => /radial-gradient/.test(getComputedStyle(e).backgroundImage)).map(e => e.className) };
    });
    t.check('the cover: a plain div card on Progress, no tap, 16 px corners, on the 20 px gutter', !!c && c.tag === 'DIV' && !c.onclick && !c.role && c.radius === '16px' && c.left === 20 && c.width === 350, JSON.stringify(c && [c.tag, c.onclick, c.radius, c.left, c.width]));
    t.check('the cover: it is the one green thing on Progress (the hero gradient), and nothing else has one', !!c && /radial-gradient/.test(c.bg) && c.greens.join() === 'cyc-card', JSON.stringify(c && [c.bg, c.greens]));
    t.check('the cover: the eyebrow reads THIS CYCLE · 2 OF 5, with a mint dot', !!c && c.eyebrow === 'THIS CYCLE · 2 OF 5' && c.dot === 'rgb(109, 190, 149)' && c.dotContent === '""', JSON.stringify(c && [c.eyebrow, c.dot]));
    t.check('the cover: the cycle\'s name is the title, in capitals, 28 to 36 px, 900', !!c && c.title === 'LOAD & BUILD' && c.titleTag === 'H2' && c.titleSize >= 28 && c.titleSize <= 36 && c.titleWeight === '900', JSON.stringify(c && [c.title, c.titleTag, c.titleSize, c.titleWeight]));
    t.check('the cover: one mono line of the cycle\'s dates (the fixture\'s own days), no days left with 20 to go',
      !!c && c.dates === short(P.cycles[1].startDate) + ' – ' + short(P.cycles[1].endDate) && !/left/i.test(c.dates), JSON.stringify(c && c.dates) + ' want ' + short(P.cycles[1].startDate) + ' – ' + short(P.cycles[1].endDate));
    t.check('the cover: the cycle\'s own picture (iron), loaded, in luminosity at about .66, masked from the left, with a scrim', !!c && c.img && /assets\/art\/cycles\/iron-v1\.webp$/.test(c.src) && c.loaded && c.blend === 'luminosity' && Math.abs(parseFloat(c.opacity) - 0.66) < 0.05 && /gradient/.test(c.mask) && c.scrim, JSON.stringify(c && [c.src, c.loaded, c.blend, c.opacity, c.mask, c.scrim]));
    t.check('the cover: its text is white (title, eyebrow, dates, small lines), the week number is the clay on green', !!c && c.white.every(([s, v]) => v.rgb === '255,255,255' && v.a >= 0.7) && c.week === 'rgb(224, 107, 67)', JSON.stringify(c && [c.white, c.week]));
    t.check('the cover: the bars stay (week and sessions), and the days-left banner and the header\'s dates line are gone', !!c && c.bars === 2 && !c.hasBanner, JSON.stringify(c && [c.bars, c.hasBanner]));
    t.check('no page errors (cover)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. days left: only in the cycle's last 14 days, counted from the local end day, singular on the last-but-today ──
  for (const [n, want] of [[20, null], [15, null], [14, '14 DAYS LEFT'], [9, '9 DAYS LEFT'], [1, '1 DAY LEFT'], [0, '0 DAYS LEFT']]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ endsIn: n }), w: 390, h: 844 });
    await toPlan(p);
    const d = await p.evaluate(() => { const e = document.querySelector('#cycle-card-wrap .cyc-dates'); return e ? { text: e.innerText.replace(/\s+/g, ' ').trim(), b: (e.querySelector('b') || {}).textContent || null, bc: e.querySelector('b') ? getComputedStyle(e.querySelector('b')).color : null } : null; });
    const ok = want ? !!d && d.text.endsWith(' · ' + want) && d.b && d.b.toUpperCase() === want && d.bc === 'rgb(109, 190, 149)' : !!d && !/left/i.test(d.text) && !d.b;
    t.check(`ends in ${n} day${n === 1 ? '' : 's'}: ${want ? 'the dates line ends "· ' + want + '" (mint)' : 'no days left on the cover'}`, ok, JSON.stringify(d));
    await ctx.close();
  }
  // the same, in zones either side of UTC: the dates and the count are local calendar days
  for (const tz of ['America/Los_Angeles', 'Pacific/Auckland', 'Asia/Tehran']) {
    const P = prog({ endsIn: 9 });
    const { ctx, p } = await H.openProgram(browser, { prog: P, w: 390, h: 844, tz });
    await toPlan(p);
    const d = await p.evaluate(() => { const e = document.querySelector('#cycle-card-wrap .cyc-dates'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; });
    // today's local day in that zone is what the cycle's days are counted from, so build the expectation inside the page's own clock
    const exp = await p.evaluate(([e]) => { const [y, m, dd] = e.split('-').map(Number); const n = new Date(); const t0 = Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); return Math.round((Date.UTC(y, m - 1, dd) - t0) / 86400000); }, [P.cycles[1].endDate]);
    t.check(`${tz}: the cover counts the days left from the local end day and shows the cycle's own dates`, !!d && d.endsWith(' · ' + exp + ' DAYS LEFT') && d.startsWith(short(P.cycles[1].startDate) + ' – ' + short(P.cycles[1].endDate)), d + ' want ' + exp);
    await ctx.close();
  }

  // ── 3. past the end date: the eyebrow says so, the line is Finished …, the roadmap's last says Roadmap complete ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ endsIn: -4 }), w: 390, h: 844 });
    await toPlan(p);
    const c = await p.evaluate(() => { const card = document.querySelector('#cycle-card-wrap .cyc-card'); const q = s => card.querySelector(s);
      return { top: q('.cyc-top').innerText.replace(/\s+/g, ' ').trim(), fin: q('.cyc-fin-h').textContent.trim(), tick: !!q('.cyc-fin-tick svg'), dot: getComputedStyle(q('.cyc-top'), '::before').display, dates: !!q('.cyc-dates'),
        title: q('.cyc-name').innerText.trim(), sub: q('.cyc-fin-s').innerText.replace(/\s+/g, ' ').trim(), cls: card.className }; });
    t.check('past its end: the eyebrow reads CYCLE COMPLETE · 2 OF 5 (a tick for the dot), the title is still the name, and the line says Finished', c.top === 'CYCLE COMPLETE · 2 OF 5' && c.fin === 'Cycle complete' && c.tick && c.dot === 'none' && !c.dates && c.title === 'LOAD & BUILD' && /^FINISHED [A-Z]{3} \d{1,2} · 5 OF 5 WEEKS$/.test(c.sub), JSON.stringify(c));
    await ctx.close();
    const last = await H.openProgram(browser, { prog: prog({ endsIn: -4, idx: 4 }), w: 390, h: 844 });
    await toPlan(last.p);
    const l = await last.p.evaluate(() => { const card = document.querySelector('#cycle-card-wrap .cyc-card'); return { top: card.querySelector('.cyc-top').innerText.replace(/\s+/g, ' ').trim(), fin: card.querySelector('.cyc-fin-h').textContent.trim(), meter: card.querySelectorAll('.cyc-fin-meter span').length }; });
    t.check('the last cycle past its end: the eyebrow reads ROADMAP COMPLETE (no "of"), the C1 to C5 bars stay', l.top === 'ROADMAP COMPLETE' && l.fin === 'Roadmap complete' && l.meter === 5, JSON.stringify(l));
    await last.ctx.close();
  }

  // ── 4. the road: one row per cycle in order, the right state before, during and after a cycle's dates, the numeral solid only when done ──
  const states = {};
  for (const [tag, ends, want, lines] of [
    ['during (ends in 20 days)', 20, 'done now next locked locked', ['WEEKS 1–5 · DONE', 'WEEKS 6–10 · NOW', 'WEEKS 11–15 · UP NEXT', 'WEEKS 16–20 · LOCKED', 'WEEKS 21–25 · LOCKED']],
    ['before (starts tomorrow)', 34 + 1, 'done now next locked locked', null],
    ['on its last day', 0, 'done now next locked locked', null],
    ['after (ended yesterday)', -1, 'done done next locked locked', ['WEEKS 1–5 · DONE', 'WEEKS 6–10 · DONE', 'WEEKS 11–15 · UP NEXT', 'WEEKS 16–20 · LOCKED', 'WEEKS 21–25 · LOCKED']],
    ['after (ended 40 days ago)', -40, 'done done next locked locked', null],
  ]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ endsIn: ends }), w: 390, h: 844 });
    await toPlan(p);
    const rows = await roadOf(p);
    states[tag] = rows;
    t.check(`the road ${tag}: five rows in order, states ${want}`, rows.length === 5 && rows.map(r => r.n).join() === '1,2,3,4,5' && rows.map(r => r.state).join(' ') === want, rows.map(r => r.n + ':' + r.state).join(' '));
    if (lines) t.check(`the road ${tag}: the mono lines read ${lines[1]}`, rows.map(r => r.line).join('|') === lines.join('|'), rows.map(r => r.line).join('|'));
    t.check(`the road ${tag}: the numeral is solid green only on a done row; the others are outlined (no fill)`,
      rows.every(r => (r.state === 'done') === (r.fill === 'rgb(14, 74, 54)') && (r.state === 'done' || r.fill === 'rgba(0, 0, 0, 0)') && r.strokeW === '1.5px' && r.size === '32px' && r.weight === '900'), JSON.stringify(rows.map(r => [r.state, r.fill, r.stroke])));
    t.check(`the road ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    const rows = states['during (ends in 20 days)'];
    t.check('the road: the numerals count 1 to 5 and the names are the cycles\'', rows.map(r => r.num).join() === '1,2,3,4,5' && rows.map(r => r.name).join('|') === 'Foundation Forge|Load & Build|Power Translation|Brake Check|Peak Season', rows.map(r => r.num + r.name).join('|'));
    t.check('the road: Now has a mint NOW tag and a chevron; a locked cycle a lock; the outlines are green, grey-green and grey',
      rows[1].tag === 'Now' && rows[1].chev && !rows[0].tag && !rows[2].tag && rows[3].lock && rows[4].lock && !rows[1].lock && rows[1].stroke === 'rgb(14, 74, 54)' && rows[2].stroke !== rows[1].stroke && rows[2].stroke !== rows[4].stroke && rows[3].stroke === rows[4].stroke, JSON.stringify(rows.map(r => [r.state, r.stroke, r.tag, r.lock])));
  }

  // ── 5. folds: the current cycle open by default, the next closed, aria-expanded follows, Enter and Space work, the chevron turns ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog(), w: 390, h: 844 });
    await toPlan(p);
    const rows = await roadOf(p);
    t.check('folds: Now is open by default (aria-expanded true), Up next and the teased Locked are closed, the untouched ones are not folds',
      rows[1].open && rows[1].exp === 'true' && !rows[2].open && rows[2].exp === 'false' && !rows[3].open && rows[3].exp === 'false' && rows[3].button && !rows[4].button && rows[4].exp === null && !rows[0].exp, JSON.stringify(rows.map(r => [r.n, r.state, r.exp, r.button])));
    t.check('folds: every fold\'s aria-controls names its body (road-body-N), which exists', await p.evaluate(() => [...document.querySelectorAll('#road-wrap .road-head[aria-controls]')].every(h => { const b = document.getElementById(h.getAttribute('aria-controls')); return b && /^road-body-\d$/.test(b.id) && b.classList.contains('road-body'); })));
    const vis = sel => p.isVisible(sel);
    t.check('folds: Now shows its body, Up next shows none of it', await vis('#road-body-2 .road-aims') && await vis('#road-body-2 .road-why') && !(await vis('#road-body-3 .road-lead')) && !(await vis('#road-body-3 .road-paras')), 'now ' + await vis('#road-body-2 .road-aims') + ' next ' + await vis('#road-body-3 .road-lead'));
    const state = n => p.evaluate(n => { const r = document.querySelector(`#road-wrap .road-row[data-cycle="${n}"]`), h = r.querySelector('.road-head'), b = r.querySelector('.road-body'), ch = r.querySelector('.road-chev');
      return { open: r.classList.contains('is-open'), exp: h.getAttribute('aria-expanded'), height: b ? Math.round(b.getBoundingClientRect().height) : null, turn: ch ? getComputedStyle(ch).transform : null, on: document.querySelector('.screen.active').id }; }, n);
    await p.click('#road-wrap .road-row[data-cycle="3"] .road-head'); await p.waitForTimeout(450);
    let s = await state(3);
    t.check('folds: a tap on Up next opens it (aria-expanded true, the body grows, the chevron turns), and stays on Progress', s.open && s.exp === 'true' && s.height > 60 && s.turn !== 'none' && s.on === 'screen-plan' && await vis('#road-body-3 .road-lead') && await vis('#road-body-3 .road-paras'), JSON.stringify(s));
    const teaser = await p.evaluate(() => ({ lead: document.querySelector('#road-body-3 .road-lead').textContent, paras: [...document.querySelectorAll('#road-body-3 .road-paras p')].map(x => x.textContent), em: [...document.querySelectorAll('#road-body-3 .road-paras p')].map(x => !!x.querySelector('em')).join() }));
    t.check('folds: Up next\'s body is the teaser: the subtitle as the lead line, the paragraphs, the last one in italics', teaser.lead === 'Strength becomes court speed.' && teaser.paras.length === 2 && teaser.em === 'false,true', JSON.stringify(teaser));
    // the keyboard: Enter folds it, Space opens it again
    await p.focus('#road-wrap .road-row[data-cycle="3"] .road-head');
    await p.keyboard.press('Enter'); await p.waitForTimeout(450);
    s = await state(3);
    t.check('folds: Enter on the focused row folds it (the chevron turns back)', !s.open && s.exp === 'false' && s.height === 0 && s.turn === 'none', JSON.stringify(s));
    await p.keyboard.press('Space'); await p.waitForTimeout(450);
    s = await state(3);
    t.check('folds: Space on the focused row opens it', s.open && s.exp === 'true' && s.height > 60, JSON.stringify(s));
    // the current cycle folds too
    await p.click('#road-wrap .road-row[data-cycle="2"] .road-head'); await p.waitForTimeout(450);
    s = await state(2);
    t.check('folds: the current cycle folds (aria-expanded false, no height) and unfolds', !s.open && s.exp === 'false' && s.height === 0 && s.on === 'screen-plan', JSON.stringify(s));
    await p.click('#road-wrap .road-row[data-cycle="2"] .road-head'); await p.waitForTimeout(450);
    t.check('folds: and opens again', (await state(2)).open);
    // a locked cycle with a teaser folds; the one without is not a tap target
    await p.click('#road-wrap .road-row[data-cycle="4"] .road-head'); await p.waitForTimeout(450);
    t.check('folds: a Locked cycle with a teaser opens to it', (await state(4)).open && await vis('#road-body-4 .road-lead') && (await p.textContent('#road-body-4 .road-lead')) === 'Control the stop.');
    await p.evaluate(() => document.querySelector('#road-wrap .road-row[data-cycle="5"] .road-head').click());
    t.check('folds: a Locked cycle with no teaser does nothing', await p.evaluate(() => { const r = document.querySelector('#road-wrap .road-row[data-cycle="5"]'); return !r.classList.contains('is-open') && !r.querySelector('.road-body') && r.querySelector('.road-head').tagName === 'DIV'; }));
    // the folds are kept across a tab change
    await p.evaluate(() => { goTo('home'); goTo('plan'); }); await p.waitForTimeout(450);
    const kept = await roadOf(p);
    t.check('folds: they stay as the athlete left them after leaving Progress and coming back', kept.map(r => r.open ? 1 : 0).join('') === '01110', kept.map(r => r.open ? 1 : 0).join(''));
    t.check('no page errors (folds)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. the Now row's body: tagline, the aims, why it matters (the clay quote), the outcomes, then Why your plan looks like this ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ whys: 3 }), w: 390, h: 844 });
    await toPlan(p);
    const b = await p.evaluate(() => {
      const body = document.querySelector('#road-body-2'), q = s => body.querySelector(s), qa = s => [...body.querySelectorAll(s)], cs = (el, pse) => getComputedStyle(el, pse);
      const order = [...body.querySelector('.road-in').children].map(e => e.className.split(' ')[0] + (e.tagName === 'H3' ? ':' + e.textContent : '')).join(' | ');
      const why = q('.road-why');
      return { order, tagline: q('.road-tagline').textContent, taglineStyle: cs(q('.road-tagline')).fontStyle, secs: qa('.road-sec').map(e => e.innerText.trim()), secColor: cs(q('.road-sec')).color, secFont: cs(q('.road-sec')).fontFamily.split(',')[0],
        aims: qa('.road-aims li').map(li => [li.querySelector('.road-n').textContent, li.querySelector('.road-aim').textContent]), nFont: cs(q('.road-n')).fontFamily.split(',')[0], nColor: cs(q('.road-n')).color,
        paras: qa('.road-why p').length, quote: cs(why, '::before').content, quoteColor: cs(why, '::before').color, quoteFont: cs(why, '::before').fontFamily.split(',')[0],
        outs: qa('.road-outs li').map(li => [li.querySelector('.road-out').textContent, !!li.querySelector('.road-ck svg')]), door: q('.road-why-door') && { tag: q('.road-why-door').tagName, text: q('.road-why-door').innerText.replace(/\s+/g, ' ').trim(), cls: q('.road-why-door').className },
        doorFont: q('.road-why-door .hrow-l') && cs(q('.road-why-door .hrow-l')).fontFamily.split(',')[0], doorLeft: Math.round(q('.road-why-door').getBoundingClientRect().left), doorW: Math.round(q('.road-why-door').getBoundingClientRect().width) };
    });
    t.check('Now body: the tagline as one italic line first, then The aims, Why this cycle matters, Expected outcomes, then the door row', b.order === 'road-tagline | road-sec:The aims | road-aims | road-sec:Why this cycle matters | road-why | road-sec:Expected outcomes | road-outs | hrow', b.order);
    t.check('Now body: the tagline is italic, the section titles are small green Space Mono titles', b.tagline === 'Earn the adaptation' && b.taglineStyle === 'italic' && b.secs.map(s => s.toLowerCase()).join('|') === 'the aims|why this cycle matters|expected outcomes' && b.secColor === 'rgb(14, 74, 54)' && /Space Mono/.test(b.secFont), JSON.stringify([b.tagline, b.taglineStyle, b.secs, b.secColor, b.secFont]));
    t.check('Now body: the aims are numbered rows (01, 02 in Space Mono green, the aim in Barlow)', b.aims.map(a => a[0]).join() === '01,02' && b.aims[0][1] === 'Progress the squat and hinge with real, trackable load.' && /Space Mono/.test(b.nFont) && b.nColor === 'rgb(14, 74, 54)', JSON.stringify(b.aims));
    t.check('Now body: why it matters carries Amir\'s paragraphs behind the clay quote mark of the Coach\'s note', b.paras === 2 && /201C|“/.test(b.quote) && b.quoteColor === 'rgb(199, 85, 47)' && /Barlow Condensed/.test(b.quoteFont), JSON.stringify([b.paras, b.quote, b.quoteColor, b.quoteFont]));
    t.check('Now body: the outcomes are rows with a green tick', b.outs.length === 2 && b.outs.every(o => o[1]) && b.outs[0][0] === 'Measurable strength gains in the back squat', JSON.stringify(b.outs));
    t.check('Now body: Why your plan looks like this is a door row (.hrow) with its 3 reasons, the full width of the road', !!b.door && b.door.tag === 'BUTTON' && /\bhrow\b/.test(b.door.cls) && /^Why your plan looks like this 3 reasons$/i.test(b.door.text.replace(/\s*›$/, '')) && b.doorLeft === 20 && b.doorW === 350 && /Space Mono/.test(b.doorFont), JSON.stringify(b.door) + ' ' + b.doorLeft + ' ' + b.doorW);
    await p.click('#road-body-2 .road-why-door'); await p.waitForTimeout(400);
    t.check('Now body: the door opens the Why page', await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && /Why Cycle 2 looks like this|looks like this/.test(document.querySelector('#hist-overlay .readiness-title').textContent)));
    t.check('no page errors (Now body)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // fewer than three reasons: no door row (a thin page is never offered)
    const few = await H.openProgram(browser, { prog: prog({ whys: 2 }), w: 390, h: 844 });
    await toPlan(few.p);
    t.check('Why your plan: with only 2 reasons the door row is not there', await few.p.evaluate(() => !document.querySelector('.road-why-door')));
    await few.ctx.close();
  }

  // ── 7. Done → archive: the cycle before the current one opens its archive, ← comes back to Progress ──
  {
    const P = prog({ endsIn: 20, idx: 2 });   // cycles 1 and 2 are done; the newest archive is cycle 2's
    const { ctx, p } = await H.openProgram(browser, { prog: P, w: 390, h: 844 });
    await toPlan(p);
    const rows = await roadOf(p);
    t.check('Done rows: the one before the current opens its archive (a button with a grey ›); the older done row is a plain row', rows[1].button && rows[1].hist === 'prog2' && rows[1].go && !rows[1].chev && !rows[0].button && !rows[0].go && rows[0].state === 'done' && rows[1].state === 'done', JSON.stringify(rows.slice(0, 2)));
    t.check('Done rows: the archive button names itself for a screen reader', await p.evaluate(() => document.querySelector('#road-wrap .road-row[data-cycle="2"] .road-head').getAttribute('aria-label') === 'Cycle 2, Load & Build, done. Open its archive.'));
    await p.click('#road-wrap .road-row[data-cycle="2"] .road-head'); await p.waitForTimeout(500);
    t.check('Done rows: a tap opens the archive, with Progress still the lit tab', (await active(p)) === 'screen-archive' && await p.evaluate(() => document.querySelector('#global-tabs .nav-item.active').dataset.tab === 'plan'), await active(p));
    const a = await p.evaluate(() => { const b = document.getElementById('archive-banner'), back = b.querySelector('.archive-back'), r = back.getBoundingClientRect(), cs = getComputedStyle(back);
      return { label: document.getElementById('archive-label').innerText.replace(/\s+/g, ' ').trim(), title: document.getElementById('archive-title').innerText.trim(), weeks: document.getElementById('archive-weeks').innerText.trim(),
        img: (document.getElementById('archive-img').getAttribute('src') || ''), imgShown: getComputedStyle(document.getElementById('archive-img')).display !== 'none', loaded: document.getElementById('archive-img').naturalWidth > 0,
        blend: getComputedStyle(document.getElementById('archive-img')).mixBlendMode, bg: getComputedStyle(b).backgroundImage.slice(0, 24), back: { label: back.getAttribute('aria-label'), onclick: back.getAttribute('onclick'), w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderTopLeftRadius, color: cs.color, bgc: cs.backgroundColor },
        dot: getComputedStyle(document.getElementById('archive-label'), '::before').backgroundColor, titleSize: parseFloat(getComputedStyle(document.getElementById('archive-title')).fontSize), titleColor: getComputedStyle(document.getElementById('archive-title')).color, watermark: b.hasAttribute('data-watermark') }; });
    t.check('Archive cover: ● COMPLETED · CYCLE 2, the name in capitals, its weeks in mono', a.label === 'COMPLETED · CYCLE 2' && a.title === 'LOAD & BUILD' && a.weeks === 'WEEKS 6–10' && a.dot === 'rgb(109, 190, 149)' && a.titleSize >= 28 && a.titleSize <= 36 && a.titleColor === 'rgb(255, 255, 255)' && !a.watermark, JSON.stringify(a));
    t.check('Archive cover: the cycle\'s picture (iron) graded into the green, loaded', /assets\/art\/cycles\/iron-v1\.webp$/.test(a.img) && a.imgShown && a.loaded && a.blend === 'luminosity' && /radial-gradient/.test(a.bg), JSON.stringify([a.img, a.imgShown, a.loaded, a.blend, a.bg]));
    t.check('Archive cover: ← is the day cover\'s glass button: 44 px, round, white, a dark glass, Back to Progress, goTo(plan)', a.back.w === 44 && a.back.h === 44 && a.back.radius === '50%' && a.back.color === 'rgb(255, 255, 255)' && /rgba\(0, 0, 0, 0\.22\)/.test(a.back.bgc) && a.back.label === 'Back to Progress' && a.back.onclick === "goTo('plan')", JSON.stringify(a.back));
    await shot(p, 'progress-road-archive');
    await p.click('#archive-banner .archive-back'); await p.waitForTimeout(500);
    t.check('Archive: ← comes back to Progress, with the road still there', (await active(p)) === 'screen-plan' && (await roadOf(p)).length === 5, await active(p));
    await p.click('#road-wrap .road-row[data-cycle="2"] .road-head'); await p.waitForTimeout(500);
    await p.goBack().catch(() => {}); await p.waitForTimeout(600);
    t.check('Archive: the phone\'s Back (NAV-01) presses ← and lands on Progress', (await active(p)) === 'screen-plan', await active(p));
    t.check('no page errors (archive)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 8. the archive's days and rows: block titles, outlined numerals, read-only rows, no boxes; the empty state; a cycle it cannot name ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ endsIn: 20 }), w: 390, h: 844 });
    await p.evaluate(() => goTo('archive', 'prog1')); await p.waitForTimeout(500);
    const d = await p.evaluate(() => {
      const sc = document.getElementById('archive-scroll'), cs = (el, pse) => getComputedStyle(el, pse);
      const days = [...sc.querySelectorAll('.archive-day')].map(day => ({ title: day.querySelector('.archive-day-title').innerText.replace(/\s+/g, ' ').trim(),
        rows: [...day.querySelectorAll('.archive-ex')].map(r => ({ num: r.querySelector('.archive-ex-num').textContent, name: r.querySelector('.archive-ex-name').textContent, detail: (r.querySelector('.archive-ex-detail') || {}).textContent || null })) }));
      const row = sc.querySelector('.archive-ex'), num = row.querySelector('.archive-ex-num'), nm = row.querySelector('.archive-ex-name'), dt = row.querySelector('.archive-ex-detail'), title = sc.querySelector('.archive-day-title');
      const second = sc.querySelectorAll('.archive-ex')[1];
      return { days, interactive: sc.querySelectorAll('button, a, input, [role="button"], [onclick], [tabindex]').length, cursor: cs(row).cursor, rowBg: cs(row).backgroundColor, rowBorder: cs(row).borderTopWidth, secondBorder: cs(second).borderTopWidth + ' ' + cs(second).borderTopStyle, rowRadius: cs(row).borderTopLeftRadius, shadow: cs(row).boxShadow,
        numFill: cs(num).color, numStroke: cs(num).webkitTextStrokeWidth + ' ' + cs(num).webkitTextStrokeColor, numSize: cs(num).fontSize, numWeight: cs(num).fontWeight, numFont: cs(num).fontFamily.split(',')[0],
        nameSize: cs(nm).fontSize, nameWeight: cs(nm).fontWeight, nameFont: cs(nm).fontFamily.split(',')[0], detailFont: cs(dt).fontFamily.split(',')[0], detailColor: cs(dt).color,
        titleSize: cs(title).fontSize, titleCaps: cs(title).textTransform, titleColor: cs(title).color, titleAfter: cs(title, '::after').content, titleAfterH: cs(title, '::after').height, left: Math.round(row.getBoundingClientRect().left), titleLeft: Math.round(title.getBoundingClientRect().left + parseFloat(cs(title).paddingLeft)),
        boxes: [...sc.querySelectorAll('*')].filter(e => { const c = cs(e); return c.backgroundColor === 'rgb(255, 255, 255)' || (c.borderTopLeftRadius !== '0px' && c.borderTopWidth !== '0px'); }).length };
    });
    t.check('Archive: each day is a block title (DAY 1 · its focus) and its exercises are numbered rows', d.days.length === 2 && d.days[0].title === 'DAY 1 · ACCELERATION & SQUAT STRENGTH' && d.days[1].title === 'DAY 2 · UPPER' && d.days[0].rows.map(r => r.num + r.name).join('|') === '1Back Squat|2Box Jump|3Pallof Press' && d.days[0].rows[2].detail === '3×10 each side', JSON.stringify(d.days));
    t.check('Archive: the title is the .prog-sec look (15 px capitals in green ink, a hairline to the right edge)', d.titleSize === '15px' && d.titleCaps === 'uppercase' && d.titleColor === 'rgb(14, 74, 54)' && d.titleAfter === '""' && d.titleAfterH === '1px', JSON.stringify([d.titleSize, d.titleCaps, d.titleColor, d.titleAfter, d.titleAfterH]));
    t.check('Archive: the numeral is the P24 one (outlined, Barlow Condensed 900, 32 px), the name Barlow 600 18 px, the numbers mono grey', d.numFill === 'rgba(0, 0, 0, 0)' && /^1\.5px rgb\(14, 74, 54\)$/.test(d.numStroke) && d.numSize === '32px' && d.numWeight === '900' && /Barlow Condensed/.test(d.numFont) && d.nameSize === '18px' && d.nameWeight === '600' && /Space Mono/.test(d.detailFont) && d.detailColor === 'rgb(92, 92, 92)', JSON.stringify(d));
    t.check('Archive: read only (nothing to tap, tick or open: no buttons, links, inputs or tab stops) and the cursor stays the arrow', d.interactive === 0 && d.cursor !== 'pointer', d.interactive + ' ' + d.cursor);
    t.check('Archive: paper rows, no white boxes: transparent, square, a hairline only between rows, no shadow', d.rowBg === 'rgba(0, 0, 0, 0)' && d.rowRadius === '0px' && d.rowBorder === '0px' && /^1px solid/.test(d.secondBorder) && d.shadow === 'none' && d.boxes === 0, JSON.stringify([d.rowBg, d.rowRadius, d.rowBorder, d.secondBorder, d.shadow, d.boxes]));
    t.check('Archive: the rows and the day titles start on the 20 px gutter', d.left === 20 && d.titleLeft === 20, d.left + ' ' + d.titleLeft);
    t.check('no page errors (archive days)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // a cycle the archive cannot name: no picture, the plain green, the id's number
    const odd = prog({ endsIn: 20 }); odd.programHistory.push({ id: 'prog9', label: 'Program 9', subtitle: 'Mystery Block', days: [{ label: 'Day 1', focus: '', exercises: [{ name: 'Walk', detail: '' }] }] });   // an older entry no cycle is named for
    const o = await H.openProgram(browser, { prog: odd, w: 390, h: 844 });
    await o.p.evaluate(() => goTo('archive', 'prog9')); await o.p.waitForTimeout(400);
    const r = await o.p.evaluate(() => ({ label: document.getElementById('archive-label').innerText.trim(), title: document.getElementById('archive-title').innerText.trim(), weeks: document.getElementById('archive-weeks').innerText.trim(),
      img: getComputedStyle(document.getElementById('archive-img')).display, bg: getComputedStyle(document.getElementById('archive-banner')).backgroundImage.slice(0, 24), day: document.querySelector('.archive-day-title').innerText.trim(), detail: !!document.querySelector('.archive-ex-detail') }));
    t.check('Archive: a program it cannot match to a cycle shows the plain green (no picture), its id\'s cycle number and its day count', r.img === 'none' && /radial-gradient/.test(r.bg) && r.label === 'COMPLETED · CYCLE 9' && r.title === 'MYSTERY BLOCK' && r.weeks === '1 DAY' && r.day === 'DAY 1' && !r.detail, JSON.stringify(r));
    t.check('no page errors (odd archive)', o.p.errs.length === 0, o.p.errs.join(' | '));
    await o.ctx.close();
    // nothing archived yet
    const none = prog({ endsIn: 20 }); none.programHistory = [];
    const e = await H.openProgram(browser, { prog: none, w: 390, h: 844 });
    await e.p.evaluate(() => goTo('archive')); await e.p.waitForTimeout(400);
    const em = await e.p.evaluate(() => { const s = document.querySelector('#archive-scroll .archive-empty'); const cs = s && getComputedStyle(s); return { text: s && s.textContent, tag: s && s.tagName, bg: cs && cs.backgroundColor, border: cs && cs.borderTopWidth, title: document.getElementById('archive-title').innerText.trim(), weeks: document.getElementById('archive-weeks').hidden, kids: document.querySelectorAll('#archive-scroll > *').length }; });
    t.check('Archive, nothing yet: one plain sentence on the paper under the cover', !!em.text && em.text === 'Past programs will appear here once your first cycle wraps up.' && em.tag === 'P' && em.bg === 'rgba(0, 0, 0, 0)' && em.border === '0px' && em.title === 'NO ARCHIVES YET' && em.weeks && em.kids === 1, JSON.stringify(em));
    await shot(e.p, 'progress-road-archive-empty');
    await e.ctx.close();
  }

  // ── 9. Home between cycles: the same Up next row, folded, in the gutter; the last cycle has none ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ endsIn: -4 }), w: 390, h: 844 });
    const h = await p.evaluate(() => { const n = document.querySelector('.bt-next'), r = n && n.querySelector('.road-row.is-next'), hd = r && r.querySelector('.road-head');
      return { row: !!r, n: r && r.dataset.cycle, num: r && r.querySelector('.road-num').textContent, name: r && r.querySelector('.road-nm').textContent, line: r && r.querySelector('.road-ln').innerText.replace(/\s+/g, ' ').trim(), exp: hd && hd.getAttribute('aria-expanded'), ctl: hd && hd.getAttribute('aria-controls'),
        old: !!(n && n.querySelector('.current-message, .cm-banner, .cm-toggle, .cm-pill')), left: n && Math.round(n.querySelector('.road').getBoundingClientRect().left), width: n && Math.round(n.querySelector('.road').getBoundingClientRect().width),
        collide: document.querySelectorAll('#road-body-3').length, bodyId: !!document.getElementById('bt-road-body-3'), head: [...document.querySelectorAll('#home-week-wrap .home-section-title')].map(x => x.textContent.trim()).join('|'),
        door: (document.querySelector('.bt-wa b') || {}).textContent, done: (document.querySelector('.bt-done .hrow-l') || {}).textContent, rep: !!document.getElementById('bt-rep') }; });
    t.check('Home between cycles: Up next is the road\'s row for cycle 3 (numeral, name, WEEKS 11–15 · UP NEXT), closed', h.row && h.n === '3' && h.num === '3' && h.name === 'Power Translation' && h.line === 'WEEKS 11–15 · UP NEXT' && h.exp === 'false' && h.ctl === 'bt-road-body-3' && h.bodyId, JSON.stringify(h));
    t.check('Home between cycles: no photo card is left (no banner, pill or Read more), the row is on the 20 px gutter, and Progress\'s ids are not repeated', !h.old && h.left === 20 && h.width === 350 && h.collide === 1, JSON.stringify([h.old, h.left, h.width, h.collide]));
    t.check('Home between cycles: the rest is as it was (Cycle 2 complete door row, Ready for Cycle 3?, Repeat a session)', h.done === 'Cycle 2 complete' && h.door === 'Ready for Cycle 3?' && h.rep && /Up next/.test(h.head), JSON.stringify([h.done, h.door, h.rep, h.head]));
    await p.click('.bt-next .road-head'); await p.waitForTimeout(450);
    const o = await p.evaluate(() => ({ open: document.querySelector('.bt-next .road-row').classList.contains('is-open'), exp: document.querySelector('.bt-next .road-head').getAttribute('aria-expanded'), home: document.getElementById('screen-home').classList.contains('active'),
      lead: document.querySelector('.bt-next .road-lead') && document.querySelector('.bt-next .road-lead').textContent, vis: !!(document.querySelector('.bt-next .road-lead') && document.querySelector('.bt-next .road-lead').getClientRects().length), h: Math.round(document.querySelector('.bt-next .road-body').getBoundingClientRect().height) }));
    t.check('Home between cycles: the row folds open in place (the teaser shows) and Home stays Home', o.open && o.exp === 'true' && o.home && o.lead === 'Strength becomes court speed.' && o.vis && o.h > 60, JSON.stringify(o));
    await p.focus('.bt-next .road-head'); await p.keyboard.press('Enter'); await p.waitForTimeout(450);
    t.check('Home between cycles: Enter folds it again', await p.evaluate(() => !document.querySelector('.bt-next .road-row').classList.contains('is-open') && document.querySelector('.bt-next .road-head').getAttribute('aria-expanded') === 'false'));
    t.check('no page errors (Home between)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    const last = await H.openProgram(browser, { prog: prog({ endsIn: -4, idx: 4 }), w: 390, h: 844 });
    t.check('Home on the last cycle past its end: no Up next row (nothing is next)', await last.p.evaluate(() => !document.querySelector('.bt-next') && !document.querySelector('#screen-home .road-row')));
    await last.ctx.close();
  }

  // ── 10. layout: no sideways scroll, nothing clipped, one gutter, light and dark, at 320 / 375 / 390 ──
  for (const [w, h, dark] of [[320, 568, false], [375, 667, false], [390, 844, false], [320, 568, true], [375, 667, true], [390, 844, true]]) {
    const g = w < 360 ? 16 : 20, tag = `${w}${dark ? ' dark' : ''}`;
    const LONG = 'Change of Direction & Rotational Power';
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ endsIn: 9, name: LONG }), w, h, dark });
    await toPlan(p);
    // open every fold, so the longest page is the one measured
    await p.evaluate(() => document.querySelectorAll('#road-wrap .road-head[aria-expanded="false"]').forEach(b => b.click())); await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left * 10) / 10, r: Math.round(b.right * 10) / 10 }; };
      const card = document.querySelector('#cycle-card-wrap .cyc-card'), cr = card.getBoundingClientRect();
      const inside = ['.cyc-top', '.cyc-name', '.cyc-dates', '.cyc-k', '.cyc-bar'].map(s => { const e = card.querySelector(s), b = e.getBoundingClientRect(); return [s, b.left >= cr.left - 0.5 && b.right <= cr.right + 0.5]; });
      const name = card.querySelector('.cyc-name');   // clipped = wider than its box: the title's line-height is under 1, so its glyphs may pass a line box by a pixel or two (nothing clips them; the card has room)
      const heads = [...document.querySelectorAll('#road-wrap .road-head')].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.left * 10) / 10, Math.round(b.right * 10) / 10]; });
      const texts = [...document.querySelectorAll('#road-wrap .road-nm, #road-wrap .road-ln, #road-wrap .road-aim, #road-wrap .road-out, #road-wrap .road-why p, #road-wrap .road-lead, #road-wrap .road-paras p, #road-wrap .road-tagline')]
        .filter(e => e.getClientRects().length).map(e => { const b = e.getBoundingClientRect(); return b.right <= document.documentElement.clientWidth + 0.5 && e.scrollWidth <= e.clientWidth + 1; });
      return { side: document.documentElement.scrollWidth - window.innerWidth, card: r('.cyc-card'), road: r('.road'), rows: [...document.querySelectorAll('#road-wrap .road-row')].map(e => { const b = e.getBoundingClientRect(); return b.left; }), heads, door: r('.road-why-door'), inside,
        nameClipped: name.scrollWidth > name.clientWidth + 1, nameLines: Math.round(name.getBoundingClientRect().height / parseFloat(getComputedStyle(name).lineHeight)), nameSize: getComputedStyle(name).fontSize, title: r('.prog-title'), sec: r('#road-wrap .prog-sec'),
        texts: texts.length, textsOk: texts.every(Boolean), tag: r('.road-row.is-now .road-tag'), st: r('.road-row.is-now .road-st'), nm: r('.road-row.is-now .road-nm'), tab: document.getElementById('global-tabs').getBoundingClientRect().height };
    });
    const sideOk = a => Math.abs(a - w) <= 0.6;
    t.check(`${tag}: no sideways scroll on Progress, with every fold open`, m.side <= 0, m.side);
    t.check(`${tag}: the cover and the road are inside the ${g} px gutter, left and right`, m.card.l === g && sideOk(m.card.r + g) && m.road.l === g && sideOk(m.road.r + g) && m.rows.every(l => l === g) && m.heads.every(([l, r]) => l === g && sideOk(r + g)) && m.door.l === g && sideOk(m.door.r + g), JSON.stringify([m.card, m.road, m.rows, m.heads, m.door]));
    t.check(`${tag}: nothing in the cover is clipped, even a 38-letter cycle name (${m.nameLines} lines at ${m.nameSize})`, !m.nameClipped && m.inside.every(([, ok]) => ok) && m.nameLines >= 2, JSON.stringify([m.nameClipped, m.inside, m.nameLines]));
    t.check(`${tag}: every line of text in the road fits its row (${m.texts} measured)`, m.textsOk && m.texts >= 10 && m.tag.r <= m.st.r + 0.5 && m.nm.r <= m.st.l + 0.5, JSON.stringify([m.texts, m.textsOk, m.tag, m.st, m.nm]));
    t.check(`${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    if (dark) {
      const dk = await p.evaluate(() => { const num = document.querySelector('.road-row.is-done .road-num'), tg = document.querySelector('.road-tag'); return { numFill: getComputedStyle(num).color, tagBg: getComputedStyle(tg).backgroundColor, tagFg: getComputedStyle(tg).color, rowText: getComputedStyle(document.querySelector('.road-nm')).color,
        card: getComputedStyle(document.querySelector('.cyc-card')).backgroundImage.slice(0, 24), line: getComputedStyle(document.querySelector('.road-ln')).color, hair: getComputedStyle(document.querySelectorAll('.road-row')[1]).borderTopColor }; });
      t.check(`${tag}: the road reads in dark (mint numeral and tag, light name, grey line, a dark hairline), the cover keeps its green`, dk.numFill === 'rgb(109, 190, 149)' && dk.tagBg === 'rgb(109, 190, 149)' && dk.tagFg === 'rgb(14, 74, 54)' && dk.rowText === 'rgb(237, 237, 237)' && dk.line === 'rgb(154, 154, 154)' && dk.hair === 'rgb(44, 44, 44)' && /radial-gradient/.test(dk.card), JSON.stringify(dk));
    }
    if (w === 320 || w === 375) await shot(p, `progress-road-${w}${dark ? '-dark' : ''}`);
    // the archive and Home between cycles do not scroll sideways either
    await p.evaluate(() => goTo('archive', 'prog1')); await p.waitForTimeout(450);
    const arch = await sideways(p);
    t.check(`${tag}: no sideways scroll in the archive, and its cover and rows start on the gutter`, arch <= 0 && await p.evaluate(g => { const cap = document.querySelector('.arc-cap'); return Math.round(cap.getBoundingClientRect().left + parseFloat(getComputedStyle(cap).paddingLeft)) === g && Math.round(document.querySelector('.archive-ex').getBoundingClientRect().left) === g
      && document.getElementById('archive-title').scrollWidth <= document.getElementById('archive-title').clientWidth + 1; }, g), arch);
    await ctx.close();
    const bt = await H.openProgram(browser, { prog: prog({ endsIn: -4, name: LONG }), w, h, dark });
    await bt.p.evaluate(() => document.querySelector('.bt-next .road-head').click()); await bt.p.waitForTimeout(500);
    t.check(`${tag}: no sideways scroll on Home between cycles with Up next open, and its row is on the gutter`, (await sideways(bt.p)) <= 0 && await bt.p.evaluate(g => Math.round(document.querySelector('.bt-next .road').getBoundingClientRect().left) === g, g), await sideways(bt.p));
    if (w === 320 || (w === 390 && dark)) await shot(bt.p, `progress-road-home-between-${w}${dark ? '-dark' : ''}`);
    await bt.ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
