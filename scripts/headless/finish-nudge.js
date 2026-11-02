// The forgotten Done (Amir, 2026-11-02: "Some people forget to hit finish on the session", "Lets remind them 10 min instead of 30 min",
// "Make the rescue as well", and on the rest alert "Imagine someone is training without internet"). The app's half; the server's is
// scripts/push/rehearse_finish_push.mjs.
//   F1  leaving the app with a session open sends ONE "finish" request, due 10 minutes after the last tick (a minute from now at least)
//   F2  coming back takes it back and clears this phone's own alerts
//   F3  offline (Android): the app shows the rest alert itself, 10 s before the end, with the rest tag; never while the app is visible
//   F4  a tap on the reminder (#finish) opens the day under way at its finish card (Stop here when sets are left), else with ⋯ open
//   R1  the rescue: a session left open yesterday is filed with its time to the last tick, and Home asks its effort
//   R2  one tap re-saves it with the effort and the load, and the card says thanks
// Serve the repo first (python -m http.server 8851 --bind 127.0.0.1; BASE=http://127.0.0.1:8851), then:
//   node scripts/headless/finish-nudge.js
'use strict';
const H = require('./lib');
const t = H.checker();

async function stubs(p, perm = 'granted') {
  await p.evaluate(perm => {
    window.__sent = []; window.__rpc = []; window.__shown = []; window.__saves = [];
    const realFetch = window.fetch;
    window.fetch = (u, o) => { if (String(u).includes('push-send')) { window.__sent.push(JSON.parse(o.body)); return Promise.resolve(new Response('{}')); } return realFetch(u, o); };
    window.AAPush = Object.assign({}, window.AAPush || {}, { state: () => 'on' });
    try { Object.defineProperty(Notification, 'permission', { configurable: true, get: () => perm }); } catch (e) {}
    const reg = { pushManager: { getSubscription: () => Promise.resolve({ endpoint: 'https://push.example.test/me' }) },
      showNotification: (title, o) => { window.__shown.push({ title, tag: o.tag, body: o.body, url: o.data && o.data.url, local: !!(o.data && o.data.local) }); return Promise.resolve(); } };
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { ready: Promise.resolve(reg), register: () => Promise.resolve(reg), addEventListener() {} } });
    window._sbReady = async () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'tok-1', expires_at: Math.floor(Date.now() / 1000) + 3600 } } }) },
      rpc: async (n, a) => { window.__rpc.push([n, a]); return { data: null, error: null }; } });
    window._sendSession = async (sb, e) => { window.__saves.push(JSON.parse(JSON.stringify(e))); return false; };
  }, perm);
}
const hide = p => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
const show = p => p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
async function tickFirst(p, nm) {
  await p.evaluate(nm => {
    const c = [...document.querySelectorAll('#day-view .checklist-item')].find(c => c.querySelector('.item-name').textContent.trim() === nm);
    if (c.classList.contains('collapsed')) toggleExpand(c);
    c.querySelector('.ex-set-row .ex-set-check').classList.add('__t'); c.scrollIntoView({ block: 'center' }); try { hideAaToast(); } catch (e) {}
  }, nm);
  await p.click('.ex-set-check.__t');
  await p.evaluate(() => document.querySelectorAll('.__t').forEach(b => b.classList.remove('__t')));
  await p.waitForTimeout(300);
}

