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
//
// Step 4: This cycle (Week Bars): a bar cut into the plan's sessions, held weeks solid, the sessions beyond the plan as dots with +N, now, weeks before joining, the week sheet (yours with
// names and minutes, theirs with the date and Session or Extra only). Section 16.
// Step 5: Player facts for every racket sport and for people who play none: the rows each sport asks for, chips and fields in place, my_game_set one call at a time, a refusal and no signal,
// Instagram checked, the sport line, the programme's sport badge never on a page. Section 17. Step 6: the face stack (2, 5 with +2, none), Cheered by, the one-time note on the first
// like of an achievement's line. Section 18. Section 19 takes the pictures for steps 4 to 6.
// `--only=14,15` runs just those sections (everything after a "// ── N." line is wrapped in on(N)).
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

  // ── 16. Step 4 · This cycle (Week Bars): a bar for every plan week, and the sessions beyond the plan as small dots ────────────────────────────────
  // The server's cycle (CONTRACT 3): per week { w, plan, done, held, extra, now, before, days[] }. Another person's days carry only `day` and `extra`;
  // your own carry the session's title and minutes as well. Made-up people and dates only.
  const cDays = (rows, own) => rows.map(([day, extra, title, mins]) => (own ? { day, title, mins, extra } : { day, extra }));
  const cycleOf = (own, o = {}) => ({ n: 3, from: '2026-10-05', to: '2026-11-08', per_week: 3, weeks: [
    { w: 1, from: '2026-10-05', to: '2026-10-11', plan: 3, done: o.before1 ? 0 : 3, held: !o.before1, extra: 0, now: false, before: !!o.before1,
      days: o.before1 ? [] : cDays([['2026-10-05', false, 'Lower · Power', 64], ['2026-10-07', false, 'Upper · Push', 55], ['2026-10-09', false, 'Full Body', 60]], own) },
    { w: 2, from: '2026-10-12', to: '2026-10-18', plan: 3, done: 3, held: true, extra: 1, now: false,
      days: cDays([['2026-10-12', false, 'Lower · Power', 62], ['2026-10-14', false, 'Upper · Push', 58], ['2026-10-16', false, 'Full Body', 61], ['2026-10-17', true, 'Easy Spin', 30]], own) },
    { w: 3, from: '2026-10-19', to: '2026-10-25', plan: 3, done: 2, held: false, extra: 1, now: true,
      days: cDays([['2026-10-19', false, 'Lower · Power', 64], ['2026-10-21', false, 'Upper · Push', 52], ['2026-10-22', true, 'Core Circuit', 20]], own) },
    { w: 4, from: '2026-10-26', to: '2026-11-01', plan: 3, done: 0, held: false, extra: 0, now: false, days: [] },
    { w: 5, from: '2026-11-02', to: '2026-11-08', plan: 3, done: 0, held: false, extra: 0, now: false, days: [] }] });
  const cycleShot = p => p.evaluate(() => ({
    head: (document.querySelector('#crewplayer-body .pl-cyc') ? document.querySelector('#crewplayer-body .pl-cyc').previousElementSibling : document.createElement('i')).textContent.replace(/\s+/g, ' ').trim(),
    rows: [...document.querySelectorAll('#crewplayer-body .pl-wb')].map(r => ({ n: r.querySelector('.pl-wn').textContent, segs: r.querySelectorAll('.pl-bar i').length, on: r.querySelectorAll('.pl-bar i.on').length,
      dots: r.querySelectorAll('.pl-xd').length, xn: (r.querySelector('.pl-xn') || {}).textContent || '', rt: [...r.querySelectorAll('.pl-rt > *')].map(e => e.textContent.trim()).join(' '), tag: r.tagName, cls: r.className })),
    card: (document.querySelector('#crewplayer-body .pl-cyc') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(),
    note: !!document.querySelector('#crewplayer-body .pl-tail') }));
  const nth = (p, sel, i) => p.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return false; e.click(); return true; }, [sel, i]);
  const sheetRows = p => p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), eyebrow: (document.querySelector('#hist-overlay .readiness-eyebrow') || {}).textContent, title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent,
    sub: (document.querySelector('#hist-overlay .readiness-sub') || {}).textContent, rows: [...document.querySelectorAll('#hist-overlay .pl-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
    quiet: (document.querySelector('#hist-overlay .pl-quiet') || {}).textContent }));
  if (on(16)) {
    const a = await open(browser, { stub: { crewPages: { [CK.mina]: { cycle: cycleOf(false) } } } });
    await goCrew(a.p); await shown(a.p, CK.mina);
    const s = await cycleShot(a.p);
    C.check('another person\'s page: "This cycle · 8 of 15" (plan sessions only) and "+2 extra" beside it', /^This cycle · 8 of 15/.test(s.head) && /\+2 extra$/.test(s.head), s.head);
    C.check('…the plan\'s own sessions are the segments: a 3-day plan draws 3, filled for each one done', s.rows[2].segs === 3 && s.rows[2].on === 2 && s.rows[3].segs === 3 && s.rows[3].on === 0 && s.rows[4].segs === 3, JSON.stringify(s.rows));
    C.check('…a held week is ONE continuous green bar, and says Held', s.rows[0].segs === 1 && s.rows[0].on === 1 && /^held$/i.test(s.rows[0].rt) && s.rows[1].segs === 1 && s.rows[1].on === 1 && /^held/i.test(s.rows[1].rt), JSON.stringify(s.rows.slice(0, 2)));
    C.check('…an extra session is a small round dot after the bar, one each, with "+1" (also after a held bar)', s.rows[1].dots === 1 && s.rows[1].xn === '+1' && s.rows[2].dots === 1 && s.rows[2].xn === '+1' && s.rows[0].dots === 0 && s.rows[0].xn === '' && s.rows[3].dots === 0, JSON.stringify(s.rows.map(r => [r.n, r.dots, r.xn])));
    C.check('…the current week says "now" and "2 of 3"; the others do not', /^now 2 of 3$/i.test(s.rows[2].rt) && s.rows.filter(r => /now/.test(r.rt)).length === 1 && s.rows[3].rt === '' && s.rows[4].rt === '', JSON.stringify(s.rows.map(r => r.rt)));
    C.check('…no weekday letters or names anywhere on the bars (SES-17)', !/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s.card) && !(await a.p.$('#crewplayer-body .pl-cyc .pl-wd')), s.card);
    C.check('…the card says which cycle and how long, and a week with sessions is a button (the empty ones are not)', /Cycle 3/.test(s.card) && /3 a week · 5 weeks/.test(s.card) && s.rows.map(r => r.tag).join() === 'BUTTON,BUTTON,BUTTON,DIV,DIV' && s.note, s.card);
    // a tap on a week: the date, and Session or Extra, and nothing else
    await nth(a.p, '#crewplayer-body .pl-wb', 1); await a.p.waitForTimeout(350);
    const w2 = await sheetRows(a.p);
    C.check('a tap on week 2 opens its sessions by date, with Session or Extra only', w2.on && w2.title === 'Week 2' && w2.eyebrow === 'This cycle' && /3 of 3 sessions · 1 extra · Held/.test(w2.sub) && w2.rows.length === 4
      && w2.rows[0] === 'Mon 12 Oct Session' && w2.rows[2] === 'Fri 16 Oct Session' && w2.rows[3] === 'Sat 17 Oct Extra', JSON.stringify(w2));
    C.check('…never a title, never minutes, and nothing about the crew\'s switches', !/Lower|Upper|Full Body|Easy Spin|min\b/.test(w2.rows.join(' ')) && !w2.quiet, JSON.stringify(w2.rows));
    await a.p.evaluate(() => closeHistorySheet());
    C.check('…a day the page has no sessions for is no button, so a tap on it does nothing', await a.p.evaluate(() => { document.querySelectorAll('#crewplayer-body .pl-wb')[3].click(); return !document.getElementById('hist-overlay').classList.contains('visible'); }));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
    // even if a title or minutes came for someone else's day, the page never draws them
    const d = await open(browser, { stub: { crewPages: { [CK.mina]: { cycle: cycleOf(true) } } } });
    await goCrew(d.p); await shown(d.p, CK.mina);
    await nth(d.p, '#crewplayer-body .pl-wb', 1); await d.p.waitForTimeout(350);
    const w2d = await sheetRows(d.p);
    C.check('defence: a title and minutes sent for someone else are never drawn', w2d.rows.length === 4 && !/Lower|Upper|Full Body|Easy Spin|min\b/.test(w2d.rows.join(' ')) && w2d.rows[3] === 'Sat 17 Oct Extra', JSON.stringify(w2d.rows));
    await d.ctx.close();
    // your own page: the name, the date, the minutes, and Extra on an extra
    const o = await open(browser, { stub: { crewPages: { me: { cycle: cycleOf(true) } } } });
    await goCrew(o.p); await o.p.evaluate(() => openPlayer('me')); await o.p.waitForTimeout(700);
    const so = await cycleShot(o.p);
    C.check('your own page: the same bars, "now 2 of 3" on this week, and "2 of 3" is not said on weeks that are still to come', /^This cycle · 8 of 15/.test(so.head) && so.rows[2].segs === 3 && so.rows[2].on === 2 && so.rows[3].rt === '' && so.rows[4].rt === '', JSON.stringify(so.rows.map(r => r.rt)));
    await nth(o.p, '#crewplayer-body .pl-wb', 2); await o.p.waitForTimeout(350);
    const w3 = await sheetRows(o.p);
    C.check('…your week lists the session\'s name, the date and the minutes, and "Extra" on an extra', w3.title === 'Week 3' && w3.rows.length === 3 && w3.rows[0] === 'Lower · Power Mon 19 Oct · 64 min' && w3.rows[2].toLowerCase() === 'core circuit thu 22 oct · 20 min extra', JSON.stringify(w3.rows));
    C.check('…and says what the crew sees of it', /The crew sees these dates and nothing else/.test(w3.quiet || ''), w3.quiet);
    await o.p.evaluate(() => closeHistorySheet());
    // the session switch off: the block is still yours, wearing "Only you"
    await o.p.evaluate(() => { const c = crewPageGet('me'); c.p.kinds = Object.assign({}, c.p.kinds, { session: false }); crewPagesSave(); _playerHTML = ''; renderPlayerPage(); });
    C.check('your session switch off: the block stays and wears "Only you"', /Only you/.test((await cycleShot(o.p)).head) && !/Only you/.test((await cycleShot(o.p)).card), (await cycleShot(o.p)).head);
    await o.ctx.close();
    // a person who joined in week 2: week 1 is empty and grey and is not in the count
    const j = await open(browser, { stub: { crewPages: { [CK.mina]: { cycle: cycleOf(false, { before1: true }) } } } });
    await goCrew(j.p); await shown(j.p, CK.mina);
    const sj = await cycleShot(j.p);
    C.check('weeks before they joined are drawn empty and grey, say nothing, and are not in the count ("5 of 12")', /^This cycle · 5 of 12/.test(sj.head) && /before/.test(sj.rows[0].cls) && sj.rows[0].segs === 3 && sj.rows[0].on === 0 && sj.rows[0].rt === '' && sj.rows[0].tag === 'DIV', JSON.stringify([sj.head, sj.rows[0]]));
    await j.ctx.close();
    // no cycle (the switch is off, or a page with none): no block at all
    const n = await open(browser, {});
    await goCrew(n.p); await shown(n.p, CK.mina);
    C.check('a page with no cycle (their switch is off) draws no This cycle block', !(await n.p.$('#crewplayer-body .pl-cyc')) && !(await secs(n.p)).some(x => /This cycle/.test(x)));
    await n.ctx.close();
    // 320 px, with an extra and the longest right column
    const t = await open(browser, { opts: { w: 320, h: 640 }, stub: { crewPages: { [CK.mina]: { cycle: cycleOf(false) } } } });
    await goCrew(t.p); await shown(t.p, CK.mina);
    const t3 = await t.p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bar: Math.round(document.querySelectorAll('#crewplayer-body .pl-wb')[2].querySelector('.pl-bar').getBoundingClientRect().width) }));
    C.check('320 px: the bars fit, nothing scrolls sideways, and the bar keeps room', t3.sw <= t3.iw && t3.bar >= 60, JSON.stringify(t3));
    await t.ctx.close();
  }

  // ── 17. Step 5 · Player facts, for every racket sport and for people who play none ────────────────────────────────────────────────────────────────────
  const GAME_FULL = { sports: ['padel', 'tennis'], hand: 'right', backhand: 'two', side: 'left', plays_at: 'club', club: 'Enghelab, Tehran', training_for: ['strength', 'physique'], working_on: 'a faster first step', ig: 'sara.k' };
  const factRows = p => p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-facts .pl-f')].map(r => [(r.querySelector('.pl-fl') || {}).textContent, ((r.querySelector('.pl-fv') || r.querySelector('.pl-fo') || {}).textContent || '').trim()]));
  const labels = p => p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-facts .pl-f .pl-fl')].map(e => e.textContent.trim()));
  const setGame = (p, g) => p.evaluate(game => { const c = crewPageGet('me'); c.p.game = game; crewPagesSave(); _gameOpen = null; _gameStart = false; _playerHTML = ''; renderPlayerPage(); }, g);
  const gameCalls = p => calls(p, 'my_game_set');
  const lastGame = async p => { const c = await gameCalls(p); return c.length ? c[c.length - 1].p : null; };
  const chipOf = (p, text) => p.evaluate(t => { const b = [...document.querySelectorAll('#crewplayer-body .pl-fo .pl-chip')].find(x => x.textContent.trim() === t); if (!b) return false; b.click(); return true; }, text);
  const rowTap = (p, label) => p.evaluate(l => { const b = [...document.querySelectorAll('#crewplayer-body .pl-facts button.pl-f, #crewplayer-body .pl-facts .pl-f > button.pl-fl')].find(x => (x.querySelector('.pl-fl') || x).textContent.trim() === l); if (!b) return false; b.click(); return true; }, label);
  if (on(17)) {
    const prog = H.fixture(); prog.sport = { badge: '\u{1FA79} Knee rehab' };
    const a = await open(browser, { opts: { prog }, stub: { crewPages: { [CK.mina]: { game: GAME_FULL }, [CK.reza]: { game: { sports: [], training_for: ['strength', 'health'], club: 'Home gym' } }, [CK.sara]: { game: null } } } });
    await goCrew(a.p); await shown(a.p, CK.mina);
    const f = await a.p.evaluate(() => ({ sub: (document.querySelector('#crewplayer-body .pl-sub') || {}).textContent, ig: (() => { const x = document.querySelector('#crewplayer-body .pl-facts a.pl-fv'); return x ? [x.getAttribute('href'), x.getAttribute('target'), x.getAttribute('rel'), x.textContent] : null; })(),
      editable: document.querySelectorAll('#crewplayer-body .pl-facts button').length, all: document.getElementById('crewplayer-body').textContent }));
    const rows = await factRows(a.p);
    C.check('someone else\'s Player facts: only rows with a value, in words (Plays, Hand with the backhand, Side, Level, Club, Trains for, Working on, Instagram)',
      JSON.stringify(rows) === JSON.stringify([['Plays', 'Padel, Tennis'], ['Hand', 'Right-handed, two-handed backhand'], ['Side', 'Left side'], ['Level', 'Club'], ['Club', 'Enghelab, Tehran'], ['Trains for', 'Strength, Physique'], ['Working on', 'a faster first step'], ['Instagram', '@sara.k']]), JSON.stringify(rows));
    C.check('…the sport line under the name is the first sport and its side ("Padel · left side")', f.sub === 'Padel · left side', f.sub);
    C.check('…the Instagram name is a link out (a new tab, no opener) and nothing on the card is editable', !!f.ig && f.ig[0] === 'https://instagram.com/sara.k' && f.ig[1] === '_blank' && /noopener/.test(f.ig[2]) && f.ig[3] === '@sara.k' && f.editable === 0, JSON.stringify(f.ig));
    C.check('the programme\'s sport badge never appears on a page ("Knee rehab", "Tennis Performance")', !/Knee rehab|Tennis Performance/.test(f.all) && /Knee rehab/.test(await a.p.evaluate(() => (DATA.sport || {}).badge || '')));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    await shown(a.p, CK.reza);
    const r2 = await factRows(a.p), sub2 = await a.p.evaluate(() => !!document.querySelector('#crewplayer-body .pl-sub'));
    C.check('someone who plays no sport: a card of what they have ("Club", "Trains for"), no Plays, no Hand, and no sport line', JSON.stringify(r2) === JSON.stringify([['Club', 'Home gym'], ['Trains for', 'Strength, Health']]) && !sub2, JSON.stringify(r2));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(300);
    await shown(a.p, CK.sara);
    C.check('someone with no game at all: no card, and still no sport line from the programme\'s badge', !(await a.p.$('#crewplayer-body .pl-facts')) && !(await a.p.$('#crewplayer-body .pl-sub')) && !/Knee rehab|Tennis Performance/.test(await text(a.p, '#crewplayer-body')));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
  }
  if (on(17)) {
    // YOUR page: an empty card is one row; each row edits in place; only the rows the sports ask for
    const a = await open(browser, {});
    await goCrew(a.p); await a.p.evaluate(() => openPlayer('me')); await a.p.waitForTimeout(700);
    const add = await a.p.evaluate(() => ({ t: (document.querySelector('#crewplayer-body .pl-fadd') || {}).textContent, n: document.querySelectorAll('#crewplayer-body .pl-facts .pl-f').length, note: (document.querySelector('#crewplayer-body .pl-facts + .pl-note') || {}).textContent }));
    C.check('your empty card is one row, "Add your game"', /Add your game/.test(add.t || '') && add.n === 1 && /Any racket sport, or none/.test(add.note || ''), JSON.stringify(add));
    await click(a.p, '#crewplayer-body .pl-fadd'); await a.p.waitForTimeout(300);
    const l0 = await labels(a.p), chips0 = await a.p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-fo .pl-chip')].map(b => b.textContent + ':' + b.getAttribute('aria-pressed')));
    C.check('…it opens on Plays, with every racket sport and None; with no sport it asks Hand, Trains for, Club, Working on, Instagram, and not Backhand, Side or Level',
      JSON.stringify(l0) === JSON.stringify(['Plays', 'Hand', 'Club', 'Trains for', 'Working on', 'Instagram']) && chips0.length === 8 && chips0[7] === 'None:false' && chips0.join().indexOf('Table tennis') > 0 && chips0.join().indexOf('Beach tennis') > 0, JSON.stringify([l0, chips0]));
    await chipOf(a.p, 'Tennis'); await a.p.waitForTimeout(500);
    const l1 = await labels(a.p), g1 = await lastGame(a.p);
    C.check('Tennis: Backhand and Level appear, Side does not; my_game_set was sent with the sport', JSON.stringify(l1) === JSON.stringify(['Plays', 'Hand', 'Backhand', 'Level', 'Club', 'Trains for', 'Working on', 'Instagram']) && !!g1 && JSON.stringify(g1.sports) === '["tennis"]', JSON.stringify([l1, g1]));
    await chipOf(a.p, 'Padel'); await a.p.waitForTimeout(500);
    const l2 = await labels(a.p), line2 = await text(a.p, '#crewplayer-body .pl-sub');
    C.check('Padel as well: Side appears too, Plays stays open for more, and the sport line under your name is the first sport', JSON.stringify(l2) === JSON.stringify(['Plays', 'Hand', 'Backhand', 'Side', 'Level', 'Club', 'Trains for', 'Working on', 'Instagram']) && line2 === 'Tennis', JSON.stringify([l2, line2]));
    await rowTap(a.p, 'Plays'); await a.p.waitForTimeout(250);
    C.check('…the Plays row says what is chosen when it is closed', JSON.stringify((await factRows(a.p))[0]) === '["Plays","Tennis, Padel"]', JSON.stringify((await factRows(a.p))[0]));
    // one answer: a chip saves at once and the row closes; a second tap on the same answer takes it back
    await rowTap(a.p, 'Hand'); await a.p.waitForTimeout(250); await chipOf(a.p, 'Left-handed'); await a.p.waitForTimeout(500);
    const g2 = await lastGame(a.p), h2 = (await factRows(a.p)).find(r => r[0] === 'Hand');
    C.check('Hand: one tap saves it and closes the row (Left-handed)', !!g2 && g2.hand === 'left' && JSON.stringify(h2) === '["Hand","Left-handed"]' && !(await a.p.$('#crewplayer-body .pl-fo')), JSON.stringify([g2, h2]));
    await rowTap(a.p, 'Backhand'); await a.p.waitForTimeout(250); await chipOf(a.p, 'Two hands'); await a.p.waitForTimeout(400);
    await rowTap(a.p, 'Side'); await a.p.waitForTimeout(250); await chipOf(a.p, 'Right'); await a.p.waitForTimeout(400);
    await rowTap(a.p, 'Level'); await a.p.waitForTimeout(250); await chipOf(a.p, 'Competition'); await a.p.waitForTimeout(400);
    const g3 = await lastGame(a.p), s3 = await text(a.p, '#crewplayer-body .pl-sub');
    C.check('Backhand, Side and Level the same way', !!g3 && g3.backhand === 'two' && g3.side === 'right' && g3.plays_at === 'competition' && g3.hand === 'left' && JSON.stringify(g3.sports) === '["tennis","padel"]', JSON.stringify(g3));
    // dropping tennis takes the backhand with it; the sport line becomes Padel and its side
    await rowTap(a.p, 'Plays'); await a.p.waitForTimeout(250); await chipOf(a.p, 'Tennis'); await a.p.waitForTimeout(500);
    const l4 = await labels(a.p), g4 = await lastGame(a.p), s4 = await text(a.p, '#crewplayer-body .pl-sub');
    C.check('Tennis taken off: no Backhand row, the backhand is cleared on the server, and the line reads "Padel · right side"', JSON.stringify(l4) === JSON.stringify(['Plays', 'Hand', 'Side', 'Level', 'Club', 'Trains for', 'Working on', 'Instagram']) && g4.backhand === null && s4 === 'Padel · right side', JSON.stringify([l4, g4.backhand, s4]));
    // fields
    await rowTap(a.p, 'Club'); await a.p.waitForTimeout(350);
    const fld = await a.p.evaluate(() => { const i = document.getElementById('pl-gin'); return i ? { max: i.maxLength, size: parseFloat(getComputedStyle(i).fontSize), focus: document.activeElement === i } : null; });
    C.check('a text row opens a field with its limit (Club 40), typed at 16 px so the phone does not zoom, and the keyboard on it', !!fld && fld.max === 40 && fld.size >= 16 && fld.focus, JSON.stringify(fld));
    await a.p.fill('#pl-gin', 'Enghelab, Tehran'); await click(a.p, '#crewplayer-body .pl-gsave'); await a.p.waitForTimeout(500);
    const g5 = await lastGame(a.p);
    C.check('Save sends the club and closes the row', !!g5 && g5.club === 'Enghelab, Tehran' && JSON.stringify((await factRows(a.p)).find(r => r[0] === 'Club')) === '["Club","Enghelab, Tehran"]');
    await rowTap(a.p, 'Instagram'); await a.p.waitForTimeout(350);
    const n0 = (await gameCalls(a.p)).length;
    await a.p.fill('#pl-gin', 'bad name!'); await click(a.p, '#crewplayer-body .pl-gsave'); await a.p.waitForTimeout(400);
    const bad = await a.p.evaluate(() => ({ err: (document.getElementById('pl-gerr') || {}).textContent, val: (document.getElementById('pl-gin') || {}).value }));
    C.check('an Instagram name that is not one is said in words, kept in the field, and never sent', /letters, numbers, dots and underscores/.test(bad.err || '') && bad.val === 'bad name!' && (await gameCalls(a.p)).length === n0, JSON.stringify(bad));
    await a.p.fill('#pl-gin', '@sara.k'); await a.p.press('#pl-gin', 'Enter'); await a.p.waitForTimeout(500);
    const g6 = await lastGame(a.p);
    C.check('…@sara.k saves as "sara.k" (the Enter key too), and the card shows @sara.k', !!g6 && g6.ig === 'sara.k' && JSON.stringify((await factRows(a.p)).find(r => r[0] === 'Instagram')) === '["Instagram","@sara.k"]', JSON.stringify(g6 && g6.ig));
    // Trains for: several
    await rowTap(a.p, 'Trains for'); await a.p.waitForTimeout(250); await chipOf(a.p, 'Strength'); await a.p.waitForTimeout(300); await chipOf(a.p, 'Health'); await a.p.waitForTimeout(500);
    const g7 = await lastGame(a.p);
    C.check('Trains for takes several, and stays open while you choose', JSON.stringify(g7.training_for) === '["strength","health"]' && !!(await a.p.$('#crewplayer-body .pl-fo')));
    C.check('…and the reply from the server is what the card then holds', await a.p.evaluate(() => JSON.stringify(crewPageGet('me').p.game) === JSON.stringify(window.__STUB.myGame)));
    // a refusal puts the last saved card back; so does no signal
    await a.p.evaluate(() => { window.__STUB.gameFail = 1; });
    await rowTap(a.p, 'Level'); await a.p.waitForTimeout(250); await chipOf(a.p, 'For fun'); await a.p.waitForTimeout(700);
    const tf = await toast(a.p), lv = (await factRows(a.p)).find(r => r[0] === 'Level');
    C.check('a refusal: "That did not save. Try again." and the card goes back to what was saved (Competition)', !!tf && tf.text === 'That did not save. Try again.' && JSON.stringify(lv) === '["Level","Competition"]', JSON.stringify([tf, lv]));
    await a.p.evaluate(() => { window.__STUB.mode = 'offline'; });
    await rowTap(a.p, 'Level'); await a.p.waitForTimeout(250); await chipOf(a.p, 'For fun'); await a.p.waitForTimeout(700);
    const to = await toast(a.p), lv2 = (await factRows(a.p)).find(r => r[0] === 'Level');
    C.check('no signal: it says so and the card goes back', !!to && /^No signal/.test(to.text) && JSON.stringify(lv2) === '["Level","Competition"]', JSON.stringify([to, lv2]));
    await a.p.evaluate(() => { window.__STUB.mode = 'online'; });
    // the page is not redrawn under a field that has the keyboard
    await rowTap(a.p, 'Working on'); await a.p.waitForTimeout(350);
    await a.p.fill('#pl-gin', 'my first step');
    await a.p.evaluate(() => { const c = crewPageGet('me'); c.p.numbers.sessions = 77; crewPagePut('me', c.p); renderPlayerPage(); });
    const mid = await a.p.evaluate(() => ({ focus: document.activeElement && document.activeElement.id === 'pl-gin', val: (document.getElementById('pl-gin') || {}).value, tile: document.querySelector('#crewplayer-body .pl-tiles').innerText.replace(/\s+/g, ' ') }));
    C.check('a redraw of the page waits while a field has the keyboard: the text and the cursor stay', mid.focus && mid.val === 'my first step' && !/77/.test(mid.tile), JSON.stringify(mid));
    await a.p.evaluate(() => document.getElementById('pl-gin').blur()); await a.p.waitForTimeout(700);
    const late = await a.p.evaluate(() => ({ tile: document.querySelector('#crewplayer-body .pl-tiles').innerText.replace(/\s+/g, ' '), val: (document.getElementById('pl-gin') || {}).value }));
    C.check('…and the page catches up a moment after it lets go, with the typed text kept', /77/.test(late.tile) && late.val === 'my first step', JSON.stringify(late));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
  }
  if (on(17)) {
    // which rows each sport asks for, on your own page
    const a = await open(browser, {});
    await goCrew(a.p); await a.p.evaluate(() => openPlayer('me')); await a.p.waitForTimeout(700);
    const rowsFor = async (sports, extra) => { await setGame(a.p, Object.assign({ sports }, extra || {})); await a.p.waitForTimeout(150); return labels(a.p); };
    const L = x => x.join('|');
    C.check('tennis asks Backhand and not Side', L(await rowsFor(['tennis'])) === 'Plays|Hand|Backhand|Level|Club|Trains for|Working on|Instagram');
    C.check('padel asks Side and not Backhand', L(await rowsFor(['padel'])) === 'Plays|Hand|Side|Level|Club|Trains for|Working on|Instagram');
    C.check('pickleball and beach tennis ask both', L(await rowsFor(['pickleball'])) === 'Plays|Hand|Backhand|Side|Level|Club|Trains for|Working on|Instagram' && L(await rowsFor(['beach_tennis'])) === 'Plays|Hand|Backhand|Side|Level|Club|Trains for|Working on|Instagram');
    C.check('squash, badminton and table tennis ask neither (and Level)', L(await rowsFor(['squash'])) === 'Plays|Hand|Level|Club|Trains for|Working on|Instagram' && L(await rowsFor(['badminton', 'table_tennis'])) === 'Plays|Hand|Level|Club|Trains for|Working on|Instagram');
    C.check('no sport asks neither Backhand, Side nor Level (even if the server still holds an old one)', L(await rowsFor([], { club: 'Home gym', backhand: 'two', side: 'left', plays_at: 'fun' })) === 'Plays|Hand|Club|Trains for|Working on|Instagram'
      && JSON.stringify((await factRows(a.p))[0]) === '["Plays","None"]');
    // someone else's page never shows an old backhand for a sport that has none
    await a.p.evaluate(() => { _playerHTML = ''; });
    // under 13: no Instagram row on your own page
    await a.ctx.close();
    const u = await open(browser, { b: { me: { under13: true, can_post: false } } });
    await waitTab(u.p); await u.p.evaluate(() => openPlayer('me')); await u.p.waitForTimeout(700);
    await u.p.evaluate(() => { const c = crewPageGet('me'); if (!c) return; c.p.under13 = true; c.p.game = { sports: ['tennis'], hand: 'right', training_for: [] }; crewPagesSave(); _gameOpen = null; _playerHTML = ''; renderPlayerPage(); });
    const lu = await labels(u.p);
    C.check('under 13: your own card has no Instagram row', lu.length > 0 && lu.indexOf('Instagram') < 0 && lu.indexOf('Hand') >= 0, lu.join('|'));
    await u.ctx.close();
    // the guide names the controls
    const g = await open(browser, {});
    await goCrew(g.p);
    const gd = await g.p.evaluate(() => buildAppGuideCards());
    C.check('the guide names This cycle, Held, the dots and Player facts, in plain words (no em-dash, no semicolon)', /<strong>This cycle<\/strong>/.test(gd) && /<strong>Held<\/strong>/.test(gd) && /small dot after the bar/.test(gd) && /<strong>Player facts<\/strong>/.test(gd)
      && !/[—;]/.test((gd.match(/<strong>This cycle<\/strong>[\s\S]*?your Instagram name[^<]*<\/p>/) || [''])[0]));
    await g.ctx.close();
  }

  // ── 18. Step 6 · Signatures as a Face Stack, and the one-time note on the first like ──────────────────────────────────────────────────────────────────
  const SG = (ck, who) => ({ ck, who, fv: null });
  const ACH6 = [
    { id: 'achievement:back_to_back', name: 'Back to Back', day: '2026-10-12', size: 'win', signed: [SG(CK.reza, 'Reza K.'), SG(CK.leila, 'Leila M.')], signed_n: 2 },
    { id: 'achievement:the_notebook', name: 'The Notebook', day: '2026-10-03', size: 'win', signed: [SG(CK.reza, 'Reza K.'), SG(CK.leila, 'Leila M.'), SG(CK.sara, 'Sara T.'), SG(CK.omid, 'Omid P.'), SG(null, 'Coach')], signed_n: 5 },
    { id: 'achievement:first_blood', name: 'First Blood', day: '2026-09-28', size: 'win', signed: [], signed_n: 0 },
    { id: 'achievement:straight_talk', name: 'Straight Talk', day: '2026-09-20', size: 'win', signed: [SG(CK.reza, 'Reza K.'), SG(CK.leila, 'Leila M.'), SG(CK.sara, 'Sara T.'), SG(CK.omid, 'Omid P.'), SG(CK.ali1, 'Ali B.')], signed_n: 8 }];
  const achRows = p => p.evaluate(() => [...document.querySelectorAll('#crewplayer-body .pl-list .pl-ar')].map(r => ({ t: r.querySelector('.t').textContent, tag: r.tagName, faces: r.querySelectorAll('.pl-stk .cr-fl').length, more: (r.querySelector('.pl-mo') || {}).textContent || '',
    dt: r.querySelector('.pl-dt').textContent, ini: [...r.querySelectorAll('.pl-stk .cr-fl')].map(f => f.textContent.trim()).join(',') })));
  if (on(18)) {
    const a = await open(browser, { stub: { crewPages: { [CK.mina]: { achievements: ACH6 } } } });
    await goCrew(a.p); await shown(a.p, CK.mina);
    const r = await achRows(a.p);
    C.check('the face stack: two signed shows two faces and no number; five shows three faces and "+2"; nobody shows no stack and is no button',
      r.length === 3 && r[0].faces === 2 && r[0].more === '' && r[0].tag === 'BUTTON' && r[1].faces === 3 && r[1].more === '+2' && r[1].tag === 'BUTTON' && r[2].faces === 0 && r[2].more === '' && r[2].tag === 'DIV', JSON.stringify(r));
    C.check('…the faces are those who signed, in the order sent (initials until their photo is here), and the date is on the right', r[0].ini === 'RK,LM' && r[1].ini === 'RK,LM,ST' && r[0].dt === '12 Oct' && r[2].dt === '28 Sep', JSON.stringify(r.map(x => [x.ini, x.dt])));
    C.check('…and one line says "Tap an achievement to see every cheer."', await a.p.evaluate(() => /Tap an achievement to see every cheer\./.test(document.getElementById('crewplayer-body').textContent)));
    const ov = await a.p.evaluate(() => { const e = document.querySelectorAll('#crewplayer-body .pl-stk .cr-fl')[2], s = document.querySelectorAll('#crewplayer-body .pl-stk .cr-fl')[3]; return { w: Math.round(e.getBoundingClientRect().width), gap: Math.round(document.querySelectorAll('#crewplayer-body .pl-stk .cr-fl')[1].getBoundingClientRect().left - document.querySelectorAll('#crewplayer-body .pl-stk .cr-fl')[0].getBoundingClientRect().left), s: !!s }; });
    C.check('…each face is 24 px and the next sits 6 px over it (18 px apart)', ov.w === 24 && ov.gap === 18, JSON.stringify(ov));
    // the sheet
    await nth(a.p, '#crewplayer-body .pl-list button.pl-ar', 1); await a.p.waitForTimeout(350);
    const sh = await sheetRows(a.p);
    C.check('a tap on the stack opens "Cheered by" with every name', sh.on && sh.title === 'Cheered by' && sh.eyebrow === 'The Notebook' && /3 Oct/.test(sh.sub) && sh.rows.length === 5
      && sh.rows[0].indexOf('Reza K.') >= 0 && sh.rows[3].indexOf('Omid P.') >= 0 && /Coach/.test(sh.rows[4]) && !sh.quiet, JSON.stringify(sh));
    C.check('…Amir shows as Coach with his photo, and the names are doors', await a.p.evaluate(() => { const rows = [...document.querySelectorAll('#hist-overlay .pl-sgr')]; return rows.length === 5 && rows.every(x => x.tagName === 'BUTTON') && !!rows[4].querySelector('.cr-ini.am'); }));
    await nth(a.p, '#hist-overlay .pl-sgr', 0); await a.p.waitForTimeout(600);
    C.check('a name in it opens that person\'s page (the sheet closes), and ← comes back to this page', (await screenNow(a.p)) === 'screen-crewplayer' && /Reza K\./.test(await plain(a.p, '#crewplayer-body .pl-name')) && !(await a.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))), await plain(a.p, '#crewplayer-body .pl-name'));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(500);
    C.check('…back on Mina\'s page', /Mina S\./.test(await plain(a.p, '#crewplayer-body .pl-name')));
    // "All 4": the stacks are in the sheet too, and a signer list opens from it with ‹ Back to the list
    await click(a.p, '#crewplayer-body .pl-list button.pl-row:not(.pl-ar)'); await a.p.waitForTimeout(350);
    const all = await a.p.evaluate(() => ({ rows: [...document.querySelectorAll('#hist-overlay .pl-ar')].map(r => [r.querySelectorAll('.pl-stk .cr-fl').length, (r.querySelector('.pl-mo') || {}).textContent || '']), title: document.querySelector('#hist-overlay .readiness-title').textContent }));
    C.check('"All 4" has the stacks too (the fourth: five faces sent, eight signed, so three faces and "+5")', all.rows.length === 4 && all.rows[3][0] === 3 && all.rows[3][1] === '+5' && all.rows[2][0] === 0, JSON.stringify(all));
    await nth(a.p, '#hist-overlay .pl-ar', 3); await a.p.waitForTimeout(350);
    const s8 = await sheetRows(a.p);
    C.check('…the fourth lists the five it was sent and says "and 3 more"', s8.title === 'Cheered by' && s8.rows.length === 5 && s8.quiet === 'and 3 more', JSON.stringify(s8));
    C.check('…and ‹ Back goes to the list', await a.p.evaluate(() => { const b = document.querySelector('#hist-overlay .sheet-back'); if (!b) return false; b.click(); return /achievements/.test(document.querySelector('#hist-overlay .readiness-title').textContent); }));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
    // your own page draws the stack too; under 13 sees no doors but still the names
    const o = await open(browser, { stub: { crewPages: { me: { achievements: ACH6 } } } });
    await goCrew(o.p); await o.p.evaluate(() => openPlayer('me')); await o.p.waitForTimeout(700);
    const ro = await achRows(o.p);
    C.check('your own page shows the stack on your achievements', ro.length === 3 && ro[1].faces === 3 && ro[1].more === '+2', JSON.stringify(ro.map(x => [x.faces, x.more])));
    await o.ctx.close();
    const u = await open(browser, { b: { me: { under13: true, can_post: false } }, stub: { crewPages: { me: { under13: true, achievements: ACH6 } } } });
    await waitTab(u.p); await u.p.evaluate(() => openPlayer('me')); await u.p.waitForTimeout(700);
    await nth(u.p, '#crewplayer-body .pl-list button.pl-ar', 1); await u.p.waitForTimeout(350);
    C.check('under 13: the names are shown and none of them is a door', await u.p.evaluate(() => { const r = [...document.querySelectorAll('#hist-overlay .pl-sgr')]; return r.length === 5 && r.every(x => x.tagName === 'DIV'); }));
    await u.ctx.close();
  }
  if (on(18)) {
    // the one-time note: the first like on a Bell line that holds an achievement
    const dayAgo = iso(now - 86400e3).slice(0, 10);
    const withAch = (o = {}) => {
      const b = bell(o);
      b.items.push(Object.assign({ t: 'line', key: CK.mina + ':' + dayAgo, who: 'Mina S.', me: false, at: iso(now - 20 * 3600e3), kudos: { n: 0, mine: false, names: [] }, parts: [{ k: 'achievement', name: 'back_to_back' }] }, o.noPages ? {} : { fv: null }));
      b.items.push(Object.assign({ t: 'line', key: CK.reza + ':' + dayAgo, who: 'Reza K.', me: false, at: iso(now - 21 * 3600e3), kudos: { n: 0, mine: false, names: [] }, parts: [{ k: 'achievement', name: 'the_notebook' }] }, o.noPages ? {} : { fv: null }));
      return b;
    };
    const likeLine = async (p, key) => { const ok = await p.evaluate(k => { const b = document.querySelector('.cr-react[data-row="' + k + '"] button[data-kd]'); if (!b) return false; b.click(); return true; }, key); await p.waitForTimeout(700); return ok; };
    const minaKey = CK.mina + ':' + dayAgo, rezaKey = CK.reza + ':' + dayAgo, plainKey = CK.mina + ':' + today;
    const a = await open(browser, { stub: { bell: withAch(), crewBoard: board() } });
    await goCrew(a.p);
    const ok1 = await likeLine(a.p, plainKey), t0 = await toast(a.p);
    C.check('a like on a line with no achievement in it says nothing', ok1 && !t0 && (await a.p.evaluate(id => localStorage.getItem(id + '_signnote'), H.ID)) === null, JSON.stringify(t0));
    await a.p.evaluate(() => { window.__STUB.mode = 'offline'; });
    const ok2 = await likeLine(a.p, minaKey), tf = await toast(a.p);
    C.check('a like that did not reach the crew says nothing of a name (and uses up nothing)', ok2 && !!tf && !/Your name stays/.test(tf.text) && (await a.p.evaluate(id => localStorage.getItem(id + '_signnote'), H.ID)) === null, JSON.stringify(tf));
    await a.p.evaluate(() => { window.__STUB.mode = 'online'; const t = document.getElementById('aaToast'); if (t) t.hidden = true; });
    await a.p.waitForTimeout(300);
    const ok3 = await likeLine(a.p, minaKey), t3 = await toast(a.p);
    C.check('the first like on an achievement\'s line: "Your name stays on Mina\'s achievement while your like is on it."', ok3 && !!t3 && t3.text === 'Your name stays on Mina\'s achievement while your like is on it.', JSON.stringify(t3));
    C.check('…it is said once: the key is set, and it is on this phone only (never in the snapshot that is saved to the cloud)', (await a.p.evaluate(id => localStorage.getItem(id + '_signnote'), H.ID)) === '1' && await a.p.evaluate(() => !Object.keys(_snapshot()).some(k => /signnote/.test(k))));
    await a.p.evaluate(() => { const t = document.getElementById('aaToast'); if (t) t.hidden = true; });
    const ok4 = await likeLine(a.p, rezaKey), t4 = await toast(a.p);
    C.check('…a second like on another achievement line says nothing', ok4 && !t4, JSON.stringify(t4));
    C.check('…no 👏 character in the note, no em-dash, no semicolon', !/[—;]/.test((t3 || {}).text || '') && ((t3 || {}).text || '').indexOf('\u{1F44F}') < 0);
    const gd6 = await a.p.evaluate(() => buildAppGuideCards());
    C.check('the guide says in plain words that a face on an achievement is someone who liked it, and that a tap shows everyone', /When someone likes the moment of an achievement on the Bell, their face shows on that achievement/.test(gd6) && /Tap the achievement to see everyone who cheered it/.test(gd6)
      && !/[—;]/.test((gd6.match(/<p>When someone likes the moment of an achievement[\s\S]*?<\/p>/) || [''])[0]));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
    // taking a like back, and a server without stage96, say nothing either
    const b = await open(browser, { stub: { bell: withAch(), crewBoard: board() } });
    await goCrew(b.p);
    await likeLine(b.p, minaKey); await b.p.evaluate(id => localStorage.removeItem(id + '_signnote'), H.ID); await b.p.evaluate(() => { const t = document.getElementById('aaToast'); if (t) t.hidden = true; });
    await likeLine(b.p, minaKey);   // the same chip again: taking the like back
    C.check('taking your like back says nothing', !(await toast(b.p)) && (await b.p.evaluate(id => localStorage.getItem(id + '_signnote'), H.ID)) === null);
    await b.ctx.close();
    const c = await open(browser, { b: { noPages: true }, stub: { bell: withAch({ noPages: true }), crewBoard: board(true) } });
    await goCrew(c.p);
    await likeLine(c.p, minaKey);
    C.check('a server without stage96 does not sign anything, so it says nothing', !(await toast(c.p)) && (await c.p.evaluate(id => localStorage.getItem(id + '_signnote'), H.ID)) === null);
    await c.ctx.close();
  }

  // ── 19. the pictures for steps 4 to 6 (390 px) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  if (on(19)) {
    const people = [[CK.alex, '#5E8C7A', '#E3B896', '#2E4A57', 1101], [CK.mina, '#9CB4C6', '#C98E6A', '#8C3D2B', 1102], [CK.reza, '#7C6B8F', '#E8C4A0', '#26322C', 1103],
      [CK.leila, '#C9A99A', '#E0B493', '#4F6B52', 1105], [CK.sara, '#6E8FA3', '#D8A682', '#7A4E3A', 1106], [CK.omid, '#A9B79A', '#B07B58', '#3C5A7A', 1107]];
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
    const bl = withFaces(fvs), brd = board().map(r => (r.ck in fvs ? { ...r, fv: fvs[r.ck] } : r));
    const sgf = (c, w) => ({ ck: c, who: w, fv: c ? fvs[c] : null });
    const ach = [
      { id: 'achievement:back_to_back', name: 'Back to Back', day: '2026-10-12', size: 'win', signed: [sgf(CK.reza, 'Reza K.'), sgf(CK.leila, 'Leila M.'), sgf(null, 'Coach'), sgf(CK.sara, 'Sara T.'), sgf(CK.omid, 'Omid P.')], signed_n: 5 },
      { id: 'achievement:the_notebook', name: 'The Notebook', day: '2026-10-03', size: 'win', signed: [sgf(CK.reza, 'Reza K.'), sgf(CK.leila, 'Leila M.')], signed_n: 2 },
      { id: 'achievement:first_blood', name: 'First Blood', day: '2026-09-28', size: 'win', signed: [], signed_n: 0 }];
    const gameMina = { sports: ['padel', 'tennis'], hand: 'right', backhand: 'two', side: 'left', plays_at: 'club', club: 'Enghelab, Tehran', training_for: ['strength', 'physique'], working_on: 'a faster first step', ig: 'mina.s' };
    const pages = {
      me: { who: 'Alex R.', lv: 19, art: 'voltage', fv: 1101, kinds: { week: true, level: true }, cycle: cycleOf(true), achievements: ach, game: { sports: ['padel'], hand: 'right', side: 'left', club: 'Enghelab, Tehran', training_for: ['strength'], working_on: 'my second serve' },
        cheers: { season: 3, recent: [] } },
      [CK.mina]: { who: 'Mina S.', lv: 14, art: 'iron', fv: 1102, cycle: cycleOf(false), game: gameMina, achievements: ach, cheers: { season: 12, recent: [], mine_today: false } } };
    // YOUR page, dark: the bars with an extra, Your game, the face stack
    const d = await open(browser, { opts: { dark: true }, stub: { bell: bl, crewBoard: brd, crewPages: pages } });
    await faceImgs(d.p);
    await goCrew(d.p); await d.p.waitForTimeout(700);
    await d.p.evaluate(() => openPlayer('me')); await d.p.waitForTimeout(1300);
    await d.p.evaluate(() => { document.getElementById('global-tabs').style.display = 'none'; });
    await d.p.screenshot({ path: path.join(out, 'player-own-game-dark-390.png'), fullPage: true });
    await rowTap(d.p, 'Working on'); await d.p.waitForTimeout(500);
    await d.p.screenshot({ path: path.join(out, 'player-own-game-edit-dark-390.png'), fullPage: true });
    await d.ctx.close();
    // someone else's page, light
    const a = await open(browser, { stub: { bell: bl, crewBoard: brd, crewPages: pages } });
    await faceImgs(a.p);
    await goCrew(a.p); await a.p.waitForTimeout(700);
    await shown(a.p, CK.mina); await a.p.waitForTimeout(1300);
    await a.p.evaluate(() => { document.getElementById('global-tabs').style.display = 'none'; });   // the fixed tab bar would sit across the middle of a full-page picture
    await a.p.screenshot({ path: path.join(out, 'player-other-game-light-390.png'), fullPage: true });
    const crop = (sel0, sel1, up) => a.p.evaluate(([s0, s1, u]) => { const t = document.querySelector(s0).getBoundingClientRect(), e = document.querySelector(s1).getBoundingClientRect(); return { x: 0, y: Math.max(0, Math.round(t.top + scrollY - u)), width: 390, height: Math.round(e.bottom - t.top + u + 14) }; }, [sel0, sel1, up]);
    await a.p.screenshot({ path: path.join(out, 'cycle-bars-extra-light-390.png'), fullPage: true, clip: await crop('#crewplayer-body .pl-cyc', '#crewplayer-body .pl-cyc + .pl-tail', 50) });
    await a.p.screenshot({ path: path.join(out, 'face-stack-light-390.png'), fullPage: true, clip: await crop('#crewplayer-body .pl-ar', '#crewplayer-body .pl-list + .pl-tail', 52) });
    await a.p.evaluate(() => { document.getElementById('global-tabs').style.display = ''; window.scrollTo(0, 0); });
    await nth(a.p, '#crewplayer-body .pl-wb', 2); await a.p.waitForTimeout(450);
    await a.p.screenshot({ path: path.join(out, 'cycle-week-sheet-light-390.png') });
    await a.p.evaluate(() => closeHistorySheet()); await a.p.waitForTimeout(250);
    await nth(a.p, '#crewplayer-body .pl-list button.pl-ar', 0); await a.p.waitForTimeout(900);
    await a.p.screenshot({ path: path.join(out, 'face-stack-sheet-light-390.png') });
    await a.ctx.close();
  }


  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
