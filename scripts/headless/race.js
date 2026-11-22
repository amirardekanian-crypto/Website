// The Race on Crew (stage120, 2026-11-22, Amir's direction A): node scripts/headless/race.js
//
// The board is a card under the crew's week, not at the foot of the feed; three tabs (7 days, Month, Season) that ask crew_board(p_scope)
// and remember the pick on this phone; the top three and you; seven dots of the last 7 days on the 7-day board, "N days" on the others;
// first place's face ringed in clay (never gold); the line that names who to catch (or who is behind you when you lead); ▲/▼ against the
// last day this phone saw the board; the whole board's page follows the tab; every copy stays off the progress push; a server before
// stage120 gets the season alone, with no tabs. Made-up people only. Serve the repo first (see lib.js: PLAYWRIGHT, CHROMIUM, BASE).
'use strict';
const H = require('./lib');

const now = Date.now(), iso = ms => new Date(ms).toISOString();
const CK = n => 'eeeeeeee-0000-4000-8000-00000000000' + n;
function bell() {
  return {
    athlete_id: H.ID, at: iso(now), days: 7, kinds: ['level', 'week'], lounge: true,
    me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, ck: CK(9), fv: null, kinds: { level: true, week: true } },
    week: { members: 6, sessions: 14, held: 3 },
    crew: [{ who: 'Alex R.', me: true, ck: CK(9), lv: 9 }, { who: 'Reza K.', ck: CK(1), lv: 20 }, { who: 'Sara T.', ck: CK(2), lv: 12 }],
    items: [{ t: 'post', id: '11111111-2222-3333-4444-555555555555', who: 'Amir', me: false, amir: true, kind: 'post', body: 'Hold the week.', photo: false, at: iso(now - 3600e3), pinned: true, left: 7, kudos: { n: 0, mine: false, names: [] } }],
  };
}
const row = (pos, who, points, me, n, wk, days) => ({ pos, who, points, level: 10, is_me: !!me, ck: me ? CK(9) : CK(n), fv: null, days, wk });
const BOARDS = {
  week: [row(1, 'Dennis K.', 4628, 0, 1, '0111010', 4), row(2, 'Elaheh A.', 4033, 0, 2, '1111111', 7), row(3, 'Tara M.', 3341, 0, 3, '1111110', 6),
         row(4, 'Sam R.', 3300, 0, 4, '1010000', 2), row(5, 'Alex R.', 3178, 1, 0, '1111100', 5)],
  month: [row(1, 'Alex R.', 13785, 1, 0, '1111100', 30), row(2, 'Dennis K.', 11641, 0, 1, '0111010', 29), row(3, 'Tara M.', 9000, 0, 3, '1111110', 20)],
  season: [row(1, 'Elaheh A.', 16020, 0, 2, '1111111', 34), row(2, 'Alex R.', 15475, 1, 0, '1111100', 35)],
};
const waitTab = p => p.waitForFunction(() => !!document.querySelector('#global-tabs .nav-item[data-tab="crew"]'), null, { timeout: 8000 }).then(() => true, () => false);
const card = p => p.evaluate(() => {
  const c = document.getElementById('crew-race');
  if (!c) return null;
  const all = [...document.querySelectorAll('#crew-body > *')];
  return {
    idx: all.indexOf(c), weekIdx: all.findIndex(e => e.classList && e.classList.contains('cr-week')), bellIdx: all.findIndex(e => /The Bell/.test(e.textContent || '') && e.tagName === 'H2'),
    head: (c.querySelector('.prog-sec') || {}).textContent || '',
    tabs: [...c.querySelectorAll('.cr-seg button')].map(b => b.textContent + (b.getAttribute('aria-selected') === 'true' ? '*' : '')).join('|'),
    rows: [...c.querySelectorAll('.cr-br')].map(r => (r.querySelector('.p') || {}).textContent + ' ' + ((r.querySelector('.nt') || {}).firstChild || {}).textContent + ' ' + (r.querySelector('.x') || {}).textContent),
    dots: [...c.querySelectorAll('.cr-br')].map(r => [...r.querySelectorAll('.cr-dots i')].map(i => i.classList.contains('y') ? 1 : 0).join('')),
    dn: [...c.querySelectorAll('.cr-dn')].map(x => x.textContent),
    mv: [...c.querySelectorAll('.cr-mv')].map(x => x.textContent),
    p1: !!c.querySelector('.cr-br.p1 .cr-fl'), ring: (() => { const f = c.querySelector('.cr-br.p1 .cr-fl'); return f ? getComputedStyle(f).boxShadow : ''; })(),
    chase: (c.querySelector('.cr-chase') || {}).textContent || '',
    door: !!c.querySelector('.cr-me-row'),
  };
});

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  // 1. the card, on the 7-day board
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, stub: { bell: bell(), crewBoards: BOARDS } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(900);
    const s = await card(p);
    C.check('the Race is on Crew', !!s, JSON.stringify(s));
    C.check('…straight under the crew\'s week, above the Bell', s && s.idx === s.weekIdx + 1 && s.idx < s.bellIdx, s && [s.weekIdx, s.idx, s.bellIdx].join(' < '));
    C.check('…titled The race, Last 7 days', s && /The race/.test(s.head) && /Last 7 days/i.test(s.head), s && s.head);
    C.check('…three tabs, 7 days picked first', s && s.tabs === '7 days*|Month|Season', s && s.tabs);
    C.check('…the top three, then you', s && s.rows.length === 4 && /^1 Dennis K\./.test(s.rows[0]) && /^5 You/.test(s.rows[3]), s && JSON.stringify(s.rows));
    C.check('…seven dots under every name, today last', s && s.dots[0] === '0111010' && s.dots[3] === '1111100', s && JSON.stringify(s.dots));
    C.check('…first place\'s face in a clay ring', s && s.p1 && /199, 85, 47|rgb\(199, 85, 47\)/.test(s.ring), s && s.ring);
    C.check('…the one line of who to catch (the row just above you, even past the top three)', s && /122 points behind Sam for 4th/.test(s.chase), s && s.chase);
    C.check('…and the whole board behind its door', s && s.door);
    C.check('…no arrows on the first day this phone sees a board', s && !s.mv.length, s && s.mv.join());
    const asked = await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'crew_board').map(x => (x[1] || {}).p_scope || 'season'));
    C.check('it asks crew_board for the 7 days', asked.includes('week'), asked.join());
    // the Month tab
    await p.click('#crew-race .cr-seg button[data-scope="month"]'); await p.waitForTimeout(700);
    const m = await card(p);
    C.check('Month: the tab is picked and the board is the 30 days', m && m.tabs === '7 days|Month*|Season' && /^1 You/.test(m.rows[0]) && /Last 30 days/i.test(m.head), m && (m.tabs + ' ' + m.rows[0]));
    // "N active days", not "N days" (Amir, 2026-11-22: "change it to active days"; a bare "30 days" read like the window)
    C.check('…"N active days" under a name in place of dots', m && m.dn[0] === '30 active days' && !m.dots.join(''), m && m.dn.join());
    C.check('…and when you lead, who is behind you', m && /You lead the last 30 days\. Dennis is 2,144 points behind you\./.test(m.chase), m && m.chase);
    const kept = await p.evaluate(ID => ({ scope: localStorage.getItem('aa_crew_scope'), week: !!localStorage.getItem(ID + '_crewboard_week'), month: !!localStorage.getItem(ID + '_crewboard_month'), rank: localStorage.getItem(ID + '_crewboard_rank') }), H.ID);
    C.check('the pick and each board are kept on the phone', kept.scope === 'month' && kept.week && kept.month && !!kept.rank, JSON.stringify(kept).slice(0, 200));
    // the whole board follows the tab
    await p.evaluate(() => goTo('crewboard')); await p.waitForTimeout(500);
    const bd = await p.evaluate(() => ({ title: document.querySelector('#screen-crewboard .ceil-title').textContent, tabs: [...document.querySelectorAll('#crewboard-body .cr-seg button')].map(b => b.textContent + (b.classList.contains('on') ? '*' : '')).join('|'), rows: document.querySelectorAll('#crewboard-body .cr-br').length, note: (document.querySelector('#crewboard-body .cr-note') || {}).textContent || '' }));
    C.check('the whole board: its title, the tabs, every row of the month', bd.title === 'Last 30 days' && bd.tabs === '7 days|Month*|Season' && bd.rows === 3 && /last 30 days/.test(bd.note), JSON.stringify(bd));
    await p.click('#crewboard-body .cr-seg button[data-scope="season"]'); await p.waitForTimeout(600);
    const bs = await p.evaluate(() => ({ title: document.querySelector('#screen-crewboard .ceil-title').textContent, rows: document.querySelectorAll('#crewboard-body .cr-br').length }));
    C.check('…a tab there switches the page too', bs.title === 'This season' && bs.rows === 2, JSON.stringify(bs));
    // the progress push never carries a board copy
    await p.evaluate(() => { try { _snapshot && _snapshot(); } catch (e) {} });
    const leak = await p.evaluate(ID => (window.__STUB.params || []).filter(x => x[1] && x[1].p_data).some(x => Object.keys(x[1].p_data).some(k => k.indexOf(ID + '_crewboard') === 0)), H.ID);
    C.check('no board copy ever rides in a progress push', !leak);
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 2. the arrows: yesterday this phone saw the 7 days with Tara 1st and you 6th
  {
    const y = new Date(now - 86400e3), ymd = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    const rank = JSON.stringify({ day: ymd(y), prev: {}, cur: { week: { [CK(3)]: 1, [CK(1)]: 2, [CK(2)]: 3, [CK(9)]: 6 } } });
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, seed: { _crewboard_rank: rank }, stub: { bell: bell(), crewBoards: BOARDS } });
    await waitTab(p);
    await p.evaluate(() => { try { localStorage.setItem('aa_crew_scope', 'week'); } catch (e) {} CREW_SCOPE = 'week'; goTo('crew'); }); await p.waitForTimeout(1200);
    const s = await card(p);
    C.check('▲/▼ against the last day this phone saw the board', s && s.mv.join() === '▲1,▲1,▼2,▲1', s && s.mv.join());
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 3. a server before stage120: the season alone, no tabs, nothing breaks
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, stub: { bell: bell(), noRace: true, crewBoard: BOARDS.season } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(1500);
    const s = await card(p);
    C.check('no stage120: the season board with no tabs', s && !s.tabs && /This season/i.test(s.head) && /^1 Elaheh/.test(s.rows[0]), s && JSON.stringify(s));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 4. in Farsi: the title, the tabs and the line of who to catch read in Farsi (scripts/i18n/fa/26-race.json)
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, init: "localStorage.setItem('aa_lang_beta', '1'); localStorage.setItem('aa_lang', 'fa');", stub: { bell: bell(), crewBoards: BOARDS } });
    await waitTab(p);
    await p.evaluate(() => goTo('crew')); await p.waitForTimeout(1500);
    const f = await p.evaluate(() => { const c = document.getElementById('crew-race'); return c ? { fa: !!(window.AAI18N && AAI18N.fa), head: c.querySelector('.prog-sec').textContent, tabs: [...c.querySelectorAll('.cr-seg button')].map(b => b.textContent).join('|'), chase: (c.querySelector('.cr-chase') || {}).textContent || '', miss: [...(AAI18N.missing || [])].filter(s => /\b(race|points|behind|days|Month|Season)\b/i.test(s)) } : null; });
    C.check('Farsi: the card\'s title and tabs', f && f.fa && /مسابقه/.test(f.head) && f.tabs === '۷ روز|ماه|فصل', JSON.stringify(f));
    C.check('…and the line of who to catch', f && /امتیاز/.test(f.chase) && /عقب‌تر از/.test(f.chase) && /رتبهٔ ۴/.test(f.chase), f && f.chase);
    C.check('…with no English left on it', f && !f.miss.length, f && f.miss.join(' | '));
    C.check('no page errors', !p.errs.length, p.errs.join(' | '));
    await ctx.close();
  }
  // 5. 320 px and dark mode: the tabs fit and nothing runs off the side
  {
    const { ctx, p } = await H.openProgram(browser, { w: 320, h: 700, stub: { bell: bell(), crewBoards: BOARDS } });
    await waitTab(p);
    await p.evaluate(() => { document.body.setAttribute('data-dark', ''); goTo('crew'); }); await p.waitForTimeout(900);
    const w = await p.evaluate(() => { const c = document.getElementById('crew-race'); return { over: document.documentElement.scrollWidth - innerWidth, tabs: [...c.querySelectorAll('.cr-seg button')].every(b => b.scrollWidth <= b.clientWidth + 1) }; });
    C.check('320 px: no sideways scroll, every tab label fits', w.over <= 0 && w.tabs, JSON.stringify(w));
    await p.evaluate(() => document.getElementById('crew-race').scrollIntoView()); await p.waitForTimeout(200);
    await p.screenshot({ path: require('path').join(H.outDir(), 'race-320-dark.png') });
    await ctx.close();
    const b = await H.openProgram(browser, { w: 390, h: 844, stub: { bell: bell(), crewBoards: BOARDS } });
    await waitTab(b.p); await b.p.evaluate(() => goTo('crew')); await b.p.waitForTimeout(900);
    await b.p.evaluate(() => document.getElementById('crew-race').scrollIntoView({ block: 'start' })); await b.p.evaluate(() => scrollBy(0, -160)); await b.p.waitForTimeout(200);
    await b.p.screenshot({ path: require('path').join(H.outDir(), 'race-390.png') });
    await b.ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
