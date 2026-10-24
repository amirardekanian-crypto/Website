// Players' Lounge, the athlete app (2026-10-24): node scripts/headless/lounge.js [--out <dir for screenshots>]
//
// Step 0 and 1: the Player Page. A page for every person in the crew, opened from any name, face or row on Crew (a post, a reply, the week band,
// In the crew, the board on the tab and its page, the honours, the Open, a Bell line), from your initials → Your page and from Crew and the Bell;
// its ← goes back to where it was opened from; what a person switched off is not on it; a comeback is yours alone; the copy on the phone is drawn
// first and with no signal it is all there is; the join question shows your own page first; "Your page is here" once, for members who were already
// in; a server without stage96 keeps today's Crew exactly; under 13 gets no doors; 320 px and dark mode. Later steps of the Lounge add their checks
// to THIS file, in their own numbered section. Made-up people only. The stub answers crew_page by name (stub.js).
//
// Step 2: Faces (Ring Faces). A photo wherever a name sits and the letters until there is one: asked 12 to a call, one call in flight, only what is on or near the
// screen, kept in Cache Storage "crew-faces-v1", a new version replacing the old, gone with a person who leaves; Your photo (choose, move, pinch, zoom, Save, Remove);
// who may and who may not. Section 13.
//
// Step 3: The cheer (In the Band). The band's faces (40 px, a ring for a held week, NEW, a tap that waits, a double tap that cheers once and never opens the page, the burst
// that reduced motion does not get, the hint's three visits), the page's button (the clap icon and "Cheer", never the emoji), the sheet, the word, the polite refusals, New Balls,
// the cheers received. Section 14. Section 15 takes the pictures (into --out).
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

// --only=14,15 runs just those numbered sections (every block after a "// ── N." line is wrapped in on(N)); no flag runs everything.
const ONLY = (process.argv.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean).map(Number);
const on = n => !ONLY.length || ONLY.includes(n);

