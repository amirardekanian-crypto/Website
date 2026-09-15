/* The phone menu on the Farsi pages: index-fa.html, /tennis/ and /tennis-testing/ (Amir, 2026-09-15).
   Below each page's breakpoint the menu links hide behind a ☰ button, and tapping it drops them down
   as a panel under the green bar. The look lives in each page's CSS (index-fa.html inline, and
   fa-product.css for the product pages); this file only opens and closes it. It closes on a link
   tap, a tap outside, Escape, and when the window grows back past the breakpoint.
   Link it with a ?v= number and bump it on every change: sw.js serves /assets/ cache-first. */
(function () {
  var nav = document.querySelector('.nav');
  var btn = nav && nav.querySelector('.nav-menu-btn');
  var panel = nav && nav.querySelector('.nav-links');
  if (!btn || !panel) return;

  function isOpen() { return nav.classList.contains('open'); }
  function set(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'بستن منو' : 'منو');
  }

  btn.addEventListener('click', function () { set(!isOpen()); });
  panel.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
  document.addEventListener('click', function (e) { if (isOpen() && !nav.contains(e.target)) set(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { set(false); btn.focus(); }
  });
  window.addEventListener('resize', function () {
    if (isOpen() && getComputedStyle(btn).display === 'none') set(false);
  });
})();
