/* ═══════════════════════════════════════════════════════════════════════
   shared.js — runs on every page.

   Responsibilities:
     • Inject the <nav> and <footer> partials (single source of truth).
     • Highlight the active nav link based on location.
     • Wire the mobile nav toggle.
     • Scroll-reveal animations for .reveal elements.
     • Global smooth-scroll for same-page anchors.
     • Set the current year in the footer.
     • Expose window.VideoModal.open(url) for inline YouTube playback.
     • Expose window.A2HS.show() to display the "Add to Home Screen" hint
       (only called from program.html to avoid bugging marketing visitors).
   ═══════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── Partial injection ────────────────────────────────────────────────
  async function mountPartial(id, url) {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      const res = await fetch(url, { cache: 'default' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      el.innerHTML = await res.text();
    } catch (err) {
      console.warn('[shared] failed to load partial', url, err);
    }
  }

  // ── Active nav link ──────────────────────────────────────────────────
  function setActiveNavLink() {
    const pathname = location.pathname.replace(/\/index\.html$/, '/') || '/';
    const hash = location.hash || '';
    document.querySelectorAll('.nav-link').forEach(a => {
      const match = a.getAttribute('data-match') || a.getAttribute('href') || '';
      // Trim trailing slash except for root
      const norm = match.replace(/\/$/, '') || '/';
      const currentNorm = (pathname + hash).replace(/\/$/, '') || '/';
      if (norm === currentNorm) a.classList.add('is-active');
    });
  }

  // ── Mobile nav toggle ────────────────────────────────────────────────
  function wireNavToggle() {
    const nav = document.querySelector('.site-nav');
    const btn = nav && nav.querySelector('.nav-toggle');
    if (!nav || !btn) return;

    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('nav-open');
      btn.setAttribute('aria-expanded', String(open));
      document.body.style.overflow = open ? 'hidden' : '';
    });

    nav.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (!a) return;
      nav.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });

    // Close on Escape
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('nav-open')) {
        nav.classList.remove('nav-open');
        btn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ── Scroll reveal ────────────────────────────────────────────────────
  function wireReveal() {
    if (!('IntersectionObserver' in window)) {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  }

  // ── Smooth scroll for anchor links ───────────────────────────────────
  function wireSmoothScroll() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"], a[href*="#"]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href === '#') return;

      // Only intercept when the link points to a hash on the current page.
      const url = new URL(a.href, location.href);
      if (url.pathname !== location.pathname) return;
      if (!url.hash) return;

      const target = document.querySelector(url.hash);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', url.hash);
    });
  }

  // ── Footer year ──────────────────────────────────────────────────────
  function updateFooterYear() {
    document.querySelectorAll('[data-year]').forEach(el => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  // ── Video modal (YouTube inline playback) ────────────────────────────
  const VideoModal = (function () {
    let root = null;
    function ensure() {
      if (root) return root;
      root = document.createElement('div');
      root.className = 'video-modal';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Video player');
      root.innerHTML = `
        <div class="video-modal-inner">
          <button type="button" class="video-modal-close" aria-label="Close video">✕</button>
          <div class="video-modal-frame"></div>
        </div>`;
      document.body.appendChild(root);
      root.addEventListener('click', e => {
        if (e.target === root || e.target.closest('.video-modal-close')) close();
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && root.classList.contains('is-open')) close();
      });
      return root;
    }
    function extractId(url) {
      if (!url) return null;
      try {
        const u = new URL(url);
        if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
        if (u.hostname.includes('youtube.com')) {
          if (u.pathname === '/watch') return u.searchParams.get('v');
          const m = u.pathname.match(/^\/(embed|shorts|v)\/([^/?#]+)/);
          if (m) return m[2];
        }
      } catch (e) {
        // fall through
      }
      // Last-ditch: look for 11-char token
      const m = String(url).match(/[?&]v=([^&]+)/) || String(url).match(/\/([a-zA-Z0-9_-]{11})(?:$|[?&/])/);
      return m ? m[1] : null;
    }
    function open(url) {
      const el = ensure();
      const id = extractId(url);
      if (!id) { window.open(url, '_blank', 'noopener'); return; }
      const frame = el.querySelector('.video-modal-frame');
      frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1" title="Exercise video" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
      el.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      if (!root) return;
      root.classList.remove('is-open');
      root.querySelector('.video-modal-frame').innerHTML = '';
      document.body.style.overflow = '';
    }
    return { open, close };
  })();
  window.VideoModal = VideoModal;

  // ── "Add to Home Screen" hint (program.html only) ────────────────────
  const A2HS = (function () {
    const DISMISS_KEY = 'a2hs_dismissed_v1';
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      deferredPrompt = e;
    });

    function isStandalone() {
      return window.matchMedia('(display-mode: standalone)').matches ||
             window.navigator.standalone === true;
    }
    function isIOS() {
      return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    function show() {
      if (isStandalone()) return;
      if (localStorage.getItem(DISMISS_KEY)) return;

      const el = document.createElement('div');
      el.className = 'a2hs-toast';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', 'Install app');

      const ios = isIOS();
      el.innerHTML = `
        <div class="a2hs-toast-icon" aria-hidden="true">AA</div>
        <div class="a2hs-toast-body">
          <strong>Install app</strong>
          <span>${ios
            ? 'Tap the Share button, then "Add to Home Screen".'
            : 'Add this program to your home screen for a quicker training experience.'}</span>
        </div>
        <div class="a2hs-toast-actions">
          ${ios ? '' : '<button type="button" class="primary" data-a2hs-install>Install</button>'}
          <button type="button" data-a2hs-dismiss>Dismiss</button>
        </div>`;
      document.body.appendChild(el);
      requestAnimationFrame(() => el.classList.add('is-visible'));

      el.addEventListener('click', async e => {
        if (e.target.closest('[data-a2hs-dismiss]')) {
          localStorage.setItem(DISMISS_KEY, '1');
          el.classList.remove('is-visible');
          setTimeout(() => el.remove(), 300);
        } else if (e.target.closest('[data-a2hs-install]') && deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          if (choice.outcome === 'accepted' || choice.outcome === 'dismissed') {
            localStorage.setItem(DISMISS_KEY, '1');
          }
          deferredPrompt = null;
          el.classList.remove('is-visible');
          setTimeout(() => el.remove(), 300);
        }
      });
    }
    return { show };
  })();
  window.A2HS = A2HS;

  // ── Boot ─────────────────────────────────────────────────────────────
  async function init() {
    await Promise.all([
      mountPartial('site-nav', 'partials/nav.html'),
      mountPartial('site-footer', 'partials/footer.html'),
    ]);
    setActiveNavLink();
    wireNavToggle();
    wireReveal();
    wireSmoothScroll();
    updateFooterYear();

    // Scroll to hash target after partial injection (since anchors may be late).
    if (location.hash) {
      const t = document.querySelector(location.hash);
      if (t) setTimeout(() => t.scrollIntoView({ behavior: 'instant', block: 'start' }), 0);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
