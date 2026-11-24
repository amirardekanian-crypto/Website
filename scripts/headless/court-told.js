// #131 Court Told, the court icon, and #133 Your Usual (round 12 'On the Move', 2026-11-22): node scripts/headless/court-told.js
//
// 131: after an activity is added, the saved message offers Tell the crew (unless the hard-hour offer of #128 takes it); the day's sheet
// has the same button. The composer opens on the activity (kind and minutes, never effort); words and a photo are optional, and the post
// goes as a plain post with p_session { act, mins } (stage124). The feed draws such a post with its activity card and the racket icon;
// a session post wears the dumbbell. The day's sheet and the Player Page give every row its icon (racket in clay for court time).
// Grouped (2026-11-24, Amir: "all the similar activities should be in the same message like when people did workout" and "the design looks really off"):
// a day's PLAIN activity posts of one kind (no photo, no words, no reply) are ONE card of faces with their minutes, built like Trained today; a post that carries
// something, and a lone activity, stay posts; the line under a name is its own plain line (`cr-kind`), never the Like button's pill (`cr-kd`).
// 133: Your weeks says this week's court and other minutes against the athlete's own four-week usual, once there are three weeks of logs.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
function weeks(days, acts) {
  const o = { n: 1, from: at(-6), to: at(28), current: true, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days }] };
  if (acts) o.acts = acts;
  return o;
}
const PADEL = { day: at(0), k: 'court', kind: 'padel', title: 'Padel', mins: 75, effort: 'normal', id: 'a1' };
// A crew member who may post (crew.js's fixture, cut to what this needs).
const BELL = { athlete_id: H.ID, at: new Date().toISOString(), days: 7, kinds: ['level', 'week'], items: [],
  me: { answer: 'yes', name: 'Alex R.', on_board: true, under13: false, can_post: true, photos_left: 3, posts_left: 10, kinds: { level: true, week: true } } };
