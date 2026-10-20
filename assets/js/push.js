/* Reminders on the phone — the half that runs in the apps.
 *
 * ONE copy, loaded by program.html and habits.html, because the two apps share one service worker and
 * one notification permission (they are one website), so two copies of this would be two ways to get
 * the same thing wrong. The server half is supabase/stage84_push.sql and the sender is the Edge
 * Function push-send.
 *
 * ⚠️ ONE PERMISSION PER WEBSITE, AND ONLY ONE CHANCE. amirardekani.com has a single notification
 * permission, shared by the training app, AA Proof and anything else here. If an athlete taps "Don't
 * allow", NOTHING can ever send to that phone again until they dig into their browser settings. So
 * the prompt is never fired cold: the app says one line first about what will arrive. That is also
 * why Amir's "the push should be automatically on" is built as ON BY DEFAULT ONCE ALLOWED, with every
 * kind on and switches to turn them off — the phone's own box cannot be skipped by anyone.
 *
 * ⚠️ iPhone: Web Push needs iOS 16.4+ AND the app on the Home Screen. In Safari itself pushState()
 * answers 'needs-install', and the app says so instead of showing a button that cannot work.
 *
 * Nothing here ever runs in the embedded Proof strip (program.html's Home): the iframe shares the
 * parent's permission and registration, so asking from inside it would ask twice for one phone.
 */
