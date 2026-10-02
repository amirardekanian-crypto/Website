/* Counts the clicks that show which button, page or section brings applications.
   Loaded on the funnel pages only (the two homes, both apply forms, proof, the link hub, the partner page, the course
   and testing pages). Plausible only. Nothing personal goes out: the page path, where on the page the button sits, and
   for Apply the plan named in the link. Plausible shows an event only after you add it as a goal.

   Goals to add in Plausible (Site settings > Goals > Custom event), then Site settings > Custom properties for the props:
     Apply Click       plan (game / set / match / none), where, page
     WhatsApp Click    where, page
     Demo Click        which (programme / aa-proof / course), where, page
     Hub Click         to            (links.html only: which button on the Instagram page gets the taps)
     Form Started      lang          (the first answer in the apply form)
     Form Step         step, lang    (the first answer in each section, 01 to 07: where people stop)
     Level test start                (sent from tennis/level-test.js)
   Already sent elsewhere: Form Submitted, Form Submitted FA, Proof Signup, Partner Application, 404, Level test 1/2/3. */
(function () {
  'use strict';

  window.plausible = window.plausible || function () { (window.plausible.q = window.plausible.q || []).push(arguments); };
  function send(name, props) {
    try { window.plausible(name, props ? { props: props } : undefined); } catch (e) { /* stats are optional */ }
  }

  var PAGE = location.pathname.replace(/index\.html$/, '') || '/';
  var WHERE = [
    ['.site-nav, nav', 'nav'],
    ['.mobile-sticky-cta', 'sticky'],
    ['.pricing-card, .price-card, #pricing', 'pricing'],
    ['.hero', 'hero'],
    ['.cta-section, section.cta', 'closing'],
    ['footer', 'footer']
  ];
  function whereOf(el) {
    for (var i = 0; i < WHERE.length; i++) if (el.closest(WHERE[i][0])) return WHERE[i][1];
    var s = el.closest('[id]');
    return s ? s.id.slice(0, 24) : 'page';
  }

  // ── clicks on links ──
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (err) { return; }
    var where = whereOf(a);

    if (PAGE === '/links.html') send('Hub Click', { to: u.origin === location.origin ? u.pathname + u.hash : u.hostname });

    if (/(^|\.)wa\.me$|(^|\.)whatsapp\.com$/.test(u.hostname)) { send('WhatsApp Click', { where: where, page: PAGE }); return; }
    if (u.origin !== location.origin) return;

    if (/^\/form(-fa)?\.html$/.test(u.pathname)) {
      send('Apply Click', { plan: (u.searchParams.get('plan') || 'none').toLowerCase(), where: where, page: PAGE });
    } else if (u.pathname === '/program.html' && u.searchParams.get('client') === 'demo') {
      send('Demo Click', { which: 'programme', where: where, page: PAGE });
    } else if (u.pathname === '/habits.html' && u.searchParams.get('client') === 'demo') {
      send('Demo Click', { which: 'aa-proof', where: where, page: PAGE });
    } else if (/^\/tennis\/app\/?$/.test(u.pathname) && u.searchParams.has('demo')) {
      send('Demo Click', { which: 'course', where: where, page: PAGE });
    }
  }, true);

  // ── the apply forms: started, and how far people get ──
  var isForm = /^\/form(-fa)?\.html$/.test(location.pathname);
  if (isForm) {
    var lang = /form-fa/.test(location.pathname) ? 'fa' : 'en';
    var DIGITS = { '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9' };
    var started = false, seen = {};
    var onAnswer = function (e) {
      var sec = e.target.closest && e.target.closest('section');
      if (!sec) return;                       // the discount box and the like sit outside the sections
      if (!started) { started = true; send('Form Started', { lang: lang }); }
      var badge = sec.querySelector('.section-badge, .sbadge');
      var step = badge ? badge.textContent.trim().slice(0, 2).replace(/[۰-۹]/g, function (d) { return DIGITS[d]; }) : '';
      if (/^\d\d$/.test(step) && !seen[step]) { seen[step] = true; send('Form Step', { step: step, lang: lang }); }
    };
    document.addEventListener('input', onAnswer, true);
    document.addEventListener('change', onAnswer, true);
  }
})();
