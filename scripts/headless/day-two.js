// Day Two (#141) and Back-to-Back (#142), round 14 'The Changeover': node scripts/headless/day-two.js
//
// DAY TWO. The morning after a big gym day, new exercises or a hard activity of an hour or more, Home's Library-suggestion slot
// (#home-sugg-wrap) offers one recovery session, with a kicker that says why (recovery/matched-pair.toml [day_two]). The footprint of
// yesterday comes from <id>_fpdays (this phone's own read at Done) or, with none, from the history (get_my_history). It takes the slot
// before the week-done row; it goes once its session was opened today, once a session was started or a check-in saved today, and never
// shows in the demo or the preview.
//   1. A big leg day yesterday: data-sugg="daytwo", "Big day yesterday", The Morning After; painted on its own at boot.
//   2. A big upper-body day yesterday: Open The Cage.   3. A hard activity yesterday: The Morning After, "Hard day yesterday".
//   4. A hard match yesterday: Talking Pace, "Match yesterday".   5. Hard yesterday and big the day before: Talking Pace, "Two hard days".
//   6. New exercises on a normal leg day: The Morning After, "New exercises yesterday".
//   7. Not shown: nothing yesterday; only two days ago; opened today; a session started today; a check-in today; the demo; the preview.
//   8. No _fpdays: a history row for yesterday (session RPE 8) still brings it.   9. It takes the slot before the week-done row.
//  10. In Farsi: the kicker and the words are Farsi (nothing of the toml's English in AAI18N.missing).   11. No page errors.
// BACK-TO-BACK. Saving a hard activity (Hard, 60 min or more) the day after another hard day (activity or big gym day), or saving a Match,
// changes the saved toast: the [back_to_back] / [after_match] line (recovery/last-word.toml), a kicker, and the session as its button.
//  12. Hard yesterday, hard 60-min tennis saved today: the line, "Added to your weeks.", The Morning After opens on a tap.
//  13. A big gym day yesterday, a hard activity today: the same toast.   14. A match today, nothing hard yesterday: the match line, Final Whistle.
//  15. A hard hour today, nothing yesterday: the older Cool Down Call.   16. A hard activity dated Yesterday: no Back-to-Back toast.
//  17. In Farsi the line is Farsi.
// Serve the repo first (python -m http.server <port> --bind 127.0.0.1; see lib.js: PLAYWRIGHT, CHROMIUM, BASE), then run this.
'use strict';
const H = require('./lib');
const t = H.checker();

const CFG = { onboarded: true, toured: true, installAsked: true, boardSwept: true, updatedAt: Date.now() };
const DAY = 86400000;
const at = n => new Date(Date.now() + n * DAY).toISOString().slice(0, 10);   // the pages here run in UTC
const T = at(0), Y = at(-1), Y2 = at(-2);

// The toml's words, as the file has them.
const D2 = { big: 'Big day yesterday', new: 'New exercises yesterday', hard: 'Hard day yesterday', match: 'Match yesterday', two: 'Two hard days in a row' };
const D2_FA = ['دیروز جلسهٔ سنگینی داشتید', 'دیروز حرکت جدید داشتید', 'دیروز روز سختی داشتید', 'دیروز مسابقه داشتید', 'دو روز سنگین پشت سر هم'];
const SAY_EN = ['a walk first, then ankles and hips', 'twenty easy minutes, then hips, back and arm', 'upper back and overhead range'];
const SAY_FA = ['اول پیاده‌روی، بعد مچ پا و لگن', 'بیست دقیقه حرکت سبک، بعد لگن، کمر و دست', 'بالای کمر و دامنهٔ حرکتی بالای سر'];
const B2B = 'Second hard day in a row. Tomorrow easy if you can. Tonight: food and sleep.';
const B2B_FA = 'دومین روز سنگین پشت سر هم. اگه می‌تونید فردا رو سبک بگیرید. امشب: غذا و خواب.';
const MATCH_LINE = 'For the hour after a match: move first, then breathe.';
const MATCH_FA = 'برای یک ساعت بعد از مسابقه: اول حرکت، بعد نفس.';

const fp = (level, areas, o) => Object.assign({ level, why: level === 'big' ? ['rpe'] : [], rpe: level === 'big' ? 8 : 6, mins: 60, load: null, usual: null, sets: 12, hard: 0, impact: 0,
  areas, lower: !!(areas.knee || areas.hamstring), newEx: 0, week1: false, fin: '', late: false, evening: false, courtBefore: false, courtToday: false }, o || {});
