// A finished session is never lost on the way to the server (2026-10-12): node scripts/headless/session-queue.js
//
// Until then a session went into the phone's retry queue (<id>_csq) only when save_session came back with an
// error. A call that never came back (no signal in the gym, a hanging connection, the app put away or closed
// mid-save) lost it without a trace: 10 sessions of 4 athletes reached Amir by email and never reached the
// dashboard. Now every save goes into the queue FIRST and leaves it when the server has it; a day left
// unfinished is filed by itself at the next open (fileUnfinished()); the queue never syncs; and the phone keeps
// a synced list of what it finished (<id>_finished) for coach.html's syncGapsOf().
//
// Serve the repo first (python -m http.server <port>, see lib.js; BASE=http://127.0.0.1:<port>), then run this.
'use strict';
const H = require('./lib');

const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ID = H.ID;
const SQUAT_DONE = [{ w: '70', n: '', r: '7', d: true }, { w: '70', n: '', r: '7', d: true }, { w: '', n: '', r: '', d: false }, { w: '', n: '', r: '', d: false }];

const queue = p => p.evaluate(id => JSON.parse(localStorage.getItem(id + '_csq') || '[]'), ID);
const saves = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'save_session').map(x => x[1]));
const pushes = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'save_progress').map(x => x[1]));
async function waitLoaded(p) {
  await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
  await p.waitForTimeout(400);
}
// The stub's config lives in localStorage; change it and open the app again.
async function reopen(p, change) {
  await p.evaluate(ch => { const c = JSON.parse(localStorage.getItem('__stubcfg') || '{}'); Object.assign(c, ch); localStorage.setItem('__stubcfg', JSON.stringify(c)); }, change || {});
  await p.reload({ waitUntil: 'domcontentloaded' });
  await waitLoaded(p);
}
// Tick two squat sets on Day 1, rate it and tap Done, the way the athlete does.
async function finishDay1(p, rpe) {
  await p.evaluate(([id, sets, rpe]) => {
    localStorage.setItem(id + '_setlog_Barbell_Back_Squat', JSON.stringify(sets));
    localStorage.setItem(id + '_srpe_1', String(rpe));
    finishDay('1');
  }, [ID, SQUAT_DONE, rpe]);
  await p.waitForTimeout(300);
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();
  const today = ymd(new Date());

  // 1. The server never answers (a hanging connection): the session is on the phone the moment Done is tapped.
  {
    const { ctx, p } = await H.openProgram(browser, { stub: { stall: { save_session: true } } });
    await finishDay1(p, 7);
    let q = await queue(p);
    t.check('Done with a server that never answers: the session waits in the queue', q.length === 1 && q[0].p_day === 1 && q[0].p_completed_on === today && q[0].p_session.session_rpe === '7', JSON.stringify(q.map(e => [e.p_day, e.p_completed_on, e.p_session.session_rpe])));
    t.check('…and the call was made (it hangs, it is not skipped)', (await saves(p)).length >= 1);
    // A rating changed after Done is a newer version of the SAME session: it replaces the waiting one.
    await p.evaluate(id => { localStorage.setItem(id + '_srpe_1', '8'); recordSessionToCloud('1'); }, ID);
    await p.waitForTimeout(200);
    q = await queue(p);
    t.check('a changed rating replaces the waiting version, still one entry', q.length === 1 && q[0].p_session.session_rpe === '8', JSON.stringify(q.map(e => e.p_session.session_rpe)));
    t.check('the finished list names the session', (await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_finished') || '[]'), ID)).includes('1|' + today));
    // The queue is this phone's: never in a progress push.
    await p.evaluate(() => _pushSnapshot(true));
    await p.waitForTimeout(300);
    const pp = await pushes(p);
    const last = pp[pp.length - 1] || {};
    t.check('the queue never goes up with the progress, the finished list does', pp.length > 0 && !((ID + '_csq') in (last.p_data || {})) && ((ID + '_finished') in (last.p_data || {})), Object.keys(last.p_data || {}).filter(k => /csq|finished/.test(k)).join(','));

    // 2. The next open with a server that answers: the queue drains, the right version arrives, nothing is left.
    await reopen(p, { stall: {} });
    await p.waitForTimeout(600);
    q = await queue(p);
    const s = await saves(p);
    const got = s.find(x => x.p_day === 1 && x.p_completed_on === today);
    t.check('the next open sends it and empties the queue', q.length === 0 && !!got, JSON.stringify({ q: q.length, s: s.map(x => [x.p_day, x.p_completed_on]) }));
    t.check('…the newest version, and no stray field reaches save_session', got && got.p_session.session_rpe === '8' && !('_q' in got), got && JSON.stringify(Object.keys(got)));
    await ctx.close();
  }

  // 3. Two Day 1s from different weeks both wait: last week's is not replaced by this week's.
  {
    const old = { p_athlete_id: ID, p_athlete_name: 'Alex Rivera', p_day: 1, p_completed_on: ymd(new Date(Date.now() - 7 * DAY)), p_session: { status: 'Complete', session_rpe: '7', duration_min: '60', readiness: null, day_note: '', focus: 'Old', summary: 'Day 1', log: [] } };
    const { ctx, p } = await H.openProgram(browser, { stub: { stall: { save_session: true } }, seed: { _csq: [old] } });
    await finishDay1(p, 6);
    const q = await queue(p);
    t.check('last week\'s Day 1 still waiting is kept beside this week\'s', q.length === 2 && q.some(e => e.p_completed_on === old.p_completed_on) && q.some(e => e.p_completed_on === today), JSON.stringify(q.map(e => e.p_completed_on)));
    await ctx.close();
  }

  // 4. A newer cloud copy holding an empty queue (every progress row has one from before) never wipes the phone's.
  {
    const waiting = { p_athlete_id: ID, p_athlete_name: 'Alex Rivera', p_day: 2, p_completed_on: ymd(new Date(Date.now() - 2 * DAY)), p_session: { status: 'Complete', session_rpe: '7', duration_min: '', readiness: null, day_note: '', focus: '', summary: 'Day 2', log: [] } };
    const cloud = { [ID + '_csq']: '[]', [ID + '_snapAt']: new Date(Date.now() + 3600000).toISOString() };
    const { ctx, p } = await H.openProgram(browser, { stub: { stall: { save_session: true }, progress: cloud }, seed: { _csq: [waiting] } });
    const q = await queue(p);
    t.check('the pull leaves the waiting session alone', q.length === 1 && q[0].p_day === 2, JSON.stringify(q));
    await ctx.close();
  }

  // 5. A day trained two days ago and never finished is filed by itself at the next open, under the day it was
  //    trained, with that day's check-in, and Home says so. Nothing to tap, nothing to clear.
  {
    const trained = new Date(Date.now() - 2 * DAY); trained.setHours(18, 0, 0, 0);
    const readiness = { timestamp: trained.toISOString(), sleep: 4, energy: 4, soreness: 4, stress: 4, overall: 4, composite: 4, skipped: false };
    // The server holds every save for now, so the record can be read in the queue (the page opens again after filing).
    const { ctx, p } = await H.openProgram(browser, { stub: { stall: { save_session: true } }, seed: {
      _setlog_Barbell_Back_Squat: SQUAT_DONE,
      _touched_d1: trained.toDateString(),
      _readiness_1: readiness,
    } });
    await p.waitForTimeout(600);
    const got = (await queue(p)).find(x => x.p_day === 1);
    t.check('the unfinished day is filed into the queue at the next open', !!got, JSON.stringify((await queue(p)).map(x => [x.p_day, x.p_completed_on])));
    t.check('…under the day it was trained', got && got.p_completed_on === ymd(trained), got && got.p_completed_on);
    t.check('…as a partial session with its sets', got && /^Partial \(2 of/.test(got.p_session.status) && /70 ×6 @7 ✓/.test(got.p_session.summary), got && got.p_session.status);
    t.check('…with that day\'s check-in', got && got.p_session.readiness && got.p_session.readiness.composite === 4, got && JSON.stringify(got.p_session.readiness));
    await reopen(p, { stall: {} });
    await p.waitForTimeout(600);
    t.check('the server answers: it arrives under that day', (await saves(p)).some(x => x.p_day === 1 && x.p_completed_on === ymd(trained)) && (await queue(p)).length === 0);
    const home = await p.evaluate(id => ({
      card: (document.getElementById('home-unfinished-wrap') || {}).innerText || '',
      clear: !!document.querySelector('#home-unfinished-wrap .uf-clear'),
      touched: localStorage.getItem(id + '_touched_d1'),
      queue: JSON.parse(localStorage.getItem(id + '_csq') || '[]').length,
      ticks: JSON.parse(localStorage.getItem(id + '_setlog_Barbell_Back_Squat') || '[]').filter(x => x.d).length,
    }), ID);
    t.check('Home says it was saved, with no Clear button', /wasn't finished/.test(home.card) && /I still got it/.test(home.card) && !home.clear, home.card);
    t.check('the day starts clean: no ticks, no touched date, nothing waiting', !home.touched && home.ticks === 0 && home.queue === 0, JSON.stringify(home));
    await p.evaluate(() => document.querySelector('#home-unfinished-wrap .uf-send').click());
    t.check('OK puts the card away', !(await p.evaluate(() => document.getElementById('home-unfinished-wrap').innerText.trim())));
    await reopen(p);
    const again = (await saves(p)).filter(x => x.p_day === 1);
    t.check('the next open files nothing again', again.length === 0 && !(await p.evaluate(() => document.getElementById('home-unfinished-wrap').innerText.trim())), JSON.stringify(again));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // 6. Offline at the next open (the app opens from the plan saved on the phone): the unfinished day is still
  //    filed into the queue, and goes once there is signal.
  {
    const trained = new Date(Date.now() - 3 * DAY); trained.setHours(19, 0, 0, 0);
    const { ctx, p } = await H.openProgram(browser);   // online once, so the phone has its saved plan
    await p.evaluate(([id, sets, on]) => {
      localStorage.setItem(id + '_setlog_Barbell_Back_Squat', JSON.stringify(sets));
      localStorage.setItem(id + '_touched_d1', on);
    }, [ID, SQUAT_DONE, trained.toDateString()]);
    await reopen(p, { mode: 'offline' });
    await p.waitForTimeout(400);
    let q = await queue(p);
    t.check('offline: the unfinished day waits in the queue', q.length === 1 && q[0].p_completed_on === ymd(trained), JSON.stringify(q.map(e => e.p_completed_on)));
    await p.evaluate(() => { const c = JSON.parse(localStorage.getItem('__stubcfg')); c.mode = 'online'; localStorage.setItem('__stubcfg', JSON.stringify(c)); window.__STUB.mode = 'online'; window.dispatchEvent(new Event('online')); });
    await p.waitForTimeout(800);
    q = await queue(p);
    t.check('the connection comes back: it goes, the queue is empty', q.length === 0 && (await saves(p)).some(x => x.p_completed_on === ymd(trained)), JSON.stringify(q));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
