// Love All round 2 (2026-10-24): layers, sheets and Back, checked the way the athlete meets them.
//   B6   an award moment that lands while a sheet is open draws ABOVE it, Back closes it first, and it is marked seen only once it is on screen and on top.
//   B7   an inline video stops when its card folds, when its sheet closes and when the athlete goes to another screen.
//   B22  New from Amir and the habit card's › open their pages; ← and the phone's Back return to Home.
//   B23  a lift opened from the trend card or from an exercise's History: ← and Back return there, not to the Records list first.
//   B27  Reminders has a Back to the account sheet and its row has a bell.
//   B28  a crew reply typed and dismissed comes back, per post, and goes when it is sent.
// Serve the repo first (python -m http.server <port>; BASE=http://127.0.0.1:<port>; PLAYWRIGHT and CHROMIUM, see lib.js), then:
//   node scripts/headless/love-all-layers.js
'use strict';
const H = require('./lib');
const C = require('./career');

const ID = H.ID;
const DAY = 86400000;
const ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const day = n => ymd(new Date(Date.now() - n * DAY));
const t = H.checker();
const HAB = { _hab_cfg: { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() } };
const active = p => p.evaluate(() => (document.querySelector('.screen.active') || {}).id);
const back = async p => { await p.evaluate(() => history.back()); await p.waitForTimeout(500); };

async function career(browser, o = {}) {
  const prof = o.profile || C.rwProfile(10000);
  const stub = Object.assign({ tables: { career_rules: C.RW_RULES, career_facts: [], career_catalogue: C.catRows() }, profile: prof, awards: C.rwShelf(prof), myMoments: C.myMomentsFx() }, o.stub || {});
  return H.openProgram(browser, Object.assign({ w: 390, h: 844, tz: 'UTC', prog: H.fixture(), hist: o.hist || [], stub, seed: Object.assign({}, HAB, o.seed || {}) }, o.opts || {}));
}

