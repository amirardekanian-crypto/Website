// Crew and the Bell (Career Mode round 5, step 5; stage81, 2026-10-19): node scripts/headless/crew.js
//
// The tab is added to the bar only once get_bell() answers (no answer, a server without stage81, the demo: no tab, the guide names no
// Crew); the question asked once (Ring it / Keep it to me); the feed (Amir's pinned post with the tab's clay dot until Crew is opened, a
// Bell line in words with no weight, a photo post that asks crew_photo() for its photo); kudos on and off; the composer (a message, a
// photo made smaller on the phone to 1280 px JPEG, the limits); Tell the crew (a session only with a photo, Day N drafted); the switches
// and the no; an athlete ticked under 13 reads only; the account sheet's door; the guide; Back closes the photo; never synced; 320 px and
// dark mode. Made-up people only. The stub answers the crew_* calls by name (stub.js).
// Serve the repo first (python -m http.server 8775 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const now = Date.now(), iso = ms => new Date(ms).toISOString();
const KEY = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee:' + iso(now).slice(0, 10);
const AMIR = '11111111-2222-3333-4444-555555555555', PHOTO = '66666666-7777-8888-9999-000000000000';
function bell(me = {}) {
  return {
    athlete_id: H.ID, at: iso(now), days: 7, kinds: ['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open'],
    me: Object.assign({ answer: null, name: 'Alex R.', on_board: true, under13: false, can_post: false, photos_left: 3, posts_left: 10,
      kinds: { level: true, week: true, mark: true, achievement: true, best: true, cycle: true, honour: true, open: true } }, me),
    honours: { month: '2026-09-01', rows: [{ honour: 'sessions', who: 'Reza K.', me: false, value: { n: 14 } }, { honour: 'improved', who: 'Leila M.', me: false, value: { lift: 'Back Squat', pct: 27.1 } }] },
    items: [
      { t: 'post', id: AMIR, who: 'Amir', me: false, amir: true, kind: 'post', body: '11 of you held your week. Keep it boring.', photo: false, at: iso(now - 3600e3), pinned: true, left: 7, kudos: { n: 2, mine: false, names: ['Mina S.', 'Sara T.'] } },
      { t: 'line', key: KEY, who: 'Mina S.', me: false, at: iso(now - 7200e3), kudos: { n: 0, mine: false, names: [] },
        parts: [{ k: 'level', n: 14 }, { k: 'best', lifts: ['Barbell Back Squat'], more: 0 }, { k: 'week', run: 5 }] },
      { t: 'post', id: PHOTO, who: 'Ali B.', me: false, amir: false, kind: 'post', body: '6 am session done before school.', photo: true, w: 1280, h: 1600, at: iso(now - 10800e3), pinned: false, left: 7,
        kudos: { n: 3, mine: false, names: ['Mina S.', 'Sara T.'] } },
    ],
  };
}
const BOARD = [{ pos: 1, display_name: 'Reza K.', xp: 6240, level: 22, is_me: false, joined: true }, { pos: 2, display_name: 'Alex R.', xp: 5910, level: 19, is_me: true, joined: true }];