const LEGS = { knee: 8, hamstring: 6, 'hip-groin': 3 };
const SHOULDER = { shoulder: 9, 'elbow-forearm-wrist': 4 };
const fpKey = (date, day) => date + '|' + (day || 1);
const LOG = ['Barbell Back Squat', 'Box Jump'].map(ex => ({ ex, block: 'Strength', reps: 6, note: '', sets: [1, 2, 3].map(() => ({ w: '60', n: 6, r: '8', d: true })) }));

// Court Log rows as the live server sends them: weeks and acts (see played-today.js).
function weeks(rows) {
  const days = rows.map(r => ({ day: r.day, k: ['tennis', 'padel', 'match'].indexOf(r.kind) >= 0 ? 'court' : 'other', kind: r.kind, title: r.kind, mins: r.mins, effort: r.effort, id: r.id }));
  return { n: 1, from: at(-6), to: at(28), current: true, weeks: [{ w: 1, from: at(-6), to: at(0), plan: 3, done: 0, held: false, now: true, days }],
    acts: rows.map(r => ({ day: r.day, kind: r.kind, mins: r.mins, effort: r.effort, id: r.id })) };
}
const act = (day, kind, mins, effort, id) => ({ day, kind, mins, effort, id: id || ('a-' + day + '-' + kind) });

// o: fp (the _fpdays seed), acts (Court Log rows), hist, seed (more localStorage), lang, query, fresh (no repaint)
async function open(browser, o) {
  o = o || {};
  const seed = Object.assign({ _hab_cfg: CFG, _hab_log: {} }, o.seed || {});
  if (o.fp) seed._fpdays = o.fp;
  const init = o.lang === 'fa' ? "try { localStorage.setItem('aa_lang', 'fa'); } catch (e) {}" : undefined;
  const { ctx, p } = await H.openProgram(browser, { tz: 'UTC', hist: o.hist || [], query: o.query, init, seed,
    stub: Object.assign({ library: H.library(), fiveWeeks: weeks(o.acts || []) }, o.stub || {}) });
  await p.evaluate(() => { if (typeof loadFiveWeeks === 'function') return loadFiveWeeks(); });
  await p.waitForTimeout(900);
  return { ctx, p };
}
const repaint = async p => { await p.evaluate(() => paintWeekSugg()); await p.waitForTimeout(500); };
// What Home's slot shows.
const slot = p => p.evaluate(() => {
  const w = document.getElementById('home-sugg-wrap'), b = w && w.querySelector('button.lib-sugg');
  return b ? { sugg: b.dataset.sugg, id: b.dataset.id || null, kick: (b.querySelector('.lib-sugg-k') || {}).textContent, title: (b.querySelector('b') || {}).textContent,
    text: b.textContent.replace(/\s+/g, ' ').trim() } : null;
});
const is = (r, sugg, kick, title) => !!r && r.sugg === sugg && r.kick === kick && r.title === title;
// The Day Two row on a fresh open: the first paint, then a repaint (the Court Log arrives after boot).
async function dayTwo(browser, o) {
  const { ctx, p } = await open(browser, o);
  await repaint(p);
  const r = await slot(p);
  return { ctx, p, r };
}
const toast = p => p.evaluate(() => { const el = document.getElementById('aaToast'); return el && !el.hidden
  ? { k: (el.querySelector('.aa-toast-k') || {}).textContent || null, t: el.querySelector('.aa-toast-t').textContent, go: (el.querySelector('.aa-toast-go') || {}).textContent || null } : null; });
// Saves an activity through the real sheet. o: kind, mins, effort, day (a date)
async function save(p, o) {
  await p.evaluate(() => openActivitySheet());
  await p.evaluate(a => { actPick('kind', a.kind); actPick('mins', a.mins); actPick('effort', a.effort); if (a.day) actPick('day', a.day); }, o);
  await p.evaluate(() => saveActivity());
  await p.waitForTimeout(1600);
  return toast(p);
}

