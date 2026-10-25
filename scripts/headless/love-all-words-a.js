// Plain Words, Group A: the exercise card (2026-10-25, Amir: "Go with your picks. Change RPE to effort everywhere."):
//   rpe     every athlete-facing "RPE" is "Effort": the card line "Effort 7/10", the tag, the session bar, Guided, History, the guide, the manual
//   tempo   the card line says "Down 3 s" (or "Down 3 s · pause 1 s"); an X or 0 for the lowering leaves it out
//   rest    "Rest 2 min" / "Rest 90 s" / "Rest 30 s" on the card line and the Rest button
//   last    the set row's grey "Last time 7 reps · 8/10" (a weight only: "Last time 60 kg")
//   orange  the first time something shows orange for this athlete, one fading note
//   rounds  "Twice · rest 30 s between" / "3 times · rest 30 s between"
//   side    "20 s each side", "6 each side", and a fading "Log one side." the first time a one-sided card opens
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-words-a.js
'use strict';
const H = require('./lib');
const t = H.checker();

const loc = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

// The fixture, with this week's note capped at 7 (so the session bar has its limits row).
function noted() {
  const P = H.fixture();
  const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() - 3);
  const e = new Date(s); e.setDate(e.getDate() + 34);
  P.cycles[1].startDate = loc(s); P.cycles[1].endDate = loc(e);
  P.cycles[1].weekNotes = { '1': { text: 'Keep every set at RPE 7 or under this week.', rpeCap: 7 } };
  return P;
}

// The text an athlete can read on the open screen: what is drawn, plus every aria-label and title.
const readScreen = p => p.evaluate(() => {
  const root = document.querySelector('.screen.active') || document.body;
  const names = [...root.querySelectorAll('[aria-label],[title]')].map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || ''));
  return root.innerText + '\n' + names.join('\n');
});
const around = (txt, re) => (txt.match(new RegExp('.{0,30}' + re.source + '.{0,30}')) || [''])[0];
const cardOf = (p, nm) => p.evaluate(nm => {
  const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
  return c && c.querySelector('.ex-numline') ? c.querySelector('.ex-numline').innerText.replace(/\s+/g, ' ').trim() : null;
}, nm);
const openCard = (p, nm) => p.evaluate(nm => {
  const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
  if (c && c.classList.contains('collapsed')) toggleExpand(c);
}, nm);