// ═════════ B6: a moment over a sheet ═════════
async function b6(browser) {
  const full = (i, size) => C.mom('badge:held_weeks:' + i, size, true, 600, C.badgeSpec('Hold Serve', 'consistency', 'emerald', i, 12, '12 weeks held in a row. You keep showing up.', C.at(-3 + i)));
  const m1 = full(3, 'milestone');
  const { ctx, p } = await career(browser, { profile: C.rwProfile(10000, { moments: [m1], owned: { 'badge:held_weeks:3': C.at(0) } }) });
  await p.waitForSelector('.hl-moment', { timeout: 6000 }).catch(() => {});
  await p.click('.hl-m-skip');
  await p.waitForTimeout(400);
  // The athlete reads and has a sheet open when the next answer brings an award.
  await p.evaluate(id => localStorage.removeItem(id + '_rw_seen'), ID);
  await p.evaluate(() => openAccount());
  await p.waitForTimeout(300);
  await p.evaluate(() => { _rwOpened = false; maybeRewardMoment('open'); });
  await p.waitForSelector('.hl-moment', { timeout: 4000 }).catch(() => {});
  await p.waitForTimeout(600);
  const z = await p.evaluate(() => {
    const m = document.querySelector('.hl-moment'), s = document.getElementById('hist-overlay');
    if (!m) return null;
    const hit = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
    return { m: +getComputedStyle(m).zIndex, s: +getComputedStyle(s).zIndex, onTop: !!(hit && hit.closest('.hl-moment')), sheet: s.classList.contains('visible') };
  });
  t.check('B6: the moment opened over an open sheet', !!z && z.sheet, JSON.stringify(z));
  t.check('B6: it draws above the sheet (z-index and what the eye hits)', !!z && z.m > z.s && z.onTop, JSON.stringify(z));
  const seen0 = await p.evaluate(id => localStorage.getItem(id + '_rw_seen'), ID);
  t.check('B6: it is marked seen because it was on screen and on top', /held_weeks:3/.test(String(seen0)), String(seen0));
  await back(p);
  const after = await p.evaluate(() => ({ moment: !!document.querySelector('.hl-moment'), sheet: document.getElementById('hist-overlay').classList.contains('visible') }));
  t.check('B6: the first Back closes the moment and leaves the sheet', !after.moment && after.sheet, JSON.stringify(after));
  await back(p);
  t.check('B6: the second Back closes the sheet', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
  t.check('B6: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B7: inline video stops ═════════
async function b7(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: HAB });
  const URL = 'https://www.youtube.com/watch?v=ultWZbUMPL8';
  const play = sel => p.evaluate(([sel, url]) => {
    const host = document.querySelector(sel);
    host.insertAdjacentHTML('beforeend', renderVideoBlock(url));
    const b = host.querySelector('.ex-video-play');
    b.click();
    return !!host.querySelector('.ex-video.playing iframe');
  }, [sel, URL]);
  const playing = sel => p.evaluate(sel => { const h = document.querySelector(sel); return { iframes: h.querySelectorAll('iframe').length, playing: h.querySelectorAll('.ex-video.playing').length, play: !!h.querySelector('.ex-video-play') }; }, sel);
  // the card folds
  await p.evaluate(() => openDayView('1'));
  await p.waitForTimeout(400);
  await p.evaluate(() => { const c = document.querySelector('#day-view .checklist-item:not(.is-prep)'); c.id = 'b7card'; foldCard(c, true); });
  await p.waitForTimeout(400);
  t.check('B7: the card video starts playing on the ▶', await play('#b7card .item-body, #b7card'), '');
  await p.evaluate(() => foldCard(document.getElementById('b7card'), false));
  await p.waitForTimeout(500);
  let s = await playing('#b7card');
  t.check('B7: folding the card stops it (no iframe, the ▶ is back)', s.iframes === 0 && s.playing === 0 && s.play, JSON.stringify(s));
  // the sheet closes
  await p.evaluate(() => { openAccount(); });
  await p.waitForTimeout(300);
  t.check('B7: a video in a sheet starts', await play('#hist-overlay .readiness-modal'));
  await back(p);
  s = await playing('#hist-overlay .readiness-modal');
  t.check('B7: Back out of the sheet stops it', s.iframes === 0 && s.playing === 0, JSON.stringify(s));
  // another screen
  await p.evaluate(() => { const c = document.getElementById('b7card'); foldCard(c, true); });
  await p.waitForTimeout(400);
  await play('#b7card');
  await p.evaluate(() => goTo('plan'));
  await p.waitForTimeout(300);
  s = await playing('#b7card');
  t.check('B7: going to another screen stops it', s.iframes === 0 && s.playing === 0, JSON.stringify(s));
  t.check('B7: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B22: pages opened from Home go back to Home ═════════
async function b22(browser) {
  const { ctx, p } = await career(browser);
  await p.waitForFunction(() => !!document.querySelector('#home-note-wrap .from-amir'), null, { timeout: 8000 }).catch(() => {});
  t.check('B22: Home has New from Amir', await p.evaluate(() => !!document.querySelector('#home-note-wrap .from-amir')));
  await p.click('#home-note-wrap .from-amir');
  await p.waitForTimeout(600);
  t.check('B22: New from Amir opens Your moments', (await active(p)) === 'screen-moments', await active(p));
  await p.click('#screen-moments .nav-back');
  await p.waitForTimeout(500);
  t.check('B22: its ← goes back to Home', (await active(p)) === 'screen-home', await active(p));
  await ctx.close();
  const q = await career(browser);
  await q.p.waitForFunction(() => !!document.querySelector('#home-note-wrap .from-amir'), null, { timeout: 8000 }).catch(() => {});
  await q.p.click('#home-note-wrap .from-amir');
  await q.p.waitForTimeout(600);
  await back(q.p);
  t.check('B22: the phone Back from it goes to Home', (await active(q.p)) === 'screen-home', await active(q.p));
  const p2 = q.p;
  const go = await p2.$('.today-go');
  t.check('B22: Home has the habit card ›', !!go);
  if (go) {
    await go.click();
    await p2.waitForTimeout(600);
    t.check('B22: the habit card › opens the habits page', (await active(p2)) === 'screen-habits', await active(p2));
    await p2.click('#screen-habits .nav-back');
    await p2.waitForTimeout(500);
    t.check('B22: its ← goes back to Home', (await active(p2)) === 'screen-home', await active(p2));
  }
  // from Progress it still goes to Progress
  await p2.evaluate(() => goTo('plan')); await p2.waitForTimeout(400);
  await p2.evaluate(() => goTo('moments')); await p2.waitForTimeout(400);
  await p2.click('#screen-moments .nav-back');
  await p2.waitForTimeout(400);
  t.check('B22: opened from Progress, ← still goes to Progress', (await active(p2)) === 'screen-plan', await active(p2));
  t.check('B22: no page errors', p2.errs.length === 0, p2.errs.join(' | '));
  await q.ctx.close();
}

// ═════════ B23: Records on one lift go back to where the athlete came from ═════════
async function b23(browser) {
  const LIFTS = [
    { lift: 'Barbell Back Squat', kg: 92, w: '75', r: '6', rpe: 7, d: day(24), t: Date.now() - 24 * DAY },
    { lift: 'Barbell Back Squat', kg: 98, w: '80', r: '6', rpe: 7, d: day(10), t: Date.now() - 10 * DAY },
    { lift: 'Barbell Back Squat', kg: 104, w: '85', r: '6', rpe: 7, d: day(2), t: Date.now() - 2 * DAY }];
  const HIST = H.HISTORY.concat([[9, '65'], [16, '60']].map(([n, w]) => ({ completed_on: H.past(n), day: '1', readiness: 4, log: [
    { ex: 'Barbell Back Squat', block: 'Strength', reps: 6, note: '', sets: [{ w, n: 6, r: '7', d: true }, { w, n: 6, r: '8', d: true }] }] })));
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: HIST, seed: Object.assign({ _1rm: LIFTS }, HAB) });
  // the trend card on Progress
  await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500);
  const tc = await p.$('#screen-plan .tr-card');
  t.check('B23: Progress has the trend card', !!tc);
  if (tc) {
    await tc.click(); await p.waitForTimeout(500);
    t.check('B23: the trend card opens the lift', (await active(p)) === 'screen-ceiling' && /Squat/.test(await p.textContent('#ceil-title')), await p.textContent('#ceil-title'));
    await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(500);
    t.check('B23: ← goes back to Progress, not the Records list', (await active(p)) === 'screen-plan', await active(p));
    await p.click('#screen-plan .tr-card'); await p.waitForTimeout(500);
    await back(p);
    t.check('B23: the phone Back goes to Progress too', (await active(p)) === 'screen-plan', await active(p));
  }
  // the Records list: row, then ← to the list, then ← to Progress
  await p.evaluate(() => goTo('ceiling')); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelector('#ceil-body .ceil-lift').click()); await p.waitForTimeout(500);
  t.check('B23: from the Records list a lift opens', await p.evaluate(() => !!_ceilLift));
  await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(400);
  t.check('B23: from the list, ← still goes to the list', (await active(p)) === 'screen-ceiling' && await p.evaluate(() => !_ceilLift), await active(p));
  // an exercise's History
  await p.evaluate(() => goTo('home')); await p.waitForTimeout(300);
  await p.evaluate(() => openDayView('1')); await p.waitForTimeout(400);
  await p.evaluate(`(() => { openHistorySheet(${H.card('Barbell Back Squat')}); })()`);
  await p.waitForTimeout(400);
  const rec = await p.$('#hs-rec');
  t.check('B23: the History sheet has Open in Personal Records', !!rec);
  if (rec) {
    await rec.click(); await p.waitForTimeout(600);
    t.check('B23: it opens the lift', (await active(p)) === 'screen-ceiling' && await p.evaluate(() => !!_ceilLift), await active(p));
    await p.click('#screen-ceiling .nav-back'); await p.waitForTimeout(700);
    t.check('B23: ← goes back to the exercise, not the Records list', (await active(p)) === 'screen-home' && await p.evaluate(() => !document.getElementById('day-view').hidden), await active(p));
  }
  t.check('B23: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B27: Reminders ═════════
async function b27(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: HAB });
  await p.evaluate(() => { window.pushReady = () => true; openAccount(); });
  await p.waitForTimeout(400);
  const row = await p.evaluate(() => { const r = document.getElementById('acct-push'); if (!r) return null; const s = r.querySelector('.hrow-ic svg'); const b = s && s.getBoundingClientRect(); return { path: s ? s.innerHTML.length : 0, w: b ? b.width : 0 }; });
  t.check('B27: the Reminders row has an icon that draws', !!row && row.path > 10 && row.w > 0, JSON.stringify(row));
  await p.click('#acct-push');
  await p.waitForTimeout(500);
  t.check('B27: Reminders opens', await p.evaluate(() => /Reminders/.test(document.querySelector('#hist-overlay .readiness-title').textContent)));
  t.check('B27: it shows ‹ Back to the account', await p.evaluate(() => !!document.querySelector('#hist-overlay .sheet-back')));
  await back(p);
  t.check('B27: the phone Back returns to the account sheet', await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && /Your account/.test(document.querySelector('#hist-overlay .readiness-eyebrow').textContent)));
  t.check('B27: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

// ═════════ B28: a crew reply is kept ═════════
function bell() {
  const now = Date.now(), iso = ms => new Date(ms).toISOString();
  const post = (id, body) => ({ t: 'post', id, who: 'Ali B.', me: false, amir: false, kind: 'post', body, photo: false, at: iso(now - 3600e3), pinned: false, left: 7, replies: [], kudos: { n: 0, mine: false, names: [] } });
  return { athlete_id: ID, at: iso(now), days: 7, kinds: ['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open'],
    me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: {} },
    honours: { month: '2026-09-01', rows: [] }, items: [post('p-one', 'First post'), post('p-two', 'Second post')] };
}
async function b28(browser) {
  const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), seed: HAB, stub: { bell: bell(), board: [] } });
  await p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).catch(() => {});
  await p.evaluate(() => goTo('crew')); await p.waitForTimeout(600);
  const type = async (idx, text) => {
    await p.evaluate(i => document.querySelectorAll('#crew-body .cr-post .cr-rep-add')[i].click(), idx);
    await p.waitForTimeout(300);
    if (text != null) await p.evaluate(x => { const ta = document.querySelector('#hist-overlay .cr-rtxt'); ta.value = x; ta.dispatchEvent(new Event('input')); }, text);
  };
  const val = () => p.evaluate(() => (document.querySelector('#hist-overlay .cr-rtxt') || {}).value);
  await type(0, 'Great work on that one');
  await back(p);
  t.check('B28: the sheet closed with Back', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
  await type(0);
  t.check('B28: the same post gives the reply back', (await val()) === 'Great work on that one', await val());
  t.check('B28: the Reply button is ready with it', await p.evaluate(() => !document.querySelector('#hist-overlay .cr-go').disabled));
  await back(p);
  await type(1);
  t.check('B28: another post starts empty (per post)', (await val()) === '', await val());
  await back(p);
  await type(0);
  await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click());
  await p.waitForTimeout(700);
  t.check('B28: the reply went to the server', (await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'crew_reply').map(x => x[1]))).some(x => x.p_body === 'Great work on that one' && x.p_post === 'p-one'));
  await type(0);
  t.check('B28: once sent, the draft is gone', (await val()) === '', await val());
  t.check('B28: no page errors', p.errs.length === 0, p.errs.join(' | '));
  await ctx.close();
}

(async () => {
  const browser = await H.launch();
  for (const f of [b6, b7, b22, b23, b27, b28]) {
    try { await f(browser); } catch (e) { t.check(f.name + ': ran to the end', false, String(e && e.message || e)); }
  }
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
