/* The athlete app in Farsi (Amir, 2026-11-20: "most of my customers want farsi version and wont read the details and
   instructions in english"; "the name of the exercises will be in english").

   HOW IT WORKS. program.html is written in English and stays that way: nothing in its 28,000 lines is wrapped. This
   file, loaded in the <head> before anything is drawn, watches the page (a MutationObserver on the whole document) and,
   in Farsi, swaps every piece of English it has a translation for, in text and in placeholder / aria-label / title /
   alt, the moment the app draws it. The words are in /assets/js/i18n-fa.js (AAI18N.addFa), written once per string;
   anything with no translation stays English, so a screen is never blank. Exercise names never match a translation and
   the elements that hold them are skipped (SKIP), so they stay English, as Amir asked.

   WHY NOT WRAP EVERY STRING. ~3,500 strings in one 2 MB file, many of them in the twins (docs/rules/program-app.md →
   Things that exist more than once). Wrapping them all would touch every screen and every rule; this touches none,
   and English is exactly as it was (in English this file only sets the language and returns).

   THE CHOICES (Amir, 2026-11-20, "use your picks"): Shamsi dates; Persian digits (۱۲) in sentences, while a training
   number standing alone (a weight, reps, RPE, a clock) stays Latin, as the athlete types it; Settings → Language,
   stored on this phone (aa_lang, no athlete prefix, so _snapshot() never syncs it) and on the programme (set_my_lang()).
   The switch is for everyone since 2026-11-20 (REVEALED; Amir: "Yes, show it"): a phone with no choice of its own follows
   the programme's athlete.lang (the intake form's App Language, or the athlete's own pick). ?fa=0 clears this phone's choice.

   A change here ships with a ?v= bump on its <script> in program.html, the same URL in sw.js's SHELL and a CACHE bump.
   A change of words is a ?v= bump on data-fa (the dictionary's URL) and the same three. */
