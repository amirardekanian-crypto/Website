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
// Someone else's cycle (CONTRACT 9b, in section 16): their page is "This week" (one bar, the extras as dots, Held) and "8 sessions this cycle", never "of N" and never a week that is over, even if the
// server were to send them; your own page keeps the whole cycle and "8 of 15".
// Step 7: @names in replies (Name Chips): the row of names above the field, its filter and order, a tap, the token that is sent, five at most, 140 counted as seen, the sheet kept above the keyboard
// (a fake visualViewport), a name as a button or as plain words, openCrewReply as a sheet opener. Section 20; section 21 takes its pictures.
// Step 8: First Serve (section 22): five steps in the one suggestion slot, the ring, the order and ticks, the slot's priority, the iPhone wait, blocked as done, what each tap does, THE PHONE'S BOX (a stand-in for
// Notification.requestPermission: shut on load, on the line, on the sheet and on the toast, once inside the button's click), never a veteran, never in the demo or the preview, 14 days, steps that do not apply,
// the guide, 320 px and dark. Section 23 takes its pictures.
// Step 9: Bring a partner (section 24): a card on YOUR page after the numbers, Get your code, the code, Copy (clipboard, execCommand, the selected box), Send on WhatsApp (the code is in the link, English and the Farsi draft),
// the friends line, no signal, a refusal, never anyone else's page, never under 13, the demo or the preview, a server without stage97, the guide, 320 px and dark. Section 25 takes its pictures.
// Step 10: the cards (section 26): Share my card opens the player card Progress has, the stamp on a session photo (the parts a post has, an old post, never on a plain photo), Share on your own session photo with that photo as
// the card's ground, what Tell the crew sends (title, mins, held), the guide. Section 27 takes its pictures.
// Step 11: the Open wall (section 28): tiles, your mint outline, the first 8 and All 14 ›, the list sheet, a tile opens the page, a server without stage96 keeps the rows, the card names nobody else. Section 29 takes its pictures.
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
  // YOUR page (CONTRACT 3 and 9b): the whole cycle, per week { w, plan, done, held, extra, now, before, days[] } (days carry the session's title and minutes), and `done` / `extra` for
  // the cycle. SOMEONE ELSE'S: { n, per_week, done, extra, weeks: [this week only] }, each day only { day, extra }: no past week (a past week that was not held is a broken week, on the
  // never list), no plan total ("8 of 15"), no title, no minutes. The app draws theirs as "This week": one bar and the line "8 sessions this cycle". Made-up people and dates only.
  const cDays = (rows, own) => rows.map(([day, extra, title, mins]) => (own ? { day, title, mins, extra } : { day, extra }));
  const wholeCycle = (own, o = {}) => ({ n: 3, from: '2026-10-05', to: '2026-11-08', per_week: 3, done: 8, extra: 2, weeks: [
    { w: 1, from: '2026-10-05', to: '2026-10-11', plan: 3, done: o.before1 ? 0 : 3, held: !o.before1, extra: 0, now: false, before: !!o.before1,
      days: o.before1 ? [] : cDays([['2026-10-05', false, 'Lower · Power', 64], ['2026-10-07', false, 'Upper · Push', 55], ['2026-10-09', false, 'Full Body', 60]], own) },
    { w: 2, from: '2026-10-12', to: '2026-10-18', plan: 3, done: 3, held: true, extra: 1, now: false,
      days: cDays([['2026-10-12', false, 'Lower · Power', 62], ['2026-10-14', false, 'Upper · Push', 58], ['2026-10-16', false, 'Full Body', 61], ['2026-10-17', true, 'Easy Spin', 30]], own) },
    { w: 3, from: '2026-10-19', to: '2026-10-25', plan: 3, done: 2, held: false, extra: 1, now: true,
      days: cDays([['2026-10-19', false, 'Lower · Power', 64], ['2026-10-21', false, 'Upper · Push', 52], ['2026-10-22', true, 'Core Circuit', 20]], own) },
    { w: 4, from: '2026-10-26', to: '2026-11-01', plan: 3, done: 0, held: false, extra: 0, now: false, days: [] },
    { w: 5, from: '2026-11-02', to: '2026-11-08', plan: 3, done: 0, held: false, extra: 0, now: false, days: [] }] });
  // what the server sends about someone else: this week alone, and the cycle's two totals
  const otherCycle = (o = {}) => ({ n: 3, per_week: 3, done: o.done === undefined ? 8 : o.done, extra: o.extra === undefined ? 2 : o.extra, weeks: [
    Object.assign({ w: 3, from: '2026-10-19', to: '2026-10-25', plan: 3, done: 2, held: false, extra: 1, now: true,
      days: cDays([['2026-10-19', false], ['2026-10-21', false], ['2026-10-22', true]], false) }, o.week || {})] });
  const cycleOf = (own, o = {}) => (own ? wholeCycle(true, o) : otherCycle(o));
  const cycleShot = p => p.evaluate(() => ({
    head: (document.querySelector('#crewplayer-body .pl-cyc') ? document.querySelector('#crewplayer-body .pl-cyc').previousElementSibling : document.createElement('i')).textContent.replace(/\s+/g, ' ').trim(),
    rows: [...document.querySelectorAll('#crewplayer-body .pl-wb')].map(r => ({ n: (r.querySelector('.pl-wn') || {}).textContent || '', segs: r.querySelectorAll('.pl-bar i').length, on: r.querySelectorAll('.pl-bar i.on').length,
      dots: r.querySelectorAll('.pl-xd').length, xn: (r.querySelector('.pl-xn') || {}).textContent || '', rt: [...r.querySelectorAll('.pl-rt > *')].map(e => e.textContent.trim()).join(' '), tag: r.tagName, cls: r.className })),
    card: (document.querySelector('#crewplayer-body .pl-cyc') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(),
    foot: ((document.querySelector('#crewplayer-body .pl-cyc-f') || {}).textContent || '').trim(),
    note: !!document.querySelector('#crewplayer-body .pl-tail') }));
  const nth = (p, sel, i) => p.evaluate(([s, k]) => { const e = document.querySelectorAll(s)[k]; if (!e) return false; e.click(); return true; }, [sel, i]);
  const sheetRows = p => p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), eyebrow: (document.querySelector('#hist-overlay .readiness-eyebrow') || {}).textContent, title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent,
    sub: (document.querySelector('#hist-overlay .readiness-sub') || {}).textContent, rows: [...document.querySelectorAll('#hist-overlay .pl-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()),
    quiet: (document.querySelector('#hist-overlay .pl-quiet') || {}).textContent }));
  const pageCycle = async (cycle, who = CK.mina, extra = {}) => {
    const x = await open(browser, Object.assign({ stub: { crewPages: { [who]: { cycle } } } }, extra));
    await goCrew(x.p); if (who === 'me') { await x.p.evaluate(() => openPlayer('me')); await x.p.waitForTimeout(700); } else await shown(x.p, who);
    x.s = await cycleShot(x.p);
    return x;
  };
  if (on(16)) {
    // ── someone else's page: THIS week as one bar, and one line for the cycle
    const a = await pageCycle(cycleOf(false));
    const s = a.s;
    C.check('another person\'s page: the block is "This week" and the card holds ONE bar, with no week number', s.head === 'This week' && s.rows.length === 1 && s.rows[0].n === '', JSON.stringify([s.head, s.rows.length, s.rows[0] && s.rows[0].n]));
    C.check('…the plan\'s own sessions are the pieces: 3 drawn, 2 filled', s.rows[0].segs === 3 && s.rows[0].on === 2 && s.rows[0].tag === 'BUTTON', JSON.stringify(s.rows[0]));
    C.check('…an extra session is one small round dot after the bar with "+1"; nothing says "now", and a week not held says no "Held"', s.rows[0].dots === 1 && s.rows[0].xn === '+1' && s.rows[0].rt === '', JSON.stringify(s.rows[0]));
    C.check('…the line under it: "8 sessions this cycle · 2 extra"', s.foot === '8 sessions this cycle · 2 extra', s.foot);
    C.check('…never "of N" and never a week that is over: no "of", no W1 or W2, no "5 weeks", no total like 15', !/\bof\b/i.test(s.head + ' ' + s.card) && !/\bW\d\b|Week \d|weeks/.test(s.card) && !/\b15\b/.test(s.card), s.card);
    C.check('…the card says which cycle and how many a week, and a hint says the bar can be tapped', /^Cycle 3\s*3 a week/.test(s.card) && s.note, s.card);
    C.check('…no weekday letters or names on the bar (SES-17)', !/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/.test(s.card), s.card);
    C.check('…their posts, when there are some, are headed "Posted this week", so the page has one "This week"', (await secs(a.p)).filter(x => x === 'This week').length === 1 && !(await secs(a.p)).includes('This cycle'), (await secs(a.p)).join('|'));
    // a tap on the bar: the date, and Session or Extra, and nothing else (no "of N" either)
    await nth(a.p, '#crewplayer-body .pl-wb', 0); await a.p.waitForTimeout(350);
    const w3 = await sheetRows(a.p);
    C.check('a tap on the bar opens this week\'s days by date, with Session or Extra only', w3.on && w3.title === 'Week 3' && w3.eyebrow === 'This cycle' && w3.sub === '2 sessions · 1 extra' && w3.rows.length === 3
      && w3.rows[0] === 'Mon 19 Oct Session' && w3.rows[1] === 'Wed 21 Oct Session' && w3.rows[2] === 'Thu 22 Oct Extra', JSON.stringify(w3));
    C.check('…never a title, never minutes, never "of N", and nothing about the crew\'s switches', !/Lower|Upper|Core|min\b|\bof\b/.test(w3.rows.join(' ') + ' ' + w3.sub) && !w3.quiet, JSON.stringify(w3.rows));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();
    // a held week is one solid bar and says Held; the extras still show; with no extras at all there is no "· 2 extra" and no dot
    const h = await pageCycle(cycleOf(false, { week: { done: 3, held: true, extra: 1 }, extra: 0 }));
    C.check('a held week is ONE continuous green bar, says Held, keeps its dot, and a cycle with no extras says no "extra"', h.s.rows[0].segs === 1 && h.s.rows[0].on === 1 && h.s.rows[0].rt === 'Held' && h.s.rows[0].dots === 1 && h.s.foot === '8 sessions this cycle', JSON.stringify([h.s.rows[0], h.s.foot]));
    await h.ctx.close();
    const z = await pageCycle(cycleOf(false, { done: 1, extra: 0, week: { done: 1, extra: 0 } }));
    C.check('one session is "1 session this cycle", and a week with no extras has no dot and no "+"', z.s.foot === '1 session this cycle' && z.s.rows[0].dots === 0 && z.s.rows[0].xn === '', JSON.stringify([z.s.foot, z.s.rows[0]]));
    await z.ctx.close();
    const nn = await pageCycle(cycleOf(false, { done: 0, extra: 0, week: { done: 0, extra: 0, days: [] } }));
    C.check('a new member: "No sessions yet this cycle", the empty bar is not a button', nn.s.foot === 'No sessions yet this cycle' && nn.s.rows[0].on === 0 && nn.s.rows[0].segs === 3 && nn.s.rows[0].tag === 'DIV' && !nn.s.note, JSON.stringify([nn.s.foot, nn.s.rows[0], nn.s.note]));
    await nn.ctx.close();
    const mx = await pageCycle(cycleOf(false, { week: { extra: 7 }, extra: 7 }));
    C.check('seven extras draw five dots and the true "+7"', mx.s.rows[0].dots === 5 && mx.s.rows[0].xn === '+7' && mx.s.foot === '8 sessions this cycle · 7 extra', JSON.stringify([mx.s.rows[0], mx.s.foot]));
    await mx.ctx.close();
    // DEFENCE: the server should never send a past week, an "of" total, a title or minutes for someone else, and if it did the page still draws none of it
    const d = await pageCycle(wholeCycle(true));
    C.check('defence: a whole cycle sent for someone else (past weeks, a title and minutes) draws only this week and "8 sessions this cycle · 2 extra", no "15", no "of"', d.s.head === 'This week' && d.s.rows.length === 1 && d.s.foot === '8 sessions this cycle · 2 extra'
      && !/\bof\b/i.test(d.s.card) && !/15|W1|W2|Week 1|Week 2|5 weeks/.test(d.s.card), JSON.stringify(d.s));
    await nth(d.p, '#crewplayer-body .pl-wb', 0); await d.p.waitForTimeout(350);
    const wd = await sheetRows(d.p);
    C.check('…and a title or minutes sent for someone else\'s day are never drawn in the week\'s sheet', wd.title === 'Week 3' && wd.rows.length === 3 && !/Lower|Upper|Core|min\b|\bof\b/.test(wd.rows.join(' ') + wd.sub) && wd.rows[2] === 'Thu 22 Oct Extra', JSON.stringify(wd));
    await d.ctx.close();
    // …a past week with no `now` flag anywhere is not guessed at: no bar, but the server's own total
    const nf = await pageCycle(Object.assign(wholeCycle(false), { weeks: wholeCycle(false).weeks.map(w => Object.assign({}, w, { now: false })) }));
    C.check('defence: several weeks and none marked "now": no bar is guessed, the total line alone is drawn, headed "This cycle"', nf.s.rows.length === 0 && nf.s.head === 'This cycle' && nf.s.foot === '8 sessions this cycle · 2 extra', JSON.stringify(nf.s));
    await nf.ctx.close();
    // …no total sent: the bar alone, no line
    const nt = await pageCycle(Object.assign(otherCycle(), { done: undefined, extra: undefined }));
    C.check('no total from the server: the bar alone, and no invented line', nt.s.rows.length === 1 && nt.s.foot === '', JSON.stringify(nt.s));
    await nt.ctx.close();
    // …a week that is "before" they joined is never drawn as this week
    const bj = await pageCycle(otherCycle({ week: { before: true, done: 0, extra: 0, days: [] } }));
    C.check('defence: a week marked "before" is not drawn as this week (the total line stays)', bj.s.rows.length === 0 && bj.s.foot === '8 sessions this cycle · 2 extra', JSON.stringify(bj.s));
    await bj.ctx.close();
    // your own page: the whole cycle with "8 of 15", the name, the date, the minutes, and Extra on an extra
    const o = await pageCycle(cycleOf(true), 'me');
    const so = o.s;
    C.check('your own page keeps the whole cycle: "This cycle · 8 of 15", five week rows with W1 to W5, "now 2 of 3" on this week and nothing on the weeks to come', /^This cycle · 8 of 15/.test(so.head) && /\+2 extra$/.test(so.head) && so.rows.length === 5
      && so.rows.map(r => r.n).join() === 'W1,W2,W3,W4,W5' && so.rows[2].segs === 3 && so.rows[2].on === 2 && /^now 2 of 3$/i.test(so.rows[2].rt) && so.rows[3].rt === '' && so.rows[4].rt === '', JSON.stringify([so.head, so.rows.map(r => [r.n, r.rt])]));
    C.check('…a held week is ONE solid bar and says Held; the dots and "+1" are after the bar (also after a held one)', so.rows[0].segs === 1 && so.rows[0].on === 1 && /^held$/i.test(so.rows[0].rt) && so.rows[1].dots === 1 && so.rows[1].xn === '+1' && so.rows[2].dots === 1 && so.rows[0].dots === 0, JSON.stringify(so.rows.map(r => [r.n, r.dots, r.xn, r.rt])));
    C.check('…the card says which cycle and how long, and a week with sessions is a button (the empty ones are not)', /Cycle 3/.test(so.card) && /3 a week · 5 weeks/.test(so.card) && so.rows.map(r => r.tag).join() === 'BUTTON,BUTTON,BUTTON,DIV,DIV' && so.note, so.card);
    await nth(o.p, '#crewplayer-body .pl-wb', 2); await o.p.waitForTimeout(350);
    const w3o = await sheetRows(o.p);
    C.check('…your week lists the session\'s name, the date and the minutes, and "Extra" on an extra, and "of 3" in its subtitle', w3o.title === 'Week 3' && /^2 of 3 sessions · 1 extra/.test(w3o.sub) && w3o.rows.length === 3 && w3o.rows[0] === 'Lower · Power Mon 19 Oct · 64 min' && w3o.rows[2].toLowerCase() === 'core circuit thu 22 oct · 20 min extra', JSON.stringify(w3o));
    C.check('…and says what the crew sees of it', /The crew sees these dates and nothing else/.test(w3o.quiet || ''), w3o.quiet);
    await o.p.evaluate(() => closeHistorySheet());
    // the session switch off: the block is still yours, wearing "Only you"
    await o.p.evaluate(() => { const c = crewPageGet('me'); c.p.kinds = Object.assign({}, c.p.kinds, { session: false }); crewPagesSave(); _playerHTML = ''; renderPlayerPage(); });
    C.check('your session switch off: the block stays and wears "Only you"', /Only you/.test((await cycleShot(o.p)).head) && !/Only you/.test((await cycleShot(o.p)).card), (await cycleShot(o.p)).head);
    C.check('…no page errors on your page', !o.p.errs.length, o.p.errs.join(' | '));
    await o.ctx.close();
    // your own page, joined in week 2: week 1 is empty and grey and is not in the count
    const j = await pageCycle(cycleOf(true, { before1: true }), 'me');
    C.check('weeks before you joined are drawn empty and grey, say nothing, and are not in the count ("5 of 12")', /^This cycle · 5 of 12/.test(j.s.head) && /before/.test(j.s.rows[0].cls) && j.s.rows[0].segs === 3 && j.s.rows[0].on === 0 && j.s.rows[0].rt === '' && j.s.rows[0].tag === 'DIV', JSON.stringify([j.s.head, j.s.rows[0]]));
    await j.ctx.close();
    // no cycle (the switch is off, or a page with none): no block at all
    const n = await open(browser, {});
    await goCrew(n.p); await shown(n.p, CK.mina);
    C.check('a page with no cycle (their switch is off) draws no cycle block at all', !(await n.p.$('#crewplayer-body .pl-cyc')) && !(await secs(n.p)).some(x => /This cycle|^This week$/.test(x)));
    await n.ctx.close();
    // 320 px, with an extra and a held week
    const t = await open(browser, { opts: { w: 320, h: 640 }, stub: { crewPages: { [CK.mina]: { cycle: otherCycle({ week: { held: true, done: 3 } }) } } } });
    await goCrew(t.p); await shown(t.p, CK.mina);
    const t3 = await t.p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, bar: Math.round(document.querySelector('#crewplayer-body .pl-wb .pl-bar').getBoundingClientRect().width) }));
    C.check('320 px: the bar fits, nothing scrolls sideways, and the bar keeps room', t3.sw <= t3.iw && t3.bar >= 60, JSON.stringify(t3));
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
    await a.p.screenshot({ path: path.join(out, 'player-other-thisweek-light-390.png'), fullPage: true, clip: await crop('#crewplayer-body .pl-cyc', '#crewplayer-body .pl-cyc + .pl-tail', 50) });
    await a.p.screenshot({ path: path.join(out, 'face-stack-light-390.png'), fullPage: true, clip: await crop('#crewplayer-body .pl-ar', '#crewplayer-body .pl-list + .pl-tail', 52) });
    await a.p.evaluate(() => { document.getElementById('global-tabs').style.display = ''; window.scrollTo(0, 0); });
    await nth(a.p, '#crewplayer-body .pl-wb', 0); await a.p.waitForTimeout(450);
    await a.p.screenshot({ path: path.join(out, 'cycle-week-sheet-light-390.png') });
    await a.p.evaluate(() => closeHistorySheet()); await a.p.waitForTimeout(250);
    await nth(a.p, '#crewplayer-body .pl-list button.pl-ar', 0); await a.p.waitForTimeout(900);
    await a.p.screenshot({ path: path.join(out, 'face-stack-sheet-light-390.png') });
    await a.ctx.close();
  }

  // ── 20. Step 7 · @names in replies (Name Chips): type @, tap a name, the token goes to the server, the name opens a page ─────────────────────────────────
  // CONTRACT 5: the writer sees "@Name"; the server gets @[ck|Name] (at most 5; a ck that is not a member is plain "@name"); a row carries `mentions` for the members named, and a
  // name in a reply is a button to that page only for those, else plain text. The row of names sits ABOVE the field and is kept above the phone's keyboard with visualViewport.
  const MN = (name, cck) => '@[' + cck + '|' + name + ']';
  const mnState = p => p.evaluate(() => { const b = document.getElementById('cr-mpick'), t = document.querySelector('#hist-overlay .cr-rtxt'); return b ? { hidden: b.hidden, chips: [...b.querySelectorAll('.cr-mchip')].map(c => c.lastElementChild.textContent.trim()), note: ((b.querySelector('.cr-mnote') || {}).textContent || '').trim(),
    value: t.value, caret: t.selectionStart, focused: document.activeElement === t, cnt: (document.querySelector('#hist-overlay .cr-cnt') || {}).textContent, go: !document.querySelector('#hist-overlay .cr-go').disabled } : null; });
  const replyOpen = async (p, id) => { await p.evaluate(i => openCrewReply(i), id); await p.waitForTimeout(250); };
  const typeIn = async (p, s) => { await p.focus('#hist-overlay .cr-rtxt'); await p.keyboard.type(s); await p.waitForTimeout(120); };
  const chipTap = async (p, i) => { await p.evaluate(k => document.querySelectorAll('#cr-mpick .cr-mchip')[k].click(), i); await p.waitForTimeout(120); };
  const sentBodies = p => calls(p, 'crew_reply').then(a => a.map(x => x.p_body));
  const sendReply = async p => { await p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click()); await p.waitForTimeout(500); };
  const withReplies = (post, reps, b) => { const x = bell(b || {}); x.items.find(i => i.id === post).replies = reps; return x; };
  if (on(20)) {
    const a = await open(browser);
    await goCrew(a.p);
    await replyOpen(a.p, P_MINA);
    let s = await mnState(a.p);
    C.check('the reply sheet has a row for names ABOVE the field, hidden until an @ is typed', !!s && s.hidden && s.chips.length === 0 && await a.p.evaluate(() => { const b = document.getElementById('cr-mpick'), t = document.querySelector('#hist-overlay .cr-rtxt'); return !!(b.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING); }), JSON.stringify(s));
    await typeIn(a.p, 'Well played @');
    s = await mnState(a.p);
    C.check('typing @ opens the crew\'s names: you are left out, the people in this thread come first (Mina, whose post it is), then by name', !s.hidden && s.chips.join() === 'Mina S.,Ali B.,Ali B.,Leila M.,Omid P.,Reza K.,Sara T.', JSON.stringify(s));
    await typeIn(a.p, 'S');
    s = await mnState(a.p);
    C.check('…what follows the @ filters it (by the start of the name or of a word in it): "@S"', s.chips.join() === 'Mina S.,Sara T.', s.chips.join());
    await typeIn(a.p, 'a');
    s = await mnState(a.p);
    C.check('…"@Sa" leaves one', s.chips.join() === 'Sara T.' && !s.hidden, s.chips.join());
    const face = await a.p.evaluate(() => { const c = document.querySelector('#cr-mpick .cr-mchip'); return { fl: !!c.querySelector('.cr-fl'), w: Math.round(c.querySelector('.cr-fl').getBoundingClientRect().width), h: Math.round(c.getBoundingClientRect().height), txt: c.querySelector('.cr-fl').textContent.trim() }; });
    C.check('…each name wears its face (the initials until a picture) and is a 44 px target', face.fl && face.w === 24 && face.h >= 44 && face.txt === 'ST', JSON.stringify(face));
    await chipTap(a.p, 0);
    s = await mnState(a.p);
    C.check('a tap puts "@Sara T. " where the @ was, closes the row, keeps the keyboard (the field is focused and the caret is after it) and counts what is seen', s.value === 'Well played @Sara T. ' && s.hidden && s.focused && s.caret === 21 && s.cnt === '21 / 140' && s.go, JSON.stringify(s));
    await typeIn(a.p, 'you!');
    await sendReply(a.p);
    const b1 = await sentBodies(a.p);
    C.check('what is SENT is the token: "@[ck|Sara T.]" in the writer\'s words', b1.length === 1 && b1[0] === 'Well played ' + MN('Sara T.', CK.sara) + ' you!', JSON.stringify(b1));
    C.check('…the sheet closes and the name is a button to her page in the thread', await a.p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible') && [...document.querySelectorAll('.cr-post[data-id="' + 'bbbbbbbb-0000-4000-8000-000000000001' + '"] .cr-rep .cr-mn')].map(x => x.textContent).join() === '@Sara T.'));
    await a.p.evaluate(() => document.querySelector('.cr-mn').click()); await a.p.waitForTimeout(500);
    C.check('…and the button opens Sara\'s page', (await screenNow(a.p)) === 'screen-crewplayer' && (await plain(a.p, '#crewplayer-body .pl-name')) === 'Sara T.', await screenNow(a.p));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();

    // two people with the same name: the tap decides, not the name; a name moves with the words around it; a name that is edited is just words
    const d = await open(browser);
    await goCrew(d.p); await replyOpen(d.p, P_MINA);
    await typeIn(d.p, '@Al');
    s = await mnState(d.p);
    C.check('two members called "Ali B." are two chips', s.chips.join() === 'Ali B.,Ali B.', s.chips.join());
    await chipTap(d.p, 1);
    await d.p.evaluate(() => { const t = document.querySelector('#hist-overlay .cr-rtxt'); t.focus(); t.setSelectionRange(0, 0); });
    await typeIn(d.p, '@Al');
    s = await mnState(d.p);
    C.check('…a name already put in the reply is not offered again (a typed @ before an @ is an insertion, not an edit of the name)', s.value === '@Al@Ali B. ' && s.chips.join() === 'Ali B.', JSON.stringify(s));
    await chipTap(d.p, 0);
    await d.p.keyboard.press('End');
    await typeIn(d.p, 'Hi');
    await sendReply(d.p);
    const b2 = (await sentBodies(d.p))[0];
    C.check('…each token keeps the ck of the one who was tapped, in the order they sit in the words', b2 === MN('Ali B.', CK.ali1) + ' ' + MN('Ali B.', CK.ali2) + ' Hi', b2);
    await d.ctx.close();

    const e = await open(browser);
    await goCrew(e.p); await replyOpen(e.p, P_MINA);
    await typeIn(e.p, '@Sa'); await chipTap(e.p, 0);
    await e.p.keyboard.press('Home'); await e.p.keyboard.type('Hi '); await e.p.waitForTimeout(100);
    await e.p.keyboard.press('End'); await e.p.keyboard.type('there'); await e.p.waitForTimeout(100);
    await sendReply(e.p);
    const b3 = (await sentBodies(e.p))[0];
    C.check('text typed before a name and after it leaves it a name: "Hi @[ck|Sara T.] there"', b3 === 'Hi ' + MN('Sara T.', CK.sara) + ' there', b3);
    await e.ctx.close();

    const g = await open(browser);
    await goCrew(g.p); await replyOpen(g.p, P_MINA);
    await typeIn(g.p, '@Sa'); await chipTap(g.p, 0);
    await g.p.keyboard.press('Backspace'); await g.p.keyboard.press('Backspace'); await g.p.waitForTimeout(100);
    const sg = await mnState(g.p);
    await sendReply(g.p);
    const b4 = (await sentBodies(g.p))[0];
    C.check('a name edited by hand (its last letter taken away) is only words: nothing is sent as a name', sg.value === '@Sara T' && b4 === '@Sara T', JSON.stringify([sg.value, b4]));
    await g.ctx.close();

    const h = await open(browser);
    await goCrew(h.p); await replyOpen(h.p, P_MINA);
    await typeIn(h.p, '@Sara T. you');
    await sendReply(h.p);
    const b5 = (await sentBodies(h.p))[0];
    C.check('"@Sara T." typed by hand, never tapped, is words and goes as words', b5 === '@Sara T. you', b5);
    await h.ctx.close();

    // at most 5
    const m = await open(browser);
    await goCrew(m.p); await replyOpen(m.p, P_MINA);
    for (let k = 0; k < 5; k++) { await typeIn(m.p, '@'); await chipTap(m.p, 0); }
    await typeIn(m.p, '@');
    s = await mnState(m.p);
    C.check('a sixth name is not offered: the row says "You can name 5 people in a reply."', !s.hidden && s.chips.length === 0 && s.note === 'You can name 5 people in a reply.', JSON.stringify(s));
    await sendReply(m.p);
    const b6 = (await sentBodies(m.p))[0];
    C.check('…and five tokens are sent', (b6.match(/@\[/g) || []).length === 5 && /@$/.test(b6), b6);
    await m.ctx.close();

    // the 140 is what is SEEN: a name that would not fit is not put in
    const l = await open(browser);
    await goCrew(l.p); await replyOpen(l.p, P_MINA);
    await l.p.evaluate(() => { const t = document.querySelector('#hist-overlay .cr-rtxt'); t.value = 'x'.repeat(134) + ' @'; t.dispatchEvent(new Event('input')); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    await typeIn(l.p, 'S'); await chipTap(l.p, 0);
    const sl = await mnState(l.p);
    C.check('a name that would take the reply past 140 is not put in, and the sheet says so', sl.value.length <= 140 && !/Sara|Mina/.test(sl.value) && /over 140/.test(await text(l.p, '#hist-overlay .cr-err') || ''), JSON.stringify([sl.value.length, await text(l.p, '#hist-overlay .cr-err')]));
    await l.ctx.close();

    // above the keyboard: visualViewport shrinks, the sheet is fitted to what is left, and it lets go when the keyboard goes
    const k = await open(browser);
    await goCrew(k.p); await replyOpen(k.p, P_MINA);
    await typeIn(k.p, '@S');
    await k.p.evaluate(() => { const vv = window.visualViewport; Object.defineProperty(vv, 'height', { configurable: true, get: () => 420 }); vv.dispatchEvent(new Event('resize')); });
    await k.p.waitForTimeout(150);
    const kb = await k.p.evaluate(() => { const r = n => document.querySelector(n).getBoundingClientRect(), ov = document.getElementById('hist-overlay'); return { h: ov.style.height, top: ov.style.top, chips: Math.round(r('#cr-mpick').bottom), chipTop: Math.round(r('#cr-mpick').top), field: Math.round(r('#hist-overlay .cr-rtxt').bottom), modal: Math.round(r('#hist-overlay .readiness-modal').bottom), cnt: Math.round(r('#hist-overlay .cr-cnt').bottom), go: Math.round(r('#hist-overlay .cr-go').bottom), quote: getComputedStyle(document.querySelector('#hist-overlay .cr-quote')).display }; });
    C.check('with the keyboard up (the visual viewport 420 tall) the sheet ends above it: the names, the field, the counter and Reply are all inside 420 px (the quote under the title gives way)', kb.h === '420px' && kb.top === '0px' && kb.modal <= 420 && kb.chips <= 420 && kb.field <= 420 && kb.cnt <= 420 && kb.go <= 420 && kb.chipTop >= 0 && kb.quote === 'none', JSON.stringify(kb));
    await k.p.evaluate(() => { delete window.visualViewport.height; window.visualViewport.dispatchEvent(new Event('resize')); });
    await k.p.waitForTimeout(150);
    C.check('…and with the keyboard gone nothing is left set on the sheet', await k.p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return !ov.style.height && !ov.style.top && !ov.style.bottom && !document.querySelector('#hist-overlay .readiness-modal').style.maxHeight && !document.querySelector('#hist-overlay .readiness-modal').classList.contains('cr-kb') && getComputedStyle(document.querySelector('#hist-overlay .cr-quote')).display !== 'none'; }));
    await k.p.evaluate(() => { const vv = window.visualViewport; Object.defineProperty(vv, 'height', { configurable: true, get: () => 420 }); vv.dispatchEvent(new Event('resize')); });
    await k.p.evaluate(() => closeHistorySheet()); await k.p.waitForTimeout(150);
    C.check('…closing the sheet with the keyboard still "up" lets go too', await k.p.evaluate(() => { const ov = document.getElementById('hist-overlay'); return !ov.style.height && !ov.style.top; }));
    await k.ctx.close();

    // the opener is a sheet's opener: with a page behind it, ‹ Back is there
    const w = await open(browser);
    await goCrew(w.p);
    await w.p.evaluate(() => openAccount()); await w.p.waitForTimeout(250);
    await replyOpen(w.p, P_MINA);
    C.check('openCrewReply is in wrapSheetOpeners(): over another page it has ‹ Back, and Back returns to that page', await w.p.evaluate(() => !!document.querySelector('#hist-overlay .sheet-back') && !!document.querySelector('#hist-overlay .cr-rtxt')));
    await w.p.evaluate(() => sheetBack()); await w.p.waitForTimeout(250);
    C.check('…Back shows the page behind', await w.p.evaluate(() => !document.querySelector('#hist-overlay .cr-rtxt') && document.getElementById('hist-overlay').classList.contains('visible')));
    await w.ctx.close();

    // how a name is drawn in a thread: a button for a member the row names, plain for anyone else, whatever the writer wrote
    const reps = [
      Object.assign({ id: 'rt1', who: 'Reza K.', me: false, amir: false, body: 'Good one ' + MN('Sara T.', CK.sara) + ' and ' + MN('Omid P.', CK.omid) + ', come on', at: iso(now - 300e3), mentions: [{ ck: CK.sara, who: 'Sara T.', fv: null }] }, { ck: CK.reza, fv: null }),
      Object.assign({ id: 'rt2', who: 'Leila M.', me: false, amir: false, body: 'You ' + MN('Alex R.', CK.alex) + ' <b>x</b> @[nope|X]', at: iso(now - 200e3), mentions: [{ ck: CK.alex, who: 'Alex R.', fv: null }] }, { ck: CK.leila, fv: null })];
    const r = await open(browser, { bell: withReplies(P_MINA, reps) });
    await goCrew(r.p);
    const th = await r.p.evaluate(id => [...document.querySelectorAll('.cr-post[data-id="' + id + '"] .cr-rep .cr-rb')].map(rb => ({ text: rb.textContent.replace(/\s+/g, ' ').trim(), btns: [...rb.querySelectorAll('button.cr-mn')].map(b => b.textContent), html: rb.innerHTML })), P_MINA);
    C.check('a member named in a reply is a button "@Sara T."; someone who is not in the row\'s `mentions` is plain "@Omid P."; the token itself is never on the screen', th[0].btns.join() === '@Sara T.' && /Good one @Sara T\. and @Omid P\., come on/.test(th[0].text) && !/@\[/.test(th[0].text) && !/<button[^>]*>@Omid/.test(th[0].html), JSON.stringify(th[0]));
    C.check('…you named yourself: a button to YOUR page; text that only looks like a tag or a broken token stays words, safely', th[1].btns.join() === '@Alex R.' && /@\[nope\|X\]/.test(th[1].text) && /&lt;b&gt;x&lt;\/b&gt;/.test(th[1].html) && !/<b>x<\/b>/.test(th[1].html), JSON.stringify(th[1]));
    await r.p.evaluate(() => document.querySelector('.cr-rep .cr-mn').click()); await r.p.waitForTimeout(450);
    const at1 = await screenNow(r.p), nm1 = await plain(r.p, '#crewplayer-body .pl-name');
    await r.p.evaluate(() => playerBack()); await r.p.waitForTimeout(350);
    await r.p.evaluate(() => document.querySelectorAll('.cr-rep .cr-mn')[1].click()); await r.p.waitForTimeout(450);
    C.check('…the buttons open Sara\'s page and your own, and ← comes back to Crew', at1 === 'screen-crewplayer' && nm1 === 'Sara T.' && (await plain(r.p, '#crewplayer-body .pl-name')) === 'Alex R.', nm1);
    C.check('…no page errors', !r.p.errs.length, r.p.errs.join(' | '));
    await r.ctx.close();

    // an athlete under 13 reads only: the words, no doors; and a server without stage96 has no row and sends the words as typed
    const u = await open(browser, { bell: withReplies(P_MINA, reps, { me: { under13: true, can_post: false } }) });
    await goCrew(u.p);
    const tu = await u.p.evaluate(id => ({ btns: document.querySelectorAll('.cr-post[data-id="' + id + '"] .cr-rep .cr-mn').length, text: document.querySelector('.cr-post[data-id="' + id + '"] .cr-rep .cr-rb').textContent.replace(/\s+/g, ' ').trim() }), P_MINA);
    C.check('under 13: a name in a reply is the words and no door', tu.btns === 0 && /Good one @Sara T\. and @Omid P\./.test(tu.text), JSON.stringify(tu));
    await u.ctx.close();
    const o = await open(browser, { b: { noPages: true } });
    await goCrew(o.p); await replyOpen(o.p, P_MINA);
    await typeIn(o.p, 'hello @Sa');
    const so = await o.p.evaluate(() => ({ row: !!document.getElementById('cr-mpick'), val: document.querySelector('#hist-overlay .cr-rtxt').value }));
    await sendReply(o.p);
    C.check('a server without stage96: no row of names at all, and the reply goes as typed', !so.row && (await sentBodies(o.p))[0] === 'hello @Sa', JSON.stringify([so, await sentBodies(o.p)]));
    await o.ctx.close();

    // the guide says it; a reply of the stub's own: the server rewrites a token that is not a member to plain words
    const gd = await open(browser);
    await goCrew(gd.p);
    const guide = await gd.p.evaluate(() => buildAppGuideCards());
    C.check('the guide says how: type @ and tap a name, five at most, in plain words', /type <strong>@<\/strong> and tap their name/.test(guide) && /name 5 people/.test(guide) && !/[—;]/.test((guide.match(/<p>To name someone[\s\S]*?<\/p>/) || [''])[0]), '');
    await gd.ctx.close();
  }

  // ── 21. the picture for step 7 (390 px, light): the names over a reply, with the keyboard up ──────────────────────────────────────────────────────────────
  if (on(21)) {
    const people = [[CK.alex, '#5E8C7A', '#E3B896', '#2E4A57', 1101], [CK.mina, '#9CB4C6', '#C98E6A', '#8C3D2B', 1102], [CK.reza, '#7C6B8F', '#E8C4A0', '#26322C', 1103],
      [CK.ali1, '#A9B79A', '#B07B58', '#3C5A7A', 1104], [CK.leila, '#C9A99A', '#E0B493', '#4F6B52', 1105], [CK.sara, '#6E8FA3', '#D8A682', '#7A4E3A', 1106], [CK.omid, '#A9B79A', '#B07B58', '#3C5A7A', 1107]];
    const faceImgs = p => p.evaluate(rows => {
      const o = {};
      rows.forEach(([k, bg, skin, shirt, fv]) => {
        const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
        const g = x.createLinearGradient(0, 0, 128, 128); g.addColorStop(0, bg); g.addColorStop(1, '#1F3A30'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
        x.fillStyle = shirt; x.beginPath(); x.ellipse(64, 132, 48, 40, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = skin; x.fillRect(56, 70, 16, 18); x.beginPath(); x.ellipse(64, 52, 21, 25, 0, 0, Math.PI * 2); x.fill();
        o[k] = { fv, b64: c.toDataURL('image/jpeg', 0.85).split(',')[1] };
      });
      window.__STUB.faces = o;
    }, people);
    const fvs = Object.fromEntries(people.map(r => [r[0], r[4]]));
    const b = withFaces(fvs);
    const post = b.items.find(i => i.id === P_MINA);
    post.replies = [Object.assign({ id: 'pic1', who: 'Reza K.', me: false, amir: false, body: 'Same here. Ask ' + MN('Leila M.', CK.leila) + ' for the sled plan.', at: iso(now - 600e3), mentions: [{ ck: CK.leila, who: 'Leila M.', fv: 1105 }] }, { ck: CK.reza, fv: 1103 })];
    const a = await open(browser, { stub: { bell: b, crewBoard: board().map(r => (r.ck in fvs ? { ...r, fv: fvs[r.ck] } : r)) } });
    await faceImgs(a.p);
    await goCrew(a.p); await a.p.waitForTimeout(1200);
    await a.p.evaluate(id => { document.querySelector('.cr-post[data-id="' + id + '"]').scrollIntoView({ block: 'start' }); window.scrollBy(0, -12); }, P_MINA);
    await a.p.screenshot({ path: path.join(out, 'reply-thread-names-light-390.png') });
    await replyOpen(a.p, P_MINA);
    await typeIn(a.p, 'Legs too, @S'); await a.p.waitForTimeout(700);
    await a.p.screenshot({ path: path.join(out, 'reply-chips-light-390.png') });
    // the same with the keyboard up: a visual viewport of 440 px (about what an iPhone leaves)
    await a.p.evaluate(() => { const vv = window.visualViewport; Object.defineProperty(vv, 'height', { configurable: true, get: () => 440 }); vv.dispatchEvent(new Event('resize')); });
    await a.p.waitForTimeout(300);
    await a.p.screenshot({ path: path.join(out, 'reply-chips-keyboard-light-390.png') });
    await a.ctx.close();
  }

  // ── 22. Step 8 · First Serve, one line at a time: five steps in the one suggestion slot, with the notifications step ──────────────────────────────────────
  // 1 finish your first session · 2 add the app to your Home Screen · 3 turn on notifications · 4 join the crew · 5 add your photo. Home's slot carries a ring ("2/5") and
  // "Next: ..." for 14 days from the first finished session (the cycle's start while there is none) and until all are done, never to a veteran, never in the demo. A tap on the
  // line does the step; a tap on the ring lists all five. THE PHONE'S BOX opens only inside the button of pushAsk()'s toast (push.md: the third moment is the athlete's own tap).
  const DAYMS = 864e5, ymd = ms => new Date(ms).toISOString().slice(0, 10);
  const newProg = (o = {}) => {
    const P = H.fixture(); P.currentCycleIndex = o.idx || 0;
    P.cycles.forEach((c, i) => { const s = now - (o.startAgo === undefined ? 3 : o.startAgo) * DAYMS + (i - P.currentCycleIndex) * 35 * DAYMS; c.startDate = ymd(s); c.endDate = ymd(s + 34 * DAYMS); });
    return P;
  };
  const histAgo = n => [{ completed_on: ymd(now - n * DAYMS), day: '1', readiness: 4, log: [] }];
  // a stand-in for the phone's box, in front of the page's own scripts: the permission starts at "default" (so AAPush.state() is "off"), a service worker is "ready", and every call
  // of Notification.requestPermission() is written down, so the real chain (the toast's button -> pushTurnOnHere -> AAPush.enable) is what is measured
  const BOX = "window.__BOX = []; window.__PERM = 'default';"
    + " try { Notification.requestPermission = function () { window.__BOX.push('requestPermission'); return Promise.resolve(window.__PERM); }; Object.defineProperty(Notification, 'permission', { configurable: true, get: function () { return window.__PERM; } }); } catch (e) {}"
    + " try { var sw = navigator.serviceWorker; sw.register = function () { return Promise.resolve({}); }; Object.defineProperty(sw, 'ready', { configurable: true, get: function () { return Promise.resolve({ pushManager: { getSubscription: function () { return Promise.resolve(null); }, subscribe: function () { return Promise.resolve({ toJSON: function () { return { endpoint: 'https://push.invalid/e', keys: { p256dh: 'a', auth: 'b' } }; } }); } } }); } }); } catch (e) {}";
  const fsOpen = (o = {}) => open(browser, { b: o.b === undefined ? { me: { answer: null, can_post: false } } : o.b, stub: o.stub, bell: o.bell,
    opts: Object.assign({ tz: 'UTC', prog: newProg(o.prog), hist: o.hist || [], init: BOX }, o.opts || {}) });
  const fsSlot = p => p.evaluate(() => { const s = document.querySelector('#home-sugg-wrap .fs-slot'); return s ? { ring: s.querySelector('.fs-ring').textContent.trim(), p: s.querySelector('.fs-ring').style.getPropertyValue('--p'), kick: s.querySelector('.lib-sugg-k').textContent.trim(),
    line: s.querySelector('.lib-sugg-q').textContent.trim(), other: !!document.querySelector('#home-sugg-wrap [data-sugg="crew"]') } : null; });
  const fsRows = p => p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), eyebrow: (document.querySelector('#hist-overlay .readiness-eyebrow') || {}).textContent, title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent,
    sub: (document.querySelector('#hist-overlay .readiness-sub') || {}).textContent, rows: [...document.querySelectorAll('#hist-overlay .fs-row')].map(r => ({ t: r.querySelector('.fs-t').childNodes[0].textContent.trim(), done: r.classList.contains('done'), tag: r.tagName, sub: (r.querySelector('small') || {}).textContent || '' })) }));
  const fsSet = (p, s) => p.evaluate(s => {
    if (s.standalone !== undefined) Object.defineProperty(navigator, 'standalone', { configurable: true, get: () => s.standalone });
    if (s.push) window.AAPush = Object.assign({}, window.AAPush, { state: () => s.push });
    if (s.answer !== undefined) { BELL.me.answer = s.answer; BELL.me.can_post = s.answer === 'yes'; }
    if (s.fv !== undefined) BELL.me.fv = s.fv;
    if (s.hist) localStorage.setItem(s.id + '_histcache', JSON.stringify(s.hist));
    return paintWeekSugg();
  }, Object.assign({ id: H.ID }, s));
  const box = p => p.evaluate(() => window.__BOX.length);
  const homeWait = async p => { await p.waitForTimeout(1500); };
  if (on(22)) {
    // ── the line, the ring and the order
    const a = await fsOpen();
    await homeWait(a.p);
    let s = await fsSlot(a.p);
    C.check('a new athlete, nothing done: the slot is First Serve: a 0/5 ring, "First serve", "Next: finish your first session"', !!s && s.ring === '0/5' && s.kick === 'First serve' && s.line === 'Next: finish your first session' && s.p === '0%', JSON.stringify(s));
    C.check('…it has the slot to itself: the crew\'s invitation, which wants it too (a crew, never opened), waits', !s.other && await a.p.evaluate(() => crewInvWanted()));
    await a.p.evaluate(() => { window.__w = weekSuggWanted; window.weekSuggWanted = () => true; return paintWeekSugg(); });
    C.check('…and so does the week\'s own suggestion: First Serve is first in the slot\'s priority', !!(await fsSlot(a.p)));
    await a.p.evaluate(() => { window.weekSuggWanted = window.__w; return paintWeekSugg(); });
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await a.p.waitForTimeout(350);
    let r = await fsRows(a.p);
    C.check('the ring opens a sheet "First serve" with all five, in this order, none done, each a button', r.on && r.title === 'First serve' && r.eyebrow === 'Your first week' && r.sub === '0 of 5 done' && r.rows.map(x => x.t).join('|') === 'Finish your first session|Add the app to your Home Screen|Turn on notifications|Join the crew|Add your photo' && r.rows.every(x => !x.done && x.tag === 'BUTTON'), JSON.stringify(r));
    await a.p.evaluate(() => closeHistorySheet());
    await a.ctx.close();

    // ── what ticks each step, in order (the done-tests)
    const t = await fsOpen();
    await homeWait(t.p);
    const seq = [['a session finished', { hist: histAgo(1) }, '1/5', 'Next: add the app to your Home Screen'], ['the app on the Home Screen', { standalone: true }, '2/5', 'Next: turn on notifications'],
      ['notifications on', { push: 'on' }, '3/5', 'Next: join the crew'], ['the crew joined', { answer: 'yes' }, '4/5', 'Next: add your photo']];
    for (const [what, st, ring, line] of seq) {
      await fsSet(t.p, st); s = await fsSlot(t.p);
      C.check(`${what}: the ring says ${ring} and the line "${line}"`, !!s && s.ring === ring && s.line === line, JSON.stringify(s));
    }
    await fsSet(t.p, { fv: 1700000000 });
    C.check('all five done: First Serve is gone and the slot goes back to the crew\'s invitation', !(await fsSlot(t.p)) && await t.p.evaluate(() => !!document.querySelector('#home-sugg-wrap [data-sugg="crew"]')));
    await fsSet(t.p, { push: 'blocked', fv: null, answer: null });
    s = await fsSlot(t.p);
    C.check('a phone that said no ("blocked") counts as done: never nagged, the line moves on to the crew (3/5 with the session and the Home Screen)', !!s && s.ring === '3/5' && s.line === 'Next: join the crew', JSON.stringify(s));
    await t.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await t.p.waitForTimeout(300);
    r = await fsRows(t.p);
    C.check('…in the sheet the step is ticked and says so quietly', r.rows[2].done && /said no/.test(r.rows[2].sub) && r.rows[2].tag === 'DIV', JSON.stringify(r.rows[2]));
    await fsSet(t.p, { answer: 'yes', fv: 1700000000 });
    r = await fsRows(t.p);
    C.check('…and an open sheet follows the steps as they tick (the crew and the photo)', r.rows.every(x => x.done) && r.sub === 'All 5 done', JSON.stringify(r));
    await t.ctx.close();

    // ── the iPhone wait: not on the Home Screen, step 3 waits behind step 2
    const ip = await fsOpen({ hist: histAgo(1), opts: { init: BOX } });
    await homeWait(ip.p);
    await fsSet(ip.p, { push: 'needs-install' });
    await ip.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await ip.p.waitForTimeout(300);
    r = await fsRows(ip.p);
    C.check('an iPhone that has not been put on the Home Screen: step 3 reads "Turn on notifications (after step 2)"', r.rows[2].t === 'Turn on notifications (after step 2)' && !r.rows[2].done, JSON.stringify(r.rows[2]));
    await ip.p.evaluate(() => document.querySelectorAll('#hist-overlay .fs-row')[2].click()); await ip.p.waitForTimeout(500);
    C.check('…a tap on it is the install offer (step 2), never the phone\'s box', await ip.p.evaluate(() => !!document.querySelector('.a2hs-toast')) && (await box(ip.p)) === 0 && !(await ip.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))));
    await ip.ctx.close();

    // ── a tap on the line does the step
    const d = await fsOpen({ hist: histAgo(1) });
    await homeWait(d.p);
    await d.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-go').click()); await d.p.waitForTimeout(500);
    C.check('step 2, install: the line opens the install offer, even when it was dismissed before', await d.p.evaluate(() => !!document.querySelector('.a2hs-toast .a2hs-toast-body') && /Install app/.test(document.querySelector('.a2hs-toast').textContent)));
    await d.p.evaluate(() => { document.querySelectorAll('.a2hs-toast').forEach(e => e.remove()); });
    await fsSet(d.p, { standalone: true, push: 'on' });
    await d.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-go').click()); await d.p.waitForTimeout(700);
    C.check('step 4, join: the line opens Crew, and Crew asks its question', (await screenNow(d.p)) === 'screen-crew' && await d.p.evaluate(() => !!document.querySelector('#crew-body .cr-ask, #crew-body .cr-yes, #crew-body [onclick*="crewAnswer"]')));
    await d.p.evaluate(() => goTo('home')); await d.p.waitForTimeout(400);
    await fsSet(d.p, { answer: 'yes' });
    await d.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-go').click()); await d.p.waitForTimeout(500);
    C.check('step 5, photo: the line opens Your photo', await d.p.evaluate(() => /Your photo/.test((document.querySelector('#hist-overlay .readiness-title') || {}).textContent || '')));
    await d.p.evaluate(() => closeHistorySheet());
    await d.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await d.p.waitForTimeout(300);
    await d.p.evaluate(() => document.querySelectorAll('#hist-overlay .fs-row')[4].click()); await d.p.waitForTimeout(400);
    C.check('…from the sheet, the same photo sheet, and ‹ Back returns to the five', await d.p.evaluate(() => !!document.querySelector('#hist-overlay .sheet-back') && /Your photo/.test(document.querySelector('#hist-overlay .readiness-title').textContent)));
    await d.p.evaluate(() => sheetBack()); await d.p.waitForTimeout(300);
    C.check('…Back shows the First Serve sheet again', await d.p.evaluate(() => !!document.querySelector('#hist-overlay .fs-list')));
    await d.ctx.close();
    const f = await fsOpen();
    await homeWait(f.p);
    await f.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-go').click()); await f.p.waitForTimeout(500);
    C.check('step 1, the first session: the line opens the day Home suggests', await f.p.evaluate(() => { const dv = document.getElementById('day-view'); return !!dv && !dv.hidden && document.getElementById('home-overview').hidden; }));
    await f.ctx.close();

    // ── THE PHONE'S BOX: not on load, not on the line, not on the sheet, and only inside the button of the ask the athlete's own tap puts up
    const q = await fsOpen({ hist: histAgo(1), opts: { init: BOX } });
    await homeWait(q.p);
    await fsSet(q.p, { standalone: true });
    const b0 = await box(q.p), shown0 = await fsSlot(q.p);
    C.check('the page loaded and First Serve\'s line is on Home: the phone\'s box was never opened', !!shown0 && shown0.line === 'Next: turn on notifications' && b0 === 0, String(b0));
    await q.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await q.p.waitForTimeout(300);
    await q.p.evaluate(() => closeHistorySheet());
    C.check('…and not on opening the ring\'s sheet either', (await box(q.p)) === 0);
    await q.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-go').click()); await q.p.waitForTimeout(500);
    let tt = await toast(q.p);
    C.check('a tap on "Next: turn on notifications" puts up the ask: one line with a "Turn them on" button, and the box is still shut', !!tt && tt.action === 'Turn them on' && /Reminders/.test(tt.text) && (await box(q.p)) === 0, JSON.stringify(tt));
    await q.p.waitForTimeout(6500);
    C.check('…it waits for them (it does not fade), and the box is still shut', !!(await toast(q.p)) && (await box(q.p)) === 0);
    await q.p.evaluate(() => document.querySelector('#aaToast .aa-toast-x').click()); await q.p.waitForTimeout(250);
    await q.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-go').click()); await q.p.waitForTimeout(400);
    C.check('"Not now", then the step again: the line comes back (their own tap, every time), the box still shut', !!(await toast(q.p)) && (await box(q.p)) === 0);
    await q.p.evaluate(() => document.querySelector('#aaToast .aa-toast-go').click()); await q.p.waitForTimeout(700);
    C.check('only the button\'s tap opens the box: exactly once, inside that click', (await box(q.p)) === 1 && await q.p.evaluate(() => window.__BOX[0] === 'requestPermission'), String(await box(q.p)));
    C.check('…no page errors', !q.p.errs.length, q.p.errs.join(' | '));
    await q.ctx.close();
    // the ring's sheet is the same: its notifications row puts up the line and nothing else
    const q2 = await fsOpen({ hist: histAgo(1), opts: { init: BOX } });
    await homeWait(q2.p);
    await q2.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await q2.p.waitForTimeout(300);
    await q2.p.evaluate(() => document.querySelectorAll('#hist-overlay .fs-row')[2].click()); await q2.p.waitForTimeout(500);
    tt = await toast(q2.p);
    C.check('the sheet\'s "Turn on notifications" row is the same ask: its button, the box shut until it is tapped', !!tt && tt.action === 'Turn them on' && (await box(q2.p)) === 0 && !(await q2.p.evaluate(() => document.getElementById('hist-overlay').classList.contains('visible'))), JSON.stringify(tt));
    await q2.ctx.close();
    // already answered: the step is not a button and the line asks nothing
    for (const [state, want] of [['on', 'on'], ['blocked', 'blocked']]) {
      const w = await fsOpen({ hist: histAgo(1), opts: { init: BOX } });
      await homeWait(w.p);
      await fsSet(w.p, { standalone: true, push: state });
      const sw = await fsSlot(w.p);
      C.check(`push ${want}: First Serve moves past the step, and nothing at all is asked`, !!sw && sw.line === 'Next: join the crew' && !(await toast(w.p)) && (await box(w.p)) === 0, JSON.stringify(sw));
      await w.ctx.close();
    }
    const src = require('fs').readFileSync(path.join(__dirname, '..', '..', 'program.html'), 'utf8');
    const fsSrc = src.slice(src.indexOf('const FS_DAYS'), src.indexOf('async function paintWeekSugg'));
    C.check('First Serve\'s code never opens the phone\'s box itself: no requestPermission, no enable(), only pushAsk()', !/requestPermission|AAPush\.enable|pushTurnOnHere\(/.test(fsSrc) && /pushAsk\('serve'/.test(fsSrc), '');

    // ── never to a veteran, never in the demo, and the 14 days
    const never = [
      ['a second cycle (currentCycleIndex 1) with a session two days ago', { prog: { idx: 1 }, hist: histAgo(2) }],
      ['a first session 20 days ago', { hist: histAgo(20) }],
      ['a first session 14 days ago', { hist: histAgo(14) }],
      ['no session yet, and a cycle that started 20 days ago', { prog: { startAgo: 20 } }]];
    for (const [name, o] of never) {
      const v = await fsOpen(o);
      await homeWait(v.p);
      C.check(`never to a veteran or past the 14 days: ${name}`, !(await fsSlot(v.p)) && !(await v.p.evaluate(() => firstServeWanted())), JSON.stringify(await fsSlot(v.p)));
      await v.ctx.close();
    }
    const vt = await open(browser, { opts: { init: BOX } });   // the default fixture is a second-cycle athlete with a session 2 days ago
    await homeWait(vt.p);
    C.check('…the everyday fixture (a veteran) has no First Serve, and the guide does not describe it', !(await fsSlot(vt.p)) && !/First Serve/.test(await vt.p.evaluate(() => buildAppGuideCards())));
    await vt.ctx.close();
    const within = [['a first session 13 days ago', { hist: histAgo(13) }], ['no session yet, and a cycle that started 13 days ago', { prog: { startAgo: 13 } }]];
    for (const [name, o] of within) {
      const v = await fsOpen(o);
      await homeWait(v.p);
      C.check(`still inside the 14 days: ${name}`, !!(await fsSlot(v.p)), '');
      await v.ctx.close();
    }
    const dm = await fsOpen({ opts: { query: '?client=demo', init: BOX }, stub: { demo: newProg() } });
    await dm.p.waitForTimeout(800);
    C.check('the demo shows no First Serve, and the box is never opened', !(await dm.p.evaluate(() => !!document.querySelector('.fs-slot') || firstServeWanted())) && (await box(dm.p)) === 0);
    await dm.ctx.close();
    const pv = await fsOpen({ opts: { query: '?client=rel01_athlete&preview=1', init: BOX } });
    await pv.p.waitForTimeout(800);
    C.check('…nor the coach\'s preview', !(await pv.p.evaluate(() => !!document.querySelector('.fs-slot') || firstServeWanted())) && (await box(pv.p)) === 0);
    await pv.ctx.close();

    // ── steps that do not apply to this athlete are not in the list
    const u13 = await fsOpen({ b: { me: { answer: null, can_post: false, under13: true } } });
    await homeWait(u13.p);
    s = await fsSlot(u13.p);
    C.check('an athlete under 13 has no crew and no photo to do: 0/3, and the line says the session', !!s && s.ring === '0/3', JSON.stringify(s));
    await u13.ctx.close();
    const no = await fsOpen({ b: { me: { answer: 'no', can_post: false } } });
    await homeWait(no.p);
    s = await fsSlot(no.p);
    C.check('someone who answered no to the crew is not asked again: 0/3, no join and no photo', !!s && s.ring === '0/3', JSON.stringify(s));
    await no.ctx.close();
    const np = await fsOpen({ b: { noPages: true, me: { answer: null, can_post: false } } });
    await homeWait(np.p);
    s = await fsSlot(np.p);
    C.check('a server with a crew but no Lounge (no faces): no photo step, 0/4', !!s && s.ring === '0/4', JSON.stringify(s));
    await np.ctx.close();
    const nb = await fsOpen({ bell: null });
    await nb.p.waitForTimeout(1800);
    s = await fsSlot(nb.p);
    C.check('no crew at all (the server never answers the Bell): only what can be done, 0/3', !!s && s.ring === '0/3', JSON.stringify(s));
    await nb.ctx.close();
    const un = await fsOpen();
    await homeWait(un.p);
    await fsSet(un.p, { push: 'unsupported' });
    s = await fsSlot(un.p);
    C.check('a browser that cannot take notifications has no notifications step: 0/4', !!s && s.ring === '0/4' && s.line === 'Next: finish your first session', JSON.stringify(s));
    await un.ctx.close();
    // the line waits for the crew to answer once, so the steps do not change under it
    const sl = await fsOpen({ bell: null, stub: { stall: { get_bell: true, get_bell_if_new: true } } });
    await sl.p.waitForTimeout(1500);
    C.check('while the crew has not answered the line is not drawn yet (no 3/3 that turns into 5)', !(await fsSlot(sl.p)));
    await sl.ctx.close();

    // ── the guide names it while it is on Home
    const gd = await fsOpen();
    await homeWait(gd.p);
    const guide = await gd.p.evaluate(() => buildAppGuideCards());
    C.check('the guide has a card First Serve while the line is on Home: the five steps, "Next: …", the ring, and that the phone is asked only on its button, in plain words', /First Serve: your first week/.test(guide) && /<strong>First Serve<\/strong>/.test(guide) && /Next: add the app to your Home Screen/.test(guide) && /2\/5/.test(guide) && /only when you tap its button/.test(guide)
      && !/[—;]/.test((guide.match(/<strong>First Serve<\/strong>[\s\S]*?<\/p><p>[\s\S]*?<\/p>/) || [''])[0]), '');
    await gd.ctx.close();

    // ── 320 px and dark: the ring and the line fit, and nothing scrolls sideways
    const nr = await fsOpen({ opts: { w: 320, h: 640 } });
    await homeWait(nr.p);
    const m = await nr.p.evaluate(() => { const r = n => document.querySelector(n).getBoundingClientRect(); return { sw: document.documentElement.scrollWidth, iw: innerWidth, ring: Math.round(r('.fs-ring').width), go: Math.round(r('.fs-go').width), h: Math.round(r('.fs-slot').height), lineBottom: Math.round(r('.fs-go').bottom), slotBottom: Math.round(r('.fs-slot').bottom) }; });
    C.check('320 px: the ring is 44 px, the line has room, nothing scrolls sideways and the line stays inside its frame', m.sw <= m.iw && m.ring === 44 && m.go >= 150 && m.lineBottom <= m.slotBottom, JSON.stringify(m));
    await nr.ctx.close();
    const dk = await fsOpen({ opts: { dark: true } });
    await homeWait(dk.p);
    const dc = await dk.p.evaluate(() => { const r = document.querySelector('.fs-ring'); return { ringBg: getComputedStyle(r, '::after').backgroundColor, card: getComputedStyle(document.querySelector('.fs-slot')).backgroundColor, ink: getComputedStyle(r.querySelector('span')).color }; });
    C.check('dark mode: the ring\'s middle is the card\'s own colour and its number is light', dc.ringBg === dc.card && /^rgb\((2[0-9]{2}|1[89][0-9])/.test(dc.ink), JSON.stringify(dc));
    await dk.ctx.close();
  }

  // ── 23. the pictures for step 8 (390 px): First Serve's line on Home, light and dark, and its sheet, light and dark ─────────────────────────────────────────
  if (on(23)) {
    for (const dark of [false, true]) {
      const x = await fsOpen({ hist: histAgo(1), opts: { dark } });
      await homeWait(x.p);
      await fsSet(x.p, { standalone: true });
      await x.p.evaluate(() => { const e = document.getElementById('home-sugg-wrap'); e.scrollIntoView({ block: 'center' }); });
      await x.p.waitForTimeout(300);
      await x.p.screenshot({ path: path.join(out, 'first-serve-line-' + (dark ? 'dark' : 'light') + '-390.png') });
      await x.p.evaluate(() => document.querySelector('#home-sugg-wrap .fs-ring').click()); await x.p.waitForTimeout(500);
      await x.p.screenshot({ path: path.join(out, 'first-serve-sheet-' + (dark ? 'dark' : 'light') + '-390.png') });
      await x.ctx.close();
    }
  }

  // ── 24. Step 9 · Bring a partner (idea 69): a card on YOUR page, a code, "They get 10% off. You get 10% off your next cycle." ──────────────────────────────────────────────
  // CONTRACT 8: crew_page() carries `referral` on your own page once the server has stage97 ({ code: null } before a code exists); my_partner_code({ p_make: true }) makes the code. No `referral`, no card.
  const REF1 = (o = {}) => Object.assign({ code: 'ALEX24', percent: 10, reward: 10, friends: 0, waiting: 0, used: 0 }, o);
  const WA_EN = 'Train with Amir Ardekani. Use my code ALEX24 for 10% off: https://amirardekani.com/form.html?code=ALEX24';
  const ptOpen = async (o = {}) => {
    const x = await open(browser, o);
    await goCrew(x.p); await x.p.evaluate(() => openPlayer('me')); await x.p.waitForTimeout(700);
    return x;
  };
  const ptCard = p => p.evaluate(() => {
    const c = document.querySelector('#crewplayer-body .pt-card');
    if (!c) return null;
    const q = s => c.querySelector(s), t = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
    return { k: t(q('.pt-k')), code: t(q('.pt-code')), line: t(q('.pt-line')), make: t(q('.pt-make')), copy: t(q('.pt-copy')),
      wa: q('.pt-wa') ? { text: t(q('.pt-wa')), href: q('.pt-wa').getAttribute('href'), target: q('.pt-wa').target, rel: q('.pt-wa').rel } : null,
      note: t(q('.pt-note')), err: t(q('.pt-err')), sel: t(q('#pt-sel')), makeDis: q('.pt-make') ? q('.pt-make').disabled : null, text: t(c) };
  });
  const waText = href => decodeURIComponent(String(href).replace(/^https:\/\/wa\.me\/\?text=/, ''));
  if (on(24)) {
    // no code yet: the line and one button, and nothing is made by looking
    const a = await ptOpen({ stub: { partner: { code: null }, crewPages: { me: { cycle: wholeCycle(true) } } } });
    let s = await ptCard(a.p);
    C.check('your page with no code yet: a card "Bring a partner", what you both get, and ONE button, "Get your code"', !!s && s.k === 'Bring a partner' && s.line === 'They get 10% off. You get 10% off your next cycle.' && s.make === 'Get your code'
      && s.code === null && s.copy === null && s.wa === null, JSON.stringify(s));
    const ord = await a.p.evaluate(() => { const b = document.getElementById('crewplayer-body'), card = b.querySelector('.pt-card'), after = (x, y) => !!x && !!y && !!(x.compareDocumentPosition(y) & Node.DOCUMENT_POSITION_FOLLOWING);
      return { afterNumbers: after(b.querySelector('.pl-tiles'), card), beforeCycle: after(card, b.querySelector('.pl-cyc')), beforeFacts: after(card, b.querySelector('.pl-facts')), one: b.querySelectorAll('.pt-card').length }; });
    C.check('…it sits right after "Your numbers", before This cycle and Player facts, once', ord.afterNumbers && ord.beforeCycle && ord.beforeFacts && ord.one === 1, JSON.stringify(ord));
    C.check('…opening the page asks for no code (my_partner_code is not called until the button)', (await calls(a.p, 'my_partner_code')).length === 0);
    await click(a.p, '#crewplayer-body .pt-make'); await a.p.waitForTimeout(500);
    const mk = await calls(a.p, 'my_partner_code');
    s = await ptCard(a.p);
    C.check('"Get your code": my_partner_code({ p_make: true }) once, and the code is on the card in its own box', mk.length === 1 && mk[0].p_make === true && !!s && s.code === 'ALEX24', JSON.stringify([mk, s && s.code]));
    C.check('…the button goes; Copy and Send on WhatsApp come; the line stays; with no friend yet there is no "joined" line', !!s && s.make === null && s.copy === 'Copy' && !!s.wa && s.wa.text === 'Send on WhatsApp' && s.line === 'They get 10% off. You get 10% off your next cycle.' && s.note === null, JSON.stringify(s));
    C.check('…the WhatsApp link carries the code: wa.me, the English line with the code and the form link, opens outside the app', !!s && s.wa && /^https:\/\/wa\.me\/\?text=/.test(s.wa.href) && waText(s.wa.href) === WA_EN && s.wa.target === '_blank' && /noopener/.test(s.wa.rel), s && s.wa && waText(s.wa.href));
    const kept = await a.p.evaluate(() => { const c = crewPageGet('me'); return c && c.p.referral && c.p.referral.code; });
    C.check('…the code is kept with your page on the phone, and a second look shows it with no new call', kept === 'ALEX24', String(kept));
    // Copy: the clipboard first
    await a.p.evaluate(() => { window.__copied = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied.push(t); return Promise.resolve(); } } }); });
    await click(a.p, '#crewplayer-body .pt-copy'); await a.p.waitForTimeout(300);
    const cp = await a.p.evaluate(() => ({ copied: window.__copied, btn: document.querySelector('#crewplayer-body .pt-copy').textContent, sel: !!document.getElementById('pt-sel') }));
    const tt = await toast(a.p);
    C.check('Copy puts the same words on the clipboard (the code and the link), says Copied and shows no fallback box', cp.copied.length === 1 && cp.copied[0] === WA_EN && cp.btn === 'Copied' && !cp.sel, JSON.stringify(cp));
    C.check('…and a toast says to paste it to your friend', !!tt && /Copied\. Paste it to your friend\./.test(tt.text || ''), JSON.stringify(tt));
    // …no clipboard at all: the words are shown, selected, ready for a long press
    await a.p.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('no')) } }); document.execCommand = () => false; });
    await click(a.p, '#crewplayer-body .pt-copy'); await a.p.waitForTimeout(500);
    const fb = await a.p.evaluate(() => ({ box: (document.getElementById('pt-sel') || {}).textContent || '', selected: String(window.getSelection()), btn: document.querySelector('#crewplayer-body .pt-copy').textContent }));
    C.check('Copy with no clipboard: the words appear in a box, selected so a long press copies them', fb.box === WA_EN && fb.selected.trim() === WA_EN && fb.btn === 'Copy', JSON.stringify(fb));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.p.screenshot({ path: path.join(out, 'partner-code-light-390.png') }).catch(() => {});
    // leave the page and come back: the code is drawn from the copy at once
    await a.p.evaluate(() => playerBack()); await a.p.waitForTimeout(300);
    await a.p.evaluate(() => { openPlayer('me'); }); await a.p.waitForTimeout(150);
    s = await ptCard(a.p);
    C.check('coming back to your page: the code is there at once', !!s && s.code === 'ALEX24' && s.make === null, JSON.stringify(s));
    await a.ctx.close();

    // the friends line, from the server's counts
    for (const [what, ref, want] of [
      ['one friend, one discount waiting', REF1({ friends: 1, waiting: 1 }), '1 friend joined · 10% off waiting for you'],
      ['three friends, two discounts waiting', REF1({ friends: 3, waiting: 2, used: 1 }), '3 friends joined · 2 discounts of 10% waiting for you'],
      ['two friends, both discounts used', REF1({ friends: 2, waiting: 0, used: 2 }), '2 friends joined · your 10% off is used'],
      ['nobody yet', REF1(), null]]) {
      const x = await ptOpen({ stub: { partner: ref } });
      const y = await ptCard(x.p);
      C.check('the card with a code already made opens with it, no button, and ' + what + ': ' + (want ? '"' + want + '"' : 'no "joined" line'), !!y && y.code === 'ALEX24' && y.make === null && y.note === want, JSON.stringify(y && [y.code, y.note]));
      await x.ctx.close();
    }
    // no signal on the tap: the button comes back and says so; then it works
    const o = await ptOpen({ stub: { partner: { code: null } } });
    await o.p.evaluate(() => { window.__STUB.mode = 'offline'; });
    await click(o.p, '#crewplayer-body .pt-make'); await o.p.waitForTimeout(500);
    s = await ptCard(o.p);
    C.check('no signal on "Get your code": the button is back, enabled, with a plain line, and no code', !!s && s.make === 'Get your code' && s.makeDis === false && /^No signal\./.test(s.err || '') && s.code === null, JSON.stringify(s));
    await o.p.evaluate(() => { window.__STUB.mode = 'online'; });
    await click(o.p, '#crewplayer-body .pt-make'); await o.p.waitForTimeout(500);
    s = await ptCard(o.p);
    C.check('…and with signal the same button makes the code (the offline try made none)', !!s && s.code === 'ALEX24' && (await calls(o.p, 'my_partner_code')).length === 2, JSON.stringify(s && s.code));
    await o.ctx.close();
    // a refusal
    const r = await ptOpen({ stub: { partner: { code: null }, partnerErr: 'partner:no_programme' } });
    await click(r.p, '#crewplayer-body .pt-make'); await r.p.waitForTimeout(500);
    s = await ptCard(r.p);
    C.check('a refusal from the server: "That did not work. Try again.", the button back, no code', !!s && s.err === 'That did not work. Try again.' && s.make === 'Get your code' && s.makeDis === false && s.code === null, JSON.stringify(s));
    await r.ctx.close();
    // a double tap makes one call
    const dd = await ptOpen({ stub: { partner: { code: null }, partnerDelay: 400 } });
    await dd.p.evaluate(() => { const b = document.querySelector('#crewplayer-body .pt-make'); b.click(); b.click(); }); await dd.p.waitForTimeout(900);
    C.check('two quick taps make one call', (await calls(dd.p, 'my_partner_code')).length === 1);
    await dd.ctx.close();

    // never on anyone else's page, even if a server sent the key
    const el = await open(browser, { stub: { partner: REF1(), crewPages: { [CK.mina]: { referral: { code: 'MINA24', percent: 10, reward: 10, friends: 2, waiting: 1, used: 0 } } } } });
    await goCrew(el.p); await shown(el.p, CK.mina);
    C.check('never on anyone else\'s page: no card and no code, even when the server sends one for her', !(await el.p.$('#crewplayer-body .pt-card')) && !/MINA24/.test(await el.p.evaluate(() => document.getElementById('crewplayer-body').textContent)));
    await el.ctx.close();
    // under 13 and a member who said no
    const u = await ptOpen({ b: { me: { under13: true, can_post: false } }, stub: { partner: REF1() } });
    C.check('under 13: no card on their own page, even if the key arrives', !(await ptCard(u.p)));
    await u.ctx.close();
    const nm = await ptOpen({ b: { me: { answer: 'no', can_post: false } }, stub: { partner: { code: null } } });
    s = await ptCard(nm.p);
    C.check('someone who is not in the crew still has the card on their own page (a code is a discount, not the crew)', !!s && s.make === 'Get your code', JSON.stringify(s));
    await nm.ctx.close();
    // the demo and the coach's preview
    const dm = await ptOpen({ stub: { partner: REF1() } });
    const gate = await dm.p.evaluate(() => { const p = { referral: { code: 'ALEX24' } }, on0 = partnerOn(p); window.IS_PREVIEW = true; const pv = partnerOn(p); window.IS_PREVIEW = false; window.IS_DEMO = true; const de = partnerOn(p); window.IS_DEMO = false;
      return { on0, pv, de, under: partnerOn({ referral: { code: 'X1' }, under13: true }), none: partnerOn({}), html: playerPartnerHTML({}) }; });
    C.check('the card is for a real athlete: not in the coach\'s preview, not in the demo, not under 13, not without the key', gate.on0 && !gate.pv && !gate.de && !gate.under && !gate.none && gate.html === '', JSON.stringify(gate));
    await dm.ctx.close();
    // a server with the Lounge but not stage97: no `referral`, no card, nothing else changes
    const n97 = await ptOpen({ stub: { partner: undefined } });
    C.check('a server without partner codes (stage96 only): no card, and the rest of your page is as it was', !(await ptCard(n97.p)) && (await tiles(n97.p)).length >= 3 && !!(await n97.p.$('#crewplayer-body .pl-facts')));
    C.check('…and no page errors', !n97.p.errs.length, n97.p.errs.join(' | '));
    await n97.ctx.close();

    // Farsi: the athlete's language is the intake form's (`athlete.lang`); the message points at the Farsi form. The words are a DRAFT for Amir to read.
    const PF = H.fixture(); PF.athlete.lang = 'fa';
    const fa = await ptOpen({ opts: { prog: PF }, stub: { partner: REF1() } });
    s = await ptCard(fa.p);
    const ft = s && s.wa ? waText(s.wa.href) : '';
    C.check('an athlete whose language is Farsi: the message is the Farsi draft, with the code and the link to form-fa.html on their own lines', /form-fa\.html\?code=ALEX24/.test(ft) && /\nALEX24\n/.test(ft) && /[؀-ۿ]/.test(ft) && /۱۰٪/.test(ft) && !/Train with Amir/.test(ft), JSON.stringify(ft));
    C.check('…the page itself stays English (COM-1), and Copy gives the same Farsi words', s && s.line === 'They get 10% off. You get 10% off your next cycle.' && await (async () => {
      await fa.p.evaluate(() => { window.__copied = []; Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => { window.__copied.push(t); return Promise.resolve(); } } }); });
      await click(fa.p, '#crewplayer-body .pt-copy'); await fa.p.waitForTimeout(250);
      return (await fa.p.evaluate(() => window.__copied[0])) === ft;
    })());
    await fa.ctx.close();

    // the guide names it only while the card is on the page
    const gx = await ptOpen({ stub: { partner: REF1() } });
    const gtxt = await gx.p.evaluate(() => buildAppGuideCards());
    const gpart = (gtxt.match(/<p><strong>Bring a partner<\/strong>[\s\S]*?<\/p>/) || [''])[0];
    C.check('the guide has a paragraph Bring a partner while the card is on the page: Get your code, 10% each way, Send on WhatsApp, Copy, and that it earns no XP', /Get your code/.test(gpart) && /gets 10% off/.test(gpart) && /You get 10% off your next cycle/.test(gpart) && /Send on WhatsApp/.test(gpart) && /<strong>Copy<\/strong>/.test(gpart) && /earns no XP/.test(gpart), gpart.slice(0, 120));
    C.check('…plain words: no em-dash, no semicolon', gpart && !/[—;]/.test(gpart.replace(/&[a-z]+;/g, '')), gpart.slice(0, 60));
    await gx.ctx.close();
    const gn = await ptOpen({ stub: { partner: undefined } });
    C.check('…and it is not in the guide when the server has no partner codes', !/Bring a partner/.test(await gn.p.evaluate(() => buildAppGuideCards())));
    await gn.ctx.close();

    // 320 px and dark
    const nr = await ptOpen({ opts: { w: 320, h: 640 }, stub: { partner: REF1({ friends: 1, waiting: 1 }) } });
    const m = await nr.p.evaluate(() => { const r = n => document.querySelector(n).getBoundingClientRect(), c = r('.pt-card'); return { sw: document.documentElement.scrollWidth, iw: innerWidth, right: Math.round(c.right), wa: Math.round(r('.pt-wa').right), codeH: Math.round(r('.pt-code').height), waH: Math.round(r('.pt-wa').height), copyH: Math.round(r('.pt-copy').height) }; });
    C.check('320 px: the card and both buttons fit, nothing scrolls sideways, the buttons are 44 px or more', m.sw <= m.iw && m.right <= m.iw && m.wa <= m.right && m.waH >= 44 && m.copyH >= 44, JSON.stringify(m));
    await nr.ctx.close();
    const dk = await ptOpen({ opts: { dark: true }, stub: { partner: REF1({ friends: 1, waiting: 1 }) } });
    const dc = await dk.p.evaluate(() => { const c = document.querySelector('.pt-card'), cs = getComputedStyle(c), code = getComputedStyle(c.querySelector('.pt-code')); return { bg: cs.backgroundColor, ink: code.color, codeBg: code.backgroundColor }; });
    C.check('dark mode: the card takes the dark row colour and the code is light on its field', dc.bg !== 'rgb(255, 255, 255)' && /^rgb\((2[0-9]{2}|1[5-9][0-9])/.test(dc.ink), JSON.stringify(dc));
    await dk.p.screenshot({ path: path.join(out, 'partner-code-dark-390.png') }).catch(() => {});
    await dk.ctx.close();
  }

  // ── 25. the pictures for step 9 (390 px, light): the card before a code and after ───────────────────────────────────────────────────────────────────────────────────────────
  if (on(25)) {
    const b = await ptOpen({ stub: { partner: { code: null } } });
    await b.p.evaluate(() => document.querySelector('.pt-card').scrollIntoView({ block: 'center' })); await b.p.waitForTimeout(250);
    await b.p.screenshot({ path: path.join(out, 'partner-card-before-light-390.png') });
    await click(b.p, '#crewplayer-body .pt-make'); await b.p.waitForTimeout(500);
    await b.p.evaluate(() => document.querySelector('.pt-card').scrollIntoView({ block: 'center' })); await b.p.waitForTimeout(250);
    await b.p.screenshot({ path: path.join(out, 'partner-card-after-light-390.png') });
    await b.ctx.close();
    const c = await ptOpen({ stub: { partner: REF1({ friends: 1, waiting: 1 }) } });
    await c.p.evaluate(() => document.querySelector('.pt-card').scrollIntoView({ block: 'center' })); await c.p.waitForTimeout(250);
    await c.p.screenshot({ path: path.join(out, 'partner-card-friend-light-390.png') });
    await c.ctx.close();
  }

  // ── 26. Step 10 · the cards (ideas 63 and 66): Share my card, the stamp on a session photo, Share on your own session photo, and what Tell the crew sends ─────────────────
  // "Keep the player card you already have, with their own photo as the ground": Share my card on YOUR page opens the card Progress already has (sharePlayerCard), nothing new in it.
  // The stamp is one strip across the foot of a session photo on the Bell: LOWER · POWER · 64 MIN · WEEK HELD · 24 OCT, only the parts the post has (an old post: DAY 2 · 24 OCT).
  // Tell the crew sends title, mins and held beside day and n (CONTRACT 2). Your own session photo gets Share: the session card, with that very photo behind it. Never on anyone else's.
  const LVL = { base: 300, growth: 0.55, levels_per_rank: 5, prestige_after: 50, ranks: ['Rookie', 'Club'] };
  const careerP = () => ({ athlete_id: H.ID, ready: true, switch: { xp: '2026-10-01', catalogue: null }, rules_version: 3, career: { xp: 3000, level: 6, habits: {}, facts: {}, facts_xp: 0 },
    season: { name: 'Season 1', starts_on: '2026-10-01', points: 1234 }, week: { from: '2026-10-19', points: 900 }, since: '2026-06-06', kept: null,
    numbers: { weeks_held: { now: 2, best: 4 }, sessions_with_amir: 24, personal_bests: 3, comebacks: 1, days_on_target: 40, perfect_days: 10 }, titles_owned: [],
    rules: { version: 3, level: LVL, season: { title_points: 2000 }, prices: {} }, badges: [], achievements: [], missions: [], quest: null, moments: [] });
  const careerStub = () => ({ profile: careerP(), tables: { career_rules: [{ version: 3, switch: { xp: '2026-10-01', catalogue: 'off' } }], career_facts: [] } });
  const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dmon = ms => { const d = new Date(ms); return d.getDate() + ' ' + MON3[d.getMonth()]; };
  const PID = { a: 'bbbbbbbb-0000-4000-8000-0000000000a1', b: 'bbbbbbbb-0000-4000-8000-0000000000a2', c: 'bbbbbbbb-0000-4000-8000-0000000000a3', d: 'bbbbbbbb-0000-4000-8000-0000000000a4',
    e: 'bbbbbbbb-0000-4000-8000-0000000000a5', f: 'bbbbbbbb-0000-4000-8000-0000000000a6', g: 'bbbbbbbb-0000-4000-8000-0000000000a7' };
  const sessPost = (id, o = {}) => Object.assign({ t: 'post', id, who: 'Mina S.', me: false, amir: false, kind: 'session', body: '', photo: true, w: 1080, h: 1350, at: iso(now - 3600e3), pinned: false, left: 7,
    kudos: { n: 0, mine: false, names: [] }, replies: [] }, o);
  // a Bell with the posts under test and nothing else but Amir's pinned one; `lounge: false` = a server without stage96
  const stampBell = (posts, o = {}) => { const b = bell(o.b || {}); b.items = [b.items[0]].concat(posts); return b; };
  const T_A = now - 3600e3, T_D = now - 86400e3 * 2;
  const POSTS = () => [
    sessPost(PID.a, { who: 'Mina S.', ck: CK.mina, fv: null, session: { day: 2, n: 41, title: 'Lower · Power', mins: 64, held: true }, at: iso(T_A) }),
    sessPost(PID.b, { who: 'Reza K.', ck: CK.reza, fv: null, session: { day: 3, n: 12, mins: 40 }, at: iso(T_A - 60e3) }),
    sessPost(PID.c, { who: 'Ali B.', ck: CK.ali1, fv: null, session: { day: 4, n: 7, held: true }, at: iso(T_A - 120e3) }),
    sessPost(PID.d, { who: 'Leila M.', ck: CK.leila, fv: null, session: { day: 2, n: 41 }, at: iso(T_D) }),
    sessPost(PID.e, { who: 'Sara T.', ck: CK.sara, fv: null, kind: 'post', body: 'Look at this court.', session: null, at: iso(T_A - 180e3) }),
    sessPost(PID.f, { who: 'Alex R.', me: true, ck: CK.alex, fv: null, session: { day: 1, n: 26, title: 'Acceleration & Squat Strength', mins: 64, held: true }, at: iso(T_A - 240e3) }),
    sessPost(PID.g, { who: 'Alex R.', me: true, ck: CK.alex, fv: null, kind: 'post', body: 'Back at it.', session: null, at: iso(T_A - 300e3) })];
  const crewShot = async (b, o = {}) => { const x = await open(browser, Object.assign({ bell: b }, o)); await goCrew(x.p); await x.p.waitForTimeout(500); return x; };
  const stampOf = (p, id) => p.evaluate(i => {
    const art = document.querySelector('#crew-body .cr-post[data-id="' + i + '"]');
    if (!art) return null;
    const s = art.querySelector('.cr-stamp'), ph = art.querySelector('.cr-ph'), base = { share: art.querySelector('.cr-sh') ? art.querySelector('.cr-sh').textContent : null, hasPhoto: !!ph };
    if (!s) return Object.assign(base, { stamp: null });
    const r = s.getBoundingClientRect(), b = ph.getBoundingClientRect(), t = s.querySelector('.cr-st-t'), cs = getComputedStyle(t);
    return Object.assign(base, { stamp: t.textContent, shown: t.innerText, inside: r.left >= b.left - 1 && r.right <= b.right + 1 && Math.abs(r.bottom - b.bottom) <= 1 && r.height > 20, bg: getComputedStyle(s).backgroundColor,
      tt: cs.textTransform, ff: cs.fontFamily, color: cs.color, aa: s.querySelector('.cr-st-aa').textContent, tag: ph.tagName, pe: getComputedStyle(s).pointerEvents });
  }, id);
  if (on(26)) {
    // ── Share my card: the card you already have, from your own page
    const sa = await ptOpen({ stub: Object.assign({ partner: undefined }, careerStub()) });
    await sa.p.waitForFunction(() => !!document.querySelector('#crewplayer-body .pl-share'), null, { timeout: 8000 }).catch(() => {});
    const shr = await sa.p.evaluate(() => { const b = document.querySelector('#crewplayer-body .pl-share'); return b ? { txt: b.textContent, h: Math.round(b.getBoundingClientRect().height), inId: !!b.closest('.pl-id') } : null; });
    C.check('your own page has "Share my card" once Career Mode has your level (the same outlined button as Copy), up with your name', !!shr && shr.txt === 'Share my card' && shr.h >= 44 && shr.inId, JSON.stringify(shr));
    await click(sa.p, '#crewplayer-body .pl-share'); await sa.p.waitForTimeout(800);
    const sh = await sa.p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), title: (document.getElementById('hl-title') || {}).textContent, kind: _HL.specs[0] && _HL.specs[0].kind,
      same: JSON.stringify(_HL.specs[0]) === JSON.stringify(hlPlayerSpec()), spec: JSON.stringify(_HL.specs[0]), titles: HL_TITLE.player, photo: !!_HL.photo }));
    C.check('…it opens THE player card, the one Progress opens: the same sheet, the same spec, no photo until you choose one', sh.on && sh.kind === 'player' && sh.same && sh.title === sh.titles && !sh.photo, JSON.stringify([sh.on, sh.kind, sh.same, sh.title]));
    C.check('…and the card names nobody but you (a card never names another athlete)', /"first":"Alex"/.test(sh.spec) && !/Mina|Reza|Ali|Leila|Sara|Omid|Amir/.test(sh.spec), sh.spec);
    await sa.p.evaluate(() => closeHistorySheet());
    C.check('…no page errors', !sa.p.errs.length, sa.p.errs.join(' | '));
    await sa.ctx.close();
    const sn = await ptOpen({ stub: { partner: undefined } });
    C.check('with no career profile there is no card to share, so no button', !(await sn.p.$('#crewplayer-body .pl-share')));
    const pv = await sn.p.evaluate(() => { window.IS_PREVIEW = true; const h = playerShareHTML(); window.IS_PREVIEW = false; return h; });
    C.check('…and none in the coach\'s preview', pv === '');
    await sn.ctx.close();
    const so = await open(browser, { stub: careerStub() });
    await goCrew(so.p); await shown(so.p, CK.mina);
    await so.p.waitForTimeout(500);
    C.check('someone else\'s page has no Share my card', !(await so.p.$('#crewplayer-body .pl-share')));
    await so.ctx.close();

    // ── the stamp on a session photo of the Bell
    const sb = await crewShot(stampBell(POSTS()));
    const A = await stampOf(sb.p, PID.a), Bp = await stampOf(sb.p, PID.b), Cp = await stampOf(sb.p, PID.c), Dp = await stampOf(sb.p, PID.d);
    C.check('a session photo wears the stamp across its foot: the session, the minutes, WEEK HELD and the day it was posted', !!A && A.stamp === 'Lower · Power · 64 min · Week held · ' + dmon(T_A), JSON.stringify(A));
    C.check('…one strip inside the photo, flush with its foot, in Space Mono capitals, white on a dark shade, with the AA mark, and it never takes a tap from the photo', !!A && A.inside && A.shown === A.stamp.toUpperCase() && A.tt === 'uppercase' && /Space Mono/.test(A.ff) && A.bg === 'rgba(0, 0, 0, 0.64)' && A.color === 'rgb(255, 255, 255)' && A.aa === 'AA' && A.pe === 'none', JSON.stringify(A));
    C.check('…only the parts the post has: no title reads Day 3 · 40 min · date, a held week with nothing else reads Day 4 · Week held · date', !!Bp && Bp.stamp === 'Day 3 · 40 min · ' + dmon(T_A - 60e3) && !!Cp && Cp.stamp === 'Day 4 · Week held · ' + dmon(T_A - 120e3), JSON.stringify([Bp && Bp.stamp, Cp && Cp.stamp]));
    C.check('…an old post (only day and n) reads "Day 2 · 22 Oct"-style: the day and the date, nothing invented', !!Dp && Dp.stamp === 'Day 2 · ' + dmon(T_D), JSON.stringify(Dp && Dp.stamp));
    const Ep = await stampOf(sb.p, PID.e), Gp = await stampOf(sb.p, PID.g);
    C.check('a plain photo post has no stamp, yours or anyone\'s', !!Ep && Ep.hasPhoto && Ep.stamp === null && !!Gp && Gp.hasPhoto && Gp.stamp === null, JSON.stringify([Ep, Gp]));
    const Fp = await stampOf(sb.p, PID.f);
    C.check('your own session photo has its stamp too', !!Fp && Fp.stamp === 'Acceleration & Squat Strength · 64 min · Week held · ' + dmon(T_A - 240e3), JSON.stringify(Fp && Fp.stamp));
    await sb.p.evaluate(id => document.querySelector('#crew-body .cr-post[data-id="' + id + '"] .cr-ph').click(), PID.a); await sb.p.waitForTimeout(400);
    C.check('a tap on the photo still opens it in the viewer (the stamp is only drawn on it)', await sb.p.evaluate(() => document.getElementById('crew-viewer').classList.contains('visible')));
    await sb.p.evaluate(() => closeCrewPhoto());
    // Share: only on your own session photo
    const shares = await sb.p.evaluate(ids => Object.keys(ids).map(k => { const a = document.querySelector('#crew-body .cr-post[data-id="' + ids[k] + '"]'); const s = a && a.querySelector('.cr-sh'); return [k, s ? s.textContent : null]; }), PID);
    C.check('Share is on YOUR session photo and on no other post: not on theirs, not on your plain photo post', JSON.stringify(shares) === JSON.stringify([['a', null], ['b', null], ['c', null], ['d', null], ['e', null], ['f', 'Share'], ['g', null]]), JSON.stringify(shares));
    const side = await sb.p.evaluate(id => { const a = document.querySelector('#crew-body .cr-post[data-id="' + id + '"]'), s = a.querySelector('.cr-sh').getBoundingClientRect(), d = a.querySelector('.cr-del').getBoundingClientRect(); return { sLeft: s.left, dLeft: d.left, sH: Math.round(s.height), gap: Math.round(d.left - s.right) }; }, PID.f);
    C.check('…Share sits at the left of the post\'s foot and Delete stays at the right, a thumb apart, 44 px tall', side.sLeft < side.dLeft && side.gap >= 40 && side.sH >= 44, JSON.stringify(side));
    await sb.p.evaluate(id => document.querySelector('#crew-body .cr-post[data-id="' + id + '"] .cr-sh').click(), PID.f);
    await sb.p.waitForFunction(() => hlPhotoState().on, null, { timeout: 8000 }).catch(() => {});
    const card = await sb.p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), spec: _HL.specs[0], photo: String(_HL.photo || '').slice(0, 22), st: hlPhotoState(), live: !document.getElementById('hl-live').hidden,
      title: (document.getElementById('hl-title') || {}).textContent, btn: (document.getElementById('hl-ph-btn') || {}).textContent }));
    C.check('Share opens the session card with the post\'s own words: its name, its minutes and the day it was posted, and no other athlete\'s name', card.on && card.spec.kind === 'session' && card.spec.title === 'Acceleration & Squat Strength' && card.spec.mins === 64 && card.spec.date === (d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'))(new Date(T_A - 240e3))
      && card.spec.first === 'Alex' && !/Mina|Reza|Ali|Leila|Sara|Omid/.test(JSON.stringify(card.spec)), JSON.stringify(card.spec));
    C.check('…with THAT photo as its ground, read from the phone\'s copy: the photo is on, drawn live, and the button now offers another', card.st.on && card.photo.indexOf('data:image/jpeg') === 0 && card.st.pw > 0 && card.st.ph > 0 && card.live && card.btn === 'Choose another photo', JSON.stringify([card.photo, card.st, card.live, card.btn]));
    await sb.p.evaluate(() => hlPhotoOff()); await sb.p.waitForTimeout(300);
    C.check('…and Remove the photo still takes it off, as on every card', await sb.p.evaluate(() => !hlPhotoState().on));
    await sb.p.evaluate(() => closeHistorySheet());
    C.check('…no page errors', !sb.p.errs.length, sb.p.errs.join(' | '));
    await sb.ctx.close();
    // Share is yours alone even if someone calls it for another person's post, and not in the preview
    const sg = await crewShot(stampBell(POSTS()));
    await sg.p.evaluate(id => crewShareCard(id), PID.a); await sg.p.waitForTimeout(400);
    C.check('crewShareCard() on someone else\'s post does nothing (no sheet, no card)', await sg.p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
    await sg.p.evaluate(() => { window.IS_PREVIEW = true; }); await sg.p.evaluate(id => crewShareCard(id), PID.f); await sg.p.waitForTimeout(300);
    C.check('…and none in the coach\'s preview', await sg.p.evaluate(() => !document.getElementById('hist-overlay').classList.contains('visible')));
    await sg.ctx.close();
    // a server without stage96: the Bell is as it was: no stamp, no Share
    const ns = await crewShot(stampBell(POSTS(), { b: { noPages: true } }));
    const n1 = await stampOf(ns.p, PID.a), n2 = await stampOf(ns.p, PID.f);
    C.check('a server without stage96: no stamp on any photo and no Share, the Bell exactly as it was', !!n1 && n1.stamp === null && !!n2 && n2.stamp === null && n2.share === null, JSON.stringify([n1, n2]));
    await ns.ctx.close();
    // 320 px and dark: the strip fits and reads
    const nr = await crewShot(stampBell(POSTS()), { opts: { w: 320, h: 640 } });
    const m = await nr.p.evaluate(id => { const a = document.querySelector('#crew-body .cr-post[data-id="' + id + '"]'), s = a.querySelector('.cr-stamp').getBoundingClientRect(), p = a.querySelector('.cr-ph').getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, iw: innerWidth, left: Math.round(s.left - p.left), right: Math.round(p.right - s.right), h: Math.round(s.height), ph: Math.round(p.height) }; }, PID.f);
    C.check('320 px: the longest stamp wraps inside the photo (a strip under a quarter of its height), nothing scrolls sideways', m.sw <= m.iw && m.left === 0 && m.right === 0 && m.h * 4 < m.ph, JSON.stringify(m));
    await nr.ctx.close();
    const dk = await crewShot(stampBell(POSTS()), { opts: { dark: true } });
    const dA = await stampOf(dk.p, PID.a);
    C.check('dark mode: the strip is the same shade with white words (the photo\'s own, not the theme\'s)', !!dA && dA.bg === 'rgba(0, 0, 0, 0.64)' && dA.color === 'rgb(255, 255, 255)', JSON.stringify(dA));
    await dk.ctx.close();

    // ── Tell the crew sends the stamp's parts, and the composer shows them first
    const progOf = fn => { const P = H.fixture(); fn(P); return P; };
    const tellRun = async (o = {}) => {
      const x = await open(browser, Object.assign({ seed: Object.assign({ _timer_1: { acc: 64 * 60000, running: false }, _earn_d1: { t: iso(now), xp: 870, parts: [{ k: 'session', xp: 400 }, { k: 'week', xp: 400, pending: true }], before: 0, saved: 0 } }, o.seed || {}) }, o.o || {}));
      await goCrew(x.p);
      await x.p.evaluate(() => openCrewPost('session', '1')); await x.p.waitForTimeout(300);
      const note = await x.p.evaluate(() => { const n = document.querySelector('#hist-overlay .cr-stn'); return n ? n.textContent : null; });
      await x.p.evaluate(async () => {
        const c = document.createElement('canvas'); c.width = 900; c.height = 700; const g = c.getContext('2d'); g.fillStyle = '#345'; g.fillRect(0, 0, 900, 700); g.fillStyle = '#9ab'; g.fillRect(100, 300, 700, 40);
        const blob = await new Promise(r => c.toBlob(r, 'image/png')), dt = new DataTransfer(); dt.items.add(new File([blob], 'gym.png', { type: 'image/png' }));
        const inp = document.querySelector('#hist-overlay .cr-add input'); inp.files = dt.files; inp.dispatchEvent(new Event('change'));
      });
      await x.p.waitForFunction(() => !document.querySelector('#hist-overlay .cr-prev').hidden, null, { timeout: 8000 }).catch(() => {});
      await x.p.evaluate(() => document.querySelector('#hist-overlay .cr-go').click()); await x.p.waitForTimeout(700);
      x.note = note; x.post = (await calls(x.p, 'crew_post')).pop() || {};
      return x;
    };
    const t1 = await tellRun();
    const ses = t1.post.p_session || {};
    C.check('Tell the crew with stage96 sends day, n, the day\'s name, the minutes it took and whether it held the week (CONTRACT 2)', ses.day === 1 && 'n' in ses && ses.title === 'Acceleration & Squat Strength' && ses.mins === 64 && ses.held === true
      && Object.keys(ses).sort().join() === 'day,held,mins,n,title' && t1.post.p_kind === 'session', JSON.stringify(ses));
    C.check('…the composer showed the stamp first, in the same words the post will wear', new RegExp('^Acceleration & Squat Strength · 64 min · Week held · ' + dmon(now) + '$').test(t1.note || ''), String(t1.note));
    const landed = await t1.p.evaluate(() => { const i = BELL.items.find(x => x.me && x.kind === 'session'); return i && i.session; });
    C.check('…and the post, once it is on the Bell, carries them (the stub keeps what stage96 keeps)', !!landed && landed.title === 'Acceleration & Squat Strength' && landed.mins === 64 && landed.held === true, JSON.stringify(landed));
    await t1.ctx.close();
    const t2 = await tellRun({ seed: { _earn_d1: null, _timer_1: null } });
    const s2 = t2.post.p_session || {};
    C.check('a session with no clock and no earn record: held is false and there are no minutes, never a guess', s2.held === false && !('mins' in s2) && s2.title === 'Acceleration & Squat Strength', JSON.stringify(s2));
    C.check('…and the composer says only what it will say: the name and the date', new RegExp('^Acceleration & Squat Strength · ' + dmon(now) + '$').test(t2.note || ''), String(t2.note));
    await t2.ctx.close();
    const t3 = await tellRun({ seed: { _timer_1: { acc: 6 * 3600000, running: false } } });
    C.check('a clock of six hours (a phone left running) is not sent as minutes', !('mins' in (t3.post.p_session || {})), JSON.stringify(t3.post.p_session));
    await t3.ctx.close();
    const t4 = await tellRun({ o: { opts: { prog: progOf(P => { P.workouts.days[0].focusTag = 'Acceleration and Squat Strength with a Rather Long Name'; }) } } });
    const tt4 = (t4.post.p_session || {}).title || '';
    C.check('a long day name is cut to 40 characters at the end of a word', tt4.length > 0 && tt4.length <= 40 && tt4 === 'Acceleration and Squat Strength with a', JSON.stringify(tt4));
    await t4.ctx.close();
    const t5 = await tellRun({ o: { opts: { prog: progOf(P => { P.workouts.days[0].title = 'Lower · Power'; }) } } });
    C.check('a day with its own title is named by it before its focus tag', (t5.post.p_session || {}).title === 'Lower · Power', JSON.stringify(t5.post.p_session));
    await t5.ctx.close();
    const t6 = await tellRun({ o: { b: { noPages: true } } });
    C.check('a server without stage96 is sent day and n only, exactly as before, and the composer shows no stamp line', Object.keys(t6.post.p_session || {}).sort().join() === 'day,n' && t6.note === null, JSON.stringify([t6.post.p_session, t6.note]));
    await t6.ctx.close();
    const t7 = await tellRun({ o: { stub: careerStub() }, seed: { _earn_d1: { t: iso(now), xp: 470, parts: [{ k: 'session', xp: 400 }], before: 0, saved: 0 } } });
    C.check('a session that did not close its week says held: false (the earn record has no week part)', (t7.post.p_session || {}).held === false && (t7.post.p_session || {}).mins === 64, JSON.stringify(t7.post.p_session));
    await t7.ctx.close();

    // the guide names the stamp, Share and Share my card in plain words
    const gx = await open(browser, { stub: careerStub() });
    await goCrew(gx.p);
    const gt = await gx.p.evaluate(() => buildAppGuideCards());
    const gseg = (gt.match(/<p>A photo you post with <strong>Tell the crew<\/strong>[\s\S]*?<\/p>/) || [''])[0] + (gt.match(/<p><strong>Share my card<\/strong>[\s\S]*?<\/p>/) || [''])[0];
    C.check('the guide says the stamp, Share on your own session photo, and Share my card, in plain words (no em-dash, no semicolon)', /wears a small stamp/.test(gseg) && /WEEK HELD/.test(gseg) && /tap <strong>Share<\/strong>/.test(gseg) && /Nobody else's photo has Share/.test(gseg) && /Share my card<\/strong>, on your own page/.test(gseg) && !/[—;]/.test(gseg.replace(/&[a-z]+;/g, '')), gseg.slice(0, 100));
    await gx.ctx.close();
  }

  // ── 27. the pictures for step 10 (390 px): a stamped photo post, light and dark ──────────────────────────────────────────────────────────────────────────────────────────────
  if (on(27)) {
    for (const dark of [false, true]) {
      const x = await open(browser, { bell: stampBell(POSTS()), opts: { dark } });
      // a made-up photo for the stub to hand out: a dim gym, a bar across a rack
      const b64 = await x.p.evaluate(() => {
        const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const g = c.getContext('2d');
        const sky = g.createLinearGradient(0, 0, 0, 1350); sky.addColorStop(0, '#7f9bb3'); sky.addColorStop(.55, '#4a6378'); sky.addColorStop(1, '#1c2b38'); g.fillStyle = sky; g.fillRect(0, 0, 1080, 1350);
        g.fillStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.arc(540, 470, 120, 0, 7); g.fill(); g.beginPath(); g.ellipse(540, 760, 280, 210, 0, 0, 7); g.fill();
        g.fillStyle = 'rgba(0,0,0,.6)'; g.fillRect(60, 600, 960, 22); g.fillRect(60, 500, 56, 220); g.fillRect(964, 500, 56, 220);
        return c.toDataURL('image/jpeg', .8).split(',')[1];
      });
      await x.p.evaluate(b => { window.__STUB.photoB64 = b; }, b64);
      await goCrew(x.p); await x.p.waitForTimeout(900);
      await x.p.evaluate(id => { const a = document.querySelector('#crew-body .cr-post[data-id="' + id + '"]'); a.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }, PID.a);
      await x.p.waitForTimeout(500);
      await x.p.screenshot({ path: path.join(out, 'stamp-post-' + (dark ? 'dark' : 'light') + '-390.png') });
      if (!dark) {
        await x.p.evaluate(id => { const a = document.querySelector('#crew-body .cr-post[data-id="' + id + '"]'); a.scrollIntoView({ block: 'start' }); window.scrollBy(0, -70); }, PID.f);
        await x.p.waitForTimeout(400);
        await x.p.screenshot({ path: path.join(out, 'stamp-own-post-light-390.png') });
      }
      await x.ctx.close();
    }
  }

  // ── 28. Step 11 · the Open wall (idea 67): the board as two columns of tiles ────────────────────────────────────────────────────────────────────────────────────────────────
  // frag-s11 A: a tile is the place, the face, the result big and the name; yours is outlined in mint; the first 8, then "All 14 ›" which opens the whole board as a list; every tile opens that person's page.
  // The clay door to WhatsApp and the line under it stay as they were. With no stage96 the board is the rows it always was (crew.js holds those). A card never names another athlete: none of this goes on a share card.
  const WALL_NAMES = ['Reza K.', 'Ehsan A.', 'Mina S.', 'Sara T.', 'Omid P.', 'Leila M.', 'Ali B.', 'Nima F.', 'Dara H.', 'Kian R.', 'Yasi G.', 'Pouya L.', 'Roya D.', 'Tara N.'];
  const WALL_CK = { 'Reza K.': CK.reza, 'Mina S.': CK.mina, 'Sara T.': CK.sara, 'Omid P.': CK.omid, 'Leila M.': CK.leila, 'Ali B.': CK.ali1 };
  const wallBoard = (n, meAt, o = {}) => Array.from({ length: n }, (_, i) => { const me = i + 1 === meAt, nm = me ? 'Alex R.' : WALL_NAMES[i % WALL_NAMES.length];
    return { who: nm, value: 200 - i * 7, place: i + 1, me, ck: me ? CK.alex : (WALL_CK[nm] || ck(40 + i)), fv: (o.fv && o.fv[me ? CK.alex : (WALL_CK[nm] || '')]) || null }; });
  const wallOpen = async (n, meAt, o = {}) => {
    const b = bell(o.b || {});
    const board_ = o.board || wallBoard(n, meAt, o), mine = board_.find(r => r.me);
    b.open = { id: 'aaaaaaaa-0000-4000-8000-000000000084', title: 'Wall Sit', how: 'Back to the wall, knees at 90. Send me the clip.', unit: o.unit === undefined ? 'seconds' : o.unit, better: 'high', board: o.noBoard ? [] : board_,
      mine: mine ? { value: mine.value, day: today } : (o.mine || null) };
    const x = await open(browser, { bell: b, opts: o.opts, stub: o.stub });
    if (o.faces) await putFaces(x.p, o.faces);
    await goCrew(x.p); await x.p.waitForTimeout(o.faces ? 900 : 300);
    return x;
  };
  const wallState = p => p.evaluate(() => {
    const c = document.querySelector('#screen-crew .cr-open'), g = c && c.querySelector('.cr-ob'), t = [...document.querySelectorAll('#screen-crew .cr-tiles .cr-ob-r')];
    const r = e => { const b = e.getBoundingClientRect(); return { left: Math.round(b.left), top: Math.round(b.top + scrollY), w: Math.round(b.width), h: Math.round(b.height) }; };
    return { grid: !!g && g.classList.contains('cr-tiles'), cols: g ? getComputedStyle(g).gridTemplateColumns.split(' ').length : 0, rows: g ? [...g.querySelectorAll('.cr-ob-r')].length : 0,
      tiles: t.map(e => ({ tag: e.tagName, me: e.classList.contains('me'), place: (e.querySelector('.p') || {}).textContent, name: (e.querySelector('.n') || {}).textContent, v: (e.querySelector('.v') || {}).textContent,
        face: !!e.querySelector('.cr-tf'), order: [...e.children].map(k => k.className.split(' ')[0]).join(','), pos: r(e), pic: !!e.querySelector('.cr-tf > img.fc-img') })),
      more: ((c && c.querySelector('.cr-o-more')) || {}).textContent || '', go: c ? (c.querySelector('.cr-o-go') || {}).textContent : '', goTop: c && c.querySelector('.cr-o-go') ? r(c.querySelector('.cr-o-go')).top : 0,
      gridBottom: g ? r(g).top + r(g).h : 0, mine: ((c && c.querySelector('.cr-o-mine')) || {}).textContent || '', share: !!(c && c.querySelector('.cr-o-share')), none: !!(c && c.querySelector('.cr-o-none')),
      href: c && c.querySelector('.cr-o-go') ? c.querySelector('.cr-o-go').getAttribute('href') : '', sw: document.documentElement.scrollWidth, iw: innerWidth };
  });
  const tapTile = (p, name) => p.evaluate(n => { const e = [...document.querySelectorAll('#screen-crew .cr-tiles .cr-ob-r')].find(x => x.querySelector('.n').textContent === n); if (!e) return false; e.click(); return true; }, name);
  const listState = p => p.evaluate(() => ({ on: document.getElementById('hist-overlay').classList.contains('visible'), eyebrow: (document.querySelector('#hist-overlay .readiness-eyebrow') || {}).textContent, title: (document.querySelector('#hist-overlay .readiness-title') || {}).textContent,
    sub: (document.querySelector('#hist-overlay .readiness-sub') || {}).textContent, back: !!document.querySelector('#hist-overlay .sheet-back'),
    rows: [...document.querySelectorAll('#hist-overlay .ol-r')].map(r => ({ tag: r.tagName, me: r.classList.contains('me'), p: r.querySelector('.p').textContent, t: r.querySelector('.t').textContent, v: r.querySelector('.v').textContent, face: !!r.querySelector('.cr-fl') })) }));
  if (on(28)) {
    // four entries, you second
    const a = await wallOpen(4, 2, { faces: [[CK.reza, '#2A5C8A', 7]], fv: { [CK.reza]: 7 } });
    const s = await wallState(a.p), t = s.tiles;
    C.check('with stage96 the board is a grid of TILES, two columns, one tile for each entry, in the board\'s order', s.grid && s.cols === 2 && t.length === 4 && t.map(x => x.place).join() === '1,2,3,4' && t.map(x => x.name).join() === 'Reza K.,You,Mina S.,Sara T.', JSON.stringify([s.grid, s.cols, t.map(x => x.place + x.name)]));
    C.check('…each tile is the place, the face, the result big and the name, in that order; the result carries its unit', t.every(x => x.order === 'p,cr-tf,v,n' && x.face) && t[0].v === '200 seconds' && t[1].v === '193 seconds', JSON.stringify([t[0].order, t[0].v, t[1].v]));
    C.check('…two across: tiles 1 and 2 share a row, 3 is under 1, and tiles are the same width', t[0].pos.top === t[1].pos.top && t[1].pos.left > t[0].pos.left && t[2].pos.top > t[0].pos.top && t[2].pos.left === t[0].pos.left && Math.abs(t[0].pos.w - t[1].pos.w) <= 1, JSON.stringify(t.map(x => x.pos)));
    C.check('…a tile is a door (a button) to that person\'s page', t.every(x => x.tag === 'BUTTON'));
    C.check('…yours is the one outlined tile, and it reads You', t.filter(x => x.me).length === 1 && t[1].me && t[1].name === 'You');
    const look = await a.p.evaluate(() => { const tiles = [...document.querySelectorAll('#screen-crew .cr-tiles .cr-ob-r')], probe = document.createElement('i'); probe.style.cssText = 'border:2px solid var(--mint);position:absolute'; document.body.appendChild(probe);
      const mint = getComputedStyle(probe).borderTopColor; probe.remove(); const c = i => getComputedStyle(tiles[i]);
      const v = getComputedStyle(tiles[0].querySelector('.v')), v2 = getComputedStyle(tiles[0].querySelector('.v b')), n = getComputedStyle(tiles[0].querySelector('.n')), f = tiles[0].querySelector('.cr-tf').getBoundingClientRect();
      return { me: c(1).borderTopWidth + ' ' + (c(1).borderTopColor === mint), other: c(0).borderTopWidth, vSize: v.fontSize, vFont: v.fontFamily, vW: v2.fontWeight, nSize: n.fontSize, face: Math.round(f.width) + 'x' + Math.round(f.height) }; });
    C.check('…the outline is 2 px of the mint, the others 1 px; the result is the 28 px display figure and the name the small line; the face is 46 px', look.me === '2px true' && look.other === '1px' && look.vSize === '28px' && /Barlow Condensed/.test(look.vFont) && look.vW === '900' && look.nSize === '13px' && look.face === '46x46', JSON.stringify(look));
    C.check('…the face of a person with a picture is the picture (and the letters under it for the rest)', t[0].pic && !t[2].pic, JSON.stringify(t.map(x => x.pic)));
    C.check('the clay door to WhatsApp, your result, the share door and the line are as before, under the tiles', s.go === 'Send a better one' && /wa\.me|whatsapp/.test(s.href) && /Wall%20Sit|Wall\+Sit|Wall Sit/.test(decodeURI(s.href)) && /Your result: 193 seconds/.test(s.mine) && s.share && s.goTop > s.gridBottom, JSON.stringify([s.go, s.mine, s.share, s.goTop, s.gridBottom]));
    C.check('…eight or fewer: no "All" button', s.more === '');
    // a tile opens a page; Back returns to Crew
    await tapTile(a.p, 'Reza K.'); await a.p.waitForTimeout(700);
    const pg = await a.p.evaluate(() => ({ screen: (document.querySelector('.screen.active') || {}).id, ck: _playerCk, name: (document.querySelector('#crewplayer-body .pl-name') || {}).textContent, tab: (document.querySelector('#global-tabs .nav-item.active') || {}).dataset.tab }));
    C.check('a tile opens that person\'s page (Reza\'s), with Crew still lit', pg.screen === 'screen-crewplayer' && pg.ck === CK.reza && /Reza/.test(pg.name || '') && pg.tab === 'crew', JSON.stringify(pg));
    await a.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await a.p.waitForTimeout(400);
    C.check('…← returns to Crew, where the wall is', (await screenNow(a.p)) === 'screen-crew' && (await wallState(a.p)).tiles.length === 4);
    await tapTile(a.p, 'You'); await a.p.waitForTimeout(600);
    C.check('your own tile opens your own page', await a.p.evaluate(() => _playerCk === 'me' && /Your numbers/.test(document.getElementById('crewplayer-body').textContent)));
    C.check('…no page errors', !a.p.errs.length, a.p.errs.join(' | '));
    await a.ctx.close();

    // more than eight: the first eight, yours carried in under them when it is outside, and "All 14 ›"
    const m = await wallOpen(14, 11);
    const sm = await wallState(m.p);
    C.check('fourteen entries, you eleventh: the first 8, your own tile carried in after them (still marked 11), and the button reads exactly "All 14 ›"', sm.tiles.length === 9 && sm.tiles.slice(0, 8).map(x => x.place).join() === '1,2,3,4,5,6,7,8' && sm.tiles[8].me && sm.tiles[8].place === '11' && sm.tiles[8].name === 'You' && sm.more === 'All 14 ›', JSON.stringify([sm.tiles.map(x => x.place), sm.more]));
    await click(m.p, '#screen-crew .cr-o-more'); await m.p.waitForTimeout(500);
    const l = await listState(m.p);
    C.check('"All 14 ›" opens a sheet, The Open, with the challenge and "14 entries"', l.on && l.eyebrow === 'The Open' && l.title === 'Wall Sit' && l.sub === '14 entries', JSON.stringify([l.on, l.eyebrow, l.title, l.sub]));
    C.check('…every entry is a row: place, face, name, result, in order; yours is marked and reads You', l.rows.length === 14 && l.rows.map(r => r.p).join() === '1,2,3,4,5,6,7,8,9,10,11,12,13,14' && l.rows[0].t === 'Reza K.' && l.rows[0].v === '200 seconds' && l.rows[0].face && l.rows[10].me && l.rows[10].t === 'You' && l.rows.filter(r => r.me).length === 1, JSON.stringify(l.rows.slice(0, 2).concat(l.rows[10])));
    C.check('…every row is a door (a button), and the rows fit the sheet', l.rows.filter(r => r.tag === 'BUTTON').length === 14 && await m.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await m.p.evaluate(() => { const r = [...document.querySelectorAll('#hist-overlay .ol-r')].find(x => x.querySelector('.t').textContent === 'Reza K.'); r.click(); }); await m.p.waitForTimeout(700);
    const pr = await m.p.evaluate(() => ({ sheet: document.getElementById('hist-overlay').classList.contains('visible'), screen: (document.querySelector('.screen.active') || {}).id, ck: _playerCk }));
    await m.p.evaluate(() => document.querySelector('#screen-crewplayer .nav-back').click()); await m.p.waitForTimeout(400);
    C.check('…a row opens that person\'s page and closes the sheet; ← returns to Crew', !pr.sheet && pr.screen === 'screen-crewplayer' && pr.ck === CK.reza && (await screenNow(m.p)) === 'screen-crew', JSON.stringify(pr));
    await m.p.evaluate(() => { openAccount(); }); await m.p.waitForTimeout(300);
    await m.p.evaluate(() => openCrewOpenList()); await m.p.waitForTimeout(300);
    C.check('"All 14 ›" is a sheet opener like the others: opened over another sheet it has ‹ Back', (await listState(m.p)).back);
    await m.p.evaluate(() => closeHistorySheet());
    C.check('…no page errors', !m.p.errs.length, m.p.errs.join(' | '));
    await m.ctx.close();
    const m3 = await wallOpen(14, 3);
    const s3 = await wallState(m3.p);
    C.check('fourteen entries, you third: eight tiles, you among them once, and "All 14 ›"', s3.tiles.length === 8 && s3.tiles.filter(x => x.me).length === 1 && s3.tiles[2].me && s3.more === 'All 14 ›', JSON.stringify([s3.tiles.length, s3.more]));
    await m3.ctx.close();
    const m8 = await wallOpen(8, 5), m9 = await wallOpen(9, 5);
    const s8 = await wallState(m8.p), s9 = await wallState(m9.p);
    C.check('eight entries: eight tiles and no button; nine: eight tiles and "All 9 ›"', s8.tiles.length === 8 && s8.more === '' && s9.tiles.length === 8 && s9.more === 'All 9 ›', JSON.stringify([s8.tiles.length, s8.more, s9.tiles.length, s9.more]));
    await m8.ctx.close(); await m9.ctx.close();
    // one entry says "1 entry" in the list; an empty board is the old line, with no tiles
    const m1 = await wallOpen(1, 1);
    await m1.p.evaluate(() => openCrewOpenList()); await m1.p.waitForTimeout(300);
    C.check('a one-entry list says "1 entry"', (await listState(m1.p)).sub === '1 entry');
    await m1.ctx.close();
    const m0 = await wallOpen(0, 0, { noBoard: true });
    const s0 = await wallState(m0.p);
    C.check('nobody on the board: "Nobody has put a result up yet. Be first." and no tiles, no button, the door asks for the first result', s0.none && s0.tiles.length === 0 && s0.more === '' && s0.go === 'Send Amir your result', JSON.stringify(s0));
    await m0.ctx.close();
    // not in the crew: the board is the members', your own result still shows; under 13: tiles are not doors
    const nm = await wallOpen(5, 0, { b: { me: { answer: 'no', can_post: false } }, mine: { value: 80, day: today } });
    const sn = await wallState(nm.p);
    C.check('not in the crew: the members\' tiles, no tile of yours, and your own result under them', sn.tiles.length === 5 && !sn.tiles.some(x => x.me) && /Your result: 80 seconds/.test(sn.mine), JSON.stringify(sn.tiles.map(x => x.name)));
    await nm.ctx.close();
    const u = await wallOpen(6, 2, { b: { me: { under13: true, can_post: false } } });
    const su = await wallState(u.p);
    C.check('under 13 reads only: the same tiles, none of them a door', su.tiles.length === 6 && su.tiles.every(x => x.tag === 'DIV'), JSON.stringify(su.tiles.map(x => x.tag)));
    await u.ctx.close();
    // a server without stage96: the rows as they were, Show all in place
    const old = await wallOpen(9, 8, { b: { noPages: true } });
    const so = await old.p.evaluate(() => { const g = document.querySelector('#screen-crew .cr-ob'); return { tiles: g.classList.contains('cr-tiles'), rows: g.querySelectorAll('.cr-ob-r').length, more: document.querySelector('.cr-o-more').textContent, faces: g.querySelectorAll('.cr-tf').length }; });
    C.check('a server without stage96: the same rows as ever (five and yours), no tiles, "Show all 9"', !so.tiles && so.rows === 6 && so.more === 'Show all 9' && so.faces === 0, JSON.stringify(so));
    await old.p.evaluate(() => crewOpenAll()); await old.p.waitForTimeout(300);
    C.check('…and Show all opens them in place, with no sheet', await old.p.evaluate(() => document.querySelectorAll('#screen-crew .cr-ob-r').length === 9 && !document.getElementById('hist-overlay').classList.contains('visible')));
    await old.ctx.close();
    // a card never names another athlete: your Open card is still your own result, your place and the size of the field
    const cd = await wallOpen(14, 4);
    const spec = await cd.p.evaluate(() => JSON.stringify(hlOpenSpec()));
    C.check('the Open\'s share card is untouched: your result, your place and the size of the field, no other name', /"place":4/.test(spec) && /"field":14/.test(spec) && /"first":"Alex"/.test(spec) && !/Reza|Ehsan|Mina|Sara|Omid|Leila|Ali|Nima|Dara/.test(spec), spec);
    await cd.ctx.close();
    // 320 px: two columns still, a long name and a long unit stay inside their tile
    const longB = wallBoard(5, 2).map((r, i) => i === 0 ? Object.assign({}, r, { who: 'Alexandra Konstantinopoulou-Papadakis' }) : r);
    const nr = await wallOpen(5, 2, { opts: { w: 320, h: 640 }, board: longB, unit: 'minutes and seconds' });
    const sr = await wallState(nr.p);
    const ov = await nr.p.evaluate(() => [...document.querySelectorAll('#screen-crew .cr-tiles .cr-ob-r')].map(t => { const r = t.getBoundingClientRect(); return [...t.querySelectorAll('.p, .cr-tf, .v, .n')].every(k => { const q = k.getBoundingClientRect(); return q.left >= r.left - 1 && q.right <= r.right + 1; }); }));
    C.check('320 px: still two columns, every tile\'s contents inside it (a long name is cut with an ellipsis, a long unit wraps), nothing scrolls sideways', sr.cols === 2 && ov.every(Boolean) && sr.sw <= sr.iw && sr.tiles[0].pos.w >= 120, JSON.stringify([sr.cols, ov, sr.sw, sr.iw, sr.tiles[0].pos]));
    await nr.ctx.close();
    const dk = await wallOpen(6, 2, { opts: { dark: true } });
    const dl = await dk.p.evaluate(() => { const t = [...document.querySelectorAll('#screen-crew .cr-tiles .cr-ob-r')], probe = document.createElement('i'); probe.style.cssText = 'border:2px solid var(--mint);position:absolute'; document.body.appendChild(probe); const mint = getComputedStyle(probe).borderTopColor; probe.remove();
      return { bg: getComputedStyle(t[0]).backgroundColor, ink: getComputedStyle(t[0].querySelector('.v')).color, me: getComputedStyle(t[1]).borderTopColor === mint }; });
    C.check('dark mode: the tiles are dark with a light figure and yours keeps its mint outline', dl.bg !== 'rgb(255, 255, 255)' && /^rgb\((2[0-9]{2}|1[89][0-9]|2[0-9])/.test(dl.ink) && dl.me, JSON.stringify(dl));
    await dk.ctx.close();
    // the guide
    const gx = await wallOpen(4, 2);
    const gt = await gx.p.evaluate(() => buildAppGuideCards());
    const gseg = (gt.match(/<p><strong>The Open<\/strong> on Crew is a wall of tiles[\s\S]*?<\/p>/) || [''])[0];
    C.check('the guide says the wall in plain words: tiles, your green outline, a tap for the page, "All" past eight', /wall of tiles/.test(gseg) && /green outline/.test(gseg) && /Tap a tile/.test(gseg) && /<strong>All<\/strong>/.test(gseg) && !/[—;]/.test(gseg.replace(/&[a-z]+;/g, '')), gseg.slice(0, 80));
    await gx.ctx.close();
  }

  // ── 29. the pictures for step 11 (390 px, light): the Open wall with faces, and the list behind "All 14 ›" ──────────────────────────────────────────────────────────────────────
  if (on(29)) {
    const people = [[CK.reza, '#7C6B8F', '#E8C4A0', '#26322C', 7], [CK.mina, '#9CB4C6', '#C98E6A', '#8C3D2B', 8], [CK.sara, '#6E8FA3', '#D8A682', '#7A4E3A', 9], [CK.omid, '#A9B79A', '#B07B58', '#3C5A7A', 10],
      [CK.leila, '#C9A99A', '#E0B493', '#4F6B52', 11], [CK.alex, '#5E8C7A', '#E3B896', '#2E4A57', 12]];
    const x = await wallOpen(14, 4);
    await x.p.evaluate(rows => {
      const faces = {};
      rows.forEach(([k, bg, skin, shirt, fv]) => {
        const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        const gr = g.createLinearGradient(0, 0, 128, 128); gr.addColorStop(0, bg); gr.addColorStop(1, '#1F3A30'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        g.fillStyle = shirt; g.beginPath(); g.ellipse(64, 132, 48, 40, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = skin; g.fillRect(56, 70, 16, 18); g.beginPath(); g.ellipse(64, 52, 21, 25, 0, 0, Math.PI * 2); g.fill();
        faces[k] = { fv, b64: c.toDataURL('image/jpeg', 0.85).split(',')[1] };
      });
      window.__STUB.faces = faces;
      // the board rows carry the versions, so each tile asks for its face
      BELL.open.board.forEach(r => { if (r.ck in faces) r.fv = faces[r.ck].fv; }); renderCrew();
    }, people);
    await x.p.waitForTimeout(1300);
    await x.p.evaluate(() => { const c = document.querySelector('#screen-crew .cr-open'); c.scrollIntoView({ block: 'start' }); window.scrollBy(0, -16); }); await x.p.waitForTimeout(300);
    await x.p.screenshot({ path: path.join(out, 'open-wall-light-390.png') });
    await click(x.p, '#screen-crew .cr-o-more'); await x.p.waitForTimeout(600);
    await x.p.screenshot({ path: path.join(out, 'open-wall-all-light-390.png') });
    await x.ctx.close();
  }


  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
