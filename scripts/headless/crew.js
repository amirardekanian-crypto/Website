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
    // TWO bad answers, not one, and the copy is never deleted (2026-10-20, the audit *The Empty Room*). PostgREST answers
    // "could not find the function" for a few seconds after any stage is applied, and one of those used to take the tab away,
    // delete the feed and throw the athlete back to Home mid-read.
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(900);
    const left1 = await p.evaluate(id => localStorage.getItem(id + '_crewcache'), H.ID);
    C.check('…one bad answer changes nothing: the tab stands and the copy is kept',
      (await tabs(p)).includes('crew') && left1 !== null, (await tabs(p)) + ' ' + String(left1).slice(0, 30));
    C.check('…and nobody is moved off the screen they were reading', await p.evaluate(() => !!document.querySelector('#screen-crew.active')));
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(900);
    const left2 = await p.evaluate(id => localStorage.getItem(id + '_crewcache'), H.ID);
    C.check('…a second one hides the tab, still without deleting the copy or moving them',
      left2 !== null && await p.evaluate(() => !!document.querySelector('#screen-crew.active')), String(left2).slice(0, 30));
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(400);
    C.check('…and once they leave, the tab is gone', (await tabs(p)) === 'home,plan,workouts,notes', await tabs(p));
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
      pinCss: (() => { const e = document.querySelector('.cr-post.amir .cr-pin'); if (!e) return null; const c = getComputedStyle(e);
        return { tag: e.tagName, bg: c.backgroundColor, bw: c.borderTopWidth, bs: c.borderTopStyle, bc: c.borderTopColor, color: c.color, cursor: c.cursor }; })(),
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
    C.check('…Amir\'s post pinned first, and its pin is a LABEL: a green outline with no fill, never clay, even on the visit that first shows it (round 7, 2026-10-25)',
      /cr-post amir/.test(s.first) && /cr-pin is-new/.test(s.pin) && !!s.pinCss && s.pinCss.tag === 'SPAN' && s.pinCss.bw === '1px' && s.pinCss.bs === 'solid' && s.pinCss.bg === 'rgba(0, 0, 0, 0)'
      && s.pinCss.bc === s.pinCss.color && s.pinCss.color !== 'rgb(199, 85, 47)' && s.pinCss.cursor !== 'pointer', s.first + ' / ' + s.pin + ' / ' + JSON.stringify(s.pinCss));
    C.check('…the Bell line in words: level, the lift (never a weight), the run', s.line === 'Mina S. reached level 14 · set a new best on Barbell Back Squat · held a week, 5 in a row', s.line);
    C.check('…no weight, no kg anywhere on Crew', !/\bkg\b|\d+\s*kg/i.test(s.text));
    C.check('…last month\'s honours: names and what they did', /Most sessions Reza K\. 14 plan sessions/.test(s.hon) && /Most improved Leila M\. Back Squat \+27\.1%/.test(s.hon), s.hon);
    // ONE ladder (2026-10-20): the LV chip is gone, because the level is lifetime and the number that sorts is this season's.
    C.check('…the board: plain numbers, your row as You, and no LV beside them', s.board === '1Reza K.6,240|2You5,910', s.board);
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
    // (Home Crowd step 4b, 2026-10-25: a member who has never posted opens it to a hello draft; clearing it is what leaves Post waiting for words)
    C.check('the composer opens in the sheet; Post waits for words or a photo', await p.evaluate(() => { const t = document.querySelector('#hist-overlay .cr-txt'); if (t) { t.value = ''; t.dispatchEvent(new Event('input')); } return document.getElementById('hist-overlay').classList.contains('visible') && !!t && document.querySelector('#hist-overlay .cr-go').disabled; }));
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
    C.check('…and your own post offers no reaction at all, not a dead one', await p.evaluate(() => {
      const own = document.querySelectorAll('#crew-body .cr-post')[1];
      return !own.querySelector('.cr-react button') && !own.querySelector('.cr-react [disabled]');
    }));
    // Tell the crew: a session only with a photo
    C.check('Tell the crew sits on every finished card once the athlete can post', await p.evaluate(() => { const e = [...document.querySelectorAll('.complete-crew[data-day]')]; return e.length > 0 && e.every(x => !x.hidden && /Tell the crew/.test(x.textContent)); }));
    await p.evaluate(() => openCrewPost('session', '2')); await p.waitForTimeout(300);
    const t = await p.evaluate(() => ({ txt: document.querySelector('#hist-overlay .cr-txt').value, dis: document.querySelector('#hist-overlay .cr-go').disabled, eb: document.querySelector('#hist-overlay .readiness-eyebrow').textContent }));
    C.check('…it drafts "Day 2 done." and Post waits for a photo', /^Day 2 done\./.test(t.txt) && t.dis && t.eb === 'Tell the crew', JSON.stringify(t));
    await p.evaluate(() => closeHistorySheet());
    // the switches and the no
    await p.evaluate(() => openCrewSettings()); await p.waitForTimeout(300);
    // nine since stage91: a finished session is a kind, with its own switch, on by default (Amir, 2026-10-20)
    C.check('the settings: Yes pressed and a switch per kind (9)', await p.evaluate(() => document.querySelector('#hist-overlay .acct-seg [data-ans="yes"]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#hist-overlay .cr-sw input').length === 9));
    await p.evaluate(() => { const i = document.querySelector('#hist-overlay .cr-sw input[data-kind="best"]'); i.checked = false; i.dispatchEvent(new Event('change')); }); await p.waitForTimeout(400);
    C.check('…a switch off: crew_kinds({ best: false })', (await calls(p, 'crew_kinds')).some(x => x.p_kinds && x.p_kinds.best === false));
    await p.evaluate(() => document.querySelector('#hist-overlay .acct-seg [data-ans="no"]').click()); await p.waitForTimeout(600);
    C.check('…No: crew_answer("no"), the switches hide, the composer goes', (await calls(p, 'crew_answer')).some(x => x.p_answer === 'no')
      && await p.evaluate(() => document.querySelector('#hist-overlay .cr-sws').hidden && !document.querySelector('.cr-comp')));
    await p.evaluate(() => closeHistorySheet());
    // the account sheet's door, and the guide
    await p.evaluate(() => openAccount()); await p.waitForTimeout(200);
    // ONE row, named What the crew sees (round 7, 2026-10-25, "78"): this bell has no Lounge, so the row sits in the main list; with the Lounge it is the Profile group's (lounge.js).
    const rows78 = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .hrow .hrow-v')].map(x => x.textContent.trim()));
    C.check('the account sheet has ONE crew row, "What the crew sees", and nothing is called Crew and the Bell', !!(await p.$('#acct-crew')) && rows78.filter(x => /crew/i.test(x)).join('|') === 'What the crew sees' && !/Crew and the Bell/.test(rows78.join('|')), JSON.stringify(rows78));
    await p.evaluate(() => document.getElementById('acct-crew').click()); await p.waitForTimeout(200);
    C.check('…it opens the settings, titled What the crew sees, with ‹ Back to the account', await p.evaluate(() => document.querySelector('#hist-overlay .readiness-title').textContent === 'What the crew sees' && !!document.querySelector('#hist-overlay .sheet-back')));
    C.check('…its switches say "What the crew sees about you. Turn any of them off." (it is what the crew sees, never what rings the phone)', await p.evaluate(() => {
      const n = document.querySelector('#hist-overlay .cr-sws .cr-note'); return !!n && n.textContent === 'What the crew sees about you. Turn any of them off.' && !/Crew and the Bell|What rings/.test(document.querySelector('#hist-overlay').textContent);
    }));
    await p.evaluate(() => closeHistorySheet());
    const g = await p.evaluate(() => buildAppGuideCards());
    C.check('the guide: a Crew card naming its controls, and Crew among the tabs', /<strong>Crew<\/strong> is the crew/.test(g) && /Share something with the crew/.test(g) && /Tell the crew/.test(g) && /<strong>Join the crew<\/strong>/.test(g));
    C.check('…and it names the real controls: What the crew sees (not Crew and the Bell, not "of you"), In the crew › beside the numbers, and no word of a foot row', /tap your initials, then <strong>What the crew sees<\/strong>/.test(g) && !/Crew and the Bell/.test(g) && !/sees of you/.test(g)
      && /<strong>In the crew ›<\/strong> beside the numbers/.test(g) && !/just below/.test(g));
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
      kd: !document.querySelector('#crew-body .cr-react button'), tell: [...document.querySelectorAll('.complete-crew[data-day]')].every(x => x.hidden) }));
    C.check('under 13: no question, no composer, "Posting is off", no Like, no Tell the crew', !u.ask && !u.comp && /Posting is off for your account/.test(u.quiet) && u.kd && u.tell, JSON.stringify(Object.assign({}, u, { quiet: '' })));
    C.check('…and the join offer stays shut for them (they cannot join)', await p.evaluate(() => { crewLikeAsk(); return document.getElementById('aaToast').hidden; }));
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
      return { kinds: [...r.children].map(b => b.className), chips: [...r.querySelectorAll('.cr-em[data-em]')].map(b => b.dataset.em).join(''),
               icons: [...r.querySelectorAll('.cr-em i svg')].length, noChar: !/[\u{1F525}\u{1F4AA}\u{1F44F}\u{1F60D}]/u.test(r.textContent),
               labels: [...r.querySelectorAll('.cr-em[data-em]')].map(b => b.getAttribute('aria-label')).join('|'),
               iconPx: [...r.querySelectorAll('.cr-em i svg')].map(s => Math.round(s.getBoundingClientRect().width) + 'x' + Math.round(s.getBoundingClientRect().height)).join(','),
               like: r.querySelector('.cr-kd').textContent.trim(), wide: r.scrollWidth <= r.clientWidth + 1 };
    });
    C.check('the Like and the four reactions are all out, in order', row.chips === '🔥💪👏😍' && row.kinds[0] === 'cr-kd' && row.kinds.length === 5, JSON.stringify(row));
    // 79 A, Line Icons (round 7, 2026-10-25): the server still sends and stores the characters; the app DRAWS each as a line icon and SAYS it as a word
    C.check('…each is a line icon of about 20 px, and none of the phone\'s own emoji is on the row', row.icons === 4 && row.noChar && row.iconPx === '20x20,20x20,20x20,20x20', JSON.stringify([row.icons, row.noChar, row.iconPx]));
    C.check('…and every label says the WORD: Send Fire, Send Strong, Send Well done, Send Love it', row.labels === 'Send Fire|Send Strong|Send Well done|Send Love it', row.labels);
    C.check('…the 👏 is confetti, never the clapping hands the Cheer owns', await p.evaluate(() => {
      const clap = (document.createRange().createContextualFragment(CLAP_SVG).querySelector('path') || {}).getAttribute('d');
      const svgs = [...document.querySelectorAll('#crew-body .cr-post .cr-em[data-em] svg path')].map(x => x.getAttribute('d'));
      return svgs.length >= 4 && !svgs.includes(clap) && new Set(svgs).size >= 4;
    }));
    C.check('…and the row does not scroll sideways at 390 px', row.wide, JSON.stringify(row));
    await p.evaluate(() => [...[...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelectorAll('.cr-em')].find(b => b.dataset.em === '🔥').click());
    await p.waitForTimeout(400);
    // what is on the 6 am post's row, as the athlete sees it: the buttons in order ('like', each emoji, '+'), which are pressed, and the pressed one's count
    const rowOf = () => p.evaluate(() => {
      const r = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react');
      return { btns: [...r.querySelectorAll('button')].map(b => b.dataset.em || 'like').join(','), pressed: [...r.querySelectorAll('[aria-pressed="true"]')].map(b => b.dataset.em || 'like').join(','),
               n: ((r.querySelector('[aria-pressed="true"] b') || {}).textContent || '') };
    });
    const clickOn = em => p.evaluate(e => [...[...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelectorAll('.cr-react button')]
      .find(b => (b.dataset.em || 'like') === e).click(), em);
    const after = await rowOf();
    const sent = await calls(p, 'crew_kudos');
    C.check('tapping 🔥 sends it and marks it', after.pressed === '🔥' && after.n === '1' && sent.some(x => x.p_emoji === '🔥' && x.p_on === true), JSON.stringify([after, sent]));
    // Amir, 2026-10-20, on the live app: "if under another post i have chose to send a fire emote or like, why is all my other
    // emotes opened? just show the fire and a + so i can change".
    C.check('…and the others go: just the 🔥 and a ＋ to change it', after.btns === '🔥,+', JSON.stringify(after));
    C.check('…the chosen chip keeps its green ring and tint, its icon takes the green, and its label says "Fire sent. Tap to take it back"', await p.evaluate(() => {
      const r = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react');
      const pick = r.querySelector('.cr-em[aria-pressed="true"]'), plus = r.querySelector('.cr-plus');
      if (!pick || !plus) return false;
      const c = getComputedStyle(pick), g = getComputedStyle(plus).color;
      return c.borderTopWidth === '2px' && c.color === g && getComputedStyle(pick.querySelector('svg')).color === g && c.backgroundColor !== 'rgba(0, 0, 0, 0)'
        && pick.getAttribute('aria-label').indexOf('Fire sent. Tap to take it back') === 0;
    }));
    C.check('…not even the Like stays, though the post has Likes', await p.evaluate(() =>
      !([...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelector('.cr-react .cr-kd'))));
    // the ＋ opens the whole menu, his pick marked
    await clickOn('+'); await p.waitForTimeout(300);
    const menu = await rowOf();
    C.check('…the ＋ opens the whole menu with his 🔥 marked, and a ✕ at the end', menu.btns === 'like,🔥,💪,👏,😍,+' && menu.pressed === '🔥', JSON.stringify(menu));
    // the ✕ puts the menu away again and does not touch what he chose (no write to the server)
    const writesBefore = (await calls(p, 'crew_kudos')).length;
    await p.evaluate(() => [...[...document.querySelectorAll('#crew-body .cr-post')].find(x => /6 am session/.test(x.textContent)).querySelectorAll('.cr-react button')].find(b => b.classList.contains('cr-fold')).click());
    await p.waitForTimeout(300);
    const folded = await rowOf();
    C.check('…the ✕ closes it again: the 🔥 and the ＋, nothing written', folded.btns === '🔥,+' && folded.pressed === '🔥' && (await calls(p, 'crew_kudos')).length === writesBefore, JSON.stringify(folded));
    // a menu the ＋ opened lasts for this visit: leave Crew and come back and it is closed
    await clickOn('+'); await p.waitForTimeout(300);
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(300);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    C.check('…and leaving Crew closes it too', (await rowOf()).btns === '🔥,+', JSON.stringify(await rowOf()));
    await clickOn('+'); await p.waitForTimeout(300);
    // choosing another swaps it, and the row closes again on the new pick
    await clickOn('💪'); await p.waitForTimeout(500);
    const swapped = await rowOf();
    C.check('…choosing another swaps it and closes again: the 💪 and a ＋', swapped.btns === '💪,+' && swapped.pressed === '💪'
      && (await calls(p, 'crew_kudos')).some(x => x.p_emoji === '💪' && x.p_on === true), JSON.stringify(swapped));
    // the photo, opened: the chip he chose is the bright one on the dark ground, with its count readable, and the ＋ does not outshine it
    await p.evaluate(id => openCrewPhoto(id), PHOTO); await p.waitForTimeout(300);
    const viewer = await p.evaluate(() => {
      const v = document.getElementById('crew-viewer'), pick = v.querySelector('.cr-em[aria-pressed="true"]'), plus = v.querySelector('.cr-plus');
      if (!pick || !plus) return null;
      const cs = el => getComputedStyle(el);
      return { pickBg: cs(pick).backgroundColor, pickCount: cs(pick.querySelector('b')).color, plusBg: cs(plus).backgroundColor };
    });
    C.check('…and in the dark photo viewer his pick is the bright chip, its count readable, the ＋ quiet',
      viewer && viewer.pickBg === 'rgb(255, 255, 255)' && viewer.pickCount !== 'rgb(26, 26, 26)' && viewer.plusBg !== 'rgb(255, 255, 255)', JSON.stringify(viewer));
    await p.evaluate(() => closeCrewPhoto());
    // taking it back (open the ＋, tap the marked one) brings the menu back
    await clickOn('+'); await p.waitForTimeout(300);
    await clickOn('💪'); await p.waitForTimeout(500);
    const back = await rowOf();
    C.check('…taking it back brings the whole menu back', back.btns === 'like,🔥,💪,👏,😍' && back.pressed === '' && (await calls(p, 'crew_kudos')).some(x => x.p_on === false), JSON.stringify(back));
    // 79: in the dark photo viewer the icons are white, like the words beside them
    await p.evaluate(id => openCrewPhoto(id), PHOTO); await p.waitForTimeout(300);
    C.check('…and in the photo viewer the four icons are white like the text, on the dark ground', await p.evaluate(() => {
      const chips = [...document.querySelectorAll('#crew-viewer .cr-em[data-em]')];
      return chips.length === 4 && chips.every(b => { const s = b.querySelector('svg'); return !!s && getComputedStyle(s).color === 'rgb(255, 255, 255)' && getComputedStyle(b).color === 'rgb(255, 255, 255)'; });
    }));
    await p.evaluate(() => closeCrewPhoto());
    // a moment line keeps the Like ALONE, with the four behind a ＋ (2026-10-20): five chips under a one-line moment made the
    // row of buttons taller than the news. A post still carries all five out, Amir's pick of 2026-10-19.
    C.check('a moment line: the Like and a ＋, not five chips', await p.evaluate(() => {
      const r = document.querySelector('#crew-body .cr-line .cr-react');
      return !!r && r.querySelectorAll('.cr-em').length === 1 && !!r.querySelector('.cr-plus');
    }));
    // a post is NOT folded: Amir's pick of 2026-10-19 was all five out, and that stands where there is room
    C.check('…while a post still carries all five out', await p.evaluate(() =>
      document.querySelector('#crew-body .cr-post .cr-react').querySelectorAll('.cr-em').length === 4
      && !document.querySelector('#crew-body .cr-post .cr-plus')));
    await p.evaluate(() => document.querySelector('#crew-body .cr-line .cr-react .cr-plus').click());
    await p.waitForTimeout(300);
    C.check('…＋ unfolds the four in place', await p.evaluate(() => {
      const r = document.querySelector('#crew-body .cr-line .cr-react');
      return !!r && r.querySelectorAll('.cr-em').length === 4 && !r.querySelector('.cr-plus');
    }));
    await p.evaluate(() => document.querySelector('#crew-body .cr-line .cr-react .cr-em').click());
    await p.waitForTimeout(400);
    C.check('a Bell line takes one too, under its words', await p.evaluate(() => !!document.querySelector('#crew-body .cr-line .cr-react .cr-em[aria-pressed="true"]')));
    // Amir, 2026-10-20: "it should close after you choosed", then "just show the fire and a + so i can change".
    C.check('…and the picker CLOSES on the choice: his pick and a ＋ to change it', await p.evaluate(() => {
      const r = document.querySelector('#crew-body .cr-line .cr-react');
      const b = [...r.querySelectorAll('button')];
      return b.length === 2 && b[0].getAttribute('aria-pressed') === 'true' && b[1].classList.contains('cr-plus') && !r.querySelector('.cr-kd');
    }), await p.evaluate(() => document.querySelector('#crew-body .cr-line .cr-react').textContent.replace(/\s+/g, ' ')));
    await p.evaluate(() => document.querySelector('#crew-body .cr-line .cr-react .cr-em[aria-pressed="true"]').click());
    await p.waitForTimeout(400);
    C.check('…and taking it back leaves the Like and the ＋ again', await p.evaluate(() => {
      const r = document.querySelector('#crew-body .cr-line .cr-react');
      return r.querySelectorAll('.cr-em').length === 1 && !!r.querySelector('.cr-plus') && !!r.querySelector('.cr-kd');
    }), await p.evaluate(() => document.querySelector('#crew-body .cr-line .cr-react').textContent.replace(/\s+/g, ' ')));
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
      [...document.querySelectorAll('#crew-body .cr-post .cr-em')].every(b => !b.disabled && /crewLikeAsk/.test(b.getAttribute('onclick') || ''))));
    // a moment line's ＋ unfolds rather than asking: what it shows then is four chips that each offer to join
    C.check('…and a moment line\'s ＋ unfolds to four that offer to join', await p.evaluate(() => {
      const plus = document.querySelector('#crew-body .cr-line .cr-react .cr-plus');
      if (!plus) return false;
      plus.click();
      const r = document.querySelector('#crew-body .cr-line .cr-react');
      return [...r.querySelectorAll('.cr-em')].length === 4 && [...r.querySelectorAll('.cr-em')].every(b => /crewLikeAsk/.test(b.getAttribute('onclick') || ''));
    }));
    await p.evaluate(() => document.querySelector('#crew-body .cr-post .cr-em').click());
    await p.waitForTimeout(300);
    C.check('…tapping one says to join first', await p.evaluate(() => !document.getElementById('aaToast').hidden) && !(await calls(p, 'crew_kudos')).length);
    await ctx.close();
  }
  {
    const b13 = Object.assign(bell({ answer: 'yes', under13: true, can_post: false }), { emoji: ['🔥', '💪', '👏', '😍'] });
    b13.items[2].kudos = { n: 3, like: 1, mine: false, emoji: null, names: ['Mina S.', 'Sara T.'], by: { '🔥': 2 } };
    const { ctx, p } = await open(browser, { me: { answer: 'yes', under13: true, can_post: false }, bell: b13 });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    // A RECEIPT, never a dead button (2026-10-20): an account with reactions off sees what people gave and nothing to press.
    C.check('under 13: no buttons on the row at all, only what people gave', await p.evaluate(() =>
      !document.querySelector('#crew-body .cr-react button')
      && [...document.querySelectorAll('#crew-body .cr-react .is-tally')].length > 0));
    C.check('…and nothing on it is in the tab order or says "0 people"', await p.evaluate(() =>
      !document.querySelector('#crew-body .cr-react [disabled]')
      && !/0 people/.test(document.querySelector('#crew-body').innerHTML)));
    // the receipt's reactions are icons too, and say the word to a screen reader (round 7, 2026-10-25, "79 A")
    const rc = await p.evaluate(() => { const s = document.querySelector('#crew-body .cr-react .cr-em.is-tally'); return s ? { role: s.getAttribute('role'), label: s.getAttribute('aria-label'), svg: !!s.querySelector('svg'), noChar: !/[\u{1F525}\u{1F4AA}\u{1F44F}\u{1F60D}]/u.test(s.textContent), text: s.textContent.trim() } : null; });
    C.check('…and the receipt draws the 🔥 as its icon with the label "Fire, 2", no emoji character', !!rc && rc.role === 'img' && rc.label === 'Fire, 2' && rc.svg && rc.noChar && rc.text === '2', JSON.stringify(rc));
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
    C.check('…going back in within 20 seconds asks nothing again', (await calls(p, 'get_bell_if_new')).length === 1);
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
  {
    // Crew is LIVE while it is on the screen (Amir, 2026-10-20: "the crew doesnt update automatically, it needs to be closed from the
    // background and reopened"). A tick asks again, coming back from the background asks at once, a hidden app asks nothing, and only
    // a feed that really changed is redrawn.
    const b = Object.assign(bell({ answer: 'yes', can_post: true }), { emoji: ['🔥'] });
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700);
    const asked = async () => (await calls(p, 'get_bell_if_new')).length + (await calls(p, 'get_bell')).length;
    const n0 = await asked();
    await p.evaluate(() => { crewLive(); }); await p.waitForTimeout(300);
    C.check('live: asked a moment ago, so the tick asks nothing', (await asked()) === n0, String(n0));
    // 25 seconds later: an unchanged crew answers "same" and the screen is NOT rebuilt (a marker on the feed survives)
    await p.evaluate(() => { document.querySelector('#crew-body').setAttribute('data-mark', 'kept'); _bellAt = Date.now() - 25000; crewLive(); }); await p.waitForTimeout(500);
    C.check('live: 25 seconds on, the tick asks again', (await asked()) === n0 + 1, String(await asked()));
    C.check('…and a crew that did not change is not redrawn under a thumb', await p.evaluate(() => document.querySelector('#crew-body').getAttribute('data-mark') === 'kept' && !!document.querySelector('#crew-body .cr-post')));
    // someone posts: the next tick brings it to the screen with no tap
    await p.evaluate(() => {
      window.__STUB.bell.items.splice(1, 0, { t: 'post', id: '99999999-0000-4000-8000-000000000001', who: 'Mina S.', me: false, amir: false, kind: 'post', body: 'Fresh from the gym.', photo: false, at: new Date().toISOString(), pinned: false, left: 7, kudos: { n: 0, mine: false, names: [] } });
      _bellAt = Date.now() - 25000; crewLive();
    }); await p.waitForTimeout(700);
    C.check('live: a new post appears on the open screen, with no tap and no reopening', await p.evaluate(() => /Fresh from the gym/.test(document.querySelector('#crew-body').textContent)));
    // the app is in the background: nothing is asked; in front again: it asks at once
    const n1 = await asked();
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); _bellAt = Date.now() - 60000; crewLive(); }); await p.waitForTimeout(300);
    C.check('live: an app in the background asks nothing', (await asked()) === n1, String(await asked()));
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(500);
    C.check('live: coming back to the app asks at once', (await asked()) === n1 + 1, String(await asked()));
    // the board moves too, and only a changed board is redrawn
    const bd = await p.evaluate(() => { _boardAt = 0; return (CREW_BOARD || []).length; });
    await p.evaluate(() => { window.__STUB.crewBoard = [{ pos: 1, who: 'Mina S.', points: 900, level: 5, is_me: false }, { pos: 2, who: 'Alex R.', points: 400, level: 19, is_me: true }]; _boardAt = Date.now() - 60000; crewLive(); });
    await p.waitForTimeout(500);
    C.check('live: the board follows (it is asked every minute at most)', await p.evaluate(() => /900/.test(document.querySelector('#crew-board').textContent)), String(bd));
    C.check('…and the tick on the Crew screen of a hidden tab or another screen asks nothing', await p.evaluate(() => { goTo('home'); const n = (window.__STUB.params || []).length; _bellAt = 0; _boardAt = 0; crewLive(); return (window.__STUB.params || []).length === n; }));
    C.check('…no page errors', !p.errs.length, p.errs.join(' | '));
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

    // The FOURTH moment (round 7, 2026-10-25, Amir "82 good"): the line under Cheers this week on YOUR OWN page. It is a row, not an ask: it draws only while the phone can take
    // notifications and they are not on, on your own page only, and its tap is pushAsk('cheers') with its button. The phone's box opens inside that button's click and nowhere else.
    const row = (own) => p.evaluate(o => { const h = playerCheersHTML({ cheers: { recent: [] } }, o); return h; }, own);
    for (const s of ['on', 'blocked', 'needs-install', 'unsupported']) {
      await stub(s);
      C.check(`cheers line, push ${s}: nothing is drawn`, (await row(true)) === '');
    }
    await stub('off');
    const mine = await row(true), theirs = await row(false);
    C.check('cheers line, push off: one plain row on YOUR page, "Turn on notifications so the next cheer reaches you"', /Turn on notifications so the next cheer reaches you/.test(mine) && /playerCheersAsk\(\)/.test(mine) && /<h2 class="prog-sec">Cheers this week<\/h2>/.test(mine), mine.slice(0, 140));
    C.check('…and nothing on someone else\'s page', theirs === '');
    C.check('…drawing it asks nothing: no toast, the box shut', !(await toast()) && (await p.evaluate(() => window.__ASKS)).length === 0);
    await p.evaluate(() => playerCheersAsk());
    t = await toast();
    C.check('…its tap puts up the one line with a Turn them on button (reason "cheers"), and still nothing reaches the phone', !!t && t.action === 'Turn them on' && /next cheer reaches you/.test(t.text) && (await p.evaluate(() => window.__ASKS)).length === 0, JSON.stringify(t));
    C.check('…as often as they tap it (their own tap, like First Serve\'s step)', await p.evaluate(() => { document.getElementById('aaToast').hidden = true; playerCheersAsk(); return !document.getElementById('aaToast').hidden; }));
    await p.evaluate(() => document.querySelector('#aaToast .aa-toast-go').click());
    await p.waitForTimeout(300);
    C.check('…only the button\'s click calls enable(), once, so the box opens inside their own gesture', (await p.evaluate(() => window.__ASKS)).join() === 'enable');
    const srcP = require('fs').readFileSync(require('path').join(__dirname, '..', '..', 'program.html'), 'utf8');
    const cheersSrc = srcP.slice(srcP.indexOf('function playerCheersAskHTML'), srcP.indexOf('function openCheer'));
    C.check('…and the cheers line\'s code never opens the box itself: no requestPermission, no enable(), only pushAsk(\'cheers\')', !/requestPermission|AAPush\.enable|pushTurnOnHere\(/.test(cheersSrc) && /pushAsk\('cheers'/.test(cheersSrc));
    await stub('off');

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

  // ── 16. THE WEEK FIRST (stage91, 2026-10-20: the audit *The Empty Room*, direction B) ──────────────────────────────────
  // The band at the top, the day's attendance folded to one line, day headings down the feed, the board behind a door, and
  // the room itself on a page. The fixture is its own, so every check above stands on exactly the ground it did before.
  {
    const today = iso(now).slice(0, 10), yday = iso(now - 86400e3).slice(0, 10);
    const b = bell({ answer: 'yes', can_post: true });
    b.week = { members: 6, sessions: 14, held: 3 };
    b.crew = [{ who: 'Alex R.', me: true, since: '2026-10-19' }, { who: 'Mina S.', me: false, since: '2026-10-19' },
      { who: 'Reza K.', me: false, since: '2026-10-19' }];
    b.items = b.items.concat([
      { t: 'sess', key: 'sess:' + today, day: today, n: 3, me: true, names: ['Mina S.', 'Reza K.'] },
      { t: 'sess', key: 'sess:' + yday, day: yday, n: 1, me: false, names: ['Mina S.'] },
    ]);
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(600);
    const s = await p.evaluate(() => ({
      band: (document.querySelector('#crew-body .cr-week') || {}).textContent || '',
      faces: [...document.querySelectorAll('#crew-body .cr-faces .cr-face')].map(f => f.textContent).join('|'),
      days: [...document.querySelectorAll('#crew-body .cr-day')].map(d => d.textContent).join('|'),
      sess: [...document.querySelectorAll('#crew-body .cr-sess .cr-lw')].map(l => l.textContent.replace(/\s+/g, ' ').trim()),
      sessReact: !!document.querySelector('#crew-body .cr-sess .cr-react'),
      secs: [...document.querySelectorAll('#crew-body .prog-sec')].map(x => x.textContent),
      bandTop: (document.querySelector('#crew-body .cr-week') || {}).offsetTop,
      bellTop: (document.querySelector('#crew-body .cr-comp') || {}).offsetTop,
    }));
    C.check('the band: the week\'s sessions, the weeks held and how many are in the crew', /Last 7 days · 6 in the crew/.test(s.band) && /14 sessions/.test(s.band) && /3 weeks held/.test(s.band), s.band.replace(/\s+/g, ' '));
    C.check('…it is the FIRST thing on the screen, above the Bell', s.bandTop >= 0 && s.bandTop < s.bellTop, s.bandTop + ' < ' + s.bellTop);
    C.check('…with the crew\'s initials under it, the athlete\'s own marked', s.faces === 'AR|MS|RK' && await p.evaluate(() => !!document.querySelector('#crew-body .cr-faces .cr-face.me')), s.faces);
    C.check('the day\'s attendance: ONE line a day, the athlete first as You', s.sess[0] === 'You, Mina S. and Reza K. trained today3 sessions', JSON.stringify(s.sess));
    C.check('…yesterday\'s says yesterday, and names only those who trained', s.sess[1] === 'Mina S. trained yesterday1 session', JSON.stringify(s.sess));
    C.check('…and it carries no Like: there is nothing here anyone earned', !s.sessReact);
    C.check('the feed runs under day headings', /Today/.test(s.days) && /Yesterday/.test(s.days), s.days);
    C.check('the board is titled This season, not Season board', s.secs.join(' ').includes('This season') && !s.secs.join(' ').includes('Season board'), s.secs.join(' | '));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    // 320 px, where the band's numbers and the faces have the least room
    await p.setViewportSize({ width: 320, height: 720 }); await p.waitForTimeout(300);
    C.check('320 px: nothing on the band runs off the side', await p.evaluate(() => {
      const e = document.querySelector('#crew-body .cr-week');
      return !!e && e.getBoundingClientRect().right <= 320 && document.documentElement.scrollWidth <= 320;
    }));
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(200);
    // the room, on its own page
    await p.evaluate(() => document.querySelector('#crew-body .cr-faces').click());
    await p.waitForTimeout(400);
    const w = await p.evaluate(() => ({
      on: !!document.querySelector('#screen-crewwho.active'),
      title: (document.querySelector('#screen-crewwho .ceil-title') || {}).textContent,
      rows: [...document.querySelectorAll('#crewwho-body .cr-br')].map(r => r.textContent.replace(/\s+/g, ' ').trim()),
      back: !!document.querySelector('#screen-crewwho .nav-back'),
    }));
    C.check('the faces open In the crew: every member, the athlete as You', w.on && w.title === 'In the crew' && w.rows.length === 3 && /^ARYou/.test(w.rows[0]), JSON.stringify(w.rows));
    C.check('…with the level beside a name, from the board already on this phone', /LV 19/.test(w.rows.join(' ')), w.rows.join(' | '));
    C.check('…and a ← back to Crew', w.back && await p.evaluate(() => { document.querySelector('#screen-crewwho .nav-back').click(); return true; }));
    await p.waitForTimeout(300);
    C.check('…which lands back on Crew', await p.evaluate(() => !!document.querySelector('#screen-crew.active')));
    await ctx.close();
  }
  // the board behind a door, and the board kept on the phone so it works with no signal
  {
    const b = bell({ answer: 'yes', can_post: true });
    b.week = { members: 6, sessions: 14, held: 3 };
    const long = [];
    for (let i = 1; i <= 8; i++) long.push({ pos: i, who: 'Athlete ' + i, points: 900 - i * 10, level: 5, is_me: i === 7 });
    const { ctx, p } = await open(browser, { bell: b, stub: { crewBoard: long } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700);
    const s = await p.evaluate(ID => ({
      rows: [...document.querySelectorAll('#crew-body .cr-br')].length,
      me: !!document.querySelector('#crew-body .cr-br.me'),
      door: [...document.querySelectorAll('#crew-body .cr-me-row')].map(x => x.textContent.replace(/›/, '').trim()),
      asked: (window.__STUB.params || []).filter(x => x[0] === 'crew_board').length,
      kept: localStorage.getItem(ID + '_crewboard'),
    }), H.ID);
    C.check('the board on the tab: five rows, the athlete\'s own carried in beneath them', s.rows === 6 && s.me, s.rows + ' rows');
    C.check('…and the rest behind a door', s.door.includes('The whole board'), s.door.join(' | '));
    C.check('…it asks crew_board, the crew only, never leaderboard_top', s.asked === 1 && !(await calls(p, 'leaderboard_top')).length);
    C.check('…and keeps it on the phone, so the bottom of Crew needs no signal', !!s.kept && /Athlete 1/.test(s.kept));
    await p.evaluate(() => goTo('crewboard')); await p.waitForTimeout(400);
    const bd = await p.evaluate(() => ({
      title: (document.querySelector('#screen-crewboard .ceil-title') || {}).textContent,
      rows: [...document.querySelectorAll('#crewboard-body .cr-br')].length,
      lv: /LV/.test((document.getElementById('crewboard-body') || {}).textContent || ''),
    }));
    C.check('the whole board is a page titled This season, with every row and no LV chip', bd.title === 'This season' && bd.rows === 8 && !bd.lv, JSON.stringify(bd));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // a server without stage91: no band, no attendance, and the board falls back to leaderboard_top
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true }, stub: { noCrewBoard: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700);
    C.check('without stage91: no band and no attendance line, and the feed is as it was', await p.evaluate(() =>
      !document.querySelector('#crew-body .cr-week') && !document.querySelector('#crew-body .cr-sess') && !!document.querySelector('#crew-body .cr-post')));
    C.check('…and the board falls back to leaderboard_top', (await calls(p, 'leaderboard_top')).length === 1
      && await p.evaluate(() => !!document.querySelector('#crew-body .cr-br')));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // what was typed and not sent comes back (2026-10-20)
  {
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    await p.evaluate(() => openCrewPost()); await p.waitForTimeout(300);
    await p.evaluate(() => { const t = document.querySelector('#hist-overlay .cr-txt'); t.value = 'Legs are gone'; t.dispatchEvent(new Event('input')); });
    await p.waitForTimeout(200);
    await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(300);
    await p.evaluate(() => openCrewPost()); await p.waitForTimeout(300);
    C.check('the composer gives back what was typed and not sent', await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value === 'Legs are gone'));
    await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click());
    await p.waitForTimeout(600);
    await p.evaluate(() => openCrewPost()); await p.waitForTimeout(300);
    C.check('…and forgets it once it has gone to the crew', await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value === ''));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 17. REPLIES (stage92, 2026-10-20) ───────────────────────────────────────────────────────────────────────────────
  // Amir: "replies and likes like instagram", then "dont need the likes on replies". One level, text, 140 characters,
  // gone with the post at 7 days, your own taken back with two taps, and a non-member is offered the join instead.
  {
    const b = bell({ answer: 'yes', can_post: true });
    b.items[0].replies = [{ id: 'r1', who: 'Mina S.', me: false, amir: false, body: 'What does Kudos mean?', at: iso(now - 600e3) }];
    b.items[1] = b.items[1];   // the Bell line keeps no replies: a moment is not a post
    b.items[2].replies = [];
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    const s = await p.evaluate(() => ({
      shown: [...document.querySelectorAll('#crew-body .cr-post .cr-rep .cr-rb')].map(x => x.textContent.replace(/\s+/g, ' ').trim()),
      adds: [...document.querySelectorAll('#crew-body .cr-rep-add')].map(x => x.textContent),
      onLine: !!document.querySelector('#crew-body .cr-line .cr-rep-add'),
    }));
    C.check('a reply shows under its post, the name in front of it', s.shown[0] === 'Mina S. What does Kudos mean?', JSON.stringify(s.shown));
    C.check('…every post says the slim line Reply…, whether it has replies or none (Home Crowd step 4a)', s.adds.length >= 2 && s.adds.every(a => a === 'Reply…'), s.adds.join(' | '));
    C.check('…and a moment line has no Reply: a moment is not a post', !s.onLine);
    // writing one
    await p.evaluate(() => document.querySelector('#crew-body .cr-post .cr-rep-add').click());
    await p.waitForTimeout(300);
    C.check('the sheet quotes the post and counts to 140', await p.evaluate(() =>
      !!document.querySelector('#hist-overlay .cr-quote') && /\/ 140/.test(document.querySelector('#hist-overlay .cr-cnt').textContent)));
    C.check('…and Reply is dead until something is typed', await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').disabled));
    await p.evaluate(() => { const t = document.querySelector('#hist-overlay .cr-rtxt'); t.value = 'It means well done'; t.dispatchEvent(new Event('input')); });
    await p.waitForTimeout(150);
    await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click());
    await p.waitForTimeout(500);
    C.check('…it posts, the sheet closes and the reply is on the card', await p.evaluate(() =>
      !document.getElementById('hist-overlay').classList.contains('visible')
      && /It means well done/.test(document.querySelector('#crew-body .cr-reps').textContent)));
    C.check('…and it was sent as crew_reply with the post and the words', (await calls(p, 'crew_reply')).some(x => x.p_body === 'It means well done' && !!x.p_post));
    // taking your own back: two taps
    const del = await p.evaluate(() => {
      const b2 = [...document.querySelectorAll('#crew-body .cr-reps .cr-del')];
      return b2.length;
    });
    C.check('…your own reply has a Delete, and only your own', del === 1, String(del));
    await p.evaluate(() => document.querySelector('#crew-body .cr-reps .cr-del').click());
    await p.waitForTimeout(150);
    C.check('…which arms first and acts on the second tap', await p.evaluate(() => /again/i.test(document.querySelector('#crew-body .cr-reps .cr-del').textContent)));
    await p.evaluate(() => document.querySelector('#crew-body .cr-reps .cr-del').click());
    await p.waitForTimeout(500);
    C.check('…and then it is gone', await p.evaluate(() => !/It means well done/.test(document.querySelector('#crew-body .cr-reps').textContent))
      && (await calls(p, 'crew_reply_delete')).length === 1);
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // not in the crew: the Reply offers to join, exactly as the Like does
    const b = bell({ answer: null, can_post: false });
    b.items[0].replies = [{ id: 'r1', who: 'Mina S.', me: false, amir: false, body: 'What does Kudos mean?', at: iso(now - 600e3) }];
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    C.check('not joined: the replies are readable and Reply offers to join', await p.evaluate(() =>
      /What does Kudos mean/.test(document.querySelector('#crew-body .cr-reps').textContent)
      && /Join the crew to reply/.test(document.querySelector('#crew-body .cr-rep-add').textContent)));
    await ctx.close();
  }
  {
    // under 13 reads them and is offered nothing
    const b = bell({ answer: 'yes', under13: true, can_post: false });
    b.items[0].replies = [{ id: 'r1', who: 'Mina S.', me: false, amir: false, body: 'What does Kudos mean?', at: iso(now - 600e3) }];
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    C.check('under 13: the replies are readable and there is no Reply at all', await p.evaluate(() =>
      /What does Kudos mean/.test(document.querySelector('#crew-body .cr-reps').textContent)
      && !document.querySelector('#crew-body .cr-rep-add')));
    await ctx.close();
  }
  {
    // a server without stage92: no replies anywhere, and the rest of the card is as it was
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true }, stub: { noReplies: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    C.check('without stage92: no Reply door and no replies block, and the post is otherwise whole', await p.evaluate(() =>
      !document.querySelector('#crew-body .cr-rep-add') && !!document.querySelector('#crew-body .cr-post .cr-kd')));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // the post is written once, however slow the line: the same key on every attempt
    const { ctx, p } = await open(browser, { me: { answer: 'yes', can_post: true } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    await p.evaluate(() => openCrewPost()); await p.waitForTimeout(300);
    await p.evaluate(() => { const t = document.querySelector('#hist-overlay .cr-txt'); t.value = 'Legs are gone'; t.dispatchEvent(new Event('input')); });
    await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click());
    await p.waitForTimeout(600);
    const keys = (await calls(p, 'crew_post')).map(x => x.p_key);
    C.check('a post carries a key made on the phone', keys.length === 1 && /^[0-9a-f-]{36}$/.test(String(keys[0])), JSON.stringify(keys));
    await ctx.close();
  }
  // ── 18. The crew's one invitation on Home (2026-10-20) ──────────────────────────────────────────────────────────────
  {
    const b = bell({ answer: null, can_post: false });
    b.week = { members: 6, sessions: 14, held: 3 };
    b.crew = [{ who: 'Mina S.', me: false, since: '2026-10-19' }, { who: 'Reza K.', me: false, since: '2026-10-19' }];
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.waitForTimeout(600);
    C.check('Home offers the crew once, as a picked line and not a door row', await p.evaluate(() => {
      const e = document.querySelector('#home-sugg-wrap .lib-sugg[data-sugg="crew"]');
      return !!e && /The crew is open/.test(e.textContent) && /2 are in/.test(e.textContent);
    }), await p.evaluate(() => (document.getElementById('home-sugg-wrap') || {}).textContent || ''));
    await p.evaluate(() => document.querySelector('#home-sugg-wrap .lib-sugg').click());
    await p.waitForTimeout(500);
    C.check('…it opens Crew', await p.evaluate(() => !!document.querySelector('#screen-crew.active')));
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(400);
    C.check('…and never comes back on this phone', await p.evaluate(() => !document.querySelector('#home-sugg-wrap .lib-sugg[data-sugg="crew"]'))
      && await p.evaluate(id => localStorage.getItem(id + '_crewinv') === '1', H.ID));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // no crew at all (a server without stage91): no invitation
    const { ctx, p } = await open(browser, { me: { answer: null, can_post: false } });
    await waitTab(p);
    await p.waitForTimeout(500);
    C.check('without the crew list, Home offers nothing', await p.evaluate(() => !document.querySelector('#home-sugg-wrap .lib-sugg[data-sugg="crew"]')));
    await ctx.close();
  }

  // ── 19. A ROW YOU CAN USE, OR NO ROW (2026-10-20) ──────────────────────────────────────────────────
  // Amir, from his live phone: "First i cant like my photos, which is ok, why do i have those under my posts then?",
  // "If i chose like under a post, why are there more emotes to choose?", "When i choose emote, why others are still
  // there?". The fold had been wired to the item TYPE (moment lines only) when it belongs to the viewer's STATE. Then, on the
  // live app, once more: "it still shows reactions to my own post which i cant choose. then remove the reactions under your own
  // post" and "if under another post i have chose to send a fire emote or like, why is all my other emotes opened? just show
  // the fire and a + so i can change". (That second round was also a regression: a later commit had written program.html over
  // the first fix from an older copy, so the live app was still showing the old row.)
  {
    const EM = ['🔥', '💪', '👏', '😍'];
    const b = bell({ answer: 'yes', can_post: true });
    b.emoji = EM;
    // [0] Amir's pinned post, nobody has reacted; [1] a moment line; [2] a post with one 🔥 from somebody else
    b.items[0].kudos = { n: 0, like: 0, mine: false, emoji: null, names: [], by: {} };
    b.items[2].kudos = { n: 1, like: 0, mine: false, emoji: null, names: ['Mina S.'], by: { '🔥': 1 } };
    // [3] the viewer's OWN post, with two reactions on it
    b.items.push({ t: 'post', id: 'own-1', who: 'You', me: true, amir: false, kind: 'post', body: 'Day 2 done.',
      photo: false, at: iso(now - 5000e3), pinned: false, left: 7,
      kudos: { n: 3, like: 2, mine: false, emoji: null, names: ['Mina S.', 'Sara T.'], by: { '🔥': 1 } } });
    // [5] the viewer's OWN moment line, with two Likes on it
    b.items.push({ t: 'line', key: 'own-line-key', who: 'You', me: true, at: iso(now - 6500e3),
      kudos: { n: 2, like: 2, mine: false, emoji: null, names: ['Mina S.', 'Sara T.'], by: {} }, parts: [{ k: 'level', n: 15 }] });
    // [4] the viewer's own post with nothing on it at all
    b.items.push({ t: 'post', id: 'own-2', who: 'You', me: true, amir: false, kind: 'post', body: 'Quiet one.',
      photo: false, at: iso(now - 6000e3), pinned: false, left: 7,
      kudos: { n: 0, like: 0, mine: false, emoji: null, names: [], by: {} } });
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(600);
    const row = sel => p.evaluate(s => {
      const r = document.querySelector(s);
      if (!r) return null;
      return { btns: [...r.querySelectorAll('button')].map(x => (x.dataset.em || 'like')),
               tally: [...r.querySelectorAll('.is-tally')].map(x => x.textContent.replace(/\s+/g, '')),
               text: r.textContent.trim(), shown: getComputedStyle(r).display !== 'none',
               pressed: [...r.querySelectorAll('[aria-pressed="true"]')].map(x => x.dataset.em || 'like') };
    }, sel);
    // HIS COMPLAINT A: his own post
    const own1 = await row('[data-id="own-1"] .cr-react');
    C.check('your own post: no reactions under it at all, not even a tally', own1 && own1.btns.length === 0 && own1.tally.length === 0 && !own1.text && !own1.shown, JSON.stringify(own1));
    C.check('…the names line under it still says who reacted', await p.evaluate(() => /Mina S\./.test(document.querySelector('[data-id="own-1"] .cr-names').textContent)));
    const ownLine = await row('.cr-line[data-key="own-line-key"] .cr-react');
    C.check('…and the same under your own moment line', ownLine && ownLine.btns.length === 0 && !ownLine.text && !ownLine.shown, JSON.stringify(ownLine));
    const own2 = await row('[data-id="own-2"] .cr-react');
    C.check('…and the same when nobody has reacted', own2 && own2.btns.length === 0 && own2.tally.length === 0 && !own2.text, JSON.stringify(own2));
    C.check('…so no dead button is left anywhere on the feed', await p.evaluate(() => !document.querySelector('#crew-body .cr-react [disabled]')));
    // the post's Delete is out of the reply thread's path
    C.check('…and its Delete sits with the reactions, not above the replies', await p.evaluate(() => {
      const art = document.querySelector('[data-id="own-1"]');
      const foots = [...art.querySelectorAll('.cr-foot')];
      return !!foots[0].querySelector('.cr-del') && !foots[1].querySelector('.cr-del');
    }));
    // BEFORE a choice, a post still carries all five out (his pick of 2026-10-19)
    const fresh = await row('[data-id="' + AMIR + '"] .cr-react');
    C.check('a post nobody has reacted to: all five out, as he picked', fresh && fresh.btns.join('') === 'like🔥💪👏😍', JSON.stringify(fresh));
    // HIS COMPLAINT C: he taps Like, and the four must go
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react .cr-kd').click(), AMIR);
    await p.waitForTimeout(500);
    const afterLike = await row('[data-id="' + AMIR + '"] .cr-react');
    C.check('he taps Like: the Like, pressed, and a ＋ to change it; nothing else is offered',
      afterLike && afterLike.btns.join(',') === 'like,+' && afterLike.pressed.join('') === 'like', JSON.stringify(afterLike));
    // the ＋ opens the whole menu, the Like marked; an emoji swaps to it and the row closes on the new pick
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react .cr-plus').click(), AMIR);
    await p.waitForTimeout(300);
    const opened = await row('[data-id="' + AMIR + '"] .cr-react');
    C.check('…the ＋ opens all five with the Like marked, and a ✕ to put it away again', opened && opened.btns.join('') === 'like🔥💪👏😍+' && opened.pressed.join('') === 'like', JSON.stringify(opened));
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react [data-em="😍"]').click(), AMIR);
    await p.waitForTimeout(500);
    const swappedTo = await row('[data-id="' + AMIR + '"] .cr-react');
    C.check('…choosing the 😍 swaps the Like for it, and the row closes on the 😍 and a ＋',
      swappedTo && swappedTo.btns.join(',') === '😍,+' && swappedTo.pressed.join('') === '😍', JSON.stringify(swappedTo));
    // take the 😍 back (open the ＋, tap it), then put the Like on again so the take-back step below has something to take back
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react .cr-plus').click(), AMIR);
    await p.waitForTimeout(300);
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react [data-em="😍"]').click(), AMIR);
    await p.waitForTimeout(500);
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react .cr-kd').click(), AMIR);
    await p.waitForTimeout(500);
    // taking it back brings the menu straight back
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-react .cr-kd').click(), AMIR);
    await p.waitForTimeout(500);
    C.check('…and taking it back brings the menu back', (await row('[data-id="' + AMIR + '"] .cr-react')).btns.join('') === 'like🔥💪👏😍');
    // HIS COMPLAINT B: he taps an emoji on a post that already has one
    await p.evaluate(() => document.querySelector('[data-id="66666666-7777-8888-9999-000000000000"] .cr-react [data-em="💪"]').click());
    await p.waitForTimeout(500);
    const afterEm = await row('[data-id="66666666-7777-8888-9999-000000000000"] .cr-react');
    C.check('he taps an emoji: just his 💪 and a ＋, though somebody else sent a 🔥',
      afterEm && afterEm.btns.join(',') === '💪,+' && afterEm.pressed.join('') === '💪', JSON.stringify(afterEm));
    C.check('…and no Like beside it', await p.evaluate(() =>
      !document.querySelector('[data-id="66666666-7777-8888-9999-000000000000"] .cr-react .cr-kd')));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // the keyboard stays on the chip it pressed
    const b = bell({ answer: 'yes', can_post: true });
    b.emoji = ['🔥', '💪', '👏', '😍'];
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    await p.evaluate(id => { const x = document.querySelector('[data-id="' + id + '"] .cr-react .cr-kd'); x.focus(); x.click(); }, AMIR);
    await p.waitForTimeout(600);
    C.check('a tap leaves the keyboard on the chip it pressed, not at the top of the page', await p.evaluate(() => {
      const a = document.activeElement;
      return !!a && a.classList.contains('cr-kd') && (a.dataset.em || '') === '';
    }), await p.evaluate(() => (document.activeElement || {}).className || 'none'));
    await ctx.close();
  }
  {
    // a former athlete: the server would refuse, so the app must not offer
    const b = bell({ answer: 'yes', can_post: false });
    b.emoji = ['🔥', '💪', '👏', '😍'];
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    C.check('a yes the server will not accept (a former athlete): the row offers to join, never a tap that fails', await p.evaluate(() =>
      [...document.querySelectorAll('#crew-body .cr-post .cr-react button')].every(x => /crewLikeAsk/.test(x.getAttribute('onclick') || ''))));
    await ctx.close();
  }

  // ── round 7 · P1 (2026-10-25): 78 One door, one name · 82 (a) Tell the crew for someone who has not answered · the hit areas ───────────────────────────────
  {
    // a member: the tab's foot row "What the crew sees of you ›" is gone, the composer says Crew / Share with the crew, the session mode is as it was
    const b = bell({ answer: 'yes', can_post: true });
    b.items[2].replies = [];
    b.items.push({ t: 'post', id: 'own-9', who: 'You', me: true, amir: false, kind: 'post', body: 'Day 3 done.', photo: false, at: iso(now - 5000e3), pinned: false, left: 7, kudos: { n: 0, mine: false, names: [] }, replies: [] });
    const { ctx, p } = await open(browser, { bell: b });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    C.check('a member: the tab has no foot row to What the crew sees (the one door is in the initials)', await p.evaluate(() => ![...document.querySelectorAll('#crew-body button')].some(x => /crew sees/i.test(x.textContent))));
    C.check('…and no word of "just below" or of Crew and the Bell anywhere on the tab', await p.evaluate(() => !/just below|Crew and the Bell|sees of you/.test(document.getElementById('crew-body').innerText)));
    await p.evaluate(() => openCrewPost()); await p.waitForTimeout(250);
    C.check('the composer: eyebrow "Crew", title "Share with the crew"', await p.evaluate(() => document.querySelector('#hist-overlay .readiness-eyebrow').textContent === 'Crew' && document.querySelector('#hist-overlay .readiness-title').textContent === 'Share with the crew'));
    await p.evaluate(() => { closeHistorySheet(); openCrewPost('session', '2'); }); await p.waitForTimeout(250);
    C.check('…and the session mode is unchanged: "Tell the crew" / "Day 2 done"', await p.evaluate(() => document.querySelector('#hist-overlay .readiness-eyebrow').textContent === 'Tell the crew' && document.querySelector('#hist-overlay .readiness-title').textContent === 'Day 2 done'));
    await p.evaluate(() => closeHistorySheet());
    // the hit areas: "Reply" and "Delete" on your own post are at least 44 x 44 by padding (the font is the same)
    const hit = await p.evaluate(() => {
      const r = n => { const e = document.querySelector(n); if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height), fs: getComputedStyle(e).fontSize }; };
      return { reply: r('#crew-body .cr-rep-add'), del: r('#crew-body .cr-post .cr-foot .cr-del') };
    });
    // (Home Crowd step 4a: Reply is the slim input-look line now, set in the body size on purpose; Delete is still padding on a small word)
    C.check('"Reply…" is at least 44 x 44 and "Delete" on your own post is at least 44 x 44 (padding, not a bigger font)', !!hit.reply && !!hit.del && hit.reply.w >= 44 && hit.reply.h >= 44 && hit.del.w >= 44 && hit.del.h >= 44, JSON.stringify(hit));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // someone who said no: the line, and the join card's button right there (it calls the same crewAnswer('yes'))
    const { ctx, p } = await open(browser, { me: { answer: 'no', can_post: false } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    const no = await p.evaluate(() => { const q = [...document.querySelectorAll('#crew-body .cr-quiet')].find(x => /You keep your moments/.test(x.textContent)), btn = q && q.nextElementSibling; return { q: q ? q.textContent : null, btn: btn ? btn.textContent : null, cls: btn ? btn.className : '', h: btn ? Math.round(btn.getBoundingClientRect().height) : 0, bg: btn ? getComputedStyle(btn).backgroundColor : '' }; });
    C.check('said no: "You keep your moments to yourself, so the crew does not see you here." and a "Join the crew" button right after it, no "just below"', no.q === 'You keep your moments to yourself, so the crew does not see you here.' && no.btn === 'Join the crew' && /cr-go/.test(no.cls) && no.h >= 44, JSON.stringify(no));
    await p.evaluate(() => document.querySelector('#crew-body .cr-join').click()); await p.waitForTimeout(500);
    C.check('…and its tap is crewAnswer("yes"): crew_answer("yes") and the composer comes', (await calls(p, 'crew_answer')).some(x => x.p_answer === 'yes') && await p.evaluate(() => !!document.querySelector('.cr-comp')));
    await ctx.close();
  }
  {
    // not answered yet: the join card's small print, and the finished card's Tell the crew row that goes to Crew (never a one-tap join)
    const { ctx, p } = await open(browser, { me: { answer: null, can_post: false } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(500);
    C.check('the join card\'s small print: "You can leave any time from your initials, under What the crew sees."', await p.evaluate(() => [...document.querySelectorAll('#crew-ask .sm')].some(x => x.textContent === 'You can leave any time from your initials, under What the crew sees.')));
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(300);
    const rows = await p.evaluate(() => [...document.querySelectorAll('.complete-crew[data-day]')].map(e => ({ hidden: e.hidden, l: (e.querySelector('.hrow-l') || {}).textContent, q: (e.querySelector('.hrow-q') || {}).textContent })));
    C.check('not answered: every finished card shows "Tell the crew" with "Join the crew first. You see what they would see."', rows.length > 0 && rows.every(r => !r.hidden && r.l === 'Tell the crew' && r.q === 'Join the crew first. You see what they would see.'), JSON.stringify(rows));
    await p.evaluate(() => { window.scrollTo(0, 400); document.querySelector('.complete-crew[data-day] button').click(); }); await p.waitForTimeout(600);
    C.check('…its tap goes to the Crew tab at the top, where the join card is, and joins nobody', await p.evaluate(() => !!document.querySelector('#screen-crew.active') && !!document.querySelector('#crew-ask') && window.scrollY < 40) && !(await calls(p, 'crew_answer')).length);
    C.check('…and never opens the composer', await p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
    await ctx.close();
    for (const [who, me, want] of [['said no', { answer: 'no', can_post: false }, 'hidden'], ['a member', { answer: 'yes', can_post: true }, 'today']]) {
      const o = await open(browser, { me });
      await waitTab(o.p);
      await o.p.evaluate(() => goTo('crew')); await o.p.waitForTimeout(400);
      const r = await o.p.evaluate(() => [...document.querySelectorAll('.complete-crew[data-day]')].map(e => ({ hidden: e.hidden, q: (e.querySelector('.hrow-q') || {}).textContent || '' })));
      C.check(`${who}: the finished card's Tell the crew row is ${want === 'hidden' ? 'not shown' : 'today\'s: "A photo from today, on the Bell for 7 days."'}`, r.length > 0 && r.every(x => want === 'hidden' ? x.hidden : (!x.hidden && x.q === 'A photo from today, on the Bell for 7 days.')), JSON.stringify(r));
      await o.ctx.close();
    }
  }

  // ── round 7 · P3a (2026-10-25): idea 92 the Pick card (stage100's `pick`) and idea 77 Land on It ───────────────────────────────────────────────────
  {
    const CKM = 'aaaaaaaa-0000-4000-8000-0000000000aa', CKP = 'cccccccc-0000-4000-8000-000000000001', CKR = 'dddddddd-0000-4000-8000-000000000002';
    const WHY = '38 sessions in 11 weeks, every day of her plan in order. That is what I want.';   // two lines at 390 px
    const pickOf = o => Object.assign({ month: '2026-10-01', who: 'Mina S.', ck: CKP, fv: null, me: false, why: WHY, at: iso(now - 3600e3), until: iso(now + 6 * 86400e3) }, o || {});
    const bellP = (meO, pk, o) => {
      const b = bell(Object.assign({ answer: 'yes', can_post: true, ck: CKM, fv: null }, meO || {}));
      b.lounge = 1; b.week = { sessions: 17, held: 4, members: 9 };
      b.crew = [{ ck: CKP, who: 'Mina S.', fv: null, held: true }, { ck: CKR, who: 'Reza K.', fv: null }];
      b.pick = pk === undefined ? pickOf() : pk;
      return Object.assign(b, o || {});
    };
    const openCrewTab = async (b, extra) => {
      const o = await open(browser, Object.assign({ bell: b }, extra || {}));
      await waitTab(o.p);
      await o.p.evaluate(() => goTo('crew')); await o.p.waitForTimeout(700);
      return o;
    };
    const filler = n => Array.from({ length: n }, (_, i) => ({ t: 'post', id: 'fill-' + i, who: 'Ali B.', me: false, amir: false, kind: 'post', body: 'Filler post ' + i + '. ' + 'Long words to take some room. '.repeat(4),
      photo: false, at: iso(now - (4 + i) * 3600e3), pinned: false, left: 7, kudos: { n: 0, mine: false, names: [] }, replies: [] }));
    const view = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, y: Math.round(scrollY), lit: e.classList.contains('cr-lit'), anim: getComputedStyle(e).animationName }; }, sel);
    const inView = v => !!v && v.top >= 0 && v.bottom <= v.vh;

    // 92 · a member sees the card: after the band, before the honours and the Bell, with the reason, the Cheer and the page link
    {
      const { ctx, p } = await openCrewTab(bellP());
      const d = await p.evaluate(() => {
        const q = s => document.querySelector('#crew-body ' + s), after = (x, y) => !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
        const pk = q('.cr-pick'), bellH = [...document.querySelectorAll('#crew-body .prog-sec')].find(h => /^The Bell/.test(h.textContent)), ch = q('.cr-pick .pl-cheer'), lk = q('.cr-pick .cr-pk-pg');
        const rc = e => { const r = e.getBoundingClientRect(); return { cy: r.top + r.height / 2, h: r.height, w: r.width }; };
        return pk && {
          order: after(q('.cr-week'), pk) && after(pk, q('.cr-hon')) && after(pk, bellH), count: document.querySelectorAll('#crew-body .cr-pick').length,
          h: Math.round(pk.getBoundingClientRect().height), topH: Math.round(q('.cr-pk-top').getBoundingClientRect().height), label: pk.getAttribute('aria-label'),
          eyebrow: q('.cr-pk-id .e').innerText, name: q('.cr-pk-id b').innerText, nameFs: getComputedStyle(q('.cr-pk-id b')).fontSize,
          why: q('.cr-pk-why').textContent, whyFs: getComputedStyle(q('.cr-pk-why')).fontSize, qm: getComputedStyle(q('.cr-pk-why .qm')).color,
          face: (() => { const f = q('.cr-fk'), r = f.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), ring: getComputedStyle(f).boxShadow }; })(),
          by: q('.cr-pk-by').innerText.replace(/\s+/g, ' ').trim(),
          ch: ch && { t: ch.textContent.trim(), bg: getComputedStyle(ch).backgroundColor, on: ch.getAttribute('onclick'), svg: !!ch.querySelector('svg'), cy: rc(ch).cy },
          lk: lk && { t: lk.textContent.replace(/\s+/g, ' ').trim(), on: lk.getAttribute('onclick'), cy: rc(lk).cy, h: rc(lk).h },
        };
      });
      C.check('the Pick card: ONE card, under the band, above the honours and the Bell heading', !!d && d.order && d.count === 1, JSON.stringify(d && [d.order, d.count]));
      C.check('…about 170 to 200 px tall at 390 px with a two-line reason, its green top about 64 px', !!d && d.h >= 170 && d.h <= 200 && d.topH >= 60 && d.topH <= 68, JSON.stringify(d && [d.h, d.topH]));
      C.check('…the section says "Amir\'s Pick for October: Mina S."', !!d && d.label === 'Amir\'s Pick for October: Mina S.', d && d.label);
      C.check('…the mint eyebrow AMIR\'S PICK · OCTOBER and the name in white display type (22 px, uppercase)', !!d && d.eyebrow === 'AMIR\'S PICK · OCTOBER' && d.name === 'MINA S.' && d.nameFs === '22px', JSON.stringify(d && [d.eyebrow, d.name, d.nameFs]));
      C.check('…her face is 44 px with a mint ring', !!d && d.face.w === 44 && d.face.h === 44 && /109, 190, 149/.test(d.face.ring), JSON.stringify(d && d.face));
      C.check('…the reason in ink at 15 px between green quote marks, signed Amir', !!d && d.why === '“' + WHY + '”' && d.whyFs === '15px' && d.qm === 'rgb(14, 74, 54)' && d.by === 'AA Amir', JSON.stringify(d && [d.why, d.whyFs, d.qm, d.by]));
      C.check('…ONE row: a clay [clap] Cheer Mina (openCheer) and a green "Mina\'s page ›" (openPlayer), 44 px tall',
        !!d && !!d.ch && !!d.lk && d.ch.t === 'Cheer Mina' && d.ch.svg && d.ch.bg === 'rgb(194, 81, 44)' && d.ch.on === `openCheer('${CKP}')` && /^Mina's page ›$/.test(d.lk.t) && d.lk.on === `openPlayer('${CKP}')`
        && Math.abs(d.ch.cy - d.lk.cy) < 6 && d.lk.h >= 44, JSON.stringify(d && [d.ch, d.lk]));
      // the Cheer opens the Player Page's own sheet with no copy of her page on this phone, sends crew_cheer, and the card says it is done
      const had = await p.evaluate(ck => !!crewPageGet(ck), CKP);
      await p.evaluate(() => document.querySelector('#crew-body .cr-pick .pl-cheer').click()); await p.waitForTimeout(350);
      const sh = await p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent }));
      C.check('Cheer on the card opens "Cheer Mina" (the sheet the page\'s button opens), with no page of hers fetched first', !had && sh.on && sh.title === 'Cheer Mina', JSON.stringify([had, sh]));
      await p.evaluate(() => document.querySelector('#hist-overlay .ch-go').click()); await p.waitForTimeout(600);
      const af = await p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), btn: !!document.querySelector('#crew-body .cr-pick .pl-cheer'), done: (document.querySelector('#crew-body .cr-pick .pl-cheered') || {}).textContent, n: document.querySelectorAll('#crew-body .cr-pick').length }));
      C.check('…Send calls crew_cheer for her, the sheet closes and the card\'s button turns to "Cheered today"', (await calls(p, 'crew_cheer')).length === 1 && (await calls(p, 'crew_cheer'))[0].p_subject === CKP && !af.on && !af.btn && af.done === 'Cheered today' && af.n === 1, JSON.stringify(af));
      await p.evaluate(() => document.querySelector('#crew-body .cr-pick .cr-pk-pg').click()); await p.waitForTimeout(500);
      C.check('"Mina\'s page ›" opens her page', await p.evaluate(ck => !!document.querySelector('#screen-crewplayer.active') && _playerCk === ck, CKP));
      C.check('no page errors', !p.errs.length, p.errs.join(' | '));
      await ctx.close();
    }
    // 92 · the card as the pick sees it: no Cheer, "Your page ›", the eyebrow still says AMIR'S PICK
    {
      const { ctx, p } = await openCrewTab(bellP({ name: 'Alex R.' }, pickOf({ who: 'Alex R.', ck: CKM, me: true })));
      const d = await p.evaluate(() => { const pk = document.querySelector('#crew-body .cr-pick'); return pk && { ch: !!pk.querySelector('.pl-cheer, .pl-cheered'), lk: (pk.querySelector('.cr-pk-pg') || {}).textContent, on: (pk.querySelector('.cr-pk-pg') || {}).getAttribute('onclick'), eb: pk.querySelector('.cr-pk-id .e').innerText, nm: pk.querySelector('.cr-pk-id b').innerText, why: !!pk.querySelector('.cr-pk-why .qm') }; });
      C.check('you are the pick: no Cheer, the link reads "Your page ›", the eyebrow still says AMIR\'S PICK · OCTOBER', !!d && !d.ch && /^Your page\s*›$/.test(d.lk.trim()) && d.on === "openPlayer('me')" && d.eb === 'AMIR\'S PICK · OCTOBER' && d.nm === 'ALEX R.' && d.why, JSON.stringify(d));
      await p.evaluate(() => document.querySelector('#crew-body .cr-pick .cr-pk-pg').click()); await p.waitForTimeout(400);
      C.check('…and "Your page ›" opens your own page', await p.evaluate(() => !!document.querySelector('#screen-crewplayer.active') && _playerCk === 'me'));
      await ctx.close();
    }
    // 92 · the guide says it once, in Amir's voice, and only while the app has the Crew tab
    {
      const { ctx, p } = await openCrewTab(bellP());
      const g = await p.evaluate(() => buildAppGuideCards().replace(/<[^>]+>/g, ''));
      C.check('the guide says it: "When I pick someone for the month, a card at the top of Crew shows who and why, for a week. Tap Cheer to tell them well done."',
        g.split('When I pick someone for the month, a card at the top of Crew shows who and why, for a week. Tap Cheer to tell them well done.').length === 2);
      await ctx.close();
    }
    // 92 · nothing to draw: a pick past its `until`, `pick: null`, and a server with no `pick` key at all
    {
      const noKey = bellP({}, null); delete noKey.pick;
      for (const [what, b] of [['past its until (the phone\'s copy is old)', bellP({}, pickOf({ until: iso(now - 1000) }))], ['pick: null', bellP({}, null)], ['no pick key (a server without stage100)', noKey]]) {
        const { ctx, p } = await openCrewTab(b);
        C.check('the Pick card is not drawn: ' + what, await p.evaluate(() => !document.querySelector('#crew-body .cr-pick') && !!document.querySelector('#crew-body .cr-week')));
        await ctx.close();
      }
    }
    // 92 · no reason: the line says it, no quote marks, nothing else changes
    {
      for (const why of [null, '   ']) {
        const { ctx, p } = await openCrewTab(bellP({}, pickOf({ why })));
        const d = await p.evaluate(() => { const pk = document.querySelector('#crew-body .cr-pick'); return pk && { w: (pk.querySelector('.cr-pk-why') || {}).textContent, qm: pk.querySelectorAll('.qm').length, ch: !!pk.querySelector('.pl-cheer'), lk: !!pk.querySelector('.cr-pk-pg'), by: !!pk.querySelector('.cr-pk-by') }; });
        C.check(`no reason (${JSON.stringify(why)}): "Amir's pick for October", no quote marks, the Cheer and the link and the signature stay`, !!d && d.w === 'Amir\'s pick for October' && d.qm === 0 && d.ch && d.lk && d.by, JSON.stringify(d));
        await ctx.close();
      }
    }
    // 92 · a viewer who cannot cheer: a non-member is offered the join (as a Like does), under 13 has no Cheer and no link
    {
      const { ctx, p } = await openCrewTab(bellP({ answer: null, can_post: false }));
      C.check('not in the crew: the Cheer is there', await p.evaluate(() => !!document.querySelector('#crew-body .cr-pick .pl-cheer')));
      await p.evaluate(() => document.querySelector('#crew-body .cr-pick .pl-cheer').click()); await p.waitForTimeout(350);
      const t = await p.evaluate(() => { const e = document.getElementById('aaToast'); return { on: !e.hidden, txt: e.innerText.replace(/\s+/g, ' ').trim(), sheet: document.getElementById('hist-overlay').classList.contains('visible') }; });
      C.check('…its tap offers to join ("Join the crew to cheer"), never a sheet and never a crew_cheer', t.on && /Join the crew to cheer/.test(t.txt) && /Join the crew/.test(t.txt) && !t.sheet && !(await calls(p, 'crew_cheer')).length, JSON.stringify(t));
      await ctx.close();
      const u = await openCrewTab(bellP({ under13: true, can_post: false, answer: 'yes' }));
      const d = await u.p.evaluate(() => { const pk = document.querySelector('#crew-body .cr-pick'); return pk && { ch: !!pk.querySelector('.pl-cheer, .pl-cheered'), lk: !!pk.querySelector('.cr-pk-pg'), why: pk.querySelector('.cr-pk-why').textContent }; });
      C.check('under 13: the card is drawn and read, with no Cheer and no page link', !!d && !d.ch && !d.lk && d.why.indexOf(WHY) > 0, JSON.stringify(d));
      await u.ctx.close();
      // a pick whose person is not in the crew list this phone holds is still named on the sheet (the pick carries the name)
      const g = await openCrewTab(bellP({}, undefined, { crew: [] }));
      await g.p.evaluate(() => document.querySelector('#crew-body .cr-pick .pl-cheer').click()); await g.p.waitForTimeout(350);
      C.check('a pick not in the crew list: the sheet still says "Cheer Mina"', await g.p.evaluate(() => (document.querySelector('#hist-overlay .readiness-title') || {}).textContent === 'Cheer Mina'));
      await g.ctx.close();
    }
    // 92 · dark mode through the tokens only
    {
      const { ctx, p } = await openCrewTab(bellP(), { opts: { dark: true } });
      const d = await p.evaluate(() => { const pk = document.querySelector('#crew-body .cr-pick'); return pk && { bg: getComputedStyle(pk).backgroundColor, why: getComputedStyle(pk.querySelector('.cr-pk-why')).color, qm: getComputedStyle(pk.querySelector('.qm')).color, top: getComputedStyle(pk.querySelector('.cr-pk-top')).backgroundImage.slice(0, 15), by: getComputedStyle(pk.querySelector('.cr-pk-by')).color }; });
      C.check('dark mode: the row ground, the ink and the green quotes come from the tokens; the top is the hero gradient', !!d && d.bg === 'rgb(36, 36, 36)' && d.why === 'rgb(237, 237, 237)' && d.qm === 'rgb(109, 190, 149)' && /radial-gradient/.test(d.top) && d.by === 'rgb(154, 154, 154)', JSON.stringify(d));
      await ctx.close();
    }
    // 92 · her page: the reason under the honour row (14 px asked, the type scale's 15 px given), "Amir" small; a row with no reason is as it was
    {
      const pages = { [CKP]: { honours: [{ month: '2026-10-01', honour: 'pick', value: { why: WHY } }, { month: '2026-09-01', honour: 'sessions', value: { n: 14 } }, { month: '2026-08-01', honour: 'pick', value: {} }] } };
      const { ctx, p } = await openCrewTab(bellP(), { stub: { crewPages: pages } });
      await p.evaluate(ck => openPlayer(ck), CKP); await p.waitForTimeout(900);
      const d = await p.evaluate(() => {
        const rows = [...document.querySelectorAll('#crewplayer-body .pl-row')].filter(r => /Amir's Pick|Most sessions/.test(r.textContent));
        return rows.map(r => ({ t: (r.querySelector('.t') || {}).textContent, q: (r.querySelector('.q') || {}).textContent, why: (r.querySelector('.pl-why') || {}).textContent || null, fs: r.querySelector('.pl-why') ? getComputedStyle(r.querySelector('.pl-why')).fontSize : null,
          by: (r.querySelector('.pl-by') || {}).textContent || null, qm: r.querySelector('.qm') ? getComputedStyle(r.querySelector('.qm')).color : null }));
      });
      const w = d.find(r => r.why) || {};
      C.check('her page: the pick row shows Amir\'s reason in quotes under its line, then "Amir"', d.length === 3 && w.t === 'Amir\'s Pick' && /October 2026/.test(w.q) && w.why === '“' + WHY + '”' && w.by === 'Amir' && w.qm === 'rgb(14, 74, 54)' && w.fs === '15px', JSON.stringify(d));
      C.check('...a pick with no reason and another honour are as they were (no quote, no name)', d.length === 3 && d.filter(r => r.why).length === 1 && d.filter(r => !r.why).every(r => r.by === null && r.qm === null) && d.some(r => /14 plan sessions/.test(r.q)), JSON.stringify(d));
      await ctx.close();
    }
    // 77 · after Post the new post comes into view and lights for about 2 seconds
    for (const reduced of [false, true]) {
      const b = bellP({}, null); b.items = filler(14);
      const { ctx, p } = await openCrewTab(b, { opts: { reduced } });
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(400);
      const y0 = await p.evaluate(() => Math.round(scrollY));
      await p.evaluate(() => openCrewPost()); await p.waitForTimeout(300);
      await p.fill('#hist-overlay .cr-txt', 'Landing test post.');
      await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click());
      await p.waitForFunction(() => document.querySelector('#crew-body .cr-post.cr-lit'), null, { timeout: 5000 }).catch(() => {});
      await p.waitForTimeout(1000);
      const id = await p.evaluate(() => { const e = [...document.querySelectorAll('#crew-body .cr-post')].find(x => /Landing test post/.test(x.textContent)); return e ? e.dataset.id : null; });
      const v = id ? await view(p, `#crew-body .cr-post[data-id="${id}"]`) : null;
      C.check(`after Post${reduced ? ' (reduced motion)' : ''}: the new post is scrolled into view (from ${y0} px down) and lit`, y0 > 800 && !!id && inView(v) && v.lit, JSON.stringify([y0, id, v]));
      if (reduced) C.check('…reduced motion: the tint stays without the fade (no animation)', !!v && v.anim === 'none', v && v.anim); else C.check('…the tint fades (an animation)', !!v && v.anim === 'crLit', v && v.anim);
      await p.waitForTimeout(2600);
      C.check('…and the light is off again after about 2 seconds', id && !(await view(p, `#crew-body .cr-post[data-id="${id}"]`)).lit);
      C.check('no page errors', !p.errs.length, p.errs.join(' | '));
      await ctx.close();
    }
    // 77 · arriving from a crew notification (#crew) lands on what is new for me since my last visit; a normal tap on the Crew tab never moves anyone
    {
      const rep = (id, who, ck, ms, o) => Object.assign({ id, who, me: false, amir: false, body: 'Strong week.', at: iso(now - ms), ck, fv: null }, o || {});
      const mk = (replies, extra) => {
        const b = bellP({}, null);
        b.items = filler(10).concat([{ t: 'post', id: 'own-1', who: 'Alex R.', me: true, amir: false, kind: 'post', body: 'Day 4 done.', photo: false, at: iso(now - 6 * 3600e3), pinned: false, left: 7, kudos: { n: 0, mine: false, names: [] }, replies }]);
        return Object.assign(b, extra || {});
      };
      const arrive = async (b, since, stub, query) => {
        const o = await open(browser, { bell: b, seed: since ? { _crewseen_at: String(since) } : {}, stub: stub || {}, opts: { query: query === undefined ? '#crew' : query } });
        await o.p.waitForFunction(() => document.querySelector('#screen-crew.active, #screen-crewplayer.active'), null, { timeout: 12000 }).catch(() => {});
        return o;
      };
      const calm = async p => { await p.waitForTimeout(1800); };
      // a newer reply on my post: the NEWEST one is scrolled to and lit (the old one, from before my last visit, is not)
      {
        const o = await arrive(mk([rep('rep-old', 'Reza K.', CKR, 5 * 3600e3), rep('rep-a', 'Mina S.', CKP, 20 * 60e3), rep('rep-b', 'Reza K.', CKR, 5 * 60e3), rep('rep-me', 'Alex R.', CKM, 1 * 60e3, { me: true })]), now - 3 * 3600e3);
        await o.p.waitForFunction(() => document.querySelector('.cr-rep.cr-lit'), null, { timeout: 6000 }).catch(() => {});
        await o.p.waitForTimeout(1000);
        const v = await view(o.p, '.cr-rep[data-rid="rep-b"]'), lit = await o.p.evaluate(() => [...document.querySelectorAll('.cr-lit')].map(e => e.dataset.rid));
        C.check('#crew with a newer reply on my post: Crew opens and the newest reply is scrolled into view and lit (not the older ones, not my own)', !!v && inView(v) && v.y > 600 && lit.length === 1 && lit[0] === 'rep-b', JSON.stringify([v, lit]));
        C.check('…the time of this visit is written on the phone and is never synced', Number(await o.p.evaluate(id => localStorage.getItem(id + '_crewseen_at'), H.ID)) > now - 5000 && await o.p.evaluate(() => !Object.keys(_snapshot()).some(k => /crewseen_at/.test(k))));
        await calm(o.p);
        C.check('…the light goes off after about 2 seconds', await o.p.evaluate(() => !document.querySelector('.cr-lit')));
        C.check('no page errors', !o.p.errs.length, o.p.errs.join(' | '));
        await o.ctx.close();
      }
      // a reply that names me with @, on someone else's post
      {
        const b = mk([]);
        b.items[3].replies = [rep('rep-at', 'Mina S.', CKP, 10 * 60e3, { body: '@[' + CKM + '|Alex R.] look at this', mentions: [{ ck: CKM, who: 'Alex R.', fv: null }] })];
        const o = await arrive(b, now - 3 * 3600e3);
        await o.p.waitForFunction(() => document.querySelector('.cr-rep.cr-lit'), null, { timeout: 6000 }).catch(() => {});
        await o.p.waitForTimeout(1000);
        const v = await view(o.p, '.cr-rep[data-rid="rep-at"]');
        C.check('#crew with a reply that names me with @ on someone else\'s post: that reply is scrolled to and lit', !!v && inView(v) && v.lit, JSON.stringify(v));
        await o.ctx.close();
      }
      // nothing newer than my last visit: the top of Crew, as today
      {
        const o = await arrive(mk([rep('rep-old', 'Reza K.', CKR, 5 * 3600e3)]), now - 3 * 3600e3);
        await calm(o.p);
        const s = await o.p.evaluate(() => ({ crew: !!document.querySelector('#screen-crew.active'), y: Math.round(scrollY), lit: !!document.querySelector('.cr-lit') }));
        C.check('#crew with nothing newer than my last visit: the top of Crew, nothing lit', s.crew && s.y < 40 && !s.lit, JSON.stringify(s));
        await o.ctx.close();
      }
      // a phone with no time of a last visit counts the last day: a reply from 20 minutes ago lands, one from three days ago does not
      {
        const o = await arrive(mk([rep('rep-3d', 'Reza K.', CKR, 3 * 86400e3)]), 0);
        await calm(o.p);
        const s = await o.p.evaluate(() => ({ crew: !!document.querySelector('#screen-crew.active'), y: Math.round(scrollY), lit: !!document.querySelector('.cr-lit') }));
        C.check('#crew on a phone with no last-visit time: a reply from three days ago does not move me', s.crew && s.y < 40 && !s.lit, JSON.stringify(s));
        await o.ctx.close();
        const o2 = await arrive(mk([rep('rep-new', 'Mina S.', CKP, 20 * 60e3)]), 0);
        await o2.p.waitForFunction(() => document.querySelector('.cr-rep.cr-lit'), null, { timeout: 6000 }).catch(() => {});
        await o2.p.waitForTimeout(1000);
        const v = await view(o2.p, '.cr-rep[data-rid="rep-new"]');
        C.check('…and one from 20 minutes ago lands', !!v && inView(v) && v.lit, JSON.stringify(v));
        await o2.ctx.close();
      }
      // a normal tap on the Crew tab, with the same newer reply waiting: nobody is moved
      {
        const o = await arrive(mk([rep('rep-a', 'Mina S.', CKP, 20 * 60e3)]), now - 3 * 3600e3, {}, '');
        await o.p.evaluate(() => goTo('crew')); await calm(o.p);
        const s = await o.p.evaluate(() => ({ crew: !!document.querySelector('#screen-crew.active'), y: Math.round(scrollY), lit: !!document.querySelector('.cr-lit') }));
        C.check('a normal tap on the Crew tab with a newer reply waiting: the top of Crew, nothing lit (only a notification lands)', s.crew && s.y < 40 && !s.lit, JSON.stringify(s));
        await o.ctx.close();
      }
      // no reply, but a cheer on my page dated on or after the day of my last visit: my page opens at Cheers this week
      {
        const today = iso(now).slice(0, 10), yday = iso(now - 86400e3).slice(0, 10);
        const pg = day => ({ me: { cheers: { total: 1, season: 1, recent: [{ ck: CKP, who: 'Mina S.', fv: null, coach: false, word: null, day }] } } });
        const o = await arrive(mk([]), now - 2 * 3600e3, { crewPages: pg(today) });
        await o.p.waitForTimeout(2000);
        const s = await o.p.evaluate(() => { const h = [...document.querySelectorAll('#crewplayer-body h2.prog-sec')].find(x => /^Cheers this week/.test(x.textContent)); const r = h && h.getBoundingClientRect(); return { page: !!document.querySelector('#screen-crewplayer.active') && _playerCk === 'me', top: r ? Math.round(r.top) : null, y: Math.round(scrollY) }; });
        C.check('#crew with a cheer from someone else on my page since my last visit: my page opens and is scrolled so Cheers this week is in view (it sits below the fold at the top)', s.page && s.top !== null && s.y > 300 && s.top >= 0 && s.top < 700, JSON.stringify(s));
        await o.p.evaluate(() => playerBack()); await o.p.waitForTimeout(400);
        C.check('…and ← goes back to Crew', await o.p.evaluate(() => !!document.querySelector('#screen-crew.active')));
        await o.ctx.close();
        const o2 = await arrive(mk([]), now - 60e3, { crewPages: pg(yday) });
        await o2.p.waitForTimeout(2000);
        const s2 = await o2.p.evaluate(() => ({ crew: !!document.querySelector('#screen-crew.active'), y: Math.round(scrollY) }));
        C.check('…a cheer from a day before my last visit does not move me: the top of Crew', s2.crew && s2.y < 40, JSON.stringify(s2));
        await o2.ctx.close();
      }
    }
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