(function () {
  'use strict';
  var REVEALED = true;                        // the switch is for everyone, and athlete.lang picks the default (Amir, 2026-11-20: "Yes, show it")
  var LS = 'aa_lang', BETA = 'aa_lang_beta';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }

  var me = document.currentScript;
  var DICT_URL = (me && me.getAttribute('data-fa')) || '/assets/js/i18n-fa.js';
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('fa') === '1') put(BETA, '1');
    if (q.get('fa') === '0') { put(BETA, null); put(LS, null); }
  } catch (e) {}
  var beta = REVEALED || get(BETA) === '1';
  var chosen = get(LS);
  // No choice yet: the programme this phone last loaded says (plancache, the one saved plan: { id, at, data }).
  function athleteLang() {
    try { var c = JSON.parse(get('plancache') || 'null'); return String(((c && c.data && c.data.athlete) || {}).lang || '').toLowerCase(); }
    catch (e) { return ''; }
  }
  var lang = 'en';
  if (beta) lang = chosen === 'fa' ? 'fa' : chosen === 'en' ? 'en' : (REVEALED && athleteLang() === 'fa' ? 'fa' : 'en');

  var A = window.AAI18N = {
    lang: lang, fa: lang === 'fa', beta: beta, revealed: REVEALED,
    exact: {}, patterns: [], missing: new Set(),
    // The app's own door: Settings → Language. A reload, so nothing is left half in one language.
    setLang: function (l) { put(LS, l === 'fa' ? 'fa' : 'en'); location.reload(); },
    // Boot calls this with the programme's athlete.lang (savePlanCopy()'s two callers). Only once the switch is for
    // everyone, only on a phone that never chose, and only once. `reload` only where nothing can be under way (the first
    // open with no saved plan); otherwise the athlete's language waits for the next open.
    adopt: function (l, reload) {
      // Never the demo or the coach's preview: they are not this phone's athlete, and Amir's own phone keeps its language.
      if (!REVEALED || get(LS) || window.IS_DEMO || window.IS_PREVIEW) return;
      var want = String(l || '').toLowerCase() === 'fa' ? 'fa' : 'en';
      put(LS, want);
      if (reload && want !== lang) location.reload();
    },
    t: function (s) { return s; },
    addFa: function () {},
    names: {}, nameOf: function (s) { return s; }, addNames: function () {},   // the real ones are set in Farsi only (section 3)
    skip: '',
  };
  if (!A.fa) return;

  // ── 1. The page: right to left, Farsi letters in Vazirmatn ─────────────────────────────────────────────────────────
  var html = document.documentElement;
  html.lang = 'fa'; html.dir = 'rtl'; html.classList.add('is-fa');
  // Each family the app uses gets Vazirmatn for the Arabic-script range only (unicode-range), so Latin text and every
  // number keep their own face and Farsi letters never fall to a system font. Letter-spacing breaks Farsi's joined
  // letters, so it is off in Farsi.
  var V = "url('/assets/fonts/Vazirmatn-Variable.woff2') format('woff2')";
  var R = 'U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200F, U+2066-2069, U+FB50-FDFF, U+FE70-FEFF';
  // One face per weight, not one 100-900 range: the browser picks a family's faces by weight FIRST, so a range face lost to
  // Space Mono's own 400 face and was never loaded (the loading line drew its Farsi in a system monospace, letters apart).
  // Space Mono's own space is a monospace cell, 0.6em: between Farsi words it opened gaps ("صبح   بخیر"), so in Farsi its
  // spaces come from Vazirmatn too (this sheet is declared after app-fonts.css, so it wins the overlap).
  var css = ['Barlow', 'Barlow Condensed', 'AA Barlow Condensed', 'Space Mono', 'Vazirmatn'].map(function (f) {
    var out = '', rr = f === 'Space Mono' ? R + ', U+0020, U+00A0' : R;
    for (var w = 100; w <= 900; w += 100) {
      out += "@font-face{font-family:'" + f + "';src:" + V + ';font-weight:' + w + ';font-style:normal;font-display:swap;unicode-range:' + rr + '}';
    }
    return out;
  }).join('') +
    'html.is-fa,html.is-fa body{font-family:Barlow,Vazirmatn,Tahoma,sans-serif}' +
    'html.is-fa *{letter-spacing:0!important}' +
    // An exercise name, and anything else marked as Latin, reads left to right inside the Farsi line.
    'html.is-fa .i18n-ltr,html.is-fa [translate="no"]{unicode-bidi:isolate}' +
    // A chevron drawn as a picture (a CSS mask, an <svg>) is not mirrored by the browser as a text ‹ › is: forward points
    // left. --chev is the app's one mask chevron; svg.chev is the Note row's and the cues' (their open state rotates it).
    "html.is-fa{--chev:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'%3E%3Cpath d='M7 1L3 5 7 9' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")}" +
    'html.is-fa svg.chev{transform:scaleX(-1)}' +
    // A box marked dir="auto" takes its direction from what is typed: empty, it drew its Farsi placeholder left to right,
    // the words in reverse order. Empty, it is right to left; typed text still finds its own direction.
    'html.is-fa textarea:placeholder-shown,html.is-fa input[dir="auto"]:placeholder-shown{direction:rtl}' +
    // <q> drew English quotes, which read backwards in a right-to-left line: Farsi's own guillemets.
    "html.is-fa q{quotes:'\\00AB' '\\00BB' '\\2039' '\\203A'}" +
    // An article's drop cap cut the first Farsi letter off its word ("پ" apart from "یشتر"): Farsi letters join, so no drop cap.
    'html.is-fa #ar-body .ar-p.ar-lead::first-letter{float:none;font:inherit;color:inherit;margin:0;line-height:inherit}' +
    // The video frame's corner word is CSS content, which the word lists never see.
    "html.is-fa .ex-video::after{content:'\\0648\\06CC\\062F\\06CC\\0648'}" +
    // A person's name takes its direction from its own first letter: "Mina S." keeps its full stop after the S.
    'html.is-fa .cr-nm,html.is-fa .cr-nb{unicode-bidi:plaintext}' +
    // The check-in's answers: the box has 2 px each side, and Farsi words are wider ("خیلی پراسترس", "آماده نیستم" sat 2 px
    // from the edge). 6 px each side, so a two-word answer breaks onto its second line as the design allows (two lines at 11 px).
    'html.is-fa .readiness-opt{padding-left:6px;padding-right:6px}html.is-fa .readiness-opt-lab{max-width:100%}';
  var st = document.createElement('style'); st.id = 'i18n-fa-css'; st.textContent = css;
  (document.head || html).appendChild(st);

  // ── 1b. The layout, mirrored ─────────────────────────────────────────────────────────────────────────────────────────
  // dir="rtl" already turns flex rows, grids and text around. What it cannot turn is CSS written in left and right
  // (margin-left, left: 12px, text-align: left, a border on one side, one rounded corner): the app has hundreds. So in
  // Farsi each such rule is swapped IN PLACE in the page's own style sheets, the way rtlcss rewrites a file: the rule
  // that said margin-left: 12px now says margin-right: 12px, so the cascade between rules is exactly what it was.
  // Each sheet is mirrored once (MIRRORED); doing one twice would undo it. Transforms and inline style="" are not touched.
  var MIRRORED = new WeakSet();
  var PAIRS = [['margin-left', 'margin-right'], ['padding-left', 'padding-right'], ['left', 'right'],
    ['border-left-width', 'border-right-width'], ['border-left-style', 'border-right-style'], ['border-left-color', 'border-right-color'],
    ['border-top-left-radius', 'border-top-right-radius'], ['border-bottom-left-radius', 'border-bottom-right-radius'],
    ['scroll-margin-left', 'scroll-margin-right'], ['scroll-padding-left', 'scroll-padding-right']];
  var SIDE4 = ['margin', 'padding', 'inset', 'border-width', 'border-style', 'border-color', 'scroll-margin', 'scroll-padding'];
  function topTokens(v) {       // "0 var(--a, 1px) 2px" -> ["0", "var(--a, 1px)", "2px"]
    var out = [], depth = 0, cur = '';
    for (var i = 0; i < v.length; i++) {
      var ch = v[i];
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (/\s/.test(ch) && !depth) { if (cur) { out.push(cur); cur = ''; } } else cur += ch;
    }
    if (cur) out.push(cur);
    return out;
  }
  function mirrorStyle(s) {
    if (!s || !s.length) return;
    // A shorthand holding var() has no longhands to read: swap its own right and left values.
    SIDE4.forEach(function (p) {
      var v = s.getPropertyValue(p);
      if (!v || v.indexOf('var(') < 0) return;
      var t = topTokens(v);
      if (t.length === 4 && t[1] !== t[3]) s.setProperty(p, [t[0], t[3], t[2], t[1]].join(' '), s.getPropertyPriority(p));
    });
    var r = s.getPropertyValue('border-radius');
    if (r && r.indexOf('var(') >= 0 && r.indexOf('/') < 0) {
      var t = topTokens(r);
      if (t.length === 4) s.setProperty('border-radius', [t[1], t[0], t[3], t[2]].join(' '), s.getPropertyPriority('border-radius'));
      else if (t.length === 3) s.setProperty('border-radius', [t[1], t[0], t[1], t[2]].join(' '), s.getPropertyPriority('border-radius'));
    }
    // A box centred by "left: 50%" and a transform or a negative margin (the rest games' cards, a toast, a burst) is
    // already centred both ways: mirrored to right: 50% while its translate(-50%) stayed, Split Step's card sat off the
    // screen. Its position and margins are left alone.
    var L = s.getPropertyValue('left'), Rt = s.getPropertyValue('right');
    var centred = (L === '50%' && !Rt) || (Rt === '50%' && !L);
    PAIRS.forEach(function (pr) {
      if (centred && (pr[0] === 'left' || pr[0] === 'margin-left')) return;
      var a = s.getPropertyValue(pr[0]), b = s.getPropertyValue(pr[1]);
      if (a === b) return;
      var pa = s.getPropertyPriority(pr[0]), pb = s.getPropertyPriority(pr[1]);
      s.removeProperty(pr[0]); s.removeProperty(pr[1]);
      if (b) s.setProperty(pr[0], b, pb);
      if (a) s.setProperty(pr[1], a, pa);
    });
    ['text-align', 'float', 'clear'].forEach(function (p) {
      var v = s.getPropertyValue(p), w = v === 'left' ? 'right' : v === 'right' ? 'left' : null;
      if (w) s.setProperty(p, w, s.getPropertyPriority(p));
    });
  }
  function mirrorRules(rules) {
    for (var i = 0; i < rules.length; i++) {
      var r = rules[i];
      if (r.style) mirrorStyle(r.style);
      if (r.cssRules) mirrorRules(r.cssRules);      // @media, @supports, @layer, @keyframes
    }
  }
  function mirrorAll() {
    var sh = document.styleSheets;
    for (var i = 0; i < sh.length; i++) {
      var s = sh[i];
      if (MIRRORED.has(s) || s.id === 'i18n-fa-css' || (s.ownerNode && s.ownerNode.id === 'i18n-fa-css')) continue;
      var rules;
      try { rules = s.cssRules; } catch (e) { continue; }   // another site's sheet, or one still loading
      if (!rules) continue;
      MIRRORED.add(s);
      mirrorRules(rules);
    }
  }
  A.mirrorAll = mirrorAll;
  window.addEventListener('load', mirrorAll);

  // ── 2. Numbers and dates ────────────────────────────────────────────────────────────────────────────────────────
  var PD = '۰۱۲۳۴۵۶۷۸۹';
  function faNum(s) { return String(s).replace(/\d/g, function (d) { return PD[d]; }).replace(/(\d|[۰-۹])\.(?=[۰-۹])/g, '$1٫'); }
  var MON = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var WD = { sun: 'یکشنبه', mon: 'دوشنبه', tue: 'سه‌شنبه', wed: 'چهارشنبه', thu: 'پنجشنبه', fri: 'جمعه', sat: 'شنبه' };
  var fmtDM, fmtDMY, fmtMY;
  try {
    fmtMY = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long', year: 'numeric' });
    fmtDM = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long' });
    fmtDMY = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {}
  function monOf(w) { return MON.indexOf(String(w).slice(0, 3).toLowerCase()); }
  // A day and month with no year: the year that puts it nearest today (the app writes recent and coming dates only).
  function nearest(d, m) {
    var now = new Date(), best = null;
    [-1, 0, 1].forEach(function (k) {
      var x = new Date(now.getFullYear() + k, m, d);
      if (!best || Math.abs(x - now) < Math.abs(best - now)) best = x;
    });
    return best;
  }
  function shamsi(d, m, y) {
    if (!fmtDM || m < 0 || !(d >= 1 && d <= 31)) return null;
    var x = y ? new Date(+y, m, +d) : nearest(+d, m);
    return y ? fmtDMY.format(x) : fmtDM.format(x);
  }
  var M = '(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\\.?';
  var W = '(Sun|Mon|Tue|Tues|Wed|Thu|Thur|Thurs|Fri|Sat)[a-z]*,?';
  var DATE_PATTERNS = [
    [new RegExp('^' + W + ' (\\d{1,2}) ' + M + '(?: (\\d{4}))?$', 'i'), function (m) { var s = shamsi(m[2], monOf(m[3]), m[4]); return s && WD[m[1].slice(0, 3).toLowerCase()] + ' ' + s; }],
    [new RegExp('^(\\d{1,2}) ' + M + '(?:,? (\\d{4}))?$', 'i'), function (m) { return shamsi(m[1], monOf(m[2]), m[3]); }],
    [new RegExp('^' + M + ' (\\d{1,2})(?:,? (\\d{4}))?$', 'i'), function (m) { return shamsi(m[2], monOf(m[1]), m[3]); }],
    [new RegExp('^' + W + '$', 'i'), function (m) { return WD[m[1].slice(0, 3).toLowerCase()]; }],
    // "October 2026" (an article's date): the Shamsi month and year it mostly falls in (the 15th).
    [new RegExp('^' + M + ' (\\d{4})$', 'i'), function (m) {
      if (!fmtMY || monOf(m[1]) < 0) return null;
      var parts = fmtMY.formatToParts(new Date(+m[2], monOf(m[1]), 15)), mo = '', yr = '';
      parts.forEach(function (p) { if (p.type === 'month') mo = p.value; if (p.type === 'year') yr = p.value; });
      return mo && yr ? mo + ' ' + yr : null;   // "مهر ۱۴۰۵"
    }],
  ];
  function dateOf(s) {
    for (var i = 0; i < DATE_PATTERNS.length; i++) {
      var m = s.match(DATE_PATTERNS[i][0]);
      if (m) { var r = DATE_PATTERNS[i][1](m); if (r) return r; }
    }
    return null;
  }

  // ── 3. Looking a string up ──────────────────────────────────────────────────────────────────────────────────────
  function norm(s) { return String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
  // Patterns: [regex source, template]. In the template $1..$9 is a capture as it came, {n1} a capture in Persian digits,
  // {d1} a capture read as a date, {t1} a capture translated in turn (a screen's name inside a sentence). A function
  // gets the match and returns the Farsi.
  function fill(tpl, m) {
    if (typeof tpl === 'function') return tpl(m, { num: faNum, date: dateOf, t: look });
    // A capture kept as it came (a name, an English word) sits in a first-strong isolate inside a Farsi line: "Mina S."
    // kept its full stop on its own side, and a line that starts with one ("Chalk. توی مسیر…") still reads right to left.
    var faT = /[\u0600-\u06FF]/.test(tpl);
    return tpl.replace(/\{([ndt])(\d)\}|\$(\d)/g, function (all, k, i, j) {
      if (j) {
        var c = m[+j] == null ? '' : m[+j];
        if (A.names[norm(c)]) return A.names[norm(c)];   // a person's name inside a sentence ("You cheered Sara today")
        return faT && /[A-Za-z]/.test(c) ? ISO_F + c + ISO_R : c;
      }
      var v = m[+i] == null ? '' : m[+i];
      if (k === 'n') return faNum(v);
      if (k === 'd') return dateOf(v) || look(v) || v;   // a month alone ("October") is its Shamsi month in the word lists
      var tv = look(v);
      return tv != null ? tv : faT && /[A-Za-z]/.test(v) ? ISO_F + v + ISO_R : v;
    });
  }
  function look(core) {
    var k = norm(core);
    if (!k || k.length < 2) return null;   // a lone letter is a circuit's A, B, C, never a word
    var ex = A.exact;
    if (Object.prototype.hasOwnProperty.call(ex, k)) return ex[k];
    if (Object.prototype.hasOwnProperty.call(A.names, k)) return A.names[k];
    for (var i = 0; i < A.patterns.length; i++) {
      var p = A.patterns[i], m = k.match(p[0]);
      if (m) { var r = fill(p[1], m); if (r != null) return r; }
    }
    var d = dateOf(k);
    if (d) return d;
    // A list of things the dictionary knows, as the Spine's equipment is drawn: "barbell, bench" · "box or step".
    if (/, | or /.test(k)) {
      var parts = k.split(/(, | or )/), ok = true;
      for (var pi = 0; pi < parts.length && ok; pi += 2) ok = Object.prototype.hasOwnProperty.call(ex, parts[pi]);
      if (ok) return parts.map(function (x, i) { return i % 2 ? (x === ', ' ? '، ' : ' یا ') : ex[x]; }).join('');
    }
    // The same words with their punctuation or a symbol at either end: "Done." · "‹ Back" · "+ Log a max" · "Why?" ·
    // "Squat · " (a label with the separator before the next element, as Library → Exercises draws its rows)
    var m2 = k.match(/^([^A-Za-z0-9]*)(.*?)((?: ?·)?[.:!?…]*)$/);
    if (m2 && (m2[1] || m2[3]) && m2[2] && Object.prototype.hasOwnProperty.call(ex, m2[2])) {
      return m2[1] + ex[m2[2]] + m2[3].replace(/\?/g, '؟');
    }
    return null;
  }
  // An arrow at either end of a line ("‹ Back", "Read it ›", "Skip →", "Start session ▶") points the way the page reads,
  // decided from the ENGLISH, whatever the word list wrote (some entries turned it already, some did not):
  //   ‹ › « » are mirrored by the browser itself in a right-to-left line (Unicode Bidi_Mirrored), so they keep the English
  //   character: "›" is drawn "‹". Turning them too drew every forward chevron pointing right again.
  //   → ← ▶ ◀ are never mirrored, so they are swapped.
  var ENDS = '›‹→←»«▶◀';
  var TURN = { '›': '›', '‹': '‹', '»': '»', '«': '«', '→': '←', '←': '→', '▶': '◀', '◀': '▶' };
  function ends(en, r) {
    var a = en.charAt(0), z = en.charAt(en.length - 1);
    if (ENDS.indexOf(a) >= 0 && ENDS.indexOf(r.charAt(0)) >= 0) r = TURN[a] + r.slice(1);
    if (ENDS.indexOf(z) >= 0 && ENDS.indexOf(r.charAt(r.length - 1)) >= 0) r = r.slice(0, -1) + TURN[z];
    return r;
  }
  // Sets and reps are in Persian digits (Amir, 2026-11-21: "sets and reps should go to farsi"). "4 × 6" in Latin digits
  // read the wrong way round in a right-to-left line; "۴ × ۶" starts on the right with the sets, as Farsi reads it.
  var DOSE = /\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+)?(?:\s*×\s*\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+)?)+/g;
  var ISO_L = String.fromCharCode(0x2066), ISO_R = String.fromCharCode(0x2069);   // a left-to-right isolate, invisible
  var RLM = String.fromCharCode(0x200F);                                          // a right-to-left mark, invisible
  var ISO_F = String.fromCharCode(0x2068);                                        // a first-strong isolate, invisible
  function faDose(s) { return s.indexOf('×') < 0 ? s : s.replace(DOSE, function (m) { return faNum(m); }); }
  function tr(s) {
    if (!s || !/[A-Za-z]/.test(s)) return null;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var r = look(m[2]);
    if (r == null) return null;
    r = ends(norm(m[2]), r);
    // The app's middle dot between Farsi words reads as a Persian zero beside a digit ("ویدیو · ۶ مرحله" looked like
    // "ویدیو۶۰ مرحله"; "هفته ۱ تا ۵ · تمام" looked like "۵۰"): in a Farsi line it is a Persian comma, also at the line's
    // end where the next piece is its own element. A right-to-left mark rides after it: a Persian digit straight after a
    // Latin name took the name's direction ("Split Step · 1 of 4" was drawn "۴ از SPLIT STEP ،۱").
    return m[1] + faDose(faDots(faMixed(faEffort(r)))) + m[3];
  }
  function faDots(r) {
    return /[\u0600-\u06FF]/.test(r) ? r.replace(/\s+·\s+/g, '،' + RLM + ' ').replace(/\s+·$/, '،' + RLM) : r;
  }
  A.t = function (s) { var r = tr(String(s == null ? '' : s)); return r == null ? s : r; };
  // People's names (2026-11-21, Amir: "in farsi version, people name should be in farsi as well"). Never in the public word
  // file: they come from the server (get_names_fa(), stage114: the athlete's own and their crew's, as each is drawn), through
  // program.html's loadNamesFa(), and only what is on the screen changes. nameOf() is for what the page draws on a canvas.
  A.names = {};
  A.nameOf = function (s) { var k = norm(s || ''); return Object.prototype.hasOwnProperty.call(A.names, k) ? A.names[k] : s; };
  A.addNames = function (map) {
    var fresh = {}, any = false;
    Object.keys(map || {}).forEach(function (k) {
      var v = map[k];
      if (typeof v === 'string' && /[؀-ۿ]/.test(v) && A.names[norm(k)] !== v) { A.names[norm(k)] = v; fresh[norm(k)] = v; any = true; }
    });
    // Names that arrived after the screen was drawn: each text that is exactly a name takes its Farsi now. So does a name
    // INSIDE a sentence (2026-11-21, Amir: "see why tara doesnt have farsi name in crew"): someone who joined the crew after
    // this phone saved its names was drawn as "Tara به تیم پیوست", and only a text that was the name alone was redone.
    // A name inside a Farsi sentence always sits in an isolate (fill() and faMixed()), so that is what is looked for.
    if (any && document.body) {
      var tw = document.createTreeWalker(document.body, 4, null), n, ISO_IN = /[⁦⁨]([^⁩]+)⁩/g;
      while ((n = tw.nextNode())) {
        if (nameKept(n.parentElement)) continue;
        var c = n.data.trim();
        if (c && Object.prototype.hasOwnProperty.call(A.names, norm(c))) { n.data = n.data.replace(c, A.names[norm(c)]); seen.set(n, n.data); continue; }
        if (n.data.indexOf(ISO_R) < 0) continue;
        var d2 = n.data.replace(ISO_IN, function (all, w) {
          var k = norm(w.split(NBSP).join(' ').split(WJ).join(''));
          return Object.prototype.hasOwnProperty.call(fresh, k) ? fresh[k] : all;
        });
        if (d2 !== n.data) { n.data = d2; seen.set(n, d2); }
      }
    }
  };
  A.addFa = function (exact, patterns) {
    Object.keys(exact || {}).forEach(function (k) { if (exact[k]) A.exact[norm(k)] = exact[k]; });
    (patterns || []).forEach(function (p) { A.patterns.push([p[0] instanceof RegExp ? p[0] : new RegExp('^' + p[0] + '$'), p[1]]); });
  };

  // ── 4. Watching the page ────────────────────────────────────────────────────────────────────────────────────────
  // Never translated: code, what the athlete types, and what holds an exercise name or an athlete's own words. A screen
  // that draws a name in a class not listed here can mark it translate="no" instead.
  var SKIP = 'script,style,textarea,code,noscript,[translate="no"],.notranslate,.i18n-ltr,' +
    '.item-name,.nm-tail,.ex-name,.tl-name,.round-name,.circ-name,.ax-name,.ax-names,.lib-ex-name,.hist-ex,.rec-lift,.pr-lift,' +
    '.sg-name,.step-ex-name,.timer-exercise-name,.rm-name,.archive-ex-name,.pl-name';
  // (.cr-names is not skipped: it holds "Liked by" and "Sara T. and 4 others", whose words the lists have; a name in it
  // matches nothing and stays as it is.)
  A.skip = SKIP;
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var seen = new WeakMap();     // text node -> the text it held after we last looked
  var seenA = new WeakMap();    // element -> { attr: value after we last looked }
  function skipped(el) { return !el || (el.closest && el.closest(A.skip)); }
  // Where a name stays as it is: code, what someone typed (dir="auto", inputs), and an exercise's name.
  var NAME_KEEP = 'script,style,textarea,code,noscript,[dir="auto"],.item-name,.nm-tail,.ex-name,.tl-name,.round-name,.circ-name,.ax-name,.lib-ex-name,.sg-name,.step-ex-name,.timer-exercise-name,.rm-name';
  function nameKept(el) { return !el || (el.closest && el.closest(NAME_KEEP)); }
  // An arrow drawn as text on its own points the way the page reads: forward is left in Farsi. Only → and ←: a lone ‹ or ›
  // is mirrored by the browser already (see ends()), and turning it as well pointed every Home row's › the wrong way.
  var FLIP = { '→': '←', '←': '→', '?': '؟' };
  // Text that is a number inside a Farsi sentence: Persian digits (the tempo's lit number: "پایین 3 ثانیه" beside "۱ ثانیه مکث").
  var SENTENCE_NUM = '.t-hot';
  var RX_NUM = '.nl-dose,.nl-rpe,.round-detail,.step-pill';
  // A rest button carries its time on it: "2 min 30 s" spelled out in Farsi ("۲ دقیقه و ۳۰ ثانیه") is twice as long and
  // ran over the Note beside it, so on the button it is a clock, "۲:۳۰".
  var CLOCK = '.rest-t';
  // A word whose Farsi depends on where it stands. The check-in's last question ("Overall, how ready do you feel?") answers
  // 3 with معمولی, not the باشه "OK" is everywhere else (Amir, 2026-11-21).
  var CTX = [['.readiness-q[data-key="overall"] .readiness-opt-lab', { 'OK': 'معمولی' }],
    // The Team feed's "when" under a moment (2026-11-21): a short day name is the whole day, never the one-letter "پ" a calendar strip uses.
    ['.cr-when,.cr-lnwhen', { Mon: 'دوشنبه', Tue: 'سه‌شنبه', Wed: 'چهارشنبه', Thu: 'پنجشنبه', Fri: 'جمعه', Sat: 'شنبه', Sun: 'یکشنبه' }],
    // ...and "You" before it means you liked it: "تو، دیروز" read as "you, yesterday".
    ['.cr-kww', { 'You': 'لایک شما' }]];
  // A count standing alone beside Farsi words (the Team screen first, 2026-11-21) (a heart's count, a vote's percent, last week's tally, the +6 face): Persian digits,
  // and the Persian percent sign (2026-11-21: "57%" and "1" sat beside "۷ رأی" and "۳ جلسه").
  var COUNT = '.cr-mcd,.cr-ht b,.cr-half .n,.cr-tosslast .tn,.cr-face,.fw-f b,.cyc-k';
  // (2026-11-22) Your weeks' legend ("1 هفتهٔ کامل") and Progress's "1 از ۱۰ جلسه": the number is its own element beside Farsi words.
  // A short English run inside a Farsi line ("«استپ‌آف لندینگ» (Step-Off Landing)", "Back Squat", "Effort ۷") is kept as one
  // left-to-right piece that never breaks across lines: split by the line's end, "(Step-Off" sat at the end of one line and
  // "Landing)" at the start of the next, brackets turned round. Longer runs keep their own order but may still wrap.
  // What people type (an element marked dir="auto") is left as it is.
  var NBSP = String.fromCharCode(0xA0), WJ = String.fromCharCode(0x2060);
  var TEMPO = /[0-9۰-۹](?:-[0-9۰-۹]){2,}/, TEMPO_G = /[0-9۰-۹](?:-[0-9۰-۹]){2,}/g;
  var LATIN_RUN = new RegExp("\\(?[A-Za-z][A-Za-z0-9'’&.\\-]*(?:[ " + NBSP + "]+[A-Za-z0-9][A-Za-z0-9'’&.\\-]*)*\\)?", 'g');
  // In a Farsi line, the effort score is شدت (Amir, 2026-11-21: "effort should be changed to sheddat in demo and elsewhere").
  // The programmes' Farsi says RPE; the app's effortWord() turns RPE into "Effort" before drawing, inside Farsi too
  // ("Effort یعنی چی", "از هر effort یکی کم کن"). Here it becomes the Farsi word.
  var EFFORT = /\b[Ee]ffort\b/g;
  function faEffort(s) { return /[\u0600-\u06FF]/.test(s) && /ffort/.test(s) ? faCheckin(s.replace(EFFORT, 'شدت')) : faCheckin(s); }
  // A note that names the check-in's answers in English inside Farsi ("توی چک‌این بیشترش Poor، Tired، Stressed یا Bit off
  // بوده") says them as the check-in's own buttons do (Amir, 2026-11-21: "put check in words in farsi"): the same words, from
  // the word lists. The generic ones (OK, Good, Great, None, Mild, Slight) are left alone: they are words in other places too.
  var CHECKIN = ['Very poor', 'Very stressed', 'Very sore', 'Very fresh', 'Not ready', 'Fully ready', 'Bit off', 'Exhausted',
    'Excellent', 'Stressed', 'Neutral', 'Tired', 'Poor', 'Sore'];
  var CHECKIN_RE = new RegExp('\\b(' + CHECKIN.join('|') + ')\\b', 'g');
  function faCheckin(s) {
    if (!/[\u0600-\u06FF]/.test(s) || !CHECKIN_RE.test(s)) return s;
    CHECKIN_RE.lastIndex = 0;
    return s.replace(CHECKIN_RE, function (w) { return A.exact[w] || w; });
  }
  function faMixed(s) {
    if (!/[\u0600-\u06FF]/.test(s) || !/[A-Za-z]/.test(s) || s.indexOf(ISO_L) >= 0 || s.indexOf(ISO_F) >= 0) return s;
    function wrap(t) {
      if (t.length <= 32) t = t.replace(/ /g, NBSP).replace(/-/g, '-' + WJ);
      return ISO_L + t + ISO_R;
    }
    return s.replace(LATIN_RUN, function (w) {
      var open = w.charAt(0) === '(', close = w.charAt(w.length - 1) === ')';
      if (open && !close) return '(' + wrap(w.slice(1));
      if (close && !open) return wrap(w.slice(0, -1)) + ')';
      return wrap(w);
    });
  }
  function doText(n) {
    var d = n.data;
    if (seen.get(n) === d) return;
    var core = d.trim(), p = n.parentElement;
    // A person's name, wherever it stands (a crew face, a page's name, the greeting), but never in what someone types.
    if (core && Object.prototype.hasOwnProperty.call(A.names, norm(core)) && !nameKept(p)) {
      n.data = d.replace(core, A.names[norm(core)]); seen.set(n, n.data); return;
    }
    if (FLIP[core]) { if (!skipped(p)) n.data = d.replace(core, FLIP[core]); seen.set(n, n.data); return; }
    if (p && !skipped(p)) {
      for (var ci = 0; ci < CTX.length; ci++) {
        if (p.closest && p.closest(CTX[ci][0]) && Object.prototype.hasOwnProperty.call(CTX[ci][1], core)) {
          n.data = d.replace(core, CTX[ci][1][core]); seen.set(n, n.data); return;
        }
      }
      var mc = p.closest && p.closest(CLOCK) && core.match(/^(\d+) min (\d+) s$/);
      if (mc) { n.data = d.replace(core, faNum(mc[1] + ':' + (mc[2].length < 2 ? '0' : '') + mc[2])); seen.set(n, n.data); return; }
      if (/^\d+$/.test(core) && p.closest && p.closest(SENTENCE_NUM)) { n.data = faNum(d); seen.set(n, n.data); return; }
      if (!/[A-Za-z]/.test(d) && d.indexOf('×') >= 0) { var dz = faDose(d); if (dz !== d) n.data = dz; seen.set(n, n.data); return; }
      if (!/[A-Za-z]/.test(d) && /\d/.test(d) && p.closest && p.closest(COUNT)) { n.data = faNum(d).replace(/%/g, '٪'); seen.set(n, n.data); return; }
      // The prescription's own numbers (a circuit row's "8", the effort's "7/10"): Persian digits, as the sets and reps.
      if (!/[A-Za-z]/.test(d) && /\d/.test(d) && p.closest && p.closest(RX_NUM)) { n.data = faNum(d); seen.set(n, n.data); return; }
      // A phone number ("+44 7435 363461") read its groups backwards in a right-to-left line: kept left to right.
      if (/^\+\d[\d ()-]{5,}$/.test(core)) { n.data = d.replace(core, ISO_L + core + ISO_R); seen.set(n, n.data); return; }
      // Farsi that came already written (a programme's Farsi twin, "هفته ۱ تا ۵") with the app's dot after it.
      if (!/[A-Za-z]/.test(d) && d.indexOf('·') >= 0) { var fd = faDots(core); if (fd !== core) n.data = d.replace(core, fd); seen.set(n, n.data); return; }
    }
    if (/[A-Za-z]/.test(d) && !skipped(p)) {
      var r = tr(d);
      if (r != null) { if (r !== d) n.data = r; }
      else {
        if (A.missing.size < 5000 && /[A-Za-z]{2}/.test(d)) A.missing.add(norm(d));
        if (!(p && p.closest && p.closest('[dir="auto"]'))) {
          var mx = faMixed(faEffort(d));
          // An English sentence with no Farsi words for it (a goal or a note Amir wrote in English) ends in a full stop or a
          // bracket, which a right-to-left line moved to its start (".Four sessions a week, no gaps", 2026-11-22). Kept as one
          // left-to-right piece, its stop stays at its end; the line still sits on the right.
          if (mx === d && !/[\u0600-\u06FF]/.test(d) && /[A-Za-z]{2}/.test(d) && /[.!?:;)\]'"…]\s*$/.test(d) && d.indexOf(ISO_F) < 0 && d.indexOf(ISO_L) < 0) {
            var mm = d.match(/^(\s*)([\s\S]*?)(\s*)$/); mx = mm[1] + ISO_F + mm[2] + ISO_R + mm[3];
          }
          if (mx !== d) n.data = mx;
        }
      }
    }
    // A tempo ("3-1-1-0", "۳-۱-۱") never breaks at its hyphens: the help sheet put "3-1-1-" at a line's end and "0" on the
    // next. An invisible word joiner after each hyphen keeps it whole.
    // After the words are looked up, so a sentence holding one still finds its translation.
    if (TEMPO.test(n.data) && n.data.indexOf(WJ) < 0 && !skipped(p)) n.data = n.data.replace(TEMPO_G, function (m) { return m.replace(/-/g, '-' + WJ); });
    seen.set(n, n.data);
  }
  function doAttr(el, a) {
    var v = el.getAttribute(a);
    if (v == null) return;
    var s = seenA.get(el); if (!s) seenA.set(el, s = {});
    if (s[a] === v) return;
    // A textarea's typed text is never translated, but its placeholder is the app's words.
    var own = a === 'placeholder' && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') ? el.parentElement : el;
    if (/[A-Za-z]/.test(v) && !(a !== 'aria-label' && skipped(own))) {
      var r = tr(v);
      if (r != null && r !== v) { el.setAttribute(a, r); v = r; }
    }
    s[a] = v;
  }
  function walk(root) {
    if (root.nodeType === 3) { doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (root.closest && root.closest('script,style')) return;
      for (var i = 0; i < ATTRS.length; i++) if (root.hasAttribute(ATTRS[i])) doAttr(root, ATTRS[i]);
    }
    var tw = document.createTreeWalker(root, 5 /* SHOW_ELEMENT | SHOW_TEXT */, null), n;
    while ((n = tw.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else { if (n.tagName === 'SCRIPT' || n.tagName === 'STYLE') continue; for (var j = 0; j < ATTRS.length; j++) if (n.hasAttribute(ATTRS[j])) doAttr(n, ATTRS[j]); }
    }
  }
  var mo = new MutationObserver(function (list) {
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === 'childList') {
        for (var j = 0; j < m.addedNodes.length; j++) {
          var a = m.addedNodes[j], tn = a.nodeName;
          // A sheet exists once its element is parsed: mirror whatever is ready before each script runs, so the app's
          // first paint is already right to left; a <link> mirrors when it has loaded.
          if (tn === 'SCRIPT' || tn === 'STYLE' || tn === 'BODY') mirrorAll();
          else if (tn === 'LINK') a.addEventListener('load', mirrorAll);
          walk(a);
        }
      }
      else if (m.type === 'characterData') doText(m.target);
      else if (m.type === 'attributes') doAttr(m.target, m.attributeName);
    }
  });
  mo.observe(html, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  document.addEventListener('DOMContentLoaded', function () { mirrorAll(); walk(document.body); });

  // The browser's own boxes say the app's words too.
  ['alert', 'confirm', 'prompt'].forEach(function (f) {
    var orig = window[f];
    if (typeof orig !== 'function') return;
    window[f] = function (msg) { var a = [].slice.call(arguments); a[0] = A.t(msg); return orig.apply(window, a); };
  });

  // ── 5. The words ───────────────────────────────────────────────────────────────────────────────────────────────
  // Loaded only in Farsi, in order, before the app's own scripts run (a parser-blocking script written during the parse).
  document.write('<script src="' + DICT_URL.replace(/"/g, '') + '"><\/script>');
})();
