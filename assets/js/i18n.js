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
   stored on this phone (aa_lang, no athlete prefix, so _snapshot() never syncs it). THE SWITCH IS HIDDEN until the
   words are done: it shows only on a phone opened once with ?fa=1 (aa_lang_beta). ?fa=0 turns both off.
   When REVEALED is true, a phone with no choice of its own follows the programme's athlete.lang (from the intake form).

   A change here ships with a ?v= bump on its <script> in program.html, the same URL in sw.js's SHELL and a CACHE bump.
   A change of words is a ?v= bump on data-fa (the dictionary's URL) and the same three. */
(function () {
  'use strict';
  var REVEALED = false;                       // the switch is for everyone, and athlete.lang picks the default
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
      if (!REVEALED || get(LS)) return;
      var want = String(l || '').toLowerCase() === 'fa' ? 'fa' : 'en';
      put(LS, want);
      if (reload && want !== lang) location.reload();
    },
    t: function (s) { return s; },
    addFa: function () {},
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
  var css = ['Barlow', 'Barlow Condensed', 'AA Barlow Condensed', 'Space Mono', 'Vazirmatn'].map(function (f) {
    var out = '';
    for (var w = 100; w <= 900; w += 100) {
      out += "@font-face{font-family:'" + f + "';src:" + V + ';font-weight:' + w + ';font-style:normal;font-display:swap;unicode-range:' + R + '}';
    }
    return out;
  }).join('') +
    'html.is-fa,html.is-fa body{font-family:Barlow,Vazirmatn,Tahoma,sans-serif}' +
    'html.is-fa *{letter-spacing:0!important}' +
    // An exercise name, and anything else marked as Latin, reads left to right inside the Farsi line.
    'html.is-fa .i18n-ltr,html.is-fa [translate="no"]{unicode-bidi:isolate}';
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
    PAIRS.forEach(function (pr) {
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
  var fmtDM, fmtDMY;
  try {
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
    return tpl.replace(/\{([ndt])(\d)\}|\$(\d)/g, function (all, k, i, j) {
      if (j) return m[+j] == null ? '' : m[+j];
      var v = m[+i] == null ? '' : m[+i];
      return k === 'n' ? faNum(v) : k === 'd' ? (dateOf(v) || v) : (look(v) || v);
    });
  }
  function look(core) {
    var k = norm(core);
    if (!k || k.length < 2) return null;   // a lone letter is a circuit's A, B, C, never a word
    var ex = A.exact;
    if (Object.prototype.hasOwnProperty.call(ex, k)) return ex[k];
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
    // The same words with their punctuation or a symbol at either end: "Done." · "‹ Back" · "+ Log a max" · "Why?"
    var m2 = k.match(/^([^A-Za-z0-9]*)(.*?)([.:!?…]*)$/);
    if (m2 && (m2[1] || m2[3]) && m2[2] && Object.prototype.hasOwnProperty.call(ex, m2[2])) {
      return m2[1] + ex[m2[2]] + m2[3].replace(/\?/g, '؟');
    }
    return null;
  }
  function tr(s) {
    if (!s || !/[A-Za-z]/.test(s)) return null;
    var m = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
    var r = look(m[2]);
    if (r == null) return null;
    // "‹ Back" · "Read it ›": an arrow at either end turns with the page.
    r = r.replace(/^[›‹→←»«]|[›‹→←»«]$/g, function (c) { return FLIP[c]; });
    return m[1] + r + m[3];
  }
  A.t = function (s) { var r = tr(String(s == null ? '' : s)); return r == null ? s : r; };
  A.addFa = function (exact, patterns) {
    Object.keys(exact || {}).forEach(function (k) { if (exact[k]) A.exact[norm(k)] = exact[k]; });
    (patterns || []).forEach(function (p) { A.patterns.push([p[0] instanceof RegExp ? p[0] : new RegExp('^' + p[0] + '$'), p[1]]); });
  };

  // ── 4. Watching the page ────────────────────────────────────────────────────────────────────────────────────────
  // Never translated: code, what the athlete types, and what holds an exercise name or an athlete's own words. A screen
  // that draws a name in a class not listed here can mark it translate="no" instead.
  var SKIP = 'script,style,textarea,code,noscript,[translate="no"],.notranslate,.i18n-ltr,' +
    '.item-name,.nm-tail,.ex-name,.tl-name,.round-name,.circ-name,.ax-name,.ax-names,.lib-ex-name,.hist-ex,.rec-lift,.pr-lift,' +
    '.sg-name,.step-ex-name,.timer-exercise-name,.rm-name,.archive-ex-name,.pl-name,.cr-names';
  A.skip = SKIP;
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var seen = new WeakMap();     // text node -> the text it held after we last looked
  var seenA = new WeakMap();    // element -> { attr: value after we last looked }
  function skipped(el) { return !el || (el.closest && el.closest(A.skip)); }
  // A chevron or arrow drawn as text points the way the page reads: forward is left in Farsi.
  var FLIP = { '›': '‹', '‹': '›', '→': '←', '←': '→', '»': '«', '«': '»' };
  function doText(n) {
    var d = n.data;
    if (seen.get(n) === d) return;
    var core = d.trim();
    if (FLIP[core]) { if (!skipped(n.parentElement)) n.data = d.replace(core, FLIP[core]); seen.set(n, n.data); return; }
    if (/[A-Za-z]/.test(d) && !skipped(n.parentElement)) {
      var r = tr(d);
      if (r != null) { if (r !== d) n.data = r; }
      else if (A.missing.size < 5000 && /[A-Za-z]{2}/.test(d)) A.missing.add(norm(d));
    }
    seen.set(n, n.data);
  }
  function doAttr(el, a) {
    var v = el.getAttribute(a);
    if (v == null) return;
    var s = seenA.get(el); if (!s) seenA.set(el, s = {});
    if (s[a] === v) return;
    if (/[A-Za-z]/.test(v) && !(a !== 'aria-label' && skipped(el))) {
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
