// A Farsi athlete's own words (Farsi app phase 5, 2026-11-20; COM-1): node scripts/headless/farsi-words.js
//
// Amir writes a cycle's words ONCE, in the athlete's language (athlete.lang): for a Farsi athlete the usual fields (a Coach's
// Note, a Because, a week note, the cycle message, completion text, the Coach tab's cards) simply hold Farsi. This checks that
// such a programme draws its words as written, that a Farsi text is cut at its first sentence like an English one
// (firstSentence() on the cover, weekNoteHTML()'s headline: they end a sentence at . ! ? or ؟ before a Farsi letter too),
// and that English programmes are cut exactly as before. Checked on the made-up fixture, signed in and as the demo
// (?client=demo&fa=1). Serve the repo first (python -m http.server 8765 --bind 127.0.0.1; see lib.js), then run this.
'use strict';
const H = require('./lib');

const FA = {
  note: 'اگه زانوی چپت تیر کشید ست رو قطع کن.',
  why: 'اسکوات پایه‌ی هر استارت سرعتیه.',
  week: 'این هفته هیچ ستی بالای شدت ۷ نرو. از هفته‌ی بعد کارت هدفته.',
  para: 'این سیکل پایه‌ی همه چیزه. بدنت داره یاد می‌گیره.',
  done: 'آفرین، تموم شد.',
  cardTitle: 'تمپو یعنی چی',
  cardBody: '<p>عددهای کنار هر حرکت <strong>سرعت</strong> رو می‌گن.</p>',
};

function prog(fa) {
  const P = H.fixture();
  P.athlete.lang = fa ? 'fa' : 'en';
  const cur = P.cycles[P.currentCycleIndex];
  cur.message = { paragraphs: [fa ? FA.para : 'This is where everything starts. Your body is learning.'], outcomes: [fa ? 'اسکوات قوی‌تر' : 'A stronger squat'] };
  // The fixture's current cycle started 10 days ago: week 2.
  cur.weekNotes = { '2': { title: fa ? 'هفته‌ی سبک' : 'Lighter week', rpeCap: 7,
    text: fa ? FA.week : 'No set above effort 7 this week. From next week the card is your target.' } };
  const day = P.workouts.days[0];
  day.completionMessage = fa ? FA.done : 'Good work.';
  const sq = day.blocks[1].exercises.find(e => e.why);
  if (fa) { sq.note = FA.note; sq.why.text = FA.why; }
  P.notes = { greeting: fa ? 'برای تو' : 'For you', cards: [{ icon: '⏱', title: fa ? FA.cardTitle : 'Understanding Tempo', body: fa ? FA.cardBody : '<p>The numbers next to each exercise.</p>' }] };
  return P;
}

const FARSI = "localStorage.setItem('aa_lang_beta', '1'); localStorage.setItem('aa_lang', 'fa');";

const read = p => p.evaluate(() => {
  const cur = DATA.cycles[DATA.currentCycleIndex], sq = DATA.workouts.days[0].blocks[1].exercises.find(e => e.why);
  renderNotes();
  return {
    fa: !!(window.AAI18N && AAI18N.fa), first: firstSentence(cur.message.paragraphs[0]).first, wn: weekNoteHTML(cur),
    callout: renderCoachNote(sq.note), notes: document.getElementById('notes-container').innerHTML,
    home: (document.querySelector('.wn') || {}).textContent || '',
  };
});
const head = wn => (wn.match(/<h3 class="wn-head"[^>]*>([\s\S]*?)<\/h3>/) || [, ''])[1].replace(/<[^>]+>/g, '');

(async () => {
  const C = H.checker();
  const browser = await H.launch();

  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(true), init: FARSI });
    const r = await read(p);
    C.check('Farsi programme, Farsi app: the app is in Farsi', r.fa, String(r.fa));
    C.check('the Coach\'s Note draws as written', r.callout.includes(FA.note), r.callout.slice(0, 200));
    C.check('the cover cuts the Farsi message at its first sentence', r.first === 'این سیکل پایه‌ی همه چیزه.', r.first);
    C.check('the week note\'s headline is its first Farsi sentence only', head(r.wn) === 'این هفته هیچ ستی بالای شدت ۷ نرو.', head(r.wn));
    C.check('the week note\'s second sentence stands under it', /<p class="wn-stand"[^>]*>از هفته/.test(r.wn), r.wn.slice(0, 400));
    C.check('Home\'s This Week draws it', r.home.includes('هیچ ستی'), r.home.slice(0, 200));
    C.check('the Coach tab draws the Farsi card', r.notes.includes(FA.cardTitle) && r.notes.includes('<strong>سرعت</strong>'), '');
    C.check('no page errors (Farsi)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(false) });
    const r = await read(p);
    C.check('English programme, English app: the first sentence is cut as before', r.first === 'This is where everything starts.', r.first);
    C.check('English: the week note headline is cut as before', head(r.wn).split('&nbsp;').join(' ') === 'No set above effort 7 this week.', head(r.wn));
    C.check('no page errors (English)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }
  {
    const { ctx, p } = await H.openProgram(browser, { w: 390, h: 844, prog: prog(true), init: FARSI, query: '?client=demo&fa=1', stub: { demo: prog(true) } });
    const r = await p.evaluate(() => ({ demo: !!window.IS_DEMO, fa: !!(window.AAI18N && AAI18N.fa), home: (document.querySelector('.wn') || {}).textContent || '',
      head: ((document.querySelector('.wn-head') || {}).textContent || '') }));
    C.check('demo: ?client=demo&fa=1 opens in Farsi', r.demo && r.fa, JSON.stringify(r).slice(0, 120));
    C.check('demo: the week note\'s headline is its first Farsi sentence', r.head.trim() === 'این هفته هیچ ستی بالای شدت ۷ نرو.', r.head);
    C.check('no page errors (demo)', !p.errs.length, JSON.stringify(p.errs));
    await ctx.close();
  }

  await browser.close();
  process.exit(C.report() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
