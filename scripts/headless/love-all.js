// Love All (2026-10-21): the five fixes of the first-timer + bug audit, checked the way the athlete meets them.
//   L1  the door rows on Achievements, Your moments and How it works draw their icons at 22 x 22 (they were ~380 px) and the last
//       row clears the fixed tab bar, at 390x844 and 320x640.
//   B1  the session rating and the note are held on the phone until Done: a tap before Done files nothing (no save_session, no
//       queue entry, no finished stamp), Done's own save carries them, a tap after Done re-saves, a Reset after a tap leaves no trace,
//       and a rating tapped first still lets the finish card's New best band show at Done.
//   B2  this week's setsDrop counts: 3 of 4 sets on every set-logged lift is a finished day, Guided walks 3, a circuit and a 1-set card keep theirs.
//   B5  Reminders opens twice in a row without a stack overflow, and "Turn reminders on" repaints the sheet with the switches.
//   B3  a first-timer's tap on a warm-up row's circle ticks it (no "Log each set" note); a real lift's closed card still opens with it.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all.js
'use strict';
const H = require('./lib');
const C = require('./career');

const ID = H.ID;
const DAY = 86400000;
const SQUAT = 'Barbell Back Squat';
const t = H.checker();

const calls = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'save_session').map(x => x[1]));
const csq = p => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_csq') || '[]'), ID);
const finished = p => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_finished') || '[]'), ID);
const R = (p, sel) => p.evaluate(sel => {
  const e = document.querySelector(sel);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
}, sel);