(async () => {
  const C = H.checker();
  const browser = await H.launch();
  const out = H.outDir();

  // ── 1. the shared helpers: who an item is ─────────────────────────────────────────────────────────────────────────────────
  if (on(1)) {
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
  if (on(2)) {
    const { ctx, p } = await open(browser, { stub: { crewPages: { [CK.mina]: { art: 'iron', since: '2026-06-06' } } } });
    await goCrew(p);
    const doors = await p.evaluate(() => ({ pl: document.querySelectorAll('#crew-body .cr-pl').length, nb: document.querySelectorAll('#crew-body .cr-nb').length,
      band: document.querySelectorAll('#crew-body .cr-faces button.cr-face').length, go: !!document.querySelector('#crew-body .cr-week .cr-bandfoot .go'),
      boardBtn: document.querySelectorAll('#crew-board button.cr-br').length, openBtn: document.querySelectorAll('#crew-body button.cr-ob-r').length,
      bandIsDiv: document.querySelector('#crew-body .cr-faces').tagName }));
    C.check('stage96: posts, replies, lines, honours, the band\'s faces, the board and the Open rows are all doors', doors.pl >= 4 && doors.nb >= 4 && doors.band === 7 && doors.go && doors.boardBtn === 3 && doors.openBtn === 2, JSON.stringify(doors));
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
  if (on(3)) {
    const { ctx, p } = await open(browser);
    await goCrew(p);
    const doors = [
      ['a post\'s face and name', '[data-id="' + P_ALI + '"] .cr-pl', CK.ali1],
      ['a reply\'s face', '.cr-rep .cr-rf', CK.mina],
      ['a reply\'s name', '.cr-rep .cr-nb', CK.mina],
      ['a Bell line\'s name', '.cr-line .cr-nb', CK.mina],
      ['a face on the week band', '.cr-fcs .cr-fc:nth-child(3) button.cr-face', CK.reza],
      ['an honours name', '.cr-hon b .cr-nb', CK.reza],
      ['an Open board row', 'button.cr-ob-r:not(.me)', CK.reza],
      ['a row of the season board on the tab', '#crew-board button.cr-br:not(.me)', CK.reza],
    ];
    for (const [what, sel, want] of doors) {
      await click(p, sel); await p.waitForTimeout(/band/.test(what) ? 750 : 350);   // a band face waits 250 ms for a second tap
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
  if (on(4)) {
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
  if (on(5)) {
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
  if (on(5)) {
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
  if (on(6)) {
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
  if (on(6)) {
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
  if (on(6)) {
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
  if (on(6)) {
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
  if (on(7)) {
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
  if (on(7)) {
    // not in the crew: a tap on a name is the same offer, with no call to the server
    const { ctx, p } = await open(browser, { b: { me: { answer: null, can_post: false } } });
    await goCrew(p);
    await p.evaluate(id => document.querySelector('[data-id="' + id + '"] .cr-pl').click(), P_MINA); await p.waitForTimeout(400);
    const t = await toast(p);
    C.check('not in the crew: a name offers the crew, not a dead tap', !!t && /Join the crew to see their page/.test(t.text) && (await screenNow(p)) === 'screen-crew' && (await calls(p, 'crew_page')).filter(x => x.p_subject).length === 0, JSON.stringify(t));
    await ctx.close();
  }
  if (on(7)) {
    // an athlete Amir ticked under 13 reads only: no door on a name
    const { ctx, p } = await open(browser, { b: { me: { answer: 'yes', under13: true, can_post: false } } });
    await goCrew(p);
    const s = await p.evaluate(() => { openPlayer('a0000000-0000-4000-8000-000000000002'); return { doors: document.querySelectorAll('#crew-body .cr-bt').length, band: document.querySelector('#crew-body .cr-faces').tagName, scr: (document.querySelector('.screen.active') || {}).id }; });
    C.check('under 13: no door on any name, and openPlayer does nothing', s.doors === 0 && s.band === 'BUTTON' && s.scr === 'screen-crew' && (await calls(p, 'crew_page')).length === 0, JSON.stringify(s));
    await ctx.close();
  }

  // ── 8. the join question shows your page first (62), and "Your page is here" once ───────────────────────────────────────────
  if (on(8)) {
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
  if (on(8)) {
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
  if (on(8)) {
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
  if (on(9)) {
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
  if (on(9)) {
    const mine = { me: { at: 5, p: { me: true, who: 'Alex R.', numbers: {} } } };
    const { ctx, p } = await open(browser, { seed: { _crewpages: mine }, stub: { progress: { [H.ID + '_crewpages']: JSON.stringify({ zzzz: { at: 9, p: { who: 'Someone Else' } } }), [H.ID + '_snapAt']: new Date(Date.now() + 3600e3).toISOString() } } });
    await p.waitForTimeout(2500);
    C.check('a cloud copy of the pages is not pulled over the phone\'s own', (await p.evaluate(id => localStorage.getItem(id + '_crewpages'), H.ID)) === JSON.stringify(mine));
    await ctx.close();
  }
  if (on(9)) {
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
  if (on(10)) {
    const { ctx, p } = await open(browser);
    await goCrew(p);
    const g = await p.evaluate(() => buildAppGuideCards());
    C.check('the guide: Your page under your initials, names and faces that open pages, and the join question', /<strong>Your page<\/strong> is under your initials/.test(g) && /Tap a name, a face or a row/.test(g) && /your own page is shown first/.test(g));
    C.check('…in plain words: no em-dash, no semicolon in what was added', !/[—;]/.test((g.match(/<p>Tap a name[\s\S]*?<\/p>/) || [''])[0]));
    await ctx.close();
  }

  // ── 11. 320 px, dark mode, long names, and a look ──────────────────────────────────────────────────────────────────────────
  if (on(11)) {
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
  if (on(11)) {
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
  if (on(12)) {
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
  if (on(12)) {
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
  if (on(12)) {
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
  if (on(12)) {
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

  // ── 13. Step 2 · Faces (Ring Faces): a photo wherever a name sits, the letters until there is one ─────────────────────────────────
  const faceKeys = p => p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'crew_faces_get').map(x => x[1].p_keys));
  const cacheKeys = p => p.evaluate(async () => { try { const c = await caches.open('crew-faces-v1'); return (await c.keys()).map(r => new URL(r.url).pathname.replace('/__crew-face/', '')).sort(); } catch (e) { return null; } });
  // real little JPEGs, one colour each, handed to the stub the way crew_faces_get answers them
  const putFaces = (p, list) => p.evaluate(rows => {
    const out = {};
    rows.forEach(([k, color, fv]) => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = color; x.fillRect(0, 0, 64, 64); out[k] = { fv, b64: c.toDataURL('image/jpeg', 0.8).split(',')[1] }; });
    window.__STUB.faces = Object.assign(window.__STUB.faces || {}, out);
  }, list);
  const picOf = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); const im = e && e.querySelector(':scope > img.fc-img'); return e ? { img: !!im, src: im ? im.getAttribute('src') : null, text: e.textContent.trim(), loaded: !!im && im.complete && im.naturalWidth > 0 } : null; }, sel);
  const withFaces = (fvs) => {
    const b = bell();
    b.crew.forEach(c => { if (c.ck in fvs) c.fv = fvs[c.ck]; });
    if (CK.alex in fvs) b.me.fv = fvs[CK.alex];
    b.items.forEach(i => { if (i.ck in fvs) i.fv = fvs[i.ck]; });
    b.items[0].replies.forEach(r => { if (r.ck in fvs) r.fv = fvs[r.ck]; });
    b.items.forEach(i => { if (i.t === 'line' && i.key && i.key.split(':')[0] in fvs) i.fv = fvs[i.key.split(':')[0]]; });
    return b;
  };
  if (on(13)) {
    const fvs = { [CK.alex]: 1001, [CK.mina]: 1002, [CK.reza]: 1003, [CK.ali1]: 1004, [CK.leila]: 1005 };
    const brd = board().map(r => (r.ck in fvs ? { ...r, fv: fvs[r.ck] } : r));
    const a = await open(browser, { stub: { bell: withFaces(fvs), crewBoard: brd } });
    await putFaces(a.p, [[CK.alex, '#C7552F', 1001], [CK.mina, '#2E7D5B', 1002], [CK.reza, '#2A5C8A', 1003], [CK.ali1, '#6B4A8C', 1004], [CK.leila, '#8A8A8A', 1005]]);
    await goCrew(a.p); await a.p.waitForTimeout(1400);
    const f = await a.p.evaluate(() => {
      const has = s => { const e = document.querySelector(s); return !!(e && e.querySelector(':scope > img.fc-img')); };
      return {
        post: has('.cr-post[data-id="bbbbbbbb-0000-4000-8000-000000000001"] .cr-ini'), postAli: has('.cr-post[data-id="66666666-7777-8888-9999-000000000000"] .cr-ini'),
        own: has('.cr-post[data-id="cccccccc-0000-4000-8000-000000000001"] .cr-ini'), composer: has('.cr-comp .cr-ini'),
        reply: has('.cr-rep .cr-ini[data-fc]'), line: has('.cr-line .cr-fl'), band: document.querySelectorAll('.cr-faces .cr-face img.fc-img').length,
        amirPost: (document.querySelector('.cr-post.amir .cr-ini img.fc-img') || {}).src || '', board: document.querySelectorAll('#crew-board .cr-fl img.fc-img').length,
        account: !!document.querySelector('#global-account > img.fc-img'),
        initials: [...document.querySelectorAll('.cr-faces .cr-face')].filter(e => !e.querySelector('img.fc-img')).map(e => e.textContent.trim()).join(','),
      };
    });
    C.check('faces draw where a name sits: a post, your own post, the composer, a reply, a Bell line, the band', f.post && f.postAli && f.own && f.composer && f.reply && f.line && f.band === 5, JSON.stringify(f));
    C.check('…the board rows (a face before the name) and the account button wear it too', f.board === 3 && f.account, JSON.stringify([f.board, f.account]));
    C.check('…Amir\'s is his own photo, as on the week note', /assets\/img\/coach\.jpg$/.test(f.amirPost), f.amirPost);
    C.check('…a person with no picture is the letters, as today (the second Ali B. and the +2 on the band)', /AB,\+2/.test(f.initials), f.initials);
    C.check('…the pictures really opened (they are real JPEGs, not broken)', (await picOf(a.p, '.cr-post[data-id="bbbbbbbb-0000-4000-8000-000000000001"] .cr-ini')).loaded);
    const k1 = await faceKeys(a.p);
    C.check('ONE batched call asks for all five faces, each key once, yours included', k1.length === 1 && k1[0].length === 5 && new Set(k1[0]).size === 5 && k1[0].includes(CK.alex), JSON.stringify(k1));
    const ck1 = await cacheKeys(a.p);
    C.check('…they are kept in Cache Storage "crew-faces-v1" under <ck>-<fv>, not in the photos cache', ck1 && ck1.length === 5 && ck1.includes(CK.mina + '-1002') && !(await a.p.evaluate(async () => { const c = await caches.open('crew-photos-v1'); return (await c.keys()).some(r => /crew-face/.test(r.url)); })), JSON.stringify(ck1));
    await a.p.evaluate(() => { goTo('home'); goTo('crew'); }); await a.p.waitForTimeout(700);
    C.check('…a second visit asks for nothing', (await faceKeys(a.p)).length === 1);
    // a new visit of the app: the faces come from the phone, not the line
    await a.p.reload({ waitUntil: 'domcontentloaded' });
    await a.p.waitForFunction(() => document.getElementById('loading') && document.getElementById('loading').classList.contains('hidden'), null, { timeout: 20000 });
    await goCrew(a.p); await a.p.waitForTimeout(1200);
    C.check('a new visit draws the faces from Cache Storage and asks the server for none', (await faceKeys(a.p)).length === 0 && (await picOf(a.p, '.cr-post[data-id="bbbbbbbb-0000-4000-8000-000000000001"] .cr-ini')).img);
    C.check('…the account button wears your face on any tab', await (async () => { await a.p.evaluate(() => goTo('home')); await a.p.waitForTimeout(500); return a.p.evaluate(() => !!document.querySelector('#global-account > img.fc-img')); })());
    // a new fv replaces the old cache key and the picture
    await a.p.evaluate(() => goTo('crew'));
    await putFaces(a.p, [[CK.mina, '#B07A2A', 2002]]);   // (a colour for the new one; never gold on screen: it is only a test picture)
    await a.p.evaluate(ck => { const B = window.__STUB.bell; B.crew.find(c => c.ck === ck).fv = 2002; B.items.forEach(i => { if (i.ck === ck) i.fv = 2002; }); B.items[0].replies.forEach(r => { if (r.ck === ck) r.fv = 2002; }); _bellAt = 0; return refreshBell(); }, CK.mina);
    await a.p.waitForTimeout(1500);
    const ck2 = await cacheKeys(a.p), srcAfter = (await picOf(a.p, '.cr-post[data-id="bbbbbbbb-0000-4000-8000-000000000001"] .cr-ini')).src;
    C.check('Mina changes her photo (a new fv): the old key leaves the cache and the new one is asked for once', ck2.includes(CK.mina + '-2002') && !ck2.includes(CK.mina + '-1002') && ck2.length === 5 && (await faceKeys(a.p)).length === 1 && (await faceKeys(a.p))[0].length === 1 && (await faceKeys(a.p))[0][0] === CK.mina, JSON.stringify([ck2, await faceKeys(a.p)]));
    C.check('…and every face of hers on the screen shows the new picture', (await a.p.evaluate(ck => [...document.querySelectorAll('[data-fc="' + ck + '"]')].every(e => e.dataset.fv === '2002' && !!e.querySelector('img.fc-img')), CK.mina)) && !!srcAfter);
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
  }
  if (on(13)) {
    // twelve to a call, one call at a time, and only what is on or near the screen
    const many = []; const fvs = { [CK.alex]: 1 };
    for (let i = 0; i < 14; i++) { const k = 'f' + String(i).padStart(7, '0') + '-0000-4000-8000-000000000000'; many.push(k); fvs[k] = 10 + i; }
    const b = bell();
    many.forEach((k, i) => b.crew.push({ who: 'Member ' + String.fromCharCode(65 + i) + '.', me: false, since: '2026-10-19', ck: k, fv: 10 + i, lv: 3 }));
    b.me.fv = 1; b.crew[0].fv = 1;
    const a = await open(browser, { opts: { w: 390, h: 2600 }, stub: { bell: b, faceDelay: 150 } });
    await putFaces(a.p, [[CK.alex, '#C7552F', 1]].concat(many.map((k, i) => [k, '#2E7D5B', 10 + i])));
    await waitTab(a.p);
    await a.p.evaluate(() => goTo('crewwho')); await a.p.waitForTimeout(2500);
    const ks = await faceKeys(a.p), inflight = await a.p.evaluate(() => window.__STUB.faceMax);
    const total = ks.reduce((s, x) => s + x.length, 0);
    C.check('twenty-two faces on In the crew: calls of at most twelve, every key once', ks.length >= 2 && ks.every(x => x.length <= 12) && new Set(ks.flat()).size === total && total === 15, JSON.stringify(ks.map(x => x.length)));
    C.check('…never two calls at once', inflight === 1, String(inflight));
    C.check('…and every row ended up with its picture', await a.p.evaluate(() => [...document.querySelectorAll('#crewwho-body .p.ini[data-fc]')].every(e => !!e.querySelector('img.fc-img'))));
    await a.ctx.close();
  }
  if (on(13)) {
    // only the faces on or near the screen are asked for: a person who appears only far down the board waits until it is scrolled to
    const fvs = { [CK.omid]: 77 };
    const b = withFaces(fvs);
    const brd = [{ pos: 1, who: 'Reza K.', points: 6240, level: 22, is_me: false, ck: CK.reza, fv: null }, { pos: 2, who: 'Alex R.', points: 5910, level: 19, is_me: true, ck: CK.alex, fv: null },
      { pos: 3, who: 'Mina S.', points: 5100, level: 14, is_me: false, ck: CK.mina, fv: null }, { pos: 4, who: 'Sara T.', points: 4000, level: 12, is_me: false, ck: CK.sara, fv: null },
      { pos: 5, who: 'Omid P.', points: 100, level: 5, is_me: false, ck: CK.omid, fv: 77 }];
    const a = await open(browser, { stub: { bell: b, crewBoard: brd } });
    await putFaces(a.p, [[CK.omid, '#2A5C8A', 77]]);
    await goCrew(a.p); await a.p.waitForTimeout(1000);
    const far = await a.p.evaluate(ck => { const e = document.querySelector('#crew-board [data-fc="' + ck + '"]'); return e ? Math.round(e.getBoundingClientRect().top + scrollY) - innerHeight : null; }, CK.omid);
    const early = (await faceKeys(a.p)).flat();
    C.check('a face far below the screen is not asked for yet (the board\'s last row, ' + far + ' px past the fold)', far !== null && far > 300 && !early.includes(CK.omid), JSON.stringify([far, early.length]));
    await a.p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await a.p.waitForTimeout(1200);
    C.check('…scrolled to, it is', (await faceKeys(a.p)).flat().includes(CK.omid) && !!(await picOf(a.p, '#crew-board [data-fc="' + CK.omid + '"]')).img);
    await a.ctx.close();
  }
  if (on(13)) {
    // no signal: the letters stay and nothing breaks; the same faces are asked for at the next draw
    const fvs = { [CK.mina]: 5 };
    const a = await open(browser, { stub: { bell: withFaces(fvs), mode: 'online' } });
    await putFaces(a.p, [[CK.mina, '#2E7D5B', 5]]);
    await a.p.evaluate(() => { window.__STUB.stall = { crew_faces_get: true }; });
    await goCrew(a.p); await a.p.waitForTimeout(500);
    C.check('a face that has not come (the line is slow): the letters, exactly as today', (await picOf(a.p, '.cr-post[data-id="bbbbbbbb-0000-4000-8000-000000000001"] .cr-ini')).text === 'MS');
    await a.ctx.close();
    const m = await open(browser, { stub: { bell: withFaces(fvs), faceMissing: true } });
    await putFaces(m.p, [[CK.mina, '#2E7D5B', 5]]);
    await goCrew(m.p); await m.p.waitForTimeout(900);
    C.check('crew_faces_get missing on the server: the letters, and no page error', (await picOf(m.p, '.cr-post[data-id="bbbbbbbb-0000-4000-8000-000000000001"] .cr-ini')).text === 'MS' && !m.p.errs.length, m.p.errs.join('|'));
    await m.ctx.close();
  }
  if (on(13)) {
    // without stage96 (no flag) a face is the letters on every surface and nothing is asked
    const a = await open(browser, { b: { noPages: true } });
    await goCrew(a.p); await a.p.waitForTimeout(500);
    C.check('without stage96: no face data on any face, Amir\'s post stays AA, nothing asked', await a.p.evaluate(() => !document.querySelector('[data-fc], img.fc-img') && /^AA$/.test(document.querySelector('.cr-post.amir .cr-ini').textContent.trim())) && (await faceKeys(a.p)).length === 0);
    await a.ctx.close();
  }
  if (on(13)) {
    // your photo: choose, move, pinch, zoom, save; Remove; who may and who may not
    const mkPhoto = (p, w, h) => p.evaluate(async ([W, H]) => {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#8FA6B2'); g.addColorStop(0.5, '#C98E6A'); g.addColorStop(1, '#2A2F2B'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.fillStyle = 'rgba(255,255,255,0.4)'; for (let i = 0; i < 40; i++) x.fillRect((i * 211) % W, (i * 97) % H, W / 10, H / 40);
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9));
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'me.jpg', { type: 'image/jpeg' }));
      const input = document.getElementById('fp-file'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [w, h]);
    const a = await open(browser, { stub: { crewPages: { me: { who: 'Alex R.' } } } });
    await goCrew(a.p);
    await a.p.evaluate(() => openPlayer('me')); await a.p.waitForTimeout(600);
    C.check('your page: the face is a button with a camera on it', await a.p.evaluate(() => { const b = document.querySelector('#crewplayer-body .pl-fbtn'); return !!b && !!b.querySelector('.pl-cam svg') && /Add your photo/.test(b.getAttribute('aria-label')); }));
    await click(a.p, '#crewplayer-body .pl-fbtn'); await a.p.waitForTimeout(400);
    const s0 = await a.p.evaluate(() => ({ title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent, save: document.getElementById('fp-save').disabled, rm: document.getElementById('fp-rm').hidden, cv: document.getElementById('fp-cv').hidden, z: document.getElementById('fp-z').hidden }));
    C.check('the sheet "Your photo": Save waits for a picture, no Remove while there is none, the zoom is hidden', s0.title === 'Your photo' && s0.save && s0.rm && s0.cv && s0.z, JSON.stringify(s0));
    await mkPhoto(a.p, 3000, 4000); await a.p.waitForTimeout(600);
    const s1 = await a.p.evaluate(() => ({ save: document.getElementById('fp-save').disabled, cv: document.getElementById('fp-cv').hidden, w: document.getElementById('fp-cv').width, st: facePhotoState() }));
    C.check('a 12 MP photo is chosen: a 256 px square under the mask, made smaller (1024 on its long side), Save ready', !s1.save && !s1.cv && s1.w === 256 && s1.st.on && s1.st.ih === 1024 && s1.st.iw === 768, JSON.stringify(s1));
    const mv = await a.p.evaluate(async () => {
      const fr = document.getElementById('fp-frame'), r = fr.getBoundingClientRect(), z = document.getElementById('fp-z');
      z.value = '2'; z.dispatchEvent(new Event('input', { bubbles: true }));
      const ev = (type, x, y, id) => fr.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, bubbles: true, cancelable: true }));
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      ev('pointerdown', cx, cy, 1); ev('pointermove', cx + 30, cy + 40, 1); const drag = facePhotoState().fit; ev('pointerup', cx + 30, cy + 40, 1);
      ev('pointerdown', cx - 30, cy, 2); ev('pointerdown', cx + 30, cy, 3); ev('pointermove', cx - 90, cy, 2); ev('pointermove', cx + 90, cy, 3); const pinch = facePhotoState().fit;
      ev('pointermove', cx - 4000, cy, 2); ev('pointermove', cx + 4000, cy, 3); const far = facePhotoState().fit.z;
      ev('pointerup', cx - 4000, cy, 2); ev('pointerup', cx + 4000, cy, 3);
      return { drag, pinch, far, slider: z.value };
    });
    C.check('one finger moves it, two zoom it, the slider follows, zoom stops at 4', mv.drag.dx > 0 && mv.drag.dy > 0 && mv.pinch.z > 2.5 && mv.far === 4 && Number(mv.slider) === 4, JSON.stringify(mv));
    await click(a.p, '#fp-save'); await a.p.waitForTimeout(1200);
    const set = (await calls(a.p, 'crew_face_set'))[0];
    C.check('Save sends a JPEG, 256 square, at most 60,000 bytes (EXIF gone: it was drawn again)', !!set && set.p_w === 256 && set.p_h === 256 && /^\/9j\//.test(set.p_photo) && Math.floor(set.p_photo.length * 3 / 4) <= 60000, set ? [set.p_w, set.p_h, set.p_photo.length].join() : 'no call');
    const after = await a.p.evaluate(() => ({ open: document.getElementById('hist-overlay').classList.contains('visible'), fv: crewMe().fv, acct: !!document.querySelector('#global-account > img.fc-img'), pg: !!document.querySelector('#crewplayer-body .pl-face > img.fc-img') }));
    C.check('…the sheet closes, and the new picture is on your page and on the account button at once', !after.open && after.fv > 0 && after.acct && after.pg, JSON.stringify(after));
    C.check('…and kept under your own ck-fv in the faces cache', (await cacheKeys(a.p)).some(k => k.startsWith(CK.alex + '-')));
    // Remove takes two taps
    await click(a.p, '#crewplayer-body .pl-fbtn'); await a.p.waitForTimeout(400);
    C.check('with a photo the sheet offers Remove and the picture is the circle\'s own', await a.p.evaluate(() => !document.getElementById('fp-rm').hidden && !!document.querySelector('#fp-cur img.fc-img')));
    await click(a.p, '#fp-rm'); await a.p.waitForTimeout(250);
    C.check('Remove asks again before it acts (two taps)', (await calls(a.p, 'crew_face_clear')).length === 0);
    await click(a.p, '#fp-rm'); await a.p.waitForTimeout(900);
    const gone = await a.p.evaluate(() => ({ fv: crewMe().fv, acct: !!document.querySelector('#global-account > img.fc-img'), pg: !!document.querySelector('#crewplayer-body .pl-face > img.fc-img'), open: document.getElementById('hist-overlay').classList.contains('visible') }));
    C.check('…the second tap clears it everywhere: the letters are back and the cache holds none of yours', (await calls(a.p, 'crew_face_clear')).length === 1 && gone.fv === null && !gone.acct && !gone.pg && !gone.open && !(await cacheKeys(a.p)).some(k => k.startsWith(CK.alex + '-')), JSON.stringify(gone));
    // an error from the server is said in words, and Save comes back
    await a.p.evaluate(() => { window.__STUB.faceErr = 'crew:photo_bad'; });
    await click(a.p, '#crewplayer-body .pl-fbtn'); await a.p.waitForTimeout(300);
    await mkPhoto(a.p, 800, 800); await a.p.waitForTimeout(400); await click(a.p, '#fp-save'); await a.p.waitForTimeout(700);
    C.check('a refusal is said plainly and Save is ready to try again', await a.p.evaluate(() => /That photo did not work/.test(document.querySelector('#hist-overlay .cr-err').textContent) && !document.getElementById('fp-save').disabled));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
    // not in the crew: asked to join, never a picker; under 13: no button at all
    const n = await open(browser, { b: { me: { answer: null, can_post: false } }, stub: { crewPages: { me: { member: false } } } });
    await waitTab(n.p); await n.p.evaluate(() => openPlayer('me')); await n.p.waitForTimeout(600);
    await click(n.p, '#crewplayer-body .pl-fbtn'); await n.p.waitForTimeout(300);
    const t = await toast(n.p);
    C.check('not in the crew: the face asks you to join and opens no picker', !!t && /Join the crew to add a photo/.test(t.text) && t.action === 'Join the crew' && !(await n.p.$('#fp-frame')), JSON.stringify(t));
    await n.ctx.close();
    const u = await open(browser, { b: { me: { answer: 'yes', under13: true, can_post: false } }, stub: { crewPages: { me: {} } } });
    await waitTab(u.p); await u.p.evaluate(() => openPlayer('me')); await u.p.waitForTimeout(600);
    const u13 = await u.p.evaluate(() => { openFacePhoto(); return { btn: !!document.querySelector('#crewplayer-body .pl-fbtn'), sheet: !!document.getElementById('fp-frame') }; });
    C.check('under 13: no camera, and the picker does not open even if called', !u13.btn && !u13.sheet, JSON.stringify(u13));
    await u.ctx.close();
  }
  if (on(13)) {
    // leaving takes every face off the phone
    const fvs = { [CK.mina]: 5, [CK.alex]: 6 };
    const a = await open(browser, { stub: { bell: withFaces(fvs) } });
    await putFaces(a.p, [[CK.mina, '#2E7D5B', 5], [CK.alex, '#C7552F', 6]]);
    await goCrew(a.p); await a.p.waitForTimeout(1200);
    const had = (await cacheKeys(a.p)).length;
    await a.p.evaluate(ckk => { window.__STUB.bell.crew = window.__STUB.bell.crew.filter(c => c.ck !== ckk); _bellAt = 0; return refreshBell(); }, CK.mina);
    await a.p.waitForTimeout(900);
    C.check('someone leaves the crew: their face leaves the phone (the cache and the picture), yours stays', had === 2 && JSON.stringify(await cacheKeys(a.p)) === JSON.stringify([CK.alex + '-6']) && await a.p.evaluate(ck => !CREW_FACES.has(ck), CK.mina));
    await a.p.evaluate(() => crewAnswer('no')); await a.p.waitForTimeout(1200);
    C.check('you leave: your own face is gone from the phone and the account button (the server took it too)', !((await cacheKeys(a.p)) || []).some(k => k.startsWith(CK.alex + '-')) && await a.p.evaluate(ck => !CREW_FACES.has(ck) && !document.querySelector('#global-account > img.fc-img') && crewMe().fv === null, CK.alex));
    await a.ctx.close();
  }
  if (on(13)) {
    // the faces never sync
    const fvs = { [CK.mina]: 5 };
    const a = await open(browser, { stub: { bell: withFaces(fvs) } });
    await putFaces(a.p, [[CK.mina, '#2E7D5B', 5]]);
    await goCrew(a.p); await a.p.waitForTimeout(1000);
    await a.p.evaluate(() => _pushSnapshot(true)); await a.p.waitForTimeout(300);
    const snap = await a.p.evaluate(() => JSON.stringify(_snapshot()).length > 0 && !/crew-face|__crew-face/.test(JSON.stringify(_snapshot())) && Object.keys(localStorage).filter(k => /face/i.test(k)).length === 0);
    C.check('faces are in Cache Storage only: no localStorage key, nothing in the progress snapshot', snap);
    await a.ctx.close();
  }

  // ── 14. Step 3 · The cheer (In the Band): the band's faces, a double tap, the page's button, the sheet, New Balls ───────────────────────────────
  const p_ck = p => p.evaluate(() => _playerCk);
  const tapBand = (p, ckk, n) => p.evaluate(([k, times]) => {
    const b = [...document.querySelectorAll('#crew-body .cr-fcs button.cr-face')].find(e => (e.getAttribute('onclick') || '').indexOf("'" + k + "'") > 0);
    for (let i = 0; i < times; i++) b.click();
    return !!b;
  }, [ckk, n || 1]);
  const stubCalls = (p, n) => calls(p, n);
  const noEmoji = p => p.evaluate(() => ['#crewplayer-body', '#hist-overlay', '#aaToast', '#crew-body .cr-week'].map(s => (document.querySelector(s) || { innerHTML: '' }).innerHTML).join(' ').indexOf('\u{1F44F}') < 0);
  if (on(14)) {
    // the band
    const a = await open(browser, {});
    await goCrew(a.p); await a.p.waitForTimeout(500);
    const b = await a.p.evaluate(() => {
      const faces = [...document.querySelectorAll('#crew-body .cr-fcs .cr-face')];
      const ring = f => /rgb\(\d+, \d+, \d+\) 0px 0px 0px 4px/.test(getComputedStyle(f).boxShadow) || /0px 0px 0px 4px/.test(getComputedStyle(f).boxShadow);
      return { n: faces.length, w: faces.map(f => Math.round(f.getBoundingClientRect().width)), held: faces.filter(f => f.classList.contains('held')).map(f => f.getAttribute('aria-label')),
        ring: faces.filter(ring).length, news: [...document.querySelectorAll('#crew-body .cr-new')].map(e => e.closest('.cr-fc').querySelector('.cr-face').getAttribute('aria-label')),
        hint: (document.querySelector('#crew-body .cr-hint') || {}).textContent, foot: !!document.querySelector('#crew-body .cr-bandfoot .go'), more: (document.querySelector('#crew-body .cr-face.more') || {}).textContent,
        facesTag: document.querySelector('#crew-body .cr-faces').tagName };
    });
    C.check('the band: six faces and "+2", forty pixels each (a door apiece)', b.n === 7 && b.w.slice(0, 6).every(x => x >= 38 && x <= 40) && b.facesTag === 'DIV', JSON.stringify(b.w));
    C.check('…a mint ring only on the two who held this week (you and Mina), nobody else', b.held.length === 2 && /^You|Alex|Your/.test(b.held[0]) && /Mina/.test(b.held[1]) && b.ring === 2, JSON.stringify([b.held, b.ring]));
    C.check('…NEW only under Leila, who joined this week', b.news.length === 1 && /Leila/.test(b.news[0]) && /new in the crew/.test(b.news[0]), JSON.stringify(b.news));
    C.check('…the one-time line, and "In the crew ›" still opens the list', b.hint === 'Double-tap a face to cheer. Tap to see their page.' && b.foot && b.more === '+2', JSON.stringify([b.hint, b.foot]));
    C.check('…the hint counts this visit as its first sighting', await a.p.evaluate(id => localStorage.getItem(id + '_cheerhint') === '1', H.ID));
    C.check('…the band\'s own words carry no 👏 character', await noEmoji(a.p));
    // one tap: the page, after a beat
    await tapBand(a.p, CK.mina, 1); await a.p.waitForTimeout(110);
    const early = await screenNow(a.p);
    await a.p.waitForTimeout(450);
    C.check('one tap on a face waits (250 ms), then opens that page; it cheers nobody', early === 'screen-crew' && (await screenNow(a.p)) === 'screen-crewplayer' && (await p_ck(a.p)) === CK.mina && (await stubCalls(a.p, 'crew_cheer')).length === 0, early);
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(400);
    // your own face: no wait, no cheer
    await a.p.evaluate(() => [...document.querySelectorAll('#crew-body .cr-fcs button.cr-face')].find(e => e.classList.contains('me')).click()); await a.p.waitForTimeout(90);
    C.check('your own face opens your own page at once', (await screenNow(a.p)) === 'screen-crewplayer' && (await p_ck(a.p)) === 'me');
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(400);
    // a double tap: a cheer, no word, a burst, a toast, never the page
    await tapBand(a.p, CK.reza, 2);
    await a.p.waitForTimeout(150);
    const burst = await a.p.evaluate(() => ({ n: document.querySelectorAll('#crew-body .cr-burst i').length, svg: document.querySelectorAll('#crew-body .cr-burst i svg').length, text: (document.querySelector('#crew-body .cr-burst') || { textContent: '' }).textContent }));
    await a.p.waitForTimeout(700);
    const ch = await stubCalls(a.p, 'crew_cheer'), tt = await toast(a.p);
    C.check('a double tap cheers ONCE, with no word, and never also opens the page', ch.length === 1 && ch[0].p_subject === CK.reza && ch[0].p_word === undefined && (await screenNow(a.p)) === 'screen-crew', JSON.stringify(ch));
    C.check('…a small burst of clap icons over the face (drawn as icons, no emoji character)', burst.n === 3 && burst.svg === 3 && burst.text === '', JSON.stringify(burst));
    C.check('…and the toast says "Cheer sent to Reza" with the clap icon', !!tt && tt.text === 'Cheer sent to Reza' && await a.p.evaluate(() => !!document.querySelector('#aaToast .aa-toast-ic svg')), JSON.stringify(tt));
    C.check('…the hint is gone for good after the first double tap', (await a.p.evaluate(id => localStorage.getItem(id + '_cheerhint'), H.ID)) === 'done' && !(await a.p.$('#crew-body .cr-hint')));
    // the same face again: told politely, no second call; and the server's own refusal
    await a.p.waitForTimeout(500);
    await tapBand(a.p, CK.reza, 2); await a.p.waitForTimeout(500);
    const t2 = await toast(a.p);
    C.check('the second cheer the same day is refused politely, and not even sent', (await stubCalls(a.p, 'crew_cheer')).length === 1 && !!t2 && t2.text === 'You cheered Reza today. Come back tomorrow.', JSON.stringify(t2));
    await a.p.evaluate(() => { _cheered = {}; crewPagesClear(); }); await a.p.waitForTimeout(100);
    await a.p.waitForTimeout(500);
    await tapBand(a.p, CK.reza, 2); await a.p.waitForTimeout(700);
    const t3 = await toast(a.p);
    C.check('…the server\'s own "already today" says the same words', (await stubCalls(a.p, 'crew_cheer')).length === 2 && !!t3 && t3.text === 'You cheered Reza today. Come back tomorrow.', JSON.stringify(t3));
    // the page now says so
    await shown(a.p, CK.reza);
    C.check('…and Reza\'s page says "Cheered today", quietly, with no button', await a.p.evaluate(() => { const s = document.querySelector('#crewplayer-body .pl-cheered'); return !!s && /Cheered today/.test(s.textContent) && !document.querySelector('#crewplayer-body .pl-cheer') && !!s.querySelector('svg') && s.tagName === 'SPAN'; }));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(400);
    // a triple tap is one cheer and no page
    await tapBand(a.p, CK.mina, 3); await a.p.waitForTimeout(700);
    C.check('a triple tap is still one cheer and no page', (await stubCalls(a.p, 'crew_cheer')).filter(x => x.p_subject === CK.mina).length === 1 && (await screenNow(a.p)) === 'screen-crew');
    C.check('no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
  }
  if (on(14)) {
    // the hint's life: three visits, then gone
    const a = await open(browser, {});
    await goCrew(a.p); await a.p.waitForTimeout(300);
    const seen = [!!(await a.p.$('#crew-body .cr-hint'))];
    for (let i = 0; i < 3; i++) { await a.p.evaluate(() => { goTo('home'); goTo('crew'); }); await a.p.waitForTimeout(300); seen.push(!!(await a.p.$('#crew-body .cr-hint'))); }
    C.check('the hint shows on the first three visits to Crew and not on the fourth', seen.join() === 'true,true,true,false', seen.join());
    await a.p.evaluate(() => { _bellAt = 0; return refreshBell(); }); await a.p.waitForTimeout(400);
    C.check('…a redraw within a visit does not use one up', await a.p.evaluate(id => localStorage.getItem(id + '_cheerhint') === '3', H.ID));
    C.check('…the key is the athlete\'s own, so a second phone does not say it again', await a.p.evaluate(() => Object.keys(_snapshot()).some(k => /_cheerhint$/.test(k))));
    await a.ctx.close();
    // not for the athlete who cannot cheer
    const n = await open(browser, { b: { me: { answer: null, can_post: false } } });
    await goCrew(n.p); await n.p.waitForTimeout(300);
    C.check('not in the crew: no hint (nothing to teach)', !(await n.p.$('#crew-body .cr-hint')));
    await tapBand(n.p, CK.reza, 2); await n.p.waitForTimeout(700);
    const t = await toast(n.p);
    C.check('…and a double tap is the join offer, with no call and no page', !!t && /Join the crew to cheer/.test(t.text) && t.action === 'Join the crew' && (await stubCalls(n.p, 'crew_cheer')).length === 0 && (await screenNow(n.p)) === 'screen-crew', JSON.stringify(t));
    await n.ctx.close();
    const u = await open(browser, { b: { me: { answer: 'yes', under13: true, can_post: false } } });
    await goCrew(u.p); await u.p.waitForTimeout(300);
    C.check('under 13: no ring of doors, no hint, no double tap', await u.p.evaluate(() => !document.querySelector('#crew-body .cr-fcs') && !document.querySelector('#crew-body .cr-hint') && !document.querySelector('#crew-body button.cr-face')));
    await u.ctx.close();
    // a server without stage96: the band is the one button it was
    const o = await open(browser, { b: { noPages: true } });
    await goCrew(o.p);
    C.check('without stage96: the band is exactly the old one (26 px, one button, no hint, no NEW)', await o.p.evaluate(() => { const b = document.querySelector('#crew-body .cr-faces'); return b.tagName === 'BUTTON' && !document.querySelector('#crew-body .cr-fc, #crew-body .cr-hint, #crew-body .cr-new') && Math.round(document.querySelector('#crew-body .cr-face').getBoundingClientRect().width) === 26; }));
    await o.ctx.close();
  }
  if (on(14)) {
    // reduced motion: the cheer goes, the toast says it, and nothing flies
    const a = await open(browser, { opts: { reduced: true } });
    await goCrew(a.p); await a.p.waitForTimeout(300);
    await tapBand(a.p, CK.reza, 2); await a.p.waitForTimeout(120);
    const b = await a.p.evaluate(() => document.querySelectorAll('.cr-burst').length);
    await a.p.waitForTimeout(600);
    C.check('reduced motion: the cheer goes and the toast says it, with no burst at all', b === 0 && (await stubCalls(a.p, 'crew_cheer')).length === 1 && /Cheer sent to Reza/.test((await toast(a.p) || {}).text || ''), String(b));
    await a.ctx.close();
  }
  if (on(14)) {
    // the page: the button, the sheet, the word, the New Balls line, what was received
    const rec = [{ ck: CK.reza, who: 'Reza K.', fv: null, coach: false, word: 'that sled push looked heavy', day: today }, { ck: null, who: 'Coach', fv: null, coach: true, word: null, day: today },
      { ck: CK.sara, who: 'Sara T.', fv: null, coach: false, word: null, day: iso(now - 86400e3 * 2).slice(0, 10) }];
    const a = await open(browser, { stub: { crewPages: { [CK.mina]: { cheers: { season: 12, recent: rec, mine_today: false } }, [CK.leila]: { new: true }, me: { cheers: { season: 3, recent: rec.slice(0, 2) } } } } });
    await goCrew(a.p);
    await shown(a.p, CK.mina);
    const pg = await a.p.evaluate(() => { const b = document.querySelector('#crewplayer-body .pl-cheer'); const cs = b && getComputedStyle(b); return { text: b && b.textContent.trim(), svg: !!(b && b.querySelector('svg')), tag: b && b.tagName,
      bg: cs && cs.backgroundColor, n: document.querySelectorAll('#crewplayer-body .pl-cheer').length, newline: !!document.querySelector('#crewplayer-body .pl-new'),
      secs: [...document.querySelectorAll('#crewplayer-body .prog-sec')].map(d => d.textContent.trim()), rows: [...document.querySelectorAll('#crewplayer-body .pl-ch')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
      doors: [...document.querySelectorAll('#crewplayer-body button.pl-ch')].length }; });
    C.check('someone else\'s page: one clay button, the clap icon and the word "Cheer" (not "Well played")', pg.text === 'Cheer' && pg.svg && pg.tag === 'BUTTON' && pg.n === 1 && !/Well played/i.test(await text(a.p, '#crewplayer-body')) && /^rgb\(19\d, 8\d, 4\d\)$/.test(pg.bg), JSON.stringify([pg.text, pg.bg]));
    C.check('…no New Balls line for someone who has been here a while', !pg.newline);
    C.check('…"Cheers this season · 12" and the last week\'s: the face, the name (Coach for Amir), the word, the day', pg.secs.includes('Cheers this season · 12') && pg.rows.length === 3 && /Reza K\./.test(pg.rows[0]) && /that sled push looked heavy/.test(pg.rows[0]) && /Today/.test(pg.rows[0]), JSON.stringify(pg.rows));
    C.check('…Coach\'s row says Coach with Amir\'s photo, a word-less row shows the day alone, and a name is a door', /Coach/.test(pg.rows[1]) && /Sara T\./.test(pg.rows[2]) && /\d|Today|Yesterday|[A-Z][a-z]+day/.test(pg.rows[2]) && pg.doors === 3, JSON.stringify(pg.rows));
    C.check('…no 👏 character on the page', await noEmoji(a.p));
    // the sheet
    await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(350);
    const sh = await a.p.evaluate(() => { const ta = document.querySelector('#hist-overlay .ch-txt'); return { title: document.querySelector('#hist-overlay .readiness-title').textContent.trim(), eyebrow: document.querySelector('#hist-overlay .readiness-eyebrow').textContent,
      max: ta.getAttribute('maxlength'), dir: ta.getAttribute('dir'), cnt: document.querySelector('#hist-overlay .cr-cnt').textContent, note: (document.querySelector('#hist-overlay .cr-note') || {}).textContent, go: document.querySelector('#hist-overlay .ch-go').textContent,
      icon: !!document.querySelector('#hist-overlay .readiness-title svg'), open: document.getElementById('hist-overlay').classList.contains('visible') }; });
    C.check('the sheet "Cheer Mina": a word field (100, auto direction), a live count, the 7-day line, Send, and the clap icon', sh.open && sh.title === 'Cheer Mina' && sh.max === '100' && sh.dir === 'auto' && sh.cnt === '0 / 100' && sh.note === 'The crew can see your word for 7 days.' && sh.go === 'Send' && sh.icon, JSON.stringify(sh));
    const ink = await a.p.evaluate(() => {
      const probe = v => { const e = document.createElement('i'); e.style.color = 'var(' + v + ')'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; };
      const ic = document.querySelector('#hist-overlay .ch-ic'), pb = document.querySelector('#hist-overlay .readiness-title svg');
      return { ic: getComputedStyle(ic).color, green: probe('--green-ink'), clay: probe('--clay-ink'), vb: pb.getAttribute('viewBox'), fill: pb.getAttribute('fill'), ext: /href|url\(|<image|<use/.test(pb.outerHTML) };
    });
    C.check('the sheet\'s clap icon is green ink (not clay), the Phosphor hands-clapping drawing (256 box, fill currentColor) and points at nothing outside the page', ink.ic === ink.green && ink.ic !== ink.clay && ink.vb === '0 0 256 256' && ink.fill === 'currentColor' && !ink.ext, JSON.stringify(ink));
    C.check('…no 👏 character in the sheet', await noEmoji(a.p));
    await a.p.fill('#hist-overlay .ch-txt', 'nice work'); await a.p.waitForTimeout(100);
    C.check('…the count follows what is typed', (await text(a.p, '#hist-overlay .cr-cnt')) === '9 / 100');
    await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(900);
    const sent = (await stubCalls(a.p, 'crew_cheer'))[0], tt = await toast(a.p);
    C.check('Send: crew_cheer with her key and your word; the sheet closes; "Cheer sent to Mina"', !!sent && sent.p_subject === CK.mina && sent.p_word === 'nice work' && !(await a.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))) && !!tt && tt.text === 'Cheer sent to Mina', JSON.stringify([sent, tt]));
    const after = await a.p.evaluate(() => ({ cheered: !!document.querySelector('#crewplayer-body .pl-cheered'), btn: !!document.querySelector('#crewplayer-body .pl-cheer'), tile: [...document.querySelectorAll('#crewplayer-body .pl-tiles > div')].map(d => d.innerText.replace(/\s+/g, ' ').trim()).pop(),
      first: (document.querySelector('#crewplayer-body .pl-ch') || {}).innerText }));
    C.check('…the page now says "Cheered today", the season count moved, and your cheer is the first on her list', after.cheered && !after.btn && /^13 cheers this season/.test(after.tile) && /You/.test(after.first) && /nice work/.test(after.first), JSON.stringify(after));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    // a word that is too long (the field stops it; a pasted one is the server's to refuse), and a line that never answers
    await shown(a.p, CK.reza);
    await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(300);
    await a.p.evaluate(() => { const ta = document.querySelector('#hist-overlay .ch-txt'); ta.removeAttribute('maxlength'); ta.value = 'x'.repeat(101); ta.dispatchEvent(new Event('input', { bubbles: true })); });
    await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(600);
    const long = await a.p.evaluate(() => ({ err: document.querySelector('#hist-overlay .cr-err').textContent, go: !document.querySelector('#hist-overlay .ch-go').disabled, open: document.getElementById('hist-overlay').classList.contains('visible') }));
    C.check('a word over 100: "That is over 100 characters.", the sheet stays and Send is ready', long.err === 'That is over 100 characters.' && long.go && long.open, JSON.stringify(long));
    await a.p.evaluate(() => { window.__STUB.mode = 'offline'; });
    await a.p.evaluate(() => { document.querySelector('#hist-overlay .ch-txt').value = 'ok'; });
    await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(600);
    C.check('no signal: the word stays, and it says to tap Send again', await a.p.evaluate(() => /No signal/.test(document.querySelector('#hist-overlay .cr-err').textContent) && document.querySelector('#hist-overlay .ch-txt').value === 'ok'));
    await a.p.evaluate(() => { window.__STUB.mode = 'online'; closeHistorySheet(); });
    // the server says it was already done today (the page was a day old): the same polite words, and the page catches up
    await a.p.evaluate(ckk => { window.__STUB.cheerLog = { [ckk]: { word: null } }; }, CK.sara);
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    await shown(a.p, CK.sara);
    await a.p.evaluate(ckk => { const c = crewPageGet(ckk); c.p.cheers.mine_today = false; crewPagesSave(); _cheered = {}; _playerHTML = ''; renderPlayerPage(); }, CK.sara);
    await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(300);
    await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(700);
    const tc = await toast(a.p);
    C.check('"already cheered today" from the server: the sheet closes, the words are polite, the button is the quiet line', !!tc && tc.text === 'You cheered Sara today. Come back tomorrow.' && !(await a.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))) && !!(await a.p.$('#crewplayer-body .pl-cheered')), JSON.stringify(tc));
    // a person who has left
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    await shown(a.p, CK.omid);
    await a.p.evaluate(() => { window.__STUB.cheerErr = 'crew:gone'; });
    await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(300);
    await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(800);
    const tg = await toast(a.p);
    C.check('a person who left: "Omid is not in the crew any more.", and back to Crew', !!tg && tg.text === 'Omid is not in the crew any more.' && (await screenNow(a.p)) === 'screen-crew', JSON.stringify(tg));
    await a.p.evaluate(() => { window.__STUB.cheerErr = null; });
    // New Balls: the line above the button, only for someone new
    await shown(a.p, CK.leila);
    const nb = await a.p.evaluate(() => { const l = document.querySelector('#crewplayer-body .pl-new'), b = document.querySelector('#crewplayer-body .pl-cheer'); return { text: l && l.innerText.replace(/\s+/g, ' ').trim(), above: !!(l && b && (l.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
    C.check('New Balls: "Joined this week. Say hello." sits above the button on a new member\'s page', !!nb.text && /Joined this week\. Say hello\./.test(nb.text) && nb.above, JSON.stringify(nb));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    // your own page: nothing to cheer, but what you received is there
    await a.p.evaluate(() => openPlayer('me')); await a.p.waitForTimeout(600);
    C.check('your own page: no Cheer button, and the cheers you got are listed (a number and the last week)', !(await a.p.$('#crewplayer-body .pl-cheer')) && (await secs(a.p)).includes('Cheers this season · 3') && (await a.p.$$('#crewplayer-body .pl-ch')).length === 2);
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
  }
  if (on(14)) {
    // 30 a day, and yourself
    const a = await open(browser, { stub: { cheerCap: 1 } });
    await goCrew(a.p);
    await shown(a.p, CK.mina); await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(250); await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(600);
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(250);
    await shown(a.p, CK.reza); await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(250); await click(a.p, '#hist-overlay .ch-go'); await a.p.waitForTimeout(600);
    C.check('the daily limit is said in plain words and the sheet stays', await a.p.evaluate(() => document.querySelector('#hist-overlay .cr-err').textContent === 'That is 30 cheers today. More tomorrow.' && document.getElementById('hist-overlay').classList.contains('visible')));
    const own = await a.p.evaluate(() => crewErrWords('crew:own'));
    C.check('…and a cheer to yourself has its words', own === 'You cannot cheer yourself.', own);
    await a.ctx.close();
    // a non-member who has a page cached cannot open the sheet
    const n = await open(browser, { b: { me: { answer: null, can_post: false } } });
    await waitTab(n.p); await n.p.evaluate(ckk => { crewPagePut(ckk, { ck: ckk, who: 'Mina S.', first: 'Mina', numbers: {}, cheers: { season: 1, recent: [] } }); openCheer(ckk); }, CK.mina); await n.p.waitForTimeout(300);
    C.check('not in the crew: openCheer is the join offer, never a sheet', !!(await toast(n.p)) && /Join the crew to cheer/.test((await toast(n.p)).text) && !(await n.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))));
    await n.ctx.close();
  }
  if (on(14)) {
    // the guide, and the 👏 character is in none of what was added
    const a = await open(browser, {});
    await goCrew(a.p);
    const g = await a.p.evaluate(() => buildAppGuideCards());
    const para = (g.match(/<p>To cheer someone[\s\S]*?<\/p>/) || [''])[0];
    C.check('the guide names the controls in words: Cheer, Send, the double tap, the ring, NEW', /<strong>Cheer<\/strong>/.test(para) && /<strong>Send<\/strong>/.test(para) && /double-tap a face/.test(para) && /A ring round a face/.test(para) && /<strong>NEW<\/strong>/.test(para), para.slice(0, 120));
    C.check('…in plain words: no em-dash, no semicolon, no 👏', !/[—;]/.test(para) && para.indexOf('\u{1F44F}') < 0);
    await a.ctx.close();
  }

  // ── 15. the pictures (390 px): the band with faces and a NEW, your page with a photo and the Only you marks, the cheer sheet, the photo sheet ──────────────
  if (on(15)) {
    // made-up faces: a coloured ground, a head and a pair of shoulders (never a real person)
    const people = [[CK.alex, '#5E8C7A', '#E3B896', '#2E4A57', 1101], [CK.mina, '#9CB4C6', '#C98E6A', '#8C3D2B', 1102], [CK.reza, '#7C6B8F', '#E8C4A0', '#26322C', 1103],
      [CK.ali1, '#A9B79A', '#B07B58', '#3C5A7A', 1104], [CK.leila, '#C9A99A', '#E0B493', '#4F6B52', 1105], [CK.sara, '#6E8FA3', '#D8A682', '#7A4E3A', 1106]];
    const faceImgs = p => p.evaluate(rows => {
      const out = {};
      rows.forEach(([k, bg, skin, shirt, fv]) => {
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, bg); g.addColorStop(1, '#1F3A30'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        x.fillStyle = shirt; x.beginPath(); x.ellipse(64, 132, 48, 40, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = skin; x.fillRect(56, 70, 16, 18); x.beginPath(); x.ellipse(64, 52, 21, 25, 0, 0, Math.PI * 2); x.fill();
        out[k] = { fv, b64: c.toDataURL('image/jpeg', 0.85).split(',')[1] };
      });
      window.__STUB.faces = out;
    }, people);
    const fvs = Object.fromEntries(people.map(r => [r[0], r[4]]));
    const b = withFaces(fvs);
    const brd = board().map(r => (r.ck in fvs ? { ...r, fv: fvs[r.ck] } : r));
    const pages = { me: { who: 'Alex R.', lv: 19, art: 'voltage', kinds: { achievement: false, honour: true, level: true, week: true }, fv: 1101,
      achievements: [{ id: 'a:1', name: 'Back to Back', day: '2026-10-12', signed: [], signed_n: 0 }, { id: 'a:2', name: 'The Notebook', day: '2026-10-03', signed: [], signed_n: 0 }],
      honours: [{ month: '2026-09-01', honour: 'sessions', value: { n: 14 } }],
      cheers: { season: 3, recent: [{ ck: CK.reza, who: 'Reza K.', fv: 1103, coach: false, word: 'that sled push looked heavy', day: today }, { ck: null, who: 'Coach', fv: null, coach: true, word: null, day: today }] } },
      [CK.mina]: { who: 'Mina S.', lv: 14, art: 'iron', fv: 1102, achievements: [{ id: 'a:1', name: 'Back to Back', day: '2026-10-12', signed: [], signed_n: 0 }, { id: 'a:2', name: 'The Notebook', day: '2026-10-03', signed: [], signed_n: 0 }],
        cheers: { season: 12, recent: [{ ck: CK.reza, who: 'Reza K.', fv: 1103, coach: false, word: 'that sled push looked heavy', day: today }, { ck: null, who: 'Coach', fv: null, coach: true, word: null, day: today }, { ck: CK.sara, who: 'Sara T.', fv: 1106, coach: false, word: null, day: iso(now - 86400e3 * 2).slice(0, 10) }], mine_today: false } },
      [CK.leila]: { who: 'Leila M.', new: true, fv: 1105 } };
    const a = await open(browser, { stub: { bell: b, crewBoard: brd, crewPages: pages } });
    await faceImgs(a.p);
    await goCrew(a.p); await a.p.waitForTimeout(1500);
    await a.p.evaluate(() => window.scrollTo(0, 0)); await a.p.waitForTimeout(200);
    await a.p.screenshot({ path: path.join(out, 'crew-band-faces-light-390.png') });
    await shown(a.p, CK.mina); await a.p.waitForTimeout(900);
    await click(a.p, '#crewplayer-body .pl-cheer'); await a.p.waitForTimeout(500);
    await a.p.fill('#hist-overlay .ch-txt', 'great week, Mina'); await a.p.waitForTimeout(200);
    await a.p.screenshot({ path: path.join(out, 'cheer-sheet-light-390.png') });
    await a.p.evaluate(() => closeHistorySheet()); await a.p.waitForTimeout(200);
    await a.p.screenshot({ path: path.join(out, 'player-other-cheer-light-390.png'), fullPage: true });
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    await a.p.evaluate(() => openPlayer('me')); await a.p.waitForTimeout(600);
    await click(a.p, '#crewplayer-body .pl-fbtn'); await a.p.waitForTimeout(400);
    const mk = (W, H) => a.p.evaluate(async ([w, h]) => {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
      const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#7FA89A'); g.addColorStop(1, '#1F3A30'); x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = '#2E4A57'; x.beginPath(); x.ellipse(w / 2, h * 1.02, w * .36, h * .3, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#E3B896'; x.fillRect(w * .46, h * .52, w * .08, h * .12); x.beginPath(); x.ellipse(w / 2, h * .42, w * .16, h * .2, 0, 0, Math.PI * 2); x.fill();
      const blob = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.9)); const dt = new DataTransfer(); dt.items.add(new File([blob], 'me.jpg', { type: 'image/jpeg' }));
      const input = document.getElementById('fp-file'); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    }, [W, H]);
    await mk(900, 1200); await a.p.waitForTimeout(500);
    await a.p.screenshot({ path: path.join(out, 'photo-sheet-light-390.png') });
    await a.ctx.close();
    const d = await open(browser, { opts: { dark: true }, stub: { bell: b, crewBoard: brd, crewPages: pages } });
    await faceImgs(d.p);
    await goCrew(d.p); await d.p.waitForTimeout(900);
    await d.p.evaluate(() => openPlayer('me')); await d.p.waitForTimeout(1200);
    await d.p.screenshot({ path: path.join(out, 'player-own-photo-dark-390.png'), fullPage: true });
    await d.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await d.p.waitForTimeout(400);
    await d.p.evaluate(() => window.scrollTo(0, 0)); await d.p.waitForTimeout(200);
    await d.p.screenshot({ path: path.join(out, 'crew-band-faces-dark-390.png') });
    await d.ctx.close();
    // 320 px: the band keeps its seven faces inside the screen
    const n = await open(browser, { opts: { w: 320, h: 640 }, stub: { bell: b, crewBoard: brd, crewPages: pages } });
    await faceImgs(n.p);
    await goCrew(n.p); await n.p.waitForTimeout(1000);
    const nw = await n.p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, w: [...document.querySelectorAll('#crew-body .cr-fcs .cr-face')].map(f => Math.round(f.getBoundingClientRect().width)), right: Math.max(...[...document.querySelectorAll('#crew-body .cr-fcs .cr-fc')].map(f => f.getBoundingClientRect().right)) }));
    C.check('320 px: the band\'s seven faces fit inside the band, none under 30 px, and nothing scrolls sideways', nw.sw <= nw.iw && nw.w.every(x => x >= 29) && nw.right <= nw.iw - 16, JSON.stringify(nw));
    await n.p.screenshot({ path: path.join(out, 'crew-band-faces-light-320.png') });
    await n.ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
