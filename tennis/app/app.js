/* Tennis Performance System, Level 2 · app logic.
   A content reader, not a fitness app. Nothing about the player is stored or sent.
   The only preference kept is the chosen version, in localStorage "tps.prefs": { age: "adult" | "u16" }.
   Signed in (the default): the handbook comes from Supabase and is kept on the phone in IndexedDB,
   so it opens with no connection (see "Account and the offline copy" below). ?local=1 or
   ?content=<folder> reads the JSON files next to the app instead (needs a content folder, which the
   website does not have). ?demo=1 is the demo: no sign-in, only the free parts (see "Demo" below).
   Routes are hash-based.
   The demo was built in the website's copy of this file on 2026-09-15, not in the private tps-content
   repo it is deployed from (that repo was not reachable from Amir's PC): copy it into that repo before
   its next deploy, or the deploy erases the demo. After any edit there run: python scripts/stamp_tps_app.py */
(function () {
  'use strict';

  /* ── Helpers ───────────────────────────────────────────────────────── */
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const fa = v => String(v == null ? '' : v).replace(/[0-9]/g, d => FA[d]);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (sel, root) => (root || document).querySelector(sel);
  // Units in dose strings ("2 min", "10 m", "20 s") → Farsi, digits → Persian.
  const faU = s => fa(esc(s)
    .replace(/(\d)\s*min\b/gi, '$1 دقیقه')
    .replace(/(\d)\s*s\b/gi, '$1 ثانیه')
    .replace(/(\d)\s*m\b/gi, '$1 متر')
    .replace(/(\d)\s*kg\b/gi, '$1 کیلوگرم'));
  const PER = { 'each side': 'هر طرف', 'each leg': 'هر پا', 'each arm': 'هر دست', 'per side': 'هر طرف' };
  const faPer = p => (p ? (PER[String(p).toLowerCase()] || esc(p)) : '');
  const norm = s => String(s || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ');

  const PLAN_LABEL = { '2x': '۲ جلسه در هفته', '3x': '۳ جلسه در هفته' };
  const AGE_LABEL = { adult: '۱۶ سال و بالاتر', u16: 'زیر ۱۶ سال' };
  const REGION_FA = { 'ankle-foot': 'مچ پا و پا', 'calf-achilles': 'ساق و آشیل', knee: 'زانو', 'hip-groin': 'لگن و کشاله ران',
    hamstring: 'همسترینگ', 'low-back': 'پایین کمر', trunk: 'تنه', shoulder: 'شانه', 'elbow-forearm-wrist': 'آرنج، ساعد و مچ دست' };
  const IMPACT_FA = { plyometric: 'پرشی', landing: 'فرود (تکنیک)', running: 'دویدن', none: 'بدون ضربه' };
  const GROUPS = [
    { key: 'all', label: 'همه' }, { key: 'W', label: 'گرم کردن' }, { key: 'P', label: 'پرش و توان' },
    { key: 'S', label: 'سرعت و ترمز' }, { key: 'A', label: 'چابکی' }, { key: 'L', label: 'قدرت پا' },
    { key: 'U', label: 'بالاتنه' }, { key: 'R', label: 'مقاوم‌سازی' }, { key: 'C', label: 'مرکز بدن' }, { key: 'K', label: 'آمادگی' }
  ];
  const family = slot => /^W/.test(slot) ? 'f-warm' : /^P/.test(slot) ? 'f-power' : /^(S|A|K)/.test(slot) ? 'f-speed' : 'f-strength';

  /* ── Content + the one stored preference ──────────────────────────── */
  const C = { start: null, programme: null, exercises: {}, learn: null, tests: null };
  const PREF_KEY = 'tps.prefs';
  const readPrefs = () => { try { return JSON.parse(localStorage.getItem(PREF_KEY)); } catch (e) { return null; } };
  const writePrefs = p => { try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) { /* private mode: fine */ } };
  let prefs = readPrefs();
  // ?plan=2x&age=adult presets the version (handy for sharing a link to one version, and for screenshots).
  (() => { const ag = new URLSearchParams(location.search).get('age');
    if (AGE_LABEL[ag]) { prefs = { age: ag }; writePrefs(prefs); } })();
  let draft = prefs ? Object.assign({}, prefs) : { age: null };
  const cur = () => ({ age: (prefs && prefs.age) || 'adult' });

  // ?content=_fixtures loads a test set instead of the real content, and ?local=1 the real files
  // (developer use only: the website has no content folder).
  const qDir = new URLSearchParams(location.search).get('content');
  const CONTENT_DIR = qDir && /^[a-z0-9_-]+$/i.test(qDir) ? qDir : 'content';

  // One content file into C, by file name or by its key (the name without .json), in manifest order.
  function ingest(f, d) {
    if (f.startsWith('start')) C.start = d;
    else if (f.startsWith('programme')) {
      C.programme = C.programme || { blocks: [], weeks: [] };
      if (d.blocks && d.blocks.length) C.programme.blocks = d.blocks;
      Object.keys(d).forEach(k => { if (!['weeks', 'blocks', '_notes'].includes(k)) C.programme[k] = d[k]; });   // e.g. addonGuide
      (d.weeks || []).forEach(w => C.programme.weeks.push(w));
    }
    else if (f.startsWith('exercises')) Object.assign(C.exercises, d.exercises || {});
    else if (f.startsWith('learn')) { C.learn = C.learn || { lessons: [] }; (d.lessons || []).forEach(l => C.learn.lessons.push(l)); }
    else if (f.startsWith('tests')) C.tests = d;
    else if (f.startsWith('library')) C.library = d;   // Amir's exercise library: name -> video URL
  }
  function finishContent() {
    if (C.programme) C.programme.weeks.sort((x, y) => x.week - y.week);
    if (C.library) { C.libIndex = {}; Object.keys(C.library).forEach(k => { if (C.library[k]) C.libIndex[libKey(k)] = C.library[k]; }); }
  }

  async function loadLocalContent() {
    const mr = await fetch(CONTENT_DIR + '/manifest.json', { cache: 'no-store' });
    if (!mr.ok) throw new Error(CONTENT_DIR + '/manifest.json (' + mr.status + ')');
    const man = await mr.json();
    for (const f of man.files) {
      const r = await fetch(CONTENT_DIR + '/' + f, { cache: 'no-store' });
      if (!r.ok) throw new Error(f + ' (' + r.status + ')');
      ingest(f, await r.json());
    }
    finishContent();
  }

  /* ── Account and the offline copy (Supabase + IndexedDB) ───────────── */
  // Signed in (everything except the local modes): the handbook comes from tps_content, one row per
  // content file plus a "manifest" row with the file order. Each row's version is a hash of its body,
  // so an online open downloads only the files that changed, one at a time, and every finished file
  // is kept even if the connection drops halfway. The copy lives in IndexedDB, not localStorage: it is
  // about 2.3 MB, and localStorage is ~5 MB shared by the whole website (program.html, AA Proof).
  // Access is checked on every online open. Offline, the copy on the phone opens with no time limit
  // (Amir: buy once, keep it). A revoked login deletes the copy the next time it is seen online.
  const SB_URL = 'https://bvipfipbdcyqnbczjmaq.supabase.co';
  const SB_KEY = 'sb_publishable_BuDVTTC1E0eg3wc7F1Pcig_1A_tqYCy';   // public key, same as program.html
  const LOGIN_DOMAIN = 'amirardekani.com', LOGIN_PREFIX = 'tps.';
  const NO_ACCESS = 'این حساب به سیستم آمادگی جسمانی تنیس دسترسی ندارد. اگر فکر می‌کنید اشتباه شده، به امیر پیام بدهید.';
  const NO_NET = 'الان ورود ممکن نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.';
  const ACC = { userId: '', username: '' };
  let sbClient = null, READY = false;

  const withTimeout = (p, ms) => Promise.race([p, new Promise(res => setTimeout(() => res(null), ms))]);
  const lsGet = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* full or blocked */ } };
  const showMessage = (h, p) => { view().innerHTML = `<div class="section"><div class="card clay"><h3>${h}</h3><p class="lead">${p}</p></div></div>`; };

  // Every key supabase-js keeps for this app ("tps-auth", and any "tps-auth-…" beside it).
  function clearAuth() {
    try { Object.keys(localStorage).filter(k => /^tps-auth/.test(k)).forEach(k => localStorage.removeItem(k)); } catch (e) { /* blocked */ }
  }
  // The user id of the session supabase-js keeps, readable with no connection.
  function storedUserId() {
    const s = lsGet('tps-auth'), last = lsGet('tps.last');
    return (s && s.user && s.user.id) || (s && last && last.uid) || '';
  }

  // The offline copy: one IndexedDB store, keyed "<user id>/<content key>" -> { version, body }.
  const DOCS = {
    db: null,
    open() {
      return this.db || (this.db = new Promise((res, rej) => {
        const r = indexedDB.open('tps', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('docs');
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }));
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction('docs', mode), req = fn(tx.objectStore('docs'));
        tx.oncomplete = () => res(req.result);
        tx.onerror = tx.onabort = () => rej(tx.error);
      });
    },
    get(uid, key) { return this.run('readonly', st => st.get(uid + '/' + key)); },
    put(uid, key, doc) { return this.run('readwrite', st => st.put(doc, uid + '/' + key)); },
    wipe(uid) { return this.run('readwrite', st => st.delete(IDBKeyRange.bound(uid + '/', uid + '/￿'))); }
  };

  // The Supabase library loads with defer; wait up to ~3 s for it. Its own storage key keeps this app's
  // session apart from program.html's, coach.html's and the testing app's on the same website.
  // ?stub=1 (local testing only) swaps in _dev/stub-supabase.js, a fake backend.
  const sbLib = () => (window.STUB_SUPABASE && new URLSearchParams(location.search).get('stub') === '1') ? window.STUB_SUPABASE : window.supabase;
  async function sbReady() {
    for (let i = 0; i < 120 && !(sbLib() && sbLib().createClient); i++) await new Promise(r => setTimeout(r, 25));
    const lib = sbLib();
    if (!lib || !lib.createClient) return null;
    if (!sbClient) sbClient = lib.createClient(SB_URL, SB_KEY, { auth: { storageKey: 'tps-auth', persistSession: true, autoRefreshToken: true } });
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
        try { localStorage.setItem('tps_last_user', user); } catch (err) { /* storage blocked */ }
        try {
          if (window.PasswordCredential && navigator.credentials && navigator.credentials.store)
            await withTimeout(navigator.credentials.store(new PasswordCredential({ id: user, password: pass })), 1200);
        } catch (err) { /* unsupported or refused: carry on */ }
        btn.textContent = 'وارد شدید';
        setTimeout(() => location.replace(location.pathname + location.search), 400);
      } catch (err) {
        const m = (err && err.message) || '';
        if (/banned/i.test(m)) { const last = lsGet('tps.last'); if (last && last.uid) DOCS.wipe(last.uid).catch(() => {}); }
        errBox.textContent = /banned/i.test(m) ? NO_ACCESS
          : /invalid|credentials/i.test(m) ? 'نام کاربری یا رمز درست نیست. پیامی را که امیر فرستاده بررسی کنید.' : NO_NET;
        errBox.hidden = false; btn.disabled = false; btn.textContent = 'ورود';
      }
    };
  }

  // Signs out on this phone only; the handbook stays here for the next sign-in.
  async function signOut() {
    if (!confirm('از حساب خارج می‌شوید؟ کتاب روی همین گوشی می‌ماند و بعد از ورود دوباره، بدون دانلود دوباره باز می‌شود.')) return;
    try { const sb = await sbReady(); if (sb) await withTimeout(sb.auth.signOut({ scope: 'local' }), 4000); } catch (e) { /* signing out locally is enough */ }
    clearAuth();
    location.replace(location.pathname + location.search);
  }

  // The server says this login is gone or revoked: delete the phone's copy, sign out, say why.
  async function revokeHere(sb, uid) {
    if (uid) { try { await DOCS.wipe(uid); } catch (e) { /* no copy, or storage blocked */ } }
    try { localStorage.removeItem('tps.last'); } catch (e) { /* blocked */ }
    if (sb) await withTimeout(sb.auth.signOut({ scope: 'local' }), 4000);
    clearAuth();
    showSignIn(NO_ACCESS);
  }

  // Brings the phone's copy up to date (when online) and fills C from it.
  // Returns false when there is not yet a complete copy on this phone.
  async function syncContent(sb, uid, online) {
    const local = async key => { try { return await DOCS.get(uid, key); } catch (e) { return null; } };
    const fresh = {};
    let fetched = 0;
    const list = online ? await withTimeout(sb.from('tps_content').select('key, version'), 15000) : null;
    if (list && !list.error && list.data && list.data.length) {
      // The file list comes last, as publish.py sends it: an interrupted download keeps the old list.
      const rows = list.data.filter(r => r.key !== 'manifest').concat(list.data.filter(r => r.key === 'manifest'));
      const need = [];
      for (const r of rows) {
        const d = await local(r.key);
        if (d && d.version === r.version) fresh[r.key] = d; else need.push(r.key);
      }
      for (let i = 0; i < need.length; i++) {
        view().innerHTML = `<div class="loading">در حال دریافت کتاب… ${fa(i + 1)} از ${fa(need.length)}</div>`;
        const got = await withTimeout(sb.from('tps_content').select('key, body, version').eq('key', need[i]).maybeSingle(), 60000);
        if (!got || got.error || !got.data) break;   // the connection dropped: everything finished so far is kept
        fresh[need[i]] = { version: got.data.version, body: got.data.body };
        fetched++;
        try { await DOCS.put(uid, need[i], fresh[need[i]]); } catch (e) { /* storage blocked: this open still works */ }
      }
    }
    const man = fresh.manifest || await local('manifest');
    const files = man && man.body && Array.isArray(man.body.files) ? man.body.files : null;
    if (!files) return false;
    const docs = [];
    for (const key of files) {
      const d = fresh[key] || await local(key);
      if (!d) return false;
      docs.push([key, d.body]);
    }
    docs.forEach(([key, body]) => ingest(key, body));
    finishContent();
    // Ask the browser not to clear the copy when the phone runs low on space.
    if (fetched && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    return true;
  }

  async function bootCloud(startApp) {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { /* the app still works online */ });
    if (window.NEEDS_SIGNIN) { showSignIn(); return; }
    const sb = await sbReady();
    const got = sb ? await withTimeout(sb.auth.getSession(), 8000) : null;
    const session = got && got.data && got.data.session;
    const why = got && got.error ? (got.error.name || '') + ' ' + (got.error.message || '') : '';
    let uid = session ? session.user.id : '';
    if (!session) {
      if (/banned/i.test(why)) { const last = lsGet('tps.last'); await revokeHere(sb, last && last.uid); return; }
      // With no connection supabase-js cannot refresh an expired token, but it keeps the session
      // stored. That is still this buyer, so the copy on the phone opens. A real sign-out removes it.
      const noNet = !sb || !got || /fetch|network|retryable|timeout/i.test(why);
      uid = noNet ? storedUserId() : '';
      if (!uid) { showSignIn(noNet ? NO_NET : ''); return; }
    }
    ACC.userId = uid;
    let online = false;
    if (session) {
      const acct = await withTimeout(sb.from('tps_accounts').select('username, revoked_at').eq('user_id', uid).maybeSingle(), 8000);
      if (acct && !acct.error) {
        if (!acct.data || acct.data.revoked_at) { await revokeHere(sb, uid); return; }
        online = true;
        ACC.username = acct.data.username;
        lsSet('tps.last', { uid, username: ACC.username });
      }
    }
    if (!ACC.username) { const last = lsGet('tps.last'); if (last && last.uid === uid) ACC.username = last.username; }
    if (!(await syncContent(sb, uid, online))) {
      showMessage('کتاب هنوز روی این گوشی نیست', 'بار اول، اپ باید به اینترنت وصل باشد تا کتاب را دریافت کند. اتصال را بررسی کنید و صفحه را دوباره باز کنید.');
      return;
    }
    startApp();
  }

  // The setup page's account card: who is signed in, how to install, and sign-out. Nothing in the local modes.
  function accountBlock() {
    if (window.LOCAL) return '';
    if (DEMO) return `<div class="section"><div class="card clay"><h3>نسخهٔ نمایشی</h3>
      <p class="lead">در نسخهٔ نمایشی فقط بخشی از دوره باز است.</p>${buyActions('setup')}</div></div>`;
    return `<div class="section"><div class="card"><h3>حساب</h3>
      <div class="acct"><span class="who">وارد شده با <b dir="ltr">${esc(ACC.username || '—')}</b></span><button class="btn ghost" data-signout>خروج</button></div>
      <p class="lead" style="margin-top:10px">نصب روی گوشی: در آیفون، در Safari دکمهٔ Share و بعد Add to Home Screen. در اندروید، از منوی ⋮ مرورگر گزینهٔ Install app یا Add to Home screen. کتاب روی همین گوشی می‌ماند و بدون اینترنت هم باز می‌شود.</p></div></div>`;
  }

  /* ── Demo (?demo=1) ────────────────────────────────────────────────── */
  // The link that shows people what the course contains before they buy. No sign-in. tps_demo() in
  // Supabase sends week 1, one test, a few lessons and the exercises week 1 uses, and for everything
  // else only its card (name, icon, one line) marked locked: true. So a lock is real, with nothing
  // behind it on the phone. The picks live in that function (supabase/tps_02_demo.sql), not here.
  // No service worker and no offline copy: the demo needs the connection anyway.
  // This mode, and only this mode, counts anonymous Plausible events (index.html loads the script):
  // Demo opened · Demo failed · Demo locked {kind, item} · Demo buy {from}. Each needs a goal in Plausible.
  const DEMO = !!window.DEMO;
  const COURSE = 'سیستم آمادگی جسمانی تنیس · سطح ۲';   // the name in the product page's buy message (tennis/level-test.js)
  const BUY_URL = 'https://wa.me/447435363461?text=' + encodeURIComponent('سلام امیر، نسخه‌ی نمایشی رو دیدم و می‌خوام «' + COURSE + '» رو بخرم.');
  const LOCK = '<span class="lock" aria-label="قفل">🔒</span>';
  const isLocked = o => !!(o && o.locked);
  const lockedCount = list => list.filter(isLocked).length;
  const openWeeksText = () => fa(((C.programme && C.programme.weeks) || []).map(w => w.week).join('، '));
  function track(name, props) {
    if (!DEMO) return;
    try { window.plausible(name, props ? { props } : undefined); } catch (e) { /* stats are optional */ }
  }

  async function bootDemo(startApp) {
    view().innerHTML = `<div class="loading">در حال باز کردن نسخهٔ نمایشی…</div>`;
    let d = null;
    try {
      const r = await withTimeout(fetch(SB_URL + '/rest/v1/rpc/tps_demo', { method: 'POST', cache: 'no-store',
        headers: { apikey: SB_KEY, 'Content-Type': 'application/json' }, body: '{}' }), 20000);
      if (r && r.ok) d = await withTimeout(r.json(), 20000);
    } catch (e) { /* no connection, or Supabase unreachable: the screen below says so */ }
    if (!d || !d.programme) { track('Demo failed'); demoFailed(); return; }
    ['start', 'programme', 'exercises', 'learn', 'tests', 'library'].forEach(k => { if (d[k]) ingest(k, d[k]); });
    finishContent();
    track('Demo opened');
    startApp();
  }

  function demoFailed() {
    view().innerHTML = banner({ kicker: 'نسخهٔ نمایشی', title: 'الان باز نشد' }) +
      `<div class="section"><div class="card clay"><h3>اتصال برقرار نشد</h3>
        <p class="lead">اینترنت را بررسی کنید و دوباره امتحان کنید. اگر باز نشد، با فیلترشکن امتحان کنید.</p>
        <button class="btn primary" data-retry>دوباره امتحان کنید</button></div>
        <div class="card"><h3>سیستم آمادگی جسمانی تنیس</h3>${buyActions('failed')}</div></div>`;
  }

  // Buy on WhatsApp (the message already typed), read the product page, or sign in if already bought.
  const buyActions = from => `<div class="demo-actions">
      <a class="btn clay" href="${BUY_URL}" target="_blank" rel="noopener" data-buy="${from}">خرید نسخهٔ کامل از واتساپ</a>
      <a class="btn ghost" href="/tennis/">دربارهٔ دوره و قیمت</a>
      <p class="lead">قبلاً خریده‌اید؟ <a class="link-btn" href="./">ورود</a></p></div>`;

  // A locked item: its card, and the way to unlock it. Everything else about it stayed on the server.
  function viewLocked(o) {
    track('Demo locked', { kind: o.kind, item: o.item });
    view().innerHTML = banner({ back: o.back, kicker: '🔒 ' + o.kicker, title: o.title, sub: o.sub || '', art: artFor('locked', '*') }) +
      `<div class="section"><div class="card clay"><h3>این بخش در نسخهٔ کامل باز می‌شود</h3>
        ${o.pills ? `<div class="tags" style="margin:2px 0 8px">${o.pills}</div>` : ''}${o.why ? `<p>${esc(o.why)}</p>` : ''}
        <p class="lead" style="margin-top:8px">${o.line}</p>${buyActions(o.kind)}</div></div>`;
  }

  // The Start page's first card in the demo: what is open, counted from the content itself.
  function demoIntro() {
    const L = (C.learn && C.learn.lessons) || [], T = (C.tests && C.tests.tests) || [];
    return `<div class="card clay"><h3>نسخهٔ نمایشی</h3><p>هفتهٔ ${openWeeksText()} برنامه، ${fa(T.length - lockedCount(T))} آزمون و ${fa(L.length - lockedCount(L))} درس باز است. بقیه قفل است و در نسخهٔ کامل باز می‌شود.</p></div>`;
  }

  /* ── Pictures (the demo) ───────────────────────────────────────────── */
  // Amir's AI pictures for the course (2026-09-19), made in GPT Image 2 and Higgsfield, then graded and
  // exported by scripts/grade_tps_art.py into assets/tps/. The ?art=1 flag they were built behind came off
  // on 2026-09-19, once all 13 of the demo's pictures existed: this is the demo everyone opens now.
  // A picture that fails to load takes its own layer away and leaves the green banner, so a missing file
  // costs nothing.
  //
  // ⚠️ DEMO ONLY, on purpose. A buyer has 22 lessons and 7 tests, and only 3 and 1 of those have a cover,
  // so showing these to buyers would leave most of their app half-illustrated. The demo is exactly the
  // surface these 13 cover. Widen it (ART_ON = true) once the lesson and test covers are done.
  // Every picture has its subject on the LEFT and the right and bottom left calm: this app is
  // right-to-left, so titles sit at the right and the bottom. Keep to that when adding more.
  // Bump ART_V after regrading a file: the site's root worker keeps /assets/ files cache-first, by full URL.
  const ART_ON = DEMO;
  const ART_V = 2;   // rally-map and last-ball were regraded on 2026-09-19
  const ART = {
    block: {                                                               // its cover, on the block card and every week banner inside it
      1: { f: 'first-light', pos: '50% 40%' },
      2: { f: 'morning-load', pos: '50% 45%' },
      3: { f: 'full-acceleration', pos: '50% 45%' },
      4: { f: 'under-lights', pos: '50% 38%' }                             // keeps her lit shoulders in a short crop
    },
    place: {                                                               // session cards, by where the session happens
      gym: { f: 'gym-room', pos: '50% 50%' },
      court: { f: 'court-room', pos: '50% 55%' },
      home: { f: 'home-room', pos: '50% 55%' }
    },
    lesson: {                                                              // by lesson id
      'tennis-demands': { f: 'rally-map', pos: '50% 50%' },
      'read-your-card': { f: 'clock-and-chalk', pos: '50% 50%' },
      'rpe-weights': { f: 'which-one', pos: '50% 55%' },
      'strength': { f: 'the-row', pos: '50% 50%' },
      'jumps-power': { f: 'impact', pos: '50% 50%' },
      'robustness': { f: 'armour', pos: '50% 50%' },
      'warmup-ramp': { f: 'first-turn', pos: '50% 55%' }
    },
    test: { 'broad-jump': { f: 'the-coin', pos: '50% 45%' } },             // by test id
    done: { '*': { f: 'last-ball', pos: '50% 50%' } },                     // the session-complete screen
    locked: { '*': { f: 'under-covers', pos: '50% 55%' } }                 // every locked item's page
  };
  const artFor = (kind, key) => (ART_ON && ART[kind] && ART[kind][key]) || null;
  const artLayer = a => a ? `<div class="ph"><img src="../../assets/tps/${a.f}.webp?v=${ART_V}" alt="" decoding="async" style="object-position:${a.pos || '50% 50%'}" onload="this.classList.add('in')" onerror="var p=this.closest('.has-art');if(p)p.classList.remove('has-art');this.parentNode.remove()"></div>` : '';

  /* ── Small renderers ───────────────────────────────────────────────── */
  const exName = ex => (ex && (ex.nameEn || ex.name)) || '';   // English only (Amir, 2026-09-14)
  // Same loose match as the coaching app: case, accents and punctuation don't matter; words and digits do.
  function libKey(n) { return String(n || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ''); }
  const videoFor = ex => (C.libIndex && C.libIndex[libKey(exName(ex))]) || (ex && ex.video) || '';   // library first (Amir, 2026-09-14)
  const pill = (t, cls) => `<span class="pill ${cls || ''}">${t}</span>`;
  const GEAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>';

  function banner(o) {
    return `<header class="banner ${o.back ? 'has-back' : ''} ${o.art ? 'has-art' : ''}">
      ${artLayer(o.art)}
      ${o.back ? `<button class="back" data-back="${esc(o.back)}" aria-label="بازگشت">→</button>` : ''}
      ${o.gear ? `<a class="gear" href="#/setup" aria-label="تنظیم نسخه">${GEAR}</a>` : ''}
      ${o.kicker ? `<div class="kicker">${o.kicker}</div>` : ''}
      <h1>${o.title}</h1>
      ${o.sub ? `<div class="sub">${o.sub}</div>` : ''}
      ${o.meta ? `<div class="meta">${o.meta}</div>` : ''}
    </header>`;
  }

  function fmtRest(sec) {
    if (!sec) return '';
    if (sec % 60 === 0) return fa(sec / 60) + ' دقیقه';
    if (sec > 60) return fa(Math.floor(sec / 60)) + ':' + fa(String(sec % 60).padStart(2, '0'));
    return fa(sec) + ' ثانیه';
  }
  const mmss = s => fa(Math.floor(s / 60)) + ':' + fa(String(s % 60).padStart(2, '0'));

  const roundName = it => (it && it.roundName) || 'دور';   // e.g. «گیم» for point games
  const totalSets = it => (it.sets || 1) * (it.rounds || 1);
  function dosePills(it) {
    const p = [];
    if (it.rounds && it.sets && it.reps) p.push(pill(fa(it.rounds) + ' ' + roundName(it) + ' × ' + fa(it.sets) + ' × ' + faU(it.reps)));
    else if (it.sets && it.reps) p.push(pill(fa(it.sets) + ' × ' + faU(it.reps) + (it.per ? ' ' + faPer(it.per) : '')));
    else if (it.reps) p.push(pill(faU(it.reps) + (it.per ? ' ' + faPer(it.per) : '')));
    if (it.time) p.push(pill(faU(it.time)));
    if (it.rpe) p.push(pill('RPE ' + fa(it.rpe), 'green'));
    if (it.rest) p.push(pill('استراحت ' + fmtRest(it.rest)));
    if (it.rounds && it.roundRest) p.push(pill('بین ' + roundName(it) + '\u200cها ' + fmtRest(it.roundRest)));
    return p.join('');
  }

  const ytId = u => { const m = String(u || '').match(/(?:v=|youtu\.be\/|shorts\/|embed\/)([A-Za-z0-9_-]{11})/); return m ? m[1] : null; };
  function videoBlock(url) {
    const id = ytId(url);
    if (!id) return '';   // no demo yet: show nothing (Amir, step 2)
    return `<div class="video" data-yt="${id}"><button class="play" aria-label="پخش ویدیو">▶</button>
      <div class="vnote">ویدیو از یوتیوب · در ایران ممکن است فیلترشکن لازم باشد</div></div>`;
  }

  function statsGrid(it) {
    if (!it) return '';
    const timeOnly = it.time && !it.reps;
    return `<div class="stats">
      <div class="stat"><span>${it.rounds ? roundName(it) + ' × تکرار' : 'ست'}</span><b>${it.rounds ? fa(it.rounds) + ' × ' + fa(it.sets || 1) : (it.sets ? fa(it.sets) : '—')}</b></div>
      <div class="stat"><span>${timeOnly ? 'زمان' : 'تکرار'}</span><b>${timeOnly ? faU(it.time) : (it.reps ? faU(it.reps) : '—')}</b></div>
      <div class="stat rpe"><span>RPE</span><b>${it.rpe ? fa(it.rpe) : '—'}</b></div>
      <div class="stat"><span>استراحت</span><b>${it.rest ? fmtRest(it.rest) : '—'}</b></div>
    </div>${it.rounds && it.roundRest ? `<div class="lead" style="margin:6px 2px 0">بین ${roundName(it)}\u200cها: ${fmtRest(it.roundRest)} آرام راه بروید</div>` : ''}${it.per ? `<div class="lead" style="margin:6px 2px 0">${faPer(it.per)}</div>` : ''}`;
  }

  function exFacts(ex, it, opts) {
    const o = opts || {};
    let h = videoBlock(videoFor(ex));
    if (it) h += statsGrid(it);
    if (it && it.note) h += `<div class="note">${esc(it.note)}</div>`;
    if (ex.purpose) h += `<div class="label">چرا این تمرین؟</div><p>${esc(ex.purpose)}</p>`;
    if (ex.tennis) h += `<div class="label">در تنیس</div><p>${esc(ex.tennis)}</p>`;
    if ((ex.cues && ex.cues.length) || ex.avoid) {
      h += `<div class="label">نکته‌های اجرا</div>`;
      (ex.cues || []).forEach(c => { h += `<div class="cue">${esc(c)}</div>`; });
      if (ex.avoid) h += `<div class="cue bad">${esc(ex.avoid)}</div>`;
    }
    if (ex.mistakes && ex.mistakes.length) h += `<div class="label">اشتباه‌های رایج</div><ul class="list">${ex.mistakes.map(m => `<li>${esc(m)}</li>`).join('')}</ul>`;
    if (ex.easier || ex.harder) h += `<div class="label">ساده‌تر یا سخت‌تر</div><div class="alt">
      <div><b>ساده‌تر</b>${esc(ex.easier || '—')}</div><div><b>سخت‌تر</b>${esc(ex.harder || '—')}</div></div>`;
    if (o.full) {
      if (ex.equipment) h += `<div class="label">وسایل</div><p>${esc(ex.equipment)}${ex.noEquipment ? `<br><span class="lead">بدون وسیله: ${esc(ex.noEquipment)}</span>` : ''}</p>`;
      if (ex.tags && ex.tags.length) h += `<div class="label">بخش‌هایی از بدن که درگیر است</div><div class="tags">${ex.tags.map(t => pill(esc(REGION_FA[t] || t))).join('')}${ex.impact ? pill(esc(IMPACT_FA[ex.impact] || ex.impact), 'clay') : ''}</div>`;
    }
    if (ex.u16) h += `<div class="label">زیر ۱۶ سال</div><p>${esc(ex.u16)}</p>`;
    return h;
  }

  const altEx = it => (it && it.alt && C.exercises[it.alt]) || null;   // the other main-lift choice
  const altLine = it => { const a = altEx(it); return a ? `<span class="ex-alt">یا <bdi>${esc(exName(a))}</bdi></span>` : ''; };
  function exRow(it, n) {
    const ex = C.exercises[it.ex] || { name: it.ex, slot: '' };
    return `<div class="ex ${family(ex.slot || '')}">
      <button class="ex-main" aria-expanded="false">
        <span class="ex-num">${fa(n)}</span>
        <span class="ex-body">
          <span class="ex-name"><bdi>${esc(exName(ex))}</bdi></span>${altLine(it)}
          <span class="ex-pills">${dosePills(it)}</span>
        </span>
        <span class="ex-chev">▼</span>
      </button>
      <div class="ex-detail">${exFacts(ex, it)}<p style="margin-top:12px"><a class="link-btn" href="#/exercises/${encodeURIComponent(it.ex)}">صفحهٔ کامل این تمرین</a>${altEx(it) ? ` · <a class="link-btn" href="#/exercises/${encodeURIComponent(it.alt)}"><bdi>${esc(exName(altEx(it)))}</bdi></a>` : ''}</p>${it.test ? `<p><a class="link-btn" href="#/tests/${encodeURIComponent(it.test)}">راهنمای آزمون ←</a></p>` : ''}</div>
    </div>`;
  }

  function setupControls(p) {
    const b = (v, t) => `<button data-k="age" data-v="${v}" class="${p.age === v ? 'on' : ''}">${t}</button>`;
    return `<div class="setup-row"><div class="lbl">چند سالته؟</div>
        <div class="seg">${b('adult', '۱۶ سال و بالاتر')}${b('u16', 'زیر ۱۶ سال')}</div></div>
      <p class="lead" style="margin:6px 0 0">هر هفته ۳ جلسهٔ اصلی داری؛ جلسه‌های انتخابی را بر اساس نیازت اضافه کن.</p>`;
  }
  const versionLine = () => prefs && prefs.age
    ? `<div class="version-line">${pill(AGE_LABEL[prefs.age], 'green')}<a class="link-btn" href="#/setup">تغییر</a></div>`
    : `<div class="card clay"><h3>هنوز نسخه‌ات را انتخاب نکرده‌ای</h3><p>الان نسخهٔ «۱۶ سال و بالاتر» نشان داده می‌شود.</p><p><a class="link-btn" href="#/setup">انتخاب نسخه</a></p></div>`;

  const PLACE = { gym: '🏋️ باشگاه', court: '🎾 زمین تنیس', home: '🏠 خانه' };
  const placePill = (s, cls) => (s && s.place ? pill(PLACE[s.place] || esc(s.place), cls) : '');
  const addonTitle = s => esc(String((s && s.title) || '').replace(/^\+\s*/, ''));   // the app adds its own "+"
  const sessionShort = s => (s.type === 'test' ? 'روز آزمون' : s.kind === 'addon' ? addonTitle(s) : `جلسهٔ ${esc(s.code)}`);

  /* ── Programme lookups ─────────────────────────────────────────────── */
  const blockRange = bl => { const [a, b] = String(bl.weeks).split('-').map(Number); return [a, b || a]; };
  const blockOf = week => (C.programme.blocks || []).find(bl => { const [a, b] = blockRange(bl); return week >= a && week <= b; });
  const weekData = week => (C.programme.weeks || []).find(w => w.week === week);
  function sessionsFor(week) {
    const w = weekData(week); if (!w) return null;
    const v = cur();
    const P = (w.plans || {})[v.age] || {};
    return { w, v, core: P.core || [], addons: P.addons || [] };
  }

  /* ── Views ─────────────────────────────────────────────────────────── */
  const view = () => $('#view');

  function acc(id, cls, title, body, open) {
    return `<div class="acc ${cls || ''} ${open ? 'open' : ''}" id="${id}">
      <button class="acc-head" aria-expanded="${open ? 'true' : 'false'}"><span>${title}</span><span class="chev">▼</span></button>
      <div class="acc-body">${body}</div></div>`;
  }

  function viewStart(anchor) {
    const s = C.start || {};
    const ul = a => `<ul class="list">${(a || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    let h = banner({ kicker: 'کتاب راهنمای آمادگی جسمانی تنیس', title: esc(s.title || ''), sub: esc(s.subtitle || ''), gear: true });
    h += `<div class="section">`;
    if ((s.intro || []).length) h += `<p class="intro">${esc(s.intro[0])}</p>`;
    if (DEMO) h += demoIntro();
    if (!prefs) {
      h += `<div class="card green"><h3>اول نسخهٔ خودت را انتخاب کن</h3><p class="lead">یک بار انتخاب کن؛ هر وقت خواستی عوضش کن. این انتخاب فقط روی همین گوشی می‌ماند.</p>${setupControls(draft)}</div>`;
    } else {
      h += `<div class="card"><h3>نسخهٔ تو</h3>${versionLine()}</div>`;
    }
    h += `<a class="btn primary big" href="#/programme/week/1">▶ شروع هفتهٔ ۱</a>`;
    if (s.safety) {
      const sf = s.safety;
      const body = `${sf.intro ? `<p style="margin-top:10px">${esc(sf.intro)}</p>` : ''}${ul(sf.items)}
        ${(sf.redFlags || []).length ? `<div class="label" style="color:var(--red)">فوراً دست نگه دار و به پزشک مراجعه کن اگر…</div>${ul(sf.redFlags)}` : ''}`;
      h += acc('safety', 'clay', '⚠️ ' + esc(sf.title), body, anchor === 'safety');
    }
    const more = (s.intro || []).slice(1).map(p => `<p style="margin-top:10px">${esc(p)}</p>`).join('');
    const how = (s.howToUse || []).length ? `<div class="grid2">${s.howToUse.map(c => `<div class="card howto"><span class="ic">${esc(c.icon)}</span><h3>${esc(c.title)}</h3><p>${esc(c.text)}</p></div>`).join('')}</div>` : '';
    if (more || how) h += acc('howto', '', '📖 این کتاب چطور کار می‌کند', more + how, anchor === 'howto');
    if (s.u16) h += acc('u16', prefs && prefs.age === 'u16' ? 'clay' : '', '🧒 ' + esc(s.u16.title), ul(s.u16.items), anchor === 'u16');
    if (s.whoFor) h += acc('whofor', '', '🎾 ' + esc(s.whoFor.title), ul(s.whoFor.items), anchor === 'whofor');
    h += `</div>`;
    view().innerHTML = h;
    if (anchor) { const el = document.getElementById(anchor); if (el) el.scrollIntoView({ block: 'start' }); }
  }

  function viewSetup() {
    viewSetupBase();
    const acc = accountBlock();
    if (acc) view().insertAdjacentHTML('beforeend', acc);
  }
  function viewSetupBase() {
    view().innerHTML = banner({ back: '#/start', kicker: 'تنظیم', title: 'نسخهٔ تو', sub: 'برنامه فقط نسخه‌ای را نشان می‌دهد که انتخاب کنی.' }) +
      `<div class="section"><div class="card">${setupControls(draft)}</div>
       <p class="lead">این انتخاب فقط روی همین گوشی ذخیره می‌شود و به هیچ جا فرستاده نمی‌شود. هر وقت خواستی عوضش کن.</p>
       <a class="btn ghost" href="#/programme">رفتن به برنامه</a></div>`;
  }

  function viewProgramme() {
    const P = C.programme;
    let h = banner({ kicker: 'برنامهٔ ۱۶ هفته‌ای · ۴ بلوک', title: 'برنامه', gear: true,
      meta: prefs ? pill(AGE_LABEL[cur().age], 'light') : '' });
    h += `<div class="section">${prefs ? '' : versionLine()}
      <div class="card green"><h3>هر هفته</h3><p>۳ جلسهٔ اصلی: دو جلسه در باشگاه و یک جلسه روی زمین تنیس. اگر لازم داری، جلسه‌های انتخابی را هم اضافه کن.</p></div>`;
    (P.blocks || []).forEach((bl, i) => {
      const [a, b] = blockRange(bl);
      let weeks = '';
      for (let w = a; w <= b; w++) {
        weeks += weekData(w) ? `<a class="week open" href="#/programme/week/${w}">${fa(w)}</a>`
          : DEMO ? `<a class="week locked" href="#/programme/week/${w}" aria-label="هفتهٔ ${fa(w)}، قفل">${fa(w)}</a>`
          : `<span class="week soon" title="به‌زودی">${fa(w)}</span>`;
      }
      const art = artFor('block', i + 1);
      h += `<div class="block-card"><div class="bc-top ${art ? 'has-art' : ''}">${artLayer(art)}<div class="bc-t"><b>بلوک ${fa(i + 1)} · ${esc(bl.name)}</b><span dir="ltr">${esc(bl.nameEn)}</span></div></div>
        <div class="bc-body"><div class="bc-goal">${esc(bl.goal || '')}</div><div class="weeks">${weeks}</div></div></div>`;
    });
    const ready = (P.weeks || []).map(w => w.week);
    h += DEMO ? `<p class="lead">🔒 در نسخهٔ نمایشی فقط هفتهٔ ${openWeeksText()} باز است. همهٔ ۱۶ هفته در نسخهٔ کامل است.</p></div>`
      : ready.length < 16 ? `<p class="lead">در این نسخهٔ نمونه این هفته‌ها آماده است: ${fa(ready.join('، '))}</p></div>` : `</div>`;
    view().innerHTML = h;
  }

  function sessionCard(week, s) {
    const href = `#/programme/week/${week}/${encodeURIComponent(s.code)}`;
    const mins = s.minutes ? pill(fa(s.minutes) + ' دقیقه') : '';
    if (s.type === 'test') {
      return `<a class="session-card test" href="${href}"><div class="sc-top"><div class="sc-code">روز آزمون</div><div class="sc-title">${esc(s.title || '')}</div></div>
        <div class="sc-meta">${placePill(s)}${mins}${pill(fa((s.tests || []).length) + ' آزمون')}</div></a>`;
    }
    const count = (s.groups || []).filter(g => g.slot !== 'W').reduce((n, g) => n + (g.items || []).length, 0);
    const addon = s.kind === 'addon';
    const art = artFor('place', s.place);   // the test day keeps its clay banner: it has no picture yet
    return `<a class="session-card ${addon ? 'addon' : ''}" href="${href}">
      <div class="sc-top ${art ? 'has-art' : ''}">${artLayer(art)}<div class="sc-code">${addon ? '+ ' + addonTitle(s) : 'جلسهٔ ' + esc(s.code)}</div><div class="sc-title">${addon ? esc(s.forWhom || '') : esc(s.title)}</div></div>
      <div class="sc-meta">${placePill(s)}${mins}${count ? pill('گرم کردن + ' + fa(count) + ' تمرین') : ''}</div></a>`;
  }

  function viewWeek(week) {
    const r = sessionsFor(week);
    if (!r && DEMO && blockOf(week)) {
      return viewLocked({ kind: 'week', item: String(week), back: '#/programme', kicker: 'برنامه', title: `هفتهٔ ${fa(week)}`,
        sub: esc('بلوک · ' + (blockOf(week).name || '')),
        line: `در نسخهٔ نمایشی فقط هفتهٔ ${openWeeksText()} باز است. همهٔ ۱۶ هفته، با جلسه‌های اصلی و انتخابی، در نسخهٔ کامل است.` });
    }
    if (!r) { view().innerHTML = banner({ back: '#/programme', title: 'این هفته هنوز آماده نیست' }); return; }
    const bl = blockOf(week) || {};
    let h = banner({ back: '#/programme', kicker: `بلوک · ${esc(bl.name || '')}`, title: `هفتهٔ ${fa(week)}`, sub: esc(r.w.title || ''),
      meta: pill(AGE_LABEL[r.v.age], 'light'), art: artFor('block', (C.programme.blocks || []).indexOf(bl) + 1) });
    h += `<div class="section">${prefs ? '' : versionLine()}`;
    if (r.w.note) h += `<div class="card green"><p>${esc(r.w.note)}</p></div>`;
    h += `<div class="h2">جلسه‌های اصلی</div>`;
    r.core.forEach(s => { h += sessionCard(week, s); });
    if (r.addons.length) {
      const g = C.programme.addonGuide;
      h += `<div class="h2">جلسه‌های انتخابی · بر اساس نیازت</div>`;
      if (g) h += acc('addonguide', '', '🧭 ' + esc(g.title || 'کدام جلسهٔ انتخابی؟'),
        `${g.intro ? `<p style="margin-top:10px">${esc(g.intro)}</p>` : ''}<ul class="list">${(g.rules || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul>${g.note ? `<p class="lead">${esc(g.note)}</p>` : ''}`, false);
      r.addons.forEach(s => { h += sessionCard(week, s); });
    }
    h += `</div>`;
    view().innerHTML = h;
  }

  // The warm-up group (slot W) is ONE card with a tick list (ticks are never saved).
  function warmRows(items, stepMode) {
    return items.map((it, k) => {
      const ex = C.exercises[it.ex] || { name: it.ex };
      const name = stepMode ? `<span class="wname"><bdi>${esc(exName(ex))}</bdi></span>` : `<a class="wname" href="#/exercises/${encodeURIComponent(it.ex)}"><bdi>${esc(exName(ex))}</bdi></a>`;
      return `<div class="wrow ${stepMode && ST.wDone.has(k) ? 'done' : ''}" data-wi="${k}"><button class="wchk" aria-label="انجام شد"></button>${name}<span class="ex-pills">${dosePills(it)}</span></div>`;
    }).join('');
  }
  function warmCard(g) {
    const items = g.items || [];
    return `<div class="ex f-warm warm">
      <button class="ex-main" aria-expanded="false"><span class="ex-num">W</span>
        <span class="ex-body"><span class="ex-name">${esc(g.title)}</span><span class="ex-pills">${pill(fa(items.length) + ' حرکت')}</span></span>
        <span class="ex-chev">▼</span></button>
      <div class="ex-detail"><p class="lead" style="margin-top:10px">حرکت‌ها را به ترتیب انجام بده. تیک زدن فقط برای راحتی خودت است و جایی ذخیره نمی‌شود.</p>
        <div class="wlist">${warmRows(items, false)}</div></div></div>`;
  }

  function findSession(week, code) {
    const r = sessionsFor(week); if (!r) return null;
    const s = r.core.concat(r.addons).find(x => String(x.code) === String(code));
    return s ? { r, s } : null;
  }

  // Test day (replaces the last session of weeks 4, 8, 12 and 16). Links to the test pages.
  function viewTestDay(week, r, s) {
    const T = (C.tests && C.tests.tests) || [];
    let h = banner({ back: `#/programme/week/${week}`, kicker: `هفتهٔ ${fa(week)} · ${AGE_LABEL[r.v.age]}`,
      title: `روز آزمون · ${esc(s.title || '')}`, meta: placePill(s, 'light') + (s.minutes ? pill(fa(s.minutes) + ' دقیقه', 'light') : '') });
    h += `<div class="section">${s.note ? `<div class="card green"><p>${esc(s.note)}</p></div>` : ''}`;
    (s.tests || []).forEach((id, k) => {
      const t = T.find(x => x.id === id);
      const name = t ? t.title : ((s.testTitles || {})[id] || id);
      h += t ? `<a class="list-row" href="#/tests/${encodeURIComponent(id)}"><span class="ex-num">${fa(k + 1)}</span><span class="lr-body"><span class="lr-title">${esc(t.icon || '')} ${esc(name)}</span><br><span class="lr-sub">${esc(t.record || '')}</span></span><span class="lr-go">←</span></a>`
             : `<div class="list-row" style="opacity:.55"><span class="ex-num">${fa(k + 1)}</span><span class="lr-body"><span class="lr-title">${esc(name)}</span><br><span class="lr-sub">راهنمای این آزمون به‌زودی</span></span></div>`;
    });
    h += `<p class="lead" style="margin-top:10px">نتیجه‌ها را روی برگهٔ نتایج بنویس. اینجا چیزی ذخیره نمی‌شود.</p></div>`;
    view().innerHTML = h;
  }

  function viewSession(week, code) {
    const f = findSession(week, code);
    if (!f && DEMO && !weekData(week) && blockOf(week)) return viewWeek(week);   // a locked week
    if (!f) { view().innerHTML = banner({ back: `#/programme/week/${week}`, title: 'این جلسه پیدا نشد' }); return; }
    const { r, s } = f;
    if (s.type === 'test') return viewTestDay(week, r, s);
    let n = 0;
    let h = banner({ back: `#/programme/week/${week}`, kicker: `هفتهٔ ${fa(week)} · ${AGE_LABEL[r.v.age]}`,
      title: s.kind === 'addon' ? `+ ${addonTitle(s)}` : `جلسهٔ ${esc(s.code)} · ${esc(s.title)}`, meta: placePill(s, 'light') + (s.minutes ? pill(fa(s.minutes) + ' دقیقه', 'light') : '') });
    h += `<div class="section">`;
    (s.groups || []).forEach(g => {
      if (g.slot === 'W') { h += warmCard(g); return; }
      h += `<div class="group-title">${g.slot ? `<span class="slot" dir="ltr">${esc(g.slot)}</span>` : ''}${esc(g.title)}</div>`;
      (g.items || []).forEach(it => { n++; h += exRow(it, n); });
    });
    h += `</div><div class="cta-bar"><button class="btn primary" data-step-open="${week}|${esc(s.code)}">▶ شروع جلسه، قدم‌به‌قدم</button></div>`;
    view().innerHTML = h;
  }

  let exFilter = 'all', exQuery = '';
  function exMatches(id, ex) {
    if (exFilter !== 'all' && !String(ex.slot || '').startsWith(exFilter)) return false;
    if (!exQuery) return true;
    const hay = norm([ex.name, ex.nameEn, ex.slotTitle, ex.purpose, (ex.tags || []).map(t => REGION_FA[t] || t).join(' ')].join(' '));
    return norm(exQuery).split(/\s+/).every(q => hay.includes(q));
  }
  function exListHtml() {
    const rows = Object.entries(C.exercises).filter(([id, ex]) => exMatches(id, ex))
      .sort((a, b) => (isLocked(a[1]) - isLocked(b[1])) || String(a[1].slot).localeCompare(String(b[1].slot)));   // demo: open ones first
    if (!rows.length) return `<div class="empty">تمرینی پیدا نشد.</div>`;
    return rows.map(([id, ex]) => `<a class="list-row ${isLocked(ex) ? 'locked' : ''}" href="#/exercises/${encodeURIComponent(id)}">
      <span class="lr-body"><span class="lr-title"><bdi>${esc(exName(ex))}</bdi></span><br><span class="lr-sub">${esc(ex.slotTitle || '')}</span></span>
      <span class="lr-go">${isLocked(ex) ? LOCK : '←'}</span></a>`).join('');
  }
  function viewExercises() {
    const all = Object.values(C.exercises), open = all.filter(ex => !isLocked(ex)).length;
    view().innerHTML = banner({ kicker: 'کتابخانهٔ تمرین‌ها', title: 'تمرین‌ها',
      sub: DEMO ? `${fa(all.length)} تمرین · ${fa(open)} تمرین هفتهٔ ${openWeeksText()} باز است` : `${fa(all.length)} تمرین · جست‌وجو کن یا یک دسته انتخاب کن` }) +
      `<div class="section"><input class="search" id="exq" type="search" placeholder="جست‌وجو: زانو، پرش، اسکوات…" value="${esc(exQuery)}">
       <div class="chips" style="margin-top:10px">${GROUPS.map(g => `<button class="chip ${exFilter === g.key ? 'on' : ''}" data-filter="${g.key}">${g.label}</button>`).join('')}</div>
       <div id="exlist">${exListHtml()}</div></div>`;
  }

  function viewExercise(id) {
    const ex = C.exercises[id];
    if (!ex) { view().innerHTML = banner({ back: '#/exercises', title: 'این تمرین پیدا نشد' }); return; }
    if (isLocked(ex)) return viewLocked({ kind: 'exercise', item: id, back: '#/exercises', kicker: esc(ex.slotTitle || 'تمرین'),
      title: `<bdi>${esc(exName(ex))}</bdi>`, line: 'نکته‌های اجرا و اشتباه‌های رایج این تمرین در نسخهٔ کامل است.' });
    const v = cur(), uses = [];
    const seen = new Set();
    (C.programme.weeks || []).forEach(w => { const P = (w.plans || {})[v.age] || {};
      (P.core || []).concat(P.addons || []).forEach(s => (s.groups || []).forEach(g => (g.items || []).forEach(it => {
        const key = w.week + '|' + s.code;
        if ((it.ex === id || it.alt === id) && !seen.has(key)) { seen.add(key); uses.push({ w: w.week, s }); }
      }))); });
    let h = banner({ back: '#/exercises', kicker: esc(ex.slotTitle || ''), title: `<bdi>${esc(exName(ex))}</bdi>` });
    h += `<div class="section">${exFacts(ex, null, { full: true })}`;
    if (uses.length) {
      h += `<div class="label">در برنامهٔ تو</div>` + uses.map(u =>
        `<a class="list-row" href="#/programme/week/${u.w}/${encodeURIComponent(u.s.code)}"><span class="lr-body"><span class="lr-title">هفتهٔ ${fa(u.w)} · ${sessionShort(u.s)}</span><br><span class="lr-sub">${esc(u.s.title)}</span></span><span class="lr-go">←</span></a>`).join('');
    }
    view().innerHTML = h + `</div>`;
  }

  function viewLearn() {
    const L = ((C.learn && C.learn.lessons) || []).slice().sort((x, y) => (x.order || 999) - (y.order || 999));
    const groups = [];
    L.forEach(l => { const name = l.group || 'درس‌ها'; let g = groups.find(x => x.name === name); if (!g) groups.push(g = { name, items: [] }); g.items.push(l); });
    const card = l => { const art = artFor('lesson', l.id);
      const body = `<h3>${esc(l.icon || '')} ${esc(l.title)}${isLocked(l) ? LOCK : ''}</h3><p>${esc(l.summary || '')}</p>${l.audience ? `<p class="lead" style="margin:4px 0 0">برای: ${esc(l.audience)}</p>` : ''}`;
      return `<a class="card tap ${isLocked(l) ? 'locked' : 'green'} ${art ? 'has-cover' : ''}" href="#/learn/${encodeURIComponent(l.id)}">${art ? `<div class="cover has-art">${artLayer(art)}</div><div class="cbody">${body}</div>` : body}</a>`; };
    view().innerHTML = banner({ kicker: 'درس‌ها', title: 'آموزش', sub: 'هر چیزی که برای تمرین درست باید بدانی، کوتاه و ساده.' }) +
      `<div class="section">${groups.map(g => (groups.length > 1 ? `<div class="h2">${esc(g.name)}</div>` : '') + g.items.map(card).join('')).join('')}</div>`;
  }

  function viewLesson(id) {
    const L = (C.learn && C.learn.lessons) || [], l = L.find(x => x.id === id);
    if (!l) { view().innerHTML = banner({ back: '#/learn', title: 'این درس پیدا نشد' }); return; }
    if (isLocked(l)) return viewLocked({ kind: 'lesson', item: id, back: '#/learn', kicker: 'درس', title: `${esc(l.icon || '')} ${esc(l.title)}`,
      sub: esc(l.summary || ''), line: `این درس و ${fa(lockedCount(L) - 1)} درس دیگر در نسخهٔ کامل است.` });
    let h = banner({ back: '#/learn', kicker: 'درس', title: `${esc(l.icon || '')} ${esc(l.title)}`, sub: esc(l.summary || ''), art: artFor('lesson', id) }) + `<div class="section prose">`;
    (l.sections || []).forEach(sec => {
      if (sec.h) h += `<h3>${esc(sec.h)}</h3>`;
      (sec.p || []).forEach(p => { h += `<p>${esc(p)}</p>`; });
      if (sec.list && sec.list.length) h += `<ul class="list">${sec.list.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
      if (sec.ol && sec.ol.length) h += `<ol class="steps">${sec.ol.map(i => `<li>${esc(i)}</li>`).join('')}</ol>`;
      if (sec.callout) h += `<div class="callout">${esc(sec.callout)}</div>`;
      if (sec.warn) h += `<div class="card warn"><p>${esc(sec.warn)}</p></div>`;
    });
    view().innerHTML = h + `</div>`;
  }

  /* ── The Ceiling (سقف) — copied from program.html, in Farsi. Nothing is saved. ── */
  // RPE 8 on a set of 5 means 2 reps were left, so the set in you was 7.
  //   reps in reserve = 10 − RPE      effective reps = reps + reps in reserve
  // Past 10 effective reps the rep-max maths loses its accuracy, so it says so instead.
  const ORM_MAX_EFFECTIVE = 10;
  const ORM_ROUND_KG = 2.5;   // the smallest real plate jump
  function toNum(v) {
    const t = String(v == null ? '' : v)
      .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
      .replace(/[٫,]/g, '.');
    const m = t.match(/\d+(?:\.\d+)?/);
    const n = m ? parseFloat(m[0]) : NaN;
    return n > 0 ? n : null;
  }
  // Epley on effective reps. A true single at RPE 10 estimates as itself.
  function estimateOneRM(kg, reps, rpe) {
    const w = Number(kg), r = Number(reps), e = Number(rpe);
    if (!(w > 0) || !(r > 0) || !(e > 0)) return null;
    const effective = r + Math.max(0, 10 - e);
    if (effective > ORM_MAX_EFFECTIVE) return null;
    const raw = effective <= 1 ? w : w * (1 + effective / 30);
    return Math.round(raw / ORM_ROUND_KG) * ORM_ROUND_KG;
  }
  function ormQuality(eff) {
    if (eff <= 3) return { label: 'دقیق', cls: 'g1', hint: 'سنگین، و نزدیک به حدت متوقف شدی. بهتر از این نمی‌شود.' };
    if (eff <= 6) return { label: 'خوب', cls: 'g2', hint: 'خوب است. نزدیک‌تر به یک تکرار دقیق‌تر می‌شود، اگر سن و تجربه‌ات اجازه بدهد.' };
    return { label: 'تقریبی', cls: 'g3', hint: 'ست طولانی بود، پس فقط یک راهنمای کلی است. تکرار کمتر دقیق‌تر است، اگر سن و تجربه‌ات اجازه بدهد.' };
  }
  function ormCalc(t) {
    const help = (t.calcHelp || []).map(x => `<p>${x.b ? `<b>${esc(x.b)}</b> ` : ''}${esc(x.t || '')}</p>`).join('');
    const field = (f, label, mode, cls) => `<label class="orm-field ${cls || ''}"><input data-f="${f}" type="text" inputmode="${mode}" autocomplete="off" aria-label="${label}"><span>${label}</span></label>`;
    return `<div class="card orm">
      <h3>${esc(t.calcTitle || 'سقف')}</h3>
      ${t.calcIntro ? `<p class="lead">${esc(t.calcIntro)}</p>` : ''}
      <div class="orm-inputs">${field('kg', 'کیلوگرم', 'decimal')}${field('rp', 'تکرار', 'numeric')}${field('rpe', 'RPE', 'decimal')}</div>
      <div class="orm-out"><b>—</b></div>
      <div class="orm-grade"></div>
      <div class="orm-from">وزنه، تکرار و RPE را وارد کن.</div>
      ${field('bw', 'وزن بدن (اختیاری)', 'decimal', 'wide')}
      <div class="orm-ratio"></div>
      <p class="orm-note">اینجا چیزی ذخیره نمی‌شود. عدد را روی برگهٔ نتایج بنویس.</p>
    </div>` + (help ? acc('ormhelp', '', '❓ ' + esc(t.calcHelpTitle || 'این چطور کار می‌کند؟'), help, false) : '');
  }
  // Live recompute; tells "not filled in yet" apart from "too many reps to be honest about".
  const faN = v => fa(v).replace(/\./g, '٫');   // Persian decimal separator
  function paintOrm(box) {
    const val = f => { const i = $(`input[data-f="${f}"]`, box); return i ? toNum(i.value) : null; };
    const kg = val('kg'), rp = val('rp'), rpe = val('rpe'), bw = val('bw');
    const out = $('.orm-out', box), grade = $('.orm-grade', box), from = $('.orm-from', box), ratio = $('.orm-ratio', box);
    const est = estimateOneRM(kg, rp, rpe);
    if (est == null) {
      out.innerHTML = '<b>—</b>'; grade.textContent = ''; grade.className = 'orm-grade'; ratio.textContent = '';
      if (kg > 0 && rp > 0 && rpe > 0) {
        const rir = Math.max(0, 10 - rpe), eff = rp + rir;
        from.innerHTML = `${faN(rp)} تکرار با ${faN(rir)} تکرار باقی یعنی <b>${faN(eff)} تکرار تا ناتوانی</b>.<br>بیشتر از ${faN(ORM_MAX_EFFECTIVE)}، حساب فقط یک حدس است، نه تخمین. ستی با تکرار کمتر لازم است.`;
      } else from.textContent = 'وزنه، تکرار و RPE را وارد کن.';
      return;
    }
    const rir = Math.max(0, 10 - rpe), eff = rp + rir, q = ormQuality(eff);
    const tank = rir === 0 ? 'هیچ تکراری در تو نمانده بود' : `${faN(rir)} تکرار دیگر در تو مانده بود`;
    out.innerHTML = `<b>≈ ${faN(est)}</b><i>کیلوگرم برای یک تکرار</i>`;
    grade.innerHTML = `${q.label} <em>· چقدر به آن اعتماد کنی</em>`;
    grade.className = 'orm-grade ' + q.cls;
    from.innerHTML = `${tank}<br>${q.hint}`;
    ratio.textContent = bw > 0 ? `یعنی ${faN((est / bw).toFixed(2))} برابر وزن بدنت. در زمین تنیس، قدرت نسبت به جثه از خودِ کیلوها مهم‌تر است.` : '';
  }
  document.addEventListener('input', e => { const box = e.target && e.target.closest && e.target.closest('.orm'); if (box) paintOrm(box); });

  /* ── Yo-Yo IR1 player: beeps on the published timetable (Bangsbo 2008). Nothing is saved. ── */
  // [level, km/h, runs]. One run = 2 × 20 m, then 10 s active recovery (2 × 5 m jog).
  const YOYO_LEVELS = [[5, 10, 1], [9, 12, 1], [11, 13, 2], [12, 13.5, 3], [13, 14, 4],
    [14, 14.5, 8], [15, 15, 8], [16, 15.5, 8], [17, 16, 8], [18, 16.5, 8], [19, 17, 8],
    [20, 17.5, 8], [21, 18, 8], [22, 18.5, 8], [23, 19, 8]];
  const YOYO_RECOVERY = 10, YOYO_COUNTDOWN = 5;
  const faD = v => fa(v).replace(/\./g, '٫');
  const YY = { running: false, ctx: null, gain: null, t0: 0, runs: [], events: [], next: 0, tick: null, lock: null, result: 0, finished: false, armed: 0 };
  function yoyoPlan() {
    const runs = []; let t = YOYO_COUNTDOWN, dist = 0;
    YOYO_LEVELS.forEach(([lv, kmh, n]) => {
      const leg = 72 / kmh;   // seconds per 20 m at this speed
      for (let b = 1; b <= n; b++) {
        dist += 40;
        runs.push({ lv, b, n, kmh, go: t, turn: t + leg, home: t + 2 * leg, dist, newLevel: b === 1 });
        t += 2 * leg + YOYO_RECOVERY;
      }
    });
    return runs;
  }
  function yoyoEvents(runs) {
    const ev = [];
    runs.forEach(r => {
      [3, 2, 1].forEach(k => ev.push({ t: r.go - k, f: 520, d: 0.08, v: 0.25 }));   // get ready
      if (r.newLevel) { ev.push({ t: r.go, f: 1175, d: 0.16, v: 0.9 }); ev.push({ t: r.go + 0.2, f: 1175, d: 0.16, v: 0.9 }); }
      else ev.push({ t: r.go, f: 880, d: 0.3, v: 0.9 });
      ev.push({ t: r.turn, f: 880, d: 0.3, v: 0.9 });
      ev.push({ t: r.home, f: 880, d: 0.3, v: 0.9 });
    });
    return ev.sort((a, b) => a.t - b.t);
  }
  function yyTone(at, freq, dur, vol) {
    const o = YY.ctx.createOscillator(), g = YY.ctx.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(YY.gain);
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
    g.gain.setValueAtTime(vol, at + dur - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.start(at); o.stop(at + dur + 0.02);
  }
  async function yyKeepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) YY.lock = await navigator.wakeLock.request('screen');
      else if (!on && YY.lock) { await YY.lock.release(); YY.lock = null; }
    } catch (e) { /* not supported: fine */ }
  }
  function yyAudio() {
    unlockAudio(); YY.ctx = ST.audio; if (!YY.ctx) return false;
    YY.gain = YY.ctx.createGain(); YY.gain.gain.value = 1; YY.gain.connect(YY.ctx.destination);
    return true;
  }
  function yyTestSound() {
    if (!yyAudio()) return;
    const now = YY.ctx.currentTime + 0.05;
    [0, 0.45, 0.9].forEach(k => yyTone(now + k, 880, 0.3, 0.9));
  }
  function yyState(now) {
    const R = YY.runs;
    if (now < R[0].go) return { phase: 'count', left: R[0].go - now, r: R[0], done: 0 };
    let i = 0; while (i + 1 < R.length && R[i + 1].go <= now) i++;
    const r = R[i], done = now >= r.home ? i + 1 : i;
    if (now < r.turn) return { phase: 'out', left: r.turn - now, r, done };
    if (now < r.home) return { phase: 'back', left: r.home - now, r, done };
    const nx = R[i + 1];
    return { phase: 'rest', left: nx ? nx.go - now : 0, r: nx || r, next: !!nx, done };
  }
  const yyLevelText = (r, next) => `${next ? 'بعدی: ' : ''}سطح ${fa(r.lv)} · رفت‌وبرگشت ${fa(r.b)} از ${fa(r.n)}`;
  function yyPaint(now) {
    const el = $('#yoyo'); if (!el || !YY.running) return;
    const st = yyState(now);
    const label = { count: 'آماده، پشت خط شروع', out: 'بدو تا خط ۲۰ متر', back: 'برگرد به خط شروع', rest: 'ریکاوری: آرام تا خط ۵ متر و برگرد' }[st.phase];
    el.dataset.phase = st.phase;
    $('.yy-phase', el).textContent = label;
    $('.yy-left', el).textContent = faD(Math.max(0, st.left).toFixed(1));
    $('.yy-level', el).textContent = yyLevelText(st.r, st.phase === 'rest' && st.next);
    $('.yy-speed', el).textContent = `${faD(st.r.kmh)} کیلومتر بر ساعت`;
    $('.yy-dist', el).textContent = `${fa(st.done * 40)} متر`;
  }
  function yyLoop() {
    if (!YY.running) return;
    const now = YY.ctx.currentTime - YY.t0;
    while (YY.next < YY.events.length && YY.events[YY.next].t < now + 1.5) {
      const e = YY.events[YY.next++];
      if (e.t >= now - 0.05) yyTone(YY.t0 + e.t, e.f, e.d, e.v);
    }
    yyPaint(now);
    if (now > YY.runs[YY.runs.length - 1].home + 1) yyStop(true);
  }
  function yyStart() {
    if (!yyAudio()) return;
    YY.runs = yoyoPlan(); YY.events = yoyoEvents(YY.runs); YY.next = 0;
    YY.t0 = YY.ctx.currentTime + 0.3; YY.running = true; YY.finished = false; YY.armed = 0;
    yyKeepAwake(true);
    YY.tick = setInterval(yyLoop, 100); yyLoop();
  }
  // After the second miss, the last run whose end beep has passed was the missed one: count one less.
  function yyStop(finished) {
    if (!YY.running) return;
    const now = YY.ctx.currentTime - YY.t0;
    YY.running = false; clearInterval(YY.tick); YY.tick = null;
    try { YY.gain.gain.setValueAtTime(0, YY.ctx.currentTime); YY.gain.disconnect(); } catch (e) { /* already gone */ }
    yyKeepAwake(false);
    const done = now < YY.runs[0].go ? 0 : yyState(now).done;
    YY.finished = !!finished;
    YY.result = finished ? done : Math.max(0, done - 1);
    yyRenderResult();
  }
  function yyShell(inner, closable) {
    let el = $('#yoyo');
    if (!el) { el = document.createElement('div'); el.id = 'yoyo'; el.className = 'yoyo'; document.body.appendChild(el); }
    el.hidden = false; el.dataset.phase = ''; document.body.style.overflow = 'hidden';
    el.innerHTML = (closable ? `<div class="yy-top"><button class="yy-x" data-yy="close" aria-label="بستن">✕</button></div>` : '') + `<div class="yy-body">${inner}</div>`;
  }
  function yyOpen() {
    yyShell(`<div class="yy-level">آزمون یو-یو (Yo-Yo IR1)</div>
      <div class="yy-phase">پشت خط شروع بایست</div>
      <p class="yy-hint">صدای گوشی را تا آخر زیاد کن و صدا را امتحان کن. صفحه تا آخر آزمون روشن می‌ماند؛ از این صفحه بیرون نرو. کمک‌کننده اخطارها را می‌شمارد و بعد از دومین دیر رسیدن، «پایان آزمون» را دو بار می‌زند.</p>
      <button class="btn ghost" data-yy="testsound">🔊 امتحان صدا</button>
      <button class="btn primary" data-yy="start">▶ شروع آزمون</button>`, true);
  }
  function yyRenderRunning() {
    yyShell(`<div class="yy-level"></div><div class="yy-speed"></div>
      <div class="yy-left"></div><div class="yy-phase"></div>
      <div class="yy-dist-l">مسافتِ تمام‌شده</div><div class="yy-dist"></div>
      <button class="btn stop" data-yy="stop">⏹ پایان آزمون</button>`, false);
  }
  function yyRenderResult() {
    const R = YY.runs, n = YY.result, r = n > 0 ? R[n - 1] : null, dist = n * 40;
    yyShell(`<div class="yy-phase">${YY.finished ? 'همهٔ سطح‌ها تمام شد!' : 'آزمون تمام شد'}</div>
      <p class="yy-hint">مسافت را روی آخرین رفت‌وبرگشتی بگذار که سر وقت تمام شد.</p>
      <div class="yy-adj"><button data-yy="minus" aria-label="۴۰ متر کمتر">− ۴۰</button><div class="yy-big">${fa(dist)}<small> متر</small></div><button data-yy="plus" aria-label="۴۰ متر بیشتر">+ ۴۰</button></div>
      <div class="yy-level">${r ? `آخرین سطح: ${fa(r.lv)}٫${fa(r.b)}` : 'هنوز هیچ رفت‌وبرگشتی تمام نشده'}</div>
      ${r ? `<div class="yy-vo2">VO2max تخمینی ≈ ${faD((dist * 0.0084 + 36.4).toFixed(1))}</div><div class="yy-unit">میلی‌لیتر اکسیژن برای هر کیلوگرم در دقیقه</div>` : ''}
      <p class="yy-note">این تخمین از فرمول Bangsbo است و برای یک نفر ممکن است چند واحد اشتباه باشد. برای مقایسه با خودت، مسافت را بنویس. اینجا چیزی ذخیره نمی‌شود.</p>
      <button class="btn primary" data-yy="close">بستن</button>`, true);
  }
  const yoyoCard = () => `<div class="card yy-card"><h3>🔊 صدای آزمون</h3><p>بوق‌ها طبق جدول منتشرشدهٔ Yo-Yo IR1 پخش می‌شوند: هر رفت‌وبرگشت ۲ × ۲۰ متر، بعد ۱۰ ثانیه ریکاوری، و هر سطح سریع‌تر. در پایان، مسافت و VO2max تخمینی را نشان می‌دهد. چیزی ذخیره نمی‌شود.</p><button class="btn primary" data-yy="open">▶ باز کردن صفحهٔ آزمون</button></div>`;
  document.addEventListener('click', e => {
    const b = e.target && e.target.closest && e.target.closest('[data-yy]'); if (!b) return;
    const a = b.dataset.yy;
    if (a === 'open') yyOpen();
    else if (a === 'testsound') yyTestSound();
    else if (a === 'start') { yyRenderRunning(); yyStart(); }
    else if (a === 'stop') {
      // Two taps, so a brush against the screen can't end a test.
      if (YY.armed && Date.now() - YY.armed < 3000) { YY.armed = 0; yyStop(false); }
      else { YY.armed = Date.now(); b.textContent = 'برای پایان، دوباره بزن'; setTimeout(() => { if (YY.running && b.isConnected) b.textContent = '⏹ پایان آزمون'; }, 3000); }
    }
    else if (a === 'minus' || a === 'plus') { YY.result = Math.min(YY.runs.length, Math.max(0, YY.result + (a === 'plus' ? 1 : -1))); yyRenderResult(); }
    else if (a === 'close' && !YY.running) { const el = $('#yoyo'); if (el) { el.hidden = true; el.innerHTML = ''; } document.body.style.overflow = ''; }
  });
  document.addEventListener('visibilitychange', () => {
    if (!YY.running || document.visibilityState !== 'visible') return;
    yyKeepAwake(true); if (YY.ctx && YY.ctx.state === 'suspended') YY.ctx.resume();
  });

  const ulist = a => (a && a.length) ? `<ul class="list">${a.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : '';
  const olist = a => (a && a.length) ? `<ol class="steps">${a.map(i => `<li>${esc(i)}</li>`).join('')}</ol>` : '';

  function testDayBody(D) {
    let b = '';
    if (D.intro) b += `<p>${esc(D.intro)}</p>`;
    if (D.ready) b += `<div class="label">فقط اگر همهٔ این‌ها درست است، امروز آزمون بده</div>${ulist(D.ready)}`;
    if (D.readyNote) b += `<p class="lead">${esc(D.readyNote)}</p>`;
    if (D.order) b += `<div class="label">ترتیب و استراحت</div>${olist(D.order)}`;
    if (D.orderNote) b += `<p class="lead">${esc(D.orderNote)}</p>`;
    if (D.warmup) b += `<div class="label">گرم کردن روز آزمون · هر بار همین، به همین ترتیب</div>${ulist(D.warmup)}`;
    if (D.split) b += `<p>${esc(D.split)}</p>`;
    return b;
  }

  function viewTests() {
    const T = (C.tests && C.tests.tests) || [], D = C.tests && C.tests.day;
    const card = t => { const art = artFor('test', t.id);
      const body = `<h3>${esc(t.icon || '')} ${esc(t.title)}${isLocked(t) ? LOCK : ''}</h3>${t.badge ? pill(esc(t.badge)) : ''}<p>${esc(t.why || '')}</p>`;
      return `<a class="card tap ${isLocked(t) ? 'locked' : 'green'} ${art ? 'has-cover' : ''}" href="#/tests/${encodeURIComponent(t.id)}">${art ? `<div class="cover has-art">${artLayer(art)}</div><div class="cbody">${body}</div>` : body}</a>`; };
    const onDay = T.filter(t => !t.optional), extra = T.filter(t => t.optional);
    let h = banner({ kicker: 'آزمون‌های ساده', title: 'آزمون', sub: 'با متر، کرنومتر و یک همراه. ببین تمرین‌ها جواب می‌دهند یا نه.' }) +
      `<div class="section"><div class="card"><h3>چرا آزمون می‌دهیم؟</h3><p>قبل از شروع، و در هفتهٔ کم‌حجم هر بلوک (هفته‌های ۴، ۸، ۱۲ و ۱۶)، چند آزمون ساده بده. اگر هر بار شرایط را یکسان نگه داری، می‌بینی بدنت واقعاً بهتر می‌شود یا نه. آزمون اختیاری است؛ برنامه بدون آن هم کار می‌کند.</p></div>`;
    if (D) h += acc('testday', '', '📋 ' + esc(D.title || 'روز آزمون'), testDayBody(D), false);
    if (onDay.length) h += `<div class="h2">روز آزمون · به همین ترتیب</div>${onDay.map(card).join('')}`;
    if (extra.length) h += `<div class="h2">بیرون از روز آزمون</div>${extra.map(card).join('')}`;
    view().innerHTML = h + `</div>`;
  }

  function viewTest(id) {
    const T = (C.tests && C.tests.tests) || [], t = T.find(x => x.id === id);
    if (!t) { view().innerHTML = banner({ back: '#/tests', title: 'این آزمون پیدا نشد' }); return; }
    if (isLocked(t)) return viewLocked({ kind: 'test', item: id, back: '#/tests', kicker: 'آزمون', title: `${esc(t.icon || '')} ${esc(t.title)}`,
      why: t.why, pills: (t.player ? pill('🔊 صدای آزمون داخل اپ', 'green') : '') + (t.calc ? pill('🧮 ماشین‌حساب سقف داخل اپ', 'green') : ''),
      line: `این آزمون و ${fa(lockedCount(T) - 1)} آزمون دیگر، با راهنمای کامل و برگهٔ نتایج، در نسخهٔ کامل است.` });
    const sh = t.sheet || {};
    const cols = sh.cols || ['تلاش ۱', 'تلاش ۲', 'تلاش ۳', 'عدد نهایی'];
    const rows = sh.rows || ['هفتهٔ ۰ · روز اول', 'هفتهٔ ۰ · روز دوم', 'هفتهٔ ۴', 'هفتهٔ ۸', 'هفتهٔ ۱۲', 'هفتهٔ ۱۶'];
    let h = banner({ back: '#/tests', kicker: t.badge ? `آزمون · ${esc(t.badge)}` : 'آزمون', title: `${esc(t.icon || '')} ${esc(t.title)}`, art: artFor('test', id) }) + `<div class="section prose">`;
    if (t.why) h += `<h3>چرا این آزمون؟</h3><p>${esc(t.why)}</p>`;
    if (t.caution) h += `<div class="card warn"><h3>${esc(t.cautionTitle || 'احتیاط')}</h3><p>${esc(t.caution)}</p></div>`;
    if (t.rmGuide) h += `<h3>${esc(t.rmTitle || 'کدام RM؟')}</h3><div class="table-wrap"><table class="rmg"><thead><tr><th>شما</th><th>آزمون</th><th>برچسب</th></tr></thead><tbody>${t.rmGuide.map(r => `<tr><td>${esc(r.who)}</td><td><bdi>${esc(r.rm)}</bdi></td><td>${esc(r.note || '')}</td></tr>`).join('')}</tbody></table></div>`;
    if (t.rmWhy) h += t.rmWhy.map(x => `<p>${x.b ? `<b>${esc(x.b)}</b> ` : ''}${esc(x.t || '')}</p>`).join('');
    if (t.equipment) h += `<h3>وسایل</h3>${ulist(t.equipment)}`;
    if (t.setup) h += `<h3>آماده‌سازی</h3>${olist(t.setup)}`;
    if (t.helper) h += `<div class="card green"><h3>${esc(t.helperTitle || 'کار همراه تو')}</h3><p>${esc(t.helper)}</p></div>`;
    if (t.steps) h += `<h3>انجام آزمون</h3>${olist(t.steps)}`;
    if (t.tries) h += `<h3>چند بار؟</h3><p>${esc(t.tries)}</p>`;
    if (t.record) h += `<div class="callout">چه عددی یادداشت کنی: ${esc(t.record)}</div>`;
    if (t.calc === 'one-rep-max') h += ormCalc(t);
    if (t.player === 'yo-yo-ir1') h += yoyoCard();
    if (t.mistakes) h += `<h3>اشتباه‌هایی که نتیجه را خراب می‌کند</h3>${ulist(t.mistakes)}`;
    if (t.standard) h += `<h3>هر بار یکسان</h3>${ulist(t.standard)}`;
    if (t.clearChange) h += `<h3>${esc(t.clearTitle || 'تغییر واقعی چقدر است؟')}</h3><div class="callout">${esc(t.clearChange)}</div>`;
    if (t.when) h += `<h3>کِی آزمون بدهی؟</h3><p>${esc(t.when)}</p>`;
    h += `<h3>برگهٔ نتایج</h3><p class="lead">این جدول را روی کاغذ بکش یا چاپ کن. اینجا چیزی ذخیره نمی‌شود.</p>
      <div class="table-wrap"><table class="sheet"><thead><tr><th>${esc(sh.first || 'روز')}</th>${cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr><td>${esc(r)}</td>${cols.map(() => '<td></td>').join('')}</tr>`).join('')}</tbody></table></div>
      <button class="btn ghost" style="margin-top:12px" data-print>چاپ این صفحه</button>`;
    view().innerHTML = h + `</div>`;
  }

  /* ── Step-by-step mode ─────────────────────────────────────────────── */
  const ST = { open: false, week: 0, s: null, items: [], i: 0, set: 1, phase: 'work', end: 0, total: 0, tick: null, lock: null, audio: null };
  const stepEl = () => $('#step');

  function openStep(week, code, startAt) {
    const f = findSession(week, code); if (!f || f.s.type === 'test') return;
    ST.open = true; ST.week = week; ST.s = f.s; ST.i = 0; ST.set = 1; ST.phase = 'work';
    ST.items = [];
    (f.s.groups || []).forEach(g => {
      if (g.slot === 'W') { ST.items.push({ warm: true, g }); return; }
      (g.items || []).forEach(it => ST.items.push({ g, it, ex: C.exercises[it.ex] || { name: it.ex } }));
    });
    ST.wEnd = null; ST.wLeft = null; ST.wDone = new Set();
    ST.i = Math.min(Math.max(startAt || 0, 0), Math.max(ST.items.length - 1, 0));
    stepEl().hidden = false; document.body.style.overflow = 'hidden';
    keepAwake(true);
    renderStep();
  }
  function closeStep() {
    stopTick(); keepAwake(false);
    ST.open = false; stepEl().hidden = true; stepEl().innerHTML = ''; document.body.style.overflow = '';
  }
  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator) ST.lock = await navigator.wakeLock.request('screen');
      else if (!on && ST.lock) { await ST.lock.release(); ST.lock = null; }
    } catch (e) { /* not supported or refused: fine */ }
  }
  document.addEventListener('visibilitychange', () => { if (ST.open && document.visibilityState === 'visible') { keepAwake(true); if (ST.phase === 'rest') tickRest(); else if (ST.wEnd) tickWarm(); } });

  function beep() {
    try {
      const a = ST.audio || (ST.audio = new (window.AudioContext || window.webkitAudioContext)());
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
  const unlockAudio = () => { try { if (!ST.audio) ST.audio = new (window.AudioContext || window.webkitAudioContext)(); if (ST.audio.state === 'suspended') ST.audio.resume(); } catch (e) { } };

  function stopTick() { if (ST.tick) { clearInterval(ST.tick); ST.tick = null; } }
  function startRest(sec) {
    ST.phase = 'rest'; ST.total = sec; ST.end = Date.now() + sec * 1000;
    stopTick(); ST.tick = setInterval(tickRest, 250); renderStep();
  }
  function tickRest() {
    const left = Math.max(0, Math.ceil((ST.end - Date.now()) / 1000));
    const t = $('.ring .time', stepEl()), c = $('.ring .prog', stepEl());
    if (t) t.textContent = mmss(left);
    if (c) { const L = 2 * Math.PI * 85; c.style.strokeDashoffset = String(L * (1 - left / Math.max(ST.total, 1))); }
    if (left <= 0) { stopTick(); beep(); ST.phase = 'work'; ST.set++; renderStep(); }
  }

  function nextExercise() { stopTick(); ST.wEnd = null; ST.wLeft = null; ST.wDone = new Set(); ST.phase = 'work'; ST.set = 1; if (ST.i < ST.items.length - 1) ST.i++; else ST.phase = 'done'; renderStep(); }
  function prevExercise() { stopTick(); ST.wEnd = null; ST.wLeft = null; ST.wDone = new Set(); ST.phase = 'work'; ST.set = 1; if (ST.i > 0) ST.i--; renderStep(); }
  function setDone() {
    unlockAudio();
    const e = ST.items[ST.i];
    if (e.warm) { nextExercise(); return; }
    const { it } = e;
    const sets = totalSets(it);
    const between = it.rounds && ST.set % (it.sets || 1) === 0;   // end of a round: the longer walk
    const rest = between ? (it.roundRest || it.rest) : it.rest;
    if (ST.set < sets) { if (rest) startRest(rest); else { ST.set++; renderStep(); } }
    else nextExercise();
  }

  const warmSeconds = g => {
    const t = String(g.title || '').replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
    const m = t.match(/(\d+)\s*(دقیقه|min)/);
    return (m ? +m[1] : 10) * 60;
  };
  function warmLeft(total) {
    if (ST.wEnd) return Math.max(0, Math.ceil((ST.wEnd - Date.now()) / 1000));
    return ST.wLeft != null ? ST.wLeft : total;
  }
  function toggleWarm() {
    unlockAudio();
    const e = ST.items[ST.i]; if (!e || !e.warm) return;
    const total = warmSeconds(e.g);
    if (ST.wEnd) { ST.wLeft = warmLeft(total); ST.wEnd = null; stopTick(); }
    else { let left = warmLeft(total); if (left <= 0) left = total; ST.wEnd = Date.now() + left * 1000; ST.wLeft = null; stopTick(); ST.tick = setInterval(tickWarm, 250); }
    renderStep();
  }
  function tickWarm() {
    const e = ST.items[ST.i]; if (!e || !e.warm || !ST.wEnd) return;
    const total = warmSeconds(e.g), left = warmLeft(total);
    const t = $('.ring .time', stepEl()), c = $('.ring .prog', stepEl());
    if (t) t.textContent = mmss(left);
    if (c) c.style.strokeDashoffset = String(2 * Math.PI * 85 * (1 - left / total));
    if (left <= 0) { stopTick(); ST.wEnd = null; ST.wLeft = 0; beep(); renderStep(); }
  }
  function renderWarmStep(top) {
    const e = ST.items[ST.i], items = e.g.items || [], total = warmSeconds(e.g), left = warmLeft(total);
    const L = 2 * Math.PI * 85;
    const label = ST.wEnd ? '❚❚ مکث' : left === 0 ? '↻ دوباره' : left < total ? '▶ ادامه' : `▶ شروع ${fa(Math.round(total / 60))} دقیقه`;
    stepEl().innerHTML = top + `<div class="step-body">
        <div class="step-slot">W</div><div class="step-name">${esc(e.g.title)}</div>
        <div class="rest" style="padding-top:2px">
          <div class="ring"><svg viewBox="0 0 190 190"><circle class="track" cx="95" cy="95" r="85"/><circle class="prog" cx="95" cy="95" r="85" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - left / total)}"/></svg><div class="time">${mmss(left)}</div></div>
          <div class="rest-actions"><button data-step="wtimer">${label}</button></div></div>
        <div class="label">حرکت‌ها</div><div class="wlist">${warmRows(items, true)}</div>
      </div>
      <div class="step-foot"><button class="btn primary" data-step="done">✓ گرم کردن تمام شد · بعدی</button>
        <div class="step-nav"><button class="btn ghost" data-step="prev" ${ST.i === 0 ? 'disabled style="opacity:.4"' : ''}>→ قبلی</button><button class="btn ghost" data-step="next">بعدی ←</button></div></div>`;
  }

  function renderStep() {
    const n = ST.items.length;
    const top = `<div class="step-top"><div class="row"><button class="x" data-step="close" aria-label="بستن">✕</button>
      <div class="where">هفتهٔ ${fa(ST.week)} · ${sessionShort(ST.s)} · ${ST.phase === 'done' ? 'تمام شد' : `تمرین ${fa(ST.i + 1)} از ${fa(n)}`}</div></div>
      <div class="bar"><i style="width:${ST.phase === 'done' ? 100 : Math.round((ST.i / n) * 100)}%"></i></div></div>`;
    if (ST.phase === 'done') {
      const dart = artFor('done', '*');
      stepEl().innerHTML = top + `<div class="step-body"><div class="done-screen">${dart ? `<div class="done-art has-art">${artLayer(dart)}</div>` : `<div class="big">🎾</div>`}<h2>جلسه تمام شد</h2>
        <p>آفرین. چیزی ذخیره نمی‌شود؛ هر وقت خواستی جلسهٔ بعدی را از برنامه باز کن.</p></div></div>
        <div class="step-foot"><button class="btn primary" data-step="close">بستن</button></div>`;
      return;
    }
    if (ST.items[ST.i].warm) { renderWarmStep(top); return; }
    const { g, it, ex } = ST.items[ST.i];
    const per = it.sets || 1, R = it.rounds || 0, sets = R ? totalSets(it) : (it.sets || 0);
    const pos = k => ({ r: Math.ceil(k / per), k: ((k - 1) % per) + 1 });
    const setText = k => R ? `${roundName(it)} ${fa(pos(k).r)} از ${fa(R)} · تکرار ${fa(pos(k).k)} از ${fa(per)}` : `ست ${fa(k)} از ${fa(sets)}`;
    const curDot = R ? pos(ST.set).k : ST.set;
    if (ST.phase === 'rest') {
      const L = 2 * Math.PI * 85;
      const nextLabel = `${setText(ST.set + 1)} · <bdi>${esc(exName(ex))}</bdi>`;
      stepEl().innerHTML = top + `<div class="step-body"><div class="rest"><div class="rest-label">${R && ST.set % per === 0 ? `استراحت بین ${roundName(it)}\u200cها · آرام راه بروید` : 'استراحت'}</div>
        <div class="ring"><svg viewBox="0 0 190 190"><circle class="track" cx="95" cy="95" r="85"/><circle class="prog" cx="95" cy="95" r="85" stroke-dasharray="${L}" stroke-dashoffset="0"/></svg><div class="time">${mmss(ST.total)}</div></div>
        <div class="rest-actions"><button data-step="add15">+۱۵ ثانیه</button><button data-step="skip">رد کردن استراحت</button></div>
        <p class="lead" style="margin-top:16px">بعدی: ${nextLabel}</p></div></div>`;
      tickRest();
      return;
    }
    const dots = sets > 1 ? `<div class="set-dots">${Array.from({ length: R ? per : sets }, (_, k) => `<i class="${k + 1 < curDot ? 'done' : k + 1 === curDot ? 'now' : ''}"></i>`).join('')}</div>
      <div class="set-label">${setText(ST.set)}</div>` : '';
    const cues = (ex.cues || []).slice(0, 3).map(c => `<div class="cue">${esc(c)}</div>`).join('') + (ex.avoid ? `<div class="cue bad">${esc(ex.avoid)}</div>` : '');
    const doneLabel = sets > 1 ? (R ? '✓ تکرار انجام شد' : '✓ ست انجام شد') : '✓ انجام شد · بعدی';
    stepEl().innerHTML = top + `<div class="step-body">
        <div class="step-slot">${esc(g.title || '')}</div>
        <div class="step-name"><bdi>${esc(exName(ex))}</bdi></div>
        ${altEx(it) ? `<div class="step-alt">${altLine(it)}</div>` : ''}
        <div class="step-dose">${dosePills(it)}</div>
        ${dots}
        ${it.note ? `<div class="note">${esc(it.note)}</div>` : ''}
        ${cues ? `<div class="label">نکته‌ها</div>${cues}` : ''}
        ${videoBlock(videoFor(ex))}
      </div>
      <div class="step-foot"><button class="btn primary" data-step="done">${doneLabel}</button>
        <div class="step-nav"><button class="btn ghost" data-step="prev" ${ST.i === 0 ? 'disabled style="opacity:.4"' : ''}>→ قبلی</button><button class="btn ghost" data-step="next">بعدی ←</button></div></div>`;
  }

  /* ── Router + events ───────────────────────────────────────────────── */
  function setTab(tab) {
    const t = tab === 'setup' ? 'start' : tab;
    document.querySelectorAll('#tabs a').forEach(a => a.classList.toggle('active', a.dataset.tab === t));
  }
  function route() {
    if (ST.open) closeStep();
    const parts = (location.hash || '#/start').replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    const [tab, a, b, c, d, e] = parts;
    setTab(tab || 'start');
    window.scrollTo(0, 0);
    switch (tab) {
      case 'setup': return viewSetup();
      case 'programme':
        if (a !== 'week' || !b) return viewProgramme();
        if (!c) return viewWeek(+b);
        viewSession(+b, c);
        if (d === 'step') openStep(+b, c, +e || 0);   // deep link, e.g. #/programme/week/1/A/step/9
        return;
      case 'exercises': return a ? viewExercise(a) : viewExercises();
      case 'learn': return a ? viewLesson(a) : viewLearn();
      case 'tests': return a ? viewTest(a) : viewTests();
      default: return viewStart(a);
    }
  }

  document.addEventListener('click', e => {
    const t = e.target;
    const buy = t.closest('[data-buy]');
    if (buy) { track('Demo buy', { from: buy.dataset.buy }); return; }   // the link itself opens WhatsApp
    if (t.closest('[data-retry]')) { location.reload(); return; }
    const accHead = t.closest('.acc-head');
    if (accHead) { const box = accHead.parentElement; box.classList.toggle('open'); accHead.setAttribute('aria-expanded', box.classList.contains('open')); return; }
    const chk = t.closest('.wchk');
    if (chk) {
      const row = chk.closest('.wrow'); row.classList.toggle('done');
      if (ST.open && ST.wDone) { const k = +row.dataset.wi; if (ST.wDone.has(k)) ST.wDone.delete(k); else ST.wDone.add(k); }
      return;
    }
    const exMain = t.closest('.ex-main');
    if (exMain) { const box = exMain.closest('.ex'); box.classList.toggle('open'); exMain.setAttribute('aria-expanded', box.classList.contains('open')); return; }
    const play = t.closest('.video .play');
    if (play) {
      const v = play.closest('.video');
      v.insertAdjacentHTML('beforeend', `<iframe src="https://www.youtube-nocookie.com/embed/${v.dataset.yt}?autoplay=1&rel=0&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin" title="ویدیو"></iframe>`);
      v.classList.add('playing'); return;
    }
    const seg = t.closest('.seg button');
    if (seg) {
      draft[seg.dataset.k] = seg.dataset.v;
      seg.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === seg));
      if (draft.age) {
        const first = !prefs;
        prefs = { age: draft.age }; writePrefs(prefs);
        if (first && (location.hash || '#/start').startsWith('#/start')) viewStart();
      }
      return;
    }
    if (t.closest('[data-signout]')) { signOut(); return; }
    const back = t.closest('[data-back]');
    if (back) { if (history.length > 1) history.back(); else location.hash = back.dataset.back; return; }
    const filt = t.closest('.chip[data-filter]');
    if (filt) { exFilter = filt.dataset.filter; document.querySelectorAll('.chip[data-filter]').forEach(x => x.classList.toggle('on', x === filt)); $('#exlist').innerHTML = exListHtml(); return; }
    if (t.closest('[data-print]')) { window.print(); return; }
    const so = t.closest('[data-step-open]');
    if (so) { const [w, code] = so.dataset.stepOpen.split('|'); unlockAudio(); openStep(+w, code); return; }
    const st = t.closest('[data-step]');
    if (st) {
      const act = st.dataset.step;
      if (act === 'close') closeStep();
      else if (act === 'done') setDone();
      else if (act === 'next') nextExercise();
      else if (act === 'prev') prevExercise();
      else if (act === 'skip') { stopTick(); ST.phase = 'work'; ST.set++; renderStep(); }
      else if (act === 'add15') { ST.end += 15000; ST.total += 15; tickRest(); }
      else if (act === 'wtimer') toggleWarm();
    }
  });
  document.addEventListener('input', e => { if (e.target.id === 'exq') { exQuery = e.target.value; $('#exlist').innerHTML = exListHtml(); } });
  window.addEventListener('hashchange', () => { if (READY) route(); });

  const startApp = () => { READY = true; route(); };
  document.querySelectorAll('a[data-buy]').forEach(a => { a.href = BUY_URL; });   // the demo bar in index.html
  (window.LOCAL ? loadLocalContent().then(startApp) : DEMO ? bootDemo(startApp) : bootCloud(startApp)).catch(err => {
    view().innerHTML = `<div class="section"><div class="card clay"><h3>محتوا بارگذاری نشد</h3><p class="lead" dir="ltr">${esc(err.message)}</p></div></div>`;
  });
})();
