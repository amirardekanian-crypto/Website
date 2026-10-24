// Players' Lounge, the athlete app (2026-10-24): node scripts/headless/lounge.js [--out <dir for screenshots>]
//
// Step 0 and 1: the Player Page. A page for every person in the crew, opened from any name, face or row on Crew (a post, a reply, the week band,
// In the crew, the board on the tab and its page, the honours, the Open, a Bell line), from your initials → Your page and from Crew and the Bell;
// its ← goes back to where it was opened from; what a person switched off is not on it; a comeback is yours alone; the copy on the phone is drawn
// first and with no signal it is all there is; the join question shows your own page first; "Your page is here" once, for members who were already
// in; a server without stage96 keeps today's Crew exactly; under 13 gets no doors; 320 px and dark mode. Later steps of the Lounge add their checks
// to THIS file, in their own numbered section. Made-up people only. The stub answers crew_page by name (stub.js).
// Serve the repo first (python -m http.server 8792 --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const path = require('path');

const now = Date.now(), iso = ms => new Date(ms).toISOString(), today = iso(now).slice(0, 10);
const ck = n => 'a0000000-0000-4000-8000-0000000000' + String(n).padStart(2, '0');
const CK = { alex: ck(1), mina: ck(2), reza: ck(3), ali1: ck(4), ali2: ck(5), leila: ck(6), sara: ck(7), omid: ck(8) };
const AMIR = '11111111-2222-3333-4444-555555555555', P_MINA = 'bbbbbbbb-0000-4000-8000-000000000001', P_ALI = '66666666-7777-8888-9999-000000000000', P_OWN = 'cccccccc-0000-4000-8000-000000000001';

// The Bell as stage96 sends it: the top-level `lounge: 1` flag (the app's only test that the server has the Lounge), ck and fv on every person, lv/held/new
// on the crew list. `o.noPages` = a server without stage96 (none of those keys, no flag) · `o.noFlag` = the keys but no flag (the app must draw Crew as it was).
function bell(o = {}) {
  const me = Object.assign({ answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10,
    kinds: { level: true, week: true, mark: true, achievement: true, best: true, cycle: true, honour: true, open: true } }, o.me || {});
  if (!o.noPages) { me.ck = CK.alex; me.fv = null; }
  const P = (c, f) => o.noPages ? {} : { ck: c, fv: f === undefined ? null : f };
  const crew = [
    Object.assign({ who: 'Alex R.', me: true, since: '2026-10-19' }, P(CK.alex), o.noPages ? {} : { lv: 19, held: true }),
    Object.assign({ who: 'Mina S.', me: false, since: '2026-10-19' }, P(CK.mina), o.noPages ? {} : { lv: 14, held: true }),
    Object.assign({ who: 'Reza K.', me: false, since: '2026-10-19' }, P(CK.reza), o.noPages ? {} : { lv: 22 }),
    Object.assign({ who: 'Ali B.', me: false, since: '2026-10-19' }, P(CK.ali1), o.noPages ? {} : { lv: 7 }),
    Object.assign({ who: 'Ali B.', me: false, since: '2026-10-20' }, P(CK.ali2), o.noPages ? {} : { lv: 31 }),
    Object.assign({ who: 'Leila M.', me: false, since: '2026-10-22' }, P(CK.leila), o.noPages ? {} : { lv: 9, new: true }),
    Object.assign({ who: 'Sara T.', me: false, since: '2026-10-19' }, P(CK.sara), o.noPages ? {} : { lv: 12 }),
    Object.assign({ who: 'Omid P.', me: false, since: '2026-10-19' }, P(CK.omid), o.noPages ? {} : { lv: 5 }),
  ];
  return Object.assign(o.noPages || o.noFlag ? {} : { lounge: 1 }, {
    athlete_id: H.ID, at: iso(now), days: 7, kinds: ['level', 'week', 'mark', 'achievement', 'best', 'cycle', 'honour', 'open'], me,
    week: { members: 8, sessions: 14, held: 3 }, crew,
    honours: { month: '2026-09-01', rows: [Object.assign({ honour: 'sessions', who: 'Reza K.', me: false, value: { n: 14 } }, P(CK.reza)),
      Object.assign({ honour: 'improved', who: 'Leila M.', me: false, value: { lift: 'Back Squat', pct: 27.1 } }, P(CK.leila))] },
    open: { id: 'aaaaaaaa-0000-4000-8000-000000000084', title: 'Wall Sit', how: 'Back to the wall, knees at 90.', unit: 'seconds', better: 'high',
      board: [Object.assign({ who: 'Reza K.', value: 120, place: 1, me: false }, P(CK.reza)), Object.assign({ who: 'Alex R.', value: 95, place: 2, me: true }, P(CK.alex))],
      mine: { value: 95, day: today } },
    items: [
      { t: 'post', id: AMIR, who: 'Amir', me: false, amir: true, kind: 'post', body: '11 of you held your week. Keep it boring.', photo: false, at: iso(now - 3600e3), pinned: true, left: 7,
        kudos: { n: 0, mine: false, names: [] }, replies: [
          Object.assign({ id: 'r1', who: 'Mina S.', me: false, amir: false, body: 'Boring is the plan.', at: iso(now - 600e3) }, P(CK.mina)),
          { id: 'r2', who: 'Amir', me: false, amir: true, body: 'Good.', at: iso(now - 300e3) }] },
      Object.assign({ t: 'line', key: CK.mina + ':' + today, who: 'Mina S.', me: false, at: iso(now - 7200e3), kudos: { n: 0, mine: false, names: [] },
        parts: [{ k: 'level', n: 14 }, { k: 'week', run: 5 }] }, o.noPages ? {} : { fv: null }),
      Object.assign({ t: 'post', id: P_MINA, who: 'Mina S.', me: false, amir: false, kind: 'post', body: 'Legs are gone after Tuesday.', photo: false, at: iso(now - 9000e3), pinned: false, left: 7,
        kudos: { n: 5, mine: false, names: ['Sara T.'] }, replies: [] }, P(CK.mina)),
      Object.assign({ t: 'post', id: P_ALI, who: 'Ali B.', me: false, amir: false, kind: 'post', body: '6 am session done before school.', photo: true, w: 1280, h: 1600, at: iso(now - 10800e3), pinned: false, left: 7,
        kudos: { n: 3, mine: false, names: ['Mina S.'] }, replies: [] }, P(CK.ali1)),
      Object.assign({ t: 'post', id: P_OWN, who: 'Alex R.', me: true, amir: false, kind: 'post', body: 'Day 2 done.', photo: false, at: iso(now - 12000e3), pinned: false, left: 7,
        kudos: { n: 0, mine: false, names: [] }, replies: [] }, P(CK.alex)),
    ],
  });
}
const board = (noPages) => [
  Object.assign({ pos: 1, who: 'Reza K.', points: 6240, level: 22, is_me: false }, noPages ? {} : { ck: CK.reza, fv: null }),
  Object.assign({ pos: 2, who: 'Alex R.', points: 5910, level: 19, is_me: true }, noPages ? {} : { ck: CK.alex, fv: null }),
  Object.assign({ pos: 3, who: 'Mina S.', points: 5100, level: 14, is_me: false }, noPages ? {} : { ck: CK.mina, fv: null }),
];

