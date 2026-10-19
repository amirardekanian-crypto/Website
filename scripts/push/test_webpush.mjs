// Proves supabase/functions/push-send/webpush.ts without a Deno to run it in.
//
//   npm install web-push@3.6.7 --prefix "$TEMP/webpush"       (once, outside the repo)
//   NODE_PATH="$TEMP/webpush/node_modules" node scripts/push/test_webpush.mjs
//
// The Edge Function runs in Deno and there is no Deno on this machine, so the crypto is written
// against Web Crypto alone and tried HERE, in Node, which has the same API. Node 22.18+ imports a
// .ts file directly, so this is the very same source the function will run — not a copy that could
// drift from it.
//
// The checks that matter are the ones a second implementation makes:
//   · what encryptPayload() seals, http_ece OPENS — the same module web-push itself uses to encrypt,
//     so this is two independent implementations agreeing, not one agreeing with itself;
//   · the VAPID signature verifies against the public key, and the JWT says what RFC 8292 requires.
// Everything else is the handful of ways this is easy to get silently wrong.
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let ece, webpush;
try { ece = require('http_ece'); webpush = require('web-push'); }
catch {
  console.error('http_ece and web-push are needed to check this, and are deliberately not dependencies of the repo:\n' +
    '  npm install web-push@3.6.7 --prefix "$TEMP/webpush"\n' +
    '  NODE_PATH="$TEMP/webpush/node_modules" node scripts/push/test_webpush.mjs');
  process.exit(2);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MOD = path.join(HERE, '..', '..', 'supabase', 'functions', 'push-send', 'webpush.ts');
const { encryptPayload, vapidHeader, b64uToBytes, bytesToB64u } = await import('file://' + MOD.split(path.sep).join('/'));

let passed = 0, failed = 0;
const fails = [];
const ok = (c, what, detail) => {
  if (c) { passed++; console.log('  ok   ' + what); }
  else { failed++; fails.push(what); console.log('  FAIL ' + what + (detail !== undefined ? '  → ' + String(detail).slice(0, 300) : '')); }
};
const section = s => console.log('\n' + s);
const b64u = b => Buffer.from(b).toString('base64url');

// A subscription whose private half we hold, so the ciphertext can actually be opened.
const ua = webcrypto.subtle ? await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) : null;
const uaPublic = Buffer.from(await webcrypto.subtle.exportKey('raw', ua.publicKey));
const uaJwk = await webcrypto.subtle.exportKey('jwk', ua.privateKey);
const uaPrivate = Buffer.from(uaJwk.d, 'base64url');
const authSecret = Buffer.from(webcrypto.getRandomValues(new Uint8Array(16)));

const SUB = { endpoint: 'https://web.push.apple.com/zz-test', p256dh: b64u(uaPublic), auth: b64u(authSecret) };
const VAPID = webpush.generateVAPIDKeys();
const SUBJECT = 'mailto:amirardekanian@gmail.com';

section('1. What we seal, a different implementation opens');
for (const payload of [
  JSON.stringify({ title: 'Your day is still open', body: 'Tick what you did today.', tag: 'habits' }),
  JSON.stringify({ title: 'وقتِ تمرینه', body: 'دو روزی می‌شه خبری نیست.', tag: 'workout' }),   // Farsi, multi-byte
  '',                                                                                             // empty
  'x'.repeat(2800),                                                                               // near the practical limit
]) {
  const sealed = Buffer.from(await encryptPayload(SUB.p256dh, SUB.auth, payload));
  let opened = null, err = null;
  try {
    opened = ece.decrypt(sealed, {
      version: 'aes128gcm',
      privateKey: webcrypto.subtle ? null : null,   // http_ece takes the raw pair below instead
      dh: uaPublic,
      authSecret,
      // http_ece wants the receiver's key pair; it accepts raw buffers through `privateKey` as an
      // object with getPrivateKey/getPublicKey, so the ECDH object form is built here.
      ...(() => {
        const ecdh = require('node:crypto').createECDH('prime256v1');
        ecdh.setPrivateKey(uaPrivate);
        return { privateKey: ecdh };
      })(),
    });
  } catch (e) { err = e; }
  const label = payload === '' ? 'an empty payload' : payload.length > 100 ? `${payload.length} bytes` : JSON.parse(payload).title;
  ok(opened !== null && opened.toString('utf8') === payload, `http_ece opens what we sealed · ${label}`, err?.message);
}

