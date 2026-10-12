// How to do it holds the steps (2026-10-11, the Exercise Card Blueprint; CUE-6, CUE-7, Q9 A, Q10 A), against the stub.
// A Spine entry's `steps` show inside the card's How to do it, in this order: the video when there is one, "You need"
// (the entry's kit, the floor left out), the numbered steps, then the cues. This checks, at 320 / 360 / 390 px, light and dark:
//   · a closed card is the same height with steps as without them (the closed card never changed);
//   · the row reads "How to do it · video · 5 steps · 4 cues" (only the parts there), the green ▶ only with a video;
//   · the order inside it, and "You need" with the floor dropped (none at all for a floor-only entry);
//   · the Spine's cues win over a card's own (a standard card, a circuit item, a Library session), and the card's own
//     cues come back only for an exercise with no approved entry, or an entry with no cues;
//   · a simple card (a warm-up ride) opens its How to do it by itself the first time, and starts folded once met;
//   · a warm-up row folds its steps with its cues; a working circuit keeps its cues open and folds its steps behind
//     one How to do it line, so it grows by that line only;
//   · the About sheet from Library → Exercises puts the video, the steps and the cues above the body map, and from a
//     card shows none of them; Guided carries the steps with the card;
//   · nothing runs sideways, and no page errors.
// Serve the repo (python3 -m http.server 8765 --bind 127.0.0.1), then: node scripts/headless/howto-steps.js [--out <dir>]
'use strict';
const path = require('path');
const H = require('./lib');

const STEPS = n => Array.from({ length: n }, (_, i) => `Step ${i + 1} of a made-up exercise, written for anyone.`);

// The fixture Spine plus Rowing (a simple warm-up card), two circuit items and a Library-only lift.
function spine() {
  const s = JSON.parse(JSON.stringify(H.SPINE));
  s.forEach(e => { if (e.id === 'barbell-back-squat' || e.id === 'box-jump') { e.loads = ['knee', 'hip-groin']; e.impact = e.id === 'box-jump' ? 'landing' : 'none'; } });   // the body map
  s.push({ id: 'rowing', name: 'Rowing', aliases: [], equipment: ['row machine'], purpose: 'Warm-up.',
    cues: { good: ['Legs, then back, then arms'], bad: ['Arms bending before the legs push. Push first.'] },
    steps: ['Strap your feet in and hold the handle.', 'Push with your legs, then lean back a little, then pull.', 'To finish, slow down and rest the handle on its hook.'] });
  s.push({ id: 'cat-cow', name: 'Cat-Cow', aliases: [], equipment: ['floor'], purpose: 'Spine mobility.',
    cues: { good: ['Move one bone at a time'], bad: ['Rushing it. Slow down.'] }, steps: STEPS(2) });
  s.push({ id: 'dumbbell-bench-press', name: 'Dumbbell Bench Press', aliases: [], equipment: ['dumbbells', 'bench'], purpose: 'Push.',
    cues: { good: ['SPINE PRESS CUE'], bad: ['Elbows flaring wide. Keep them at 45 degrees.'] }, steps: STEPS(5) });
  s.push({ id: 'single-arm-dumbbell-row', name: 'Single-Arm Dumbbell Row', aliases: [], equipment: ['dumbbell', 'bench'], purpose: 'Pull.',
    cues: { good: ['Elbow to your back pocket'], bad: [] } });   // no steps: no How to do it line
  s.push({ id: 'cueless-lift', name: 'Cueless Lift', aliases: [], equipment: ['cable'], purpose: 'An entry with steps and no cues.', steps: STEPS(3) });
  return s;
}

