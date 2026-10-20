// What the athlete types and finishes reaches the server whole, and what the server holds never undoes it (2026-10-20):
//   node scripts/headless/sync-integrity.js
//
// A code-quality pass over program.html's data path (log, save, sync, load back) found seven ways for the app to lose or
// undo something without an error, each reproduced in a browser before it was fixed. One group of checks per fix, so
// the next change to this path fails here and not on an athlete's phone:
//   1. An exercise's note is in the session record whenever the record is saved on a LATER date than the note was typed:
//      a day filed at the next morning's open (fileUnfinished()), or a rating changed after midnight inside the grace.
//      The note's "shown only on the day it was typed" gate had dropped it, and save_session keeps the newest log.
//   2. Opening the app is not an edit: a bare open leaves <id>_lastEditAt alone. Every open used to re-stamp it (the
//      cards write their own state back), so the phone opened LAST won every conflict on the pull and pushed its older
//      copy over a newer edit from another phone (a day note; a habit's larger count).
//   3. A key deleted offline (waiting in <id>_drops) is not merged back from the cloud by the next open's pull.
//   4. A day filed by fileUnfinished() with its clock still running goes with no duration (it said 690 min for a
//      19:00 start filed at 06:30).
//   5. Resetting a finished day leaves alone the sets of another day that shares an exercise name and is under way.
//   6. A weight fixed on a finished day's card is sent again (save_session), and merely opening the app is not an edit.
//   7. <id>_crewboard, a cache of other athletes' rows, never goes up with the progress and is never pulled over the
//      phone's own.
// The check names start with their group's number.
//
// Serve the repo first (python -m http.server <port>, see lib.js; BASE=http://127.0.0.1:<port>), then run this.
'use strict';
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ID = H.ID;
const SQUAT_DONE = [{ w: '70', n: '', r: '7', d: true }, { w: '70', n: '', r: '7', d: true }, { w: '', n: '', r: '', d: false }, { w: '', n: '', r: '', d: false }];
const NOTE = 'left knee pinched on set 2';

// A page that is changing under the test (fileUnfinished() reloads it once) throws on evaluate; wait and try again.
async function ev(p, fn, arg) {
  for (let i = 0; i < 6; i++) {
    try { return await p.evaluate(fn, arg); } catch (e) {
      if (!/context|navigat|destroyed/i.test(String(e.message))) throw e;
      await p.waitForTimeout(500);
    }
  }
  return p.evaluate(fn, arg);
}
const calls = (p, rpc) => ev(p, n => (window.__STUB.params || []).filter(x => x[0] === n).map(x => x[1]), rpc);
const saves = p => calls(p, 'save_session');
const pushes = p => calls(p, 'save_progress');
const queue = p => ev(p, id => JSON.parse(localStorage.getItem(id + '_csq') || '[]'), ID);
const stored = (p, suffix) => ev(p, ([id, s]) => localStorage.getItem(id + s), [ID, suffix]);
const squatOf = rec => ((rec && rec.p_session && rec.p_session.log) || []).find(e => e.ex === 'Barbell Back Squat');

