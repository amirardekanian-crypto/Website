// Every activity to the crew (stage126, 2026-11-23): node scripts/headless/activity-crew.js
//
// Amir: "every activity needs to be sent to crew, unless they turn it off in their settings. but after adding something, you can add images
// to it or write with it. every activity, should have an icon. all the racket sports should have the same one but running and cycling and
// swimming should have their own. remove gym from activity ... remove walking as well".
// Checked: the saved message when the server told the crew (Add a photo), the day sheet's Add a photo and its composer (On the crew, Save,
// activity_post_edit with the activity's id), Tell the crew for one that was not told keyed by the activity's id, the kinds list (no Gym,
// no Walking; an old gym row still named), an icon per kind (one racket, the runner, the bike, the swimmer), and the What the crew sees
// switch on unless turned off.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
const ID_TOLD = '0a1b2c3d-0000-4000-8000-000000000001', ID_NEW = '0a1b2c3d-0000-4000-8000-000000000002';
function weeks(days, acts) {
  return { n: 1, from: at(-6), to: at(28), current: true, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days }], acts: acts || [] };
}
const row = (id, kind, mins) => ({ day: at(0), k: ['tennis', 'padel', 'squash'].indexOf(kind) >= 0 ? 'court' : 'other', kind, title: kind, mins, effort: 'normal', id });
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
const toast = p => p.evaluate(() => { const el = document.getElementById('aaToast'); return el && !el.hidden ? { t: el.querySelector('.aa-toast-t').textContent, go: (el.querySelector('.aa-toast-go') || {}).textContent } : null; });
const calls = (p, n) => p.evaluate(n => (window.__STUB.params || []).filter(x => x[0] === n).map(x => x[1]), n);

