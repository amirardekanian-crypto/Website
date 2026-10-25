// Home Crowd steps 2 to 4, the athlete app (2026-10-25): node scripts/headless/inbox.js [--out <dir for screenshots>]
//
// Step 2, the Inbox (idea 90 A, with 83's Cheer back): the tray beside the initials and its count (clay, nothing at 0, "9+" over nine), the count that clears when the Inbox is opened
// (aa.inbox.seen), each kind of row in plain words and its door (a cheer, a reply, a mention, a like on a post and on a moment, an achievement like, a join, an answer), days as Today /
// Yesterday / the weekday, Cheer back and Cheered, Say hello, the three rows the phone knows by itself (a week note, a notes card, a new cycle), a folded notification (#inbox) opening
// the Inbox, ← going back to where it was opened from, Cheer back on your own page's cheer rows.
// Step 3, the weekly crew: the Toss card (two halves, faces, counts, a vote and a changed vote, optimistic, the clay half, closed, a non-member, under 13), the photo theme row and Post
// one (the composer with the theme as its prompt), the Mailbag on the Coach tab (the sheet, Send, the checkbox, three a day, 200 characters, a non-member and under 13), the answer on
// the Bell with the question above it, the Answer Book in the Library and from the Inbox.
// Step 4, talk back: the slim Reply line under every post (half height, keyboard up, members only), Hello crew (a draft from the page, once, only what the app knows), Say hello.
// Made-up people only. The stub answers get_inbox, crew_vote, crew_ask and get_answer_book by name (stub.js).
// Serve the repo first (see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const path = require('path'), fs = require('fs');

const now = Date.now(), iso = ms => new Date(ms).toISOString(), today = iso(now).slice(0, 10);
const ck = n => 'a0000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const CK = { alex: ck(1), mina: ck(2), reza: ck(3), leila: ck(6), sara: ck(7), omid: ck(8) };
const AMIR = '11111111-2222-3333-4444-555555555555', P_MINA = 'bbbbbbbb-0000-4000-8000-000000000001', P_OWN = 'cccccccc-0000-4000-8000-000000000001', P_ANS = 'dddddddd-0000-4000-8000-000000000001';
const nextSunday = () => { const d = new Date(); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const faceOf = (c, who, extra) => Object.assign({ ck: c, fv: null, who }, extra || {});
const WEEKLY = (o = {}) => Object.assign({ week: '2026-W43', q: 'Pull-ups or chin-ups?', a: 'Pull-ups', b: 'Chin-ups', theme: 'Your gym corner', open: true, closes: nextSunday(), mine: null,
  votes: { a: 5, b: 2, fa: [faceOf(CK.mina, 'Mina S.'), faceOf(CK.reza, 'Reza K.'), faceOf(CK.sara, 'Sara T.'), faceOf(CK.omid, 'Omid P.'), faceOf(CK.leila, 'Leila M.')], fb: [faceOf('a0000000-0000-4000-8000-000000000009', 'Kian F.')] } }, o);

function bell(o = {}) {
  const me = Object.assign({ answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, ck: CK.alex, fv: null,
    kinds: { level: true, week: true, mark: true, achievement: true, best: true, cycle: true, honour: true, open: true } }, o.me || {});
  const crew = [
    { who: 'Alex R.', me: true, since: '2026-10-19', ck: CK.alex, fv: null, lv: 19 }, { who: 'Mina S.', me: false, since: '2026-10-19', ck: CK.mina, fv: null, lv: 14 },
    { who: 'Reza K.', me: false, since: '2026-10-19', ck: CK.reza, fv: null, lv: 22 }, { who: 'Leila M.', me: false, since: '2026-10-22', ck: CK.leila, fv: null, lv: 9, new: true },
    { who: 'Sara T.', me: false, since: '2026-10-19', ck: CK.sara, fv: null, lv: 12 }, { who: 'Omid P.', me: false, since: '2026-10-19', ck: CK.omid, fv: null, lv: 5 }];
  const items = [
    { t: 'post', id: P_ANS, who: 'Amir', me: false, amir: true, kind: 'post', body: 'Every fifth week, or sooner if your sleep is bad.', photo: false, at: iso(now - 1800e3), pinned: true, left: 7,
      session: { ask: { q: 'How often should I deload?', by: o.askBy === undefined ? 'Mina' : o.askBy } }, kudos: { n: 0, mine: false, names: [] }, replies: [] },
    Object.assign({ t: 'post', id: P_MINA, who: 'Mina S.', me: false, amir: false, kind: 'post', body: 'Legs are gone after Tuesday.', photo: false, at: iso(now - 9000e3), pinned: false, left: 7,
      kudos: { n: 5, mine: false, names: ['Sara T.'] }, replies: [{ id: 'r10', who: 'Leila M.', me: false, amir: false, ck: CK.leila, fv: null, body: 'Same here', at: iso(now - 600e3) }] }, { ck: CK.mina, fv: null }),
  ];
  if (!o.noOwnPost) items.push({ t: 'post', id: P_OWN, who: 'Alex R.', me: true, amir: false, kind: 'post', body: 'Day 2 done.', photo: false, at: iso(now - 12000e3), pinned: false, left: 7, ck: CK.alex, fv: null,
    kudos: { n: 3, mine: false, names: ['Mina S.'] }, replies: [{ id: 'r9', who: 'Reza K.', me: false, amir: false, ck: CK.reza, fv: null, body: 'Nice one', at: iso(now - 900e3) }] });
  if (o.joinLine) items.push({ t: 'line', key: CK.sara + ':' + today, who: 'Sara T.', me: false, at: iso(now - 7200e3), kudos: { n: 0, mine: false, names: [] }, parts: [{ k: 'joined' }], ck: CK.sara, fv: null });
  return Object.assign({ lounge: 1 }, {
    athlete_id: H.ID, at: iso(now), days: 7, kinds: ['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open'], me, week: { members: 6, sessions: 14, held: 3 }, crew, items,
    weekly: o.weekly === undefined ? WEEKLY() : o.weekly });
}
const SERVER_ROWS = () => [
  { k: 'cheer', at: iso(now - 5 * 60e3), who: 'Mina S.', amir: false, ck: CK.mina, fv: null, word: 'Strong', back: true },
  { k: 'cheer', at: iso(now - 9 * 60e3), who: 'Amir', amir: true, ck: null, fv: null, word: null, back: false },
  { k: 'reply', at: iso(now - 15 * 60e3), who: 'Reza K.', amir: false, ck: CK.reza, fv: null, body: 'Nice one', post: P_OWN, reply: 'r9' },
  { k: 'mention', at: iso(now - 10 * 60e3), who: 'Leila M.', amir: false, ck: CK.leila, fv: null, body: 'Same here', post: P_MINA, reply: 'r10' },
  { k: 'like', at: iso(now - 20 * 60e3), n: 3, who: ['Mina S.', 'Reza K.'], faces: [faceOf(CK.mina, 'Mina S.'), faceOf(CK.reza, 'Reza K.')], post: P_OWN, day: null, body: 'Day 2 done.' },
  { k: 'like', at: iso(now - 25 * 60e3), n: 2, who: ['Mina S.', 'Reza K.'], faces: [faceOf(CK.mina, 'Mina S.')], post: null, day: today, body: null },
  { k: 'award_like', at: iso(now - 3 * 3600e3), n: 1, who: ['Reza K.'], award: 'achievement:lights_out', name: 'Lights Out' },
  { k: 'join', at: iso(now - 2 * 3600e3), who: 'Sara T.', ck: CK.sara, fv: null },
  { k: 'answer', at: iso(now - 26 * 3600e3), who: 'Amir', amir: true, q: 'How often should I deload?', post: P_ANS },
];
const BOOK = () => [{ q: 'How often should I deload?', a: 'Every fifth week, or sooner if your sleep is bad.', at: iso(now - 26 * 3600e3), by: 'Mina S.' },
  { q: 'Is soreness a sign of a good session?', a: 'No. It is a sign you did something new.', at: iso(now - 4 * 86400e3), by: null }];

async function open(browser, o = {}) {
  const b = o.bell === null ? null : (o.bell || bell(o.b || {}));
  return H.openProgram(browser, Object.assign({ w: 390, h: 844, stub: Object.assign({ crewBoard: [] }, b ? { bell: b } : {}, o.inbox === null ? {} : { inbox: { rows: o.inbox || SERVER_ROWS() } }, o.stub || {}),
    seed: Object.assign({ _cheerhint: 'done' }, o.seed || {}) }, o.opts || {}));
}
const calls = (p, name) => p.evaluate(n => (window.__STUB.params || []).filter(x => x[0] === n).map(x => x[1]), name);
const waitTab = p => p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).then(() => true, () => false);
const screenNow = p => p.evaluate(() => (document.querySelector('.screen.active') || {}).id || '');
const toast = p => p.evaluate(() => { const el = document.getElementById('aaToast'); return !el || el.hidden ? null : { text: (el.querySelector('.aa-toast-t') || {}).textContent, action: (el.querySelector('.aa-toast-go') || {}).textContent || '' }; });
const badge = p => p.evaluate(() => { const b = document.querySelector('#global-inbox .gi-n'); return b && !b.hidden ? b.textContent : ''; });
const rowText = (p, k) => p.evaluate(kk => { const r = document.querySelector(`#inbox-body .ib-row[data-k="${kk}"] .ib-t`); return r ? r.textContent.replace(/\s+/g, ' ').trim() : null; }, k);
const overlay = p => p.evaluate(() => { const o = document.getElementById('hist-overlay'); return !!(o && o.classList.contains('visible')); });
const seenMap = p => p.evaluate(() => { try { return JSON.parse(localStorage.getItem('aa.inbox.seen') || 'null'); } catch (e) { return null; } });
const openInboxFrom = async (p, scr) => { await p.evaluate(s => goTo(s), scr || 'home'); await p.waitForTimeout(150); await p.evaluate(() => document.getElementById('global-inbox').click()); await p.waitForTimeout(500); };
const crewRoom = async (p) => { await waitTab(p); await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700); };
const lit = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return !!(e && e.classList.contains('cr-lit')); }, sel);