// ═════════ L1: Achievements, Your moments, How it works ═════════
function achFx() {
  const at = C.at;
  const items = [
    { id: 'held', name: 'Held', meaning: 'consistency', test: 'first', reads: 'week_held', caption: 'Your first held week.', rule: 'The first week held.', size: 'highlight', xp: 100, origin: 'new', day: at(-20) },
    { id: 'back_to_back', name: 'Back to Back', meaning: 'consistency', test: 'best_run', reads: 'week_held', caption: 'Two held weeks in a row.', rule: 'Two weeks held.', size: 'highlight', xp: 150, origin: 'new', have: 1, need: 2 },
    { id: 'straight_talk', name: 'Straight Talk', meaning: 'commitment', test: 'total', reads: 'checkin_done', caption: '25 honest check-ins.', rule: '25 check-ins.', size: 'highlight', xp: 150, origin: 'new', have: 23, need: 25 },
    { id: 'moving_up', name: 'Moving Up', meaning: 'progress', test: 'first', reads: 'effort_win', caption: 'Stronger at the same effort.', rule: 'First effort win.', size: 'highlight', xp: 100, origin: 'new', have: 0, need: 1 },
    { id: 'rebound', name: 'Bounce Back', meaning: 'resilience', test: 'first', reads: 'bounce_back', caption: 'A week went wrong. The next did not.', rule: 'Held after broken.', size: 'highlight', xp: 100, origin: 'new', day: at(-6) }];
  return { athlete_id: ID, ready: true, items, next: items[2], month: { weeks: 4, held: 1, spoilt: false } };
}
async function openCareer(browser, w, h) {
  const prof = C.rwProfile(10000);
  const stub = { tables: { career_rules: C.RW_RULES, career_facts: [], career_catalogue: C.catRows() },
    profile: prof, awards: C.rwShelf(prof), myMoments: C.myMomentsFx(), achievements: achFx() };
  const prog = H.fixture();
  return H.openProgram(browser, { w, h, tz: 'UTC', prog, hist: [], stub, seed: { _hab_cfg: { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() } } });
}
async function l1(browser) {
  for (const [w, h] of [[390, 844], [320, 640]]) {
    const { ctx, p } = await openCareer(browser, w, h);
    await p.waitForTimeout(1200);
    const shown = {};
    for (const [name, open, body] of [['Achievements', "goTo('achievements')", '#ach-body'], ['Your moments', "goTo('moments')", '#mom-body'], ['How it works', "openSystemGuide('achievements')", '#sys-body']]) {
      await p.evaluate(open);
      await p.waitForTimeout(700);
      const m = await p.evaluate(body => {
        const act = document.querySelector('.screen.active');
        const b = document.querySelector(body);
        const ics = [...act.querySelectorAll('.hrow-ic')].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; });
        const svgs = [...act.querySelectorAll('.hrow-ic svg')].filter(e => e.getBoundingClientRect().width > 0).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; });
        window.scrollTo(0, 1e7);
        act.scrollTop = 1e7;
        return { screen: act.id, ics, svgs, kids: b ? b.children.length : 0 };
      }, body);
      await p.waitForTimeout(300);
      const bar = await R(p, '#global-tabs');
      const last = await p.evaluate(body => { const b = document.querySelector(body), k = b && b.lastElementChild; if (!k) return null; const r = k.getBoundingClientRect(); return { bottom: r.bottom, cls: k.className }; }, body);
      shown[name] = m.ics.length;
      t.check(`L1 ${w}x${h} ${name}: its screen is open and has rows`, m.kids > 0, JSON.stringify(m));
      t.check(`L1 ${w}x${h} ${name}: every .hrow-ic and its svg measures 22x22`, m.ics.every(s => s[0] === 22 && s[1] === 22) && m.svgs.every(s => s[0] === 22 && s[1] === 22), JSON.stringify([m.ics, m.svgs]));
      t.check(`L1 ${w}x${h} ${name}: scrolled to the bottom, the last row (${last && last.cls}) is above the tab bar`, !!last && !!bar && last.bottom <= bar.top + 0.5, JSON.stringify([last, bar && bar.top]));
    }
    t.check(`L1 ${w}x${h}: at least one door icon was measured across the three screens`, Object.values(shown).reduce((a, b) => a + b, 0) > 0, JSON.stringify(shown));
    t.check(`L1 ${w}x${h}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// ═════════ B1: the rating before Done ═════════
async function openDay(browser, o = {}) {
  const { ctx, p } = await H.openProgram(browser, Object.assign({ w: 390, h: 844 }, o));
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(300);
  return { ctx, p };
}
async function tickAll(p) {
  const n = await p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => {
      const c = document.querySelectorAll('#day1 .checklist-item')[i];
      if (c.classList.contains('collapsed')) toggleExpand(c);
      if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
      if (c.classList.contains('round-group')) c.querySelectorAll('.rpe-row').forEach(r => r.querySelector('.rpe-btn[data-rpe="7"]').click());
    }, i);
    await p.waitForTimeout(100);
  }
  await p.evaluate(() => hideAaToast());
  await p.waitForTimeout(900);
  await p.evaluate(() => document.getElementById('confirm-1').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
}
async function b1(browser) {
  // Rate (real tap), note, wait, Done, change the rating.
  {
    const { ctx, p } = await openDay(browser);
    await tickAll(p);
    t.check('B1: every set done, the finish card is ready', await p.evaluate(() => document.getElementById('confirm-1').classList.contains('ready')));
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]');
    await p.waitForTimeout(500);
    t.check('B1: the tap kept the rating on the phone (_srpe_1 = 7)', await p.evaluate(id => localStorage.getItem(id + '_srpe_1'), ID) === '7');
    t.check('B1: a rating tapped BEFORE Done calls no save_session', (await calls(p)).length === 0, JSON.stringify(await calls(p)));
    t.check('B1: …the finished list has no entry for the day', !(await finished(p)).some(x => /^1\|/.test(x)), JSON.stringify(await finished(p)));
    t.check('B1: …and the session queue is empty', (await csq(p)).length === 0, JSON.stringify(await csq(p)));
    t.check('B1: …no completed stamp either', await p.evaluate(id => localStorage.getItem(id + '_completed_d1'), ID) === null);
    await p.fill('#confirm-1 .complete-note-input', 'left knee felt fine');
    await p.waitForTimeout(1600);
    t.check('B1: a note typed before Done, 1.6 s on: still no save_session', (await calls(p)).length === 0, JSON.stringify(await calls(p)));
    t.check('B1: …still nothing in the queue or the finished list', (await csq(p)).length === 0 && !(await finished(p)).some(x => /^1\|/.test(x)));
    await p.click('#confirm-1 .confirm-btn');
    await p.waitForTimeout(900);
    const s1 = await calls(p);
    const last = s1[s1.length - 1];
    t.check('B1: Done runs the save path: save_session called, status Complete, the rating tapped (7)', s1.length >= 1 && last.p_session.status === 'Complete' && last.p_session.session_rpe === '7' && last.p_day === 1, JSON.stringify(s1.map(x => [x.p_session.status, x.p_session.session_rpe])));
    t.check('B1: …and the note went with it', s1.length >= 1 && /left knee felt fine/.test(last.p_session.day_note || ''), last && last.p_session.day_note);
    t.check('B1: …the finished list names the day', (await finished(p)).some(x => /^1\|/.test(x)), JSON.stringify(await finished(p)));
    // a different rating after Done: the re-save still works
    await p.click('#complete-1 .rate-fold');
    await p.waitForTimeout(300);
    await p.click('#complete-1 .complete-rpe-btn[data-rpe="9"]');
    await p.waitForTimeout(900);
    const s2 = await calls(p);
    t.check('B1: a different rating after Done saves again (more calls, the newest says 9)', s2.length > s1.length && s2[s2.length - 1].p_session.session_rpe === '9', JSON.stringify(s2.map(x => x.p_session.session_rpe)));
    t.check('B1: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  // Rate, then Reset.
  {
    const { ctx, p } = await openDay(browser);
    await tickAll(p);
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="8"]');
    await p.fill('#confirm-1 .complete-note-input', 'a note then a reset');
    await p.waitForTimeout(500);
    await p.evaluate(() => resetDay('1'));
    await p.waitForTimeout(2200);
    t.check('B1 reset: rate, then Reset the day: save_session was never called', (await calls(p)).length === 0, JSON.stringify(await calls(p)));
    t.check('B1 reset: …the queue is empty and the day is not in the finished list', (await csq(p)).length === 0 && !(await finished(p)).some(x => /^1\|/.test(x)));
    t.check('B1 reset: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  // New best band: the rating tapped first, then Done.
  {
    const DAYMS = DAY;
    const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const P = H.fixture();
    const start = Date.now() - 34 * DAYMS + 4 * DAYMS;   // the cycle still has days to run
    P.cycles.forEach((c, i) => { const s = start + (i - P.currentCycleIndex) * 35 * DAYMS; c.startDate = ymd(new Date(s)); c.endDate = ymd(new Date(s + 34 * DAYMS)); });
    const sq = (w, on) => ({ completed_on: ymd(new Date(start + on * DAYMS)), day: '1', readiness: 4, log: [
      { ex: SQUAT, block: 'Strength', reps: 6, note: '', sets: [1, 2, 3].map(() => ({ w: String(w), n: 6, r: '7', d: true })) }] });
    const SPINE = H.SPINE.map(e => e.id === 'barbell-back-squat' ? Object.assign({}, e, { pattern: 'squat', impact: 'none' }) : e);
    const sets = [1, 2, 3, 4].map(() => ({ w: '80', n: '', r: '8', d: true }));
    const { ctx, p } = await openDay(browser, { prog: P, hist: [sq(75, 29), sq(70, 1)], spine: SPINE, seed: { _setlog_Barbell_Back_Squat: sets } });
    await tickAll(p);
    await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]');
    await p.waitForTimeout(400);
    t.check('B1 best: the rating tapped first filed nothing', (await calls(p)).length === 0);
    await p.evaluate(() => finishDay('1'));
    await p.waitForTimeout(500);
    const b = await p.evaluate(() => { const el = document.querySelector('#hlwin-1 .hl-band'); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; });
    t.check('B1 best: the New best band shows at Done when the rating was tapped first', !!b && /^NEW BEST BARBELL BACK SQUAT 80 KG × 6 SHARE$/.test(b), b);
    await ctx.close();
  }
}

// ═════════ B2: setsDrop ═════════
function dropProg(withNote) {
  const P = H.fixture();
  const cur = P.cycles[P.currentCycleIndex];
  if (withNote) cur.weekNotes = { '2': { text: 'Back-off week. One set fewer on every lift.', setsDrop: 1 } };
  const d = P.workouts.days[0];
  d.blocks[2].exercises.push({ type: 'circuit', name: 'Repeat-Effort Circuit', rx: { rounds: 2, rest: 60 },
    items: [{ name: 'Squat Jump', exId: 'squat-jump', rx: { time: '20 seconds' } }, { name: 'Mountain Climber', exId: 'mountain-climber', rx: { time: '20 seconds' } }] });
  d.blocks[2].exercises.push({ name: 'Dead Hang', type: 'standard', rx: { sets: 1, time: '30 s' } });
  return P;
}
async function tickDrop(p) {
  const n = await p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => {
      const c = document.querySelectorAll('#day1 .checklist-item')[i];
      if (c.classList.contains('collapsed')) toggleExpand(c);
      const checks = c.querySelectorAll('.ex-set-check');
      if (checks.length) {
        const written = checks.length, k = written > 1 ? written - 1 : 1;   // 3 of 4, 2 of 3, 1 of 1
        for (let j = 0; j < k; j++) checks[j].click();
      } else if (!c.classList.contains('checked')) toggleCheckOnly(c, '1');
      if (c.classList.contains('round-group')) c.querySelectorAll('.rpe-row').forEach(r => r.querySelector('.rpe-btn[data-rpe="7"]').click());
    }, i);
    await p.waitForTimeout(120);
  }
  await p.evaluate(() => hideAaToast());
  await p.waitForTimeout(900);
}
async function b2(browser) {
  for (const withNote of [true, false]) {
    const tag = withNote ? 'with the note' : 'without the note';
    const { ctx, p } = await openDay(browser, { prog: dropProg(withNote) });
    await tickDrop(p);
    const m = await p.evaluate(() => {
      const st = getDayCompletion('1'), c = document.getElementById('confirm-1');
      return { done: st.done, total: st.total, missing: st.missing.map(x => x.name + ' ' + x.label), cls: [...c.classList].join(' '), btn: c.querySelector('.confirm-btn').textContent.trim(),
        sq: document.querySelectorAll('#day1 .checklist-item')[1].querySelectorAll('.ex-set-check').length };
    });
    if (withNote) {
      t.check(`B2 ${tag}: getDayCompletion done === total`, m.total > 0 && m.done === m.total, JSON.stringify(m));
      t.check(`B2 ${tag}: the finish card is ready and says Done, not Finish early`, /\bready\b/.test(m.cls) && /^Done\b/.test(m.btn) && !/early/i.test(m.btn), JSON.stringify([m.cls, m.btn]));
      await p.evaluate(() => openStepMode('1'));
      await p.waitForTimeout(400);
      const g = await p.evaluate(() => {
        const by = nm => STEP.seq.filter(s => s.name === nm);
        const sqIdx = STEP.seq.map((s, i) => [s, i]).filter(([s]) => s.name === 'Barbell Back Squat').map(([, i]) => i);
        STEP.pos = sqIdx[sqIdx.length - 1]; renderStep();
        const pill = document.getElementById('step-pill').textContent.trim();
        return { squat: by('Barbell Back Squat').length, split: by('Dumbbell Bulgarian Split Squat').length, circ: by('Repeat-Effort Circuit').length, hang: by('Dead Hang').length, pill };
      });
      t.check(`B2 ${tag}: Guided walks 3 sets of the 4-set squat, "Set 3 of 3" last`, g.squat === 3 && g.pill === 'Set 3 of 3', JSON.stringify(g));
      t.check(`B2 ${tag}: a 3-set lift walks 2; the circuit keeps its 2 rounds; the 1-set card keeps 1`, g.split === 2 && g.circ === 2 && g.hang === 1, JSON.stringify(g));
    } else {
      t.check(`B2 ${tag}: the same ticks leave the day in progress (done < total)`, m.done < m.total, JSON.stringify(m));
      t.check(`B2 ${tag}: the finish card is not ready`, !/\bready\b/.test(m.cls), m.cls);
    }
    t.check(`B2 ${tag}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
}