// ═════════ rpe ═════════
async function rpe(browser) {
  const { ctx, p } = await H.openProgram(browser, { prog: noted() });
  await p.waitForTimeout(500);

  // Home, Progress, Library, Coach, the manual and the Personal Records page: no RPE in what is drawn or named
  for (const [name, go] of [['Home', null], ['Progress', "goTo('plan')"], ['Library', "goTo('workouts')"], ['Coach', "goTo('notes')"], ['Records', "goTo('ceiling')"], ['the manual', "openSystemGuide()"]]) {
    if (go) await p.evaluate(go);
    await p.waitForTimeout(350);
    const txt = await readScreen(p);
    t.check(`rpe: no "RPE" on ${name}`, !/\bRPEs?\b/.test(txt), around(txt, /\bRPEs?\b/));
  }
  // the week note on Home is Amir's own text, "RPE 7": it reads effort
  await p.evaluate("goTo('home')");
  await p.waitForTimeout(250);
  const wn = await p.evaluate(() => { const w = document.querySelector('.week-note'); return w ? w.innerText.replace(/\s+/g, ' ') : ''; });
  t.check('rpe: Home\'s week note reads "effort 7", not RPE (the note on the server says RPE)', /effort 7/i.test(wn) && !/RPE/.test(wn), wn);

  // the help guide: the effort card says what it means, in Amir's words, without the word RPE
  await p.evaluate("openHelp('rpe')");
  await p.waitForTimeout(350);
  const help = await p.evaluate(() => { const o = document.getElementById('hist-overlay'); const open = o.querySelector('.note-card.open'); return { all: o.innerText + '\n' + [...o.querySelectorAll('[aria-label]')].map(e => e.getAttribute('aria-label')).join('\n'), open: open ? open.innerText.replace(/\s+/g, ' ') : '' }; });
  t.check('rpe: the help guide has no "RPE" anywhere', !/\bRPEs?\b/.test(help.all), around(help.all, /\bRPEs?\b/));
  t.check('rpe: the open help card says what effort means', /How hard it was, out of 10\. 10 means no reps left\. 8 means two left\./.test(help.open), help.open.slice(0, 200));
  await p.evaluate("document.getElementById('hist-overlay').classList.remove('visible')");

  // the day: the card line, the pill row, the set row's tag
  await p.evaluate("openDayView('1')");
  await p.waitForTimeout(400);
  const line = await cardOf(p, 'Barbell Back Squat');
  t.check('rpe: the squat\'s card line says "Effort 7/10"', /Effort 7\/10/.test(line) && !/RPE/.test(line), line);
  await openCard(p, 'Barbell Back Squat');
  await p.waitForTimeout(500);
  // tick set 1 with a tap on its circle, then tap 8 in the strip that opens
  await p.click('#day-view .checklist-item:not(.collapsed) .ex-set-row[data-set-idx="0"] .ex-set-check');
  await p.waitForTimeout(300);
  await p.click('#day-view .checklist-item:not(.collapsed) .ex-set-row[data-set-idx="0"] .rpe-btn[data-rpe="8"]');
  await p.waitForTimeout(400);
  const tag = await p.evaluate(() => {
    const g = document.querySelector('#day-view .checklist-item:not(.collapsed) .ex-set-row[data-set-idx="0"] .ex-set-rpetag');
    const r = g.getBoundingClientRect(), row = g.closest('.ex-set-row').getBoundingClientRect(), tick = g.closest('.ex-set-row').querySelector('.ex-set-check').getBoundingClientRect();
    return { text: g.textContent, label: g.getAttribute('aria-label'), inRow: r.left >= row.left - 1 && r.right <= row.right + 1, clear: r.right <= tick.left + 1, w: Math.round(r.width), over: g.scrollWidth > g.clientWidth + 1 };
  });
  t.check('rpe: the ticked set\'s tag says "Effort 8", and sits inside its row clear of the tick', tag.text === 'Effort 8' && /^Effort 8/.test(tag.label) && tag.inRow && tag.clear, JSON.stringify(tag));
  const day = await readScreen(p);
  t.check('rpe: the open day has no "RPE" in its words or names', !/\bRPEs?\b/.test(day), around(day, /\bRPEs?\b/));
  const bar = await p.evaluate(() => { const w = document.querySelector('.session-timer-week'); return w ? w.innerText.replace(/\s+/g, ' ').trim() : null; });
  t.check('rpe: the session bar in a noted week says "Max effort 7"', /Max effort 7/i.test(bar || ''), bar);

  // History, through the card's own sheet
  await p.evaluate(() => { const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat'); openHistorySheet(c); });
  await p.waitForTimeout(400);
  const hist = await p.evaluate(() => document.getElementById('hist-overlay').innerText);
  t.check('rpe: History says "Effort", never RPE', /Effort \d/i.test(hist) && !/\bRPE\b/i.test(hist), hist.replace(/\s+/g, ' ').slice(0, 220));
  await p.evaluate("document.getElementById('hist-overlay').classList.remove('visible')");

  // Guided: the rest screen's strip is labelled Effort, and so is its limits row
  await p.evaluate(() => { openStepMode('1'); });
  await p.waitForTimeout(350);
  await p.evaluate(() => { if (STEP && STEP.seq[STEP.pos].group) stepPrimary(); });
  await p.waitForTimeout(250);
  await p.click('#step-footer .step-primary-btn');
  await p.waitForTimeout(600);
  const g = await p.evaluate(() => ({
    lab: [...document.querySelectorAll('.tl-lab')].map(e => e.textContent.trim()),
    keys: [...document.querySelectorAll('.tl-rpe-btn')].map(b => b.getAttribute('aria-label')),
    week: [...document.querySelectorAll('.session-timer-week')].map(e => e.innerText.replace(/\s+/g, ' ').trim()),
    all: [...document.querySelectorAll('#stepOverlay, #setsOverlay')].map(e => e.innerText).join('\n') }));
  t.check('rpe: Guided\'s rest screen labels its strip "Effort" and names its keys "Effort N"', g.lab.includes('Effort') && g.keys.length === 5 && g.keys[1] === 'Effort 7', JSON.stringify([g.lab, g.keys]));
  t.check('rpe: Guided\'s limits row says "Max effort 7"', g.week.some(w => /Max effort 7/i.test(w)), JSON.stringify(g.week));
  t.check('rpe: Guided shows no "RPE" anywhere', !/\bRPE\b/.test(g.all), around(g.all, /\bRPE\b/));
  t.check('rpe: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// The longest tag ("Effort 10") stays inside its row and clear of the tick on the narrowest phones.
async function tagWidth(browser) {
  for (const w of [320, 360, 390]) {
    const { ctx, p } = await H.openProgram(browser, { w, h: 800 });
    await p.evaluate("openDayView('1')");
    await p.waitForTimeout(300);
    await openCard(p, 'Barbell Back Squat');
    await p.waitForTimeout(500);
    await p.click('#day-view .checklist-item:not(.collapsed) .ex-set-row[data-set-idx="0"] .ex-set-check');
    await p.waitForTimeout(250);
    await p.click('#day-view .checklist-item:not(.collapsed) .ex-set-row[data-set-idx="0"] .rpe-btn[data-rpe="10"]');
    await p.waitForTimeout(350);
    const m = await p.evaluate(() => {
      const row = document.querySelector('#day-view .checklist-item:not(.collapsed) .ex-set-row[data-set-idx="0"]');
      const g = row.querySelector('.ex-set-rpetag').getBoundingClientRect(), tick = row.querySelector('.ex-set-check').getBoundingClientRect(), reps = row.querySelector('.ex-set-reps').getBoundingClientRect();
      return { text: row.querySelector('.ex-set-rpetag').textContent, tagL: Math.round(g.left), tagR: Math.round(g.right), tickL: Math.round(tick.left), repsR: Math.round(reps.right), sw: document.documentElement.scrollWidth };
    });
    t.check(`rpe: at ${w} px "Effort 10" sits between the reps box and the tick, no sideways scroll`, m.text === 'Effort 10' && m.tagL >= m.repsR - 1 && m.tagR <= m.tickL + 1 && m.sw <= w, JSON.stringify(m));
    await ctx.close();
  }
}

// A lower check-in day: the pill and the banner say effort.
async function lowerDay(browser) {
  const { ctx, p } = await H.openProgram(browser, {});
  const q = await p.evaluate(() => {
    const id = String(DATA.workouts.days[0].id);
    localStorage.setItem(readinessKey(id), JSON.stringify({ timestamp: new Date().toISOString(), level: 'amber', sore: '', skipped: false, drop: 1, asWritten: false }));
    openDayView(id); paintToday(id);
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat');
    const pill = c.querySelector('.rd-pill'), line = c.querySelector('.ex-numline');
    return { pill: pill ? pill.textContent : '', line: line ? line.innerText.replace(/\s+/g, ' ') : '', banner: (document.querySelector('.rd-in') || {}).innerText || '' };
  });
  t.check('rpe: on a lower day the squat\'s pill says "Effort 7 → 6 today" and the line leaves the effort out', q.pill === 'Effort 7 → 6 today' && !/Effort/.test(q.line), JSON.stringify(q));
  t.check('rpe: the lower-day banner says "Effort 1 lower today."', /Effort 1 lower today\./.test(q.banner) && !/RPE/.test(q.banner), q.banner.replace(/\s+/g, ' '));
  await ctx.close();
}

// ═════════ tempo ═════════
// The fixture's day 1: the squat is 3-1-1, day 2's press 3-0-1. Added here: an explosive box jump (X-0-X-0), a split squat that
// lowers for 0, and a pallof press at 2-0-2-0.
function withTempos() {
  const P = H.fixture();
  const b = P.workouts.days[0].blocks;
  b[1].exercises.find(e => e.name === 'Box Jump').rx.tempo = 'X-0-X-0';
  b[1].exercises.find(e => e.name === 'Dumbbell Bulgarian Split Squat').rx.tempo = '0-0-1';
  b[2].exercises.find(e => e.name === 'Half Kneeling Pallof Press').rx.tempo = '2-0-2-0';
  return P;
}
async function tempo(browser) {
  const { ctx, p } = await H.openProgram(browser, { prog: withTempos() });
  await p.evaluate("openDayView('1')");
  await p.waitForTimeout(400);
  const L = nm => cardOf(p, nm);
  const sq = await L('Barbell Back Squat'), pal = await L('Half Kneeling Pallof Press'), box = await L('Box Jump'), split = await L('Dumbbell Bulgarian Split Squat');
  t.check('tempo: 3-1-1 says "Down 3 s · pause 1 s" and not the numbers', /Down 3 s · pause 1 s/.test(sq) && !/3-1-1/.test(sq), sq);
  t.check('tempo: 2-0-2-0 says "Down 2 s", no pause', /Down 2 s/.test(pal) && !/pause/.test(pal) && !/2-0-2-0/.test(pal), pal);
  t.check('tempo: X-0-X-0 (an explosive lift) leaves the tempo out of the line', box !== null && !/Down|tempo|X-0/i.test(box), box);
  t.check('tempo: 0-0-1 (a 0 for the lowering) leaves the tempo out of the line', split !== null && !/Down|tempo|0-0-1/i.test(split), split);
  await p.evaluate("openDayView('2')");
  await p.waitForTimeout(400);
  const press = await L('Incline Dumbbell Press');
  t.check('tempo: 3-0-1 on day 2\'s press says "Down 3 s" only', /Down 3 s/.test(press) && !/pause/.test(press) && !/3-0-1/.test(press), press);
  // the help button stays: a tap on the open squat's tempo opens the help card with the whole tempo in it
  await p.evaluate("openDayView('1')");
  await p.waitForTimeout(300);
  await openCard(p, 'Barbell Back Squat');
  await p.waitForTimeout(500);
  await p.click('#day-view .checklist-item:not(.collapsed) .nl-tempo .nl-help');
  await p.waitForTimeout(350);
  const help = await p.evaluate(() => { const o = document.getElementById('hist-overlay'); const open = o.querySelector('.note-card.open'); return { shown: o.classList.contains('visible'), txt: open ? open.innerText.replace(/\s+/g, ' ') : '' }; });
  t.check('tempo: the tempo help button still opens the help card, with the whole tempo (3-1-1) and "Down 3 s"', help.shown && /3-1-1/.test(help.txt) && /Down 3 s/.test(help.txt), help.txt.slice(0, 260));
  t.check('tempo: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}


// ═════════ rest ═════════
async function rest(browser) {
  const P = H.fixture();
  const b = P.workouts.days[0].blocks;
  b[2].exercises.find(e => e.name === 'Half Kneeling Pallof Press').rx.rest = 120;
  b[2].exercises.find(e => e.name === 'Side Plank').rx.rest = 30;
  const { ctx, p } = await H.openProgram(browser, { prog: P });
  await p.evaluate("openDayView('1')");
  await p.waitForTimeout(400);
  const lines = { sq: await cardOf(p, 'Barbell Back Squat'), box: await cardOf(p, 'Box Jump'), pal: await cardOf(p, 'Half Kneeling Pallof Press'), plank: await cardOf(p, 'Side Plank') };
  t.check('rest: 150 s says "Rest 2 min 30 s"', /Rest 2 min 30 s/.test(lines.sq) && !/2:30/.test(lines.sq), lines.sq);
  t.check('rest: 90 s says "Rest 90 s"', /Rest 90 s$/.test(lines.box) && !/1:30/.test(lines.box), lines.box);
  t.check('rest: 120 s says "Rest 2 min"', /Rest 2 min$/.test(lines.pal) && !/2m\b/.test(lines.pal), lines.pal);
  t.check('rest: 30 s says "Rest 30 s"', /Rest 30 s$/.test(lines.plank) && !/30s/.test(lines.plank), lines.plank);
  await openCard(p, 'Box Jump');
  await p.waitForTimeout(450);
  const btn = await p.evaluate(() => { const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Box Jump'); const b = c.querySelector('.rest-btn'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : null; });
  t.check('rest: the Rest button says "Rest 90 s" too', /^Rest\s*(⏱\s*)?90 s$/i.test(btn || ''), btn);
  const f = await p.evaluate(() => [0, 30, 60, 90, 119, 120, 150, 180, 300].map(formatRestLabel).join('|'));
  t.check('rest: formatRestLabel reads 0, 30, 60, 90, 119, 120, 150, 180, 300 s plainly', f === '|30 s|1 min|90 s|119 s|2 min|2 min 30 s|3 min|5 min', f);
  t.check('rest: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ last ═════════
// The fixture's history has the squat at 6 · 7 · 7 · 8 (6 reps, 6, 6, 5) against a target of 7: set 4 ran over, so it carries the ghost.
async function last(browser) {
  for (const w of [320, 360, 390]) {
    const { ctx, p } = await H.openProgram(browser, { w, h: 844 });
    await p.evaluate("openDayView('1')");
    await p.waitForTimeout(400);
    await openCard(p, 'Barbell Back Squat');
    await p.waitForTimeout(700);
    const g = await p.evaluate(() => {
      const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat');
      const rows = [...c.querySelectorAll('.ex-set-row')];
      const ghost = rows.map(r => r.querySelector('.lt-ghost'));
      const r3 = rows[3], gh = ghost[3];
      if (!gh) return { ghosts: ghost.map(x => x ? x.innerText.replace(/\s+/g, ' ').trim() : null) };
      const a = gh.getBoundingClientRect(), tick = r3.querySelector('.ex-set-check').getBoundingClientRect(), reps = r3.querySelector('.ex-set-reps').getBoundingClientRect(), row = r3.getBoundingClientRect();
      return { ghosts: ghost.map(x => x ? x.innerText.replace(/\s+/g, ' ').trim() : null), l: Math.round(a.left), r: Math.round(a.right), tickL: Math.round(tick.left), repsR: Math.round(reps.right), top: Math.round(a.top - row.top), bot: Math.round(row.bottom - a.bottom), sw: document.documentElement.scrollWidth };
    });
    if (w === 390) t.check('last: the over set says "Last time 5 reps · 8/10" and only that set has one', JSON.stringify(g.ghosts) === JSON.stringify([null, null, null, 'Last time 5 reps · 8/10']), JSON.stringify(g.ghosts));
    t.check(`last: at ${w} px the line sits inside its row, clear of the reps box and the tick, no sideways scroll`, g.l >= g.repsR - 1 && g.r <= g.tickL + 1 && g.top >= -1 && g.bot >= -1 && g.sw <= w, JSON.stringify(g));
    await ctx.close();
  }
  // a set with no reps number says its weight
  const hist = [{ completed_on: H.past(2), day: '1', readiness: 4, log: [{ ex: 'Barbell Back Squat', block: 'Strength', reps: '', note: '', sets: [{ w: '60', n: '', r: '9', d: true }, { w: '60', n: '', r: '7', d: true }, { w: '60', n: '', r: '7', d: true }, { w: '60', n: '', r: '7', d: true }] }] }];
  const { ctx, p } = await H.openProgram(browser, { hist });
  await p.evaluate("openDayView('1')");
  await p.waitForTimeout(400);
  await openCard(p, 'Barbell Back Squat');
  await p.waitForTimeout(700);
  const wt = await p.evaluate(() => { const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat'); const g = c.querySelector('.lt-ghost'); return g ? g.innerText.replace(/\s+/g, ' ').trim() : null; });
  t.check('last: a set with only a weight says "Last time 60 kg" (and its effort)', /^Last time 60 kg/.test(wt || ''), wt);
  t.check('last: the old "LAST 5 @ 9" form is gone', !/@/.test(wt || ''), wt);
  await ctx.close();
}


(async () => {
  const browser = await H.launch();
  await rpe(browser);
  await tagWidth(browser);
  await lowerDay(browser);
  await tempo(browser);
  await rest(browser);
  await last(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
