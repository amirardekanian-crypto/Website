/* Tennis physical testing app · clickable sample · app logic.
   Private prototype (assess-content). Plain HTML/CSS/JS, no build step, hash routes,
   so it runs from any static host. Built on the course app's base (tps-content/app).
   Content comes from content/manifest.json and the files it lists.
   Nothing is saved in this sample: players, results and notes live in memory and are
   gone after a reload. Saving to Supabase comes in a later step.
   The science behind every number is in assess-content/science/; Amir's choices are in
   science/DECISIONS.md. */
(function () {
  'use strict';

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const AR = '٠١٢٣٤٥٦٧٨٩';
  const fa = v => String(v == null ? '' : v).replace(/[0-9]/g, d => FA[d]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  const pill = (t, cls) => `<span class="pill ${cls || ''}">${t}</span>`;
  const ul = a => (a && a.length) ? `<ul class="list">${a.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
  const ol = a => (a && a.length) ? `<ol class="steps">${a.map(i => `<li>${esc(i)}</li>`).join('')}</ol>` : '';
  const mmss = s => fa(Math.floor(s / 60)) + ':' + fa(String(s % 60).padStart(2, '0'));
  // A number with a fixed count of decimals, in Persian digits with the Persian decimal sign.
  const fmt = (v, d) => fa(Number(v).toFixed(d || 0).replace('.', '٫'));
  // A signed change, kept left-to-right so the sign stays in front of the number.
  const signed = (v, d) => {
    const r = Number(Number(v).toFixed(d || 0));
    return `<bdi dir="ltr">${r > 0 ? '+' : r < 0 ? '−' : ''}${fmt(Math.abs(r), d)}</bdi>`;
  };

  const signedPct = (v, d) => signed(v, d == null ? 1 : d).replace('</bdi>', '٪</bdi>');
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length;

  // Numbers typed on a Persian or Arabic keyboard: their digits, and "/" or the Persian
  // decimal sign as the decimal point. Returns null for empty, NaN for anything else.
  const toLatin = s => String(s == null ? '' : s)
    .replace(/[۰-۹]/g, d => String(FA.indexOf(d)))
    .replace(/[٠-٩]/g, d => String(AR.indexOf(d)));
  function parseNum(s) {
    const t = toLatin(s).trim().replace(/[٫\/]/g, '.');
    if (!t) return null;
    if (!/^\d+(\.\d+)?$/.test(t)) return NaN;
    return parseFloat(t);
  }

  /* ── Persian calendar ──────────────────────────────────────────────── */
  // Gregorian to Persian (Jalali) date, the standard arithmetic conversion.
  function g2j(gy, gm, gd) {
    const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let jy = gy <= 1600 ? 0 : 979;
    gy -= gy <= 1600 ? 621 : 1600;
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
    return [jy, jm, jd];
  }
  const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
  const TODAY = (() => { const d = new Date(); return g2j(d.getFullYear(), d.getMonth() + 1, d.getDate()); })();
  const todayStr = () => TODAY[0] + '/' + String(TODAY[1]).padStart(2, '0') + '/' + String(TODAY[2]).padStart(2, '0');
  // Day number of a Persian "yyyy/mm/dd" date. Months 1-6 have 31 days and 7-12 have 30;
  // Esfand's 29 days are ignored, at most a day of error, nothing for a growth-speed gap.
  function dayIndex(s) {
    const [y, m, d] = String(s).split('/').map(Number);
    return (y - 1) * 365.2422 + (m <= 6 ? (m - 1) * 31 : 186 + (m - 7) * 30) + d;
  }

  // Age in years from birth year + month (Amir: no full date of birth), taking the 15th.
  function ageYears(p) {
    if (!p || !p.birthYear || !p.birthMonth) return null;
    return ((TODAY[0] - p.birthYear) * 12 + (TODAY[1] - p.birthMonth)) / 12 + (TODAY[2] - 15) / 365.25;
  }
  // Group comparison band: same sex and a 2-year age band; adults are one band.
  function ageBand(age) {
    if (age == null) return null;
    if (age >= 18) return { key: 'adult', label: '۱۸ سال و بالاتر' };
    const lo = Math.max(0, Math.floor(age / 2) * 2);
    return { key: 'j' + lo, label: fa(lo) + ' و ' + fa(lo + 1) + ' ساله' };
  }
  const groupName = (p, band) => (band.key === 'adult' ? (p.sex === 'f' ? 'زنان' : 'مردان') : (p.sex === 'f' ? 'دختران' : 'پسران')) + ' ' + band.label;

  function banner(o) {
    return `<header class="banner ${o.back ? 'has-back' : ''}">
      ${o.back ? `<button class="back" data-back="${esc(o.back)}" aria-label="بازگشت">→</button>` : ''}
      ${o.kicker ? `<div class="kicker">${o.kicker}</div>` : ''}
      <h1>${o.title}</h1>
      ${o.sub ? `<div class="sub">${o.sub}</div>` : ''}
      ${o.meta ? `<div class="meta">${o.meta}</div>` : ''}
    </header>`;
  }
  function acc(id, cls, title, body, open) {
    return `<div class="acc ${cls || ''} ${open ? 'open' : ''}" id="${id}">
      <button class="acc-head" aria-expanded="${open ? 'true' : 'false'}"><span>${title}</span><span class="chev">▼</span></button>
      <div class="acc-body">${body}</div></div>`;
  }
  const soonRow = (title, icon) => `<div class="list-row soon"><span class="lr-body"><span class="lr-title">${icon ? esc(icon) + ' ' : ''}${esc(title)}</span><br><span class="lr-sub">به‌زودی</span></span></div>`;
  const SAMPLE_NOTE = `<div class="sample-note">متن نمونه · هنوز بازبینی نشده</div>`;
  const WARN_DIGITS = `<div class="warn">فقط عدد بنویسید. برای اعشار از «٫» یا «/» استفاده کنید.</div>`;
  const LEAD_ENTER = `<div class="lead">عددها را وارد کنید.</div>`;
  const NO_PLAYER = `<div class="lead" style="margin-top:10px">برای دیدن پیشرفت، مقایسه با جدول مرجع و مقایسه با گروه، بالای کارت یک بازیکن انتخاب کنید.</div>`;
  const NO_AGE = `<p class="lead" style="margin:0">سال و ماه تولد این بازیکن ثبت نشده است.</p>`;

  /* ── Content ───────────────────────────────────────────────────────── */
  const C = { start: null, tests: null, norms: null, tools: null, sample: null };

  async function loadContent() {
    const mr = await fetch('content/manifest.json', { cache: 'no-store' });
    if (!mr.ok) throw new Error('content/manifest.json (' + mr.status + ')');
    const man = await mr.json();
    for (const f of man.files) {
      const r = await fetch('content/' + f, { cache: 'no-store' });
      if (!r.ok) throw new Error(f + ' (' + r.status + ')');
      const d = await r.json();
      if (f.startsWith('start')) C.start = d;
      else if (f.startsWith('tests')) C.tests = d;
      else if (f.startsWith('norms')) C.norms = d;
      else if (f.startsWith('tools')) C.tools = d;
      else if (f.startsWith('sample-players')) C.sample = d;
    }
  }

  // Sample players, copied into memory on load. Lost on reload, by design, in this sample.
  let PLAYERS = [];
  let nextId = 100;
  const RS = { playerId: '' };   // the player picked on a Record page, kept while moving between tests

  const view = () => $('#view');

  /* ── Tests, measures, history ──────────────────────────────────────── */
  const allTests = () => ((C.tests && C.tests.groups) || []).flatMap(g => (g.tests || []).map(t => Object.assign({ group: g }, t)));
  const testById = id => allTests().find(t => t.id === id);

  // Results that belong to one test page but are saved one value per measure.
  const MEASURES = {
    height: { title: 'قد', unit: 'سانتی‌متر', decimals: 1, page: 'body' },
    weight: { title: 'وزن', unit: 'کیلوگرم', decimals: 1, page: 'body' },
    span: { title: 'طول دست‌ها', unit: 'سانتی‌متر', decimals: 1, page: 'body' },
    hopL: { title: 'پرش جانبی · پای چپ', unit: 'سانتی‌متر', decimals: 0, page: 'hop' },
    hopR: { title: 'پرش جانبی · پای راست', unit: 'سانتی‌متر', decimals: 0, page: 'hop' },
    rfessR: { title: 'اسکات بلغاری · پای راست جلو', unit: 'کیلوگرم', decimals: 1, page: 'rfess' },
    rfessL: { title: 'اسکات بلغاری · پای چپ جلو', unit: 'کیلوگرم', decimals: 1, page: 'rfess' },
    rowR: { title: 'رول دمبل · دست راست', unit: 'کیلوگرم', decimals: 1, page: 'dbrow' },
    rowL: { title: 'رول دمبل · دست چپ', unit: 'کیلوگرم', decimals: 1, page: 'dbrow' },
    gripD: { title: 'قدرت چنگش · دست راکت', unit: 'کیلوگرم', decimals: 0, page: 'grip' },
    gripN: { title: 'قدرت چنگش · دست دیگر', unit: 'کیلوگرم', decimals: 0, page: 'grip' }
  };
  // One-side lifts: each side is saved as its own measure.
  const SIDE_IDS = { rfess: { R: 'rfessR', L: 'rfessL' }, dbrow: { R: 'rowR', L: 'rowL' } };
  function measureInfo(id) {
    if (MEASURES[id]) return MEASURES[id];
    const t = testById(id);
    return t && t.calc ? { title: t.title, unit: t.calc.unit || '', decimals: t.calc.decimals != null ? t.calc.decimals : (t.calc.type === 'lift' ? 1 : 0), page: t.id } : { title: id, unit: '', decimals: 0, page: id };
  }

  // Every saved result of one player on one test or measure, oldest first. Dates are Persian
  // "yyyy/mm/dd" strings, so they sort correctly as text.
  function history(p, testId) {
    const out = [];
    (p.days || []).forEach(d => (d.results || []).forEach(r => { if (r.test === testId) out.push(Object.assign({ date: d.date }, r)); }));
    return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }
  const latest = (p, testId) => { const h = history(p, testId); return h.length ? h[h.length - 1] : null; };

  /* ── Real change, norms, group ─────────────────────────────────────── */
  // The "real change" line for one test and one player, in the test's own unit.
  // none: below this the change is normal day-to-day wobble. real: at or above this it is real.
  // Returns null when the app must not give a verdict (e.g. under 11 on the wall jump).
  function changeRule(t, p, base) {
    const ch = (t.calc || {}).change || {};
    if (ch.type === 'abs') return { none: ch.none != null ? ch.none : ch.real, real: ch.real };
    if (ch.type === 'pct') { const x = base * ch.real / 100; return { none: x, real: x }; }
    if (ch.type === 'byAge') {
      const age = ageYears(p);
      if (age == null || age < (ch.minAge || 0)) return null;
      const r = age >= 18 ? ch.adult : ch.junior;
      return r ? { none: r.none, real: r.real } : null;
    }
    return null;
  }
  function verdict(delta, rule, lowerIsBetter) {
    if (!rule) return { key: 'none', text: 'برای این سن فقط عدد و روند نشان داده می‌شود' };
    const better = lowerIsBetter ? delta < 0 : delta > 0;
    const a = Math.abs(delta);
    if (a < rule.none) return { key: 'noise', text: 'در حد نوسان معمول روزبه‌روز' };
    if (a < rule.real) return { key: 'possible', text: better ? 'احتمالاً بهتر شده؛ آزمون بعدی را ببینید' : 'احتمالاً افت کرده؛ آزمون بعدی را ببینید' };
    return { key: better ? 'up' : 'down', text: better ? 'پیشرفت واقعی' : 'افت واقعی' };
  }

  // Quarter bands (Amir): cut at P25 / P50 / P75 of the reference players of the same sex and
  // age class. With a mean and SD, those cuts are z = -0.674, 0 and +0.674.
  const BANDS = ['نیاز به کار', 'متوسط', 'خوب', 'عالی'];
  function normBand(t, p, value) {
    const key = (t.calc || {}).norms;
    const N = key && C.norms && C.norms[key];
    if (!N) return { noNorms: true };
    const age = ageYears(p);
    if (age == null) return { noAge: true };
    const cls = (N.classes || []).find(c => c.sex === p.sex && age >= c.from && age < c.to);
    if (!cls) return { noClass: true };
    const sd = cls.sd != null ? cls.sd : cls.mean * N.sdPct / 100;
    let z = (value * (N.scale || 1) - cls.mean) / sd;
    if (N.lowerIsBetter) z = -z;
    const q = z < -0.674 ? 0 : z < 0 ? 1 : z < 0.674 ? 2 : 3;
    return { N, cls, z, q };
  }

  // Within the coach's own players: same sex and 2-year age band, each player's latest result.
  // A rank is shown only with 8 or more players (fewer makes a rank meaningless).
  function groupView(t, p, value) {
    const band = ageBand(ageYears(p));
    if (!band) return { noAge: true };
    const lower = !!t.calc.lowerIsBetter;
    const peers = PLAYERS.filter(x => x.id !== p.id && x.sex === p.sex && (ageBand(ageYears(x)) || {}).key === band.key)
      .map(x => latest(x, t.id)).filter(Boolean).map(r => r.value);
    const n = peers.length + 1;
    const label = groupName(p, band);
    if (n < 8) return { few: true, n, groupLabel: label };
    const rank = 1 + peers.filter(v => (lower ? v < value : v > value)).length;
    const all = peers.concat([value]).sort((a, b) => a - b);
    const median = all.length % 2 ? all[(all.length - 1) / 2] : (all[all.length / 2 - 1] + all[all.length / 2]) / 2;
    const rule = changeRule(t, p, value);
    const similar = rule ? peers.filter(v => Math.abs(v - value) < rule.real).length : 0;
    return { n, rank, median, similar, groupLabel: label };
  }

  /* ── Start: welcome + handbook chapters ─────────────────────────────── */
  function viewStart() {
    const s = C.start || {};
    let h = banner({ kicker: esc(s.kicker || ''), title: esc(s.title || ''), sub: esc(s.subtitle || '') });
    h += `<div class="section">`;
    (s.intro || []).forEach(p => { h += `<p class="intro">${esc(p)}</p>`; });
    if (s.jobs) h += acc('jobs', 'green', '🎯 ' + esc(s.jobs.title), ul(s.jobs.items) + (s.jobs.note ? `<p class="lead" style="margin-top:8px">${esc(s.jobs.note)}</p>` : ''), false);
    if ((s.howToUse || []).length) h += acc('howto', '', '📱 این اپ چطور کار می‌کند',
      `<div class="grid2">${s.howToUse.map(c => `<div class="card howto"><span class="ic">${esc(c.icon)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>`, false);
    if (s.equipment) h += acc('equipment', '', '🧰 ' + esc(s.equipment.title), ul(s.equipment.items), false);
    h += `<div class="h2">فصل‌های راهنما</div>`;
    (s.chapters || []).forEach(ch => {
      h += ch.soon ? soonRow(ch.title, ch.icon)
        : `<a class="card tap green" href="#/start/chapter/${encodeURIComponent(ch.id)}"><h3>${esc(ch.icon || '')} ${esc(ch.title)}</h3><p>${esc(ch.summary || '')}</p></a>`;
    });
    view().innerHTML = h + `</div>`;
  }

  function viewChapter(id) {
    const ch = ((C.start && C.start.chapters) || []).find(x => x.id === id && !x.soon);
    if (!ch) { view().innerHTML = banner({ back: '#/start', title: 'این فصل هنوز آماده نیست' }); return; }
    let h = banner({ back: '#/start', kicker: 'فصل راهنما', title: `${esc(ch.icon || '')} ${esc(ch.title)}`, sub: esc(ch.summary || '') });
    h += `<div class="section prose">${SAMPLE_NOTE}`;
    (ch.sections || []).forEach(sec => {
      if (sec.h) h += `<h3>${esc(sec.h)}</h3>`;
      (sec.p || []).forEach(p => { h += `<p>${esc(p)}</p>`; });
      h += ul(sec.list);
      if (sec.callout) h += `<div class="callout">${esc(sec.callout)}</div>`;
    });
    view().innerHTML = h + `</div>`;
  }

  /* ── Tests ─────────────────────────────────────────────────────────── */
  function viewTests() {
    const G = (C.tests && C.tests.groups) || [];
    let h = banner({ kicker: 'آزمون‌ها', title: 'آزمون‌ها', sub: 'برای هر آزمون: چه چیزی نشان می‌دهد، چطور اجرا شود و چه عددی یادداشت کنید.' });
    h += `<div class="section">`;
    G.forEach(g => {
      h += `<div class="group-title"><span class="slot" dir="ltr">${esc(g.key)}</span>${esc(g.title)}</div>`;
      (g.tests || []).forEach(t => {
        h += t.soon ? soonRow(t.title)
          : `<a class="list-row" href="#/tests/${encodeURIComponent(t.id)}"><span class="lr-body"><span class="lr-title">${esc(t.icon || '')} ${esc(t.title)}</span><br><span class="lr-sub">${esc(t.short || '')}</span></span><span class="lr-go">←</span></a>`;
      });
    });
    view().innerHTML = h + `</div>`;
  }

  /* A test page has two parts (Amir, step 2): Learn (how to run it) and Record
     (the calculator and save). #/tests/<id> opens Learn, #/tests/<id>/record opens Record,
     so on test day a coach can go straight to Record. */
  function viewTest(id) {
    const t = testById(id);
    if (!t || t.soon) { view().innerHTML = banner({ back: '#/tests', title: 'این آزمون هنوز آماده نیست' }); return; }
    const rec = !!t.calc && (location.hash || '').split('/')[3] === 'record';
    const href = '#/tests/' + encodeURIComponent(t.id);
    let h = banner({ back: '#/tests', kicker: esc(t.group.title), title: `${esc(t.icon || '')} ${esc(t.title)}`,
      sub: t.titleEn ? `<bdi dir="ltr">${esc(t.titleEn)}</bdi>` : '' });
    if (t.calc) h += `<div class="section part-bar"><div class="seg">
        <a href="${href}" class="${rec ? '' : 'on'}">📖 آموزش</a>
        <a href="${href}/record" class="${rec ? 'on' : ''}">✍️ ثبت نتیجه</a></div></div>`;
    if (rec) {
      if (t.record) h += `<div class="section part-bar"><div class="callout" style="margin:0">چه عددی یادداشت کنید: ${esc(t.record)}</div></div>`;
      view().innerHTML = h + calcCard(t);
      paintHistory();
      return;
    }
    h += `<div class="section prose">${SAMPLE_NOTE}`;
    if (t.why) h += `<h3>چه چیزی نشان می‌دهد</h3><p>${esc(t.why)}</p>`;
    if (t.note) h += `<div class="note">${esc(t.note)}</div>`;
    if (t.equipment) h += `<h3>وسایل و آماده‌سازی</h3>${ul(t.equipment)}`;
    if (t.steps) h += `<h3>اجرای آزمون</h3>${ol(t.steps)}`;
    (t.sections || []).forEach(sec => {
      if (sec.h) h += `<h3>${esc(sec.h)}</h3>`;
      (sec.p || []).forEach(x => { h += `<p>${esc(x)}</p>`; });
      h += ul(sec.list);
      if (sec.callout) h += `<div class="callout">${esc(sec.callout)}</div>`;
    });
    if (t.standard) h += `<h3>هر بار یکسان</h3>${ul(t.standard)}`;
    if (t.record) h += `<div class="callout">چه عددی یادداشت کنید: ${esc(t.record)}</div>`;
    if (t.mistakes) h += `<h3>اشتباه‌هایی که نتیجه را خراب می‌کند</h3>${ul(t.mistakes)}`;
    if (t.calc) h += `<a class="btn primary" style="margin:18px 0 6px" href="${href}/record">✍️ رفتن به ثبت نتیجه</a>`;
    view().innerHTML = h + `</div>`;
  }

  /* Record card. Calculator types:
     best  — best of N attempts (broad jump, throw)
     reach — wall jump: best touch minus the same-day standing reach; a 4th jump appears
             only when the 3rd was the best of the first three
     body  — height, weight and arm span; a 3rd reading appears when the first two disagree
     hop   — sideways hop: best of 3 per leg, and the left-right difference */
  function calcCard(t) {
    const c = t.calc;
    const opts = PLAYERS.map(p => `<option value="${esc(p.id)}" ${RS.playerId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('');
    const field = (id, label) => `<div class="field"><label for="${id}">${label}</label><input class="input num-in" id="${id}" inputmode="decimal" autocomplete="off" placeholder="—"></div>`;
    let inputs;
    if (c.type === 'reach') {
      inputs = `${field('rch', 'ارتفاع دسترسی')}
        <div class="calc-grid">${[1, 2, 3].map(k => field('t' + k, 'علامت پرش ' + fa(k))).join('')}</div>
        <div id="w4" hidden>${field('t4', 'پرش ۴ (چون پرش ۳ بهترین بود)')}</div>`;
    } else if (c.type === 'body') {
      inputs = `<div class="sub-h">قد (سانتی‌متر)</div>
        <div class="calc-grid">${field('h1', 'بار ۱')}${field('h2', 'بار ۲')}<div id="wh3" hidden>${field('h3', 'بار ۳')}</div></div>
        <div class="sub-h">وزن (کیلوگرم)</div>${field('wt', 'وزن')}
        <div class="sub-h">طول دست‌ها (سانتی‌متر) · اختیاری</div>
        <div class="calc-grid">${field('s1', 'بار ۱')}${field('s2', 'بار ۲')}<div id="ws3" hidden>${field('s3', 'بار ۳')}</div></div>`;
    } else if (c.type === 'hop') {
      // Right leg first: in a right-to-left layout it then sits on the right, like the body.
      const col = (side, label) => `<div class="leg"><div class="sub-h">${label}</div>${[1, 2, 3].map(k => field(side + k, 'پرش ' + fa(k))).join('')}</div>`;
      inputs = `<div class="legs">${col('R', 'پای راست · به چپ می‌پرد')}${col('L', 'پای چپ · به راست می‌پرد')}</div>`;
    } else if (c.type === 'lift') {
      const rpeSel = sfx => `<div class="field"><label for="le${sfx}">RPE</label><select class="input num-in" id="le${sfx}"><option value="">—</option>${RPES.map(v => `<option value="${v}">${fmt(v, v % 1 ? 1 : 0)}</option>`).join('')}</select></div>`;
      const set = sfx => `<div class="calc-grid">${field('lk' + sfx, esc(c.loadLabel))}${field('lr' + sfx, 'تکرار')}${rpeSel(sfx)}</div>`;
      inputs = (c.sides ? ['R', 'L'].map(sfx => `<div class="lift-set"><div class="sub-h">${esc(c.sideLabels[sfx])}</div>${set(sfx)}</div>`).join('') : set(''))
        + `<p class="lead" style="margin:8px 0 0">۱۶ سال و بالاتر: ۵ تکرار با RPE ۹ یا ۱۰ · زیر ۱۶ سال: ۶ تکرار با RPE ۷ یا ۸</p>`;
    } else if (c.type === 'reps') {
      inputs = field('rp', 'تعداد تکرار درست');
    } else if (c.type === 'grip') {
      const col = (k, label) => `<div class="leg"><div class="sub-h">${label}</div>${field('g' + k + '1', 'فشار ۱')}${field('g' + k + '2', 'فشار ۲')}</div>`;
      inputs = `<div class="legs">${col('D', 'دست راکت')}${col('N', 'دست دیگر')}</div>`;
    } else {
      inputs = `<div class="calc-grid">${Array.from({ length: c.attempts || 3 }, (_, i) => field('a' + (i + 1), 'تلاش ' + fa(i + 1))).join('')}</div>`;
    }
    const unitLead = c.unit && c.type !== 'reps' ?`عددها را به ${esc(c.unit)} بنویسید. ` : '';
    return `<div class="section"><div class="card calc" data-test="${esc(t.id)}">
      <div class="field"><label for="rec-player">بازیکن</label>
        <select class="input" id="rec-player"><option value="">انتخاب بازیکن…</option>${opts}</select></div>
      <div id="rec-hist"></div>
      <h3 style="margin-top:12px">🧮 ماشین‌حساب</h3>
      <p class="lead">${unitLead}عدد فارسی هم قبول است.</p>
      ${inputs}
      <div class="calc-out" id="calc-out">${LEAD_ENTER}</div>
      <div class="save-row" id="save-row" hidden><button class="btn primary" data-save-result>ذخیره برای این بازیکن</button></div>
      <div id="save-msg"></div>
    </div></div>`;
  }

  function histLine(p, id, label) {
    const h = history(p, id);
    if (!h.length) return '';
    const d = measureInfo(id).decimals;
    return `<div class="hist">${label}: ${h.slice(-3).map(r => `${fa(r.date)} · <b>${fmt(r.value, d)}</b>`).join(' ، ')}</div>`;
  }
  function paintHistory() {
    const box = $('.calc'), el = $('#rec-hist');
    if (!box || !el) return;
    const t = testById(box.dataset.test), p = PLAYERS.find(x => x.id === RS.playerId);
    if (!t || !p) { el.innerHTML = ''; return; }
    let html;
    if (t.calc.type === 'body') html = histLine(p, 'height', 'قد') + histLine(p, 'weight', 'وزن') + histLine(p, 'span', 'طول دست‌ها');
    else if (t.calc.sides) html = histLine(p, SIDE_IDS[t.id].R, esc(t.calc.sideLabels.R)) + histLine(p, SIDE_IDS[t.id].L, esc(t.calc.sideLabels.L));
    else if (t.calc.type === 'grip') html = histLine(p, 'gripD', 'دست راکت') + histLine(p, 'gripN', 'دست دیگر');
    else if (t.calc.type === 'hop') html =histLine(p, 'hopR', 'پای راست') + histLine(p, 'hopL', 'پای چپ');
    else html = histLine(p, t.id, 'نتیجه‌های قبلی');
    el.innerHTML = html || `<div class="hist">این بازیکن هنوز در این آزمون نتیجه‌ای ندارد.</div>`;
  }

  const bigResult = (label, v, c) => `<div class="big-result"><span>${label}</span><b>${fmt(v, c.decimals)}</b><em>${esc(c.unit)}</em></div>`;
  const countNote = (n, of, word) => `<div class="lead" style="margin-top:6px">${fa(n)} از ${fa(of)} ${word} وارد شده.</div>`;

  // Each calculator returns { fail: html } or { results: [{ test, value }], html }.
  function calcBest(t) {
    const c = t.calc, of = c.attempts || 3;
    const vals = Array.from({ length: of }, (_, i) => parseNum($('#a' + (i + 1)).value));
    if (vals.some(v => Number.isNaN(v))) return { fail: WARN_DIGITS };
    const ok = vals.filter(v => v != null);
    if (!ok.length) return { fail: LEAD_ENTER };
    const value = Number(Math.max.apply(null, ok).toFixed(c.decimals || 0));
    const html = bigResult('بهترین تلاش', value, c) + (ok.length < of ? countNote(ok.length, of, 'تلاش') : '');
    return { results: [{ test: t.id, value }], html: html + analysis(t, value) };
  }

  function calcReach(t) {
    const c = t.calc;
    const reach = parseNum($('#rch').value);
    const tv = [1, 2, 3, 4].map(k => parseNum($('#t' + k).value));
    if (Number.isNaN(reach) || tv.some(v => Number.isNaN(v))) return { fail: WARN_DIGITS };
    const thirdBest = tv[0] != null && tv[1] != null && tv[2] != null && tv[2] > Math.max(tv[0], tv[1]);
    $('#w4').hidden = !thirdBest;
    const used = tv.slice(0, thirdBest ? 4 : 3).filter(v => v != null);
    const of = thirdBest ? 4 : 3;
    if (reach == null || !used.length) return { fail: `<div class="lead">ارتفاع دسترسی و دست‌کم یک علامت پرش را وارد کنید.</div>` };
    const raw = Math.max.apply(null, used) - reach;
    if (raw <= 0) return { fail: `<div class="warn">علامت پرش باید بالاتر از ارتفاع دسترسی باشد. عددها را بررسی کنید.</div>` };
    const value = Number(raw.toFixed(c.decimals || 0));
    const html = bigResult('ارتفاع پرش', value, c) + (used.length < of ? countNote(used.length, of, 'پرش') : '');
    return { results: [{ test: t.id, value }], html: html + analysis(t, value) };
  }

  function calcBody() {
    const ids = ['h1', 'h2', 'h3', 'wt', 's1', 's2', 's3'];
    const v = {};
    ids.forEach(id => { v[id] = parseNum($('#' + id).value); });
    if (ids.some(id => Number.isNaN(v[id]))) return { fail: WARN_DIGITS };
    // A third reading appears when the first two disagree: height by more than 0.5 cm, span by more than 1 cm.
    const needH3 = v.h1 != null && v.h2 != null && Math.abs(v.h1 - v.h2) > 0.5;
    const needS3 = v.s1 != null && v.s2 != null && Math.abs(v.s1 - v.s2) > 1;
    $('#wh3').hidden = !needH3;
    $('#ws3').hidden = !needS3;
    // Two readings in tolerance: their mean. Three readings: the middle one.
    const combine = (a, b, c3, need) => {
      if (a == null || b == null) return null;
      if (!need) return (a + b) / 2;
      return c3 == null ? null : [a, b, c3].sort((x, y) => x - y)[1];
    };
    const results = [];
    const height = combine(v.h1, v.h2, v.h3, needH3);
    const span = combine(v.s1, v.s2, v.s3, needS3);
    if (height != null) results.push({ test: 'height', value: Number(height.toFixed(1)) });
    if (v.wt != null) results.push({ test: 'weight', value: Number(v.wt.toFixed(1)) });
    if (span != null) results.push({ test: 'span', value: Number(span.toFixed(1)) });
    let notes = '';
    if (needH3 && v.h3 == null) notes += `<div class="lead" style="margin-top:6px">قد: دو عدد بیش از نیم سانتی‌متر فرق دارند؛ بار سوم را بگیرید.</div>`;
    if (needS3 && v.s3 == null) notes += `<div class="lead" style="margin-top:6px">طول دست‌ها: دو عدد بیش از یک سانتی‌متر فرق دارند؛ بار سوم را بگیرید.</div>`;
    if (!results.length) return { fail: notes || `<div class="lead">هر اندازه را دو بار بگیرید و وارد کنید.</div>` };
    const html = `<div class="mini-res">${results.map(r => { const m = MEASURES[r.test]; return `<div><span>${esc(m.title)}</span><b>${fmt(r.value, m.decimals)}</b><em>${esc(m.unit)}</em></div>`; }).join('')}</div>` + notes;
    return { results, html: html + analysisBody(results) };
  }

  // Left-right difference: (larger - smaller) / larger x 100 (Bishop 2018).
  const gapOf = (l, r) => (l == null || r == null || Math.max(l, r) <= 0) ? null : (Math.max(l, r) - Math.min(l, r)) / Math.max(l, r) * 100;
  const betterSide = (l, r) => (l === r ? null : l > r ? 'چپ' : 'راست');

  function calcHop(t) {
    const c = t.calc;
    const read = side => [1, 2, 3].map(k => parseNum($('#' + side + k).value));
    const L = read('L'), R = read('R');
    if (L.concat(R).some(v => Number.isNaN(v))) return { fail: WARN_DIGITS };
    const okL = L.filter(v => v != null), okR = R.filter(v => v != null);
    if (!okL.length && !okR.length) return { fail: LEAD_ENTER };
    const best = ok => ok.length ? Number(Math.max.apply(null, ok).toFixed(c.decimals || 0)) : null;
    const bestL = best(okL), bestR = best(okR);
    const results = [];
    if (bestL != null) results.push({ test: 'hopL', value: bestL });
    if (bestR != null) results.push({ test: 'hopR', value: bestR });
    let html = `<div class="mini-res">
      <div><span>بهترین پای راست</span><b>${bestR != null ? fmt(bestR, 0) : '—'}</b><em>${esc(c.unit)}</em></div>
      <div><span>بهترین پای چپ</span><b>${bestL != null ? fmt(bestL, 0) : '—'}</b><em>${esc(c.unit)}</em></div></div>`;
    // The gap is shown only when both legs have all 3 valid jumps.
    const full = okL.length === 3 && okR.length === 3;
    if (!full) html += `<div class="lead" style="margin-top:6px">برای تفاوت دو پا، هر ۳ پرشِ هر دو پا لازم است.</div>`;
    return { results, html: html + analysisHop(t, bestL, bestR, full) };
  }

  /* ── Strength: The Ceiling, the estimator in program.html ───────────── */
  // Epley run on effective reps = reps done + reps in reserve (10 - RPE). Past 10 effective reps
  // there is no estimate; a true single at RPE 10 is its own estimate. Unlike program.html the
  // estimate is kept unrounded: 2.5 kg steps are too coarse for dumbbells and small juniors
  // (science/G-strength-tests.md §1).
  const ONE_RM_MAX_EFFECTIVE = 10;
  function estimateOneRM(kg, reps, rpe) {
    const w = Number(kg), r = Number(reps), e = Number(rpe);
    if (!(w > 0) || !(r > 0) || !(e > 0) || e > 10) return null;
    const effective = r + Math.max(0, 10 - e);
    if (effective > ONE_RM_MAX_EFFECTIVE) return null;
    return effective <= 1 ? w : w * (1 + effective / 30);
  }
  // How much to trust the number, from effective reps (program.html's ceilingQuality).
  function ceilingQuality(eff) {
    if (eff <= 3) return { key: 'g1', label: 'دقیق', hint: 'وزنهٔ سنگین و نزدیک حد توان. بهتر از این نمی‌شود.' };
    if (eff <= 6) return { key: 'g2', label: 'خوب', hint: 'به جهت تغییر می‌شود اعتماد کرد.' };
    return { key: 'g3', label: 'تقریبی', hint: 'ست طولانی را سخت می‌شود قضاوت کرد؛ فقط راهنمای کلی است.' };
  }
  // Shown in 0.5 kg steps for dumbbell lifts and anything under 40 kg, 2.5 kg above.
  function showKg(est, c) {
    const step = (c.load !== 'bar' || est < 40) ? 0.5 : 2.5, v = Math.round(est / step) * step;
    return fmt(v, v % 1 ? 1 : 0);
  }
  const RPES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5];
  const isU16 = p => { const a = ageYears(p); return a != null && a < 16; };
  const pct = (a, b) => (a - b) / b * 100;
  const fewText = g => `<p class="lead" style="margin:0">گروه «${esc(g.groupLabel)}»: برای رتبه‌بندی دست‌کم ۸ بازیکن با نتیجه لازم است؛ الان ${fa(g.n)} نفر.</p>`;
  const NO_NORM_TENNIS = `<p class="lead" style="margin:0">برای این آزمون جدول مرجع منتشرشده‌ای برای بازیکنان تنیس وجود ندارد.</p>`;

  // Does this set count as a test? 16+: RPE 9-10 and at most 5 reps. Under 16 (Amir's rule):
  // a light set, exactly 6 reps at RPE 7-8, never near failure.
  function judgeSet(p, reps, rpe) {
    if (isU16(p)) {
      if (reps !== 6) return { ok: false, msg: 'زیر ۱۶ سال، ست آزمون ۶ تکرار است.' };
      if (rpe > 8) return { ok: false, msg: 'برای زیر ۱۶ سال این ست بیش از حد به ناتوانی نزدیک شد. ست سبک با RPE ۷ یا ۸ تمام می‌شود، یعنی ۲ تا ۳ تکرار خوب هنوز مانده. ثبت نمی‌شود.' };
      if (rpe < 7) return { ok: false, msg: 'این ست از ست آزمون زیر ۱۶ سال (RPE ۷ یا ۸) سبک‌تر بود. بعد از استراحت، با کمی وزنهٔ بیشتر دوباره.' };
      return { ok: true, mode: 'light', msg: 'ست سبک زیر ۱۶ سال، درست اجرا شد.' };
    }
    if (rpe < 9) return { ok: false, msg: 'هنوز آزمون نیست: RPE باید ۹ یا ۱۰ باشد. وزنه را بیشتر کنید (بالاتنه ۲٫۵ تا ۵ درصد، پایین‌تنه ۵ تا ۱۰ درصد) و بعد از ۳ دقیقه دوباره؛ حداکثر ۳ ست آزمون.' };
    if (reps > 5) return { ok: false, msg: 'بیش از ۵ تکرار یعنی وزنه سبک بود. وزنه را بیشتر کنید و بعد از ۳ دقیقه دوباره؛ حداکثر ۳ ست آزمون.' };
    return { ok: true, mode: 'test', msg: reps === 5 ? 'آزمون ۵ تکرار درست اجرا شد.' : 'به ۵ تکرار نرسید: همین را ثبت کنید و این حرکت را تمام کنید.' };
  }

  // One set's inputs; sfx is '' or the side, 'R' / 'L'.
  function readSet(c, sfx) {
    const kg = parseNum($('#lk' + sfx).value), reps = parseNum($('#lr' + sfx).value), rpe = parseNum($('#le' + sfx).value);
    if ([kg, reps, rpe].some(v => Number.isNaN(v))) return { bad: true };
    if (kg == null || reps == null || rpe == null) return { empty: true };
    const r = Math.round(reps), load = kg * (c.load === 'db2' ? 2 : 1);
    return { kg, reps: r, rpe, eff: r + Math.max(0, 10 - rpe), est: estimateOneRM(load, r, rpe) };
  }
  // One set's result block, and the result to save when the set counts as a test.
  function setBlock(c, s, p, id, label) {
    let h = label ? `<div class="sub-h">${esc(label)}</div>` : '';
    if (s.empty) return { html: h + `<div class="lead">وزنه، تکرار و RPE را وارد کنید.</div>`, result: null };
    if (s.est == null) {
      const rir = Math.max(0, 10 - s.rpe);
      return { html: h + `<div class="warn">${fa(s.reps)} تکرار با ${fmt(rir, rir % 1 ? 1 : 0)} تکرار باقی‌مانده یعنی ${fmt(s.eff, s.eff % 1 ? 1 : 0)} تکرار مؤثر. بیشتر از ${fa(ONE_RM_MAX_EFFECTIVE)} تکرار مؤثر، عدد حدس است نه تخمین.${p && isU16(p) ? '' : ' یک ست سنگین‌تر با ۵ تکرار یا کمتر بزنید.'}</div>`, result: null };
    }
    const q = ceilingQuality(s.eff), j = p ? judgeSet(p, s.reps, s.rpe) : null;
    h += `<div class="big-result"><span>حداکثر قدرت تخمینی</span><b>${showKg(s.est, c)}</b><em>کیلوگرم</em></div>
      <div class="grade ${q.key}">${q.label} <em>· میزان اعتماد به این عدد</em></div>`;
    h += j ? `<div class="${j.ok ? 'ok' : 'warn'}">${esc(j.msg)}</div>` : `<p class="lead" style="margin:6px 0 0">${esc(q.hint)}</p>`;
    const result = j && j.ok ? { test: id, value: Number(s.est.toFixed(1)), kg: s.kg, reps: s.reps, rpe: s.rpe, mode: j.mode } : null;
    return { html: h, result };
  }

  function calcLift(t) {
    const c = t.calc, p = PLAYERS.find(x => x.id === RS.playerId), age = ageYears(p);
    if (p && c.minAge && age != null && age < c.minAge)
      return { fail: `<div class="warn">این آزمون از ${fa(c.minAge)} سالگی است. برای این بازیکن، آزمون شنا را ثبت کنید.</div>` };
    const sides = c.sides ? ['R', 'L'] : [''];
    const sets = sides.map(sfx => readSet(c, sfx));
    if (sets.some(s => s.bad)) return { fail: WARN_DIGITS };
    if (sets.every(s => s.empty)) return { fail: `<div class="lead">وزنه، تکرار و RPE ست آزمون را وارد کنید.</div>` };
    const blocks = sides.map((sfx, i) => setBlock(c, sets[i], p, c.sides ? SIDE_IDS[t.id][sfx] : t.id, c.sides ? c.sideLabels[sfx] : ''));
    const results = blocks.map(b => b.result).filter(Boolean);
    const html = blocks.map(b => b.html).join('');
    if (!p) return { results: [], html: html + NO_PLAYER };
    return { results, html: html + analysisLift(t, p, results) };
  }

  function changeWord(d, possible, real) {
    const a = Math.abs(d);
    if (a < possible) return { key: 'noise', text: 'در حد نوسان معمول' };
    if (a < real) return { key: 'possible', text: d > 0 ? 'احتمالاً قوی‌تر شده؛ آزمون بعدی را ببینید' : 'احتمالاً افت کرده؛ آزمون بعدی را ببینید' };
    return { key: d > 0 ? 'up' : 'down', text: d > 0 ? 'پیشرفت واقعی' : 'افت واقعی' };
  }
  // Real change for a lift. 16+ tests: typical error 5%, so under 5% is noise, 5-12% possible and
  // 12% or more real, against the first test. Under-16 light sets (Amir): up to 3 tests, against
  // the previous test (6% / 15%); from 4 tests, the mean of the last 2 against the 2 before
  // (6% / 10%). Light sets are compared only at the same RPE.
  function liftProgress(p, r) {
    const past = history(p, r.test).filter(x => x.date < todayStr() && x.mode === r.mode);
    if (!past.length) return `<p>اولین نتیجهٔ این بازیکن در این آزمون؛ این عدد، عدد شروع او می‌شود.</p>`;
    let v, rows, rule;
    if (r.mode === 'light') {
      const all = past.concat([Object.assign({ date: todayStr() }, r)]);
      const used = all.length < 4 ? all.slice(-2) : all.slice(-4);
      if (used.some(x => x.rpe !== r.rpe)) { v = { key: 'none', text: 'قابل مقایسه نیست: RPE این آزمون‌ها یکی نبود' }; rows = ''; }
      else if (all.length < 4) {
        const d = pct(r.value, used[0].value);
        v = changeWord(d, 6, 15);
        rows = `<div>نسبت به آزمون قبلی (${fa(used[0].date)}): <b>${signedPct(d)}</b></div>`;
      } else {
        const d = pct(mean(used.slice(2).map(x => x.value)), mean(used.slice(0, 2).map(x => x.value)));
        v = changeWord(d, 6, 10);
        rows = `<div>میانگین دو آزمون آخر نسبت به دو آزمون قبل از آن: <b>${signedPct(d)}</b></div>`;
      }
      rule = all.length < 4 ? 'تغییر واقعی در ست سبک: دست‌کم ۱۵٪ نسبت به آزمون قبلی. از آزمون چهارم میانگین دو آزمون آخر با دو آزمون قبل مقایسه می‌شود و ۱۰٪ کافی است.'
        : 'تغییر واقعی در ست سبک، با میانگین دو آزمون: دست‌کم ۱۰٪.';
    } else {
      const base = past[0], prev = past[past.length - 1], d = pct(r.value, base.value);
      v = changeWord(d, 5, 12);
      rows = `<div>نسبت به عدد شروع (${fa(base.date)}): <b>${signedPct(d)}</b></div>` +
        (past.length > 1 ? `<div>نسبت به آزمون قبلی (${fa(prev.date)}): <b>${signedPct(pct(r.value, prev.value))}</b></div>` : '');
      rule = 'تغییر واقعی: دست‌کم ۱۲٪؛ ۵ تا ۱۲٪ یعنی احتمالی. یک دورهٔ تمرینی اغلب به ۱۲٪ نمی‌رسد؛ روند ۲ تا ۳ آزمون را ببینید.';
    }
    return `<span class="verdict v-${v.key}">${esc(v.text)}</span><div class="an-rows">${rows}<div class="lead" style="margin:2px 0 0">${rule}</div></div>`;
  }

  // Own progress (with strength per kg of body weight), no reference table, then the group.
  function analysisLift(t, p, results) {
    if (!results.length) return '';
    let h = `<div class="an"><div class="an-h">۱ · پیشرفت خود بازیکن</div>`;
    results.forEach(r => { h += (t.calc.sides ? `<div class="sub-h">${esc(measureInfo(r.test).title)}</div>` : '') + liftProgress(p, r); });
    const w = latest(p, 'weight');
    if (w) {
      h += `<p style="margin:8px 0 0">نسبت به وزن بدن: ${results.map(r => `<b>${fmt(r.value / w.value, 2)}</b>`).join(' و ')} برابر وزن (وزن ${fmt(w.value, 1)} کیلوگرم، ${fa(w.date)})</p>`;
      if (dayIndex(todayStr()) - dayIndex(w.date) > 7) h += `<p class="lead" style="margin:0">این وزن بیش از یک هفته پیش ثبت شده؛ برای عدد دقیق‌تر دوباره وزن کنید.</p>`;
    } else h += `<p class="lead" style="margin:8px 0 0">برای قدرت نسبت به وزن بدن، وزن بازیکن را در صفحهٔ «قد، وزن و طول دست‌ها» ثبت کنید.</p>`;
    h += `</div><div class="an"><div class="an-h">۲ · مقایسه با جدول مرجع</div>${NO_NORM_TENNIS}</div>`;
    return h + `<div class="an"><div class="an-h">۳ · مقایسه با گروه خودتان</div>${liftGroup(t, p, results)}</div>`;
  }

  // Group: same sex and 2-year band, each player's latest result of the same kind (test or light
  // set); for one-side lifts the average of both sides. A rank from 8 players.
  function liftGroup(t, p, results) {
    const band = ageBand(ageYears(p));
    if (!band) return NO_AGE;
    const ids = t.calc.sides ? [SIDE_IDS[t.id].R, SIDE_IDS[t.id].L] : [t.id];
    if (results.length !== ids.length) return `<p class="lead" style="margin:0">برای مقایسه با گروه، ست آزمون هر دو طرف لازم است.</p>`;
    const mode = results[0].mode, label = groupName(p, band), mine = mean(results.map(r => r.value));
    const peers = PLAYERS.filter(x => x.id !== p.id && x.sex === p.sex && (ageBand(ageYears(x)) || {}).key === band.key)
      .map(x => ({ rs: ids.map(id => latest(x, id)), w: latest(x, 'weight') }))
      .filter(o => o.rs.every(r => r && r.mode === mode))
      .map(o => ({ v: mean(o.rs.map(r => r.value)), w: o.w }));
    const n = peers.length + 1;
    if (n < 8) return fewText({ groupLabel: label, n });
    const all = peers.map(o => o.v).concat([mine]).sort((a, b) => a - b);
    const med = all.length % 2 ? all[(all.length - 1) / 2] : (all[all.length / 2 - 1] + all[all.length / 2]) / 2;
    let h = `<p>گروه «${esc(label)}»: رتبهٔ <b>${fa(1 + peers.filter(o => o.v > mine).length)}</b> از ${fa(n)} · میانهٔ گروه ${showKg(med, t.calc)} کیلوگرم</p>`;
    const w = latest(p, 'weight'), pw = peers.filter(o => o.w);
    if (w && pw.length + 1 >= 8) h += `<p style="margin:0">نسبت به وزن بدن: رتبهٔ <b>${fa(1 + pw.filter(o => o.v / o.w.value > mine / w.value).length)}</b> از ${fa(pw.length + 1)}</p>`;
    return h;
  }

  // Push-ups: reps. No day-to-day error data was found, so the change gets no verdict.
  function calcReps(t) {
    const raw = parseNum($('#rp').value);
    if (Number.isNaN(raw)) return { fail: WARN_DIGITS };
    if (raw == null) return { fail: LEAD_ENTER };
    const value = Math.round(raw), p = PLAYERS.find(x => x.id === RS.playerId);
    let h = `<div class="big-result"><span>تکرار درست</span><b>${fa(value)}</b><em>${esc(t.calc.unit)}</em></div>`;
    if (!p) return { results: [{ test: t.id, value }], html: h + NO_PLAYER };
    const past = history(p, t.id).filter(x => x.date < todayStr());
    h += `<div class="an"><div class="an-h">۱ · پیشرفت خود بازیکن</div>`;
    if (!past.length) h += `<p>اولین نتیجهٔ این بازیکن در این آزمون؛ این عدد، عدد شروع او می‌شود.</p>`;
    else {
      const base = past[0], prev = past[past.length - 1];
      h += `<div class="an-rows"><div>نسبت به عدد شروع (${fa(base.date)}): <b>${signed(value - base.value, 0)}</b> تکرار</div>` +
        (past.length > 1 ? `<div>نسبت به آزمون قبلی (${fa(prev.date)}): <b>${signed(value - prev.value, 0)}</b> تکرار</div>` : '') +
        `<div class="lead" style="margin:2px 0 0">برای تکرار شنا دادهٔ نوسان روزبه‌روز پیدا نشد؛ اپ دربارهٔ واقعی بودن تغییر حکم نمی‌دهد. روند چند آزمون را ببینید.</div></div>`;
    }
    const g = groupView(t, p, value);
    h += `</div><div class="an"><div class="an-h">۲ · مقایسه با جدول مرجع</div>${NO_NORM_TENNIS}</div>`;
    h += `<div class="an"><div class="an-h">۳ · مقایسه با گروه خودتان</div>${g.noAge ? NO_AGE : g.few ? fewText(g)
      : `<p>گروه «${esc(g.groupLabel)}»: رتبهٔ <b>${fa(g.rank)}</b> از ${fa(g.n)} · میانهٔ گروه ${fmt(g.median, 0)} تکرار</p>`}</div>`;
    return { results: [{ test: t.id, value }], html: h };
  }

  // Grip: best of 2 per hand, whole kg. Real change (science/G-grip-and-under16.md): typical error
  // 1.5 kg, so under 1.5 kg is noise, 1.5-3.5 kg possible, 3.5 kg or more real. Norms: DTB
  // quarter bands by half-year age, sex and hand, with the racket hand as the dominant hand.
  const quarter = (v, q) => v < q[0] ? 0 : v < q[1] ? 1 : v < q[2] ? 2 : 3;
  function calcGrip(t) {
    const v = ['gD1', 'gD2', 'gN1', 'gN2'].map(id => parseNum($('#' + id).value));
    if (v.some(x => Number.isNaN(x))) return { fail: WARN_DIGITS };
    const best = a => { const ok = a.filter(x => x != null); return ok.length ? Math.round(Math.max.apply(null, ok)) : null; };
    const d = best(v.slice(0, 2)), n = best(v.slice(2));
    if (d == null && n == null) return { fail: LEAD_ENTER };
    const results = [];
    if (d != null) results.push({ test: 'gripD', value: d });
    if (n != null) results.push({ test: 'gripN', value: n });
    const h = `<div class="mini-res"><div><span>دست راکت</span><b>${d != null ? fa(d) : '—'}</b><em>کیلوگرم</em></div>
      <div><span>دست دیگر</span><b>${n != null ? fa(n) : '—'}</b><em>کیلوگرم</em></div></div>`;
    const p = PLAYERS.find(x => x.id === RS.playerId);
    return { results, html: h + (p ? analysisGrip(p, results) : NO_PLAYER) };
  }
  function analysisGrip(p, results) {
    const HANDS = { gripD: 'دست راکت', gripN: 'دست دیگر' };
    let h = `<div class="an"><div class="an-h">۱ · پیشرفت خود بازیکن</div><div class="an-rows">`;
    results.forEach(r => {
      const past = history(p, r.test).filter(x => x.date < todayStr());
      if (!past.length) { h += `<div>${HANDS[r.test]}: اولین نتیجه؛ این عدد، عدد شروع می‌شود.</div>`; return; }
      const base = past[0], prev = past[past.length - 1], w = changeWord(r.value - base.value, 1.5, 3.5);
      h += `<div>${HANDS[r.test]} نسبت به عدد شروع (${fa(base.date)}): <b>${signed(r.value - base.value, 0)}</b> کیلوگرم · ${esc(w.text)}</div>` +
        (past.length > 1 ? `<div>${HANDS[r.test]} نسبت به آزمون قبلی (${fa(prev.date)}): <b>${signed(r.value - prev.value, 0)}</b> کیلوگرم</div>` : '');
    });
    h += `<div class="lead" style="margin:2px 0 0">تغییر واقعی: دست‌کم ۳٫۵ کیلوگرم. در نوجوانی قدرت چنگش با رشد هم بالا می‌رود، پس رده را هم کنارش ببینید.</div></div></div>`;
    const N = C.norms && C.norms.grip, age = ageYears(p);
    const cls = N && age != null ? N.classes.find(c => c.sex === p.sex && age >= c.from && age < c.to) : null;
    h += `<div class="an"><div class="an-h">۲ · مقایسه با جدول مرجع</div>`;
    if (age == null) h += NO_AGE;
    else if (!cls) h += `<p class="lead" style="margin:0">برای جنس و سن این بازیکن در جدول مرجع داده‌ای نیست.</p>`;
    else {
      results.forEach(r => {
        const q = quarter(r.value, cls[r.test === 'gripD' ? 'd' : 'nd']);
        h += `<div class="sub-h">${HANDS[r.test]}</div><div class="bands">${BANDS.map((b, i) => `<span class="${i === q ? 'on' : ''}">${b}</span>`).join('')}</div>`;
      });
      h += `<p class="lead" style="margin:6px 0 0">رده: ${esc(cls.label)} · در مقایسه با ${esc(N.reference)}</p>`;
    }
    h += `</div><div class="an"><div class="an-h">۳ · مقایسه با گروه خودتان</div>`;
    const dr = results.find(r => r.test === 'gripD');
    if (!dr) h += `<p class="lead" style="margin:0">برای مقایسه با گروه، دست راکت لازم است.</p>`;
    else {
      const g = groupView({ id: 'gripD', calc: {} }, p, dr.value);
      h += g.noAge ? NO_AGE : g.few ? fewText(g) : `<p>دست راکت در گروه «${esc(g.groupLabel)}»: رتبهٔ <b>${fa(g.rank)}</b> از ${fa(g.n)} · میانهٔ گروه ${fmt(g.median, 0)} کیلوگرم</p>`;
    }
    return h + `</div>`;
  }

  const CALC = { best: calcBest, reach: calcReach, body: calcBody, hop: calcHop, lift: calcLift, reps: calcReps, grip: calcGrip };
  function recalc() {
    const box = $('.calc'); if (!box) return;
    const t = testById(box.dataset.test); if (!t) return;
    const out = $('#calc-out'), save = $('#save-row');
    delete box.dataset.results;
    $('#save-msg').innerHTML = '';
    const r = (CALC[t.calc.type] || calcBest)(t);
    if (r.fail != null) { out.innerHTML = r.fail; save.hidden = true; return; }
    box.dataset.results = JSON.stringify(r.results);
    out.innerHTML = r.html;
    save.hidden = !RS.playerId || !r.results.length;
  }

  // The three readings of one result, in Amir's order: own progress first, then the
  // reference table, then the coach's own group.
  function analysis(t, value) {
    const p = PLAYERS.find(x => x.id === RS.playerId);
    if (!p) return NO_PLAYER;
    const c = t.calc, d = c.decimals || 0, u = esc(c.unit);
    const past = history(p, t.id).filter(r => r.date < todayStr());

    let h = `<div class="an"><div class="an-h">۱ · پیشرفت خود بازیکن</div>`;
    if (!past.length) h += `<p>اولین نتیجهٔ این بازیکن در این آزمون؛ این عدد، عدد شروع او می‌شود.</p>`;
    else {
      const base = past[0], prev = past[past.length - 1];
      const rule = changeRule(t, p, base.value);
      const v = verdict(value - base.value, rule, c.lowerIsBetter);
      h += `<span class="verdict v-${v.key}">${esc(v.text)}</span><div class="an-rows">
        <div>نسبت به عدد شروع (${fa(base.date)}): <b>${signed(value - base.value, d)}</b> ${u}</div>
        ${past.length > 1 ? `<div>نسبت به آزمون قبلی (${fa(prev.date)}): <b>${signed(value - prev.value, d)}</b> ${u}</div>` : ''}
        ${rule ? `<div class="lead" style="margin:2px 0 0">تغییر واقعی در این آزمون: دست‌کم ${fmt(rule.real, d)} ${u}</div>` : ''}</div>`;
    }
    h += `</div>`;

    const nb = normBand(t, p, value);
    h += `<div class="an"><div class="an-h">۲ · مقایسه با جدول مرجع</div>`;
    if (nb.noNorms) h += `<p class="lead" style="margin:0">${esc(c.noNormsText || 'برای این آزمون جدول مرجع منتشرشده‌ای وجود ندارد.')}</p>`;
    else if (nb.noAge) h += NO_AGE;
    else if (nb.noClass) h += `<p class="lead" style="margin:0">برای جنس و سن این بازیکن در جدول مرجع دادهٔ کافی نیست.</p>`;
    else h += `<div class="bands">${BANDS.map((b, i) => `<span class="${i === nb.q ? 'on' : ''}">${b}</span>`).join('')}</div>
      <p class="lead" style="margin:0">رده: ${esc(nb.cls.label)} · در مقایسه با ${esc(nb.N.reference)}</p>`;
    h += `</div>`;

    const g = groupView(t, p, value);
    h += `<div class="an"><div class="an-h">۳ · مقایسه با گروه خودتان</div>`;
    if (g.noAge) h += NO_AGE;
    else if (g.few) h += `<p class="lead" style="margin:0">گروه «${esc(g.groupLabel)}»: برای رتبه‌بندی دست‌کم ۸ بازیکن با نتیجه لازم است؛ الان ${fa(g.n)} نفر.</p>`;
    else h += `<p>گروه «${esc(g.groupLabel)}»: رتبهٔ <b>${fa(g.rank)}</b> از ${fa(g.n)} · میانهٔ گروه ${fmt(g.median, d)} ${u}</p>
      ${g.similar ? `<p class="lead" style="margin:0">${fa(g.similar)} بازیکن دیگر عملاً هم‌سطح او هستند (فاصله کمتر از تغییر واقعی).</p>` : ''}`;
    h += `</div>`;
    return h;
  }

  // Body measurements: own trend and growth speed only. Amir chose no body-size comparison,
  // so there is no reference table and no group section here.
  function analysisBody(results) {
    const p = PLAYERS.find(x => x.id === RS.playerId);
    if (!p) return `<div class="lead" style="margin-top:10px">برای دیدن تغییر و سرعت رشد، بالای کارت یک بازیکن انتخاب کنید.</div>`;
    const today = todayStr();
    const get = id => (results.find(r => r.test === id) || {}).value;
    const height = get('height'), weight = get('weight'), span = get('span');
    const age = ageYears(p), adult = age != null && age >= 18;
    let h = `<div class="an"><div class="an-h">تغییر و رشد</div><div class="an-rows">`;
    if (height != null) {
      const past = history(p, 'height').filter(r => r.date < today);
      if (!past.length) h += `<div>قد: اولین اندازه‌گیری این بازیکن.</div>`;
      else {
        const prev = past[past.length - 1], dH = height - prev.value;
        // Real change for height: 1.0 cm (typical error about 0.3 cm). A drop that big, or a change
        // that big from age 18, means measure again.
        const txt = Math.abs(dH) < 1 ? 'تغییر روشنی نیست' : (dH > 0 && !adult) ? 'قد بیشتر شده' : 'احتمالاً خطای اندازه‌گیری؛ دوباره اندازه بگیرید';
        h += `<div>قد نسبت به ${fa(prev.date)}: <b>${signed(dH, 1)}</b> سانتی‌متر · ${txt}</div>`;
        // Growth speed, under 18 only, from the most recent earlier height at least 90 days back.
        const nowIdx = dayIndex(today);
        const ref = past.slice().reverse().find(r => nowIdx - dayIndex(r.date) >= 90);
        if (adult) { /* grown up: no growth speed */ }
        else if (!ref) h +=`<div class="lead" style="margin:2px 0 0">برای سرعت رشد، دست‌کم ۳ ماه فاصله بین دو اندازه‌گیری قد لازم است.</div>`;
        else {
          const days = nowIdx - dayIndex(ref.date);
          const speed = (height - ref.value) / (days / 365.2422);
          const band = speed > 7.2 ? 'سریع' : speed >= 3.5 ? 'متوسط' : 'آهسته';
          h += `<div>سرعت رشد: <b>${fmt(Math.max(speed, 0), 1)}</b> سانتی‌متر در سال · ${band}${days < 180 ? ' (موقت؛ داده کمتر از ۶ ماه)' : ''}</div>`;
          if (speed > 7.2) h += `<div class="note">رشد سریع: آزمون‌های مهارتی مثل عنکبوتی، ۵۰۵ و پرش جانبی ممکن است مدتی درجا بزنند. این تنبلی یا شکست تمرین نیست.</div>`;
        }
      }
    }
    if (weight != null) {
      const past = history(p, 'weight').filter(r => r.date < today);
      if (!past.length) h += `<div>وزن: اولین اندازه‌گیری این بازیکن.</div>`;
      else {
        const prev = past[past.length - 1], pct = (weight - prev.value) / prev.value * 100;
        // Real change for body mass: 2% (day-to-day CV about 0.7%). A trend only, never good or bad.
        h +=`<div>وزن نسبت به ${fa(prev.date)}: <b>${signed(weight - prev.value, 1)}</b> کیلوگرم (${signed(pct, 1).replace('</bdi>', '٪</bdi>')}) · ${Math.abs(pct) < 2 ? 'در حد نوسان روزانه' : 'تغییر روشن'}</div>`;
        if (!adult) h +=`<div class="lead" style="margin:2px 0 0">در نوجوانِ در حال رشد، تغییر وزن را کنار تغییر قد ببینید، نه به‌تنها.</div>`;
      }
    }
    if (span != null) {
      const past = history(p, 'span').filter(r => r.date < today);
      if (past.length) { const prev = past[past.length - 1]; h += `<div>طول دست‌ها نسبت به ${fa(prev.date)}: <b>${signed(span - prev.value, 1)}</b> سانتی‌متر</div>`; }
    }
    h += `</div><p class="lead" style="margin:8px 0 0">اندازه‌های بدن با جدول مرجع یا گروه مقایسه نمی‌شوند.</p></div>`;
    return h;
  }

  // Sideways hop: today's left-right difference against the test's own noise band (2 x CV),
  // then own progress, no reference table, and the coach's group.
  function analysisHop(t, l, r, full) {
    const c = t.calc, band = 2 * c.cv;
    const gap = full ? gapOf(l, r) : null;
    let h = '';
    if (gap != null) {
      h += `<div class="an"><div class="an-h">تفاوت دو پا</div>`;
      if (gap < band) h += `<p>دو پا تقریباً یک اندازه پریدند. تفاوت ${fmt(gap, 1)}٪ در حد نوسان معمول این آزمون است.</p>`;
      else h += `<p>پای ${betterSide(l, r)} ${fmt(gap, 1)}٪ دورتر پرید. این بیشتر از نوسان معمول آزمون است، پس احتمالاً امروز تفاوت واقعی است.</p>
        <p class="lead" style="margin:0">بسیاری از بازیکنان نوجوان چنین تفاوتی دارند. این آزمون نشان نمی‌دهد چه کسی آسیب می‌بیند یا در زمین کندتر است. دفعهٔ بعد دوباره آزمون بگیرید؛ اگر همان پا دوباره عقب بود، تمرین تک‌پای بیشتر برای آن پا و فیلم گرفتن از فرودهایش منطقی است.</p>`;
      h += `</div>`;
    }
    const p = PLAYERS.find(x => x.id === RS.playerId);
    if (!p) return h + NO_PLAYER;
    const today = todayStr();
    const pastL = history(p, 'hopL').filter(x => x.date < today);
    const pastR = history(p, 'hopR').filter(x => x.date < today);

    h += `<div class="an"><div class="an-h">۱ · پیشرفت خود بازیکن</div>`;
    if (!pastL.length && !pastR.length) h += `<p>اولین نتیجهٔ این بازیکن در این آزمون؛ این عددها، عدد شروع او می‌شوند.</p>`;
    else {
      const legRow = (label, now, past) => {
        if (now == null || !past.length) return '';
        const base = past[0].value, d = now - base, real = base * c.distReal / 100;
        const txt = Math.abs(d) < real ? 'در حد نوسان معمول' : d > 0 ? 'پیشرفت واقعی' : 'افت واقعی';
        return `<div>${label} نسبت به عدد شروع (${fa(past[0].date)}): <b>${signed(d, 0)}</b> سانتی‌متر · ${txt}</div>`;
      };
      h += `<div class="an-rows">${legRow('پای راست', r, pastR)}${legRow('پای چپ', l, pastL)}`;
      const bothDates = pastL.map(x => x.date).filter(dt => pastR.some(y => y.date === dt));
      if (gap != null && bothDates.length) {
        const at = dt => gapOf(pastL.find(x => x.date === dt).value, pastR.find(y => y.date === dt).value);
        const dg = gap - at(bothDates[0]);
        h += `<div>تفاوت دو پا نسبت به عدد شروع: <b>${signed(dg, 1)}</b> واحد درصد · ${Math.abs(dg) < c.gapReal ? 'در حد نوسان معمول' : dg < 0 ? 'تفاوت واقعاً کمتر شده' : 'تفاوت واقعاً بیشتر شده'}</div>`;
        const last = bothDates[bothDates.length - 1];
        const pl = pastL.find(x => x.date === last).value, pr = pastR.find(y => y.date === last).value;
        // A big difference that is smaller the next time is partly normal wobble (regression to the mean).
        if (gapOf(pl, pr) >= band && gap < gapOf(pl, pr)) h += `<div class="lead" style="margin:2px 0 0">تفاوت بزرگ آزمون قبلی حالا کمتر شده؛ بخشی از این کاهش نوسان معمول است. ببینید در آزمون بعدی هم کمتر می‌ماند یا نه.</div>`;
        if (gapOf(pl, pr) < band && gap < band && betterSide(pl, pr) && betterSide(l, r) && betterSide(pl, pr) !== betterSide(l, r)) {
          h += `<div class="lead" style="margin:2px 0 0">هنوز پای بهتر مشخصی دیده نمی‌شود.</div>`;
        }
      }
      h += `<div class="lead" style="margin:2px 0 0">تغییر واقعی فاصله: دست‌کم ${fa(c.distReal)}٪ · تغییر واقعی تفاوت دو پا: دست‌کم ${fa(c.gapReal)} واحد درصد</div></div>`;
    }
    h += `</div>`;

    h += `<div class="an"><div class="an-h">۲ · مقایسه با جدول مرجع</div><p class="lead" style="margin:0">برای این آزمون جدول مرجع منتشرشده‌ای برای بازیکنان تنیس وجود ندارد.</p></div>`;

    h += `<div class="an"><div class="an-h">۳ · مقایسه با گروه خودتان</div>`;
    const bandA = ageBand(ageYears(p));
    if (!bandA) h += NO_AGE;
    else if (l == null || r == null) h += `<p class="lead" style="margin:0">برای مقایسه با گروه، هر دو پا لازم است.</p>`;
    else {
      const label = groupName(p, bandA);
      const peers = PLAYERS.filter(x => x.id !== p.id && x.sex === p.sex && (ageBand(ageYears(x)) || {}).key === bandA.key)
        .map(x => ({ l: (latest(x, 'hopL') || {}).value, r: (latest(x, 'hopR') || {}).value }))
        .filter(o => o.l != null && o.r != null);
      const n = peers.length + 1;
      const mine = (l + r) / 2;
      if (n < 8) h += `<p class="lead" style="margin:0">گروه «${esc(label)}»: برای رتبه‌بندی دست‌کم ۸ بازیکن با نتیجه لازم است؛ الان ${fa(n)} نفر.</p>`;
      else h += `<p>میانگین دو پا در گروه «${esc(label)}»: رتبهٔ <b>${fa(1 + peers.filter(o => (o.l + o.r) / 2 > mine).length)}</b> از ${fa(n)}</p>`;
      if (gap != null) {
        // The gap against the group's quarters needs 10 or more players.
        const gaps = peers.map(o => gapOf(o.l, o.r)).concat([gap]).sort((a, b) => a - b);
        if (gaps.length < 10) h += `<p class="lead" style="margin:0">مقایسهٔ تفاوت دو پا با گروه از ۱۰ بازیکن به بالا نشان داده می‌شود؛ الان ${fa(gaps.length)} نفر.</p>`;
        else {
          const q = f => { const pos = (gaps.length - 1) * f, lo = Math.floor(pos), hi = Math.ceil(pos); return gaps[lo] + (gaps[hi] - gaps[lo]) * (pos - lo); };
          const p75 = q(0.75);
          h += `<p>تفاوت دو پا در گروه: میانه ${fmt(q(0.5), 1)}٪ · ربع بالایی از ${fmt(p75, 1)}٪</p>`;
          if (gap >= band && gap > p75) h += `<p class="lead" style="margin:0">این تفاوت از ۳ نفر از هر ۴ بازیکن گروه شما بزرگ‌تر است.</p>`;
        }
      }
    }
    h += `</div>`;
    return h;
  }

  // One result per test (or measure) per day: saving again on the same day replaces it.
  function saveResult() {
    const box = $('.calc'); if (!box || !box.dataset.results) return;
    const p = PLAYERS.find(x => x.id === RS.playerId); if (!p) return;
    const results = JSON.parse(box.dataset.results);
    const date = todayStr();
    let day = p.days.find(d => d.date === date);
    if (!day) { day = { date, label: 'روز آزمون', results: [] }; p.days.push(day); }
    const ids = results.map(r => r.test);
    day.results = (day.results || []).filter(r => ids.indexOf(r.test) === -1).concat(results);
    results.forEach(r => queue({ t: 'result', row: { player_id: p.id, test: r.test, day: date, account_id: ACC.userId,
      value: r.value, extra: extraOf(r), deleted_at: null } }));
    paintHistory();
    $('#save-msg').innerHTML = `<div class="ok">برای ${esc(p.name)} ذخیره شد${window.SAMPLE ? '، فقط در همین نمونه' : ''}.
      <a class="link-btn" href="#/players/${encodeURIComponent(p.id)}">صفحهٔ بازیکن</a></div>`;
  }

  /* ── Tools ─────────────────────────────────────────────────────────── */
  function viewTools() {
    const T = (C.tools && C.tools.tools) || [];
    let h = banner({ kicker: 'ابزارها', title: 'ابزارها', sub: 'تایمرها و ماشین‌حساب‌هایی که روز آزمون لازم دارید.' });
    h += `<div class="section">`;
    T.forEach(t => {
      h += t.soon ? soonRow(t.title, t.icon)
        : `<a class="card tap green" href="#/tools/${encodeURIComponent(t.id)}"><h3>${esc(t.icon || '')} ${esc(t.title)}</h3><p>${esc(t.text || '')}</p></a>`;
    });
    view().innerHTML = h + `</div>`;
  }

  /* Rest timer. Runs on timestamps, so it stays right when the screen locks or the
     coach opens another page; it beeps and vibrates at zero wherever the coach is. */
  const RT = { total: 60, left: 60, end: 0, running: false, tick: null, lock: null, audio: null };
  const RING = 2 * Math.PI * 85;
  const presetLabel = sec => sec < 60 ? fa(sec) + ' ثانیه' : (sec % 60 === 0 ? fa(sec / 60) + ' دقیقه' : mmss(sec));
  const rtLeft = () => RT.running ? Math.max(0, Math.ceil((RT.end - Date.now()) / 1000)) : RT.left;
  const onTimerPage = () => (location.hash || '').indexOf('#/tools/rest') === 0;

  function viewRest() {
    const tool = ((C.tools && C.tools.tools) || []).find(x => x.id === 'rest') || {};
    const presets = tool.presets || [45, 60, 120, 180];
    const left = rtLeft();
    const label = RT.running ? '❚❚ مکث' : left === 0 ? '↻ دوباره' : left < RT.total ? '▶ ادامه' : '▶ شروع';
    view().innerHTML = banner({ back: '#/tools', kicker: 'ابزار', title: '⏱️ تایمر استراحت', sub: esc(tool.text || '') }) +
      `<div class="section"><div class="card timer">
        <div class="chips presets">${presets.map(s => `<button class="chip ${RT.total === s ? 'on' : ''}" data-preset="${s}">${presetLabel(s)}</button>`).join('')}</div>
        <div class="ring"><svg viewBox="0 0 190 190"><circle class="track" cx="95" cy="95" r="85"/><circle class="prog" cx="95" cy="95" r="85" stroke-dasharray="${RING}" stroke-dashoffset="${RING * (1 - left / Math.max(RT.total, 1))}"/></svg><div class="time">${mmss(left)}</div></div>
        <div class="timer-actions">
          <button class="btn primary" data-rt="toggle">${label}</button>
          <div class="step-nav"><button class="btn ghost" data-rt="add15">+۱۵ ثانیه</button><button class="btn ghost" data-rt="reset">از اول</button></div>
        </div>
        <p class="lead" style="margin-top:12px">اگر به صفحهٔ دیگری بروید، تایمر ادامه می‌دهد. برای شنیدن بوق، صدای گوشی روشن باشد.</p>
      </div></div>`;
  }
  function rtPaint() {
    const left = rtLeft();
    const t = $('.timer .time'), c = $('.timer .prog');
    if (t) t.textContent = mmss(left);
    if (c) c.style.strokeDashoffset = String(RING * (1 - left / Math.max(RT.total, 1)));
    return left;
  }
  function stopRtTick() { if (RT.tick) { clearInterval(RT.tick); RT.tick = null; } }
  function rtTick() {
    const left = rtPaint();
    if (RT.running && left <= 0) {
      RT.running = false; RT.left = 0; stopRtTick(); keepAwake(false); beep();
      if (onTimerPage()) viewRest();
    }
  }
  function rtToggle() {
    unlockAudio();
    if (RT.running) { RT.left = rtLeft(); RT.running = false; stopRtTick(); keepAwake(false); }
    else {
      if (RT.left <= 0) RT.left = RT.total;
      RT.end = Date.now() + RT.left * 1000; RT.running = true;
      stopRtTick(); RT.tick = setInterval(rtTick, 250); keepAwake(true);
    }
    viewRest();
  }
  function rtReset() { RT.running = false; stopRtTick(); keepAwake(false); RT.left = RT.total; viewRest(); }
  function rtAdd15() { if (RT.running) RT.end += 15000; else RT.left += 15; RT.total += 15; rtPaint(); }
  function rtPreset(sec) { RT.running = false; stopRtTick(); keepAwake(false); RT.total = sec; RT.left = sec; viewRest(); }

  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) RT.lock = await navigator.wakeLock.request('screen');
      else if (!on && RT.lock) { await RT.lock.release(); RT.lock = null; }
    } catch (e) { /* not supported or refused: fine */ }
  }
  function beep() {
    try {
      const a = RT.audio || (RT.audio = new (window.AudioContext || window.webkitAudioContext)());
      [0, 0.28, 0.56].forEach(t => {
        const o = a.createOscillator(), gn = a.createGain();
        o.frequency.value = 880; o.connect(gn); gn.connect(a.destination);
        gn.gain.setValueAtTime(0.0001, a.currentTime + t);
        gn.gain.exponentialRampToValueAtTime(0.35, a.currentTime + t + 0.02);
        gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t + 0.18);
        o.start(a.currentTime + t); o.stop(a.currentTime + t + 0.2);
      });
    } catch (e) { /* no audio: fine */ }
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  /* Estimated 1RM tool: the same estimator and trust grades as the strength Record pages, for
     any set, with no player and nothing saved. */
  const E1RM_LEAD = `<div class="lead" style="margin-top:10px">وزنه، تکرار و RPE را وارد کنید.</div>`;
  function viewE1rm() {
    const tool = ((C.tools && C.tools.tools) || []).find(x => x.id === 'e1rm') || {};
    const inp = (id, label) => `<div class="field"><label for="${id}">${label}</label><input class="input num-in" id="${id}" inputmode="decimal" autocomplete="off" placeholder="—"></div>`;
    view().innerHTML = banner({ back: '#/tools', kicker: 'ابزار', title: '🏋️ ' + esc(tool.title || ''), sub: esc(tool.text || '') }) +
      `<div class="section"><div class="card e1rm">
        <div class="calc-grid">${inp('ek', 'وزنه (کیلوگرم)')}${inp('er', 'تکرار')}
          <div class="field"><label for="ee">RPE</label><select class="input num-in" id="ee"><option value="">—</option>${RPES.map(v => `<option value="${v}">${fmt(v, v % 1 ? 1 : 0)}</option>`).join('')}</select></div></div>
        <div id="e-out">${E1RM_LEAD}</div>
      </div>
      <div class="card"><h3>این عدد چطور حساب می‌شود</h3>
        <p>RPE یعنی چند تکرار خوب دیگر مانده بود؛ RPE ۸ یعنی ۲ تکرار. اپ این تکرارها را به تکرارهای انجام‌شده اضافه می‌کند و با فرمول اپلی حداکثر یک‌تکرار را تخمین می‌زند.</p>
        <p>ست سنگین و نزدیک حد توان عدد بهتری می‌دهد: ۳ تکرار با RPE ۹ خیلی بهتر از ۱۰ تکرار با RPE ۷ است، چون وقتی یکی دو تکرار مانده آن را حس می‌کنید، ولی وقتی پنج تکرار مانده حدس می‌زنید.</p>
        <ul class="list"><li>دقیق: ۳ تکرار مؤثر یا کمتر.</li><li>خوب: ۴ تا ۶؛ به جهت تغییر می‌شود اعتماد کرد.</li><li>تقریبی: ۷ تا ۱۰؛ فقط راهنمای کلی.</li><li>بیشتر از ۱۰: عددی داده نمی‌شود.</li></ul>
        <div class="callout">این عدد وزنهٔ تمرین نیست. درصدی از آن را حساب نکنید و روی هالتر نگذارید.</div>
      </div></div>`;
  }
  function paintE1rm() {
    const out = $('#e-out'); if (!out) return;
    const kg = parseNum($('#ek').value), reps = parseNum($('#er').value), rpe = parseNum($('#ee').value);
    if ([kg, reps, rpe].some(v => Number.isNaN(v))) { out.innerHTML = WARN_DIGITS; return; }
    if (kg == null || reps == null || rpe == null) { out.innerHTML = E1RM_LEAD; return; }
    const r = Math.round(reps), s = { kg, reps: r, rpe, eff: r + Math.max(0, 10 - rpe), est: estimateOneRM(kg, r, rpe) };
    out.innerHTML = setBlock({ load: 'bar' }, s, null, null, '').html;
  }

  const unlockAudio = () => { try { if (!RT.audio) RT.audio = new (window.AudioContext || window.webkitAudioContext)(); if (RT.audio.state === 'suspended') RT.audio.resume(); } catch (e) { /* fine */ } };

  /* ── Players ───────────────────────────────────────────────────────── */
  const SEX = { f: 'دختر / زن', m: 'پسر / مرد' };
  const HAND = { r: 'راست‌دست', l: 'چپ‌دست' };
  const NEW = { sex: null, hand: null };
  const bornText = p => 'متولد ' + (MONTHS[(p.birthMonth || 0) - 1] || '') + ' ' + fa(p.birthYear);

  // Signed in: the account, whether everything has reached the server, and sign-out.
  const acctBar = () => {
    if (window.SAMPLE) return `<div class="card clay"><p>در این نسخهٔ نمونه چیزی ذخیره نمی‌شود. با تازه کردن صفحه، تغییرها پاک می‌شوند.</p></div>`;
    setTimeout(paintSync, 0);
    return `<div class="card acct"><span class="who">حساب: <b dir="ltr">${esc(ACC.username)}</b></span>
      <span class="sync-state" id="sync-state"></span><button class="btn ghost" data-signout style="width:auto;padding:8px 14px">خروج</button></div>`;
  };

  function viewPlayers() {
    let h = banner({ kicker: 'بازیکنان', title: 'بازیکنان', sub: 'بازیکن‌ها، نتیجه‌ها و یادداشت‌ها.' });
    h += `<div class="section">
      ${acctBar()}
      <a class="btn primary" href="#/players/new">+ افزودن بازیکن</a><div style="height:12px"></div>`;
    if (!PLAYERS.length) h += `<div class="empty">هنوز بازیکنی اضافه نشده.</div>`;
    PLAYERS.forEach(p => {
      const band = ageBand(ageYears(p));
      const bits = [bornText(p), band ? band.label : '', SEX[p.sex] || '', HAND[p.hand] || ''];
      h += `<a class="list-row" href="#/players/${encodeURIComponent(p.id)}"><span class="avatar">${esc(p.name.trim().charAt(0))}</span>
        <span class="lr-body"><span class="lr-title">${esc(p.name)}</span><br><span class="lr-sub">${bits.filter(Boolean).join(' · ')}</span></span><span class="lr-go">←</span></a>`;
    });
    view().innerHTML = h + `</div>`;
  }

  function viewAddPlayer() {
    NEW.sex = null; NEW.hand = null;
    view().innerHTML = banner({ back: '#/players', kicker: 'بازیکنان', title: 'افزودن بازیکن' }) + `<div class="section"><div class="card">
      <div class="field"><label for="pn">نام</label><input class="input" id="pn" autocomplete="off" maxlength="60"></div>
      <div class="calc-grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1fr)">
        <div class="field"><label for="py">سال تولد (شمسی)</label><input class="input" id="py" inputmode="numeric" autocomplete="off" placeholder="مثلاً ۱۳۸۸"></div>
        <div class="field"><label for="pm">ماه تولد</label><select class="input" id="pm"><option value="">انتخاب ماه…</option>${MONTHS.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('')}</select></div>
      </div>
      <div class="setup-row"><div class="lbl">جنس</div><div class="seg" data-group="sex"><button data-v="f">${SEX.f}</button><button data-v="m">${SEX.m}</button></div></div>
      <div class="setup-row"><div class="lbl">دست بازی</div><div class="seg" data-group="hand"><button data-v="r">${HAND.r}</button><button data-v="l">${HAND.l}</button></div></div>
      <div class="field"><label for="pq">گروه · اختیاری</label><input class="input" id="pq" autocomplete="off" maxlength="40" placeholder="مثلاً دختران ۱۶ تا ۱۸"></div>
      <div id="pmsg"></div>
      <div style="height:8px"></div>
      <button class="btn primary" data-add-player>افزودن</button>
    </div></div>`;
  }

  function addPlayer() {
    const name = ($('#pn').value || '').trim();
    const by = parseNum($('#py').value);
    const bm = +($('#pm').value || 0);
    const msg = [];
    if (!name) msg.push('نام را بنویسید.');
    if (by == null || Number.isNaN(by) || by < 1300 || by > 1410) msg.push('سال تولد را شمسی و ۴ رقمی بنویسید، مثلاً ۱۳۸۸.');
    if (!(bm >= 1 && bm <= 12)) msg.push('ماه تولد را انتخاب کنید.');
    if (!NEW.sex) msg.push('جنس را انتخاب کنید.');
    if (!NEW.hand) msg.push('دست بازی را انتخاب کنید.');
    if (msg.length) { $('#pmsg').innerHTML = `<div class="warn">${msg.map(esc).join('<br>')}</div>`; return; }
    const p = { id: window.SAMPLE ? 'n' + (nextId++) : uuid(), name, birthYear: Math.round(by), birthMonth: bm, sex: NEW.sex, hand: NEW.hand, squad: ($('#pq').value || '').trim(), days: [], notes: [] };
    PLAYERS.push(p);
    queue({ t: 'player', row: { id: p.id, account_id: ACC.userId, name: p.name, birth_year: p.birthYear, birth_month: p.birthMonth,
      sex: p.sex, hand: p.hand, squad: p.squad || null, created_at: new Date().toISOString(), deleted_at: null } });
    location.hash = '#/players/' + p.id;
  }

  function viewPlayer(id) {
    const p = PLAYERS.find(x => x.id === id);
    if (!p) { view().innerHTML = banner({ back: '#/players', title: 'این بازیکن پیدا نشد' }); return; }
    const band = ageBand(ageYears(p));
    const meta = [pill(bornText(p), 'light'), band ? pill(band.label, 'light') : '', pill(SEX[p.sex] || '', 'light'), pill(HAND[p.hand] || '', 'light')]
      .concat(p.squad ? [pill(esc(p.squad), 'light')] : []).join('');
    let h = banner({ back: '#/players', kicker: 'بازیکن', title: esc(p.name), meta });
    h += `<div class="section"><div class="h2">روزهای آزمون</div>`;
    if (!p.days.length) h += `<div class="empty">هنوز نتیجه‌ای نیست. نتیجه را از بخش «ثبت نتیجه» هر آزمون برای این بازیکن ذخیره کنید.</div>`;
    p.days.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)).forEach(d => {
      const rows = (d.results || []).map(r => {
        const m = measureInfo(r.test);
        return `<a class="res-row" href="#/tests/${encodeURIComponent(m.page)}/record"><span>${esc(m.title)}</span><b>${fmt(r.value, m.decimals)} <em>${esc(m.unit)}</em></b></a>`;
      }).join('');
      h += `<div class="card"><div class="day-head"><b>${esc(d.label || '')}</b><span>${fa(esc(d.date || ''))}</span></div>${rows}
        ${d.note ? `<div class="note">${esc(d.note)}</div>` : ''}</div>`;
    });
    h += `<div class="h2">یادداشت‌ها</div><div class="card">`;
    h += p.notes.length ? p.notes.map(n => `<div class="cue">${esc(n.body)}</div>`).join('') : `<div class="lead" style="margin:0">یادداشتی نیست.</div>`;
    h += `<div class="note-add"><input class="input" id="note-in" maxlength="300" placeholder="یادداشت تازه…"><button class="btn ghost" data-add-note="${esc(p.id)}">افزودن</button></div></div>`;
    view().innerHTML = h + `</div>`;
    RS.playerId = p.id;   // opening a test from this page keeps this player picked
  }

  /* ── Router + events ───────────────────────────────────────────────── */
  /* ── Account and saving (Supabase) ─────────────────────────────────── */
  // Signed in (everything except ?sample=1): content comes from assess_content, and players,
  // results and notes save to the account. One login is shared by an academy's coaches, often on
  // several phones and often with no signal, so every change is applied on the phone first, kept
  // in an outbox in localStorage, and sent in order when there is a connection. A result is keyed
  // on player + test + day, so a resend or a second phone can never duplicate it; the last save
  // wins, which is the app's rule anyway. Nothing is ever dropped from the outbox unsent.
  const SB_URL = 'https://bvipfipbdcyqnbczjmaq.supabase.co';
  const SB_KEY = 'sb_publishable_BuDVTTC1E0eg3wc7F1Pcig_1A_tqYCy';   // public key, same as program.html
  const LOGIN_DOMAIN = 'amirardekani.com', LOGIN_PREFIX = 'assess.';
  const CONTENT_KEYS = ['start', 'tests', 'norms', 'tools'];
  const TABLE = { player: 'assess_players', result: 'assess_results', note: 'assess_notes' };
  const NO_ACCESS = 'این حساب به اپ آزمون دسترسی ندارد. اگر فکر می‌کنید اشتباه شده، به امیر پیام بدهید.';
  const NO_NET = 'الان ورود ممکن نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.';
  const ACC = { userId: '', username: '', outbox: [], failed: false, flushing: false };
  let sbClient = null;

  const withTimeout = (p, ms) => Promise.race([p, new Promise(res => setTimeout(() => res(null), ms))]);
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full or blocked: memory still works */ } };
  const accKey = s => 'assess.' + ACC.userId + '.' + s;
  const uuid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16); });
  const errorCard = (h, p) => `<div class="section"><div class="card clay"><h3>${h}</h3><p class="lead">${p}</p></div></div>`;

  // The Supabase library loads with defer; wait up to ~3 s for it. Its own storage key keeps this
  // app's session apart from program.html's and coach.html's on the same website.
  // ?stub=1 (local testing only) swaps in _dev/stub-supabase.js, a fake backend in localStorage.
  const sbLib = () => (window.STUB_SUPABASE && new URLSearchParams(location.search).get('stub') === '1') ? window.STUB_SUPABASE : window.supabase;
  async function sbReady() {
    for (let i = 0; i < 120 && !(sbLib() && sbLib().createClient); i++) await new Promise(r => setTimeout(r, 25));
    const lib = sbLib();
    if (!lib || !lib.createClient) return null;
    if (!sbClient) sbClient = lib.createClient(SB_URL, SB_KEY, { auth: { storageKey: 'assess-auth', persistSession: true, autoRefreshToken: true } });
    return sbClient;
  }

  // program.html's sign-in, in Farsi: password-manager auto-submit, reveal toggle, remembered username.
  function showSignIn(message) {
    $('#signin-screen').classList.add('visible');
    const form = $('#signin-form'), errBox = $('#si-err'), btn = $('#si-go'), userEl = $('#si-user'), passEl = $('#si-pass'), eye = $('#si-eye');
    if (message) { errBox.textContent = message; errBox.hidden = false; }
    // When the phone has filled both fields, submit for them; once only, and never after a refusal.
    let autoDone = !!message;
    const stopAuto = () => { autoDone = true; clearInterval(poll); };
    const poll = setInterval(() => {
      if (autoDone || !(userEl.value.trim() && passEl.value)) return;
      stopAuto();
      btn.textContent = 'در حال ورود…';
      if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }, 250);
    setTimeout(stopAuto, 6000);
    ['keydown', 'paste'].forEach(ev => { userEl.addEventListener(ev, stopAuto, { once: true }); passEl.addEventListener(ev, stopAuto, { once: true }); });
    if (window.LAST_USER && !userEl.value) userEl.value = window.LAST_USER;
    const setReveal = show => {
      passEl.type = show ? 'text' : 'password';
      eye.classList.toggle('on', show);
      eye.setAttribute('aria-pressed', show ? 'true' : 'false');
      eye.setAttribute('aria-label', show ? 'پنهان کردن رمز' : 'نمایش رمز');
    };
    eye.onclick = e => { e.preventDefault(); setReveal(passEl.type === 'password'); stopAuto(); try { passEl.focus(); } catch (err) { /* a nicety */ } };
    form.onsubmit = async e => {
      e.preventDefault();
      setReveal(false);   // a password field must be in the form when it submits, or the save prompt won't come
      const user = (userEl.value || '').trim().toLowerCase(), pass = passEl.value || '';
      if (!user || !pass) return;
      errBox.hidden = true; btn.disabled = true; btn.textContent = 'در حال ورود…';
      try {
        const sb = await sbReady();
        if (!sb) throw new Error('offline');
        const { error } = await sb.auth.signInWithPassword({ email: LOGIN_PREFIX + user + '@' + LOGIN_DOMAIN, password: pass });
        if (error) throw error;
        try { localStorage.setItem('assess_last_user', user); } catch (err) { /* storage blocked */ }
        try {
          if (window.PasswordCredential && navigator.credentials && navigator.credentials.store)
            await withTimeout(navigator.credentials.store(new PasswordCredential({ id: user, password: pass })), 1200);
        } catch (err) { /* unsupported or refused: carry on */ }
        btn.textContent = 'وارد شدید';
        setTimeout(() => location.replace(location.pathname + location.search), 400);
      } catch (err) {
        const m = (err && err.message) || '';
        errBox.textContent = /banned/i.test(m) ? NO_ACCESS
          : /invalid|credentials/i.test(m) ? 'نام کاربری یا رمز درست نیست. پیامی را که امیر فرستاده بررسی کنید.' : NO_NET;
        errBox.hidden = false; btn.disabled = false; btn.textContent = 'ورود';
      }
    };
  }

  async function signOut() {
    if (ACC.outbox.length && !confirm(fa(ACC.outbox.length) + ' تغییر هنوز به سرور نرسیده است. روی همین گوشی می‌ماند و بعد از ورود دوباره با همین حساب فرستاده می‌شود. خارج می‌شوید؟')) return;
    try { const sb = await sbReady(); if (sb) await withTimeout(sb.auth.signOut(), 4000); } catch (e) { /* signing out locally is enough */ }
    try { localStorage.removeItem('assess-auth'); } catch (e) { /* blocked */ }
    location.replace(location.pathname + location.search);
  }

  async function bootCloud() {
    if (window.NEEDS_SIGNIN) { showSignIn(); return; }
    const sb = await sbReady();
    const got = sb ? await withTimeout(sb.auth.getSession(), 8000) : null;
    const session = got && got.data && got.data.session;
    if (!session) { showSignIn(sb ? '' : NO_NET); return; }
    ACC.userId = session.user.id;
    ACC.outbox = lsGet(accKey('outbox')) || [];
    // Access is checked online on every open. With no connection, the copy on this phone is used.
    const acct = await withTimeout(sb.from('assess_accounts').select('username, revoked_at').eq('user_id', ACC.userId).maybeSingle(), 8000);
    if (acct && !acct.error) {
      if (!acct.data || acct.data.revoked_at) {
        await withTimeout(sb.auth.signOut(), 4000);
        try { localStorage.removeItem('assess-auth'); } catch (e) { /* blocked */ }
        showSignIn(NO_ACCESS);
        return;
      }
      ACC.username = acct.data.username;
      lsSet(accKey('account'), { username: ACC.username });
    } else {
      const cached = lsGet(accKey('account'));
      if (!cached) { showSignIn(NO_NET); return; }
      ACC.username = cached.username;
    }
    const res = await withTimeout(sb.from('assess_content').select('key, body, version'), 20000);
    let docs = res && !res.error && res.data && res.data.length ? res.data : null;
    if (docs) lsSet(accKey('content'), docs); else docs = lsGet(accKey('content'));
    if (!docs) { view().innerHTML = errorCard('محتوا بارگذاری نشد', 'برای بار اول، اپ به اینترنت نیاز دارد. اتصال را بررسی کنید و صفحه را دوباره باز کنید.'); return; }
    docs.forEach(d => { if (CONTENT_KEYS.indexOf(d.key) !== -1) C[d.key] = d.body; });
    await pullData(sb);
    route();
    flush();
    setInterval(() => { if (ACC.outbox.length) flush(); }, 30000);
  }

  // Every row of one table for this account, a page of 1000 at a time, in a stable order.
  async function fetchAll(sb, name) {
    const out = [];
    for (let from = 0; ; from += 1000) {
      let q = sb.from(name).select('*').is('deleted_at', null);
      q = name === 'assess_results' ? q.order('player_id').order('test').order('day') : q.order('id');
      const res = await withTimeout(q.range(from, from + 999), 20000);
      if (!res || res.error) return null;
      out.push.apply(out, res.data);
      if (res.data.length < 1000) return out;
    }
  }
  // Server rows, with the unsent outbox laid over them, become the app's player objects.
  async function pullData(sb) {
    const got = await Promise.all(['assess_players', 'assess_results', 'assess_notes'].map(n => fetchAll(sb, n)));
    let rows;
    if (got.every(Boolean)) { rows = { players: got[0], results: got[1], notes: got[2] }; lsSet(accKey('rows'), rows); }
    else rows = lsGet(accKey('rows')) || { players: [], results: [], notes: [] };
    ACC.outbox.forEach(op => applyOp(rows, op));
    PLAYERS = rowsToPlayers(rows);
  }
  function applyOp(rows, op) {
    const same = op.t === 'result'
      ? r => r.player_id === op.row.player_id && r.test === op.row.test && r.day === op.row.day
      : r => r.id === op.row.id;
    const list = rows[op.t + 's'] || [];
    rows[op.t + 's'] = list.filter(r => !same(r)).concat([op.row]);
  }
  function rowsToPlayers(rows) {
    const byTime = (a, b) => ((a.created_at || '') < (b.created_at || '') ? -1 : 1);
    const byId = {};
    rows.players.slice().sort(byTime).forEach(r => {
      byId[r.id] = { id: r.id, name: r.name, birthYear: r.birth_year, birthMonth: r.birth_month, sex: r.sex, hand: r.hand, squad: r.squad || '', days: [], notes: [] };
    });
    rows.results.forEach(r => {
      const p = byId[r.player_id]; if (!p) return;
      let d = p.days.find(x => x.date === r.day);
      if (!d) { d = { date: r.day, label: 'روز آزمون', results: [] }; p.days.push(d); }
      d.results.push(Object.assign({}, r.extra || {}, { test: r.test, value: Number(r.value) }));
    });
    rows.notes.slice().sort(byTime).forEach(n => { const p = byId[n.player_id]; if (p) p.notes.push({ id: n.id, body: n.body }); });
    return Object.keys(byId).map(k => byId[k]);
  }

  // Apply on the phone first, then send. The sample saves nothing.
  function queue(op) {
    if (window.SAMPLE) return;
    ACC.outbox.push(op);
    lsSet(accKey('outbox'), ACC.outbox);
    const rows = lsGet(accKey('rows')) || { players: [], results: [], notes: [] };
    applyOp(rows, op);
    lsSet(accKey('rows'), rows);
    flush();
  }
  async function flush() {
    if (window.SAMPLE || ACC.flushing || !ACC.outbox.length) { paintSync(); return; }
    ACC.flushing = true; paintSync();
    try {
      const sb = await sbReady();
      while (sb && ACC.outbox.length) {
        const op = ACC.outbox[0];
        const res = await withTimeout(sb.from(TABLE[op.t]).upsert(op.row, { onConflict: op.t === 'result' ? 'player_id,test,day' : 'id' }), 20000);
        if (!res || res.error) {
          // No answer is a connection problem; an error from the server is kept too, and shown.
          ACC.failed = !!(res && res.error && !/fetch|network|timeout/i.test(res.error.message || ''));
          if (res && res.error) console.warn('assess sync:', res.error.message);
          break;
        }
        ACC.outbox.shift();
        lsSet(accKey('outbox'), ACC.outbox);
        ACC.failed = false;
      }
    } finally { ACC.flushing = false; paintSync(); }
  }
  function paintSync() {
    const el = document.getElementById('sync-state');
    if (!el) return;
    const n = ACC.outbox.length;
    const st = !n ? '' : ACC.flushing ? 'pending' : ACC.failed ? 'error' : 'pending';
    el.className = 'sync-state' + (st ? ' ' + st : '');
    el.textContent = !n ? 'همه چیز ذخیره شده' : ACC.flushing ? 'در حال ذخیره…'
      : ACC.failed ? fa(n) + ' تغییر ذخیره نشد؛ دوباره تلاش می‌شود' : fa(n) + ' تغییر در انتظار اینترنت';
  }
  const extraOf = r => { const x = Object.assign({}, r); delete x.test; delete x.value; return Object.keys(x).length ? x : null; };

  function setTab(tab) {
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  }
  function route() {
    let parts;
    try { parts = (location.hash || '#/start').replace(/^#\/?/, '').split('/').map(decodeURIComponent); }
    catch (e) { parts = ['start']; }
    const [tab, a, b] = parts;
    const t = ['start', 'tests', 'tools', 'players'].includes(tab) ? tab : 'start';
    setTab(t);
    window.scrollTo(0, 0);
    switch (t) {
      case 'tests': return a ? viewTest(a) : viewTests();
      case 'tools': return a === 'rest' ? viewRest() : a === 'e1rm' ? viewE1rm() : viewTools();
      case 'players': return a === 'new' ? viewAddPlayer() : a ? viewPlayer(a) : viewPlayers();
      default: return a === 'chapter' && b ? viewChapter(b) : viewStart();
    }
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const accHead = t.closest('.acc-head');
    if (accHead) { const box = accHead.parentElement; box.classList.toggle('open'); accHead.setAttribute('aria-expanded', box.classList.contains('open')); return; }
    const back = t.closest('[data-back]');
    if (back) { if (window.history.length > 1) window.history.back(); else location.hash = back.dataset.back; return; }
    const pr = t.closest('[data-preset]');
    if (pr) { rtPreset(+pr.dataset.preset); return; }
    const rt = t.closest('[data-rt]');
    if (rt) { const act = rt.dataset.rt; if (act === 'toggle') rtToggle(); else if (act === 'reset') rtReset(); else if (act === 'add15') rtAdd15(); return; }
    if (t.closest('[data-save-result]')) { saveResult(); return; }
    if (t.closest('[data-signout]')) { signOut(); return; }
    const seg = t.closest('.seg[data-group] button');
    if (seg) {
      NEW[seg.parentElement.dataset.group] = seg.dataset.v;
      seg.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === seg));
      return;
    }
    if (t.closest('[data-add-player]')) { addPlayer(); return; }
    const an = t.closest('[data-add-note]');
    if (an) {
      const p = PLAYERS.find(x => x.id === an.dataset.addNote);
      const v = ($('#note-in').value || '').trim();
      if (p && v) {
        const n = { id: window.SAMPLE ? 'sn' + (nextId++) : uuid(), body: v };
        p.notes.push(n);
        queue({ t: 'note', row: { id: n.id, player_id: p.id, account_id: ACC.userId, body: v, created_at: new Date().toISOString(), deleted_at: null } });
        viewPlayer(p.id);
      }
    }
  });
  document.addEventListener('input', e => {
    if (e.target.classList && e.target.classList.contains('num-in')) { if ($('.e1rm')) paintE1rm(); else recalc(); }
  });
  document.addEventListener('change', e => {
    if (e.target.id === 'rec-player') { RS.playerId = e.target.value; paintHistory(); recalc(); }
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && RT.running) { keepAwake(true); rtTick(); } });
  window.addEventListener('hashchange', route);
  window.addEventListener('online', () => { if (!window.SAMPLE && ACC.userId) flush(); });
  document.addEventListener('visibilitychange', async () => {
    if (window.SAMPLE || !ACC.userId || document.visibilityState !== 'visible') return;
    await flush();
    // Other coaches may have saved on their own phones: refresh the player pages, never a form in progress.
    if (!ACC.outbox.length && /^#\/players(\/(?!new)[^/]+)?$/.test(location.hash || '')) {
      const sb = await sbReady();
      if (sb) { await pullData(sb); route(); }
    }
  });

  if (!window.SAMPLE) bootCloud().catch(err => { view().innerHTML = errorCard('اپ باز نشد', `<span dir="ltr">${esc(err && err.message)}</span>`); });
  else loadContent().then(() => {
    // The sample file keeps notes as plain strings; the app keeps them as { id, body }.
    PLAYERS = JSON.parse(JSON.stringify((C.sample && C.sample.players) || []))
      .map(p => Object.assign(p, { notes: (p.notes || []).map((b, i) => ({ id: p.id + '-n' + i, body: b })) }));
    route();
  }).catch(err => {
    view().innerHTML = `<div class="section"><div class="card clay"><h3>محتوا بارگذاری نشد</h3><p class="lead" dir="ltr">${esc(err.message)}</p></div></div>`;
  });
})();
