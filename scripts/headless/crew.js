// Crew and the Bell (Career Mode round 5, step 5; stage81, 2026-10-19): node scripts/headless/crew.js
//
// The tab is added to the bar only once get_bell() answers (no answer, a server without stage81, the demo: no tab, the guide names no
// Crew); the question asked once (Join the crew / Keep it to me); the feed (Amir's pinned post with the tab's clay dot until Crew is opened,
// a Bell line in words with no weight, a photo post that asks crew_photo() for its photo); a Like on and off, and the join offer a
// non-member gets when they tap it; the five-chip row once the server offers the emoji (stage82) and the Like alone without it;
// the composer (a message, a
// photo made smaller on the phone to 1280 px JPEG, the limits); Tell the crew (a session only with a photo, Day N drafted); the switches
// and the no; an athlete ticked under 13 reads only; the account sheet's door; the guide; Back closes the photo; never synced; 320 px and
// dark mode. The Monthly Open's card (stage85): the challenge, the board and its order, your own row, the WhatsApp door, an empty board,
// a long one, no card without the stage. Made-up people only. The stub answers the crew_* calls by name (stub.js).
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
  // 2. a server without stage81 (it was rolled back): the tab stands on the copy until Crew is opened, then both go.
  //    Since 2026-10-19 the app asks for nothing at boot when it holds a copy (Amir's slow connection), so this is where it learns.
  {
    const { ctx, p } = await open(browser, { bell: null, stub: { bellMissing: true }, seed: { _crewcache: bell({ answer: 'yes', can_post: true }) } });
    await p.waitForTimeout(3200);
    C.check('with a copy, a boot asks nothing and the tab stands', (await tabs(p)).includes('crew') && !(await calls(p, 'get_bell')).length && !(await calls(p, 'get_bell_if_new')).length);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(900);
    const left = await p.evaluate(id => localStorage.getItem(id + '_crewcache'), H.ID);
    C.check('…opening Crew finds get_bell gone: no Crew tab, the copy deleted', (await tabs(p)) === 'home,plan,workouts,notes' && left === null, (await tabs(p)) + ' ' + String(left).slice(0, 40));
    await ctx.close();
  }
  // 2b. a phone that has never had an answer asks once at boot, so a new athlete gets the tab without opening anything
  {
    const { ctx, p } = await open(browser);
    await p.waitForTimeout(3200);
    C.check('with no copy at all, the app asks once at boot and the tab appears', (await calls(p, 'get_bell_if_new')).length === 1 && (await tabs(p)).includes('crew'));
    await ctx.close();
  }
  // 3. the demo never asks
  {
    const { ctx, p } = await open(browser, { opts: { query: '?client=demo' } });
    await p.waitForTimeout(2200);
    C.check('the demo: no Crew tab and no get_bell call', !(await tabs(p)).includes('crew') && !(await calls(p, 'get_bell')).length);
    await ctx.close();
  }
  // 4. the first visit: the tab, its dot, the question, the feed, the Like, the photo, Back
  {
    const { ctx, p } = await open(browser);
    C.check('get_bell answers: the Crew tab appears before Coach', await waitTab(p) && (await tabs(p)) === 'home,plan,workouts,crew,notes', await tabs(p));
    C.check('…with a clay dot for Amir\'s new pinned post, before Crew is opened', !!(await p.$('#global-tabs [data-tab="crew"] .nav-dot')));
    C.check('…asked with the athlete\'s own id', (await calls(p, 'get_bell')).every(x => x && x.p_athlete_id === H.ID));
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    const s = await p.evaluate(() => ({
      lit: (document.querySelector('#global-tabs .nav-item.active') || {}).dataset.tab, dot: !!document.querySelector('#global-tabs [data-tab="crew"] .nav-dot'),
      ask: !!document.querySelector('#crew-ask'), askBtns: [...document.querySelectorAll('#crew-ask button')].map(b => b.textContent.trim()).join('|'),
      askH: (document.querySelector('#crew-ask h2') || {}).textContent || '',
      comp: !!document.querySelector('.cr-comp'), pin: (document.querySelector('.cr-post.amir .cr-pin') || {}).className || '',
      first: (document.querySelector('#crew-body .cr-post, #crew-body .cr-line') || {}).className || '',
      line: ((document.querySelector('.cr-line .cr-lw') || {}).firstChild || {}).textContent || '',
      hon: [...document.querySelectorAll('.cr-hon > div')].map(d => [...d.children].map(c => c.textContent.trim()).join(' ')).join('|'),
      board: [...document.querySelectorAll('.cr-br')].map(d => d.textContent.replace(/\s+/g, ' ').trim()).join('|'),
      text: document.getElementById('screen-crew').innerText,
    }));
    C.check('Crew opened: the tab is lit and its dot gone', s.lit === 'crew' && !s.dot, JSON.stringify([s.lit, s.dot]));
    C.check('…Amir\'s post counts as seen on this phone', (await p.evaluate(id => localStorage.getItem(id + '_crewseen'), H.ID)) === AMIR);
    C.check('…the question, once: Join the crew / Keep it to me, and no composer before the answer', s.ask && s.askBtns === 'Join the crew|Keep it to me' && !s.comp, s.askBtns);
    C.check('…it asks "Join the crew?", never "Ring the bell"', /Join the crew\?/.test(s.askH) && !/Ring (it|the bell)/i.test(s.text), s.askH);
    C.check('…Amir\'s post pinned first, its pin clay on the visit that first shows it', /cr-post amir/.test(s.first) && /cr-pin is-new/.test(s.pin), s.first + ' / ' + s.pin);
    C.check('…the Bell line in words: level, the lift (never a weight), the run', s.line === 'Mina S. reached level 14 · set a new best on Barbell Back Squat · held a week, 5 in a row', s.line);
    C.check('…no weight, no kg anywhere on Crew', !/\bkg\b|\d+\s*kg/i.test(s.text));
    C.check('…last month\'s honours: names and what they did', /Most sessions Reza K\. 14 plan sessions/.test(s.hon) && /Most improved Leila M\. Back Squat \+27\.1%/.test(s.hon), s.hon);
    C.check('…the season board: plain numbers, your row as You', s.board === '1Reza K.LV 226,240|2YouLV 195,910', s.board);
    C.check('…likes with names: "Mina S., Sara T. and 1 other"', /Mina S\., Sara T\. and 1 other/.test(s.text));
    C.check('…the button says Like, never Kudos', /\bLike\b/.test(s.text) && !/kudos/i.test(s.text), s.text.slice(0, 80));
    // Before joining the button is NOT dead: it offers to join (Amir, 2026-10-19)
    C.check('…before joining, Like is still tappable', await p.evaluate(() => [...document.querySelectorAll('#crew-body .cr-kd')].every(b => !b.disabled && /crewLikeAsk/.test(b.getAttribute('onclick') || ''))));
    await p.evaluate(() => document.querySelector('#crew-body .cr-kd').click());
    await p.waitForTimeout(300);
    const ask0 = await p.evaluate(() => { const t = document.getElementById('aaToast'); return { on: !t.hidden, txt: t.innerText.replace(/\s+/g, ' ').trim() }; });
    C.check('…tapping it says to join first, with a Join the crew button', ask0.on && /Join the crew to like a post/.test(ask0.txt) && /Join the crew/.test(ask0.txt) && !(await calls(p, 'crew_kudos')).length, JSON.stringify(ask0));
    C.check('…and the toast\'s button answers yes', await p.evaluate(async () => { [...document.querySelectorAll('#aaToast button')].find(b => /Join the crew/.test(b.textContent)).click(); return true; }) && (await p.waitForTimeout(500), (await calls(p, 'crew_answer')).some(x => x.p_answer === 'yes')));
    await p.evaluate(() => crewAnswer('no'));
    await p.waitForTimeout(400);
    // the photo: asked when its card comes near the screen
    await p.evaluate(() => document.querySelector('.cr-ph').scrollIntoView()); await p.waitForTimeout(600);
    const ph = await p.evaluate(() => { const b = document.querySelector('.cr-ph'); const im = b.querySelector('img'); return { in: b.classList.contains('is-in'), src: (im.getAttribute('src') || '').slice(0, 5), ratio: Math.round(b.getBoundingClientRect().height / b.getBoundingClientRect().width * 100) }; });
    C.check('…the photo card asks crew_photo() for its post and shows it, at 4:5', ph.in && ph.src === 'blob:' && ph.ratio === 125 && (await calls(p, 'crew_photo')).some(x => x.p_post === PHOTO), JSON.stringify(ph));
    await p.evaluate(id => openCrewPhoto(id), PHOTO); await p.waitForTimeout(300);
    C.check('the photo opens full screen, with its words and a ✕', await p.evaluate(() => { const v = document.getElementById('crew-viewer'); return v.classList.contains('visible') && /6 am session/.test(v.textContent) && !!v.querySelector('.cr-x'); }));
    await p.goBack(); await p.waitForTimeout(300);
    C.check('…the phone\'s Back closes it and stays on Crew', await p.evaluate(() => !document.getElementById('crew-viewer').classList.contains('visible') && document.getElementById('screen-crew').classList.contains('active')));
    // the yes, from the question itself
    await p.evaluate(() => { if (document.querySelector('#crew-ask .cr-go')) document.querySelector('#crew-ask .cr-go').click(); else crewAnswer('yes'); });
    await p.waitForTimeout(500);
    const ans = await calls(p, 'crew_answer');
    C.check('Join the crew: crew_answer("yes") with the board name', ans.some(x => x.p_answer === 'yes' && x.p_name === 'Alex R.'), JSON.stringify(ans));
    C.check('…the question goes and the composer comes', await p.evaluate(() => !document.querySelector('#crew-ask') && !!document.querySelector('.cr-comp')));
    // a Like on a line, then off
    await p.evaluate(() => document.querySelector('.cr-line .cr-kd').click()); await p.waitForTimeout(400);
    const k1 = await p.evaluate(() => { const b = document.querySelector('.cr-line .cr-kd'); return { pressed: b.getAttribute('aria-pressed'), txt: b.textContent.trim(), w: document.querySelector('.cr-line small').textContent }; });
    C.check('a Like on a Bell line: pressed, counted, "You"', k1.pressed === 'true' && k1.txt === 'Like 1' && /^You · /.test(k1.w), JSON.stringify(k1));
    C.check('…crew_kudos(the line\'s key, on) is the call behind it', (await calls(p, 'crew_kudos')).some(x => x.p_target === KEY && x.p_on === true));
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
    C.check('…a 3000 × 2250 photo becomes a 1080 × 810 JPEG under 200 KB', d && d.w === 1080 && d.h === 810 && d.kb <= 200 && d.jpg === '/9j/', JSON.stringify(d));
    await p.fill('#hist-overlay .cr-txt', 'First time on clay this year.');
    await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click()); await p.waitForTimeout(600);
    const post = (await calls(p, 'crew_post'))[0] || {};
    C.check('…Post sends the words, the photo and its size, as a post', post.p_body === 'First time on clay this year.' && /^\/9j\//.test(post.p_photo || '') && post.p_w === 1080 && post.p_h === 810 && post.p_kind === 'post', JSON.stringify(Object.assign({}, post, { p_photo: String(post.p_photo).slice(0, 8) })));
    C.check('…the sheet closes and the post is first after Amir\'s, with Delete', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')
      && /First time on clay/.test((document.querySelectorAll('#crew-body .cr-post')[1] || {}).textContent || '') && !!document.querySelectorAll('#crew-body .cr-post')[1].querySelector('.cr-del')));
    C.check('…you cannot like your own post', await p.evaluate(() => document.querySelectorAll('#crew-body .cr-post')[1].querySelector('.cr-kd').disabled));
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
    C.check('the guide: a Crew card naming its controls, and Crew among the tabs', /Crew and the Bell/.test(g) && /<strong>Crew<\/strong> is the crew/.test(g) && /Share something with the crew/.test(g) && /Tell the crew/.test(g) && /<strong>Join the crew<\/strong>/.test(g));
    C.check('…and it says Like, not Kudos, and never Ring it', /<strong>Like<\/strong>/.test(g) && !/kudos/i.test(g) && !/Ring it/.test(g));
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
    C.check('under 13: no question, no composer, "Posting is off", no Like, no Tell the crew', !u.ask && !u.comp && /Posting is off for your account/.test(u.quiet) && u.kd && u.tell, JSON.stringify(Object.assign({}, u, { quiet: '' })));
    C.check('…and tapping their dead Like offers them nothing (they cannot join)', await p.evaluate(() => { crewLikeAsk(); return document.getElementById('aaToast').hidden; }));
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

  // 7. the emoji beside the Like (stage82): drawn only while the server hands over the list
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true }, bell: Object.assign(bell({ answer: 'yes', can_post: true }), { emoji: ['🔥', '💪', '👏', '😍'] }) });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    const row = await p.evaluate(() => {
      const r = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react');
      return { kinds: [...r.children].map(b => b.className), chips: [...r.querySelectorAll('.cr-em i')].map(i => i.textContent).join(''),
               like: r.querySelector('.cr-kd').textContent.trim(), wide: r.scrollWidth <= r.clientWidth + 1 };
    });
    C.check('the Like and the four emoji are all out, in order', row.chips === '🔥💪👏😍' && row.kinds[0] === 'cr-kd' && row.kinds.length === 5, JSON.stringify(row));
    C.check('…and the row does not scroll sideways at 390 px', row.wide, JSON.stringify(row));
    await p.evaluate(() => [...[...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelectorAll('.cr-em')].find(b => /🔥/.test(b.textContent)).click());
    await p.waitForTimeout(400);
    const after = await p.evaluate(() => {
      const r = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react');
      return { fire: r.querySelector('.cr-em[aria-pressed="true"] i').textContent, n: r.querySelector('.cr-em[aria-pressed="true"] b').textContent,
               like: r.querySelector('.cr-kd').textContent.trim(), pressedLike: r.querySelector('.cr-kd').getAttribute('aria-pressed') };
    });
    const sent = await calls(p, 'crew_kudos');
    C.check('tapping 🔥 sends it and marks it', after.fire === '🔥' && after.n === '1' && sent.some(x => x.p_emoji === '🔥' && x.p_on === true), JSON.stringify([after, sent]));
    await p.evaluate(() => [...[...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelectorAll('.cr-em')].find(b => /💪/.test(b.textContent)).click());
    await p.waitForTimeout(400);
    const swap = await p.evaluate(() => {
      const r = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react');
      return { on: [...r.querySelectorAll('.cr-em[aria-pressed="true"] i')].map(i => i.textContent), counts: [...r.querySelectorAll('.cr-em')].map(b => (b.querySelector('b') || {}).textContent || '') };
    });
    C.check('…sending another swaps it: only one is pressed and 🔥 goes back to none', swap.on.join('') === '💪' && swap.counts[0] === '', JSON.stringify(swap));
    await p.evaluate(() => [...[...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelectorAll('.cr-em')].find(b => /💪/.test(b.textContent)).click());
    await p.waitForTimeout(400);
    C.check('…tapping the one you sent takes it back', await p.evaluate(() => {
      const r = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react');
      return !r.querySelector('[aria-pressed="true"]');
    }) && (await calls(p, 'crew_kudos')).some(x => x.p_on === false));
    await p.evaluate(() => document.querySelector('#crew-body .cr-line .cr-react .cr-em').click());
    await p.waitForTimeout(400);
    C.check('a Bell line takes one too, under its words', await p.evaluate(() => !!document.querySelector('#crew-body .cr-line .cr-react .cr-em[aria-pressed="true"]')));
    C.check('no page errors (the emoji row)', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 8. a server without stage82: no list, so the Like alone
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    C.check('without the list (no stage82) the row is the Like alone', await p.evaluate(() => !document.querySelector('#crew-body .cr-em') && !!document.querySelector('#crew-body .cr-kd')));
    await ctx.close();
  }
  // 9. not joined: every chip offers to join, and under 13 none of them does anything
  {
    const { ctx, p } = await open(browser, { me: { answer: null, can_post: false }, bell: Object.assign(bell({ answer: null, can_post: false }), { emoji: ['🔥', '💪', '👏', '😍'] }) });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    C.check('not joined: the emoji are tappable and all offer to join', await p.evaluate(() =>
      [...document.querySelectorAll('#crew-body .cr-em')].every(b => !b.disabled && /crewLikeAsk/.test(b.getAttribute('onclick') || ''))));
    await p.evaluate(() => document.querySelector('#crew-body .cr-em').click());
    await p.waitForTimeout(300);
    C.check('…tapping one says to join first', await p.evaluate(() => !document.getElementById('aaToast').hidden) && !(await calls(p, 'crew_kudos')).length);
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', under13: true, can_post: false }, bell: Object.assign(bell({ answer: 'yes', under13: true, can_post: false }), { emoji: ['🔥', '💪', '👏', '😍'] }) });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    C.check('under 13: the Like and every emoji are dead', await p.evaluate(() => [...document.querySelectorAll('#crew-body .cr-kd, #crew-body .cr-em')].every(b => b.disabled)));
    await ctx.close();
  }

  // 10. a slow connection: nothing is asked for unless Crew is opened, and a photo is downloaded once (Amir, 2026-10-19)
  {
    const b = Object.assign(bell({ answer: 'yes', can_post: true }), { emoji: ['🔥', '💪', '👏', '😍'], etag: 'tag-A' });
    const { ctx, p } = await open(browser, { bell: b, seed: { _crewcache: Object.assign({}, b, { at: new Date().toISOString() }) } });
    await waitTab(p);
    await p.waitForTimeout(3200);   // past the first-look (2.5 s): with a copy on the phone it must ask for nothing
    C.check('with a copy on the phone, opening the app asks the server for nothing', (await calls(p, 'get_bell_if_new')).length === 0 && (await calls(p, 'get_bell')).length === 0,
      JSON.stringify(await p.evaluate(() => (window.__STUB.calls || []).filter(c => /get_bell/.test(c)))));
    C.check('…and the Crew tab is still there, from that copy', (await tabs(p)).includes('crew'));
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700);
    const asked = await calls(p, 'get_bell_if_new');
    C.check('opening Crew asks once, with the hash of the copy', asked.length === 1 && asked[0].p_etag === 'tag-A', JSON.stringify(asked));
    C.check('…and an unchanged feed sends nothing back: the copy stands', await p.evaluate(() => BELL && BELL.etag === 'tag-A' && !!document.querySelector('#crew-body .cr-post')));
    await p.evaluate(() => { goTo('home'); goTo('crew'); }); await p.waitForTimeout(500);
    C.check('…going back in within ten minutes asks nothing again', (await calls(p, 'get_bell_if_new')).length === 1);
    // the photo: downloaded once, then kept on the phone
    await p.evaluate(() => document.querySelector('.cr-ph').scrollIntoView()); await p.waitForTimeout(800);
    C.check('the photo is downloaded on the first look', (await calls(p, 'crew_photo')).length === 1);
    const kept = await p.evaluate(async () => { const c = await caches.open('crew-photos-v1'); return (await c.keys()).length; });
    C.check('…and kept on the phone (Cache Storage, not memory)', kept === 1, String(kept));
    await ctx.close();
  }
  {
    // the same phone, opened again (a reload keeps Cache Storage, as closing and opening the app does)
    const b = Object.assign(bell({ answer: 'yes', can_post: true }), { emoji: ['🔥'], etag: 'tag-A' });
    const { ctx, p } = await open(browser, { bell: b, seed: { _crewcache: Object.assign({}, b, { at: new Date().toISOString() }) } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector('.cr-ph').scrollIntoView()); await p.waitForTimeout(900);
    C.check('the first look downloads the photo', (await calls(p, 'crew_photo')).length === 1);
    await p.reload({ waitUntil: 'domcontentloaded' });
    await p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector('.cr-ph').scrollIntoView()); await p.waitForTimeout(900);
    const shown = await p.evaluate(() => { const b2 = document.querySelector('.cr-ph'); return b2.classList.contains('is-in') && (b2.querySelector('img').getAttribute('src') || '').slice(0, 5); });
    C.check('after closing and opening the app the photo comes off the phone, nothing is downloaded', shown === 'blob:' && (await calls(p, 'crew_photo')).length === 0,
      JSON.stringify([shown, (await calls(p, 'crew_photo')).length]));
    await ctx.close();
  }
  {
    // a server without stage83: the app learns once and asks the plain feed from then on
    const { ctx, p } = await open(browser, { bell: bell({ answer: 'yes', can_post: true }), stub: { ifNewMissing: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700);
    C.check('without stage83 the app falls back to get_bell and still draws the feed', (await calls(p, 'get_bell')).length >= 1 && await p.evaluate(() => !!document.querySelector('#crew-body .cr-post')));
    await ctx.close();
  }

  // ── The Monthly Open (stage85): one card above the Bell, a board Amir fills, one door to WhatsApp ──────────────────────
  const OPEN = (o = {}) => Object.assign({
    id: 'aaaaaaaa-0000-4000-8000-000000000084', title: 'Wall Sit', how: 'Back to the wall, knees at 90. Send me the clip.',
    unit: 'seconds', better: 'high',
    board: [{ who: 'Reza K.', value: 120, place: 1, me: false }, { who: 'Alex R.', value: 95, place: 2, me: true }],
    mine: { value: 95, day: iso(now).slice(0, 10) } }, o);
  const openCrew = async (p) => { await waitTab(p); await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700); };
  {
    const b = bell({ answer: 'yes', can_post: true });
    b.open = OPEN();
    const { ctx, p } = await open(browser, { bell: b });
    await openCrew(p);
    const o = await p.evaluate(() => {
      const c = document.querySelector('#screen-crew .cr-open');
      if (!c) return null;
      const y = sel => { const e = document.querySelector(sel); return e ? Math.round(e.getBoundingClientRect().top + scrollY) : null; };
      return { k: c.querySelector('.k').textContent, title: c.querySelector('h3').textContent, how: (c.querySelector('.how') || {}).textContent || '',
        rows: [...c.querySelectorAll('.cr-ob-r')].map(r => [r.querySelector('.p').textContent, r.querySelector('.n').textContent, r.querySelector('.v').textContent, r.classList.contains('me')]),
        mine: (c.querySelector('.cr-o-mine') || {}).textContent || '', go: c.querySelector('.cr-o-go').textContent,
        href: c.querySelector('.cr-o-go').getAttribute('href'), more: !!c.querySelector('.cr-o-more'),
        above: [y('.cr-open'), y('#screen-crew .cr-comp')], text: c.innerText };
    });
    C.check('the Open: one card headed THE OPEN with the challenge and Amir\'s words', !!o && o.k === 'The Open' && o.title === 'Wall Sit' && /knees at 90/.test(o.how), JSON.stringify(o && [o.k, o.title]));
    C.check('…the board is ranked by the result, with the unit and your own row as You', !!o && JSON.stringify(o.rows) === JSON.stringify([['1', 'Reza K.', '120 seconds', false], ['2', 'You', '95 seconds', true]]), JSON.stringify(o && o.rows));
    C.check('…your own result is named under it', !!o && /Your result: 95 seconds/.test(o.mine), o && o.mine);
    C.check('…and the one door is WhatsApp, drafting the challenge', !!o && o.go === 'Send a better one' && /wa\.me|whatsapp/.test(o.href) && /Wall%20Sit|Wall\+Sit|Wall Sit/.test(decodeURI(o.href)), o && [o.go, o.href].join(' '));
    C.check('…it sits above the composer, under the honours', !!o && o.above[0] < o.above[1], JSON.stringify(o && o.above));
    C.check('…no weight and no kg on the card', !!o && !/\bkg\b/i.test(o.text));
    C.check('…no page errors', !p.errs.length, p.errs.join(' | '));
    await p.screenshot({ path: require('path').join(H.outDir(), 'crew-open-390.png') }).catch(() => {});
    await ctx.close();
  }
  {
    // nobody has a result yet, and the athlete has none of their own
    const b = bell({ answer: 'yes', can_post: true });
    b.open = OPEN({ board: [], mine: null });
    const { ctx, p } = await open(browser, { bell: b });
    await openCrew(p);
    const o = await p.evaluate(() => { const c = document.querySelector('#screen-crew .cr-open'); return c ? { none: !!c.querySelector('.cr-o-none'), txt: c.innerText, go: c.querySelector('.cr-o-go').textContent } : null; });
    C.check('the Open with no results: it says so and asks for the first', !!o && o.none && /Be first/.test(o.txt) && o.go === 'Send Amir your result', JSON.stringify(o && [o.none, o.go]));
    await ctx.close();
  }
  {
    // they have not joined, so they are not on the board: their own result still shows, from `mine`
    const b = bell({ answer: 'no' });
    b.open = OPEN({ board: [{ who: 'Reza K.', value: 120, place: 1, me: false }], mine: { value: 80, day: iso(now).slice(0, 10) } });
    const { ctx, p } = await open(browser, { bell: b });
    await openCrew(p);
    const o = await p.evaluate(() => { const c = document.querySelector('#screen-crew .cr-open'); return c ? { mine: (c.querySelector('.cr-o-mine') || {}).textContent || '', rows: c.querySelectorAll('.cr-ob-r').length } : null; });
    C.check('not in the crew: the board is the members’, and your own result still shows under it', !!o && o.rows === 1 && /Your result: 80 seconds/.test(o.mine), JSON.stringify(o));
    await ctx.close();
  }
  {
    // a long board: the first five, Show all, and your own row even when it is outside them
    const board = [];
    for (let i = 1; i <= 9; i++) board.push({ who: 'Athlete ' + i, value: 200 - i * 10, place: i, me: i === 8 });
    const b = bell({ answer: 'yes', can_post: true });
    b.open = OPEN({ board, mine: { value: 130, day: iso(now).slice(0, 10) } });
    const { ctx, p } = await open(browser, { bell: b });
    await openCrew(p);
    const first = await p.evaluate(() => ({ n: document.querySelectorAll('#screen-crew .cr-ob-r').length,
      me: !!document.querySelector('#screen-crew .cr-ob-r.me'), more: (document.querySelector('.cr-o-more') || {}).textContent || '' }));
    C.check('a long board: five rows, your own carried in beneath them, and Show all 9', first.n === 6 && first.me && /Show all 9/.test(first.more), JSON.stringify(first));
    await p.evaluate(() => crewOpenAll()); await p.waitForTimeout(300);
    const all = await p.evaluate(() => ({ n: document.querySelectorAll('#screen-crew .cr-ob-r').length, more: !!document.querySelector('.cr-o-more') }));
    C.check('…Show all opens every row and the button goes', all.n === 9 && !all.more, JSON.stringify(all));
    const fit = await p.evaluate(() => ({ wide: document.documentElement.scrollWidth > innerWidth + 1 }));
    C.check('…no sideways scroll', !fit.wide);
    await ctx.close();
  }
  {
    // a server without stage85 (or no challenge set): no card at all, and the rest of Crew is untouched
    for (const [what, open_] of [['a server without stage85', undefined], ['no challenge set', null]]) {
      const b = bell({ answer: 'yes', can_post: true });
      if (open_ !== undefined) b.open = open_;
      const { ctx, p } = await open(browser, { bell: b });
      await openCrew(p);
      const o = await p.evaluate(() => ({ card: !!document.querySelector('.cr-open'), feed: !!document.querySelector('#crew-body .cr-post'), board: !!document.querySelector('.cr-brd') }));
      C.check(`${what}: no Open card, and the feed and the board are as they were`, !o.card && o.feed && o.board, JSON.stringify(o));
      C.check(`${what}: no page errors`, !p.errs.length, p.errs.join(' | '));
      await ctx.close();
    }
  }
  {
    // 320 px and dark mode
    const b = bell({ answer: 'yes', can_post: true });
    b.open = OPEN();
    const { ctx, p } = await open(browser, { bell: b, opts: { w: 320 } });
    await openCrew(p);
    const fit = await p.evaluate(() => ({ right: Math.max(...[...document.querySelectorAll('.cr-open, .cr-o-go')].map(e => e.getBoundingClientRect().right)), vw: innerWidth, wide: document.documentElement.scrollWidth > innerWidth + 1 }));
    C.check('320 px: the Open card and its button fit', fit.right <= fit.vw && !fit.wide, JSON.stringify(fit));
    await p.evaluate(() => document.body.setAttribute('data-dark', '1')); await p.waitForTimeout(200);
    const dark = await p.evaluate(() => { const c = document.querySelector('.cr-open'); const bg = getComputedStyle(c).backgroundColor; const ink = getComputedStyle(c.querySelector('h3')).color; return { bg, ink }; });
    C.check('dark mode: the card takes the dark paper and its title the dark ink', dark.bg !== 'rgb(255, 255, 255)' && dark.ink !== 'rgb(26, 26, 26)', JSON.stringify(dark));
    await ctx.close();
  }
  {
    // Asking for the phone (Amir, 2026-10-20): "the person who installs the app, ask for notifications
    // to be turned on", and "if some one joins the crew, again it should ask".
    //
    // ⚠️ What matters here is not that the line appears but that the PHONE'S BOX is never opened by us:
    // the ask is a toast with a button, and the box opens only inside that button's click. A real grant
    // cannot be driven headlessly (that is the point of the feature), so AAPush is stubbed and what is
    // checked is every decision around the tap.
    const b = bell({ answer: 'no', can_post: false });
    const { ctx, p } = await open(browser, { bell: b });
    await p.waitForTimeout(1500);
    // 'off' is "they have not answered the box yet" — the only state worth asking in.
    const stub = (state) => p.evaluate(s => {
      window.__ASKS = [];
      window.AAPush = Object.assign({}, window.AAPush, {
        state: () => s,
        markAsked: () => {},
        enable: () => { window.__ASKS.push('enable'); return Promise.resolve({ ok: true, me: { on: true } }); },
      });
      try { Object.keys(localStorage).filter(k => k.indexOf('aa_push_ask_') === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {}
      const t = document.getElementById('aaToast'); if (t) t.hidden = true;
    }, state);
    const toast = () => p.evaluate(() => {
      const el = document.getElementById('aaToast');
      if (!el || el.hidden) return null;
      const go = el.querySelector('.aa-toast-go'), x = el.querySelector('.aa-toast-x');
      return { text: (el.querySelector('.aa-toast-t') || {}).textContent, action: go && go.textContent, dismiss: x && x.textContent };
    });

    await stub('off');
    const shown = await p.evaluate(() => pushAsk('zz', 'a line about what arrives'));
    let t = await toast();
    C.check('push off: the ask is a toast with a Turn them on button', shown === true && !!t && t.action === 'Turn them on', JSON.stringify(t));
    C.check('…and it waits for them instead of fading (ms: 0)', await p.evaluate(() => new Promise(r => setTimeout(() => r(!document.getElementById('aaToast').hidden), 7000))));
    C.check('…nothing was sent to the phone until the button is tapped', (await p.evaluate(() => window.__ASKS)).length === 0);
    await p.evaluate(() => document.querySelector('#aaToast .aa-toast-go').click());
    await p.waitForTimeout(300);
    C.check('…the tap is what calls enable(), so the box opens inside their own gesture',
      (await p.evaluate(() => window.__ASKS)).join() === 'enable');

    // One ask per reason: the same reason again says nothing, a different one may.
    await p.evaluate(() => { document.getElementById('aaToast').hidden = true; });
    C.check('the same reason is never asked twice', (await p.evaluate(() => pushAsk('zz', 'again'))) === false && !(await toast()));
    C.check('a different reason may still ask once', (await p.evaluate(() => pushAsk('zz2', 'another'))) === true);

    // The states where asking is wrong: already on, refused for good, or waiting for the Home Screen.
    for (const s of ['on', 'blocked', 'needs-install', 'unsupported']) {
      await stub(s);
      C.check(`push ${s}: nothing is asked`, (await p.evaluate(() => pushAsk('zz3', 'x'))) === false && !(await toast()));
    }

    // Joining the crew IS the second moment, and the ask replaces the join toast rather than stacking
    // a second one behind it.
    await stub('off');
    await p.evaluate(() => { window.BELL = window.BELL || {}; });
    const joined = await p.evaluate(async () => { await crewAnswer('yes'); return true; });
    t = await toast();
    C.check('joining the crew with the phone off: one toast, and it is the ask',
      joined && !!t && t.action === 'Turn them on' && /crew/i.test(t.text), JSON.stringify(t));

    // With the phone already on, joining says the plain thing and offers nothing.
    await stub('on');
    await p.evaluate(async () => { await crewAnswer('yes'); });
    t = await toast();
    C.check('…and with the phone already on, the plain join toast, no button',
      !!t && !t.action && /crew/i.test(t.text), JSON.stringify(t));
    C.check('no page errors through any of it', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // The install ask is gated on the Home Screen, which on an iPhone is the only place a push works.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'program.html'), 'utf8');
    const fn = src.slice(src.indexOf('function pushAskOnInstall'), src.indexOf('function pushAskOnInstall') + 600);
    C.check('the install ask asks only when the app is on the Home Screen', /_isStandalone\(\)/.test(fn), fn.slice(0, 120));
    C.check('…and only once per phone', /pushAsked\('install'\)/.test(fn));
    C.check('…and it is wired into boot', /pushAskOnInstall\(\);/.test(src.slice(src.indexOf('initCrewDeepLink();'))));
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