(async () => {
  const browser = await H.launch();
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [] });
    p.setDefaultTimeout(10000);
    await stubs(p);
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    await hide(p); await p.waitForTimeout(100); await show(p);
    t.check('F1: with no session under way, leaving the app sends nothing', (await p.evaluate(() => window.__sent.length)) === 0);
    await tickFirst(p, 'Barbell Back Squat');
    const last = await p.evaluate(() => Number(localStorage.getItem(ATHLETE_ID + '_lastact_d1')));
    t.check('a tick records when the day was last touched (this phone only)', last > Date.now() - 60000, last);
    t.check('…and that key is not one the cloud sync carries', await p.evaluate(() => { try { return !JSON.stringify(typeof buildPushPayload === 'function' ? buildPushPayload() : {}).includes('lastact'); } catch (e) { return true; } }));
    await p.waitForTimeout(300);   // restPushPrep() has its subscription and token
    await hide(p); await p.waitForTimeout(150);
    let s = await p.evaluate(() => window.__sent.slice());
    const f = s.find(x => x.kind === 'finish');
    t.check('F1: leaving with a session open sends one "finish" request', s.length === 1 && !!f, JSON.stringify(s));
    t.check('…due 10 minutes after the last tick, with this phone\'s endpoint and the token', f && Math.abs(Date.parse(f.at) - (last + 600000)) < 1500 && f.endpoint === 'https://push.example.test/me' && f.token === 'tok-1', JSON.stringify(f));
    t.check('…and this phone set its own reminder too (offline, Android)', await p.evaluate(() => !!(localAlert.t && localAlert.t.finish)));
    await show(p); await p.waitForTimeout(150);
    t.check('F2: coming back disarms the server (push_rest_disarm) and clears this phone\'s own alerts', (await p.evaluate(() => window.__rpc.filter(x => x[0] === 'push_rest_disarm').length)) === 1
      && await p.evaluate(() => !localAlert.t.finish && !localAlert.t.rest));
    // an old last tick: a minute from now, never the past
    await p.evaluate(() => localStorage.setItem(ATHLETE_ID + '_lastact_d1', String(Date.now() - 3600000)));
    await hide(p); await p.waitForTimeout(150); await show(p);
    s = await p.evaluate(() => window.__sent.filter(x => x.kind === 'finish'));
    t.check('a last tick an hour ago: the reminder is a minute from now', Math.abs(Date.parse(s[s.length - 1].at) - (Date.now() + 60000)) < 3000, JSON.stringify(s[s.length - 1]));
    // F3: the rest alert, offline
    await p.evaluate(() => { openRest(90, 'Barbell Back Squat', null); timerEndsAt = Date.now() + 14000; });
    await hide(p);
    await p.waitForTimeout(4700);
    let sh = await p.evaluate(() => window.__shown.slice());
    const r = sh.find(x => x.tag === 'rest');
    t.check('F3: hidden mid-rest, the app shows "10 seconds left" itself, 10 s before the end, tag rest', !!r && r.title === '10 seconds left' && r.body === 'Get set for your next set.' && r.local, JSON.stringify(sh));
    await show(p); await p.evaluate(() => closeTimer());
    await p.evaluate(() => { window.__shown = []; openRest(90, 'Barbell Back Squat', null); timerEndsAt = Date.now() + 14000; });
    await hide(p); await p.waitForTimeout(500); await show(p);
    await p.waitForTimeout(4500);
    t.check('…and back in the app before it is due, nothing shows', (await p.evaluate(() => window.__shown.length)) === 0);
    await p.evaluate(() => closeTimer());
    // F4: the tap
    await p.evaluate(() => { closeDayView(); });
    await p.waitForTimeout(400);
    await p.evaluate(() => goFinishSoon());
    await p.waitForTimeout(900);
    const g = await p.evaluate(() => { const act = document.querySelector('.day-content.active'), bar = document.getElementById('timer-1'), c = document.getElementById('confirm-1');
      const r = c && c.getBoundingClientRect();
      return { open: !document.getElementById('day-view').hidden && act && act.id === 'day1', more: !!(bar && bar.classList.contains('open')),
        card: !!(c && c.classList.contains('visible') && r.top < innerHeight && r.bottom > 0), early: !!(c && /Stop here/.test(c.textContent)) }; });
    t.check('F4: the reminder\'s tap opens the day under way, on its finish card (In progress, with Stop here) or with ⋯ open', g.open && ((g.card && g.early) || g.more), JSON.stringify(g));
    t.check('no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  // R1 / R2: the rescue
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: H.fixture(), hist: [] });
    p.setDefaultTimeout(10000);
    await stubs(p, 'denied');
    await p.evaluate(() => openDayView('1'));
    await p.waitForTimeout(300);
    await tickFirst(p, 'Barbell Back Squat');
    // The same session moved to yesterday: started 18:10, last tick 19:02, the clock still running (Done never pressed).
    const r = await p.evaluate(() => {
      const y = new Date(); y.setDate(y.getDate() - 1);
      const at = (h, m) => { const d = new Date(y); d.setHours(h, m, 0, 0); return d; };
      localStorage.setItem(ATHLETE_ID + '_touched_d1', y.toDateString());
      localStorage.setItem(ATHLETE_ID + '_timer_1', JSON.stringify({ sessionStart: at(18, 10).toISOString(), running: true, resumeAt: at(18, 10).getTime(), acc: 0 }));
      localStorage.setItem(ATHLETE_ID + '_lastact_d1', String(at(19, 2).getTime()));
      localStorage.removeItem(ATHLETE_ID + '_srpe_1');
      const filed = fileUnfinished();
      const notes = JSON.parse(localStorage.getItem(ATHLETE_ID + '_autofiled') || '[]');
      const q = _csqLoad();
      return { filed, n: notes[notes.length - 1], q: q.map(e => ({ day: e.p_day, dur: e.p_session.duration_min, rpe: e.p_session.session_rpe })) };
    });
    t.check('R1: a session left open yesterday is filed', r.filed && r.n && r.n.day === '1', JSON.stringify(r).slice(0, 300));
    t.check('…with its time to the last tick: 18:10 to 19:02 is 52 min', r.n && r.n.min === 52 && r.q.some(e => e.day === 1 && e.dur === '52'), JSON.stringify(r.q));
    t.check('…unrated, with the saved session kept for the answer', r.n && r.n.rated === false && !!r.n.p, JSON.stringify(r.n && { rated: r.n.rated, p: !!r.n.p }));
    await p.evaluate(() => { closeDayView(); paintUnfinished(); });
    await p.waitForTimeout(300);
    const card = await p.evaluate(() => { const w = document.getElementById('home-unfinished-wrap');
      return { text: w.textContent.replace(/\s+/g, ' '), keys: w.querySelectorAll('.uf-rate-btn').length, h: (w.querySelector('.uf-rate-btn') || { offsetHeight: 0 }).offsetHeight }; });
    t.check('Home asks: the time it ran, How hard was that session?, ten 44 px keys', /to your last set at/.test(card.text) && /52 min/.test(card.text) && /How hard was that session\?/.test(card.text) && card.keys === 10 && card.h >= 44, JSON.stringify(card));
    await p.click('#home-unfinished-wrap .uf-rate-btn:nth-child(7)');
    await p.waitForTimeout(300);
    const after = await p.evaluate(() => {
      const e = _csqLoad().find(x => x.p_day === 1);
      const notes = JSON.parse(localStorage.getItem(ATHLETE_ID + '_autofiled') || '[]');
      return { rpe: e && e.p_session.session_rpe, sum: e && e.p_session.summary, saves: window.__saves.length, n: notes[notes.length - 1],
        text: document.getElementById('home-unfinished-wrap').textContent.replace(/\s+/g, ' '), keys: document.querySelectorAll('.uf-rate-btn').length };
    });
    t.check('R2: one tap re-saves it with the effort, through the queue', after.rpe === '7' && after.saves >= 1, JSON.stringify(after).slice(0, 300));
    t.check('…the summary says it and the load: 7 × 52 = 364 AU', /Session RPE: 7\/10/.test(after.sum || '') && /Session Load: 364 AU/.test(after.sum || ''), after.sum);
    t.check('…and the card says thanks, with no keys left', /Effort 7 saved/.test(after.text) && after.keys === 0 && after.n.rated === true, after.text);
    t.check('no page errors (rescue)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