// The fixture programme, plus: own cues on the squat (the Spine must win) and on a lift with no entry (they must stay),
// a lift whose entry has no cues (its own stay), a warm-up circuit and a working circuit with an item carrying own cues.
function programme() {
  const prog = H.fixture();
  const day = prog.workouts.days[0];
  const sq = day.blocks[1].exercises.find(e => e.name === 'Barbell Back Squat');
  sq.cues = { good: ['OWN SQUAT CUE'], bad: [] };
  day.blocks[2].exercises.push({ name: 'Mystery Press', type: 'standard', rx: { sets: 2, reps: 8 }, cues: { good: ['OWN MYSTERY CUE'], bad: [] } });
  day.blocks[2].exercises.push({ name: 'Cueless Lift', exId: 'cueless-lift', type: 'standard', rx: { sets: 2, reps: 8 }, cues: { good: ['OWN CUELESS CUE'], bad: [] } });
  day.blocks[0].exercises.push({ type: 'circuit', name: 'Hip Primer', rx: { rounds: 1 }, items: [
    { name: 'Cat-Cow', exId: 'cat-cow', rx: { reps: 10 } },
    { name: '90/90 Hip Switch', rx: { reps: 8, side: true } },
  ] });
  day.blocks[1].exercises.push({ type: 'circuit', name: 'Press and Pull', rx: { rounds: 3, rest: 60 }, items: [
    { name: 'Dumbbell Bench Press', exId: 'dumbbell-bench-press', rx: { reps: 8 }, cues: { good: ['OWN PRESS CUE'], bad: [] } },
    { name: 'Single-Arm Dumbbell Row', exId: 'single-arm-dumbbell-row', rx: { reps: 10, side: true } },
  ] });
  return prog;
}

// A Library session: a simple card, a standard card and a circuit item, each carrying its own cues.
const LIB = { id: 'test-session', title: 'Test Session', focusTag: 'Strength', duration: '20 min', equipment: 'Barbell', blocks: [
  { title: 'Warm-Up', exercises: [{ name: 'Rowing', type: 'simple', rx: { time: '5 minutes' }, cues: { good: ['OWN LIB ROW CUE'], bad: [] } }] },
  { title: 'Strength', exercises: [
    { name: 'Barbell Back Squat', type: 'standard', rx: { sets: 3, reps: 5 }, cues: { good: ['OWN LIB SQUAT CUE'], bad: [] } },
    { type: 'circuit', name: 'Lib Pair', rx: { rounds: 2 }, items: [{ name: 'Dumbbell Bench Press', rx: { reps: 8 }, cues: { good: ['OWN LIB PRESS CUE'], bad: [] } }] },
  ] },
] };

// The history: the fixture's session, and one that met the Rowing warm-up (as buildSessionData() writes it: no sets).
const HIST_MET = H.HISTORY.map(s => Object.assign({}, s, { log: s.log.concat([{ ex: 'Rowing', block: 'Warm-Up', reps: null, sets: [], note: '' }]) }));

