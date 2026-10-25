// Personal Records and Body weight in the Centre Court look (Amir, 2026-10-13: "continue until everything has a consistent design"): the
// cover (← as the day cover's glass button, an eyebrow with a mint dot, the title, a scoreboard in equal tracks and one line), the rows on the
// paper, the door row, the retest as the day's banner, How this works as one closed fold row, + Log a max (picker, the form's boxes and keys,
// Save), a lift's page (chart in green, entries, ✕ two taps, the New best band), Body weight (the box and Weigh in, the range chips with their
// own class, the readings, Delete all). Behaviour, keys and writes are checked field by field: the screens may change, what they write may not.
// Serve the repo first (python -m http.server 8765 --bind 127.0.0.1, see lib.js), then: node scripts/headless/records-weight.js [--out <dir>]
'use strict';
const fs = require('fs'), path = require('path');
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');   // the LOCAL calendar day
const day = n => ymd(new Date(Date.now() - n * DAY));

const GREEN = 'rgb(14, 74, 54)', GREEN_DARK = 'rgb(109, 190, 149)', RING = 'rgb(138, 131, 120)', FIELD = 'rgb(168, 159, 146)';
const CLAYS = ['rgb(199, 85, 47)', 'rgb(224, 107, 67)', 'rgb(181, 70, 31)', 'rgb(194, 81, 44)'];
const CLAY_INK = 'rgb(181, 70, 31)', MINT = 'rgb(109, 190, 149)';

// The seeds. Three squat estimates and one split squat, four body weights (the last 79.8): the best lift is 104, the ratio 1.30.
const SQUAT = [
  { lift: 'Barbell Back Squat', kg: 92, w: '75', r: '6', rpe: 7, d: day(24), t: Date.now() - 24 * DAY },
  { lift: 'Barbell Back Squat', kg: 98, w: '80', r: '6', rpe: 7, d: day(10), t: Date.now() - 10 * DAY, auto: true },
  { lift: 'Barbell Back Squat', kg: 104, w: '85', r: '6', rpe: 7, d: day(2), t: Date.now() - 2 * DAY },
];
const LIFTS = SQUAT.concat([{ lift: 'Dumbbell Bulgarian Split Squat', kg: 40, w: '30', r: '6', rpe: 8, d: day(12), t: Date.now() - 12 * DAY }]);
const WEIGHT4 = { [day(33)]: { kg: 81.4, t: 1 }, [day(18)]: { kg: 80.6, t: 2 }, [day(7)]: { kg: 80.1, t: 3 }, [day(1)]: { kg: 79.8, t: 4 } };
const WEIGHT5 = { [day(33)]: { kg: 81.4, t: 1 }, [day(18)]: { kg: 80.6, t: 2 }, [day(5)]: { kg: 80.2, t: 3 }, [day(3)]: { kg: 80.0, t: 4 }, [day(1)]: { kg: 79.6, t: 5 } };
const NUM = { _1rm: LIFTS, _hab_wt: WEIGHT4 };

// A programme whose Back Squat the coach flagged for a 5RM retest. Undated, so the closing-week window is open (inRetestWindow()).
function retestProg() {
  const P = H.fixture({ dated: false });
  P.workouts.days[0].blocks[1].exercises.find(e => e.name === 'Barbell Back Squat').test = '5RM';
  return P;
}

// Every text node the active screen draws, as a client rect, against the account button's (the initials sit at the top right of the cover).
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

// Every control the active screen draws that is under 44 px either way.
const SMALL_CONTROLS = `(() => [...document.querySelectorAll('.screen.active button, .screen.active input:not([type=hidden]), .screen.active summary, .screen.active a, .screen.active select')]
  .filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden'; })
  .map(e => { const r = e.getBoundingClientRect(); return { n: (e.className || e.id || e.tagName) + ':' + (e.textContent || '').trim().slice(0, 14), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; })
  .filter(c => c.w < 43.5 || c.h < 43.5))()`;

const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const active = p => p.evaluate(() => document.querySelector('.screen.active').id);
const read = (p, key) => p.evaluate(k => JSON.parse(localStorage.getItem(ATHLETE_ID + k)), key);