(async () => {
  const browser = await H.launch();

  // ── 1. a big leg day yesterday (and the first paint is Day Two's own, no repaint) ──────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { fp: { [fpKey(Y)]: fp('big', LEGS) } });
    const first = await slot(p);
    t.check('1: at boot (no repaint) a big leg day yesterday shows the Day Two row: data-sugg="daytwo", "Big day yesterday", The Morning After',
      is(first, 'daytwo', D2.big, 'The Morning After') && first.id === 'day-after', JSON.stringify(first));
    t.check('1: the row says what it is: the words after the title, minutes and kit', !!first && first.text.indexOf('The Morning After: ' + SAY_EN[0]) >= 0, first && first.text);
    t.check('1: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 2. a big upper-body day yesterday ──────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, r } = await dayTwo(browser, { fp: { [fpKey(Y)]: fp('big', SHOULDER) } });
    t.check('2: a big upper-body day yesterday (shoulder) offers Open The Cage, "Big day yesterday"', is(r, 'daytwo', D2.big, 'Open The Cage') && r.id === 'thoracic-and-shoulder', JSON.stringify(r));
    t.check('2: with its own words', !!r && r.text.indexOf('Open The Cage: ' + SAY_EN[2]) >= 0, r && r.text);
    await ctx.close();
  }

  // ── 3. a hard activity yesterday ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, r } = await dayTwo(browser, { acts: [act(Y, 'padel', 75, 'hard')] });
    t.check('3: padel 75 min hard yesterday offers The Morning After, "Hard day yesterday"', is(r, 'daytwo', D2.hard, 'The Morning After'), JSON.stringify(r));
    await ctx.close();
  }
  {   // an hour is the line: 45 minutes hard, or 60 normal, is not a hard day
    const a = await dayTwo(browser, { acts: [act(Y, 'padel', 45, 'hard')] });
    const b = await dayTwo(browser, { acts: [act(Y, 'padel', 60, 'normal')] });
    t.check('3: 45 minutes hard, and an hour at Normal, bring no Day Two row', a.r === null && b.r === null, JSON.stringify([a.r, b.r]));
    await a.ctx.close(); await b.ctx.close();
  }

  // ── 4. a hard match yesterday ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, r } = await dayTwo(browser, { acts: [act(Y, 'match', 90, 'hard')] });
    t.check('4: a hard match yesterday offers Talking Pace, "Match yesterday"', is(r, 'daytwo', D2.match, 'Talking Pace') && r.id === 'day-after-match', JSON.stringify(r));
    t.check('4: with its own words', !!r && r.text.indexOf('Talking Pace: ' + SAY_EN[1]) >= 0, r && r.text);
    await ctx.close();
  }

  // ── 5. two hard days in a row ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, r } = await dayTwo(browser, { acts: [act(Y, 'padel', 75, 'hard')], fp: { [fpKey(Y2)]: fp('big', LEGS) } });
    t.check('5: hard yesterday and a big gym day the day before offer Talking Pace, "Two hard days in a row"', is(r, 'daytwo', D2.two, 'Talking Pace'), JSON.stringify(r));
    await ctx.close();
  }
  {   // and the two the other way round: a big gym day yesterday after a hard activity the day before
    const { ctx, p, r } = await dayTwo(browser, { acts: [act(Y2, 'tennis', 60, 'hard')], fp: { [fpKey(Y)]: fp('big', LEGS) } });
    t.check('5: a big gym day yesterday after a hard activity the day before is the same', is(r, 'daytwo', D2.two, 'Talking Pace'), JSON.stringify(r));
    await ctx.close();
  }

  // ── 6. new exercises on a normal leg day ───────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p, r } = await dayTwo(browser, { fp: { [fpKey(Y)]: fp('normal', LEGS, { newEx: 2 }) } });
    t.check('6: new exercises yesterday on a normal leg day offer The Morning After, "New exercises yesterday"', is(r, 'daytwo', D2.new, 'The Morning After'), JSON.stringify(r));
    await ctx.close();
  }
  {   // a normal day with nothing new says nothing
    const { ctx, p, r } = await dayTwo(browser, { fp: { [fpKey(Y)]: fp('normal', LEGS) } });
    t.check('6: a normal leg day with nothing new brings no row', r === null, JSON.stringify(r));
    await ctx.close();
  }

  // ── 7. when it is not shown ────────────────────────────────────────────────────────────────────────────────────────────────────
  const BIG = { [fpKey(Y)]: fp('big', LEGS) };
  {
    const { ctx, p, r } = await dayTwo(browser, {});
    t.check('7: nothing yesterday: no row', r === null, JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p, r } = await dayTwo(browser, { fp: { [fpKey(Y2)]: fp('big', LEGS) }, acts: [act(Y2, 'padel', 75, 'hard')] });
    t.check('7: only a session (and a hard activity) two days ago: no row', r === null, JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { fp: BIG });
    await repaint(p);
    const before = await slot(p);
    await p.evaluate(() => { const w = recFirst(['day-after']); openLibSugg(document.querySelector('#home-sugg-wrap button.lib-sugg')); });
    await p.waitForTimeout(900);
    const seen = await p.evaluate(() => JSON.parse(localStorage.getItem(ATHLETE_ID + '_libseen') || '{}'));
    await p.evaluate(() => { goTo('home'); });
    await repaint(p);
    const after = await slot(p);
    t.check('7: once its session was opened today the row goes (and it was there before)', !!before && Object.keys(seen).indexOf('day-after') >= 0 && after === null, JSON.stringify([before && before.id, seen, after]));
    await ctx.close();
  }
  {
    const { ctx, p } = await dayTwo(browser, { fp: BIG, seed: { _libseen: { 'day-after': Date.now() } } });
    const r = await slot(p);
    t.check('7: <id>_libseen seeded with today: no row', r === null, JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p, r } = await dayTwo(browser, { fp: BIG, seed: { _timer_1: { sessionStart: Date.now() - 5 * 60000, running: true, resumeAt: Date.now() - 5 * 60000, acc: 0 } } });
    t.check('7: a session started today (a running timer with today\'s sessionStart): no row', r === null, JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p, r } = await dayTwo(browser, { fp: BIG, seed: { _readiness_1: { sleep: 4, energy: 4, soreness: 2, stress: 3, overall: 4, composite: 3.5, score: 3.5, skipped: false, timestamp: new Date().toISOString() } } });
    t.check('7: a check-in saved today: no row', r === null, JSON.stringify(r));
    await ctx.close();
  }
  {   // a timer left from an earlier day does not count as today
    const { ctx, p, r } = await dayTwo(browser, { fp: BIG, seed: { _timer_1: { sessionStart: Date.now() - 3 * DAY, running: false, acc: 3600000 } } });
    t.check('7: (control) a timer from three days ago does not hide it', is(r, 'daytwo', D2.big, 'The Morning After'), JSON.stringify(r));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { fp: BIG, query: '?client=demo' });
    await repaint(p);
    const r = await slot(p);
    const demo = await p.evaluate(() => ({ demo: !!window.IS_DEMO, daytwo: typeof dayTwoWhat === 'function' ? dayTwoWhat() : 'no fn' }));
    t.check('7: the demo (?client=demo): no Day Two row', demo.demo && (r === null || r.sugg !== 'daytwo') && !demo.daytwo, JSON.stringify([demo, r]));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { fp: BIG, query: '?preview=1' });
    await repaint(p);
    const r = await slot(p);
    const pv = await p.evaluate(() => ({ preview: !!window.IS_PREVIEW, daytwo: typeof dayTwoWhat === 'function' ? dayTwoWhat() : 'no fn' }));
    t.check('7: the coach preview (?preview=1): no Day Two row', pv.preview && (r === null || r.sugg !== 'daytwo') && !pv.daytwo, JSON.stringify([pv, r]));
    await ctx.close();
  }

  // ── 8. no _fpdays: the history path ────────────────────────────────────────────────────────────────────────────────────────────
  {
    const hist = [{ completed_on: Y, day: '1', readiness: 4, session_rpe: '8', duration_min: 60, log: LOG }];
    const { ctx, p, r } = await dayTwo(browser, { hist });
    const none = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem(ATHLETE_ID + '_fpdays') || '{}')).length);
    t.check('8: with no _fpdays, a history row for yesterday (RPE 8, 60 min, a log) still brings Day Two', none === 0 && is(r, 'daytwo', D2.big, 'The Morning After'), JSON.stringify([none, r]));
    await ctx.close();
  }
  {   // and the history row of an ordinary day brings nothing
    const hist = [{ completed_on: Y, day: '1', readiness: 4, session_rpe: '5', duration_min: 40, log: LOG.map(e => Object.assign({}, e, { sets: [{ w: '40', n: 6, r: '6', d: true }] })) }];
    const { ctx, p, r } = await dayTwo(browser, { hist: hist.concat([{ completed_on: at(-8), day: '1', readiness: 4, session_rpe: '5', duration_min: 40, log: LOG }]) });
    t.check('8: (control) a history row of an ordinary day (RPE 5, an old session of the same exercises) brings no row', r === null, JSON.stringify(r));
    await ctx.close();
  }

  // ── 9. the slot: Day Two before the week-done row ──────────────────────────────────────────────────────────────────────────────
  {
    // Both plan days finished inside this week (the cycle's week 2 started three days ago), day 1 yesterday and big, day 2 two days ago, ordinary.
    const hist = [{ completed_on: Y, day: '1', readiness: 4, session_rpe: '8', duration_min: 60, log: LOG },
      { completed_on: Y2, day: '2', readiness: 4, session_rpe: '5', duration_min: 40, log: LOG.map(e => Object.assign({}, e, { ex: e.ex + ' (x)', sets: [{ w: '40', n: 6, r: '6', d: true }] })) }];
    const { ctx, p } = await open(browser, { hist, stub: {} });
    await repaint(p);
    const state = await p.evaluate(() => ({ done: weekDoneOn(), wanted: weekSuggWanted(), d2: !!dayTwoWhat() }));
    const first = await slot(p);
    t.check('9: the fixture has the week done and Day Two wanted', !!state.done && state.wanted && state.d2, JSON.stringify(state));
    t.check('9: Day Two takes the slot before the week-done row', is(first, 'daytwo', D2.big, 'The Morning After'), JSON.stringify(first));
    await p.evaluate(() => { markLibSeen('day-after'); });
    await repaint(p);
    const next = await slot(p);
    t.check('9: once Day Two is opened, the week-done row takes the slot', !!next && next.sugg === 'weekDone', JSON.stringify(next));
    t.check('9: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }

  // ── 10. Farsi ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const cases = [
      ['big', { fp: BIG }, D2_FA[0], SAY_FA[0], 'The Morning After'],
      ['new', { fp: { [fpKey(Y)]: fp('normal', LEGS, { newEx: 1 }) } }, D2_FA[1], SAY_FA[0], 'The Morning After'],
      ['hard', { acts: [act(Y, 'padel', 75, 'hard')] }, D2_FA[2], SAY_FA[0], 'The Morning After'],
      ['match', { acts: [act(Y, 'match', 90, 'hard')] }, D2_FA[3], SAY_FA[1], 'Talking Pace'],
      ['two', { acts: [act(Y, 'padel', 75, 'hard')], fp: { [fpKey(Y2)]: fp('big', LEGS) } }, D2_FA[4], SAY_FA[1], 'Talking Pace'],
    ];
    const ENGLISH = Object.values(D2).concat(SAY_EN);
    for (const [name, o, kick, say, title] of cases) {
      const { ctx, p, r } = await dayTwo(browser, Object.assign({ lang: 'fa' }, o));
      const miss = await p.evaluate(() => window.AAI18N ? [...AAI18N.missing] : null);
      const bad = miss ? miss.filter(m => ENGLISH.some(x => m.indexOf(x) >= 0 || x.indexOf(m) >= 0)) : null;
      t.check(`10: Farsi (${name}): the kicker is "${kick}", the words are Farsi, the title stays English`, !!r && r.kick === kick && r.title === title && r.text.indexOf(say) >= 0 && !/[A-Za-z]/.test(r.text.replace(title, '').replace(/\b(min|no kit)\b/g, '')), JSON.stringify(r));
      t.check(`10: Farsi (${name}): none of the toml's English is in AAI18N.missing`, Array.isArray(bad) && bad.length === 0, JSON.stringify(bad));
      t.check(`10: Farsi (${name}): no page errors`, p.errs.length === 0, p.errs.join(' | '));
      await ctx.close();
    }
  }

  // ── 12. Back-to-Back: hard yesterday, hard 60-min tennis today ────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { acts: [act(Y, 'padel', 75, 'hard')] });
    const m = await save(p, { kind: 'tennis', mins: 60, effort: 'hard' });
    t.check('12: hard yesterday, then today\'s hard 60-min tennis: the toast says the Back-to-Back line', !!m && m.t === B2B, JSON.stringify(m));
    t.check('12: its kicker is "Added to your weeks." (the crew was not told here)', !!m && (m.k === 'Added to your weeks.' || m.k === 'Added. The crew sees it.'), JSON.stringify(m));
    t.check('12: its button reads The Morning After', !!m && m.go === 'The Morning After', JSON.stringify(m));
    await p.click('#aaToast .aa-toast-go');
    await p.waitForTimeout(1200);
    const ws = await p.evaluate(() => { const s = document.getElementById('screen-workout'); return { on: s.classList.contains('active') || getComputedStyle(s).display !== 'none', title: (document.getElementById('ws-title') || {}).textContent }; });
    t.check('12: tapping it opens that workout', ws.on && /The Morning After/i.test(ws.title || ''), JSON.stringify(ws));
    t.check('12: no page errors', p.errs.length === 0, p.errs.join(' | '));
    await ctx.close();
  }
  {   // with the server telling the crew, the kicker says so
    const { ctx, p } = await open(browser, { acts: [act(Y, 'padel', 75, 'hard')], stub: { actTold: true } });
    const m = await save(p, { kind: 'tennis', mins: 60, effort: 'hard' });
    t.check('12: with the crew told, the kicker is "Added. The crew sees it."', !!m && m.t === B2B && m.k === 'Added. The crew sees it.' && m.go === 'The Morning After', JSON.stringify(m));
    await ctx.close();
  }

  // ── 13. a big gym day yesterday, a hard activity today ───────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { fp: BIG });
    const m = await save(p, { kind: 'tennis', mins: 60, effort: 'hard' });
    t.check('13: a big gym day yesterday, then a hard activity today: the same toast', !!m && m.t === B2B && m.go === 'The Morning After' && !!m.k, JSON.stringify(m));
    await ctx.close();
  }

  // ── 14. a match today, nothing hard yesterday ────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, {});
    const m = await save(p, { kind: 'match', mins: 90, effort: 'normal' });
    t.check('14: a match today, nothing hard yesterday: the after-match line with Final Whistle', !!m && m.t === MATCH_LINE && m.go === 'Final Whistle' && !!m.k, JSON.stringify(m));
    await ctx.close();
  }

  // ── 15. a hard hour today, nothing yesterday: the older Cool Down Call ───────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, {});
    const m = await save(p, { kind: 'tennis', mins: 60, effort: 'hard' });
    t.check('15: a hard hour today, nothing yesterday: the Cool Down Call toast ("Added to your weeks. A hard one: ...")', !!m && /^Added to your weeks\. A hard one: The Morning After, tonight or tomorrow/.test(m.t) && m.go === 'Open it' && !m.k, JSON.stringify(m));
    await ctx.close();
  }

  // ── 16. a hard activity dated yesterday ───────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { acts: [act(Y2, 'padel', 75, 'hard')] });
    const m = await save(p, { kind: 'tennis', mins: 60, effort: 'hard', day: Y });
    t.check('16: a hard activity dated Yesterday brings no Back-to-Back toast (the older Cool Down Call stands)', !!m && m.t !== B2B && m.t !== MATCH_LINE && !m.k && m.go !== 'Final Whistle', JSON.stringify(m));
    const saved = await p.evaluate(() => (window.__STUB.params || []).filter(x => x[0] === 'log_activity').map(x => x[1].p_day));
    t.check('16: and it was saved for yesterday', saved.length === 1 && saved[0] === Y, JSON.stringify(saved));
    await ctx.close();
  }
  {   // a match dated yesterday: "tonight" means nothing
    const { ctx, p } = await open(browser, {});
    const m = await save(p, { kind: 'match', mins: 90, effort: 'normal', day: Y });
    t.check('16: a match dated Yesterday brings no after-match toast', !!m && m.t !== MATCH_LINE && m.go !== 'Final Whistle', JSON.stringify(m));
    await ctx.close();
  }

  // ── 17. Farsi ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const { ctx, p } = await open(browser, { lang: 'fa', acts: [act(Y, 'padel', 75, 'hard')] });
    const m = await save(p, { kind: 'tennis', mins: 60, effort: 'hard' });
    const miss = await p.evaluate(() => window.AAI18N ? [...AAI18N.missing] : null);
    const bad = miss ? miss.filter(x => x.indexOf(B2B) >= 0 || B2B.indexOf(x) >= 0 || x.indexOf(MATCH_LINE) >= 0) : null;
    t.check('17: in Farsi the Back-to-Back line shows in Farsi', !!m && m.t === B2B_FA, JSON.stringify(m));
    t.check('17: and none of the English is in AAI18N.missing', Array.isArray(bad) && bad.length === 0, JSON.stringify(bad));
    await ctx.close();
  }
  {
    const { ctx, p } = await open(browser, { lang: 'fa' });
    const m = await save(p, { kind: 'match', mins: 90, effort: 'normal' });
    t.check('17: in Farsi the after-match line shows in Farsi', !!m && m.t === MATCH_FA, JSON.stringify(m));
    await ctx.close();
  }

  await browser.close();
  process.exit(t.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
