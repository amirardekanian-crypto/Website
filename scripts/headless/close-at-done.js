// A session closes at Done (Line Call, Amir 2026-10-13: "yes to all recommended, start with closing the session at Done"):
// node scripts/headless/close-at-done.js
//
// The set log, an exercise's RPE and a circuit's round ratings are kept per exercise NAME, and almost every programme repeats a
// name across days. Before this, a finished day's ticks stayed in those keys until the midnight sweep: right after Done, Home
// called the next day that shares a name "In progress" with a Resume button, and a second day trained the same evening opened
// with the first day's sets and would have reported them. Done now keeps the day's own copy (<id>_donelog_d<N>) and carries
// the per-name keys as the sweep does (closeSessionAtDone(), carryExerciseKeys()). Checked here the way an athlete meets it:
//   1. Home right after Done: Next up is the next day, not "In progress", and no Resume.
//   2. The next day starts clean: no ticks, no ratings, last time's weight as LAST; its finish card counts nothing done.
//   3. The finished day still reads done (every card, the reps line with its RPEs, the counts), and a rating changed after
//      Done re-saves the record it had (sets, weights, round ratings).
//   4. The cloud cannot tick the closed keys again, with or without the finish stamp having reached it.
//   5. Reset on the finished day puts its typed weights back and removes the copy; the midnight sweep removes the copy too.
//   6. A day already under way when another finishes keeps the names it shares (nothing it logged is lost).
//   7. An old circuit (no rx, its own "×3 Rounds") closes every round, not only the first.
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const SQUAT = 'Barbell Back Squat';
const ENGINE = 'Engine Room', OLD = 'Old Engine';

// Day 1 and Day 2 share Rowing, the squat, a working circuit and an old circuit.
function prog() {
  const P = H.fixture();
  const [d1, d2] = P.workouts.days;
  d2.blocks[1].exercises.unshift({ name: SQUAT, exId: 'barbell-back-squat', type: 'standard', rx: { sets: 3, reps: 5, rpe: 8, rest: 150 } });
  const engine = () => ({ type: 'circuit', name: ENGINE, rx: { rounds: 2, rest: 60 },
    items: [{ name: 'Kettlebell Swing', rx: { reps: 12 } }, { name: 'Battle Rope Waves', rx: { time: '30s' } }] });
  const old = () => ({ type: 'circuit', name: OLD, rounds: '×3 Rounds', restSec: 60,
    items: [{ name: 'Burpee', chips: [{ label: '×8 Reps' }] }, { name: 'Jump Rope', chips: [{ label: '30 seconds' }] }] });
  d1.blocks.push({ title: 'Finisher', exercises: [engine(), old()] });
  d2.blocks.push({ title: 'Finisher', exercises: [engine(), old()] });
  return P;
}

const inDay = (day, nm) => `[...document.querySelectorAll('#day${day} .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === ${JSON.stringify(nm)})`;