// What the cover shows: eyebrow, title, board cells as [value, caption], the line.
const COVER = `(() => {
  const h = document.querySelector('.screen.active .ceil-head'), q = s => h.querySelector(s);
  const board = q('.ceil-board'), line = q('.ceil-line');
  return { kick: q('.ceil-kick').textContent, title: q('.ceil-title').textContent,
    cells: board.hidden ? [] : [...board.children].map(c => [[...c.querySelector('b').childNodes].map(n => n.textContent).join(' ').replace(/\\s+/g, ' ').trim(), c.querySelector('i').innerText.replace(/\\s+/g, ' ').trim()]),
    boardHidden: board.hidden || getComputedStyle(board).display === 'none', line: line.hidden ? null : line.textContent.replace(/\\s+/g, ' ').trim(),
    widths: board.hidden ? [] : [...board.children].map(c => Math.round(c.getBoundingClientRect().width)) };
})()`;

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png'), fullPage: true });
  const pageText = (p, sel) => p.evaluate(s => document.querySelector(s).innerText.replace(/\s+/g, ' ').trim(), sel);

  // ── 1. the Records cover, with a body weight ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: NUM });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(450);
    const c = await p.evaluate(COVER);
    t.check('Records cover: the eyebrow "Your best lifts", the title "Personal Records"', c.kick === 'Your best lifts' && c.title === 'Personal Records', JSON.stringify([c.kick, c.title]));
    t.check('Records cover: the scoreboard is the best lift (104 · KG BACK SQUAT), the ratio (1.30× · YOUR OWN BODY WEIGHT) and the number of lifts (2 · LIFTS)',
      JSON.stringify(c.cells) === JSON.stringify([['104', 'KG BACK SQUAT'], ['1.30×', 'YOUR OWN BODY WEIGHT'], ['2', 'LIFTS']]), JSON.stringify(c.cells));
    t.check('Records cover: the three tracks are equal', Math.max(...c.widths) - Math.min(...c.widths) <= 1, JSON.stringify(c.widths));
    t.check('Records cover: the old green card\'s words are the one line under the scoreboard',
      /^You can lift 1\.30 times your own body weight on the Barbell Back Squat\. On court that counts for more than the raw kilos\.$/.test(c.line || ''), c.line);
    const look = await p.evaluate(() => {
      const h = document.querySelector('#screen-ceiling .ceil-head'), k = h.querySelector('.ceil-kick'), ti = h.querySelector('.ceil-title'), b = h.querySelector('.ceil-board');
      const back = h.querySelector('.nav-back'), br = back.getBoundingClientRect(), bv = b.querySelector('b'), bi = b.querySelector('i');
      const dot = getComputedStyle(k, '::before'), kc = getComputedStyle(k), tc = getComputedStyle(ti), bc = getComputedStyle(b);
      return { bg: getComputedStyle(h).backgroundImage.slice(0, 16), color: getComputedStyle(h).color, kickFont: kc.fontFamily, kickCaps: kc.textTransform, kickColor: kc.color, dot: [dot.width, dot.height, dot.backgroundColor],
        titleTag: ti.tagName, titleSize: parseFloat(tc.fontSize), titleWeight: tc.fontWeight, titleCaps: tc.textTransform, titleFont: tc.fontFamily, hair: [bc.borderTopWidth, bc.borderTopColor],
        valFont: getComputedStyle(bv).fontFamily, valWeight: getComputedStyle(bv).fontWeight, capFont: getComputedStyle(bi).fontFamily,
        back: { w: Math.round(br.width), h: Math.round(br.height), radius: getComputedStyle(back).borderRadius, bg: getComputedStyle(back).backgroundColor, onclick: back.getAttribute('onclick') },
        old: ['.ceil-hero', '.ceil-card', '.ceil-gain', '.ceil-big'].filter(s => document.querySelector('#screen-ceiling ' + s)) };
    });
    t.check('Records cover: green (the hero gradient), white text, a Space Mono eyebrow in capitals with a 7 px mint dot',
      look.bg === 'radial-gradient(' && look.color === 'rgb(255, 255, 255)' && /Space Mono/.test(look.kickFont) && look.kickCaps === 'uppercase' && look.dot[0] === '7px' && look.dot[1] === '7px' && look.dot[2] === 'rgb(109, 190, 149)', JSON.stringify(look));
    t.check('Records cover: the title is Barlow Condensed 900 capitals, 28 to 36 px, an <h1>',
      look.titleTag === 'H1' && look.titleSize >= 28 && look.titleSize <= 36 && look.titleWeight === '900' && look.titleCaps === 'uppercase' && /Barlow Condensed/.test(look.titleFont), JSON.stringify([look.titleTag, look.titleSize, look.titleWeight, look.titleFont]));
    t.check('Records cover: values in Barlow Condensed 900 over Space Mono captions, a hairline above', /Barlow Condensed/.test(look.valFont) && look.valWeight === '900' && /Space Mono/.test(look.capFont) && look.hair[0] === '1px', JSON.stringify([look.valFont, look.valWeight, look.capFont, look.hair]));
    t.check('Records cover: ← is the day cover\'s 44 px glass button, and still calls ceilingBack()',
      look.back.w === 44 && look.back.h === 44 && look.back.radius === '50%' && look.back.bg === 'rgba(0, 0, 0, 0.22)' && look.back.onclick === 'ceilingBack()', JSON.stringify(look.back));
    t.check('Records: the old green card and the card\'s parts are gone', look.old.length === 0, look.old.join());
    const ov = await p.evaluate(OVERLAP);
    t.check('Records: the initials button overlaps no text', !ov.hidden && ov.hits.length === 0, JSON.stringify(ov));
    // the paper: rows with hairlines, no boxes
    const paper = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('#ceil-body .ceil-lift')], cs = rows.map(r => getComputedStyle(r));
      const q = s => { const e = document.querySelector('#ceil-body ' + s); return e ? getComputedStyle(e) : null; };
      return { n: rows.length, border: cs.map(c => c.borderTopWidth + '|' + c.borderBottomWidth + '|' + c.borderLeftWidth + '|' + c.borderTopColor), bg: cs.map(c => c.backgroundColor), minH: cs.map(c => Math.round(c.minHeight === 'auto' ? 0 : parseFloat(c.minHeight))),
        name: q('.ceil-lift-n') && [q('.ceil-lift-n').fontFamily.slice(0, 6), q('.ceil-lift-n').fontWeight, q('.ceil-lift-n').fontSize], mono: q('.ceil-lift-d') && [q('.ceil-lift-d').fontFamily.slice(0, 10), q('.ceil-lift-d').textTransform],
        num: q('.ceil-lift-v') && [q('.ceil-lift-v').fontFamily.split(',')[0], q('.ceil-lift-v').fontWeight, q('.ceil-lift-v').fontSize], unit: document.querySelector('#ceil-body .ceil-lift-u').textContent,
        spark: rows.map(r => !!r.querySelector('svg.ceil-spark')), sec: (document.querySelector('#ceil-body .prog-sec') || {}).textContent,
        secStyle: q('.prog-sec') && [q('.prog-sec').color, q('.prog-sec').textTransform], names: rows.map(r => r.querySelector('.ceil-lift-n').textContent), lines: rows.map(r => r.querySelector('.ceil-lift-d').textContent.replace(/\s+/g, ' ').trim()),
        value: rows.map(r => r.querySelector('.ceil-lift-v').textContent), cards: document.querySelectorAll('#ceil-body .ceil-card').length };
    });
    t.check('Records: "Your lifts" is a green section title, then one paper row per lift, newest first (hairline between, no box, no fill)',
      paper.sec === 'Your lifts' && paper.secStyle[0] === GREEN && paper.secStyle[1] === 'uppercase' && paper.n === 2 && paper.names.join() === 'Barbell Back Squat,Dumbbell Bulgarian Split Squat' && paper.bg.every(b => b === 'rgba(0, 0, 0, 0)')
        && paper.border[0] === '0px|0px|0px|' + paper.border[0].split('|')[3] && paper.border[1].startsWith('1px|0px|0px|') && paper.cards === 0, JSON.stringify(paper));
    t.check('Records row: the name Barlow 600 at 18 px, a mono capitals line, the number Barlow Condensed 900 at 22 px over KG, the sparkline, 64 px tall',
      paper.name[1] === '600' && paper.name[2] === '18px' && paper.mono[1] === 'uppercase' && /Space Mon/.test(paper.mono[0]) && paper.num[1] === '900' && paper.num[2] === '22px' && paper.unit === 'KG' && paper.spark.every(Boolean) && paper.minH.every(h => h >= 64), JSON.stringify(paper));
    t.check('Records row: the mono line carries the words it always did (▲ 12 kg since you started · Logged 2 days ago; First estimate · Logged 12 days ago)',
      paper.lines[0] === '▲ 12 kg since you started · Logged 2 days ago' && paper.lines[1] === 'First estimate · Logged 12 days ago' && paper.value.join() === '104,40', JSON.stringify(paper.lines));
    // the door row, and what a tap does
    const door = await p.evaluate(() => { const d = document.querySelector('#ceil-body .hrow.ceil-door'), c = d && getComputedStyle(d); return d && { label: d.querySelector('.hrow-l').textContent, line: d.querySelector('.hrow-q').textContent, quiet: !d.querySelector('.hrow-v'), onclick: d.getAttribute('onclick'),
      look: [c.backgroundColor, c.borderTopWidth, c.borderTopLeftRadius, c.minHeight, c.display].join('|'), icon: !!d.querySelector('.hrow-ic svg'), arrow: d.querySelector('.hrow-a').textContent }; });
    // Named after the form it opens, with the prompt on the QUIET line (Amir, 2026-10-19). It was "Tested a lift?" over a louder
    // "+ Log a max" — a question titling the action — because the prose sat in the figure's slot (.hrow-v, 18 px bold), not .hrow-q.
    t.check('the hand-entry door: "Log a max" over the quiet prompt, never in the figure\'s slot, an icon and a ›, white, a 1 px edge, 12 px corners, 64 px', !!door && door.label === 'Log a max' && door.line === 'Tested one in the gym? Add it here.' && door.quiet && door.onclick === 'openCeilingAdd()' && door.icon && door.arrow === '›'
      && door.look === 'rgb(255, 255, 255)|1px|12px|64px|flex', JSON.stringify(door));
    const doorLook = await p.evaluate(() => { const h = document.querySelector('#ceil-body .hrow'), c = getComputedStyle(h); return [c.backgroundColor, c.borderTopWidth, c.borderTopLeftRadius, c.minHeight].join('|'); });
    await p.evaluate("goTo('plan')"); await p.waitForTimeout(400);
    // On Progress the Records row is one row of the Your body card since 2026-10-20, so the card is what carries that look: the
    // white box, the 1 px edge and the 12 px corners. The row inside it keeps the height and adds nothing of its own.
    const progLook = await p.evaluate(() => { const card = document.getElementById('body-card'), c = getComputedStyle(card), h = getComputedStyle(document.querySelector('#ceiling-row-wrap .hrow'));
      return [c.backgroundColor, c.borderTopWidth, c.borderTopLeftRadius, h.minHeight].join('|'); });
    t.check('the door row here is the look the Your body card carries on Progress', doorLook === progLook, doorLook + ' vs ' + progLook);
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(400);
    // How this works: ONE fold row, closed, opens and closes, the same text
    const hw = await p.evaluate(() => ({ n: document.querySelectorAll('#ceil-body details.ceil-help').length, open: document.querySelector('.ceil-help').open, label: document.querySelector('.ceil-help summary').textContent.trim(),
      sh: Math.round(document.querySelector('.ceil-help summary').getBoundingClientRect().height), bodyShown: Math.round(document.querySelector('.ceil-help').getBoundingClientRect().height) > Math.round(document.querySelector('.ceil-help summary').getBoundingClientRect().height) + 3 }));
    t.check('How this works: one fold row, closed by default (its text is not shown)', hw.n === 1 && hw.open === false && hw.label === 'How this works' && hw.bodyShown === false && hw.sh >= 64, JSON.stringify(hw));
    await p.click('.ceil-help summary'); await p.waitForTimeout(250);
    const hw2 = await p.evaluate(() => { const probe = document.createElement('div'); probe.innerHTML = CEILING_HELP; document.body.appendChild(probe); const want = probe.textContent.replace(/\s+/g, ' ').trim(); probe.remove();
      return { open: document.querySelector('.ceil-help').open, same: document.querySelector('.ceil-help-b').textContent.replace(/\s+/g, ' ').trim() === want, shown: Math.round(document.querySelector('.ceil-help').getBoundingClientRect().height) > 200 }; });
    t.check('How this works: a tap opens it, with the same text as the guide\'s Personal Records card', hw2.open && hw2.same && hw2.shown, JSON.stringify(hw2));
    await shot(p, 'records-help-open');
    await p.click('.ceil-help summary'); await p.waitForTimeout(250);
    t.check('How this works: a second tap closes it', await p.evaluate(() => !document.querySelector('.ceil-help').open));
    await shot(p, 'records-lifts');
    t.check('no page errors (Records cover and rows)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. the Records cover with lifts and no body weight: no ratio track, a door asks for the weight ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: { _1rm: LIFTS } });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(450);
    const c = await p.evaluate(COVER);
    t.check('Records without a body weight: two tracks (the best lift and the number of lifts), no ratio and no line', JSON.stringify(c.cells) === JSON.stringify([['104', 'KG BACK SQUAT'], ['2', 'LIFTS']]) && c.line === null, JSON.stringify(c));
    const ask = await p.evaluate(() => { const d = document.querySelector('#ceil-body .hrow.ceil-ask'); return d && { label: d.querySelector('.hrow-l').textContent, q: d.querySelector('.hrow-q').textContent.replace(/\s+/g, ' ').trim(), onclick: d.getAttribute('onclick'), icon: !!d.querySelector('.hrow-ic svg') }; });
    t.check('Records without a body weight: "Add your body weight" is a door row with the same sentence, and it goes to Body weight',
      !!ask && ask.label === 'Add your body weight' && /^Lifting 104 kg means one thing at 65 kg and something else at 95 kg\. What counts on court is how strong you are for your size\. Add your weight and it shows up here\.$/.test(ask.q) && ask.onclick === 'goWeight()' && ask.icon, JSON.stringify(ask));
    const order = await p.evaluate(() => [...document.querySelectorAll('#ceil-body > *')].map(e => e.className.split(' ').slice(0, 2).join('.')));
    t.check('Records without a body weight: the order is the intro, the Add-your-weight door, + Log a max, Your lifts', order.join(' ') === 'ceil-intro hrow.ceil-ask hrow.ceil-door prog-sec ceil-list ceil-note ceil-help', order.join(' '));
    await shot(p, 'records-no-weight');
    await p.click('#ceil-body .ceil-ask'); await p.waitForTimeout(400);
    t.check('...and a tap opens Body weight', (await active(p)) === 'screen-weight', await active(p));
    await ctx.close();
  }

  // ── 3. nothing recorded yet: the numbered steps, the sentence, the door, How this works closed ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: {} });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(450);
    const e = await p.evaluate(() => ({ cover: (() => { const h = document.querySelector('#screen-ceiling .ceil-head'); return { board: h.querySelector('.ceil-board').hidden, line: h.querySelector('.ceil-line').hidden, kick: h.querySelector('.ceil-kick').textContent }; })(),
      steps: [...document.querySelectorAll('#ceil-body .ceil-steps li')].map(li => [li.textContent.replace(/\s+/g, ' ').trim(), getComputedStyle(li, '::before').content, getComputedStyle(li, '::before').color, getComputedStyle(li, '::before').fontFamily.slice(0, 10)]),
      head: document.querySelector('#ceil-body .ceil-empty strong').textContent, order: [...document.querySelectorAll('#ceil-body > *')].map(e => e.className.split(' ').slice(0, 2).join('.')),
      after: document.querySelector('#ceil-body .ceil-after-steps').textContent.replace(/\s+/g, ' ').trim(), help: { open: document.querySelector('.ceil-help').open, n: document.querySelectorAll('.ceil-help').length },
      door: !!document.querySelector('#ceil-body .hrow.ceil-door') }));
    t.check('Records empty: the cover has no scoreboard and no line', e.cover.board && e.cover.line && e.cover.kick === 'Your best lifts', JSON.stringify(e.cover));
    t.check('Records empty: the four steps are a numbered list on the paper (01 to 04, Space Mono, green), with the same words',
      e.steps.length === 4 && e.steps.every(s => s[1] === 'counter(ceilstep, decimal-leading-zero)') && e.steps.every(s => s[2] === GREEN && /Space Mon/.test(s[3])) && /Open any exercise in today's session\./.test(e.steps[0][0]) && /Finish the session\. Your best set lands here by itself/.test(e.steps[3][0]) && e.head === 'Nothing here yet.', JSON.stringify(e));
    t.check('Records empty: then the one sentence about putting one in, then the + Log a max door, then How this works (closed)',
      /^Or put one in from here\. It's useful when you have just tested a lift, or lifted somewhere the app was not open\.$/.test(e.after) && e.door && e.order.join(' ') === 'ceil-intro ceil-empty hrow.ceil-door ceil-help' && e.help.n === 1 && e.help.open === false, JSON.stringify([e.after, e.door, e.order, e.help]));
    await shot(p, 'records-empty');
    t.check('no page errors (Records empty)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. the retest: the day's banner, the same words, the action as a green condensed link; the test form opens ──
  {
    const { ctx, p } = await H.openProgram(browser, { prog: retestProg(), seed: { _1rm: [Object.assign({}, SQUAT[0], { d: day(40), t: Date.now() - 40 * DAY })], _hab_wt: WEIGHT4 } });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(450);
    const r = await p.evaluate(() => {
      const b = document.querySelector('#ceil-body .ceil-due'); if (!b) return null;
      const c = getComputedStyle(b), lab = b.querySelector('.ceil-due-t'), txt = b.querySelector('.ceil-due-d'), a = b.querySelector('.ceil-due-a'), ac = getComputedStyle(a), af = getComputedStyle(a, '::after'), row = b.querySelector('.ceil-due-r');
      const rr = b.getBoundingClientRect(), vw = innerWidth;
      return { label: lab.textContent, labelColor: getComputedStyle(lab).color, labelFont: getComputedStyle(lab).fontFamily.slice(0, 10), sentence: txt.textContent.replace(/\s+/g, ' ').trim(), sentenceColor: getComputedStyle(txt).color,
        bg: c.backgroundColor, shadow: c.boxShadow, radius: c.borderTopLeftRadius, full: Math.round(rr.left) === 0 && Math.round(rr.right) === vw,
        name: b.querySelector('.ceil-due-n').textContent, meta: b.querySelector('.ceil-pick-s').textContent, action: a.textContent, actionColor: ac.color, actionFont: ac.fontFamily.split(',')[0], actionWeight: ac.fontWeight, actionCaps: ac.textTransform,
        chevron: af.content + '|' + (af.webkitMaskImage || af.maskImage || '').slice(0, 8), onclick: row.getAttribute('onclick'), rowH: Math.round(row.getBoundingClientRect().height), n: document.querySelectorAll('#ceil-body .ceil-due').length, wait: !!b.querySelector('.ceil-due-wait') };
    });
    t.check('Retest: one banner, the label "Due for a retest" in clay on the paper, the sentence in ink, the words unchanged',
      !!r && r.n === 1 && r.label === 'Due for a retest' && r.labelColor === CLAY_INK && /Space Mon/.test(r.labelFont) && /^You are at the end of a block\. Retest this lift and the next one starts from a real number\. Warm up properly, then one hard set — stop when the last rep is a true grind\.$/.test(r.sentence) && r.sentenceColor === 'rgb(26, 26, 26)', JSON.stringify(r));
    t.check('Retest: the day\'s banner recipe (a white full-width row, a 4 px stripe in the clay that asks, square corners, no box)', !!r && r.bg === 'rgb(255, 255, 255)' && /rgb\(194, 81, 44\).*inset|inset.*rgb\(194, 81, 44\)/.test(r.shadow) && /4px/.test(r.shadow) && r.radius === '0px' && r.full, JSON.stringify([r && r.bg, r && r.shadow, r && r.radius, r && r.full]));
    t.check('Retest: the lift, its record, and the action "Test 5RM" as the green Barlow Condensed link with the chevron (no arrow glyph), 44 px or more',
      !!r && r.name === 'Barbell Back Squat' && /^92 kg · logged 6 weeks ago$/.test(r.meta) && r.action === 'Test 5RM' && r.actionColor === GREEN && /Barlow Condensed/.test(r.actionFont) && r.actionWeight === '700' && r.actionCaps === 'uppercase' && /^"".*url|^"".*image/.test(r.chevron) && r.rowH >= 44, JSON.stringify(r));
    await shot(p, 'records-retest');
    await p.click('#ceil-body .ceil-due-r'); await p.waitForTimeout(450);
    const f = await p.evaluate(() => ({ screen: document.querySelector('.screen.active').id, title: document.getElementById('ceil-title').textContent, kick: document.querySelector('#screen-ceiling .ceil-kick').textContent, reps: document.getElementById('cf-rp').value,
      intro: document.querySelector('#ceil-body .ceil-intro').textContent.replace(/\s+/g, ' ').trim(), board: document.querySelector('#screen-ceiling .ceil-board').hidden }));
    t.check('Retest: the action opens the lift\'s form as a 5RM test (reps 5, the test words, no scoreboard on the cover)', f.screen === 'screen-ceiling' && f.title === 'Barbell Back Squat' && f.kick === 'Log a max' && f.reps === '5' && /^A 5RM test: warm up in steps, then one hard set of 5\./.test(f.intro) && f.board, JSON.stringify(f));
    // a test saved as a test: test: true on the entry, and on the same day it replaces the old entry only for that day
    await p.fill('#cf-kg', '90'); await p.click('.cf-rpe .rpe-btn[data-rpe="9"]'); await p.waitForTimeout(150);
    const est = await p.evaluate(() => estimateOneRM(90, 5, 9));
    await p.click('#cf-save'); await p.waitForTimeout(450);
    const saved = (await read(p, '_1rm')).filter(e => e.d === ymd(new Date()));
    t.check('Retest saved: the entry is {lift, kg: the estimate, w, r, rpe, d: today, t, test: true}, nothing else',
      saved.length === 1 && JSON.stringify(Object.keys(saved[0]).sort()) === JSON.stringify(['d', 'kg', 'lift', 'r', 'rpe', 't', 'test', 'w']) && saved[0].lift === 'Barbell Back Squat' && saved[0].kg === est && saved[0].w === 90 && saved[0].r === 5 && saved[0].rpe === 9 && saved[0].test === true && typeof saved[0].t === 'number', JSON.stringify(saved));
    await ctx.close();
  }
  {
    // no flag, no banner
    const { ctx, p } = await H.openProgram(browser, { prog: H.fixture({ dated: false }), seed: { _1rm: LIFTS, _hab_wt: WEIGHT4 } });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(400);
    t.check('Retest: no flagged lift, no banner', await p.evaluate(() => !document.querySelector('.ceil-due')));
    await ctx.close();
  }

  // ── 5. + Log a max: picker → form → Save writes the same entry as before, field by field ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: NUM });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(400);
    const before = await read(p, '_1rm');
    await p.click('#ceil-body .ceil-door'); await p.waitForTimeout(450);
    const pk = await p.evaluate(() => ({ title: document.getElementById('ceil-title').textContent, kick: document.querySelector('#screen-ceiling .ceil-kick').textContent, board: document.querySelector('#screen-ceiling .ceil-board').hidden,
      rows: [...document.querySelectorAll('#ceil-body .ceil-lift')].map(r => [r.querySelector('.ceil-lift-n').textContent, r.querySelector('.ceil-pick-s').textContent, r.querySelector('.ceil-go').textContent, Math.round(r.getBoundingClientRect().height), getComputedStyle(r).backgroundColor]),
      cands: ceilingCandidates().map(c => c.name), sec: document.querySelector('#ceil-body .prog-sec').textContent, intro: document.querySelector('#ceil-body .ceil-intro').textContent.replace(/\s+/g, ' ').trim() }));
    t.check('Log a max, the picker: the title "Log a max", the eyebrow "Personal records", no scoreboard, a green section title "This cycle"', pk.title === 'Log a max' && pk.kick === 'Personal records' && pk.board && pk.sec === 'This cycle', JSON.stringify([pk.title, pk.kick, pk.board, pk.sec]));
    t.check('Log a max, the picker: every lift of the cycle is a paper row with a ›, in the programme\'s order, with how it stands (104 kg · logged 2 days ago; nothing on the record yet)',
      pk.rows.map(r => r[0]).join() === pk.cands.join() && pk.rows.every(r => r[2] === '›' && r[3] >= 64 && r[4] === 'rgba(0, 0, 0, 0)') && pk.rows.find(r => r[0] === 'Barbell Back Squat')[1] === '104 kg · logged 2 days ago' && pk.rows.find(r => r[0] === 'Box Jump')[1] === 'nothing on the record yet'
        && /^Pick the lift, then put in what you actually did\./.test(pk.intro), JSON.stringify(pk.rows));
    await shot(p, 'picker');
    // ← from the picker goes back to the list, then to Progress (the one step at a time it always did)
    await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(350);
    t.check('the picker\'s ← goes to the list, not out of Records', (await active(p)) === 'screen-ceiling' && (await p.evaluate(() => document.getElementById('ceil-title').textContent)) === 'Personal Records');
    await p.click('#ceil-body .ceil-door'); await p.waitForTimeout(350);
    await p.locator('#ceil-body .ceil-lift', { hasText: 'Barbell Back Squat' }).click(); await p.waitForTimeout(450);
    const fm = await p.evaluate(() => {
      const kg = document.getElementById('cf-kg'), rp = document.getElementById('cf-rp'); kg.blur(); const c = getComputedStyle(kg), keys = [...document.querySelectorAll('#ceil-body .cf-rpe .rpe-btn')], k0 = getComputedStyle(keys[0]), save = document.getElementById('cf-save'), sc = getComputedStyle(save);
      const when = document.getElementById('cf-day'), wc = getComputedStyle(when);
      return { title: document.getElementById('ceil-title').textContent, kick: document.querySelector('#screen-ceiling .ceil-kick').textContent, saveHidden: save.hidden, out: document.getElementById('cf-out').textContent, from: document.getElementById('cf-from').textContent,
        box: [c.height, c.borderTopWidth, c.borderTopColor, c.borderTopLeftRadius, c.backgroundColor, c.fontSize, c.textAlign, c.fontFamily.slice(0, 6), c.fontWeight].join('|'), reps: rp.value, repsBox: [getComputedStyle(rp).height, getComputedStyle(rp).borderTopColor].join('|'),
        keys: keys.map(k => k.textContent).join(), key: [k0.height, k0.borderTopLeftRadius, k0.backgroundColor, k0.boxShadow.slice(0, 40), k0.fontSize, k0.fontFamily.split(',')[0]].join('|'), q: document.querySelector('.cf-rpe .rpe-label').textContent,
        save: [(c => { if (c.backgroundImage === 'none') return c.backgroundColor; const e = document.createElement('i'); e.style.backgroundImage = 'var(--btn)'; document.body.appendChild(e); const v = getComputedStyle(e).backgroundImage; e.remove(); return c.backgroundImage === v ? 'BTN' : c.backgroundImage; })(sc), sc.color, sc.borderTopLeftRadius, sc.minHeight, sc.fontFamily.split(',')[0], sc.fontWeight, sc.textTransform, sc.display].join('|'), saveText: save.textContent,
        when: [wc.height, wc.borderTopColor, wc.borderTopLeftRadius, wc.backgroundColor].join('|'), whenLabel: document.querySelector('.ceil-when label').textContent, whenValue: when.value, ceilCard: !!document.querySelector('#ceil-body .ceil-card'), sec: document.querySelector('#ceil-body .prog-sec').textContent };
    });
    t.check('Log a max, the form: the title is the lift, the eyebrow "Log a max", Save is hidden until there is a number', fm.title === 'Barbell Back Squat' && fm.kick === 'Log a max' && fm.saveHidden && fm.out === '—', JSON.stringify([fm.title, fm.kick, fm.saveHidden, fm.out]));
    t.check('Log a max, the form: kg and reps are the set table\'s boxes (white, 1 px edged --field, 10 px corners, 48 px, Barlow 500 at 16 px, centred)',
      fm.box === `48px|1px|${FIELD}|10px|rgb(255, 255, 255)|16px|center|Barlow|500` && fm.repsBox === `48px|${FIELD}` && !fm.ceilCard, fm.box + ' / ' + fm.repsBox);
    t.check('Log a max, the form: the RPE keys are the day\'s 48 px keys 6 to 10 with "How hard?" (white, a --box ring, Barlow Condensed 22 px)', fm.keys === '6,7,8,9,10' && /^48px\|10px\|rgb\(255, 255, 255\)\|rgb\(216, 209, 197\)/.test(fm.key) && /22px\|"Barlow Condensed"/.test(fm.key) && fm.q === 'How hard?', fm.key);
    t.check('Log a max, the form: Save is the one primary green button (green fill, white Barlow Condensed capitals, 8 px corners, 44 px or more), the words unchanged, and the date row is the set table\'s box',
      fm.save.startsWith('BTN|rgb(255, 255, 255)|8px|') && parseFloat(fm.save.split('|')[3]) >= 44 && /Barlow Condensed/.test(fm.save) && /\|700\|uppercase\|none$/.test(fm.save) && fm.saveText === 'Save to Personal Records'
        && fm.when === `48px|${FIELD}|10px|rgb(255, 255, 255)` && fm.whenLabel === 'When' && fm.whenValue === ymd(new Date()), JSON.stringify([fm.save, fm.when]));
    await p.fill('#cf-kg', '100'); await p.fill('#cf-rp', '5'); await p.click('.cf-rpe .rpe-btn[data-rpe="8"]'); await p.waitForTimeout(200);
    const est = await p.evaluate(() => estimateOneRM(100, 5, 8));
    const lv = await p.evaluate(() => {
      const out = document.getElementById('cf-out'), gr = document.getElementById('cf-grade'), from = document.getElementById('cf-from'), b = out.querySelector('b'), i = out.querySelector('i'), board = document.querySelector('.cf-board');
      const cols = getComputedStyle(board).gridTemplateColumns.split(' ').length;
      return { out: b.textContent, unit: i.textContent, grade: gr.firstChild.textContent.trim(), cap: gr.querySelector('em').textContent, gradeClass: gr.className, outFont: getComputedStyle(b).fontFamily.split(',')[0], outWeight: getComputedStyle(b).fontWeight, outColor: getComputedStyle(b).color,
        gradeFont: getComputedStyle(gr).fontFamily.split(',')[0], from: from.innerText.replace(/\s+/g, ' ').trim(), cols, hair: getComputedStyle(board).borderTopWidth, saveHidden: document.getElementById('cf-save').hidden, saveDisplay: getComputedStyle(document.getElementById('cf-save')).display, pressed: document.querySelector('.cf-rpe .rpe-btn.selected').getAttribute('aria-pressed'),
        sel: getComputedStyle(document.querySelector('.cf-rpe .rpe-btn.selected')).backgroundColor, rpe: document.getElementById('cf-rpe').value };
    });
    t.check('Log a max, the form: the estimate and its grade are a small scoreboard under a hairline (value over caption), the words unchanged',
      lv.out === String(est) && lv.unit === 'KG' && /^(Sharp|Good|Rough)$/.test(lv.grade) && lv.cap === 'how much to trust it' && /Barlow Condensed/.test(lv.outFont) && lv.outWeight === '900' && lv.outColor === GREEN && /Barlow Condensed/.test(lv.gradeFont) && lv.cols === 2 && lv.hair === '1px' && /^Your numbers · 2 reps left in you/.test(lv.from), JSON.stringify(lv));
    t.check('Log a max, the form: a number turns Save on, and the chosen RPE key is green and pressed', lv.saveHidden === false && lv.saveDisplay === 'block' && lv.pressed === 'true' && lv.sel === GREEN && lv.rpe === '8', JSON.stringify([lv.saveHidden, lv.pressed, lv.sel, lv.rpe]));
    await shot(p, 'form');
    // ← from the form goes back to the picker
    await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(350);
    t.check('the form\'s ← goes back to the picker', (await p.evaluate(() => document.getElementById('ceil-title').textContent)) === 'Log a max');
    await p.locator('#ceil-body .ceil-lift', { hasText: 'Barbell Back Squat' }).click(); await p.waitForTimeout(400);
    await p.fill('#cf-kg', '100'); await p.fill('#cf-rp', '5'); await p.click('.cf-rpe .rpe-btn[data-rpe="8"]'); await p.waitForTimeout(200);
    await p.click('#cf-save'); await p.waitForTimeout(500);
    const after = await read(p, '_1rm'), today = ymd(new Date());
    const added = after.filter(e => !before.some(b => JSON.stringify(b) === JSON.stringify(e)));
    t.check('Save writes ONE entry, {lift, kg: the estimate, w: 100, r: 5, rpe: 8, d: today, t} with no test key, field by field, and touches no other entry',
      added.length === 1 && after.length === before.length + 1 && JSON.stringify(Object.keys(added[0]).sort()) === JSON.stringify(['d', 'kg', 'lift', 'r', 'rpe', 't', 'w']) && added[0].lift === 'Barbell Back Squat' && added[0].kg === est && added[0].w === 100 && added[0].r === 5 && added[0].rpe === 8 && added[0].d === today && Math.abs(added[0].t - Date.now()) < 20000, JSON.stringify(added));
    const nb = await read(p, '_ceil_best');
    t.check('Save beating the best writes the New best marker as before ({lift, kg, prev, d, t, i})', !!nb && JSON.stringify(Object.keys(nb).sort()) === JSON.stringify(['d', 'i', 'kg', 'lift', 'prev', 't']) && nb.lift === 'Barbell Back Squat' && nb.kg === est && nb.prev === 104 && nb.d === today && typeof nb.i === 'number', JSON.stringify(nb));
    const lp = await p.evaluate(() => ({ title: document.getElementById('ceil-title').textContent, kick: document.querySelector('#screen-ceiling .ceil-kick').textContent, band: (document.querySelector('.ceil-pr') || {}).innerText,
      share: !!document.querySelector('.ceil-pr .ceil-pr-share') }));
    // Since Highlight Reel (2026-10-17) the band ends on Share when its record makes a card (100 × 5 beat the best before it).
    t.check('...and lands on that lift\'s page with the New best band, and its Share', lp.title === 'Barbell Back Squat' && lp.kick === 'Personal records' && /^NEW BEST\s+\d+(\.\d)? KG OVER YOUR LAST BEST SHARE$/.test((lp.band || '').trim().replace(/\s+/g, ' ')) && (lp.band || '').replace(/\s+/g, ' ').includes(`${Math.round((est - 104) * 10) / 10} KG OVER`) && lp.share, JSON.stringify(lp));
    t.check('no page errors (Log a max)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 6. a lift's page: the cover, the chart in green, the entries, ✕ takes two taps and writes the same tombstone ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: { _1rm: SQUAT, _hab_wt: WEIGHT4 } });
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(350);
    await p.click('#ceil-body .ceil-lift'); await p.waitForTimeout(450);
    const c = await p.evaluate(COVER);
    t.check('Lift page cover: the lift\'s name is the title; the scoreboard is the latest estimate, the change since the first, the entries',
      c.title === 'Barbell Back Squat' && c.kick === 'Personal records' && JSON.stringify(c.cells) === JSON.stringify([['104', 'KG ESTIMATE'], ['+12', 'KG SINCE FIRST'], ['3', 'ENTRIES']]) && c.line === null, JSON.stringify(c));
    const ch = await p.evaluate(() => {
      const svg = document.querySelector('#ceil-body .ceil-chart'), kids = [...svg.children], comp = e => getComputedStyle(e);
      return { poly: svg.querySelectorAll('polyline').length, dots: [...svg.querySelectorAll('circle')].map(e => comp(e).fill), polyStroke: comp(svg.querySelector('polyline')).stroke, polyFill: comp(svg.querySelector('polyline')).fill,
        axes: [...svg.querySelectorAll('.ceil-axis')].map(e => comp(e).stroke), all: kids.map(e => [comp(e).fill, comp(e).stroke]), onPaper: !svg.closest('.ceil-card') && getComputedStyle(svg.parentElement).backgroundColor === 'rgba(0, 0, 0, 0)' };
    });
    t.check('Lift page chart: the line green, one green dot per entry, axes grey, on the paper', ch.poly === 1 && ch.polyStroke === GREEN && ch.polyFill === 'none' && ch.dots.length === 3 && ch.dots.every(d => d === GREEN) && ch.axes.length === 2 && ch.axes.every(a => a === RING) && ch.onPaper, JSON.stringify(ch));
    t.check('Lift page chart: no clay anywhere on it (clay is "look here")', !ch.all.some(([f, s]) => CLAYS.includes(f) || CLAYS.includes(s)), JSON.stringify(ch.all));
    const rows = await p.evaluate(() => [...document.querySelectorAll('#ceil-body .ceil-row')].map(r => ({ s: r.querySelector('.ceil-row-s').textContent, kg: r.querySelector('b').textContent, x: r.querySelector('.wt-del').getAttribute('aria-label'),
      h: Math.round(r.getBoundingClientRect().height), xs: [Math.round(r.querySelector('.wt-del').getBoundingClientRect().width), Math.round(r.querySelector('.wt-del').getBoundingClientRect().height)], border: getComputedStyle(r).borderTopWidth, bg: getComputedStyle(r).backgroundColor })));
    const fmt = iso => { const d = new Date(iso + 'T00:00:00'); return d.getDate() + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]; };
    t.check('Lift page: every entry is a paper row, newest first: "5 Oct · 70 kg × 5 @ effort 8 · from your sets" and its number', rows.length === 3 && rows[0].s === `${fmt(SQUAT[2].d)} · 85 kg × 6 @ effort 7` && rows[1].s === `${fmt(SQUAT[1].d)} · 80 kg × 6 @ effort 7 · from your sets` && rows.map(r => r.kg).join() === '104 kg,98 kg,92 kg'
      && rows.every(r => r.x === 'Delete this entry' && r.h >= 64 && r.bg === 'rgba(0, 0, 0, 0)') && rows[0].border === '0px' && rows[1].border === '1px', JSON.stringify(rows));
    t.check('Lift page: each ✕ is a 44 px target', rows.every(r => r.xs[0] >= 44 && r.xs[1] >= 44), JSON.stringify(rows.map(r => r.xs)));
    t.check('Lift page: no New best band on a lift with no recent best, and the cover has no photo and no is-pr class', await p.evaluate(() => !document.querySelector('.ceil-pr') && !document.querySelector('#screen-ceiling .ceil-head.is-pr') && !document.querySelector('.ceil-gain') && getComputedStyle(document.querySelector('#screen-ceiling .ceil-head')).backgroundImage.startsWith('radial-gradient')));
    await shot(p, 'lift');
    // ✕: the first tap arms (the label says what the next does, clay text), the entry is still there; the second tap writes the tombstone
    const raw0 = await read(p, '_1rm');
    await p.click('#ceil-body .ceil-row .wt-del'); await p.waitForTimeout(200);
    const armed = await p.evaluate(() => { const b = document.querySelector('#ceil-body .ceil-row .wt-del'); return { text: b.textContent, armed: b.classList.contains('armed'), color: getComputedStyle(b).color, w: Math.round(b.getBoundingClientRect().width), h: Math.round(b.getBoundingClientRect().height), n: document.querySelectorAll('#ceil-body .ceil-row').length }; });
    t.check('✕, first tap: it arms ("Delete?", clay text, still a 44 px target) and nothing is written', armed.text === 'Delete?' && armed.armed && armed.color === CLAY_INK && armed.w >= 44 && armed.h >= 44 && armed.n === 3 && JSON.stringify(await read(p, '_1rm')) === JSON.stringify(raw0), JSON.stringify(armed));
    await shot(p, 'lift-armed');
    await p.waitForTimeout(4300);
    t.check('✕: left alone it disarms by itself after 4 s', await p.evaluate(() => { const b = document.querySelector('#ceil-body .ceil-row .wt-del'); return b.textContent === '✕' && !b.classList.contains('armed'); }));
    await p.click('#ceil-body .ceil-row .wt-del'); await p.click('#ceil-body .ceil-row .wt-del'); await p.waitForTimeout(450);
    const raw1 = await read(p, '_1rm'), gone = SQUAT[2];
    const tomb = raw1.filter(e => e.del);
    t.check('✕, second tap: writes a tombstone {lift, d, del: true, t} for that day and keeps every other entry as it was',
      tomb.length === 1 && JSON.stringify(Object.keys(tomb[0]).sort()) === JSON.stringify(['d', 'del', 'lift', 't']) && tomb[0].lift === gone.lift && tomb[0].d === gone.d && tomb[0].del === true && typeof tomb[0].t === 'number'
        && raw1.length === raw0.length && raw1.filter(e => !e.del).every(e => raw0.some(o => JSON.stringify(o) === JSON.stringify(e))) && !raw1.some(e => e.lift === gone.lift && e.d === gone.d && !e.del), JSON.stringify(raw1));
    const c2 = await p.evaluate(COVER);
    t.check('...and the page redraws with two entries (the cover says +6 over 2), the lift still open', JSON.stringify(c2.cells) === JSON.stringify([['98', 'KG ESTIMATE'], ['+6', 'KG SINCE FIRST'], ['2', 'ENTRIES']]) && c2.title === 'Barbell Back Squat', JSON.stringify(c2));
    await ctx.close();
  }
  // the New best band: only on the lift that earned it, only for a week, as the cover's green foot
  for (const [label, best, want] of [
    ['a fresh best', { lift: 'Barbell Back Squat', kg: 104, prev: 98, d: day(2), t: Date.now() - 2 * DAY, i: 0 }, true],
    ['a best older than a week', { lift: 'Barbell Back Squat', kg: 104, prev: 98, d: day(9), t: Date.now() - 8 * DAY, i: 0 }, false],
    ['a best on another lift', { lift: 'Dumbbell Bulgarian Split Squat', kg: 40, prev: 30, d: day(2), t: Date.now() - 2 * DAY, i: 0 }, false],
  ]) {
    const { ctx, p } = await H.openProgram(browser, { seed: { _1rm: LIFTS, _hab_wt: WEIGHT4, _ceil_best: best } });
    await p.evaluate("renderCeilingLift('Barbell Back Squat')"); await p.waitForTimeout(450);
    const b = await p.evaluate(() => {
      const band = document.querySelector('#ceil-body .ceil-pr'); if (!band) return null;
      const head = document.querySelector('#screen-ceiling .ceil-head'), k = band.querySelector('.ceil-pr-k'), tx = band.querySelector('.ceil-pr-t'), kc = getComputedStyle(k), dot = getComputedStyle(k, '::before');
      return { eyebrow: k.textContent, eyeColor: kc.color, eyeFont: kc.fontFamily.slice(0, 10), dot: dot.backgroundColor, text: tx.textContent, textFont: getComputedStyle(tx).fontFamily.split(',')[0], textWeight: getComputedStyle(tx).fontWeight, textSize: getComputedStyle(tx).fontSize, bg: getComputedStyle(band).backgroundImage.slice(0, 16),
        color: getComputedStyle(tx).color, touches: Math.abs(band.getBoundingClientRect().top - head.getBoundingClientRect().bottom) <= 1, first: document.querySelector('#ceil-body').firstElementChild === band };
    });
    if (want) {
      t.check(`New best band (${label}): a green band that is the cover's foot, a mint eyebrow with a dot, "6 kg over your last best" in 44 px Barlow Condensed capitals`,
        !!b && b.eyebrow === 'New best' && b.eyeColor === MINT && /Space Mon/.test(b.eyeFont) && b.dot === 'rgb(109, 190, 149)' && b.text === '6 kg over your last best' && /Barlow Condensed/.test(b.textFont) && b.textWeight === '900' && b.textSize === '44px'
          && b.bg === 'radial-gradient(' && b.color === 'rgb(255, 255, 255)' && b.touches && b.first, JSON.stringify(b));
      await shot(p, 'lift-newbest');
    } else t.check(`New best band (${label}): none`, b === null, JSON.stringify(b));
    await ctx.close();
  }

  // ── 7. Body weight: the cover, today's box and Weigh in, the chips, the chart, the readings ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: { _hab_wt: WEIGHT5 } });
    await p.evaluate("goTo('weight')"); await p.waitForTimeout(450);
    const c = await p.evaluate(COVER);
    t.check('Body weight cover: the eyebrow "Your numbers", the title "Body Weight"', c.kick === 'Your numbers' && c.title === 'Body Weight', JSON.stringify([c.kick, c.title]));
    // 1 month: all readings inside 30 days are used (day 33 is outside); the average-against-average change is worked out by the page's own function
    const want = await p.evaluate(() => { const all = bodyWeightSeries(), from = new Date(); from.setDate(from.getDate() - _wtRange); const win = all.filter(e => new Date(e.d + 'T00:00:00') >= from), use = win.length >= 2 ? win : all; return { ch: wtChange(use), last: all[all.length - 1], n: all.length }; });
    const dir = want.ch.delta === 0 ? 'Level' : want.ch.delta > 0 ? 'Up' : 'Down', sign = want.ch.delta > 0 ? '+' : want.ch.delta < 0 ? '−' : '';
    t.check('Body weight cover: the scoreboard is the last weight (79.6 kg · LAST WEIGHED …), the change over the range, the readings (5 · READINGS)',
      c.cells.length === 3 && c.cells[0][0] === '79.6 kg' && /^LAST WEIGHED \d+ [A-Z]{3}$/.test(c.cells[0][1]) && c.cells[1][0] === `${sign}${Math.abs(want.ch.delta)} kg` && c.cells[1][1] === `${dir.toUpperCase()} OVER THE RANGE` && c.cells[2][0] === '5' && c.cells[2][1] === 'READINGS', JSON.stringify(c.cells));
    t.check('Body weight cover: the sentence it showed on the green card is the line under the scoreboard', c.line === `${dir} ${Math.abs(want.ch.delta)} kg over this range, comparing average to average.`, c.line);
    const hero = await p.evaluate(() => ['.ceil-hero', '.ceil-hero-v', '.wt-entry-card'].filter(s => document.querySelector('#screen-weight ' + s)));
    t.check('Body weight: the green hero card is gone', hero.length === 0, hero.join());
    const wt = await p.evaluate(() => {
      const e = document.querySelector('#wt-body .wt-entry'), i = document.getElementById('wt-input'), ic = getComputedStyle(i), b = document.querySelector('#wt-body .wt-save'), bc = getComputedStyle(b), ec = getComputedStyle(e);
      const sibs = [...document.querySelectorAll('#wt-body > *')].map(x => x.className.split(' ')[0]);
      return { card: [ec.backgroundColor, ec.borderTopWidth, ec.boxShadow].join('|'), label: e.querySelector('.wt-entry-l').textContent, input: [ic.height, ic.borderTopWidth, ic.borderTopColor, ic.borderTopLeftRadius, ic.backgroundColor, ic.fontSize, ic.textAlign, ic.fontFamily.slice(0, 6), ic.fontWeight].join('|'),
        ph: i.placeholder, btn: [(c => { if (c.backgroundImage === 'none') return c.backgroundColor; const e = document.createElement('i'); e.style.backgroundImage = 'var(--btn)'; document.body.appendChild(e); const v = getComputedStyle(e).backgroundImage; e.remove(); return c.backgroundImage === v ? 'BTN' : c.backgroundImage; })(bc), bc.color, bc.borderTopLeftRadius, bc.fontFamily.split(',')[0], bc.fontWeight, bc.textTransform].join('|'), btnH: Math.round(b.getBoundingClientRect().height), btnText: b.textContent, sibs };
    });
    t.check('Body weight: today\'s weight sits on the paper with no card around the box and Weigh in', wt.card === 'rgba(0, 0, 0, 0)|0px|none' && wt.label === "Today's weight", wt.card);
    t.check('Body weight: the box is the set table\'s (white, edged --field, 10 px corners, 48 px, Barlow 500 at 16 px, centred) and Weigh in is the primary green button, 48 px',
      wt.input === `48px|1px|${FIELD}|10px|rgb(255, 255, 255)|16px|center|Barlow|500` && wt.ph === 'kg' && wt.btn === 'BTN|rgb(255, 255, 255)|8px|"Barlow Condensed"|700|uppercase' && wt.btnH >= 44 && wt.btnText === 'Weigh in', JSON.stringify(wt));
    t.check('Body weight: the order is today\'s weight, the range chips, the chart, "Every reading", the readings, the note, Delete all', wt.sibs.join(' ') === 'wt-entry wt-chips ceil-chartwrap prog-sec ceil-rows ceil-note wt-clear', wt.sibs.join(' '));
    const chart = await p.evaluate(() => { const svg = document.querySelector('#wt-body .ceil-chart'), comp = e => getComputedStyle(e);
      return { dots: [...svg.querySelectorAll('circle')].map(e => comp(e).fill), line: comp(svg.querySelector('polyline')).stroke, axes: [...svg.querySelectorAll('.ceil-axis')].map(e => comp(e).stroke), clay: [...svg.children].some(e => ['rgb(199, 85, 47)', 'rgb(224, 107, 67)'].includes(comp(e).fill) || ['rgb(199, 85, 47)', 'rgb(224, 107, 67)'].includes(comp(e).stroke)) }; });
    t.check('Body weight chart: the 7-day average line green, every raw dot green (they were clay), axes grey, no clay', chart.dots.length >= 2 && chart.dots.every(d => d === GREEN) && chart.line === GREEN && chart.axes.every(a => a === RING) && !chart.clay, JSON.stringify(chart));
    const rows = await p.evaluate(() => [...document.querySelectorAll('#wt-body .wt-row')].map(r => [r.querySelector('.wt-row-d').textContent, r.querySelector('b').textContent, Math.round(r.getBoundingClientRect().height), getComputedStyle(r).borderTopWidth, r.querySelector('.wt-del').getAttribute('aria-label')]));
    t.check('Body weight: "Every reading" is a green section title and the readings are paper rows, newest first, each with a ✕', (await p.evaluate(() => document.querySelector('#wt-body .prog-sec').textContent)) === 'Every reading' && rows.length === 5 && rows.map(r => r[1]).join() === '79.6 kg,80 kg,80.2 kg,80.6 kg,81.4 kg' && rows.every(r => r[2] >= 64 && r[4] === 'Delete this reading') && rows[0][3] === '0px' && rows[1][3] === '1px', JSON.stringify(rows));
    const del = await p.evaluate(() => { const d = document.querySelector('#wt-body .wt-clear'), c = getComputedStyle(d); return { text: d.textContent, color: c.color, bg: c.backgroundColor, border: c.borderTopWidth, h: Math.round(d.getBoundingClientRect().height), last: document.querySelector('#wt-body').lastElementChild === d, onclick: d.getAttribute('onclick') }; });
    t.check('Body weight: "Delete all my weight history" is quiet clay text at the end (no box, no dashes)', del.text === 'Delete all my weight history' && del.color === CLAY_INK && del.bg === 'rgba(0, 0, 0, 0)' && del.border === '0px' && del.h >= 44 && del.last && del.onclick === 'confirmClearWeight(this)', JSON.stringify(del));
    await shot(p, 'weight-data');

    // the range chips: ONE pill style, their own class, the selected one green filled
    const chips = () => p.evaluate(() => [...document.querySelectorAll('#wt-body .wt-chips button')].map(b => { const c = getComputedStyle(b), r = b.getBoundingClientRect(); return { text: b.textContent, cls: b.className, pressed: b.getAttribute('aria-pressed'), bg: c.backgroundColor, color: c.color, radius: c.borderTopLeftRadius, pad: c.padding, h: Math.round(r.height), w: Math.round(r.width) }; }));
    let ch = await chips();
    t.check('Range chips: 7 days · 1 month · 3 months, the selected one (1 month) green filled with white text, the others white pills; their own class, none called chip',
      ch.map(c => c.text).join() === '7 days,1 month,3 months' && ch.map(c => c.pressed).join() === 'false,true,false' && ch[1].bg === GREEN && ch[1].color === 'rgb(255, 255, 255)' && ch[0].bg === 'rgb(255, 255, 255)' && ch[2].bg === 'rgb(255, 255, 255)' && ch.every(c => c.radius === '999px' && c.h >= 44 && /(^| )wt-chip( |$)/.test(c.cls) && !/(^| )chip( |$)/.test(c.cls)), JSON.stringify(ch));
    t.check('Range chips: three equal pills', Math.max(...ch.map(c => c.w)) - Math.min(...ch.map(c => c.w)) <= 1, JSON.stringify(ch.map(c => c.w)));
    // D6: another global .chip rule must not touch them (the app has two, and the second used to restyle these by accident)
    const before = ch.map(c => [c.pad, c.radius, c.bg, c.h].join('|'));
    await p.addStyleTag({ content: '.chip, body[data-dark] .chip, .chip-on, .chip.yellow { padding: 31px 7px !important; border-radius: 0 !important; background: rgb(255, 0, 0) !important; }' });
    const hostile = (await chips()).map(c => [c.pad, c.radius, c.bg, c.h].join('|'));
    t.check('Range chips (D6): a .chip rule anywhere changes none of their padding, corners, fill or height', JSON.stringify(hostile) === JSON.stringify(before), JSON.stringify([before, hostile]));
    await p.click('.wt-chips button:has-text("7 days")'); await p.waitForTimeout(300);
    ch = await chips();
    const c7 = await p.evaluate(COVER);
    t.check('Range chips: 7 days switches the selection (aria-pressed and the green fill), the range becomes 7 and the cover follows',
      ch.map(c => c.pressed).join() === 'true,false,false' && ch[0].bg === GREEN && ch[1].bg === 'rgb(255, 255, 255)' && (await p.evaluate(() => _wtRange)) === 7 && c7.cells.length === 3 && c7.line && /over this range/.test(c7.line), JSON.stringify([ch.map(c => c.pressed), c7.line]));
    await p.click('.wt-chips button:has-text("3 months")'); await p.waitForTimeout(300);
    ch = await chips();
    const c90 = await p.evaluate(COVER);
    const all90 = await p.evaluate(() => { const s = bodyWeightSeries(), d = wtChange(s).delta; return d; });
    t.check('Range chips: 3 months takes every reading (the change is the page\'s own average-against-average over all five)', ch.map(c => c.pressed).join() === 'false,false,true' && c90.cells[1][0] === `${all90 > 0 ? '+' : all90 < 0 ? '−' : ''}${Math.abs(all90)} kg` && c90.cells[2][0] === '5', JSON.stringify([ch.map(c => c.pressed), c90.cells]));
    await p.click('.wt-chips button:has-text("1 month")'); await p.waitForTimeout(250);

    // Weigh in: the same write as before, one reading a day, and Progress's row follows
    const w0 = await read(p, '_hab_wt'), today = ymd(new Date());
    await p.click('.wt-save'); await p.waitForTimeout(200);
    t.check('Weigh in with an empty box writes nothing and puts the cursor in the box', JSON.stringify(await read(p, '_hab_wt')) === JSON.stringify(w0) && (await p.evaluate(() => document.activeElement.id)) === 'wt-input');
    await p.fill('#wt-input', '78.5'); await p.click('.wt-save'); await p.waitForTimeout(350);
    const w1 = await read(p, '_hab_wt');
    t.check('Weigh in writes <id>_hab_wt[today] = {kg: 78.5, t} and leaves every other day exactly as it was',
      JSON.stringify(Object.keys(w1[today]).sort()) === JSON.stringify(['kg', 't']) && w1[today].kg === 78.5 && typeof w1[today].t === 'number' && Math.abs(w1[today].t - Date.now()) < 20000 && Object.keys(w0).every(k => JSON.stringify(w0[k]) === JSON.stringify(w1[k])) && Object.keys(w1).length === Object.keys(w0).length + 1, JSON.stringify(w1[today]));
    t.check('...the screen shows it first, and the cover\'s last weight is 78.5 kg', (await p.evaluate(COVER)).cells[0][0] === '78.5 kg' && (await pageText(p, '#wt-body .wt-row')).startsWith((await p.evaluate(() => fmtCeilDate(ceilingToday()))).toUpperCase()));
    await p.fill('#wt-input', '78.9'); await p.click('.wt-save'); await p.waitForTimeout(300);
    const w2 = await read(p, '_hab_wt');
    t.check('One reading a day: weighing in again the same day replaces it (78.9), it does not add a second', w2[today].kg === 78.9 && Object.keys(w2).length === Object.keys(w1).length && (await p.evaluate(() => document.querySelectorAll('#wt-body .wt-row').length)) === 6, JSON.stringify(w2[today]));
    await p.evaluate("goTo('plan')"); await p.waitForTimeout(300);
    t.check('Progress\'s Body weight row shows the new weight', await p.evaluate(() => /78\.9\s*kg/.test(document.querySelector('#weight-row-wrap').innerText)));
    await p.evaluate("goTo('weight')"); await p.waitForTimeout(300);

    // ✕: two taps, a tombstone
    await p.click('#wt-body .wt-row .wt-del'); await p.waitForTimeout(200);
    const wa = await p.evaluate(() => { const b = document.querySelector('#wt-body .wt-row .wt-del'); return { text: b.textContent, armed: b.classList.contains('armed'), color: getComputedStyle(b).color }; });
    t.check('A reading\'s ✕, first tap: it arms ("Delete?" in clay text) and nothing is written', wa.text === 'Delete?' && wa.armed && wa.color === CLAY_INK && JSON.stringify(await read(p, '_hab_wt')) === JSON.stringify(w2), JSON.stringify(wa));
    await p.click('#wt-body .wt-row .wt-del'); await p.waitForTimeout(350);
    const w3 = await read(p, '_hab_wt');
    t.check('...the second tap writes a tombstone {kg: null, t} for that day (never a removed key) and the other days stay', w3[today] && w3[today].kg === null && typeof w3[today].t === 'number' && w3[today].t >= w2[today].t && Object.keys(w3).length === Object.keys(w2).length && Object.keys(w0).every(k => JSON.stringify(w0[k]) === JSON.stringify(w3[k])), JSON.stringify(w3[today]));

    // Delete all: two taps
    await p.click('#wt-body .wt-clear'); await p.waitForTimeout(200);
    const da = await p.evaluate(() => ({ text: document.querySelector('#wt-body .wt-clear').textContent, rows: document.querySelectorAll('#wt-body .wt-row').length }));
    t.check('Delete all, first tap: it asks again ("Tap again to delete every reading") and nothing is deleted', da.text === 'Tap again to delete every reading' && da.rows === 5 && JSON.stringify(await read(p, '_hab_wt')) === JSON.stringify(w3), JSON.stringify(da));
    await p.click('#wt-body .wt-clear'); await p.waitForTimeout(400);
    const w4 = await read(p, '_hab_wt');
    t.check('Delete all, second tap: every day is tombstoned ({kg: null, t}), no key is removed, and the screen is the empty one', Object.keys(w4).length === Object.keys(w3).length && Object.values(w4).every(v => v.kg === null && typeof v.t === 'number')
      && (await p.evaluate(() => document.querySelectorAll('#wt-body .wt-row').length)) === 0 && /Nothing logged yet\./.test(await pageText(p, '#wt-body')) && (await p.evaluate(COVER)).boardHidden, JSON.stringify(Object.values(w4).slice(0, 2)));
    t.check('no page errors (Body weight)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // Delete all disarms by itself
    const { ctx, p } = await H.openProgram(browser, { seed: { _hab_wt: WEIGHT4 } });
    await p.evaluate("goTo('weight')"); await p.waitForTimeout(350);
    await p.click('#wt-body .wt-clear'); await p.waitForTimeout(4300);
    t.check('Delete all: left alone it goes back to its own words after 4 s', (await p.evaluate(() => document.querySelector('#wt-body .wt-clear').textContent)) === 'Delete all my weight history' && Object.values(await read(p, '_hab_wt')).every(v => v.kg > 0));
    await ctx.close();
  }
  {
    // Body weight empty: the cover has no scoreboard, the sentence, the box and Weigh in, then "Nothing logged yet."
    const { ctx, p } = await H.openProgram(browser, { seed: {} });
    await p.evaluate("goTo('weight')"); await p.waitForTimeout(450);
    const e = await p.evaluate(() => ({ cover: [document.querySelector('#screen-weight .ceil-board').hidden, document.querySelector('#screen-weight .ceil-line').hidden], order: [...document.querySelectorAll('#wt-body > *')].map(x => x.className.split(' ')[0]),
      intro: document.querySelector('#wt-body .ceil-intro').textContent.replace(/\s+/g, ' ').trim(), nothing: document.querySelector('#wt-body .ceil-empty strong').textContent, input: !!document.getElementById('wt-input'), save: document.querySelector('.wt-save').textContent,
      note: document.querySelector('#wt-body .ceil-empty p + p').textContent.replace(/\s+/g, ' ').trim(), chips: document.querySelectorAll('#wt-body .wt-chip').length }));
    t.check('Body weight empty: no scoreboard, the sentence, the box and Weigh in, then "Nothing logged yet." and its line, all on the paper',
      e.cover[0] && e.cover[1] && e.order.join(' ') === 'ceil-intro wt-entry ceil-empty' && /^Your weight over time\. Weigh yourself at the same time of day, ideally first thing, and the line means something\.$/.test(e.intro) && e.nothing === 'Nothing logged yet.' && e.input && e.save === 'Weigh in'
        && /^One reading is just a number\. A few over a few weeks is the trend, and the trend is the part worth having\.$/.test(e.note) && e.chips === 0, JSON.stringify(e));
    await shot(p, 'weight-empty');
    // the first weigh-in from the empty screen
    await p.fill('#wt-input', '82.3'); await p.click('.wt-save'); await p.waitForTimeout(350);
    const w = await read(p, '_hab_wt');
    t.check('The first weigh-in from the empty screen writes {kg: 82.3, t} for today and shows the cover with a single reading', JSON.stringify(Object.keys(w)) === JSON.stringify([ymd(new Date())]) && w[ymd(new Date())].kg === 82.3 && (await p.evaluate(COVER)).cells.map(c => c[0]).join() === '82.3 kg,—,1' && (await p.evaluate(COVER)).line === null, JSON.stringify(await p.evaluate(COVER)));
    await ctx.close();
  }

  // ── 8. ← and Back, one step at a time (home-progress.js checks the landing on Progress; this checks the steps inside) ──
  {
    const { ctx, p } = await H.openProgram(browser, { seed: NUM });
    await p.evaluate("goTo('plan')"); await p.waitForTimeout(300);
    await p.click('#ceiling-row-wrap .hrow'); await p.waitForTimeout(400);
    await p.click('#ceil-body .ceil-lift'); await p.waitForTimeout(400);
    t.check('Records → a lift: the lift\'s page', (await p.evaluate(() => document.getElementById('ceil-title').textContent)) === 'Barbell Back Squat');
    await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(350);
    t.check('← from a lift goes to the list (and the list\'s cover is back, with its scoreboard)', (await p.evaluate(COVER)).title === 'Personal Records' && (await p.evaluate(COVER)).cells.length === 3 && (await active(p)) === 'screen-ceiling');
    await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(350);
    t.check('← from the list goes to Progress', (await active(p)) === 'screen-plan');
    await p.evaluate("goTo('ceiling')"); await p.waitForTimeout(250);
    await p.evaluate("renderCeilingLiftAt(0)"); await p.waitForTimeout(250);
    await p.goBack(); await p.waitForTimeout(500);
    t.check('the phone\'s Back from a lift goes to the list, one step', (await active(p)) === 'screen-ceiling' && (await p.evaluate(() => document.getElementById('ceil-title').textContent)) === 'Personal Records');
    t.check('no page errors (Records navigation)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 9. every state at 320, 375 and 390, light and dark: no sideways scroll, every control 44 px or more, the initials button over no text ──
  const STATES = [
    ['Records, lifts', NUM, null, "goTo('ceiling')"],
    ['Records, How this works open', NUM, null, "goTo('ceiling'); document.querySelector('.ceil-help').open = true"],
    ['Records, no body weight', { _1rm: LIFTS }, null, "goTo('ceiling')"],
    ['Records, empty', {}, null, "goTo('ceiling')"],
    ['Records, retest', { _1rm: [Object.assign({}, SQUAT[0], { d: day(40), t: Date.now() - 40 * DAY })], _hab_wt: WEIGHT4 }, retestProg, "goTo('ceiling')"],
    ['a lift', NUM, null, "renderCeilingLift('Barbell Back Squat')"],
    ['a lift, New best', Object.assign({ _ceil_best: { lift: 'Barbell Back Squat', kg: 104, prev: 98, d: day(2), t: Date.now() - 2 * DAY, i: 0 } }, NUM), null, "renderCeilingLift('Barbell Back Squat')"],
    ['a lift, ✕ armed', NUM, null, "renderCeilingLift('Barbell Back Squat'); document.querySelector('.ceil-row .wt-del').click()"],
    ['Log a max, the picker', NUM, null, 'openCeilingAdd()'],
    ['Log a max, the form', NUM, null, `openCeilingForm(ceilingCandidates().findIndex(c => c.name === 'Barbell Back Squat')); document.getElementById('cf-kg').value = '100'; document.getElementById('cf-rp').value = '5'; document.querySelector('.cf-rpe .rpe-btn[data-rpe="8"]').click()`],
    ['Log a max, the form, empty', NUM, null, `openCeilingForm(ceilingCandidates().findIndex(c => c.name === 'Barbell Back Squat'))`],
    ['Body weight, with readings', { _hab_wt: WEIGHT5 }, null, "goTo('weight')"],
    ['Body weight, a reading ✕ armed', { _hab_wt: WEIGHT5 }, null, "goTo('weight'); document.querySelector('.wt-row .wt-del').click()"],
    ['Body weight, empty', {}, null, "goTo('weight')"],
  ];
  for (const [w, h, dark] of [[320, 568, false], [375, 667, false], [390, 844, false], [320, 568, true], [375, 667, true], [390, 844, true]]) {
    const bad = { sideways: [], small: [], overlap: [], errs: [] };
    for (const [name, seed, prog, go] of STATES) {
      const { ctx, p } = await H.openProgram(browser, { w, h, dark, seed, prog: prog ? prog() : undefined });
      await p.evaluate(go); await p.waitForTimeout(400);
      if ((await sideways(p)) > 0) bad.sideways.push(name);
      const small = await p.evaluate(SMALL_CONTROLS); if (small.length) bad.small.push(name + ' ' + JSON.stringify(small));
      const ov = await p.evaluate(OVERLAP); if (ov.hidden || ov.hits.length) bad.overlap.push(name + ' ' + JSON.stringify(ov));
      if (p.errs.length) bad.errs.push(name + ' ' + p.errs.join(' | '));
      await ctx.close();
    }
    const tag = `${w} px${dark ? ' dark' : ''}`;
    t.check(`${tag}: no sideways scroll on any Records or Body weight state`, bad.sideways.length === 0, bad.sideways.join(' | '));
    t.check(`${tag}: every control is 44 px or more in both directions`, bad.small.length === 0, bad.small.join(' | '));
    t.check(`${tag}: the initials button overlaps no text`, bad.overlap.length === 0, bad.overlap.join(' | '));
    t.check(`${tag}: no page errors`, bad.errs.length === 0, bad.errs.join(' | '));
  }

  // ── 10. dark mode wears the same tokens: green text and the cover read in dark ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, dark: true, seed: Object.assign({ _ceil_best: { lift: 'Barbell Back Squat', kg: 104, prev: 98, d: day(2), t: Date.now() - 2 * DAY, i: 0 } }, NUM) });
    await p.evaluate("renderCeilingLift('Barbell Back Squat')"); await p.waitForTimeout(400);
    const d = await p.evaluate(() => { const svg = document.querySelector('#ceil-body .ceil-chart'), cs = e => getComputedStyle(e); return { dots: [...svg.querySelectorAll('circle')].map(e => cs(e).fill), sec: cs(document.querySelector('#ceil-body .prog-sec')).color, bg: cs(document.body).backgroundColor, cover: cs(document.querySelector('#screen-ceiling .ceil-head')).backgroundImage.slice(0, 16) }; });
    t.check('dark: the chart dots and the section title are the dark green, the cover is the dark gradient on the dark paper', d.dots.every(x => x === GREEN_DARK) && d.sec === GREEN_DARK && d.bg === 'rgb(24, 24, 24)' && d.cover === 'radial-gradient(', JSON.stringify(d));
    await p.evaluate("goTo('weight')"); await p.waitForTimeout(350);
    const chips = await p.evaluate(() => [...document.querySelectorAll('#wt-body .wt-chip')].map(b => [b.getAttribute('aria-pressed'), getComputedStyle(b).backgroundColor]));
    t.check('dark: the selected range chip is the dark mode\'s selected green (--mark), the others the dark row', chips[1][0] === 'true' && chips[1][1] === 'rgb(27, 114, 84)' && chips[0][1] === 'rgb(36, 36, 36)', JSON.stringify(chips));
    await ctx.close();
  }

  // ── 11. the CSS: one block before CENTRE COURT, headed as the brief says, declaring no colour or any other custom property, only --fs sizes ──
  {
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'program.html'), 'utf8').replace(/\r\n/g, '\n');
    const head = '/* ══ RECORDS AND BODY WEIGHT IN THE CENTRE COURT LOOK (2026-10-13) ';
    const i = src.indexOf(head), k = src.indexOf('/* ══ COACH IN THE CENTRE COURT LOOK');
    const j = src.indexOf('/* ══ ', i + head.length);   // the next block's header (SHEETS AND NOTICES, then CENTRE COURT)
    const block = i > 0 ? src.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, '') : '';
    t.check('CSS: ONE block headed "RECORDS AND BODY WEIGHT IN THE CENTRE COURT LOOK (2026-10-13)", after the COACH block and immediately before the next block (SHEETS AND NOTICES, then CENTRE COURT)', i > 0 && k > 0 && k < i && j > i && src.split(head).length === 2 && /^\s*$/.test(src.slice(j - 3, j)), [k, i, j].join());
    const decl = block.match(/(^|[;{\s])--[a-z0-9-]+\s*:/g) || [];
    t.check('CSS: the block declares no custom property (no colour token of its own), and no hex colour but white', decl.length === 0 && !(block.match(/#[0-9a-fA-F]{3,8}\b/g) || []).some(h => !/^#fff$/i.test(h)), JSON.stringify(decl.concat(block.match(/#[0-9a-fA-F]{3,8}\b/g) || []).slice(0, 8)));
    t.check('CSS: the old rules are gone (no .ceil-hero, .ceil-card, .ceil-add, .chip-on, .is-pr in the sheet or the script)', !/\.ceil-hero|\.ceil-card|\.ceil-add\b|\.chip-on|\bis-pr\b|ceil-gain/.test(src), (src.match(/\.ceil-hero|\.ceil-card|\.ceil-add\b|\.chip-on|\bis-pr\b|ceil-gain/g) || []).join());
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
