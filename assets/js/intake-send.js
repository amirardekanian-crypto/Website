// intake-send.js — every form's road to the server (2026-11-23, Amir: "make sure it happens and we dont miss any ones data").
//
// The intake forms (form, form-fa, etminan ×3, uts-padel), the Proof signup and the coach partner form all save into
// public.hab_intake through submit_intake(). Until today each page made ONE try, and if it failed the email (Web3Forms) was the
// only copy. Emails are going away, so the server copy must not fail quietly:
//   1. AAIntake.fetch(url, init) takes the place of fetch() for that call: up to 3 tries (at once, after 2 s, after 5 s), 12 s each.
//   2. The submission carries a random id (p_payload._cid), and submit_intake() hands back the row already saved under it, so a try
//      that reached the server but lost its answer never makes a second application.
//   3. If every try fails on the network or the server (not a refusal of the data itself), the submission is kept on this phone
//      ('aa_intake_q', 20 at most, 30 days) and sent the next time any of these pages opens, or the phone comes back online.
// It answers like fetch: a Response when the server took it, else { ok: false, queued }. The page decides what to show.
// coach.html → Leads shows every application; a new one rings the coach's devices (stage123).
(function () {
  'use strict';
  if (window.AAIntake) return;
  var Q = 'aa_intake_q';
  var WAITS = [0, 2000, 5000];
  var MONTH = 30 * 86400000;

  function load() { try { var q = JSON.parse(localStorage.getItem(Q) || '[]'); return Array.isArray(q) ? q : []; } catch (e) { return []; } }
  function save(q) { try { if (q.length) localStorage.setItem(Q, JSON.stringify(q.slice(-20))); else localStorage.removeItem(Q); } catch (e) { /* private mode: the tries were all there was */ } }
  function cid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12); }
  function within(ms, p) { return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]); }

  // A refusal of the data itself (400-499, but not "too many" or "timed out") is not worth trying again.
  function refused(status) { return status >= 400 && status < 500 && status !== 408 && status !== 429; }

  function once(url, headers, body) {
    return within(12000, fetch(url, { method: 'POST', headers: headers, body: body })).then(function (r) {
      if (r.ok) return r;
      var e = new Error('status ' + r.status); e.status = r.status; throw e;
    });
  }
  function tries(url, headers, body) {
    var i = 0;
    function go() {
      return once(url, headers, body).catch(function (e) {
        i++;
        if (refused(e.status || 0) || i >= WAITS.length) throw e;
        return new Promise(function (r) { setTimeout(r, WAITS[i]); }).then(go);
      });
    }
    return go();
  }
  // The id that makes a retry safe, added once to the payload of a submit_intake() call.
  function stamp(body) {
    try {
      var o = JSON.parse(body);
      if (o && o.p_payload && typeof o.p_payload === 'object' && !Array.isArray(o.p_payload) && !o.p_payload._cid) {
        o.p_payload._cid = cid();
        return JSON.stringify(o);
      }
    } catch (e) { /* not JSON: sent as it is */ }
    return body;
  }

  function aaFetch(url, init) {
    init = init || {};
    var headers = init.headers || {};
    var body = stamp(String(init.body || ''));
    return tries(url, headers, body).catch(function (e) {
      var keep = !refused(e.status || 0);
      if (keep) { var q = load(); q.push({ url: url, headers: headers, body: body, at: Date.now() }); save(q); }
      return { ok: false, status: e.status || 0, queued: keep };
    });
  }

  // What an earlier visit could not send. One at a time; a refusal or a month-old entry is let go.
  var flushing = false;
  function flush() {
    if (flushing) return Promise.resolve();
    var q = load();
    if (!q.length) return Promise.resolve();
    flushing = true;
    var keep = [];
    return q.reduce(function (p, item) {
      return p.then(function () {
        if (!item || !item.url || Date.now() - (item.at || 0) > MONTH) return;
        return once(item.url, item.headers || {}, item.body || '').catch(function (e) { if (!refused(e.status || 0)) keep.push(item); });
      });
    }, Promise.resolve()).then(function () {
      // Anything queued while this ran stays too.
      var added = load().filter(function (x) { return q.every(function (y) { return y.body !== x.body; }); });
      save(keep.concat(added));
      flushing = false;
    });
  }

  // A whole form into submit_intake(), for a page that did not call it itself (the Proof signup, the partner form). The email's own
  // fields never become an answer. meta: { lang, programme, name, email, contact }.
  var SB_URL = 'https://bvipfipbdcyqnbczjmaq.supabase.co';
  var SB_KEY = 'sb_publishable_BuDVTTC1E0eg3wc7F1Pcig_1A_tqYCy';
  var SKIP = { access_key: 1, from_name: 1, subject: 1, redirect: 1, botcheck: 1 };
  function saveForm(formEl, meta) {
    meta = meta || {};
    var p = {};
    new FormData(formEl).forEach(function (v, k) {
      if (SKIP[k] || typeof v !== 'string') return;
      v = v.trim();
      if (!v) return;
      p[k] = Object.prototype.hasOwnProperty.call(p, k) ? [].concat(p[k], v) : v;
    });
    return aaFetch(SB_URL + '/rest/v1/rpc/submit_intake', {
      method: 'POST',
      headers: { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_payload: p, p_lang: meta.lang || 'en', p_name: meta.name || null, p_email: meta.email || null,
        p_contact: meta.contact || null, p_programme: meta.programme || null })
    });
  }
  // Resolves when the FIRST road says yes (true from a promise), rejects only when every road said no.
  function firstYes(list) {
    return new Promise(function (res, rej) {
      var left = list.length;
      list.forEach(function (p) {
        Promise.resolve(p).then(function (yes) { if (yes) res(); else if (--left === 0) rej(new Error('no road took it')); },
                                function () { if (--left === 0) rej(new Error('no road took it')); });
      });
    });
  }

  window.AAIntake = { fetch: aaFetch, save: saveForm, firstYes: firstYes, flush: flush, pending: function () { return load().length; } };
  if (document.readyState === 'complete') setTimeout(flush, 1500);
  else window.addEventListener('load', function () { setTimeout(flush, 1500); });
  window.addEventListener('online', function () { flush(); });
})();
