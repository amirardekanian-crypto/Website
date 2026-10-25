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
const short = iso => { const [, m, d] = iso.split('-').map(Number); return d + ' ' + MON[m - 1]; };
const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const active = p => p.evaluate(() => document.querySelector('.screen.active').id);
const norm = s => String(s || '').replace(/\s+/g, ' ').trim();

// Five cycles, the current one at idx, ending `endsIn` days from today (negative: ended that many days ago), five weeks each. Cycle 2 has its tagline, two aims, two paragraphs
// and two outcomes; cycle 3 its tagline, an aim and a teaser (subtitle and two paragraphs); cycle 4 the same; cycle 5 whatever `c5` says. Three exercises carry a reason (so Why your plan has its door row),
// and the archive has two days.
function prog({ endsIn = 20, idx = 1, whys = 3, name, c5 = 'tagline', msg } = {}) {
  const P = H.fixture();
  P.currentCycleIndex = idx;
  P.cycles.push(
    { art: 'brakes', num: 4, name: 'Brake Check', weeks: 'Weeks 16–20', focuses: ['Land softly.'], tagline: 'Stop well', teaser: { subtitle: 'Control the stop.', paragraphs: ['Cycle 4 teaches you to stop.', 'Then you go again.'] } },
    // cycle 5 (Locked) carries only what c5 names: a tagline, aims, a teaser, or nothing at all (then it is a plain row)
    Object.assign({ art: 'peak', num: 5, name: 'Peak Season', weeks: 'Weeks 21–25' }, { tagline: { tagline: 'Peak' }, aims: { focuses: ['Peak.'] }, teaser: { teaser: { paragraphs: ['Peak.'] } }, none: {} }[c5]));
  const c2 = P.cycles[1];
  c2.tagline = 'Earn the adaptation';
  c2.focuses = ['Progress the squat and hinge with real, trackable load.', 'Keep the knee quiet.'];
  c2.message = msg || { paragraphs: ['This is where the body starts genuinely changing.', 'Load goes up, the reps stay honest.'], outcomes: ['Measurable strength gains in the back squat', 'A hinge you trust'] };
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
    t.check('the cover: the eyebrow reads CYCLE 2 OF 5, with a mint dot', !!c && c.eyebrow === 'CYCLE 2 OF 5' && c.dot === 'rgb(109, 190, 149)' && c.dotContent === '""', JSON.stringify(c && [c.eyebrow, c.dot]));
    t.check('the cover: the cycle\'s name is the title, in capitals, 28 to 36 px, 900', !!c && c.title === 'LOAD & BUILD' && c.titleTag === 'H2' && c.titleSize >= 28 && c.titleSize <= 36 && c.titleWeight === '900', JSON.stringify(c && [c.title, c.titleTag, c.titleSize, c.titleWeight]));
    t.check('the cover: one mono line of the cycle\'s dates (the fixture\'s own days), no days left with 20 to go',
      !!c && c.dates === short(P.cycles[1].startDate) + ' – ' + short(P.cycles[1].endDate) && !/left/i.test(c.dates), JSON.stringify(c && c.dates) + ' want ' + short(P.cycles[1].startDate) + ' – ' + short(P.cycles[1].endDate));
    t.check('the cover: the cycle\'s own picture (iron), loaded, in luminosity at about .66, masked from the left, with a scrim', !!c && c.img && /assets\/art\/cycles\/iron-v1\.webp$/.test(c.src) && c.loaded && c.blend === 'luminosity' && Math.abs(parseFloat(c.opacity) - 0.66) < 0.05 && /gradient/.test(c.mask) && c.scrim, JSON.stringify(c && [c.src, c.loaded, c.blend, c.opacity, c.mask, c.scrim]));
    t.check('the cover: its text is white (title, eyebrow, dates, small lines), the week number is the clay on green', !!c && c.white.every(([s, v]) => v.rgb === '255,255,255' && v.a >= 0.7) && c.week === 'rgb(247, 161, 131)', JSON.stringify(c && [c.white, c.week]));
    t.check('the cover: the bars stay (week and sessions), and the days-left banner and the header\'s dates line are gone', !!c && c.bars === 2 && !c.hasBanner, JSON.stringify(c && [c.bars, c.hasBanner]));
    // THE SCOREBOARD (2026-10-19, Amir's pick B for this card): the cover carries Amir's first sentence and Read it, which opens
    // the road's Now row and scrolls to it. The cycle's meaning was 2,600 px below the cover until then.
    const n = await p.evaluate(() => {
      const b = document.querySelector('#cycle-card-wrap .cyc-note');
      return b ? { q: b.querySelector('.cyc-note-q').textContent.trim(), go: b.querySelector('.cyc-note-go').textContent.replace(/\s+/g, ' ').trim(), label: b.getAttribute('aria-label') } : null;
    });
    const first = (H.fixture().cycles[1].message.paragraphs[0] || '').split(/(?<=[.!?])\s+/)[0];
    t.check('the cover: Amir\'s first sentence and Read it, and nothing of the rest of his note', !!n && n.q === first && /^Read it/.test(n.go) && /From Amir/.test(n.label || ''), JSON.stringify(n));
    const jump = await p.evaluate(async () => {
      const row = document.querySelector('#road-wrap .road-row.is-now');
      row.querySelector('.road-head').click();                       // fold it first, so Read it has to open it
      const folded = !row.classList.contains('is-open');
      document.querySelector('.cyc-note').click();
      await new Promise(r => setTimeout(r, 400));
      const b = row.getBoundingClientRect();
      return { folded, open: row.classList.contains('is-open'), top: Math.round(b.top), vh: window.innerHeight };
    });
    t.check('Read it opens the Now row if it was folded and brings it onto the screen', jump.folded && jump.open && jump.top < jump.vh, JSON.stringify(jump));
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
    t.check('past its end: the eyebrow reads CYCLE COMPLETE · 2 OF 5 (a tick for the dot), the title is still the name, and the line says Finished', c.top === 'CYCLE COMPLETE · 2 OF 5' && c.fin === 'Cycle complete' && c.tick && c.dot === 'none' && !c.dates && c.title === 'LOAD & BUILD' && /^FINISHED \d{1,2} [A-Z]{3}$/.test(c.sub), JSON.stringify(c));
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
    // The Now row's mono line is the weeks ALONE since 2026-10-19 (The Long Rally audit): the green Now pill is the state, and the row said it twice.
    ['during (ends in 20 days)', 20, 'done now next locked locked', ['5 WEEKS · DONE', '5 WEEKS', '5 WEEKS · UP NEXT', '5 WEEKS · LOCKED', '5 WEEKS · LOCKED']],
    ['before (starts tomorrow)', 34 + 1, 'done now next locked locked', null],
    ['on its last day', 0, 'done now next locked locked', null],
    ['after (ended yesterday)', -1, 'done done next locked locked', ['5 WEEKS · DONE', '5 WEEKS · DONE', '5 WEEKS · UP NEXT', '5 WEEKS · LOCKED', '5 WEEKS · LOCKED']],
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
    t.check('folds: Now is open by default (aria-expanded true), Up next and both Locked rows (a tagline, aims and a teaser; a tagline alone) are closed folds, a Done row is not a fold',
      rows[1].open && rows[1].exp === 'true' && !rows[2].open && rows[2].exp === 'false' && !rows[3].open && rows[3].exp === 'false' && rows[3].button && !rows[4].open && rows[4].exp === 'false' && rows[4].button && !rows[0].exp, JSON.stringify(rows.map(r => [r.n, r.state, r.exp, r.button])));
    t.check('folds: every fold\'s aria-controls names its body (road-body-N), which exists', await p.evaluate(() => [...document.querySelectorAll('#road-wrap .road-head[aria-controls]')].every(h => { const b = document.getElementById(h.getAttribute('aria-controls')); return b && /^road-body-\d$/.test(b.id) && b.classList.contains('road-body'); })));
    const vis = sel => p.isVisible(sel);
    t.check('folds: Now shows its body, Up next shows none of it', await vis('#road-body-2 .road-aims') && await vis('#road-body-2 .road-from') && !(await vis('#road-body-3 .road-lead')) && !(await vis('#road-body-3 .road-paras')), 'now ' + await vis('#road-body-2 .road-aims') + ' next ' + await vis('#road-body-3 .road-lead'));
    const state = n => p.evaluate(n => { const r = document.querySelector(`#road-wrap .road-row[data-cycle="${n}"]`), h = r.querySelector('.road-head'), b = r.querySelector('.road-body'), ch = r.querySelector('.road-chev');
      return { open: r.classList.contains('is-open'), exp: h.getAttribute('aria-expanded'), height: b ? Math.round(b.getBoundingClientRect().height) : null, turn: ch ? getComputedStyle(ch).transform : null, on: document.querySelector('.screen.active').id }; }, n);
    await p.click('#road-wrap .road-row[data-cycle="3"] .road-head'); await p.waitForTimeout(450);
    let s = await state(3);
    t.check('folds: a tap on Up next opens it (aria-expanded true, the body grows, the chevron turns), and stays on Progress', s.open && s.exp === 'true' && s.height > 60 && s.turn !== 'none' && s.on === 'screen-plan' && await vis('#road-body-3 .road-lead') && await vis('#road-body-3 .road-paras'), JSON.stringify(s));
    const teaser = await p.evaluate(() => ({ lead: document.querySelector('#road-body-3 .road-lead').textContent, paras: [...document.querySelectorAll('#road-body-3 .road-paras p')].map(x => x.textContent), em: [...document.querySelectorAll('#road-body-3 .road-paras p')].map(x => !!x.querySelector('em')).join() }));
    t.check('folds: Up next\'s teaser is the subtitle as the lead line, then the paragraphs, the last one in italics', teaser.lead === 'Strength becomes court speed.' && teaser.paras.length === 2 && teaser.em === 'false,true', JSON.stringify(teaser));
    // nothing the old folded cards showed is lost: the tagline (one italic line), then The aims (1, 2 as in Now), then the teaser
    const fb = n => p.evaluate(n => { const body = document.querySelector('#road-body-' + n), kids = [...body.querySelector('.road-in').children];
      return { order: kids.map(e => e.className.split(' ')[0] + (e.tagName === 'H3' ? ':' + e.textContent : '')).join(' | '), tagline: (body.querySelector('.road-tagline') || {}).textContent || null, taglineStyle: body.querySelector('.road-tagline') && getComputedStyle(body.querySelector('.road-tagline')).fontStyle,
        aims: [...body.querySelectorAll('.road-aims li')].map(li => li.querySelector('.road-n').textContent + ' ' + li.querySelector('.road-aim').textContent), nFont: body.querySelector('.road-n') && getComputedStyle(body.querySelector('.road-n')).fontFamily.split(',')[0],
        nColor: body.querySelector('.road-n') && getComputedStyle(body.querySelector('.road-n')).color, why: !!body.querySelector('.road-from, .road-units, .road-outs, .road-why-door, .wn-sign') }; }, n);
    const u = await fb(3);
    t.check('folds: Up next opens on the tagline (italic), then The aims as numbered rows (a green Barlow Condensed numeral), then the teaser, and has no Now-only parts (his line, folds, door, signature)',
      u.order === 'road-tagline | road-sec:The aims | road-aims | road-lead | road-paras' && u.tagline === 'Turn strength into speed' && u.taglineStyle === 'italic' && u.aims.join() === '1 Convert strength into usable court speed.' && /Barlow Condensed/.test(u.nFont) && u.nColor === 'rgb(14, 74, 54)' && !u.why, JSON.stringify(u));
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
    // a Locked cycle is a fold: its tagline, its aims, then its teaser
    await p.click('#road-wrap .road-row[data-cycle="4"] .road-head'); await p.waitForTimeout(450);
    const lk = await fb(4);
    t.check('folds: a Locked cycle opens to its tagline, its aims and its teaser', (await state(4)).open && await vis('#road-body-4 .road-lead') && (await p.textContent('#road-body-4 .road-lead')) === 'Control the stop.'
      && lk.order === 'road-tagline | road-sec:The aims | road-aims | road-lead | road-paras' && lk.tagline === 'Stop well' && lk.aims.join() === '1 Land softly.' && !lk.why, JSON.stringify(lk));
    await p.click('#road-wrap .road-row[data-cycle="5"] .road-head'); await p.waitForTimeout(450);
    const t5 = await fb(5);
    t.check('folds: a Locked cycle with only a tagline is a fold too, and opens to that line', (await state(5)).open && t5.order === 'road-tagline' && t5.tagline === 'Peak', JSON.stringify(t5));
    // the folds are kept across a tab change
    await p.evaluate(() => { document.getElementById('road-wrap')._painted = null; goTo('home'); goTo('plan'); }); await p.waitForTimeout(450);   // _painted = null: paintInto() skips an identical string, so force a real rewrite
    const kept = await roadOf(p);
    t.check('folds: they stay as the athlete left them after leaving Progress and coming back', kept.map(r => r.open ? 1 : 0).join('') === '01111', kept.map(r => r.open ? 1 : 0).join(''));
    t.check('no page errors (folds)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. the Now row's body, Doors (Amir, 2026-10-19): the tagline, The aims, his first sentence signed, two folds (the rest of his note, the outcomes), then Why your plan looks like this ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ whys: 3 }), w: 390, h: 844 });
    await toPlan(p);
    const b = await p.evaluate(() => {
      const body = document.querySelector('#road-body-2'), q = s => body.querySelector(s), qa = s => [...body.querySelectorAll(s)], cs = (el, pse) => getComputedStyle(el, pse);
      const order = [...body.querySelector('.road-in').children].map(e => e.className.split(' ')[0] + (e.tagName === 'H3' ? ':' + e.textContent : '')).join(' | ');
      const from = q('.road-from');
      return { order, tagline: q('.road-tagline').textContent, taglineStyle: cs(q('.road-tagline')).fontStyle, secs: qa('.road-sec').map(e => e.innerText.trim()), secColor: cs(q('.road-sec')).color, secFont: cs(q('.road-sec')).fontFamily.split(',')[0],
        aims: qa('.road-aims li').map(li => [li.querySelector('.road-n').textContent, li.querySelector('.road-aim').textContent]), nFont: cs(q('.road-n')).fontFamily.split(',')[0], nSize: cs(q('.road-n')).fontSize, nColor: cs(q('.road-n')).color,
        aimSize: cs(q('.road-aim')).fontSize, aimWeight: cs(q('.road-aim')).fontWeight, first: q('.road-first').textContent, firstSize: cs(q('.road-first')).fontSize, firstLong: q('.road-first').classList.contains('is-long'),
        stripe: cs(from, '::before').backgroundColor, stripeW: cs(from, '::before').width, stripeContent: cs(from, '::before').content, firstBefore: cs(q('.road-first'), '::before').content, secCase: cs(q('.road-sec')).textTransform, doorsOrder: [...q('.road-doors').children].map(e => e.className.split(' ')[0]).join(' | '), label: from.getAttribute('aria-label'),
        units: qa('.road-unit').map(x => [x.dataset.k, x.querySelector('.road-ul').textContent, x.querySelector('.road-uq').textContent, x.querySelector('.road-ubtn').getAttribute('aria-expanded'), Math.round(x.querySelector('.road-ufold').getBoundingClientRect().height),
          x.querySelector('.road-ubtn').getAttribute('aria-controls'), !!document.getElementById(x.querySelector('.road-ubtn').getAttribute('aria-controls'))]),
        outs: qa('.road-outs li').map(li => [li.querySelector('.road-out').textContent, !!li.querySelector('svg, .road-ck'), li.querySelector('.road-dot') ? getComputedStyle(li.querySelector('.road-dot')).width : null]),
        door: q('.road-why-door') && { tag: q('.road-why-door').tagName, text: q('.road-why-door').innerText.replace(/\s+/g, ' ').trim(), cls: q('.road-why-door').className },
        doorFont: q('.road-why-door .hrow-l') && cs(q('.road-why-door .hrow-l')).fontFamily.split(',')[0], doorLeft: Math.round(q('.road-why-door').getBoundingClientRect().left), doorW: Math.round(q('.road-why-door').getBoundingClientRect().width),
        // the door's name and the fold row's title directly above it: one voice (Number First, 2026-10-19), and the door's second line matches the folds' 13 px
        doorName: ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color'].map(k => k === 'fontFamily' ? cs(q('.road-why-door .hrow-l')).fontFamily.split(',')[0].replace(/["']/g, '') : cs(q('.road-why-door .hrow-l'))[k]).join('|'),
        foldTitle: ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color'].map(k => k === 'fontFamily' ? cs(q('.road-ul')).fontFamily.split(',')[0].replace(/["']/g, '') : cs(q('.road-ul'))[k]).join('|'),
        doorQ: cs(q('.road-why-door .hrow-q')).fontSize, foldQ: cs(q('.road-uq')).fontSize };
    });
    t.check('Now body: the tagline, The aims, his line, the two folds, then the door row (a short card)', b.order === 'road-tagline | road-sec:The aims | road-aims | road-from | road-doors' && b.doorsOrder === 'road-units | hrow', b.order + ' / ' + b.doorsOrder);
    t.check('Now body: the tagline is italic, and the one section title is The aims, in condensed green capitals', b.tagline === 'Earn the adaptation' && b.taglineStyle === 'italic' && b.secs.map(s => s.toLowerCase()).join('|') === 'the aims' && b.secColor === 'rgb(14, 74, 54)' && /Barlow Condensed/.test(b.secFont) && b.secCase === 'uppercase', JSON.stringify([b.tagline, b.taglineStyle, b.secs, b.secColor, b.secFont, b.secCase]));
    t.check('Now body: the aims are the loudest text: a 22 px green condensed numeral (1, 2) and the aim at 18 px, 600', b.aims.map(a => a[0]).join() === '1,2' && b.aims[0][1] === 'Progress the squat and hinge with real, trackable load.' && /Barlow Condensed/.test(b.nFont) && b.nSize === '22px' && b.nColor === 'rgb(14, 74, 54)' && b.aimSize === '18px' && b.aimWeight === '600', JSON.stringify([b.aims, b.nFont, b.nSize, b.aimSize, b.aimWeight]));
    t.check('Now body: his first sentence is the headline (18 px), under a 3 px clay stripe, and there is no quote glyph', b.first === 'This is where the body starts genuinely changing.' && b.firstSize === '18px' && !b.firstLong && b.stripe === 'rgb(199, 85, 47)' && b.stripeW === '3px' && b.stripeContent === '""' && b.firstBefore === 'none' && b.label === 'From Amir', JSON.stringify([b.first, b.firstSize, b.stripe, b.stripeW, b.stripeContent, b.firstBefore, b.label]));
    t.check('Now body: two folds, both closed: Why this cycle matters (The rest of my note) and Expected outcomes (2 things to hit), each with an id its button controls',
      b.units.length === 2 && b.units[0].join('|') === 'note|Why this cycle matters|The rest of my note|false|0|road-body-2-note|true' && b.units[1].join('|') === 'fin|Expected outcomes|2 things to hit|false|0|road-body-2-fin|true', JSON.stringify(b.units));
    t.check('Now body: the outcomes are rows with a 6 px dot, never a tick (a tick is Done)', b.outs.length === 2 && b.outs.every(o => !o[1] && o[2] === '6px') && b.outs[0][0] === 'Measurable strength gains in the back squat', JSON.stringify(b.outs));
    t.check('Now body: Why your plan looks like this is a door row (.hrow) with its 3 reasons, the full width of the road', !!b.door && b.door.tag === 'BUTTON' && /\bhrow\b/.test(b.door.cls) && /^Why your plan looks like this 3 reasons$/i.test(b.door.text.replace(/\s*›$/, '')) && b.doorLeft === 20 && b.doorW === 350 && /Barlow/.test(b.doorFont), JSON.stringify(b.door) + ' ' + b.doorLeft + ' ' + b.doorW);
    // Number First (2026-10-19): the door carries no figure, so its NAME is the headline, in the fold rows' own recipe. The two sit
    // four rows apart inside one card, and the whole point of the change is that they now read as one screen, so they are held equal.
    t.check('Now body: the door\'s name is set exactly as the fold row above it (Barlow 600, 16 px, sentence case, ink), and its second line matches theirs',
      b.doorName === b.foldTitle && /^Barlow\|16px\|600\|normal\|none\|/.test(b.doorName) && b.doorQ === b.foldQ && b.doorQ === '13px', b.doorName + ' vs ' + b.foldTitle + ' / q ' + b.doorQ + ' vs ' + b.foldQ);
    // His line is signed as the week note and the finished band sign it: his photo, then his signature (WN_SIG, green ink), left under his words, the week note's size, no hairline
    const sg = await p.evaluate(() => {
      const from = document.querySelector('#road-body-2 .road-from'), sign = from.querySelector('.wn-sign'), sig = sign && sign.querySelector('svg.wn-sig'), av = sign && sign.querySelector('.wn-av'), img = av && av.querySelector('img');
      const line = from.querySelector('.road-first'), r = e => e.getBoundingClientRect();
      return { last: from.lastElementChild === sign, below: !!sign && r(sign).top >= r(line).bottom - 0.5, aria: sig && sig.getAttribute('aria-label'), role: sig && sig.getAttribute('role'), color: sig && getComputedStyle(sig).color,
        sig: sig && [Math.round(r(sig).width), Math.round(r(sig).height)], av: av && [Math.round(r(av).width), Math.round(r(av).height)], src: img && img.getAttribute('src'),
        photoFirst: !!sig && !!av && r(av).right <= r(sig).left + 0.5, photoLeft: !!av && Math.abs(r(av).left - r(line).left) <= 1, hairline: sign && getComputedStyle(sign).borderTopWidth };
    });
    t.check('Now body: his line is signed: his photo (44 × 44, assets/img/coach.jpg), then his signature (green ink, 124 × 44), left under his words on the same edge, no hairline',
      sg.last && sg.below && sg.aria === 'Amir' && sg.role === 'img' && sg.color === 'rgb(14, 74, 54)' && sg.sig.join('x') === '124x44' && sg.av.join('x') === '44x44' && sg.src === 'assets/img/coach.jpg' && sg.photoFirst && sg.photoLeft && sg.hairline === '0px', JSON.stringify(sg));
    // the folds: each opens on its own, by tap and by keyboard, and what is inside is Amir's own words
    const unit = k => p.evaluate(k => { const x = document.querySelector(`#road-body-2 .road-unit[data-k="${k}"]`), f = x.querySelector('.road-ufold'); return { open: x.classList.contains('is-open'), exp: x.querySelector('.road-ubtn').getAttribute('aria-expanded'), h: Math.round(f.getBoundingClientRect().height),
      vis: getComputedStyle(x.querySelector('.road-uin')).visibility, turn: getComputedStyle(x.querySelector('.road-chev')).transform, texts: [...x.querySelectorAll('.road-note p, .road-out')].map(e => e.textContent) }; }, k);
    await p.click('#road-body-2 .road-unit[data-k="note"] .road-ubtn'); await p.waitForTimeout(450);
    let n1 = await unit('note'), f1 = await unit('fin');
    t.check('folds in Now: a tap on the note row opens it alone (aria-expanded true, the body grows, the chevron turns) and shows the rest of his note, verbatim; the outcomes stay shut',
      n1.open && n1.exp === 'true' && n1.h > 30 && n1.vis === 'visible' && n1.turn !== 'none' && n1.texts.join('|') === 'Load goes up, the reps stay honest.' && !f1.open && f1.exp === 'false' && f1.h === 0, JSON.stringify([n1, f1]));
    await p.click('#road-body-2 .road-unit[data-k="fin"] .road-ubtn'); await p.waitForTimeout(450);
    f1 = await unit('fin');
    t.check('folds in Now: the outcomes row opens on its own and lists the two outcomes, verbatim', f1.open && f1.exp === 'true' && f1.h > 30 && f1.texts.join('|') === 'Measurable strength gains in the back squat|A hinge you trust', JSON.stringify(f1));
    await p.focus('#road-body-2 .road-unit[data-k="note"] .road-ubtn');
    await p.keyboard.press('Enter'); await p.waitForTimeout(450);
    n1 = await unit('note');
    t.check('folds in Now: Enter on the focused note row folds it (aria-expanded false, no height, hidden)', !n1.open && n1.exp === 'false' && n1.h === 0 && n1.vis === 'hidden', JSON.stringify(n1));
    await p.keyboard.press('Space'); await p.waitForTimeout(450);
    n1 = await unit('note');
    t.check('folds in Now: Space opens it again', n1.open && n1.exp === 'true' && n1.h > 30, JSON.stringify(n1));
    // a repaint of the road (leaving Progress and coming back) keeps both folds as the athlete left them
    await p.evaluate(() => { document.getElementById('road-wrap')._painted = null; goTo('home'); goTo('plan'); }); await p.waitForTimeout(450);   // a real rewrite of the road, so o.units is what keeps the folds
    n1 = await unit('note'); f1 = await unit('fin');
    t.check('folds in Now: both stay open after leaving Progress and coming back', n1.open && n1.exp === 'true' && n1.h > 30 && f1.open && f1.exp === 'true' && f1.h > 30, JSON.stringify([n1, f1]));
    // the Now row folds: what is inside an open fold is hidden to the eye and the keyboard too, and comes back when the row opens
    await p.click('#road-wrap .road-row[data-cycle="2"] .road-head'); await p.waitForTimeout(450);
    const shut = await p.evaluate(() => { const bt = document.querySelector('#road-body-2 .road-unit[data-k="note"] .road-ubtn'), p1 = document.querySelector('#road-body-2 .road-note p');
      return { btn: getComputedStyle(bt).visibility, note: getComputedStyle(p1).visibility, size: Math.round(document.querySelector('#road-body-2').getBoundingClientRect().height) }; });
    t.check('folds in Now: with the Now row folded, an open note is hidden (visibility hidden, so no focus and no screen reader), and the row has no height', shut.btn === 'hidden' && shut.note === 'hidden' && shut.size === 0, JSON.stringify(shut));
    await p.click('#road-wrap .road-row[data-cycle="2"] .road-head'); await p.waitForTimeout(450);
    n1 = await unit('note');
    t.check('folds in Now: and opening the row brings the open note back', n1.open && n1.vis === 'visible' && n1.h > 30, JSON.stringify(n1));
    await p.click('#road-body-2 .road-why-door'); await p.waitForTimeout(400);
    t.check('Now body: the door opens the Why page', await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && /Why Cycle 2 looks like this|looks like this/.test(document.querySelector('#hist-overlay .readiness-title').textContent)));
    t.check('no page errors (Now body)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
    // fewer than three reasons: the door row is there too since 2026-10-13 (Line Call: the guide sends athletes to it from one Because)
    const few = await H.openProgram(browser, { prog: prog({ whys: 2 }), w: 390, h: 844 });
    await toPlan(few.p);
    t.check('Why your plan: with 2 reasons the door row is there (from one, since 2026-10-13)', await few.p.evaluate(() => !!document.querySelector('.road-why-door')));
    await few.ctx.close();
  }

  // ── 6d. Doors: where his note is cut. Every word is shown once, verbatim (his first sentence on the card, the rest behind the door) ──
  {
    const LONGFIRST = 'This cycle is the one where everything you built over the last two months finally has to show up in the gym, week after week.';
    for (const [tag, paras, want] of [
      ['three sentences in paragraph one, and a second paragraph', ['Last month went well. Most sessions landed at an 8. Your legs went up.', 'Week 1 starts easier.'], { first: 'Last month went well.', note: ['Most sessions landed at an 8. Your legs went up.', 'Week 1 starts easier.'], long: false, units: 'note,fin' }],
      ['a first sentence over 100 characters (set quieter, not a headline)', [LONGFIRST + ' Then the rest.'], { first: LONGFIRST, note: ['Then the rest.'], long: true, units: 'note,fin' }],
      ['an abbreviation inside the first sentence (e.g. does not end it)', ['Train hard, e.g. Heavy singles. Then rest well.'], { first: 'Train hard, e.g. Heavy singles.', note: ['Then rest well.'], long: false, units: 'note,fin' }],
      ['a one-word lead is no sentence (Yes. does not end it)', ['Yes. Do it. Then rest.'], { first: 'Yes. Do it.', note: ['Then rest.'], long: false, units: 'note,fin' }],
      ['one sentence only: no note fold', ['Just the one sentence.'], { first: 'Just the one sentence.', note: [], long: false, units: 'fin' }],
      ['no paragraphs at all: no line, no note fold', [], { first: '', note: [], long: false, units: 'fin' }],
      ['a two-word lead is no sentence either (Go light. does not end it)', ['Go light. Then rest well.'], { first: 'Go light. Then rest well.', note: [], long: false, units: 'fin' }],
      ['a three-word lead is a sentence (Go light today. ends it)', ['Go light today. Then rest well.'], { first: 'Go light today.', note: ['Then rest well.'], long: false, units: 'note,fin' }],
      ['vs. does not end the first sentence', ['Squat vs. Deadlift is the question. Then rest.'], { first: 'Squat vs. Deadlift is the question.', note: ['Then rest.'], long: false, units: 'note,fin' }],
      ['Dr. does not end the first sentence', ['Ask Dr. Smith about it. Then rest.'], { first: 'Ask Dr. Smith about it.', note: ['Then rest.'], long: false, units: 'note,fin' }],
      ['No. does not end the first sentence', ['This is No. 1 on the list. Then rest.'], { first: 'This is No. 1 on the list.', note: ['Then rest.'], long: false, units: 'note,fin' }],
      ['i.e. and approx. do not end the first sentence', ['Rest i.e. Sleep, approx. Eight hours is the plan. Then train.'], { first: 'Rest i.e. Sleep, approx. Eight hours is the plan.', note: ['Then train.'], long: false, units: 'note,fin' }],
      ['no outcomes: no outcomes fold, the note fold stays', ['A line to start. And the rest.'], { first: 'A line to start.', note: ['And the rest.'], long: false, units: 'note', outs: [] }],
      ['neither a note nor outcomes: no folds at all, only the aims and the Because door', [], { first: '', note: [], long: false, units: '', outs: [] }],
    ]) {
      const outs = want.outs || ['One thing to do.'];
      const { ctx, p } = await H.openProgram(browser, { prog: prog({ msg: { paragraphs: paras, outcomes: outs } }), w: 390, h: 844 });
      await toPlan(p);
      const r = await p.evaluate(() => { const body = document.querySelector('#road-body-2'), f = body.querySelector('.road-first');
        return { first: f ? f.textContent : '', long: !!f && f.classList.contains('is-long'), note: [...body.querySelectorAll('.road-note p')].map(e => e.textContent), units: [...body.querySelectorAll('.road-unit')].map(u => u.dataset.k).join(','),
          sub: (body.querySelector('.road-unit[data-k="fin"] .road-uq') || {}).textContent, sign: !!body.querySelector('.road-from .wn-sign') }; });
      const joined = [r.first].concat(r.note).filter(Boolean).join(' ');
      t.check(`Doors, ${tag}: his first sentence on the card, the rest behind the door`, r.first === want.first && r.note.join('|') === want.note.join('|') && r.long === want.long && r.units === want.units && r.sign === !!want.first, JSON.stringify(r));
      t.check(`Doors, ${tag}: every word once, verbatim (the card and the fold together read his paragraphs)${outs.length === 1 ? '; one outcome says "1 thing to hit"' : ''}`, joined === paras.join(' ') && (outs.length === 1 ? r.sub === '1 thing to hit' : !r.sub), JSON.stringify([joined, r.sub]));
      t.check(`Doors, ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
      await ctx.close();
    }
  }

  // ── 6b. Why your plan looks like this keeps showing between cycles: inside Now's body while running, directly under the current cycle's Done row past its end ──
  {
    const door = p => p.evaluate(() => {
      const road = document.querySelector('#road-wrap .road'), d = road.querySelector('.road-why-door'), wrap = d && d.closest('.road-door'), kids = [...road.children];
      const cur = [...road.querySelectorAll('.road-row')].find(r => r.classList.contains('is-now')) || [...road.querySelectorAll('.road-row')].filter(r => r.classList.contains('is-done')).pop();
      const after = wrap && wrap.nextElementSibling, b = d && d.getBoundingClientRect();
      return { n: road.querySelectorAll('.road-why-door').length, inBody: !!(d && d.closest('.road-body')), wrapped: !!wrap, afterCur: !!wrap && wrap.previousElementSibling === cur, curState: cur && cur.className.replace(/\s+/g, ' '), curN: cur && cur.dataset.cycle,
        nextRow: after ? after.className.split(' ')[0] + ':' + after.dataset.cycle + ':' + getComputedStyle(after).borderTopWidth : null, last: kids[kids.length - 1] === wrap, left: b && Math.round(b.left), width: b && Math.round(b.width),
        text: d && d.innerText.replace(/\s+/g, ' ').trim(), tall: b && Math.round(b.height) };
    });
    const running = await H.openProgram(browser, { prog: prog({ endsIn: 20 }), w: 390, h: 844 });
    await toPlan(running.p);
    const dr = await door(running.p);
    t.check('the Why door while the cycle runs: one door, inside the Now row\'s body, no separate door wrapper', dr.n === 1 && dr.inBody && !dr.wrapped, JSON.stringify(dr));
    await running.ctx.close();
    for (const [tag, o, lastRow] of [['4 days past the end', { endsIn: -4 }, false], ['40 days past the end', { endsIn: -40 }, false], ['the last cycle past its end', { endsIn: -4, idx: 4 }, true]]) {
      const x = await H.openProgram(browser, { prog: prog(o), w: 390, h: 844 });
      await toPlan(x.p);
      const d2 = await door(x.p);
      t.check(`the Why door ${tag}: under the current cycle's Done row (cycle ${o.idx ? o.idx + 1 : 2}), outside any fold, on the gutter, with its 3 reasons`,
        d2.n === 1 && !d2.inBody && d2.wrapped && d2.afterCur && /is-done/.test(d2.curState) && d2.curN === String((o.idx || 1) + 1) && d2.left === 20 && d2.width === 350 && /^Why your plan looks like this 3 reasons ›?$/i.test(d2.text), JSON.stringify(d2));
      t.check(`the Why door ${tag}: ${lastRow ? 'it ends the road' : 'the next row (cycle ' + ((o.idx || 1) + 2) + ') still has its hairline under it'}`, lastRow ? d2.last : /^road-row:\d:1px$/.test(d2.nextRow || ''), JSON.stringify([d2.last, d2.nextRow]));
      await x.p.click('.road-door .road-why-door'); await x.p.waitForTimeout(400);
      t.check(`the Why door ${tag}: it opens the Why page`, await x.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && /looks like this/.test(document.querySelector('#hist-overlay .readiness-title').textContent)));
      t.check(`the Why door ${tag}: no page errors`, x.p.errs.length === 0, x.p.errs.join(' | '));
      await x.ctx.close();
    }
    const two = await H.openProgram(browser, { prog: prog({ endsIn: -4, whys: 2 }), w: 390, h: 844 });
    await toPlan(two.p);
    t.check('the Why door past the end with 2 reasons: there (from one, since 2026-10-13)', await two.p.evaluate(() => !!document.querySelector('.road-why-door, .road-door')));
    await two.ctx.close();
  }

  // ── 6c. a Locked cycle is a fold whenever it has a tagline, aims or a teaser; a plain row only when it has none of them ──
  for (const [c5, fold] of [['tagline', true], ['aims', true], ['teaser', true], ['none', false]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: prog({ c5 }), w: 390, h: 844 });
    await toPlan(p);
    const r = await p.evaluate(() => { const row = document.querySelector('#road-wrap .road-row[data-cycle="5"]'), h = row.querySelector('.road-head');
      return { tag: h.tagName, exp: h.getAttribute('aria-expanded'), body: !!row.querySelector('.road-body'), chev: !!row.querySelector('.road-chev'), lock: !!row.querySelector('.road-lock'), pointer: getComputedStyle(h).cursor === 'pointer',
        order: row.querySelector('.road-in') ? [...row.querySelector('.road-in').children].map(e => e.className.split(' ')[0] + (e.tagName === 'H3' ? ':' + e.textContent : '')).join(' | ') : null }; });
    t.check(`a Locked cycle with ${c5 === 'none' ? 'no tagline, aims or teaser' : 'only ' + (c5 === 'aims' ? 'aims' : 'a ' + c5)}: ${fold ? 'a closed fold (a chevron and its lock)' : 'a plain row (no fold, no chevron, not a tap target), still with its lock'}`,
      fold ? r.tag === 'BUTTON' && r.exp === 'false' && r.body && r.chev && r.lock && r.pointer : r.tag === 'DIV' && r.exp === null && !r.body && !r.chev && r.lock && !r.pointer, JSON.stringify(r));
    if (fold) {
      await p.click('#road-wrap .road-row[data-cycle="5"] .road-head'); await p.waitForTimeout(450);
      const want = { tagline: 'road-tagline', aims: 'road-sec:The aims | road-aims', teaser: 'road-paras' }[c5];
      const o = await p.evaluate(() => { const row = document.querySelector('#road-wrap .road-row[data-cycle="5"]'); return { open: row.classList.contains('is-open'), h: Math.round(row.querySelector('.road-body').getBoundingClientRect().height),
        order: [...row.querySelector('.road-in').children].map(e => e.className.split(' ')[0] + (e.tagName === 'H3' ? ':' + e.textContent : '')).join(' | ') }; });
      t.check(`a Locked cycle with ${c5 === 'aims' ? 'only aims' : 'only a ' + c5}: it opens to just that`, o.open && o.h > 40 && o.order === want, JSON.stringify(o));
    }
    t.check(`a Locked cycle (${c5}): no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
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
    t.check('Home between cycles: Up next is the road\'s row for cycle 3 (numeral, name, 5 WEEKS · UP NEXT), closed', h.row && h.n === '3' && h.num === '3' && h.name === 'Power Translation' && h.line === '5 WEEKS · UP NEXT' && h.exp === 'false' && h.ctl === 'bt-road-body-3' && h.bodyId, JSON.stringify(h));
    t.check('Home between cycles: no photo card is left (no banner, pill or Read more), the row is on the 20 px gutter, and Progress\'s ids are not repeated', !h.old && h.left === 20 && h.width === 350 && h.collide === 1, JSON.stringify([h.old, h.left, h.width, h.collide]));
    t.check('Home between cycles: the rest is as it was (Cycle 2 complete door row, Ready for Cycle 3?, Repeat a session)', h.done === 'Cycle 2 complete' && h.door === 'Ready for Cycle 3?' && h.rep && /Up next/.test(h.head), JSON.stringify([h.done, h.door, h.rep, h.head]));
    await p.click('.bt-next .road-head'); await p.waitForTimeout(450);
    const o = await p.evaluate(() => ({ open: document.querySelector('.bt-next .road-row').classList.contains('is-open'), exp: document.querySelector('.bt-next .road-head').getAttribute('aria-expanded'), home: document.getElementById('screen-home').classList.contains('active'),
      lead: document.querySelector('.bt-next .road-lead') && document.querySelector('.bt-next .road-lead').textContent, vis: !!(document.querySelector('.bt-next .road-lead') && document.querySelector('.bt-next .road-lead').getClientRects().length), h: Math.round(document.querySelector('.bt-next .road-body').getBoundingClientRect().height) }));
    t.check('Home between cycles: the row folds open in place (the teaser shows) and Home stays Home', o.open && o.exp === 'true' && o.home && o.lead === 'Strength becomes court speed.' && o.vis && o.h > 60, JSON.stringify(o));
    const hb = await p.evaluate(() => { const body = document.querySelector('.bt-next .road-in'); return { order: [...body.children].map(e => e.className.split(' ')[0] + (e.tagName === 'H3' ? ':' + e.textContent : '')).join(' | '),
      tagline: (body.querySelector('.road-tagline') || {}).textContent, aims: [...body.querySelectorAll('.road-aims li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()).join('|') }; });
    t.check('Home between cycles: Up next opens on the tagline, The aims, then the teaser (the same body as on Progress)', hb.order === 'road-tagline | road-sec:The aims | road-aims | road-lead | road-paras' && hb.tagline === 'Turn strength into speed' && hb.aims === '1Convert strength into usable court speed.', JSON.stringify(hb));
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
    await p.evaluate(() => document.querySelectorAll('#road-wrap .road-head[aria-expanded="false"], #road-wrap .road-ubtn[aria-expanded="false"]').forEach(b => b.click())); await p.waitForTimeout(500);
    const m = await p.evaluate(() => {
      const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { l: Math.round(b.left * 10) / 10, r: Math.round(b.right * 10) / 10 }; };
      const card = document.querySelector('#cycle-card-wrap .cyc-card'), cr = card.getBoundingClientRect();
      const inside = ['.cyc-top', '.cyc-name', '.cyc-dates', '.cyc-k', '.cyc-bar'].map(s => { const e = card.querySelector(s), b = e.getBoundingClientRect(); return [s, b.left >= cr.left - 0.5 && b.right <= cr.right + 0.5]; });
      const name = card.querySelector('.cyc-name');   // clipped = wider than its box: the title's line-height is under 1, so its glyphs may pass a line box by a pixel or two (nothing clips them; the card has room)
      const heads = [...document.querySelectorAll('#road-wrap .road-head')].map(e => { const b = e.getBoundingClientRect(); return [Math.round(b.left * 10) / 10, Math.round(b.right * 10) / 10]; });
      const texts = [...document.querySelectorAll('#road-wrap .road-nm, #road-wrap .road-ln, #road-wrap .road-aim, #road-wrap .road-out, #road-wrap .road-first, #road-wrap .road-note p, #road-wrap .road-ul, #road-wrap .road-uq, #road-wrap .road-lead, #road-wrap .road-paras p, #road-wrap .road-tagline')]
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