async function open(browser, fw, stub) {
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', stub: Object.assign({ fiveWeeks: fw, bell: BELL }, stub || {}), seed: { _hab_cfg: CFG, _hab_log: {} } });
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') loadFiveWeeks(); });
  await p.waitForTimeout(900);
  await p.evaluate(async () => { if (typeof refreshBell === 'function') { try { await refreshBell(); } catch (e) {} } });
  await p.waitForTimeout(400);
  return { ctx, p };
}

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── the day sheet: icons, and Tell the crew opens the composer on the activity ──
  {
    const { ctx, p } = await open(browser, weeks([PADEL, { day: at(0), k: 'plan', title: 'Lower', mins: 60 }], [PADEL]));
    const can = await p.evaluate(() => crewCanTell());
    await p.evaluate(d => openFiveWeeksDay(d), at(0));
    await p.waitForTimeout(250);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .pl-row')].map(r => ({
      court: !!r.querySelector('.act-ic.is-court'), icon: !!r.querySelector('.act-ic svg'), tell: !!r.querySelector('.act-tell') })));
    t.check('the day sheet: the activity wears the racket in clay, the plan session an icon of its own', rows.length === 2 && rows.every(r => r.icon)
      && rows.filter(r => r.court).length === 1, JSON.stringify(rows));
    t.check('the activity has Tell the crew (a crew member)', can && rows.some(r => r.tell), JSON.stringify({ can, rows }));
    await p.click('#hist-overlay .act-tell');
    await p.waitForTimeout(400);
    const comp = await p.evaluate(() => {
      const m = document.querySelector('#hist-overlay .readiness-modal');
      return { title: (m.querySelector('.readiness-title') || {}).textContent, card: !!m.querySelector('.cr-actcard .cr-acti.is-court'),
        go: m.querySelector('.cr-go') && !m.querySelector('.cr-go').disabled, effort: /normal|hard|easy/i.test(m.textContent.replace('how hard it was', '')) };
    });
    t.check('the composer opens on the activity, kind and minutes, never effort, and posts with no words', comp.title === 'Padel, 75 min' && comp.card && comp.go && !comp.effort, JSON.stringify(comp));
    await p.click('#hist-overlay .cr-go');
    await p.waitForTimeout(800);
    const sent = await p.evaluate(() => { const c = (window.__STUB.params || []).filter(x => x[0] === 'crew_post'); return c.length ? c[c.length - 1][1] : null; });
    t.check('it goes as a plain post carrying { act, mins }', sent && sent.p_kind === 'post' && sent.p_session && sent.p_session.act === 'padel' && sent.p_session.mins === 75
      && !('effort' in sent.p_session), JSON.stringify(sent));
    t.check('no page errors (sheet and composer)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── the feed: an activity post and a session post, told apart ──
  {
    const { ctx, p } = await open(browser, weeks([]));
    const html = await p.evaluate(() => {
      const a = crewPostHTML({ id: 'x1', kind: 'post', body: '', session: { act: 'padel', mins: 75 }, who: 'Mina', at: new Date().toISOString(), kudos: 0, replies: [] });
      const s = crewPostHTML({ id: 'x2', kind: 'session', body: 'Done', session: { day: 2 }, photo: true, who: 'Reza', at: new Date().toISOString(), kudos: 0, replies: [] });
      const d = document.createElement('div'); d.innerHTML = a + s; document.body.appendChild(d);
      const [pa, ps] = d.querySelectorAll('.cr-post');
      const out = { aCard: !!pa.querySelector('.cr-actcard .cr-acti.is-court'), aCardWords: [...pa.querySelectorAll('.cr-actcard b, .cr-actcard span span')].map(e => e.textContent.trim()).join(' '),
        aSub: !!pa.querySelector('.cr-nm small'), aCourt: !!pa.querySelector('.cr-actcard .cr-acti.is-court'),
        sSub: ps.querySelector('.cr-kind').textContent.trim(), sCourt: !!ps.querySelector('.cr-kic.is-court'), sIcon: !!ps.querySelector('.cr-kic svg'),
        pill: !!d.querySelector('.cr-nm .cr-kd') };
      d.remove();
      return out;
    });
    t.check('an activity post shows its card with the racket and says its kind once, a session post the dumbbell', html.aCard && html.aCourt && html.aCardWords === 'Padel 75 min' && !html.aSub
      && html.sSub === 'Day 2 done' && html.sIcon && !html.sCourt && !html.pill, JSON.stringify(html));
    await ctx.close();
  }

  // ── the feed: a day's plain activity posts of one kind are ONE card (2026-11-24) ──
  {
    const path = require('path'), out = H.outDir();
    const now = Date.now(), iso = ms => new Date(ms).toISOString(), M = 60e3;
    const CK = { mina: 'aaaaaaaa-0000-4000-8000-000000000001', reza: 'bbbbbbbb-0000-4000-8000-000000000002', sara: 'cccccccc-0000-4000-8000-000000000003', me: 'dddddddd-0000-4000-8000-0000000000dd' };
    // the same day as the feed files it: the athlete's own day (this page runs in UTC), so "yesterday" is 24 h back
    const post = (id, who, ck, mins, ago, o = {}) => Object.assign({ t: 'post', id, who, ck, fv: null, me: false, amir: false, kind: 'post', body: '', photo: false, at: iso(now - ago * M), pinned: false, left: 7,
      session: { act: o.act || 'tennis', mins }, kudos: { n: 0, mine: false, names: [] }, replies: [] }, o.x || {});
    const items = [
      post('p-mina', 'Mina S.', CK.mina, 60, 10),
      post('p-reza', 'Reza K.', CK.reza, 90, 30),
      post('p-me', 'Alex R.', CK.me, 45, 50, { x: { me: true } }),
      post('p-sara-padel', 'Sara T.', CK.sara, 60, 60, { act: 'padel' }),                         // a padel alone: stays a post
      post('p-mina-words', 'Mina S.', CK.mina, 60, 120, { x: { body: 'Great hit today' } }),      // words: stays a post
      post('p-reza-photo', 'Reza K.', CK.reza, 90, 130, { x: { photo: true, w: 1080, h: 1350 } }), // a photo: stays a post, its kind and minutes under the name
      post('p-sara-reply', 'Sara T.', CK.sara, 30, 140, { x: { replies: [{ id: 'r1', who: 'Mina S.', me: false, amir: false, body: 'Nice', at: iso(now - 135 * M), ck: CK.mina, fv: null }] } }),   // answered: stays a post
      post('y-mina', 'Mina S.', CK.mina, 60, 24 * 60 + 5),                                         // yesterday: its own card
      post('y-sara', 'Sara T.', CK.sara, 75, 24 * 60 + 15),
    ];
    const bell = Object.assign({}, BELL, { lounge: 1, week: { members: 6, sessions: 14, held: 3 },
      crew: [{ ck: CK.mina, who: 'Mina S.', fv: null }, { ck: CK.reza, who: 'Reza K.', fv: null }, { ck: CK.sara, who: 'Sara T.', fv: null }],
      me: Object.assign({}, BELL.me, { ck: CK.me, fv: null, name: 'Alex R.' }), items });
    const openFeed = async (b, o = {}) => {
      const x = await H.openProgram(browser, Object.assign({ tz: 'UTC', stub: { fiveWeeks: weeks([]), bell: b }, seed: { _hab_cfg: CFG, _hab_log: {} } }, o));
      await x.p.evaluate(async () => { if (typeof refreshBell === 'function') { try { await refreshBell(); } catch (e) {} } });
      await x.p.waitForTimeout(400);
      await x.p.evaluate(() => goTo('crew')); await x.p.waitForTimeout(700);
      return x;
    };
    const { ctx, p } = await openFeed(bell);
    const feed = await p.evaluate(() => {
      const el = document.getElementById('crew-body'), txt = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
      const cards = [...el.querySelectorAll('.cr-ag')].map(c => ({
        head: txt(c.querySelector('.cr-agh')), count: txt(c.querySelector('.cr-tthd small')), day: (function () { let e = c.previousElementSibling; while (e && !e.classList.contains('cr-day')) e = e.previousElementSibling; return txt(e); })(),
        faces: [...c.querySelectorAll('.cr-ttp')].map(f => ({ n: txt(f.querySelector('.cr-ttn')), m: txt(f.querySelector('.cr-agm')), ck: f.dataset.ck || null, btn: !!f.querySelector('button.cr-ttb') })),
        del: [...c.querySelectorAll('.cr-del')].map(txt), ids: c.dataset.ids, racket: !!c.querySelector('.cr-kic.is-court') }));
      const posts = [...el.querySelectorAll('.cr-post')].map(x => x.dataset.id);
      const pill = e => { if (!e) return null; const cs = getComputedStyle(e); return { border: cs.borderTopWidth, h: Math.round(e.getBoundingClientRect().height), radius: cs.borderTopLeftRadius }; };
      return { cards, posts, kind: [...el.querySelectorAll('.cr-nm .cr-kind')].map(k => ({ t: [...k.querySelectorAll(':scope > span:not(.cr-kic)')].map(txt).join(' · '), dot: getComputedStyle(k.querySelector('.cr-kdm'), '::before').content, pill: pill(k) })), badPill: el.querySelectorAll('.cr-nm .cr-kd').length,
        lone: (function () { const a = el.querySelector('.cr-post[data-id="p-sara-padel"]'); return a ? { card: [...a.querySelectorAll('.cr-actcard b, .cr-actcard span span')].map(txt).join(' '), sub: !!a.querySelector('.cr-nm small') } : null; })(),
        wide: document.documentElement.scrollWidth <= window.innerWidth + 1 };
    });
    const today = feed.cards.find(c => c.ids && c.ids.indexOf('p-mina') >= 0), yday = feed.cards.find(c => c.ids && c.ids.indexOf('y-mina') >= 0);
    t.check('three plain tennis posts today are ONE card: Tennis, 3 people, under Today', feed.cards.length === 2 && today && today.head === 'Tennis' && today.count === '3 people' && today.day === 'Today' && today.racket, JSON.stringify(feed.cards));
    t.check('its faces: you first, then the crew as the feed has them, each with their minutes under the name', today && today.faces.map(f => f.n + ' ' + f.m).join() === 'You 45 min,Mina 60 min,Reza 90 min', today && JSON.stringify(today.faces));
    t.check('each face is a button (a tap opens the page, a double-tap cheers) with the person\'s key, yours opens your page', today && today.faces.every(f => f.btn) && today.faces[0].ck === 'me' && today.faces[1].ck === CK.mina && today.faces[2].ck === CK.reza, today && JSON.stringify(today.faces));
    t.check('yesterday\'s two are their own card under Yesterday, with no Delete (neither is yours)', yday && yday.count === '2 people' && yday.day === 'Yesterday' && yday.del.length === 0 && yday.faces.map(f => f.n + ' ' + f.m).join() === 'Mina 60 min,Sara 75 min', yday && JSON.stringify(yday));
    t.check('the grouped posts are not drawn again as posts; the padel alone, the post with words, the photo and the answered one stay posts', ['p-mina', 'p-reza', 'p-me', 'y-mina', 'y-sara'].every(id => feed.posts.indexOf(id) < 0)
      && ['p-sara-padel', 'p-mina-words', 'p-reza-photo', 'p-sara-reply'].every(id => feed.posts.indexOf(id) >= 0), JSON.stringify(feed.posts));
    t.check('a lone activity keeps its card, and its kind is said once (no line under the name)', feed.lone && feed.lone.card === 'Padel 60 min' && feed.lone.sub === false, JSON.stringify(feed.lone));
    t.check('an activity with a photo says its kind and minutes in a plain line under the name, never the Like button\'s pill', feed.kind.length === 1 && feed.kind[0].t === 'Tennis · 90 min' && feed.kind[0].dot === '"·"' && feed.kind[0].pill.border === '0px' && feed.kind[0].pill.h < 24 && feed.badPill === 0, JSON.stringify([feed.kind, feed.badPill]));
    t.check('nothing wider than the screen at 390 px', feed.wide);
    await p.screenshot({ path: path.join(out, 'court-group-light-390.png'), fullPage: true }).catch(() => {});
    await p.evaluate(() => { document.querySelector('#crew-body .cr-ag').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300);
    await p.locator('#crew-body .cr-ag').first().screenshot({ path: path.join(out, 'court-group-card-390.png') }).catch(() => {});
    await p.locator('#crew-body .cr-post[data-id="p-reza-photo"] .cr-who').screenshot({ path: path.join(out, 'court-photo-head-390.png') }).catch(() => {});
    await p.locator('#crew-body .cr-post[data-id="p-sara-padel"]').screenshot({ path: path.join(out, 'court-lone-390.png') }).catch(() => {});

    // your own post: Delete at the foot of the card, two taps, takes only your post; the card then holds two
    t.check('you are in today\'s card, so it has one Delete your post', today && today.del.join() === 'Delete your post', today && JSON.stringify(today.del));
    await p.evaluate(() => document.querySelector('.cr-ag .cr-del').click());
    const armed = await p.evaluate(() => document.querySelector('.cr-ag .cr-del').textContent.trim());
    await p.evaluate(() => document.querySelector('.cr-ag .cr-del').click()); await p.waitForTimeout(600);
    const gone = await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'crew_delete_post').map(x => x[1]));
    const after = await p.evaluate(() => { const c = [...document.querySelectorAll('#crew-body .cr-ag')].find(e => e.dataset.ids.indexOf('p-mina') >= 0);
      return c ? { count: c.querySelector('.cr-tthd small').textContent.trim(), del: c.querySelectorAll('.cr-del').length } : null; });
    t.check('Delete takes two taps (the first only arms it) and deletes your post alone', armed === 'Tap again to delete the post' && gone.length === 1 && gone[0].p_post === 'p-me', JSON.stringify([armed, gone]));
    t.check('…and the card is now Mina and Reza: 2 people, and no Delete', after && after.count === '2 people' && after.del === 0, JSON.stringify(after));
    t.check('no page errors in the grouped feed', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();

    // a double-tap on a face is the Cheer, and the face turns clay in the card
    {
      const x = await openFeed(bell);
      await x.p.evaluate(() => { const b = document.querySelector('.cr-ag .cr-ttp[data-ck="aaaaaaaa-0000-4000-8000-000000000001"] .cr-ttb'); b.click(); b.click(); });
      await x.p.waitForTimeout(700);
      const c = await x.p.evaluate(() => ({ sent: (window.__STUB.params || []).filter(y => y[0] === 'crew_cheer').map(y => y[1].p_subject), done: !!document.querySelector('.cr-ag .cr-ttp.is-cheered[data-ck="aaaaaaaa-0000-4000-8000-000000000001"] .cr-ttc') }));
      t.check('a double-tap on Mina\'s face cheers her (crew_cheer, once) and the face wears the clap', c.sent.length === 1 && c.sent[0] === CK.mina && c.done, JSON.stringify(c));
      await x.ctx.close();
    }

    // the Caught Up count: the card counts once, wears the dot, and the post it hides is still found by its id
    {
      const x = await openFeed(bell);
      const n = await x.p.evaluate(() => { _crewVisitFrom = Date.now() - 45 * 60e3; renderCrew();
        const h = [...document.querySelectorAll('#crew-body .cr-day')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
        return { heads: h, dot: !!document.querySelector('#crew-body .cr-ag.is-new'), dots: document.querySelectorAll('#crew-body .is-new').length,
          grouped: (document.querySelector(crewPostSel('p-reza')) || {}).className || null, own: (document.querySelector(crewPostSel('p-mina-words')) || {}).className || null, none: document.querySelector(crewPostSel('nope')) }; });
      t.check('Caught Up counts the card once: Today says 1 new (Mina and Reza are one card), with one dot', n.heads[0] === 'Today · 1 new' && n.dot && n.dots === 1, JSON.stringify(n));
      t.check('crewPostSel finds a grouped post\'s card, a post\'s own card, and nothing for an unknown id', /cr-ag/.test(n.grouped) && /cr-post/.test(n.own) && n.none === null, JSON.stringify(n));
      await x.ctx.close();
    }

    // dark mode, and a narrow phone: the picture
    {
      const x = await openFeed(bell, { dark: true, w: 320 });
      const w = await x.p.evaluate(() => ({ wide: document.documentElement.scrollWidth <= window.innerWidth + 1, row: (function () { const r = document.querySelector('.cr-ag .cr-ttf-row'); return r ? r.scrollWidth >= r.clientWidth : false; })() }));
      t.check('320 px and dark: nothing wider than the screen', w.wide, JSON.stringify(w));
      await x.p.screenshot({ path: path.join(out, 'court-group-dark-320.png'), fullPage: true }).catch(() => {});
      await x.ctx.close();
    }

    // the same card in Farsi: the kind, the count, the minutes and Delete have their words, and the page turns right to left
    {
      const x = await openFeed(bell, { init: "localStorage.setItem('aa_lang_beta', '1'); localStorage.setItem('aa_lang', 'fa');" });
      const f = await x.p.evaluate(() => {
        const c = [...document.querySelectorAll('#crew-body .cr-ag')].find(e => e.dataset.ids.indexOf('p-mina') >= 0), txt = e => e ? e.textContent.replace(/\s+/g, ' ').trim() : null;
        return c ? { rtl: document.documentElement.dir === 'rtl', head: txt(c.querySelector('.cr-agh')), count: txt(c.querySelector('.cr-tthd small')), mins: [...c.querySelectorAll('.cr-agm')].map(txt), del: txt(c.querySelector('.cr-del')),
          cheerLabel: (c.querySelector('.cr-ttp[data-ck="aaaaaaaa-0000-4000-8000-000000000001"] button') || {}).ariaLabel || (c.querySelector('.cr-ttp[data-ck="aaaaaaaa-0000-4000-8000-000000000001"] button') || { getAttribute() {} }).getAttribute('aria-label') } : null;
      });
      t.check('in Farsi the card says تنیس, ۳ نفر, the minutes in Farsi and حذف پست شما, right to left', f && f.rtl && f.head === 'تنیس' && f.count === '۳ نفر' && f.mins.join() === '۴۵ دقیقه,۶۰ دقیقه,۹۰ دقیقه' && f.del === 'حذف پست شما', JSON.stringify(f));
      await x.p.evaluate(() => { const c = document.querySelector('#crew-body .cr-ag'); c.scrollIntoView({ block: 'center' }); }); await x.p.waitForTimeout(300);
      await x.p.locator('#crew-body .cr-ag').first().screenshot({ path: path.join(out, 'court-group-fa-390.png') }).catch(() => {});
      t.check('no page errors in Farsi', x.p.errs.length === 0, x.p.errs.join(' | '));
      await x.ctx.close();
    }

    // a server without stage96 (no `lounge`): no faces to draw, so every activity stays a post, as it was
    {
      const x = await openFeed(Object.assign({}, bell, { lounge: undefined }));
      const n = await x.p.evaluate(() => ({ cards: document.querySelectorAll('#crew-body .cr-ag').length, posts: document.querySelectorAll('#crew-body .cr-post').length }));
      t.check('without stage96 nothing is grouped: every activity is still its own post', n.cards === 0 && n.posts === 9, JSON.stringify(n));
      await x.ctx.close();
    }
  }

  // ── the saved message offers Tell the crew; a hard hour keeps the cool-down offer ──
  {
    const { ctx, p } = await open(browser, weeks([], []));
    await p.evaluate(() => openActivitySheet());
    await p.evaluate(() => { actPick('kind', 'tennis'); actPick('mins', 60); actPick('effort', 'normal'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(1300);
    const toast = await p.evaluate(() => { const el = document.getElementById('aaToast'); return el && !el.hidden ? { t: el.querySelector('.aa-toast-t').textContent, go: (el.querySelector('.aa-toast-go') || {}).textContent } : null; });
    t.check('after a save the message offers Tell the crew', toast && toast.t === 'Added to your weeks.' && toast.go === 'Tell the crew', JSON.stringify(toast));
    await ctx.close();
  }

  // ── 133 Your Usual ──
  {
    const acts = [];
    // four weeks before this week: 2 h of tennis a week; this week 3 h
    for (let w = 1; w <= 4; w++) acts.push({ day: at(-6 - 7 * w + 2), kind: 'tennis', mins: 120, effort: 'normal', id: 'u' + w });
    acts.push({ day: at(-1), kind: 'padel', mins: 180, effort: 'normal', id: 'n1' });
    const { ctx, p } = await open(browser, weeks([], acts));
    await p.evaluate(() => goTo('plan'));
    await p.waitForTimeout(500);
    const u = await p.evaluate(() => { const e = document.querySelector('#fw-wrap .fw-usual'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
    t.check('Your weeks: this week against the usual', u === 'On court this week: 3h · your usual 2h', u);
    await ctx.close();
    const o2 = await open(browser, weeks([], [{ day: at(-9), kind: 'tennis', mins: 60, effort: 'normal', id: 'z' }, { day: at(-1), kind: 'tennis', mins: 60, effort: 'normal', id: 'z2' }]));
    await o2.p.evaluate(() => goTo('plan'));
    await o2.p.waitForTimeout(500);
    t.check('silent until three weeks of logs', (await o2.p.evaluate(() => document.querySelector('#fw-wrap .fw-usual'))) === null);
    await o2.ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