// ═════════ B5: Reminders ═════════
async function b5(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844 });
  await p.evaluate(() => {
    let state = 'off', n = 0;
    window.__enableCalls = 0;
    window.AAPush = {
      state: () => state, VAPID_PUBLIC: 'x', tzOffset: () => 0, device: () => 'test', asked: () => false, markAsked: () => {},
      kindOn: (me, k) => !(me && me.kinds && me.kinds[k] === false),
      me: () => Promise.resolve(++n === 1 ? { on: false } : { on: true, hour: 20, kinds: {} }),
      enable: () => { window.__enableCalls++; state = 'on'; return Promise.resolve({ ok: true, state: 'on', me: { on: true, hour: 20, kinds: {} } }); },
    };
    PUSH_ME = null; _pushLoading = false;
  });
  await p.evaluate(() => { openPushSettings(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { openPushSettings(); });
  await p.waitForTimeout(500);
  const m = await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return { vis: ov.classList.contains('visible'), title: (ov.querySelector('.readiness-title') || {}).textContent, on: !!ov.querySelector('#push-on') }; });
  t.check('B5: Reminders opened twice in a row: no page error (no stack overflow)', p.errs.length === 0, p.errs.join(' | '));
  t.check('B5: …the sheet is visible and says Reminders', m.vis && m.title === 'Reminders', JSON.stringify(m));
  t.check('B5: …with "Turn reminders on" (state off)', m.on, JSON.stringify(m));
  await p.click('#push-on');
  await p.waitForTimeout(800);
  const a = await p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return { sw: ov.querySelectorAll('input[data-pkind]').length, on: !!ov.querySelector('#push-on'), txt: ov.innerText, enable: window.__enableCalls }; });
  t.check('B5: Turn reminders on: enable was called once', a.enable === 1, JSON.stringify(a.enable));
  t.check('B5: …the sheet now shows the switches and no "Turn reminders on"', a.sw > 0 && !a.on && !/Turn reminders on/.test(a.txt), JSON.stringify({ sw: a.sw, on: a.on }));
  t.check('B5: no page errors after turning on', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B3: a warm-up row's circle for a first-timer ═════════
async function b3(browser) {
  const first = H.fixture(); first.currentCycleIndex = 0;
  const { ctx, p } = await openDay(browser, { prog: first, hist: [] });
  const vet = await p.evaluate(() => onbVeteran());
  t.check('B3: the athlete is a first-timer (not onbVeteran)', vet === false, vet);
  const toastText = () => p.evaluate(() => document.body.innerText.includes('Log each set'));
  await p.evaluate(() => document.querySelectorAll('#day1 .checklist-item').forEach(c => { c.dataset.t = c.querySelector('.item-name').textContent.trim().replace(/\s+/g, '_'); }));
  const rowing = '#day1 .checklist-item[data-t="Rowing"] .check-box';
  const hasLog = await p.evaluate(() => { const c = [...document.querySelectorAll('#day1 .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === 'Rowing'); return { log: !!c.querySelector('.ex-log'), sets: c.dataset.sets || null, collapsed: c.classList.contains('collapsed') }; });
  t.check('B3: the warm-up row has no .ex-log', !hasLog.log, JSON.stringify(hasLog));
  await p.click(rowing);
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => [...document.querySelectorAll('#day1 .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === 'Rowing').classList.contains('checked'));
  t.check('B3: a tap on the warm-up row\'s circle ticks it (.checked)', r);
  t.check('B3: …and no "Log each set" toast appears', !(await toastText()));
  await p.evaluate(() => hideAaToast());
  await p.waitForTimeout(400);
  await p.click('#day1 .checklist-item[data-t="Barbell_Back_Squat"] .check-box');
  await p.waitForTimeout(500);
  const s = await p.evaluate(() => { const c = [...document.querySelectorAll('#day1 .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat'); return { open: !c.classList.contains('collapsed'), checked: c.classList.contains('checked') }; });
  t.check('B3: a real lift\'s closed card still opens on the first tap, with the note, and ticks nothing', s.open && !s.checked && await toastText(), JSON.stringify(s));
  t.check('B3: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  await l1(browser);
  await b1(browser);
  await b2(browser);
  await b5(browser);
  await b3(browser);
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
