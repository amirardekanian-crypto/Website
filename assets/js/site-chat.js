/* The website chatbot's bubble (2026-10-17). One script, no dependencies, its own styles.
 *
 *   <script src="/assets/js/site-chat.js?v=1" data-site="en" defer></script>   English pages
 *   <script src="/assets/js/site-chat.js?v=1" data-site="fa" defer></script>   Farsi pages (right to left)
 *
 * Each visitor message goes to the Edge Function site-chat (supabase/functions/site-chat), which keeps the
 * conversation, asks Claude and answers from Content/CHATBOT-FACTS.md. The page keeps only this tab's copy of
 * the chat (sessionStorage), so moving between pages keeps it and closing the tab ends it.
 * A reply can carry a handoff: "whatsapp" draws a WhatsApp button pre-filled with the visitor's question,
 * "apply" draws the Apply / شروع کن button. Bump ?v= on every page after changing this file (sw.js serves
 * /assets/ cache-first by URL).
 */
(function () {
  'use strict';
  if (window.__aaChat) return;
  window.__aaChat = true;

  var me = document.currentScript;
  var SITE = (me && me.getAttribute('data-site')) === 'fa' ? 'fa' : 'en';
  var FA = SITE === 'fa';
  var URL_FN = 'https://bvipfipbdcyqnbczjmaq.supabase.co/functions/v1/site-chat';
  var KEY = 'sb_publishable_BuDVTTC1E0eg3wc7F1Pcig_1A_tqYCy';   // the publishable key: public by design, as on every page
  var WA = 'https://wa.me/447435363461';
  var STORE = 'aa_chat_' + SITE;

  var T = FA ? {
    open: 'سؤال داری؟ بپرس', title: 'دستیارِ امیر', sub: 'جوابِ سؤال‌ها درباره‌ی برنامه، قیمت و اپ. خودِ امیر نیست.',
    hello: 'سلام! هر سؤالی درباره‌ی مربیگری، دوره‌ی تنیس یا اپِ آزمون داری بپرس.',
    starters: ['هزینه‌ش چقدره؟', 'آنلاین چطور کار می‌کنه؟', 'دوره‌ی تنیس با برنامه‌ی اختصاصی چه فرقی داره؟', 'آسیب دارم، می‌تونم شروع کنم؟'],
    ph: 'سؤالتو بنویس…', send: 'بفرست', close: 'بستن', wa: 'پیام به امیر در واتساپ', apply: 'شروع کن', applyHref: '/form-fa.html',
    waText: 'سلام امیر، از دستیارِ سایت پرسیدم: ', thinking: 'داره می‌نویسه…', err: 'وصل نشد. دوباره امتحان کن یا توی واتساپ پیام بده.',
    privacy: 'گفتگوها ۹۰ روز نگه داشته می‌شن، بدونِ اسم یا آیپی.', privacyLink: 'حریم خصوصی', privacyHref: '/privacy-fa.html#chat',
    restart: 'گفتگوی تازه', too: 'خیلی بلنده. کوتاه‌ترش کن.'
  } : {
    open: 'Questions? Ask', title: "Amir's assistant", sub: "Answers about coaching, prices and the app. It isn't Amir himself.",
    hello: 'Hi! Ask me anything about the coaching, the programmes, prices or the app.',
    starters: ['How much does it cost?', 'How does the coaching work?', 'Is it for padel too?', "I'm injured. Can I still start?"],
    ph: 'Type your question…', send: 'Send', close: 'Close', wa: 'Message Amir on WhatsApp', apply: 'Apply now', applyHref: '/form.html',
    waText: 'Hi Amir, I was asking your website assistant: ', thinking: 'Typing…', err: "Couldn't connect. Try again, or message Amir on WhatsApp.",
    privacy: 'Chats are kept for 90 days, with no name or IP.', privacyLink: 'Privacy', privacyHref: '/privacy.html#chat',
    restart: 'New chat', too: 'That is too long. Make it shorter.'
  };

  // ── state (this tab only) ────────────────────────────────────────────────
  var st = { id: '', log: [] };   // log: {who:'me'|'bot', text, handoff}
  try { var saved = JSON.parse(sessionStorage.getItem(STORE) || 'null'); if (saved && Array.isArray(saved.log)) st = saved; } catch (e) { /* private mode: the chat simply starts fresh */ }
  function save() { try { sessionStorage.setItem(STORE, JSON.stringify(st)); } catch (e) { /* not kept across pages, still works */ } }

  // ── styles ───────────────────────────────────────────────────────────────
  var side = FA ? 'left' : 'right';
  var css =
    '.aac-btn{position:fixed;bottom:20px;' + side + ':20px;z-index:900;display:flex;align-items:center;gap:10px;height:56px;padding:0 20px 0 16px;' +
      'border:2px solid #fff;border-radius:999px;background:#0E4A36;color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer;' +
      'box-shadow:0 10px 28px rgba(14,74,54,.35);transition:transform .2s ease,box-shadow .2s ease}' +
    '.aac-btn:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(14,74,54,.42)}' +
    '.aac-btn:focus-visible,.aac-panel button:focus-visible,.aac-panel a:focus-visible,.aac-in:focus-visible{outline:3px solid #C7552F;outline-offset:2px}' +
    '.aac-btn svg{flex:none}' +
    '.aac-btn.is-open{display:none}' +
    '@media (max-width:1040px){body:not(.is-fa) .aac-btn.aac-en{bottom:88px}}' +
    '@media (max-width:520px){.aac-btn{height:52px;padding:0 16px 0 14px}.aac-btn .aac-lbl{display:none}.aac-btn{width:52px;padding:0;justify-content:center}}' +
    '.aac-panel{position:fixed;bottom:20px;' + side + ':20px;z-index:901;width:min(380px,calc(100vw - 32px));height:min(600px,calc(100vh - 40px));' +
      'display:none;flex-direction:column;background:#FAF7F2;color:#1A1A1A;border-radius:12px;overflow:hidden;font:inherit;font-size:15px;line-height:1.55;' +
      'box-shadow:0 24px 60px rgba(0,0,0,.28);border:1px solid #E7E2D9}' +
    '.aac-panel.is-open{display:flex}' +
    '@media (max-width:520px){.aac-panel{inset:0;width:100%;height:100%;border-radius:0;border:0}}' +
    '.aac-head{background:#0E4A36;color:#fff;padding:14px 16px;display:flex;align-items:flex-start;gap:12px}' +
    '.aac-head-t{flex:1;min-width:0}' +
    '.aac-head b{display:block;font-size:17px;line-height:1.3}' +
    '.aac-head span{display:block;font-size:13px;opacity:.9;margin-top:2px}' +
    '.aac-x{flex:none;width:40px;height:40px;border:0;border-radius:999px;background:rgba(255,255,255,.12);color:#fff;font-size:20px;line-height:1;cursor:pointer}' +
    '.aac-x:hover{background:rgba(255,255,255,.22)}' +
    '.aac-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}' +
    '.aac-m{max-width:86%;padding:10px 14px;border-radius:12px;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:anywhere}' +
    '.aac-bot{align-self:flex-start;background:#fff;border:1px solid #E7E2D9}' +
    '.aac-me{align-self:flex-end;background:#0E4A36;color:#fff}' +
    (FA ? '.aac-bot{align-self:flex-start}.aac-me{align-self:flex-end}' : '') +
    '.aac-m a{color:#B64826;font-weight:600}' +
    '.aac-me a{color:#fff}' +
    '.aac-acts{display:flex;flex-wrap:wrap;gap:8px;align-self:flex-start}' +
    '.aac-act{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:8px 14px;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none}' +
    '.aac-act-wa{background:#0E4A36;color:#fff}' +
    '.aac-act-ap{background:#C2512C;color:#fff}' +
    '.aac-chips{display:flex;flex-wrap:wrap;gap:8px}' +
    '.aac-chip{border:1px solid #0E4A36;background:#fff;color:#0E4A36;border-radius:999px;padding:8px 12px;font:inherit;font-size:14px;cursor:pointer;text-align:start}' +
    '.aac-chip:hover{background:rgba(14,74,54,.08)}' +
    '.aac-typing{align-self:flex-start;color:#5C5C5C;font-size:14px;padding:4px 2px}' +
    '.aac-foot{border-top:1px solid #E7E2D9;background:#fff;padding:10px 12px 8px}' +
    '.aac-row{display:flex;gap:8px;align-items:flex-end}' +
    '.aac-in{flex:1;min-width:0;resize:none;max-height:120px;border:1px solid #D8D1C5;border-radius:12px;padding:10px 12px;font:inherit;font-size:16px;line-height:1.4;background:#FAF7F2;color:#1A1A1A;overflow-y:hidden}' +
    '.aac-send{flex:none;height:44px;padding:0 16px;border:0;border-radius:12px;background:#C2512C;color:#fff;font:inherit;font-weight:700;font-size:15px;cursor:pointer}' +
    '.aac-send[disabled]{opacity:.55;cursor:default}' +
    '.aac-note{display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:12px;color:#5C5C5C}' +
    '.aac-note a,.aac-note button{color:#5C5C5C;font:inherit;font-size:12px;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline}';

  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ── markup ───────────────────────────────────────────────────────────────
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  var ICON = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16A2.5 2.5 0 0 1 4 13.5z" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="9.5" r="1.1" fill="#fff"/><circle cx="12" cy="9.5" r="1.1" fill="#fff"/><circle cx="15.5" cy="9.5" r="1.1" fill="#fff"/></svg>';

  var btn = el('button', 'aac-btn aac-' + SITE);
  btn.type = 'button';
  btn.setAttribute('aria-label', T.open);
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = ICON;
  btn.appendChild(el('span', 'aac-lbl', T.open));

  var panel = el('div', 'aac-panel');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', T.title);
  panel.dir = FA ? 'rtl' : 'ltr';
  var head = el('div', 'aac-head');
  var ht = el('div', 'aac-head-t');
  ht.appendChild(el('b', '', T.title));
  ht.appendChild(el('span', '', T.sub));
  var x = el('button', 'aac-x', '✕');
  x.type = 'button';
  x.setAttribute('aria-label', T.close);
  head.appendChild(ht); head.appendChild(x);
  var log = el('div', 'aac-log');
  log.setAttribute('aria-live', 'polite');
  var foot = el('div', 'aac-foot');
  var row = el('div', 'aac-row');
  var input = el('textarea', 'aac-in');
  input.rows = 1; input.maxLength = 800; input.placeholder = T.ph;
  input.setAttribute('aria-label', T.ph);
  input.dir = 'auto';
  var send = el('button', 'aac-send', T.send);
  send.type = 'button';
  row.appendChild(input); row.appendChild(send);
  var note = el('div', 'aac-note');
  var noteL = el('span');
  noteL.appendChild(document.createTextNode(T.privacy + ' '));
  var pl = el('a', '', T.privacyLink); pl.href = T.privacyHref;
  noteL.appendChild(pl);
  var restart = el('button', '', T.restart); restart.type = 'button';
  note.appendChild(noteL); note.appendChild(restart);
  foot.appendChild(row); foot.appendChild(note);
  panel.appendChild(head); panel.appendChild(log); panel.appendChild(foot);

  // ── drawing ──────────────────────────────────────────────────────────────
  // A reply is plain text. Links to this site become links; **bold** becomes bold. Nothing is read as HTML.
  function richText(node, text) {
    var parts = String(text).split(/(https:\/\/(?:www\.)?amirardekani\.com\/[^\s)»،]*|https:\/\/wa\.me\/\d+|\*\*[^*]+\*\*)/g);
    parts.forEach(function (p) {
      if (!p) return;
      if (/^https:\/\//.test(p)) { var a = el('a', '', p.replace(/^https:\/\/(www\.)?/, '')); a.href = p; if (/wa\.me/.test(p)) { a.target = '_blank'; a.rel = 'noopener'; } node.appendChild(a); }
      else if (/^\*\*/.test(p)) node.appendChild(el('b', '', p.slice(2, -2)));
      else node.appendChild(document.createTextNode(p));
    });
  }
  function lastQuestion() {
    for (var i = st.log.length - 1; i >= 0; i--) if (st.log[i].who === 'me') return st.log[i].text;
    return '';
  }
  function actions(handoff) {
    var box = el('div', 'aac-acts');
    if (handoff === 'apply') {
      var ap = el('a', 'aac-act aac-act-ap', T.apply); ap.href = T.applyHref; box.appendChild(ap);
    }
    var q = lastQuestion();
    var wa = el('a', 'aac-act aac-act-wa', T.wa);
    wa.href = WA + '?text=' + encodeURIComponent(T.waText + (q ? '«' + q.slice(0, 300) + '»' : ''));
    wa.target = '_blank'; wa.rel = 'noopener';
    box.appendChild(wa);
    return box;
  }
  function paint() {
    log.textContent = '';
    var hi = el('div', 'aac-m aac-bot'); richText(hi, T.hello); log.appendChild(hi);
    if (!st.log.length) {
      var chips = el('div', 'aac-chips');
      T.starters.forEach(function (s) { var c = el('button', 'aac-chip', s); c.type = 'button'; c.onclick = function () { ask(s); }; chips.appendChild(c); });
      log.appendChild(chips);
    }
    st.log.forEach(function (m, i) {
      var b = el('div', 'aac-m ' + (m.who === 'me' ? 'aac-me' : 'aac-bot'));
      b.dir = 'auto';
      richText(b, m.text);
      log.appendChild(b);
      if (m.who === 'bot' && m.handoff && i === st.log.length - 1) log.appendChild(actions(m.handoff));
    });
    log.scrollTop = log.scrollHeight;
  }

  // ── talking ──────────────────────────────────────────────────────────────
  var busy = false;
  function ask(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    if (text.length > 800) { input.setCustomValidity(T.too); input.reportValidity(); return; }
    busy = true; send.disabled = true;
    st.log.push({ who: 'me', text: text }); save(); paint();
    input.value = ''; grow();
    var typing = el('div', 'aac-typing', T.thinking); log.appendChild(typing); log.scrollTop = log.scrollHeight;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 35000);
    fetch(URL_FN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: 'Bearer ' + KEY },
      body: JSON.stringify({ conversation_id: st.id || undefined, site: SITE, page: location.pathname, message: text }),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j && j.error || r.status); return j; }); })
      .then(function (j) {
        if (j.conversation_id) st.id = j.conversation_id;
        st.log.push({ who: 'bot', text: j.reply || T.err, handoff: j.handoff || null });
      })
      .catch(function () { st.log.push({ who: 'bot', text: T.err, handoff: 'whatsapp' }); })
      .then(function () {
        clearTimeout(timer); busy = false; send.disabled = false; save(); paint();
        try { if (window.plausible) window.plausible('Chat message', { props: { site: SITE } }); } catch (e) { /* analytics is optional */ }
      });
  }
  function grow() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    input.style.overflowY = input.scrollHeight > 120 ? 'auto' : 'hidden';
  }

  function open() {
    panel.classList.add('is-open'); btn.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true');
    paint();
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 30);
  }
  function close() {
    panel.classList.remove('is-open'); btn.classList.remove('is-open'); btn.setAttribute('aria-expanded', 'false');
    btn.focus();
  }

  btn.onclick = open;
  x.onclick = close;
  send.onclick = function () { ask(input.value); };
  input.addEventListener('input', function () { input.setCustomValidity(''); grow(); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
  panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  restart.onclick = function () { st = { id: '', log: [] }; save(); paint(); input.focus(); };

  function mount() { document.body.appendChild(btn); document.body.appendChild(panel); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);
})();