(async () => {
  const t = H.checker();
  const browser = await H.launch();

  // ── 1. a save the server told the crew: the message says so and offers Add a photo ──
  {
    const { ctx, p } = await open(browser, weeks([], []), { actTold: true });
    await p.evaluate(() => openActivitySheet());
    await p.evaluate(() => { actPick('kind', 'cycling'); actPick('mins', 60); actPick('effort', 'normal'); });
    await p.evaluate(() => saveActivity());
    await p.waitForTimeout(1300);
    const m = await toast(p);
    t.check('a told save says "Added. The crew sees it." and offers Add a photo', m && m.t === 'Added. The crew sees it.' && m.go === 'Add a photo', JSON.stringify(m));
    const told = await p.evaluate(() => (FW && FW.acts || []).map(a => a.told));
    t.check("the phone's copy says told", told.length === 1 && told[0] === true, JSON.stringify(told));
    t.check('no Tell the crew composer was needed: nothing posted from the phone', (await calls(p, 'crew_post')).length === 0);
    t.check('no page errors (told save)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. the day sheet: Add a photo on a told one, its composer, and Save goes to activity_post_edit ──
  {
    const told = Object.assign(row(ID_TOLD, 'swim', 40), {});
    const fresh = row(ID_NEW, 'squash', 50);
    const { ctx, p } = await open(browser, weeks([told, fresh], [
      { day: at(0), kind: 'swim', mins: 40, effort: 'normal', id: ID_TOLD, told: true },
      { day: at(0), kind: 'squash', mins: 50, effort: 'normal', id: ID_NEW, told: false }]));
    await p.evaluate(d => openFiveWeeksDay(d), at(0));
    await p.waitForTimeout(250);
    const btns = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .act-tell')].map(b => b.textContent));
    t.check('the told one offers Add a photo, the other Tell the crew', btns.length === 2 && btns.indexOf('Add a photo') >= 0 && btns.indexOf('Tell the crew') >= 0, JSON.stringify(btns));
    await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .act-tell')].find(b => b.textContent === 'Add a photo').click());
    await p.waitForTimeout(400);
    const comp = await p.evaluate(() => {
      const m = document.querySelector('#hist-overlay .readiness-modal');
      return { eyebrow: (m.querySelector('.readiness-eyebrow') || {}).textContent, title: (m.querySelector('.readiness-title') || {}).textContent,
        go: (m.querySelector('.cr-go') || {}).textContent, off: !!(m.querySelector('.cr-go') || {}).disabled, photo: !!m.querySelector('.cr-add input[type=file]') };
    });
    t.check('the composer: On the crew, Swimming 40 min, a photo button, and Save off until there is something to add',
      comp.eyebrow === 'On the crew' && comp.title === 'Swimming, 40 min' && comp.go === 'Save' && comp.off && comp.photo, JSON.stringify(comp));
    await p.fill('#hist-overlay .cr-txt', 'Cold water, good session');
    await p.click('#hist-overlay .cr-go');
    await p.waitForTimeout(800);
    const ed = await calls(p, 'activity_post_edit');
    t.check('Save sends the words to activity_post_edit with the activity id, no new post', ed.length === 1 && ed[0].p_activity === ID_TOLD && ed[0].p_body === 'Cold water, good session'
      && ed[0].p_photo === null && (await calls(p, 'crew_post')).length === 0, JSON.stringify(ed));
    const m = await toast(p);
    t.check('it says Added to your post.', m && m.t === 'Added to your post.', JSON.stringify(m));
    // Tell the crew on the one that was not told: the post is keyed by the activity, so Add a photo finds it later
    await p.evaluate(d => openFiveWeeksDay(d), at(0));
    await p.waitForTimeout(250);
    await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .act-tell')].find(b => b.textContent === 'Tell the crew').click());
    await p.waitForTimeout(400);
    await p.click('#hist-overlay .cr-go');
    await p.waitForTimeout(800);
    const cp = await calls(p, 'crew_post');
    t.check("Tell the crew posts with the activity's id as its key", cp.length === 1 && cp[0].p_key === ID_NEW && cp[0].p_session && cp[0].p_session.act === 'squash', JSON.stringify(cp));
    const after = await p.evaluate(id => (FW.acts.find(a => a.id === id) || {}).told, ID_NEW);
    t.check('and the phone marks it told, so its sheet offers Add a photo next', after === true, String(after));
    t.check('no page errors (sheet and composer)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 3. the kinds, the icons, an old gym row, and the switch ──
  {
    const gym = row('0a1b2c3d-0000-4000-8000-000000000009', 'gym', 45);
    const { ctx, p } = await open(browser, weeks([gym], [{ day: at(0), kind: 'gym', mins: 45, effort: 'normal', id: gym.id }]));
    await p.evaluate(() => openActivitySheet());
    const kinds = await p.evaluate(() => [...document.querySelectorAll('#hist-overlay .act-row')][0].textContent);
    t.check('Add activity: 12 kinds, no Gym, no Walking', await p.evaluate(() => ACT_KINDS.length) === 12 && !/Gym|Walk/.test(kinds), kinds);
    const ic = await p.evaluate(() => {
      const k = ['tennis', 'padel', 'squash', 'badminton', 'pickleball', 'beach_tennis', 'match'].map(actIcon);
      return { racket: [...new Set(k)], run: actIcon('run'), ride: actIcon('cycling'), swim: actIcon('swim'), foot: actIcon('football'), gym: actIcon('gym'),
        own: ['running', 'cycling', 'swim'].every(x => window.__ICONS[x] && window.__ICONS[x] !== window.__ICONS.note) };
    });
    t.check('every racket sport wears the one racket; running, cycling and swimming their own', ic.racket.length === 1 && ic.racket[0] === 'court'
      && ic.run === 'running' && ic.ride === 'cycling' && ic.swim === 'swim' && ic.own && new Set([ic.run, ic.ride, ic.swim, 'court']).size === 4, JSON.stringify(ic));
    await p.evaluate(d => openFiveWeeksDay(d), at(0));
    await p.waitForTimeout(250);
    t.check('an old gym row is still named Gym', await p.evaluate(() => /Gym/.test(document.querySelector('#hist-overlay .pl-list').textContent)));
    await p.evaluate(() => openCrewSettings());
    await p.waitForTimeout(250);
    const sw = await p.evaluate(() => { const i = document.querySelector('#hist-overlay .cr-sw input[data-kind="activity"]'); return i ? { on: i.checked, words: i.closest('label').textContent } : null; });
    t.check('What the crew sees: Your activity is on unless turned off, and says it goes as you save', sw && sw.on && /goes to the crew as you save it/.test(sw.words), JSON.stringify(sw));
    t.check('no page errors (kinds, icons, switch)', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