async function open(browser, o = {}) {
  const b = o.bell === null ? null : (o.bell || bell(o.b || {}));
  return H.openProgram(browser, Object.assign({ w: 390, h: 844, stub: Object.assign({ crewBoard: board(o.b && o.b.noPages) }, b ? { bell: b } : {}, o.stub || {}), seed: o.seed || {} }, o.opts || {}));
}
const calls = (p, name) => p.evaluate(n => (window.__STUB.params || []).filter(x => x[0] === n).map(x => x[1]), name);
const waitTab = p => p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).then(() => true, () => false);
const goCrew = async p => { await waitTab(p); await p.evaluate(() => goTo('crew')); await p.waitForTimeout(700); };
const click = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel);
const screenNow = p => p.evaluate(() => (document.querySelector('.screen.active') || {}).id || '');
const text = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
// the words as written: innerText gives them in capitals where the app's CSS sets capitals (names, eyebrows)
const plain = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const litTab = p => p.evaluate(() => (document.querySelector('#global-tabs .nav-item.active') || {}).dataset.tab);
const tiles = p => p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-tiles > div')].map(d => d.innerText.replace(/\s+/g, ' ').trim()));
const secs = p => p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .prog-sec')].map(d => d.textContent.trim()));
const toast = p => p.evaluate(() => { const el = document.getElementById('aaToast'); return !el || el.hidden ? null : { text: (el.querySelector('.aa-toast-t') || {}).textContent, action: (el.querySelector('.aa-toast-go') || {}).textContent }; });
const shown = async (p, ckey) => { await p.evaluate(k => openPlayer(k), ckey); await p.waitForTimeout(500); };

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const out = H.outDir();

  // ── 1. the shared helpers: who an item is ─────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await goCrew(p);
    const s = await p.evaluate(ids => ({
      post: crewPersonOf(BELL.items.find(i => i.id === ids.mina)), reply: crewPersonOf(BELL.items[0].replies[0]), amirReply: crewPersonOf(BELL.items[0].replies[1]),
      amir: crewPersonOf(BELL.items.find(i => i.amir)), line: crewPersonOf(BELL.items.find(i => i.t === 'line')), own: crewPersonOf(BELL.items.find(i => i.id === ids.own)),
      member: crewPersonOf(BELL.crew[1]), board: crewPersonOf(CREW_BOARD[0]), boardMe: crewPersonOf(CREW_BOARD[1]), open: crewPersonOf(BELL.open.board[0]),
      nobody: crewPersonOf({ who: 'Zed Q.' }), face: crewFace({ who: 'Mina S.' }), faceAmir: crewFace({ amir: true }), faceBand: crewFace({ who: 'Mina S.', me: true }, 'band'),
      pagesOn: crewPagesOn(), doorOn: crewDoorOn(), canDoor: [crewCanDoor({ ck: 'a0000000-0000-4000-8000-000000000002' }), crewCanDoor({ who: 'Zed' }), crewCanDoor({ amir: true })],
      fns: ['openPlayer', 'crewPersonOf', 'crewFace', 'crewDoor', 'crewNameHTML', 'playerBack', 'renderPlayerPage'].map(n => typeof window[n]),
    }), { mina: P_MINA, own: P_OWN });
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    C.check('crewPersonOf: a post is its author\'s ck, fv, name', same(s.post, { ck: CK.mina, fv: null, who: 'Mina S.', me: false, amir: false }), JSON.stringify(s.post));
    C.check('…a reply the same; Amir\'s has no ck and is "Amir"', s.reply.ck === CK.mina && s.amirReply.amir && s.amirReply.ck === null && s.amirReply.who === 'Amir', JSON.stringify([s.reply, s.amirReply]));
    C.check('…Amir\'s post too', s.amir.amir && s.amir.ck === null && s.amir.fv === null, JSON.stringify(s.amir));
    C.check('…a Bell line\'s ck is read from its key', s.line.ck === CK.mina && s.line.who === 'Mina S.', JSON.stringify(s.line));
    C.check('…your own item is you, with your ck from get_bell', s.own.me && s.own.ck === CK.alex && s.own.who === 'Alex R.', JSON.stringify(s.own));
    C.check('…a member of the crew list carries lv and held', s.member.ck === CK.mina && s.member.lv === 14 && s.member.held === true, JSON.stringify(s.member));
    C.check('…a board row (is_me, not me), an Open row', s.board.ck === CK.reza && s.boardMe.me && s.boardMe.ck === CK.alex && s.open.ck === CK.reza, JSON.stringify([s.board, s.boardMe, s.open]));
    C.check('…a name with no key is a person with no ck, and no door', s.nobody.ck === null && s.canDoor.join() === 'true,false,true', s.canDoor.join());
    C.check('crewFace: initials in a .cr-ini, AA for Amir, a button on the band when it is a door', /cr-ini/.test(s.face) && />MS</.test(s.face) && />AA</.test(s.faceAmir) && /<i class="cr-face me"/.test(s.faceBand), s.face + ' ' + s.faceBand);
    C.check('the doors are on when get_bell carries stage96\'s flag (lounge: 1)', s.pagesOn && s.doorOn && s.fns.every(t => t === 'function'), s.fns.join());
    C.check('…no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. a name opens the page; ← goes back to where you came from ─────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { stub: { crewPages: { [CK.mina]: { art: 'iron', since: '2026-06-06' } } } });
    await goCrew(p);
    const doors = await p.evaluate(() => ({ pl: document.querySelectorAll('#crew-body .cr-pl').length, nb: document.querySelectorAll('#crew-body .cr-nb').length,
      band: document.querySelectorAll('#crew-body .cr-faces button.cr-face').length, go: !!document.querySelector('#crew-body .cr-faces .go'),
      boardBtn: document.querySelectorAll('#crew-board button.cr-br').length, openBtn: document.querySelectorAll('#crew-body button.cr-ob-r').length,
      bandIsDiv: document.querySelector('#crew-body .cr-faces').tagName }));
    C.check('stage96: posts, replies, lines, honours, the band\'s faces, the board and the Open rows are all doors', doors.pl >= 4 && doors.nb >= 4 && doors.band === 6 && doors.go && doors.boardBtn === 3 && doors.openBtn === 2, JSON.stringify(doors));
    C.check('…the band is a row of buttons, not a button full of them', doors.bandIsDiv === 'DIV');
    C.check('…every door has a name a screen reader can say (words, or an aria-label for a face)', await p.evaluate(() =>
      [...document.querySelectorAll('#crew-body .cr-bt')].every(b => ((b.getAttribute('aria-label') || '') + b.textContent).replace(/\s+/g, '').length > 1)));    await p.evaluate(() => window.scrollTo(0, 500));
    const y0 = await p.evaluate(() => Math.round(scrollY));
    C.check('(the Crew tab is long enough to scroll)', y0 > 100, String(y0));
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-pl').click(), P_MINA);
    await p.waitForTimeout(600);
    C.check('a post\'s name opens that person\'s page, and the Crew tab stays lit', (await screenNow(p)) === 'screen-crewplayer' && (await litTab(p)) === 'crew');
    const a = await calls(p, 'crew_page');
    C.check('…asked with the person\'s crew key (never a name)', a.length === 1 && a[0].p_subject === CK.mina, JSON.stringify(a));
    C.check('…the name, the level, the date', (await plain(p, '#crewplayer-body .pl-name')) === 'Mina S.' && (await plain(p, '#crewplayer-body .pl-lv')) === 'LV 14' && /With Amir since June 2026/.test(await plain(p, '#crewplayer-body .pl-meta')));
    C.check('…the cover is the current cycle\'s picture', await p.evaluate(() => { const i = document.getElementById('pl-cover-img'); return !i.hidden && /assets\/art\/cycles\/iron-v1\.webp/.test(i.getAttribute('src')); }));
    C.check('…and a visible ← back', await p.evaluate(() => { const b = document.querySelector('#screen-crewplayer .nav-back'); const r = b.getBoundingClientRect(); return r.width > 30 && r.height > 30 && getComputedStyle(b).visibility !== 'hidden'; }));
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click());
    await p.waitForTimeout(400);
    const y1 = await p.evaluate(() => Math.round(scrollY));
    C.check('← lands back on Crew, where it was scrolled', (await screenNow(p)) === 'screen-crew' && Math.abs(y1 - y0) <= 4, y0 + ' → ' + y1);
    C.check('…and nothing of the page is left as a way back', await p.evaluate(() => _playerFrom === null && _playerTrail.length === 0));
    // the phone's own Back does the same
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-pl').click(), P_MINA);
    await p.waitForTimeout(500);
    await p.goBack(); await p.waitForTimeout(400);
    C.check('the phone\'s Back closes the page too, and stays on Crew', (await screenNow(p)) === 'screen-crew');
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. every door, and where its ← goes ───────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await goCrew(p);
    const doors = [
      ['a post\'s face and name', '[data-id="' + P_ALI + '"] .cr-pl', CK.ali1],
      ['a reply\'s face', '.cr-rep .cr-rf', CK.mina],
      ['a reply\'s name', '.cr-rep .cr-nb', CK.mina],
      ['a Bell line\'s name', '.cr-line .cr-nb', CK.mina],
      ['a face on the week band', '.cr-faces button.cr-face:nth-child(3)', CK.reza],
      ['an honours name', '.cr-hon b .cr-nb', CK.reza],
      ['an Open board row', 'button.cr-ob-r:not(.me)', CK.reza],
      ['a row of the season board on the tab', '#crew-board button.cr-br:not(.me)', CK.reza],
    ];
    for (const [what, sel, want] of doors) {
      await click(p, sel); await p.waitForTimeout(350);
      const got = await p.evaluate(() => ({ ck: _playerCk, scr: (document.querySelector('.screen.active') || {}).id }));
      C.check('Crew: ' + what + ' opens that person\'s page', got.scr === 'screen-crewplayer' && got.ck === want, JSON.stringify(got));
      await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
      if ((await screenNow(p)) !== 'screen-crew') C.check('…← back to Crew from ' + what, false, await screenNow(p));
    }
    C.check('…each ← went back to Crew', (await screenNow(p)) === 'screen-crew');
    // you: your own name opens your own page, with no subject
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-pl').click(), P_OWN); await p.waitForTimeout(500);
    const mine = await calls(p, 'crew_page');
    C.check('your own post opens YOUR page: crew_page with no subject', mine.length > 0 && mine[mine.length - 1].p_subject === undefined && (await p.evaluate(() => _playerCk)) === 'me', JSON.stringify(mine.slice(-1)));
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    // Amir
    await p.evaluate(() => document.querySelector('.cr-post.amir .cr-pl').click()); await p.waitForTimeout(350);
    C.check('Amir\'s name opens the Coach tab, not a page', (await screenNow(p)) === 'screen-notes' && (await litTab(p)) === 'notes');
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(400);
    await p.evaluate(() => [...document.querySelectorAll('.cr-rep')].find(r => /Good/.test(r.textContent)).querySelector('.cr-rf').click()); await p.waitForTimeout(350);
    C.check('…and so does his reply', (await screenNow(p)) === 'screen-notes');
    // In the crew, and the board's page: their rows are doors, and their ← comes back to THEM
    await p.evaluate(() => goTo('crewwho')); await p.waitForTimeout(400);
    const who = await p.evaluate(() => ({ btn: document.querySelectorAll('#crewwho-body button.cr-br').length, rows: document.querySelectorAll('#crewwho-body .cr-br').length }));
    C.check('In the crew: every row is a door', who.btn === 8 && who.rows === 8, JSON.stringify(who));
    await p.evaluate(() => document.querySelectorAll('#crewwho-body button.cr-br')[2].click()); await p.waitForTimeout(400);
    const w = await p.evaluate(() => ({ ck: _playerCk, from: _playerFrom }));
    C.check('…a row opens that page (the third is Reza)', w.ck === CK.reza && w.from === 'crewwho', JSON.stringify(w));
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    C.check('…and ← comes back to In the crew, not to Crew', (await screenNow(p)) === 'screen-crewwho' && (await litTab(p)) === 'crew');
    await p.evaluate(() => goTo('crewboard')); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('#crewboard-body button.cr-br:not(.me)').click()); await p.waitForTimeout(400);
    C.check('the whole board: a row opens the page', (await p.evaluate(() => _playerCk)) === CK.reza);
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    C.check('…and ← comes back to the board page', (await screenNow(p)) === 'screen-crewboard');
    await p.evaluate(() => document.querySelector('#crewboard-body button.cr-br.me').click()); await p.waitForTimeout(400);
    C.check('your row on the board opens your own page', (await p.evaluate(() => _playerCk)) === 'me');
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    // page to page: a page opened from a page goes back to that page, then to where the first was opened
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(300);
    await shown(p, CK.mina); await shown(p, CK.reza);
    C.check('a page opened from a page shows that person', (await plain(p, '#crewplayer-body .pl-name')) === 'Reza K.');
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    C.check('…← shows the page before it', (await screenNow(p)) === 'screen-crewplayer' && (await plain(p, '#crewplayer-body .pl-name')) === 'Mina S.');
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    C.check('…and the next ← is where the first was opened from', (await screenNow(p)) === 'screen-crew');
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 4. what is on a page, and what is left off it ─────────────────────────────────────────────────────────────────────────
  {
    const ach = [['Back to Back', '2026-10-12'], ['The Notebook', '2026-10-03'], ['First Blood', '2026-09-28'], ['Straight Talk', '2026-09-20']].map(([name, day]) => ({ id: 'achievement:' + name, name, day, size: 'win', signed: [], signed_n: 0 }));
    const { ctx, p } = await open(browser, { stub: { crewPages: {
      [CK.mina]: { numbers: { weeks: { now: 6, best: 8 }, sessions: 41, bests: 9, comebacks: 3 }, cheers: { season: 12, recent: [], mine_today: false }, achievements: ach,
        honours: [{ month: '2026-09-01', honour: 'sessions', value: { n: 14 } }] },
      [CK.reza]: { numbers: { weeks: { now: 1, best: 1 } }, cheers: { season: 0, recent: [] }, achievements: null, honours: [] },
      [CK.sara]: { numbers: { sessions: 3, bests: 1 }, cheers: { season: 2, recent: [] }, achievements: [], honours: [] },
    } } });
    await goCrew(p);
    await shown(p, CK.mina);
    const t = await tiles(p);
    C.check('others\' numbers: weeks held, sessions with Amir, personal bests, cheers this season', JSON.stringify(t) === JSON.stringify(['6 weeks held', '41 sessions with Amir', '9 personal bests', '12 cheers this season']), JSON.stringify(t));
    C.check('…titled with the first name, never a he or a she', (await secs(p))[0] === 'Mina\'s numbers', JSON.stringify(await secs(p)));
    C.check('NO comebacks on someone else\'s page, even if the server were to send them', !/comeback/i.test(await text(p, '#crewplayer-body')), t.join('|'));
    const a = await p.evaluate(() => ({ rows: [...document.querySelectorAll('#crewplayer-body .pl-list')][0].querySelectorAll('.pl-row').length,
      all: (document.querySelector('#crewplayer-body .pl-list button.pl-row') || {}).textContent || '' }));
    C.check('achievements: the latest three, and "All 4" for the rest', a.rows === 4 && /All 4/.test(a.all), JSON.stringify(a));
    await click(p, '#crewplayer-body .pl-list button.pl-row'); await p.waitForTimeout(350);
    const sheet = await p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent,
      rows: [...document.querySelectorAll('#hist-overlay .pl-row .t')].map(x => x.textContent).join('|') }));
    C.check('…All 4 opens a sheet with every one, named for the person', sheet.on && sheet.title === 'Mina\'s achievements' && sheet.rows === 'Back to Back|The Notebook|First Blood|Straight Talk', JSON.stringify(sheet));
    await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(200);
    C.check('honours: shown when there are any, with the month', (await secs(p)).includes('Honours') && /Most sessions/.test(await text(p, '#crewplayer-body')) && /September 2026/.test(await text(p, '#crewplayer-body')));
    C.check('…and the block names what the crew may see: no weight, no kg', !/\bkg\b/i.test(await text(p, '#crewplayer-body')));
    // a switch off hides its block: Reza has only the weeks tile and cheers, no achievements, no honours
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await shown(p, CK.reza);
    const t2 = await tiles(p), s2 = await secs(p);
    C.check('a switch off: no sessions tile, no bests tile', JSON.stringify(t2) === JSON.stringify(['1 week held', '0 cheers this season']), JSON.stringify(t2));
    C.check('…no Achievements block (null), no Honours block (none)', s2.join() === 'Reza\'s numbers', s2.join());
    const w = await p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-tiles > div')].map(d => Math.round(d.getBoundingClientRect().width)));
    C.check('…two tiles are a tidy pair', w.length === 2 && Math.abs(w[0] - w[1]) <= 1, w.join());
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await shown(p, CK.sara);
    const t3 = await tiles(p);
    const w3 = await p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-tiles > div')].map(d => Math.round(d.getBoundingClientRect().width)));
    C.check('three tiles: the third takes the whole row', t3.length === 3 && w3[2] > w3[0] * 1.9, w3.join() + ' ' + t3.join('|'));
    C.check('…an empty list of achievements draws no block', !(await secs(p)).includes('Achievements'));
    // this week: the person's posts still on the Bell, a row each, and a tap goes to the post
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await shown(p, CK.mina);
    const wk = await p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-wk')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    C.check('this week: Mina\'s one post, with its age and likes, and Amir\'s post is nobody\'s', wk.length === 1 && /Legs are gone after Tuesday/.test(wk[0]) && /5 likes/.test(wk[0]), JSON.stringify(wk));
    await click(p, '#crewplayer-body .pl-wk'); await p.waitForTimeout(500);
    const hit = await p.evaluate(id => { const e = document.querySelector('.cr-post[data-id="' + id + '"]'); const r = e && e.getBoundingClientRect(); return { screen: (document.querySelector('.screen.active') || {}).id, inView: !!r && r.top >= 0 && r.bottom <= innerHeight }; }, P_MINA);
    C.check('…a row scrolls Crew to that post', hit.screen === 'screen-crew' && hit.inView, JSON.stringify(hit));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 5. your own page ──────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { stub: { crewPages: { me: { who: 'Alex R.' } } } });
    await goCrew(p);
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    C.check('your initials: a "Your page" row, before Crew and the Bell', await p.evaluate(() => { const r = [...document.querySelectorAll('#hist-overlay .acct-list .hrow .hrow-v')].map(x => x.textContent.trim()); return r.indexOf('Your page') >= 0 && r.indexOf('Your page') < r.indexOf('Crew and the Bell'); }));
    await click(p, '#acct-page'); await p.waitForTimeout(600);
    C.check('…it opens your own page (the sheet closes)', (await screenNow(p)) === 'screen-crewplayer' && !(await p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))) && (await p.evaluate(() => _playerCk)) === 'me');
    const t = await tiles(p);
    C.check('your numbers: weeks, sessions, bests and COMEBACKS', JSON.stringify(t) === JSON.stringify(['6 weeks held', '41 sessions with Amir', '9 personal bests', '2 comebacks ONLY YOU']), JSON.stringify(t));
    C.check('…titled Your numbers', (await secs(p))[0] === 'Your numbers');
    C.check('…and says it is what the crew sees, with a door to what the crew sees of you', /This is what the crew sees/.test(await text(p, '#crewplayer-body')) && /What the crew sees of you/.test(await text(p, '#crewplayer-body .pl-door')));
    C.check('…your own posts are This week', (await p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-wk')].map(r => r.textContent).join('|'))).includes('Day 2 done.'));
    await click(p, '#crewplayer-body .pl-door'); await p.waitForTimeout(350);
    C.check('…the door opens Crew and the Bell', await p.evaluate(() => /Crew and the Bell/.test((document.querySelector('#hist-overlay .readiness-title') || {}).textContent || '')));
    C.check('…whose own "Your page" row opens your page again', !!(await p.$('#cs-page')));
    await p.evaluate(() => closeHistorySheet()); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    C.check('← from your page lands on the screen you opened the sheet on', (await screenNow(p)) === 'screen-crew');
    // from Home
    await p.evaluate(() => goTo('home')); await p.waitForTimeout(300);
    await p.evaluate(() => openAccount()); await click(p, '#acct-page'); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(300);
    C.check('…and from Home, back to Home', (await screenNow(p)) === 'screen-home');
    await p.evaluate(() => { goTo('crew'); openCrewSettings(); }); await p.waitForTimeout(300);
    await click(p, '#cs-page'); await p.waitForTimeout(500);
    C.check('Crew and the Bell has the same row, and it opens your page', (await p.evaluate(() => _playerCk)) === 'me' && (await screenNow(p)) === 'screen-crewplayer');
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // not in the crew: your page is still there, and says so
    const { ctx, p } = await open(browser, { b: { me: { answer: null, can_post: false } }, stub: { crewPages: { me: { member: false } } } });
    await waitTab(p); await p.waitForTimeout(500);
    await p.evaluate(() => openPlayer('me')); await p.waitForTimeout(600);
    C.check('not in the crew: your own page opens, and offers to join', (await screenNow(p)) === 'screen-crewplayer' && /Join the crew and this is what they see/.test(await text(p, '#crewplayer-body')) && !!(await p.$('#crewplayer-body .pl-join')));
    await click(p, '#crewplayer-body .pl-join'); await p.waitForTimeout(700);
    C.check('…the button joins (crew_answer yes) and asks for the page again', (await calls(p, 'crew_answer')).some(x => x.p_answer === 'yes') && (await calls(p, 'crew_page')).length >= 2);
    await ctx.close();
  }

  // ── 6. no signal, and a server that does not know the page ──────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { stub: { crewPages: { [CK.mina]: { numbers: { weeks: { now: 4, best: 4 }, sessions: 20, bests: 2 } } } } });
    await goCrew(p);
    await shown(p, CK.mina);
    const kept = await p.evaluate(id => Object.keys(JSON.parse(localStorage.getItem(id + '_crewpages') || '{}')), H.ID);
    C.check('the page is kept on the phone under <id>_crewpages', kept.join() === CK.mina, kept.join());
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await p.evaluate(() => { window.__STUB.mode = 'offline'; });
    await shown(p, CK.mina);
    C.check('no signal: the copy on the phone is drawn, under a quiet "No signal" line', (await tiles(p)).join('|') === '4 weeks held|20 sessions with Amir|2 personal bests|12 cheers this season' && /No signal/.test(await text(p, '#crewplayer-body .pl-quiet') || ''), JSON.stringify(await tiles(p)));
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await shown(p, CK.reza);
    C.check('no signal and never opened: it says so, and shows the name it knows', /No signal/.test(await text(p, '#crewplayer-body .pl-quiet') || '') && (await plain(p, '#crewplayer-body .pl-name')) === 'Reza K.');
    await p.evaluate(() => { window.__STUB.mode = 'online'; document.querySelector('#screen-crewplayer .nav-back').click(); });
    await p.waitForTimeout(250);
    // a call that never answers: 10 seconds, then the copy stays
    await p.evaluate(() => { window.__STUB.stall = { crew_page: true }; });
    await shown(p, CK.mina);
    C.check('a stalled call does not blank the page: the copy stays on screen', (await tiles(p)).length === 4);
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // a server with get_bell's keys but no crew_page: the doors go and Crew is as it was
    const { ctx, p } = await open(browser, { stub: { pageMissing: true } });
    await goCrew(p);
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-pl').click(), P_MINA);
    await p.waitForTimeout(700);
    const t = await toast(p);
    C.check('crew_page not on the server: "not ready yet", and ← back to Crew', !!t && /not ready yet/.test(t.text) && (await screenNow(p)) === 'screen-crew', JSON.stringify(t));
    C.check('…and from then on no name is a door', await p.evaluate(() => !document.querySelector('#crew-body .cr-pl, #crew-body .cr-nb, #crew-body button.cr-br') && document.querySelector('#crew-body .cr-faces').tagName === 'BUTTON'));
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    C.check('…nor is there a Your page row', !(await p.$('#acct-page')));
    await ctx.close();
  }
  {
    // a server without stage96: get_bell has no ck, and Crew is exactly what it was
    const { ctx, p } = await open(browser, { b: { noPages: true } });
    await goCrew(p);
    const s = await p.evaluate(() => ({ pagesOn: crewPagesOn(), doors: document.querySelectorAll('#crew-body .cr-bt').length, band: document.querySelector('#crew-body .cr-faces').tagName,
      screens: !!document.getElementById('screen-crewplayer'), tapName: (() => { openPlayer('aaaaaaaa-0000-4000-8000-000000000000'); return (document.querySelector('.screen.active') || {}).id; })() }));
    C.check('without stage96: no door anywhere, the band is the one button it was, and a tap on a key does nothing', !s.pagesOn && s.doors === 0 && s.band === 'BUTTON' && s.tapName === 'screen-crew', JSON.stringify(s));
    C.check('…crew_page is never asked', (await calls(p, 'crew_page')).length === 0);
    await p.evaluate(() => openAccount()); await p.waitForTimeout(250);
    C.check('…no Your page row in the account, and none in Crew and the Bell', !(await p.$('#acct-page')) && await p.evaluate(() => { closeHistorySheet(); openCrewSettings(); return !document.getElementById('cs-page'); }));
    await p.evaluate(() => { closeHistorySheet(); goTo('crewwho'); }); await p.waitForTimeout(300);
    C.check('…In the crew still reads each level from the board by name', /LV 19/.test(await text(p, '#crewwho-body')));
    const g = await p.evaluate(() => buildAppGuideCards());
    C.check('…and the guide names no page', !/Your page/.test(g) && !/<!--pages-->/.test(g));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // the level comes with the person: two Ali B.s are two levels
    const { ctx, p } = await open(browser);
    await goCrew(p);
    await p.evaluate(() => goTo('crewwho')); await p.waitForTimeout(350);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#crewwho-body .cr-br')].map(r => r.innerText.replace(/\s+/g, ' ').trim()));
    C.check('In the crew: each person\'s own level, so two Ali B.s are LV 7 and LV 31', rows.filter(r => /Ali B\./.test(r)).map(r => /LV (\d+)/.exec(r)[1]).join() === '7,31', rows.join(' | '));
    C.check('…your row is You, with your level', /^ARYou LV 19/.test(rows[0]) || /You LV 19/.test(rows[0]), rows[0]);
    await ctx.close();
  }

  // ── 7. what an error says ───────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { stub: { crewPages: {} } });
    await goCrew(p);
    await p.evaluate(() => { window.__STUB.pageErr = 'crew:gone'; });
    await shown(p, CK.mina);
    const t = await toast(p);
    C.check('crew:gone → "Mina is not in the crew any more." and back where it was', !!t && t.text === 'Mina is not in the crew any more.' && (await screenNow(p)) === 'screen-crew', JSON.stringify(t));
    C.check('…and no copy of that page is kept', await p.evaluate(id => !(JSON.parse(localStorage.getItem(id + '_crewpages') || '{}'))['a0000000-0000-4000-8000-000000000002'], H.ID));
    await p.evaluate(() => { window.__STUB.pageErr = 'crew:not_yes'; document.getElementById('aaToast').hidden = true; });
    await shown(p, CK.reza);
    const t2 = await toast(p);
    C.check('crew:not_yes → the join offer, and back', !!t2 && /Join the crew to see their page/.test(t2.text) && t2.action === 'Join the crew' && (await screenNow(p)) === 'screen-crew', JSON.stringify(t2));
    await ctx.close();
  }
  {
    // not in the crew: a tap on a name is the same offer, with no call to the server
    const { ctx, p } = await open(browser, { b: { me: { answer: null, can_post: false } } });
    await goCrew(p);
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-pl').click(), P_MINA); await p.waitForTimeout(400);
    const t = await toast(p);
    C.check('not in the crew: a name offers the crew, not a dead tap', !!t && /Join the crew to see their page/.test(t.text) && (await screenNow(p)) === 'screen-crew' && (await calls(p, 'crew_page')).filter(x => x.p_subject).length === 0, JSON.stringify(t));
    await ctx.close();
  }
  {
    // an athlete Amir ticked under 13 reads only: no door on a name
    const { ctx, p } = await open(browser, { b: { me: { answer: 'yes', under13: true, can_post: false } } });
    await goCrew(p);
    const s = await p.evaluate(() => { openPlayer('a0000000-0000-4000-8000-000000000002'); return { doors: document.querySelectorAll('#crew-body .cr-bt').length, band: document.querySelector('#crew-body .cr-faces').tagName, scr: (document.querySelector('.screen.active') || {}).id }; });
    C.check('under 13: no door on any name, and openPlayer does nothing', s.doors === 0 && s.band === 'BUTTON' && s.scr === 'screen-crew' && (await calls(p, 'crew_page')).length === 0, JSON.stringify(s));
    await ctx.close();
  }

  // ── 8. the join question shows your page first (62), and "Your page is here" once ───────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { b: { me: { answer: null, can_post: false } }, stub: { crewPages: { me: { numbers: { weeks: { now: 6, best: 8 }, sessions: 26, bests: 9 },
      achievements: [{ id: 'a:1', name: 'One' }, { id: 'a:2', name: 'Two' }, { id: 'a:3', name: 'Three' }, { id: 'a:4', name: 'Four' }] } } } });
    await goCrew(p);
    await p.waitForTimeout(500);
    const q = await p.evaluate(() => ({ mini: (document.getElementById('crew-ask-mini') || {}).innerText || '', note: [...document.querySelectorAll('#crew-ask p.sm')].map(x => x.textContent), btns: [...document.querySelectorAll('#crew-ask .cr-ask-btns button')].map(b => b.textContent.trim()).join('|') }));
    C.check('the join question: your face, your name and "26 sessions with Amir · 4 achievements"', /Alex R\./.test(q.mini) && /26 sessions with Amir · 4 achievements/.test(q.mini), JSON.stringify(q.mini));
    C.check('…the line that says what the crew sees, and the buttons as they were', q.note.includes('This is what the crew sees. Never a weight, never your check-in.') && q.btns === 'Join the crew|Keep it to me', JSON.stringify(q));
    const a = await calls(p, 'crew_page');
    C.check('…from crew_page with no subject', a.length >= 1 && a.every(x => x.p_subject === undefined));
    C.check('…and no "Your page is here" card for someone who has not joined', !(await p.$('#crew-intro')));
    await ctx.close();
  }
  {
    // the first time a member who was already in opens Crew after pages exist: once
    const { ctx, p } = await open(browser);
    await waitTab(p); await p.evaluate(() => goTo('crew')); await p.waitForTimeout(600);
    const c = await p.evaluate(() => ({ t: (document.getElementById('crew-intro') || {}).textContent || '', first: document.querySelector('#crew-body').firstElementChild.id, btns: [...document.querySelectorAll('#crew-intro button')].map(b => b.textContent.trim()).join('|') }));
    C.check('the first visit: "Your page is here. This is what the crew sees." with two buttons', /Your page is here/.test(c.t) && /This is what the crew sees/.test(c.t) && c.btns === 'See your page|What the crew sees of you' && c.first === 'crew-intro', JSON.stringify(c));
    C.check('…the key is set the moment it is shown', await p.evaluate(id => localStorage.getItem(id + '_pageintro') === '1', H.ID));
    await p.evaluate(() => { goTo('home'); goTo('crew'); }); await p.waitForTimeout(500);
    C.check('…and the next visit it is gone', !(await p.$('#crew-intro')));
    await p.evaluate(() => { localStorage.removeItem(ATHLETE_ID + '_pageintro'); goTo('home'); goTo('crew'); }); await p.waitForTimeout(400);
    await click(p, '#crew-intro .cr-go'); await p.waitForTimeout(500);
    C.check('See your page opens it', (await p.evaluate(() => _playerCk)) === 'me' && (await screenNow(p)) === 'screen-crewplayer');
    await p.evaluate(() => { document.querySelector('#screen-crewplayer .nav-back').click(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { localStorage.removeItem(ATHLETE_ID + '_pageintro'); goTo('home'); goTo('crew'); }); await p.waitForTimeout(400);
    await click(p, '#crew-intro .cr-no'); await p.waitForTimeout(300);
    C.check('What the crew sees of you opens the switches', await p.evaluate(() => /Crew and the Bell/.test((document.querySelector('#hist-overlay .readiness-title') || {}).textContent || '')));
    C.check('…and the key is the athlete\'s own (it syncs, so a second phone does not say it again)', await p.evaluate(() => Object.keys(_snapshot()).some(k => /_pageintro$/.test(k))));
    await ctx.close();
  }
  {
    // someone who joins now is not told their page is here; under 13 and no stage96 never see it
    const { ctx, p } = await open(browser, { b: { me: { answer: null, can_post: false } } });
    await goCrew(p);
    await p.evaluate(() => crewAnswer('yes')); await p.waitForTimeout(600);
    C.check('joining now sets the key and shows no card', await p.evaluate(id => localStorage.getItem(id + '_pageintro') === '1', H.ID) && !(await p.$('#crew-intro')));
    await ctx.close();
    for (const [what, o] of [['under 13', { b: { me: { answer: 'yes', under13: true, can_post: false } } }], ['a server without stage96', { b: { noPages: true } }]]) {
      const r = await open(browser, o);
      await goCrew(r.p);
      C.check(what + ': no "Your page is here"', !(await r.p.$('#crew-intro')));
      await r.ctx.close();
    }
  }

  // ── 9. the copy on the phone belongs to the phone ────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await goCrew(p);
    // 35 pages already on the phone, the oldest first: a new one keeps the newest 30 and yours
    const seed = {}; for (let i = 0; i < 35; i++) seed['x' + String(i).padStart(2, '0') + '000000-0000-4000-8000-000000000000'] = { at: 1000 + i, p: { ck: 'x', who: 'P' + i, numbers: {} } };
    seed.me = { at: 1, p: { me: true, who: 'Alex R.', numbers: {} } };
    await p.evaluate(([id, s]) => { localStorage.setItem(id + '_crewpages', JSON.stringify(s)); _crewPagesMem = null; }, [H.ID, seed]);
    await shown(p, CK.mina);
    const k = await p.evaluate(id => Object.keys(JSON.parse(localStorage.getItem(id + '_crewpages'))), H.ID);
    C.check('at most 30 people are kept, the newest, and your own page stays', k.length === 30 && k.includes('me') && k.includes(CK.mina) && !k.includes('x00000000-0000-4000-8000-000000000000') && k.includes('x34000000-0000-4000-8000-000000000000'), k.length + ' ' + k.slice(0, 3).join());
    // never in a progress push, never pulled
    await p.evaluate(() => _pushSnapshot(true)); await p.waitForTimeout(300);
    const snap = await p.evaluate(() => Object.keys(_snapshot()).filter(k => /crewpages/.test(k)));
    const pushes = await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'save_progress').map(x => Object.keys((x[1] && x[1].p_data) || {})).flat().filter(k => /crewpages/.test(k)));
    C.check('the pages never sync: not in the snapshot, not in a progress push', snap.length === 0 && pushes.length === 0, JSON.stringify([snap, pushes]));
    await ctx.close();
  }
  {
    const mine = { me: { at: 5, p: { me: true, who: 'Alex R.', numbers: {} } } };
    const { ctx, p } = await open(browser, { seed: { _crewpages: mine }, stub: { progress: { [H.ID + '_crewpages']: JSON.stringify({ zzzz: { at: 9, p: { who: 'Someone Else' } } }), [H.ID + '_snapAt']: new Date(Date.now() + 3600e3).toISOString() } } });
    await p.waitForTimeout(2500);
    C.check('a cloud copy of the pages is not pulled over the phone\'s own', (await p.evaluate(id => localStorage.getItem(id + '_crewpages'), H.ID)) === JSON.stringify(mine));
    await ctx.close();
  }
  {
    // a person who leaves the crew takes their page off the phone at the next refresh; leaving yourself takes them all
    const { ctx, p } = await open(browser);
    await goCrew(p);
    await shown(p, CK.mina);
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await p.evaluate(ckk => { window.__STUB.bell.crew = window.__STUB.bell.crew.filter(c => c.ck !== ckk); _bellAt = 0; return refreshBell(); }, CK.mina);
    await p.waitForTimeout(600);
    C.check('someone leaves the crew: their page leaves this phone', await p.evaluate(([id, k]) => !(k in JSON.parse(localStorage.getItem(id + '_crewpages') || '{}')), [H.ID, CK.mina]));
    await shown(p, CK.reza);
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await p.evaluate(() => crewAnswer('no')); await p.waitForTimeout(500);
    C.check('you leave the crew: no page of anyone is left on the phone', await p.evaluate(id => localStorage.getItem(id + '_crewpages') === null, H.ID));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 10. the guide names the controls ─────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser);
    await goCrew(p);
    const g = await p.evaluate(() => buildAppGuideCards());
    C.check('the guide: Your page under your initials, names and faces that open pages, and the join question', /<strong>Your page<\/strong> is under your initials/.test(g) && /Tap a name, a face or a row/.test(g) && /your own page is shown first/.test(g));
    C.check('…in plain words: no em-dash, no semicolon in what was added', !/[—;]/.test((g.match(/<p>Tap a name[\s\S]*?<\/p>/) || [''])[0]));
    await ctx.close();
  }

  // ── 11. 320 px, dark mode, long names, and a look ──────────────────────────────────────────────────────────────────────────
  {
    const long = 'Alexandra Papadopoulou-Richardson';
    const { ctx, p } = await open(browser, { opts: { w: 320, h: 640, dark: true }, stub: { crewPages: { [CK.mina]: { who: long, first: 'Alexandra', numbers: { weeks: { now: 12, best: 12 }, sessions: 1234, bests: 88 }, cheers: { season: 240, recent: [] },
      achievements: [{ id: 'a:1', name: 'An achievement with a rather long name to wrap', day: '2026-10-12' }], honours: [{ month: '2026-09-01', honour: 'improved', value: { lift: 'Barbell Back Squat', pct: 27.1 } }] } } } });
    await goCrew(p);
    await shown(p, CK.mina);
    const n = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: innerWidth, name: Math.round(document.querySelector('.pl-name').getBoundingClientRect().right),
      tiles: [...document.querySelectorAll('.pl-tiles > div')].every(d => d.getBoundingClientRect().right <= innerWidth), dark: document.body.hasAttribute('data-dark'),
      tileBg: getComputedStyle(document.querySelector('.pl-tiles > div')).backgroundColor, faceBg: getComputedStyle(document.querySelector('.pl-face')).backgroundColor,
      ink: getComputedStyle(document.querySelector('.pl-name')).color, paper: getComputedStyle(document.body).backgroundColor }));
    C.check('320 px, dark: nothing scrolls sideways, the long name and the tiles stay inside', n.sw <= n.w && n.name <= n.w && n.tiles, JSON.stringify(n));
    C.check('…dark: the paper, the tiles and the ink are the dark ones', n.dark && n.tileBg !== 'rgb(255, 255, 255)' && n.ink !== 'rgb(26, 26, 26)' && n.paper !== 'rgb(250, 247, 242)', JSON.stringify(n));
    C.check('…no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  {
    // the pictures: someone else's page, light; your own, dark, at 390 px
    const pages = { [CK.mina]: { art: 'iron', numbers: { weeks: { now: 6, best: 8 }, sessions: 41, bests: 9 }, cheers: { season: 12, recent: [] },
      achievements: [{ id: 'a:1', name: 'Back to Back', day: '2026-10-12' }, { id: 'a:2', name: 'The Notebook', day: '2026-10-03' }, { id: 'a:3', name: 'First Blood', day: '2026-09-28' }, { id: 'a:4', name: 'Straight Talk', day: '2026-09-20' }],
      honours: [{ month: '2026-09-01', honour: 'sessions', value: { n: 14 } }] }, me: { art: 'voltage', who: 'Alex R.', lv: 19 } };
    const a = await open(browser, { stub: { crewPages: pages } });
    await goCrew(a.p); await shown(a.p, CK.mina); await a.p.waitForTimeout(600);
    await a.p.screenshot({ path: path.join(out, 'player-other-light-390.png'), fullPage: true }).catch(() => {});
    await a.ctx.close();
    const b = await open(browser, { opts: { dark: true }, stub: { crewPages: pages } });
    await goCrew(b.p); await b.p.evaluate(() => openPlayer('me')); await b.p.waitForTimeout(800);
    await b.p.screenshot({ path: path.join(out, 'player-own-dark-390.png'), fullPage: true }).catch(() => {});
    await b.ctx.close();
    const c = await open(browser, { b: { me: { answer: null, can_post: false } }, stub: { crewPages: pages } });
    await goCrew(c.p); await c.p.waitForTimeout(500);
    await c.p.screenshot({ path: path.join(out, 'join-question-light-390.png') }).catch(() => {});
    await c.ctx.close();
  }

  // ── 12. Amir's four decisions on the page (main session, 2026-10-24) ────────────────────────────────────────────────────────
  {
    // (1) the flag is the test: keys without it are Crew as it was; the flag without a key of your own is the Lounge
    const a = await open(browser, { b: { noFlag: true } });
    await goCrew(a.p);
    const sa = await a.p.evaluate(() => ({ on: crewPagesOn(), doors: document.querySelectorAll('#crew-body .cr-bt').length, band: document.querySelector('#crew-body .cr-faces').tagName }));
    C.check('ck and fv without get_bell\'s "lounge" flag: no door, the band is the one button it was', !sa.on && sa.doors === 0 && sa.band === 'BUTTON', JSON.stringify(sa));
    await a.ctx.close();
    const b = await open(browser, { b: { me: { ck: null, fv: null } } });
    await goCrew(b.p);
    const sb = await b.p.evaluate(() => ({ on: crewPagesOn(), doors: document.querySelectorAll('#crew-body .cr-pl').length }));
    C.check('the flag with no key of your own (no consent row yet): the Lounge is on', sb.on && sb.doors >= 3, JSON.stringify(sb));
    await b.ctx.close();
  }
  {
    // (2) "Only you": the comebacks always, and any block whose switch is off; never on someone else's page
    const ach = [{ id: 'a:1', name: 'Back to Back', day: '2026-10-12', signed: [], signed_n: 0 }, { id: 'a:2', name: 'The Notebook', day: '2026-10-03', signed: [], signed_n: 0 }];
    const hon = [{ month: '2026-09-01', honour: 'sessions', value: { n: 14 } }];
    const lone = p => p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-only')].map(e => ({ t: e.textContent.trim(), where: e.closest('.pl-tiles > div') ? 'tile:' + e.closest('.pl-tiles > div').innerText.replace(/\s+/g, ' ').trim() : e.closest('.prog-sec') ? 'sec:' + e.closest('.prog-sec').firstChild.textContent.trim() : e.closest('.pl-lv') ? 'lv' : '?' })));
    const { ctx, p } = await open(browser, { stub: { crewPages: { me: { kinds: { achievement: false, honour: true, level: true }, achievements: ach, honours: hon, lv: 19, best_lifts: [{ lift: 'Trap Bar Deadlift', day: '2026-10-08' }] },
      [CK.mina]: { kinds: { achievement: false }, achievements: ach, honours: hon, numbers: { weeks: { now: 6, best: 8 }, sessions: 41, bests: 9, comebacks: 3 } } } } });
    await goCrew(p);
    await p.evaluate(() => openPlayer('me')); await p.waitForTimeout(600);
    let l = await lone(p);
    C.check('your page: "Only you" on the comebacks tile and on Achievements (its switch is off), nowhere else', l.length === 2 && l.every(x => x.t === 'Only you') && /^tile:2 comebacks/.test(l[0].where) && l[1].where === 'sec:Achievements', JSON.stringify(l));
    C.check('…the label is small grey Space Mono, quiet', await p.evaluate(() => { const s = getComputedStyle(document.querySelector('#crewplayer-body .pl-only')); return /Space Mono/.test(s.fontFamily) && parseFloat(s.fontSize) <= 12 && s.color !== 'rgb(26, 26, 26)'; }));
    const note = await plain(p, '#crewplayer-body .pl-note');
    C.check('…the line stays "This is what the crew sees" and adds "Parts marked Only you stay with you."', note === 'This is what the crew sees. Parts marked Only you stay with you.', note);
    C.check('…best_lifts are sent and never drawn', !/Trap Bar/.test(await text(p, '#crewplayer-body')));
    // a switch turned off in the sheet marks its tile at once, and on again takes the mark away
    await p.evaluate(() => crewSetKind('week', false)); await p.waitForTimeout(500);
    l = await lone(p);
    C.check('turning "A week held" off marks the weeks tile "Only you"', l.some(x => /^tile:6 weeks held/.test(x.where)) && l.length === 3, JSON.stringify(l));
    await p.evaluate(() => crewSetKind('week', true)); await p.waitForTimeout(500);
    C.check('…and on again takes it away', (await lone(p)).length === 2);
    await p.evaluate(() => crewSetKind('level', false)); await p.waitForTimeout(500);
    C.check('the level switch off marks the level chip', (await lone(p)).some(x => x.where === 'lv'));
    await p.evaluate(() => crewSetKind('level', true)); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    await shown(p, CK.mina);
    C.check('someone else\'s page never says "Only you", whatever the server sends', (await lone(p)).length === 0 && !/Only you/.test(await text(p, '#crewplayer-body')) && !/comeback/i.test(await text(p, '#crewplayer-body')));
    C.check('…the app draws what the server sent: a switched-off block is left out by the server, never decided here', (await secs(p)).includes('Achievements'));
    await ctx.close();
  }
  {
    // nothing off and no comebacks: no label, and the second sentence is not there to point at nothing
    const { ctx, p } = await open(browser, { stub: { crewPages: { me: { kinds: {}, numbers: { weeks: { now: 6, best: 8 }, sessions: 41, bests: 9 } } } } });
    await goCrew(p);
    await p.evaluate(() => openPlayer('me')); await p.waitForTimeout(600);
    C.check('nothing to mark: no "Only you", no second sentence', (await p.$$('#crewplayer-body .pl-only')).length === 0 && (await plain(p, '#crewplayer-body .pl-note')) === 'This is what the crew sees.');
    await ctx.close();
    // not in the crew: the whole page is yours, so there is nothing to label
    const r = await open(browser, { b: { me: { answer: null, can_post: false } }, stub: { crewPages: { me: { member: false, kinds: { week: false } } } } });
    await waitTab(r.p); await r.p.waitForTimeout(400);
    await r.p.evaluate(() => openPlayer('me')); await r.p.waitForTimeout(600);
    C.check('not in the crew: no labels (the whole page is yours)', (await r.p.$$('#crewplayer-body .pl-only')).length === 0);
    await r.ctx.close();
  }
  {
    // (3) the cover: your own page is the picture on your Progress; another's is their art family, else bedrock; never a cycle name
    const { ctx, p } = await open(browser, { stub: { crewPages: { me: { art: 'voltage' }, [CK.mina]: { art: 'armour' }, [CK.reza]: { art: 'c3' }, [CK.sara]: { art: null }, [CK.omid]: { art: 'Load & Build' } } } });
    await goCrew(p);
    const src = () => p.evaluate(() => { const i = document.getElementById('pl-cover-img'); return i.hidden ? null : i.getAttribute('src'); });
    const want = await p.evaluate(() => cycleArtUrl(DATA.cycles[DATA.currentCycleIndex]));
    await p.evaluate(() => goTo('plan')); await p.waitForTimeout(500);
    const prog = await p.evaluate(() => { const i = document.querySelector('#cycle-card-wrap .cyc-img'); return i ? i.getAttribute('src') : null; });
    await p.evaluate(() => openPlayer('me')); await p.waitForTimeout(600);
    C.check('your own page: the cover is exactly the picture on your Progress (cycleArt of your current cycle), not the page\'s art', (await src()) === want && prog === want && /iron-v1/.test(want), JSON.stringify([await src(), prog, want]));
    await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(250);
    for (const [who, ckk, family] of [['a named family', CK.mina, 'armour'], ['a word that is no family ("c3")', CK.reza, 'bedrock'], ['no art at all', CK.sara, 'bedrock'], ['a cycle name (never read as one)', CK.omid, 'bedrock']]) {
      await shown(p, ckk);
      const s = await src();
      C.check('someone else\'s cover, ' + who + ': ' + family, !!s && s.indexOf('assets/art/cycles/' + family + '-v1.webp') >= 0, String(s));
      await p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await p.waitForTimeout(200);
    }
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