section('2. The shape of the sealed body (RFC 8291)');
const body = Buffer.from(await encryptPayload(SUB.p256dh, SUB.auth, 'hello'));
ok(body.length > 16 + 4 + 1 + 65, 'it carries a header and a ciphertext', body.length);
ok(body.readUInt32BE(16) === 4096, 'the record size is 4096, big-endian', body.readUInt32BE(16));
ok(body[20] === 65, 'the key id length says 65');
ok(body[21] === 4, 'and the key that follows is an uncompressed P-256 point');
const a = Buffer.from(await encryptPayload(SUB.p256dh, SUB.auth, 'hello'));
const b = Buffer.from(await encryptPayload(SUB.p256dh, SUB.auth, 'hello'));
ok(!a.equals(b), 'the same words sealed twice are different bytes (a fresh salt and key each time)');

section('3. VAPID (RFC 8292)');
const header = await vapidHeader(SUB.endpoint, SUBJECT, VAPID.publicKey, VAPID.privateKey);
ok(/^vapid t=[\w-]+\.[\w-]+\.[\w-]+,k=[\w-]+$/.test(header), 'the header is `vapid t=<jwt>,k=<key>`', header.slice(0, 40));
ok(header.endsWith(',k=' + VAPID.publicKey), 'it carries our own public key');

const [, jwt] = /t=([^,]+)/.exec(header);
const [h64, p64, s64] = jwt.split('.');
const head = JSON.parse(Buffer.from(h64, 'base64url').toString());
const claims = JSON.parse(Buffer.from(p64, 'base64url').toString());
ok(head.alg === 'ES256' && head.typ === 'JWT', 'the JWT header says ES256', head);
ok(claims.aud === 'https://web.push.apple.com', 'aud is the push service, not the phone', claims.aud);
ok(claims.sub === SUBJECT, 'sub is who to contact about it');
const hours = (claims.exp - Math.floor(Date.now() / 1000)) / 3600;
ok(hours > 11 && hours <= 24, 'exp is in the future and inside the 24 hours the spec allows', hours);

// The signature has to verify against the public key, or the push service answers 401 and the
// notification simply never goes.
const pub = b64uToBytes(VAPID.publicKey);
const key = await webcrypto.subtle.importKey('jwk', {
  kty: 'EC', crv: 'P-256', x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)),
}, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
const good = await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
  Buffer.from(s64, 'base64url'), new TextEncoder().encode(`${h64}.${p64}`));
ok(good, 'the signature verifies against the public key');

const tampered = await webcrypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key,
  Buffer.from(s64, 'base64url'), new TextEncoder().encode(`${h64}.${p64}x`));
ok(!tampered, 'and does not verify once a byte is changed');

const other = await vapidHeader('https://fcm.googleapis.com/fcm/send/abc', SUBJECT, VAPID.publicKey, VAPID.privateKey);
ok(JSON.parse(Buffer.from(/t=([^.]+)\.([^.]+)/.exec(other)[2], 'base64url').toString()).aud === 'https://fcm.googleapis.com',
   'a Google endpoint gets a Google aud (one signed for the wrong service is refused)');

section('4. The ways this is easy to get wrong');
let threw = null;
try { await encryptPayload(b64u(Buffer.alloc(10)), SUB.auth, 'x'); } catch (e) { threw = e; }
ok(threw !== null, 'a p256dh that is not a P-256 point is refused rather than sent as nonsense');
threw = null;
try { await vapidHeader(SUB.endpoint, SUBJECT, b64u(Buffer.alloc(10)), VAPID.privateKey); } catch (e) { threw = e; }
ok(threw !== null, 'so is a VAPID public key of the wrong length');

// 0xfb 0xff 0xfe encodes as "-__-", the two characters that separate base64url from base64. A
// five-character input would not be base64 at all (a length of 1 more than a multiple of 4 cannot
// occur), so the round trip is checked on bytes rather than on a string typed by hand.
for (const bytes of [[251, 255, 254], [0], [0, 0], [1, 2, 3, 4, 5]]) {
  const u8 = new Uint8Array(bytes);
  ok(Buffer.from(b64uToBytes(bytesToB64u(u8))).equals(Buffer.from(u8)),
     `base64url survives a round trip · ${bytes.length} byte(s)`, bytesToB64u(u8));
}
ok(bytesToB64u(new Uint8Array([251, 255, 254])) === '-__-', 'it uses - and _ where base64 uses + and /');
ok(!bytesToB64u(new Uint8Array([251, 255, 254])).includes('+') && !bytesToB64u(new Uint8Array([251, 255, 254])).includes('/'),
   'and never emits + or /, which would break the header');

console.log(`\n${passed} of ${passed + failed} checks passed`);
if (failed) { console.log('\nFAILED:'); fails.forEach(f => console.log('  · ' + f)); }
process.exit(failed ? 1 : 0);