(function (root) {
  'use strict';

  var VAPID_PUBLIC = 'BPG2aPjBFIo58UtAD1UP3qwOkmRzoD-qqDBA1MtnCVrrSyIKuyqua7VrkKnPRgfdbUOrL6Phn5eNbLkEnKX4EBk';
  var ASKED_KEY = 'aa_push_asked';     // this phone has been shown the line once (per browser, never synced)

  function secure() {
    return ('isSecureContext' in window) ? window.isSecureContext
      : (location.protocol === 'https:' || location.hostname === 'localhost');
  }
  var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  function installed() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    } catch (e) { return false; }
  }

  /** 'unsupported' · 'needs-install' (iPhone, not on the Home Screen) · 'blocked' · 'off' · 'on' */
  function pushState() {
    if (!secure() || !('serviceWorker' in navigator) || !('Notification' in window)) return 'unsupported';
    if (!('PushManager' in window)) return (isIOS && !installed()) ? 'needs-install' : 'unsupported';
    if (Notification.permission === 'denied') return 'blocked';
    if (Notification.permission === 'granted') return 'on';
    return 'off';
  }

  function urlB64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var raw = window.atob(base64);
    var out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; ++i) out[i] = raw.charCodeAt(i);
    return out;
  }

  // A short line for Amir to read when a phone stops working. No ids, no account, nothing personal.
  function deviceLine() {
    var u = navigator.userAgent, m;
    var os = isIOS ? ('iOS' + (((m = u.match(/OS (\d+)[_.](\d+)/)) && (m[1] + '.' + m[2])) || '?'))
      : (m = u.match(/Android (\d+)/)) ? 'Android' + m[1]
      : /Windows/.test(u) ? 'Windows' : /Mac OS X/.test(u) ? 'Mac' : 'Other';
    var br = (m = u.match(/CriOS\/(\d+)/)) ? 'Chrome' + m[1]
      : (m = u.match(/EdgA?\/(\d+)/)) ? 'Edge' + m[1]
      : (m = u.match(/SamsungBrowser\/(\d+)/)) ? 'Samsung' + m[1]
      : (m = u.match(/Chrome\/(\d+)/)) ? 'Chrome' + m[1]
      : (m = u.match(/Firefox\/(\d+)/)) ? 'Firefox' + m[1]
      : (m = u.match(/Version\/(\d+)[.\d]* .*Safari/)) ? 'Safari' + m[1] : 'Browser';
    return (os + ' · ' + br + (installed() ? ' · installed' : '')).slice(0, 120);
  }

  // Minutes east of UTC, which is what the server needs to work out the athlete's own evening.
  // Iran is +210 and does not move; the UK does, so this is re-sent on every subscribe.
  function tzOffset() { return -new Date().getTimezoneOffset(); }

  function ready() {
    // Both apps register '/sw.js' themselves at boot; this waits for whichever got there first.
    return navigator.serviceWorker.register('/sw.js')
      .then(function () { return navigator.serviceWorker.ready; });
  }
  function subscribe(reg) {
    return function () { return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC) }); };
  }

  // A subscription is bound to the key it was made with (VAPID_PUBLIC). If the key pair is ever replaced, every subscription made
  // under the old one is refused by the push service, so it has to be made again (2026-10-20: nothing did, though the backup notes
  // in coach.html promised each app would). True only when the browser says which key it used and that key is not this one: a
  // browser that does not say is left alone, so a working phone is never subscribed over and over.
  function staleKey(sub) {
    try {
      var k = sub && sub.options && sub.options.applicationServerKey;
      if (!k) return false;
      var a = new Uint8Array(k), b = urlB64ToUint8Array(VAPID_PUBLIC);
      if (a.length !== b.length) return true;
      for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
      return false;
    } catch (e) { return false; }
  }

  /**
   * At an open, with no prompt: a phone that has reminders on and a subscription made under an old key subscribes again and keeps
   * its settings (the hour, the quiet days, which kinds). The permission is already granted; only the key changed. The new phone row
   * takes the old one's hour, the old row is forgotten, and push_set puts the switches back. Resolves true when it subscribed again.
   */
  function pushRefresh(sb, app, lang) {
    if (!sb || pushState() !== 'on') return Promise.resolve(false);
    return ready().then(function (reg) {
      return reg.pushManager.getSubscription().then(function (old) {
        if (!old || !staleKey(old)) return false;
        var oldEp = old.endpoint;
        return pushMe(sb).then(function (me) {
          return old.unsubscribe().catch(function () {}).then(subscribe(reg)).then(function (sub) {
            var j = sub.toJSON ? sub.toJSON() : sub, keys = j.keys || {};
            return sb.rpc('push_subscribe', {
              p_endpoint: j.endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth,
              p_app: app === 'training' ? 'training' : 'proof',
              p_hour: (me && me.hour) || 20, p_tz_offset: tzOffset(),
              p_lang: (me && me.lang === 'fa') || lang === 'fa' ? 'fa' : 'en', p_device: deviceLine()
            }).then(function (r) {
              if (r.error) return false;
              var gone = j.endpoint !== oldEp ? sb.rpc('push_forget', { p_endpoint: oldEp }) : Promise.resolve();
              return gone.then(function () {
                return me ? pushSet(sb, me.kinds || null, me.hour, me.quiet_days) : null;
              }).then(function () { return true; });
            });
          });
        });
      });
    }).catch(function () { return false; });
  }

  /**
   * Ask the phone, then tell the server. Returns { ok, state, me } — `state` is pushState() after the
   * attempt, so a caller can say the right thing without asking again.
   * `sb` is the app's Supabase client; `app` is 'proof' or 'training'.
   */
  function pushEnable(sb, app, lang) {
    var st = pushState();
    if (st !== 'off' && st !== 'on') return Promise.resolve({ ok: false, state: st });
    try { localStorage.setItem(ASKED_KEY, '1'); } catch (e) {}
    return ready().then(function (reg) {
      // requestPermission() must be called from the athlete's own tap. Every caller here is a click
      // handler; called from anywhere else a browser simply refuses it.
      return Notification.requestPermission().then(function (perm) {
        if (perm !== 'granted') return { ok: false, state: pushState() };
        return reg.pushManager.getSubscription().then(function (existing) {
          // One made under an older key is refused by the push service for ever, so it is made again (staleKey()).
          if (existing && !staleKey(existing)) return existing;
          return (existing ? existing.unsubscribe().catch(function () {}) : Promise.resolve()).then(subscribe(reg));
        }).then(function (sub) {
          var j = sub.toJSON ? sub.toJSON() : sub;
          var keys = j.keys || {};
          return sb.rpc('push_subscribe', {
            p_endpoint: j.endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth,
            p_app: app === 'training' ? 'training' : 'proof',
            p_hour: 20, p_tz_offset: tzOffset(),
            p_lang: lang === 'fa' ? 'fa' : 'en', p_device: deviceLine()
          }).then(function (r) {
            return { ok: !r.error, state: pushState(), me: r.data, error: r.error };
          });
        });
      });
    }).catch(function (e) {
      return { ok: false, state: pushState(), error: e };
    });
  }

  /** Off: the server forgets this phone. The permission itself stays with the browser, which is the
   *  athlete's to give back — nothing in a web app can take a permission away, and the panel says so. */
  function pushDisable(sb) {
    return ready().then(function (reg) {
      return reg.pushManager.getSubscription();
    }).then(function (sub) {
      var endpoint = sub && (sub.toJSON ? sub.toJSON().endpoint : sub.endpoint);
      var done = sub ? sub.unsubscribe() : Promise.resolve(true);
      return done.then(function () { return sb.rpc('push_forget', { p_endpoint: endpoint || null }); });
    }).then(function (r) {
      return { ok: !(r && r.error), me: r && r.data };
    }).catch(function (e) { return { ok: false, error: e }; });
  }

  /** What the server has for this athlete: { on, phones, hour, quiet_days, kinds, list }. */
  function pushMe(sb) {
    return sb.rpc('push_me').then(function (r) { return r.error ? null : r.data; },
                                  function () { return null; });
  }
  /** Change the switches, the hour or the quiet days. Any of them may be left out. */
  function pushSet(sb, kinds, hour, quietDays) {
    return sb.rpc('push_set', {
      p_kinds: kinds || null,
      p_hour: (hour === undefined || hour === null) ? null : hour,
      p_quiet_days: (quietDays === undefined || quietDays === null) ? null : quietDays
    }).then(function (r) { return r.error ? null : r.data; }, function () { return null; });
  }

  /** Has this phone already been shown the line? (Per browser, never synced: it is about the phone.) */
  function pushAsked() { try { return localStorage.getItem(ASKED_KEY) === '1'; } catch (e) { return false; } }
  function pushMarkAsked() { try { localStorage.setItem(ASKED_KEY, '1'); } catch (e) {} }

  /** A kind not switched off is ON, the same rule the server uses, so the two can never disagree. */
  function pushKindOn(me, kind) {
    if (!me || !me.kinds) return true;
    return me.kinds[kind] !== false;
  }

  root.AAPush = {
    state: pushState, enable: pushEnable, disable: pushDisable, me: pushMe, set: pushSet, refresh: pushRefresh, staleKey: staleKey,
    asked: pushAsked, markAsked: pushMarkAsked, kindOn: pushKindOn,
    device: deviceLine, tzOffset: tzOffset, VAPID_PUBLIC: VAPID_PUBLIC
  };
})(window);
