// Web Push, written against Web Crypto only, so it runs in Deno (this Edge Function) and in Node
// (the test that proves it, scripts/push/test_webpush.mjs).
//
// WHY THIS IS HAND-WRITTEN AND NOT A LIBRARY. There is no Deno to run here, so a third-party module
// could not be tried before it shipped. Written against the standards instead, it can be run in Node,
// where its output is decrypted by http_ece — a different implementation, the one web-push itself
// uses — and its VAPID signature verified against the public key. That is a real cross-check; trusting
// an untested import would not have been.
//
// Two standards, and both are needed for one notification:
//   RFC 8291  the payload, encrypted end to end so the push service carries something it cannot read.
//             Content-Encoding: aes128gcm.
//   RFC 8292  VAPID: a signed assertion that says who is sending, so the push service will accept it.
//
// The push service (Google's for Android, Apple's for iPhone) only ever sees an opaque blob. The
// athlete's phone holds the only key that opens it.

const enc = new TextEncoder();

// ── base64url, the encoding every part of this uses ────────────────────────────────────────────────
export function b64uToBytes(s: string): Uint8Array {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
export function bytesToB64u(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const cat = (...parts: Uint8Array[]): Uint8Array => {
  const n = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

// ── HKDF, the one-block form these standards use ───────────────────────────────────────────────────
// Every step here asks for 32 bytes or fewer, so the counter never goes past 0x01 and the general
// multi-block HKDF is not needed.
async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}
async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const prk = await hmac(salt, ikm);
  const okm = await hmac(prk, cat(info, new Uint8Array([1])));
  return okm.slice(0, length);
}

// ── the keys ───────────────────────────────────────────────────────────────────────────────────────
// A VAPID private key is the raw 32-byte scalar, base64url. Web Crypto wants a JWK, and a JWK needs
// the public point as well, which is why both halves are passed in.
async function importVapidKey(publicKeyB64u: string, privateKeyB64u: string): Promise<CryptoKey> {
  const pub = b64uToBytes(publicKeyB64u);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('the VAPID public key is not an uncompressed P-256 point');
  return crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256', ext: true,
    d: privateKeyB64u.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'),
    x: bytesToB64u(pub.slice(1, 33)),
    y: bytesToB64u(pub.slice(33, 65)),
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

/** The Authorization header for one endpoint: `vapid t=<jwt>,k=<public key>` (RFC 8292). */
export async function vapidHeader(
  endpoint: string, subject: string, publicKey: string, privateKey: string, now = Date.now(),
): Promise<string> {
  const aud = new URL(endpoint).origin;      // the push service, not the phone
  const header = bytesToB64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  // 12 hours. The spec allows 24; shorter is simply less useful to anyone who intercepts one.
  const body = bytesToB64u(enc.encode(JSON.stringify({
    aud, exp: Math.floor(now / 1000) + 12 * 60 * 60, sub: subject,
  })));
  const signed = enc.encode(`${header}.${body}`);
  const key = await importVapidKey(publicKey, privateKey);
  // Web Crypto gives ECDSA as raw r||s, which is exactly what JWS wants — no DER unwrapping.
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, signed));
  return `vapid t=${header}.${body}.${bytesToB64u(sig)},k=${publicKey}`;
}

/**
 * Encrypt one payload for one subscription (RFC 8291, aes128gcm).
 * `salt` and `ephemeral` are injectable so a test can reproduce a known body; leave them out in use.
 */
export async function encryptPayload(
  p256dh: string, authSecret: string, payload: string,
  opts: { salt?: Uint8Array; ephemeral?: CryptoKeyPair } = {},
): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(p256dh);                 // the phone's public key, 65 bytes
  const authKey = b64uToBytes(authSecret);              // 16 bytes the phone generated
  if (uaPublic.length !== 65 || uaPublic[0] !== 4) throw new Error('p256dh is not an uncompressed P-256 point');

  const theirs = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const mine = opts.ephemeral ?? await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', mine.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: theirs }, mine.privateKey, 256));

  // The phone's auth secret salts the shared secret, so a push can only be opened by the phone that
  // asked for it — not by anyone who merely learns its public key.
  const prkKey = await hmac(authKey, shared);
  const keyInfo = cat(enc.encode('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hmac(prkKey, cat(keyInfo, new Uint8Array([1])));

  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);

  // One record, so the padding delimiter is 0x02 ("this is the last"). A 0x01 here would make the
  // phone wait for a record that never comes.
  const plain = cat(enc.encode(payload), new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plain));

  // The aes128gcm header, which carries everything the phone needs to derive the same key:
  //   salt(16) | record size(4, big-endian) | key id length(1) | our public key(65) | ciphertext
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return cat(salt, rs, new Uint8Array([asPublic.length]), asPublic, sealed);
}

export interface Subscription { endpoint: string; p256dh: string; auth: string }
export interface SendResult { ok: boolean; status: number; gone: boolean; body?: string }

/**
 * Send one notification. `gone` is the one the caller must act on: a 404 or 410 means the
 * subscription is dead (uninstalled, permission withdrawn, or the browser rotated it) and its row
 * should be deleted rather than retried for ever.
 */
export async function sendPush(
  sub: Subscription, payload: string,
  vapid: { subject: string; publicKey: string; privateKey: string },
  opts: { ttl?: number; urgency?: string } = {},
): Promise<SendResult> {
  const body = await encryptPayload(sub.p256dh, sub.auth, payload);
  const auth = await vapidHeader(sub.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey);
  let res: Response;
  try {
    res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: auth,
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        // ⚠️ Firebase keeps an undelivered message for four weeks by default. Without a short TTL a
        // 20:00 reminder can arrive at three in the morning a week later, and the athlete turns the
        // whole thing off. Two hours for a reminder.
        TTL: String(opts.ttl ?? 7200),
        Urgency: opts.urgency ?? 'normal',
      },
      body,
    });
  } catch (e) {
    return { ok: false, status: 0, gone: false, body: String((e as Error)?.message ?? e) };
  }
  const gone = res.status === 404 || res.status === 410;
  let text = '';
  if (!res.ok) { try { text = (await res.text()).slice(0, 300); } catch { /* the status is enough */ } }
  return { ok: res.ok, status: res.status, gone, body: text || undefined };
}