// Logs the squat of `day` (80 kg, RPE 8 on each set, `sets` of them), through the card's own boxes.
async function logSquat(p, day, sets) {
  await p.evaluate(`(() => { const c = ${inDay(day, SQUAT)}; if (c.classList.contains('collapsed')) toggleExpand(c); c.id = 'sq${day}'; })()`);
  await p.waitForTimeout(250);
  await p.fill(`#sq${day} .ex-set-row[data-set-idx="0"] .ex-set-weight`, '80');
  for (let s = 0; s < sets; s++) {
    await p.click(`#sq${day} .ex-set-row[data-set-idx="${s}"] .ex-set-check`); await p.waitForTimeout(120);
    await p.click(`#sq${day} .ex-set-row[data-set-idx="${s}"] .rpe-btn[data-rpe="8"]`); await p.waitForTimeout(120);
  }
}
// Finishes Day 1 the way an athlete does: the squat set by set, every other card by its ring, the circuits' rounds rated, the
// session rated 7, Done.
async function finishDay1(p, opts = {}) {
  await p.evaluate(() => { goTo('home'); openDayView('1'); });
  await p.waitForTimeout(500);
  await logSquat(p, 1, 4);
  await p.evaluate(([E, O]) => {
    document.querySelectorAll('#day1 .checklist-item').forEach(c => { if (!c.classList.contains('checked')) toggleCheckOnly(c, '1'); });
    const rate = (nm, vals) => {
      const c = [...document.querySelectorAll('#day1 .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === nm);
      c.querySelectorAll('.rpe-row').forEach((row, i) => { const b = row.querySelector(`.rpe-btn[data-rpe="${vals[i]}"]`); if (b && !b.classList.contains('selected')) b.click(); });
    };
    rate(E, ['7', '8']); rate(O, ['6', '7', '9']);
    try { hideAaToast(); } catch (e) {}
  }, [ENGINE, OLD]);
  await p.waitForTimeout(400);
  if (opts.beforeDone) await opts.beforeDone();
  await p.click('#confirm-1 .complete-rpe-btn[data-rpe="7"]'); await p.waitForTimeout(150);
  await p.click('#confirm-1 .confirm-btn'); await p.waitForTimeout(900);
}
const state = (p, day) => p.evaluate(([day, SQ, E, O]) => {
  const sq = loadSetLog(SQ, 4, day);
  const rounds = nm => [1, 2, 3].map(r => rpeOn(day, circuitRpeKey(nm, r)));
  const st = getDayCompletion(day);
  return { squat: sq, engine: rounds(E), old: rounds(O), done: st.done, total: st.total, inProgress: dayInProgress(day),
    copy: !!localStorage.getItem(ATHLETE_ID + '_donelog_d' + day) };
}, [String(day), SQUAT, ENGINE, OLD]);

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // ── 1–3: Done, Home, the next day, the finished day, a later rating ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), stub: { library: H.library() } });
    await finishDay1(p);
    const d1 = await state(p, 1), d2 = await state(p, 2);
    C.check('Done keeps the day\'s own copy', d1.copy);
    await p.evaluate(() => { try { hideAaToast(); } catch (e) {} goTo('home'); });
    await p.waitForTimeout(600);
    const home = await p.evaluate(() => document.getElementById('screen-home').innerText.replace(/\s+/g, ' '));
    C.check('Home after Done: no "In progress"', !/in progress/i.test(home), home.slice(0, 220));
    C.check('Home after Done: no Resume', !/\bresume\b/i.test(home), home.slice(0, 220));
    C.check('Home after Done: Next up is Day 2', /next up\s*·?\s*day 2/i.test(home), home.slice(0, 220));
    C.check('Day 2 is not in progress and counts nothing done', !d2.inProgress && d2.done === 0, JSON.stringify({ ip: d2.inProgress, done: d2.done }));
    C.check('Day 2\'s squat: no tick, no RPE, the weight is LAST (80)', d2.squat.every(s => !s.d && !s.r && !s.w) && d2.squat[0].lw === '80', JSON.stringify(d2.squat));
    C.check('Day 2\'s circuits carry no round rating', d2.engine.every(r => !r) && d2.old.every(r => !r), JSON.stringify([d2.engine, d2.old]));
    C.check('Day 1 still counts every set done', d1.done === d1.total && d1.total > 0, d1.done + ' of ' + d1.total);
    C.check('Day 1 keeps its squat (80 kg, ticked, RPE 8)', d1.squat.every(s => s.d && s.r === '8') && d1.squat[0].w === '80', JSON.stringify(d1.squat));
    C.check('Day 1 keeps its round ratings, all three of the old circuit', d1.engine.slice(0, 2).join() === '7,8' && d1.old.join() === '6,7,9', JSON.stringify([d1.engine, d1.old]));

    await p.evaluate(() => openDayView('2')); await p.waitForTimeout(500);
    const d2view = await p.evaluate(([SQ]) => {
      const c = [...document.querySelectorAll('#day2 .checklist-item')].find(x => x.querySelector('.item-name').textContent.trim() === SQ);
      const conf = document.getElementById('confirm-2');
      return { checked: c.classList.contains('checked'), sel: [...document.querySelectorAll('#day2 .rpe-btn.selected')].length,
        conf: conf.classList.contains('visible') ? conf.innerText.replace(/\s+/g, ' ') : '' };
    }, [SQUAT]);
    C.check('Day 2 opens clean: squat not done, no rating selected, no finish card', !d2view.checked && d2view.sel === 0 && !d2view.conf, JSON.stringify(d2view));

    await p.evaluate(() => { goTo('home'); openDayView('1'); }); await p.waitForTimeout(500);
    const d1view = await p.evaluate(() => ({
      unchecked: [...document.querySelectorAll('#day1 .checklist-item')].filter(c => !c.classList.contains('checked')).map(c => c.querySelector('.item-name').textContent.trim()),
      finished: document.getElementById('complete-1').classList.contains('visible'),
    }));
    C.check('Day 1 reopened: every card done, the finished card shown', !d1view.unchecked.length && d1view.finished, JSON.stringify(d1view));
    const line = await p.evaluate(`doneLineText(${inDay(1, SQUAT)})`);
    C.check('Day 1\'s squat line still names its efforts', /Effort 8 8 8 8/.test(line), line);

    // A rating changed after Done re-saves the session: with Day 1's own sets, not the carried ones.
    await p.evaluate(() => { try { setRateFold('1', true); paintRateFold('1'); } catch (e) {} });
    await p.evaluate(() => { const b = document.querySelector('#complete-1 .complete-rpe-btn[data-rpe="6"]'); if (b) b.click(); });
    await p.waitForTimeout(500);
    const saved = await p.evaluate(([SQ, E]) => {
      const calls = (window.__STUB.params || []).filter(x => x[0] === 'save_session' && x[1] && Number(x[1].p_day) === 1);
      const last = calls[calls.length - 1];
      if (!last) return null;
      const s = last[1].p_session;
      const sq = (s.log || []).find(e => e.ex === SQ), en = (s.log || []).find(e => e.ex === E);
      return { rpe: s.session_rpe, status: s.status, sq: sq && sq.sets, en: en && en.rounds, n: calls.length };
    }, [SQUAT, ENGINE]);
    C.check('A rating changed after Done re-saves Day 1 (RPE 6, Complete)', !!saved && saved.rpe === '6' && saved.status === 'Complete', JSON.stringify(saved && { rpe: saved.rpe, status: saved.status, n: saved.n }));
    C.check('…with its own sets (80 × 4, all ticked) and round ratings', !!saved && saved.sq && saved.sq.length === 4 && saved.sq.every(s => s.d && s.w === '80')
      && saved.en && saved.en.map(r => r.r).join() === '7,8', JSON.stringify(saved && [saved.sq, saved.en]));
    C.check('no page errors (Done, Home, Day 2, Day 1, the rating)', !p.errs.length, JSON.stringify(p.errs));

    // ── 4: the cloud cannot tick the closed keys again ──
    const pulled = await p.evaluate(async ([SQ]) => {
      const id = ATHLETE_ID, k = id + '_setlog_' + SQ.replace(/\s+/g, '_');
      const ticked = JSON.stringify([1, 2, 3, 4].map(() => ({ w: '80', n: '', r: '8', d: true })));
      const out = {};
      for (const withStamp of [true, false]) {
        const blob = { [k]: ticked, [id + '_timer_1']: JSON.stringify({ sessionStart: new Date().toISOString() }) };
        if (withStamp) blob[id + '_completed_d1'] = localStorage.getItem(id + '_completed_d1');
        window.__STUB.progress = blob;
        const r = await syncFromCloud(id, null);
        out[withStamp ? 'stamp' : 'noStamp'] = { r, day2: loadSetLog(SQ, 3, '2').some(s => s.d), day1: loadSetLog(SQ, 4, '1').every(s => s.d) };
      }
      return out;
    }, [SQUAT]);
    C.check('A pull with Day 1\'s ticks (the cloud has its finish) leaves Day 2 clean', pulled.stamp.r === 'pulled' && !pulled.stamp.day2 && pulled.stamp.day1, JSON.stringify(pulled.stamp));
    C.check('…and so does one whose finish never reached the cloud (this phone\'s stamp counts)', pulled.noStamp.r === 'pulled' && !pulled.noStamp.day2 && pulled.noStamp.day1, JSON.stringify(pulled.noStamp));

    // ── 5: Reset puts the weights back and removes the copy ──
    await p.evaluate(() => resetDay('1')); await p.waitForTimeout(300);
    const reset = await p.evaluate(([SQ]) => ({ copy: localStorage.getItem(ATHLETE_ID + '_donelog_d1'),
      live: JSON.parse(localStorage.getItem(ATHLETE_ID + '_setlog_' + SQ.replace(/\s+/g, '_')) || '[]'), done: getDayCompletion('1').done }), [SQUAT]);
    C.check('Reset on the finished day: the copy goes, nothing is done', reset.copy === null && reset.done === 0, JSON.stringify({ copy: reset.copy, done: reset.done }));
    C.check('Reset keeps the typed weights, as it always did (80, untick)', reset.live.length === 4 && reset.live.every(s => s.w === '80' && !s.d && !s.r), JSON.stringify(reset.live));
    await ctx.close();
  }

  // ── 5b: the midnight sweep removes the copy ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), stub: { library: H.library() } });
    await finishDay1(p);
    const swept = await p.evaluate(() => {
      const id = ATHLETE_ID, old = new Date(Date.now() - 2 * 86400000).toDateString() + '|' + progToken();
      const dl = JSON.parse(localStorage.getItem(id + '_donelog_d1'));
      localStorage.setItem(id + '_completed_d1', old);
      dl.sess = old; localStorage.setItem(id + '_donelog_d1', JSON.stringify(dl));
      localStorage.removeItem(id + '_timer_1');
      autoResetStaleDays();
      return { copy: localStorage.getItem(id + '_donelog_d1'), stamp: localStorage.getItem(id + '_completed_d1') };
    });
    C.check('The midnight sweep removes the day\'s copy with its stamp', swept.copy === null && swept.stamp === null, JSON.stringify(swept));
    C.check('no page errors (the sweep)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  // ── 6: a day under way keeps the names it shares ──
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(), stub: { library: H.library() } });
    await finishDay1(p, { beforeDone: async () => {
      // Day 2 started first (its clock running), with one squat set ticked.
      await p.evaluate(() => { openDayView('2'); try { startTimerNow('2'); } catch (e) {} });
      await p.waitForTimeout(300);
      await p.evaluate(() => openDayView('1'));
      await p.waitForTimeout(300);
    } });
    const st = await p.evaluate(([SQ]) => ({ underway: sessionStartedToday('2', new Date().toDateString()),
      live: JSON.parse(localStorage.getItem(ATHLETE_ID + '_setlog_' + SQ.replace(/\s+/g, '_')) || '[]') }), [SQUAT]);
    C.check('A day under way keeps a shared name untouched (its ticks stay)', st.underway && st.live.length && st.live.every(s => s.d), JSON.stringify(st));
    C.check('no page errors (a day under way)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