(async () => {
  const C = H.checker();
  const OUT = H.outDir();
  const browser = await H.launch();
  const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, name + '.png') }); };

  // ── 1. the tray and its count ────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await waitTab(p); await p.waitForTimeout(900);
    const t = await p.evaluate(() => {
      const b = document.getElementById('global-inbox'), a = document.getElementById('global-account'), rb = b.getBoundingClientRect(), ra = a.getBoundingClientRect();
      const c = getComputedStyle(b.querySelector('.gi-n'));
      return { on: getComputedStyle(b).display !== 'none', w: rb.width, h: rb.height, right: rb.right, aLeft: ra.left, top: rb.top, aTop: ra.top, label: b.getAttribute('aria-label'), n: b.querySelector('.gi-n').textContent,
        bg: c.backgroundColor, svg: !!b.querySelector('svg'), tag: b.tagName };
    });
    C.check('the tray is a button beside the initials, left of them, level with them', t.on && t.tag === 'BUTTON' && t.right <= t.aLeft && Math.abs(t.top - t.aTop) < 2 && t.svg, JSON.stringify(t));
    C.check('…40 px drawn, and its tap target is 44', t.w === 40 && t.h === 40 && await p.evaluate(() => { const s = getComputedStyle(document.getElementById('global-inbox'), '::after'); return parseFloat(s.top) <= -2 || s.inset.indexOf('-2px') >= 0; }), t.w + 'x' + t.h);
    C.check('…the count is the rows newer than the last time it was opened: nine, in clay (the one accent)', t.n === '9' && t.bg === 'rgb(194, 81, 44)' && t.label === 'Inbox, 9 new', t.n + ' ' + t.bg + ' ' + t.label);
    const asks = await calls(p, 'get_inbox');
    C.check('…get_inbox was asked once when the app opened, with no since on a phone that never opened it', asks.length === 1 && asks[0].p_since === null, JSON.stringify(asks));
    C.check('…and the Bell\'s own refresh asks nothing more within 20 seconds (no fast poll)', await p.evaluate(async () => { const before = window.__STUB.params.filter(x => x[0] === 'get_inbox').length; inboxBoot(); await new Promise(r => setTimeout(r, 300)); return window.__STUB.params.filter(x => x[0] === 'get_inbox').length === before; }));
    C.check('…no tray badge text is placed on the tab bar (the Crew tab has no number)', !(await p.$('#global-tabs [data-tab="crew"] .nav-n')));
    // open it
    await p.evaluate(() => document.getElementById('global-inbox').click()); await p.waitForTimeout(500);
    const seen = await seenMap(p);
    C.check('opening the tray shows the Inbox screen titled Inbox', (await screenNow(p)) === 'screen-inbox' && (await p.evaluate(() => document.querySelector('#screen-inbox .ceil-title').textContent.trim())) === 'Inbox');
    C.check('…aa.inbox.seen is set for this athlete to the server\'s time, and the badge is gone', !!seen && Date.parse(seen[H.ID]) > now - 5000 && (await badge(p)) === '' && (await p.evaluate(() => document.getElementById('global-inbox').getAttribute('aria-label'))) === 'Inbox', JSON.stringify(seen));
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(200);
    C.check('…and the badge stays gone on the next refresh of the same list', await p.evaluate(async () => { await refreshInbox(); return !document.querySelector('#global-inbox .gi-n') || document.querySelector('#global-inbox .gi-n').hidden; }));
    await p.evaluate(() => { window.__STUB.inbox.rows.unshift({ k: 'join', at: new Date(Date.now() + 60000).toISOString(), who: 'Omid P.', ck: 'a0000000-0000-4000-8000-000000000008', fv: null }); return refreshInbox(); });
    await p.waitForTimeout(200);
    C.check('…a row that arrives after the visit brings the count back as 1', (await badge(p)) === '1', await badge(p));
    await ctx.close();
  }
  {
    const many = SERVER_ROWS().concat([{ k: 'join', at: iso(now - 30e3), who: 'Omid P.', ck: CK.omid, fv: null }, { k: 'join', at: iso(now - 40e3), who: 'Kian F.', ck: ck(9), fv: null }]);
    const { ctx, p } = await open(browser, { inbox: many });
    await waitTab(p); await p.waitForTimeout(900);
    C.check('eleven new rows read 9+', (await badge(p)) === '9+', await badge(p));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { inbox: [] });
    await waitTab(p); await p.waitForTimeout(700);
    C.check('nothing new: no badge at all', (await badge(p)) === '');
    await openInboxFrom(p, 'home');
    C.check('…and the Inbox says so plainly', (await p.evaluate(() => document.getElementById('inbox-body').innerText.trim())) === 'Nothing new this week.');
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { opts: { query: '?client=demo' }, bell: null, inbox: null });
    await p.waitForTimeout(1200);
    C.check('the demo: no tray, and get_inbox is never asked', !(await p.evaluate(() => { const b = document.getElementById('global-inbox'); return getComputedStyle(b).display !== 'none'; })) && !(await calls(p, 'get_inbox')).length);
    await ctx.close();
  }

  // ── 2. the rows, their words and their doors ──────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { b: {}, stub: { answerBook: BOOK() } });
    await waitTab(p); await p.waitForTimeout(900);
    await openInboxFrom(p, 'home');
    const R = {};
    for (const k of ['cheer', 'reply', 'mention', 'like', 'award_like', 'join', 'answer']) R[k] = await rowText(p, k);
    const all = await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-row')].map(r => r.dataset.k + ': ' + r.querySelector('.ib-t').textContent.replace(/\s+/g, ' ').trim()));
    C.check('a cheer: "Mina S. cheered you: Strong."', all.indexOf('cheer: Mina S. cheered you: Strong.') >= 0, all.join(' | '));
    C.check('…Amir\'s cheer: "Amir cheered you."', all.indexOf('cheer: Amir cheered you.') >= 0);
    C.check('a reply: "Reza K. replied: Nice one"', R.reply === 'Reza K. replied: Nice one', R.reply);
    C.check('a mention: "Leila M. named you in a reply"', R.mention === 'Leila M. named you in a reply', R.mention);
    C.check('three likes: "Mina S., Reza K. and 1 other liked your post"', all.indexOf('like: Mina S., Reza K. and 1 other liked your post') >= 0, all.join(' | '));
    C.check('two likes on a moment: "Mina S. and Reza K. liked your moment"', all.indexOf('like: Mina S. and Reza K. liked your moment') >= 0);
    C.check('a like on an achievement: "Reza K. liked your achievement Lights Out"', R.award_like === 'Reza K. liked your achievement Lights Out', R.award_like);
    C.check('a join: "Sara T. joined the crew"', R.join === 'Sara T. joined the crew', R.join);
    C.check('an answer: "Amir answered your question", with the question under it', R.answer === 'Amir answered your question' && (await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="answer"] .ib-q').textContent)) === 'How often should I deload?');
    C.check('…more than two likes count the rest: "Mina, Reza and 3 others"', await p.evaluate(() => inboxSpec({ k: 'like', n: 5, who: ['Mina S.', 'Reza K.'], post: 'x', body: '' }).t.replace(/<[^>]+>/g, '')) === 'Mina S., Reza K. and 3 others liked your post');
    C.check('no em-dash and no semicolon in any sentence (COM-3)', !/[—;]/.test(all.join(' ')));
    const days = await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-day')].map(d => d.textContent));
    C.check('rows sit under Today and Yesterday', days[0] === 'Today' && days.indexOf('Yesterday') === 1, days.join(','));
    C.check('…each row shows a face (the letters), its sentence and the time', await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-row')].every(r => r.querySelector('.cr-ini') && /^\d\d:\d\d$/.test(r.querySelector('.ib-time').textContent.trim()))));
    C.check('…Amir\'s face is the AA one', await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="answer"] .cr-ini.am').textContent.trim()) === 'AA');
    C.check('…every row is a 44 px door at least', await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-go')].every(b => b.getBoundingClientRect().height >= 44)));
    await p.evaluate(() => window.scrollTo(0, 0)); await shot(p, 'inbox');

    // doors
    await p.waitForTimeout(2800);   // the boot's own Bell refresh (2.5 s) repaints Crew once; the doors are tried after it
    const go = async k => { await p.evaluate(() => goTo('home')); await p.evaluate(() => document.getElementById('global-inbox').click()); await p.waitForTimeout(350); await p.evaluate(kk => document.querySelector(`#inbox-body .ib-row[data-k="${kk}"] .ib-go`).click(), k); };
    await go('reply'); await p.waitForTimeout(1500);   // the first visit to Crew in a run is repainted once by the board arriving: the tint comes back
    C.check('a reply opens Crew with that reply tinted', (await screenNow(p)) === 'screen-crew' && await lit(p, '#crew-body .cr-rep[data-rid="r9"]'));
    await go('mention'); await p.waitForTimeout(700);
    C.check('a mention opens Crew with the reply that named me tinted', (await screenNow(p)) === 'screen-crew' && await lit(p, '#crew-body .cr-rep[data-rid="r10"]'));
    await go('like'); await p.waitForTimeout(700);
    C.check('a like on a post opens Crew with the post tinted', (await screenNow(p)) === 'screen-crew' && await lit(p, `#crew-body .cr-post[data-id="${P_OWN}"]`));
    await p.evaluate(() => { goTo('home'); document.getElementById('global-inbox').click(); }); await p.waitForTimeout(350);
    await p.evaluate(() => { const rs = [...document.querySelectorAll('#inbox-body .ib-row[data-k="like"] .ib-go')]; rs[1].click(); }); await p.waitForTimeout(500);
    C.check('…a like on a moment lands on Crew (that line has no row in this crew\'s Bell, so the top of Crew)', (await screenNow(p)) === 'screen-crew');
    await go('cheer'); await p.waitForTimeout(900);
    C.check('a cheer opens my page at Cheers this week', (await screenNow(p)) === 'screen-crewplayer' && await p.evaluate(() => _playerCk === 'me'));
    await p.evaluate(() => playerBack()); await p.waitForTimeout(300);
    C.check('…and ← from my page goes back to the Inbox', (await screenNow(p)) === 'screen-inbox');
    await go('join'); await p.waitForTimeout(700);
    C.check('a join opens that person\'s page, ← back to the Inbox', (await screenNow(p)) === 'screen-crewplayer' && await p.evaluate(k => _playerCk === k, CK.sara));
    await p.evaluate(() => playerBack()); await p.waitForTimeout(300);
    C.check('…', (await screenNow(p)) === 'screen-inbox');
    await go('award_like'); await p.waitForTimeout(600);
    C.check('an achievement like opens the achievement or the cabinet', (await screenNow(p)) === 'screen-achievements' || await overlay(p), await screenNow(p));
    await p.evaluate(() => { closeHistorySheet(); }); await p.waitForTimeout(200);
    await go('answer'); await p.waitForTimeout(900);
    C.check('an answer opens the Answer Book on that answer, tinted', (await overlay(p)) && await p.evaluate(() => { const i = document.querySelector('#hist-overlay .ab-i'); return !!i && i.classList.contains('cr-lit') && /deload/.test(i.querySelector('.ab-q').textContent); }));
    await p.evaluate(() => closeHistorySheet());

    // back goes where it came from
    await openInboxFrom(p, 'workouts');
    await p.evaluate(() => document.querySelector('#screen-inbox .nav-back').click()); await p.waitForTimeout(300);
    C.check('← goes back to the screen the tray was tapped on (the Library)', (await screenNow(p)) === 'screen-workouts');
    await openInboxFrom(p, 'notes');
    C.check('…the tab the Inbox was opened from stays lit', await p.evaluate(() => (document.querySelector('#global-tabs .nav-item.active') || {}).dataset.tab) === 'notes');
    await p.evaluate(() => history.back()); await p.waitForTimeout(400);
    C.check('…and the phone\'s Back does the same', (await screenNow(p)) === 'screen-notes', await screenNow(p));
    await ctx.close();
  }

  // ── 3. Cheer back, Say hello ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { b: { joinLine: true } });
    await waitTab(p); await p.waitForTimeout(800);
    await openInboxFrom(p, 'home');
    const btn = await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-row[data-k="cheer"]')].map(r => (r.querySelector('.ib-act') || {}).textContent || '(none)'));
    C.check('Cheer back is on a crew member\'s cheer, and not on Amir\'s', btn.join(',') === 'Cheer back,(none)', btn.join(','));
    C.check('…a small button, 44 px tall', await p.evaluate(() => document.querySelector('#inbox-body .ib-act').getBoundingClientRect().height >= 44));
    await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="cheer"] .ib-act').click()); await p.waitForTimeout(700);
    const cc = await calls(p, 'crew_cheer');
    C.check('tapping it sends the cheer (the existing call, no word) to that person', cc.length === 1 && cc[0].p_subject === CK.mina && !cc[0].p_word, JSON.stringify(cc));
    C.check('…and the button turns to Cheered', await p.evaluate(() => { const r = document.querySelector('#inbox-body .ib-row[data-k="cheer"]'); return !r.querySelector('.ib-act') && /Cheered/.test(r.querySelector('.ib-done').textContent); }));
    const sh = await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-row[data-k="join"] .ib-act')].map(b => b.textContent));
    C.check('a join row has Say hello', sh.join() === 'Say hello', sh.join());
    await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="join"] .ib-act').click()); await p.waitForTimeout(500);
    C.check('…it opens the composer with "Welcome to the crew, Sara."', (await overlay(p)) && await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value) === 'Welcome to the crew, Sara.');
    await p.evaluate(() => closeHistorySheet());
    await ctx.close();
  }
  {
    // a cheer that can no longer go back (the server says so) has no button; a non-member has none either
    const rows = SERVER_ROWS(); rows[0].back = false;
    const { ctx, p } = await open(browser, { inbox: rows });
    await waitTab(p); await p.waitForTimeout(700); await openInboxFrom(p, 'home');
    C.check('a cheer already answered today has no button (back is false)', !(await p.$('#inbox-body .ib-row[data-k="cheer"] .ib-act')));
    await ctx.close();
    const n = await open(browser, { b: { me: { answer: null, can_post: false } } });
    await waitTab(n.p); await n.p.waitForTimeout(700); await openInboxFrom(n.p, 'home');
    C.check('someone who has not joined sees no Cheer back and no Say hello', !(await n.p.$('#inbox-body .ib-act')));
    await n.ctx.close();
  }
  {
    // on your own page
    const pageMe = { cheers: { total: 3, season: 2, recent: [{ ck: CK.reza, who: 'Reza K.', fv: null, coach: false, word: 'Go', day: today }, { ck: CK.mina, who: 'Mina S.', fv: null, coach: false, word: null, day: today }, { ck: null, who: 'Amir', fv: null, coach: true, word: null, day: today }] } };
    const rowsBack = SERVER_ROWS(); rowsBack[0].back = false;   // the Inbox says: you cheered Mina today
    const { ctx, p } = await open(browser, { inbox: rowsBack, stub: { crewPages: { me: pageMe } } });
    await waitTab(p); await p.waitForTimeout(800);
    await p.evaluate(() => openPlayer('me')); await p.waitForTimeout(900);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-ch')].map(r => { const w = r.closest('.pl-chw'); return r.querySelector('.t').textContent + ':' + (w && w.querySelector('.ib-act') ? 'back' : 'none'); }));
    C.check('your own page: Cheer back on a crew member\'s cheer, none on one you cheered today, none on Amir\'s', rows.join() === 'Reza K.:back,Mina S.:none,Coach:none', rows.join());
    await p.evaluate(() => document.querySelector('#crewplayer-body .pl-chw .ib-act').click()); await p.waitForTimeout(700);
    const cc = await calls(p, 'crew_cheer');
    C.check('…the button sends the cheer and goes once it has', cc.length === 1 && cc[0].p_subject === CK.reza && !(await p.$('#crewplayer-body .pl-chw .ib-act')), JSON.stringify(cc));
    await ctx.close();
    const o = await open(browser, { stub: { crewPages: { [CK.mina]: { cheers: { total: 1, season: 1, recent: [{ ck: CK.reza, who: 'Reza K.', fv: null, coach: false, word: 'x', day: today }] } } } } });
    await waitTab(o.p); await o.p.waitForTimeout(700);
    await o.p.evaluate(k => openPlayer(k), CK.mina); await o.p.waitForTimeout(800);
    C.check('someone else\'s page never has Cheer back', !(await o.p.$('#crewplayer-body .pl-chw')));
    await o.ctx.close();
  }

  // ── 4. the three rows the phone knows by itself, and a folded notification ─────────────────────────────────────────────────
  {
    const prog = H.fixture();
    prog.cycles[prog.currentCycleIndex].weekNotes = { '2': { text: 'Keep it simple this week. Effort 7 on everything.' } };
    const known = JSON.stringify({ [H.ID]: { wn: '', nc: [], cy: 0, rows: [] } });
    const { ctx, p } = await open(browser, { inbox: [], opts: { prog, init: `try { localStorage.setItem('aa.inbox.known', ${JSON.stringify(known)}); } catch (e) {}` } });
    await waitTab(p); await p.waitForTimeout(900);
    C.check('with a record of what the phone last saw, a new week note, a notes card and a cycle each make a row, and the count says three', (await badge(p)) === '3', await badge(p));
    await openInboxFrom(p, 'plan');
    const all = await p.evaluate(() => [...document.querySelectorAll('#inbox-body .ib-row')].map(r => r.dataset.k + ': ' + r.querySelector('.ib-t').textContent.replace(/\s+/g, ' ').trim()));
    C.check('"Amir wrote your week note"', all.some(x => x === 'wn: Amir wrote your week note'), all.join(' | '));
    C.check('"A new note from Amir", with its title under it', all.some(x => x === 'nc: A new note from Amir') && /Understanding/.test(await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="nc"] .ib-q').textContent)), all.join(' | '));
    C.check('"Your new cycle is here: Load & Build"', all.some(x => x === 'cy: Your new cycle is here: Load & Build'), all.join(' | '));
    await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="wn"] .ib-go').click()); await p.waitForTimeout(500);
    C.check('the week note row opens Home', (await screenNow(p)) === 'screen-home');
    await openInboxFrom(p, 'home');
    await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="nc"] .ib-go').click()); await p.waitForTimeout(500);
    C.check('the notes row opens the Coach tab with that card open', (await screenNow(p)) === 'screen-notes' && await p.evaluate(() => document.getElementById('cn-h-0').getAttribute('aria-expanded')) === 'true');
    await openInboxFrom(p, 'notes');
    await p.evaluate(() => document.querySelector('#inbox-body .ib-row[data-k="cy"] .ib-go').click()); await p.waitForTimeout(400);
    C.check('the cycle row opens Home', (await screenNow(p)) === 'screen-home');
    await p.evaluate(() => goTo('plan'));
    C.check('opened once, they are not new again after a reload of the list', await p.evaluate(() => { inboxScan(); return inboxCount(); }) === 0);
    await ctx.close();
    const f = await open(browser, { inbox: [] });
    await waitTab(f.p); await f.p.waitForTimeout(800);
    C.check('a phone with no record yet only records what is there: no local rows (a new phone is not "a new cycle")', (await f.p.evaluate(() => inboxRows().length)) === 0);
    await f.ctx.close();
  }
  {
    const cold = await open(browser, { opts: { query: '#inbox' } });
    await cold.p.waitForTimeout(2200);
    C.check('a folded crew notification (#inbox, cold) opens the Inbox', (await screenNow(cold.p)) === 'screen-inbox' && !(await cold.p.evaluate(() => location.hash)));
    await cold.ctx.close();
    const warm = await open(browser);
    await waitTab(warm.p); await warm.p.waitForTimeout(500);
    await warm.p.evaluate(() => { navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { aa: 'go', screen: 'inbox' } })); });
    await warm.p.waitForTimeout(1200);
    C.check('…and the same message to an open app', (await screenNow(warm.p)) === 'screen-inbox');
    await warm.p.evaluate(() => goTo('home'));
    await warm.p.evaluate(() => { navigator.serviceWorker.dispatchEvent(new MessageEvent('message', { data: { aa: 'go', screen: 'crew' } })); });
    await warm.p.waitForTimeout(1200);
    C.check('…while a single-event notification still lands on Crew (step 1)', (await screenNow(warm.p)) === 'screen-crew');
    await warm.ctx.close();
    // sw.js: the folded push (n > 1) carries #inbox, a single one #crew
    const swSrc = fs.readFileSync(path.join(__dirname, '..', '..', 'sw.js'), 'utf8');
    const handlers = {};
    const vm = require('vm');
    try {
      const shown = [];
      const self = { addEventListener: (n, f) => { handlers[n] = f; }, registration: { showNotification: (t, o) => { shown.push(o); return Promise.resolve(); } }, clients: {}, skipWaiting() {}, location: { origin: 'https://x.test' } };
      vm.runInNewContext(swSrc, { self, importScripts() {}, caches: { open: () => Promise.resolve({}), keys: () => Promise.resolve([]), match: () => Promise.resolve(null) }, fetch: () => Promise.reject(new Error('x')), URL, Promise, console, Date, JSON, setTimeout, clearTimeout, Response: function () {} });
      const push = d => new Promise(res => handlers.push({ data: { json: () => d }, waitUntil: pr => pr.then(() => res(shown[shown.length - 1])) }));
      const folded = await push({ title: 'The crew has been busy', body: '4 new things to see.', tag: 'crew' });
      const faFolded = await push({ title: 'تو تیم خبر هست', body: '۴ چیز تازه.', tag: 'crew' });
      const one = await push({ title: 'Mina S. cheered you', body: 'Have a look.', tag: 'crew' });
      C.check('sw.js: a folded crew push opens #inbox (English and Farsi), a single one still opens #crew', folded.data.url === '/program.html#inbox' && faFolded.data.url === '/program.html#inbox' && one.data.url === '/program.html#crew', [folded.data.url, faFolded.data.url, one.data.url].join(' '));
    } catch (e) { C.check('sw.js: a folded crew push opens #inbox', /The crew has been busy[\s\S]{0,200}#inbox/.test(swSrc) && /program\.html#crew/.test(swSrc), 'could not run the worker: ' + e.message); }
  }

  // ── 5. the Toss card ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await crewRoom(p);
    const s = await p.evaluate(() => {
      const t = document.querySelector('#crew-body .cr-toss'), kids = [...document.getElementById('crew-body').children].map(c => c.className.split(' ')[0]);
      const h = [...t.querySelectorAll('.cr-half')];
      return { t: !!t, order: kids.slice(0, 5).join(','), k: t.querySelector('.k').textContent, q: t.querySelector('.q').textContent, labels: h.map(x => x.querySelector('.l').textContent), counts: h.map(x => x.querySelector('.n').textContent),
        faces: h.map(x => x.querySelectorAll('.cr-fl').length), btn: h.map(x => x.tagName).join(), ft: t.querySelector('.ft').textContent, theme: t.querySelector('.cr-theme p').textContent, post: (t.querySelector('.cr-theme button') || {}).textContent,
        h: h.map(x => Math.round(x.getBoundingClientRect().height)), w: h.map(x => Math.round(x.getBoundingClientRect().width)) };
    });
    C.check('the Toss card sits right under the green band, before the honours', s.t && /(^|,)cr-week,cr-toss(,|$)/.test(s.order), s.order);
    C.check('…"This week", the question, two halves with their words and counts 5 and 2', s.k === 'This week' && s.q === 'Pull-ups or chin-ups?' && s.labels.join() === 'Pull-ups,Chin-ups' && s.counts.join() === '5,2', JSON.stringify(s));
    C.check('…up to four faces stacked in a half (five voted, four drawn), one in the other', s.faces.join() === '4,1', s.faces.join());
    C.check('…two buttons side by side', s.btn === 'BUTTON,BUTTON' && Math.abs(s.w[0] - s.w[1]) <= 2, s.btn + ' ' + s.w);
    C.check('…the foot: "Amir\'s question. Closes Sunday."', s.ft === "Amir's question. Closes Sunday.", s.ft);
    C.check('…and the theme row: "This week\'s photo: Your gym corner" with Post one', s.theme === "This week's photo: Your gym corner" && s.post === 'Post one', s.theme + ' / ' + s.post);
    // vote, optimistic
    const r = await p.evaluate(() => { document.querySelector('.cr-half[data-side="b"]').click(); const b = document.querySelector('.cr-half[data-side="b"]'); return { mine: b.classList.contains('is-mine'), n: b.querySelector('.n').textContent, pressed: b.getAttribute('aria-pressed') }; });
    C.check('a tap on a half is optimistic: it is yours and counted at once', r.mine && r.n === '3' && r.pressed === 'true', JSON.stringify(r));
    await p.waitForTimeout(600);
    const v1 = await calls(p, 'crew_vote');
    const css = await p.evaluate(() => { const b = document.querySelector('.cr-half[data-side="b"]'), c = getComputedStyle(b); return { bc: c.borderTopColor, bg: c.backgroundColor, ids: b.querySelectorAll('.cr-fl').length, a: document.querySelector('.cr-half[data-side="a"]').classList.contains('is-mine') }; });
    C.check('…crew_vote went with side b, the half is outlined in clay and tinted, and my face joined it', v1.length === 1 && v1[0].p_side === 'b' && css.bc === 'rgb(199, 85, 47)' && /rgba\(199, 85, 47/.test(css.bg) && css.ids === 2 && !css.a, JSON.stringify([v1, css]));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(OUT, 'toss-voted.png') });
    await p.evaluate(() => document.querySelector('.cr-half[data-side="a"]').click()); await p.waitForTimeout(600);
    const s2 = await p.evaluate(() => ({ a: document.querySelector('.cr-half[data-side="a"] .n').textContent, b: document.querySelector('.cr-half[data-side="b"] .n').textContent, mineA: document.querySelector('.cr-half[data-side="a"]').classList.contains('is-mine'), mineB: document.querySelector('.cr-half[data-side="b"]').classList.contains('is-mine') }));
    C.check('tapping the other half changes the vote: 6 and 2, the clay moves', s2.a === '6' && s2.b === '2' && s2.mineA && !s2.mineB && (await calls(p, 'crew_vote')).length === 2, JSON.stringify(s2));
    C.check('…tapping the half you already chose sends nothing', await p.evaluate(async () => { document.querySelector('.cr-half[data-side="a"]').click(); await new Promise(r => setTimeout(r, 300)); return window.__STUB.params.filter(x => x[0] === 'crew_vote').length === 2; }));
    C.check('…the chosen vote is on the phone\'s copy of the Bell', await p.evaluate(id => JSON.parse(localStorage.getItem(id + '_crewcache')).weekly.mine, H_ID()) === 'a');
    // a vote the server refuses because the week closed
    await p.evaluate(() => { window.__STUB.bell.weekly.open = false; });
    await p.evaluate(() => document.querySelector('.cr-half[data-side="b"]').click()); await p.waitForTimeout(600);
    const t = await toast(p);
    C.check('a vote on a week that closed meanwhile says so, keeps the vote it had, and the card reads Closed', t && /Voting has closed/.test(t.text) && await p.evaluate(() => { const m = document.querySelector('.cr-half.is-mine'); return !!m && m.querySelector('.l').textContent === 'Pull-ups' && m.querySelector('.n').textContent === '6' && document.querySelector('.cr-toss .ft').textContent === 'Closed'; }), JSON.stringify(t));
    await ctx.close();
  }
  {
    const w = WEEKLY({ open: false, mine: 'a', votes: { a: 7, b: 3, fa: [faceOf(CK.mina, 'Mina S.')], fb: [] } });
    const { ctx, p } = await open(browser, { bell: bell({ weekly: w }) });
    await crewRoom(p);
    const s = await p.evaluate(() => ({ btn: document.querySelectorAll('.cr-toss button.cr-half').length, ft: document.querySelector('.cr-toss .ft').textContent, win: [...document.querySelectorAll('.cr-half')].map(h => h.classList.contains('is-win')).join(), theme: !!document.querySelector('.cr-theme') }));
    C.check('a closed week shows the result: no buttons, the winner marked, "Closed" in the foot, no photo row', s.btn === 0 && s.ft === 'Closed' && s.win === 'true,false' && !s.theme, JSON.stringify(s));
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(100);
    await p.screenshot({ path: path.join(OUT, 'toss-closed.png') });
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { bell: bell({ me: { answer: null, can_post: false } }) });
    await crewRoom(p);
    const s = await p.evaluate(() => ({ btn: document.querySelectorAll('.cr-toss button.cr-half').length, counts: [...document.querySelectorAll('.cr-half .n')].map(x => x.textContent).join(), post: [...document.querySelectorAll('.cr-theme button')].map(b => b.textContent).join() }));
    C.check('a non-member sees the counts and a Join the crew button in place of Post one', s.btn === 2 && s.counts === '5,2' && s.post === 'Join the crew', JSON.stringify(s));
    await p.evaluate(() => document.querySelector('.cr-half[data-side="a"]').click()); await p.waitForTimeout(300);
    const t = await toast(p);
    C.check('…tapping a half says to join, with the Join the crew button, and sends no vote', t && t.text === 'Join the crew to vote.' && t.action === 'Join the crew' && !(await calls(p, 'crew_vote')).length, JSON.stringify(t));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { bell: bell({ me: { under13: true, can_post: false } }) });
    await crewRoom(p);
    const s = await p.evaluate(() => ({ btn: document.querySelectorAll('.cr-toss button').length, faces: document.querySelectorAll('.cr-toss .cr-fl').length, counts: [...document.querySelectorAll('.cr-half .n')].map(x => x.textContent).join(), act: document.querySelectorAll('.cr-theme button').length }));
    C.check('under 13: counts only, no tap, no faces, no Post one', s.btn === 0 && s.faces === 0 && s.counts === '5,2' && s.act === 0, JSON.stringify(s));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { bell: bell({ weekly: WEEKLY({ q: null, a: null, b: null }) }) });
    await crewRoom(p);
    const s = await p.evaluate(() => ({ halves: document.querySelectorAll('.cr-half').length, theme: !!document.querySelector('.cr-toss .cr-theme'), q: !!document.querySelector('.cr-toss .q') }));
    C.check('a theme with no question: the card is only the theme row', s.halves === 0 && !s.q && s.theme, JSON.stringify(s));
    await ctx.close();
    const n = await open(browser, { bell: bell({ weekly: null }) });
    await crewRoom(n.p);
    C.check('no weekly question: no card', !(await n.p.$('.cr-toss')));
    await n.ctx.close();
  }

  // ── 6. the photo theme: Post one ───────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await crewRoom(p);
    await p.evaluate(() => document.querySelector('.cr-theme button').click()); await p.waitForTimeout(400);
    const s = await p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), prompt: (document.querySelector('#hist-overlay .cr-prompt') || {}).textContent, ph: (document.querySelector('#hist-overlay .cr-txt') || {}).placeholder, title: document.querySelector('#hist-overlay .readiness-title').textContent }));
    C.check('Post one opens the composer with "Show us: Your gym corner" as its prompt and its placeholder', s.on && s.prompt === 'Show us: Your gym corner' && s.ph === 'Show us: Your gym corner' && s.title === 'Share with the crew', JSON.stringify(s));
    await ctx.close();
  }

  // ── 7. the Mailbag ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await waitTab(p); await p.evaluate(() => goTo('notes')); await p.waitForTimeout(500);
    const row = await p.evaluate(() => { const r = document.getElementById('coach-ask'), panel = document.querySelector('#notes-container .coach-panel'); return r ? { l: r.querySelector('.hrow-l').textContent, q: r.querySelector('.hrow-q').textContent, below: panel.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING, h: r.getBoundingClientRect().height } : null; });
    C.check('the Coach tab has "Ask for the crew" under the WhatsApp panel: "Amir answers one question a week"', row && row.l === 'Ask for the crew' && row.q === 'Amir answers one question a week' && row.below && row.h >= 44, JSON.stringify(row));
    await p.evaluate(() => document.getElementById('coach-ask').click()); await p.waitForTimeout(400);
    const sh = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); return { k: m.querySelector('.readiness-eyebrow').textContent, t: m.querySelector('.readiness-title').textContent, ph: m.querySelector('textarea').placeholder, cnt: m.querySelector('.cr-cnt').textContent, ok: (m.querySelector('.ca-ok') || {}).textContent, note: m.querySelector('.cr-note').textContent, go: m.querySelector('.cr-go').textContent, dis: m.querySelector('.cr-go').disabled, max: m.querySelector('textarea').maxLength }; });
    C.check('the sheet: Mailbag, Ask Amir, the placeholder, 0 / 200, the checkbox, the note and a disabled Send', sh.k === 'Mailbag' && sh.t === 'Ask Amir' && sh.ph === 'What do you want to know about your training?' && sh.cnt === '0 / 200' && sh.ok === 'You can use my first name'
      && sh.note === 'Amir answers one question a week for the crew. He reads every one.' && sh.go === 'Send' && sh.dis && sh.max === 200, JSON.stringify(sh));
    await p.screenshot({ path: path.join(OUT, 'ask-sheet.png') });
    await p.evaluate(() => { const ta = document.querySelector('#hist-overlay textarea'); ta.value = 'How do I warm up for padel?'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#hist-overlay .ca-name').checked = true; });
    C.check('…typing counts the characters and wakes Send', await p.evaluate(() => document.querySelector('#hist-overlay .cr-cnt').textContent === '27 / 200' && !document.querySelector('#hist-overlay .cr-go').disabled));
    await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click()); await p.waitForTimeout(600);
    const a = await calls(p, 'crew_ask'), t = await toast(p);
    C.check('Send asks with the words and the first-name box, shows "Sent. Amir reads every one." and closes the sheet', a.length === 1 && a[0].p_body === 'How do I warm up for padel?' && a[0].p_ok_name === true && t && t.text === 'Sent. Amir reads every one.' && !(await overlay(p)), JSON.stringify([a, t]));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { stub: { askLog: [{}, {}, {}] } });
    await waitTab(p); await p.evaluate(() => { goTo('notes'); openCrewAsk(); }); await p.waitForTimeout(300);
    await p.evaluate(() => { const ta = document.querySelector('#hist-overlay textarea'); ta.value = 'One more?'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#hist-overlay .cr-go').click(); }); await p.waitForTimeout(500);
    C.check('a fourth in a day: "That\'s three today. Ask again tomorrow." and the words stay', await p.evaluate(() => document.querySelector('#hist-overlay .cr-err').textContent) === "That's three today. Ask again tomorrow." && await p.evaluate(() => document.querySelector('#hist-overlay textarea').value) === 'One more?');
    await ctx.close();
    const l = await open(browser, { stub: { askErr: 'crew:too_long' } });
    await waitTab(l.p); await l.p.evaluate(() => { openCrewAsk(); const ta = document.querySelector('#hist-overlay textarea'); ta.value = 'x'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#hist-overlay .cr-go').click(); }); await l.p.waitForTimeout(500);
    C.check('too long: "Keep it to 200 characters."', await l.p.evaluate(() => document.querySelector('#hist-overlay .cr-err').textContent) === 'Keep it to 200 characters.');
    await l.ctx.close();
    const off = await open(browser);
    await off.p.waitForTimeout(500); await off.p.evaluate(() => { window.__STUB.mode = 'offline'; openCrewAsk(); const ta = document.querySelector('#hist-overlay textarea'); ta.value = 'x'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#hist-overlay .cr-go').click(); }); await off.p.waitForTimeout(500);
    C.check('no signal: the question is kept and Send can be tapped again', /^No signal\. Your question is still here/.test(await off.p.evaluate(() => document.querySelector('#hist-overlay .cr-err').textContent)) && await off.p.evaluate(() => !document.querySelector('#hist-overlay .cr-go').disabled));
    await off.ctx.close();
  }
  {
    const k = await open(browser, { bell: bell({ me: { under13: true, can_post: false } }) });
    await waitTab(k.p); await k.p.evaluate(() => { goTo('notes'); openCrewAsk(); }); await k.p.waitForTimeout(300);
    const hasBox = await k.p.evaluate(() => !!document.querySelector('#hist-overlay .ca-name'));
    await k.p.evaluate(() => { const ta = document.querySelector('#hist-overlay textarea'); ta.value = 'Is this ok for me?'; ta.dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#hist-overlay .cr-go').click(); }); await k.p.waitForTimeout(500);
    const a = await calls(k.p, 'crew_ask');
    C.check('under 13 can ask privately: no name box, p_ok_name false', !hasBox && a.length === 1 && a[0].p_ok_name === false, JSON.stringify(a));
    await k.ctx.close();
    const n = await open(browser, { bell: bell({ me: { answer: null, can_post: false } }) });
    await waitTab(n.p); await n.p.evaluate(() => goTo('notes')); await n.p.waitForTimeout(400);
    C.check('someone who has not joined the crew can ask too (any athlete with a programme)', !!(await n.p.$('#coach-ask')));
    await n.ctx.close();
    const g = await open(browser, { bell: null, inbox: null });
    await g.p.waitForTimeout(800); await g.p.evaluate(() => goTo('notes')); await g.p.waitForTimeout(300);
    C.check('…even with no crew on the server at all', !!(await g.p.$('#coach-ask')));
    await g.ctx.close();
    const d = await open(browser, { opts: { query: '?client=demo' }, bell: null, inbox: null });
    await d.p.waitForTimeout(800); await d.p.evaluate(() => goTo('notes')); await d.p.waitForTimeout(300);
    C.check('…but not in the demo', !(await d.p.$('#coach-ask')));
    await d.ctx.close();
  }

  // ── 8. the answer on the Bell ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await crewRoom(p);
    const s = await p.evaluate(() => {
      const post = document.querySelector('#crew-body .cr-post.amir'), q = post.querySelector('.cr-askq'), c = getComputedStyle(q);
      return { has: !!q, e: q.querySelector('.e').innerText, p: q.querySelector('p').textContent, before: !!(q.compareDocumentPosition(post.querySelector('.cr-body')) & Node.DOCUMENT_POSITION_FOLLOWING), body: post.querySelector('.cr-body').textContent,
        bw: c.borderLeftWidth, bc: c.borderLeftColor, pin: !!post.querySelector('.cr-pin') };
    });
    C.check('Amir\'s answer wears the question above it: MINA ASKED, the question, then his words', s.has && s.e === 'MINA ASKED' && s.p === 'How often should I deload?' && s.before && s.body === 'Every fifth week, or sooner if your sleep is bad.', JSON.stringify(s));
    C.check('…the quote has a left rule in the app\'s own mint, and the post stays pinned', s.bw === '3px' && s.bc === 'rgb(109, 190, 149)' && s.pin, s.bw + ' ' + s.bc);
    await p.evaluate(() => document.querySelector('#crew-body .cr-post.amir').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, 'answer-post.png') });
    await ctx.close();
    const n = await open(browser, { bell: bell({ askBy: null }) });
    await crewRoom(n.p);
    C.check('a question asked without a name reads SOMEONE ASKED', await n.p.evaluate(() => document.querySelector('#crew-body .cr-post.amir .cr-askq .e').innerText) === 'SOMEONE ASKED');
    await n.ctx.close();
  }

  // ── 9. the Answer Book ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { stub: { answerBook: BOOK() } });
    await waitTab(p); await p.evaluate(() => goLibrary()); await p.waitForTimeout(900);
    await p.evaluate(() => setLibPane('playbook')); await p.waitForTimeout(1200);
    const d = await p.evaluate(() => { const a = document.getElementById('lib-asked'); return { vis: !a.hidden, t: a.innerText.replace(/\s+/g, ' ').trim() }; });
    C.check('the Library\'s Playbook has a door "Asked by the crew" with the count', d.vis && /Asked by the crew/i.test(d.t) && /2 answers/i.test(d.t), d.t);
    await p.evaluate(() => setLibPane('sessions')); await p.waitForTimeout(300);
    C.check('…and it is not shown over Sessions', await p.evaluate(() => document.getElementById('lib-asked').hidden));
    await p.evaluate(() => setLibPane('playbook')); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('lib-asked-go').click()); await p.waitForTimeout(700);
    const b = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .ab-i')].map(i => ({ q: i.querySelector('.ab-q').textContent, a: i.querySelector('.ab-a').textContent, m: (i.querySelector('.ab-m') || {}).textContent || '' })));
    C.check('it lists each question (bold), Amir\'s answer, "Asked by Mina" or nothing, and the date', b.length === 2 && b[0].q === 'How often should I deload?' && /^Asked by Mina · \d+ \w+$/.test(b[0].m) && b[1].m && !/Asked by/.test(b[1].m) && /No\. It is a sign/.test(b[1].a), JSON.stringify(b));
    C.check('…the question is bold', await p.evaluate(() => getComputedStyle(document.querySelector('#hist-overlay .ab-q')).fontWeight) === '700');
    await p.screenshot({ path: path.join(OUT, 'answer-book.png') });
    await p.evaluate(() => closeHistorySheet());
    await ctx.close();
    const e = await open(browser, { stub: { answerBook: [] } });
    await waitTab(e.p); await e.p.evaluate(() => { goLibrary(); setLibPane('playbook'); }); await e.p.waitForTimeout(1200);
    C.check('with no answers yet there is no door', await e.p.evaluate(() => document.getElementById('lib-asked').hidden && !document.getElementById('lib-asked-go')));
    await e.ctx.close();
  }

  // ── 10. the Reply line ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await crewRoom(p);
    const s = await p.evaluate(() => {
      const posts = [...document.querySelectorAll('#crew-body .cr-post')], lines = posts.map(x => x.querySelector('.cr-rep-line')), l = lines[0], c = getComputedStyle(l), r = l.getBoundingClientRect();
      const act = posts[0].querySelector('.cr-names') || posts[0].querySelector('.cr-foot');
      return { all: lines.every(Boolean), n: lines.length, txt: l.textContent, h: Math.round(r.height), w: Math.round(r.width), radius: c.borderTopLeftRadius, border: c.borderTopWidth, under: !!(act.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    C.check('every post has a slim "Reply…" line, 44 px tall, an input\'s look, under its action row', s.all && s.n === 3 && s.txt === 'Reply…' && s.h >= 44 && s.border === '1px' && parseFloat(s.radius) >= 20 && s.under, JSON.stringify(s));
    await p.evaluate(() => document.querySelector('#crew-body .cr-post[data-id="' + 'cccccccc-0000-4000-8000-000000000001' + '"] .cr-rep-line').click()); await p.waitForTimeout(500);
    const o = await p.evaluate(() => { const m = document.querySelector('#hist-overlay .readiness-modal'); return { on: document.getElementById('hist-overlay').classList.contains('visible'), half: m.classList.contains('cr-half'), h: m.getBoundingClientRect().height / innerHeight, focus: document.activeElement && document.activeElement.classList.contains('cr-rtxt'), title: m.querySelector('.readiness-title').textContent }; });
    C.check('a tap opens the existing reply sheet at half height with the keyboard on the box', o.on && o.half && o.h <= 0.6 && o.focus && o.title === 'To your post', JSON.stringify(o));
    await p.screenshot({ path: path.join(OUT, 'reply-half.png') });
    await p.evaluate(() => closeHistorySheet());
    await p.evaluate(() => openCrewAsk());
    C.check('…and the half height does not leak into the next sheet', await p.evaluate(() => !document.querySelector('#hist-overlay .readiness-modal').classList.contains('cr-half')));
    await p.evaluate(() => closeHistorySheet());
    await ctx.close();
    const n = await open(browser, { bell: bell({ me: { answer: null, can_post: false } }) });
    await crewRoom(n.p);
    C.check('someone who has not joined has no Reply… line (only the offer to join)', !(await n.p.$('#crew-body .cr-rep-line')) && !!(await n.p.$('#crew-body .cr-rep-add')));
    await n.ctx.close();
    const k = await open(browser, { bell: bell({ me: { under13: true, can_post: false } }) });
    await crewRoom(k.p);
    C.check('under 13 has neither', !(await k.p.$('#crew-body .cr-rep-add')));
    await k.ctx.close();
  }

  // ── 11. Hello, crew ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { b: { noOwnPost: true }, stub: { crewPages: { me: { who: 'Alex R.', first: 'Alex', game: { sports: ['padel'], hand: 'right', side: 'left' } } } } });
    await crewRoom(p);
    await p.evaluate(() => { crewPageRefresh('me'); }); await p.waitForTimeout(600);
    await p.evaluate(() => document.querySelector('#crew-body .cr-comp').click()); await p.waitForTimeout(500);
    const d = await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value);
    C.check('a member who has never posted opens the composer to a hello built from their page', d === "Hi crew, I'm Alex. I play padel. Training 2 days a week.", d);
    await p.evaluate(() => closeHistorySheet());
    await p.evaluate(() => document.querySelector('#crew-body .cr-comp').click()); await p.waitForTimeout(300);
    C.check('…it was offered once and kept like anything typed: the same words are there next time', await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value) === d);
    await p.evaluate(() => { const ta = document.querySelector('#hist-overlay .cr-txt'); ta.value = ''; ta.dispatchEvent(new Event('input', { bubbles: true })); closeHistorySheet(); });
    await p.evaluate(() => document.querySelector('#crew-body .cr-comp').click()); await p.waitForTimeout(300);
    C.check('…cleared, it stays cleared', await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value) === '');
    C.check('…and no second toast came with it', !(await toast(p)));
    await ctx.close();
    const m = await open(browser, { b: { noOwnPost: true } });
    await crewRoom(m.p);
    await m.p.evaluate(() => document.querySelector('#crew-body .cr-comp').click()); await m.p.waitForTimeout(400);
    C.check('only the parts the app knows: with no sport on the page, no sport line', await m.p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value) === "Hi crew, I'm Alex. Training 2 days a week.", await m.p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value));
    await m.ctx.close();
    const h = await open(browser);
    await crewRoom(h.p);
    await h.p.evaluate(() => document.querySelector('#crew-body .cr-comp').click()); await h.p.waitForTimeout(400);
    C.check('someone who has posted gets an empty box', await h.p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value) === '');
    await h.ctx.close();
    const t = await open(browser, { b: { noOwnPost: true } });
    await crewRoom(t.p);
    await t.p.evaluate(() => openCrewPost('session', '1')); await t.p.waitForTimeout(300);
    C.check('a finished session\'s composer is never the hello', !/Hi crew/.test(await t.p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value)));
    await t.ctx.close();
  }
  {
    // Say hello on a new face in the band and on a join line
    const { ctx, p } = await open(browser, { b: { joinLine: true } });
    await crewRoom(p);
    const s = await p.evaluate(() => ({ band: [...document.querySelectorAll('.cr-week .cr-sayhi')].map(b => b.textContent), txt: (document.querySelector('.cr-week .cr-hi') || {}).textContent, line: [...document.querySelectorAll('#crew-body .cr-line .cr-sayhi')].map(b => b.getAttribute('aria-label')), h: document.querySelector('.cr-week .cr-sayhi').getBoundingClientRect().height }));
    C.check('the band offers Say hello to the newest face (Leila) and a join line in the Bell has its own', s.band.join() === 'Say hello' && s.txt === 'Leila joined this week.' && s.line.join() === 'Say hello to Sara' && s.h >= 44, JSON.stringify(s));
    await p.evaluate(() => document.querySelector('.cr-week .cr-sayhi').click()); await p.waitForTimeout(400);
    C.check('…the band\'s opens the composer with "Welcome to the crew, Leila."', await p.evaluate(() => document.querySelector('#hist-overlay .cr-txt').value) === 'Welcome to the crew, Leila.');
    await ctx.close();
  }

  // ── 12. cleanliness ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { b: { joinLine: true }, stub: { answerBook: BOOK() } });
    await crewRoom(p);
    await openInboxFrom(p, 'crew');
    const src = fs.readFileSync(path.join(__dirname, '..', '..', 'program.html'), 'utf8');
    const block = src.slice(src.indexOf('// ══ HOME CROWD, STEPS 2 TO 4'), src.indexOf('A notification that lands on a screen (stage86)'));
    C.check('no yellow, gold or amber in the new code and no em-dash in what an athlete reads', !/yellow|gold|amber|ochre/i.test(block.replace(/--yellow/g, '')) && !/[—]/.test(block.replace(/\/\/.*$/gm, '')));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await p.setViewportSize({ width: 320, height: 800 }); await p.waitForTimeout(300);
    C.check('at 320 px the Inbox does not scroll sideways', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await ctx.close();
    const dk = await open(browser, { opts: { dark: true } });
    await crewRoom(dk.p);
    await openInboxFrom(dk.p, 'crew');
    const c = await dk.p.evaluate(() => getComputedStyle(document.querySelector('#inbox-body .ib-t')).color);
    C.check('dark mode: the Inbox text reads light', c === 'rgb(237, 237, 237)', c);
    C.check('…no page errors', !dk.p.errs.length, dk.p.errs.join(' | '));
    await dk.ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);

  function H_ID() { return H.ID; }
})();
