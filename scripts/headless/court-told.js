// #131 Court Told, the court icon, and #133 Your Usual (round 12 'On the Move', 2026-11-22): node scripts/headless/court-told.js
//
// 131: after an activity is added, the saved message offers Tell the crew (unless the hard-hour offer of #128 takes it); the day's sheet
// has the same button. The composer opens on the activity (kind and minutes, never effort); words and a photo are optional, and the post
// goes as a plain post with p_session { act, mins } (stage124). The feed draws such a post with its activity card and the racket icon;
// a session post wears the dumbbell. The day's sheet and the Player Page give every row its icon (racket in clay for court time).
// 133: Your weeks says this week's court and other minutes against the athlete's own four-week usual, once there are three weeks of logs.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
function weeks(days, acts) {
  const o = { n: 1, from: at(-6), to: at(28), current: true, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days }] };
  if (acts) o.acts = acts;
  return o;
}
const PADEL = { day: at(0), k: 'court', kind: 'padel', title: 'Padel', mins: 75, effort: 'normal', id: 'a1' };
// A crew member who may post (crew.js's fixture, cut to what this needs).
const BELL = { athlete_id: H.ID, at: new Date().toISOString(), days: 7, kinds: ['level', 'week'], items: [],
  me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: { level: true, week: true } } };
async function open(browser, fw, stub) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: Object.assign({ fiveWeeks: fw, bell: BELL }, stub || {}), seed: { _hab_cfg: CFG, _hab_log: {} } });
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  await p.evaluate(async () => { if (typeof refreshBell === 'function') { try { await refreshBell(); } catch (e) {} } });
  await p.waitForTimeout(400);
  return { ctx, p };
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── the day sheet: icons, and Tell the crew opens the composer on the activity ──
  {
    const { ctx, p } = await open(browser, weeks([PADEL, { day: at(0), k: 'plan', title: 'Lower', mins: 60 }], [PADEL]));
    const can = await p.evaluate(() => crewCanTell());
    await p.evaluate(d => openFiveWeeksDay(d), at(0));
    await p.waitForTimeout(250);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .pl-row')].map(r => ({
      court: !!r.querySelector('.act-ic.is-court'), icon: !!r.querySelector('.act-ic svg'), tell: !!r.querySelector('.act-tell') })));
    t.check('the day sheet: the activity wears the racket in clay, the plan session an icon of its own', rows.length === 2 && rows.every(r => r.icon)
      && rows.filter(r => r.court).length === 1, JSON.stringify(rows));
    t.check('the activity has Tell the crew (a crew member)', can && rows.some(r => r.tell), JSON.stringify({ can, rows }));
    await p.click('#hist-overlay .act-tell');
    await p.waitForTimeout(400);
    const comp = await p.evaluate(() => {
      const m = document.querySelector('#hist-overlay .readiness-modal');
      return { title: (m.querySelector('.readiness-title') || {}).textContent, card: !!m.querySelector('.cr-actcard .cr-acti.is-court'),
        go: m.querySelector('.cr-go') && !m.querySelector('.cr-go').disabled, effort: /normal|hard|easy/i.test(m.textContent.replace('how hard it was', '')) };
    });
    t.check('the composer opens on the activity, kind and minutes, never effort, and posts with no words', comp.title === 'Padel, 75 min' && comp.card && comp.go && !comp.effort, JSON.stringify(comp));
    await p.click('#hist-overlay .cr-go');
    await p.waitForTimeout(800);
    const sent = await p.evaluate(() => { const c = (window.__STUB.params || []).filter(x => x[0] === 'crew_post'); return c.length ? c[c.length - 1][1] : null; });
    t.check('it goes as a plain post carrying { act, mins }', sent && sent.p_kind === 'post' && sent.p_session && sent.p_session.act === 'padel' && sent.p_session.mins === 75
      && !('effort' in sent.p_session), JSON.stringify(sent));
    t.check('no page errors (sheet and composer)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── the feed: an activity post and a session post, told apart ──
  {
    const { ctx, p } = await open(browser, weeks([]));
    const html = await p.evaluate(() => {
      const a = crewPostHTML({ id: 'x1', kind: 'post', body: '', session: { act: 'padel', mins: 75 }, who: 'Mina', at: new Date().toISOString(), kudos: 0, replies: [] });
      const s = crewPostHTML({ id: 'x2', kind: 'session', body: 'Done', session: { day: 2 }, photo: true, who: 'Reza', at: new Date().toISOString(), kudos: 0, replies: [] });
      const d = document.createElement('div'); d.innerHTML = a + s; document.body.appendChild(d);
      const [pa, ps] = d.querySelectorAll('.cr-post');
      const out = { aCard: !!pa.querySelector('.cr-actcard .cr-acti.is-court'), aSub: pa.querySelector('.cr-kd').textContent.trim(), aCourt: !!pa.querySelector('.cr-kic.is-court'),
        sSub: ps.querySelector('.cr-kd').textContent.trim(), sCourt: !!ps.querySelector('.cr-kic.is-court'), sIcon: !!ps.querySelector('.cr-kic svg') };
      d.remove();
      return out;
    });
    t.check('an activity post shows its card with the racket, a session post the dumbbell', html.aCard && html.aCourt && html.aSub === 'Padel' && html.sSub === 'Day 2 done' && html.sIcon && !html.sCourt, JSON.stringify(html));
    await ctx.close();
  }

  // ── the saved message offers Tell the crew; a hard hour keeps the cool-down offer ──
  {
    const { ctx, p } = await open(browser, weeks([], []));
    await p.evaluate(() => openActivitySheet());
    await p.evaluate(() => { actPick('kind', 'tennis'); actPick('mins', 60); actPick('effort', 'normal'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(1300);
    const toast = await p.evaluate(() => { const el = document.getElementById('aaToast'); return el && !el.hidden ? { t: el.querySelector('.aa-toast-t').textContent, go: (el.querySelector('.aa-toast-go') || {}).textContent } : null; });
    t.check('after a save the message offers Tell the crew', toast && toast.t === 'Added to your weeks.' && toast.go === 'Tell the crew', JSON.stringify(toast));
    await ctx.close();
  }

  // ── 133 Your Usual ──
  {
    const acts = [];
    // four weeks before this week: 2 h of tennis a week; this week 3 h
    for (let w = 1; w <= 4; w++) acts.push({ day: at(-6 - 7 * w + 2), kind: 'tennis', mins: 120, effort: 'normal', id: 'u' + w });
    acts.push({ day: at(-1), kind: 'padel', mins: 180, effort: 'normal', id: 'n1' });
    const { ctx, p } = await open(browser, weeks([], acts));
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(500);
    const u = await p.evaluate(() => { const e = document.querySelector('#fw-wrap .fw-usual'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
    t.check('Your weeks: this week against the usual', u === 'On court this week: 3h · your usual 2h', u);
    await ctx.close();
    const o2 = await open(browser, weeks([], [{ day: at(-9), kind: 'tennis', mins: 60, effort: 'normal', id: 'z' }, { day: at(-1), kind: 'tennis', mins: 60, effort: 'normal', id: 'z2' }]));
    await o2.p.evaluate(() => goTo('plan'));
    await o2.p.waitForTimeout(500);
    t.check('silent until three weeks of logs', (await o2.p.evaluate(() => document.querySelector('#fw-wrap .fw-usual'))) === null);
    await o2.ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