(async () => {
  const shots = H.outDir();
  const t = H.checker();
  const browser = await H.launch();
  const shot = (p, name) => p.screenshot({ path: path.join(shots, name + '.png') });
  const sideways = p => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  // A card's How to do it, measured and read.
  const how = (p, nm) => p.evaluate(`(() => {
    const c = ${H.card(nm)}; if (!c) return null;
    const h = c.querySelector('.ex-how'); if (!h) return { none: true };
    const body = h.querySelector('.ex-how-body');
    const kids = [...body.querySelectorAll('.ex-vunit, .ex-kit, .ex-steps, .ex-cues')].map(e => e.className.split(' ')[0]);
    const tops = h.open && !c.classList.contains('collapsed') ? [...body.querySelectorAll('.ex-vunit, .ex-kit, .ex-steps, .ex-cues')].map(e => Math.round(e.getBoundingClientRect().top)) : [];
    const kit = h.querySelector('.ex-kit');
    return { hidden: h.hidden, open: h.open, label: h.querySelector('.ex-how-sum').textContent.replace(/[\\s\\u00a0]+/g, ' ').replace('›', '').replace('▶', '').trim(),
      play: !!(h.querySelector('.ex-how-play') && !h.querySelector('.ex-how-play').hidden), kids, tops,
      kit: kit ? kit.textContent.trim() : '', steps: h.querySelectorAll('.ex-steps li').length,
      cues: [...h.querySelectorAll('.ex-cue')].map(e => e.textContent.trim()),
      over: c.scrollWidth - c.clientWidth,
      stepColor: (() => { const li = h.querySelector('.ex-steps li'); return li ? getComputedStyle(li, '::before').color : ''; })() };
  })()`);
  const closedH = (p, nm) => p.evaluate(`(() => { const c = ${H.card(nm)}; return Math.round(c.getBoundingClientRect().height * 10) / 10; })()`);
  const openCard = (p, nm, openHow) => p.evaluate(`(() => { const c = ${H.card(nm)}; if (!c) return false;
    if (c.classList.contains('collapsed')) toggleExpand(c);
    const h = c.querySelector('.ex-how'); if (h && ${openHow ? 'true' : 'false'}) h.open = true;
    c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -120); return true; })()`);
  const circuitCard = nm => `[...document.querySelectorAll('#day-view .round-group')].find(x => x.querySelector('.item-name').textContent.trim() === ${JSON.stringify(nm)})`;
  const clay = ['rgb(199, 85, 47)', 'rgb(224, 107, 67)'];

  for (const [w, dark] of [[390, false], [390, true], [360, false], [360, true], [320, false], [320, true]]) {
    const tag = `${w}${dark ? ' dark' : ''}`;
    const { ctx, p } = await H.openProgram(browser, { w, dark, prog: programme(), spine: spine(), hist: HIST_MET });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);

    // 1. the closed card is the same height with steps as without them
    const names = ['Barbell Back Squat', 'Box Jump', 'Side Plank'];
    const withSteps = []; for (const nm of names) withSteps.push(await closedH(p, nm));
    await p.evaluate(() => { setSpine(SPINE.map(e => Object.assign({}, e, { steps: [] }))); paintSpine(); });
    const without = []; for (const nm of names) without.push(await closedH(p, nm));
    await p.evaluate(s => { setSpine(s); paintSpine(); }, spine());
    t.check(`${tag}: a closed card is the same height with steps as without`, withSteps.every((h, i) => h === without[i]), `${withSteps} vs ${without}`);

    // 2. the row's label, the ▶ only with a video, the order inside, You need
    await openCard(p, 'Barbell Back Squat', true);
    await p.waitForTimeout(150);
    const sq = await how(p, 'Barbell Back Squat');
    t.check(`${tag}: the squat reads "How to do it · video · 5 steps · 4 cues", with the ▶`, sq.label === 'How to do it · video · 5 steps · 4 cues' && sq.play, JSON.stringify({ label: sq.label, play: sq.play }));
    t.check(`${tag}: inside it: the video, You need, the steps, then the cues`, sq.kids.join(',') === 'ex-vunit,ex-kit,ex-steps,ex-cues'
      && sq.tops.length === 4 && sq.tops.every((v, i) => i === 0 || v > sq.tops[i - 1]), JSON.stringify({ kids: sq.kids, tops: sq.tops }));
    t.check(`${tag}: You need names the kit`, sq.kit === 'You need: barbell, rack', sq.kit);
    t.check(`${tag}: the step numbers are not clay`, sq.stepColor && clay.indexOf(sq.stepColor) < 0, sq.stepColor);
    t.check(`${tag}: the squat's open card does not run sideways`, sq.over <= 0 && (await sideways(p)) <= 0, sq.over);
    // The screenshots put the card's How to do it just under the session bar.
    const howTop = nm => p.evaluate(`(() => { const h = ${H.card('__N__')}.querySelector('.ex-how'); h.scrollIntoView({ block: 'start' }); window.scrollBy(0, -130); })()`.replace('"__N__"', JSON.stringify(nm)));
    if (w === 360 && !dark) { await openCard(p, 'Barbell Back Squat', true); await howTop('Barbell Back Squat'); await shot(p, 'card-video-steps-360');
      await p.evaluate(() => window.scrollBy(0, 330)); await shot(p, 'card-video-steps-360-b'); }

    await openCard(p, 'Box Jump', true);
    await p.waitForTimeout(150);
    const bj = await how(p, 'Box Jump');
    t.check(`${tag}: no video: no ▶, the row reads "How to do it · 4 steps · 1 cue"`, !bj.play && bj.label === 'How to do it · 4 steps · 1 cue', JSON.stringify({ label: bj.label, play: bj.play }));
    t.check(`${tag}: no video: You need (the floor left out), then the steps, then the cues`, bj.kit === 'You need: box' && bj.kids.join(',') === 'ex-kit,ex-steps,ex-cues', JSON.stringify(bj.kids) + ' ' + bj.kit);
    if (w === 360 && !dark) { await openCard(p, 'Box Jump', true); await howTop('Box Jump'); await p.evaluate(() => window.scrollBy(0, -170)); await shot(p, 'card-no-video-steps-360'); }
    const sp = await how(p, 'Side Plank');
    t.check(`${tag}: a floor-only entry has no You need line`, sp.kit === '' && sp.steps === 3, JSON.stringify(sp));
    const pp = await how(p, 'Half Kneeling Pallof Press');
    t.check(`${tag}: an entry with no steps yet: cues only, no ▶`, pp.label === 'How to do it · 1 cue' && !pp.play && pp.steps === 0, pp.label);

    // 3. the Spine's cues win; a card's own cues are only the fallback
    t.check(`${tag}: the squat shows the Spine's cues, not its own`, sq.cues.indexOf('OWN SQUAT CUE') < 0 && sq.cues.indexOf('Drive the floor away') >= 0, sq.cues.join(' | '));
    const my = await how(p, 'Mystery Press');
    t.check(`${tag}: a lift with no entry keeps its own cues`, my.cues.join('|') === 'OWN MYSTERY CUE' && my.label === 'How to do it · 1 cue', JSON.stringify(my));
    const cl = await how(p, 'Cueless Lift');
    t.check(`${tag}: an entry with steps and no cues: its steps, and the card's own cues`, cl.steps === 3 && cl.cues.join('|') === 'OWN CUELESS CUE', JSON.stringify(cl));

    // 4. circuits: a warm-up row folds steps with cues; a working circuit folds only its steps
    const warm = await p.evaluate(`(() => { const c = ${circuitCard('Hip Primer')}; if (c.classList.contains('collapsed')) toggleExpand(c);
      const row = [...c.querySelectorAll('.round-row')].find(r => r.textContent.includes('Cat-Cow'));
      const vis = e => !!(e && e.offsetParent && e.getBoundingClientRect().height > 0);
      const before = { steps: vis(row.querySelector('.ex-steps')), cues: vis(row.querySelector('.ex-cue')), tog: vis(row.querySelector('.round-cue-tog')) };
      row.querySelector('.round-row-main').click();
      const st = row.querySelector('.ex-steps'), cu = row.querySelector('.ex-cue');
      const after = { steps: vis(st), cues: vis(cu), order: st && cu ? st.getBoundingClientRect().top < cu.getBoundingClientRect().top : false, n: row.querySelectorAll('.ex-steps li').length };
      const plain = [...c.querySelectorAll('.round-row')].find(r => r.textContent.includes('90/90'));
      c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -120);
      return { before, after, plainFolds: plain.classList.contains('has-cues'), over: c.scrollWidth - c.clientWidth }; })()`);
    t.check(`${tag}: warm-up row: steps and cues folded until the row is tapped`, !warm.before.steps && !warm.before.cues && warm.before.tog, JSON.stringify(warm.before));
    t.check(`${tag}: warm-up row: a tap shows the steps, then the cues`, warm.after.steps && warm.after.cues && warm.after.order && warm.after.n === 2, JSON.stringify(warm.after));
    t.check(`${tag}: a warm-up row with no entry has nothing to fold`, !warm.plainFolds && warm.over <= 0, JSON.stringify(warm));
    if (w === 360 && !dark) await shot(p, 'warmup-circuit-360');

    const work = await p.evaluate(`(() => { const c = ${circuitCard('Press and Pull')}; if (c.classList.contains('collapsed')) toggleExpand(c);
      const rows = [...c.querySelectorAll('.round-row')];
      const press = rows.find(r => r.textContent.includes('Dumbbell Bench Press')), row2 = rows.find(r => r.textContent.includes('Single-Arm'));
      const vis = e => !!(e && e.offsetParent && e.getBoundingClientRect().height > 0);
      const tog = press.querySelector('.round-how-tog');
      const h0 = Math.round(c.getBoundingClientRect().height);
      const out = { cuesOpen: vis(press.querySelector('.ex-cue')), cues: [...press.querySelectorAll('.ex-cue')].map(e => e.textContent.trim()),
        stepsShown: vis(press.querySelector('.ex-steps')), tog: vis(tog), togText: tog ? tog.textContent.replace(/[\\s\\u00a0]+/g, ' ').replace('›', '').trim() : '',
        togH: tog ? Math.round(tog.getBoundingClientRect().height) : 0, row2Tog: vis(row2.querySelector('.round-how-tog')), h0 };
      setSpine(SPINE.map(e => Object.assign({}, e, { steps: [] }))); paintSpine();
      out.hNoSteps = Math.round(c.getBoundingClientRect().height);
      return out; })()`);
    await p.evaluate(s => { setSpine(s); paintSpine(); }, spine());
    t.check(`${tag}: working circuit: the cues stay open, and they are the Spine's`, work.cuesOpen && work.cues.indexOf('SPINE PRESS CUE') >= 0 && work.cues.indexOf('OWN PRESS CUE') < 0, JSON.stringify(work.cues));
    t.check(`${tag}: working circuit: the steps are folded behind "How to do it · 5 steps"`, !work.stepsShown && work.tog && work.togText === 'How to do it · 5 steps', JSON.stringify(work));
    t.check(`${tag}: working circuit: an item with no steps has no How to do it line`, !work.row2Tog, JSON.stringify(work));
    t.check(`${tag}: working circuit: steps add one line only (${work.h0 - work.hNoSteps} px)`, work.h0 - work.hNoSteps === work.togH + 2 && work.togH <= 40, JSON.stringify(work));
    const opened = await p.evaluate(`(() => { const c = ${circuitCard('Press and Pull')};
      const press = [...c.querySelectorAll('.round-row')].find(r => r.textContent.includes('Dumbbell Bench Press'));
      const tog = press.querySelector('.round-how-tog'); tog.scrollIntoView({ block: 'center' });
      const r = tog.getBoundingClientRect(), hit = document.elementFromPoint(r.left + 10, r.top + r.height / 2);
      const ok = !!(hit && hit.closest('.round-how-tog'));
      tog.click();
      const st = press.querySelector('.ex-steps');
      return { hit: ok, shown: !!(st && st.offsetParent), n: press.querySelectorAll('.ex-steps li').length, aria: tog.getAttribute('aria-expanded'),
        kit: (press.querySelector('.ex-kit') || {}).textContent, over: c.scrollWidth - c.clientWidth, side: document.documentElement.scrollWidth - innerWidth }; })()`);
    t.check(`${tag}: working circuit: a tap on the line shows the 5 steps`, opened.hit && opened.shown && opened.n === 5 && opened.aria === 'true' && opened.kit === 'You need: dumbbells, bench', JSON.stringify(opened));
    t.check(`${tag}: working circuit: nothing runs sideways`, opened.over <= 0 && opened.side <= 0, JSON.stringify(opened));
    if (w === 360 && !dark) {
      await p.evaluate(`(() => { const c = ${circuitCard('Press and Pull')}; c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -110); })()`);
      await shot(p, 'working-circuit-360');
    }

    // 5. Guided: the steps travel with the card
    await p.evaluate(() => { startTimerNow('1'); openGuided('1'); });
    await p.waitForTimeout(400);
    const g = await p.evaluate(() => {
      const i = STEP.seq.findIndex(s => s.card.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat');
      STEP.pos = i; renderStep();
      const hw = document.querySelector('#step-scroll .ex-how');
      return { steps: document.querySelectorAll('#step-scroll .ex-steps li').length, label: hw ? hw.querySelector('.ex-how-sum').textContent.replace(/[\s ]+/g, ' ') : '' };
    });
    t.check(`${tag}: Guided carries the steps with the card`, g.steps === 5 && /5 steps/.test(g.label), JSON.stringify(g));
    await p.evaluate(() => closeStepMode());

    // 6. the About sheet (Changeover, 2026-10-12): from Library → Exercises "How do I do it?" (the video, You need, the
    // steps, the cues) is the first band, above "What does it do?"; from a card, none of it (scripts/headless/about-sheet.js has the rest)
    const sheet = await p.evaluate(`(() => {
      openExerciseSheet('barbell-back-squat', xlCardFor('barbell-back-squat'), true);
      const m = document.querySelector('#hist-overlay .readiness-modal');
      const y = sel => { const e = m.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + m.scrollTop) : null; };
      const qs = [...m.querySelectorAll('.ax-band h3.ax-q')];
      const does = qs.find(q => q.textContent === 'What does it do?');
      const lib = { video: y('.ax-how .ex-vunit'), kit: y('.ax-how .ex-kit'), steps: y('.ax-steps'), cues: y('.ax-cues'),
        does: does ? Math.round(does.getBoundingClientRect().top + m.scrollTop) : null,
        n: m.querySelectorAll('.ax-steps li').length, label: qs.length ? qs[0].textContent : '', over: m.scrollWidth - m.clientWidth };
      closeHistorySheet();
      openExerciseSheet('barbell-back-squat', ${H.card('Barbell Back Squat')});
      const fromCard = { steps: m.querySelectorAll('.ax-steps, .ex-steps').length, video: m.querySelectorAll('.ex-vunit').length, cues: m.querySelectorAll('.ax-cues').length };
      closeHistorySheet();
      return { lib, fromCard };
    })()`);
    const L = sheet.lib;
    t.check(`${tag}: About sheet from Library: How do I do it? (video, You need, steps, cues) before What does it do?`,
      L.label === 'How do I do it?' && L.n === 5 && L.video < L.kit && L.kit < L.steps && L.steps < L.cues && (L.does == null || L.cues < L.does) && L.over <= 0, JSON.stringify(L));
    t.check(`${tag}: About sheet from a card: no video, steps or cues`, sheet.fromCard.steps === 0 && sheet.fromCard.video === 0 && sheet.fromCard.cues === 0, JSON.stringify(sheet.fromCard));
    if (w === 360 && !dark) {
      await p.evaluate(() => { openExerciseSheet('box-jump', null, true); });
      await p.waitForTimeout(400);
      await shot(p, 'about-sheet-library-360');
      await p.evaluate(() => closeHistorySheet());
    }

    // 7. a Library session: the Spine's cues win on a standard card, a simple card and a circuit item; How stays open
    const lib = await p.evaluate(async lib => {
      _libItems['test-session.json'] = lib;
      await openWorkout('test-session.json');
      const body = document.getElementById('ws-body');
      const card = nm => [...body.querySelectorAll('.checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
      const cuesOf = el => [...el.querySelectorAll('.ex-cue')].map(e => e.textContent.trim());
      const row = card('Rowing'), sq = card('Barbell Back Squat'), pair = card('Lib Pair');
      paintAllLastTime();   // history arriving while a Library session is open never folds it
      return { rowOpen: row.querySelector('.ex-how').open, rowCues: cuesOf(row), rowSteps: row.querySelectorAll('.ex-steps li').length,
        sqCues: cuesOf(sq), sqOpen: sq.querySelector('.ex-how').open, pairCues: cuesOf(pair) };
    }, LIB);
    t.check(`${tag}: Library: the Spine's cues win on every card, and How stays open`,
      lib.rowOpen && lib.sqOpen && lib.rowSteps === 3 && lib.rowCues.indexOf('OWN LIB ROW CUE') < 0 && lib.sqCues.indexOf('OWN LIB SQUAT CUE') < 0
      && lib.pairCues.indexOf('SPINE PRESS CUE') >= 0 && lib.pairCues.indexOf('OWN LIB PRESS CUE') < 0, JSON.stringify(lib));
    t.check(`${tag}: no sideways scroll, no page errors`, (await sideways(p)) <= 0 && p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // 8. a simple card opens How to do it by itself the first time, and starts folded once met
  for (const [label, hist, want] of [['first time (no history)', [], true], ['first time (history without it)', H.HISTORY, true], ['met before', HIST_MET, false]]) {
    const { ctx, p } = await H.openProgram(browser, { prog: programme(), spine: spine(), hist });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    const r = await how(p, 'Rowing');
    t.check(`simple card, ${label}: How to do it ${want ? 'opens by itself' : 'starts folded'}`, r && !r.hidden && r.open === want && r.steps === 3, JSON.stringify(r));
    // a simple card is otherwise untouched: no Last time, no set log
    const s = await p.evaluate(`(() => { const c = ${H.card('Rowing')}; return { lt: c.querySelectorAll('.lt-strip').length, log: c.querySelectorAll('.ex-set-log').length }; })()`);
    t.check(`simple card, ${label}: still no Last time and no set log`, s.lt === 0 && s.log === 0, JSON.stringify(s));
    t.check(`simple card, ${label}: no page errors`, p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // 9. an old phone's cached Spine has no steps at all: the cards still draw, cues only
  {
    const old = spine().map(e => { const o = Object.assign({}, e); delete o.steps; return o; });
    const { ctx, p } = await H.openProgram(browser, { prog: programme(), spine: old });
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    const r = await how(p, 'Box Jump');
    t.check('an old spinecache with no steps: cues only, no error', r && r.steps === 0 && r.label === 'How to do it · 1 cue' && p.errs.length === 0, JSON.stringify(r) + ' ' + p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  const failed = t.report();
  console.log('screenshots: ' + shots);
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