async function open(browser, o = {}) {
  return H.openProgram(browser, Object.assign({ w: 390, h: 844, stub: Object.assign({ board: BOARD }, o.bell === null ? {} : { bell: o.bell || bell(o.me) }, o.stub || {}), seed: o.seed || {} }, o.opts || {}));
}
const tabs = p => p.evaluate(() => [...document.querySelectorAll('#global-tabs .nav-item')].map(n => n.dataset.tab).join());
const calls = (p, name) => p.evaluate(n => (window.__STUB.params || []).filter(x => x[0] === n).map(x => x[1]), name);
const waitTab = p => p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).then(() => true, () => false);

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // 1. no answer from get_bell: no tab, no Crew in the guide or the account sheet
  {
    const { ctx, p } = await open(browser, { bell: null });
    await p.waitForTimeout(2200);
    C.check('no get_bell answer: the four tabs only', (await tabs(p)) === 'home,plan,workouts,notes', await tabs(p));
    const g = await p.evaluate(() => buildAppGuideCards());
    C.check('…the guide has no Crew card and no Crew tab', !/Crew and the Bell/.test(g) && !/<strong>Crew<\/strong> is the crew/.test(g) && !/<!--crew-->/.test(g));
    await p.evaluate(() => openAccount()); await p.waitForTimeout(200);
    C.check('…the account sheet has no Crew door', !(await p.$('#acct-crew')));
    C.check('…no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 2. a server without stage81: the copy goes, and so does the tab
  {
    const { ctx, p } = await open(browser, { bell: null, stub: { bellMissing: true }, seed: { _crewcache: bell({ answer: 'yes', can_post: true }) } });
    await p.waitForTimeout(2200);
    const left = await p.evaluate(id => localStorage.getItem(id + '_crewcache'), H.ID);
    C.check('get_bell missing on the server: no Crew tab, the copy deleted', (await tabs(p)) === 'home,plan,workouts,notes' && left === null, (await tabs(p)) + ' ' + String(left).slice(0, 40));
    await ctx.close();
  }
  // 3. the demo never asks
  {
    const { ctx, p } = await open(browser, { opts: { query: '?client=demo' } });
    await p.waitForTimeout(2200);
    C.check('the demo: no Crew tab and no get_bell call', !(await tabs(p)).includes('crew') && !(await calls(p, 'get_bell')).length);
    await ctx.close();
  }
  // 4. the first visit: the tab, its dot, the question, the feed, kudos, the photo, Back
  {
    const { ctx, p } = await open(browser);
    C.check('get_bell answers: the Crew tab appears before Coach', await waitTab(p) && (await tabs(p)) === 'home,plan,workouts,crew,notes', await tabs(p));
    C.check('…with a clay dot for Amir\'s new pinned post, before Crew is opened', !!(await p.$('#global-tabs [data-tab="crew"] .nav-dot')));
    C.check('…asked with the athlete\'s own id', (await calls(p, 'get_bell')).every(x => x && x.p_athlete_id === H.ID));
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    const s = await p.evaluate(() => ({
      lit: (document.querySelector('#global-tabs .nav-item.active') || {}).dataset.tab, dot: !!document.querySelector('#global-tabs [data-tab="crew"] .nav-dot'),
      ask: !!document.querySelector('#crew-ask'), askBtns: [...document.querySelectorAll('#crew-ask button')].map(b => b.textContent.trim()).join('|'),
      comp: !!document.querySelector('.cr-comp'), pin: (document.querySelector('.cr-post.amir .cr-pin') || {}).className || '',
      first: (document.querySelector('#crew-body .cr-post, #crew-body .cr-line') || {}).className || '',
      line: ((document.querySelector('.cr-line .cr-lw') || {}).firstChild || {}).textContent || '',
      hon: [...document.querySelectorAll('.cr-hon > div')].map(d => [...d.children].map(c => c.textContent.trim()).join(' ')).join('|'),
      board: [...document.querySelectorAll('.cr-br')].map(d => d.textContent.replace(/\s+/g, ' ').trim()).join('|'),
      text: document.getElementById('screen-crew').innerText,
    }));
    C.check('Crew opened: the tab is lit and its dot gone', s.lit === 'crew' && !s.dot, JSON.stringify([s.lit, s.dot]));
    C.check('…Amir\'s post counts as seen on this phone', (await p.evaluate(id => localStorage.getItem(id + '_crewseen'), H.ID)) === AMIR);
    C.check('…the question, once: Ring it / Keep it to me, and no composer before the answer', s.ask && s.askBtns === 'Ring it|Keep it to me' && !s.comp, s.askBtns);
    C.check('…Amir\'s post pinned first, its pin clay on the visit that first shows it', /cr-post amir/.test(s.first) && /cr-pin is-new/.test(s.pin), s.first + ' / ' + s.pin);
    C.check('…the Bell line in words: level, the lift (never a weight), the run', s.line === 'Mina S. reached level 14 · set a new best on Barbell Back Squat · held a week, 5 in a row', s.line);
    C.check('…no weight, no kg anywhere on Crew', !/\bkg\b|\d+\s*kg/i.test(s.text));
    C.check('…last month\'s honours: names and what they did', /Most sessions Reza K\. 14 plan sessions/.test(s.hon) && /Most improved Leila M\. Back Squat \+27\.1%/.test(s.hon), s.hon);
    C.check('…the season board: plain numbers, your row as You', s.board === '1Reza K.LV 226,240|2YouLV 195,910', s.board);
    C.check('…kudos with names: "Mina S., Sara T. and 1 other"', /Mina S\., Sara T\. and 1 other/.test(s.text));
    C.check('…before a yes, kudos cannot be given (disabled)', await p.evaluate(() => [...document.querySelectorAll('#crew-body .cr-kd')].every(b => b.disabled)));
    // the photo: asked when its card comes near the screen
    await p.evaluate(() => document.querySelector('.cr-ph').scrollIntoView()); await p.waitForTimeout(600);
    const ph = await p.evaluate(() => { const b = document.querySelector('.cr-ph'); const im = b.querySelector('img'); return { in: b.classList.contains('is-in'), src: (im.getAttribute('src') || '').slice(0, 5), ratio: Math.round(b.getBoundingClientRect().height / b.getBoundingClientRect().width * 100) }; });
    C.check('…the photo card asks crew_photo() for its post and shows it, at 4:5', ph.in && ph.src === 'blob:' && ph.ratio === 125 && (await calls(p, 'crew_photo')).some(x => x.p_post === PHOTO), JSON.stringify(ph));
    await p.evaluate(id => openCrewPhoto(id), PHOTO); await p.waitForTimeout(300);
    C.check('the photo opens full screen, with its words and a ✕', await p.evaluate(() => { const v = document.getElementById('crew-viewer'); return v.classList.contains('visible') && /6 am session/.test(v.textContent) && !!v.querySelector('.cr-x'); }));
    await p.goBack(); await p.waitForTimeout(300);
    C.check('…the phone\'s Back closes it and stays on Crew', await p.evaluate(() => !document.getElementById('crew-viewer').classList.contains('visible') && document.getElementById('screen-crew').classList.contains('active')));
    // the yes
    await p.evaluate(() => document.querySelector('#crew-ask .cr-go').click()); await p.waitForTimeout(500);
    const ans = await calls(p, 'crew_answer');
    C.check('Ring it: crew_answer("yes") with the board name', ans.length === 1 && ans[0].p_answer === 'yes' && ans[0].p_name === 'Alex R.', JSON.stringify(ans));
    C.check('…the question goes and the composer comes', await p.evaluate(() => !document.querySelector('#crew-ask') && !!document.querySelector('.cr-comp')));
    // kudos on a line, then off
    await p.evaluate(() => document.querySelector('.cr-line .cr-kd').click()); await p.waitForTimeout(400);
    const k1 = await p.evaluate(() => { const b = document.querySelector('.cr-line .cr-kd'); return { pressed: b.getAttribute('aria-pressed'), txt: b.textContent.trim(), w: document.querySelector('.cr-line small').textContent }; });
    C.check('kudos on a Bell line: pressed, counted, "You"', k1.pressed === 'true' && k1.txt === 'Kudos 1' && /^You · /.test(k1.w), JSON.stringify(k1));
    C.check('…crew_kudos(the line\'s key, on)', (await calls(p, 'crew_kudos')).some(x => x.p_target === KEY && x.p_on === true));
    await p.evaluate(() => document.querySelector('.cr-line .cr-kd').click()); await p.waitForTimeout(400);
    C.check('…and off again', await p.evaluate(() => document.querySelector('.cr-line .cr-kd').getAttribute('aria-pressed') === 'false') && (await calls(p, 'crew_kudos')).some(x => x.p_target === KEY && x.p_on === false));
    // the composer: a message with a photo, made smaller here
    await p.evaluate(() => document.querySelector('.cr-comp').click()); await p.waitForTimeout(300);
    C.check('the composer opens in the sheet; Post waits for words or a photo', await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible') && !!document.querySelector('#hist-overlay .cr-txt') && document.querySelector('#hist-overlay .cr-go').disabled));
    await p.evaluate(async () => {
      const c = document.createElement('canvas'); c.width = 3000; c.height = 2250;
      const x = c.getContext('2d'); for (let i = 0; i < 400; i++) { x.fillStyle = `hsl(${i * 7},60%,${30 + i % 40}%)`; x.fillRect((i * 97) % 3000, (i * 53) % 2250, 300, 200); }
      const blob = await new Promise(r => c.toBlob(r, 'image/png'));
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'court.png', { type: 'image/png' }));
      const inp = document.querySelector('#hist-overlay .cr-add input'); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
    });
    await p.waitForFunction(() => !document.querySelector('#hist-overlay .cr-prev').hidden, null, { timeout: 8000 }).catch(() => {});
    const d = await p.evaluate(() => _crewDraft && _crewDraft.photo ? { w: _crewDraft.photo.w, h: _crewDraft.photo.h, kb: Math.round(_crewDraft.photo.bytes / 1024), jpg: _crewDraft.photo.b64.slice(0, 4) } : null);
    C.check('…a 3000 × 2250 photo becomes a 1280 × 960 JPEG under 400 KB', d && d.w === 1280 && d.h === 960 && d.kb <= 400 && d.jpg === '/9j/', JSON.stringify(d));
    await p.fill('#hist-overlay .cr-txt', 'First time on clay this year.');
    await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click()); await p.waitForTimeout(600);
    const post = (await calls(p, 'crew_post'))[0] || {};
    C.check('…Post sends the words, the photo and its size, as a post', post.p_body === 'First time on clay this year.' && /^\/9j\//.test(post.p_photo || '') && post.p_w === 1280 && post.p_h === 960 && post.p_kind === 'post', JSON.stringify(Object.assign({}, post, { p_photo: String(post.p_photo).slice(0, 8) })));
    C.check('…the sheet closes and the post is first after Amir\'s, with Delete', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')
      && /First time on clay/.test((document.querySelectorAll('#crew-body .cr-post')[1] || {}).textContent || '') && !!document.querySelectorAll('#crew-body .cr-post')[1].querySelector('.cr-del')));
    C.check('…your own post\'s kudos cannot be tapped', await p.evaluate(() => document.querySelectorAll('#crew-body .cr-post')[1].querySelector('.cr-kd').disabled));
    // Tell the crew: a session only with a photo
    C.check('Tell the crew sits on every finished card once the athlete can post', await p.evaluate(() => { const e = [...document.querySelectorAll('.complete-crew[data-day]')]; return e.length > 0 && e.every(x => !x.hidden && /Tell the crew/.test(x.textContent)); }));
    await p.evaluate(() => openCrewPost('session', '2')); await p.waitForTimeout(300);
    const t = await p.evaluate(() => ({ txt: document.querySelector('#hist-overlay .cr-txt').value, dis: document.querySelector('#hist-overlay .cr-go').disabled, eb: document.querySelector('#hist-overlay .readiness-eyebrow').textContent }));
    C.check('…it drafts "Day 2 done." and Post waits for a photo', /^Day 2 done\./.test(t.txt) && t.dis && t.eb === 'Tell the crew', JSON.stringify(t));
    await p.evaluate(() => closeHistorySheet());
    // the switches and the no
    await p.evaluate(() => openCrewSettings()); await p.waitForTimeout(300);
    C.check('the settings: Yes pressed and a switch per kind (8)', await p.evaluate(() => document.querySelector('#hist-overlay .acct-seg [data-ans="yes"]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#hist-overlay .cr-sw input').length === 8));
    await p.evaluate(() => { const i = document.querySelector('#hist-overlay .cr-sw input[data-kind="best"]'); i.checked = false; i.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
    C.check('…a switch off: crew_kinds({ best: false })', (await calls(p, 'crew_kinds')).some(x => x.p_kinds && x.p_kinds.best === false));
    await p.evaluate(() => document.querySelector('#hist-overlay .acct-seg [data-ans="no"]').click()); await p.waitForTimeout(600);
    C.check('…No: crew_answer("no"), the switches hide, the composer goes', (await calls(p, 'crew_answer')).some(x => x.p_answer === 'no')
      && await p.evaluate(() => document.querySelector('#hist-overlay .cr-sws').hidden && !document.querySelector('.cr-comp')));
    await p.evaluate(() => closeHistorySheet());
    // the account sheet's door, and the guide
    await p.evaluate(() => openAccount()); await p.waitForTimeout(200);
    C.check('the account sheet has Crew and the Bell', !!(await p.$('#acct-crew')));
    await p.evaluate(() => document.getElementById('acct-crew').click()); await p.waitForTimeout(200);
    C.check('…it opens the settings with ‹ Back to the account', await p.evaluate(() => /Crew and the Bell/.test(document.querySelector('#hist-overlay .readiness-title').textContent) && !!document.querySelector('#hist-overlay .sheet-back')));
    await p.evaluate(() => closeHistorySheet());
    const g = await p.evaluate(() => buildAppGuideCards());
    C.check('the guide: a Crew card naming its controls, and Crew among the tabs', /Crew and the Bell/.test(g) && /<strong>Crew<\/strong> is the crew/.test(g) && /Share something with the crew/.test(g) && /Tell the crew/.test(g) && /Ring it/.test(g));
    // never synced
    const synced = await p.evaluate(() => Object.keys(_snapshot()).filter(k => /crewcache|crewseen/.test(k)));
    C.check('the Bell\'s copy and the seen post never sync', synced.length === 0 && !!(await p.evaluate(id => localStorage.getItem(id + '_crewcache'), H.ID)), JSON.stringify(synced));
    C.check('no page errors (the first visit)', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 5. an athlete Amir ticked under 13: reads only
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', under13: true, can_post: false } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    const u = await p.evaluate(() => ({ ask: !!document.querySelector('#crew-ask'), comp: !!document.querySelector('.cr-comp'), quiet: document.getElementById('crew-body').innerText,
      kd: [...document.querySelectorAll('#crew-body .cr-kd')].every(b => b.disabled), tell: [...document.querySelectorAll('.complete-crew[data-day]')].every(x => x.hidden) }));
    C.check('under 13: no question, no composer, "Posting is off", no kudos, no Tell the crew', !u.ask && !u.comp && /Posting is off for your account/.test(u.quiet) && u.kd && u.tell, JSON.stringify(Object.assign({}, u, { quiet: '' })));
    await ctx.close();
  }
  // 6. a narrow phone and dark mode: five tabs fit, nothing scrolls sideways
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true }, opts: { w: 320, h: 640, dark: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    const n = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth,
      tabs: [...document.querySelectorAll('#global-tabs .nav-item')].map(b => { const r = b.getBoundingClientRect(), l = b.querySelector('.nav-label'); return l.scrollWidth <= l.clientWidth + 1 && r.right <= innerWidth + 1; }) }));
    C.check('320 px, dark: five tabs, every label whole, no sideways scroll', n.tabs.length === 5 && n.tabs.every(Boolean) && n.sw <= n.w, JSON.stringify(n));
    C.check('…no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