async function waitLoaded(p) {
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await p.waitForTimeout(400);
}
async function reload(p) { await p.reload({ waitUntil: 'domcontentloaded' }); await waitLoaded(p); }
// The stub's config lives in localStorage; change it, then open the app again.
async function reopen(p, change) {
  await p.evaluate(ch => { const c = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); Object.assign(c, ch); localStorage.setItem('__stubcfg', JSON.stringify(c)); }, change || {});
  await reload(p);
}
// The pull runs behind the first paint on a returning phone: wait for it to be asked, then for what follows it.
async function pulled(p, extra) {
  try { await p.waitForFunction(() => (window.__STUB.calls || []).includes('rpc:get_progress'), null, { timeout: 15000 }); } catch (e) { /* the check below says what is wrong */ }
  await p.waitForTimeout(extra || 2200);
}
// Move the page's clock (the app reads `new Date()` and Date.now()) to a moment in the future, from now on.
function shiftClock(p, ms) {
  return p.evaluate(off => {
    const R = Date;
    window.Date = class extends R {
      constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); }
      static now() { return R.now() + off; }
    };
  }, ms);
}
// Tick squat sets on Day 1 (two at 70 unless given), rate it and tap Done, the way the athlete does.
function finishDay1(p, sets) {
  return p.evaluate(([id, sets]) => {
    localStorage.setItem(id + '_setlog_Barbell_Back_Squat', JSON.stringify(sets));
    localStorage.setItem(id + '_srpe_1', '7');
    finishDay('1');
  }, [ID, sets || SQUAT_DONE]);
}
// The stub's progress row, as if another phone had pushed it.
const cloudRow = (p, row) => p.evaluate(c => { const g = JSON.parse(localStorage.getItem('__stubcfg')); g.progress = c; localStorage.setItem('__stubcfg', JSON.stringify(g)); }, row);
const hoursAgo = h => new Date(Date.now() - h * 3600e3).toISOString();

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  const errs = [];
  const done = async (ctx, p) => { errs.push(...p.errs); await ctx.close(); };

  // 1a. A day trained yesterday and never finished is filed at this morning's open. The note typed yesterday goes with it.
  {
    const yest = new Date(Date.now() - DAY); yest.setHours(18, 0, 0, 0);
    // The server holds every save, so the record can be read in the queue.
    const { ctx, p } = await H.openProgram(browser, { stub: { stall: { save_session: true } }, seed: {
      _setlog_Barbell_Back_Squat: SQUAT_DONE,
      _touched_d1: yest.toDateString(),
      _snote_Barbell_Back_Squat: { d: ymd(yest), v: NOTE },
    } });
    try { await p.waitForFunction(id => JSON.parse(localStorage.getItem(id + '_csq') || '[]').length > 0, ID, { timeout: 8000 }); } catch (e) { /* nothing was filed: the check says so */ }
    await p.waitForTimeout(400);
    const rec = (await queue(p)).find(x => x.p_day === 1);
    t.check('1a. the unfinished day is filed at the next open', !!rec, JSON.stringify((await queue(p)).map(x => [x.p_day, x.p_completed_on])));
    t.check('1a. …under the day it was trained', rec && rec.p_completed_on === ymd(yest), rec && rec.p_completed_on);
    t.check('1a. …with the exercise note typed that day', !!rec && (squatOf(rec) || {}).note === NOTE, JSON.stringify(rec && squatOf(rec) && squatOf(rec).note));
    await done(ctx, p);
  }

  // 1b. Finished before midnight; the rating changes at 00:20 (inside the grace) and the same row is sent again with its notes.
  {
    const { ctx, p } = await H.openProgram(browser);
    await p.evaluate(([id, note]) => localStorage.setItem(id + '_snote_Barbell_Back_Squat', JSON.stringify({ d: ceilingToday(), v: note })), [ID, NOTE]);
    await finishDay1(p);
    await p.waitForTimeout(500);
    const first = await saves(p);
    t.check('1b. at Done the record carries the note', first.length >= 1 && (squatOf(first[first.length - 1]) || {}).note === NOTE, JSON.stringify(squatOf(first[first.length - 1]) && squatOf(first[first.length - 1]).note));
    const midnight = new Date(); midnight.setHours(24, 20, 0, 0);
    await shiftClock(p, midnight.getTime() - Date.now());
    await p.evaluate(id => { localStorage.setItem(id + '_srpe_1', '8'); recordSessionToCloud('1'); }, ID);
    await p.waitForTimeout(500);
    const all = await saves(p), last = all[all.length - 1] || {};
    t.check('1b. after midnight the rating is sent again for the SAME row', all.length > first.length && last.p_completed_on === first[0].p_completed_on && last.p_session.session_rpe === '8', JSON.stringify([all.length, last.p_completed_on, last.p_session && last.p_session.session_rpe]));
    t.check('1b. …and the note is still in it', (squatOf(last) || {}).note === NOTE, JSON.stringify(squatOf(last) && squatOf(last).note));
    await done(ctx, p);
  }

  // 2. Opening the app is not an edit.
  {
    // 2a. A stamp from a fortnight ago, a bare reopen.
    const { ctx, p } = await H.openProgram(browser);
    const old = '2026-10-01T10:00:00.000Z';
    await p.evaluate(([id, old]) => Storage.prototype.setItem.call(localStorage, id + '_lastEditAt', old), [ID, old]);
    await reload(p);
    await pulled(p, 1200);
    const after = await stored(p, '_lastEditAt');
    t.check('2a. a bare open leaves the "last edited" stamp where it was', after === old, after);
    await done(ctx, p);
  }
  {
    // 2b. Phone B last edited 3 h ago; phone A pushed a newer day note 1 h ago. B is simply opened.
    const { ctx, p } = await H.openProgram(browser);   // the first open writes the saved plan, so the next one takes the default way: plan first, pull behind it
    await p.evaluate(([id, t3]) => {
      localStorage.setItem(id + '_daynote_1', 'OLD note typed on phone B');
      Storage.prototype.setItem.call(localStorage, id + '_lastEditAt', t3);
    }, [ID, hoursAgo(3)]);
    await cloudRow(p, { [ID + '_daynote_1']: 'NEWER note typed on phone A', [ID + '_snapAt']: hoursAgo(1) });
    await reload(p);
    await pulled(p);
    t.check('2b. the open took the default way (saved plan first, pull behind it)', await p.evaluate(() => typeof PLAN_OFFLINE !== 'undefined' && !!PLAN_OFFLINE.fast));
    const note = await stored(p, '_daynote_1');
    t.check('2b. the newer edit from the other phone wins the pull', note === 'NEWER note typed on phone A', note);
    const stale = (await pushes(p)).filter(x => (x.p_data || {})[ID + '_daynote_1'] === 'OLD note typed on phone B');
    t.check('2b. …and the older copy is never pushed over it', stale.length === 0, stale.length + ' pushes carried the old note');
    await done(ctx, p);
  }
  {
    // 2c. Water: phone A pushed 4 glasses an hour ago, phone B has 2 today. The larger number wins, on both.
    const today = ymd(new Date());
    const { ctx, p } = await H.openProgram(browser);
    await p.evaluate(([id, today, t3]) => {
      localStorage.setItem(id + '_hab_log', JSON.stringify({ [today]: { water: 2 } }));
      Storage.prototype.setItem.call(localStorage, id + '_lastEditAt', t3);
    }, [ID, today, hoursAgo(3)]);
    await cloudRow(p, { [ID + '_hab_log']: JSON.stringify({ [today]: { water: 4 } }), [ID + '_snapAt']: hoursAgo(1) });
    await reload(p);
    await pulled(p);
    const log = JSON.parse((await stored(p, '_hab_log')) || '{}');
    t.check('2c. the habit log keeps the larger count (4, not 2)', (log[today] || {}).water === 4, JSON.stringify(log[today]));
    const lows = (await pushes(p)).filter(x => { try { return JSON.parse((x.p_data || {})[ID + '_hab_log'])[today].water < 4; } catch (e) { return false; } });
    t.check('2c. …and the smaller one is never pushed over it', lows.length === 0, lows.length + ' pushes');
    await done(ctx, p);
  }

  // 3. A delete made with no signal, still waiting to go up, is not undone by the next open's pull.
  {
    const cloud = { [ID + '_completed_d1']: new Date().toDateString() + '|c1', [ID + '_srpe_1']: '7', [ID + '_snapAt']: hoursAgo(1) };
    // The phone Reset today's finished Day 1 offline and was put away before the push: no stamp, no rating, two deletes pending.
    const { ctx, p } = await H.openProgram(browser, { stub: { progress: cloud }, seed: {
      _drops: [ID + '_completed_d1', ID + '_srpe_1'],
      _setlog_Barbell_Back_Squat: SQUAT_DONE,
    } });
    await pulled(p, 2500);
    t.check('3. the stamp that was deleted stays deleted after the pull', (await stored(p, '_completed_d1')) === null, await stored(p, '_completed_d1'));
    t.check('3. …and so does the rating', (await stored(p, '_srpe_1')) === null, await stored(p, '_srpe_1'));
    t.check('3. Day 1 is not finished again', !(await p.evaluate(() => { const c = document.getElementById('complete-1'); return c && c.classList.contains('visible'); })));
    const back = (await pushes(p)).filter(x => (ID + '_completed_d1') in (x.p_data || {}));
    t.check('3. the push that follows does not carry it back up', back.length === 0, back.length + ' pushes carried completed_d1');
    await done(ctx, p);
  }

  // 4. A day filed at the next open with its clock still running goes with no duration.
  {
    const real = Date.now();
    const tm = new Date(real); tm.setDate(tm.getDate() + 1); tm.setHours(6, 30, 0, 0);   // 06:30 tomorrow
    const off = tm.getTime() - real;
    const startedAt = tm.getTime() - 11.5 * 3600e3;                                       // 19:00 "last night"
    const lastTick = new Date(startedAt + 3600e3);                                        // 20:00, the last set ticked
    const { ctx, p } = await H.openProgram(browser, { stub: { stall: { save_session: true } } });
    await p.evaluate(([id, sets, start, touched]) => {
      localStorage.setItem(id + '_setlog_Barbell_Back_Squat', JSON.stringify(sets));
      localStorage.setItem(id + '_touched_d1', touched);
      localStorage.setItem(id + '_timer_1', JSON.stringify({ acc: 0, running: true, resumeAt: start, finished: false, sessionStart: start, totalPausedMs: 0, pausedAt: null, sessionEnd: null }));
    }, [ID, SQUAT_DONE, startedAt, lastTick.toDateString()]);
    await ctx.addInitScript(off => {
      const R = Date;
      window.Date = class extends R {
        constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); }
        static now() { return R.now() + off; }
      };
    }, off);
    await reload(p);
    try { await p.waitForFunction(id => JSON.parse(localStorage.getItem(id + '_csq') || '[]').length > 0, ID, { timeout: 8000 }); } catch (e) { /* the check below says so */ }
    await p.waitForTimeout(400);
    const rec = (await queue(p))[0] || (await saves(p))[0];
    t.check('4. the unfinished day is filed', !!rec && /^Partial/.test(rec.p_session.status), rec && rec.p_session.status);
    t.check('4. …with no duration (the clock never stopped, the night is not the session)', !!rec && rec.p_session.duration_min === '', rec && JSON.stringify(rec.p_session.duration_min));
    t.check('4. …and no "Duration:" line in the summary', !!rec && !/Duration:/.test(rec.p_session.summary), rec && (rec.p_session.summary.split('\n').find(l => /Duration/.test(l)) || ''));
    await done(ctx, p);
  }

  // 5. Reset on a finished Day 1 leaves alone Day 2's sets: same exercise, under way (its clock started).
  {
    const prog = H.fixture();
    prog.workouts.days[1].blocks[1].exercises.unshift({ name: 'Barbell Back Squat', exId: 'barbell-back-squat', type: 'standard', rx: { sets: 3, reps: 5, rest: 120 } });
    const { ctx, p } = await H.openProgram(browser, { prog });
    const squat = () => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_setlog_Barbell_Back_Squat') || 'null'), ID);
    await finishDay1(p);
    await p.waitForTimeout(300);
    // Day 2 starts the same evening: two squat sets at 90 kg ticked, RPE 8, and its clock running.
    await p.evaluate(id => {
      localStorage.setItem(id + '_setlog_Barbell_Back_Squat', JSON.stringify([{ w: '90', n: '', r: '8', d: true, lw: '70' }, { w: '90', n: '', r: '8', d: true, lw: '70' }, { w: '', n: '', r: '', d: false, lw: '70' }]));
      localStorage.setItem(id + '_touched_d2', new Date().toDateString());
      localStorage.setItem(id + '_timer_2', JSON.stringify({ acc: 0, running: true, resumeAt: Date.now(), sessionStart: Date.now(), finished: false }));
    }, ID);
    await p.evaluate(() => resetDay('1'));
    await p.waitForTimeout(300);
    const sets = (await squat()) || [];
    t.check('5. Day 1 was reset', (await stored(p, '_completed_d1')) === null, await stored(p, '_completed_d1'));
    t.check('5. Day 2\'s ticked sets are still ticked', sets.filter(s => s.d).length === 2, JSON.stringify(sets.map(s => s.d)));
    t.check('5. …at the weight and rating it typed', sets.length >= 2 && sets[0].w === '90' && sets[0].r === '8' && sets[1].w === '90', JSON.stringify(sets.slice(0, 2).map(s => [s.w, s.r])));
    await done(ctx, p);
  }
  // 5b. The same when Day 2 was only ticked, its clock never started (touchedToday(), 2026-10-20).
  {
    const prog = H.fixture();
    prog.workouts.days[1].blocks[1].exercises.unshift({ name: 'Barbell Back Squat', exId: 'barbell-back-squat', type: 'standard', rx: { sets: 3, reps: 5, rest: 120 } });
    const { ctx, p } = await H.openProgram(browser, { prog });
    const squat = () => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_setlog_Barbell_Back_Squat') || 'null'), ID);
    await finishDay1(p);
    await p.waitForTimeout(300);
    await p.evaluate(id => {
      localStorage.setItem(id + '_setlog_Barbell_Back_Squat', JSON.stringify([{ w: '90', n: '', r: '8', d: true, lw: '70' }, { w: '90', n: '', r: '8', d: true, lw: '70' }, { w: '', n: '', r: '', d: false, lw: '70' }]));
      localStorage.setItem(id + '_touched_d2', new Date().toDateString());
    }, ID);
    await p.evaluate(() => resetDay('1'));
    await p.waitForTimeout(300);
    const sets = (await squat()) || [];
    t.check('5b. ticked with no clock: Day 2\'s sets are still ticked, at 90 kg and RPE 8', sets.filter(s => s.d).length === 2 && sets[0].w === '90' && sets[0].r === '8', JSON.stringify(sets.slice(0, 3)));
    await done(ctx, p);
  }

  // 6. A weight fixed on a finished day's card is sent again; opening the app is not an edit.
  {
    const { ctx, p } = await H.openProgram(browser);
    // 600 typed for 60, on two sets
    await finishDay1(p, [{ w: '600', n: '8', r: '7', d: true }, { w: '600', n: '8', r: '7', d: true }, { w: '', n: '', r: '', d: false }, { w: '', n: '', r: '', d: false }]);
    await p.waitForTimeout(500);
    const n0 = (await saves(p)).length;
    t.check('6. Done sent the session once, with the 600 typed', n0 >= 1 && ((squatOf((await saves(p)).slice(-1)[0]) || {}).sets || [])[0].w === '600', 'saves: ' + n0);
    // The athlete spots the typo on the finished card and fixes both weight boxes.
    await p.evaluate(() => {
      const card = [...document.querySelectorAll('#screen-home .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === 'Barbell Back Squat');
      card.querySelectorAll('.ex-set-weight').forEach((inp, i) => { if (i < 2) { inp.value = '60'; inp.dispatchEvent(new Event('input', { bubbles: true })); } });
    });
    try { await p.waitForFunction(n => (window.__STUB.params || []).filter(x => x[0] === 'save_session').length > n, n0, { timeout: 5000 }); } catch (e) { /* nothing was sent: the check below says so */ }
    await p.waitForTimeout(600);
    const all = await saves(p), last = all[all.length - 1];
    t.check('6. the card holds 60 and 60', (await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_donelog_d1')).sets['Barbell Back Squat'].map(s => s.w), ID)).slice(0, 2).join() === '60,60');
    t.check('6. the fix is sent: save_session again', all.length > n0, 'saves after the fix: ' + (all.length - n0));
    t.check('6. …with the corrected weights, on the same row', all.length > n0 && ((squatOf(last) || {}).sets || []).slice(0, 2).map(s => s.w).join() === '60,60' && last.p_completed_on === all[0].p_completed_on, last && JSON.stringify(((squatOf(last) || {}).sets || []).map(s => s.w)));
    // Opening the app again redraws the finished card: that writes what it already holds, and sends nothing.
    await reload(p);
    await p.waitForTimeout(2800);
    t.check('6. opening the app with a finished day sends no save_session', (await saves(p)).length === 0, 'saves on the open: ' + (await saves(p)).length);
    await done(ctx, p);
  }

  // 7. The crew's board is a cache of other athletes' rows: not progress.
  {
    const mine = [{ pos: 1, who: 'Sam Example', xp: 900, level: 9, is_me: false }, { pos: 2, who: 'Alex Rivera', xp: 410, level: 5, is_me: true }];
    const theirs = [{ pos: 1, who: 'Jo Placeholder', xp: 120, level: 2, is_me: false }];
    const { ctx, p } = await H.openProgram(browser, { seed: { _crewboard: mine }, stub: { progress: { [ID + '_crewboard']: JSON.stringify(theirs), [ID + '_snapAt']: new Date(Date.now() + 3600e3).toISOString() } } });
    await pulled(p, 2500);
    t.check('7. a cloud copy of the board is not pulled over the phone\'s own', (await stored(p, '_crewboard')) === JSON.stringify(mine), await stored(p, '_crewboard'));
    await p.evaluate(() => _pushSnapshot(true));
    await p.waitForTimeout(400);
    const pp = await pushes(p);
    t.check('7. the board is never in a progress push', pp.length > 0 && pp.every(x => !((ID + '_crewboard') in (x.p_data || {}))), pp.length + ' pushes, ' + pp.filter(x => (ID + '_crewboard') in (x.p_data || {})).length + ' with the board');
    await done(ctx, p);
  }

  t.check('8. no page errors in any of it', errs.length === 0, errs.join(' | '));
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
